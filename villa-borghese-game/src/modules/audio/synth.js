// Sound recipes for the audio module. Every effect is built at play time from oscillators,
// filtered noise and Karplus-Strong plucked strings, so there are no audio files. A Synth works
// on any BaseAudioContext: the same recipes render in an OfflineAudioContext for tests.
//
// RECIPES[name](synth, t, out, opts) schedules a sound at time t into node `out` and returns its
// length in seconds. opts.strength (0..1) scales bumps; opts.tr transposes jingles (semitones).

export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Low rate for generated buffers: plenty for soft park sounds, half the memory and CPU.
export const BUF_RATE = 24000;

// Small seeded PRNG so offline renders are repeatable.
export function prng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

// White, pink (Paul Kellet's filter) or brown noise.
export function noiseBuffer(ac, seconds, color = 'white', seed = 1) {
  const len = Math.floor(BUF_RATE * seconds);
  const buf = ac.createBuffer(1, len, BUF_RATE);
  const d = buf.getChannelData(0);
  const r = prng(seed);
  let b0 = 0, b1 = 0, b2 = 0, br = 0;
  for (let i = 0; i < len; i++) {
    const w = r() * 2 - 1;
    if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    } else if (color === 'brown') {
      br = (br + 0.02 * w) / 1.02;
      d[i] = br * 3.2;
    } else d[i] = w * 0.7;
  }
  return buf;
}

export class Synth {
  constructor(ac) {
    this.ac = ac;
    this.rand = prng(7);
    this.white = noiseBuffer(ac, 1.5, 'white', 3);
    this.ks = new Map();
    this.canPan = typeof ac.createStereoPanner === 'function';
    this.nyq = ac.sampleRate * 0.45;
    this.realtime = typeof OfflineAudioContext === 'undefined' || !(ac instanceof OfflineAudioContext);
  }

  // Disconnects a per-sound node once its sound is over (offline renders just drop the graph).
  release(node, seconds) {
    if (this.realtime) setTimeout(() => node.disconnect(), (seconds + 0.3) * 1000);
  }

  gain(out, v = 1) {
    const g = this.ac.createGain();
    g.gain.value = v;
    g.connect(out);
    return g;
  }

  panned(out, pan) {
    if (!this.canPan || !pan) return out;
    const p = this.ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    p.connect(out);
    return p;
  }

  filter(type, f, q = 1) {
    const fl = this.ac.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    return fl;
  }

