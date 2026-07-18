---
title: "SVG Editor Enhancements & Primary Supabase Database Migration"
date: 2026-07-18
author: "Ibrahim"
featureId: "feat-svg-db-upgrades"
status: "Planned"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# SVG Editor Enhancements & Primary Supabase Database Migration

## Summary
Implement major upgrades to the SVG Path Editor including responsive square canvas sizing, auto viewBox synchronization, drawing board element selection, nodes/reshape dragging, and transition/redirection bridge from Whiteboard. Also transition primary database functionality to Supabase to prevent Firestore daily limit blocks.

## Plan
- **Step 1: SVG Editor Canvas & Grid Fixes**
  - Update coordinate canvas and brush drawing canvas layout dimensions to `w-[70vh] h-[70vh] max-w-full max-h-full mx-auto` under fullscreen to guarantee it remains a centered perfect square and fits fully on laptop/desktop viewports without scrolling.
  - Automatically parse `viewBox` width/height from loaded `actualSvgSource` in `useEffect` and set the `gridSize` state accordingly, ensuring the visual grid system and cursor coordinates always map perfectly to the actual dimensions of the SVG (e.g. 800x800).
- **Step 2: Interactive Reshape & Move on Draw Canvas**
  - Add a 5th tool `select` (labeled "Reshape") to the drawing sub-tools grid in the Touch Draw Board.
  - Implement path element selection using Euclidean distance to coordinate tokens on canvas click.
  - Render draggable anchor circles of the selected path on the drawing canvas so users can move control points and see handles directly on the Draw Board.
  - Handle translation dragging of the entire path layer when clicking and dragging on the background.
- **Step 3: Bi-directional Bridge from Whiteboard**
  - Add a callback prop `onRedirectToPrecision` to the WhiteboardCanvas component.
  - When sending a whiteboard element to the SVG Editor, display a modern interactive toast/pop-up prompting the user with an option: "Go to Editor →".
  - Bind the click action to trigger `onRedirectToPrecision`, bringing the user directly to the SVG Editor sub-tab.
- **Step 4: Primary Supabase Database Migration**
  - Implement a `primaryDatabase` option in AppSettings with choices: `'firestore' | 'supabase'`.
  - Add a visual selector for "Primary Cloud Database" in the Settings view under the database section.
  - Add `/api/backup/supabase/load` POST endpoint in `backupRouter.ts` to fetch all projects of a user from Supabase.
  - Add `loadProjectsFromSupabase` client helper in `src/utils/dbBackupClient.ts`.
  - Update `loadProjects` and `setUser` in `src/store.ts` to fetch and load projects directly from Supabase when it is configured as the primary store.
  - Gracefully bypass Firestore quota exception throwing when Supabase is primary, ensuring smooth offline-first backup sync to Firestore without blocking the application.
- **Acceptance Criteria**:
  - The SVG drawing and coordinate canvases are bounded beautifully, remaining perfectly square.
  - Grid scales synchronize dynamically with viewBox dimensions (no coordinate offsets).
  - Selected whiteboard elements can trigger a direct click-to-redirect action into the SVG Editor.
  - Reshape tool allows selecting elements and dragging nodes directly on the draw board.
  - Settings allows choosing Supabase as the primary cloud database, which successfully reads/writes directly from/to Supabase.

## Implementation Notes
- Files to modify:
  - `src/components/SVGPathEditor.tsx`
  - `src/components/WhiteboardCanvas.tsx`
  - `src/views/Studio.tsx`
  - `src/server/backupRouter.ts`
  - `src/utils/dbBackupClient.ts`
  - `src/store.ts`
  - `src/views/Settings.tsx`
- Persistence contract:
  - Keep payloadHash and schemaVersion in place.
  - If `primaryDatabase` is Supabase, perform write actions directly to Supabase and keep Firestore as a fail-safe secondary write.

## Verification Steps
1. Perform compile and lint verification after modifications.
2. Confirm no compilation errors.
3. Verify feature parity of database sync.
