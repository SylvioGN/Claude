// Low-poly plant models for the vegetation module.
//
// Every model is one BufferGeometry with its base at the origin, carrying
//   position, normal, color  per-face colours with baked shading (sRGB hex in, linear out)
//   aLeaf                    1 = foliage / petals: takes the per-instance tint and sways in the wind,
//                            0 = wood, pots and fruit
// makeModel(kind, variant, lod): lod 0 is the near model (~150-450 triangles), lod 1 the far one.
// SPECIES[kind] holds what placement needs: variants, trunk radius, height and canopy radius at scale 1.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../../core/rng.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _col = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Collects painted parts and merges them into one geometry.
class Builder {
  constructor(seed) {
    this.parts = [];
    this.rnd = rng(seed);
  }

  // Adds a geometry (consumed) and paints it. Paint options:
  //   color, color2 + mix   base colour; each face takes color2 with probability mix
  //   jitter                 random per-face brightness (the faceted storybook look)
  //   grad: [y0, y1, lo, hi] brightness ramp over height (darker inside / lower down)
  //   under                  brightness of faces looking straight down
  //   leaf                   1 for foliage (tint + sway)
  //   round: {c, r, k}       bends normals by k towards an ellipsoid (centre c, radii r) so a
  //                          cluster of blobs is lit like one soft crown; otherwise faces are flat
  add(geometry, o) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    const pos = g.attributes.position;
    const n = pos.count;
    const nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const leaf = new Float32Array(n).fill(o.leaf || 0);
    const c1 = new THREE.Color(o.color), c2 = new THREE.Color(o.color2 || o.color);
    const rnd = this.rnd, jit = o.jitter ?? 0.06, r = o.round;
    for (let i = 0; i < n; i += 3) {
      _a.fromBufferAttribute(pos, i); _b.fromBufferAttribute(pos, i + 1); _c.fromBufferAttribute(pos, i + 2);
      _n.subVectors(_c, _b).cross(_t.subVectors(_a, _b)).normalize();
      const cy = (_a.y + _b.y + _c.y) / 3;
      let k = 1 + (rnd() * 2 - 1) * jit;
      if (o.grad) k *= o.grad[2] + (o.grad[3] - o.grad[2]) * clamp01((cy - o.grad[0]) / (o.grad[1] - o.grad[0]));
      if (o.under !== undefined && _n.y < 0) k *= 1 + (o.under - 1) * -_n.y;
      _col.copy(o.mix && rnd() < o.mix ? c2 : c1).multiplyScalar(k);
      for (let v = 0; v < 3; v++) {
        const j = (i + v) * 3;
        col[j] = _col.r; col[j + 1] = _col.g; col[j + 2] = _col.b;
        if (r) {
          _t.fromBufferAttribute(pos, i + v);
          _t.set((_t.x - r.c[0]) / (r.r[0] * r.r[0]), (_t.y - r.c[1]) / (r.r[1] * r.r[1]), (_t.z - r.c[2]) / (r.r[2] * r.r[2])).normalize();
          _t.multiplyScalar(r.k).addScaledVector(_n, 1 - r.k).normalize();
          nor[j] = _t.x; nor[j + 1] = _t.y; nor[j + 2] = _t.z;
        } else {
          nor[j] = _n.x; nor[j + 1] = _n.y; nor[j + 2] = _n.z;
        }
      }
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aLeaf', new THREE.BufferAttribute(leaf, 1));
    this.parts.push(g);
    return this;
  }

  // Lumpy blob with shared vertices pushed in/out (no cracks). detail: a number gives an
  // icosahedron of that detail, [w, h] a UV sphere with that many segments. flat: the underside
  // is squashed up to `flat * r` below the centre (umbrella crowns, cedar layers).
  blob(r, detail, x, y, z, { sx = 1, sy = 1, sz = 1, ry = 0, wobble = 0.14, flat = null } = {}, paint) {
    const g = Array.isArray(detail) ? new THREE.SphereGeometry(r, detail[0], detail[1]) : new THREE.IcosahedronGeometry(r, detail);
    const pos = g.attributes.position;
    const seen = new Map();
    for (let i = 0; i < pos.count; i++) {
      let px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const key = `${Math.round(px * 1e3)},${Math.round(py * 1e3)},${Math.round(pz * 1e3)}`;
      let f = seen.get(key);
      if (f === undefined) { f = 1 + (this.rnd() * 2 - 1) * wobble; seen.set(key, f); }
      px *= f; py *= f; pz *= f;
      if (flat !== null && py < -r * flat) py = -r * flat + (py + r * flat) * 0.2;
      pos.setXYZ(i, px, py, pz);
    }
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    return this.add(g, paint);
  }

