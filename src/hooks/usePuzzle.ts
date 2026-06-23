"use client";

import { useState, useCallback } from "react";

export interface Tile {
  id: number; // original position (0 = top-left)
  currentIndex: number; // where it is now in the grid
}

export interface PuzzleState {
  imageDataUrl: string; // base64 snapshot
  tiles: Tile[];
  gridSize: number; // e.g. 3 for 3x3
  solved: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isSolved(tiles: Tile[]): boolean {
  return tiles.every((t) => t.id === t.currentIndex);
}

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);

  const generate = useCallback(
    (video: HTMLVideoElement, gridSize: number = 3) => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      // Mirror horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL("image/png");
      const total = gridSize * gridSize;

      const ordered: Tile[] = Array.from({ length: total }, (_, i) => ({
        id: i,
        currentIndex: i,
      }));

      let shuffled: Tile[];
      do {
        shuffled = shuffle(ordered).map((t, idx) => ({
          ...t,
          currentIndex: idx,
        }));
      } while (isSolved(shuffled));

      setPuzzle({ imageDataUrl, tiles: shuffled, gridSize, solved: false });
    },
    [],
  );

  const swapTiles = useCallback((indexA: number, indexB: number) => {
    setPuzzle((prev) => {
      if (!prev) return prev;
      const tiles = [...prev.tiles];
      const a = tiles.findIndex((t) => t.currentIndex === indexA);
      const b = tiles.findIndex((t) => t.currentIndex === indexB);
      if (a === -1 || b === -1) return prev;
      tiles[a] = { ...tiles[a], currentIndex: indexB };
      tiles[b] = { ...tiles[b], currentIndex: indexA };
      const solved = isSolved(tiles);
      return { ...prev, tiles, solved };
    });
  }, []);

  const reset = useCallback(() => setPuzzle(null), []);

  return { puzzle, generate, swapTiles, reset };
}
