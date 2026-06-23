"use client";

import { useState, useCallback, useRef } from "react";
import { mulberry32, hashSeed } from "@/lib/rng";
import { duotone } from "@/lib/image";

export interface Tile {
  id: number; // original position (0 = top-left)
  currentIndex: number; // where it is now in the grid
}

export interface PuzzleState {
  imageDataUrl: string; // base64 snapshot
  tiles: Tile[];
  gridSize: number; // e.g. 3 for 3x3
  solved: boolean;
  seed: string; // scramble seed — daily/shared, or an auto-generated random one
}

export interface GenerateOpts {
  seed?: string;
  filter?: boolean; // duotone — wired in a later phase
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isSolved(tiles: Tile[]): boolean {
  return tiles.every((t) => t.id === t.currentIndex);
}

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  // Swap history for undo: each entry is the pair of grid indices swapped.
  const historyRef = useRef<[number, number][]>([]);

  // Shared core: given a finished image data URL, scramble & set the puzzle.
  const buildPuzzle = useCallback(
    (imageDataUrl: string, gridSize: number, opts: GenerateOpts = {}) => {
      const total = gridSize * gridSize;

      const ordered: Tile[] = Array.from({ length: total }, (_, i) => ({
        id: i,
        currentIndex: i,
      }));

      // Use the given seed (daily/shared) or mint a random one so every
      // puzzle is reproducible & shareable.
      const seed =
        opts.seed ?? Math.random().toString(36).slice(2, 8).toUpperCase();
      const rng = mulberry32(hashSeed(seed));

      let shuffled: Tile[];
      do {
        shuffled = shuffle(ordered, rng).map((t, idx) => ({
          ...t,
          currentIndex: idx,
        }));
      } while (isSolved(shuffled));

      historyRef.current = [];
      setPuzzle({ imageDataUrl, tiles: shuffled, gridSize, solved: false, seed });
    },
    [],
  );

  /** Build a puzzle from a live webcam frame (mirrored). */
  const generate = useCallback(
    (
      video: HTMLVideoElement,
      gridSize: number = 3,
      opts: GenerateOpts = {},
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      // Mirror horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before pixel ops

      if (opts.filter) duotone(canvas);

      buildPuzzle(canvas.toDataURL("image/png"), gridSize, opts);
    },
    [buildPuzzle],
  );

  /** Build a puzzle from an uploaded image data URL (no mirroring). */
  const generateFromImage = useCallback(
    (dataUrl: string, gridSize: number = 3, opts: GenerateOpts = {}) => {
      if (!opts.filter) {
        buildPuzzle(dataUrl, gridSize, opts);
        return;
      }
      // Filter needs a canvas: load the image, apply duotone, re-encode.
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 480;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        duotone(canvas);
        buildPuzzle(canvas.toDataURL("image/png"), gridSize, opts);
      };
      img.src = dataUrl;
    },
    [buildPuzzle],
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
      historyRef.current.push([indexA, indexB]);
      const solved = isSolved(tiles);
      return { ...prev, tiles, solved };
    });
  }, []);

  /** Undo the last swap. Returns true if a swap was reverted. */
  const undo = useCallback((): boolean => {
    const last = historyRef.current.pop();
    if (!last) return false;
    const [indexA, indexB] = last;
    setPuzzle((prev) => {
      if (!prev) return prev;
      const tiles = [...prev.tiles];
      const a = tiles.findIndex((t) => t.currentIndex === indexA);
      const b = tiles.findIndex((t) => t.currentIndex === indexB);
      if (a === -1 || b === -1) return prev;
      tiles[a] = { ...tiles[a], currentIndex: indexB };
      tiles[b] = { ...tiles[b], currentIndex: indexA };
      return { ...prev, tiles, solved: isSolved(tiles) };
    });
    return true;
  }, []);

  const reset = useCallback(() => {
    historyRef.current = [];
    setPuzzle(null);
  }, []);

  return { puzzle, generate, generateFromImage, swapTiles, undo, reset };
}
