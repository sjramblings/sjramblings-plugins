import { expect, test } from "bun:test";
import { loopT, rng, spring, SPRINGS, swapAlpha, track } from "../src/lib/motion.ts";
import { beat, FORMATS, layoutFor } from "../src/lib/film.ts";
import { synth, SR } from "../src/lib/audio.ts";
import demo from "../films/demo/film.ts";

test("spring starts at rest and settles on its target", () => {
  for (const cfg of Object.values(SPRINGS)) {
    expect(spring(0, cfg)).toBe(0);
    expect(spring(-1, cfg)).toBe(0);
    expect(Math.abs(spring(3, cfg) - 1)).toBeLessThan(0.001);
  }
});

test("only the playful spring overshoots visibly", () => {
  const peak = (cfg: (typeof SPRINGS)[keyof typeof SPRINGS]) =>
    Math.max(...Array.from({ length: 600 }, (_, i) => spring(i / 200, cfg)));
  expect(peak(SPRINGS.playful)).toBeGreaterThan(1.1);
  expect(peak(SPRINGS.standard)).toBeLessThan(1.01);
  expect(peak(SPRINGS.heavy)).toBeLessThan(1.001);
});

test("track is continuous across a retarget and lands on the last key", () => {
  const keys = [[0, 0], [0.2, 100], [0.5, 40]] as const;
  let prev = track(0, keys);
  for (let i = 1; i <= 3000; i++) {
    const v = track(i / 1000, keys);
    expect(Math.abs(v - prev)).toBeLessThan(2); // no jump between 1ms steps
    prev = v;
  }
  expect(Math.abs(track(4, keys) - 40)).toBeLessThan(0.01);
});

test("track needs no history: any time can be asked first", () => {
  const keys = [[0, 0], [1, 10]] as const;
  const late = track(1.4, keys);
  track(0.1, keys);
  expect(track(1.4, keys)).toBe(late);
});

test("swapAlpha is zero at both edges and one in the middle", () => {
  expect(swapAlpha(1, 1, 3)).toBe(0);
  expect(swapAlpha(3, 1, 3)).toBe(0);
  expect(swapAlpha(2, 1, 3)).toBe(1);
});

test("loopT wraps both directions", () => {
  expect(loopT(12.5, 12)).toBeCloseTo(0.5);
  expect(loopT(-0.5, 12)).toBeCloseTo(11.5);
});

test("rng is seeded: same seed, same sequence", () => {
  const a = rng(7);
  const b = rng(7);
  const c = rng(8);
  const seqA = [a(), a(), a()];
  expect([b(), b(), b()]).toEqual(seqA);
  expect([c(), c(), c()]).not.toEqual(seqA);
  for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
});

test("beat grid is arithmetic", () => {
  expect(beat(120, 4)).toBe(2);
});

test("every format has even pixel sizes (yuv420p needs them)", () => {
  for (const name of Object.keys(FORMATS) as (keyof typeof FORMATS)[]) {
    const L = layoutFor(name);
    expect(L.w % 2).toBe(0);
    expect(L.h % 2).toBe(0);
  }
});

test("demo scenes tile the whole duration with no gap or overlap", () => {
  let t = 0;
  for (const s of demo.scenes) {
    expect(s.from).toBe(t);
    t = s.to;
  }
  expect(t).toBe(demo.dur);
});

test("demo cues land inside the film and synth is repeatable", () => {
  for (const c of demo.cues) expect(c.t >= 0 && c.t < demo.dur).toBe(true);
  const a = synth(demo);
  const b = synth(demo);
  expect(a.length).toBe(demo.dur * SR);
  expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
  expect(a.some((v) => v !== 0)).toBe(true);
});
