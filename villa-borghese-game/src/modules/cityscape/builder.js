// Geometry writer for the atlas material (see atlas.js): indexed triangles with position, normal,
// vertex colour, unwrapped tile coordinates (fuv) and the atlas cell to repeat (cell).
// Compact attribute types keep the big merged city meshes light on phone memory.
import * as THREE from 'three';
import { CELL, GROUND_ROW, TILE } from './atlas.js';

const _c = new THREE.Color();
const colorCache = new Map();
export function lin(hex) {
  let v = colorCache.get(hex);
  if (!v) { _c.set(hex); v = [_c.r, _c.g, _c.b]; colorCache.set(hex, v); }
  return v;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

export class CityBuilder {
  constructor() {
    this.P = []; this.N = []; this.C = []; this.F = []; this.L = []; this.I = [];
    this.n = 0;
  }
  get triangles() { return this.I.length / 3; }

  _v(x, y, z, nx, ny, nz, col, u, v, g, cell) {
    this.P.push(x, y, z); this.N.push(nx, ny, nz); this.C.push(col[0], col[1], col[2]);
    this.F.push(u, v, g); this.L.push(cell[0], cell[1], cell[2], cell[3]);
    return this.n++;
  }

  // Planar quad a-b-c-d (any winding; `facing` [x,y,z] flips it to face that way).
  // uv: four [u, v] pairs in tile units. ground: true for facades with a ground-floor cell.
  quad(a, b, c, d, color, cellName, uv, ground = false, facing = null) {
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) { _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); _n.crossVectors(_a, _b); }
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    let flip = false;
    if (facing && _n.x * facing[0] + _n.y * facing[1] + _n.z * facing[2] < 0) { flip = true; _n.negate(); }
    const col = typeof color === 'string' ? lin(color) : color;
    const cell = CELL[cellName], g = ground ? GROUND_ROW : 0;
    const i0 = this._v(a[0], a[1], a[2], _n.x, _n.y, _n.z, col, uv[0][0], uv[0][1], g, cell);
    this._v(b[0], b[1], b[2], _n.x, _n.y, _n.z, col, uv[1][0], uv[1][1], g, cell);
    this._v(c[0], c[1], c[2], _n.x, _n.y, _n.z, col, uv[2][0], uv[2][1], g, cell);
    this._v(d[0], d[1], d[2], _n.x, _n.y, _n.z, col, uv[3][0], uv[3][1], g, cell);
    if (flip) this.I.push(i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2);
    else this.I.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }

  tri(a, b, c, color, cellName, uv, facing = null) {
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    let flip = false;
    if (facing && _n.x * facing[0] + _n.y * facing[1] + _n.z * facing[2] < 0) { flip = true; _n.negate(); }
    const col = typeof color === 'string' ? lin(color) : color;
    const cell = CELL[cellName];
    const i0 = this._v(a[0], a[1], a[2], _n.x, _n.y, _n.z, col, uv[0][0], uv[0][1], 0, cell);
    this._v(b[0], b[1], b[2], _n.x, _n.y, _n.z, col, uv[1][0], uv[1][1], 0, cell);
    this._v(c[0], c[1], c[2], _n.x, _n.y, _n.z, col, uv[2][0], uv[2][1], 0, cell);
    if (flip) this.I.push(i0, i0 + 2, i0 + 1); else this.I.push(i0, i0 + 1, i0 + 2);
  }

  // Horizontal polygon at height y (ring of [x, z]); faces up (or down). World-planar tile uv.
  flat(ring, y, color, cellName, down = false, yOf = null) {
    if (ring.length < 3) return;
    const pts = ring.map(([x, z]) => new THREE.Vector2(x, z));
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(pts, []); } catch { return; }
    const [tw, th] = TILE[cellName] || [1, 1];
    const col = typeof color === 'string' ? lin(color) : color;
    const cell = CELL[cellName];
    const ny = down ? -1 : 1;
    const base = this.n;
    for (const [x, z] of ring) this._v(x, yOf ? yOf(x, z) : y, z, 0, ny, 0, col, x / tw, z / th, 0, cell);
    for (const [i, j, k] of tris) {
      const a = ring[i], b = ring[j], c = ring[k];
      const ny3 = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      if ((ny3 > 0) !== down) this.I.push(base + i, base + j, base + k);
      else this.I.push(base + i, base + k, base + j);
    }
  }

  // Any BufferGeometry, transformed by matrix. Solid colour unless uvScale is given ([su, sv]
  // multiplies the geometry's own uv, in tiles) together with a cell.
  geo(geometry, matrix, color, cellName = 'white', uvScale = null) {
    const g = geometry;
    const pos = g.attributes.position, nrm = g.attributes.normal, uva = g.attributes.uv;
    if (!nrm) g.computeVertexNormals();
    const nr = g.attributes.normal;
    _m3.getNormalMatrix(matrix);
    const col = typeof color === 'string' ? lin(color) : color;
    const cell = CELL[cellName];
    const base = this.n;
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      nv.fromBufferAttribute(nr, i).applyMatrix3(_m3).normalize();
      const u = uvScale && uva ? uva.getX(i) * uvScale[0] : 0.5;
      const w = uvScale && uva ? uva.getY(i) * uvScale[1] : 0.5;
      this._v(v.x, v.y, v.z, nv.x, nv.y, nv.z, col, u, w, 0, cell);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.I.push(base + g.index.getX(i));
    else for (let i = 0; i < pos.count; i++) this.I.push(base + i);
    g.dispose();
  }

  build(material, { name = '', castShadow = true, receiveShadow = true } = {}) {
    const geo = this.buildGeometry();
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }

  buildGeometry() {
    if (!this.I.length) return null;
    const n = this.n;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.P), 3));
    const nrm = new Int8Array(n * 3);
    for (let i = 0; i < n * 3; i++) nrm[i] = Math.round(Math.max(-1, Math.min(1, this.N[i])) * 127);
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true));
    const col = new Uint8Array(n * 3);
    for (let i = 0; i < n * 3; i++) col[i] = Math.round(Math.max(0, Math.min(1, this.C[i])) * 255);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
    geo.setAttribute('fuv', new THREE.BufferAttribute(new Float32Array(this.F), 3));
    const cl = new Uint16Array(n * 4);
    for (let i = 0; i < n * 4; i++) cl[i] = Math.round(this.L[i] * 65535);
    geo.setAttribute('cell', new THREE.BufferAttribute(cl, 4, true));
    geo.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(this.I) : new Uint16Array(this.I), 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    this.P = this.N = this.C = this.F = this.L = this.I = null;
    return geo;
  }
}

