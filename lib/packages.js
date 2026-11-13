// 包下载量：查询 npm、PyPI 与 Crates.io 包的最新版本、周下载量与月下载量。
const TTL = 30 * 60_000;
const MAX_PACKAGES = 15;
const NPM_PKG = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const PYPI_PKG = /^[a-z0-9][\w.-]*$/i;
const CRATE_PKG = /^[a-z0-9][\w-]*$/i;

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function parsePackageSpec(line) {
  const [raw = '', ...rest] = String(line ?? '').trim().split(/\s+/);
  if (!raw) return null;
  const label = clip(rest.join(' '), 60);
  const pref = /^(npm|pypi|py|crates?|cargo|rs):(.+)$/i.exec(raw);
  const kind = pref ? pref[1].toLowerCase() : 'npm';
  const name = pref ? pref[2].trim() : raw;
  if (kind === 'npm' && NPM_PKG.test(name)) return {eco: 'npm', name, label, raw};
  if ((kind === 'pypi' || kind === 'py') && PYPI_PKG.test(name)) return {eco: 'pypi', name, label, raw};
  if (['crate', 'crates', 'cargo', 'rs'].includes(kind) && CRATE_PKG.test(name)) return {eco: 'crates', name, label, raw};
  return {eco: 'unknown', name: raw, label, raw};
}

export function parsePackageSpecs(text) {
  const seen = new Set();
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const spec = parsePackageSpec(line);
    if (!spec) continue;
    const key = `${spec.eco}:${spec.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(spec);
    if (out.length >= MAX_PACKAGES) break;
  }
  return out;
}

export function summarizeRange(days) {
  const list = Array.isArray(days) ? days.map(d => num(d?.downloads)) : [];
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const weekly = sum(list.slice(-7));
  const prev = list.length >= 14 ? sum(list.slice(-14, -7)) : 0;
  const monthly = sum(list.slice(-30));
  const pct = prev > 0 ? Math.round(((weekly - prev) / prev) * 1000) / 10 : null;
  return {weekly, monthly, pct};
}

export function createPackages(fetcher) {
  async function loadOne(spec) {
    const base = {id: `${spec.eco}:${spec.name}`, eco: spec.eco, name: spec.name, label: spec.label};
    if (spec.eco === 'unknown') return {...base, error: 'unknown package'};
    try {
      if (spec.eco === 'npm') {
        const [meta, dl] = await Promise.all([
          fetcher.get(`https://registry.npmjs.org/${spec.name}/latest`, {ttlMs: TTL, maxBytes: 1_000_000, timeoutMs: 12_000}),
          fetcher.get(`https://api.npmjs.org/downloads/range/last-month/${spec.name}`, {ttlMs: TTL, maxBytes: 500_000, timeoutMs: 12_000}).catch(() => ({downloads: []})),
        ]);
        if (!meta?.version) return {...base, error: 'not found'};
        const stats = summarizeRange(dl?.downloads);
        return {
          ...base,
          version: clip(meta.version, 40),
          desc: clip(meta.description, 200),
          ...stats,
          url: `https://www.npmjs.com/package/${spec.name}`,
        };
      }
      if (spec.eco === 'pypi') {
        const [meta, dl] = await Promise.all([
          fetcher.get(`https://pypi.org/pypi/${encodeURIComponent(spec.name)}/json`, {ttlMs: TTL, maxBytes: 2_000_000, timeoutMs: 12_000}),
          fetcher.get(`https://pypistats.org/api/packages/${encodeURIComponent(spec.name.toLowerCase())}/recent`, {ttlMs: TTL, maxBytes: 200_000, timeoutMs: 12_000}).catch(() => null),
        ]);
        const ver = meta?.info?.version;
        if (!ver) return {...base, error: 'not found'};
        return {
          ...base,
          version: clip(ver, 40),
          desc: clip(meta.info?.summary, 200),
          weekly: num(dl?.data?.last_week),
          monthly: num(dl?.data?.last_month),
          pct: null,
          url: `https://pypi.org/project/${spec.name}/`,
        };
      }
      if (spec.eco === 'crates') {
        const body = await fetcher.get(`https://crates.io/api/v1/crates/${encodeURIComponent(spec.name)}`, {ttlMs: TTL, maxBytes: 1_500_000, timeoutMs: 12_000});
        const c = body?.crate;
        const ver = c?.max_stable_version || c?.max_version;
        if (!c?.name || !ver) return {...base, error: 'not found'};
        const recent = num(c.recent_downloads);
        return {
          ...base,
          version: clip(ver, 40),
          desc: clip(c.description, 200),
          weekly: Math.round((recent * 7) / 90),
          monthly: Math.round(recent / 3),
          total: num(c.downloads),
          pct: null,
          url: `https://crates.io/crates/${spec.name}`,
        };
      }
      return {...base, error: 'unknown package'};
    } catch (error) {
      const msg = String(error?.message || error);
      return {...base, error: /HTTP 404/i.test(msg) ? 'not found' : msg};
    }
  }

  return {
    async list({packages} = {}) {
      const specs = parsePackageSpecs(packages);
      const items = await Promise.all(specs.map(loadOne));
      return {items};
    },
  };
}
