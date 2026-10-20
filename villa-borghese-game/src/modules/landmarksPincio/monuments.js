// Smaller Pincio landmarks: the Fontana del Mosè (baby Moses in his basket among the papyrus),
// the Obelisk of Antinous, Casina Valadier and the San Carlino puppet theatre with Pulcinella.
import * as THREE from 'three';
import { COL, local, balustrade, lampPost, faceY } from './kit.js';
import { ringCentroid, closestOnPolyline } from '../../core/geo.js';
import { GeoBuilder, mats } from '../../core/util.js';
import { nearestWater } from './clock.js';

export function buildMoses(ctx, tb) {
  const { MAP, terrain: T } = ctx;
  const a = MAP.ANCHORS.mose;
  const pond = MAP.WATER.find((w) => /Mos/.test(w.n || '')) || nearestWater(MAP, a.x, a.z);
  const [x, z] = pond ? ringCentroid(pond.r) : [a.x, a.z];
  const g = T.heightAt(x, z), water = g + 0.45;
  const rnd = ctx.rng('pincio-moses');
  const L = local(x, g, z, 0.6);
  const K = local(x, g, z, 0.6, 1.3);

  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2, r = k ? 0.55 : 0;
    tb.sphere(0.55 + rnd() * 0.15, 0, COL.travertineShade, ...L(Math.cos(ang) * r, 0.5, Math.sin(ang) * r), 1.25, 0.65, 1.1);
  }
  // the basket with the baby: rosy face, dark curls, little arms reaching up, blue blanket
  const by = 0.7;
  tb.orient(new THREE.SphereGeometry(0.65, 9, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), COL.wicker, ...K(0, by + 0.32, 0), 0.6, 0, 0, 1.45, 0.75, 0.85);
  tb.orient(new THREE.TorusGeometry(0.65, 0.08, 4, 12), '#a2733b', ...K(0, by + 0.32, 0), 0.6, Math.PI / 2, 0, 1.45, 0.85, 1);
  tb.orient(new THREE.SphereGeometry(0.58, 8, 4), '#b9d6f0', ...K(-0.15, by + 0.36, 0), 0.6, 0, 0, 1.15, 0.3, 0.72);
  tb.sphere(0.27, 1, '#eab08e', ...K(0.52, by + 0.5, 0));
  tb.sphere(0.23, 1, '#6b4128', ...K(0.6, by + 0.58, 0), 1, 0.85, 1.05);
  for (const s of [-1, 1]) {
    tb.orient(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 5), '#eab08e', ...K(0.2, by + 0.62, s * 0.2), 0.6, s * 0.35, 0.35);
    tb.sphere(0.07, 0, '#eab08e', ...K(0.25, by + 0.78, s * 0.25));
  }
  // papyrus clumps
  for (let c = 0; c < 4; c++) {
    const ang = (c / 4) * Math.PI * 2 + 0.8, r = 1.05 + rnd() * 0.25;
    const cx = Math.cos(ang) * r, cz = Math.sin(ang) * r;
    for (let k = 0; k < 6; k++) {
      const h = 0.8 + rnd() * 0.7, tilt = 0.1 + rnd() * 0.3, dir = rnd() * Math.PI * 2;
      const tx = Math.sin(dir) * Math.sin(tilt) * h, tz = Math.cos(dir) * Math.sin(tilt) * h;
      tb.orient(new THREE.CylinderGeometry(0.02, 0.03, h, 3), COL.papyrus, ...L(cx + tx / 2, 0.7 + h / 2, cz + tz / 2), dir, tilt, 0);
      tb.orient(new THREE.ConeGeometry(0.17, 0.24, 6), COL.papyrusTop, ...L(cx + tx, 0.7 + h + 0.03, cz + tz), dir, Math.PI + tilt, 0);
    }
    tb.cone(0.26, 0.45, 5, '#4d8a35', ...L(cx, 0.85, cz));
  }
  return { x, z, water };
}

