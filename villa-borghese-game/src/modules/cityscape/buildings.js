// Roman buildings from footprints: stucco walls with window bays (one quad per wall, the atlas
// repeats the floors), a white cornice, and a terracotta hip roof (true hip on rectangles,
// truncated hip on other shapes) or a flat roof terrace with plants.
import * as THREE from 'three';
import { BAY, TILE } from './atlas.js';
import { signedArea, edgeNormal, offsetRing, insetRing } from './builder.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
export function mat(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  return _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

// Tile uv for a sloped roof face whose eave runs p -> q (horizontal); pts are 3D points.
function slopeUV(p, q, pts, slope) {
  const dx = q[0] - p[0], dz = q[2] - p[2], L = Math.hypot(dx, dz) || 1;
  const tx = dx / L, tz = dz / L;
  const [tw, th] = TILE.tiles;
  return pts.map((X) => {
    const rx = X[0] - p[0], rz = X[2] - p[2];
    return [(rx * tx + rz * tz) / tw, (Math.abs(-rx * tz + rz * tx) * slope) / th];
  });
}

function isRectangle(r) {
  if (r.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const a = r[i], b = r[(i + 1) % 4], c = r[(i + 2) % 4];
    const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
    const cos = (ux * vx + uz * vz) / (Math.hypot(ux, uz) * Math.hypot(vx, vz) || 1);
    if (Math.abs(cos) > 0.17) return false;
  }
  return true;
}

// Adds one building to CityBuilder cb. Returns {top, area}.
//   spec: {ring, floors, floorH, facade, wall, trim, roof, roofType: 'hip'|'flat'|'terrace', heightAt,
//          sink?, cornice?, blank? (no windows), hipDepth?, rnd? (plants on roof terraces)}
export function addBuilding(cb, spec) {
  const { ring, floors, floorH, facade, wall, trim = '#f1ece1', roof, heightAt } = spec;
  const n = ring.length;
  if (n < 3) return null;
  const area = signedArea(ring);
  const hs = ring.map(([x, z]) => heightAt(x, z));
  const gmax = Math.max(...hs);
  const sink = spec.sink ?? 0.6;
  const top = gmax + floors * floorH;
  const floorBase = top - floors * floorH;

  // walls: one quad per edge, windows fitted to whole bays
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.05) continue;
    const [nx, nz] = edgeNormal(ring, i, area);
    const ya = hs[i] - sink, yb = hs[j] - sink;
    const bays = L / BAY;
    let cell = facade, ground = true, u1 = Math.max(1, Math.round(bays));
    if (bays < 0.55 || spec.blank) {
      cell = 'stucco'; ground = false; u1 = L / TILE.stucco[0];
    }
    const vh = ground ? floorH : TILE.stucco[1];
    const vb = (y) => (y - floorBase) / vh;
    cb.quad([ax, ya, az], [bx, yb, bz], [bx, top, bz], [ax, top, az], wall, cell,
      [[0, vb(ya)], [u1, vb(yb)], [u1, vb(top)], [0, vb(top)]], ground, [nx, 0, nz]);
  }

  // cornice band with its soffit
  const cornice = spec.cornice ?? true;
  const ch = cornice ? (spec.roofType === 'hip' ? 0.5 : 0.85) : 0.15;
  const eave = offsetRing(ring, cornice ? 0.3 : 0.08);
  const y1 = top + ch;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [nx, nz] = edgeNormal(ring, i, area);
    const a = eave[i], b = eave[j];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    cb.quad([a[0], top, a[1]], [b[0], top, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], trim, 'white',
      [[0, 0], [L, 0], [L, 1], [0, 1]], false, [nx, 0, nz]);
    if (cornice) {
      cb.quad([ring[i][0], top, ring[i][1]], [ring[j][0], top, ring[j][1]], [b[0], top, b[1]], [a[0], top, a[1]], trim, 'white',
        [[0, 0], [1, 0], [1, 1], [0, 1]], false, [0, -1, 0]);
    }
  }

  // roof
  const roofType = spec.roofType || 'hip';
  if (roofType === 'hip' && n === 4 && isRectangle(eave)) {
    hipRoof(cb, eave, y1, roof);
  } else if (roofType === 'hip') {
    const ins = insetRing(eave, spec.hipDepth ?? 2.6);
    if (ins) {
      const rise = ins.d * 0.42, slope = Math.hypot(1, 0.42);
      const y2 = y1 + rise;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const p = [eave[i][0], y1, eave[i][1]], q = [eave[j][0], y1, eave[j][1]];
        const r = [ins.ring[j][0], y2, ins.ring[j][1]], s = [ins.ring[i][0], y2, ins.ring[i][1]];
        cb.quad(p, q, r, s, roof, 'tiles', slopeUV(p, q, [p, q, r, s], slope), false, [0, 1, 0]);
      }
      cb.flat(ins.ring, y2, roof, 'tiles');
    } else {
      cb.flat(eave, y1, roof, 'tiles');
    }
  } else {
    // flat roof: terrace floor just below the parapet top
    const yt = y1 - 0.35;
    cb.flat(eave, yt, roofType === 'terrace' ? '#e6d6bb' : '#cbbfae', 'terrace');
    if (roofType === 'terrace' && spec.rnd) roofPlants(cb, ring, area, yt, spec.rnd);
  }
  return { top, area: Math.abs(area), roofY: y1 };
}

