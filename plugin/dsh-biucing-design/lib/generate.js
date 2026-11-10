/**
 * Prompt-driven design generation for the Design Studio panel.
 *
 * The panel POSTs a brief (or a revision instruction plus the current HTML) to
 * `/design-studio/generate`; this host handler calls the profile's default model
 * through `ctx.llm`, parses the returned JSON design, sanitizes the document,
 * and returns it to the panel. The deterministic template engine stays as an
 * offline fallback when no model is configured.
 *
 * The route is same-origin guarded, size limited, rate limited, and serialized
 * so a panel cannot fan out unbounded model calls.
 */
import { randomUUID } from 'node:crypto'

const MAX_BODY_BYTES = 320 * 1024
const MAX_HTML_CHARS = 300 * 1024
const MAX_BRIEF_CHARS = 4000
const MAX_INSTRUCTION_CHARS = 1600
const REQUEST_TIMEOUT_MS = 120000
const RATE_LIMIT = { count: 6, windowMs: 60000 }

const TOKEN_KEYS = ['mode', 'accent', 'accentText', 'bg', 'surface', 'surfaceAlt', 'text', 'muted', 'border', 'fontDisplay', 'fontBody', 'radius', 'density', 'scale']

function sameOriginRejection(req) {
  const host = req.headers && req.headers.host
  const fetchSite = req.headers && req.headers['sec-fetch-site']
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return 'Cross-site request refused.'
  const origin = req.headers && req.headers.origin
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host) return 'Cross-origin request refused.'
    } catch (error) {
      return 'Invalid Origin header.'
    }
  }
  return null
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    req.on('error', reject)
  })
}

function createRateLimiter() {
  const hits = []
  return () => {
    const now = Date.now()
    while (hits.length && now - hits[0] > RATE_LIMIT.windowMs) hits.shift()
    if (hits.length >= RATE_LIMIT.count) return false
    hits.push(now)
    return true
  }
}

/** Resolve the profile's default model selection, if the profile has one. */
export function resolveModelSelection(ctx) {
  try {
    const service = ctx.get('agentDefaultModel')
    const selection = service && typeof service.currentSelection === 'function' ? service.currentSelection() : null
    if (selection && typeof selection.provider === 'string' && typeof selection.model === 'string') {
      return { provider: selection.provider, model: selection.model, reasoningEffort: selection.reasoningEffort }
    }
  } catch (error) {
    /* fall through */
  }
  return null
}

function shortJson(value) {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return '{}'
  }
}

export function buildSystemPrompt() {
  return [
    'You are a senior product designer and front-end engineer who ships polished, production-quality interfaces.',
    'Turn the user request into ONE self-contained HTML design document.',
    '',
    'Output contract (follow exactly):',
    '- First line: <!--design-meta {"title":"...","tokens":{...}}--> (small JSON inside an HTML comment).',
    '- Then the complete design document starting with <!doctype html>.',
    '- Output nothing after </html>: no prose, no code fences, no analysis, no comments outside the HTML.',
    '- Keep the document compact (roughly 500-900 lines total); write dense CSS and avoid comments inside the document.',
    '- No <script>, no <iframe>, no external stylesheets, no external fonts, no build step.',
    '',
    'Design quality:',
    '- Use CSS custom properties for the design system and consume the supplied tokens.',
    '- Responsive at 1280px, 834px and 390px; clear type hierarchy; consistent spacing; real copy (not lorem ipsum) in the language of the brief.',
    '- Prefer CSS gradients and inline SVG over external images; no emoji.',
    '- Include realistic content: navigation, hero, sections, cards, tables, forms or pricing as appropriate for the request.',
    '',
    'tokens must include every key: mode (light|dark), accent, accentText, bg, surface, surfaceAlt, text, muted, border (hex colors),',
    'fontDisplay, fontBody (CSS font stacks of system fonts), radius (0-28), density (compact|regular|airy), scale (compact|regular|airy).',
    'title is a short human title (2-6 words).',
  ].join('\n')
}

export function buildUserPrompt(input) {
  const lines = []
  lines.push('Brief:')
  lines.push(String(input.brief || '').slice(0, MAX_BRIEF_CHARS))
  if (input.template) lines.push('', 'Requested template hint: ' + String(input.template))
  if (input.styleId) lines.push('Requested style hint: ' + String(input.styleId))
  if (input.tokens && typeof input.tokens === 'object') {
    lines.push('', 'Current design tokens (respect these unless the brief asks otherwise):')
    lines.push(shortJson(input.tokens).slice(0, 4000))
  }
  if (input.html) {
    lines.push('', 'Existing design to revise. Return the complete updated document:')
    lines.push(String(input.html).slice(0, 120000))
  }
  if (input.instruction) {
    lines.push('', 'Revision instruction:')
    lines.push(String(input.instruction).slice(0, MAX_INSTRUCTION_CHARS))
  }
  lines.push('', 'Remember: output only <!--design-meta {...}--> followed by the complete <!doctype html> document.')
  return lines.join('\n')
}

