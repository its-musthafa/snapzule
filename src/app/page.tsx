import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">
        Snap<span className="text-indigo-400">zule</span>
      </h1>
      <p className="text-gray-400 text-lg max-w-md mb-8">
        Strike a pose, snap a selfie, and solve yourself as a puzzle. How fast
        can you do it?
      </p>
      <Link
        href="/game"
        className="bg-indigo-500 hover:bg-indigo-600 transition-colors text-white font-semibold px-8 py-3 rounded-2xl text-lg"
      >
        Play Now 🎮
      </Link>
      <p className="mt-6 text-gray-600 text-sm">
        No sign-up. No install. Just your camera.
      </p>
    </main>
  );
}
