// 剪贴板：只读文本（macOS pbpaste，Linux wl-paste / xclip）。有人在看时每 2 秒采样一次，历史只在内存里，Host 重启即清空；60 秒无人请求后停止采样。
import {platform} from 'node:os';
import {text} from './exec.js';

const SAMPLE_MS = 2000;
const IDLE_MS = 60_000;
const MAX_ITEMS = 30;
const MAX_CHARS = 20_000;

const READERS = {
  darwin: [['pbpaste', []]],
  linux: [['wl-paste', ['--no-newline', '--type', 'text']], ['xclip', ['-selection', 'clipboard', '-o']]],
};

export function createClipboard({run, os = platform(), now = Date.now} = {}) {
  const readers = READERS[os] ?? [];
  let items = [];
  let lastSeen = null;
  let seq = 0;
  let timer = null;
  let lastAsk = 0;
  let job = null;
  let reader = null;
  let failure = '';

  async function read() {
    for (const r of reader ? [reader] : readers) {
      try {
        const value = text(await run(r[0], r[1], {timeoutMs: 2000, maxBuffer: 2_000_000}));
        reader = r;
        failure = '';
        return value;
      } catch (error) {
        failure = String(error?.message || error);
      }
    }
    return null;
  }

  async function sample() {
    const value = await read();
    if (value == null || !value.trim()) return;
    const clipped = value.slice(0, MAX_CHARS);
    if (clipped === lastSeen) return;
    lastSeen = clipped;
    items = [{id: `c${++seq}`, text: clipped, at: now(), truncated: value.length > MAX_CHARS}, ...items.filter(x => x.text !== clipped)].slice(0, MAX_ITEMS);
  }
  const sampleOnce = () => (job ??= sample().finally(() => { job = null; }));
  const tick = () => {
    if (now() - lastAsk > IDLE_MS) { clearInterval(timer); timer = null; return; }
    void sampleOnce();
  };

  return {
    supported: readers.length > 0 && Boolean(run),
    async get() {
      if (!readers.length || !run) return {supported: false, items: []};
      lastAsk = now();
      await sampleOnce();
      if (!timer) { timer = setInterval(tick, SAMPLE_MS); timer.unref?.(); }
      return {supported: true, items, error: items.length ? '' : failure};
    },
    remove(id) {
      const before = items.length;
      items = id ? items.filter(x => x.id !== id) : [];
      return before - items.length;
    },
    stop() { clearInterval(timer); timer = null; },
  };
}
