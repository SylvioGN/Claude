// The two gateways of the lake garden by Luigi Canina (1827-30): the Arco di Settimio Severo,
// a small single arch after the Arch of Titus crowned by the emperor's statue, and the
// Propilei Egizi, two Egyptian pavilions facing each other across the avenue with battered
// pylons, papyrus columns, a winged sun disk, painted hieroglyphs and four obelisks.
import * as THREE from 'three';
import { GeoBuilder } from '../../core/util.js';
import { frame, headingOf, figureTemplate, corinthianColumn, stamp, mat, frustum, absorb } from './kit.js';

export function buildArch(ctx, env) {
  const A = ctx.MAP.ANCHORS.arco;
  // the avenue runs through the arch across the footprint's long axis
  const h = headingOf(Math.sin(A.angle), -Math.cos(A.angle));
  const F = frame(A.x, ctx.terrain.heightAt(A.x, A.z), A.z, h);
  const gb = new GeoBuilder();
  const BODY = '#ecdfc2', TRIM = '#f6efe0', SHADE = '#d8cba9', DEEP = '#bfb08e';
  const HW = 4.7, D = 1.3, OPEN = 2.5, SPRING = 3.4, TOP = 7.2;

  gb.box(HW * 2 + 0.4, 0.3, D * 2 + 0.5, DEEP, 0, 0.15, 0);
  for (const s of [-1, 1]) {
    gb.box(HW - OPEN, TOP, D * 2, BODY, s * (OPEN + HW) / 2, TOP / 2, 0);                  // piers
    gb.box(HW - OPEN + 0.12, 0.22, D * 2 + 0.12, TRIM, s * (OPEN + HW) / 2, SPRING - 0.11, 0); // impost
  }
  const vault = new THREE.Shape();
  vault.moveTo(-OPEN, TOP);
  vault.lineTo(-OPEN, SPRING);
  vault.absarc(0, SPRING, OPEN, Math.PI, 0, true);
  vault.lineTo(OPEN, TOP);
  vault.closePath();
  gb.extrude(vault, D * 2, BODY, 0, 0, -D);
  for (const s of [-1, 1]) {
    const z = s * (D + 0.02);
    // archivolt, keystone and spandrel discs
    gb.place(new THREE.TorusGeometry(OPEN + 0.14, 0.14, 4, 14, Math.PI), TRIM, 0, SPRING, z);
    gb.box(0.55, 0.85, 0.3, TRIM, 0, SPRING + OPEN + 0.25, z);
    // engaged columns on pedestals
    for (const x of [-4.2, -3.05, 3.05, 4.2]) {
      gb.box(0.82, 1.3, 0.55, SHADE, x, 0.65, s * (D + 0.18));
      gb.box(0.92, 0.14, 0.62, TRIM, x, 1.32, s * (D + 0.18));
      corinthianColumn(gb, x, 1.39, s * (D + 0.2), TOP - 1.39 - 0.55, 0.24, TRIM, SHADE, 10);
    }
    // entablature breaking forward over the columns
    gb.box(HW * 2 + 0.3, 0.55, 0.5, TRIM, 0, TOP - 0.27, s * (D + 0.2));
    gb.box(HW * 2 + 0.6, 0.2, 0.75, TRIM, 0, TOP + 0.1, s * (D + 0.15));
    // figures of Victory in the spandrels, flying towards the keystone
    for (const sx of [-1, 1]) {
      gb.place(new THREE.IcosahedronGeometry(0.32, 0), TRIM, sx * 1.95, SPRING + 2.55, z + 0.05, 0, 0, sx * 0.9, 1.6, 0.6, 0.35);
      gb.sphere(0.13, 0, TRIM, sx * 1.55, SPRING + 2.75, z + 0.08);
      gb.place(new THREE.IcosahedronGeometry(0.3, 0), TRIM, sx * 2.25, SPRING + 3.0, z + 0.05, 0, 0, sx * -0.5, 1.4, 0.35, 0.3);
    }
  }
  // attic with the dedication and the emperor on top
  gb.box(HW * 2 - 0.6, 2.0, D * 2 - 0.2, BODY, 0, TOP + 1.2, 0);
  gb.box(HW * 2 - 0.3, 0.25, D * 2 + 0.1, TRIM, 0, TOP + 2.3, 0);
  for (const s of [-1, 1]) env.decals.quad(6.6, 1.55, env.R.archAttic, F.m.clone().multiply(mat(0, TOP + 1.2, s * (D - 0.09), s > 0 ? 0 : Math.PI)));
  gb.box(1.3, 0.55, 1.3, TRIM, 0, TOP + 2.7, 0);
  stamp(gb, figureTemplate('emperor', '#f1ece0', '#d9d1bf'), mat(0, TOP + 2.97, 0, 0, 1.35));

  env.group.add(F.place(gb.build(undefined, { name: 'arco-settimio-severo' })));
  for (const s of [-1, 1]) ctx.colliders.addBox(...F.w(s * (OPEN + HW) / 2, 0), HW - OPEN, D * 2 + 0.8, -h, 'building', { name: 'arco' });
  for (const s of [-1, 1]) ctx.reserve({ x: F.w(s * (OPEN + HW) / 2, 0)[0], z: F.w(s * (OPEN + HW) / 2, 0)[1], r: 3.2 });
}

