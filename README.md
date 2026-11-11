# dsh-workboard

DeepSeek Harness 工作台插件：在 Harness 侧栏增加「工作台」面板，模块化展示时钟、天气、格言、待办、速记、日历等 widget，支持多看板、可视化编辑、第三方插件扩展和 Agent 生成 widget。面向社区开源，MIT 许可。

状态：未开始编码。方案、mock 和待决事项见材料区 `.materials/`（iCloud `Vibe/dsh-workboard/`）。

## 计划结构

照 `~/Vibe/dsh-btop` 的形态：

| 文件 | 职责 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch`、`dsh.client`、locale 与 icon 导出、`engines.dsh` |
| `cordis.patch.yml` | 插入 `dsh-workboard` 行 |
| `index.js` | Host 端：`/api/dsh-workboard/*` 路由、数据存储、外部请求代理与缓存、Agent 工具 |
| `client.js` | Web 端：`sidebar.panellist` 入口 + `main` 面板，声明子 slot `workboard.widget`，内置 widget |
| `locale/en.json`、`locale/zh.json` | 显示名称、描述和界面文案 |
| `icon.svg` | 插件图标 |

## 开发

待补：lint / 冒烟检查命令（参考 dsh-btop 的 `npm run check`）。

安装：在 Harness 里用 `plugin_manager install_bundle` 指向本目录（本地目录是链接安装，改 Host 代码后需重启 Harness）。
