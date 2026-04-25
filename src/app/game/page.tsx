"use client";

import dynamic from "next/dynamic";

const CameraView = dynamic(() => import("@/components/CameraView"), {
  ssr: false,
  loading: () => (
    <div className="w-[640px] max-w-full aspect-video rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-600 text-sm">
      Loading camera...
    </div>
  ),
});

export default function GamePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <h2 className="text-3xl font-bold">
        Snap<span className="text-indigo-400">zule</span>
      </h2>
      <CameraView />
      <p className="text-gray-500 text-sm">
        ✋ Gesture detection coming in Phase 3
      </p>
    </main>
  );
}
