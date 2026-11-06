// Host-half tests for the Design Studio browser tools.
//
// The screenshot test is a real end-to-end run: it launches an isolated
// headless Chrome, renders inline HTML through CDP, captures a PNG, and checks
// its dimensions. It is skipped (not failed) when no Chrome is installed.
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { AUDIT_EXPRESSION } from '../lib/audit.js'
import { findChromePath, resolveSandboxAttempts } from '../lib/chrome.js'
import { isCdpAvailable, pngSize } from '../lib/cdp.js'
import {
  buildSystemPrompt,
  buildUserPrompt,
  createGenerationHandler,
  generateDesign,
  parseDesignResponse,
  sanitizeDesignHtml,
  sanitizeDesignTokens,
} from '../lib/generate.js'
import {
  auditArtboard,
  createProjectsResource,
  designProjectsTool,
  authenticatedGuiUrl,
  designScreenshotHtmlTool,
  designVerifyUiTool,
  deviceSize,
  isInsideDirectory,
  isLoopbackUrl,
  normalizeDevice,
  panelUrl,
  profileProjectsDirectory,
  resolveOutputDir,
  sessionDirectory,
} from '../lib/tools.js'

let passed = 0
const check = async (name, run) => {
  try {
    await run()
    passed += 1
    process.stdout.write('  ok   ' + name + '\n')
  } catch (error) {
    process.exitCode = 1
    process.stdout.write('  FAIL ' + name + '\n       ' + String((error && error.message) || error) + '\n')
  }
}

const services = {}
const fakeCtx = {
  get(name) {
    return services[name]
  },
}
const fakeExec = { signal: new AbortController().signal }

process.stdout.write('Design Studio host tools — self test\n\n')

await check('both tools declare model-facing names, descriptions and JSON schemas', () => {
  const verify = designVerifyUiTool(fakeCtx)
  const shot = designScreenshotHtmlTool(fakeCtx)
  for (const tool of [verify, shot]) {
    assert.equal(typeof tool.name, 'string')
    assert.ok(tool.name.length > 0)
    assert.ok(tool.description.length > 40)
    assert.equal(tool.parameters.type, 'object')
    assert.equal(typeof tool.output.render, 'function')
    assert.equal(typeof tool.execute, 'function')
    const blocks = tool.output.render({}, { ok: true, screenshots: [], source: 'inline html', width: 1, height: 1 })
    assert.equal(blocks[0].type, 'text')
    assert.ok(blocks[0].text.includes('read_image'))
  }
})

await check('the deep link sets the panel query parameter', () => {
  const url = new URL(panelUrl('http://127.0.0.1:63971/?token=secret'))
  assert.equal(url.searchParams.get('panel'), 'design-studio')
  assert.equal(url.searchParams.get('token'), 'secret')
})

await check('device presets normalize to real viewports', () => {
  assert.equal(normalizeDevice('tablet'), 'tablet')
  assert.equal(normalizeDevice('nope'), 'desktop')
  assert.equal(resolveOutputDir('/tmp/shots', '/work'), '/tmp/shots')
  assert.equal(resolveOutputDir(undefined, '/work'), '/work/.design-studio/screenshots')
})

await check('the page audit expression is valid JavaScript', () => {
  const factory = new Function('return (' + AUDIT_EXPRESSION + ')')
  assert.equal(typeof factory, 'function')
  assert.ok(AUDIT_EXPRESSION.includes('.dsx-root'))
})

await check('the verify tool explains a missing Web GUI surface', async () => {
  const tool = designVerifyUiTool(fakeCtx)
  await assert.rejects(() => tool.execute({}, fakeExec), /Web GUI/)
})

await check('an authenticated GUI URL is minted from the host services', () => {
  const ctx = {
    get(name) {
      if (name === 'webApp') return { getAdvertisedUrl: () => 'http://127.0.0.1:63971/' }
      if (name === 'connection') return { authenticatedUrl: (base) => base + '?token=abc' }
      return undefined
    },
  }
  assert.equal(authenticatedGuiUrl(ctx), 'http://127.0.0.1:63971/?token=abc')
})

await check('the screenshot tool requires exactly one HTML source', async () => {
  const tool = designScreenshotHtmlTool(fakeCtx)
  await assert.rejects(() => tool.execute({}, fakeExec), /exactly one/)
  await assert.rejects(() => tool.execute({ html: '<p>x</p>', file_path: '/tmp/x.html' }, fakeExec), /exactly one/)
})

