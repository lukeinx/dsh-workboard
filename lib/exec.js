// 在 Host 上运行命令行工具：不经过 shell，限时限量；PATH 补上 Homebrew 等常见位置，桌面 App 启动时的 PATH 往往不含它们。
import {execFile} from 'node:child_process';

const EXTRA_PATH = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];

export class ExecError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function createRunner({env = process.env} = {}) {
  const path = [...new Set([...(env.PATH ?? '').split(':').filter(Boolean), ...EXTRA_PATH])].join(':');
  return (cmd, args, {cwd, timeoutMs = 10_000, maxBuffer = 4_000_000} = {}) => new Promise((resolve, reject) => {
    execFile(cmd, args, {cwd, timeout: timeoutMs, maxBuffer, env: {...env, PATH: path, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', NO_COLOR: '1'}, encoding: 'buffer'}, (error, stdout, stderr) => {
      if (!error) { resolve(stdout); return; }
      const message = String(stderr ?? '').trim().split('\n').slice(-3).join(' ') || error.message;
      reject(new ExecError(error.code === 'ENOENT' ? 'not-found' : error.killed ? 'timeout' : 'failed', message));
    });
  });
}

export const text = buf => (Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? ''));
