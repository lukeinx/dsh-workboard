// 用假 ctx 运行 Host 端，确认路由、看板 / 待办 / 速记读写和 Agent 工具。
import assert from 'node:assert/strict';
import {apply, createStore, createHandlers, migrateLegacy} from '../index.js';

const routes = new Map();
const tools = new Map();
const ctx = {
  effect: fn => fn(),
  get: key => (key === 'tools' ? {register: t => { tools.set(t.name, t); return () => {}; }} : undefined),
  connection: {fetch: {register: r => { routes.set(r.path, r); return () => {}; }}},
};
apply(ctx);

const call = async (method, payload = {}) => {
  const route = routes.get(`/api/dsh-desk/${method}`);
  assert.ok(route, `route ${method}`);
  const body = JSON.stringify({type: 'client-request', rpcId: 'r1', method: `dsh-desk/${method}`, payload});
  const response = await route.fetch(new Request(`http://127.0.0.1${route.path}`, {method: 'POST', headers: {'content-type': 'application/json'}, body}));
  const message = await response.json();
  assert.equal(message.rpcId, 'r1');
  return message.result;
};
const value = async (method, payload) => {
  const result = await call(method, payload);
  assert.equal(result.ok, true, result.error?.message);
  return result.value;
};

const board = await value('board.get', {id: 'work'});
assert.deepEqual(board.widgets.map(w => w.id), ['desk.today', 'desk.todo', 'desk.calendar', 'desk.note']);
assert.ok(board.known.includes('desk.clock'));
const saved = await value('board.put', {board: {...board, widgets: [...board.widgets, {id: 'hello.widget', size: 's'}], known: [...board.known, 'hello.widget']}});
assert.deepEqual(await value('board.get', {id: 'work'}), saved);
assert.equal((await call('board.put', {board: {id: '../x', widgets: []}})).ok, false);

const a = await value('todo.add', {text: '  write   README  '});
assert.equal(a.text, 'write README');
const b = await value('todo.add', {text: 'ship P0a'});
assert.equal((await call('todo.add', {text: '   '})).error.code, 'dsh-desk/empty-text');
await value('todo.update', {id: a.id, done: true});
let todos = await value('todo.list');
assert.deepEqual(todos.map(t => [t.id, t.done]), [[b.id, false], [a.id, true]]);
await value('todo.remove', {id: b.id});
assert.equal((await call('todo.remove', {id: b.id})).error.code, 'dsh-desk/not-found');

assert.equal((await value('note.get')).text, '');
await value('note.put', {text: '- line one'});

const todoTool = tools.get('desk_todos');
const noteTool = tools.get('desk_note');
const added = await todoTool.execute({action: 'add', text: 'from agent'});
await todoTool.execute({action: 'complete', id: added.added.id});
todos = (await todoTool.execute({action: 'list'})).todos;
assert.ok(todos.some(t => t.text === 'from agent' && t.done));
await noteTool.execute({action: 'append', text: '- line two'});
assert.equal((await value('note.get')).text, '- line one\n- line two');
assert.equal((await noteTool.execute({action: 'read'})).text, '- line one\n- line two');
assert.equal(todoTool.output.render({}, {ok: 1})[0].type, 'text');

assert.deepEqual((await value('board.list')).map(b => b.id), ['work']);
const life = await value('board.create', {title: 'Life'});
assert.deepEqual((await value('board.list')).map(b => [b.id, b.title]), [['work', ''], [life.id, 'Life']]);
await value('board.order', {order: [life.id, 'work']});
assert.equal((await value('board.list'))[0].id, life.id);
await value('board.delete', {id: 'work'});
assert.deepEqual((await value('board.list')).map(b => b.id), [life.id]);
assert.equal((await call('board.delete', {id: life.id})).error.code, 'dsh-desk/last-board');

assert.deepEqual((await value('prefs.put', {prefs: {location: {name: 'Shenzhen', lat: 22.5, lon: 114.1}}})).location, {name: 'Shenzhen', lat: 22.5, lon: 114.1});
assert.equal((await value('prefs.put', {prefs: {location: null}})).location, undefined);
assert.equal((await call('prefs.put', {prefs: {'../x': 1}})).ok, false);

// 日历：假数据源，一个成功一个失败。
const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:1', 'SUMMARY:Sync', 'DTSTART:20261112T020000Z', 'DTEND:20261112T030000Z', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
const fetcher = {get: async url => { if (url.includes('bad')) throw new Error('HTTP 404'); return ics; }};
const handlers = createHandlers(createStore({}), fetcher);
const cal = await handlers['dsh-desk/calendar.events']({urls: ['https://a.example/x.ics', 'https://bad.example/y.ics'], from: Date.UTC(2026, 10, 11), to: Date.UTC(2026, 10, 13)});
assert.deepEqual(cal.events.map(e => [e.title, e.source]), [['Sync', 0]]);
assert.deepEqual(cal.errors.map(e => e.message), ['HTTP 404']);
await assert.rejects(handlers['dsh-desk/calendar.events']({urls: [], from: 0, to: 365 * 86400_000}));

// 旧版 dsh_bento 数据：新域为空时复制并改写内置 widget id，已有数据时不动。
const fakeDomain = (data = {}) => {
  const tables = new Map();
  let closed = false;
  return {
    table: name => {
      if (!tables.has(name)) tables.set(name, new Map(Object.entries(data[name] ?? {})));
      const map = tables.get(name);
      return {get: k => map.get(k), entries: () => map.entries(), put: async (k, v) => { map.set(k, v); }, delete: async k => map.delete(k)};
    },
    close: async () => { closed = true; },
    get closed() { return closed; },
  };
};
const legacyData = {boards: {work: {apiVersion: 1, id: 'work', title: '默认', widgets: [{id: 'bento.today', size: 'bar'}, {id: 'hello.widget', size: 's'}], known: ['bento.today', 'hello.widget']}}, todos: {t1: {id: 't1', text: 'old'}}, prefs: {unit: 'c'}};
const fresh = fakeDomain();
const legacy = fakeDomain(legacyData);
assert.equal(await migrateLegacy(fresh, legacy), true);
assert.ok(legacy.closed);
assert.deepEqual(fresh.table('boards').get('work').widgets.map(w => w.id), ['desk.today', 'hello.widget']);
assert.deepEqual(fresh.table('boards').get('work').known, ['desk.today', 'hello.widget']);
assert.equal(fresh.table('todos').get('t1').text, 'old');
assert.equal(fresh.table('prefs').get('unit'), 'c');
assert.equal(await migrateLegacy(fresh, fakeDomain({todos: {t2: {id: 't2'}}})), false);
assert.equal(fresh.table('todos').get('t2'), undefined);
console.log('smoke ok');
