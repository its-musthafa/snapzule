"use client";

import { useRef } from "react";
import type { Tile } from "@/hooks/usePuzzle";

export interface PuzzleTileProps {
  tile: Tile;
  gridSize: number;
  imageDataUrl: string;
  currentIndex: number;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
  isSolved: boolean;
  isGestureHover?: boolean;
  isGestureDragging?: boolean;
}

export default function PuzzleTile({
  tile,
  gridSize,
  imageDataUrl,
  currentIndex,
  onDragStart,
  onDrop,
  isSolved,
  isGestureHover,
  isGestureDragging,
}: PuzzleTileProps) {
  const dragOver = useRef(false);

  // Which row/col this tile ORIGINALLY belongs to
  const origRow = Math.floor(tile.id / gridSize);
  const origCol = tile.id % gridSize;

  const bgPosX = `calc(${origCol} * 100% / ${gridSize - 1 || 1})`;
  const bgPosY = `calc(${origRow} * 100% / ${gridSize - 1 || 1})`;

  const isCorrect = tile.id === currentIndex;

  return (
    <div
      draggable={!isSolved}
      onDragStart={() => onDragStart(currentIndex)}
      onDragOver={(e) => {
        e.preventDefault();
        dragOver.current = true;
      }}
      onDragLeave={() => {
        dragOver.current = false;
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragOver.current = false;
        onDrop(currentIndex);
      }}
      className={`
        relative w-full aspect-square cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none bg-white
        ${isCorrect && !isSolved ? "ring-4 ring-inset ring-green-500" : ""}
        ${
          isGestureDragging
            ? "scale-90 ring-4 ring-inset ring-[var(--brutal-purple)] shadow-[8px_8px_0px_0px_#000] z-20 brightness-110"
            : ""
        }
        ${
          isGestureHover && !isGestureDragging
            ? "ring-4 ring-inset ring-[var(--brutal-yellow)] z-10"
            : ""
        }
        ${
          isSolved
            ? "cursor-default"
            : "hover:ring-4 hover:ring-inset hover:ring-black hover:z-10"
        }
      `}
      style={{
        backgroundImage: `url(${imageDataUrl})`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        backgroundPosition: `${bgPosX} ${bgPosY}`,
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle tile number (dev aid, keep it brutalist if visible) */}
      {!isSolved && (
        <span className="absolute bottom-1 right-1 bg-black text-white px-1 text-[10px] font-bold select-none border border-black">
          {tile.id}
        </span>
      )}
    </div>
  );
}
