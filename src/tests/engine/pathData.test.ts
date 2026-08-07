/**
 * Tests for the SVG path data tokenizer.
 *
 * The `regressions` block asserts the CORRECT behaviour for cases the legacy regex tokenizer
 * got wrong. Those cases were previously pinned as `KNOWN BUG` in
 * `src/tests/characterization/legacySvgPath.test.ts`; now that the real tokenizer has
 * replaced it, the same inputs are asserted against their correct values.
 */
import { describe, it, expect } from 'vitest';
import { parsePathData, serializePathData, toAnchors, fromAnchors } from '../../engine/pathData';

describe('parsePathData — basics', () => {
  it('parses a moveto and lineto', () => {
    expect(parsePathData('M0 0 L10 10')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [10, 10] },
    ]);
  });

  it('parses comma separators', () => {
    expect(parsePathData('M0,0 L10,10')).toEqual([
      { command: 'M', args: [0, 0] },
      { command: 'L', args: [10, 10] },
    ]);
  });

  it('parses a command with no separator before its arguments', () => {
    expect(parsePathData('M0 0L10 10')).toHaveLength(2);
  });

  it('preserves relative (lowercase) commands', () => {
    expect(parsePathData('m0 0 l5 5').map((c) => c.command)).toEqual(['m', 'l']);
  });

  it('parses cubic beziers with six arguments', () => {
    expect(parsePathData('M0 0 C1 2 3 4 5 6')[1]).toEqual({ command: 'C', args: [1, 2, 3, 4, 5, 6] });
  });

  it('parses single-argument H and V', () => {
    expect(parsePathData('M0 0 H10 V20').map((c) => c.command)).toEqual(['M', 'H', 'V']);
  });

  it('parses negative and decimal values', () => {
    expect(parsePathData('M-1.5 -2.25')[0].args).toEqual([-1.5, -2.25]);
  });

  it('parses a leading-dot decimal', () => {
    expect(parsePathData('M.5 .25')[0].args).toEqual([0.5, 0.25]);
  });

  it('parses negative values with no separator', () => {
    expect(parsePathData('M0 0 L-5-10')[1].args).toEqual([-5, -10]);
  });

  it('returns an empty list for empty input', () => {
    expect(parsePathData('')).toEqual([]);
    expect(parsePathData('   ')).toEqual([]);
  });

  it('drops a malformed trailing fragment rather than throwing', () => {
    // Refusing to open a document is worse than dropping an incomplete tail.
    expect(parsePathData('M0 0 L10')).toEqual([{ command: 'M', args: [0, 0] }]);
  });
});

describe('parsePathData — implicit command repetition', () => {
  it('repeats lineto for extra coordinate pairs', () => {
    expect(parsePathData('M0 0 L1 1 2 2 3 3').map((c) => c.command)).toEqual(['M', 'L', 'L', 'L']);
  });

  it('treats extra pairs after M as implicit L, per the SVG spec', () => {
    expect(parsePathData('M0 0 10 10').map((c) => c.command)).toEqual(['M', 'L']);
  });

  it('treats extra pairs after m as implicit l', () => {
    expect(parsePathData('m0 0 10 10').map((c) => c.command)).toEqual(['m', 'l']);
  });
});

describe('regressions — cases the legacy regex tokenizer got wrong', () => {
  it('keeps exponent notation as a single number', () => {
    // Legacy produced [1, 3, 0]: `e` matched neither the command class nor the number pattern.
    expect(parsePathData('M1e3 0')[0].args).toEqual([1000, 0]);
  });

  it('handles a negative exponent', () => {
    expect(parsePathData('M1.5e-3 0')[0].args).toEqual([0.0015, 0]);
  });

  it('preserves a trailing Z', () => {
    // Legacy dropped it, silently opening every closed subpath on the next serialize.
    expect(parsePathData('M0 0 L10 10 Z').map((c) => c.command)).toEqual(['M', 'L', 'Z']);
  });

  it('preserves a lowercase z', () => {
    expect(parsePathData('M0 0 z')[1]).toEqual({ command: 'z', args: [] });
  });

  it('parses arc flags as single characters, not as coordinates', () => {
    // Legacy treated the flag pair as ordinary numbers, so arcs could not survive a round trip.
    expect(parsePathData('M50 100 a50,50 0 1,0 100,0')[1]).toEqual({
      command: 'a',
      args: [50, 50, 0, 1, 0, 100, 0],
    });
  });

  it('parses arc flags that run together with the following number', () => {
    // `1150,0` is legal: flag 1, flag 1, then 50 — flags never need a separator.
    expect(parsePathData('M0 0 a50,50 0 1150,0')[1].args).toEqual([50, 50, 0, 1, 1, 50, 0]);
  });
});

describe('serializePathData', () => {
  it('joins arguments with commas and commands with spaces', () => {
    expect(
      serializePathData([
        { command: 'M', args: [0, 0] },
        { command: 'L', args: [10, 10] },
      ]),
    ).toBe('M0,0 L10,10');
  });

  it('emits a zero-argument command bare', () => {
    expect(serializePathData([{ command: 'Z', args: [] }])).toBe('Z');
  });

  it('returns an empty string for no commands', () => {
    expect(serializePathData([])).toBe('');
  });
});

describe('round trip', () => {
  const CASES = [
    'M0 0 L10 10',
    'M0 0 L10 10 Z',
    'M0 0 C1 2 3 4 5 6',
    'm0 0 l5 5 z',
    'M50 100 a50,50 0 1,0 100,0 Z',
    'M1e3 0 L2e3 1e3',
    'M-1.5 -2.25 L3.125 4.5',
    'M0 0 H10 V20 Z',
    'M0 0 Q1 2 3 4 T5 6',
    'M0 0 S1 2 3 4',
  ];

  it.each(CASES)('is stable across two round trips: %s', (d) => {
    const once = serializePathData(parsePathData(d));
    const twice = serializePathData(parsePathData(once));
    expect(twice).toBe(once);
  });

  it.each(CASES)('preserves the command sequence: %s', (d) => {
    const first = parsePathData(d).map((c) => c.command);
    const second = parsePathData(serializePathData(parsePathData(d))).map((c) => c.command);
    expect(second).toEqual(first);
  });

  it('preserves numeric values exactly', () => {
    const parsed = parsePathData('M50 100 a50,50 0 1,0 100,0 Z');
    const reparsed = parsePathData(serializePathData(parsed));
    expect(reparsed).toEqual(parsed);
  });
});

describe('anchors', () => {
  it('skips zero-argument commands when producing draggable anchors', () => {
    const commands = parsePathData('M0 0 L10 10 Z');
    const anchors = toAnchors(commands);
    expect(anchors).toHaveLength(2);
    expect(anchors.map((a) => a.command)).toEqual(['M', 'L']);
  });

  it('maps anchors back onto their original command indices', () => {
    const commands = parsePathData('M0 0 L10 10 Z');
    const anchors = toAnchors(commands);
    anchors[1] = { ...anchors[1], args: [99, 99] };

    const updated = fromAnchors(commands, anchors);
    expect(serializePathData(updated)).toBe('M0,0 L99,99 Z');
  });

  it('leaves the closing command intact when anchors are edited', () => {
    const commands = parsePathData('M0 0 L1 1 Z');
    const updated = fromAnchors(commands, toAnchors(commands));
    expect(updated[2]).toEqual({ command: 'Z', args: [] });
  });
});
