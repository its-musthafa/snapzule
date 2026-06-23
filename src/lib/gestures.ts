// Geometric hand-gesture interpreters over MediaPipe Hands landmarks.
// No ML classifier — distances of fingertips vs knuckles to the wrist.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

const TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky tips
const MCPS = [5, 9, 13, 17]; // matching knuckles

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Per-finger extended flags (index, middle, ring, pinky). */
function fingersExtended(lm: Landmark[]): boolean[] {
  const wrist = lm[0];
  return TIPS.map((tip, i) => {
    const tipDist = dist(lm[tip], wrist);
    const mcpDist = dist(lm[MCPS[i]], wrist);
    return tipDist > mcpDist * 1.1;
  });
}

/** Fist: at least 3 of the 4 fingers curled toward the wrist. */
export function isFist(lm: Landmark[]): boolean {
  const wrist = lm[0];
  let curled = 0;
  for (let i = 0; i < 4; i++) {
    const tipDist = dist(lm[TIPS[i]], wrist);
    const mcpDist = dist(lm[MCPS[i]], wrist);
    if (tipDist < mcpDist * 0.9) curled++;
  }
  return curled >= 3;
}

/** Peace / victory: index + middle extended, ring + pinky curled. */
export function isPeace(lm: Landmark[]): boolean {
  const [index, middle, ring, pinky] = fingersExtended(lm);
  return index && middle && !ring && !pinky;
}

/** Thumbs-up: thumb extended & pointing up, other 4 fingers curled. */
export function isThumbsUp(lm: Landmark[]): boolean {
  const ext = fingersExtended(lm);
  const fingersCurled = ext.filter((e) => !e).length >= 3;
  // Thumb extended: tip (4) noticeably farther from wrist than its IP joint (3)
  const wrist = lm[0];
  const thumbExtended = dist(lm[4], wrist) > dist(lm[3], wrist) * 1.15;
  // Pointing up: thumb tip above the wrist (smaller y = higher on screen)
  const thumbUp = lm[4].y < wrist.y - 0.05;
  return fingersCurled && thumbExtended && thumbUp;
}
