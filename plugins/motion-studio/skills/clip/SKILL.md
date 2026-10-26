---
name: clip
description: Make short explainer video clips rendered from code (concept clips, AWS service explainers, hand-written films) in 9x16, 4x5, 1x1 and 16x9 with synthesised sound. Sets up or upgrades a motion-studio workspace, checks facts against live docs with an evidence file, drafts, reviews real frames and renders. Use when asked for a clip, reel, short, explainer video, video series, or motion graphics about a product or concept, or to set up or upgrade a studio.
---

# Motion studio clips

A clip is a program: TypeScript that paints any frame as a pure function of time, rendered by
`@napi-rs/canvas` inside bun and encoded by ffmpeg. This skill owns the whole path from idea to
reviewed MP4.

## The workspace

Clips are made in a studio workspace: a folder holding a copy of the engine that shipped with
this plugin, plus the owner's clips. A folder is a studio when it has `.motion-studio.json`.

- Find the studio first: the current directory, or one the user names. If there is none, ask
  where to create it (suggest an empty folder such as `./studio`), then run
  `bun "${CLAUDE_PLUGIN_ROOT}/scripts/studio.ts" init <dir>`.
- If `bun "${CLAUDE_PLUGIN_ROOT}/scripts/studio.ts" status <dir>` reports an older engine, tell
  the user and offer `upgrade <dir>`. Upgrade replaces engine files only; clips, concepts,
  evidence and films are never touched. Never upgrade without asking: it changes how existing
  clips render.
- Once inside a studio, its `CLAUDE.md` is the rulebook: render contract, banned looks, review
  loop and gotchas. Read it before writing anything.
- The active theme is `DEFAULT` in `brand.ts`, or `MOTION_THEME` for one run. If
  `themes/<theme>.md` exists, read it too: it is the style guide (hook style, story shape, pacing,
  voice) that clips in this theme follow. To make a new theme, use the `theme` skill.
- Standard themes ship with every studio: `aws` for AWS explainers and build scenarios, `cc` for
  Claude Code concept clips, both on the `sjramblings` look. Pick the one that matches the
  series, read its guide, and render with `MOTION_THEME=<theme>`.

Needs bun, ffmpeg, ffprobe and just on PATH. `init` warns when one is missing.

## Pick the kind of clip

| Kind | When | Where it lives | Drawn by |
|---|---|---|---|
| Concept | How a tool or service works, as props on a stage and beats acting on them | `concepts/<series>/s<n>.ts` | `src/kits/concept.ts` |
| Explainer | One AWS service fact, problem first, with an icon diagram or table | `clips/<series>.ts` | `src/kits/explainer.ts` |
| Film | Anything a template cannot express | `films/<name>/film.ts` | hand-written scenes |

Prefer a template. `concepts/example/s1.ts` and `clips/lambda.ts` are worked examples to copy
the shape from.

## Done means

- **Brainstormed before committed.** For a new series, the user agreed on the list of clip ideas
  and their order before any spec was written.
- **Every factual line has a source fetched this session.** `docs/evidence/<clip-id>.md` pairs
  each on-screen line with a quoted sentence and its URL. Lines no source supports are cut or
  rewritten, never kept on memory. `checked` is the date of that reading.
- **The spec validates.** `just concepts` (or `just clips`) reports no problems. A line that
  breaks a word limit is rewritten, never the limit raised.
- **The frames were looked at.** `just draft <id>` then `just sheet <id>`, and you viewed
  `contact.png`, `phone.png` and the beat frames yourself. Labels read at phone size
  (`just fit` above about 0.6), nothing overlaps, every beat lands. Fix and repeat until it holds,
  and check a second format before calling it done.
- **The gate is green.** `just check` passes.
- **It rendered.** `just render <id>` wrote every declared format, at the declared length.
- **The reply says what to review.** Files to watch, what you would check while watching, and
  what is for the user to decide (hook, catch, pacing). A clip stays `status: "draft"` until the
  user approves it.

## Hard rules

- Never draw a product screen from imagination. Real UI only, as screenshots saved under
  `films/<name>/assets/`.
- Nothing that breaks `just guard`: no `Math.random`, `Date.now`, timers or animation frames in
  the render path.
- Never publish, upload or post a clip. Rendering is the end of this skill's job.
- A clip that builds something is framed as "how you would build this", never as something
  already built, unless it has been.
