// ICS 解析与重复展开。支持 TZID / UTC / 浮动时间、全天事件、DURATION、EXDATE、RECURRENCE-ID，
// RRULE 支持 DAILY/WEEKLY/MONTHLY/YEARLY 与 INTERVAL、COUNT、UNTIL、BYDAY、BYMONTHDAY、BYMONTH；其余规则按近似处理。
const DAY = 86400_000;
const MAX_ITERATIONS = 5000;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const dtfCache = new Map();
function partsIn(ms, tz) {
  let dtf = dtfCache.get(tz);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'});
    dtfCache.set(tz, dtf);
  }
  const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

function validZone(tz) {
  if (!tz) return null;
  try { partsIn(0, tz); return tz; } catch { return null; }
}

// 把某时区的墙上时间换成 UTC 毫秒；zone 为 'UTC' 或 null（浮动时间，按本机时区）。
export function wallToUtc(w, zone) {
  const guess = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  if (zone === 'UTC') return guess;
  if (!zone) return new Date(w.y, w.m - 1, w.d, w.h, w.mi, w.s).getTime();
  let t = guess - (partsIn(guess, zone) - guess);
  const off = partsIn(t, zone) - t;
  if (guess - off !== t) t = guess - off;
  return t;
}

function unescape(v) {
  return v.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
}

function parseLine(line) {
  let i = 0;
  let quoted = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ':' && !quoted) break;
  }
  const head = line.slice(0, i).split(';');
  const params = {};
  for (const p of head.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return {name: head[0].toUpperCase(), params, value: line.slice(i + 1)};
}

function parseDate(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  const wall = {y: +y, m: +mo, d: +d, h: +(hh ?? 0), mi: +(mi ?? 0), s: +(ss ?? 0)};
  if (params.VALUE === 'DATE' || hh === undefined) return {allDay: true, wall, zone: null};
  return {allDay: false, wall, zone: z ? 'UTC' : validZone(params.TZID)};
}

function parseDuration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const ms = (+(m[2] ?? 0) * 7 + +(m[3] ?? 0)) * DAY + (+(m[4] ?? 0) * 3600 + +(m[5] ?? 0) * 60 + +(m[6] ?? 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}

function parseRule(v) {
  const r = Object.fromEntries(v.split(';').map(p => p.split('=')).filter(p => p.length === 2).map(([k, x]) => [k.toUpperCase(), x]));
  return {
    freq: r.FREQ,
    interval: Math.max(1, +(r.INTERVAL ?? 1) || 1),
    count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ?? null,
    byday: r.BYDAY ? r.BYDAY.split(',').map(x => { const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.trim()); return m ? {n: m[1] ? +m[1] : 0, wd: WEEKDAYS.indexOf(m[2])} : null; }).filter(Boolean) : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number).filter(Boolean) : null,
    bymonth: r.BYMONTH ? r.BYMONTH.split(',').map(Number).filter(Boolean) : null,
    wkst: WEEKDAYS.indexOf(r.WKST ?? 'MO'),
  };
}

export function parseICS(text) {
  const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let ev = null;
  let nested = 0;
  for (const raw of lines) {
    if (!raw) continue;
    const {name, params, value} = parseLine(raw);
    if (name === 'BEGIN') {
      if (value.toUpperCase() === 'VEVENT' && !ev) ev = {exdates: [], params: {}};
      else if (ev) nested++;
      continue;
    }
    if (name === 'END') {
      if (nested) nested--;
      else if (ev && value.toUpperCase() === 'VEVENT') { events.push(ev); ev = null; }
      continue;
    }
    if (!ev || nested) continue;
    if (name === 'UID') ev.uid = value;
    else if (name === 'SUMMARY') ev.summary = unescape(value);
    else if (name === 'LOCATION') ev.location = unescape(value);
    else if (name === 'STATUS') ev.status = value.toUpperCase();
    else if (name === 'DTSTART') ev.start = parseDate(value, params);
    else if (name === 'DTEND') ev.end = parseDate(value, params);
    else if (name === 'DURATION') ev.duration = parseDuration(value);
    else if (name === 'RRULE') ev.rule = parseRule(value);
    else if (name === 'RECURRENCE-ID') ev.recurrenceId = parseDate(value, params);
    else if (name === 'EXDATE') for (const v of value.split(',')) { const d = parseDate(v, params); if (d) ev.exdates.push(d); }
  }
  return events.filter(e => e.start);
}

