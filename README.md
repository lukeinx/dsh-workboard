# dsh-bento

DeepSeek Harness 插件：在 Harness 侧栏增加「Bento」面板，模块化展示时钟、天气、格言、待办、速记、日历等 widget，支持多看板、可视化编辑、第三方插件扩展和 Agent 生成 widget。面向社区开源，MIT 许可。

状态：技术验证完成，面板骨架 + 时钟 widget。方案、mock 和进度见材料区 `.materials/`（iCloud `Vibe/dsh-bento/`）。

## 结构

| 文件 | 职责 |
|---|---|
| `index.js` | Host 端：每个方法一条 `POST /api/dsh-bento/*` Fetch 路由（`/api` 共享通道只允许一个 interceptor）；看板存 `storageDomain`（域名 `dsh_bento`）；`bento_status` Agent 工具 |
| `client.js` | Web 端：`sidebar.panellist` 入口 + `main` 面板，面板声明子 slot `bento.widget`；内置 widget 也走这个 slot |
| `examples/hello-widget/` | 独立 bundle 向 `bento.widget` 注册 widget 的示例 |
| `cordis.patch.yml`、`locale/`、`icon.svg` | 插入行、显示名称与描述、图标 |

## 写一个 widget

在自己的 bundle 的 `client.js` 里注册到 `bento.widget`：manifest 挂在组件的静态属性 `bento` 上（slot 注册参数只保留 `id`、`order`、`label`），组件收到 `size` 属性。

```js
Hello.bento = {apiVersion: 1, sizes: ['m', 's']};
ctx.effect(() => ctx.slots.inject('bento.widget', () => ctx.slots.register({
  name: 'bento.widget', id: 'hello.widget', order: 100, label: 'Hello',
}, Hello)), 'hello widget');
```

尺寸档位：`s` 1×1、`m` 2×1、`tall` 1×2、`l` 2×2、`wide` 4×1，`sizes` 第一个为默认。

## 开发

```sh
npm run check   # 语法检查 + Host 端冒烟
```

安装：在 Harness 里用 `plugin_manager install_bundle` 指向本目录（示例 widget 指向 `examples/hello-widget`）。本地目录是链接安装。安装后用 `bento_status` 工具或 Client `Slots.listSubTree`（root `bento.widget`）查看已注册 widget。
