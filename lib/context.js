// workboard_context：把工作台上的数据按 section 汇总给 Agent，只读。各 section 复用页面同一组 handler，独立容错、单独限时。
import {localMidnight} from './attention.js';

export const CONTEXT_SECTIONS = ['attention', 'calendar', 'weather', 'todos', 'habits', 'note', 'sessions', 'running', 'schedules', 'outputs', 'usage', 'git', 'github'];
const DAY = 86400_000;
const MAX_NOTE_CHARS = 4000;
const SECTION_TIMEOUT_MS = 20_000;
const OUTPUT_WINDOW_MS = 2 * DAY;
// 临时目录里的文件多是中间产物，不算交付。
const SCRATCH = /^(\/private)?\/(tmp|var\/folders)\//;

const pad = n => String(n).padStart(2, '0');
export const localIso = ms => {
  const d = new Date(ms);
  const off = -d.getTimezoneOffset();
  const abs = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}${off >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};
const dayKey = ms => localIso(ms).slice(0, 10);
const iso = ms => (ms ? localIso(ms) : undefined);
// 去掉空字段，让 Agent 读到的 JSON 短一些。
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false));
const UNAVAILABLE = {error: 'not available on this Harness'};

const WMO = [[0, 'clear'], [1, 'mainly clear'], [2, 'partly cloudy'], [3, 'overcast'], [48, 'fog'], [57, 'drizzle'], [67, 'rain'], [77, 'snow'], [82, 'rain showers'], [86, 'snow showers'], [99, 'thunderstorm']];
const weatherText = code => WMO.find(([max]) => Number(code) <= max)?.[1] ?? '';

