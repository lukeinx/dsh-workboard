// 在线格言：一言（hitokoto.cn）。按客户端传来的日期与分类缓存当天已取到的句子，第 n 条不足时依次补取。
const HITOKOTO = 'https://v1.hitokoto.cn/?encode=json&max_length=60';
const MAX_INDEX = 50;
// 一言分类代码：d 文学、i 诗词、k 哲学；all 不限分类。
export const HITOKOTO_CATS = {curated: ['d', 'i', 'k'], poetry: ['i'], literature: ['d'], philosophy: ['k'], all: []};
// 非「全部」时跳过没有作者的句子，多为网络摘抄；连续取不到就接受。
const AUTHOR_TRIES = 4;

export function parseHitokoto(d) {
  const text = String(d?.hitokoto ?? '').trim();
  if (!text) return null;
  const who = String(d?.from_who ?? '').trim();
  const from = String(d?.from ?? '').trim();
  return {text, by: [who, from && from !== who ? `《${from}》` : ''].filter(Boolean).join(' '), who};
}

export function createQuotes(fetcher) {
  let key = '';
  let list = [];
  let chain = Promise.resolve();
  const fill = async (n, cat) => {
    const url = HITOKOTO + HITOKOTO_CATS[cat].map(c => `&c=${c}`).join('');
    while (list.length <= n) {
      let q = null;
      for (let i = 0; i < (cat === 'all' ? 1 : AUTHOR_TRIES); i++) {
        const got = parseHitokoto(await fetcher.get(`${url}&_=${Date.now().toString(36)}${list.length}${i}`, {ttlMs: 0, timeoutMs: 8_000, maxBytes: 64_000}));
        if (got) q = got;
        if (got?.who) break;
      }
      if (!q) throw new Error('empty quote');
      list.push({text: q.text, by: q.by});
    }
    return list[n];
  };
  return {
    get({day, n, cat} = {}) {
      const c = Object.hasOwn(HITOKOTO_CATS, cat) ? cat : 'curated';
      const k = `${day ?? ''}|${c}`;
      const i = Math.min(Math.max(Number.isInteger(n) ? n : 0, 0), MAX_INDEX);
      if (k !== key) { key = k; list = []; }
      const job = chain.then(() => fill(i, c));
      chain = job.catch(() => {});
      return job;
    },
  };
}
