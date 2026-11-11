// Host 端：/api/dsh-bento/* 路由、看板 / 待办 / 速记存储、Agent 工具。
export const name = 'dsh-bento';
export const inject = ['connection'];

const NS = 'dsh-bento';
// storageDomain 的域名与表名必须匹配 /^[a-z][a-z0-9_]*$/。
const DOMAIN = 'dsh_bento';
const NOTE_KEY = 'inbox';
const DONE_KEEP_MS = 7 * 86400_000;
const MAX_TEXT = 2000;
const MAX_NOTE = 200_000;

// storageDomain 要求 zod schema；插件不带 zod 依赖，用只实现 safeParse/parse 的透传对象，校验在本文件里做。
const passthrough = {safeParse: data => ({success: true, data}), parse: data => data};
const TABLES = ['boards', 'todos', 'notes'];

export const BUILTIN_WIDGETS = ['bento.today', 'bento.todo', 'bento.note', 'bento.clock'];

export function defaultBoard(id) {
  return {
    apiVersion: 1, id, title: '',
    widgets: [{id: 'bento.today', size: 'bar'}, {id: 'bento.todo', size: 'l'}, {id: 'bento.note', size: 'l'}],
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

export function createStore(ctx) {
  let domain = null;
  const memory = Object.fromEntries(TABLES.map(t => [t, memoryTable()]));
  const state = {backend: 'memory', error: null};
  const table = name => (domain ? domain.table(name) : memory[name]);

  const ready = (async () => {
    const facility = ctx.get?.('storageDomain');
    if (!facility) { state.error = 'storageDomain unavailable'; return; }
    try {
      domain = await facility.open({name: DOMAIN, version: 1, tables: Object.fromEntries(TABLES.map(t => [t, {valueSchema: passthrough}]))});
      state.backend = 'storageDomain';
    } catch (error) {
      state.error = String(error?.message || error);
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

export function createHandlers(store) {
  return {
    'dsh-bento/board.get': p => store.getBoard(String(p?.id || 'work')),
    'dsh-bento/board.put': p => store.putBoard(p?.board),
    'dsh-bento/todo.list': () => store.listTodos(),
    'dsh-bento/todo.add': p => store.addTodo(p?.text),
    'dsh-bento/todo.update': p => store.updateTodo(p?.id, {text: p?.text, done: p?.done}),
    'dsh-bento/todo.remove': p => store.removeTodo(p?.id),
    'dsh-bento/note.get': () => store.getNote(),
    'dsh-bento/note.put': p => store.putNote(p?.text),
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
      name: 'bento_todos',
      description: 'Read or change the to-do list on the user\'s Bento dashboard. `list` returns open items and items completed in the last 7 days, each with an id. Use `add` with `text`; `complete`, `reopen` and `remove` with the `id` from `list`.',
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
      name: 'bento_note',
      description: 'Read or change the scratch note on the user\'s Bento dashboard (plain text, usually Markdown). `read` returns the note; `append` adds `text` as a new line at the end; `replace` overwrites the whole note with `text`, so read it first.',
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
  const handlers = createHandlers(store);
  ctx.effect(() => () => { void store.close(); }, 'dsh-bento: storage');

  // 共享通道 /api 只允许一个 interceptor，每个方法注册独立的 Fetch 路由。
  for (const method of Object.keys(handlers)) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: `/api/${method}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handleRequest(request, handlers, store),
    }), `dsh-bento: ${method}`);
  }

  const tools = ctx.get('tools');
  if (tools) for (const tool of createTools(store)) ctx.effect(() => tools.register(tool), `dsh-bento: ${tool.name} tool`);
}
