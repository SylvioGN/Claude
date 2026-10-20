// Terrazza del Pincio: the balustrade along the edge of the hill over Piazza del Popolo, Valadier's
// terraced retaining walls below it, and in the middle the loggia with the Fontana della Dea di
// Roma, the two rostral columns and statues. The Leone del Pincio sits on the lower terrace.
import * as THREE from 'three';
import { COL, balustrade, lampPost, urn, statue, local, resample, offsetPolyline, alongY, faceY, archOutline, archRing } from './kit.js';
import { closestOnPolyline } from '../../core/geo.js';

// Offsets from the park boundary, outwards (negative = inside the drivable area).
const RAIL = -0.55;   // main balustrade
const A0 = -0.3, A1 = 2.9;   // upper ledge (flower bed)
const B1 = 7.6;       // lower terrace front wall
const CORE_FRONT = 10.2, CORE_HALF = 8.6;   // central loggia block

// The contiguous run of boundary vertices around the one nearest (x, z) that pass test(x, z).
function boundaryRun(ring, x, z, test) {
  const n = ring.length;
  let seed = 0, best = Infinity;
  ring.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < best) { best = d; seed = i; } });
  let a = seed, b = seed;
  while (b - a < n - 1 && test(...ring[(a - 1 + n) % n])) a--;
  while (b - a < n - 1 && test(...ring[(b + 1) % n])) b++;
  const out = [];
  for (let i = a; i <= b; i++) out.push(ring[(i + n) % n]);
  return out;
}

