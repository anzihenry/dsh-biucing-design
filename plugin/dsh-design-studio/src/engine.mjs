/**
 * DSH Design Studio — design synthesis engine.
 *
 * Turns (brief + template id + design tokens) into a complete, self-contained
 * HTML design document. Pure and deterministic: no DOM, no network, no clock,
 * no randomness. Everything visual is derived from the token set so the panel's
 * inspector can re-render a new look instantly.
 */

const TEMPLATE_IDS = ['landing', 'dashboard', 'mobile', 'pricing', 'poster', 'onepager', 'form'];

const COLOR_KEYS = ['accent', 'accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border'];

const FONTS = {
  sansDisplay: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  sansBody: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serifDisplay: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif',
  editorialBody: '"Avenir Next", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
  rounded: '"Avenir Next", "Trebuchet MS", "Segoe UI", -apple-system, Arial, sans-serif',
  brutalDisplay: '"Arial Black", "Helvetica Neue", "Arial Bold", Arial, sans-serif'
};

const TEMPLATE_META = {
  landing: {
    label: { en: 'Landing page', zh: '落地页' },
    hint: {
      en: 'Hero-led marketing page with proof, features and a call to action.',
      zh: '以首屏主视觉领衔，含信任背书、功能亮点与行动号召的营销页。'
    },
    brand: { name: 'Atelier North', mark: 'AN', tagline: 'Architecture, interiors and identity' },
    defaultHeadline: 'Places that hold light.',
    defaultLead: 'An independent studio shaping places, products and identities for people who care how things feel.'
  },
  dashboard: {
    label: { en: 'Dashboard', zh: '仪表盘' },
    hint: {
      en: 'App-shell analytics view with KPI cards, charts and a data table.',
      zh: '应用框架下的数据分析页，包含指标卡、图表与数据表。'
    },
    brand: { name: 'Northwind', mark: 'NW', tagline: 'Revenue intelligence' },
    defaultHeadline: 'Revenue overview',
    defaultLead: 'A live view of revenue, retention and the accounts that drive growth.'
  },
  mobile: {
    label: { en: 'Mobile app', zh: '移动应用' },
    hint: {
      en: 'Three phone-shaped artboards showing an onboarding flow.',
      zh: '三屏手机界面，完整呈现引导流程。'
    },
    brand: { name: 'Lumen', mark: 'LM', tagline: 'Movement, made calm' },
    defaultHeadline: 'A calmer first mile.',
    defaultLead: 'Onboarding for Lumen, a movement app that trades streaks for steady, sustainable progress.'
  },
  pricing: {
    label: { en: 'Pricing', zh: '定价页' },
    hint: {
      en: 'Three tiers, a billing toggle and a short FAQ.',
      zh: '三档套餐、计费周期切换与简短常见问题。'
    },
    brand: { name: 'Sable', mark: 'SB', tagline: 'The studio OS' },
    defaultHeadline: 'Simple pricing that scales with the work.',
    defaultLead: 'Start free, upgrade when the work grows. Every plan includes the full system and a real human on support.'
  },
  poster: {
    label: { en: 'Poster', zh: '海报' },
    hint: {
      en: 'Typographic poster with an editorial art direction.',
      zh: '以字体排印为主、带编辑设计感的海报。'
    },
    brand: { name: 'Ephemera', mark: 'EP', tagline: 'A quarterly of shapes and sounds' },
    defaultHeadline: 'Form & light',
    defaultLead: 'An evening of typography, sound and slow looking.'
  },
  onepager: {
    label: { en: 'One-pager', zh: '单页文档' },
    hint: {
      en: 'A structured document for a product, proposal or decision.',
      zh: '结构清晰的产品、提案或决策单页文档。'
    },
    brand: { name: 'Field Notes', mark: 'FN', tagline: 'Studio Meridian' },
    defaultHeadline: 'A quiet system for loud ideas.',
    defaultLead: 'A concise case for the next phase of the design system: what we are making, why now, and what it unlocks.'
  },
  form: {
    label: { en: 'Form', zh: '表单页' },
    hint: {
      en: 'Split-screen application or signup form with clear fields.',
      zh: '分屏布局的申请或注册表单，字段清晰。'
    },
    brand: { name: 'Meridian', mark: 'MD', tagline: 'Residency programme' },
    defaultHeadline: 'Make space for the work that matters.',
    defaultLead: 'A three-month residency for independent designers and small studios.'
  }
};

const TEMPLATE_KEYWORDS = [
  [
    'landing',
    ['landing page', 'landing', 'homepage', 'home page', 'website', 'web page', '官网', '首页', '落地页', '网站', '宣传页']
  ],
  [
    'dashboard',
    ['dashboard', 'analytics dashboard', 'admin panel', 'analytics', '仪表盘', '后台', '控制台', '数据面板', '数据看板']
  ],
  [
    'mobile',
    ['mobile app', 'mobile', 'app', 'onboarding', '引导页', '移动端', '移动应用', '手机', '小程序', '应用']
  ],
  ['pricing', ['pricing page', 'pricing', 'price page', '价格页', '价格', '定价', '套餐', '收费', '订阅价格']],
  ['poster', ['poster', 'cover design', '海报', '封面', '宣传海报']],
  ['onepager', ['one-pager', 'one pager', 'onepager', 'one page', '单页', '单页文档', '文档', '白皮书', '提案']],
  ['form', ['signup form', 'sign-up form', 'application form', 'form', 'signup', 'survey', 'questionnaire', '表单', '调查', '问卷', '注册表', '申请表']]
];

const STYLE_KEYWORDS = [
  ['minimal', ['minimalist', 'minimalistic', 'minimal', 'simple', 'clean', '极简', '简约', '简洁', '素雅']],
  ['editorial', ['editorial', 'magazine', 'serif', 'elegant', '杂志', '编辑', '排版', '优雅', '文艺']],
  ['nocturne', ['dark mode', 'dark', 'nocturne', 'midnight', 'night', '暗色', '夜间', '午夜', '深色', '赛博', '霓虹']],
  ['brutalist', ['brutalist', 'brutalism', 'bold', 'raw', 'gritty', '粗野', '野兽派', '大胆', '野性']],
  ['pastel', ['pastel', 'soft', 'playful', 'cute', '马卡龙', '柔和', '可爱', '粉彩', '低饱和']],
  ['enterprise', ['enterprise', 'corporate', 'professional', 'business', 'saas', '企业', '专业', '商务', '科技感']]
];

const DENSITY_UNIT = { compact: 6, regular: 8, airy: 10 };
const SCALE_BASE = { compact: 15, regular: 16, airy: 17 };
const DENSITIES = ['compact', 'regular', 'airy'];
const MODES = ['light', 'dark'];

const DEFAULT_TOKENS = () => ({
  mode: 'light',
  accent: '#111827',
  accentText: '#ffffff',
  bg: '#faf9f6',
  surface: '#ffffff',
  surfaceAlt: '#f1efea',
  text: '#171717',
  muted: '#6b6b66',
  border: '#e4e1da',
  fontDisplay: FONTS.sansDisplay,
  fontBody: FONTS.sansBody,
  radius: 6,
  density: 'regular',
  scale: 'regular'
});

function tokenSet(overrides) {
  return { ...DEFAULT_TOKENS(), ...overrides };
}

/* ------------------------------------------------------------------ */
/* text helpers                                                        */
/* ------------------------------------------------------------------ */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip signals that are dangerous to echo even as escaped text (the panel
 * requires that inline-handler substrings never survive) plus external URLs,
 * which a self-contained artifact must not carry.
 */
