# Bento for DeepSeek Harness

[简体中文](README.zh.md)

Bento adds a modular dashboard to the DeepSeek Harness sidebar. It ships with a today banner, to-dos, notes and a clock, works with zero configuration, and lets the agent read and change your to-dos and notes from any conversation. Other plugins can add their own widgets.

Status: early (P0a). Weather, ICS calendar, edit mode and multiple boards are next. MIT licensed.

## Widgets

| Widget | Sizes | What it shows |
|---|---|---|
| Today | banner | Time, greeting, date, ISO week and a daily quote; click the quote for another |
| To-do | `l` `m` `t` | Open items first, completed items collapsed; unfinished items from earlier days are marked as carried over |
| Notes | `l` `t` `m` `s` | Autosaving scratch note; turn the current line into a to-do |
| Clock | `m` `s` | Time, greeting, date and year progress |

Data stays on your machine, in the Harness profile storage (`~/.dsh/storages/dsh_bento.json`). Bento makes no network requests of its own.

## Agent tools

- `bento_todos` — `list`, `add`, `complete`, `reopen`, `remove`
- `bento_note` — `read`, `append`, `replace`

The page refreshes every 5 seconds while it is visible, so changes made by the agent appear without a reload.

## Install

In a Harness conversation, ask the agent to install the bundle with `plugin_manager install_bundle` pointing at this directory. A local directory is linked, not copied.

## Write a widget

A widget is a React component that another bundle registers into the `bento.widget` slot from its `client.js`. Put the manifest on the component's static `bento` property; the slot registration itself keeps only `id`, `order` and `label`.

```js
function Hello({size, config}) {
  return h('b', null, `Hello (${size})`);
}
Hello.bento = {apiVersion: 1, sizes: ['m', 's']};

ctx.effect(() => ctx.slots.inject('bento.widget', () => ctx.slots.register({
  name: 'bento.widget', id: 'hello.widget', order: 100, label: 'Hello',
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

The first entry of `sizes` is the default. Other manifest fields: `title: false` hides the card header; `banner: true` renders without a frame. The component receives `size` and the board's `config` for that widget.

## Development

```sh
npm run check   # syntax check and Host smoke test
```

Files: `index.js` (Host routes under `/api/dsh-bento/*`, storage, agent tools), `client.js` (sidebar entry, panel, built-in widgets), `cordis.patch.yml`, `locale/`, `icon.svg`.