// Spatial chunks of CityBuilders so the GPU can skip what is behind the camera.
export class Chunks {
  constructor(size) { this.size = size; this.map = new Map(); }
  at(x, z) {
    const k = `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
    let b = this.map.get(k);
    if (!b) { b = new CityBuilder(); this.map.set(k, b); }
    return b;
  }
  buildInto(group, material, opts = {}) {
    let tris = 0;
    for (const [k, b] of this.map) {
      tris += b.triangles;
      const m = b.build(material, { ...opts, name: `${opts.name || 'city'}:${k}` });
      if (m) group.add(m);
    }
    this.map.clear();
    return tris;
  }
}

// --- 2D ring helpers ([x, z] points) ------------------------------------------------------------
export function signedArea(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return a / 2;
}
// Outward normal of edge i -> i+1 for a ring with the given signed area.
export function edgeNormal(r, i, area) {
  const a = r[i], b = r[(i + 1) % r.length];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  return area > 0 ? [dz / L, -dx / L] : [-dz / L, dx / L];
}
// Offset every vertex along the mitred bisector: d > 0 outward, d < 0 inward.
export function offsetRing(r, d) {
  const area = signedArea(r);
  const n = r.length, out = [];
  for (let i = 0; i < n; i++) {
    const n1 = edgeNormal(r, (i - 1 + n) % n, area), n2 = edgeNormal(r, i, area);
    let bx = n1[0] + n2[0], bz = n1[1] + n2[1];
    const L = Math.hypot(bx, bz);
    if (L < 1e-6) { bx = n2[0]; bz = n2[1]; } else { bx /= L; bz /= L; }
    const cos = Math.max(0.35, bx * n2[0] + bz * n2[1]);
    out.push([r[i][0] + (bx * d) / cos, r[i][1] + (bz * d) / cos]);
  }
  return out;
}
function segsCross(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
export function ringSelfIntersects(r) {
  const n = r.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segsCross(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return true;
    }
  }
  return false;
}
export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// Inset ring for a truncated hip roof, or null when the footprint is too thin or twisted for it.
export function insetRing(r, d) {
  const area = signedArea(r);
  for (const dd of [d, d * 0.6, d * 0.35]) {
    const ins = offsetRing(r, -dd);
    const a2 = signedArea(ins);
    if (Math.sign(a2) !== Math.sign(area) || Math.abs(a2) < Math.abs(area) * 0.06) continue;
    if (ringSelfIntersects(ins)) continue;
    if (!ins.every(([x, z]) => pointInRing(x, z, r))) continue;
    return { ring: ins, d: dd };
  }
  return null;
}
// Removes near-duplicate and collinear vertices.
export function cleanRing(r, eps = 0.15) {
  let out = r.filter((p, i) => {
    const q = r[(i + 1) % r.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > eps;
  });
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (L > 0 && Math.abs(cross) / L < 0.03) { out.splice(i, 1); changed = true; break; }
    }
  }
  return out;
}
