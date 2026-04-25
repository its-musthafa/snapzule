"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type GestureState = "idle" | "detecting" | "holding" | "snapping";

interface UseMediaPipeOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onSnap: () => void;
  holdDurationMs?: number; // how long to hold palm before snap (default 2000ms)
}

// Checks if a hand landmark result looks like an open palm
// All 5 fingertips must be above their respective MCP joints (extended)
function isOpenPalm(landmarks: { x: number; y: number; z: number }[]): boolean {
  // Finger tip indices:   thumb=4, index=8, middle=12, ring=16, pinky=20
  // Finger MCP indices:   thumb=2, index=5, middle=9,  ring=13, pinky=17
  const fingers = [
    [8, 6], // index: tip, pip
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ];

  // In normalized coords, y increases downward, so tip.y < pip.y means finger is extended
  const extended = fingers.filter(
    ([tip, pip]) => landmarks[tip].y < landmarks[pip].y,
  );
  return extended.length >= 4; // at least 4 fingers extended
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
      // Dynamically import so it's always client-side only
      const { Hands } = await import("@mediapipe/hands");

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
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

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const hasHand =
            results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
          const landmarks = hasHand ? results.multiHandLandmarks![0] : null;
          const palmOpen = landmarks ? isOpenPalm(landmarks) : false;

          const now = Date.now();

          if (snapFiredRef.current) return; // already snapped, wait for reset

          if (palmOpen) {
            if (!holdStartRef.current) {
              holdStartRef.current = now;
              setGestureState("holding");
            }

            const elapsed = now - holdStartRef.current;
            const progress = Math.min(elapsed / holdDurationMs, 1);

            // Draw progress arc on canvas
            const cx = canvas.width / 2;
            const cy = 60;
            const radius = 36;

            ctx.save();
            ctx.strokeStyle = "#6366f1";
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(
              cx,
              cy,
              radius,
              -Math.PI / 2,
              -Math.PI / 2 + 2 * Math.PI * progress,
            );
            ctx.stroke();

            // Background arc
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = "#6366f1";
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();

            // Label
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Hold still ✋", cx, cy + radius + 20);

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

            // Show hand icon hint if no hand
            if (!hasHand) {
              ctx.fillStyle = "rgba(255,255,255,0.15)";
              ctx.font = "bold 16px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("✋ Show open palm to snap", canvas.width / 2, 40);
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
