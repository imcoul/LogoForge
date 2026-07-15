# Canonical Scene Graph Schema

This document specifies the official, single source of truth data model for Forgel's unified graphic design workspaces. 

All graphic components—including freehand whiteboard drawings, parametric shape primitives, line paths, and precision SVG elements—MUST compile to and read from this schema structure. This design facilitates local state transformations, high-fidelity export streams, and real-time CRDT (Conflict-free Replicated Data Type) document merge strategies.

---

## 1. Core Scene Node Type Definitions

Every item on the design surface (the canvas/whiteboard and the SVG editor layer) is defined as a `Node` object inside the `sceneGraph` collection.

```typescript
export type NodeType = 'path' | 'rect' | 'circle' | 'line' | 'group' | 'image' | 'text';

export interface Point2D {
  x: number;
  y: number;
}

export interface NodeStyle {
  fill?: string;         // HEX color string or "none" / "transparent"
  fillOpacity?: number;  // Value between 0.0 and 1.0
  stroke?: string;       // HEX color string
  strokeWidth?: number;  // Stroke width in pixels (or coordinate units)
  strokeDashArray?: string; // Optional dash styling (e.g. "5,5")
  opacity?: number;      // Layer transparency
  borderRadius?: number; // Border radius 'rx' for rectangles
}

export interface NodeMeta {
  createdBy: string;     // User identifier or session UID
  createdAt: number;     // Timestamp (epoch millisecond)
  updatedAt: number;     // Timestamp of last structural update
  source?: 'whiteboard' | 'svg_editor' | 'ai_generation' | 'import_file';
  confidence?: number;   // Accuracy score for traced path nodes
  provenance?: {
    tracedFrom?: string; // ID of the source bitmap image
    traceParams?: string; // Configuration string for simplify parameters
    rollbackToken?: string; // Undo token for AI operations
  };
}

export interface Node {
  id: string;            // Globally unique identifier (e.g., UUID-v4 or client-timestamp)
  type: NodeType;        // Shape/Path category
  name: string;          // Human-readable layer label (e.g., "Left Logo Accent")
  visible: boolean;      // Layer visibility flag
  locked: boolean;       // Interaction locks
  style: NodeStyle;      // Styling attributes (fills, outlines)
  meta: NodeMeta;        // Audit trail, source tracking, and AI indicators
  
  // Positional parameters
  x: number;             // X offset of bounding box or origin coordinate
  y: number;             // Y offset of bounding box or origin coordinate
  width?: number;        // Dimensions for rectangular bounds
  height?: number;       // Dimensions for rectangular bounds
  radius?: number;       // Dimension for circles
  
  // Node-specific geometry payloads
  points?: Point2D[];    // Interpolated point collections for drawings and paths
  pathD?: string;        // SVG canonical Path Command String (M, L, C, Q, Z format)
  textPayload?: string;  // Plain text contents for 'text' nodes
  imageRef?: string;     // Object Storage URI or Base64 URI (for PNG/JPEG references)
  
  // Transform matrices
  transform?: {
    translateX?: number;
    translateY?: number;
    rotate?: number;
    scaleX?: number;
    scaleY?: number;
  };
}

export interface SceneGraph {
  version: number;       // Schema evolution indicator
  nodes: Node[];         // Layer order array (index 0 is backmost, length-1 is frontmost)
}
```

---

## 2. Structural Examples of the Canonical Schema

### A. Bezier Path Node (Freehand & Curves)
```json
{
  "id": "node-path-88d402",
  "type": "path",
  "name": "Brush Line Curve",
  "visible": true,
  "locked": false,
  "style": {
    "fill": "none",
    "stroke": "#4F46E5",
    "strokeWidth": 4,
    "opacity": 1.0
  },
  "meta": {
    "createdBy": "usr-designer-99",
    "createdAt": 1784136100000,
    "updatedAt": 1784136125000,
    "source": "whiteboard"
  },
  "x": 0,
  "y": 0,
  "points": [
    { "x": 100, "y": 150 },
    { "x": 120, "y": 140 },
    { "x": 150, "y": 180 }
  ],
  "pathD": "M 100 150 Q 120 140 150 180"
}
```

### B. Parametric Customizable Rectangle Node
```json
{
  "id": "node-rect-552fc1",
  "type": "rect",
  "name": "Background Frame",
  "visible": true,
  "locked": false,
  "style": {
    "fill": "#F3F4F6",
    "fillOpacity": 0.8,
    "stroke": "#111827",
    "strokeWidth": 2,
    "borderRadius": 12
  },
  "meta": {
    "createdBy": "usr-designer-99",
    "createdAt": 1784136200000,
    "updatedAt": 1784136210000,
    "source": "whiteboard"
  },
  "x": 50,
  "y": 60,
  "width": 300,
  "height": 200
}
```

### C. SVG Vector Node with Tracing Provenance
```json
{
  "id": "node-svg-r2v-0091",
  "type": "path",
  "name": "Traced Brand Logo Layer",
  "visible": true,
  "locked": false,
  "style": {
    "fill": "#000000",
    "stroke": "none"
  },
  "meta": {
    "createdBy": "usr-designer-99",
    "createdAt": 1784136500000,
    "updatedAt": 1784136500000,
    "source": "ai_generation",
    "confidence": 0.94,
    "provenance": {
      "tracedFrom": "img-upload-771c",
      "traceParams": "tolerance=1.5,simplifyLevel=0.8",
      "rollbackToken": "ai-op-rollback-90a1"
    }
  },
  "x": 0,
  "y": 0,
  "pathD": "M 10 80 C 40 10, 65 10, 95 80 Z"
}
```

---

## 3. Schema Governance & Type Alignment Rules

1. **Zero Raw Mutation**: No component should mutate any `Node` directly in local memory. Updates must go through the centralized state container.
2. **PathCommand Dominance**: When exporting to production vector suites (Vite, SVG Exporters, Illustrator), the `pathD` parameter is the absolute source of truth. Dynamic shape engines MUST keep `pathD` updated when translating or updating custom rectangular borders or curves.
3. **Coordinates Snapping Isolation**: Snapping calculations must occur *prior* to committing coordinates to the state, ensuring committed data always lies exactly on grid vertices.