  // Percussive envelope: linear attack to peak, exponential decay to silence at t + dur.
  env(out, t, peak, a, dur) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    g.connect(out);
    return g;
  }

  // Organ-style envelope: attack, hold at peak, linear release.
  envHold(out, t, peak, a, hold, r) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.linearRampToValueAtTime(0, t + a + hold + r);
    g.connect(out);
    return g;
  }

  tone(out, t, { type = 'sine', f, f2 = f, slide, dur = 0.3, a = 0.005, peak = 0.3, detune = 0 }) {
    const o = this.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + (slide ?? dur));
    if (detune) o.detune.value = detune;
    o.connect(this.env(out, t, peak, a, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  noiseSrc(t, dur, rate = 1) {
    const s = this.ac.createBufferSource();
    s.buffer = this.white;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(t, this.rand() * 1.4);
    s.stop(t + dur + 0.05);
    return s;
  }

  noise(out, t, { type = 'bandpass', f = 1000, f2 = f, q = 1, dur = 0.2, a = 0.003, peak = 0.3, slide }) {
    const fl = this.filter(type, f, q);
    fl.frequency.setValueAtTime(f, t);
    if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t + (slide ?? dur));
    this.noiseSrc(t, dur).connect(fl).connect(this.env(out, t, peak, a, dur));
  }

  // Glockenspiel-like bell: a sine plus two quieter inharmonic partials.
  bell(out, t, f, peak = 0.15, dur = 0.9) {
    this.tone(out, t, { f, dur, peak, a: 0.002 });
    if (f * 2.76 < this.nyq) this.tone(out, t, { f: f * 2.76, dur: dur * 0.4, peak: peak * 0.2, a: 0.002 });
    if (f * 5.4 < this.nyq) this.tone(out, t, { f: f * 5.4, dur: dur * 0.18, peak: peak * 0.07, a: 0.001 });
  }

  // Brass voice: two detuned saws through a lowpass that opens on the attack.
  brass(out, t, f, dur, peak = 0.12) {
    const ac = this.ac;
    const lp = this.filter('lowpass', f * 1.5, 1.2);
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(f * 6, t + 0.05);
    lp.frequency.setTargetAtTime(f * 3.2, t + 0.06, 0.12);
    const g = this.envHold(out, t, peak, 0.03, Math.max(0.01, dur - 0.1), 0.09);
    lp.connect(g);
    for (const d of [-6, 6]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
      if (dur > 0.4) {
        const lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 5.5;
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(12, t + dur);
        lfo.connect(lg).connect(o.detune);
        lfo.start(t);
        lfo.stop(t + dur + 0.05);
      }
    }
  }

  // Karplus-Strong string, generated once per note and brightness. The two-tap loss filter adds half
  // a sample of delay, and the integer delay line is tuned exactly with playbackRate.
  ksBuffer(midi, bright) {
    const key = midi * 4 + bright;
    let e = this.ks.get(key);
    if (e) return e;
    const f = mtof(midi), sr = BUF_RATE;
    const N = Math.max(2, Math.floor(sr / f - 0.5));
    const rate = f / (sr / (N + 0.5));
    const t60 = clamp(2.2 - (midi - 40) * 0.035, 0.6, 2.2) * (bright === 3 ? 0.8 : 1);
    const len = Math.floor(sr * Math.min(1.4, t60 * 0.7));
    const buf = this.ac.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const r = prng(midi * 31 + bright);
    const smooth = [0.25, 0.45, 0.7, 0.9][bright];
    let lp = 0, mean = 0;
    for (let i = 0; i < N; i++) { lp += smooth * (r() * 2 - 1 - lp); d[i] = lp; mean += lp / N; }
    for (let i = 0; i < N; i++) d[i] -= mean;
    const g = 10 ** (-3 / (t60 * (sr / (N + 0.5))));
    d[N] = g * 0.5 * d[0];
    for (let i = N + 1; i < len; i++) d[i] = g * 0.5 * (d[i - N] + d[i - N - 1]);
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    const fade = Math.floor(sr * 0.03);
    for (let i = 0; i < len; i++) d[i] = (d[i] / (peak || 1)) * 0.7 * (i > len - fade ? (len - i) / fade : 1);
    e = { buf, rate };
    this.ks.set(key, e);
    return e;
  }

  // Plucked string. bright: 0 dark bass .. 3 steel mandolin. stop: optional damping time.
  pluck(out, t, midi, { vel = 0.4, bright = 2, detune = 0, stop = 0 } = {}) {
    const { buf, rate } = this.ksBuffer(midi, bright);
    const s = this.ac.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate * 2 ** (detune / 1200);
    const g = this.ac.createGain();
    g.gain.value = vel;
    if (stop) {
      g.gain.setValueAtTime(vel, t + stop);
      g.gain.setTargetAtTime(0, t + stop, 0.015);
    }
    s.connect(g).connect(out);
    s.start(t);
    s.stop(t + (stop ? stop + 0.1 : buf.duration / s.playbackRate.value));
    return s;
  }

  // Cartoon "boing": a sine that glides up while a fading wobble shakes its pitch.
  boing(out, t, { f = 170, f2 = 360, dur = 0.5, peak = 0.25, wobble = 15 } = {}) {
    const ac = this.ac;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f2, t + dur * 0.7);
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = wobble;
    lg.gain.setValueAtTime(f * 0.6, t);
    lg.gain.exponentialRampToValueAtTime(4, t + dur);
    lfo.connect(lg).connect(o.frequency);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(peak * 0.25, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(out);
    o.connect(g);
    const o2 = ac.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(f * 2, t);
    o2.frequency.linearRampToValueAtTime(f2 * 2, t + dur * 0.7);
    lg.connect(o2.frequency);
    o2.connect(this.env(out, t, peak * 0.18, 0.006, dur * 0.6));
    for (const n of [o, o2, lfo]) { n.start(t); n.stop(t + dur + 0.05); }
  }

  // Animal voice: a buzzy source through two formant filters, with optional vibrato/tremolo.
  voice(out, t, { type = 'sawtooth', pts, dur, peak = 0.2, formants = [[1000, 3], [2400, 5]], vib = 0, vibF = 10, trem = 0, lowpass = 3500 }) {
    const ac = this.ac;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(pts[0][1], t);
    for (const [dt, f] of pts.slice(1)) o.frequency.linearRampToValueAtTime(f, t + dt);
    const lp = this.filter('lowpass', lowpass, 0.7);
    const g = this.envHold(lp, t, peak, Math.min(0.03, dur * 0.2), dur * 0.6, dur * 0.35);
    for (const [f, q] of formants) {
      const bp = this.filter('bandpass', f, q);
      o.connect(bp).connect(g);
    }
    let out2 = out;
    if (trem) {
      const tg = ac.createGain();
      tg.gain.value = 1 - trem;
      tg.connect(out);
      out2 = tg;
    }
    lp.connect(out2);
    if (vib || trem) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = vibF;
      if (vib) {
        const vg = ac.createGain();
        vg.gain.setValueAtTime(vib * 0.3, t);
        vg.gain.linearRampToValueAtTime(vib, t + dur);
        lfo.connect(vg).connect(o.frequency);
      }
      if (trem) {
        const tg2 = ac.createGain();
        tg2.gain.value = trem;
        lfo.connect(tg2).connect(out2.gain);
      }
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

// ---------------------------------------------------------------------------------------------
// Recipes

const PENTA = [0, 2, 4, 7, 9];
const pentaNote = (i, base) => base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];

function sparkle(s, t, out, { n = 12, base = 96, spread = 0.6, peak = 0.08, rise = 0.6 } = {}) {
  for (let i = 0; i < n; i++) {
    const tt = t + (i / n) * spread + s.rand() * 0.03;
    const idx = Math.min(9, Math.floor(i * rise + s.rand() * 3));
    s.bell(s.panned(out, (s.rand() * 2 - 1) * 0.7), tt, mtof(pentaNote(idx, base)), peak * (0.6 + s.rand() * 0.5), 0.35);
  }
}

function thud(s, t, out, k, stone = false) {
  s.tone(out, t, { f: 125, f2: 42, slide: 0.16, dur: 0.24, peak: 0.42 * k, a: 0.004 });
  s.noise(out, t, { type: 'lowpass', f: 420, q: 0.7, dur: 0.1, peak: 0.28 * k });
  if (stone) s.noise(out, t, { type: 'bandpass', f: 2100, q: 3, dur: 0.035, peak: 0.25 * k });
}

function rustle(s, t, out, k) {
  for (let i = 0; i < 4; i++) {
    s.noise(out, t + 0.03 + i * 0.07 + s.rand() * 0.03, { type: 'bandpass', f: 3200 + s.rand() * 1500, q: 0.8, dur: 0.16, a: 0.02, peak: 0.08 * k * (1 - i * 0.18) });
  }
}

function chirp(s, t, out, f1, f2, dur, peak) {
  s.tone(out, t, { f: f1, f2, dur, peak, a: 0.004 });
}

function shutter(s, t, out) {
  s.noise(out, t, { type: 'highpass', f: 2500, q: 0.7, dur: 0.03, a: 0.001, peak: 0.35 });
  s.noise(out, t, { type: 'bandpass', f: 1200, q: 2, dur: 0.04, a: 0.001, peak: 0.25 });
  s.noise(out, t + 0.075, { type: 'bandpass', f: 1700, q: 2.5, dur: 0.05, a: 0.002, peak: 0.28 });
  s.tone(out, t + 0.075, { type: 'triangle', f: 3100, dur: 0.03, peak: 0.04 });
  return 0.15;
}

export const RECIPES = {
  // ---- driving
  honk(s, t, out) {
    const lp = s.filter('lowpass', 1900, 0.9);
    lp.connect(out);
    [[466.16, 587.33], [523.25, 659.26]].forEach(([a, b], i) => {
      const t0 = t + i * 0.21;
      const g = s.envHold(lp, t0, 0.13, 0.012, 0.12, 0.04);
      for (const f of [a, b]) {
        const o = s.ac.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(f * 0.97, t0);
        o.frequency.linearRampToValueAtTime(f, t0 + 0.03);
        o.connect(g);
        o.start(t0);
        o.stop(t0 + 0.2);
      }
    });
    return 0.42;
  },
  boost(s, t, out) {
    s.noise(out, t, { type: 'bandpass', f: 350, f2: 3800, q: 1.6, dur: 0.75, a: 0.3, peak: 0.42 });
    s.tone(out, t, { f: 220, f2: 880, dur: 0.6, a: 0.2, peak: 0.06 });
    sparkle(s, t + 0.35, out, { n: 6, base: 96, spread: 0.3, peak: 0.05 });
    return 0.8;
  },
  boostEnd(s, t, out) {
    s.noise(out, t, { type: 'bandpass', f: 2600, f2: 450, q: 1.4, dur: 0.6, a: 0.12, peak: 0.16 });
    return 0.6;
  },

  // ---- collecting
  gelato(s, t, out, o) {
    const tr = [0, 2, 4, 5, 7, 9, 11, 12][clamp(o.combo || 0, 0, 7)];
    s.tone(out, t, { f: 600, f2: 1300, dur: 0.05, peak: 0.12 });
    [84, 88, 91, 96].forEach((m, i) => s.bell(out, t + 0.03 + i * 0.055, mtof(m + tr), 0.13, i === 3 ? 1.0 : 0.5));
    return 1.1;
  },
  coin(s, t, out) {
    s.tone(out, t, { type: 'triangle', f: mtof(83), dur: 0.09, peak: 0.2, a: 0.002 });
    s.tone(out, t + 0.075, { type: 'triangle', f: mtof(88), dur: 0.45, peak: 0.2, a: 0.002 });
    return 0.55;
  },
  pinecone(s, t, out) {
    const ac = s.ac;
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.frequency.setValueAtTime(1046.5, t);
    o.frequency.exponentialRampToValueAtTime(2093, t + 0.7);
    lfo.frequency.value = 14;
    lg.gain.value = 40;
    lfo.connect(lg).connect(o.frequency);
    o.connect(s.env(out, t, 0.045, 0.15, 0.85));
    for (const n of [o, lfo]) { n.start(t); n.stop(t + 0.9); }
    sparkle(s, t, out, { n: 14, base: 91, spread: 0.75, peak: 0.09, rise: 0.7 });
    return 1.1;
  },
  star(s, t, out) {
    [79, 83, 86, 91].forEach((m, i) => s.bell(out, t + i * 0.06, mtof(m), 0.12, 0.7));
    sparkle(s, t + 0.2, out, { n: 8, base: 98, spread: 0.4, peak: 0.06 });
    return 0.9;
  },

  // ---- bumps (opts.strength 0..1)
  boing(s, t, out, o) {
    const k = 0.45 + 0.55 * (o.strength ?? 0.6);
    s.boing(out, t, { f: 160 + s.rand() * 30, f2: 360, dur: 0.5, peak: 0.28 * k });
    return 0.5;
  },
  ball(s, t, out, o) {
    const k = 0.5 + 0.5 * (o.strength ?? 0.6);
    s.boing(out, t, { f: 300, f2: 620, dur: 0.32, peak: 0.24 * k, wobble: 22 });
    return 0.35;
  },
  plastic(s, t, out, o) {
    const k = 0.5 + 0.5 * (o.strength ?? 0.6);
    s.tone(out, t, { type: 'triangle', f: 560, f2: 250, dur: 0.14, peak: 0.24 * k });
    s.noise(out, t, { type: 'bandpass', f: 1500, q: 2, dur: 0.04, peak: 0.18 * k });
    return 0.2;
  },
  thud(s, t, out, o) { thud(s, t, out, 0.4 + 0.6 * (o.strength ?? 0.6)); return 0.25; },
  stone(s, t, out, o) { thud(s, t, out, 0.4 + 0.6 * (o.strength ?? 0.6), true); return 0.25; },
  tree(s, t, out, o) {
    const k = 0.4 + 0.6 * (o.strength ?? 0.6);
    thud(s, t, out, k);
    rustle(s, t, out, k);
    return 0.5;
  },
  hedge(s, t, out, o) {
    const k = 0.4 + 0.6 * (o.strength ?? 0.6);
    thud(s, t, out, k * 0.5);
    rustle(s, t, out, k * 1.4);
    return 0.5;
  },
  knock(s, t, out, o) {
    const k = 0.45 + 0.55 * (o.strength ?? 0.6);
    for (const [dt, v] of [[0, 1], [0.09, 0.7]]) {
      s.tone(out, t + dt, { f: 640, f2: 470, dur: 0.08, peak: 0.3 * k * v, a: 0.001 });
      s.noise(out, t + dt, { type: 'bandpass', f: 1100, q: 6, dur: 0.05, a: 0.001, peak: 0.5 * k * v });
    }
    return 0.2;
  },
  clank(s, t, out, o) {
    const k = 0.45 + 0.55 * (o.strength ?? 0.6);
    [[523, 0.1, 0.7], [1307, 0.06, 0.45], [2210, 0.045, 0.3], [3420, 0.03, 0.15]].forEach(([f, p, d]) => s.tone(out, t, { f, dur: d, peak: p * k, a: 0.001 }));
    s.noise(out, t, { type: 'highpass', f: 3000, q: 0.7, dur: 0.02, a: 0.001, peak: 0.12 * k });
    return 0.7;
  },
  splash(s, t, out, o) {
    const k = 0.6 + 0.4 * (o.strength ?? 0.8);
    s.noise(out, t, { type: 'bandpass', f: 2600, f2: 520, q: 0.9, dur: 0.6, a: 0.01, peak: 0.34 * k });
    s.noise(out, t, { type: 'lowpass', f: 900, q: 0.7, dur: 0.25, a: 0.005, peak: 0.2 * k });
    for (let i = 0; i < 6; i++) {
      const f = 500 + s.rand() * 500;
      s.tone(out, t + 0.07 + s.rand() * 0.45, { f, f2: f * 2.3, dur: 0.06, peak: 0.07 * k, a: 0.002 });
    }
    return 0.65;
  },

  // ---- animals
  pigeon(s, t, out) {
    const flapsOut = s.filter('bandpass', 950, 0.6);
    flapsOut.connect(out);
    for (let b = 0; b < 2; b++) {
      const src = s.noiseSrc(t, 1.1, 0.9 + b * 0.2);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0, t);
      let tt = t + b * 0.045;
      for (let i = 0; i < 11; i++) {
        const v = 0.5 * (1 - i / 13) * (b ? 0.7 : 1);
        g.gain.setValueAtTime(0, tt);
        g.gain.linearRampToValueAtTime(v, tt + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, tt + 0.05);
        tt += 0.068 + i * 0.005;
      }
      src.connect(g).connect(flapsOut);
    }
    if (s.rand() < 0.4) {
      s.voice(out, t + 0.9, { type: 'sine', pts: [[0, 330], [0.15, 380], [0.45, 300]], dur: 0.5, peak: 0.12, formants: [[400, 1]], lowpass: 900 });
      return 1.4;
    }
    return 1.0;
  },
  duck(s, t, out) {
    const n = s.rand() < 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const f = 250 - i * 18;
      s.voice(out, t + i * 0.24, { pts: [[0, f], [0.05, f * 1.05], [0.17, f * 0.75]], dur: 0.18, peak: 0.3, formants: [[1050, 3], [2300, 5], [700, 4]] });
    }
    return 0.5;
  },
  goose(s, t, out) {
    s.voice(out, t, { pts: [[0, 330], [0.08, 360], [0.3, 290]], dur: 0.32, peak: 0.3, formants: [[820, 3], [1900, 4]] });
    return 0.4;
  },
  horse(s, t, out) {
    s.voice(out, t, {
      pts: [[0, 480], [0.09, 1000], [0.55, 640], [1.05, 380]], dur: 1.1, peak: 0.22,
      formants: [[1150, 1.6], [2500, 3]], vib: 70, vibF: 11, trem: 0.45, lowpass: 3200,
    });
    s.noise(out, t, { type: 'highpass', f: 1800, q: 0.6, dur: 1.0, a: 0.05, peak: 0.03 });
    s.noise(out, t + 1.2, { type: 'lowpass', f: 650, q: 1, dur: 0.22, a: 0.01, peak: 0.25 });
    return 1.45;
  },
  dog(s, t, out) {
    for (const dt of [0, 0.22]) {
      s.voice(out, t + dt, { pts: [[0, 420], [0.04, 460], [0.12, 260]], dur: 0.12, peak: 0.2, formants: [[900, 1.2], [1800, 2]] });
      s.noise(out, t + dt, { type: 'bandpass', f: 1200, q: 1, dur: 0.08, peak: 0.06 });
    }
    return 0.4;
  },
  elephant(s, t, out) {
    s.voice(out, t, { pts: [[0, 420], [0.15, 640], [0.8, 560]], dur: 0.9, peak: 0.2, formants: [[1300, 1.5], [620, 2]], vib: 25, vibF: 7 });
    return 1.0;
  },
  lion(s, t, out) {
    s.voice(out, t, { pts: [[0, 80], [0.25, 105], [0.8, 70]], dur: 0.85, peak: 0.26, formants: [[420, 1.2], [900, 2]], trem: 0.5, vibF: 24, lowpass: 900 });
    s.noise(out, t, { type: 'lowpass', f: 500, f2: 260, q: 1, dur: 0.8, a: 0.15, peak: 0.12 });
    return 0.9;
  },
  monkey(s, t, out) {
    [[0, 520, 820], [0.2, 540, 860], [0.42, 700, 1250], [0.66, 720, 1300]].forEach(([dt, a, b]) =>
      s.voice(out, t + dt, { type: 'triangle', pts: [[0, a], [0.12, b]], dur: 0.16, peak: 0.25, formants: [[1100, 1.5], [2400, 3]] }));
    return 0.85;
  },
  // Little birds for ambience (also used for unknown animals).
  bird(s, t, out) {
    const n = 3 + Math.floor(s.rand() * 4), f = 3600 + s.rand() * 1400;
    for (let i = 0; i < n; i++) chirp(s, t + i * (0.09 + s.rand() * 0.03), out, f, f * 0.65, 0.05, 0.08);
    return n * 0.11;
  },
  warble(s, t, out) {
    const ac = s.ac;
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain();
    const f = 2600 + s.rand() * 900, d = 0.5 + s.rand() * 0.4;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (0.85 + s.rand() * 0.35), t + d);
    lfo.frequency.value = 22 + s.rand() * 14;
    lg.gain.value = 500;
    lfo.connect(lg).connect(o.frequency);
    o.connect(s.envHold(out, t, 0.055, 0.05, d - 0.12, 0.07));
    for (const n of [o, lfo]) { n.start(t); n.stop(t + d + 0.05); }
    return d;
  },
  whistle(s, t, out) {
    const hi = 4100 + s.rand() * 400, lo = hi * 0.74;
    for (let i = 0; i < 3; i++) {
      chirp(s, t + i * 0.3, out, hi, hi * 0.97, 0.09, 0.07);
      chirp(s, t + i * 0.3 + 0.12, out, lo, lo * 0.95, 0.12, 0.06);
    }
    return 0.9;
  },
  blackbird(s, t, out) {
    const notes = [0, 3, 5, 3, 7, 10].map((n) => 1700 * 2 ** (n / 12));
    for (let i = 0; i < 4 + Math.floor(s.rand() * 3); i++) {
      const f = notes[Math.floor(s.rand() * notes.length)];
      s.tone(out, t + i * 0.16, { f, f2: f * (s.rand() < 0.5 ? 1.15 : 0.88), dur: 0.13, peak: 0.065, a: 0.015 });
    }
    return 1.0;
  },
  // Villa Borghese is famous for its wild green parakeets.
  parakeet(s, t, out) {
    for (let i = 0; i < 3; i++) {
      s.voice(out, t + i * 0.2, { pts: [[0, 2500], [0.03, 2900], [0.12, 2300]], dur: 0.12, peak: 0.06, formants: [[3000, 2], [4200, 3]], vib: 350, vibF: 90, lowpass: 6000 });
    }
    return 0.6;
  },
  coo(s, t, out) {
    s.voice(out, t, { type: 'sine', pts: [[0, 330], [0.15, 380], [0.45, 300]], dur: 0.5, peak: 0.12, formants: [[400, 1]], lowpass: 900 });
    return 0.5;
  },

  // ---- tour moments (queued one after another, music ducks underneath)
  stopReached(s, t, out, o) {
    shutter(s, t, out);
    RECIPES.jingle(s, t + 0.28, out, o);
    return 1.9;
  },
  shutter(s, t, out) { return shutter(s, t, out); },
  // "We're here!": a bright two-note chime as the cart reaches a stop.
  arrive(s, t, out) {
    s.bell(out, t, mtof(86), 0.12, 0.5);
    s.bell(out, t + 0.12, mtof(93), 0.13, 0.9);
    sparkle(s, t + 0.1, out, { n: 5, base: 98, spread: 0.3, peak: 0.04 });
    return 0.9;
  },
  // Photo countdown beep; opts.n = 3, 2, 1 rises in pitch.
  tick(s, t, out, o) {
    const m = 81 + (3 - clamp(o.n ?? 3, 1, 3)) * 2;
    s.tone(out, t, { type: 'triangle', f: mtof(m), dur: 0.12, peak: 0.16, a: 0.003 });
    s.tone(out, t, { f: mtof(m + 12), dur: 0.06, peak: 0.04, a: 0.002 });
    return 0.14;
  },
  jingle(s, t, out, o) {
    const tr = o.tr || 0;
    const mel = [[74, 0], [78, 0.1], [81, 0.2], [86, 0.3], [83, 0.52], [85, 0.62], [86, 0.74]];
    for (const [m, dt] of mel) {
      s.bell(out, t + dt, mtof(m + tr), 0.11, dt > 0.7 ? 1.1 : 0.45);
      s.pluck(out, t + dt, m + tr - 12, { vel: 0.3, bright: 3 });
    }
    [62, 66, 69, 74].forEach((m, i) => s.pluck(out, t + 0.74 + i * 0.018, m + tr, { vel: 0.22, bright: 2 }));
    s.tone(out, t + 0.74, { type: 'triangle', f: mtof(50 + tr), dur: 0.7, peak: 0.25 });
    sparkle(s, t + 0.8, out, { n: 6, base: 98 + tr, spread: 0.35, peak: 0.045 });
    return 1.6;
  },
  medal(s, t, out, o) {
    const gold = o.id === 'gold', silver = o.id === 'silver';
    const phrase = [[67, 0, 0.12], [67, 0.14, 0.12], [67, 0.28, 0.12], [72, 0.42, 0.6]];
    if (silver || gold) phrase.push([76, 1.06, 0.14], [79, 1.22, gold ? 0.8 : 0.55]);
    const end = phrase[phrase.length - 1][1];
    for (const [m, dt, d] of phrase) {
      s.brass(out, t + dt, mtof(m), d, 0.075);
      s.brass(out, t + dt, mtof(m - (m === 67 ? 3 : 5)), d, 0.05);
    }
    s.tone(out, t + end, { type: 'triangle', f: mtof(48), dur: 0.9, peak: 0.28 });
    s.tone(out, t + end, { f: 98, f2: 88, dur: 0.6, peak: 0.25 });
    s.noise(out, t + end, { type: 'highpass', f: 6500, q: 0.7, dur: 1.2, a: 0.004, peak: 0.05 });
    sparkle(s, t + end + 0.1, out, { n: gold ? 12 : 7, base: 96, spread: 0.6, peak: 0.05 });
    return end + 1.0;
  },
  tourComplete(s, t, out) {
    for (let i = 0; i < 10; i++) s.tone(out, t + i * 0.055, { f: 98, f2: 86, dur: 0.12, peak: 0.07 + i * 0.022 });
    const ph = [[67, 0.65, 0.16], [72, 0.83, 0.16], [76, 1.01, 0.16], [79, 1.19, 0.5], [76, 1.75, 0.16], [79, 1.93, 0.16], [84, 2.11, 1.35]];
    for (const [m, dt, d] of ph) {
      s.brass(out, t + dt, mtof(m), d, 0.07);
      s.brass(out, t + dt, mtof(m - 12), d, 0.045);
    }
    const tc = t + 2.11;
    [72, 76, 79].forEach((m) => s.brass(out, tc, mtof(m), 1.35, 0.035));
    s.tone(out, tc, { f: 98, f2: 82, dur: 1.0, peak: 0.32 });
    s.tone(out, tc, { type: 'triangle', f: mtof(36), dur: 1.4, peak: 0.25 });
    s.noise(out, tc, { type: 'highpass', f: 5200, q: 0.5, dur: 1.8, a: 0.004, peak: 0.13 });
    s.noise(out, tc, { type: 'bandpass', f: 3200, q: 0.6, dur: 0.6, a: 0.004, peak: 0.09 });
    for (let i = 0; i < 14; i++) s.bell(out, tc + 0.15 + i * 0.05, mtof(pentaNote(i, 84)), 0.07, 0.6);
    return 3.6;
  },

  // ---- UI
  tap(s, t, out) {
    s.tone(out, t, { f: 1100, f2: 700, dur: 0.06, peak: 0.16, a: 0.002 });
    s.tone(out, t, { type: 'triangle', f: 2200, dur: 0.02, peak: 0.03, a: 0.001 });
    return 0.08;
  },
  pop(s, t, out) {
    s.tone(out, t, { f: 380, f2: 1150, slide: 0.07, dur: 0.11, peak: 0.2, a: 0.003 });
    return 0.12;
  },
  select(s, t, out) {
    s.bell(out, t, mtof(88), 0.1, 0.35);
    s.bell(out, t + 0.07, mtof(93), 0.1, 0.5);
    return 0.55;
  },
};