function normalizeParsed(value) {
  if (!value || typeof value !== 'object') return null
  let title = typeof value.title === 'string' ? value.title.trim().slice(0, 120) : ''
  let html = typeof value.html === 'string' ? value.html : (typeof value.document === 'string' ? value.document : '')
  let tokens = value.tokens && typeof value.tokens === 'object' ? value.tokens : null
  if (!html && value.design && typeof value.design === 'object') {
    html = typeof value.design.html === 'string' ? value.design.html : ''
    if (!tokens && value.design.tokens) tokens = value.design.tokens
    if (!title && typeof value.design.title === 'string') title = value.design.title
  }
  if (!html) return null
  return { title, html, tokens }
}

/** Read a design out of model output, tolerating fences and surrounding prose. */
/** Escape raw control characters inside JSON strings (models often do this). */
function repairJsonControlChars(text) {
  let out = ''
  let inString = false
  let escaped = false
  for (const ch of String(text)) {
    if (inString) {
      if (escaped) {
        out += ch
        escaped = false
      } else if (ch === '\\') {
        out += ch
        escaped = true
      } else if (ch === '"') {
        out += ch
        inString = false
      } else if (ch === '\n') {
        out += '\\n'
      } else if (ch === '\r') {
        out += '\\r'
      } else if (ch === '\t') {
        out += '\\t'
      } else {
        out += ch
      }
    } else if (ch === '"') {
      out += ch
      inString = true
    } else {
      out += ch
    }
  }
  return out
}

function tryParseObject(candidate) {
  for (const attempt of [candidate, repairJsonControlChars(candidate)]) {
    try {
      const parsed = normalizeParsed(JSON.parse(attempt))
      if (parsed) return parsed
    } catch (error) {
      /* try the repaired text, then the next candidate */
    }
  }
  return null
}

/** Read a design out of model output: tagged parts, fences, or repaired JSON. */
export function parseDesignResponse(text) {
  const raw = String(text == null ? '' : text).trim()
  if (!raw) throw new Error('The model returned an empty response.')

  // Preferred contract: <!--design-meta {...}--> followed by the document.
  const commentMeta = raw.match(/<!--\s*design-meta\s*([\s\S]*?)-->/i)
  const tagMeta = raw.match(/<design-meta[^>]*>\s*([\s\S]*?)\s*<\/design-meta>/i)
  let meta = null
  for (const candidate of [commentMeta, tagMeta]) {
    if (!candidate) continue
    try {
      meta = JSON.parse(repairJsonControlChars(candidate[1].trim()))
      break
    } catch (error) {
      meta = null
    }
  }

  const documentFromRaw = () => {
    const htmlMatch = raw.match(/<design-html[^>]*>\s*([\s\S]*?)\s*<\/design-html>/i)
    const openHtml = raw.match(/<design-html[^>]*>\s*([\s\S]*)$/i)
    const documentStart = raw.search(/<!doctype html|<html[\s>]/i)
    let html = ''
    if (htmlMatch) html = htmlMatch[1]
    else if (openHtml) html = openHtml[1]
    else if (documentStart !== -1) html = raw.slice(documentStart)
    if (!html) return null
    return normalizeParsed({ title: meta && meta.title, tokens: meta && meta.tokens, html })
  }

  // The tagged/comment contract starts with metadata or a document. Only prefer
  // document extraction there; a JSON object that merely mentions <!doctype
  // inside a string must be parsed as JSON first.
  const startsWithDocument = /^(?:<!--\s*design-meta|<div|<!(?:doctype)|<html[\s>])/i.test(raw)
  if (commentMeta || startsWithDocument) {
    const parsed = documentFromRaw()
    if (parsed) return parsed
  }

  // Fenced json / json object blocks.
  const fencedJson = raw.match(/```json\s*([\s\S]*?)```/i)
  if (fencedJson) {
    const parsed = tryParseObject(fencedJson[1].trim())
    if (parsed) return parsed
  }
  const candidates = [raw]
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) candidates.push(raw.slice(firstBrace, lastBrace + 1))
  for (const candidate of candidates) {
    const parsed = tryParseObject(candidate)
    if (parsed) return parsed
  }

  // Prose around a document, or a fenced HTML block.
  const fencedHtml = raw.match(/```html\s*([\s\S]*?)```/i)
  if (fencedHtml) return { title: meta && meta.title, html: fencedHtml[1].trim(), tokens: meta && meta.tokens }
  const parsedDocument = documentFromRaw()
  if (parsedDocument) return parsedDocument
  if (/<!doctype html|<html/i.test(raw)) return { title: meta && meta.title, html: raw, tokens: meta && meta.tokens }
  throw new Error('The model did not return a design document.')
}