// True hip roof on a rectangle: ridge along the long side.
function hipRoof(cb, r, y, color) {
  const d0 = Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]);
  const d1 = Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1]);
  // rotate so that r0->r1 is a long side
  const q = d0 >= d1 ? r : [r[1], r[2], r[3], r[0]];
  const long = Math.max(d0, d1), short = Math.min(d0, d1);
  const lx = (q[1][0] - q[0][0]) / long, lz = (q[1][1] - q[0][1]) / long;
  const half = short / 2;
  const rise = half * 0.5, slope = Math.hypot(1, 0.5);
  const yr = y + rise;
  const inset = Math.min(half, long / 2 - 0.01);
  const ma = [(q[0][0] + q[3][0]) / 2 + lx * inset, yr, (q[0][1] + q[3][1]) / 2 + lz * inset];
  const mb = [(q[1][0] + q[2][0]) / 2 - lx * inset, yr, (q[1][1] + q[2][1]) / 2 - lz * inset];
  const P = q.map(([x, z]) => [x, y, z]);
  cb.quad(P[0], P[1], mb, ma, color, 'tiles', slopeUV(P[0], P[1], [P[0], P[1], mb, ma], slope), false, [0, 1, 0]);
  cb.quad(P[2], P[3], ma, mb, color, 'tiles', slopeUV(P[2], P[3], [P[2], P[3], ma, mb], slope), false, [0, 1, 0]);
  cb.tri(P[1], P[2], mb, color, 'tiles', slopeUV(P[1], P[2], [P[1], P[2], mb], slope), [0, 1, 0]);
  cb.tri(P[3], P[0], ma, color, 'tiles', slopeUV(P[3], P[0], [P[3], P[0], ma], slope), [0, 1, 0]);
}

// A few planters and a pergola or umbrella on a roof terrace.
const PLANT = ['#4f7f3a', '#5d8f42', '#3f6d34', '#6f9a48'];
function roofPlants(cb, ring, area, y, rnd) {
  const n = ring.length;
  const count = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < count; k++) {
    const i = Math.floor(rnd() * n), j = (i + 1) % n;
    const t = 0.2 + rnd() * 0.6;
    const [nx, nz] = edgeNormal(ring, i, area);
    const x = ring[i][0] + (ring[j][0] - ring[i][0]) * t - nx * 0.9;
    const z = ring[i][1] + (ring[j][1] - ring[i][1]) * t - nz * 0.9;
    const ry = Math.atan2(ring[j][0] - ring[i][0], ring[j][1] - ring[i][1]);
    cb.geo(new THREE.BoxGeometry(0.6, 0.5, 1.6), mat(x, y + 0.25, z, ry), '#b8865a');
    cb.geo(new THREE.IcosahedronGeometry(0.75, 0), mat(x, y + 0.85, z, ry, 0.8, 0.8, 1.3), PLANT[k % 4], 'leaves', [0.6, 0.6]);
  }
  if (rnd() < 0.35) {
    // white umbrella over a little table
    const c = ring.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]);
    cb.geo(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), mat(c[0], y + 1, c[1]), '#6b6b6b');
    cb.geo(new THREE.ConeGeometry(1.4, 0.5, 8), mat(c[0], y + 2.1, c[1]), rnd() < 0.5 ? '#f4efe4' : '#d8c27a');
  }
}

// Small church dome (drum, dome, lantern) centred at (x, y, z).
export function addDome(cb, x, y, z, r, { drum = '#efe6d4', dome = '#9aa3a6', lantern = '#f3eee3', seg = 12 } = {}) {
  cb.geo(new THREE.CylinderGeometry(r, r, r * 0.9, seg, 1, true), mat(x, y + r * 0.45, z), drum);
  cb.geo(new THREE.CylinderGeometry(r * 1.06, r * 1.06, r * 0.12, seg), mat(x, y + r * 0.92, z), '#f6f1e6');
  cb.geo(new THREE.SphereGeometry(r, seg, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, y + r * 0.95, z, 0, 1, 1.15, 1), dome, 'ribs', [seg, 1]);
  cb.geo(new THREE.CylinderGeometry(r * 0.22, r * 0.26, r * 0.45, 8), mat(x, y + r * 2.25, z), lantern);
  cb.geo(new THREE.ConeGeometry(r * 0.26, r * 0.35, 8), mat(x, y + r * 2.65, z), dome);
}
