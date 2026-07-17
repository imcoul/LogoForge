export type Fill = string | { type: 'linear-gradient' | 'radial-gradient', stops: { offset: number, color: string }[] };
export type Stroke = string | { type: 'linear-gradient', stops: { offset: number, color: string }[], width: number };

export type Node = {
  id: string;
  type: "group" | "path" | "rect" | "ellipse" | "text" | "image" | "line";
  locked?: boolean;
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotate: number };
  style?: {
    fill?: Fill;
    stroke?: Stroke;
    opacity?: number;
    blendMode?: string;
  };
  props?: Record<string, any>; // e.g., pathData, rx, ry, textContent
  meta?: { createdBy: string; timestamp: string; [key: string]: any };
};

export type Command =
  | { op: "addNode"; node: Node }
  | { op: "setAttr"; nodeId: string; path: string[]; value: any }
  | { op: "transform"; nodeId: string; transform: Partial<Node["transform"]> }
  | { op: "simplifyPath"; nodeId: string; tolerance: number };
