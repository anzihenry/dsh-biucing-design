/**
 * Host tools that give the agent a visual verification loop for the Design
 * Studio panel and for generated design artifacts.
 *
 * Both tools use a separate, throwaway headless Chrome profile:
 *   - the user's own browser profile and cookies are never touched;
 *   - the DSH Web GUI is opened through `connection.authenticatedUrl()` so the
 *     temporary browser is authorized without the user pasting a token;
 *   - screenshots default to the panel/document (not the surrounding shell),
 *     land in the workspace, and their paths are returned so the agent can
 *     inspect them with the existing `read_image` tool.
 *
 * Privacy / safety defaults:
 *   - `design_verify_ui` crops to the Design Studio panel unless `include_shell`
 *     is set, so workspace/session titles do not leak into the model context;
 *   - loopback GUI verification resolves only loopback hosts; screenshotting
 *     arbitrary HTML blocks remote resolution unless `block_network: false`;
 *   - `design_screenshot_html` refuses local files outside the session working
 *     directory unless `allow_outside_workspace: true` is set;
 *   - the report records whether Chrome ran sandboxed or with the relaxed
 *     fallback, and the fallback can be forbidden with
 *     `DSH_DESIGN_CHROME_NO_SANDBOX=never`.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve as resolvePath, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AUDIT_EXPRESSION, DESIGN_AUDIT_EXPRESSION } from './audit.js'
import {
  CdpClient,
  capturePng,
  evaluate,
  evaluateInFrame,
  evaluateInTarget,
  findIframeTarget,
  isCdpAvailable,
  listFrames,
  openPage,
  pngSize,
  waitFor,
} from './cdp.js'
import { chromeCliScreenshot, closeChrome, launchChrome, resolveSandboxAttempts } from './chrome.js'

export const PANEL_ID = 'design-studio'
export const SCREENSHOT_DIR = '.design-studio/screenshots'
const MAX_SCREENSHOTS = 60
const SCREENSHOT_PATTERN = /^(desktop|tablet|mobile|design)-[^/]*\.png$/i
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

const DEVICES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1024 },
  mobile: { width: 390, height: 844 },
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeDevice(value) {
  return typeof value === 'string' && DEVICES[value] ? value : 'desktop'
}

export function deviceSize(value) {
  return DEVICES[normalizeDevice(value)]
}

/** Absolute screenshot directory: explicit path or `<cwd>/.design-studio/screenshots`. */
export function resolveOutputDir(value, cwd) {
  const requested = typeof value === 'string' && value.trim() ? value.trim() : SCREENSHOT_DIR
  return isAbsolute(requested) ? requested : resolvePath(cwd || process.cwd(), requested)
}

/** Working directory of the calling session, with safe fallbacks. */
export function sessionDirectory(ctx, exec) {
  try {
    const workingDirectory = ctx.get('workingDirectory')
    if (workingDirectory) {
      if (exec && exec.agent && exec.agent.session) {
        const directory = workingDirectory.get(exec.agent.session)
        if (directory) return directory
      }
      if (workingDirectory.defaultDirectory) return workingDirectory.defaultDirectory
    }
  } catch (error) {
    /* fall through to the process directory */
  }
  return process.cwd()
}

/** True when `target` is the same path as, or below, `directory`. */
export function isInsideDirectory(directory, target) {
  const relation = relative(resolvePath(directory), resolvePath(target))
  return relation === '' || (relation !== '..' && !relation.startsWith('..' + sep) && !isAbsolute(relation))
}

/** True when the URL's host is loopback (so external DNS can be blocked safely). */
export function isLoopbackUrl(url) {
  try {
    const parsed = new URL(String(url))
    return LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())
  } catch (error) {
    return false
  }
}

/** Add the Design Studio panel deep link to an arbitrary GUI URL. */
export function panelUrl(baseUrl) {
  const url = new URL(String(baseUrl))
  url.searchParams.set('panel', PANEL_ID)
  return url.toString()
}

/** Authenticated DSH Web GUI URL; throws a readable error when the host surface is absent. */
export function authenticatedGuiUrl(ctx) {
  const webApp = ctx.get('webApp')
  const connection = ctx.get('connection')
  if (!webApp || typeof webApp.getAdvertisedUrl !== 'function') {
    throw new Error('The DSH Web GUI is not available in this host, so the panel cannot be opened for verification.')
  }
  if (!connection || typeof connection.authenticatedUrl !== 'function') {
    throw new Error('The host cannot mint an authenticated Web GUI URL, so the panel cannot be opened for verification.')
  }
  return connection.authenticatedUrl(webApp.getAdvertisedUrl())
}

function errorCollector() {
  const errors = []
  const push = (text) => {
    const value = String(text == null ? '' : text).replace(/\s+/g, ' ').trim()
    if (!value) return
    if (errors.indexOf(value) !== -1) return
    if (errors.length < 12) errors.push(value.slice(0, 300))
  }
  return {
    errors,
    listener(message) {
      const params = (message && message.params) || {}
      if (message.method === 'Runtime.exceptionThrown') {
        const details = params.exceptionDetails || {}
        push(details.text || (details.exception && details.exception.description))
        return
      }
      if (message.method === 'Log.entryAdded') {
        const entry = params.entry || {}
        if (entry.level === 'error') push(entry.text)
        return
      }
      if (message.method === 'Runtime.consoleAPICalled') {
        if (params.type !== 'error') return
        const args = params.args || []
        push(args.map((arg) => {
          if (!arg) return ''
          if (arg.value !== undefined) return String(arg.value)
          return arg.description || ''
        }).join(' '))
      }
    },
  }
}

/**
 * Run one headless-Chrome task, retrying with Chrome's sandbox disabled only
 * when the sandboxed attempt could not complete. `DSH_DESIGN_CHROME_NO_SANDBOX`
 * can forbid the fallback entirely.
 */
async function runWithChrome(run, options = {}) {
  let lastError = null
  for (const allowNoSandbox of resolveSandboxAttempts()) {
    let browser = null
    try {
      browser = await launchChrome({ allowNoSandbox, blockNetwork: options.blockNetwork })
      return await run(browser)
    } catch (error) {
      lastError = error
    } finally {
      if (browser) await closeChrome(browser)
    }
  }
  throw lastError || new Error('Headless Chrome could not run.')
}

