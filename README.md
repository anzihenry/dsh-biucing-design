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
│   └── dsh-design-studio/   # 「设计工作室」DSH 插件（左侧栏入口 + 设计画布）
└── .gitignore
```

## 设计工作室插件

`plugin/dsh-design-studio` 是一个 DSH bundle：在左侧栏加入「设计工作室」入口，
中间工作区打开一个类似 Claude Design 的设计画布。

- 一句话需求 → 自包含 HTML 设计稿（落地页 / 仪表盘 / 移动 App / 定价页 / 海报 / 单页文档 / 表单），中英文需求自动匹配模板与风格；
- 画布支持桌面 / 平板 / 手机预览、缩放、明暗切换；
- 右侧设计系统面板实时改品牌色、字体、字号节奏、留白密度与圆角，并给出对比度检查；
- 6 套风格预设、快速优化、版本回滚、HTML 下载 / 复制、design tokens 与交付说明导出、外部 HTML 导入预览；
- 状态保存在浏览器 localStorage。
- **浏览器核验工具（v1.2）**：`design_verify_ui` / `design_screenshot_html` 用独立临时 headless Chrome
  截图并审计设计工作室面板或任意自包含设计稿，支持交互步骤、默认裁剪到面板、返回 PASS/FAIL 问题清单，
  并审计沙箱 artboard 里的设计稿；真实核验记录见 [verify/visual-verification.md](verify/visual-verification.md)。

安装与开发说明见 [plugin/dsh-design-studio/README.md](plugin/dsh-design-studio/README.md)。

## 许可

待定。
