// 用假 ctx 运行 Host 端，确认路由、看板读写和客户端回报。
import assert from 'node:assert/strict';
import {apply} from '../index.js';

const routes = new Map();
const ctx = {
  effect: fn => fn(),
  get: () => undefined,
  connection: {fetch: {register: r => { routes.set(r.path, r); return () => {}; }}},
};
apply(ctx);
assert.ok(routes.has('/api/dsh-bento/board.get'));

const call = async (method, payload = {}) => {
  const body = JSON.stringify({type: 'client-request', rpcId: 'r1', method, payload});
  const route = routes.get(`/api/${method}`);
  const response = await route.fetch(new Request(`http://127.0.0.1${route.path}`, {method: 'POST', headers: {'content-type': 'application/json'}, body}));
  const message = await response.json();
  assert.equal(message.rpcId, 'r1');
  return message.result;
};

const first = await call('dsh-bento/board.get', {id: 'work'});
assert.equal(first.ok, true);
assert.equal(first.value.widgets[0].id, 'bento.clock');

const board = {apiVersion: 1, id: 'work', title: '', widgets: [{id: 'hello.widget', size: 's'}]};
assert.equal((await call('dsh-bento/board.put', {board})).ok, true);
assert.deepEqual((await call('dsh-bento/board.get', {id: 'work'})).value, board);
assert.equal((await call('dsh-bento/board.put', {board: {}})).ok, false);

await call('dsh-bento/client.report', {widgets: [{id: 'bento.clock'}]});
const ping = await call('dsh-bento/ping');
assert.equal(ping.value.storage.backend, 'memory');
assert.equal(ping.value.client.widgets[0].id, 'bento.clock');
console.log('smoke ok');