async function savePng(directory, label, buffer) {
  await mkdir(directory, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const suffix = Math.random().toString(36).slice(2, 6)
  const file = join(directory, label + '-' + stamp + '-' + suffix + '.png')
  await writeFile(file, buffer)
  const size = pngSize(buffer)
  return {
    label,
    path: file,
    width: size ? size.width : null,
    height: size ? size.height : null,
    bytes: buffer.length,
  }
}

/** Keep screenshot directories bounded without touching files we did not name. */
async function pruneScreenshots(directory, keep = MAX_SCREENSHOTS) {
  try {
    const names = await readdir(directory)
    const ours = names.filter((name) => SCREENSHOT_PATTERN.test(name))
    if (ours.length <= keep) return 0
    const entries = await Promise.all(ours.map(async (name) => {
      try {
        return { name, mtime: (await stat(join(directory, name))).mtimeMs }
      } catch (error) {
        return { name, mtime: 0 }
      }
    }))
    entries.sort((a, b) => b.mtime - a.mtime)
    let removed = 0
    for (const entry of entries.slice(keep)) {
      try {
        await rm(join(directory, entry.name), { force: true })
        removed += 1
      } catch (error) {
        /* ignore */
      }
    }
    return removed
  } catch (error) {
    return 0
  }
}

function safeOrigin(baseUrl) {
  try {
    const url = new URL(String(baseUrl))
    return url.protocol + '//' + url.host
  } catch (error) {
    return 'unknown'
  }
}

function bindAbort(exec, onAbort) {
  if (!exec || !exec.signal) return () => {}
  if (exec.signal.aborted) {
    onAbort()
    return () => {}
  }
  exec.signal.addEventListener('abort', onAbort, { once: true })
  return () => {
    try {
      exec.signal.removeEventListener('abort', onAbort)
    } catch (error) {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------------- *
 * Panel capture helpers
 * ------------------------------------------------------------------------- */

async function panelClip(client, sessionId) {
  const clip = await evaluate(client, sessionId, `(() => {
    const root = document.querySelector('.dsx-root');
    if (!root) return null;
    const box = root.getBoundingClientRect();
    return { x: box.x + window.scrollX, y: box.y + window.scrollY, width: box.width, height: box.height };
  })()`).catch(() => null)
  if (!clip || !clip.width || !clip.height) return null
  return clip
}

/** Temporarily release the panel's internal scroll containers for a long capture. */
async function expandLayout(client, sessionId) {
  return evaluate(client, sessionId, `(() => {
    if (document.getElementById('dsx-verify-expand')) return true;
    const style = document.createElement('style');
    style.id = 'dsx-verify-expand';
    style.textContent = 'html,body{height:auto !important;overflow:visible !important;}' +
      '.dsx-root{height:auto !important;min-height:900px !important;}' +
      '.dsx-body{height:auto !important;min-height:0 !important;align-items:stretch !important;}' +
      '.dsx-left,.dsx-right{overflow:visible !important;height:auto !important;}' +
      '.dsx-canvas{overflow:visible !important;}' +
      '.dsx-canvas-scroll{overflow:visible !important;height:auto !important;align-items:flex-start !important;}';
    document.head.appendChild(style);
    return true;
  })()`).catch(() => false)
}

async function restoreLayout(client, sessionId) {
  return evaluate(client, sessionId, `(() => {
    const style = document.getElementById('dsx-verify-expand');
    if (style) style.remove();
    return true;
  })()`).catch(() => false)
}

async function capturePanel(client, sessionId, outputDir, label, options = {}) {
  const fullPage = Boolean(options.fullPage)
  if (fullPage) {
    await expandLayout(client, sessionId)
    await delay(250)
  }
  try {
    const clip = options.includeShell ? null : await panelClip(client, sessionId)
    const buffer = await capturePng(client, sessionId, { fullPage, clip })
    return savePng(outputDir, label, buffer)
  } finally {
    if (fullPage) await restoreLayout(client, sessionId)
  }
}

/* ------------------------------------------------------------------------- *
 * Interaction steps
 * ------------------------------------------------------------------------- */

function clickBySelectorExpression(selector) {
  return `(() => {
    const element = document.querySelector(${JSON.stringify(String(selector))});
    if (!element) return { clicked: false, reason: 'selector not found' };
    element.click();
    return { clicked: true };
  })()`
}

function clickByTextExpression(text) {
  const wanted = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase()
  return `(() => {
    const wanted = ${JSON.stringify(wanted)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="tab"], label'));
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const scored = candidates
      .filter(visible)
      .map((element) => {
        const label = normalize((element.getAttribute('aria-label') || '') + ' ' + (element.textContent || '') + ' ' + (element.getAttribute('title') || ''));
        return { element, label };
      })
      .filter((item) => item.label && item.label.indexOf(wanted) !== -1)
      .sort((a, b) => a.label.length - b.label.length);
    const target = scored[0];
    if (!target) return { clicked: false, reason: 'text not found' };
    target.element.click();
    return { clicked: true, text: target.label.slice(0, 80) };
  })()`
}

function typeIntoExpression(selector, text) {
  return `(() => {
    const element = document.querySelector(${JSON.stringify(String(selector))});
    if (!element) return { typed: false, reason: 'selector not found' };
    element.focus();
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor.set.call(element, ${JSON.stringify(String(text))});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { typed: true };
  })()`
}

async function runSteps(client, sessionId, steps, outputDir, options = {}) {
  const results = []
  const screenshots = []
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index] || {}
    const action = typeof step.action === 'string' ? step.action : ''
    const result = { index, action }
    try {
      if (action === 'click') {
        const expression = step.selector
          ? clickBySelectorExpression(step.selector)
          : clickByTextExpression(step.text)
        const outcome = await evaluate(client, sessionId, expression)
        result.ok = Boolean(outcome && outcome.clicked)
        if (outcome && outcome.text) result.text = outcome.text
        if (!result.ok) result.error = (outcome && outcome.reason) || 'target not found'
      } else if (action === 'type') {
        if (!step.selector) throw new Error('type requires a selector')
        const outcome = await evaluate(client, sessionId, typeIntoExpression(step.selector, step.text == null ? '' : step.text))
        result.ok = Boolean(outcome && outcome.typed)
        if (!result.ok) result.error = (outcome && outcome.reason) || 'target not found'
      } else if (action === 'clickAt') {
        if (!step.selector) throw new Error('clickAt requires a selector')
        const xRatio = clamp(Number(step.x) || 0, 0, 1)
        const yRatio = clamp(Number(step.y) || 0, 0, 1)
        const outcome = await evaluate(client, sessionId, `(() => {
          const element = document.querySelector(${JSON.stringify(String(step.selector))});
          if (!element) return { clicked: false, reason: 'selector not found' };
          const box = element.getBoundingClientRect();
          const clientX = box.left + box.width * ${xRatio};
          const clientY = box.top + box.height * ${yRatio};
          const options = { bubbles: true, cancelable: true, clientX: clientX, clientY: clientY, button: 0 };
          element.dispatchEvent(new MouseEvent('mousedown', options));
          element.dispatchEvent(new MouseEvent('mouseup', options));
          element.dispatchEvent(new MouseEvent('click', options));
          return { clicked: true, clientX: clientX, clientY: clientY };
        })()`)
        result.ok = Boolean(outcome && outcome.clicked)
        if (!result.ok) result.error = (outcome && outcome.reason) || 'target not found'
      } else if (action === 'select') {
        if (!step.selector) throw new Error('select requires a selector')
        const value = step.value == null ? step.text : step.value
        const outcome = await evaluate(client, sessionId, `(() => {
          const element = document.querySelector(${JSON.stringify(String(step.selector))});
          if (!element) return { selected: false, reason: 'selector not found' };
          element.value = ${JSON.stringify(String(value == null ? '' : value))};
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return { selected: true };
        })()`)
        result.ok = Boolean(outcome && outcome.selected)
        if (!result.ok) result.error = (outcome && outcome.reason) || 'target not found'
      } else if (action === 'wait') {
        const ms = clamp(Number(step.ms) || 300, 0, 120000)
        await delay(ms)
        result.ok = true
        result.ms = ms
      } else if (action === 'screenshot') {
        const label = typeof step.label === 'string' && step.label.trim() ? step.label.trim() : 'step-' + (index + 1)
        const shot = await capturePanel(client, sessionId, outputDir, label, options)
        screenshots.push(shot)
        result.ok = true
        result.screenshot = shot.path
      } else {
        result.ok = false
        result.error = 'unsupported action "' + action + '"'
      }
    } catch (error) {
      result.ok = false
      result.error = String((error && error.message) || error)
    }
    results.push(result)
    await delay(150)
  }
  return { results, screenshots }
}

/* ------------------------------------------------------------------------- *
 * Verdict computation
 * ------------------------------------------------------------------------- */

function computeIssues(report) {
  const issues = []
  const add = (code, severity, message) => issues.push({ code, severity, message })
  const audit = report.auditAfterSteps || report.audit || {}
  const bodyChildren = audit.dom && Array.isArray(audit.dom.bodyChildren) ? audit.dom.bodyChildren : []

  if (!report.panelMounted) add('panel-not-mounted', 'error', 'The Design Studio panel did not mount in the headless page.')
  if (report.preparation && report.preparation.mounted === false) add('panel-preparation', 'error', 'Dialogs/deep link did not reach the Design Studio panel.')
  if (bodyChildren.length && bodyChildren.length !== 3) add('layout-columns', 'error', 'Expected .dsx-left, .dsx-canvas and .dsx-right inside .dsx-body; got ' + bodyChildren.length + '.')
  if (audit.overflow) {
    if (audit.overflow.documentHorizontal) add('overflow-document', 'error', 'The page has horizontal overflow.')
    if (audit.overflow.rootHorizontal) add('overflow-panel', 'error', 'The panel has horizontal overflow.')
  }
  if (!audit.iframe) add('artboard-iframe', 'error', 'The artboard iframe is missing.')
  if (audit.colors) {
    if (audit.colors.textContrast != null && audit.colors.textContrast < 4.5) {
      add('contrast-text', 'error', 'Panel text contrast is ' + audit.colors.textContrast + ':1 (AA needs 4.5:1).')
    }
    if (audit.colors.primaryContrast != null && audit.colors.primaryContrast < 4.5) {
      add('contrast-primary', 'error', 'Primary action contrast is ' + audit.colors.primaryContrast + ':1 (AA needs 4.5:1).')
    }
  }
  if (Array.isArray(report.consoleErrors) && report.consoleErrors.length) {
    add('console-errors', 'warn', 'Console captured ' + report.consoleErrors.length + ' error(s).')
  }
  const unlabeled = audit.a11y && Array.isArray(audit.a11y.unlabeledButtons) ? audit.a11y.unlabeledButtons : []
  if (unlabeled.length) add('a11y-labels', 'warn', unlabeled.length + ' visible button(s) have no accessible name.')
  if (report.steps && Array.isArray(report.steps.results)) {
    const failed = report.steps.results.filter((step) => !step.ok)
    if (failed.length) add('steps-failed', 'error', failed.length + ' interaction step(s) failed.')
  }
  const iframe = report.iframeAudit
  if (iframe && iframe.available) {
    if (iframe.document && iframe.document.horizontalOverflow) add('design-overflow', 'error', 'The generated design overflows horizontally inside the artboard.')
    if (iframe.colors && iframe.colors.textContrast != null && iframe.colors.textContrast < 4.5) {
      add('design-contrast', 'warn', 'Generated design text contrast is ' + iframe.colors.textContrast + ':1.')
    }
    if (iframe.structure && iframe.structure.brokenImages) add('design-images', 'warn', iframe.structure.brokenImages + ' image(s) failed to load in the design.')
    if (iframe.a11y && iframe.a11y.unnamedInteractive) add('design-a11y', 'warn', iframe.a11y.unnamedInteractive + ' interactive element(s) in the design have no accessible name.')
  }
  return issues
}

function formatIssueList(issues) {
  if (!issues.length) return ['- result: PASS (no issues found)']
  const lines = ['- result: ' + (issues.some((issue) => issue.severity === 'error') ? 'FAIL' : 'PASS (warnings only)') + ' (' + issues.length + ' issue(s))']
  for (const issue of issues) lines.push('  - [' + issue.severity + '] ' + issue.code + ': ' + issue.message)
  return lines
}

/* ------------------------------------------------------------------------- *
 * design_verify_ui
 * ------------------------------------------------------------------------- */

/**
 * Page preparation for a fresh headless profile: dismiss a first-run notice
 * dialog when present, then click the Design Studio sidebar entry when the
 * panel itself is not mounted yet. It is re-run until the panel appears, so it
 * also handles layered dialogs and a late shell restore.
 */
const PREPARE_EXPRESSION = `(() => {
  const result = { panelPresent: Boolean(document.querySelector('.dsx-root')), dismissed: [], clicked: false };
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const visible = (element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const textOf = (element) => normalize(
    (element.getAttribute('aria-label') || '') + ' ' +
    (element.textContent || '') + ' ' +
    (element.getAttribute('title') || '')
  );
  const all = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="tab"], [tabindex], span, div'));
  const notice = all.find((element) => {
    const text = textOf(element);
    return visible(element) && /^(continue|got it|i understand|ok|继续|知道了|好的)$/i.test(text);
  });
  if (notice) {
    notice.click();
    result.dismissed.push(textOf(notice).slice(0, 40));
    return result;
  }
  if (!result.panelPresent) {
    const candidates = all
      .filter((element) => visible(element) && /design\\s*studio|设计工作室/i.test(textOf(element)))
      .map((element) => ({ element, length: textOf(element).length }))
      .sort((a, b) => a.length - b.length);
    const candidate = candidates[0];
    if (candidate) {
      const clickable = candidate.element.closest('button, a, [role="button"], [role="menuitem"], [role="tab"], [tabindex]') || candidate.element;
      clickable.click();
      result.clicked = true;
      result.clickedText = textOf(candidate.element).slice(0, 60);
    } else {
      result.probe = all
        .filter((element) => visible(element) && /studio|设计|plugins|自动化/i.test(textOf(element)))
        .slice(0, 12)
        .map((element) => ({ tag: element.tagName, role: element.getAttribute('role') || '', text: textOf(element).slice(0, 40) }));
    }
  }
  return result;
})()`

async function preparePanel(client, sessionId) {
  const steps = []
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let state = null
    try {
      state = await evaluate(client, sessionId, PREPARE_EXPRESSION)
    } catch (error) {
      state = null
    }
    if (state) steps.push(state)
    if (state && state.panelPresent) return { mounted: true, steps }
    await delay(350)
  }
  return { mounted: false, steps }
}

/** Audit the generated design inside the sandboxed artboard iframe. */
export async function auditArtboard(client, sessionId) {
  const errors = []
  // Sandboxed srcdoc iframes are site-isolated, so they usually appear as an
  // out-of-process `iframe` target rather than a child in the page frame tree.
  try {
    const iframeTarget = await findIframeTarget(client)
    if (iframeTarget) {
      const value = await evaluateInTarget(client, iframeTarget.targetId, DESIGN_AUDIT_EXPRESSION)
      return Object.assign({ available: true, via: 'iframe-target', frameUrl: iframeTarget.url || null }, value || {})
    }
  } catch (error) {
    errors.push(String((error && error.message) || error))
  }
  try {
    const frames = await listFrames(client, sessionId)
    const child = frames.find((frame) => frame.parentId && frame.url === 'about:srcdoc')
      || frames.find((frame) => frame.parentId && frame.url.indexOf('about:') === 0)
      || frames.find((frame) => frame.parentId)
    if (!child) return { available: false, reason: errors[0] || 'no artboard frame found' }
    const value = await evaluateInFrame(client, sessionId, child.id, DESIGN_AUDIT_EXPRESSION)
    return Object.assign({ available: true, via: 'frame-tree', frameUrl: child.url || null }, value || {})
  } catch (error) {
    errors.push(String((error && error.message) || error))
  }
  return { available: false, reason: errors.join(' | ') || 'artboard audit unavailable' }
}

function formatVerifyReport(report) {
  const lines = []
  lines.push('Design Studio UI verification')
  const issues = Array.isArray(report.issues) ? report.issues : []
  lines.push.apply(lines, formatIssueList(issues))
  lines.push('- gui: ' + report.guiHost + ' (headless Chrome, isolated profile)')
  lines.push('- browser: sandbox ' + (report.sandbox || 'unknown') + ', network ' + (report.network || 'unknown') + ', capture ' + (report.capture || 'panel'))
  const viewport = report.viewport || {}
  lines.push('- device: ' + (report.device || 'desktop') + ' ' + (viewport.width || '?') + 'x' + (viewport.height || '?'))
  if (report.pageUrl) {
    lines.push('- page: ' + report.pageUrl + ' (deep link kept panel param: ' + (report.pageQueryKeptPanelParam ? 'yes' : 'no') + ')')
  }
  if (report.preparation && Array.isArray(report.preparation.steps)) {
    const dismissed = []
    let clicked = false
    for (const step of report.preparation.steps) {
      if (step && Array.isArray(step.dismissed)) dismissed.push.apply(dismissed, step.dismissed)
      if (step && step.clicked) clicked = true
    }
    if (dismissed.length) lines.push('- dismissed dialogs: ' + Array.from(new Set(dismissed)).join(', '))
    lines.push('- sidebar entry click: ' + (clicked ? 'clicked' : 'not needed'))
    for (const step of report.preparation.steps) {
      if (step && Array.isArray(step.probe) && step.probe.length) {
        lines.push('- dom probe: ' + step.probe.map((item) => item.tag + (item.role ? '[' + item.role + ']' : '') + ' "' + item.text + '"').join(' | '))
      }
    }
  }
  if (Array.isArray(report.screenshots) && report.screenshots.length) {
    lines.push('- screenshots (call read_image on these paths to see them):')
    for (const shot of report.screenshots) {
      lines.push('  - ' + shot.label + ': ' + shot.path + ' (' + (shot.width || '?') + 'x' + (shot.height || '?') + ', ' + Math.round(shot.bytes / 1024) + ' KB)')
    }
  }
  const audit = report.auditAfterSteps || report.audit || {}
  if (audit.columns) {
    const describe = (part) => (part ? 'x=' + part.x + ' ' + part.width + 'x' + part.height : 'absent')
    lines.push('- columns: left ' + describe(audit.columns.left) + ', canvas ' + describe(audit.columns.canvas) + ', inspector ' + describe(audit.columns.right))
  }
  const bodyChildren = audit.dom && Array.isArray(audit.dom.bodyChildren) ? audit.dom.bodyChildren : []
  if (audit.dom) {
    lines.push('- layout: ' + (bodyChildren.length === 3 ? 'ok' : 'BROKEN') + ' (body children: ' + bodyChildren.map((child) => child.tag + '.' + child.cls).join(', ') + ')')
  }
  if (audit.iframe) {
    lines.push('- artboard iframe: present, sandbox="' + String(audit.iframe.sandbox) + '", ' + (audit.iframe.rect ? audit.iframe.rect.width + 'x' + audit.iframe.rect.height : 'unmeasured'))
  }
  if (report.iframeAudit) {
    if (report.iframeAudit.available) {
      const design = report.iframeAudit
      const contrast = design.colors && design.colors.textContrast != null ? design.colors.textContrast + ':1' : '?'
      lines.push('- design inside artboard: ' + (design.document ? design.document.scrollWidth + 'x' + design.document.scrollHeight : '?') +
        ', overflow ' + (design.document && design.document.horizontalOverflow ? 'YES' : 'no') +
        ', text contrast ' + contrast +
        ', headings ' + (design.typography && design.typography.headingSamples ? design.typography.headingSamples.length : 0))
    } else {
      lines.push('- design inside artboard: unavailable (' + (report.iframeAudit.reason || 'unknown') + ')')
    }
  }
  if (audit.topbar) {
    const bar = audit.topbar;
    lines.push('- topbar: ' + bar.rect.width + 'x' + bar.rect.height + ' (scroll ' + bar.scrollWidth + '/' + bar.clientWidth + ')')
    if (bar.brand) {
      const brand = bar.brand;
      lines.push('- brand: ' + brand.display + '/' + brand.flexDirection + '/' + brand.flexWrap + ' ws=' + brand.whiteSpace + ' rect=' + brand.rect.width + 'x' + brand.rect.height + ' children=' + brand.children.map((child) => child.tag + ':' + child.rect.width + 'x' + child.rect.height + '@' + child.rect.x + ',' + child.rect.y).join(' '))
    }
  }
  if (audit.project) {
    lines.push('- project: "' + String(audit.project.active || '') + '" (' + audit.project.options + ' project(s) in the switcher)')
  }
  if (audit.controls) {
    lines.push('- controls: ' + audit.controls.chips + ' chips, ' + audit.controls.buttons + ' buttons, ' + audit.controls.historyRows + ' version rows'
      + (audit.controls.commentPins ? ', ' + audit.controls.commentPins + ' comment pins' : '')
      + (audit.controls.compareArtboards ? ', ' + audit.controls.compareArtboards + ' compare artboards' : ''))
  }
  const colors = audit.colors || {}
  if (colors.rootBackground || colors.rootText) {
    lines.push('- colors: background ' + (colors.rootBackground || '?') + ', text ' + (colors.rootText || '?') + ', text contrast ' + (colors.textContrast == null ? '?' : colors.textContrast + ':1'))
  }
  if (colors.primaryBackground || colors.primaryText) {
    lines.push('- primary action: background ' + (colors.primaryBackground || '?') + ', label ' + (colors.primaryText || '?') + ', contrast ' + (colors.primaryContrast == null ? '?' : colors.primaryContrast + ':1'))
  }
  lines.push('- theme captured: ' + (audit.theme || 'unknown') + (report.requestedTheme ? ' + ' + report.requestedTheme : '') + (report.themeSwitchApplied === false ? ' (theme switch did not change the palette)' : ''))
  if (report.steps && Array.isArray(report.steps.results) && report.steps.results.length) {
    lines.push('- interaction steps: ' + report.steps.results.map((step) => (step.ok ? 'ok' : 'FAIL') + ' ' + step.action + (step.text ? ' "' + step.text + '"' : '')).join(', '))
  }
  if (report.consoleErrors && report.consoleErrors.length) {
    lines.push('- console errors:')
    for (const message of report.consoleErrors) lines.push('  - ' + message)
  } else {
    lines.push('- console errors: none captured')
  }
  lines.push('')
  lines.push('Next: call read_image with a screenshot path above to inspect the panel visually.')
  return lines.join('\n')
}

export function designVerifyUiTool(ctx) {
  return {
    name: 'design_verify_ui',
    description:
      'Screenshot and audit the Design Studio panel in the DSH Web GUI. Launches an isolated headless Chrome, opens the authenticated Web GUI with the ?panel=design-studio deep link, waits for the panel, optionally runs interaction steps, captures PNG screenshots (panel-cropped by default), audits layout/contrast/console/AX and the generated design inside the artboard iframe, and returns actionable issues. The returned screenshot paths can be inspected with read_image.',
    parameters: {
      type: 'object',
      properties: {
        device: {
          type: 'string',
          enum: ['desktop', 'tablet', 'mobile'],
          description: 'Viewport preset. Defaults to desktop (1440x900).',
        },
        theme: {
          type: 'string',
          enum: ['current', 'dark', 'light'],
          description: 'Also capture this theme after the current one. Defaults to current.',
        },
        full_page: {
          type: 'boolean',
          description: 'Expand the panel scroll containers and capture the full document height. Defaults to false.',
        },
        include_shell: {
          type: 'boolean',
          description: 'Capture the whole DSH shell instead of cropping to the Design Studio panel. Off by default so workspace/session titles do not leak into the screenshot.',
        },
        steps: {
          type: 'array',
          maxItems: 20,
          description: 'Optional interaction steps executed before the final audit, e.g. click a template chip, type a brief, or take a labeled screenshot.',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['click', 'clickAt', 'type', 'select', 'wait', 'screenshot'] },
              selector: { type: 'string', description: 'CSS selector for click/type.' },
              text: { type: 'string', description: 'Visible text to click (when selector is omitted) or text to type.' },
              label: { type: 'string', description: 'Screenshot label for action="screenshot".' },
              value: { type: 'string', description: 'Option value for action="select".' },
              x: { type: 'number', description: 'Horizontal fraction (0..1) for action="clickAt".' },
              y: { type: 'number', description: 'Vertical fraction (0..1) for action="clickAt".' },
              ms: { type: 'number', description: 'Wait duration for action="wait" (0-120000; generation can take ~90s).' },
            },
            required: ['action'],
            additionalProperties: false,
          },
        },
        output_dir: {
          type: 'string',
          description: 'Screenshot directory. Defaults to .design-studio/screenshots inside the session working directory.',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (args, value) => [{ type: 'text', text: formatVerifyReport(value || {}) }],
    },
    timeoutMs: 240000,
    async execute(args, exec) {
      const input = args && typeof args === 'object' ? args : {}
      const device = normalizeDevice(input.device)
      const viewport = deviceSize(device)
      const requestedTheme = input.theme === 'dark' || input.theme === 'light' ? input.theme : null
      const fullPage = input.full_page === true
      const includeShell = input.include_shell === true
      const steps = Array.isArray(input.steps) ? input.steps.slice(0, 20) : []
      const cwd = sessionDirectory(ctx, exec)
      const outputDir = resolveOutputDir(input.output_dir, cwd)
      const baseUrl = authenticatedGuiUrl(ctx)
      const blockNetwork = isLoopbackUrl(baseUrl)
      const report = {
        tool: 'design_verify_ui',
        ok: false,
        guiHost: safeOrigin(baseUrl),
        device,
        viewport,
        capture: includeShell ? 'shell' : 'panel',
        network: blockNetwork ? 'loopback-only' : 'open',
        screenshots: [],
        consoleErrors: [],
      }

      if (!isCdpAvailable()) {
        const file = join(outputDir, 'desktop-' + Date.now().toString(36) + '.png')
        await chromeCliScreenshot({ url: panelUrl(baseUrl), filePath: file, width: viewport.width, height: viewport.height, blockNetwork })
        report.ok = true
        report.sandbox = 'cli-fallback'
        report.screenshots.push({ label: 'fallback-screenshot', path: file, width: null, height: null, bytes: 0 })
        report.issues = [{ code: 'cdp-unavailable', severity: 'warn', message: 'CDP is unavailable; captured a CLI screenshot without audit.' }]
        report.note = 'Call read_image on the screenshot path.'
        await pruneScreenshots(outputDir)
        return report
      }

      return await runWithChrome(async (browser) => {
        report.sandbox = browser.sandboxRelaxed ? 'relaxed' : 'sandboxed'
        const client = await CdpClient.connect(browser.wsUrl)
        const releaseAbort = bindAbort(exec, () => {
          closeChrome(browser).catch(() => {})
          client.close().catch(() => {})
        })
        try {
          const collector = errorCollector()
          client.onEvent(collector.listener)
          const sessionId = await openPage(client, panelUrl(baseUrl), viewport)
          await waitFor(client, sessionId, "document.readyState === 'complete'", 20000)
          const landedLocation = await evaluate(client, sessionId, "location.origin + location.pathname + location.search")
          if (!String(landedLocation).includes('panel=design-studio')) {
            const barePath = await evaluate(client, sessionId, "location.origin + location.pathname")
            try {
              await client.send('Page.navigate', { url: String(barePath) + '?panel=design-studio' }, sessionId)
            } catch (error) {
              /* the client falls back to clicking the sidebar entry */
            }
            await waitFor(client, sessionId, "document.readyState === 'complete'", 15000)
            await delay(900)
          }
          await waitFor(client, sessionId, "!!document.querySelector('.dsx-root, .dsx-chips')", 20000)
          const preparation = await preparePanel(client, sessionId)
          report.preparation = preparation
          report.pageQueryKeptPanelParam = Boolean(await evaluate(client, sessionId, "location.search.indexOf('panel=design-studio') !== -1"))
          const mounted = preparation.mounted
          await waitFor(
            client,
            sessionId,
            "(() => { const frame = document.querySelector('.dsx-frame'); return !frame || frame.getBoundingClientRect().height > 0; })()",
            10000,
          )
          await delay(500)
          const audit = await evaluate(client, sessionId, AUDIT_EXPRESSION)
          report.audit = audit
          report.panelMounted = Boolean(mounted) && Boolean(audit && audit.panelMounted)
          report.pageUrl = await evaluate(client, sessionId, "location.origin + location.pathname")
          report.iframeAudit = await auditArtboard(client, sessionId)

          const detectedTheme = audit && audit.theme ? audit.theme : 'current'
          report.screenshots.push(await capturePanel(client, sessionId, outputDir, device + '-' + detectedTheme, { fullPage, includeShell }))

          if (steps.length) {
            const outcome = await runSteps(client, sessionId, steps, outputDir, { fullPage, includeShell })
            report.steps = outcome
            for (const shot of outcome.screenshots) report.screenshots.push(shot)
            report.auditAfterSteps = await evaluate(client, sessionId, AUDIT_EXPRESSION).catch(() => null)
            report.iframeAuditAfterSteps = await auditArtboard(client, sessionId)
          }

          if (requestedTheme && requestedTheme !== detectedTheme) {
            const expression = requestedTheme === 'dark'
              ? "(() => { document.body.setAttribute('data-ds-dark-theme', ''); return true; })()"
              : "(() => { document.body.removeAttribute('data-ds-dark-theme'); return true; })()"
            const switched = await evaluate(client, sessionId, expression)
            await delay(450)
            const secondAudit = await evaluate(client, sessionId, AUDIT_EXPRESSION)
            report.secondThemeAudit = secondAudit
            report.requestedTheme = requestedTheme
            report.themeSwitchApplied = Boolean(switched) && Boolean(secondAudit) && Boolean(audit)
              && Boolean(audit.colors && secondAudit.colors)
              && audit.colors.rootBackground !== secondAudit.colors.rootBackground
            report.screenshots.push(await capturePanel(client, sessionId, outputDir, device + '-' + requestedTheme, { fullPage, includeShell }))
          } else if (requestedTheme) {
            report.requestedTheme = requestedTheme
            report.themeSwitchApplied = true
          }

          report.consoleErrors = collector.errors
          report.issues = computeIssues(report)
          report.passed = !report.issues.some((issue) => issue.severity === 'error')
          report.ok = true
          await pruneScreenshots(outputDir)
          return report
        } finally {
          releaseAbort()
          try {
            await client.close()
          } catch (error) {
            /* ignore */
          }
        }
      }, { blockNetwork })
    },
  }
}

