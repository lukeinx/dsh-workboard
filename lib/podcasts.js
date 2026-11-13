// 播客：支持标准 Podcast RSS / Atom（含 rsshub://）、小宇宙播客主页、Apple Podcasts 链接 / ID / 搜索词，以及 Apple 科技播客榜。
import {decodeText, resolveFeedUrl} from './feed.js';

const TTL = 20 * 60_000;
const TOP_TTL = 60 * 60_000;
const ID_TTL = 7 * 86400_000;
const THUMB_TTL = 86400_000;
const MAX_SOURCES = 12;
const PER_SOURCE = 10;
const MAX_ITEMS = 45;
const MAX_THUMBS = 2000;
const BROWSER = {'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'};

const clip = (s, n) => decodeText(String(s ?? '')).replace(/\s+/g, ' ').trim().slice(0, n);
const tag = (block, name) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '';
const attr = (block, name, key) => block.match(new RegExp(`<${name}\\b[^>]*\\b${key}=["']([^"']*)["']`, 'i'))?.[1] ?? '';
const safeHttp = u => (/^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim().replace(/^http:\/\//i, 'https://') : '');

export function parseDuration(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s) || null;
  const parts = s.split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// 一行一个播客源：支持小宇宙链接 / xyz:<id>、Apple Podcasts 链接 / apple:<id>、rsshub://、http(s) RSS，或 search:<关键词>。
export function parsePodcastSource(line, rsshub = '') {
  const text = String(line ?? '').trim();
  if (!text || text.startsWith('#')) return null;
  const tokens = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const label = [...tokens.slice(0, i), ...tokens.slice(i + 1)].join(' ').slice(0, 80);
    let m;
    if ((m = /^(?:https?:\/\/)?(?:www\.)?xiaoyuzhoufm\.com\/podcast\/([a-f0-9]{20,28})/i.exec(raw))
      || (m = /^(?:xyz|xiaoyuzhou):([a-f0-9]{20,28})$/i.exec(raw))) {
      return {kind: 'xiaoyuzhou', id: m[1], label};
    }
    if ((m = /^(?:https?:\/\/)?podcasts\.apple\.com\/[^\s]*?\/id(\d{6,14})/i.exec(raw))
      || (m = /^(?:apple|itunes):(\d{6,14})$/i.exec(raw))) {
      return {kind: 'apple', id: m[1], label};
    }
    if ((m = /^(?:search|itunes):(.+)$/i.exec(raw))) {
      const q = [m[1], label].filter(Boolean).join(' ').trim();
      return q ? {kind: 'search', id: q, label: ''} : null;
    }
    if (/^rsshub:\/\//i.test(raw)) {
      return {kind: 'rss', id: resolveFeedUrl(raw, rsshub), label};
    }
    if (/^https?:\/\//i.test(raw)) {
      return {kind: 'rss', id: raw, label};
    }
  }
  return {kind: 'search', id: text.slice(0, 80), label: ''};
}

export function parsePodcastFeed(xml, fallbackName = '') {
  const text = String(xml ?? '');
  if (!/<(?:rss|feed|RDF)\b/i.test(text)) throw new Error('not a podcast feed');
  const isAtom = /<feed[\s>]/i.test(text);
  const head = text.split(isAtom ? /<entry[\s>]/i : /<item[\s>]/i)[0] ?? '';
  const channelTitle = clip(tag(head, 'title'), 120) || fallbackName;
  const channelThumb = safeHttp(attr(head, 'itunes:image', 'href') || tag(tag(head, 'image'), 'url'));
  const blocks = [...text.matchAll(isAtom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
  const items = blocks.map(b => {
    const title = clip(tag(b, 'title'), 200);
    if (!title) return null;
    const audio = safeHttp(attr(b, 'enclosure', 'url'));
    const rawLink = isAtom
      ? (attr(b, 'link(?=[^>]*rel=["\']alternate["\'])', 'href') || attr(b, 'link', 'href'))
      : tag(b, 'link');
    const url = safeHttp(decodeText(rawLink)) || audio;
    if (!url) return null;
    const pub = decodeText(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const date = Date.parse(pub) || 0;
    const duration = parseDuration(decodeText(tag(b, 'itunes:duration')));
    const notes = clip(tag(b, 'itunes:summary') || tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded'), 420);
    const thumb = safeHttp(attr(b, 'itunes:image', 'href') || attr(b, 'media:thumbnail', 'url')) || channelThumb;
    const guid = clip(tag(b, 'guid') || tag(b, 'id'), 200) || url;
    return {
      id: `rss:${guid}`,
      title,
      podcast: fallbackName || channelTitle,
      url,
      audio,
      duration,
      date,
      notes,
      thumb,
    };
  }).filter(Boolean);
  return {name: fallbackName || channelTitle, thumb: channelThumb, items};
}

export function parseXiaoyuzhou(html, fallbackName = '') {
  const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i.exec(String(html ?? ''));
  if (!m) throw new Error('xiaoyuzhou data not found');
  const p = JSON.parse(m[1])?.props?.pageProps?.podcast;
  if (!p?.title && !Array.isArray(p?.episodes)) throw new Error('invalid xiaoyuzhou podcast');
  const podcast = fallbackName || clip(p.title, 120);
  const podThumb = safeHttp(p.image?.smallPicUrl || p.image?.picUrl);
  const items = (p.episodes ?? []).filter(e => e?.eid && e?.title).map(e => ({
    id: `xyz:${e.eid}`,
    title: clip(e.title, 200),
    podcast,
    url: `https://www.xiaoyuzhoufm.com/episode/${e.eid}`,
    audio: safeHttp(e.enclosure?.url),
    duration: parseDuration(e.duration),
    date: Date.parse(e.pubDate ?? '') || 0,
    notes: clip(e.description || e.shownotes, 420),
    thumb: safeHttp(e.image?.smallPicUrl || e.image?.picUrl) || podThumb,
  }));
  return {name: podcast, thumb: podThumb, items};
}

export function parseItunesTop(json) {
  const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
  return entries.map((e, i) => {
    const id = String(e?.id?.attributes?.['im:id'] ?? '').trim();
    const name = clip(e?.['im:name']?.label, 120);
    if (!id || !name) return null;
    const imgs = Array.isArray(e?.['im:image']) ? e['im:image'] : [];
    const thumb = safeHttp(imgs.at(-1)?.label);
    return {
      rank: i + 1,
      id,
      spec: `apple:${id} ${name}`,
      name,
      author: clip(e?.['im:artist']?.label, 100),
      summary: clip(e?.summary?.label, 300),
      category: clip(e?.category?.attributes?.label, 60),
      url: safeHttp(e?.id?.label) || `https://podcasts.apple.com/podcast/id${id}`,
      thumb,
    };
  }).filter(Boolean);
}

export function createPodcasts(fetcher, {now = Date.now} = {}) {
  const resolved = new Map();
  const thumbs = new Set();

  const remember = (key, load) => {
    const hit = resolved.get(key);
    if (hit && now() - hit.at < ID_TTL) return Promise.resolve(hit.value);
    return load().then(value => { resolved.set(key, {at: now(), value}); return value; });
  };

  const trackThumb = url => {
    if (!url) return;
    thumbs.add(url);
    while (thumbs.size > MAX_THUMBS) thumbs.delete(thumbs.values().next().value);
  };

  async function loadSource(src) {
    if (src.kind === 'xiaoyuzhou') {
      const html = await fetcher.get(`https://www.xiaoyuzhoufm.com/podcast/${src.id}`, {ttlMs: TTL, type: 'text', maxBytes: 3_000_000, timeoutMs: 15_000, headers: BROWSER});
      return parseXiaoyuzhou(html, src.label);
    }
    if (src.kind === 'apple') {
      const meta = await remember(`apple:${src.id}`, async () => {
        const res = await fetcher.get(`https://itunes.apple.com/lookup?id=${encodeURIComponent(src.id)}&entity=podcast`, {ttlMs: ID_TTL, timeoutMs: 12_000});
        const item = (res?.results ?? []).find(r => r?.feedUrl);
        if (!item?.feedUrl) throw new Error(`Apple Podcast feed not found: ${src.id}`);
        return {feedUrl: item.feedUrl, name: clip(item.collectionName, 120), thumb: safeHttp(item.artworkUrl600 || item.artworkUrl100)};
      });
      const xml = await fetcher.get(meta.feedUrl, {ttlMs: TTL, type: 'text', maxBytes: 12_000_000, timeoutMs: 15_000, headers: BROWSER});
      const parsed = parsePodcastFeed(xml, src.label || meta.name);
      return {
        name: parsed.name,
        thumb: parsed.thumb || meta.thumb,
        items: parsed.items.map(it => ({...it, thumb: it.thumb || meta.thumb})),
      };
    }
    if (src.kind === 'search') {
      const meta = await remember(`search:${src.id.toLowerCase()}`, async () => {
        const res = await fetcher.get(`https://itunes.apple.com/search?media=podcast&limit=1&term=${encodeURIComponent(src.id)}`, {ttlMs: ID_TTL, timeoutMs: 12_000});
        const item = (res?.results ?? []).find(r => r?.feedUrl);
        if (!item?.feedUrl) throw new Error(`Podcast not found: ${src.id}`);
        return {feedUrl: item.feedUrl, name: clip(item.collectionName, 120), thumb: safeHttp(item.artworkUrl600 || item.artworkUrl100)};
      });
      const xml = await fetcher.get(meta.feedUrl, {ttlMs: TTL, type: 'text', maxBytes: 12_000_000, timeoutMs: 15_000, headers: BROWSER});
      const parsed = parsePodcastFeed(xml, src.label || meta.name);
      return {
        name: parsed.name,
        thumb: parsed.thumb || meta.thumb,
        items: parsed.items.map(it => ({...it, thumb: it.thumb || meta.thumb})),
      };
    }
    const xml = await fetcher.get(src.id, {ttlMs: TTL, type: 'text', maxBytes: 12_000_000, timeoutMs: 15_000, headers: BROWSER});
    return parsePodcastFeed(xml, src.label);
  }

  return {
    async list({sources, rsshub = '', region = 'cn'} = {}) {
      const lines = (Array.isArray(sources) ? sources : String(sources ?? '').split('\n')).map(s => String(s).trim()).filter(Boolean).slice(0, MAX_SOURCES);
      const errors = [];
      const items = [];
      await Promise.all(lines.map(async (line, source) => {
        let src;
        try {
          src = parsePodcastSource(line, rsshub);
        } catch (error) {
          errors.push({source: line, message: String(error?.message || error)});
          return;
        }
        if (!src) return;
        try {
          const got = await loadSource(src);
          for (const it of got.items.slice(0, PER_SOURCE)) {
            trackThumb(it.thumb);
            items.push({...it, source});
          }
        } catch (error) {
          errors.push({source: line, message: String(error?.message || error)});
        }
      }));
      items.sort((a, b) => b.date - a.date);
      const reg = region === 'us' ? 'us' : 'cn';
      let top = [];
      try {
        const topJson = await fetcher.get(`https://itunes.apple.com/${reg}/rss/toppodcasts/limit=20/genre=1318/json`, {ttlMs: TOP_TTL, timeoutMs: 12_000});
        top = parseItunesTop(topJson);
        for (const t of top) trackThumb(t.thumb);
      } catch {}
      return {items: items.slice(0, MAX_ITEMS), top, errors};
    },
    async thumb({url}) {
      const src = String(url ?? '');
      if (!thumbs.has(src)) throw new Error('unknown podcast thumbnail');
      const img = await fetcher.get(src, {ttlMs: THUMB_TTL, type: 'bytes', maxBytes: 800_000, headers: BROWSER});
      if (!/^image\//.test(img.type)) throw new Error('not an image');
      return `data:${img.type};base64,${img.base64}`;
    },
  };
}
