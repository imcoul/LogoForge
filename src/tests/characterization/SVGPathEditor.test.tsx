/**
 * CHARACTERIZATION TESTS — SVGPathEditor component.
 *
 * Pins the observable behaviour of the editor shell. The primary purpose is to prove that
 * the pure pipeline in `src/engine/legacySvgPath.ts` is genuinely the code the component
 * runs, so the unit-level characterization tests for that module are trustworthy evidence
 * about real editor behaviour.
 *
 * See plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md, Phase 0.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SVGPathEditor } from '../../components/SVGPathEditor';
import { ToastProvider } from '../../components/Toast';
import { useAppStore } from '../../store';
import { parsePathTags } from '../../engine/legacySvgPath';

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
    const expectedCount = parsePathTags(svg).length;
    expect(expectedCount).toBe(2);

    for (let i = 1; i <= expectedCount; i++) {
      expect(screen.getAllByText(`#${i}`).length).toBeGreaterThan(0);
    }
  });

  it('renders the truncated path data exactly as the pipeline parsed it', () => {
    const { container } = renderEditor({ svgSource: svg });
    switchToCoordinateMode(container);

    // The list shows `pathItem.d.slice(0, 20)` followed by an ellipsis.
    for (const p of parsePathTags(svg)) {
      expect(screen.getAllByText(`${p.d.slice(0, 20)}...`).length).toBeGreaterThan(0);
    }
  });

  it('shows no path entries for a document containing only non-path elements', () => {
    // Confirms at component level that rect/circle/text are invisible to the editor.
    const nonPathSvg = '<svg><rect width="10" height="10" /><circle r="5" /></svg>';
    expect(parsePathTags(nonPathSvg)).toEqual([]);

    const { container } = renderEditor({ svgSource: nonPathSvg });
    switchToCoordinateMode(container);

    expect(screen.queryByText('#1')).toBeNull();
  });

  it('KNOWN BUG at component level: an id before d hijacks the displayed path data', () => {
    // Same getAttr defect as the unit test, observable through the UI.
    const buggySvg = '<svg><path id="logo" d="M0 0 L5 5" /></svg>';
    const { container } = renderEditor({ svgSource: buggySvg });
    switchToCoordinateMode(container);

    expect(screen.getAllByText('logo...').length).toBeGreaterThan(0);
  });
});
