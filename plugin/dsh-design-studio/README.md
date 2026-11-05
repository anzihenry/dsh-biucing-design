# 设计工作室 / Design studio

DeepSeek Harness 插件：在左侧栏增加一个「设计工作室」入口，中间工作区打开设计画布。
它像 Claude Design 一样把「一句话需求」变成可预览、可继续打磨、可导出的设计稿。

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

## 结构

```
dsh-design-studio/
├── package.json          # bundle 清单 + dsh.client
├── cordis.patch.yml      # 插入 design-studio 行
├── index.js              # Host 半边（仅承载 bundle 行）
├── client.js             # 构建产物：单文件 Client 模块（勿手改）
├── src/
│   ├── client.js         # Client 模块源码（含 /* @engine */ 占位）
│   ├── engine.mjs        # 设计合成引擎（模板 + 风格 token）
│   ├── test-engine.mjs   # 引擎自测
│   └── test-built.mjs    # 构建产物自测（构建一致性 / 注册 / 渲染 / 交互）
├── scripts/build-client.mjs
├── locale/{en,zh}.json   # 插件管理器标题 / 描述（meta.title / meta.description）
└── icon.svg
```

`client.js` 由源码构建生成，不要直接手改。构建规则：把 `src/engine.mjs` 的顶层 `export`
去掉后，以函数替换（而非字符串替换）的方式内联进 `src/client.js` 的 `/* @engine */` 占位，
并校验产物与源码逐字节一致。

```bash
npm run build        # 生成 client.js
npm test             # 引擎自测 + 构建产物自测
```

> `package.json` 的 `files` 只列运行时文件（发布用）；以本地目录安装时整目录会被链接，
> 因此 `src/`、`scripts/` 也会随仓库一起可用。

## 安装（本机 profile）

在 DSH 会话中通过 Plugin Manager 以本地目录安装本包（`plugin/dsh-design-studio`），
或将其加入 profile 的 bundle 列表。安装后左侧栏出现设计工作室图标，点击切换到设计画布。

## 已知限制

- 生成的文档在 `sandbox=""` 的 iframe 中渲染：脚本不会执行；导入外部 HTML 时，页面引用的
  外部图片 / 字体会被正常加载（自包含 HTML 无此问题）。
- 每次调整设计 token 都会重新生成并刷新画布文档，拖动滑杆时会有轻微闪烁。
- 设计稿内容文案由引擎生成（中英文按需求语言），不是通用大模型自由创作；复杂交互原型请把
  「复制交付说明」交给 Agent 继续实现。
- 插件管理器中的图标 / 标题属于渲染态，未在无浏览器控制的环境下截图核验。
