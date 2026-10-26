# Critique pass

Run after every draft. `just draft <film> && just sheet <film> --at <a fast moment>`.

```
Open out/<film>/contact.png, strip.png and phone.png and look at them properly.
Be a harsh motion director, not a proud author.

Score 1 to 10: hook in the first 2 seconds, readability at phone size, motion quality
(springs, no dead frames), variety (a new thing every 2 to 4 seconds), composition,
brand accuracy, sound sync.

List the three biggest problems with timestamps. Hunt specifically for: text overlapping
during swaps, anything sliding at constant speed, corner labels and frame borders,
centred-on-gradient shots, type too small at 360px, a dead beat with nothing happening,
an empty half of the frame in one format, a stutter at the loop seam.

Fix them, re-draft, re-sheet, and show the new scores. Append each round to
films/<film>/review.md. Stop when every score is 8 or more, three rounds minimum.
Then sheet a second format and check it before the full render.
```
