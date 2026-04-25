"use client";

import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
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
      <div className="w-[640px] max-w-full aspect-video rounded-2xl bg-gray-800 border border-red-500/40 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-3xl">📷</span>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-[640px] max-w-full aspect-video rounded-2xl overflow-hidden bg-gray-800 border border-gray-700">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          Starting camera...
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
