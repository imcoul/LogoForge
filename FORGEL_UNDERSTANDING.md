# Forgel — Brand Identity Operating System

## Executive Summary

Forgel is an AI-powered brand identity operating system designed to bridge the gap between creative drafting and production-ready brand assets. It provides a comprehensive, sandboxed environment for designers to create, audit, and manage high-fidelity design prototypes, typographic composition, and visual-audio assets.

---

## 1. Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion`), Zustand, Vite |
| **Backend** | Express.js + Vite middleware (dev), esbuild (prod bundle) |
| **AI / LLM** | Google Gemini (primary) → StepFun / Poolside / Tencent (connected free-model fallbacks) |
| **Databases** | Firebase Firestore (primary), Supabase & PostgreSQL (backup mirrors) |
| **Collaboration** | WebSockets (`ws`) for real-time cursor/project sync |
| **Image / Export** | `sharp` (server-side SVG→PNG), `html2canvas`, `jspdf`, `pptxgenjs`, `jszip` |
| **Security** | DOMPurify, CORS, CSRF, `cookie-parser`, `express-rate-limit` |
| **i18n** | `i18next` + `react-i18next` (EN / FR / AR) |
| **Testing** | Vitest, Testing Library, `supertest` |
| **MCP** | Built-in Model Context Protocol server for external agent integration |

---

## 2. Repository Structure

```
/root/LogoForge
├── server.ts                    # Express entry, Vite middleware, WebSocket collab server
├── mcp-server.ts                # Standalone MCP JSON-RPC server
├── package.json                 # Dependencies, build scripts
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules
├── .env.example
├── AGENTS.md                    # Project conventions (plan files, persistence contracts)
├── README.md
├── index.html
├── docs/
│   ├── schema.md
│   ├── yjs-mapping.md
│   ├── forge_brand_guide.md
│   ├── decision_memo_perf_targets.md
│   └── ...
├── plans/
│   └── 2026-07-21--connect-free-models-ui-audit.md
├── src/
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Main app (~3252 lines), views, PRD/export generators
│   ├── store.ts                 # Zustand global state + Firebase/IndexedDB sync (~991 lines)
│   ├── types.ts                 # Node, Command, Fill, Stroke
│   ├── schema.ts                # ForgelProjectSchema, YJS mappings
│   ├── index.css
│   ├── i18n.ts                  # EN/FR/AR translations
│   ├── workers/
│   │   ├── renderWorker.ts      # OffscreenCanvas loupe + SVG rasterization
│   │   ├── pathWorker.ts        # Ramer-Douglas-Peucker path simplification
│   │   └── canvasWorker.ts      # Dynamic canvas operations
│   ├── config/
│   │   └── modelRegistry.ts     # StepFun / Poolside / Tencent / Gemini definitions
│   ├── services/
│   │   ├── firebase.ts          # Firebase init, auth, structured error handling
│   │   └── geminiService.ts     # Frontend AI service wrappers
│   ├── server/
│   │   ├── geminiRouter.ts      # AI proxy routes + model fallback engine
│   │   └── backupRouter.ts      # PostgreSQL / Supabase backup CRUD
│   ├── utils/
│   │   ├── serializers.ts       # computePayloadHash (SHA-256)
│   │   ├── sanitize.ts
│   │   ├── vectorizer.ts
│   │   ├── shapeGenerator.ts
│   │   ├── pdfExport.ts
│   │   ├── figmaExport.ts
│   │   └── dbBackupClient.ts    # Client-side backup mirror calls
│   ├── views/
│   │   ├── Dashboard.tsx        # Project list, search, filter, bulk ops, auto-archive
│   │   ├── Studio.tsx           # Main creative workspace (Preview/Guide/Refine/Sonic/etc)
│   │   ├── Settings.tsx         # Secrets, model selection, DB backup, role mgmt
│   │   └── Course.tsx           # Forge Academy interactive learning
│   ├── components/
│   │   ├── CanvasRenderer.tsx
│   │   ├── WhiteboardCanvas.tsx
│   │   ├── SVGPathEditor.tsx
│   │   ├── WhiteboardToolbar.tsx
│   │   ├── InteractiveMockupViewer.tsx
│   │   ├── VectorizePreviewModal.tsx
│   │   ├── PrecisionOverlay.tsx
│   │   ├── TemplateLibrary.tsx
│   │   ├── FigmaExportModal.tsx
│   │   ├── GoogleDriveIntegration.tsx
│   │   ├── ForgeAcademy.tsx
│   │   ├── FileUploader.tsx
│   │   ├── AiPreviewSlider.tsx
│   │   ├── Whacanudo.tsx
│   │   ├── TouchGesturesHelp.tsx
│   │   ├── Toast.tsx
│   │   ├── Sheet.tsx
│   │   ├── StudioControls.tsx
│   │   ├── KeyboardManager.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── AccessibilityScore.tsx
│   └── tests/
│       ├── unit/
│       │   ├── schema_validation.test.ts
│       │   ├── modelRegistry.test.ts
│       │   └── byok_matrix.test.ts
│       ├── sync.test.ts
│       ├── stress/concurrency.test.ts
│       └── feature_integration.test.tsx
└── supabase/
    └── ...
```

