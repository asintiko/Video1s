# Project progress — VANKING.UZ Mole Music Show

_Every change is committed and pushed to `main` immediately (spec: development workflow)._

## Current status

**Phase 6 — Final renders: in progress.** All animation, fireworks, soundtrack and loop validation are done;
full-resolution renders for the three screens are being produced and attached to a GitHub Release.

## Completed work

| # | Date | Work |
|---|---|---|
| 1 | 2026-11-14 | Created repo `asintiko/Video1s`; added technical specification, official brand SVGs, README and this progress log. |
| 2 | 2026-11-14 | Toolchain: Node 22 + `@napi-rs/canvas` (Skia) — a full 11752×1872 frame renders in ≈1 s. |
| 3 | 2026-11-14 | `scripts/extract-mascot.mjs` converts the official head art (87 vector ops, 14 gradients) into `src/assets/mascot-head.js`; `src/characters/head.js` adds blink, pupils, sleepy lids, singing mouth shapes (a/o/e) and the sax embouchure. Verified against the original SVG: [`docs/head-extraction-check.png`](docs/head-extraction-check.png). |
| 4 | 2026-11-14 | Layout for **standalone** (full scene per screen) and **spanned** (one panorama across the 3 screens) modes; environment: sky gradient, horizon glow, moon, 400–800 twinkling stars, distant ridges, three textured hills with meadow flowers, swaying crest grass, fireflies, foreground grass. |
| 5 | 2026-11-14 | Shared mole rig (soft 2-bone IK, tapered cylinder-shaded limbs, paws with continuous curl/point, shoes with toe/heel pivots) + outfits & props (sequinned jacket, fedora, single sparkling glove, mic; burgundy suit, bow tie, pork-pie hat, golden saxophone; emo tee with pink heart `</>`, studded belt & chain, wristbands, fringe with pink streak, pink-laced sneakers). |
| 6 | 2026-11-14 | Score (`src/music/score.js`, 120 BPM, 30 beats) shared by audio **and** animation: singer lip-sync from vocal syllables, sax fingering/cheek puff from sax notes. Choreography: singer (mic at mouth, gestures, 2 hat touches, toe taps, heel-toe, foot slide, accent twists), sax (sway, nods, knee dips, sax lifts on accents, eyes close on long notes), emo (Tecktonik circles around the head, rolling forearms, cross-body sweeps, elbow pops, arm waves, step footwork, faster phase during firework accents). |
| 7 | 2026-11-14 | Fireworks (`src/fx/fireworks.js`): rockets with sparkling trails from behind the hills, flash + spherical bursts with radial streaks and crackles, 3 697 sparks fly into the letters while turning white, ~1 s shimmering hold, letters crumble left→right, fall, shrink and fade; bloom; firework light on sky, grass and characters. |
| 8 | 2026-11-14 | Soundtrack (`audio/`): kick/clap/808 hats/toms/crash, disco-funk octave bass, synth sax, 3-voice talk-box vocal ("Oh-oh… Hey! Van-king!"), electro arp & stabs, launch whistles, booms, crackles, shimmer, glitter fall. Rendered on a circular 15 s buffer; reverb/delay run to steady state; −13 LUFS integrated. |
| 9 | 2026-11-14 | Render pipeline (`scripts/render.mjs`): parallel workers → x264 segments → lossless concat + AAC; loop validator (`scripts/validate-loop.mjs`). Fixed: motion kinks (smooth unions), over-fast "pops", order-dependent canvas state, preview edge column, bloom edge artefact. |
| 10 | 2026-11-14 | Polish: letters visibly made of sparkling particles; bursts centred per word-third + early-travel easing so the word emerges cleanly from the sparks; emo sweep path; tamer flash light. |

## Loop validation (latest)

* `render(15 s)` is **pixel-identical** to `render(0 s)`; every pose is exactly periodic (`pose(15) − pose(0) = 0`).
* Seam 449 → 0 is an ordinary transition (frame difference ≈ the median of all 450 transitions).
* Audio: the 5× loop file repeats **sample-identically**; the seam jump equals the same beat in other phrases.
* Report: [`docs/loop-validation-left.md`](docs/loop-validation-left.md).

## Next steps

1. Final renders: standalone left / center / right ✅ left · ⏳ right · ⏳ center; spanned set.
2. Publish renders as a GitHub Release, add preview videos + soundtrack to `deliverables/`.

## Design decisions & notes

* **Mascot identity**: the official VANKING.UZ head art (square green glasses) is reused path-for-path from the brand SVGs, so faces, fur, nose, eyes and proportions stay on-brand. Only outfits, accessories, expressions and poses change.
* **Style**: high-quality *2.5D vector* animation (cylinder-shaded limbs, rim/moon light, firework lighting, bloom) rendered with Skia — not a 3D render. This keeps the brand vector art exact and renders the huge LED resolutions in minutes.
* **Loop maths**: every animated quantity is a pure function of `t ∈ [0, 15)` built from periodic terms whose periods divide 15 s, so frame 449 flows into frame 0 with continuous position *and* velocity. No simulation state is carried between frames.
* **Tempo**: 120 BPM (beat = 0.5 s). The specified launch times 0 / 4 / 8 / 12 s fall exactly on bar lines (2 bars per firework phrase); the last phrase (12–15 s) is 1.5 bars — the musical mirror of the spec's compressed 4th firework. Bursts land on beats at 1, 5, 9 and 12.5 s.
* **Screen layout**: the layout drawing was not included with the spec, so two render sets are produced:
  * *Standalone*: the full scene composed independently for each screen size;
  * *Spanned*: one continuous panorama across Left | Center | Right (24 856 × 1 872), one mole per screen, fireworks/text on the center screen.
* **Audio in MP4**: AAC encoders add priming samples, so for gap-free audio looping on a media server use the separate `soundtrack.wav` (sample-exact 15.000 s).
