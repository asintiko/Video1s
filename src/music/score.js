// The 15-second score (120 BPM, 30 beats, E minor/dorian). Times and durations are in BEATS.
// Shared by the audio synthesizer AND the animation (lip-sync, sax fingering, accents), so
// sound and picture are locked together by construction.
//
// Phrase map (matches the firework cycles):
//   β 0–8   Em7 | A7      launch @0, burst @2, VANKING @4–6, dissolve @6–7.7
//   β 8–16  Em7 | A7      launch @8, burst @10, VANKING @12–14
//   β 16–24 Cmaj7 | D     launch @16, burst @18, VANKING @20–22   (sax-led section)
//   β 24–30 Em7 | B7      launch @24, burst @25, VANKING @26.5–28.5, turnaround → loop

export const CHORDS = [
  { t: 0, d: 4, bass: 28, tones: [52, 55, 59, 62] },   // Em7
  { t: 4, d: 4, bass: 33, tones: [57, 61, 64, 67] },   // A7
  { t: 8, d: 4, bass: 28, tones: [52, 55, 59, 62] },
  { t: 12, d: 4, bass: 33, tones: [57, 61, 64, 67] },
  { t: 16, d: 4, bass: 36, tones: [52, 55, 59, 60] },  // Cmaj7
  { t: 20, d: 4, bass: 38, tones: [54, 57, 62, 66] },  // D
  { t: 24, d: 4, bass: 28, tones: [52, 55, 59, 62] },  // Em7
  { t: 28, d: 2, bass: 35, tones: [54, 57, 59, 63] },  // B7 (turnaround)
];
export const BURST_BEATS = [2, 10, 18, 25];
export const LAUNCH_BEATS = [0, 8, 16, 24];

// ---------------------------------------------------------------- drums
export const DRUMS = (() => {
  const ev = [];
  for (let b = 0; b < 30; b++) {
    ev.push({ t: b, inst: 'kick', v: 1 });
    if (b % 2 === 1) ev.push({ t: b, inst: 'clap', v: b === 29 ? 1 : 0.92 });
    ev.push({ t: b + 0.5, inst: 'ohat', v: 0.55 });
    for (const s of [0, 0.25, 0.75]) ev.push({ t: b + s, inst: 'hat', v: s === 0 ? 0.42 : 0.3 });
    if (b % 2 === 1) ev.push({ t: b + 0.75, inst: 'kick', v: 0.45 }); // funky pickup kick
  }
  // fills leading into each launch (identical feel so the loop seam sounds like any phrase seam)
  for (const end of [8, 16, 24, 30]) {
    const big = end === 30 || end === 16;
    for (let i = 0; i < (big ? 6 : 3); i++) ev.push({ t: end - 1 + i * 0.25 - (big ? 0.5 : 0) + (big ? 0 : 0.25), inst: i % 2 ? 'tom2' : 'tom1', v: 0.55 + i * 0.07 });
    ev.push({ t: end - 0.25, inst: 'snare', v: 0.7 });
  }
  for (const b of BURST_BEATS) ev.push({ t: b, inst: 'crash', v: 0.85 });
  return ev;
})();

// ---------------------------------------------------------------- bass (disco-funk octaves)
export const BASS = (() => {
  const ev = [];
  for (const c of CHORDS) {
    for (let b = c.t; b < c.t + c.d; b++) {
      const r = c.bass;
      ev.push({ t: b, d: 0.4, n: r, v: 1 });
      ev.push({ t: b + 0.5, d: 0.22, n: r + 12, v: 0.85 });
      if ((b - c.t) % 2 === 1) ev.push({ t: b + 0.75, d: 0.2, n: r + 10, v: 0.6 }); // b7 ghost
    }
  }
  // walk-up in the turnaround: B → C# → D → D# → (E at β0)
  return ev.filter((e) => !(e.t >= 29 && e.t < 30)).concat([
    { t: 29, d: 0.22, n: 35, v: 0.9 }, { t: 29.25, d: 0.22, n: 37, v: 0.9 },
    { t: 29.5, d: 0.22, n: 38, v: 0.95 }, { t: 29.75, d: 0.22, n: 39, v: 1 },
  ]);
})();

