# Real-time CRDT & Yjs Mapping Specification

This document defines the Conflict-free Replicated Data Type (CRDT) merge policies and Yjs document structures for Forgel. It outlines how the canonical `sceneGraph` maps to Yjs types, the handling of immutable metadata, and rules for concurrent state synchronization.

---

## 1. Yjs Document Mapping Hierarchy

To achieve fine-grained, real-time collaboration with minimum conflict overhead, the Forgel document is modeled as a nested hierarchical Yjs structure:

```
Y.Doc (Root Collaboration Context)
 └── "sceneGraph" ──► Y.Array (Array of Collaborative Nodes)
                       └── [Node Maps] ──► Y.Map (Representing each Node)
                                            ├── "id" (Y.Text or Static String)
                                            ├── "type" (Static String)
                                            ├── "name" (Y.Text for concurrent rename)
                                            ├── "style" ──► Y.Map (Style settings)
                                            ├── "meta" ──► Y.Map (Audit logs / Source / Trace parameters)
                                            ├── "points" ──► Y.Array (Coordinate Points Array)
                                            └── "pathD" ──► Y.Text (SVG Bezier commands)
```

### Mapping Code Representation

```typescript
import * as Y from 'yjs';

export function bindNodeToYMap(node: Node, ymap: Y.Map<any>) {
  // Static Immutable properties set once
  ymap.set('id', node.id);
  ymap.set('type', node.type);
  
  // Collaborative Text Properties
  const yName = new Y.Text(node.name);
  ymap.set('name', yName);
  
  // Styles Map
  const yStyle = new Y.Map<any>();
  Object.entries(node.style).forEach(([key, val]) => {
    yStyle.set(key, val);
  });
  ymap.set('style', yStyle);

  // Meta Map
  const yMeta = new Y.Map<any>();
  Object.entries(node.meta).forEach(([key, val]) => {
    if (typeof val === 'object') {
      yMeta.set(key, JSON.stringify(val));
    } else {
      yMeta.set(key, val);
    }
  });
  ymap.set('meta', yMeta);

  // Positional properties
  ymap.set('x', node.x);
  ymap.set('y', node.y);
  if (node.width !== undefined) ymap.set('width', node.width);
  if (node.height !== undefined) ymap.set('height', node.height);
  if (node.radius !== undefined) ymap.set('radius', node.radius);

  // Points Array
  if (node.points) {
    const yPoints = new Y.Array<Point2D>();
    yPoints.push(node.points);
    ymap.set('points', yPoints);
  }

  // Path Commands
  if (node.pathD) {
    const yPathD = new Y.Text(node.pathD);
    ymap.set('pathD', yPathD);
  }
}
```

---

## 2. Field Mutability & Conflict Resolution Rules

To prevent state drift, fields inside a collaborative node are divided into **immutable fields** (which cannot be changed after creation) and **mutable collaborative fields** (which use Yjs's built-in resolution logic).

| Field Path | Mutability | CRDT Type | Merge Strategy & Resolution Rule |
|---|---|---|---|
| `node.id` | **Immutable** | `string` | Read-only. Assigned at node instantiation. Unchangeable. |
| `node.type` | **Immutable** | `string` | Read-only. Defines renderer strategy. Unchangeable. |
| `node.name` | **Mutable** | `Y.Text` | Character-level merge using Yjs linear editing logic (LWW). |
| `node.x` / `node.y` | **Mutable** | `number` | Last-Write-Wins (LWW). Registered on coordinate commit. |
| `node.style.*` | **Mutable** | `Y.Map` | Key-level Last-Write-Wins. Simultaneous edits to different style keys merge smoothly. |
| `node.points` | **Mutable** | `Y.Array` | Item-level collaborative list merge. Prevents stroke slicing during drawing. |
| `node.pathD` | **Mutable** | `Y.Text` | Segment-level character merge. If nodes are dragged concurrently, coordinates are resolved via LWW. |

### Handling Concurrent Modifications (The Bi-directional Bridge)

When a user modifies a node on the **Whiteboard** and another user modifies the same node inside the **SVG Editor** concurrently, the following rules apply:
1.  **Coordinate Shifts**: If one client moves the object container bounding box (`node.x`, `node.y`) while another modifies the bezier path data (`node.pathD`), both changes merge cleanly (the node keeps its new shape and translates to its new location).
2.  **Structural Transforms**: If both clients edit `node.pathD` concurrently:
    *   Yjs merges the changes as collaborative text.
    *   To prevent malformed SVG command commands, if the resulting merged XML/string fails validation checks, the editor automatically rolls back to the immediate preceding healthy snapshot state from `sceneHistory`.

---

## 3. Offloading Binary Blobs (Image Assets)

To maintain maximum performance and low memory footprints on low-end mobile devices, **never embed raw binary data** (such as PNG/JPEG base64 bytes) inside Yjs arrays or firestore document models.

### Offload Strategy:
1.  **Object Storage:** Large files are uploaded to an external secure asset bucket (Cloud Storage).
2.  **Referential Linking:** The file upload handler returns a secure, signed URL token.
3.  **Referential Reference Node:** A new node of type `'image'` is pushed to the CRDT scene graph, setting the `imageRef` key to the storage URL:
    ```json
    {
      "id": "node-img-45a9",
      "type": "image",
      "imageRef": "https://storage.googleapis.com/forgel-brand-assets/usr-99/img_77123.png",
      "x": 200,
      "y": 150,
      "width": 250,
      "height": 250
    }
    ```
4.  **Local Memory Hydration:** When peer clients receive the referential node, their local renderer asynchronously resolves the image reference link and caches it inside local IndexedDB storage, avoiding recurring network fetching and conserving data.

---

## 4. Real-time Cursor Replicas

Cursor positions are synced via **Yjs Ephemeral Awareness state**, not through persistent database updates:

*   **Awareness Payload:**
    ```json
    {
      "userId": "usr-designer-99",
      "userName": "Ibrahim C.",
      "cursor": { "x": 142, "y": 256 },
      "activeTool": "pointer",
      "viewport": { "width": 1920, "height": 1080 }
    }
    ```
*   **Performance:** ephemerals run at 60fps utilizing standard WebSockets. They do not trigger Firestore document writes, keeping operations zero-cost.
