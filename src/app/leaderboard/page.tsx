// Daily leaderboard — rule #3 cost shape: the whole board is ONE Firestore doc,
// read inside an ISR-cached server component, so a flood of viewers costs ~one
// read per revalidation window, not one per visit.

import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { todaySeed } from "@/lib/rng";
import type { DailyBoard } from "@/lib/leaderboard";

// Re-fetch at most once a minute; viewers in between share the cached render.
export const revalidate = 60;

function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

interface BoardData {
  board: DailyBoard | null;
  worldTotal: number | null;
  configured: boolean;
}

async function loadBoard(): Promise<BoardData> {
  // Before the env is wired (or if a read fails), degrade to an empty board
  // instead of breaking the build/page.
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { board: null, worldTotal: null, configured: false };
  }
  try {
    const seed = todaySeed();
    const [boardSnap, metaSnap] = await Promise.all([
      getDoc(doc(db, "snapzule_daily", seed)),
      getDoc(doc(db, "snapzule_meta", "global")),
    ]);
    return {
      board: boardSnap.exists() ? (boardSnap.data() as DailyBoard) : null,
      worldTotal: metaSnap.exists()
        ? ((metaSnap.data().totalSolved as number) ?? null)
        : null,
      configured: true,
    };
  } catch {
    return { board: null, worldTotal: null, configured: false };
  }
}

export default async function LeaderboardPage() {
  const { board, worldTotal } = await loadBoard();
  const rows = board?.top ?? [];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 gap-8 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(#000 2px, transparent 2px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="flex flex-col items-center gap-3 z-10 text-center">
        <h1 className="brutal-heading text-5xl sm:text-6xl bg-yellow text-black px-6 py-2 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform -rotate-1">
          📅 DAILY BOARD
        </h1>
        <p className="font-bold text-xs uppercase tracking-widest bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
          Today&apos;s scramble · {board?.seed ?? todaySeed()}
        </p>
        {worldTotal != null && (
          <p className="font-bold text-sm bg-purple text-white border-2 border-black px-4 py-1 shadow-[2px_2px_0px_0px_#000] transform rotate-1">
            🌍 {worldTotal.toLocaleString()} puzzles solved worldwide
          </p>
        )}
      </div>

      <div className="w-full max-w-2xl brutal-box bg-white p-4 sm:p-6 z-10">
        {rows.length === 0 ? (
          <p className="text-center font-bold py-10 text-gray-500 uppercase tracking-wider">
            No entries yet — be the first to solve today&apos;s daily!
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((e, i) => (
              <li
                key={e.uid}
                className={`flex items-center gap-3 border-4 border-black px-3 py-2 shadow-[3px_3px_0px_0px_#000] ${
                  i === 0 ? "bg-yellow" : i < 3 ? "bg-gray-100" : "bg-white"
                }`}
              >
                <span className="brutal-heading text-2xl w-10 text-center shrink-0">
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.photoURL || "/icon.png"}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 border-2 border-black object-cover shrink-0"
                />
                <span className="font-bold truncate flex-1">{e.name}</span>
                <span className="font-bold text-[var(--brutal-red)] shrink-0">
                  {e.moves} mv
                </span>
                <span className="font-bold text-[var(--brutal-purple)] w-16 text-right shrink-0">
                  {fmtTime(e.timeMs)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 z-10">
        <Link
          href={`/game?grid=3&seed=${encodeURIComponent(todaySeed())}`}
          className="brutal-btn bg-red text-white text-lg py-3 px-7 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          PLAY TODAY&apos;S DAILY
        </Link>
        <Link
          href="/"
          className="brutal-btn bg-white text-black text-lg py-3 px-7 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          ← MENU
        </Link>
      </div>
    </main>
  );
}