export function buildTerrace(ctx, tb) {
  const { MAP, terrain: T, colliders, quality } = ctx;
  const H = T.heightAt;
  const rnd = ctx.rng('pincio-terrace');

  // Western edge of the hill: from where the Aurelian wall turns away in the north, round the
  // corner and along the cliff to the south end of the terrace.
  const anchor = MAP.ANCHORS.terrazza;
  const run = boundaryRun(MAP.BOUNDARY, anchor.x, anchor.z, (x, z) => x < -286 && z > 40);
  if (run.length < 3) return null;
  if (run[0][0] > -300) {
    const [ax, az] = run[0], [bx, bz] = run[1];
    const t = (-300 - ax) / (bx - ax);
    run[0] = [ax + (bx - ax) * t, az + (bz - az) * t];
  }
  const line = resample(run, 2.0);
  const off = (d) => offsetPolyline(line, d);
  const rail = off(RAIL), pA0 = off(A0), pA1 = off(A1), pB1 = off(B1);
  const near = off(0.8), far = off(B1 + 2), outer = off(B1 + 0.6);

  // Central composition on the stretch closest to the terrace anchor.
  const cp = closestOnPolyline(anchor.x, anchor.z, line);
  const C = { x: cp.x, z: cp.z, dx: cp.dirX, dz: cp.dirZ, nx: -cp.dirZ, nz: cp.dirX };
  const along = (x, z) => (x - C.x) * C.dx + (z - C.z) * C.dz;
  const inCore = (x, z, pad = 0) => Math.abs(along(x, z)) < CORE_HALF + pad && Math.hypot(x - C.x, z - C.z) < 30;

  // Heights per sample: ledge top, lower terrace top, buried wall foot.
  const yA = [], yB = [], yBot = [], drop = [];
  for (let i = 0; i < line.length; i++) {
    const a = Math.max(H(...pA0[i]), H(...rail[i]), H(...near[i])) + 0.07;
    const b = Math.min(a - 0.05, H(...pA1[i]) + 0.06);
    yA.push(a); yB.push(b);
    yBot.push(Math.min(H(...pB1[i]), H(...far[i]), b) - 1.6);
    drop.push(a - H(...outer[i]));
  }
  // The terraced walls exist where the hill really drops, away from the Aurelian wall corner.
  const tiered = line.map((p, i) => drop[i] > 2 && p[1] > 66);

  const wallTop = (pts, ys, i, j) => [[pts[i][0], ys[i], pts[i][1]], [pts[j][0], ys[j], pts[j][1]]];
  for (let i = 0; i < line.length - 1; i++) {
    if (!tiered[i] || !tiered[i + 1]) continue;
    const j = i + 1;
    const L = Math.hypot(line[j][0] - line[i][0], line[j][1] - line[i][1]);
    const ux = (line[j][0] - line[i][0]) / L, uz = (line[j][1] - line[i][1]) / L, nx = -uz, nz = ux;
    const ry = alongY(ux, uz), out = [nx, 0, nz];
    // ledge top (planted bed), its front wall, the lower terrace top and its front wall
    tb.poly([[pA0[i][0], yA[i], pA0[i][1]], [pA0[j][0], yA[j], pA0[j][1]], [pA1[j][0], yA[j], pA1[j][1]], [pA1[i][0], yA[i], pA1[i][1]]], COL.bed, [0, 1, 0]);
    const [a0, a1] = wallTop(pA1, yA, i, j);
    tb.poly([a0, a1, [a1[0], yB[j], a1[2]], [a0[0], yB[i], a0[2]]], COL.wall, out);
    tb.poly([[pA1[i][0], yB[i], pA1[i][1]], [pA1[j][0], yB[j], pA1[j][1]], [pB1[j][0], yB[j], pB1[j][1]], [pB1[i][0], yB[i], pB1[i][1]]], COL.gravel, [0, 1, 0]);
    const [b0, b1] = wallTop(pB1, yB, i, j);
    tb.poly([b0, b1, [b1[0], yBot[j], b1[2]], [b0[0], yBot[i], b0[2]]], COL.wall, out);

    // cornices along both wall tops (a box along offset line p, pushed d further out)
    const seg = (p, d, h, y, color, w = 0.32) => {
      const len = Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]);
      tb.box(len + 0.06, h, w, color, (p[i][0] + p[j][0]) / 2 + nx * d, y, (p[i][1] + p[j][1]) / 2 + nz * d, ry);
    };
    seg(pA1, 0.05, 0.22, (yA[i] + yA[j]) / 2 - 0.12, COL.trim);
    seg(pA1, 0.0, 0.5, (yA[i] + yA[j]) / 2 - 0.25, COL.travertine, 0.42);
    const core = inCore((line[i][0] + line[j][0]) / 2, (line[i][1] + line[j][1]) / 2, 0.5);
    if (!core) {
      seg(pB1, 0.08, 0.32, (yB[i] + yB[j]) / 2 - 0.16, COL.trim, 0.5);
      // low parapet on the lower terrace
      seg(pB1, -0.25, 0.62, (yB[i] + yB[j]) / 2 + 0.31, COL.travertine, 0.36);
      seg(pB1, -0.25, 0.1, (yB[i] + yB[j]) / 2 + 0.66, COL.trim, 0.48);
    }
    // planted bed: low clipped hedge with flowers
    const hx = (pA0[i][0] + pA1[i][0] + pA0[j][0] + pA1[j][0]) / 4, hz = (pA0[i][1] + pA1[i][1] + pA0[j][1] + pA1[j][1]) / 4;
    tb.box(L + 0.1, 0.5, 1.3, COL.bedHedge, hx, (yA[i] + yA[j]) / 2 + 0.25, hz, ry);
    if (quality.tier !== 'low') {
      for (let k = 0; k < 3; k++) {
        const t = (rnd() - 0.5) * L, s = rnd() - 0.5;
        const fx = hx + ux * t + nx * s, fz = hz + uz * t + nz * s;
        tb.place(new THREE.OctahedronGeometry(0.16, 0), rnd.pick([COL.flowerPink, COL.flowerRed, COL.flowerWhite, COL.flowerViolet]), fx, (yA[i] + yA[j]) / 2 + 0.55, fz);
      }
    }
  }

  // End caps where the terraced walls start and stop.
  for (let i = 0; i < line.length; i++) {
    const startCap = tiered[i] && !tiered[i - 1], endCap = tiered[i] && !tiered[i + 1];
    if (!startCap && !endCap) continue;
    const k = startCap ? i + 1 : i - 1;
    if (k < 0 || k >= line.length) continue;
    const out = [line[i][0] - line[k][0], 0, line[i][1] - line[k][1]];
    tb.poly([[pA0[i][0], yA[i], pA0[i][1]], [pA1[i][0], yA[i], pA1[i][1]], [pA1[i][0], yBot[i], pA1[i][1]], [pA0[i][0], yBot[i], pA0[i][1]]], COL.wall, out);
    tb.poly([[pA1[i][0], yB[i], pA1[i][1]], [pB1[i][0], yB[i], pB1[i][1]], [pB1[i][0], yBot[i], pB1[i][1]], [pA1[i][0], yBot[i], pA1[i][1]]], COL.wall, out);
  }

  // Pilasters and blind arched niches along the lower wall, cypresses on the lower terrace.
  const archShape = archOutline(2.0, 3.0);
  for (let i = 1; i < line.length - 1; i++) {
    if (!tiered[i] || !tiered[i - 1] || !tiered[i + 1] || inCore(...line[i], 1.5)) continue;
    const dx = line[i + 1][0] - line[i - 1][0], dz = line[i + 1][1] - line[i - 1][1];
    const L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const ry = alongY(ux, uz);
    const [px, pz] = pB1[i];
    const foot = H(px + nx * 1.2, pz + nz * 1.2);
    if (i % 3 === 0) {
      tb.box(0.75, yB[i] - yBot[i], 0.3, COL.trim, px + nx * 0.12, (yB[i] + yBot[i]) / 2, pz + nz * 0.12, ry);
    } else if (i % 3 === 1 && yB[i] - foot > 5) {
      tb.place(new THREE.ShapeGeometry(archShape, 6), COL.recess, px + nx * 0.03 + ux * 1.0, foot + 0.3, pz + nz * 0.03 + uz * 1.0, 0, faceY(nx, nz), 0);
    }
    if (i % 3 === 2 && yB[i] - foot > 4) {
      const [cx, cz] = offsetPoint(line, i, 5.0 + (rnd() - 0.5));
      if (i % 2) cypress(tb, cx, yB[i], cz, 0.85 + rnd() * 0.3);
      else roundTree(tb, cx, yB[i], cz, 0.9 + rnd() * 0.3, rnd);
    }
  }

  // Main balustrade on the edge of the plaza, with lamps and urns on its piers.
  const piers = balustrade(tb, rail, (x, z) => H(x, z) + 0.02, { height: 1.15 });
  colliders.addPolyline(rail, false, 'wall', { name: 'Terrazza del Pincio' }, 0.3);
  let dist = 0;
  for (let k = 1; k < piers.length; k++) {
    dist += Math.hypot(piers[k].x - piers[k - 1].x, piers[k].z - piers[k - 1].z);
    const p = piers[k];
    if (dist > 13) {
      dist = 0;
      lampPost(tb, p.x, p.y + 1.2, p.z, { tall: 2.5 });
    } else if (Math.abs(dist - 6.5) < 1.2 && quality.tier !== 'low') {
      urn(tb, p.x, p.y + 1.2, p.z, 0.8, COL.trim, rnd.chance(0.5) ? COL.flowerRed : COL.flowerPink);
    }
  }

  buildLoggia(ctx, tb, C, H);

  // Coin-operated telescopes at the best spot of the view, one each side of the axis.
  for (const s of [-5.5, 5.5]) {
    const x = C.x + C.dx * s - C.nx * 1.7, z = C.z + C.dz * s - C.nz * 1.7;
    if (!T.isInside(x, z)) continue;
    telescope(tb, x, H(x, z), z, faceY(C.nx, C.nz));
    colliders.addCircle(x, z, 0.35, 'lamp', { name: 'telescope' });
  }

  // Leone del Pincio: a stone lion keeping watch from the lower terrace.
  const lionPoi = MAP.POIS.find((p) => p.n === 'Leone del Pincio');
  if (lionPoi) {
    const c = closestOnPolyline(lionPoi.x, lionPoi.z, line);
    const nx = -c.dirZ, nz = c.dirX;
    const i = Math.min(line.length - 1, Math.max(0, Math.round(c.seg + c.t)));
    lion(tb, c.x + nx * 5.4, yB[i], c.z + nz * 5.4, faceY(nx, nz));
  }

  return { rail, centre: C };
}

