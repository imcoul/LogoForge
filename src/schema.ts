/**
 * Forgel Canonical JSON Project Schema & CRDT Mapping
 *
 * This file defines the formal JSON schema structures for Forgel projects,
 * including shapes, layers, metadata, comments, versions, and export manifests.
 * It also documents and defines the direct mapping of these structures to Yjs CRDT types
 * to ensure bulletproof real-time collaboration.
 */

export interface ColorSwatch {
  hex: string;
  name: string;
  role?: string;
}

export interface TypographySpec {
  primaryFont: string;
  secondaryFont: string;
  guidelines: string;
}

export interface BrandGuideSpec {
  brandVoice: {
    tone: string;
    description: string;
    keywords: string[];
  };
  primaryColors: ColorSwatch[];
  secondaryColors: ColorSwatch[];
  typography: TypographySpec;
}

export interface StickyNoteSpec {
  id: string;
  text: string;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  color: string;
}

export interface VectorNode {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'text' | 'group';
  points?: number[]; // [x1, y1, x2, y2, ...]
  d?: string; // svg path definition string
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

export interface LayerSpec {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  nodes: VectorNode[];
}

export interface CommentSpec {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface VersionSnapshotSpec {
  id: string;
  name: string;
  timestamp: number;
  svgSource: string;
  logoUrl?: string;
}

export interface ExportManifestSpec {
  exportedAt: number;
  formats: ('svg' | 'png' | 'pptx' | 'zip' | 'yaml' | 'xml')[];
  status: 'pending' | 'success' | 'failure';
  signedDownloadUrl?: string;
}

/**
 * Forgel Canonical Schema Root
 */
export interface ForgelProjectSchema {
  id: string;
  name: string;
  createdAt: number;
  stage: 'discovery' | 'ideation' | 'drafting' | 'refinement' | 'delivery';
  description: string;
  logoUrl: string | null;
  svgSource: string | null;
  brandGuide: BrandGuideSpec | null;
  layers: LayerSpec[];
  stickyNotes: StickyNoteSpec[];
  comments: CommentSpec[];
  snapshots: VersionSnapshotSpec[];
  exportManifests: ExportManifestSpec[];
}

/**
 * Yjs CRDT Document Structure Mapping Specification
 * 
 * To implement this schema over a Yjs Doc:
 * 1. Root: Y.Map
 *    - project.get('id') -> Y.Text (Immutable)
 *    - project.get('name') -> Y.Text (Collaborative string)
 *    - project.get('createdAt') -> Number
 *    - project.get('stage') -> Y.Text (Collaborative string)
 *    - project.get('description') -> Y.Text (Collaborative text)
 *    - project.get('svgSource') -> Y.Text (Collaborative SVG XML block)
 *    - project.get('layers') -> Y.Array of Y.Map (Representing each collaborative layer and its vector nodes)
 *    - project.get('comments') -> Y.Array of Y.Map (Append-only collaborative comment threads)
 *    - project.get('stickyNotes') -> Y.Map (Real-time annotated notes keyed by id)
 *    - project.get('snapshots') -> Y.Array (History snapshots)
 */
export const YJSMappings = {
  rootType: 'Y.Map',
  properties: {
    id: 'Y.Text (Immutable)',
    name: 'Y.Text',
    stage: 'Y.Text',
    description: 'Y.Text',
    svgSource: 'Y.Text',
    layers: 'Y.Array<Y.Map>',
    comments: 'Y.Array<Y.Map>',
    stickyNotes: 'Y.Map<Y.Map>',
    snapshots: 'Y.Array<Y.Map>'
  }
};
