// Demo film: four shots that exercise the engine. Copy this folder to start a new clip.
import { beat, type Film, type Scene } from "../../src/lib/film.ts";
import { clamp, mixHex, rng, smooth, spring, SPRINGS, swapAlpha, track } from "../../src/lib/motion.ts";

const BG = "#0E1116";
const FG = "#EDEFF2";
const DIM = "#2A313C";
const ACCENT = "#FF9F1C";
const BPM = 120;
const B = beat(BPM, 1); // one beat in seconds
const FACE = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const title: Scene = {
  name: "title",
  from: 0,
  to: 3,
  draw(g, t, L) {
    const words = ["CLIPS", "FROM", "CODE"];
    const x = L.u * 8;
    const wide = L.w / L.h > 1.5;
    g.textAlign = "left";
    // wide frames get one line fitted to the width; everything else stacks
    let size = L.u * (L.portrait ? 24 : 26);
    g.font = `700 ${size}px ${FACE}`;
    if (wide) {
      size *= (L.w - 2 * x) / g.measureText(words.join(" ")).width;
      g.font = `700 ${size}px ${FACE}`;
    }
    const y0 = wide ? L.cy + size * 0.3 : L.cy - size * 0.75;
    let cursor = x;
    words.forEach((word, i) => {
      const wx = cursor;
      cursor += g.measureText(word + " ").width;
      const local = t - i * B;
      if (local <= 0) return;
      const s = spring(local, SPRINGS.heavy);
      g.globalAlpha = clamp(local * 10);
      g.fillStyle = i === 2 ? ACCENT : FG;
      const rise = (1 - s) * size * 0.6;
      if (wide) g.fillText(word, wx, y0 + rise);
      else g.fillText(word, x, y0 + i * size * 0.95 + rise);
    });
    g.globalAlpha = 1;
    const bar = spring(t - 3 * B, SPRINGS.snappy);
    g.fillStyle = ACCENT;
    g.fillRect(x, y0 + (wide ? 0 : 2 * size * 0.95) + size * 0.2, bar * (L.w - 2 * x), L.u * 1.6);
  },
};

const grid: Scene = {
  name: "grid",
  from: 3,
  to: 6,
  draw(g, t, L) {
    const cell = L.u * 12;
    const top = L.u * 26;
    const cols = Math.floor((L.w - L.u * 16) / cell);
    const rows = Math.floor((L.h - top - L.u * 10) / cell);
    const x0 = (L.w - cols * cell) / 2 + cell / 2;
    const r = rng(7);
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols;
      const row = Math.floor(i / cols);
      const delay = (c + row) * 0.03 + r() * 0.08;
      // in on the first beat, down to a dot on the fifth
      const s = track(t, [[0, 0], [delay, 1], [4 * B + delay * 0.5, 0.28]], SPRINGS.snappy);
      const lit = (c + row) % 5 === 0 ? spring(t - 2 * B - delay, SPRINGS.snappy) : 0;
      const half = (cell * 0.42 * s) / 1;
      g.fillStyle = mixHex(DIM, ACCENT, lit);
      g.fillRect(x0 + c * cell - half, top + row * cell + cell / 2 - half, half * 2, half * 2);
    }
    const size = L.u * 6.2;
    g.font = `700 ${size}px ${FACE}`;
    g.textAlign = "left";
    g.fillStyle = FG;
    g.globalAlpha = swapAlpha(t, 0.1, 3.2);
    g.fillText("EVERY BEAT,", L.u * 8, L.u * 12);
    g.fillStyle = ACCENT;
    g.globalAlpha = swapAlpha(t, 2 * B, 3.2);
    g.fillText("SOMETHING MOVES", L.u * 8, L.u * 12 + size * 1.1);
  },
};

