# Forgel — Exhaustive Feature Analysis & Product Requirement Document (PRD)

This document contains a professional, deep-dive analysis of Forgel's entire application architecture, covering every user-facing tab and system module. It details tab consolidation strategies, lists current bugs and user friction points, and establishes a comprehensive Product Requirement Document (PRD) for the next stage of engineering.

---

## 1. Feature Map & Current Tab Architecture

Currently, Forgel has **10 independent tabs** in its design workspace. This wide tab-bar creates significant cognitive overhead, divides the user interface into isolated bubbles, and disrupts the flow of brand generation and vector editing.

| Tab / Panel | Current Purpose | Core Sub-Components |
|:---|:---|:---|
| **1. Preview** | Core logo generator & output presentation. Displays the logo image and variations. | `App.tsx` (Preview wrapper), `Wand2` placeholder, `generateLogoImage` service. |
| **2. Draw** | Collaborative whiteboard sketch editor with shapes, brush tool, and sticky notes. | `WhiteboardCanvas.tsx`, `WhiteboardToolbar.tsx`, `ws` sync logic. |
| **3. Precision** | Direct SVG path coordinator and raw XML node manipulator. | `SVGPathEditor.tsx`, `SVGPathEditor` controllers, path list. |
| **4. Refine** | Suggests specific prompt-based logo modifications and applies them. | `App.tsx` (Refinement cards), `analyzeRefinementContext`, `isRefining` states. |
| **5. Guide** | The Brand Guide Architect. Outlines core colors, fonts, values, and copy. | `App.tsx` (BrandGuide renderer), `pdfExport.ts`, markdown templates. |
| **6. Mockups** | Places the logo on virtual business cards, billboards, and mobile interfaces. | `App.tsx` (Mockups view), static base64 layout mockups, overlay positioning. |
| **7. Ecosystem** | Generates web and print assets (letterheads, social headers) from the Brand Guide. | `App.tsx` (Ecosystem asset list), `generateEcosystemAsset` service. |
| **8. Competitor** | Grid-based matrix comparing user branding parameters with rival brands. | `App.tsx` (Competitor grid), `analyzeCompetitor` service. |
| **9. Sonic** | Generates auditory guidelines, plays synthesized brand motifs, maps acoustic profiles. | `App.tsx` (Sonic philosophy board), Web Audio API synthesizers. |
| **10. Comments** | Separate full-screen area for text chat and real-time collaboration threads. | `App.tsx` (Comments sidebar / list), WebSocket commentary stream. |

---

## 2. Page & Workspace Consolidation Strategy

Having 10 separate top-level tabs is an anti-pattern for a professional design suite. By grouping highly related concepts, we can compress the workspace into **4 integrated, high-context Workspaces** and **1 overlay Utility Panel**.

```
                           [ FORGEL WORKSPACE NAVIGATION ]
  ┌───────────────────────┬────────────────────────┬────────────────────────┬──────────────────────┐
  │  1. LOGO SANDBOX      │   2. VECTOR WORKBENCH  │   3. IDENTITY PORTAL   │  4. STRATEGY CENTRE  │
  │ (Preview, AI Refine)  │   (Draw & Precision)   │ (Guide, Mockup, Eco)   │ (Sonic, Competitor)  │
  └───────────────────────┴────────────────────────┴────────────────────────┴──────────────────────┘
                                                                       ┌───────────────────────────┐
                                                                       │ COMMENTARY & COLLAB PANEL │
                                                                       │ (Persistent Drawer/Slide) │
                                                                       └───────────────────────────┘
```

### Workspace 1: Logo Sandbox (Consolidation of Preview & Refine)
*   **Concept:** The starting point of any project. The central area displays the active logo, and a side-drawer or expandable sidebar contains the AI prompt console, history trail, and prompt suggestion/refinement cards.
*   **User Flow Integration:** The user writes a prompt on the left, clicks generate, views the logo in the center, and can instantly click refinement cards or trigger variations without flipping tabs.

### Workspace 2: Vector Workbench (Consolidation of Draw & Precision)
*   **Concept:** A single, unified vector editing environment. It features a main canvas that has a toggle: **Freeform Sketching (Whiteboard)** and **Manual Precision (SVG Node Editor)**.
*   **User Flow Integration:** Users can sketch freeform shapes on the whiteboard, select paths, and open the "Precision Panel" on the right to edit coordinate nodes directly or lock coordinates for perfect symmetry. It brings manual vector curation under one hood.

