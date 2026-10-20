// Small toolkit for the central landmarks: a local building frame on top of GeoBuilder, roofs,
// columns, crenellations, drawn arches and simple statues.
import * as THREE from 'three';
import { canvasTexture } from '../../core/util.js';
import { fbm2, noise2 } from '../../core/rng.js';

const _m = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export const C = {
  travertine: '#e9e1cf', travertineShade: '#cfc3a8', marble: '#f2efe8', marbleGrey: '#a9aca8', cipollino: '#a8b09f',
  rose: '#d99a7e', roseShade: '#c4826a', brick: '#a5553a', brickDark: '#8b4430', roofTile: '#b5532f',
  oak: '#5b3d27', oakLight: '#8a6240', plaster: '#f1e8d4', thatch: '#b89a63',
  window: '#33302f', glass: '#4d5f6c', door: '#5a3a26', shutter: '#4f7a4a', iron: '#2b2b2e', bronze: '#6f5a3a',
  grass: '#7fae4f', grassLight: '#93c25a', grassDark: '#5f8f3c', hedge: '#3f7a35',
  ivy: '#3d6b2f', sand: '#e2c98f', gravel: '#d8c8a2', water: '#4a90b8', white: '#ffffff',
  red: '#d8342c', blue: '#2f6fd0', yellow: '#f2c230', green: '#3aa04a', orange: '#f08a24', purple: '#8e5bc8',
  rubber: '#c0604a', rubberGreen: '#5f9a4a',
};

// Places parts in a landmark's local frame: u along `angle` (radians from +x towards +z), v across,
// y up from `y0`. Local yaw `ry` follows three.js (positive turns +u towards -v).
export class Frame {
  constructor(gb, x, z, angle = 0, y0 = 0) {
    this.gb = gb; this.x = x; this.z = z; this.a = angle; this.y0 = y0;
    this.c = Math.cos(angle); this.s = Math.sin(angle);
  }
  w(u, v) { return [this.x + u * this.c - v * this.s, this.z + u * this.s + v * this.c]; }
  // World direction of the local direction (du, dv).
  dir(du, dv) { return [du * this.c - dv * this.s, du * this.s + dv * this.c]; }
  local(x, z) {
    const dx = x - this.x, dz = z - this.z;
    return [dx * this.c + dz * this.s, -dx * this.s + dz * this.c];
  }
  matrix(u, y, v, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const [x, z] = this.w(u, v);
    _m.makeTranslation(x, this.y0 + y, z);
    _m.multiply(_r.makeRotationY(-this.a));
    _r.compose(_p.set(0, 0, 0), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return _m.multiply(_r);
  }
  put(geometry, color, u, y, v, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    this.gb.add(geometry, color, this.matrix(u, y, v, rx, ry, rz, sx, sy, sz));
    return this;
  }
  // Box with its BOTTOM at y (w along u, d along v).
  box(w, h, d, color, u, y, v, ry = 0) { return this.put(new THREE.BoxGeometry(w, h, d), color, u, y + h / 2, v, 0, ry); }
  cyl(rTop, rBot, h, seg, color, u, y, v, open = false) {
    return this.put(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), color, u, y + h / 2, v);
  }
  sphere(r, color, u, y, v, sx = 1, sy = 1, sz = 1, detail = 0) {
    return this.put(new THREE.IcosahedronGeometry(r, detail), color, u, y, v, 0, 0, 0, sx, sy, sz);
  }
  // A beam between two local points (u, y, v), square section t.
  beam(a, b, t, color) {
    const du = b[0] - a[0], dy = b[1] - a[1], dv = b[2] - a[2];
    const L = Math.hypot(du, dy, dv);
    const g = new THREE.BoxGeometry(t, L, t);
    const dir = new THREE.Vector3(du, dy, dv).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const [x, z] = this.w((a[0] + b[0]) / 2, (a[2] + b[2]) / 2);
    // local -> world: rotate the local direction by the frame yaw
    const m = new THREE.Matrix4().makeTranslation(x, this.y0 + (a[1] + b[1]) / 2, z)
      .multiply(new THREE.Matrix4().makeRotationY(-this.a))
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
    this.gb.add(g, color, m);
    return this;
  }
  // A flat shape (THREE.Shape in the u/y plane) extruded `depth` along v, centred on v.
  // Use it for wall reliefs: arches, pediments, panels. ry turns it to face another side.
  relief(shape, depth, color, u, y, v, ry = 0, curveSegments = 6) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
    g.translate(0, 0, -depth / 2);
    return this.put(g, color, u, y, v, 0, ry);
  }
}

