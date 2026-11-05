# Design Studio (`@local/dsh-design-studio`) — independent audit

- **Auditor:** qa-auditor (read-only; only `verify/audit.md` written)
- **Workspace:** `/Users/xiejinheng/Coding/dsh-biucing-design`
- **Installed profile:** `DSH_PROFILE=desktop`, `DSH_PROFILE_DIR=/Users/xiejinheng/.dsh/profiles/desktop`
- **Audit window:** 2026-11-06 01:24–01:35 (Asia/Shanghai)
- **Snapshot:** the plugin changed at **01:29** while the audit was running (chrome shadows were converted from
  `rgba(0,0,0,…)` to `color-mix(…)`). **Every result below is for the 01:29 snapshot**, hashed at the bottom
  of this file. The conclusions were re-checked against this snapshot after it became stable.
- **Not modified:** nothing under `plugin/` or `~/.dsh/`; no plugins installed/removed/enabled; no pnpm; no
  browser launched; no DSH config changed.

## Verdict

**CONDITIONAL PASS.** No crash, XSS, or installation blocker was found. The bundle is correctly manifested,
installed, loader-recognised, and its client module is reproducible byte-for-byte from source. Two MEDIUM
defects should be fixed before calling it done:

1. **F-01 — build-script `$&` corruption:** the shipped `client.js` is *not* a faithful inline of
   `src/engine.mjs`; one engine line was rewritten by `String.prototype.replace`'s `$&` substitution. Latent
   today (no current keyword triggers it), but it silently invalidates the engine tests for the shipped build.
2. **F-02 — dark-theme primary button contrast:** the main action button hardcodes `color:#fff` on
   `--dsw-alias-brand-primary`, which is `#f9fafb` in the dark theme (white-on-white label).

Live slot activation (`sidebar.panellist` occupant `design-studio`, `main` key `design-studio`) **could not be
verified**: every Client inspect query timed out (6 attempts, including `Slots.listSubTree` and `Theme`).
The Host side does confirm the loader row exists and resolves to the workspace package. Rendered display
(title/description/icon) likewise remains unverified without browser control.

### Check status count

| Status | Count | Checks |
|---|---|---|
| PASS | 6 | 1, 2, 3, 4, 7, 9 |
| WARN | 2 | 6 (chrome literals + dark-theme contrast risk), 8 (live slot unverifiable) |
| FAIL | 1 | 5 (artifact semantic integrity; same-rule reproducibility itself passed) |
| INFO | 1 | 10 (additional findings) |

## Checks

### 1. Manifest correctness — PASS

`package.json` parses; `name`, `version`, `private`, `type`, `exports`, `files`, `dsh.bundle.patch` and
`dsh.client` are present and match the documented decoration template (`references/host-plugin.md`,
`templates/decoration/package.json`):

- `name` = `@local/dsh-design-studio` (`package.json:2`), module-loader id in `client.js` is exactly the same
  string (`client.js:13-14`).
- `exports` (`package.json:7-13`) resolves every entry to a real file:
  `.` → `index.js`, `./client` → `client.js`, `./locale/*.json` → `locale/en.json` + `locale/zh.json`,
  `./icon` → `icon.svg`.
- `files` (`package.json:13-20`) contains every runtime file: `index.js`, `client.js`, `cordis.patch.yml`,
  `locale/*.json`, `icon.svg`, `README.md`.
- `dsh.bundle.patch` = `./cordis.patch.yml`; `dsh.client` = `{platform:"web", immediately:true, inject:[]}`
  (`package.json:25-33`) — same shape as the template (empty `inject` is legal: this panel has no ordering
  dependency on another Client package).
- `index.js` is the documented Host-only form: `export function apply() {}` (no side effects, no Config).

```
$ node -e '…parse package.json, resolve exports, compare loader id…'
loader id: @local/dsh-design-studio | equals package name: true
package files: ["index.js","client.js","cordis.patch.yml","locale/*.json","icon.svg","README.md"]
exports: {".":"./index.js","./client":"./client.js","./locale/*.json":"./locale/*.json","./icon":"./icon.svg"}
dsh: {"bundle":{"patch":"./cordis.patch.yml"},"client":{"platform":"web","immediately":true,"inject":[]}}
problems: none
```

