# Bento · DeepSeek Harness 工作台

[English](README.md)

Bento 在 DeepSeek Harness 侧栏增加一个模块化工作台。内置今日横栏、待办、速记和时钟，零配置可用；Agent 可以在任意对话里读写你的待办和速记；其他插件可以注册自己的 widget。

状态：早期（P0a）。下一步是天气、ICS 日历、编辑模式和多看板。MIT 许可。

## 内置 widget

| widget | 档位 | 内容 |
|---|---|---|
| 今日 | 横栏 | 时间、问候、日期、ISO 周和每日格言，点格言换一条 |
| 待办 | `l` `m` `t` | 未完成在前、已完成折叠；之前留下的未完成项标「结转」 |
| 速记 | `l` `t` `m` `s` | 自动保存，当前行可转待办 |
| 时钟 | `m` `s` | 时间、问候、日期和年度进度 |

数据留在本机 Harness profile 存储（`~/.dsh/storages/dsh_bento.json`），Bento 自身不发网络请求。

## Agent 工具

- `bento_todos`：`list`、`add`、`complete`、`reopen`、`remove`
- `bento_note`：`read`、`append`、`replace`

页面可见时每 5 秒刷新，Agent 的改动不用刷新页面就会出现。

## 安装

在 Harness 对话里让 Agent 用 `plugin_manager install_bundle` 指向本目录。本地目录是链接安装，不复制。

## 写一个 widget

widget 是一个 React 组件，由其他 bundle 在 `client.js` 里注册到 `bento.widget` slot。manifest 挂在组件的静态属性 `bento` 上；slot 注册参数只保留 `id`、`order`、`label`。

```js
function Hello({size, config}) {
  return h('b', null, `Hello (${size})`);
}
Hello.bento = {apiVersion: 1, sizes: ['m', 's']};

ctx.effect(() => ctx.slots.inject('bento.widget', () => ctx.slots.register({
  name: 'bento.widget', id: 'hello.widget', order: 100, label: 'Hello',
}, Hello)), 'hello widget');
```

完整示例见 [`examples/hello-widget`](examples/hello-widget)。新装的 widget 会自动加入看板一次。

| 档位 | 列 × 行 | |
|---|---|---|
| `bar` | 4 × ½ | 无框横栏 |
| `s` | 1 × 1 | 小 |
| `m` | 2 × 1 | 中 |
| `t` | 1 × 2 | 竖 |
| `l` | 2 × 2 | 大 |
| `w` | 4 × 1 | 通栏 |

`sizes` 第一个为默认。其他 manifest 字段：`title: false` 隐藏卡片标题，`banner: true` 无框渲染。组件收到 `size` 和看板里该 widget 的 `config`。

## 开发

```sh
npm run check   # 语法检查 + Host 端冒烟
```

文件：`index.js`（Host 端 `/api/dsh-bento/*` 路由、存储、Agent 工具）、`client.js`（侧栏入口、面板、内置 widget）、`cordis.patch.yml`、`locale/`、`icon.svg`。
