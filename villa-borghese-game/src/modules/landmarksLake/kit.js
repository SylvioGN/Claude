// Shared helpers for the lake-garden landmarks: local frames, multi-colour templates stamped
// into GeoBuilders, a UV-keeping builder for textured decals and water, and small sculpture kits.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GeoBuilder, buildGeometry, PALETTE } from '../../core/util.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

// Matrix from position, yaw (and optional pitch / roll / uniform or xyz scale).
export function mat(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) {
  const sx = Array.isArray(s) ? s[0] : s, sy = Array.isArray(s) ? s[1] : s, sz = Array.isArray(s) ? s[2] : s;
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

// A landmark's local frame: built facing +z around (x, y, z), turned by heading h.
export function frame(x, y, z, h) {
  const c = Math.cos(h), s = Math.sin(h);
  return {
    x, y, z, h, m: mat(x, y, z, h),
    // local (lx, lz) -> world [x, z]
    w(lx, lz) { return [x + lx * c + lz * s, z - lx * s + lz * c]; },
    // world (wx, wz) -> local [x, z]
    l(wx, wz) { const dx = wx - x, dz = wz - z; return [dx * c - dz * s, dx * s + dz * c]; },
    place(mesh) { mesh.position.set(x, y, z); mesh.rotation.y = h; mesh.updateMatrix(); return mesh; },
  };
}

// Heading that turns a model built facing +z towards direction (dx, dz).
export const headingOf = (dx, dz) => Math.atan2(dx, dz);

// Multi-colour template: run build(gb) once, then stamp copies into other GeoBuilders.
export function template(build) {
  const gb = new GeoBuilder();
  build(gb);
  return buildGeometry(gb);
}
export function stamp(gb, geo, matrix) {
  const g = geo.clone();
  g.applyMatrix4(matrix);
  gb.parts.push(g);
  return gb;
}

// Like GeoBuilder but keeps uv coordinates (for the decal atlas and flowing water).
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
  // Quad of size w x h facing +z, showing atlas rect r = [u0, v0, u1, v1] (v up).
  quad(w, h, r, matrix) {
    const g = new THREE.PlaneGeometry(w, h);
    setUV(g, r);
    return this.add(g, matrix);
  }
  // Triangle (pediment) of base w and height h facing +z, base on y = 0.
  tri(w, h, r, matrix) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([r[0], r[1], r[2], r[1], (r[0] + r[2]) / 2, r[3]], 2));
    return this.add(g, matrix);
  }
  build(material, { name = '', castShadow = false, receiveShadow = false } = {}) {
    if (!this.parts.length) return null;
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }
}

// Remap a geometry's uvs (0..1) into atlas rect r = [u0, v0, u1, v1].
export function setUV(g, r) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  return g;
}

// Closed Catmull-Rom loop through [x, z] points, sampled by arc length.
export function loopPath(pts, samples = 240) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const length = curve.getLength();
  const P = new Float32Array(samples * 2), D = new Float32Array(samples * 2);
  const v = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < samples; i++) {
    curve.getPointAt(i / samples, v);
    curve.getTangentAt(i / samples, t);
    P[i * 2] = v.x; P[i * 2 + 1] = v.z;
    const L = Math.hypot(t.x, t.z) || 1;
    D[i * 2] = t.x / L; D[i * 2 + 1] = t.z / L;
  }
  // position + heading at arc length s (wraps)
  return {
    length,
    at(s, out = { x: 0, z: 0, h: 0 }) {
      let f = ((s / length) % 1 + 1) % 1 * samples;
      const i = Math.floor(f), j = (i + 1) % samples;
      f -= i;
      out.x = P[i * 2] + (P[j * 2] - P[i * 2]) * f;
      out.z = P[i * 2 + 1] + (P[j * 2 + 1] - P[i * 2 + 1]) * f;
      const dx = D[i * 2] + (D[j * 2] - D[i * 2]) * f, dz = D[i * 2 + 1] + (D[j * 2 + 1] - D[i * 2 + 1]) * f;
      out.h = Math.atan2(dx, dz);
      return out;
    },
  };
}

// ---------------------------------------------------------------- sculpture & architecture kits

