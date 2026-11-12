// 外部请求代理：只允许 http/https，限制超时与响应大小，按 URL 缓存；失败时返回未过期太久的旧值。
const MAX_ENTRIES = 200;
const STALE_FACTOR = 12;

export class FetchError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function checkUrl(raw) {
  let url;
  try { url = new URL(String(raw).trim().replace(/^webcals?:\/\//i, 'https://')); } catch { throw new FetchError('bad-url', `invalid URL: ${raw}`); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchError('bad-url', `only http and https URLs are allowed: ${raw}`);
  return url.href;
}

async function readLimited(response, maxBytes, encoding) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) throw new FetchError('too-large', `response exceeds ${maxBytes} bytes`);
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new FetchError('too-large', `response exceeds ${maxBytes} bytes`); }
    chunks.push(value);
  }
  return new TextDecoder(encoding).decode(Buffer.concat(chunks));
}

export function createFetcher({fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const cache = new Map();
  const inflight = new Map();

  async function load(url, {type, maxBytes, timeoutMs, encoding}) {
    const signal = AbortSignal.timeout(timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {signal, redirect: 'follow', headers: {accept: type === 'json' ? 'application/json' : 'text/calendar, text/plain, */*', 'user-agent': 'dsh-desk'}});
    } catch (error) {
      throw new FetchError(error?.name === 'TimeoutError' ? 'timeout' : 'network', String(error?.message || error));
    }
    if (!response.ok) throw new FetchError('http', `HTTP ${response.status}`);
    const text = await readLimited(response, maxBytes, encoding);
    if (type !== 'json') return text;
    try { return JSON.parse(text); } catch { throw new FetchError('bad-json', 'response is not JSON'); }
  }

  return {
    async get(raw, {ttlMs, type = 'json', maxBytes = 2_000_000, timeoutMs = 10_000, encoding = 'utf-8'} = {}) {
      const url = checkUrl(raw);
      const hit = cache.get(url);
      if (hit && now() - hit.at < ttlMs) return hit.value;
      if (inflight.has(url)) return inflight.get(url);
      const job = load(url, {type, maxBytes, timeoutMs, encoding}).then(value => {
        cache.delete(url);
        cache.set(url, {at: now(), value});
        if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
        return value;
      }, error => {
        if (hit && now() - hit.at < ttlMs * STALE_FACTOR) return hit.value;
        throw error;
      }).finally(() => inflight.delete(url));
      inflight.set(url, job);
      return job;
    },
  };
}
