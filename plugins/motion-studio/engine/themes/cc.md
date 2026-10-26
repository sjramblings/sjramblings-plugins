# cc: Claude Code series

Standard theme for Claude Code content on sjramblings. Visual values come from `sjramblings`;
this file holds the series rules. The `clip` skill reads it before scripting a Claude Code clip.

## Scenario

- **Audience:** developers who use Claude Code, new users and existing users who never looked
  under the hood, on LinkedIn, YouTube Shorts and sjramblings.io.
- **Remember:** how one feature actually works, as a mental model, plus its limit.
- **Template:** concept (`concepts/cc/s<season>.ts`, drawn by `src/kits/concept.ts`).

## Rules

- **Series code `cc`.** A clip is `cc-<nn>-<slug>`, numbered across the whole series. Never
  renumber a clip once it exists.
- **Seasons:** one subject per season, six to eight clips, each season able to stand alone.
- **Length:** 30 seconds, three or four beats. `title` names the feature the clip is about, so a
  line true of one feature is never read as true of the whole product.
- **Props:** windows for context, agents, stores for files and memory, `remote`, `user`,
  `gate` for permissions and hooks, `clock` for schedules, `line` for one real command.
- **Hook:** a short claim about what happens behind the scenes, nine words at most. Example:
  "A lot loads *before you type* anything."
- **Takeaway:** an action the viewer can take today, often a real command. Example: "Run
  */context* to see what is using your window."
- **Facts:** every clip maps to a named page on `code.claude.com/docs`, read in full this
  session. Check feature availability (preview, plan limits) before scripting.
- **End card:** logo and sjramblings.io. No tagline: "Practical AWS" belongs to the AWS series.
- **Status:** `draft` until an independent fact-check against the docs has been applied.
- **Voice:** British spelling, no hype, no em dashes.
