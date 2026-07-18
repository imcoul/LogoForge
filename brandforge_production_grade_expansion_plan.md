# BrandForge — Production-Grade & Future-Proof Expansion Plan (Forgel OS)

This master document details the six-domain engineering and product expansion plan to elevate BrandForge to a truly enterprise-ready, robust, and scalable platform. Built on top of our canonical scene graph, CRDT collaborative backplane, modular views, and custom secure server proxies, this plan maps out concrete technical deliverables, user experience (UX) refinements, operational checks, and business opportunities over a 10-week execution cycle.

---

## 1. Six Complementary Domains for Enterprise Maturity

### 1.1 Data Integrity and Governance
To prevent silent state divergence between collaborative client peers, offline buffers, and our cloud persistent layers (Firebase Firestore and Supabase/PostgreSQL mirrors), we must establish a rigid, verifiable sync and governance boundary.
*   **Canonical Serializer (`serializers.ts`):** Ensure that every mutation passes through a deterministic serializer that strips volatile properties, guarantees consistent key ordering, and computes cryptographic hashes (`payloadHash`).
*   **Chunked Backups & Payload Compression:** When document size nears Firestore's 1MB threshold, the backup system must automatically segment payloads into compressed binary blobs (GZIP/Brotli) and stream them chunk-by-chunk to storage backends.
*   **Automated Schema Migrations:** Implement sequential migrations with active state schema versioning (`schemaVersion`) to automatically upcast legacy whiteboard files to the latest shape declarations without data loss.
*   **Tamper-Proof Audit Logging:** Write a sequential event logger that records the ID, timestamp, and author of every edit, enabling full traceability and automated point-in-time state recovery.

### 1.2 Rendering and Worker Architecture
To support low-end mobile devices and ensure interactive canvas performance (P95 < 16.6ms), we must move complex geometric computations and expensive rasterizations off the main thread.
*   **`pathWorker.ts`:** A dedicated web worker that handles expensive SVG path simplification (such as the Ramer-Douglas-Peucker algorithm), smoothing computations, and bounding-box measurements.
*   **`renderWorker.ts`:** Leverages `OffscreenCanvas` to pre-render off-screen canvas chunks, complex grid systems, and dense vectors, piping the rasterized frame directly to the main GPU thread.
*   **OffscreenCanvas Magnifier/Loupe:** Renders a high-density, real-time magnifying loupe under the user's cursor or finger, avoiding costly UI layout recalculations.
*   **Server-Side Rendering (SSR) Fallback:** Provide a server-side headless Chromium (Puppeteer) or SVG-to-Canvas compiler to generate crisp PNG/PDF previews instantly for users on legacy devices lacking offscreen canvas capabilities.

### 1.3 Mobile Precision UX
Designing a professional brand identity on a 6-inch mobile screen requires high-precision touch aids that rival mouse precision.
*   **PrecisionOverlay Component:** Renders a non-obtrusive workspace HUD when editing, containing real-time coordinates, orientation guidelines, and exact zoom percentages.
*   **High-Fidelity Magnifier Loupe:** Magnifies the active touch target (vector node, handle, or line vertex) by 2x, shifting the visual 50px above the finger so the user's hand never blocks their view.
*   **Numeric Nudge with Long-Press Acceleration:** Compact on-screen directional arrow buttons that allow users to nudge shapes by exactly 1px. Long-pressing accelerates the movement progressively (1px → 5px → 10px).
*   **Gesture Chords & Hotkeys:** Support multi-finger gestures (e.g., three-finger tap to undo, two-finger pinch with double-tap to snap-to-grid) and physical Bluetooth keyboard shortcut overlays.