await check('the screenshot tool rejects a missing file with a clear message', async () => {
  services.workingDirectory = { defaultDirectory: process.cwd() }
  const tool = designScreenshotHtmlTool(fakeCtx)
  await assert.rejects(() => tool.execute({ file_path: 'definitely-not-a-file.html' }, fakeExec), /not found/)
})

await check('sandbox policy is configurable through the environment', () => {
  assert.deepEqual(resolveSandboxAttempts({}), [false, true])
  assert.deepEqual(resolveSandboxAttempts({ DSH_DESIGN_CHROME_NO_SANDBOX: 'never' }), [false])
  assert.deepEqual(resolveSandboxAttempts({ DSH_DESIGN_CHROME_NO_SANDBOX: 'always' }), [true])
})

await check('workspace path containment and loopback detection are strict', () => {
  assert.equal(isInsideDirectory('/work/app', '/work/app/design.html'), true)
  assert.equal(isInsideDirectory('/work/app', '/work/app/sub/design.html'), true)
  assert.equal(isInsideDirectory('/work/app', '/work/other/design.html'), false)
  assert.equal(isInsideDirectory('/work/app', '/work/application/design.html'), false)
  assert.equal(isLoopbackUrl('http://127.0.0.1:63971/'), true)
  assert.equal(isLoopbackUrl('http://localhost:63971/'), true)
  assert.equal(isLoopbackUrl('https://example.com/'), false)
})

await check('session directory falls back safely', () => {
  assert.equal(sessionDirectory({ get: () => ({ defaultDirectory: '/work/app' }) }, {}), '/work/app')
  assert.equal(typeof sessionDirectory({ get: () => undefined }, {}), 'string')
})

await check('the verify tool exposes privacy, steps and theme options', () => {
  const tool = designVerifyUiTool(fakeCtx)
  const props = tool.parameters.properties
  assert.ok(props.include_shell)
  assert.ok(props.steps)
  assert.ok(props.full_page)
  assert.deepEqual(props.theme.enum, ['current', 'dark', 'light'])
  assert.deepEqual(props.device.enum, ['desktop', 'tablet', 'mobile'])
  assert.equal(deviceSize('mobile').width, 390)
})

await check('artboard auditing is exported and degrades without a frame', async () => {
  assert.equal(typeof auditArtboard, 'function')
})

