// 本机应用（macOS 与 Windows）。
// macOS：扫描常见应用目录第一层的 .app，名称取 Finder 显示名，图标经 NSWorkspace 渲染成 PNG，运行状态看 ps 里的可执行文件路径。
// Windows：读 shell:AppsFolder（与「开始」菜单的所有应用一致，含商店应用），以 AppID 作为 path；图标取快捷方式目标 exe 的关联图标，运行状态比对 Get-Process 的可执行文件路径，商店应用两者都没有。
import {createHash} from 'node:crypto';
import {mkdir, readdir, readFile, rm, stat} from 'node:fs/promises';
import {homedir, platform} from 'node:os';
import {join, win32} from 'node:path';
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

const UTF8_PS = '[Console]::OutputEncoding = [Text.Encoding]::UTF8';
const WIN_LIST_PS = `${UTF8_PS}
$out = foreach ($i in (New-Object -ComObject Shell.Application).NameSpace('shell:AppsFolder').Items()) {
  $t = $null
  try { $t = $i.ExtendedProperty('System.Link.TargetParsingPath') } catch {}
  [pscustomobject]@{ id = $i.Path; name = $i.Name; target = $t }
}
ConvertTo-Json -Compress -InputObject @($out)`;
const WIN_RUN_PS = `${UTF8_PS}
Get-Process | ForEach-Object { $_.Path } | Where-Object { $_ }`;
// 任务以 base64 JSON 嵌入脚本，路径不经过命令行引号转义。
const winIconsPs = job => `Add-Type -AssemblyName System.Drawing
$job = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(JSON.stringify(job)).toString('base64')}')) | ConvertFrom-Json
foreach ($x in $job.items) {
  try {
    $ic = [System.Drawing.Icon]::ExtractAssociatedIcon($x.t)
    if ($ic) { $bmp = $ic.ToBitmap(); $bmp.Save((Join-Path $job.dir ($x.k + '.png')), [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $ic.Dispose() }
  } catch {}
}`;
const psArgs = script => ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];

// AppsFolder 里桌面程序的 AppID 常写成「已知文件夹 GUID\相对路径」。
const KNOWN_FOLDERS = {
  '{6D809377-6AF0-444B-8957-A3773F02200E}': env => env.ProgramW6432 || env.ProgramFiles,
  '{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}': env => env['ProgramFiles(x86)'],
  '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}': env => env.SystemRoot && win32.join(env.SystemRoot, 'System32'),
  '{F38BF404-1D43-42F2-9305-67DE0B28FC23}': env => env.SystemRoot,
};

export function winTarget(id, target, env = process.env) {
  if (typeof target === 'string' && /^[a-z]:\\/i.test(target)) return target;
  if (/^[a-z]:\\.+\.exe$/i.test(id)) return id;
  const m = /^(\{[0-9A-F-]{36}\})\\(.+\.exe)$/i.exec(id);
  const base = m && KNOWN_FOLDERS[m[1].toUpperCase()]?.(env);
  return base ? win32.join(base, m[2]) : null;
}

// 网页链接和卸载程序也会出现在 AppsFolder 里，不算应用。
export function parseWinApps(out, env = process.env) {
  let rows;
  try { rows = JSON.parse(text(out).replace(/^\uFEFF/, '').trim() || '[]'); } catch { return []; }
  return (Array.isArray(rows) ? rows : [rows]).filter(r => r && typeof r.id === 'string' && r.id && typeof r.name === 'string' && r.name.trim())
    .filter(r => !/^[a-z][a-z0-9+.-]*:\/\//i.test(r.id) && !/^(uninstall|卸载)|\buninstall\b/i.test(r.name) && !/(^|\\)unins[^\\]*\.exe$/i.test(r.id))
    .map(r => ({path: r.id, name: r.name.trim(), target: winTarget(r.id, r.target, env)}));
}

export const fallbackName = path => String(path).replace(/!.*$/, '').split(/[\\/]/).filter(Boolean).pop()?.replace(/\.(app|exe)$|_[a-z0-9]{13}$/i, '') || String(path);

// 每行一个可执行文件路径；取第一个后面紧跟 /Contents/MacOS/ 的 .app 目录。
export function parseRunning(out) {
  const set = new Set();
  for (const line of text(out).split('\n')) {
    const m = /^\s*(\/.*?\.app)\/Contents\/MacOS\//.exec(line);
    if (m) set.add(m[1]);
  }
  return set;
}

export const parseWinRunning = out => new Set(text(out).split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean));

const cleanPaths = paths => [...new Set((Array.isArray(paths) ? paths : []).map(String).filter(Boolean))];
const iconKey = path => createHash('sha1').update(path).digest('hex');

