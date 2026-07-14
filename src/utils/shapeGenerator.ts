import { Node } from '../types';

export const createLine = (type: 'straight' | 'elbowed' | 'curved', start: {x: number, y: number}, end: {x: number, y: number}, params: Record<string, any>): Node => {
  const id = Date.now().toString();
  return {
    id,
    type: 'line',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    style: { stroke: params.stroke || 'black' },
    props: { type, start, end },
    meta: { createdBy: 'user', timestamp: new Date().toISOString() }
  };
};

export const createShape = (type: string, params: Record<string, any>): Node => {
  const id = Date.now().toString();
  const baseNode: Node = {
    id,
    type: type as any,
    transform: { x: params.x || 0, y: params.y || 0, scaleX: 1, scaleY: 1, rotate: 0 },
    style: { fill: params.fill || 'black', stroke: params.stroke || 'none' },
    props: params,
    meta: { createdBy: 'user', timestamp: new Date().toISOString() }
  };
  return baseNode;
};
