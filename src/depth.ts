export type PaletteOverflow = 'clamp' | 'cycle';

export function normalizeIndentSize(value: unknown, fallback = 4): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return Math.max(1, Math.floor(numeric));
}

export function visualIndentColumns(text: string, indentSize: number): number {
  const tabSize = normalizeIndentSize(indentSize);
  let columns = 0;

  for (const character of text) {
    if (character === ' ') {
      columns += 1;
      continue;
    }

    if (character === '\t') {
      columns += tabSize - (columns % tabSize);
      continue;
    }

    break;
  }

  return columns;
}

export function indentationDepth(text: string, indentSize: number): number {
  return Math.floor(visualIndentColumns(text, indentSize) / normalizeIndentSize(indentSize));
}

export function paletteIndex(
  depth: number,
  paletteLength: number,
  overflow: PaletteOverflow,
): number | undefined {
  if (depth < 1 || paletteLength < 1) {
    return undefined;
  }

  const zeroBasedDepth = Math.floor(depth) - 1;
  if (overflow === 'cycle') {
    return zeroBasedDepth % paletteLength;
  }

  return Math.min(zeroBasedDepth, paletteLength - 1);
}
