// 网络：默认路由的网卡与内网 IP、实时上下行速率、系统代理、出口 IP 与归属地、到几个站点的延迟。
// 出口 IP 和延迟用 curl：系统代理开启时经代理访问，和浏览器看到的一致（Node 自带的 fetch 不走系统代理）。
import {networkInterfaces, platform} from 'node:os';
import {readFile} from 'node:fs/promises';
import {text} from './exec.js';

const SAMPLE_MS = 2000;
const RING = 60;
const IDLE_MS = 60_000;
const PROXY_TTL = 15_000;
const IP_TTL = 5 * 60_000;
const PING_TTL = 30_000;
const MAX_TARGETS = 6;

export function parseRoute(out) {
  return {iface: /interface:\s*(\S+)/.exec(out)?.[1] ?? '', gateway: /gateway:\s*(\S+)/.exec(out)?.[1] ?? ''};
}

export function parseIpRoute(out) {
  const m = /default via (\S+) dev (\S+)/.exec(out);
  return {iface: m?.[2] ?? '', gateway: m?.[1] ?? ''};
}

// netstat -ibn 里同一网卡有多行，取 <Link#n> 那行：列为 Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll。
export function parseNetstat(out, iface) {
  for (const line of out.split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (cols[0] !== iface || !cols[2]?.startsWith('<Link')) continue;
    const shift = cols.length === 11 ? 0 : -1;
    const rx = Number(cols[6 + shift]);
    const tx = Number(cols[9 + shift]);
    if (Number.isFinite(rx) && Number.isFinite(tx)) return {rx, tx};
  }
  return null;
}

export function parseProcNetDev(out, iface) {
  const line = out.split('\n').find(l => l.trim().startsWith(`${iface}:`));
  if (!line) return null;
  const cols = line.split(':')[1].trim().split(/\s+/).map(Number);
  return Number.isFinite(cols[0]) && Number.isFinite(cols[8]) ? {rx: cols[0], tx: cols[8]} : null;
}

export function parseScutilProxy(out) {
  const get = key => new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'm').exec(out)?.[1]?.trim() ?? '';
  const on = key => get(`${key}Enable`) === '1';
  const pick = key => (on(key) && get(`${key}Proxy`) ? {host: get(`${key}Proxy`), port: Number(get(`${key}Port`)) || null} : null);
  return {
    http: pick('HTTP'),
    https: pick('HTTPS'),
    socks: pick('SOCKS'),
    pac: get('ProxyAutoConfigEnable') === '1' ? get('ProxyAutoConfigURLString') || 'PAC' : '',
  };
}

