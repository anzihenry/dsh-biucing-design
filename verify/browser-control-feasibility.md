# 浏览器控制能力集成可行性分析

> 目标：让「设计工作室」插件自带浏览器控制能力，用于**视觉核验**（截图/DOM 审计），让后续界面工作不再受“本环境没有浏览器控制能力、无法截图核验”的限制。
> 结论先行：**可行，且有三条已验证可用的路线**。推荐分两阶段落地（见文末“建议方案”）。

## 0. 结论摘要

| 方案 | 能力 | 新增依赖 | 安装摩擦 | 维护风险 | 适合场景 |
|---|---|---|---|---|---|
| **A. 官方 browser-use provider（嵌入 bundle）** | 完整页面自动化：导航/点击/输入/截图/控制台/网络/性能 | 官方 MCP provider + MCP server（约 13–15 MB；Playwright 路线可能需浏览器） | 中（需重新安装 bundle，拉取 npm 依赖） | 中高：experimental、版本固定 0.2.2-rc.1、单 provider 槽位 | 需要“像人一样操作任意网页”的通用浏览器自动化 |
| **B. 插件内自研 headless Chrome 工具** | 按需启动 headless Chrome：截图（viewport/full page/元素）、eval、点击/输入、DOM/对比度/溢出审计 | **0**（Node 内置 WebSocket + 系统 Chrome） | 低（只改本插件，重新构建安装） | 中：自维护 CDP 细节（等待、超时、清理） | 补上**视觉验收闭环**（本次的缺口），可扩展成通用浏览 |
| **C. 官方 macOS CUA bundle** | 原生截屏 + 鼠标键盘 + Accessibility 树，能截**真实 App 窗口**（含 Electron 壳） | 官方 CUA bundle + signed helper | 中高（系统权限：辅助功能 + 屏幕录制；仅 macOS；PTC 预设） | 中：experimental、需授权、仅 macOS | 要求“用户所见即所得”的真实窗口级验收 |
| **D. 第三方 install-and-go 浏览器插件** | 功能多（如 dsh-builtin-browser 48 个工具） | 第三方包（可能含 Electron） | 低（直接安装） | 高：第三方信任/维护面、与官方 provider 槽位冲突 | 只想快速获得浏览器能力、可接受第三方依赖 |

建议：**先做 B**（零新依赖、工具面小、直接补上视觉核验），把 A 作为可选的独立 bundle（需要通用浏览能力时再装）；需要真实窗口级截图时再引入 C。

## 实施状态（2026-11-06）

用户选择了 **方案 B-lite**，已随插件 `v1.1.0` 落地并完成真实截图核验：

- Host 半边新增 `lib/`（Chrome 发现/启动、精简 CDP、页面审计）与 `design_verify_ui`、`design_screenshot_html` 两个工具；
- Client 半边支持 `?panel=design-studio` 深链（含 150/600/1500ms 重试，防止宿主恢复默认面板覆盖）；
- 实测修复了三个只有截图才能发现的问题：右侧检查器被渲染到 flex 容器之外、画板初始尺寸被裁切、窄窗口顶栏溢出换行；
- 深色/浅色主题、桌面/平板/手机三种视口、设计稿 full-page 渲染均已截图核对；详见 [visual-verification.md](visual-verification.md)。

方案 A（官方 browser-use provider）与方案 C（macOS CUA）**尚未安装**，保留为后续“通用浏览器操作 / 真实窗口截图”的可选升级路径。

## 1. 本机实测证据

