/**
 * Zero-dependency self-test for the DSH Design Studio synthesis engine.
 * Run from plugin/dsh-biucing-design:  node src/test-engine.mjs
 */

import assert from 'node:assert/strict';
import { createDesignEngine } from './engine.mjs';

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${String(error && error.message ? error.message : error).split('\n').join('\n       ')}`);
  }
}

const engine = createDesignEngine();

const TOKEN_KEYS = [
  'mode',
  'accent',
  'accentText',
  'bg',
  'surface',
  'surfaceAlt',
  'text',
  'muted',
  'border',
  'fontDisplay',
  'fontBody',
  'radius',
  'density',
  'scale'
];

const TEMPLATE_IDS = ['landing', 'dashboard', 'mobile', 'pricing', 'poster', 'onepager', 'form'];
const STYLE_IDS = ['minimal', 'editorial', 'nocturne', 'brutalist', 'pastel', 'enterprise'];
const HEX = /^#[0-9a-f]{6}$/i;
const DENSITIES = ['compact', 'regular', 'airy'];

const BRIEFS = {
  landing: 'A quiet landing page for a ceramics studio called Kiln & Co.',
  dashboard: 'An analytics dashboard for a fintech startup',
  mobile: 'A mobile app onboarding for a sleep tracker',
  pricing: 'Pricing page for a B2B analytics tool',
  poster: 'A bold poster for a late-night jazz festival',
  onepager: 'An elegant one-pager for a product launch',
  form: 'A signup form for a design newsletter'
};

console.log('\nDesign Studio engine — self test\n');

/* ------------------------------------------------------------------ */
check('createDesignEngine() exposes exactly the 7 templates, in order', () => {
  assert.deepEqual(engine.templates.map((t) => t.id), TEMPLATE_IDS);
  assert.equal(engine.templates.length, 7);
  for (const template of engine.templates) {
    assert.equal(typeof template.label.en, 'string');
    assert.ok(template.label.en.length > 0);
    assert.equal(typeof template.label.zh, 'string');
    assert.ok(template.label.zh.length > 0);
    assert.equal(typeof template.hint.en, 'string');
    assert.ok(template.hint.en.length > 0);
    assert.equal(typeof template.hint.zh, 'string');
    assert.ok(template.hint.zh.length > 0);
    assert.ok(template.hint.en.length < 120);
  }
});

/* ------------------------------------------------------------------ */
check('createDesignEngine() exposes exactly 6 style presets with unique ids', () => {
  assert.equal(engine.styles.length, 6);
  assert.deepEqual(engine.styles.map((s) => s.id), STYLE_IDS);
  assert.equal(new Set(engine.styles.map((s) => s.id)).size, 6);
  assert.equal(new Set(engine.templates.map((t) => t.id)).size, 7);
  for (const style of engine.styles) {
    assert.match(style.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(typeof style.label.en, 'string');
    assert.equal(typeof style.label.zh, 'string');
  }
});

/* ------------------------------------------------------------------ */
check('every style carries a complete, valid DesignTokens set', () => {
  for (const style of engine.styles) {
    const tokens = style.tokens;
    assert.deepEqual(Object.keys(tokens).sort(), [...TOKEN_KEYS].sort(), `${style.id}: keys`);
    for (const key of ['accent', 'accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border']) {
      assert.match(tokens[key], HEX, `${style.id}.${key}`);
    }
    assert.ok(tokens.mode === 'light' || tokens.mode === 'dark', `${style.id}.mode`);
    assert.equal(typeof tokens.fontDisplay, 'string');
    assert.ok(tokens.fontDisplay.length > 0);
    assert.equal(typeof tokens.fontBody, 'string');
    assert.ok(tokens.fontBody.length > 0);
    assert.equal(typeof tokens.radius, 'number');
    assert.ok(tokens.radius >= 0 && tokens.radius <= 28, `${style.id}.radius`);
    assert.ok(DENSITIES.includes(tokens.density), `${style.id}.density`);
    assert.ok(DENSITIES.includes(tokens.scale), `${style.id}.scale`);
  }
});

/* ------------------------------------------------------------------ */
check('density and scale differ meaningfully across the presets', () => {
  const densities = new Set(engine.styles.map((s) => s.tokens.density));
  const scales = new Set(engine.styles.map((s) => s.tokens.scale));
  assert.ok(densities.size >= 2);
  assert.ok(scales.size >= 2);
  assert.equal(new Set(engine.styles.map((s) => s.tokens.accent)).size, 6, 'accent colours should be distinct');
});

/* ------------------------------------------------------------------ */
check('42 template x style artifacts are complete, self-contained and sane', () => {
  let smallest = Infinity;
  let largest = 0;
  for (const template of TEMPLATE_IDS) {
    for (const style of engine.styles) {
      const result = engine.generate({
        brief: BRIEFS[template],
        template,
        tokens: style.tokens
      });
      const html = result.html;
      const label = `${template}/${style.id}`;
      assert.equal(typeof result.title, 'string', label);
      assert.ok(result.title.length > 0 && result.title.length <= 50, `${label}: title`);
      assert.ok(html.startsWith('<!doctype html>'), `${label}: doctype`);
      assert.ok(html.trimEnd().endsWith('</html>'), `${label}: closing html`);
      assert.ok(html.includes('<style'), `${label}: inline style`);
      assert.ok(!html.includes('<script'), `${label}: no script tag`);
      assert.ok(!/https?:\/\//i.test(html), `${label}: no external URLs`);
      assert.ok(!html.includes('data:'), `${label}: no data urls`);
      assert.ok(!html.includes('<img'), `${label}: no img tags`);
      assert.ok(!html.includes('<link'), `${label}: no link tags`);
      assert.ok(!html.includes('<iframe'), `${label}: no iframe tags`);
      assert.ok(!html.includes('@import'), `${label}: no css imports`);
      assert.ok(!html.includes('url('), `${label}: no css url() references`);
      assert.ok(!html.includes('<object'), `${label}: no object tags`);
      assert.ok(!html.includes('<embed'), `${label}: no embed tags`);
      assert.ok(!html.includes('NaN'), `${label}: no NaN`);
      assert.ok(!html.includes('undefined'), `${label}: no undefined`);
      assert.ok(html.length >= 2048 && html.length <= 60 * 1024, `${label}: length ${html.length}`);
      smallest = Math.min(smallest, html.length);
      largest = Math.max(largest, html.length);
    }
  }
  assert.ok(smallest >= 2048);
  assert.ok(largest <= 60 * 1024);
  console.log(`       (artifact size range: ${smallest}–${largest} bytes)`);
});

/* ------------------------------------------------------------------ */
check('every style accent colour is referenced in its generated HTML', () => {
  for (const style of engine.styles) {
    for (const template of TEMPLATE_IDS) {
      const { html } = engine.generate({ brief: BRIEFS[template], template, tokens: style.tokens });
      assert.ok(
        html.toLowerCase().includes(style.tokens.accent.toLowerCase()),
        `${template}/${style.id}: accent ${style.tokens.accent} missing`
      );
      for (const key of ['accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border']) {
        assert.ok(
          html.toLowerCase().includes(style.tokens[key].toLowerCase()),
          `${template}/${style.id}: token ${key} missing`
        );
      }
      assert.ok(html.includes(style.tokens.fontDisplay), `${template}/${style.id}: display font missing`);
      assert.ok(html.includes(style.tokens.fontBody), `${template}/${style.id}: body font missing`);
      assert.ok(html.includes(`--radius:${style.tokens.radius}px`), `${template}/${style.id}: radius missing`);
      const units = { compact: 6, regular: 8, airy: 10 };
      const bases = { compact: 15, regular: 16, airy: 17 };
      assert.ok(html.includes(`--u:${units[style.tokens.density]}px`), `${template}/${style.id}: density spacing missing`);
      assert.ok(html.includes(`--type-base:${bases[style.tokens.scale]}px`), `${template}/${style.id}: scale missing`);
    }
  }
});

/* ------------------------------------------------------------------ */
const ANALYZE_CASES = [
  ['A minimal landing page for a furniture studio', 'landing', 'minimal'],
  ['Design a dark analytics dashboard for a fintech startup', 'dashboard', 'nocturne'],
  ['A moody dark dashboard for a music service', 'dashboard', 'nocturne'],
  ['极简风格的官网首页', 'landing', 'minimal'],
  ['制作一张粗野主义风格的音乐节海报', 'poster', 'brutalist'],
  ['A bold brutalist poster for a jazz festival', 'poster', 'brutalist'],
  ['企业级定价页，包含三个套餐', 'pricing', 'enterprise'],
  ['A clean pricing page for a SaaS product', 'pricing', 'minimal'],
  ['移动 app 的引导流程', 'mobile', 'minimal'],
  ['柔和马卡龙色的注册表单', 'form', 'pastel'],
  ['一份优雅的单页产品文档', 'onepager', 'editorial']
];

check('analyze() maps representative EN/ZH briefs to the expected template and style', () => {
  assert.ok(ANALYZE_CASES.length >= 8);
  for (const [brief, template, styleId] of ANALYZE_CASES) {
    const result = engine.analyze(brief);
    assert.equal(result.template, template, `${brief} -> template`);
    assert.equal(result.styleId, styleId, `${brief} -> style`);
    assert.equal(typeof result.title, 'string');
    assert.ok(result.title.length > 0, `${brief} -> title`);
    assert.ok(result.title.length <= 50, `${brief} -> title length`);
    assert.ok(Array.isArray(result.keywords));
    assert.ok(result.keywords.length > 0, `${brief} -> keywords`);
  }
});

check('analyze() defaults to landing/minimal and reports an explicit hex accent', () => {
  const fallback = engine.analyze('something entirely unclassifiable');
  assert.equal(fallback.template, 'landing');
  assert.equal(fallback.styleId, 'minimal');
  assert.ok(fallback.title.length > 0);
  const accented = engine.analyze('A minimal landing page for a studio, brand colour #E11D48');
  assert.equal(accented.accent, '#e11d48');
});

check('analyze() title is a short human title, not the whole brief', () => {
  const result = engine.analyze(
    'Please design a landing page for a boutique architecture studio called Atelier North, based in Lisbon'
  );
  assert.equal(result.title, 'Atelier North');
  assert.equal(engine.analyze('').title, 'Landing page');
});

check('analyze() title keeps the subject and drops requirement clauses', () => {
  const zh = engine.analyze('一个营收仪表盘，深色风格，包含 KPI 卡片和月度图表');
  assert.equal(zh.title, '营收');
  const en = engine.analyze('A revenue dashboard, dark mode, with KPI cards and monthly charts');
  assert.equal(en.title, 'Revenue dashboard');
  const mixed = engine.analyze('一个面向 API 产品的克制落地页，包含首屏、代码示例与定价');
  assert.equal(mixed.title, 'API 产品');
  const styleOnly = engine.analyze('设计一个温暖复古的海报');
  assert.equal(styleOnly.title, 'Poster');
  for (const title of [zh.title, en.title, mixed.title, styleOnly.title]) {
    assert.ok(!/包含|with KPI|KPI 卡片|月度图表/.test(title));
  }
});

/* ------------------------------------------------------------------ */
check('generate() HTML-escapes user text and neutralises injected handlers in every template', () => {
  const hostile = '<img src=x onerror=alert(1)> & "quotes"';
  for (const template of TEMPLATE_IDS) {
    const { html } = engine.generate({ brief: hostile, template, tokens: engine.baseTokens() });
    assert.ok(!html.includes('onerror=alert(1)'), `${template}: raw handler substring leaked`);
    assert.ok(!html.toLowerCase().includes('onerror'), `${template}: onerror survived`);
    assert.ok(!html.includes('<img'), `${template}: raw img tag survived`);
    assert.ok(!html.includes('<script'), `${template}: script tag survived`);
    const withScript = engine.generate({
      brief: '<script>alert("x")</script> and a landing page',
      template,
      tokens: engine.baseTokens()
    });
    assert.ok(!withScript.html.includes('<script'), `${template}: script injection survived`);
  }
  const landing = engine.generate({ brief: hostile, template: 'landing', tokens: engine.baseTokens() }).html;
  assert.ok(landing.includes('&lt;img'), 'escaped user text should still be visible');
});

check('generate() is deterministic for identical input', () => {
  for (const template of TEMPLATE_IDS) {
    const input = { brief: BRIEFS[template], template, tokens: engine.styles[2].tokens };
    const first = engine.generate(input);
    const second = engine.generate(input);
    assert.equal(first.title, second.title);
    assert.equal(first.html, second.html);
  }
});

/* ------------------------------------------------------------------ */
check('baseTokens() returns independent light "minimal" defaults', () => {
  const first = engine.baseTokens();
  const second = engine.baseTokens();
  assert.notEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), [...TOKEN_KEYS].sort());
  assert.equal(first.mode, 'light');
  assert.equal(first.accent, '#111827');
  first.accent = '#000000';
  first.radius = 28;
  first.density = 'compact';
  assert.equal(second.accent, '#111827');
  assert.equal(second.radius, 6);
  assert.equal(second.density, 'regular');
  assert.notEqual(second.fontDisplay, undefined);
});

/* ------------------------------------------------------------------ */
check('unknown template ids fall back to analyze(), bad tokens are normalised', () => {
  const result = engine.generate({
    brief: 'A dark dashboard',
    template: 'not-a-template',
    tokens: { accent: 'not-a-colour', radius: 999, density: 'loose', scale: 12, fonts: 'x' }
  });
  assert.equal(result.title.length > 0, true);
  assert.ok(result.html.startsWith('<!doctype html>'));
  assert.ok(result.html.includes('--density') === false);
  assert.ok(result.html.includes('NaN') === false);
  assert.ok(result.html.includes('--radius:28px'), 'radius should clamp to 28');
  assert.ok(result.html.includes('--u:8px'), 'invalid density falls back to regular');
});

check('empty brief still produces a valid design for every template', () => {
  for (const template of TEMPLATE_IDS) {
    const { title, html } = engine.generate({ brief: '', template, tokens: engine.baseTokens() });
    assert.ok(title.length > 0);
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.trimEnd().endsWith('</html>'));
  }
});

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
