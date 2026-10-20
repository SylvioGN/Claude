// Walls of the park and the city: the Aurelian Walls with their square towers, stucco garden
// walls with travertine coping, stone retaining walls, black iron railings, clipped hedges and
// chain barriers. Everything gets a collider, except where the Pincio footbridge lands.
import * as THREE from 'three';
import { TILE } from './atlas.js';
import { CITY_WALLS } from './osmCity.js';
import { decode } from './city.js';
import { mat } from './buildings.js';
import { pointInRing } from './builder.js';

const BRICK = '#c98a62', BRICK_DARK = '#b8774f';

// Mitred side offsets of an open polyline: returns [left, right] point lists.
function sides(pts, half) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(n - 1, i + 1)];
    let d1x = b[0] - a[0], d1z = b[1] - a[1], d2x = c[0] - b[0], d2z = c[1] - b[1];
    const l1 = Math.hypot(d1x, d1z) || 1, l2 = Math.hypot(d2x, d2z) || 1;
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
    if (i === 0) { d1x = d2x; d1z = d2z; }
    if (i === n - 1) { d2x = d1x; d2z = d1z; }
    let nx = -(d1z + d2z), nz = d1x + d2x;
    const ln = Math.hypot(nx, nz);
    if (ln < 1e-6) { nx = -d2z; nz = d2x; } else { nx /= ln; nz /= ln; }
    const cos = Math.max(0.4, nx * -d2z + nz * d2x);
    L.push([b[0] + (nx * half) / cos, b[1] + (nz * half) / cos]);
    R.push([b[0] - (nx * half) / cos, b[1] - (nz * half) / cos]);
  }
  return [L, R];
}

// Splits a polyline where cut(x, z) is true (sampled every half unit); keeps the original corners.
export function clipPolyline(pts, cut) {
  const runs = [];
  let cur = null;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
    let last = null;
    for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
      const t = s / steps, p = [ax + (bx - ax) * t, az + (bz - az) * t];
      if (cut(p[0], p[1])) {
        if (cur) { if (last) cur.push(last); if (cur.length > 1) runs.push(cur); cur = null; }
        last = null;
      } else if (!cur) {
        cur = [p]; last = null;
      } else if (s === steps) {
        cur.push(p); last = null;
      } else {
        last = p;
      }
    }
  }
  if (cur && cur.length > 1) runs.push(cur);
  return runs.filter((r) => runLength(r) > 1.5);
}
function runLength(r) { let L = 0; for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return L; }

// Removes the little rectangular jogs that mark towers in the OSM wall lines.
// Returns {line, towers: [{x, z, nx, nz}]} with the outward side of each jog.
function splitTowers(pts) {
  const line = [pts[0]], towers = [];
  let i = 1;
  while (i < pts.length) {
    // a tower jog: 2-4 short segments that leave the line and come back
    let j = i, short = 0;
    while (j < pts.length - 1 && Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]) < 5 && short < 4) { j++; short++; }
    if (short >= 2 && j < pts.length) {
      const jog = pts.slice(i - 1, j + 1);
      const a = jog[0], b = jog[jog.length - 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      let off = 0, cx = 0, cz = 0;
      for (const p of jog) { cx += p[0]; cz += p[1]; const o = ((p[0] - a[0]) * -dz + (p[1] - a[1]) * dx) / L; if (Math.abs(o) > Math.abs(off)) off = o; }
      cx /= jog.length; cz /= jog.length;
      if (Math.abs(off) > 0.6) {
        const s = Math.sign(off);
        towers.push({ x: cx, z: cz, nx: (-dz / L) * s, nz: (dx / L) * s });
        i = j;
        continue;
      }
    }
    line.push(pts[i]);
    i++;
  }
  if (line[line.length - 1] !== pts[pts.length - 1]) line.push(pts[pts.length - 1]);
  return { line, towers };
}

