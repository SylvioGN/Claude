// Piazza di Siena: the oval arena of 1792 laid out like an ancient circus. A mown show-jumping
// field inside a sandy riding track, grassy terraces with a travertine kerb all around, a ring of
// tall umbrella pines and entrances on the long axis (and two on the sides) so the cart can do laps.
import * as THREE from 'three';
import { GeoBuilder } from '../../core/util.js';
import { SURF } from '../../core/terrain.js';
import { C, Frame, Tris, flag } from './kit.js';

// Stadium fitted to the two OSM loop paths (inner loop = offset 0, outer loop ~ offset 5.7).
const ST = { x: 100.32, z: -33.8, angle: 0.711, A: 43.13, B: 16.33 };
const CL = ST.A - ST.B;                       // half-length of the straight sides
const PER = 4 * CL + 2 * Math.PI * ST.B;      // perimeter of the offset-0 loop

// Offsets (distance outside the inner loop) of the arena rings.
const FIELD = -4.5;        // mown grass inside this
const BANK0 = 1.6;         // foot of the terraces (travertine kerb)
const BANK1 = 11;          // outer foot of the terraces
const PROFILE = [          // terrace cross-section (offset, height), inner -> outer; the walk on top is the OSM outer loop
  [BANK0, 0], [BANK0, 0.6], [2.75, 0.6], [2.75, 1.2], [3.9, 1.2], [3.9, 1.8], [4.4, 1.8], [7.4, 1.8], [BANK1, 0],
];
const PROFILE_COLORS = [C.travertine, C.grassLight, C.grassDark, C.grassLight, C.grassDark, C.grassLight, C.gravel, C.grass];

// Core point and outward normal for arc length s around the offset-0 loop (local u/v).
function along(s) {
  s = ((s % PER) + PER) % PER;
  const B = ST.B;
  if (s < 2 * CL) return [-CL + s, 0, 0, 1];
  s -= 2 * CL;
  if (s < Math.PI * B) { const t = Math.PI / 2 - s / B; return [CL, 0, Math.cos(t), Math.sin(t)]; }
  s -= Math.PI * B;
  if (s < 2 * CL) return [CL - s, 0, 0, -1];
  s -= 2 * CL;
  const t = -Math.PI / 2 - s / B;
  return [-CL, 0, Math.cos(t), Math.sin(t)];
}
function ringUV(s, d) {
  const [cu, cv, nu, nv] = along(s);
  return [cu + nu * (ST.B + d), cv + nv * (ST.B + d)];
}
// Signed distance from the inner loop and arc position, for a local (u, v).
function stadiumLocal(u, v) {
  const cu = Math.max(-CL, Math.min(CL, u));
  const d = Math.hypot(u - cu, v) - ST.B;
  let s;
  if (u > CL) s = 2 * CL + (Math.PI / 2 - Math.atan2(v, u - CL)) * ST.B;
  else if (u < -CL) { let t = Math.atan2(v, u + CL); if (t > 0) t -= 2 * Math.PI; s = 4 * CL + Math.PI * ST.B + (-Math.PI / 2 - t) * ST.B; }
  else if (v >= 0) s = u + CL;
  else s = 2 * CL + Math.PI * ST.B + (CL - u);
  return { d, s: ((s % PER) + PER) % PER };
}
// Arc-length samples between s0 and s1: denser on the round ends.
function samples(s0, s1) {
  const out = [s0];
  let s = s0;
  while (s < s1) {
    const [, , nu] = along(s);
    s += Math.abs(nu) > 0.01 ? 1.6 : 4;
    out.push(Math.min(s, s1));
  }
  return out;
}

