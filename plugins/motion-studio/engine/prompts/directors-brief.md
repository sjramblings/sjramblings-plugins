# Director's brief

For anything longer than about 30 seconds. It does not describe a video; it hires a crew.
Save it as `films/<name>/brief.md`.

```
You are the director, animator, sound designer and render engineer for a [DURATION] film
made in code. Treat this as a multi-session production. Do not rush to a final render.

## The film in one line
[LOGLINE. What the viewer should feel at the end.]

## References and inputs
- films/<name>/refs/: [video, frames or image library]. Take the grammar, never the content.
- films/<name>/assets/: [real screenshots, logo].

## Look
[3 to 5 lines: palette, type, texture, camera language. Banned looks.]

## Beat sheet
0:00-0:02  hook: [the single most striking image]
0:02-0:10  [act 1]
...        a new visual payoff every 3 to 5 seconds
[END]      the last frame sets up the first frame (loop)

## Text on screen
[When type goes huge, when it sits like a caption. Leave room for it in every shot.]

## Workflow, with gates
1. Write style_guide.md and shotlist.md (every shot: seconds, layout, text, cues).
   Show me the shot list before any scene code.
2. Stills for every shot. Contact sheet. Critique.
3. Draft render. Fix pacing before polish.
4. Full animation, polish pass, sound pass, final render.
5. For more than about eight shots, write ANIMATION_GUIDE.md first so every chapter is
   coded in the same style, then split chapters across subagents.

## Critique loop (at least three rounds)
Use prompts/critique-pass.md. Log scores and the three biggest problems in review.md.

## Deliverables
Every format in out/<name>/, contact.png, phone.png, poster.png, loop_check.mp4.
Say what you would improve next.
```