// Classical marble figure standing on its own base at y = 0, facing +z, about 2 units tall.
// pose: 'robed' (staff in right hand), 'god' (Aesculapius: staff with serpent, beard),
// 'emperor' (cuirass, raised right arm, spear), 'lady' (draped, veil, arm across).
export function figureTemplate(pose = 'robed', color = PALETTE.marble, accent = null) {
  const sh = color;
  const dark = accent || '#d8d1c2';
  return template((gb) => {
    const robed = pose !== 'emperor';
    if (robed) {
      gb.cyl(0.24, 0.36, 1.05, 8, sh, 0, 0.53, 0);             // long robe
      gb.cyl(0.25, 0.27, 0.45, 8, sh, 0, 1.25, 0);             // chest
      gb.box(0.62, 0.42, 0.1, dark, 0.04, 0.95, 0.24, 0, 0, -0.5); // drapery fold
    } else {
      gb.cyl(0.11, 0.12, 0.85, 6, sh, -0.13, 0.43, 0);          // legs
      gb.cyl(0.11, 0.12, 0.85, 6, sh, 0.13, 0.43, 0.04);
      gb.cyl(0.33, 0.27, 0.32, 8, dark, 0, 0.98, 0);           // skirt of the cuirass
      gb.cyl(0.27, 0.24, 0.5, 8, sh, 0, 1.36, 0);              // cuirass
      gb.box(0.7, 0.5, 0.14, dark, 0.1, 1.2, -0.2, 0, 0.2, 0);    // cloak
    }
    gb.sphere(0.19, 0, sh, -0.27, 1.5, 0, 1, 0.8, 1);             // shoulders
    gb.sphere(0.19, 0, sh, 0.27, 1.5, 0, 1, 0.8, 1);
    gb.cyl(0.07, 0.08, 0.12, 6, sh, 0, 1.63, 0);                 // neck
    gb.sphere(0.15, 1, sh, 0, 1.8, 0.01);                         // head
    if (pose === 'god') {
      gb.sphere(0.12, 0, sh, 0, 1.69, 0.07, 1, 1.1, 0.8);         // beard
      gb.cyl(0.03, 0.035, 1.75, 5, '#cfc7b6', 0.48, 0.88, 0.12);   // staff
      gb.cyl(0.05, 0.06, 0.5, 6, sh, 0.38, 1.15, 0.1, 0, 0, 0.5);  // right forearm on the staff
      gb.cyl(0.06, 0.07, 0.62, 6, sh, -0.33, 1.2, 0.05, 0, 0, -0.12); // left arm hanging
      const snake = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
        Array.from({ length: 9 }, (_, i) => new THREE.Vector3(0.48 + Math.cos(i * 1.7) * 0.08, 0.2 + i * 0.16, 0.12 + Math.sin(i * 1.7) * 0.08))), 24, 0.03, 4);
      gb.add(snake, '#cfc7b6');
      gb.sphere(0.045, 0, '#cfc7b6', 0.52, 1.66, 0.18);
    } else if (pose === 'emperor') {
      gb.cyl(0.05, 0.06, 0.62, 6, sh, 0.38, 1.78, 0.05, 0, 0, -0.35); // raised right arm
      gb.cyl(0.025, 0.025, 2.3, 5, '#bfb6a3', -0.42, 1.25, 0.1);       // spear
      gb.cone(0.06, 0.2, 4, '#bfb6a3', -0.42, 2.48, 0.1);
      gb.cyl(0.06, 0.07, 0.6, 6, sh, -0.36, 1.25, 0.05, 0, 0, 0.12);
      gb.sphere(0.155, 0, dark, 0, 1.86, -0.02, 1, 0.7, 1);         // laurel hair
    } else if (pose === 'lady') {
      gb.sphere(0.17, 0, dark, 0, 1.84, -0.03, 1.05, 0.9, 1.05);    // veil
      gb.box(0.12, 0.62, 0.12, sh, 0.05, 1.3, 0.2, 0, 0.5, 1.2);   // arm across the chest
      gb.cyl(0.06, 0.07, 0.62, 6, sh, -0.33, 1.2, 0.05, 0, 0, -0.12);
    } else {
      gb.cyl(0.03, 0.035, 1.75, 5, '#cfc7b6', 0.46, 0.88, 0.08);
      gb.cyl(0.05, 0.06, 0.5, 6, sh, 0.38, 1.2, 0.08, 0, 0, 0.5);
      gb.cyl(0.06, 0.07, 0.62, 6, sh, -0.33, 1.2, 0.05, 0, 0, -0.12);
    }
  });
}

// Ionic column, base at y = 0. h = total height, r = shaft radius at the foot.
export function ionicColumn(gb, x, y, z, h, r, col = PALETTE.marble, shade = PALETTE.travertineShade, seg = 12) {
  const shaftH = h - 0.32 * r * 3;
  gb.box(r * 2.7, r * 0.5, r * 2.7, shade, x, y + r * 0.25, z);                       // plinth
  gb.cyl(r * 1.22, r * 1.3, r * 0.45, seg, col, x, y + r * 0.72, z);                   // torus base
  gb.cyl(r * 0.84, r, shaftH, seg, col, x, y + r * 0.95 + shaftH / 2, z);             // shaft
  const ty = y + r * 0.95 + shaftH;
  gb.cyl(r * 1.15, r * 0.9, r * 0.35, seg, col, x, ty + r * 0.17, z);                 // echinus
  gb.box(r * 2.9, r * 0.42, r * 1.5, col, x, ty + r * 0.52, z);                        // volute bolster
  gb.cyl(r * 0.42, r * 0.42, r * 1.6, 8, shade, x - r * 1.32, ty + r * 0.42, z, 0, Math.PI / 2); // volutes
  gb.cyl(r * 0.42, r * 0.42, r * 1.6, 8, shade, x + r * 1.32, ty + r * 0.42, z, 0, Math.PI / 2);
  gb.box(r * 2.5, r * 0.25, r * 2.5, col, x, ty + r * 0.85, z);                        // abacus
}

