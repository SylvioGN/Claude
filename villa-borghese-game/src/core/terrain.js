// Shared ground model: height field, surface types, drivable area and nearest-path lookup.
// Everything that sits on the ground must use terrain.heightAt(x, z) so objects and the
// terrain mesh (built by modules/world.js from terrain.H) line up.
import * as MAP from '../data/park.js';
import { fbm2 } from './rng.js';
import { pointInRing, closestOnSegment, ringBBox, smoothstep, clamp } from './geo.js';

export const SURF = { GRASS: 0, PATH: 1, PLAZA: 2, WATER: 3, OUTSIDE: 4, FOREST: 5, SAND: 6 };
export const SURF_NAME = ['grass', 'path', 'plaza', 'water', 'outside', 'forest', 'sand'];

const G = 1.5;          // height grid spacing (game units)
const SG = 1.0;         // surface grid spacing
export const MARGIN = 170; // terrain extends this far beyond the park bounds
export const WATER_Y = -0.55; // lake surface height

export function createTerrain() {
  const B = MAP.BOUNDS;
  const x0 = Math.floor((B.minX - MARGIN) / G) * G;
  const z0 = Math.floor((B.minZ - MARGIN) / G) * G;
  const nx = Math.ceil((B.maxX + MARGIN - x0) / G) + 1;
  const nz = Math.ceil((B.maxZ + MARGIN - z0) / G) + 1;
  const H = new Float32Array(nx * nz);

  const lake = MAP.WATER.find((w) => w.k === 'lake');
  const lakeBox = lake ? ringBBox(lake.r) : null;
  const flats = Object.values(MAP.ANCHORS).map((a) => ({ x: a.x, z: a.z, r: Math.max(6, (a.len || 10) * 0.6) }));

  // --- distance outside the drivable boundary on a coarse grid (cheap to build, bilinear lookup)
  const CG = 6;
  const cnx = Math.ceil((nx * G) / CG) + 1, cnz = Math.ceil((nz * G) / CG) + 1;
  const outsideDist = new Float32Array(cnx * cnz);
  const bnd = MAP.BOUNDARY;
  for (let j = 0; j < cnz; j++) {
    for (let i = 0; i < cnx; i++) {
      const x = x0 + i * CG, z = z0 + j * CG;
      if (pointInRing(x, z, bnd)) { outsideDist[j * cnx + i] = 0; continue; }
      let best = Infinity;
      for (let k = 0, m = bnd.length - 1; k < bnd.length; m = k++) {
        const c = closestOnSegment(x, z, bnd[m][0], bnd[m][1], bnd[k][0], bnd[k][1]);
        if (c.d2 < best) best = c.d2;
      }
      outsideDist[j * cnx + i] = Math.sqrt(best);
    }
  }
  const outsideAt = (x, z) => {
    const fx = clamp((x - x0) / CG, 0, cnx - 1.001), fz = clamp((z - z0) / CG, 0, cnz - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = outsideDist[j * cnx + i], b = outsideDist[j * cnx + i + 1];
    const c = outsideDist[(j + 1) * cnx + i], d = outsideDist[(j + 1) * cnx + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };

  const muro = MAP.BACKDROP.muroTorto || [];
  const muroDist = (x, z) => {
    let best = Infinity;
    for (let k = 1; k < muro.length; k++) {
      const c = closestOnSegment(x, z, muro[k - 1][0], muro[k - 1][1], muro[k][0], muro[k][1]);
      if (c.d2 < best) best = c.d2;
    }
    return Math.sqrt(best);
  };

  // --- analytic height used to fill the grid
  function rawHeight(x, z) {
    let h = fbm2(x / 140 + 11.3, z / 140 - 4.2, 2) * 1.8 + fbm2(x / 38, z / 38, 2) * 0.35;
    // keep landmark sites level
    for (const f of flats) {
      if (Math.abs(x - f.x) > f.r + 18 || Math.abs(z - f.z) > f.r + 18) continue;
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + 18) h *= smoothstep(f.r, f.r + 18, d);
    }
    // lake basin
    if (lake && x > lakeBox.minX - 8 && x < lakeBox.maxX + 8 && z > lakeBox.minZ - 8 && z < lakeBox.maxZ + 8) {
      let edge = Infinity;
      const r = lake.r;
      for (let k = 0, m = r.length - 1; k < r.length; m = k++) {
        const c = closestOnSegment(x, z, r[m][0], r[m][1], r[k][0], r[k][1]);
        if (c.d2 < edge) edge = c.d2;
      }
      edge = Math.sqrt(edge);
      const inside = pointInRing(x, z, r);
      const shore = smoothstep(8, 0, edge);
      h *= inside ? 0 : 1 - shore; // flat ring around the shore
      if (inside) h = -0.9 - 1.6 * smoothstep(0, 6, edge);
    }
    // outside the park: the Pincio terrace drops to Piazza del Popolo, Viale del Muro Torto runs in a cutting
    const od = outsideAt(x, z);
    if (od > 0.5) {
      if (x < -300 && z > 15) h -= 13 * smoothstep(1, 7, od) * smoothstep(-300, -322, x);
      if (muro.length && od > 1.5) {
        const md = muroDist(x, z);
        if (md < 16) h -= 7 * smoothstep(16, 7, md) * smoothstep(1.5, 5, od);
      }
    }
    return h;
  }

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) H[j * nx + i] = rawHeight(x0 + i * G, z0 + j * G);
  }

  function heightAt(x, z) {
    const fx = clamp((x - x0) / G, 0, nx - 1.001), fz = clamp((z - z0) / G, 0, nz - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], d = H[(j + 1) * nx + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  function normalAt(x, z, e = 1) {
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    const L = Math.hypot(hx, 2 * e, hz);
    return [-hx / L, (2 * e) / L, -hz / L];
  }

  // --- surface grid over the park bounds (1 unit cells)
  const sx0 = Math.floor(B.minX) - 8, sz0 = Math.floor(B.minZ) - 8;
  const snx = Math.ceil(B.maxX - sx0) + 9, snz = Math.ceil(B.maxZ - sz0) + 9;
  const S = new Uint8Array(snx * snz).fill(SURF.OUTSIDE);
  const fillRing = (ring, code, onlyOver = null) => {
    const bb = ringBBox(ring);
    const i0 = Math.max(0, Math.floor((bb.minX - sx0) / SG)), i1 = Math.min(snx - 1, Math.ceil((bb.maxX - sx0) / SG));
    const j0 = Math.max(0, Math.floor((bb.minZ - sz0) / SG)), j1 = Math.min(snz - 1, Math.ceil((bb.maxZ - sz0) / SG));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const idx = j * snx + i;
        if (onlyOver !== null && S[idx] !== onlyOver) continue;
        if (pointInRing(sx0 + (i + 0.5) * SG, sz0 + (j + 0.5) * SG, ring)) S[idx] = code;
      }
    }
  };
  fillRing(MAP.BOUNDARY, SURF.GRASS);
  for (const h of MAP.HOLES) fillRing(h, SURF.OUTSIDE);
  for (const f of MAP.FOREST) fillRing(f, SURF.FOREST, SURF.GRASS);
  for (const n of MAP.NOGO) if (n.k === 'galoppatoio') fillRing(n.r, SURF.SAND, SURF.OUTSIDE);
  for (const p of MAP.PLAZAS) fillRing(p.r, SURF.PLAZA);

  // paths: also build a segment hash for nearest-path queries
  const PC = 10;
  const pcx0 = sx0, pcz0 = sz0;
  const pcnx = Math.ceil((snx * SG) / PC) + 1, pcnz = Math.ceil((snz * SG) / PC) + 1;
  const pathCells = new Array(pcnx * pcnz);
  const segs = [];
  MAP.PATHS.forEach((p, pi) => {
    for (let k = 1; k < p.p.length; k++) {
      const [ax, az] = p.p[k - 1], [bx, bz] = p.p[k];
      const seg = { ax, az, bx, bz, w: p.w, kind: p.k, name: p.n, path: pi };
      segs.push(seg);
      const pad = p.w / 2 + 1;
      const minX = Math.min(ax, bx) - pad, maxX = Math.max(ax, bx) + pad;
      const minZ = Math.min(az, bz) - pad, maxZ = Math.max(az, bz) + pad;
      // rasterise into the surface grid
      const i0 = Math.max(0, Math.floor((minX - sx0) / SG)), i1 = Math.min(snx - 1, Math.ceil((maxX - sx0) / SG));
      const j0 = Math.max(0, Math.floor((minZ - sz0) / SG)), j1 = Math.min(snz - 1, Math.ceil((maxZ - sz0) / SG));
      const r2 = (p.w / 2) * (p.w / 2);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const idx = j * snx + i;
          if (S[idx] === SURF.OUTSIDE && p.k !== 'bridge') continue;
          const c = closestOnSegment(sx0 + (i + 0.5) * SG, sz0 + (j + 0.5) * SG, ax, az, bx, bz);
          if (c.d2 <= r2) S[idx] = SURF.PATH;
        }
      }
      // segment hash (cells reach 12 units beyond the segment)
      const ci0 = Math.max(0, Math.floor((minX - 12 - pcx0) / PC)), ci1 = Math.min(pcnx - 1, Math.floor((maxX + 12 - pcx0) / PC));
      const cj0 = Math.max(0, Math.floor((minZ - 12 - pcz0) / PC)), cj1 = Math.min(pcnz - 1, Math.floor((maxZ + 12 - pcz0) / PC));
      for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) (pathCells[cj * pcnx + ci] ||= []).push(seg);
    }
  });
  for (const w of MAP.WATER) fillRing(w.r, SURF.WATER);

  function surfaceAt(x, z) {
    const i = Math.floor((x - sx0) / SG), j = Math.floor((z - sz0) / SG);
    if (i < 0 || j < 0 || i >= snx || j >= snz) return SURF.OUTSIDE;
    return S[j * snx + i];
  }

  // Nearest path segment within ~12 units: {d, x, z, dirX, dirZ, w, kind, name, path} or null
  function nearestPath(x, z) {
    const ci = Math.floor((x - pcx0) / PC), cj = Math.floor((z - pcz0) / PC);
    if (ci < 0 || cj < 0 || ci >= pcnx || cj >= pcnz) return null;
    const list = pathCells[cj * pcnx + ci];
    if (!list) return null;
    let best = null, bd = Infinity;
    for (const s of list) {
      const c = closestOnSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (c.d2 < bd) { bd = c.d2; best = { s, c }; }
    }
    if (!best) return null;
    const { s, c } = best;
    const L = Math.hypot(s.bx - s.ax, s.bz - s.az) || 1;
    return { d: Math.sqrt(bd), x: c.x, z: c.z, dirX: (s.bx - s.ax) / L, dirZ: (s.bz - s.az) / L, w: s.w, kind: s.kind, name: s.name, path: s.path };
  }

  const isInside = (x, z) => pointInRing(x, z, MAP.BOUNDARY) && !MAP.HOLES.some((h) => pointInRing(x, z, h));

  return {
    G, x0, z0, nx, nz, H, heightAt, normalAt,
    surface: { S, x0: sx0, z0: sz0, nx: snx, nz: snz, step: SG },
    surfaceAt, nearestPath, segments: segs, isInside, outsideDistance: outsideAt,
    extent: { minX: x0, minZ: z0, maxX: x0 + (nx - 1) * G, maxZ: z0 + (nz - 1) * G },
  };
}
