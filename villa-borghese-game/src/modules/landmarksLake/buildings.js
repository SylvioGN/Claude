// Two buildings of the north-west: the Aranciera (the old orangery, now the Museo Carlo
// Bilotti) on Piazzale Victor Hugo with potted citrus trees, and the white neoclassical
// Galleria Nazionale d'Arte Moderna (Cesare Bazzani, 1911) just outside the park, with its
// giant columns, grand staircase and lettered attic.
import * as THREE from 'three';
import { GeoBuilder, PALETTE } from '../../core/util.js';
import { frame, headingOf, figureTemplate, corinthianColumn, stamp, mat, hipRoof, archPanel, steps, balustrade, absorb } from './kit.js';

const GLASS = '#55636e', TRIM = '#f6efdf', SHUTTER = '#4f7d55';

export function buildAranciera(ctx, env) {
  const A = ctx.MAP.ANCHORS.aranciera;
  // main front faces south-south-west over Piazzale Victor Hugo
  const h = headingOf(-Math.cos(A.angle + Math.PI / 2), -Math.sin(A.angle + Math.PI / 2));
  let y0 = Infinity;
  for (const [x, z] of A.footprint) y0 = Math.min(y0, ctx.terrain.heightAt(x, z));
  const F = frame(A.x, y0, A.z, h);
  const gb = new GeoBuilder();
  const WALL = '#efcb83', WALL_SHADE = '#e2b86c', BASE = '#d9cdb2', ROOF = PALETTE.roofTile;

  // main block (museum), turned a little against the long orangery wing like the real plan
  const bw = 15.6, bd = 10.8, bh = 9.4;
  const block = new GeoBuilder();
  block.box(bw + 0.3, 0.7, bd + 0.3, BASE, 0, 0.35, 0);
  block.box(bw, bh, bd, WALL, 0, bh / 2, 0);
  block.box(bw + 0.15, 0.25, bd + 0.15, TRIM, 0, 4.75, 0);           // string course
  block.box(bw + 0.6, 0.45, bd + 0.6, TRIM, 0, bh + 0.2, 0);          // cornice
  hipRoof(block, bw + 0.7, bd + 0.7, 2.6, ROOF, 0, bh + 0.42, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block.box(0.7, bh, 0.7, TRIM, sx * (bw / 2 - 0.3), bh / 2, sz * (bd / 2 - 0.3)); // quoins
  // windows on all four sides: arched french windows below, shuttered windows above
  const facade = (len, depth, ry, door) => {
    const n = Math.round(len / 2.9);
    const c = Math.cos(ry), sn = Math.sin(ry);
    // wall-local (u along the wall, dz out of the face) -> block-local [x, z]
    const P = (u, dz) => [u * c + (depth + dz) * sn, -u * sn + (depth + dz) * c];
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (len / n) * (i + 0.5);
      const isDoor = door && i === Math.floor(n / 2);
      const [x, z] = P(u, 0.02);
      const wg = new GeoBuilder();
      archPanel(wg, isDoor ? 2.0 : 1.55, isDoor ? 3.6 : 3.2, 0.16, TRIM, 0, 0, 0);
      archPanel(wg, isDoor ? 1.6 : 1.15, isDoor ? 3.35 : 2.95, 0.2, isDoor ? '#6b4b33' : GLASS, 0, 0, 0.02);
      absorb(block, wg, mat(x, 0.75, z, ry));
      block.box(1.45, 2.3, 0.14, TRIM, x, 6.6, z, ry);
      block.box(1.1, 1.95, 0.18, GLASS, x, 6.55, z, ry);
      const [lx, lz] = P(u, 0.08);
      block.box(1.4, 0.16, 0.3, TRIM, lx, 7.85, lz, ry);
      for (const sd of [-1, 1]) {
        const [sx, sz] = P(u + sd * 0.95, 0.06);
        block.box(0.5, 1.95, 0.06, SHUTTER, sx, 6.55, sz, ry);
      }
    }
  };
  facade(bw - 1.6, bd / 2, 0, true);
  facade(bw - 1.6, bd / 2, Math.PI, false);
  facade(bd - 1.6, bw / 2, Math.PI / 2, false);
  facade(bd - 1.6, bw / 2, -Math.PI / 2, false);
  // entrance steps and the museum's name over the door
  steps(block, 0, 0, bd / 2 + 1.4, 3.4, 3, 0.25, 0.45, BASE, '#cfc2a5');
  const bTwist = 0.149;
  const BM = mat(-2.4, 0, 2.1, -bTwist);
  env.decals.quad(5.6, 0.62, env.R.bilotti, F.m.clone().multiply(BM).multiply(mat(0, 5.2, bd / 2 + 0.03)));
  absorb(gb, block, BM);

  // long orangery wing: big arched windows, flat roof terrace with a balustrade
  const wx0 = -6.6, wx1 = 16.7, wz = -4.0, wd = 4.1, wh = 5.6;
  const wcx = (wx0 + wx1) / 2, wl = wx1 - wx0;
  gb.box(wl + 0.2, 0.6, wd + 0.2, BASE, wcx, 0.3, wz);
  gb.box(wl, wh, wd, WALL_SHADE, wcx, wh / 2, wz);
  gb.box(wl + 0.4, 0.35, wd + 0.4, TRIM, wcx, wh + 0.1, wz);
  for (const s of [-1, 1]) balustrade(gb, wx0 + 0.3, wz + s * (wd / 2 - 0.1), wx1 - 0.3, wz + s * (wd / 2 - 0.1), wh + 0.27, 0.8, TRIM, 0.45);
  balustrade(gb, wx1 - 0.1, wz - wd / 2 + 0.2, wx1 - 0.1, wz + wd / 2 - 0.2, wh + 0.27, 0.8, TRIM, 0.45);
  for (let x = wx0 + 1.4; x < wx1 - 0.8; x += 2.6) {
    for (const s of [-1, 1]) {
      if (s > 0 && x < 8.6) continue; // hidden behind the main block
      const z = wz + s * (wd / 2 + 0.02);
      const pg = new GeoBuilder();
      archPanel(pg, 1.9, 4.0, 0.16, TRIM, 0, 0, 0);
      archPanel(pg, 1.5, 3.75, 0.2, GLASS, 0, 0, 0.02);
      absorb(gb, pg, mat(x, 0.6, z, s > 0 ? 0 : Math.PI));
      gb.box(0.45, wh - 0.6, 0.12, TRIM, x + 1.3, wh / 2 + 0.3, z);
    }
  }

  // citrus trees in big terracotta vases along the front and the wing
  const citrus = (x, z, s = 1) => {
    ctx.colliders.addCircle(...F.w(x, z), 0.6 * s, 'pot', { name: 'citrus' });
    gb.cyl(0.55 * s, 0.4 * s, 0.85 * s, 10, PALETTE.terracotta, x, 0.42 * s, z);
    gb.cyl(0.6 * s, 0.6 * s, 0.12 * s, 10, '#b45a35', x, 0.85 * s, z);
    gb.cyl(0.07 * s, 0.09 * s, 0.9 * s, 5, PALETTE.umber, x, 1.3 * s, z);
    gb.sphere(0.85 * s, 1, '#3f6f36', x, 2.1 * s, z, 1, 0.92, 1);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.9 + x;
      gb.sphere(0.11 * s, 0, i % 3 ? '#f39c1f' : '#f5d33a', x + Math.cos(a) * 0.72 * s, 2.0 * s + Math.sin(i * 2.3) * 0.35 * s, z + Math.sin(a) * 0.72 * s);
    }
  };
  for (const s of [-1, 1]) for (const k of [1, 2]) {
    const [x, , z] = new THREE.Vector3(s * (2.6 + k * 2.6), 0, bd / 2 + 1.6).applyMatrix4(BM).toArray();
    citrus(x, z);
  }
  for (let x = 10; x < 16.5; x += 3) citrus(x, wz + wd / 2 + 1.3, 0.9);
  for (let x = wx0 + 2; x < wx1; x += 3.4) citrus(x, wz - wd / 2 - 1.3, 0.9);

  env.group.add(F.place(gb.build(undefined, { name: 'aranciera' })));
  ctx.colliders.addRing(A.footprint, 'building', { name: 'aranciera' }, 0.4);
  ctx.reserve({ ring: A.footprint });
  ctx.reserve({ x: A.x, z: A.z, r: 12 });
}

