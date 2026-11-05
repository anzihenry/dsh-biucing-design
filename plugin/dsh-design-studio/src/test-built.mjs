// Built-artifact test for the Design Studio bundle.
//
// `client.js` is generated from `src/client.js` + `src/engine.mjs`; this test
// fails when the shipped artifact drifts from those sources, when the inlined
// engine is not verbatim, or when the registered module / panel render path
// throws. It runs headless with no dependencies: the React module is a tiny
// stand-in that records the element tree instead of mounting it.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const marker = '/* @engine */'
const [shell, engineSource, built] = await Promise.all([
  readFile(join(root, 'src', 'client.js'), 'utf8'),
  readFile(join(root, 'src', 'engine.mjs'), 'utf8'),
  readFile(join(root, 'client.js'), 'utf8'),
])

let passed = 0
const check = (name, run) => {
  try {
    run()
    passed += 1
    process.stdout.write('  ok   ' + name + '\n')
  } catch (error) {
    process.exitCode = 1
    process.stdout.write('  FAIL ' + name + '\n       ' + String((error && error.message) || error) + '\n')
  }
}

const inlined = engineSource
  .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, '')
  .trim()
const expected = shell.replace(marker, () => inlined) + '\n'

process.stdout.write('Design Studio built artifact — self test\n\n')

check('client.js is exactly the deterministic build of src/client.js + src/engine.mjs', () => {
  assert.equal(built, expected)
})
check('the build marker does not survive inlining', () => {
  assert.equal(built.includes(marker), false)
})
check('the engine is inlined verbatim (regression: $& in a string replacement)', () => {
  assert.equal(built.includes(inlined), true)
})
check('the shipped document contains no scripts or remote URLs', () => {
  assert.equal(/<script/i.test(built), false)
  assert.equal(/https?:\/\//.test(built), false)
})

// ---------------------------------------------------------------------------
// Load the module exactly the way the Web page does.
// ---------------------------------------------------------------------------
let moduleRecord = null
const fakeWindow = {
  __ModuleLoader__: { load(record) { moduleRecord = record } },
  localStorage: { getItem() { return null }, setItem() {} },
  location: { search: '?panel=design-studio' },
}
const React = {
  Fragment: Symbol('Fragment'),
  createElement(type, props, ...children) { return { type, props: props || {}, children } },
  useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}] },
  useEffect() {},
  useMemo(run) { return run() },
  useCallback(fn) { return fn },
  useRef(value) { return { current: value === undefined ? null : value } },
}
new Function('window', built)(fakeWindow)

check('the module registers under the package name', () => {
  assert.ok(moduleRecord, 'module loader was not called')
  assert.equal(moduleRecord.id, '@local/dsh-design-studio')
  assert.equal(typeof moduleRecord.factory, 'function')
})

const registrations = []
const selectedPanels = []
const dictionaries = new Map()
const fakeLocale = {
  register(namespace, locale, dictionary) {
    dictionaries.set(namespace + ':' + locale, dictionary)
    return () => {}
  },
  bind() { return (key) => key },
  getLocale() { return { active: 'en', locales: [], revision: 1 } },
  subscribe() { return () => {} },
}
const plugin = moduleRecord.factory((name) => {
  if (name === 'react') return React
  throw new Error('unexpected Client require: ' + name)
})
const ctx = {
  slots: {
    inject(key, callback) {
      const dispose = callback()
      assert.equal(typeof dispose, 'function', 'slot inject must return a disposer')
      return () => {}
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  get(name) {
    if (name === 'layout') return { selectPanel(panelId) { selectedPanels.push(panelId) } }
    return undefined
  },
  locale: fakeLocale,
  effect(callback) {
    const dispose = callback()
    assert.equal(typeof dispose, 'function', 'effect must return a disposer')
    return () => {}
  },
}
plugin.apply(ctx)

check('the plugin declares the services it uses', () => {
  assert.deepEqual(plugin.inject, ['slots', 'locale'])
})
check('the ?panel=design-studio deep link opens the panel', () => {
  assert.deepEqual(selectedPanels, ['design-studio'])
})
check('one sidebar entry and one central panel are registered', () => {
  const sidebar = registrations.find((item) => item.options.name === 'sidebar.panellist')
  const main = registrations.find((item) => item.options.name === 'main')
  assert.ok(sidebar, 'sidebar.panellist registration missing')
  assert.ok(main, 'main registration missing')
  assert.equal(sidebar.options.id, 'design-studio')
  assert.equal(main.options.key, 'design-studio')
  assert.equal(sidebar.options.order, 5)
  assert.equal(sidebar.options.label(), 'panel.title')
})
check('English and Chinese dictionaries are registered with the locale service', () => {
  const english = dictionaries.get('design-studio:en')
  const chinese = dictionaries.get('design-studio:zh')
  assert.ok(english, 'English dictionary missing')
  assert.ok(chinese, 'Chinese dictionary missing')
  assert.equal(english['panel.title'], 'Design studio')
  assert.notEqual(chinese['panel.title'], english['panel.title'])
  assert.ok(Object.keys(english).length > 80)
})

const mainComponent = registrations.find((item) => item.options.name === 'main').component
const sidebarComponent = registrations.find((item) => item.options.name === 'sidebar.panellist').component
const tree = mainComponent()

// Expand function components the way React would, with props.children
// materialised from the recorded children array; the design panel itself is
// rendered by the test, not expanded again.
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return }
  visit(node)
  if (typeof node.type === 'function') {
    const props = Object.assign({}, node.props)
    if (node.children && node.children.length) {
      props.children = node.children.length === 1 ? node.children[0] : node.children
    }
    const rendered = node.type(props)
    if (rendered) walk(rendered, visit)
    return
  }
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, visit))
  else if (node.children !== undefined) walk(node.children, visit)
}
const collect = (predicate) => {
  const found = []
  walk(tree, (node) => { if (predicate(node)) found.push(node) })
  return found
}
const chainFor = (predicate, node = tree, ancestors = []) => {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = chainFor(predicate, child, ancestors)
      if (found) return found
    }
    return null
  }
  const chain = ancestors.concat([node])
  if (predicate(node)) return chain
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = chainFor(predicate, child, chain)
      if (found) return found
    }
  } else if (node.children !== undefined) {
    return chainFor(predicate, node.children, chain)
  }
  return null
}
const classNameOf = (node) => (node && node.props && typeof node.props.className === 'string' ? node.props.className : '')

