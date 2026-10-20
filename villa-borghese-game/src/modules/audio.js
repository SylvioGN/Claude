// All sound, synthesized with the Web Audio API (no audio files): the electric cart's whine and
// tyre crunch, effects for game events, a light tarantella loop and the park ambience (wind,
// birds, fountains). Recipes live in audio/synth.js, the song in audio/music.js, loops in
// audio/loops.js.
//
// The AudioContext is created on the first user gesture (browsers block sound before that) and
// suspended while the page is hidden or both sound and music are off. Nothing here throws when
// Web Audio is missing: every call becomes a no-op.
//
// API (ctx.modules.audio):
//   play(name, opts)  one-shot sound; returns its length in seconds (0 when silent). Names: every key
//                     of RECIPES in synth.js, e.g. 'tap' | 'pop' | 'select' for UI buttons, 'tick'
//                     ({n: 3|2|1}) and 'shutter' for the photo countdown, 'honk', 'gelato', 'boing'.
//                     opts: {x, z} position in the park (distance + stereo), volume, strength 0..1
//   setSound(on), setMusic(on), unlock(), info() -> {state, voices, sound, music, ...}
//   renderOffline(names, {seconds, raw}) -> Promise<{name: {peak, rms, ...}}> silent test render
import { SURF_NAME } from '../core/terrain.js';
import { Synth, RECIPES, bumpRecipe, animalRecipe } from './audio/synth.js';
import { Music, songNotes } from './audio/music.js';
import { CartSound, Ambience } from './audio/loops.js';

const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
const LEVEL = { master: 0.8, sfx: 0.75, music: 0.3 };
// Sounds that queue one after another and duck the music.
const JINGLES = new Set(['stopReached', 'jingle', 'medal', 'tourComplete']);
// Sounds that also go through the echo, for a bit of open-air space.
const ECHO = new Set(['stopReached', 'jingle', 'medal', 'tourComplete', 'arrive', 'gelato', 'coin', 'star', 'pinecone', 'select', 'horse']);
// Sounds that always play, even when many others are ringing.
const ALWAYS = new Set([...JINGLES, 'tap', 'tick', 'shutter', 'arrive', 'honk']);
const MAX_VOICES = 24;

// Master chain shared by the live context and offline test renders.
function buildChain(ac) {
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 10;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const master = ac.createGain();
  master.gain.value = LEVEL.master;
  master.connect(comp).connect(ac.destination);
  const bus = (v) => { const g = ac.createGain(); g.gain.value = v; g.connect(master); return g; };
  const sfx = bus(LEVEL.sfx);
  const duck = bus(1);
  const music = ac.createGain();
  music.gain.value = LEVEL.music;
  music.connect(duck);
  // Two damped feedback delays panned left and right: a cheap stand-in for reverb.
  const echo = ac.createGain();
  echo.gain.value = 0.2;
  for (const [time, pan] of [[0.137, -0.6], [0.211, 0.6]]) {
    const d = ac.createDelay(1), lp = ac.createBiquadFilter(), fb = ac.createGain();
    d.delayTime.value = time;
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    fb.gain.value = 0.3;
    echo.connect(d).connect(lp).connect(fb).connect(d);
    if (ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      lp.connect(p).connect(master);
    } else lp.connect(master);
  }
  duck.connect(echo);
  return { master, sfx, duck, music, echo };
}

function fountainList(MAP) {
  const out = [];
  for (const w of MAP.WATER || []) {
    if (w.k !== 'fountain') continue;
    let x = 0, z = 0;
    for (const p of w.r) { x += p[0] / w.r.length; z += p[1] / w.r.length; }
    let r = 0;
    for (const p of w.r) r = Math.max(r, Math.hypot(p[0] - x, p[1] - z));
    out.push({ x, z, r, w: Math.min(1.3, 0.55 + r / 8) });
  }
  for (const p of MAP.POIS || []) if (p.k === 'fountain') out.push({ x: p.x, z: p.z, r: 1, w: 0.45 });
  return out;
}