export function buildPropylaea(ctx, env) {
  const A = ctx.MAP.ANCHORS.propilei;
  const ux = Math.cos(A.angle), uz = Math.sin(A.angle);
  const vx = -uz, vz = ux;
  // gate centre: on the avenue, between the mapped north pavilion and its mirror to the south
  const ox = A.x + ux * 0.5 + vx * 4.3, oz = A.z + uz * 0.5 + vz * 4.3;
  const h = headingOf(ux, uz);
  const F = frame(ox, ctx.terrain.heightAt(ox, oz), oz, h);
  const gb = new GeoBuilder();
  const HALF = 4.6, DEPTH = 2.8;

  for (const s of [-1, 1]) {
    const x = s * (HALF + DEPTH / 2);
    const M = mat(x, 0, 0, -s * Math.PI / 2);
    pavilion(gb, env, F.m.clone().multiply(M), M);
    for (const z of [-1, 1]) ctx.colliders.addCircle(...F.w(x - s * 0.6, z * 5.7), 0.75, 'statue', { name: 'obelisk' });
    ctx.colliders.addBox(...F.w(x, 0), DEPTH, 9.6, -h, 'building', { name: 'propilei' });
    ctx.reserve({ x: F.w(x, 0)[0], z: F.w(x, 0)[1], r: 6.5 });
  }
  env.group.add(F.place(gb.build(undefined, { name: 'propilei-egizi' })));
}

// One Egyptian pavilion facing +z (towards the avenue), 9.5 long on x, depth 2.8.
// M places it inside the gate frame (for the geometry); W is the full world matrix (for decals).
function pavilion(root, env, W, M) {
  const gb = new GeoBuilder();
  const PL = '#e5c88f', PL_SHADE = '#cfae74', PL_DARK = '#b8955c', COL = '#efdcae';
  const BLUE = '#2f5f9e', RED = '#b0402c', GREEN = '#4f8a5a', GOLD = '#d8a640';
  const deco = (w, hgt, r, x, y, z, rx = 0) => env.decals.quad(w, hgt, r, W.clone().multiply(mat(x, y, z, 0, 1, rx)));

  gb.box(9.8, 0.4, 3.0, PL_DARK, 0, 0.2, 0);
  // pylons with cavetto cornices and painted torus band
  for (const s of [-1, 1]) {
    const x = s * 3.65;
    frustum(gb, 2.2, 2.6, 1.84, 2.2, 6.2, PL, x, 0.4, 0);
    gb.box(1.9, 0.16, 2.26, BLUE, x, 6.5, 0);
    frustum(gb, 1.84, 2.2, 2.4, 2.75, 0.5, PL_SHADE, x, 6.58, 0);
    gb.box(2.45, 0.12, 2.8, PL, x, 7.14, 0);
    deco(1.4, 3.9, env.R.glyphPanel, x, 3.35, 1.21 + 0.02, -0.035);
  }
  // portico: back wall with a false door, two papyrus columns, lintel with the winged sun
  gb.box(5.1, 4.7, 0.6, PL_SHADE, 0, 2.75, -0.9);
  gb.box(1.3, 2.4, 0.1, '#7a5a3a', 0, 1.6, -0.55);
  gb.box(1.6, 0.25, 0.16, PL_DARK, 0, 2.9, -0.53);
  for (const s of [-1, 1]) deco(1.4, 2.9, env.R.glyphPanel, s * 1.7, 2.3, -0.58);
  for (const s of [-1, 1]) {
    const x = s * 1.15, z = 0.65;
    gb.cyl(0.36, 0.4, 0.3, 10, PL_DARK, x, 0.55, z);
    gb.cyl(0.27, 0.32, 3.4, 10, COL, x, 2.4, z);
    for (const [y, c] of [[1.0, BLUE], [1.12, RED], [3.6, BLUE], [3.75, RED], [3.9, GREEN]]) gb.cyl(0.3, 0.3, 0.08, 10, c, x, y, z);
    gb.cyl(0.56, 0.29, 0.7, 10, GREEN, x, 4.3, z);
    gb.cyl(0.57, 0.57, 0.08, 10, GOLD, x, 4.66, z);
    gb.box(0.62, 0.16, 0.62, PL_SHADE, x, 4.78, z);
  }
  gb.box(5.15, 0.85, 1.0, PL, 0, 5.28, 0.65);
  frustum(gb, 5.1, 2.6, 5.4, 3.0, 0.45, PL_SHADE, 0, 5.7, -0.15);
  gb.box(5.45, 0.1, 3.05, PL, 0, 6.2, -0.15);
  deco(2.6, 0.65, env.R.sunDisk, 0, 5.28, 1.16);
  for (const s of [-1, 1]) deco(1.15, 0.5, env.R.glyphFrieze, s * 1.95, 5.28, 1.16);
  // obelisks on pedestals at both ends, gilded pyramidions
  for (const s of [-1, 1]) {
    const x = s * 5.75, z = 0.6;
    gb.box(1.25, 0.3, 1.25, PL_DARK, x, 0.15, z);
    gb.box(1.05, 1.1, 1.05, PL, x, 0.85, z);
    gb.box(1.15, 0.14, 1.15, PL_SHADE, x, 1.45, z);
    frustum(gb, 0.62, 0.62, 0.4, 0.4, 4.6, '#c99886', x, 1.52, z);
    gb.place(new THREE.ConeGeometry(0.29, 0.5, 4), GOLD, x, 6.37, z, 0, Math.PI / 4, 0);
    deco(0.46, 4.2, env.R.obelisk, x, 3.7, z + 0.27, -0.024);
  }
  absorb(root, gb, M);
}
