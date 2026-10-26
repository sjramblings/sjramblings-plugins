// bun src/concepts.ts [list | check | ids [series] | fit [format]]
// The concept clips: what exists, and whether every spec is valid.
import { CONCEPTS } from "../concepts/index.ts";
import type { FormatName } from "./lib/film.ts";
import { conceptId, scales, validate } from "./kits/concept.ts";

const cmd = process.argv[2] ?? "list";
const only = process.argv[3];
const clips = CONCEPTS.filter((c) => !only || c.series === only);

if (cmd === "ids") {
  for (const c of clips) console.log(conceptId(c));
} else if (cmd === "fit") {
  // how large the props are drawn: whole stage, then each beat. Smallest first.
  const format = (process.argv[3] ?? "4x5") as FormatName;
  const rows = CONCEPTS.filter((c) => validate(c).length === 0).map((c) => ({ id: conceptId(c), ...scales(c, format) }));
  rows.sort((a, b) => a.all - b.all);
  for (const r of rows) console.log(`${r.id.padEnd(34)} stage ${r.all.toFixed(2)}   beats ${r.beats.map((b) => b.toFixed(2)).join(" ")}`);
} else {
  const seen = new Set<string>();
  let bad = 0;
  for (const c of clips) {
    const id = conceptId(c);
    const problems = validate(c);
    if (seen.has(id)) problems.push("duplicate id");
    seen.add(id);
    if (problems.length) bad++;
    if (cmd === "list" || problems.length) console.log(`${problems.length ? "BAD " : "ok  "} ${id.padEnd(34)} ${c.status.padEnd(6)} ${c.checked}  ${c.hook.replaceAll("*", "")}`);
    for (const p of problems) console.log(`       ${p}`);
  }
  console.log(`${clips.length} concept clips, ${bad} with problems`);
  if (bad) process.exit(1);
}
