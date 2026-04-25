"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback } from "react";
import type { CameraViewProps } from "@/components/CameraView";
import type { GestureOverlayProps } from "@/components/GestureOverlay";
import type { CountdownOverlayProps } from "@/components/CountdownOverlay";
import type { PuzzleBoardProps } from "@/components/PuzzleBoard";
import { usePuzzle } from "@/hooks/usePuzzle";

const CameraView = dynamic<CameraViewProps>(
  () => import("@/components/CameraView"),
  { ssr: false },
);
const GestureOverlay = dynamic<GestureOverlayProps>(
  () => import("@/components/GestureOverlay"),
  { ssr: false },
);
const CountdownOverlay = dynamic<CountdownOverlayProps>(
  () => import("@/components/CountdownOverlay"),
  { ssr: false },
);
const PuzzleBoard = dynamic<PuzzleBoardProps>(
  () => import("@/components/PuzzleBoard"),
  { ssr: false },
);

type Stage = "camera" | "countdown" | "puzzle";

const GRID_SIZE = 3;

export default function GamePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resetGestureRef = useRef<(() => void) | null>(null);
  const [stage, setStage] = useState<Stage>("camera");
  const { puzzle, generate, swapTiles, reset: resetPuzzle } = usePuzzle();

  const handleSnap = useCallback(() => {
    setStage("countdown");
  }, []);

  const handleCountdownComplete = useCallback(() => {
    if (videoRef.current) generate(videoRef.current, GRID_SIZE);
    setStage("puzzle");
  }, [generate]);

  const handleRetake = useCallback(() => {
    resetPuzzle();
    resetGestureRef.current?.();
    setStage("camera");
  }, [resetPuzzle]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-10">
      <h2 className="text-3xl font-bold">
        Snap<span className="text-indigo-400">zule</span>
      </h2>

      {/* Camera + countdown */}
      {(stage === "camera" || stage === "countdown") && (
        <div className="relative w-[640px] max-w-full aspect-video rounded-2xl overflow-hidden bg-gray-800 border border-gray-700">
          <CameraView
            onStreamReady={(v) => {
              (videoRef as React.MutableRefObject<HTMLVideoElement>).current =
                v;
            }}
          />
          {stage === "camera" && (
            <GestureOverlay
              videoRef={videoRef}
              onSnap={handleSnap}
              onReset={(fn: () => void) => {
                resetGestureRef.current = fn;
              }}
            />
          )}
          {stage === "countdown" && (
            <CountdownOverlay onComplete={handleCountdownComplete} />
          )}
        </div>
      )}

      {/* Puzzle board */}
      {stage === "puzzle" && puzzle && (
        <PuzzleBoard
          puzzle={puzzle}
          onSwap={swapTiles}
          onRetake={handleRetake}
        />
      )}
    </main>
  );
}
