import {createHash} from 'node:crypto';
import {mkdir, readdir, readFile, rm, stat} from 'node:fs/promises';
import {platform} from 'node:os';
import {extname, join, relative} from 'node:path';

const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif']);
const DIRECT = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'};
const SKIP_DIR = /^\.|\.(photoslibrary|app|bundle|lrlibrary|lrdata)$|^node_modules$/i;
const MAX_FILES = 5000;
const MAX_DEPTH = 3;
const LIST_TTL = 5 * 60_000;
const MAX_DIRECT = 6 * 1024 * 1024;
const MAX_CACHE = 200;
const EDGE = 1280;

export async function findPhotos(root, {maxFiles = MAX_FILES, maxDepth = MAX_DEPTH} = {}) {
  const out = [];
  const walk = async (dir, depth) => {
    let entries;
    try { entries = await readdir(dir, {withFileTypes: true}); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      const path = join(dir, e.name);
      if (e.isDirectory()) { if (depth < maxDepth && !SKIP_DIR.test(e.name)) await walk(path, depth + 1); }
      else if (e.isFile() && !e.name.startsWith('.') && EXT.has(extname(e.name).toLowerCase())) out.push(path);
    }
  };
  await walk(root, 0);
  return out;
}

export function createPhotos({run, cacheDir, now = Date.now, os = platform(), random = Math.random} = {}) {
  const lists = new Map();
  let written = 0;

  async function list(dir) {
    const hit = lists.get(dir);
    if (hit && now() - hit.at < LIST_TTL) return hit.files;
    const files = await findPhotos(dir);
    lists.set(dir, {at: now(), files});
    return files;
  }

  async function prune() {
    const names = await readdir(cacheDir).catch(() => []);
    if (names.length <= MAX_CACHE) return;
    const items = await Promise.all(names.map(async name => ({name, at: (await stat(join(cacheDir, name)).catch(() => null))?.mtimeMs ?? 0})));
    items.sort((a, b) => a.at - b.at);
    await Promise.all(items.slice(0, items.length - MAX_CACHE).map(i => rm(join(cacheDir, i.name), {force: true})));
  }

  async function render(path) {
    const info = await stat(path);
    const ext = extname(path).toLowerCase();
    if (os === 'darwin' && run && cacheDir) {
      const key = createHash('sha1').update(`${path}\0${info.size}\0${info.mtimeMs}`).digest('hex');
      const out = join(cacheDir, `${key}.jpg`);
      let buf = await readFile(out).catch(() => null);
      if (!buf) {
        await mkdir(cacheDir, {recursive: true});
        await run('sips', ['-Z', String(EDGE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', path, '--out', out], {timeoutMs: 20_000});
        buf = await readFile(out);
        if (++written % 20 === 0) prune().catch(() => {});
      }
      return {mime: 'image/jpeg', buf, at: info.mtimeMs};
    }
    if (!DIRECT[ext] || info.size > MAX_DIRECT) throw new Error('unsupported image');
    return {mime: DIRECT[ext], buf: await readFile(path), at: info.mtimeMs};
  }

  return {
    // current 为上次展示的相对路径：仍在列表里就原样返回（kept），用于重新进入页面时不换图。
    async next({dir, index, shuffle, current}) {
      const files = await list(dir);
      if (!files.length) return {count: 0};
      const keep = current ? files.indexOf(join(dir, current)) : -1;
      let i = keep >= 0 ? keep : shuffle ? Math.floor(random() * files.length) : ((Number.isInteger(index) ? index : -1) + 1 + files.length) % files.length;
      for (let attempt = 0; attempt < 3; attempt++) {
        const path = files[i];
        try {
          const {mime, buf, at} = await render(path);
          return {count: files.length, index: i, name: relative(dir, path), at, kept: attempt === 0 && keep >= 0, src: `data:${mime};base64,${buf.toString('base64')}`};
        } catch {
          i = shuffle ? Math.floor(random() * files.length) : (i + 1) % files.length;
        }
      }
      throw new Error('could not read the images in this folder');
    },
  };
}
