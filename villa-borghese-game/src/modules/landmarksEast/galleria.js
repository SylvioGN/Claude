// Galleria Borghese (Casino Nobile, Flaminio Ponzio / Giovanni Vasanzio, 1613-1616) with its
// south forecourt, the rear flower garden of Piazzale Scipione Borghese, the Giardini Segreti,
// the Uccelliera (aviary) and the Casino della Meridiana.
//
// Everything is built in the casino's local frame: x runs along the main facade (OSM long
// axis), +z points out of the main facade, which faces south-west onto Piazzale del Museo
// Borghese where Viale del Museo Borghese arrives. The Giardini Segreti strip, the aviary and
// the Meridiana line up with that same frame towards the north-west (-x).
import * as THREE from 'three';
import {
  C, FrameBuilder, UVBuilder, statue, bust, balustrade, run, beam, pottedCitrus, topiary, halfDisc,
  hipRoofGeometry, offsetRing, railingMaterial, photoView,
} from './kit.js';

// ---- facade ornaments; (x, z) is a point on the wall surface, ry turns +z to the wall normal
function outward(ry, d) { return [Math.sin(ry) * d, Math.cos(ry) * d]; }

function windowAt(gb, x, y, z, ry, w, h, ped = 1, frame = C.trim) {
  const o = (d) => outward(ry, d);
  let [ox, oz] = o(0.05);
  gb.box(w + 0.34, h + 0.34, 0.1, frame, x + ox, y + h / 2, z + oz, ry);
  [ox, oz] = o(0.1);
  gb.box(w, h, 0.06, C.glass, x + ox, y + h / 2, z + oz, ry);
  [ox, oz] = o(0.14);
  gb.box(0.07, h, 0.04, frame, x + ox, y + h / 2, z + oz, ry);
  gb.box(w, 0.07, 0.04, frame, x + ox, y + h * 0.68, z + oz, ry);
  gb.box(w + 0.55, 0.14, 0.3, frame, x + ox, y - 0.1, z + oz, ry);
  if (ped === 0) return;
  gb.box(w + 0.6, 0.14, 0.26, frame, x + ox, y + h + 0.24, z + oz, ry);
  [ox, oz] = o(0.02);
  if (ped === 1) {
    const s = new THREE.Shape([new THREE.Vector2(-(w + 0.6) / 2, 0), new THREE.Vector2((w + 0.6) / 2, 0), new THREE.Vector2(0, 0.48)]);
    gb.extrude(s, 0.24, frame, x + ox, y + h + 0.31, z + oz, 0, ry, 0);
  } else {
    gb.place(halfDisc((w + 0.5) / 2, 0.24, 8), frame, x + ox + Math.sin(ry) * 0.12, y + h + 0.31, z + oz + Math.cos(ry) * 0.12, 0, ry, 0, 1, 0.5, 1);
  }
}

function nicheAt(gb, x, y, z, ry, w, h, withStatue = true, variant = 0) {
  let [ox, oz] = outward(ry, 0.015);
  gb.box(w + 0.26, h, 0.03, C.trim, x + ox, y + h / 2, z + oz, ry);
  gb.place(halfDisc(w / 2 + 0.13, 0.03, 8), C.trim, x + ox, y + h, z + oz, 0, ry, 0);
  [ox, oz] = outward(ry, 0.035);
  gb.box(w, h, 0.03, C.niche, x + ox, y + h / 2, z + oz, ry);
  gb.place(halfDisc(w / 2, 0.03, 8), C.niche, x + ox, y + h, z + oz, 0, ry, 0);
  if (withStatue) {
    [ox, oz] = outward(ry, 0.3);
    statue(gb, x + ox, y, z + oz, ry, (h + w * 0.3) / 1.95, C.marble, variant);
  }
}

function bustNicheAt(gb, x, y, z, ry, r = 0.42) {
  let [ox, oz] = outward(ry, 0.02);
  gb.place(new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.04, 10), C.trim, x + ox, y, z + oz, Math.PI / 2, ry, 0, 0.85, 1, 1);
  [ox, oz] = outward(ry, 0.04);
  gb.place(new THREE.CylinderGeometry(r, r, 0.04, 10), C.niche, x + ox, y, z + oz, Math.PI / 2, ry, 0, 0.85, 1, 1);
  [ox, oz] = outward(ry, 0.2);
  bust(gb, x + ox, y - r * 0.85, z + oz, ry, r * 1.6);
}

function reliefAt(gb, x, y, z, ry, w, h, rnd) {
  let [ox, oz] = outward(ry, 0.03);
  gb.box(w, h, 0.06, C.stone, x + ox, y, z + oz, ry);
  [ox, oz] = outward(ry, 0.07);
  for (let i = 0; i < 3; i++) {
    const s = (i - 1) * w * 0.28 + (rnd() - 0.5) * 0.1;
    const lx = Math.cos(ry) * s, lz = -Math.sin(ry) * s;
    gb.box(0.14, h * 0.7, 0.05, C.marble, x + ox + lx, y - h * 0.05, z + oz + lz, ry, 0, (rnd() - 0.5) * 0.5);
  }
}

function pilaster(gb, x, y0, y1, z, ry, w = 0.5) {
  const [ox, oz] = outward(ry, 0.07);
  gb.box(w, y1 - y0, 0.14, C.trim, x + ox, (y0 + y1) / 2, z + oz, ry);
}

// Keeps the part of polygon `poly` where x * nx + z * nz >= c.
function clipHalfPlane(poly, nx, nz, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = p[0] * nx + p[1] * nz - c, dq = q[0] * nx + q[1] * nz - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}

