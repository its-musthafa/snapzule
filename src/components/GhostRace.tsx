"use client";

// Live ghost race for the daily challenge: the current leader's correct-tile
// count advances on the clock (their swaps spread evenly across their total
// time) while yours advances as you place tiles. One lazy doc read on mount.

import { useEffect, useMemo, useRef, useState } from "react";
import { scrambleBoard, type Board } from "@/lib/puzzle";
import { getGhost, type Ghost } from "@/lib/leaderboard";

export interface GhostRaceProps {
  seed: string;
  grid: number;
  /** Tiles you currently have in their home slot. */
  correct: number;
  total: number;
  /** performance.now() captured when your timer started. */
  startMs: number;
  solved: boolean;
}

function countCorrect(b: Board): number {
  let n = 0;
  for (let i = 0; i < b.length; i++) if (b[i] === i) n++;
  return n;
}

/** Ghost's correct-tile count at each step, timestamped evenly over its run. */
function buildTimeline(ghost: Ghost, seed: string, grid: number) {
  const board = scrambleBoard(seed, grid);
  const pts: { t: number; c: number }[] = [{ t: 0, c: countCorrect(board) }];
  const n = ghost.swaps.length;
  ghost.swaps.forEach(([a, b], k) => {
    [board[a], board[b]] = [board[b], board[a]];
    pts.push({ t: ((k + 1) / n) * ghost.timeMs, c: countCorrect(board) });
  });
  return pts;
}

export default function GhostRace({
  seed,
  grid,
  correct,
  total,
  startMs,
  solved,
}: GhostRaceProps) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [ghostCorrect, setGhostCorrect] = useState(0);
  const finalRef = useRef<{ youMs: number; beat: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    getGhost(seed).then((g) => {
      if (active) setGhost(g);
    });
    return () => {
      active = false;
    };
  }, [seed]);

  const timeline = useMemo(
    () => (ghost ? buildTimeline(ghost, seed, grid) : null),
    [ghost, seed, grid],
  );

  // Advance the ghost on the wall clock until you solve or it finishes.
  useEffect(() => {
    if (!ghost || !timeline || solved) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startMs;
      let c = 0;
      for (const p of timeline) {
        if (p.t <= elapsed) c = p.c;
        else break;
      }
      setGhostCorrect(c);
      if (elapsed < ghost.timeMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ghost, timeline, startMs, solved]);

  // Freeze the verdict the moment you solve.
  useEffect(() => {
    if (solved && ghost && !finalRef.current) {
      const youMs = performance.now() - startMs;
      finalRef.current = { youMs, beat: youMs < ghost.timeMs };
    }
  }, [solved, ghost, startMs]);

  if (!ghost) return null;

  const youPct = total ? (correct / total) * 100 : 0;
  const ghostPct = total ? (ghostCorrect / total) * 100 : 0;
  const ahead = correct >= ghostCorrect;
  const verdict = finalRef.current;

  return (
    <div className="w-full max-w-md brutal-box bg-white p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="brutal-heading text-sm">🏁 RACING {ghost.name}</span>
        {verdict ? (
          <span
            className={`brutal-heading text-sm px-2 border-2 border-black ${
              verdict.beat ? "bg-green-400" : "bg-red text-white"
            }`}
          >
            {verdict.beat ? "YOU WIN!" : "GHOST WINS"}
          </span>
        ) : (
          <span
            className={`font-bold text-xs px-2 py-0.5 border-2 border-black ${
              ahead ? "bg-green-400" : "bg-yellow"
            }`}
          >
            {ahead ? "AHEAD" : "BEHIND"}
          </span>
        )}
      </div>

      <Bar label="YOU" pct={youPct} color="var(--brutal-purple)" />
      <Bar label="GHOST" pct={ghostPct} color="#000" />
    </div>
  );
}

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-[10px] w-12 shrink-0">{label}</span>
      <div className="flex-1 h-4 border-2 border-black bg-gray-100 overflow-hidden">
        <div
          className="h-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