// One container, never cut: pill button -> card with bars -> accent stamp.
const morph: Scene = {
  name: "morph",
  from: 6,
  to: 9,
  draw(g, t, L) {
    const enter = spring(t, SPRINGS.snappy);
    const m = L.w / L.h > 1.5 ? 1.5 : 1; // wide frames have room for a bigger set
    g.translate(L.cx, L.cy);
    g.scale(m, m);
    g.translate(-L.cx, -L.cy);
    const w = track(t, [[0, L.u * 40], [2 * B, L.u * 76], [4 * B, L.u * 64]]) * enter;
    const h = track(t, [[0, L.u * 13], [2 * B, L.u * 46], [4 * B, L.u * 22]]) * enter;
    const rad = track(t, [[0, L.u * 6.5], [2 * B, L.u * 3], [4 * B, L.u * 11]]);
    const stamp = spring(t - 4 * B, SPRINGS.snappy);
    g.fillStyle = mixHex(FG, ACCENT, stamp);
    g.beginPath();
    g.roundRect(L.cx - w / 2, L.cy - h / 2, w, h, Math.min(rad, h / 2));
    g.fill();

    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = BG;
    g.font = `700 ${L.u * 5.5}px ${FACE}`;
    g.globalAlpha = swapAlpha(t, 0, 2 * B);
    g.fillText("Render", L.cx, L.cy);

    // bars grow inside the card, then drop before the next morph
    const heights = [0.45, 0.7, 1, 0.6, 0.85];
    const bw = L.u * 8;
    const gap = L.u * 4;
    const base = L.cy + L.u * 17;
    heights.forEach((hgt, i) => {
      const d = 2 * B + 0.12 + i * 0.06;
      const grow = track(t, [[0, 0], [d, 1], [4 * B - 0.2 + i * 0.02, 0]], SPRINGS.snappy);
      if (grow <= 0.001) return;
      const x = L.cx + (i - (heights.length - 1) / 2) * (bw + gap) - bw / 2;
      g.globalAlpha = 1;
      g.fillStyle = i === 2 ? ACCENT : BG;
      g.fillRect(x, base - L.u * 32 * hgt * grow, bw, L.u * 32 * hgt * grow);
    });

    g.fillStyle = BG;
    g.font = `700 ${L.u * 8}px ${FACE}`;
    g.globalAlpha = swapAlpha(t, 4 * B, 3.3);
    g.fillText("SHIPPED", L.cx, L.cy);
  },
};

const lockup: Scene = {
  name: "lockup",
  from: 9,
  to: 12,
  draw(g, t, L) {
    const frames = Math.round(track(t, [[0, 0], [0.05, 720]], SPRINGS.heavy));
    const size = L.u * (L.portrait ? 30 : 36);
    g.textAlign = "left";
    g.fillStyle = FG;
    g.font = `700 ${size}px ${FACE}`;
    g.fillText(String(Math.min(frames, 720)), L.u * 8, L.cy);
    const cap = L.u * (L.portrait ? 5.4 : 7);
    g.font = `700 ${cap}px ${FACE}`;
    g.fillStyle = ACCENT;
    g.globalAlpha = clamp((t - 2 * B) * 8);
    g.fillText("FRAMES", L.u * 8, L.cy + cap * 1.7);
    g.fillStyle = FG;
    g.globalAlpha = clamp((t - 3 * B) * 8);
    g.fillText("ONE FUNCTION OF TIME", L.u * 8, L.cy + cap * 3);
    g.globalAlpha = 1;
    // accent wipe, then background wipe, so the last frame equals the first
    g.fillStyle = ACCENT;
    g.fillRect(0, 0, L.w * smooth((t - 4 * B) / 0.3), L.h);
    g.fillStyle = BG;
    g.fillRect(0, 0, L.w * smooth((t - 4 * B - 0.3) / 0.35), L.h);
  },
};

const film: Film = {
  name: "demo",
  dur: 12,
  fps: 60,
  bg: BG,
  formats: ["9x16", "1x1", "16x9", "4x5"],
  scenes: [title, grid, morph, lockup],
  score: {
    bpm: BPM,
    root: 220,
    bars: [
      [0, 3, 7, 12],
      [-4, 0, 3, 8],
      [3, 7, 10, 15],
      [-2, 2, 5, 10],
    ],
  },
  cues: [
    { t: 0, type: "thump" },
    { t: B, type: "thump" },
    { t: 2 * B, type: "thump" },
    { t: 3 * B, type: "click" },
    { t: 3 - 0.2, type: "whoosh" },
    { t: 3, type: "pop" },
    { t: 3 + 2 * B, type: "click" },
    { t: 3 + 4 * B, type: "pop" },
    { t: 6 - 0.2, type: "whoosh" },
    { t: 6, type: "click" },
    { t: 6 + 2 * B, type: "pop" },
    { t: 6 + 4 * B, type: "thump" },
    { t: 9 - 0.2, type: "whoosh" },
    { t: 9, type: "rise" },
    { t: 9 + 4 * B, type: "whoosh", gain: 1.4 },
  ],
};

export default film;
