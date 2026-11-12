// 热榜：国内平台走各自的网页接口，海外优先官方 API / RSS；统一成 {title, url, hot, meta}。
import {decodeText, parseFeed} from './feed.js';

const TTL = 10 * 60_000;
const LIMIT = 30;
const BROWSER = {'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'};

const num = v => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null);
const clean = s => decodeText(String(s ?? '')).replace(/\s+/g, ' ').trim();

export function parseZhihuHeat(text) {
  const m = /([\d.]+)\s*(万|亿)?/.exec(String(text ?? ''));
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2] === '亿' ? 1e8 : m[2] === '万' ? 1e4 : 1));
}

export function parseGithubTrending(html) {
  const out = [];
  for (const block of String(html).split('<article class="Box-row">').slice(1)) {
    const h2 = /<h2[\s\S]*?<\/h2>/.exec(block)?.[0] ?? '';
    const path = /href="\/([^"/?#]+\/[^"/?#]+)"/.exec(h2)?.[1];
    if (!path) continue;
    const desc = /<p class="col-9[^"]*">([\s\S]*?)<\/p>/.exec(block)?.[1];
    const today = /([\d,]+)\s+stars? (?:today|this week|this month)/.exec(block)?.[1];
    out.push({title: path.replace('/', ' / '), url: `https://github.com/${path}`, hot: today ? Number(today.replace(/,/g, '')) : null, meta: desc ? clean(desc.replace(/<[^>]+>/g, '')) : ''});
  }
  return out;
}

export const SOURCES = {
  weibo: {
    region: 'cn', metric: 'heat',
    async load(get) {
      const d = await get('https://weibo.com/ajax/side/hotSearch', {headers: {...BROWSER, referer: 'https://weibo.com/', 'x-requested-with': 'XMLHttpRequest'}});
      return (d?.data?.realtime ?? []).filter(x => !x.is_ad && x.word).map(x => ({
        title: x.word, url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${x.word}#`)}`, hot: num(x.num), meta: x.label_name || '',
      }));
    },
  },
  zhihu: {
    region: 'cn', metric: 'heat',
    async load(get) {
      const d = await get(`https://api.zhihu.com/topstory/hot-lists/total?limit=${LIMIT}`, {headers: BROWSER});
      return (d?.data ?? []).map(x => x.target).filter(x => x?.title).map((x, i) => ({
        title: x.title, url: String(x.url ?? '').replace('//api.zhihu.com/questions/', '//www.zhihu.com/question/'), hot: parseZhihuHeat(d.data[i]?.detail_text), meta: '',
      }));
    },
  },
  '36kr': {
    region: 'cn', metric: 'reads',
    async load(get) {
      const d = await get('https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot', {
        headers: {...BROWSER, 'content-type': 'application/json'},
        body: JSON.stringify({partner_id: 'wap', param: {siteId: 1, platformId: 2}}),
      });
      return (d?.data?.hotRankList ?? []).map(x => x.templateMaterial).filter(x => x?.widgetTitle).map(x => ({
        title: x.widgetTitle, url: `https://36kr.com/p/${x.itemId}`, hot: num(x.statRead), meta: x.authorName || '',
      }));
    },
  },
  sspai: {
    region: 'cn', metric: 'likes',
    async load(get) {
      const d = await get(`https://sspai.com/api/v1/article/tag/page/get?limit=${LIMIT}&tag=${encodeURIComponent('热门文章')}`, {headers: BROWSER});
      return (d?.data ?? []).filter(x => x?.title).map(x => ({
        title: x.title, url: `https://sspai.com/post/${x.id}`, hot: num(x.like_count), meta: x.author?.nickname || '',
      }));
    },
  },
  bilibili: {
    region: 'cn', metric: 'views',
    async load(get) {
      const d = await get(`https://api.bilibili.com/x/web-interface/popular?ps=${LIMIT}`, {headers: BROWSER});
      return (d?.data?.list ?? []).filter(x => x?.title && x.bvid).map(x => ({
        title: x.title, url: `https://www.bilibili.com/video/${x.bvid}`, hot: num(x.stat?.view), meta: x.owner?.name || '',
      }));
    },
  },
  v2ex: {
    region: 'cn', metric: 'replies',
    async load(get) {
      const d = await get('https://www.v2ex.com/api/topics/hot.json', {headers: BROWSER});
      return (Array.isArray(d) ? d : []).filter(x => x?.title).map(x => ({
        title: x.title, url: x.url, hot: num(x.replies), meta: x.node?.title || '',
      }));
    },
  },
  hn: {
    region: 'intl', metric: 'points',
    async load(get) {
      const d = await get(`https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${LIMIT}`);
      return (d?.hits ?? []).filter(x => x?.title).sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).map(x => ({
        title: x.title, url: x.url || `https://news.ycombinator.com/item?id=${x.objectID}`, hot: num(x.points),
        meta: URL.canParse(x.url ?? '') ? new URL(x.url).hostname.replace(/^www\./, '') : '',
      }));
    },
  },
  github: {
    region: 'intl', metric: 'stars',
    async load(get) {
      return parseGithubTrending(await get('https://github.com/trending', {type: 'text', maxBytes: 3_000_000, headers: BROWSER}));
    },
  },
  producthunt: {
    region: 'intl', metric: null,
    async load(get) {
      const feed = parseFeed(await get('https://www.producthunt.com/feed', {type: 'text'}));
      return feed.items.filter(x => x.title).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).map(x => ({title: x.title, url: x.link, hot: null, meta: ''}));
    },
  },
  reddit: {
    region: 'intl', metric: null,
    async load(get) {
      const feed = parseFeed(await get('https://www.reddit.com/r/worldnews+technology+science/top.rss?t=day&limit=30', {type: 'text'}));
      return feed.items.filter(x => x.title).map(x => {
        const sub = /\/r\/([^/]+)\//.exec(x.link ?? '')?.[1];
        return {title: x.title, url: x.link, hot: null, meta: sub ? `r/${sub}` : ''};
      });
    },
  },
};

export function createTrending(fetcher) {
  const get = (url, opts = {}) => fetcher.get(url, {ttlMs: TTL, ...opts});
  return {
    async list({source}) {
      const def = Object.hasOwn(SOURCES, source) ? SOURCES[source] : null;
      if (!def) throw new Error(`unknown source ${source}`);
      const items = (await def.load(get)).filter(x => /^https?:\/\//.test(x.url ?? '')).slice(0, LIMIT);
      if (!items.length) throw new Error('empty list');
      return {source, metric: def.metric, items};
    },
  };
}
