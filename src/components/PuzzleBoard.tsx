"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { PuzzleState } from "@/hooks/usePuzzle";
import { usePinchDrag } from "@/hooks/usePinchDrag";
import PuzzleTile from "./PuzzleTile";

export interface PuzzleBoardProps {
  puzzle: PuzzleState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSwap: (indexA: number, indexB: number) => void;
  onUndo: () => void;
  onRetake: () => void;
}

// Slightly adjusted to ensure it fits well side-by-side
const BOARD_SIZE = "min(90vw, 520px)";

export default function PuzzleBoard({
  puzzle,
  videoRef,
  onSwap,
  onUndo,
  onRetake,
}: PuzzleBoardProps) {
  const mouseDragSource = useRef<number | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);

  const { tiles, gridSize, imageDataUrl, solved } = puzzle;

  // Hint peek: ghost the full solved image over the board briefly.
  const [showHint, setShowHint] = useState(false);
  const triggerHint = useCallback(() => {
    setShowHint(true);
    setTimeout(() => setShowHint(false), 1500);
  }, []);

  // Combo "+1" pop: which tile ids just landed home.
  const prevCorrectRef = useRef<Set<number>>(new Set());
  const [popIds, setPopIds] = useState<number[]>([]);
  useEffect(() => {
    const nowCorrect = new Set(
      tiles.filter((t) => t.id === t.currentIndex).map((t) => t.id),
    );
    const newly = [...nowCorrect].filter((id) => !prevCorrectRef.current.has(id));
    prevCorrectRef.current = nowCorrect;
    if (newly.length && !solved) {
      setPopIds(newly);
      const to = setTimeout(() => setPopIds([]), 700);
      return () => clearTimeout(to);
    }
  }, [tiles, solved]);

  const handleSwap = useCallback(
    (a: number, b: number) => {
      if (a !== b) onSwap(a, b);
    },
    [onSwap],
  );

  const { pinchState } = usePinchDrag({
    videoRef,
    pipCanvasRef,
    gridSize,
    onSwap: handleSwap,
    onPeace: triggerHint,
    enabled: !solved,
  });

  const ordered = [...tiles].sort((a, b) => a.currentIndex - b.currentIndex);

  const handleMouseDragStart = (index: number) => {
    mouseDragSource.current = index;
  };
  const handleMouseDrop = (index: number) => {
    if (mouseDragSource.current === null || mouseDragSource.current === index)
      return;
    onSwap(mouseDragSource.current, index);
    mouseDragSource.current = null;
  };

  const hoverCol =
    pinchState.hoverIndex !== null ? pinchState.hoverIndex % gridSize : null;
  const hoverRow =
    pinchState.hoverIndex !== null
      ? Math.floor(pinchState.hoverIndex / gridSize)
      : null;

  return (
    // Changed to lg:flex-row to make it side-by-side on desktop
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-10 w-full max-w-6xl mx-auto">
      {/* ── Puzzle grid (Left Side) ── */}
      <div
        className="relative z-10 shrink-0"
        style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      >
        <div
          className={`
            grid gap-1 bg-black border-4 border-black w-full h-full shadow-[8px_8px_0px_0px_#000]
            ${solved ? "border-green-500 shadow-[8px_8px_0px_0px_#22c55e]" : ""}
            transition-colors duration-300
          `}
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {ordered.map((tile) => {
            const isHovered = pinchState.hoverIndex === tile.currentIndex;
            const isDragSource = pinchState.dragFromIndex === tile.currentIndex;
            return (
              <PuzzleTile
                key={tile.id}
                tile={tile}
                gridSize={gridSize}
                imageDataUrl={imageDataUrl}
                currentIndex={tile.currentIndex}
                onDragStart={handleMouseDragStart}
                onDrop={handleMouseDrop}
                isSolved={solved}
                isGestureHover={isHovered && !isDragSource}
                isGestureDragging={isDragSource}
                isPopping={popIds.includes(tile.id)}
              />
            );
          })}
        </div>

        {/* Hint peek — ghost of the full solved image over the board */}
        {showHint && (
          <div
            className="absolute inset-0 z-40 pointer-events-none border-4 border-[var(--brutal-yellow)] opacity-80 transition-opacity"
            style={{
              backgroundImage: `url(${imageDataUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="absolute top-2 left-2 bg-black text-[var(--brutal-yellow)] brutal-heading text-lg px-2 py-0.5">
              HINT
            </span>
          </div>
        )}

        {/* ── Floating hand cursor on the puzzle board ── */}
        {!solved &&
          pinchState.handX !== null &&
          pinchState.handY !== null &&
          hoverCol !== null &&
          hoverRow !== null && (
            <>
              <div
                className="absolute pointer-events-none border-4 transition-all duration-75 z-20"
                style={{
                  borderColor: pinchState.isPinching
                    ? "var(--brutal-purple)"
                    : "var(--brutal-yellow)",
                  width: `calc(${BOARD_SIZE} / ${gridSize} - 4px)`,
                  height: `calc(${BOARD_SIZE} / ${gridSize} - 4px)`,
                  left: `calc(${hoverCol} * ${BOARD_SIZE} / ${gridSize} + 2px)`,
                  top: `calc(${hoverRow} * ${BOARD_SIZE} / ${gridSize} + 2px)`,
                }}
              />
              <div
                className="absolute pointer-events-none w-5 h-5 border-2 border-black -translate-x-1/2 -translate-y-1/2 transition-all duration-75 z-30"
                style={{
                  left: `calc(${pinchState.handX} * ${BOARD_SIZE})`,
                  top: `calc(${pinchState.handY} * ${BOARD_SIZE})`,
                  backgroundColor: pinchState.isPinching
                    ? "var(--brutal-purple)"
                    : "var(--brutal-yellow)",
                  boxShadow: "3px 3px 0px 0px #000",
                  transform: `translate(-50%, -50%) scale(${pinchState.isPinching ? 0.8 : 1})`,
                }}
              />
            </>
          )}
      </div>

      {/* ── Controls Area (Right Side Panel on Desktop) ── */}
      <div
        className="flex flex-col sm:flex-row lg:flex-col gap-6 w-full lg:w-72 shrink-0"
        style={{ maxWidth: BOARD_SIZE }} // keeps it constrained on mobile
      >
        {/* PiP camera block */}
        {!solved && (
          <div className="brutal-box flex-1 bg-white p-4 flex flex-col sm:flex-row lg:flex-col items-center gap-4">
            <div className="relative border-4 border-black w-32 sm:w-40 lg:w-full flex-shrink-0 bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
              <canvas
                ref={pipCanvasRef}
                width={240}
                height={180}
                className="block w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-center brutal-heading text-xs py-1.5 border-t-2 border-black">
                {pinchState.isPinching ? "👌 GRABBING" : "✋ PINCH"}
              </div>
            </div>
            <div className="font-bold text-sm text-black leading-snug text-center lg:text-left w-full">
              Point your hand at the board & pinch to swap tiles. Or use your
              mouse.
            </div>
          </div>
        )}

        {/* Undo + Hint buttons */}
        {!solved && (
          <div className="flex gap-3 w-full">
            <button
              onClick={onUndo}
              className="brutal-btn bg-white flex-1 justify-center text-lg py-3"
            >
              ↩ UNDO
            </button>
            <button
              onClick={triggerHint}
              className="brutal-btn bg-yellow text-black flex-1 justify-center text-lg py-3"
            >
              👁 HINT
            </button>
          </div>
        )}

        {/* Retake Button */}
        {!solved && (
          <button
            onClick={onRetake}
            className="brutal-btn bg-white w-full flex justify-center text-xl lg:py-6"
          >
            ↻ RETAKE
          </button>
        )}
      </div>
    </div>
  );
}
