# Audit findings → fixes

Source: `verify/audit.md` (independent audit by `qa-auditor`, CONDITIONAL PASS).
This file records how each finding was resolved after the audit. All paths are
relative to `plugin/dsh-design-studio/`.

## Test status after fixes

| Suite | Command | Result |
|---|---|---|
| Engine | `node src/test-engine.mjs` | 14 passed, 0 failed |
| Built artifact | `node src/test-built.mjs` | 13 passed, 0 failed |
| Syntax | `node --check client.js`, `node --check src/client.js`, `node --check src/engine.mjs` | OK |
| Build integrity | `node scripts/build-client.mjs` | artifact rebuilt from sources, engine inlined verbatim |

## Finding resolution

| ID | Severity | Status | Resolution |
|---|---|---|---|
| F-01 | MEDIUM | **Fixed** | `scripts/build-client.mjs` now uses a function replacer (`shell.replace(marker, () => inlined)`), so `$&`, `$1` and `$'` inside the engine stay literal. The build asserts the marker does not survive, that the inlined engine is byte-identical to `src/engine.mjs`, and that the artifact equals the deterministic build rule. New `src/test-built.mjs` independently recomputes the build and fails on drift, plus loads the shipped file (`new Function('window', client.js)`), registers it against a stub slot/locale context, renders the panel tree, checks iframe/sandbox, artboard geometry, and invokes every chip/example/history action. Root cause was latent only (no keyword contains regex metacharacters), but the shipped artifact is now a faithful inline. |
| F-02 | MEDIUM | **Fixed** | `.dsx-primary` label now uses `color: var(--dsw-alias-label-primary-inverted)` (verified in installed theme: `#fff` light / `#353638` dark) instead of hardcoded `#fff` over `--dsw-alias-brand-primary` (`#0f1115` light / `#f9fafb` dark). Dark-theme white-on-white is gone. |
| F-03 | LOW | **Documented** | The two remaining literal `background:#fff` values are the artboard matte behind the sandboxed design document (an artwork surface, effectively invisible because the iframe covers it). A comment above `STYLE_TEXT` records the intent; no token exists for a white mockup matte. |
| F-04 | LOW | **Fixed** | Shadows and scrim now use theme-aware tokens: artboard/toast `var(--dsw-shadow-lv2)`, dialog `var(--dsw-shadow-lv3)`, backdrop `var(--dsw-alias-bg-mask-1)` (verified: light `#0000003d`, dark `#00000080`). No more label-derived color-mix (which glowed in dark theme). |
| F-05 | LOW | **Fixed** | `restoreHistory` also restores `draftBrief`, so the composer matches the restored version. |
| F-06 | LOW | **Documented** | Imported HTML stays in `sandbox=""` (no scripts, no same-origin); external images/fonts referenced by an imported document can still load. The import dialog hint and README state this explicitly rather than silently stripping user content. |
| F-07 | LOW | **Fixed** | Import dialog textarea has `autoFocus`; backdrop click and Escape still close it. Full focus trap intentionally not hand-rolled (host modal primitives are not imported by plugins). |
| F-08 | LOW | **Fixed** | Device segmented control uses a dedicated `device.group` label ("Canvas size" / "画布尺寸") instead of "Desktop". |
| F-09 | LOW | **Fixed** | English display title is sentence case now: locale `meta.title` and the in-panel `panel.title` are `Design studio`. |
| F-10 | INFO | **Accepted / extended** | `en`, `zh`, `zh-CN`, `zh-TW` dictionaries are registered, plus `zh-Hans` now; the extra tags are harmless defensive coverage for host locale ids, and `en` remains the ultimate fallback. Manual locale selection still reads the active locale at call time. |
| F-11 | INFO | **Fixed** | A `stateRef` + unmount effect writes the latest state when the panel unmounts, so the 240 ms debounce cannot drop the last edit. Quota failures stay non-fatal by design. |
| F-12 | INFO | **Documented** | Each token change re-renders the iframe document (`srcDoc`), which can flicker while dragging the radius slider. Documented as a known limitation. |
| F-13 | INFO | **Fixed** | README now explains the build rule, `npm test`, why `files` lists runtime files only (directory install links `src/` and `scripts/`), and includes the light-mode refine action and known limitations. |
| F-14 | INFO | **Accepted** | Locale `meta.*` (Plugin Manager display) and the in-panel `STRINGS` dictionaries are separate by design: one is host display metadata read without activating the plugin, the other is runtime UI text registered through the Client locale service. |

## Live verification after the fixes

- Bundle installed and enabled: profile `package.json` lists `@local/dsh-design-studio`;
  `node_modules/@local/dsh-design-studio` symlinks the workspace package; loader row `design-studio`.
- Client slot inspection (`cordis_inspect_query`, platform `client`, provider `Slots`):
  - `sidebar.panellist` occupants include `design-studio` (order 5, `active: true`);
  - `main` occupants include key `design-studio` (`active: true`).
- The connected page was serving the module generation loaded at install time; the
  post-audit rebuild of `client.js` is served on the next page refresh. Visual rendering
  (chrome styling in light/dark, generated canvas, icon pixels) was not screenshot-verified:
  this environment has no browser control, so verification stops at slot registration,
  build/test evidence, and theme-token checks.
