# sjramblings-plugins

A Claude Code plugin marketplace. It lists one plugin today: **motion-studio**.

## Install

```text
/plugin marketplace add sjramblings/sjramblings-plugins
/plugin install motion-studio@sjramblings
```

Turn on auto-update under **Marketplaces** in `/plugin`, or run
`/plugin marketplace update sjramblings` to pull a release.

Renders need `bun`, `ffmpeg`, `ffprobe` and `just` on PATH.

## motion-studio

Short explainer clips rendered from code: TypeScript paints each frame as a pure function of
time, and ffmpeg encodes 9x16, 4x5, 1x1 and 16x9 with synthesised sound.

| Skill | What it does |
|---|---|
| `/motion-studio:clip` | Sets up or upgrades a studio, checks facts against live docs into an evidence file, writes the spec, drafts, reviews real frames and renders |
| `/motion-studio:theme` | A guided session on what makes a clip engaging for your scenario (hooks, story, pacing, camera, colour, type, motion, sound), ending in a named theme and style guide proved on real frames |

### How it fits together

- **The engine** is the code that turns a spec into an MP4: renderer, springs, audio, the concept
  and explainer templates. It ships inside the plugin, in `plugins/motion-studio/engine/`.
- **A studio** is a folder where you make clips. `init` copies the engine into it and records
  the version in `.motion-studio.json`. Your clips render the same until you choose to upgrade.
- **A theme** is `themes/<name>.ts` (colours, fonts, stage, logo, site, tagline) plus
  `themes/<name>.md` (the style guide). `brand.ts` picks the active one; `MOTION_THEME=<name>`
  overrides it for one run.
- **Upgrade** replaces engine files only. Themes, `brand.ts`, clips, concepts, evidence, films
  and renders are never touched.

```bash
bun plugins/motion-studio/scripts/studio.ts init ~/clips      # the skills run this for you
bun plugins/motion-studio/scripts/studio.ts status ~/clips
bun plugins/motion-studio/scripts/studio.ts upgrade ~/clips
```

## Developing and releasing

```bash
just validate          # claude plugin validate on the marketplace and the plugin
just e2e               # fresh studio in /tmp: gate, theme check, preview, draft render (about 7 minutes)
just guard             # no client terms anywhere in the tree
just release 0.2.0     # bump plugin.json, validate, commit, tag motion-studio--v0.2.0
git push && git push --tags
```

Users get a new copy only when `version` in `plugin.json` changes, so every release bumps it.
Change the engine here, never in a studio: studio engine files are overwritten on upgrade.
`ISA.md` is the system of record.
