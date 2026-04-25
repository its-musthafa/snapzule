"use client";

import { useEffect, useState } from "react";

export interface CountdownOverlayProps {
  onComplete: () => void;
}

export default function CountdownOverlay({
  onComplete,
}: CountdownOverlayProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <span className="text-white text-8xl font-black animate-ping-once drop-shadow-lg">
        {count === 0 ? "📸" : count}
      </span>
    </div>
  );
}