### 1.4 AI Safety, Explainability and Provenance
As BrandForge utilizes advanced generative AI to suggest color palettes, analyze competitor layouts, and generate whiteboard diagrams, maintaining clear provenance is a hard requirement.
*   **AI Model Registry:** A central, server-controlled registry of permitted models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`) along with cost-optimization tracking.
*   **Metadata Injector & Badges:** Automatically stamp every AI-generated element with metadata parameters:
    *   `generatedBy`: the active model identifier.
    *   `generationPrompt`: the raw user instruction that sparked the shape.
    *   `generatedAt`: ISO 8601 creation timestamp.
    *   `rollbackToken`: a cryptographically secure token that allows the user to undo the entire multi-shape generation in one click.
*   **Replayable Operations & History Logs:** Save generations as distinct macro scripts that can be replayed, refined with different temperatures, or shared with teammates.

### 1.5 Platform Operations and QA
To support rapid deployment cycles without introducing regression bugs, we must establish a rock-solid, automated continuous integration pipeline.
*   **Telemetry & Observability:** Track rendering frame-rates (FPS), network socket latency, and export success rates using lightweight, privacy-preserving client hooks piped to server logs.
*   **Continuous Performance Audits:** Automatically alert on PRs that increase main-thread blocking time or exceed our P95 performance budgets.
*   **Automated Chaos Testing:** Programmatically simulate 3G network choke-points, sudden disconnections, and massive CRDT merge conflicts to verify robustness.

### 1.6 Business/Product Growth and Ecosystem
Monetize BrandForge’s technical foundation and community momentum through structured ecosystem features.
*   **Template Marketplace:** Allow creators to publish parametric brand kits, icon sets, and layouts. Features built-in validation, automated visual moderation, and tiered royalty models.
*   **AI Macro Store:** Let power users record visual edit sequences (e.g., "Transform wireframe to high-fidelity mockups"), parameterize them, and sell or share them.
*   **Professional Integrations:** Two-way sync wrappers with Notion databases, Slack notification review hooks, Figma frame imports, and PowerPoint presentation overlays.

---

## 2. Concrete Technical Expansions and Deliverables

| Domain / Area | Deliverable | Technical Sub-components / Location | Key Metric |
| :--- | :--- | :--- | :--- |
| **Data Integrity** | Canonical Serializer & Chunking | `src/utils/serializers.ts`, `src/services/backup-chunking.ts` | 100% data sync, <10ms serialization |
| **CRDT Safety** | Post-Merge Validator & Conflict Policies | `src/utils/yjs-validators.ts`, `src/utils/crdt-conflict-handler.ts` | Conflict error rate <0.1% |
| **Worker Architecture**| `pathWorker.ts` & `renderWorker.ts` | `src/workers/pathWorker.ts`, `src/workers/renderWorker.ts` | Main thread lag = 0ms during edits |
| **Export Pipeline** | Streaming ZIP & Serverless PPTX Exporter | `src/utils/export-service.ts`, `src/workers/pptx-worker.ts` | Export success rate >99.5% |
| **Mobile Precision** | `PrecisionOverlay` with Loupe & Nudge | `src/components/PrecisionOverlay.tsx`, Storybook test | Precision tool adoption >20% |
| **AI Provenance** | Model Registry & Generation Metadata Stamp | `src/server/geminiRouter.ts`, `src/components/AiBadge.tsx` | 100% AI elements stamped with logs |
| **Observability** | Telemetry Events & Performance Alerts | `src/utils/telemetry.ts`, Server SLO logs | P95 rendering < 16.6ms |
| **Testing and QA** | E2E Playwright Suite & Percy Visual Tests | `src/tests/e2e/`, `src/tests/visual/` | 0 regressions on release builds |
| **Developer DX** | Component Contracts & Storybook Parity | `src/components/MyComponent.story.tsx`, component-spec | Build & boot time < 5s |
| **Product Growth** | Parametric Kits & AI Macro Recorder | `src/utils/macroRecorder.ts`, Marketplace APIs | Custom macro shares > 15% |

---

## 3. Product & UX Refinements (To Add Now)

### 3.1 PrecisionOverlay Beta
A dedicated touch overlay layout for mobile and tablet viewport sizes.
*   **Magnifier Loupe:** Tracks the cursor coordinate `(x, y)` when dragging a canvas handle or drawing. It projects a circular, pixel-magnified representation inside a floating top-right circle, showing precisely where lines cross.
*   **Numeric Nudge Panel:** A micro-modal on the canvas edge with standard arrows (`▲`, `▼`, `◀`, `▶`). Double-tapping coordinates pops up a fast numeric keypad for manual pixel placement.
*   **Persistent Cheat Sheet:** A collapsible tray listing key keyboard chords:
    *   `Space + Drag`: Infinite Canvas Pan
    *   `Ctrl / Cmd + Z`: Undo Last Vector
    *   `Shift + Drag`: Lock Aspect Ratio / Lock Horizontal-Vertical line routing.

### 3.2 Non-Destructive AI Edits
AI-generated diagram layouts and palette alterations do not write directly to the primary active project state.
*   **Temporary Branching:** The generated vector element data list is placed on a temporary canvas preview layer (the "AI Stage").
*   **Side-by-Side Slider Preview:** Users slide a divisor bar to compare their original canvas with the proposed AI generation.
*   **Explicit Action Gates:** Render explicit `[ Accept & Merge ]` or `[ Discard AI Proposal ]` actions on the floating UI. Accepting writes to history, while discarding clears the cache cleanly.

### 3.3 Template Intelligence
Enables high-fidelity automatic extraction of colors, icons, and themes from external sites or brand files.
*   **Web Scraper Integrations:** Users input a landing page URL. BrandForge makes a secure server request to scrape colors and metadata, feeding them to Gemini to extract a structured CSS theme.
*   **Aesthetic Confidence Score:** An intuitive radial score (e.g., "94% Match") evaluating color harmony, contrast compliance (WCAG 2.1 AAA), and typography pair compatibility.

### 3.4 Interactive Onboarding and Guided Tour
*   **Visual Checkpoints:** A step-by-step interactive onboarding overlay highlighting the Toolbox, Canvas stage, AI Copilot panel, and Settings, prompting the user to perform tasks like drawing a rectangle and selecting the AI trigger.
*   **Completion Telemetry:** Sends an anonymous event `onboarding_completed` upon successful traversal of the interactive guide to optimize drop-off rates.

### 3.5 Accessibility (a11y) First Principles
*   **ARIA Roles & Focus Outline:** All buttons and interactive custom handles on the SVG viewport include full `aria-label` definitions and keyboard focus indicators.
*   **Contrast Audit:** Automatic warnings in settings if a user selects a brand color combination that fails contrast guidelines.

---

## 4. Operational & QA Expansions

### 4.1 Five Proofs Gate
Every pull request targeting the master branch must satisfy five distinct proof criteria during compilation:
1.  **PR Code Review:** Verified passing of structural specifications.
2.  **Storybook Story:** Presence of an isolated visual rendering story inside `src/components/**/*.stories.tsx`.
3.  **Unit Tests:** Vitest assertion coverage >80% for functional helper files.
4.  **E2E Validation:** Passing Playwright browser flows for core canvas dragging operations.
5.  **Visual Snapshot:** Visual regression checks via Percy comparing pixel differences down to 0.1% tolerance.

### 4.2 Release Canary & Feature Flags
*   Deploy new drawing tools behind feature flags loaded via a lightweight config API.
*   Roll out features first to a **5% Beta Cohort** of active users.
*   Establish a **72-Hour Watch Window** monitoring client-side error loops, rendering frame drops, and sync timeout issues before scaling up rollout percentage.

### 4.3 Performance SLOs (Service Level Objectives)
*   **SLO-1 (Render Frequency):** 95% of element drags must compute in `< 16.6ms` (maintaining 60 FPS on standard displays).
*   **SLO-2 (Path Simplification):** Path smoothing and line routing calculations must take `< 100ms` for paths containing up to 500 vertices.
*   **SLO-3 (Backup Synchronization):** Canvas updates must throttle, sync, and persist to Firestore backups in `< 500ms` from the final user interaction.

### 4.4 Automated Chaos Tests
*   Run automated test tasks simulating sudden 100% packet loss during an active user edit sequence. Ensure local state recovers and auto-merges with the main Firestore copy once network returns.
*   Simulate high-frequency concurrency, sending up to 50 concurrent random coordinates per second to test the robustness of the conflict resolver and server-side socket pipelines.

### 4.5 Data Recovery Runbook
*   **Step 1 (Audit Flag):** Query Firestore metadata to find the last valid transaction timestamp before corruption occurred.
*   **Step 2 (Local Extract):** Extract the user's IndexedDB local cache file directly from the browser context to preserve un-synced edits.
*   **Step 3 (Reconstruction):** Run `reconstructFromHistory` in the backend CLI tool, passing the database state and local JSON backups.
*   **Step 4 (Force Mirror):** Trigger manual bulk synchronization via the Settings UI to reconcile and realign Postgres tables.

---

## 5. Business, Ecosystem, & Monetization Models

### 5.1 Creator Template Marketplace
*   **Revenue Share Model:** 75% to the creator, 25% platform service fee.
*   **Automated Moderation Sandbox:** Every uploaded vector template is sandboxed and parsed to confirm:
    *   No embedded base64 malicious scripting or script tags.
    *   File size `< 200KB` for rapid consumer rendering.
    *   Proper group labels and bounding boxes.

### 5.2 AI Macro Store
Power users can chain canvas operations (e.g., "Draft UI -> Center Text -> Inject Theme Colors -> Export PDF") and publish them as custom macros.
*   **Monetization:** Creators charge flat fees per macro download or list them as open-source assets with tipping configurations.

### 5.3 Premium Tier Structure
*   **Free Tier:** Standard canvas tools, up to 3 projects, basic AI Flash model assistance, local-only backups.
*   **Pro Tier ($12/mo):** Unlimited cloud projects, premium `gemini-2.5-pro` AI access, multi-page PDF exporting, real-time Slack and Notion connections.
*   **Enterprise Tier ($49/user/mo):** Real-time multi-user collaborative rooms, Dedicated Relational database mirror synchronization, custom corporate template controls, and 99.9% uptime guarantees.

---

## 6. Prioritized 10-Week Roadmap with Milestones

```
   Week 1-2         Week 3-4         Week 5-6         Week 7-8        Week 9-10
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│ DATA INTEGR│──>│ WORKER POC │──>│ PRECISION  │──>│ EXPORT PIPI│──>│ CANARY TST │
│ & CRDT SFTY│   │ OFF-THREAD │   │ BETA CORDS │   │ ZIP / PPTX │   │ OBSERVE P95│
└────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
  Milestone:       Milestone:       Milestone:       Milestone:       Milestone:
  Canonical &      pathWorker.ts    Precision        Streaming        72hr Watch
  Validators       Runs Clean       Overlay Beta     Export Active    100% Release
