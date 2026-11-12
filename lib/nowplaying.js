// 正在播放：macOS 上优先通过 MediaRemote 读取系统「正在播放」，覆盖 QQ 音乐、浏览器等所有上报给控制中心的来源；
// 读不到时退回 osascript 读取并控制「音乐」和 Spotify。只查询已在运行的 App，不会把它们拉起来。
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {platform} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
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

// MediaRemote 自 macOS 15.4 起只对带 entitlement 的进程开放，借系统自带的 /usr/bin/perl 加载 vendor 里的 adapter。
const ADAPTER_DIR = fileURLToPath(new URL('../vendor/mediaremote-adapter/', import.meta.url));
export const ADAPTER = ['/usr/bin/perl', join(ADAPTER_DIR, 'mediaremote-adapter.pl'), join(ADAPTER_DIR, 'MediaRemoteAdapter.framework')];
const MR_COMMANDS = {play: 0, pause: 1, toggle: 2, next: 4, previous: 5};
const BUNDLE = /^[A-Za-z0-9][\w.-]{0,200}$/;

// stream 默认推送增量：值为 null 表示该字段消失。换歌时封面往往晚到，先清掉旧封面免得套到新歌上。
export function mergeMedia(state, msg) {
  const p = msg?.payload;
  if (msg?.type !== 'data' || !p || typeof p !== 'object') return state;
  if (!msg.diff) return {...p};
  const next = {...state};
  if (('title' in p || 'bundleIdentifier' in p) && !('artworkData' in p)) { delete next.artworkData; delete next.artworkMimeType; }
  for (const [k, v] of Object.entries(p)) {
    if (v === null) delete next[k];
    else next[k] = v;
  }
  return next;
}

// QQ 音乐同一首歌的 contentItemIdentifier 会变，曲目 id 改用来源与标题、歌手、专辑拼成。
export function parseMedia(p, at) {
  const bundle = String(p?.parentApplicationBundleIdentifier || p?.bundleIdentifier || '');
  const str = v => (typeof v === 'string' ? v : '');
  const title = str(p?.title);
  if (!BUNDLE.test(bundle) || !title) return null;
  const ms = v => (Number.isFinite(v) && v > 0 ? v / 1000 : 0);
  const playing = p.playing === true;
  const duration = Math.round(ms(p.durationMicros));
  let position = ms(p.elapsedTimeMicros);
  if (playing && p.timestampEpochMicros > 0) position += Math.max(0, at - p.timestampEpochMicros / 1000) * (p.playbackRate > 0 ? p.playbackRate : 1);
  const artist = str(p.artist);
  const album = str(p.album);
  return {app: 'system', bundle, state: playing ? 'playing' : 'paused', title, artist, album, duration, position: Math.round(duration ? Math.min(duration, position) : position), id: `${bundle}\0${title}\0${artist}\0${album}`};
}

// 常驻一个 stream 进程接收变化，比每次轮询都起 perl（约 1 秒）更省；一段时间没人查询就退出。
// 进程异常退出说明此路不通，retryMs 内不再重试，由调用方退回 AppleScript。
export function createMediaRemote({spawn, now = Date.now, idleMs = 30_000, retryMs = 300_000, startMs = 4000, settleMs = 1500} = {}) {
  let child = null;
  let state = null;
  let settled = false;
  let failedAt = -Infinity;
  let lastUse = 0;
  let idleTimer = null;
  let waiters = [];

  const wake = () => { const list = waiters; waiters = []; for (const fn of list) fn(); };
  const wait = ms => new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
    waiters.push(() => { clearTimeout(timer); resolve(); });
  });

  function reset() {
    clearInterval(idleTimer);
    idleTimer = null;
    child = null;
    state = null;
    settled = false;
    wake();
  }

  function stop() {
    const c = child;
    reset();
    c?.kill();
  }

  function start() {
    let buf = '';
    const c = spawn(ADAPTER[0], [...ADAPTER.slice(1), 'stream', '--micros'], {stdio: ['ignore', 'pipe', 'ignore']});
    child = c;
    c.stdout.setEncoding('utf8');
    c.stdout.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!line.trim() || child !== c) continue;
        try { state = mergeMedia(state ?? {}, JSON.parse(line)); } catch { continue; }
        wake();
      }
    });
    const fail = () => {
      if (child !== c) return;
      failedAt = now();
      reset();
    };
    c.on('error', fail);
    c.on('exit', fail);
    idleTimer = setInterval(() => { if (now() - lastUse > idleMs) stop(); }, Math.min(idleMs, 10_000));
    idleTimer.unref?.();
  }

  return {
    // 返回当前状态（没有在播放时为 {}），此路不可用时返回 null。
    // 启动后第一条总是空状态，稍等 settleMs 看有没有真正的播放信息。
    async snapshot() {
      lastUse = now();
      if (!child) {
        if (now() - failedAt < retryMs) return null;
        start();
      }
      const c = child;
      const deadline = Date.now() + startMs;
      let firstAt = null;
      while (child === c && !settled) {
        if (state && Object.keys(state).length) break;
        if (state && firstAt === null) firstAt = Date.now();
        const left = Math.min(deadline, firstAt === null ? Infinity : firstAt + settleMs) - Date.now();
        if (left <= 0) break;
        await wait(left);
      }
      if (child !== c || !state) return null;
      settled = true;
      return state;
    },
    async send(run, action) {
      await run(ADAPTER[0], [...ADAPTER.slice(1), 'send', String(MR_COMMANDS[action])], {timeoutMs: 5000});
    },
    stop,
  };
}