  // Open tapered column standing on (x, y, z); bend(t) -> [dx, dz] offsets it at height fraction t.
  trunk(r0, r1, h, seg, hSeg, bend, paint, x = 0, y = 0, z = 0) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg, hSeg, true);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i) + h / 2;
      const [dx, dz] = bend ? bend(Math.min(1, Math.max(0, py / h))) : [0, 0];
      pos.setXYZ(i, pos.getX(i) + x + dx, py + y, pos.getZ(i) + z + dz);
    }
    return this.add(g, paint);
  }

  // Open tapered cylinder from point a to point b.
  limb(a, b, r0, r1, seg, paint) {
    const from = new THREE.Vector3(...a), dir = new THREE.Vector3(...b).sub(from);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
    g.translate(0, len / 2, 0);
    _m.compose(from, _q.setFromUnitVectors(UP, dir.divideScalar(len)), _s.set(1, 1, 1));
    g.applyMatrix4(_m);
    return this.add(g, paint);
  }

  // Closed cylinder (pots, rims).
  cyl(rTop, rBottom, h, seg, x, y, z, paint, open = false) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open);
    g.translate(x, y + h / 2, z);
    return this.add(g, paint);
  }

  // Surface of revolution from [[radius, y], ...] bottom to top.
  lathe(profile, seg, paint) {
    return this.add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), paint);
  }

  // Arching palm frond: a thin closed ribbon with a V-shaped top along a drooping curve.
  frond(base, yaw, len, rise, width, segs, paint) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw), sx = dz, sz = -dx;
    const spine = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const out = len * t, up = rise * Math.sin(t * Math.PI * 0.85) - len * 0.42 * t * t;
      spine.push([base[0] + dx * out, base[1] + up, base[2] + dz * out, width * Math.sin(Math.min(1, 0.25 + t) * Math.PI * 0.82) * (1 - t * 0.55)]);
    }
    const v = [];
    const tri = (p, q, r) => v.push(...p, ...q, ...r);
    for (let i = 0; i < segs; i++) {
      const [ax, ay, az, aw] = spine[i], [bx, by, bz, bw] = spine[i + 1];
      const aL = [ax + sx * aw, ay - aw * 0.35, az + sz * aw], aR = [ax - sx * aw, ay - aw * 0.35, az - sz * aw];
      const bL = [bx + sx * bw, by - bw * 0.35, bz + sz * bw], bR = [bx - sx * bw, by - bw * 0.35, bz - sz * bw];
      const aM = [ax, ay, az], bM = [bx, by, bz];
      tri(aM, aL, bL); tri(aM, bL, bM); // top left
      tri(aM, bM, bR); tri(aM, bR, aR); // top right
      tri(aL, aR, bR); tri(aL, bR, bL); // underside
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return this.add(g, paint);
  }

  build() {
    const geo = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
}

// --- paints -------------------------------------------------------------------------------------

const BARK = {
  pine: { color: '#7a4630', color2: '#a8673f', mix: 0.45, jitter: 0.12, grad: [0, 12, 0.75, 1.05] },
  oak: { color: '#4a4038', color2: '#5e5246', mix: 0.4, jitter: 0.1, grad: [0, 5, 0.75, 1] },
  cedar: { color: '#5a4636', color2: '#6e5845', mix: 0.4, jitter: 0.1, grad: [0, 10, 0.75, 1] },
  plane: { color: '#cfc7a4', color2: '#8f8c6a', mix: 0.45, jitter: 0.14, grad: [0, 8, 0.85, 1.05] },
  palm: { color: '#7a5a3a', color2: '#9a7448', mix: 0.5, jitter: 0.1 },
  thin: { color: '#5b4a3a', jitter: 0.08 },
};

