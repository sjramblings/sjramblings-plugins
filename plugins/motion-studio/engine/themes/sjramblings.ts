// sjramblings: navy and gold, Signika and Heebo. The default theme.
import type { Brand } from "../src/lib/brand.ts";

const theme: Brand = {
  site: "sjramblings.io",
  tagline: "Practical AWS, from the trenches.",
  logo: "brand/logo.png",
  fonts: {
    display: { family: "Signika", file: "fonts/Signika.ttf" },
    ui: { family: "Heebo", file: "fonts/Heebo.ttf" },
  },
  colors: {
    bg: "#1A2235",
    panel: "#232D3F",
    line: "#44526B",
    ink: "#F3EEE2",
    dim: "#9AA6B8",
    accent: "#F5A623",
    bad: "#FF6B5E",
    good: "#5FD49A",
    blue: "#6FB1FF",
    violet: "#B49BFF",
    muted: "#7C8AA5",
    soft: "#FFD27A",
    deep: "#0E1422",
  },
  stage: {
    sky: ["#27324C", "#161D30", "#0B0F1B"],
    beam: "#7896DC",
    rim: "#A0B0CC",
    shade: "#0D111E",
    core: "#141A2A",
    glass: "#FFFFFF",
  },
};

export default theme;
