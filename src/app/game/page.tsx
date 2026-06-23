"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { CameraViewProps } from "@/components/CameraView";
import type { GestureOverlayProps } from "@/components/GestureOverlay";
import type { CountdownOverlayProps } from "@/components/CountdownOverlay";
import type { PuzzleBoardProps } from "@/components/PuzzleBoard";
import type { WinScreenProps } from "@/components/WinScreen";
import { usePuzzle } from "@/hooks/usePuzzle";
import { saveScore } from "@/lib/scores";

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
const WinScreen = dynamic<WinScreenProps>(
  () => import("@/components/WinScreen"),
  { ssr: false },
);

type Stage = "camera" | "countdown" | "puzzle" | "win" | "lose";

// Time-attack budget (seconds) per grid size.
const ATTACK_BUDGET: Record<number, number> = {
  2: 30,
  3: 75,
  4: 150,
  5: 270,
  6: 420,
};

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gridSize = Math.min(
    6,
    Math.max(2, Number(searchParams.get("grid") ?? 3)),
  );
  const seed = searchParams.get("seed") ?? undefined;
  const attackMode = searchParams.get("mode") === "attack";
  const budget = ATTACK_BUDGET[gridSize] ?? 120;

  const videoRef = useRef<HTMLVideoElement>(null);
  const resetGestureRef = useRef<(() => void) | null>(null);
  const [stage, setStage] = useState<Stage>("camera");
  const [isUpload, setIsUpload] = useState(false);
  const {
    puzzle,
    generate,
    generateFromImage,
    swapTiles,
    reset: resetPuzzle,
  } = usePuzzle();

  // Stats
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [records, setRecords] = useState({ bestMoves: false, bestTime: false });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Upload mode: an image stashed in sessionStorage skips camera + countdown.
  useEffect(() => {
    const dataUrl = sessionStorage.getItem("snapzule:upload");
    if (!dataUrl) return;
    sessionStorage.removeItem("snapzule:upload");
    setIsUpload(true);
    generateFromImage(dataUrl, gridSize, { seed });
    setMoves(0);
    startTimer();
    setStage("puzzle");
  }, [generateFromImage, gridSize, seed, startTimer]);

  // Time-attack: lose when the budget runs out.
  useEffect(() => {
    if (attackMode && stage === "puzzle" && seconds >= budget) {
      stopTimer();
      setStage("lose");
    }
  }, [attackMode, stage, seconds, budget, stopTimer]);

  const handleSnap = useCallback(() => setStage("countdown"), []);

  const handleCountdownComplete = useCallback(() => {
    if (videoRef.current) generate(videoRef.current, gridSize, { seed });
    setMoves(0);
    startTimer();
    setStage("puzzle");
  }, [generate, gridSize, seed, startTimer]);

  const handleSwap = useCallback(
    (a: number, b: number) => {
      swapTiles(a, b);
      setMoves((m) => m + 1);
    },
    [swapTiles],
  );

  // Watch for solve
  useEffect(() => {
    if (puzzle?.solved) {
      stopTimer();
      setRecords(saveScore(gridSize, moves, seconds));
      setTimeout(() => setStage("win"), 300);
    }
    // moves/seconds intentionally captured at solve time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.solved, stopTimer, gridSize]);

  const handleRetake = useCallback(() => {
    resetPuzzle();
    resetGestureRef.current?.();
    stopTimer();
    setMoves(0);
    setSeconds(0);
    setIsUpload(false);
    setStage("camera");
  }, [resetPuzzle, stopTimer]);

  const handlePlayAgain = useCallback(() => {
    resetPuzzle();
    resetGestureRef.current?.();
    stopTimer();
    setMoves(0);
    setSeconds(0);
    setIsUpload(false);
    setStage("camera");
  }, [resetPuzzle, stopTimer]);

  const remaining = Math.max(0, budget - seconds);
  const displaySeconds = attackMode ? remaining : seconds;
  const lowTime = attackMode && remaining <= 10;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const timeStr =
    mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8 relative overflow-hidden">
      {/* Dot Pattern Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(#000 2px, transparent 2px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Command Bar */}
      <div className="w-full max-w-5xl brutal-box bg-white p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        <button
          onClick={() => router.push("/")}
          className="brutal-btn bg-yellow text-sm px-6 py-2 whitespace-nowrap"
        >
          ← BACK TO MENU
        </button>

        <h1 className="brutal-heading text-4xl hidden md:flex gap-2">
          <span className="bg-black text-white px-2 transform -rotate-2">
            SNAP
          </span>
          <span className="bg-purple text-white px-2 transform rotate-2">
            ZULE
          </span>
        </h1>

        {/* Live stats space (keeps layout stable even when empty) */}
        <div className="flex gap-4 min-w-[200px] justify-end">
          {stage === "puzzle" ? (
            <>
              <div className="border-4 border-black px-4 py-1 bg-gray-100 font-bold shadow-[3px_3px_0px_0px_#000]">
                MOVES: <span className="text-red text-lg">{moves}</span>
              </div>
              <div
                className={`border-4 border-black px-4 py-1 font-bold shadow-[3px_3px_0px_0px_#000] ${
                  lowTime ? "bg-red text-white animate-pulse" : "bg-gray-100"
                }`}
              >
                {attackMode ? "LEFT" : "TIME"}:{" "}
                <span
                  className={`text-lg ${lowTime ? "text-white" : "text-purple"}`}
                >
                  {timeStr}
                </span>
              </div>
            </>
          ) : (
            <div className="border-4 border-black px-4 py-1 bg-gray-200 text-gray-400 font-bold shadow-[3px_3px_0px_0px_#000] border-dashed">
              AWAITING SNAP...
            </div>
          )}
        </div>
      </div>

      {/* Game Area Container */}
      <div className="w-full max-w-5xl flex-grow flex items-center justify-center z-10">
        {/* Camera — always mounted but hidden dynamically */}
        <div
          className={`relative w-full aspect-video brutal-box p-1 bg-white
            ${stage === "camera" ? "border-black" : ""}
            ${stage === "countdown" ? "border-red scale-[1.02] transition-transform duration-300" : ""}
            ${stage === "puzzle" || stage === "win" || stage === "lose" ? "hidden" : "block"}
          `}
        >
          {/* Black inner frame for the video */}
          <div className="w-full h-full bg-black relative overflow-hidden border-2 border-black">
            {!isUpload && (
              <CameraView
                onStreamReady={(v) => {
                  (
                    videoRef as React.MutableRefObject<HTMLVideoElement>
                  ).current = v;
                }}
              />
            )}
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
        </div>

        {/* Puzzle / Win Screen */}
        {(stage === "puzzle" || stage === "win") &&
          puzzle &&
          (stage === "win" ? (
            <WinScreen
              moves={moves}
              seconds={seconds}
              gridSize={gridSize}
              seed={puzzle.seed}
              records={records}
              onPlayAgain={handlePlayAgain}
              onRetake={handleRetake}
            />
          ) : (
            <PuzzleBoard
              puzzle={puzzle}
              videoRef={videoRef}
              onSwap={handleSwap}
              onRetake={handleRetake}
            />
          ))}

        {/* Time-attack lose screen */}
        {stage === "lose" && (
          <div className="flex flex-col items-center justify-center gap-8 py-10 w-full z-10">
            <h2 className="brutal-heading text-6xl sm:text-8xl bg-red text-white px-8 py-2 border-4 border-black shadow-[8px_8px_0px_0px_#000] transform -rotate-2">
              TIME&apos;S UP!
            </h2>
            <p className="font-bold text-black bg-white border-4 border-black px-6 py-3 shadow-[4px_4px_0px_0px_#000] text-center">
              You made <span className="text-red">{moves}</span> moves before the
              clock ran out.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <button
                onClick={handlePlayAgain}
                className="brutal-btn bg-yellow text-black text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:-rotate-2"
              >
                TRY AGAIN
              </button>
              <button
                onClick={() => router.push("/")}
                className="brutal-btn bg-purple text-white text-xl md:text-2xl py-4 px-8 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform hover:rotate-2"
              >
                MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  );
}
