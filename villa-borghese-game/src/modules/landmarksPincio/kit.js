// Shared kit for the Pincio landmarks: a GeoBuilder that keeps texture coordinates (so one
// canvas atlas can carry clock dials, hieroglyphs, signs and baluster cut-outs while every
// landmark stays a single draw call), plus balustrades, lamp posts, urns and simple statues.
import * as THREE from 'three';
import { GeoBuilder, PALETTE, roundRect } from '../../core/util.js';
import { rng } from '../../core/rng.js';

export const COL = {
  ...PALETTE,
  wall: '#e7d5ad', wallShade: '#d3bd8f', trim: '#f4ecdc', recess: '#4b4239', recessBlue: '#5d6a73',
  iron: '#2e3532', lantern: '#fff1c2', gilt: '#d8b04a', wood: '#6f4a2c', woodDark: '#4e3420',
  clockGreen: '#3d5a45', slate: '#56606a', granite: '#c8a698', skin: '#f0c4a0', wicker: '#b8874a',
  papyrus: '#5f9a3a', papyrusTop: '#79b046', rock: '#a99d88', flowerPink: '#e2557a', flowerRed: '#d8423a',
  flowerWhite: '#fbf7ee', flowerViolet: '#9b6fd0', bed: '#557a3c', bedHedge: '#46703a', curtain: '#b8322c', theatre: '#e9c46a', theatreGreen: '#3f7d58',
};

// ---------------------------------------------------------------------------------------------
// Atlas: one 1024x512 canvas. Rects are [x, y, w, h] in canvas pixels.
const AW = 1024, AH = 512;
const RECTS = {
  white: [0, 0, 256, 512],
  baluster: [256, 0, 512, 128],
  backdrop: [768, 0, 256, 128],
  clock: [256, 128, 256, 256],
  glyphs: [512, 128, 64, 384],
  stripes: [576, 128, 128, 128],
  window: [704, 128, 64, 128],
  poster: [768, 128, 128, 128],
  signCarlino: [576, 256, 448, 64],
  signSpqr: [576, 320, 448, 64],
  signValadier: [576, 384, 448, 64],
  signClock: [576, 448, 448, 64],
};
const WHITE_UV = [128 / AW, 1 - 256 / AH];

// UV rectangle [u0, v0, u1, v1] of an atlas region, shrunk by a pixel against bleeding.
export function uvRect(name, pad = 1.5) {
  const [x, y, w, h] = RECTS[name];
  return [(x + pad) / AW, 1 - (y + h - pad) / AH, (x + w - pad) / AW, 1 - (y + pad) / AH];
}

