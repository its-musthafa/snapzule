// COPY of src/lib/puzzle.ts (server side). Must stay byte-for-byte equivalent
// in behaviour to the client version, or replay verification will reject
// legitimate runs. If you change one, change both.

import { mulberry32, hashSeed } from "./rng";

export type Swap = [number, number];
export type Board = number[];

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isBoardSolved(board: Board): boolean {
  return board.every((id, i) => id === i);
}

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
  invalid: boolean;
  board: Board;
}

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