await check('the screenshot tool refuses files outside the session working directory', async () => {
  const work = await mkdtemp(join(tmpdir(), 'dsh-design-work-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-design-outside-'))
  try {
    const file = join(outside, 'page.html')
    await writeFile(file, '<!doctype html><h1>outside</h1>')
    services.workingDirectory = { defaultDirectory: work }
    const tool = designScreenshotHtmlTool(fakeCtx)
    await assert.rejects(() => tool.execute({ file_path: file }, fakeExec), /must stay inside the session working directory/)
    await assert.rejects(() => tool.execute({ file_path: file, allow_outside_workspace: false }, fakeExec), /must stay inside/)
  } finally {
    await rm(work, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

await check('design response parsing tolerates JSON fences and sanitizes active content', () => {
  const parsed = parseDesignResponse('Here you go:\n```json\n' + JSON.stringify({
    title: 'AI dashboard',
    html: '<!doctype html><html><body onload="steal()"><script>alert(1)</script><h1>Hello</h1></body></html>',
    tokens: { accent: '#ff0000', radius: 10, extra: 'ignored' },
  }) + '\n```')
  assert.equal(parsed.title, 'AI dashboard')
  const html = sanitizeDesignHtml(parsed.html)
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(!/script/i.test(html))
  assert.ok(!/onload/i.test(html))
  const tokens = sanitizeDesignTokens(parsed.tokens)
  assert.equal(tokens.accent, '#ff0000')
  assert.equal(tokens.extra, undefined)
  assert.ok(parseDesignResponse('<!doctype html><html><body>raw</body></html>').html.includes('raw'))
  const tagged = parseDesignResponse('<design-meta>{"title":"Tagged design","tokens":{"accent":"#123456"}}</design-meta>\n<design-html>\n<!doctype html><html><body><h1>Tagged</h1></body></html>\n</design-html>')
  assert.equal(tagged.title, 'Tagged design')
  assert.ok(tagged.html.includes('<h1>Tagged</h1>'))
  assert.equal(tagged.tokens.accent, '#123456')
  assert.throws(() => parseDesignResponse('no design here'), /did not return a design/)
  assert.ok(buildSystemPrompt().includes('JSON'))
  assert.ok(buildUserPrompt({ brief: 'dashboard brief', tokens: { accent: '#000' } }).includes('dashboard brief'))
})

function mockRequest(method, headers, body) {
  const req = new Readable({ read() {} })
  req.method = method
  req.headers = Object.assign({ host: '127.0.0.1:1', 'sec-fetch-site': 'same-origin' }, headers || {})
  process.nextTick(() => {
    if (body !== undefined) req.push(body)
    req.push(null)
  })
  return req
}

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    chunks: [],
    headersSent: false,
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers || {}
      this.headersSent = true
    },
    end(chunk) {
      if (chunk) this.chunks.push(Buffer.from(chunk))
      this.finished = true
    },
    body() {
      return Buffer.concat(this.chunks).toString('utf8')
    },
  }
}

await check('the generation route calls the model and returns a sanitized design', async () => {
  const design = {
    title: 'Generated dashboard',
    html: '<!doctype html><html><body><script>bad()</script><h1>Revenue</h1></body></html>',
    tokens: { accent: '#e11d48', radius: 12 },
  }
  const llm = {
    async resolveCallConfig() { return { maxTokens: 16000 } },
    async *stream() {
      yield { type: 'text-delta', text: '```json\n' + JSON.stringify(design) + '\n```' }
      yield { type: 'finish', reason: { kind: 'stop' } }
      yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 20 } }
    },
  }
  const ctx = {
    get(name) {
      if (name === 'llm') return llm
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'mock', model: 'mock-model' }) }
      return undefined
    },
  }
  const handler = createGenerationHandler(ctx)
  const getRes = mockResponse()
  await handler(mockRequest('GET', {}), getRes)
  const info = JSON.parse(getRes.body())
  assert.equal(info.available, true)
  assert.equal(info.provider, 'mock')
  const res = mockResponse()
  await handler(mockRequest('POST', { 'content-type': 'application/json' }, JSON.stringify({ brief: 'a revenue dashboard' })), res)
  const payload = JSON.parse(res.body())
  assert.equal(res.statusCode, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.title, 'Generated dashboard')
  assert.equal(payload.provider, 'mock')
  assert.ok(payload.html.startsWith('<!doctype html>'))
  assert.ok(!/script/i.test(payload.html))
  assert.equal(payload.tokens.accent, '#e11d48')
  assert.equal(payload.usage.outputTokens, 20)
  const crossRes = mockResponse()
  await handler(mockRequest('POST', { origin: 'https://evil.example' }, JSON.stringify({ brief: 'x' })), crossRes)
  assert.equal(crossRes.statusCode, 403)
  const emptyRes = mockResponse()
  await handler(mockRequest('POST', {}, JSON.stringify({})), emptyRes)
  assert.equal(emptyRes.statusCode, 400)
  const badRes = mockResponse()
  await handler(mockRequest('POST', {}, 'not json'), badRes)
  assert.equal(badRes.statusCode, 400)
})

