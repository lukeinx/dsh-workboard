# AGENTS.md

- 用户是本插件的开发者。未特别说明时，「改 / 优化某个 widget」指以开发者身份修改本仓库的内置 widget 源码（`client.js`、`index.js`、`lib/`），不要调用 `workboard_widget` 工具或加载 `workboard-widget` skill 去生成、修改自定义 widget。
- 只有用户明确说「用 Agent 生成」「自定义 widget」或直接点名 `workboard_widget` 时，才走自定义 widget 流程。
- 已安装的插件以软链接指向本仓库（`~/.dsh/profiles/desktop/node_modules/dsh-workboard`），改 `client.js` 后刷新 DSH 页面即可验证；改 `index.js` / `lib/` 需重载插件。
- 提交前跑 `npm run check`。

## 改用户当前的看板数据

没有建 / 改看板的 Agent 工具；`/api/dsh-workboard/*` 需要登录凭证，curl 返回 401。看板存在 `~/.dsh/storages/dsh_workboard.json` 的 `tables.boards`（顺序在 `tables.prefs.boards.order`），JSON 后端只在打开时读盘，插件运行时直接改文件会在十几秒内被内存状态覆盖。按下面顺序做：

1. 备份：`cp -p` 到 `~/.dsh/backup-workboard-reset-YYYYMMDD/dsh_workboard.before-<用途>-HHMMSS.json`。
2. 停用插件：`plugin_manager` `{action: 'set_bundle', target: 'dsh-workboard', enabled: false}`，让 store 关闭并落盘。
3. 重新读文件后再改：新看板 id 用 `b` + base36 时间戳，结构同 `defaultBoard()`（`apiVersion`、`id`、`title`、`widgets`、`known`），`known` 填全部内置 id；把 id 追加到 `prefs.boards.order`。
4. 启用插件：`set_bundle` 同参数 `enabled: true`，再读文件确认改动仍在，提醒用户刷新页面。

## 新增 / 删除内置 widget 时同步文档

`README.md`（中文，GitHub 默认展示）与 `README.en.md` 成对修改，只动下列位置；「亮点 / Highlights」各小节的正文与场景列表、截图、快速开始、写给 AI Agent 等主体内容不改。

1. **数量**：以 `client.js` 的 `builtins` 数组长度为准，替换全部出现处——每份 README 的顶部加粗标语、亮点首个小节标题、参考里的 widget 列表 `<summary>`、开发里的 `client.js` 说明，以及 `package.json` 的 `description`。改完用 grep 旧数字确认无残留。
2. **widget 列表**（参考 → 全部 N 个内置 widget）：按 `BUILTIN_CATEGORY` 放进对应分组，组内顺序与该数组一致；名称用 locale 里的显示名；档位列按 manifest `sizes` 原顺序写；说明列一句话，风格对齐相邻行。若与其他 widget 共享设置或偏好，补到表后的「注」。
3. **网络请求与本机读取说明**：新 widget 有外部请求时补到上半部列表（写清服务、触发条件、缓存时长；设置项有预填地址的，按 locale 写出默认值）；只读本机数据或调用本机命令时补到下半部列表（写清读什么、是否需要系统权限）。纯前端无读取则不动。
4. **致谢**：新引入的第三方数据源、接口、`vendor/` 内代码或本机 CLI 各加一行：名称（有官网则加链接）、用途、许可或条款（非官方接口标「非官方接口」）；已有行覆盖的只补用途。
5. 删除或改名 widget 时反向做同样的事，致谢里不再被任何 widget 使用的行一并删除。
