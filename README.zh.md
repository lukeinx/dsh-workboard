# 工作台 · DeepSeek Harness

[English](README.md)

工作台（`@lukeinx/dsh-desk`）在 DeepSeek Harness 侧栏增加一个模块化工作台。内置 31 个 widget，包括今日横栏、待办、速记、ICS 日历、天气、Agent 会话、Prompt 快启、用量统计、Git 工作区、系统状态、行情、产出物、定时任务和网络，零配置可用；Agent 可以在任意对话里读写你的待办、速记和收集箱；还可以一句话让 Agent 生成新的 widget，其他插件也可以注册自己的 widget。

状态：早期（P0b）。MIT 许可。

## 内置 widget

| widget | 档位 | 内容 |
|---|---|---|
| 今日 | 横栏 | 时间、问候、日期、ISO 周、当前天气和每日格言（内置、一言或自定义），点格言换一条 |
| 待办 | `l` `m` `t` | 未完成在前、已完成折叠；之前留下的未完成项标「结转」 |
| 速记 | `l` `t` `m` `s` | 自动保存，当前行可转待办 |
| 日历 | `t` `l` `s` `m` | 月视图和所选日期的日程，来自一个或多个 ICS 订阅，支持重复日程 |
| 天气 | `m` `s` | 当前天气、今日最高最低、空气质量和接下来几小时 |
| 时钟 | `m` `s` | 时间、问候、日期和年度进度 |
| 格言 | `m` `w` `s` | 每日一句，点一下换一条；来源（内置、一言或自定义）与今日横栏共用 |
| 倒数日 | `m` `s` `t` | 距周末、月底、年底和自定日子的天数；`12-25` 这样不写年份则每年重复 |
| 世界时钟 | `m` `s` `w` `t` | 多个 IANA 时区的时间、与本地的时差和日期差 |
| 专注 | `m` `s` | 番茄钟，切换看板或离开面板不中断，结束时发系统通知，记录今日个数 |
| 快捷链接 | `m` `s` `w` `t` `l` | 每行「名称 网址」，只接受 http / https / mailto |
| 时间进度 | `m` `s` `w` | 今天、本周、本月、今年已过去的比例 |
| Agent | `t` `l` `m` `w` | 等你确认的会话排最前，其次运行中和最近会话，点击打开；即将触发的定时任务；一键在选定工作区新开会话 |
| 订阅 | `t` `l` `m` `w` | RSS / Atom，多个源按时间合并；默认中文爱范儿和阮一峰的网络日志、英文 Hacker News；打开过的条目变灰，可一键全部已读或在设置里隐藏已读 |
| 习惯打卡 | `m` `l` `t` `w` | 最近一周可点选补卡，显示连续天数 |
| Prompt 快启 | `m` `w` `l` `t` `s` | 输入或点预设，直接新开会话并发送；卡片上可切换工作区，设置里的工作目录在未选过工作区时生效 |
| 收集箱 | `t` `l` `m` `w` | 随手丢进来的事情，一键交给 Agent 在选定工作区整理 |
| 用量 | `l` `t` `m` `w` `s` | 从本机会话日志统计今日和最近几天的 token、请求数、缓存命中和按模型拆分；填单价后估算花费 |
| 运行中 | `t` `l` `m` `w` | 各会话的长任务目标和后台作业，点击打开会话，可停止作业 |
| Git 工作区 | `t` `l` `m` `w` | 各仓库的分支、改动、领先 / 落后和上游已删除的分支；默认取 Harness 工作区；可一键获取远端或交给 Agent |
| GitHub | `t` `l` `m` `w` | 等我 review 的 PR、我的 PR 和指派给我的 issue，用本机已登录的 `gh` |
| 系统状态 | `m` `s` `t` `l` `w` | CPU、内存、磁盘、电池和最近 5 分钟的 CPU 曲线 |
| 相框 | `m` `s` `t` `l` `w` | 轮播本机文件夹（默认 `~/Pictures`）里的照片，点击换下一张 |
| 行情 | `t` `m` `s` `l` `w` | 汇率（`USD/CNY`）、A 股 / 港股 / 美股（`sh600519`、`hk00700`、`usAAPL`）和加密货币（`BTC`、`cg:<id>`）；可选红涨或绿涨 |
| 热榜 | `l` `t` `m` `w` | 每个信源一个标签：微博、知乎、36 氪、少数派、Hacker News、GitHub Trending、Product Hunt 和 Reddit（国际新闻、科技、科学）；B 站和 V2EX 可在设置里打开；打开过的条目变灰 |
| 产出物 | `t` `l` `m` `w` | Agent 交付的文件，可选附带它新建的文档，按时间倒序；点击打开，也可以在 Finder 中定位或跳到对应会话 |
| 定时任务 | `t` `l` `m` `w` | 全部定时任务的周期和下次运行时间；立即运行、暂停、恢复或删除，新建时开一个会话来创建 |
| 收藏会话 | `t` `l` `m` `w` | 你收藏的会话和各自最新一条消息；点击打开 |
| 最近文件 | `t` `l` `m` `w` | `~/Downloads`、`~/Desktop` 或自定文件夹里最新的文件；打开、定位或交给 Agent。应用、安装包和脚本只定位不打开 |
| 剪贴板 | `t` `l` `m` `w` | 面板打开期间复制过的文本；再次复制，或带上「翻译」「总结」等预设发给 Agent |
| 网络 | `m` `s` `t` `l` `w` | 上下行速率、本机和公网 IP、系统代理，以及到你所列站点的延迟 |

