// 「待处理」：把需要用户亲自处理的事排成一个队列。顺序即优先级：等确认的会话、卡住的目标、失败的后台作业、待 Review 的 PR、结转待办、收集箱。
export const ATTENTION_KINDS = ['waiting', 'blocked', 'failed', 'review', 'todo', 'inbox'];
// gh 首次查询要几秒；等不到就先返回其余来源，查询继续跑完并进 5 分钟缓存。
const GITHUB_WAIT_MS = 2500;

export const localMidnight = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function buildAttention({sessions, goals, jobs, review, todos, inbox, dayStart}) {
  const items = [];
  for (const s of sessions ?? []) {
    if (s.waiting) items.push({kind: 'waiting', id: `s:${s.id}`, title: s.title, detail: s.cwd ?? '', at: s.updatedAt, sessionId: s.id});
  }
  for (const g of goals ?? []) {
    if (g.phase === 'blocked') items.push({kind: 'blocked', id: `g:${g.sessionId}`, title: g.objective, detail: g.reason ?? '', at: g.updatedAt, sessionId: g.sessionId});
  }
  for (const j of jobs ?? []) {
    if (j.status === 'failed') items.push({kind: 'failed', id: `j:${j.id}`, title: j.label || j.kind, detail: j.detail || j.progress || j.title || '', at: j.finishedAt, sessionId: j.sessionId});
  }
  for (const p of review ?? []) {
    if (!p.draft && p.url) items.push({kind: 'review', id: `p:${p.url}`, title: p.title, detail: `${p.repo}#${p.number}`, at: p.updatedAt, url: p.url});
  }
  for (const t of todos ?? []) {
    if (!t.done && t.createdAt < dayStart) items.push({kind: 'todo', id: `t:${t.id}`, title: t.text, detail: '', at: t.createdAt, todoId: t.id});
  }
  if (inbox?.length) items.push({kind: 'inbox', id: 'inbox', title: '', detail: '', at: Math.min(...inbox.map(x => x.createdAt)), count: inbox.length});
  const rank = kind => ATTENTION_KINDS.indexOf(kind);
  // 结转待办越早越该处理，其余按最近变化排在前面。
  return items.sort((a, b) => rank(a.kind) - rank(b.kind) || (a.kind === 'todo' ? a.at - b.at : b.at - a.at));
}

export function createAttention({agents, running, github, store, now = Date.now, githubWaitMs = GITHUB_WAIT_MS}) {
  const peekGithub = async () => {
    if (!github) return {review: null, status: 'off'};
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), githubWaitMs); });
    try {
      const value = await Promise.race([github({}), timeout]);
      return value ? {review: value.review ?? [], status: 'ok'} : {review: null, status: 'pending'};
    } catch (error) {
      return {review: null, status: error?.code === 'gh-missing' ? 'missing' : 'error'};
    } finally {
      clearTimeout(timer);
    }
  };
  return async ({dayStart, github: withGithub = true, todos: withTodos = true, inbox: withInbox = true} = {}) => {
    const start = Number(dayStart) > 0 ? Number(dayStart) : localMidnight(now());
    const [sessions, run, gh] = await Promise.all([
      agents ? agents.sessions().catch(() => null) : null,
      running ? running.overview().catch(() => null) : null,
      withGithub ? peekGithub() : {review: null, status: 'off'},
    ]);
    const items = buildAttention({
      sessions, goals: run?.goals, jobs: run?.jobs, review: gh.review,
      todos: withTodos ? store.listTodos() : [], inbox: withInbox ? store.listInbox() : [], dayStart: start,
    });
    return {items, sources: {sessions: sessions != null, running: Boolean(run?.goals || run?.jobs), github: gh.status}};
  };
}
