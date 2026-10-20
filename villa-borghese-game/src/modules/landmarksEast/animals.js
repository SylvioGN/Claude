// Low-poly zoo animals for the AnimBuilder. Each is built facing +z at the builder's frame;
// moving parts get a pivot/axis so the vertex shader can sway necks, flap ears and swish tails.
import * as THREE from 'three';
import { UV } from './kit.js';

const GIRAFFE = '#e8c486', GIRAFFE_DARK = '#7a4a24', HOOF = '#3b302a';

export function giraffe(ab, phase = 0) {
  ab.skin(UV.giraffe);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.27, z = sz * 0.58;
      ab.limb([x, 2.05, z], [x, 1.05, z + 0.03], 0.12, 0.08, GIRAFFE);
      ab.skin(UV.white).limb([x, 1.05, z + 0.03], [x, 0.12, z], 0.075, 0.06, '#f0dcae').skin(UV.giraffe);
      ab.skin(UV.white).box(0.13, 0.12, 0.16, HOOF, x, 0.06, z + 0.02).skin(UV.giraffe);
    }
  }
  ab.ball(1, GIRAFFE, 0, 2.2, 0, 0.5, 0.56, 0.95, -0.12);
  ab.setAnim({ pivot: [0, 2.15, -0.92], axis: [0, 0, 1], amp: 0.28, phase: phase * 3, speed: 2.1 });
  ab.skin(UV.white).limb([0, 2.3, -0.9], [0, 1.35, -1.05], 0.035, 0.025, GIRAFFE_DARK);
  ab.ball(0.09, '#3a2516', 0, 1.3, -1.06, 0.8, 1.5, 0.8, 0, 0);
  // neck and head sway together
  ab.setAnim({ pivot: [0, 2.45, 0.65], axis: [0.92, 0, 0.38], amp: 0.11, phase, speed: 0.75, react: -0.16 });
  ab.skin(UV.giraffe).limb([0, 2.3, 0.62], [0, 4.5, 1.22], 0.24, 0.12, GIRAFFE);
  ab.skin(UV.white).limb([0, 2.65, 0.5], [0, 4.45, 1.06], 0.05, 0.035, GIRAFFE_DARK);
  ab.skin(UV.giraffe).ball(1, GIRAFFE, 0, 4.62, 1.42, 0.17, 0.2, 0.42, 0.5);
  ab.skin(UV.white).ball(1, '#d9b98a', 0, 4.45, 1.76, 0.12, 0.12, 0.15, 0.5, 0);
  for (const sx of [-1, 1]) {
    ab.limb([sx * 0.07, 4.72, 1.28], [sx * 0.09, 5.02, 1.22], 0.035, 0.03, GIRAFFE_DARK, 4);
    ab.ball(0.055, '#3a2516', sx * 0.09, 5.04, 1.22, 1, 1, 1, 0, 0);
    ab.box(0.2, 0.06, 0.09, GIRAFFE, sx * 0.19, 4.74, 1.3, 0, 0, sx * 0.45);
    ab.ball(0.04, '#1b1512', sx * 0.15, 4.68, 1.5, 1, 1, 1, 0, 0);
  }
  ab.setAnim(null).skin(UV.white);
}

export function zebra(ab, phase = 0) {
  ab.skin(UV.zebraH);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.2, z = sz * 0.48;
      ab.limb([x, 1.0, z], [x, 0.1, z], 0.085, 0.055, '#ffffff');
      ab.skin(UV.white).box(0.11, 0.1, 0.13, '#222', x, 0.05, z + 0.02).skin(UV.zebraH);
    }
  }
  ab.skin(UV.zebraV).ball(1, '#ffffff', 0, 1.1, 0, 0.36, 0.42, 0.78, 0);
  ab.setAnim({ pivot: [0, 1.25, -0.75], axis: [0, 0, 1], amp: 0.35, phase: phase * 2, speed: 2.6 });
  ab.skin(UV.white).limb([0, 1.25, -0.74], [0, 0.72, -0.86], 0.03, 0.025, '#2a2a2a');
  ab.ball(0.07, '#151515', 0, 0.66, -0.87, 0.8, 1.6, 0.8, 0, 0);
  // grazing: the neck dips towards the grass and comes back up
  ab.setAnim({ pivot: [0, 1.3, 0.58], axis: [1, 0, 0], amp: 0.5, phase, speed: 0.45, react: -0.45 });
  ab.skin(UV.zebraH).limb([0, 1.22, 0.55], [0, 1.5, 1.05], 0.19, 0.12, '#ffffff');
  ab.limb([0, 1.55, 1.04], [0, 1.18, 1.42], 0.13, 0.09, '#ffffff');
  ab.skin(UV.white).ball(1, '#2b2b2b', 0, 1.13, 1.46, 0.1, 0.09, 0.11, 0, 0);
  ab.limb([0, 1.42, 0.52], [0, 1.68, 1.0], 0.04, 0.03, '#1b1b1b', 4);
  for (const sx of [-1, 1]) {
    ab.place(new THREE.ConeGeometry(0.05, 0.18, 4), '#f2f2f2', sx * 0.08, 1.68, 1.04, -0.3, 0, sx * 0.3);
    ab.ball(0.03, '#111', sx * 0.1, 1.5, 1.15, 1, 1, 1, 0, 0);
  }
  ab.setAnim(null).skin(UV.white);
}

