"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { isFist, isOpenHand, isPeace } from "@/lib/gestures";

// How long a grab survives momentary tracking loss (motion blur on fast drags)
// before it's released. Reacquiring the hand within this window continues the
// drag seamlessly.
const GRACE_MS = 300;

export interface PinchState {
  isPinching: boolean; // We kept the name so it doesn't break PuzzleBoard, but it's actually "isFist" now!
  handX: number | null;
  handY: number | null;
  hoverIndex: number | null;
  dragFromIndex: number | null;
}

interface UsePinchDragOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  pipCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  gridSize: number;
  onSwap: (from: number, to: number) => void;
  onPeace?: () => void;
  enabled: boolean;
}

export function usePinchDrag({
  videoRef,
  pipCanvasRef,
  gridSize,
  onSwap,
  onPeace,
  enabled,
}: UsePinchDragOptions) {
  const [pinchState, setPinchState] = useState<PinchState>({
    isPinching: false,
    handX: null,
    handY: null,
    hoverIndex: null,
    dragFromIndex: null,
  });

  const stateRef = useRef<PinchState>({
    isPinching: false,
    handX: null,
    handY: null,
    hoverIndex: null,
    dragFromIndex: null,
  });

  const animFrameRef = useRef<number | null>(null);
  const handsRef = useRef<unknown>(null);
  const sendingRef = useRef(false);
  // Timestamp of the last frame a hand was actually seen — drives the grace window.
  const lastSeenRef = useRef(0);

  // Latest onPeace + a cooldown so one ✌️ fires a single hint.
  const onPeaceRef = useRef(onPeace);
  onPeaceRef.current = onPeace;
  const lastPeaceRef = useRef(0);

  // Keep onSwap in a ref so an unstable callback doesn't tear down and
  // rebuild the MediaPipe instance (CDN reload + crash risk) mid-game.
  const onSwapRef = useRef(onSwap);
  onSwapRef.current = onSwap;

  const getGridIndex = useCallback(
    (x: number, y: number): number => {
      const col = Math.floor(x * gridSize);
      const row = Math.floor(y * gridSize);
      const clampedCol = Math.max(0, Math.min(gridSize - 1, col));
      const clampedRow = Math.max(0, Math.min(gridSize - 1, row));
      return clampedRow * gridSize + clampedCol;
    },
    [gridSize],
  );

  const updateState = useCallback((next: PinchState) => {
    stateRef.current = next;
    setPinchState({ ...next });
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hands = handsRef.current as {
      send: (o: { image: HTMLVideoElement }) => Promise<void>;
    } | null;

    if (!video || !hands || video.readyState < 2 || !enabled || sendingRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Serialize sends — overlapping send() calls abort the MediaPipe wasm.
    sendingRef.current = true;
    hands.send({ image: video }).finally(() => {
      sendingRef.current = false;
      animFrameRef.current = requestAnimationFrame(processFrame);
    });
  }, [videoRef, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      const { Hands } = await import("@mediapipe/hands");

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        // Lowered from 0.75: this governs frame-to-frame *persistence*. A high
        // value made MediaPipe drop the hand on motion blur during fast drags.
        // 0.5 holds the track through blur; detection (initial pickup) stays 0.7.
        minTrackingConfidence: 0.5,
      });

      hands.onResults(
        (results: {
          multiHandLandmarks?: { x: number; y: number; z: number }[][];
          image: CanvasImageSource;
        }) => {
          if (cancelled) return;

          const pip = pipCanvasRef.current;
          const pipCtx = pip?.getContext("2d");
          if (pip && pipCtx) {
            pipCtx.save();
            pipCtx.translate(pip.width, 0);
            pipCtx.scale(-1, 1);
            pipCtx.drawImage(results.image, 0, 0, pip.width, pip.height);
            pipCtx.restore();
          }

          // Brutalist square cursor on the PiP (shared by the live + grace paths).
          const drawCursor = (cx: number, cy: number, active: boolean) => {
            if (!pip || !pipCtx) return;
            const drawX = pip.width - cx * pip.width; // un-mirror for canvas
            const drawY = cy * pip.height;
            pipCtx.fillStyle = active ? "#a855f7" : "#ffcc00"; // purple grab / yellow hover
            pipCtx.strokeStyle = "#000000";
            pipCtx.lineWidth = 2;
            const size = active ? 12 : 16;
            pipCtx.fillRect(drawX - size / 2, drawY - size / 2, size, size);
            pipCtx.strokeRect(drawX - size / 2, drawY - size / 2, size, size);
          };

          const landmarks = results.multiHandLandmarks?.[0];
          const prev = stateRef.current;
          const now = performance.now();

          if (!landmarks) {
            // A: grace window — a mid-drag grab survives brief tracking loss.
            if (prev.isPinching && prev.dragFromIndex !== null) {
              if (now - lastSeenRef.current <= GRACE_MS) {
                // Hold the grab; freeze the cursor where it was last seen.
                if (prev.handX !== null && prev.handY !== null) {
                  drawCursor(prev.handX, prev.handY, true);
                }
                return;
              }
              // Grace expired mid-air → commit the intended move to the last
              // hovered slot rather than silently dropping it.
              if (
                prev.hoverIndex !== null &&
                prev.hoverIndex !== prev.dragFromIndex
              ) {
                onSwapRef.current(prev.dragFromIndex, prev.hoverIndex);
              }
            }
            if (prev.isPinching || prev.dragFromIndex !== null) {
              updateState({
                isPinching: false,
                handX: null,
                handY: null,
                hoverIndex: null,
                dragFromIndex: null,
              });
            }
            return;
          }

          lastSeenRef.current = now;

          // ✌️ peace sign → hint peek (cooldown-gated to one fire per gesture)
          if (isPeace(landmarks)) {
            if (now - lastPeaceRef.current > 3000) {
              lastPeaceRef.current = now;
              onPeaceRef.current?.();
            }
          }

          // Center of the hand is best tracked by the middle finger knuckle (landmark 9)
          const center = landmarks[9];
          const rawCursorX = 1 - center.x; // Mirrored
          const rawCursorY = center.y;

          // SMOOTHING (Exponential Moving Average) to eliminate jitter
          const smoothFactor = 0.35; // Lower = smoother but slight delay. 0.35 is a great balance.
          const cursorX =
            prev.handX !== null
              ? prev.handX + (rawCursorX - prev.handX) * smoothFactor
              : rawCursorX;
          const cursorY =
            prev.handY !== null
              ? prev.handY + (rawCursorY - prev.handY) * smoothFactor
              : rawCursorY;

          // C: latched grab — start only on a clear fist, but once grabbing,
          // release only on a clear open hand. Ambiguous/transitional frames
          // mid-drag keep the current state instead of dropping the tile.
          const grabbing = prev.isPinching
            ? !isOpenHand(landmarks)
            : isFist(landmarks);
          const hoverIndex = getGridIndex(cursorX, cursorY);

          drawCursor(cursorX, cursorY, grabbing);

          if (grabbing && !prev.isPinching) {
            updateState({
              isPinching: true,
              handX: cursorX,
              handY: cursorY,
              hoverIndex,
              dragFromIndex: hoverIndex,
            });
          } else if (!grabbing && prev.isPinching) {
            if (
              prev.dragFromIndex !== null &&
              hoverIndex !== prev.dragFromIndex
            ) {
              onSwapRef.current(prev.dragFromIndex, hoverIndex);
            }
            updateState({
              isPinching: false,
              handX: cursorX,
              handY: cursorY,
              hoverIndex,
              dragFromIndex: null,
            });
          } else {
            updateState({
              ...prev,
              isPinching: grabbing,
              handX: cursorX,
              handY: cursorY,
              hoverIndex,
            });
          }
        },
      );

      handsRef.current = hands;
      if (!cancelled) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      (handsRef.current as { close?: () => void } | null)?.close?.();
      handsRef.current = null;
    };
  }, [enabled, pipCanvasRef, getGridIndex, updateState, processFrame]);

  return { pinchState };
}