---

## 3. Architecture Deep Dive

### 3.1 Entry Points

- **`server.ts`** — Dual-mode Express server:
  - Dev: Vite middleware (`middlewareMode: true`)
  - Prod: static `dist/` + SPA fallback
  - WebSocket server at `/ws-collab` for real-time collaboration
  - Notion OAuth endpoints
  - Server-side PPTX and PNG export endpoints
  - Rate limiting + CORS + CSRF middleware

- **`src/main.tsx`** — React bootstrap: `StrictMode → ErrorBoundary → ToastProvider → App`

- **`mcp-server.ts`** — Standalone MCP JSON-RPC server (stdio), exposing:
  - `list-active-brands`
  - `get-brand-guide`
  - `update-brand-logo`

### 3.2 State Management (`src/store.ts`)

**Zustand** store with ~991 lines of business logic.

**Persistence layers:**
1. **IndexedDB** (`idb-keyval`) — local-first, always available
2. **Firebase Firestore** — primary cloud sync
3. **Supabase / PostgreSQL** — backup mirrors (independent of Firestore)

**Key behaviors:**
- `loadProjects()` — hydrates from IndexedDB, then merges remote Firestore/Supabase projects
- `setUser()` — fetches/creates user profile, merges local unsynced projects to cloud
- `createProject()` / `cloneProject()` / `updateProject()` / `bulkUpdateProjects()` / `deleteProject()` / `deleteProjects()` — full CRUD with cloud sync and backup mirroring
- `undo()` / `redo()` — navigates `sceneHistory` / `sceneHistoryIndex`
- `updateSettings()` — persists to IndexedDB + Firestore user doc

**Cloud sync suspension:**
- `isCloudSyncSuspended` flag set when Firestore quota exhausted
- `disableNetwork(db)` called to stop write streams
- Backup mirrors (`triggerBackupMirror`) still execute independently
- `cloud-sync-suspended` custom event dispatched for UI notification

**Throttled writes:**
- `cloudSyncTimeouts` + `pendingCloudUpdates` accumulate changes
- 1-second debounce before flushing to Firestore
- `throttleCloud: 'skip'` used for WebSocket sync updates to avoid loops

**`prepareForFirestore(project)` — Progressive serialization:**
1. Serialize `sceneGraph` and `sceneHistory` as JSON strings
2. Clean `undefined` values
3. If > 950KB, progressively prune:
   - Step 1: sceneHistory → last 5 entries
   - Step 2: sceneHistory → last 2 entries
   - Step 3: sceneHistory → only current state (1 entry)
   - Step 4: logoHistory → last 2
   - Step 5: snapshots → last 1
   - Step 6: mockups base64 > 25KB → omitted placeholder
   - Step 7: sonicAssets base64 > 25KB → omitted placeholder
   - Step 8: refinementFiles base64 > 25KB → omitted placeholder
   - Step 9: logoUrl base64 data URL > 50KB → omitted placeholder

**`restoreOmittedFields(fbProj, localProj)`** — Rehydrates omitted assets from local IndexedDB after Firestore load.

**`triggerBackupMirror(project, settings)`** — Computes SHA-256 payload hash, throttles redundant calls via `lastSyncHashes`, then calls:
- `syncProjectToPostgres()` if `backupMode === 'postgres' || 'both'`
- `syncProjectToSupabase()` if `backupMode === 'supabase' || 'both'`

### 3.3 Data Model