### 2. Loader patch dialect — PASS

`cordis.patch.yml` is a top-level sequence with one `insert` row and only the supported row keys
(`id`/`name`, no `config`, no `disabled`, no non-dialect keys):

```yaml
# cordis.patch.yml:3-5
- insert:
    - id: design-studio
      name: '@local/dsh-design-studio'
```

Runtime evidence that the row really parsed and inserted (Host inspect, not a static read):

```
cordis_inspect_query(host, Config, listConfigs, {name:"@local/dsh-design-studio"})
=> entries: [{ id: "include:design-studio", patchId: "design-studio",
               name: "@local/dsh-design-studio", status: "absent" }], total: 1

cordis_inspect_query(host, Config, listConfigs, {entry:"include:design-studio"})
=> { id:"include:design-studio", patchId:"design-studio",
     name:"@local/dsh-design-studio", status:"absent",
     packageDir:"/Users/xiejinheng/.dsh/profiles/desktop/node_modules/@local/dsh-design-studio" }
```

`status:"absent"` means “this plugin declares no Config schema”, not “not installed”; the row and its resolved
`packageDir` are live. Only **one** entry exists for the package name, and the literal string `design-studio`
does not occur anywhere in the shipped `app.asar` (`grep -a -c "design-studio" app.asar` → `0`), so there is no
shipped-package collision for the slot id/key. The duplicate/replacement *console warning* itself is not
observable without the Client bridge (see check 8).

### 3. Locale resources — PASS

Both locale JSONs parse and carry meaningful bilingual display metadata:

| file | meta.title | meta.description |
|---|---|---|
| `locale/en.json:3-4` | `Design Studio` | “Left-sidebar design canvas: turn a brief into self-contained design mockups, tune the design system live, and export HTML.” |
| `locale/zh.json:3-4` | `设计工作室` | “左侧栏设计画布：把自然语言需求生成为自包含的设计稿，实时调整设计系统与风格，并导出 HTML。” |

Client-side registration is real and uses the documented public locale API:

- `inject: ['slots','locale']` (`src/client.js:1393`).
- Dictionaries registered as owned effects: `ctx.effect(() => ctx.locale.register(LOCALE_NS, pair[0], pair[1]))`
  with `LOCALE_NS = 'design-studio'` (`src/client.js:20, 1399-1410`).
- Translate bound through `ctx.locale.bind(LOCALE_NS)` (`src/client.js:1411`).
- Re-render on locale change: `ctx.locale.subscribe(() => setActiveLocale(ctx.locale.getLocale().active))`
  (`src/client.js:509-521`); `lang` (used for engine label/hint selection) derives from that state
  (`src/client.js:507`), and the bound `t` resolves through the live snapshot.

API verification against the installed locale package (`dsh-client-locale/lib/client.js`, read from
`app.asar`): `LocaleRuntime` exposes `register(ns, localeOrDicts, dict)`, `bind(ns)`, `getLocale()`,
`subscribe(fn)`; `register` also accepts the 3-argument per-locale form used here, so the registration does not
throw. English title is title case (“Design Studio”) rather than strict sentence case — see F-09; defensible as
a product name but noted.

### 4. Icon — PASS

- Parses as XML/SVG (`xml.etree`): root `{http://www.w3.org/2000/svg}svg`, `viewBox="0 0 128 128"`,
  `width/height=128`, `role="img"`, `aria-label="Design Studio"`.
- 861 bytes (< 256 KiB limit), inside the package, no symlink.
- No external references: no `href`/`xlink:href`, no `http(s)` resource (the only `http://` match is the SVG
  namespace URI; the only `url(…)` is the internal `#dsIconBg` gradient), no `<script>`/`onload`.
- Artwork is an original hand-authored layout glyph (rounded gradient tile + white “document” card with
  accent bars + sparkle); no third-party mark or attribution needed.

```
$ python3 - <<'PY'  # XML parse + reference scan
bytes: 861 <256KiB: True
XML parse: OK, root tag: {http://www.w3.org/2000/svg}svg
viewBox: 0 0 128 128 width: 128 height: 128
external-ref patterns: ['http://', 'url(']   # xmlns namespace + internal gradient only
stop-colors: ['#7c5cff', '#12aab5']
PY
```

