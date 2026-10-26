import type { Cue, Film, Score, Voice } from "./film.ts";
import { rng } from "./motion.ts";

export const SR = 48000;

type VoiceFn = (t: number, noise: () => number) => number;

const VOICES: Record<Voice, readonly [len: number, fn: VoiceFn]> = {
  click: [0.05, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5],
  pop: [0.15, (t) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4],
  thump: [0.5, (t) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9],
  whoosh: [0.35, (t, n) => n() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25],
  // puppet "speech": one syllable each, a bright one and a low one
  chirp: [0.16, (t) => Math.sin(2 * Math.PI * (520 + 380 * Math.sin(t * 38)) * t) * Math.sin(Math.PI * Math.min(1, t / 0.16)) * 0.45],
  hum: [0.2, (t) => (Math.sin(2 * Math.PI * (150 + 50 * Math.sin(t * 24)) * t) + 0.4 * Math.sin(2 * Math.PI * 300 * t)) * Math.sin(Math.PI * Math.min(1, t / 0.2)) * 0.45],
  rise: [0.6, (t) => Math.sin(2 * Math.PI * (220 + 660 * t * t) * t) * Math.min(1, t / 0.5) * Math.exp(-Math.max(0, t - 0.5) * 40) * 0.3],
};

function addCues(buf: Float32Array, cues: readonly Cue[]): void {
  const noise = rng(42);
  const n = () => noise() * 2 - 1;
  for (const c of cues) {
    const [len, fn] = VOICES[c.type];
    const start = Math.floor(c.t * SR);
    const gain = c.gain ?? 1;
    for (let i = 0; i < len * SR && start + i < buf.length; i++) {
      buf[start + i]! += fn(i / SR, n) * gain;
    }
  }
}

// A plain score: kick on every beat, hat on the off-beat, a plucked chord per bar.
function addScore(buf: Float32Array, score: Score, dur: number): void {
  const spb = 60 / score.bpm;
  if (score.style === "pad") return addPad(buf, score, dur);
  const noise = rng(7);
  const beats = Math.floor(dur / spb);
  for (let b = 0; b < beats; b++) {
    const start = Math.floor(b * spb * SR);
    for (let i = 0; i < 0.3 * SR && start + i < buf.length; i++) {
      const t = i / SR;
      buf[start + i]! += Math.sin(2 * Math.PI * (110 - 140 * t) * t) * Math.exp(-t * 14) * 0.55;
    }
    const hat = Math.floor((b + 0.5) * spb * SR);
    for (let i = 0; i < 0.04 * SR && hat + i < buf.length; i++) {
      buf[hat + i]! += (noise() * 2 - 1) * Math.exp((-i / SR) * 120) * 0.12;
    }
    const chord = score.bars[Math.floor(b / 4) % score.bars.length]!;
    // arpeggiate: one chord tone per beat, plus the root an octave down on the bar
    const semis = chord[b % chord.length]!;
    pluck(buf, start, score.root * 2 ** (semis / 12), spb * 1.8, 0.16);
    if (b % 4 === 0) pluck(buf, start, (score.root / 2) * 2 ** (chord[0]! / 12), spb * 3.6, 0.22);
  }
}

// One swelling chord per bar with a low root under it.
function addPad(buf: Float32Array, score: Score, dur: number): void {
  const bar = (60 / score.bpm) * 4;
  for (let b = 0; b * bar < dur; b++) {
    const chord = score.bars[b % score.bars.length]!;
    const start = Math.floor(b * bar * SR);
    const len = bar * 1.25; // overlap the next bar so there is no gap
    const tones = [...chord.map((s) => score.root * 2 ** (s / 12)), (score.root / 2) * 2 ** (chord[0]! / 12)];
    tones.forEach((hz, k) => {
      for (let i = 0; i < len * SR && start + i < buf.length; i++) {
        const t = i / SR;
        const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 2;
        buf[start + i]! += (Math.sin(2 * Math.PI * hz * t) + Math.sin(2 * Math.PI * hz * 1.004 * t)) * env * (k === tones.length - 1 ? 0.13 : 0.06);
      }
    });
  }
}

function pluck(buf: Float32Array, start: number, hz: number, len: number, gain: number): void {
  for (let i = 0; i < len * SR && start + i < buf.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 3.5);
    buf[start + i]! += (Math.sin(2 * Math.PI * hz * t) + 0.3 * Math.sin(4 * Math.PI * hz * t)) * env * gain;
  }
}

export function synth(film: Film): Float32Array {
  const buf = new Float32Array(Math.ceil(film.dur * SR));
  if (film.score) addScore(buf, film.score, film.score.until ?? film.dur);
  addCues(buf, film.cues);
  // master: soft saturation tames the kick peaks so the mix can reach target loudness
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i]! * 2.2) * 0.7;
  // short fade at the tail so the file never ends on a click
  const fade = Math.floor(0.15 * SR);
  for (let i = 0; i < fade; i++) buf[buf.length - 1 - i]! *= i / fade;
  return buf;
}

// 16-bit mono WAV
export function toWav(buf: Float32Array): Uint8Array {
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  out.setUint32(4, 36 + n * 2, true);
  str(8, "WAVEfmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, SR, true);
  out.setUint32(28, SR * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, "data");
  out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, buf[i]!)) * 32767), true);
  }
  return new Uint8Array(out.buffer);
}