/* ------------------------------------------------------------------------- *
 * design_screenshot_html
 * ------------------------------------------------------------------------- */

function formatScreenshotReport(report) {
  const lines = ['Design screenshot']
  const issues = Array.isArray(report.issues) ? report.issues : []
  lines.push.apply(lines, formatIssueList(issues))
  lines.push('- source: ' + (report.source || 'unknown'))
  lines.push('- browser: sandbox ' + (report.sandbox || 'unknown') + ', network ' + (report.network || 'unknown'))
  lines.push('- viewport: ' + (report.width || '?') + 'x' + (report.height || '?') + (report.full_page ? ' (full page)' : ''))
  for (const shot of report.screenshots || []) {
    lines.push('- ' + shot.label + ': ' + shot.path + ' (' + (shot.width || '?') + 'x' + (shot.height || '?') + ', ' + Math.round(shot.bytes / 1024) + ' KB)')
  }
  lines.push('')
  lines.push('Next: call read_image with a screenshot path above to inspect the design visually.')
  return lines.join('\n')
}

export function designScreenshotHtmlTool(ctx) {
  return {
    name: 'design_screenshot_html',
    description:
      'Render a self-contained HTML design in headless Chrome and save PNG screenshots to the workspace. Provide exactly one of `html` (the complete document) or `file_path` (a local .html file inside the session working directory). Remote resources are blocked by default (`block_network: false` opts out). Use it to visually check a generated design artifact, then inspect the returned paths with read_image.',
    parameters: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'A complete self-contained HTML document to render.' },
        file_path: { type: 'string', description: 'Path to a local HTML file (absolute or session-relative); must stay inside the session working directory unless allow_outside_workspace is true.' },
        width: { type: 'number', description: 'Viewport width in CSS pixels. Defaults to 1280.' },
        height: { type: 'number', description: 'Viewport height in CSS pixels. Defaults to 900.' },
        full_page: { type: 'boolean', description: 'Capture the full document height. Defaults to false.' },
        block_network: { type: 'boolean', description: 'Block non-loopback DNS resolution while rendering. Defaults to true; pass false to load external images/fonts.' },
        allow_outside_workspace: { type: 'boolean', description: 'Allow file_path outside the session working directory. Defaults to false.' },
        output_dir: {
          type: 'string',
          description: 'Screenshot directory. Defaults to .design-studio/screenshots inside the session working directory.',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (args, value) => [{ type: 'text', text: formatScreenshotReport(value || {}) }],
    },
    timeoutMs: 180000,
    async execute(args, exec) {
      const input = args && typeof args === 'object' ? args : {}
      const inlineHtml = typeof input.html === 'string' ? input.html : ''
      const requestedPath = typeof input.file_path === 'string' ? input.file_path.trim() : ''
      if (Boolean(inlineHtml) === Boolean(requestedPath)) {
        throw new Error('Provide exactly one of `html` or `file_path`.')
      }
      const cwd = sessionDirectory(ctx, exec)
      const outputDir = resolveOutputDir(input.output_dir, cwd)
      const width = clamp(Math.round(Number(input.width) || 1280), 240, 3840)
      const height = clamp(Math.round(Number(input.height) || 900), 240, 2160)
      const fullPage = input.full_page === true
      const blockNetwork = input.block_network !== false
      const allowOutside = input.allow_outside_workspace === true
      const report = {
        tool: 'design_screenshot_html',
        ok: false,
        width,
        height,
        full_page: fullPage,
        network: blockNetwork ? 'loopback-only' : 'open',
        screenshots: [],
        issues: [],
      }
      let tempDir = null
      let targetFile = requestedPath

      try {
        if (inlineHtml) {
          tempDir = await mkdtemp(join(tmpdir(), 'dsh-design-html-'))
          targetFile = join(tempDir, 'design.html')
          await writeFile(targetFile, inlineHtml, 'utf8')
          report.source = 'inline html'
        } else {
          if (!isAbsolute(targetFile)) targetFile = resolvePath(cwd, targetFile)
          report.source = targetFile
          if (!allowOutside && !isInsideDirectory(cwd, targetFile)) {
            throw new Error('file_path must stay inside the session working directory (pass allow_outside_workspace: true to override): ' + targetFile)
          }
        }
        if (!existsSync(targetFile)) throw new Error('HTML file not found: ' + targetFile)
        const fileUrl = pathToFileURL(targetFile).toString()

        if (!isCdpAvailable()) {
          const file = join(outputDir, 'design-' + Date.now().toString(36) + '.png')
          await chromeCliScreenshot({ url: fileUrl, filePath: file, width, height, blockNetwork })
          report.sandbox = 'cli-fallback'
          report.screenshots.push({ label: 'fallback-screenshot', path: file, width: null, height: null, bytes: 0 })
          report.ok = true
          report.note = 'CDP unavailable: captured a Chrome CLI screenshot. Call read_image on the path.'
          await pruneScreenshots(outputDir)
          return report
        }

        return await runWithChrome(async (browser) => {
          report.sandbox = browser.sandboxRelaxed ? 'relaxed' : 'sandboxed'
          const client = await CdpClient.connect(browser.wsUrl)
          const releaseAbort = bindAbort(exec, () => {
            closeChrome(browser).catch(() => {})
            client.close().catch(() => {})
          })
          try {
            const sessionId = await openPage(client, fileUrl, { width, height })
            await waitFor(client, sessionId, "document.readyState === 'complete'", 15000)
            await delay(300)
            report.screenshots.push(await savePng(outputDir, 'design', await capturePng(client, sessionId, { fullPage })))
            report.ok = true
            await pruneScreenshots(outputDir)
            return report
          } finally {
            releaseAbort()
            try {
              await client.close()
            } catch (error) {
              /* ignore */
            }
          }
        }, { blockNetwork })
      } finally {
        if (tempDir) {
          try {
            await rm(tempDir, { recursive: true, force: true })
          } catch (error) {
            /* ignore */
          }
        }
      }
    },
  }
}

