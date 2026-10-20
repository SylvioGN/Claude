// Shared pieces for the east landmarks: builders that work in a local frame, sculpture
// helpers (statues, busts, balustrades, potted citrus) and the cheap animated-animal material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GeoBuilder, canvasTexture, roundRect } from '../../core/util.js';

export const C = {
  wall: '#f6e8cb', trim: '#fffaf0', plinth: '#e2d3b3', niche: '#c4b08a', shade: '#bba684',
  marble: '#f5f2ea', glass: '#3c4552', door: '#5d4330', roof: '#b5532f', ochre: '#e6c48c',
  hedge: '#3f7a35', box: '#356b2f', lawn: '#7db552',
  terracotta: '#c0643a', citrus: '#f29a1d', leaf: '#2f6a2d', stone: '#d8d0bd', water: '#5aa6cf',
  bronze: '#5b4a35', iron: '#2c3d33',
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

// GeoBuilder whose parts are placed in a movable local frame (position + heading).
export class FrameBuilder extends GeoBuilder {
  constructor() { super(); this.frame = new THREE.Matrix4(); }
  setFrame(x, y, z, ry = 0) { this.frame.makeRotationY(ry).setPosition(x, y, z); return this; }
  add(geometry, color, matrix = null) {
    const m = matrix ? this.frame.clone().multiply(matrix) : this.frame.clone();
    return super.add(geometry, color, m);
  }
}

// Spatial cell (square of `size`) holding a world position, for splitting scattered parts.
const cellKey = (x, z, size) => `${Math.floor(x / size)},${Math.floor(z / size)}`;

// FrameBuilder that sorts its parts into square cells by where they land, so a long fence or
// scattered paddocks become several compact meshes that view, fog and shadow culling can drop.
export class CellBuilder extends FrameBuilder {
  constructor(size = 90) { super(); this.size = size; this.cells = new Map(); }
  add(geometry, color, matrix = null) {
    const m = matrix ? this.frame.clone().multiply(matrix) : this.frame.clone();
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    geometry.boundingBox.getCenter(_p).applyMatrix4(m);
    const key = cellKey(_p.x, _p.z, this.size);
    if (!this.cells.has(key)) this.cells.set(key, new GeoBuilder());
    this.cells.get(key).add(geometry, color, m);
    return this;
  }
  // One mesh per cell (named name-0, name-1, ...).
  build(material = undefined, { name = '', ...opts } = {}) {
    return [...this.cells.values()].map((gb, i) => gb.build(material, { ...opts, name: `${name}-${i}` })).filter(Boolean);
  }
}

// Offsets a polygon ring outwards by d (works for convex and reflex corners).
export function offsetRing(ring, d) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  const sgn = area > 0 ? 1 : -1;
  const n = ring.length;
  const normal = (a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    return [(dz / L) * sgn, (-dx / L) * sgn];
  };
  return ring.map((p, i) => {
    const n1 = normal(ring[(i - 1 + n) % n], p), n2 = normal(p, ring[(i + 1) % n]);
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k];
  });
}

// Box spanning two points on the ground plane (a wall, rail or hedge run).
export function run(gb, ax, az, bx, bz, y, h, thick, color) {
  const L = Math.hypot(bx - ax, bz - az);
  if (L < 1e-3) return;
  gb.box(L, h, thick, color, (ax + bx) / 2, y + h / 2, (az + bz) / 2, -Math.atan2(bz - az, bx - ax));
}

// Box from point a to point b ([x, y, z]), any slope: sloped stair rails, tails, poles.
export function beam(gb, a, b, w, h, color) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L = Math.hypot(dx, dy, dz);
  if (L < 1e-3) return;
  gb.box(L, h, w, color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, -Math.atan2(dz, dx), 0, Math.atan2(dy, Math.hypot(dx, dz)));
}

// Tapered cylinder from point a to point b ([x, y, z]); r0 at a, r1 at b.
export function tube(gb, a, b, r0, r1, color, seg = 7) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  if (L < 1e-3) return;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, _s.set(1, 1, 1));
  gb.add(new THREE.CylinderGeometry(r1, r0, L, seg, 1), color, _m.clone());
}

