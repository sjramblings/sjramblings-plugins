// Concept kit: a cinematic template for explaining how a tool works. A clip is a spec:
// a few props on a stage (a context window, agents, a file store, a remote machine, you),
// and three or four beats that act on them. The kit supplies the world, the light, the
// camera and the timing, so every concept in a series looks like part of one film.
//
// The stage has depth: far dust, soft colour, a faint grid, the props, and near bokeh.
// The camera reframes onto whatever each beat is about and never stops creeping in.
import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import { beat, layoutFor, type Cue, type Film, type FormatName, type Layout, type Scene } from "../lib/film.ts";
import { clamp, lerp, rng, smooth, spring, SPRINGS } from "../lib/motion.ts";
import { BRAND } from "../../brand.ts";
import { alpha } from "../lib/brand.ts";
import { DISPLAY, label, load, text, THEME, UI } from "./explainer.ts";

const STAGE = BRAND.stage;

// ---- the spec ----
export type BlockKind = "system" | "memory" | "tools" | "you" | "claude" | "result" | "summary" | "file";
export type Tone = "gold" | "blue" | "violet" | "green" | "red";

// Something that takes up room in a context window. `keep` blocks survive a compact or a clear.
export interface BlockSpec {
  kind: BlockKind;
  size: number; // share of the window's capacity, which is 100 unless the prop says otherwise
  label?: string;
  keep?: boolean;
}

export interface PropSpec {
  id: string;
  kind: "window" | "agent" | "store" | "remote" | "user" | "gate" | "clock" | "line";
  label: string;
  at: [number, number]; // grid position; one cell is two prop-widths
  size?: number; // 1 is normal
  tone?: Tone;
  hidden?: boolean; // not on stage until a beat spawns it
  capacity?: number; // window only
  gauge?: boolean; // window only: print how full it is as a percentage. Off by default, because
  // block sizes are chosen to read well, and a figure on screen would claim more than we know
  blocks?: BlockSpec[]; // window only: what is in it at the start
  cards?: string[]; // store only: files in it at the start
  text?: string; // line only: the command it shows at the start
}

export type Action =
  | { add: BlockSpec; to: string } // a block drops into a window
  | { compact: string; into?: string; size?: number } // everything not kept folds into one summary block
  | { clear: string } // everything not kept goes
  | { send: [from: string, to: string]; label?: string; tone?: Tone; stop?: boolean } // a pulse travels between two props; stop: it is refused on arrival
  | { type: string; on: string } // a line prop types out a new command
  | { load: BlockSpec; from: string; to: string } // a pulse, then a block lands in the window
  | { write: string; to: string; from?: string } // a file appears in a store
  | { spawn: string } // a hidden prop comes on stage
  | { badge: string; on: string; tone?: Tone }; // a pill pinned to a prop. A later badge on the same prop replaces it; an empty one clears it

export interface Beat {
  say: string; // the caption; *asterisks* mark the words to light up
  focus?: string[]; // what the camera frames; everything else dims. Omit for the whole stage
  do?: Action[];
  catch?: boolean; // the honest limit: tagged and lit in red
}

export interface ConceptSpec {
  series: string; // short code, e.g. "cc"
  topic: string; // shown in the header, e.g. "Claude Code"
  number: number;
  slug: string;
  title?: string; // the feature the clip is about, shown under the header all the way through, so a line
  // that is only true of that feature is never read as true of the whole product
  checked: string; // YYYY-MM-DD the facts were last checked against the sources
  status: "made" | "draft";
  hook: string;
  props: PropSpec[];
  beats: Beat[]; // three or four
  takeaway: string;
  tagline?: string; // the line under the site name on the end card
  seconds?: 30 | 45; // 30 by default. A 45 second clip has room for four to six beats: a scenario, not one feature
  sources: string[];
}

export const LIMITS = { hook: 9, say: 14, takeaway: 12, label: 20, block: 14, props: 6, line: 44, title: 28 } as const;

export const conceptId = (spec: Pick<ConceptSpec, "series" | "number" | "slug">): string =>
  `${spec.series}-${String(spec.number).padStart(2, "0")}-${spec.slug}`;

const TONES: Record<Tone, string> = { gold: THEME.gold, blue: THEME.blue, violet: THEME.violet, green: THEME.good, red: THEME.bad };
const BLOCKS: Record<BlockKind, string> = {
  system: THEME.muted,
  memory: THEME.gold,
  tools: THEME.blue,
  you: THEME.ink,
  claude: THEME.violet,
  result: THEME.good,
  summary: THEME.soft,
  file: THEME.blue,
};

// ---- timeline: 100 BPM; 50 beats for 30 seconds, 75 beats for 45 ----
const BPM = 100;
const B = beat(BPM, 1);
const T_HOOK = 5 * B;
const T_OUT = 9 * B;
const mainOf = (spec: Pick<ConceptSpec, "seconds">): number => (spec.seconds === 45 ? 61 : 36) * B;
export const durationOf = (spec: Pick<ConceptSpec, "seconds">): number => T_HOOK + mainOf(spec) + T_OUT;
export const DURATION = durationOf({});
const BEATS = { 30: [3, 4], 45: [4, 6] } as const;

// The moments a still should be taken to stand for each part of a clip: the hook while it
// is still fully up, each beat once everything in it has landed, then the end card. Used
// for carousels.
export function stills(spec: Pick<ConceptSpec, "beats" | "seconds">): { part: string; t: number }[] {
  const len = mainOf(spec) / spec.beats.length;
  return [
    { part: "hook", t: T_HOOK - 0.5 },
    ...spec.beats.map((_, i) => ({ part: `beat-${i + 1}`, t: T_HOOK + (i + 1) * len - 0.3 })),
    { part: "takeaway", t: durationOf(spec) - 0.1 },
  ];
}

// ---- compile: turn beats into timed events, so any frame can be drawn by itself ----
interface Block extends BlockSpec {
  tIn: number;
}
interface Fold {
  t: number;
}
interface Send {
  from: string;
  to: string;
  t: number;
  label?: string;
  tone: Tone;
  stop: boolean;
}
interface Compiled {
  len: number; // seconds per beat
  starts: number[];
  blocks: Map<string, Block[]>;
  folds: Map<string, Fold[]>;
  sends: Send[];
  cards: Map<string, { label: string; tIn: number }[]>;
  spawns: Map<string, number>;
  lines: Map<string, { text: string; t: number }[]>;
  badges: { on: string; text: string; tone: Tone; t: number }[];
  pops: number[]; // moments something lands, for sound
  main: number; // seconds between the hook and the end card
}