export function streakOf(days, dayStart) {
  const done = new Set(days);
  const d = new Date(dayStart);
  if (!done.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (done.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function createContext({store, call, now = Date.now, timeoutMs = SECTION_TIMEOUT_MS}) {
  const read = {
    async attention({dayStart}) {
      const v = await call('attention.get', {dayStart});
      return v.items.map(x => clean({kind: x.kind, title: x.title, detail: x.detail, at: iso(x.at), sessionId: x.sessionId, url: x.url, todoId: x.todoId, count: x.count}));
    },
    async calendar({dayStart, days}) {
      const prefs = store.getPrefs();
      const urls = String(prefs.calendarUrls ?? '').split(/\s+/).filter(Boolean);
      const system = prefs.systemCalendar !== false;
      if (!urls.length && !system) return {events: [], note: 'no calendar configured'};
      const v = await call('calendar.events', {urls, from: dayStart, to: dayStart + days * DAY, system});
      return clean({
        events: v.events.map(e => clean({title: e.title, start: e.allDay ? e.date ?? dayKey(e.start) : iso(e.start), end: e.allDay ? undefined : iso(e.end), allDay: e.allDay, location: e.location, calendar: e.calendar})),
        system: v.system && v.system !== 'ok' ? v.system : undefined,
        errors: v.errors.length ? v.errors.map(e => `${e.url}: ${e.message}`) : undefined,
      });
    },
    async weather() {
      const prefs = store.getPrefs();
      const loc = prefs.location;
      if (!loc) return {note: 'no city set'};
      const v = await call('weather.get', {lat: loc.lat, lon: loc.lon, unit: prefs.unit});
      const deg = v.unit === 'f' ? '°F' : '°C';
      return clean({
        place: [loc.name, loc.region].filter(Boolean).join(', '),
        now: `${weatherText(v.current.code)} ${v.current.temp}${deg}, feels ${v.current.feels}${deg}`,
        today: `${v.today.lo}–${v.today.hi}${deg}`,
        aqi: v.aqi,
        next: v.hours.map(x => `${x.time} ${weatherText(x.code)} ${x.temp}${deg}`),
      });
    },
    todos({dayStart}) {
      const all = store.listTodos();
      return {
        open: all.filter(x => !x.done).map(x => clean({id: x.id, text: x.text, carriedOver: x.createdAt < dayStart, createdAt: iso(x.createdAt)})),
        doneToday: all.filter(x => x.done && x.doneAt >= dayStart).map(x => x.text),
      };
    },
    habits({dayStart}) {
      const today = dayKey(dayStart);
      return store.listHabits().map(x => ({name: x.name, doneToday: x.days.includes(today), streak: streakOf(x.days, dayStart)}));
    },
    note() {
      const n = store.getNote();
      return clean({text: n.text.slice(0, MAX_NOTE_CHARS), truncated: n.text.length > MAX_NOTE_CHARS, updatedAt: iso(n.updatedAt)});
    },
    async sessions() {
      const list = await call('session.list');
      if (!list) return UNAVAILABLE;
      return list.slice(0, 10).map(s => clean({id: s.id, title: s.title, cwd: s.cwd, waiting: s.waiting, running: s.running, updatedAt: iso(s.updatedAt)}));
    },
    async running() {
      const v = await call('running.get');
      if (!v.goals && !v.jobs) return UNAVAILABLE;
      return {
        goals: (v.goals ?? []).map(g => clean({objective: g.objective, phase: g.phase, blockedReason: g.reason, sessionId: g.sessionId, session: g.title})),
        jobs: (v.jobs ?? []).map(j => clean({label: j.label || j.kind, status: j.status, progress: j.progress, sessionId: j.sessionId, startedAt: iso(j.startedAt), finishedAt: iso(j.finishedAt)})),
      };
    },
    async schedules() {
      const list = await call('schedule.list');
      if (!list) return UNAVAILABLE;
      return list.filter(x => x.status === 'active').slice(0, 20).map(x => clean({id: x.id, title: x.title, next: iso(x.scheduledAt), running: x.running, lastRun: iso(x.lastAt)}));
    },
    async outputs() {
      const v = await call('outputs.list', {});
      const since = now() - OUTPUT_WINDOW_MS;
      return v.items.filter(x => x.exists && x.time >= since && !SCRATCH.test(x.path)).slice(0, 15)
        .map(x => clean({name: x.name, path: x.path, kind: x.kind, description: x.description, at: iso(x.time), sessionId: x.sessionId}));
    },
    async usage() {
      const v = await call('usage.get', {days: 7});
      const tokens = r => r.input + r.output + r.cacheRead + r.cacheWrite;
      const byDay = new Map();
      const byModel = new Map();
      for (const r of v.rows) {
        const d = byDay.get(r.day) ?? {day: r.day, requests: 0, tokens: 0};
        d.requests += r.requests;
        d.tokens += tokens(r);
        byDay.set(r.day, d);
        const key = `${r.provider}/${r.model}`;
        const m = byModel.get(key) ?? {model: key, requests: 0, tokens: 0};
        m.requests += r.requests;
        m.tokens += tokens(r);
        byModel.set(key, m);
      }
      return {
        today: byDay.get(v.today) ?? {day: v.today, requests: 0, tokens: 0},
        last7Days: [...byDay.values()],
        topModels: [...byModel.values()].sort((a, b) => b.tokens - a.tokens || b.requests - a.requests).slice(0, 5),
        note: 'tokens include cache reads; some providers do not report usage, so requests may exceed reported tokens',
      };
    },
    async git() {
      const {repos} = await call('git.status', {});
      const busy = repos.filter(r => r.error || r.conflicts || r.changed || r.untracked || r.ahead || r.behind || r.gone?.length);
      return {
        cleanRepos: repos.length - busy.length,
        needsAttention: busy.map(r => clean({name: r.name, path: r.path, branch: r.branch, error: r.error, ahead: r.ahead || undefined, behind: r.behind || undefined,
          changed: r.changed || undefined, untracked: r.untracked || undefined, conflicts: r.conflicts || undefined, goneBranches: r.gone?.length ? r.gone : undefined})),
      };
    },
    async github() {
      const v = await call('github.get', {});
      const row = x => clean({title: x.title, ref: `${x.repo}#${x.number}`, url: x.url, author: x.author, draft: x.draft, updatedAt: iso(x.updatedAt)});
      return {reviewRequested: v.review.slice(0, 10).map(row), myPullRequests: v.mine.slice(0, 10).map(row), assignedIssues: v.assigned.slice(0, 10).map(row)};
    },
  };

  const limited = (job, name) => {
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve({error: `${name} timed out`}), timeoutMs); });
    return Promise.race([job, timeout]).finally(() => clearTimeout(timer));
  };

  return async ({sections, days} = {}) => {
    const wanted = Array.isArray(sections) && sections.length ? CONTEXT_SECTIONS.filter(s => sections.includes(s)) : CONTEXT_SECTIONS;
    const span = Math.min(Math.max(Math.floor(Number(days) || 2), 1), 7);
    const ms = now();
    const dayStart = localMidnight(ms);
    const out = {now: localIso(ms), weekday: new Date(ms).toLocaleDateString('en-US', {weekday: 'long'}), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone};
    const results = await Promise.all(wanted.map(name => limited(
      Promise.resolve().then(() => read[name]({dayStart, days: span})).catch(error => ({error: String(error?.message || error)})),
      name,
    )));
    wanted.forEach((name, i) => { out[name] = results[i]; });
    return out;
  };
}
