// 发版追踪：读取 GitHub 仓库的公开 releases.atom 订阅源（无需 key、无 API 速率限制）。
import {decodeText} from './feed.js';

const TTL = 15 * 60_000;
const MAX_REPOS = 12;
const PER_REPO = 6;
const LIMIT = 40;
const REPO_RE = /^(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+?)(?:\.git)?(?:\/.*)?$/i;
const PRE_RE = /(?:^|[-._+])(alpha|beta|rc|canary|nightly|preview|dev|pre|insiders)(?:[-._+\d]|$)/i;

const clip = (s, n) => decodeText(String(s ?? '')).replace(/\s+/g, ' ').trim().slice(0, n);

export function parseReleaseSpecs(raw) {
  const lines = (Array.isArray(raw) ? raw : String(raw ?? '').split('\n')).map(s => String(s).trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const [first, ...rest] = line.split(/\s+/);
    const m = REPO_RE.exec(first);
    if (!m) continue;
    const repo = m[1];
    const key = repo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const label = rest.join(' ').trim().slice(0, 60) || repo.split('/')[1];
    out.push({repo, label});
    if (out.length >= MAX_REPOS) break;
  }
  return out;
}

export function parseReleaseAtom(xml, spec) {
  const text = String(xml ?? '');
  if (!/<feed[\s>]/i.test(text)) throw new Error('not an Atom feed');
  const entries = [...text.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
  return entries.map(block => {
    const href = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(block)?.[1] ?? '';
    const url = /^https:\/\/github\.com\//.test(href) ? href : `https://github.com/${spec.repo}/releases`;
    const tagMatch = /\/releases\/tag\/([^"?#]+)/.exec(url);
    const rawTag = tagMatch ? decodeURIComponent(tagMatch[1]) : '';
    const title = clip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1], 120);
    const tag = rawTag || title;
    if (!tag) return null;
    const updated = /<(?:updated|published)>([\s\S]*?)<\/(?:updated|published)>/i.exec(block)?.[1] ?? '';
    const bodyRaw = /<(?:content|summary)[^>]*>([\s\S]*?)<\/(?:content|summary)>/i.exec(block)?.[1] ?? '';
    const notes = clip(bodyRaw, 420).replace(/^(?:what's changed|release notes|changelog)\s*:?\s*/i, '');
    const prerelease = PRE_RE.test(tag) || PRE_RE.test(title);
    return {
      id: `${spec.repo}@${tag}`,
      repo: spec.repo,
      name: spec.label || spec.repo,
      tag,
      title: title && title !== tag ? title : '',
      notes: notes === 'No content.' ? '' : notes,
      url,
      date: Date.parse(updated.trim()) || 0,
      prerelease,
    };
  }).filter(Boolean);
}

export function createReleases(fetcher) {
  return {
    async list({repos, stableOnly = true} = {}) {
      const specs = parseReleaseSpecs(repos);
      const items = [];
      const errors = [];
      await Promise.all(specs.map(async spec => {
        try {
          const xml = await fetcher.get(`https://github.com/${spec.repo}/releases.atom`, {ttlMs: TTL, type: 'text', maxBytes: 2_000_000, timeoutMs: 12_000});
          const parsed = parseReleaseAtom(xml, spec);
          const filtered = stableOnly ? parsed.filter(r => !r.prerelease) : parsed;
          for (const item of filtered.slice(0, PER_REPO)) items.push(item);
        } catch (error) {
          errors.push({repo: spec.repo, message: String(error?.message || error)});
        }
      }));
      items.sort((a, b) => b.date - a.date || a.repo.localeCompare(b.repo));
      return {items: items.slice(0, LIMIT), errors};
    },
  };
}
