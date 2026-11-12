// Git 仓库状态：分支、与上游的领先 / 落后、未提交改动、上游已删除（[gone]）的本地分支。只读，不加可选锁。
import {basename} from 'node:path';
import {text} from './exec.js';

export function parseStatus(out) {
  const status = {branch: '', upstream: '', ahead: 0, behind: 0, changed: 0, untracked: 0, conflicts: 0};
  for (const line of out.split('\n')) {
    if (line.startsWith('# branch.head ')) status.branch = line.slice(14);
    else if (line.startsWith('# branch.upstream ')) status.upstream = line.slice(18);
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) { status.ahead = Number(m[1]); status.behind = Number(m[2]); }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) status.changed++;
    else if (line.startsWith('u ')) status.conflicts++;
    else if (line.startsWith('? ')) status.untracked++;
  }
  return status;
}

export async function repoStatus(run, path) {
  const git = (...args) => run('git', ['--no-optional-locks', '-C', path, ...args], {timeoutMs: 8000}).then(text);
  const [status, refs, last] = await Promise.all([
    git('status', '--porcelain=v2', '--branch'),
    git('for-each-ref', '--format=%(refname:short)%09%(upstream:track)', 'refs/heads'),
    git('log', '-1', '--format=%ct%x09%s').catch(() => ''),
  ]);
  const gone = refs.split('\n').map(l => l.split('\t')).filter(([name, track]) => name && track?.includes('gone')).map(([name]) => name);
  const [at, ...subject] = last.trim().split('\t');
  return {path, name: basename(path), ...parseStatus(status), gone, lastCommitAt: Number(at) * 1000 || 0, lastSubject: subject.join('\t').slice(0, 200)};
}

export async function fetchRepo(run, path) {
  await run('git', ['-C', path, 'fetch', '--prune', '--quiet'], {timeoutMs: 30_000});
}
