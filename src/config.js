// Global timing & output configuration.
export const LOOP = 15;            // seconds — the whole piece is periodic with this period
export const BPM = 120;
export const BEAT = 60 / BPM;      // 0.5 s
export const LOOP_BEATS = LOOP / BEAT; // 30
export const FPS = 30;             // 450 frames per loop
export const WORLD_H = 1000;       // world units per screen height

export const SCREENS = {
  left: { name: 'left', w: 6240, h: 1872 },
  center: { name: 'center', w: 11752, h: 1872 },
  right: { name: 'right', w: 6864, h: 1872 },
};
export const SCREEN_ORDER = ['left', 'center', 'right'];

/**
 * Firework cycles (seconds). Launches at 0/4/8/12 s per spec; bursts land on beats.
 * The 4th cycle is compressed to finish (all particles gone) before the 15 s boundary.
 *   launch → burst (rocket flight) → gather (sparks fly into letters, colour → white)
 *   → hold (≈1 s readable VANKING) → dissolve (letters crumble, fall, shrink, fade).
 */
export const FIREWORK_CYCLES = [
  { launch: 0.0, burst: 1.0, gather: [1.22, 2.0], hold: [2.0, 3.0], dissolve: [3.0, 3.86], speed: 1.0 },
  { launch: 4.0, burst: 5.0, gather: [5.22, 6.0], hold: [6.0, 7.0], dissolve: [7.0, 7.86], speed: 1.0 },
  { launch: 8.0, burst: 9.0, gather: [9.22, 10.0], hold: [10.0, 11.0], dissolve: [11.0, 11.86], speed: 1.0 },
  { launch: 12.0, burst: 12.5, gather: [12.66, 13.25], hold: [13.25, 14.25], dissolve: [14.25, 14.93], speed: 1.28 },
];

export const COLORS = {
  blue: [64, 150, 255],
  red: [255, 62, 74],
  green: [60, 235, 110],
};
// Colour arrangement (left, centre, right rocket) per cycle — subtle variation between cycles.
export const CYCLE_COLORS = [
  ['blue', 'red', 'green'],
  ['green', 'blue', 'red'],
  ['red', 'green', 'blue'],
  ['blue', 'red', 'green'],
];