// Marble statue on a small pedestal, about 1.5 * s tall, facing +z rotated by ry.
export function statue(gb, x, y, z, ry, s = 1, color = C.marble, variant = 0) {
  const c = Math.cos(ry), sn = Math.sin(ry);
  const P = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
  gb.box(0.55 * s, 0.32 * s, 0.55 * s, C.trim, x, y + 0.16 * s, z, ry);
  gb.cyl(0.16 * s, 0.27 * s, 0.75 * s, 5, color, x, y + 0.7 * s, z, ry);
  gb.cyl(0.19 * s, 0.15 * s, 0.42 * s, 5, color, x, y + 1.27 * s, z, ry);
  gb.sphere(0.12 * s, 0, color, x, y + 1.6 * s, z);
  const arm = variant % 3;
  const [ax, az] = P(arm === 1 ? -0.2 * s : 0.2 * s, 0.04 * s);
  if (arm === 0) gb.box(0.09 * s, 0.5 * s, 0.09 * s, color, ax, y + 1.55 * s, az, ry, 0, -0.35);
  else if (arm === 1) gb.box(0.09 * s, 0.45 * s, 0.09 * s, color, ax, y + 1.2 * s, az, ry, 0.5, 0.2);
  else gb.box(0.09 * s, 0.42 * s, 0.09 * s, color, ax, y + 1.25 * s, az, ry, -0.6, 0);
}

// Portrait bust on a little bracket.
export function bust(gb, x, y, z, ry, s = 1, color = C.marble) {
  gb.box(0.36 * s, 0.14 * s, 0.26 * s, C.trim, x, y + 0.07 * s, z, ry);
  gb.sphere(0.2 * s, 0, color, x, y + 0.27 * s, z, 1.1, 0.75, 0.75);
  gb.sphere(0.12 * s, 0, color, x, y + 0.5 * s, z);
}

// Balustrade along a line: rails plus balusters every `step`.
export function balustrade(gb, ax, az, bx, bz, y, h = 0.85, step = 0.42, color = C.trim) {
  const L = Math.hypot(bx - ax, bz - az);
  if (L < 0.2) return;
  run(gb, ax, az, bx, bz, y, 0.12, 0.34, color);
  run(gb, ax, az, bx, bz, y + h - 0.12, 0.12, 0.38, color);
  const n = Math.max(1, Math.round(L / step));
  const ry = -Math.atan2(bz - az, bx - ax);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    gb.cyl(0.07, 0.11, h - 0.24, 4, color, ax + (bx - ax) * t, y + h / 2, az + (bz - az) * t, ry + Math.PI / 4);
  }
}

// Lemon/orange tree in a terracotta pot (the Giardini Segreti have rows of them).
export function pottedCitrus(gb, x, y, z, s = 1, rnd = Math.random) {
  gb.cyl(0.38 * s, 0.26 * s, 0.55 * s, 6, C.terracotta, x, y + 0.27 * s, z);
  gb.cyl(0.04 * s, 0.05 * s, 0.6 * s, 4, '#6b4a2e', x, y + 0.8 * s, z);
  gb.sphere(0.5 * s, 0, C.leaf, x, y + 1.3 * s, z, 1, 0.92, 1);
  const lemon = rnd() < 0.35;
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2, e = rnd() * 0.9 - 0.2;
    const r = 0.47 * s;
    gb.place(new THREE.OctahedronGeometry(0.08 * s, 0), lemon ? '#f2d43a' : C.citrus, x + Math.cos(a) * Math.cos(e) * r, y + 1.3 * s + Math.sin(e) * r * 0.92, z + Math.sin(a) * Math.cos(e) * r);
  }
}

// Clipped topiary cone or ball.
export function topiary(gb, x, y, z, kind = 'cone', s = 1) {
  if (kind === 'cone') gb.cone(0.42 * s, 1.3 * s, 7, C.box, x, y + 0.65 * s, z);
  else gb.sphere(0.45 * s, 1, C.box, x, y + 0.45 * s, z);
}

// Hipped roof w (x) by d (z), ridge along x, base at y = 0.
export function hipRoofGeometry(w, d, h) {
  const x = w / 2, z = d / 2, r = Math.max(0, x - z);
  const P = { a: [-x, 0, -z], b: [x, 0, -z], c: [x, 0, z], d: [-x, 0, z], e: [-r, h, 0], f: [r, h, 0] };
  const tris = [['d', 'c', 'f'], ['d', 'f', 'e'], ['b', 'a', 'e'], ['b', 'e', 'f'], ['c', 'b', 'f'], ['a', 'd', 'e']];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat().flatMap((k) => P[k]), 3));
  g.computeVertexNormals();
  return g;
}

// Upper half-disc in the local XY plane facing +z (arch heads, lunettes).
export function halfDisc(r, depth, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, depth, seg, 1, false, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  return g;
}

