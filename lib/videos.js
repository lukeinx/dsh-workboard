// 视频订阅：YouTube 频道 RSS、B 站 UP 主投稿和带封面的 RSS / Atom，合并成按时间倒序的列表；封面由 Host 代理成 data: URL。
import {decodeText, parseFeed} from './feed.js';

const TTL = 15 * 60_000;
const ID_TTL = 7 * 86400_000;
const THUMB_TTL = 86400_000;
const MAX_SOURCES = 12;
const PER_SOURCE = 15;
const MAX_ITEMS = 60;
const MAX_THUMBS = 2000;
const BROWSER = {'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'};
const YT_ID = /^UC[\w-]{22}$/;

// 一行一个来源，其余文字作为显示名：空间链接或纯数字是 B 站 UID，UC… / @handle / 频道链接是 YouTube，其他 http(s) 地址当 RSS。
export function parseSource(line) {
  const tokens = String(line ?? '').trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const label = [...tokens.slice(0, i), ...tokens.slice(i + 1)].join(' ');
    let m;
    if ((m = /^(?:https?:\/\/)?space\.bilibili\.com\/(\d+)/i.exec(raw)) || (m = /^(?:bili(?:bili)?:)?(\d{1,12})$/i.exec(raw))) return {kind: 'bilibili', id: m[1], label};
    if ((m = /youtube\.com\/(?:channel\/|feeds\/videos\.xml\?channel_id=)(UC[\w-]{22})/i.exec(raw)) || (YT_ID.test(raw) && (m = [raw, raw]))) return {kind: 'youtube', id: m[1], label};
    if ((m = /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(@[\w.\-\u00b7]+)/i.exec(raw)) || (m = /^(@[\w.\-\u00b7]+)$/.exec(raw))) return {kind: 'handle', id: m[1], label};
    if (/^https?:\/\//i.test(raw)) return {kind: 'rss', id: raw, label};
  }
  return null;
}

const tag = (block, name) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '';
const attr = (block, name, key) => block.match(new RegExp(`<${name}\\b[^>]*\\b${key}="([^"]*)"`, 'i'))?.[1] ?? '';
const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

