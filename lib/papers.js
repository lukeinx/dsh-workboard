// AI 论文与模型榜：Hugging Face Daily Papers 与 trending 模型，官方域名不通时改走 hf-mirror.com 镜像；链接始终指向 huggingface.co。
const TTL = 30 * 60_000;
const LIMIT = 30;
const HOSTS = ['https://huggingface.co', 'https://hf-mirror.com'];
const SITE = 'https://huggingface.co';
const PAPER_ID = /^\d{4}\.\d{4,6}$/;
const MODEL_ID = /^\w[\w.-]*(\/\w[\w.-]*)?$/;

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

export function parseModels(list) {
  return (Array.isArray(list) ? list : []).filter(m => typeof m?.id === 'string' && MODEL_ID.test(m.id)).map(m => ({
    id: m.id,
    title: m.id,
    url: `${SITE}/${m.id}`,
    likes: num(m.likes),
    downloads: num(m.downloads),
    trend: num(m.trendingScore),
    task: clip(m.pipeline_tag, 40),
  })).slice(0, LIMIT);
}

const KINDS = {
  papers: {path: `/api/daily_papers?limit=${LIMIT}`, parse: parsePapers},
  models: {path: `/api/models?sort=trendingScore&limit=${LIMIT}`, parse: parseModels},
};

export function createPapers(fetcher) {
  return {
    async list({kind}) {
      const def = Object.hasOwn(KINDS, kind) ? KINDS[kind] : null;
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
