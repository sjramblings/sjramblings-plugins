# aws: AWS explainer series

Standard theme for AWS content on sjramblings. Visual values come from `sjramblings`; this file
holds the series rules. The `clip` skill reads it before scripting an AWS clip.

## Scenario

- **Audience:** AWS builders and architects on LinkedIn, YouTube Shorts and sjramblings.io.
- **Remember:** one practical fact about one service, and the limit that comes with it.
- **Template:** explainer (`clips/<service>.ts`, drawn by `src/kits/explainer.ts`). Build
  scenarios that span several services use the concept template at 45 seconds.

## Rules

- **One series per service.** A clip is `<service>-<nn>-<slug>`. Numbers are permanent: never
  renumber or rename a clip once it exists.
- **Level** 100, 200 or 300 on every clip, shown in the hook lockup.
- **Story:** the pain first, then the picture, how it works in three moves, the honest catch,
  one line to take away.
- **Hook:** the viewer's problem in their words, nine words at most. Example: "Your Lambda is
  fast. *Except the first time.*"
- **Icons:** real AWS architecture icons from `assets/aws-icons/`, or a lettered tile.
  More than six things to compare: a table, not a diagram.
- **Facts:** every factual line has an AWS documentation page in `sources`, read this session.
  No prices in dollars. `checked` is the date of that reading, and `just stale` flags clips
  older than 180 days.
- **End card:** logo, sjramblings.io, "Practical AWS, from the trenches."
- **Render order:** 4x5 first (LinkedIn, the tightest frame), then 9x16, then 16x9.
- **Status:** `draft` until someone who did not write the clip has checked every factual line.
- **Voice:** British spelling, no hype, no em dashes. A build idea is "how you would build
  this", never something already built.