export function parseTargets(raw) {
  return String(raw ?? '').split('\n').map(line => {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    const url = parts.find(p => /^https?:\/\//i.test(p));
    if (!url) return null;
    const name = parts.filter(p => p !== url).join(' ') || new URL(url).hostname.replace(/^www\./, '');
    return {name, url};
  }).filter(Boolean).slice(0, MAX_TARGETS);
}

const proxyUrl = proxy => {
  const p = proxy?.https ?? proxy?.http;
  if (p) return `http://${p.host}${p.port ? `:${p.port}` : ''}`;
  if (proxy?.socks) return `socks5h://${proxy.socks.host}${proxy.socks.port ? `:${proxy.socks.port}` : ''}`;
  return '';
};

export function createNetwork({run, os = platform(), now = Date.now, interfaces = networkInterfaces} = {}) {
  const ring = [];
  let prev = null;
  let timer = null;
  let lastAsk = 0;
  let route = {at: 0, value: {iface: '', gateway: ''}};
  let proxy = {at: 0, value: null};
  const ipCache = new Map();
  const pingCache = new Map();
  let job = null;

  async function readRoute() {
    if (route.at && now() - route.at < PROXY_TTL) return route.value;
    let value = {iface: '', gateway: ''};
    try {
      if (os === 'darwin') value = parseRoute(text(await run('route', ['-n', 'get', 'default'], {timeoutMs: 2000})));
      else if (os === 'linux') value = parseIpRoute(text(await run('ip', ['route', 'show', 'default'], {timeoutMs: 2000})));
    } catch {}
    route = {at: now(), value};
    return value;
  }

  async function readCounters(iface) {
    if (!iface) return null;
    try {
      if (os === 'darwin') return parseNetstat(text(await run('netstat', ['-ibn', '-I', iface], {timeoutMs: 2000})), iface);
      if (os === 'linux') return parseProcNetDev(await readFile('/proc/net/dev', 'utf8'), iface);
    } catch {}
    return null;
  }

  async function readProxy() {
    if (proxy.at && now() - proxy.at < PROXY_TTL) return proxy.value;
    let value = null;
    try {
      if (os === 'darwin') value = parseScutilProxy(text(await run('scutil', ['--proxy'], {timeoutMs: 2000})));
    } catch {}
    const env = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy || '';
    value = {...(value ?? {http: null, https: null, socks: null, pac: ''}), env: env.replace(/\/\/[^@/]*@/, '//')};
    proxy = {at: now(), value};
    return value;
  }

  async function sample() {
    const {iface} = await readRoute();
    const cur = await readCounters(iface);
    if (!cur) { prev = null; return; }
    const at = now();
    if (prev && prev.iface === iface && at > prev.at) {
      const dt = (at - prev.at) / 1000;
      ring.push([Math.max(0, (cur.rx - prev.rx) / dt), Math.max(0, (cur.tx - prev.tx) / dt)]);
      if (ring.length > RING) ring.splice(0, ring.length - RING);
    }
    prev = {...cur, iface, at};
  }
  const sampleOnce = () => (job ??= sample().finally(() => { job = null; }));
  const tick = () => {
    if (now() - lastAsk > IDLE_MS) { clearInterval(timer); timer = null; ring.length = 0; prev = null; return; }
    void sampleOnce();
  };

  const curl = (args, via) => run('curl', ['-s', '--max-time', '6', ...(via ? ['-x', via] : ['--noproxy', '*']), ...args], {timeoutMs: 8000, maxBuffer: 200_000});

  async function publicIp(via, fresh) {
    const key = via || 'direct';
    const hit = ipCache.get(key);
    if (!fresh && hit && now() - hit.at < IP_TTL) return hit.value;
    let value;
    try {
      const info = JSON.parse(text(await curl(['-H', 'accept: application/json', 'https://ipinfo.io/json'], via)));
      if (!info?.ip) throw new Error('no ip');
      value = {ip: String(info.ip), city: String(info.city ?? ''), region: String(info.region ?? ''), country: String(info.country ?? ''), org: String(info.org ?? '').replace(/^AS\d+\s+/, '')};
    } catch {
      try {
        const info = JSON.parse(text(await curl(['https://api.ip.sb/geoip'], via)));
        value = info?.ip ? {ip: String(info.ip), city: String(info.city ?? ''), region: String(info.region ?? ''), country: String(info.country_code ?? ''), org: String(info.isp ?? info.organization ?? '')} : {error: 'unavailable'};
      } catch (error) {
        value = {error: error?.code === 'not-found' ? 'curl-missing' : 'unavailable'};
      }
    }
    ipCache.set(key, {at: now(), value});
    return value;
  }

  async function ping(target, via, fresh) {
    const key = `${via}\n${target.url}`;
    const hit = pingCache.get(key);
    if (!fresh && hit && now() - hit.at < PING_TTL) return hit.value;
    let value;
    try {
      const out = text(await curl(['-o', '/dev/null', '-I', '-w', '%{http_code} %{time_total}', target.url], via));
      const [code, total] = out.trim().split(/\s+/);
      value = Number(code) > 0 ? {ms: Math.round(Number(total) * 1000), status: Number(code)} : {error: 'failed'};
    } catch (error) {
      value = {error: error?.code === 'not-found' ? 'curl-missing' : 'failed'};
    }
    pingCache.set(key, {at: now(), value});
    return value;
  }

  return {
    async get({targets, fresh = false} = {}) {
      lastAsk = now();
      if (!run) return {iface: '', addresses: [], gateway: '', rates: [], proxy: null, ip: null, pings: []};
      await sampleOnce();
      if (!timer) { timer = setInterval(tick, SAMPLE_MS); timer.unref?.(); }
      const {iface, gateway} = await readRoute();
      const addresses = (interfaces()[iface] ?? []).filter(a => !a.internal).sort((a, b) => Number(a.family !== 'IPv4') - Number(b.family !== 'IPv4')).map(a => ({address: a.address, family: a.family}));
      const px = await readProxy();
      const via = proxyUrl(px);
      const list = parseTargets(targets);
      const [ip, pings] = await Promise.all([publicIp(via, fresh), Promise.all(list.map(async t => ({...t, ...await ping(t, via, fresh)})))]);
      return {iface, gateway, addresses, rates: ring.slice(), sampleMs: SAMPLE_MS, proxy: px, via: via.replace(/^\w+:\/\//, ''), ip, pings};
    },
    stop() { clearInterval(timer); timer = null; },
  };
}
