// RSS 2.0 / RSS 1.0 (RDF) / Atom 解析：只取标题、链接、时间，不依赖 XML 库。
const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};

export function decodeText(raw) {
  return String(raw ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const tag = (block, names) => {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
    if (m) return m[1];
  }
  return '';
};

const safeLink = raw => {
  const value = decodeText(raw);
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
};

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)].map(m => {
    const attr = name => m[1].match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
    const href = attr('href');
    const rel = attr('rel');
    return {href: href ? (href[2] ?? href[3]) : '', rel: rel ? (rel[2] ?? rel[3]) : 'alternate'};
  });
  return (links.find(l => l.rel === 'alternate') ?? links[0])?.href ?? '';
}

function parseDate(raw) {
  const text = decodeText(raw);
  if (!text) return 0;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : 0;
}

export function parseFeed(xml) {
  const text = String(xml ?? '');
  const atom = /<feed[\s>]/i.test(text) && !/<rss[\s>]/i.test(text);
  const blocks = [...text.matchAll(atom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
  if (!blocks.length && !/<(rss|feed|rdf:RDF)[\s>]/i.test(text)) throw new Error('not an RSS or Atom feed');
  const first = text.search(atom ? /<entry\b/i : /<item\b/i);
  const head = first > 0 ? text.slice(0, first) : text;
  const items = blocks.map(block => {
    const link = atom ? safeLink(atomLink(block)) : safeLink(tag(block, ['link'])) || safeLink(tag(block, ['guid']));
    return {
      title: decodeText(tag(block, ['title'])).slice(0, 300),
      link,
      date: parseDate(tag(block, atom ? ['published', 'updated'] : ['pubDate', 'dc:date', 'published', 'updated'])),
    };
  }).filter(item => item.title || item.link);
  return {title: decodeText(tag(head, ['title'])).slice(0, 120), items};
}