export function buildSiena(ctx) {
  const { terrain, colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const f = new Frame(new GeoBuilder(), ST.x, ST.z, ST.angle);
  const ground = new Frame(new GeoBuilder(), ST.x, ST.z, ST.angle);
  const H = (u, v) => { const [x, z] = f.w(u, v); return terrain.heightAt(x, z); };
  const P3 = (u, y, v) => { const [x, z] = f.w(u, v); return [x, terrain.heightAt(x, z) + y, z]; };
  const at = (x, z) => { const [u, v] = f.local(x, z); return stadiumLocal(u, v); };

  // Entrances: both ends of the long axis plus the two OSM paths that cross the terraces mid-side.
  const gaps = [
    { s: 2 * CL + Math.PI * ST.B / 2, w: 7.5 },                 // east (round end)
    { s: 4 * CL + Math.PI * ST.B * 1.5, w: 19 },                // west: wide open towards Viale Pietro Canonica
    { s: at(87.55, -19.45).s, w: 6.5 },
    { s: at(114.8, -46.65).s, w: 6.5 },
  ].sort((a, b) => a.s - b.s);
  // half-width in arc length at the inner foot (round ends: widths are measured at BANK0)
  for (const g of gaps) {
    const round = Math.abs(along(g.s)[2]) > 0.01;
    g.h = (g.w / 2) * (round ? ST.B / (ST.B + BANK0) : 1);
  }
  const arcs = gaps.map((g, i) => {
    const n = gaps[(i + 1) % gaps.length];
    let s1 = n.s - n.h;
    if (s1 < g.s + g.h) s1 += PER;
    return [g.s + g.h, s1];
  });

  // --- ground: mown field with stripes, white line, sand track and the sandy entrance ramps
  const field = [new Tris(), new Tris()];
  const R = ST.B + FIELD, U = CL + R;
  const half = (u) => (Math.abs(u) <= CL ? R : Math.sqrt(Math.max(0, R * R - (Math.abs(u) - CL) ** 2)));
  const stripes = 18, sw = (2 * U) / stripes;
  for (let i = 0; i < stripes; i++) {
    const u0 = -U + i * sw, u1 = u0 + sw;
    const n = Math.abs(u0) > CL || Math.abs(u1) > CL ? 5 : 1;
    for (let k = 0; k < n; k++) {
      const ua = u0 + ((u1 - u0) * k) / n, ub = u0 + ((u1 - u0) * (k + 1)) / n;
      const ha = half(ua), hb = half(ub);
      field[i % 2].quad(P3(ua, 0.06, -ha), P3(ua, 0.06, ha), P3(ub, 0.06, hb), P3(ub, 0.06, -hb));
    }
  }
  ground.gb.add(field[0].geometry(), '#7db24c');
  ground.gb.add(field[1].geometry(), '#91c35b');

  const band = (t, s0, s1, d0, y0, d1, y1) => {
    const ss = samples(s0, s1);
    for (let i = 1; i < ss.length; i++) {
      const [au, av] = ringUV(ss[i - 1], d0), [bu, bv] = ringUV(ss[i - 1], d1);
      const [cu, cv] = ringUV(ss[i], d0), [du, dv] = ringUV(ss[i], d1);
      const a = P3(au, y0, av), b = P3(bu, y1, bv), c = P3(cu, y0, cv), d = P3(du, y1, dv);
      t.tri(a, b, c); t.tri(c, b, d);
    }
  };
  const track = new Tris(), line = new Tris();
  band(track, 0, PER, FIELD, 0.05, BANK0, 0.05);
  band(line, 0, PER, FIELD - 0.12, 0.07, FIELD + 0.18, 0.07);
  for (const g of gaps) {
    const round = Math.abs(along(g.s)[2]) > 0.01;
    band(track, g.s - g.h, g.s + g.h, BANK0, 0.05, round ? BANK1 + 5 : BANK1, 0.05);
  }
  ground.gb.add(track.geometry(), '#dcc28c');
  ground.gb.add(line.geometry(), C.white);

  // --- terraces between the entrances, with travertine end walls at each cut
  const bank = PROFILE_COLORS.map(() => new Tris());
  const caps = new Tris();
  const profile2 = PROFILE.map(([d, y]) => new THREE.Vector2(d, y));
  const capFaces = THREE.ShapeUtils.triangulateShape(profile2, []);
  const cap = (s, sign) => {
    const [cu, cv, nu, nv] = along(s);
    const pts = PROFILE.map(([d, y]) => P3(cu + nu * (ST.B + d), y, cv + nv * (ST.B + d)));
    const [x0, z0] = f.w(0, 0), [tx, tz] = f.w(nv, -nu);
    const dir = [(tx - x0) * sign, 0, (tz - z0) * sign];
    for (const [a, b, c] of capFaces) caps.facing(pts[a], pts[b], pts[c], dir);
  };
  for (const [s0, s1] of arcs) {
    for (let k = 1; k < PROFILE.length; k++) {
      const [d0, y0] = PROFILE[k - 1], [d1, y1] = PROFILE[k];
      band(bank[k - 1], s0, s1, d0, y0, d1, y1);
    }
    cap(s0, -1); cap(s1, 1);
    // gate pillars with ball finials on the kerb at each cut
    for (const [s, back] of [[s0, 0.55], [s1, -0.55]]) {
      const [u, v] = ringUV(s + back, BANK0 + 0.35);
      f.box(0.75, 1.5, 0.75, C.travertine, u, H(u, v), v);
      f.box(0.9, 0.15, 0.9, C.travertineShade, u, H(u, v) + 1.5, v);
      f.sphere(0.32, C.travertine, u, H(u, v) + 1.95, v);
    }
    // colliders: inner kerb, outer foot and the cut walls
    const inner = samples(s0, s1).map((s) => f.w(...ringUV(s, BANK0)));
    const outer = samples(s0, s1).map((s) => f.w(...ringUV(s, BANK1)));
    colliders.addPolyline(inner, false, 'wall', null, 0.3);
    colliders.addPolyline(outer, false, 'wall', null, 0.3);
    colliders.addSegment(...inner[0], ...outer[0], 'wall', null, 0.3);
    colliders.addSegment(...inner[inner.length - 1], ...outer[outer.length - 1], 'wall', null, 0.3);
  }
  bank.forEach((t, i) => f.gb.add(t.geometry(), PROFILE_COLORS[i]));
  f.gb.add(caps.geometry(), C.travertineShade);

  // --- show-jumping course: striped poles between white wings, flower boxes, a water jump
  const jumps = [
    { u: -30, v: 4, ry: 0.1, c: C.red, type: 'vertical' },
    { u: -18, v: -5.5, ry: -0.2, c: C.blue, type: 'oxer' },
    { u: -5, v: 5.5, ry: 0.05, c: C.blue, type: 'wall' },
    { u: 7, v: -5, ry: 0.15, c: C.yellow, type: 'triple' },
    { u: 19, v: 5, ry: -0.1, c: C.green, type: 'vertical' },
    { u: 31, v: -2, ry: 0.55, c: C.red, type: 'oxer' },
    { u: 6, v: 6, ry: 0, c: C.orange, type: 'vertical' },
  ];
  const flowerCols = [C.red, C.yellow, '#f5f0ff', '#e85d9a'];
  const rnd = ctx.rng('siena-jumps');
  for (const j of jumps) {
    const width = 4.2, y = H(j.u, j.v);
    const cs = Math.cos(j.ry), sn = Math.sin(j.ry);
    // poles run along local v (across the riding line), rotated by ry
    const P = (du, dv) => [j.u + du * cs + dv * sn, j.v - du * sn + dv * cs];
    const rows = j.type === 'oxer' ? [-0.6, 0.6] : j.type === 'triple' ? [-0.8, 0, 0.8] : [0];
    rows.forEach((du, ri) => {
      for (const side of [-1, 1]) {
        const [wu, wv] = P(du, side * (width / 2 + 0.2));
        const wingH = j.type === 'triple' ? 0.9 + ri * 0.4 : 1.7;
        f.box(0.16, wingH, 0.62, C.white, wu, y, wv, j.ry);
        f.box(0.22, 0.12, 0.68, j.c, wu, y + wingH, wv, j.ry);
        f.box(0.62, wingH * 0.8, 0.07, C.white, wu, y, wv, j.ry);
      }
      if (j.type === 'wall' && ri === 0) {
        for (let k = 0; k < 6; k++) {
          const [bu, bv] = P(du, -width / 2 + 0.35 + k * 0.7);
          f.box(0.5, 0.55, 0.68, k % 2 ? C.white : j.c, bu, y, bv, j.ry);
          f.box(0.5, 0.5, 0.68, k % 2 ? j.c : C.white, bu, y + 0.55, bv, j.ry);
        }
        return;
      }
      const heights = j.type === 'triple' ? [0.5 + ri * 0.3] : [0.55, 1.05, 1.45];
      for (const ph of heights) {
        const seg = 6, L = width / seg;
        for (let k = 0; k < seg; k++) {
          const [pu, pv] = P(du, -width / 2 + L * (k + 0.5));
          f.put(new THREE.CylinderGeometry(0.075, 0.075, L, 6, 1, true), k % 2 ? C.white : j.c, pu, y + ph, pv, Math.PI / 2, j.ry);
        }
      }
    });
    // flower boxes at the foot of the wings
    if (hi) {
      for (const side of [-1, 1]) {
        const [bu, bv] = P(rows[rows.length - 1] + 0.75, side * (width / 2 - 0.4));
        f.box(0.5, 0.3, 1.2, '#2f6b35', bu, y, bv, j.ry);
        for (let k = 0; k < 3; k++) {
          const [fu, fv] = P(rows[rows.length - 1] + 0.75, side * (width / 2 - 0.4) + (k - 1) * 0.38);
          f.sphere(0.22, rnd.pick(flowerCols), fu, y + 0.42, fv, 1, 0.75, 1);
        }
      }
    }
    const first = P(rows[0], 0), last = P(rows[rows.length - 1], 0);
    const e = width / 2 + 0.3;
    for (const [cu, cv] of [first, last]) {
      const [ax, az] = f.w(cu - e * sn, cv - e * cs), [bx, bz] = f.w(cu + e * sn, cv + e * cs);
      colliders.addSegment(ax, az, bx, bz, 'fence', null, 0.35);
    }
  }
  // water jump in the middle: a shallow blue tray behind a little brush hedge (drive through it!)
  const water = { u: -12, v: 1.5, l: 2.6, w: 4.6 };
  {
    const y = H(water.u, water.v);
    ground.box(water.l + 0.3, 0.08, water.w + 0.3, C.white, water.u, y + 0.02, water.v);
    ground.box(water.l, 0.06, water.w, '#58ade6', water.u, y + 0.06, water.v);
    f.box(0.5, 0.5, water.w, '#4f8a3a', water.u - water.l / 2 - 0.4, y, water.v);
    f.box(0.6, 0.12, water.w + 0.2, C.white, water.u - water.l / 2 - 0.4, y, water.v);
  }

  // --- forecourt flags at the west entrance (Italy and Rome)
  for (const [v, stripes] of [[-10, ['#2e9a48', '#f7f7f2', '#d23a32']], [10, ['#8c1d2c', '#e8b030']]]) {
    const u = -CL - ST.B - BANK1 - 4;
    flag(f, u, H(u, v), v, 8, stripes, { ry: Math.PI });
    const [x, z] = f.w(u, v);
    colliders.addCircle(x, z, 0.35, 'lamp');
  }

  // --- the ring of umbrella pines: the OSM trees on the terraces plus fill-ins, then two outer rows
  const inGap = (s, pad) => gaps.some((g) => {
    let ds = Math.abs(s - g.s); ds = Math.min(ds, PER - ds);
    return ds < g.h + pad;
  });
  const pines = [];
  for (const p of ctx.MAP.POIS) {
    if (p.k !== 'tree') continue;
    const q = at(p.x, p.z);
    if (q.d > 1.5 && q.d < 6 && !inGap(q.s, 2)) pines.push([p.x, p.z]);
  }
  const prng = ctx.rng('siena-pines');
  for (let s = 0; s < PER; s += 0.5) {
    if (inGap(s, 2.6)) continue;
    const [u, v] = ringUV(s, 3.0 + prng.range(-0.4, 0.4));
    const [x, z] = f.w(u, v);
    if (pines.some(([px, pz]) => Math.hypot(px - x, pz - z) < 7.2)) continue;
    pines.push([x, z]);
  }
  // a second, staggered ring on the outer slope of the terraces
  const inner = pines.length;
  for (let s = 3.6; s < PER; s += 0.5) {
    if (inGap(s, 3.5)) continue;
    const [x, z] = f.w(...ringUV(s, 9.0 + prng.range(-0.5, 0.5)));
    if (pines.some(([px, pz], i) => Math.hypot(px - x, pz - z) < (i < inner ? 6.2 : 8.5))) continue;
    pines.push([x, z]);
  }
  for (const [x, z] of pines) ctx.plant('umbrellaPine', x, z, { scale: prng.range(1.0, 1.25), ry: prng.range(0, 6.28) });
  // outer row on the lawns around the arena, kept off the paths
  for (let s = 4; s < PER; s += 11.5) {
    const [u, v] = ringUV(s, 13.5 + prng.range(-1, 1.5));
    const [x, z] = f.w(u, v);
    const np = terrain.nearestPath(x, z);
    if (np && np.d < np.w / 2 + 3) continue;
    if (!terrain.isInside(x, z) || terrain.surfaceAt(x, z) === SURF.PLAZA || inGap(s, 4)) continue;
    ctx.plant('umbrellaPine', x, z, { scale: prng.range(0.9, 1.15), ry: prng.range(0, 6.28) });
  }

  // the photo spot: Viale Pietro Canonica on the long axis, looking in through the main entrance
  const stop = ctx.game?.stops?.find((s) => s.id === 'siena');
  if (stop) [stop.spotX, stop.spotZ] = f.w(-(CL + ST.B + 13.3), 0);

  // keep random trees and props off the arena and its terraces
  const outline = samples(0, PER).map((s) => f.w(...ringUV(s, BANK1 + 1)));
  ctx.reserve({ ring: outline });
  ctx.reserve({ ring: ctx.MAP.ANCHORS.siena.footprint });

  const groundMesh = ground.gb.build(undefined, { castShadow: false, receiveShadow: true, name: 'siena-ground' });
  const mesh = f.gb.build(undefined, { name: 'siena' });
  const group = new THREE.Group();
  group.name = 'piazza-di-siena';
  group.add(groundMesh, mesh);

  // splash when the cart crosses the water jump
  let wasIn = false;
  const [wx, wz] = f.w(water.u, water.v);
  return {
    group,
    update() {
      const c = ctx.cart?.position;
      if (!c) return;
      const [u, v] = f.local(c.x, c.z);
      const inside = Math.abs(u - water.u) < water.l / 2 + 0.6 && Math.abs(v - water.v) < water.w / 2;
      if (inside && !wasIn && Math.abs(ctx.cart.speed || 0) > 1) ctx.events.emit('splash', { x: wx, z: wz });
      wasIn = inside;
    },
  };
}
