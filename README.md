# Desk for DeepSeek Harness

[简体中文](README.zh.md)

Desk (`@lukeinx/dsh-desk`) adds a modular dashboard to the DeepSeek Harness sidebar. It ships with 31 widgets, including a today banner, to-dos, notes, an ICS calendar, weather, an agent session monitor, quick prompts, usage stats, Git repositories, system status, markets, outputs, scheduled tasks and network, works with zero configuration, and lets the agent read and change your to-dos, notes and inbox from any conversation. The agent can also build new widgets from a sentence, and other plugins can add their own.

Status: early (P0b). MIT licensed.

## Widgets

| Widget | Sizes | What it shows |
|---|---|---|
| Today | banner | Time, greeting, date, ISO week, current weather and a daily quote from the built-in set, Hitokoto or your own; click the quote for another |
| To-do | `l` `m` `t` | Open items first, completed items collapsed; unfinished items from earlier days are marked as carried over |
| Notes | `l` `t` `m` `s` | Autosaving scratch note; turn the current line into a to-do |
| Calendar | `t` `l` `s` `m` | Month grid and the selected day's events from one or more ICS subscriptions, recurring events included |
| Weather | `m` `s` | Current conditions, today's high and low, air quality and the next hours |
| Clock | `m` `s` | Time, greeting, date and year progress |
| Quote | `m` `w` `s` | A daily quote; click for another. The source (built-in, Hitokoto or your own) is shared with the Today banner |
| Countdown | `m` `s` `t` | Days until the weekend, month end, year end and your own dates; `12-25` without a year repeats yearly |
| World clock | `m` `s` `w` `t` | Time in several IANA zones with the offset and day difference from local |
| Focus | `m` `s` | Pomodoro timer that keeps running across boards and panels, notifies when done and counts today's sessions |
| Links | `m` `s` `w` `t` `l` | One `name URL` per line; only http, https and mailto |
| Time progress | `m` `s` `w` | How much of today, this week, month and year has passed |
| Agent | `t` `l` `m` `w` | Sessions waiting for you first, then running and recent ones; click to open. Upcoming scheduled tasks and a new-session button for the chosen workspace |
| Feeds | `t` `l` `m` `w` | RSS / Atom, several feeds merged by date; defaults to Hacker News (English) or ifanr and Ruan Yifeng's blog (Chinese); opened items turn grey, with mark-all-read and an optional hide-read setting |
| Habits | `m` `l` `t` `w` | Check in for any day of the last week, with your current streak |
| Quick prompt | `m` `w` `l` `t` `s` | Type or pick a preset to start a new session and send it right away in the chosen workspace; the working directory setting applies until you pick a workspace |
| Inbox | `t` `l` `m` `w` | Things you jot down, handed to the agent to sort with one click in the chosen workspace |
| Usage | `l` `t` `m` `w` `s` | Tokens, requests, cache hits and a per-model breakdown for today and recent days, from local session logs; estimated cost once you enter prices |
| Running | `t` `l` `m` `w` | Goals and background jobs across sessions; click to open the session, or stop a job |
| Git repos | `t` `l` `m` `w` | Branch, changes, ahead / behind and branches whose upstream is gone, per repository; defaults to the Harness workspaces. Fetch all or hand a repository to the agent |
| GitHub | `t` `l` `m` `w` | PRs awaiting your review, your PRs and issues assigned to you, through your signed-in `gh` |
| System | `m` `s` `t` `l` `w` | CPU, memory, disk, battery and a five-minute CPU sparkline |
| Photo frame | `m` `s` `t` `l` `w` | Cycles through photos in a local folder (`~/Pictures` by default); click for the next one |
| Markets | `t` `m` `s` `l` `w` | Exchange rates (`USD/CNY`), China / Hong Kong / US stocks (`sh600519`, `hk00700`, `usAAPL`) and crypto (`BTC`, `cg:<id>`); red or green for gains |
| Trending | `l` `t` `m` `w` | Hot lists, one tab per source: Weibo, Zhihu, 36Kr, sspai, Hacker News, GitHub Trending, Product Hunt and Reddit (world news, technology, science); Bilibili and V2EX can be turned on in settings; opened items turn grey |
| Outputs | `t` `l` `m` `w` | Files the agent presented as deliverables, and optionally documents it created, newest first; click to open, or reveal in Finder and jump to the session |
| Scheduled tasks | `t` `l` `m` `w` | All scheduled tasks with their recurrence and next run; run now, pause, resume or delete, and start a session to create a new one |
| Pinned sessions | `t` `l` `m` `w` | Sessions you pin, with each one's latest message; click to open |
| Recent files | `t` `l` `m` `w` | Newest files in `~/Downloads` and `~/Desktop` or your own folders; open, reveal, or hand a file to the agent. Apps, installers and scripts are revealed instead of opened |
| Clipboard | `t` `l` `m` `w` | Recent text you copied while the panel is open; copy again or send an item with a preset such as Translate or Summarize |
| Network | `m` `s` `t` `l` `w` | Download and upload speed, local and public IP, system proxy and latency to the sites you list |

