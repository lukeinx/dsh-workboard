// AI 论文与 Spaces：Hugging Face Daily Papers、热门 Spaces（官方域名不通时改走 hf-mirror.com 镜像，链接始终指向 huggingface.co）及 arXiv 分类最新论文。
import {decodeText} from './feed.js';

const TTL = 30 * 60_000;
const LIMIT = 30;
const HOSTS = ['https://huggingface.co', 'https://hf-mirror.com'];
const SITE = 'https://huggingface.co';
const ARXIV_API = 'https://export.arxiv.org/api/query';
const PAPER_ID = /^\d{4}\.\d{4,6}$/;
const SPACE_ID = /^[\w.-]+\/[\w.-]+$/;
const ARXIV_CAT = /^[a-z-]+(\.[A-Za-z-]+)?$/;
const ARXIV_ALIAS = {
  ai: 'cs.AI', '人工智能': 'cs.AI',
  cl: 'cs.CL', nlp: 'cs.CL', '语言': 'cs.CL', '自然语言': 'cs.CL',
  lg: 'cs.LG', ml: 'cs.LG', '机器学习': 'cs.LG',
  cv: 'cs.CV', '视觉': 'cs.CV', '计算机视觉': 'cs.CV',
  ro: 'cs.RO', '机器人': 'cs.RO',
  ir: 'cs.IR', '检索': 'cs.IR', '信息检索': 'cs.IR',
  se: 'cs.SE', '软件工程': 'cs.SE',
  hc: 'cs.HC', '人机交互': 'cs.HC',
  cr: 'cs.CR', '安全': 'cs.CR',
  ma: 'cs.MA', '多智能体': 'cs.MA',
  stat: 'stat.ML', '统计': 'stat.ML',
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function parsePapers(list) {
  return (Array.isArray(list) ? list : []).map(x => x?.paper).filter(p => p?.id && p.title && PAPER_ID.test(p.id)).map(p => ({
    id: p.id,
    title: clip(p.title, 300),
    url: `${SITE}/papers/${p.id}`,
    votes: num(p.upvotes),
    summary: clip(p.ai_summary || p.summary, 400),
    keywords: (Array.isArray(p.ai_keywords) ? p.ai_keywords : []).slice(0, 4).map(k => clip(k, 40)),
    github: /^https:\/\/github\.com\//.test(p.githubRepo ?? '') ? p.githubRepo : '',
    stars: num(p.githubStars),
    at: Date.parse(p.submittedOnDailyAt ?? p.publishedAt ?? '') || 0,
  })).sort((a, b) => b.votes - a.votes || b.at - a.at).slice(0, LIMIT);
}

export function parseSpaces(list) {
  return (Array.isArray(list) ? list : []).filter(s => typeof s?.id === 'string' && SPACE_ID.test(s.id)).map(s => ({
    id: s.id,
    title: clip(s.cardData?.title || s.id, 160),
    url: `${SITE}/spaces/${s.id}`,
    likes: num(s.likes),
    trend: num(s.trendingScore),
    sdk: clip(s.sdk || s.cardData?.sdk, 30),
    summary: clip(s.cardData?.short_description, 240),
  })).slice(0, LIMIT);
}

export function parseArxivCats(text) {
  const raw = String(text ?? '').trim();
  if (raw === 'all') return ['cs.AI', 'cs.CL', 'cs.LG', 'cs.CV', 'cs.RO', 'cs.IR'];
  const tokens = raw.split(/[\s,，、+]+/).map(t => ARXIV_ALIAS[t.toLowerCase()] || t).filter(c => ARXIV_CAT.test(c));
  const cats = [...new Set(tokens)].slice(0, 6);
  return cats.length ? cats : ['cs.AI', 'cs.CL', 'cs.LG'];
}

export function arxivUrl(cats) {
  const q = parseArxivCats(cats).map(c => `cat:${c}`).join('+OR+');
  return `${ARXIV_API}?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=${LIMIT}`;
}

export function parseArxiv(xml) {
  const entries = [...String(xml ?? '').matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
  return entries.map(block => {
    const rawId = /<id>([\s\S]*?)<\/id>/i.exec(block)?.[1] ?? '';
    const id = /(\d{4}\.\d{4,6})(?:v\d+)?/.exec(rawId)?.[1] ?? '';
    const title = clip(decodeText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1]), 300);
    if (!id || !title) return null;
    const summary = clip(decodeText(/<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(block)?.[1]), 400);
    const authors = [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi)].map(m => clip(decodeText(m[1]), 60)).filter(Boolean);
    const cats = [...block.matchAll(/<category\b[^>]*\bterm="([^"]+)"/gi)].map(m => clip(m[1], 30)).filter(Boolean);
    const pub = /<published>([\s\S]*?)<\/published>/i.exec(block)?.[1] ?? '';
    return {
      id, title,
      url: `https://arxiv.org/abs/${id}`,
      summary,
      authors: authors.slice(0, 3),
      keywords: cats.slice(0, 3),
      at: Date.parse(pub.trim()) || 0,
    };
  }).filter(Boolean).slice(0, LIMIT);
}

const HF_KINDS = {
  papers: {path: `/api/daily_papers?limit=${LIMIT}`, parse: parsePapers},
  spaces: {path: `/api/spaces?sort=trendingScore&limit=${LIMIT}&expand[]=cardData&expand[]=likes&expand[]=trendingScore&expand[]=sdk`, parse: parseSpaces},
};

export function createPapers(fetcher) {
  return {
    async list({kind, cats = ''}) {
      if (kind === 'arxiv') {
        const xml = await fetcher.get(arxivUrl(cats), {ttlMs: TTL, type: 'text', maxBytes: 4_000_000, timeoutMs: 15_000});
        const items = parseArxiv(xml);
        if (!items.length) throw new Error('empty list');
        return {kind, via: 'arxiv.org', items};
      }
      const def = Object.hasOwn(HF_KINDS, kind) ? HF_KINDS[kind] : null;
      if (!def) throw new Error(`unknown list ${kind}`);
      let lastError = null;
      for (const host of HOSTS) {
        try {
          const items = def.parse(await fetcher.get(`${host}${def.path}`, {ttlMs: TTL, maxBytes: 4_000_000, timeoutMs: 12_000}));
          if (items.length) return {kind, via: new URL(host).hostname, items};
          lastError = new Error('empty list');
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
  };
}
