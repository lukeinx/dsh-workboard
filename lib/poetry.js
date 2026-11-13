// 在线诗词：今日诗词公开接口（v2.jinrishici.com）。按客户端日期缓存当天已取到的诗词，点击切换时依次补取。
const JINRISHICI = 'https://v2.jinrishici.com/one.json';
const MAX_INDEX = 50;

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function parseJinrishici(body) {
  const d = body?.data;
  const quote = clip(d?.content, 160);
  if (!quote) return null;
  const origin = d?.origin ?? {};
  const title = clip(origin.title, 100);
  const dynasty = clip(origin.dynasty, 30).replace(/代$/, '');
  const author = clip(origin.author, 40);
  const lines = (Array.isArray(origin.content) ? origin.content : []).map(l => clip(l, 160)).filter(Boolean).slice(0, 24);
  const note = (Array.isArray(origin.translate) ? origin.translate : []).map(l => clip(l, 200)).filter(Boolean).join(' ').slice(0, 300);
  const tags = (Array.isArray(d?.matchTags) ? d.matchTags : []).map(t => clip(t, 24)).filter(Boolean).slice(0, 4);
  return {
    quote,
    title: title || '无题',
    dynasty,
    author,
    lines: lines.length ? lines : [quote],
    ...(note ? {note} : {}),
    ...(tags.length ? {tags} : {}),
  };
}

export function createPoetry(fetcher) {
  let day = '';
  let list = [];
  let chain = Promise.resolve();
  const fill = async n => {
    while (list.length <= n) {
      const p = parseJinrishici(await fetcher.get(`${JINRISHICI}?_=${Date.now().toString(36)}${list.length}`, {ttlMs: 0, timeoutMs: 8_000, maxBytes: 128_000}));
      if (!p) throw new Error('empty poem');
      list.push(p);
    }
    return list[n];
  };
  return {
    get({day: d, n} = {}) {
      const key = String(d ?? '');
      const i = Math.min(Math.max(Number.isInteger(n) ? n : Number(n) || 0, 0), MAX_INDEX);
      if (key !== day) { day = key; list = []; }
      const job = chain.then(() => fill(i));
      chain = job.catch(() => {});
      return job;
    },
  };
}