### Workspace 3: Identity Portal (Consolidation of Guide, Mockups, & Ecosystem)
*   **Concept:** The "output directory" for the generated brand. It has three tabs within it:
    1.  **Brand Guidelines:** The typography, colors, and design values.
    2.  **Context Previews (Mockups):** Live overlays of the brand colors and logo on real-world items.
    3.  **Marketing Kit (Ecosystem):** Dynamic asset generators (social posts, business cards, letterheads) driven directly by the guidelines.
*   **User Flow Integration:** Keeps the guidelines, their immediate mockup applications, and downstream export packages tightly grouped. Changing a color in Guidelines dynamically updates the mockups and collateral in real-time.

### Workspace 4: Strategy Centre (Consolidation of Competitor & Sonic)
*   **Concept:** The advanced positioning tools of the brand. It unites visual competitor analysis and sonic/sensory guidelines.
*   **User Flow Integration:** This workspace contains the **Acoustic Profiler (Sonic)** and the **Market Differentiation Grid (Competitor)**, allowing the user to design the non-visual and competitive boundaries of the brand identity side-by-side.

### Persistent Utility: Collaboration & Comments Panel (Consolidation of Comments)
*   **Concept:** Comments are removed from the full-screen navigation entirely. Instead, they are housed in a sliding, high-performance **Collab Drawer** that can be opened on top of *any* active workspace.
*   **User Flow Integration:** Users can chat and place comment markers on a logo while they are inside the Vector Workbench or Strategy Centre, matching real-world collaborative behaviors (Figma, Miro).

---

## 3. Exhaustive Feature Review: Friction Points & Bugs

This section details what is currently broken, structurally weak, or has high user friction in every feature of the repository.

### Feature 1: Core Logo Generator & Preview
*   **Friction Points & Bugs:**
    1.  **No Regeneration Controls:** The logo generation overrides the project's main image directly. If a user likes a generation but wants to try another, they must manual-duplicate projects to avoid overwriting.
    2.  **Lack of Image Format Options:** The system generates PNGs from the AI and falls back to manual SVGs, but there is no native conversion from the generated PNG image to editable SVG paths for the precision editor.
    3.  **Missing Aspect Ratio Safeguards:** Uploaded images of non-square aspect ratios can get squished in the round preview card.

### Feature 2: Collaborative Whiteboard (Draw Tab)
*   **Friction Points & Bugs:**
    1.  **High-Frequency Sync Stutter:** Drawing with the brush tool generates high-frequency WebSocket frames. Without debounce or throttling, this floods the connection, leading to mouse stutters and browser lag for co-editors.
    2.  **No Element Locking:** There is no server-authoritative element locking. If two users edit the same sticky note or drag the same shape, the last-write-wins model causes abrupt overwriting without warning.
    3.  **Jagged Brush Strokes:** No Bezier smoothing or path simplification is applied to freehand paths. Drawing looks extremely pixelated and amateurish.

### Feature 3: Precision Vector Editor (Precision Tab)
*   **Friction Points & Bugs:**
    1.  **Tedious Direct Coordinate Typing:** There is no mouse-based "node selection." Users must modify numeric inputs or edit raw XML lists, which completely breaks the intuitive flow of vector editing.
    2.  **Disconnection from AI Output:** The precision editor operates on standard template shapes or custom path arrays stored in the local scene graph. The core AI-generated logo (`logoUrl` image) is entirely disconnected; users cannot click a generated logo to extract and edit its path nodes.
    3.  **No Path Layer Grouping:** SVG elements are rendered in a flat list. There is no grouping, layering, or z-index reordering control.

### Feature 4: AI Refinement Studio (Refine Tab)
*   **Friction Points & Bugs:**
    1.  **Static suggestions:** Suggestions are often general and repetitive, lacking rich, context-aware analysis of what the logo actually contains.
    2.  **No Partial Applier:** Refinements are "all-or-nothing." The user cannot choose to apply only the color suggestion or only the layout suggestion; clicking "Refine" regenerates the entire prompt and image.

### Feature 5: Brand Architect & Guide (Guide Tab)
*   **Friction Points & Bugs:**
    1.  **Unreliable PDF Export:** The PDF export falls back to standard Markdown file downloads because of missing CSS print-sheets or rendering errors when compiling complex DOM structures to Canvas.
    2.  **Color Sync Lag:** Modifying hex colors in the brand guide does not update mockups or other tabs immediately because color variables are not centralized in the global Zustand state.

### Feature 6: Real-World Previews (Mockups Tab)
*   **Friction Points & Bugs:**
    1.  **Flat, Unrealistic Overlays:** The logo is layered flat on top of mockups with simple absolute positioning. There is no skewing, perspective distortion, or texture/lighting blending, making mockups look like simple overlay stickers rather than photorealistic assets.
    2.  **Static Mockup Library:** The list of mockups is hardcoded and cannot be expanded by importing custom background files.

