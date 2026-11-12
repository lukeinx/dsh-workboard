// 用量统计：读 Harness 的 session 日志（每行一个事件，多数为 zstd 压缩），按本地日期 × 模型汇总 assistant/message 的请求数与 token。
// 部分 provider 不上报 usage，这类请求只计入请求数，不计 token。
import {readdir, readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {zstdDecompressSync} from 'node:zlib';

const LOG_NAME = /^session\.v\d+\.jsonl(\.zstd)?$/;
const MAX_DEPTH = 4;
const RESCAN_MS = 60_000;
const KEEP_DAYS = 400;
const LINE_PREFIX = '{"type":"assistant/message"';

const pad = n => String(n).padStart(2, '0');
export const localDay = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const num = v => (Number.isFinite(v) && v > 0 ? v : 0);

// 日志是追加写入的多个 zstd frame；Node 的 zstd 解压只处理第一个 frame，这里按规范逐个切出来。
// 末尾不完整的 frame（正在写入）丢弃。
export function zstdFrames(buf) {
  const frames = [];
  let at = 0;
  while (at + 8 <= buf.length) {
    const magic = buf.readUInt32LE(at);
    if ((magic & 0xfffffff0) === 0x184d2a50) { at += 8 + buf.readUInt32LE(at + 4); continue; }
    if (magic !== 0xfd2fb528) break;
    const fhd = buf[at + 4];
    const single = (fhd >> 5) & 1;
    const fcs = [single ? 1 : 0, 2, 4, 8][fhd >> 6];
    let p = at + 5 + (single ? 0 : 1) + [0, 1, 2, 4][fhd & 3] + fcs;
    let last = 0;
    while (!last) {
      if (p + 3 > buf.length) return frames;
      const header = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
      last = header & 1;
      const type = (header >> 1) & 3;
      if (type === 3) return frames;
      p += 3 + (type === 1 ? 1 : header >>> 3);
    }
    if ((fhd >> 2) & 1) p += 4;
    if (p > buf.length) break;
    frames.push(buf.subarray(at, p));
    at = p;
  }
  return frames;
}

const decompress = buf => zstdFrames(buf).map(f => zstdDecompressSync(f).toString('utf8')).join('');

export function parseLog(text) {
  const rows = new Map();
  for (const line of text.split('\n')) {
    if (!line.startsWith(LINE_PREFIX)) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const time = Number(event?.time);
    if (!Number.isFinite(time)) continue;
    const source = event.data?.message?.source ?? {};
    const usage = event.data?.usage;
    const day = localDay(time);
    const key = `${day}\t${source.provider ?? ''}\t${source.model ?? ''}`;
    let row = rows.get(key);
    if (!row) { row = {day, provider: String(source.provider ?? ''), model: String(source.model ?? ''), requests: 0, reported: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0}; rows.set(key, row); }
    row.requests++;
    if (usage && typeof usage === 'object') {
      row.reported++;
      row.input += num(usage.inputTokens);
      row.output += num(usage.outputTokens);
      row.cacheRead += num(usage.cacheReadTokens);
      row.cacheWrite += num(usage.cacheWriteTokens);
    }
  }
  return [...rows.values()];
}

async function findLogs(dir, depth = 0, out = []) {
  let entries;
  try { entries = await readdir(dir, {withFileTypes: true}); } catch { return out; }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && depth < MAX_DEPTH) await findLogs(path, depth + 1, out);
    else if (entry.isFile() && LOG_NAME.test(entry.name)) out.push(path);
  }
  return out;
}

export function createUsage({root, now = Date.now} = {}) {
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
        const text = path.endsWith('.zstd') ? decompress(raw) : raw.toString('utf8');
        files.set(path, {mtimeMs: info.mtimeMs, size: info.size, rows: parseLog(text)});
      } catch {
        // 正在写入的日志可能解压失败，保留上次结果，下次再试。
      }
    }
    scanned = now();
  }

  return {
    async summary({days = 30} = {}) {
      if (!job && now() - scanned > RESCAN_MS) job = rescan().finally(() => { job = null; });
      if (job && !scanned) await job;
      const span = Math.min(Math.max(Math.floor(Number(days) || 30), 1), KEEP_DAYS);
      const start = new Date(now());
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (span - 1));
      const from = localDay(start.getTime());
      const merged = new Map();
      for (const file of files.values()) {
        for (const row of file.rows) {
          if (row.day < from) continue;
          const key = `${row.day}\t${row.provider}\t${row.model}`;
          const acc = merged.get(key);
          if (!acc) { merged.set(key, {...row}); continue; }
          for (const k of ['requests', 'reported', 'input', 'output', 'cacheRead', 'cacheWrite']) acc[k] += row[k];
        }
      }
      return {from, today: localDay(now()), files: files.size, scannedAt: scanned, rows: [...merged.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))};
    },
  };
}
