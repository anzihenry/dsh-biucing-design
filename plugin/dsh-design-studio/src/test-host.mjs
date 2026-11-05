// Host-half tests for the Design Studio browser tools.
//
// The screenshot test is a real end-to-end run: it launches an isolated
// headless Chrome, renders inline HTML through CDP, captures a PNG, and checks
// its dimensions. It is skipped (not failed) when no Chrome is installed.
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { AUDIT_EXPRESSION } from '../lib/audit.js'
import { findChromePath } from '../lib/chrome.js'
import { isCdpAvailable, pngSize } from '../lib/cdp.js'
import {
  authenticatedGuiUrl,
  designScreenshotHtmlTool,
  designVerifyUiTool,
  normalizeDevice,
  panelUrl,
  resolveOutputDir,
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
