import type { SKRSContext2D } from "@napi-rs/canvas";

import type { LookName } from "./look.ts";

export const FORMATS = {
  "9x16": { w: 1080, h: 1920 }, // Shorts, Reels, TikTok
  "1x1": { w: 1080, h: 1080 }, // feed square
  "16x9": { w: 1920, h: 1080 }, // YouTube, blog embeds
  "4x5": { w: 1080, h: 1350 }, // LinkedIn native
  "4x3": { w: 768, h: 576 }, // PAL standard definition, square pixels
} as const;

export type FormatName = keyof typeof FORMATS;

// Scenes draw against this, never against fixed pixels, so one timeline
// renders every format. `u` is 1% of the short edge.
export interface Layout {
  format: FormatName;
  w: number;
  h: number;
  cx: number;
  cy: number;
  u: number;
  portrait: boolean;
}

export function layoutFor(format: FormatName): Layout {
  const { w, h } = FORMATS[format];
  return { format, w, h, cx: w / 2, cy: h / 2, u: Math.min(w, h) / 100, portrait: h > w };
}

export interface Scene {
  name: string;
  from: number; // seconds
  to: number;
  // t is seconds since the scene started
  draw(g: SKRSContext2D, t: number, L: Layout): void;
}

export type Voice = "click" | "pop" | "thump" | "whoosh" | "rise" | "chirp" | "hum";

export interface Cue {
  t: number; // seconds
  type: Voice;
  gain?: number;
}

export interface Score {
  bpm: number;
  root: number; // root note in Hz
  // scale degrees in semitones from the root, one chord per bar
  bars: readonly (readonly number[])[];
  style?: "beat" | "pad"; // pad: slow swelling chords, no drums
  until?: number; // stop the score here (seconds); defaults to the whole film
}

export interface Film {
  name: string;
  dur: number; // seconds
  fps: number;
  bg: string;
  formats: readonly FormatName[];
  scenes: readonly Scene[];
  score?: Score;
  look?: LookName; // post-process applied by ffmpeg after the frames are painted
  // Where a full-quality render is filed, and what each format's file is called.
  // Without it (and for every draft render) files go to out/<name>/<format>.mp4.
  deliver?: { dir: string; stem: (format: FormatName) => string };
  cues: readonly Cue[];
}

// Beat times are arithmetic because the score is synthesised at a declared BPM.
export const beat = (bpm: number, n: number): number => (n * 60) / bpm;

export function drawFrame(g: SKRSContext2D, film: Film, t: number, L: Layout): void {
  g.fillStyle = film.bg;
  g.fillRect(0, 0, L.w, L.h);
  for (const s of film.scenes) {
    if (t >= s.from && t < s.to) {
      g.save();
      s.draw(g, t - s.from, L);
      g.restore();
    }
  }
}

// The finished file for one format: the filed copy if the film has one, else the scratch render.
export function videoPath(film: Film, format: FormatName, draft = false): string {
  return film.deliver && !draft ? `${film.deliver.dir}/${film.deliver.stem(format)}.mp4` : `out/${film.name}/${format}.mp4`;
}

export async function loadFilm(name: string): Promise<Film> {
  if (await Bun.file(new URL(`../../films/${name}/film.ts`, import.meta.url).pathname).exists()) {
    const mod = (await import(`../../films/${name}/film.ts`)) as { default?: Film };
    if (!mod.default) throw new Error(`films/${name}/film.ts must default-export a Film`);
    return mod.default;
  }
  const { filmFor } = await import("../kits/series.ts");
  const { conceptFor } = await import("../../concepts/index.ts");
  const film = (await filmFor(name)) ?? (await conceptFor(name));
  if (!film) throw new Error(`no film folder, series clip or concept clip named "${name}"`);
  return film;
}
