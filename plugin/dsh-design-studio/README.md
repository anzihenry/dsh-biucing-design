# 设计工作室 / Design studio

DeepSeek Harness 插件：在左侧栏增加一个「设计工作室」入口，中间工作区打开设计画布，
并内置一套**浏览器核验工具**，让 Agent 能真正截图、审计自己做的界面。

## 功能

### 设计画布

- 用一句话描述需求，生成为自包含 HTML 设计稿（落地页 / 仪表盘 / 移动端 App / 定价页 / 海报 / 单页文档 / 表单）。
  中英文需求都会自动匹配模板与风格。
- 画布支持桌面 / 平板 / 手机三种尺寸预览、缩放与明暗模式。
- 右侧设计系统面板：品牌色、背景、表面、文字色、字体（标题 / 正文）、字号节奏、留白密度、圆角，
  全部实时重渲染；并给出文字对比度与按钮对比度检查（AA 提示）。
- 6 套风格预设（极简 / 杂志编辑 / 暗夜 / 粗野主义 / 马卡龙 / 企业商务）+
  快速优化（更简洁 / 更高级 / 更活泼 / 深色模式 / 浅色模式 / 更疏朗 / 更紧凑 / 更圆润 / 更方正）。
- 版本历史可回滚；支持下载 / 复制 HTML、复制 design tokens、复制给 Agent 的设计交付说明，
  以及导入外部 HTML 在沙箱画布中预览。
- 状态保存在浏览器 localStorage，刷新与切换面板不丢失。
- 支持 `?panel=design-studio` 深链：打开带该参数的 Web GUI 地址会直接进入设计工作室。

### 浏览器核验工具（v1.1）

Host 半边注册两个 tool，使用**独立的临时 headless Chrome**（不碰用户浏览器资料与 cookie，
不下载浏览器，临时 profile 用完即删）：

| 工具 | 用途 |
|---|---|
| `design_verify_ui` | 用 `connection.authenticatedUrl()` 取得带鉴权的 Web GUI 地址，打开 `?panel=design-studio`，等待面板渲染后截图并审计（栏宽、iframe、控件数量、横向溢出、计算色值 / 对比度、控制台错误），可指定 `device`（desktop/tablet/mobile）、`theme`（current/dark）、`full_page`。 |
| `design_screenshot_html` | 把自包含 HTML（内联字符串或本地 `.html` 文件）在 headless Chrome 中渲染并截图，用来直接查看生成的设计稿。 |

返回的 PNG 落在工作区 `.design-studio/screenshots/`（可用 `output_dir` 覆盖），
调用后用内置的 `read_image` 读取图片即可让模型“看到”界面。

要求：本机安装 Chrome / Chromium（可用 `DSH_DESIGN_CHROME` 指定可执行文件路径）；
否则工具会给出明确错误。Chrome 自身沙箱不可用的容器 / CI 环境会自动回退到 `--no-sandbox` 重试。

## 结构

```
dsh-design-studio/
├── package.json          # bundle 清单 + dsh.client
├── cordis.patch.yml      # 插入 design-studio 行
├── index.js              # Host 半边：注册浏览器核验 tool
├── lib/
│   ├── chrome.js         # 浏览器发现 / 启动 / 清理（Chrome 沙箱自动回退）
│   ├── cdp.js            # 精简 CDP 客户端（Node 内置 WebSocket）
│   ├── audit.js          # 页面内审计表达式（布局 / 色值 / 对比度）
│   └── tools.js          # design_verify_ui / design_screenshot_html
├── client.js             # 构建产物：单文件 Client 模块（勿手改）
├── src/
│   ├── client.js         # Client 模块源码（含 /* @engine */ 占位）
│   ├── engine.mjs        # 设计合成引擎（模板 + 风格 token）
│   ├── test-engine.mjs   # 引擎自测
│   ├── test-built.mjs    # 构建产物自测（构建一致性 / 注册 / 渲染 / 交互 / 深链）
│   └── test-host.mjs     # Host 工具自测（含真实 headless Chrome 截图）
├── scripts/build-client.mjs
├── locale/{en,zh}.json   # 插件管理器标题 / 描述（meta.title / meta.description）
└── icon.svg
```

`client.js` 由源码构建生成，不要直接手改。构建规则：把 `src/engine.mjs` 的顶层 `export`
去掉后，以函数替换（而非字符串替换）的方式内联进 `src/client.js` 的 `/* @engine */` 占位，
并校验产物与源码逐字节一致。

```bash
npm run build        # 生成 client.js
npm test             # 引擎 + 构建产物 + Host 工具自测（最后一项会真实启动 headless Chrome）
```

> `package.json` 的 `files` 只列运行时文件（发布用）；以本地目录安装时整目录会被链接，
> 因此 `src/`、`scripts/` 也会随仓库一起可用。

## 安装（本机 profile）

在 DSH 会话中通过 Plugin Manager 以本地目录安装本包（`plugin/dsh-design-studio`），
或将其加入 profile 的 bundle 列表。安装后左侧栏出现设计工作室图标，点击切换到设计画布。

升级已安装的 Host 侧代码（`index.js` / `lib/`）通常需要重启 DSH 才能加载新的模块 generation；
Client 侧代码刷新页面即可。

## 已知限制

- 生成的文档在 `sandbox=""` 的 iframe 中渲染：脚本不会执行；导入外部 HTML 时，页面引用的
  外部图片 / 字体会被正常加载（自包含 HTML 无此问题）。
- 每次调整设计 token 都会重新生成并刷新画布文档，拖动滑杆时会有轻微闪烁。
- 设计稿内容文案由引擎生成（中英文按需求语言），不是通用大模型自由创作；复杂交互原型请把
  「复制交付说明」交给 Agent 继续实现。
- 视觉核验截取的是 **Web GUI**（浏览器表面），不是 Electron 原生窗口；字体渲染 / 窗口控件
  可能与桌面壳略有差异。原生窗口级截图需要 macOS Computer Use bundle（需系统权限）。
- 插件管理器中的图标 / 标题属于渲染态，本仓库未提交截图。
