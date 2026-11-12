// 自定义 widget（Agent 生成的沙箱 HTML）：定义校验、内联脚本语法检查、联网白名单。
import {Script} from 'node:vm';

export const WIDGET_SIZES = ['bar', 's', 'm', 't', 'l', 'w'];
export const MAX_WIDGETS = 50;
export const MAX_HTML = 200_000;
export const MAX_DATA = 200_000;
const MAX_PREFIXES = 20;
const MAX_FIELDS = 20;
const FIELD_TYPES = ['text', 'textarea', 'select', 'toggle'];
const ID = /^[a-z][a-z0-9-]{1,39}$/;

export class WidgetError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export const widgetId = raw => {
  const id = String(raw ?? '').trim();
  if (!ID.test(id)) throw new WidgetError('bad-widget', 'id must be 2-40 lowercase letters, digits or hyphens, starting with a letter');
  return id;
};

const text = (raw, max) => String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function prefixes(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new WidgetError('bad-widget', 'fetch must be an array of URL prefixes');
  if (raw.length > MAX_PREFIXES) throw new WidgetError('bad-widget', `at most ${MAX_PREFIXES} fetch prefixes`);
  return [...new Set(raw.map(p => {
    let url;
    try { url = new URL(String(p).trim()); } catch { throw new WidgetError('bad-widget', `invalid fetch prefix: ${p}`); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new WidgetError('bad-widget', `fetch prefixes must be http or https: ${p}`);
    if (url.username || url.password) throw new WidgetError('bad-widget', `fetch prefixes cannot carry credentials: ${p}`);
    return url.href;
  }))];
}

function fields(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new WidgetError('bad-widget', 'settings must be an array');
  if (raw.length > MAX_FIELDS) throw new WidgetError('bad-widget', `at most ${MAX_FIELDS} settings`);
  const seen = new Set();
  return raw.map(f => {
    const key = String(f?.key ?? '');
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key) || seen.has(key)) throw new WidgetError('bad-widget', `invalid or duplicate setting key: ${key}`);
    seen.add(key);
    const type = FIELD_TYPES.includes(f.type) ? f.type : 'text';
    const field = {key, type, label: text(f.label, 80) || key};
    if (f.placeholder != null) field.placeholder = text(f.placeholder, 120);
    if (type === 'select') {
      const options = (Array.isArray(f.options) ? f.options : []).map(o => (o && typeof o === 'object' ? {value: String(o.value ?? ''), label: text(o.label ?? o.value, 80)} : {value: String(o), label: text(o, 80)})).filter(o => o.value);
      if (!options.length) throw new WidgetError('bad-widget', `select setting ${key} needs options`);
      field.options = options.slice(0, 50);
    }
    if (f.default !== undefined) field.default = type === 'toggle' ? Boolean(f.default) : String(f.default).slice(0, 4000);
    return field;
  });
}

function sizes(raw, fallback) {
  if (raw == null) return fallback;
  const list = (Array.isArray(raw) ? raw : [raw]).filter(s => WIDGET_SIZES.includes(s));
  if (!list.length) throw new WidgetError('bad-widget', `sizes must use ${WIDGET_SIZES.join(', ')}`);
  return [...new Set(list)];
}

// 全量（create）或增量（update，传入 base）合并后的定义。
export function cleanSpec(input, base = null) {
  const has = key => input?.[key] !== undefined;
  const spec = {
    title: has('title') ? text(input.title, 40) : base?.title ?? '',
    description: has('description') ? text(input.description, 200) : base?.description ?? '',
    html: has('html') ? String(input.html ?? '') : base?.html ?? '',
    sizes: has('sizes') ? sizes(input.sizes) : base?.sizes ?? ['m'],
    defaultSize: has('defaultSize') ? String(input.defaultSize) : base?.defaultSize ?? '',
    header: has('header') ? input.header !== false : base?.header ?? true,
    settings: has('settings') ? fields(input.settings) : base?.settings ?? [],
    fetch: has('fetch') ? prefixes(input.fetch) : base?.fetch ?? [],
  };
  if (!spec.title) throw new WidgetError('bad-widget', 'title is required');
  if (!spec.html.trim()) throw new WidgetError('bad-widget', 'html is required');
  if (spec.html.length > MAX_HTML) throw new WidgetError('too-large', `html exceeds ${MAX_HTML} characters`);
  if (!spec.sizes.includes(spec.defaultSize)) spec.defaultSize = spec.sizes[0];
  return spec;
}

export function cleanData(raw) {
  if (raw === undefined) return null;
  let json;
  try { json = JSON.stringify(raw); } catch { throw new WidgetError('bad-data', 'data must be JSON'); }
  if (json === undefined) return null;
  if (json.length > MAX_DATA) throw new WidgetError('too-large', `data exceeds ${MAX_DATA} characters of JSON`);
  return JSON.parse(json);
}

const lineOf = (html, index) => html.slice(0, index).split('\n').length;

// 保存前的静态检查：语法错误和外链脚本直接拒绝；会被沙箱拦下的外部资源只提示。
export function checkHtml(html) {
  const errors = [];
  const warnings = [];
  const tag = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (let m; (m = tag.exec(html));) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) { errors.push(`line ${lineOf(html, m.index)}: external scripts are blocked; inline the code`); continue; }
    if (/\btype\s*=\s*["']?module/i.test(attrs)) { warnings.push(`line ${lineOf(html, m.index)}: module scripts cannot import anything; a classic script is enough`); continue; }
    if (/\btype\s*=/i.test(attrs) && !/\btype\s*=\s*["']?(text|application)\/(java|ecma)script/i.test(attrs)) continue;
    try { new Script(m[2], {filename: 'widget.html'}); } catch (error) {
      const at = /widget\.html:(\d+)/.exec(String(error?.stack ?? ''));
      const line = lineOf(html, m.index + m[0].indexOf('>') + 1) + (at ? Number(at[1]) - 1 : 0);
      errors.push(`line ${line}: ${error?.name ?? 'SyntaxError'}: ${error?.message ?? error}`);
    }
  }
  if (/<(img|link|video|audio|source|iframe)\b[^>]*\b(src|href)\s*=\s*["']?https?:/i.test(html) || /url\(\s*["']?https?:/i.test(html))
    warnings.push('external images, styles, fonts and frames are blocked by the sandbox; load images with desk.fetch(url, {as: "dataUrl"})');
  if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(html.replace(/desk\.fetch\s*\(/g, '')))
    warnings.push('direct network requests are blocked by the sandbox; use desk.fetch(url) with a declared fetch prefix');
  if (/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(html))
    warnings.push('browser storage is unavailable in the sandbox; persist with desk.save(data) and read desk.data');
  if (/\b(alert|confirm|prompt)\s*\(/.test(html.replace(/desk\.\w+\s*\(/g, '')))
    warnings.push('alert, confirm and prompt are blocked by the sandbox; render the message in the page');
  return {errors, warnings};
}

export function allowedUrl(raw, list) {
  let url;
  try { url = new URL(String(raw ?? '').trim()); } catch { throw new WidgetError('bad-url', `invalid URL: ${raw}`); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new WidgetError('bad-url', 'only http and https URLs are allowed');
  const href = url.href;
  if (!list.some(p => href.startsWith(p))) throw new WidgetError('not-allowed', `URL is not under a declared fetch prefix: ${href}`);
  return href;
}
