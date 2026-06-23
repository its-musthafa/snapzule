"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type GestureState = "idle" | "detecting" | "holding" | "snapping";

interface UseMediaPipeOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onSnap: () => void;
  holdDurationMs?: number;
}

// Improved Open Palm Detection: Uses distance to wrist so it works even if hand is tilted/upside down
function isOpenPalm(landmarks: { x: number; y: number; z: number }[]): boolean {
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];

  let extendedFingers = 0;
  for (let i = 0; i < 4; i++) {
    const tipDist = Math.hypot(
      landmarks[tips[i]].x - wrist.x,
      landmarks[tips[i]].y - wrist.y,
    );
    const mcpDist = Math.hypot(
      landmarks[mcps[i]].x - wrist.x,
      landmarks[mcps[i]].y - wrist.y,
    );

    // Fingertip should be significantly further from the wrist than the knuckle is
    if (tipDist > mcpDist * 1.25) {
      extendedFingers++;
    }
  }
  return extendedFingers >= 4;
}

export function useMediaPipe({
  videoRef,
  canvasRef,
  onSnap,
  holdDurationMs = 2000,
}: UseMediaPipeOptions) {
  const [gestureState, setGestureState] = useState<GestureState>("idle");
  const holdStartRef = useRef<number | null>(null);
  const snapFiredRef = useRef(false);
  const handsRef = useRef<unknown>(null);
  const animFrameRef = useRef<number | null>(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hands = handsRef.current as {
      send: (o: { image: HTMLVideoElement }) => Promise<void>;
    } | null;
    if (!video || !hands || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    hands.send({ image: video }).then(() => {
      animFrameRef.current = requestAnimationFrame(processFrame);
    });
  }, [videoRef]);

  useEffect(() => {
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
        minTrackingConfidence: 0.75, // High calibration
      });

      hands.onResults(
        (results: {
          multiHandLandmarks?: { x: number; y: number; z: number }[][];
          image: CanvasImageSource;
        }) => {
          if (cancelled) return;

          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (!canvas || !ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const hasHand =
            results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
          const landmarks = hasHand ? results.multiHandLandmarks![0] : null;
          const palmOpen = landmarks ? isOpenPalm(landmarks) : false;

          const now = Date.now();

          if (snapFiredRef.current) return;

          if (palmOpen) {
            if (!holdStartRef.current) {
              holdStartRef.current = now;
              setGestureState("holding");
            }

            const elapsed = now - holdStartRef.current;
            const progress = Math.min(elapsed / holdDurationMs, 1);

            const cx = canvas.width / 2;
            const cy = 80;
            const size = 60;

            // Draw Brutalist Loading Block instead of an arc
            ctx.save();
            ctx.translate(cx, cy);

            // Background box
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 4;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.strokeRect(-size / 2, -size / 2, size, size);

            // Fill box (purple) indicating progress
            const fillHeight = size * progress;
            ctx.fillStyle = "#a855f7"; // var(--brutal-purple)
            ctx.fillRect(-size / 2, size / 2 - fillHeight, size, fillHeight);

            ctx.restore();

            // Label
            ctx.fillStyle = "#000000";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.font = "bold 20px sans-serif";
            ctx.textAlign = "center";
            ctx.strokeText("HOLD STILL", cx, cy + size + 20);
            ctx.fillText("HOLD STILL", cx, cy + size + 20);

            if (elapsed >= holdDurationMs) {
              snapFiredRef.current = true;
              setGestureState("snapping");
              onSnap();
            }
          } else {
            holdStartRef.current = null;
            if (!snapFiredRef.current) {
              setGestureState(hasHand ? "detecting" : "idle");
            }
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
  }, [canvasRef, holdDurationMs, onSnap, processFrame]);

  const reset = useCallback(() => {
    snapFiredRef.current = false;
    holdStartRef.current = null;
    setGestureState("idle");
  }, []);

  return { gestureState, reset };
}
