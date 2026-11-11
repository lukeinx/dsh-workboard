# Desk for DeepSeek Harness

[简体中文](README.zh.md)

Desk (`@lukeinx/dsh-desk`) adds a modular dashboard to the DeepSeek Harness sidebar. It ships with twelve widgets, including a today banner, to-dos, notes, an ICS calendar, weather, a world clock, countdowns and a focus timer, works with zero configuration, and lets the agent read and change your to-dos and notes from any conversation. Other plugins can add their own widgets.

Status: early (P0b). MIT licensed.

## Widgets

| Widget | Sizes | What it shows |
|---|---|---|
| Today | banner | Time, greeting, date, ISO week, current weather and a daily quote; click the quote for another |
| To-do | `l` `m` `t` | Open items first, completed items collapsed; unfinished items from earlier days are marked as carried over |
| Notes | `l` `t` `m` `s` | Autosaving scratch note; turn the current line into a to-do |
| Calendar | `t` `l` `s` `m` | Month grid and the selected day's events from one or more ICS subscriptions, recurring events included |
| Weather | `m` `s` | Current conditions, today's high and low, air quality and the next hours |
| Clock | `m` `s` | Time, greeting, date and year progress |
| Quote | `m` `w` `s` | A daily quote; click for another. Your own quotes are shared with the Today banner |
| Countdown | `m` `s` `t` | Days until the weekend, month end, year end and your own dates; `12-25` without a year repeats yearly |
| World clock | `m` `s` `w` `t` | Time in several IANA zones with the offset and day difference from local |
| Focus | `m` `s` | Pomodoro timer that keeps running across boards and panels, notifies when done and counts today's sessions |
| Links | `m` `s` `w` `t` `l` | One `name URL` per line; only http, https and mailto |
| Time progress | `m` `s` `w` | How much of today, this week, month and year has passed |

The default board holds Today, To-do, Calendar and Notes; add the rest from the gallery. Built-in widgets added by an upgrade appear only in the gallery and are not placed on existing boards.

Choose **Edit** to drag cards, change sizes, remove cards, open a widget's settings or add widgets from the gallery. Boards are tabs: **+** adds one, double-click renames it, and edit mode can delete it.

Data stays on your machine, in the Harness profile storage (`~/.dsh/storages/dsh_desk.json`). Data from the earlier `dsh-bento` version (`dsh_bento.json`) is copied over on first start; the old file is left in place. The Host makes the only network requests: weather and city search go to [Open-Meteo](https://open-meteo.com) (no key, data under CC BY 4.0) once you set a city, and calendars are fetched from the ICS addresses you add. Responses are cached on the Host.

## Agent tools

- `desk_todos` — `list`, `add`, `complete`, `reopen`, `remove`
- `desk_note` — `read`, `append`, `replace`

The page refreshes every 5 seconds while it is visible, so changes made by the agent appear without a reload.

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

A complete bundle is in [`examples/hello-widget`](examples/hello-widget). A newly installed widget is added to the board once.

| Size | Columns × rows | |
|---|---|---|
| `bar` | 4 × ½ | Frameless banner |
| `s` | 1 × 1 | Small |
| `m` | 2 × 1 | Medium |
| `t` | 1 × 2 | Tall |
| `l` | 2 × 2 | Large |
| `w` | 4 × 1 | Wide |

The first entry of `sizes` is the default. Other manifest fields:

- `title: false` hides the card header; `banner: true` renders without a frame.
- `description` is shown in the widget gallery.
- `settings` is a list of fields for the settings dialog: `{key, type, label, default?, options?, placeholder?}` with `type` one of `text`, `textarea`, `select` (with `options: [{value, label}]`) or `toggle`. Labels can be strings or functions that return a string.

The component receives `size`, `config` (the saved settings for this card), `editing` and `openSettings()`.

## Development

```sh
npm run check   # syntax check, Host smoke test and ICS tests
```

Files: `index.js` (Host routes under `/api/dsh-desk/*`, storage, agent tools), `lib/` (HTTP cache, weather, ICS parsing), `client.js` (sidebar entry, panel, built-in widgets), `cordis.patch.yml`, `locale/`, `icon.svg`.
