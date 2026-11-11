// Host 端：/api/dsh-desk/* 路由、看板 / 待办 / 速记存储、天气与日历代理、Agent 工具。
import {createFetcher} from './lib/http.js';
import {getWeather, searchPlaces} from './lib/weather.js';
import {parseICS, expandEvents} from './lib/ics.js';
import {parseFeed} from './lib/feed.js';

export const name = 'dsh-desk';
export const inject = ['connection'];

const NS = 'dsh-desk';
// storageDomain 的域名与表名必须匹配 /^[a-z][a-z0-9_]*$/。
const DOMAIN = 'dsh_desk';
const LEGACY_DOMAIN = 'dsh_bento';
const NOTE_KEY = 'inbox';
const DONE_KEEP_MS = 7 * 86400_000;
const MAX_TEXT = 2000;
const MAX_NOTE = 200_000;

// storageDomain 要求 zod schema；插件不带 zod 依赖，用只实现 safeParse/parse 的透传对象，校验在本文件里做。
const passthrough = {safeParse: data => ({success: true, data}), parse: data => data};
const TABLES = ['boards', 'todos', 'notes', 'prefs', 'habits'];
const ICS_TTL = 15 * 60_000;
const ICS_MAX_BYTES = 5_000_000;
const FEED_TTL = 15 * 60_000;
const FEED_MAX_BYTES = 3_000_000;
const MAX_RANGE = 62 * 86400_000;
const MAX_BOARDS = 12;
const MAX_HABITS = 30;
const HABIT_DAYS_KEPT = 400;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const BUILTIN_WIDGETS = [
  'desk.today', 'desk.todo', 'desk.note', 'desk.calendar', 'desk.weather', 'desk.clock',
  'desk.quote', 'desk.countdown', 'desk.worldclock', 'desk.focus', 'desk.links', 'desk.progress',
  'desk.agents', 'desk.feed', 'desk.habits',
];

