// Client-side leaderboard surface: submit a run to the anti-cheat function and
// the shared types for the daily board doc.

import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { app, db, FUNCTIONS_REGION } from "./firebase/app";
import type { PuzzleRun } from "./run";
import type { Swap } from "./puzzle";

/** One row in the embedded daily leaderboard (no selfie — Google identity only). */
export interface BoardEntry {
  uid: string;
  name: string;
  photoURL: string | null;
  moves: number;
  timeMs: number;
  at: number;
}

/** Current leader's full run — the ghost you race in the daily challenge. */
export type Ghost = BoardEntry & { swaps: Swap[] };

/** The single `snapzule_daily/{date}` doc — whole board in one read. */
export interface DailyBoard {
  date: string;
  seed: string;
  top: BoardEntry[];
  count: number;
  updatedAt: number;
  /** Current leader's full move list, for ghost racing (Phase 4). */
  ghost?: Ghost;
}

export interface SubmitResult {
  rank: number | null;
  inTop: boolean;
  count: number;
}

/** Send a solved run to `snapzuleSubmitRun`. Requires the user to be signed in
 *  (the function rejects unauthenticated calls). Only the daily seed is eligible. */
export async function submitRun(run: PuzzleRun): Promise<SubmitResult> {
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const call = httpsCallable<
    Pick<PuzzleRun, "seed" | "grid" | "moves" | "timeMs" | "swaps">,
    SubmitResult
  >(functions, "snapzuleSubmitRun");
  const res = await call({
    seed: run.seed,
    grid: run.grid,
    moves: run.moves,
    timeMs: run.timeMs,
    swaps: run.swaps,
  });
  return res.data;
}

/** Fetch today's ghost (the leader's run) for racing. One lazy doc read;
 *  null before Firebase is wired or when no one has set a time yet. */
export async function getGhost(seed: string): Promise<Ghost | null> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
  try {
    const snap = await getDoc(doc(db, "snapzule_daily", seed));
    if (!snap.exists()) return null;
    const ghost = (snap.data() as DailyBoard).ghost;
    return ghost ?? null;
  } catch {
    return null;
  }
}
