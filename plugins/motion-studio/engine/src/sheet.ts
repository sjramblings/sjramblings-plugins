// bun src/sheet.ts <film> [--format 9x16] [--at 4.1]
// The stills an agent looks at before it is allowed to call a clip done.
import { loadFilm, videoPath, type FormatName } from "./lib/film.ts";
import { mkdirSync } from "node:fs";
import { flag, run } from "./lib/cli.ts";

const name = process.argv[2];
if (!name) throw new Error("usage: bun src/sheet.ts <film> [--format 9x16] [--at seconds]");
const film = await loadFilm(name);
const format = flag("format") ?? film.formats[0]!;
const at = Number(flag("at") ?? 0);
const dir = `out/${name}`;
// review the filed render if there is one, otherwise the latest scratch or draft render
const filed = videoPath(film, format as FormatName);
const src = (await Bun.file(filed).exists()) ? filed : `${dir}/${format}.mp4`;
mkdirSync(dir, { recursive: true });
if (!(await Bun.file(src).exists())) throw new Error(`${src} not found: run render first`);

const cols = 6;
const rows = Math.ceil((film.dur * 2) / cols);
const ff = (args: string[]) => run(["ffmpeg", "-y", "-loglevel", "error", ...args], true);

// two frames per second, six across
await ff(["-i", src, "-vf", `fps=2,scale=270:-1,tile=${cols}x${rows}`, "-frames:v", "1", `${dir}/contact.png`]);
// twelve consecutive frames around a fast action: catches pops and overlaps
await ff(["-ss", String(at), "-i", src, "-vf", "scale=240:-1,tile=12x1", "-frames:v", "1", `${dir}/strip.png`]);
// how it reads at phone width
await ff(["-i", src, "-vf", `fps=1,scale=360:-1,tile=4x${Math.ceil(film.dur / 4)}`, "-frames:v", "1", `${dir}/phone.png`]);
// play it twice back to back and watch the seam
await ff(["-stream_loop", "1", "-i", src, "-c", "copy", `${dir}/loop_check.mp4`]);
// poster: the frame one third of the way in
await ff(["-ss", String(film.dur / 3), "-i", src, "-frames:v", "1", `${dir}/poster.png`]);

for (const f of ["contact.png", "strip.png", "phone.png", "loop_check.mp4", "poster.png"]) console.log(`wrote ${dir}/${f}`);