const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const fromDayNum = n => { const t = new Date(n * DAY); return {y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate()}; };
const weekday = n => (n + 4) % 7; // 1970-01-01 是周四
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function nthWeekdays(y, m, {n, wd}) {
  const first = dayNum(y, m, 1);
  const len = daysInMonth(y, m);
  const all = [];
  for (let i = 0; i < len; i++) if (weekday(first + i) === wd) all.push(first + i);
  if (!n) return all;
  const pick = n > 0 ? all[n - 1] : all[all.length + n];
  return pick === undefined ? [] : [pick];
}

// 按墙上日期生成候选日（天编号），保证递增。
function* candidateDays(start, rule) {
  const s = dayNum(start.y, start.m, start.d);
  const {freq, interval} = rule;
  if (freq === 'DAILY') {
    for (let k = 0; k < MAX_ITERATIONS; k++) yield s + k * interval;
  } else if (freq === 'WEEKLY') {
    const days = rule.byday?.length ? rule.byday.map(b => b.wd) : [weekday(s)];
    const weekStart = s - ((weekday(s) - rule.wkst + 7) % 7);
    for (let k = 0; k < MAX_ITERATIONS; k++) {
      const base = weekStart + k * 7 * interval;
      const list = days.map(wd => base + ((wd - rule.wkst + 7) % 7)).sort((a, b) => a - b);
      for (const n of list) if (n >= s) yield n;
    }
  } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
    const step = freq === 'MONTHLY' ? interval : interval * 12;
    for (let k = 0; k < 1200; k++) {
      const months = freq === 'YEARLY' && rule.bymonth?.length ? rule.bymonth : [null];
      for (const bm of months) {
        const total = (start.y * 12 + start.m - 1) + k * step;
        const y = Math.floor(total / 12);
        const m = bm ?? (total % 12) + 1;
        let list;
        if (rule.byday?.length) list = rule.byday.flatMap(b => nthWeekdays(y, m, b));
        else if (rule.bymonthday?.length) list = rule.bymonthday.map(d => (d > 0 ? d : daysInMonth(y, m) + d + 1)).filter(d => d >= 1 && d <= daysInMonth(y, m)).map(d => dayNum(y, m, d));
        else list = start.d <= daysInMonth(y, m) ? [dayNum(y, m, start.d)] : [];
        for (const n of [...new Set(list)].sort((a, b) => a - b)) if (n >= s) yield n;
      }
    }
  }
}

function instant(date) {
  return date.allDay ? new Date(date.wall.y, date.wall.m - 1, date.wall.d).getTime() : wallToUtc(date.wall, date.zone);
}

function isoDate(w) {
  return `${w.y}-${String(w.m).padStart(2, '0')}-${String(w.d).padStart(2, '0')}`;
}

// 展开到 [from, to) 窗口，返回按开始时间排序的事件。
export function expandEvents(events, from, to, limit = 500) {
  const overrides = new Map();
  for (const e of events) if (e.recurrenceId && e.uid) {
    const set = overrides.get(e.uid) ?? new Set();
    set.add(instant(e.recurrenceId));
    overrides.set(e.uid, set);
  }
  const out = [];
  for (const e of events) {
    if (e.status === 'CANCELLED') continue;
    const startMs = instant(e.start);
    const duration = e.end ? instant(e.end) - startMs : e.duration ?? (e.start.allDay ? DAY : 0);
    const emit = (wall, ms) => {
      const end = ms + Math.max(0, duration);
      if (ms >= to || (end <= from && !(end === ms && ms >= from))) return;
      out.push({
        title: e.summary || '',
        location: e.location || '',
        allDay: e.start.allDay,
        start: ms,
        end,
        ...(e.start.allDay ? {date: isoDate(wall)} : {}),
      });
    };
    if (!e.rule || !e.rule.freq || e.recurrenceId) { emit(e.start.wall, startMs); continue; }
    const skip = new Set([...e.exdates.map(instant), ...(overrides.get(e.uid) ?? [])]);
    const until = e.rule.until ? (() => { const d = parseDate(e.rule.until, {}); return d ? (d.allDay ? instant(d) + DAY - 1 : instant(d)) : Infinity; })() : Infinity;
    let count = 0;
    let i = 0;
    for (const n of candidateDays(e.start.wall, e.rule)) {
      if (++i > MAX_ITERATIONS) break;
      const wall = {...e.start.wall, ...fromDayNum(n)};
      const ms = e.start.allDay ? instant({allDay: true, wall}) : wallToUtc(wall, e.start.zone);
      if (ms > until || ms >= to) break;
      if (e.rule.count !== null && count >= e.rule.count) break;
      count++;
      if (!skip.has(ms)) emit(wall, ms);
    }
  }
  out.sort((a, b) => a.start - b.start || Number(b.allDay) - Number(a.allDay));
  return out.slice(0, limit);
}
