---
project: sjramblings-plugins
phase: learn
progress: 18/18
principal_stated_goal: "Package up the video generatation as a repeatable skill that I can version and deploy via github cluade plugins/marketplace."
iteration: 2
resumed_at: 2026-10-26T11:03:04.293Z
resumed_from_phase: complete
---

# sjramblings-plugins

## Goal

Package up the video generatation as a repeatable skill that I can version and deploy via github cluade plugins/marketplace.

## Vision

Steve types `/plugin marketplace add sjramblings/sjramblings-plugins`, installs `motion-studio`, opens any folder and says "make me a 45 second clip about X". The skill sets up a studio workspace from the engine that shipped with that plugin version, then runs the motion-studio method: docs-checked facts with an evidence file, a spec, a draft, a review of real frames, and a full render. A new plugin version is a version bump and a tag. An existing workspace upgrades in one command and keeps its own clips.

## Out of Scope

- Client material of any kind (client films, the `process` kit, anything marked Private).
- Publishing (LinkedIn packs, YouTube upload, the S3 and CloudFront media stack). These stay in the motion-studio repo.
- Migrating the motion-studio repo onto the plugin engine. That is a later, separate step.
- Submitting to Anthropic's public directory.

## Claims

- [x] ISC-1: `claude plugin validate` passes on the marketplace root and on the plugin. Probe: command output. Evidence: `just validate`, also `--strict`.
- [x] ISC-2: The marketplace lists `motion-studio` from a relative path, and the entry name matches the manifest name. Probe: read both JSON files. Evidence: marketplace.json + plugin.json both `motion-studio`.
- [x] ISC-3: The plugin declares an explicit semver `version` in `plugin.json` only, not also in the marketplace entry. Probe: grep. Evidence: version 0.1.0 in plugin.json only.
- [x] ISC-4: `studio.ts init <dir>` makes a working workspace from the bundled engine: files copied, `.motion-studio.json` records the engine version, dependencies installed. Probe: run it on a temp dir. Evidence: `just e2e` 2026-10-15.
- [x] ISC-5: In a fresh workspace, `just check` passes (guard, typecheck, tests, determinism). Probe: command output. Evidence: `just e2e`, 11 tests, determinism 32 frames.
- [x] ISC-6: In a fresh workspace, the example concept clip renders as a draft to an MP4 of the declared length. Probe: ffprobe duration. Evidence: ffprobe 45.000000.
- [x] ISC-7: `studio.ts upgrade <dir>` replaces engine-owned files and leaves user-owned files (films, concepts, clips, docs, out) byte-identical. Probe: hash user files before and after. Evidence: user-file shasum identical across upgrade; tampered src/render.ts restored.
- [x] ISC-8: `init` refuses a non-empty directory that is not already a studio, and `upgrade` refuses a directory that is not a studio. Probe: run both. Evidence: three refusals, exit 1.
- [x] ISC-9: The skill's `SKILL.md` states done as outcomes (workspace, evidence file, spec, review loop, render) and references scripts through `${CLAUDE_PLUGIN_ROOT}`. Probe: read. Evidence: skills/clip/SKILL.md.
- [x] ISC-10: The plugin installs from the local marketplace and its skill is listed. Probe: `claude plugin` CLI output. Evidence: `claude plugin details` Skills (2) clip, theme.
- [x] ISC-11: The repo has a release path: `just release <version>` bumps `plugin.json`, validates and tags `motion-studio--v<version>`. Probe: dry run. Evidence: throwaway clone tagged motion-studio--v0.1.1.
- [x] ISC-12: The repo is on GitHub as a private repo and `/plugin marketplace add` from GitHub works. Probe: `gh repo view`, then install. (after: ISC-1, ISC-10) Evidence: gh repo view PRIVATE; marketplace source GitHub, plugin installed with 2 skills.

- [x] ISC-13: Styling is separate from the engine. Every colour, font, logo, site and tagline the templates draw comes from `themes/<name>.ts` through `brand.ts`, and the default theme renders byte-identical frames to the pre-refactor engine. Probe: frame hashes of a concept and an explainer clip in all three formats, before and after. Evidence: 6/6 hashes identical after brand and stage refactor.
- [x] ISC-14: A second theme restyles both templates completely, including the concept stage. Probe: `just theme-preview` PNG of a contrasting theme, viewed. Evidence: paper preview viewed 2026-10-15.
- [x] ISC-15: `just theme-check` fails a theme whose text misses the WCAG floors and passes the default. Probe: run both. Evidence: sjramblings pass, paper 4 fails, exit 1.
- [x] ISC-16: The plugin ships a guided `theme` skill that teaches the techniques (scenario, hooks, story shape, pacing, camera, colour, type, motion, sound) from a playbook drawn from the motion-studio method, and writes a theme plus a style guide. Probe: read the skill and playbook; skill listed after install. Evidence: skills/theme, listed after install.
- [x] ISC-17: Upgrade never replaces `brand.ts` or `themes/`. Probe: covered by the ISC-7 hash check with a custom theme present. Evidence: paper theme + brand.ts edit survived upgrade.

- [x] ISC-18: Every studio ships the standard series themes `aws` and `cc` on the sjramblings look, each with a style guide the `clip` skill reads. Evidence: tsc + theme-check aws/cc pass.

## Anti-claims

- [x] A-1: No client term anywhere in the repo tree or history. Probe: `just guard`, which reads the terms from an untracked `.guard-terms` file so the repo never names them. Evidence: clean on the single public commit, 2026-10-26.
- [x] A-2: No Python. Engine and scripts are TypeScript on bun.
- [x] A-3: Nothing is pushed or made public without Steve's go-ahead. Pushed on Steve's go, 2026-10-15; made public on Steve's go, 2026-10-26.

## Decisions

- 2026-10-15: One repo is both the marketplace and the home of the plugin (relative-path source), so a release is one commit and one tag.
- 2026-10-15: The workspace vendors the engine instead of running it from the plugin cache. Films import the engine by relative path, and `${CLAUDE_PLUGIN_ROOT}` moves on every update, so a vendored copy is the only shape where a clip renders the same until you choose to upgrade.
- 2026-10-15: The plugin engine was imported from motion-studio `ae5a2f2`. From here the plugin repo is the engine's home.
- 2026-10-26: Made public. An audit found client names in the guard recipe and this file, so the repo was republished as one clean commit in a new public repo under the same name; the old private repo was renamed and kept, not deleted, because GitHub keeps force-pushed commits reachable by id. The 24 AWS icons stay, with a NOTICE.
- 2026-10-15: Steve asked for different stylings over a correct engine. Themes became workspace-owned files behind a typed `Brand`, and the stage colours joined it after a light test theme showed the concept room was still hardcoded.
- D-auto-2026-10-26T11:03:04.293Z: Auto-resumed from complete to learn at 2026-10-26T11:03:04.293Z — iteration 2

## Not yet specified

- Per-clip theme choice inside a spec (today a theme is chosen per workspace or per run).