export function buildWalls(ctx, chunks, rails) {
  const { MAP, terrain: T, colliders } = ctx;
  const H = T.heightAt;
  const at = (p) => chunks.at(p[0], p[1]);
  let count = 0;

  // The Pincio footbridge lands on the Muro Torto wall: keep its parapet and collider open there.
  const bridges = MAP.PATHS.filter((p) => p.k === 'bridge').map((p) => ({ a: p.p[0], b: p.p[p.p.length - 1], w: p.w }));
  const nearBridge = (x, z, pad) => bridges.some(({ a, b, w }) => Math.min(Math.hypot(x - a[0], z - a[1]), Math.hypot(x - b[0], z - b[1])) < w / 2 + pad);

  // ---- Aurelian Walls
  const pinciana = MAP.ANCHORS.pinciana?.footprint;
  const gatePopolo = [[-421.5, 90.6], [-420.0, 94.6], [-409.6, 91.8], [-399.2, 89.0], [-400.1, 84.8], [-410.6, 87.3]];
  const extra = CITY_WALLS.map((w) => decode(w, 4)).flatMap((pts) => clipPolyline(pts, (x, z) =>
    (pinciana && (pointInRing(x, z, pinciana) || distToRing(x, z, pinciana) < 1.5)) || pointInRing(x, z, gatePopolo) || distToRing(x, z, gatePopolo) < 0.6));
  const aurelian = [...MAP.WALLS.filter((w) => w.k === 'city_wall').map((w) => w.p), ...extra];
  for (const pts of aurelian) {
    const { line, towers } = splitTowers(pts);
    aurelianWall(ctx, chunks, line, nearBridge);
    // add towers where the data has none for a long stretch (about every 30 units)
    let acc = 0;
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = 30 - acc; s < L; s += 30) {
        const x = ax + ((bx - ax) * s) / L, z = az + ((bz - az) * s) / L;
        if (towers.some((t) => Math.hypot(t.x - x, t.z - z) < 18) || nearBridge(x, z, 6)) continue;
        // outward = the lower side (the road outside the walls), else away from the centre of Rome
        let nx = -(bz - az) / L, nz = (bx - ax) / L;
        const hl = H(x + nx * 4, z + nz * 4), hr = H(x - nx * 4, z - nz * 4);
        if (hl > hr + 0.5 || (Math.abs(hl - hr) <= 0.5 && (x + nx * 10 + 250) ** 2 + (z + nz * 10 - 1100) ** 2 < (x + 250) ** 2 + (z - 1100) ** 2)) { nx = -nx; nz = -nz; }
        towers.push({ x, z, nx, nz, made: true });
      }
      acc = (acc + L) % 30;
    }
    for (const t of towers) tower(ctx, at([t.x, t.z]), t, line);
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      if (nearBridge((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 2) || nearBridge(a[0], a[1], 1) || nearBridge(b[0], b[1], 1)) continue;
      colliders.addSegment(a[0], a[1], b[0], b[1], 'wall', { kind: 'city_wall' }, 1.35);
    }
    count++;
  }

  // ---- park walls, railings, hedges
  for (const w of MAP.WALLS) {
    if (w.k === 'city_wall') continue;
    const pts = w.p;
    if (pts.length < 2) continue;
    if (w.k === 'wall') gardenWall(chunks, pts, H, 2.3);
    else if (w.k === 'retaining_wall') retainingWall(chunks, pts, H);
    else if (w.k === 'hedge') hedge(chunks, pts, H, ctx.rng(`cityscape:hedge:${pts[0]}`));
    else if (w.k === 'fence') railing(chunks, rails, pts, H);
    else if (w.k === 'chain') chain(chunks, pts, H);
    const tag = w.k === 'hedge' ? 'hedge' : w.k === 'fence' || w.k === 'chain' ? 'fence' : 'wall';
    const pad = { wall: 0.35, retaining_wall: 0.45, hedge: 0.6, fence: 0.15, chain: 0.12 }[w.k] ?? 0.3;
    colliders.addPolyline(pts, false, tag, { kind: w.k }, pad);
    count++;
  }

  // ---- Villa Medici: its garden wall along the edge the park shares with it
  const vm = MAP.NOGO.find((n) => n.k === 'villamedici');
  if (vm) {
    const edge = sharedEdge(vm.r, MAP.BOUNDARY, 2.5);
    for (const run of edge) {
      gardenWall(chunks, run, H, 3.2, '#e2c48f');
      colliders.addPolyline(run, false, 'wall', { kind: 'villamedici' }, 0.4);
      count++;
    }
  }
  return count;
}

