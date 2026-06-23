"use client";

import { useEffect, useRef, useState } from "react";
import { getBest, type BestScore } from "@/lib/scores";
import { downloadWinCard } from "@/lib/wincard";

export interface WinScreenProps {
  moves: number;
  seconds: number;
  gridSize: number;
  seed: string;
  imageDataUrl: string;
  records: { bestMoves: boolean; bestTime: boolean };
  onPlayAgain: () => void;
  onRetake: () => void;
}

function fmtTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function WinScreen({
  moves,
  seconds,
  gridSize,
  seed,
  imageDataUrl,
  records,
  onPlayAgain,
  onRetake,
}: WinScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [best, setBest] = useState<BestScore | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Read the stored best after the solve has been recorded.
  useEffect(() => {
    setBest(getBest(gridSize));
  }, [gridSize]);

  const handleShare = async () => {
    const url = `${window.location.origin}/game?grid=${gridSize}&seed=${encodeURIComponent(seed)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard blocked — fall back to a prompt
      window.prompt("Copy this scramble link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setSaving(true);
    try {
      await downloadWinCard({ imageDataUrl, gridSize, moves, seconds });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const fire = confetti.create(canvas, { resize: true, useWorker: true });

      // Updated confetti colors to match the Brutalist theme
      const brutalColors = [
        "#ffcc00",
        "#a855f7",
        "#ef4444",
        "#06b6d4",
        "#000000",
      ];

      // Burst from both sides
      const left = () =>
        fire({
          particleCount: 60,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
          colors: brutalColors,
        });
      const right = () =>
        fire({
          particleCount: 60,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
          colors: brutalColors,
        });

      left();
      right();
      const t1 = setTimeout(() => {
        left();
        right();
      }, 600);
      const t2 = setTimeout(() => {
        left();
        right();
      }, 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    });
  }, []);

  const timeStr = fmtTime(seconds);
  const isNewBest = records.bestMoves || records.bestTime;

  return (
    <div className="relative flex flex-col items-center justify-center gap-10 py-10 w-full z-10">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 w-full h-full z-50"
      />

      {/* Win title */}
      <div className="flex flex-col items-center gap-4 z-20">
        <p className="font-bold text-black border-2 border-black px-4 py-1 bg-white uppercase tracking-widest text-sm shadow-[3px_3px_0px_0px_#000] transform -rotate-2">
          PUZZLE COMPLETE
        </p>
        <h2 className="brutal-heading text-6xl sm:text-8xl bg-green-400 text-black px-8 py-2 border-4 border-black shadow-[8px_8px_0px_0px_#000] transform rotate-1">
          YOU WIN!
        </h2>
        {isNewBest && (
          <p className="brutal-heading text-2xl bg-[var(--brutal-red)] text-white px-5 py-1 border-4 border-black shadow-[4px_4px_0px_0px_#000] transform -rotate-3 animate-pulse">
            ⭐ NEW BEST!
          </p>
        )}
      </div>

      {/* Stats Board */}
      <div className="brutal-box bg-white p-6 md:p-8 flex flex-wrap justify-center gap-6 md:gap-10 border-4 border-black shadow-[8px_8px_0px_0px_#000] z-20">
        <div className="flex flex-col items-center bg-gray-100 border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_#000] transform -rotate-1 min-w-[120px]">
          <span className="font-bold text-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 mb-2 w-full text-center">
            Grid
          </span>
          <span className="brutal-heading text-4xl text-[var(--brutal-blue)]">
            {gridSize}×{gridSize}
          </span>
        </div>

        <div className="flex flex-col items-center bg-gray-100 border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_#000] transform rotate-1 min-w-[120px]">
          <span className="font-bold text-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 mb-2 w-full text-center">
            Moves
          </span>
          <span className="brutal-heading text-4xl text-[var(--brutal-red)]">
            {moves}
          </span>
          <span className="font-bold text-[10px] uppercase tracking-wider mt-1 text-gray-600">
            {records.bestMoves
              ? "★ BEST!"
              : best
                ? `best ${best.moves}`
                : " "}
          </span>
        </div>

        <div className="flex flex-col items-center bg-gray-100 border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_#000] transform -rotate-1 min-w-[120px]">
          <span className="font-bold text-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 mb-2 w-full text-center">
            Time
          </span>
          <span className="brutal-heading text-4xl text-[var(--brutal-purple)]">
            {timeStr}
          </span>
          <span className="font-bold text-[10px] uppercase tracking-wider mt-1 text-gray-600">
            {records.bestTime
              ? "★ BEST!"
              : best
                ? `best ${fmtTime(best.seconds)}`
                : " "}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap justify-center gap-6 mt-4 z-20">
        <button
          onClick={onPlayAgain}
          className="brutal-btn bg-yellow text-black text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:-rotate-2"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={onRetake}
          className="brutal-btn bg-purple text-white text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:rotate-2"
        >
          NEW SELFIE
        </button>
        <button
          onClick={handleShare}
          className="brutal-btn bg-[var(--brutal-blue)] text-white text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:-rotate-2"
        >
          {copied ? "LINK COPIED!" : "SHARE SCRAMBLE"}
        </button>
        <button
          onClick={handleDownload}
          disabled={saving}
          className="brutal-btn bg-green-400 text-black text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:rotate-2 disabled:opacity-60"
        >
          {saving ? "SAVING..." : "💾 SAVE CARD"}
        </button>
      </div>
    </div>
  );
}
