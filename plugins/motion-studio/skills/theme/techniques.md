# Techniques playbook

What makes a short clip worth watching to the end, and how each idea maps onto the studio.
Sources: the 0xMovez motion design course (`docs/SOURCE.md` in motion-studio), the cinematic
and concept worked examples, and the house rules every studio's `CLAUDE.md` carries. These
are working rules, not research findings. Where one is a judgement, it says so.

## 1. Start from the scenario, not the palette

A theme is a set of answers. Ask these first, because every later choice follows from them.

| Question | Why it matters |
|---|---|
| Who watches, and where? (LinkedIn feed, Shorts, a conference screen, a docs page) | Sets format, length and whether sound is on |
| What should they remember? One sentence. | Everything that does not serve it gets cut |
| What should they feel at the end? (relief, curiosity, confidence, urgency) | Picks palette temperature, tempo and the shape of the ending |
| Explain, launch, teach, or tease? | Picks the template and the story shape (section 3) |
| Is it one clip or a series? | A series needs a look that stays fresh across ten clips, so restraint wins |

## 2. Hooks: the first two seconds

- Open on the problem or the surprising claim, never on a logo or a title card.
- Big kinetic type, five to nine words. The explainer and concept templates cap the hook at nine.
- Something moves in the first frame. A still opening reads as a thumbnail and gets scrolled past.
- Name the viewer's pain in their words ("Your Lambda is fast. Except the first time.").
- A question works when the answer arrives inside the clip. A question left open feels like bait.

## 3. Story shapes by scenario

| Scenario | Shape | Template |
|---|---|---|
| How a service or tool works | hook, three or four moves on a stage, the honest catch, takeaway | concept |
| One AWS fact or gotcha | pain, picture, how it works in three moves, catch, one line to take away | explainer |
| Product or launch | problem in huge type, product assembles, three features with a cursor doing real actions, one proof number, logo and call to action | film (`prompts/brand.md`) |
| Build scenario ("how you would build X") | the user's goal, then each service as it joins the build, then the limit you must design around | concept, 45 seconds |
| Mood piece or teaser | world, camera, light, one moving thing, no text until the end | film (`prompts/directors-brief.md`) |

- **The honest catch is the engagement engine for technical audiences.** A clip that names its
  own limit earns trust and comments. Light it in the theme's `bad` colour.
- **End where you started** for anything that loops (Shorts, Reels): the last frame sets up the first.

## 4. Pacing

- Something new happens every two to four seconds. No dead beats.
- Put state changes on beats and big moments on bar lines. Beat times are arithmetic: `beat(bpm, n)`.
- A short shot after two long ones feels like speed. Vary shot length on purpose.
- Thirty seconds holds three or four ideas. Forty-five holds four to six, as a scenario, not a list.
- The end card holds long enough to read the takeaway twice, about five seconds.

## 5. Camera and depth

Name these in a brief, or the model fills them with a flat default.

| Lever | What it is |
|---|---|
| World | a place drawn once, in its own units, reused by every shot |
| Depth | layers at different distances; near ones move faster |
| Camera | `x`, `y`, `zoom` over time: push in, pull out, track, tilt, locked off |
| Cut | a new camera on the same world, placed on a bar line |
| Light | colours as functions of time, such as night blending to dawn |
| Look | a grade applied after painting: bloom, vignette, grain, bars |

- The camera can be the animation. "Nothing else moves" is a real instruction.
- The concept stage creeps in for the whole of every beat and dims what a beat is not about.
  That focus is most of why it reads as cinema.

## 6. Colour

- **One accent.** It marks the words and the thing that matters right now. Two accents fight.
- **Contrast is not taste.** Text on the background must reach 4.5:1, and big type 3:1.
  `just theme-check <name>` measures it. A theme that fails does not ship.
- **Semantic colours stay semantic.** `bad` is only for the catch and refusals, `good` only for success.
- **Temperature sets mood.** Cool, dark grounds read calm and technical. Warm, light grounds read
  friendly and editorial. A high-saturation accent on a dark ground reads energetic.
- **Keep a dark anchor.** In a light scene, keep one deep value so bright things have something to be bright against.
- The stage colours (`stage.sky`, `beam`, `shade`) make the room. A theme that changes only
  `colors` still renders the old room. Change both.

## 7. Type

- One display face for hooks and takeaways, and one UI face for labels, captions and tables.
- Everything must read at 360px wide. Check `phone.png`, not the full frame.
- Highlight words with `*asterisks*` in captions. Light up the noun or the number that carries
  the line, never a whole sentence.
- No bouncy easing on type. Type arrives on a heavy spring and settles.
- Ship the font files with the theme (under `assets/brand/`). A system font renders differently on another machine.

## 8. Motion

- Closed-form springs (`src/lib/motion.ts`): `heavy` for big type and lockups, the playful
  spring only where overshoot is the joke.
- Animate `transform`-like values (position, scale). Avoid everything fading in: it is the most common AI default.
- Use `smooth()` only for wipes that must fully finish, such as the frame that closes a loop.

## 9. Sound

- Synthesised score at a declared BPM, so picture and sound share one clock.
- A cue under every visible hit: clicks for UI, pops for arrivals, a thump on a bar-line moment.
- Tempo follows the feeling: about 100 BPM for an explainer, 120 for a launch, a slow pad with no drums for a mood piece.
- Most feeds autoplay muted. Every line that matters must be on screen as text.

## 10. Banned looks

Centred title on a gradient, everything fading in, corner labels and frame borders, glow on
UI chrome, generic particle bursts, bouncy easing on type, product screens drawn from imagination.

## 11. References

Naming a look beats describing one. Give a frame, a video or a folder of past work, and say
what to take (palette, type, pacing) and what not to take (subject, logos, characters).
Extract a frame every half second with ffmpeg, write down the grammar, then build from that.

## 12. Iteration is the method

"The prompt is 10% of the video. The other 90% is the harness." Draft, look at the frames,
score them, fix the three worst problems, repeat. A theme is judged on the frames it
produces (`just theme-preview`), never on its hex codes.