// Builder for textured meshes (position, normal, uv), e.g. railings and wire cages.
export class UVBuilder {
  constructor() { this.parts = []; }
  add(geometry, matrix = null) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    this.parts.push(g);
    return this;
  }
  // Vertical quad strip along a polyline of {x, z, y0, y1, u}; v runs 0 (bottom) to 1 (top).
  strip(points, matrix = null) {
    const pos = [], nor = [], uv = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const nx = dz / L, nz = -dx / L;
      const quad = [[a, 0], [b, 0], [b, 1], [a, 0], [b, 1], [a, 1]];
      for (const [p, top] of quad) {
        pos.push(p.x, top ? p.y1 : p.y0, p.z); nor.push(nx, 0, nz); uv.push(p.u, top);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (matrix) g.applyMatrix4(matrix);
    this.parts.push(g);
    return this;
  }
  build(material, { castShadow = false, receiveShadow = true, name = '' } = {}) {
    if (!this.parts.length) return null;
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    Object.assign(mesh, { castShadow, receiveShadow, name, matrixAutoUpdate: false });
    mesh.updateMatrix();
    return mesh;
  }
}

// Iron railing texture: dark green bars with spear tips, transparent between them.
// v 0.06 = bottom rail, 0.86 = top rail, above that the spear points.
let _rail = null;
export function railingMaterial() {
  if (_rail) return _rail;
  const tex = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#26352c';
    const bars = 8, bw = 8;
    for (let i = 0; i < bars; i++) {
      const x = (i + 0.5) * (w / bars);
      g.fillRect(x - bw / 2, 10, bw, h - 18);
      g.beginPath(); g.moveTo(x - 6, 12); g.lineTo(x, 0); g.lineTo(x + 6, 12); g.fill();
    }
    g.fillRect(0, 16, w, 6);
    g.fillRect(0, h - 14, w, 8);
    g.fillStyle = '#3a4c40';
    g.fillRect(0, 17, w, 2);
  }, { anisotropy: 4 });
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _rail = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide });
  return _rail;
}

// Falling-water streaks for jets and overflow streams (scrolled in update()).
export function waterMaterial() {
  const tex = canvasTexture(32, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = (i * 37) % w, y = (i * 53) % h, L = 18 + ((i * 29) % 40);
      g.fillStyle = i % 3 ? 'rgba(255,255,255,0.95)' : 'rgba(200,230,255,0.9)';
      g.fillRect(x, y, 3, L); g.fillRect(x, y - h, 3, L);
    }
  });
  return new THREE.MeshLambertMaterial({
    map: tex, color: '#e8f6ff', emissive: '#6f9fb8', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------------------------
// Animated animals: one merged mesh, each vertex rotates about its own pivot/axis in the vertex
// shader: angle = amp * sin(time * speed + phase) + react * uReact.

export const ATLAS = { W: 512, H: 256 };
const rect = (x, y, w, h, pad = 3) => ({ u: (x + pad) / ATLAS.W, v: 1 - (y + h - pad) / ATLAS.H, w: (w - 2 * pad) / ATLAS.W, h: (h - 2 * pad) / ATLAS.H });
export const UV = {
  white: rect(0, 0, 64, 64, 16),
  giraffe: rect(64, 0, 192, 160),
  zebraV: rect(256, 0, 128, 128),
  zebraH: rect(384, 0, 128, 128),
  sign: rect(0, 176, 512, 80, 2),
  deer: rect(64, 160, 192, 16, 1),
};

export function animalAtlas(rng) {
  return canvasTexture(ATLAS.W, ATLAS.H, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 176);
    // giraffe patches
    g.fillStyle = '#f4e3bd'; g.fillRect(64, 0, 192, 176);
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 9; i++) {
        const cx = 64 + (i + (j % 2) * 0.5) * 23 + rng() * 6, cy = j * 25 + 8 + rng() * 6;
        g.fillStyle = rng() < 0.5 ? '#a8622c' : '#b8702f';
        g.beginPath();
        const n = 6, r = 9 + rng() * 2;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + rng() * 0.4, rr = r * (0.75 + rng() * 0.3);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.9;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
      }
    }
    // zebra stripes: vertical (body) and horizontal (legs, neck, head)
    g.fillStyle = '#f7f5ef'; g.fillRect(256, 0, 256, 128);
    g.fillStyle = '#1d1c1f';
    for (let i = 0; i < 14; i++) {
      const x = 256 + i * 9.2;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= 128; y += 16) g.lineTo(x + Math.sin(y * 0.06 + i) * 2.5 + (y > 64 ? 1 : 0), y);
      g.lineTo(x + 4.5, 128);
      for (let y = 128; y >= 0; y -= 16) g.lineTo(x + 4.5 + Math.sin(y * 0.06 + i) * 2.5, y);
      g.fill();
    }
    for (let i = 0; i < 12; i++) g.fillRect(384, i * 10.7 + 2, 128, 5);
    // fallow deer: brown back, white spots
    g.fillStyle = '#a7703f'; g.fillRect(64, 160, 192, 16);
    g.fillStyle = '#f3e7d2';
    for (let i = 0; i < 26; i++) g.fillRect(66 + i * 7.3, 165 + (i % 2) * 4, 3, 3);
    // the Bioparco sign
    g.fillStyle = '#2f4a37'; roundRect(g, 2, 178, 508, 76, 18); g.fill();
    g.strokeStyle = '#d9b45a'; g.lineWidth = 5; roundRect(g, 9, 185, 494, 62, 14); g.stroke();
    g.fillStyle = '#f5e7c0'; g.font = '700 50px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('B I O P A R C O', 256, 218);
  }, { wrap: false });
}

