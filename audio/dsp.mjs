// Small DSP toolkit for the procedural soundtrack. Everything renders into circular stereo
// buffers (length = one loop) so tails wrap around and the loop is sample-exact.
export const SR = 48000;
export const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Bus {
  constructor(n) { this.n = n; this.L = new Float32Array(n); this.R = new Float32Array(n); }
  /** Add a mono sample at absolute index i with equal-power pan p ∈ [-1, 1]. */
  add(i, v, pan = 0) {
    const j = ((i % this.n) + this.n) % this.n;
    const a = ((pan + 1) * Math.PI) / 4;
    this.L[j] += v * Math.cos(a);
    this.R[j] += v * Math.sin(a);
  }
  addStereo(i, l, r) { const j = ((i % this.n) + this.n) % this.n; this.L[j] += l; this.R[j] += r; }
  mixInto(dst, gain = 1) { for (let i = 0; i < this.n; i++) { dst.L[i] += this.L[i] * gain; dst.R[i] += this.R[i] * gain; } }
}

// ---------------------------------------------------------------- noise (deterministic)
export function noiseGen(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; };
}

// ---------------------------------------------------------------- band-limited oscillators (polyBLEP)
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
export class Osc {
  constructor(phase = 0) { this.ph = phase; }
  saw(f) { const dt = f / SR; let v = 2 * this.ph - 1; v -= blep(this.ph, dt); this.ph += dt; if (this.ph >= 1) this.ph -= 1; return v; }
  square(f, pw = 0.5) {
    const dt = f / SR;
    let v = this.ph < pw ? 1 : -1;
    v += blep(this.ph, dt);
    v -= blep((this.ph + 1 - pw) % 1, dt);
    this.ph += dt; if (this.ph >= 1) this.ph -= 1;
    return v;
  }
  sine(f) { const v = Math.sin(2 * Math.PI * this.ph); this.ph += f / SR; if (this.ph >= 1) this.ph -= 1; return v; }
  tri(f) { const v = 1 - 4 * Math.abs(this.ph - 0.5); this.ph += f / SR; if (this.ph >= 1) this.ph -= 1; return v; }
}

// ---------------------------------------------------------------- biquad (RBJ cookbook), TDF-II
export class Biquad {
  constructor() { this.z1 = 0; this.z2 = 0; this.set('lp', 1000, 0.707); }
  set(type, f, q = 0.707, gainDb = 0) {
    f = Math.min(Math.max(f, 10), SR * 0.45);
    const w = (2 * Math.PI * f) / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    const A = Math.pow(10, gainDb / 40);
    switch (type) {
      case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'peak': b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; break;
      default: throw new Error(type);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

// ---------------------------------------------------------------- envelopes
export const adsr = (t, dur, a, d, s, r) => {
  if (t < 0) return 0;
  let v = t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : s;
  if (t > dur) v *= Math.max(0, 1 - (t - dur) / r);
  return v;
};

// ---------------------------------------------------------------- effects (steady-state on a loop)
/** Run a stateful stereo effect over the loop 3× and keep the last pass, so tails wrap seamlessly. */
export function loopEffect(bus, makeFx) {
  const fx = makeFx();
  const out = new Bus(bus.n);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bus.n; i++) {
      const [l, r] = fx(bus.L[i], bus.R[i]);
      if (pass === 2) { out.L[i] = l; out.R[i] = r; }
    }
  }
  return out;
}

/** Freeverb-style reverb (wet only). */
export function reverb({ room = 0.84, damp = 0.35, width = 1 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((v) => Math.round((v * SR) / 44100));
  const apT = [556, 441, 341, 225].map((v) => Math.round((v * SR) / 44100));
  const mk = (spread) => ({
    combs: combT.map((n) => ({ buf: new Float32Array(n + spread), i: 0, f: 0 })),
    aps: apT.map((n) => ({ buf: new Float32Array(n + spread), i: 0 })),
  });
  const ch = [mk(0), mk(23)];
  const proc = (c, x) => {
    let y = 0;
    for (const cb of c.combs) {
      const o = cb.buf[cb.i];
      cb.f = o * (1 - damp) + cb.f * damp;
      cb.buf[cb.i] = x + cb.f * room;
      cb.i = (cb.i + 1) % cb.buf.length;
      y += o;
    }
    for (const ap of c.aps) {
      const o = ap.buf[ap.i];
      ap.buf[ap.i] = y + o * 0.5;
      ap.i = (ap.i + 1) % ap.buf.length;
      y = o - y;
    }
    return y;
  };
  return (l, r) => {
    const x = (l + r) * 0.015;
    const a = proc(ch[0], x), b = proc(ch[1], x);
    const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
    return [a * w1 + b * w2, b * w1 + a * w2];
  };
}

/** Ping-pong delay (wet only). */
export function pingPong(timeSec, feedback = 0.35, tone = 3500) {
  const n = Math.round(timeSec * SR);
  const bl = new Float32Array(n), br = new Float32Array(n);
  let i = 0;
  const lpL = new Biquad().set('lp', tone), lpR = new Biquad().set('lp', tone);
  return (l, r) => {
    const ol = bl[i], or = br[i];
    bl[i] = lpL.run((l + r) * 0.5 + or * feedback);
    br[i] = lpR.run(ol * feedback);
    i = (i + 1) % n;
    return [ol, or];
  };
}
