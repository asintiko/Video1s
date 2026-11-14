// Renders the 15-second, sample-exact looping soundtrack from src/music/score.js.
//   node audio/build-soundtrack.mjs  → out/audio/soundtrack.wav (+ soundtrack_x5.wav, stems/)
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { SR, Bus, Osc, Biquad, noiseGen, adsr, midiHz, loopEffect, reverb, pingPong } from './dsp.mjs';
import { DRUMS, BASS, SAX, VOCAL, SYNTH } from '../src/music/score.js';
import { FIREWORK_CYCLES, LOOP, BEAT } from '../src/config.js';

const N = LOOP * SR;
const S = (beats) => Math.round(beats * BEAT * SR);
const sec = (s) => Math.round(s * SR);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;

// ================================================================ drums
function kick(bus, i0, v) {
  const n = sec(0.45), o = new Osc(), nz = noiseGen(i0 + 7), hp = new Biquad().set('hp', 2500);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const f = 46 + 125 * Math.exp(-t / 0.03);
    const body = o.sine(f) * Math.exp(-t / 0.25) * Math.min(1, t / 0.0015) * (1 - sstep(0.4, 0.45, t));
    const click = hp.run(nz()) * Math.exp(-t / 0.004) * 0.45;
    bus.add(i0 + k, Math.tanh((body + click) * 1.7) * 0.95 * v, 0);
  }
}
function clap(bus, i0, v) {
  const n = sec(0.32), nl = noiseGen(i0 * 3 + 1), nr = noiseGen(i0 * 5 + 2);
  const bl = new Biquad().set('bp', 1250, 1.0), br = new Biquad().set('bp', 1350, 1.0);
  const hl = new Biquad().set('hp', 500), hr = new Biquad().set('hp', 500);
  const tone = new Osc();
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let env = 0;
    for (const o of [0, 0.0105, 0.022]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) / 0.0055));
    if (t > 0.022) env = Math.max(env, 0.6 * Math.exp(-(t - 0.022) / 0.085));
    env *= 1 - sstep(0.28, 0.32, t);
    const body = tone.tri(185) * Math.exp(-t / 0.05) * 0.35;
    bus.addStereo(i0 + k, (hl.run(bl.run(nl())) * 2.4 * env + body) * v * 0.62, (hr.run(br.run(nr())) * 2.4 * env + body) * v * 0.62);
  }
}
function snare(bus, i0, v) {
  const n = sec(0.25), nz = noiseGen(i0 + 31), hp = new Biquad().set('hp', 1400), o = new Osc();
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = hp.run(nz()) * Math.exp(-t / 0.07) + o.tri(195 - 30 * t) * Math.exp(-t / 0.05) * 0.6;
    bus.add(i0 + k, x * v * 0.55 * (1 - sstep(0.22, 0.25, t)), 0.05);
  }
}
function tom(bus, i0, v, hi) {
  const n = sec(0.35), o = new Osc();
  const f0 = hi ? 170 : 125;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = o.sine(f0 * (0.72 + 0.28 * Math.exp(-t / 0.08))) * Math.exp(-t / 0.16) * Math.min(1, t / 0.002);
    bus.add(i0 + k, Math.tanh(x * 1.5) * v * 0.6 * (1 - sstep(0.3, 0.35, t)), hi ? -0.25 : 0.25);
  }
}
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540, 800];
function metal(oscs, mul) { let m = 0; for (let j = 0; j < 6; j++) m += oscs[j].square(HAT_F[j] * mul); return m / 6; }
function hat(bus, i0, v, open) {
  const dur = open ? 0.36 : 0.075, n = sec(dur);
  const oscs = HAT_F.map((_, j) => new Osc(j * 0.17));
  const bp = new Biquad().set('bp', 10500, 0.7), hp = new Biquad().set('hp', 7200), nz = noiseGen(i0 + 99);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = hp.run(bp.run(metal(oscs, 1.7) * 0.8 + nz() * 0.45));
    const env = Math.exp(-t / (open ? 0.1 : 0.017)) * (1 - sstep(dur * 0.85, dur, t));
    bus.add(i0 + k, x * env * v * 0.75, open ? -0.18 : 0.22);
  }
}
function crash(bus, i0, v) {
  const dur = 2.4, n = sec(dur);
  const oL = HAT_F.map((_, j) => new Osc(j * 0.21)), oR = HAT_F.map((_, j) => new Osc(j * 0.37));
  const nl = noiseGen(i0 + 3), nr = noiseGen(i0 + 4);
  const hl = new Biquad().set('hp', 3800), hr = new Biquad().set('hp', 3900), sl = new Biquad().set('bp', 8000, 0.6), sr = new Biquad().set('bp', 8200, 0.6);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const env = (0.35 * Math.exp(-t / 0.05) + 0.65 * Math.exp(-t / 0.62)) * Math.min(1, t / 0.002) * (1 - sstep(dur * 0.8, dur, t));
    const l = hl.run(sl.run(metal(oL, 2.3) * 0.6 + nl() * 0.7)) * env;
    const r = hr.run(sr.run(metal(oR, 2.31) * 0.6 + nr() * 0.7)) * env;
    bus.addStereo(i0 + k, l * v * 0.9, r * v * 0.9);
  }
}