export function buildObelisk(ctx, tb) {
  const { MAP, terrain: T, colliders } = ctx;
  const a = MAP.ANCHORS.obelisco;
  const { x, z } = a;
  const g = T.heightAt(x, z) - 0.1;
  const L = local(x, g, z, 0);
  const steps = [[4.4, 0.3], [3.8, 0.3], [3.2, 0.3]];
  let y = 0;
  for (const [w, h] of steps) { tb.box(w, h + (y ? 0 : 0.4), w, COL.travertine, ...L(0, y + h / 2 - (y ? 0 : 0.2), 0)); y += h; }
  tb.box(2.5, 0.35, 2.5, COL.trim, ...L(0, y + 0.17, 0)); y += 0.35;
  tb.box(2.1, 2.4, 2.1, COL.travertine, ...L(0, y + 1.2, 0));
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2, F = local(x, g, z, ry);
    tb.box(1.3, 1.1, 0.06, COL.marble, ...F(0, y + 1.25, 1.06), ry);
  }
  y += 2.4;
  tb.box(2.5, 0.4, 2.5, COL.trim, ...L(0, y + 0.2, 0)); y += 0.4;
  tb.box(1.5, 0.45, 1.5, COL.travertineShade, ...L(0, y + 0.22, 0)); y += 0.45;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tb.sphere(0.22, 0, COL.bronze, ...L(sx * 0.62, y + 0.1, sz * 0.62), 1, 0.7, 1);

  // shaft (square, tapering), hieroglyph panels, pyramidion and a little star
  const H = 9.4, w0 = 0.52, w1 = 0.36;
  tb.place(new THREE.CylinderGeometry(w1 * Math.SQRT2, w0 * Math.SQRT2, H, 4, 1), COL.granite, ...L(0, y + H / 2, 0), 0, Math.PI / 4, 0);
  const taper = Math.atan((w0 - w1) / H);
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2, F = local(x, g, z, ry);
    tb.tex('glyphs');
    tb.orient(new THREE.PlaneGeometry(0.54, H - 0.7), COL.granite, ...F(0, y + H / 2 - 0.1, (w0 + w1) / 2 + 0.012), ry, -taper, 0);
    tb.tex(null);
  }
  y += H;
  tb.place(new THREE.ConeGeometry(w1 * Math.SQRT2, 0.8, 4), COL.granite, ...L(0, y + 0.4, 0), 0, Math.PI / 4, 0);
  tb.cyl(0.04, 0.04, 0.5, 4, COL.bronze, ...L(0, y + 0.95, 0));
  tb.place(new THREE.OctahedronGeometry(0.2, 0), COL.gilt, ...L(0, y + 1.3, 0), 0, 0, 0, 1, 1.4, 0.4);
  colliders.addCircle(x, z, 2.3, 'statue', { name: 'Obelisco di Antinoo' });
  // lamps round the edge of Piazza Bucarest, between the avenues
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    const lx = x + Math.cos(ang) * 10.4, lz = z + Math.sin(ang) * 10.4;
    const np = T.nearestPath(lx, lz);
    if (np && np.d < np.w / 2 + 0.4) continue;
    lampPost(tb, lx, T.heightAt(lx, lz), lz);
    colliders.addCircle(lx, lz, 0.3, 'lamp');
  }
  return { x, z };
}