function offsetPoint(line, i, d) {
  const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [line[i][0] - ((b[1] - a[1]) / L) * d, line[i][1] + ((b[0] - a[0]) / L) * d];
}

function cypress(tb, x, y, z, s = 1) {
  tb.cyl(0.12 * s, 0.16 * s, 1.0 * s, 5, COL.pineTrunk, x, y + 0.5 * s, z);
  tb.place(new THREE.ConeGeometry(0.75 * s, 5.2 * s, 7), COL.cypress, x, y + 3.3 * s, z);
}

// Panoramic telescope on a post (green, like the ones on Roman belvederes).
function telescope(tb, x, y, z, ry) {
  const L = local(x, y, z, ry);
  const G = '#2f6b4f';
  tb.cyl(0.28, 0.34, 0.2, 8, COL.iron, ...L(0, 0.1, 0));
  tb.cyl(0.09, 0.12, 1.1, 6, G, ...L(0, 0.75, 0));
  tb.box(0.5, 0.42, 0.5, G, ...L(0, 1.45, 0), ry);
  tb.orient(new THREE.CylinderGeometry(0.12, 0.17, 0.6, 8), G, ...L(0, 1.55, 0.45), ry, Math.PI / 2 - 0.15, 0);
  for (const s of [-0.11, 0.11]) tb.orient(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), COL.iron, ...L(s, 1.5, -0.3), ry, Math.PI / 2, 0);
  tb.box(0.16, 0.05, 0.06, COL.gilt, ...L(0.18, 1.5, 0.26), ry);
}