export function elephant(ab, phase = 0) {
  const G = '#8f8a86', GD = '#77726e';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.55, z = sz * 0.72 - 0.1;
      ab.limb([x, 1.55, z], [x, 0.0, z], 0.34, 0.31, G, 7);
      if (sz > 0) for (const tx of [-0.12, 0.12]) ab.box(0.1, 0.12, 0.06, '#e9e2d4', x + tx, 0.08, z + 0.3);
    }
  }
  ab.ball(1, G, 0, 1.95, -0.15, 1.12, 1.18, 1.55, 0);
  ab.ball(1, G, 0, 2.35, 1.35, 0.72, 0.78, 0.68, 0);
  for (const sx of [-1, 1]) ab.ball(0.06, '#1f1d1b', sx * 0.42, 2.5, 1.85, 1, 1, 1, 0, 0);
  ab.setAnim({ pivot: [0, 2.1, -1.65], axis: [0, 0, 1], amp: 0.3, phase, speed: 1.8 });
  ab.limb([0, 2.1, -1.62], [0, 1.2, -1.8], 0.06, 0.04, GD, 5);
  ab.ball(0.08, '#3a3634', 0, 1.15, -1.8, 0.8, 1.6, 0.8, 0, 0);
  for (const sx of [-1, 1]) {
    // ears flap; when the elephant trumpets they spread wide
    ab.setAnim({ pivot: [sx * 0.55, 2.45, 1.15], axis: [0, sx, 0], amp: 0.28, phase: phase + sx, speed: 2.2, react: 0.6 });
    ab.place(new THREE.CylinderGeometry(0.78, 0.7, 0.08, 10), '#9c9692', sx * 0.85, 2.4, 1.0, 0, sx * 0.35, Math.PI / 2, 1.15, 1, 1);
    ab.place(new THREE.CylinderGeometry(0.62, 0.55, 0.09, 10), '#c79c94', sx * 0.87, 2.38, 1.05, 0, sx * 0.35, Math.PI / 2, 1.1, 1, 1);
    ab.setAnim(null);
    ab.limb([sx * 0.25, 1.95, 1.85], [sx * 0.3, 1.55, 2.4], 0.07, 0.03, '#f4efe2', 5);
  }
  // trunk: gentle swing, curls up high when the elephant trumpets
  ab.setAnim({ pivot: [0, 2.15, 1.9], axis: [1, 0, 0], amp: 0.14, phase, speed: 1.15, react: -2.1 });
  const pts = [[0, 2.15, 1.9], [0, 1.5, 2.15], [0, 0.85, 2.2], [0, 0.42, 2.38], [0, 0.32, 2.55]];
  const rr = [0.27, 0.2, 0.15, 0.12, 0.1];
  for (let i = 1; i < pts.length; i++) {
    ab.limb(pts[i - 1], pts[i], rr[i - 1], rr[i], G, 7);
    ab.ball(rr[i], G, ...pts[i], 1, 1, 1, 0, 0);
  }
  ab.setAnim(null);
}

// Lying lion (or lioness without the mane); stone = an unmoving travertine statue.
export function lion(ab, phase = 0, mane = true, stone = false) {
  const T = stone ? '#e8dfc9' : mane ? '#c99a52' : '#cfa462', M = stone ? '#d8cbad' : '#8a4f22';
  const MUZZLE = stone ? '#efe8d6' : '#e6c58c', DARK = stone ? '#b8ab8f' : '#2a1b14';
  const anim = (a) => ab.setAnim(stone ? null : a);
  ab.ball(1, T, 0, 0.45, 0, 0.45, 0.4, 0.95, 0);
  for (const sx of [-1, 1]) {
    ab.ball(1, T, sx * 0.33, 0.33, -0.5, 0.2, 0.27, 0.38, 0);
    ab.limb([sx * 0.22, 0.25, 0.55], [sx * 0.24, 0.12, 1.2], 0.12, 0.1, T, 6);
    ab.ball(1, MUZZLE, sx * 0.24, 0.1, 1.25, 0.13, 0.09, 0.15, 0, 0);
  }
  anim({ pivot: [0, 0.4, -0.88], axis: [0, 1, 0], amp: 0.45, phase: phase * 2, speed: 1.3 });
  ab.limb([0, 0.42, -0.88], [0.32, 0.12, -1.55], 0.05, 0.035, T, 5);
  ab.ball(0.1, M, 0.34, 0.12, -1.6, 1, 1, 1.3, 0, 0);
  // head looks slowly around
  anim({ pivot: [0, 0.7, 0.72], axis: [0, 1, 0], amp: 0.5, phase, speed: 0.33 });
  const hz = mane ? 1.12 : 0.98;
  if (mane) ab.ball(1, M, 0, 0.95, 0.85, 0.5, 0.52, 0.42, 0);
  ab.ball(1, T, 0, 0.9, hz, 0.28, 0.3, 0.3, 0);
  ab.ball(1, MUZZLE, 0, 0.8, hz + 0.24, 0.15, 0.12, 0.13, 0, 0);
  ab.ball(0.05, DARK, 0, 0.86, hz + 0.36, 1.3, 1, 1, 0, 0);
  for (const sx of [-1, 1]) {
    ab.ball(0.04, DARK, sx * 0.11, 0.98, hz + 0.26, 1, 1, 1, 0, 0);
    ab.ball(0.08, mane ? M : T, sx * 0.2, mane ? 1.38 : 1.18, 0.95, 1, 1, 0.6, 0, 0);
  }
  ab.setAnim(null);
}

