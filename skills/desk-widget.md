# Desk widget

A custom widget is one HTML card on the user's Desk dashboard (DeepSeek Harness sidebar → Desk). You write it with the `desk_widget` tool; it is stored by Desk and shows up on the board the user has open within a few seconds, without reloading anything. The user can resize it, change its settings, remove it, edit its source, or ask you to change it from the card.

## Work this way

1. Pin down what the card shows and where its data comes from. Ask only when the answer changes the design, such as which account, city or symbol; otherwise choose a sensible default and expose it as a setting.
2. Pick the data path, in this order:
   - computed in the page (clocks, timers, calculators, converters, checklists);
   - a public http(s) API without a key, requested with `desk.fetch` and declared in `fetch`;
   - data you compute with your own tools (shell, files, other tools) and write with `set_data`. It only changes when you write again; offer a scheduled task (`schedule_create`) only if the user wants it refreshed and agrees to the recurring agent runs.
   Before relying on an API, request it once yourself (for example with `curl`) to confirm the URL, the response shape and that it needs no key.
3. `create` the widget. Fix every error the tool reports; read its warnings.
4. Tell the user it is on their open Desk board and what its settings do. Runtime errors from the user's browser appear in `list` and `get` as `lastError`; when the user reports a problem or after they have looked, `get` the widget and fix it with `update`.
5. To change an existing widget, `get` it first and `update` only the fields that change. Keep its id.

Write titles, labels and visible text in the user's language. Never put secrets or API keys in `html`, `settings` defaults or `data`: the user can read them in the source view.

## Definition

| Field | Meaning |
|---|---|
| `title` | Card title, at most 40 characters |
| `description` | One line for the widget gallery |
| `html` | Body markup: elements plus inline `<style>` and `<script>`. No `<html>`, `<head>` or `<body>` tags |
| `sizes` | Allowed sizes, from the table below; `defaultSize` picks the one used when added |
| `header` | `false` hides the title bar, leaving the whole card to your markup |
| `settings` | Fields of the card settings dialog: `{key, type, label, default?, placeholder?, options?}`, `type` one of `text`, `textarea`, `select` (with `options: [{value, label}]`), `toggle`. Each card on a board has its own values, arriving as `desk.config` |
| `fetch` | http(s) URL prefixes `desk.fetch` may request, e.g. `https://api.github.com/repos/` |
| `data` | Saved JSON object, arriving as `desk.data` |

Sizes are grid cells of a four-column board. The body area is roughly, with the title bar:

| Size | Cells | Body (approx.) |
|---|---|---|
| `s` | 1 × 1 | 220 × 110 px |
| `m` | 2 × 1 | 500 × 110 px |
| `t` | 1 × 2 | 220 × 300 px |
| `l` | 2 × 2 | 500 × 300 px |
| `w` | 4 × 1 | 1040 × 110 px |
| `bar` | 4 × ½, frameless | 1040 × 70 px |

Widths shrink with the window. Lay out fluidly (flex, grid, `min-width: 0`, ellipsis) and branch on `desk.size` for denser or sparser layouts. Without the title bar there are about 34 px more. Content taller than the card scrolls; design so the important part fits.

## Sandbox

The card runs in a sandboxed frame with its own origin. It cannot reach the Harness page, cookies, `localStorage`, `alert` / `confirm` / `prompt`, `eval` / `new Function`, popups, forms submission, or the network: `fetch`, XHR, WebSocket, external scripts, stylesheets, fonts and images are all blocked. Images work as `data:` URLs (inline SVG is best for icons and charts). Everything external goes through `window.desk`, which exists before your scripts run.

## `window.desk`

| Member | |
|---|---|
| `desk.size` | Current size key |
| `desk.config` | This card's settings values, defaults applied |
| `desk.data` | Saved data object, or `null` |
| `desk.dataAt` | When `data` was last written, ms since epoch, or 0 |
| `desk.theme` | `'light'` or `'dark'` |
| `desk.lang` | UI language tag, e.g. `zh-CN` or `en` |
| `desk.on(fn)` | Calls `fn(desk)` after any of the values above change (size, settings, data, theme); returns an unsubscribe function |
| `desk.fetch(url, {as, fresh})` | Requests `url` through Desk and resolves to parsed JSON (`as: 'json'`, default), a string (`'text'`) or a `data:` URL (`'dataUrl'`, for images). GET only, no custom headers, 10 s timeout, about 2 MB. Responses are cached for 30 s unless `fresh: true`. Rejects with an `Error` |
| `desk.save(data)` | Replaces the saved data with a JSON object (≤ 200 KB) and resolves when stored. You can read it with `get` |
| `desk.open(url)` | Opens an http(s) or mailto link in a new browser tab; plain `<a href>` links do the same |
| `desk.ask(prompt)` | Opens a new agent session with `prompt` in the draft; the user sends it |

Call `desk.fetch` again on an interval for live data; one minute or more is polite for most APIs. Re-render from `desk.on` rather than reloading. Uncaught errors and rejected promises are reported to the card and to `lastError`, so let real failures surface, but show a friendly message for expected ones such as a failed request.

## Look

The frame is transparent over the card and already styled like Desk: 13 px system font, theme colors, light and dark. Use these variables instead of literal colors:

`--text` `--muted` `--accent` `--on-accent` `--bg` `--layer` (subtle fill) `--border` `--border-strong` `--success` `--warn` `--error` `--font`.

Ready-made classes: `.muted` `.small` `.num` (tabular digits) `.big` (28 px figure) `.stack` (vertical gap) `.hstack` (horizontal, centered) `.grow` (fills, ellipsis) `.row` (list row with divider) `.center` (centered, full height) `.chip` `.bar > i` (progress, set `width`) `.up` `.down` `.warn` `.error`; `button`, `button.primary`, `input`, `select` and `textarea` are styled. Follow the dashboard's restraint: one prominent figure or list, muted secondary text, accent only for what matters now, no decorative headings or explanatory text, no emoji unless the user asks.

## Example

```json
{
  "action": "create",
  "title": "GitHub Stars",
  "description": "Star count of one repository",
  "sizes": ["s", "m"],
  "settings": [{"key": "repo", "type": "text", "label": "Repository (owner/name)", "default": "denoland/deno"}],
  "fetch": ["https://api.github.com/repos/"],
  "html": "<div class=\"center\"><div class=\"stack\" style=\"align-items:center\"><div class=\"big num\" id=\"n\">–</div><div class=\"muted small\" id=\"r\"></div></div></div>\n<script>\nconst load = async () => {\n  const repo = desk.config.repo.trim();\n  document.getElementById('r').textContent = repo;\n  try {\n    const info = await desk.fetch(`https://api.github.com/repos/${repo}`);\n    document.getElementById('n').textContent = info.stargazers_count.toLocaleString(desk.lang);\n  } catch (e) {\n    document.getElementById('n').textContent = '–';\n    document.getElementById('r').textContent = e.message;\n  }\n};\nload();\ndesk.on(load);\nsetInterval(load, 10 * 60_000);\n</script>"
}
```
