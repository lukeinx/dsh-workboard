# 工作台 · DeepSeek Harness

[English](README.md)

工作台（`@lukeinx/dsh-desk`）在 DeepSeek Harness 侧栏增加一个模块化工作台。内置 15 个 widget，包括今日横栏、待办、速记、ICS 日历、天气、Agent 会话、订阅、习惯打卡和专注计时，零配置可用；Agent 可以在任意对话里读写你的待办和速记；其他插件可以注册自己的 widget。

状态：早期（P0b）。MIT 许可。

## 内置 widget

| widget | 档位 | 内容 |
|---|---|---|
| 今日 | 横栏 | 时间、问候、日期、ISO 周、当前天气和每日格言，点格言换一条 |
| 待办 | `l` `m` `t` | 未完成在前、已完成折叠；之前留下的未完成项标「结转」 |
| 速记 | `l` `t` `m` `s` | 自动保存，当前行可转待办 |
| 日历 | `t` `l` `s` `m` | 月视图和所选日期的日程，来自一个或多个 ICS 订阅，支持重复日程 |
| 天气 | `m` `s` | 当前天气、今日最高最低、空气质量和接下来几小时 |
| 时钟 | `m` `s` | 时间、问候、日期和年度进度 |
| 格言 | `m` `w` `s` | 每日一句，点一下换一条；可填自己的格言，与今日横栏共用 |
| 倒数日 | `m` `s` `t` | 距周末、月底、年底和自定日子的天数；`12-25` 这样不写年份则每年重复 |
| 世界时钟 | `m` `s` `w` `t` | 多个 IANA 时区的时间、与本地的时差和日期差 |
| 专注 | `m` `s` | 番茄钟，切换看板或离开面板不中断，结束时发系统通知，记录今日个数 |
| 快捷链接 | `m` `s` `w` `t` `l` | 每行「名称 网址」，只接受 http / https / mailto |
| 时间进度 | `m` `s` `w` | 今天、本周、本月、今年已过去的比例 |
| Agent | `t` `l` `m` `w` | 等你确认的会话排最前，其次运行中和最近会话，点击打开；即将触发的定时任务；一键新会话 |
| 订阅 | `t` `l` `m` `w` | RSS / Atom，多个源按时间合并；默认中文少数派、英文 Hacker News |
| 习惯打卡 | `m` `l` `t` `w` | 最近一周可点选补卡，显示连续天数 |

默认看板只放今日横栏、待办、日历和速记，其余从组件库添加。升级后新增的内置 widget 只出现在组件库，不会自动加入已有看板。

点「编辑」可以拖动卡片、换尺寸、移除、打开 widget 设置，或从组件库添加。看板是标签页：「+」新建，双击重命名，编辑模式下可删除。

数据留在本机 Harness profile 存储（`~/.dsh/storages/dsh_desk.json`）。旧版 `dsh-bento` 的数据（`dsh_bento.json`）会在首次启动时复制过来，旧文件保留不动。网络请求只由 Host 发出：设置城市后，天气和城市搜索走 [Open-Meteo](https://open-meteo.com)（无需 key，数据 CC BY 4.0）；日历从你添加的 ICS 地址拉取。结果在 Host 缓存。

## Agent 工具

- `desk_todos`：`list`、`add`、`complete`、`reopen`、`remove`
- `desk_note`：`read`、`append`、`replace`

页面可见时每 5 秒刷新，Agent 的改动不用刷新页面就会出现。

## 安装

在 Harness 对话里让 Agent 用 `plugin_manager install_bundle` 指向本目录。本地目录是链接安装，不复制。

## 写一个 widget

widget 是一个 React 组件，由其他 bundle 在 `client.js` 里注册到 `desk.widget` slot。manifest 挂在组件的静态属性 `desk` 上；slot 注册参数只保留 `id`、`order`、`label`。

```js
function Hello({size, config}) {
  return h('b', null, `Hello (${size})`);
}
Hello.desk = {apiVersion: 1, sizes: ['m', 's']};

ctx.effect(() => ctx.slots.inject('desk.widget', () => ctx.slots.register({
  name: 'desk.widget', id: 'hello.widget', order: 100, label: 'Hello',
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

`sizes` 第一个为默认。其他 manifest 字段：

- `title: false` 隐藏卡片标题，`banner: true` 无框渲染。
- `description` 显示在组件库里。
- `settings` 是设置弹窗的字段列表：`{key, type, label, default?, options?, placeholder?}`，`type` 可选 `text`、`textarea`、`select`（配 `options: [{value, label}]`）、`toggle`。label 可以是字符串，也可以是返回字符串的函数。

组件收到 `size`、`config`（这张卡保存的设置）、`editing` 和 `openSettings()`。

## 开发

```sh
npm run check   # 语法检查 + Host 端冒烟 + ICS 测试
```

文件：`index.js`（Host 端 `/api/dsh-desk/*` 路由、存储、Agent 工具）、`lib/`（HTTP 缓存、天气、ICS 解析）、`client.js`（侧栏入口、面板、内置 widget）、`cordis.patch.yml`、`locale/`、`icon.svg`。
