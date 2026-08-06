import React from 'react';
import { useAppStore } from '../store';
import { Node, Fill, Stroke } from '../types';

/**
 * Renders the scene graph.
 *
 * Phase 1 rewrite. The previous implementation was 45 lines whose switch ended in
 * `default: return null`, so `text`, `image` and `group` nodes rendered as nothing, and
 * gradients were dropped because fill was only applied when it was a plain string.
 * Groups are now real containers rendered recursively, and every node type is handled.
 */

/** Stable id for a gradient derived from a node, so defs and references always agree. */
const gradientId = (nodeId: string, kind: 'fill' | 'stroke') => `grad-${nodeId}-${kind}`;

const isGradient = (v: Fill | Stroke | undefined): v is Exclude<Fill | Stroke, string> =>
  typeof v === 'object' && v !== null && 'stops' in v;

/** Emits <defs> entries for every gradient used anywhere in the tree. */
const GradientDefs: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
  const defs: React.ReactNode[] = [];

  const collect = (list: Node[]) => {
    for (const node of list) {
      for (const kind of ['fill', 'stroke'] as const) {
        const value = node.style?.[kind];
        if (!isGradient(value)) continue;

        const id = gradientId(node.id, kind);
        const stops = value.stops.map((s, i) => (
          <stop key={i} offset={`${s.offset * 100}%`} stopColor={s.color} />
        ));

        defs.push(
          value.type === 'radial-gradient' ? (
            <radialGradient key={id} id={id}>{stops}</radialGradient>
          ) : (
            <linearGradient key={id} id={id}>{stops}</linearGradient>
          ),
        );
      }
      if (node.children?.length) collect(node.children);
    }
  };

  collect(nodes);
  return defs.length > 0 ? <defs>{defs}</defs> : null;
};

function paintValue(node: Node, kind: 'fill' | 'stroke'): string | undefined {
  const value = node.style?.[kind];
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (isGradient(value)) return `url(#${gradientId(node.id, kind)})`;
  return undefined;
}

function strokeWidthOf(node: Node): number | string | undefined {
  const stroke = node.style?.stroke;
  if (stroke && typeof stroke !== 'string' && 'width' in stroke) return stroke.width;
  return node.props?.strokeWidth ?? node.props?.['stroke-width'];
}

function transformOf(node: Node): string | undefined {
  // Prefer the source string when the decomposed form could not represent it.
  if (node.transformRaw) return node.transformRaw;
  const t = node.transform;
  if (!t) return undefined;
  const parts: string[] = [];
  if (t.x !== 0 || t.y !== 0) parts.push(`translate(${t.x},${t.y})`);
  if (t.rotate !== 0) parts.push(`rotate(${t.rotate})`);
  if (t.scaleX !== 1 || t.scaleY !== 1) parts.push(`scale(${t.scaleX},${t.scaleY})`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function renderNode(node: Node): React.ReactNode {
  if (node.visible === false) return null;

  const p = node.props || {};
  const common = {
    key: node.id,
    transform: transformOf(node),
    fill: paintValue(node, 'fill'),
    stroke: paintValue(node, 'stroke'),
    strokeWidth: strokeWidthOf(node),
    opacity: node.style?.opacity,
    style: node.style?.blendMode
      ? ({ mixBlendMode: node.style.blendMode } as React.CSSProperties)
      : undefined,
  };

  switch (node.type) {
    case 'group':
      return <g {...common}>{(node.children || []).map(renderNode)}</g>;

    case 'rect':
      return <rect {...common} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} ry={p.ry} />;

    case 'circle':
      return <circle {...common} cx={p.cx} cy={p.cy} r={p.r} />;

    case 'ellipse':
      return <ellipse {...common} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} />;

    case 'line':
      // Legacy scene graphs stored endpoints as {start:{x,y}, end:{x,y}} objects.
      return (
        <line
          {...common}
          x1={p.x1 ?? p.start?.x}
          y1={p.y1 ?? p.start?.y}
          x2={p.x2 ?? p.end?.x}
          y2={p.y2 ?? p.end?.y}
        />
      );

    case 'polygon':
      return <polygon {...common} points={p.points} />;

    case 'polyline':
      return <polyline {...common} points={p.points} />;

    case 'path':
      return <path {...common} d={p.d ?? p.pathData} />;

    case 'text':
      return (
        <text
          {...common}
          x={p.x}
          y={p.y}
          fontSize={p['font-size'] ?? p.fontSize}
          fontFamily={p['font-family'] ?? p.fontFamily}
          textAnchor={p['text-anchor'] ?? p.textAnchor}
        >
          {p.textContent ?? ''}
        </text>
      );

    case 'image':
      return <image {...common} x={p.x} y={p.y} width={p.width} height={p.height} href={p.href} />;

    default:
      return null;
  }
}

export const CanvasRenderer: React.FC = () => {
  const { activeProjectId, projects } = useAppStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const sceneGraph = activeProject?.sceneGraph || [];

  return (
    <svg className="w-full h-full">
      <GradientDefs nodes={sceneGraph} />
      {sceneGraph.map(renderNode)}
    </svg>
  );
};