function macBackend({run, dirs, extra, cacheDir}) {
  return {
    async scan() {
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
    },
    running: async () => parseRunning(await run('ps', ['-axo', 'comm='], {timeoutMs: 5000, partial: true}).catch(() => '')),
    runKey: app => app.path,
    async render(apps) {
      await run('osascript', ['-l', 'JavaScript', '-e', ICONS_JS, cacheDir, ...apps.flatMap(a => [a.path, iconKey(a.path)])], {timeoutMs: 30_000}).catch(() => {});
    },
    iconable: () => true,
    launch: app => run('open', ['-a', app.path], {timeoutMs: 15_000}),
  };
}

function winBackend({run, env, cacheDir}) {
  return {
    scan: async () => parseWinApps(await run('powershell.exe', psArgs(WIN_LIST_PS), {timeoutMs: 20_000}), env).slice(0, MAX_APPS),
    running: async () => parseWinRunning(await run('powershell.exe', psArgs(WIN_RUN_PS), {timeoutMs: 10_000, partial: true}).catch(() => '')),
    runKey: app => app.target?.toLowerCase(),
    async render(apps) {
      const job = {dir: cacheDir, items: apps.map(a => ({t: a.target, k: iconKey(a.path)}))};
      await run('powershell.exe', psArgs(winIconsPs(job)), {timeoutMs: 30_000}).catch(() => {});
    },
    iconable: app => Boolean(app.target),
    // explorer.exe 启动成功时也常以退出码 1 结束。
    launch: app => run('explorer.exe', [`shell:AppsFolder\\${app.path}`], {timeoutMs: 15_000, partial: true}),
  };
}

export function createApps({run, os = platform(), dirs = APP_DIRS, extra = EXTRA_APPS, env = process.env, cacheDir, now = Date.now} = {}) {
  const backend = os === 'darwin' ? macBackend({run, dirs, extra, cacheDir}) : os === 'win32' ? winBackend({run, env, cacheDir}) : null;
  const icons = new Map();
  let listHit = null;
  let listJob = null;
  let runHit = null;

  async function all({fresh} = {}) {
    if (!fresh && listHit && now() - listHit.at < LIST_TTL) return listHit.items;
    listJob ??= backend.scan().then(items => { listHit = {at: now(), items}; return items; }).finally(() => { listJob = null; });
    return listJob;
  }

  async function running() {
    if (runHit && now() - runHit.at < RUN_TTL) return runHit.set;
    const set = await backend.running();
    runHit = {at: now(), set};
    return set;
  }

  async function render(apps) {
    if (!cacheDir || !apps.length) return;
    await mkdir(cacheDir, {recursive: true});
    await backend.render(apps);
    await Promise.all(apps.map(async a => {
      const file = join(cacheDir, `${iconKey(a.path)}.png`);
      const buf = await readFile(file).catch(() => null);
      if (buf) icons.set(a.path, `data:image/png;base64,${buf.toString('base64')}`);
      await rm(file, {force: true});
    }));
  }

  return {
    async list() {
      if (!backend) return {supported: false, items: []};
      return {supported: true, items: (await all()).map(({path, name}) => ({path, name}))};
    },
    async get({paths}) {
      if (!backend) return {supported: false, items: []};
      const [items, live] = await Promise.all([all(), running()]);
      const byPath = new Map(items.map(a => [a.path, a]));
      return {supported: true, items: cleanPaths(paths).map(path => {
        const app = byPath.get(path);
        if (!app) return {path, name: fallbackName(path), missing: true};
        const key = backend.runKey(app);
        return {path, name: app.name, running: Boolean(key && live.has(key))};
      })};
    },
    async icons({paths}) {
      if (!backend) return {};
      const byPath = new Map((await all()).map(a => [a.path, a]));
      const want = cleanPaths(paths).map(p => byPath.get(p)).filter(a => a && backend.iconable(a)).slice(0, MAX_ICONS);
      await render(want.filter(a => !icons.has(a.path)));
      return Object.fromEntries(want.filter(a => icons.has(a.path)).map(a => [a.path, icons.get(a.path)]));
    },
    // 只启动扫描到的应用，不接受任意路径。
    async launch({path}) {
      if (!backend) throw Object.assign(new Error('launching apps is only supported on macOS and Windows'), {code: 'unavailable'});
      const target = String(path ?? '');
      const app = (await all()).find(a => a.path === target) ?? (await all({fresh: true})).find(a => a.path === target);
      if (!app) throw Object.assign(new Error(`not an installed app: ${target}`), {code: 'not-found'});
      await backend.launch(app);
      runHit = null;
      return {launched: true};
    },
  };
}