// The part of segment a-b outside the circle (cx, cz, r), or null; a segment that dips into the
// circle without ending there is kept whole.
function outsideCircle(a, b, cx, cz, r) {
  const ina = Math.hypot(a[0] - cx, a[1] - cz) < r, inb = Math.hypot(b[0] - cx, b[1] - cz) < r;
  if (!ina && !inb) return [a, b];
  if (ina && inb) return null;
  const [p, q] = ina ? [b, a] : [a, b];  // p outside, q inside
  const dx = q[0] - p[0], dz = q[1] - p[1], ox = p[0] - cx, oz = p[1] - cz;
  const A = dx * dx + dz * dz, B = 2 * (ox * dx + oz * dz), Cc = ox * ox + oz * oz - r * r;
  const t = (-B - Math.sqrt(Math.max(0, B * B - 4 * A * Cc))) / (2 * A);
  return [p, [p[0] + dx * t, p[1] + dz * t]];
}

// Cuts a flower bed back so it stays `lane` clear of the centre line of every walk segment that
// comes closer, keeping the side the bed's middle is on. Returns null when too little is left.
function clipToLanes(ring, walks, lane, geo) {
  const [cx, cz] = geo.ringCentroid(ring);
  const edgeDist = (poly, a, b) => {
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      d = Math.min(d, geo.segDist2(p[0], p[1], a[0], a[1], b[0], b[1]), geo.segDist2(a[0], a[1], p[0], p[1], q[0], q[1]), geo.segDist2(b[0], b[1], p[0], p[1], q[0], q[1]));
    }
    return geo.pointInRing(a[0], a[1], poly) ? 0 : Math.sqrt(d);
  };
  let poly = ring;
  for (const [a, b] of walks) {
    if (edgeDist(poly, a, b) >= lane) continue;
    let nx = a[1] - b[1], nz = b[0] - a[0];
    const L = Math.hypot(nx, nz);
    if (L < 1e-6) continue;
    nx /= L; nz /= L;
    if ((cx - a[0]) * nx + (cz - a[1]) * nz < 0) { nx = -nx; nz = -nz; }
    poly = clipHalfPlane(poly, nx, nz, a[0] * nx + a[1] * nz + lane);
    if (poly.length < 3) return null;
  }
  return Math.abs(geo.ringArea(poly)) > 3 ? poly : null;
}

