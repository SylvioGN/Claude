// Casa del Cinema in the Casina delle Rose: a long two-storey villa with a ground-floor arcade and
// terrace on the garden side, the entrance with its sign facing Largo Anna Magnani, café tables
// in the garden, and a little open-air cinema theatre to the south.
import { Frame, archedPanel, archShape, hipRoofGeometry, gableGeometry, sectorRing } from './parts.js';
import { RECT } from './atlas.js';

const C = {
  wall: '#f0c98f', trim: '#f6efdf', trimShade: '#e2d6bd', plinth: '#cfc3a8', roof: '#b5532f', roofDark: '#8f3f24',
  glass: '#3a4752', shutter: '#4e6b47', door: '#4a3426', terrace: '#d9ccb2',
  parasol: '#f4ead2', parasolRim: '#b8322d', table: '#f2f2f0', chair: '#3d3d40', hedge: '#3f7a35',
  roses: ['#e05a7a', '#f28fb0', '#d8344c', '#f6c1cf'],
  stone: '#e3dac6', stoneShade: '#d2c7ae', seat: '#c0392b', wood: '#9a6a3a', black: '#1d1d20', booth: '#e3b25c',
};

function windowUnit(f, x, yb, w, h, shutters = true) {
  f.box(w + 0.24, h + 0.24, 0.1, C.trim, x, yb + h / 2, 0.05);
  f.box(w, h, 0.12, C.glass, x, yb + h / 2, 0.06);
  f.box(0.06, h, 0.14, C.trim, x, yb + h / 2, 0.07);
  f.box(w, 0.06, 0.14, C.trim, x, yb + h * 0.64, 0.07);
  f.box(w + 0.5, 0.12, 0.24, C.trim, x, yb + h + 0.24, 0.1);
  f.box(w + 0.4, 0.1, 0.2, C.trim, x, yb - 0.08, 0.1);
  if (shutters) for (const s of [-1, 1]) f.box(w / 2, h, 0.06, C.shutter, x + s * (w * 0.75 + 0.14), yb + h / 2, 0.04);
}