**`Project`** (in `store.ts`):
- `id`, `ownerId`, `name`, `createdAt`, `updatedAt`, `archived`, `stage`
- `logoUrl`, `logoMimeType`, `svgSource`, `description`
- `brandGuide` (BrandGuide | null)
- `sonicAssets[]`, `sonicPhilosophy`
- `refinementFiles[]`, `refinementSuggestions`
- `competitorAnalysis`, `ecosystemAssets[]`
- `sceneGraph` (Node[]), `sceneHistory` ({ nodes: Node[] }[]), `sceneHistoryIndex`
- `comments` (Comment[]), `mockups` (Mockup[])
- `logoHistory` (string[]), `snapshots` (Snapshot[])
- `stickyNotes` (StickyNote[])
- `whiteboardSketches[]`, `driveFileId`, `tags[]`

**`Node`** (in `types.ts`):
- `id`, `type` (`group | path | rect | ellipse | text | image | line`)
- `locked?`, `transform` ({ x, y, scaleX, scaleY, rotate })
- `style?` — `fill` (string | linear/radial-gradient), `stroke` (string | gradient), `opacity`, `blendMode`
- `props?` — arbitrary shape data (pathData, rx, ry, textContent)
- `meta?` — `createdBy`, `timestamp`, custom metadata

**`Command`** — AI-interpreter structured ops:
- `{ op: "addNode", node }`
- `{ op: "setAttr", nodeId, path, value }`
- `{ op: "transform", nodeId, transform }`
- `{ op: "simplifyPath", nodeId, tolerance }`

**`ForgelProjectSchema`** (in `schema.ts`) — Canonical schema with `layers`, `stickyNotes`, `comments`, `snapshots`, `exportManifests`, plus Yjs CRDT mapping specification.

### 3.4 Backend Routers

#### `src/server/geminiRouter.ts`
- **Model Registry** (`src/config/modelRegistry.ts`): `stepfun`, `poolside`, `tencent`, `gemini`
- **Startup Validation**: logs configured/ missing API keys on boot
- **Unified executor** `generateAIContent()`:
  1. Reads `X-Model-Preference` or `X-Active-Model` header
  2. Checks feature flag gating (`ENABLE_STEPFUN`, etc.)
  3. Falls back to Gemini if custom model key missing or model fails
  4. On Gemini quota error, cascades: StepFun → Poolside → Tencent → `gemini-3.5-flash`
- **Endpoints**:
  - `POST /interpreter` — natural language → Command JSON
  - `POST /generate-logo` — AI logo image generation (PNG)
  - `POST /analyze-refinement` — refinement suggestions from context files
  - `POST /generate-brand-guide` — full/compact brand guide JSON
  - `POST /generate-sonic` — sonic identity philosophy
  - `POST /generate-rationale` — educational design rationale
  - `POST /generate-critic` — persona-based design critique
  - `POST /analyze-competitor` — strategic competitor analysis
  - `POST /generate-ecosystem` — social media / ecosystem asset copy
  - `POST /generate` — generic text generation with model allowlist
- **Audit log**: in-memory array tracking model, prompt length, success/failure

#### `src/server/backupRouter.ts`
- PostgreSQL: `CREATE TABLE IF NOT EXISTS projects` (29 columns), upsert/delete via `pg` Pool
- Supabase: upsert/delete/load via `@supabase/supabase-js`
- Both serialize complex fields as JSON strings

#### Root `server.ts`
- CORS whitelist: `APP_URL`, `localhost:3000`, `localhost:5173`, `*.run.app`
- CSRF: exact origin match on state-changing `/api/` routes
- Rate limit: `/api/gemini` — 100 requests / 15 minutes per IP
- Notion OAuth: `/api/oauth/notion/url` + `/api/oauth/notion/callback`
- PPTX export: `POST /api/export/pptx` (server-side `pptxgenjs`)
- PNG export: `POST /api/export/png` (server-side `sharp`)
- WebSocket: `/ws-collab` — `join`, `sync`, `cursor`, `ghost_sync`, `comment`

### 3.5 Views & Components

**Views:**
- **Dashboard** — Project list, search, stage filter, bulk select/rename/tag/delete, auto-archive (>30 days inactive), interactive tour, bulk export
- **Studio** — Main creative workspace with tabs: Preview, Guide, Refine, Sonic, Collab, Precision, Mockups, Competitor, Ecosystem, Draw
- **Settings** — API keys/secrets, model selection, database backup config, user role management, Figma/Google Drive
- **Course** — Forge Academy interactive learning modules