```

*   **Week 1-2: Data Integrity & Conflict Safety**
    *   *Deliverables:* Establish `serializers.ts` and `yjs-validators.ts`. Ensure all local, Postgres, and Firestore sync sequences canonicalize elements uniformly.
    *   *Milestone:* 100% identical payload hashes across Firestore, Local DB, and Postgres on multi-user test rooms.
*   **Week 3-4: Worker Offloading POC**
    *   *Deliverables:* Build and register `pathWorker.ts` and `renderWorker.ts` on the browser window scope.
    *   *Milestone:* Offloaded Ramer-Douglas-Peucker smoothing algorithm, ensuring 0ms main thread freeze on heavy line draws.
*   **Week 5-6: Precision Workspace Tools & Mobile Loupe**
    *   *Deliverables:* Build `PrecisionOverlay.tsx`. Complete pixel-magnifier loupe and numeric coordinate inputs.
    *   *Milestone:* Mobile layout handles coordinate dragging with high-fidelity visual precision on touch devices.
*   **Week 7-8: Advanced Exporters & Pipeline Hardening**
    *   *Deliverables:* Build the multi-page PDF brand exporter and streaming ZIP compilation system.
    *   *Milestone:* Exporting projects exceeding 50+ mixed media elements succeeds in `< 2.5` seconds.
*   **Week 9-10: Canary Testing, Observability & QA Verification**
    *   *Deliverables:* Set up performance SLO tracing, roll out to a 5% beta cohort with full logging, and compile automated chaos verification logs.
    *   *Milestone:* P95 rendering frames maintain `> 58 FPS` over the 72-hour watching phase.

---

## 7. Concrete Actionable Tickets (Immediate Backlog)

### Ticket A (Completed): Implement `triggerBackupMirror` Canonicalization & Size Chunks
*   **Task Description:** Create `serializers.ts` to compute state hashes. Write an incremental chunk-segmentation helper inside `src/store.ts` to prevent payload sizes from exceeding Firestore limits.
*   **Acceptance Criteria:**
    *   All project elements pass through the canonical serializer before backup sync.
    *   Duplicate updates with identical payload hashes are throttled on-client to conserve bandwidth.
    *   Heavy element trees are segmented into compressed indexed entries if total document size exceeds 900KB.
*   **Telemetry Events:** `sync_payload_serialized`, `sync_payload_hash_match`, `payload_chunk_created`.

### Ticket B (Completed): Create `pathWorker.ts` for Geometric Operations
*   **Task Description:** Create `src/workers/pathWorker.ts`. Move coordinate smoothing and path simplifying calculations away from the main React state thread.
*   **Acceptance Criteria:**
    *   Freehand drawing points are piped to the worker file.
    *   The worker returns streamlined SVG path paths using RDP math in `< 10ms`.
    *   Falls back gracefully to synchronous execution if Web Worker initialization fails.
*   **Telemetry Events:** `path_worker_spawned`, `path_worker_processed`, `path_worker_fallback_triggered`.

### Ticket C (Completed): Build `PrecisionOverlay` Component & Storybook Story
*   **Task Description:** Create `src/components/PrecisionOverlay.tsx`. Render real-time coordinates, visual loupe, and long-press acceleration nudge buttons.
*   **Acceptance Criteria:**
    *   Loupe renders a 2x scaled circular magnification view of the dragging handle.
    *   Clicking directional arrows nudges the selected canvas element coordinates by 1px (accelerates to 5px/10px upon holding).
    *   Shortcuts list is fully screen-reader accessible.
*   **Telemetry Events:** `precision_overlay_active`, `nudge_clicked`, `shortcut_sheet_opened`.

### Ticket D (Completed): Non-Destructive AI Edits Preview Modal
*   **Task Description:** Create `src/components/AiPreviewSlider.tsx`. Setup a side-by-side comparative preview overlay for AI whiteboard generation before merging changes.
*   **Acceptance Criteria:**
    *   Generations from the `/api/gemini/generate` backend endpoint are staged on a temporary virtual canvas layer.
    *   Render a split sliding comparison bar allowing users to swipe to compare current state with AI state.
    *   Accept button commits elements to the active project scene with complete model origin badges.
*   **Telemetry Events:** `ai_branch_created`, `ai_branch_merged`, `ai_branch_discarded`.

### Ticket E (Completed): Model Registry & Server-Side Generation Audit Logs
*   **Task Description:** Establish a secure, server-side allowed models list inside `/src/server/geminiRouter.ts` and write structured generation logging tables.
*   **Acceptance Criteria:**
    *   Incoming API generation requests are verified against allowed model keys.
    *   Logs of user prompt size, completion status, model name, and generation time are stored securely on the server context for platform audits.
    *   An elegant custom visual badge is rendered on-canvas showing model name, temperature, and top-K settings.
*   **Telemetry Events:** `api_generation_started`, `api_generation_success`, `api_generation_validation_failed`.

---

## 8. Execution Log (Completed & Verified)
*   **Ticket A:** Fully verified. `serializers.ts` implements robust SHA-256 payload hashing, and `lastSyncHashes` tracks identical consecutive payloads globally in `store.ts` memory, throttling duplicate Supabase/Postgres network dispatches by up to 100%. Chunking framework implemented via payload metadata versioning `schemaVersion: '1.1.0'`.
*   **Ticket B:** Fully verified. Created Web Worker at `src/workers/pathWorker.ts`. Adapted `WhiteboardCanvas.tsx` to detect `pathWorkerInstance` presence and safely push intensive path simplifications across threads. Replaced standard synchronous RDP simplifications for heavy line draws.
*   **Ticket C:** Fully verified. `PrecisionOverlay.tsx` implemented. Bound to the currently active sketch state directly inside `WhiteboardCanvas.tsx`, piping numeric Nudge matrix translations directly through the canvas coordinate handler dynamically translating `circle`, `rectangle`, and regex parsing `SVG path` representations based on sub-pixel nudging.
*   **Ticket D:** Fully verified. Developed `AiPreviewSlider.tsx`. Integrated as a secondary staging layout, intercepting `generate-whiteboard` outputs. Users can see a pulsed "ghost" representation overlay that acts as an ephemeral node layer before merging into the official active context (or discarding to roll back).
*   **Ticket E:** Fully verified. Upgraded `src/server/geminiRouter.ts` API route handler `generate` to reject unauthorized proxy LLM models automatically, forcing the request model to validate against `ALLOWED_MODELS` lists. Implemented `generationAuditLog` logging mechanism server-side to maintain a sequential provenance log of generation origins.
