/**
 * Legacy SVG path parsing / serialization pipeline.
 *
 * These functions are an exact behavioural extraction of the regex-based logic that
 * previously lived inline inside `src/components/SVGPathEditor.tsx`. They are pure and
 * dependency-free so that the current behaviour can be pinned by characterization tests
 * before it is replaced.
 *
 * IMPORTANT: This module intentionally preserves the existing quirks and bugs of the
 * regex pipeline (documented in `plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md`,
 * section 1.4). It is NOT a correct SVG implementation and must not be extended.
 * Phase 1 of that plan replaces this module with a real DOMParser-based engine; the
 * characterization tests in `src/tests/characterization/` exist to make that swap detectable.
 */

export interface ParsedPath {
  index: number;
  raw: string;
  d: string;
  stroke: string;
  fill: string;
  strokeWidth: number;
}

export interface PathNode {
  id: number;
  type: string;
  values: number[];
}

/** Matches `<path ...>` tags only. Any other SVG element is invisible to this pipeline. */
export const PATH_TAG_REGEX = /<path([^>]+)\/?>/g;

/**
 * Reads an attribute out of a raw tag string.
 *
 * QUIRK: the pattern is unanchored, so a request for `d` also matches the tail of
 * `id="..."`. `getAttr('id="x" d="M0 0"', 'd', '')` returns `"x"`, not `"M0 0"`.
 */
export function getAttr(tag: string, attr: string, fallback: string): string {
  const match = new RegExp(`${attr}="([^"]*)"`).exec(tag);
  return match ? match[1] : fallback;
}

/**
 * Extracts the viewBox width, which the editor uses as its grid size.
 * Returns null when there is no viewBox, it is malformed, or the width is not positive.
 */
export function parseViewBoxWidth(svgSource: string): number | null {
  const viewBoxRegex = /viewBox="([^"]+)"/;
  const matchVb = viewBoxRegex.exec(svgSource);
  if (!matchVb) return null;

  const parts = matchVb[1].trim().split(/\s+/);
  if (parts.length !== 4) return null;

  const width = parseFloat(parts[2]);
  if (isNaN(width) || width <= 0) return null;

  return width;
}

/**
 * Scans an SVG document for `<path>` tags and reads their presentation attributes.
 * Non-path elements are ignored entirely.
 */
export function parsePathTags(svgSource: string): ParsedPath[] {
  const regex = new RegExp(PATH_TAG_REGEX.source, 'g');
  const pathsList: ParsedPath[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(svgSource)) !== null) {
    const fullTag = match[0];
    const attrs = match[1];
    const d = getAttr(attrs, 'd', '');
    const stroke = getAttr(attrs, 'stroke', 'none');
    const fill = getAttr(attrs, 'fill', 'none');
    const strokeWidthStr = getAttr(attrs, 'stroke-width', '2');
    const strokeWidth = parseFloat(strokeWidthStr) || 2;

    pathsList.push({ index, raw: fullTag, d, stroke, fill, strokeWidth });
    index++;
  }

  return pathsList;
}

/**
 * Splits a path `d` string into command nodes.
 *
 * QUIRK: the token pattern excludes `e`, so exponent notation (`1e5`) is not tokenized as
 * a single number — the `e` is dropped and the mantissa and exponent become two values.
 */
export function tokenizePathData(pathString: string): PathNode[] {
  const tokens = pathString.match(/[a-df-z]|[+-]?\d+(?:\.\d+)?/gi) || [];

  const parsedNodes: PathNode[] = [];
  let currentNodeType = 'M';
  let valuesAcc: number[] = [];
  let nodeIdCounter = 0;

  tokens.forEach((token) => {
    if (isNaN(Number(token))) {
      if (valuesAcc.length > 0 || parsedNodes.length === 0) {
        if (parsedNodes.length > 0 || valuesAcc.length > 0) {
          parsedNodes.push({ id: nodeIdCounter++, type: currentNodeType, values: valuesAcc });
        }
        valuesAcc = [];
      }
      currentNodeType = token;
    } else {
      valuesAcc.push(Number(token));
    }
  });

  if (valuesAcc.length > 0) {
    parsedNodes.push({ id: nodeIdCounter++, type: currentNodeType, values: valuesAcc });
  }

  return parsedNodes;
}

/** Serializes command nodes back into a path `d` string. */
export function serializePathNodes(nodes: PathNode[]): string {
  return nodes.map((n) => `${n.type}${n.values.join(',')}`).join(' ');
}

/**
 * Rewrites the `d` of the nth `<path>` in the document.
 *
 * QUIRK: the replacement tag is rebuilt from scratch, so every attribute other than
 * d/stroke/fill/stroke-width is discarded — `id`, `class`, `transform`, `opacity` and any
 * other attribute on the edited path are silently lost.
 */
export function replacePathAtIndex(
  svgSource: string,
  targetIndex: number,
  parsedPath: ParsedPath,
  newPathString: string,
): string {
  let index = 0;
  const regex = new RegExp(PATH_TAG_REGEX.source, 'g');

  return svgSource.replace(regex, (match) => {
    if (index === targetIndex) {
      const updated = { ...parsedPath, d: newPathString };
      const strokeAttr = updated.stroke && updated.stroke !== 'none' ? ` stroke="${updated.stroke}"` : '';
      const fillAttr = updated.fill && updated.fill !== 'none' ? ` fill="${updated.fill}"` : ' fill="none"';
      const strokeWidthAttr = updated.stroke && updated.stroke !== 'none' ? ` stroke-width="${updated.strokeWidth}"` : '';

      const newTag = `<path d="${updated.d}"${strokeAttr}${fillAttr}${strokeWidthAttr} stroke-linecap="round" stroke-linejoin="round" />`;
      index++;
      return newTag;
    }
    index++;
    return match;
  });
}