let _atlas = null;
export function atlasMaterial() {
  if (_atlas) return _atlas;
  const c = document.createElement('canvas');
  c.width = AW; c.height = AH;
  const g = c.getContext('2d');
  const at = (name, fn) => { const [x, y, w, h] = RECTS[name]; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); fn(w, h); g.restore(); };

  at('white', (w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); });

  // Balusters: 6 vase-shaped balusters with a little shading, transparent between them.
  at('baluster', (w, h) => {
    const n = 6, bw = w / n;
    for (let i = 0; i < n; i++) {
      const cx = bw * (i + 0.5);
      const grd = g.createLinearGradient(cx - bw * 0.3, 0, cx + bw * 0.3, 0);
      grd.addColorStop(0, '#d8d4cc'); grd.addColorStop(0.35, '#ffffff'); grd.addColorStop(1, '#bdb7ac');
      g.fillStyle = grd;
      g.beginPath();
      const prof = [[0.22, 0], [0.22, 0.08], [0.14, 0.13], [0.11, 0.2], [0.17, 0.3], [0.3, 0.52], [0.32, 0.66], [0.24, 0.8], [0.13, 0.87], [0.2, 0.92], [0.22, 1]];
      g.moveTo(cx - prof[0][0] * bw, h);
      for (const [r, t] of prof) g.lineTo(cx - r * bw, h - t * h);
      for (let k = prof.length - 1; k >= 0; k--) g.lineTo(cx + prof[k][0] * bw, h - prof[k][1] * h);
      g.closePath();
      g.fill();
    }
  });

  // Puppet stage backdrop: the bay of Naples with Vesuvius (Pulcinella's home town).
  at('backdrop', (w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7fc0ec'); sky.addColorStop(1, '#d8eef8');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a7f8f';
    g.beginPath(); g.moveTo(40, h * 0.62); g.lineTo(110, h * 0.22); g.lineTo(130, h * 0.26); g.lineTo(200, h * 0.62); g.fill();
    g.fillStyle = '#eef2f5'; g.beginPath(); g.arc(118, h * 0.16, 9, 0, 7); g.arc(132, h * 0.1, 11, 0, 7); g.fill();
    g.fillStyle = '#2f7fb5'; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = '#f2d36b'; g.beginPath(); g.arc(214, 26, 14, 0, 7); g.fill();
    for (let i = 0; i < 5; i++) {
      g.fillStyle = ['#f0c27a', '#e98d6b', '#f6e3b5', '#d9b38c', '#f2a65a'][i];
      g.fillRect(8 + i * 22, h * 0.48 - (i % 2) * 10, 20, 40);
    }
  });

  // Clock dial: white enamel, black Roman numerals, gilt ring. Outside the circle is cut away.
  at('clock', (w, h) => {
    const cx = w / 2, cy = h / 2, R = w / 2 - 4;
    g.fillStyle = '#c9a34a'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbf8ef'; g.beginPath(); g.arc(cx, cy, R - 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 22, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
      const r0 = R - 22, r1 = R - (big ? 34 : 28);
      g.lineWidth = big ? 5 : 2;
      g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); g.stroke();
    }
    const num = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    g.fillStyle = '#1d1d1d'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 26px Georgia, "Times New Roman", serif';
    num.forEach((s, i) => {
      const a = (i / 12) * Math.PI * 2, r = R - 56;
      g.save(); g.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r); g.rotate(a); g.fillText(s, 0, 0); g.restore();
    });
    g.fillStyle = '#c9a34a'; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
  });

  // Hieroglyph column for the obelisk: light ground (tinted by the granite colour), carved signs.
  at('glyphs', (w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const r = rng('pincio-glyphs');
    g.strokeStyle = '#6c5a52'; g.fillStyle = '#6c5a52'; g.lineWidth = 3; g.lineCap = 'round';
    g.strokeRect(8, 6, w - 16, h - 12);
    for (let y = 18; y < h - 26; y += 26) {
      const k = Math.floor(r() * 7), x = w / 2;
      g.beginPath();
      if (k === 0) { g.arc(x, y + 8, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, y + 8, 2.5, 0, 7); g.fill(); }
      else if (k === 1) { g.moveTo(x - 12, y + 4); for (let i = 0; i < 4; i++) g.lineTo(x - 9 + i * 7, y + (i % 2 ? 12 : 4)); g.stroke(); }
      else if (k === 2) { g.ellipse(x - 2, y + 9, 9, 6, 0, 0, 7); g.fill(); g.fillRect(x + 4, y, 4, 6); g.fillRect(x - 10, y + 13, 3, 8); g.fillRect(x + 2, y + 13, 3, 8); }
      else if (k === 3) { g.moveTo(x, y); g.lineTo(x, y + 18); g.moveTo(x - 7, y + 6); g.lineTo(x + 7, y + 6); g.stroke(); g.beginPath(); g.ellipse(x, y + 1, 4, 5, 0, 0, 7); g.stroke(); }
      else if (k === 4) { g.fillRect(x - 12, y + 6, 24, 6); }
      else if (k === 5) { g.moveTo(x - 10, y + 18); g.quadraticCurveTo(x, y - 6, x + 10, y + 18); g.stroke(); }
      else { roundRect(g, x - 11, y, 22, 20, 8); g.stroke(); g.fillRect(x - 4, y + 7, 8, 6); }
    }
  });

  at('stripes', (w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff4e6' : '#c23a32'; g.fillRect((i * w) / 8, 0, w / 8 + 1, h); }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 8; i++) g.fillRect((i * w) / 8 + w / 16, 0, 3, h);
  });

  // Window: dark glass, cream frame and glazing bars.
  at('window', (w, h) => {
    g.fillStyle = '#fbf3e1'; g.fillRect(0, 0, w, h);
    const glass = g.createLinearGradient(0, 0, w, h);
    glass.addColorStop(0, '#5f7c8f'); glass.addColorStop(1, '#2f4253');
    g.fillStyle = glass; g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fbf3e1'; g.fillRect(w / 2 - 3, 8, 6, h - 16); g.fillRect(8, h * 0.38, w - 16, 5); g.fillRect(8, h * 0.68, w - 16, 5);
  });

  // Pulcinella poster.
  at('poster', (w, h) => {
    g.fillStyle = '#f6e7c4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b8322c'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(64, 10); g.lineTo(48, 52); g.lineTo(80, 52); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#f1c9a5'; g.beginPath(); g.arc(64, 66, 17, 0, 7); g.fill();
    g.fillStyle = '#151515'; g.beginPath(); g.ellipse(64, 60, 16, 8, 0, Math.PI, 0); g.fill(); g.fillRect(60, 58, 8, 12);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(40, 124); g.lineTo(52, 84); g.lineTo(76, 84); g.lineTo(88, 124); g.fill();
    g.fillStyle = '#b8322c'; g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('PULCINELLA', 64, 118);
  });

  const sign = (name, text, bg, fg, font) => at(name, (w, h) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
  sign('signCarlino', 'TEATRO SAN CARLINO', '#8f2a24', '#f8e7b0', 'bold 36px Georgia, "Times New Roman", serif');
  sign('signSpqr', 'S · P · Q · R', '#f3ead7', '#5b4a37', 'bold 40px Georgia, "Times New Roman", serif');
  sign('signValadier', 'CASINA VALADIER', '#f6efe0', '#6b5638', '600 34px Georgia, "Times New Roman", serif');
  sign('signClock', 'IDROCRONOMETRO', '#f6efe0', '#3d5a45', 'bold 34px Georgia, "Times New Roman", serif');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _atlas = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, flatShading: true, alphaTest: 0.5 });
  _atlas.name = 'pincioAtlas';
  return _atlas;
}