export function buildGnam(ctx, env) {
  const A = ctx.MAP.ANCHORS.gnam;
  // the facade faces south-south-west, towards the park and the Scalea Bruno Zevi
  const h = headingOf(Math.sin(A.angle), -Math.cos(A.angle));
  const F = frame(A.x, ctx.terrain.heightAt(A.x, A.z), A.z, h);
  const gb = new GeoBuilder();
  const WHITE = '#f2eee4', STONE = '#e6dfcf', SHADE = '#d3cab6', BASE = '#cfc6b2', WIN = '#5d6873';
  const front = 19, back = -19.8, baseH = 2.0, wallTop = 14, corniceTop = 15.2, atticTop = 16.6;

  // body on a rusticated podium (the back part is wider)
  gb.box(76, baseH, front - back, BASE, 0, baseH / 2, (front + back) / 2);
  gb.box(86, baseH, 16, BASE, 0, baseH / 2, back + 8);
  for (let y = 0.5; y < baseH; y += 0.5) gb.box(76.1, 0.06, front - back + 0.1, SHADE, 0, y, (front + back) / 2);
  gb.box(75, wallTop - baseH, front - back - 1, WHITE, 0, (wallTop + baseH) / 2, (front + back) / 2);
  gb.box(85, wallTop - baseH, 15, WHITE, 0, (wallTop + baseH) / 2, back + 8);
  gb.box(77, corniceTop - wallTop, front - back + 0.6, STONE, 0, (wallTop + corniceTop) / 2, (front + back) / 2 + 0.2);
  gb.box(87, corniceTop - wallTop, 16, STONE, 0, (wallTop + corniceTop) / 2, back + 8);
  gb.box(74.4, atticTop - corniceTop, 0.6, WHITE, 0, (corniceTop + atticTop) / 2, front - 0.6);
  gb.box(74.4, 0.25, 0.8, STONE, 0, atticTop + 0.1, front - 0.6);
  for (let x = -33; x < 34; x += 6) {
    if (Math.abs(x) > 12) env.decals.quad(6, 1.15, env.R.gnamFrieze, F.m.clone().multiply(mat(x, (corniceTop + atticTop) / 2, front - 0.28)));
  }
  // front: pilasters and tall windows; corner pavilions step forward
  for (let x = -36; x <= 36.1; x += 4.5) {
    if (Math.abs(x) < 12) continue;
    gb.box(0.8, wallTop - baseH, 0.4, STONE, x, (wallTop + baseH) / 2, front - 0.3);
    if (x < 35) {
      const wx = x + 2.25;
      if (Math.abs(wx) < 12) continue;
      gb.box(2.1, 4.6, 0.12, SHADE, wx, 9.4, front - 0.45);
      gb.box(1.7, 4.2, 0.16, WIN, wx, 9.3, front - 0.42);
      gb.box(2.3, 0.3, 0.4, STONE, wx, 11.85, front - 0.35);
      gb.box(1.4, 1.8, 0.14, WIN, wx, 4.4, front - 0.44);
    }
  }
  for (const s of [-1, 1]) {
    gb.box(5.6, atticTop + 0.8, 1.6, WHITE, s * 34.6, (atticTop + 0.8) / 2, front + 0.2);
    gb.box(6.0, 0.5, 1.9, STONE, s * 34.6, atticTop + 1.0, front + 0.25);
    for (const dx of [-1.9, 1.9]) gb.box(0.7, wallTop - baseH, 0.35, STONE, s * 34.6 + dx, (wallTop + baseH) / 2, front + 1.1);
    archPanel(gb, 2.2, 6.5, 0.2, WIN, s * 34.6, 4.0, front + 1.05);
    gb.box(4.2, 1.3, 0.2, SHADE, s * 34.6, 13.0, front + 1.05);
  }

  // central portico: giant Corinthian columns in pairs, grand doorway, lettered attic, sculpture groups
  const pz = 25.7;
  gb.box(24, baseH, pz - front, BASE, 0, baseH / 2, (pz + front) / 2);
  gb.box(22, wallTop - baseH, 0.8, WHITE, 0, (wallTop + baseH) / 2, front + 3.4);
  gb.box(1.2, wallTop - baseH, pz - front - 1, WHITE, -11.4, (wallTop + baseH) / 2, front + (pz - front) / 2);
  gb.box(1.2, wallTop - baseH, pz - front - 1, WHITE, 11.4, (wallTop + baseH) / 2, front + (pz - front) / 2);
  for (const x of [-10.2, -8.6, -3.4, -1.8, 1.8, 3.4, 8.6, 10.2]) corinthianColumn(gb, x, baseH, pz - 0.8, wallTop - baseH, 0.55, WHITE, SHADE, 10);
  archPanel(gb, 3.4, 8.5, 0.3, SHADE, 0, baseH, front + 3.85);
  archPanel(gb, 2.8, 8.0, 0.3, '#5a4a3b', 0, baseH, front + 3.95);
  for (const s of [-1, 1]) {
    archPanel(gb, 2.2, 5.0, 0.3, SHADE, s * 6, baseH + 1.4, front + 3.85);
    gb.box(1.2, 0.5, 0.8, STONE, s * 6, baseH + 1.65, front + 4.2);
    stamp(gb, figureTemplate(s < 0 ? 'lady' : 'robed', WHITE, SHADE), mat(s * 6, baseH + 1.9, front + 4.2, 0, 1.45));
  }
  gb.box(24.4, corniceTop - wallTop + 0.2, pz - front + 0.6, STONE, 0, (wallTop + corniceTop) / 2, (pz + front) / 2 + 0.1);
  gb.box(23, 3.2, pz - front - 0.6, WHITE, 0, corniceTop + 1.6, (pz + front) / 2 - 0.2);
  gb.box(23.6, 0.35, pz - front, STONE, 0, corniceTop + 3.35, (pz + front) / 2 - 0.2);
  env.decals.quad(21, 1.3, env.R.gnamText, F.m.clone().multiply(mat(0, corniceTop + 1.65, pz - 0.48)));
  for (const s of [-1, 1]) {
    gb.box(3.2, 1.2, 3.0, STONE, s * 10.2, corniceTop + 4.1, pz - 2.0);
    sculptureGroup(gb, s * 10.2, corniceTop + 4.7, pz - 2.0, WHITE);
  }

  // grand staircase between two pedestals with lions
  steps(gb, 0, 0, pz + 6.4, 24, 8, baseH / 8, 0.8, STONE, SHADE);
  for (const s of [-1, 1]) {
    gb.box(3.0, baseH + 0.6, 6.6, BASE, s * 13.6, (baseH + 0.6) / 2, pz + 3.1);
    lion(gb, s * 13.6, baseH + 0.6, pz + 3.6, WHITE);
  }

  env.group.add(F.place(gb.build(undefined, { name: 'gnam' })));
  ctx.colliders.addRing(A.footprint, 'building', { name: 'gnam' }, 0.4);
  ctx.reserve({ ring: A.footprint });
}

