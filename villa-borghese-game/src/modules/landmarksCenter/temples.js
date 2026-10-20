// Two of Asprucci's garden temples: the romantic fake ruin of the Temple of Antoninus and Faustina
// and the little round Temple of Diana (eight grey columns, four round steps, a dome with a pine cone).
import * as THREE from 'three';
import { GeoBuilder } from '../../core/util.js';
import { C, Frame, column, statue, polyShape, opening, photoView } from './kit.js';

export function buildFaustina(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const a = ctx.MAP.ANCHORS.faustina;
  const f = new Frame(new GeoBuilder(), a.x, a.z, a.angle, ctx.terrain.heightAt(a.x, a.z));
  const rnd = ctx.rng('faustina');
  const tuff = '#a49c8c', podH = 1.1;

  // podium with steps on the front (+v, facing the path)
  f.box(7.8, podH, 4.2, tuff, 0, 0, 0);
  f.box(8.0, 0.18, 4.4, C.travertine, 0, podH - 0.18, 0);
  f.box(8.0, 0.25, 4.4, C.travertineShade, 0, 0, 0);
  for (let k = 0; k < 3; k++) f.box(5.4, podH - (k + 1) * 0.275, 0.34, k % 2 ? C.travertineShade : C.travertine, 0.2, 0, 2.27 + k * 0.34);

  // brick cella wall behind, crumbling to the right, with its great door
  const slices = [5.9, 6.3, 6.0, 5.4, 4.6, 3.7, 2.8, 1.9];
  slices.forEach((h, i) => {
    const u = -3.4 + i * 0.97, hh = h + rnd.range(-0.25, 0.25);
    f.box(0.99, hh, 0.65, i % 3 === 1 ? C.brickDark : C.brick, u, podH, -1.55);
    if (hh > 5.6) f.box(1.0, 0.3, 0.75, C.travertine, u, podH + hh - 0.3, -1.55);
    if (i > 2) for (let k = 0; k < 2; k++) f.box(rnd.range(0.25, 0.5), rnd.range(0.2, 0.4), 0.3, C.brick, u + rnd.range(-0.3, 0.3), podH + hh, -1.55 + rnd.range(-0.15, 0.15));
  });
  f.box(0.65, 5.2, 2.0, C.brick, -3.55, podH, -0.4);
  opening(f, '+v', -1.0, podH + 0.1, -1.2, 1.7, 3.6, { frame: C.travertine, fill: '#2e2622', fw: 0.25 });

  // pronaos: six cipollino columns in front, two on the left side; the right end is broken
  const top = podH + 5.6;
  const front = [-3.25, -1.95, -0.65, 0.65, 1.95, 3.25];
  front.forEach((u, i) => column(f, u, podH, 1.45, 5.6, 0.32, C.cipollino, C.marble, { seg: hi ? 10 : 7, broken: i === 5 ? 2.3 : 0 }));
  for (const v of [0.15, -0.95]) column(f, -3.25, podH, v, 5.6, 0.32, C.cipollino, C.marble, { seg: hi ? 10 : 7 });

  // entablature over the surviving columns: architrave, inscribed frieze, cornice
  const eu0 = -3.75, eu1 = 1.2, ew = eu1 - eu0, ecu = (eu0 + eu1) / 2;
  f.box(ew, 0.5, 0.85, C.travertine, ecu, top, 1.45);
  f.box(ew, 0.55, 0.75, C.travertineShade, ecu, top + 0.5, 1.45);
  f.box(ew + 0.3, 0.28, 1.05, C.travertine, ecu, top + 1.05, 1.45);
  f.box(0.85, 1.33, 3.2, C.travertine, -3.25, top, -0.15);
  f.box(1.6, 0.5, 0.8, C.travertineShade, 2.05, top, 1.45);
  let u = eu0 + 0.3;
  while (u < eu1 - 0.3) {
    const w = rnd.range(0.12, 0.26);
    f.box(w, 0.24, 0.04, '#5a5249', u + w / 2, top + 0.65, 1.84);
    u += w + (rnd.chance(0.2) ? 0.22 : 0.08);
  }
  // half a pediment, broken off near the middle
  const pedTop = top + 1.33;
  const ped = polyShape([[-3.95, 0], [-0.25, 0], [-0.45, 0.5], [-0.15, 0.85], [-0.6, 1.2], [-3.95, 0.05]]);
  f.relief(ped, 0.7, C.travertineShade, 0, pedTop, 1.45);
  f.beam([-4.0, pedTop + 0.1, 1.45], [-0.55, pedTop + 1.32, 1.45], 0.28, C.travertine);

  // fallen drums and a capital in the grass, ivy on the old bricks
  const debris = [[-5.6, 2.6, 0.5, 1.5], [-2.1, 4.4, -0.25, 1.2], [-5.3, -1.2, 1.3, 0.9]];
  for (const [du, dv, rot, len] of debris) {
    f.put(new THREE.CylinderGeometry(0.32, 0.32, len, hi ? 10 : 7), C.cipollino, du, 0.32, dv, 0, rot, Math.PI / 2);
    const [x, z] = f.w(du, dv);
    colliders.addCircle(x, z, Math.max(0.6, len / 2), 'rock');
  }
  f.box(0.8, 0.55, 0.8, C.marble, -6.4, 0, 0.6, 0.4);
  if (hi) {
    for (const [du, dy, dv, s] of [[-3.0, 4.6, -1.15, 0.7], [-2.2, 6.4, -1.2, 0.5], [0.4, 4.2, -1.15, 0.6], [2.6, 2.4, -1.15, 0.55], [-3.6, 1.1, 1.9, 0.5], [3.5, 0.9, 2.0, 0.45], [-3.9, 3.0, -0.6, 0.6]]) {
      f.sphere(s, C.ivy, du, podH + dy - 1.1, dv, 1.2, 1.4, 0.55, 0);
    }
  }

  colliders.addRing(a.footprint.map(([x, z]) => {
    const [lu, lv] = f.local(x, z);
    return f.w(lu * 1.04, lv > 0 ? lv + 1.3 : lv * 1.05);
  }), 'building');
  ctx.reserve({ x: a.x, z: a.z, r: 8 });
  const group = new THREE.Group();
  group.name = 'tempio-faustina';
  group.add(f.gb.build(undefined, { name: 'faustina' }));
  return { group };
}

