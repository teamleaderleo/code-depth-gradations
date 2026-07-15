export type TintMode = 'auto' | 'lighter' | 'darker' | 'custom';

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

export function depthSlot(depth: number, maxDepth: number): number | undefined {
  if (depth < 1 || maxDepth < 1) {
    return undefined;
  }

  return Math.min(Math.floor(depth), Math.floor(maxDepth)) - 1;
}

export function opacityForDepth(
  depth: number,
  maxDepth: number,
  minimumOpacity: number,
  maximumOpacity: number,
  curveExponent: number,
): number | undefined {
  const slot = depthSlot(depth, maxDepth);
  if (slot === undefined) {
    return undefined;
  }

  const safeMaximumDepth = Math.max(1, Math.floor(maxDepth));
  const low = clamp(minimumOpacity, 0, 1);
  const high = clamp(maximumOpacity, low, 1);
  const exponent = clamp(curveExponent, 0.1, 5);
  const progress = safeMaximumDepth === 1 ? 1 : slot / (safeMaximumDepth - 1);

  return low + ((high - low) * Math.pow(progress, exponent));
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return parseHexColor(candidate) ? candidate : fallback;
}

export function rgbaFromHex(hexColor: string, opacity: number): string | undefined {
  const rgb = parseHexColor(hexColor);
  if (!rgb) {
    return undefined;
  }

  const alpha = Number(clamp(opacity, 0, 1).toFixed(4));
  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function parseHexColor(value: string): { red: number; green: number; blue: number } | undefined {
  const shortMatch = /^#([\da-f])([\da-f])([\da-f])$/i.exec(value);
  if (shortMatch) {
    return {
      red: Number.parseInt(shortMatch[1] + shortMatch[1], 16),
      green: Number.parseInt(shortMatch[2] + shortMatch[2], 16),
      blue: Number.parseInt(shortMatch[3] + shortMatch[3], 16),
    };
  }

  const longMatch = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!longMatch) {
    return undefined;
  }

  return {
    red: Number.parseInt(longMatch[1], 16),
    green: Number.parseInt(longMatch[2], 16),
    blue: Number.parseInt(longMatch[3], 16),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}
