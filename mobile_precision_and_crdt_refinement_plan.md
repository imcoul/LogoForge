# Forgel OS — Mobile Precision & Collaborative Sync Refinement Plan

This document maps out the expert roadmap to eliminate concurrency ambiguity, remove user-interface jank on lower-end devices, optimize mobile ergonomics, and implement highly transparent, reversible vectorization workflows.

---

## 1. Executive Summary

Having built a single canonical scene graph, a robust collaborative whiteboard, and a fully scoped SVG editor, we now possess the perfect foundation to elevate Forgel from functional to world-class. 

The next phase of our engineering roadmap is highly surgical: we will lock down collaborative synchronization correctness, optimize main-thread math offloading, elevate mobile-first design ergonomics, and establish bulletproof verification gates.

---

## 2. Top Risks & Mitigation Strategies

### 2.1 Concurrent Edit Ambiguity
*   **The Risk:** Concurrently merging path data mutations (`pathD`) and numeric transform adjustments can produce malformed SVG paths or unexpected visual jumping.
*   **Symptom:** Silent rollbacks or corrupted visual paths in collaborative active sessions.
*   **The Mitigation:** Treat `pathD` as standard `Y.Text` with the underlying collaborative engine, but run the merged path strings through a native parser validation step. In case of invalid nodes, rollback automatically to the last known valid snapshot and report a conflict resolution event.

### 2.2 Vectorize (R2V) Trust Gap
*   **The Risk:** Users will reject automated raster-to-vector tracing results if they are destructive, non-configurable, or lack comparison frames.
*   **Symptom:** Low user adoption of the "Vectorize" action, followed by frequent manual undos.
*   **The Mitigation:** Implement a transparent three-variant comparison modal (Low, Medium, and High path simplification options) with a real-time bitmap overlay toggle. Store detailed tracing provenance and a single-click rollback token directly on the generated node metadata.

### 2.3 Main-Thread Rendering Jank
*   **The Risk:** Executing computationally intensive path simplifications, Bezier curve fittings, and boolean operations on budget mobile phones blocks the browser event loop.
*   **Symptom:** Stuttering cursors, low canvas frame rates, and elevated input latency telemetry.
*   **The Mitigation:** Offload path calculation pipelines to a lightweight background thread (`pathWorker.ts`) and utilize a specialized `renderWorker.ts` with `OffscreenCanvas` for loupe magnifications and heavy thumbnail exports.

### 2.4 Mobile Precision Ergonomics
*   **The Risk:** Touching small anchor nodes or trying to nudge handles on small smartphone viewports feels imprecise.
*   **Symptom:** User frustration, inability to perform micro-adjustments, and low mobile retention.
*   **The Mitigation:** Develop the `PrecisionOverlay` mobile kit, featuring a pixel-magnifying loupe, tactile numeric nudge buttons with long-press step acceleration, physical gesture chords, and responsive snapping.

---

## 3. Power Refinements & Technical Deliverables

| Refinement | Impact | Technical Deliverable | Specification Summary |
|---|---|---|---|
| **Yjs Mapping & Conflict Rules** | 🔴 Very High | `docs/yjs-mapping.md` & associated unit tests | Define strict LWW rules for transforms, parse-check merged paths, and auto-rollback invalid SVG nodes. |
| **Workerized Heavy Math & Rendering** | 🔴 Very High | `src/workers/pathWorker.ts` & `src/workers/renderWorker.ts` | Move Ramer-Douglas-Peucker (RDP) path simplification, Bezier fitting, and magnifier loupe rendering to workers. |
| **R2V Tracing with Provenance** | 🟡 High | `src/utils/vectorizer.ts` & Trace Preview UI | Implement 3-variant complexity selection, bitmap overlay toggling, and rollback tokens attached as node metadata. |
| **PrecisionOverlay Mobile Kit** | 🟡 High | `src/components/PrecisionOverlay.tsx` | Provide viewport loupe, step-accelerated nudge arrows, and touch-optimized handle coordinates (≥ 28px target). |
| **Interpreter Explainability** | 🟡 High | Structured AI Operator Pipeline | Refactor AI commands to output clean procedural operations, side-by-side preview comparisons, and instant rollback. |
| **Verification & Testing Gaps** | 🟡 High | Comprehensive E2E Testing Suite | Playwright E2E suites, visual diff checks, and diagnostic performance metrics. |

---

## 4. Prioritized 8-Week Implementation Roadmap

```
  Week 1: Document collaborative conflict rules (Yjs-mapping) and write mock-concurrency tests.
    │
  Week 2: Deploy pathWorker for non-blocking path simplification; measure low-end mobile performance.
    │
  Week 3: Integrate renderWorker with OffscreenCanvas for instant magnifier loupe drawing.
    │
  Week 4: Launch the 3-variant Vectorize preview modal and embed provenance metadata.
    │
  Week 5: Ship PrecisionOverlay mobile controls (nudge keys, gestures, external keyboard cheatsheet).
    │
  Week 6: Upgrade AI Assistant with structured operation previews and side-by-side accept screens.
    │
  Week 7: Expand Playwright E2E test coverage and implement automated UI snapshot comparisons.
    │
  Week 8: Release to production, monitor telemetry benchmarks, and run a 72-hour error audit.
```

---

## 5. Acceptance Criteria & Telemetry Thresholds

### 5.1 The "Five Proofs" Verification Gate
Before promoting any new capability to production, it must successfully pass five validation gates:
1.  **Code Proof:** Clean review, storybook isolation, and green unit/lint passes.
2.  **API Proof:** Fully documented endpoint behavior, structured payloads, and secure keys.
3.  **Integration Proof:** E2E automated flow executing the critical user path successfully.
4.  **Visual Proof:** Pixel-perfect snapshot verification to catch UI regression in light/dark modes.
5.  **Telemetry Proof:** Zero critical system failures and real-time success tracking in production log lines.

### 5.2 Key Telemetry SLAs
*   **Core Interactions (Dragging & Drawing):** `renderdurationms` (P95) `< 16.6ms` (fluid 60 FPS).
*   **Path Simplification Tasks:** `simplifydurationms` (Median) `< 100ms`, (P95) `< 250ms`.
*   **Synchronization Correctness:** `crdt.conflict_rate` `< 0.5%` per active user session.
*   **Tracing / AI Automation Trust:** Track acceptance ratios (`r2v.accepted_rate` and `interpreter.accepted_rate`).
