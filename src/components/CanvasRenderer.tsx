import React from 'react';
import { useAppStore } from '../store';
import { Node } from '../types';

export const CanvasRenderer: React.FC = () => {
  const { activeProjectId, projects } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const sceneGraph = activeProject?.sceneGraph || [];

  const renderNode = (node: Node) => {
    const { transform, style } = node;
    const styleProps = {
        fill: typeof style?.fill === 'string' ? style.fill : 'none',
        stroke: typeof style?.stroke === 'string' ? style.stroke : 'none',
        strokeWidth: typeof style?.stroke !== 'string' ? style?.stroke?.width : 1,
        opacity: style?.opacity
    };
    
    const commonProps = {
        key: node.id,
        transform: `translate(${transform.x}, ${transform.y}) rotate(${transform.rotate}) scale(${transform.scaleX}, ${transform.scaleY})`,
        ...styleProps
    };

    switch (node.type) {
      case 'rect':
        return <rect {...commonProps} width={node.props?.width} height={node.props?.height} />;
      case 'ellipse':
        return <ellipse {...commonProps} rx={node.props?.rx} ry={node.props?.ry} />;
      case 'line':
        const { start, end } = node.props || {};
        return <line x1={start?.x} y1={start?.y} x2={end?.x} y2={end?.y} stroke={styleProps.stroke} strokeWidth={styleProps.strokeWidth} />;
      case 'path':
        return <path {...commonProps} d={node.props?.pathData} />;
      default:
        return null;
    }
  };

  return (
    <svg className="w-full h-full">
      {sceneGraph.map(renderNode)}
    </svg>
  );
};