**Key Components:**
- `CanvasRenderer` — SVG rendering
- `WhiteboardCanvas` — Freehand drawing surface
- `SVGPathEditor` — Raw SVG path editing
- `WhiteboardToolbar` — Drawing tools
- `InteractiveMockupViewer` — Business card / splash / billboard mockups
- `VectorizePreviewModal` — Image-to-vector conversion preview
- `PrecisionOverlay` — Bezier anchor adjustment
- `TemplateLibrary` — Pre-built template selection
- `FigmaExportModal` — Figma integration
- `GoogleDriveIntegration` — Drive file linking
- `ForgeAcademy` — Interactive lessons
- `FileUploader` — Asset upload
- `AiPreviewSlider` — AI variation slider
- `Whacanudo` — Quick-access drawer
- `TouchGesturesHelp` — Mobile gesture hints
- `Toast` — Notification system
- `Sheet` — Bottom sheet component
- `StudioControls` — Studio toolbar controls
- `KeyboardManager` — Keyboard shortcut handling
- `ErrorBoundary` — React error boundary
- `AccessibilityScore` — WCAG accessibility scoring
- `ProjectAnalytics` — Project stats / charts

### 3.6 Web Workers

- **`renderWorker.ts`** — OffscreenCanvas-based loupe magnification and SVG rasterization to PNG blobs
- **`pathWorker.ts`** — Ramer-Douglas-Peucker (RDP) path simplification off main thread
- **`canvasWorker.ts`** — Dynamic canvas operations (referenced by App/store)

### 3.7 MCP Server (`mcp-server.ts`)

Standalone stdio JSON-RPC 2.0 server:
- `initialize` — returns protocol version `2024-11-05`
- `tools/list` — returns 3 tools
- `tools/call` — executes tool
  - `list-active-brands` — queries all Firestore projects
  - `get-brand-guide` — returns brand guide + svgSource + driveFileId for a project
  - `update-brand-logo` — merges new `svgSource` + `updatedAt` into a project doc

---

## 4. Key Design Patterns & Contracts

1. **Canonical Serializer** — `prepareForFirestore()` is the single serializer used before any write to Firestore or Supabase/Postgres
2. **Payload Hash Tracking** — `computePayloadHash()` (SHA-256) + `lastSyncHashes` map prevents redundant backup network calls
3. **Progressive Payload Reduction** — 9-step pruning pipeline to stay under Firestore's ~1MB limit
4. **Omitted-for-Cloud Restoration** — `restoreOmittedFields()` rehydrates large assets from local IndexedDB
5. **Graceful Quota Fallback** — Firestore quota exhaustion suspends primary sync; backup mirrors continue independently
6. **Role-Based Access** — `Designer` (default) vs `Server` (admin); minimum 1 Server enforced before demotion/deletion
7. **Dated Plan Files** — Every major feature must have a `plans/YYYY-MM-DD-HHMMSS--title.md` file with status lifecycle

---

## 5. Environment Variables

```env
GEMINI_API_KEY="..."
APP_URL="..."
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_PUBLIC_KEY=
STEPFUN_API_KEY=
POOLSIDE_API_KEY=
TENCENT_API_KEY=
ENABLE_STEPFUN=true
ENABLE_POOLSIDE=true
ENABLE_TENCENT=true
ENABLE_GEMINI=true
```

---

## 6. Build & Scripts

```bash
npm run dev        # tsx server.ts (Vite dev + Express + WebSocket)
npm run build      # vite build + esbuild server.ts + esbuild mcp-server.ts
npm run start      # node dist/server.cjs
npm run mcp        # tsx mcp-server.ts
npm run lint       # tsc --noEmit
npm run test       # vitest
npm run clean      # rm -rf dist
```

---

## 7. Current Status

The project is **mature, feature-rich, and in active production-grade expansion**. It has solid offline-first architecture with graceful degradation, multi-model AI fallback with quota resilience, real-time collaboration, comprehensive export pipelines, MCP server integration, internationalization, and strong security practices.

---

## 8. UI Analysis & Issues

This section documents all UI issues discovered during the codebase audit, categorized by severity and type.

### 8.1 Critical Issues

#### C-1: Massive Code Duplication Across Files
**Severity: Critical**

The following components/functions are duplicated verbatim or near-verbatim across multiple files:

| Duplicate | Locations |
|---|---|
| `Tooltip` component | `App.tsx:62-95`, `Studio.tsx:81-113` |
| `DesignChecklist` component | `App.tsx:97-187`, `Studio.tsx:115-185` |
| `CustomWaveformPlayer` component | `App.tsx:189-295`, `Studio.tsx:215-296` |
| `ANIMATIONS` constant | `App.tsx:40-48`, `Studio.tsx:60-72` |
| `sanitizeSVG` function | `App.tsx:32`, `Studio.tsx:52`, `Dashboard.tsx:37`, `SVGPathEditor.tsx:15`, `InteractiveMockupViewer.tsx:78` |
| `safeFormatDate` function | `App.tsx:892`, `Dashboard.tsx:45` |

**Impact:** Bug fixes, style changes, or accessibility improvements must be applied in multiple places, leading to inconsistency and increased maintenance burden.

**Recommendation:** Extract all shared UI primitives into a dedicated `src/components/ui/` directory (e.g., `Tooltip.tsx`, `DesignChecklist.tsx`, `CustomWaveformPlayer.tsx`, `ANIMATIONS.ts`, `sanitizeSVG.ts`, `safeFormatDate.ts`).

---

#### C-2: No Focus Traps in Modals
**Severity: Critical**

Zero modals in the application implement focus trapping. When a modal opens, keyboard users can Tab outside the modal into the background content.

**Affected modals:**
- `Whacanudo.tsx`
- `ForgeAcademy.tsx`
- `KeyboardManager.tsx`
- `VectorizePreviewModal.tsx`
- `SVGPathEditor.tsx` (fullscreen mode)
- `FigmaExportModal.tsx`
- `GoogleDriveIntegration.tsx`
- `InteractiveMockupViewer.tsx`
- `TouchGesturesHelp.tsx`
- `Sheet.tsx`

**Impact:** Severe accessibility violation. WCAG 2.1.2 requires focus to be trapped within modal dialogs.

**Recommendation:** Implement a reusable `FocusTrap` component or use a library like `focus-trap`. Wrap all modal content with it.

---

#### C-3: Missing Escape Key Handlers on Modals
**Severity: Critical**

Most modals do not close when the user presses the Escape key. Only the `Sheet` component has an `onClose` prop, but no Escape listener is attached.

**Impact:** Users expect Escape to dismiss modals. Its absence creates significant UX friction, especially for power users.

**Recommendation:** Add a global `keydown` listener (or per-modal) that triggers `onClose` when `Escape` is pressed. Consider creating a `useModalKeyboard` hook.

---

#### C-4: Z-Index Wars & Unclear Layering Scale
**Severity: Critical**

The codebase uses scattered z-index values with no defined scale:

| Value | Used By |
|---|---|
| `z-30` | `Sheet` backdrop |
| `z-40` | `Sheet` panel |
| `z-50` | Most modals, tooltips, collab drawer, fullscreen SVG editor, AiPreviewSlider |
| `z-[99]` | `GoogleDriveIntegration` |
| `z-[100]` | `Toast`, Dashboard delete modals |

**Impact:** Elements unpredictably stack above/below each other. For example, Toast (`z-[100]`) will always cover Dashboard delete modals (`z-[100]`), and GoogleDrive (`z-[99]`) will appear under both.

**Recommendation:** Define a clear z-index scale in `index.css` or a design tokens file:
```css
@layer components {
  .z-dropdown { z-index: 40; }
  .z-sticky { z-index: 50; }
  .z-modal { z-index: 60; }
  .z-toast { z-index: 70; }
  .z-max { z-index: 9999; }
}
```

---

### 8.2 High Severity Issues

#### H-1: Undefined Tailwind Utility Classes
**Severity: High**

The following classes are used extensively but are **not defined** in Tailwind config or CSS:

| Class | Occurrences | Issue |
|---|---|---|
| `no-scrollbar` | 5 | No CSS rule exists; scrollbars will still appear |
| `scrollbar-none` | 2 | No CSS rule exists |
| `custom-scrollbar` | 1 | No CSS rule exists |
| `neutral-850` | 4 | Not a default Tailwind color |
| `neutral-150` | 5 | Not a default Tailwind color |
| `neutral-250` | 2 | Not a default Tailwind color |
| `neutral-750` | 2 | Not a default Tailwind color |
| `neutral-350` | 2 | Not a default Tailwind color |
| `zinc-850` | 1 | Not a default Tailwind color |
| `zinc-855` | 2 | Not a default Tailwind color |
| `animate-fadeIn` | 1 | Not a Framer Motion animation |
| `backdrop-blur-xs` | 3 | Not a default Tailwind blur value |
| `animate-in` / `fade-in-95` / `zoom-in-95` / `slide-in-from-right-8` / `slide-in-from-top-4` | 7+ | Not standard Tailwind or Framer Motion classes |