export function buildCasa(ctx, gb, decals) {
  const A = ctx.MAP.ANCHORS.casacinema;
  const a = A.angle < -Math.PI / 2 ? A.angle + Math.PI : A.angle > Math.PI / 2 ? A.angle - Math.PI : A.angle;
  const ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux; // u: east along the building, v: south
  // the four main corners (the small notch on the south side is ignored)
  const fp = A.footprint;
  const corners = fp.length === 8 ? [fp[0], fp[1], fp[2], fp[7]] : fp;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, z] of corners) {
    const u = x * ux + z * uz, v = x * vx + z * vz;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const L = u1 - u0, D = v1 - v0;
  const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  const cx = um * ux + vm * vx, cz = um * uz + vm * vz;
  const T = ctx.terrain;
  const y0 = T.heightAt(cx, cz);
  const f = new Frame(gb, cx, y0, cz, Math.atan2(vx, vz)); // local +z = south (garden), +x = east

  const base = 0.3, AD = 3.0, G = 4.3, top = 8.1;
  const zN = -D / 2, zS = D / 2, zB = zS - AD; // north face, south face, arcade back wall
  const p = 0.75, n = 9, w = (L - (n + 1) * p) / n;
  const bayX = (i) => -L / 2 + p + w / 2 + i * (w + p);

  // plinth, main block, cornices and roof
  f.box(L + 0.5, 1.2, D + 0.5, C.plinth, 0, base - 0.6, 0);
  f.box(L, top, zB - zN, C.wall, 0, base + top / 2, (zN + zB) / 2);
  f.box(L + 0.24, 0.24, zB - zN + 0.24, C.trim, 0, base + G, (zN + zB) / 2);
  f.box(L + 0.56, 0.36, zB - zN + 0.56, C.trim, 0, base + top, (zN + zB) / 2);
  f.add(hipRoofGeometry(L + 0.9, zB - zN + 0.9, 2.3), C.roof, 0, base + top + 0.18, (zN + zB) / 2);
  for (const x of [-L * 0.3, L * 0.3]) {
    f.box(0.7, 2.0, 0.7, C.wall, x, base + top + 1.9, (zN + zB) / 2 - 1.2);
    f.box(0.9, 0.16, 0.9, C.trim, x, base + top + 2.95, (zN + zB) / 2 - 1.2);
  }
  for (const sx of [-1, 1]) for (const z of [zN, zB]) f.box(0.6, top, 0.6, C.trim, sx * (L / 2 - 0.25), base + top / 2, z + (z === zN ? 0.25 : -0.25));

  // garden side: arcade of nine arches with a balustraded terrace on top
  const holes = [];
  for (let i = 0; i < n; i++) holes.push({ x: bayX(i), w, h: 3.3, y0: 0 });
  f.extrude(archedPanel(-L / 2, L / 2, -0.3, G, holes), 0.55, C.trim, 0, base, zS - 0.55);
  f.box(L, 0.3, AD, C.trimShade, 0, base + G - 0.15, zB + AD / 2);
  f.box(L, 0.06, AD, C.terrace, 0, base + G + 0.03, zB + AD / 2);
  const rz = zS - 0.25;
  f.box(L, 0.16, 0.42, C.trim, 0, base + G + 0.08, rz);
  f.box(L + 0.1, 0.14, 0.42, C.trim, 0, base + G + 0.95, rz);
  for (let x = -L / 2 + 0.3; x < L / 2 - 0.2; x += 0.42) f.box(0.14, 0.72, 0.14, C.trim, x, base + G + 0.52, rz);
  for (let i = 0; i <= n; i++) f.box(0.42, 1.1, 0.46, C.trim, -L / 2 + p / 2 + i * (w + p), base + G + 0.55, rz);
  const back = f.child(0, base, zB, 0);
  for (let i = 0; i < n; i++) {
    back.box(w * 0.62 + 0.24, 2.94, 0.08, C.trim, bayX(i), 1.47, 0.04);
    back.box(w * 0.62, 2.8, 0.1, C.glass, bayX(i), 1.4, 0.05);
    windowUnit(back, bayX(i), G + 0.3, 1.1, 2.1, true);
  }

  // north (entrance) side: projecting centre with pediment, arched door, sign and banners
  const north = f.child(0, base, zN, Math.PI);
  const cw = 3 * (w + p) + p * 0.5;
  north.box(cw, top, 0.36, C.wall, 0, top / 2, 0.18);
  north.box(cw + 0.2, 0.24, 0.6, C.trim, 0, G, 0.3);
  north.box(cw + 0.4, 0.36, 0.8, C.trim, 0, top, 0.4);
  north.add(gableGeometry(cw + 0.4, 1.5, 0.5), C.trim, 0, top + 0.18, 0.45);
  north.add(gableGeometry(cw - 0.6, 1.05, 0.52), C.wall, 0, top + 0.32, 0.47);
  for (const s of [-1, 1]) north.box(0.55, top, 0.5, C.trim, s * (cw / 2 - 0.2), top / 2, 0.36);
  north.extrude(archShape(2.5, 3.2), 0.08, C.trim, 0, 0, 0.36);
  north.extrude(archShape(1.9, 2.85), 0.1, C.door, 0, 0, 0.38);
  north.box(0.05, 1.95, 0.12, C.trim, 0, 0.98, 0.46);
  north.box(3.2, 0.5, 0.6, C.trimShade, 0, 0.08, 0.8);
  north.box(6.6, 0.84, 0.1, C.trim, 0, G - 0.62, 0.41);
  decals.quad(north, 6.3, 0.69, RECT.casaSign, 0, G - 0.62, 0.465);
  for (const s of [-1, 1]) {
    north.box(0.08, 0.08, 0.5, C.black, s * (cw / 2 - 0.2), G + 3.0, 0.75);
    north.box(1.0, 0.06, 0.06, C.black, s * (cw / 2 - 0.2), G + 2.98, 1.0);
    decals.quad(north, 0.84, 2.1, RECT.banner, s * (cw / 2 - 0.2), G + 1.9, 1.02);
  }
  for (let i = 0; i < n; i++) {
    const x = bayX(i), dz = Math.abs(i - 4) <= 1 ? 0.36 : 0;
    if (i !== 4) windowUnit(north.child(0, 0, dz), x, 1.3, 1.1, 1.9);
    windowUnit(north.child(0, 0, dz), x, G + 0.75, 1.1, 1.9, i !== 4);
  }
  north.box(2.2, 0.14, 0.9, C.trim, 0, G + 0.62, 0.8);
  for (let x = -0.95; x <= 0.96; x += 0.38) north.box(0.1, 0.6, 0.1, C.trim, x, G + 0.95, 1.18);
  north.box(2.2, 0.1, 0.12, C.trim, 0, G + 1.28, 1.18);

  // short sides
  for (const s of [-1, 1]) {
    const side = f.child(s * L / 2, base, (zN + zB) / 2, s * Math.PI / 2);
    for (const z of [-0.22, 0.22]) {
      const x = z * (zB - zN) * -s;
      windowUnit(side, x, 1.3, 1.1, 1.9);
      windowUnit(side, x, G + 0.75, 1.1, 1.9);
    }
  }

  // café tables under parasols in the garden in front of the arcade (clear of the memorial)
  const cafe = f.child(0, 0, zS + 1.9, 0);
  for (const x of [-0.4, 3.2, 11.4]) {
    const yh = T.heightAt(...xz(cafe.world(x, 0, 0))) - y0;
    cafe.cyl(0.42, 0.42, 0.06, 10, C.table, x, yh + 0.75, 0);
    cafe.cyl(0.05, 0.05, 2.5, 5, C.chair, x, yh + 1.25, 0);
    cafe.cone(1.15, 0.5, 8, C.parasol, x, yh + 2.55, 0);
    cafe.cyl(1.15, 1.15, 0.14, 8, C.parasolRim, x, yh + 2.26, 0);
    for (const s of [-1, 1]) {
      cafe.box(0.42, 0.06, 0.42, C.chair, x + s * 0.75, yh + 0.45, 0);
      cafe.box(0.06, 0.5, 0.42, C.chair, x + s * 0.95, yh + 0.7, 0);
      cafe.cyl(0.03, 0.03, 0.45, 4, C.chair, x + s * 0.75, yh + 0.22, 0);
    }
    const c = cafe.world(x, 0, 0);
    ctx.colliders.addCircle(c.x, c.z, 0.9, 'bench');
  }
  const roses = f.child(-L / 2 - 1.3, 0, 0, 0);
  const rnd = ctx.rng('casa-roses');
  for (const z of [-3.4, -1.2, 1.2, 3.4]) {
    const yh = T.heightAt(...xz(roses.world(0, 0, z))) - y0;
    roses.box(0.9, 0.7, 1.8, C.hedge, 0, yh + 0.3, z);
    for (let k = 0; k < 7; k++) roses.sphere(0.13, 0, C.roses[k % 4], rnd.range(-0.38, 0.38), yh + 0.66 + rnd() * 0.08, z + rnd.range(-0.8, 0.8));
  }

  const ring = [[-L / 2 - 1.8, zN], [L / 2, zN], [L / 2, zS], [-L / 2 - 1.8, zS]].map(([x, z]) => xz(f.world(x, 0, z)));
  ctx.colliders.addRing(ring, 'building', { name: 'casacinema' });
  const nc = xz(f.world(0, 0, zN - 0.7));
  ctx.colliders.addBox(nc[0], nc[1], cw, 1.4, a, 'building');
  ctx.reserve({ ring: [[-L / 2 - 2.5, zN - 1.5], [L / 2 + 1.5, zN - 1.5], [L / 2 + 1.5, zS + 3.4], [-L / 2 - 2.5, zS + 3.4]].map(([x, z]) => xz(f.world(x, 0, z))) });
  return { x: cx, z: cz, y: y0, angle: a };
}

