// localStorage best scores, keyed per grid size.

export interface BestScore {
  moves: number;
  seconds: number;
}

const keyFor = (grid: number) => `snapzule:best:${grid}`;

/** Read the stored best for a grid size, or null if none / unavailable. */
export function getBest(grid: number): BestScore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(grid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BestScore>;
    if (typeof parsed.moves !== "number" || typeof parsed.seconds !== "number") {
      return null;
    }
    return { moves: parsed.moves, seconds: parsed.seconds };
  } catch {
    return null;
  }
}

/**
 * Record a finished run. Stores best-by-moves and best-by-time independently
 * (a run can beat one without the other). Returns whether each is a new record.
 */
export function saveScore(
  grid: number,
  moves: number,
  seconds: number,
): { bestMoves: boolean; bestTime: boolean } {
  if (typeof window === "undefined") {
    return { bestMoves: false, bestTime: false };
  }
  const prev = getBest(grid);
  const bestMoves = !prev || moves < prev.moves;
  const bestTime = !prev || seconds < prev.seconds;
  const next: BestScore = {
    moves: prev ? Math.min(prev.moves, moves) : moves,
    seconds: prev ? Math.min(prev.seconds, seconds) : seconds,
  };
  try {
    window.localStorage.setItem(keyFor(grid), JSON.stringify(next));
  } catch {
    // ignore quota / privacy-mode failures
  }
  return { bestMoves, bestTime };
}