### Feature 7: Auto-Brand Ecosystem (Ecosystem Tab)
*   **Friction Points & Bugs:**
    1.  **Limited Asset Layouts:** Social kit generators output a static set of banner designs. Users cannot move text, resize components, or change template proportions.
    2.  **No Bulk Download:** Users must download each ecosystem asset individually, which is highly repetitive and annoying.

### Feature 8: Competitor Differentiation (Competitor Tab)
*   **Friction Points & Bugs:**
    1.  **No Competitor Asset Upload:** Users can only type textual summaries of competitors. They cannot upload rival logo images for side-by-side visual and color-palette comparisons.
    2.  **Static Metric Ratings:** The competitive ratings grid is fully manual and does not use the Gemini vision model to auto-rate rival designs based on uploaded visual assets.

### Feature 9: Sonic Branding (Sonic Tab)
*   **Friction Points & Bugs:**
    1.  **Monophonic Web Audio Synth:** The built-in acoustic synthesizer uses a basic monophonic oscillator. Motif patterns sound like high-pitched retro beeps rather than modern corporate audio signatures.
    2.  **Silent State Block:** The synthesizer can crash silently if the browser blocks the AudioContext (requires explicit user interaction state guards).

### Feature 10: Comments & Collaboration (Comments Tab)
*   **Friction Points & Bugs:**
    1.  **Full-Screen Disconnect:** Because comments are placed in a standalone tab, users cannot see comments while editing on the whiteboard or precision editor.
    2.  **No Anchor Pins:** Comments cannot be pinned to specific coordinate coordinates on the logo canvas or whiteboard. They are simple, flat text messages.

---

## 4. Product Requirement Document (PRD) for Feature Refinement

This section details the explicit functional requirements, technical specifications, and UI layouts to polish and refine each feature.

---

### PRD Module 1: The Unified Logo Sandbox
*   **Goal:** Provide an integrated, powerful generation, variation, and refinement workspace.

#### Functional Requirements
1.  **Regeneration & Variation History Stack:**
    *   Maintain a visual carousel or history sidebar of every generated logo image under the current project.
    *   Enable users to "star" a favorite version and revert the active project logo to any historical variation.
2.  **Interactive Prompt Refiner:**
    *   Provide a panel of "refinement tags" (e.g., "Add metallic gradient", "Make more corporate", "Simplify geometry"). Clicking a tag appends it to the prompt and triggers a smart refinement.
3.  **Variation Parameter:**
    *   Integrate a 'Generate Variation' slider/parameter that modifies the temperature and image prompt semantics to generate a highly distinct or subtly adjusted alternative design.

#### UI Specifications
*   **Layout:** Two-column grid.
    *   **Left Column (33%):** Generate console. Textarea for prompt input. Temperature/Variation slider. List of AI suggestions and refinement tags.
    *   **Right Column (67%):** Main presentation stage. Large visual representation of the active logo. Underneath, a horizontal scrolling list showing thumbnail cards of historical variations and parent-child variations.

---

### PRD Module 2: The Unified Vector Workbench
*   **Goal:** Combine freehand sketching and precision vector engineering into a seamless editor.

#### Functional Requirements
1.  **Dual Mode Toggle:**
    *   Provide a global switch: **[Freehand Canvas]** ↔ **[Precision Coordinate Panel]**.
2.  **Smooth Bezier Brush:**
    *   Apply Ramer-Douglas-Peucker (RDP) algorithm or quadratic Bezier fitting to freehand coordinates as the mouse is released to simplify dense path sets into clean, sleek curves.
3.  **Visual Anchor Selection:**
    *   Clicking a path on the canvas highlights its vertices with small circular handles. Dragging a handle updates the path coordinates in real-time.
4.  **Raster-to-Vector (R2V) Extraction (AI Integration):**
    *   Add a "Vectorize Generated Logo" utility. Use client-side edge-detection or an API helper to trace the generated logo PNG and push the resulting path array into the active Workbench scene graph, making the AI logo instantly editable!

#### UI Specifications
*   **Left Toolbar:** Action buttons (Select, Brush, Shapes, Sticky Note, Erase).
*   **Central Stage:** High-resolution SVG drawing canvas with custom grid coordinates.
*   **Right Inspector:**
    *   *Freehand Mode:* Layer selection, stroke width, brush color presets, element properties (transparency, blending modes).
    *   *Precision Mode:* Node coordinates table (Vertex X, Vertex Y list). Button to manually add curves (`C`), lines (`L`), or close path (`Z`).

