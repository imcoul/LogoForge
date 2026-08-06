/**
 * Tests for the Phase 1 CanvasRenderer rewrite.
 *
 * The previous renderer was 45 lines ending in `default: return null`, so text, image and
 * group nodes rendered as nothing and gradients were silently dropped. Each test below
 * covers a node type or style feature that used to disappear.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderNode } from '../../components/CanvasRenderer';
import { IDENTITY_TRANSFORM, type Node } from '../../types';

const node = (partial: Partial<Node> & Pick<Node, 'type'>): Node => ({
  id: partial.id ?? 'n0',
  transform: { ...IDENTITY_TRANSFORM },
  ...partial,
});

const draw = (n: Node) => {
  const { container } = render(<svg>{renderNode(n)}</svg>);
  return container.querySelector('svg')!;
};

describe('element coverage — types the old renderer dropped', () => {
  it('renders a group as a real container with its children', () => {
    const svg = draw(
      node({
        type: 'group',
        id: 'g1',
        children: [
          node({ type: 'rect', id: 'r1', props: { x: 0, y: 0, width: 10, height: 10 } }),
          node({ type: 'circle', id: 'c1', props: { cx: 5, cy: 5, r: 2 } }),
        ],
      }),
    );

    expect(svg.querySelector('g')).not.toBeNull();
    expect(svg.querySelectorAll('g > *')).toHaveLength(2);
  });

  it('renders nested groups recursively', () => {
    const svg = draw(
      node({
        type: 'group',
        id: 'outer',
        children: [
          node({
            type: 'group',
            id: 'inner',
            children: [node({ type: 'path', id: 'p1', props: { d: 'M0 0' } })],
          }),
        ],
      }),
    );

    expect(svg.querySelector('g > g > path')).not.toBeNull();
  });

  it('renders text with its content', () => {
    const svg = draw(node({ type: 'text', props: { x: 1, y: 2, textContent: 'Forgel' } }));
    const text = svg.querySelector('text');
    expect(text?.textContent).toBe('Forgel');
    expect(text?.getAttribute('x')).toBe('1');
  });

  it('renders an image with its href', () => {
    const svg = draw(node({ type: 'image', props: { x: 0, y: 0, width: 4, height: 4, href: 'a.png' } }));
    expect(svg.querySelector('image')?.getAttribute('href')).toBe('a.png');
  });

  it('renders circle, polygon and polyline', () => {
    expect(draw(node({ type: 'circle', props: { cx: 1, cy: 2, r: 3 } })).querySelector('circle')).not.toBeNull();
    expect(draw(node({ type: 'polygon', props: { points: '0,0 1,1' } })).querySelector('polygon')).not.toBeNull();
    expect(draw(node({ type: 'polyline', props: { points: '0,0 1,1' } })).querySelector('polyline')).not.toBeNull();
  });

  it('renders rect, ellipse, line and path', () => {
    expect(draw(node({ type: 'rect', props: { x: 0, y: 0, width: 1, height: 1 } })).querySelector('rect')).not.toBeNull();
    expect(draw(node({ type: 'ellipse', props: { cx: 0, cy: 0, rx: 1, ry: 2 } })).querySelector('ellipse')).not.toBeNull();
    expect(draw(node({ type: 'line', props: { x1: 0, y1: 0, x2: 1, y2: 1 } })).querySelector('line')).not.toBeNull();
    expect(draw(node({ type: 'path', props: { d: 'M0 0' } })).querySelector('path')).not.toBeNull();
  });
});

describe('backward compatibility with legacy scene graphs', () => {
  it('accepts the legacy pathData prop name', () => {
    expect(draw(node({ type: 'path', props: { pathData: 'M0 0 L1 1' } })).querySelector('path')?.getAttribute('d')).toBe(
      'M0 0 L1 1',
    );
  });

  it('accepts legacy line endpoints stored as start/end objects', () => {
    const svg = draw(node({ type: 'line', props: { start: { x: 1, y: 2 }, end: { x: 3, y: 4 } } }));
    const line = svg.querySelector('line');
    expect(line?.getAttribute('x1')).toBe('1');
    expect(line?.getAttribute('y2')).toBe('4');
  });
});

describe('styling', () => {
  it('applies a plain colour fill and stroke', () => {
    const svg = draw(
      node({ type: 'rect', props: { x: 0, y: 0, width: 1, height: 1 }, style: { fill: '#f00', stroke: '#0f0' } }),
    );
    const rect = svg.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#f00');
    expect(rect?.getAttribute('stroke')).toBe('#0f0');
  });

  it('renders a gradient fill as a url() reference, which the old renderer dropped', () => {
    const svg = draw(
      node({
        type: 'rect',
        id: 'r1',
        props: { x: 0, y: 0, width: 1, height: 1 },
        style: {
          fill: { type: 'linear-gradient', stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#fff' }] },
        },
      }),
    );

    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe('url(#grad-r1-fill)');
  });

  it('reads stroke width from a gradient stroke object', () => {
    const svg = draw(
      node({
        type: 'path',
        id: 'p1',
        props: { d: 'M0 0' },
        style: { stroke: { type: 'linear-gradient', stops: [{ offset: 0, color: '#000' }], width: 7 } },
      }),
    );

    expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBe('7');
  });

  it('applies opacity and blend mode', () => {
    const svg = draw(
      node({ type: 'rect', props: { x: 0, y: 0, width: 1, height: 1 }, style: { opacity: 0.25, blendMode: 'multiply' } }),
    );
    const rect = svg.querySelector('rect');
    expect(rect?.getAttribute('opacity')).toBe('0.25');
    expect(rect?.getAttribute('style')).toContain('multiply');
  });
});

describe('transforms and visibility', () => {
  it('composes a transform from the decomposed form', () => {
    const svg = draw(
      node({ type: 'path', props: { d: 'M0 0' }, transform: { x: 5, y: 10, scaleX: 2, scaleY: 3, rotate: 45 } }),
    );
    expect(svg.querySelector('path')?.getAttribute('transform')).toBe('translate(5,10) rotate(45) scale(2,3)');
  });

  it('omits the transform attribute entirely for an identity transform', () => {
    const svg = draw(node({ type: 'path', props: { d: 'M0 0' } }));
    expect(svg.querySelector('path')?.hasAttribute('transform')).toBe(false);
  });

  it('prefers transformRaw when the decomposed form cannot express it', () => {
    const svg = draw(
      node({ type: 'path', props: { d: 'M0 0' }, transformRaw: 'matrix(1,0,0,1,10,20)' }),
    );
    expect(svg.querySelector('path')?.getAttribute('transform')).toBe('matrix(1,0,0,1,10,20)');
  });

  it('does not render a node marked invisible', () => {
    expect(draw(node({ type: 'rect', visible: false, props: { x: 0, y: 0, width: 1, height: 1 } })).querySelector('rect')).toBeNull();
  });

  it('renders a node with visible undefined', () => {
    expect(draw(node({ type: 'rect', props: { x: 0, y: 0, width: 1, height: 1 } })).querySelector('rect')).not.toBeNull();
  });
});
