// 用假 ctx 运行 Host 端，确认路由、看板 / 待办 / 速记读写和 Agent 工具。
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {zstdCompressSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {apply, defaultBoard, createStore, createHandlers, createAgentWatch, createLauncher, createWorkspaces, createRunning, createGit, createGithub, createSchedules, createOpener, lastMessageText, migrateLegacy} from '../index.js';
import {createOutputs, parseOutputs} from '../lib/outputs.js';
import {createRecentFiles} from '../lib/files.js';
import {createClipboard} from '../lib/clipboard.js';
import {createNetwork, parseRoute, parseIpRoute, parseNetstat, parseProcNetDev, parseScutilProxy, parseTargets} from '../lib/network.js';
import {createRunner} from '../lib/exec.js';
import {createSystemCalendar, parseOutput as parseSysCal} from '../lib/syscal.js';
import {createSystem, parsePmset, parseVmStat, parseMeminfo} from '../lib/system.js';
import {createPhotos, findPhotos} from '../lib/photo.js';
import {createMarket, parseSymbol} from '../lib/market.js';
import {createTrending, parseGithubTrending, parseZhihuHeat} from '../lib/trending.js';
import {createFetcher} from '../lib/http.js';
import {createUsage, zstdFrames} from '../lib/usage.js';
import {createQuotes, parseHitokoto} from '../lib/quote.js';
import {checkHtml, allowedUrl, cleanSpec} from '../lib/widgets.js';
import {ADAPTER, createMediaRemote, createNowPlaying, mergeMedia, parseMedia, parseState, SCRIPTS} from '../lib/nowplaying.js';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createVideos, parseSource, parseYoutubeFeed, parseBiliArchives, parseChannelId} from '../lib/videos.js';
import {parseFeed} from '../lib/feed.js';
import {createAttention} from '../lib/attention.js';

const routes = new Map();
const tools = new Map();
const skills = new Map();
const ctx = {
  effect: fn => fn(),
  get: key => (key === 'tools' ? {register: t => { tools.set(t.name, t); return () => {}; }}
    : key === 'skills' ? {register: s => { skills.set(s.name, s); return () => {}; }} : undefined),
  connection: {fetch: {register: r => { routes.set(r.path, r); return () => {}; }}},
};
apply(ctx);