function roundTree(tb, x, y, z, s, rnd) {
  tb.cyl(0.14 * s, 0.2 * s, 1.6 * s, 5, COL.pineTrunk, x, y + 0.8 * s, z);
  tb.sphere(1.25 * s, 1, COL.holmOak, x, y + 2.5 * s, z, 1, 0.85, 1);
  tb.sphere(0.85 * s, 0, '#4b6e3b', x + (rnd() - 0.5) * s, y + 3.1 * s, z + (rnd() - 0.5) * s);
}

// The loggia block in the middle of the terraces: Fontana della Dea di Roma at the bottom,
// three arches above, a balustraded platform on top with the rostral columns and statues.
function buildLoggia(ctx, tb, C, H) {
  const n = [C.nx, C.nz], d = [C.dx, C.dz];
  const P = (s, o) => [C.x + d[0] * s + n[0] * o, C.z + d[1] * s + n[1] * o];
  const ry = faceY(n[0], n[1]);
  const base = Math.min(H(...P(0, CORE_FRONT + 1.5)), H(...P(-6, CORE_FRONT + 1.5)), H(...P(6, CORE_FRONT + 1.5)));
  const top = H(...P(0, A1)) + 0.2;
  const bottom = base - 1.5;
  const W = CORE_HALF * 2;

  // the block itself
  const ring = [P(-CORE_HALF, A1 - 0.2), P(CORE_HALF, A1 - 0.2), P(CORE_HALF, CORE_FRONT), P(-CORE_HALF, CORE_FRONT)];
  tb.prism(ring, bottom, top, COL.wall);
  // platform paving and cornice
  const mid = P(0, (A1 + CORE_FRONT) / 2);
  tb.box(W + 0.2, 0.1, CORE_FRONT - A1 + 0.2, COL.travertine, mid[0], top + 0.05, mid[1], ry);
  const fr = (o, s = 0) => P(s, CORE_FRONT + o);
  tb.box(W + 0.7, 0.45, 0.6, COL.trim, ...xz(fr(0.12), top - 0.3), ry);
  tb.box(W + 0.5, 0.35, 0.5, COL.travertine, ...xz(fr(0.1), base + 4.98), ry);
  for (const s of [-1, 1]) {
    // corner pilasters and side cornices
    tb.box(1.0, top - bottom, 0.4, COL.trim, ...xz(fr(0.1, s * (CORE_HALF - 0.45)), (top + bottom) / 2), ry);
    const sc = P(s * (CORE_HALF + 0.12), (A1 + CORE_FRONT) / 2 + 0.3);
    tb.box(0.6, 0.45, CORE_FRONT - A1 + 0.4, COL.trim, sc[0], top - 0.3, sc[1], ry);
  }
  // rusticated ground storey: horizontal bands
  for (let y = base + 0.8; y < base + 4.0; y += 0.85) tb.box(W - 0.2, 0.12, 0.12, COL.wallShade, ...xz(fr(0.04), y), ry);

  // Dea Roma niche with archivolt, statue, the river gods and the basin.
  const niche = fr(0.03);
  tb.place(new THREE.ShapeGeometry(archOutline(3.1, 3.8), 8), COL.recessBlue, niche[0], base + 0.3, niche[1], 0, ry, 0);
  tb.extrude(archRing(3.1, 3.8, 0.32), 0.25, COL.trim, niche[0], base + 0.3, niche[1], 0, ry, 0);
  const st = fr(0.5);
  statue(tb, st[0], base, st[1], ry, { s: 1.15, pedestal: 1.2, helmet: true, spear: true, color: COL.marble });
  tb.decal('signSpqr', 3.4, 0.58, ...xz(fr(0.08), base + 4.45), ry);
  const basin = fr(0.0);
  tb.place(new THREE.CylinderGeometry(3.5, 3.6, 0.85, 14, 1, true, ry - Math.PI / 2, Math.PI), COL.travertine, basin[0], base + 0.42, basin[1]);
  tb.place(new THREE.RingGeometry(3.2, 3.55, 14, 1, 0, Math.PI), COL.trim, basin[0], base + 0.86, basin[1], -Math.PI / 2, 0, ry + Math.PI);
  tb.place(new THREE.CircleGeometry(3.25, 14, 0, Math.PI), COL.water, basin[0], base + 0.68, basin[1], -Math.PI / 2, 0, ry + Math.PI);
  // water spilling from the niche into the basin
  tb.box(1.0, 1.9, 0.06, '#cfe8f5', ...xz(fr(0.35), base + 1.6), ry);
  for (const s of [-1, 1]) {
    const g = fr(1.1, s * 4.9);
    tb.box(3.2, 0.9, 1.5, COL.travertine, g[0], base + 0.45, g[1], ry);
    riverGod(tb, g[0], base + 0.9, g[1], ry, s);
  }

  // loggia: three arches between paired columns
  const lb = base + 5.45, lh = top - 0.6 - lb;
  for (const s of [-4.6, 0, 4.6]) {
    const a = fr(0.04, s);
    const w = s === 0 ? 2.8 : 2.4, h = Math.min(lh - 0.3, s === 0 ? 3.6 : 3.2);
    tb.place(new THREE.ShapeGeometry(archOutline(w, h), 8), COL.recess, a[0], lb, a[1], 0, ry, 0);
    tb.extrude(archRing(w, h, 0.22), 0.18, COL.trim, a[0], lb, a[1], 0, ry, 0);
    tb.box(w + 0.4, 0.5, 0.3, COL.travertine, ...xz(fr(0.08, s), lb - 0.1), ry);
    tb.box(w * 0.86, 0.5, 0.2, COL.travertineShade, ...xz(fr(-0.2, s), lb + 0.3), ry);
  }
  for (const s of [-6.9, -2.3, 2.3, 6.9]) {
    for (const k of [-0.32, 0.32]) {
      const c = fr(0.35, s + k);
      tb.cyl(0.17, 0.2, lh, 8, COL.trim, c[0], lb + lh / 2, c[1]);
    }
  }

  // balustrade round the platform, statues on the front corners, rostral columns
  const railPts = [P(-CORE_HALF + 0.3, A1 + 0.3), P(-CORE_HALF + 0.3, CORE_FRONT - 0.3), P(CORE_HALF - 0.3, CORE_FRONT - 0.3), P(CORE_HALF - 0.3, A1 + 0.3)];
  const piers = balustrade(tb, railPts, () => top + 0.1, { height: 1.05, panel: 2.1 });
  const front = piers.filter((p) => Math.abs((p.x - C.x) * n[0] + (p.z - C.z) * n[1] - (CORE_FRONT - 0.3)) < 0.2);
  for (const p of piers) {
    const s = (p.x - C.x) * d[0] + (p.z - C.z) * d[1];
    const isFront = front.includes(p);
    if (isFront && Math.abs(Math.abs(s) - (CORE_HALF - 0.3)) < 0.2) statue(tb, p.x, top + 1.2, p.z, ry, { s: 0.85, pedestal: 0.3 });
    else if (isFront && Math.abs(Math.abs(s) - 4.15) < 0.6) lampPost(tb, p.x, top + 1.2, p.z, { tall: 2.3 });
    else if (!isFront && Math.abs(s) > CORE_HALF - 1) urn(tb, p.x, top + 1.2, p.z, 0.75, COL.trim, COL.flowerRed);
  }
  for (const s of [-1, 1]) rostralColumn(tb, ...P(s * 5.6, (A1 + CORE_FRONT) / 2 + 0.3), top + 0.1, ry);
}

