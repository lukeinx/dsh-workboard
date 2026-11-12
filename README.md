# Workboard

**A modular dashboard for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). 31 widgets out of the box, and your agent builds the rest.**

[简体中文](README.zh.md) · MIT

![Workboard in light and dark themes](docs/images/hero-en.png)

## Highlights

### 31 widgets, ready to use

To-dos, calendar, weather, feeds, markets, Git, GitHub, usage stats, agent sessions and more. Most work with no setup; a few need something only you know, such as your city, a calendar link or a ticker. Open the gallery, search, and add as many as you like.

![Widget gallery](docs/images/gallery-en.png)

### Your agent makes new widgets

Describe a card in a sentence and choose **Hand to agent**. The agent writes the widget and puts it on the board you have open. From then on, the sparkle button on the card asks for changes, and **Ask agent to fix** hands any runtime error back to the agent. Custom widgets run in a sandbox with no access to your page, cookies or the network, except for the addresses each widget declares.

![Generate a widget with the agent](docs/images/generate-en.png)

### Modular, adaptive, minimal

Cards snap to a four-column grid in six sizes. Drag them around, resize them, and split them across tabbed boards. The layout reflows to the window width and follows the Harness light or dark theme. Cards show one thing each, with no ornaments.

<img src="docs/images/narrow-en.png" alt="Narrow window in dark theme" width="480">

### Built for agent work

A board of agent widgets shows the sessions waiting for you, running goals and jobs, token usage, deliverables and scheduled tasks. The agent can also read and change your to-dos, notes and inbox from any conversation, through built-in tools.

![Agent widgets](docs/images/agent-en.png)

### Local and private

Your data stays in the Harness profile on your machine. The Host makes every network request and caches it; the page itself never calls third parties.

## Quick start

```sh
git clone https://github.com/lukeinx/dsh-workboard.git
```

Then, in a Harness conversation, ask the agent to install it:

> Install the bundle at `~/dsh-workboard` with plugin_manager.

Open **Workboard** in the sidebar. The first board holds Today, To-do, Calendar and Notes. Choose **Edit**, then **Add widget** for the rest.

## For AI agents

If you are an agent working with Workboard:

- **Install**: `plugin_manager install_bundle` with this directory. A local directory is linked, not copied.
- **Tools**: `workboard_todos` (`list` `add` `complete` `reopen` `remove`), `workboard_note` (`read` `append` `replace`), `workboard_inbox` (`list` `add` `remove` `clear`), `workboard_widget` (`list` `get` `create` `update` `set_data` `remove`).
- **Build a widget**: load the `workboard-widget` skill ([`skills/workboard-widget.md`](skills/workboard-widget.md)) before calling `workboard_widget`. It covers sizes, the `window.workboard` API, the sandbox and the theme variables.
- **Limits**: at most 50 custom widgets, each with up to 200 KB of HTML and 200 KB of data. The page polls every 5 seconds, so your changes appear without a reload.
- **Data**: `~/.dsh/storages/dsh_workboard.json`.

## Reference

<details>
<summary><b>All 31 widgets</b></summary>