// ================================================================ bass
function bassNote(bus, i0, e) {
  const dur = e.d * BEAT, tot = sec(dur + 0.05);
  const f = midiHz(e.n), o1 = new Osc(), o2 = new Osc(0.25), lp = new Biquad();
  for (let k = 0; k < tot; k++) {
    const t = k / SR;
    if (k % 16 === 0) lp.set('lp', 230 + 2300 * Math.exp(-t / 0.085) * e.v, 3.0);
    const env = adsr(t, dur, 0.003, 0.12, 0.72, 0.03);
    const x = lp.run(o1.saw(f) * 0.7 + o2.square(f / 2, 0.5) * 0.3) * env;
    bus.add(i0 + k, Math.tanh(x * 1.5) * 0.85 * e.v, 0);
  }
}

// ================================================================ saxophone (lead, right)
function saxNote(bus, i0, e, pan = 0.3) {
  const dur = e.d * BEAT, tot = sec(dur + 0.14);
  const f0 = midiHz(e.n);
  const o1 = new Osc(), o2 = new Osc(0.31), nz = noiseGen(i0 + 5);
  const lp = new Biquad(), p1 = new Biquad().set('peak', 640, 1.1, 7), p2 = new Biquad().set('peak', 1650, 1.4, 5), nb = new Biquad().set('bp', 2600, 0.8);
  for (let k = 0; k < tot; k++) {
    const t = k / SR;
    const scoop = -0.55 * Math.exp(-t / 0.045);
    const bend = e.bend ? e.bend * sstep(dur * 0.5, dur, t) : 0;
    const vd = (e.vib ? 0.32 : 0.13) * sstep(0.1, 0.32, t);
    const semis = scoop + bend + vd * Math.sin(2 * Math.PI * 5.6 * t);
    const f = f0 * Math.pow(2, semis / 12);
    const env = adsr(t, dur, 0.022, 0.09, 0.84, 0.075);
    if (k % 16 === 0) lp.set('lp', 1200 + 3600 * env * e.v, 0.85);
    let x = o1.saw(f) * 0.62 + o2.square(f, 0.42) * 0.42;
    x = p2.run(p1.run(lp.run(x)));
    const breath = nb.run(nz()) * (0.07 + 0.3 * Math.exp(-t / 0.035));
    bus.add(i0 + k, Math.tanh((x * 0.85 + breath) * env * 1.7) * 0.72 * e.v, pan);
  }
}

