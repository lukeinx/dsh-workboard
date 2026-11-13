// 本机应用（仅 macOS）：扫描常见应用目录第一层的 .app；名称取 Finder 显示名（随系统语言），图标经 NSWorkspace 渲染成 PNG，运行状态看 ps 里的可执行文件路径。
import {createHash} from 'node:crypto';
import {mkdir, readdir, readFile, rm, stat} from 'node:fs/promises';
import {homedir, platform} from 'node:os';
import {basename, join} from 'node:path';
import {text} from './exec.js';

export const APP_DIRS = ['/Applications', '/Applications/Utilities', '/System/Applications', '/System/Applications/Utilities', join(homedir(), 'Applications')];
const EXTRA_APPS = ['/System/Library/CoreServices/Finder.app'];
const LIST_TTL = 5 * 60_000;
const RUN_TTL = 3000;
const MAX_APPS = 600;
const MAX_ICONS = 48;
const ICON_PX = 96;

const NAMES_JS = `ObjC.import('Foundation');
function run(argv) { const fm = $.NSFileManager.defaultManager; return JSON.stringify(argv.map(p => fm.displayNameAtPath(p).js)); }`;
// 参数：输出目录，随后是成对的 应用路径、文件名。
const ICONS_JS = `ObjC.import('AppKit');
function run(argv) {
  const dir = argv[0], px = ${ICON_PX}, ws = $.NSWorkspace.sharedWorkspace;
  for (let i = 1; i + 1 < argv.length; i += 2) {
    try {
      const img = ws.iconForFile(argv[i]);
      const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null, px, px, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
      $.NSGraphicsContext.saveGraphicsState;
      $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
      img.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, px, px), $.NSZeroRect, 2, 1);
      $.NSGraphicsContext.restoreGraphicsState;
      rep.representationUsingTypeProperties(4, $({})).writeToFileAtomically(dir + '/' + argv[i + 1] + '.png', true);
    } catch (e) {}
  }
  return '';
}`;

const fallbackName = path => basename(path).replace(/\.app$/i, '');

// 每行一个可执行文件路径；取第一个后面紧跟 /Contents/MacOS/ 的 .app 目录。
export function parseRunning(out) {
  const set = new Set();
  for (const line of text(out).split('\n')) {
    const m = /^\s*(\/.*?\.app)\/Contents\/MacOS\//.exec(line);
    if (m) set.add(m[1]);
  }
  return set;
}

const cleanPaths = paths => [...new Set((Array.isArray(paths) ? paths : []).map(String).filter(Boolean))];

export function createApps({run, os = platform(), dirs = APP_DIRS, extra = EXTRA_APPS, cacheDir, now = Date.now} = {}) {
  const supported = os === 'darwin';
  const icons = new Map();
  let listHit = null;
  let listJob = null;
  let runHit = null;

  async function scan() {
    const paths = [];
    for (const dir of dirs) {
      const entries = await readdir(dir, {withFileTypes: true}).catch(() => []);
      for (const e of entries) if (/\.app$/i.test(e.name) && (e.isDirectory() || e.isSymbolicLink())) paths.push(join(dir, e.name));
    }
    for (const path of extra) if (await stat(path).catch(() => null)) paths.push(path);
    const unique = [...new Set(paths)].slice(0, MAX_APPS);
    let names = [];
    if (unique.length) {
      try { names = JSON.parse(text(await run('osascript', ['-l', 'JavaScript', '-e', NAMES_JS, ...unique], {timeoutMs: 15_000}))); } catch { names = []; }
    }
    return unique.map((path, i) => ({path, name: (typeof names?.[i] === 'string' && names[i].trim()) || fallbackName(path)}));
  }

  async function all({fresh} = {}) {
    if (!fresh && listHit && now() - listHit.at < LIST_TTL) return listHit.items;
    listJob ??= scan().then(items => { listHit = {at: now(), items}; return items; }).finally(() => { listJob = null; });
    return listJob;
  }

  async function running() {
    if (runHit && now() - runHit.at < RUN_TTL) return runHit.set;
    const set = parseRunning(await run('ps', ['-axo', 'comm='], {timeoutMs: 5000, partial: true}).catch(() => ''));
    runHit = {at: now(), set};
    return set;
  }

  async function render(paths) {
    if (!cacheDir || !paths.length) return;
    await mkdir(cacheDir, {recursive: true});
    const keys = paths.map(p => createHash('sha1').update(p).digest('hex'));
    await run('osascript', ['-l', 'JavaScript', '-e', ICONS_JS, cacheDir, ...paths.flatMap((p, i) => [p, keys[i]])], {timeoutMs: 30_000}).catch(() => {});
    await Promise.all(paths.map(async (p, i) => {
      const file = join(cacheDir, `${keys[i]}.png`);
      const buf = await readFile(file).catch(() => null);
      if (buf) icons.set(p, `data:image/png;base64,${buf.toString('base64')}`);
      await rm(file, {force: true});
    }));
  }

  return {
    async list() {
      if (!supported) return {supported: false, items: []};
      return {supported: true, items: await all()};
    },
    async get({paths}) {
      if (!supported) return {supported: false, items: []};
      const [items, live] = await Promise.all([all(), running()]);
      const byPath = new Map(items.map(a => [a.path, a]));
      return {supported: true, items: cleanPaths(paths).map(path => {
        const app = byPath.get(path);
        return app ? {...app, running: live.has(path)} : {path, name: fallbackName(path), missing: true};
      })};
    },
    async icons({paths}) {
      if (!supported) return {};
      const known = new Set((await all()).map(a => a.path));
      const want = cleanPaths(paths).filter(p => known.has(p)).slice(0, MAX_ICONS);
      await render(want.filter(p => !icons.has(p)));
      return Object.fromEntries(want.filter(p => icons.has(p)).map(p => [p, icons.get(p)]));
    },
    // 只启动扫描到的应用目录里的 .app，不接受任意路径。
    async launch({path}) {
      if (!supported) throw Object.assign(new Error('launching apps is only supported on macOS'), {code: 'unavailable'});
      const target = String(path ?? '');
      const app = (await all()).find(a => a.path === target) ?? (await all({fresh: true})).find(a => a.path === target);
      if (!app) throw Object.assign(new Error(`not an installed app: ${target}`), {code: 'not-found'});
      await run('open', ['-a', app.path], {timeoutMs: 15_000});
      runHit = null;
      return {launched: true};
    },
  };
}
