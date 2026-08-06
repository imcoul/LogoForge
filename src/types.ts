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
