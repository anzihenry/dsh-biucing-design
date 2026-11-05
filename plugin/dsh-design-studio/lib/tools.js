/**
 * Host tools that give the agent a visual verification loop for the Design
 * Studio panel and for generated design artifacts.
 *
 * Both tools use a separate, throwaway headless Chrome profile:
 *   - the user's own browser profile and cookies are never touched;
 *   - the DSH Web GUI is opened through `connection.authenticatedUrl()` so the
 *     temporary browser is authorized without the user pasting a token;
 *   - screenshots land in the workspace and their paths are returned, so the
 *     agent can inspect them with the existing `read_image` tool.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AUDIT_EXPRESSION } from './audit.js'
import { CdpClient, capturePng, evaluate, isCdpAvailable, openPage, pngSize, waitFor } from './cdp.js'
import { chromeCliScreenshot, closeChrome, launchChrome } from './chrome.js'

export const PANEL_ID = 'design-studio'
export const SCREENSHOT_DIR = '.design-studio/screenshots'

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

/** Absolute screenshot directory: explicit CLI-style path or `<cwd>/.design-studio/screenshots`. */
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

/**
 * Run one headless-Chrome task, retrying with Chrome's sandbox disabled only
 * when the sandboxed attempt could not complete. The retry keeps normal hosts
 * on the full sandbox and still works inside containerized/CI DSH hosts where
 * Chrome's own sandbox is unavailable.
 */
async function runWithChrome(run) {
  let lastError = null
  for (const allowNoSandbox of [false, true]) {
    let browser = null
    try {
      browser = await launchChrome({ allowNoSandbox })
      return await run(browser)
    } catch (error) {
      lastError = error
    } finally {
      if (browser) await closeChrome(browser)
    }
  }
  throw lastError || new Error('Headless Chrome could not run.')
}

/**
 * Page preparation for a fresh headless profile: dismiss a first-run notice
 * dialog when present, then click the Design Studio sidebar entry when the
 * panel itself is not mounted yet. It is re-run until the panel appears, so it
 * also handles layered dialogs and a late shell restore.
 */
