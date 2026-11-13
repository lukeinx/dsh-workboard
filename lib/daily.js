// 历史上的今天与每日壁纸：Wikimedia Featured Feed API、百度百科历史上的今天月度 JSON 与 Bing 每日壁纸（图片由 Host 代理成 data: URL）。
import {decodeText} from './feed.js';

const TTL = 2 * 60 * 60_000;
const IMG_TTL = 6 * 60 * 60_000;
const LIMIT = 30;
const BROWSER = {'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'};
const WIKI_UA = {'user-agent': 'dsh-workboard/0.3 (https://github.com/lukeinx/dsh-workboard)'};

const clip = (s, n) => decodeText(String(s ?? '')).replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pad = n => String(n).padStart(2, '0');

export function parseDayParts(day, now = Date.now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day ?? '').trim());
  if (m) return {yyyy: m[1], mm: m[2], dd: m[3]};
  const d = new Date(now());
  return {yyyy: String(d.getFullYear()), mm: pad(d.getMonth() + 1), dd: pad(d.getDate())};
}

export function parseBaiduOnThisDay(body, mmdd) {
  const month = mmdd.slice(0, 2);
  const list = body?.[month]?.[mmdd];
  return (Array.isArray(list) ? list : []).filter(x => x?.title && String(x.type ?? 'event') === 'event').map(x => ({
    year: num(x.year),
    title: clip(x.title, 240),
    desc: clip(x.desc, 400),
    url: /^https?:\/\//.test(x.link ?? '') ? x.link : '',
    type: 'event',
    ...(x.cover ? {cover: true} : {}),
    ...(x.cover || x.recommend ? {featured: true} : {}),
  })).sort((a, b) => b.year - a.year).slice(0, LIMIT);
}

export function parseWikiOnThisDay(body) {
  return (Array.isArray(body?.onthisday) ? body.onthisday : []).filter(x => x?.text).map(x => {
    const page = (Array.isArray(x.pages) ? x.pages : [])[0];
    const url = page?.content_urls?.desktop?.page ?? '';
    return {
      year: num(x.year),
      title: clip(x.text, 240),
      desc: clip(page?.extract, 400),
      url: /^https?:\/\//.test(url) ? url : '',
      type: 'event',
    };
  }).sort((a, b) => b.year - a.year).slice(0, LIMIT);
}

export function parseBingWallpapers(body) {
  return (Array.isArray(body?.images) ? body.images : []).filter(x => typeof x?.url === 'string' && x.url).map(x => {
    const raw = x.url.startsWith('http') ? x.url : `https://www.bing.com${x.url}`;
    const m = /^(.*?)\s*\((©[^)]+)\)\s*$/.exec(String(x.copyright ?? '').trim());
    return {
      title: clip(x.title || m?.[1] || x.copyright, 160),
      credit: clip(m ? `${m[1]} · ${m[2]}` : x.copyright, 240),
      date: /^\d{8}$/.test(x.enddate ?? '') ? `${x.enddate.slice(0, 4)}-${x.enddate.slice(4, 6)}-${x.enddate.slice(6, 8)}` : '',
      pageUrl: /^https?:\/\//.test(x.copyrightlink ?? '') ? x.copyrightlink : 'https://www.bing.com',
      imageUrl: raw,
    };
  });
}

export function parseWikiImage(body, day) {
  const img = body?.image;
  const src = img?.thumbnail?.source || img?.image?.source || '';
  if (!/^https?:\/\//.test(src)) return null;
  const desc = clip(img?.description?.text, 240);
  const artist = clip(img?.artist?.text, 100);
  const rawTitle = String(img?.title ?? '').replace(/^File:/i, '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ');
  return {
    title: desc || clip(rawTitle, 160),
    credit: [desc, artist ? `© ${artist}` : 'Wikimedia Commons'].filter(Boolean).join(' · '),
    date: day,
    pageUrl: /^https?:\/\//.test(img?.file_page ?? '') ? img.file_page : 'https://commons.wikimedia.org',
    imageUrl: src,
  };
}

export function createDaily(fetcher, {now = Date.now} = {}) {
  const wikiLang = lang => (String(lang ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const loadWiki = async (lang, day) => {
    const {yyyy, mm, dd} = parseDayParts(day, now);
    const wl = wikiLang(lang);
    const headers = wl === 'zh' ? {...WIKI_UA, 'accept-language': 'zh-CN,zh-Hans;q=0.9'} : WIKI_UA;
    const urls = [
      `https://api.wikimedia.org/feed/v1/wikipedia/${wl}/featured/${yyyy}/${mm}/${dd}`,
      `https://${wl}.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`,
    ];
    let lastError = null;
    for (const url of urls) {
      try {
        return await fetcher.get(url, {ttlMs: TTL, maxBytes: 4_000_000, timeoutMs: 15_000, headers});
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };
  const toDataUrl = async url => {
    const img = await fetcher.get(url, {ttlMs: IMG_TTL, type: 'bytes', maxBytes: 3_000_000, timeoutMs: 15_000, headers: BROWSER});
    if (!/^image\//.test(img.type)) throw new Error('not an image');
    return `data:${img.type};base64,${img.base64}`;
  };

  return {
    async onThisDay({source = 'auto', lang = 'zh', day} = {}) {
      const {mm, dd} = parseDayParts(day, now);
      const pick = source === 'baidu' || source === 'wiki' ? source : (wikiLang(lang) === 'zh' ? 'baidu' : 'wiki');
      if (pick === 'baidu') {
        const body = await fetcher.get(`https://baike.baidu.com/cms/home/eventsOnHistory/${mm}.json`, {ttlMs: TTL, maxBytes: 2_000_000, timeoutMs: 12_000, headers: BROWSER});
        const items = parseBaiduOnThisDay(body, `${mm}${dd}`);
        if (!items.length) throw new Error('empty list');
        return {source: 'baidu', day: `${mm}-${dd}`, items};
      }
      const items = parseWikiOnThisDay(await loadWiki(lang, day));
      if (!items.length) throw new Error('empty list');
      return {source: 'wiki', day: `${mm}-${dd}`, items};
    },
    async wallpaper({source = 'bing', index = 0, lang = 'zh', day} = {}) {
      if (source === 'wikimedia') {
        const {yyyy, mm, dd} = parseDayParts(day, now);
        const item = parseWikiImage(await loadWiki(lang, day), `${yyyy}-${mm}-${dd}`);
        if (!item) throw new Error('no wallpaper');
        return {source: 'wikimedia', index: 0, count: 1, title: item.title, credit: item.credit, date: item.date, pageUrl: item.pageUrl, src: await toDataUrl(item.imageUrl)};
      }
      const mkt = wikiLang(lang) === 'zh' ? 'zh-CN' : 'en-US';
      const body = await fetcher.get(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`, {ttlMs: TTL, timeoutMs: 12_000, headers: BROWSER});
      const list = parseBingWallpapers(body);
      if (!list.length) throw new Error('no wallpaper');
      const idx = ((Math.floor(Number(index) || 0) % list.length) + list.length) % list.length;
      const item = list[idx];
      return {source: 'bing', index: idx, count: list.length, title: item.title, credit: item.credit, date: item.date, pageUrl: item.pageUrl, src: await toDataUrl(item.imageUrl)};
    },
  };
}
