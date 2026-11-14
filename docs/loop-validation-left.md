# Loop validation — standalone / left

## Pose continuity (240 Hz sampling)
- emo    max step 13.09 u/frame@240Hz, max accel 1.454 (at 11.867 s) | seam step 4.11, seam accel 0.105 | pose(15)-pose(0) = 0.0e+0 → OK
- singer max step 8.49 u/frame@240Hz, max accel 0.407 (at 11.408 s) | seam step 0.73, seam accel 0.015 | pose(15)-pose(0) = 0.0e+0 → OK
- sax    max step 2.18 u/frame@240Hz, max accel 1.146 (at 10.988 s) | seam step 1.77, seam accel 0.063 | pose(15)-pose(0) = 0.0e+0 → OK

## Frames (standalone / left, scale 0.06)
- render(15.0) vs render(0.0): max channel difference = 0 → IDENTICAL
- frame-to-frame mean abs diff: median 0.685, p90 3.411, max 32.739
- seam 449→0: 0.616 (larger than 166 of 450 transitions) → OK (ordinary transition)
- largest transitions (firework flashes expected): 270→271 (9.00 s): 32.74; 375→376 (12.50 s): 32.41; 150→151 (5.00 s): 32.35; 30→31 (1.00 s): 32.26; 32→33 (1.07 s): 5.02; 152→153 (5.07 s): 4.92

## Audio (5× loop file)
- seam jumps 0.1143, 0.1143, 0.1143, 0.1143 | same beat in other phrases 0.0752, 0.1093, 0.0801 | max anywhere 0.4828
- repetitions sample-identical: yes

**RESULT: PASS**