function distToRing(x, z, r) {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const ax = r[j][0], az = r[j][1], dx = r[i][0] - ax, dz = r[i][1] - az;
    const L2 = dx * dx + dz * dz;
    let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

// Runs of ring edges that lie along another ring (within tol).
function sharedEdge(ring, other, tol) {
  const runs = [];
  let cur = [];
  for (let i = 0; i <= ring.length; i++) {
    const p = ring[i % ring.length];
    if (distToRing(p[0], p[1], other) < tol) cur.push(p);
    else { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

// Generic wall body along a polyline: two faces + top, between bottom(i) and top(i).
function wallBody(cb, pts, half, bottom, top, color, cell, caps = true) {
  const [Lp, Rp] = sides(pts, half);
  const [tw, th] = TILE[cell] || [1, 1];
  let u = 0;
  for (let i = 1; i < pts.length; i++) {
    const du = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / tw;
    for (const [S, sgn] of [[Lp, 1], [Rp, -1]]) {
      const a = S[i - 1], b = S[i];
      const nx = -(b[1] - a[1]) * sgn, nz = (b[0] - a[0]) * sgn;
      cb.quad([a[0], bottom[i - 1], a[1]], [b[0], bottom[i], b[1]], [b[0], top[i], b[1]], [a[0], top[i - 1], a[1]], color, cell,
        [[u, bottom[i - 1] / th], [u + du, bottom[i] / th], [u + du, top[i] / th], [u, top[i - 1] / th]], false, [nx, 0, nz]);
    }
    cb.quad([Lp[i - 1][0], top[i - 1], Lp[i - 1][1]], [Lp[i][0], top[i], Lp[i][1]], [Rp[i][0], top[i], Rp[i][1]], [Rp[i - 1][0], top[i - 1], Rp[i - 1][1]],
      color, cell, [[u, 0], [u + du, 0], [u + du, (half * 2) / th], [u, (half * 2) / th]], false, [0, 1, 0]);
    u += du;
  }
  if (caps) {
    const n = pts.length;
    for (const [i, k] of [[0, 1], [n - 1, n - 2]]) {
      const a = Lp[i], b = Rp[i];
      cb.quad([a[0], bottom[i], a[1]], [b[0], bottom[i], b[1]], [b[0], top[i], b[1]], [a[0], top[i], a[1]], color, cell,
        [[0, bottom[i] / th], [(half * 2) / tw, bottom[i] / th], [(half * 2) / tw, top[i] / th], [0, top[i] / th]], false,
        [pts[i][0] - pts[k][0], 0, pts[i][1] - pts[k][1]]);
    }
  }
  return [Lp, Rp];
}

// Ground heights on both sides of each vertex: [low, high].
function sideHeights(pts, H, d) {
  const [Lp, Rp] = sides(pts, d);
  return pts.map((p, i) => {
    const a = H(Lp[i][0], Lp[i][1]), b = H(Rp[i][0], Rp[i][1]), c = H(p[0], p[1]);
    return [Math.min(a, b, c), Math.max(a, b, c), a, b];
  });
}

function aurelianWall(ctx, chunks, line, nearBridge) {
  // the Pincio footbridge rests on the wall: no parapet or merlons where it lands
  for (const run of clipPolyline(line, (x, z) => nearBridge(x, z, 0.8))) wallPieces(ctx, chunks, run, nearBridge, true);
  for (const run of clipPolyline(line, (x, z) => !nearBridge(x, z, 0.8))) wallPieces(ctx, chunks, run, nearBridge, false);
}

function wallPieces(ctx, chunks, line, nearBridge, parapet) {
  const H = ctx.terrain.heightAt;
  // a retaining wall where one side is much lower (the Muro Torto cutting), free-standing elsewhere
  const all = sideHeights(line, H, 3);
  const retaining = all.reduce((a, [lo, hi]) => a + hi - lo, 0) / all.length > 2.5;
  // split into short pieces so each chunk gets its own part of a long wall
  const pieces = [];
  let cur = [line[0]], len = 0;
  for (let i = 1; i < line.length; i++) {
    cur.push(line[i]);
    len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    if (len > 60 && i < line.length - 1) { pieces.push(cur); cur = [line[i]]; len = 0; }
  }
  pieces.push(cur);
  for (const pts of pieces) {
    const mid = pts[Math.floor(pts.length / 2)];
    const cb = chunks.at(mid[0], mid[1]);
    const sh = sideHeights(pts, H, 3);
    const top = sh.map(([lo, hi]) => (!parapet ? hi - 0.15 : retaining ? hi + 1.8 : Math.max(hi + 1.8, lo + 8.2)));
    const bottom = sh.map(([lo]) => lo - 0.8);
    const [Lp, Rp] = wallBody(cb, pts, 1.2, bottom, top, BRICK, 'brick', parapet);
    if (!parapet) continue;
    // merlons along the outer edge: the lower side, or the side away from the centre of Rome
    let dl = 0, dr = 0;
    for (const [, , l, r] of sh) { dl += l; dr += r; }
    let outerL = dl < dr;
    if (Math.abs(dl - dr) < pts.length) outerL = farFromCentre(Lp[0]) > farFromCentre(Rp[0]);
    const S = outerL ? Lp : Rp, O = outerL ? Rp : Lp;
    for (let i = 1; i < pts.length; i++) {
      const a = S[i - 1], b = S[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let s = 1.1; s < L - 0.6; s += 2.2) {
        const t = s / L;
        const ox = a[0] + (b[0] - a[0]) * t, oz = a[1] + (b[1] - a[1]) * t;
        const ix = O[i - 1][0] + (O[i][0] - O[i - 1][0]) * t, iz = O[i - 1][1] + (O[i][1] - O[i - 1][1]) * t;
        const x = ox + (ix - ox) * 0.15, z = oz + (iz - oz) * 0.15;
        if (nearBridge(x, z, 3)) continue;
        const y = top[i - 1] + (top[i] - top[i - 1]) * t;
        cb.geo(new THREE.BoxGeometry(0.7, 1.1, 1.1), mat(x, y + 0.5, z, ry), BRICK_DARK);
      }
    }
  }
}
const farFromCentre = ([x, z]) => (x + 250) ** 2 + (z - 1100) ** 2;

function tower(ctx, cb, t, line) {
  const H = ctx.terrain.heightAt;
  // direction of the wall at the tower
  let best = 0, bd = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot((line[i][0] + line[i - 1][0]) / 2 - t.x, (line[i][1] + line[i - 1][1]) / 2 - t.z);
    if (d < bd) { bd = d; best = i; }
  }
  const a = line[best - 1], b = line[best];
  const ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const cx = t.x + t.nx * 1.6, cz = t.z + t.nz * 1.6;
  const lo = Math.min(H(cx + t.nx * 3, cz + t.nz * 3), H(cx, cz), H(t.x, t.z)) - 0.8;
  const hi = Math.max(H(t.x - t.nx * 3, t.z - t.nz * 3), H(t.x, t.z));
  const top = Math.max(hi + 3.2, lo + 10.2);
  const h = top - lo;
  const w = 5.2, d = 5.0;
  cb.geo(new THREE.BoxGeometry(d, h, w), mat(cx, lo + h / 2, cz, ry), BRICK, 'brick', [w / TILE.brick[0], h / TILE.brick[1]]);
  // merlons around the top
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const ox = (u * (d / 2 - 0.4)), oz = (v * (w / 2 - 0.4));
    cb.geo(new THREE.BoxGeometry(0.8, 1.1, 0.8), mat(cx + ox * c + oz * s, top + 0.55, cz - ox * s + oz * c, ry), BRICK_DARK);
  }
  // two dark slit windows facing out
  for (const k of [-1, 1]) {
    cb.geo(new THREE.BoxGeometry(0.2, 1.4, 0.45), mat(cx + t.nx * (d / 2 + 0.02) + k * 1.2 * s, top - 2.6, cz + t.nz * (d / 2 + 0.02) + k * 1.2 * c, ry), '#3a2c25');
  }
}

function gardenWall(chunks, pts, H, height, color = '#e9d3a8') {
  const mid = pts[Math.floor(pts.length / 2)];
  const cb = chunks.at(mid[0], mid[1]);
  const sh = sideHeights(pts, H, 0.6);
  const bottom = sh.map(([lo]) => lo - 0.4);
  const top = sh.map(([, hi]) => hi + height);
  wallBody(cb, pts, 0.25, bottom, top, color, 'stucco');
  wallBody(cb, pts, 0.38, top, top.map((y) => y + 0.2), '#efe8da', 'white');
}

function retainingWall(chunks, pts, H) {
  const mid = pts[Math.floor(pts.length / 2)];
  const cb = chunks.at(mid[0], mid[1]);
  const sh = sideHeights(pts, H, 1.0);
  const bottom = sh.map(([lo]) => lo - 0.5);
  const top = sh.map(([, hi]) => hi + 0.75);
  wallBody(cb, pts, 0.35, bottom, top, '#cdbf9f', 'ashlar');
  wallBody(cb, pts, 0.45, top, top.map((y) => y + 0.16), '#ece4d2', 'white');
}

function hedge(chunks, pts, H, rnd) {
  const mid = pts[Math.floor(pts.length / 2)];
  const cb = chunks.at(mid[0], mid[1]);
  const color = rnd.pick(['#3f6e35', '#3a6531', '#46763a']);
  const sh = sideHeights(pts, H, 0.6);
  wallBody(cb, pts, 0.55, sh.map(([lo]) => lo - 0.3), sh.map(([, hi]) => hi + 1.3), color, 'leaves');
}

function railing(chunks, rails, pts, H) {
  const mid = pts[Math.floor(pts.length / 2)];
  const cb = chunks.at(mid[0], mid[1]);
  let u = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az);
    const ha = H(ax, az), hb = H(bx, bz);
    rails.quad(ax, ha, az, bx, hb, bz, 1.5, u, u + L / 1.2);
    u += L / 1.2;
    const ry = Math.atan2(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 5));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 1) continue;
      const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      cb.geo(new THREE.BoxGeometry(0.14, 1.75, 0.14), mat(x, H(x, z) + 0.8, z, ry), '#2a2b2e');
    }
  }
}