function cleanUserText(raw) {
  let s = String(raw == null ? '' : raw);
  s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ');
  s = s.replace(/\bon[a-z]+\s*=\s*/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  s = s.replace(/(?:https?:\/\/|www\.)\S+/gi, '');
  return s.replace(/\s+/g, ' ').trim();
}

function firstSentence(text) {
  const s = cleanUserText(text);
  if (!s) return '';
  const match = s.match(/^[\s\S]*?(?:[。！？!?；;]|\.(?=\s|$))/);
  let out = match ? match[0] : s;
  out = out.replace(/[。！？!?；;.,，、]+$/u, '').trim();
  return out;
}

const EN_FLUFF =
  /^(?:(?:please|kindly|hey|hi)[\s,]+)?(?:(?:can|could|would)\s+you\s+)?(?:i(?:'d| would)?\s+(?:like|want|need)\s+(?:you\s+)?to\s+)?(?:design|create|build|make|generate|craft|produce|draft|sketch|mock\s*up)\s+(?:me\s+)?(?:a|an|the|some)?\s*/i;
const ZH_FLUFF = /^(?:(?:帮我|请|麻烦你?|我想要?|我需要?)\s*)?(?:设计|制作|生成|做|画|构建|创建)(?:一个|一份|一张|个|份|张)?\s*/u;

function stripFluff(text) {
  let out = text.replace(EN_FLUFF, '').replace(ZH_FLUFF, '');
  out = out.replace(/^(?:a|an|the)\s+/i, '');
  return out.trim();
}

function capitalize(text) {
  if (!text) return text;
  return /^[a-z]/.test(text) ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function truncateText(text, max) {
  const chars = Array.from(String(text));
  if (chars.length <= max) return String(text).trim();
  let cut = chars.slice(0, max).join('');
  if (/[A-Za-z0-9]/.test(cut.slice(-1))) {
    const space = cut.lastIndexOf(' ');
    if (space > max * 0.55) cut = cut.slice(0, space);
  }
  return cut.replace(/[\s,;:.!?，；：。！？、]+$/u, '').trim();
}

const TYPE_PHRASE =
  /^(?:a|an|the)?\s*(?:landing\s+page|home\s*page|homepage|website|web\s*site|web\s*page|page|portfolio(?:\s+(?:site|website|page))?|dashboard|admin\s+panel|analytics\s+dashboard|analytics|mobile\s+(?:app|application)(?:\s+onboarding)?|app(?:lication)?(?:\s+onboarding)?|onboarding(?:\s+flow)?|pricing\s+page|pricing|price\s+page|poster|cover\s+design|one[-\s]?pager|one[-\s]?page(?:\s+document)?|form|sign\s*-?\s*up\s+form|application\s+form|survey|questionnaire|product\s+page|brand\s+page|menu)\s*(?:for|about|of|to\s+promote|promoting|showcasing|featuring|covering|on)\s+/i;

const MOOD_PREFIX =
  /^(?:minimal(?:ist(?:ic)?)?|dark\s+mode|dark|bold|editorial|pastel|enterprise|brutalist|elegant|clean|simple|modern|sleek|airy|soft|friendly|极简|简约|简洁|素雅|暗色|夜间|深色|粗野|马卡龙|柔和|可爱|企业|专业|商务|优雅|大胆)(?:风格|感)?(?:的)?\s+/i;

function subjectOf(lead) {
  let s = String(lead || '').trim();
  for (let pass = 0; pass < 4; pass += 1) {
    const before = s;
    s = s.replace(/^(?:a|an|the)\s+/i, '').replace(MOOD_PREFIX, '').trim();
    const match = s.match(TYPE_PHRASE);
    if (match) s = s.slice(match[0].length).trim();
    if (s === before) break;
  }
  if (/[\u3400-\u9fff]/.test(s)) {
    const stripped = s
      .replace(
        /(?:设计|制作|生成|创建|一个|一份|一张|官网|首页|落地页|网站|仪表盘|后台|移动应用|移动端|应用|价格页|定价页|价格|定价|套餐|海报|封面|单页文档|单页|文档|表单|调查问卷|问卷|调查|页面|风格|感|的|请|帮我)/gu,
        ''
      )
      .trim();
    if (Array.from(stripped).length < 2) return '';
    s = stripped;
  }
  const named = s.match(/\b(?:called|named)\s+([^,.;]+)/i);
  if (named) s = named[1].trim();
  s = s.replace(/\s+(?:based|located|situated)\s+in\b.*$/i, '').trim();
  return s;
}

function isInstructionalLead(lead) {
  const subject = subjectOf(lead);
  const whole = String(lead || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const core = subject.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!core) return true;
  return whole.length - core.length > Math.max(12, Math.round(whole.length * 0.35));
}

function deriveLead(brief, fallback) {
  const sentence = firstSentence(brief);
  if (!sentence) return fallback;
  let lead = stripFluff(sentence);
  if (!lead) lead = sentence;
  return truncateText(capitalize(lead), 150);
}

function deriveTitle(brief, fallback) {
  const lead = deriveLead(brief, '');
  if (!lead) return fallback;
  const subject = subjectOf(lead) || lead;
  return truncateText(capitalize(subject), 48) || fallback;
}

function deriveHero(brief, fallback) {
  const lead = deriveLead(brief, '');
  if (!lead) return fallback;
  const subject = subjectOf(lead);
  const line = subject.length >= 3 ? subject : fallback;
  return truncateText(line, 84);
}

function posterLines(title) {
  const source = String(title || '');
  if (/[\u3400-\u9fff]/.test(source)) {
    const cleaned = source.replace(/(?:海报|封面|设计|制作|生成|创建|一个|一份|一张)/gu, '').trim() || source;
    const chars = Array.from(cleaned).slice(0, 8);
    if (chars.length <= 4) return [chars.join('')];
    const half = Math.ceil(chars.length / 2);
    return [chars.slice(0, half).join(''), chars.slice(half).join('')];
  }
  const stop = new Set([
    'a', 'an', 'the', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with', 'at', 'by', 'from', 'my', 'our',
    'landing', 'page', 'website', 'webpage', 'homepage', 'home', 'mobile', 'app', 'application', 'dashboard',
    'pricing', 'price', 'poster', 'form', 'one', 'pager', 'onepager', 'onepage', 'design', 'designing',
    'create', 'creating', 'build', 'building', 'make', 'making', 'generate', 'brief', 'concept'
  ]);
  const words = source.replace(/[^\p{L}\p{N}\s&'-]/gu, ' ').split(/\s+/).filter(Boolean);
  let kept = words.filter((word) => !stop.has(word.toLowerCase()) && word.length > 1);
  if (!kept.length) kept = words.filter((word) => !stop.has(word.toLowerCase()));
  if (!kept.length) kept = ['FORM', 'LIGHT'];
  const upper = kept.slice(0, 4).map((word) => word.toUpperCase());
  if (upper.length === 1) return [upper[0]];
  if (upper.length === 2) return [upper[0], upper[1]];
  if (upper.length === 3) return [upper[0], `${upper[1]} ${upper[2]}`];
  return [`${upper[0]} ${upper[1]}`, `${upper[2]} ${upper[3]}`];
}

/* ------------------------------------------------------------------ */
/* token helpers                                                       */
/* ------------------------------------------------------------------ */

function normalizeHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value == null ? '' : value).trim());
  if (!match) return null;
  const body = match[1].toLowerCase();
  const full = body.length === 3 ? body.split('').map((c) => c + c).join('') : body;
  return `#${full}`;
}

function hexToRgb(hex) {
  const body = String(hex).replace('#', '');
  const full = body.length === 3 ? body.split('').map((c) => c + c).join('') : body;
  const number = parseInt(full, 16);
  if (!Number.isFinite(number)) return '0, 0, 0';
  return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
}

function clampNumber(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function sanitizeFont(value) {
  if (typeof value !== 'string') return '';
  const font = value
    .replace(/[<>{};\\]/g, ' ')
    .replace(/url\s*\(/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return font.slice(0, 160);
}

function normalizeTokens(input) {
  const source = input && typeof input === 'object' ? input : {};
  const tokens = DEFAULT_TOKENS();
  for (const key of COLOR_KEYS) {
    const hex = normalizeHex(source[key]);
    if (hex) tokens[key] = hex;
  }
  if (MODES.includes(source.mode)) tokens.mode = source.mode;
  const display = sanitizeFont(source.fontDisplay);
  const body = sanitizeFont(source.fontBody);
  if (display) tokens.fontDisplay = display;
  if (body) tokens.fontBody = body;
  tokens.radius = clampNumber(source.radius, 0, 28, tokens.radius);
  if (DENSITIES.includes(source.density)) tokens.density = source.density;
  if (DENSITIES.includes(source.scale)) tokens.scale = source.scale;
  return tokens;
}

/* ------------------------------------------------------------------ */
/* brief analysis                                                      */
/* ------------------------------------------------------------------ */

function keywordIndex(text, keyword) {
  const kw = keyword.toLowerCase();
  if (/^[\x20-\x7e]+$/.test(kw)) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(?:^|[^a-z0-9])(' + escaped + ')(?![a-z0-9])');
    const match = re.exec(text);
    return match ? match.index + match[0].indexOf(match[1]) : -1;
  }
  return text.indexOf(kw);
}

function firstMatch(text, groups) {
  let best = null;
  for (const [id, words] of groups) {
    for (const keyword of words) {
      const index = keywordIndex(text, keyword);
      if (index < 0) continue;
      if (!best || index < best.index) best = { id, index, keyword };
    }
  }
  return best;
}

function collectKeywords(text, groups) {
  const found = [];
  for (const [id, words] of groups) {
    for (const keyword of words) {
      const index = keywordIndex(text, keyword);
      if (index >= 0) found.push({ index, keyword: keyword.toLowerCase(), id });
    }
  }
  found.sort((a, b) => a.index - b.index || b.keyword.length - a.keyword.length);
  const out = [];
  for (const item of found) {
    if (!out.includes(item.keyword)) out.push(item.keyword);
  }
  return out.slice(0, 10);
}

function analyze(brief) {
  const raw = typeof brief === 'string' ? brief : brief == null ? '' : String(brief);
  const text = raw.toLowerCase();
  const templateMatch = firstMatch(text, TEMPLATE_KEYWORDS);
  const styleMatch = firstMatch(text, STYLE_KEYWORDS);
  const template = templateMatch ? templateMatch.id : 'landing';
  const styleId = styleMatch ? styleMatch.id : 'minimal';
  const keywords = collectKeywords(text, [...TEMPLATE_KEYWORDS, ...STYLE_KEYWORDS]);
  const title = deriveTitle(raw, TEMPLATE_META[template].label.en);
  const result = { template, styleId, title, keywords };
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(raw);
  if (hex) {
    const body = hex[1].toLowerCase();
    result.accent = `#${body.length === 3 ? body.split('').map((c) => c + c).join('') : body}`;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* style presets                                                       */
/* ------------------------------------------------------------------ */

function makeStyles() {
  return [
    {
      id: 'minimal',
      label: { en: 'Minimal', zh: '极简' },
      tokens: tokenSet({
        mode: 'light',
        accent: '#111827',
        accentText: '#ffffff',
        bg: '#faf9f6',
        surface: '#ffffff',
        surfaceAlt: '#f1efea',
        text: '#171717',
        muted: '#6b6b66',
        border: '#e4e1da',
        fontDisplay: FONTS.sansDisplay,
        fontBody: FONTS.sansBody,
        radius: 6,
        density: 'regular',
        scale: 'regular'
      })
    },
    {
      id: 'editorial',
      label: { en: 'Editorial', zh: '杂志编辑' },
      tokens: tokenSet({
        mode: 'light',
        accent: '#9f1239',
        accentText: '#ffffff',
        bg: '#f9f5ee',
        surface: '#fffdf8',
        surfaceAlt: '#f1e9dc',
        text: '#1c1917',
        muted: '#7c6f63',
        border: '#e3d8c8',
        fontDisplay: FONTS.serifDisplay,
        fontBody: FONTS.editorialBody,
        radius: 2,
        density: 'regular',
        scale: 'airy'
      })
    },
    {
      id: 'nocturne',
      label: { en: 'Nocturne', zh: '暗夜' },
      tokens: tokenSet({
        mode: 'dark',
        accent: '#8b5cf6',
        accentText: '#0b0716',
        bg: '#08070d',
        surface: '#12101c',
        surfaceAlt: '#1a1728',
        text: '#f4f1ff',
        muted: '#9d97b8',
        border: '#2b2740',
        fontDisplay: FONTS.sansDisplay,
        fontBody: FONTS.sansBody,
        radius: 14,
        density: 'airy',
        scale: 'regular'
      })
    },
    {
      id: 'brutalist',
      label: { en: 'Brutalist', zh: '粗野主义' },
      tokens: tokenSet({
        mode: 'light',
        accent: '#ff4d00',
        accentText: '#140700',
        bg: '#f4f2eb',
        surface: '#ffffff',
        surfaceAlt: '#e8e4d8',
        text: '#0b0b0b',
        muted: '#57534b',
        border: '#0b0b0b',
        fontDisplay: FONTS.brutalDisplay,
        fontBody: FONTS.mono,
        radius: 0,
        density: 'compact',
        scale: 'airy'
      })
    },
    {
      id: 'pastel',
      label: { en: 'Pastel', zh: '马卡龙' },
      tokens: tokenSet({
        mode: 'light',
        accent: '#d6336c',
        accentText: '#ffffff',
        bg: '#fdf4f7',
        surface: '#ffffff',
        surfaceAlt: '#fbe6ef',
        text: '#3d2233',
        muted: '#8f6b7f',
        border: '#f3d4e2',
        fontDisplay: FONTS.rounded,
        fontBody: FONTS.rounded,
        radius: 22,
        density: 'airy',
        scale: 'airy'
      })
    },
    {
      id: 'enterprise',
      label: { en: 'Enterprise', zh: '企业商务' },
      tokens: tokenSet({
        mode: 'light',
        accent: '#1d4ed8',
        accentText: '#ffffff',
        bg: '#f6f8fb',
        surface: '#ffffff',
        surfaceAlt: '#eef3f9',
        text: '#0f172a',
        muted: '#5b6b80',
        border: '#dbe3ec',
        fontDisplay: FONTS.sansDisplay,
        fontBody: FONTS.sansBody,
        radius: 8,
        density: 'compact',
        scale: 'compact'
      })
    }
  ];
}

/* ------------------------------------------------------------------ */
/* shared CSS                                                          */
/* ------------------------------------------------------------------ */

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}
html{font-size:var(--type-base);-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:1rem;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,h4,h5{font-family:var(--font-display);font-weight:700;line-height:1.06;letter-spacing:-.022em;margin:0;color:var(--text)}
p,ul,ol,blockquote,figure,dl,dd{margin:0}
ul,ol{padding:0;list-style:none}
a{color:inherit;text-decoration:none}
button,input,select,textarea{font:inherit;color:inherit}
svg{display:block}
::selection{background:var(--accent);color:var(--accent-text)}
.wrap{width:100%;max-width:var(--maxw);margin-left:auto;margin-right:auto;padding-left:clamp(20px,4vw,56px);padding-right:clamp(20px,4vw,56px)}
.eyebrow{font-size:.7rem;font-weight:650;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.muted{color:var(--muted)}
.display{font-family:var(--font-display)}
.lead{font-size:clamp(1.02rem,1.4vw,1.18rem);line-height:1.65;color:var(--muted);max-width:58ch}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;padding:calc(var(--u)*1.5) calc(var(--u)*2.5);border-radius:calc(var(--radius)*.8);border:1px solid transparent;background:var(--accent);color:var(--accent-text);font-family:var(--font-body);font-weight:650;font-size:.94rem;line-height:1;cursor:pointer;white-space:nowrap;text-align:center}
.btn:hover{opacity:.92}
.btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.btn.ghost{background:transparent;color:var(--text);border-color:var(--border)}
.btn.light{background:var(--accent-text);color:var(--accent)}
.btn.sm{padding:calc(var(--u)*1.05) calc(var(--u)*1.8);font-size:.84rem}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}
.tag{display:inline-flex;align-items:center;gap:.4em;padding:calc(var(--u)*.4) calc(var(--u)*1.1);border-radius:999px;border:1px solid var(--border);background:var(--surface);font-size:.74rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.tag.solid{background:var(--accent);color:var(--accent-text);border-color:transparent}
.rule{border:0;border-top:1px solid var(--border);margin:0}
.mark{width:calc(var(--u)*3.6);height:calc(var(--u)*3.6);min-width:calc(var(--u)*3.6);border-radius:calc(var(--radius)*.62);background:var(--accent);color:var(--accent-text);display:grid;place-items:center;font-family:var(--font-display);font-weight:800;font-size:.8rem;letter-spacing:-.03em;flex:none}
.brand{display:inline-flex;align-items:center;gap:.65rem;font-family:var(--font-display);font-weight:700;letter-spacing:-.02em;font-size:1.02rem;line-height:1.2}
.nav{display:flex;align-items:center;gap:var(--s3);padding-top:calc(var(--u)*2.6);padding-bottom:calc(var(--u)*2.6);border-bottom:1px solid var(--border)}
.nav-links{display:flex;align-items:center;gap:calc(var(--u)*3.2);margin-left:auto;font-size:.9rem;color:var(--muted)}
.nav-links a:hover{color:var(--text)}
.footer{border-top:1px solid var(--border);margin-top:calc(var(--u)*9);padding-top:calc(var(--u)*5);padding-bottom:calc(var(--u)*6);font-size:.86rem;color:var(--muted)}
.footer-grid{display:flex;justify-content:space-between;gap:var(--s5);flex-wrap:wrap}
.footer-brand{max-width:290px;display:flex;flex-direction:column;gap:var(--s2)}
.footer-brand p{font-size:.86rem;line-height:1.6;max-width:30ch}
.footer-col{display:flex;flex-direction:column;gap:.55rem;min-width:130px}
.footer-col .heading{font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:650;margin-bottom:.35rem}
.footer-col a:hover{color:var(--text)}
.footer-bottom{display:flex;justify-content:space-between;gap:var(--s3);flex-wrap:wrap;margin-top:var(--s5);padding-top:var(--s3);border-top:1px solid var(--border);font-size:.76rem}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.glyph{flex:none}
@media(max-width:760px){.nav-links{display:none}.nav .btn{margin-left:auto}.footer-grid{flex-direction:column;gap:var(--s4)}}
`;

/* ------------------------------------------------------------------ */
/* small building blocks                                               */
/* ------------------------------------------------------------------ */

const ICONS = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M6 18 18 6M9 6h9v9"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.4"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.4"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4"/>',
  chart: '<path d="M4 19V11M10 19V5M16 19v-5M22 19H2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.4a3 3 0 0 1 0 5.7M17.5 14.2c2 .5 3.2 2.1 3.6 4.8"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  file: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  arch: '<path d="M4 21V11a8 8 0 0 1 16 0v10"/><path d="M8 21v-9a4 4 0 0 1 8 0v9"/>',
  layers2: '<path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="m4 12.5 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z"/>',
  home: '<path d="m3.5 10.5 8.5-7 8.5 7V21h-6v-6h-5v6h-6V10.5Z"/>',
  activity: '<path d="M2 12h4l2.5-6 4 12 2.5-6H22"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z"/><circle cx="12" cy="10" r="2.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'
};

function icon(name, size) {
  const box = size || 20;
  return `<svg class="glyph" width="${box}" height="${box}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.arrow}</svg>`;
}

function mark(brand) {
  return `<span class="mark" aria-hidden="true">${escapeHtml(brand.mark)}</span>`;
}

function siteNav(brand, links, cta, ctaHref) {
  const navLinks = links.map((label) => `<a href="#">${escapeHtml(label)}</a>`).join('');
  const action = cta
    ? `<a class="btn sm" href="${ctaHref || '#'}">${escapeHtml(cta)}</a>`
    : '';
  return `<header class="nav wrap"><a class="brand" href="#">${mark(brand)}<span>${escapeHtml(brand.name)}</span></a><nav class="nav-links" aria-label="Primary">${navLinks}</nav>${action}</header>`;
}

function siteFooter(brand, columns, note) {
  const cols = columns
    .map(
      (column) =>
        `<div class="footer-col"><span class="heading">${escapeHtml(column.title)}</span>${column.links
          .map((label) => `<a href="#">${escapeHtml(label)}</a>`)
          .join('')}</div>`
    )
    .join('');
  return `<footer class="footer"><div class="wrap"><div class="footer-grid"><div class="footer-brand"><a class="brand" href="#">${mark(
    brand
  )}<span>${escapeHtml(brand.name)}</span></a><p>${escapeHtml(brand.tagline)}</p></div>${cols}</div><div class="footer-bottom"><span>${escapeHtml(
    note
  )}</span><span>Made with the Design Studio.</span></div></div></footer>`;
}

function sparkline(values) {
  const width = 120;
  const height = 34;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => ({
    x: Math.round((pad + (index * (width - pad * 2)) / (values.length - 1)) * 100) / 100,
    y: Math.round((height - pad - ((value - min) / span) * (height - pad * 2)) * 100) / 100
  }));
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${width - pad} ${height} L ${pad} ${height} Z`;
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${area}" fill="var(--accent-soft)" stroke="none"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ------------------------------------------------------------------ */
/* document assembly                                                   */
/* ------------------------------------------------------------------ */

function buildDocument(input) {
  const tokens = input.tokens;
  const unit = DENSITY_UNIT[tokens.density] || 8;
  const baseSize = SCALE_BASE[tokens.scale] || 16;
  const lang = /[\u3400-\u9fff]/.test(input.brief || '') ? 'zh-Hans' : 'en';
  const vars = [
    ':root{',
    `color-scheme:${tokens.mode};`,
    `--accent:${tokens.accent};`,
    `--accent-text:${tokens.accentText};`,
    `--accent-rgb:${hexToRgb(tokens.accent)};`,
    `--accent-text-rgb:${hexToRgb(tokens.accentText)};`,
    `--accent-soft:rgba(${hexToRgb(tokens.accent)},.1);`,
    `--bg:${tokens.bg};`,
    `--surface:${tokens.surface};`,
    `--surface-alt:${tokens.surfaceAlt};`,
    `--text:${tokens.text};`,
    `--text-rgb:${hexToRgb(tokens.text)};`,
    `--muted:${tokens.muted};`,
    `--border:${tokens.border};`,
    `--font-display:${tokens.fontDisplay};`,
    `--font-body:${tokens.fontBody};`,
    `--radius:${tokens.radius}px;`,
    `--r-sm:calc(var(--radius) * .55);`,
    `--r-lg:calc(var(--radius) * 1.45);`,
    `--u:${unit}px;`,
    `--type-base:${baseSize}px;`,
    '--s1:calc(var(--u) * 1);',
    '--s2:calc(var(--u) * 2);',
    '--s3:calc(var(--u) * 3);',
    '--s4:calc(var(--u) * 4);',
    '--s5:calc(var(--u) * 6);',
    '--s6:calc(var(--u) * 8);',
    '--maxw:1140px;',
    '--shadow:0 30px 80px -44px rgba(var(--text-rgb),.34);',
    '}'
  ].join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${tokens.mode}">
<title>${escapeHtml(input.title)}</title>
<style>
${vars}
${BASE_CSS}
${input.css}
</style>
</head>
<body class="tpl-${input.template}">
${input.body}
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* template: landing                                                   */
/* ------------------------------------------------------------------ */

function renderLanding(ctx) {
  const brand = TEMPLATE_META.landing.brand;
  const css = `.hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr);gap:calc(var(--u)*7);align-items:center;padding-top:calc(var(--u)*7);padding-bottom:calc(var(--u)*8)}
.hero h1{font-size:clamp(2.15rem,4.4vw,3.35rem);line-height:1.03;letter-spacing:-.04em;margin-top:var(--s3);max-width:26ch}
.hero .lead{margin-top:var(--s3);max-width:44ch}
.hero-actions{display:flex;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s4)}
.hero-stats{display:flex;gap:calc(var(--u)*4.5);margin-top:var(--s5);padding-top:var(--s4);border-top:1px solid var(--border);flex-wrap:wrap}
.hero-stats div{display:flex;flex-direction:column;gap:.1rem}
.hero-stats strong{font-family:var(--font-display);font-size:1.5rem;letter-spacing:-.02em;font-weight:700}
.hero-stats span{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.hero-art{position:relative;min-width:0}
.art-frame{position:relative;aspect-ratio:4/5;border-radius:var(--r-lg);background:var(--surface-alt);border:1px solid var(--border);overflow:hidden}
.art-frame::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(var(--text-rgb),.06) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--text-rgb),.06) 1px,transparent 1px);background-size:calc(var(--u)*5) calc(var(--u)*5);opacity:.75}
.art-arch{position:absolute;left:16%;right:16%;bottom:0;height:64%;background:linear-gradient(180deg,var(--accent),rgba(var(--accent-rgb),.6));border-radius:999px 999px 0 0;box-shadow:inset 0 0 0 1px rgba(var(--accent-text-rgb),.18)}
.art-orb{position:absolute;width:32%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 32% 28%,var(--accent),rgba(var(--accent-rgb),.3) 62%,transparent 74%);top:9%;left:7%;opacity:.9}
.art-ring{position:absolute;width:44%;aspect-ratio:1;border-radius:50%;border:1px solid rgba(var(--accent-rgb),.55);right:-8%;top:24%}
.art-chip{position:absolute;left:calc(var(--u)*2);bottom:calc(var(--u)*2);background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:calc(var(--u)*1.1) calc(var(--u)*1.5);display:flex;flex-direction:column;gap:.1rem;box-shadow:var(--shadow)}
.art-chip strong{font-family:var(--font-display);font-size:.82rem;line-height:1.3}
.art-chip span{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.art-chip.alt{left:auto;right:calc(var(--u)*2);bottom:auto;top:calc(var(--u)*2)}
.logos{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);flex-wrap:wrap;padding:calc(var(--u)*2.6) 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600}
.features{padding-top:calc(var(--u)*8)}
.section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s5);align-items:end;margin-bottom:calc(var(--u)*4)}
.section-head h2{font-size:clamp(1.7rem,2.8vw,2.3rem);letter-spacing:-.03em;max-width:18ch}
.section-head p{color:var(--muted);font-size:.95rem;max-width:38ch;justify-self:end}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--u)*2.2)}
.feature{padding:calc(var(--u)*3);display:flex;flex-direction:column;min-height:calc(var(--u)*23)}
.feature .num{font-size:.7rem;letter-spacing:.16em;color:var(--accent);font-weight:700}
.feature .glyph{color:var(--accent);margin-top:calc(var(--u)*2)}
.feature h3{font-size:1.16rem;margin-top:calc(var(--u)*1.2);letter-spacing:-.02em}
.feature p{margin-top:.55rem;color:var(--muted);font-size:.9rem;line-height:1.55;max-width:30ch}
.feature .arrow{margin-top:auto;padding-top:calc(var(--u)*2);color:var(--muted)}
.quote{border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-top:calc(var(--u)*8);padding-top:calc(var(--u)*7);padding-bottom:calc(var(--u)*7);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--s5);align-items:end}
.quote blockquote{font-family:var(--font-display);font-size:clamp(1.45rem,2.7vw,2.1rem);line-height:1.3;letter-spacing:-.03em;max-width:26ch}
.quote blockquote em{color:var(--accent);font-style:normal}
.quote cite{font-style:normal;color:var(--muted);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.cta-band{background:var(--accent);color:var(--accent-text);border-radius:var(--r-lg);padding:calc(var(--u)*4.5) calc(var(--u)*5);display:flex;align-items:center;justify-content:space-between;gap:var(--s5);flex-wrap:wrap;margin-top:calc(var(--u)*8)}
.cta-band h2{color:var(--accent-text);font-size:clamp(1.55rem,3vw,2.25rem);max-width:20ch;letter-spacing:-.03em}
.cta-band p{color:rgba(var(--accent-text-rgb),.74);font-size:.9rem;margin-top:.5rem}
@media (max-width:920px){.hero{grid-template-columns:1fr;gap:calc(var(--u)*5);padding-top:calc(var(--u)*5)}.hero-art{max-width:420px;order:2}.section-head{grid-template-columns:1fr;gap:var(--s2)}.section-head p{justify-self:start}.cards{grid-template-columns:1fr 1fr}.quote{grid-template-columns:1fr;gap:var(--s3)}}
@media (max-width:620px){.cards{grid-template-columns:1fr}.art-frame{aspect-ratio:1/1}.cta-band{padding:calc(var(--u)*3.4)}.hero h1{max-width:none}.hero{padding-bottom:calc(var(--u)*6)}}`;

  const features = [
    ['compass', '01', 'Spatial strategy', 'Positioning, feasibility and concept direction before a single wall moves.'],
    ['arch', '02', 'Interior systems', 'Materials, lighting and joinery resolved into rooms that age well.'],
    ['layers2', '03', 'Identity & launch', 'Naming, art direction and the quiet details that make a place legible.']
  ]
    .map(
      ([glyph, number, title, copy]) =>
        `<article class="feature card"><span class="num">${number}</span>${icon(glyph)}<h3>${title}</h3><p>${copy}</p><span class="arrow">${icon('arrowUp', 16)}</span></article>`
    )
    .join('');

  const body = `${siteNav(brand, ['Studio', 'Work', 'Journal', 'Contact'], 'Start a project')}
<section class="hero wrap">
  <div class="hero-copy">
    <p class="eyebrow">Independent studio · New York · Est. 2016</p>
    <h1>${escapeHtml(ctx.hero)}</h1>
    <p class="lead">We shape places, products and identities for people who care how things feel — with a small team, a long view, and a fondness for restraint.</p>
    <div class="hero-actions"><a class="btn" href="#">Start a project</a><a class="btn ghost" href="#">View selected work</a></div>
    <div class="hero-stats"><div><strong>120+</strong><span>Projects</span></div><div><strong>14</strong><span>Countries</span></div><div><strong>09</strong><span>Awards</span></div></div>
  </div>
  <div class="hero-art" aria-hidden="true">
    <div class="art-frame"><span class="art-orb"></span><span class="art-ring"></span><span class="art-arch"></span><span class="art-chip"><strong>Atrium House</strong><span>Lisbon · 2025</span></span><span class="art-chip alt"><strong>Est. 2016</strong><span>New York</span></span></div>
  </div>
</section>
<div class="wrap"><div class="logos"><span>Northwind</span><span>Lumen</span><span>Orbit</span><span>Meridian</span><span>Halo</span></div></div>
<section class="features wrap">
  <div class="section-head"><h2>A practice built around the long view.</h2><p>Three disciplines, one team. We keep the studio small so the thinking stays close to the work.</p></div>
  <div class="cards">${features}</div>
</section>
<section class="quote wrap"><blockquote>&ldquo;The best rooms don&rsquo;t announce themselves. They <em>settle</em> around you.&rdquo;</blockquote><cite>Mira Chen — Founding partner</cite></section>
<section class="wrap"><div class="cta-band"><div><h2>Let&rsquo;s make something enduring.</h2><p>Currently booking projects for spring 2027.</p></div><a class="btn light" href="#">Start a project</a></div></section>
${siteFooter(
    brand,
    [
      { title: 'Studio', links: ['About', 'Team', 'Journal'] },
      { title: 'Work', links: ['Archive', 'Process', 'Contact'] },
      { title: 'More', links: ['Careers', 'Press'] }
    ],
    `© 2026 ${brand.name}. All rights reserved.`
  )}`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: dashboard                                                 */
/* ------------------------------------------------------------------ */

function renderDashboard(ctx) {
  const brand = TEMPLATE_META.dashboard.brand;
  const css = `.app{display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100vh;align-items:start;align-content:start}
.side{position:sticky;top:0;min-height:100vh;background:var(--surface);border-right:1px solid var(--border);padding:calc(var(--u)*2.6) calc(var(--u)*2);display:flex;flex-direction:column;gap:calc(var(--u)*3.4);min-width:0}
.side-nav{display:flex;flex-direction:column;gap:calc(var(--u)*.5)}
.nav-item{display:flex;align-items:center;gap:.7rem;padding:calc(var(--u)*1.1) calc(var(--u)*1.3);border-radius:calc(var(--radius)*.6);color:var(--muted);font-size:.88rem;font-weight:500;white-space:nowrap}
.nav-item.active{background:var(--accent-soft);color:var(--text);font-weight:650}
.nav-item.active .glyph{color:var(--accent)}
.side-card{margin-top:auto;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius);padding:calc(var(--u)*1.8);display:flex;flex-direction:column;gap:.4rem}
.mini-label{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.side-card strong{font-size:.86rem;line-height:1.3}
.side-card .mini{font-size:.68rem;color:var(--muted)}
.track{height:5px;border-radius:999px;background:rgba(var(--text-rgb),.12);overflow:hidden;margin-top:.35rem}
.track span{display:block;height:100%;background:var(--accent);border-radius:inherit}
.side-user{display:flex;align-items:center;gap:.7rem;padding-top:calc(var(--u)*1.6);border-top:1px solid var(--border);font-size:.8rem}
.side-user div{display:flex;flex-direction:column;line-height:1.25}
.side-user span{color:var(--muted);font-size:.7rem}
.main{padding:calc(var(--u)*2.4) clamp(18px,3vw,38px) calc(var(--u)*6);min-width:0}
.topbar{display:flex;align-items:center;gap:var(--s3);justify-content:space-between;flex-wrap:wrap}
.search{display:flex;align-items:center;gap:.6rem;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:calc(var(--radius)*.7);padding:calc(var(--u)*1.1) calc(var(--u)*1.6);min-width:min(320px,42vw)}
.search input{border:0;background:transparent;outline:none;width:100%;font-size:.86rem;color:var(--text)}
.search input::placeholder{color:var(--muted)}
.topbar-actions{display:flex;align-items:center;gap:calc(var(--u)*1.2);margin-left:auto}
.avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--surface-alt);color:var(--text);font-size:.64rem;font-weight:700;border:1px solid var(--border);flex:none}
.avatar.lg{width:34px;height:34px;font-size:.7rem}
.page-head{margin-top:calc(var(--u)*3.4);padding-bottom:calc(var(--u)*2.4);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s3);flex-wrap:wrap}
.page-head h1{font-size:clamp(1.6rem,2.6vw,2.1rem);letter-spacing:-.03em;margin-top:.3rem}
.page-head p{font-size:.82rem;color:var(--muted);margin-top:.3rem}
.page-actions{display:flex;gap:calc(var(--u)*1);align-items:center}
.seg{display:inline-flex;padding:3px;border:1px solid var(--border);border-radius:999px;background:var(--surface);gap:2px}
.seg span{font-size:.72rem;padding:calc(var(--u)*.55) calc(var(--u)*1.1);border-radius:999px;color:var(--muted);font-weight:600}
.seg span.on{background:var(--text);color:var(--bg)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:calc(var(--u)*1.8);margin-top:calc(var(--u)*2.6)}
.kpi{padding:calc(var(--u)*2);display:flex;flex-direction:column;gap:.35rem;min-width:0}
.kpi-top{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.kpi-label{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.delta{font-size:.66rem;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--accent-soft);color:var(--text);white-space:nowrap}
.delta.down{background:var(--surface-alt);color:var(--muted)}
.kpi-value{font-family:var(--font-display);font-size:clamp(1.45rem,2.2vw,1.8rem);font-weight:700;letter-spacing:-.03em;line-height:1.1}
.kpi-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:.6rem;margin-top:.3rem}
.kpi-foot span{font-size:.66rem;color:var(--muted);line-height:1.45;max-width:14ch}
.spark{width:80px;height:28px;flex:none}
.dash-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:calc(var(--u)*1.8);margin-top:calc(var(--u)*1.8);align-items:stretch}
.panel{padding:calc(var(--u)*2.2);min-width:0}
.panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);margin-bottom:calc(var(--u)*2)}
.panel-head h2{font-size:1rem;letter-spacing:-.015em}
.panel-head p{font-size:.73rem;color:var(--muted);margin-top:.25rem}
.chart-flex{display:flex;gap:calc(var(--u)*1.4)}
.y-axis{height:180px;display:flex;flex-direction:column;justify-content:space-between;font-size:.6rem;color:var(--muted);padding:2px 0;flex:none;text-align:right;min-width:2.7rem}
.bars-area{flex:1;min-width:0;display:flex;flex-direction:column}
.bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:end;gap:calc(var(--u)*.8);height:180px;border-bottom:1px solid var(--border)}
.bar-col{display:flex;align-items:flex-end;justify-content:center;height:100%;min-width:0}
.bar{width:100%;max-width:32px;height:var(--h);background:var(--accent-soft);border-radius:calc(var(--radius)*.35) calc(var(--radius)*.35) 2px 2px}
.bar.hot{background:var(--accent)}
.x-axis{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:calc(var(--u)*.8);font-size:.58rem;color:var(--muted);margin-top:.55rem;text-align:center}
.channels{display:flex;flex-direction:column;gap:calc(var(--u)*1.7);margin-top:calc(var(--u)*2.4)}
.ch-top{display:flex;justify-content:space-between;font-size:.79rem;margin-bottom:.4rem}
.ch-top strong{font-weight:650}
.ch-track{height:6px;background:var(--surface-alt);border-radius:999px;overflow:hidden}
.ch-track span{display:block;height:100%;background:var(--accent);border-radius:999px;opacity:.88}
.panel-note{display:flex;gap:.55rem;align-items:flex-start;font-size:.72rem;color:var(--muted);margin-top:calc(var(--u)*2.4);padding-top:calc(var(--u)*1.6);border-top:1px solid var(--border);line-height:1.5}
.dot{width:6px;height:6px;border-radius:50%;background:var(--accent);margin-top:.42em;flex:none}
.table-card{grid-column:1/-1}
.table-wrap{overflow-x:auto}
table.table{width:100%;border-collapse:collapse;font-size:.83rem;min-width:540px}
.table th{text-align:left;font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:650;padding:0 var(--s2) var(--s2);border-bottom:1px solid var(--border);white-space:nowrap}
.table td{padding:calc(var(--u)*1.5) var(--s2);border-bottom:1px solid var(--border);vertical-align:middle;white-space:nowrap}
.table tr:last-child td{border-bottom:0}
.table th:first-child,.table td:first-child{padding-left:0}
.table th:last-child,.table td:last-child{padding-right:0;text-align:right}
.acct{display:flex;align-items:center;gap:.7rem;font-weight:600}
.status{display:inline-flex;padding:3px 9px;border-radius:999px;font-size:.66rem;font-weight:650;border:1px solid var(--border)}
.status.paid{background:var(--accent);color:var(--accent-text);border-color:transparent}
.status.pending{background:var(--surface-alt);color:var(--text)}
.status.review{background:transparent;color:var(--muted)}
@media(max-width:1080px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dash-grid{grid-template-columns:1fr}}
@media(max-width:900px){.app{grid-template-columns:1fr}.side{position:static;min-height:0;border-right:0;border-bottom:1px solid var(--border);flex-direction:row;align-items:center;flex-wrap:wrap;gap:calc(var(--u)*1.4);padding:calc(var(--u)*1.6) calc(var(--u)*2);overflow:visible;width:100%}.side-nav{flex-direction:row;flex-wrap:wrap;gap:.3rem}.nav-item{padding:calc(var(--u)*.8) calc(var(--u)*1.1);font-size:.8rem}.side-card,.side-user{display:none}.main{padding-top:calc(var(--u)*2.2)}}
@media(max-width:640px){.search{min-width:0;flex:1}.topbar-actions .tag{display:none}.kpis{grid-template-columns:1fr 1fr}.col-plan,.col-date{display:none}.page-head .seg{display:none}.page-head h1{font-size:1.5rem}.kpi-label{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.3}table.table{min-width:0}.table th,.table td{padding-left:6px;padding-right:6px}}
@media(max-width:420px){.spark{display:none}.kpi{padding:calc(var(--u)*1.7)}.main{padding-left:14px;padding-right:14px}}`;

  const navItems = [
    ['grid', 'Overview', true],
    ['chart', 'Revenue', false],
    ['users', 'Customers', false],
    ['layers', 'Pipeline', false],
    ['file', 'Reports', false]
  ]
    .map(
      ([glyph, label, active]) =>
        `<a class="nav-item${active ? ' active' : ''}" href="#">${icon(glyph, 17)}<span>${label}</span></a>`
    )
    .join('');

  const kpis = [
    ['Revenue', '$128.4k', '+12.6%', 'vs. $114.1k last month', [24, 28, 26, 32, 30, 36, 41, 39, 46, 50, 55, 61], false],
    ['Active accounts', '1,284', '+4.2%', '86 new this month', [40, 42, 41, 45, 44, 48, 51, 50, 54, 56, 58, 61], false],
    ['Net retention', '112%', '+2.1 pts', 'Expansion-led growth', [50, 49, 52, 51, 55, 54, 58, 57, 60, 62, 61, 64], false],
    ['Monthly churn', '1.8%', '−0.4 pts', 'Best in eight months', [60, 58, 59, 55, 54, 52, 50, 49, 47, 45, 43, 41], true]
  ]
    .map(
      ([label, value, delta, foot, points, down]) =>
        `<article class="kpi card"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="delta${down ? ' down' : ''}">${delta}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot"><span>${foot}</span>${sparkline(points)}</div></article>`
    )
    .join('');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const barHeights = [42, 48, 45, 55, 58, 54, 63, 67, 64, 72, 78, 86];
  const bars = barHeights
    .map(
      (height, index) =>
        `<div class="bar-col"><div class="bar${index === barHeights.length - 1 ? ' hot' : ''}" style="--h:${height}%"></div></div>`
    )
    .join('');
  const xAxis = months.map((month) => `<span>${month}</span>`).join('');

  const channels = [
    ['Organic search', '42%', 42],
    ['Referrals', '27%', 27],
    ['Paid campaigns', '18%', 18],
    ['Partners', '13%', 13]
  ]
    .map(
      ([label, value, width]) =>
        `<li><div class="ch-top"><span>${label}</span><strong>${value}</strong></div><div class="ch-track"><span style="width:${width}%"></span></div></li>`
    )
    .join('');

  const rows = [
    ['HL', 'Halcyon Labs', 'Growth', '$4,800', 'paid', 'Sep 28'],
    ['MC', 'Meridian Co.', 'Scale', '$2,400', 'paid', 'Sep 27'],
    ['NS', 'Northstar Studio', 'Growth', '$1,200', 'pending', 'Sep 27'],
    ['OG', 'Onda Group', 'Starter', '$480', 'paid', 'Sep 26'],
    ['FW', 'Fieldwork', 'Scale', '$2,400', 'review', 'Sep 25']
  ]
    .map(
      ([initials, name, plan, amount, status, date]) =>
        `<tr><td><span class="acct"><span class="avatar">${initials}</span>${name}</span></td><td class="col-plan">${plan}</td><td>${amount}</td><td><span class="status ${status}">${status === 'paid' ? 'Paid' : status === 'pending' ? 'Pending' : 'In review'}</span></td><td class="col-date">${date}</td></tr>`
    )
    .join('');

  const body = `<div class="app">
  <aside class="side">
    <a class="brand" href="#">${mark(brand)}<span>${escapeHtml(brand.name)}</span></a>
    <nav class="side-nav" aria-label="Workspace">${navItems}</nav>
    <div class="side-card"><span class="mini-label">Workspace</span><strong>Studio plan</strong><div class="track"><span style="width:72%"></span></div><span class="mini">18 of 25 seats used</span></div>
    <div class="side-user"><span class="avatar">AC</span><div><strong>Ana Chen</strong><span>Admin</span></div></div>
  </aside>
  <main class="main">
    <div class="topbar">
      <div class="search">${icon('search', 16)}<input type="text" aria-label="Search metrics" placeholder="Search metrics, reports…"></div>
      <div class="topbar-actions"><span class="tag">Last 30 days</span><button class="btn sm" type="button">${icon('plus', 14)} New report</button><span class="avatar lg">AC</span></div>
    </div>
    <header class="page-head">
      <div><p class="eyebrow">Workspace / Overview</p><h1>Revenue overview</h1><p>All figures in USD · Updated 4 minutes ago</p></div>
      <div class="page-actions"><div class="seg"><span>7D</span><span class="on">30D</span><span>90D</span></div><button class="btn ghost sm" type="button">Export</button></div>
    </header>
    <section class="kpis" aria-label="Key metrics">${kpis}</section>
    <div class="dash-grid">
      <section class="panel card"><div class="panel-head"><div><h2>Revenue trend</h2><p>Monthly recurring revenue · last 12 months</p></div><div class="seg"><span>MRR</span><span class="on">ARR</span></div></div><div class="chart-flex"><div class="y-axis"><span>$140k</span><span>$105k</span><span>$70k</span><span>$35k</span><span>$0</span></div><div class="bars-area"><div class="bars">${bars}</div><div class="x-axis">${xAxis}</div></div></div></section>
      <section class="panel card"><div class="panel-head"><div><h2>Acquisition</h2><p>Share of new revenue</p></div></div><ul class="channels">${channels}</ul><div class="panel-note"><span class="dot"></span><span>Referral revenue is up 8.4% this quarter, led by studio partnerships.</span></div></section>
      <section class="panel card table-card"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest customer payments and renewals</p></div><a class="tag" href="#">View all</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Account</th><th class="col-plan">Plan</th><th>Amount</th><th>Status</th><th class="col-date">Date</th></tr></thead><tbody>${rows}</tbody></table></div></section>
    </div>
  </main>
</div>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: mobile                                                    */
/* ------------------------------------------------------------------ */

function renderMobile(ctx) {
  const brand = TEMPLATE_META.mobile.brand;
  const css = `.mobile-page{padding-bottom:calc(var(--u)*6);background:radial-gradient(120% 70% at 50% -10%, var(--accent-soft), transparent 62%)}