export function flamingo(ab, phase = 0, oneLeg = false) {
  const P = '#f48fa6', PD = '#e66a8a', L = '#d9828f';
  ab.limb([0.06, 0.98, 0], [0.06, 0, 0.02], 0.022, 0.018, L, 4);
  if (oneLeg) {
    ab.limb([-0.06, 0.98, 0], [-0.06, 0.62, 0.22], 0.022, 0.018, L, 4);
    ab.limb([-0.06, 0.62, 0.22], [-0.06, 0.8, -0.05], 0.02, 0.016, L, 4);
  } else ab.limb([-0.06, 0.98, 0], [-0.06, 0, -0.02], 0.022, 0.018, L, 4);
  ab.ball(1, P, 0, 1.08, 0, 0.21, 0.19, 0.34, -0.15);
  ab.ball(1, PD, 0, 1.12, -0.28, 0.12, 0.08, 0.16, 0.3, 0);
  for (const sx of [-1, 1]) ab.ball(1, PD, sx * 0.15, 1.1, -0.03, 0.06, 0.12, 0.24, 0, 0);
  ab.setAnim({ pivot: [0, 1.15, 0.24], axis: [1, 0, 0], amp: 0.65, phase, speed: 0.55 });
  ab.limb([0, 1.15, 0.24], [0, 1.5, 0.3], 0.045, 0.035, P, 5);
  ab.limb([0, 1.5, 0.3], [0, 1.74, 0.16], 0.035, 0.03, P, 5);
  ab.ball(1, P, 0, 1.79, 0.2, 0.07, 0.07, 0.1, 0, 0);
  ab.limb([0, 1.78, 0.28], [0, 1.68, 0.38], 0.035, 0.02, '#f3e4d6', 4);
  ab.limb([0, 1.68, 0.38], [0, 1.6, 0.36], 0.02, 0.01, '#1c1c1c', 4);
  ab.setAnim(null);
}

export function deer(ab, phase = 0, stag = false) {
  const B = '#a8703f', W = '#efe4d0';
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.15, z = sz * 0.4;
      ab.limb([x, 0.85, z], [x, 0.05, z], 0.06, 0.035, B, 5);
    }
  }
  ab.skin(UV.deer).ball(1, B, 0, 0.92, 0, 0.27, 0.3, 0.6, 0).skin(UV.white);
  ab.ball(1, W, 0, 0.98, -0.6, 0.08, 0.12, 0.05, 0, 0);
  ab.setAnim({ pivot: [0, 1.0, 0.45], axis: [1, 0, 0], amp: 0.55, phase, speed: 0.4, react: -0.5 });
  ab.limb([0, 0.98, 0.45], [0, 1.4, 0.75], 0.13, 0.08, B, 6);
  ab.ball(1, B, 0, 1.45, 0.86, 0.1, 0.11, 0.22, 0.4, 0);
  ab.ball(0.04, '#1a1410', 0, 1.36, 1.05, 1, 1, 1, 0, 0);
  for (const sx of [-1, 1]) {
    ab.place(new THREE.ConeGeometry(0.06, 0.2, 4), B, sx * 0.1, 1.58, 0.78, -0.2, 0, sx * 0.6);
    if (stag) {
      ab.limb([sx * 0.06, 1.55, 0.8], [sx * 0.22, 1.85, 0.7], 0.025, 0.02, '#d9c8a6', 4);
      ab.box(0.2, 0.18, 0.03, '#d9c8a6', sx * 0.28, 1.92, 0.68, 0, sx * 0.4, sx * 0.5);
    }
  }
  ab.setAnim(null);
}