// ================================================================ talk-box vocal (centre)
const FORM = { a: [760, 1150, 2500], e: [520, 1850, 2550], i: [300, 2250, 3000], o: [560, 860, 2450], u: [330, 880, 2250], n: [260, 1500, 2550], ng: [270, 2050, 2700], v: [420, 1350, 2350] };
function vocalNote(bus, i0, e, detune = 0, pan = 0, gain = 1) {
  const dur = e.d * BEAT, tot = sec(dur + 0.12);
  const fA = midiHz(e.n + detune), fB = midiHz((e.slideTo ?? e.n) + detune);
  const s1 = new Osc(), s2 = new Osc(0.5), nz = noiseGen(i0 + 3 + Math.round(detune * 100));
  const bps = [new Biquad(), new Biquad(), new Biquad()], g = [1.0, 0.6, 0.3];
  const nh = new Biquad().set('hp', 2500);
  const vStart = e.onset === 'k' ? 0.032 : e.onset === 'h' ? 0.03 : 0;
  for (let k = 0; k < tot; k++) {
    const t = k / SR, u = t / dur;
    const slide = sstep(0.55, 0.95, u);
    const vib = 0.2 * sstep(0.15, 0.35, t) * Math.sin(2 * Math.PI * 5.4 * t);
    const scoop = -0.3 * Math.exp(-t / 0.05);
    const f = lerp(fA, fB, slide) * Math.pow(2, (vib + scoop) / 12);
    if (k % 32 === 0) {
      let F = FORM[e.vowel];
      const mixF = (A, B, w) => A.map((v, j) => lerp(v, B[j], w));
      if (e.onset === 'y') F = mixF(FORM.i, F, sstep(0, 0.08, t));
      if (e.onset === 'w') F = mixF(FORM.u, F, sstep(0, 0.09, t));
      if (e.onset === 'v') F = mixF(FORM.v, F, sstep(0.02, 0.08, t));
      if (e.coda) F = mixF(F, FORM[e.coda], sstep(0.6, 0.8, u));
      bps.forEach((b, j) => b.set('bp', F[j], 8 + j * 2));
    }
    const env = adsr(t - vStart, dur - vStart, 0.018, 0.06, 0.9, 0.06);
    const nasal = e.coda ? 1 - 0.45 * sstep(0.65, 0.85, u) : 1;
    const src = (s1.saw(f) * 0.8 + s2.saw(f * 1.003) * 0.35) * env * nasal;
    let y = 0;
    for (let j = 0; j < 3; j++) y += bps[j].run(src) * g[j];
    let cons = 0;
    if (e.onset === 'k' && t < 0.034) cons = nh.run(nz()) * (1 - t / 0.034) * 0.9;
    else if (e.onset === 'h' && t < 0.07) cons = nh.run(nz()) * (1 - t / 0.07) * 0.35;
    else if (e.onset === 'v' && t < 0.06) cons = nh.run(nz()) * 0.18;
    bus.add(i0 + k, Math.tanh(y * 4.2 + cons) * 0.75 * gain, pan);
  }
}

// ================================================================ electro synths (left)
function arpNote(bus, i0, e) {
  const dur = 0.13, tot = sec(dur), f = midiHz(e.n), o = new Osc(), o2 = new Osc(0.2), lp = new Biquad();
  for (let k = 0; k < tot; k++) {
    const t = k / SR;
    if (k % 16 === 0) lp.set('lp', 700 + 3800 * Math.exp(-t / 0.035), 2.2);
    const x = lp.run(o.square(f, 0.3) * 0.6 + o2.saw(f * 1.005) * 0.4) * Math.exp(-t / 0.05) * Math.min(1, t / 0.002);
    bus.add(i0 + k, x * e.v * 0.6, -0.38);
  }
}
function stab(bus, i0, e) {
  const dur = e.d * BEAT, tot = sec(dur + 0.08);
  e.tones.forEach((n, ti) => {
    const oscs = [-0.12, 0, 0.12].map((d, j) => ({ o: new Osc(j * 0.3 + ti * 0.1), f: midiHz(n + 12 + d) }));
    const lp = new Biquad();
    for (let k = 0; k < tot; k++) {
      const t = k / SR;
      if (k % 16 === 0) lp.set('lp', 900 + 2600 * Math.exp(-t / 0.06), 1.4);
      let x = 0;
      for (const q of oscs) x += q.o.saw(q.f);
      x = lp.run(x / 3) * adsr(t, dur, 0.004, 0.12, 0.35, 0.06);
      bus.add(i0 + k, x * e.v * 0.32, -0.55 + ti * 0.36);
    }
  });
}

