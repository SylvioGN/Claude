// Continuous sounds: the electric cart (motor whine + tyres on gravel/grass/stone) and the park
// ambience (leaves in the wind, birds, splashing fountains). Parameters glide with setTargetAtTime.
import { BUF_RATE, RECIPES, noiseBuffer, prng } from './synth.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// Gravel: a bed of grit plus thousands of tiny stone clicks.
function gravelBuffer(ac, seconds = 2.4) {
  const len = Math.floor(BUF_RATE * seconds), buf = ac.createBuffer(1, len, BUF_RATE), d = buf.getChannelData(0);
  const r = prng(11);
  for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * 0.08;
  const grains = Math.floor(seconds * 260);
  for (let g = 0; g < grains; g++) {
    const at = Math.floor(r() * len), amp = 0.15 + r() ** 2 * 0.75, tau = BUF_RATE * (0.0006 + r() * 0.0025);
    const n = Math.min(len - at, Math.floor(tau * 5));
    for (let i = 0; i < n; i++) d[at + i] += (r() * 2 - 1) * amp * Math.exp(-i / tau);
  }
  return buf;
}

// Fountain: rushing water plus bubbling droplets that chirp upwards.
function waterBuffer(ac, seconds = 3) {
  const len = Math.floor(BUF_RATE * seconds), buf = ac.createBuffer(1, len, BUF_RATE), d = buf.getChannelData(0);
  const r = prng(23);
  let lp = 0;
  for (let i = 0; i < len; i++) { lp += 0.5 * (r() * 2 - 1 - lp); d[i] = lp * 0.35; }
  const drops = Math.floor(seconds * 140);
  for (let k = 0; k < drops; k++) {
    const at = Math.floor(r() * len), f0 = 500 + r() * 1300, n = Math.min(len - at, Math.floor(BUF_RATE * (0.012 + r() * 0.02)));
    const amp = 0.05 + r() * 0.2;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const f = f0 * (1 + (i / n) * 1.2);
      ph += (2 * Math.PI * f) / BUF_RATE;
      d[at + i] += Math.sin(ph) * amp * Math.sin((Math.PI * i) / n);
    }
  }
  // seamless loop: crossfade the tail into the head
  const xf = Math.floor(BUF_RATE * 0.1);
  for (let i = 0; i < xf; i++) { const a = i / xf; d[i] = d[i] * a + d[len - xf + i] * (1 - a); }
  return buf;
}

function loopSource(ac, buffer, dest, offset = 0) {
  const s = ac.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.connect(dest);
  s.start(ac.currentTime, offset);
  return s;
}

// Gain mix of the three tyre layers for each surface: [crunch, swish, roll, crunch filter Hz]
const SURFACE_MIX = {
  path: [1, 0.12, 0.45, 2000],
  plaza: [0.2, 0, 1, 2600],
  grass: [0.08, 1, 0.3, 1500],
  forest: [0.25, 1, 0.3, 1400],
  sand: [0.7, 0.35, 0.3, 1100],
  water: [0, 0.6, 0.2, 1300],
  outside: [0.2, 0, 1, 2400],
};

export class CartSound {
  constructor(ac, out) {
    this.ac = ac;
    // motor: a soft whine and hum whose pitch follows the speed, loudest while speeding up
    this.motor = ac.createGain();
    this.motor.gain.value = 0;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    lp.connect(this.motor).connect(out);
    const wow = ac.createOscillator(), wowGain = ac.createGain();
    wow.frequency.value = 5.3;
    wowGain.gain.value = 7;
    wow.connect(wowGain);
    wow.start();
    this.oscs = [['sine', 1, 0.55], ['triangle', 0.5, 0.5], ['sine', 2.01, 0.1]].map(([type, mul, v]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = 110 * mul;
      wowGain.connect(o.detune);
      const g = ac.createGain();
      g.gain.value = v;
      o.connect(g).connect(lp);
      o.start();
      return { o, mul };
    });
    // tyres: gravel crunch, grass swish and a low rolling rumble, mixed per surface
    const tyreLp = ac.createBiquadFilter();
    tyreLp.type = 'lowpass';
    tyreLp.frequency.value = 3800;
    tyreLp.connect(out);
    this.tyres = ac.createGain();
    this.tyres.gain.value = 0;
    this.tyres.connect(tyreLp);
    this.crunchF = ac.createBiquadFilter();
    this.crunchF.type = 'bandpass';
    this.crunchF.frequency.value = 2000;
    this.crunchF.Q.value = 0.8;
    this.crunch = ac.createGain();
    this.crunchF.connect(this.crunch).connect(this.tyres);
    this.crunchSrc = loopSource(ac, gravelBuffer(ac), this.crunchF);
    const swishF = ac.createBiquadFilter();
    swishF.type = 'lowpass';
    swishF.frequency.value = 1100;
    this.swish = ac.createGain();
    swishF.connect(this.swish).connect(this.tyres);
    this.swishSrc = loopSource(ac, noiseBuffer(ac, 2.2, 'pink', 5), swishF);
    const rollF = ac.createBiquadFilter();
    rollF.type = 'lowpass';
    rollF.frequency.value = 380;
    this.roll = ac.createGain();
    rollF.connect(this.roll).connect(this.tyres);
    loopSource(ac, noiseBuffer(ac, 2.6, 'brown', 9), rollF);
    this.timer = 0;
    this.lastSpeed = 0;
    this.accel = 0;
    this.set(0, {}, true);
  }