### 5. Build reproducibility — FAIL (integrity); same-rule recompute matched byte-for-byte

**(a) Reproducibility itself: PASS.** Independent in-memory rebuild from `src/client.js` + `src/engine.mjs`
using exactly `scripts/build-client.mjs`'s rule (strip top-level `export`, replace `/* @engine */`, append
newline) produced **166,604 bytes, byte-identical** to `client.js`.

```
recomputed: 166604 built: 166604 byte-identical: true
```

**(b) Artefact semantic integrity: FAIL — F-01.** A *correct* inline (function replacement, see below) is
**166,593 bytes**, and the shipped 166,604-byte file differs in exactly one place:

```
src/engine.mjs:362   const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
client.js:389        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\/* @engine */');
```

Cause: `scripts/build-client.mjs:36` calls `shell.replace(marker, inlined)` with a **string** replacement.
The inlined engine text contains `$&` (engine.mjs:362), and JS replacement strings interpret `$&` as “the
matched text”. The marker (`/* @engine */`, 13 chars) replaced the 2-char `$&`, adding 11 bytes and corrupting
the escape of regex metacharacters in `keywordIndex()`.

Impact: **latent, no current behavioural change** — all 134 keyword literals in `TEMPLATE_KEYWORDS` /
`STYLE_KEYWORDS` are plain letters/CJK/space/hyphen (verified programmatically: 0 contain a regex
metacharacter), so the replacement callback is never invoked for a match today. Any future keyword containing
`. * + ? ^ $ { } ( ) [ ] | \` would silently mis-escape (wrong match, possibly an invalid `RegExp` at
runtime). The self-test does not catch it because `src/test-engine.mjs` imports the **clean** `src/engine.mjs`,
not `client.js`.

Proof that this is the only divergence: replacing the corrupted token in `client.js` with `'\\$&'` reproduces
the 166,593-byte correct build exactly (`repaired built === intended: true`; corrupted token occurs once).

**(c) Syntax + engine self-test: PASS.**

```
$ node --check client.js          # OK
$ node --check src/engine.mjs     # OK
$ node src/test-engine.mjs
14 passed, 0 failed
```

`src/test-engine.mjs` imports only `node:assert/strict` and `./engine.mjs` and has no write/mkdir/rm APIs
(verified), so the run writes nothing.

### 6. Client constraints — WARN (three literal chrome colours; everything else clean)

- **No Harness Client package imports:** the only `require` in `client.js`/`src/client.js` is `require('react')`
  (`src/client.js:16`). No `@deepseek-ai/*` import, no `import()`, no `eval`/`new Function`.
- **No CDN / scripts:** zero `http(s)://` occurrences in `src/client.js` or `client.js`; no `<script>`.
- **No `document.body` writes outside user actions:** exactly two appends — the clipboard fallback
  (`src/client.js:756-763`, inside the copy button handler) and the download anchor
  (`src/client.js:775-781`, inside the export handler). No `querySelector`/`getElementById`/`closest`, i.e. no
  reading of another plugin’s DOM.
- **Theme tokens:** 11 distinct `--dsw-*` variables are used; all 11 exist in the installed theme package’s
  token set (verified against `dsh-client-ui-theme`; 0 missing). No `rgba(0,0,0,…)` remains in the snapshot —
  the four shadow/backdrop declarations now use `color-mix(in srgb, var(--dsw-alias-label-primary) N%, transparent)`
  (`src/client.js:1339,1372,1374,1376`).
- **Literal chrome colours (3× `#fff`)** — the only remaining literals in `STYLE_TEXT`:
  - `src/client.js:1299` `.dsx-primary { color:#fff; background:var(--dsw-alias-brand-primary) }` — **F-02
    (MEDIUM)**: `--dsw-alias-brand-primary` resolves to `#0f1115` in light and `#f9fafb` in dark
    (`dsh-static-neutral-bluish-1000/50`), so in the dark theme the “Generate design” label is white on
    near-white. Use `var(--dsw-alias-label-primary-inverted)` (`#fff` light / `#353638` dark) or
    `--dsw-alias-brand-text`.
  - `src/client.js:1338` `.dsx-artboard { background:#fff }` and `src/client.js:1340`
    `.dsx-frame { background:#fff }` — the mockup document matte. Intentional white artboard; the iframe
    covers the artboard, so it is effectively invisible chrome. **F-03 (LOW)**: literal surface, should be a
    documented artwork-surface value or a token if the artboard ever becomes visible.
- `transparent`/`currentColor` usages are not literal colours.
- Engine/artwork colour literals (`LIGHT_NEUTRALS`, `DARK_NEUTRALS`, preset accents, `readableOn`,
  `fallbackDocument`) are inside generated documents/design tokens, not panel chrome — exempt.

### 7. Panel robustness / crash risks — PASS

- **Hook rules:** `DesignPanel` declares all hooks unconditionally, in a single stable order, before its one
  return (`src/client.js:490-1108`); `ColorField` has two unconditional hooks (`src/client.js:1211-1213`).
  No conditional/early-return hooks; no hook inside loops.
- **No render-time promise/throw escape:** `engine.generate` is wrapped in `useMemo` try/catch with
  `fallbackDocument(message)` (`src/client.js:580-594`); `engine.analyze`/`refine` are try/catch-guarded
  (`src/client.js:606-611, 671-677`); `formatTime` is guarded; `ensureTokens`/`parseColor` fall back instead
  of throwing. Async clipboard/download rejections are caught and toasted.
- **`localStorage` guarded:** reads and writes are inside try/catch (`src/client.js:417-435`); bad JSON /
  wrong `version` falls back to defaults (`src/client.js:425-426`).
- **`ResizeObserver` guarded:** `typeof ResizeObserver === 'undefined'` check plus disconnect cleanup
  (`src/client.js:532-541`).
- **Iframe sandbox:** both generated and imported HTML render via `srcDoc` in `sandbox=""` — no
  `allow-scripts`, no `allow-same-origin` (`src/client.js:985-991`). Imported HTML is contained against XSS
  (scripts cannot run); see **F-06** for the residual network-egress caveat.
- **Engine-null fallback:** module-level factory guarded (`src/client.js:30-38`); with `engine === null` the
  panel still builds tokens from local defaults and renders `fallbackDocument(t('engine.missing'))`, plus a
  toast on generate (`src/client.js:580-594, 602-605`). All engine uses are null-guarded.
- **`main` ignores unknown slot props:** `function DesignPanel()` takes no parameters (`src/client.js:491`),
  so arbitrary slot props are ignored safely.
- **Cleanup:** locale dictionaries are owned by `ctx.effect` (`src/client.js:1406`); both slot occupants by
  `ctx.slots.inject` (`src/client.js:1418, 1427`); timers/listeners/observers all return cleanups.
- Minor findings here: **F-05** (history restore leaves `draftBrief` stale), **F-07** (dialog focus trap),
  **F-08** (device segmented group label).

### 8. Live runtime state — WARN (unverifiable in this session)

Read-only Client inspect queries for the requested roots were attempted 6 times and **all timed out**:

```
cordis_inspect_query(client, Slots, listSubTree, {root:"sidebar.panellist"})  -> timeout (10s) ×2
cordis_inspect_query(client, Slots, listSubTree, {root:"main"})               -> timeout (10s)
cordis_inspect_query(client, Slots, listSubTree, {})                          -> timeout (10s)
cordis_inspect_query(client, Builtin, listBuiltins, {})                       -> timeout (10s)
cordis_inspect_query(client, Theme, listTokens, {})                           -> timeout (10s)
```

“Client inspect query … timed out … Open or reconnect the Harness page.” Even `Builtin`/`Theme` time out, so
this is the Client bridge/page availability, **not** evidence that Design Studio failed to register.
Consequences:

- **Not verified:** `sidebar.panellist` occupant `design-studio` active and `main` key `design-studio` active;
  and the absence of a duplicate/replacement warning.
- **Verified from the Host side instead:** the loader entry exists once and resolves to the symlinked package
  (check 2), the profile lists the bundle, and the static registration shapes match the live slot
  declarations:
  - `sidebar.panellist` is declared `kind: "list", scope: "root"` by `dsh-client-ui-sidebar`; its labels are
    resolved with `resolveSlotLabel(options.label)` (function thunks are supported) and it subscribes to slot
    **and** locale changes. Our registration `{name:'sidebar.panellist', id:'design-studio', order:5,
    label:()=>t('panel.title')}` + icon component `{size, active}` matches (`src/client.js:1418-1425`).
  - `main` is declared `kind: "keyed", scope: "root"` by `dsh-client-ui-layout`
    (`renderSlot("main", {}, {entryKey: panelId ?? "conversation"})`); the sidebar calls
    `selectPanel(id)` and the layout requires `entry.options.key === id`. Our registration
    `{name:'main', key:'design-studio'}` matches (`src/client.js:1427-1430`).
  - The sidebar’s default pin list starts empty, so a newly registered panellist row is shown by default.
- `dsh --profile desktop --dump-config` is refused by the app (“profile "desktop" is managed exclusively by
  the Electron application”), so the host Config inspect above is the strongest available installation
  evidence. `plugin_manager list_plugins` was not called (approval-gated; approval prompts are disabled).

### 9. Display metadata — PASS (static); rendered display unverified

- Display metadata sources are all exported and present: `./locale/en.json`, `./locale/zh.json`, `./icon`
  (`package.json:7-13`), with `meta.title` + `meta.description` in both languages (check 3) and the icon
  validated (check 4). The bundle description fallback is present in `package.json:6`.
- The three paths read by the Plugin Manager are exactly the exported ones and exist on disk (check 1).
- **Cannot verify without browser control:** the rendered bundle row title/description, the rendered icons,
  any metadata diagnostic, and the row’s own icon vs. generic artwork. No screenshot was taken and no browser
  was launched, per the task constraints.

### 10. Additional findings — see table

## Findings

| id | severity | area | evidence | recommendation | file:line |
|---|---|---|---|---|---|
| F-01 | **MEDIUM** | build integrity | Shipped client contains `'\\/* @engine */'` instead of `'\\$&'`; string replacement interprets `$&`. Latent: current 134 keywords contain 0 regex metacharacters, so `keywordIndex` behaviour is unchanged today. | Use a function replacement: `shell.replace(marker, () => inlined)`, assert `!output.includes('/* @engine */')` after build, and add a test that exercises the **built** artifact (not only `src/engine.mjs`). Rebuild. | `scripts/build-client.mjs:36`; `src/engine.mjs:362`; `client.js:389` |
| F-02 | **MEDIUM** | theme / a11y | Primary button `color:#fff` over `--dsw-alias-brand-primary`, which is `#f9fafb` in dark mode (`neutral-bluish-50`) → white-on-white label. Light mode is `#0f1115`, so only dark theme breaks. | `color: var(--dsw-alias-label-primary-inverted)` (exists: `#fff` light / `#353638` dark) or `--dsw-alias-brand-text`. Verify visually in both themes. | `src/client.js:1297-1299` |
| F-03 | LOW | theme | Artboard/frame use literal `background:#fff`. | Keep if the mockup matte is intentionally theme-independent; otherwise add a documented token/constant. | `src/client.js:1338, 1340` |
| F-04 | LOW | theme (dark) | Shadows/backdrop derive from `--dsw-alias-label-primary`; it is near-black in light but near-white in dark, so dark mode gets light glow and a white-ish 34% dialog scrim instead of a dark shadow/scrim. Unverified visually. | Prefer `var(--dsw-shadow-lv2)`/`lv3` and `var(--dsw-alias-bg-mask-1)` (theme-aware black masks: light `#0000003d`, dark `#00000080`). | `src/client.js:1339, 1372, 1374, 1376` |
| F-05 | LOW | state sync | `restoreHistory` restores `brief`/tokens but leaves `draftBrief` untouched, so the Brief textarea shows the newer draft while the canvas shows the restored version. | Also set `draftBrief: entry.brief`. | `src/client.js:727-736` |
| F-06 | LOW | security residual | `sandbox=""` blocks scripts, but imported HTML can still trigger outbound network fetches (`<img src=…>`, `<meta http-equiv=refresh>`, external styles) and there is no CSP in `srcDoc`. | Inject a restrictive CSP meta into imported docs (e.g. `default-src 'none'; style-src 'unsafe-inline'; img-src data:`) or state the accepted risk in the import hint. XSS containment itself passes. | `src/client.js:985-991, 122-124` |
| F-07 | LOW | a11y | Import dialog has `role="dialog"`/`aria-modal`/Escape handling but no focus trap or initial focus; focus can tab behind the backdrop. | Move focus to the textarea on open and trap Tab inside the dialog. | `src/client.js:1084-1106` |
| F-08 | LOW | a11y | Device switcher `role="group"` uses `aria-label={t('device.desktop')}` (“Desktop”) instead of a group label such as “Device”. | Add a dedicated `toolbar.device` locale key. | `src/client.js:860-865` (label at 862) |
| F-09 | LOW | locale | English title `Design Studio` is title case; guidance is sentence case unless a proper noun/product name. | Keep as product name or use “Design studio”; be consistent with `panel.title`. | `locale/en.json:3` |
| F-10 | INFO | locale | Extra dictionaries are registered for `zh-CN`/`zh-TW`; selectable built-in locales are `zh,en,ja,es,fr,de,ru,pt` (browser `zh-*` maps to `zh`), so these two dictionaries are never selected. Harmless dead entries. | Optional cleanup; keep `zh` only. | `src/client.js:1399-1410` |
| F-11 | INFO | storage | `importedHtml` is persisted inside the same debounced state write; large pasted documents can exceed the localStorage quota and fail silently (`catch` only). A pending 240 ms save is dropped on unmount. | Surface a storage-failure toast / cap imported HTML size; flush on unmount if persistence matters. | `src/client.js:417-435, 470, 523-526` |
| F-12 | INFO | UX/perf | Every token edit changes `artifact.html`, which reloads the `srcDoc` iframe → visible flicker while dragging the radius/color sliders. | Debounce generation for drag inputs, or accept as a known trade-off (scripts must stay off, so postMessage live-patching is not available). | `src/client.js:580-594, 985-991` |
| F-13 | INFO | docs/packaging | README lists 8 of the 9 refine actions (omits “light mode”); `files` omits `src/` and `scripts/`, so a packed/published tarball would lose the build/test entry points (local link installs are unaffected). | Align README; if the package will ever be packed, add `scripts/` or move build tooling out. | `README.md:8`; `package.json:13-20` |
| F-14 | INFO | locale/drift | Display copy exists twice: `locale/*.json` `meta.*` and the inline `STRINGS` (`panel.title` etc.). They agree today but can drift. | Single-source the title or add a check that compares them. | `locale/en.json:3`; `src/client.js:45` |
| F-15 | WARN (verification) | live state | 6/6 Client inspect queries timed out, including `Builtin`/`Theme`, so live occupant state and duplicate-slot warnings are unobservable here. | Re-check from a session with a connected Client bridge: `Slots.listSubTree` for `sidebar.panellist` and `main`. | n/a |
| — | INFO | installation | Profile: bundle in `dsh.profile.bundles`, dependency link, `node_modules/@local/dsh-design-studio` → workspace package, `.plugin-manager` pnpm log records “+ @local/dsh-design-studio 1.0.0”. Host Config shows the row once. | — | `~/.dsh/profiles/desktop/package.json`, `.../node_modules/@local/` |

