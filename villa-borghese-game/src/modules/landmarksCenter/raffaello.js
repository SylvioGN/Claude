// Casina di Raffaello: the little ochre villa that is now Rome's children's play house, with a
// playground beside the avenue: swings (gently swinging), a seesaw, a slide, a sandpit with a
// sandcastle, a merry-go-round and a spring horse.
import * as THREE from 'three';
import { GeoBuilder, buildGeometry, mats } from '../../core/util.js';
import { C, Frame, opening, hipRoofGeometry, archRing, archShape, photoView } from './kit.js';

export function buildRaffaello(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const a = ctx.MAP.ANCHORS.raffaello;
  const y0 = ctx.terrain.heightAt(a.x, a.z);
  const f = new Frame(new GeoBuilder(), a.x, a.z, a.angle, y0);
  const ochre = '#e8b45c', trim = '#f3e6c8';
  const U0 = -10.4, U1 = 11.1, V0 = -5.0, V1 = 4.1, H = 8.0;

  // --- the house
  f.box(U1 - U0, H, V1 - V0, ochre, (U0 + U1) / 2, 0, (V0 + V1) / 2);
  f.box(U1 - U0 + 0.16, 0.6, V1 - V0 + 0.16, C.travertineShade, (U0 + U1) / 2, 0, (V0 + V1) / 2);
  f.box(U1 - U0 + 0.1, 0.16, V1 - V0 + 0.1, trim, (U0 + U1) / 2, 4.0, (V0 + V1) / 2);
  f.box(U1 - U0 + 0.4, 0.32, V1 - V0 + 0.4, trim, (U0 + U1) / 2, H - 0.32, (V0 + V1) / 2);
  f.put(hipRoofGeometry(U1 - U0 + 1.0, V1 - V0 + 1.0, 2.7), C.roofTile, (U0 + U1) / 2, H, (V0 + V1) / 2);
  for (const [u, v] of [[-5.5, -1.5], [6.5, 1.0]]) {
    f.box(0.7, 2.6, 0.7, ochre, u, H + 0.8, v);
    f.box(0.9, 0.2, 0.9, trim, u, H + 3.4, v);
  }
  for (const u of [U0 + 0.3, U1 - 0.3]) for (const v of [V0 + 0.3, V1 - 0.3]) f.box(0.7, H - 0.9, 0.7, trim, u, 0.6, v);

  // loggia on the garden side with a terrace and balustrade on top
  const L0 = -10.3, L1 = 1.9, LV = 5.4, LH = 4.2;
  f.box(L1 - L0, LH, LV - V1, ochre, (L0 + L1) / 2, 0, (V1 + LV) / 2);
  f.box(L1 - L0 + 0.2, 0.25, LV - V1 + 0.2, trim, (L0 + L1) / 2, LH - 0.25, (V1 + LV) / 2);
  for (let k = 0; k < 4; k++) {
    const u = L0 + (L1 - L0) * ((k + 0.5) / 4);
    f.relief(archShape(2.1, 3.3), 0.08, '#6b5233', u, 0.05, LV + 0.02);
    f.relief(archRing(2.1, 3.3, 0.2), 0.1, trim, u, 0.05, LV + 0.05);
  }
  if (hi) {
    for (let u = L0 + 0.3; u < L1 - 0.2; u += 0.36) f.cyl(0.07, 0.09, 0.62, 6, trim, u, LH, LV - 0.15);
    f.box(L1 - L0, 0.12, 0.25, trim, (L0 + L1) / 2, LH + 0.62, LV - 0.15);
  } else {
    f.box(L1 - L0, 0.74, 0.22, trim, (L0 + L1) / 2, LH, LV - 0.15);
  }
  opening(f, '+v', -4.2, LH + 0.05, V1, 1.1, 2.3, { fill: C.glass });

  // windows with green shutters, flower boxes facing the avenue, the front door
  const geranium = (u, y) => {
    if (!hi) return;
    f.box(1.2, 0.28, 0.32, '#3f6b33', u, y, V0 - 0.2);
    for (let k = -1; k <= 1; k++) f.sphere(0.17, k ? C.red : '#ff7aa8', u + k * 0.35, y + 0.38, V0 - 0.22);
  };
  for (const u of [-8.2, -4.6, 3.8, 7.6]) {
    opening(f, '-v', u, 1.2, V0, 1.0, 1.9, { arch: true, shutters: C.shutter });
    opening(f, '-v', u, 5.0, V0, 0.95, 1.7, { shutters: C.shutter, sill: true });
    geranium(u, 4.62);
  }
  opening(f, '-v', -0.4, 0.6, V0, 1.7, 2.9, { arch: true, fill: '#2f6b4a', fw: 0.28 });
  opening(f, '-v', -0.4, 5.0, V0, 0.95, 1.7, { shutters: C.shutter, sill: true });
  f.box(2.6, 0.18, 0.7, trim, -0.4, 3.75, V0 - 0.35);
  for (const u of [4.6, 8.4]) {
    opening(f, '+v', u, 1.2, V1, 1.0, 1.9, { shutters: C.shutter });
    opening(f, '+v', u, 5.0, V1, 0.95, 1.7, { shutters: C.shutter });
  }
  for (const u of [-7.6, -1.0]) opening(f, '+v', u, 5.0, V1, 0.95, 1.7, { shutters: C.shutter });
  for (const [face, u] of [['+u', U1], ['-u', U0]]) {
    for (const v of [-2.4, 1.6]) {
      opening(f, face, u, 1.2, v, 1.0, 1.9, { shutters: C.shutter });
      opening(f, face, u, 5.0, v, 0.95, 1.7, { shutters: C.shutter });
    }
  }
  // colourful bunting over the door: it is a play house after all
  if (hi) {
    const flags = [C.red, C.yellow, C.blue, C.green, C.orange, C.purple];
    for (let k = 0; k < 11; k++) {
      const u = -3.4 + k * 0.6, sag = 0.35 * Math.sin((k / 10) * Math.PI);
      f.put(new THREE.ConeGeometry(0.2, 0.42, 3), flags[k % flags.length], u, 4.35 - sag, V0 - 0.12, Math.PI, 0, 0);
    }
  }

  // --- playground: the strip along the avenue and the corner past the east end
  const g = new Frame(new GeoBuilder(), a.x, a.z, a.angle, y0);
  const pad = (pts, color) => {
    const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, -v)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    g.put(geo, color, 0, 0.06, 0);
  };
  pad([[-8.2, -7.7], [9.5, -7.7], [9.5, -12.6], [-8.2, -10.0]], C.rubber);
  pad([[15.6, -1.0], [23.5, -5.2], [23.5, -14.8], [15.6, -13.8]], C.rubberGreen);
  pad([[19.0, -9.4], [22.6, -9.4], [22.6, -13.0], [19.0, -13.0]], C.rubber);

  const solid = [];
  // swing frame along u at the avenue; the three seats are instanced and animated
  const sw = { u: 5.2, v: -10.3, half: 2.7, top: 2.55 };
  for (const s of [-1, 1]) {
    const u = sw.u + s * sw.half;
    f.beam([u, 0, sw.v - 1.15], [u, sw.top, sw.v], 0.14, C.red);
    f.beam([u, 0, sw.v + 1.15], [u, sw.top, sw.v], 0.14, C.red);
    solid.push([u, sw.v - 1.0, 0.4], [u, sw.v + 1.0, 0.4]);
  }
  f.put(new THREE.CylinderGeometry(0.09, 0.09, sw.half * 2 + 0.4, 8), C.blue, sw.u, sw.top, sw.v, 0, 0, Math.PI / 2);
  // seesaw: stand here, plank animated
  const ss = { u: -3.0, v: -9.0 };
  f.box(0.4, 0.55, 0.6, C.yellow, ss.u, 0, ss.v);
  solid.push([ss.u - 1.4, ss.v, 0.45], [ss.u, ss.v, 0.45], [ss.u + 1.4, ss.v, 0.45]);
  // spring horse
  {
    const u = -6.4, v = -8.9;
    f.cyl(0.18, 0.18, 0.5, 6, C.iron, u, 0, v);
    f.sphere(0.45, C.orange, u, 0.85, v, 1.5, 0.75, 0.75, 1);
    f.box(0.22, 0.6, 0.3, C.orange, u + 0.5, 1.05, v);
    f.box(0.45, 0.25, 0.28, C.orange, u + 0.68, 1.45, v);
    f.box(0.08, 0.3, 0.12, C.iron, u + 0.42, 1.2, v);
    solid.push([u, v, 0.55]);
  }
  // slide: ladder tower with a little roof, chute down towards the avenue
  {
    const u = 18.4, v = -4.6, top = 1.8;
    for (const [du, dv] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) f.box(0.12, top + 1.3, 0.12, C.blue, u + du, 0, v + dv);
    f.box(1.35, 0.12, 1.35, C.yellow, u, top, v);
    f.put(hipRoofGeometry(1.6, 1.6, 0.7), C.red, u, top + 1.3, v);
    for (const s of [-1, 1]) f.beam([u + s * 0.35, 0, v + 1.8], [u + s * 0.35, top, v + 0.62], 0.08, C.yellow);
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      f.box(0.7, 0.06, 0.08, C.yellow, u, top * t, v + 1.8 - 1.18 * t);
    }
    const L = Math.hypot(3.2, top), ang = Math.atan2(top, 3.2);
    f.put(new THREE.BoxGeometry(0.7, 0.08, L), C.orange, u, top / 2 + 0.1, v - 0.62 - 1.6, -ang, 0, 0);
    for (const s of [-1, 1]) f.put(new THREE.BoxGeometry(0.08, 0.25, L), C.red, u + s * 0.38, top / 2 + 0.25, v - 0.62 - 1.6, -ang, 0, 0);
    f.box(0.7, 0.08, 0.6, C.orange, u, 0.18, v - 4.4);
    solid.push([u, v, 1.0], [u, v - 2.4, 0.6], [u, v + 1.4, 0.5]);
  }
  // sandpit with a sandcastle, a bucket and a spade
  {
    const u = 20.8, v = -11.2, s = 3.2;
    for (const [du, dv, w, d] of [[0, -s / 2, s + 0.25, 0.25], [0, s / 2, s + 0.25, 0.25], [-s / 2, 0, 0.25, s], [s / 2, 0, 0.25, s]]) f.box(w, 0.35, d, C.oakLight, u + du, 0, v + dv);
    f.box(s - 0.1, 0.25, s - 0.1, C.sand, u, 0, v);
    f.cyl(0.5, 0.6, 0.45, 8, '#d9b878', u - 0.5, 0.2, v - 0.3);
    f.cyl(0.18, 0.2, 0.4, 6, '#d9b878', u - 0.5, 0.65, v - 0.3);
    f.put(new THREE.ConeGeometry(0.2, 0.3, 6), '#d9b878', u - 0.5, 1.2, v - 0.3);
    f.box(0.03, 0.25, 0.16, C.red, u - 0.5, 1.35, v - 0.3 + 0.1);
    f.cyl(0.2, 0.15, 0.3, 8, C.red, u + 0.7, 0.25, v + 0.6);
    f.box(0.1, 0.05, 0.6, C.blue, u + 0.4, 0.27, v - 0.8, 0.6);
    solid.push([u, v, 1.9]);
  }

  // moving parts
  const swingB = new GeoBuilder();
  for (const s of [-1, 1]) swingB.box(0.035, 2.0, 0.035, C.iron, s * 0.24, -1.0, 0);
  swingB.box(0.6, 0.07, 0.3, C.red, 0, -2.02, 0);
  const swings = new THREE.InstancedMesh(buildGeometry(swingB), mats().vcFlat, 3);
  swings.name = 'raffaello-swings';
  swings.castShadow = true;

  const seesawB = new GeoBuilder();
  seesawB.box(3.6, 0.1, 0.32, C.green, 0, 0, 0);
  for (const s of [-1, 1]) {
    seesawB.box(0.4, 0.12, 0.4, C.red, s * 1.6, 0.1, 0);
    seesawB.box(0.06, 0.4, 0.4, C.yellow, s * 1.25, 0.25, 0);
  }
  const seesaw = seesawB.build(undefined, { name: 'raffaello-seesaw' });

  const merryB = new GeoBuilder();
  merryB.cyl(1.4, 1.45, 0.16, 12, C.yellow, 0, 0.0, 0);
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2;
    merryB.box(1.3, 0.04, 0.5, [C.red, C.blue, C.green, C.purple][k], Math.cos(t) * 0.7, 0.1, -Math.sin(t) * 0.7, t);
    merryB.place(new THREE.TorusGeometry(0.35, 0.04, 4, 8, Math.PI), C.iron, Math.cos(t) * 0.95, 0.1, -Math.sin(t) * 0.95, 0, t + Math.PI / 2, 0);
  }
  merryB.cyl(0.08, 0.08, 1.0, 6, C.iron, 0, 0.55, 0);
  merryB.cyl(0.25, 0.25, 0.08, 8, C.red, 0, 1.05, 0);
  const merry = merryB.build(undefined, { name: 'raffaello-merry' });
  const mg = { u: 17.4, v: -10.2 };
  f.cyl(0.3, 0.4, 0.3, 8, C.iron, mg.u, 0, mg.v);
  solid.push([mg.u, mg.v, 1.55]);

  for (const [u, v, r] of solid) {
    const [x, z] = f.w(u, v);
    colliders.addCircle(x, z, r, 'fence');
  }
  colliders.addRing(a.footprint, 'building');
  // the postcard: the cart on the avenue before the front door, the playground to one side
  photoView(ctx, 'raffaello', { spot: f.w(1, -15.5), face: f.dir(-0.88, -0.48), cam: [...f.w(-1.5, -27.8), 3.6], look: [...f.w(1.8, -5), 4], far: f.w(0, -6) });
  ctx.reserve({ ring: [f.w(-13, -13), f.w(10.5, -15), f.w(25, -17), f.w(25, -3), f.w(16, 2), f.w(13, 8), f.w(-13, 8)] });

  const group = new THREE.Group();
  group.name = 'casina-raffaello';
  group.add(f.gb.build(undefined, { name: 'raffaello' }), g.gb.build(undefined, { castShadow: false, name: 'raffaello-ground' }));
  group.add(swings, seesaw, merry);
  const pivot = (mesh, m) => { mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true; };

  const phases = [0, 1.9, 3.6];
  const update = (dt, t) => {
    for (let i = 0; i < 3; i++) {
      const ang = 0.38 * Math.sin(t * 2.1 + phases[i]) * (0.6 + 0.4 * Math.sin(t * 0.3 + i));
      swings.setMatrixAt(i, f.matrix(sw.u + (i - 1) * 1.5, sw.top, sw.v, ang, 0, 0));
    }
    swings.instanceMatrix.needsUpdate = true;
    pivot(seesaw, f.matrix(ss.u, 0.68, ss.v, 0, 0, 0.22 * Math.sin(t * 1.3)));
    pivot(merry, f.matrix(mg.u, 0.3, mg.v, 0, t * 0.6, 0));
  };
  update(0, 0);
  swings.computeBoundingSphere();
  return { group, update };
}