// Rectangle with a round top (door / arched window), bottom-centre at (0, 0).
export function archShape(w, h) {
  const r = w / 2, s = new THREE.Shape();
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

// Arch-shaped frame of thickness t around a w x h opening (bottom-centre at (0, 0)).
export function archRing(w, h, t) {
  const outer = archShape(w + t * 2, h + t);
  const inner = archShape(w, h);
  outer.holes.push(new THREE.Path(inner.getPoints(6).reverse()));
  return outer;
}

export function polyShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return s;
}

// Hip roof over a w (u) x d (v) rectangle, eaves at y = 0, ridge height h. Returns geometry.
export function hipRoofGeometry(w, d, h) {
  if (d > w) return hipRoofGeometry(d, w, h).rotateY(Math.PI / 2);
  const hw = w / 2, hd = d / 2, ridge = hw - hd;
  const P = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [-ridge, h, 0], [ridge, h, 0]];
  const t = new Tris();
  for (const [a, b, c] of [[0, 4, 5], [0, 5, 1], [1, 5, 2], [2, 5, 4], [2, 4, 3], [3, 4, 0]]) t.tri(P[a], P[b], P[c]);
  return t.geometry();
}

// Square pyramid (w x d base at y = 0, apex at h).
export function pyramidGeometry(w, d, h) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}

// Classical column with base and capital; (u, v) centre, standing on y. Returns the top y.
export function column(f, u, y, v, h, r, shaft, cap, { seg = 8, ionic = false, broken = 0 } = {}) {
  f.box(r * 2.5, r * 0.35, r * 2.5, cap, u, y, v);                          // plinth
  f.cyl(r * 1.05, r * 1.2, r * 0.4, seg, cap, u, y + r * 0.35, v);          // torus-ish base
  const y1 = y + r * 0.75, hs = h - r * 0.75 - (broken ? 0 : r * 1.25);
  if (broken) {
    f.cyl(r * 0.9, r, broken, seg, shaft, u, y1, v);
    f.put(new THREE.ConeGeometry(r * 0.9, r * 1.6, seg), shaft, u, y1 + broken + r * 0.5, v, 0.35, 0, 0.2, 1, 1, 1);
    return y1 + broken;
  }
  f.cyl(r * 0.86, r, hs, seg, shaft, u, y1, v);
  const y2 = y1 + hs;
  if (ionic) {
    f.box(r * 2.3, r * 0.45, r * 1.5, cap, u, y2, v);
    f.put(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 1.6, 6), cap, u - r * 1.05, y2 + r * 0.2, v, Math.PI / 2);
    f.put(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 1.6, 6), cap, u + r * 1.05, y2 + r * 0.2, v, Math.PI / 2);
    f.box(r * 2.2, r * 0.25, r * 2.2, cap, u, y2 + r * 0.45, v);
    return y2 + r * 0.7;
  }
  f.cyl(r * 1.35, r * 0.9, r * 0.85, seg, cap, u, y2, v);                   // corinthian bell
  f.box(r * 2.5, r * 0.3, r * 2.5, cap, u, y2 + r * 0.85, v);               // abacus
  return y2 + r * 1.15;
}

// Crenellations along a straight wall top from (u0, v0) to (u1, v1) at height y.
export function merlons(f, u0, v0, u1, v1, y, color, { w = 0.7, h = 0.75, t = 0.45, gap = 0.55, capColor = null } = {}) {
  const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.floor((L + gap) / (w + gap)));
  const ry = -Math.atan2(v1 - v0, u1 - u0);
  const step = n > 1 ? (L - w) / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? (w / 2 + i * step) / L : 0.5;
    const u = u0 + (u1 - u0) * k, v = v0 + (v1 - v0) * k;
    f.box(w, h, t, color, u, y, v, ry);
    if (capColor) f.box(w + 0.08, 0.1, t + 0.08, capColor, u, y + h, v, ry);
  }
}

