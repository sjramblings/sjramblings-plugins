// Explainer kit: a short spec in, a finished clip out. A new AWS clip is a
// spec file and nothing else. The shape follows how sjramblings posts argue:
// the pain first, then the picture, how it works in three moves, the honest
// catch, and one line to take away.
import { GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { beat, type Cue, type Film, type Layout, type Scene } from "../lib/film.ts";
import { clamp, lerp, smooth, spring, SPRINGS } from "../lib/motion.ts";
import { BRAND } from "../../brand.ts";

const ASSETS = new URL("../../assets/", import.meta.url).pathname;
GlobalFonts.registerFromPath(`${ASSETS}${BRAND.fonts.display.file}`, BRAND.fonts.display.family);
GlobalFonts.registerFromPath(`${ASSETS}${BRAND.fonts.ui.file}`, BRAND.fonts.ui.family);
export const DISPLAY = BRAND.fonts.display.family;
export const UI = BRAND.fonts.ui.family;

// The line under the site name on every end card. Set it in the theme.
export const TAGLINE = BRAND.tagline;

export const THEME = {
  ...BRAND.colors,
  gold: BRAND.colors.accent, // the kits call the accent gold; the brand decides what it is
} as const;

export interface NodeSpec {
  id: string;
  icon: string; // a file in assets/aws-icons ("lambda"), or "tile:GH" for a lettered tile
  label: string;
  at: readonly [col: number, row: number];
}

export interface Flow {
  from: string;
  to: string;
  blocked?: boolean; // the packet is stopped part-way and marked with a cross
}

export interface Step {
  say: string;
  flow?: readonly Flow[];
  focus?: readonly string[]; // everything else dims
  badge?: { on: string; text: string; tone?: "good" | "bad" | "info" };
}

// A comparison table, used instead of a node diagram when the point is to set
// several things side by side (storage classes, instance families, queue types).
export interface TableSpec {
  columns: readonly string[];
  rows: readonly { id: string; label: string; cells: readonly string[] }[];
}

export interface ExplainerSpec {
  series: string; // series code, e.g. "s3"
  number: number; // position in the series. Never reused or renumbered
  slug: string;
  checked: string; // YYYY-MM-DD the facts were last checked against the sources
  status: "made" | "draft"; // draft: not yet through an independent fact-check
  level: 100 | 200 | 300;
  service: string;
  hero: string; // icon shown on the hook card
  hook: string; // the pain. Wrap words in *stars* to colour them gold
  setup: string; // one line that names the picture
  nodes: readonly NodeSpec[];
  edges: readonly { from: string; to: string }[];
  table?: TableSpec; // when present, nodes and edges are left empty
  steps: readonly [Step, Step, Step];
  catchLine: string;
  catchFocus?: readonly string[];
  takeaway: string;
  sources: readonly string[]; // AWS documentation each factual line was checked against
}

// Caps that keep every line readable in the time it is on screen.
export const LIMITS = { hook: 9, setup: 12, say: 13, catchLine: 15, takeaway: 12, label: 18, badge: 18, nodes: 6, cols: 4, rows: 3, tableRows: 8, tableCols: 3, rowLabel: 22, cell: 10 } as const;

// The stable name of a clip: series, two-digit number, slug.
export const clipId = (spec: Pick<ExplainerSpec, "series" | "number" | "slug">): string =>
  `${spec.series}-${String(spec.number).padStart(2, "0")}-${spec.slug}`;

const seriesTag = (spec: ExplainerSpec): string => `${spec.service} · ${String(spec.number).padStart(2, "0")}`;

const words = (s: string): number => s.replaceAll("*", "").trim().split(/\s+/).length;

export function validate(spec: ExplainerSpec): string[] {
  const bad: string[] = [];
  const ids = new Set([...spec.nodes.map((n) => n.id), ...(spec.table?.rows.map((row) => row.id) ?? [])]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.checked)) bad.push(`checked must be YYYY-MM-DD, got "${spec.checked}"`);
  if (!Number.isInteger(spec.number) || spec.number < 1) bad.push("number must be a positive integer");
  if (spec.table) {
    const T = spec.table;
    if (spec.nodes.length || spec.edges.length) bad.push("a table clip has no nodes or edges");
    if (T.rows.length > LIMITS.tableRows) bad.push(`${T.rows.length} table rows, limit ${LIMITS.tableRows}`);
    if (T.columns.length < 1 || T.columns.length > LIMITS.tableCols) bad.push(`table needs 1 to ${LIMITS.tableCols} columns`);
    for (const row of T.rows) {
      if (row.label.length > LIMITS.rowLabel) bad.push(`row label too long: "${row.label}"`);
      if (row.cells.length !== T.columns.length) bad.push(`row ${row.id} has ${row.cells.length} cells for ${T.columns.length} columns`);
      for (const cell of row.cells) if (cell.length > LIMITS.cell) bad.push(`cell too long: "${cell}"`);
    }
    if (spec.steps.some((st) => st.flow?.length)) bad.push("a table clip cannot use flow");
  } else if (spec.nodes.length === 0) bad.push("needs nodes or a table");
  const over = (name: string, text: string, max: number) => {
    if (words(text) > max) bad.push(`${name} is ${words(text)} words, limit ${max}: "${text}"`);
  };
  over("hook", spec.hook, LIMITS.hook);
  over("setup", spec.setup, LIMITS.setup);
  over("catchLine", spec.catchLine, LIMITS.catchLine);
  over("takeaway", spec.takeaway, LIMITS.takeaway);
  spec.steps.forEach((s, i) => over(`step ${i + 1}`, s.say, LIMITS.say));
  if (spec.nodes.length > LIMITS.nodes) bad.push(`${spec.nodes.length} nodes, limit ${LIMITS.nodes}`);
  if (ids.size !== spec.nodes.length + (spec.table?.rows.length ?? 0)) bad.push("duplicate node or row id");
  for (const n of spec.nodes) {
    if (n.label.length > LIMITS.label) bad.push(`label too long: "${n.label}"`);
    if (n.at[0] >= LIMITS.cols || n.at[1] >= LIMITS.rows) bad.push(`node ${n.id} is off the ${LIMITS.cols}x${LIMITS.rows} grid`);
  }
  const need = (id: string, where: string) => {
    if (!ids.has(id)) bad.push(`${where} names missing node "${id}"`);
  };
  spec.edges.forEach((e) => (need(e.from, "edge"), need(e.to, "edge")));
  spec.steps.forEach((s, i) => {
    s.flow?.forEach((f) => (need(f.from, `step ${i + 1} flow`), need(f.to, `step ${i + 1} flow`)));
    s.focus?.forEach((id) => need(id, `step ${i + 1} focus`));
    if (s.badge) {
      need(s.badge.on, `step ${i + 1} badge`);
      if (s.badge.text.length > LIMITS.badge) bad.push(`badge too long: "${s.badge.text}"`);
    }
  });
  spec.catchFocus?.forEach((id) => need(id, "catchFocus"));
  if (spec.sources.length === 0) bad.push("no sources recorded");
  return bad;
}

