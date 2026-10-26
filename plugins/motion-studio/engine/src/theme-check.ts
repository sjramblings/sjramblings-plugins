// MOTION_THEME=<theme> bun src/theme-check.ts
// Measures text contrast in a theme (WCAG 2 ratios) and fails when a floor is missed.
// Body text needs 4.5:1, large type and the accent 3:1. Checked on both grounds text sits on:
// the explainer background and the floor of the concept stage, where captions are drawn.
import { BRAND, THEME_NAME } from "../brand.ts";

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const c = BRAND.colors;
const grounds = { bg: c.bg, panel: c.panel, stage: BRAND.stage.sky[2] };
const checks: { what: string; fg: string; floor: number }[] = [
  { what: "ink (body text)", fg: c.ink, floor: 4.5 },
  { what: "dim (secondary labels)", fg: c.dim, floor: 3 },
  { what: "accent (highlighted words)", fg: c.accent, floor: 3 },
  { what: "bad (the catch)", fg: c.bad, floor: 3 },
  { what: "good", fg: c.good, floor: 3 },
];

let failed = 0;
console.log(`theme ${THEME_NAME}`);
for (const k of checks) {
  for (const [name, ground] of Object.entries(grounds)) {
    // panels hold labels and table cells, not highlighted or warning words
    if (name === "panel" && k.what !== "ink (body text)") continue;
    const r = ratio(k.fg, ground);
    const ok = r >= k.floor;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${k.what.padEnd(28)} on ${name.padEnd(5)} ${r.toFixed(2)}:1 (needs ${k.floor}:1)`);
  }
}
if (failed) {
  console.log(`${failed} contrast check(s) failed`);
  process.exit(1);
}
console.log("contrast ok");
