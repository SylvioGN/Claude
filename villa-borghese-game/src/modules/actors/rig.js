// Instanced characters with per-instance colours and limb animation done in the vertex shader.
//
// Every vertex carries aRig = (swing, pivotY, pivotZ | shoulderX, region + 8 * armSide):
//   swing     how much the part follows the walk swing (legs +1 / -1, arms opposite to legs)
//   pivot     legs swing about the x axis through (pivotY, pivotZ); arms also rise about the
//             z axis through (shoulderX, pivotY) - for arms the third value is shoulderX
//   region    0 = baked vertex colour, 1 top, 2 bottom, 3 skin, 4 hair, 5 accent, 6 lower legs
//   armSide   1 = right arm/wing (-x side), 2 = left arm/wing (+x side)
// Each instance carries iAnim = (phase, swingAmount, raiseRight, raiseLeft) in radians,
// iPal = 4 packed sRGB colours (top, bottom, skin, hair) and iPal2 = (accent, lower, glow).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const REG = { FIXED: 0, TOP: 1, BOTTOM: 2, SKIN: 3, HAIR: 4, ACCENT: 5, LOWER: 6 };
export const R = {
  fixed: [0, 0, 0, 0],
  region: (reg) => [0, 0, 0, reg],
  leg: (swing, py, pz, reg) => [swing, py, pz, reg],
  arm: (side, swing, py, sx, reg) => [swing, py, sx, reg + 8 * side],
};

// sRGB hex -> one float (exact up to 2^24)
const _c = new THREE.Color();
export function pack(hex) {
  _c.setStyle(hex, THREE.NoColorSpace);
  return Math.round(_c.r * 255) * 65536 + Math.round(_c.g * 255) * 256 + Math.round(_c.b * 255);
}

const VERT_PARS = /* glsl */`
attribute vec4 aRig;
attribute vec4 iAnim;
attribute vec4 iPal;
attribute vec3 iPal2;
varying float vGlow;
vec3 rigUnpack(float f) {
  float r = floor(f / 65536.0);
  float g = floor((f - r * 65536.0) / 256.0);
  float b = f - r * 65536.0 - g * 256.0;
  vec3 c = vec3(r, g, b) / 255.0;
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 rigApply(vec3 p, bool isNormal) {
  float side = floor(aRig.w / 8.0 + 0.01);
  float raise = side > 1.5 ? iAnim.w : side > 0.5 ? -iAnim.z : 0.0;
  float a = sin(iAnim.x) * iAnim.y * aRig.x * (1.0 - clamp(abs(raise) / 1.4, 0.0, 1.0));
  vec3 piv = isNormal ? vec3(0.0) : side > 0.5 ? vec3(aRig.z, aRig.y, 0.0) : vec3(0.0, aRig.y, aRig.z);
  vec3 q = p - piv;
  float c = cos(a), s = sin(a);
  q = vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c);
  if (side > 0.5) {
    c = cos(raise); s = sin(raise);
    q = vec3(q.x * c - q.y * s, q.x * s + q.y * c, q.z);
  }
  return q + piv;
}
`;

function patch(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
    .replace('#include <color_vertex>', `#include <color_vertex>
  {
    float reg = mod(aRig.w, 8.0);
    vec3 tint = vec3(1.0);
    if (reg > 0.5) {
      float f = reg < 1.5 ? iPal.x : reg < 2.5 ? iPal.y : reg < 3.5 ? iPal.z : reg < 4.5 ? iPal.w : reg < 5.5 ? iPal2.x : iPal2.y;
      tint = rigUnpack(f);
    }
    vColor.rgb *= tint;
    vGlow = iPal2.z;
  }`)
    .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = rigApply(vec3(normal), true);')
    .replace('#include <begin_vertex>', 'vec3 transformed = rigApply(vec3(position), false);');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vGlow;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vGlow * diffuseColor.rgb;');
}

let _mats = null;
// flat: low-poly characters; smooth: round things (gelato scoops, balloons, balls).
export function rigMaterials() {
  if (_mats) return _mats;
  const make = (flat) => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat });
    m.onBeforeCompile = patch;
    m.customProgramCacheKey = () => `actorsRig${flat ? 'F' : 'S'}`;
    return m;
  };
  _mats = { flat: make(true), smooth: make(false) };
  return _mats;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _col = new THREE.Color();

