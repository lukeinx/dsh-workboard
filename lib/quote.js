// 在线格言：一言（hitokoto.cn）。按客户端传来的日期缓存当天已取到的句子，第 n 条不足时依次补取。
const HITOKOTO = 'https://v1.hitokoto.cn/?encode=json&max_length=60';
const MAX_INDEX = 50;

export function parseHitokoto(d) {
  const text = String(d?.hitokoto ?? '').trim();
  if (!text) return null;
  const who = String(d?.from_who ?? '').trim();
  const from = String(d?.from ?? '').trim();
  return {text, by: [who, from && from !== who ? `《${from}》` : ''].filter(Boolean).join(' ')};
}

export function createQuotes(fetcher) {
  let day = '';
  let list = [];
  let chain = Promise.resolve();
  const fill = async n => {
    while (list.length <= n) {
      const q = parseHitokoto(await fetcher.get(`${HITOKOTO}&_=${Date.now().toString(36)}${list.length}`, {ttlMs: 0, timeoutMs: 8_000, maxBytes: 64_000}));
      if (!q) throw new Error('empty quote');
      list.push(q);
    }
    return list[n];
  };
  return {
    get({day: d, n} = {}) {
      const key = String(d ?? '');
      const i = Math.min(Math.max(Number.isInteger(n) ? n : 0, 0), MAX_INDEX);
      if (key !== day) { day = key; list = []; }
      const job = chain.then(() => fill(i));
      chain = job.catch(() => {});
      return job;
    },
  };
}
