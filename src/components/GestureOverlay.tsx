"use client";

import { useRef, useEffect } from "react";
import { useMediaPipe, GestureState } from "@/hooks/useMediaPipe";

export interface GestureOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSnap: () => void;
  onReset?: (resetFn: () => void) => void;
}

const stateLabel: Record<GestureState, string> = {
  idle: "SHOW PALM TO SNAP 📸",
  detecting: "OPEN FINGERS FULLY ✋",
  holding: "HOLD STILL...",
  snapping: "📸 SNAPPED!",
};

// Mapped to our Neo-Brutalist utility classes
const stateStyle: Record<GestureState, string> = {
  idle: "bg-white text-black",
  detecting: "bg-yellow text-black",
  holding: "bg-purple text-white",
  snapping: "bg-green-400 text-black",
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
        className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1] z-10"
      />

      {/* Brutalist Status Badge */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div
          className={`brutal-heading text-xl px-6 py-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] transition-colors duration-200 ${stateStyle[gestureState]}`}
        >
          {stateLabel[gestureState]}
        </div>
      </div>
    </>
  );
}
