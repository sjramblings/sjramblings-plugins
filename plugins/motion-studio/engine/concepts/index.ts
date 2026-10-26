// Every concept clip, by series. A series is split into seasons, one file each.
// example/s1.ts is a worked 45 second clip: keep it, edit it or delete it.
import { concept, conceptId, type ConceptSpec } from "../src/kits/concept.ts";
import type { Film } from "../src/lib/film.ts";
import example from "./example/s1.ts";

export const CONCEPTS: readonly ConceptSpec[] = [...example];

export async function conceptFor(id: string): Promise<Film | undefined> {
  const spec = CONCEPTS.find((c) => conceptId(c) === id);
  return spec ? concept(spec) : undefined;
}