// ---------------------------------------------------------------------------------------------
// GeoBuilder variant that keeps UVs. Parts added after tex('clock') map their own 0..1 UVs into
// that atlas region; everything else samples the white area, so vertex colours show unchanged.
export class TexBuilder extends GeoBuilder {
  constructor() { super(); this.rect = null; }
  tex(name) { this.rect = name ? uvRect(name) : null; return this; }

  add(geometry, color, matrix = null) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const src = this.rect ? g.attributes.uv : null;
    const uv = new Float32Array(n * 2);
    const r = this.rect;
    for (let i = 0; i < n; i++) {
      if (src) { uv[i * 2] = r[0] + src.getX(i) * (r[2] - r[0]); uv[i * 2 + 1] = r[1] + src.getY(i) * (r[3] - r[1]); }
      else { uv[i * 2] = WHITE_UV[0]; uv[i * 2 + 1] = WHITE_UV[1]; }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const col = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  // Textured quad (atlas region) of size w x h centred at (x, y, z), facing (sin ry, 0, cos ry).
  decal(name, w, h, x, y, z, ry, color = '#ffffff') {
    this.tex(name);
    this.place(new THREE.PlaneGeometry(w, h), color, x, y, z, 0, ry, 0);
    return this.tex(null);
  }

  // Like place() but the yaw is applied last (Euler order YXZ): tilt a part in its own frame, then turn it.
  orient(geometry, color, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_eu.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return this.add(geometry, color, _m4);
  }

  // Raw quads/triangles from world-space points. Each face is oriented towards `out`.
  poly(points, color, out) {
    const pos = [];
    for (let i = 1; i < points.length - 1; i++) {
      let a = points[0], b = points[i], c = points[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (out && nx * out[0] + ny * out[1] + nz * out[2] < 0) { const t = b; b = c; c = t; }
      pos.push(...a, ...b, ...c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return this.add(g, color);
  }
}
const _c = new THREE.Color();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// Rotation for a box/plane whose local +x should run along direction (dx, dz).
export const alongY = (dx, dz) => Math.atan2(-dz, dx);
// Rotation for a model built facing +z to face direction (dx, dz).
export const faceY = (dx, dz) => Math.atan2(dx, dz);

// ---------------------------------------------------------------------------------------------
// Polyline helpers on the ground plane.

// Points every ~step along a polyline, keeping the corners.
export function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

// Offsets a polyline sideways by d (positive = to the left of travel when seen from above with
// +z pointing down the screen, i.e. along (-dz, dx)). Mitred corners.
export function offsetPolyline(pts, d) {
  const n = pts.length, out = [];
  const nrm = (i) => {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az) || 1;
    return [-(bz - az) / L, (bx - ax) / L];
  };
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? nrm(i - 1) : null, b = i < n - 1 ? nrm(i) : null;
    let nx, nz;
    if (a && b) {
      nx = a[0] + b[0]; nz = a[1] + b[1];
      const L = Math.hypot(nx, nz) || 1;
      nx /= L; nz /= L;
      const cos = Math.max(0.5, nx * b[0] + nz * b[1]);
      nx /= cos; nz /= cos;
    } else [nx, nz] = a || b;
    out.push([pts[i][0] + nx * d, pts[i][1] + nz * d]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Travertine balustrade along a polyline: plinth, piers, cut-out baluster panels, handrail.
// groundY(x, z) gives the base height. Returns the pier positions [{x, z, y, dx, dz}].
export function balustrade(tb, pts, groundY, { height = 1.1, panel = 2.3, color = COL.travertine, pierColor = COL.trim } = {}) {
  const piers = [];
  const plinthH = 0.26, railH = 0.14, depth = 0.36, pierW = 0.44;
  const balH = height - plinthH - railH;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.3) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L, ry = alongY(dx, dz);
    const n = Math.max(1, Math.round(L / panel));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const y0 = groundY(x0, z0), y1 = groundY(x1, z1), y = Math.min(y0, y1);
      const drop = Math.abs(y1 - y0) + 0.3;
      const len = (L / n);
      tb.box(len, plinthH + drop, depth, color, mx, y + (plinthH - drop) / 2, mz, ry);
      tb.box(len + 0.04, railH, depth + 0.1, pierColor, mx, y + height - railH / 2, mz, ry);
      const bw = len - pierW * 0.9;
      tb.tex('baluster');
      tb.place(new THREE.PlaneGeometry(bw, balH), color, mx, y + plinthH + balH / 2, mz, 0, ry, 0);
      tb.place(new THREE.PlaneGeometry(bw, balH), color, mx, y + plinthH + balH / 2, mz, 0, ry + Math.PI, 0);
      tb.tex(null);
      piers.push({ x: x0, z: z0, y: y0, dx, dz });
    }
    if (i === pts.length - 1) piers.push({ x: bx, z: bz, y: groundY(bx, bz), dx, dz });
  }
  for (const p of piers) {
    const ry = alongY(p.dx, p.dz);
    tb.box(pierW, height + 0.1, pierW, pierColor, p.x, p.y + (height + 0.1) / 2 - 0.15, p.z, ry);
    tb.box(pierW + 0.12, 0.09, pierW + 0.12, pierColor, p.x, p.y + height, p.z, ry);
  }
  return piers;
}

// Roman park lamp post (cast iron, single lantern). base = ground height.
export function lampPost(tb, x, base, z, { tall = 4.2, ry = 0 } = {}) {
  const I = COL.iron;
  tb.cyl(0.26, 0.3, 0.5, 8, I, x, base + 0.25, z);
  tb.cyl(0.2, 0.24, 0.25, 8, I, x, base + 0.62, z);
  tb.cyl(0.08, 0.12, tall - 1.5, 6, I, x, base + 0.75 + (tall - 1.5) / 2, z);
  tb.cyl(0.14, 0.1, 0.18, 6, I, x, base + tall - 0.72, z);
  lantern(tb, x, base + tall - 0.62, z, ry);
}

// Lantern sitting on y (about 0.75 tall).
function lantern(tb, x, y, z, ry = 0) {
  const I = COL.iron;
  tb.cyl(0.07, 0.1, 0.12, 6, I, x, y + 0.06, z);
  tb.cyl(0.24, 0.13, 0.42, 6, COL.lantern, x, y + 0.33, z, ry);
  tb.cyl(0.05, 0.3, 0.16, 6, I, x, y + 0.62, z, ry);
  tb.sphere(0.06, 0, I, x, y + 0.74, z);
}

// Garden urn / vase on a small base, standing on y.
export function urn(tb, x, y, z, s = 1, color = COL.trim, flowers = null) {
  tb.box(0.46 * s, 0.12 * s, 0.46 * s, color, x, y + 0.06 * s, z);
  tb.cyl(0.12 * s, 0.17 * s, 0.22 * s, 8, color, x, y + 0.23 * s, z);
  tb.sphere(0.3 * s, 1, color, x, y + 0.56 * s, z, 1, 0.85, 1);
  tb.cyl(0.32 * s, 0.22 * s, 0.2 * s, 8, color, x, y + 0.86 * s, z);
  if (flowers) tb.sphere(0.3 * s, 0, flowers, x, y + 1.02 * s, z, 1, 0.6, 1);
}

// Standing marble figure in a robe on a pedestal; faces ry.
export function statue(tb, x, y, z, ry, { s = 1, color = COL.marble, pedestal = 1.2, arm = true, helmet = false, spear = false } = {}) {
  if (pedestal > 0) {
    tb.box(1.0 * s, pedestal, 1.0 * s, COL.travertineShade, x, y + pedestal / 2, z, ry);
    tb.box(1.15 * s, 0.12, 1.15 * s, COL.trim, x, y + pedestal - 0.06, z, ry);
  }
  const L = local(x, y + pedestal, z, ry, s);
  tb.orient(new THREE.CylinderGeometry(0.24 * s, 0.38 * s, 1.15 * s, 7), color, ...L(0, 0.58, 0), ry);
  tb.orient(new THREE.CylinderGeometry(0.2 * s, 0.25 * s, 0.6 * s, 7), color, ...L(0, 1.42, 0), ry);
  tb.sphere(0.17 * s, 1, color, ...L(0, 1.9, 0.03));
  if (helmet) tb.cone(0.2 * s, 0.34 * s, 6, color, ...L(0, 2.08, 0), ry);
  tb.orient(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.75 * s, 5), color, ...L(-0.28, 1.35, 0), ry, 0, 0.12);
  if (arm) tb.orient(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.75 * s, 5), color, ...L(0.3, 1.78, 0.2), ry, 0.9, 0);
  if (spear) tb.orient(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 2.7 * s, 4), COL.bronze, ...L(0.42, 1.4, 0.1), ry);
}

// Maps local model coordinates (model faces +z, scaled by s) to world [x, y, z].
export function local(x, y, z, ry, s = 1) {
  const c = Math.cos(ry), sn = Math.sin(ry);
  return (lx, ly, lz) => [x + (lx * c + lz * sn) * s, y + ly * s, z + (-lx * sn + lz * c) * s];
}

// Rectangle with a round top: width w, total height h, base at y = 0.
export function archOutline(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

// Arch frame (archivolt): the band between two round-topped outlines.
export function archRing(w, h, band) {
  const s = archOutline(w + band * 2, h + band);
  s.holes.push(archOutline(w, h));
  return s;
}