Agent、Prompt 快启和收集箱共用同一个工作区选择，选项来自 Harness 登记的工作区；在任一卡片切换后其他卡片同步。

默认看板只放今日横栏、待办、日历和速记，其余从组件库添加。升级后新增的内置 widget 只出现在组件库，不会自动加入已有看板。

点「编辑」可以拖动卡片、换尺寸、移除、打开 widget 设置，或从组件库添加。组件库按日常、Agent、资讯、效率与工具分组，可搜索，添加后不关闭，可以连续添加。看板是标签页：「+」新建，双击重命名，编辑模式下可删除。

多个 widget 共用的设置（称呼、每周起始日、城市与温度单位、格言来源）也可以在「设置 → 工作台」里改（插件详情页的「打开设置」在主区域打开同一页），看板上没有对应卡片时也找得到；两处改的是同一份数据。

数据留在本机 Harness profile 存储（`~/.dsh/storages/dsh_desk.json`）。旧版 `dsh-bento` 的数据（`dsh_bento.json`）会在首次启动时复制过来，旧文件保留不动。网络请求只由 Host 发出，结果在 Host 缓存：

- 天气和城市搜索：[Open-Meteo](https://open-meteo.com)（无需 key，数据 CC BY 4.0），设置城市后才请求
- 格言：[一言](https://hitokoto.cn)，仅在格言来源选了一言时请求
- 日历和订阅：你添加的 ICS 与 RSS / Atom 地址
- 行情：股票走腾讯行情 `qt.gtimg.cn`，汇率走 [open.er-api.com](https://open.er-api.com)（每日更新），加密货币走 [CoinGecko](https://www.coingecko.com)
- GitHub：通过本机 `gh` CLI，用它已有的登录
- 热榜：微博、知乎、36 氪、少数派、B 站、V2EX 走各站网页接口（非官方，站点改版可能失效），Hacker News 走 [HN Algolia API](https://hn.algolia.com/api)，GitHub 走 Trending 页，Product Hunt 和 Reddit 走订阅源；缓存 10 分钟
- 网络：公网 IP 走 [ipinfo.io](https://ipinfo.io)（失败时换 [ip.sb](https://ip.sb)），延迟测你列出的站点，都用 `curl`，设置了系统代理时经过代理

另有几个 widget 只读本机：用量读 `~/.dsh/sessions` 下的会话日志；Git 工作区运行 `git status`，只在你点「获取远端」时执行 `git fetch`；系统状态在 macOS 用 `vm_stat` 和 `pmset`；相框在 macOS 用 `sips` 把照片缩到 1280px，缓存在系统临时目录。产出物读同一批会话日志；最近文件只列各文件夹第一层；剪贴板在卡片显示期间每 2 秒读一次 `pbpaste`（macOS）或 `wl-paste` / `xclip`（Linux），历史只存在内存，不写盘。

用量按日志里的 usage 字段统计。部分 provider 不上报 token，这些请求只计入请求数，卡片底部会注明。「运行中」只看得到当前 Harness 进程里的会话。

## Agent 工具

- `desk_todos`：`list`、`add`、`complete`、`reopen`、`remove`
- `desk_note`：`read`、`append`、`replace`
- `desk_inbox`：`list`、`add`、`remove`、`clear`
- `desk_widget`：自定义 widget 的 `list`、`get`、`create`、`update`、`set_data`、`remove`；配套的 `desk-widget` skill 告诉 Agent 怎么写

页面可见时每 5 秒刷新，Agent 的改动不用刷新页面就会出现。

## 用 Agent 生成 widget

在组件库里选 **用 Agent 生成**（空看板上也有），描述想要的卡片后发送：会打开一个新会话由 Agent 制作，做好后出现在你当时打开的看板上，组件库里归在 **我的**。也可以在任何对话里直接让 Agent 给工作台做一个 widget。

自定义 widget 是 Agent 写的 HTML，运行在沙箱 iframe 里：访问不到 Harness 页面、cookie、浏览器存储，也不能直接联网，样式跟随 Harness 主题。它只能通过 `window.desk` 使用 Desk：读自己的设置和已保存数据、请求 widget 声明过的 http(s) 地址前缀（由 Host 发出并缓存 30 秒）、保存自己的数据、打开链接、打开一个需要你确认发送的新会话草稿。

自定义卡片标题栏（或编辑模式）里的星光按钮可以让 Agent 修改；编辑模式里还有 **源码**，可以直接改 HTML、查看声明的地址或删除 widget。运行出错时卡片上会显示错误和 **让 Agent 修复**，Agent 也能通过 `desk_widget` 看到最近一次错误。定义和数据与 Desk 其余数据存在一起；最多 50 个，每个 HTML 和数据各不超过 200 KB。

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

完整示例见 [`examples/hello-widget`](examples/hello-widget)。新装的 widget 只自动加入当前打开的看板一次，其他看板只在组件库里出现。

| 档位 | 列 × 行 | |
|---|---|---|
| `bar` | 4 × ½ | 无框横栏 |
| `s` | 1 × 1 | 小 |
| `m` | 2 × 1 | 中 |
| `t` | 1 × 2 | 竖 |
| `l` | 2 × 2 | 大 |
| `w` | 4 × 1 | 通栏 |

`defaultSize` 指定添加时的尺寸，须在 `sizes` 内；未设置时取 `sizes` 第一个。尺寸菜单始终按上表顺序排列。其他 manifest 字段：

- `title: false` 隐藏卡片标题，`banner: true` 无框渲染。
- `description` 显示在组件库里。
- `category` 决定在组件库里的分组：`daily`（日常）、`agent`（Agent）、`news`（资讯）、`tools`（效率与工具）；未填或其他值归入「插件」。
- `settings` 是设置弹窗的字段列表：`{key, type, label, default?, options?, placeholder?}`，`type` 可选 `text`、`textarea`、`select`（配 `options: [{value, label}]`）、`toggle`。label 可以是字符串，也可以是返回字符串的函数。

组件收到 `size`、`config`（这张卡保存的设置）、`editing` 和 `openSettings()`。

## 开发

```sh
npm run check   # 语法检查 + Host 端冒烟 + ICS 测试
```

文件：`index.js`（Host 端 `/api/dsh-desk/*` 路由、存储、Agent 工具）、`skills/desk-widget.md`（Agent 编写 widget 的指南）、`lib/`（HTTP 缓存、自定义 widget 校验、天气、ICS 与订阅解析、会话日志用量、子进程、Git、GitHub、系统状态、相框、行情、热榜）、`client.js`（侧栏入口、面板、内置 widget）、`cordis.patch.yml`、`locale/`、`icon.svg`。