// The open-air cinema in the garden: stone tiers with red seats facing a big screen, and a
// little projection booth at the back.
export function buildTheatre(ctx, gb, decals, at = { x: 113.6, z: 147.6 }) {
  const T = ctx.terrain;
  let y0 = -Infinity, ymin = Infinity;
  for (let dx = -9; dx <= 9; dx += 3) for (let dz = -9; dz <= 9; dz += 3) {
    const h = T.heightAt(at.x + dx, at.z + dz);
    y0 = Math.max(y0, h); ymin = Math.min(ymin, h);
  }
  y0 += 0.05;
  const f = new Frame(gb, at.x, y0, at.z, Math.PI / 2); // screen to the west, seats facing it from the east
  const sink = y0 - ymin + 0.6;
  const a0 = -1.25, a1 = 1.25, rows = 4, step = 1.1, r0 = 4.4;

  f.prism(sectorRing(0, r0, -Math.PI / 2, Math.PI / 2, 10), -sink, 0.02, C.stoneShade);
  for (let k = 0; k < rows; k++) {
    const ra = r0 + k * step, rb = ra + step, h = 0.42 * (k + 1);
    f.prism(sectorRing(ra, rb, a0, a1, 12), -sink, h, k % 2 ? C.stone : C.stoneShade);
    f.prism(sectorRing(ra + 0.12, ra + 0.6, a0 + 0.04, a1 - 0.04, 12), h, h + 0.1, C.seat);
  }
  const rOut = r0 + rows * step;
  // a clipped hedge closes the back, like an Italian garden theatre
  f.prism(sectorRing(rOut, rOut + 0.8, a0 - 0.12, a1 + 0.12, 12), -sink, 2.3, C.hedge);
  for (const s of [-1, 1]) f.prism(sectorRing(r0 - 0.2, rOut + 0.8, s * (a1 + 0.02), s * (a1 + 0.16), 2), -sink, 1.2, C.hedge);
  // screen with its frame, posts and back struts; a low stage in front
  const sz = -2.9;
  for (const s of [-1, 1]) {
    f.box(0.26, 5.6, 0.26, C.black, s * 3.75, 2.8 - 0.3, sz - 0.1);
    f.beam([s * 3.75, 4.8, sz - 0.2], [s * 3.75, -0.2, sz - 2.2], 0.16, 0.16, C.black);
  }
  f.box(7.5, 3.1, 0.14, C.black, 0, 3.15, sz);
  decals.quad(f, 7.2, 2.81, RECT.screen, 0, 3.15, sz + 0.075);
  f.box(8.6, 0.5 + sink, 2.4, C.wood, 0, (0.5 - sink) / 2, sz + 1.25);
  for (let x = -4; x <= 4.01; x += 0.6) f.box(0.04, 0.02, 2.4, '#7b522b', x, 0.51, sz + 1.25);
  // projection booth
  const bz = rOut + 1.3;
  f.box(2.2, 2.6 + sink, 1.8, C.booth, 0, (2.6 - sink) / 2, bz);
  f.box(2.6, 0.2, 2.2, C.roof, 0, 2.7, bz);
  f.box(0.7, 0.5, 0.1, C.glass, 0, 1.9, bz - 0.92);
  f.cyl(0.18, 0.18, 0.5, 8, C.black, 0, 1.9, bz - 1.05, Math.PI / 2);
  // string of lights from the screen posts to the booth
  for (const s of [-1, 1]) {
    const pa = [s * 3.75, 5.3, sz - 0.1], pb = [s * 0.9, 2.8, bz];
    for (let t = 0.08; t < 0.95; t += 0.09) {
      const sag = Math.sin(t * Math.PI) * 0.7;
      f.sphere(0.09, 0, t * 11 % 2 < 1 ? '#ffe28a' : '#ffb35c', pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t - sag, pa[2] + (pb[2] - pa[2]) * t);
    }
  }

  // colliders: seating block, screen, stage and booth
  const seats = sectorRing(r0 - 0.1, rOut + 0.85, a0 - 0.16, a1 + 0.16, 8).map(([x, z]) => xz(f.world(x, 0, z)));
  ctx.colliders.addRing(seats, 'wall', { name: 'theatre' });
  const s0 = f.world(-4.3, 0, sz + 0.1), s1 = f.world(4.3, 0, sz + 0.1);
  ctx.colliders.addSegment(s0.x, s0.z, s1.x, s1.z, 'wall', null, 0.4);
  const st = f.world(0, 0, sz + 1.25), bo = f.world(0, 0, bz);
  ctx.colliders.addBox(st.x, st.z, 2.4, 8.6, 0, 'wall');
  ctx.colliders.addBox(bo.x, bo.z, 1.8, 2.2, 0, 'building');
  ctx.reserve({ x: at.x + 3, z: at.z, r: 11 });
  return { x: at.x, z: at.z, y: y0 };
}

function xz(v) { return [v.x, v.z]; }
