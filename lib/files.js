// 最近文件：只读指定文件夹的第一层，跳过隐藏项，按创建或修改时间（取较晚者）倒序合并。
import {readdir, stat} from 'node:fs/promises';
import {extname, join} from 'node:path';

const TTL_MS = 10_000;
const PER_DIR = 400;
const MAX_DIRS = 8;
// 在 Finder 里双击会直接运行或安装的类型，卡片上只定位不打开。
export const RISKY_EXT = new Set(['app', 'command', 'tool', 'sh', 'bash', 'zsh', 'pkg', 'mpkg', 'dmg', 'exe', 'msi', 'bat', 'cmd', 'jar', 'scpt', 'workflow', 'terminal', 'webloc', 'inetloc', 'fileloc']);

export const isRisky = path => RISKY_EXT.has(extname(path).slice(1).toLowerCase());

export function createRecentFiles({now = Date.now} = {}) {
  const cache = new Map();
  const one = async dir => {
    const hit = cache.get(dir);
    if (hit && now() - hit.at < TTL_MS) return hit.items;
    const entries = (await readdir(dir, {withFileTypes: true})).filter(e => !e.name.startsWith('.') && e.name !== 'Icon\r').slice(0, PER_DIR);
    const items = (await Promise.all(entries.map(async e => {
      const path = join(dir, e.name);
      const info = await stat(path).catch(() => null);
      if (!info) return null;
      const folder = info.isDirectory() && !/\.(app|pkg|bundle|rtfd|key|pages|numbers)$/i.test(e.name);
      return {path, name: e.name, dir, folder, size: info.isFile() ? info.size : null, time: Math.max(info.mtimeMs, info.birthtimeMs || 0), risky: isRisky(path)};
    }))).filter(Boolean);
    cache.set(dir, {at: now(), items});
    return items;
  };
  return {
    async list({dirs, limit = 40, folders = true}) {
      const list = [...new Set(dirs)].slice(0, MAX_DIRS);
      const errors = [];
      const all = [];
      await Promise.all(list.map(async dir => {
        try { all.push(...await one(dir)); } catch (error) { errors.push({dir, message: String(error?.message || error)}); }
      }));
      const max = Math.min(Math.max(Number(limit) || 40, 1), 100);
      return {items: all.filter(x => folders || !x.folder).sort((a, b) => b.time - a.time).slice(0, max), errors};
    },
  };
}
