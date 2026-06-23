"use client";

import { useEffect, useRef } from "react";

export interface WinScreenProps {
  moves: number;
  seconds: number;
  gridSize: number;
  onPlayAgain: () => void;
  onRetake: () => void;
}

export default function WinScreen({
  moves,
  seconds,
  gridSize,
  onPlayAgain,
  onRetake,
}: WinScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

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
        </div>

        <div className="flex flex-col items-center bg-gray-100 border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_#000] transform -rotate-1 min-w-[120px]">
          <span className="font-bold text-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 mb-2 w-full text-center">
            Time
          </span>
          <span className="brutal-heading text-4xl text-[var(--brutal-purple)]">
            {timeStr}
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
      </div>
    </div>
  );
}
