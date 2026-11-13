// 微信读书：公开书城榜单（飙升 / 热搜 / 新书 / 总榜，无需登录）与官方 Agent API Gateway（书架 / 阅读时长 / 划线笔记，可选 WEREAD_API_KEY）。
const RANK_TTL = 30 * 60_000;
const PRIV_TTL = 5 * 60_000;
const LIMIT = 30;
const RANK_URL = 'https://weread.qq.com/web/bookListInCategory';
const GATEWAY_URL = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.5';
const RANK_KINDS = new Set(['rising', 'hot_search', 'newbook', 'all']);
const BROWSER = {'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'};

const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const searchUrl = title => `https://weread.qq.com/web/search/books?author=${encodeURIComponent(clip(title, 80))}`;

export function parseRankBooks(body) {
  const list = Array.isArray(body?.books) ? body.books : [];
  return list.filter(x => x?.bookInfo?.bookId && x.bookInfo.title).map(x => {
    const b = x.bookInfo;
    const rawRating = num(b.newRating);
    const rating = rawRating > 0 ? Math.round(rawRating) / 10 : 0;
    const category = clip(b.category || b.categories?.[0]?.title, 60);
    const intro = clip(b.intro, 280);
    return {
      id: String(b.bookId),
      title: clip(b.title, 120),
      author: clip(b.author, 80),
      ...(category ? {category} : {}),
      ...(rating ? {rating} : {}),
      readers: num(x.readingCount),
      ...(intro ? {intro} : {}),
      url: /^https?:\/\//.test(b.deepLink ?? '') ? b.deepLink : searchUrl(b.title),
    };
  }).slice(0, LIMIT);
}

export function parseShelf(body, statsBody = null) {
  const books = (Array.isArray(body?.books) ? body.books : []).filter(b => b?.bookId && b.title).map(b => {
    const category = clip(b.category, 60);
    return {
      id: String(b.bookId),
      title: clip(b.title, 120),
      author: clip(b.author, 80),
      ...(category ? {category} : {}),
      finished: Number(b.finishReading) === 1,
      isTop: Boolean(b.isTop),
      isAlbum: false,
      updatedAt: (num(b.readUpdateTime) || num(b.updateTime)) * 1000,
      url: searchUrl(b.title),
    };
  });
  const albums = (Array.isArray(body?.albums) ? body.albums : []).filter(x => x?.albumInfo?.albumId && x.albumInfo.name).map(x => {
    const a = x.albumInfo;
    const ex = x.albumInfoExtra ?? {};
    const category = clip(a.finishStatus, 60);
    return {
      id: `album:${a.albumId}`,
      title: clip(a.name, 120),
      author: clip(a.authorName, 80),
      ...(category ? {category} : {}),
      finished: Number(a.finish) === 1,
      isTop: Boolean(ex.isTop),
      isAlbum: true,
      updatedAt: (num(ex.lectureReadUpdateTime) || num(a.updateTime)) * 1000,
      url: searchUrl(a.name),
    };
  });
  const items = [...books, ...albums]
    .sort((a, b) => Number(b.isTop) - Number(a.isTop) || b.updatedAt - a.updatedAt)
    .slice(0, LIMIT);
  const totalBooks = books.length + albums.length + (body?.mp ? 1 : 0);
  const stats = {
    totalBooks,
    totalSeconds: num(statsBody?.totalReadTime),
    readDays: num(statsBody?.readDays),
  };
  return {items, stats};
}