/* ------------------------------------------------------------------------- *
 * design_projects — agent ↔ panel project file bridge
 * ------------------------------------------------------------------------- */

const PROJECT_ROUTE = '/design-studio/projects'
const MAX_PROJECT_BYTES = 2 * 1024 * 1024

/** Shared profile-level project library the panel lists automatically. */
export function profileProjectsDirectory(env = process.env) {
  const override = env.DSH_DESIGN_PROJECTS_DIR
  if (typeof override === 'string' && override.trim()) return override.trim()
  const home = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() ? env.DSH_HOME.trim() : join(homedir(), '.dsh')
  return join(home, 'design-studio', 'projects')
}

/** List project JSON files in one directory (shared by the host tool and the route). */
async function listProjectFiles(directory) {
  let names = []
  try {
    names = await readdir(directory)
  } catch (error) {
    names = []
  }
  const projects = []
  for (const name of names) {
    if (!name.toLowerCase().endsWith('.json')) continue
    const filePath = join(directory, name)
    try {
      const info = await stat(filePath)
      if (!info.isFile()) continue
      let projectName = name
      try {
        const parsed = JSON.parse(await readFile(filePath, 'utf8'))
        const payload = parsed && parsed.project ? parsed.project : parsed
        if (payload && typeof payload.projectName === 'string' && payload.projectName) projectName = payload.projectName
      } catch (error) {
        /* keep the file name */
      }
      projects.push({ file: name, path: filePath, projectName, bytes: info.size, updatedAt: info.mtimeMs })
    } catch (error) {
      /* skip unreadable entries */
    }
  }
  projects.sort((a, b) => b.updatedAt - a.updatedAt)
  return projects
}

function projectJsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

/**
 * The read-only route behind the panel's "Published designs" list.
 * GET /design-studio/projects          -> { projects: [{ file, projectName, bytes, updatedAt }] }
 * GET /design-studio/projects/<file>   -> the project JSON
 * It never writes, never serves paths outside the library, and caps file size.
 */
export function createProjectsResource() {
  return async (request) => {
    const method = String(request.method || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
    }
    const requestUrl = new URL(request.url)
    // A server-side Request carries the client's authority in the Host header,
    // not in the placeholder request URL, so compare against Host.
    const requestHost = request.headers.get('host') || requestUrl.host
    const fetchSite = request.headers.get('sec-fetch-site')
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      return new Response('Forbidden', { status: 403 })
    }
    const origin = request.headers.get('origin')
    if (origin) {
      try {
        if (new URL(origin).host !== requestHost) return new Response('Forbidden', { status: 403 })
      } catch (error) {
        return new Response('Forbidden', { status: 403 })
      }
    }
    let pathname = ''
    try {
      pathname = decodeURIComponent(requestUrl.pathname)
    } catch (error) {
      return new Response('Bad request', { status: 400 })
    }
    const directory = profileProjectsDirectory()
    if (pathname === PROJECT_ROUTE || pathname === PROJECT_ROUTE + '/') {
      const projects = await listProjectFiles(directory)
      return projectJsonResponse({
        projects: projects.map((entry) => ({ file: entry.file, projectName: entry.projectName, bytes: entry.bytes, updatedAt: entry.updatedAt })),
      })
    }
    if (!pathname.startsWith(PROJECT_ROUTE + '/')) return new Response('Not found', { status: 404 })
    const file = pathname.slice(PROJECT_ROUTE.length + 1)
    if (!/^[a-zA-Z0-9._\-\u3400-\u9fff]+\.json$/.test(file)) return new Response('Not found', { status: 404 })
    const filePath = join(directory, file)
    if (!isInsideDirectory(directory, filePath)) return new Response('Not found', { status: 404 })
    try {
      const info = await stat(filePath)
      if (!info.isFile()) return new Response('Not found', { status: 404 })
      if (info.size > MAX_PROJECT_BYTES) return new Response('Project file is too large', { status: 413 })
      return new Response(await readFile(filePath, 'utf8'), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      })
    } catch (error) {
      return new Response('Not found', { status: 404 })
    }
  }
}


