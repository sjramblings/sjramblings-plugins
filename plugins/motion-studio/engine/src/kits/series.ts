// A series is every clip about one service, numbered. Numbers are permanent: a
// new clip takes the next free number, and a retired clip leaves a gap, so a
// clip's name never changes once it has been posted.
import type { Film } from "../lib/film.ts";
import { clipId, explainer, type ExplainerSpec } from "./explainer.ts";

// A clip as written in a series file: the series supplies its own code and service name.
export type ClipSpec = Omit<ExplainerSpec, "series" | "service">;

// A clip that has a place in the series but no script yet.
export interface Planned {
  number: number;
  slug: string;
  level: 100 | 200 | 300;
  hook: string;
  covers: string;
}

export interface Series {
  code: string;
  service: string;
  clips: readonly ClipSpec[];
  planned?: readonly Planned[];
}

export const expand = (s: Series): ExplainerSpec[] => s.clips.map((c) => ({ ...c, series: s.code, service: s.service }));

export async function allClips(): Promise<ExplainerSpec[]> {
  const { SERIES } = await import("../../clips/index.ts");
  return SERIES.flatMap(expand);
}

export async function filmFor(id: string): Promise<Film | undefined> {
  const spec = (await allClips()).find((c) => clipId(c) === id);
  return spec ? explainer(spec) : undefined;
}

// Whole days since the facts were last checked.
export const ageInDays = (spec: Pick<ExplainerSpec, "checked">, today: Date): number =>
  Math.floor((today.getTime() - new Date(`${spec.checked}T00:00:00Z`).getTime()) / 86_400_000);
