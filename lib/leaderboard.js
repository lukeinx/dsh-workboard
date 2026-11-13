// 大模型竞技场榜：读取 Hugging Face Datasets Server 上的官方 lmarena-ai/leaderboard-dataset（无需 key）。
import {parseVendors} from './models.js';

const TTL = 60 * 60_000;
const LIMIT = 30;
const API = 'https://datasets-server.huggingface.co/first-rows';
const DATASET = 'lmarena-ai/leaderboard-dataset';
const SITE = 'https://lmarena.ai/leaderboard';
const KINDS = new Set(['text', 'webdev', 'agent', 'vision', 'search']);

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function parseLeaderboard(body, kind = 'text') {
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const isAgent = kind === 'agent';
  return rows.map(x => x?.row).filter(r => r?.model_name && (!r.category || r.category === 'overall')).map((r, i) => {
    const license = clip(r.license, 60);
    const rawScore = isAgent ? Number(r.score) * 100 : Number(r.rating);
    const score = Number.isFinite(rawScore) ? (isAgent ? Math.round(rawScore * 10) / 10 : Math.round(rawScore)) : 0;
    const cost = isAgent && Number.isFinite(Number(r.cost_per_task_p50)) && Number(r.cost_per_task_p50) >= 0
      ? Math.round(Number(r.cost_per_task_p50) * 100) / 100
      : null;
    return {
      rank: num(r.rank) || i + 1,
      name: clip(r.model_name, 120),
      vendor: clip(r.organization, 60).toLowerCase(),
      license,
      open: Boolean(license && !/^proprietary$/i.test(license)),
      score,
      votes: num(isAgent ? r.session_count : r.vote_count),
      cost,
      date: /^\d{4}-\d{2}-\d{2}$/.test(r.leaderboard_publish_date ?? '') ? r.leaderboard_publish_date : '',
      url: `${SITE}/${kind}`,
    };
  }).filter(r => r.score > 0).sort((a, b) => a.rank - b.rank || b.score - a.score);
}

export function filterLeaderboard(items, {openOnly = false, vendors = ''} = {}) {
  const only = parseVendors(vendors);
  return items.filter(m => {
    if (openOnly && !m.open) return false;
    if (!only.length) return true;
    const hay = `${m.vendor} ${m.name.toLowerCase()}`;
    return only.some(v => hay.includes(v));
  }).slice(0, LIMIT);
}

export function createLeaderboard(fetcher) {
  return {
    async list({kind = 'text', openOnly = false, vendors = ''} = {}) {
      if (!KINDS.has(kind)) throw new Error(`unknown leaderboard ${kind}`);
      const url = `${API}?dataset=${encodeURIComponent(DATASET)}&config=${encodeURIComponent(kind)}&split=latest`;
      const all = parseLeaderboard(await fetcher.get(url, {ttlMs: TTL, maxBytes: 4_000_000, timeoutMs: 15_000}), kind);
      if (!all.length) throw new Error('empty leaderboard');
      const items = filterLeaderboard(all, {openOnly, vendors});
      return {kind, date: all[0]?.date || '', items};
    },
  };
}
