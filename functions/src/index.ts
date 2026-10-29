// Snapzule anti-cheat submission. The ONLY writer to the public leaderboard
// and the shared cross-app counter. Clients never write those directly
// (security rules deny it); they call this, it replay-verifies, then publishes.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { replayBoard, type Swap } from "./puzzle";
import { dateSeed } from "./rng";

initializeApp();
const db = getFirestore();

// Region MUST match FUNCTIONS_REGION in src/lib/firebase/app.ts.
const REGION = "us-central1";

const MIN_MS_PER_SWAP = 120; // sub-this is humanly impossible → reject
const MAX_TOP = 100; // leaderboard size held in the single daily doc
const MAX_SWAPS = 5000; // payload sanity cap

interface SubmitData {
  seed: string;
  grid: number;
  moves: number;
  timeMs: number;
  swaps: Swap[];
}

interface BoardEntry {
  uid: string;
  name: string;
  photoURL: string | null;
  moves: number;
  timeMs: number;
  at: number;
}

/** Daily seed must be today's or yesterday's (UTC) — tolerates client timezones
 *  near midnight while still blocking farming of old seeds. */
function isCurrentDailySeed(seed: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seed)) return false;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return seed === dateSeed(now) || seed === dateSeed(yesterday);
}

export const snapzuleSubmitRun = onCall(
  { region: REGION, cors: true },
  async (req) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Sign in to submit a score.");
    }

    const { seed, grid, moves, timeMs, swaps } = (req.data ?? {}) as SubmitData;

    // ---- shape validation -------------------------------------------------
    if (typeof seed !== "string" || !isCurrentDailySeed(seed)) {
      throw new HttpsError(
        "failed-precondition",
        "Only today's daily challenge is eligible for the leaderboard.",
      );
    }
    if (!Number.isInteger(grid) || grid < 2 || grid > 6) {
      throw new HttpsError("invalid-argument", "Bad grid size.");
    }
    if (!Array.isArray(swaps) || swaps.length === 0 || swaps.length > MAX_SWAPS) {
      throw new HttpsError("invalid-argument", "Bad move list.");
    }
    if (!Number.isInteger(moves) || !Number.isInteger(timeMs) || timeMs <= 0) {
      throw new HttpsError("invalid-argument", "Bad run stats.");
    }

    // ---- anti-cheat: replay must actually solve the scramble --------------
    const replay = replayBoard(seed, grid, swaps);
    if (replay.invalid || !replay.solved) {
      throw new HttpsError("invalid-argument", "Run does not solve the puzzle.");
    }
    if (moves !== swaps.length) {
      throw new HttpsError("invalid-argument", "Move count mismatch.");
    }
    if (timeMs < swaps.length * MIN_MS_PER_SWAP) {
      throw new HttpsError("invalid-argument", "Run is implausibly fast.");
    }

    // Identity comes from the verified auth token, never the client payload.
    const entry: BoardEntry = {
      uid: auth.uid,
      name: (auth.token.name as string) || "Player",
      photoURL: (auth.token.picture as string) || null,
      moves,
      timeMs,
      at: Date.now(),
    };

    const dailyRef = db.collection("snapzule_daily").doc(seed);
    const metaRef = db.collection("snapzule_meta").doc("global");
    const globalRef = db.collection("analytics").doc("global"); // cross-app

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(dailyRef);
      const data = snap.exists ? snap.data()! : {};
      let top: BoardEntry[] = Array.isArray(data.top) ? data.top : [];

      // One row per player — keep their best (moves asc, then time asc).
      const existingIdx = top.findIndex((e) => e.uid === auth.uid);
      const isFirstForUser = existingIdx === -1;
      if (!isFirstForUser) {
        const prev = top[existingIdx];
        const improved =
          moves < prev.moves || (moves === prev.moves && timeMs < prev.timeMs);
        if (improved) top[existingIdx] = entry;
      } else {
        top.push(entry);
      }
      top.sort((a, b) => a.moves - b.moves || a.timeMs - b.timeMs);
      top = top.slice(0, MAX_TOP);

      const rankIdx = top.findIndex((e) => e.uid === auth.uid);
      const newCount = (data.count ?? 0) + (isFirstForUser ? 1 : 0);

      const update: Record<string, unknown> = {
        date: seed,
        seed,
        top,
        count: newCount,
        updatedAt: Date.now(),
      };
      // Ghost = the current #1's FULL move list, for Phase-4 ghost racing.
      // Only this submission's swaps are available, so write it only when this
      // run becomes the new leader.
      if (rankIdx === 0) {
        update.ghost = {
          uid: entry.uid,
          name: entry.name,
          photoURL: entry.photoURL,
          moves,
          timeMs,
          swaps,
        };
      }
      tx.set(dailyRef, update, { merge: true });

      // Running totals — single doc + the shared global, both via increment in
      // this same transaction. Every solve counts (not just personal bests).
      tx.set(
        metaRef,
        {
          totalSolved: FieldValue.increment(1),
          [`byGrid.${grid}`]: FieldValue.increment(1),
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      // Namespaced under apps.snapzule (matches sibling apps' shape, e.g.
      // apps.pewpew). merge:true deep-merges, so siblings' maps are untouched
      // and FieldValue.increment still applies inside the nested object.
      tx.set(
        globalRef,
        {
          apps: {
            snapzule: {
              totalSolved: FieldValue.increment(1),
              updatedAt: Date.now(),
            },
          },
        },
        { merge: true },
      );

      return {
        rank: rankIdx >= 0 ? rankIdx + 1 : null,
        inTop: rankIdx >= 0,
        count: newCount,
      };
    });

    return result;
  },
);
