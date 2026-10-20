// Two monuments: Goethe (white Carrara marble, 1904: the poet standing on a giant composite
// capital, three groups from his works around the base) and King Umberto I (bronze on horseback,
// 1926: granite and porphyry pedestal, two lions and the Capitoline wolf in front, Grief behind).
import * as THREE from 'three';
import { Frame, figure, horseBody, horseLeg, rider, HORSE_LEGS } from './parts.js';

const M = { marble: '#f2efe8', shade: '#ddd6c8', deep: '#cbc2b0', step: '#e6decb' };
const B = {
  bronze: '#6b5a3c', dark: '#4b3e2a', patina: '#5e7564', granite: '#a69d93', graniteLight: '#bcb3a8',
  porphyry: '#743238', step: '#b5ada2', soil: '#6b4f35', flowers: ['#e8463a', '#f6f1e7', '#e8463a', '#f2b33d'],
};

// Goethe monument: in the wedge where Viale Goethe leaves Viale San Paolo del Brasile, facing the junction.
export function buildGoethe(ctx, gb) {
  const A = ctx.MAP.ANCHORS.goethe;
  // nudge into the wedge between the two (widened) avenues
  const cx = A.x + 2.4 * 0.826, cz = A.z + 2.4 * 0.564;
  const y0 = ctx.terrain.heightAt(cx, cz);
  const f = new Frame(gb, cx, y0, cz, Math.atan2(47 - cx, 82 - cz));

  f.cyl(2.55, 2.65, 0.9, 16, M.step, 0, -0.15, 0);
  f.cyl(2.2, 2.2, 0.3, 16, M.step, 0, 0.45, 0);
  f.cyl(1.85, 1.85, 0.3, 16, M.shade, 0, 0.75, 0);
  // drum with mouldings
  f.cyl(1.42, 1.48, 0.22, 14, M.marble, 0, 1.0, 0);
  f.cyl(1.22, 1.3, 1.6, 14, M.marble, 0, 1.9, 0);
  f.cyl(1.36, 1.24, 0.24, 14, M.marble, 0, 2.8, 0);
  // three groups from Goethe's works around the drum
  const groups = [
    // Faust seated, Mephistopheles leaning over him
    (g) => {
      g.box(0.7, 0.5, 0.5, M.shade, -0.25, 0.25, -0.05);
      figure(g.child(-0.25, 0, 0.0), { h: 1.75, pose: 'sit', body: M.marble, robe: M.shade, armL: [0.1, -0.2, 0.35], armR: [0.02, -0.05, 0.4], seg: 5 });
      figure(g.child(0.45, 0, -0.15, -0.5), { h: 1.85, body: M.shade, armL: [0.25, -0.3, 0.3], armR: [0.1, 0.25, 0.15], seg: 5 });
      g.cone(0.06, 0.18, 4, M.shade, 0.44, 1.88, -0.12);
    },
    // Mignon standing, the old harper seated with his harp
    (g) => {
      figure(g.child(-0.42, 0, 0.05, 0.3), { h: 1.55, robe: M.marble, body: M.marble, armL: [0.12, -0.35, 0.25], armR: [0.0, 0.15, 0.25], seg: 5 });
      g.box(0.6, 0.45, 0.45, M.shade, 0.45, 0.22, -0.1);
      figure(g.child(0.45, 0, -0.1, -0.3), { h: 1.8, pose: 'sit', body: M.shade, robe: M.shade, armL: [0.2, -0.15, 0.35], armR: [-0.1, -0.15, 0.35], seg: 5 });
      g.beam([0.3, 0.55, 0.35], [0.36, 1.4, 0.3], 0.06, 0.06, M.deep);
      g.beam([0.36, 1.4, 0.3], [0.7, 0.85, 0.45], 0.06, 0.06, M.deep);
      g.beam([0.3, 0.55, 0.35], [0.7, 0.85, 0.45], 0.06, 0.06, M.deep);
    },
    // Iphigenia standing, Orestes kneeling at her side
    (g) => {
      figure(g.child(0.3, 0, -0.1, -0.2), { h: 1.8, robe: M.marble, body: M.marble, head: 'veil', hair: M.shade, armL: [0.15, -0.3, 0.3], armR: [-0.25, -0.2, 0.3], seg: 5 });
      figure(g.child(-0.45, 0, 0.1, 0.4), { h: 1.75, pose: 'kneel', body: M.shade, armL: [0.2, 0.1, 0.25], armR: [0.25, -0.1, 0.3], seg: 5 });
    },
  ];
  groups.forEach((build, i) => {
    const a = (i / 3) * Math.PI * 2;
    const g = f.child(Math.sin(a) * 1.7, 0.9, Math.cos(a) * 1.7, a);
    g.box(1.5, 0.12, 0.95, M.shade, 0, 0.06, 0);
    build(g.child(0, 0.12, 0));
  });
  // shaft and the composite capital
  f.cyl(0.78, 0.86, 1.2, 14, M.marble, 0, 3.5, 0);
  f.cyl(0.9, 0.9, 0.14, 14, M.shade, 0, 4.14, 0);
  f.cyl(1.12, 0.88, 0.95, 14, M.marble, 0, 4.66, 0);
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 8; k++) {
      const a = ((k + row * 0.5) / 8) * Math.PI * 2, r = 0.92 + row * 0.08, h = row ? 0.7 : 0.55;
      const leaf = f.child(Math.sin(a) * r, 4.2 + row * 0.25 + h / 2, Math.cos(a) * r, a, -0.28);
      leaf.box(0.42, h, 0.09, M.shade, 0, 0, 0);
      leaf.sphere(0.11, 0, M.shade, 0, h / 2, 0.08);
    }
  }
  f.cyl(1.16, 1.16, 0.2, 14, M.marble, 0, 5.12, 0);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const v = f.child(Math.sin(a) * 1.3, 5.02, Math.cos(a) * 1.3, a + Math.PI / 2);
    v.cyl(0.3, 0.3, 0.42, 10, M.marble, 0, 0, 0, 0, 0, Math.PI / 2);
    v.cyl(0.13, 0.13, 0.46, 8, M.deep, 0, 0, 0, 0, 0, Math.PI / 2);
  }
  f.box(2.55, 0.32, 2.55, M.marble, 0, 5.38, 0);
  // the poet, in his travelling coat, a book in one hand
  const poet = f.child(0, 5.54, 0);
  figure(poet, { h: 2.3, body: M.marble, coat: M.marble, legs: M.marble, hair: M.shade, armL: [0.12, -0.6, 0.12], armR: [-0.02, -0.3, 0.38], stride: 0.12 });
  poet.box(0.26, 0.34, 0.08, M.shade, 0.25, 1.46, 0.45, 0, -0.5);

  ctx.colliders.addCircle(cx, cz, 2.7, 'statue', { name: 'goethe' });
  ctx.reserve({ x: cx, z: cz, r: 3.6 });
  return { x: cx, z: cz, y: y0 };
}

