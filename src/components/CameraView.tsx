"use client";

import { useEffect, useRef, useState } from "react";

export interface CameraViewProps {
  onStreamReady?: (video: HTMLVideoElement) => void;
}

export default function CameraView({ onStreamReady }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stream: MediaStream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
              setLoading(false);
              onStreamReady?.(videoRef.current!);
            } catch (e) {
              console.error("Video play failed:", e);
              setError("Camera stream started but video could not play.");
              setLoading(false);
            }
          };
        }
      } catch (err) {
        setLoading(false);
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError(
            "Camera access denied. Please allow camera permissions and refresh.",
          );
        } else {
          setError(
            "Could not access camera. Make sure no other app is using it.",
          );
        }
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onStreamReady]);

  if (error) {
    return (
      <div className="w-full h-full aspect-video bg-red flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          📷
        </span>
        <div className="bg-black text-white brutal-heading text-xl px-6 py-3 border-4 border-white shadow-[4px_4px_0px_0px_#fff] transform -rotate-1">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full aspect-video bg-black overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="bg-yellow text-black border-4 border-black px-6 py-2 brutal-heading text-2xl animate-pulse shadow-[6px_6px_0px_0px_#fff]">
            INITIALIZING CAMERA...
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        muted
        playsInline
        autoPlay
      />
    </div>
  );
}
