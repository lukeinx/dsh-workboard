// GitHub：用本机已登录的 gh CLI 查等我 review 的 PR、我提的 PR、指派给我的 issue；不处理 token。
import {text} from './exec.js';

const PR_FIELDS = 'number,title,url,repository,updatedAt,author,isDraft';
const ISSUE_FIELDS = 'number,title,url,repository,updatedAt,author';

const item = x => ({
  number: x.number,
  title: String(x.title ?? '').slice(0, 300),
  url: /^https:\/\//.test(x.url ?? '') ? x.url : '',
  repo: x.repository?.nameWithOwner ?? x.repository?.name ?? '',
  author: x.author?.login ?? '',
  draft: x.isDraft === true,
  updatedAt: Date.parse(x.updatedAt ?? '') || 0,
});

export async function githubOverview(run, {limit = 20} = {}) {
  const search = async (kind, filter, fields) => {
    const out = await run('gh', ['search', kind, filter, '--state=open', '--sort=updated', '--json', fields, '--limit', String(limit)], {timeoutMs: 20_000});
    return JSON.parse(text(out)).map(item);
  };
  const [review, mine, assigned] = await Promise.all([
    search('prs', '--review-requested=@me', PR_FIELDS),
    search('prs', '--author=@me', PR_FIELDS),
    search('issues', '--assignee=@me', ISSUE_FIELDS),
  ]);
  return {review, mine, assigned};
}