export async function create(ctx) {
  const game = ctx.game;
  const settings = () => game?.settings || { sound: true, music: true };
  let soundOn = settings().sound !== false, musicOn = settings().music !== false;
  let ac = null, chain = null, synth = null, music = null, cartSound = null, ambience = null;
  let voices = 0, busyUntil = 0, unlockedOnce = false;
  let surface = null, surfaceAt = -1;
  let gelatoCombo = 0, lastGelato = -9;
  // With a UI the photo has a countdown: chime on arrival, jingle (and medal) after its shutter.
  let pendingJingle = null;
  const lastBump = new Map();
  const listener = { x: 0, z: 0, rx: 1, rz: 0 };

  function wantRunning() { return soundOn || musicOn; }

  function applyLevels(immediate = false) {
    if (!ac) return;
    const now = ac.currentTime, tc = immediate ? 0.001 : 0.15;
    chain.sfx.gain.setTargetAtTime(soundOn ? LEVEL.sfx : 0, now, tc);
    chain.music.gain.setTargetAtTime(musicOn ? LEVEL.music : 0, now, tc);
    if (musicOn && !music.playing) music.start(now + 0.15);
    if (!musicOn && music.playing) music.stop();
    if (!wantRunning() && ac.state === 'running') ac.suspend().catch(() => {});
  }

  function build() {
    ac = new AC({ latencyHint: 'interactive' });
    chain = buildChain(ac);
    synth = new Synth(ac);
    music = new Music(synth, chain.music, ctx.quality?.tier === 'low');
    applyLevels(true);
    // The heavier buffers (plucked strings, gravel, water) are made just after the tap.
    setTimeout(() => {
      try {
        for (const [m, b] of songNotes()) synth.ksBuffer(m, b);
        cartSound = new CartSound(ac, chain.sfx);
        ambience = new Ambience(ac, synth, chain.sfx, fountainList(ctx.MAP));
      } catch (err) { console.warn('[audio] loops unavailable', err); }
    }, 30);
  }

  // Must run inside a user gesture handler (iOS and Chrome only allow sound to start there).
  function unlock() {
    if (!AC) return false;
    try {
      if (!ac) build();
      if (wantRunning() && ac.state !== 'running') ac.resume().catch(() => {});
      if (!unlockedOnce) {
        // older iOS needs a sound started inside the gesture
        const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource();
        src.buffer = b;
        src.connect(ac.destination);
        src.start(0);
        unlockedOnce = true;
      }
      return true;
    } catch (err) {
      console.warn('[audio] unavailable', err);
      return false;
    }
  }
  const gesture = () => { if (!ac || ac.state !== 'running') unlock(); };
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'keydown', 'click']) {
    addEventListener(ev, gesture, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (wantRunning()) ac.resume().catch(() => {});
  });

  // Distance attenuation and stereo position relative to the cart and the camera.
  function spatial(x, z) {
    if (x == null || z == null) return { gain: 1, pan: 0 };
    const dx = x - listener.x, dz = z - listener.z, d = Math.hypot(dx, dz);
    const pan = d > 1 ? Math.max(-1, Math.min(1, (dx * listener.rx + dz * listener.rz) / d)) * 0.7 * Math.min(1, d / 8) : 0;
    return { gain: 1 / (1 + Math.max(0, d - 5) / 14), pan, d };
  }

  function play(name, opts = {}) {
    const dur = playSound(name, opts);
    if (name === 'shutter' && pendingJingle) flushJingle(ac ? ac.currentTime + 0.2 : 0);
    return dur;
  }

  function playSound(name, opts) {
    try {
      const recipe = RECIPES[name];
      if (!recipe || !ac || !soundOn || ac.state !== 'running') return 0;
      if (voices >= MAX_VOICES && !ALWAYS.has(name)) return 0;
      const sp = spatial(opts.x, opts.z);
      const vol = (opts.volume ?? 1) * sp.gain;
      if (vol < 0.03 || sp.d > 120) return 0;
      const now = ac.currentTime;
      let t = now + 0.01;
      if (JINGLES.has(name)) t = Math.max(t, busyUntil);
      const g = synth.gain(chain.sfx, vol);
      if (ECHO.has(name)) g.connect(chain.echo);
      const dur = recipe(synth, t, synth.panned(g, sp.pan), opts) || 0.5;
      voices++;
      setTimeout(() => voices--, (t - now + dur) * 1000);
      synth.release(g, t - now + dur);
      if (JINGLES.has(name)) {
        busyUntil = t + dur - 0.15;
        const d = chain.duck.gain;
        if (d.cancelAndHoldAtTime) d.cancelAndHoldAtTime(now);
        else { d.cancelScheduledValues(now); d.setValueAtTime(d.value, now); }
        d.setTargetAtTime(0.22, t, 0.05);
        d.setTargetAtTime(1, busyUntil, 0.4);
      }
      return dur;
    } catch (err) {
      console.warn('[audio] play failed', name, err);
      return 0;
    }
  }

  function flushJingle(at = 0) {
    const p = pendingJingle;
    pendingJingle = null;
    busyUntil = Math.max(busyUntil, at);
    play('jingle', { tr: p.tr });
    if (p.medal) play('medal', { id: p.medal });
  }

  function setSound(on) {
    soundOn = !!on;
    if (soundOn && ac && ac.state !== 'running') ac.resume().catch(() => {});
    applyLevels();
    if (game && game.settings.sound !== soundOn) game.setSettings({ sound: soundOn });
  }
  function setMusic(on) {
    musicOn = !!on;
    if (musicOn && ac && ac.state !== 'running') ac.resume().catch(() => {});
    applyLevels();
    if (game && game.settings.music !== musicOn) game.setSettings({ music: musicOn });
  }

  // ---- game events
  const ev = ctx.events;
  ev.on('settings', (s) => {
    const snd = s.sound !== false, mus = s.music !== false;
    if (snd !== soundOn) setSound(snd);
    if (mus !== musicOn) setMusic(mus);
  });
  ev.on('honk', () => play('honk'));
  ev.on('collect', (e) => {
    if (e.kind === 'gelato') {
      gelatoCombo = ctx.time - lastGelato < 2.5 ? gelatoCombo + 1 : 0;
      lastGelato = ctx.time;
      play('gelato', { combo: gelatoCombo, x: e.x, z: e.z });
    } else play(RECIPES[e.kind] ? e.kind : 'coin', { x: e.x, z: e.z });
  });
  ev.on('bump', (e) => {
    const strength = e.strength ?? 0.5;
    if (strength < 0.05) return;
    const name = bumpRecipe(e.kind);
    const last = lastBump.get(name);
    if (last && ctx.time - last.t < 0.3 && strength < last.s + 0.3) return;
    lastBump.set(name, { t: ctx.time, s: strength });
    play(name, { strength, x: e.x, z: e.z });
  });
  ev.on('splash', (e) => play('splash', { x: e.x, z: e.z, strength: e.strength }));
  ev.on('animal', (e) => play(animalRecipe(e.kind), { x: e.x, z: e.z }));
  ev.on('stopReached', (e) => {
    const tr = [0, 2, 4, 5][(e.index || 0) % 4];
    if (ctx.modules.ui) {
      pendingJingle = { tr, at: ctx.time, medal: null };
      play('arrive');
    } else play('stopReached', { tr });
  });
  ev.on('medal', (e) => {
    if (pendingJingle) pendingJingle.medal = e.id;
    else play('medal', { id: e.id });
  });
  ev.on('tourComplete', () => play('tourComplete'));
  ev.on('boost', (e) => play(e.on ? 'boost' : 'boostEnd'));
  ev.on('surface', (e) => { surface = e.type; surfaceAt = ctx.time; });

  const cam = ctx.camera;
  return {
    play, setSound, setMusic, unlock,
    get unlocked() { return !!ac && ac.state === 'running'; },
    info: () => ({ state: ac ? ac.state : 'locked', voices, sound: soundOn, music: musicOn, songStep: music?.step ?? 0, loops: !!cartSound, pendingJingle: !!pendingJingle }),
    renderOffline: (names, opts) => renderOffline(ctx, names, opts),

    update(dt) {
      if (pendingJingle && ctx.time - pendingJingle.at > 3.5) flushJingle();
      if (!ac || ac.state !== 'running') return;
      const cart = ctx.cart, state = game?.state;
      if (cart) { listener.x = cart.position.x; listener.z = cart.position.z; }
      const e = cam.matrixWorld.elements, rl = Math.hypot(e[0], e[2]) || 1;
      listener.rx = e[0] / rl; listener.rz = e[2] / rl;
      if (musicOn) music.schedule(ac.currentTime);
      const driving = state === 'playing' || state === 'finished';
      if (cartSound && cart) {
        let surf = typeof cart.surface === 'string' ? cart.surface : null;
        if (!surf && surface && ctx.time - surfaceAt < 0.5) surf = surface;
        if (!surf) surf = SURF_NAME[ctx.terrain.surfaceAt(listener.x, listener.z)] || 'path';
        const speed = driving ? (Math.abs(cart.speed || 0) * 13) / (cart.maxSpeed || 13) : 0;
        cartSound.update(dt, speed, { throttle: ctx.input.throttle, surface: surf, boost: !!game?.boosting });
      }
      ambience?.update(dt, listener, soundOn && state !== 'paused', voices > MAX_VOICES - 6);
    },
  };
}

