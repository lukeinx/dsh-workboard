// Host 端：/api/dsh-bento/* 路由、看板存储、Agent 工具。
export const name = 'dsh-bento';
export const inject = ['connection'];

const NS = 'dsh-bento';
const DOMAIN = 'dsh_bento';

// storageDomain 要求 zod schema；插件不带 zod 依赖，用只实现 safeParse/parse 的透传对象。
const passthrough = {
  safeParse: data => ({success: true, data}),
  parse: data => data,
};

const DEFAULT_BOARD = {apiVersion: 1, id: 'work', title: '', widgets: [{id: 'bento.clock', size: 'm'}]};

function createStore(ctx) {
  const memory = new Map();
  let domain = null;
  const state = {backend: 'memory', error: null};

  async function open() {
    const facility = ctx.get('storageDomain');
    if (!facility) { state.error = 'storageDomain unavailable'; return; }
    try {
      domain = await facility.open({name: DOMAIN, version: 1, tables: {boards: {valueSchema: passthrough}}});
      state.backend = 'storageDomain';
    } catch (error) {
      state.error = String(error?.message || error);
    }
  }

  return {
    state,
    open,
    close: () => domain?.close(),
    getBoard(id) {
      return (domain ? domain.table('boards').get(id) : memory.get(id)) ?? {...DEFAULT_BOARD, id};
    },
    async putBoard(board) {
      if (domain) await domain.table('boards').put(board.id, board);
      else memory.set(board.id, board);
      return board;
    },
  };
}

const reply = (rpcId, result) => Response.json({type: 'server-response', rpcId, result});
const ok = value => ({ok: true, value});
const fail = (code, message) => ({ok: false, error: {code: `${NS}/${code}`, message, details: {}}});

export function createHandlers(store, probe) {
  return {
    'dsh-bento/ping': () => ok({storage: store.state, client: probe.client}),
    'dsh-bento/board.get': payload => ok(store.getBoard(String(payload?.id || 'work'))),
    'dsh-bento/board.put': async payload => {
      const board = payload?.board;
      if (!board || typeof board.id !== 'string' || !Array.isArray(board.widgets)) return fail('bad-board', 'board must have id and widgets');
      return ok(await store.putBoard(board));
    },
    'dsh-bento/client.report': payload => {
      probe.client = {...payload, at: new Date().toISOString()};
      return ok(true);
    },
  };
}

export async function handleRequest(request, handlers) {
  let message;
  try { message = await request.json(); } catch { return new Response('body is not JSON', {status: 400}); }
  const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
  const handler = message?.type === 'client-request' ? handlers[message.method] : undefined;
  if (!handler) return reply(rpcId, {ok: false, error: {code: 'gateway/bad-request', message: 'invalid request', details: {}}});
  try {
    return reply(rpcId, await handler(message.payload));
  } catch (error) {
    return reply(rpcId, fail('failed', String(error?.message || error)));
  }
}

export function apply(ctx) {
  const store = createStore(ctx);
  const probe = {client: null};
  const handlers = createHandlers(store, probe);
  ctx.effect(() => {
    void store.open();
    return () => { void store.close(); };
  }, 'dsh-bento: storage');

  // 共享通道 /api 只允许一个 interceptor，每个方法注册独立的 Fetch 路由。
  for (const method of Object.keys(handlers)) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: `/api/${method}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handleRequest(request, handlers),
    }), `dsh-bento: ${method}`);
  }

  const tools = ctx.get('tools');
  if (tools) {
    ctx.effect(() => tools.register({
      name: 'bento_status',
      description: 'Report the Bento dashboard plugin status: storage backend and the widgets the Web page has registered.',
      parameters: {type: 'object', properties: {}, additionalProperties: false},
      output: {
        schema: {type: 'object'},
        render: (_args, value) => [{type: 'text', text: JSON.stringify(value, null, 2)}],
      },
      execute: async () => ({storage: store.state, client: probe.client}),
    }), 'dsh-bento: bento_status tool');
  }
}
