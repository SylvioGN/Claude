// Trees outside the park, requested from the vegetation module with ctx.plant: plane trees along
// the big avenues, holm oaks and pines in the city gardens. The fenced neighbours (zoo, Villa
// Medici) are left to the vegetation module, which plants them when nobody else did.
import { ROADS, GREENS } from './osmCity.js';
import { decode } from './city.js';
import { pointInRing } from './builder.js';

const AVENUES = /Belle Arti|Corso d'Italia|Via Pinciana|Bruno Buozzi|Flaminia|Rossini|Vittorio Veneto|Washington|Trinità dei Monti/;

export function plantCityTrees(ctx, buildingRings) {
  const { MAP, terrain: T, rng, quality } = ctx;
  const rnd = rng('cityscape:trees');
  const density = quality.treeDensity ?? 1;
  const outside = T.outsideDistance || (() => 99);
  const E = T.extent;
  // coarse grid of building rings so the free-spot test stays cheap
  const G = 40, grid = new Map();
  for (const r of buildingRings) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of r) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    for (let i = Math.floor(minX / G); i <= Math.floor(maxX / G); i++) {
      for (let j = Math.floor(minZ / G); j <= Math.floor(maxZ / G); j++) {
        const k = `${i},${j}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(r);
      }
    }
  }
  const free = (x, z, pad) => {
    if (x < E.minX + 3 || x > E.maxX - 3 || z < E.minZ + 3 || z > E.maxZ - 3 || outside(x, z) < 4) return false;
    if (MAP.NOGO.some((q) => pointInRing(x, z, q.r))) return false;
    for (const [dx, dz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]) {
      const list = grid.get(`${Math.floor((x + dx) / G)},${Math.floor((z + dz) / G)}`);
      if (list && list.some((r) => pointInRing(x + dx, z + dz, r))) return false;
    }
    return true;
  };
  let n = 0;
  const plant = (kind, x, z, scale) => {
    if (rnd() > density) return;
    ctx.plant(kind, x, z, { scale, ry: rnd() * Math.PI * 2 });
    n++;
  };

  // plane trees along the avenues, both sides
  for (const r of ROADS) {
    if (!AVENUES.test(r.n) || r.c > 2) continue;
    const pts = decode(r.p, 2);
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const L = Math.hypot(bx - ax, bz - az);
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let s = 8; s < L; s += 18) {
        for (const side of [-6, 6]) {
          const x = ax + ((bx - ax) * s) / L + nx * side, z = az + ((bz - az) * s) / L + nz * side;
          if (free(x, z, 2.5)) plant('plane', x, z, 0.85 + rnd() * 0.3);
        }
      }
    }
  }
  // gardens
  for (const g of GREENS) {
    const ring = decode(g, 4, 1);
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of ring) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const want = Math.min(10, Math.round(((maxX - minX) * (maxZ - minZ)) / 600));
    for (let k = 0, tries = 0; k < want && tries < want * 6; tries++) {
      const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ);
      if (!pointInRing(x, z, ring) || !free(x, z, 3)) continue;
      plant(rnd.pick(g[0] ? ['holmOak', 'holmOak', 'umbrellaPine'] : ['umbrellaPine', 'holmOak', 'cypress', 'plane']), x, z, 0.8 + rnd() * 0.4);
      k++;
    }
  }
  return n;
}