export function createNowPlaying({run, fetcher, cacheDir, media, os = platform(), now = Date.now} = {}) {
  const art = new Map();
  const names = new Map();
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

  // 取 App 的本地化显示名（如「QQ音乐」），查不到就用 bundle id 的最后一段。
  async function appName(bundle) {
    if (names.has(bundle)) return names.get(bundle);
    let name = '';
    try {
      const paths = text(await run('mdfind', [`kMDItemCFBundleIdentifier == "${bundle}"`], {timeoutMs: 5000})).split('\n').filter(p => p.endsWith('.app'));
      const path = paths.find(p => /^\/(System\/)?Applications\//.test(p)) ?? paths[0];
      if (path) name = text(await run('mdls', ['-name', 'kMDItemDisplayName', '-raw', path], {timeoutMs: 5000})).trim().replace(/\.app$/, '');
    } catch { name = ''; }
    if (!name || name === '(null)') name = bundle.split('.').pop();
    names.set(bundle, name);
    return name;
  }

  // 封面常在曲目信息之后才到，缺失时不缓存，下次查询再取。
  function mediaArt(track, payload) {
    if (art.has(track.id)) return art.get(track.id);
    const data = payload.artworkData;
    const type = String(payload.artworkMimeType ?? '');
    if (typeof data !== 'string' || !data || !/^image\/[\w.+-]+$/.test(type)) return null;
    const job = (async () => {
      if (!cacheDir) return `data:${type};base64,${data}`;
      const base = join(cacheDir, createHash('sha1').update(track.id).digest('hex'));
      try {
        await mkdir(cacheDir, {recursive: true});
        await writeFile(`${base}.raw`, Buffer.from(data, 'base64'));
        await run('sips', ['-Z', String(ART_EDGE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', `${base}.raw`, '--out', `${base}.jpg`], {timeoutMs: 10_000});
        return `data:image/jpeg;base64,${(await readFile(`${base}.jpg`)).toString('base64')}`;
      } catch {
        return data.length < 1_500_000 ? `data:${type};base64,${data}` : null;
      } finally {
        await Promise.all([rm(`${base}.raw`, {force: true}), rm(`${base}.jpg`, {force: true})]);
      }
    })();
    art.set(track.id, job);
    if (art.size > MAX_ART) art.delete(art.keys().next().value);
    return job;
  }

  async function loadSystem(apps) {
    const payload = await media.snapshot();
    if (!payload) return null;
    const at = now();
    const track = parseMedia(payload, at);
    if (!track) return {supported: true, apps, at, denied: null, track: null};
    const [name, src] = await Promise.all([appName(track.bundle), mediaArt(track, payload)]);
    return {supported: true, apps, at, denied: null, track: {...track, name, art: src}};
  }

  async function load(prefer) {
    const apps = await running();
    if (prefer === 'auto' && media) {
      const value = await loadSystem(apps);
      if (value) return value;
    }
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
    async control({app, action, bundle}) {
      if (os !== 'darwin') throw new Error('now playing is only available on macOS');
      if (app === 'system') {
        if (action === 'open') {
          if (!BUNDLE.test(String(bundle ?? ''))) throw new Error(`invalid bundle id: ${bundle}`);
          await run('open', ['-b', bundle]);
        } else if (media && Object.hasOwn(MR_COMMANDS, action)) await media.send(run, action);
        else throw new Error(`unknown action: ${action}`);
        last = null;
        return true;
      }
      if (!APPS[app]) throw new Error(`unknown app: ${app}`);
      if (action === 'open') await run('open', APPS[app].open);
      else if (ACTIONS[action]) {
        if (!(await running()).includes(app)) throw new Error(`${APPS[app].proc} is not running`);
        await run('osascript', ['-e', `tell application "${APPS[app].proc}" to ${ACTIONS[action]}`], {timeoutMs: 5000});
      } else throw new Error(`unknown action: ${action}`);
      last = null;
      return true;
    },
    stop() { media?.stop(); },
  };
}