const PROJECT_FORMAT = 'dsh-design-studio/project'
const PROJECT_TEMPLATES = ['landing', 'dashboard', 'mobile', 'pricing', 'poster', 'onepager', 'form']
const PROJECT_STYLES = ['minimal', 'editorial', 'nocturne', 'brutalist', 'pastel', 'enterprise']
const PROJECT_TOKEN_DEFAULTS = {
  mode: 'light',
  accent: '#4a5cf5',
  accentText: '#ffffff',
  bg: '#ffffff',
  surface: '#f6f7f9',
  surfaceAlt: '#eef0f4',
  text: '#12151c',
  muted: '#5b6270',
  border: '#e2e5ec',
  fontDisplay: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
  fontBody: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
  radius: 12,
  density: 'regular',
  scale: 'regular',
}

/** Directory the panel and the agent exchange project JSON files through. */
export function projectsDirectory(cwd) {
  return join(cwd, '.design-studio', 'projects')
}

function projectSlug(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'design-project'
}

function hexChannels(hex) {
  const value = /^#[0-9a-f]{6}$/i.test(String(hex)) ? String(hex).slice(1) : '000000'
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function channelLuminance(value) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function hexLuminance(hex) {
  const { r, g, b } = hexChannels(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

function readableTextColor(background) {
  const luminance = hexLuminance(background)
  const white = 1.0
  const dark = hexLuminance('#14161c')
  const contrastWhite = (white + 0.05) / (luminance + 0.05)
  const contrastDark = (luminance + 0.05) / (dark + 0.05)
  return contrastWhite >= contrastDark ? '#ffffff' : '#14161c'
}

function mixHex(from, to, amount) {
  const a = hexChannels(from)
  const b = hexChannels(to)
  const t = clamp(Number(amount) || 0, 0, 1)
  const part = (value) => Math.round(value).toString(16).padStart(2, '0')
  return '#' + part(a.r + (b.r - a.r) * t) + part(a.g + (b.g - a.g) * t) + part(a.b + (b.b - a.b) * t)
}

function normalizeProjectTokens(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const tokens = Object.assign({}, PROJECT_TOKEN_DEFAULTS)
  for (const key of Object.keys(PROJECT_TOKEN_DEFAULTS)) {
    if (source[key] !== undefined && source[key] !== null) tokens[key] = source[key]
  }
  if (PROJECT_TEMPLATES.indexOf(String(tokens.mode)) !== -1) tokens.mode = 'light'
  tokens.mode = tokens.mode === 'dark' ? 'dark' : 'light'
  tokens.radius = clamp(Number(tokens.radius) || 12, 0, 28)
  tokens.density = ['compact', 'regular', 'airy'].indexOf(tokens.density) === -1 ? 'regular' : tokens.density
  tokens.scale = ['compact', 'regular', 'airy'].indexOf(tokens.scale) === -1 ? 'regular' : tokens.scale
  for (const key of ['accent', 'accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border']) {
    if (!/^#[0-9a-f]{6}$/i.test(String(tokens[key]))) tokens[key] = PROJECT_TOKEN_DEFAULTS[key]
  }
  for (const key of ['fontDisplay', 'fontBody']) {
    if (typeof tokens[key] !== 'string' || !tokens[key].trim()) tokens[key] = PROJECT_TOKEN_DEFAULTS[key]
  }
  const sourceAccentText = /^#[0-9a-f]{6}$/i.test(String(source.accentText || ''))
  if (!sourceAccentText) tokens.accentText = readableTextColor(tokens.accent)
  const sourceMuted = /^#[0-9a-f]{6}$/i.test(String(source.muted || ''))
  if (!sourceMuted) tokens.muted = mixHex(tokens.text, tokens.bg, 0.45)
  const sourceBorder = /^#[0-9a-f]{6}$/i.test(String(source.border || ''))
  if (!sourceBorder) tokens.border = mixHex(tokens.text, tokens.bg, 0.84)
  return tokens
}

/** Normalize an agent-supplied project payload into the panel's project shape. */
export function normalizeProjectPayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const project = source.project && typeof source.project === 'object' ? source.project : source
  const comments = Array.isArray(project.comments) ? project.comments.slice(0, 120).map((comment, index) => {
    if (!comment || typeof comment !== 'object') return null
    return {
      id: String(comment.id || 'c' + index),
      x: clamp(Number(comment.x) || 0, 0, 100),
      y: clamp(Number(comment.y) || 0, 0, 100),
      text: String(comment.text || '').slice(0, 500),
      at: Number(comment.at) || Date.now(),
    }
  }).filter(Boolean) : []
  return {
    id: typeof project.id === 'string' && project.id ? project.id : 'p' + Date.now().toString(36),
    projectName: String(project.projectName || project.name || 'Imported design').slice(0, 120),
    brief: typeof project.brief === 'string' ? project.brief : '',
    draftBrief: typeof project.draftBrief === 'string' ? project.draftBrief : (typeof project.brief === 'string' ? project.brief : ''),
    template: PROJECT_TEMPLATES.indexOf(project.template) === -1 ? 'landing' : project.template,
    styleId: PROJECT_STYLES.indexOf(project.styleId) === -1 ? 'minimal' : project.styleId,
    tokens: normalizeProjectTokens(project.tokens),
    history: [],
    importedHtml: typeof project.importedHtml === 'string' ? project.importedHtml.slice(0, 500000) : '',
    importedTitle: typeof project.importedTitle === 'string' ? project.importedTitle : '',
    comments: comments,
  }
}

function formatProjectReport(report) {
  const lines = ['Design project bridge']
  lines.push('- action: ' + report.action)
  lines.push('- result: ' + (report.ok ? 'ok' : 'failed'))
  if (report.directory) lines.push('- directory: ' + report.directory)
  if (report.path) lines.push('- file: ' + report.path)
  if (report.projectName) lines.push('- project: ' + report.projectName)
  if (report.bytes != null) lines.push('- bytes: ' + report.bytes)
  if (Array.isArray(report.projects) && report.projects.length) {
    lines.push('- projects:')
    for (const project of report.projects) {
      lines.push('  - ' + project.projectName + ': ' + (project.path || project.file) + ' (' + project.bytes + ' bytes)')
    }
  } else if (report.action === 'list') {
    lines.push('- projects: none published yet')
  }
  if (report.hint) lines.push('- hint: ' + report.hint)
  return lines.join('\n')
}

export function designProjectsTool(ctx) {
  return {
    name: 'design_projects',
    description:
      'Publish, list, or read Design Studio project files so the agent and the panel can exchange designs. `write` validates a project payload (name, brief, template, style, tokens, optional importedHtml/comments) and saves JSON to the shared profile library; the panel lists that library automatically under Published designs, so no manual file picking is needed. `list` and `read` inspect published projects. The library is served read-only to the local panel; nothing is uploaded.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'read', 'write'], description: 'Bridge operation.' },
        scope: { type: 'string', enum: ['profile', 'workspace'], description: 'Library to use: profile (default, shared and listed automatically in the panel) or workspace (.design-studio/projects under the session directory).' },
        name: { type: 'string', description: 'Stable file name for write/read (slugified, optional).' },
        file: { type: 'string', description: 'Project JSON file path for read; must stay inside .design-studio/projects.' },
        project: {
          type: 'object',
          additionalProperties: true,
          description: 'Project payload for write: projectName, brief, template, styleId, tokens, importedHtml, comments.',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (args, value) => [{ type: 'text', text: formatProjectReport(value || {}) }],
    },
    timeoutMs: 30000,
    async execute(args, exec) {
      const input = args && typeof args === 'object' ? args : {}
      const cwd = sessionDirectory(ctx, exec)
      const directory = input.scope === 'workspace' ? projectsDirectory(cwd) : profileProjectsDirectory()
      const report = { tool: 'design_projects', action: input.action, scope: input.scope === 'workspace' ? 'workspace' : 'profile', directory, ok: false }

      if (input.action === 'write') {
        const project = normalizeProjectPayload(input.project)
        const base = projectSlug(input.name || project.projectName)
        const fileName = base.endsWith('.json') ? base : base + '.json'
        const filePath = join(directory, fileName)
        if (!isInsideDirectory(directory, filePath)) throw new Error('Refusing to write outside the projects directory.')
        const payload = { format: PROJECT_FORMAT, version: 2, project }
        const text = JSON.stringify(payload, null, 2)
        await mkdir(directory, { recursive: true })
        await writeFile(filePath, text, 'utf8')
        report.ok = true
        report.path = filePath
        report.projectName = project.projectName
        report.bytes = Buffer.byteLength(text)
        report.hint = 'The panel lists published projects automatically (project section → Published designs); click the entry to open it.'
        return report
      }

      if (input.action === 'list') {
        const projects = await listProjectFiles(directory)
        report.ok = true
        report.projects = projects
        report.hint = 'Published projects appear in the panel automatically; /design-studio/projects serves this list read-only.'
        return report
      }

      if (input.action === 'read') {
        const requested = typeof input.file === 'string' && input.file.trim()
          ? (isAbsolute(input.file) ? input.file : join(directory, input.file.trim()))
          : join(directory, projectSlug(input.name || '') + '.json')
        if (!isInsideDirectory(directory, requested)) throw new Error('Refusing to read outside the projects directory.')
        if (!existsSync(requested)) throw new Error('Project file not found: ' + requested)
        const text = await readFile(requested, 'utf8')
        const parsed = JSON.parse(text)
        const project = normalizeProjectPayload(parsed)
        report.ok = true
        report.path = requested
        report.projectName = project.projectName
        report.bytes = Buffer.byteLength(text)
        report.project = project
        report.hint = 'The panel lists this project under Published designs; click it there to load it visually.'
        return report
      }

      throw new Error('Unknown design_projects action: ' + String(input.action))
    },
  }
}
