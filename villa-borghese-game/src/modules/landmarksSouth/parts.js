// Shared building blocks for the south landmarks: a local coordinate frame that bakes parts into a
// GeoBuilder, textured quads cut from one canvas atlas, simple statue figures and horse parts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _d = new THREE.Vector3();

// A placement frame: parts are given in local coordinates (model faces +z) and baked into the
// GeoBuilder in world space. Rotations use YXZ order: roll, then pitch, then yaw.
export class Frame {
  constructor(gb, x = 0, y = 0, z = 0, ry = 0, s = 1) {
    this.gb = gb;
    this.m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(s, s, s));
  }

  child(x, y, z, ry = 0, rx = 0, rz = 0, s = 1) {
    const f = Object.create(Frame.prototype);
    f.gb = this.gb;
    f.m = this.m.clone().multiply(new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s)));
    return f;
  }

  world(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.m); }

  add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    _m.premultiply(this.m);
    this.gb.add(geo, color, _m);
    return this;
  }

  box(w, h, d, color, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }
  cyl(rt, rb, h, seg, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz);
  }
  cone(r, h, seg, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz);
  }
  sphere(r, detail, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, rx, ry, 0, sx, sy, sz);
  }
  dome(r, seg, color, x, y, z, sy = 1) {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(2, Math.ceil(seg / 3)), 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, 0, 0, 0, 1, sy, 1);
  }
  extrude(shape, depth, color, x, y, z, rx = 0, ry = 0, rz = 0, curveSegments = 6) {
    return this.add(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments }), color, x, y, z, rx, ry, rz);
  }

  // Vertical prism over a local ground outline [[x, z], ...] between heights y0 and y1.
  prism(pts, y0, y1, color) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return this.add(g, color);
  }

  // Box whose long side (z) runs from local point a to b. w across, h thickness.
  beam(a, b, w, h, color) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-4) return this;
    return this.add(new THREE.BoxGeometry(w, h, L), color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
      -Math.asin(dy / L), Math.atan2(dx, dz), 0);
  }

  // Round limb from a to b (cylinder, radii ra at a and rb at b).
  limb(a, b, ra, rb, seg, color) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const L = _d.length();
    if (L < 1e-4) return this;
    _d.divideScalar(L);
    const g = new THREE.CylinderGeometry(rb, ra, L, seg);
    _q.setFromUnitVectors(UP, _d);
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(1, 1, 1));
    _m.premultiply(this.m);
    this.gb.add(g, color, _m);
    return this;
  }
}

// Shape helpers ---------------------------------------------------------------------------------

// Rectangle (x0..x1, y0..y1) as a THREE.Shape, optionally with arched holes [{x, w, h}] (h = spring height + radius).
export function archedPanel(x0, x1, y0, y1, holes = []) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.lineTo(x0, y0);
  for (const h of holes) s.holes.push(archPath(h.x, h.w, h.y0 ?? y0, h.h));
  return s;
}
export function archPath(cx, w, y0, h) {
  const r = w / 2, spring = y0 + h - r;
  const p = new THREE.Path();
  p.moveTo(cx - r, y0);
  p.lineTo(cx - r, spring);
  p.absarc(cx, spring, r, Math.PI, 0, true);
  p.lineTo(cx + r, y0);
  p.lineTo(cx - r, y0);
  return p;
}

// Filled round-headed arch (door, niche): width w, total height h, base at y = 0, centred on x = 0.
export function archShape(w, h) {
  const r = w / 2, s = new THREE.Shape();
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

// Annulus sector outline [[x, z], ...] around the local origin, angles measured from +z towards +x.
export function sectorRing(r0, r1, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([Math.sin(a) * r1, Math.cos(a) * r1]); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push([Math.sin(a) * r0, Math.cos(a) * r0]); }
  return pts;
}

