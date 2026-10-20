// Building blocks for low-poly, phone-friendly scenery.
//
// Performance rules for every module (phones first!):
//  * Merge static geometry: use GeoBuilder, which bakes many coloured parts into ONE mesh that
//    shares the vertex-colour material. Aim for a handful of draw calls per landmark.
//  * Repeated objects (trees, benches, lamps, people) use InstancedMesh, split into spatial
//    chunks (see chunkKey) so off-screen chunks are culled.
//  * Keep triangles modest: cylinders 6-12 segments, spheres via IcosahedronGeometry(r, 0-1).
//  * No real-time lights other than the shared sun + hemisphere light from core.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Colours of Rome and the park, picked to read well under warm midday sun.
export const PALETTE = {
  travertine: '#e9e1cf', travertineShade: '#cfc3a8', marble: '#f2efe8', stucco: '#f1e4c8',
  ochre: '#e3b25c', romanYellow: '#e9c46a', terracotta: '#c9673e', roofTile: '#b5532f', brick: '#a5553a',
  pompeiiRed: '#a8322d', sienna: '#c27b3e', umber: '#7a5534', bronze: '#6f5a3a', verdigris: '#5d9c8a',
  ironBlack: '#2b2b2e', gravel: '#d8c8a2', gravelDark: '#bfa97f', asphalt: '#6d6a66', sand: '#e2c98f',
  grass: '#7fae4f', grassLight: '#9cc35c', grassDark: '#5f8f3c', lawn: '#86b955', hedge: '#3f7a35',
  pineCanopy: '#3e6b35', pineTrunk: '#8a5a3c', holmOak: '#3f5f34', cedar: '#4c6b4a', plane: '#7aa04a',
  cypress: '#2f5530', water: '#4a90b8', waterDeep: '#2f6f94', sky: '#8cc3e8', white: '#ffffff', cream: '#fff6e3',
};

let _mats = null;
// Shared materials. vc = vertex colours (use with GeoBuilder output).
export function mats() {
  if (_mats) return _mats;
  _mats = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    vcFlat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    vcDouble: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    vcFlatDouble: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }),
    glass: new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  return _mats;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _col = new THREE.Color();

// Bakes many coloured primitives into one mesh. All helpers take the CENTRE position of the part.
//   const gb = new GeoBuilder();
//   gb.box(4, 3, 4, PALETTE.ochre, x, y + 1.5, z);
//   gb.cyl(0.3, 0.3, 4, 8, PALETTE.marble, x, y + 2, z);
//   scene.add(gb.build());            // one draw call
export class GeoBuilder {
  constructor() { this.parts = []; }
  get count() { return this.parts.length; }

  // Adds any BufferGeometry (it is consumed). matrix: optional Matrix4 placement.
  add(geometry, color, matrix = null) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    _col.set(color);
    for (let i = 0; i < n; i++) { arr[i * 3] = _col.r; arr[i * 3 + 1] = _col.g; arr[i * 3 + 2] = _col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  // Place geometry with position / Euler rotation (radians) / scale.
  place(geometry, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.add(geometry, color, _m);
  }

  box(w, h, d, color, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.place(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }
  cyl(rTop, rBottom, h, seg, color, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.place(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, x, y, z, rx, ry, rz);
  }
  cone(r, h, seg, color, x, y, z, ry = 0) {
    return this.place(new THREE.ConeGeometry(r, h, seg), color, x, y, z, 0, ry, 0);
  }
  sphere(r, detail, color, x, y, z, sx = 1, sy = 1, sz = 1) {
    return this.place(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, 0, 0, 0, sx, sy, sz);
  }
  // Half sphere (dome) sitting on y: base at y, radius r.
  dome(r, wSeg, hSeg, color, x, y, z, sy = 1) {
    return this.place(new THREE.SphereGeometry(r, wSeg, hSeg, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, 0, 0, 0, 1, sy, 1);
  }
  torus(r, tube, rs, ts, color, x, y, z, rx = Math.PI / 2, ry = 0) {
    return this.place(new THREE.TorusGeometry(r, tube, rs, ts), color, x, y, z, rx, ry, 0);
  }
  // Extruded 2D shape (THREE.Shape in x/y), extruded along +z by depth; then placed.
  extrude(shape, depth, color, x, y, z, rx = 0, ry = 0, rz = 0, bevel = false) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
    return this.place(g, color, x, y, z, rx, ry, rz);
  }
  // Vertical prism from a ground footprint ring [[x,z],...] between y0 and y1 (walls of a building).
  prism(ring, y0, y1, color) {
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return this.add(g, color);
  }

  // Merge into a single Mesh. Returns null when empty.
  build(material = mats().vcFlat, { castShadow = true, receiveShadow = true, name = '' } = {}) {
    if (!this.parts.length) return null;
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }
}

// Returns a geometry merged from a GeoBuilder without wrapping it in a Mesh (for InstancedMesh templates).
export function buildGeometry(gb) {
  if (!gb.parts.length) return null;
  const geo = mergeGeometries(gb.parts, false);
  for (const p of gb.parts) p.dispose();
  gb.parts = [];
  geo.computeBoundingSphere();
  return geo;
}

// Spatial chunking for InstancedMesh culling: group items by chunkKey(x, z) and build one
// InstancedMesh per chunk.
export const CHUNK = 90;
export function chunkKey(x, z) { return `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`; }

// Build chunked InstancedMeshes. items: [{x, y, z, ry, s, sy?, color?}]. Returns a Group.
export function instancedChunks(geometry, material, items, { castShadow = true, receiveShadow = false, name = '' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  const byChunk = new Map();
  for (const it of items) {
    const k = chunkKey(it.x, it.z);
    if (!byChunk.has(k)) byChunk.set(k, []);
    byChunk.get(k).push(it);
  }
  for (const list of byChunk.values()) {
    const im = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((it, i) => {
      _m.compose(_p.set(it.x, it.y, it.z), _q.setFromEuler(_e.set(it.rx || 0, it.ry || 0, it.rz || 0)), _s.set(it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1));
      im.setMatrixAt(i, _m);
      if (it.color !== undefined) im.setColorAt(i, _col.set(it.color));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = castShadow;
    im.receiveShadow = receiveShadow;
    im.name = name;
    group.add(im);
  }
  return group;
}

// Canvas-drawn texture. draw(ctx2d, w, h). Returns THREE.CanvasTexture (sRGB, mipmapped).
export function canvasTexture(w, h, draw, { repeat = null, wrap = true, srgb = true, anisotropy = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = anisotropy;
  return t;
}

// Text on a sprite (signs, labels). Height in world units.
export function textSprite(text, { height = 1.2, font = '700 64px system-ui, sans-serif', color = '#2a2118', bg = 'rgba(255,246,227,0.92)', pad = 24 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = 96;
  c.width = w; c.height = h;
  g.font = font;
  if (bg) { g.fillStyle = bg; roundRect(g, 0, 0, w, h, 22); g.fill(); }
  g.fillStyle = color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set((height * w) / h, height, 1);
  return s;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Soft round shadow decal (for objects on 'low' quality where shadow maps are off).
let _blobTex = null;
export function blobShadow(radius, opacity = 0.35) {
  if (!_blobTex) {
    _blobTex = canvasTexture(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { wrap: false, srgb: false });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, color: 0x000000 }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}
