# Project progress — VANKING.UZ Mole Music Show

_Every change is committed and pushed to `main` immediately (spec: development workflow)._

## Current status

**Phase 0 — Repository bootstrap: done.** Next up: rendering toolchain and mascot extraction.

## Completed work

| # | Date | Work |
|---|---|---|
| 1 | 2026-11-14 | Created repo `asintiko/Video1s`; added technical specification, official brand SVGs, README and this progress log. |

## Next steps

1. Rendering toolchain: deterministic `render(t)` frame function (Canvas 2D API, Skia backend in Node) so any frame can be rendered independently.
2. Extract the official mascot head (square green glasses, `vanking-day-uz.svg`) into a reusable vector module.
3. Environment: sky gradient, twinkling stars, moon light, meadow, three hills, swaying grass.
4. Characters: shared mole rig + 3 outfits/props + loop-closed choreography.
5. Fireworks: launch → burst → sparks morph into particle text "VANKING" → 1 s hold → gravity dissolve.
6. Soundtrack: procedurally synthesized 15 s pop-funk/electro loop (128 BPM = exactly 8 bars) + firework SFX.
7. Final renders for 6240×1872, 11752×1872, 6864×1872 + loop validation (5× repeat, boundary checks).

## Design decisions & notes

* **Mascot identity**: the official VANKING.UZ head art (square green glasses) is reused path-for-path from the brand SVGs, so faces, fur, nose, eyes and proportions stay on-brand. Only outfits, accessories, expressions and poses change.
* **Loop maths**: every animated quantity is a function of `t ∈ [0, 15)` built from periodic terms whose periods divide 15 s, so frame 449 flows into frame 0 with continuous position *and* velocity.
* **Tempo**: 128 BPM → beat = 0.46875 s, 15 s = 32 beats = 8 bars of 4/4 (clean musical loop). Fireworks launch at 0 / 4 / 8 / 12 s as specified.
* **Screen layout**: the layout drawing was not included with the spec, so the renderer supports two modes:
  * *Spanned*: one continuous panorama across Left | Center | Right (24856 × 1872), one mole per screen;
  * *Standalone*: the full scene composed independently for each screen size.
