// bun src/render.ts <film> [--format 9x16|all] [--sub 4] [--draft]
// Walks time, paints each frame on a Skia canvas and pipes raw pixels to ffmpeg.
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync } from "node:fs";
import { synth, toWav } from "./lib/audio.ts";
import { dirname } from "node:path";
import { drawFrame, FORMATS, layoutFor, loadFilm, videoPath, type Film, type FormatName } from "./lib/film.ts";
import { flag, run } from "./lib/cli.ts";
import { LOOKS } from "./lib/look.ts";

const TARGET_LUFS = -14;

async function renderSilent(film: Film, format: FormatName, sub: number, scale: number, out: string): Promise<void> {
  const L = layoutFor(format);
  const canvas = createCanvas(L.w, L.h);
  const g = canvas.getContext("2d");
  const rate = film.fps * sub;
  const total = Math.round(film.dur * rate);

  // tmix averages `sub` consecutive subframes for motion blur; select keeps one per group
  const filters: string[] = [];
  if (sub > 1) filters.push(`tmix=frames=${sub}`, `select='eq(mod(n\\,${sub})\\,${sub - 1})'`, `setpts=N/${film.fps}/TB`);
  if (film.look) filters.push(LOOKS[film.look]);
  if (scale !== 1) filters.push(`scale=${Math.round((L.w * scale) / 2) * 2}:-2`);

  const args = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${L.w}x${L.h}`, "-framerate", String(rate), "-i", "-"];
  if (filters.length) args.push("-vf", filters.join(","));
  args.push("-r", String(film.fps), "-c:v", "libx264", "-crf", "16");
  // A look adds moving grain, which crf alone encodes at over 60 Mbit/s: 250 MB for a
  // 30 second clip. Cap it. 12 Mbit/s is above what YouTube and LinkedIn keep at 1080p.
  if (film.look) args.push("-maxrate", "12M", "-bufsize", "24M");
  args.push("-pix_fmt", "yuv420p", out);

  const ff = Bun.spawn(args, { stdin: "pipe", stdout: "inherit", stderr: "inherit" });
  for (let i = 0; i < total; i++) {
    drawFrame(g, film, i / rate, L);
    ff.stdin.write(canvas.data());
    await ff.stdin.flush();
    if (i % (rate * 3) === 0) console.log(`  ${format}  ${(i / rate).toFixed(0)}s / ${film.dur}s`);
  }
  await ff.stdin.end();
  if ((await ff.exited) !== 0) throw new Error(`ffmpeg failed encoding ${format}`);
  // A dropped frame is silent otherwise: count what was encoded against what was painted.
  const probe = await run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=nb_frames", "-of", "csv=p=0", out], true);
  const want = Math.round(film.dur * film.fps);
  if (Number(probe.stdout.trim()) !== want) throw new Error(`${format}: encoded ${probe.stdout.trim()} frames, expected ${want}`);
}

// Synthesise, then two-pass loudnorm: measure first, correct second, true peak capped.
async function renderAudio(film: Film, dir: string): Promise<string> {
  const wav = `${dir}/audio.wav`;
  await Bun.write(wav, toWav(synth(film)));
  const target = `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11`;
  const probe = await run(["ffmpeg", "-hide_banner", "-i", wav, "-af", `${target}:print_format=json`, "-f", "null", "-"]);
  const json = probe.stderr.slice(probe.stderr.lastIndexOf("{"), probe.stderr.lastIndexOf("}") + 1);
  const m = JSON.parse(json) as Record<string, string>;
  const pass2 = `${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const out = `${dir}/audio.m4a`;
  await run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", pass2, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], true);
  console.log(`  audio  measured ${m.input_i} LUFS, peak ${m.input_tp} dBTP, normalised to ${TARGET_LUFS}`);
  return out;
}

const name = process.argv[2];
if (!name) throw new Error("usage: bun src/render.ts <film> [--format 9x16|all] [--sub 4] [--draft]");
const film = await loadFilm(name);
const draft = process.argv.includes("--draft");
const sub = Number(flag("sub") ?? (draft ? 1 : 4));
const scale = draft ? 0.5 : 1;
const want = flag("format") ?? "all";
const formats = want === "all" ? film.formats : [want as FormatName];
for (const f of formats) if (!(f in FORMATS)) throw new Error(`unknown format ${f}`);

const dir = `out/${name}`;
mkdirSync(dir, { recursive: true });
const audio = await renderAudio(film, dir);
for (const f of formats) {
  const silent = `${dir}/${f}.silent.mp4`;
  await renderSilent(film, f, sub, scale, silent);
  const final = videoPath(film, f, draft);
  mkdirSync(dirname(final), { recursive: true });
  // No -shortest here: the encoded audio can end a hair before the picture, and -shortest
  // then drops the last video frame. Cut both streams at the film's length instead.
  await run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", audio, "-c", "copy", "-t", String(film.dur), "-movflags", "+faststart", final], true);
  const muxed = await run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=nb_frames", "-of", "csv=p=0", final], true);
  const frames = Math.round(film.dur * film.fps);
  if (Number(muxed.stdout.trim()) !== frames) throw new Error(`${f}: the finished file has ${muxed.stdout.trim()} frames, expected ${frames}`);
  console.log(`wrote ${final}`);
}