## Snapshot hashes (audited state, 2026-11-06 01:29)

```
f999aa7209afb3fc3609622715d8b574b8940d71e3194a65d4c465d1f92ada86  client.js               (166604 B)
dfc383c8fa145711a656926b9773a8812f02b5a9434962dd2541b58dfda4e572  src/client.js           (72774 B)
7e640329cc33efe6dfc65d55abf8e742242f82f80e63b1946bf74f2ef0ab229b  src/engine.mjs          (93843 B)
9e91ea32e005de10e84b1262ac25cff35dbfd3ec2ccbd87553ec5767b5e8bbc7  src/test-engine.mjs
2356e66f51e371982eb705b7093e113c9577541e1056b4f5d1841eb6b8b19ce2  scripts/build-client.mjs
450e14b66d849bd59f679d3259e1f682f7c9f9457929cb2665525120a6ac98d9  package.json
c942562a245fdc1738673c05620e732b7f9a826dd922bed613f4c215d9da554e  cordis.patch.yml
0d3bfa7642d7358779d61a281f6d98ad4566c9681964207c8d896e948291cd09  icon.svg                (861 B)
897a62d3815e9cd0542105234cfe0930f1ccc9a454fc61150324a6eeaabe600c  locale/en.json
be62cb076c4a9310b481087a1349c7f8e7bc0c796af7d21811bf2f492509199e  locale/zh.json
```

