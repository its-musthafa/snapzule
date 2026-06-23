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
    <div className="absolute inset-0 flex items-center justify-center z-20">
      {/* Harsh flash overlay effect on zero */}
      {count === 0 && (
        <div className="absolute inset-0 bg-white opacity-80 z-0"></div>
      )}

      <div
        className={`relative z-10 flex items-center justify-center border-8 border-black bg-yellow w-40 h-40 shadow-[12px_12px_0px_0px_#000] 
        ${count % 2 === 0 ? "transform rotate-3" : "transform -rotate-3"} 
        transition-transform duration-200`}
      >
        <span className="text-black brutal-heading text-8xl drop-shadow-[4px_4px_0px_#fff]">
          {count === 0 ? "📸" : count}
        </span>
      </div>
    </div>
  );
}