  // speed: |units/s|; o: {throttle 0..1, surface name, boost, accel units/s²}; immediate: no glide
  set(speed, { throttle = 0, surface = 'path', boost = false, accel = 0 } = {}, immediate = false) {
    const now = this.ac.currentTime, tc = immediate ? 0.001 : 0.07;
    const s = clamp(speed / 13, 0, 1.5);
    const f = (110 + 400 * s) * (boost ? 1.18 : 1);
    for (const { o, mul } of this.oscs) o.frequency.setTargetAtTime(f * mul, now, tc);
    const moving = smooth01((speed - 0.15) / 2.2);
    const push = clamp(accel / 5, 0, 1) * (0.5 + 0.5 * throttle);
    this.motor.gain.setTargetAtTime(moving * (0.008 + 0.012 * clamp(s, 0, 1) + 0.035 * push) * (boost ? 1.4 : 1), now, tc * 1.5);
    const mix = SURFACE_MIX[surface] || SURFACE_MIX.path;
    this.crunch.gain.setTargetAtTime(mix[0], now, 0.12);
    this.swish.gain.setTargetAtTime(mix[1], now, 0.12);
    this.roll.gain.setTargetAtTime(mix[2], now, 0.12);
    this.crunchF.frequency.setTargetAtTime(mix[3], now, 0.12);
    this.tyres.gain.setTargetAtTime(moving * (0.035 + 0.075 * clamp(s, 0, 1.2)), now, tc);
    this.crunchSrc.playbackRate.setTargetAtTime(0.55 + 0.6 * clamp(s, 0, 1.3), now, tc);
    this.swishSrc.playbackRate.setTargetAtTime(0.7 + 0.4 * s, now, tc);
  }

  update(dt, speed, o) {
    this.accel += ((speed - this.lastSpeed) / Math.max(dt, 1e-3) - this.accel) * Math.min(1, dt * 6);
    this.lastSpeed = speed;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.05;
    o.accel = this.accel;
    this.set(speed, o);
  }
}

const BIRDS = [['bird', 5], ['warble', 3], ['whistle', 2], ['blackbird', 2], ['parakeet', 1]];
const BIRD_TOTAL = BIRDS.reduce((a, b) => a + b[1], 0);

export class Ambience {
  // fountains: [{x, z, r, w}] (w = loudness weight)
  constructor(ac, synth, out, fountains) {
    this.ac = ac;
    this.s = synth;
    this.out = out;
    this.fountains = fountains;
    // wind in the leaves
    const windF = ac.createBiquadFilter();
    windF.type = 'bandpass';
    windF.frequency.value = 1000;
    windF.Q.value = 0.5;
    this.wind = ac.createGain();
    this.wind.gain.value = 0;
    windF.connect(this.wind).connect(out);
    loopSource(ac, noiseBuffer(ac, 3.1, 'pink', 13), windF, 1.3);
    // nearest fountain
    const wf = ac.createBiquadFilter();
    wf.type = 'highpass';
    wf.frequency.value = 350;
    this.water = ac.createGain();
    this.water.gain.value = 0;
    this.waterPan = synth.canPan ? ac.createStereoPanner() : null;
    wf.connect(this.water);
    if (this.waterPan) this.water.connect(this.waterPan).connect(out);
    else this.water.connect(out);
    loopSource(ac, waterBuffer(ac), wf);
    this.birdIn = 1.5;
    this.t = 0;
    this.timer = 0;
  }

  // listener: {x, z, rx, rz} cart position and camera right vector; busy: too many voices playing
  update(dt, listener, active, busy) {
    const ac = this.ac, now = ac.currentTime;
    this.t += dt;
    this.birdIn -= dt;
    if (this.birdIn <= 0) {
      const r = this.s.rand;
      this.birdIn = 0.9 + r() * 2.8;
      if (active && !busy) {
        let pick = r() * BIRD_TOTAL, name = 'bird';
        for (const [n, w] of BIRDS) { if ((pick -= w) < 0) { name = n; break; } }
        const g = this.s.gain(this.out, 0.7 + r() * 0.6);
        this.s.release(g, RECIPES[name](this.s, now + 0.02, this.s.panned(g, (r() * 2 - 1) * 0.85), {}));
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.1;
    const gust = 0.5 + 0.3 * Math.sin(this.t * 0.37) + 0.2 * Math.sin(this.t * 0.11 + 1.7);
    this.wind.gain.setTargetAtTime(active ? 0.02 + 0.025 * gust : 0, now, 0.4);
    let best = 0, pan = 0;
    if (listener) {
      for (const f of this.fountains) {
        const dx = f.x - listener.x, dz = f.z - listener.z;
        const d = Math.max(0, Math.hypot(dx, dz) - f.r);
        if (d > 35) continue;
        const v = (1 - d / 35) ** 2 * f.w;
        if (v > best) { best = v; pan = d > 1 ? clamp((dx * listener.rx + dz * listener.rz) / (d + f.r), -1, 1) * 0.7 : 0; }
      }
    }
    this.water.gain.setTargetAtTime(active ? best * 0.26 : 0, now, 0.25);
    if (this.waterPan) this.waterPan.pan.setTargetAtTime(pan, now, 0.25);
  }
}