// Hipped roof: eaves rectangle w x d at y = 0, ridge at height h, run inwards by `hip` at the ends.
export function hipRoofGeometry(w, d, h, hip = d / 2) {
  const x = w / 2, z = d / 2, r = Math.max(0, x - hip);
  const v = [
    [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z],
    [-r, h, 0], [r, h, 0],
  ];
  const tri = [
    [0, 4, 5], [0, 5, 1], // north slope
    [2, 5, 4], [2, 4, 3], // south slope
    [1, 5, 2], // east hip
    [3, 4, 0], // west hip
    [0, 1, 2], [0, 2, 3], // soffit
  ];
  const pos = [];
  for (const t of tri) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Gable (triangle) prism: base width w, height h, depth d along z, base at y = 0.
export function gableGeometry(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

// Textured quads cut from one canvas atlas, merged into a single mesh (one draw call).
export class Decals {
  constructor(texture, W, H) { this.tex = texture; this.W = W; this.H = H; this.parts = []; }

  // rect: [x0, y0, x1, y1] in atlas pixels. The quad faces local +z of the frame.
  quad(frame, w, h, rect, x, y, z, ry = 0, rx = 0) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    const [x0, y0, x1, y1] = rect;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, (x0 + u * (x1 - x0)) / this.W, 1 - (y1 - v * (y1 - y0)) / this.H);
    }
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, 0, 'YXZ')), _s.set(1, 1, 1));
    _m.premultiply(frame.m);
    g.applyMatrix4(_m);
    this.parts.push(g);
  }

  build(name) {
    if (!this.parts.length) return null;
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5 }));
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

// Statues and people -------------------------------------------------------------------------------

// A standing or seated figure built facing +z with its feet at y = 0 of the frame.
// o: {h, body, skin, hair, legs, robe (long coat/dress), pose: 'stand'|'sit'|'kneel',
//     armL/armR: hand position relative to the shoulder [x, y, z], head: 'hair'|'helmet'|'veil'|'none'}
export function figure(f, o = {}) {
  const h = o.h ?? 1.8, k = h / 1.8;
  const body = o.body, skin = o.skin ?? body, hair = o.hair ?? body, legs = o.legs ?? body;
  const pose = o.pose ?? 'stand';
  const seg = o.seg ?? 6;
  let hipY = 0.92 * k;
  if (pose === 'sit') {
    hipY = 0.5 * k;
    f.limb([-0.11 * k, hipY, 0], [-0.12 * k, hipY, 0.42 * k], 0.09 * k, 0.08 * k, seg, legs);
    f.limb([0.11 * k, hipY, 0], [0.12 * k, hipY, 0.42 * k], 0.09 * k, 0.08 * k, seg, legs);
    f.limb([-0.12 * k, hipY, 0.42 * k], [-0.12 * k, 0.04, 0.46 * k], 0.075 * k, 0.06 * k, seg, legs);
    f.limb([0.12 * k, hipY, 0.42 * k], [0.12 * k, 0.04, 0.46 * k], 0.075 * k, 0.06 * k, seg, legs);
    if (o.robe) f.box(0.42 * k, 0.12 * k, 0.5 * k, o.robe, 0, hipY + 0.02, 0.2 * k);
  } else if (pose === 'kneel') {
    hipY = 0.62 * k;
    f.limb([-0.11 * k, hipY, 0], [-0.12 * k, 0.12 * k, 0.32 * k], 0.09 * k, 0.07 * k, seg, legs);
    f.limb([-0.12 * k, 0.12 * k, 0.32 * k], [-0.12 * k, 0.06, -0.12 * k], 0.07 * k, 0.06 * k, seg, legs);
    f.limb([0.11 * k, hipY, 0], [0.12 * k, 0.5 * k, 0.4 * k], 0.09 * k, 0.08 * k, seg, legs);
    f.limb([0.12 * k, 0.5 * k, 0.4 * k], [0.12 * k, 0.04, 0.42 * k], 0.075 * k, 0.06 * k, seg, legs);
  } else if (o.robe) {
    f.cyl(0.17 * k, 0.3 * k, hipY + 0.1 * k, seg + 2, o.robe, 0, (hipY + 0.1 * k) / 2, 0);
  } else {
    const st = o.stride ?? 0.08;
    f.limb([-0.1 * k, hipY, 0], [-0.11 * k, 0.03, st * k], 0.085 * k, 0.065 * k, seg, legs);
    f.limb([0.1 * k, hipY, 0], [0.11 * k, 0.03, -st * k], 0.085 * k, 0.065 * k, seg, legs);
  }
  // torso and coat tails
  const shoulderY = hipY + 0.55 * k;
  f.limb([0, hipY - 0.04 * k, 0], [0, shoulderY, 0], 0.17 * k, 0.2 * k, seg + 1, body);
  if (o.coat) f.cyl(0.21 * k, 0.27 * k, 0.55 * k, seg + 2, o.coat, 0, hipY - 0.12 * k, -0.01 * k);
  f.box(0.46 * k, 0.12 * k, 0.24 * k, body, 0, shoulderY - 0.02 * k, 0);
  // head
  const headY = shoulderY + 0.2 * k;
  f.cyl(0.055 * k, 0.065 * k, 0.12 * k, 5, skin, 0, shoulderY + 0.06 * k, 0);
  f.sphere(0.12 * k, 1, skin, 0, headY, 0.01 * k, 1, 1.12, 1.02);
  const head = o.head ?? 'hair';
  if (head === 'hair') f.sphere(0.125 * k, 1, hair, 0, headY + 0.04 * k, -0.025 * k, 1.02, 0.95, 1.0);
  else if (head === 'veil') f.cone(0.2 * k, 0.5 * k, 7, hair, 0, headY - 0.04 * k, -0.02 * k);
  else if (head === 'helmet') f.dome(0.135 * k, 8, hair, 0, headY + 0.02 * k, 0, 1.0);
  // arms: shoulder -> elbow -> hand
  for (const side of [-1, 1]) {
    const sh = [side * 0.24 * k, shoulderY - 0.03 * k, 0];
    const rel = (side < 0 ? o.armL : o.armR) || [side * 0.06, -0.58, 0.04];
    const hand = [sh[0] + rel[0] * k, sh[1] + rel[1] * k, sh[2] + rel[2] * k];
    const elbow = [sh[0] + rel[0] * 0.45 * k + side * 0.03 * k, sh[1] + Math.min(rel[1], -0.1) * 0.55 * k, sh[2] + rel[2] * 0.35 * k];
    f.limb(sh, elbow, 0.06 * k, 0.05 * k, 5, o.sleeve ?? body);
    f.limb(elbow, hand, 0.05 * k, 0.04 * k, 5, o.sleeve ?? body);
    f.sphere(0.045 * k, 0, skin, hand[0], hand[1], hand[2]);
  }
  return { headY, shoulderY, hipY };
}