check('the panel renders its full layout', () => {
  const frames = collect((node) => node.type === 'iframe')
  const textareas = collect((node) => node.type === 'textarea')
  const buttons = collect((node) => node.type === 'button')
  assert.equal(frames.length, 1, 'expected one preview iframe')
  assert.equal(textareas.length, 1, 'expected one brief textarea')
  assert.ok(buttons.length >= 10, 'expected the control rows to render')
  assert.ok(String(frames[0].props.srcDoc).indexOf('<!doctype html>') === 0, 'preview document missing')
  assert.equal(frames[0].props.sandbox, '', 'preview iframe must stay fully sandboxed')
})
check('verification-era controls are present (drawer, preview/print, token import)', () => {
  const drawerButtons = collect((node) => node.type === 'button' && classNameOf(node).split(/\s+/).indexOf('dsx-drawer-btn') !== -1)
  assert.equal(drawerButtons.length, 1, 'narrow-window drawer toggle missing')
  const textOf = (node) => {
    const parts = []
    const walkText = (value) => {
      if (typeof value === 'string') parts.push(value)
      else if (Array.isArray(value)) value.forEach(walkText)
      else if (value && typeof value === 'object') walkText(value.children)
    }
    walkText(node.children)
    return parts.join(' ')
  }
  const labels = collect((node) => node.type === 'button' && typeof classNameOf(node) === 'string' && classNameOf(node).indexOf('dsx-btn') >= 0)
    .map((node) => textOf(node))
  // The test locale returns dictionary keys, so match the key names here.
  for (const expected of ['export.preview', 'export.print', 'export.tokens']) {
    assert.ok(labels.some((label) => label.indexOf(expected) !== -1), 'missing export control: ' + expected)
  }
})

check('the three panel columns are siblings inside the flex body (regression: inspector nested outside)', () => {
  const chain = chainFor((node) => classNameOf(node) === 'dsx-right')
  assert.ok(chain, 'inspector column is missing')
  const bodyIndex = chain.findIndex((node) => classNameOf(node) === 'dsx-body')
  assert.ok(bodyIndex >= 0, 'inspector is not inside .dsx-body: ' + chain.map(classNameOf).join(' > '))
  assert.equal(classNameOf(chain[chain.length - 1]), 'dsx-right')
  assert.ok(chain.length > 1 && classNameOf(chain[chain.length - 2]) === 'dsx-body', 'inspector parent should be .dsx-body')
  const body = chain[bodyIndex]
  const children = (body.children || []).filter((child) => typeof child.type === 'string')
  assert.equal(children.length, 3, 'expected three columns, got ' + children.map(classNameOf).join(','))
  assert.deepEqual(children.map(classNameOf), ['dsx-left', 'dsx-canvas', 'dsx-right'])
})

check('the artboard follows the selected device and zoom', () => {
  const artboards = collect((node) => node.props && node.props.className === 'dsx-artboard')
  assert.equal(artboards.length, 1)
  assert.equal(artboards[0].props.style.width, Math.round(1280 * 0.72) + 'px')
})
check('the sidebar glyph is an svg sized by the owner', () => {
  const element = sidebarComponent({ size: 16, active: true })
  const svg = typeof element.type === 'function' ? element.type(element.props) : element
  assert.equal(svg.type, 'svg')
  assert.equal(svg.props.width, 16)
})

check('interactive controls run without throwing', () => {
  const interactive = collect((node) => node.type === 'button' && node.props && typeof node.props.onClick === 'function'
    && ['dsx-chip', 'dsx-example', 'dsx-primary', 'dsx-history-row', 'dsx-linkbtn'].indexOf(node.props.className) >= 0)
  assert.ok(interactive.length >= 12, 'expected chips and actions, got ' + interactive.length)
  for (const node of interactive) node.props.onClick()
})

check('a corrupt saved state falls back instead of crashing', () => {
  fakeWindow.localStorage.getItem = () => '{not json'
  const safe = mainComponent()
  assert.ok(safe)
})

process.stdout.write('\n' + passed + ' passed, ' + (process.exitCode ? 'some failed' : '0 failed') + '\n')