const TRAVEL = 0.8; // seconds a pulse takes to cross

function compile(spec: ConceptSpec): Compiled {
  const main = mainOf(spec);
  const len = main / spec.beats.length;
  const c: Compiled = { main, len, starts: [], blocks: new Map(), folds: new Map(), sends: [], cards: new Map(), spawns: new Map(), lines: new Map(), badges: [], pops: [] };
  for (const p of spec.props) {
    if (p.kind === "window") {
      c.blocks.set(p.id, (p.blocks ?? []).map((b) => ({ ...b, tIn: -1 })));
      c.folds.set(p.id, []);
    }
    if (p.kind === "store") c.cards.set(p.id, (p.cards ?? []).map((l) => ({ label: l, tIn: -1 })));
    if (p.kind === "line") c.lines.set(p.id, [{ text: p.text ?? "", t: -10 }]);
  }
  spec.beats.forEach((bt, i) => {
    const start = T_HOOK + i * len;
    c.starts.push(start);
    const acts = bt.do ?? [];
    const gap = Math.min(0.8, (len - 2.2) / Math.max(1, acts.length));
    acts.forEach((a, k) => {
      const t = start + 0.7 + k * gap;
      if ("add" in a) {
        c.blocks.get(a.to)!.push({ ...a.add, tIn: t });
        c.pops.push(t);
      } else if ("compact" in a) {
        c.folds.get(a.compact)!.push({ t });
        c.blocks.get(a.compact)!.push({ kind: "summary", label: a.into ?? "summary", size: a.size ?? 10, tIn: t + 0.55 });
        c.pops.push(t + 0.55);
      } else if ("clear" in a) c.folds.get(a.clear)!.push({ t });
      else if ("send" in a) c.sends.push({ from: a.send[0], to: a.send[1], t, label: a.label, tone: a.stop ? "red" : (a.tone ?? "gold"), stop: a.stop ?? false });
      else if ("type" in a) {
        c.lines.get(a.on)!.push({ text: a.type, t });
        c.pops.push(t);
      }
      else if ("load" in a) {
        c.sends.push({ from: a.from, to: a.to, t, label: a.load.label, tone: "gold", stop: false });
        c.blocks.get(a.to)!.push({ ...a.load, tIn: t + TRAVEL });
        c.pops.push(t + TRAVEL);
      } else if ("write" in a) {
        if (a.from) c.sends.push({ from: a.from, to: a.to, t, label: a.write, tone: "gold", stop: false });
        c.cards.get(a.to)!.push({ label: a.write, tIn: t + (a.from ? TRAVEL : 0) });
        c.pops.push(t + (a.from ? TRAVEL : 0));
      } else if ("spawn" in a) {
        c.spawns.set(a.spawn, t);
        c.pops.push(t);
      } else c.badges.push({ on: a.on, text: a.badge, tone: a.tone ?? "gold", t });
    });
  });
  return c;
}

// How much of its full height a block has at time t: growing in, or folding away.
function blockShare(b: Block, folds: Fold[], t: number): number {
  let f = b.tIn < 0 ? 1 : smooth((t - b.tIn) / 0.4);
  if (!b.keep) for (const fold of folds) if (fold.t >= b.tIn) f *= 1 - smooth((t - fold.t) / 0.8);
  return f;
}

const words = (s: string): number => s.replaceAll("*", "").trim().split(/\s+/).length;