const leafPaint = (color, color2, mix, c, r, extra = {}) => ({
  color, color2, mix, jitter: 0.07, under: 0.55, leaf: 1, grad: [c[1] - r[1], c[1] + r[1], 0.7, 1.12],
  round: { c, r, k: 0.65 }, ...extra,
});

// --- species -----------------------------------------------------------------------------------

// Pinus pinea: tall bare reddish trunk, often leaning, crowned by a flat, wide umbrella.
function umbrellaPine(b, v, lod) {
  const hi = lod === 0;
  const lean = [[0.9, 0.2], [2.6, -0.4], [0.3, 0.9]][v];
  const H = [11.2, 11.8, 9.6][v];
  const bend = (t) => [lean[0] * t ** 1.6, lean[1] * t ** 1.6];
  b.trunk(0.52, 0.3, hi ? H : H + 1.4, hi ? 7 : 5, hi ? 4 : 1, bend, BARK.pine);
  const [tx, tz] = bend(1);
  const W = [6.2, 5.6, 4.8][v]; // canopy half width
  const cx = tx + lean[0] * 0.25, cz = tz + lean[1] * 0.25, cy = H + 1.2;
  const crown = { c: [cx, cy + 0.4, cz], r: [W, 2.2, W] };
  const paint = leafPaint('#3f6d33', '#52803c', 0.3, crown.c, crown.r, { grad: [H, H + 3.2, 0.72, 1.15], under: 0.72 });
  if (hi) {
    const nb = v === 2 ? 3 : 4;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + v;
      b.limb([tx * 0.92, H - 2.2, tz * 0.92], [cx + Math.cos(a) * W * 0.45, cy - 0.2, cz + Math.sin(a) * W * 0.45], 0.2, 0.1, 4, BARK.pine);
    }
  }
  b.blob(W * 0.6, hi ? [8, 5] : 0, cx, cy + 0.3, cz, { sy: 0.48, flat: 0.3 }, paint);
  const n = hi ? [6, 5, 5][v] : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + b.rnd() * 0.6 + v;
    const d = W * (0.5 + b.rnd() * 0.1);
    const r = W * (0.4 + b.rnd() * 0.08);
    b.blob(r, hi ? [7, 4] : 0, cx + Math.cos(a) * d, cy + (b.rnd() - 0.5) * 0.8, cz + Math.sin(a) * d, { sy: 0.5, ry: b.rnd() * 3, flat: 0.25 }, paint);
  }
}

// Quercus ilex: short, forked dark trunk under a dense, dark, rounded crown.
function holmOak(b, v, lod) {
  const hi = lod === 0;
  const cy = [7.6, 8.4][v], R = [4.7, 4.1][v], RY = [3.5, 3.9][v];
  b.trunk(0.5, 0.36, hi ? 3.4 : cy - 1, hi ? 6 : 5, hi ? 2 : 1, (t) => [0.25 * t, -0.15 * t], BARK.oak);
  if (hi) {
    b.limb([0.2, 2.9, -0.1], [-1.4, cy - 1.2, 0.6], 0.3, 0.16, 5, BARK.oak);
    b.limb([0.2, 2.9, -0.1], [1.5, cy - 1.0, -0.7], 0.3, 0.16, 5, BARK.oak);
  }
  const crown = { c: [0, cy, 0], r: [R, RY, R] };
  const paint = leafPaint('#3a5c30', '#4a6c3b', 0.3, crown.c, crown.r, { under: 0.68, grad: [cy - RY, cy + RY, 0.8, 1.12] });
  b.blob(R * 0.7, hi ? [8, 6] : 0, 0, cy, 0, { sy: RY / R, flat: 0.6 }, paint);
  const n = hi ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + b.rnd() * 0.7 + v * 1.3;
    const up = hi && i % 2 ? 1 : -0.3;
    b.blob(R * (0.44 + b.rnd() * 0.1), hi ? [7, 5] : 0, Math.cos(a) * R * 0.52, cy + up + (b.rnd() - 0.4) * 0.7, Math.sin(a) * R * 0.52, { ry: b.rnd() * 3, sy: 0.85, flat: 0.45 }, paint);
  }
}

