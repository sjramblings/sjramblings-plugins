// MOTION_THEME=<theme> bun src/theme-preview.ts [clip ids...] [--format 4x5]
// Paints a few frames of real clips in one theme and tiles them into one PNG, so a theme is
// judged on the frames it will actually produce. No render, no sound: seconds, not minutes.
// Defaults to the first concept clip and the first explainer clip in the workspace.
// Writes out/themes/<theme>/preview_<format>.png.
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync } from "node:fs";
import { THEME_NAME } from "../brand.ts";
import { CONCEPTS } from "../concepts/index.ts";
import { SERIES } from "../clips/index.ts";
import { conceptId } from "./kits/concept.ts";
import { clipId } from "./kits/explainer.ts";
import { expand } from "./kits/series.ts";
import { drawFrame, layoutFor, loadFilm, type FormatName } from "./lib/film.ts";
import { flag } from "./lib/cli.ts";

const format = (flag("format") ?? "4x5") as FormatName;
const named = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--format");
const firstExplainer = SERIES.flatMap(expand)[0];
const ids = named.length ? named : [CONCEPTS[0] && conceptId(CONCEPTS[0]), firstExplainer && clipId(firstExplainer)].filter((x): x is string => !!x);
if (!ids.length) throw new Error("no clips to preview: name one, or add a concept or explainer clip");

// hook, three points through the middle, and the end card
const AT = [0.06, 0.3, 0.5, 0.72, 0.97];
const L = layoutFor(format);
const scale = 0.4;
const tw = Math.round(L.w * scale);
const th = Math.round(L.h * scale);
const sheet = createCanvas(tw * AT.length, th * ids.length);
const s = sheet.getContext("2d");
const frame = createCanvas(L.w, L.h);
const g = frame.getContext("2d");

for (const [row, id] of ids.entries()) {
  const film = await loadFilm(id);
  for (const [col, at] of AT.entries()) {
    drawFrame(g, film, at * film.dur, L);
    s.drawImage(frame, col * tw, row * th, tw, th);
  }
}

const dir = `out/themes/${THEME_NAME}`;
mkdirSync(dir, { recursive: true });
const path = `${dir}/preview_${format}.png`;
await Bun.write(path, sheet.toBuffer("image/png"));
console.log(`theme ${THEME_NAME}: ${ids.join(", ")}`);
console.log(`wrote ${path}`);
