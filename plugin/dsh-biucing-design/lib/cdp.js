/**
 * A tiny Chrome DevTools Protocol client for the Design Studio browser tools.
 *
 * It speaks the flattened-session form of CDP over Node's built-in WebSocket
 * (available in modern Node/Electron), so the plugin needs no browser-automation
 * dependency. Only the handful of domains the tools use are wrapped; callers can
 * always send raw protocol methods through {@link CdpClient.send}.
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class CdpUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CdpUnavailableError'
  }
}

/** Check whether this host can speak CDP (Node exposes a global WebSocket). */
export function isCdpAvailable() {
  return typeof WebSocket === 'function'
}

export class CdpClient {
  constructor(wsUrl, options = {}) {
    if (!isCdpAvailable()) {
      throw new CdpUnavailableError('This host has no global WebSocket, so the browser DevTools protocol is unavailable.')
    }
    this.wsUrl = wsUrl
    this.timeoutMs = options.timeoutMs || 30000
    this.socket = null
    this.lastId = 0
    this.pending = new Map()
    this.listeners = new Set()
    this.closed = false
  }

  static async connect(wsUrl, options = {}) {
    const client = new CdpClient(wsUrl, options)
    await client.open()
    return client
  }

  open() {
    return new Promise((resolve, reject) => {
      let socket
      try {
        socket = new WebSocket(this.wsUrl)
      } catch (error) {
        reject(new CdpUnavailableError('Cannot open the DevTools socket: ' + (error && error.message)))
        return
      }
      this.socket = socket
      const timer = setTimeout(() => {
        try {
          socket.close()
        } catch (error) {
          /* ignore */
        }
        reject(new CdpUnavailableError('Timed out connecting to the browser DevTools endpoint.'))
      }, this.timeoutMs)
      socket.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      socket.onerror = () => {
        clearTimeout(timer)
        reject(new CdpUnavailableError('The browser DevTools socket reported an error.'))
      }
      socket.onclose = () => {
        this.closed = true
        for (const entry of this.pending.values()) entry.reject(new CdpUnavailableError('The browser DevTools socket closed.'))
        this.pending.clear()
      }
      socket.onmessage = (event) => this.dispatch(event && event.data)
    })
  }

  dispatch(raw) {
    let message
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : String(raw))
    } catch (error) {
      return
    }
    if (message.id !== undefined) {
      const entry = this.pending.get(message.id)
      if (!entry) return
      this.pending.delete(message.id)
      if (message.error) entry.reject(new Error(message.error.message || 'DevTools protocol error'))
      else entry.resolve(message.result)
      return
    }
    for (const listener of this.listeners) {
      try {
        listener(message)
      } catch (error) {
        /* a listener must not break the protocol loop */
      }
    }
  }

  /** Subscribe to protocol events; returns the unsubscribe function. */
  onEvent(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(method, params = {}, sessionId) {
    if (this.closed) return Promise.reject(new CdpUnavailableError('The browser DevTools socket is closed.'))
    const id = ++this.lastId
    const message = { id, method, params }
    if (sessionId) message.sessionId = sessionId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('DevTools timeout: ' + method))
      }, this.timeoutMs)
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      try {
        this.socket.send(JSON.stringify(message))
      } catch (error) {
        this.pending.delete(id)
        clearTimeout(timer)
        reject(new CdpUnavailableError('Cannot write to the browser DevTools socket.'))
      }
    })
  }

  /** Resolve when one matching protocol event arrives, or reject on timeout. */
  waitForEvent(method, predicate = () => true, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe()
        reject(new Error('Timed out waiting for ' + method))
      }, timeoutMs)
      const unsubscribe = this.onEvent((message) => {
        if (message.method !== method) return
        let matched = false
        try {
          matched = predicate(message)
        } catch (error) {
          matched = false
        }
        if (!matched) return
        clearTimeout(timer)
        unsubscribe()
        resolve(message)
      })
    })
  }

  async close() {
    if (this.closed) return
    try {
      await Promise.race([this.send('Browser.close'), delay(1000)])
    } catch (error) {
      /* the socket may already be gone */
    }
    try {
      if (this.socket) this.socket.close()
    } catch (error) {
      /* ignore */
    }
    this.closed = true
  }
}

/* ------------------------------------------------------------------------- *
 * Page helpers
 * ------------------------------------------------------------------------- */

export const DEFAULT_DEVICE = { width: 1440, height: 900 }

/**
 * Create a fresh page target, attach a flattened session, size it, and navigate.
 * @returns {Promise<string>} the attached session id
 */
