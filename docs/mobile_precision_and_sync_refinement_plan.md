# Mobile Precision & Sync Refinement Plan

> **Goal:** Introduce advanced mobile precision tools, multi-touch gestures, and high-frequency synchronization refinements to make Forgel's vector and whiteboard canvases ultra-responsive and seamless on mobile viewports.
> 
> **Status: Completed & Verified.** Long-press nudges, multitouch gesture chords (2/3-finger taps for undo/redo), pinch-to-zoom, and throttled cloud synchronizations have been successfully implemented.

---

## 1. Feature 1: Mobile Precision UX Overlay (Completed)
*   **Task 1.1: Long-Press & Hold Nudges:** Enhanced `<PrecisionOverlay />` to support continuous nudging.
*   **Task 1.2: Integrated Whiteboard Nudges:** Mounted `<PrecisionOverlay />` in `WhiteboardCanvas.tsx` for shape manipulation.
*   **Findings:** The D-pad overlay significantly boosts micro-precision for mobile users where standard drag-and-drop is too imprecise.

---

## 2. Feature 2: Multitouch Gesture Chords (Completed)
*   **Task 2.1: Double-Finger Tap for Undo:** Listen for touch events inside `WhiteboardCanvas` and `SVGPathEditor`. If a two-finger touch tap is detected, trigger the local or global `undo()` action.
*   **Task 2.2: Triple-Finger Tap for Redo:** If a three-finger touch tap is detected, trigger the `redo()` action.
*   **Task 2.3: Pinch-to-Zoom & Two-Finger Pan:** Viewport zooming and panning on mobile implemented.
*   **Findings:** Multi-finger chords provide an intuitive, fluid replacement for traditional command+Z keyboard shortcuts.

---

## 3. Feature 3: High-Frequency Sync Stutter Mitigation (Completed)
*   **Task 3.1: Throttled State Sync:** In `src/store.ts` and `WhiteboardCanvas.tsx`, replaced immediate Firestore and Supabase document writes during active dragging or brush drawing with a `throttleCloud` flag.
*   **Task 3.2: Batch MouseUp commits:** Local reactive state updates seamlessly during drag, pushing to Firestore and Supabase only upon `pointerUp`.
*   **Findings:** The debouncing logic successfully halted the 60fps frame rate stutters, but is insufficient for true real-time, low-latency co-editing.

---

## 4. Feature 4: Layer Locking & Co-Editor Status (Completed)
*   **Task 4.1: Element Locking Toggle:** Support a `locked?: boolean` flag on scene graph nodes and whiteboard sketches.
*   **Task 4.2: Connection Status & co-editors Counter:** Rendered a highly polished real-time synchronization state badge.

---

## 5. NEW: Next-Generation Sync Improvements (Pending Implementation)

While debouncing network writes (`throttleCloud`) solved local frame stutter, true multi-user real-time collaboration needs the following advanced sync structures:

*   **Ephemeral "Ghost" State vs. Durable State:** Separate the sync into two layers.
    *   **Layer 1 (WebSocket/WebRTC):** When User A drags a node, send tiny, ephemeral UDP-like coordinate updates over WebSockets. Co-editors see a translucent "ghost" of the node moving in real-time.
    *   **Layer 2 (Firestore/Supabase):** Only write the final, committed path to Firestore/Supabase on touchEnd or mouseUp. This gives the illusion of 60fps real-time collaboration without the database cost.
*   **CRDTs (Conflict-Free Replicated Data Types):** Instead of "Last Write Wins" where two users editing different parts of the same SVG might overwrite each other, implement a CRDT structure (like Yjs). This allows concurrent, surgical edits (User A edits Node 1, User B edits Node 5) to merge mathematically perfectly without locking the whole file.
*   **Delta Payloads:** Currently, the entire SVG string or node array is synchronized. Calculate the delta (e.g., `[UPDATE, path_2, node_4, x: 150, y: 200]`) and broadcast only the mutation over the network.
*   **Optimistic UI with Rollback:** The UI should instantly reflect local changes while flagging them as "syncing." If the WebSocket drops or the server (Firestore/Supabase) rejects the move due to a conflict, the UI gracefully interpolates back to the server-verified state, ensuring the interface never feels frozen.

---

## 6. Prioritized Roadmap & Verification (Updated)

| Module | Refinement | Status | Verification Method |
|---|---|---|---|
| UX | Continuous Nudges | Verified | Hold D-Pad buttons for smooth continuous movement |
| UX | Whiteboard Integration | Verified | Nudge selected shapes using touch control pad |
| Gestures | Double/Triple Finger Chords | Verified | Tap with 2 fingers to Undo, 3 fingers to Redo |
| Performance | Throttled Save Engine | Verified | Measure network writes to Firestore/Supabase; confirm non-blocking drag |
| **New (Network)** | **Ephemeral Ghost State** | **Pending** | **Verify WebSocket sends temporary coords, DB gets final coord** |
| **New (UX)** | **Contextual Floating Menus** | **Pending** | **Hold on a node to see circular quick actions popup** |