// Horse body without legs, built facing +z; leg pivots sit at y = 1.0 (see HORSE_LEGS).
// c: {coat, dark (mane, tail), muzzle}
export function horseBody(f, c, opts = {}) {
  const coat = c.coat, dark = c.dark ?? '#3a2e26', muzzle = c.muzzle ?? coat;
  const headUp = opts.headUp ?? 0;
  f.sphere(0.5, 1, coat, 0, 1.33, -0.02, 0.74, 0.86, 2.0);
  f.sphere(0.42, 1, coat, 0, 1.36, 0.62, 0.9, 1.0, 1.05);
  f.sphere(0.44, 1, coat, 0, 1.38, -0.66, 0.92, 0.95, 1.0);
  // neck and head
  const nb = [0, 1.55, 0.78], nt = [0, 2.12 + headUp * 0.1, 1.2 - headUp * 0.08];
  f.limb(nb, nt, 0.25, 0.16, 6, coat);
  f.beam([0, nt[1] + 0.13, nt[2] - 0.14], [0, 1.68, 0.62], 0.07, 0.16, dark);
  const hx = 0, hy = nt[1] - 0.06, hz = nt[2] + 0.22;
  f.add(new THREE.BoxGeometry(0.22, 0.24, 0.56), coat, hx, hy, hz, 0.75 - headUp * 0.45, 0, 0);
  f.add(new THREE.BoxGeometry(0.18, 0.18, 0.16), muzzle, hx, hy - 0.2 + headUp * 0.08, hz + 0.24 - headUp * 0.06, 0.75 - headUp * 0.45, 0, 0);
  f.cone(0.045, 0.16, 4, coat, -0.07, nt[1] + 0.2, nt[2] + 0.02);
  f.cone(0.045, 0.16, 4, coat, 0.07, nt[1] + 0.2, nt[2] + 0.02);
  // tail
  f.limb([0, 1.6, -1.0], [0, 0.95, -1.3], 0.08, 0.13, 5, dark);
}

// Leg pivots (hip/shoulder) of horseBody, in the same frame: [x, y, z, front?]
export const HORSE_LEGS = [[-0.2, 1.0, 0.68, 1], [0.2, 1.0, 0.68, 1], [-0.2, 1.0, -0.72, 0], [0.2, 1.0, -0.72, 0]];

