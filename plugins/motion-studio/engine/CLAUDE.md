# Motion studio rules

Clips here are programs. A film is TypeScript that paints any frame on demand; the
renderer walks time and ffmpeg encodes. The prompt is a tenth of a good clip. The rest is
this harness: a reference, a beat grid, and looking at your own frames before you call
anything done.

`ISA.md` is the system of record. `docs/SOURCE.md` is the course this method comes from.

## Commands

- `just new <name>`: copy the demo to `films/<name>/`.
- `just draft <film>`: half size, no motion blur. Use it for pacing.
- `just sheet <film> [--format 16x9] [--at 4.1]`: contact sheet, strip, phone sheet, loop check, poster.
- `just render <film> [--format 9x16]`: full quality, every format the film declares.
- `just check`: guard, typecheck, tests, determinism. Run before every commit.

Use bun. Never npm, never Python.

## Render contract

- A film default-exports a `Film` from `films/<name>/film.ts`. Each scene has
  `draw(g, t, L)`, where `t` is seconds since the scene began and `L` is the layout.
- Every frame is a pure function of time. No state carried between frames.
- Never call `Math.random`, `Date.now`, `performance.now`, `setTimeout`, `setInterval` or
  `requestAnimationFrame`. Use `rng(seed)` from `src/lib/motion.ts`. `just guard` enforces this.
- Draw against `L` (`L.u` is 1% of the short edge), never fixed pixels. One timeline
  renders every format. Reframe type and layout per format; do not crop a wide render to
  vertical.
- Motion uses the closed-form springs in `src/lib/motion.ts`. A value with more than one
  target uses `track()`, one spring per change. Use `smooth()` only for wipes that must
  fully finish.
- There is no browser in the render path. Frames come from `@napi-rs/canvas`.

## Look

- Banned defaults: centred title on a gradient, everything fading in, corner labels and
  frame borders, glow on UI chrome, generic particle bursts, bouncy easing on type.
- One display face, one UI face. One accent colour unless the brief says otherwise.
- Something new happens on screen every 2 to 4 seconds. No dead beats.
- Real product UI only. Never draw a product screen from imagination; crop and animate a
  real screenshot saved under `films/<name>/assets/`.
- Type must read at 360px wide. Check `phone.png`.

## Sound

- Score and effects are synthesised in code (`src/lib/audio.ts`) at the film's declared BPM.
- Beat times are arithmetic: `beat(bpm, n)`. Put state changes on beats, big moments on
  bar lines, and a cue under every visible hit.
- The mix is normalised to -14 LUFS by the renderer. Do not fight it with gain.

## Loop before you show anything

1. `just draft <film>` then `just sheet <film>`. Open `contact.png`, `strip.png` and
   `phone.png` and look at them properly.
2. Score 1 to 10 on: hook in the first 2 seconds, readability at phone size, motion
   quality, variety, composition, brand accuracy, sound sync.
3. Write the three worst problems with timestamps in `films/<name>/review.md`. Fix them.
4. Repeat until every score is 8 or more. Three rounds minimum.
5. Check a second format's sheet before the full render. Wide and tall fail differently.
6. Only then `just render <film>`.

The full review prompt is `prompts/critique-pass.md`.

## Workflow gates

Brief, then shot list on the beat grid, then stills, then draft, then review loop, then
full render. Show the shot list before writing scene code. Do not skip gates.

## Gotchas

- ffmpeg prints `Truncating packet of size ... to 524288` while reading frames from the
  pipe. It is harmless: the frame count and duration come out right.
- Fonts resolve from the system. A film that must look the same on another machine
  registers its own font files from `assets/fonts/` with `GlobalFonts.registerFromPath`.
- A spring approaches its target and never lands exactly. For a seamless loop, finish
  with `smooth()` wipes so the last frame equals the first.
- If loudness comes out under target, the mix is too peaky. The soft saturation in
  `synth()` is what lets it reach -14.
- Each `just sheet` run overwrites the last. Copy `contact.png` aside before sheeting a
  second format if you want to compare them.

## AWS explainers

- AWS clips are specs in a series file per service (`clips/<series>.ts`), rendered by
  `src/kits/explainer.ts`. Do not write scene code for one. Add a spec, draft, look, render.
- A clip is named `<series>-<number>-<slug>`. Never renumber or rename a clip that exists.
  A new clip takes the next free number in its series.
- `checked` is the date its facts were last read against `sources`. Change it only after
  re-reading them. A clip stays `status: "draft"` until someone who did not write it has
  checked every factual line.
- More than six things to compare? Use a `table`, not a diagram.
- Render order is 4x5 (LinkedIn), 9x16, 16x9. Review 4x5 first: it is the tightest frame.
- Word limits are enforced by `validate()`. If a line does not fit, rewrite the line; do
  not raise the limit.
- Every factual line needs a page in `sources` that says it. Check against AWS
  documentation fetched in the session, never from memory. No prices in dollars.
- Voice: problem first, British spelling, an honest catch, no hype, no em dashes.
- The end card tagline is `TAGLINE` in `src/kits/explainer.ts`: "Practical AWS, from the trenches."
  Change it there and every clip picks it up on its next render.

## Concept clips

- A concept clip explains how a tool works as props on a stage and beats that act on them.
  Specs live in `concepts/<series>/s<season>.ts` and are registered in `concepts/index.ts`.
  `src/kits/concept.ts` draws them. Do not write scene code for one.
- `concepts/example/s1.ts` is a worked 45 second example, and
  `docs/evidence/ac-01-support-memory.md` is the evidence file behind it.
- Every on-screen line has a quoted source sentence in `docs/evidence/<clip-id>.md`,
  fetched this session. A clip with no evidence file stays `status: "draft"`.
- `just concepts` validates every spec against the word limits. `just fit` shows how large
  the props draw per beat: below about 0.6 the labels stop reading on a phone.
- Thirty seconds holds three or four beats; `seconds: 45` holds four to six.

## Themes

- Styling lives in `themes/<name>.ts` (values) and `themes/<name>.md` (style guide). `brand.ts`
  picks the active one; `MOTION_THEME=<name>` overrides it for one run.
- `just themes`, `just theme-preview <name>`, `just theme-check <name>`. A theme that fails
  `theme-check` does not ship.
- Never put a colour, font or site name in a kit. If a look needs a new value, it goes in the
  `Brand` type (`src/lib/brand.ts`) and every theme.

## Engine

This workspace was made by the motion-studio plugin. `.motion-studio.json` records the
engine version. Engine files (`src/`, `prompts/`, `tests/`, `assets/fonts/`, `CLAUDE.md`,
`justfile`, `package.json`, `tsconfig.json`) are replaced on upgrade, so change the engine
in the plugin repo, not here. Everything else is yours and is never touched.
