"use client";

import { useRef } from "react";
import type { PuzzleState } from "@/hooks/usePuzzle";
import PuzzleTile from "./PuzzleTile";

export interface PuzzleBoardProps {
  puzzle: PuzzleState;
  onSwap: (indexA: number, indexB: number) => void;
  onRetake: () => void;
}

export default function PuzzleBoard({
  puzzle,
  onSwap,
  onRetake,
}: PuzzleBoardProps) {
  const dragSourceIndex = useRef<number | null>(null);
  const { tiles, gridSize, imageDataUrl, solved } = puzzle;

  // Sort tiles by currentIndex so they render in grid order
  const ordered = [...tiles].sort((a, b) => a.currentIndex - b.currentIndex);

  const handleDragStart = (index: number) => {
    dragSourceIndex.current = index;
  };

  const handleDrop = (index: number) => {
    if (dragSourceIndex.current === null || dragSourceIndex.current === index)
      return;
    onSwap(dragSourceIndex.current, index);
    dragSourceIndex.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Puzzle grid */}
      <div
        className={`
          grid gap-1 rounded-2xl overflow-hidden border
          ${solved ? "border-green-400/60" : "border-gray-700"}
          transition-colors duration-500
        `}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          width: "min(90vw, 520px)",
          height: "min(90vw, 520px)",
        }}
      >
        {ordered.map((tile) => (
          <PuzzleTile
            key={tile.id}
            tile={tile}
            gridSize={gridSize}
            imageDataUrl={imageDataUrl}
            currentIndex={tile.currentIndex}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            isSolved={solved}
          />
        ))}
      </div>

      {/* Status */}
      {!solved && (
        <p className="text-gray-400 text-sm">
          Drag tiles to rearrange — green highlight means correct position ✅
        </p>
      )}

      {/* Retake button */}
      {!solved && (
        <button
          onClick={onRetake}
          className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
        >
          Retake photo
        </button>
      )}
    </div>
  );
}
