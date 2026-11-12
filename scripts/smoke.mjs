// 用假 ctx 运行 Host 端，确认路由、看板 / 待办 / 速记读写和 Agent 工具。
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {zstdCompressSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {apply, createStore, createHandlers, createAgentWatch, createLauncher, createRunning, createGit, createGithub, migrateLegacy} from '../index.js';
import {createRunner} from '../lib/exec.js';
import {createSystem, parsePmset, parseVmStat, parseMeminfo} from '../lib/system.js';
import {createPhotos, findPhotos} from '../lib/photo.js';
import {createUsage, zstdFrames} from '../lib/usage.js';

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
const adopted = await value('board.adopt', {id: life.id, known: ['plug.a', 'desk.clock'], place: [{id: 'plug.a', size: 'm'}]});
assert.deepEqual(adopted.widgets, [{id: 'plug.a', size: 'm'}]);
const work = await value('board.get', {id: 'work'});
assert.ok(work.known.includes('plug.a') && !work.widgets.some(w => w.id === 'plug.a'));
assert.deepEqual((await value('board.adopt', {id: life.id, known: ['plug.a'], place: [{id: 'plug.a', size: 'm'}]})).widgets.length, 1);
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
// 习惯：增删、按天切换、非法日期。
const habit = await value('habit.add', {name: '  read   20 pages '});
assert.equal(habit.name, 'read 20 pages');
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-11'})).days, ['2026-11-11']);
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-10', done: true})).days, ['2026-11-10', '2026-11-11']);
assert.deepEqual((await value('habit.check', {id: habit.id, day: '2026-11-11'})).days, ['2026-11-10']);
assert.equal((await call('habit.check', {id: habit.id, day: 'yesterday'})).error.code, 'dsh-desk/bad-day');
assert.deepEqual((await value('habit.list')).map(h => h.id), [habit.id]);
await value('habit.remove', {id: habit.id});
assert.deepEqual(await value('habit.list'), []);

// 订阅：两个源按时间合并，失败的源进 errors。
const rss = '<rss version="2.0"><channel><title>R</title><item><title>Old</title><link>https://r.example/1</link><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
const atomFeed = '<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title><entry><title>New</title><link href="https://a.example/2"/><updated>2026-11-11T10:00:00Z</updated></entry></feed>';
const feedFetcher = {get: async url => { if (url.includes('bad')) throw new Error('HTTP 500'); return url.includes('atom') ? atomFeed : rss; }};
const feed = await createHandlers(createStore({}), feedFetcher)['dsh-desk/feed.get']({urls: ['https://x.example/rss', 'https://x.example/atom', 'https://bad.example/f']});
assert.deepEqual(feed.items.map(i => [i.title, i.feed, i.link]), [['New', 'A', 'https://a.example/2'], ['Old', 'R', 'https://r.example/1']]);
assert.deepEqual(feed.errors.map(e => e.message), ['HTTP 500']);

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
let overview = await agentHandlers['dsh-desk/agent.overview']();
assert.deepEqual(overview.sessions.map(s => [s.id, s.title, s.running, s.waiting]), [['s3', '', false, true], ['s2', 'Busy', true, false], ['s1', 'Idle chat', false, false]]);
assert.deepEqual(overview.schedules.map(t => [t.id, t.running, t.scheduledAt]), [['k1', true, Date.UTC(2026, 10, 12, 1)]]);
answer('allowed-once');
assert.equal(await pending, 'allowed-once');
assert.equal(createAgentWatch(agentCtx).waiting.size, 0);
assert.deepEqual(await createHandlers(createStore({}), feedFetcher)['dsh-desk/agent.overview'](), {sessions: null, schedules: null});

// 收集箱：保留换行、工具增删清空。
const inboxItem = await value('inbox.add', {text: '  https://example.com\nread later  '});
assert.equal(inboxItem.text, 'https://example.com\nread later');
assert.equal((await call('inbox.add', {text: ' '})).error.code, 'dsh-desk/empty-text');
const inboxTool = tools.get('desk_inbox');
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
assert.deepEqual(await launchHandlers['dsh-desk/agent.start']({prompt: ' hi ', cwd: '/tmp'}), {sessionId: 'new1'});
assert.deepEqual(created, [{cwd: '/tmp'}]);
assert.deepEqual([prompted[0].sessionId, prompted[0].mode, prompted[0].content], ['new1', 'queue', [{type: 'text', text: 'hi'}]]);
await assert.rejects(launchHandlers['dsh-desk/agent.start']({prompt: 'x', cwd: 'relative/dir'}), /absolute/);
await assert.rejects(launchHandlers['dsh-desk/agent.start']({prompt: 'x', cwd: '/definitely/missing'}), /not a directory/);
await assert.rejects(createHandlers(createStore({}))['dsh-desk/agent.start']({prompt: 'x'}), /cannot start/);

// 用量：多 frame zstd 日志（末尾半个 frame 模拟正在写入）+ 未压缩日志；不报 usage 的请求只计请求数。
const usageRoot = mkdtempSync(join(tmpdir(), 'desk-usage-'));
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
const sum = await usageHandlers['dsh-desk/usage.get']({days: 7});
assert.equal(sum.today, '2026-11-12');
assert.equal(sum.files, 2);
assert.deepEqual(sum.rows.map(r => [r.day, r.provider, r.model, r.requests, r.reported, r.input, r.output, r.cacheRead, r.cacheWrite]), [
  ['2026-11-11', 'p1', 'm1', 1, 1, 1, 1, 0, 0],
  ['2026-11-12', 'p1', 'm1', 2, 2, 12, 8, 100, 4],
  ['2026-11-12', 'cursor', 'opus', 1, 0, 0, 0, 0, 0],
]);
assert.deepEqual((await usageHandlers['dsh-desk/usage.get']({days: 1})).rows.map(r => r.day), ['2026-11-12', '2026-11-12']);
await assert.rejects(createHandlers(createStore({}))['dsh-desk/usage.get']({}), /not available/);
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
const running = await runHandlers['dsh-desk/running.get']();
assert.deepEqual(running.goals.map(g => [g.sessionId, g.title, g.objective, g.phase, g.rounds, g.maxRounds, g.armed]), [['s1', 'Widgets', 'Ship widgets', 'active', 2, 10, true]]);
assert.deepEqual(running.jobs.map(j => [j.id, j.sessionId, j.status]), [['bash-1', 's1', 'running'], ['bash-2', '', 'failed']]);
assert.deepEqual(await runHandlers['dsh-desk/running.kill']({id: 'bash-1', sessionId: 's1'}), {result: 'requested'});
assert.deepEqual(killedJobs, [['bash-1', 's1', 'stopped from Desk']]);
assert.deepEqual(await createHandlers(createStore({}), feedFetcher, null, null, {running: createRunning({get: () => undefined})})['dsh-desk/running.get'](), {goals: null, jobs: null});

// Git：真实仓库，领先 1 个提交、一处改动、一个未跟踪文件、一个上游已删除的分支；工作区里的非仓库跳过，设置里的非仓库报错。
const gitRoot = mkdtempSync(join(tmpdir(), 'desk-git-'));
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
const repos = (await gitHandlers['dsh-desk/git.status']({})).repos;
assert.deepEqual(repos.map(r => [r.name, r.branch, r.upstream, r.ahead, r.behind, r.changed, r.untracked, r.gone, r.lastSubject]), [['work', 'main', 'origin/main', 1, 0, 1, 1, ['feature'], 'two']]);
const explicitRepos = (await gitHandlers['dsh-desk/git.status']({paths: `${gitWork}\n${join(gitRoot, 'plain')}`})).repos;
assert.equal(explicitRepos.length, 2);
assert.match(explicitRepos[1].error, /not a git repository/);
assert.equal((await gitHandlers['dsh-desk/git.fetch']({})).errors.length, 0);
rmSync(gitRoot, {recursive: true, force: true});

// GitHub：假 gh，三类查询各一次，结果缓存；gh 不存在时给出可读错误。
const ghCalls = [];
const fakeGh = async (cmd, args) => {
  ghCalls.push(args.slice(0, 3).join(' '));
  return Buffer.from(JSON.stringify(args[2] === '--review-requested=@me' ? [{number: 7, title: 'Fix', url: 'https://github.com/o/r/pull/7', repository: {nameWithOwner: 'o/r'}, author: {login: 'amy'}, isDraft: false, updatedAt: '2026-11-12T01:00:00Z'}] : []));
};
const gh = createGithub(fakeGh);
const ghValue = await createHandlers(createStore({}), feedFetcher, null, null, {github: gh})['dsh-desk/github.get']({});
assert.deepEqual(ghValue.review.map(x => [x.repo, x.number, x.author, x.url]), [['o/r', 7, 'amy', 'https://github.com/o/r/pull/7']]);
assert.deepEqual([ghValue.mine, ghValue.assigned], [[], []]);
await gh({});
assert.equal(ghCalls.length, 3);
await gh({fresh: true});
assert.equal(ghCalls.length, 6);
const missing = createGithub(async () => { const e = new Error('spawn gh ENOENT'); e.code = 'not-found'; throw e; });
await assert.rejects(missing({}), /not installed/);

// 系统状态：解析 vm_stat / meminfo / pmset，采样进环形缓冲。
assert.equal(parseVmStat('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 10.\nPages active: 100.\nPages wired down: 50.\nPages occupied by compressor: 10.\n', 1e12), 160 * 16384);
assert.equal(parseMeminfo('MemTotal:       1000 kB\nMemFree: 100 kB\nMemAvailable:    400 kB\n'), 600 * 1024);
assert.deepEqual(parsePmset("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t80%; AC attached; not charging present: true"), {percent: 80, charging: false, plugged: true, minutes: null});
assert.deepEqual(parsePmset("Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1)\t42%; discharging; 3:05 remaining present: true"), {percent: 42, charging: false, plugged: false, minutes: 185});
assert.equal(parsePmset('No batteries'), null);
const sys = createSystem({os: 'darwin', run: async cmd => Buffer.from(cmd === 'vm_stat' ? '(page size of 4096 bytes)\nPages active: 1000.\n' : '-InternalBattery-0\t55%; charging; 0:40 remaining')});
const sv = await createHandlers(createStore({}), feedFetcher, null, null, {system: sys})['dsh-desk/system.get']();
sys.stop();
assert.equal(sv.memory.used, 4096 * 1000);
assert.deepEqual(sv.battery, {percent: 55, charging: true, plugged: true, minutes: 40});
assert.ok(sv.cpu >= 0 && sv.cpu <= 1 && sv.cores > 0 && sv.disk.total > sv.disk.free);
assert.equal(sv.history.length, 1);

// 相框：跳过隐藏目录和图库包，顺序轮播会回绕；macOS 走 sips 转码并缓存；不存在的文件夹报 bad-dir。
const picRoot = mkdtempSync(join(tmpdir(), 'desk-photo-'));
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
assert.equal((await photoHandlers['dsh-desk/photo.next']({dir: picRoot, shuffle: false})).name, '1.jpg');
await assert.rejects(photoHandlers['dsh-desk/photo.next']({dir: join(picRoot, 'missing')}), /not a directory/);
rmSync(picRoot, {recursive: true, force: true});

console.log('smoke ok');