**Impact:** Silent failures — browsers will ignore unknown classes, leading to visible scrollbars, wrong colors, or missing animations.

**Recommendation:**
1. Add missing CSS utilities to `src/index.css`
2. Replace `neutral-*` custom shades with standard Tailwind palette or extend theme
3. Replace `animate-in` variants with Framer Motion `initial`/`animate`/`exit` props or define CSS keyframes

---

#### H-2: Hardcoded Viewport Units & Fixed Heights
**Severity: High**

Multiple components use hardcoded viewport-relative or fixed sizes that break on edge-case screens:

| Component | Value | Problem |
|---|---|---|
| `WhiteboardCanvas` | `h-[540px]` | Too tall for small screens, too short for large screens |
| `SVGPathEditor` | `w-[70vh] h-[70vh]` | Canvas exceeds viewport on landscape mobile |
| `AiPreviewSlider` | `w-[400px]` | Overflows on screens < 400px wide |
| `VectorizePreviewModal` | `max-h-[90vh]` | May still overflow if keyboard is open on mobile |
| `FigmaExportModal` | `h-[90vh]` | Same keyboard issue |
| `ForgeAcademy` | `max-h-[85vh]` | Same |
| `Whacanudo` | `max-h-[85vh]` | Same |
| `KeyboardManager` | `max-h-[85vh]` | Same |
| `Sheet` | `h-[80vh]` | Same |
| `App.tsx` (collab) | `h-[85vh]` | Same |
| `Studio.tsx` (empty state) | `min-h-[420px]` | Arbitrary fixed minimum |

**Impact:** Content clipping, horizontal scroll, or invisible content on small screens (320px–375px) or landscape orientation.

**Recommendation:**
- Use `min-h-[80dvh]` / `max-h-[85dvh]` (dynamic viewport units) instead of `vh`
- Add `max-w-full` / `max-h-full` with `overflow-auto` fallbacks
- For `AiPreviewSlider`, use `w-[calc(100%-2rem)] max-w-[400px]` instead of fixed `w-[400px]`

---

#### H-3: Missing Dialog Semantics on Modals
**Severity: High**

Almost no modal uses proper ARIA dialog semantics:

| Component | Has `role="dialog"` | Has `aria-modal="true"` | Has `aria-labelledby` |
|---|---|---|---|
| `Whacanudo` | No | No | No |
| `ForgeAcademy` | No | No | No |
| `KeyboardManager` | No | No | No |
| `VectorizePreviewModal` | No | No | No |
| `FigmaExportModal` | No | No | No |
| `GoogleDriveIntegration` | No | No | No |
| `Sheet` | No | No | No |
| `TouchGesturesHelp` | No | No | No |