// ================================================================ firework sound design
function whistle(bus, i0, dur, pan, seed, pitch = 1) {
  const n = sec(dur), o = new Osc(seed * 0.1), nz = noiseGen(seed + 11), bp = new Biquad();
  for (let k = 0; k < n; k++) {
    const t = k / SR, u = t / dur;
    const f = (850 + 2000 * Math.pow(u, 0.85)) * pitch + 50 * Math.sin(2 * Math.PI * 21 * t);
    if (k % 32 === 0) bp.set('bp', f * 1.1, 6);
    const amp = (0.15 + 0.85 * u) * (1 - sstep(0.9, 1, u)) * Math.min(1, t / 0.04);
    bus.add(i0 + k, (o.sine(f) * 0.14 + bp.run(nz()) * 0.22) * amp, pan * (0.6 + 0.4 * u));
  }
}
function boom(bus, i0, pan, seed, v = 1) {
  const n = sec(2.2), o = new Osc(), nz = noiseGen(seed + 21), lp = new Biquad(), hp = new Biquad().set('hp', 2500);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    if (k % 32 === 0) lp.set('lp', 300 + 2200 * Math.exp(-t / 0.08), 0.8);
    const thump = o.sine(30 + 60 * Math.exp(-t / 0.07)) * Math.exp(-t / 0.42) * 0.9;
    const roar = lp.run(nz()) * (0.15 * Math.exp(-t / 0.75) + 0.6 * Math.exp(-t / 0.09));
    const crack = hp.run(nz()) * Math.exp(-t / 0.012) * 0.8;
    const env = Math.min(1, t / 0.0015) * (1 - sstep(1.9, 2.2, t));
    bus.add(i0 + k, Math.tanh((thump + roar + crack) * 1.3) * env * 0.85 * v, pan);
  }
}
function crackles(bus, iBurst, pan, seed, span) {
  const rnd = noiseGen(seed + 41);
  for (let c = 0; c < 46; c++) {
    const at = iBurst + sec(span[0] + (span[1] - span[0]) * (0.5 + 0.5 * rnd()));
    const amp = 0.08 + 0.18 * (0.5 + 0.5 * rnd());
    const p = clamp(pan + 0.45 * rnd(), -1, 1);
    const nz = noiseGen(seed + c * 7 + 1), hp = new Biquad().set('hp', 1800 + 1500 * (0.5 + 0.5 * rnd()));
    const len = sec(0.004 + 0.006 * (0.5 + 0.5 * rnd()));
    for (let k = 0; k < len; k++) bus.add(at + k, hp.run(nz()) * amp * (1 - k / len), p);
  }
}
function bell(bus, i0, n, dur, amp, pan) {
  const tot = sec(dur), f = midiHz(n), o1 = new Osc(), o2 = new Osc(0.3), o3 = new Osc(0.6);
  for (let k = 0; k < tot; k++) {
    const t = k / SR;
    const x = o1.sine(f) + 0.45 * o2.sine(f * 2.76) * Math.exp(-t / 0.08) + 0.25 * o3.sine(f * 5.4) * Math.exp(-t / 0.04);
    bus.add(i0 + k, x * amp * Math.exp(-t / (dur * 0.35)) * Math.min(1, t / 0.0015) * (1 - sstep(dur * 0.85, dur, t)), pan);
  }
}
function shimmer(bus, i0, dur, seed) {
  const notes = [76, 79, 83, 88, 91, 95, 100, 103];
  notes.forEach((n, j) => bell(bus, i0 + sec((dur * j) / notes.length), n, 0.9, 0.05, j % 2 ? 0.45 : -0.45));
  const nz = noiseGen(seed), bp = new Biquad().set('bp', 7000, 0.9);
  const tot = sec(dur + 0.3);
  for (let k = 0; k < tot; k++) {
    const t = k / SR;
    bus.add(i0 + k, bp.run(nz()) * 0.06 * sstep(0, dur, t) * (1 - sstep(dur, dur + 0.3, t)), 0);
  }
}
function sparkle(bus, i0, dur, seed) {
  const rnd = noiseGen(seed);
  for (let j = 0; j < Math.round(dur * 14); j++) {
    const at = i0 + sec(dur * (j / (dur * 14)) + 0.03 * rnd());
    bell(bus, at, 96 + Math.round(6 * (0.5 + 0.5 * rnd())) * 2, 0.35, 0.022, 0.8 * rnd());
  }
}
function glitterFall(bus, i0, dur, seed) {
  const notes = [103, 100, 98, 95, 91, 88, 86, 83, 79, 76];
  notes.forEach((n, j) => bell(bus, i0 + sec((dur * 0.8 * j) / notes.length), n, 0.6, 0.035 * (1 - j / 14), Math.sin(j * 1.7) * 0.5));
  const nz = noiseGen(seed), lp = new Biquad();
  const tot = sec(dur);
  for (let k = 0; k < tot; k++) {
    const t = k / SR, u = t / dur;
    if (k % 32 === 0) lp.set('lp', 9000 - 7000 * u, 0.7);
    bus.add(i0 + k, lp.run(nz()) * 0.04 * (1 - u) * Math.min(1, t / 0.05), 0);
  }
}