export function validate(spec: ConceptSpec): string[] {
  const bad: string[] = [];
  const kinds = new Map(spec.props.map((p) => [p.id, p.kind]));
  if (kinds.size !== spec.props.length) bad.push("duplicate prop id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.checked)) bad.push(`checked must be YYYY-MM-DD, got "${spec.checked}"`);
  const [lo, hi] = BEATS[spec.seconds ?? 30];
  if (spec.beats.length < lo || spec.beats.length > hi) bad.push(`needs ${lo} to ${hi} beats, has ${spec.beats.length}`);
  if (spec.props.length > LIMITS.props) bad.push(`${spec.props.length} props, limit ${LIMITS.props}`);
  if (spec.sources.length === 0) bad.push("no sources recorded");
  const over = (name: string, s: string, max: number) => {
    if (words(s) > max) bad.push(`${name} is ${words(s)} words, limit ${max}: "${s}"`);
  };
  if (spec.title && spec.title.length > LIMITS.title) bad.push(`title too long: "${spec.title}"`);
  over("hook", spec.hook, LIMITS.hook);
  over("takeaway", spec.takeaway, LIMITS.takeaway);
  for (const p of spec.props) {
    if (p.label.length > LIMITS.label) bad.push(`label too long: "${p.label}"`);
    if (p.text && p.text.length > LIMITS.line) bad.push(`line too long: "${p.text}"`);
  }
  const is = (id: string, kind: PropSpec["kind"] | undefined, where: string) => {
    if (!kinds.has(id)) bad.push(`${where} names missing prop "${id}"`);
    else if (kind && kinds.get(id) !== kind) bad.push(`${where}: "${id}" is not a ${kind}`);
  };
  const blockOk = (b: BlockSpec, where: string) => {
    if (b.label && b.label.length > LIMITS.block) bad.push(`${where}: block label too long: "${b.label}"`);
  };
  spec.beats.forEach((bt, i) => {
    const w = `beat ${i + 1}`;
    over(w, bt.say, LIMITS.say);
    bt.focus?.forEach((id) => is(id, undefined, `${w} focus`));
    for (const a of bt.do ?? []) {
      if ("add" in a) (is(a.to, "window", w), blockOk(a.add, w));
      else if ("compact" in a) is(a.compact, "window", w);
      else if ("clear" in a) is(a.clear, "window", w);
      else if ("send" in a) (is(a.send[0], undefined, w), is(a.send[1], undefined, w));
      else if ("load" in a) (is(a.from, undefined, w), is(a.to, "window", w), blockOk(a.load, w));
      else if ("write" in a) (is(a.to, "store", w), a.from && is(a.from, undefined, w));
      else if ("spawn" in a) is(a.spawn, undefined, w);
      else if ("type" in a) {
        is(a.on, "line", w);
        if (a.type.length > LIMITS.line) bad.push(`${w}: line too long: "${a.type}"`);
      }
      else is(a.on, undefined, w);
    }
  });
  if (bad.length) return bad;
  // no window may ever hold more than it has room for
  const c = compile(spec);
  for (const p of spec.props) {
    if (p.kind !== "window") continue;
    const cap = p.capacity ?? 100;
    const all = c.blocks.get(p.id)!;
    const folds = c.folds.get(p.id)!;
    for (const at of [0, ...all.map((b) => b.tIn + 0.45), ...folds.map((f) => f.t - 0.01)]) {
      const used = all.reduce((sum, b) => sum + (b.tIn <= at ? b.size * blockShare(b, folds, at) : 0), 0);
      if (used > cap + 0.01) bad.push(`window "${p.id}" holds ${Math.round(used)} of ${cap} at ${at.toFixed(1)}s`);
    }
  }
  return bad;
}

// ---- the stage, in world units. One grid cell is 200 units. ----
const CELL = 200;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const extent = (p: PropSpec): { w: number; h: number } => {
  const s = p.size ?? 1;
  if (p.kind === "window") return { w: 150 * s, h: 300 * s };
  if (p.kind === "agent") return { w: 120 * s, h: 120 * s };
  if (p.kind === "store") return { w: 140 * s, h: 160 * s };
  if (p.kind === "remote") return { w: 250 * s, h: 230 * s };
  if (p.kind === "gate") return { w: 84 * s, h: 210 * s };
  if (p.kind === "clock") return { w: 112 * s, h: 112 * s };
  if (p.kind === "line") return { w: 300 * s, h: 58 * s };
  return { w: 132 * s, h: 58 * s };
};

interface Stage {
  at: Map<string, Box>; // each prop's box, centred on the middle of the whole set
  all: Box;
}

function stage(spec: ConceptSpec): Stage {
  const raw = spec.props.map((p) => ({ p, cx: p.at[0] * CELL, cy: p.at[1] * CELL, ...extent(p) }));
  const x0 = Math.min(...raw.map((r) => r.cx - r.w / 2));
  const x1 = Math.max(...raw.map((r) => r.cx + r.w / 2));
  const y0 = Math.min(...raw.map((r) => r.cy - r.h / 2));
  const y1 = Math.max(...raw.map((r) => r.cy + r.h / 2));
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const at = new Map<string, Box>();
  for (const r of raw) at.set(r.p.id, { x: r.cx - mx, y: r.cy - my, w: r.w, h: r.h });
  return { at, all: { x: 0, y: 0, w: x1 - x0, h: y1 - y0 } };
}

function around(boxes: Box[]): Box {
  const x0 = Math.min(...boxes.map((b) => b.x - b.w / 2));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w / 2));
  const y0 = Math.min(...boxes.map((b) => b.y - b.h / 2));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h / 2));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

// ---- framing: where the picture and the caption sit in each format ----
interface Framing {
  m: number;
  stacked: boolean;
  head: number;
  pic: Box; // centre and size of the area the camera composes for
  cap: { x: number; y: number; w: number };
}
function framing(L: Layout): Framing {
  const m = L.u * 7;
  const stacked = L.w / L.h < 1.3;
  if (stacked) return { m, stacked, head: L.h * 0.09, pic: { x: L.cx, y: L.h * 0.385, w: L.w - 1.2 * m, h: L.h * 0.5 }, cap: { x: m, y: L.h * 0.69, w: L.w - 2 * m } };
  return { m, stacked, head: L.h * 0.13, pic: { x: L.w * 0.31, y: L.h * 0.54, w: L.w * 0.5, h: L.h * 0.66 }, cap: { x: L.w * 0.62, y: L.h * 0.38, w: L.w * 0.38 - m } };
}

interface Cam {
  x: number;
  y: number;
  scale: number; // pixels per world unit on the prop plane
}

function shot(target: Box, F: Framing): Cam {
  const pad = 70;
  const fit = Math.min(F.pic.w / (target.w + pad), F.pic.h / (target.h + pad * 1.4));
  // never so close that one small prop fills the frame
  return { x: target.x, y: target.y, scale: Math.min(fit, F.pic.h / 340) };
}

// How large the props are drawn, in pixels per world unit: on the whole stage, and in each beat.
// A clip whose props look lost on the stage shows up here as a low number.
export function scales(spec: ConceptSpec, format: FormatName): { all: number; beats: number[] } {
  const S = stage(spec);
  const F = framing(layoutFor(format));
  return {
    all: shot(S.all, F).scale,
    beats: spec.beats.map((bt) => shot(bt.focus?.length ? around(bt.focus.map((id) => S.at.get(id)!)) : S.all, F).scale),
  };
}

// ---- drawing the props ----
function glow(g: SKRSContext2D, color: string, blur: number, draw: () => void): void {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = blur;
  draw();
  g.restore();
}

function caption(g: SKRSContext2D, str: string, x: number, y: number, size: number, color: string): void {
  g.font = `600 ${size}px ${UI}`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = color;
  g.fillText(str, x, y);
}