// Corinthian-ish giant column: base at y = 0, flared leafy capital.
export function corinthianColumn(gb, x, y, z, h, r, col = PALETTE.marble, shade = PALETTE.travertineShade, seg = 10) {
  const capH = r * 2.4;
  const shaftH = h - capH - r * 0.9;
  gb.box(r * 2.6, r * 0.5, r * 2.6, shade, x, y + r * 0.25, z);
  gb.cyl(r * 1.2, r * 1.28, r * 0.4, seg, col, x, y + r * 0.7, z);
  gb.cyl(r * 0.86, r, shaftH, seg, col, x, y + r * 0.9 + shaftH / 2, z);
  const ty = y + r * 0.9 + shaftH;
  gb.cyl(r * 1.25, r * 0.9, capH * 0.8, seg, shade, x, ty + capH * 0.4, z);          // bell of leaves
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    gb.sphere(r * 0.35, 0, col, x + Math.cos(a) * r * 1.1, ty + capH * 0.75, z + Math.sin(a) * r * 1.1);
  }
  gb.box(r * 2.7, r * 0.35, r * 2.7, col, x, ty + capH * 0.88, z);                    // abacus
}

// Straight flight of steps climbing towards -z: front edge at z0, n steps of rise x run, width w.
export function steps(gb, x, y0, z0, w, n, rise, run, color, shade = null) {
  for (let i = 0; i < n; i++) {
    const top = y0 + rise * (i + 1);
    const depth = run * (n - i);
    gb.box(w, rise, depth, i % 2 && shade ? shade : color, x, top - rise / 2, z0 - run * i - depth / 2);
  }
}

// Balustrade along a local line (x0, z0) -> (x1, z1): base rail, balusters, top rail.
export function balustrade(gb, x0, z0, x1, z1, y, h = 0.9, color = PALETTE.travertine, spacing = 0.32) {
  const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  gb.box(L, 0.14, 0.32, color, mx, y + 0.07, mz, ry);
  gb.box(L + 0.1, 0.14, 0.36, color, mx, y + h - 0.07, mz, ry);
  const n = Math.max(1, Math.floor(L / spacing));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    gb.cyl(0.07, 0.09, h - 0.28, 5, color, x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t);
  }
}

// Lumpy rock: flattened, jittered icosahedron (deterministic with rnd).
export function rockGeometry(rnd, r = 1, detail = 0) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.78 + rnd() * 0.4);
    const f = seen.get(key);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}

// Cylinder from point a to point b ([x, y, z]), e.g. arms and legs of little figures.
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
export function limb(gb, a, b, r, color, seg = 5) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = _d.length();
  _q.setFromUnitVectors(_up, _d.divideScalar(L || 1));
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(1, 1, 1));
  return gb.add(new THREE.CylinderGeometry(r, r, L, seg), color, _m);
}

// Rectangular frustum (battered pylon, obelisk shaft): bottom w0 x d0, top w1 x d1, base at y.
export function frustum(gb, w0, d0, w1, d1, h, color, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w0, h, d0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * (w1 / w0), p.getY(i), p.getZ(i) * (d1 / d0));
  }
  g.computeVertexNormals();
  return gb.place(g, color, x, y + h / 2, z, 0, ry, 0);
}

// Hip roof over a w x d rectangle centred at (x, y, z), rising h; ridge along x when w > d.
export function hipRoof(gb, w, d, h, color, x, y, z, ry = 0) {
  const r = Math.max(0, (w - d) / 2), hw = w / 2, hd = d / 2;
  const E = [[-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd]];
  const R0 = [-r, h, 0], R1 = [r, h, 0];
  const tris = [
    E[0], E[1], R1, E[0], R1, R0,       // front
    E[2], E[3], R0, E[2], R0, R1,       // back
    E[1], E[2], R1,                     // right
    E[3], E[0], R0,                     // left
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return gb.place(g, color, x, y, z, 0, ry, 0);
}

// Arch-topped panel (window, niche, door) of width w and total height h, facing +z, depth d.
export function archPanel(gb, w, h, d, color, x, y, z, seg = 6) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: seg });
  return gb.place(g, color, x, y, z - d / 2);
}

// Move every part of GeoBuilder `from` into `into`, transformed by matrix.
export function absorb(into, from, matrix) {
  for (const g of from.parts) { g.applyMatrix4(matrix); into.parts.push(g); }
  from.parts = [];
  return into;
}
