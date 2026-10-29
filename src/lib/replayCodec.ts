// Self-contained replay sharing: a solve (seed + grid + swaps) packs straight
// into a URL, so a shared replay needs NO Firestore read/write. Tile indices are
// 0..35 (grid ≤ 6 → ≤ 36 cells), each a single base36 char, so a swap is 2 chars.

import type { Swap } from "./puzzle";

const MAX_INDEX = 36; // base36 single-char ceiling (grid 6×6 = 36 cells, idx 0..35)

/** Flatten swaps to a compact base36 string: [[1,8],[3,4]] → "18" + "34". */
export function encodeMoves(swaps: Swap[]): string {
  let out = "";
  for (const [a, b] of swaps) {
    if (a < 0 || b < 0 || a >= MAX_INDEX || b >= MAX_INDEX) {
      throw new Error("index out of base36 range");
    }
    out += a.toString(36) + b.toString(36);
  }
  return out;
}

/** Inverse of encodeMoves. Returns null on malformed input. */
export function decodeMoves(str: string): Swap[] | null {
  if (str.length % 2 !== 0) return null;
  const swaps: Swap[] = [];
  for (let i = 0; i < str.length; i += 2) {
    const a = parseInt(str[i], 36);
    const b = parseInt(str[i + 1], 36);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    swaps.push([a, b]);
  }
  return swaps;
}

export interface ReplayParams {
  seed: string;
  grid: number;
  swaps: Swap[];
}

/** Build a `/replay?...` link from a run. */
export function buildReplayUrl(
  origin: string,
  seed: string,
  grid: number,
  swaps: Swap[],
): string {
  const m = encodeMoves(swaps);
  return `${origin}/replay?seed=${encodeURIComponent(seed)}&grid=${grid}&m=${m}`;
}

/** Parse + validate replay params from a URLSearchParams-like getter. */
export function parseReplayParams(
  get: (key: string) => string | null,
): ReplayParams | null {
  const seed = get("seed");
  const gridRaw = get("grid");
  const m = get("m") ?? "";
  if (!seed || !gridRaw) return null;
  const grid = Number(gridRaw);
  if (!Number.isInteger(grid) || grid < 2 || grid > 6) return null;
  const swaps = decodeMoves(m);
  if (!swaps) return null;
  // All indices must be in range for this grid.
  const cells = grid * grid;
  if (swaps.some(([a, b]) => a >= cells || b >= cells)) return null;
  return { seed, grid, swaps };
}