// ---------------------------------------------------------------- saxophone (lead)
const sx = (t, d, n, v = 0.85, extra = {}) => ({ t, d, n, v, ...extra });
export const SAX = [
  // phrase 1 — rising lick while sparks gather, falling lick while letters crumble
  sx(2.5, 0.25, 71), sx(2.75, 0.25, 74), sx(3.0, 0.5, 76), sx(3.5, 0.45, 79, 0.9, { bend: -3 }),
  sx(5.75, 0.25, 79), sx(6.0, 0.25, 76), sx(6.25, 0.25, 74), sx(6.5, 0.5, 71), sx(7.0, 0.25, 69), sx(7.25, 0.25, 67), sx(7.5, 0.45, 64),
  // phrase 2
  sx(10.5, 0.25, 76), sx(10.75, 0.25, 79), sx(11.0, 0.5, 81), sx(11.5, 0.25, 79), sx(11.75, 0.25, 76),
  sx(13.75, 0.25, 81), sx(14.0, 0.25, 79), sx(14.25, 0.25, 76), sx(14.5, 0.5, 74), sx(15.0, 0.25, 71), sx(15.25, 0.25, 74), sx(15.5, 0.45, 76),
  // phrase 3 — the saxophonist takes the spotlight (8–12 s)
  sx(16.0, 0.5, 76, 0.8), sx(16.5, 0.25, 79, 0.8), sx(16.75, 0.75, 83, 0.9, { vib: 1 }),
  sx(18.5, 0.5, 79, 1), sx(19.0, 0.25, 81, 1), sx(19.25, 0.7, 83, 1, { vib: 1 }),
  sx(21.75, 0.25, 81, 1), sx(22.0, 0.5, 78, 1), sx(22.5, 0.25, 76, 1), sx(22.75, 0.25, 74, 1), sx(23.0, 0.5, 69, 1), sx(23.5, 0.45, 74, 1),
  // phrase 4 + turnaround back to the top
  sx(25.5, 0.25, 76), sx(25.75, 0.25, 79), sx(26.0, 0.45, 76),
  sx(28.0, 0.25, 78), sx(28.25, 0.25, 75), sx(28.5, 0.25, 71), sx(28.75, 0.25, 69), sx(29.0, 0.25, 66), sx(29.25, 0.25, 69), sx(29.5, 0.45, 71),
];

// ---------------------------------------------------------------- lead vocal (talk-box style)
// syllable: { t, d, n, text, vowel: a|e|i|o|u, onset?: v|k|h|y|w, coda?: n|ng, slideTo? }
const vo = (t, d, n, text, vowel, extra = {}) => ({ t, d, n, text, vowel, v: 1, ...extra });
export const VOCAL = [
  vo(0.0, 0.42, 64, 'Oh', 'o'), vo(0.5, 0.42, 67, 'oh', 'o'), vo(1.0, 0.85, 71, 'ohh', 'o', { slideTo: 74 }),
  vo(2.0, 0.38, 76, 'Hey!', 'e', { onset: 'h' }),
  vo(4.0, 0.62, 71, 'Van', 'a', { onset: 'v', coda: 'n' }), vo(4.75, 0.95, 76, 'king!', 'i', { onset: 'k', coda: 'ng', slideTo: 74 }),

  vo(8.0, 0.8, 67, 'Yeah', 'e', { onset: 'y', slideTo: 69 }), vo(9.0, 0.8, 69, 'yeah', 'e', { onset: 'y', slideTo: 71 }),
  vo(10.0, 0.45, 76, 'Woo!', 'u', { onset: 'w', slideTo: 79 }),
  vo(12.0, 0.62, 71, 'Van', 'a', { onset: 'v', coda: 'n' }), vo(12.75, 0.95, 76, 'king!', 'i', { onset: 'k', coda: 'ng', slideTo: 74 }),

  vo(18.0, 0.32, 79, 'Hee!', 'i', { onset: 'h' }),
  vo(20.0, 0.62, 74, 'Van', 'a', { onset: 'v', coda: 'n' }), vo(20.75, 0.95, 78, 'king!', 'i', { onset: 'k', coda: 'ng', slideTo: 76 }),

  vo(24.0, 0.42, 64, 'Oh', 'o'), vo(24.5, 0.42, 71, 'oh', 'o'), vo(25.0, 0.38, 76, 'Hey!', 'e', { onset: 'h' }),
  vo(26.5, 0.62, 71, 'Van', 'a', { onset: 'v', coda: 'n' }), vo(27.25, 0.95, 76, 'king!', 'i', { onset: 'k', coda: 'ng', slideTo: 74 }),
];

// ---------------------------------------------------------------- electro synth (stabs + arp)
export const SYNTH = (() => {
  const ev = [];
  for (const c of CHORDS) {
    for (let s = 0; s < c.d * 4; s++) {
      const t = c.t + s / 4;
      const n = c.tones[[0, 2, 1, 3, 2, 1, 3, 2][s % 8]] + 12;
      ev.push({ t, d: 0.2, n, v: 0.32 + (s % 4 === 2 ? 0.1 : 0), kind: 'arp' });
    }
    for (let b = c.t; b < c.t + c.d; b++) ev.push({ t: b + 0.5, d: 0.22, tones: c.tones, v: c.t >= 16 && c.t < 24 ? 0.6 : 0.38, kind: 'stab' });
  }
  return ev;
})();
