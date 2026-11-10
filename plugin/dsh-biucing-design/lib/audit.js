/**
 * In-page audit expressions evaluated through CDP.
 *
 * Both are self-contained IIFEs that return JSON-serializable values:
 *   - AUDIT_EXPRESSION        audits the Design Studio panel's own chrome;
 *   - DESIGN_AUDIT_EXPRESSION audits the generated design document inside the
 *     sandboxed artboard iframe (evaluated in an isolated world because the
 *     page itself cannot read a `sandbox=""` frame).
 */

const CONTRAST_HELPERS = `
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
  const rect = (el) => {
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  };
  const css = (el, property) => (el ? getComputedStyle(el).getPropertyValue(property).trim() : '');
  const visible = (el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
`

export const AUDIT_EXPRESSION = `(() => {
${CONTRAST_HELPERS}
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
  const buttons = Array.from(document.querySelectorAll('.dsx-root button'));
  const unlabeled = buttons.filter((button) => {
    const name = (button.getAttribute('aria-label') || '') + ' ' + (button.getAttribute('title') || '') + ' ' + (button.textContent || '');
    return visible(button) && !name.replace(/\\s+/g, ' ').trim();
  }).slice(0, 6).map((button) => button.className || button.outerHTML.slice(0, 60));
  return {
    panelMounted: Boolean(root),
    title: document.title,
    topbar: (() => {
      const bar = document.querySelector('.dsx-topbar');
      const brand = document.querySelector('.dsx-brand');
      if (!bar) return null;
      const brandStyle = brand ? getComputedStyle(brand) : null;
      const span = brand ? brand.querySelector('span') : null;
      return {
        rect: rect(bar),
        scrollWidth: bar.scrollWidth,
        clientWidth: bar.clientWidth,
        brand: brand ? {
          rect: rect(brand),
          display: brandStyle.display,
          flexDirection: brandStyle.flexDirection,
          flexWrap: brandStyle.flexWrap,
          whiteSpace: brandStyle.whiteSpace,
          children: Array.from(brand.children).map((child) => ({ tag: child.tagName, rect: rect(child) })),
          spanWhiteSpace: span ? getComputedStyle(span).whiteSpace : null,
        } : null,
      };
    })(),
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
    },
    iframe: frame ? { rect: rect(frame), sandbox: frame.getAttribute('sandbox'), srcBytes: (frame.getAttribute('srcdoc') || '').length } : null,
    project: {
      options: document.querySelectorAll('.dsx-project-select option').length,
      active: (() => {
        const select = document.querySelector('.dsx-project-select');
        if (!select) return null;
        const option = select.options && select.options[select.selectedIndex];
        return option ? option.textContent : null;
      })(),
      name: (() => {
        const input = document.querySelector('.dsx-project-input');
        return input ? input.value : null;
      })(),
    },
    controls: {
      buttons: buttons.length,
      chips: document.querySelectorAll('.dsx-chip').length,
      historyRows: document.querySelectorAll('.dsx-history-row').length,
      selects: document.querySelectorAll('.dsx-root select').length,
      textareas: document.querySelectorAll('.dsx-root textarea').length,
      commentPins: document.querySelectorAll('.dsx-comment-pin').length,
      compareArtboards: document.querySelectorAll('.dsx-compare-frame').length,
    },
    a11y: {
      unlabeledButtons: unlabeled,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
      focused: document.activeElement && document.activeElement.tagName ? document.activeElement.tagName : null,
    },
    overflow: {
      documentHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      rootHorizontal: root ? root.scrollWidth > root.clientWidth + 1 : null,
      rootScrollHeight: root ? root.scrollHeight : null,
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

export const DESIGN_AUDIT_EXPRESSION = `(() => {
${CONTRAST_HELPERS}
  const body = document.body;
  const bodyStyle = body ? getComputedStyle(body) : null;
  const htmlStyle = getComputedStyle(document.documentElement);
  const background = bodyStyle && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ? bodyStyle.backgroundColor
    : htmlStyle.backgroundColor;
  const text = bodyStyle ? bodyStyle.color : null;
  const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 8).map((heading) => {
    const style = getComputedStyle(heading);
    const box = heading.getBoundingClientRect();
    return {
      tag: heading.tagName,
      text: (heading.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      width: Math.round(box.width),
    };
  });
  const buttons = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    },
    typography: {
      bodyFont: bodyStyle ? bodyStyle.fontFamily : null,
      bodyFontSize: bodyStyle ? bodyStyle.fontSize : null,
      headingSamples: headings,
    },
    colors: {
      backgroundRaw: background,
      background: hex(background),
      textRaw: text,
      text: hex(text),
      textContrast: contrast(text, background),
    },
    structure: {
      sections: document.querySelectorAll('section, main, article, header, footer').length,
      headings: document.querySelectorAll('h1, h2, h3').length,
      interactive: buttons.length,
      images: document.querySelectorAll('img, svg, picture').length,
      brokenImages: Array.from(document.querySelectorAll('img')).filter((img) => img.complete && img.naturalWidth === 0).length,
    },
    a11y: {
      unnamedInteractive: buttons.filter((element) => {
        const name = (element.getAttribute('aria-label') || '') + ' ' + (element.getAttribute('title') || '') + ' ' + (element.textContent || '');
        return !name.replace(/\\s+/g, ' ').trim();
      }).length,
      lang: document.documentElement.getAttribute('lang') || null,
    },
  };
})()`