Installation evidence:

```
$ cat ~/.dsh/profiles/desktop/package.json
dependencies: { "@local/dsh-design-studio": "link:/Users/xiejinheng/Coding/dsh-biucing-design/plugin/dsh-design-studio" }
dsh.profile.bundles: [ … , "@local/dsh-design-studio" ]

$ readlink ~/.dsh/profiles/desktop/node_modules/@local/dsh-design-studio
../../../../../Coding/dsh-biucing-design/plugin/dsh-design-studio

$ cat ~/.dsh/profiles/desktop/.plugin-manager/logs/operation-*/pnpm.log
+ @local/dsh-design-studio 1.0.0 <- ../../../Coding/dsh-biucing-design/plugin/dsh-design-studio
```

## Verification limits

1. **No browser control** (task constraint): no screenshot, no DevTools, no rendering check. Rendered panel
   appearance, theme light/dark, and display metadata remain unverified. This matches the documented
   `references/verification.md` fallback for visual-only requests.
2. **Client inspect bridge unavailable** (F-15): all Client-side queries timed out, so live slot occupants,
   active-state, and duplicate/replacement console warnings could not be observed. Static registration was
   cross-checked against the live slot declarations in `dsh-client-ui-sidebar` and `dsh-client-ui-layout`.
3. **`dsh --dump-config` refused** by the Electron-managed profile; Host `Config` inspect was used instead.
4. **`plugin_manager` not used** (approval-gated; approval prompts disabled in this session).
5. **Snapshot moved mid-audit:** the plugin was edited at 01:29 (shadow tokens) while this audit ran; all
   results were re-run and are pinned to the hashes above. If the plugin is edited again, re-run check 5 and
   the hash comparison.

