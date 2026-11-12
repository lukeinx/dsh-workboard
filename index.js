// Host 端：/api/dsh-workboard/* 路由、看板 / 待办 / 速记存储、天气与日历代理、Agent 工具。
import {FetchError, createFetcher} from './lib/http.js';
import {getWeather, searchPlaces} from './lib/weather.js';
import {parseICS, expandEvents} from './lib/ics.js';
import {parseFeed} from './lib/feed.js';
import {createUsage} from './lib/usage.js';
import {createRunner} from './lib/exec.js';
import {createSystemCalendar} from './lib/syscal.js';
import {repoStatus, fetchRepo} from './lib/git.js';
import {githubOverview} from './lib/github.js';
import {createSystem} from './lib/system.js';
import {createPhotos} from './lib/photo.js';
import {createMarket} from './lib/market.js';
import {createTrending} from './lib/trending.js';
import {createQuotes} from './lib/quote.js';
import {createMediaRemote, createNowPlaying} from './lib/nowplaying.js';
import {createVideos} from './lib/videos.js';
import {MAX_WIDGETS, WidgetError, allowedUrl, checkHtml, cleanData, cleanSpec, packWidget, unpackWidget, widgetId} from './lib/widgets.js';
import {createHash, randomUUID} from 'node:crypto';
import {homedir, platform, tmpdir} from 'node:os';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createOutputs} from './lib/outputs.js';
import {createRecentFiles, isRisky} from './lib/files.js';
import {createClipboard} from './lib/clipboard.js';
import {createNetwork} from './lib/network.js';
import {createAttention} from './lib/attention.js';
import {stat} from 'node:fs/promises';
import {isAbsolute, join} from 'node:path';

export const name = 'dsh-workboard';
export const inject = ['connection'];

const NS = 'dsh-workboard';
// storageDomain 的域名与表名必须匹配 /^[a-z][a-z0-9_]*$/。
const DOMAIN = 'dsh_workboard';
// 按顺序尝试，复制成功一个即停：dsh-desk 时期在前，更早的 dsh-bento 在后。
const LEGACY_DOMAINS = ['dsh_desk', 'dsh_bento'];
const NOTE_KEY = 'inbox';
const DONE_KEEP_MS = 7 * 86400_000;
const MAX_TEXT = 2000;
const MAX_NOTE = 200_000;

// storageDomain 要求 zod schema；插件不带 zod 依赖，用只实现 safeParse/parse 的透传对象，校验在本文件里做。
const passthrough = {safeParse: data => ({success: true, data}), parse: data => data};
const TABLES = ['boards', 'todos', 'notes', 'prefs', 'habits', 'inbox', 'reads', 'widgets'];
const ICS_TTL = 15 * 60_000;
const ICS_MAX_BYTES = 5_000_000;
const FEED_TTL = 15 * 60_000;
const FEED_MAX_BYTES = 3_000_000;
const MAX_RANGE = 62 * 86400_000;
const MAX_BOARDS = 12;
const MAX_HABITS = 30;
const HABIT_DAYS_KEPT = 400;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INBOX = 200;
const MAX_INBOX_TEXT = 4000;
const READ_KEEP_MS = 90 * 86400_000;
const MAX_READS = 5000;
const MAX_READ_BATCH = 200;
const MAX_PROMPT = 20_000;
const WIDGET_FETCH_TTL = 30_000;
const MAX_WIDGET_ERROR = 2000;
// 自定义 widget 在 workboard.widget slot 里的 id 前缀；与 client.js 一致。
export const CUSTOM_PREFIX = 'custom.';

export const BUILTIN_WIDGETS = [
  'workboard.today', 'workboard.todo', 'workboard.note', 'workboard.calendar', 'workboard.weather', 'workboard.clock',
  'workboard.quote', 'workboard.countdown', 'workboard.worldclock', 'workboard.focus', 'workboard.links', 'workboard.progress',
  'workboard.agents', 'workboard.feed', 'workboard.habits',
  'workboard.prompt', 'workboard.inbox', 'workboard.usage', 'workboard.running', 'workboard.git', 'workboard.github', 'workboard.system', 'workboard.photo', 'workboard.market', 'workboard.trending',
  'workboard.outputs', 'workboard.schedules', 'workboard.pinned', 'workboard.files', 'workboard.clipboard', 'workboard.network',
  'workboard.nowplaying', 'workboard.ambient', 'workboard.videos', 'workboard.attention',
];

export function defaultBoard(id) {
  return {
    apiVersion: 1, id, title: '',
    widgets: [
      {id: 'workboard.today', size: 'bar'}, {id: 'workboard.todo', size: 'l'}, {id: 'workboard.trending', size: 'l'},
      {id: 'workboard.usage', size: 's'}, {id: 'workboard.focus', size: 's'}, {id: 'workboard.prompt', size: 'm'},
      {id: 'workboard.outputs', size: 't'}, {id: 'workboard.photo', size: 'l'}, {id: 'workboard.clipboard', size: 't'},
      {id: 'workboard.calendar', size: 'm'}, {id: 'workboard.countdown', size: 's'}, {id: 'workboard.habits', size: 'm'},
      {id: 'workboard.progress', size: 'm'}, {id: 'workboard.videos', size: 'l'}, {id: 'workboard.system', size: 't'},
      {id: 'workboard.network', size: 't'}, {id: 'workboard.nowplaying', size: 's'},
    ],
    known: BUILTIN_WIDGETS,
  };
}

function memoryTable() {
  const map = new Map();
  return {
    get: key => map.get(key),
    entries: () => map.entries(),
    put: async (key, value) => { map.set(key, value); },
    delete: async key => map.delete(key),
  };
}

