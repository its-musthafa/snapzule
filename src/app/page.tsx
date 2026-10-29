"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBest, type BestScore } from "@/lib/scores";
import { todaySeed } from "@/lib/rng";

const GRID_OPTIONS = [
  { size: 2, label: "2×2", sub: "KIDS" },
  { size: 3, label: "3×3", sub: "EASY" },
  { size: 4, label: "4×4", sub: "MEDIUM" },
  { size: 5, label: "5×5", sub: "HARD" },
  { size: 6, label: "6×6", sub: "INSANE" },
];

const HOW_TO_STEPS = [
  { icon: "✋", bg: "bg-yellow", title: "Snap", desc: "Hold an open palm to the camera for 2 seconds" },
  { icon: "👌", bg: "bg-blue-400", title: "Swap", desc: "Pinch a tile, drag it onto another one, release" },
  { icon: "✌️", bg: "bg-green-400", title: "Peek", desc: "Show a peace sign to preview the solved photo" },
  { icon: "🏆", bg: "bg-red", title: "Win", desc: "Solve it, then give a 👍 to play again" },
];

function fmtTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
}

export default function Home() {
  const [selected, setSelected] = useState(3);
  const [attack, setAttack] = useState(false);
  const [filter, setFilter] = useState(false);
  const [bests, setBests] = useState<Record<number, BestScore | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // localStorage is client-only — read after mount to avoid hydration mismatch.
  useEffect(() => {
    const next: Record<number, BestScore | null> = {};
    for (const { size } of GRID_OPTIONS) next[size] = getBest(size);
    setBests(next);
  }, []);

  const selectedBest = bests[selected];

  const startUrl = (grid: number) =>
    `/game?grid=${grid}${attack ? "&mode=attack" : ""}${filter ? "&filter=1" : ""}`;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem("snapzule:upload", reader.result as string);
      router.push(startUrl(selected));
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 gap-12 relative overflow-hidden">
      {/* Brutalist Dot Pattern Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(#000 2px, transparent 2px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Title Section */}
      <div className="flex flex-col items-center gap-4 text-center z-10">
        <p className="font-bold text-black border-2 border-black px-3 py-1 bg-white uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_#000]">
          Insert Coin
        </p>
        <h1 className="brutal-heading text-6xl sm:text-8xl flex flex-wrap justify-center gap-3 mt-2">
          <span className="bg-yellow text-black px-6 py-2 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform -rotate-2">
            SNAP
          </span>
          <span className="bg-purple text-white px-6 py-2 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform rotate-2">
            ZULE
          </span>
        </h1>
        <p className="font-bold text-black text-sm tracking-widest uppercase mt-4 bg-white border-2 border-black px-4 py-2 transform -rotate-1">
          Snap · Shuffle · Solve
        </p>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col md:flex-row items-stretch gap-8 w-full max-w-4xl z-10">
        {/* How to play */}
        <div className="brutal-box flex-1 p-6 transform rotate-1 flex flex-col gap-5">
          <h2 className="brutal-heading text-3xl border-b-4 border-black pb-2">
            HOW TO PLAY
          </h2>
          <ol className="flex flex-col flex-1 justify-around gap-4 font-bold text-sm">
            {HOW_TO_STEPS.map(({ icon, bg, title, desc }, i) => (
              <li key={title} className="flex items-center gap-3">
                <span
                  className={`${bg} border-2 border-black w-11 h-11 shrink-0 flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_#000]`}
                >
                  {icon}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="uppercase tracking-wide">
                    {i + 1}. {title}
                  </span>
                  <span className="font-normal text-xs text-gray-600">
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {/* Pro tips fill the rest of the card so it never looks empty */}
          <div className="mt-auto border-2 border-black bg-yellow px-4 py-3 shadow-[3px_3px_0px_0px_#000]">
            <p className="brutal-heading text-lg mb-1">PRO TIPS</p>
            <ul className="text-xs font-bold flex flex-col gap-1 list-disc pl-4">
              <li>Good light + a plain background = faster snap</li>
              <li>Daily Challenge: same scramble for everyone, race the ghost</li>
              <li>Undo works, but it still counts as a move on the leaderboard</li>
            </ul>
          </div>
        </div>

        {/* Controls / Start Game */}
        <div className="brutal-box flex-1 p-6 transform -rotate-1 flex flex-col justify-between">
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="brutal-heading text-2xl border-b-4 border-black w-full text-center pb-2">
              SELECT DIFFICULTY
            </p>
            <div className="grid grid-cols-5 w-full gap-2">
              {GRID_OPTIONS.map(({ size, label, sub }) => (
                <button
                  key={size}
                  onClick={() => setSelected(size)}
                  className={`brutal-btn flex-col gap-0.5 w-full px-0 py-2 ${
                    selected === size
                      ? "bg-purple text-white shadow-[0px_0px_0px_0px_#000] translate-y-1 translate-x-1"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg brutal-heading">{label}</span>
                  <span className="text-[9px] tracking-wider">{sub}</span>
                </button>
              ))}
            </div>

            {/* Time-attack toggle */}
            <button
              onClick={() => setAttack((a) => !a)}
              className={`brutal-btn w-full text-sm py-2 ${
                attack
                  ? "bg-red text-white shadow-[0px_0px_0px_0px_#000] translate-y-1 translate-x-1"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              ⏱ TIME ATTACK: {attack ? "ON" : "OFF"}
            </button>

            {/* Duotone filter toggle */}
            <button
              onClick={() => setFilter((f) => !f)}
              className={`brutal-btn w-full text-sm py-2 ${
                filter
                  ? "bg-purple text-white shadow-[0px_0px_0px_0px_#000] translate-y-1 translate-x-1"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              🎨 DUOTONE: {filter ? "ON" : "OFF"}
            </button>

            {/* Best score for the selected difficulty */}
            <div className="w-full border-2 border-black bg-gray-100 px-3 py-2 text-center font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
              {selectedBest ? (
                <span>
                  BEST · <span className="text-red">{selectedBest.moves}</span>{" "}
                  MOVES ·{" "}
                  <span className="text-purple">
                    {fmtTime(selectedBest.seconds)}
                  </span>
                </span>
              ) : (
                <span className="text-gray-400">NO RECORD YET</span>
              )}
            </div>
          </div>

          {/* Play / Upload / Daily Challenge buttons */}
          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={() => router.push(startUrl(selected))}
              className="brutal-btn bg-red text-white w-full text-2xl py-4"
            >
              PLAY NOW
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="brutal-btn bg-blue-400 text-white w-full text-lg py-3"
            >
              🖼 UPLOAD PHOTO
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() =>
                router.push(`/game?grid=3&seed=${encodeURIComponent(todaySeed())}`)
              }
              className="brutal-btn bg-yellow text-black w-full text-lg py-3"
            >
              📅 DAILY CHALLENGE
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="brutal-btn bg-green-400 text-black w-full text-lg py-3"
            >
              🏆 LEADERBOARD
            </button>
          </div>
        </div>
      </div>

      {/* Footer Tag */}
      <p className="font-bold text-black text-xs tracking-widest mt-8 bg-yellow border-2 border-black px-4 py-2 z-10 shadow-[2px_2px_0px_0px_#000]">
        NO SIGN-UP · NO INSTALL · JUST YOUR CAMERA
      </p>
    </main>
  );
}