const call = async (method, payload = {}) => {
  const route = routes.get(`/api/dsh-workboard/${method}`);
  assert.ok(route, `route ${method}`);
  const body = JSON.stringify({type: 'client-request', rpcId: 'r1', method: `dsh-workboard/${method}`, payload});
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
assert.deepEqual(board.widgets, defaultBoard('work').widgets);
assert.equal(board.widgets[0].id, 'workboard.today');
assert.ok(board.known.includes('workboard.clock'));
const saved = await value('board.put', {board: {...board, widgets: [...board.widgets, {id: 'hello.widget', size: 's'}], known: [...board.known, 'hello.widget']}});
assert.deepEqual(await value('board.get', {id: 'work'}), saved);
assert.equal((await call('board.put', {board: {id: '../x', widgets: []}})).ok, false);

const a = await value('todo.add', {text: '  write   README  '});
assert.equal(a.text, 'write README');
const b = await value('todo.add', {text: 'ship P0a'});
assert.equal((await call('todo.add', {text: '   '})).error.code, 'dsh-workboard/empty-text');
await value('todo.update', {id: a.id, done: true});
let todos = await value('todo.list');
assert.deepEqual(todos.map(t => [t.id, t.done]), [[b.id, false], [a.id, true]]);
await value('todo.remove', {id: b.id});
assert.equal((await call('todo.remove', {id: b.id})).error.code, 'dsh-workboard/not-found');

assert.equal((await value('note.get')).text, '');
await value('note.put', {text: '- line one'});

const todoTool = tools.get('workboard_todos');
const noteTool = tools.get('workboard_note');
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
const adopted = await value('board.adopt', {id: life.id, known: ['plug.a', 'workboard.clock'], place: [{id: 'plug.a', size: 'm'}]});
assert.deepEqual(adopted.widgets, [{id: 'plug.a', size: 'm'}]);
const work = await value('board.get', {id: 'work'});
assert.ok(work.known.includes('plug.a') && !work.widgets.some(w => w.id === 'plug.a'));
assert.deepEqual((await value('board.adopt', {id: life.id, known: ['plug.a'], place: [{id: 'plug.a', size: 'm'}]})).widgets.length, 1);
await value('board.order', {order: [life.id, 'work']});
assert.equal((await value('board.list'))[0].id, life.id);
await value('board.delete', {id: 'work'});
assert.deepEqual((await value('board.list')).map(b => b.id), [life.id]);
assert.equal((await call('board.delete', {id: life.id})).error.code, 'dsh-workboard/last-board');

assert.deepEqual((await value('prefs.put', {prefs: {location: {name: 'Shenzhen', lat: 22.5, lon: 114.1}}})).location, {name: 'Shenzhen', lat: 22.5, lon: 114.1});
assert.equal((await value('prefs.put', {prefs: {location: null}})).location, undefined);
assert.equal((await call('prefs.put', {prefs: {'../x': 1}})).ok, false);

// 日历：假数据源，一个成功一个失败。
const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:1', 'SUMMARY:Sync', 'DTSTART:20261112T020000Z', 'DTEND:20261112T030000Z', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
const fetcher = {get: async url => { if (url.includes('bad')) throw new Error('HTTP 404'); return ics; }};
const handlers = createHandlers(createStore({}), fetcher);
const cal = await handlers['dsh-workboard/calendar.events']({urls: ['https://a.example/x.ics', 'https://bad.example/y.ics'], from: Date.UTC(2026, 10, 11), to: Date.UTC(2026, 10, 13)});
assert.deepEqual(cal.events.map(e => [e.title, e.source]), [['Sync', 0]]);
assert.deepEqual(cal.errors.map(e => e.message), ['HTTP 404']);
await assert.rejects(handlers['dsh-workboard/calendar.events']({urls: [], from: 0, to: 365 * 86400_000}));

// 系统日历：假 osascript，合并进事件；非 macOS 不调用命令。
assert.deepEqual(parseSysCal('{"status":0}'), {status: 'ask', events: []});
assert.equal(parseSysCal('{"status":2}').status, 'denied');
let sysAsked = 0;
const sysCal = createSystemCalendar({os: 'darwin', run: async (cmd, args) => {
  assert.equal(cmd, 'osascript');
  if (args.includes('request')) { sysAsked++; return '{"status":3}'; }
  return JSON.stringify({status: 3, events: [{title: 'Standup', location: '', allDay: false, start: Date.UTC(2026, 10, 12, 1), end: Date.UTC(2026, 10, 12, 2), calendar: 'Work'}]});
}});
const sysHandlers = createHandlers(createStore({}), fetcher, null, null, {systemCalendar: sysCal});
const merged = await sysHandlers['dsh-workboard/calendar.events']({urls: ['https://a.example/x.ics'], from: Date.UTC(2026, 10, 11), to: Date.UTC(2026, 10, 13), system: true});
assert.deepEqual(merged.events.map(e => [e.title, e.source]), [['Standup', 'system'], ['Sync', 0]]);
assert.equal(merged.system, 'ok');
assert.equal((await sysHandlers['dsh-workboard/calendar.events']({urls: [], from: Date.UTC(2026, 10, 11), to: Date.UTC(2026, 10, 13)})).system, null);
assert.deepEqual(await sysHandlers['dsh-workboard/calendar.connect'](), {status: 'ok'});
assert.equal(sysAsked, 1);
assert.deepEqual(await createSystemCalendar({os: 'linux', run: async () => { throw new Error('no'); }}).events({from: 0, to: 1}), {status: 'unsupported', events: []});

// 更早的 dsh_bento 数据：新域为空时复制并改写内置 widget id，已有数据时不动。
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
assert.deepEqual(fresh.table('boards').get('work').widgets.map(w => w.id), ['workboard.today', 'hello.widget']);
assert.deepEqual(fresh.table('boards').get('work').known, ['workboard.today', 'hello.widget']);
assert.equal(fresh.table('todos').get('t1').text, 'old');
assert.equal(fresh.table('prefs').get('unit'), 'c');
assert.equal(await migrateLegacy(fresh, fakeDomain({todos: {t2: {id: 't2'}}})), false);
assert.equal(fresh.table('todos').get('t2'), undefined);
// 旧版 dsh_desk 数据：widget id 和自定义 widget 里的沙箱对象一并改名。
const fromDesk = fakeDomain();
assert.equal(await migrateLegacy(fromDesk, fakeDomain({
  boards: {work: {apiVersion: 1, id: 'work', widgets: [{id: 'desk.todo', size: 'l'}, {id: 'custom.w', size: 'm'}], known: ['desk.todo']}},
  widgets: {w: {id: 'w', html: '<div class="desk">desk</div><script>desk.on(r); n.textContent = desk.config?.goal ?? desk["data"]; window.desk.save(1); my.desk.x = 1;</script>'}},
})), true);
assert.deepEqual(fromDesk.table('boards').get('work').widgets.map(w => w.id), ['workboard.todo', 'custom.w']);
assert.equal(fromDesk.table('widgets').get('w').html, '<div class="desk">desk</div><script>workboard.on(r); n.textContent = workboard.config?.goal ?? workboard["data"]; window.workboard.save(1); my.desk.x = 1;</script>');
// 习惯：增删、按天切换、非法日期。
const habit = await value('habit.add', {name: '  read   20 pages '});
assert.equal(habit.name, 'read 20 pages');
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-11'})).days, ['2026-11-11']);
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-10', done: true})).days, ['2026-11-10', '2026-11-11']);
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-11'})).days, ['2026-11-10']);
assert.equal((await call('habit.check', {id: habit.id, day: 'yesterday'})).error.code, 'dsh-workboard/bad-day');
assert.deepEqual((await value('habit.list')).map(h => h.id), [habit.id]);
await value('habit.remove', {id: habit.id});
assert.deepEqual(await value('habit.list'), []);
// 已读：标记、查询、取消，忽略空值。
assert.deepEqual(await value('read.check', {urls: ['https://r.example/1', 'https://r.example/2']}), []);
assert.equal(await value('read.mark', {urls: ['https://r.example/1', '', null]}), 1);
assert.deepEqual(await value('read.check', {urls: ['https://r.example/1', 'https://r.example/2']}), ['https://r.example/1']);
await value('read.mark', {urls: ['https://r.example/1'], read: false});
assert.deepEqual(await value('read.check', {urls: ['https://r.example/1']}), []);

// 订阅：两个源按时间合并，失败的源进 errors。
const rss = '<rss version="2.0"><channel><title>R</title><item><title>Old</title><link>https://r.example/1</link><guid>r-1</guid><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
const atomFeed = '<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title><entry><title>New</title><link href="https://a.example/2"/><updated>2026-11-11T10:00:00Z</updated></entry></feed>';
const feedFetcher = {get: async url => { if (url.includes('bad')) throw new Error('HTTP 500'); return url.includes('atom') ? atomFeed : rss; }};
const feed = await createHandlers(createStore({}), feedFetcher)['dsh-workboard/feed.get']({urls: ['https://x.example/rss', 'https://x.example/atom', 'https://bad.example/f']});
assert.deepEqual(feed.items.map(i => [i.title, i.feed, i.link]), [['New', 'A', 'https://a.example/2'], ['Old', 'R', 'https://r.example/1']]);
assert.deepEqual(feed.errors.map(e => e.message), ['HTTP 500']);
assert.deepEqual(feed.items.map(i => i.guid), ['', 'r-1']);

// Agent 概览：假 sessionController / schedule，等待确认时标 waiting，答复后清除。
const listeners = new Map();
const summaries = [
  {sessionId: 's1', updatedAt: 3, running: false, blank: false, projections: {values: {title: 'Idle chat'}}},
  {sessionId: 's2', updatedAt: 1, running: true, blank: false, projections: {values: {title: {title: 'Busy'}}}},
  {sessionId: 's3', updatedAt: 2, running: false, blank: false},
  {sessionId: 'sub', updatedAt: 9, running: true, blank: false, origin: 'subagent', parentSessionId: 's2'},
  {sessionId: 'empty', updatedAt: 9, running: false, blank: true},
];
const tasks = [
  {id: 'k1', title: 'Daily report', status: 'active', scheduledAt: '2026-11-12T01:00:00.000Z', executionActive: true},
  {id: 'k2', title: 'Done', status: 'completed', scheduledAt: '2026-11-01T01:00:00.000Z'},
];
const agentCtx = {
  on: (name, fn) => { listeners.set(name, fn); return () => {}; },
  get: key => (key === 'sessionController' ? {list: async () => ({items: summaries})} : key === 'schedule' ? {catalog: async () => tasks} : undefined),
};
const agentHandlers = createHandlers(createStore({}), feedFetcher, createAgentWatch(agentCtx));
let answer;
const pending = listeners.get('approval/request')({agent: {id: 's3'}, toolName: 'bash'}, () => new Promise(r => { answer = r; }));
let overview = await agentHandlers['dsh-workboard/agent.overview']();
assert.deepEqual(overview.sessions.map(s => [s.id, s.title, s.running, s.waiting]), [['s3', '', false, true], ['s2', 'Busy', true, false], ['s1', 'Idle chat', false, false]]);
assert.deepEqual(overview.schedules.map(t => [t.id, t.running, t.scheduledAt]), [['k1', true, Date.UTC(2026, 10, 12, 1)]]);
answer('allowed-once');
assert.equal(await pending, 'allowed-once');
assert.equal(createAgentWatch(agentCtx).waiting.size, 0);
assert.deepEqual(await createHandlers(createStore({}), feedFetcher)['dsh-workboard/agent.overview'](), {sessions: null, schedules: null});

// 收集箱：保留换行、工具增删清空。
const inboxItem = await value('inbox.add', {text: '  https://example.com\nread later  '});
assert.equal(inboxItem.text, 'https://example.com\nread later');
assert.equal((await call('inbox.add', {text: ' '})).error.code, 'dsh-workboard/empty-text');
const inboxTool = tools.get('workboard_inbox');
await inboxTool.execute({action: 'add', text: 'idea'});
assert.deepEqual((await inboxTool.execute({action: 'list'})).items.map(i => i.text), ['https://example.com\nread later', 'idea']);
await inboxTool.execute({action: 'remove', id: inboxItem.id});
assert.deepEqual((await value('inbox.list')).map(i => i.text), ['idea']);
assert.equal((await inboxTool.execute({action: 'clear'})).cleared, 1);
assert.deepEqual(await value('inbox.list'), []);

// 新开会话：先 create 再 prompt，cwd 必须是已存在的绝对目录。
const created = [];
const prompted = [];
const launchCtx = {get: key => (key === 'sessionController' ? {create: async r => { created.push(r); return {sessionId: 'new1'}; }, prompt: async r => { prompted.push(r); return {accepted: true}; }} : undefined)};
const launchHandlers = createHandlers(createStore({}), feedFetcher, null, createLauncher(launchCtx));
assert.deepEqual(await launchHandlers['dsh-workboard/agent.start']({prompt: ' hi ', cwd: '/tmp'}), {sessionId: 'new1'});
assert.deepEqual(created, [{cwd: '/tmp'}]);
assert.deepEqual([prompted[0].sessionId, prompted[0].mode, prompted[0].content], ['new1', 'queue', [{type: 'text', text: 'hi'}]]);
await assert.rejects(launchHandlers['dsh-workboard/agent.start']({prompt: 'x', cwd: 'relative/dir'}), /absolute/);
await assert.rejects(launchHandlers['dsh-workboard/agent.start']({prompt: 'x', cwd: '/definitely/missing'}), /not a directory/);
await assert.rejects(createHandlers(createStore({}))['dsh-workboard/agent.start']({prompt: 'x'}), /cannot start/);

// 工作区列表：只返回 id / path / title，没有 registry 时为 null。
const wsCtx = {get: key => (key === 'workspaceRegistry' ? {list: () => [{id: 'w1', path: '/tmp/a', title: 'A', sessionIds: ['s1']}, {id: 'w2', path: ''}]} : undefined)};
assert.deepEqual(await createHandlers(createStore({}), feedFetcher, null, null, {workspaces: createWorkspaces(wsCtx)})['dsh-workboard/workspace.list'](), [{id: 'w1', path: '/tmp/a', title: 'A'}]);
assert.equal(await createHandlers(createStore({}), feedFetcher, null, null, {workspaces: createWorkspaces({get: () => undefined})})['dsh-workboard/workspace.list'](), null);

// 用量：多 frame zstd 日志（末尾半个 frame 模拟正在写入）+ 未压缩日志；不报 usage 的请求只计请求数。
const usageRoot = mkdtempSync(join(tmpdir(), 'workboard-usage-'));
const t0 = new Date(2026, 10, 12, 10).getTime();
const msg = (time, provider, model, usage) => JSON.stringify({type: 'assistant/message', seq: 1, time, data: {message: {role: 'assistant', source: {kind: 'model', provider, model}}, ...(usage ? {usage} : {})}});
mkdirSync(join(usageRoot, 'ws', 'session-a'), {recursive: true});
const frameA = zstdCompressSync(Buffer.from(`${JSON.stringify({type: 'session', version: 4})}\n${msg(t0, 'p1', 'm1', {inputTokens: 10, outputTokens: 5, cacheReadTokens: 100})}\n`));
const frameB = zstdCompressSync(Buffer.from(`${msg(t0 + 1000, 'cursor', 'opus')}\n${msg(t0 - 86400_000, 'p1', 'm1', {inputTokens: 1, outputTokens: 1})}\n`));
const partial = zstdCompressSync(Buffer.from(`${msg(t0, 'p1', 'm1', {inputTokens: 999, outputTokens: 999})}\n`));
writeFileSync(join(usageRoot, 'ws', 'session-a', 'session.v4.jsonl.zstd'), Buffer.concat([frameA, frameB, partial.subarray(0, partial.length - 3)]));
assert.equal(zstdFrames(Buffer.concat([frameA, frameB])).length, 2);
mkdirSync(join(usageRoot, 'ws', 'session-b'), {recursive: true});
writeFileSync(join(usageRoot, 'ws', 'session-b', 'session.v4.jsonl'), `${msg(t0, 'p1', 'm1', {inputTokens: 2, outputTokens: 3, cacheWriteTokens: 4})}\n`);
const usage = createUsage({root: usageRoot, now: () => t0});
const usageHandlers = createHandlers(createStore({}), feedFetcher, null, null, {usage});
const sum = await usageHandlers['dsh-workboard/usage.get']({days: 7});
assert.equal(sum.today, '2026-11-12');
assert.equal(sum.files, 2);
assert.deepEqual(sum.rows.map(r => [r.day, r.provider, r.model, r.requests, r.reported, r.input, r.output, r.cacheRead, r.cacheWrite]), [
  ['2026-11-11', 'p1', 'm1', 1, 1, 1, 1, 0, 0],
  ['2026-11-12', 'p1', 'm1', 2, 2, 12, 8, 100, 4],
  ['2026-11-12', 'cursor', 'opus', 1, 0, 0, 0, 0, 0],
]);
assert.deepEqual((await usageHandlers['dsh-workboard/usage.get']({days: 1})).rows.map(r => r.day), ['2026-11-12', '2026-11-12']);
await assert.rejects(createHandlers(createStore({}))['dsh-workboard/usage.get']({}), /not available/);
rmSync(usageRoot, {recursive: true, force: true});

// 运行中：只列未完成的目标与运行中 / 刚结束的任务，停止时带上属主会话。
const nowMs = Date.UTC(2026, 10, 12, 3);
const killedJobs = [];
const runCtx = {get: key => ({
  agents: {list: () => [{id: 's1'}, {id: 's2'}, {id: 'gone'}]},
  goals: {get: a => ({s1: {objective: 'Ship widgets', phase: 'active', roundsStarted: 2, maxGoalRounds: 10, activation: 'armed', updatedAt: nowMs}, s2: {objective: 'Old', phase: 'complete', updatedAt: nowMs - 3600_000}})[a.id] ?? (a.id === 'gone' ? (() => { throw new Error('not live'); })() : undefined)},
  jobs: {
    list: owner => { if (owner === 'gone') throw new Error('foreign'); return owner === 's1' ? [{id: 'bash-1', kind: 'bash', label: 'npm test', owner: 's1', status: 'running', startedAt: nowMs - 60_000}, {id: 'bash-0', kind: 'bash', label: 'old', owner: 's1', status: 'completed', startedAt: 0, finishedAt: nowMs - 3600_000}] : owner ? [] : [{id: 'bash-2', kind: 'bash', label: 'free', status: 'failed', startedAt: nowMs - 120_000, finishedAt: nowMs - 60_000}]; },
    kill: (id, owner, reason) => { killedJobs.push([id, owner, reason]); return 'requested'; },
  },
  sessionController: {list: async () => ({items: [{sessionId: 's1', projections: {values: {title: 'Widgets'}}}]})},
})[key]};
const runHandlers = createHandlers(createStore({}), feedFetcher, null, null, {running: createRunning(runCtx, () => nowMs)});
const running = await runHandlers['dsh-workboard/running.get']();
assert.deepEqual(running.goals.map(g => [g.sessionId, g.title, g.objective, g.phase, g.rounds, g.maxRounds, g.armed]), [['s1', 'Widgets', 'Ship widgets', 'active', 2, 10, true]]);
assert.deepEqual(running.jobs.map(j => [j.id, j.sessionId, j.status]), [['bash-1', 's1', 'running'], ['bash-2', '', 'failed']]);
assert.deepEqual(await runHandlers['dsh-workboard/running.kill']({id: 'bash-1', sessionId: 's1'}), {result: 'requested'});
assert.deepEqual(killedJobs, [['bash-1', 's1', 'stopped from Workboard']]);
assert.deepEqual(await createHandlers(createStore({}), feedFetcher, null, null, {running: createRunning({get: () => undefined})})['dsh-workboard/running.get'](), {goals: null, jobs: null});

// Git：真实仓库，领先 1 个提交、一处改动、一个未跟踪文件、一个上游已删除的分支；工作区里的非仓库跳过，设置里的非仓库报错。
const gitRoot = mkdtempSync(join(tmpdir(), 'workboard-git-'));
const g = (cwd, ...args) => execFileSync('git', args, {cwd, stdio: 'pipe', env: {...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t'}});
mkdirSync(join(gitRoot, 'remote.git'));
g(join(gitRoot, 'remote.git'), 'init', '--bare', '-q', '-b', 'main');
g(gitRoot, 'clone', '-q', join(gitRoot, 'remote.git'), 'work');
const gitWork = join(gitRoot, 'work');
writeFileSync(join(gitWork, 'a.txt'), '1');
g(gitWork, 'add', '.'); g(gitWork, 'commit', '-qm', 'one'); g(gitWork, 'push', '-q', 'origin', 'main');
g(gitWork, 'checkout', '-qb', 'feature'); g(gitWork, 'push', '-qu', 'origin', 'feature'); g(gitWork, 'checkout', '-q', 'main');
g(gitWork, 'push', '-q', 'origin', '--delete', 'feature'); g(gitWork, 'fetch', '-q', '--prune');
writeFileSync(join(gitWork, 'a.txt'), '2'); g(gitWork, 'commit', '-qam', 'two');
writeFileSync(join(gitWork, 'a.txt'), '3'); writeFileSync(join(gitWork, 'new.txt'), 'x');
mkdirSync(join(gitRoot, 'plain'));
const gitSvc = createGit({get: () => ({list: () => [{path: gitWork}, {path: join(gitRoot, 'plain')}]})}, createRunner());
const gitHandlers = createHandlers(createStore({}), feedFetcher, null, null, {git: gitSvc});
const repos = (await gitHandlers['dsh-workboard/git.status']({})).repos;
assert.deepEqual(repos.map(r => [r.name, r.branch, r.upstream, r.ahead, r.behind, r.changed, r.untracked, r.gone, r.lastSubject]), [['work', 'main', 'origin/main', 1, 0, 1, 1, ['feature'], 'two']]);
const explicitRepos = (await gitHandlers['dsh-workboard/git.status']({paths: `${gitWork}\n${join(gitRoot, 'plain')}`})).repos;
assert.equal(explicitRepos.length, 2);
assert.match(explicitRepos[1].error, /not a git repository/);
assert.equal((await gitHandlers['dsh-workboard/git.fetch']({})).errors.length, 0);
rmSync(gitRoot, {recursive: true, force: true});

// GitHub：假 gh，三类查询各一次，结果缓存；gh 不存在时给出可读错误。
const ghCalls = [];
const fakeGh = async (cmd, args) => {
  ghCalls.push(args.slice(0, 3).join(' '));
  return Buffer.from(JSON.stringify(args[2] === '--review-requested=@me' ? [{number: 7, title: 'Fix', url: 'https://github.com/o/r/pull/7', repository: {nameWithOwner: 'o/r'}, author: {login: 'amy'}, isDraft: false, updatedAt: '2026-11-12T01:00:00Z'}] : []));
};
const gh = createGithub(fakeGh);
const ghValue = await createHandlers(createStore({}), feedFetcher, null, null, {github: gh})['dsh-workboard/github.get']({});
assert.deepEqual(ghValue.review.map(x => [x.repo, x.number, x.author, x.url]), [['o/r', 7, 'amy', 'https://github.com/o/r/pull/7']]);
assert.deepEqual([ghValue.mine, ghValue.assigned], [[], []]);
await gh({});
assert.equal(ghCalls.length, 3);
await gh({fresh: true});
assert.equal(ghCalls.length, 6);
const missing = createGithub(async () => { const e = new Error('spawn gh ENOENT'); e.code = 'not-found'; throw e; });
await assert.rejects(missing({}), /not installed/);

// 待处理：等确认 > 卡住的目标 > 失败作业 > 待 Review > 结转待办 > 收集箱；gh 慢或缺失时不拖住其余来源。
const attnListeners = new Map();
const attnCtx = {
  on: (name, fn) => { attnListeners.set(name, fn); return () => {}; },
  get: key => (key === 'sessionController' ? {list: async () => ({items: summaries})} : runCtx.get(key)),
};
const blockedCtx = {get: key => (key === 'goals' ? {get: a => (a.id === 's2' ? {objective: 'Stuck goal', phase: 'blocked', blockedReason: {message: 'needs token'}, updatedAt: nowMs} : undefined)} : runCtx.get(key))};
const attnStore = createStore({});
const oldTodo = await attnStore.addTodo('carry me');
await attnStore.addInbox('later');
const attnHandlers = createHandlers(attnStore, feedFetcher, createAgentWatch(attnCtx), null, {running: createRunning(blockedCtx, () => nowMs), github: createGithub(fakeGh)});
let release;
const waitingReq = attnListeners.get('approval/request')({agent: {id: 's3'}}, () => new Promise(r => { release = r; }));
const attn = await attnHandlers['dsh-workboard/attention.get']({dayStart: Date.now() + 1000});
assert.deepEqual(attn.items.map(i => [i.kind, i.title]), [
  ['waiting', ''], ['blocked', 'Stuck goal'], ['failed', 'free'], ['review', 'Fix'], ['todo', 'carry me'], ['inbox', ''],
]);
assert.deepEqual([attn.items[0].sessionId, attn.items[1].detail, attn.items[3].url, attn.items[4].todoId, attn.items[5].count], ['s3', 'needs token', 'https://github.com/o/r/pull/7', oldTodo.id, 1]);
assert.deepEqual(attn.sources, {sessions: true, running: true, github: 'ok'});
release('allowed-once');
await waitingReq;
const quiet = await attnHandlers['dsh-workboard/attention.get']({github: false, inbox: false});
assert.deepEqual(quiet.items.map(i => i.kind), ['waiting', 'blocked', 'failed']);
assert.equal(quiet.sources.github, 'off');
const slowGh = createAttention({store: createStore({}), github: () => new Promise(() => {}), githubWaitMs: 20});
assert.deepEqual(await slowGh({}), {items: [], sources: {sessions: false, running: false, github: 'pending'}});
const noGh = createAttention({store: createStore({}), github: createGithub(async () => { const e = new Error('ENOENT'); e.code = 'not-found'; throw e; })});
assert.equal((await noGh({})).sources.github, 'missing');

// 系统状态：解析 vm_stat / meminfo / pmset，采样进环形缓冲。
assert.equal(parseVmStat('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 10.\nPages active: 100.\nPages wired down: 50.\nPages occupied by compressor: 10.\n', 1e12), 160 * 16384);
assert.equal(parseMeminfo('MemTotal:       1000 kB\nMemFree: 100 kB\nMemAvailable:    400 kB\n'), 600 * 1024);
assert.deepEqual(parsePmset("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t80%; AC attached; not charging present: true"), {percent: 80, charging: false, plugged: true, minutes: null});
assert.deepEqual(parsePmset("Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1)\t42%; discharging; 3:05 remaining present: true"), {percent: 42, charging: false, plugged: false, minutes: 185});
assert.equal(parsePmset('No batteries'), null);
const sys = createSystem({os: 'darwin', run: async cmd => Buffer.from(cmd === 'vm_stat' ? '(page size of 4096 bytes)\nPages active: 1000.\n' : '-InternalBattery-0\t55%; charging; 0:40 remaining')});
const sv = await createHandlers(createStore({}), feedFetcher, null, null, {system: sys})['dsh-workboard/system.get']();
sys.stop();
assert.equal(sv.memory.used, 4096 * 1000);
assert.deepEqual(sv.battery, {percent: 55, charging: true, plugged: true, minutes: 40});
assert.ok(sv.cpu >= 0 && sv.cpu <= 1 && sv.cores > 0 && sv.disk.total > sv.disk.free);
assert.equal(sv.history.length, 1);

// 相框：跳过隐藏目录和图库包，顺序轮播会回绕；macOS 走 sips 转码并缓存；不存在的文件夹报 bad-dir。
const picRoot = mkdtempSync(join(tmpdir(), 'workboard-photo-'));
for (const d of ['a', '.hidden', 'Lib.photoslibrary', 'a/b']) mkdirSync(join(picRoot, d), {recursive: true});
for (const f of ['1.jpg', 'a/2.PNG', 'a/b/3.heic', 'a/notes.txt', '.hidden/4.jpg', 'Lib.photoslibrary/5.jpg', '.6.jpg']) writeFileSync(join(picRoot, f), f);
assert.deepEqual((await findPhotos(picRoot)).map(p => p.slice(picRoot.length + 1)), ['1.jpg', 'a/2.PNG', 'a/b/3.heic']);
const plain = createPhotos({os: 'linux'});
const p0 = await plain.next({dir: picRoot, shuffle: false});
assert.deepEqual([p0.count, p0.index, p0.name, p0.src], [3, 0, '1.jpg', `data:image/jpeg;base64,${Buffer.from('1.jpg').toString('base64')}`]);
assert.equal((await plain.next({dir: picRoot, index: 0, shuffle: false})).name, 'a/2.PNG');
assert.equal((await plain.next({dir: picRoot, index: 1, shuffle: false})).name, '1.jpg');
const sipsCalls = [];
const sips = createPhotos({os: 'darwin', cacheDir: join(picRoot, '.cache'), run: async (cmd, args) => { sipsCalls.push(args.at(-3)); writeFileSync(args.at(-1), 'JPEG'); return Buffer.alloc(0); }});
const p2 = await sips.next({dir: picRoot, index: 1, shuffle: false});
assert.deepEqual([p2.name, p2.src], ['a/b/3.heic', `data:image/jpeg;base64,${Buffer.from('JPEG').toString('base64')}`]);
await sips.next({dir: picRoot, index: 1, shuffle: false});
assert.equal(sipsCalls.length, 1);
const photoHandlers = createHandlers(createStore({}), feedFetcher, null, null, {photos: plain});
assert.equal((await photoHandlers['dsh-workboard/photo.next']({dir: picRoot, shuffle: false})).name, '1.jpg');
await assert.rejects(photoHandlers['dsh-workboard/photo.next']({dir: join(picRoot, 'missing')}), /not a directory/);
rmSync(picRoot, {recursive: true, force: true});

// 行情：代码分流到三个数据源，腾讯响应按 GBK 解码，单个数据源失败只影响对应行。
assert.deepEqual(['sh600519 茅台', 'hk00700', 'usbrk.b', 'usd/cny', 'BTC', 'eth/cny', 'cg:pepe', 'xyz'].map(l => { const x = parseSymbol(l); return [x.kind, x.symbol]; }),
  [['stock', 'sh600519'], ['stock', 'hk00700'], ['stock', 'usBRK.B'], ['fx', 'USD/CNY'], ['crypto', 'BTC'], ['crypto', 'ETH/CNY'], ['crypto', 'cg:pepe'], ['unknown', 'xyz']]);
const gbk = Buffer.from('MX7M2tG2v9i5yX4wMDcwMH40MDMuNjAwfjQwOS42MDB+', 'base64');
const tencentBody = Buffer.concat([Buffer.from('v_hk00700="'), gbk, Buffer.from(`${'~'.repeat(26)}-6.000~-1.46~x";\n`)]);
const marketUrls = [];
const marketFetcher = createFetcher({fetchImpl: async url => {
  marketUrls.push(url);
  if (url.includes('gtimg')) return new Response(tencentBody);
  if (url.includes('er-api')) return Response.json({result: 'success', rates: {USD: 1, CNY: 7, HKD: 7.8}});
  return new Response('down', {status: 503});
}});
const mq = await createHandlers(createStore({}), marketFetcher, null, null, {market: createMarket(marketFetcher)})['dsh-workboard/market.quotes']({symbols: 'hk00700 鹅\nHKD/CNY\nBTC\nnope'});
assert.deepEqual(mq.items.map(i => [i.symbol, i.label, i.name, i.price, i.pct, i.currency]),
  [['hk00700', '鹅', '腾讯控股', 403.6, -1.46, 'HKD'], ['HKD/CNY', '', 'HKD/CNY', 7 / 7.8, null, 'CNY'], ['BTC', '', undefined, undefined, undefined, undefined], ['nope', '', undefined, undefined, undefined, undefined]]);
assert.match(mq.items[2].error, /503/);
assert.equal(mq.items[3].error, 'unknown symbol');
assert.equal(marketUrls.filter(u => u.includes('gtimg'))[0], 'https://qt.gtimg.cn/q=hk00700');

assert.equal(parseZhihuHeat('681 万热度'), 6_810_000);
assert.deepEqual(parseGithubTrending('<article class="Box-row"><h2><a href="/meta/astryx">meta / astryx</a></h2><p class="col-9 x">Design &amp; agents</p> 2,776 stars today</article>'),
  [{title: 'meta / astryx', url: 'https://github.com/meta/astryx', hot: 2776, meta: 'Design & agents'}]);
const trendCalls = [];
const trendFetcher = createFetcher({fetchImpl: async (url, init) => {
  trendCalls.push([url, init.method, init.headers.referer]);
  if (url.includes('weibo')) return Response.json({data: {realtime: [{word: '话题', num: 5, label_name: '热'}, {word: '广告', is_ad: 1}]}});
  if (url.includes('36kr')) return Response.json({data: {hotRankList: [{templateMaterial: {itemId: 9, widgetTitle: 'T', statRead: 3}}]}});
  return new Response('down', {status: 503});
}});
const trendHandle = createHandlers(createStore({}), trendFetcher, null, null, {trending: createTrending(trendFetcher)})['dsh-workboard/trending.get'];
assert.deepEqual((await trendHandle({source: 'weibo'})).items, [{title: '话题', url: 'https://s.weibo.com/weibo?q=%23%E8%AF%9D%E9%A2%98%23', hot: 5, meta: '', tag: '热'}]);
assert.equal((await trendHandle({source: '36kr'})).items[0].url, 'https://36kr.com/p/9');
assert.deepEqual(trendCalls.map(c => c[1]), ['GET', 'POST']);
assert.equal(trendCalls[0][2], 'https://weibo.com/');
await assert.rejects(trendHandle({source: 'hn'}), /503/);
await assert.rejects(trendHandle({source: '__proto__'}), /unknown source/);

assert.deepEqual(parseHitokoto({hitokoto: ' 一句 ', from: '书', from_who: '某人'}), {text: '一句', by: '某人 《书》'});
assert.equal(parseHitokoto({hitokoto: ''}), null);
{
  let seq = 0;
  const quotes = createQuotes({get: async () => ({hitokoto: `q${seq++}`, from: 'x'})});
  assert.deepEqual((await Promise.all([quotes.get({day: 'd1', n: 1}), quotes.get({day: 'd1', n: 0})])).map(q => q.text), ['q1', 'q0']);
  assert.equal((await quotes.get({day: 'd1', n: 1})).text, 'q1');
  assert.equal((await quotes.get({day: 'd2', n: 0})).text, 'q2');
}

// 自定义 widget：脚本语法检查、增改删、数据、错误回报、联网白名单，删除时清理看板。
{
  assert.ok(skills.get('workboard-widget')?.content.includes('window.workboard'));
  assert.deepEqual(checkHtml('<div></div><script>const a = 1;</script>'), {errors: [], warnings: []});
  assert.match(checkHtml('<p>x</p>\n<script>\nconst a = ;\n</script>').errors[0], /^line 3: SyntaxError/);
  assert.match(checkHtml('<script src="https://cdn.x/y.js"></script>').errors[0], /external scripts/);
  assert.equal(checkHtml('<script type="application/json">{not js</script>').errors.length, 0);
  assert.equal(checkHtml('<img src="https://x/y.png"><script>fetch("/a")</script>').warnings.length, 2);
  assert.equal(checkHtml('<script>workboard.fetch("https://x")</script>').warnings.length, 0);
  assert.throws(() => cleanSpec({title: 'x', html: '<b></b>', sizes: ['huge']}), /sizes/);
  assert.equal(cleanSpec({title: 't', html: 'h', sizes: ['l', 'm'], defaultSize: 's'}).defaultSize, 'l');
  assert.equal(allowedUrl('https://api.github.com/repos/a/b', ['https://api.github.com/repos/']), 'https://api.github.com/repos/a/b');
  assert.throws(() => allowedUrl('https://api.github.com.evil.io/x', ['https://api.github.com/']), /not under/);

  const tool = tools.get('workboard_widget');
  await assert.rejects(tool.execute({action: 'create', title: 'Bad', html: '<script>if (</script>'}), /html not saved/);
  const {created, warnings} = await tool.execute({action: 'create', id: 'stars', title: '  Stars  ', html: '<b id=n></b><script>n.textContent = workboard.config.repo</script>',
    sizes: ['s', 'm'], settings: [{key: 'repo', type: 'text', label: 'Repo', default: 'a/b'}], fetch: ['https://api.example.com/']});
  assert.deepEqual(warnings, []);
  assert.equal(created.title, 'Stars');
  assert.equal(created.rev, 1);
  await assert.rejects(tool.execute({action: 'create', id: 'stars', title: 'x', html: 'x'}), /already exists/);
  const listed = await value('widget.list');
  assert.deepEqual(listed.map(w => [w.id, w.defaultSize, w.html]), [['stars', 's', undefined]]);

  await value('widget.report', {id: 'stars', error: 'line 1: boom'});
  assert.equal((await tool.execute({action: 'list'})).widgets[0].lastError, 'line 1: boom');
  const updated = (await tool.execute({action: 'update', id: 'stars', sizes: ['m']})).updated;
  assert.equal(updated.rev, 2);
  assert.equal(updated.lastError, null);
  assert.deepEqual(updated.settings.map(f => f.key), ['repo']);

  assert.equal((await tool.execute({action: 'set_data', id: 'stars', data: {n: 3}})).dataRev, 1);
  assert.equal((await value('widget.save', {id: 'stars', data: {n: 4}})).dataRev, 2);
  assert.deepEqual((await tool.execute({action: 'get', id: 'stars'})).data, {n: 4});
  assert.equal((await call('widget.save', {id: 'stars', data: {big: 'x'.repeat(210_000)}})).error.code, 'dsh-workboard/too-large');

  assert.equal((await call('widget.fetch', {id: 'stars', url: 'https://other.example.com/x'})).error.code, 'dsh-workboard/not-allowed');
  assert.equal((await call('widget.put', {id: 'stars', html: '<script>}</script>'})).error.code, 'dsh-workboard/bad-html');
  assert.equal((await value('widget.put', {id: 'stars', title: 'Repo stars', html: '<i></i>'})).title, 'Repo stars');

  const work = await value('board.get', {id: 'work'});
  await value('board.put', {board: {...work, widgets: [...work.widgets, {id: 'custom.stars', size: 'm'}], known: [...work.known, 'custom.stars']}});
  assert.equal((await tool.execute({action: 'remove', id: 'stars'})).removed, true);
  const after = await value('board.get', {id: 'work'});
  assert.ok(!after.widgets.some(w => w.id === 'custom.stars') && !after.known.includes('custom.stars'));
  assert.equal((await call('widget.get', {id: 'stars'})).error.code, 'dsh-workboard/not-found');
  assert.equal((await call('widget.get', {id: '../x'})).error.code, 'dsh-workboard/bad-widget');
}
{
  const widgetFetcher = createFetcher({fetchImpl: async url => (url.endsWith('.png') ? new Response(new Uint8Array([1, 2, 3]), {headers: {'content-type': 'image/png'}}) : Response.json({ok: url}))});
  const store = createStore({});
  const handle = createHandlers(store, widgetFetcher);
  await store.createWidget({id: 'img', title: 'I', html: 'x', fetch: ['https://cdn.example.com/']});
  assert.deepEqual(await handle['dsh-workboard/widget.fetch']({id: 'img', url: 'https://cdn.example.com/a.json'}), {ok: 'https://cdn.example.com/a.json'});
  assert.equal(await handle['dsh-workboard/widget.fetch']({id: 'img', url: 'https://cdn.example.com/a.png', as: 'dataUrl'}), 'data:image/png;base64,AQID');
}

// 定时任务：列表字段、暂停 / 恢复 / 删除映射到 schedule.edit，立即运行与执行中、不存在的结果。
{
  const edits = [];
  const entry = {id: 'k1', kind: 'rrule', title: '', prompt: 'Daily report', rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0', scheduledAt: '2026-11-13T01:00:00.000Z', status: 'active', target: {kind: 'new', create: {cwd: '/tmp'}}, lastDelivery: {deliveredAt: '2026-11-12T01:00:00.000Z', targetSessionId: 'session-x'}};
  const svc = {
    catalog: async () => [entry, {id: 'k2', kind: 'every', title: 'Ping', prompt: 'p', everySeconds: 3600, scheduledAt: '', status: 'paused', target: {kind: 'session', sessionId: 'session-y'}}],
    edit: async req => { edits.push(req); return req.id === 'gone' ? {id: req.id, code: 'schedule_not_found'} : req.action === 'delete' ? {id: req.id, deleted: true} : {...entry, status: req.patch.active ? 'active' : 'paused'}; },
    run: async req => (req.id === 'busy' ? {id: req.id, code: 'schedule_execution_pending'} : {...entry, executionActive: true}),
    deleteInactive: async () => ({deleted: 2}),
  };
  const sh = createHandlers(createStore({}), feedFetcher, null, null, {schedules: createSchedules({get: k => (k === 'schedule' ? svc : undefined)})});
  const rows = await sh['dsh-workboard/schedule.list']();
  assert.deepEqual(rows.map(r => [r.id, r.title, r.kind, r.status, r.timing.rrule ?? r.timing.everySeconds, r.lastSessionId, r.sessionId, r.cwd]),
    [['k1', 'Daily report', 'rrule', 'active', 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0', 'session-x', '', '/tmp'], ['k2', 'Ping', 'every', 'paused', 3600, '', 'session-y', '']]);
  assert.equal((await sh['dsh-workboard/schedule.edit']({id: 'k1', action: 'pause'})).status, 'paused');
  await sh['dsh-workboard/schedule.edit']({id: 'k1', action: 'delete'});
  assert.deepEqual(edits.map(e => [e.action, e.patch?.active]), [['update', false], ['delete', undefined]]);
  await assert.rejects(sh['dsh-workboard/schedule.edit']({id: 'gone', action: 'resume'}), /no longer exists/);
  await assert.rejects(sh['dsh-workboard/schedule.edit']({id: 'k1', action: 'explode'}), /unknown action/);
  assert.equal((await sh['dsh-workboard/schedule.run']({id: 'k1'})).running, true);
  assert.deepEqual(await sh['dsh-workboard/schedule.run']({id: 'busy'}), {pending: true});
  assert.deepEqual(await sh['dsh-workboard/schedule.clear'](), {deleted: 2});
  assert.equal(await createHandlers(createStore({}), feedFetcher, null, null, {schedules: createSchedules({get: () => undefined})})['dsh-workboard/schedule.list'](), null);
}

// 收藏会话：按传入顺序返回，带最后一条消息；已删除的会话标 missing。
{
  const reads = [];
  const pinCtx = {get: key => (key === 'sessionController' ? {
    list: async () => ({items: summaries}),
    events: async req => { reads.push(req.address.sessionId); return {records: [
      {type: 'event', event: {type: 'user/message', data: {message: {content: [{type: 'text', text: 'hello'}]}}}},
      {type: 'event', event: {type: 'assistant/message', data: {message: {content: [{type: 'text', text: ' Done:\n all   good '}]}}}},
      {type: 'event', event: {type: 'tool/call', data: {}}},
    ]}; },
  } : undefined)};
  const watch = createAgentWatch(pinCtx);
  const ph = createHandlers(createStore({}), feedFetcher, watch);
  const pins = await ph['dsh-workboard/session.pinned']({ids: ['s2', 'nope', 's1']});
  assert.deepEqual(pins.map(p => [p.id, p.title ?? '', p.preview ?? '', Boolean(p.missing)]), [['s2', 'Busy', 'Done: all good', false], ['nope', '', '', true], ['s1', 'Idle chat', 'Done: all good', false]]);
  await ph['dsh-workboard/session.pinned']({ids: ['s2']});
  assert.deepEqual(reads, ['s2', 's1']);
  assert.deepEqual((await ph['dsh-workboard/session.list']()).map(s => s.id), ['s1', 's3', 's2']);
  assert.equal(lastMessageText([{event: {type: 'user/message', data: {message: {content: 'plain'}}}}]), '> plain');
  assert.equal(await createHandlers(createStore({}), feedFetcher)['dsh-workboard/session.pinned']({ids: ['s1']}), null);
}

// 产出物：交付与新建文档合并去重，子 Agent 归到父会话，代码文件和失败的写入不算。
{
  const root = mkdtempSync(join(tmpdir(), 'workboard-out-'));
  const docs = join(root, 'docs');
  mkdirSync(docs);
  writeFileSync(join(docs, 'plan.md'), '# plan');
  writeFileSync(join(docs, 'deck.pptx'), 'x');
  const ev = (type, time, data) => JSON.stringify({type, seq: 1, time, data});
  const result = (time, path, isError = false) => ev('tool/result', time, {message: {isError}, meta: {operation: 'create', path}});
  mkdirSync(join(root, 'ws', 'session-a'), {recursive: true});
  writeFileSync(join(root, 'ws', 'session-a', 'session.v4.jsonl.zstd'), zstdCompressSync(Buffer.from([
    JSON.stringify({type: 'session', id: 'session-a'}),
    result(1000, join(docs, 'plan.md')),
    result(1100, join(docs, 'index.js')),
    result(1200, join(docs, 'bad.md'), true),
    ev('deliverables/presented', 2000, {files: [{path: join(docs, 'plan.md'), description: 'The plan'}, {path: 'relative.md'}]}),
  ].join('\n'))));
  mkdirSync(join(root, 'ws', 'session-b'), {recursive: true});
  writeFileSync(join(root, 'ws', 'session-b', 'session.v4.jsonl'), [JSON.stringify({type: 'session', id: 'session-b', parentSession: 'session-a'}), result(3000, join(docs, 'deck.pptx')), result(3100, join(docs, 'gone.md'))].join('\n'));
  const oh = createHandlers(createStore({}), feedFetcher, null, null, {outputs: createOutputs({root})});
  const out = await oh['dsh-workboard/outputs.list']({});
  assert.deepEqual(out.items.map(i => [i.name, i.kind, i.sessionId, i.exists, i.description, i.time]), [
    ['gone.md', 'created', 'session-a', false, '', 3100],
    ['deck.pptx', 'created', 'session-a', true, '', 3000],
    ['plan.md', 'presented', 'session-a', true, 'The plan', 2000],
  ]);
  assert.deepEqual((await oh['dsh-workboard/outputs.list']({created: false})).items.map(i => i.name), ['plan.md']);
  assert.equal(parseOutputs('').session, '');

  // 最近文件：跳过隐藏项，可排除文件夹，可执行类型标 risky，不存在的文件夹进 errors。
  writeFileSync(join(docs, '.DS_Store'), '');
  writeFileSync(join(docs, 'setup.dmg'), '');
  mkdirSync(join(docs, 'sub'));
  const fh = createHandlers(createStore({}), feedFetcher, null, null, {files: createRecentFiles()});
  const recent = await fh['dsh-workboard/files.recent']({dirs: `${docs}\n${join(root, 'missing')}`});
  assert.deepEqual(recent.items.map(i => i.name).sort(), ['deck.pptx', 'plan.md', 'setup.dmg', 'sub']);
  assert.equal(recent.items.find(i => i.name === 'setup.dmg').risky, true);
  assert.equal(recent.items.find(i => i.name === 'sub').folder, true);
  assert.equal(recent.errors.length, 1);
  assert.ok(!(await fh['dsh-workboard/files.recent']({dirs: docs, folders: false})).items.some(i => i.folder));

  // 打开文件：走 openWorkspacePath，可执行类型只定位，相对路径和不存在的文件拒绝。
  const opened = [];
  const opener = createOpener({get: k => (k === 'sessionController' ? {canOpenWorkspacePath: () => true, openWorkspacePath: async req => { opened.push(req); return {opened: true}; }} : undefined)}, null, 'linux');
  const openHandle = createHandlers(createStore({}), feedFetcher, null, null, {open: opener})['dsh-workboard/file.open'];
  await openHandle({path: join(docs, 'plan.md')});
  await openHandle({path: join(docs, 'plan.md'), reveal: true});
  await openHandle({path: join(docs, 'setup.dmg')});
  assert.deepEqual(opened.map(r => r.action ?? 'open'), ['open', 'reveal', 'reveal']);
  await assert.rejects(openHandle({path: 'plan.md'}), /absolute/);
  await assert.rejects(openHandle({path: join(docs, 'nope.md')}), /no such file/);
  rmSync(root, {recursive: true, force: true});
}

// 剪贴板：只在内容变化时入列，重复内容上移；清空后当前内容不会被重新加入。
{
  let clip = 'first';
  let clock = 0;
  const cb = createClipboard({os: 'darwin', now: () => clock, run: async () => Buffer.from(clip)});
  assert.deepEqual((await cb.get()).items.map(i => i.text), ['first']);
  clip = 'second'; clock = 1;
  assert.deepEqual((await cb.get()).items.map(i => i.text), ['second', 'first']);
  clip = 'first'; clock = 2;
  assert.deepEqual((await cb.get()).items.map(i => i.text), ['first', 'second']);
  const id = (await cb.get()).items[1].id;
  assert.equal(cb.remove(id), 1);
  cb.remove('');
  assert.deepEqual((await cb.get()).items, []);
  cb.stop();
  assert.deepEqual(await createClipboard({os: 'win32', run: async () => Buffer.alloc(0)}).get(), {supported: false, items: []});
}

// 网络：解析 route / netstat / scutil 和测速站点；系统代理开启时 curl 经代理。
{
  assert.deepEqual(parseRoute('   route to: default\n    gateway: 10.0.0.1\n  interface: en0\n'), {iface: 'en0', gateway: '10.0.0.1'});
  assert.deepEqual(parseIpRoute('default via 192.168.1.1 dev wlan0 proto dhcp'), {iface: 'wlan0', gateway: '192.168.1.1'});
  const ns = 'Name  Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll\nen0   1500  <Link#15>   c0:c7:db:0a:32:73 145 0 1000 95 0 500 0\nen0   1500  10.64.84/24   10.64.84.70     145 - 1000 95 - 500 -\n';
  assert.deepEqual(parseNetstat(ns, 'en0'), {rx: 1000, tx: 500});
  assert.deepEqual(parseNetstat('en0 1500 <Link#4> 145 0 2000 95 0 900 0', 'en0'), {rx: 2000, tx: 900});
  assert.deepEqual(parseProcNetDev('  eth0: 1234 5 0 0 0 0 0 0 4321 6 0 0 0 0 0 0', 'eth0'), {rx: 1234, tx: 4321});
  const scutil = '<dictionary> {\n  HTTPEnable : 1\n  HTTPPort : 7897\n  HTTPProxy : 127.0.0.1\n  HTTPSEnable : 0\n  ProxyAutoConfigEnable : 0\n  SOCKSEnable : 0\n}';
  assert.deepEqual(parseScutilProxy(scutil), {http: {host: '127.0.0.1', port: 7897}, https: null, socks: null, pac: ''});
  assert.deepEqual(parseTargets('Baidu https://www.baidu.com\nhttps://github.com\nnot a url'), [{name: 'Baidu', url: 'https://www.baidu.com'}, {name: 'github.com', url: 'https://github.com'}]);
  const curls = [];
  let clock = 0;
  const net = createNetwork({os: 'darwin', now: () => clock, interfaces: () => ({en0: [{address: 'fe80::1', family: 'IPv6', internal: false}, {address: '10.0.0.5', family: 'IPv4', internal: false}]}), run: async (cmd, args) => {
    if (cmd === 'route') return Buffer.from('gateway: 10.0.0.1\ninterface: en0\n');
    if (cmd === 'netstat') return Buffer.from(`en0 1500 <Link#4> 1 0 ${1000 + clock * 10} 1 0 ${500 + clock} 0`);
    if (cmd === 'scutil') return Buffer.from(scutil);
    curls.push(args);
    if (args.includes('https://ipinfo.io/json')) return Buffer.from(JSON.stringify({ip: '1.2.3.4', city: 'LA', country: 'US', org: 'AS1 Test'}));
    if (args.includes('https://down.example')) throw Object.assign(new Error('timeout'), {code: 'failed'});
    return Buffer.from('200 0.120');
  }});
  await net.get({targets: 'Up https://up.example\nDown https://down.example'});
  clock = 2000;
  const nv = await net.get({targets: 'Up https://up.example\nDown https://down.example'});
  net.stop();
  assert.deepEqual([nv.iface, nv.gateway, nv.addresses[0].address, nv.via], ['en0', '10.0.0.1', '10.0.0.5', '127.0.0.1:7897']);
  assert.deepEqual(nv.rates, [[10000, 1000]]);
  assert.deepEqual(nv.ip, {ip: '1.2.3.4', city: 'LA', region: '', country: 'US', org: 'Test'});
  assert.deepEqual(nv.pings.map(p => [p.name, p.ms, p.error]), [['Up', 120, undefined], ['Down', undefined, 'failed']]);
  assert.ok(curls.every(a => a.includes('-x') && a.includes('http://127.0.0.1:7897')));
  assert.equal(curls.length, 3);
}

{
  const US = '\u001f';
  assert.equal(parseState('stopped\n', 'music'), null);
  const st = parseState(['playing', 'Song', 'Artist', 'Album', '215000', '61500', 'ABC', 'https://i.scdn.co/x'].join(US) + '\n', 'spotify');
  assert.deepEqual(st, {app: 'spotify', state: 'playing', title: 'Song', artist: 'Artist', album: 'Album', duration: 215000, position: 61500, id: 'ABC', artUrl: 'https://i.scdn.co/x'});
  assert.equal(parseState(['paused', 'S', '', '', 'x', '', '', 'javascript:1'].join(US), 'music').artUrl, '');
  assert.ok(SCRIPTS.music.includes('tell application "Music"') && SCRIPTS.spotify.includes('artwork url'));

  assert.deepEqual(await createNowPlaying({os: 'linux', run: async () => { throw new Error('no'); }, now: () => 5}).get(), {supported: false, apps: [], at: 5, denied: null, track: null});
  const calls = [];
  let procs = 'Finder\nMusic\nSpotify\n';
  let deny = false;
  const npRun = async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (cmd === 'ps') return Buffer.from(procs);
    if (cmd === 'osascript' && args[1].startsWith('tell application "Music"\nset npState')) {
      if (deny) throw new Error('execution error: Not authorized to send Apple events to Music. (-1743)');
      return Buffer.from(['paused', 'Old', 'A', 'B', '1000', '10', 'M1', ''].join(US));
    }
    if (cmd === 'osascript' && args[1].startsWith('tell application "Spotify"\nset npState')) return Buffer.from(['playing', 'Live', 'C', 'D', '2000', '20', 'spotify:track:1', 'https://i.scdn.co/a'].join(US));
    return Buffer.from('');
  };
  const npFetch = {get: async url => { calls.push(['fetch', url]); return {type: 'image/jpeg', base64: 'QUJD'}; }};
  let npClock = 1000;
  const np = createNowPlaying({os: 'darwin', run: npRun, fetcher: npFetch, now: () => npClock});
  const live = await np.get({app: 'auto'});
  assert.deepEqual([live.apps, live.track.app, live.track.title, live.track.art], [['music', 'spotify'], 'spotify', 'Live', 'data:image/jpeg;base64,QUJD']);
  assert.equal('artUrl' in live.track, false);
  assert.equal((await np.get({app: 'music'})).track.title, 'Old');
  const before = calls.length;
  await np.get({app: 'music'});
  assert.equal(calls.length, before, 'cached within TTL');
  await np.control({app: 'spotify', action: 'next'});
  assert.deepEqual(calls.at(-1), ['osascript', '-e', 'tell application "Spotify" to next track']);
  await np.control({app: 'music', action: 'open'});
  assert.deepEqual(calls.at(-1), ['open', '-a', 'Music']);
  await assert.rejects(np.control({app: 'music', action: 'rm -rf'}), /unknown action/);
  await assert.rejects(np.control({app: 'finder', action: 'next'}), /unknown app/);
  procs = 'Music\n';
  deny = true;
  npClock += 5000;
  const blocked = await np.get({app: 'auto'});
  assert.deepEqual([blocked.track, blocked.denied], [null, 'music']);
  procs = '';
  await assert.rejects(np.control({app: 'music', action: 'toggle'}), /not running/);
  const npHandlers = createHandlers(createStore({}), undefined, null, null, {nowPlaying: np});
  assert.equal((await npHandlers['dsh-workboard/nowplaying.get']({app: 'auto'})).supported, true);

  const mr = mergeMedia({}, {type: 'data', diff: false, payload: {bundleIdentifier: 'com.tencent.QQMusicMac', title: 'A', artworkData: 'X', artworkMimeType: 'image/png', playing: true}});
  assert.equal(mergeMedia(mr, {type: 'data', diff: true, payload: {playing: false}}).artworkData, 'X');
  assert.deepEqual(mergeMedia(mr, {type: 'data', diff: true, payload: {title: 'B', playing: null}}), {bundleIdentifier: 'com.tencent.QQMusicMac', title: 'B'});
  assert.equal(mergeMedia(mr, {type: 'other'}), mr);
  const pm = parseMedia({bundleIdentifier: 'com.google.Chrome', title: 'Clip', artist: 'Ch', durationMicros: 200_000_000, elapsedTimeMicros: 10_000_000, timestampEpochMicros: 1_000_000_000, playbackRate: 2, playing: true}, 1_005_000);
  assert.deepEqual([pm.app, pm.state, pm.position, pm.duration, pm.album], ['system', 'playing', 20_000, 200_000, '']);
  assert.equal(parseMedia({bundleIdentifier: 'x', title: 'T', elapsedTimeMicros: 5_000_000, durationMicros: 3_000_000, timestampEpochMicros: 1, playing: false}, 1e9).position, 3000);
  assert.equal(parseMedia({bundleIdentifier: 'a"b', title: 'T'}, 0), null);
  assert.equal(parseMedia({bundleIdentifier: 'a.b'}, 0), null);
  assert.equal(parseMedia({bundleIdentifier: 'com.apple.WebKit.GPU', parentApplicationBundleIdentifier: 'com.apple.Safari', title: 'V'}, 0).bundle, 'com.apple.Safari');

  const kids = [];
  const fakeSpawn = (cmd, args) => {
    const c = new EventEmitter();
    c.stdout = new PassThrough();
    c.args = [cmd, ...args];
    c.kill = () => { c.killed = true; c.emit('exit', null, 'SIGTERM'); };
    kids.push(c);
    return c;
  };
  const line = (c, diff, payload) => c.stdout.write(`${JSON.stringify({type: 'data', diff, payload})}\n`);
  let mrClock = 0;
  const hold = setInterval(() => {}, 1000);
  const remote = createMediaRemote({spawn: fakeSpawn, now: () => mrClock, settleMs: 30, startMs: 200, idleMs: 1000, retryMs: 5000});
  const first = remote.snapshot();
  assert.deepEqual(kids[0].args, [...ADAPTER, 'stream', '--micros']);
  line(kids[0], false, {});
  setTimeout(() => line(kids[0], false, {bundleIdentifier: 'com.tencent.QQMusicMac', title: 'Song', playing: true}), 5);
  assert.equal((await first).title, 'Song');
  line(kids[0], true, {artworkData: 'QUJD', artworkMimeType: 'image/jpeg'});
  await new Promise(r => setImmediate(r));
  assert.equal((await remote.snapshot()).artworkData, 'QUJD');
  line(kids[0], false, {});
  await new Promise(r => setImmediate(r));
  const t0 = Date.now();
  assert.deepEqual(await remote.snapshot(), {});
  assert.ok(Date.now() - t0 < 25, 'settled stream answers without waiting');
  kids[0].emit('exit', 1, null);
  assert.equal(await remote.snapshot(), null, 'crashed adapter is not retried right away');
  assert.equal(kids.length, 1);
  mrClock += 6000;
  const again = remote.snapshot();
  assert.equal(kids.length, 2);
  line(kids[1], false, {});
  assert.deepEqual(await again, {}, 'nothing playing after settle');
  remote.stop();
  clearInterval(hold);
  assert.equal(kids[1].killed, true);

  const mrCalls = [];
  let snap = {bundleIdentifier: 'com.tencent.QQMusicMac', title: 'Live', artist: 'Q', durationMicros: 214_000_000, elapsedTimeMicros: 1_000_000, timestampEpochMicros: 0, playing: false};
  const fakeMedia = {snapshot: async () => snap, send: async (run, action) => { mrCalls.push(['send', action]); }, stop: () => mrCalls.push(['stop'])};
  const sysRun = async (cmd, args) => {
    mrCalls.push([cmd, ...args]);
    if (cmd === 'ps') return Buffer.from('Music\n');
    if (cmd === 'mdfind') return Buffer.from('/Users/x/Downloads/QQMusic.app\n/Applications/QQMusic.app\n');
    if (cmd === 'mdls') return Buffer.from('QQ音乐\n');
    if (cmd === 'open' || cmd === 'osascript') return Buffer.from('stopped');
    throw new Error(`unexpected ${cmd}`);
  };
  let sysClock = 1000;
  const sys = createNowPlaying({os: 'darwin', run: sysRun, media: fakeMedia, now: () => sysClock});
  const sv = await sys.get({app: 'auto'});
  assert.deepEqual([sv.apps, sv.track.app, sv.track.name, sv.track.bundle, sv.track.state, sv.track.position, sv.track.art], [['music'], 'system', 'QQ音乐', 'com.tencent.QQMusicMac', 'paused', 1000, null]);
  assert.deepEqual(mrCalls.find(c => c[0] === 'mdls'), ['mdls', '-name', 'kMDItemDisplayName', '-raw', '/Applications/QQMusic.app']);
  assert.ok(!mrCalls.some(c => c[0] === 'osascript'), 'system source skips AppleScript');
  snap = {...snap, artworkData: 'QUJD', artworkMimeType: 'image/jpeg'};
  sysClock += 5000;
  assert.equal((await sys.get({app: 'auto'})).track.art, 'data:image/jpeg;base64,QUJD');
  snap = {...snap, artworkData: undefined};
  sysClock += 5000;
  assert.equal((await sys.get({app: 'auto'})).track.art, 'data:image/jpeg;base64,QUJD', 'artwork cached per track');
  assert.equal(mrCalls.filter(c => c[0] === 'mdfind').length, 1, 'app name cached');
  snap = {};
  sysClock += 5000;
  assert.equal((await sys.get({app: 'auto'})).track, null);
  await sys.control({app: 'system', action: 'next'});
  assert.deepEqual(mrCalls.at(-1), ['send', 'next']);
  await sys.control({app: 'system', action: 'open', bundle: 'com.tencent.QQMusicMac'});
  assert.deepEqual(mrCalls.at(-1), ['open', '-b', 'com.tencent.QQMusicMac']);
  await assert.rejects(sys.control({app: 'system', action: 'open', bundle: '-a Calculator'}), /invalid bundle/);
  await assert.rejects(sys.control({app: 'system', action: 'seek'}), /unknown action/);
  snap = null;
  sysClock += 5000;
  assert.deepEqual(await sys.get({app: 'auto'}), {supported: true, apps: ['music'], at: sysClock, denied: null, track: null}, 'falls back to AppleScript when MediaRemote is unavailable');
  assert.ok(mrCalls.some(c => c[0] === 'osascript'));
  sys.stop();
  assert.deepEqual(mrCalls.at(-1), ['stop']);
}

{
  assert.deepEqual(parseSource('https://space.bilibili.com/946974/video 影视飓风'), {kind: 'bilibili', id: '946974', label: '影视飓风'});
  assert.deepEqual(parseSource('163637592'), {kind: 'bilibili', id: '163637592', label: ''});
  assert.deepEqual(parseSource('https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ'), {kind: 'youtube', id: 'UCBJycsmduvYEL83R_U4JriQ', label: ''});
  assert.deepEqual(parseSource('MKBHD https://www.youtube.com/@mkbhd/videos'), {kind: 'handle', id: '@mkbhd', label: 'MKBHD'});
  assert.deepEqual(parseSource('https://example.com/feed.xml'), {kind: 'rss', id: 'https://example.com/feed.xml', label: ''});
  assert.equal(parseSource('just words'), null);
  assert.equal(parseChannelId('<script>{"externalId":"UCBJycsmduvYEL83R_U4JriQ"}</script>'), 'UCBJycsmduvYEL83R_U4JriQ');

  const ytXml = '<feed xmlns:yt="x"><title>Chan &amp; Co</title><entry><yt:videoId>abcdefghijk</yt:videoId><title>Tom &amp; Jerry</title><author><name>Chan</name></author><published>2026-11-10T00:00:00+00:00</published><media:group><media:community><media:statistics views="1234"/></media:community></media:group></entry><entry><yt:videoId>bad id!</yt:videoId><title>x</title></entry></feed>';
  const yt = parseYoutubeFeed(ytXml);
  assert.equal(yt.author, 'Chan & Co');
  assert.deepEqual(yt.items, [{id: 'yt:abcdefghijk', title: 'Tom & Jerry', url: 'https://www.youtube.com/watch?v=abcdefghijk', thumb: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg', date: Date.parse('2026-11-10T00:00:00Z'), author: 'Chan', duration: null, views: 1234}]);
  assert.throws(() => parseBiliArchives({code: -352, message: 'risk'}), /risk/);
  assert.deepEqual(parseBiliArchives({code: 0, data: {archives: [{bvid: 'BV1', title: 'T', pic: 'http://i1.hdslb.com/a.jpg', pubdate: 100, duration: 61, stat: {view: 9}}]}}).map(x => [x.url, x.thumb, x.date, x.duration, x.views]),
    [['https://www.bilibili.com/video/BV1', 'https://i1.hdslb.com/a.jpg@320w_180h_1c.jpg', 100000, 61, 9]]);
  assert.equal(parseFeed('<rss><channel><item><title>A</title><link>https://a.example/1</link><media:thumbnail url="https://img.example/1.jpg"/></item><item><title>B</title><link>https://a.example/2</link><description>&lt;p&gt;&lt;img src="https://img.example/2.png"&gt;&lt;/p&gt;</description></item></channel></rss>').items.map(i => i.image).join(' '),
    'https://img.example/1.jpg https://img.example/2.png');

  let bili412 = 1;
  const urls = [];
  const vf = {get: async (url, opts) => {
    urls.push(url);
    if (url.includes('recArchivesByKeywords')) {
      if (bili412-- > 0) throw new Error('HTTP 412');
      return {code: 0, data: {archives: [{bvid: 'BV9', title: 'Bili', pic: 'http://i0.hdslb.com/p.jpg', pubdate: 2_000_000_000, duration: 30, stat: {view: 5}}]}};
    }
    if (url.includes('web-interface/card')) return {data: {card: {name: 'UP'}}};
    if (url.startsWith('https://www.youtube.com/@')) return '{"externalId":"UCBJycsmduvYEL83R_U4JriQ"}';
    if (url.includes('feeds/videos.xml')) return ytXml;
    if (opts?.type === 'bytes') return {type: url.endsWith('.txt') ? 'text/plain' : 'image/jpeg', base64: 'SU1H'};
    throw new Error('HTTP 404');
  }};
  const vids = createVideos(vf, {pause: async () => {}});
  const vl = await vids.list({sources: '946974\n@chan\nhttps://broken.example/rss\nnope'});
  assert.deepEqual(vl.items.map(i => [i.title, i.author, i.source]), [['Bili', 'UP', 0], ['Tom & Jerry', 'Chan', 1]]);
  assert.deepEqual(vl.errors.map(e => e.message).sort(), ['HTTP 404', 'unrecognized source']);
  assert.equal(urls.filter(u => u.includes('recArchivesByKeywords')).length, 2, '412 retried');
  assert.equal(await vids.thumb({url: 'https://i0.hdslb.com/p.jpg@320w_180h_1c.jpg'}), 'data:image/jpeg;base64,SU1H');
  await assert.rejects(vids.thumb({url: 'https://evil.example/x.jpg'}), /unknown thumbnail/);
  await vids.list({sources: '@chan'});
  assert.ok(urls.filter(u => u.startsWith('https://www.youtube.com/@')).length === 1, 'handle resolved once');
  const vh = createHandlers(createStore({}), vf, null, null, {videos: vids});
  assert.equal((await vh['dsh-workboard/video.list']({sources: '@chan'})).items.length, 1);
}

console.log('smoke ok');
