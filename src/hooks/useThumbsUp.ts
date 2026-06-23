"use client";

import { useEffect, useRef } from "react";
import { isThumbsUp, type Landmark } from "@/lib/gestures";

interface UseThumbsUpOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onDetect: () => void;
  /** Frames the gesture must hold before firing (debounce). */
  holdFrames?: number;
}

/**
 * Lightweight 👍 detector for the win screen. Spins its own MediaPipe Hands
 * instance + rAF loop and fires once when a thumbs-up is held steadily.
 */
export function useThumbsUp({
  videoRef,
  enabled,
  onDetect,
  holdFrames = 8,
}: UseThumbsUpOptions) {
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const animRef = useRef<number | null>(null);
  const handsRef = useRef<unknown>(null);
  const heldRef = useRef(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const processFrame = () => {
      const video = videoRef.current;
      const hands = handsRef.current as {
        send: (o: { image: HTMLVideoElement }) => Promise<void>;
      } | null;
      if (!video || !hands || video.readyState < 2) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }
      hands.send({ image: video }).then(() => {
        if (!cancelled) animRef.current = requestAnimationFrame(processFrame);
      });
    };

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
        minTrackingConfidence: 0.7,
      });
      hands.onResults(
        (results: { multiHandLandmarks?: Landmark[][] }) => {
          if (cancelled || firedRef.current) return;
          const lm = results.multiHandLandmarks?.[0];
          if (lm && isThumbsUp(lm)) {
            heldRef.current++;
            if (heldRef.current >= holdFrames) {
              firedRef.current = true;
              onDetectRef.current();
            }
          } else {
            heldRef.current = 0;
          }
        },
      );
      handsRef.current = hands;
      if (!cancelled) animRef.current = requestAnimationFrame(processFrame);
    }

    init();
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [enabled, videoRef, holdFrames]);
}