// One leg hanging from its pivot at the frame origin (length 1.0 down to the hoof).
export function horseLeg(f, coat, hoof = '#2e2620', front = true) {
  f.cyl(0.1, 0.075, 0.55, 5, coat, 0, -0.27, front ? 0.02 : -0.03);
  f.cyl(0.065, 0.055, 0.42, 5, coat, 0, -0.73, 0);
  f.cyl(0.075, 0.085, 0.1, 5, hoof, 0, -0.96, 0.01);
}

// Rider sitting on horseBody (same frame), plus saddle and pad.
export function rider(f, c) {
  f.box(0.66, 0.05, 0.74, c.pad, 0, 1.73, 0.0);
  f.box(0.5, 0.12, 0.5, c.saddle, 0, 1.79, 0.02);
  const legs = c.legs, boots = c.boots;
  for (const s of [-1, 1]) {
    f.limb([s * 0.17, 1.9, -0.02], [s * 0.33, 1.6, 0.26], 0.085, 0.075, 5, legs);
    f.limb([s * 0.33, 1.6, 0.26], [s * 0.33, 1.2, 0.12], 0.07, 0.06, 5, boots);
    f.box(0.1, 0.07, 0.22, boots, s * 0.33, 1.17, 0.18);
  }
  f.limb([0, 1.86, -0.04], [0, 2.4, 0.04], 0.17, 0.19, 6, c.jacket);
  f.box(0.42, 0.12, 0.24, c.jacket, 0, 2.38, 0.04);
  f.cyl(0.05, 0.06, 0.1, 5, c.skin, 0, 2.48, 0.05);
  f.sphere(0.115, 1, c.skin, 0, 2.62, 0.06, 1, 1.1, 1);
  f.dome(0.135, 8, c.helmet, 0, 2.66, 0.04, 0.95);
  f.box(0.18, 0.025, 0.1, c.helmet, 0, 2.67, 0.2);
  for (const s of [-1, 1]) {
    f.limb([s * 0.22, 2.36, 0.04], [s * 0.2, 2.08, 0.24], 0.055, 0.05, 5, c.jacket);
    f.limb([s * 0.2, 2.08, 0.24], [s * 0.1, 2.02, 0.5], 0.05, 0.045, 5, c.jacket);
    f.sphere(0.04, 0, c.gloves ?? c.skin, s * 0.1, 2.02, 0.52);
    f.beam([s * 0.1, 2.02, 0.54], [s * 0.1, 1.98, 1.42], 0.02, 0.02, '#3b2a1c');
  }
}

// Holiday snapshot for a tour stop: the core parks the cart on the stop's spot facing
// view.heading, and the photo camera frames it from view.cam towards view.look.
// The camera stands `dist` from the landmark at (x, z) in direction `from` (a heading), `height`
// above the ground; the cart waits `cart` in front of the camera, `side` to its right (negative:
// left), turned `turn` from facing the camera. The camera aims `aimY` above the landmark's base
// `y` and `aimSide` to the right. The ground between the camera and the landmark (`width`
// across) is reserved so trees, props and pick-ups keep out of the picture.
export function photoView(ctx, id, { x, z, y = ctx.terrain.heightAt(x, z), from, dist, height = 3.5, cart, side = 0, turn = 0.8, aimY = 2, aimSide = 0, width = 8 }) {
  const stop = ctx.game?.stops?.find((s) => s.id === id);
  if (!stop) return null;
  const H = ctx.terrain.heightAt;
  const ux = Math.sin(from), uz = Math.cos(from), rx = uz, rz = -ux;
  const cx = x + ux * dist, cz = z + uz * dist;
  const sx = cx - ux * cart + rx * side, sz = cz - uz * cart + rz * side;
  Object.assign(stop, {
    spotX: sx, spotZ: sz,
    view: {
      heading: Math.atan2(cx - sx, cz - sz) + turn,
      cam: [cx, H(cx, cz) + height, cz],
      look: [x + rx * aimSide, y + aimY, z + rz * aimSide],
    },
  });
  const w0 = Math.abs(side) + 3.5, w1 = Math.max(width / 2, w0), bx = cx + ux * 2, bz = cz + uz * 2;
  ctx.reserve({ ring: [[bx + rx * w0, bz + rz * w0], [x + rx * w1, z + rz * w1], [x - rx * w1, z - rz * w1], [bx - rx * w0, bz - rz * w0]] });
  return stop;
}
