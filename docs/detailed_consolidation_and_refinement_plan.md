# Forgel — Detailed Consolidation & Refinement Plan

This document serves as the master engineering roadmap to execute the workspace consolidations, architectural repairs, security tightenings, and feature upgrades outlined in Forgel's Exhaustive Feature Analysis.

---

## 1. Phased Execution Overview

The transition to a highly consolidated, robust, and secure application is organized into **5 sequential phases**. Each phase contains explicit instruction lists, target files, and success criteria.

```
┌───────────────────────────────────────────────┐
│ PHASE 1: Brand Alignment & Security Fixes      │ -> Fonts, Colors, postMessage, DOMPurify
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│ PHASE 2: Navigation & Workspace Consolidation │ -> 10 Tabs -> 4 Workspaces + 1 Collab Drawer
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│ PHASE 3: Core Workspace Features Polish       │ -> History Stacks, AI Refiners, R2V
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│ PHASE 4: Canvas & Auditory Refinement         │ -> Bezier drawing, node handles, ADSR synth
└───────────────────────┬───────────────────────┘
                        ▼
┌───────────────────────────────────────────────┐
│ PHASE 5: Output, PDF Exports & Verification   │ -> Multi-page PDF, CSS Blending, Full build
└───────────────────────────────────────────────┘
```

---

## 2. Phase 1: Brand Alignment & Security Fixes
*   **Focus:** Harmonize the application with brand specifications, sanitize vulnerabilities, and lock down security.

### Task 1.1: Web Typography Swap
*   **Target File:** `/src/index.css`
*   **Action:**
    1.  Replace the Google Fonts `@import` link to load `Quicksand` (font-sans) and `Comfortaa` (font-display) instead of `Space Grotesk` and `Inter`.
    2.  Update the `@theme` definitions to map `--font-sans` and `--font-display` to these new fonts.
*   **Checklist:**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Quicksand:wght@300;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
    ```

### Task 1.2: Brand Color Mapping & Asset Attribution
*   **Target Files:** `/src/index.css`, `/src/App.tsx`, and `/src/components/`
*   **Action:**
    1.  Define a brand action utility color `brand-purple` pointing to Leadership Purple `#800080`.
    2.  Replace occurrences of `indigo-600` and `indigo-500` with brand-aligned Purple (`brand-purple` or `#800080`) as the primary active state.
    3.  Inject a footer attribute in the side navigation bar reading: *"Built by Srvel — Serve. Grow. Lead."* in typography fitting the Comfortaa/Quicksand specimen sheets.

### Task 1.3: Absolute DOM Sanitization
*   **Target Files:** `/src/App.tsx`, `/src/components/CanvasRenderer.tsx`, `/src/components/SVGPathEditor.tsx`
*   **Action:**
    1.  Ensure all occurrences of `dangerouslySetInnerHTML` are passed through the custom `sanitizeSVG()` or a `DOMPurify` sanitizer.
    2.  Check and sanitize user input vectors, custom descriptions, and SVG imports before injection into the editor.

### Task 1.4: Origin Containment (`postMessage` & CORS)
*   **Target Files:** `/src/App.tsx` (message listeners), `/server.ts`
*   **Action:**
    1.  Tighten message event listeners. Replace the permissive `.run.app` wildcard with an explicit whitelist of the current host (`window.location.origin`).
    2.  Configure CORS in `server.ts` to only authorize exact staging, production, and localhost workspace origins.

---

## 3. Phase 2: Navigation & Workspace Consolidation
*   **Focus:** Re-engineer `App.tsx`'s navigation router, converting 10 independent tabs into 4 workspaces and 1 drawer.

### Task 2.1: Navigation State Refactoring
*   **Target File:** `/src/App.tsx`
*   **Action:**
    1.  Redefine the `activeTab` state type to reflect the 4 consolidated Workspaces:
        ```typescript
        type WorkspaceType = 'sandbox' | 'workbench' | 'identity' | 'strategy';
        const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>('sandbox');
        ```
    2.  Establish sub-panel selection states inside each workspace view:
        *   `identitySubTab`: `'guidelines' | 'mockups' | 'collateral'` (defaults to `'guidelines'`)
        *   `workbenchSubTab`: `'sketch' | 'precision'` (defaults to `'sketch'`)
        *   `strategySubTab`: `'rivals' | 'sonic'` (defaults to `'rivals'`)

### Task 2.2: Redesigning the Navigation Bar
*   **Target File:** `/src/App.tsx`
*   **Action:**
    1.  Rebuild the main workspace header/sidebar. Replace the 10 tab buttons with 4 elegant, brand-themed buttons with icons (`Wand2`, `Hammer`, `BookOpen`, `LineChart`).
    2.  Create secondary horizontal sub-navigation selectors inside the respective Workspace sub-panels.

### Task 2.3: Collaboration Drawer Portal
*   **Target Files:** `/src/App.tsx`, `/src/components/CommentsSidebar.tsx` (new file if extracted)
*   **Action:**
    1.  Remove the "Comments" full-screen tab view.
    2.  Create a sliding slide-over drawer toggled via a persistent "Comments" floating action button (FAB) or corner icon. This drawer will overlay the viewport regardless of whether the user is inside Logo Sandbox or Vector Workbench.
    3.  Incorporate presence indicators (online count, cursor badges) in the header of the drawer.

---

## 4. Phase 3: Core Workspace Features Polish
*   **Focus:** Build robust user controls for logo generations, history states, and AI integration.

