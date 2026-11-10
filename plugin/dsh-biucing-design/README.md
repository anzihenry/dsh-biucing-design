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
- **AI 生成设计（v1.5）**：点「AI 生成设计」把需求交给当前 profile 的默认模型，直接产出完整、
  自包含的设计稿，并可继续用自然语言修改；失败自动回退模板引擎（详见下文）。
- **多项目工作区**：项目切换 / 新建 / 删除 / 重命名；项目可导出为 `.design.json` 并重新导入，
  每个项目独立保存需求、模板、风格、tokens、版本历史、批注与导入的 HTML。
- **风格对比**：顶栏「对比风格」把当前模板按 3 套风格并排渲染，点击任一画板即应用其风格。
- **画布批注**：打开批注模式后点击画板任意位置添加批注，批注钉随画板缩放定位，左侧可查看/删除；
  批注会写进交付说明。
- 版本历史可回滚；支持下载 / 复制 HTML、复制 design tokens、复制给 Agent 的设计交付说明，
  以及导入外部 HTML 在沙箱画布中预览。
- 状态保存在浏览器 localStorage，刷新与切换面板不丢失。
- 支持 `?panel=design-studio` 深链：打开带该参数的 Web GUI 地址会直接进入设计工作室。
- 导出：HTML 下载/复制之外，新增「在新标签预览」「打印 / PDF」「导入 tokens」
  （JSON 或 CSS 自定义属性，自动做可读性与合法性归一化）。
- 窄窗口（<760px）不再直接丢弃编辑区：顶栏出现抽屉按钮，需求/模板/风格以覆盖层打开。
- 画布文档刷新做 90ms 防抖，拖动 token 滑杆不再整页闪烁；标题推导会剥离
  「包含…」「with …」等需求从句，避免把整句提示词当成设计标题。
- 导入弹窗有焦点圈定、Esc 关闭与关闭后焦点还原。

### 浏览器核验工具（v1.5）

Host 半边注册两个 tool，使用**独立的临时 headless Chrome**（不碰用户浏览器资料与 cookie，
不下载浏览器，临时 profile 用完即删）：

| 工具 | 用途 |
|---|---|
| `design_verify_ui` | 用 `connection.authenticatedUrl()` 取得带鉴权的 Web GUI 地址，打开 `?panel=design-studio`，等待面板渲染后截图并审计，返回 `issues[]` 与 PASS/FAIL。支持 `device`、`theme`（current/dark/light）、`full_page`、`include_shell`，以及 `steps` 交互脚本（click/type/wait/screenshot），可验证“生成设计、打开弹窗、应用 tokens”等真实交互。 |
| `design_screenshot_html` | 把自包含 HTML（内联字符串或本地 `.html` 文件）在 headless Chrome 中渲染并截图，用来直接查看生成的设计稿。 |
| `design_projects` | Agent ↔ 面板的项目桥：`write` 把项目（名称/需求/模板/风格/tokens/HTML/批注）发布到共享 profile 库；面板「已发布设计」自动列出并一键打开，无需文件选择器。`list` / `read` 查看已发布项目；`scope: "workspace"` 可改写到工作区目录。Host 同时注册**只读**路由 `/design-studio/projects` 供面板读取（loopback、no-store、同源/Sec-Fetch-Site 校验、2MB 上限、无 CORS）。 |

**审计内容**：三列布局是否成立、横向溢出、控件数量、计算色值与对比度、无标注按钮、
控制台错误，以及**沙箱 iframe 内设计稿本身**的尺寸/溢出/对比度/标题/图片加载
（通过 CDP OOPIF target 读取，宿主页面读不到 sandbox iframe）。

**隐私与安全默认值**：

- `design_verify_ui` 默认把截图**裁剪到设计工作室面板**，避免左侧工作区/会话标题进入模型上下文；
  需要整屏时传 `include_shell: true`。
- 核验 loopback GUI 时只允许 loopback 网络；`design_screenshot_html` 默认阻止远程 DNS
  （`block_network: false` 可放行外部图片/字体）。
- `file_path` 必须位于会话工作区内；确实需要外部文件时显式传 `allow_outside_workspace: true`。
- 报告会记录 Chrome 以 `sandboxed` 还是 `relaxed` 运行；可用
  `DSH_DESIGN_CHROME_NO_SANDBOX=never` 禁止 `--no-sandbox` 回退。
- 截图目录默认保留最近 60 张本工具命名的 PNG，自动清理旧文件。
- `design_projects` 只读写项目目录内的 JSON，拒绝目录外路径；不监听端口、不上传任何内容。