.mobile-head{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s4);padding-top:calc(var(--u)*6);padding-bottom:calc(var(--u)*5);flex-wrap:wrap}
.mobile-head h1{font-size:clamp(1.9rem,3.5vw,2.8rem);letter-spacing:-.035em;max-width:22ch;margin-top:var(--s2)}
.mobile-head .lead{margin-top:var(--s2);max-width:50ch}
.mobile-head .meta{display:flex;flex-direction:column;gap:.4rem;align-items:flex-end;text-align:right;font-size:.68rem;color:var(--muted);letter-spacing:.12em;text-transform:uppercase}
.phones{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--u)*3);align-items:start;justify-items:center}
.phone{width:100%;max-width:330px;background:var(--surface);border:1px solid var(--border);border-radius:calc(var(--radius)*1.8 + 22px);padding:calc(var(--u)*1.1);box-shadow:var(--shadow)}
.screen{position:relative;background:var(--bg);border-radius:calc(var(--radius)*1.8 + 13px);overflow:hidden;aspect-ratio:9/19.4;padding:calc(var(--u)*1.6);display:flex;flex-direction:column;gap:calc(var(--u)*1.4)}
.screen::before{content:"";position:absolute;top:8px;left:50%;transform:translateX(-50%);width:30%;height:15px;background:rgba(var(--text-rgb),.82);border-radius:999px;z-index:2}
.status{display:flex;justify-content:space-between;align-items:center;font-size:.62rem;font-weight:650;padding-top:calc(var(--u)*1.2);color:var(--text);opacity:.7}
.sig{display:flex;gap:2px;align-items:flex-end}
.sig i{display:block;width:3px;background:currentColor;border-radius:1px}
.sig i:nth-child(1){height:4px}.sig i:nth-child(2){height:6px}.sig i:nth-child(3){height:9px}
.top-row{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:calc(var(--u)*.5)}
.s-brand{display:inline-flex;align-items:center;gap:.45rem;font-size:.64rem;font-weight:750;letter-spacing:.22em;text-transform:uppercase}
.s-brand .mark{width:22px;height:22px;min-width:22px;font-size:.52rem;border-radius:calc(var(--radius)*.5)}
.s-back{width:26px;height:26px;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;color:var(--muted)}
.s-back .glyph{transform:rotate(180deg)}
.s-step{font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.screen h2{font-size:clamp(1.26rem,2.2vw,1.58rem);line-height:1.1;letter-spacing:-.035em}
.s-copy{font-size:.75rem;line-height:1.55;color:var(--muted)}
.spacer{flex:1}
.hero-art-m{position:relative;border-radius:calc(var(--radius)*1.1);height:calc(var(--u)*15);background:var(--surface-alt);overflow:hidden;border:1px solid var(--border);margin-top:calc(var(--u)*.5)}
.hero-art-m::before{content:"";position:absolute;width:58%;aspect-ratio:1;border-radius:50%;right:-8%;top:12%;background:radial-gradient(circle at 38% 32%,var(--accent),rgba(var(--accent-rgb),.25) 66%,transparent 74%)}
.hero-art-m::after{content:"";position:absolute;left:12%;bottom:-26%;width:62%;aspect-ratio:1;border-radius:50%;border:1px solid rgba(var(--accent-rgb),.42)}
.dots{display:flex;gap:.35rem;align-items:center}
.dots i{display:block;width:6px;height:6px;border-radius:999px;background:rgba(var(--text-rgb),.18)}
.dots i.on{background:var(--accent);width:18px}
.screen .btn{width:100%;padding:calc(var(--u)*1.4) calc(var(--u)*1.8);font-size:.8rem}
.s-link{text-align:center;font-size:.66rem;color:var(--muted);margin-top:.1rem}
.s-link b{color:var(--text);font-weight:650}
.opt{display:flex;gap:calc(var(--u)*1.2);align-items:center;border:1px solid var(--border);border-radius:var(--r-sm);padding:calc(var(--u)*1.3);background:var(--surface)}
.opt.on{border-color:var(--accent);background:var(--accent-soft)}
.opt .radio{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center;flex:none;color:var(--accent-text)}
.opt.on .radio{background:var(--accent);border-color:var(--accent)}
.opt .radio::after{content:"";width:5px;height:5px;border-radius:50%;background:currentColor;display:none}
.opt.on .radio::after{display:block}
.opt div{display:flex;flex-direction:column;gap:.1rem;min-width:0}
.opt strong{font-size:.78rem;line-height:1.3}
.opt span{font-size:.62rem;color:var(--muted);line-height:1.35}
.opt.on span{color:var(--text);opacity:.72}
.ring-wrap{display:flex;align-items:center;gap:calc(var(--u)*2);margin-top:calc(var(--u)*.8)}
.ring{width:84px;aspect-ratio:1;border-radius:50%;background:conic-gradient(var(--accent) 0 68%, rgba(var(--text-rgb),.1) 68% 100%);display:grid;place-items:center;position:relative;flex:none}
.ring::after{content:"";position:absolute;inset:8px;border-radius:50%;background:var(--bg)}
.ring b{position:relative;z-index:1;font-family:var(--font-display);font-size:1rem;letter-spacing:-.02em}
.r-copy{display:flex;flex-direction:column;gap:.2rem;min-width:0}
.r-copy strong{font-size:.78rem}
.r-copy span{font-size:.64rem;color:var(--muted);line-height:1.4}
.practice{display:flex;flex-direction:column;gap:calc(var(--u)*1);margin-top:calc(var(--u)*.6)}
.p-item{display:flex;align-items:center;gap:.7rem;padding:calc(var(--u)*1.1);border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface)}
.p-ic{width:28px;height:28px;border-radius:calc(var(--radius)*.5);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:none}
.p-txt{display:flex;flex-direction:column;gap:.05rem;min-width:0}
.p-txt strong{font-size:.7rem;line-height:1.3}
.p-txt span{font-size:.58rem;color:var(--muted)}
.play{margin-left:auto;color:var(--muted)}
.streak{display:flex;align-items:center;gap:.4rem;font-size:.62rem;color:var(--muted);margin-top:.15rem}
.streak b{color:var(--text)}
.tabbar{margin-top:auto;display:flex;justify-content:space-around;padding-top:calc(var(--u)*1.1);border-top:1px solid var(--border);color:var(--muted)}
.tabbar .active{color:var(--accent)}
.tabbar .glyph{opacity:.75}
.greet{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.g-copy{display:flex;flex-direction:column;gap:.1rem}
.g-copy span{font-size:.56rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.g-copy strong{font-family:var(--font-display);font-size:.84rem;letter-spacing:-.02em}
.avatar-sm{width:26px;height:26px;border-radius:50%;background:var(--surface-alt);border:1px solid var(--border);display:grid;place-items:center;font-size:.54rem;font-weight:700}
.s-label{font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
@media(max-width:1000px){.phones{gap:calc(var(--u)*2)}}
@media(max-width:900px){.phones{grid-template-columns:1fr;gap:calc(var(--u)*4)}.phone{max-width:360px}.mobile-head .meta{align-items:flex-start;text-align:left}.mobile-head{padding-top:calc(var(--u)*5)}}
@media(max-width:480px){.phone{padding:calc(var(--u)*.9)}.screen{padding:calc(var(--u)*1.3)}}`;

  const statusBar = `<div class="status"><span>9:41</span><span class="sig"><i></i><i></i><i></i></span></div>`;
  const screenOne = `<div class="phone"><div class="screen">
  ${statusBar}
  <div class="top-row"><span class="s-brand"><span class="mark" aria-hidden="true">L</span> Lumen</span><span class="s-step">01 / 03</span></div>
  <div class="hero-art-m" aria-hidden="true"></div>
  <h2>Move with intention.</h2>
  <p class="s-copy">Small sessions, built around your energy — not a leaderboard. Ten minutes is enough to begin.</p>
  <div class="spacer"></div>
  <div class="dots"><i class="on"></i><i></i><i></i></div>
  <button class="btn" type="button">Get started</button>
  <p class="s-link">Already have an account? <b>Sign in</b></p>
</div></div>`;
  const screenTwo = `<div class="phone"><div class="screen">
  ${statusBar}
  <div class="top-row"><span class="s-back">${icon('arrow', 14)}</span><span class="s-step">Step 1 of 3</span></div>
  <span class="s-label">Your focus</span>
  <h2>What would you like more of?</h2>
  <p class="s-copy">Pick a starting point. You can change it any time.</p>
  <div class="practice">
    <div class="opt on"><span class="radio"></span><div><strong>Steady energy</strong><span>10 min daily · gentle strength</span></div></div>
    <div class="opt"><span class="radio"></span><div><strong>A calmer mind</strong><span>Breath-led sessions</span></div></div>
    <div class="opt"><span class="radio"></span><div><strong>Deeper sleep</strong><span>Evening wind-down</span></div></div>
  </div>
  <div class="spacer"></div>
  <button class="btn" type="button">Continue</button>
</div></div>`;
  const screenThree = `<div class="phone"><div class="screen">
  ${statusBar}
  <div class="greet"><div class="g-copy"><span>Wednesday, 8:12</span><strong>Good morning, Ana</strong></div><span class="avatar-sm">AC</span></div>
  <div class="ring-wrap"><div class="ring"><b>68%</b></div><div class="r-copy"><strong>Weekly goal</strong><span>Three sessions to go. Keep it easy.</span></div></div>
  <span class="s-label">Today&rsquo;s practice</span>
  <div class="practice">
    <div class="p-item"><span class="p-ic">${icon('activity', 14)}</span><div class="p-txt"><strong>Morning flow</strong><span>12 min · mobility</span></div><span class="play">${icon('play', 18)}</span></div>
    <div class="p-item"><span class="p-ic">${icon('sun', 14)}</span><div class="p-txt"><strong>Evening reset</strong><span>8 min · breath</span></div><span class="play">${icon('play', 18)}</span></div>
  </div>
  <div class="streak">${icon('sun', 13)}<span><b>5-day streak</b> — a steady week</span></div>
  <div class="spacer"></div>
  <div class="tabbar"><span class="active">${icon('home', 18)}</span><span>${icon('compass', 18)}</span><span>${icon('activity', 18)}</span><span>${icon('user', 18)}</span></div>
</div></div>`;

  const eyebrow = ctx.brief.trim()
    ? `Mobile concept · ${truncateText(ctx.title, 30)}`
    : 'Mobile concept · Onboarding';
  const intro = isInstructionalLead(ctx.lead)
    ? 'Onboarding for Lumen, a movement app that trades streaks for steady progress — three screens, one calm first step.'
    : escapeHtml(ctx.lead);
  const body = `<main class="mobile-page">
  <header class="mobile-head wrap"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(TEMPLATE_META.mobile.defaultHeadline)}</h1><p class="lead">${intro}</p></div><div class="meta"><span>Three screens</span><span>iOS · 390 × 844</span></div></header>
  <div class="phones wrap">${screenOne}${screenTwo}${screenThree}</div>
</main>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: pricing                                                   */
/* ------------------------------------------------------------------ */

function renderPricing(ctx) {
  const brand = TEMPLATE_META.pricing.brand;
  const css = `.pricing-head{max-width:660px;margin:0 auto;text-align:center;padding-top:calc(var(--u)*6);padding-bottom:calc(var(--u)*4)}
.pricing-head h1{font-size:clamp(2.1rem,4vw,3.05rem);letter-spacing:-.04em;margin-top:var(--s2)}
.pricing-head .lead{margin:var(--s2) auto 0;max-width:54ch}
.billing{display:inline-flex;padding:4px;border:1px solid var(--border);border-radius:999px;background:var(--surface);margin-top:var(--s4);gap:2px}
.billing span{padding:calc(var(--u)*.7) calc(var(--u)*1.6);border-radius:999px;font-size:.8rem;font-weight:600;color:var(--muted)}
.billing span.on{background:var(--text);color:var(--bg)}
.billing span em{font-style:normal;color:inherit;opacity:.7;font-size:.7rem;margin-left:.3em}
.plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--u)*2.2);align-items:stretch;margin-top:calc(var(--u)*3)}
.plan{position:relative;display:flex;flex-direction:column;padding:calc(var(--u)*3);background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg)}
.plan h3{font-size:1rem;letter-spacing:.01em;font-family:var(--font-display)}
.plan .blurb{color:var(--muted);font-size:.86rem;margin-top:.4rem;min-height:2.9em;line-height:1.5}
.plan .price{display:flex;align-items:baseline;gap:.35rem;margin:calc(var(--u)*2.2) 0 var(--s1)}
.plan .price strong{font-family:var(--font-display);font-size:clamp(2.1rem,3vw,2.7rem);letter-spacing:-.045em;line-height:1}
.plan .price span{color:var(--muted);font-size:.82rem}
.plan ul{display:flex;flex-direction:column;gap:calc(var(--u)*1.05);margin:calc(var(--u)*2) 0 calc(var(--u)*2.4);font-size:.86rem;line-height:1.45}
.plan li{display:flex;gap:.6rem;align-items:flex-start}
.plan li .glyph{color:var(--accent);margin-top:.2em;width:14px;height:14px}
.plan .btn{width:100%;margin-top:auto}
.plan.featured{background:var(--accent);border-color:var(--accent);color:var(--accent-text);box-shadow:var(--shadow)}
.plan.featured h3{color:var(--accent-text)}
.plan.featured .blurb,.plan.featured .price span{color:rgba(var(--accent-text-rgb),.74)}
.plan.featured li{color:var(--accent-text)}
.plan.featured li .glyph{color:var(--accent-text)}
.plan.featured .btn{background:var(--accent-text);color:var(--accent)}
.plan-badge{position:absolute;top:calc(var(--u)*1.7);right:calc(var(--u)*1.7);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;font-weight:700;background:var(--accent-text);color:var(--accent);padding:calc(var(--u)*.45) calc(var(--u)*1);border-radius:999px}
.pricing-note{text-align:center;margin-top:var(--s3);color:var(--muted);font-size:.76rem}
.trust{display:flex;justify-content:center;gap:var(--s4);flex-wrap:wrap;margin-top:calc(var(--u)*5);padding-top:calc(var(--u)*3);border-top:1px solid var(--border);font-size:.72rem;color:var(--muted);letter-spacing:.04em}
.trust span{display:inline-flex;align-items:center;gap:.4rem}
.trust .glyph{color:var(--accent)}
.faq{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:var(--s5);padding-top:calc(var(--u)*7);border-top:1px solid var(--border);margin-top:calc(var(--u)*6)}
.faq-head h2{font-size:clamp(1.5rem,2.4vw,2rem);letter-spacing:-.03em}
.faq-head p{color:var(--muted);font-size:.88rem;margin-top:.5rem;max-width:30ch}
.faq-list{display:flex;flex-direction:column}
.faq-item{padding:calc(var(--u)*1.7) 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:var(--s3);align-items:center}
.faq-item:first-child{border-top:1px solid var(--border)}
.faq-item h3{font-size:.94rem;font-weight:600;font-family:var(--font-body);letter-spacing:0;line-height:1.4}
.faq-item .plus{color:var(--muted);flex:none;font-size:1.05rem;line-height:1}
@media(max-width:900px){.plans{grid-template-columns:1fr;max-width:520px;margin-left:auto;margin-right:auto}.faq{grid-template-columns:1fr;gap:var(--s4);padding-top:calc(var(--u)*5)}}
@media(max-width:520px){.billing span{padding:calc(var(--u)*.6) calc(var(--u)*1.2);font-size:.74rem}.trust{gap:var(--s3)}.plan{padding:calc(var(--u)*2.4)}}`;

  const plans = [
    {
      name: 'Starter',
      blurb: 'For solo designers finding their rhythm.',
      price: '$19',
      cta: 'Choose Starter',
      featured: false,
      features: ['3 active projects', 'Core component library', '7-day version history', 'Community support']
    },
    {
      name: 'Studio',
      blurb: 'For small teams with big ambitions.',
      price: '$49',
      cta: 'Choose Studio',
      featured: true,
      features: ['Unlimited projects', 'Full token library & theming', '90-day version history', 'Priority support', 'Shared review links']
    },
    {
      name: 'Scale',
      blurb: 'For studios with a growing roster.',
      price: '$99',
      cta: 'Talk to sales',
      featured: false,
      features: ['Everything in Studio', 'SSO & role permissions', 'Design system audits', 'Dedicated success manager']
    }
  ]
    .map(
      (plan) => `<article class="plan${plan.featured ? ' featured' : ''}">${plan.featured ? '<span class="plan-badge">Most popular</span>' : ''}<h3>${plan.name}</h3><p class="blurb">${plan.blurb}</p><div class="price"><strong>${plan.price}</strong><span>/ month</span></div><ul>${plan.features
        .map((feature) => `<li>${icon('check', 14)}<span>${feature}</span></li>`)
        .join('')}</ul><button class="btn${plan.featured ? '' : ' ghost'}" type="button">${plan.cta}</button></article>`
    )
    .join('');

  const faq = [
    ['Can I switch plans later?', 'Yes — upgrades apply immediately and we prorate the difference.'],
    ['What counts as an active project?', 'Any project edited in the last 30 days. Archived projects are always free.'],
    ['Do you offer education discounts?', 'Students and non-profits get 40% off the Studio plan.']
  ]
    .map(([question]) => `<div class="faq-item"><h3>${question}</h3><span class="plus" aria-hidden="true">+</span></div>`)
    .join('');

  const body = `<main class="pricing-page">
  ${siteNav(brand, ['Product', 'Examples', 'Pricing', 'Docs'], 'Sign in')}
  <header class="pricing-head wrap">
    <p class="eyebrow">Pricing</p>
    <h1>${escapeHtml(TEMPLATE_META.pricing.defaultHeadline)}</h1>
    <p class="lead">Start free, upgrade when the work grows. Every plan includes the full design system, unlimited viewers and a real human on support.</p>
    <div class="billing"><span>Monthly</span><span class="on">Annual <em>−20%</em></span></div>
  </header>
  <div class="wrap"><section class="plans" aria-label="Plans">${plans}</section><p class="pricing-note">Prices in USD. Billed annually. Cancel any time.</p>
    <div class="trust"><span>${icon('check', 13)} 14-day free trial</span><span>${icon('check', 13)} No card required</span><span>${icon('check', 13)} Cancel in one click</span></div>
  </div>
  <section class="faq wrap"><div class="faq-head"><h2>Questions, answered.</h2><p>Still unsure? Write to us — a designer will reply, not a bot.</p></div><div class="faq-list">${faq}</div></section>
  ${siteFooter(
    brand,
    [
      { title: 'Product', links: ['Overview', 'Changelog', 'Roadmap'] },
      { title: 'Company', links: ['About', 'Careers', 'Contact'] }
    ],
    `© 2026 ${brand.name}. All rights reserved.`
  )}
</main>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: poster                                                    */
/* ------------------------------------------------------------------ */

function renderPoster(ctx) {
  const brand = TEMPLATE_META.poster.brand;
  const lines = posterLines(ctx.title);
  const titleMarkup = lines
    .map((line, index) => `<span${index === lines.length - 1 ? ' class="accent"' : ''}>${escapeHtml(line)}</span>`)
    .join('');
  const css = `.poster-page{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:clamp(18px,4vw,52px);padding-top:clamp(20px,5vh,60px)}
.poster{position:relative;width:min(780px,100%);aspect-ratio:4/5;background:var(--surface);border:1px solid var(--border);border-radius:calc(var(--radius)*1.2);padding:clamp(22px,3.4vw,42px);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow)}
.poster::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--accent)}
.poster::after{content:"";position:absolute;inset:calc(var(--u)*1.1);border:1px solid rgba(var(--text-rgb),.06);border-radius:calc(var(--radius)*.8);pointer-events:none}
.poster-top{display:flex;justify-content:space-between;gap:var(--s2);font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);padding-bottom:var(--s2);border-bottom:1px solid var(--border);position:relative;z-index:1}
.poster-mid{margin-top:auto;padding:calc(var(--u)*3) 0;position:relative;z-index:1}
.eyebrow{color:var(--muted)}
.poster-title{font-size:clamp(2.5rem,8vw,5.5rem);line-height:.9;letter-spacing:-.05em;text-transform:uppercase;margin-top:var(--s2);overflow-wrap:break-word}
.poster-title span{display:block}
.poster-title span.accent{color:var(--accent)}
.poster-sub{margin-top:var(--s3);max-width:42ch;color:var(--muted);font-size:.86rem;line-height:1.6}
.poster-art{position:absolute;right:-8%;top:17%;width:48%;aspect-ratio:1;pointer-events:none;z-index:0}
.pa-circle{position:absolute;inset:10%;border-radius:50%;background:rgba(var(--accent-rgb),.14);border:1px solid rgba(var(--accent-rgb),.35)}
.pa-outline{position:absolute;inset:-2%;border-radius:50%;border:1px solid rgba(var(--text-rgb),.12)}
.pa-bar{position:absolute;left:50%;top:-20%;bottom:-20%;width:1px;background:rgba(var(--text-rgb),.14);transform:rotate(34deg)}
.poster-bottom{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3);padding-top:var(--s3);border-top:1px solid var(--border);position:relative;z-index:1}
.plabel{font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.25rem}
.pval{font-size:.75rem;font-weight:600;line-height:1.35}
@media(max-width:600px){.poster{aspect-ratio:auto;min-height:0;padding:22px}.poster-mid{padding:calc(var(--u)*4) 0}.poster-bottom{grid-template-columns:1fr 1fr;row-gap:var(--s3)}.poster-art{width:70%;top:12%;right:-18%}.poster-title{font-size:clamp(2.3rem,10.4vw,3.4rem)}.poster-top{font-size:.58rem;letter-spacing:.14em}}`;

  const body = `<main class="poster-page">
  <article class="poster" aria-label="Poster design">
    <header class="poster-top"><span>Ephemera — Issue 04</span><span>Autumn programme</span></header>
    <div class="poster-mid">
      <p class="eyebrow">Lecture &amp; exhibition</p>
      <h1 class="poster-title">${titleMarkup}</h1>
      <p class="poster-sub">An evening of typography, sound and slow looking — printed matter, live sets and late light.</p>
    </div>
    <div class="poster-art" aria-hidden="true"><span class="pa-circle"></span><span class="pa-outline"></span><span class="pa-bar"></span></div>
    <footer class="poster-bottom">
      <div><span class="plabel">Dates</span><span class="pval">12 — 14 Nov 2026</span></div>
      <div><span class="plabel">Venue</span><span class="pval">The Warehouse, Lisbon</span></div>
      <div><span class="plabel">Admission</span><span class="pval">Free entry</span></div>
      <div><span class="plabel">Index</span><span class="pval">${escapeHtml(brand.name)} · 04</span></div>
    </footer>
  </article>
