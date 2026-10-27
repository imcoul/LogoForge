export type Fill = string | { type: 'linear-gradient' | 'radial-gradient', stops: { offset: number, color: string }[] };
export type Stroke = string | { type: 'linear-gradient', stops: { offset: number, color: string }[], width: number };

/**
 * Every element kind the document model can represent.
 *
 * `group` is a real container — see `Node.children`. Before Phase 1 the `group` member
 * existed but was unusable because `Node` had no children field, which made the scene graph
 * structurally flat.
 */
export type NodeType =
  | "group"
  | "path"
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "polygon"
  | "polyline"
  | "text"
  | "image";

export type Transform = { x: number; y: number; scaleX: number; scaleY: number; rotate: number };

export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 };

export type Node = {
  id: string;
  type: NodeType;
  /** Human-readable layer name, shown in the layers panel. */
  name?: string;
  locked?: boolean;
  /** Layer visibility. Absent means visible. */
  visible?: boolean;
  transform: Transform;
  /**
   * The element's original `transform` attribute, when it was present.
   *
   * SVG permits transforms that the decomposed {x, y, scaleX, scaleY, rotate} form cannot
   * express — `matrix(...)`, `skewX(...)`, or an operation order other than the canonical
   * one. Keeping the source string means serialization is lossless for those cases, while
   * editing still works against the decomposed values for everything else.
   */
  transformRaw?: string;
  style?: {
    fill?: Fill;
    stroke?: Stroke;
    opacity?: number;
    blendMode?: string;
  };
  props?: Record<string, any>; // e.g., pathData, rx, ry, textContent
  /**
   * Attributes the model does not interpret, preserved verbatim so that a
   * parse -> edit -> serialize cycle never silently discards them.
   */
  attrs?: Record<string, string>;
  /** Child nodes. Only meaningful for `group`. */
  children?: Node[];
  meta?: { createdBy: string; timestamp: string; [key: string]: any };
};

/** The legacy whiteboard record mirrored during the gradual vector-document migration. */
export type WhiteboardSketch = {
  id: string;
  name: string;
  path?: string;
  color?: string;
  strokeWidth?: number;
  type?: 'path' | 'rectangle' | 'circle' | 'line';
  props?: any;
  fillColor?: string;
  fillOpacity?: number;
  strokeDashArray?: string;
  locked?: boolean;
  maskId?: string;
  maskType?: 'hide' | 'reveal';
};

/** A reversible add-path delta shared by the whiteboard and precision editor. */
export type SharedWhiteboardPathCommand = {
  kind: 'add-path';
  commandId: string;
  projectId: string;
  nodeId: string;
  node: Node;
  sketch: WhiteboardSketch;
  nodeIndex: number;
  sketchIndex: number;
};

/** A reversible Whiteboard link to a path that already exists in the SVG document. */
export type SharedWhiteboardLinkCommand = {
  kind: 'link-existing-path';
  commandId: string;
  projectId: string;
  nodeId: string;
  sketch: WhiteboardSketch;
  sketchIndex: number;
  previousNodeIdMarker?: string;
};

/** One stable container on the path from the SVG root to a nested shared path. */
export type SharedVectorParentPathEntry = { nodeId: string; index: number; context: string };

/** A reversible deletion of a shared SVG path and its Whiteboard mirror. */
export type SharedWhiteboardDeleteCommand = {
  kind: 'delete-path';
  commandId: string;
  projectId: string;
  nodeId: string;
  node: Node;
  sketch: WhiteboardSketch;
  parentPath: SharedVectorParentPathEntry[];
  nodeIndex: number;
  sketchIndex: number;
};

/** A reversible geometry/presentation update for one shared SVG path and Whiteboard mirror. */
export type SharedWhiteboardUpdateCommand = {
  kind: 'update-path';
  commandId: string;
  projectId: string;
  nodeId: string;
  sketchId: string;
  beforeNode: Node;
  afterNode: Node;
  beforeSketch: WhiteboardSketch;
  afterSketch: WhiteboardSketch;
  parentPath: SharedVectorParentPathEntry[];
  nodeIndex: number;
  sketchIndex: number;
};

export type SharedWhiteboardCommand =
  | SharedWhiteboardPathCommand
  | SharedWhiteboardLinkCommand
  | SharedWhiteboardDeleteCommand
  | SharedWhiteboardUpdateCommand;

export type SharedVectorHistory = {
  commands: SharedWhiteboardCommand[];
  index: number;
};

/** A parsed SVG document: its root attributes plus the node tree. */
export type SvgDocument = {
  /** Root `<svg>` attributes that are not part of the node tree (viewBox, width, xmlns, ...). */
  rootAttrs: Record<string, string>;
  /** Raw markup of `<defs>`, preserved verbatim so gradients and filters survive a round trip. */
  defs?: string;
  nodes: Node[];
};

export type Command =
  | { op: "addNode"; node: Node }
  | { op: "setAttr"; nodeId: string; path: string[]; value: any }
  | { op: "transform"; nodeId: string; transform: Partial<Node["transform"]> }
  | { op: "simplifyPath"; nodeId: string; tolerance: number };
