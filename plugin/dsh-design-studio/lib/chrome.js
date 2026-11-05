/**
 * Chromium discovery and lifecycle for the Design Studio browser tools.
 *
 * The tools drive a *separate* headless Chrome process with its own throwaway
 * profile: the user's browser profile, cookies and running windows are never
 * touched. Discovery is deliberately simple and overridable:
 *
 *   DSH_DESIGN_CHROME / CHROME_PATH -> an explicit executable
 *   platform candidates             -> a locally installed Chrome/Chromium/Edge
 *
 * Nothing here downloads a browser; a missing browser is a clear tool error.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ],
}

export class ChromeUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ChromeUnavailableError'
  }
}

/** Resolve a local Chromium executable, or null when none is installed. */
export function findChromePath(env = process.env) {
  const overrides = [env.DSH_DESIGN_CHROME, env.CHROME_PATH].filter((value) => typeof value === 'string' && value.length > 0)
  for (const candidate of overrides) {
    const expanded = candidate.replace(/^~/, homedir())
    if (existsSync(expanded)) return expanded
  }
  for (const candidate of CANDIDATES[process.platform] || []) {
    const expanded = candidate.replace(/^~/, homedir())
    if (existsSync(expanded)) return expanded
  }
  return null
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Launch one isolated headless Chromium and resolve its DevTools endpoint.
 *
 * Chrome's own sandbox can be unavailable inside another sandbox or a CI
 * container; the launch is attempted with the sandbox first and retried with
 * `--no-sandbox` only when the browser fails to expose DevTools. The throwaway
 * profile keeps the browser isolated from the user's browsing state.
 * @param {{ executablePath?: string, launchTimeoutMs?: number, allowNoSandbox?: boolean }} [options]
 * @returns {Promise<{ executable: string, profileDir: string, proc: import('node:child_process').ChildProcess, wsUrl: string }>}
 */
/**
 * Confirm that a DevTools endpoint actually answers, not merely that Chrome
 * wrote its port file. In some sandboxes Chrome starts, publishes the port and
 * then dies, so a bare port file is not enough to trust the launch.
 */
function probeDevTools(wsUrl, timeoutMs = 8000) {
  if (typeof WebSocket !== 'function') return Promise.resolve(false)
  return new Promise((resolve) => {
    let socket
    const finish = (value) => {
      clearTimeout(timer)
      try {
        if (socket) socket.close()
      } catch (error) {
        /* ignore */
      }
      resolve(value)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    try {
      socket = new WebSocket(wsUrl)
    } catch (error) {
      clearTimeout(timer)
      resolve(false)
      return
    }
    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ id: 1, method: 'Browser.getVersion' }))
      } catch (error) {
        finish(false)
      }
    }
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event && event.data)
        if (message && message.id === 1) finish(Boolean(message.result))
      } catch (error) {
        /* ignore unrelated frames */
      }
    }
    socket.onerror = () => finish(false)
    socket.onclose = () => finish(false)
  })
}

export async function launchChrome(options = {}) {
  const executable = options.executablePath || findChromePath()
  if (!executable) {
    throw new ChromeUnavailableError(
      'No Chrome/Chromium found. Install Google Chrome or set DSH_DESIGN_CHROME to a browser executable.',
    )
  }
  const profileDir = await mkdtemp(join(tmpdir(), 'dsh-design-chrome-'))
  {
    const extraArgs = options.allowNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
    const args = [
      '--headless=new',
      ...extraArgs,
      '--disable-gpu',
      '--disable-extensions',
      '--disable-dev-shm-usage',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-service-autorun',
      '--user-data-dir=' + profileDir,
      '--remote-debugging-port=0',
      'about:blank',
    ]
    const proc = spawn(executable, args, {
      stdio: 'ignore',
      detached: false,
      windowsHide: true,
      env: Object.assign({}, process.env, { CHROME_HEADLESS: '1' }),
    })
    proc.on('error', () => {
      /* surfaced through the missing endpoint below */
    })
    const portFile = join(profileDir, 'DevToolsActivePort')
    const deadline = Date.now() + (options.launchTimeoutMs || 15000)
    while (Date.now() < deadline) {
      try {
        const lines = (await readFile(portFile, 'utf8')).trim().split('\n')
        if (lines.length >= 2 && Number(lines[0]) > 0) {
          const wsUrl = 'ws://127.0.0.1:' + Number(lines[0]) + lines[1]
          if (await probeDevTools(wsUrl)) {
            return { executable, profileDir, proc, wsUrl }
          }
          break
        }
      } catch (error) {
        /* DevToolsActivePort not written yet */
      }
      if (proc.exitCode !== null) break
      await delay(100)
    }
    await closeChrome({ proc, profileDir })
  }
  throw new ChromeUnavailableError('Chrome started but did not expose a healthy DevTools endpoint in time.')
}

/** Stop the browser and remove its throwaway profile. Never throws. */
export async function closeChrome(session) {
  if (!session) return
  const proc = session.proc
  try {
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      proc.kill('SIGTERM')
      const started = Date.now()
      while (proc.exitCode === null && Date.now() - started < 2000) await delay(100)
      if (proc.exitCode === null) proc.kill('SIGKILL')
    }
  } catch (error) {
    /* already gone */
  }
  try {
    await rm(session.profileDir, { recursive: true, force: true })
  } catch (error) {
    /* best-effort cleanup */
  }
}

/** Take a Chrome CLI screenshot; the fallback path when no DevTools socket is available. */
export async function chromeCliScreenshot({ executablePath, url, filePath, width, height }) {
  const executable = executablePath || findChromePath()
  if (!executable) throw new ChromeUnavailableError('No Chrome/Chromium found. Install Google Chrome or set DSH_DESIGN_CHROME.')
  const attempts = [[], ['--no-sandbox', '--disable-setuid-sandbox']]
  let lastError = null
  for (const extraArgs of attempts) {
    const profileDir = await mkdtemp(join(tmpdir(), 'dsh-design-shot-'))
    try {
      const args = [
        '--headless=new',
        ...extraArgs,
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-breakpad',
        '--disable-crash-reporter',
        '--user-data-dir=' + profileDir,
        '--window-size=' + width + ',' + height,
        '--screenshot=' + filePath,
        '--virtual-time-budget=8000',
        url,
      ]
      await new Promise((resolve, reject) => {
        const proc = spawn(executable, args, { stdio: 'ignore', windowsHide: true })
        proc.on('error', reject)
        proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('Chrome exited with code ' + code))))
      })
      if (!existsSync(filePath)) throw new Error('Chrome exited without writing the screenshot')
      return filePath
    } catch (error) {
      lastError = error
    } finally {
      await rm(profileDir, { recursive: true, force: true })
    }
  }
  throw lastError || new ChromeUnavailableError('Chrome could not capture a screenshot.')
}