/** Remove active content and make the document self-contained enough to preview. */
export function sanitizeDesignHtml(input) {
  let html = String(input == null ? '' : input).trim()
  if (html.charCodeAt(0) === 0xfeff) html = html.slice(1)
  html = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
  html = html.replace(/<script\b[^>]*>/gi, '')
  html = html.replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
  html = html.replace(/<iframe\b[^>]*\/?>/gi, '')
  html = html.replace(/<object\b[\s\S]*?<\/object\s*>/gi, '')
  html = html.replace(/<embed\b[^>]*\/?>/gi, '')
  html = html.replace(/<base\b[^>]*>/gi, '')
  html = html.replace(/<meta\s+http-equiv=["']?refresh[^>]*>/gi, '')
  html = html.replace(/<link\b[^>]*>/gi, '')
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  html = html.replace(/javascript\s*:/gi, '')
  html = html.replace(/@import\s+(?:url\()?['"]?https?:\/\/[^;]+;?/gi, '')
  if (!/^\s*(?:<!doctype html|<html)/i.test(html)) html = '<!doctype html>\n' + html
  if (!/<\/html\s*>/i.test(html)) html += '\n</html>'
  if (html.length > MAX_HTML_CHARS) throw new Error('The generated design is too large.')
  return html
}

/** Keep only valid design-token keys; the panel normalizes missing values. */
export function sanitizeDesignTokens(input) {
  if (!input || typeof input !== 'object') return null
  const tokens = {}
  for (const key of TOKEN_KEYS) {
    if (input[key] !== undefined && input[key] !== null) tokens[key] = input[key]
  }
  return Object.keys(tokens).length ? tokens : null
}

function fallbackTitle(input) {
  const brief = String(input.brief || '').replace(/\s+/g, ' ').trim()
  return brief ? brief.slice(0, 60) : 'Untitled design'
}

async function collectStream(llm, request) {
  let text = ''
  let finish = null
  let usage = null
  for await (const chunk of llm.stream(request)) {
    if (!chunk) continue
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'finish') finish = chunk.reason
    else if (chunk.type === 'usage') usage = chunk.usage
  }
  return { text, finish, usage }
}

/**
 * Generate one design through the profile's model.
 * @param {{ ctx: any, input: object, signal?: AbortSignal }} options
 */
export async function generateDesign({ ctx, input, signal }) {
  const llm = ctx.get('llm')
  if (!llm || typeof llm.stream !== 'function') throw new Error('The LLM service is not available in this profile.')
  const selection = resolveModelSelection(ctx)
  if (!selection) throw new Error('No default model is selected in this profile.')
  const request = {
    provider: selection.provider,
    model: selection.model,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: [{ type: 'text', text: buildUserPrompt(input) }] }],
    signal,
  }
  // Design generation is output-bound: prefer a low reasoning effort (the chat
  // default may be "high" and consume the whole output budget before the HTML).
  try {
    const info = await llm.resolveModelInfo(selection.provider, selection.model)
    const efforts = info && info.reasoning && Array.isArray(info.reasoning.efforts) ? info.reasoning.efforts : []
    const low = efforts.find((effort) => /^(none|minimal|low)$/i.test(String(effort.id)))
      || efforts.find((effort) => /none|minimal|low/i.test(String(effort.id)))
    if (low) request.reasoningEffort = low.id
  } catch (error) {
    /* keep the adapter default */
  }
  for (const budget of [32000, 24000, 16000]) {
    try {
      const validated = await llm.resolveCallConfig({ provider: selection.provider, model: selection.model, maxTokens: budget })
      request.maxTokens = (validated && validated.maxTokens) || budget
      break
    } catch (error) {
      /* try the next budget */
    }
  }
  if (!request.maxTokens) {
    try {
      const validated = await llm.resolveCallConfig({ provider: selection.provider, model: selection.model })
      if (validated && validated.maxTokens) request.maxTokens = validated.maxTokens
    } catch (error) {
      /* keep the adapter default */
    }
  }
  const { text, finish, usage } = await collectStream(llm, request)
  if (finish && finish.kind === 'error') throw new Error('Model call failed: ' + ((finish.failure && finish.failure.message) || 'unknown error'))
  if (finish && finish.kind === 'aborted') throw new Error('Model call was aborted.')
  if (finish && finish.kind === 'max-tokens') {
    // Try to salvage a complete JSON object; otherwise report truncation.
    try {
      const parsed = parseDesignResponse(text)
      return buildResult(parsed, input, selection, usage, true)
    } catch (error) {
      throw new Error('The model response was truncated before the design was complete.')
    }
  }
  const parsed = parseDesignResponse(text)
  return buildResult(parsed, input, selection, usage, false)
}

function buildResult(parsed, input, selection, usage, truncated) {
  const html = sanitizeDesignHtml(parsed.html)
  const complete = /<\/body\s*>/i.test(html) && /<\/html\s*>/i.test(html)
  return {
    title: parsed.title || fallbackTitle(input),
    html,
    tokens: sanitizeDesignTokens(parsed.tokens),
    provider: selection.provider,
    model: selection.model,
    usage: usage || null,
    truncated: Boolean(truncated) || !complete,
    complete,
    generatedAt: Date.now(),
    requestId: randomUUID(),
  }
}

/**
 * Route handler for `/design-studio/generate`.
 * GET  -> { available, provider?, model?, reason? }
 * POST -> { ok, title, html, tokens, provider, model, usage, truncated }
 */
export function createGenerationHandler(ctx) {
  const allowRequest = createRateLimiter()
  let busy = false

  return async function generationHandler(req, res) {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { allow: 'GET, POST' })
        res.end()
        return
      }
      const rejected = sameOriginRejection(req)
      if (rejected) return sendJson(res, 403, { ok: false, error: rejected })

      if (req.method === 'GET') {
        const selection = resolveModelSelection(ctx)
        const llm = ctx.get('llm')
        return sendJson(res, 200, {
          available: Boolean(selection && llm && typeof llm.stream === 'function'),
          provider: selection ? selection.provider : null,
          model: selection ? selection.model : null,
          reason: selection ? null : 'No default model is selected in this profile.',
        })
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'GET, POST' })
        res.end()
        return
      }
      if (busy) return sendJson(res, 429, { ok: false, error: 'A design generation is already running.' })
      if (!allowRequest()) return sendJson(res, 429, { ok: false, error: 'Too many generations; wait a moment and retry.' })

      const input = await readJsonBody(req)
      const brief = typeof input.brief === 'string' ? input.brief.trim().slice(0, MAX_BRIEF_CHARS) : ''
      const instruction = typeof input.instruction === 'string' ? input.instruction.trim().slice(0, MAX_INSTRUCTION_CHARS) : ''
      const existingHtml = typeof input.html === 'string' ? input.html.slice(0, 120000) : ''
      if (!brief && !instruction) return sendJson(res, 400, { ok: false, error: 'A brief or a revision instruction is required.' })
      if (instruction && !existingHtml) return sendJson(res, 400, { ok: false, error: 'A revision needs the existing HTML.' })

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const onClose = () => controller.abort()
      if (typeof req.once === 'function') req.once('close', onClose)
      busy = true
      try {
        const result = await generateDesign({
          ctx,
          input: {
            brief,
            instruction,
            html: existingHtml,
            template: typeof input.template === 'string' ? input.template.slice(0, 40) : undefined,
            styleId: typeof input.styleId === 'string' ? input.styleId.slice(0, 40) : undefined,
            tokens: input.tokens && typeof input.tokens === 'object' ? input.tokens : undefined,
          },
          signal: controller.signal,
        })
        return sendJson(res, 200, Object.assign({ ok: true }, result))
      } catch (error) {
        const message = String((error && error.message) || error)
        if (controller.signal.aborted) return sendJson(res, 504, { ok: false, error: 'The model call timed out.' })
        return sendJson(res, 502, { ok: false, error: message })
      } finally {
        clearTimeout(timer)
        busy = false
      }
    } catch (error) {
      if (res.headersSent) {
        try { res.end() } catch (inner) { /* ignore */ }
        return
      }
      const message = String((error && error.message) || error)
      const status = /too large/i.test(message) ? 413 : 400
      sendJson(res, status, { ok: false, error: message })
    }
  }
}