// Allegorical group on the attic: a winged figure over a rearing horse.
function sculptureGroup(gb, x, y, z, c) {
  gb.box(1.0, 1.1, 2.2, c, x, y + 1.2, z, 0, -0.5);                  // horse body, rearing
  gb.box(0.45, 1.1, 0.5, c, x, y + 2.1, z + 1.0, 0, -0.9);            // neck and head
  for (const dx of [-0.3, 0.3]) gb.box(0.2, 1.2, 0.25, c, x + dx, y + 0.6, z - 0.7);
  stamp(gb, figureTemplate('robed', c, '#e1d9c8'), mat(x, y, z - 1.0, 0, 1.2));
  for (const s of [-1, 1]) gb.box(0.12, 1.4, 0.9, c, x + s * 0.5, y + 2.6, z - 1.2, s * 0.6, 0.4);
}

function lion(gb, x, y, z, c) {
  gb.box(1.1, 1.0, 2.6, c, x, y + 0.5, z - 0.2);
  gb.sphere(0.75, 1, '#e9e2d2', x, y + 1.35, z + 1.0);
  gb.box(0.55, 0.5, 0.5, c, x, y + 1.2, z + 1.6);
  for (const dx of [-0.35, 0.35]) gb.box(0.3, 0.3, 1.0, c, x + dx, y + 0.15, z + 1.4);
}