// A simple standing statue on a plinth (marble, bronze...). pose: 'stand' | 'arm' | 'bow'.
export function statue(f, u, y, v, h, color, plinth, { ry = 0, pose = 'stand', plinthH = 1.1 } = {}) {
  const pw = h * 0.42;
  f.box(pw * 1.15, plinthH * 0.18, pw * 1.15, plinth, u, y, v, ry);
  f.box(pw, plinthH * 0.68, pw, plinth, u, y + plinthH * 0.18, v, ry);
  f.box(pw * 1.15, plinthH * 0.14, pw * 1.15, plinth, u, y + plinthH * 0.86, v, ry);
  const b = y + plinthH, s = h / 2.0;
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const at = (du, dv) => [u + du * cs + dv * sn, v - du * sn + dv * cs];
  // robe / legs
  f.put(new THREE.CylinderGeometry(0.2 * s, 0.32 * s, 0.95 * s, 7), color, u, b + 0.475 * s, v);
  // torso
  f.put(new THREE.CylinderGeometry(0.24 * s, 0.2 * s, 0.6 * s, 7), color, u, b + 1.25 * s, v);
  f.put(new THREE.IcosahedronGeometry(0.17 * s, 1), color, u, b + 1.72 * s, v);
  // arms
  const [lu, lv] = at(0, -0.3 * s), [ru, rv] = at(0, 0.3 * s);
  f.put(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.6 * s, 5), color, lu, b + 1.2 * s, lv, 0.12, ry);
  if (pose === 'arm' || pose === 'bow') {
    f.put(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.65 * s, 5), color, ru, b + 1.68 * s, rv, -0.5, ry);
  } else {
    f.put(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.6 * s, 5), color, ru, b + 1.2 * s, rv, -0.12, ry);
  }
  if (pose === 'bow') {
    const [bu, bv] = at(0.15 * s, -0.48 * s);
    f.put(new THREE.TorusGeometry(0.38 * s, 0.03 * s, 3, 8, Math.PI), color, bu, b + 1.3 * s, bv, 0, ry, Math.PI / 2);
  }
}

// Bronze horse (optionally with rider), facing local +u rotated by ry. Standing on y.
export function horse(f, u, y, v, s, color, { ry = 0, rider = true, rear = false } = {}) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const at = (du, dv) => [u + du * cs + dv * sn, v - du * sn + dv * cs];
  const P = (geom, du, dy, dv, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const [pu, pv] = at(du, dv);
    f.put(geom, color, pu, y + dy * s, pv, rx, ry, rz, sx, sy, sz);
  };
  const tilt = rear ? 0.35 : 0;
  P(new THREE.IcosahedronGeometry(0.5 * s, 1), 0, 1.45, 0, 0, tilt, 1.75, 0.95, 0.85);           // body
  P(new THREE.BoxGeometry(0.35 * s, 0.85 * s, 0.3 * s), 0.85 + tilt * 0.5, 1.95 + tilt, 0, 0, -0.55); // neck
  P(new THREE.BoxGeometry(0.62 * s, 0.24 * s, 0.24 * s), 1.18 + tilt * 0.5, 2.3 + tilt, 0, 0, -0.5);   // head
  for (const [du, dv] of [[0.55, 0.22], [0.55, -0.22], [-0.6, 0.22], [-0.6, -0.22]]) {
    const front = du > 0;
    if (rear && front) P(new THREE.BoxGeometry(0.13 * s, 0.75 * s, 0.13 * s), du + 0.35, 1.45, dv * s, 0, 1.0);
    else P(new THREE.BoxGeometry(0.13 * s, 1.1 * s, 0.13 * s), du * s, 0.55, dv * s);
  }
  P(new THREE.BoxGeometry(0.12 * s, 0.7 * s, 0.12 * s), -0.95, 1.2, 0, 0, -0.35);                    // tail
  if (rider) {
    P(new THREE.CylinderGeometry(0.2 * s, 0.24 * s, 0.75 * s, 6), -0.05, 2.25 + tilt * 0.3, 0, 0, tilt * 0.5);
    P(new THREE.IcosahedronGeometry(0.16 * s, 1), -0.08, 2.78 + tilt * 0.3, 0);
    P(new THREE.BoxGeometry(0.12 * s, 0.5 * s, 0.6 * s), 0.05, 1.8, 0);                             // legs astride
  }
}

// Flag on a pole; stripes: array of colours (vertical bands).
export function flag(f, u, y, v, poleH, stripes, { w = 1.6, h = 1.05, ry = 0, pole = '#f4f1ea' } = {}) {
  f.cyl(0.06, 0.08, poleH, 6, pole, u, y, v);
  f.sphere(0.11, '#d9b44a', u, y + poleH + 0.08, v);
  const sw = w / stripes.length, cs = Math.cos(ry), sn = Math.sin(ry);
  stripes.forEach((c, i) => {
    const du = 0.08 + sw * (i + 0.5);
    f.box(sw, h, 0.04, c, u + du * cs, y + poleH - h - 0.05, v - du * sn, ry);
  });
}