// ================================================================ render
function build() {
  const buses = { drums: new Bus(N), clap: new Bus(N), bass: new Bus(N), sax: new Bus(N), vocal: new Bus(N), synth: new Bus(N), sfx: new Bus(N) };
  for (const d of DRUMS) {
    const i0 = S(d.t);
    if (d.inst === 'kick') kick(buses.drums, i0, d.v);
    else if (d.inst === 'clap') clap(buses.clap, i0, d.v);
    else if (d.inst === 'snare') snare(buses.clap, i0, d.v);
    else if (d.inst === 'hat') hat(buses.drums, i0, d.v, false);
    else if (d.inst === 'ohat') hat(buses.drums, i0, d.v, true);
    else if (d.inst === 'tom1') tom(buses.drums, i0, d.v, true);
    else if (d.inst === 'tom2') tom(buses.drums, i0, d.v, false);
    else if (d.inst === 'crash') crash(buses.drums, i0, d.v);
  }
  for (const e of BASS) bassNote(buses.bass, S(e.t), e);
  for (const e of SAX) saxNote(buses.sax, S(e.t), e);
  for (const e of VOCAL) {
    vocalNote(buses.vocal, S(e.t), e, 0, 0, 1);
    vocalNote(buses.vocal, S(e.t) + sec(0.012), e, 0.07, -0.35, 0.45);
    vocalNote(buses.vocal, S(e.t) + sec(0.019), e, -0.07, 0.35, 0.45);
  }
  for (const e of SYNTH) (e.kind === 'arp' ? arpNote : stab)(buses.synth, S(e.t), e);
  FIREWORK_CYCLES.forEach((c, ci) => {
    const pans = [-0.6, 0, 0.6];
    pans.forEach((p, k) => whistle(buses.sfx, sec(c.launch + 0.02 * k), c.burst - c.launch - 0.02 * k, p, ci * 10 + k, 1 + 0.06 * (k - 1)));
    pans.forEach((p, k) => boom(buses.sfx, sec(c.burst + 0.004 * k), p, ci * 10 + k, k === 1 ? 1 : 0.8));
    pans.forEach((p, k) => crackles(buses.sfx, sec(c.burst), p, ci * 100 + k * 13, [0.3, 1.35 / (c.speed || 1)]));
    shimmer(buses.sfx, sec(c.gather[0]), c.hold[0] - c.gather[0], ci + 5);
    sparkle(buses.sfx, sec(c.hold[0]), c.hold[1] - c.hold[0], ci + 50);
    glitterFall(buses.sfx, sec(c.dissolve[0]), c.dissolve[1] - c.dissolve[0], ci + 90);
  });
  // ---- sidechain ducking (pure function of time → loop-exact)
  const duck = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const tb = ((i / SR) / BEAT) % 1; // beat fraction (kick on every beat)
    duck[i] = 1 - 0.38 * Math.exp(-(tb * BEAT) / 0.11);
  }
  for (const k of ['bass', 'synth']) { const b = buses[k]; for (let i = 0; i < N; i++) { b.L[i] *= duck[i]; b.R[i] *= duck[i]; } }
  // ---- stem balance (measured RMS → targets around -14 LUFS master with headroom)
  const TRIM = { drums: 0.4, clap: 1.45, bass: 0.5, sax: 0.42, vocal: 0.78, synth: 1.25, sfx: 0.55 };
  for (const [k, g] of Object.entries(TRIM)) { const b = buses[k]; for (let i = 0; i < N; i++) { b.L[i] *= g; b.R[i] *= g; } }
  // ---- effects (steady-state over the loop)
  const mix = new Bus(N);
  const send = (src, fx, g) => loopEffect(src, fx).mixInto(mix, g);
  buses.drums.mixInto(mix, 0.9);
  buses.clap.mixInto(mix, 0.85);
  buses.bass.mixInto(mix, 0.95);
  buses.sax.mixInto(mix, 0.95);
  buses.vocal.mixInto(mix, 0.95);
  buses.synth.mixInto(mix, 0.75);
  buses.sfx.mixInto(mix, 0.95);
  const verbBus = new Bus(N);
  buses.clap.mixInto(verbBus, 0.5); buses.sax.mixInto(verbBus, 0.55); buses.vocal.mixInto(verbBus, 0.5);
  buses.synth.mixInto(verbBus, 0.35); buses.sfx.mixInto(verbBus, 0.9); buses.drums.mixInto(verbBus, 0.12);
  send(verbBus, () => reverb({ room: 0.86, damp: 0.3 }), 0.9);
  const dlyBus = new Bus(N);
  buses.sax.mixInto(dlyBus, 0.5); buses.vocal.mixInto(dlyBus, 0.4); buses.synth.mixInto(dlyBus, 0.4);
  send(dlyBus, () => pingPong(0.375, 0.38, 3200), 0.45);
  // ---- master: high-pass rumble, soft clip, normalise to -1 dBFS
  const hpL = new Biquad().set('hp', 28), hpR = new Biquad().set('hp', 28);
  const mastered = loopEffect(mix, () => (l, r) => [hpL.run(l), hpR.run(r)]);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    mastered.L[i] = Math.tanh(mastered.L[i] * 1.6) / 1.6;
    mastered.R[i] = Math.tanh(mastered.R[i] * 1.6) / 1.6;
    peak = Math.max(peak, Math.abs(mastered.L[i]), Math.abs(mastered.R[i]));
  }
  const g = Math.pow(10, -1.5 / 20) / peak;
  for (let i = 0; i < N; i++) { mastered.L[i] *= g; mastered.R[i] *= g; }
  return { mastered, buses };
}

