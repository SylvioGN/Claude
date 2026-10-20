// The marble busts of illustrious Italians on herm pillars that line the Pincio avenues (about 228
// in the real park). One instanced model, facing the avenue, set back from its edge.
import * as THREE from 'three';
import { GeoBuilder, buildGeometry, instancedChunks, mats } from '../../core/util.js';
import { samplePolyline, pointInRing, distToRingEdge, ringBBox } from '../../core/geo.js';
import { offsetPolyline } from './kit.js';

function bustGeometry() {
  const b = new GeoBuilder();
  const M = '#f1ede4', P = '#e4ded1';
  b.box(0.5, 0.16, 0.5, P, 0, 0.08, 0);
  b.place(new THREE.CylinderGeometry(0.16 * Math.SQRT2, 0.2 * Math.SQRT2, 1.3, 4, 1), M, 0, 0.16 + 0.65, 0, 0, Math.PI / 4, 0);
  b.box(0.44, 0.08, 0.44, P, 0, 1.5, 0);
  b.place(new THREE.IcosahedronGeometry(0.34, 0), M, 0, 1.76, 0, 0, 0, 0, 1.2, 0.75, 0.66);
  b.cyl(0.1, 0.11, 0.18, 5, M, 0, 2.02, 0.02);
  b.place(new THREE.IcosahedronGeometry(0.2, 0), M, 0, 2.28, 0.04, 0, 0, 0, 0.9, 1.12, 1.02);
  b.place(new THREE.IcosahedronGeometry(0.17, 0), '#e6e0d2', 0, 2.36, -0.03, 0, 0, 0, 1.08, 0.82, 1.1);
  return buildGeometry(b);
}

export function buildBusts(ctx) {
  const { MAP, terrain: T, colliders, quality } = ctx;
  const spacing = quality.tier === 'low' ? 10 : 7;
  const inPincio = (x, z) => x < -168 && z > 30;
  const plazas = MAP.PLAZAS.map((p) => ({ r: p.r, bb: ringBBox(p.r) }));
  const waters = MAP.WATER.filter((w) => w.r.some(([x, z]) => inPincio(x, z))).map((w) => ({ r: w.r, bb: ringBBox(w.r) }));
  const near = (list, x, z, pad) => list.some(({ r, bb }) =>
    x > bb.minX - pad && x < bb.maxX + pad && z > bb.minZ - pad && z < bb.maxZ + pad && (pointInRing(x, z, r) || distToRingEdge(x, z, r) < pad));

  const placed = [];
  const tooClose = (x, z, r) => placed.some((p) => Math.abs(p.x - x) < r && Math.abs(p.z - z) < r && Math.hypot(p.x - x, p.z - z) < r);
  const items = [];
  const tryPlace = (x, z, faceX, faceZ) => {
    if (!inPincio(x, z) || !T.isInside(x, z) || distToRingEdge(x, z, MAP.BOUNDARY) < 2.5) return;
    const np = T.nearestPath(x, z);
    if (np && np.d < np.w / 2 + 0.9) return;
    if (near(plazas, x, z, 1.2) || near(waters, x, z, 2.5)) return;
    if (ctx.isReserved(x, z, 1.2)) return;
    if (!colliders.isFree(x, z, 0.9) || tooClose(x, z, spacing * 0.62)) return;
    const y = T.heightAt(x, z);
    placed.push({ x, z });
    items.push({ x, y: y - 0.05, z, ry: Math.atan2(faceX - x, faceZ - z), s: 1, color: tint(items.length) });
    colliders.addCircle(x, z, 0.35, 'statue', { name: 'busto' });
  };

  // Both sides of every Pincio avenue.
  for (const p of MAP.PATHS) {
    if (p.k !== 'viale' || !p.p.every(([x, z]) => inPincio(x, z))) continue;
    for (const side of [-1, 1]) {
      const line = offsetPolyline(p.p, side * (p.w / 2 + 1.35));
      // look back across the avenue: against the offset direction (-dirZ, dirX) * side
      for (const s of samplePolyline(line, spacing, spacing * 0.5)) tryPlace(s.x, s.z, s.x + side * s.dirZ, s.z - side * s.dirX);
    }
  }
  // Round the edge of Piazzale Napoleone (except along the balustrade).
  const nap = MAP.ANCHORS.napoleone;
  if (nap.footprint) {
    const ring = [...nap.footprint, nap.footprint[0]];
    for (const d of [1.4, -1.4]) {
      for (const s of samplePolyline(offsetPolyline(ring, d), 6.5, 2)) {
        if (s.x < -305) continue;
        tryPlace(s.x, s.z, nap.x, nap.z);
      }
    }
  }
  if (!items.length) return null;
  return { group: instancedChunks(bustGeometry(), mats().vcFlat, items, { castShadow: true, name: 'pincio-busts' }), count: items.length };
}

function tint(i) {
  const k = ((i * 37) % 11) / 11;
  const c = new THREE.Color('#ffffff').lerp(new THREE.Color('#ddd6c8'), k * 0.8);
  return `#${c.getHexString()}`;
}