function chain(chunks, pts, H) {
  const mid = pts[Math.floor(pts.length / 2)];
  const cb = chunks.at(mid[0], mid[1]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 2.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      cb.geo(new THREE.CylinderGeometry(0.1, 0.13, 0.8, 6), mat(x, H(x, z) + 0.4, z), '#e6dece');
      if (k < n) {
        const x2 = ax + (bx - ax) * (t + 0.5 / n), z2 = az + (bz - az) * (t + 0.5 / n);
        cb.geo(new THREE.BoxGeometry(0.05, 0.05, L / n), mat(x2, H(x2, z2) + 0.62, z2, ry), '#3a3a3a');
      }
    }
  }
}

// Railing panels (alpha-tested texture), one double-sided quad per fence segment.
export class RailBuilder {
  constructor() { this.P = []; this.U = []; this.I = []; this.n = 0; }
  quad(ax, ay, az, bx, by, bz, h, u0, u1) {
    const i = this.n;
    this.P.push(ax, ay - 0.05, az, bx, by - 0.05, bz, bx, by + h, bz, ax, ay + h, az);
    this.U.push(u0, 0, u1, 0, u1, 1, u0, 1);
    this.I.push(i, i + 1, i + 2, i, i + 2, i + 3);
    this.n += 4;
  }
  build(material) {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
    g.setIndex(this.I);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = 'cityscape:railings';
    m.castShadow = true;
    m.matrixAutoUpdate = false;
    return m;
  }
}