function drawWindow(g: SKRSContext2D, p: PropSpec, b: Box, c: Compiled, t: number, px: number): void {
  const cap = p.capacity ?? 100;
  const blocks = c.blocks.get(p.id)!;
  const folds = c.folds.get(p.id)!;
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  const pad = b.w * 0.07;
  const innerH = b.h - 2 * pad;
  const used = blocks.reduce((sum, bl) => sum + (bl.tIn <= t ? bl.size * blockShare(bl, folds, t) : 0), 0);
  const frac = clamp(used / cap);
  const hot = smooth((frac - 0.72) / 0.2);
  const edge = hot > 0 ? alpha(THEME.bad, 0.5 + 0.5 * hot) : alpha(STAGE.rim, 0.75);

  // the glass
  g.fillStyle = alpha(STAGE.glass, 0.045);
  g.beginPath();
  g.roundRect(left, top, b.w, b.h, b.w * 0.1);
  g.fill();
  glow(g, hot > 0 ? THEME.bad : THEME.blue, 26 * px * (0.5 + hot), () => {
    g.strokeStyle = edge;
    g.lineWidth = 2.2;
    g.beginPath();
    g.roundRect(left, top, b.w, b.h, b.w * 0.1);
    g.stroke();
  });

  // blocks stack from the floor up, oldest at the bottom
  let y = top + b.h - pad;
  for (const bl of blocks) {
    if (bl.tIn > t) continue;
    const share = blockShare(bl, folds, t);
    const h = (bl.size / cap) * innerH * share;
    if (h < 0.6) continue;
    const drop = bl.tIn < 0 ? 0 : (1 - spring(t - bl.tIn, SPRINGS.standard)) * -70;
    const color = BLOCKS[bl.kind];
    const by = y - h + drop;
    g.save();
    g.globalAlpha *= bl.tIn < 0 ? 1 : clamp((t - bl.tIn) * 6);
    glow(g, color, 14 * px, () => {
      g.fillStyle = color;
      g.beginPath();
      g.roundRect(left + pad, by + 1.5, b.w - 2 * pad, Math.max(1, h - 3), Math.min(6, h / 2));
      g.fill();
    });
    // kept blocks flash as the fold finishes: they are loaded again, not carried over
    if (bl.keep)
      for (const fold of folds) {
        const k = (t - fold.t - 0.85) / 0.6;
        if (k > 0 && k < 1) {
          g.fillStyle = alpha(STAGE.glass, 0.75 * Math.sin(Math.PI * k));
          g.beginPath();
          g.roundRect(left + pad, by + 1.5, b.w - 2 * pad, Math.max(1, h - 3), Math.min(6, h / 2));
          g.fill();
        }
      }
    if (bl.label && h > 11) {
      g.font = `700 ${Math.min(14, h * 0.66)}px ${UI}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = THEME.bg;
      g.fillText(bl.label, b.x, by + h / 2 + 0.5, b.w - 2 * pad - 8);
    }
    g.restore();
    y -= h;
  }

  // how full, and the name
  if (p.gauge) {
    g.font = `700 15px ${UI}`;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = hot > 0.5 ? THEME.bad : THEME.dim;
    g.fillText(`${Math.round(frac * 100)}%`, left + b.w + 10, top + 16);
  }
  caption(g, p.label, b.x, top + b.h + 24, 13.5, THEME.ink);
}

function drawAgent(g: SKRSContext2D, p: PropSpec, b: Box, t: number, px: number): void {
  const color = TONES[p.tone ?? "gold"];
  const r = b.w * 0.3;
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.45 + i * 0.5) % 1;
    g.strokeStyle = color;
    g.save();
    g.globalAlpha *= 0.5 * (1 - phase);
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(b.x, b.y, r * (1.05 + phase * 0.75), 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  const core = g.createRadialGradient(b.x - r * 0.25, b.y - r * 0.3, r * 0.05, b.x, b.y, r);
  core.addColorStop(0, STAGE.glass);
  core.addColorStop(0.35, color);
  core.addColorStop(1, alpha(STAGE.core, 0.9));
  glow(g, color, 40 * px, () => {
    g.fillStyle = core;
    g.beginPath();
    g.arc(b.x, b.y, r * (1 + 0.035 * Math.sin(t * 2.6)), 0, Math.PI * 2);
    g.fill();
  });
  caption(g, p.label, b.x, b.y + b.h / 2 + 16, 13.5, THEME.ink);
}

function drawStore(g: SKRSContext2D, p: PropSpec, b: Box, c: Compiled, t: number, px: number): void {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  g.fillStyle = alpha(THEME.gold, 0.07);
  glow(g, THEME.gold, 16 * px, () => {
    g.strokeStyle = alpha(THEME.gold, 0.8);
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(left, top + 12, b.w, b.h - 12, 10);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(left, top, b.w * 0.42, 22, [8, 8, 0, 0]);
    g.fill();
    g.stroke();
  });
  const cards = c.cards.get(p.id) ?? [];
  cards.forEach((card, i) => {
    if (card.tIn > t) return;
    const a = card.tIn < 0 ? 1 : spring(t - card.tIn, SPRINGS.playful);
    const cy = top + 28 + i * 26;
    g.save();
    g.globalAlpha *= clamp(a * 2);
    g.translate(b.x, cy + 10);
    g.scale(a, a);
    g.fillStyle = THEME.panel;
    g.strokeStyle = THEME.line;
    g.lineWidth = 1.2;
    g.beginPath();
    g.roundRect(-b.w / 2 + 10, -10, b.w - 20, 21, 5);
    g.fill();
    g.stroke();
    g.font = `600 11px ${UI}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = THEME.ink;
    g.fillText(card.label, 0, 1, b.w - 30);
    g.restore();
  });
  caption(g, p.label, b.x, top + b.h + 24, 13.5, THEME.ink);
}

function drawRemote(g: SKRSContext2D, p: PropSpec, b: Box, px: number): void {
  const color = TONES[p.tone ?? "blue"];
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  g.fillStyle = alpha(THEME.blue, 0.05);
  g.beginPath();
  g.roundRect(left, top, b.w, b.h, 18);
  g.fill();
  glow(g, color, 18 * px, () => {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.setLineDash([10, 8]);
    g.beginPath();
    g.roundRect(left, top, b.w, b.h, 18);
    g.stroke();
    g.setLineDash([]);
  });
  // a small cloud in the corner says "not your machine"
  g.fillStyle = color;
  const cx = left + 34;
  const cy = top + 28;
  g.beginPath();
  g.arc(cx - 9, cy + 3, 8, 0, Math.PI * 2);
  g.arc(cx, cy - 3, 11, 0, Math.PI * 2);
  g.arc(cx + 11, cy + 3, 8, 0, Math.PI * 2);
  g.rect(cx - 9, cy + 3, 20, 8);
  g.fill();
  caption(g, p.label, b.x, top + b.h + 24, 13.5, THEME.ink);
}