### Task 3.1: Logo Sandbox History Stack
*   **Target Files:** `/src/store.ts`, `/src/App.tsx`
*   **Action:**
    1.  Enhance the Zustand project schema to store an array of logo generation history cards:
        ```typescript
        type LogoHistoryItem = { id: string; url: string; prompt: string; timestamp: string };
        ```
    2.  Implement a visual carousel component under the active logo. Each card shows a thumbnail of past logos. Clicking a thumbnail activates it; clicking "Revert" updates the main project logo.

### Task 3.2: Variation & Suggestion Panel
*   **Target Files:** `/src/App.tsx`, `/src/services/geminiService.ts`
*   **Action:**
    1.  Build an "Interactive Refinement Toolbar" with quick-append prompts (e.g., "Add metallic gradient", "Make more corporate").
    2.  Connect the 'Generate Variation' button we implemented to a customizable temperature slider, allowing users to control how drastically the brand variations diverge from the original concept.

### Task 3.3: Raster-to-Vector (R2V) Extraction
*   **Target Files:** `/src/components/SVGPathEditor.tsx`, `/src/utils/vectorizer.ts` (new helper)
*   **Action:**
    1.  Incorporate a tracing script (e.g. basic outline tracing or client-side SVG node edge scanner).
    2.  Provide a "Vectorize Brand Logo" action. It will process the active AI-generated PNG (`logoUrl`), convert the boundaries into a series of SVG `<path>` vectors, and load them into the Workbench scene graph so the user can immediately edit coordinate nodes.

---

## 5. Phase 4: Canvas & Auditory Refinement
*   **Focus:** Elevate precision drawing, smooth strokes, and synthesize advanced auditory brand signatures.

### Task 4.1: Quadratic Bezier Stroke Smoothing
*   **Target File:** `/src/components/WhiteboardCanvas.tsx`
*   **Action:**
    1.  Refactor drawing input capture. Apply Ramer-Douglas-Peucker (RDP) path simplification as the mouse coordinates accumulate to reduce noisy path node density.
    2.  Convert raw segmented line segments into smooth quadratic Bezier strings (`M x y Q cx cy, x2 y2`), ensuring the whiteboard drawing looks smooth and professional.

### Task 4.2: Interactive Vector Handles
*   **Target File:** `/src/components/SVGPathEditor.tsx`
*   **Action:**
    1.  Add mouse-based vertex interactors. Clicking on an SVG shape in the editor outlines it and places tiny interactive circles (handles) over its vertex coordinates.
    2.  Wire dragging handlers to translate vertex handle coordinate deltas directly into the SVG path's parameter table, providing a true visual vector-editing environment.

### Task 4.3: Polyphonic Web Audio Synthesizer with ADSR Envelope
*   **Target File:** `/src/App.tsx` (Sonic section)
*   **Action:**
    1.  Upgrade the primitive monophonic audio oscillator. Implement an ADSR (Attack, Decay, Sustain, Release) envelope controller.
    2.  Add a polyphonic voice manager using multiple concurrent GainNodes, allowing the synthesizer to play corporate chords or complex arpeggiated motifs instead of monophonic beep sequences.
    3.  Create instrument wave presets (Sine/Corporate Bell, Triangle/Warm Pad, Square/8-Bit retro).

---

## 6. Phase 5: Output, PDF Exports & Verification
*   **Focus:** Implement multi-page brand exports, CSS blend mockups, and run full test/build verification.

### Task 5.1: High-Fidelity CSS Blend Mockups
*   **Target File:** `/src/App.tsx` (Mockups section)
*   **Action:**
    1.  Apply realistic visual blends to mockups. Instead of flat absolute placements, wrap mockups in containers using:
        *   `mix-blend-mode: multiply` (for dark logos on textured paper) or `mix-blend-mode: screen` (for glowing logos on screens).
        *   CSS 3D transforms (`perspective`, `rotateX`, `rotateY`, `scale`) to project the logo onto mockup angles (e.g., skewed business cards or tilted signage).

### Task 5.2: Multi-Page PDF Exporter
*   **Target Files:** `/src/utils/pdfExport.ts`, `/src/App.tsx`
*   **Action:**
    1.  Rebuild the PDF export mechanism to produce structured, multi-page brand guideline documents:
        *   **Page 1:** High-impact Cover Slide (using deep brand background and Comfortaa headings).
        *   **Page 2:** Brand Mission, Core Values, and Voice analysis.
        *   **Page 3:** Visual guidelines featuring typography samples and color swatches with hex, RGB, and CMYK listings.
        *   **Page 4:** Mockup application highlights.

### Task 5.3: Strict Build & Verification Checks
*   **Action:**
    1.  Run the application linter (`npm run lint` or `tsc --noEmit`) to verify no syntax errors or missing property definitions exist across any file.
    2.  Execute full production bundle compilation via `npm run build` to confirm everything builds and transpiles correctly.

---

## 7. Developer Checklist & Quality Gates

Ensure every phase is checked against these three standard metrics before proceeding:

1.  **Strict Lint Compliance:** No type-safety bypasses (`any` should be avoided where possible, use explicit typings in `src/types.ts`).
2.  **No Performance Regression:** Throttled event triggers on WebSocket nodes and memoized canvas updates.
3.  **Cross-Device Responsiveness:** Every consolidated workspace must resize gracefully down to mobile views, mapping components into fluid panels.