返回的 PNG 落在工作区 `.design-studio/screenshots/`（可用 `output_dir` 覆盖），
调用后用内置的 `read_image` 读取图片即可让模型“看到”界面。

要求：本机安装 Chrome / Chromium（可用 `DSH_DESIGN_CHROME` 指定可执行文件路径）；
否则工具会给出明确错误。Chrome 自身沙箱不可用的容器 / CI 环境会自动回退到 `--no-sandbox` 重试。

## AI 生成设计（v1.5）

面板 BRIEF 区的「AI 生成设计」按钮会调用 Host 的 `POST /design-studio/generate`：

- 使用 `agentDefaultModel` 当前选择的 provider/model（本机实测 `deepseek-account/deepseek-flash`）
- 一次请求返回完整的 `<!doctype html>` 文档 + 设计 tokens；渲染在 `sandbox=""` 的 iframe 中
- 生成后可在「用 AI 继续修改」里输入自然语言指令（例如放大标题、换品牌色），基于当前 HTML 迭代
- 输出会做消毒：移除 `<script>` / `<iframe>` / 事件属性 / 外链样式，限制 300KB
- 失败（无模型、超时、输出被截断）时自动回退到内置模板引擎，并在面板显示原因
- 安全：仅同源请求、限流 6 次/分钟、串行生成、请求体上限 320KB、单次超时 120 秒
- 提示：生成会消耗你配置模型的额度；首次输出通常需要 30–90 秒

## 结构

```
dsh-biucing-design/
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

在 DSH 会话中通过 Plugin Manager 以本地目录安装本包（`plugin/dsh-biucing-design`）；包名 `dsh-biucing-design` 与 GitHub 仓库一致，侧边栏入口名仍是 **Design Studio**。
或将其加入 profile 的 bundle 列表。安装后左侧栏出现设计工作室图标，点击切换到设计画布。

升级已安装的 Host 侧代码（`index.js` / `lib/`）通常需要重启 DSH 才能加载新的模块 generation；
Client 侧代码刷新页面即可。

## Agent ↔ 面板的项目桥

Agent 把设计发布到共享库：

```text
design_projects({
  action: "write",
  name: "acme-pricing",
  project: {
    projectName: "Acme pricing",
    brief: "三档定价页，年付切换 + FAQ",
    template: "pricing",
    styleId: "enterprise",
    tokens: { accent: "#1d4ed8", radius: 8 }
  }
})
```

面板项目区的「已发布设计」会自动列出共享库（打开面板时、窗口重新聚焦时、或点「刷新」），
点击条目即可加载，**不再需要手动选文件**；反向地，面板「导出」的 JSON 也可以被 Agent 用
`design_projects({ action: "read", file: "..." })` 读取（或发布到库里共享）。

- 共享库默认：`$DSH_HOME/design-studio/projects`（`DSH_HOME` 未设置时为 `~/.dsh/design-studio/projects`），
  可用环境变量 `DSH_DESIGN_PROJECTS_DIR` 覆盖。
- 面板通过只读路由 `GET /design-studio/projects`（列表）与 `GET /design-studio/projects/<file>`
  读取；路由只接受 GET/HEAD、校验同源/`Sec-Fetch-Site`、限制文件大小、拒绝目录外路径、无 CORS 头。
- 仍保留手动「导入」用于任意第三方 `.json` 文件。

## 已知限制

- 生成的文档在 `sandbox=""` 的 iframe 中渲染：脚本不会执行；导入外部 HTML 时，页面引用的
  外部图片 / 字体会被正常加载（自包含 HTML 无此问题）。
- 每次调整设计 token 都会重新生成并刷新画布文档，拖动滑杆时会有轻微闪烁。
- 设计稿内容文案由引擎生成（中英文按需求语言），不是通用大模型自由创作；复杂交互原型请把
  「复制交付说明」交给 Agent 继续实现。
- Agent ↔ 面板的「已发布设计」在面板打开/窗口聚焦/手动刷新时拉取，不是 WebSocket 推送；写入由 Agent 工具（或用户导入文件）完成，路由只读。
- 视觉核验截取的是 **Web GUI**（浏览器表面），不是 Electron 原生窗口；字体渲染 / 窗口控件
  可能与桌面壳略有差异。原生窗口级截图需要 macOS Computer Use bundle（需系统权限）。
- 插件管理器中的图标 / 标题属于渲染态，本仓库未提交截图。