| Widget | Sizes | What it shows |
|---|---|---|
| Today | banner | Time, greeting, date, ISO week, current weather and a daily quote from the built-in set, Hitokoto or your own; click the quote for another |
| To-do | `l` `m` `t` | Open items first, completed items collapsed; unfinished items from earlier days are marked as carried over |
| Notes | `l` `t` `m` `s` | Autosaving scratch note; turn the current line into a to-do |
| Calendar | `t` `l` `s` `m` | Month grid and the selected day's events from one or more ICS subscriptions, recurring events included |
| Weather | `m` `s` | Current conditions, today's high and low, air quality and the next hours |
| Clock | `m` `s` | Time, greeting, date and year progress |
| Quote | `m` `w` `s` | A daily quote; click for another. The source is shared with the Today banner |
| Countdown | `m` `s` `t` | Days until the weekend, month end, year end and your own dates; `12-25` without a year repeats yearly |
| World clock | `m` `s` `w` `t` | Time in several IANA zones with the offset and day difference from local |
| Focus | `m` `s` | Pomodoro timer that keeps running across boards and panels, notifies when done and counts today's sessions |
| Links | `m` `s` `w` `t` `l` | One `name URL` per line; only http, https and mailto |
| Time progress | `m` `s` `w` | How much of today, this week, month and year has passed |
| Agent | `t` `l` `m` `w` | Sessions waiting for you first, then running and recent ones; upcoming scheduled tasks and a new-session button |
| Feeds | `t` `l` `m` `w` | RSS / Atom, several feeds merged by date; opened items turn grey |
| Habits | `m` `l` `t` `w` | Check in for any day of the last week, with your current streak |
| Quick prompt | `m` `w` `l` `t` `s` | Type or pick a preset to start a new session and send it right away in the chosen workspace |
| Inbox | `t` `l` `m` `w` | Things you jot down, handed to the agent to sort with one click |
| Usage | `l` `t` `m` `w` `s` | Tokens, requests, cache hits and a per-model breakdown from local session logs; estimated cost once you enter prices |
| Running | `t` `l` `m` `w` | Goals and background jobs across sessions; open the session or stop a job |
| Git repos | `t` `l` `m` `w` | Branch, changes, ahead / behind and branches whose upstream is gone; defaults to the Harness workspaces |
| GitHub | `t` `l` `m` `w` | PRs awaiting your review, your PRs and issues assigned to you, through your signed-in `gh` |
| System | `m` `s` `t` `l` `w` | CPU, memory, disk, battery and a five-minute CPU sparkline |
| Photo frame | `m` `s` `t` `l` `w` | Cycles through photos in a local folder (`~/Pictures` by default) |
| Markets | `t` `m` `s` `l` `w` | Exchange rates (`USD/CNY`), China / Hong Kong / US stocks (`sh600519`, `hk00700`, `usAAPL`) and crypto (`BTC`, `cg:<id>`) |
| Trending | `l` `t` `m` `w` | Hot lists, one tab per source: Weibo, Zhihu, 36Kr, sspai, Hacker News, GitHub Trending, Product Hunt and Reddit; Bilibili and V2EX optional |
| Outputs | `t` `l` `m` `w` | Files the agent presented as deliverables, newest first; open, reveal in Finder or jump to the session |
| Scheduled tasks | `t` `l` `m` `w` | All scheduled tasks with their recurrence and next run; run now, pause, resume or delete |
| Pinned sessions | `t` `l` `m` `w` | Sessions you pin, with each one's latest message |
| Recent files | `t` `l` `m` `w` | Newest files in `~/Downloads` and `~/Desktop` or your own folders; open, reveal, or hand a file to the agent |
| Clipboard | `t` `l` `m` `w` | Recent text you copied while the panel is open; copy again or send it with a preset such as Translate |
| Network | `m` `s` `t` `l` `w` | Download and upload speed, local and public IP, system proxy and latency to the sites you list |

Agent, Quick prompt and Inbox share one workspace choice. Settings shared by several widgets (your name, week start, city, temperature unit, quote source) are also under Settings → Workboard. Built-in widgets added by an upgrade appear only in the gallery and are not placed on existing boards.

</details>

<details>
<summary><b>Network requests and local reads</b></summary>

The Host makes the only network requests and caches the responses:

- Weather and city search: [Open-Meteo](https://open-meteo.com), only once you set a city
- Quotes: [Hitokoto](https://hitokoto.cn), only when you choose it as the quote source
- Calendars and feeds: the ICS and RSS / Atom addresses you add
- Markets: Tencent quotes (`qt.gtimg.cn`) for stocks, [open.er-api.com](https://open.er-api.com) for exchange rates, [CoinGecko](https://www.coingecko.com) for crypto
- GitHub: the local `gh` CLI with its existing sign-in
- Trending: the sites' own web endpoints for Weibo, Zhihu, 36Kr, sspai, Bilibili and V2EX (unofficial, may break when a site changes), the [HN Algolia API](https://hn.algolia.com/api), the GitHub Trending page, and the Product Hunt and Reddit feeds; cached for 10 minutes
- Network: your public IP from [ipinfo.io](https://ipinfo.io) (falling back to [ip.sb](https://ip.sb)), and latency to the sites you list, through `curl` and the system proxy when one is set
- Custom widgets: only the http(s) address prefixes each widget declares, cached for 30 seconds

Some widgets only read your machine. Usage and Outputs read the session logs under `~/.dsh/sessions`. Git repos runs `git status`, and runs `git fetch` only when you choose Fetch. System uses `vm_stat` and `pmset` on macOS. Photo frame uses `sips` on macOS to shrink photos, cached in the system temp directory. Recent files lists only the top level of each folder. Clipboard reads `pbpaste` (macOS) or `wl-paste` / `xclip` (Linux) every 2 seconds while the card is shown, and keeps history in memory only.

Data from earlier versions named `@lukeinx/dsh-desk` or `dsh-bento` is copied over on first start; the old files are left in place.

</details>

<details>
<summary><b>Write a widget in another bundle</b></summary>

A widget is a React component that another bundle registers into the `workboard.widget` slot from its `client.js`. Put the manifest on the component's static `workboard` property; the slot registration itself keeps only `id`, `order` and `label`.

```js
function Hello({size, config}) {
  return h('b', null, `Hello (${size})`);
}
Hello.workboard = {apiVersion: 1, sizes: ['m', 's']};

ctx.effect(() => ctx.slots.inject('workboard.widget', () => ctx.slots.register({
  name: 'workboard.widget', id: 'hello.widget', order: 100, label: 'Hello',
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

Manifest fields:

- `sizes` lists the allowed sizes; `defaultSize` must be one of them and defaults to the first.
- `title: false` hides the card header; `banner: true` renders without a frame.
- `description` is shown in the widget gallery.
- `category` groups the widget in the gallery: `daily`, `agent`, `news` or `tools`. Anything else goes under Plugins.
- `settings` lists the fields of the settings dialog: `{key, type, label, default?, options?, placeholder?}`, with `type` one of `text`, `textarea`, `select` (with `options: [{value, label}]`) or `toggle`. Labels can be strings or functions that return a string.

The component receives `size`, `config` (the saved settings for this card), `editing` and `openSettings()`.

</details>

## Development

```sh
npm run check   # syntax check, Host smoke test and ICS tests
```

`index.js` holds the Host routes under `/api/dsh-workboard/*`, storage and agent tools. `client.js` holds the sidebar entry, the panel and the built-in widgets. `lib/` holds the data sources and parsers, and `skills/workboard-widget.md` is the agent's guide to writing widgets.

## Acknowledgments

Workboard is built on these projects and services. Content from feeds and hot lists belongs to its publishers.

| Project or data | Used for | License or terms |
|---|---|---|
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Plugin host, theme tokens, React runtime | MIT |
| [React](https://react.dev) | All widgets, provided by Harness | MIT |
| [Feather Icons](https://feathericons.com) | Some icon paths are adapted from it | MIT |
| [Open-Meteo](https://open-meteo.com) | Weather, air quality and city search | Data under CC BY 4.0 |
| [Hitokoto](https://hitokoto.cn) | Chinese quotes, optional | Public API |
| [ExchangeRate-API](https://www.exchangerate-api.com) (`open.er-api.com`) | Exchange rates | Free open access, attribution required |
| [CoinGecko](https://www.coingecko.com) | Crypto prices | Public API, attribution required |
| Tencent Finance (`qt.gtimg.cn`) | China, Hong Kong and US stock quotes | Unofficial endpoint |
| [HN Algolia API](https://hn.algolia.com/api), [hnrss.org](https://hnrss.org) | Hacker News hot list and the default English feed | Public API and feeds |
| Weibo, Zhihu, 36Kr, sspai, Bilibili, V2EX, GitHub Trending, Product Hunt, Reddit | Trending lists | Sites' public pages, feeds and unofficial endpoints |
| [ifanr](https://www.ifanr.com), [Ruan Yifeng's blog](https://www.ruanyifeng.com/blog/) | Default Chinese feeds | Publishers' RSS feeds |
| [GitHub CLI](https://cli.github.com) | GitHub widget | MIT |
| [ipinfo.io](https://ipinfo.io), [ip.sb](https://ip.sb) | Public IP in the Network widget | Public API |
| Classical texts (Laozi, Confucius, Xunzi and others) | Built-in quotes | Public domain |

## License

[MIT](LICENSE)
