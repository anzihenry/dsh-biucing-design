/**
 * Design Studio — Client half.
 *
 * Registers two things and nothing else:
 *   1. one `sidebar.panellist` entry whose id addresses the central panel;
 *   2. the central panel itself in the keyed `main` slot.
 *
 * The file is the Client module artifact format: a `window.__ModuleLoader__`
 * load with a lazy factory whose id equals the bundle package name. The design
 * synthesis engine is inlined at the `/* @engine *\/` marker by
 * `scripts/build-client.mjs`; edit `src/engine.mjs`, never the built file.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-design-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const PANEL_ID = 'design-studio';
    const LOCALE_NS = 'design-studio';
    const STORAGE_KEY = 'dsh-design-studio.state.v1';
    const STATE_VERSION = 2;

    /* ------------------------------------------------------------------ *
     * Design synthesis engine (inlined by scripts/build-client.mjs)
     * ------------------------------------------------------------------ */
    /* @engine */

    let engine = null;
    try {
      engine = createDesignEngine();
    } catch (error) {
      engine = null;
      // The panel still renders a readable diagnostic document instead of
      // blanking the slot when the build step did not run.
      if (typeof console !== 'undefined') console.warn('[design-studio] engine unavailable', error);
    }

    /* ------------------------------------------------------------------ *
     * Locale dictionaries (registered with the host locale service)
     * ------------------------------------------------------------------ */
    const STRINGS = {
      en: {
        'panel.title': 'Design studio',
        'panel.subtitle': 'Brief to canvas',
        'project.untitled': 'Untitled design',
        'project.namePlaceholder': 'Project name',
        'project.new': 'New project',
        'project.select': 'Project',
        'project.export': 'Export',
        'project.import': 'Import',
        'project.delete': 'Delete',
        'brief.heading': 'Brief',
        'brief.placeholder': 'Describe the design: goal, layout, content, audience. Example: a calm landing page for an API product with a hero, code sample and pricing.',
        'brief.shortcut': '⌘/Ctrl + Enter to generate',
        'brief.generate': 'Generate design',
        'brief.generateAi': 'Generate with AI',
        'brief.generating': 'Generating design…',
        'brief.generatingHint': 'AI is composing a complete design (about 30–90s).',
        'brief.aiUnavailable': 'AI unavailable · template mode',
        'brief.aiMode': 'AI',
        'ai.refineHeading': 'Refine with AI',
        'ai.refinePlaceholder': 'e.g. Make the hero headline larger and switch the accent to teal',
        'ai.refine': 'Apply with AI',
        'ai.refining': 'Revising…',
        'ai.refinedLabel': 'AI revision',
        'toast.aiGenerated': 'AI design generated',
        'toast.aiRefined': 'AI revision applied',
        'toast.aiFailed': 'AI generation failed',
        'toast.aiFallback': 'AI failed — used the template engine instead',
        'toast.aiTruncated': 'AI output was truncated; refine or retry',
        'brief.examplesHeading': 'Try one',
        'ex.landing': 'A calm landing page for an API product with a hero, code sample and pricing',
        'ex.dashboard': 'A revenue dashboard with KPI cards, a monthly chart and a region filter',
        'ex.mobile': 'A four-screen onboarding flow for a habit tracking app',
        'ex.pricing': 'A pricing page with three tiers, a yearly toggle and an FAQ',
        'template.heading': 'Template',
        'style.heading': 'Style',
        'refine.heading': 'Refine',
        'refine.simpler': 'Simpler',
        'refine.premium': 'More refined',
        'refine.playful': 'Playful',
        'refine.dark': 'Dark mode',
        'refine.light': 'Light mode',
        'refine.airy': 'Airier',
        'refine.tight': 'Tighter',
        'refine.rounder': 'Rounder',
        'refine.squarer': 'Squarer',
        'history.heading': 'Versions',
        'history.empty': 'Generated versions appear here.',
        'canvas.importedTitle': 'Imported HTML',
        'canvas.importedBadge': 'imported',
        'canvas.aiBadge': 'AI',
        'canvas.sampleBadge': 'sample',
        'canvas.frameTitle': 'Design preview',
        'device.group': 'Canvas size',
        'device.desktop': 'Desktop',
        'device.tablet': 'Tablet',
        'device.mobile': 'Mobile',
        'toolbar.zoomOut': 'Zoom out',
        'toolbar.zoomIn': 'Zoom in',
        'toolbar.fit': 'Fit to width',
        'toolbar.mode': 'Toggle light / dark',
        'toolbar.export': 'Export HTML',
        'toolbar.import': 'Import HTML',
        'toolbar.compare': 'Compare styles',
        'toolbar.comment': 'Comment mode',
        'compare.current': 'current',
        'comments.heading': 'Comments',
        'comments.empty': 'Turn on comment mode, then click a spot on the artboard to add a note.',
        'comments.add': 'Add note',
        'comments.delete': 'Delete',
        'comments.close': 'Close',
        'comments.cancel': 'Cancel',
        'comments.placeholder': 'Describe the change for this spot…',
        'toast.commentAdded': 'Comment added',
        'toast.commentDeleted': 'Comment deleted',
        'inspector.heading': 'Design system',
        'inspector.style': 'Current style',
        'inspector.reset': 'Reset to style',
        'inspector.colors': 'Colors',
        'inspector.accent': 'Accent',
        'inspector.bg': 'Background',
        'inspector.surface': 'Surface',
        'inspector.text': 'Text',
        'inspector.typography': 'Typography',
        'inspector.displayFont': 'Headings',
        'inspector.bodyFont': 'Body',
        'inspector.scale': 'Type scale',
        'inspector.density': 'Density',
        'inspector.radius': 'Corner radius',
        'inspector.contrast': 'Contrast',
        'inspector.textContrast': 'Text on background',
        'inspector.accentContrast': 'Label on accent',
        'inspector.aaPass': 'AA',
        'inspector.aaFail': 'Low',
        'scale.compact': 'Compact',
        'scale.regular': 'Regular',
        'scale.airy': 'Airy',
        'density.compact': 'Compact',
        'density.regular': 'Regular',
        'density.airy': 'Airy',
        'font.sans': 'Sans',
        'font.serif': 'Serif',
        'font.rounded': 'Rounded',
        'font.mono': 'Mono',
        'font.styleDefault': 'Style default',
        'export.heading': 'Export & handoff',
        'export.download': 'Download HTML',
        'export.copyHtml': 'Copy HTML',
        'export.copyTokens': 'Copy tokens',
        'export.copyHandoff': 'Copy handoff brief',
        'export.import': 'Import HTML',
        'export.preview': 'Open preview',
        'export.print': 'Print / PDF',
        'export.tokens': 'Import tokens',
        'tokens.title': 'Import design tokens',
        'tokens.hint': 'Paste a tokens JSON object (or CSS custom properties) to apply it to the current design. Example: {"accent":"#7c5cff","radius":12}.',
        'tokens.apply': 'Apply tokens',
        'tokens.cancel': 'Cancel',
        'toast.tokensImported': 'Tokens applied',
        'toast.tokensInvalid': 'Could not parse tokens',
        'toast.popupBlocked': 'The browser blocked the preview window',
        'drawer.toggle': 'Show brief',
        'import.title': 'Import HTML',
        'import.hint': 'Paste a self-contained HTML document to preview it on the canvas. Scripts stay disabled inside the sandbox; external images or fonts the document references may still load.',
        'import.apply': 'Show on canvas',
        'import.cancel': 'Cancel',
        'import.restore': 'Back to generated',
        'about.note': 'State is stored in this browser. Generated designs are self-contained HTML.',
        'toast.needBrief': 'Write a brief first',
        'toast.generated': 'Design generated',
        'toast.copied': 'Copied',
        'toast.downloaded': 'HTML downloaded',
        'toast.failed': 'Action failed',
        'toast.imported': 'Imported HTML shown',
        'toast.reset': 'New project',
        'toast.projectDeleted': 'Project deleted',
        'toast.projectImported': 'Project imported',
        'toast.projectImportFailed': 'Could not import that project file',
        'toast.projectExported': 'Project exported',
        'published.heading': 'Published designs',
        'published.refresh': 'Refresh',
        'published.empty': 'No published projects yet. Ask the agent to publish one with design_projects.',
        'published.error': 'The project library is unavailable right now.',
        'published.loading': 'Loading…',
        'toast.engineMissing': 'Design engine is unavailable',
        'engine.missing': 'The design engine could not be loaded. Run the build step: node scripts/build-client.mjs.',
      },
      zh: {
        'panel.title': '设计工作室',
        'panel.subtitle': '需求直达画布',
        'project.untitled': '未命名设计',
        'project.namePlaceholder': '项目名称',
        'project.new': '新建项目',
        'project.select': '项目',
        'project.export': '导出',
        'project.import': '导入',
        'project.delete': '删除',
        'brief.heading': '需求描述',
        'brief.placeholder': '描述你想要的设计：目标、布局、内容、受众。例如：一个面向 API 产品的克制落地页，包含首屏、代码示例与定价。',
        'brief.shortcut': '⌘/Ctrl + Enter 生成',
        'brief.generate': '生成设计',
        'brief.generateAi': 'AI 生成设计',
        'brief.generating': '正在生成设计…',
        'brief.generatingHint': 'AI 正在生成完整设计（约 30–90 秒）。',
        'brief.aiUnavailable': 'AI 不可用 · 模板模式',
        'brief.aiMode': 'AI',
        'ai.refineHeading': '用 AI 继续修改',
        'ai.refinePlaceholder': '例如：把首屏标题放大，并把品牌色换成青绿色',
        'ai.refine': '用 AI 应用修改',
        'ai.refining': '正在修改…',
        'ai.refinedLabel': 'AI 修改',
        'toast.aiGenerated': 'AI 设计已生成',
        'toast.aiRefined': 'AI 修改已应用',
        'toast.aiFailed': 'AI 生成失败',
        'toast.aiFallback': 'AI 失败，已改用模板引擎',
        'toast.aiTruncated': 'AI 输出被截断，可继续修改或重试',
        'brief.examplesHeading': '试试这些',
        'ex.landing': '一个面向 API 产品的克制落地页，包含首屏、代码示例与定价',
        'ex.dashboard': '一个营收仪表盘，包含 KPI 卡片、月度图表与区域筛选',
        'ex.mobile': '一个习惯打卡 App 的四屏引导流程',
        'ex.pricing': '一个三档定价页，包含年付切换与常见问题',
        'template.heading': '模板',
        'style.heading': '风格',
        'refine.heading': '快速优化',
        'refine.simpler': '更简洁',
        'refine.premium': '更高级',
        'refine.playful': '更活泼',
        'refine.dark': '深色模式',
        'refine.light': '浅色模式',
        'refine.airy': '更疏朗',
        'refine.tight': '更紧凑',
        'refine.rounder': '更圆润',
        'refine.squarer': '更方正',
        'history.heading': '版本',
        'history.empty': '生成的版本会出现在这里。',
        'canvas.importedTitle': '导入的 HTML',
        'canvas.importedBadge': '导入',
        'canvas.aiBadge': 'AI',
        'canvas.sampleBadge': '示例',
        'canvas.frameTitle': '设计预览',
        'device.group': '画布尺寸',
        'device.desktop': '桌面',
        'device.tablet': '平板',
        'device.mobile': '手机',
        'toolbar.zoomOut': '缩小',
        'toolbar.zoomIn': '放大',
        'toolbar.fit': '适应宽度',
        'toolbar.mode': '切换明暗',
        'toolbar.export': '导出 HTML',
        'toolbar.import': '导入 HTML',
        'toolbar.compare': '对比风格',
        'toolbar.comment': '批注模式',
        'compare.current': '当前',
        'comments.heading': '批注',
        'comments.empty': '打开批注模式，点击画板上的位置添加说明。',
        'comments.add': '添加批注',
        'comments.delete': '删除',
        'comments.close': '关闭',
        'comments.cancel': '取消',
        'comments.placeholder': '描述这个位置需要怎么改…',
        'toast.commentAdded': '已添加批注',
        'toast.commentDeleted': '已删除批注',
        'inspector.heading': '设计系统',
        'inspector.style': '当前风格',
        'inspector.reset': '恢复风格预设',
        'inspector.colors': '颜色',
        'inspector.accent': '品牌色',
        'inspector.bg': '背景',
        'inspector.surface': '表面',
        'inspector.text': '文字',
        'inspector.typography': '字体',
        'inspector.displayFont': '标题',
        'inspector.bodyFont': '正文',
        'inspector.scale': '字号节奏',
        'inspector.density': '留白密度',
        'inspector.radius': '圆角',
        'inspector.contrast': '对比度',
        'inspector.textContrast': '文字 / 背景',
        'inspector.accentContrast': '按钮文字 / 品牌色',
        'inspector.aaPass': 'AA',
        'inspector.aaFail': '偏低',
        'scale.compact': '紧凑',
        'scale.regular': '标准',
        'scale.airy': '宽松',
        'density.compact': '紧凑',
        'density.regular': '标准',
        'density.airy': '宽松',
        'font.sans': '无衬线',
        'font.serif': '衬线',
        'font.rounded': '圆体',
        'font.mono': '等宽',
        'font.styleDefault': '风格默认',
        'export.heading': '导出与交付',
        'export.download': '下载 HTML',
        'export.copyHtml': '复制 HTML',
        'export.copyTokens': '复制 tokens',
        'export.copyHandoff': '复制交付说明',
        'export.import': '导入 HTML',
        'export.preview': '在新标签预览',
        'export.print': '打印 / PDF',
        'export.tokens': '导入 tokens',
        'tokens.title': '导入设计 tokens',
        'tokens.hint': '粘贴 tokens JSON（或 CSS 自定义属性）应用到当前设计。例如：{"accent":"#7c5cff","radius":12}。',
        'tokens.apply': '应用 tokens',
        'tokens.cancel': '取消',
        'toast.tokensImported': '已应用 tokens',
        'toast.tokensInvalid': '无法解析 tokens',
        'toast.popupBlocked': '浏览器拦截了预览窗口',
        'drawer.toggle': '显示需求栏',
        'import.title': '导入 HTML',
        'import.hint': '粘贴一个自包含的 HTML 文档即可在画布预览。沙箱内不会执行脚本；文档引用的外部图片或字体会被加载。',
        'import.apply': '在画布中显示',
        'import.cancel': '取消',
        'import.restore': '回到生成结果',
        'about.note': '状态保存在当前浏览器；生成结果为自包含 HTML。',
        'toast.needBrief': '先写一句需求',
        'toast.generated': '已生成设计',
        'toast.copied': '已复制',
        'toast.downloaded': 'HTML 已下载',
        'toast.failed': '操作失败',
        'toast.imported': '已显示导入的 HTML',
        'toast.reset': '已新建项目',
        'toast.projectDeleted': '项目已删除',
        'toast.projectImported': '项目已导入',
        'toast.projectImportFailed': '无法导入该项目文件',
        'toast.projectExported': '项目已导出',
        'published.heading': '已发布设计',
        'published.refresh': '刷新',
        'published.empty': '还没有已发布的项目。可以让 Agent 用 design_projects 发布一个。',
        'published.error': '项目库暂时不可用。',
        'published.loading': '加载中…',
        'toast.engineMissing': '设计引擎不可用',
        'engine.missing': '设计引擎未能加载。请执行构建：node scripts/build-client.mjs。',
      },
    };

    /* ------------------------------------------------------------------ *
     * Small utilities
     * ------------------------------------------------------------------ */
    const HEX_FIELDS = ['accent', 'accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border'];
    const SCALES = ['compact', 'regular', 'airy'];

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function escapeText(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
      ));
    }

    function parseColor(input) {
      if (typeof input !== 'string') return null;
      let value = input.trim().toLowerCase();
      if (/^#[0-9a-f]{3}$/.test(value)) {
        value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
      }
      return /^#[0-9a-f]{6}$/.test(value) ? value : null;
    }

    function colorChannels(hex) {
      const value = parseColor(hex) || '#000000';
      return {
        r: parseInt(value.slice(1, 3), 16),
        g: parseInt(value.slice(3, 5), 16),
        b: parseInt(value.slice(5, 7), 16),
      };
    }

    function rgbToHex(rgb) {
      const part = (number) => clamp(Math.round(number), 0, 255).toString(16).padStart(2, '0');
      return '#' + part(rgb.r) + part(rgb.g) + part(rgb.b);
    }

    function mix(from, to, amount) {
      const a = colorChannels(from);
      const b = colorChannels(to);
      const t = clamp(Number(amount) || 0, 0, 1);
      return rgbToHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
    }

    function relativeLuminance(hex) {
      const { r, g, b } = colorChannels(hex);
      const channel = (value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    function contrastRatio(first, second) {
      const a = relativeLuminance(first);
      const b = relativeLuminance(second);
      const lighter = Math.max(a, b);
      const darker = Math.min(a, b);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function readableOn(background) {
      return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#14161c') ? '#ffffff' : '#14161c';
    }

    function slug(value) {
      const cleaned = String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '')
        .slice(0, 48);
      return cleaned || 'design';
    }

    function uniqueId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function formatTime(timestamp) {
      try {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (error) {
        return '';
      }
    }

    /* ------------------------------------------------------------------ *
     * Token helpers
     * ------------------------------------------------------------------ */
    const LIGHT_NEUTRALS = { bg: '#ffffff', surface: '#f6f7f9', surfaceAlt: '#eef0f4', text: '#12151c', muted: '#5b6270', border: '#e2e5ec' };
    const DARK_NEUTRALS = { bg: '#0b0e14', surface: '#141821', surfaceAlt: '#1b202b', text: '#f3f5f9', muted: '#9aa3b2', border: '#252b38' };

    function baseTokens() {
      if (engine) return engine.baseTokens();
      return Object.assign({ mode: 'light', accent: '#4a5cf5', accentText: '#ffffff', fontDisplay: 'sans-serif', fontBody: 'sans-serif', radius: 12, density: 'regular', scale: 'regular' }, LIGHT_NEUTRALS);
    }

    function ensureTokens(raw) {
      const base = baseTokens();
      const tokens = Object.assign({}, base, raw || {});
      tokens.mode = tokens.mode === 'dark' ? 'dark' : 'light';
      HEX_FIELDS.forEach((field) => {
        tokens[field] = parseColor(tokens[field]) || base[field];
      });
      tokens.radius = clamp(Number(tokens.radius) || 0, 0, 28);
      tokens.density = SCALES.indexOf(tokens.density) === -1 ? 'regular' : tokens.density;
      tokens.scale = SCALES.indexOf(tokens.scale) === -1 ? 'regular' : tokens.scale;
      tokens.fontDisplay = String(tokens.fontDisplay || base.fontDisplay);
      tokens.fontBody = String(tokens.fontBody || base.fontBody);
      return tokens;
    }

    function withDerived(tokens) {
      const next = Object.assign({}, tokens);
      next.muted = mix(next.text, next.bg, 0.45);
      next.border = mix(next.text, next.bg, 0.84);
      next.accentText = readableOn(next.accent);
      return next;
    }

    function tuneMode(tokens, mode) {
      if (tokens.mode === mode) return tokens;
      const neutrals = mode === 'dark' ? DARK_NEUTRALS : LIGHT_NEUTRALS;
      return withDerived(Object.assign({}, tokens, neutrals, { mode: mode }));
    }

    const REFINE_ACTIONS = [
      { id: 'simpler', labelKey: 'refine.simpler', run: (tokens) => Object.assign({}, tokens, { density: 'compact', scale: 'compact', radius: Math.min(tokens.radius, 10) }) },
      { id: 'premium', labelKey: 'refine.premium', run: (tokens) => Object.assign({}, tokens, { density: 'airy', scale: 'airy', radius: Math.max(tokens.radius, 16) }) },
      { id: 'playful', labelKey: 'refine.playful', run: (tokens) => Object.assign({}, tokens, { radius: Math.min(28, Math.max(tokens.radius, 22)), accent: mix(tokens.accent, '#ff5fa2', 0.35) }) },
      { id: 'dark', labelKey: 'refine.dark', run: (tokens) => tuneMode(tokens, 'dark') },
      { id: 'light', labelKey: 'refine.light', run: (tokens) => tuneMode(tokens, 'light') },
      { id: 'airy', labelKey: 'refine.airy', run: (tokens) => Object.assign({}, tokens, { density: 'airy', scale: 'airy' }) },
      { id: 'tight', labelKey: 'refine.tight', run: (tokens) => Object.assign({}, tokens, { density: 'compact', scale: 'compact' }) },
      { id: 'rounder', labelKey: 'refine.rounder', run: (tokens) => Object.assign({}, tokens, { radius: Math.min(28, tokens.radius + 6) }) },
      { id: 'squarer', labelKey: 'refine.squarer', run: (tokens) => Object.assign({}, tokens, { radius: Math.max(0, tokens.radius - 6) }) },
    ];

    const FONT_CHOICES = [
      { id: 'sans', labelKey: 'font.sans', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif" },
      { id: 'serif', labelKey: 'font.serif', stack: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Songti SC', 'Noto Serif CJK SC', Georgia, serif" },
      { id: 'rounded', labelKey: 'font.rounded', stack: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, 'PingFang SC', system-ui, sans-serif" },
      { id: 'mono', labelKey: 'font.mono', stack: "ui-monospace, SFMono-Regular, Menlo, 'Cascadia Mono', 'Roboto Mono', monospace" },
    ];

    const DEVICES = [
      { id: 'desktop', width: 1280, height: 900, labelKey: 'device.desktop' },
      { id: 'tablet', width: 834, height: 1000, labelKey: 'device.tablet' },
      { id: 'mobile', width: 390, height: 820, labelKey: 'device.mobile' },
    ];

    /* ------------------------------------------------------------------ *
     * State, persistence, and derived data
     * ------------------------------------------------------------------ */
    function initialTemplateId() {
      return engine && engine.templates.length ? engine.templates[0].id : 'landing';
    }

    function defaultStyle() {
      return engine && engine.styles.length ? engine.styles[0] : null;
    }

    let projectSeed = 0;
    function newProjectId() {
      projectSeed += 1;
      return 'p' + Date.now().toString(36) + projectSeed.toString(36);
    }

    function createProjectData(overrides) {
      const style = defaultStyle();
      return Object.assign({
        id: newProjectId(),
        projectName: '',
        brief: '',
        draftBrief: '',
        template: initialTemplateId(),
        styleId: style ? style.id : 'minimal',
        tokens: ensureTokens(style ? style.tokens : null),
        history: [],
        importedHtml: '',
        importedTitle: '',
        artifactSource: 'engine',
        comments: [],
      }, overrides || {});
    }

    /** The active project as a detached record (for the project map). */
    function pickProjectData(state) {
      return {
        id: state.activeProjectId,
        projectName: state.projectName,
        brief: state.brief,
        draftBrief: state.draftBrief,
        template: state.template,
        styleId: state.styleId,
        tokens: state.tokens,
        history: state.history,
        importedHtml: state.importedHtml,
        importedTitle: state.importedTitle,
        artifactSource: state.artifactSource,
        comments: state.comments,
      };
    }

    function sanitizeHistoryEntry(entry) {
      if (!entry || typeof entry !== 'object') return null;
      return {
        id: String(entry.id || Date.now()),
        at: Number(entry.at) || Date.now(),
        label: String(entry.label || ''),
        brief: typeof entry.brief === 'string' ? entry.brief : '',
        template: engine && engine.templates.some((item) => item.id === entry.template) ? entry.template : initialTemplateId(),
        styleId: engine && engine.styles.some((item) => item.id === entry.styleId) ? entry.styleId : (defaultStyle() ? defaultStyle().id : 'minimal'),
        tokens: ensureTokens(entry.tokens),
        artifactSource: ['engine', 'ai', 'import'].indexOf(entry.artifactSource) === -1 ? 'engine' : entry.artifactSource,
        externalHtml: typeof entry.externalHtml === 'string' ? entry.externalHtml.slice(0, 200000) : '',
        externalTitle: typeof entry.externalTitle === 'string' ? entry.externalTitle : '',
      };
    }

    function sanitizeComments(list) {
      if (!Array.isArray(list)) return [];
      return list.slice(0, 120).map((comment, index) => {
        if (!comment || typeof comment !== 'object') return null;
        return {
          id: String(comment.id || 'c' + index),
          x: clamp(Number(comment.x) || 0, 0, 100),
          y: clamp(Number(comment.y) || 0, 0, 100),
          text: String(comment.text || '').slice(0, 500),
          at: Number(comment.at) || Date.now(),
        };
      }).filter(Boolean);
    }

    function sanitizeProjectData(raw) {
      const fallback = createProjectData();
      if (!raw || typeof raw !== 'object') return fallback;
      const history = Array.isArray(raw.history)
        ? raw.history.map(sanitizeHistoryEntry).filter(Boolean).slice(0, 12)
        : [];
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : fallback.id,
        projectName: typeof raw.projectName === 'string' ? raw.projectName : '',
        brief: typeof raw.brief === 'string' ? raw.brief : '',
        draftBrief: typeof raw.draftBrief === 'string' ? raw.draftBrief : (typeof raw.brief === 'string' ? raw.brief : ''),
        template: engine && engine.templates.some((item) => item.id === raw.template) ? raw.template : fallback.template,
        styleId: engine && engine.styles.some((item) => item.id === raw.styleId) ? raw.styleId : fallback.styleId,
        tokens: ensureTokens(raw.tokens),
        history: history,
        importedHtml: typeof raw.importedHtml === 'string' ? raw.importedHtml : '',
        importedTitle: typeof raw.importedTitle === 'string' ? raw.importedTitle : '',
        artifactSource: ['engine', 'ai', 'import'].indexOf(raw.artifactSource) === -1 ? 'engine' : raw.artifactSource,
        comments: sanitizeComments(raw.comments),
      };
    }

    function createInitialState() {
      const project = createProjectData();
      return Object.assign({ version: STATE_VERSION, activeProjectId: project.id, projectOrder: [project.id], projects: {} }, project, {
        device: 'desktop',
        zoom: 0.72,
      });
    }

    function readSavedState() {
      let saved = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (error) {
        saved = null;
      }
      if (!saved || typeof saved !== 'object') return null;
      return saved;
    }

    function writeSavedState(state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        /* Storage full or unavailable: the panel keeps working in memory. */
      }
    }

    function loadState() {
      const fallback = createInitialState();
      const saved = readSavedState();
      if (!saved) return fallback;
      try {
        const legacy = saved.version !== STATE_VERSION;
        const active = sanitizeProjectData(legacy ? Object.assign({}, saved, { id: newProjectId() }) : saved);
        const projects = {};
        const order = [active.id];
        if (saved.projects && typeof saved.projects === 'object') {
          for (const key of Object.keys(saved.projects)) {
            if (!key || key === active.id || order.length >= 12) continue;
            const project = sanitizeProjectData(Object.assign({}, saved.projects[key], { id: key }));
            projects[project.id] = project;
            order.push(project.id);
          }
        }
        return Object.assign({}, active, {
          version: STATE_VERSION,
          activeProjectId: active.id,
          projects: projects,
          projectOrder: order,
          device: DEVICES.some((item) => item.id === saved.device) ? saved.device : fallback.device,
          zoom: clamp(Number(saved.zoom) || fallback.zoom, 0.25, 2),
        });
      } catch (error) {
        return fallback;
      }
    }

    function fallbackDocument(message) {
      return [
        '<!doctype html><html><head><meta charset="utf-8">',
        '<style>html,body{height:100%}body{margin:0;display:flex;align-items:center;justify-content:center;',
        "background:#f5f6f8;color:#2a2f3a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
        'main{max-width:520px;padding:32px;text-align:center;line-height:1.6}h1{font-size:18px;margin:0 0 12px}',
        'p{margin:0;font-size:13px}</style></head><body><main><h1>Design Studio</h1><p>',
        escapeText(message),
        '</p></main></body></html>',
      ].join('');
    }

    function createDesignPanel(ctx, t) {
      return function DesignPanel() {
        const [state, setState] = useState(loadState);
        const [activeLocale, setActiveLocale] = useState(() => {
          try {
            return ctx.locale.getLocale().active;
          } catch (error) {
            return 'en';
          }
        });
        const [toast, setToast] = useState(null);
        const [dialog, setDialog] = useState(null);
        const [importDraft, setImportDraft] = useState('');
        const [tokenDraft, setTokenDraft] = useState('');
        const [composerOpen, setComposerOpen] = useState(false);
        const [commentMode, setCommentMode] = useState(false);
        const [commentDraft, setCommentDraft] = useState(null);
        const [compareMode, setCompareMode] = useState(false);
        const [aiInfo, setAiInfo] = useState({ available: false });
        const [aiBusy, setAiBusy] = useState(false);
        const [aiError, setAiError] = useState(null);
        const [aiRefineDraft, setAiRefineDraft] = useState('');
        const [canvasWidth, setCanvasWidth] = useState(0);
        const [renderTokens, setRenderTokens] = useState(state.tokens);
        const dialogReturnFocus = useRef(null);
        const toastTimer = useRef(null);
        const canvasRef = useRef(null);
        const importFileRef = useRef(null);
        const [publishedProjects, setPublishedProjects] = useState([]);
        const [publishedError, setPublishedError] = useState(null);
        const [publishedLoading, setPublishedLoading] = useState(false);
        const stateRef = useRef(state);
        stateRef.current = state;

        const lang = String(activeLocale || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';

        useEffect(() => {
          try {
            return ctx.locale.subscribe(() => {
              try {
                setActiveLocale(ctx.locale.getLocale().active);
              } catch (error) {
                /* keep the previous locale */
              }
            });
          } catch (error) {
            return undefined;
          }
        }, []);

        useEffect(() => {
          const timer = setTimeout(() => writeSavedState(state), 240);
          return () => clearTimeout(timer);
        }, [state]);

        useEffect(() => () => {
          if (toastTimer.current) clearTimeout(toastTimer.current);
          writeSavedState(stateRef.current);
        }, []);

        useEffect(() => {
          const element = canvasRef.current;
          if (!element || typeof ResizeObserver === 'undefined') return undefined;
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setCanvasWidth(entry.contentRect.width);
          });
          observer.observe(element);
          return () => observer.disconnect();
        }, []);

        useEffect(() => {
          let cancelled = false;
          if (typeof fetch !== 'function') {
            setAiInfo({ available: false });
            return () => { cancelled = true; };
          }
          fetch('/design-studio/generate', { headers: { accept: 'application/json' }, cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
            .then((info) => {
              if (cancelled) return;
              setAiInfo({
                available: Boolean(info && info.available),
                provider: info && info.provider,
                model: info && info.model,
                reason: info && info.reason,
              });
            })
            .catch(() => {
              if (!cancelled) setAiInfo({ available: false });
            });
          return () => { cancelled = true; };
        }, []);

        useEffect(() => {
          if (!dialog) return undefined;
          const previous = dialogReturnFocus.current;
          const onKeyDown = (event) => {
            if (event.key === 'Escape') setDialog(null);
          };
          document.addEventListener('keydown', onKeyDown);
          return () => {
            document.removeEventListener('keydown', onKeyDown);
            try {
              if (previous && typeof previous.focus === 'function') previous.focus();
            } catch (error) {
              /* the opener may have unmounted */
            }
          };
        }, [dialog]);

        // Debounce the iframe document refresh so dragging a token slider does
        // not reload the artboard on every input event.
        useEffect(() => {
          const timer = setTimeout(() => setRenderTokens(state.tokens), 90);
          return () => clearTimeout(timer);
        }, [state.tokens]);

        const notify = useCallback((message) => {
          setToast(message);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 2400);
        }, []);

        const patch = useCallback((partial) => {
          setState((previous) => Object.assign({}, previous, typeof partial === 'function' ? partial(previous) : partial));
        }, []);

        const labelOf = useCallback((item) => {
          if (!item) return '';
          if (item.label) return item.label[lang] || item.label.en || '';
          return '';
        }, [lang]);

        const templateLabel = useCallback((templateId) => {
          const item = engine ? engine.templates.find((candidate) => candidate.id === templateId) : null;
          return labelOf(item) || templateId;
        }, [labelOf]);

        const styleLabel = useCallback((styleId) => {
          const item = engine ? engine.styles.find((candidate) => candidate.id === styleId) : null;
          return labelOf(item) || styleId;
        }, [labelOf]);

        const device = DEVICES.find((item) => item.id === state.device) || DEVICES[0];

        useEffect(() => {
          if (!canvasWidth) return;
          if (Math.abs(state.zoom - 0.72) > 0.001) return;
          const available = canvasWidth - 8;
          if (available <= 0) return;
          const next = clamp(available / device.width, 0.25, 1);
          const rounded = Math.round(next * 100) / 100;
          if (Math.abs(rounded - state.zoom) < 0.001) return;
          setState((previous) => Object.assign({}, previous, { zoom: rounded }));
        }, [canvasWidth, device.width, state.zoom]);


        const artifact = useMemo(() => {
          if (state.importedHtml) {
            return { title: state.importedTitle || t('canvas.importedTitle'), html: state.importedHtml, imported: true };
          }
          if (!engine) {
            return { title: t('panel.title'), html: fallbackDocument(t('engine.missing')), imported: false };
          }
          try {
            const output = engine.generate({ brief: state.brief, template: state.template, tokens: renderTokens });
            return { title: output.title || t('project.untitled'), html: output.html, imported: false };
          } catch (error) {
            const message = error && error.message ? error.message : String(error);
            return { title: t('panel.title'), html: fallbackDocument(message), imported: false };
          }
        }, [state.brief, state.template, renderTokens, state.importedHtml, state.importedTitle, t]);

        const generateFrom = useCallback((rawBrief) => {
          const brief = String(rawBrief == null ? '' : rawBrief).trim();
          if (!brief) {
            notify(t('toast.needBrief'));
            return;
          }
          if (!engine) {
            notify(t('toast.engineMissing'));
            return;
          }
          let analysis = null;
          try {
            analysis = engine.analyze(brief);
          } catch (error) {
            analysis = null;
          }
          const safeAnalysis = analysis && typeof analysis === 'object' ? analysis : {};
          setState((previous) => {
            const template = engine.templates.some((item) => item.id === safeAnalysis.template)
              ? safeAnalysis.template
              : previous.template;
            const style = engine.styles.find((item) => item.id === safeAnalysis.styleId)
              || engine.styles.find((item) => item.id === previous.styleId)
              || defaultStyle();
            const tokens = ensureTokens(style ? style.tokens : previous.tokens);
            const entry = {
              id: uniqueId(),
              at: Date.now(),
              label: String(safeAnalysis.title || templateLabel(template) || ''),
              brief: brief,
              template: template,
              styleId: style ? style.id : previous.styleId,
              tokens: tokens,
              artifactSource: 'engine',
              externalHtml: '',
              externalTitle: '',
            };
            return Object.assign({}, previous, {
              brief: brief,
              draftBrief: brief,
              template: template,
              styleId: style ? style.id : previous.styleId,
              tokens: tokens,
              history: [entry].concat(previous.history).slice(0, 12),
              importedHtml: '',
              importedTitle: '',
              artifactSource: 'engine',
            });
          });
          notify(t('toast.generated'));
        }, [notify, t, templateLabel]);

        const applyAiPayload = useCallback((payload, brief) => {
          if (!payload || typeof payload.html !== 'string' || !payload.html) throw new Error('The model returned no HTML.');
          const title = String(payload.title || brief.slice(0, 60) || t('project.untitled')).trim();
          setState((previous) => {
            const tokens = payload.tokens
              ? withDerived(ensureTokens(Object.assign({}, previous.tokens, payload.tokens)))
              : previous.tokens;
            const entry = {
              id: uniqueId(),
              at: Date.now(),
              label: title,
              brief: brief,
              template: previous.template,
              styleId: previous.styleId,
              tokens: tokens,
              artifactSource: 'ai',
              externalHtml: payload.html.slice(0, 200000),
              externalTitle: title,
            };
            return Object.assign({}, previous, {
              brief: brief,
              draftBrief: brief,
              tokens: tokens,
              projectName: previous.projectName || title,
              importedHtml: payload.html,
              importedTitle: title,
              artifactSource: 'ai',
              history: [entry].concat(previous.history).slice(0, 12),
            });
          });
        }, [t]);

        const generateWithAi = useCallback(async (rawBrief) => {
          const brief = String(rawBrief == null ? '' : rawBrief).trim();
          if (!brief) {
            notify(t('toast.needBrief'));
            return;
          }
          if (aiBusy) return;
          setAiBusy(true);
          setAiError(null);
          try {
            const response = await fetch('/design-studio/generate', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                brief: brief,
                template: state.template,
                styleId: state.styleId,
                tokens: state.tokens,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload || !payload.ok) {
              throw new Error((payload && payload.error) || ('HTTP ' + response.status));
            }
            applyAiPayload(payload, brief);
            notify(payload.truncated ? t('toast.aiTruncated') : t('toast.aiGenerated'));
          } catch (error) {
            setAiError(String((error && error.message) || error));
            generateFrom(brief);
            notify(t('toast.aiFallback'));
          } finally {
            setAiBusy(false);
          }
        }, [aiBusy, applyAiPayload, generateFrom, notify, state.styleId, state.template, state.tokens, t]);

        const refineWithAi = useCallback(async () => {
          const instruction = aiRefineDraft.trim();
          if (!instruction || aiBusy) return;
          setAiBusy(true);
          setAiError(null);
          try {
            const response = await fetch('/design-studio/generate', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                brief: state.brief || state.draftBrief,
                html: artifact.html,
                instruction: instruction,
                template: state.template,
                styleId: state.styleId,
                tokens: state.tokens,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload || !payload.ok) {
              throw new Error((payload && payload.error) || ('HTTP ' + response.status));
            }
            applyAiPayload(payload, state.brief || state.draftBrief);
            setAiRefineDraft('');
            notify(payload.truncated ? t('toast.aiTruncated') : t('toast.aiRefined'));
          } catch (error) {
            setAiError(String((error && error.message) || error));
            notify(t('toast.aiFailed'));
          } finally {
            setAiBusy(false);
          }
        }, [aiBusy, aiRefineDraft, applyAiPayload, artifact, notify, state.brief, state.draftBrief, state.styleId, state.template, state.tokens, t]);

        const handleGenerate = useCallback(() => {
          if (aiBusy) return;
          if (aiInfo.available) {
            generateWithAi(state.draftBrief);
            return;
          }
          generateFrom(state.draftBrief);
        }, [aiBusy, aiInfo.available, generateFrom, generateWithAi, state.draftBrief]);

        const switchProject = useCallback((id) => {
          setState((previous) => {
            if (!id || id === previous.activeProjectId || !previous.projects[id]) return previous;
            const saved = Object.assign({}, previous.projects);
            saved[previous.activeProjectId] = pickProjectData(previous);
            const target = saved[id];
            delete saved[id];
            return Object.assign({}, previous, target, { projects: saved, activeProjectId: id });
          });
        }, []);

        const createProject = useCallback(() => {
          setState((previous) => {
            const saved = Object.assign({}, previous.projects);
            saved[previous.activeProjectId] = pickProjectData(previous);
            const fresh = createProjectData();
            const order = [fresh.id].concat(previous.projectOrder.filter((id) => id !== fresh.id)).slice(0, 12);
            const pruned = {};
            for (const id of order) {
              if (id !== fresh.id && saved[id]) pruned[id] = saved[id];
            }
            return Object.assign({}, previous, fresh, { projects: pruned, activeProjectId: fresh.id, projectOrder: order });
          });
          setComposerOpen(false);
          notify(t('toast.reset'));
        }, [notify, t]);

        const deleteProject = useCallback(() => {
          setState((previous) => {
            const order = previous.projectOrder.filter((id) => id !== previous.activeProjectId);
            if (!order.length) {
              const fresh = createProjectData();
              return Object.assign({}, previous, fresh, { projects: {}, activeProjectId: fresh.id, projectOrder: [fresh.id] });
            }
            const projects = Object.assign({}, previous.projects);
            const nextId = order[0];
            const target = projects[nextId] || createProjectData({ id: nextId });
            delete projects[nextId];
            return Object.assign({}, previous, target, { projects: projects, activeProjectId: nextId, projectOrder: order });
          });
          notify(t('toast.projectDeleted'));
        }, [notify, t]);

        const exportProject = useCallback(() => {
          try {
            const payload = { format: 'dsh-design-studio/project', version: STATE_VERSION, project: pickProjectData(state) };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = slug(state.projectName || artifact.title) + '.design.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notify(t('toast.projectExported'));
          } catch (error) {
            notify(t('toast.failed'));
          }
        }, [artifact.title, notify, state, t]);

        const importProjectData = useCallback((data) => {
          if (!data || typeof data !== 'object') throw new Error('invalid project payload');
          const source = data.project && typeof data.project === 'object' ? data.project : data;
          setState((previous) => {
            const project = sanitizeProjectData(Object.assign({}, source, { id: newProjectId() }));
            const saved = Object.assign({}, previous.projects);
            saved[previous.activeProjectId] = pickProjectData(previous);
            const order = [project.id].concat(previous.projectOrder).slice(0, 12);
            for (const id of Object.keys(saved)) {
              if (order.indexOf(id) === -1) delete saved[id];
            }
            delete saved[project.id];
            return Object.assign({}, previous, project, { projects: saved, activeProjectId: project.id, projectOrder: order });
          });
          notify(t('toast.projectImported'));
        }, [notify, t]);

        const refreshPublished = useCallback(async () => {
          setPublishedLoading(true);
          try {
            const response = await fetch('/design-studio/projects', { headers: { accept: 'application/json' }, cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const payload = await response.json();
            setPublishedProjects(Array.isArray(payload.projects) ? payload.projects : []);
            setPublishedError(null);
          } catch (error) {
            setPublishedProjects([]);
            setPublishedError(String((error && error.message) || error));
          } finally {
            setPublishedLoading(false);
          }
        }, []);

        const openPublishedProject = useCallback(async (item) => {
          if (!item || typeof item.file !== 'string') return;
          try {
            const response = await fetch('/design-studio/projects/' + encodeURIComponent(item.file), {
              headers: { accept: 'application/json' },
              cache: 'no-store',
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const payload = await response.json();
            importProjectData(payload);
          } catch (error) {
            notify(t('toast.projectImportFailed'));
          }
        }, [importProjectData, notify, t]);

        useEffect(() => {
          refreshPublished();
          if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
          const onFocus = () => { refreshPublished(); };
          window.addEventListener('focus', onFocus);
          return () => window.removeEventListener('focus', onFocus);
        }, [refreshPublished]);

        const handleArtboardClick = (event) => {
          if (!commentMode) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 1, 99);
          const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 1, 99);
          setCommentDraft({ x: x, y: y, text: '', id: null });
        };

        const selectComment = (comment) => {
          setCommentDraft({ x: comment.x, y: comment.y, text: comment.text, id: comment.id });
        };

        const saveComment = useCallback(() => {
          if (!commentDraft) return;
          const text = String(commentDraft.text || '').trim();
          if (!text) return;
          const entry = {
            id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            x: commentDraft.x,
            y: commentDraft.y,
            text: text.slice(0, 500),
            at: Date.now(),
          };
          patch((previous) => ({ comments: (previous.comments || []).concat([entry]) }));
          setCommentDraft(null);
          notify(t('toast.commentAdded'));
        }, [commentDraft, notify, patch, t]);

        const deleteComment = useCallback((id) => {
          patch((previous) => ({ comments: (previous.comments || []).filter((comment) => comment.id !== id) }));
          setCommentDraft(null);
          notify(t('toast.commentDeleted'));
        }, [notify, patch, t]);

        const importProjectFile = useCallback((event) => {
          const input = event && event.target;
          const file = input && input.files && input.files[0];
          if (input) input.value = '';
          if (!file) return;
          file.text()
            .then((text) => importProjectData(JSON.parse(text)))
            .catch(() => notify(t('toast.projectImportFailed')));
        }, [importProjectData, notify, t]);

        const selectTemplate = useCallback((templateId) => {
          patch({ template: templateId, importedHtml: '', importedTitle: '' });
        }, [patch]);

        const selectStyle = useCallback((styleId) => {
          const style = engine ? engine.styles.find((item) => item.id === styleId) : null;
          if (!style) return;
          patch({ styleId: styleId, tokens: ensureTokens(style.tokens), importedHtml: '', importedTitle: '' });
        }, [patch]);

        const resetStyle = useCallback(() => {
          const style = engine ? engine.styles.find((item) => item.id === state.styleId) : null;
          if (!style) return;
          patch({ tokens: ensureTokens(style.tokens) });
        }, [patch, state.styleId]);

        const refine = useCallback((action) => {
          let tokens = null;
          try {
            tokens = ensureTokens(action.run(state.tokens));
          } catch (error) {
            tokens = state.tokens;
          }
          const entry = {
            id: uniqueId(),
            at: Date.now(),
            label: t(action.labelKey),
            brief: state.brief,
            template: state.template,
            styleId: state.styleId,
            tokens: tokens,
          };
          setState((previous) => Object.assign({}, previous, {
            tokens: tokens,
            history: [entry].concat(previous.history).slice(0, 12),
            importedHtml: '',
            importedTitle: '',
          }));
        }, [state.brief, state.template, state.styleId, state.tokens, t]);

        const setTokenField = useCallback((field, value) => {
          patch((previous) => ({ tokens: withDerived(Object.assign({}, previous.tokens, { [field]: value })) }));
        }, [patch]);

        const setColor = useCallback((field, rawValue) => {
          const hex = parseColor(rawValue);
          if (!hex) return;
          patch((previous) => ({ tokens: withDerived(Object.assign({}, previous.tokens, { [field]: hex })) }));
        }, [patch]);

        const setFont = useCallback((role, fontId) => {
          patch((previous) => {
            const tokens = Object.assign({}, previous.tokens);
            let stack = null;
            if (fontId === 'style') {
              const style = engine ? engine.styles.find((item) => item.id === previous.styleId) : null;
              stack = style ? (role === 'display' ? style.tokens.fontDisplay : style.tokens.fontBody) : null;
            } else {
              const font = FONT_CHOICES.find((item) => item.id === fontId);
              stack = font ? font.stack : null;
            }
            if (!stack) return {};
            if (role === 'display') tokens.fontDisplay = stack;
            else tokens.fontBody = stack;
            return { tokens: tokens };
          });
        }, [patch]);

        const toggleMode = useCallback(() => {
          patch((previous) => ({ tokens: tuneMode(previous.tokens, previous.tokens.mode === 'dark' ? 'light' : 'dark') }));
        }, [patch]);

        const restoreHistory = useCallback((entry) => {
          setState((previous) => Object.assign({}, previous, {
            brief: entry.brief,
            draftBrief: entry.brief,
            template: entry.template,
            styleId: entry.styleId,
            tokens: ensureTokens(entry.tokens),
            importedHtml: entry.externalHtml || '',
            importedTitle: entry.externalTitle || '',
            artifactSource: entry.artifactSource || 'engine',
          }));
        }, []);

        const setZoom = useCallback((value) => {
          patch({ zoom: clamp(Math.round(value * 100) / 100, 0.25, 2) });
        }, [patch]);

        const fitToWidth = useCallback(() => {
          const available = canvasWidth ? canvasWidth - 8 : 0;
          if (!available) {
            setZoom(1);
            return;
          }
          setZoom(clamp(available / device.width, 0.25, 1));
        }, [canvasWidth, device.width, setZoom]);

        const copyText = useCallback(async (text, message) => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              const area = document.createElement('textarea');
              area.value = text;
              area.style.position = 'fixed';
              area.style.opacity = '0';
              document.body.appendChild(area);
              area.select();
              document.execCommand('copy');
              area.remove();
            }
            notify(message);
          } catch (error) {
            notify(t('toast.failed'));
          }
        }, [notify, t]);

        const downloadHtml = useCallback(() => {
          try {
            const blob = new Blob([artifact.html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = slug(state.projectName || artifact.title) + '.html';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notify(t('toast.downloaded'));
          } catch (error) {
            notify(t('toast.failed'));
          }
        }, [artifact, notify, state.projectName, t]);

        // Open the standalone design in a new tab (blob URL, no network), or
        // open it and trigger the browser's print dialog for a PDF.
        const openDesign = useCallback((mode) => {
          try {
            const blob = new Blob([artifact.html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const printMode = mode === 'print';
            const opened = printMode ? window.open(url, '_blank') : window.open(url, '_blank', 'noopener');
            if (printMode) {
              if (!opened) {
                notify(t('toast.popupBlocked'));
                return;
              }
              setTimeout(() => {
                try {
                  opened.focus();
                  opened.print();
                } catch (error) {
                  /* the opener closed the tab or the browser refused focus */
                }
              }, 900);
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } catch (error) {
            notify(t('toast.failed'));
          }
        }, [artifact, notify, t]);

        const buildHandoff = useCallback(() => {
          const lines = [
            '# ' + t('export.copyHandoff'),
            '',
            '## ' + t('brief.heading'),
            state.brief || '—',
            '',
            '## ' + t('template.heading'),
            templateLabel(state.template),
            '',
            '## ' + t('style.heading'),
            styleLabel(state.styleId),
            '',
            '## Design tokens',
            '```json',
            JSON.stringify(state.tokens, null, 2),
            '```',
            '',
            '## ' + t('comments.heading'),
            (state.comments && state.comments.length
              ? state.comments.map((comment) => '- ' + comment.text).join('\n')
              : '—'),
            '',
            '请用上述 tokens 把该设计实现为可运行的响应式页面，保持字体、颜色、圆角与留白节奏一致。',
          ];
          return lines.join('\n');
        }, [state.brief, state.comments, state.styleId, state.template, state.tokens, styleLabel, t, templateLabel]);

        const openImport = useCallback(() => {
          dialogReturnFocus.current = document.activeElement;
          setImportDraft(state.importedHtml || '');
          setDialog('import');
        }, [state.importedHtml]);

        const applyImport = useCallback(() => {
          const html = importDraft.trim();
          if (!html) return;
          patch({ importedHtml: html, importedTitle: t('canvas.importedTitle'), artifactSource: 'import' });
          setDialog(null);
          notify(t('toast.imported'));
        }, [importDraft, notify, patch, t]);

        const restoreGenerated = useCallback(() => {
          patch({ importedHtml: '', importedTitle: '' });
          setDialog(null);
        }, [patch]);

        const openTokensImport = useCallback(() => {
          dialogReturnFocus.current = document.activeElement;
          setTokenDraft(JSON.stringify(state.tokens, null, 2));
          setDialog('tokens');
        }, [state.tokens]);

        const TOKEN_ALIASES = {
          accent: 'accent', brand: 'accent', primary: 'accent',
          'accent-text': 'accentText', accenttext: 'accentText',
          bg: 'bg', background: 'bg',
          surface: 'surface', 'surface-alt': 'surfaceAlt', surfacealt: 'surfaceAlt',
          text: 'text', foreground: 'text',
          muted: 'muted', border: 'border', radius: 'radius',
          density: 'density', scale: 'scale',
          'font-display': 'fontDisplay', fontdisplay: 'fontDisplay',
          'font-body': 'fontBody', fontbody: 'fontBody',
          mode: 'mode',
        };

        const parseTokensDraft = (raw) => {
          const source = Object.assign({}, state.tokens);
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            parsed = null;
          }
          if (parsed && typeof parsed === 'object') {
            const nested = parsed.tokens && typeof parsed.tokens === 'object' ? parsed.tokens : parsed;
            for (const key of Object.keys(nested)) {
              const target = TOKEN_ALIASES[String(key).toLowerCase()] || TOKEN_ALIASES[String(key)];
              if (target && nested[key] !== undefined) source[target] = nested[key];
            }
            return source;
          }
          let found = 0;
          const pattern = /--([a-zA-Z0-9-]+)\s*:\s*([^;\n]+);/g;
          let match = pattern.exec(raw);
          while (match) {
            const target = TOKEN_ALIASES[match[1].toLowerCase()];
            if (target) {
              let value = match[2].trim();
              if (target === 'radius' || target === 'density' || target === 'scale' || target === 'mode') {
                // keep numbers/words as-is; ensureTokens validates them
                if (target === 'radius') value = Number(value.replace(/px$/i, ''));
              }
              source[target] = value;
              found += 1;
            }
            match = pattern.exec(raw);
          }
          if (!found) throw new Error('no tokens found');
          return source;
        };

        const applyTokensImport = useCallback(() => {
          const raw = tokenDraft.trim();
          if (!raw) return;
          try {
            const merged = ensureTokens(parseTokensDraft(raw));
            patch({ tokens: withDerived(merged) });
            setDialog(null);
            notify(t('toast.tokensImported'));
          } catch (error) {
            notify(t('toast.tokensInvalid'));
          }
        }, [notify, patch, t, tokenDraft]);

        const trapDialogFocus = (event) => {
          if (event.key !== 'Tab') return;
          const container = event.currentTarget;
          const nodes = Array.from(container.querySelectorAll('button, textarea, input, select, a[href]'))
            .filter((element) => !element.disabled && element.offsetParent !== null);
          if (!nodes.length) return;
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        };

        const zoomPercent = Math.round(state.zoom * 100);
        const frameWidth = Math.round(device.width * state.zoom);
        const frameHeight = Math.round(device.height * state.zoom);
        const isSample = !state.brief.trim() && !state.importedHtml;

        const currentStyle = engine ? engine.styles.find((item) => item.id === state.styleId) : null;
        const pickFontId = (stack, styleStack) => {
          const match = FONT_CHOICES.find((font) => font.stack === stack);
          if (match) return match.id;
          return styleStack && stack === styleStack ? 'style' : 'style';
        };
        const displayFontId = pickFontId(state.tokens.fontDisplay, currentStyle ? currentStyle.tokens.fontDisplay : null);
        const bodyFontId = pickFontId(state.tokens.fontBody, currentStyle ? currentStyle.tokens.fontBody : null);
        const fontOptions = [{ value: 'style', label: t('font.styleDefault') }].concat(FONT_CHOICES.map((font) => ({ value: font.id, label: t(font.labelKey) })));
        const textContrast = contrastRatio(state.tokens.text, state.tokens.bg);
        const accentContrast = contrastRatio(state.tokens.accentText, state.tokens.accent);

        const examples = ['ex.landing', 'ex.dashboard', 'ex.mobile', 'ex.pricing'];
        const compareStyles = engine && compareMode && !state.importedHtml
          ? [state.styleId]
            .concat(engine.styles.map((style) => style.id).filter((id) => id !== state.styleId))
            .slice(0, 3)
            .map((id) => {
              const preset = engine.styles.find((style) => style.id === id);
              return {
                id: id,
                label: styleLabel(id),
                tokens: id === state.styleId ? state.tokens : ensureTokens(preset ? preset.tokens : state.tokens),
              };
            })
          : [];
        const compareZoom = clamp((canvasWidth ? canvasWidth - 72 : 900) / Math.max(1, device.width * 3 + 48), 0.12, 0.5);
        const projectItems = (state.projectOrder || [state.activeProjectId]).map((id) => ({
          id,
          name: id === state.activeProjectId
            ? (state.projectName || t('project.untitled'))
            : ((state.projects && state.projects[id] && state.projects[id].projectName) || t('project.untitled')),
        }));

        return h(React.Fragment, null,
          h('style', null, STYLE_TEXT),
          h('div', { className: 'dsx-root' },
            /* Top bar */
            h('header', { className: 'dsx-topbar' },
              h('button', {
                type: 'button',
                className: 'dsx-toolbtn dsx-drawer-btn',
                title: t('drawer.toggle'),
                'aria-label': t('drawer.toggle'),
                'aria-expanded': composerOpen ? 'true' : 'false',
                onClick: () => setComposerOpen((open) => !open),
              }, h(DesignStudioMark, { size: 16 })),
              h('div', { className: 'dsx-brand' },
                h(DesignStudioMark, { size: 18 }),
                h('span', null, t('panel.title'))),
              h('span', { className: 'dsx-divider' }),
              h('span', { className: 'dsx-project-title', title: state.projectName || t('project.untitled') },
                state.projectName || t('project.untitled')),
              h('div', { className: 'dsx-spacer' }),
              h(Segmented, {
                value: state.device,
                ariaLabel: t('device.group'),
                options: DEVICES.map((item) => ({ value: item.id, label: t(item.labelKey) })),
                onChange: (value) => patch({ device: value }),
              }),
              h('span', { className: 'dsx-divider' }),
              h('button', { type: 'button', className: 'dsx-toolbtn', title: t('toolbar.zoomOut'), 'aria-label': t('toolbar.zoomOut'), onClick: () => setZoom(state.zoom - 0.1) },
                h(Glyph, { name: 'minus' })),
              h('span', { className: 'dsx-zoom', title: t('toolbar.fit') }, zoomPercent + '%'),
              h('button', { type: 'button', className: 'dsx-toolbtn', title: t('toolbar.zoomIn'), 'aria-label': t('toolbar.zoomIn'), onClick: () => setZoom(state.zoom + 0.1) },
                h(Glyph, { name: 'plus' })),
              h('button', { type: 'button', className: 'dsx-toolbtn', title: t('toolbar.fit'), 'aria-label': t('toolbar.fit'), onClick: fitToWidth },
                h(Glyph, { name: 'fit' })),
              h('span', { className: 'dsx-divider' }),
              h('button', {
                type: 'button',
                className: 'dsx-toolbtn',
                title: t('toolbar.mode'),
                'aria-label': t('toolbar.mode'),
                'aria-pressed': state.tokens.mode === 'dark' ? 'true' : 'false',
                onClick: toggleMode,
              }, h(Glyph, { name: state.tokens.mode === 'dark' ? 'sun' : 'moon' })),
              h('button', {
                type: 'button',
                className: 'dsx-toolbtn dsx-compare-toggle',
                title: t('toolbar.compare'),
                'aria-label': t('toolbar.compare'),
                'aria-pressed': compareMode ? 'true' : 'false',
                onClick: () => setCompareMode((value) => !value),
              }, h(Glyph, { name: 'columns' })),
              h('button', {
                type: 'button',
                className: 'dsx-toolbtn dsx-comment-toggle',
                title: t('toolbar.comment'),
                'aria-label': t('toolbar.comment'),
                'aria-pressed': commentMode ? 'true' : 'false',
                onClick: () => {
                  setCommentMode((value) => !value);
                  setCommentDraft(null);
                },
              }, h(Glyph, { name: 'comment' })),
              h('button', { type: 'button', className: 'dsx-toolbtn dsx-toolbtn-strong', title: t('toolbar.export'), onClick: downloadHtml },
                h(Glyph, { name: 'download' }),
                h('span', { className: 'dsx-toolbtn-label' }, t('export.download')))),

            h('div', { className: 'dsx-body' },
              /* Left column: brief, direction, versions */
              h('aside', { className: 'dsx-left' + (composerOpen ? ' dsx-left-open' : '') },
                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' },
                    h('span', null, t('brief.heading')),
                    h('div', { className: 'dsx-project-actions' },
                      h('button', { type: 'button', className: 'dsx-linkbtn', title: t('project.new'), onClick: createProject }, t('project.new')),
                      h('button', { type: 'button', className: 'dsx-linkbtn', title: t('project.export'), onClick: exportProject }, t('project.export')),
                      h('button', { type: 'button', className: 'dsx-linkbtn', title: t('project.import'), onClick: () => { if (importFileRef.current) importFileRef.current.click(); } }, t('project.import')),
                      h('button', { type: 'button', className: 'dsx-linkbtn', title: t('project.delete'), onClick: deleteProject }, t('project.delete')))),
                  h('select', {
                    className: 'dsx-input dsx-project-select',
                    value: state.activeProjectId,
                    'aria-label': t('project.select'),
                    onChange: (event) => switchProject(event.target.value),
                  }, projectItems.map((item) => h('option', { key: item.id, value: item.id }, item.name))),
                  h('input', {
                    type: 'file',
                    className: 'dsx-file-input',
                    accept: '.json,application/json',
                    ref: importFileRef,
                    'aria-label': t('project.import'),
                    onChange: importProjectFile,
                  }),
                  h('input', {
                    className: 'dsx-input dsx-project-input',
                    value: state.projectName,
                    placeholder: t('project.namePlaceholder'),
                    'aria-label': t('project.namePlaceholder'),
                    spellCheck: false,
                    onChange: (event) => patch({ projectName: event.target.value }),
                  }),
                  h('div', { className: 'dsx-published' },
                    h('div', { className: 'dsx-published-head' },
                      h('span', { className: 'dsx-published-title' }, t('published.heading')),
                      h('button', {
                        type: 'button',
                        className: 'dsx-linkbtn',
                        title: t('published.refresh'),
                        onClick: refreshPublished,
                      }, publishedLoading ? t('published.loading') : t('published.refresh'))),
                    publishedProjects.length
                      ? h('div', { className: 'dsx-published-list' },
                        publishedProjects.slice(0, 8).map((item) => h('button', {
                          key: item.file,
                          type: 'button',
                          className: 'dsx-published-item',
                          title: item.file,
                          onClick: () => openPublishedProject(item),
                        },
                        h('span', { className: 'dsx-published-name' }, item.projectName || item.file),
                        h('span', { className: 'dsx-published-meta' }, Math.max(1, Math.round((Number(item.bytes) || 0) / 1024)) + ' KB'))))
                      : h('div', { className: 'dsx-empty-hint' }, publishedError ? t('published.error') : t('published.empty'))),
                  h('textarea', {
                    className: 'dsx-textarea',
                    value: state.draftBrief,
                    placeholder: t('brief.placeholder'),
                    'aria-label': t('brief.heading'),
                    spellCheck: false,
                    onChange: (event) => patch({ draftBrief: event.target.value }),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        handleGenerate();
                      }
                    },
                  }),
                  h('div', { className: 'dsx-hint' }, t('brief.shortcut')),
                  h('button', { type: 'button', className: 'dsx-primary', onClick: handleGenerate, disabled: aiBusy },
                    h(Glyph, { name: 'sparkle' }),
                    h('span', null, aiBusy ? t('brief.generating') : (aiInfo.available ? t('brief.generateAi') : t('brief.generate')))),
                  h('div', { className: 'dsx-ai-status' },
                    aiBusy
                      ? t('brief.generatingHint')
                      : aiInfo.available
                        ? t('brief.aiMode') + ' · ' + (aiInfo.provider || '') + '/' + (aiInfo.model || '')
                        : t('brief.aiUnavailable')),
                  aiError ? h('div', { className: 'dsx-ai-error' }, aiError) : null,
                  aiInfo.available && artifact.imported
                    ? h('div', { className: 'dsx-ai-refine' },
                      h('div', { className: 'dsx-section-title' }, h('span', null, t('ai.refineHeading'))),
                      h('input', {
                        className: 'dsx-input',
                        value: aiRefineDraft,
                        placeholder: t('ai.refinePlaceholder'),
                        'aria-label': t('ai.refineHeading'),
                        spellCheck: false,
                        disabled: aiBusy,
                        onChange: (event) => setAiRefineDraft(event.target.value),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            refineWithAi();
                          }
                        },
                      }),
                      h('button', {
                        type: 'button',
                        className: 'dsx-btn dsx-btn-block',
                        disabled: aiBusy || !aiRefineDraft.trim(),
                        onClick: refineWithAi,
                      }, aiBusy ? t('ai.refining') : t('ai.refine')))
                    : null,
                  isSample ? h('div', { className: 'dsx-examples' },
                    h('div', { className: 'dsx-section-title' }, h('span', null, t('brief.examplesHeading'))),
                    examples.map((key) => h('button', {
                      key: key,
                      type: 'button',
                      className: 'dsx-example',
                      onClick: () => {
                        patch({ draftBrief: t(key) });
                        if (aiInfo.available) generateWithAi(t(key));
                        else generateFrom(t(key));
                      },
                    }, t(key)))) : null),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('template.heading'))),
                  h('div', { className: 'dsx-chips' },
                    (engine ? engine.templates : []).map((item) => h(Chip, {
                      key: item.id,
                      pressed: state.template === item.id,
                      title: item.hint ? item.hint[lang] || item.hint.en : undefined,
                      onClick: () => selectTemplate(item.id),
                    }, labelOf(item) || item.id)))),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('style.heading'))),
                  h('div', { className: 'dsx-chips' },
                    (engine ? engine.styles : []).map((item) => h(Chip, {
                      key: item.id,
                      pressed: state.styleId === item.id,
                      onClick: () => selectStyle(item.id),
                    }, labelOf(item) || item.id)))),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('refine.heading'))),
                  h('div', { className: 'dsx-chips' },
                    REFINE_ACTIONS.map((action) => h(Chip, {
                      key: action.id,
                      onClick: () => refine(action),
                    }, t(action.labelKey))))),

                h('section', { className: 'dsx-section dsx-history-section' },
                  h('div', { className: 'dsx-section-title' },
                    h('span', null, t('history.heading')),
                    state.history.length ? h('span', { className: 'dsx-count' }, String(state.history.length)) : null),
                  state.history.length
                    ? h('div', { className: 'dsx-history' },
                      state.history.map((entry) => h('button', {
                        key: entry.id,
                        type: 'button',
                        className: 'dsx-history-row',
                        title: entry.label,
                        onClick: () => restoreHistory(entry),
                      },
                      h('span', { className: 'dsx-history-dot' }),
                      h('span', { className: 'dsx-history-label' }, entry.label || t('history.heading')),
                      h('span', { className: 'dsx-history-time' }, formatTime(entry.at)))))
                    : h('div', { className: 'dsx-empty-hint' }, t('history.empty'))),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' },
                    h('span', null, t('comments.heading')),
                    state.comments.length ? h('span', { className: 'dsx-count' }, String(state.comments.length)) : null),
                  state.comments.length
                    ? h('div', { className: 'dsx-comments' },
                      state.comments.map((comment) => h('div', { key: comment.id, className: 'dsx-comment-row' },
                        h('button', { type: 'button', className: 'dsx-comment-open', title: comment.text, onClick: () => selectComment(comment) }, comment.text),
                        h('button', {
                          type: 'button',
                          className: 'dsx-comment-delete',
                          title: t('comments.delete'),
                          'aria-label': t('comments.delete'),
                          onClick: () => deleteComment(comment.id),
                        }, h(Glyph, { name: 'close' })))))
                    : h('div', { className: 'dsx-empty-hint' }, t('comments.empty')))),

              /* Canvas */
              h('main', { className: 'dsx-canvas' },
                h('div', { className: 'dsx-canvas-scroll', ref: canvasRef },
                  compareStyles.length
                    ? h('div', { className: 'dsx-compare' },
                      compareStyles.map((variant) => {
                        let variantHtml = '';
                        try {
                          variantHtml = engine.generate({ brief: state.brief, template: state.template, tokens: variant.tokens }).html;
                        } catch (error) {
                          variantHtml = fallbackDocument(String(error && error.message ? error.message : error));
                        }
                        const variantActive = variant.id === state.styleId;
                        const variantWidth = Math.round(device.width * compareZoom);
                        const variantHeight = Math.round(device.height * compareZoom);
                        return h('div', { key: variant.id, className: 'dsx-compare-cell' },
                          h('div', { className: 'dsx-artboard-label' },
                            h('span', { className: 'dsx-artboard-name' }, variant.label),
                            variantActive ? h('span', { className: 'dsx-badge' }, t('compare.current')) : null),
                          h('div', {
                            className: 'dsx-compare-frame' + (variantActive ? ' dsx-compare-active' : ''),
                            style: { width: variantWidth + 'px', height: variantHeight + 'px' },
                          },
                            h('div', { style: { width: device.width + 'px', height: device.height + 'px', transform: 'scale(' + compareZoom + ')', transformOrigin: 'top left' } },
                              h('iframe', {
                                className: 'dsx-frame',
                                title: variant.label,
                                sandbox: '',
                                srcDoc: variantHtml,
                                style: { width: device.width + 'px', height: device.height + 'px' },
                              })),
                            h('button', {
                              type: 'button',
                              className: 'dsx-compare-hit',
                              title: variant.label,
                              'aria-label': variant.label,
                              onClick: () => selectStyle(variant.id),
                            })));
                      }))
                    : h('div', { className: 'dsx-artboard-wrap' },
                      h('div', { className: 'dsx-artboard-label' },
                        h('span', { className: 'dsx-artboard-name' }, artifact.title),
                        isSample ? h('span', { className: 'dsx-badge' }, t('canvas.sampleBadge')) : null,
                        artifact.imported ? h('span', { className: 'dsx-badge' }, state.artifactSource === 'ai' ? t('canvas.aiBadge') : t('canvas.importedBadge')) : null,
                        h('span', { className: 'dsx-artboard-meta' }, t(device.labelKey) + ' ' + device.width)),
                      h('div', { className: 'dsx-artboard', style: { width: frameWidth + 'px', height: frameHeight + 'px' } },
                        h('div', { style: { width: device.width + 'px', height: device.height + 'px', transform: 'scale(' + state.zoom + ')', transformOrigin: 'top left' } },
                          h('iframe', {
                            className: 'dsx-frame',
                            title: t('canvas.frameTitle'),
                            sandbox: '',
                            srcDoc: artifact.html,
                            style: { width: device.width + 'px', height: device.height + 'px' },
                          })),
                        h('div', {
                          className: 'dsx-comment-layer' + (commentMode ? ' dsx-comment-mode' : ''),
                          onClick: handleArtboardClick,
                        },
                          state.comments.map((comment) => h('button', {
                            key: comment.id,
                            type: 'button',
                            className: 'dsx-comment-pin' + (commentDraft && commentDraft.id === comment.id ? ' dsx-comment-pin-active' : ''),
                            style: { left: comment.x + '%', top: comment.y + '%' },
                            title: comment.text,
                            'aria-label': comment.text,
                            onClick: (event) => {
                              event.stopPropagation();
                              selectComment(comment);
                            },
                          })),
                          commentDraft
                            ? h('div', {
                              className: 'dsx-comment-pop',
                              style: { left: commentDraft.x + '%', top: commentDraft.y + '%' },
                              onClick: (event) => event.stopPropagation(),
                            },
                              commentDraft.id
                                ? h(React.Fragment, null,
                                  h('p', { className: 'dsx-comment-text' }, commentDraft.text),
                                  h('div', { className: 'dsx-comment-pop-actions' },
                                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => deleteComment(commentDraft.id) }, t('comments.delete')),
                                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => setCommentDraft(null) }, t('comments.close'))))
                                : h(React.Fragment, null,
                                  h('textarea', {
                                    className: 'dsx-comment-input',
                                    value: commentDraft.text,
                                    placeholder: t('comments.placeholder'),
                                    autoFocus: true,
                                    onChange: (event) => {
                                      const value = event.target.value;
                                      setCommentDraft((draft) => (draft ? Object.assign({}, draft, { text: value }) : draft));
                                    },
                                  }),
                                  h('div', { className: 'dsx-comment-pop-actions' },
                                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => setCommentDraft(null) }, t('comments.cancel')),
                                    h('button', {
                                      type: 'button',
                                      className: 'dsx-primary dsx-primary-inline',
                                      disabled: !String(commentDraft.text || '').trim(),
                                      onClick: saveComment,
                                    }, t('comments.add')))))
                            : null))))),

              /* Right column: design system inspector */
              h('aside', { className: 'dsx-right' },
                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('inspector.heading'))),
                  h('div', { className: 'dsx-field' },
                    h('span', null, t('inspector.style')),
                    h('span', { className: 'dsx-field-value' }, styleLabel(state.styleId))),
                  h('button', { type: 'button', className: 'dsx-btn dsx-btn-block', onClick: resetStyle },
                    h(Glyph, { name: 'reset' }),
                    h('span', null, t('inspector.reset')))),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('inspector.colors'))),
                  h(ColorField, { label: t('inspector.accent'), value: state.tokens.accent, onChange: (value) => setColor('accent', value) }),
                  h(ColorField, { label: t('inspector.bg'), value: state.tokens.bg, onChange: (value) => setColor('bg', value) }),
                  h(ColorField, { label: t('inspector.surface'), value: state.tokens.surface, onChange: (value) => setColor('surface', value) }),
                  h(ColorField, { label: t('inspector.text'), value: state.tokens.text, onChange: (value) => setColor('text', value) })),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('inspector.typography'))),
                  h(SelectField, {
                    label: t('inspector.displayFont'),
                    value: displayFontId,
                    options: fontOptions,
                    onChange: (value) => setFont('display', value),
                  }),
                  h(SelectField, {
                    label: t('inspector.bodyFont'),
                    value: bodyFontId,
                    options: fontOptions,
                    onChange: (value) => setFont('body', value),
                  }),
                  h(FieldRow, {
                    label: t('inspector.scale'),
                    control: h(Segmented, {
                      value: state.tokens.scale,
                      ariaLabel: t('inspector.scale'),
                      options: SCALES.map((value) => ({ value: value, label: t('scale.' + value) })),
                      onChange: (value) => setTokenField('scale', value),
                    }),
                  }),
                  h(FieldRow, {
                    label: t('inspector.density'),
                    control: h(Segmented, {
                      value: state.tokens.density,
                      ariaLabel: t('inspector.density'),
                      options: SCALES.map((value) => ({ value: value, label: t('density.' + value) })),
                      onChange: (value) => setTokenField('density', value),
                    }),
                  }),
                  h('div', { className: 'dsx-field' },
                    h('span', null, t('inspector.radius')),
                    h('span', { className: 'dsx-field-value' }, state.tokens.radius + 'px')),
                  h('input', {
                    className: 'dsx-range',
                    type: 'range',
                    min: 0,
                    max: 28,
                    step: 1,
                    value: state.tokens.radius,
                    'aria-label': t('inspector.radius'),
                    onChange: (event) => setTokenField('radius', Number(event.target.value)),
                  })),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('inspector.contrast'))),
                  h('div', { className: 'dsx-field' },
                    h('span', null, t('inspector.textContrast')),
                    h(RatioBadge, { label: t('inspector.aaPass'), failLabel: t('inspector.aaFail'), ratio: textContrast })),
                  h('div', { className: 'dsx-field' },
                    h('span', null, t('inspector.accentContrast')),
                    h(RatioBadge, { label: t('inspector.aaPass'), failLabel: t('inspector.aaFail'), ratio: accentContrast }))),

                h('section', { className: 'dsx-section' },
                  h('div', { className: 'dsx-section-title' }, h('span', null, t('export.heading'))),
                  h('div', { className: 'dsx-actions' },
                    h('button', { type: 'button', className: 'dsx-btn', onClick: downloadHtml },
                      h(Glyph, { name: 'download' }), h('span', null, t('export.download'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => copyText(artifact.html, t('toast.copied')) },
                      h(Glyph, { name: 'copy' }), h('span', null, t('export.copyHtml'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => copyText(JSON.stringify(state.tokens, null, 2), t('toast.copied')) },
                      h(Glyph, { name: 'copy' }), h('span', null, t('export.copyTokens'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => copyText(buildHandoff(), t('toast.copied')) },
                      h(Glyph, { name: 'copy' }), h('span', null, t('export.copyHandoff'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: openImport },
                      h(Glyph, { name: 'import' }), h('span', null, t('export.import'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => openDesign('preview') },
                      h(Glyph, { name: 'external' }), h('span', null, t('export.preview'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: () => openDesign('print') },
                      h(Glyph, { name: 'printer' }), h('span', null, t('export.print'))),
                    h('button', { type: 'button', className: 'dsx-btn', onClick: openTokensImport },
                      h(Glyph, { name: 'sliders' }), h('span', null, t('export.tokens'))))),

                h('div', { className: 'dsx-about' }, t('about.note')))),

            composerOpen ? h('div', { className: 'dsx-drawer-backdrop', onClick: () => setComposerOpen(false) }) : null,

            toast ? h('div', { className: 'dsx-toast', role: 'status' }, toast) : null,

            dialog === 'import' || dialog === 'tokens' ? h('div', {
              className: 'dsx-dialog-backdrop',
              onMouseDown: (event) => { if (event.target === event.currentTarget) setDialog(null); },
            },
            h('div', {
              className: 'dsx-dialog',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': dialog === 'import' ? t('import.title') : t('tokens.title'),
              onKeyDown: trapDialogFocus,
            },
              h('div', { className: 'dsx-dialog-title' }, dialog === 'import' ? t('import.title') : t('tokens.title')),
              h('p', { className: 'dsx-dialog-hint' }, dialog === 'import' ? t('import.hint') : t('tokens.hint')),
              h('textarea', {
                className: 'dsx-code',
                value: dialog === 'import' ? importDraft : tokenDraft,
                placeholder: dialog === 'import' ? '<!doctype html>\n<html>…</html>' : '{"accent":"#7c5cff","radius":12}',
                spellCheck: false,
                autoFocus: true,
                onChange: (event) => {
                  if (dialog === 'import') setImportDraft(event.target.value);
                  else setTokenDraft(event.target.value);
                },
              }),
              h('div', { className: 'dsx-dialog-actions' },
                dialog === 'import' && state.importedHtml
                  ? h('button', { type: 'button', className: 'dsx-btn', onClick: restoreGenerated }, t('import.restore'))
                  : null,
                h('div', { className: 'dsx-spacer' }),
                h('button', { type: 'button', className: 'dsx-btn', onClick: () => setDialog(null) }, dialog === 'import' ? t('import.cancel') : t('tokens.cancel')),
                h('button', {
                  type: 'button',
                  className: 'dsx-primary dsx-primary-inline',
                  disabled: dialog === 'import' ? !importDraft.trim() : !tokenDraft.trim(),
                  onClick: dialog === 'import' ? applyImport : applyTokensImport,
                }, h('span', null, dialog === 'import' ? t('import.apply') : t('tokens.apply')))))
              ) : null
          ));
      };
    }

    /* ------------------------------------------------------------------ *
     * Presentational pieces
     * ------------------------------------------------------------------ */
    function Glyph(props) {
      const size = Number(props && props.size) || 14;
      const stroke = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
      const base = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, focusable: false, style: { display: 'block' } };
      let path = null;
      switch (props && props.name) {
        case 'sparkle':
          path = h('path', Object.assign({ d: 'M12 3.6l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z' }, stroke));
          break;
        case 'moon':
          path = h('path', Object.assign({ d: 'M20 14.2A8.2 8.2 0 019.8 4 8.4 8.4 0 1020 14.2z' }, stroke));
          break;
        case 'sun':
          path = h(React.Fragment, null,
            h('circle', Object.assign({ cx: 12, cy: 12, r: 4 }, stroke)),
            h('path', Object.assign({ d: 'M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6' }, stroke)));
          break;
        case 'download':
          path = h('path', Object.assign({ d: 'M12 4v10m0 0l-3.6-3.6M12 14l3.6-3.6M4.8 16.8v1.4A1.8 1.8 0 006.6 20h10.8a1.8 1.8 0 001.8-1.8v-1.4' }, stroke));
          break;
        case 'copy':
          path = h(React.Fragment, null,
            h('rect', Object.assign({ x: 9, y: 9, width: 11, height: 11, rx: 2 }, stroke)),
            h('path', Object.assign({ d: 'M15 9V6.2A2.2 2.2 0 0012.8 4H6.2A2.2 2.2 0 004 6.2v6.6A2.2 2.2 0 006.2 15H9' }, stroke)));
          break;
        case 'import':
          path = h('path', Object.assign({ d: 'M12 16.5V5.5m0 0L8.4 9.1M12 5.5l3.6 3.6M4.8 17.2v1A1.8 1.8 0 006.6 20h10.8a1.8 1.8 0 001.8-1.8v-1' }, stroke));
          break;
        case 'fit':
          path = h('path', Object.assign({ d: 'M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5' }, stroke));
          break;
        case 'reset':
          path = h(React.Fragment, null,
            h('path', Object.assign({ d: 'M4.5 11.5a7.5 7.5 0 111.9 6.4' }, stroke)),
            h('path', Object.assign({ d: 'M4 17.4v-5h5' }, stroke)));
          break;
        case 'plus':
          path = h('path', Object.assign({ d: 'M12 5.5v13M5.5 12h13' }, stroke));
          break;
        case 'external':
          path = h(React.Fragment, null,
            h('path', Object.assign({ d: 'M14 4h6v6M20 4l-8.5 8.5' }, stroke)),
            h('path', Object.assign({ d: 'M18 14v5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 19V8.5A1.5 1.5 0 015.5 7H10' }, stroke)));
          break;
        case 'printer':
          path = h(React.Fragment, null,
            h('path', Object.assign({ d: 'M7 9V4h10v5' }, stroke)),
            h('rect', Object.assign({ x: 4, y: 9, width: 16, height: 8, rx: 2 }, stroke)),
            h('path', Object.assign({ d: 'M7 15h10v5H7z' }, stroke)));
          break;
        case 'columns':
          path = h(React.Fragment, null,
            h('rect', Object.assign({ x: 4, y: 4, width: 4.6, height: 16, rx: 1.2 }, stroke)),
            h('rect', Object.assign({ x: 9.7, y: 4, width: 4.6, height: 16, rx: 1.2 }, stroke)),
            h('rect', Object.assign({ x: 15.4, y: 4, width: 4.6, height: 16, rx: 1.2 }, stroke)));
          break;
        case 'comment':
          path = h(React.Fragment, null,
            h('path', Object.assign({ d: 'M20 5H4a1 1 0 00-1 1v9a1 1 0 001 1h4l3 4 3-4h6a1 1 0 001-1V6a1 1 0 00-1-1z' }, stroke)));
          break;
        case 'sliders':
          path = h(React.Fragment, null,
            h('path', Object.assign({ d: 'M4 7h10M18 7h2M4 17h2M10 17h10' }, stroke)),
            h('circle', Object.assign({ cx: 16, cy: 7, r: 2 }, stroke)),
            h('circle', Object.assign({ cx: 8, cy: 17, r: 2 }, stroke)));
          break;
        case 'minus':
          path = h('path', Object.assign({ d: 'M5.5 12h13' }, stroke));
          break;
        case 'check':
          path = h('path', Object.assign({ d: 'M5 12.8l4.2 4.2L19 7.2' }, stroke));
          break;
        case 'close':
          path = h('path', Object.assign({ d: 'M6 6l12 12M18 6L6 18' }, stroke));
          break;
        default:
          path = h('circle', Object.assign({ cx: 12, cy: 12, r: 7 }, stroke));
      }
      return h('svg', base, path);
    }

    function DesignStudioMark(props) {
      const size = Number(props && props.size) || 18;
      const active = props && props.active;
      const weight = active ? 1.95 : 1.65;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, focusable: false, style: { display: 'block', opacity: active ? 1 : 0.9 } },
        h('rect', { x: 3, y: 3.4, width: 18, height: 17.2, rx: 3.2, stroke: 'currentColor', strokeWidth: weight }),
        h('path', { d: 'M3 9.2h18M9.2 9.2v11.4', stroke: 'currentColor', strokeWidth: weight, strokeLinecap: 'round' }));
    }

    function Chip(props) {
      return h('button', {
        type: 'button',
        className: 'dsx-chip',
        title: props.title,
        'aria-pressed': props.pressed ? 'true' : 'false',
        onClick: props.onClick,
      }, props.children);
    }

    function Segmented(props) {
      const options = props.options || [];
      return h('div', { className: 'dsx-seg', role: 'group', 'aria-label': props.ariaLabel },
        options.map((option) => h('button', {
          key: option.value,
          type: 'button',
          title: option.title,
          'aria-pressed': props.value === option.value ? 'true' : 'false',
          onClick: () => props.onChange(option.value),
        }, option.label)));
    }

    function FieldRow(props) {
      return h('div', { className: 'dsx-field' }, h('span', null, props.label), props.control);
    }

    function RatioBadge(props) {
      const ratio = Number(props.ratio) || 1;
      const pass = ratio >= 4.5;
      return h('span', { className: 'dsx-ratio ' + (pass ? 'dsx-ratio-ok' : 'dsx-ratio-bad'), title: ratio.toFixed(2) + ':1' },
        ratio.toFixed(1) + ':1',
        h('span', { className: 'dsx-ratio-tag' }, pass ? props.label : props.failLabel));
    }

    function ColorField(props) {
      const [draft, setDraft] = useState(props.value);
      useEffect(() => { setDraft(props.value); }, [props.value]);
      const commit = () => {
        const hex = parseColor(draft);
        if (hex) props.onChange(hex);
        else setDraft(props.value);
      };
      return h('div', { className: 'dsx-field' },
        h('span', null, props.label),
        h('div', { className: 'dsx-colorfield' },
          h('input', {
            type: 'color',
            className: 'dsx-color',
            value: props.value,
            'aria-label': props.label,
            onChange: (event) => props.onChange(event.target.value),
          }),
          h('input', {
            className: 'dsx-input dsx-hex',
            value: draft,
            spellCheck: false,
            'aria-label': props.label + ' hex',
            onChange: (event) => setDraft(event.target.value),
            onBlur: commit,
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
            },
          })));
    }

    function SelectField(props) {
      return h('label', { className: 'dsx-field' },
        h('span', null, props.label),
        h('select', {
          className: 'dsx-input dsx-select',
          value: props.value,
          'aria-label': props.label,
          onChange: (event) => props.onChange(event.target.value),
        }, (props.options || []).map((option) => h('option', { key: option.value, value: option.value }, option.label))));
    }

    /* ------------------------------------------------------------------ *
     * Styles: host theme tokens only (artwork lives in the iframe document)
     * ------------------------------------------------------------------ */
    // Chrome styles use host theme tokens only. Two literal colours remain on
    // purpose: the white artboard matte behind the sandboxed design document
    // (artwork surface), and token fallbacks inside generated documents.
    const STYLE_TEXT = [
      '.dsx-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:440px;overflow:hidden;container-type:inline-size;container-name:dsx;',
      'background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:inherit;}',
      '.dsx-topbar{display:flex;align-items:center;gap:8px;height:52px;padding:0 14px;flex:0 0 auto;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;',
      'border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);}',
      '.dsx-brand{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.01em;flex:0 0 auto;white-space:nowrap;}',
      '.dsx-divider{width:1px;height:18px;background:var(--dsw-alias-border-l1);flex:0 0 auto;}',
      '.dsx-project-title{font-size:12px;color:var(--dsw-alias-label-secondary);max-width:220px;overflow:hidden;flex:0 1 auto;',
      'text-overflow:ellipsis;white-space:nowrap;}',
      '.dsx-spacer{flex:1 1 auto;min-width:4px;}',
      '.dsx-zoom{font-size:11px;color:var(--dsw-alias-label-secondary);min-width:34px;text-align:center;font-variant-numeric:tabular-nums;}',
      '.dsx-toolbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;min-width:28px;',
      'padding:0 7px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:12px;cursor:pointer;}',
      '.dsx-toolbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsx-toolbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.dsx-toolbtn[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1);}',
      '.dsx-toolbtn-strong{border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);padding:0 10px;}',
      '.dsx-toolbtn-label{white-space:nowrap;}',
      '.dsx-body{display:flex;flex:1 1 auto;min-height:0;}',
      '.dsx-left{flex:0 0 316px;width:316px;display:flex;flex-direction:column;overflow:auto;',
      'border-right:1px solid var(--dsw-alias-border-l1);}',
      '.dsx-section{display:flex;flex-direction:column;gap:9px;padding:13px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.dsx-section:last-child{border-bottom:0;}',
      '.dsx-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;',
      'letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);font-weight:600;}',
      '.dsx-linkbtn{border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11px;',
      'text-transform:none;letter-spacing:0;cursor:pointer;padding:0;}',
      '.dsx-linkbtn:hover{text-decoration:underline;}',
      '.dsx-input{height:28px;min-width:0;padding:0 9px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);',
      'background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;}',
      '.dsx-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.dsx-project-input{width:100%;height:26px;}',
      '.dsx-project-select{width:100%;height:26px;}',
      '.dsx-project-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.dsx-ai-status{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin:-2px 0 2px;}',
      '.dsx-ai-error{font-size:11px;color:var(--dsw-alias-label-danger,#f87171);line-height:1.45;}',
      '.dsx-ai-refine{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;margin-top:2px;}',
      '.dsx-btn-block{width:100%;justify-content:center;}',
      '.dsx-primary:disabled{opacity:.65;cursor:progress;}',
      '.dsx-published{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;}',
      '.dsx-published-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
      '.dsx-published-title{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);font-weight:600;}',
      '.dsx-published-list{display:flex;flex-direction:column;gap:2px;}',
      '.dsx-published-item{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:5px 7px;font:inherit;font-size:11.5px;cursor:pointer;text-align:left;}',
      '.dsx-published-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);}',
      '.dsx-published-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsx-published-meta{flex:0 0 auto;font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}',
      '.dsx-file-input{display:none;}',
      '.dsx-textarea{width:100%;min-height:92px;resize:vertical;padding:9px 10px;border-radius:8px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);',
      'font:inherit;font-size:12.5px;line-height:1.6;}',
      '.dsx-textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.dsx-hint{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.dsx-primary{display:flex;align-items:center;justify-content:center;gap:8px;height:32px;padding:0 12px;',
      'border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);',
      'color:var(--dsw-alias-label-primary-inverted);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;}',
      '.dsx-primary:hover{filter:brightness(1.06);}',
      '.dsx-primary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}',
      '.dsx-primary:disabled{opacity:.5;cursor:default;}',
      '.dsx-primary-inline{width:auto;height:30px;}',
      '.dsx-examples{display:flex;flex-direction:column;gap:6px;padding-top:4px;}',
      '.dsx-example{text-align:left;border:1px dashed var(--dsw-alias-border-l1);background:transparent;',
      'color:var(--dsw-alias-label-secondary);border-radius:7px;padding:7px 9px;font:inherit;font-size:11.5px;',
      'line-height:1.5;cursor:pointer;}',
      '.dsx-example:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);',
      'background:var(--dsw-alias-bg-layer-2);}',
      '.dsx-chips{display:flex;flex-wrap:wrap;gap:6px;}',
      '.dsx-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);',
      'background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:4px 10px;',
      'font:inherit;font-size:11.5px;cursor:pointer;line-height:1.4;}',
      '.dsx-chip:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsx-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.dsx-chip[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);',
      'border-color:var(--dsw-alias-brand-primary);}',
      '.dsx-history-section{padding-bottom:20px;}',
      '.dsx-count{font-size:10px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);',
      'border-radius:999px;padding:1px 6px;}',
      '.dsx-history{display:flex;flex-direction:column;gap:1px;}',
      '.dsx-history-row{display:flex;align-items:center;gap:8px;width:100%;padding:6px 7px;border:0;border-radius:6px;',
      'background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;text-align:left;cursor:pointer;}',
      '.dsx-history-row:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsx-history-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:0 0 auto;opacity:.75;}',
      '.dsx-history-label{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsx-history-time{font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}',
      '.dsx-empty-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.6;}',
      '.dsx-canvas{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;position:relative;overflow:hidden;}',
      '.dsx-canvas-scroll{flex:1 1 auto;overflow:auto;padding:26px 30px 34px;display:flex;justify-content:flex-start;align-items:flex-start;',
      'background-image:radial-gradient(circle,var(--dsw-alias-border-l1) 1px,transparent 1px);background-size:18px 18px;}',
      '.dsx-artboard-wrap{display:flex;flex-direction:column;gap:8px;flex:0 0 auto;margin:0 auto;}',
      '.dsx-comment-layer{position:absolute;inset:0;z-index:4;pointer-events:none;}',
      '.dsx-comment-mode{pointer-events:auto;cursor:crosshair;box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);}',
      '.dsx-comment-pin{position:absolute;width:18px;height:18px;border-radius:50% 50% 50% 3px;transform:translate(-6px,-18px);border:1px solid var(--dsw-alias-bg-base);background:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-label-primary-inverted);pointer-events:auto;cursor:pointer;padding:0;box-shadow:var(--dsw-shadow-lv2);}',
      '.dsx-comment-pin-active{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}',
      '.dsx-comment-pop{position:absolute;z-index:6;width:240px;transform:translate(-12px,14px);display:flex;flex-direction:column;gap:8px;padding:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:var(--dsw-shadow-lv3);}',
      '.dsx-comment-input{width:100%;height:70px;resize:vertical;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:6px 8px;}',
      '.dsx-comment-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.dsx-comment-text{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);word-break:break-word;}',
      '.dsx-comment-pop-actions{display:flex;justify-content:flex-end;gap:6px;}',
      '.dsx-comments{display:flex;flex-direction:column;gap:2px;}',
      '.dsx-comment-row{display:flex;align-items:center;gap:6px;}',
      '.dsx-comment-open{flex:1 1 auto;min-width:0;text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;padding:5px 6px;border-radius:5px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsx-comment-open:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsx-comment-delete{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px;border-radius:4px;cursor:pointer;display:inline-flex;}',
      '.dsx-comment-delete:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);}',
      '.dsx-compare{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;margin:0 auto;padding-bottom:8px;}',
      '.dsx-compare-cell{display:flex;flex-direction:column;gap:8px;}',
      '.dsx-compare-frame{position:relative;overflow:hidden;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:#fff;box-shadow:var(--dsw-shadow-lv2);}',
      '.dsx-compare-active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),var(--dsw-shadow-lv2);}',
      '.dsx-compare-hit{position:absolute;inset:0;border:0;background:transparent;cursor:pointer;padding:0;}',
      '.dsx-compare-hit:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);}',
      '.dsx-artboard-label{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.dsx-artboard-name{font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;',
      'white-space:nowrap;max-width:420px;}',
      '.dsx-artboard-meta{color:var(--dsw-alias-label-secondary);}',
      '.dsx-badge{font-size:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:1px 6px;color:var(--dsw-alias-label-secondary);}',
      '.dsx-artboard{position:relative;overflow:hidden;border-radius:10px;background:#fff;',
      'border:1px solid var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv2);flex:0 0 auto;}',
      '.dsx-frame{display:block;border:0;background:#fff;}',
      '.dsx-right{flex:0 0 272px;width:272px;overflow:auto;border-left:1px solid var(--dsw-alias-border-l1);}',
      '.dsx-field{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11.5px;',
      'color:var(--dsw-alias-label-secondary);min-height:28px;}',
      '.dsx-field-value{color:var(--dsw-alias-label-primary);font-size:11.5px;}',
      '.dsx-colorfield{display:flex;align-items:center;gap:6px;}',
      '.dsx-color{width:34px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;',
      'background:transparent;cursor:pointer;}',
      '.dsx-hex{width:74px;height:26px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;text-transform:lowercase;}',
      '.dsx-select{height:26px;max-width:150px;padding:0 6px;}',
      '.dsx-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;}',
      '.dsx-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;',
      'padding:5px 8px;cursor:pointer;}',
      '.dsx-seg button:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dsx-seg button[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsx-select:focus,.dsx-range:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.dsx-range{width:100%;accent-color:var(--dsw-alias-brand-primary);}',
      '.dsx-ratio{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;padding:1px 7px;border-radius:999px;',
      'border:1px solid currentColor;font-variant-numeric:tabular-nums;}',
      '.dsx-ratio-ok{color:var(--dsw-alias-state-success-primary);}',
      '.dsx-ratio-bad{color:var(--dsw-alias-state-error-primary);}',
      '.dsx-ratio-tag{opacity:.85;}',
      '.dsx-actions{display:flex;flex-wrap:wrap;gap:6px;}',
      '.dsx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 9px;',
      'border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:transparent;',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;}',
      '.dsx-btn:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dsx-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.dsx-btn-block{width:100%;}',
      '.dsx-about{padding:12px 14px 18px;font-size:10.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);}',
      '.dsx-drawer-btn{display:none !important;}',
      '.dsx-drawer-backdrop{display:none;}',
      '.dsx-toast{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);max-width:80%;',
      'background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);',
      'padding:7px 14px;border-radius:999px;font-size:12px;box-shadow:var(--dsw-shadow-lv2);z-index:20;}',
      '.dsx-dialog-backdrop{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;',
      'background:var(--dsw-alias-bg-mask-1);padding:24px;}',
      '.dsx-dialog{width:min(580px,100%);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;',
      'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv3);}',
      '.dsx-dialog-title{font-size:13px;font-weight:600;}',
      '.dsx-dialog-hint{margin:0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);}',
      '.dsx-code{width:100%;height:210px;resize:vertical;padding:9px 10px;border-radius:8px;',
      'border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);',
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.5;}',
      '.dsx-code:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.dsx-dialog-actions{display:flex;align-items:center;gap:8px;}',
      '@container dsx (max-width:1180px){.dsx-left{flex-basis:280px;width:280px;}.dsx-right{flex-basis:244px;width:244px;}}',
      '@container dsx (max-width:980px){.dsx-left{flex-basis:244px;width:244px;}.dsx-right{display:none;}}',
      '@container dsx (max-width:900px){.dsx-project-title{display:none;}.dsx-divider{display:none;}}',
      '@container dsx (max-width:640px){.dsx-brand span{display:none;}.dsx-seg{display:none;}}',
      '@container dsx (max-width:760px){.dsx-drawer-btn{display:inline-flex !important;}.dsx-left{display:none;position:absolute;left:0;top:52px;bottom:0;z-index:16;width:min(320px,88%);background:var(--dsw-alias-bg-layer-1);border-right:1px solid var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv3);}.dsx-left.dsx-left-open{display:flex;}.dsx-drawer-backdrop{display:block;position:absolute;inset:52px 0 0 0;z-index:15;background:var(--dsw-alias-bg-mask-2);}.dsx-toolbtn-label{display:none;}}',
    ].join('\n');

    /* ------------------------------------------------------------------ *
     * Plugin definition
     * ------------------------------------------------------------------ */
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        let t;
        try {
          const dictEn = STRINGS.en;
          const dictZh = STRINGS.zh;
          [
            ['en', dictEn],
            ['zh', dictZh],
            ['zh-CN', dictZh],
            ['zh-TW', dictZh],
            ['zh-Hans', dictZh],
          ].forEach((pair) => {
            try {
              ctx.effect(() => ctx.locale.register(LOCALE_NS, pair[0], pair[1]));
            } catch (error) {
              /* A host without this dictionary slot still renders English. */
            }
          });
          t = ctx.locale.bind(LOCALE_NS);
        } catch (error) {
          t = (key) => (STRINGS.en[key] !== undefined ? STRINGS.en[key] : key);
        }

        const panel = createDesignPanel(ctx, t);

        // `?panel=design-studio` deep link: one stable URL that opens this
        // panel directly. Browser tools and humans can share it; the Layout
        // service may not be ready at module load, so retry once on the next
        // tick.
        const openFromDeepLink = () => {
          let requested = null;
          try {
            requested = new URLSearchParams(window.location.search || '').get('panel');
          } catch (error) {
            return;
          }
          if (requested !== PANEL_ID) return;
          const select = () => {
            try {
              const layout = ctx.get('layout');
              if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID);
            } catch (error) {
              /* this surface has no panel layout */
            }
          };
          select();
          try {
            const timers = [150, 600, 1500].map((delay) => setTimeout(select, delay));
            ctx.effect(() => () => timers.forEach((timer) => clearTimeout(timer)));
          } catch (error) {
            /* timer service unavailable */
          }
        };
        openFromDeepLink();

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 5,
          label: () => t('panel.title'),
        }, function SidebarDesignStudioIcon(props) {
          return h(DesignStudioMark, { size: Number(props && props.size) || 16, active: Boolean(props && props.active) });
        }));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, panel));
      },
    };
  },
});
