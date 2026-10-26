// bun src/still.ts <film> <format> <seconds...>
// Paints single frames straight to PNG (no look, no sound) for a fast layout check.
// Writes out/<film>/still_<format>_<seconds>.png.
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync } from "node:fs";
import { drawFrame, layoutFor, loadFilm, type FormatName } from "./lib/film.ts";

const [name, format, ...times] = process.argv.slice(2);
if (!name || !format || !times.length) throw new Error("usage: bun src/still.ts <film> <format> <seconds...>");
const film = await loadFilm(name);
const L = layoutFor(format as FormatName);
mkdirSync(`out/${name}`, { recursive: true });
for (const t of times) {
  const canvas = createCanvas(L.w, L.h);
  drawFrame(canvas.getContext("2d"), film, Number(t), L);
  const path = `out/${name}/still_${format}_${t}.png`;
  await Bun.write(path, canvas.toBuffer("image/png"));
  console.log(path);
}