const xz = (p, y) => [p[0], y, p[1]];

// Colonna rostrata: a stout column studded with bronze ship prows, on a tall pedestal.
function rostralColumn(tb, x, z, y, ry) {
  const L = local(x, y, z, ry);
  const stone = '#ece2cc';
  tb.box(1.7, 0.35, 1.7, COL.travertineShade, ...L(0, 0.17, 0), ry);
  tb.box(1.45, 2.0, 1.45, COL.travertine, ...L(0, 1.35, 0), ry);
  tb.box(1.7, 0.28, 1.7, COL.trim, ...L(0, 2.45, 0), ry);
  tb.cyl(0.72, 0.78, 0.3, 12, COL.trim, ...L(0, 2.74, 0));
  tb.cyl(0.58, 0.64, 4.6, 12, stone, ...L(0, 5.2, 0));
  for (const [h, turn] of [[3.7, 0], [5.0, Math.PI / 4], [6.3, 0]]) {
    for (let k = 0; k < 4; k++) {
      const a = ry + turn + Math.PI / 4 + (k * Math.PI) / 2;
      const px = x + Math.sin(a) * 0.78, pz = z + Math.cos(a) * 0.78;
      tb.orient(new THREE.ConeGeometry(0.3, 1.0, 4), COL.bronze, px, y + h, pz, a, Math.PI / 2 + 0.25, 0, 1, 1, 0.6);
      tb.orient(new THREE.BoxGeometry(0.5, 0.08, 0.5), COL.bronze, x + Math.sin(a) * 0.62, y + h + 0.22, z + Math.cos(a) * 0.62, a);
    }
  }
  tb.cyl(0.8, 0.6, 0.35, 12, COL.trim, ...L(0, 7.65, 0));
  tb.box(1.6, 0.3, 1.6, COL.trim, ...L(0, 7.95, 0), ry);
  tb.cyl(0.35, 0.45, 0.4, 8, COL.bronze, ...L(0, 8.3, 0));
  tb.sphere(0.42, 1, COL.gilt, ...L(0, 8.85, 0));
}