// Casina Valadier: Valadier's near-cubic neoclassical villa with a semicircular Ionic exedra on
// its north-east end (terrace on top), a lower wing to the south-west, and the café's umbrellas.
export function buildValadier(ctx, tb) {
  const { MAP, terrain: T, colliders } = ctx;
  const a = MAP.ANCHORS.valadier;
  const ry = -a.angle;
  const fp = a.footprint || [];
  const g = Math.min(T.heightAt(a.x, a.z), ...fp.map(([x, z]) => T.heightAt(x, z)));
  const L = local(a.x, g, a.z, ry);
  const rnd = ctx.rng('pincio-valadier');
  const S = '#f4dfb0', TR = COL.trim;
  // main block, exedra and wing in local units (x along the long axis, towards the exedra)
  const x0 = -5.4, x1 = 5.35, hz = 4.1, ex = 2.55, w0 = -7.3, whz = 2.25;
  const cx = (x0 + x1) / 2, bw = x1 - x0;
  const F1 = 0.6, F2 = 4.5, F3 = 8.0, TOP = 9.9;

  tb.box(bw + 0.5, 1.6, hz * 2 + 0.5, COL.travertineShade, ...L(cx, -0.2, 0), ry);
  tb.box(bw, TOP - F1, hz * 2, S, ...L(cx, (F1 + TOP) / 2, 0), ry);
  for (let y = F1 + 0.6; y < F2 - 0.3; y += 0.7) tb.box(bw + 0.08, 0.1, hz * 2 + 0.08, '#e3d0a8', ...L(cx, y, 0), ry);
  tb.box(bw + 0.3, 0.3, hz * 2 + 0.3, TR, ...L(cx, F2, 0), ry);
  tb.box(bw + 0.2, 0.18, hz * 2 + 0.2, TR, ...L(cx, F3, 0), ry);
  tb.box(bw + 0.7, 0.5, hz * 2 + 0.7, TR, ...L(cx, TOP + 0.2, 0), ry);
  tb.box(bw - 0.3, 0.2, hz * 2 - 0.3, '#cdbb98', ...L(cx, TOP + 0.5, 0), ry);
  for (const sx of [x0, x1]) for (const sz of [-hz, hz]) tb.box(0.55, TOP - F1, 0.55, TR, ...L(sx - Math.sign(sx) * 0.2, (F1 + TOP) / 2, sz - Math.sign(sz) * 0.2), ry);
  const roof = [[x0 + 0.15, -hz + 0.15], [x1 - 0.15, -hz + 0.15], [x1 - 0.15, hz - 0.15], [x0 + 0.15, hz - 0.15], [x0 + 0.15, -hz + 0.15]]
    .map(([lx, lz]) => { const p = L(lx, 0, lz); return [p[0], p[2]]; });
  balustrade(tb, roof, () => g + TOP + 0.45, { height: 0.85, panel: 2.0 });
  tb.decal('signValadier', 4.6, 0.62, ...L(cx, F3 + 0.95, -hz - 0.02), ry + Math.PI);

  // windows on the long sides: arched doors below, pedimented windows on the piano nobile, attic
  const win = (lx, lz, side) => {
    const r = ry + (side < 0 ? Math.PI : 0), o = side * 0.02;
    tb.decal('window', 1.1, 2.4, ...L(lx, F1 + 1.45, lz + o), r);
    tb.decal('window', 1.05, 2.2, ...L(lx, F2 + 1.45, lz + o), r);
    tb.decal('window', 0.9, 0.85, ...L(lx, F3 + 0.95, lz + o), r);
    tb.box(1.5, 0.16, 0.2, TR, ...L(lx, F2 + 2.68, lz + side * 0.1), ry);
    tb.place(new THREE.ConeGeometry(0.85, 0.42, 3), TR, ...L(lx, F2 + 2.95, lz + side * 0.06), 0, ry + (side < 0 ? Math.PI : 0), 0, 1, 1, 0.12);
    tb.box(1.3, 0.12, 0.16, TR, ...L(lx, F2 + 0.2, lz + side * 0.08), ry);
  };
  for (const lx of [-3.6, -1.2, 1.2, 3.6]) for (const side of [-1, 1]) {
    if (side < 0 && Math.abs(lx) < 2) continue;
    win(cx + lx, side * hz, side);
  }
  // a main door under the name on the north-west front
  tb.decal('window', 1.6, 3.0, ...L(cx, F1 + 1.5, -hz - 0.02), ry + Math.PI);
  tb.box(2.2, 0.25, 0.4, TR, ...L(cx, F1 + 3.15, -hz - 0.15), ry);

  // semicircular Ionic exedra with a terrace on top
  const E = (ang, r, y) => L(x1 + Math.cos(ang) * r, y, Math.sin(ang) * r);
  const N = 7;
  for (let i = 0; i < N; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / (N - 1);
    tb.cyl(0.2, 0.24, F2 - F1 - 0.4, 8, TR, ...E(ang, ex, (F1 + F2 - 0.4) / 2));
    tb.box(0.55, 0.16, 0.55, TR, ...E(ang, ex, F2 - 0.45), ry - ang);
  }
  tb.place(new THREE.CylinderGeometry(ex + 0.35, ex + 0.35, 0.55, 14, 1, false, ry, Math.PI), TR, ...E(0, 0, F2 - 0.2));
  tb.place(new THREE.CylinderGeometry(ex - 0.6, ex - 0.6, F2 - F1, 12, 1, false, ry, Math.PI), S, ...E(0, 0, (F1 + F2) / 2));
  tb.place(new THREE.CylinderGeometry(ex + 0.5, ex + 0.6, 0.6, 14, 1, false, ry, Math.PI), COL.travertineShade, ...E(0, 0, F1 - 0.3));
  const arc = [];
  for (let i = 0; i <= 8; i++) { const p = E(-Math.PI / 2 + (i * Math.PI) / 8, ex + 0.1, 0); arc.push([p[0], p[2]]); }
  balustrade(tb, arc, () => g + F2 + 0.08, { height: 0.9, panel: 1.1 });
  for (const lz of [-1.2, 1.2]) tb.decal('window', 1.0, 2.2, ...L(x1 + 0.02, F2 + 1.45, lz), ry + Math.PI / 2);

  // lower wing to the south-west with its own roof terrace
  const wc = (w0 + x0) / 2, ww = x0 - w0 + 0.2;
  tb.box(ww, F3 - F1, whz * 2, S, ...L(wc, (F1 + F3) / 2, 0), ry);
  tb.box(ww + 0.3, 1.6, whz * 2 + 0.3, COL.travertineShade, ...L(wc, -0.2, 0), ry);
  tb.box(ww + 0.4, 0.4, whz * 2 + 0.4, TR, ...L(wc, F3 + 0.1, 0), ry);
  for (const lz of [-1.1, 1.1]) {
    tb.decal('window', 1.0, 2.2, ...L(w0 - 0.02, F1 + 1.4, lz), ry - Math.PI / 2);
    tb.decal('window', 1.0, 2.0, ...L(w0 - 0.02, F2 + 1.4, lz), ry - Math.PI / 2);
  }
  const wr = [[w0 + 0.15, -whz + 0.15], [w0 + 0.15, whz - 0.15]].map(([lx, lz]) => { const p = L(lx, 0, lz); return [p[0], p[2]]; });
  balustrade(tb, wr, () => g + F3 + 0.3, { height: 0.85, panel: 1.6 });

  if (fp.length > 2) colliders.addRing(fp, 'building', { name: 'Casina Valadier' }, 0.25);
  else colliders.addBox(a.x, a.z, a.len, a.wid, a.angle, 'building', { name: 'Casina Valadier' });

  // café umbrellas and tables on the panoramic side, where there is room
  for (const [lx, lz] of [[-4, hz + 3], [0, hz + 3.2], [4, hz + 3], [w0 - 3, 0], [w0 - 3, 3.5], [-4, hz + 6.4], [0.5, hz + 6.6]]) {
    const [px, , pz] = L(lx, 0, lz);
    const np = T.nearestPath(px, pz);
    if (!T.isInside(px, pz) || (np && np.d < np.w / 2 + 1.2) || !colliders.isFree(px, pz, 1.4)) continue;
    const y = T.heightAt(px, pz);
    tb.cyl(0.05, 0.05, 2.5, 5, '#d9d4c7', px, y + 1.25, pz);
    tb.cone(1.5, 0.65, 8, '#fbf8f0', px, y + 2.65, pz);
    tb.cyl(0.55, 0.55, 0.06, 8, '#f2efe8', px, y + 0.78, pz);
    tb.cyl(0.06, 0.12, 0.76, 5, '#9a9387', px, y + 0.38, pz);
    for (let k = 0; k < 3; k++) {
      const an = (k / 3) * Math.PI * 2 + rnd();
      tb.box(0.42, 0.45, 0.42, '#c9a46a', px + Math.cos(an) * 0.9, y + 0.23, pz + Math.sin(an) * 0.9, an);
    }
    colliders.addCircle(px, pz, 0.75, 'bench', { name: 'café table' });
  }
  return { x: a.x, z: a.z, ry, g };
}