// Merges animal parts in world space with per-vertex animation attributes, one mesh per square
// cell of `size` (by where each animal's frame stands) so far-off herds can be culled.
export class AnimBuilder {
  constructor(size = 90) {
    this.cells = new Map();
    this.size = size;
    this.frame = new THREE.Matrix4();
    this.anim = null;      // {pivot:[x,y,z], axis:[x,y,z], amp, phase, speed, react} in the current frame
    this.uv = UV.white;
  }
  setFrame(x, y, z, ry = 0, s = 1) {
    this.frame.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(s, s, s));
    return this;
  }
  // Parts added until the next setAnim(null) rotate together about pivot/axis (frame-local).
  setAnim(a) { this.anim = a; return this; }
  skin(uvRect) { this.uv = uvRect || UV.white; return this; }

  place(geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.add(geometry, color, _m);
  }
  box(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) { return this.place(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz); }
  ball(r, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, detail = 1) {
    return this.place(new THREE.SphereGeometry(r, detail ? 8 : 6, detail ? 5 : 4), color, x, y, z, rx, 0, 0, sx, sy, sz);
  }
  // Tapered cylinder between two frame-local points.
  limb(a, b, r0, r1, color, seg = 6) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const L = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, _s.set(1, 1, 1));
    return this.add(g, color, _m);
  }

  add(geometry, color, matrix = null) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    const m = matrix ? this.frame.clone().multiply(matrix) : this.frame.clone();
    g.applyMatrix4(m);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count;
    const uv = g.attributes.uv ? g.attributes.uv.array : new Float32Array(n * 2);
    const R = this.uv;
    const uvOut = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      uvOut[i * 2] = R.u + Math.min(1, Math.max(0, uv[i * 2])) * R.w;
      uvOut[i * 2 + 1] = R.v + Math.min(1, Math.max(0, uv[i * 2 + 1])) * R.h;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
    const col = new THREE.Color(color);
    const cArr = new Float32Array(n * 3), pArr = new Float32Array(n * 3), xArr = new Float32Array(n * 3), aArr = new Float32Array(n * 4);
    let piv = [0, 0, 0], ax = [1, 0, 0], an = [0, 0, 0, 0];
    if (this.anim) {
      const a = this.anim;
      const pv = new THREE.Vector3(...a.pivot).applyMatrix4(this.frame);
      const av = new THREE.Vector3(...a.axis).transformDirection(this.frame);
      piv = [pv.x, pv.y, pv.z]; ax = [av.x, av.y, av.z];
      an = [a.amp || 0, a.phase || 0, a.speed || 1, a.react || 0];
    }
    for (let i = 0; i < n; i++) {
      cArr.set([col.r, col.g, col.b], i * 3);
      pArr.set(piv, i * 3); xArr.set(ax, i * 3); aArr.set(an, i * 4);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cArr, 3));
    g.setAttribute('aPivot', new THREE.BufferAttribute(pArr, 3));
    g.setAttribute('aAxis', new THREE.BufferAttribute(xArr, 3));
    g.setAttribute('aAnim', new THREE.BufferAttribute(aArr, 4));
    const key = cellKey(this.frame.elements[12], this.frame.elements[14], this.size);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(g);
    return this;
  }

  // One mesh per cell (named name-0, name-1, ...).
  build(material, depthMaterial, name = '') {
    const meshes = [...this.cells.values()].map((parts, i) => {
      const geo = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material);
      mesh.customDepthMaterial = depthMaterial;
      Object.assign(mesh, { castShadow: true, receiveShadow: true, name: `${name}-${i}`, matrixAutoUpdate: false });
      mesh.updateMatrix();
      return mesh;
    });
    this.cells.clear();
    return meshes;
  }
}