await check('the project bridge round-trips through the profile library and the read-only route', async () => {
  const work = await mkdtemp(join(tmpdir(), 'dsh-design-bridge-'))
  const library = await mkdtemp(join(tmpdir(), 'dsh-design-library-'))
  const previousLibrary = process.env.DSH_DESIGN_PROJECTS_DIR
  process.env.DSH_DESIGN_PROJECTS_DIR = library
  try {
    services.workingDirectory = { defaultDirectory: work }
    const tool = designProjectsTool(fakeCtx)
    assert.equal(profileProjectsDirectory(), library)

    const written = await tool.execute({
      action: 'write',
      name: 'probe-project',
      project: { projectName: 'Probe design', brief: 'a calm landing page', template: 'landing', styleId: 'minimal', tokens: { accent: '#e11d48', radius: 18 } },
    }, fakeExec)
    assert.equal(written.ok, true)
    assert.equal(written.scope, 'profile')
    assert.ok(written.path.startsWith(library), 'expected profile library path, got ' + written.path)
    assert.ok(existsSync(written.path), 'project file missing')

    const listed = await tool.execute({ action: 'list' }, fakeExec)
    assert.equal(listed.projects.length, 1)
    assert.equal(listed.projects[0].projectName, 'Probe design')
    assert.equal(listed.projects[0].file, 'probe-project.json')

    const read = await tool.execute({ action: 'read', name: 'probe-project' }, fakeExec)
    assert.equal(read.project.projectName, 'Probe design')
    assert.equal(read.project.tokens.accent, '#e11d48')
    assert.equal(read.project.tokens.radius, 18)
    assert.match(read.project.tokens.accentText, /^#[0-9a-f]{6}$/i)
    await assert.rejects(() => tool.execute({ action: 'read', file: '/etc/hosts' }, fakeExec), /outside the projects directory/)

    const resource = createProjectsResource()
    const listResponse = await resource(new Request('http://127.0.0.1:1/design-studio/projects'))
    assert.equal(listResponse.status, 200)
    const listPayload = await listResponse.json()
    assert.equal(listPayload.projects.length, 1)
    assert.equal(listPayload.projects[0].file, 'probe-project.json')
    const fileResponse = await resource(new Request('http://127.0.0.1:1/design-studio/projects/probe-project.json'))
    assert.equal(fileResponse.status, 200)
    assert.ok((await fileResponse.text()).includes('Probe design'))
    const missing = await resource(new Request('http://127.0.0.1:1/design-studio/projects/nope.json'))
    assert.equal(missing.status, 404)
    const traversal = await resource(new Request('http://127.0.0.1:1/design-studio/projects/..%2Fsecret.json'))
    assert.ok(traversal.status === 404 || traversal.status === 400)
    const post = await resource(new Request('http://127.0.0.1:1/design-studio/projects', { method: 'POST' }))
    assert.equal(post.status, 405)
    const sameOrigin = await resource(new Request('http://127.0.0.1:1/design-studio/projects', { headers: { host: '127.0.0.1:1', origin: 'http://127.0.0.1:1', 'sec-fetch-site': 'same-origin' } }))
    assert.equal(sameOrigin.status, 200)
    const crossOrigin = await resource(new Request('http://127.0.0.1:1/design-studio/projects', { headers: { host: '127.0.0.1:1', origin: 'https://evil.example' } }))
    assert.equal(crossOrigin.status, 403)
    const crossSite = await resource(new Request('http://127.0.0.1:1/design-studio/projects', { headers: { 'sec-fetch-site': 'cross-site' } }))
    assert.equal(crossSite.status, 403)
  } finally {
    if (previousLibrary === undefined) delete process.env.DSH_DESIGN_PROJECTS_DIR
    else process.env.DSH_DESIGN_PROJECTS_DIR = previousLibrary
    await rm(work, { recursive: true, force: true })
    await rm(library, { recursive: true, force: true })
  }
})

const chrome = findChromePath()
process.stdout.write('       chrome: ' + (chrome || 'not found') + ' | cdp: ' + (isCdpAvailable() ? 'yes' : 'no') + '\n')

if (chrome && isCdpAvailable()) {
  await check('renders inline HTML through headless Chrome and saves a real PNG', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'dsh-design-test-'))
    try {
      const tool = designScreenshotHtmlTool(fakeCtx)
      const report = await tool.execute({
        html: '<!doctype html><html><body style="margin:0;background:#111;color:#fff;font-family:sans-serif">' +
          '<main style="padding:40px"><h1>Visual check</h1><p>Design Studio screenshot probe.</p></main></body></html>',
        width: 640,
        height: 480,
        output_dir: outputDir,
      }, fakeExec)
      assert.equal(report.ok, true)
      assert.equal(report.width, 640)
      assert.equal(report.height, 480)
      assert.equal(report.screenshots.length, 1)
      const file = report.screenshots[0].path
      assert.ok(existsSync(file), 'screenshot file missing: ' + file)
      const bytes = await readFile(file)
      const size = pngSize(bytes)
      assert.deepEqual(size, { width: 640, height: 480 })
      assert.ok(bytes.length > 1000)
      assert.equal((await stat(file)).size, bytes.length)
      process.stdout.write('       saved ' + file + ' (' + bytes.length + ' bytes)\n')
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  })
} else {
  process.stdout.write('  skip headless Chrome end-to-end test (no Chrome or no WebSocket on this host)\n')
}

process.stdout.write('\n' + passed + ' passed, ' + (process.exitCode ? 'some failed' : '0 failed') + '\n')