</main>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: one-pager                                                 */
/* ------------------------------------------------------------------ */

function renderOnepager(ctx) {
  const brand = TEMPLATE_META.onepager.brand;
  const css = `.doc{max-width:820px;margin:0 auto;padding:calc(var(--u)*4) clamp(20px,5vw,28px) calc(var(--u)*8)}
.doc-top{display:flex;justify-content:space-between;align-items:center;gap:var(--s3);padding-bottom:var(--s3);border-bottom:1px solid var(--border);flex-wrap:wrap}
.doc-meta-line{font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.doc-head{padding:calc(var(--u)*5) 0 calc(var(--u)*3.5)}
.doc-head h1{font-size:clamp(2rem,3.8vw,2.8rem);letter-spacing:-.035em;max-width:24ch;margin-top:var(--s2)}
.doc-head .lead{margin-top:var(--s3);font-size:1.04rem;max-width:58ch;color:var(--text);line-height:1.65}
.doc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3);padding:calc(var(--u)*2.2) 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.doc-grid dt{font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem}
.doc-grid dd{font-size:.8rem;font-weight:600;line-height:1.4}
.section{padding:calc(var(--u)*4.2) 0 calc(var(--u)*1.2);border-bottom:1px solid var(--border)}
.section:last-of-type{border-bottom:0}
.section h2{display:flex;align-items:baseline;gap:.7rem;font-size:1.3rem;letter-spacing:-.02em}
.section h2 .idx{font-family:var(--font-body);font-size:.64rem;letter-spacing:.14em;color:var(--accent);font-weight:700}
.section p{color:var(--muted);font-size:.92rem;line-height:1.72;max-width:62ch;margin-top:var(--s2)}
.section p strong{color:var(--text);font-weight:600}
.callout{margin-top:var(--s3);padding:calc(var(--u)*2.2) calc(var(--u)*2.6);border-left:2px solid var(--accent);background:var(--surface);border-radius:0 var(--r-sm) var(--r-sm) 0;font-family:var(--font-display);font-size:1.1rem;line-height:1.45;letter-spacing:-.015em;color:var(--text)}
.steps{margin-top:var(--s3)}
.step{display:grid;grid-template-columns:2.2rem minmax(0,1fr);gap:var(--s3);padding:calc(var(--u)*1.8) 0;border-top:1px solid var(--border);align-items:start}
.step:first-child{border-top:0;padding-top:0}
.step .n{font-family:var(--font-display);font-size:1.35rem;color:var(--accent);font-weight:700;line-height:1;letter-spacing:-.03em}
.step h3{font-size:.94rem;letter-spacing:-.01em;line-height:1.4}
.step p{margin-top:.25rem;font-size:.85rem;max-width:56ch}
.glance{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-top:var(--s3);background:var(--surface)}
.glance div{padding:calc(var(--u)*1.7) calc(var(--u)*2);border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
.glance div:nth-child(even){border-right:0}
.glance div:nth-last-child(-n+2){border-bottom:0}
.glance dt{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem}
.glance dd{font-size:.84rem;font-weight:600;line-height:1.4}
.checklist{margin-top:var(--s3);display:flex;flex-direction:column;gap:calc(var(--u)*1.2)}
.checklist li{display:flex;gap:.7rem;align-items:flex-start;font-size:.88rem;color:var(--muted);line-height:1.55}
.checklist li .glyph{color:var(--accent);margin-top:.22em;flex:none}
.doc-footer{display:flex;justify-content:space-between;gap:var(--s2);flex-wrap:wrap;margin-top:calc(var(--u)*5);padding-top:var(--s3);border-top:1px solid var(--border);font-size:.7rem;color:var(--muted)}
@media(max-width:700px){.doc-grid{grid-template-columns:1fr 1fr;row-gap:var(--s3)}.glance{grid-template-columns:1fr}.glance div{border-right:0}.glance div:nth-last-child(-n+2){border-bottom:1px solid var(--border)}.glance div:last-child{border-bottom:0}}
@media(max-width:520px){.doc{padding-top:var(--s3)}.doc-head{padding-top:calc(var(--u)*4)}}`;

  const steps = [
    ['01', 'Map the surface', 'A short audit of the components, tokens and patterns already in use, with a count of what is duplicated.'],
    ['02', 'Set the primitives', 'Type, spacing, colour and motion tokens documented in one place and wired into the codebase.'],
    ['03', 'Ship the first slice', 'One product area migrated end to end, measured before and after, so the value is visible early.']
  ]
    .map(
      ([number, title, copy]) =>
        `<div class="step"><span class="n">${number}</span><div><h3>${title}</h3><p>${copy}</p></div></div>`
    )
    .join('');

  const body = `<main class="doc">
  <div class="doc-top"><a class="brand" href="#">${mark(brand)}<span>${escapeHtml(brand.name)}</span></a><span class="doc-meta-line">Product brief · September 2026</span></div>
  <header class="doc-head">
    <p class="eyebrow">Product brief · Confidential</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="lead">${
      isInstructionalLead(ctx.lead)
        ? 'A concise case for the next phase: what we are making, why it matters now, and what it unlocks. The pages that follow are intentionally short — a decision, not a deck.'
        : escapeHtml(ctx.lead)
    }</p>
  </header>
  <dl class="doc-grid">
    <div><dt>Prepared for</dt><dd>Product &amp; Design</dd></div>
    <div><dt>Owner</dt><dd>Studio Meridian</dd></div>
    <div><dt>Status</dt><dd>Draft v2</dd></div>
    <div><dt>Horizon</dt><dd>Q4 2026</dd></div>
  </dl>
  <section class="section">
    <h2><span class="idx">01</span> Context</h2>
    <p>Our product surface has grown faster than the system behind it. Teams are solving the same problems twice, and the small inconsistencies are starting to be felt by customers in the details — spacing, tone, the way a button behaves on a slow connection.</p>
    <p>This is not a rebrand. It is a quiet consolidation: fewer decisions, made once, in the open. The goal is a system that people can trust without having to think about it.</p>
    <blockquote class="callout">&ldquo;A design system is not a library. It is a shared agreement about what good looks like.&rdquo;</blockquote>
  </section>
  <section class="section">
    <h2><span class="idx">02</span> The proposal</h2>
    <p>We propose a focused, six-week engagement with three milestones. Each one ships something usable, so the system earns trust as it grows.</p>
    <div class="steps">${steps}</div>
  </section>
  <section class="section">
    <h2><span class="idx">03</span> At a glance</h2>
    <dl class="glance">
      <div><dt>Scope</dt><dd>Audit, tokens, component foundations</dd></div>
      <div><dt>Deliverables</dt><dd>Token library, 18 components, usage guide</dd></div>
      <div><dt>Investment</dt><dd>Fixed fee, two payment milestones</dd></div>
      <div><dt>Timeline</dt><dd>Six weeks · one product area</dd></div>
    </dl>
  </section>
  <section class="section">
    <h2><span class="idx">04</span> What success looks like</h2>
    <ul class="checklist">
      <li>${icon('check', 15)}<span>New screens are assembled from approved patterns, not rebuilt from scratch.</span></li>
      <li>${icon('check', 15)}<span>Design and engineering share one vocabulary for spacing, type and colour.</span></li>
      <li>${icon('check', 15)}<span>Shipping a small change no longer requires a design review meeting.</span></li>
    </ul>
  </section>
  <div class="doc-footer"><span>${escapeHtml(brand.name)} — Studio Meridian</span><span>Prepared September 2026</span><span>01 / 01</span></div>
</main>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* template: form                                                      */
/* ------------------------------------------------------------------ */

function renderForm(ctx) {
  const brand = TEMPLATE_META.form.brand;
  const css = `.form-page{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:clamp(14px,4vw,52px);padding-top:clamp(18px,5vh,60px);background:radial-gradient(90% 80% at 10% 0%, var(--surface-alt), transparent 60%)}
.form-shell{width:min(1040px,100%);display:grid;grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr);background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow)}
.form-aside{background:var(--accent);color:var(--accent-text);padding:calc(var(--u)*4.2) calc(var(--u)*3.6);display:flex;flex-direction:column;position:relative;overflow:hidden}
.form-aside .brand{color:var(--accent-text)}
.form-aside .mark{background:var(--accent-text);color:var(--accent)}
.form-aside h1{color:var(--accent-text);font-size:clamp(1.75rem,2.8vw,2.4rem);letter-spacing:-.035em;margin-top:calc(var(--u)*4);max-width:14ch}
.form-aside p{color:rgba(var(--accent-text-rgb),.78);margin-top:var(--s3);font-size:.9rem;line-height:1.6;max-width:34ch}
.aside-list{margin-top:auto;padding-top:calc(var(--u)*3.4);display:flex;flex-direction:column;gap:calc(var(--u)*1.3);font-size:.78rem;color:rgba(var(--accent-text-rgb),.82);position:relative;z-index:1}
.aside-list span{display:flex;gap:.55rem;align-items:flex-start}
.aside-list .glyph{flex:none;margin-top:.12em;color:rgba(var(--accent-text-rgb),.68)}
.aside-art{position:absolute;right:-14%;bottom:-18%;width:64%;aspect-ratio:1;border-radius:50%;border:1px solid rgba(var(--accent-text-rgb),.24)}
.aside-art::after{content:"26";position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-size:clamp(3rem,6vw,5rem);font-weight:800;letter-spacing:-.05em;color:rgba(var(--accent-text-rgb),.16)}
.form-main{padding:calc(var(--u)*4.2) calc(var(--u)*4);min-width:0}
.form-main h2{font-size:1.4rem;letter-spacing:-.025em}
.form-main .sub{color:var(--muted);font-size:.86rem;margin-top:.4rem;max-width:46ch;line-height:1.55}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u)*1.7);margin-top:calc(var(--u)*2.8)}
.field{display:flex;flex-direction:column;gap:.4rem;min-width:0}
.field.full{grid-column:1/-1}
.field label,.field .legend{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:650}
.field input,.field select,.field textarea{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:calc(var(--radius)*.6);padding:calc(var(--u)*1.3) calc(var(--u)*1.5);font-size:.86rem;color:var(--text);outline:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.field textarea{min-height:calc(var(--u)*9);resize:vertical}
.field ::placeholder{color:var(--muted);opacity:.8}
.chips{display:flex;gap:.5rem;flex-wrap:wrap}
.chip{position:relative;cursor:pointer}
.chip input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
.chip span{display:inline-flex;padding:calc(var(--u)*.9) calc(var(--u)*1.6);border:1px solid var(--border);border-radius:999px;font-size:.78rem;color:var(--muted);background:var(--surface)}
.chip input:checked + span{background:var(--accent);border-color:var(--accent);color:var(--accent-text)}
.chip input:focus-visible + span{outline:2px solid var(--accent);outline-offset:2px}
.field .consent{display:flex;gap:.6rem;align-items:flex-start;font-size:.76rem;color:var(--muted);margin-top:calc(var(--u)*1.3);line-height:1.5;text-transform:none;letter-spacing:0;font-weight:400;cursor:pointer}
.consent input{accent-color:var(--accent);margin-top:.2em;flex:none;width:auto;padding:0;border:0;background:transparent;box-shadow:none}
.form-actions{display:flex;align-items:center;gap:var(--s3);margin-top:calc(var(--u)*2.4);flex-wrap:wrap}
.form-actions .btn{padding:calc(var(--u)*1.7) calc(var(--u)*3)}
.note{font-size:.68rem;color:var(--muted);max-width:26ch;line-height:1.5}
@media(max-width:900px){.form-shell{grid-template-columns:1fr}.form-aside{padding:calc(var(--u)*3);min-height:0}.form-aside h1{max-width:none;margin-top:var(--s3)}.aside-list{display:none}.form-main{padding:calc(var(--u)*3)}}
@media(max-width:560px){.form-grid{grid-template-columns:1fr}.form-main{padding:calc(var(--u)*2.6)}.form-aside{padding:calc(var(--u)*2.6)}.form-page{padding:12px}.form-shell{border-radius:calc(var(--radius)*1.1)}}`;

  const chips = ['Solo', 'Small team', 'Established']
    .map(
      (label, index) =>
        `<label class="chip"><input type="radio" name="stage"${index === 0 ? ' checked' : ''}><span>${label}</span></label>`
    )
    .join('');

  const body = `<main class="form-page">
  <div class="form-shell">
    <aside class="form-aside">
      <a class="brand" href="#">${mark(brand)}<span>${escapeHtml(brand.name)}</span></a>
      <h1>${escapeHtml(TEMPLATE_META.form.defaultHeadline)}</h1>
      <p>A three-month residency for independent designers and small studios. Studio space, a stipend, and a room full of people who care about the same things.</p>
      <div class="aside-list">
        <span>${icon('calendar', 14)} Applications close 30 November</span>
        <span>${icon('users', 14)} Eight studios selected</span>
        <span>${icon('pin', 14)} Studio space in Lisbon</span>
      </div>
      <div class="aside-art" aria-hidden="true"></div>
    </aside>
    <div class="form-main">
      <h2>Apply in five minutes.</h2>
      <p class="sub">Tell us what you&rsquo;re building. We read every application ourselves and reply within two weeks.</p>
      <form class="form-grid" novalidate>
        <div class="field"><label for="first-name">First name</label><input id="first-name" name="first" type="text" placeholder="Ana" autocomplete="given-name"></div>
        <div class="field"><label for="last-name">Last name</label><input id="last-name" name="last" type="text" placeholder="Chen" autocomplete="family-name"></div>
        <div class="field full"><label for="email">Email</label><input id="email" name="email" type="email" placeholder="ana@studio.com" autocomplete="email"></div>
        <div class="field full"><label for="discipline">Discipline</label><select id="discipline" name="discipline"><option>Architecture</option><option>Interiors</option><option>Industrial design</option><option>Graphic design</option><option>Something else</option></select></div>
        <div class="field full"><span class="legend">Studio stage</span><div class="chips">${chips}</div></div>
        <div class="field full"><label for="project">What are you working on?</label><textarea id="project" name="project" placeholder="A few sentences is plenty — what it is, who it is for, and what you hope to find here."></textarea></div>
        <div class="field full"><label class="consent"><input type="checkbox" name="updates" checked><span>I&rsquo;d like to receive occasional programme updates from Meridian.</span></label></div>
      </form>
      <div class="form-actions"><button class="btn" type="button">Submit application</button><span class="note">No fee to apply. We reply within two weeks.</span></div>
    </div>
  </div>
</main>`;
  return { css, body };
}

/* ------------------------------------------------------------------ */
/* engine factory                                                      */
/* ------------------------------------------------------------------ */

const RENDERERS = {
  landing: renderLanding,
  dashboard: renderDashboard,
  mobile: renderMobile,
  pricing: renderPricing,
  poster: renderPoster,
  onepager: renderOnepager,
  form: renderForm
};

function generate(input) {
  const source = input && typeof input === 'object' ? input : {};
  const brief = typeof source.brief === 'string' ? source.brief : '';
  const analysis = analyze(brief);
  const template = TEMPLATE_IDS.includes(source.template) ? source.template : analysis.template;
  const meta = TEMPLATE_META[template];
  const tokens = normalizeTokens(source.tokens);
  const title = deriveTitle(brief, meta.label.en);
  const lead = deriveLead(brief, meta.defaultLead);
  const hero = deriveHero(brief, meta.defaultHeadline);
  const rendered = RENDERERS[template]({ brief, title, lead, hero, tokens });
  const html = buildDocument({
    template,
    title,
    brief,
    tokens,
    css: rendered.css,
    body: rendered.body
  });
  return { title, html };
}

export function createDesignEngine() {
  return {
    templates: TEMPLATE_IDS.map((id) => ({
      id,
      label: { ...TEMPLATE_META[id].label },
      hint: { ...TEMPLATE_META[id].hint }
    })),
    styles: makeStyles(),
    baseTokens: () => DEFAULT_TOKENS(),
    analyze,
    generate
  };
}