// Reclining bearded river god leaning on an urn (Tiber and Aniene beside the Dea Roma).
function riverGod(tb, x, y, z, ry, side) {
  const L = local(x, y, z, ry);
  const M = COL.marble;
  tb.orient(new THREE.SphereGeometry(0.5, 7, 5), M, ...L(-side * 0.1, 0.32, 0), ry, 0, Math.PI / 2, 1, 2.6, 1);
  tb.orient(new THREE.CylinderGeometry(0.26, 0.34, 1.0, 7), M, ...L(side * 0.75, 0.75, 0), ry, 0, -side * 0.6);
  tb.sphere(0.23, 1, M, ...L(side * 1.05, 1.32, 0.05));
  tb.orient(new THREE.ConeGeometry(0.18, 0.35, 6), M, ...L(side * 1.08, 1.12, 0.17), ry, Math.PI, 0);
  tb.sphere(0.32, 1, M, ...L(side * 1.3, 0.55, -0.15), 1, 0.85, 1);
  tb.orient(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 5), '#cfe8f5', ...L(side * 1.55, 0.05, 0.2), ry, 0, side * 0.5);
}

// Couchant lion on a plinth, facing ry.
function lion(tb, x, y, z, ry) {
  const L = local(x, y, z, ry);
  const S = '#ddd2bb', S2 = '#cdbf9f';
  tb.box(1.3, 0.7, 2.5, COL.travertineShade, ...L(0, 0.35, 0), ry);
  tb.box(1.45, 0.12, 2.65, COL.trim, ...L(0, 0.72, 0), ry);
  tb.orient(new THREE.SphereGeometry(0.42, 7, 5), S, ...L(0, 1.12, -0.25), ry, Math.PI / 2, 0, 1, 2.3, 0.95);
  tb.sphere(0.42, 1, S2, ...L(0, 1.45, 0.55), 1.05, 1.05, 0.9);
  tb.sphere(0.25, 1, S, ...L(0, 1.4, 0.88));
  tb.box(0.2, 0.12, 0.2, '#6b5a48', ...L(0, 1.42, 1.1), ry);
  for (const s of [-1, 1]) tb.box(0.2, 0.18, 0.7, S, ...L(s * 0.22, 0.86, 0.85), ry);
  tb.orient(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 4), S, ...L(0.35, 0.85, -1.05), ry, 1.2, 0);
}