// ---------------------------------------------------------------------------------------------
export function buildGalleriaComplex(ctx, rnd) {
  const { MAP, terrain, colliders } = ctx;
  const low = ctx.quality.tier === 'low';
  const A = MAP.ANCHORS.galleria;
  const ang = A.angle, ca = Math.cos(ang), sa = Math.sin(ang);
  const toWorld = (u, v) => [A.x + u * ca - v * sa, A.z + u * sa + v * ca];
  const toLocal = (x, z) => [(x - A.x) * ca + (z - A.z) * sa, -(x - A.x) * sa + (z - A.z) * ca];
  const y0 = terrain.heightAt(A.x, A.z);
  const gy = (u, v) => terrain.heightAt(...toWorld(u, v)) - y0;

  const gb = new FrameBuilder();
  const cage = new UVBuilder();
  const frameMain = () => gb.setFrame(A.x, y0, A.z, -ang);
  frameMain();

  // ---------------------------------------------------------------- the casino
  // Plan (local): front block x +-12.4, z -1.9..10.3; wider rear block x +-15.6, z -9.2..-1.9;
  // corner towers at the front x +-[8, 12.4]; the centre is recessed to z 9.5 with the loggia.
  const FZ = 10.3, CZ = 9.5, LZ = 7.0, BZ = -9.2, MZ = -1.9, FX = 12.4, BX = 15.6, TX = 8.0, TZ = 4.6;
  const Y = { floor: 2.0, g1: 6.2, g2: 10.2, cor: 12.0, roof: 12.55, tw: 15.8, twTop: 16.3 };
  const upper = [[-FX, FZ], [-TX, FZ], [-TX, CZ], [TX, CZ], [TX, FZ], [FX, FZ], [FX, MZ], [BX, MZ], [BX, BZ], [-BX, BZ], [-BX, MZ], [-FX, MZ]];
  const ground = upper.map(([x, z]) => [x, z === CZ ? LZ : z]);
  const plinth = upper.map(([x, z]) => [x, z === CZ ? FZ : z]);

  gb.prism(offsetRing(plinth, 0.18), -0.5, Y.floor, C.plinth);
  gb.prism(offsetRing(plinth, 0.3), Y.floor - 0.12, Y.floor + 0.14, C.trim);
  gb.prism(ground, Y.floor, Y.g1, C.wall);
  gb.prism(upper, Y.g1, Y.cor, C.wall);
  for (const yb of [Y.g1, Y.g2]) gb.prism(offsetRing(upper, 0.12), yb - 0.13, yb + 0.13, C.trim);
  gb.prism(offsetRing(upper, 0.36), Y.cor, Y.roof, C.trim);
  gb.prism(offsetRing(upper, -0.6), Y.roof, Y.roof + 0.1, C.shade);
  gb.add(hipRoofGeometry(2 * FX - 1.6, CZ - MZ - 1.2, 1.7), C.roof, new THREE.Matrix4().makeTranslation(0, Y.roof, (CZ + MZ) / 2));
  gb.add(hipRoofGeometry(2 * BX - 1.6, MZ - BZ - 0.4, 1.4), C.roof, new THREE.Matrix4().makeTranslation(0, Y.roof, (MZ + BZ) / 2 - 0.2));
  // towers rise one storey above the cornice
  for (const sx of [-1, 1]) {
    const tx0 = sx * TX, tx1 = sx * FX, cx = (tx0 + tx1) / 2, w = Math.abs(tx1 - tx0), d = FZ - TZ, cz = (FZ + TZ) / 2;
    gb.box(w, Y.tw - Y.roof, d, C.wall, cx, (Y.roof + Y.tw) / 2, cz);
    gb.box(w + 0.6, 0.5, d + 0.6, C.trim, cx, Y.tw + 0.25, cz);
    gb.box(w - 1.0, 0.12, d - 1.0, C.roof, cx, Y.twTop + 0.06, cz);
    const hw = w / 2 + 0.15, hd = d / 2 + 0.15;
    const corners = [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx + hw, cz + hd], [cx - hw, cz + hd]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      balustrade(gb, ax, az, bx, bz, Y.twTop, 0.8, low ? 0.7 : 0.45);
      gb.box(0.45, 0.95, 0.45, C.trim, ax, Y.twTop + 0.47, az);
      statue(gb, ax, Y.twTop + 0.95, az, sx > 0 ? 0.6 : -0.6, 0.85, C.marble, i);
    }
    // tower storey: arched openings on every face
    for (const [fx, fz, ry] of [[cx, FZ, 0], [tx1, cz, sx * Math.PI / 2], [tx0, cz, -sx * Math.PI / 2], [cx, TZ, Math.PI]]) {
      const [ox, oz] = outward(ry, 0.06);
      gb.box(1.6, 2.5, 0.1, C.trim, fx + ox, Y.roof + 1.55, fz + oz, ry);
      gb.place(halfDisc(0.8, 0.1, 8), C.trim, fx + ox, Y.roof + 2.8, fz + oz, 0, ry, 0);
      const [ix, iz] = outward(ry, 0.1);
      gb.box(1.2, 2.3, 0.06, C.glass, fx + ix, Y.roof + 1.5, fz + iz, ry);
      gb.place(halfDisc(0.6, 0.06, 8), C.glass, fx + ix, Y.roof + 2.65, fz + iz, 0, ry, 0);
      if (ry === 0) { pilaster(gb, tx0 + sx * 0.25, Y.roof, Y.tw, FZ, 0); pilaster(gb, tx1 - sx * 0.25, Y.roof, Y.tw, FZ, 0); }
    }
  }

  // main front: loggia of five arches between the towers
  const arches = [-6.4, -3.2, 0, 3.2, 6.4];
  {
    const shape = new THREE.Shape();
    shape.moveTo(-TX, Y.floor); shape.lineTo(TX, Y.floor); shape.lineTo(TX, Y.g1); shape.lineTo(-TX, Y.g1); shape.lineTo(-TX, Y.floor);
    for (const ax of arches) {
      const h = new THREE.Path();
      h.moveTo(ax - 1.1, Y.floor); h.lineTo(ax - 1.1, Y.floor + 2.3); h.absarc(ax, Y.floor + 2.3, 1.1, Math.PI, 0, true);
      h.lineTo(ax + 1.1, Y.floor); h.lineTo(ax - 1.1, Y.floor);
      shape.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false, curveSegments: 8 });
    gb.add(g, C.wall, new THREE.Matrix4().makeTranslation(0, 0, CZ - 0.6));
    gb.box(2 * TX, Y.g1 - Y.floor, 0.04, C.shade, 0, (Y.floor + Y.g1) / 2, LZ + 0.02);
    for (const ax of arches) {
      const main = ax === 0;
      const dw = main ? 1.5 : 1.1, dh = main ? 3.0 : 2.6;
      gb.box(dw + 0.3, dh + 0.15, 0.06, C.trim, ax, Y.floor + (dh + 0.15) / 2, LZ + 0.05);
      gb.box(dw, dh, 0.06, C.door, ax, Y.floor + dh / 2, LZ + 0.08);
      gb.box(0.36, 0.5, 0.2, C.trim, ax, Y.floor + 3.3, CZ + 0.05); // keystone
      if (ax !== 0) bustNicheAt(gb, ax, Y.floor + 3.5, LZ, 0, 0.3);
    }
    for (const px of [-4.8, -1.6, 1.6, 4.8]) pilaster(gb, px, Y.floor, Y.g1 - 0.13, CZ, 0, 0.42);
    // piano nobile and attic of the centre
    for (const px of [-4.8, -1.6, 1.6, 4.8]) pilaster(gb, px, Y.g1 + 0.13, Y.cor, CZ, 0, 0.42);
    windowAt(gb, 0, Y.g1 + 0.7, CZ, 0, 1.3, 2.4, 2);
    gb.box(2.3, 0.14, 0.8, C.trim, 0, Y.g1 + 0.45, CZ + 0.4);
    balustrade(gb, -1.1, CZ + 0.72, 1.1, CZ + 0.72, Y.g1 + 0.5, 0.6, 0.3);
    for (const sx of [-1, 1]) {
      windowAt(gb, sx * 3.2, Y.g1 + 0.7, CZ, 0, 1.2, 2.3, 1);
      nicheAt(gb, sx * 6.4, Y.g1 + 0.6, CZ, 0, 0.95, 2.45, true, sx > 0 ? 1 : 2);
      bustNicheAt(gb, sx * 3.2, Y.g2 + 0.9, CZ, 0, 0.4);
      windowAt(gb, sx * 6.4, Y.g2 + 0.45, CZ, 0, 0.85, 0.9, 0);
    }
    windowAt(gb, 0, Y.g2 + 0.45, CZ, 0, 0.9, 0.9, 0);
    for (const ax of arches) reliefAt(gb, ax, Y.g1 - 0.42, CZ, 0, 1.6, 0.42, rnd);
  }
  // towers, front face and outer side face
  for (const sx of [-1, 1]) {
    const cx = sx * (TX + FX) / 2;
    for (const px of [sx * TX, sx * FX]) pilaster(gb, px + 0.25 * Math.sign(cx - px), Y.floor, Y.cor, FZ, 0, 0.5);
    nicheAt(gb, cx, Y.floor + 0.55, FZ, 0, 1.05, 2.7, true, sx > 0 ? 0 : 1);
    windowAt(gb, cx, Y.g1 + 0.7, FZ, 0, 1.2, 2.3, 1);
    bustNicheAt(gb, cx, Y.g2 + 0.9, FZ, 0, 0.42);
    for (const ox of [-1.3, 1.3]) nicheAt(gb, cx + ox, Y.g1 + 1.0, FZ, 0, 0.45, 1.5, !low, 2);
    // outer side (x = +-FX), two bays: under the tower and in front of the rear block
    const ry = sx * Math.PI / 2;
    for (const bz of [7.45, 1.35]) {
      windowAt(gb, sx * FX, Y.floor + 0.9, bz, ry, 1.1, 2.2, 1);
      windowAt(gb, sx * FX, Y.g1 + 0.7, bz, ry, 1.1, 2.3, 2);
      windowAt(gb, sx * FX, Y.g2 + 0.45, bz, ry, 0.8, 0.85, 0);
    }
    nicheAt(gb, sx * FX, Y.g1 + 0.6, 4.4, ry, 0.8, 2.3, true, 0);
    nicheAt(gb, sx * FX, Y.floor + 0.6, 4.4, ry, 0.8, 2.4, !low, 1);
    for (const pz of [FZ - 0.25, MZ + 0.25]) pilaster(gb, sx * FX, Y.floor, Y.cor, pz, ry, 0.5);
    // rear block: side face and the short step facing forward
    for (const bz of [-3.7, -7.4]) {
      windowAt(gb, sx * BX, Y.floor + 0.9, bz, ry, 1.1, 2.2, 1);
      windowAt(gb, sx * BX, Y.g1 + 0.7, bz, ry, 1.1, 2.3, bz < -5 ? 2 : 1);
      windowAt(gb, sx * BX, Y.g2 + 0.45, bz, ry, 0.8, 0.85, 0);
    }
    for (const pz of [MZ - 0.25, BZ + 0.25]) pilaster(gb, sx * BX, Y.floor, Y.cor, pz, ry, 0.5);
    nicheAt(gb, sx * 14.0, Y.g1 + 0.6, MZ, 0, 0.85, 2.4, true, 2);
    nicheAt(gb, sx * 14.0, Y.floor + 0.6, MZ, 0, 0.85, 2.4, !low, 0);
  }
  // back facade onto the flower garden
  for (let i = 0; i < 10; i++) {
    const bx = -14.4 + i * 3.2, ry = Math.PI;
    const centre = Math.abs(bx) < 2;
    if (centre) {
      gb.box(1.6, 3.0, 0.08, C.trim, bx, Y.floor + 1.5, BZ - 0.04, ry);
      gb.box(1.3, 2.8, 0.08, C.door, bx, Y.floor + 1.4, BZ - 0.08, ry);
    } else windowAt(gb, bx, Y.floor + 0.9, BZ, ry, 1.1, 2.2, i % 2 ? 1 : 2);
    if (i % 3 === 1 && !centre) nicheAt(gb, bx, Y.g1 + 0.6, BZ, ry, 0.9, 2.4, true, i);
    else windowAt(gb, bx, Y.g1 + 0.7, BZ, ry, 1.15, 2.3, i % 2 ? 2 : 1);
    if (i % 2) bustNicheAt(gb, bx, Y.g2 + 0.9, BZ, ry, 0.38);
    else windowAt(gb, bx, Y.g2 + 0.45, BZ, ry, 0.8, 0.85, 0);
  }
  for (const px of [-15.35, -12.8, -9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6, 12.8, 15.35]) pilaster(gb, px, Y.floor, Y.cor, BZ, Math.PI, 0.45);
  // steps down from the garden door: a landing and two short flights along the back wall, which
  // leave the walk round the flower garden open
  const RS = { landW: 1.8, depth: 1.4, tread: 0.5, steps: 8 };
  {
    const { landW, depth, tread, steps } = RS, rise = Y.floor / steps;
    gb.box(2 * landW, Y.floor, depth, C.plinth, 0, Y.floor / 2, BZ - depth / 2);
    balustrade(gb, -landW, BZ - depth + 0.1, landW, BZ - depth + 0.1, Y.floor, 0.75, 0.3);
    for (const sx of [-1, 1]) {
      for (let k = 1; k < steps; k++) {
        const h = Y.floor - k * rise;
        gb.box(tread, h, depth, C.stone, sx * (landW + (k - 0.5) * tread), h / 2, BZ - depth / 2);
      }
    }
  }

  // roof balustrade with statues against the sky
  const roofRuns = [[-TX, CZ + 0.15, TX, CZ + 0.15]];
  for (const sx of [-1, 1]) {
    roofRuns.push([sx * (FX + 0.15), TZ, sx * (FX + 0.15), MZ + 0.15], [sx * (FX + 0.15), MZ + 0.15, sx * (BX + 0.15), MZ + 0.15], [sx * (BX + 0.15), MZ + 0.15, sx * (BX + 0.15), BZ - 0.15]);
  }
  roofRuns.push([-BX - 0.15, BZ - 0.15, BX + 0.15, BZ - 0.15]);
  for (const [ax, az, bx, bz] of roofRuns) balustrade(gb, ax, az, bx, bz, Y.roof, 0.85, low ? 0.7 : 0.45);
  const roofStatues = [[-4.8, CZ + 0.15, 0], [-1.6, CZ + 0.15, 0], [1.6, CZ + 0.15, 0], [4.8, CZ + 0.15, 0]];
  for (const bx of [-15.75, -11.2, -4.8, 0, 4.8, 11.2, 15.75]) roofStatues.push([bx, BZ - 0.15, Math.PI]);
  for (const sx of [-1, 1]) roofStatues.push([sx * (BX + 0.15), MZ + 0.15, sx * Math.PI / 2], [sx * (FX + 0.15), 1.4, sx * Math.PI / 2]);
  roofStatues.forEach(([sx, sz, ry], i) => {
    if (low && i % 2) return;
    gb.box(0.5, 1.0, 0.5, C.trim, sx, Y.roof + 0.5, sz);
    statue(gb, sx, Y.roof + 1.0, sz, ry, 0.95, C.marble, i);
  });

  // Ponzio's double staircase: two straight flights along the main front climb from either side
  // to a landing before the loggia, the museum entrance underneath. It hugs the wall so that
  // Viale dell'Uccelliera, which passes in front of the facade, stays open.
  const ST = { landW: 2.5, landD: 1.6, flightD: 1.45, tread: 0.56, steps: 9 };
  {
    const { landW, landD, flightD, tread, steps } = ST, rise = Y.floor / steps, zl = FZ + landD;
    gb.box(2 * landW, Y.floor, landD, C.plinth, 0, Y.floor / 2 - 0.05, FZ + landD / 2);
    gb.box(2 * landW + 0.3, 0.16, landD + 0.2, C.trim, 0, Y.floor + 0.02, FZ + landD / 2);
    gb.box(1.5, 1.45, 0.08, C.trim, 0, 0.72, zl + 0.03);
    gb.box(1.2, 1.3, 0.08, C.door, 0, 0.65, zl + 0.06);
    gb.place(halfDisc(0.6, 0.08, 8), C.door, 0, 1.3, zl + 0.06);
    balustrade(gb, -landW, zl - 0.1, landW, zl - 0.1, Y.floor + 0.1, 0.75, 0.3);
    for (const sx of [-1, 1]) {
      // urn on the landing corner, then the flight down and away from the middle
      gb.box(0.5, 0.6, 0.5, C.trim, sx * (landW - 0.2), Y.floor + 0.4, zl - 0.2);
      gb.cyl(0.38, 0.2, 0.5, 8, C.marble, sx * (landW - 0.2), Y.floor + 0.95, zl - 0.2);
      gb.sphere(0.28, 1, C.marble, sx * (landW - 0.2), Y.floor + 1.32, zl - 0.2, 1, 0.6, 1);
      const posts = [];
      for (let k = 1; k < steps; k++) {
        const top = Y.floor - k * rise, x = sx * (landW + (k - 0.5) * tread);
        gb.box(tread, top, flightD, C.stone, x, top / 2, FZ + flightD / 2);
        gb.box(tread + 0.02, 0.06, flightD + 0.06, C.trim, x, top, FZ + flightD / 2);
        posts.push([x, top + 0.75, FZ + flightD - 0.1]);
      }
      for (let i = 0; i < posts.length; i++) {
        const p = posts[i];
        gb.cyl(0.07, 0.1, 0.7, 5, C.trim, p[0], p[1] - 0.38, p[2]);
        if (i) beam(gb, posts[i - 1], p, 0.3, 0.12, C.trim);
      }
      const b = posts[posts.length - 1];
      gb.box(0.4, 1.0, 0.4, C.trim, b[0], b[1] - 0.6, b[2]);
      gb.sphere(0.2, 0, C.marble, b[0], b[1] + 0.05, b[2]);
    }
    for (const sx of [-1, 1]) balustrade(gb, sx * landW, FZ + 0.05, sx * TX, FZ + 0.05, Y.floor + 0.12, 0.75, 0.4);
  }

  // forecourt: two clipped box parterres either side of the approach avenue
  for (const sx of [-1, 1]) {
    const x0 = sx * 4.9, x1 = sx * 13.1, z0 = 18.8, z1 = 31.2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.abs(x1 - x0), d = z1 - z0;
    const py = gy(cx, cz);
    gb.box(w - 0.4, 0.12, d - 0.4, C.lawn, cx, py + 0.04, cz);
    const ring = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    for (let i = 0; i < 4; i++) run(gb, ...ring[i], ...ring[(i + 1) % 4], py - 0.2, 0.75, 0.45, C.box);
    run(gb, x0, z0, x1, z1, py - 0.2, 0.55, 0.32, C.box);
    run(gb, x1, z0, x0, z1, py - 0.2, 0.55, 0.32, C.box);
    gb.cyl(1.25, 1.25, 0.55, 10, C.box, cx, py + 0.07, cz);
    gb.cyl(0.95, 0.95, 0.12, 10, '#e2524f', cx, py + 0.38, cz);
    topiary(gb, cx, py + 0.3, cz, 'cone', 1.6);
    for (const [qx, qz] of ring) topiary(gb, qx, py + 0.2, qz, 'ball', 1.05);
    for (const [fx, fz] of [[cx, z0 + d * 0.25], [cx, z1 - d * 0.25], [cx - w * 0.3, cz], [cx + w * 0.3, cz]]) {
      for (let k = 0; k < 4; k++) gb.place(new THREE.OctahedronGeometry(0.22, 0), k % 2 ? '#f2f0e6' : '#e86d8f', fx + (rnd() - 0.5) * 1.1, py + 0.2, fz + (rnd() - 0.5) * 1.1);
    }
    colliders.addRing(ring.map(([u, v]) => toWorld(u, v)), 'hedge', null, 0.3);
    ctx.reserve({ ring: offsetRing(ring, 1).map(([u, v]) => toWorld(u, v)) });
  }

  // ---------------------------------------------------------------- rear flower garden
  // the round fountain in the middle of the garden gets a vase and a little jet
  const rearFountain = MAP.WATER.find((w) => {
    const [u, v] = toLocal(...ctx.geo.ringCentroid(w.r));
    return w.k === 'fountain' && Math.abs(u) < 8 && v < -12 && v > -30;
  });
  let rearJet = null;
  const [fx, fz] = rearFountain ? ctx.geo.ringCentroid(rearFountain.r) : toWorld(0, -21);
  if (rearFountain) {
    const [u, v] = toLocal(fx, fz), h = gy(u, v);
    gb.cyl(0.35, 0.55, 1.0, 8, C.stone, u, h + 0.5, v);
    gb.cyl(1.1, 0.4, 0.4, 10, C.stone, u, h + 1.15, v);
    gb.cyl(0.95, 0.95, 0.05, 10, C.water, u, h + 1.33, v);
    rearJet = { x: fx, y: y0 + h + 1.35, z: fz, r: 0.15, v: 3.2 };
  }
  // The mapped beds of Piazzale Scipione Borghese reach right up to its walks, which are avenues
  // here. Each bed is cut back to leave a drivable lane along the walk round the garden, the two
  // walks across it and the outer ends of the long axis, then edged with box. Within GARDEN of
  // the fountain the inner beds stay whole and its little walks stay garden paths, and so does
  // the walk hugging the back wall, which is too narrow for the cart anyway.
  const GARDEN = 10.5;
  const walks = [];
  for (const p of MAP.PATHS) {
    for (let i = 1; i < p.p.length; i++) {
      const piece = outsideCircle(p.p[i - 1], p.p[i], fx, fz, GARDEN);
      if (!piece) continue;
      const mx = (piece[0][0] + piece[1][0]) / 2, mz = (piece[0][1] + piece[1][1]) / 2;
      if (ctx.geo.distToRingEdge(mx, mz, A.footprint) > 2) walks.push(piece);
    }
  }
  for (const l of MAP.LAWNS) {
    if (l.k !== 'flowers') continue;
    const [lx, lz] = toLocal(l.r[0][0], l.r[0][1]);
    if (Math.abs(lx) > 30 || lz > 0 || lz < -45) continue;
    const bed = clipToLanes(l.r, walks, 1.75, ctx.geo);
    if (!bed) continue;
    const ring = bed.map(([x, z]) => toLocal(x, z));
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      run(gb, a[0], a[1], b[0], b[1], gy(a[0], a[1]) - 0.15, 0.5, 0.32, C.box);
    }
    colliders.addRing(bed, 'hedge', null, 0.2);
  }

  // ---------------------------------------------------------------- Giardini Segreti
  // Strip between the casino and the Meridiana: x -100.5..-16.9, z -2.6..9.3 (local), split
  // by the aviary into the Giardino dell'Uccelliera and the Giardino della Meridiana.
  const SG = { x0: -100.5, x1: -16.9, z0: -2.6, z1: 9.3, axis: 3.35, half: 1.8 };
  const cross = [-26.7, -50.2, -75.0, -92.5];
  const basins = [-38.9, -83.7];
  const ucc = MAP.ANCHORS.uccelliera, mer = MAP.ANCHORS.meridiana;
  const [uccX] = toLocal(ucc.x, ucc.z);
  const uccHalf = (ucc.wid || 4.9) / 2 + 0.6;
  // enclosing hedges, open where the cross paths reach the avenue side
  const hedgeLine = (z, gaps) => {
    let x = SG.x1;
    const stops = [...gaps.map((g) => [g - 2.2, g + 2.2]), [uccX - uccHalf, uccX + uccHalf]].sort((a, b) => b[0] - a[0]);
    const pieces = [];
    for (const [g0, g1] of stops) { if (g1 < x) pieces.push([x, g1]); x = Math.min(x, g0); }
    pieces.push([x, SG.x0]);
    for (const [xa, xb] of pieces) {
      const n = Math.max(1, Math.ceil((xa - xb) / 6));
      for (let i = 0; i < n; i++) {
        const a = xa - ((xa - xb) * i) / n, b = xa - ((xa - xb) * (i + 1)) / n;
        run(gb, a, z, b, z, gy((a + b) / 2, z) - 0.3, 1.6, 0.8, C.hedge);
      }
      colliders.addSegment(...toWorld(xa, z), ...toWorld(xb, z), 'hedge', null, 0.45);
    }
  };
  hedgeLine(SG.z0, []);
  hedgeLine(SG.z1, cross);
  // compartments edged with box, lawn, flowers and potted citrus along the paths
  const segs = [];
  const bounds = [SG.x1 - 0.6, ...cross.flatMap((c) => [c + SG.half + 0.2, c - SG.half - 0.2]), SG.x0 + 0.6]
    .concat([uccX + uccHalf, uccX - uccHalf]).sort((a, b) => b - a);
  for (let i = 0; i + 1 < bounds.length; i += 2) segs.push([bounds[i], bounds[i + 1]]);
  const flowerCols = ['#e8505b', '#f6c945', '#f2f0e6', '#c86fc9', '#ff8c42'];
  for (const [xa, xb] of segs) {
    if (xa - xb < 2) continue;
    // a little round plaza around each basin
    const parts = [[xa, xb]];
    for (const bxp of basins) if (bxp < xa && bxp > xb) parts.splice(0, 1, [xa, bxp + 2.6], [bxp - 2.6, xb]);
    for (const [pa, pb] of parts) {
      for (const [za, zb] of [[SG.z0 + 0.6, SG.axis - SG.half - 0.15], [SG.axis + SG.half + 0.15, SG.z1 - 0.6]]) {
        const cx = (pa + pb) / 2, cz = (za + zb) / 2, w = pa - pb, d = zb - za;
        const h = gy(cx, cz);
        gb.box(w - 0.3, 0.14, d - 0.3, C.lawn, cx, h + 0.04, cz);
        const ring = [[pb, za], [pa, za], [pa, zb], [pb, zb]];
        for (let k = 0; k < 4; k++) run(gb, ...ring[k], ...ring[(k + 1) % 4], h - 0.15, 0.55, 0.32, C.box);
        // flowers along the hedge side, potted citrus along the garden path
        const lowSide = za < SG.axis, sgn = lowSide ? -1 : 1;
        const inner = lowSide ? zb : za, outer = lowSide ? za : zb;
        const fc = flowerCols[Math.floor(rnd() * flowerCols.length)];
        const nf = Math.max(2, Math.floor(w / 1.3));
        for (let k = 0; k < nf; k++) {
          for (const off of [0.6, 1.25]) {
            gb.place(new THREE.OctahedronGeometry(0.24, 0), (k + (off > 1 ? 1 : 0)) % 3 ? fc : '#f7f4ea', pb + 0.7 + ((w - 1.4) * (k + 0.5)) / nf, h + 0.3, outer - sgn * off);
          }
        }
        const np = Math.max(1, Math.floor(w / (low ? 6 : 3.5)));
        for (let k = 0; k < np; k++) {
          const px = pb + (w * (k + 0.5)) / np, pz = inner + sgn * 0.65;
          pottedCitrus(gb, px, gy(px, pz), pz, 0.9, rnd);
        }
        colliders.addRing(ring.map(([u, v]) => toWorld(u, v)), 'hedge', null, 0.2);
      }
    }
  }
  for (const bxp of basins) {
    const h = gy(bxp, SG.axis);
    gb.cyl(1.25, 1.35, 0.5, 12, C.stone, bxp, h + 0.2, SG.axis);
    gb.cyl(1.05, 1.05, 0.06, 12, C.water, bxp, h + 0.43, SG.axis);
    gb.cyl(0.12, 0.18, 0.7, 6, C.stone, bxp, h + 0.7, SG.axis);
    colliders.addCircle(...toWorld(bxp, SG.axis), 1.35, 'fountain');
  }
  const smallJets = basins.map((bxp) => { const [x, z] = toWorld(bxp, SG.axis); return { x, y: y0 + gy(bxp, SG.axis) + 1.05, z, r: 0.05, v: 2.4 }; });
  ctx.reserve({ ring: [[SG.x0, SG.z0 - 1], [SG.x1 + 1, SG.z0 - 1], [SG.x1 + 1, SG.z1 + 1], [SG.x0, SG.z1 + 1]].map(([u, v]) => toWorld(u, v)) });

  // ---------------------------------------------------------------- Casino dell'Uccelliera
  // Girolamo Rainaldi's aviary (1617): a pavilion with a passage between the two gardens and
  // two wire-domed bird cages on its wings. Local x along its long side.
  {
    const ya = terrain.heightAt(ucc.x, ucc.z);
    gb.setFrame(ucc.x, ya, ucc.z, -ucc.angle);
    const L2 = ucc.len / 2, D2 = ucc.wid / 2, cw = 1.75;
    const shape = new THREE.Shape();
    shape.moveTo(-cw, -0.3); shape.lineTo(cw, -0.3); shape.lineTo(cw, 7.0); shape.lineTo(-cw, 7.0); shape.lineTo(-cw, -0.3);
    const hole = new THREE.Path();
    hole.moveTo(-1.3, -0.3); hole.lineTo(-1.3, 2.4); hole.absarc(0, 2.4, 1.3, Math.PI, 0, true); hole.lineTo(1.3, -0.3); hole.lineTo(-1.3, -0.3);
    shape.holes.push(hole);
    gb.add(new THREE.ExtrudeGeometry(shape, { depth: 2 * D2, bevelEnabled: false, curveSegments: 8 }), C.ochre, new THREE.Matrix4().makeTranslation(0, 0, -D2));
    gb.box(2 * cw + 0.5, 0.45, 2 * D2 + 0.5, C.trim, 0, 7.2, 0);
    gb.add(hipRoofGeometry(2 * cw + 0.3, 2 * D2 + 0.3, 1.3), C.roof, new THREE.Matrix4().makeTranslation(0, 7.42, 0));
    for (const sz of [-1, 1]) {
      const ry = sz > 0 ? 0 : Math.PI, fz = sz * D2;
      gb.box(2.95, 0.3, 0.12, C.trim, 0, 3.95, fz + sz * 0.04, ry);
      gb.place(new THREE.TorusGeometry(1.42, 0.13, 4, 10, Math.PI), C.trim, 0, 2.4, fz + sz * 0.03, 0, ry, 0, 1, 1, 0.6);
      for (const px of [-1.5, 1.5]) pilaster(gb, px, -0.2, 7.0, fz, ry, 0.42);
      windowAt(gb, 0, 4.7, fz, ry, 1.0, 1.4, 2);
      gb.box(0.4, 0.55, 0.2, C.trim, 0, 3.6, fz + sz * 0.08, ry);
    }
    for (const sx of [-1, 1]) {
      const wx = sx * (cw + (L2 - cw) / 2), ww = L2 - cw;
      gb.box(ww, 3.0, 2 * D2, C.ochre, wx, 1.3, 0);
      gb.box(ww + 0.35, 0.3, 2 * D2 + 0.35, C.trim, wx, 2.95, 0);
      for (const sz of [-1, 1]) {
        const ry = sz > 0 ? 0 : Math.PI, fz = sz * D2;
        gb.box(1.2, 1.7, 0.06, C.door, wx, 1.05, fz + sz * 0.03, ry);
        gb.place(halfDisc(0.6, 0.06, 8), C.door, wx, 1.9, fz + sz * 0.03, 0, ry, 0);
        gb.box(1.45, 0.14, 0.12, C.trim, wx, 0.15, fz + sz * 0.05, ry);
      }
      // wire cage on the wing, birds inside
      const dome = new THREE.SphereGeometry(1, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const uv = dome.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, 0.06 + uv.getY(i) * 0.78);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(wx, 3.1, 0), new THREE.Quaternion(), new THREE.Vector3(ww / 2 - 0.05, 2.6, D2 - 0.05));
      cage.add(dome, gb.frame.clone().multiply(m));
      gb.cyl(0.05, 0.05, 2.5, 4, C.iron, wx, 4.35, 0);
      gb.sphere(0.25, 0, C.iron, wx, 5.75, 0);
      gb.box(0.05, 0.05, 2 * D2 - 1.0, '#7a5a3a', wx, 4.3, 0);
      gb.box(ww - 0.6, 0.05, 0.05, '#7a5a3a', wx, 3.9, 0.4);
      const birds = ['#e8402f', '#2f9be0', '#f4d03f', '#3fbf5f', '#f2f2f2', '#ff8a3d'];
      for (let k = 0; k < (low ? 3 : 6); k++) {
        const bz = -D2 + 1.0 + (k / 5) * (2 * D2 - 2.0), on = k % 2;
        const bxp = on ? wx + (rnd() - 0.5) * 0.6 : wx;
        const by = on ? 3.98 : 4.38;
        const bzz = on ? 0.4 : bz;
        gb.sphere(0.13, 0, birds[k % birds.length], bxp, by + 0.1, bzz, 1, 1, 1.3);
        gb.sphere(0.08, 0, birds[(k + 2) % birds.length], bxp, by + 0.24, bzz + 0.1);
      }
    }
    colliders.addBox(ucc.x + Math.cos(ucc.angle) * (cw + (L2 - cw) / 2), ucc.z + Math.sin(ucc.angle) * (cw + (L2 - cw) / 2), L2 - cw + 0.3, 2 * D2 + 0.2, ucc.angle, 'building');
    colliders.addBox(ucc.x - Math.cos(ucc.angle) * (cw + (L2 - cw) / 2), ucc.z - Math.sin(ucc.angle) * (cw + (L2 - cw) / 2), L2 - cw + 0.3, 2 * D2 + 0.2, ucc.angle, 'building');
    for (const sx of [-1, 1]) {
      const px = ucc.x + Math.cos(ucc.angle) * sx * 1.55, pz = ucc.z + Math.sin(ucc.angle) * sx * 1.55;
      const ex = -Math.sin(ucc.angle) * D2, ez = Math.cos(ucc.angle) * D2;
      colliders.addSegment(px - ex, pz - ez, px + ex, pz + ez, 'building', null, 0.3);
    }
    ctx.reserve({ x: ucc.x, z: ucc.z, r: ucc.len / 2 + 2 });
  }

  // ---------------------------------------------------------------- Casino della Meridiana
  // Two storeys with a raised centre carrying the big sundial, facing the garden (-z).
  {
    const ym = terrain.heightAt(mer.x, mer.z);
    gb.setFrame(mer.x, ym, mer.z, -mer.angle);
    const L2 = mer.len / 2, D2 = mer.wid / 2;
    gb.box(2 * L2, 7.1, 2 * D2, C.ochre, 0, 3.3, 0);
    gb.box(2 * L2 + 0.4, 0.3, 2 * D2 + 0.4, C.trim, 0, 0.1, 0);
    gb.box(2 * L2 + 0.25, 0.22, 2 * D2 + 0.25, C.trim, 0, 3.6, 0);
    gb.box(2 * L2 + 0.55, 0.42, 2 * D2 + 0.55, C.trim, 0, 6.95, 0);
    gb.add(hipRoofGeometry(2 * L2 + 0.3, 2 * D2 + 0.3, 1.5), C.roof, new THREE.Matrix4().makeTranslation(0, 7.15, 0));
    gb.box(3.6, 3.0, 2 * D2 - 0.6, C.ochre, 0, 8.4, 0);
    gb.box(4.0, 0.35, 2 * D2 - 0.2, C.trim, 0, 10.0, 0);
    gb.add(hipRoofGeometry(4.0, 2 * D2 - 0.2, 0.9), C.roof, new THREE.Matrix4().makeTranslation(0, 10.17, 0));
    for (const sz of [-1, 1]) {
      const ry = sz < 0 ? Math.PI : 0, fz = sz * D2;
      for (const px of [-L2 + 0.3, -1.8, 1.8, L2 - 0.3]) pilaster(gb, px, 0.2, 6.75, fz, ry, 0.42);
      for (const wx of [-4.5, -3.0, 3.0, 4.5]) {
        windowAt(gb, wx, 1.1, fz, ry, 0.85, 1.8, 0);
        windowAt(gb, wx, 4.3, fz, ry, 0.85, 1.7, 1);
      }
      windowAt(gb, 0, 4.3, fz, ry, 1.0, 1.8, 2);
      if (sz < 0) {
        gb.box(1.6, 2.7, 0.08, C.trim, 0, 1.45, fz - 0.04, ry);
        gb.box(1.3, 2.5, 0.08, C.door, 0, 1.35, fz - 0.08, ry);
        gb.place(halfDisc(0.65, 0.08, 8), C.door, 0, 2.6, fz - 0.08, 0, ry, 0);
        // the sundial
        const dz = -D2 + 0.3 - 0.06;
        gb.place(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 16), C.trim, 0, 8.45, dz, Math.PI / 2, 0, 0);
        gb.place(new THREE.CylinderGeometry(1.12, 1.12, 0.06, 16), '#f7f1e1', 0, 8.45, dz - 0.03, Math.PI / 2, 0, 0);
        for (let k = 0; k <= 8; k++) {
          const f = ((k - 4) / 4) * 1.1;
          gb.box(0.05, 1.0, 0.02, k === 4 ? '#b0352a' : '#3a3530', 0.55 * Math.sin(f), 8.45 - 0.55 * Math.cos(f), dz - 0.07, 0, 0, f);
        }
        gb.sphere(0.12, 0, '#e3b33d', 0, 8.95, dz - 0.08);
        beam(gb, [0, 8.95, dz - 0.05], [0, 8.4, dz - 0.75], 0.06, 0.06, C.bronze);
      }
    }
    for (const sx of [-1, 1]) {
      const ry = sx * Math.PI / 2;
      windowAt(gb, sx * L2, 1.1, 0, ry, 0.8, 1.8, 0);
      windowAt(gb, sx * L2, 4.3, 0, ry, 0.8, 1.7, 1);
    }
    colliders.addBox(mer.x, mer.z, mer.len, mer.wid, mer.angle, 'building');
    ctx.reserve({ x: mer.x, z: mer.z, r: mer.len / 2 + 2 });
  }

  // ---------------------------------------------------------------- colliders & reservations
  frameMain();
  colliders.addRing(A.footprint, 'building');
  colliders.addBox(...toWorld(0, FZ + ST.landD / 2), 2 * (ST.landW + (ST.steps - 1) * ST.tread) + 0.4, ST.landD, ang, 'building');
  colliders.addBox(...toWorld(0, BZ - RS.depth / 2), 2 * (RS.landW + (RS.steps - 1) * RS.tread), RS.depth, ang, 'building');
  // the postcard from Piazzale del Museo Borghese: the cart on the approach between the box
  // parterres, the main front with its double staircase and loggia behind
  const dir = (u, v) => [u * ca - v * sa, u * sa + v * ca];
  photoView(ctx, 'galleria', { spot: toWorld(-1, 24), face: dir(-0.89, 0.45), cam: [...toWorld(-3, 38), 4.5], look: [...toWorld(-0.5, 8), 6.5], far: toWorld(0, 12), wide: 9 });
  ctx.reserve({ ring: offsetRing(plinth, 2).map(([u, v]) => toWorld(u, v)) });
  ctx.reserve({ ring: [[-9, FZ], [9, FZ], [9, 15.5], [-9, 15.5]].map(([u, v]) => toWorld(u, v)) });

  const mesh = gb.build(undefined, { name: 'galleria' });
  const cageMesh = cage.build(railingMaterial(), { name: 'uccelliera-cages' });
  return { meshes: [mesh, cageMesh].filter(Boolean), jets: [rearJet, ...smallJets].filter(Boolean) };
}
