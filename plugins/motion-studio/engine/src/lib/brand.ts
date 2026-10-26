// The shape of a workspace's styling. The values live in brand.ts at the workspace root,
// which belongs to the workspace owner and is never replaced by an engine upgrade.
export interface Brand {
  site: string; // printed under the logo on every end card
  tagline: string; // the line under the site name on explainer end cards
  logo: string; // under assets/, e.g. "brand/logo.png"
  fonts: {
    display: { family: string; file: string }; // headlines and hooks; file under assets/
    ui: { family: string; file: string }; // labels, captions, tables
  };
  colors: {
    bg: string;
    panel: string;
    line: string;
    ink: string; // main text
    dim: string; // secondary text
    accent: string; // the one highlight colour
    bad: string;
    good: string;
    blue: string;
    violet: string;
    muted: string;
    soft: string;
    deep: string; // darkest fill, used inside props
  };
  // The concept stage: the lit room the props stand in.
  stage: {
    sky: [top: string, middle: string, floor: string]; // backdrop gradient; floor is also the frame colour
    beam: string; // the soft light that falls on whatever a beat is about
    rim: string; // prop outlines and the faint grid
    shade: string; // what dims the props a beat is not about, and the caption scrim
    core: string; // the dark edge of an agent orb
    glass: string; // sheen, sparks and the bright centre of an orb
  };
}

// "#RRGGBB" at an opacity, as a canvas colour string.
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