// ---- timeline: 100 BPM, every section starts on a beat ----
const BPM = 100;
const B = beat(BPM, 1);
const T_HOOK = 5 * B;
const T_BUILD = 5 * B;
const T_STEP = 8 * B;
const T_CATCH = 8 * B;
const T_OUT = 8 * B;
const MAIN = T_BUILD + 3 * T_STEP + T_CATCH;
export const DURATION = T_HOOK + MAIN + T_OUT;

// The moments a still should be taken to stand for each part of a clip: late enough in
// each section that everything in it has landed. Used for carousels.
export const STILLS: readonly { part: string; t: number }[] = [
  { part: "hook", t: T_HOOK - 0.15 },
  { part: "picture", t: T_HOOK + T_BUILD - 0.25 },
  { part: "step-1", t: T_HOOK + T_BUILD + T_STEP - 0.35 },
  { part: "step-2", t: T_HOOK + T_BUILD + 2 * T_STEP - 0.35 },
  { part: "step-3", t: T_HOOK + T_BUILD + 3 * T_STEP - 0.35 },
  { part: "catch", t: T_HOOK + MAIN - 0.3 },
  { part: "takeaway", t: DURATION - 0.1 },
];

// ---- text ----
interface Word {
  text: string;
  gold: boolean;
}