// Bump collider tag -> recipe.
export function bumpRecipe(tag = '') {
  const k = String(tag).toLowerCase();
  if (/person|people|jogger|walker|runner|kid|child|family|tourist|bike|cycl|skater|cart|risci|rickshaw|actor|npc|animal|pigeon|duck|goose|swan|horse|pony|dog|cat|deer|squirrel/.test(k)) return 'boing';
  if (/ball|balloon/.test(k)) return 'ball';
  if (/cone|bollard|toy|plastic/.test(k)) return 'plastic';
  if (/fence|gate|bench|wood|kiosk|stall|hut|crate|barrel|table|chair|boat|sign/.test(k)) return 'knock';
  if (/lamp|pole|post|bin|rail|iron|metal|nasone|clock/.test(k)) return 'clank';
  if (/tree|trunk|pine|oak|plane|cedar|cypress|palm/.test(k)) return 'tree';
  if (/hedge|bush|shrub|flower/.test(k)) return 'hedge';
  if (/water|lake|pond|puddle/.test(k)) return 'splash';
  if (/statue|bust|obelisk|column|fountain|stone|rock|marble|temple|stair|step|balustrade|building|wall/.test(k)) return 'stone';
  return 'thud';
}

// Animal event kind -> recipe.
export function animalRecipe(kind = '') {
  const k = String(kind).toLowerCase();
  for (const name of ['pigeon', 'duck', 'goose', 'horse', 'dog', 'elephant', 'lion', 'monkey', 'parakeet', 'coo']) if (k.includes(name)) return name;
  if (/dove/.test(k)) return 'pigeon';
  if (/swan/.test(k)) return 'goose';
  if (/pony/.test(k)) return 'horse';
  if (/parrot/.test(k)) return 'parakeet';
  if (/blackbird|robin/.test(k)) return 'blackbird';
  return 'bird';
}