// Renders sounds silently into an OfflineAudioContext and measures them (used by tests).
//   names: recipe names, 'music' (the song from the start), 'cart' (steady driving on gravel),
//   'drive' (speed up, cruise onto grass, brake), 'ambience' (birds, wind, a fountain nearby),
//   or a mix such as 'music+drive+honk@1.5+gelato@2' (name@seconds).
async function renderOffline(ctx, names = ['honk', 'gelato', 'music'], { seconds = 3, raw = false, rate = 44100 } = {}) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return { error: 'no OfflineAudioContext' };
  const results = {};
  for (const name of names) {
    const oac = new OAC(2, Math.ceil(seconds * rate), rate);
    const chain = buildChain(oac);
    const synth = new Synth(oac);
    let ok = true;
    const tickers = [];
    for (const part of name.split('+')) {
      const [n, at] = part.split('@');
      const t = Number(at || 0.05);
      if (n === 'music') {
        const m = new Music(synth, chain.music);
        m.start(t - 0.1);
        m.schedule(0, seconds);
      } else if (n === 'cart') {
        new CartSound(oac, chain.sfx).set(10, { throttle: 1, surface: 'path', accel: 2 }, true);
      } else if (n === 'drive') {
        const cs = new CartSound(oac, chain.sfx);
        const speedAt = (tt) => (tt < 2.5 ? tt * 5 : tt < 5 ? 12.5 : Math.max(0, 12.5 - (tt - 5) * 8));
        tickers.push((tt) => cs.update(0.05, speedAt(tt), { throttle: tt < 5 ? 1 : 0, surface: tt < 3.5 ? 'path' : 'grass' }));
      } else if (n === 'ambience') {
        const amb = new Ambience(oac, synth, chain.sfx, [{ x: 20, z: 0, r: 2, w: 1 }]);
        tickers.push(() => amb.update(0.05, { x: 0, z: 0, rx: 1, rz: 0 }, true, false));
      } else if (RECIPES[n]) {
        const g = synth.gain(chain.sfx, 1);
        if (ECHO.has(n)) g.connect(chain.echo);
        RECIPES[n](synth, t, g, {});
      } else ok = false;
    }
    if (!ok) { results[name] = { error: 'unknown sound' }; continue; }
    // the loops change over time: pause the render every 50 ms to update them
    for (let k = 1; tickers.length && k * 0.05 < seconds - 0.05; k++) {
      const tt = k * 0.05;
      oac.suspend(tt).then(() => { for (const f of tickers) f(tt); oac.resume(); });
    }
    const buf = await oac.startRendering();
    let peak = 0, sum = 0, loud = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const v = Math.abs(d[i]);
        if (v > peak) peak = v;
        sum += v * v;
        if (v > 0.01) loud++;
      }
    }
    const n = buf.length * buf.numberOfChannels;
    results[name] = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), audible: +(loud / n).toFixed(3), seconds };
    if (raw) results[name].samples = Array.from(buf.getChannelData(0));
  }
  return results;
}
