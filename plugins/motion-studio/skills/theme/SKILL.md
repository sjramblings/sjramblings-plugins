---
name: theme
description: Guided creative direction for a motion-studio workspace. Walks the user through the scenario, audience, hooks, pacing, camera, colour, type, motion and sound that make a short video engaging, then writes a named theme (colours, fonts, stage, logo, tagline) plus a style guide, and proves it on real frames. Use when asked to create, ideate, design or change a video theme, look, style or brand, or to plan how a new series should look and feel.
---

# Theme creator

A theme is two files in the studio: `themes/<name>.ts` (the values every template reads) and
`themes/<name>.md` (the style guide: the decisions behind them and the techniques this series
uses). The engine never changes. Upgrades never touch `themes/` or `brand.ts`.

Find the studio first, as the `clip` skill does: a folder with `.motion-studio.json`. If there
is none, create one with `bun "${CLAUDE_PLUGIN_ROOT}/scripts/studio.ts" init <dir>`.

Read `${CLAUDE_PLUGIN_ROOT}/skills/theme/techniques.md` before the conversation starts. It is
the playbook this skill teaches from.

## The session is a guided conversation

The user is learning the craft as well as choosing a look. Take them through the playbook's
questions one topic at a time. For each topic, explain the technique in a sentence or two, show
how it applies to their scenario, propose a concrete answer, and let them accept or change it.
Ask one thing at a time. If they say "you choose", choose, and say why in one line.

Cover, in an order that suits the conversation:

1. The scenario: audience, platform, length, what to remember, what to feel, one clip or a series.
2. A reference, if they have one: a frame, a video or a past clip. Take its grammar, never its content.
3. Story shape and hook style for that scenario.
4. Pacing and tempo.
5. Camera and depth, if the template or film uses them.
6. Colour: one accent, semantic colours, temperature, the stage room.
7. Type: display and UI faces, and font files.
8. Motion and sound.
9. The end card: site, tagline, logo.

Offer two or three distinct directions before converging, so the user is choosing, not just approving.

## Done means

- `themes/<name>.ts` exists, satisfies the `Brand` type, and `bunx tsc --noEmit` passes.
- `just theme-check <name>` passes: text contrast meets the playbook's floors.
- `themes/<name>.md` records the scenario, the decisions and the reasons, and the techniques the
  series will use (hook style, story shape, pacing, tempo, camera, banned looks). The `clip`
  skill reads it before scripting a clip in this theme.
- `just theme-preview <name>` was run in 4x5 and one other format, and you looked at the
  PNGs yourself: every label reads, the accent marks only what matters, the catch reads as a
  warning, nothing vanishes into the background.
- The user saw the preview and chose. Only then, if they want it as the default, set
  `DEFAULT` in `brand.ts`. Otherwise it is used per run with `MOTION_THEME=<name>`.

## Hard rules

- Never edit engine files (`src/`, `justfile`, `CLAUDE.md`) to get a look. If a theme needs
  something the `Brand` type cannot express, say so and stop: that is an engine change, made
  in the plugin repo.
- Never use a real company's logo, name or trade dress in a theme unless the user owns it or
  it is their client's work they are cleared to use.
- Fonts must be files the user may use. Prefer open licences (OFL) and keep the licence file
  beside the font under `assets/brand/`.
