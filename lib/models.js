// 模型行情：OpenRouter 公开模型列表（无需 key），给出本周热门、最新上架与价格；价格表也供用量 widget 估算花费。
const TTL = 30 * 60_000;
const LIMIT = 30;
const API = 'https://openrouter.ai/api/v1/models';
const SITE = 'https://openrouter.ai';
const MODEL_ID = /^[\w.-]+\/[\w.-]+$/;

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// OpenRouter 价格是「美元 / token」的字符串；负数（如 openrouter/auto 的 -1）表示动态价，视为未知。
const perMillion = v => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1e6 * 1e4) / 1e4 : null;
};

// OpenRouter 里 1M 上下文混用 1000000、1024000、1048576（2^20）、1050000 等写法；K 档也混用 1000 与 1024 进制（如 131072 = 128K、262144 = 256K），统一折算成十进制整档。
const normContext = v => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const m = Math.round(n / (1024 * 1024));
  if (m >= 1 && Math.abs(n - m * 1024 * 1024) <= m * 25_000) return m * 1_000_000;
  return n >= 1024 && n % 1000 !== 0 ? Math.round(n / 1024) * 1000 : n;
};

// 本机日志里的模型名与 OpenRouter id 的写法不同（claude-opus-5-5 / anthropic/claude-opus-5.5），统一成小写、去掉厂商前缀、点和下划线换成连字符再比较。
export const modelKey = s => String(s ?? '').toLowerCase().trim().replace(/^.*\//, '').replace(/[._\s]+/g, '-');

export function parseModels(body) {
  const list = Array.isArray(body?.data) ? body.data : [];
  return list.filter(m => typeof m?.id === 'string' && MODEL_ID.test(m.id)).map(m => {
    const p = m.pricing ?? {};
    const input = perMillion(p.prompt);
    const output = perMillion(p.completion);
    return {
      id: m.id,
      name: clip(String(m.name ?? m.id).replace(/^[^:]{1,40}:\s*/, ''), 120) || m.id,
      vendor: m.id.split('/')[0],
      url: `${SITE}/${m.id}`,
      context: normContext(m.context_length),
      created: Number.isFinite(Number(m.created)) ? Number(m.created) * 1000 : 0,
      input, output,
      cacheRead: perMillion(p.input_cache_read),
      cacheWrite: perMillion(p.input_cache_write),
      free: input === 0 && output === 0,
      vision: Array.isArray(m.architecture?.input_modalities) && m.architecture.input_modalities.includes('image'),
    };
  });
}

// 同一模型的 :free、:batch 等变体只保留原型；按厂商过滤时匹配 id 前缀。
const visible = (items, vendors) => items.filter(m => !m.id.includes(':') && (!vendors.length || vendors.includes(m.vendor)));

export function parseVendors(text) {
  return [...new Set(String(text ?? '').toLowerCase().split(/[\s,，、]+/).filter(v => /^[\w.-]+$/.test(v)))].slice(0, 30);
}

export function priceTable(items) {
  const table = {};
  for (const m of items) {
    if (m.id.includes(':') || m.input == null || m.output == null) continue;
    const key = modelKey(m.id);
    if (Object.hasOwn(table, key)) continue;
    table[key] = {input: m.input, output: m.output, cacheRead: m.cacheRead ?? m.input, cacheWrite: m.cacheWrite ?? m.input};
  }
  return table;
}

export function createModels(fetcher) {
  const load = sort => fetcher.get(sort ? `${API}?sort=${sort}` : API, {ttlMs: TTL, maxBytes: 6_000_000, timeoutMs: 15_000}).then(parseModels);
  return {
    async list({kind, vendors = ''}) {
      const only = parseVendors(vendors);
      if (kind === 'prices') return {kind, prices: priceTable(await load(''))};
      if (kind === 'top') return {kind, items: visible(await load('top-weekly'), only).slice(0, LIMIT)};
      if (kind === 'new') return {kind, items: visible(await load(''), only).sort((a, b) => b.created - a.created).slice(0, LIMIT)};
      throw new Error(`unknown list ${kind}`);
    },
  };
}