// Like util.GeoBuilder, but every part also gets an aRig value.
export class RigBuilder {
  constructor() { this.parts = []; }
  add(geometry, color, rig = R.fixed, matrix = null) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3), rg = new Float32Array(n * 4);
    _col.set(color);
    for (let i = 0; i < n; i++) {
      col[i * 3] = _col.r; col[i * 3 + 1] = _col.g; col[i * 3 + 2] = _col.b;
      rg[i * 4] = rig[0]; rg[i * 4 + 1] = rig[1]; rg[i * 4 + 2] = rig[2]; rg[i * 4 + 3] = rig[3];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aRig', new THREE.BufferAttribute(rg, 4));
    this.parts.push(g);
    return this;
  }
  place(geometry, color, rig, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.add(geometry, color, rig, _m);
  }
  box(w, h, d, color, rig, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.place(new THREE.BoxGeometry(w, h, d), color, rig, x, y, z, rx, ry, rz);
  }
  cyl(rTop, rBot, h, seg, color, rig, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sz = 1) {
    return this.place(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, rig, x, y, z, rx, ry, rz, sx, 1, sz);
  }
  // Cylinder between two points (limbs, poles, strings).
  limb(r0, r1, a, b, seg, color, rig) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz);
    const g = new THREE.CylinderGeometry(r1, r0, L, seg);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(1, 1, 1));
    return this.add(g, color, rig, _m);
  }
  // Geometry built along +y, turned to point along (dx, dy, dz).
  aim(geometry, color, rig, x, y, z, dx, dy, dz) {
    const L = Math.hypot(dx, dy, dz);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
    _m.compose(_p.set(x, y, z), _q, _s.set(1, 1, 1));
    return this.add(geometry, color, rig, _m);
  }
  sphere(r, detail, color, rig, x, y, z, sx = 1, sy = 1, sz = 1) {
    return this.place(new THREE.IcosahedronGeometry(r, detail), color, rig, x, y, z, 0, 0, 0, sx, sy, sz);
  }
  ball(r, ws, hs, color, rig, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) {
    return this.place(new THREE.SphereGeometry(r, ws, hs), color, rig, x, y, z, rx, 0, 0, sx, sy, sz);
  }
  dome(r, ws, hs, color, rig, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) {
    return this.place(new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2), color, rig, x, y, z, rx, 0, 0, sx, sy, sz);
  }
  cone(r, h, seg, color, rig, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.place(new THREE.ConeGeometry(r, h, seg), color, rig, x, y, z, rx, ry, rz);
  }
  // Recolour the triangles of the last added part: fn(triangleIndex) -> colour or null to keep.
  paintLast(fn) {
    const g = this.parts[this.parts.length - 1], col = g.attributes.color;
    for (let f = 0; f < col.count / 3; f++) {
      const c = fn(f);
      if (c === null || c === undefined) continue;
      _col.set(c);
      for (let k = 0; k < 3; k++) col.setXYZ(f * 3 + k, _col.r, _col.g, _col.b);
    }
    return this;
  }
  build() {
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    return geo;
  }
}

// Marks the first n items of a dynamic buffer for upload (not the whole capacity).
export function uploadFirst(attr, n) {
  attr.clearUpdateRanges();
  attr.addUpdateRange(0, n * attr.itemSize);
  attr.needsUpdate = true;
}

// A dynamic InstancedMesh refilled every frame: begin(), push(...) per visible instance, end().
export class Crowd {
  constructor(scene, geometry, material, capacity, name) {
    this.cap = capacity;
    const geo = geometry.clone();
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.pal = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.pal2 = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iAnim', this.anim);
    geo.setAttribute('iPal', this.pal);
    geo.setAttribute('iPal2', this.pal2);
    geometry.dispose();
    this.mesh = new THREE.InstancedMesh(geo, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.name = name;
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.n = 0;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  // pal: {p: [top, bottom, skin, hair], a: accent, l: lower} of packed colours; anim: [phase, swing, raiseR, raiseL]
  push(x, y, z, ry, s = 1, pal = null, anim = null, glow = 0, rx = 0, rz = 0, sy = s) {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(s, sy, s));
    this.mesh.setMatrixAt(i, _m);
    const a = this.anim.array, p = this.pal.array, p2 = this.pal2.array;
    if (anim) { a[i * 4] = anim[0]; a[i * 4 + 1] = anim[1]; a[i * 4 + 2] = anim[2]; a[i * 4 + 3] = anim[3]; }
    else { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = a[i * 4 + 3] = 0; }
    if (pal) {
      p[i * 4] = pal.p[0]; p[i * 4 + 1] = pal.p[1]; p[i * 4 + 2] = pal.p[2]; p[i * 4 + 3] = pal.p[3];
      p2[i * 3] = pal.a; p2[i * 3 + 1] = pal.l;
    }
    p2[i * 3 + 2] = glow;
    return i;
  }
  // Raw matrix variant (for things tumbling in 3D).
  pushMatrix(m, pal = null, anim = null, glow = 0) {
    if (this.n >= this.cap) return -1;
    const i = this.push(0, 0, 0, 0, 1, pal, anim, glow);
    this.mesh.setMatrixAt(i, m);
    return i;
  }
  end() {
    const m = this.mesh;
    m.count = this.n;
    m.visible = this.n > 0;
    if (!this.n) return;
    uploadFirst(m.instanceMatrix, this.n);
    uploadFirst(this.anim, this.n);
    uploadFirst(this.pal, this.n);
    uploadFirst(this.pal2, this.n);
  }
}