export async function openPage(client, url, device = DEFAULT_DEVICE, options = {}) {
  const created = await client.send('Target.createTarget', { url: 'about:blank' })
  const attached = await client.send('Target.attachToTarget', { targetId: created.targetId, flatten: true })
  const sessionId = attached.sessionId
  await client.send('Page.enable', {}, sessionId)
  await client.send('Runtime.enable', {}, sessionId)
  await client.send('Log.enable', {}, sessionId).catch(() => {})
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: device.width,
    height: device.height,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId)
  const load = options.waitForLoad === false
    ? Promise.resolve()
    : client.waitForEvent('Page.loadEventFired', (message) => message.sessionId === sessionId, options.loadTimeoutMs || 30000)
  await client.send('Page.navigate', { url }, sessionId)
  await load.catch(() => {})
  return sessionId
}

/** Evaluate an expression in the page and return its JSON value. */
export async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: false,
  }, sessionId)
  if (result && result.exceptionDetails) {
    const detail = result.exceptionDetails
    throw new Error('Page evaluation failed: ' + ((detail.exception && detail.exception.description) || detail.text || 'unknown error'))
  }
  return result && result.result ? result.result.value : undefined
}

/** Evaluate inside an explicit execution context (e.g. an isolated world). */
export async function evaluateInContext(client, contextId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    contextId,
  })
  if (result && result.exceptionDetails) {
    const detail = result.exceptionDetails
    throw new Error('Page evaluation failed: ' + ((detail.exception && detail.exception.description) || detail.text || 'unknown error'))
  }
  return result && result.result ? result.result.value : undefined
}

/** Flatten the page frame tree into `{ id, url, parentId }` records. */
export async function listFrames(client, sessionId) {
  const tree = await client.send('Page.getFrameTree', {}, sessionId)
  const frames = []
  const walk = (node) => {
    if (!node || !node.frame) return
    frames.push({ id: node.frame.id, url: node.frame.url || '', parentId: node.frame.parentId || null })
    for (const child of node.childFrames || []) walk(child)
  }
  walk(tree && tree.frameTree)
  return frames
}

/** Find the out-of-process iframe target (sandboxed `srcdoc` frames become one). */
export async function findIframeTarget(client) {
  const result = await client.send('Target.getTargets')
  const targets = result && Array.isArray(result.targetInfos) ? result.targetInfos : []
  const iframes = targets.filter((target) => target.type === 'iframe')
  return iframes.find((target) => String(target.url || '').indexOf('about:srcdoc') === 0)
    || iframes.find((target) => String(target.url || '').indexOf('about:') === 0)
    || iframes[0]
    || null
}

/** Evaluate inside an attached target (an OOPIF iframe) and detach again. */
export async function evaluateInTarget(client, targetId, expression) {
  const attached = await client.send('Target.attachToTarget', { targetId, flatten: true })
  const sessionId = attached.sessionId
  try {
    await client.send('Runtime.enable', {}, sessionId).catch(() => {})
    return await evaluate(client, sessionId, expression)
  } finally {
    try {
      await client.send('Target.detachFromTarget', { sessionId })
    } catch (error) {
      /* the target may already be gone */
    }
  }
}

/**
 * Evaluate an expression inside one child frame by giving it an isolated world.
 * Works for sandboxed `srcdoc` frames whose origin the page itself cannot read.
 */
export async function evaluateInFrame(client, sessionId, frameId, expression) {
  const world = await client.send('Page.createIsolatedWorld', {
    frameId,
    worldName: 'design-studio-audit',
    grantUniveralAccess: false,
  }, sessionId)
  return evaluateInContext(client, world.executionContextId, expression)
}

/** Poll an expression until it is truthy; resolves its value or null on timeout. */
export async function waitFor(client, sessionId, expression, timeoutMs = 15000, intervalMs = 150) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(client, sessionId, expression)
      if (value) return value
    } catch (error) {
      /* the page may still be navigating */
    }
    await delay(intervalMs)
  }
  return null
}

/**
 * Capture the page as a PNG buffer. `fullPage` uses the layout content size so
 * the whole document, not just the viewport, is captured.
 */
export async function capturePng(client, sessionId, options = {}) {
  const params = { format: 'png', fromSurface: true, captureBeyondViewport: Boolean(options.fullPage || options.clip) }
  if (options.clip) {
    params.clip = {
      x: Math.max(0, Math.round(options.clip.x)),
      y: Math.max(0, Math.round(options.clip.y)),
      width: Math.max(1, Math.ceil(options.clip.width)),
      height: Math.max(1, Math.ceil(options.clip.height)),
      scale: 1,
    }
  } else if (options.fullPage) {
    const metrics = await client.send('Page.getLayoutMetrics', {}, sessionId)
    const size = metrics.cssContentSize || metrics.contentSize
    params.clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 }
  }
  const result = await client.send('Page.captureScreenshot', params, sessionId)
  return Buffer.from(result.data, 'base64')
}

/** Read the PNG pixel dimensions from its IHDR header. */
export function pngSize(buffer) {
  if (!buffer || buffer.length < 24) return null
  const signature = buffer.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
