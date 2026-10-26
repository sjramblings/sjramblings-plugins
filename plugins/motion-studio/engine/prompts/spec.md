# State-list spec

Write the state list, not the vibe. One container that never cuts: a single element
changes size, radius and fill from state to state while a cursor drives each change, and
the last frame equals the first so it loops. `films/demo/film.ts` scene `morph` is a
small example.

```
## Inputs
Ask me for: the product and URL, 8 to 12 UI states that tell its story, the real data
shown in each state, brand colours, fonts and one accent, formats.

## Direction
Product-film UI motion. One container never cuts: every state is the same element
changing size, radius and fill while its content swaps. A cursor drives every change.
Neutral canvas, one accent. Springs with at most a tiny overshoot.
Banned: bouncy easing, glows, gradients on UI chrome, particle bursts, dead time.

## Structure
120 BPM, 8 bars, something happens on every beat.
logo, CTA button, email field (typed), loader, success check, dashboard card,
chart draws itself, tooltip on hover, command palette, toast, logo.

## Build
1. One film.ts. Pure function of time. Follow CLAUDE.md.
2. Any value with several targets uses track(), one spring per change.
3. Text inside a morphing container enters after the morph starts and leaves before the
   next one: swapAlpha().
4. Tab indicators: leading and trailing edges on different springs so they stretch.
5. Start on a bar line. A cue under every visible hit.

## Gotchas
The last frame must equal the first, cursor position included.

## Start
Ask for the inputs, then show me the state list on the beat grid before writing code.
```
