"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { isFist, isPeace } from "@/lib/gestures";

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

  // Latest onPeace + a cooldown so one ✌️ fires a single hint.
  const onPeaceRef = useRef(onPeace);
  onPeaceRef.current = onPeace;
  const lastPeaceRef = useRef(0);

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

    if (!video || !hands || video.readyState < 2 || !enabled) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    hands.send({ image: video }).then(() => {
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
        minTrackingConfidence: 0.75, // Increased to prevent high-lighting jitter
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

          const landmarks = results.multiHandLandmarks?.[0];
          const prev = stateRef.current;

          if (!landmarks) {
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

          // ✌️ peace sign → hint peek (cooldown-gated to one fire per gesture)
          if (isPeace(landmarks)) {
            const now = performance.now();
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

          // Use our new robust Fist detection
          const grabbing = isFist(landmarks);
          const hoverIndex = getGridIndex(cursorX, cursorY);

          // Draw brutalist cursor on PiP
          if (pip && pipCtx) {
            const drawX = pip.width - cursorX * pip.width; // Un-mirror for canvas drawing
            const drawY = cursorY * pip.height;

            pipCtx.fillStyle = grabbing ? "#a855f7" : "#ffcc00"; // Brutalist Purple or Yellow
            pipCtx.strokeStyle = "#000000";
            pipCtx.lineWidth = 2;

            // Draw a blocky square cursor instead of a circle
            const size = grabbing ? 12 : 16;
            pipCtx.fillRect(drawX - size / 2, drawY - size / 2, size, size);
            pipCtx.strokeRect(drawX - size / 2, drawY - size / 2, size, size);
          }

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
              onSwap(prev.dragFromIndex, hoverIndex);
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
    };
  }, [enabled, pipCanvasRef, getGridIndex, onSwap, updateState, processFrame]);

  return { pinchState };
}
