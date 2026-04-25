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
}

export default function PuzzleTile({
  tile,
  gridSize,
  imageDataUrl,
  currentIndex,
  onDragStart,
  onDrop,
  isSolved,
}: PuzzleTileProps) {
  const dragOver = useRef(false);

  // Which row/col this tile ORIGINALLY belongs to
  const origRow = Math.floor(tile.id / gridSize);
  const origCol = tile.id % gridSize;

  // Use calc() to shift background by exact tile-sized offsets.
  // Each tile is (100/gridSize)% of the container wide/tall.
  // background-position shifts in terms of the container size:
  // shift = origCol * (100/gridSize)% of container = origCol * (1/gridSize) * containerWidth
  // Expressed as calc: `calc(origCol * 100% / gridSize)`  ... but since bg-size is gridSize*100%,
  // we need the shift to be origCol tile-widths. One tile-width in bg-pos units = 100/(gridSize-1)%.
  // Safest: use pixel calc via container-relative units.
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
        relative w-full aspect-square rounded-sm cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        ${isCorrect && !isSolved ? "ring-2 ring-green-400/60" : ""}
        ${isSolved ? "cursor-default" : "hover:brightness-110"}
      `}
      style={{
        backgroundImage: `url(${imageDataUrl})`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        backgroundPosition: `${bgPosX} ${bgPosY}`,
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle tile number (dev aid, remove in Phase 6) */}
      <span className="absolute bottom-1 right-1 text-[10px] text-white/30 font-mono select-none">
        {tile.id}
      </span>
    </div>
  );
}
