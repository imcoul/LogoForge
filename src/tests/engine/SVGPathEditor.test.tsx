/**
 * Component tests for SVGPathEditor.
 *
 * Originally written in Phase 0 to pin the editor's behaviour against the regex pipeline,
 * including its bugs. Phase 1 replaced that pipeline with the real engine, so the
 * `id`-hijack assertion has been updated from the buggy value to the correct one — exactly
 * the transition the roadmap describes: the characterization test failing is the signal the
 * fix landed.
 *
 * These also prove the engine in `src/engine/pathEditorBridge.ts` is genuinely the code the
 * component runs, so the unit tests for it are trustworthy evidence about real editor
 * behaviour.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SVGPathEditor } from '../../components/SVGPathEditor';
import { ToastProvider } from '../../components/Toast';
import { useAppStore } from '../../store';
import { listEditablePaths } from '../../engine/pathEditorBridge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const renderEditor = (props: Partial<React.ComponentProps<typeof SVGPathEditor>> = {}) =>
  render(
    <ToastProvider>
      <SVGPathEditor {...props} />
    </ToastProvider>,
  );

beforeEach(() => {
  useAppStore.setState({ projects: [], activeProjectId: null });
});

/**
 * The editor mounts in 'draw' mode; the parsed-path list only exists in 'coordinate' mode.
 * Switching via the real tab keeps this a black-box test of user-visible behaviour.
 */
const switchToCoordinateMode = (container: HTMLElement) => {
  const tab = container.querySelector('#tour-precision-handles-tab');
  if (!tab) throw new Error('precision handles tab not found');
  fireEvent.click(tab);
};

describe('SVGPathEditor mounting', () => {
  it('renders without a project or svgSource', () => {
    expect(() => renderEditor()).not.toThrow();
  });

  it('renders with a null svgSource', () => {
    expect(() => renderEditor({ svgSource: null })).not.toThrow();
  });

  it('accepts the legacy svgContent/onChange prop aliases', () => {
    const onChange = vi.fn();
    expect(() =>
      renderEditor({ svgContent: '<svg><path d="M0 0 L10 10" /></svg>', onChange }),
    ).not.toThrow();
  });
});

describe('SVGPathEditor path parsing (via the legacy pipeline)', () => {
  const svg =
    '<svg viewBox="0 0 100 100"><path d="M10 10 L90 90" stroke="#000" /><path d="M20 20 L80 80" stroke="#f00" /></svg>';

  it('surfaces one list entry per parsed path', () => {
    const { container } = renderEditor({ svgSource: svg });
    switchToCoordinateMode(container);

    // The path selector renders a `#N` badge per parsed path.
    const expectedCount = listEditablePaths(svg).length;
    expect(expectedCount).toBe(2);

    for (let i = 1; i <= expectedCount; i++) {
      expect(screen.getAllByText(`#${i}`).length).toBeGreaterThan(0);
    }
  });

  it('renders the truncated path data exactly as the pipeline parsed it', () => {
    const { container } = renderEditor({ svgSource: svg });
    switchToCoordinateMode(container);

    // The list shows `pathItem.d.slice(0, 20)` followed by an ellipsis.
    for (const p of listEditablePaths(svg)) {
      expect(screen.getAllByText(`${p.d.slice(0, 20)}...`).length).toBeGreaterThan(0);
    }
  });

  it('shows no path entries for a document containing only non-path elements', () => {
    // Confirms at component level that rect/circle/text are invisible to the editor.
    const nonPathSvg = '<svg><rect width="10" height="10" /><circle r="5" /></svg>';
    expect(listEditablePaths(nonPathSvg)).toEqual([]);

    const { container } = renderEditor({ svgSource: nonPathSvg });
    switchToCoordinateMode(container);

    expect(screen.queryByText('#1')).toBeNull();
  });

  it('FIXED: an id attribute no longer hijacks the displayed path data', () => {
    // Under the regex pipeline this rendered "logo..." because getAttr matched the tail of
    // id="logo". The real parser reads the actual d attribute.
    const svg = '<svg><path id="logo" d="M0 0 L5 5" /></svg>';
    const { container } = renderEditor({ svgSource: svg });
    switchToCoordinateMode(container);

    expect(screen.getAllByText('M0 0 L5 5...').length).toBeGreaterThan(0);
    expect(screen.queryByText('logo...')).toBeNull();
  });

  it('FIXED: paths nested inside groups are now listed', () => {
    // The regex pipeline matched nested paths but stripped their group context; the tree
    // parser surfaces them as real nodes.
    const svg = '<svg><g transform="translate(10,10)"><path d="M0 0" /></g></svg>';
    const { container } = renderEditor({ svgSource: svg });
    switchToCoordinateMode(container);

    expect(screen.getAllByText('#1').length).toBeGreaterThan(0);
  });
});
