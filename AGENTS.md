# AGENTS.md

- 用户是本插件的开发者。未特别说明时，「改 / 优化某个 widget」指以开发者身份修改本仓库的内置 widget 源码（`client.js`、`index.js`、`lib/`），不要调用 `workboard_widget` 工具或加载 `workboard-widget` skill 去生成、修改自定义 widget。
- 只有用户明确说「用 Agent 生成」「自定义 widget」或直接点名 `workboard_widget` 时，才走自定义 widget 流程。
- 已安装的插件以软链接指向本仓库（`~/.dsh/profiles/desktop/node_modules/dsh-workboard`），改 `client.js` 后刷新 DSH 页面即可验证；改 `index.js` / `lib/` 需重载插件。
- 提交前跑 `npm run check`。