Only `SVGPathEditor.tsx:1840` uses `role="button"` (and that's on an interactive SVG element, not a modal).

**Impact:** Screen readers cannot identify modal dialogs. Users may not know a modal opened, and background content remains accessible to assistive tech.

**Recommendation:** Create a `<Modal>` wrapper component that:
1. Sets `role="dialog"` and `aria-modal="true"`
2. Links `aria-labelledby` to the modal title
3. Traps focus (see C-2)
4. Returns focus to trigger on close

---

### 8.3 Medium Severity Issues

#### M-1: Dashboard Action Button Visibility on Desktop
**Severity: Medium**

Dashboard project cards use `opacity-100 md:opacity-0 md:group-hover:opacity-100` for action buttons. On desktop, buttons are invisible until hover, making the interface feel "empty" and reducing discoverability.

**Impact:** Users on desktop may not realize actions exist. Also problematic for users with motor impairments who may struggle with hover precision.

**Recommendation:** Keep buttons visible at all times on desktop, or use a subtle always-visible affordance with full opacity on hover.

---

#### M-2: Dark Mode Color Inconsistencies with Custom Shades
**Severity: Medium**

Custom shades like `neutral-850`, `neutral-150`, `zinc-850`, `zinc-855` are used in dark mode contexts but have no corresponding dark variants defined. The Tailwind JIT compiler will generate these as one-off values, but they may not match the intended design system.

**Examples:**
- `bg-neutral-850` used as a button background in `Dashboard.tsx:690-702`
- `border-zinc-855` used in `SVGPathEditor.tsx:2435,2614`
- `text-neutral-750` used in `WhiteboardCanvas.tsx:2731`

**Impact:** Visual inconsistency across screens. These arbitrary values may appear too light or too dark compared to the intended palette.

**Recommendation:** Either extend the Tailwind theme with these shades in `index.css` `@theme` block, or replace with standard palette values (`zinc-800`, `zinc-900`, etc.).

---

#### M-3: Missing Loading / Skeleton States in Some Views
**Severity: Medium**

While `Studio.tsx` and `Settings.tsx` have loading spinners for AI operations, some views lack proper loading states:

- `Dashboard.tsx`: No loading skeleton while projects hydrate
- `Course.tsx`: No loading state for lesson content
- `GoogleDriveIntegration.tsx`: Has `isLoadingFiles` but the empty/error state is minimal
- `FigmaExportModal.tsx`: Loading state exists but there's no retry mechanism on failure

**Impact:** Users see blank screens or stale content during data fetches.

**Recommendation:** Add skeleton loaders (`animate-pulse` blocks) to Dashboard cards and Course modules during hydration.

---

#### M-4: `Sheet` Component Only Works on Mobile
**Severity: Medium**

`Sheet.tsx` has `md:hidden` on both backdrop and panel, meaning it only renders on screens below `768px`. On desktop, the component renders nothing.

**Impact:** If the Sheet is meant to be a universal bottom sheet, desktop users get no UI. If it's intentionally mobile-only, the component name is misleading.

**Recommendation:** Rename to `MobileSheet` or add a desktop variant (centered modal) for larger screens.

---

#### M-5: `KeyboardManager` Modal Lacks Focus Restoration
**Severity: Medium**

When `KeyboardManager` modal closes, focus is not restored to the triggering button.

**Impact:** Keyboard users lose their place in the UI after closing the modal.

**Recommendation:** Store a ref to the trigger button and call `.focus()` on it when the modal closes.

---

#### M-6: Tooltip Positioning May Overflow Viewport
**Severity: Medium**

`Tooltip` components in `App.tsx` and `Studio.tsx` use `bottom-full left-1/2 -translate-x-1/2`, which centers the tooltip above the trigger. On small screens or near viewport edges, the tooltip can overflow horizontally.

**Impact:** Tooltips get clipped by viewport edges, making content unreadable.

**Recommendation:** Use a library like `@floating-ui/react` for intelligent tooltip positioning, or add viewport-aware CSS (`max-w-[90vw]`, `left-0` fallback).

---

#### M-7: Collab Cursor Ghost Sync Has No Throttle
**Severity: Medium**

`handleGhostSync` in `App.tsx:1354-1363` sends WebSocket messages on every cursor move without throttling.

**Impact:** High-frequency cursor events can flood the WebSocket, causing latency spikes for other collaboration events (project sync, comments).

**Recommendation:** Throttle cursor broadcasts to ~30-60fps using `requestAnimationFrame` or a lodash-style throttle.

---

### 8.4 Low Severity Issues

#### L-1: `Sheet` Close Button Text-Only, No Icon
**Severity: Low**

The `Sheet` close button says "Close" without an icon. All other modals use `X` icons.

**Recommendation:** Replace text with `<X size={16} />` icon for consistency.

---

#### L-2: Inconsistent `disabled` State Styling
**Severity: Low**

Buttons use different disabled opacity values (`disabled:opacity-50`, `disabled:opacity-40`, `disabled:opacity-30`) and some disabled buttons still have `cursor-pointer` instead of `cursor-not-allowed`.

**Recommendation:** Standardize on `disabled:opacity-50 disabled:cursor-not-allowed` globally.

---

#### L-3: Hardcoded Brand Purple (`#800080`) in Figma Button
**Severity: Low**

`Settings.tsx:487` and `FigmaExportModal.tsx:266,318` use hardcoded `#800080` (which maps to `brand-lead`). While the `brand-lead` theme variable exists, the hex literal is used directly in some places.

**Recommendation:** Replace `bg-[#800080]` with `bg-brand-lead` for consistency.

---

#### L-4: Missing `referrerPolicy` on Some Images
**Severity: Low**

`Dashboard.tsx:242` and `GoogleDriveIntegration.tsx:456` use `referrerPolicy="no-referrer"` on user avatars, but `InteractiveMockupViewer.tsx` and `PrecisionOverlay.tsx` do not set this attribute.

**Recommendation:** Add `referrerPolicy="no-referrer"` to all external images.

---

#### L-5: `ErrorBoundary` Does Not Capture Async Errors
**Severity: Low**

The `ErrorBoundary` only catches render-phase errors via `componentDidCatch`. Unhandled promise rejections or async callback errors will crash the app without the fallback UI.

**Recommendation:** Add a global `unhandledrejection` listener in `main.tsx` that sets a global error state, or use a library like `react-error-boundary` with better async support.

---

#### L-6: `i18n.language` Check Is Fragile
**Severity: Low**

`Whacanudo.tsx:113` uses `i18n.language === 'ar' ? 'ar' : i18n.language === 'fr' ? 'fr' : 'en'`. If the user's language is `fr-CA` or `en-GB`, this falls back to `en` even though partial translations may exist.

**Recommendation:** Use `i18n.language.split('-')[0]` to extract the base language code.

---

#### L-7: `TouchGesturesHelp` Only Triggers on First Visit
**Severity: Low**

`TouchGesturesHelp.tsx:9` checks `localStorage.getItem('forgel_touch_gesture_help_shown')` and never re-shows the help overlay, even if the user wants to review gestures.

**Recommendation:** Add a "Show Gestures" button in Settings or a help icon that re-opens the overlay.

---

#### L-8: `Studio.tsx` and `App.tsx` Are Monolithic
**Severity: Low**

`App.tsx` is ~3252 lines and `Studio.tsx` is ~1556 lines. Both contain inline component definitions, large handler functions, and PRD generation utilities.

**Impact:** Difficult to navigate, test, and maintain. Changes to one feature risk breaking unrelated functionality.

**Recommendation:** Break `App.tsx` into view-specific files (e.g., `WhacanudoView.tsx`, `CollabView.tsx`, `PRDView.tsx`). Extract `Studio.tsx` sub-tabs into separate components.

---

### 8.5 Summary Table

| ID | Issue | Severity | Files Affected |
|---|---|---|---|
| C-1 | Code duplication (Tooltip, DesignChecklist, WaveformPlayer, ANIMATIONS, sanitizeSVG) | Critical | App.tsx, Studio.tsx, Dashboard.tsx, SVGPathEditor.tsx, InteractiveMockupViewer.tsx |
| C-2 | No focus traps in modals | Critical | All modal components |
| C-3 | No Escape key handlers on modals | Critical | All modal components |
| C-4 | Z-index wars, no defined scale | Critical | All overlay components |
| H-1 | Undefined Tailwind classes (`no-scrollbar`, `scrollbar-none`, `neutral-850`, etc.) | High | 10+ components |
| H-2 | Hardcoded viewport units (`h-[540px]`, `w-[70vh]`, `w-[400px]`) | High | WhiteboardCanvas, SVGPathEditor, AiPreviewSlider, multiple modals |
| H-3 | Missing dialog semantics (`role`, `aria-modal`, `aria-labelledby`) | High | All modal components |
| M-1 | Dashboard action buttons hidden on desktop | Medium | Dashboard.tsx |
| M-2 | Dark mode inconsistencies with custom shades | Medium | Dashboard.tsx, WhiteboardCanvas.tsx, SVGPathEditor.tsx |
| M-3 | Missing loading skeletons in Dashboard/Course | Medium | Dashboard.tsx, Course.tsx |
| M-4 | Sheet only renders on mobile | Medium | Sheet.tsx |
| M-5 | KeyboardManager focus not restored on close | Medium | KeyboardManager.tsx |
| M-6 | Tooltip viewport overflow risk | Medium | App.tsx, Studio.tsx |
| M-7 | Collab cursor broadcast not throttled | Medium | App.tsx |
| L-1 | Sheet close button text-only | Low | Sheet.tsx |
| L-2 | Inconsistent disabled opacity values | Low | Multiple components |
| L-3 | Hardcoded `#800080` instead of `brand-lead` | Low | Settings.tsx, FigmaExportModal.tsx |
| L-4 | Missing `referrerPolicy` on some images | Low | InteractiveMockupViewer.tsx, PrecisionOverlay.tsx |
| L-5 | ErrorBoundary misses async errors | Low | ErrorBoundary.tsx |
| L-6 | Fragile `i18n.language` check | Low | Whacanudo.tsx |
| L-7 | TouchGesturesHelp never re-shown | Low | TouchGesturesHelp.tsx |
| L-8 | Monolithic App.tsx and Studio.tsx | Low | App.tsx, Studio.tsx |