export function parseYoutubeFeed(xml) {
  const text = String(xml ?? '');
  if (!/<feed[\s>]/i.test(text)) throw new Error('not a YouTube feed');
  const head = text.split(/<entry\b/i)[0];
  const author = decodeText(tag(head, 'title'));
  const items = [...text.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(m => m[1]).map(block => {
    const id = decodeText(tag(block, 'yt:videoId'));
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    const date = Date.parse(decodeText(tag(block, 'published')));
    return {
      id: `yt:${id}`, title: decodeText(tag(block, 'title')).slice(0, 300), url: `https://www.youtube.com/watch?v=${id}`,
      thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, date: Number.isFinite(date) ? date : 0,
      author: decodeText(tag(tag(block, 'author'), 'name')) || author, duration: null, views: num(attr(block, 'media:statistics', 'views')),
    };
  }).filter(Boolean);
  return {author, items};
}

export function parseBiliArchives(json) {
  if (json?.code !== 0) throw new Error(json?.message || `bilibili error ${json?.code}`);
  return (json.data?.archives ?? []).filter(a => a?.bvid && a.title).map(a => ({
    id: `bili:${a.bvid}`, title: decodeText(a.title).slice(0, 300), url: `https://www.bilibili.com/video/${a.bvid}`,
    thumb: a.pic ? `${String(a.pic).replace(/^http:/, 'https:')}@320w_180h_1c.jpg` : '',
    date: Number(a.pubdate) > 0 ? Number(a.pubdate) * 1000 : 0, author: '', duration: num(a.duration), views: num(a.stat?.view),
  }));
}

export function parseChannelId(html) {
  const s = String(html ?? '');
  return (/"externalId":"(UC[\w-]{22})"/.exec(s) ?? /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/.exec(s) ?? /<meta itemprop="identifier" content="(UC[\w-]{22})"/.exec(s))?.[1] ?? '';
}

export function createVideos(fetcher, {now = Date.now, pause = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  const ids = new Map();
  const thumbs = new Set();
  // B 站接口间歇性返回 412 风控：串行请求，412 时退避重试。
  let biliQueue = Promise.resolve();
  const biliGet = (url, opts) => {
    const job = biliQueue.then(async () => {
      for (let attempt = 0; ; attempt++) {
        try { return await fetcher.get(url, opts); } catch (error) {
          if (attempt >= 2 || !/HTTP 412/.test(String(error?.message))) throw error;
          await pause(600 * (attempt + 1));
        }
      }
    });
    biliQueue = job.catch(() => {});
    return job;
  };

  const remember = (map, key, load) => {
    const hit = map.get(key);
    if (hit && now() - hit.at < ID_TTL) return hit.value;
    return load().then(value => { map.set(key, {at: now(), value}); return value; });
  };

  async function load(src) {
    if (src.kind === 'handle') {
      const id = await remember(ids, src.id, async () => {
        const found = parseChannelId(await fetcher.get(`https://www.youtube.com/${encodeURIComponent(src.id).replace('%40', '@')}`, {ttlMs: TTL, type: 'text', maxBytes: 6_000_000, timeoutMs: 15_000, headers: {...BROWSER, 'accept-language': 'en'}}));
        if (!found) throw new Error(`YouTube channel not found: ${src.id}`);
        return found;
      });
      return load({...src, kind: 'youtube', id});
    }
    if (src.kind === 'youtube') {
      const feed = parseYoutubeFeed(await fetcher.get(`https://www.youtube.com/feeds/videos.xml?channel_id=${src.id}`, {ttlMs: TTL, type: 'text', maxBytes: 2_000_000, timeoutMs: 15_000}));
      return {name: src.label || feed.author, items: feed.items};
    }
    if (src.kind === 'bilibili') {
      const headers = {...BROWSER, referer: `https://space.bilibili.com/${src.id}/video`};
      const [archives, name] = await Promise.all([
        biliGet(`https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${src.id}&keywords=&ps=${PER_SOURCE}`, {ttlMs: TTL, headers}),
        src.label || Promise.resolve().then(() => remember(ids, `bili:${src.id}`, async () => (await biliGet(`https://api.bilibili.com/x/web-interface/card?mid=${src.id}`, {ttlMs: ID_TTL, headers}))?.data?.card?.name ?? '')).catch(() => ''),
      ]);
      return {name: name || src.id, items: parseBiliArchives(archives).map(it => ({...it, author: name || src.id}))};
    }
    const feed = parseFeed(await fetcher.get(src.id, {ttlMs: TTL, type: 'text', maxBytes: 3_000_000, timeoutMs: 15_000}));
    const name = src.label || feed.title;
    return {name, items: feed.items.filter(it => it.link).map(it => ({id: it.guid || it.link, title: it.title, url: it.link, thumb: it.image, date: it.date, author: name, duration: null, views: null}))};
  }

  return {
    async list({sources}) {
      const lines = (Array.isArray(sources) ? sources : String(sources ?? '').split('\n')).map(s => String(s).trim()).filter(Boolean).slice(0, MAX_SOURCES);
      const errors = [];
      const items = [];
      await Promise.all(lines.map(async (line, source) => {
        const src = parseSource(line);
        if (!src) { errors.push({source: line, message: 'unrecognized source'}); return; }
        try {
          const got = await load(src);
          for (const it of got.items.slice(0, PER_SOURCE)) items.push({...it, source});
        } catch (error) {
          errors.push({source: line, message: String(error?.message || error)});
        }
      }));
      items.sort((a, b) => b.date - a.date);
      const out = items.slice(0, MAX_ITEMS);
      for (const it of out) if (it.thumb) thumbs.add(it.thumb);
      while (thumbs.size > MAX_THUMBS) thumbs.delete(thumbs.values().next().value);
      return {items: out, errors};
    },
    // 只代理最近列表里出现过的封面，避免变成任意 URL 的代理。
    async thumb({url}) {
      const src = String(url ?? '');
      if (!thumbs.has(src)) throw new Error('unknown thumbnail');
      const referer = /\.hdslb\.com\//.test(src) ? {referer: 'https://www.bilibili.com/'} : {};
      const img = await fetcher.get(src, {ttlMs: THUMB_TTL, type: 'bytes', maxBytes: 800_000, headers: {...BROWSER, ...referer}});
      if (!/^image\//.test(img.type)) throw new Error('not an image');
      return `data:${img.type};base64,${img.base64}`;
    },
  };
}
