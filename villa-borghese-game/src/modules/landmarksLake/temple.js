// Temple of Aesculapius on the lake island (Antonio and Mario Asprucci, 1785-92): an Ionic
// tetrastyle portico on a podium with steps running down into the water, the Greek dedication
// on the frieze, the stucco relief of the god's arrival in Rome, statues on the roof and the
// statue of Aesculapius in the cella. The island gets laurel bushes and a pair of cypresses.
import * as THREE from 'three';
import { GeoBuilder, PALETTE } from '../../core/util.js';
import { pointInRing, distToRingEdge } from '../../core/geo.js';
import { frame, headingOf, figureTemplate, ionicColumn, stamp, mat, photoView } from './kit.js';

const STONE = '#ece5d4', STONE_SHADE = '#d2c7ae', STONE_DARK = '#b9ad93', WALL = '#e6d8b8', ROOF = '#b9653f', ROOF_RIDGE = '#9c4f30';

export function buildTemple(ctx, env) {
  const A = ctx.MAP.ANCHORS.esculapio;
  const lake = ctx.MAP.WATER.find((w) => w.k === 'lake');
  const island = lake.h[0];
  const h = headingOf(0.78, 0.627); // portico faces east-south-east, over the open water
  const y0 = ctx.terrain.heightAt(A.x, A.z);
  const F = frame(A.x, y0, A.z, h);
  const gb = new GeoBuilder();
  const rnd = ctx.rng('lake-temple');

  // dimensions (local: x across the facade, z towards the water, y up from the island)
  const W = 7.4, back = -3.9, front = 2.2;
  const Y1 = 1.25;                 // podium top
  const colH = 4.5, colR = 0.28;
  const Y2 = Y1 + colH;            // entablature bottom
  const Y3 = Y2 + 1.25;            // cornice top
  const pedH = 1.45;
  const colZ = front - 0.55;
  const cellaFront = colZ - 1.55;

  // podium with base and crown mouldings
  gb.box(W + 0.4, 0.5, front - back + 0.4, STONE_DARK, 0, -0.05, (front + back) / 2);
  gb.box(W, Y1 - 0.2, front - back, STONE_SHADE, 0, (Y1 - 0.2) / 2 + 0.2, (front + back) / 2);
  gb.box(W + 0.22, 0.18, front - back + 0.22, STONE, 0, Y1 - 0.09, (front + back) / 2);

  // steps down to a stone landing at the water's edge, two more steps into the lake
  const waterY = ctx.WATER_Y - y0;
  const landZ = 4.4, landEnd = 6.3, landY = 0.02;
  const nSteps = 6, run = (landZ - front) / nSteps, stepRise = (Y1 - landY) / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const top = Y1 - stepRise * (i + 1);
    const z0 = front + run * i;
    gb.box(W - 1.3, stepRise, run + 0.02, i % 2 ? STONE : '#e2dac6', 0, top + stepRise / 2, z0 + run / 2);
    gb.box(W - 1.3, top - stepRise - (waterY - 0.6), run, STONE_DARK, 0, (top - stepRise + waterY - 0.6) / 2, z0 + run / 2);
  }
  gb.box(W + 0.3, landY - (waterY - 0.6), landEnd - landZ, '#e2dac6', 0, (landY + waterY - 0.6) / 2, (landZ + landEnd) / 2);
  for (let i = 0; i < 2; i++) {
    const top = landY - 0.26 * (i + 1);
    gb.box(W - 1.0, top - (waterY - 0.6), 0.42, i ? STONE_SHADE : STONE, 0, (top + waterY - 0.6) / 2, landEnd + 0.21 + i * 0.42);
  }
  const stairEnd = landEnd + 0.84;
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape([
      new THREE.Vector2(front - 0.1, waterY - 0.6), new THREE.Vector2(landZ, waterY - 0.6),
      new THREE.Vector2(landZ, landY + 0.5), new THREE.Vector2(front - 0.1, Y1 + 0.05),
    ]);
    // profile drawn in (z, y), extruded across x
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.65, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(s * (W / 2 - 0.325) + 0.325, 0, 0);
    gb.add(g, STONE_SHADE);
    gb.box(0.8, 0.75, 0.8, STONE, s * (W / 2 - 0.33), landY + 0.37, landZ + 0.2);          // pedestals
    gb.sphere(0.32, 1, STONE, s * (W / 2 - 0.33), landY + 1.05, landZ + 0.2, 1, 0.75, 1);  // stone balls
    gb.cyl(0.1, 0.12, 0.5, 6, STONE_SHADE, s * (W / 2 - 0.1), landY + 0.25, landEnd - 0.2); // mooring posts
  }

  // Ionic portico: four columns
  for (const x of [-2.85, -0.95, 0.95, 2.85]) ionicColumn(gb, x, Y1, colZ, colH, colR, '#f4f0e6', STONE_SHADE);

  // cella: walls with a big doorway framing the god's statue, dark interior
  const cz0 = back + 0.2, cz1 = cellaFront;
  const cw = W - 1.0;
  gb.box(0.45, colH, cz1 - cz0, WALL, -cw / 2 + 0.22, Y1 + colH / 2, (cz0 + cz1) / 2);
  gb.box(0.45, colH, cz1 - cz0, WALL, cw / 2 - 0.22, Y1 + colH / 2, (cz0 + cz1) / 2);
  gb.box(cw, colH, 0.45, WALL, 0, Y1 + colH / 2, cz0 + 0.22);
  const doorW = 2.5, doorH = 3.4;
  gb.box((cw - doorW) / 2, colH, 0.5, WALL, -(cw + doorW) / 4, Y1 + colH / 2, cz1 - 0.25);
  gb.box((cw - doorW) / 2, colH, 0.5, WALL, (cw + doorW) / 4, Y1 + colH / 2, cz1 - 0.25);
  gb.box(doorW, colH - doorH, 0.5, WALL, 0, Y1 + doorH + (colH - doorH) / 2, cz1 - 0.25);
  // door frame and the aedicule niche at the back
  gb.box(doorW + 0.5, 0.3, 0.12, STONE_SHADE, 0, Y1 + doorH + 0.15, cz1 + 0.02);
  for (const s of [-1, 1]) gb.box(0.25, doorH, 0.12, STONE_SHADE, s * (doorW / 2 + 0.12), Y1 + doorH / 2, cz1 + 0.02);
  gb.box(cw - 0.9, 0.05, cz1 - cz0 - 0.4, '#8f8571', 0, Y1 + 0.03, (cz0 + cz1) / 2);       // interior floor
  gb.box(cw - 0.9, colH, 0.05, '#7d7462', 0, Y1 + colH / 2, cz0 + 0.47);                    // shadowed back wall
  gb.box(2.0, 3.0, 0.3, '#a59a83', 0, Y1 + 1.6, cz0 + 0.6);                                  // niche
  gb.box(1.0, 0.75, 0.9, STONE_SHADE, 0, Y1 + 0.375, (cz0 + cz1) / 2 - 0.3);               // pedestal
  stamp(gb, figureTemplate('god', '#f6f3ec', '#ddd6c6'), mat(0, Y1 + 0.75, (cz0 + cz1) / 2 - 0.3, 0, 1.18));
  // corner pilasters (antae)
  for (const s of [-1, 1]) gb.box(0.55, colH, 0.55, '#f1ebdd', s * (cw / 2 - 0.05), Y1 + colH / 2, cz1);

  // entablature: architrave, frieze (inscription decal) and a dentilled cornice, around the whole roof
  const ez0 = back - 0.05, ez1 = colZ + 0.42;
  gb.box(W - 0.2, 0.45, ez1 - ez0, '#efe9dc', 0, Y2 + 0.225, (ez0 + ez1) / 2);
  gb.box(W - 0.3, 0.55, ez1 - ez0 - 0.1, STONE, 0, Y2 + 0.45 + 0.275, (ez0 + ez1) / 2 - 0.05);
  for (let i = 0; i < 16; i++) gb.box(0.16, 0.14, 0.16, STONE_SHADE, -W / 2 + 0.3 + i * ((W - 0.6) / 15), Y2 + 1.07, ez1 + 0.02);
  gb.box(W + 0.4, 0.25, ez1 - ez0 + 0.4, '#f4efe4', 0, Y2 + 1.125, (ez0 + ez1) / 2);
  env.decals.quad(W - 1.2, 0.42, env.R.templeFrieze, F.m.clone().multiply(mat(0, Y2 + 0.72, ez1 - 0.09)));

  // pediments front and back, raking cornices, tiled roof with a ridge
  const half = W / 2 + 0.2;
  const tri = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, pedH)]);
  gb.extrude(tri, 0.4, STONE, 0, Y3, ez1 - 0.45);
  gb.extrude(tri, 0.4, STONE, 0, Y3, ez0 - 0.05);
  const slope = Math.atan2(pedH, half), rake = Math.hypot(half, pedH);
  for (const s of [-1, 1]) {
    gb.box(rake + 0.35, 0.2, 0.5, '#f4efe4', s * half / 2, Y3 + pedH / 2 + 0.08, ez1 + 0.02, 0, 0, -s * slope);
    gb.box(rake + 0.35, 0.2, 0.5, '#f4efe4', s * half / 2, Y3 + pedH / 2 + 0.08, ez0 - 0.2, 0, 0, -s * slope);
    gb.box(rake + 0.3, 0.16, ez1 - ez0 + 0.3, ROOF, s * half / 2, Y3 + pedH / 2 + 0.12, (ez0 + ez1) / 2 - 0.1, 0, 0, -s * slope);
    // tile ribs
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      gb.box(rake * 0.98, 0.07, 0.09, ROOF_RIDGE, s * half / 2, Y3 + pedH / 2 + 0.22, ez0 + 0.1 + t * (ez1 - ez0 - 0.4), 0, 0, -s * slope);
    }
  }
  gb.box(0.25, 0.22, ez1 - ez0 + 0.2, ROOF_RIDGE, 0, Y3 + pedH + 0.12, (ez0 + ez1) / 2 - 0.1);
  env.decals.tri(W - 0.6, pedH - 0.32, env.R.tympanum, F.m.clone().multiply(mat(0, Y3 + 0.12, ez1 - 0.04)));

  // statues on the roof: one at the apex and one on each front corner, plus the back apex
  const roofFig = figureTemplate('robed', '#f3efe6', '#d8d1c2');
  const ladyFig = figureTemplate('lady', '#f3efe6', '#d8d1c2');
  gb.box(0.7, 0.4, 0.7, STONE, 0, Y3 + pedH + 0.2, ez1 - 0.3);
  stamp(gb, roofFig, mat(0, Y3 + pedH + 0.4, ez1 - 0.3, 0, 0.85));
  gb.box(0.6, 0.35, 0.6, STONE, 0, Y3 + pedH + 0.17, ez0 + 0.1);
  stamp(gb, ladyFig, mat(0, Y3 + pedH + 0.35, ez0 + 0.1, Math.PI, 0.75));
  for (const s of [-1, 1]) {
    gb.box(0.6, 0.35, 0.6, STONE, s * (half - 0.25), Y3 + 0.17, ez1 - 0.3);
    stamp(gb, s < 0 ? ladyFig : roofFig, mat(s * (half - 0.25), Y3 + 0.35, ez1 - 0.3, -s * 0.3, 0.72));
  }

  // island: laurel and box bushes round the edge (world draws the stone kerb)
  const bushes = [];
  const shrubCols = ['#3d6a35', '#4b7a3c', '#355f30', '#56843f'];
  const L = island.length;
  for (let i = 0; i < L; i++) {
    const a = island[i], b = island[(i + 1) % L];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 0; d < seg; d += 1.1) {
      const t = d / seg;
      const ex = a[0] + (b[0] - a[0]) * t, ez = a[1] + (b[1] - a[1]) * t;
      const nx = -(b[1] - a[1]) / seg, nz = (b[0] - a[0]) / seg; // edge normal (sign checked below)
      const inward = pointInRing(ex + nx * 0.8, ez + nz * 0.8, island) ? 1 : -1;
      const inset = inward * (1.1 + rnd() * 0.5);
      const bx = ex + nx * inset, bz = ez + nz * inset;
      const [blx, blz] = F.l(bx, bz);
      const nearTemple = Math.abs(blx) < W / 2 + 0.9 && blz > back - 0.9 && blz < stairEnd + 0.5;
      if (!nearTemple && rnd() < 0.8) bushes.push([blx, blz, 0.55 + rnd() * 0.5]);
    }
  }
  for (const [bx, bz, r] of bushes) {
    const gy = ctx.terrain.heightAt(...F.w(bx, bz)) - y0;
    gb.sphere(r, 1, shrubCols[Math.floor(rnd() * 4)], bx, gy + r * 0.6, bz, 1.15, 0.85, 1.15);
    if (rnd() < 0.5) gb.sphere(r * 0.65, 0, shrubCols[Math.floor(rnd() * 4)], bx + r * 0.6, gy + r * 0.9, bz + r * 0.3);
  }
  // clipped bushes in pots either side of the porch
  for (const s of [-1, 1]) {
    gb.cyl(0.32, 0.24, 0.5, 8, PALETTE.terracotta, s * (W / 2 + 0.6), 0.25, front - 0.4);
    gb.sphere(0.45, 1, '#3f6f36', s * (W / 2 + 0.6), 0.95, front - 0.4);
  }

  env.group.add(F.place(gb.build(undefined, { name: 'temple-aesculapius' })));

  // a pair of cypresses flanking the temple (vegetation plants them); the island has no room
  // for broad trees, the woods on the far shore make the dark backdrop
  for (const [lx, lz, sc] of [[-5.4, -2.0, 1.0], [5.4, -2.2, 0.92]]) {
    const [wx, wz] = F.w(lx, lz);
    if (pointInRing(wx, wz, island) && distToRingEdge(wx, wz, island) > 1.0) ctx.plant('cypress', wx, wz, { scale: sc });
  }
  ctx.reserve({ ring: island });
  ctx.colliders.addBox(...F.w(0, (back + front) / 2), W, front - back + 1, -h, 'building', { name: 'esculapio' });

  // Tour stop 'lago': the postcard view. The cart waits on the far shore the portico faces, the
  // temple stands across the water behind it between its cypresses.
  photoView(ctx, 'lago', { x: A.x, z: A.z, y: y0, from: h, dist: 49.5, height: 4.4, cart: 10.5, side: 1, turn: -0.74, aimY: -1.6, aimSide: 1, width: 12 });
}
