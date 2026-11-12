// 行情：A 股 / 港股 / 美股走腾讯行情，法币汇率走 open.er-api.com，加密货币走 CoinGecko。
const MAX_SYMBOLS = 30;
const QUOTE_TTL = 60_000;
const CRYPTO_TTL = 120_000;
const FX_TTL = 60 * 60_000;

const CRYPTO = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin',
  ADA: 'cardano', TON: 'the-open-network', TRX: 'tron', USDT: 'tether', USDC: 'usd-coin',
};
const STOCK_CURRENCY = {sh: 'CNY', sz: 'CNY', bj: 'CNY', hk: 'HKD', us: 'USD'};

export function parseSymbol(line) {
  const [raw = '', ...rest] = String(line).trim().split(/\s+/);
  const label = rest.join(' ');
  let m = /^(sh|sz|bj)(\d{6})$/i.exec(raw) || /^(hk)(\d{5})$/i.exec(raw) || /^(us)([A-Za-z][A-Za-z.\-]*)$/i.exec(raw);
  if (m) {
    const market = m[1].toLowerCase();
    const code = market === 'us' ? m[2].toUpperCase() : m[2];
    return {kind: 'stock', symbol: `${market}${code}`, code: `${market}${code}`, currency: STOCK_CURRENCY[market], label};
  }
  m = /^cg:([a-z0-9-]+)(?:\/([a-z]{3}))?$/i.exec(raw);
  if (m) return {kind: 'crypto', symbol: raw, id: m[1].toLowerCase(), vs: (m[2] ?? 'usd').toLowerCase(), label};
  m = /^([A-Za-z]{2,6})(?:\/([A-Za-z]{3}))?$/.exec(raw);
  if (m && CRYPTO[m[1].toUpperCase()]) return {kind: 'crypto', symbol: raw.toUpperCase(), id: CRYPTO[m[1].toUpperCase()], vs: (m[2] ?? 'usd').toLowerCase(), label};
  m = /^([A-Za-z]{3})\/([A-Za-z]{3})$/.exec(raw);
  if (m) return {kind: 'fx', symbol: raw.toUpperCase(), base: m[1].toUpperCase(), quote: m[2].toUpperCase(), label};
  return raw ? {kind: 'unknown', symbol: raw, label} : null;
}

export function parseSymbols(text) {
  return String(text ?? '').split('\n').map(parseSymbol).filter(Boolean).slice(0, MAX_SYMBOLS);
}

export function parseTencent(text) {
  const out = new Map();
  for (const m of String(text).matchAll(/v_(\w+)="([^"]*)"/g)) {
    const f = m[2].split('~');
    const price = Number(f[3]);
    if (f.length < 33 || !Number.isFinite(price) || price <= 0) continue;
    out.set(m[1], {name: f[1], price, prev: Number(f[4]), change: Number(f[31]), pct: Number(f[32])});
  }
  return out;
}

const num = v => (Number.isFinite(v) ? v : null);

export function createMarket(fetcher) {
  async function stocks(items) {
    if (!items.length) return new Map();
    const codes = [...new Set(items.map(i => i.code))].sort();
    return parseTencent(await fetcher.get(`https://qt.gtimg.cn/q=${codes.join(',')}`, {ttlMs: QUOTE_TTL, type: 'text', encoding: 'gbk', maxBytes: 200_000}));
  }
  async function crypto(items) {
    if (!items.length) return {};
    const ids = [...new Set(items.map(i => i.id))].sort();
    const vs = [...new Set(items.map(i => i.vs))].sort();
    return fetcher.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${vs.join(',')}&include_24hr_change=true`, {ttlMs: CRYPTO_TTL, maxBytes: 200_000});
  }
  async function fx(items) {
    if (!items.length) return null;
    const data = await fetcher.get('https://open.er-api.com/v6/latest/USD', {ttlMs: FX_TTL, maxBytes: 200_000});
    if (data?.result !== 'success' || !data.rates) throw new Error('exchange rates are unavailable');
    return data.rates;
  }

  return {
    async quotes({symbols}) {
      const list = parseSymbols(symbols);
      const by = kind => list.filter(i => i.kind === kind);
      const [s, c, f] = await Promise.allSettled([stocks(by('stock')), crypto(by('crypto')), fx(by('fx'))]);
      const fail = r => String(r.reason?.message || r.reason);
      const items = list.map(i => {
        const base = {symbol: i.symbol, label: i.label};
        if (i.kind === 'stock') {
          if (s.status === 'rejected') return {...base, error: fail(s)};
          const q = s.value.get(i.code);
          if (!q) return {...base, error: 'not found'};
          return {...base, name: q.name, price: q.price, change: num(q.change), pct: num(q.pct), currency: i.currency};
        }
        if (i.kind === 'crypto') {
          if (c.status === 'rejected') return {...base, error: fail(c)};
          const q = c.value?.[i.id];
          const price = num(q?.[i.vs]);
          if (price == null) return {...base, error: 'not found'};
          const pct = num(q[`${i.vs}_24h_change`]);
          return {...base, name: i.symbol.replace(/^cg:/i, ''), price, change: pct == null ? null : price - price / (1 + pct / 100), pct, currency: i.vs.toUpperCase()};
        }
        if (i.kind === 'fx') {
          if (f.status === 'rejected') return {...base, error: fail(f)};
          const a = f.value[i.base];
          const b = f.value[i.quote];
          if (!a || !b) return {...base, error: 'not found'};
          return {...base, name: i.symbol, price: b / a, change: null, pct: null, currency: i.quote};
        }
        return {...base, error: 'unknown symbol'};
      });
      return {items, fetchedAt: Date.now()};
    },
  };
}