// Umberto I: in the square clearing where Viale Gabriel García Márquez begins, facing down
// Viale Mariangela Melato. The clearing is the little loop path around (179, 41).
export function buildUmberto(ctx, gb) {
  // h runs along the long side of the clearing, towards Viale Mariangela Melato
  const h = 0.776;
  const fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
  let cx = 178.8, cz = 40.94;
  const loop = ctx.MAP.PATHS.find((p) => p.p.length >= 5 && p.p.length <= 7 && p.p.every(([x, z]) => Math.hypot(x - 179, z - 41) < 12));
  if (loop) { // centre of the loop's bounding box in the clearing's own axes
    const us = loop.p.map(([x, z]) => x * fx + z * fz), vs = loop.p.map(([x, z]) => x * rx + z * rz);
    const um = (Math.min(...us) + Math.max(...us)) / 2, vm = (Math.min(...vs) + Math.max(...vs)) / 2;
    cx = um * fx + vm * rx; cz = um * fz + vm * rz;
  }
  const T = ctx.terrain;
  let ymin = Infinity, ymax = -Infinity;
  for (const [a, b] of [[-3.1, -4.3], [3.1, -4.3], [3.1, 4.3], [-3.1, 4.3], [0, 0]]) {
    const y = T.heightAt(cx + rx * a + fx * b, cz + rz * a + fz * b);
    ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
  }
  const f = new Frame(gb, cx, ymax, cz, h);
  const sink = ymax - ymin + 0.5;

  // flower border and stepped base
  f.box(7.4, 0.2, 9.8, B.soil, 0, -0.06 - (ymax - ymin) / 2, 0);
  const rnd = ctx.rng('umberto-flowers');
  for (let k = 0; k < 40; k++) {
    const t = k / 40, side = Math.floor(t * 4), u = (t * 4) % 1;
    const [x, z] = [[-3.4 + u * 6.8, -4.6], [3.4, -4.6 + u * 9.2], [3.4 - u * 6.8, 4.6], [-3.4, 4.6 - u * 9.2]][side];
    f.sphere(0.16 + rnd() * 0.05, 0, B.flowers[k % 4], x + rnd.range(-0.15, 0.15), 0.12, z + rnd.range(-0.15, 0.15));
  }
  f.box(6.2, 0.3 + sink, 8.6, B.step, 0, (0.3 - sink) / 2, 0);
  f.box(5.3, 0.3, 7.7, B.graniteLight, 0, 0.45, 0);
  f.box(3.5, 1.3, 5.3, B.granite, 0, 1.25, 0);
  f.box(3.75, 0.2, 5.55, B.graniteLight, 0, 0.7, 0);
  // the die with porphyry panels, bronze reliefs and a wreath in front
  f.box(2.95, 2.0, 4.7, B.granite, 0, 2.9, 0);
  f.box(3.2, 0.22, 4.95, B.graniteLight, 0, 1.97, 0);
  for (const s of [-1, 1]) {
    f.box(0.06, 1.45, 3.7, B.porphyry, s * 1.49, 2.92, 0);
    const relief = f.child(s * 1.53, 2.92, 0, s * Math.PI / 2);
    relief.box(3.2, 1.05, 0.05, B.patina, 0, 0, 0);
    for (const y of [-0.55, 0.55]) relief.box(3.3, 0.08, 0.1, B.dark, 0, y, 0.02);
    for (const x of [-1.62, 1.62]) relief.box(0.08, 1.18, 0.1, B.dark, x, 0, 0.02);
    // a procession of figures: Valour on one side, Royal Piety on the other
    for (let k = 0; k < 7; k++) {
      const x = -1.32 + k * 0.44, lean = (k % 3 - 1) * 0.08, tall = k === 3 ? 0.12 : 0;
      relief.box(0.2, 0.58 + tall, 0.06, B.bronze, x, -0.14 + tall / 2, 0.05, 0, 0, lean);
      relief.box(0.24, 0.3, 0.05, B.bronze, x, -0.33, 0.05);
      relief.sphere(0.075, 0, B.bronze, x - lean * 1.5, 0.24 + tall, 0.06);
      relief.beam([x + 0.08, 0.1 + tall, 0.07], [x + 0.24, (k % 2 ? 0.32 : -0.02) + tall, 0.07], 0.05, 0.05, B.bronze);
    }
  }
  f.box(1.7, 1.1, 0.06, B.porphyry, 0, 2.95, 2.36);
  f.add(new THREE.TorusGeometry(0.36, 0.08, 5, 12), B.patina, 0, 2.95, 2.42, 0, 0, 0);
  f.box(3.35, 0.3, 5.1, B.graniteLight, 0, 4.05, 0);
  f.box(3.05, 0.26, 4.8, B.granite, 0, 4.33, 0);

  // two lions guarding the Capitoline wolf on its little column
  for (const s of [-1, 1]) {
    const lion = f.child(s * 1.8, 0.6, 3.05, -s * 0.12);
    lion.sphere(0.36, 1, B.bronze, 0, 0.34, -0.28, 0.95, 0.85, 1.1);
    lion.limb([0, 0.4, -0.25], [0, 0.92, 0.08], 0.3, 0.26, 7, B.bronze);
    lion.sphere(0.36, 1, B.dark, 0, 1.06, 0.14, 1.05, 1.0, 0.85);
    lion.sphere(0.21, 1, B.bronze, 0, 1.08, 0.36);
    lion.box(0.17, 0.13, 0.16, B.bronze, 0, 1.0, 0.54);
    for (const px of [-0.14, 0.14]) {
      lion.limb([px, 0.75, 0.14], [px, 0.04, 0.3], 0.085, 0.07, 5, B.bronze);
      lion.box(0.15, 0.08, 0.22, B.bronze, px, 0.04, 0.36);
      lion.box(0.16, 0.1, 0.3, B.bronze, px * 1.9, 0.05, 0.02);
    }
    lion.limb([0, 0.12, -0.6], [s * 0.35, 0.05, -0.15], 0.04, 0.035, 4, B.dark);
  }
  f.box(0.62, 0.3, 0.62, B.graniteLight, 0, 0.75, 3.2);
  f.cyl(0.15, 0.19, 1.5, 8, B.granite, 0, 1.65, 3.2);
  f.box(0.5, 0.12, 0.5, B.graniteLight, 0, 2.45, 3.2);
  const wolf = f.child(0, 2.51, 3.2, Math.PI / 2, 0, 0, 0.55);
  wolf.sphere(0.32, 1, B.bronze, 0, 0.62, 0, 0.75, 0.6, 1.5);
  wolf.limb([0, 0.75, 0.42], [0, 0.95, 0.6], 0.13, 0.11, 5, B.bronze);
  wolf.box(0.2, 0.2, 0.36, B.bronze, 0, 0.98, 0.72, 0, 0.2);
  for (const [lx, lz] of [[-0.14, 0.32], [0.14, 0.32], [-0.14, -0.32], [0.14, -0.32]]) wolf.limb([lx, 0.5, lz], [lx, 0, lz], 0.06, 0.05, 4, B.bronze);
  wolf.limb([0, 0.7, -0.45], [0, 0.35, -0.75], 0.05, 0.04, 4, B.bronze);
  // Grief, veiled, sitting at the back
  f.box(1.0, 0.45, 0.6, B.graniteLight, 0, 0.82, -3.25);
  figure(f.child(0, 0.6, -3.3, Math.PI), { h: 1.9, pose: 'sit', body: B.bronze, robe: B.dark, head: 'veil', hair: B.dark, armL: [0.2, 0.42, 0.18], armR: [-0.12, 0.38, 0.2], seg: 5 });

  // the king on his horse, all four hooves on the ground
  const hf = f.child(0, 4.46, -0.1, 0, 0, 0, 1.38);
  horseBody(hf, { coat: B.bronze, dark: B.dark, muzzle: B.dark }, { headUp: 0.7 });
  HORSE_LEGS.forEach(([x, y, z, front], i) => horseLeg(hf.child(x, y, z, 0, front ? (i ? -0.12 : 0.1) : (i === 2 ? 0.12 : -0.08)), B.bronze, B.dark, !!front));
  rider(hf, { pad: B.dark, saddle: B.dark, legs: B.bronze, boots: B.dark, jacket: B.bronze, skin: B.bronze, helmet: B.dark, gloves: B.dark });
  hf.cone(0.07, 0.3, 5, B.dark, 0, 2.95, 0.02);
  hf.sphere(0.12, 0, B.patina, 0, 3.0, -0.06, 0.8, 1.4, 1.2);
  hf.beam([0, 2.38, -0.12], [0, 1.8, -0.5], 0.5, 0.06, B.dark);

  ctx.colliders.addBox(cx, cz, 8.8, 6.4, Math.atan2(fz, fx), 'statue', { name: 'umberto' });
  ctx.reserve({ x: cx, z: cz, r: 5.4 });
  return { x: cx, z: cz, y: ymax };
}