// Cedrus libani: massive trunk carrying broad, flat-topped, overlapping blue-green layers.
function cedar(b, v, lod) {
  const hi = lod === 0;
  const tiers = v === 0
    ? [[3.8, 7.4, 4], [6.2, 7.0, 4], [8.6, 6.0, 3], [10.8, 4.6, 3], [12.5, 3.0, 2]]
    : [[4.4, 6.4, 3], [6.9, 6.0, 3], [9.3, 4.9, 3], [11.3, 3.2, 2]];
  const top = tiers[tiers.length - 1][0] + 1;
  b.trunk(0.8, 0.34, top, hi ? 7 : 5, hi ? 3 : 1, (t) => [0.4 * Math.sin(t * 2.4), 0.2 * t], BARK.cedar);
  const crown = { c: [0, top * 0.55, 0], r: [7, top * 0.6, 7] };
  const paint = leafPaint('#47695a', '#5e8270', 0.3, crown.c, crown.r, { grad: [2.5, top + 1, 0.78, 1.15], under: 0.62, round: { ...crown, k: 0.4 } });
  tiers.forEach(([y, r, lobes], i) => {
    if (!hi) lobes = 1;
    const a0 = i * 1.7 + v;
    for (let k = 0; k < lobes; k++) {
      const a = a0 + (k / lobes) * Math.PI * 2 + (b.rnd() - 0.5) * 0.5;
      const d = lobes > 1 ? r * (0.42 + b.rnd() * 0.1) : 0;
      const rr = lobes > 1 ? r * 0.62 : r * 0.9;
      b.blob(rr, hi ? [6, 3] : 0, Math.cos(a) * d, y + (b.rnd() - 0.5) * 0.5, Math.sin(a) * d,
        { sy: Math.min(0.5, 1.2 / rr), ry: b.rnd() * 3, wobble: 0.18, flat: 0.3 }, paint);
    }
    if (hi && i < tiers.length - 2) {
      const a = a0 + 0.8;
      b.limb([0, y - 1.6, 0], [Math.cos(a) * r * 0.5, y - 0.2, Math.sin(a) * r * 0.5], 0.26, 0.12, 4, BARK.cedar);
    }
  });
}

// Platanus: tall mottled pale trunk, big ascending limbs, airy light-green crown (turning in October).
function plane(b, v, lod) {
  const hi = lod === 0;
  const fork = [5.2, 6.0][v];
  b.trunk(0.6, 0.44, fork + 0.4, hi ? 7 : 5, hi ? 3 : 1, (t) => [0.3 * t * t, 0], BARK.plane);
  const cy = fork + 4.1, R = [6.3, 5.5][v], RY = 4.4;
  const tips = [[-2.2, cy - 1.4, 1.0], [2.4, cy - 1.0, -0.6], [0.3, cy - 0.6, -2.2]];
  if (hi) for (const tip of tips) b.limb([0.3, fork - 0.3, 0], tip, 0.36, 0.2, 5, BARK.plane);
  else b.limb([0.3, fork - 0.3, 0], [0, cy - 1, 0], 0.38, 0.22, 4, BARK.plane);
  const crown = { c: [0.2, cy + 0.6, 0], r: [R, RY, R] };
  const paint = leafPaint('#6c9a40', '#a19c45', 0.2, crown.c, crown.r, { under: 0.62 });
  b.blob(R * 0.62, hi ? [8, 6] : 0, 0.2, cy + 0.8, 0, { sy: 0.78, flat: 0.55 }, paint);
  const n = hi ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + b.rnd() * 0.5 + v;
    const d = R * (0.55 + b.rnd() * 0.1);
    b.blob(R * (0.38 + b.rnd() * 0.08), hi ? [7, 5] : 0, Math.cos(a) * d, cy + (b.rnd() - 0.3) * 1.8, Math.sin(a) * d, { ry: b.rnd() * 3, sy: 0.8, flat: 0.5 }, paint);
  }
}