function parse(text: string): Word[] {
  let gold = false;
  return text
    .trim()
    .split(/\s+/)
    .map((raw) => {
      if (raw.startsWith("*")) gold = true;
      const w = { text: raw.replaceAll("*", ""), gold };
      if (raw.endsWith("*") || /\*[.,:;!?]$/.test(raw)) gold = false;
      return w;
    });
}

export interface TextOpts {
  x: number;
  y: number; // baseline of the first line
  maxW: number;
  size: number;
  font: string; // e.g. '700 Signika'
  color?: string;
  alpha?: number;
  // how far each word has arrived, 0 to 1; defaults to fully there
  arrive?: (index: number) => number;
}

function wrap(g: SKRSContext2D, ws: Word[], maxW: number): Word[][] {
  const space = g.measureText(" ").width;
  const out: Word[][] = [[]];
  let x = 0;
  for (const w of ws) {
    const width = g.measureText(w.text).width;
    if (x > 0 && x + width > maxW) {
      out.push([]);
      x = 0;
    }
    out[out.length - 1]!.push(w);
    x += width + space;
  }
  return out;
}

// Draws wrapped text and returns how tall it was.
export function text(g: SKRSContext2D, str: string, o: TextOpts): number {
  const [weight, family] = o.font.split(" ") as [string, string];
  g.font = `${weight} ${o.size}px ${family}`;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  const space = g.measureText(" ").width;
  const lineH = o.size * 1.16;
  const rows = wrap(g, parse(str), o.maxW);
  let i = 0;
  rows.forEach((row, r) => {
    let x = o.x;
    for (const w of row) {
      const a = o.arrive ? o.arrive(i) : 1;
      if (a > 0) {
        g.globalAlpha = (o.alpha ?? 1) * clamp(a * 2.5);
        g.fillStyle = w.gold ? THEME.gold : (o.color ?? THEME.ink);
        g.fillText(w.text, x, o.y + r * lineH + (1 - a) * o.size * 0.45);
      }
      x += g.measureText(w.text).width + space;
      i++;
    }
  });
  g.globalAlpha = 1;
  return rows.length * lineH;
}

function measure(g: SKRSContext2D, str: string, o: Pick<TextOpts, "maxW" | "size" | "font">): number {
  const [weight, family] = o.font.split(" ") as [string, string];
  g.font = `${weight} ${o.size}px ${family}`;
  return wrap(g, parse(str), o.maxW).length * o.size * 1.16;
}

export function label(g: SKRSContext2D, str: string, x: number, y: number, size: number, color: string, spacing = 0.14): void {
  g.font = `700 ${size}px ${UI}`;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = color;
  g.letterSpacing = `${size * spacing}px`;
  g.fillText(str.toUpperCase(), x, y);
  g.letterSpacing = "0px";
}

// ---- icons ----
const cache = new Map<string, Image>();
export async function load(path: string, px: number): Promise<Image> {
  const hit = cache.get(path);
  if (hit) return hit;
  const img = await loadImage(`${ASSETS}${path}`);
  // SVGs rasterise at the size set here, so ask for enough pixels to stay sharp
  img.width = px;
  img.height = px;
  cache.set(path, img);
  return img;
}

