// 系统日历：macOS 上用 osascript 跑 JXA 调 EventKit，读取「日历」App 里已同步的所有账户。
// 读取不会弹授权框；只有用户在卡片上点「连接」时才请求授权。
import {platform} from 'node:os';
import {text} from './exec.js';

const TTL = 60_000;
const MAX_EVENTS = 500;

// EKAuthorizationStatus：0 未决定，1 受限，2 拒绝，3 完全访问（旧系统为已授权），4 仅写入。
export const SCRIPT = `ObjC.import('EventKit');
function status() { return Number($.EKEventStore.authorizationStatusForEntityType($.EKEntityTypeEvent)); }
function run(argv) {
  const store = $.EKEventStore.alloc.init;
  if (argv[0] === 'request') {
    if (status() === 0) {
      const done = () => {};
      if (store.respondsToSelector('requestFullAccessToEventsWithCompletion:')) store.requestFullAccessToEventsWithCompletion(done);
      else store.requestAccessToEntityTypeCompletion($.EKEntityTypeEvent, done);
      const until = Date.now() + 55000;
      while (status() === 0 && Date.now() < until) $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));
    }
    return JSON.stringify({status: status()});
  }
  if (status() !== 3) return JSON.stringify({status: status()});
  const from = $.NSDate.dateWithTimeIntervalSince1970(Number(argv[1]) / 1000);
  const to = $.NSDate.dateWithTimeIntervalSince1970(Number(argv[2]) / 1000);
  const list = store.eventsMatchingPredicate(store.predicateForEventsWithStartDateEndDateCalendars(from, to, $()));
  const events = [];
  for (let i = 0; i < list.count && events.length < ${MAX_EVENTS}; i++) {
    const e = list.objectAtIndex(i);
    if (Number(e.status) === 3) continue;
    events.push({title: ObjC.unwrap(e.title) || '', location: ObjC.unwrap(e.location) || '', allDay: Boolean(e.allDay),
      start: Math.round(e.startDate.timeIntervalSince1970 * 1000), end: Math.round(e.endDate.timeIntervalSince1970 * 1000),
      calendar: String(ObjC.unwrap(e.calendar.title) || '').trim()});
  }
  return JSON.stringify({status: 3, events});
}`;

const STATES = {0: 'ask', 3: 'ok'};
export const state = code => STATES[code] ?? 'denied';

const pad = n => String(n).padStart(2, '0');
const localDate = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function parseOutput(raw) {
  const out = JSON.parse(text(raw).trim() || '{}');
  const status = state(Number(out.status));
  if (status !== 'ok') return {status, events: []};
  const events = (Array.isArray(out.events) ? out.events : [])
    .filter(e => Number.isFinite(e?.start) && Number.isFinite(e?.end))
    .map(e => ({title: String(e.title ?? ''), location: String(e.location ?? ''), allDay: Boolean(e.allDay), start: e.start, end: Math.max(e.start, e.end),
      calendar: String(e.calendar ?? ''), ...(e.allDay ? {date: localDate(e.start)} : {})}));
  return {status, events};
}

export function createSystemCalendar({run, os = platform(), now = Date.now} = {}) {
  const cache = new Map();
  let asking = null;
  const supported = os === 'darwin' && Boolean(run);

  async function events({from, to}) {
    if (!supported) return {status: 'unsupported', events: []};
    const key = `${from}:${to}`;
    const hit = cache.get(key);
    if (hit && (hit.job || now() - hit.at < TTL)) return hit.job ?? hit.value;
    const job = run('osascript', ['-l', 'JavaScript', '-e', SCRIPT, 'list', String(from), String(to)], {timeoutMs: 15_000})
      .then(parseOutput, error => ({status: 'error', events: [], message: String(error?.message || error)}));
    cache.set(key, {job, at: 0});
    const value = await job;
    if (cache.size > 20) cache.clear();
    cache.set(key, {value, at: now()});
    return value;
  }

  async function connect() {
    if (!supported) return {status: 'unsupported'};
    asking ??= run('osascript', ['-l', 'JavaScript', '-e', SCRIPT, 'request'], {timeoutMs: 60_000})
      .then(raw => ({status: state(Number(JSON.parse(text(raw).trim() || '{}').status))}))
      .finally(() => { asking = null; cache.clear(); });
    return asking;
  }

  return {supported, events, connect};
}
