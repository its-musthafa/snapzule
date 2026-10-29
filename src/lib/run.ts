// A completed solve, captured for verification + leaderboard submission.
//
// `swaps` is the full append-only move log (see usePuzzle). The server replays
// it via `replayBoard` to confirm the run actually reaches a solved state
// before anything is published — clients are never trusted for the score.

import type { Swap } from "./puzzle";

export type GameMode = "normal" | "seeded" | "attack";

export interface PuzzleRun {
  seed: string;
  grid: number;
  /**
   * Leaderboard score = total swaps applied (undos included). Tied directly to
   * `swaps.length`, so it is trivially verifiable server-side and undos cost
   * you moves. Distinct from the on-screen MOVES counter, which nets out undos.
   */
  moves: number;
  /** Wall-clock solve time in ms (tiebreak only). Server stamps the truth. */
  timeMs: number;
  swaps: Swap[];
  mode: GameMode;
  /** Client clock at solve — informational; server uses its own timestamp. */
  createdAt: number;
}