function drawUser(g: SKRSContext2D, p: PropSpec, b: Box, t: number, px: number): void {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  g.fillStyle = THEME.panel;
  glow(g, THEME.ink, 14 * px, () => {
    g.strokeStyle = THEME.ink;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(left, top, b.w, b.h, b.h / 2);
    g.fill();
    g.stroke();
  });
  g.font = `700 22px ${UI}`;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillStyle = THEME.gold;
  g.fillText(">", left + 22, b.y + 1);
  if (Math.floor(t * 1.6) % 2 === 0) {
    g.fillStyle = THEME.ink;
    g.fillRect(left + 44, b.y - 10, 11, 20);
  }
  caption(g, p.label, b.x, top + b.h + 22, 13.5, THEME.ink);
}

// Something a request has to pass: a permission check, a hook, a sandbox wall, a policy.
function drawGate(g: SKRSContext2D, p: PropSpec, b: Box, t: number, px: number): void {
  const color = TONES[p.tone ?? "gold"];
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  g.fillStyle = alpha(STAGE.glass, 0.03);
  g.beginPath();
  g.roundRect(left, top, b.w, b.h, 14);
  g.fill();
  glow(g, color, 22 * px, () => {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(left, top, b.w, b.h, 14);
    g.stroke();
  });
  // bars that breathe, so it reads as a barrier and not a box
  for (let i = 0; i < 5; i++) {
    const y = top + b.h * (0.18 + i * 0.16);
    g.save();
    g.globalAlpha *= 0.35 + 0.35 * Math.sin(t * 2.2 - i * 0.7);
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(left + b.w * 0.2, y - 3, b.w * 0.6, 6, 3);
    g.fill();
    g.restore();
  }
  caption(g, p.label, b.x, top + b.h + 24, 13.5, THEME.ink);
}

// Something that fires by itself: a schedule, a timer, an outside event.
function drawClock(g: SKRSContext2D, p: PropSpec, b: Box, t: number, px: number): void {
  const color = TONES[p.tone ?? "blue"];
  const r = b.w * 0.42;
  g.fillStyle = alpha(THEME.blue, 0.06);
  g.beginPath();
  g.arc(b.x, b.y, r, 0, Math.PI * 2);
  g.fill();
  glow(g, color, 20 * px, () => {
    g.strokeStyle = color;
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(b.x, b.y, r, 0, Math.PI * 2);
    g.stroke();
    g.lineCap = "round";
    for (const [len, speed, w] of [[0.72, 1.1, 2.4], [0.46, 1.1 / 12, 3.4]] as const) {
      const a = t * speed - Math.PI / 2;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + Math.cos(a) * r * len, b.y + Math.sin(a) * r * len);
      g.stroke();
    }
  });
  g.fillStyle = color;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.arc(b.x + Math.cos(a) * r * 0.86, b.y + Math.sin(a) * r * 0.86, i % 3 === 0 ? 2.4 : 1.3, 0, Math.PI * 2);
    g.fill();
  }
  caption(g, p.label, b.x, b.y + b.h / 2 + 18, 13.5, THEME.ink);
}

// One real command, typed out.
function drawLine(g: SKRSContext2D, p: PropSpec, b: Box, c: Compiled, t: number, px: number): void {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  g.fillStyle = THEME.deep;
  glow(g, THEME.ink, 12 * px, () => {
    g.strokeStyle = alpha(THEME.ink, 0.7);
    g.lineWidth = 1.8;
    g.beginPath();
    g.roundRect(left, top, b.w, b.h, 10);
    g.fill();
    g.stroke();
  });
  const entries = c.lines.get(p.id)!;
  const cur = [...entries].reverse().find((e) => e.t <= t) ?? entries[0]!;
  const shown = cur.text.slice(0, Math.max(0, Math.floor((t - cur.t) * 34)));
  // a long command gets smaller type, never squeezed letters
  g.font = `700 17px ${UI}`;
  g.letterSpacing = "0.5px";
  const full = g.measureText(cur.text).width;
  const fit = Math.min(1, (b.w - 62) / Math.max(1, full));
  g.letterSpacing = "0px";
  g.font = `700 17px ${UI}`;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillStyle = THEME.gold;
  g.fillText(">", left + 16, b.y + 1);
  g.fillStyle = THEME.ink;
  g.font = `700 ${17 * fit}px ${UI}`;
  g.letterSpacing = `${0.5 * fit}px`; // also stops two hyphens joining into a dash
  // a gap is forced between two hyphens, so a flag reads as two hyphens and not one dash
  let x = left + 36;
  for (let i = 0; i < shown.length; i++) {
    const ch = shown[i]!;
    g.fillText(ch, x, b.y + 1);
    x += g.measureText(ch).width + (ch === "-" && shown[i + 1] === "-" ? 2.2 * fit : 0);
  }
  if (Math.floor(t * 1.8) % 2 === 0) g.fillRect(x + 2, b.y - 10 * fit, 9 * fit, 20 * fit);
  g.letterSpacing = "0px";
  caption(g, p.label, b.x, top + b.h + 22, 13.5, THEME.ink);
}

// ---- the film ----
interface Dot {
  x: number;
  y: number;
  r: number;
  a: number;
  hue: string;
}