| 事实 | 证据 |
|---|---|
| 系统已安装 Google Chrome 157 | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --version` |
| headless Chrome 可在本机/沙箱中截图 | `--headless=new --no-sandbox --disable-breakpad --user-data-dir=/tmp/... --screenshot=/tmp/.../shot.png` → 900×600 PNG（8500 B） |
| Node 自带 WebSocket，可直接跑 CDP | `node -e 'console.log(typeof WebSocket)'` → `function`（Node v24.19） |
| 截图能作为图片进入模型上下文 | 把 headless 截图复制进工作区后调用 `read_image`，模型收到 `image/png 900x600` 图片块；说明“截图 → 模型看图 → 自己修 UI”的闭环成立 |
| 附件存储已挂载（截图可持久化） | `attachment-local` 行在 `dsh-base` 中默认挂载；`read_image` 已注册且可用 |
| DSH Web GUI 需要鉴权，但有官方取址入口 | `webApp.getAdvertisedUrl()` 提供 GUI 根 URL；`connection.authenticatedUrl(baseUrl)` 生成带鉴权 URL（`dsh-web-app` 自己就用它打印启动地址，见其 README 与 `lib/index.js`） |
| 官方 browser-use 生态存在且版本匹配 | npm：`@deepseek-ai/dsh-browser-use@0.2.2-rc.1`、`@deepseek-ai/dsh-experimental-browser-use-runtime@0.2.2-rc.1`、`...-playwright-mcp@0.2.2-rc.1`、`...-chrome-devtools-mcp@0.2.2-rc.1` |
| 官方 provider 的工具形态 | 工具名 `mcp__chrome-devtools-mcp__<tool>` / `mcp__playwright-mcp__<tool>`；README 明确 “Text and screenshots use the normal tool-result pipeline”；截图需要附件存储 + 图片能力模型路由 |
| 官方 CUA 路线存在 | `@deepseek-ai/dsh-cua-bundle`（rows：`cua-provider-registry`、`cua`=`@deepseek-ai/dsh-experimental-cua-macos`、`ui-cua`）；仅 darwin，需 Accessibility + Screen Recording，helper 为签名 App |
| 内建右侧栏 Browser tab 不能用于 agent 控制 | `ui-sidebar-browser` 仅 desktop 启用，是给人看的沙箱 HTTP(S) 浏览 tab（`dsh-web-app` patch 注释），没有 agent 工具接口 |
| Bundle 可携带官方插件依赖并按 row 挂载 | 第三方 bundle `dsh-builtin-browser` 的 `package.json` 用 peerDependencies 解析 DSH 包，并在 `cordis.patch.yml` 插入多个 row；说明 profile bundle 可以“安装即挂载”第三方/官方能力 |

## 2. 方案 A：官方 browser-use provider（嵌进本插件 bundle）

官方 README 给出的组合方式（可直接抄进 bundle patch）：

```yaml
- insert:
    - id: design-studio-browser-use
      name: '@deepseek-ai/dsh-browser-use'

    - id: design-studio-browser
      name: '@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp'
      config:
        mode: launch
        headless: true
        # 用系统 Chrome，避免再下载 Playwright 浏览器；省略则由上游自动探测
        executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

`package.json` 增加：

```json
"dependencies": {
  "@deepseek-ai/dsh-browser-use": "0.2.2-rc.1",
  "@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp": "0.2.2-rc.1"
}
```

- 优点：安装即获得约 20–30 个高质量工具（快照/点击/输入/截图/控制台/网络/性能），per-Session 浏览器隔离，代码量小。
- 代价与风险：
  - 每个 live Session 会初始化一个 MCP 服务进程（chrome-devtools-mcp 约 13.3 MB，playwright-mcp 依赖 `@playwright/mcp` + `playwright`，可能触发浏览器下载；用 `executablePath` 可规避）。
  - 工具 schema 常驻 prompt（每个请求数千 token 量级），对“偶尔截图一次”的用途偏重。
  - experimental、版本 pin 死 `0.2.2-rc.1`，DSH 升级时需同步升级；整个部署只允许一个 browser-use provider（与未来装 CUA/第三方浏览器插件互斥）。
  - 截图要回传模型仍需图片能力路由 + 附件存储（本机均满足）。

## 3. 方案 B：插件内自研 headless Chrome（推荐先做）

不引入任何 npm 依赖；Host 半边注册少量工具，按需拉起系统 Chrome，用 CDP 截图/审计。

### 3.1 关键实现点

1. 鉴权 URL：`ctx.get('connection')?.authenticatedUrl(ctx.get('webApp')?.getAdvertisedUrl())`。
2. 深链：Client 半边识别 `?panel=design-studio`，在 apply 时调用 `ctx.layout.selectPanel('design-studio')`（`layout` 是已有 Client 服务），这样 headless 打开 URL 即直达设计工作室，无需模拟点击侧栏。
3. 明暗主题：DSH 深色主题由 `body[data-ds-dark-theme]` 属性驱动（审计阶段在 theme 包中确认过选择器）；截图前用 CDP `Runtime.evaluate` 临时设置属性，截完不写回、不改变用户设置。
4. Chrome 生命周期：`--headless=new --disable-gpu --hide-scrollbars --no-first-run --disable-breakpad --user-data-dir=<临时目录> --remote-debugging-port=0`；从临时目录的 `DevToolsActivePort` 读端口；用完 `Browser.close` 并删临时目录（独立 temp profile，不碰用户 cookie）。
5. 等待策略：轮询 `document.readyState==='complete'` + 目标根节点出现 + 面板 iframe `load`，再 `Page.captureScreenshot`（`captureBeyondViewport: true` 可截长图）。
6. 图片回传：`ctx.attachments.saveImage(...)` 得到 `ImageAttachmentRef`，在 `defineTool` 的 `output.render` 中返回 `ImageBlock`；同时把 PNG 落盘到工作区（便于 `present`/回归对比）。
7. 工具面克制：先注册 2 个工具即可；都通过 `register(definition, { when })` 条件注册，不用的会话不增加 schema 成本。
   - `design_verify_ui({ device?: 'desktop'|'tablet'|'mobile', theme?: 'system'|'light'|'dark', full_page?: boolean, checks?: boolean })`
     → 返回 `{ images: [截图], report: { overflow, contrast, tokens, panelMounted, consoleErrors, ... } }`
   - `design_screenshot_html({ file_path?: string, html?: string, width?, height?, full_page?, theme? })`
     → 对引擎生成的设计稿（自包含 HTML）直接截图，不需要 DSH 鉴权。