// Teatro San Carlino: a little yellow theatre with a red proscenium, striped curtains, a painted
// Bay of Naples, posters and pennants. Pulcinella and the crocodile bob in the window.
export function buildSanCarlino(ctx, tb) {
  const { MAP, terrain: T, colliders } = ctx;
  const a = MAP.ANCHORS.sancarlino;
  const fp = a.footprint || [];
  // The stage looks across the lawn to Viale dei Bambini (or west when that avenue is missing).
  let fx = -Math.sin(a.angle), fz = Math.cos(a.angle);
  const avenue = MAP.PATHS.find((p) => p.n === 'Viale dei Bambini' && p.p.some(([px, pz]) => Math.hypot(px - a.x, pz - a.z) < 60));
  const c = avenue ? closestOnPolyline(a.x, a.z, avenue.p) : { x: a.x - 10, z: a.z };
  if ((c.x - a.x) * fx + (c.z - a.z) * fz < 0) { fx = -fx; fz = -fz; }
  const ry = faceY(fx, fz);
  const len = a.len || 9, dep = a.wid || 2.7;
  const g = Math.min(T.heightAt(a.x, a.z), ...fp.map(([x, z]) => T.heightAt(x, z)));
  const L = local(a.x, g, a.z, ry);
  const front = dep / 2;

  tb.box(len, 1.3, dep, COL.theatreGreen, ...L(0, 0.05, 0), ry);
  tb.box(len, 2.9, dep, COL.theatre, ...L(0, 0.7 + 1.45, 0), ry);
  tb.box(len + 0.2, 0.2, dep + 0.2, COL.trim, ...L(0, 3.6, 0), ry);
  // gable roof along the length
  const tri = new THREE.Shape([new THREE.Vector2(-dep / 2 - 0.35, 0), new THREE.Vector2(dep / 2 + 0.35, 0), new THREE.Vector2(0, 1.1)]);
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: len + 0.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -(len + 0.5) / 2);
  tb.orient(roofGeo, COL.roofTile, ...L(0, 3.7, 0), ry + Math.PI / 2);
  // proscenium frame round the stage opening
  const ow = 2.8, oh = 1.55, oy = 1.75;
  const R = COL.curtain;
  tb.box(0.55, 3.2, 0.3, R, ...L(-(ow / 2 + 0.27), 0.7 + 1.6, front + 0.15), ry);
  tb.box(0.55, 3.2, 0.3, R, ...L(ow / 2 + 0.27, 0.7 + 1.6, front + 0.15), ry);
  tb.box(ow + 1.1, 0.65, 0.3, R, ...L(0, oy + oh + 0.32, front + 0.15), ry);
  tb.box(ow + 1.1, 0.25, 0.4, COL.gilt, ...L(0, oy - 0.12, front + 0.2), ry);
  tb.box(ow, 0.9, 0.3, COL.curtain, ...L(0, oy - 0.7, front + 0.15), ry);
  tb.decal('backdrop', ow, oh, ...L(0, oy + oh / 2, front + 0.01), ry);
  tb.decal('stripes', 0.6, oh, ...L(-ow / 2 + 0.3, oy + oh / 2, front + 0.2), ry);
  tb.decal('stripes', 0.6, oh, ...L(ow / 2 - 0.3, oy + oh / 2, front + 0.2), ry);
  tb.decal('stripes', ow, 0.32, ...L(0, oy + oh - 0.16, front + 0.21), ry);
  // name board, posters, pennants
  tb.box(4.8, 0.8, 0.14, COL.trim, ...L(0, 4.25, front + 0.05), ry);
  tb.decal('signCarlino', 4.5, 0.64, ...L(0, 4.25, front + 0.13), ry);
  for (const s of [-1, 1]) {
    tb.decal('poster', 1.0, 1.0, ...L(s * 3.0, 2.3, front + 0.01), ry);
    tb.cyl(0.04, 0.04, 2.0, 4, COL.iron, ...L(s * (len / 2 - 0.3), 4.6, 0));
    tb.place(new THREE.ConeGeometry(0.25, 0.8, 3), s < 0 ? COL.flowerRed : '#2f8f4e', ...L(s * (len / 2 - 0.3) - s * 0.42, 5.35, 0), 0, ry, s * Math.PI / 2);
  }
  // little doors on the back, flower boxes
  tb.decal('window', 0.9, 1.9, ...L(len / 2 - 1.2, 1.65, -front - 0.01), ry + Math.PI);
  for (const s of [-1, 1]) tb.box(1.4, 0.3, 0.3, '#a0522d', ...L(s * 3.0, 1.55, front + 0.15), ry);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) tb.place(new THREE.OctahedronGeometry(0.11, 0), k % 2 ? COL.flowerRed : COL.flowerWhite, ...L(s * 3.0 - 0.45 + k * 0.3, 1.78, front + 0.15));

  if (fp.length > 2) colliders.addRing(fp, 'building', { name: 'San Carlino' }, 0.25);
  // a row of small benches for the children in front of the stage
  for (const lx of [-2.4, 0, 2.4]) {
    const [px, , pz] = L(lx, 0, front + 1.8);
    const np = T.nearestPath(px, pz);
    if (np && np.d < np.w / 2 + 0.6) continue;
    const y = T.heightAt(px, pz);
    tb.box(1.9, 0.08, 0.42, '#8a5a36', px, y + 0.42, pz, ry);
    for (const s of [-0.8, 0.8]) tb.box(0.1, 0.4, 0.36, '#5c3b22', ...local(px, y, pz, ry)(s, 0.2, 0), ry);
    colliders.addBox(px, pz, 1.9, 0.5, -ry, 'bench', { name: 'puppet bench' });
  }
  return { x: a.x, z: a.z, g, ry, front, stage: oy };
}

