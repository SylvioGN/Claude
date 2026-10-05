import { Easing, random } from 'remotion';
import type { Transition } from './types';

export type Fx = {
  scale: number;
  /** Offsets in % of the frame. */
  x: number;
  y: number;
  rotate: number;
  /** px */
  blur: number;
  motionBlur: number;
  rgbSplit: number;
  /** 0..1 overlays */
  flash: number;
  black: number;
  /** Brightness multiplier. */
  exposure: number;
  /** Whips slide the frame on purpose; everything else must keep the frame covered. */
  keepCovered: boolean;
};

export const neutralFx = (): Fx => ({
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
  blur: 0,
  motionBlur: 0,
  rgbSplit: 0,
  flash: 0,
  black: 0,
  exposure: 1,
  keepCovered: true,
});

/** Seconds each effect takes after the cut into a clip / before the cut out of it. */
const ENTER: Record<Transition, number> = {
  cut: 0,
  flash: 0.2,
  zoom: 0.3,
  'whip-left': 0,
  'whip-right': 0,
  shake: 0.4,
  glitch: 0.25,
  blur: 0.4,
  fade: 0.25,
};

const EXIT: Record<Transition, number> = {
  cut: 0,
  flash: 0.07,
  zoom: 0.17,
  'whip-left': 0,
  'whip-right': 0,
  shake: 0,
  glitch: 0.1,
  blur: 0.2,
  fade: 0.2,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const out = Easing.out(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);
const jitter = (seed: string) => random(seed) * 2 - 1;

/**
 * Whip: both shots slide together across the cut. `p` runs 0 → 1 over the overlap,
 * reaching 0.5 exactly on the cut. Leftward whips push the outgoing shot off to the left.
 */
const whip = (fx: Fx, t: Transition, p: number, incoming: boolean) => {
  const dir = t === 'whip-left' ? -1 : 1;
  const e = inOut(clamp01(p));
  fx.x += incoming ? -dir * (1 - e) * 100 : dir * e * 100;
  fx.motionBlur += Math.sin(Math.PI * clamp01(p)) * 90;
  fx.keepCovered = false;
};

/**
 * @param f frames since the cut into this clip (negative during a whip's pre-roll)
 * @param roll frames each side of the cut that a whip overlaps
 */
export const enterFx = (fx: Fx, t: Transition | undefined, f: number, fps: number, roll: number, seed: string) => {
  if (!t || t === 'cut') {
    return;
  }
  if (t === 'whip-left' || t === 'whip-right') {
    if (f < roll) {
      whip(fx, t, (f + roll) / (2 * roll), true);
    }
    return;
  }
  const length = ENTER[t] * fps;
  if (f >= length) {
    return;
  }
  const p = clamp01(f / length);
  const rest = 1 - out(p);
  switch (t) {
    case 'flash':
      fx.flash += 0.85 * rest;
      fx.exposure *= 1 + 0.35 * rest;
      break;
    case 'zoom':
      fx.scale *= 1 + 0.22 * rest;
      fx.blur += 10 * (1 - p) ** 2;
      break;
    case 'shake': {
      const amp = (1 - p) ** 2;
      fx.x += jitter(`${seed}-sx-${f}`) * 2.2 * amp;
      fx.y += jitter(`${seed}-sy-${f}`) * 1.6 * amp;
      fx.rotate += jitter(`${seed}-sr-${f}`) * 1.2 * amp;
      break;
    }
    case 'glitch':
      fx.rgbSplit += 26 * (1 - p) * (0.5 + random(`${seed}-g-${f}`));
      if (random(`${seed}-gj-${f}`) > 0.55) {
        fx.x += jitter(`${seed}-gx-${f}`) * 3 * (1 - p);
      }
      fx.flash += 0.15 * (1 - p);
      break;
    case 'blur':
      fx.blur += 24 * rest;
      fx.exposure *= 1 + 0.4 * rest;
      break;
    case 'fade':
      fx.black = Math.max(fx.black, 1 - p);
      break;
  }
};

/**
 * @param g frames until the cut out of this clip (≤ 0 during a whip's post-roll)
 * @param t the next clip's entry effect
 */
export const exitFx = (fx: Fx, t: Transition | undefined, g: number, fps: number, roll: number) => {
  if (!t || t === 'cut') {
    return;
  }
  if (t === 'whip-left' || t === 'whip-right') {
    if (g <= roll) {
      whip(fx, t, (roll - g) / (2 * roll), false);
    }
    return;
  }
  const length = EXIT[t] * fps;
  if (length === 0 || g > length) {
    return;
  }
  const q = clamp01(1 - (g - 1) / length);
  switch (t) {
    case 'flash':
      fx.exposure *= 1 + 0.3 * q * q;
      fx.flash += 0.3 * q * q;
      break;
    case 'zoom':
      fx.scale *= 1 + 0.25 * q ** 3;
      fx.blur += 10 * q * q;
      break;
    case 'glitch':
      fx.rgbSplit += 20 * q;
      break;
    case 'blur':
      fx.blur += 16 * q * q;
      fx.exposure *= 1 + 0.25 * q * q;
      break;
    case 'fade':
      fx.black = Math.max(fx.black, q);
      break;
  }
};

/** Smallest scale that keeps a W×H frame covered after rotating it and shifting it by x%/y%. */
export const coverScale = (rotateDeg: number, x: number, y: number, width: number, height: number) => {
  const r = (Math.abs(rotateDeg) * Math.PI) / 180;
  const aspect = Math.max(width / height, height / width);
  return Math.cos(r) + aspect * Math.sin(r) + (2 * Math.max(Math.abs(x), Math.abs(y))) / 100;
};
