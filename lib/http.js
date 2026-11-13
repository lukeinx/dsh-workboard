// 外部请求代理：只允许 http/https，限制超时与响应大小，按 URL、类型与请求体缓存；失败时返回未过期太久的旧值。
const MAX_ENTRIES = 200;
const STALE_FACTOR = 12;
// 客户端轮询间隔常与 TTL 相同，到点时缓存往往差几秒才过期；提前过期，避免每隔一轮才真正刷新。
const FRESH_RATIO = 0.9;

export class FetchError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function checkUrl(raw) {
  let url;
  try { url = new URL(String(raw).trim().replace(/^webcals?:\/\//i, 'https://')); } catch { throw new FetchError('bad-url', `invalid URL: ${raw}`); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchError('bad-url', `only http and https URLs are allowed: ${raw}`);
  return url.href;
}

async function readBytes(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) throw new FetchError('too-large', `response exceeds ${maxBytes} bytes`);
  if (!response.body) return Buffer.alloc(0);
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
  return Buffer.concat(chunks);
}

export function createFetcher({fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const cache = new Map();
  const inflight = new Map();

  async function load(url, {type, maxBytes, timeoutMs, encoding, headers, body}) {
    const signal = AbortSignal.timeout(timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        signal, redirect: 'follow', method: body == null ? 'GET' : 'POST', body,
        headers: {accept: type === 'json' ? 'application/json' : type === 'bytes' ? '*/*' : 'text/calendar, text/plain, */*', 'user-agent': 'dsh-workboard', ...headers},
      });
    } catch (error) {
      throw new FetchError(error?.name === 'TimeoutError' ? 'timeout' : 'network', String(error?.message || error));
    }
    if (!response.ok) throw new FetchError('http', `HTTP ${response.status}`);
    const bytes = await readBytes(response, maxBytes);
    if (type === 'bytes') return {type: String(response.headers.get('content-type') ?? '').split(';')[0].trim() || 'application/octet-stream', base64: bytes.toString('base64')};
    const text = new TextDecoder(encoding).decode(bytes);
    if (type !== 'json') return text;
    try { return JSON.parse(text); } catch { throw new FetchError('bad-json', 'response is not JSON'); }
  }

  return {
    async get(raw, {ttlMs, type = 'json', maxBytes = 2_000_000, timeoutMs = 10_000, encoding = 'utf-8', headers, body} = {}) {
      const url = checkUrl(raw);
      const key = `${type}\n${url}${body == null ? '' : `\n${body}`}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < ttlMs * FRESH_RATIO) return hit.value;
      if (inflight.has(key)) return inflight.get(key);
      const job = load(url, {type, maxBytes, timeoutMs, encoding, headers, body}).then(value => {
        cache.delete(key);
        cache.set(key, {at: now(), value});
        if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
        return value;
      }, error => {
        if (hit && now() - hit.at < ttlMs * STALE_FACTOR) return hit.value;
        throw error;
      }).finally(() => inflight.delete(key));
      inflight.set(key, job);
      return job;
    },
  };
}
