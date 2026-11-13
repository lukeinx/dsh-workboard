// 热门 MCP：聚合 npm 高下载量 MCP 包、GitHub 高星 MCP 仓库与官方 MCP Registry 最新上架服务。
const TTL = 30 * 60_000;
const LIMIT = 30;
const NPM_API = 'https://registry.npmjs.org/-/v1/search';
const GH_API = 'https://api.github.com/search/repositories';
const REG_API = 'https://registry.modelcontextprotocol.io/v0/servers?version=latest&limit=80';

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const safeUrl = raw => {
  try {
    const u = new URL(String(raw ?? '').trim().replace(/^git\+/i, '').replace(/\.git$/i, ''));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
};

export function parseNpmMcps(body) {
  const list = Array.isArray(body?.objects) ? body.objects : [];
  return list.map(x => {
    const p = x?.package;
    if (!p?.name || p.name === 'mcp-server') return null;
    const weekly = num(x?.downloads?.weekly);
    const monthly = num(x?.downloads?.monthly);
    return {
      id: clip(p.name, 120),
      name: clip(p.name, 120),
      version: clip(p.version, 40),
      desc: clip(p.description, 240),
      publisher: clip(p.publisher?.username, 60),
      weekly,
      monthly,
      url: safeUrl(p.links?.npm) || `https://www.npmjs.com/package/${p.name}`,
      repo: safeUrl(p.links?.repository || p.links?.homepage),
    };
  }).filter(Boolean).sort((a, b) => b.weekly - a.weekly || b.monthly - a.monthly).slice(0, LIMIT);
}

export function parseGithubMcps(body) {
  const list = Array.isArray(body?.items) ? body.items : [];
  return list.filter(r => r?.full_name && /^https:\/\/github\.com\//.test(r.html_url ?? '') && !/awesome-mcp/i.test(r.name ?? '')).map(r => ({
    id: clip(r.full_name, 120),
    name: clip(r.full_name, 120),
    desc: clip(r.description, 240),
    stars: num(r.stargazers_count),
    lang: clip(r.language, 30),
    url: r.html_url,
    at: Date.parse(r.pushed_at ?? r.updated_at ?? '') || 0,
  })).sort((a, b) => b.stars - a.stars).slice(0, LIMIT);
}

export function parseRegistryMcps(body, query = '') {
  const list = Array.isArray(body?.servers) ? body.servers : [];
  const q = clip(query, 60).toLowerCase();
  const seen = new Set();
  return list.map(x => {
    const s = x?.server;
    if (!s?.name || seen.has(s.name)) return null;
    seen.add(s.name);
    const meta = x?._meta?.['io.modelcontextprotocol.registry/official'];
    const title = clip(s.title || s.name, 100);
    const desc = clip(s.description, 240);
    if (q && !`${s.name} ${title} ${desc}`.toLowerCase().includes(q)) return null;
    return {
      id: clip(s.name, 120),
      name: title,
      slug: s.title && s.title !== s.name ? clip(s.name, 80) : '',
      version: clip(s.version, 40),
      desc,
      url: safeUrl(s.repository?.url || s.websiteUrl || s.remotes?.[0]?.url) || 'https://registry.modelcontextprotocol.io',
      at: Date.parse(meta?.updatedAt ?? meta?.publishedAt ?? '') || 0,
    };
  }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, LIMIT);
}

export function createMcps(fetcher) {
  return {
    async list({kind = 'popular', query = ''} = {}) {
      const q = clip(query, 60);
      if (kind === 'popular') {
        const text = q ? `mcp-server ${q}` : 'mcp-server';
        const url = `${NPM_API}?text=${encodeURIComponent(text)}&popularity=1.0&quality=0.5&maintenance=0.5&size=45`;
        return {kind, items: parseNpmMcps(await fetcher.get(url, {ttlMs: TTL, maxBytes: 2_000_000, timeoutMs: 12_000}))};
      }
      if (kind === 'github') {
        const search = q ? `${q} mcp-server in:name,description,topics` : 'mcp-server in:name stars:>20';
        const url = `${GH_API}?q=${encodeURIComponent(search)}&sort=stars&order=desc&per_page=35`;
        return {kind, items: parseGithubMcps(await fetcher.get(url, {ttlMs: TTL, maxBytes: 2_000_000, timeoutMs: 12_000}))};
      }
      if (kind === 'registry') {
        return {kind, items: parseRegistryMcps(await fetcher.get(REG_API, {ttlMs: TTL, maxBytes: 3_000_000, timeoutMs: 12_000}), q)};
      }
      throw new Error(`unknown mcp list ${kind}`);
    },
  };
}
