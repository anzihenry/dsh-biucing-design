# dsh-biucing-design

一个使用 DeepSeek Harness（dsh）进行建筑 / 设计相关工作的仓库。

## 开始

```bash
git clone git@github.com:anzihenry/dsh-biucing-design.git
cd dsh-biucing-design
```

## 目录结构

```
.
├── README.md
├── plugin/
│   └── dsh-biucing-design/  # 「设计工作室」DSH 插件（左侧栏入口 + 设计画布）
└── .gitignore
```

## 设计工作室插件

`plugin/dsh-biucing-design` 是一个 DSH bundle（包名 `dsh-biucing-design`，与仓库同名；侧边栏入口仍显示 Design Studio）：在左侧栏加入「设计工作室」入口，
中间工作区打开一个类似 Claude Design 的设计画布。

- 一句话需求 → 自包含 HTML 设计稿（落地页 / 仪表盘 / 移动 App / 定价页 / 海报 / 单页文档 / 表单），中英文需求自动匹配模板与风格；
- 画布支持桌面 / 平板 / 手机预览、缩放、明暗切换；
- 右侧设计系统面板实时改品牌色、字体、字号节奏、留白密度与圆角，并给出对比度检查；
- 6 套风格预设、快速优化、版本回滚、HTML 下载 / 复制、design tokens 与交付说明导出、外部 HTML 导入预览；
- 状态保存在浏览器 localStorage。
- **AI 生成设计（v1.5）**：面板直接调用 profile 默认模型，根据自然语言需求生成完整设计稿，
  支持继续用自然语言修改；失败自动回退模板引擎。

- **多项目 / 风格对比 / 画布批注（v1.4）**：项目切换与导入导出、3 套风格并排对比、
  按坐标定位的批注钉，以及 `design_projects` Agent↔面板项目桥；面板「已发布设计」自动列出
  Agent 发布的项目，点击即打开（只读本地路由，无需手动选文件）。
- **浏览器核验工具（v1.4）**：`design_verify_ui` / `design_screenshot_html` 用独立临时 headless Chrome
  截图并审计设计工作室面板或任意自包含设计稿，支持交互步骤、默认裁剪到面板、返回 PASS/FAIL 问题清单，
  并审计沙箱 artboard 里的设计稿；真实核验记录见 [verify/visual-verification.md](verify/visual-verification.md)。

安装与开发说明见 [plugin/dsh-biucing-design/README.md](plugin/dsh-biucing-design/README.md)。

## 许可

待定。
