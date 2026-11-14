# Project progress — VANKING.UZ Mole Music Show

_Every change is committed and pushed to `main` immediately (spec: development workflow)._

## Current status

**Phase 1 — Toolchain & mascot head: done.** Next up: scene layout, environment and the character rig.

## Completed work

| # | Date | Work |
|---|---|---|
| 1 | 2026-11-14 | Created repo `asintiko/Video1s`; added technical specification, official brand SVGs, README and this progress log. |
| 2 | 2026-11-14 | Toolchain: Node 22 + `@napi-rs/canvas` (Skia) — benchmark: a full 11752×1872 frame with bloom ≈ 0.6 s. |
| 3 | 2026-11-14 | `scripts/extract-mascot.mjs` converts the official head art (87 vector ops, 14 gradients) into `src/assets/mascot-head.js`; `src/characters/head.js` adds blink, pupils, sleepy lids, singing mouth shapes (a/o/e) and the sax embouchure. Verified against the original SVG: [`docs/head-extraction-check.png`](docs/head-extraction-check.png). |

## Next steps

1. Environment: sky gradient, twinkling stars, moon light, meadow, three hills, swaying grass.
2. Characters: shared mole rig + 3 outfits/props + loop-closed choreography.
3. Fireworks: launch → burst → sparks morph into particle text "VANKING" → 1 s hold → gravity dissolve.
4. Soundtrack: procedurally synthesized 15 s pop-funk/electro loop (120 BPM, 30 beats) + firework SFX, rendered on a circular buffer so the loop is sample-exact.
5. Final renders for 6240×1872, 11752×1872, 6864×1872 + loop validation (5× repeat, boundary checks).

## Design decisions & notes

* **Mascot identity**: the official VANKING.UZ head art (square green glasses) is reused path-for-path from the brand SVGs, so faces, fur, nose, eyes and proportions stay on-brand. Only outfits, accessories, expressions and poses change.
* **Loop maths**: every animated quantity is a function of `t ∈ [0, 15)` built from periodic terms whose periods divide 15 s, so frame 449 flows into frame 0 with continuous position *and* velocity.
* **Tempo**: 120 BPM (beat = 0.5 s). The specified launch times 0 / 4 / 8 / 12 s fall exactly on bar lines (2 bars per firework phrase); the last phrase (12–15 s) is 1.5 bars — the musical mirror of the spec's compressed 4th firework. Bursts land on beats at 1, 5, 9 and 12.5 s. Every choreography period is a multiple of 0.5 s that divides 15 s (0.5, 1, 1.5, 2.5, 3, 5, 7.5, 15 s).
* **Screen layout**: the layout drawing was not included with the spec, so the renderer supports two modes:
  * *Spanned*: one continuous panorama across Left | Center | Right (24856 × 1872), one mole per screen;
  * *Standalone*: the full scene composed independently for each screen size.
