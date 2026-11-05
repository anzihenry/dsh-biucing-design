/**
 * The in-page audit expression evaluated through CDP.
 *
 * It is a self-contained IIFE: it reads the Design Studio panel's layout,
 * computed colors and contrast, counts rendered controls, and reports the
 * current theme. The result is JSON-serializable, so it crosses the protocol as
 * a plain value and needs no page-side helper or DOM mutation.
 */
export const AUDIT_EXPRESSION = `(() => {
  const rect = (el) => {
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  };
  const css = (el, property) => (el ? getComputedStyle(el).getPropertyValue(property).trim() : '');
  const parseRgb = (value) => {
    const match = String(value || '').match(/rgba?\\(([^)]+)\\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((part) => parseFloat(part));
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = (rgb) => (rgb ? 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b) : null);
  const contrast = (fg, bg) => {
    const a = luminance(parseRgb(fg));
    const b = luminance(parseRgb(bg));
    if (a === null || b === null) return null;
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
  };
  const hex = (value) => {
    const rgb = parseRgb(value);
    if (!rgb) return null;
    const part = (n) => Math.round(n).toString(16).padStart(2, '0');
    return '#' + part(rgb.r) + part(rgb.g) + part(rgb.b);
  };
  const root = document.querySelector('.dsx-root');
  const left = document.querySelector('.dsx-left');
  const canvas = document.querySelector('.dsx-canvas');
  const right = document.querySelector('.dsx-right');
  const frame = document.querySelector('.dsx-frame');
  const primary = document.querySelector('.dsx-primary');
  const rootBackground = css(root, 'background-color');
  const rootText = css(root, 'color');
  const primaryStyle = primary ? getComputedStyle(primary) : null;
  const darkTheme = document.body.hasAttribute('data-ds-dark-theme')
    || document.documentElement.hasAttribute('data-ds-dark-theme');
  return {
    panelMounted: Boolean(root),
    title: document.title,
    theme: darkTheme ? 'dark' : 'light',
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    root: rect(root),
    columns: { left: rect(left), canvas: rect(canvas), right: rect(right) },
    body: {
      display: left && left.parentElement ? getComputedStyle(left.parentElement).display : null,
      flexDirection: left && left.parentElement ? getComputedStyle(left.parentElement).flexDirection : null,
      flexWrap: left && left.parentElement ? getComputedStyle(left.parentElement).flexWrap : null,
      width: left && left.parentElement ? Math.round(left.parentElement.getBoundingClientRect().width) : null,
    },
    dom: {
      bodyCount: document.querySelectorAll('.dsx-body').length,
      leftCount: document.querySelectorAll('.dsx-left').length,
      rightCount: document.querySelectorAll('.dsx-right').length,
      bodyChildren: Array.from(document.querySelectorAll('.dsx-body')[0] ? document.querySelectorAll('.dsx-body')[0].children : []).map((child) => ({
        tag: child.tagName,
        cls: child.className,
        rect: rect(child),
        parentCls: child.parentElement ? child.parentElement.className : null,
        wrap: child.parentElement ? getComputedStyle(child.parentElement).flexWrap : null,
        direction: child.parentElement ? getComputedStyle(child.parentElement).flexDirection : null,
      })),
      rightParent: right && right.parentElement ? { cls: right.parentElement.className, wrap: getComputedStyle(right.parentElement).flexWrap } : null,
      leftParent: left && left.parentElement ? { cls: left.parentElement.className, wrap: getComputedStyle(left.parentElement).flexWrap } : null,
    },
    sections: Array.from(document.querySelectorAll('.dsx-section')).slice(0, 12).map((section) => {
      const box = section.getBoundingClientRect();
      return { title: (section.querySelector('.dsx-section-title') || {}).textContent || '', x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    }),
    iframe: frame ? { rect: rect(frame), sandbox: frame.getAttribute('sandbox') } : null,
    controls: {
      buttons: document.querySelectorAll('.dsx-root button').length,
      chips: document.querySelectorAll('.dsx-chip').length,
      historyRows: document.querySelectorAll('.dsx-history-row').length,
      selects: document.querySelectorAll('.dsx-root select').length,
    },
    overflow: {
      documentHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      rootHorizontal: root ? root.scrollWidth > root.clientWidth + 1 : null,
    },
    colors: {
      rootBackgroundRaw: rootBackground,
      rootTextRaw: rootText,
      rootBackground: hex(rootBackground),
      rootText: hex(rootText),
      primaryBackgroundRaw: primaryStyle ? primaryStyle.backgroundColor : null,
      primaryTextRaw: primaryStyle ? primaryStyle.color : null,
      primaryBackground: primaryStyle ? hex(primaryStyle.backgroundColor) : null,
      primaryText: primaryStyle ? hex(primaryStyle.color) : null,
      textContrast: contrast(rootText, rootBackground),
      primaryContrast: primaryStyle ? contrast(primaryStyle.color, primaryStyle.backgroundColor) : null,
    },
  };
})()`
