// bun src/determinism.ts <film>
// Paints sample frames twice on fresh canvases, out of order, and compares hashes.
import { createCanvas } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import { drawFrame, layoutFor, loadFilm } from "./lib/film.ts";

const name = process.argv[2];
if (!name) throw new Error("usage: bun src/determinism.ts <film>");
const film = await loadFilm(name);

function hashAt(t: number, format: (typeof film.formats)[number]): string {
  const L = layoutFor(format);
  const canvas = createCanvas(L.w, L.h);
  drawFrame(canvas.getContext("2d"), film, t, L);
  return createHash("sha256").update(canvas.data()).digest("hex");
}

const times = Array.from({ length: 8 }, (_, i) => ((i + 0.37) * film.dur) / 8);
let bad = 0;
for (const format of film.formats) {
  const first = times.map((t) => hashAt(t, format));
  const second = [...times].reverse().map((t) => hashAt(t, format)).reverse();
  first.forEach((h, i) => {
    if (h !== second[i]) {
      bad++;
      console.error(`MISMATCH ${format} t=${times[i]!.toFixed(3)}`);
    }
  });
}
if (bad) process.exit(1);
console.log(`deterministic: ${times.length * film.formats.length} frames matched across two passes`);
