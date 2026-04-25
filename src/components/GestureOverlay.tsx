"use client";

import { useRef, useEffect } from "react";
import { useMediaPipe, GestureState } from "@/hooks/useMediaPipe";

export interface GestureOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSnap: () => void;
  onReset?: (resetFn: () => void) => void;
}

const stateLabel: Record<GestureState, string> = {
  idle: "Show your open palm to snap 📸",
  detecting: "Almost... open your fingers fully ✋",
  holding: "Hold still...",
  snapping: "📸 Snapped!",
};

const stateColor: Record<GestureState, string> = {
  idle: "text-gray-400",
  detecting: "text-yellow-400",
  holding: "text-indigo-400",
  snapping: "text-green-400",
};

export default function GestureOverlay({
  videoRef,
  onSnap,
  onReset,
}: GestureOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { gestureState, reset } = useMediaPipe({
    videoRef,
    canvasRef,
    onSnap,
  });

  // Sync canvas size to video
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const sync = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };

    video.addEventListener("loadedmetadata", sync);
    sync();
    return () => video.removeEventListener("loadedmetadata", sync);
  }, [videoRef]);

  // Expose reset to parent
  useEffect(() => {
    onReset?.(reset);
  }, [onReset, reset]);

  return (
    <>
      {/* Canvas overlaid on top of video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
      />
      {/* Status label below */}
      <div
        className={`absolute bottom-3 left-0 right-0 text-center text-sm font-medium ${stateColor[gestureState]}`}
      >
        {stateLabel[gestureState]}
      </div>
    </>
  );
}