function wav16(bus, reps = 1) {
  const n = bus.n * reps;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  // deterministic TPDF dither — identical every repetition, so the loop stays sample-exact
  const rnd = noiseGen(12345);
  const dl = new Float32Array(bus.n), dr = new Float32Array(bus.n);
  for (let i = 0; i < bus.n; i++) { dl[i] = (rnd() + rnd()) * 0.5; dr[i] = (rnd() + rnd()) * 0.5; }
  for (let r = 0; r < reps; r++) for (let i = 0; i < bus.n; i++) {
    const o = 44 + ((r * bus.n + i) * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(bus.L[i] * 32767 + dl[i]))), o);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(bus.R[i] * 32767 + dr[i]))), o + 2);
  }
  return buf;
}

const t0 = Date.now();
const { mastered, buses } = build();
mkdirSync('out/audio/stems', { recursive: true });
// loudness normalisation: measure EBU R128 integrated loudness, then apply a linear gain
const TARGET_LUFS = -13;
writeFileSync('out/audio/_measure.wav', wav16(mastered));
const meas = execSync('ffmpeg -hide_banner -nostats -i out/audio/_measure.wav -af ebur128 -f null - 2>&1').toString();
const I = Number((meas.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
const lg = Math.pow(10, (TARGET_LUFS - I) / 20);
for (let i = 0; i < N; i++) { mastered.L[i] *= lg; mastered.R[i] *= lg; }
console.log(`loudness ${I} LUFS → ${TARGET_LUFS} LUFS (gain ${(20 * Math.log10(lg)).toFixed(2)} dB)`);
writeFileSync('out/audio/soundtrack.wav', wav16(mastered));
writeFileSync('out/audio/soundtrack_x5.wav', wav16(mastered, 5));
for (const [k, b] of Object.entries(buses)) {
  let pk = 0, ss = 0; for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(b.L[i]), Math.abs(b.R[i])); ss += b.L[i] * b.L[i] + b.R[i] * b.R[i]; }
  console.log(`stem ${k.padEnd(6)} peak ${pk.toFixed(3)}  rms ${(10 * Math.log10(ss / (2 * N) + 1e-12)).toFixed(1)} dBFS`);
}
// loop seam check: the jump across the boundary vs. the typical sample-to-sample jump
const diffs = [];
for (let i = 1; i < N; i++) diffs.push(Math.abs(mastered.L[i] - mastered.L[i - 1]));
diffs.sort((a, b) => a - b);
const seam = Math.abs(mastered.L[0] - mastered.L[N - 1]);
console.log(`seam jump ${seam.toExponential(2)} | median ${diffs[N >> 1].toExponential(2)} | p99.9 ${diffs[Math.floor(N * 0.999)].toExponential(2)}`);
unlinkSync('out/audio/_measure.wav');
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s → out/audio/soundtrack.wav`);
