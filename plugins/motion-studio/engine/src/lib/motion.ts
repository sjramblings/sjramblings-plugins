// Motion primitives. Every function here is a pure function of time, so any
// frame can be rendered without simulating the frames before it.

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface SpringConfig {
  k: number; // stiffness
  d: number; // damping
}

export const SPRINGS = {
  snappy: { k: 320, d: 30 }, // buttons, toggles, leading edges
  standard: { k: 170, d: 26 }, // cards, containers, camera
  heavy: { k: 90, d: 20 }, // big type, logo lockups
  playful: { k: 200, d: 14 }, // visible overshoot
} as const satisfies Record<string, SpringConfig>;

// Closed-form damped spring from 0 to 1, starting at rest at t = 0.
export function spring(t: number, { k, d }: SpringConfig = SPRINGS.standard): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  // z >= 1 is treated as critically damped
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

export type Key = readonly [time: number, value: number];

// A value with several targets: one spring per change, summed. Motion stays
// continuous across retargets and is still a pure function of t.
export function track(t: number, keys: readonly Key[], cfg: SpringConfig = SPRINGS.standard): number {
  const first = keys[0];
  if (!first) throw new Error("track needs at least one key");
  let v = first[1];
  for (let i = 1; i < keys.length; i++) {
    const cur = keys[i]!;
    const prev = keys[i - 1]!;
    v += (cur[1] - prev[1]) * spring(t - cur[0], cfg);
  }
  return v;
}

// Text inside a morphing box: in after the morph starts, out before the next one.
export function swapAlpha(t: number, tIn: number, tOut: number): number {
  return Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1));
}

// Seamless loop: pin the last frame to the first.
export const loopT = (t: number, dur: number): number => ((t % dur) + dur) % dur;

// Seeded noise (mulberry32). The render must be identical every run.
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothstep for wipes that must fully finish (a spring only approaches its target).
export const smooth = (x: number): number => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};

// Blend two #rrggbb colours.
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number) => Math.round(lerp(p(a, i), p(b, i), clamp(t)));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}