export async function concept(spec: ConceptSpec): Promise<Film> {
  const problems = validate(spec);
  if (problems.length) throw new Error(`${conceptId(spec)}: ${problems.join("; ")}`);
  const c = compile(spec);
  const S = stage(spec);
  const logo: Image = await load(BRAND.logo, 512);
  const n = spec.beats.length;
  const tag = `${spec.topic} · ${String(spec.number).padStart(2, "0")}`;

  // scenery is seeded, so every render of a clip is identical
  const rand = rng(spec.number * 7919 + 13);
  const span = Math.max(S.all.w, S.all.h) + 1400;
  const scatter = (count: number, rMin: number, rMax: number, aMin: number, aMax: number): Dot[] =>
    Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * span * 1.6,
      y: (rand() - 0.5) * span * 1.6,
      r: lerp(rMin, rMax, rand()),
      a: lerp(aMin, aMax, rand()),
      hue: [THEME.gold, THEME.blue, THEME.violet][Math.floor(rand() * 3)]!,
    }));
  const dust = scatter(170, 0.8, 2.4, 0.15, 0.7);
  const haze = scatter(7, 280, 560, 0.1, 0.2);
  const bokeh = scatter(11, 26, 70, 0.035, 0.08);

  const beatAt = (t: number): number => clamp(Math.floor((t - T_HOOK) / c.len), 0, n - 1);
  const targetOf = (phase: number): Box => {
    const focus = phase >= 0 && phase < n ? spec.beats[phase]!.focus : undefined;
    return focus?.length ? around(focus.map((id) => S.at.get(id)!)) : S.all;
  };
  // phase -1 is the hook, n is the end card: both show the whole stage
  function camera(t: number, F: Framing): { cam: Cam; base: number } {
    const phase = t < T_HOOK ? -1 : t >= T_HOOK + c.main ? n : beatAt(t);
    const start = phase < 0 ? 0 : phase >= n ? T_HOOK + c.main : c.starts[phase]!;
    const now = shot(targetOf(phase), F);
    const was = phase < 0 ? now : shot(targetOf(phase - 1), F);
    const k = spring(t - start, { k: 60, d: 16 });
    const creep = 1 + 0.045 * clamp((t - start) / c.len); // the camera never quite stops
    return {
      base: shot(S.all, F).scale,
      cam: {
        x: lerp(was.x, now.x, k) + Math.sin(t * 0.31) * 5,
        y: lerp(was.y, now.y, k) + Math.cos(t * 0.23) * 4,
        scale: lerp(was.scale, now.scale, k) * creep * (phase < 0 ? 0.94 : 1),
      },
    };
  }

  function world(g: SKRSContext2D, t: number, L: Layout): void {
    const F = framing(L);
    const { cam, base } = camera(t, F);
    const plane = (depth: number, draw: (px: number) => void): void => {
      const s = base * Math.pow(cam.scale / base, depth);
      g.save();
      g.translate(F.pic.x, F.pic.y);
      g.scale(s, s);
      g.translate(-cam.x * depth, -cam.y * depth);
      draw(1 / s);
      g.restore();
    };

    // light behind the stage
    const sky = g.createRadialGradient(F.pic.x, F.pic.y, 0, F.pic.x, F.pic.y, Math.max(L.w, L.h) * 0.75);
    sky.addColorStop(0, STAGE.sky[0]);
    sky.addColorStop(0.55, STAGE.sky[1]);
    sky.addColorStop(1, STAGE.sky[2]);
    g.fillStyle = sky;
    g.fillRect(0, 0, L.w, L.h);

    plane(0.12, () => {
      for (const d of dust) {
        g.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(t * 0.9 + d.x));
        g.fillStyle = THEME.ink;
        g.beginPath();
        g.arc(d.x, d.y + t * 2, d.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    });
    plane(0.3, () => {
      for (const h of haze) {
        const grad = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
        grad.addColorStop(0, h.hue);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = h.a;
        g.fillStyle = grad;
        g.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
      }
      g.globalAlpha = 1;
    });
    plane(0.65, (px) => {
      g.strokeStyle = alpha(STAGE.rim, 0.07);
      g.lineWidth = px * 1.2;
      const reach = span;
      g.beginPath();
      for (let v = -reach; v <= reach; v += 100) {
        g.moveTo(v, -reach);
        g.lineTo(v, reach);
        g.moveTo(-reach, v);
        g.lineTo(reach, v);
      }
      g.stroke();
    });

    // the props, and what passes between them
    const phase = t < T_HOOK ? -1 : t >= T_HOOK + c.main ? n : beatAt(t);
    const lit = (ph: number, id: string): number => {
      const focus = ph >= 0 && ph < n ? spec.beats[ph]!.focus : undefined;
      return !focus?.length || focus.includes(id) ? 1 : 0.28;
    };
    const blend = phase < 0 ? 1 : smooth((t - (phase >= n ? T_HOOK + c.main : c.starts[phase]!)) / 0.5);
    const shown = new Map<string, number>();
    plane(1, (px) => {
      const spot = targetOf(phase);
      const reach = Math.max(spot.w, spot.h) * 0.9 + 160;
      const beam = g.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, reach);
      beam.addColorStop(0, alpha(STAGE.beam, 0.20));
      beam.addColorStop(1, alpha(STAGE.beam, 0));
      g.globalAlpha = phase < 0 || phase >= n ? 0.5 : blend;
      g.fillStyle = beam;
      g.fillRect(spot.x - reach, spot.y - reach, reach * 2, reach * 2);
      g.globalAlpha = 1;
      for (const p of spec.props) {
        const born = c.spawns.get(p.id);
        if (p.hidden && (born === undefined || t < born)) continue;
        const pop = p.hidden ? spring(t - born!, SPRINGS.playful) : 1;
        const b = S.at.get(p.id)!;
        g.save();
        const light = lerp(lit(phase - 1, p.id), lit(phase, p.id), blend);
        // a prop the beat is not about fades right out if the camera has pushed it under
        // the header, the caption or the edge, so it never sits behind the words
        const sy0 = F.pic.y + (b.y - b.h / 2 - cam.y) * cam.scale;
        const sy1 = F.pic.y + (b.y + b.h / 2 + 30 - cam.y) * cam.scale;
        const sx0 = F.pic.x + (b.x - b.w / 2 - cam.x) * cam.scale;
        const sx1 = F.pic.x + (b.x + b.w / 2 - cam.x) * cam.scale;
        const over = Math.max(L.h * (F.stacked ? (spec.title ? 0.148 : 0.115) : spec.title ? 0.2 : 0.17) - sy0, sy1 - L.h * (F.stacked ? 0.635 : 0.97), sx1 - (F.stacked ? L.w - F.m * 0.3 : L.w * 0.6), F.m * 0.3 - sx0, 0);
        const clear = 1 - smooth(over / (L.u * 4));
        const vis = lerp(clear, 1, clamp((light - 0.28) / 0.72));
        shown.set(p.id, vis * clamp(pop * 2));
        // under the hook the props are only shapes in the dark, so no name crosses the title
        g.globalAlpha = light * vis * clamp(pop * 2) * (t < T_HOOK ? lerp(0.4, 1, smooth((t - T_HOOK + 0.25) / 0.25)) : 1);
        g.translate(b.x, b.y);
        g.scale(pop, pop);
        g.translate(-b.x, -b.y);
        if (p.kind === "window") drawWindow(g, p, b, c, t, px);
        else if (p.kind === "agent") drawAgent(g, p, b, t, px);
        else if (p.kind === "store") drawStore(g, p, b, c, t, px);
        else if (p.kind === "remote") drawRemote(g, p, b, px);
        else if (p.kind === "gate") drawGate(g, p, b, t, px);
        else if (p.kind === "clock") drawClock(g, p, b, t, px);
        else if (p.kind === "line") drawLine(g, p, b, c, t, px);
        else drawUser(g, p, b, t, px);
        g.restore();
      }

      for (const bd of c.badges) {
        if (!bd.text) continue; // an empty badge only clears the one before it
        const next = c.badges.find((o) => o.on === bd.on && o.t > bd.t);
        const pop = spring(t - bd.t, SPRINGS.playful) * (next ? 1 - smooth((t - next.t + 0.1) / 0.25) : 1);
        if (pop <= 0.001) continue;
        const seen = shown.get(bd.on) ?? 0; // a badge goes wherever its prop goes
        if (seen <= 0.01) continue;
        const b = S.at.get(bd.on)!;
        g.font = `700 12px ${UI}`;
        const w = g.measureText(bd.text).width + 22;
        g.save();
        g.globalAlpha = seen;
        g.translate(b.x, b.y - b.h / 2 - 20);
        g.scale(pop, pop);
        glow(g, TONES[bd.tone], 16 * px, () => {
          g.fillStyle = TONES[bd.tone];
          g.beginPath();
          g.roundRect(-w / 2, -12, w, 24, 12);
          g.fill();
        });
        g.fillStyle = THEME.bg;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(bd.text, 0, 1);
        g.restore();
      }

      for (const s of c.sends) {
        const k = (t - s.t) / TRAVEL;
        if (k < 0 || k > (s.stop ? 2.4 : 1.25)) continue;
        const a = S.at.get(s.from)!;
        const b = S.at.get(s.to)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        // a shallow arc, bowed to one side of the straight line
        const mx = (a.x + b.x) / 2 + (dy / dist) * dist * 0.16;
        const my = (a.y + b.y) / 2 - (dx / dist) * dist * 0.16;
        const point = (q: number): [number, number] => [
          (1 - q) * (1 - q) * a.x + 2 * (1 - q) * q * mx + q * q * b.x,
          (1 - q) * (1 - q) * a.y + 2 * (1 - q) * q * my + q * q * b.y,
        ];
        const color = TONES[s.tone];
        const fade = 1 - smooth((k - 1) / 0.25);
        if (s.stop && k >= 1) {
          // refused: a cross where it landed
          const pop = spring((k - 1) * TRAVEL, SPRINGS.playful) * (1 - smooth((k - 2) / 0.4));
          g.save();
          g.translate(b.x, b.y);
          g.scale(pop, pop);
          glow(g, THEME.bad, 24 * px, () => {
            g.strokeStyle = THEME.bad;
            g.lineWidth = 7;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(-18, -18);
            g.lineTo(18, 18);
            g.moveTo(18, -18);
            g.lineTo(-18, 18);
            g.stroke();
          });
          g.restore();
          if (k > 1.25) continue;
        }
        g.save();
        g.globalAlpha = 0.28 * fade;
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.setLineDash([5, 7]);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.quadraticCurveTo(mx, my, b.x, b.y);
        g.stroke();
        g.setLineDash([]);
        const head = smooth(clamp(k));
        for (let i = 12; i >= 0; i--) {
          const q = head - i * 0.022;
          if (q < 0) continue;
          const [x, y] = point(q);
          g.globalAlpha = fade * (1 - i / 13) * 0.9;
          glow(g, color, (i === 0 ? 30 : 8) * px, () => {
            g.fillStyle = i === 0 ? STAGE.glass : color;
            g.beginPath();
            g.arc(x, y, i === 0 ? 7 : 5.5 * (1 - i / 14), 0, Math.PI * 2);
            g.fill();
          });
        }
        if (s.label && k < 1) {
          const [x, y] = point(head);
          // the label shows only in mid-flight, so it never sits on the prop it leaves or the one it lands on
          g.globalAlpha = fade * clamp((k - 0.14) * 5) * (1 - smooth((k - 0.62) / 0.24));
          g.font = `700 11.5px ${UI}`;
          g.textAlign = "center";
          g.textBaseline = "alphabetic";
          g.fillStyle = THEME.ink;
          g.fillText(s.label, x, y - 14);
        }
        g.restore();
      }
    });

    plane(1.7, () => {
      for (const d of bokeh) {
        const grad = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        grad.addColorStop(0, d.hue);
        grad.addColorStop(0.7, d.hue);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = d.a;
        g.fillStyle = grad;
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    });

    // the stage is dim under the hook and the end card, and lit in between
    const dim = t < T_HOOK ? lerp(0.86, 0, smooth((t - T_HOOK + 0.3) / 0.3)) : lerp(0, 0.88, smooth((t - T_HOOK - c.main) / 0.6));
    if (dim > 0) {
      g.fillStyle = alpha(STAGE.shade, dim);
      g.fillRect(0, 0, L.w, L.h);
    }
    // a soft ceiling behind the header, and a soft floor under the words
    const lid = g.createLinearGradient(0, 0, 0, L.h * 0.14);
    lid.addColorStop(0, alpha(STAGE.shade, 0.8));
    lid.addColorStop(1, alpha(STAGE.shade, 0));
    g.fillStyle = lid;
    g.fillRect(0, 0, L.w, L.h * 0.14);
    const scrim = F.stacked ? g.createLinearGradient(0, L.h * 0.57, 0, L.h * 0.68) : g.createLinearGradient(L.w * 0.5, 0, L.w * 0.62, 0);
    scrim.addColorStop(0, alpha(STAGE.shade, 0));
    scrim.addColorStop(1, alpha(STAGE.shade, 0.86));
    g.fillStyle = scrim;
    if (F.stacked) g.fillRect(0, L.h * 0.57, L.w, L.h * 0.43);
    else g.fillRect(L.w * 0.5, 0, L.w * 0.5, L.h);
  }

  const hook: Scene = {
    name: "hook",
    from: 0,
    to: T_HOOK,
    draw(g, t, L) {
      world(g, t, L);
      const F = framing(L);
      const out = clamp((T_HOOK - t) / 0.22);
      const size = L.u * (F.stacked ? 11 : 8.5);
      const top = L.h * (F.stacked ? 0.3 : 0.34);
      g.globalAlpha = out;
      label(g, tag, F.m, top, L.u * 2.9, THEME.gold);
      const h = text(g, spec.hook, { x: F.m, y: top + size * 1.25, maxW: F.stacked ? L.w - 2 * F.m : L.w * 0.7, size, font: `700 ${DISPLAY}`, alpha: out, arrive: (i) => spring(t - 0.12 - i * 0.07, SPRINGS.heavy) });
      g.globalAlpha = out * spring(t - 0.9, SPRINGS.standard);
      g.fillStyle = THEME.gold;
      g.fillRect(F.m, top + size * 1.25 + h - size * 0.35, L.u * 22 * spring(t - 0.9, SPRINGS.standard), L.u * 0.9);
      g.globalAlpha = 1;
    },
  };

  const main: Scene = {
    name: "stage",
    from: T_HOOK,
    to: T_HOOK + c.main,
    draw(g, local, L) {
      const t = local + T_HOOK;
      world(g, t, L);
      const F = framing(L);
      const i = beatAt(t);
      const bt = spec.beats[i]!;
      const since = t - c.starts[i]!;
      label(g, tag, F.m, F.head, L.u * 2.6, THEME.gold);
      if (spec.title) {
        g.font = `600 ${L.u * 2.9}px ${UI}`;
        g.textAlign = "left";
        g.textBaseline = "alphabetic";
        g.fillStyle = THEME.ink;
        g.fillText(spec.title, F.m, F.head + L.u * 4.2);
      }
      // one pip per beat, the current one lit
      for (let k = 0; k < n; k++) {
        const w = L.u * 5.4;
        const x = L.w - F.m - (n - k) * (w + L.u * 1.4) + L.u * 1.4;
        g.fillStyle = k === i ? (bt.catch ? THEME.bad : THEME.gold) : k < i ? THEME.dim : alpha(THEME.dim, 0.25);
        g.beginPath();
        g.roundRect(x, F.head - L.u * 1.6, w, L.u * 1.1, L.u * 0.55);
        g.fill();
      }
      const last = i === n - 1;
      const out = last ? clamp((c.len - since) / 0.3) : clamp((c.len - since) / 0.18);
      const size = L.u * (F.stacked ? 6 : 5);
      g.globalAlpha = out;
      label(g, bt.catch ? "The catch" : `${i + 1} of ${n}`, F.cap.x, F.cap.y, L.u * 2.6, bt.catch ? THEME.bad : THEME.gold);
      g.globalAlpha = 1;
      text(g, bt.say, { x: F.cap.x, y: F.cap.y + size * 1.35, maxW: F.cap.w, size, font: `600 ${DISPLAY}`, alpha: out, arrive: (w) => spring(since - 0.1 - w * 0.035, SPRINGS.standard) });
    },
  };

  const outro: Scene = {
    name: "takeaway",
    from: T_HOOK + c.main,
    to: durationOf(spec),
    draw(g, local, L) {
      world(g, local + T_HOOK + c.main, L);
      const t = local;
      const F = framing(L);
      const tall = L.h / L.w > 1.5;
      const size = L.u * (!F.stacked ? 8 : tall ? 9.5 : 8.4);
      const maxW = F.stacked ? L.w - 2 * F.m : L.w * 0.62;
      const top = L.h * (!F.stacked ? 0.3 : tall ? 0.27 : 0.15);
      label(g, "Takeaway", F.m, top, L.u * 2.8, THEME.gold);
      const h = text(g, spec.takeaway, { x: F.m, y: top + size * 1.3, maxW, size, font: `700 ${DISPLAY}`, arrive: (i) => spring(t - 0.3 - i * 0.07, SPRINGS.heavy) });
      const s = spring(t - 1.4, SPRINGS.standard);
      const ls = L.u * (!F.stacked ? 17 : tall ? 21 : 16);
      const lx = F.stacked ? F.m : L.w * 0.68;
      const floor = L.h - F.m - ls - L.u * 15;
      const ly = F.stacked ? Math.min(Math.max(top + size * 1.3 + h + L.u * 5, L.h * (tall ? 0.58 : 0.5)), floor) : L.h * 0.36;
      g.globalAlpha = clamp(s * 2);
      g.save();
      g.beginPath();
      g.roundRect(lx, ly + (1 - s) * L.u * 4, ls, ls, ls * 0.2);
      g.clip();
      g.drawImage(logo, lx, ly + (1 - s) * L.u * 4, ls, ls);
      g.restore();
      g.font = `700 ${L.u * (F.stacked ? 6.6 : 5.4)}px ${DISPLAY}`;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = THEME.ink;
      g.fillText(BRAND.site, lx, ly + ls + L.u * 8.5);
      if (spec.tagline) {
        g.font = `400 ${L.u * (F.stacked ? 3.3 : 2.9)}px ${UI}`;
        g.fillStyle = THEME.dim;
        g.fillText(spec.tagline, lx, ly + ls + L.u * 14.1);
      }
      g.globalAlpha = 1;
    },
  };

  const cues: Cue[] = [{ t: 0, type: "thump" }, { t: T_HOOK - 0.2, type: "whoosh" }];
  c.starts.forEach((s, i) => cues.push({ t: s, type: i > 0 && spec.beats[i]!.catch ? "thump" : "click", gain: 0.8 }));
  for (const p of c.pops) cues.push({ t: p, type: "pop", gain: 0.6 });
  for (const s of c.sends) cues.push({ t: s.t, type: "chirp", gain: 0.45 });
  for (const folds of c.folds.values()) for (const f of folds) cues.push({ t: f.t, type: "whoosh", gain: 0.8 });
  cues.push({ t: T_HOOK + c.main - 0.5, type: "rise", gain: 0.6 });

  return {
    name: conceptId(spec),
    deliver: spec.status === "made" ? { dir: `videos/${spec.series}/${conceptId(spec)}`, stem: (format) => `${conceptId(spec)}_${format}_${spec.checked}` } : undefined,
    dur: durationOf(spec),
    fps: 30,
    bg: STAGE.sky[2],
    formats: ["4x5", "9x16", "16x9"],
    look: "glow",
    scenes: [hook, main, outro],
    score: { bpm: BPM, root: 174.61, bars: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -4, 0, 5], [-2, 2, 5, 10]] },
    cues: cues.sort((a, b) => a.t - b.t),
  };
}
