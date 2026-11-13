// 本机监听端口：lsof 列出 TCP LISTEN，再用一次 lsof 取工作目录、一次 ps 取完整命令行；同一进程同一端口的 IPv4 / IPv6 合并成一行。
import {platform} from 'node:os';
import {text} from './exec.js';

const TTL = 3000;
const MAX_PROCS = 80;

// lsof -F 输出：每段以 p<pid> 开头，后面是 c<命令>、u<uid>，再是每个 fd 的 f / P / n / T 行。
export function parseLsof(out) {
  const rows = new Map();
  let pid = 0;
  let command = '';
  let uid = null;
  for (const line of text(out).split('\n')) {
    const tag = line[0];
    const value = line.slice(1);
    if (tag === 'p') { pid = Number(value); command = ''; uid = null; }
    else if (tag === 'c') command = value;
    else if (tag === 'u') uid = Number(value);
    else if (tag === 'n' && pid) {
      const m = /^(.*):(\d+)$/.exec(value);
      if (!m) continue;
      const port = Number(m[2]);
      const address = m[1].replace(/^\[|\]$/g, '');
      const key = `${pid}:${port}`;
      const row = rows.get(key) ?? {pid, port, command, uid, addresses: []};
      if (!row.addresses.includes(address)) row.addresses.push(address);
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

export function parseCwd(out) {
  const map = new Map();
  let pid = 0;
  for (const line of text(out).split('\n')) {
    if (line[0] === 'p') pid = Number(line.slice(1));
    else if (line[0] === 'n' && pid) map.set(pid, line.slice(1));
  }
  return map;
}

export function parsePs(out) {
  const map = new Map();
  for (const line of text(out).split('\n')) {
    const m = /^\s*(\d+)\s+(.*\S)\s*$/.exec(line);
    if (m) map.set(Number(m[1]), m[2].slice(0, 400));
  }
  return map;
}

// 只监听回环地址的服务只能本机访问；* / 0.0.0.0 / :: 也对局域网开放。
const LOOPBACK = /^(127\.|::1$|localhost$)/;
export const isPublic = addresses => addresses.some(a => !LOOPBACK.test(a));
// 桌面 App 与系统守护进程；其余视为开发时起的服务（node、python、docker 等）。
export const isAppProcess = command => /\.app\/Contents\//.test(command) || /^\/(System|Library|usr\/libexec|usr\/sbin|sbin)\//.test(command);

export function createPorts({run, os = platform(), now = Date.now, kill = (pid, signal) => process.kill(pid, signal)} = {}) {
  let hit = null;
  let job = null;
  const supported = os === 'darwin' || os === 'linux';

  async function scan() {
    let out;
    try {
      out = await run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pcun'], {timeoutMs: 8000, partial: true});
    } catch (error) {
      if (error?.code === 'not-found') return {supported: true, missing: 'lsof', items: []};
      throw error;
    }
    const rows = parseLsof(out).sort((a, b) => a.port - b.port).slice(0, MAX_PROCS * 2);
    const pids = [...new Set(rows.map(r => r.pid))].slice(0, MAX_PROCS);
    const [cwd, cmd] = pids.length ? await Promise.all([
      run('lsof', ['-a', '-d', 'cwd', '-F', 'n', '-p', pids.join(',')], {timeoutMs: 8000, partial: true}).then(parseCwd, () => new Map()),
      run('ps', ['-o', 'pid=,command=', '-p', pids.join(',')], {timeoutMs: 5000, partial: true}).then(parsePs, () => new Map()),
    ]) : [new Map(), new Map()];
    const items = rows.filter(r => pids.includes(r.pid)).map(r => {
      const command = cmd.get(r.pid) ?? r.command;
      return {pid: r.pid, port: r.port, name: r.command, addresses: r.addresses, public: isPublic(r.addresses), app: isAppProcess(command), cwd: cwd.get(r.pid) ?? '', command};
    });
    return {supported: true, items};
  }

  return {
    async list({fresh} = {}) {
      if (!supported) return {supported: false, items: []};
      if (!fresh && hit && now() - hit.at < TTL) return hit.value;
      job ??= scan().then(value => { hit = {at: now(), value}; return value; }).finally(() => { job = null; });
      return job;
    },
    // 只结束刚列出来、仍在监听这个端口的进程，避免按任意 pid 发信号。
    async stop({pid, port}) {
      const id = Number(pid);
      const current = await this.list({fresh: true});
      const row = current.items.find(r => r.pid === id && r.port === Number(port));
      if (!row) throw Object.assign(new Error(`no process ${pid} listening on ${port}`), {code: 'not-found'});
      kill(id, 'SIGTERM');
      hit = null;
      return {stopped: true, pid: id};
    },
  };
}