export function buildDiana(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const a = ctx.MAP.ANCHORS.diana;
  const f = new Frame(new GeoBuilder(), a.x, a.z, 0, ctx.terrain.heightAt(a.x, a.z));
  const seg = hi ? 24 : 16;

  // little lawn island in the middle of the Piazzale, edged in travertine; island and steps stay
  // compact so the roundabout avenue around them is wide enough to drive
  f.cyl(3.55, 3.55, 0.07, seg, C.travertine, 0, 0, 0);
  f.cyl(3.3, 3.3, 0.1, seg, C.grass, 0, 0, 0);
  [2.9, 2.7, 2.55, 2.4].forEach((r, k) => f.cyl(r, r, 0.2, seg, k % 2 ? C.travertine : C.travertineShade, 0, k * 0.2, 0));
  const floor = 0.8, colH = 3.5, ring = 1.95;
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + Math.PI / 8;
    column(f, Math.cos(t) * ring, floor, Math.sin(t) * ring, colH, 0.2, C.marbleGrey, C.marble, { ionic: true, seg: hi ? 10 : 7 });
  }
  const e0 = floor + colH;
  f.cyl(2.3, 2.3, 0.45, seg, C.marble, 0, e0, 0);
  f.cyl(2.32, 2.32, 0.08, seg, C.travertineShade, 0, e0 + 0.45, 0);
  f.cyl(2.48, 2.38, 0.22, seg, C.marble, 0, e0 + 0.53, 0);
  const d0 = e0 + 0.75;
  f.put(new THREE.SphereGeometry(2.2, seg, hi ? 7 : 5, 0, Math.PI * 2, 0, Math.PI / 2), '#e2ddd0', 0, d0, 0, 0, 0, 0, 1, 0.72, 1);
  f.cyl(0.3, 0.38, 0.25, 10, C.marble, 0, d0 + 1.55, 0);
  f.sphere(0.24, '#b8a27a', 0, d0 + 2.05, 0, 1, 1.7, 1, 1);
  // Diana the huntress on her ancient base inside
  statue(f, 0, floor, 0, 1.75, C.marble, C.travertine, { pose: 'bow', plinthH: 1.0, ry: Math.PI * 0.5 });

  colliders.addCircle(a.x, a.z, 2.75, 'statue');
  // the postcard from the east: Diana seen between the columns, the cart on the roundabout beside her
  photoView(ctx, 'diana', { spot: f.w(6.2, 0), face: [0.89, 0.45], cam: [...f.w(16, -3), 5.8], look: [...f.w(3, 0.3), 2.6], far: f.w(0, 0), wide: 4 });
  ctx.reserve({ x: a.x, z: a.z, r: 8.5 });
  const group = new THREE.Group();
  group.name = 'tempio-diana';
  group.add(f.gb.build(undefined, { name: 'diana' }));
  return { group };
}