const PREPARE_EXPRESSION = `(() => {
  const result = { panelPresent: Boolean(document.querySelector('.dsx-root')), dismissed: [], clicked: false };
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
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
      .filter((element) => visible(element) && /design\s*studio|设计工作室/i.test(textOf(element)))
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

/**
 * Dismiss dialogs and open the panel; returns diagnostics for the report.
 * The deep link normally selects the panel, but a fresh browser profile shows a
 * first-run notice and the authenticated URL redirect can drop the query, so UI
 * preparation is the reliable path.
 */
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

/* ------------------------------------------------------------------------- *
 * design_verify_ui
 * ------------------------------------------------------------------------- */

function formatVerifyReport(report) {
  const lines = []
  lines.push('Design Studio UI verification')
  lines.push('- ok: ' + (report.ok ? 'yes' : 'no'))
  lines.push('- gui: ' + report.guiHost + ' (headless Chrome, isolated profile)')
  const viewport = report.viewport || {}
  lines.push('- device: ' + (report.device || 'desktop') + ' ' + (viewport.width || '?') + 'x' + (viewport.height || '?'))
  lines.push('- panel mounted: ' + (report.panelMounted ? 'yes' : 'NO — deep link or client module may not be live yet'))
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
  const audit = report.audit || {}
  if (audit.columns) {
    const describe = (part) => (part ? 'x=' + part.x + ' ' + part.width + 'x' + part.height : 'absent')
    lines.push('- columns: left ' + describe(audit.columns.left) + ', canvas ' + describe(audit.columns.canvas) + ', inspector ' + describe(audit.columns.right))
    if (audit.body) lines.push('- body: display ' + audit.body.display + ' / ' + audit.body.flexDirection + ' / wrap ' + audit.body.flexWrap + ' / width ' + audit.body.width)
  }
  const bodyChildren = audit.dom && Array.isArray(audit.dom.bodyChildren) ? audit.dom.bodyChildren : []
  const layoutBroken = !report.panelMounted || bodyChildren.length !== 3
  if (audit.dom) {
    lines.push('- layout: ' + (layoutBroken ? 'BROKEN' : 'ok') + ' (body children: ' + bodyChildren.map((child) => child.tag + '.' + child.cls).join(', ') + ')')
    if (layoutBroken) {
      lines.push('- dom: bodyCount ' + audit.dom.bodyCount + ', left ' + audit.dom.leftCount + ', right ' + audit.dom.rightCount)
      lines.push('- body children: ' + bodyChildren.map((child) => child.tag + '.' + child.cls + ' @' + (child.rect ? child.rect.x + ',' + child.rect.y : '?') + ' wrap=' + child.wrap).join(' | '))
      if (Array.isArray(audit.sections) && audit.sections.length) {
        lines.push('- sections: ' + audit.sections.map((section) => (section.title || '?').trim() + ' @' + section.x + ',' + section.y + ' ' + section.width + 'x' + section.height).join(' | '))
      }
    }
  }
  if (audit.controls) {
    lines.push('- controls: ' + audit.controls.chips + ' chips, ' + audit.controls.buttons + ' buttons, ' + audit.controls.historyRows + ' version rows')
  }
  if (audit.iframe && audit.iframe.rect) {
    lines.push('- artboard iframe: present, sandbox="' + String(audit.iframe.sandbox) + '", ' + audit.iframe.rect.width + 'x' + audit.iframe.rect.height)
  }
  if (audit.overflow) {
    lines.push('- horizontal overflow: document ' + (audit.overflow.documentHorizontal ? 'YES' : 'no') + ', panel ' + (audit.overflow.rootHorizontal ? 'YES' : 'no'))
  }
  const colors = audit.colors || {}
  if (colors.rootBackground || colors.rootText) {
    lines.push('- colors: background ' + (colors.rootBackground || '?') + ', text ' + (colors.rootText || '?') + ', text contrast ' + (colors.textContrast == null ? '?' : colors.textContrast + ':1'))
  }
  if (colors.primaryBackground || colors.primaryText) {
    lines.push('- primary action: background ' + (colors.primaryBackground || '?') + ', label ' + (colors.primaryText || '?') + ', contrast ' + (colors.primaryContrast == null ? '?' : colors.primaryContrast + ':1'))
  }
  lines.push('- theme captured: ' + (audit.theme || 'unknown') + (report.requestedTheme ? ' + ' + report.requestedTheme : '') + (report.themeSwitchApplied === false ? ' (theme switch did not change the palette)' : ''))
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
      'Screenshot and audit the Design Studio panel in the DSH Web GUI. Launches an isolated headless Chrome, opens the authenticated Web GUI with the ?panel=design-studio deep link, waits for the panel to render, captures PNG screenshots for the requested device and theme, and runs a layout/contrast/interaction audit. The returned screenshot paths can be inspected with read_image. Use this after changing the Design Studio plugin UI.',
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
          description: 'Capture the full document height instead of the viewport. Defaults to false.',
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
    timeoutMs: 180000,
    async execute(args, exec) {
      const input = args && typeof args === 'object' ? args : {}
      const device = normalizeDevice(input.device)
      const viewport = deviceSize(device)
      const requestedTheme = input.theme === 'dark' || input.theme === 'light' ? input.theme : null
      const fullPage = input.full_page === true
      const cwd = sessionDirectory(ctx, exec)
      const outputDir = resolveOutputDir(input.output_dir, cwd)
      const baseUrl = authenticatedGuiUrl(ctx)
      const report = {
        tool: 'design_verify_ui',
        ok: false,
        guiHost: safeOrigin(baseUrl),
        device,
        viewport,
        screenshots: [],
        consoleErrors: [],
      }

      if (!isCdpAvailable()) {
        const file = join(outputDir, 'desktop-' + Date.now().toString(36) + '.png')
        await chromeCliScreenshot({ url: panelUrl(baseUrl), filePath: file, width: viewport.width, height: viewport.height })
        report.ok = true
        report.screenshots.push({ label: 'fallback-screenshot', path: file, width: null, height: null, bytes: 0 })
        report.note = 'CDP unavailable: captured a Chrome CLI screenshot without layout audit. Call read_image on the path.'
        return report
      }

      return await runWithChrome(async (browser) => {
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
          const detectedTheme = audit && audit.theme ? audit.theme : 'current'
          report.screenshots.push(await savePng(outputDir, device + '-' + detectedTheme, await capturePng(client, sessionId, { fullPage })))
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
            report.screenshots.push(await savePng(outputDir, device + '-' + requestedTheme, await capturePng(client, sessionId, { fullPage })))
          } else if (requestedTheme) {
            report.requestedTheme = requestedTheme
            report.themeSwitchApplied = true
          }
          report.consoleErrors = collector.errors
          report.ok = true
          return report
        } finally {
          releaseAbort()
          try {
            await client.close()
          } catch (error) {
            /* ignore */
          }
        }
      })
    },
  }
}

/* ------------------------------------------------------------------------- *
 * design_screenshot_html
 * ------------------------------------------------------------------------- */

function formatScreenshotReport(report) {
  const lines = ['Design screenshot', '- ok: ' + (report.ok ? 'yes' : 'no')]
  lines.push('- source: ' + (report.source || 'unknown'))
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
      'Render a self-contained HTML design in headless Chrome and save PNG screenshots to the workspace. Provide exactly one of `html` (the complete document) or `file_path` (a local .html file). Use it to visually check a generated design artifact, then inspect the returned paths with read_image. Nothing is uploaded and the temporary browser profile is discarded.',
    parameters: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'A complete self-contained HTML document to render.' },
        file_path: { type: 'string', description: 'Path to a local HTML file (absolute, or relative to the session working directory).' },
        width: { type: 'number', description: 'Viewport width in CSS pixels. Defaults to 1280.' },
        height: { type: 'number', description: 'Viewport height in CSS pixels. Defaults to 900.' },
        full_page: { type: 'boolean', description: 'Capture the full document height. Defaults to false.' },
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
    timeoutMs: 120000,
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
      const report = { tool: 'design_screenshot_html', ok: false, width, height, full_page: fullPage, screenshots: [] }
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
        }
        if (!existsSync(targetFile)) throw new Error('HTML file not found: ' + targetFile)
        const fileUrl = pathToFileURL(targetFile).toString()

        if (!isCdpAvailable()) {
          const file = join(outputDir, 'design-' + Date.now().toString(36) + '.png')
          await chromeCliScreenshot({ url: fileUrl, filePath: file, width, height })
          report.screenshots.push({ label: 'fallback-screenshot', path: file, width: null, height: null, bytes: 0 })
          report.ok = true
          report.note = 'CDP unavailable: captured a Chrome CLI screenshot. Call read_image on the path.'
          return report
        }

        return await runWithChrome(async (browser) => {
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
            return report
          } finally {
            releaseAbort()
            try {
              await client.close()
            } catch (error) {
              /* ignore */
            }
          }
        })
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