function tile(g: SKRSContext2D, icons: Map<string, Image>, icon: string, cx: number, cy: number, size: number): void {
  const r = size * 0.16;
  g.save();
  g.beginPath();
  g.roundRect(cx - size / 2, cy - size / 2, size, size, r);
  g.clip();
  const img = icons.get(icon);
  if (img) g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  else {
    g.fillStyle = THEME.panel;
    g.fillRect(cx - size / 2, cy - size / 2, size, size);
    const letters = icon.replace("tile:", "");
    g.font = `700 ${size * (letters.length > 2 ? 0.3 : 0.4)}px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = THEME.gold;
    g.fillText(letters, cx, cy + size * 0.02);
  }
  g.restore();
  if (!img) {
    g.beginPath();
    g.roundRect(cx - size / 2, cy - size / 2, size, size, r);
    g.lineWidth = Math.max(2, size * 0.022);
    g.strokeStyle = THEME.line;
    g.stroke();
  }
}

// ---- layout: one spec, reframed per format ----
interface Frame {
  m: number; // outer margin
  stacked: boolean; // diagram above caption (tall and square frames) or beside it (wide)
  box: { x: number; y: number; w: number; h: number };
  cap: { x: number; y: number; w: number };
  head: number; // baseline of the header line
}

function frame(L: Layout): Frame {
  const m = L.u * 7;
  const stacked = L.w / L.h < 1.3;
  if (stacked) {
    return {
      m,
      stacked,
      head: L.h * 0.105,
      box: { x: m, y: L.h * 0.17, w: L.w - 2 * m, h: L.h * 0.43 },
      // captions stop well above the bottom, where Shorts and Reels draw their own UI
      cap: { x: m, y: L.h * 0.665, w: L.w - 2 * m },
    };
  }
  return {
    m,
    stacked,
    head: L.h * 0.13,
    box: { x: m, y: L.h * 0.2, w: L.w * 0.56 - m, h: L.h * 0.66 },
    cap: { x: L.w * 0.61, y: L.h * 0.36, w: L.w * 0.39 - m },
  };
}

interface Placed {
  x: number;
  y: number;
  size: number;
}

function place(spec: ExplainerSpec, F: Frame, L: Layout): Map<string, Placed> {
  const cols = Math.max(...spec.nodes.map((n) => n.at[0])) + 1;
  const rows = Math.max(...spec.nodes.map((n) => n.at[1])) + 1;
  const cw = F.box.w / cols;
  const ch = F.box.h / rows;
  const size = Math.min(cw * 0.58, ch * 0.54, L.u * 19);
  const out = new Map<string, Placed>();
  for (const n of spec.nodes) out.set(n.id, { x: F.box.x + (n.at[0] + 0.5) * cw, y: F.box.y + (n.at[1] + 0.5) * ch - size * 0.12, size });
  return out;
}

// ---- the three scenes ----
function hookScene(spec: ExplainerSpec, icons: Map<string, Image>): Scene {
  return {
    name: "hook",
    from: 0,
    to: T_HOOK,
    draw(g, t, L) {
      const F = frame(L);
      const size = L.u * (F.stacked ? 12.5 : 10.5);
      const maxW = F.stacked ? L.w - 2 * F.m : L.w * 0.7;
      const h = measure(g, spec.hook, { maxW, size, font: `700 ${DISPLAY}` });
      const iconSize = L.u * 17;
      const top = (L.h - (iconSize + L.u * 9 + h)) / 2 - (F.stacked ? L.h * 0.04 : 0);

      const pop = spring(t, SPRINGS.playful);
      tile(g, icons, spec.hero, F.m + iconSize / 2, top + iconSize / 2, iconSize * pop);
      g.globalAlpha = clamp((t - 0.15) * 6);
      label(g, seriesTag(spec), F.m + iconSize + L.u * 3.5, top + iconSize * 0.46, L.u * 3.1, THEME.gold);
      label(g, `Level ${spec.level}`, F.m + iconSize + L.u * 3.5, top + iconSize * 0.46 + L.u * 4.6, L.u * 2.5, THEME.dim);
      g.globalAlpha = 1;

      const y = top + iconSize + L.u * 9 + size * 0.8;
      text(g, spec.hook, { x: F.m, y, maxW, size, font: `700 ${DISPLAY}`, arrive: (i) => spring(t - 0.3 - i * 0.085, SPRINGS.heavy) });
      const bar = spring(t - 1.5, SPRINGS.snappy);
      g.fillStyle = THEME.gold;
      g.fillRect(F.m, y + h - size * 0.55, bar * L.u * 22, L.u * 1.3);
    },
  };
}

function mainScene(spec: ExplainerSpec, icons: Map<string, Image>): Scene {
  // phases: 0 build, 1-3 steps, 4 catch
  const starts = [0, T_BUILD, T_BUILD + T_STEP, T_BUILD + 2 * T_STEP, T_BUILD + 3 * T_STEP];
  const phaseAt = (t: number): number => starts.findLastIndex((s) => t >= s);
  const focusOf = (p: number): readonly string[] | undefined => (p === 4 ? spec.catchFocus : p >= 1 ? spec.steps[p - 1]!.focus : undefined);
  const lit = (p: number, id: string): number => {
    const f = focusOf(p);
    return !f || f.includes(id) ? 1 : 0.28;
  };

  function drawTable(g: SKRSContext2D, t: number, L: Layout, F: Frame, p: number, since: number, blend: number): void {
    const T = spec.table!;
    const rh = Math.min(F.box.h / (T.rows.length + 1), L.u * 9.5);
    const top = F.box.y + (F.box.h - rh * (T.rows.length + 1)) / 2;
    const size = Math.min(rh * 0.42, L.u * 3.6);
    // each column is as wide as its widest cell or heading, plus a gap
    g.font = `600 ${size}px ${UI}`;
    const widths = T.columns.map((name, c) => Math.max(g.measureText(name.toUpperCase()).width * 0.7, ...T.rows.map((row) => g.measureText(row.cells[c]!).width)) + L.u * 3.5);
    const colRight = (c: number): number => F.box.x + F.box.w - L.u * 2.5 - widths.slice(c + 1).reduce((a, b) => a + b, 0);
    g.textBaseline = "middle";

    // column headings
    g.font = `700 ${size * 0.62}px ${UI}`;
    g.textAlign = "right";
    g.fillStyle = THEME.gold;
    g.globalAlpha = clamp(t * 4);
    g.letterSpacing = `${size * 0.07}px`;
    T.columns.forEach((name, c) => g.fillText(name.toUpperCase(), colRight(c), top + rh * 0.55));
    g.letterSpacing = "0px";

    T.rows.forEach((row, i) => {
      const arrive = spring(t - 0.15 - i * 0.11, SPRINGS.snappy);
      if (arrive <= 0) return;
      const y = top + rh * (i + 1);
      const x = F.box.x + (1 - arrive) * L.u * 5;
      const alpha = lerp(lit(p - 1, row.id), lit(p, row.id), blend) * clamp(arrive * 2);
      const inFocus = focusOf(p)?.includes(row.id);
      g.globalAlpha = alpha;
      g.fillStyle = THEME.panel;
      g.beginPath();
      g.roundRect(x, y + rh * 0.07, F.box.w, rh * 0.86, rh * 0.2);
      g.fill();
      if (inFocus) {
        g.globalAlpha = blend;
        g.strokeStyle = p === 4 ? THEME.bad : THEME.gold;
        g.lineWidth = L.u * 0.45;
        g.stroke();
        g.globalAlpha = lerp(lit(p - 1, row.id), 1, blend);
      }
      g.font = `600 ${size}px ${UI}`;
      g.textAlign = "left";
      g.fillStyle = THEME.ink;
      g.fillText(row.label, x + L.u * 2.5, y + rh * 0.52);
      const labelEnd = x + L.u * 2.5 + g.measureText(row.label).width;
      g.textAlign = "right";
      row.cells.forEach((cell, c) => {
        // an empty cell reads as "no minimum": keep it quiet so the real numbers stand out
        g.fillStyle = cell === "none" || cell === "-" ? THEME.dim : THEME.ink;
        g.fillText(cell, colRight(c), y + rh * 0.52);
      });
      // badges sit just after the row's name
      spec.steps.forEach((st, k) => {
        if (st.badge?.on !== row.id) return;
        const pop = spring(t - starts[k + 1]! - 0.8, SPRINGS.playful);
        if (pop <= 0) return;
        const bs = size * 0.72;
        g.font = `700 ${bs}px ${UI}`;
        const w = g.measureText(st.badge.text).width + bs * 1.4;
        const h = bs * 1.9;
        g.save();
        g.translate(labelEnd + L.u * 2 + w / 2, y + rh * 0.5);
        g.scale(pop, pop);
        g.globalAlpha = 1;
        g.fillStyle = st.badge.tone === "bad" ? THEME.bad : st.badge.tone === "good" ? THEME.good : THEME.gold;
        g.beginPath();
        g.roundRect(-w / 2, -h / 2, w, h, h / 2);
        g.fill();
        g.fillStyle = THEME.bg;
        g.textAlign = "center";
        g.fillText(st.badge.text, 0, bs * 0.06);
        g.restore();
      });
      g.globalAlpha = 1;
    });
    g.textBaseline = "alphabetic";
    void since;
  }

  return {
    name: "main",
    from: T_HOOK,
    to: T_HOOK + MAIN,
    draw(g, t, L) {
      const F = frame(L);
      const at = spec.table ? new Map<string, Placed>() : place(spec, F, L);
      const p = phaseAt(t);
      const since = t - starts[p]!;
      const blend = clamp(since / 0.25);
      const step = p >= 1 && p <= 3 ? spec.steps[p - 1]! : undefined;

      // header: service name, and where we are in the three steps
      label(g, seriesTag(spec), F.m, F.head, L.u * 3, THEME.gold);
      for (let i = 0; i < 3; i++) {
        const done = p > i + 1 || p === 4;
        const now = p === i + 1;
        g.fillStyle = now ? THEME.gold : done ? THEME.dim : THEME.panel;
        g.beginPath();
        g.roundRect(L.w - F.m - (3 - i) * L.u * 5.4 + L.u * 1.2, F.head - L.u * 2.1, L.u * (now ? 4.2 : 4.2), L.u * 1.1, L.u * 0.55);
        g.fill();
      }

      if (spec.table) drawTable(g, t, L, F, p, since, blend);
      else {
      // edges draw themselves in during the build
      spec.edges.forEach((e, j) => {
        const a = at.get(e.from)!;
        const b = at.get(e.to)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        // leave room for the label under an icon when the edge leaves downward
        const startGap = a.size * 0.62 + (uy > 0.5 ? a.size * 0.5 : 0);
        const endGap = b.size * 0.66 + (uy < -0.5 ? b.size * 0.5 : 0);
        const drawn = smooth((t - 0.75 - j * 0.16) / 0.4);
        if (drawn <= 0) return;
        const active = step?.flow?.some((f) => (f.from === e.from && f.to === e.to) || (f.from === e.to && f.to === e.from));
        const x1 = a.x + ux * startGap;
        const y1 = a.y + uy * startGap;
        const x2 = lerp(x1, b.x - ux * endGap, drawn);
        const y2 = lerp(y1, b.y - uy * endGap, drawn);
        g.globalAlpha = Math.min(lerp(lit(p - 1, e.from), lit(p, e.from), blend), lerp(lit(p - 1, e.to), lit(p, e.to), blend));
        g.strokeStyle = g.fillStyle = active ? THEME.gold : THEME.line;
        g.lineWidth = L.u * 0.45;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        if (drawn > 0.95) {
          const s = L.u * 1.5;
          g.beginPath();
          g.moveTo(x2 + ux * s * 0.6, y2 + uy * s * 0.6);
          g.lineTo(x2 - ux * s - uy * s * 0.7, y2 - uy * s + ux * s * 0.7);
          g.lineTo(x2 - ux * s + uy * s * 0.7, y2 - uy * s - ux * s * 0.7);
          g.closePath();
          g.fill();
        }
        g.globalAlpha = 1;
      });

      // packets travel along this step's flows
      if (step?.flow && since > 0.45) {
        for (const f of step.flow) {
          const a = at.get(f.from)!;
          const b = at.get(f.to)!;
          const reach = f.blocked ? 0.56 : 1;
          const gapA = a.size * 0.62 / Math.hypot(b.x - a.x, b.y - a.y);
          const gapB = 1 - (b.size * 0.66) / Math.hypot(b.x - a.x, b.y - a.y);
          for (let k = 0; k < 3; k++) {
            const u = (((since - 0.45) * 0.7 - k / 3) % 1 + 1) % 1;
            const q = lerp(gapA, gapA + (gapB - gapA) * reach, u);
            g.globalAlpha = Math.sin(Math.PI * u) ** 0.5;
            g.fillStyle = f.blocked ? THEME.bad : THEME.gold;
            g.beginPath();
            g.arc(lerp(a.x, b.x, q), lerp(a.y, b.y, q), L.u * 1.05, 0, 2 * Math.PI);
            g.fill();
          }
          g.globalAlpha = 1;
          if (f.blocked) {
            const q = lerp(gapA, gapB, 0.6);
            const s = L.u * 2 * spring(since - 0.7, SPRINGS.playful);
            const cx = lerp(a.x, b.x, q);
            const cy = lerp(a.y, b.y, q);
            g.strokeStyle = THEME.bad;
            g.lineWidth = L.u * 0.8;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(cx - s, cy - s);
            g.lineTo(cx + s, cy + s);
            g.moveTo(cx + s, cy - s);
            g.lineTo(cx - s, cy + s);
            g.stroke();
          }
        }
      }

      // nodes pop in one after another, then dim or light with each step
      spec.nodes.forEach((n, i) => {
        const pos = at.get(n.id)!;
        const pop = spring(t - 0.12 - i * 0.2, SPRINGS.playful);
        if (pop <= 0) return;
        g.globalAlpha = lerp(lit(p - 1, n.id), lit(p, n.id), blend);
        tile(g, icons, n.icon, pos.x, pos.y, pos.size * pop);
        const inFocus = focusOf(p)?.includes(n.id);
        if (inFocus) {
          const grow = pos.size + L.u * (2.2 + 0.5 * Math.sin(since * 4));
          g.strokeStyle = p === 4 ? THEME.bad : THEME.gold;
          g.lineWidth = L.u * 0.5;
          g.globalAlpha = blend;
          g.beginPath();
          g.roundRect(pos.x - grow / 2, pos.y - grow / 2, grow, grow, grow * 0.2);
          g.stroke();
          g.globalAlpha = lerp(lit(p - 1, n.id), 1, blend);
        }
        // label, shrunk if it would spill into the next cell
        let size = L.u * 3.4;
        g.font = `600 ${size}px ${UI}`;
        const room = (F.box.w / (Math.max(...spec.nodes.map((x) => x.at[0])) + 1)) * 0.96;
        const wide = g.measureText(n.label).width;
        if (wide > room) size *= room / wide;
        g.font = `600 ${size}px ${UI}`;
        g.textAlign = "center";
        g.textBaseline = "alphabetic";
        g.fillStyle = THEME.ink;
        g.globalAlpha *= clamp((t - 0.3 - i * 0.2) * 5);
        g.fillText(n.label, pos.x, pos.y + pos.size / 2 + L.u * 4.8);
        g.globalAlpha = 1;
      });

      // badges arrive with their step and stay, so the picture accumulates
      spec.steps.forEach((s, k) => {
        if (!s.badge) return;
        const pos = at.get(s.badge.on)!;
        // a later badge on the same node replaces this one
        const next = spec.steps.findIndex((o, j) => j > k && o.badge?.on === s.badge!.on);
        const gone = next > 0 ? smooth((t - starts[next + 1]! - 0.6) / 0.2) : 0;
        const pop = spring(t - starts[k + 1]! - 0.8, SPRINGS.playful) * (1 - gone);
        if (pop <= 0) return;
        const size = L.u * 3.1;
        g.font = `700 ${size}px ${UI}`;
        const w = g.measureText(s.badge.text).width + size * 1.5;
        const h = size * 1.9;
        // keep the pill inside the diagram box
        // pinned to the top-right corner of the icon, clear of the label of the node above
        const cx = clamp(pos.x + pos.size * 0.42, F.box.x + w / 2, F.box.x + F.box.w - w / 2);
        const cy = pos.y - pos.size / 2 + h * 0.15;
        g.save();
        g.translate(cx, cy);
        g.scale(pop, pop);
        g.fillStyle = s.badge.tone === "bad" ? THEME.bad : s.badge.tone === "good" ? THEME.good : THEME.gold;
        g.beginPath();
        g.roundRect(-w / 2, -h / 2, w, h, h / 2);
        g.fill();
        g.fillStyle = THEME.bg;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(s.badge.text, 0, size * 0.06);
        g.restore();
      });

      }

      // caption: one line per phase, in before the diagram moves on, out before the next
      const line = p === 0 ? spec.setup : p === 4 ? spec.catchLine : step!.say;
      const tag = p === 0 ? "The picture" : p === 4 ? "The catch" : `${p} of 3`;
      const len = p === 0 ? T_BUILD : p === 4 ? T_CATCH : T_STEP;
      const out = p === 4 ? 1 : clamp((len - since) / 0.18);
      const capSize = L.u * (F.stacked ? 6 : 5);
      label(g, tag, F.cap.x, F.cap.y, L.u * 2.6, p === 4 ? THEME.bad : THEME.gold);
      text(g, line, {
        x: F.cap.x,
        y: F.cap.y + capSize * 1.35,
        maxW: F.cap.w,
        size: capSize,
        font: `600 ${DISPLAY}`,
        alpha: out,
        arrive: (i) => spring(since - 0.1 - i * 0.035, SPRINGS.standard),
      });
    },
  };
}

function outroScene(spec: ExplainerSpec, logo: Image): Scene {
  return {
    name: "takeaway",
    from: T_HOOK + MAIN,
    to: DURATION,
    draw(g, t, L) {
      const F = frame(L);
      const tall = L.h / L.w > 1.5; // 9x16 has room to spare; 4x5 and 1x1 do not
      const size = L.u * (!F.stacked ? 8 : tall ? 9.5 : 8.4);
      const maxW = F.stacked ? L.w - 2 * F.m : L.w * 0.62;
      const top = L.h * (!F.stacked ? 0.3 : tall ? 0.27 : 0.15);
      label(g, "Takeaway", F.m, top, L.u * 2.8, THEME.gold);
      const h = text(g, spec.takeaway, { x: F.m, y: top + size * 1.3, maxW, size, font: `700 ${DISPLAY}`, arrive: (i) => spring(t - 0.15 - i * 0.07, SPRINGS.heavy) });

      // lockup: logo, site, and the tagline
      const s = spring(t - 1.2, SPRINGS.standard);
      const ls = L.u * (!F.stacked ? 17 : tall ? 21 : 16);
      const lx = F.stacked ? F.m : L.w * 0.68;
      // below the takeaway, but never so low that the lines under the logo leave the frame
      const floor = L.h - F.m - ls - L.u * 15;
      const ly = F.stacked ? Math.min(Math.max(top + size * 1.3 + h + L.u * 5, L.h * (tall ? 0.58 : 0.5)), floor) : L.h * 0.36;
      g.globalAlpha = clamp(s * 2);
      g.save();
      g.beginPath();
      g.roundRect(lx, ly + (1 - s) * L.u * 4, ls, ls, ls * 0.2);
      g.clip();
      g.drawImage(logo, lx, ly + (1 - s) * L.u * 4, ls, ls);
      g.restore();
      const tx = lx;
      const ty = ly + ls + L.u * 8.5;
      g.font = `700 ${L.u * (F.stacked ? 6.6 : 5.4)}px ${DISPLAY}`;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = THEME.ink;
      g.fillText(BRAND.site, tx, ty);
      g.font = `400 ${L.u * (F.stacked ? 3.3 : 2.9)}px ${UI}`;
      g.fillStyle = THEME.dim;
      g.fillText(TAGLINE, tx, ty + L.u * 5.6);
      g.globalAlpha = 1;
    },
  };
}

function cuesFor(spec: ExplainerSpec): Cue[] {
  const cues: Cue[] = [{ t: 0, type: "thump" }, { t: T_HOOK - 0.18, type: "whoosh" }];
  spec.nodes.forEach((_, i) => cues.push({ t: T_HOOK + 0.12 + i * 0.2, type: "pop", gain: 0.7 }));
  for (let k = 0; k < 3; k++) cues.push({ t: T_HOOK + T_BUILD + k * T_STEP, type: "click" });
  cues.push({ t: T_HOOK + T_BUILD + 3 * T_STEP, type: "thump", gain: 0.8 });
  cues.push({ t: T_HOOK + MAIN - 0.5, type: "rise", gain: 0.6 });
  return cues;
}

export async function explainer(spec: ExplainerSpec): Promise<Film> {
  const problems = validate(spec);
  if (problems.length) throw new Error(`${clipId(spec)}: ${problems.join("; ")}`);
  const icons = new Map<string, Image>();
  for (const key of new Set([spec.hero, ...spec.nodes.map((n) => n.icon)])) {
    if (!key.startsWith("tile:")) icons.set(key, await load(`aws-icons/${key}.svg`, 320));
  }
  const logo = await load(BRAND.logo, 512);
  return {
    name: clipId(spec),
    // finished, fact-checked clips are filed by series under videos/, named so the file
    // says which clip it is, which cut, and how old its facts are
    deliver:
      spec.status === "made"
        ? { dir: `videos/${spec.series}/${clipId(spec)}`, stem: (format) => `${clipId(spec)}_${format}_${spec.checked}` }
        : undefined,
    dur: DURATION,
    fps: 30,
    bg: THEME.bg,
    formats: ["4x5", "9x16", "16x9"], // LinkedIn first, then Shorts and Reels, then YouTube and the blog
    scenes: [hookScene(spec, icons), mainScene(spec, icons), outroScene(spec, logo)],
    score: { bpm: BPM, root: 196, bars: [[0, 4, 7, 12], [-3, 0, 4, 9], [5, 9, 12, 16], [2, 7, 11, 14]] },
    cues: cuesFor(spec),
  };
}