// Cupressus sempervirens: tall dark flame-shaped column.
function cypress(b, v, lod) {
  const hi = lod === 0;
  const H = [13.5, 11][v], W = [1.35, 1.6][v];
  b.trunk(0.22, 0.18, 0.9, 5, 1, null, BARK.thin);
  const prof = [[0.3, 0.5], [W * 0.8, 1.1], [W, H * 0.28], [W * 0.92, H * 0.52], [W * 0.62, H * 0.76], [W * 0.28, H * 0.92], [0.02, H]];
  b.lathe(hi ? prof : [prof[0], prof[2], prof[4], prof[6]], hi ? 7 : 5, {
    color: '#2c522d', color2: '#3b6638', mix: 0.3, jitter: 0.08, leaf: 1, grad: [0, H, 0.75, 1.12],
    round: { c: [0, H * 0.45, 0], r: [W, H * 0.55, W], k: 0.7 },
  });
}

// Phoenix canariensis: thick scaly trunk and a fountain of arching fronds.
function palm(b, v, lod) {
  const hi = lod === 0;
  const H = [6.8, 5.4][v];
  b.trunk(0.75, 0.62, H, hi ? 8 : 6, hi ? 5 : 1, (t) => [0.25 * t * t, 0], { ...BARK.palm, jitter: 0.18 });
  b.blob(1.0, 0, 0.25, H + 0.2, 0, { sy: 0.9 }, { color: '#8a7440', jitter: 0.1 });
  const n = hi ? 20 : 9;
  const paint = { color: '#5c8c3a', color2: '#73a047', mix: 0.4, jitter: 0.08, leaf: 1, grad: [H - 2, H + 2, 0.75, 1.1] };
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + (i % 2) * 0.15;
    const up = [1.2, 2.6, 1.8][i % 3];
    b.frond([0.25, H + 0.5, 0], yaw, 4.4 + b.rnd() * 0.9, up, hi ? 0.42 : 0.55, hi ? 3 : 2, paint);
  }
}

// Magnolia grandiflora: dense, glossy, dark crown shaped like an egg, from low down.
function magnolia(b, v, lod) {
  const hi = lod === 0;
  b.trunk(0.32, 0.24, 4, 5, 1, null, BARK.thin);
  const crown = { c: [0, 5.6, 0], r: [3.2, 3.8, 3.2] };
  const paint = leafPaint('#33602f', '#55894a', 0.3, crown.c, crown.r, { jitter: 0.1, under: 0.65 });
  b.blob(3.0, hi ? [8, 6] : 0, 0, 4.8, 0, { sy: 0.8, flat: 0.55 }, paint);
  b.blob(2.3, hi ? [7, 5] : 0, 0.2, 6.9, -0.1, { sy: 0.95 }, paint);
  if (hi) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + v;
      b.blob(1.6, [6, 4], Math.cos(a) * 2.0, 5.3 + i * 0.4, Math.sin(a) * 2.0, { ry: a }, paint);
    }
    b.blob(1.1, [6, 4], 0, 8.5, 0.1, {}, paint);
  }
}

// Orange tree in a terracotta pot (the Aranciera, the secret gardens).
function orange(b, v, lod) {
  const hi = lod === 0;
  const pot = { color: '#c0633a', color2: '#d0764a', mix: 0.3, jitter: 0.06 };
  b.cyl(0.66, 0.48, 0.85, hi ? 9 : 6, 0, 0, 0, pot);
  b.cyl(0.74, 0.74, 0.14, hi ? 9 : 6, 0, 0.8, 0, { ...pot, color: '#d27a4c' });
  b.trunk(0.1, 0.08, 1.4, 5, 1, null, BARK.thin, 0, 0.8, 0);
  const crown = { c: [0, 2.6, 0], r: [1.1, 1.05, 1.1] };
  b.blob(1.05, hi ? 1 : 0, 0, 2.6, 0, { wobble: 0.1 }, leafPaint('#2f6a2a', '#43803a', 0.3, crown.c, crown.r));
  const n = hi ? 9 : 4;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + v, el = 0.35 - (i % 3) * 0.4;
    const r = 1.08;
    const g = new THREE.OctahedronGeometry(0.13, 0);
    g.translate(Math.cos(a) * Math.cos(el) * r, 2.6 + Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r);
    b.add(g, { color: '#f39a1d', jitter: 0.08 });
  }
}