---

### PRD Module 3: The Identity Portal & Dynamic Mockups
*   **Goal:** Group brand compliance, real-world context previews, and physical collateral exports together.

#### Functional Requirements
1.  **Dynamic Style Synchronization:**
    *   Color swatches, typographic selection, and logos changed under "Guidelines" must propagate instantly to all Mockups and Marketing Kit templates without manual reload.
2.  **Realistic Blending Mockups:**
    *   Configure mockups using CSS mix-blend-modes (e.g., `multiply`, `overlay`) and CSS transform matrixes (e.g., `skewX`, `rotate3d`) to warp the logo clean on stationery angles and make it merge with background textures.
3.  **Comprehensive PDF Exporter:**
    *   Use `jspdf` + `html2canvas` to compile the Brand Guidelines tab into a multi-page, formatted PDF featuring cover slides, typography lists, and high-fidelity swatches.

#### UI Specifications
*   **Sub-Navigation Bar:** [Guidelines] | [Live Mockups] | [Collateral Export].
*   **Guidelines View:** Color swatch grids with HEX copy, typography specimen sheets (Quicksand & Comfortaa specimens), and the core mission/voice markdown board.
*   **Live Mockups View:** A masonry grid of high-fidelity physical templates:
    *   Minimalist Business Card (Textured Slate / Raw Canvas)
    *   Mobile Splash Screen
    *   Street Banner / Billboard
*   **Collateral Export View:** List of generate cards (Business Card PNG, Letterhead PDF, Social Kit ZIP). Includes a single "Export All" button compiling a master brand delivery pack.

---

### PRD Module 4: The Strategy Centre
*   **Goal:** Elevate brand positioning via strategic analysis and sensory profiling.

#### Functional Requirements
1.  **Visual Competitor Comparison:**
    *   Support drag-and-drop uploads of rival logo files.
    *   Analyze uploaded rival logos using Gemini Vision to auto-extract color palettes and structural themes.
2.  **Polymorphic Sound Synthesizer:**
    *   Add a polyphonic sound synthesizer with editable wave-shaping filters (Sine, Triangle, Sawtooth, Square) and envelope controls (Attack, Decay, Sustain, Release - ADSR).
    *   Allow users to compose an auditory brand motif (a sequence of notes) and download it as an `.audio` or `.wav` trigger file.

#### UI Specifications
*   **Sub-Navigation:** [Competitor Rivals] | [Sonic Guidelines].
*   **Competitor Rivals View:** Two-column grid comparing "Our Brand" vs "Rival Brands" featuring:
    *   Visual swatches
    *   Semantic positioning graph (Brave vs Safe, Modern vs Traditional)
    *   Gemini-generated strategic advice card
*   **Sonic Guidelines View:** Synthesizer dashboard. Note grid sequencer where users can click notes to create a brand ringtone/motif. Includes synth knobs (ADSR and Filter Frequency).

---

### PRD Module 5: Sliding Collaboration Drawer
*   **Goal:** Support overlay chat, live notifications, and coordinate-anchored comment markers.

#### Functional Requirements
1.  **Overlay Sidebar Transition:**
    *   The collaboration drawer must slide in smoothly from the right side of the screen over any active Workspace.
2.  **Canvas-Anchored Comment Pins:**
    *   Enable users to double-click anywhere on the active Workspace canvas (Whiteboard or Logo Preview) to place a numbered coordinate pin and attach a comment thread directly to that location.
3.  **Presence Trackers:**
    *   A header bar showing active user avatar circles and green online status indicators.

#### UI Specifications
*   **Drawer Style:** Sliding panel (width: 380px) with high-contrast borders and backdrop filters.
*   **Header:** Real-time sync connection status indicator ("● Synchronized") and active editor count.
*   **Content List:** A chronological feed of comment cards, grouped by slide/canvas locations.
*   **Footer:** Input area with markdown shortcuts and send buttons.

---

## 5. Architectural & Security Guidelines

To ensure the consolidated application operates with absolute safety and performance:

1.  **Strict State Hydration:** Wrap all store loadings in a synchronized IndexedDB gate, preventing any layout flicker or missing data parameters on boot.
2.  **WebSocket Throttling:** Throttle custom brush drawing data to a maximum of 30 fps (33ms interval) before broadcast to eliminate network choke.
3.  **Secure postMessage Origin Limits:** Restrict all postMessage listeners to exact workspace deployment URLs and authorized domains.
4.  **Uniform Input Sanitation:** Route all user-created text and SVG feeds through `DOMPurify` before compiling into the DOM.