8. 审批与安全：浏览器工具仍是普通 tool，走 `ask` 审批策略；默认只允许 `127.0.0.1` 的 DSH GUI + 工作区设计文件；临时 profile 不持久化 cookie；不把鉴权 URL 写进日志/会话文本。
9. 可选通用化：后续再加 `browser_open/click/type/eval`（CDP `Input.*` / `Runtime.evaluate`），就是一个轻量通用浏览器控制器。

### 3.2 工作量估计

| 范围 | 工作量 | 说明 |
|---|---|---|
| B-lite：深链 + 鉴权 URL + 截图 + 基础审计 | 0.5–1 天 | 约 300–500 行 Host 代码 + Client 深链 + 测试；可复用本次已成熟的 headless Chrome 调用方式 |
| B-full：加点击/输入/eval/等待策略 | 2–3 天 | 约 800–1200 行，含超时/清理/回归测试 |

## 4. 方案 C：官方 macOS CUA（真实窗口级）

```yaml
# 直接安装官方 bundle（Plugin Manager → Add plugin → @deepseek-ai/dsh-cua-bundle），
# 或作为依赖 + row 插入（仅 darwin）
- id: cua-provider-registry
  name: '@deepseek-ai/dsh-computer-use'
- id: cua
  name: '@deepseek-ai/dsh-experimental-cua-macos'
  config: { agentPreset: ptc }
- id: ui-cua
  name: '@deepseek-ai/dsh-cua'
```

- 能力：截取真实 `DeepSeek Harness.app` 窗口（含 Electron 壳/原生控件），鼠标键盘输入，Accessibility 树。
- 代价：仅 macOS 14+；需要给 `DSH Computer Use.app` 授予“辅助功能 + 屏幕录制”；仅 PTC 预设会话可用；experimental；每次 App 访问需要用户同意。
- 适合：必须看“用户真实窗口”的验收；不适合跨平台/无人值守/轻量日常。

## 5. 方案 D：第三方浏览器插件（备选）

npm 上已有多个“安装即用”的 DSH 浏览器插件（如 `dsh-builtin-browser`：48 个 `dsh_browser_*` 工具、CDP 驱动真实 Chrome/Electron、可见窗口可接管；`dsh-native-browser`、`dsh-browser-harness` 等）。
优点是省事；缺点是第三方代码/维护信任面、部分依赖 Electron（体积大）、可能与官方 provider 槽位冲突。不建议作为本插件的内置依赖，但可作为用户自行选择的替代。

## 6. 建议方案（分阶段）

**阶段 1（推荐先落地，补上本次缺口）—— 方案 B-lite：**
1. Client 半边支持 `?panel=design-studio` 深链（顺带成为可分享的面板链接）。
2. Host 半边新增 `design_verify_ui` + `design_screenshot_html` 两个工具（headless Chrome + CDP，零新依赖）。
3. 截图以图片块返回模型 + 落盘工作区；附带溢出/对比度/主题/控制台错误等结构化检查。
4. 用这两个工具对本次插件面板做一次真实截图验收，作为证据补进 `verify/`。

**阶段 2（可选）—— 通用浏览器控制：**
把官方 `chrome-devtools-mcp` provider 做成**独立可选 bundle**（例如 `@local/dsh-browser-control`）或本 bundle 的 opt-in 配置，避免 experimental 依赖把设计插件锁死在 `0.2.2-rc.1`；同时明确它与 CUA/第三方 provider 的单槽位互斥。

**阶段 3（可选）—— 真实窗口级：**
若需要“和用户屏幕完全一致”的截图，再安装官方 CUA bundle 并授权系统权限。

## 7. 风险与边界

- **安全**：浏览器能访问任意 URL（含内网/本机）。建议默认白名单（localhost DSH GUI + 工作区设计文件）+ 每次调用审批 + 临时 profile 不持久 cookie；截图会进入 Session 历史（附件存储），敏感页面截图需用户知情。
- **真实性边界**：headless 截的是 Web GUI（浏览器表面），不是 Electron 原生窗口（窗口控件/字体渲染可能有差异）；要“所见即所得”需 CUA 或系统截屏。
- **兼容性**：官方 provider 为 experimental 且版本固定；DSH 升级需同步升级 provider，否则安装/激活可能失败。
- **成本**：provider 工具驻留会持续占用 prompt token；自研工具可条件注册规避。
- **环境依赖**：依赖本机 Chrome/Chromium；跨机器需探测常见路径并给出清晰诊断（找不到 Chrome 时提示安装或改用 CUA）。
- **鉴权**：`authenticatedUrl` 的结果是敏感 token URL，只能传给本机 headless 进程，禁止写日志/回显到聊天内容。

## 8. 待决策

1. 只补“设计工作室面板视觉验收”（方案 B-lite，零新依赖）？
2. 还是要“完整通用浏览器控制”（方案 A，官方 provider，重依赖/experimental）？
3. 两者都要：B-lite 先上，A 做成可选独立 bundle？
4. 是否需要真实窗口级截图（方案 C，需系统权限）？

选定后即可开始实现；涉及安装/重新安装 bundle 时需要你批准。