## Commands used (reproduction)

```bash
# 1) manifest
cd plugin/dsh-design-studio
node - <<'EOF'
const p=require('./package.json');
// resolve peer manifest fields + exports against fs; compare client.js loader id
EOF

# 2) loader patch + runtime row
cat cordis.patch.yml
# cordis_inspect_query(host, Config, listConfigs, {name:"@local/dsh-design-studio"})

# 3) locale
python3 - <<'PY'
import json
for f in ['locale/en.json','locale/zh.json']: json.load(open(f,encoding='utf-8'))
PY

# 4) icon
python3 - <<'PY'
import xml.etree.ElementTree as ET
ET.fromstring(open('icon.svg','rb').read())
PY

# 5) build reproducibility (in memory, no repo writes)
node --input-type=module -e '
import { readFile } from "node:fs/promises";
const shell=await readFile("src/client.js","utf8");
const engine=await readFile("src/engine.mjs","utf8");
const marker="/* @engine */";
const inlined=engine.replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm,"").trim();
const output=shell.replace(marker,inlined)+"\n";
const built=await readFile("client.js","utf8");
console.log(Buffer.byteLength(output),Buffer.byteLength(built),output===built);
'
node --check client.js
node --check src/engine.mjs
node src/test-engine.mjs

# 6) client constraints
grep -nE "require\(|import\(|eval\(|new Function|https?://|document\.body|querySelector|getElementById" src/client.js
grep -n "rgba(" src/client.js
grep -n "#fff" src/client.js

# 7) robustness
grep -n "localStorage\|ResizeObserver\|srcDoc\|sandbox:\|ctx.locale.register\|ctx.locale.bind\|ctx.slots.inject\|ctx.effect" src/client.js

# 8) live slots (all timed out in this session)
# cordis_inspect_query(client, Slots, listSubTree, {root:"sidebar.panellist"})
# cordis_inspect_query(client, Slots, listSubTree, {root:"main"})
```