export function defaultBoard(id) {
  return {
    apiVersion: 1, id, title: '',
    widgets: [{id: 'desk.today', size: 'bar'}, {id: 'desk.todo', size: 'l'}, {id: 'desk.calendar', size: 't'}, {id: 'desk.note', size: 't'}],
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

const legacyWidgetId = id => (typeof id === 'string' && id.startsWith('bento.') ? `desk.${id.slice(6)}` : id);

// 仅在新域为空时复制旧版 dsh-bento 的数据；JSON 后端只在写入时落盘，打开不存在的旧域不会留下空文件。
export async function migrateLegacy(domain, legacy) {
  try {
    if (TABLES.some(t => [...domain.table(t).entries()].length)) return false;
    let copied = false;
    for (const t of TABLES) {
      for (const [key, value] of legacy.table(t).entries()) {
        const record = t === 'boards' && value && typeof value === 'object'
          ? {...value, widgets: (value.widgets ?? []).map(w => ({...w, id: legacyWidgetId(w?.id)})), known: (value.known ?? []).map(legacyWidgetId)}
          : value;
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
      await migrateLegacy(domain, await facility.open(spec(LEGACY_DOMAIN)));
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

function createCalendar(fetcher) {
  const parsed = new Map();
  return async ({urls, from, to}) => {
    const start = Number(from);
    const end = Number(to);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_RANGE) throw new UserError('bad-range', 'invalid time range');
    const list = (Array.isArray(urls) ? urls : String(urls ?? '').split(/\s+/)).map(u => String(u).trim()).filter(Boolean).slice(0, 10);
    const errors = [];
    const events = [];
    await Promise.all(list.map(async (url, source) => {
      try {
        const text = await fetcher.get(url, {ttlMs: ICS_TTL, type: 'text', maxBytes: ICS_MAX_BYTES, timeoutMs: 15_000});
        let hit = parsed.get(url);
        if (!hit || hit.text !== text) { hit = {text, events: parseICS(text)}; parsed.set(url, hit); }
        for (const e of expandEvents(hit.events, start, end)) events.push({...e, source});
      } catch (error) {
        errors.push({url, message: String(error?.message || error)});
      }
    }));
    events.sort((a, b) => a.start - b.start || Number(b.allDay) - Number(a.allDay));
    return {events: events.slice(0, 500), errors};
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
  return {
    waiting,
    async overview() {
      if (cached && Date.now() - cached.at < 2000) return cached.value;
      const controller = ctx.get?.('sessionController');
      const schedule = ctx.get?.('schedule');
      let sessions = null;
      if (typeof controller?.list === 'function') {
        const result = await controller.list({}, AbortSignal.timeout(8000));
        sessions = (result?.items ?? [])
          .filter(s => s && !s.blank && s.origin !== 'subagent' && !s.parentSessionId)
          .map(s => ({id: s.sessionId, title: titleOf(s), running: Boolean(s.running), waiting: waiting.has(s.sessionId), updatedAt: Number(s.updatedAt) || 0, cwd: s.cwd ?? ''}))
          .sort((a, b) => Number(b.waiting) - Number(a.waiting) || Number(b.running) - Number(a.running) || b.updatedAt - a.updatedAt)
          .slice(0, 30);
      }
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

export function createHandlers(store, fetcher = createFetcher(), agents = null) {
  const calendar = createCalendar(fetcher);
  const feeds = createFeeds(fetcher);
  return {
    'dsh-desk/feed.get': p => feeds({urls: p?.urls, limit: p?.limit}),
    'dsh-desk/agent.overview': () => (agents ? agents.overview() : {sessions: null, schedules: null}),
    'dsh-desk/habit.list': () => store.listHabits(),
    'dsh-desk/habit.add': p => store.addHabit(p?.name),
    'dsh-desk/habit.check': p => store.checkHabit(p?.id, p?.day, p?.done),
    'dsh-desk/habit.remove': p => store.removeHabit(p?.id),
    'dsh-desk/board.list': () => store.listBoards(),
    'dsh-desk/board.create': p => store.createBoard(p?.title, p?.known),
    'dsh-desk/board.delete': p => store.deleteBoard(String(p?.id)),
    'dsh-desk/board.order': p => store.orderBoards(p?.order),
    'dsh-desk/prefs.get': () => store.getPrefs(),
    'dsh-desk/prefs.put': p => store.putPrefs(p?.prefs),
    'dsh-desk/weather.get': p => getWeather(fetcher, {lat: p?.lat, lon: p?.lon, unit: p?.unit}),
    'dsh-desk/geo.search': p => searchPlaces(fetcher, {query: p?.query, lang: p?.lang}),
    'dsh-desk/calendar.events': p => calendar({urls: p?.urls, from: p?.from, to: p?.to}),
    'dsh-desk/board.get': p => store.getBoard(String(p?.id || 'work')),
    'dsh-desk/board.put': p => store.putBoard(p?.board),
    'dsh-desk/todo.list': () => store.listTodos(),
    'dsh-desk/todo.add': p => store.addTodo(p?.text),
    'dsh-desk/todo.update': p => store.updateTodo(p?.id, {text: p?.text, done: p?.done}),
    'dsh-desk/todo.remove': p => store.removeTodo(p?.id),
    'dsh-desk/note.get': () => store.getNote(),
    'dsh-desk/note.put': p => store.putNote(p?.text),
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
    return reply(rpcId, fail(error instanceof UserError ? error.code : 'failed', String(error?.message || error)));
  }
}

const textResult = value => [{type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)}];

export function createTools(store) {
  return [
    {
      name: 'desk_todos',
      description: 'Read or change the to-do list on the user\'s Desk dashboard. `list` returns open items and items completed in the last 7 days, each with an id. Use `add` with `text`; `complete`, `reopen` and `remove` with the `id` from `list`.',
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
      name: 'desk_note',
      description: 'Read or change the scratch note on the user\'s Desk dashboard (plain text, usually Markdown). `read` returns the note; `append` adds `text` as a new line at the end; `replace` overwrites the whole note with `text`, so read it first.',
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
  ];
}

export function apply(ctx) {
  const store = createStore(ctx);
  const handlers = createHandlers(store, createFetcher(), createAgentWatch(ctx));
  ctx.effect(() => () => { void store.close(); }, 'dsh-desk: storage');

  // 共享通道 /api 只允许一个 interceptor，每个方法注册独立的 Fetch 路由。
  for (const method of Object.keys(handlers)) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: `/api/${method}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handleRequest(request, handlers, store),
    }), `dsh-desk: ${method}`);
  }

  const tools = ctx.get('tools');
  if (tools) for (const tool of createTools(store)) ctx.effect(() => tools.register(tool), `dsh-desk: ${tool.name} tool`);
}
