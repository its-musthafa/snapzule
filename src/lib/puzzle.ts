// Canonical, framework-free puzzle model.
//
// This is the SINGLE SOURCE OF TRUTH for how a seed scrambles into a board and
// how swaps mutate it. Both the client (`usePuzzle`) and the future anti-cheat
// Cloud Function replay through these functions, so a run verified server-side
// is guaranteed to match what the player actually did. Keep it pure (no React,
// no DOM) so it can be copied verbatim into the functions codebase.

import { mulberry32, hashSeed } from "./rng";

/** A swap is the pair of grid indices whose tiles exchange places. */
export type Swap = [number, number];

/** board[index] = id of the tile currently sitting at that grid index. */
export type Board = number[];

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Solved when every tile id sits at its home index. */
export function isBoardSolved(board: Board): boolean {
  return board.every((id, i) => id === i);
}

/**
 * Deterministic initial scramble for a seed + grid. Reproduces exactly what
 * `usePuzzle.buildPuzzle` produces (same rng draw count, same reroll-if-solved),
 * so replays line up tile-for-tile.
 */
export function scrambleBoard(seed: string, gridSize: number): Board {
  const total = gridSize * gridSize;
  const ordered = Array.from({ length: total }, (_, i) => i);
  const rng = mulberry32(hashSeed(seed));
  let shuffled: Board;
  do {
    shuffled = shuffle(ordered, rng);
  } while (isBoardSolved(shuffled));
  return shuffled;
}

export interface ReplayResult {
  solved: boolean;
  /** True if any swap referenced an out-of-range index (tampered payload). */
  invalid: boolean;
  board: Board;
}

/**
 * Replay an ordered list of swaps over the scramble for `seed`/`gridSize`.
 * An undo is recorded as the same pair swapped again, so the log is
 * append-only yet still reproduces the exact final board.
 */
export function replayBoard(
  seed: string,
  gridSize: number,
  moves: Swap[],
): ReplayResult {
  const board = scrambleBoard(seed, gridSize);
  for (const [a, b] of moves) {
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0 ||
      a >= board.length ||
      b >= board.length
    ) {
      return { solved: false, invalid: true, board };
    }
    [board[a], board[b]] = [board[b], board[a]];
  }
  return { solved: isBoardSolved(board), invalid: false, board };
}