// The two puppets, each its own small mesh so they can move on their own.
export function createPuppets(ctx, site) {
  const { x, z, g, ry, front, stage } = site;
  const L0 = local(x, g, z, ry);
  const mk = (build, lx, name) => {
    const gb = new GeoBuilder();
    build(gb);
    const m = gb.build(mats().vcFlat, { castShadow: false, receiveShadow: false, name });
    const [px, py, pz] = L0(lx, stage - 0.35, front + 0.1);
    m.position.set(px, py, pz);
    m.rotation.y = ry;
    m.matrixAutoUpdate = true;
    ctx.scene.add(m);
    return m;
  };
  // Pulcinella: white smock, black half mask, tall white hat, a stick
  const pulci = mk((b) => {
    b.cyl(0.18, 0.3, 0.75, 7, '#f7f4ec', 0, 0.37, 0);
    b.sphere(0.17, 1, COL.skin, 0, 0.9, 0);
    b.sphere(0.165, 1, '#151515', 0, 0.94, 0.04, 1, 0.55, 1);
    b.place(new THREE.ConeGeometry(0.05, 0.16, 4), '#151515', 0, 0.9, 0.2, Math.PI / 2, 0, 0);
    b.cone(0.13, 0.5, 7, '#f7f4ec', 0, 1.25, 0);
    b.sphere(0.06, 0, COL.flowerRed, 0, 1.52, 0);
    b.cyl(0.06, 0.07, 0.45, 5, '#f7f4ec', 0.25, 0.68, 0.05, 0, 0, -0.9);
    b.cyl(0.035, 0.035, 0.75, 4, '#7a4a25', 0.5, 0.95, 0.08, 0, 0, -0.35);
  }, -0.55, 'pincio-pulcinella');
  // a friendly green crocodile
  const croc = mk((b) => {
    b.cyl(0.2, 0.28, 0.6, 7, '#3f9a4a', 0, 0.3, 0);
    b.sphere(0.22, 1, '#47a852', 0, 0.72, 0);
    b.box(0.5, 0.12, 0.26, '#47a852', -0.32, 0.72, 0.02);
    b.box(0.48, 0.08, 0.24, '#3a8a44', -0.3, 0.6, 0.02);
    for (let k = 0; k < 4; k++) b.cone(0.03, 0.07, 3, '#ffffff', -0.15 - k * 0.1, 0.64, 0.12);
    for (const s of [-0.09, 0.09]) {
      b.sphere(0.07, 0, '#ffffff', -0.02, 0.92, s + 0.03);
      b.sphere(0.035, 0, '#111111', -0.06, 0.93, s + 0.05);
    }
  }, 0.75, 'pincio-crocodile');
  let t0 = 0;
  const base = pulci.position.y, cbase = croc.position.y;
  const cam = ctx.camera.position;
  return {
    update(dt) {
      if (Math.abs(cam.x - x) > 90 || Math.abs(cam.z - z) > 90) return;
      t0 += dt;
      const hop = Math.abs(Math.sin(t0 * 3.1));
      pulci.position.y = base + hop * 0.12;
      pulci.rotation.z = Math.sin(t0 * 2.2) * 0.25;
      croc.position.y = cbase + Math.max(0, Math.sin(t0 * 1.3)) * 0.3 - 0.05;
      croc.rotation.z = Math.sin(t0 * 4.0 + 1) * 0.12;
    },
  };
}