export function parseNotebooks(notebooksBody, bookmarkBodies = []) {
  const books = (Array.isArray(notebooksBody?.books) ? notebooksBody.books : []).filter(x => x?.bookId && x?.book?.title);
  const byBook = new Map(books.map(x => [String(x.bookId), x]));
  const highlights = [];
  for (const bm of bookmarkBodies) {
    if (!bm || !Array.isArray(bm.updated)) continue;
    const bookId = String(bm.book?.bookId || bm.updated[0]?.bookId || '');
    const entry = byBook.get(bookId);
    const title = clip(bm.book?.title || entry?.book?.title, 120);
    const author = clip(bm.book?.author || entry?.book?.author, 80);
    if (!title) continue;
    const chapters = new Map((Array.isArray(bm.chapters) ? bm.chapters : []).map(c => [c?.chapterUid, clip(c?.title, 80)]));
    for (const m of bm.updated) {
      const text = clip(m?.markText, 320);
      if (!text) continue;
      const chapter = chapters.get(m.chapterUid) || '';
      highlights.push({
        id: String(m.bookmarkId || `${bookId}:${m.range || highlights.length}`),
        bookId,
        title,
        author,
        ...(chapter ? {chapter} : {}),
        text,
        createdAt: num(m.createTime) * 1000,
        url: searchUrl(title),
      });
    }
  }
  highlights.sort((a, b) => b.createdAt - a.createdAt);
  const items = highlights.length
    ? highlights.slice(0, LIMIT)
    : books.map(x => {
      const count = num(x.noteCount) + num(x.reviewCount) + num(x.bookmarkCount);
      return {
        id: `nb:${x.bookId}`,
        bookId: String(x.bookId),
        title: clip(x.book.title, 120),
        author: clip(x.book.author, 80),
        text: '',
        noteCount: count,
        createdAt: num(x.sort) * 1000,
        url: searchUrl(x.book.title),
      };
    }).slice(0, LIMIT);
  return {
    items,
    totalBooks: num(notebooksBody?.totalBookCount) || books.length,
    totalNotes: num(notebooksBody?.totalNoteCount),
  };
}

export function createWeread(fetcher, {env = process.env} = {}) {
  const resolveKey = apiKey => String(apiKey || env?.WEREAD_API_KEY || '').trim();
  const callAgent = async (key, apiName, params = {}, ttlMs = PRIV_TTL) => {
    const body = JSON.stringify({api_name: apiName, skill_version: SKILL_VERSION, ...params});
    const res = await fetcher.get(GATEWAY_URL, {
      ttlMs,
      timeoutMs: 12_000,
      maxBytes: 3_000_000,
      headers: {authorization: `Bearer ${key}`, 'content-type': 'application/json'},
      body,
    });
    if (res?.errcode) throw new Error(clip(res.errmsg || res.message, 160) || `WeRead error ${res.errcode}`);
    return res;
  };

  return {
    async list({kind = 'rising', apiKey = ''} = {}) {
      const key = resolveKey(apiKey);
      const hasKey = Boolean(key);
      if (kind === 'shelf') {
        if (!key) throw new Error('WEREAD_API_KEY is required');
        const [shelfBody, statsBody] = await Promise.all([
          callAgent(key, '/shelf/sync'),
          callAgent(key, '/readdata/detail', {mode: 'weekly'}).catch(() => null),
        ]);
        return {kind: 'shelf', hasKey, ...parseShelf(shelfBody, statsBody)};
      }
      if (kind === 'notes') {
        if (!key) throw new Error('WEREAD_API_KEY is required');
        const nb = await callAgent(key, '/user/notebooks', {count: 20});
        const topIds = (Array.isArray(nb?.books) ? nb.books : []).slice(0, 4).map(b => String(b?.bookId ?? '')).filter(Boolean);
        const marks = await Promise.all(topIds.map(bookId => callAgent(key, '/book/bookmarklist', {bookId}).catch(() => null)));
        return {kind: 'notes', hasKey, ...parseNotebooks(nb, marks)};
      }
      if (!RANK_KINDS.has(kind)) throw new Error(`unknown weread kind ${kind}`);
      const body = await fetcher.get(`${RANK_URL}/${kind}?rank=1`, {ttlMs: RANK_TTL, maxBytes: 2_000_000, timeoutMs: 12_000, headers: BROWSER});
      const items = parseRankBooks(body);
      if (!items.length) throw new Error('empty book list');
      return {kind, hasKey, items};
    },
  };
}
