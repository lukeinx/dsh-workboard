// 正在播放：macOS 上用 osascript 读取并控制「音乐」和 Spotify。只查询已在运行的 App，不会把它们拉起来。
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm} from 'node:fs/promises';
import {platform} from 'node:os';
import {join} from 'node:path';
import {text} from './exec.js';

const US = '\u001f';
const TTL = 1500;
const ART_EDGE = 360;
const MAX_ART = 30;

export const APPS = {
  music: {proc: 'Music', open: ['-a', 'Music']},
  spotify: {proc: 'Spotify', open: ['-b', 'com.spotify.client']},
};
const ACTIONS = {toggle: 'playpause', play: 'play', pause: 'pause', next: 'next track', previous: 'previous track'};

// 时长、进度换成整数毫秒再拼字符串，避免按系统区域格式化出逗号小数。
const FIELDS = (durationMs, extra) => `set npSep to character id 31
set npArtist to ""
set npAlbum to ""
set npDuration to 0
set npPos to 0
set npId to ""
set npArt to ""
try
set npArtist to artist of npTrack
end try
try
set npAlbum to album of npTrack
end try
try
set npDuration to ${durationMs}
end try
try
set npPos to ((player position) * 1000) as integer
end try
${extra}
return npState & npSep & (name of npTrack) & npSep & npArtist & npSep & npAlbum & npSep & npDuration & npSep & npPos & npSep & npId & npSep & npArt`;

const stateScript = (app, extra) => `tell application "${app}"
set npState to player state as string
if npState is not "playing" and npState is not "paused" then return npState
try
set npTrack to current track
on error
return "stopped"
end try
${extra}
end tell`;

export const SCRIPTS = {
  music: stateScript('Music', FIELDS('((duration of npTrack) * 1000) as integer', 'try\nset npId to persistent ID of npTrack\nend try')),
  spotify: stateScript('Spotify', FIELDS('duration of npTrack', 'try\nset npId to id of npTrack\nend try\ntry\nset npArt to artwork url of npTrack\nend try')),
};

const MUSIC_ART = `on run argv
try
tell application "Music"
set npTrack to current track
if (count of artworks of npTrack) is 0 then return ""
set npData to raw data of artwork 1 of npTrack
end tell
set npFile to open for access (POSIX file (item 1 of argv)) with write permission
try
set eof npFile to 0
write npData to npFile
end try
close access npFile
return "ok"
on error
return ""
end try
end run`;

export function parseState(raw, app) {
  const parts = text(raw).replace(/\r?\n$/, '').split(US);
  const state = parts[0].trim();
  if (state !== 'playing' && state !== 'paused') return null;
  const [, title = '', artist = '', album = '', duration, position, id = '', artUrl = ''] = parts;
  const ms = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);
  return {app, state, title, artist, album, duration: ms(duration), position: ms(position), id: id || `${title}\0${artist}\0${album}`, artUrl: /^https:\/\//.test(artUrl) ? artUrl : ''};
}

const denied = error => /-1743|not authori[sz]ed/i.test(String(error?.message ?? error));

export function createNowPlaying({run, fetcher, cacheDir, os = platform(), now = Date.now} = {}) {
  const art = new Map();
  let last = null;
  let inflight = null;

  async function running() {
    const names = new Set(text(await run('ps', ['-axco', 'comm='])).split('\n').map(s => s.trim()));
    return Object.keys(APPS).filter(app => names.has(APPS[app].proc));
  }

  async function query(app) {
    try {
      return {app, value: parseState(await run('osascript', ['-e', SCRIPTS[app]], {timeoutMs: 5000}), app)};
    } catch (error) {
      if (denied(error)) return {app, denied: true};
      return {app, value: null};
    }
  }

  async function artwork(track) {
    const key = `${track.app}:${track.id}`;
    if (art.has(key)) return art.get(key);
    let src = null;
    try {
      if (track.app === 'spotify' && track.artUrl && fetcher) {
        const img = await fetcher.get(track.artUrl, {ttlMs: 3600_000, type: 'bytes', maxBytes: 1_500_000});
        src = `data:${img.type};base64,${img.base64}`;
      } else if (track.app === 'music' && cacheDir) {
        await mkdir(cacheDir, {recursive: true});
        const base = join(cacheDir, createHash('sha1').update(key).digest('hex'));
        try {
          if (text(await run('osascript', ['-e', MUSIC_ART, `${base}.raw`], {timeoutMs: 8000})).trim() === 'ok') {
            await run('sips', ['-Z', String(ART_EDGE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', `${base}.raw`, '--out', `${base}.jpg`], {timeoutMs: 10_000});
            src = `data:image/jpeg;base64,${(await readFile(`${base}.jpg`)).toString('base64')}`;
          }
        } finally {
          await Promise.all([rm(`${base}.raw`, {force: true}), rm(`${base}.jpg`, {force: true})]);
        }
      }
    } catch { src = null; }
    art.set(key, src);
    if (art.size > MAX_ART) art.delete(art.keys().next().value);
    return src;
  }

  async function load(prefer) {
    const apps = await running();
    const candidates = prefer === 'auto' ? apps : apps.filter(a => a === prefer);
    const results = await Promise.all(candidates.map(query));
    const live = results.filter(r => r.value);
    const pick = live.find(r => r.value.state === 'playing') ?? live[0];
    if (!pick) {
      const blocked = results.find(r => r.denied);
      return {supported: true, apps, at: now(), denied: blocked ? blocked.app : null, track: null};
    }
    const {artUrl, ...track} = pick.value;
    return {supported: true, apps, at: now(), denied: null, track: {...track, art: await artwork(pick.value)}};
  }

  async function get({app = 'auto'} = {}) {
    if (os !== 'darwin') return {supported: false, apps: [], at: now(), denied: null, track: null};
    const prefer = app === 'music' || app === 'spotify' ? app : 'auto';
    if (last && last.prefer === prefer && now() - last.at < TTL) return last.value;
    if (inflight?.prefer === prefer) return inflight.job;
    const job = load(prefer).then(value => { last = {prefer, at: now(), value}; return value; }).finally(() => { inflight = null; });
    inflight = {prefer, job};
    return job;
  }

  return {
    get,
    async control({app, action}) {
      if (os !== 'darwin') throw new Error('now playing is only available on macOS');
      if (!APPS[app]) throw new Error(`unknown app: ${app}`);
      if (action === 'open') await run('open', APPS[app].open);
      else if (ACTIONS[action]) {
        if (!(await running()).includes(app)) throw new Error(`${APPS[app].proc} is not running`);
        await run('osascript', ['-e', `tell application "${APPS[app].proc}" to ${ACTIONS[action]}`], {timeoutMs: 5000});
      } else throw new Error(`unknown action: ${action}`);
      last = null;
      return true;
    },
  };
}
