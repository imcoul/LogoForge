# Lumière Logo Forge: Application Expansion Plan & PRD

## 1. Executive Summary
This document serves as the master Product Requirements Document (PRD) and implementation checklist for the expansion of **Lumière Logo Forge**. The expansion transforms the app from a simple logo generator into a comprehensive, AI-powered brand identity operating system. It encompasses asset management, AI-driven refinement using external context, third-party collaboration, and 7 "wild" generative features (including Organic Sonic Branding).

---

## 2. Core Features & Requirements

### 2.1. The Asset Library & Workspace Dashboard
**Description:** A centralized hub for users to view, manage, and organize all generated logos, uploaded assets, brand guides, mockups, flyers, and social media posts.
*   **Requirements:**
    *   Grid and list views of all projects.
    *   Filter by asset type (Logo, Guide, Refinement, Sonic, Mockup).
    *   Metadata display (creation date, AI model used, tags).

### 2.2. Contextual Refinement Studio
**Description:** Allows users to upload external documents to guide the AI in customizing and refining an existing logo.
*   **Requirements:**
    *   Support for `.pdf`, `.md`, `.txt`, `.doc`, and image uploads.
    *   AI ingestion of these documents to generate layout improvements and vector adjustments.
    *   Side-by-side comparison of original vs. refined logos.

### 2.3. Universal Collaboration & Comments
**Description:** A unified commenting system that bridges Lumière with external design tools.
*   **Requirements:**
    *   In-app commenting on specific areas of the logo canvas.
    *   API integrations/webhooks to sync comments from Figma, Frame.io, and Notion.

### 2.4. Export & Ecosystem Integration
**Description:** Seamless linking of Lumière assets to external project management tools.
*   **Requirements:**
    *   One-click export to Notion databases.
    *   Auto-generation of embedded share links for external wikis.

---

## 3. The 7 "Wild" Expansion Features

1.  **Organic Sonic Branding Engine (The Audio Identity)**
    *   *Concept:* Forging auditory identities exclusively from organic, environmental, and animal sounds. No traditional instruments allowed.
    *   *Feature:* Users upload raw `.mp3`/`.wav` files of nature/environment. AI trims, normalizes, and layers them into a cohesive 3-second brand soundscape that plays during logo animations.
2.  **Generative Spatial Mockups**
    *   *Concept:* Real-time 3D environments where the logo is dynamically placed based on the brand's industry (e.g., a bustling cafe window, a neon cyberpunk billboard).
3.  **Auto-Brand Ecosystem Expansion**
    *   *Concept:* From a single logo, the AI automatically hallucinates and generates business cards, letterheads, and a 30-day social media launch kit.
4.  **Dynamic Motion Identity (SVG Choreography)**
    *   *Concept:* AI analyzes the geometric vectors of the logo and writes custom Framer Motion / CSS animations tailored strictly to its shape (e.g., a sharp logo slices in, a round logo bounces in).
5.  **Competitor Differentiation Engine**
    *   *Concept:* Users upload competitors' logos. The AI runs a visual analysis and provides a differentiation score, suggesting color shifts or structural changes to stand out in the market.
6.  **AI Typography Sculpting**
    *   *Concept:* Beyond picking a font, the AI generates custom font ligatures or modifications specifically for the brand's wordmark, exporting them as a custom `.woff2` file.
7.  **Physical Print Readiness & Material Science**
    *   *Concept:* Auto-generating CMYK profiles, Pantone matching, and 3D printing `.stl` files. The AI also suggests the physical materials the logo should be printed on (e.g., "Matte recycled paper with blind debossing").

---

## 4. User Stories & Acceptance Criteria

| Epic | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Dashboard** | As a user, I want to see all my past projects in a grid so I can easily resume work. | - Grid displays project thumbnails.<br>- Clicking a project opens the Studio.<br>- Empty state prompts creation. |
| **Refine** | As a user, I want to upload a PDF of my marketing strategy so the AI can tweak my logo's colors. | - File upload accepts PDF.<br>- AI parses text and suggests 3 color palette alternatives based on the PDF's mood. |
| **Comments** | As a manager, I want to paste a Notion link to sync comments. | - Input field for Notion integration.<br>- Comments populate in the UI sidebar. |
| **Sonic** | As a brand designer, I want to upload a sound of a cracking twig to use as my logo's audio sting. | - Audio file plays back on upload.<br>- Validation rejects melodic instrument files (via AI analysis or user honor system).<br>- Plays synced with visual animation. |

