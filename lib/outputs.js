// 产出物：从会话日志收集 Agent 用 present 交付的文件（deliverables/presented），以及 write 新建的文档类文件（tool/result 的 meta.operation 为 create）。
// 同一路径只保留最近一次，交付说明优先；文件已不存在的照常返回，由页面决定是否显示。
import {readFile, stat} from 'node:fs/promises';
import {basename, dirname, extname} from 'node:path';
import {decompress, findLogs} from './usage.js';

const RESCAN_MS = 30_000;
const MAX_ITEMS = 120;
const PRESENTED = '{"type":"deliverables/presented"';
const RESULT = '{"type":"tool/result"';
export const DOC_EXT = new Set(['md', 'markdown', 'txt', 'html', 'htm', 'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx', 'key', 'pages', 'numbers',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'zip']);
const SKIP_DIR = /\/(node_modules|\.git|dist|build|\.next|\.cache)\//;

const isDoc = path => DOC_EXT.has(extname(path).slice(1).toLowerCase()) && !SKIP_DIR.test(path);

export function parseOutputs(text) {
  let session = '';
  let parent = '';
  const items = [];
  for (const line of text.split('\n')) {
    if (!session && line.startsWith('{"type":"session"')) {
      try { const h = JSON.parse(line); session = String(h.id ?? ''); parent = String(h.parentSession ?? ''); } catch {}
      continue;
    }
    const presented = line.startsWith(PRESENTED);
    if (!presented && !(line.startsWith(RESULT) && line.includes('"operation":"create"'))) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const time = Number(event?.time) || 0;
    if (presented) {
      for (const f of event.data?.files ?? []) {
        if (typeof f?.path === 'string' && f.path.startsWith('/')) items.push({path: f.path, description: String(f.description ?? '').slice(0, 300), time, kind: 'presented'});
      }
    } else {
      const meta = event.data?.meta;
      if (meta?.operation === 'create' && typeof meta.path === 'string' && meta.path.startsWith('/') && isDoc(meta.path) && event.data?.message?.isError !== true)
        items.push({path: meta.path, description: '', time, kind: 'created'});
    }
  }
  return {session, parent, items};
}

export function createOutputs({root, now = Date.now} = {}) {
  const files = new Map();
  let scanned = 0;
  let job = null;

  async function rescan() {
    const paths = await findLogs(root);
    const seen = new Set(paths);
    for (const path of files.keys()) if (!seen.has(path)) files.delete(path);
    for (const path of paths) {
      const info = await stat(path).catch(() => null);
      if (!info) continue;
      const hit = files.get(path);
      if (hit && hit.mtimeMs === info.mtimeMs && hit.size === info.size) continue;
      try {
        const raw = await readFile(path);
        const parsed = parseOutputs(path.endsWith('.zstd') ? decompress(raw) : raw.toString('utf8'));
        if (!parsed.session) parsed.session = basename(dirname(path));
        files.set(path, {mtimeMs: info.mtimeMs, size: info.size, ...parsed});
      } catch {
        // 正在写入的日志可能解压失败，下次再试。
      }
    }
    scanned = now();
  }

  return {
    async list({created = true, fresh = false} = {}) {
      if (!job && (fresh || now() - scanned > RESCAN_MS)) job = rescan().finally(() => { job = null; });
      if (job && (!scanned || fresh)) await job;
      const byPath = new Map();
      for (const file of files.values()) {
        for (const item of file.items) {
          if (!created && item.kind !== 'presented') continue;
          const prev = byPath.get(item.path);
          const sessionId = file.parent || file.session;
          if (!prev) { byPath.set(item.path, {...item, sessionId}); continue; }
          const newer = item.time > prev.time;
          byPath.set(item.path, {
            path: item.path,
            time: Math.max(item.time, prev.time),
            sessionId: newer ? sessionId : prev.sessionId,
            kind: item.kind === 'presented' || prev.kind === 'presented' ? 'presented' : 'created',
            description: (newer ? item.description || prev.description : prev.description || item.description),
          });
        }
      }
      const list = [...byPath.values()].sort((a, b) => b.time - a.time).slice(0, MAX_ITEMS);
      const checked = await Promise.all(list.map(async item => {
        const info = await stat(item.path).catch(() => null);
        return {...item, name: basename(item.path), exists: Boolean(info), size: info?.isFile() ? info.size : null};
      }));
      return {items: checked, scannedAt: scanned};
    },
  };
}