const legacyWidgetId = id => (typeof id === 'string' ? id.replace(/^(bento|desk)\./, 'workboard.') : id);
// 旧版自定义 widget 的沙箱全局对象叫 desk；只改写它的成员访问和 window.desk，不碰同名的 class 或文案。
const legacyWidgetHtml = html => (typeof html === 'string'
  ? html.replace(/(?<![\w$.])desk(?=\s*(?:\?\.|\.|\[))|(?<=\bwindow\.)desk\b/g, 'workboard')
  : html);

const legacyRecord = (t, value) => {
  if (!value || typeof value !== 'object') return value;
  if (t === 'boards') return {...value, widgets: (value.widgets ?? []).map(w => ({...w, id: legacyWidgetId(w?.id)})), known: (value.known ?? []).map(legacyWidgetId)};
  if (t === 'widgets') return {...value, html: legacyWidgetHtml(value.html)};
  return value;
};

// 仅在新域为空时复制旧域的数据；JSON 后端只在写入时落盘，打开不存在的旧域不会留下空文件。
export async function migrateLegacy(domain, legacy) {
  try {
    if (TABLES.some(t => [...domain.table(t).entries()].length)) return false;
    let copied = false;
    for (const t of TABLES) {
      for (const [key, value] of legacy.table(t).entries()) {
        const record = legacyRecord(t, value);
        await domain.table(t).put(key, record);
        copied = true;
      }
    }
    return copied;
  } finally {
    await legacy.close();
  }
}

export function createStore(ctx) {
  let domain = null;
  const memory = Object.fromEntries(TABLES.map(t => [t, memoryTable()]));
  const state = {backend: 'memory', error: null};
  const table = name => (domain ? domain.table(name) : memory[name]);

  const ready = (async () => {
    const facility = ctx.get?.('storageDomain');
    if (!facility) { state.error = 'storageDomain unavailable'; return; }
    const spec = name => ({name, version: 1, tables: Object.fromEntries(TABLES.map(t => [t, {valueSchema: passthrough}]))});
    try {
      domain = await facility.open(spec(DOMAIN));
      state.backend = 'storageDomain';
    } catch (error) {
      state.error = String(error?.message || error);
      return;
    }
    try {
      for (const name of LEGACY_DOMAINS) if (await migrateLegacy(domain, await facility.open(spec(name)))) break;
    } catch (error) {
      state.error = `legacy migration failed: ${error?.message || error}`;
    }
  })();

  const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const cleanText = text => {
    const value = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!value) throw new UserError('empty-text', 'text is required');
    return value.slice(0, MAX_TEXT);
  };
  const readKey = url => createHash('sha1').update(url).digest('hex').slice(0, 24);
  const readUrls = urls => (Array.isArray(urls) ? urls : []).map(u => String(u ?? '').trim()).filter(u => u && u.length <= 2048).slice(0, MAX_READ_BATCH);
  const pruneReads = async now => {
    const all = [...table('reads').entries()].sort((a, b) => b[1].at - a[1].at);
    for (const [key] of all.filter(([, v], i) => i >= MAX_READS || now - v.at > READ_KEEP_MS)) await table('reads').delete(key);
  };
  const requireTodo = id => {
    const todo = table('todos').get(String(id));
    if (!todo) throw new UserError('not-found', `no todo with id ${id}`);
    return todo;
  };

  return {
    state,
    ready,
    close: async () => { await ready; await domain?.close(); },

    getBoard: id => table('boards').get(id) ?? defaultBoard(id),
    listBoards() {
      const stored = new Map(table('boards').entries());
      const saved = table('prefs').get('boards')?.order;
      if (!stored.has('work') && (!saved || saved.includes('work'))) stored.set('work', defaultBoard('work'));
      const order = saved ?? [];
      const ids = [...new Set([...order.filter(id => stored.has(id)), ...stored.keys()])];
      return ids.map(id => ({id, title: stored.get(id).title}));
    },
    async createBoard(title, known) {
      if (this.listBoards().length >= MAX_BOARDS) throw new UserError('too-many', `at most ${MAX_BOARDS} boards`);
      const id = `b${Date.now().toString(36)}`;
      const board = await this.putBoard({...defaultBoard(id), title: String(title ?? ''), widgets: [], known: Array.isArray(known) ? known : BUILTIN_WIDGETS});
      await this.putPrefs({boards: {order: [...this.listBoards().map(b => b.id).filter(x => x !== id), id]}});
      return board;
    },
    async deleteBoard(id) {
      const boards = this.listBoards();
      if (boards.length <= 1) throw new UserError('last-board', 'cannot delete the last board');
      if (!boards.some(b => b.id === id)) throw new UserError('not-found', `no board ${id}`);
      await table('boards').delete(id);
      await this.putPrefs({boards: {order: boards.map(b => b.id).filter(x => x !== id)}});
      return true;
    },
    async orderBoards(order) {
      if (!Array.isArray(order)) throw new UserError('bad-order', 'order must be an array');
      await this.putPrefs({boards: {order: order.map(String)}});
      return this.listBoards();
    },
    getPrefs: () => Object.fromEntries([...table('prefs').entries()]),
    async putPrefs(patch) {
      for (const [key, value] of Object.entries(patch ?? {})) {
        if (!/^[a-z][a-zA-Z0-9]{0,31}$/.test(key)) throw new UserError('bad-pref', `invalid pref ${key}`);
        if (value === null) await table('prefs').delete(key);
        else await table('prefs').put(key, value);
      }
      return this.getPrefs();
    },
    async putBoard(board) {
      if (!board || typeof board.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(board.id) || !Array.isArray(board.widgets))
        throw new UserError('bad-board', 'board needs an id and a widgets array');
      const clean = {
        apiVersion: 1,
        id: board.id,
        title: String(board.title ?? '').slice(0, 80),
        widgets: board.widgets.filter(w => w && typeof w.id === 'string').map(w => ({id: w.id, size: String(w.size ?? ''), ...(w.config && typeof w.config === 'object' ? {config: w.config} : {})})),
        known: Array.isArray(board.known) ? [...new Set(board.known.map(String))] : [],
      };
      await table('boards').put(clean.id, clean);
      return clean;
    },
    async adoptWidgets(id, known, place) {
      const ids = (Array.isArray(known) ? known : []).map(String);
      const cells = (Array.isArray(place) ? place : []).filter(w => w && ids.includes(w.id));
      let target = null;
      for (const b of this.listBoards()) {
        const board = this.getBoard(b.id);
        const seen = new Set(board.known ?? []);
        const fresh = ids.filter(x => !seen.has(x));
        if (b.id !== id && !fresh.length) continue;
        const widgets = b.id === id ? [...board.widgets, ...cells.filter(w => !seen.has(w.id))] : board.widgets;
        const saved = await this.putBoard({...board, widgets, known: [...seen, ...fresh]});
        if (b.id === id) target = saved;
      }
      if (!target) throw new UserError('not-found', `no board ${id}`);
      return target;
    },

    listTodos(now = Date.now()) {
      const all = [...table('todos').entries()].map(([, v]) => v);
      const open = all.filter(t => !t.done).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
      const done = all.filter(t => t.done && now - t.doneAt < DONE_KEEP_MS).sort((a, b) => b.doneAt - a.doneAt);
      return [...open, ...done];
    },
    async addTodo(text) {
      const now = Date.now();
      const todo = {id: newId(), text: cleanText(text), done: false, createdAt: now, doneAt: 0, order: now};
      await table('todos').put(todo.id, todo);
      return todo;
    },
    async updateTodo(id, patch) {
      const todo = {...requireTodo(id)};
      if (patch.text !== undefined) todo.text = cleanText(patch.text);
      if (patch.done !== undefined) {
        todo.done = Boolean(patch.done);
        todo.doneAt = todo.done ? Date.now() : 0;
      }
      await table('todos').put(todo.id, todo);
      return todo;
    },
    async removeTodo(id) {
      requireTodo(id);
      await table('todos').delete(String(id));
      return true;
    },

    listHabits: () => [...table('habits').entries()].map(([, v]) => v).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
    async addHabit(name) {
      if ([...table('habits').entries()].length >= MAX_HABITS) throw new UserError('too-many', `at most ${MAX_HABITS} habits`);
      const now = Date.now();
      const habit = {id: newId(), name: cleanText(name).slice(0, 80), createdAt: now, order: now, days: []};
      await table('habits').put(habit.id, habit);
      return habit;
    },
    async checkHabit(id, day, done) {
      const habit = table('habits').get(String(id));
      if (!habit) throw new UserError('not-found', `no habit with id ${id}`);
      if (!DAY_KEY.test(String(day))) throw new UserError('bad-day', 'day must be YYYY-MM-DD');
      const days = new Set(habit.days);
      if (done ?? !days.has(day)) days.add(day); else days.delete(day);
      const next = {...habit, days: [...days].sort().slice(-HABIT_DAYS_KEPT)};
      await table('habits').put(next.id, next);
      return next;
    },
    async removeHabit(id) {
      if (!table('habits').get(String(id))) throw new UserError('not-found', `no habit with id ${id}`);
      await table('habits').delete(String(id));
      return true;
    },

    listInbox: () => [...table('inbox').entries()].map(([, v]) => v).sort((a, b) => a.createdAt - b.createdAt),
    async addInbox(text) {
      const value = String(text ?? '').trim().slice(0, MAX_INBOX_TEXT);
      if (!value) throw new UserError('empty-text', 'text is required');
      if ([...table('inbox').entries()].length >= MAX_INBOX) throw new UserError('too-many', `at most ${MAX_INBOX} inbox items`);
      const item = {id: newId(), text: value, createdAt: Date.now()};
      await table('inbox').put(item.id, item);
      return item;
    },
    async removeInbox(id) {
      if (!table('inbox').get(String(id))) throw new UserError('not-found', `no inbox item with id ${id}`);
      await table('inbox').delete(String(id));
      return true;
    },
    async clearInbox() {
      const ids = [...table('inbox').entries()].map(([k]) => k);
      for (const id of ids) await table('inbox').delete(id);
      return ids.length;
    },

    readOf: urls => readUrls(urls).filter(u => table('reads').get(readKey(u))),
    async markRead(urls, read = true) {
      const list = readUrls(urls);
      const now = Date.now();
      for (const u of list) {
        if (read) await table('reads').put(readKey(u), {at: now});
        else await table('reads').delete(readKey(u));
      }
      if (read && list.length) await pruneReads(now);
      return list.length;
    },

    listWidgets: () => [...table('widgets').entries()].map(([, v]) => v).sort((a, b) => a.createdAt - b.createdAt),
    getWidget(id) {
      const widget = table('widgets').get(widgetId(id));
      if (!widget) throw new UserError('not-found', `no widget with id ${id}`);
      return widget;
    },
    async createWidget(input) {
      if (this.listWidgets().length >= MAX_WIDGETS) throw new UserError('too-many', `at most ${MAX_WIDGETS} widgets`);
      const id = input?.id ? widgetId(input.id) : `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      if (table('widgets').get(id)) throw new UserError('exists', `widget ${id} already exists`);
      const now = Date.now();
      const withData = input?.data !== undefined;
      const widget = {id, ...cleanSpec(input), data: cleanData(input?.data), rev: 1, dataRev: withData ? 1 : 0, dataAt: withData ? now : 0, lastError: null, createdAt: now, updatedAt: now};
      await table('widgets').put(id, widget);
      return widget;
    },
    async updateWidget(id, input) {
      const base = this.getWidget(id);
      const now = Date.now();
      const widget = {...base, ...cleanSpec(input, base), rev: base.rev + 1, lastError: null, updatedAt: now};
      if (input?.data !== undefined) Object.assign(widget, {data: cleanData(input.data), dataRev: base.dataRev + 1, dataAt: now});
      await table('widgets').put(widget.id, widget);
      return widget;
    },
    async setWidgetData(id, data) {
      const base = this.getWidget(id);
      const widget = {...base, data: cleanData(data), dataRev: base.dataRev + 1, dataAt: Date.now()};
      await table('widgets').put(widget.id, widget);
      return widget;
    },
    // 只在错误变化时写入，页面反复回报同一个错误不产生写盘。
    async reportWidget(id, message) {
      const base = this.getWidget(id);
      const text = message ? String(message).slice(0, MAX_WIDGET_ERROR) : '';
      if ((base.lastError?.message ?? '') === text) return base;
      const widget = {...base, lastError: text ? {message: text, at: Date.now(), rev: base.rev} : null};
      await table('widgets').put(widget.id, widget);
      return widget;
    },
    async removeWidget(id) {
      const widget = this.getWidget(id);
      await table('widgets').delete(widget.id);
      const slotId = `${CUSTOM_PREFIX}${widget.id}`;
      for (const b of this.listBoards()) {
        const board = this.getBoard(b.id);
        if (!board.widgets.some(w => w.id === slotId) && !(board.known ?? []).includes(slotId)) continue;
        await this.putBoard({...board, widgets: board.widgets.filter(w => w.id !== slotId), known: (board.known ?? []).filter(k => k !== slotId)});
      }
      return true;
    },

    getNote: () => table('notes').get(NOTE_KEY) ?? {text: '', updatedAt: 0},
    async putNote(text) {
      const note = {text: String(text ?? '').slice(0, MAX_NOTE), updatedAt: Date.now()};
      await table('notes').put(NOTE_KEY, note);
      return note;
    },
  };
}

class UserError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const reply = (rpcId, result) => Response.json({type: 'server-response', rpcId, result});
const ok = value => ({ok: true, value});
const fail = (code, message) => ({ok: false, error: {code: `${NS}/${code}`, message, details: {}}});

function createCalendar(fetcher, systemCalendar = null) {
  const parsed = new Map();
  return async ({urls, from, to, system}) => {
    const start = Number(from);
    const end = Number(to);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_RANGE) throw new UserError('bad-range', 'invalid time range');
    const list = (Array.isArray(urls) ? urls : String(urls ?? '').split(/\s+/)).map(u => String(u).trim()).filter(Boolean).slice(0, 10);
    const errors = [];
    const events = [];
    let sys = null;
    await Promise.all([...list.map(async (url, source) => {
      try {
        const text = await fetcher.get(url, {ttlMs: ICS_TTL, type: 'text', maxBytes: ICS_MAX_BYTES, timeoutMs: 15_000});
        let hit = parsed.get(url);
        if (!hit || hit.text !== text) { hit = {text, events: parseICS(text)}; parsed.set(url, hit); }
        for (const e of expandEvents(hit.events, start, end)) events.push({...e, source});
      } catch (error) {
        errors.push({url, message: String(error?.message || error)});
      }
    }), (async () => {
      if (!system || !systemCalendar) return;
      const res = await systemCalendar.events({from: start, to: end});
      sys = res.status;
      if (res.message) errors.push({url: 'system', message: res.message});
      for (const e of res.events) events.push({...e, source: 'system'});
    })()]);
    events.sort((a, b) => a.start - b.start || Number(b.allDay) - Number(a.allDay));
    return {events: events.slice(0, 500), errors, system: sys};
  };
}

function createFeeds(fetcher) {
  const parsed = new Map();
  return async ({urls, limit}) => {
    const list = (Array.isArray(urls) ? urls : String(urls ?? '').split(/\s+/)).map(u => String(u).trim()).filter(Boolean).slice(0, 8);
    const max = Math.min(Math.max(Number(limit) || 30, 1), 60);
    const errors = [];
    const items = [];
    await Promise.all(list.map(async (url, source) => {
      try {
        const text = await fetcher.get(url, {ttlMs: FEED_TTL, type: 'text', maxBytes: FEED_MAX_BYTES, timeoutMs: 15_000});
        let hit = parsed.get(url);
        if (!hit || hit.text !== text) { hit = {text, feed: parseFeed(text)}; parsed.set(url, hit); }
        for (const item of hit.feed.items) items.push({...item, source, feed: hit.feed.title});
      } catch (error) {
        errors.push({url, message: String(error?.message || error)});
      }
    }));
    items.sort((a, b) => b.date - a.date || a.source - b.source);
    return {items: items.slice(0, max), errors};
  };
}

const titleOf = summary => {
  const value = summary?.projections?.values?.title;
  return String(typeof value === 'string' ? value : value?.title ?? value?.value ?? '').slice(0, 200);
};
const toMs = iso => { const ms = Date.parse(iso ?? ''); return Number.isFinite(ms) ? ms : 0; };
const MAX_PINNED = 20;

export function lastMessageText(records) {
  for (let i = records.length - 1; i >= 0; i--) {
    const event = records[i]?.event;
    if (event?.type !== 'assistant/message' && event?.type !== 'user/message') continue;
    const content = event.data?.message?.content;
    const parts = typeof content === 'string' ? [content] : (Array.isArray(content) ? content : []).filter(p => p?.type === 'text').map(p => p.text);
    const value = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (value) return `${event.type === 'user/message' ? '> ' : ''}${value.slice(0, 240)}`;
  }
  return '';
}

// 定时任务管理：列表、暂停 / 恢复 / 删除、立即运行、清除已结束，都走 Harness 的 schedule 服务。
const scheduleRow = t => ({
  id: t.id,
  title: String(t.title || t.prompt || '').slice(0, 200),
  prompt: String(t.prompt ?? '').slice(0, 2000),
  kind: t.kind,
  timing: {
    everySeconds: t.everySeconds, afterSeconds: t.afterSeconds, time: t.time, weekdays: t.weekdays,
    expression: t.expression, rrule: t.rrule, timeZone: t.timeZone,
  },
  status: t.status,
  scheduledAt: toMs(t.scheduledAt),
  running: t.executionActive === true,
  lastAt: toMs(t.lastDelivery?.deliveredAt),
  lastSessionId: t.lastDelivery?.targetSessionId ?? '',
  sessionId: t.target?.sessionId ?? '',
  cwd: t.target?.create?.cwd ?? '',
});

export function createSchedules(ctx) {
  const service = () => {
    const s = ctx.get?.('schedule');
    if (typeof s?.catalog !== 'function') throw new UserError('unavailable', 'this Harness does not expose scheduled tasks');
    return s;
  };
  const check = result => {
    if (result?.code === 'schedule_not_found') throw new UserError('not-found', 'the scheduled task no longer exists');
    if (result?.code === 'schedule_conflict') throw new UserError('conflict', 'the scheduled task changed, try again');
    return result;
  };
  return {
    async list() {
      const s = ctx.get?.('schedule');
      if (typeof s?.catalog !== 'function') return null;
      return (await s.catalog()).filter(Boolean).map(scheduleRow);
    },
    async edit({id, action}) {
      const s = service();
      if (!id) throw new UserError('bad-request', 'id is required');
      if (action === 'delete') return check(await s.edit({id: String(id), action: 'delete'}, undefined, AbortSignal.timeout(15_000)));
      if (action !== 'pause' && action !== 'resume') throw new UserError('bad-request', `unknown action ${action}`);
      return scheduleRow(check(await s.edit({id: String(id), action: 'update', patch: {active: action === 'resume'}}, undefined, AbortSignal.timeout(15_000))));
    },
    async run({id}) {
      const s = service();
      const result = check(await s.run({id: String(id ?? '')}, AbortSignal.timeout(30_000)));
      if (result?.code === 'schedule_execution_pending') return {pending: true};
      return scheduleRow(result);
    },
    async clearEnded() {
      return service().deleteInactive();
    },
  };
}

// 用桌面打开或在文件管理器里定位本机文件；会直接运行或安装的类型只定位。
// 优先走 Harness 的 openWorkspacePath，不可用时在 macOS 上退回 open 命令。
export function createOpener(ctx, run, os = platform()) {
  return async ({path, reveal}) => {
    const target = String(path ?? '');
    if (!isAbsolute(target)) throw new UserError('bad-path', 'path must be absolute');
    if (!(await stat(target).catch(() => null))) throw new UserError('not-found', `no such file: ${target}`);
    const action = reveal || isRisky(target) ? 'reveal' : undefined;
    const controller = ctx.get?.('sessionController');
    if (typeof controller?.openWorkspacePath === 'function' && controller.canOpenWorkspacePath?.() !== false) {
      try {
        await controller.openWorkspacePath({path: target, ...(action ? {action} : {})}, AbortSignal.timeout(10_000));
        return {opened: true, action: action ?? 'open'};
      } catch (error) {
        if (os !== 'darwin' || !run) throw new UserError('open-failed', String(error?.message || error));
      }
    }
    if (os !== 'darwin' || !run) throw new UserError('unavailable', 'opening files is not available on this Harness');
    await run('open', action ? ['-R', target] : [target], {timeoutMs: 10_000});
    return {opened: true, action: action ?? 'open'};
  };
}

// 会话与定时任务来自 Harness 内置服务（sessionController / schedule），缺失时对应字段为 null。
// 「等待确认」通过旁听 approval / user-questions 两个 waterfall 得到，只计数不作答。
export function createAgentWatch(ctx) {
  const waiting = new Map();
  const mark = (id, delta) => {
    if (!id) return;
    const n = (waiting.get(id) ?? 0) + delta;
    if (n > 0) waiting.set(id, n); else waiting.delete(id);
  };
  const passThrough = (id, next) => {
    mark(id, 1);
    let result;
    try { result = next(); } catch (error) { mark(id, -1); throw error; }
    return Promise.resolve(result).finally(() => mark(id, -1));
  };
  if (typeof ctx.on === 'function') {
    ctx.on('approval/request', (req, next) => passThrough(req?.agent?.id, next));
    ctx.on('user-questions/request', (req, next) => passThrough(req?.agent?.id, next));
  }
  let cached = null;
  let listed = null;
  const previews = new Map();
  // 所有顶层会话（不含子 Agent 和空白会话），按活动时间倒序；不支持时为 null。
  const allSessions = async () => {
    if (listed && Date.now() - listed.at < 2000) return listed.value;
    const controller = ctx.get?.('sessionController');
    let value = null;
    if (typeof controller?.list === 'function') {
      const result = await controller.list({}, AbortSignal.timeout(8000));
      value = (result?.items ?? [])
        .filter(s => s && !s.blank && s.origin !== 'subagent' && !s.parentSessionId)
        .map(s => ({id: s.sessionId, title: titleOf(s), running: Boolean(s.running), waiting: waiting.has(s.sessionId), updatedAt: Number(s.updatedAt) || 0, cwd: s.cwd ?? ''}))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    listed = {at: Date.now(), value};
    return value;
  };
  // 最后一条用户或助手消息的文字，按会话更新时间缓存；读不到时为空串。
  const preview = async s => {
    const hit = previews.get(s.id);
    if (hit && hit.updatedAt === s.updatedAt) return hit.value;
    const controller = ctx.get?.('sessionController');
    let value = '';
    if (typeof controller?.events === 'function') {
      try {
        const page = await controller.events({address: {kind: 'session', sessionId: s.id}, maxMessages: 2}, AbortSignal.timeout(5000));
        value = lastMessageText(page?.records ?? []);
      } catch {}
    }
    previews.set(s.id, {updatedAt: s.updatedAt, value});
    return value;
  };
  return {
    waiting,
    sessions: allSessions,
    async pinned(ids) {
      const list = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean).slice(0, MAX_PINNED);
      const all = await allSessions();
      if (!all) return null;
      const byId = new Map(all.map(s => [s.id, s]));
      return Promise.all(list.map(async id => {
        const s = byId.get(id);
        return s ? {...s, preview: await preview(s)} : {id, missing: true};
      }));
    },
    async overview() {
      if (cached && Date.now() - cached.at < 2000) return cached.value;
      const schedule = ctx.get?.('schedule');
      const all = await allSessions();
      const sessions = all ? [...all].sort((a, b) => Number(b.waiting) - Number(a.waiting) || Number(b.running) - Number(a.running) || b.updatedAt - a.updatedAt).slice(0, 30) : null;
      let schedules = null;
      if (typeof schedule?.catalog === 'function') {
        schedules = (await schedule.catalog())
          .filter(t => t && t.status === 'active')
          .map(t => ({id: t.id, title: String(t.title ?? t.prompt ?? '').slice(0, 200), scheduledAt: toMs(t.scheduledAt), running: t.executionActive === true, lastAt: toMs(t.lastDelivery?.deliveredAt)}))
          .slice(0, 20);
      }
      cached = {at: Date.now(), value: {sessions, schedules}};
      return cached.value;
    },
  };
}

export async function resolveDir(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  const path = text === '~' ? homedir() : text.startsWith('~/') ? `${homedir()}${text.slice(1)}` : text;
  if (!isAbsolute(path)) throw new UserError('bad-dir', `not an absolute path: ${text}`);
  const info = await stat(path).catch(() => null);
  if (!info?.isDirectory()) throw new UserError('bad-dir', `not a directory: ${text}`);
  return path;
}

// 新开一个会话并直接发送 prompt；页面随后用 uiWorkspace.openSession 打开它。
export function createLauncher(ctx) {
  return async ({prompt, cwd, timeZone}) => {
    const text = String(prompt ?? '').trim().slice(0, MAX_PROMPT);
    if (!text) throw new UserError('empty-text', 'prompt is required');
    const controller = ctx.get?.('sessionController');
    if (typeof controller?.create !== 'function' || typeof controller?.prompt !== 'function') throw new UserError('unavailable', 'this Harness cannot start sessions');
    const dir = await resolveDir(cwd);
    const {sessionId} = await controller.create(dir ? {cwd: dir} : {});
    await controller.prompt({requestId: randomUUID(), sessionId, mode: 'queue', content: [{type: 'text', text}], ...(timeZone ? {clientTimeZone: String(timeZone)} : {})}, AbortSignal.timeout(15_000));
    return {sessionId};
  };
}

export function createWorkspaces(ctx) {
  return () => {
    const registry = ctx.get?.('workspaceRegistry');
    if (typeof registry?.list !== 'function') return null;
    return registry.list().filter(w => w?.id && w.path).map(w => ({id: w.id, path: w.path, title: String(w.title ?? '')}));
  };
}

// 目标与后台任务只存在于 live Agent：遍历 agents.list()，逐个问 goals / jobs。已卸载的历史会话不在其中。
const RECENT_MS = 15 * 60_000;
export function createRunning(ctx, now = Date.now) {
  let titles = {at: 0, map: new Map()};
  const titleMap = async () => {
    if (now() - titles.at < 10_000) return titles.map;
    const controller = ctx.get?.('sessionController');
    const map = new Map();
    if (typeof controller?.list === 'function') {
      const result = await controller.list({}, AbortSignal.timeout(8000)).catch(() => null);
      for (const s of result?.items ?? []) map.set(s.sessionId, {title: titleOf(s), cwd: s.cwd ?? '', parent: s.parentSessionId ?? ''});
    }
    titles = {at: now(), map};
    return map;
  };
  return {
    async overview() {
      const agents = ctx.get?.('agents');
      if (typeof agents?.list !== 'function') return {goals: null, jobs: null};
      const goals = ctx.get?.('goals');
      const jobs = ctx.get?.('jobs');
      const meta = await titleMap();
      const info = id => meta.get(id) ?? {title: '', cwd: '', parent: ''};
      const goalRows = [];
      const jobRows = [];
      const seenJobs = new Set();
      const addJobs = (list, owner) => {
        for (const j of list ?? []) {
          if (!j || seenJobs.has(j.id)) continue;
          const live = j.status === 'running' || j.status === 'stopping';
          if (!live && !(j.finishedAt && now() - j.finishedAt < RECENT_MS)) continue;
          seenJobs.add(j.id);
          const sessionId = j.owner ?? owner ?? '';
          jobRows.push({id: j.id, sessionId, title: info(sessionId).title, kind: String(j.kind ?? ''), label: String(j.label ?? '').slice(0, 300), status: j.status, progress: String(j.progress ?? '').slice(0, 200), detail: String(j.detail ?? '').slice(0, 200), startedAt: Number(j.startedAt) || 0, finishedAt: Number(j.finishedAt) || 0});
        }
      };
      for (const agent of agents.list()) {
        const id = agent?.id;
        if (!id) continue;
        if (typeof goals?.get === 'function') {
          let g;
          try { g = goals.get(agent); } catch { g = undefined; }
          if (g && (g.phase !== 'complete' || now() - g.updatedAt < RECENT_MS)) {
            const s = info(id);
            goalRows.push({sessionId: s.parent || id, title: s.title, objective: String(g.objective ?? '').slice(0, 500), phase: g.phase, rounds: g.roundsStarted ?? 0, maxRounds: g.maxGoalRounds ?? 0, armed: g.activation === 'armed', reason: g.blockedReason?.message ?? '', updatedAt: g.updatedAt ?? 0});
          }
        }
        if (typeof jobs?.list === 'function') { try { addJobs(jobs.list(id), id); } catch { /* 已卸载的 Agent */ } }
      }
      if (typeof jobs?.list === 'function') { try { addJobs(jobs.list(), ''); } catch { /* 无未归属任务 */ } }
      const order = {active: 0, blocked: 1, paused: 2, complete: 3};
      goalRows.sort((a, b) => (order[a.phase] ?? 9) - (order[b.phase] ?? 9) || b.updatedAt - a.updatedAt);
      jobRows.sort((a, b) => Number(!!a.finishedAt) - Number(!!b.finishedAt) || b.startedAt - a.startedAt);
      return {goals: goals ? goalRows : null, jobs: jobs ? jobRows.slice(0, 30) : null};
    },
    kill({id, sessionId}) {
      const jobs = ctx.get?.('jobs');
      if (typeof jobs?.kill !== 'function') throw new UserError('unavailable', 'background jobs are not available');
      return {result: jobs.kill(String(id), sessionId ? String(sessionId) : undefined, 'stopped from Workboard')};
    },
  };
}

const GIT_TTL = 15_000;
const GITHUB_TTL = 5 * 60_000;
const MAX_REPOS = 20;

// 仓库列表：设置里写了路径就用设置（非仓库报错），否则用 Harness 登记的工作区（非仓库跳过）。
export function createGit(ctx, run, now = Date.now) {
  const cache = new Map();
  const targets = async raw => {
    const lines = (Array.isArray(raw) ? raw : String(raw ?? '').split('\n')).map(x => String(x).trim()).filter(Boolean);
    if (lines.length) return {explicit: true, paths: [...new Set(await Promise.all(lines.slice(0, MAX_REPOS).map(l => resolveDir(l).catch(() => l))))]};
    const registry = ctx.get?.('workspaceRegistry');
    const paths = typeof registry?.list === 'function' ? registry.list().map(w => w.path).filter(Boolean) : [];
    return {explicit: false, paths: [...new Set(paths)].slice(0, MAX_REPOS)};
  };
  const one = async (path, explicit, fresh) => {
    let hit = cache.get(path);
    if (fresh || !hit || now() - hit.at >= GIT_TTL) {
      hit = await repoStatus(run, path).then(value => ({at: now(), value}), error => ({at: now(), error: String(error?.message || error)}));
      cache.set(path, hit);
    }
    if (hit.value) return hit.value;
    return explicit ? {path, name: path.split('/').filter(Boolean).pop() ?? path, error: hit.error} : null;
  };
  return {
    async status({paths, fresh} = {}) {
      const {explicit, paths: list} = await targets(paths);
      return {source: explicit ? 'config' : 'workspaces', repos: (await Promise.all(list.map(p => one(p, explicit, fresh)))).filter(Boolean)};
    },
    async fetch({paths} = {}) {
      const {explicit, paths: list} = await targets(paths);
      const current = (await Promise.all(list.map(p => one(p, explicit)))).filter(r => r && !r.error && r.upstream);
      const errors = [];
      await Promise.all(current.map(r => fetchRepo(run, r.path).catch(e => errors.push({path: r.path, message: String(e?.message || e)}))));
      return {...(await this.status({paths, fresh: true})), errors};
    },
  };
}

export function createGithub(run, now = Date.now) {
  let hit = null;
  let job = null;
  return async ({fresh} = {}) => {
    if (!fresh && hit && now() - hit.at < GITHUB_TTL) return hit.value;
    job ??= githubOverview(run).then(value => { hit = {at: now(), value: {...value, fetchedAt: now()}}; return hit.value; }, error => {
      if (error?.code === 'not-found') throw new UserError('gh-missing', 'GitHub CLI (gh) is not installed');
      throw new UserError('gh-failed', String(error?.message || error));
    }).finally(() => { job = null; });
    return job;
  };
}

export const dshHome = () => process.env.DSH_HOME || join(homedir(), '.dsh');

export function createHandlers(store, fetcher = createFetcher(), agents = null, launch = null, services = {}) {
  const calendar = createCalendar(fetcher, services.systemCalendar);
  const feeds = createFeeds(fetcher);
  const quotes = createQuotes(fetcher);
  const attention = services.attention ?? createAttention({agents, running: services.running, github: services.github, store});
  return {
    'dsh-workboard/quote.get': p => quotes.get({day: p?.day, n: p?.n}),
    'dsh-workboard/feed.get': p => feeds({urls: p?.urls, limit: p?.limit}),
    'dsh-workboard/attention.get': p => attention({dayStart: p?.dayStart, github: p?.github !== false, todos: p?.todos !== false, inbox: p?.inbox !== false}),
    'dsh-workboard/agent.overview': () => (agents ? agents.overview() : {sessions: null, schedules: null}),
    'dsh-workboard/agent.start': async p => {
      if (!launch) throw new UserError('unavailable', 'this Harness cannot start sessions');
      return launch({prompt: p?.prompt, cwd: p?.cwd, timeZone: p?.timeZone});
    },
    'dsh-workboard/workspace.list': () => (services.workspaces ? services.workspaces() : null),
    'dsh-workboard/usage.get': async p => {
      if (!services.usage) throw new UserError('unavailable', 'usage is not available');
      return services.usage.summary({days: p?.days});
    },
    'dsh-workboard/running.get': async () => (services.running ? services.running.overview() : {goals: null, jobs: null}),
    'dsh-workboard/running.kill': async p => {
      if (!services.running) throw new UserError('unavailable', 'background jobs are not available');
      return services.running.kill({id: p?.id, sessionId: p?.sessionId});
    },
    'dsh-workboard/git.status': async p => {
      if (!services.git) throw new UserError('unavailable', 'git is not available');
      return services.git.status({paths: p?.paths});
    },
    'dsh-workboard/git.fetch': async p => {
      if (!services.git) throw new UserError('unavailable', 'git is not available');
      return services.git.fetch({paths: p?.paths});
    },
    'dsh-workboard/system.get': async () => {
      if (!services.system) throw new UserError('unavailable', 'system status is not available');
      return services.system.get();
    },
    'dsh-workboard/photo.next': async p => {
      if (!services.photos) throw new UserError('unavailable', 'photos are not available');
      const dir = await resolveDir(p?.dir || '~/Pictures');
      return services.photos.next({dir, index: Number.isInteger(p?.index) ? p.index : undefined, shuffle: p?.shuffle !== false});
    },
    'dsh-workboard/market.quotes': async p => {
      if (!services.market) throw new UserError('unavailable', 'market data is not available');
      return services.market.quotes({symbols: String(p?.symbols ?? '')});
    },
    'dsh-workboard/trending.get': async p => {
      if (!services.trending) throw new UserError('unavailable', 'trending lists are not available');
      return services.trending.list({source: String(p?.source ?? '')});
    },
    'dsh-workboard/nowplaying.get': async p => {
      if (!services.nowPlaying) throw new UserError('unavailable', 'now playing is not available');
      return services.nowPlaying.get({app: String(p?.app ?? 'auto')});
    },
    'dsh-workboard/nowplaying.control': async p => {
      if (!services.nowPlaying) throw new UserError('unavailable', 'now playing is not available');
      return services.nowPlaying.control({app: String(p?.app ?? ''), action: String(p?.action ?? ''), bundle: String(p?.bundle ?? '')});
    },
    'dsh-workboard/video.list': async p => {
      if (!services.videos) throw new UserError('unavailable', 'video subscriptions are not available');
      return services.videos.list({sources: p?.sources});
    },
    'dsh-workboard/video.thumb': async p => {
      if (!services.videos) throw new UserError('unavailable', 'video subscriptions are not available');
      return services.videos.thumb({url: p?.url});
    },
    'dsh-workboard/github.get': async p => {
      if (!services.github) throw new UserError('unavailable', 'GitHub is not available');
      return services.github({fresh: p?.fresh === true});
    },
    'dsh-workboard/widget.list': () => store.listWidgets().map(widgetSummary),
    'dsh-workboard/widget.get': p => store.getWidget(p?.id),
    'dsh-workboard/widget.put': async p => {
      if (p?.html !== undefined) {
        const {errors} = checkHtml(String(p.html));
        if (errors.length) throw new UserError('bad-html', errors.join('\n'));
      }
      return widgetSummary(await store.updateWidget(p?.id, {title: p?.title, html: p?.html}));
    },
    'dsh-workboard/widget.remove': p => store.removeWidget(p?.id),
    'dsh-workboard/widget.export': p => packWidget(store.getWidget(p?.id), p?.data === true),
    // dryRun 只校验并返回预览，让用户看到会访问的地址后再确认。
    'dsh-workboard/widget.import': async p => {
      const {spec, data, warnings} = unpackWidget(p?.package);
      if (p?.dryRun === true) return {widget: {title: spec.title, description: spec.description, sizes: spec.sizes, fetch: spec.fetch}, hasData: data != null, warnings};
      return {widget: widgetSummary(await store.createWidget(data == null ? spec : {...spec, data})), warnings};
    },
    'dsh-workboard/widget.save': async p => {
      const widget = await store.setWidgetData(p?.id, p?.data);
      return {dataRev: widget.dataRev, dataAt: widget.dataAt};
    },
    'dsh-workboard/widget.report': async p => { await store.reportWidget(p?.id, p?.error); return true; },
    'dsh-workboard/widget.fetch': async p => {
      const widget = store.getWidget(p?.id);
      const url = allowedUrl(p?.url, widget.fetch);
      const as = ['json', 'text', 'dataUrl'].includes(p?.as) ? p.as : 'json';
      const value = await fetcher.get(url, {ttlMs: p?.fresh === true ? 0 : WIDGET_FETCH_TTL, type: as === 'dataUrl' ? 'bytes' : as, maxBytes: as === 'dataUrl' ? 1_500_000 : 2_000_000});
      return as === 'dataUrl' ? `data:${value.type};base64,${value.base64}` : value;
    },
    'dsh-workboard/session.list': async () => (agents ? agents.sessions() : null),
    'dsh-workboard/session.pinned': async p => (agents ? agents.pinned(p?.ids) : null),
    'dsh-workboard/schedule.list': async () => (services.schedules ? services.schedules.list() : null),
    'dsh-workboard/schedule.edit': async p => {
      if (!services.schedules) throw new UserError('unavailable', 'this Harness does not expose scheduled tasks');
      return services.schedules.edit({id: p?.id, action: p?.action});
    },
    'dsh-workboard/schedule.run': async p => {
      if (!services.schedules) throw new UserError('unavailable', 'this Harness does not expose scheduled tasks');
      return services.schedules.run({id: p?.id});
    },
    'dsh-workboard/schedule.clear': async () => {
      if (!services.schedules) throw new UserError('unavailable', 'this Harness does not expose scheduled tasks');
      return services.schedules.clearEnded();
    },
    'dsh-workboard/outputs.list': async p => {
      if (!services.outputs) throw new UserError('unavailable', 'outputs are not available');
      return services.outputs.list({created: p?.created !== false, fresh: p?.fresh === true});
    },
    'dsh-workboard/files.recent': async p => {
      if (!services.files) throw new UserError('unavailable', 'recent files are not available');
      const raw = (Array.isArray(p?.dirs) ? p.dirs : String(p?.dirs ?? '').split('\n')).map(x => String(x).trim()).filter(Boolean);
      const resolved = await Promise.all((raw.length ? raw : ['~/Downloads', '~/Desktop']).map(d => resolveDir(d).then(path => ({path}), e => ({error: {dir: d, message: e.message}}))));
      const result = await services.files.list({dirs: resolved.filter(r => r.path).map(r => r.path), limit: p?.limit, folders: p?.folders !== false});
      return {...result, errors: [...resolved.filter(r => r.error).map(r => r.error), ...result.errors]};
    },
    'dsh-workboard/file.open': async p => {
      if (!services.open) throw new UserError('unavailable', 'opening files is not available on this Harness');
      return services.open({path: p?.path, reveal: p?.reveal === true});
    },
    'dsh-workboard/clipboard.get': async () => {
      if (!services.clipboard) throw new UserError('unavailable', 'clipboard is not available');
      return services.clipboard.get();
    },
    'dsh-workboard/clipboard.remove': async p => {
      if (!services.clipboard) throw new UserError('unavailable', 'clipboard is not available');
      return services.clipboard.remove(p?.id ? String(p.id) : '');
    },
    'dsh-workboard/network.get': async p => {
      if (!services.network) throw new UserError('unavailable', 'network status is not available');
      return services.network.get({targets: String(p?.targets ?? ''), fresh: p?.fresh === true});
    },
    'dsh-workboard/inbox.list': () => store.listInbox(),
    'dsh-workboard/inbox.add': p => store.addInbox(p?.text),
    'dsh-workboard/inbox.remove': p => store.removeInbox(p?.id),
    'dsh-workboard/inbox.clear': () => store.clearInbox(),
    'dsh-workboard/read.check': p => store.readOf(p?.urls),
    'dsh-workboard/read.mark': p => store.markRead(p?.urls, p?.read !== false),
    'dsh-workboard/habit.list': () => store.listHabits(),
    'dsh-workboard/habit.add': p => store.addHabit(p?.name),
    'dsh-workboard/habit.check': p => store.checkHabit(p?.id, p?.day, p?.done),
    'dsh-workboard/habit.remove': p => store.removeHabit(p?.id),
    'dsh-workboard/board.list': () => store.listBoards(),
    'dsh-workboard/board.create': p => store.createBoard(p?.title, p?.known),
    'dsh-workboard/board.delete': p => store.deleteBoard(String(p?.id)),
    'dsh-workboard/board.order': p => store.orderBoards(p?.order),
    'dsh-workboard/prefs.get': () => store.getPrefs(),
    'dsh-workboard/prefs.put': p => store.putPrefs(p?.prefs),
    'dsh-workboard/weather.get': p => getWeather(fetcher, {lat: p?.lat, lon: p?.lon, unit: p?.unit}),
    'dsh-workboard/geo.search': p => searchPlaces(fetcher, {query: p?.query, lang: p?.lang}),
    'dsh-workboard/calendar.events': p => calendar({urls: p?.urls, from: p?.from, to: p?.to, system: p?.system === true}),
    'dsh-workboard/calendar.connect': async () => (services.systemCalendar ? services.systemCalendar.connect() : {status: 'unsupported'}),
    'dsh-workboard/board.get': p => store.getBoard(String(p?.id || 'work')),
    'dsh-workboard/board.put': p => store.putBoard(p?.board),
    'dsh-workboard/board.adopt': p => store.adoptWidgets(String(p?.id), p?.known, p?.place),
    'dsh-workboard/todo.list': () => store.listTodos(),
    'dsh-workboard/todo.add': p => store.addTodo(p?.text),
    'dsh-workboard/todo.update': p => store.updateTodo(p?.id, {text: p?.text, done: p?.done}),
    'dsh-workboard/todo.remove': p => store.removeTodo(p?.id),
    'dsh-workboard/note.get': () => store.getNote(),
    'dsh-workboard/note.put': p => store.putNote(p?.text),
  };
}

export async function handleRequest(request, handlers, store) {
  let message;
  try { message = await request.json(); } catch { return new Response('body is not JSON', {status: 400}); }
  const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
  const handler = message?.type === 'client-request' ? handlers[message.method] : undefined;
  if (!handler) return reply(rpcId, {ok: false, error: {code: 'gateway/bad-request', message: 'invalid request', details: {}}});
  try {
    await store.ready;
    return reply(rpcId, ok(await handler(message.payload)));
  } catch (error) {
    const known = error instanceof UserError || error instanceof WidgetError || error instanceof FetchError;
    return reply(rpcId, fail(known ? error.code : 'failed', String(error?.message || error)));
  }
}

const textResult = value => [{type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)}];
const iso = ms => (ms ? new Date(ms).toISOString() : null);

export function widgetSummary(w) {
  return {
    id: w.id, title: w.title, description: w.description, sizes: w.sizes, defaultSize: w.defaultSize, header: w.header,
    settings: w.settings, fetch: w.fetch, rev: w.rev, dataRev: w.dataRev, updatedAt: w.updatedAt, lastError: w.lastError,
  };
}

const SETTING_ITEM = {
  type: 'object',
  properties: {
    key: {type: 'string'},
    type: {type: 'string', enum: ['text', 'textarea', 'select', 'toggle']},
    label: {type: 'string'},
    default: {description: 'String, or boolean for toggle.'},
    placeholder: {type: 'string'},
    options: {type: 'array', description: 'For select.', items: {type: 'object', properties: {value: {type: 'string'}, label: {type: 'string'}}, required: ['value']}},
  },
  required: ['key', 'type', 'label'],
};

const toolWidget = w => ({...widgetSummary(w), updatedAt: iso(w.updatedAt), lastError: w.lastError ? {...w.lastError, at: iso(w.lastError.at)} : null});

export function createTools(store) {
  return [
    {
      name: 'workboard_todos',
      description: 'Read or change the to-do list on the user\'s Workboard dashboard. `list` returns open items and items completed in the last 7 days, each with an id. Use `add` with `text`; `complete`, `reopen` and `remove` with the `id` from `list`.',
      parameters: {
        type: 'object',
        properties: {
          action: {type: 'string', enum: ['list', 'add', 'complete', 'reopen', 'remove']},
          text: {type: 'string', description: 'Item text, for add.'},
          id: {type: 'string', description: 'Item id from list, for complete, reopen and remove.'},
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {schema: {type: 'object'}, render: (_args, value) => textResult(value)},
      async execute(args) {
        await store.ready;
        const {action, text, id} = args ?? {};
        if (action === 'list') return {todos: store.listTodos().map(({id, text, done}) => ({id, text, done}))};
        if (action === 'add') return {added: await store.addTodo(text)};
        if (action === 'complete' || action === 'reopen') return {updated: await store.updateTodo(id, {done: action === 'complete'})};
        if (action === 'remove') return {removed: await store.removeTodo(id)};
        throw new Error(`unknown action ${action}`);
      },
    },
    {
      name: 'workboard_note',
      description: 'Read or change the scratch note on the user\'s Workboard dashboard (plain text, usually Markdown). `read` returns the note; `append` adds `text` as a new line at the end; `replace` overwrites the whole note with `text`, so read it first.',
      parameters: {
        type: 'object',
        properties: {
          action: {type: 'string', enum: ['read', 'append', 'replace']},
          text: {type: 'string', description: 'Text for append or replace.'},
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {schema: {type: 'object'}, render: (_args, value) => textResult(value)},
      async execute(args) {
        await store.ready;
        const {action, text} = args ?? {};
        if (action === 'read') return {text: store.getNote().text};
        if (typeof text !== 'string') throw new Error('text is required');
        if (action === 'append') {
          const current = store.getNote().text;
          return {text: (await store.putNote(current && !current.endsWith('\n') ? `${current}\n${text}` : current + text)).text};
        }
        if (action === 'replace') return {text: (await store.putNote(text)).text};
        throw new Error(`unknown action ${action}`);
      },
    },
    {
      name: 'workboard_inbox',
      description: 'Read or change the inbox on the user\'s Workboard dashboard, where the user drops links, ideas and requests to deal with later. `list` returns items oldest first, each with an id; `add` stores `text`; `remove` deletes one item by `id` once it has been handled; `clear` deletes every item.',
      parameters: {
        type: 'object',
        properties: {
          action: {type: 'string', enum: ['list', 'add', 'remove', 'clear']},
          text: {type: 'string', description: 'Item text, for add.'},
          id: {type: 'string', description: 'Item id from list, for remove.'},
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {schema: {type: 'object'}, render: (_args, value) => textResult(value)},
      async execute(args) {
        await store.ready;
        const {action, text, id} = args ?? {};
        if (action === 'list') return {items: store.listInbox().map(({id, text, createdAt}) => ({id, text, addedAt: new Date(createdAt).toISOString()}))};
        if (action === 'add') return {added: await store.addInbox(text)};
        if (action === 'remove') return {removed: await store.removeInbox(id)};
        if (action === 'clear') return {cleared: await store.clearInbox()};
        throw new Error(`unknown action ${action}`);
      },
    },
    {
      name: 'workboard_widget',
      description: 'Create and change custom widgets on the user\'s Workboard dashboard: sandboxed HTML cards shown on their boards. Load the `workboard-widget` skill before writing or changing `html`. `list` returns each widget with its last runtime error; `get` returns the full definition and saved data; `create` needs `title` and `html`; `update` changes only the fields given for `id`; `set_data` replaces the saved data; `remove` deletes the widget from the library and every board.',
      parameters: {
        type: 'object',
        properties: {
          action: {type: 'string', enum: ['list', 'get', 'create', 'update', 'set_data', 'remove']},
          id: {type: 'string', description: 'Widget id; required except for list. Optional for create: 2-40 lowercase letters, digits or hyphens.'},
          title: {type: 'string', description: 'Card title, at most 40 characters, in the user\'s language.'},
          description: {type: 'string', description: 'One line shown in the widget gallery.'},
          html: {type: 'string', description: 'Body markup with inline <style> and <script>.'},
          sizes: {type: 'array', items: {type: 'string', enum: ['bar', 's', 'm', 't', 'l', 'w']}, description: 'Allowed card sizes; defaults to ["m"].'},
          defaultSize: {type: 'string', enum: ['bar', 's', 'm', 't', 'l', 'w'], description: 'Size when added; defaults to the first of sizes.'},
          header: {type: 'boolean', description: 'false hides the card title bar.'},
          settings: {type: 'array', items: SETTING_ITEM, description: 'Fields the user edits in the card settings dialog; values arrive as workboard.config.'},
          fetch: {type: 'array', items: {type: 'string'}, description: 'http(s) URL prefixes that workboard.fetch may request.'},
          data: {type: 'object', additionalProperties: true, description: 'Saved data, arriving as workboard.data; for create, update and set_data.'},
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {schema: {type: 'object'}, render: (_args, value) => textResult(value)},
      async execute(args) {
        await store.ready;
        const {action, id} = args ?? {};
        const check = html => {
          if (html === undefined) return [];
          const {errors, warnings} = checkHtml(String(html));
          if (errors.length) throw new Error(`html not saved:\n${errors.join('\n')}`);
          return warnings;
        };
        if (action === 'list') return {widgets: store.listWidgets().map(w => ({id: w.id, title: w.title, description: w.description, updatedAt: iso(w.updatedAt), lastError: w.lastError?.message ?? null}))};
        if (action === 'get') {
          const w = store.getWidget(id);
          return {...toolWidget(w), html: w.html, data: w.data, dataAt: iso(w.dataAt)};
        }
        if (action === 'create') {
          const warnings = check(args.html ?? '');
          return {created: toolWidget(await store.createWidget(args)), warnings};
        }
        if (action === 'update') {
          const warnings = check(args.html);
          const {action: _a, id: _i, ...patch} = args;
          return {updated: toolWidget(await store.updateWidget(id, patch)), warnings};
        }
        if (action === 'set_data') {
          if (args.data === undefined) throw new Error('data is required');
          const w = await store.setWidgetData(id, args.data);
          return {id: w.id, dataRev: w.dataRev, dataAt: iso(w.dataAt)};
        }
        if (action === 'remove') return {removed: await store.removeWidget(id)};
        throw new Error(`unknown action ${action}`);
      },
    },
  ];
}

const SKILL = {
  name: 'workboard-widget',
  description: 'Build, change or fix a custom widget on the user\'s Workboard dashboard in DeepSeek Harness with the workboard_widget tool: a sandboxed HTML card that can show web API data, data the agent writes, or a small interactive tool. Use when the user asks to add, make, generate, change or fix a Workboard (工作台) widget or card.',
  source: 'custom',
};

export function apply(ctx) {
  const store = createStore(ctx);
  const run = createRunner();
  const fetcher = createFetcher();
  const services = {
    usage: createUsage({root: join(dshHome(), 'sessions')}),
    running: createRunning(ctx),
    workspaces: createWorkspaces(ctx),
    git: createGit(ctx, run),
    github: createGithub(run),
    system: createSystem({run}),
    systemCalendar: createSystemCalendar({run}),
    photos: createPhotos({run, cacheDir: join(tmpdir(), 'dsh-workboard-photos')}),
    market: createMarket(fetcher),
    trending: createTrending(fetcher),
    nowPlaying: createNowPlaying({run, fetcher, cacheDir: join(tmpdir(), 'dsh-workboard-artwork'), media: createMediaRemote({spawn})}),
    videos: createVideos(fetcher),
    schedules: createSchedules(ctx),
    outputs: createOutputs({root: join(dshHome(), 'sessions')}),
    files: createRecentFiles(),
    open: createOpener(ctx, run),
    clipboard: createClipboard({run}),
    network: createNetwork({run}),
  };
  const handlers = createHandlers(store, fetcher, createAgentWatch(ctx), createLauncher(ctx), services);
  ctx.effect(() => () => { void store.close(); }, 'dsh-workboard: storage');
  ctx.effect(() => () => { services.system.stop(); services.clipboard.stop(); services.network.stop(); services.nowPlaying.stop(); }, 'dsh-workboard: samplers');

  // 共享通道 /api 只允许一个 interceptor，每个方法注册独立的 Fetch 路由。
  for (const method of Object.keys(handlers)) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: `/api/${method}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handleRequest(request, handlers, store),
    }), `dsh-workboard: ${method}`);
  }

  const tools = ctx.get('tools');
  if (tools) for (const tool of createTools(store)) ctx.effect(() => tools.register(tool), `dsh-workboard: ${tool.name} tool`);

  const skills = ctx.get?.('skills');
  if (typeof skills?.register === 'function') {
    const content = readFileSync(new URL('./skills/workboard-widget.md', import.meta.url), 'utf8');
    ctx.effect(() => skills.register({...SKILL, content}), 'dsh-workboard: workboard-widget skill');
  }
}