Agent, Quick prompt and Inbox share one workspace choice, listing the Harness workspaces; changing it on one card changes it on the others.

The default board holds Today, To-do, Calendar and Notes; add the rest from the gallery. Built-in widgets added by an upgrade appear only in the gallery and are not placed on existing boards.

Choose **Edit** to drag cards, change sizes, remove cards, open a widget's settings or add widgets from the gallery, which groups them into Daily, Agent, News and Productivity & tools, can be searched and stays open so you can add several. Boards are tabs: **+** adds one, double-click renames it, and edit mode can delete it.

Settings shared by several widgets (your name, week start, city and temperature unit, quote source) are also under Settings → Desk (**Open settings** on the plugin's detail page opens the same page in the main area), so they stay reachable when no card that uses them is on a board. Both places edit the same values.

Data stays on your machine, in the Harness profile storage (`~/.dsh/storages/dsh_desk.json`). Data from the earlier `dsh-bento` version (`dsh_bento.json`) is copied over on first start; the old file is left in place. The Host makes the only network requests and caches the responses:

- Weather and city search: [Open-Meteo](https://open-meteo.com) (no key, data under CC BY 4.0), only once you set a city
- Quotes: [Hitokoto](https://hitokoto.cn) (Chinese), only when you choose it as the quote source
- Calendars and feeds: the ICS and RSS / Atom addresses you add
- Markets: Tencent quotes (`qt.gtimg.cn`) for stocks, [open.er-api.com](https://open.er-api.com) for exchange rates (updated daily), [CoinGecko](https://www.coingecko.com) for crypto
- GitHub: the local `gh` CLI with its existing sign-in
- Trending: the sites' own web endpoints for Weibo, Zhihu, 36Kr, sspai, Bilibili and V2EX (unofficial, may break when a site changes), the [HN Algolia API](https://hn.algolia.com/api), the GitHub Trending page, and the Product Hunt and Reddit feeds; cached for 10 minutes
- Network: your public IP from [ipinfo.io](https://ipinfo.io) (falling back to [ip.sb](https://ip.sb)), and latency to the sites you list, both through `curl` and the system proxy when one is set

A few widgets only read your machine: Usage reads the session logs under `~/.dsh/sessions`; Git repos runs `git status` and runs `git fetch` only when you choose Fetch; System uses `vm_stat` and `pmset` on macOS; Photo frame uses `sips` on macOS to shrink photos to 1280 px, cached in the system temp directory. Outputs reads the same session logs; Recent files lists only the top level of each folder; Clipboard reads `pbpaste` (macOS) or `wl-paste` / `xclip` (Linux) every 2 seconds while the card is shown and keeps history in memory only, never on disk.

Usage counts the usage fields in the logs. Some providers do not report tokens; their requests count toward requests only, and the card says so. Running sees only sessions in the current Harness process.

## Agent tools

- `desk_todos` — `list`, `add`, `complete`, `reopen`, `remove`
- `desk_note` — `read`, `append`, `replace`
- `desk_inbox` — `list`, `add`, `remove`, `clear`
- `desk_widget` — `list`, `get`, `create`, `update`, `set_data`, `remove` custom widgets; the `desk-widget` skill tells the agent how to write them

The page refreshes every 5 seconds while it is visible, so changes made by the agent appear without a reload.

## Generate a widget with the agent

In the widget gallery choose **Generate with agent** (also offered on an empty board), describe the card, and send it: a new session opens where the agent builds the widget, and it appears on the board you had open, under **Mine** in the gallery. You can also just ask for a Desk widget in any conversation.

A custom widget is HTML that the agent writes. It runs in a sandboxed frame with no access to the Harness page, cookies, browser storage or the network, and is styled with the Harness theme. It reaches Desk only through `window.desk`: its settings and saved data, requests to the http(s) address prefixes the widget declares (made by the Host, cached for 30 seconds), saving its own data, opening links, and opening a new session draft that you send yourself.

On a custom card, the sparkle in the header (or in edit mode) asks the agent to change it; edit mode also has **Source**, where you can edit the HTML, see the declared addresses, or delete the widget. Runtime errors show on the card with **Ask agent to fix**, and the agent sees the last error through `desk_widget`. Definitions and data are stored with the rest of Desk; at most 50 widgets of 200 KB HTML and 200 KB data each.

## Install

In a Harness conversation, ask the agent to install the bundle with `plugin_manager install_bundle` pointing at this directory. A local directory is linked, not copied.

## Write a widget

A widget is a React component that another bundle registers into the `desk.widget` slot from its `client.js`. Put the manifest on the component's static `desk` property; the slot registration itself keeps only `id`, `order` and `label`.

```js
function Hello({size, config}) {
  return h('b', null, `Hello (${size})`);
}
Hello.desk = {apiVersion: 1, sizes: ['m', 's']};

ctx.effect(() => ctx.slots.inject('desk.widget', () => ctx.slots.register({
  name: 'desk.widget', id: 'hello.widget', order: 100, label: 'Hello',
}, Hello)), 'hello widget');
```

A complete bundle is in [`examples/hello-widget`](examples/hello-widget). A newly installed widget is added once, to the board that is open; other boards only list it in the gallery.

| Size | Columns × rows | |
|---|---|---|
| `bar` | 4 × ½ | Frameless banner |
| `s` | 1 × 1 | Small |
| `m` | 2 × 1 | Medium |
| `t` | 1 × 2 | Tall |
| `l` | 2 × 2 | Large |
| `w` | 4 × 1 | Wide |

`defaultSize` sets the size used when the card is added and must be one of `sizes`; without it, the first entry of `sizes` is used. The size menu always lists sizes in the order of the table above. Other manifest fields:

- `title: false` hides the card header; `banner: true` renders without a frame.
- `description` is shown in the widget gallery.
- `category` groups the widget in the gallery: `daily`, `agent`, `news` or `tools`. Widgets without one, or with any other value, go under Plugins.
- `settings` is a list of fields for the settings dialog: `{key, type, label, default?, options?, placeholder?}` with `type` one of `text`, `textarea`, `select` (with `options: [{value, label}]`) or `toggle`. Labels can be strings or functions that return a string.

The component receives `size`, `config` (the saved settings for this card), `editing` and `openSettings()`.

## Development

```sh
npm run check   # syntax check, Host smoke test and ICS tests
```

Files: `index.js` (Host routes under `/api/dsh-desk/*`, storage, agent tools), `skills/desk-widget.md` (the agent's widget-writing guide), `lib/` (HTTP cache, custom widget validation, weather, ICS and feed parsing, session-log usage, subprocesses, Git, GitHub, system status, photos, markets, trending), `client.js` (sidebar entry, panel, built-in widgets), `cordis.patch.yml`, `locale/`, `icon.svg`.