// Raw triangle soup -> BufferGeometry (for ground bands, ramps and caps).
export class Tris {
  constructor() { this.p = []; }
  tri(a, b, c) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  // Adds the triangle wound so that it faces `dir` ([x, y, z]).
  facing(a, b, c, dir) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * dir[0] + ny * dir[1] + nz * dir[2] < 0) this.tri(a, c, b); else this.tri(a, b, c);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.computeVertexNormals();
    return g;
  }
}

// The grain of grainMaterial() darkens by about this much on average; Painted colours are lifted to match.
const GRAIN_GAIN = 1.12;

// Ground cover as triangles with per-vertex colour: the current colour, broken up by soft noise
// (worn and lush patches), and world-space UVs for the tiled grain of grainMaterial(). A vertex
// [x, y, z, t] blends t of the way to the colour's `fade` partner (soft edges into the lawn).
export class Painted {
  constructor(vary = 0.07) { this.p = []; this.c = []; this.vary = vary; this.col = new THREE.Color(); this.fade = new THREE.Color(); }
  color(c, fade = c) { this.col.set(c); this.fade.set(fade); return this; }
  tri(...verts) {
    for (const [x, y, z, t = 0] of verts) {
      const k = GRAIN_GAIN * (1 + this.vary * (fbm2(x / 9, z / 9, 2) + 0.6 * noise2(x / 2.2, z / 2.2)));
      this.p.push(x, y, z);
      this.c.push((this.col.r + (this.fade.r - this.col.r) * t) * k, (this.col.g + (this.fade.g - this.col.g) * t) * k, (this.col.b + (this.fade.b - this.col.b) * t) * k);
    }
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  geometry(tile = 4) {
    const g = new THREE.BufferGeometry();
    const uv = new Float32Array((this.p.length / 3) * 2);
    for (let i = 0, j = 0; i < this.p.length; i += 3, j += 2) { uv[j] = this.p[i] / tile; uv[j + 1] = this.p[i + 2] / tile; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

// Vertex-colour material with a tiled grain (sand grit, grass blades) like the terrain's detail.
export function grainMaterial(rnd) {
  const map = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#f7f7f7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      const v = Math.round(200 + rnd() * 55);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.5 + rnd() * 1.3, 0, Math.PI * 2); g.fill();
    }
    g.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w, y = rnd() * h, v = Math.round(185 + rnd() * 40);
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 3 - 1.5, y - 2 - rnd() * 3); g.stroke();
    }
  });
  return new THREE.MeshLambertMaterial({ vertexColors: true, map });
}

const FACES = { '+v': [0, 1, 0], '-v': [0, -1, Math.PI], '+u': [1, 0, Math.PI / 2], '-u': [-1, 0, -Math.PI / 2] };

// Window or door on a wall face ('+v' | '-v' | '+u' | '-u'). (u, v) is a point on the wall plane,
// y the sill height. Frame and fill are thin slabs proud of the wall, the fill slightly recessed.
export function opening(f, face, u, y, v, w, h, { arch = false, frame = C.travertine, fill = C.window, fw = 0.16, shutters = null, sill = false } = {}) {
  const [nu, nv, ry] = FACES[face];
  const at = (o) => [u + nu * o, v + nv * o];
  const [fu, fv] = at(0.03), [gu, gv] = at(0.07);
  if (arch) {
    if (frame) f.relief(archShape(w + fw * 2, h + fw), 0.08, frame, fu, y - fw, fv, ry);
    f.relief(archShape(w, h), 0.06, fill, gu, y, gv, ry);
  } else {
    if (frame) f.box(w + fw * 2, h + fw * 2, 0.08, frame, fu, y - fw, fv, ry);
    f.box(w, h, 0.06, fill, gu, y, gv, ry);
  }
  if (sill) {
    const [su, sv] = at(0.1);
    f.box(w + fw * 3, 0.1, 0.2, frame || C.travertine, su, y - fw - 0.1, sv, ry);
  }
  if (shutters) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (const side of [-1, 1]) {
      const d = side * (w / 2 + fw + w * 0.27);
      const [su, sv] = at(0.07);
      f.box(w * 0.5, h, 0.07, shutters, su + d * cs, y, sv - d * sn, ry);
    }
  }
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
