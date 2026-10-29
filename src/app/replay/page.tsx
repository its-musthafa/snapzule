"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { scrambleBoard, type Board } from "@/lib/puzzle";
import { parseReplayParams } from "@/lib/replayCodec";

// Build id→index position snapshots for every step (0 = scramble, last = solved).
function buildStates(seed: string, grid: number, swaps: [number, number][]) {
  const cells = grid * grid;
  const board: Board = scrambleBoard(seed, grid); // board[index] = id
  const posOf = (b: Board) => {
    const p = new Array<number>(cells);
    for (let i = 0; i < cells; i++) p[b[i]] = i;
    return p;
  };
  const states = [posOf(board)];
  for (const [a, b] of swaps) {
    [board[a], board[b]] = [board[b], board[a]];
    states.push(posOf(board));
  }
  return states;
}

const SPEEDS = [
  { label: "0.5×", ms: 800 },
  { label: "1×", ms: 450 },
  { label: "2×", ms: 220 },
];

function ReplayContent() {
  const sp = useSearchParams();
  const params = useMemo(() => parseReplayParams((k) => sp.get(k)), [sp]);

  const states = useMemo(
    () =>
      params ? buildStates(params.seed, params.grid, params.swaps) : null,
    [params],
  );

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);

  const total = states ? states.length - 1 : 0;
  const solved = step >= total;

  useEffect(() => {
    if (!playing || !states) return;
    if (step >= states.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), SPEEDS[speedIdx].ms);
    return () => clearTimeout(t);
  }, [playing, step, speedIdx, states]);

  if (!params || !states) {
    return (
      <div className="brutal-box bg-white p-8 text-center max-w-md z-10">
        <p className="brutal-heading text-3xl mb-3">BROKEN REPLAY</p>
        <p className="font-bold mb-6">This replay link is malformed or empty.</p>
        <Link
          href="/"
          className="brutal-btn bg-yellow text-black text-lg py-3 px-7 border-4 border-black shadow-[4px_4px_0px_0px_#000] inline-block"
        >
          ← MENU
        </Link>
      </div>
    );
  }

  const { seed, grid } = params;
  const cells = grid * grid;
  const positions = states[step];
  const pct = 100 / grid;

  const restart = () => {
    setStep(0);
    setPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="brutal-heading text-4xl sm:text-5xl bg-purple text-white px-5 py-2 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform -rotate-1">
          ▶ REPLAY
        </h1>
        <p className="font-bold text-xs uppercase tracking-widest bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
          {grid}×{grid} · {total} moves · scramble {seed}
        </p>
      </div>

      {/* Board */}
      <div className="relative w-full aspect-square brutal-box bg-white p-2">
        <div className="relative w-full h-full">
          {Array.from({ length: cells }, (_, id) => {
            const pos = positions[id];
            const row = Math.floor(pos / grid);
            const col = pos % grid;
            const home = pos === id;
            return (
              <div
                key={id}
                className="absolute flex items-center justify-center border-2 border-black font-bold transition-all duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  height: `${pct}%`,
                  top: `${row * pct}%`,
                  left: `${col * pct}%`,
                  backgroundColor: `hsl(${(id / cells) * 320}, 75%, ${home ? 60 : 78}%)`,
                  fontSize: `${Math.max(10, 28 - grid * 2)}px`,
                  boxShadow: home ? "inset 0 0 0 3px #000" : "none",
                }}
              >
                {id + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full flex items-center gap-3">
        <span className="font-bold text-xs w-16">
          {step}/{total}
        </span>
        <input
          type="range"
          min={0}
          max={total}
          value={step}
          onChange={(e) => {
            setPlaying(false);
            setStep(Number(e.target.value));
          }}
          className="flex-1 accent-purple"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3">
        {solved ? (
          <button
            onClick={restart}
            className="brutal-btn bg-yellow text-black text-lg py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
          >
            ↺ REPLAY
          </button>
        ) : (
          <button
            onClick={() => setPlaying((p) => !p)}
            className="brutal-btn bg-[var(--brutal-blue)] text-white text-lg py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
          >
            {playing ? "⏸ PAUSE" : "▶ PLAY"}
          </button>
        )}
        <button
          onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
          className="brutal-btn bg-white text-black text-lg py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          {SPEEDS[speedIdx].label}
        </button>
      </div>

      {solved && (
        <p className="brutal-heading text-xl bg-green-400 text-black px-5 py-1 border-4 border-black shadow-[4px_4px_0px_0px_#000] transform rotate-1">
          ✓ SOLVED
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <Link
          href={`/game?grid=${grid}&seed=${encodeURIComponent(seed)}`}
          className="brutal-btn bg-red text-white text-base py-2 px-5 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          PLAY THIS SCRAMBLE
        </Link>
        <Link
          href="/"
          className="brutal-btn bg-white text-black text-base py-2 px-5 border-4 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          MAKE YOUR OWN
        </Link>
      </div>
    </div>
  );
}

export default function ReplayPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(#000 2px, transparent 2px)`,
          backgroundSize: "24px 24px",
        }}
      />
      <Suspense>
        <ReplayContent />
      </Suspense>
    </main>
  );
}
