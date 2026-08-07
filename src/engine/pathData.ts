/**
 * SVG path data (`d` attribute) tokenizer and serializer.
 *
 * Replaces the ad-hoc regex in `legacySvgPath.ts`, whose token pattern
 * (`/[a-df-z]|[+-]?\d+(?:\.\d+)?/gi`) had three defects:
 *
 *   - `e` was excluded from the command class *and* unhandled by the number pattern, so
 *     exponent notation (`1e3`) split into two separate values.
 *   - Zero-argument commands (`Z`) were never flushed into the output, so closed subpaths
 *     silently opened on the next serialize.
 *   - Arc flags were treated as ordinary numbers, so an arc could not survive a round trip.
 *
 * This implementation follows the SVG path grammar: per-command argument counts, implicit
 * command repetition, exponent notation, and the special single-character flag arguments of
 * the elliptical arc command.
 *
 * Pure and dependency-free.
 */

/** Argument count for each path command, keyed by uppercase letter. */
const ARG_COUNT: Record<string, number> = {
  M: 2, // moveto
  L: 2, // lineto
  H: 1, // horizontal lineto
  V: 1, // vertical lineto
  C: 6, // cubic bezier
  S: 4, // smooth cubic bezier
  Q: 4, // quadratic bezier
  T: 2, // smooth quadratic bezier
  A: 7, // elliptical arc
  Z: 0, // closepath
};

/**
 * When a command is followed by more arguments than it takes, the extra sets repeat
 * implicitly. A repeated `M` becomes `L` (and `m` becomes `l`) per the SVG spec; every other
 * command repeats as itself.
 */
function implicitFollowOn(command: string): string {
  if (command === 'M') return 'L';
  if (command === 'm') return 'l';
  return command;
}

export interface PathCommand {
  /** The command letter, case preserved: uppercase is absolute, lowercase relative. */
  command: string;
  args: number[];
}

const isCommandLetter = (ch: string) => /[MmLlHhVvCcSsQqTtAaZz]/.test(ch);
const isWhitespaceOrComma = (ch: string) => /[\s,]/.test(ch);
const isDigit = (ch: string) => ch >= '0' && ch <= '9';

/**
 * Scans a number starting at `i`, returning the value and the index after it.
 * Handles leading sign, decimals, a leading `.`, and exponent notation.
 */
function scanNumber(input: string, start: number): { value: number; next: number } | null {
  let i = start;

  if (input[i] === '+' || input[i] === '-') i++;

  let sawDigit = false;
  while (i < input.length && isDigit(input[i])) {
    i++;
    sawDigit = true;
  }

  if (input[i] === '.') {
    i++;
    while (i < input.length && isDigit(input[i])) {
      i++;
      sawDigit = true;
    }
  }

  if (!sawDigit) return null;

  // Exponent — only valid if at least one digit follows (optionally signed).
  if (input[i] === 'e' || input[i] === 'E') {
    let j = i + 1;
    if (input[j] === '+' || input[j] === '-') j++;
    if (j < input.length && isDigit(input[j])) {
      while (j < input.length && isDigit(input[j])) j++;
      i = j;
    }
  }

  const value = Number(input.slice(start, i));
  if (Number.isNaN(value)) return null;
  return { value, next: i };
}

/**
 * Scans an arc flag: a single `0` or `1`.
 *
 * The SVG grammar allows flags to run together with the following number without any
 * separator (`a50,50 0 1150,0` is legal), which is why they cannot be read as ordinary
 * numbers.
 */
function scanFlag(input: string, start: number): { value: number; next: number } | null {
  const ch = input[start];
  if (ch === '0' || ch === '1') return { value: Number(ch), next: start + 1 };
  return null;
}

/**
 * Parses a path `d` string into its commands.
 *
 * Malformed trailing input is ignored rather than throwing: real-world SVG contains
 * truncated paths, and refusing to open the document would be worse than dropping the
 * incomplete tail.
 */
export function parsePathData(d: string): PathCommand[] {
  if (!d) return [];

  const out: PathCommand[] = [];
  let i = 0;
  let currentCommand = '';

  const skipSeparators = () => {
    while (i < d.length && isWhitespaceOrComma(d[i])) i++;
  };

  skipSeparators();

  while (i < d.length) {
    if (isCommandLetter(d[i])) {
      currentCommand = d[i];
      i++;
      skipSeparators();
    } else if (!currentCommand) {
      // Junk before any command; nothing sensible to do with it.
      break;
    }

    const upper = currentCommand.toUpperCase();
    const argCount = ARG_COUNT[upper];

    if (argCount === undefined) break;

    if (argCount === 0) {
      out.push({ command: currentCommand, args: [] });
      skipSeparators();
      // A closepath cannot repeat implicitly; require an explicit next command.
      currentCommand = '';
      continue;
    }

    const args: number[] = [];
    let malformed = false;

    for (let a = 0; a < argCount; a++) {
      skipSeparators();

      // Arc: arguments 3 and 4 (0-indexed) are single-character flags.
      const isFlag = upper === 'A' && (a === 3 || a === 4);
      const scanned = isFlag ? scanFlag(d, i) : scanNumber(d, i);

      if (!scanned) {
        malformed = true;
        break;
      }

      args.push(scanned.value);
      i = scanned.next;
    }

    if (malformed) break;

    out.push({ command: currentCommand, args });

    // Subsequent argument groups repeat the command implicitly.
    currentCommand = implicitFollowOn(currentCommand);
    skipSeparators();
  }

  return out;
}

/** Serializes commands back into a `d` string. */
export function serializePathData(commands: PathCommand[]): string {
  return commands
    .map(({ command, args }) => (args.length === 0 ? command : `${command}${args.join(',')}`))
    .join(' ');
}

/**
 * The editable anchor points of a path: one entry per command that carries coordinates.
 *
 * The editor UI drags these. Commands without coordinates (`Z`) are preserved in the command
 * list but produce no draggable anchor.
 */
export interface PathAnchor {
  /** Index into the command list this anchor belongs to. */
  commandIndex: number;
  command: string;
  args: number[];
}

/** Extracts draggable anchors, skipping zero-argument commands. */
export function toAnchors(commands: PathCommand[]): PathAnchor[] {
  const anchors: PathAnchor[] = [];
  commands.forEach((cmd, commandIndex) => {
    if (cmd.args.length === 0) return;
    anchors.push({ commandIndex, command: cmd.command, args: cmd.args });
  });
  return anchors;
}

/** Applies edited anchors back onto the command list, preserving zero-argument commands. */
export function fromAnchors(commands: PathCommand[], anchors: PathAnchor[]): PathCommand[] {
  const next = commands.map((c) => ({ ...c, args: [...c.args] }));
  for (const anchor of anchors) {
    if (next[anchor.commandIndex]) {
      next[anchor.commandIndex] = { command: anchor.command, args: [...anchor.args] };
    }
  }
  return next;
}