const ANIM_PARS = /* glsl */`
attribute vec3 aPivot;
attribute vec3 aAxis;
attribute vec4 aAnim;
uniform float uTime;
uniform float uReact;
vec3 animRotate(vec3 v, vec3 k, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
`;
const ANIM_BEGIN = /* glsl */`
vec3 transformed = vec3(position);
if (aAnim.x != 0.0 || aAnim.w != 0.0) {
  float animAngle = aAnim.x * sin(uTime * aAnim.z + aAnim.y) + aAnim.w * uReact;
  transformed = aPivot + animRotate(position - aPivot, aAxis, animAngle);
}
`;

// Returns {material, depthMaterial, uniforms} sharing uTime / uReact.
export function animalMaterials(map) {
  const uniforms = { uTime: { value: 0 }, uReact: { value: 0 } };
  const patch = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uReact = uniforms.uReact;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${ANIM_PARS}`)
      .replace('#include <begin_vertex>', ANIM_BEGIN);
  };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, map, flatShading: true });
  material.onBeforeCompile = patch;
  material.customProgramCacheKey = () => 'east-animals';
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMaterial.onBeforeCompile = patch;
  depthMaterial.customProgramCacheKey = () => 'east-animals-depth';
  return { material, depthMaterial, uniforms };
}

// Spray droplets for fountains: GPU-animated points (no per-frame CPU work).
// Each droplet: origin (position), velocity (aVel), phase (aPhase), lifetime (aLife).
export function sprayMaterial(color = '#ffffff') {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uBoost: { value: 0 }, uScale: { value: 400 }, uSize: { value: 0.16 }, uColor: { value: new THREE.Color(color) },
  }]);
  return new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`
      attribute vec3 aVel;
      attribute float aPhase;
      attribute float aLife;
      uniform float uTime, uBoost, uScale, uSize;
      varying float vAlpha;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        float t = mod(uTime + aPhase * aLife, aLife);
        vec3 v = aVel * vec3(1.0, 1.0 + uBoost * 0.45, 1.0);
        vec3 p = position + v * t + vec3(0.0, -4.9 * t * t, 0.0);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uSize * uScale / max(0.5, -mvPosition.z);
        vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - t / aLife);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vAlpha;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        gl_FragColor = vec4(uColor, vAlpha * (1.0 - d * 3.2) * 0.85);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// Authored postcard view for a tour stop: core/game.js parks the cart on `spot` ([x, z]) facing the
// world direction `face` ([dx, dz]) and core/camera.js frames the photo from `cam` ([x, z, height])
// towards `look` ([x, z, height]); heights are above the ground at the spot. The corridor from just
// behind the camera, around the cart, to `far` (default: look) is reserved so the trees and props
// placed later keep the photo clear; `wide` is its half-width at the far end.
export function photoView(ctx, id, { spot, face, cam, look, fov, far = look, wide = 5 }) {
  const stop = ctx.game?.stops?.find((s) => s.id === id);
  if (!stop) return null;
  const H = ctx.terrain.heightAt, y = H(spot[0], spot[1]);
  stop.spotX = spot[0]; stop.spotZ = spot[1];
  stop.view = {
    heading: Math.atan2(face[0], face[1]),
    cam: [cam[0], Math.max(y + cam[2], H(cam[0], cam[1]) + 1.2), cam[1]],
    look: [look[0], y + look[2], look[1]],
    ...(fov ? { fov } : {}),
  };
  let dx = far[0] - cam[0], dz = far[1] - cam[1];
  const L = Math.hypot(dx, dz) || 1;
  dx /= L; dz /= L;
  const a = (spot[0] - cam[0]) * dx + (spot[1] - cam[1]) * dz, o = -(spot[0] - cam[0]) * dz + (spot[1] - cam[1]) * dx;
  const w = (a / L) * wide;
  const P = (s, t) => [cam[0] + dx * s - dz * t, cam[1] + dz * s + dx * t];
  ctx.reserve({ ring: [P(-2, -4), P(a, Math.min(o - 3.5, -w)), P(L, -wide), P(L, wide), P(a, Math.max(o + 3.5, w)), P(-2, 4)] });
  return stop.view;
}
