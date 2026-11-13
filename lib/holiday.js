// 中国大陆法定节假日与调休：holiday-cn 按年发布的 JSON（从国务院通知整理），先走 jsDelivr，不通再走 GitHub raw。
// 明年的安排通常在年底才公布，缺失时只返回今年。
const TTL = 12 * 3600_000;
const MIRRORS = [
  year => `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
  year => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,
];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseHolidays(d) {
  if (!d || !Array.isArray(d.days)) throw new Error('not a holiday-cn file');
  return d.days.filter(x => DAY.test(x?.date ?? '') && x.name).map(x => ({date: x.date, name: String(x.name).slice(0, 20), off: x.isOffDay === true}));
}

export function createHolidays(fetcher) {
  const year = async y => {
    let lastError = null;
    for (const url of MIRRORS) {
      try {
        return parseHolidays(await fetcher.get(url(y), {ttlMs: TTL, maxBytes: 200_000, timeoutMs: 10_000}));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };
  return {
    async list({year: raw}) {
      const y = Number(raw);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new Error('invalid year');
      const [current, next] = await Promise.allSettled([year(y), year(y + 1)]);
      if (current.status === 'rejected') throw current.reason;
      const days = [...current.value, ...(next.status === 'fulfilled' ? next.value : [])].sort((a, b) => (a.date < b.date ? -1 : 1));
      return {years: next.status === 'fulfilled' && next.value.length ? [y, y + 1] : [y], days};
    },
  };
}
