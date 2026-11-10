// Build the single-file Client module for the Design Studio bundle.
//
// The browser artifact must be one file loaded through window.__ModuleLoader__,
// and it cannot import sibling ES modules. The design synthesis engine is kept
// as a tested `.mjs` module, so this script inlines it into the Client shell
// that ships as ./client.js.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shellPath = join(root, 'src', 'client.js')
const enginePath = join(root, 'src', 'engine.mjs')
const outPath = join(root, 'client.js')
const marker = '/* @engine */'

const [shell, engine] = await Promise.all([
  readFile(shellPath, 'utf8'),
  readFile(enginePath, 'utf8'),
])

if (!shell.includes(marker)) {
  throw new Error(`src/client.js is missing the ${marker} marker`)
}

// The factory body is a function scope, not a module scope: drop top-level
// `export` keywords so the inlined module becomes plain declarations.
const inlined = engine
  .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, '')
  .trim()

if (/^\s*export\s/m.test(inlined)) {
  throw new Error('engine.mjs still contains a top-level export after inlining')
}

// Use a function replacer, never a replacement string: the engine source is
// arbitrary code and may contain `$&`, `$1`, `$'` or a literal marker. A string
// replacement would interpret those sequences and quietly corrupt the artifact.
const output = shell.replace(marker, () => inlined) + '\n'

// Built-artifact integrity: the shipped file must be exactly the shell with the
// tested engine inlined, not a near-match.
if (output.includes(marker)) {
  throw new Error(`build marker ${marker} survived inlining`)
}
if (!output.includes(inlined)) {
  throw new Error('inlined engine is not byte-identical to src/engine.mjs')
}
const expected = shell.replace(marker, () => inlined) + '\n'
if (output !== expected) {
  throw new Error('built artifact does not match the deterministic build rule')
}

await writeFile(outPath, output, 'utf8')
process.stdout.write(`built ${outPath} (${Buffer.byteLength(output)} bytes, engine ${Buffer.byteLength(inlined)} bytes inlined verbatim)\n`)