// Laurel / viburnum style bush.
function shrub(b, v, lod) {
  const hi = lod === 0;
  const c = [0, 0.8, 0], r = [1.5, 1.0, 1.5];
  const paint = leafPaint(v ? '#466f30' : '#3b6530', v ? '#5d8a3e' : '#4f7a38', 0.35, c, r, { under: 0.6 });
  b.blob(1.05, hi ? 1 : 0, 0, 0.75, 0, { sy: 0.8, flat: 0.55 }, paint);
  b.blob(0.8, 0, 0.8, 0.6, 0.3, { flat: 0.5 }, paint);
  if (hi) b.blob(0.75, 0, -0.6, 0.6, -0.6, { flat: 0.5 }, paint);
}

// Clipped box / bay ball.
function hedgeBall(b, v, lod) {
  const R = [0.95, 0.75][v];
  b.blob(R, lod === 0 ? 1 : 0, 0, R * 0.92, 0, { wobble: 0.03 }, {
    color: '#3a7030', color2: '#46803a', mix: 0.4, jitter: 0.08, leaf: 1, under: 0.6, grad: [0, R * 2, 0.75, 1.1],
    round: { c: [0, R * 0.92, 0], r: [R, R, R], k: 0.85 },
  });
}

// Bedding flowers: a low leafy cushion with white heads (tinted per instance).
function flowers(b, v, lod) {
  const leaves = { color: '#3f7a32', color2: '#4e8a3a', mix: 0.4, jitter: 0.1 };
  const heads = { color: '#ffffff', jitter: 0.08, leaf: 1, under: 0.7 };
  const n = lod === 0 ? 5 : 3;
  const g = new THREE.OctahedronGeometry(0.42, 0);
  g.scale(1, 0.38, 1).translate(0, 0.12, 0);
  b.add(g, leaves);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + v, d = i === 0 ? 0 : 0.24;
    const f = new THREE.OctahedronGeometry(0.13, 0);
    f.scale(1, 0.6, 1).translate(Math.cos(a) * d, 0.28 + (i % 2) * 0.06, Math.sin(a) * d);
    b.add(f, heads);
  }
}

// Per kind: model builder, variants and the numbers placement needs (at scale 1):
// trunk = collider radius, h = height, canopy = crown radius, space = personal space radius,
// sink = how deep the base goes into the ground (hides gaps on slopes).
export const SPECIES = {
  umbrellaPine: { build: umbrellaPine, variants: 3, trunk: 0.55, h: 13.5, canopy: 6, space: 3.6, sink: 0.2, tag: 'tree' },
  holmOak: { build: holmOak, variants: 2, trunk: 0.55, h: 11.5, canopy: 4.6, space: 3.4, sink: 0.2, tag: 'tree' },
  cedar: { build: cedar, variants: 2, trunk: 0.85, h: 14, canopy: 6.8, space: 4.6, sink: 0.2, tag: 'tree' },
  plane: { build: plane, variants: 2, trunk: 0.62, h: 15, canopy: 5.6, space: 3.8, sink: 0.2, tag: 'tree' },
  cypress: { build: cypress, variants: 2, trunk: 0.5, h: 13, canopy: 1.5, space: 1.5, sink: 0.2, tag: 'tree' },
  palm: { build: palm, variants: 2, trunk: 0.8, h: 8.5, canopy: 4.5, space: 3, sink: 0.2, tag: 'tree' },
  magnolia: { build: magnolia, variants: 1, trunk: 0.4, h: 9.5, canopy: 3.2, space: 2.8, sink: 0.2, tag: 'tree' },
  orange: { build: orange, variants: 2, trunk: 0.7, h: 3.7, canopy: 1.1, space: 1.2, sink: 0.05, tag: 'pot' },
  shrub: { build: shrub, variants: 2, trunk: 0.9, h: 1.7, canopy: 1.4, space: 1.1, sink: 0.3, tag: 'bush' },
  hedgeBall: { build: hedgeBall, variants: 2, trunk: 0.85, h: 1.8, canopy: 0.95, space: 0.9, sink: 0.12, tag: 'hedge' },
  flowers: { build: flowers, variants: 2, trunk: 0, h: 0.4, canopy: 0.45, space: 0.3, sink: 0.02, tag: null },
};

export function makeModel(kind, variant, lod) {
  const b = new Builder(`veg-${kind}-${variant}`);
  SPECIES[kind].build(b, variant, lod);
  return b.build();
}
