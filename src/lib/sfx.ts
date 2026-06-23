// Tiny Web Audio synth — no asset files. Lazy AudioContext, respects a mute
// flag in localStorage. Call sites fire snap()/swap()/place()/win().

const MUTE_KEY = "snapzule:muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Resume if a prior gesture suspended it.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

/** Play a single note. */
function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.15,
  when = 0,
): void {
  const ac = getCtx();
  if (!ac || isMuted()) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(env).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Shutter-like blip when the selfie is snapped. */
export function snap(): void {
  tone(880, 0.06, "square", 0.18);
  tone(1320, 0.05, "square", 0.12, 0.05);
}

/** Dull click when two tiles are swapped. */
export function swap(): void {
  tone(220, 0.07, "sawtooth", 0.12);
}

/** Bright blip when a tile lands in its home slot. */
export function place(): void {
  tone(660, 0.08, "triangle", 0.16);
  tone(990, 0.08, "triangle", 0.12, 0.04);
}

/** Victory arpeggio. */
export function win(): void {
  const notes = [523, 659, 784, 1047]; // C E G C
  notes.forEach((f, i) => tone(f, 0.18, "square", 0.16, i * 0.12));
}
