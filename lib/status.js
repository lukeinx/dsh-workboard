// 服务状态：Atlassian Statuspage 及兼容实现（incident.io 等）读 /api/v2/summary.json；
// DeepSeek 的状态页托管在 Flashcat，没有公开 JSON 接口，从页面内嵌的 Next.js 数据里取组件与进行中的事件。
// 统一成 {name, url, level, description, components: [{name, status}], incidents: [{title, status, url, at}]}。
const TTL = 2 * 60_000;
const MAX_SOURCES = 12;
const MAX_COMPONENTS = 20;
const LEVELS = ['none', 'maintenance', 'minor', 'major', 'critical'];
const worst = list => list.reduce((a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a), 'none');

// 每行「名称 地址」或只写地址；地址可以是状态页首页，也可以直接是 summary.json。
export function parseSources(raw) {
  const out = [];
  for (const line of String(raw ?? '').split('\n')) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    const at = parts.findIndex(p => /^https?:\/\//i.test(p));
    if (at < 0) continue;
    let url;
    try { url = new URL(parts[at]); } catch { continue; }
    const name = [...parts.slice(0, at), ...parts.slice(at + 1)].join(' ') || url.hostname.replace(/^(www|status)\./, '');
    out.push({name, page: url.origin, kind: /(^|\.)status\.deepseek\.com$/.test(url.hostname) ? 'flashcat' : 'statuspage'});
  }
  return out.slice(0, MAX_SOURCES);
}

const COMPONENT_LEVEL = {operational: 'none', under_maintenance: 'maintenance', degraded_performance: 'minor', partial_outage: 'major', major_outage: 'critical'};
const IMPACT_LEVEL = {none: 'none', maintenance: 'maintenance', minor: 'minor', major: 'major', critical: 'critical'};

export function parseSummary(d) {
  if (!d || typeof d !== 'object' || !d.status) throw new Error('not a Statuspage summary');
  const groups = new Set((d.components ?? []).filter(c => c?.group).map(c => c.id));
  const components = (d.components ?? [])
    .filter(c => c?.name && !groups.has(c.id) && c.status && c.status !== 'operational')
    .map(c => ({name: String(c.name), status: COMPONENT_LEVEL[c.status] ?? 'minor'}));
  const active = [
    ...(d.incidents ?? []).filter(i => i && i.status !== 'resolved' && i.status !== 'postmortem'),
    ...(d.scheduled_maintenances ?? []).filter(i => i && i.status === 'in_progress'),
  ];
  const incidents = active.map(i => ({
    title: String(i.name ?? ''), status: IMPACT_LEVEL[i.impact] ?? 'minor', url: /^https?:\/\//.test(i.shortlink ?? '') ? i.shortlink : '',
    at: Date.parse(i.updated_at ?? i.created_at ?? '') || 0,
  }));
  const level = IMPACT_LEVEL[d.status.indicator] ?? worst([...components.map(c => c.status), ...incidents.map(i => i.status)]);
  return {level, description: String(d.status.description ?? ''), components: components.slice(0, MAX_COMPONENTS), incidents: incidents.slice(0, MAX_COMPONENTS)};
}

// Next.js App Router 把服务端数据分段写在 self.__next_f.push([1,"..."]) 里，拼起来后每行是「id:JSON」。
export function nextFlight(html) {
  let flight = '';
  for (const m of String(html).matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try { flight += JSON.parse(m[1]); } catch {}
  }
  return flight;
}

function findPageData(flight) {
  for (const line of flight.split('\n')) {
    if (!line.includes('"active_changes"')) continue;
    let value;
    try { value = JSON.parse(line.slice(line.indexOf(':') + 1)); } catch { continue; }
    const stack = [value];
    while (stack.length) {
      const v = stack.pop();
      if (!v || typeof v !== 'object') continue;
      if (Array.isArray(v.active_changes) && Array.isArray(v.page?.components)) return v;
      stack.push(...Object.values(v));
    }
  }
  return null;
}

const FLASHCAT_LEVEL = {operational: 'none', maintenance: 'maintenance', degraded: 'minor', partial_outage: 'major', full_outage: 'critical'};
// 名称形如「对话服务(Chat Service)」；中文界面取括号前，英文取括号内。
export const bilingual = (name, lang) => {
  const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(String(name ?? '').trim());
  if (!m || !/[\u4e00-\u9fff]/.test(m[1])) return String(name ?? '').trim();
  return String(lang ?? '').startsWith('zh') ? m[1] : m[2];
};

export function parseFlashcat(html, lang) {
  const data = findPageData(nextFlight(html));
  if (!data) throw new Error('status data not found in page');
  const names = new Map(data.page.components.map(c => [c.component_id, bilingual(c.name, lang)]));
  const byComponent = new Map();
  const incidents = [];
  for (const change of data.active_changes) {
    const levels = [];
    for (const c of change?.components ?? []) {
      const level = change.type === 'maintenance' ? 'maintenance' : FLASHCAT_LEVEL[c?.status] ?? 'minor';
      levels.push(level);
      const id = c?.component_id;
      if (id) byComponent.set(id, worst([byComponent.get(id) ?? 'none', level]));
    }
    incidents.push({title: bilingual(change?.title, lang), status: worst(levels.length ? levels : [change?.type === 'maintenance' ? 'maintenance' : 'minor']), url: '', at: Number(change?.start_at_seconds) * 1000 || 0});
  }
  const components = [...byComponent].filter(([, s]) => s !== 'none').map(([id, status]) => ({name: names.get(id) ?? id, status}));
  return {level: worst([...components.map(c => c.status), ...incidents.map(i => i.status)]), description: '', components, incidents};
}

export function createStatus(fetcher) {
  const one = async (src, lang) => {
    const base = {name: src.name, url: src.page};
    try {
      if (src.kind === 'flashcat') {
        const html = await fetcher.get(`${src.page}/`, {ttlMs: TTL, type: 'text', maxBytes: 3_000_000, timeoutMs: 12_000});
        return {...base, ...parseFlashcat(html, lang)};
      }
      const d = await fetcher.get(`${src.page}/api/v2/summary.json`, {ttlMs: TTL, maxBytes: 1_500_000, timeoutMs: 12_000});
      return {...base, ...parseSummary(d)};
    } catch (error) {
      return {...base, error: String(error?.message || error)};
    }
  };
  return {
    async list({sources, lang}) {
      return {items: await Promise.all(parseSources(sources).map(s => one(s, lang)))};
    },
  };
}