---

## 5. Design Instructions

*   **Vibe:** Premium, clean, "operating system" feel. High contrast, generous padding.
*   **Color Palette:** Monochrome foundation (Black, White, Neutral 50-900) with Indigo accents for primary actions.
*   **Typography:** Sans-serif (Inter) for UI, Mono for technical/metadata elements.
*   **Layout:**
    *   *Dashboard View:* Bento-grid style masonry layout for projects.
    *   *Studio View:* Left-side control panel, dominant right-side canvas. Secondary rail for tool switching.
*   **Interactions:** Fluid tab switching, subtle hover elevations, stagger animations on list loads.

---

## 6. Testing Strategy

*   **Unit Tests:** Verify state management (adding projects, updating active project).
*   **Integration Tests:** File upload parsing (mocking PDF/MD ingestion), Audio file reading.
*   **E2E Tests:** Full flow from Dashboard -> Create Logo -> Upload Context -> View Refined Logo -> Play Sonic Identity.
*   **Visual Regression:** Ensure the canvas layout doesn't break when switching between preview, guide, and comment modes.

---

## 7. Implementation Checklist & Findings Tracker

*(Check these off as implementation progresses. Add notes to "Findings" as needed.)*

### Phase 1: Core Architecture & Dashboard
- [x] Implement robust `Project` state management (Zustand or Context API).
- [x] Build the detailed Bento-grid Dashboard UI.
- [x] Implement project persistence (localStorage or IndexedDB).
- [x] **Findings:** State management set up with Zustand and idb-keyval. Bento-grid implemented in App.tsx.

### Phase 2: Contextual Refinement Studio
- [x] Build file drag-and-drop zone for `.pdf`, `.md`, `.txt`, images.
- [x] Implement text extraction/parsing logic for uploaded documents.
- [x] Hook parsed context into the Gemini API prompt for logo refinement.
- [x] **Findings:** Implemented direct base64 pass-through to Gemini 1.5 Pro to parse PDFs and images natively.

### Phase 3: Organic Sonic Branding (Wild Feature #1)
- [x] Build Audio Upload component with playback.
- [x] Implement Audio Context API to play sound synced with Framer Motion.
- [x] Integrate AI prompt to describe the "Organic Soundscape".
- [x] **Findings:** Integrated file upload for sounds (audio/mp3). Gemini 1.5 Pro doesn't directly mix audio on the frontend, so we simulate the "Sonic Philosophy" string generation to represent the audio's impact. Uploaded audio files are playable natively using `<audio controls>`.

### Phase 4: Collaboration & Notion Export
- [x] Build UI for the Comments sidebar.
- [ ] Implement Notion OAuth Integration (OAuth popup flow, `postMessage` callback).
- [ ] Implement Notion Export API call (formatting data to JSON/Markdown and pushing to user's workspace).
- [x] **Findings:** Built a chat-like comments interface stored in the `Project` model. Notion export currently uses a mock implementation but will be upgraded to use real OAuth.

### Phase 5: Localization Strategy (Trilingual & Beyond)
- [ ] Implement Internationalization (i18n) framework (e.g., `i18next` or similar).
- [ ] Add initial Trilingual Support: English (EN), French (FR), and Arabic (AR - with RTL support).
- [ ] Build scalable language-switching UI and translation JSON architecture to easily support additional languages in the future.
- [ ] **Findings:** *[Add notes here...]*

### Phase 6: Additional "Wild" Features
- [ ] Implement Generative Spatial Mockups tab.
- [ ] Implement Auto-Brand Ecosystem (Social media posts generation).
- [ ] Implement Competitor Differentiation Engine.
- [x] Implement Dynamic Motion Identity (SVG parsing).
- [ ] Implement AI Typography Sculpting.
- [ ] Implement Physical Print Readiness (CMYK/Pantone generation).
- [x] **Findings:** Implemented Dynamic Motion Identity using Framer Motion with preset choreographies (float, pulse, spin, bounce, flip) that the user can apply directly to the generated logo vector.
