// Fortezzuola (Museo Pietro Canonica), Casina dell'Orologio and the Globe Theatre.
import * as THREE from 'three';
import { GeoBuilder, buildGeometry, mats } from '../../core/util.js';
import { C, Frame, opening, merlons, statue, horse, hipRoofGeometry, pyramidGeometry, archRing, polyShape } from './kit.js';

const anchorFrame = (ctx, key) => {
  const a = ctx.MAP.ANCHORS[key];
  return new Frame(new GeoBuilder(), a.x, a.z, a.angle || 0, ctx.terrain.heightAt(a.x, a.z));
};

// A walled block u0..u1 x v0..v1 up to height h with plinth, cornice and optional merlons.
function block(f, u0, u1, v0, v1, h, wall, { plinth = C.travertineShade, cornice = C.travertine, crenel = null, edges = null } = {}) {
  const w = u1 - u0, d = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  f.box(w, h, d, wall, cu, 0, cv);
  if (plinth) f.box(w + 0.16, 0.6, d + 0.16, plinth, cu, 0, cv);
  if (cornice) f.box(w + 0.3, 0.28, d + 0.3, cornice, cu, h - 0.28, cv);
  if (crenel) {
    const e = edges || ['+v', '-v', '+u', '-u'];
    const o = 0.12;
    if (e.includes('+v')) merlons(f, u0 - o, v1 + o - 0.22, u1 + o, v1 + o - 0.22, h, crenel.color, crenel);
    if (e.includes('-v')) merlons(f, u0 - o, v0 - o + 0.22, u1 + o, v0 - o + 0.22, h, crenel.color, crenel);
    if (e.includes('+u')) merlons(f, u1 + o - 0.22, v0 - o, u1 + o - 0.22, v1 + o, h, crenel.color, crenel);
    if (e.includes('-u')) merlons(f, u0 - o + 0.22, v0 - o, u0 - o + 0.22, v1 + o, h, crenel.color, crenel);
  }
}

// ---------------------------------------------------------------------------------------------
// Museo Pietro Canonica, "La Fortezzuola": the Borghese hen house turned into a little castle in
// the 1790s. Rose stucco, square merlons, a tower on the corner, a walled sculpture garden.
export function buildFortezzuola(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const f = anchorFrame(ctx, 'fortezzuola');
  const crenel = { color: C.rose, capColor: C.travertine, w: 0.62, h: 0.72, gap: 0.5, t: 0.42 };

  // main museum block (two storeys), side wings and the garden wall, all crenellated
  block(f, -11.4, -1.0, -10.4, 9.9, 7.4, C.rose, { crenel });
  f.put(hipRoofGeometry(9.2, 19.0, 1.5), C.roofTile, -6.2, 7.4, -0.25);
  f.box(10.6, 0.14, 20.5, C.travertine, -6.2, 3.7, -0.25);                       // string course
  block(f, -1.0, 10.5, 6.9, 9.9, 5.0, C.rose, { crenel, edges: ['+v', '-v'] });
  block(f, -1.0, 10.6, -10.4, -7.3, 5.0, C.rose, { crenel, edges: ['+v', '-v', '+u'] });
  f.put(hipRoofGeometry(11.0, 2.4, 0.8), C.roofTile, 4.75, 5.0, 8.4);
  f.put(hipRoofGeometry(11.0, 2.4, 0.8), C.roofTile, 4.8, 5.0, -8.85);

  // garden wall with an iron gate you can peek through
  const gw = 2.4, gv = -1.2, wallH = 3.9;
  const segs = [[-7.3, gv - gw / 2 - 0.4], [gv + gw / 2 + 0.4, 5.6]];
  for (const [a, b] of segs) {
    f.box(0.6, wallH, b - a, C.rose, 10.25, 0, (a + b) / 2);
    f.box(0.75, 0.6, b - a, C.travertineShade, 10.25, 0, (a + b) / 2);
    merlons(f, 10.25, a, 10.25, b, wallH, C.rose, crenel);
  }
  for (const s of [-1, 1]) f.box(0.9, wallH + 0.9, 0.8, C.roseShade, 10.25, 0, gv + s * (gw / 2 + 0.4));
  f.box(0.6, 0.5, gw + 0.8, C.rose, 10.25, wallH - 0.5, gv);
  merlons(f, 10.25, gv - gw / 2 - 0.4, 10.25, gv + gw / 2 + 0.4, wallH, C.rose, crenel);
  f.relief(archRing(gw, 3.2, 0.25), 0.66, C.travertine, 10.25, 0, gv, Math.PI / 2);
  for (let k = 0; k <= 7; k++) f.box(0.07, 3.1, 0.07, C.iron, 10.25, 0, gv - gw / 2 + 0.15 + k * ((gw - 0.3) / 7));
  f.box(0.08, 0.08, gw, C.iron, 10.25, 1.2, gv);
  f.box(0.08, 0.08, gw, C.iron, 10.25, 2.6, gv);

  // the tower with corbels and a jutting crenellated top
  const tu = 11.8, tv = 7.65, tw = 3.8, td = 4.9, th = 10.6;
  f.box(tw + 0.5, 1.4, td + 0.5, C.roseShade, tu, 0, tv);
  f.box(tw, th, td, C.rose, tu, 0, tv);
  for (let k = 0; k < 5; k++) {
    f.box(0.3, 0.45, 0.3, C.travertine, tu - tw / 2 + 0.35 + k * ((tw - 0.7) / 4), th - 0.45, tv + td / 2 + 0.12);
    f.box(0.3, 0.45, 0.3, C.travertine, tu - tw / 2 + 0.35 + k * ((tw - 0.7) / 4), th - 0.45, tv - td / 2 - 0.12);
  }
  f.box(tw + 0.5, 0.9, td + 0.5, C.rose, tu, th, tv);
  f.box(tw + 0.7, 0.16, td + 0.7, C.travertine, tu, th + 0.9, tv);
  const tc = { ...crenel, w: 0.55, gap: 0.45 };
  merlons(f, tu - tw / 2 - 0.1, tv + td / 2 + 0.1, tu + tw / 2 + 0.1, tv + td / 2 + 0.1, th + 1.06, C.rose, tc);
  merlons(f, tu - tw / 2 - 0.1, tv - td / 2 - 0.1, tu + tw / 2 + 0.1, tv - td / 2 - 0.1, th + 1.06, C.rose, tc);
  merlons(f, tu + tw / 2 + 0.1, tv - td / 2 + 0.4, tu + tw / 2 + 0.1, tv + td / 2 - 0.4, th + 1.06, C.rose, tc);
  merlons(f, tu - tw / 2 - 0.1, tv - td / 2 + 0.4, tu - tw / 2 - 0.1, tv + td / 2 - 0.4, th + 1.06, C.rose, tc);
  for (const y of [3.2, 6.6]) {
    opening(f, '+u', tu + tw / 2, y, tv, 0.5, 1.4, { arch: true });
    opening(f, '+v', tu, y, tv + td / 2, 0.5, 1.4, { arch: true });
  }
  f.cyl(0.04, 0.05, 2.6, 5, C.iron, tu, th + 1.0, tv);
  f.box(0.9, 0.55, 0.04, '#8c1d2c', tu + 0.47, th + 3.0, tv);
  f.box(0.45, 0.55, 0.045, '#e8b030', tu + 0.7, th + 3.0, tv);

  // windows, the portal and Felice Giani's caryatid heads on the entrance front (+v)
  for (const u of [-9.4, -6.2, -3.0]) {
    opening(f, '+v', u, 1.0, 9.9, 1.0, 1.9, { arch: true });
    opening(f, '+v', u, 4.6, 9.9, 1.0, 1.7, {});
    if (hi) { f.sphere(0.22, C.marble, u, 6.85, 10.05, 1, 1.15, 0.6); f.box(0.5, 0.12, 0.25, C.travertine, u, 6.55, 10.0); }
  }
  for (const u of [4.6, 7.8]) {
    opening(f, '+v', u, 1.4, 9.9, 0.9, 1.6, { arch: true });
    if (hi) { f.sphere(0.2, C.marble, u, 3.75, 10.05, 1, 1.15, 0.6); f.box(0.45, 0.12, 0.25, C.travertine, u, 3.45, 10.0); }
  }
  opening(f, '+v', 1.6, 0, 9.9, 2.0, 3.3, { arch: true, fill: C.door, fw: 0.3 });
  f.box(2.4, 0.5, 0.2, C.travertine, 1.6, 3.9, 10.0);
  f.relief(polyShape([[-0.38, 0.85], [-0.38, 0.35], [0, 0], [0.38, 0.35], [0.38, 0.85]]), 0.1, '#e8b030', 1.6, 4.0, 10.08);
  for (const v of [-7.2, -3.6, 0, 3.6, 7.2]) {
    opening(f, '-u', -11.4, 1.0, v, 1.0, 1.9, { arch: true });
    opening(f, '-u', -11.4, 4.6, v, 1.0, 1.7, {});
  }
  for (const u of [-9.4, -6.2, -3.0, 1.5, 4.8, 8.1]) {
    opening(f, '-v', u, u < 0 ? 4.6 : 1.4, -10.4, 0.95, 1.6, {});
    if (u < 0) opening(f, '-v', u, 1.0, -10.4, 1.0, 1.9, { arch: true });
  }

  // courtyard garden: lawn, the square gravel walk of the OSM paths, a fountain and sculptures
  const g = new Frame(new GeoBuilder(), f.x, f.z, f.a, f.y0);
  g.box(11.4, 0.05, 14.2, C.grass, 4.6, 0, -0.2);
  for (const [u0, v0, u1, v1] of [[0.9, -5, 9.5, -5], [0.9, 6.2, 9.5, 6.2], [0.9, -5, 0.9, 6.2], [9.5, -5, 9.5, 6.2], [0.9, 6.2, 9.5, -5], [0.9, -5, 9.5, 6.2]]) {
    const L = Math.hypot(u1 - u0, v1 - v0);
    g.box(L + 1.2, 0.07, 1.2, C.gravel, (u0 + u1) / 2, 0, (v0 + v1) / 2, -Math.atan2(v1 - v0, u1 - u0));
  }
  f.cyl(1.25, 1.3, 0.5, 12, C.travertine, 5.2, 0, 0.6);
  f.cyl(1.05, 1.05, 0.06, 12, C.water, 5.2, 0.42, 0.6);
  statue(f, 5.2, 0.3, 0.6, 1.9, C.bronze, C.travertine, { pose: 'arm', plinthH: 0.9, ry: Math.PI / 2 });
  if (hi) {
    const spots = [[2.6, -2.8, 'stand'], [7.8, -2.9, 'arm'], [2.6, 4.2, 'arm'], [7.8, 4.2, 'stand']];
    for (const [u, v, pose] of spots) statue(f, u, 0, v, 1.7, C.marble, C.travertineShade, { pose, ry: Math.atan2(v - 0.6, 5.2 - u) });
    for (const [u, v] of [[0.3, -6.3], [0.3, 5.9]]) ctx.plant('cypress', ...f.w(u, v), { scale: 0.75 });
  }

  // front garden: Canonica's bronzes on tall plinths either side of the walk to the portal
  horse(f, -6.2, 2.3, 14.2, 1.05, C.bronze, { ry: -0.35, rear: true });
  f.box(3.0, 2.3, 1.6, C.travertine, -6.2, 0, 14.2, -0.35);
  f.box(3.3, 0.3, 1.9, C.travertineShade, -6.2, 0, 14.2, -0.35);
  statue(f, -1.4, 0, 11.2, 1.8, C.marble, C.travertine, { pose: 'arm' });
  statue(f, 4.6, 0, 11.2, 1.8, C.marble, C.travertine, { pose: 'stand' });
  for (const [u, v] of [[-3.2, 11.0], [-9.5, 11.0], [7.0, 11.0]]) f.box(2.6, 0.7, 0.8, C.hedge, u, 0, v);

  colliders.addRing(ctx.MAP.ANCHORS.fortezzuola.footprint, 'building');
  // core's photo spot lands on the courtyard walk inside the walls: use the walk to the portal
  const stop = ctx.game?.stops?.find((s) => s.id === 'fortezzuola');
  if (stop) [stop.spotX, stop.spotZ] = f.w(1.7, 13.4);
  for (const [u, v, r] of [[-6.2, 14.2, 1.7], [-1.4, 11.2, 0.5], [4.6, 11.2, 0.5], [-3.2, 11.0, 1.3], [-9.5, 11.0, 1.3], [7.0, 11.0, 1.3]]) {
    const [x, z] = f.w(u, v);
    colliders.addCircle(x, z, r, r > 1 && r < 1.5 ? 'hedge' : 'statue');
  }
  ctx.reserve({ ring: [f.w(-13, -12), f.w(15, -12), f.w(15, 12), f.w(9, 18), f.w(-13, 18)] });

  const group = new THREE.Group();
  group.name = 'fortezzuola';
  group.add(f.gb.build(undefined, { name: 'fortezzuola' }));
  group.add(g.gb.build(undefined, { castShadow: false, name: 'fortezzuola-garden' }));
  return { group };
}

// ---------------------------------------------------------------------------------------------
// Casina dell'Orologio: Asprucci's 1791 casino with massive corner spurs, big arches below and the
// little square clock turret on top. The clock shows the real time.
export function buildOrologio(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const a = ctx.MAP.ANCHORS.orologio;
  const f = anchorFrame(ctx, 'orologio');
  const wall = '#f0d29c', wallShade = '#e2bf86', trim = C.travertine;
  const W = 6.9, D = 4.5, H = 8.2;

  block(f, -W, W, -D, D, H, wall, {});
  f.box(2 * W + 0.1, 0.16, 2 * D + 0.1, trim, 0, 4.3, 0);
  // corner spurs
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const u = su * (7.3 - 0.8), v = sv * (4.9 - 0.8);
    f.box(1.6, 1.3, 1.6, C.travertineShade, u, 0, v);
    f.box(1.5, 6.9, 1.5, wallShade, u, 0, v);
    for (const y of [1.9, 3.3, 4.7]) f.box(1.58, 0.1, 1.58, trim, u, y, v);
    f.put(pyramidGeometry(1.5, 1.5, 0.7), trim, u, 6.9, v);
  }
  f.put(hipRoofGeometry(2 * W + 1.0, 2 * D + 1.0, 2.4), C.roofTile, 0, H, 0);
  // openings: big arches on the ground floor, shuttered windows above
  for (const u of [-3.4, 0, 3.4]) {
    opening(f, '+v', u, 0.5, D, 1.9, 3.2, { arch: true, fill: u === 0 ? C.door : C.glass, fw: 0.22 });
    opening(f, '-v', u, 0.9, -D, 1.5, 2.6, { arch: true, fill: C.glass });
  }
  for (const u of [-3.4, 0, 3.4]) {
    opening(f, '+v', u, 5.1, D, 0.9, 1.6, { shutters: hi ? C.shutter : null, sill: true });
    opening(f, '-v', u, 5.1, -D, 0.9, 1.6, { shutters: hi ? C.shutter : null });
  }
  for (const v of [-1.6, 1.6]) {
    opening(f, '+u', W, 0.9, v, 1.4, 2.6, { arch: true, fill: C.glass });
    opening(f, '-u', -W, 0.9, v, 1.4, 2.6, { arch: true, fill: C.glass });
    opening(f, '+u', W, 5.1, v, 0.85, 1.55, { shutters: hi ? C.shutter : null });
    opening(f, '-u', -W, 5.1, v, 0.85, 1.55, { shutters: hi ? C.shutter : null });
  }

  // the clock turret with an open bell cote
  const tw = 2.5, t1 = H + 5.0;
  f.box(tw, t1 - H, tw, wall, 0, H, 0);
  f.box(tw + 0.3, 0.25, tw + 0.3, trim, 0, t1, 0);
  const clockY = t1 - 1.35;
  const faces = [[0, tw / 2, [0, 1]], [0, -tw / 2, [0, -1]], [tw / 2, 0, [1, 0]], [-tw / 2, 0, [-1, 0]]];
  for (const [u, v, n] of faces) {
    const rx = Math.PI / 2, ry = Math.atan2(n[0], n[1]);
    f.put(new THREE.CylinderGeometry(0.88, 0.88, 0.06, 16), C.iron, u + n[0] * 0.03, clockY, v + n[1] * 0.03, rx, ry);
    f.put(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 16), C.white, u + n[0] * 0.07, clockY, v + n[1] * 0.07, rx, ry);
    const side = [n[1], -n[0]];
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2, s = k % 3 === 0 ? 0.13 : 0.07;
      const du = Math.sin(ang) * 0.64, dy = Math.cos(ang) * 0.64;
      f.box(s, s, 0.03, C.iron, u + n[0] * 0.11 + side[0] * du, clockY + dy - s / 2, v + n[1] * 0.11 + side[1] * du, ry);
    }
  }
  // bell cote: four posts, a bell and a little tiled pyramid with a gilded ball
  const bc = t1 + 0.25;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) f.box(0.3, 1.25, 0.3, wall, su * 0.85, bc, sv * 0.85);
  f.box(2.2, 0.2, 2.2, trim, 0, bc + 1.25, 0);
  f.put(new THREE.ConeGeometry(0.38, 0.6, 8), C.bronze, 0, bc + 0.75, 0);
  f.put(pyramidGeometry(2.2, 2.2, 1.0), C.roofTile, 0, bc + 1.45, 0);
  f.sphere(0.17, '#d9b44a', 0, bc + 2.55, 0);

  // clock hands: one instanced mesh, 4 faces x (hour, minute)
  const hb = new GeoBuilder();
  hb.box(0.1, 1, 0.04, C.iron, 0, 0.5, 0);
  const handGeo = buildGeometry(hb);
  const hands = new THREE.InstancedMesh(handGeo, mats().vcFlat, 8);
  hands.name = 'orologio-hands';
  hands.castShadow = false;
  const M = new THREE.Matrix4(), R = new THREE.Matrix4(), S = new THREE.Matrix4();
  const faceMats = faces.map(([u, v, n]) => f.matrix(u + n[0] * 0.14, clockY, v + n[1] * 0.14, 0, Math.atan2(n[0], n[1]), 0).clone());
  let lastMinute = -1;
  const setTime = () => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60, h = (now.getHours() % 12) + m / 60;
    const minute = Math.floor(m * 4);
    if (minute === lastMinute) return;
    lastMinute = minute;
    faceMats.forEach((fm, i) => {
      M.copy(fm).multiply(R.makeRotationZ(-(h / 12) * Math.PI * 2)).multiply(S.makeScale(1.4, 0.42, 1));
      hands.setMatrixAt(i * 2, M);
      M.copy(fm).multiply(R.makeRotationZ(-(m / 60) * Math.PI * 2)).multiply(S.makeScale(1, 0.66, 1));
      hands.setMatrixAt(i * 2 + 1, M);
    });
    hands.instanceMatrix.needsUpdate = true;
  };
  setTime();
  hands.computeBoundingSphere();

  colliders.addBox(a.x, a.z, 14.8, 10.0, a.angle, 'building');
  ctx.reserve({ x: a.x, z: a.z, r: 11 });
  const group = new THREE.Group();
  group.name = 'casina-orologio';
  group.add(f.gb.build(undefined, { name: 'orologio' }), hands);
  let acc = 0;
  return { group, update(dt) { acc += dt; if (acc > 1) { acc = 0; setTime(); } } };
}

// ---------------------------------------------------------------------------------------------
// Gigi Proietti Globe Theatre: a 20-sided timber "wooden O" (built 2003 after Shakespeare's Globe),
// plaster panels between oak posts, a straw-coloured roof ring open to the sky, two stair turrets.
export function buildGlobe(ctx) {
  const { colliders, quality } = ctx;
  const hi = quality.tier !== 'low';
  const a = ctx.MAP.ANCHORS.globe;
  const f = anchorFrame(ctx, 'globe');
  const cu = 0, cv = -0.7;                       // centre of the O in the footprint frame
  const N = 20, R = 9.4, Ri = 5.8, levels = [0.55, 3.3, 6.1, 8.6];
  const ap = R * Math.cos(Math.PI / N), chord = 2 * R * Math.sin(Math.PI / N);
  const api = Ri * Math.cos(Math.PI / N), chordi = 2 * Ri * Math.sin(Math.PI / N);
  const P = (r, phi) => [cu + r * Math.sin(phi), cv + r * Math.cos(phi)];

  for (let k = 0; k < N; k++) {
    const phi = (k * Math.PI * 2) / N;                     // facet centre (0 = +v, the entrance)
    const [pu, pv] = P(ap, phi), [qu, qv] = P(api, phi);
    const ry = phi;                                        // box +z axis faces outwards
    f.box(chord + 0.05, 0.55, 0.5, C.brick, pu, 0, pv, ry);
    f.box(chord, levels[3] - 0.55, 0.22, C.plaster, pu, 0.55, pv, ry);
    const [bu, bv] = P(ap + 0.04, phi);
    for (const y of levels) f.box(chord + 0.1, 0.24, 0.32, C.oak, bu, y - 0.12, bv, ry);
    const [vu, vv] = P(R + 0.02, phi + Math.PI / N);
    f.box(0.32, levels[3] + 0.1, 0.32, C.oak, vu, 0, vv, phi + Math.PI / N);
    // studs and braces on each storey
    const side = [Math.cos(phi), -Math.sin(phi)];
    f.box(0.2, levels[3] - 0.55, 0.3, C.oak, pu, 0.55, pv, ry);
    if (hi) {
      for (const [y0, y1, s] of [[3.3, 6.1, 1], [6.1, 8.6, -1]]) {
        const o = chord * 0.24;
        const A = [pu + side[0] * o * s + Math.sin(phi) * 0.14, y0, pv + side[1] * o * s + Math.cos(phi) * 0.14];
        const B = [pu - side[0] * o * s + Math.sin(phi) * 0.14, y1, pv - side[1] * o * s + Math.cos(phi) * 0.14];
        f.beam(A, B, 0.16, C.oak);
      }
      if (k % 2 === 1) for (const y of [4.1, 6.8]) f.box(0.55, 0.75, 0.3, C.window, pu + side[0] * chord * 0.26, y, pv + side[1] * chord * 0.26, ry);
    }
    // inner gallery front: posts and rails over a dark interior
    f.box(chordi, levels[3] - 0.3, 0.2, '#3d2b1d', qu, 0.3, qv, ry);
    const [ru, rv] = P(api - 0.12, phi);
    for (const y of [1.0, 3.3, 4.1, 6.1, 6.9, 8.4]) f.box(chordi, 0.14, 0.18, C.oakLight, ru, y, rv, ry);
    const [iu, iv] = P(Ri - 0.12, phi + Math.PI / N);
    f.box(0.22, levels[3], 0.22, C.oakLight, iu, 0, iv, phi + Math.PI / N);
  }
  // roof ring of thatch (lathe: inner eave -> ridge -> outer eave)
  const prof = [new THREE.Vector2(10.15, 8.45), new THREE.Vector2(7.9, 10.35), new THREE.Vector2(5.35, 8.55)];
  const roof = new THREE.LatheGeometry(prof, N, Math.PI / N, Math.PI * 2);
  f.put(roof, C.thatch, cu, 0, cv);

  // yard, stage with its two painted columns, the "heavens" and the hut with the flag
  f.cyl(Ri, Ri, 0.06, N, '#c9b089', cu, 0, cv);
  const sv = cv - 3.4;
  f.box(6.4, 1.4, 3.8, C.oak, cu, 0, sv - 0.6);
  f.box(6.6, 0.12, 4.0, C.oakLight, cu, 1.4, sv - 0.6);
  for (const s of [-1, 1]) f.cyl(0.24, 0.28, 5.8, 10, '#8e3b2e', cu + s * 2.4, 1.4, sv + 0.7);
  f.put(hipRoofGeometry(7.2, 4.6, 1.3), C.thatch, cu, 7.2, sv - 0.9);
  f.box(7.0, 0.35, 4.4, C.oak, cu, 6.9, sv - 0.9);
  f.box(7.0, 5.6, 0.25, '#9c3a2c', cu, 1.4, cv - Ri + 0.4);
  for (const u of [-2.2, 0, 2.2]) opening(f, '+v', cu + u, 1.5, cv - Ri + 0.53, 1.0, 2.1, { arch: true, frame: '#e0b74c', fill: '#2a1d14' });
  f.box(2.6, 1.8, 2.2, C.plaster, cu, 10.0, cv - 7.6);
  f.put(hipRoofGeometry(3.0, 2.6, 0.9), C.thatch, cu, 11.8, cv - 7.6);
  f.cyl(0.05, 0.06, 3.2, 5, C.oak, cu, 12.6, cv - 7.6);
  f.box(1.5, 0.95, 0.05, C.white, cu + 0.78, 14.75, cv - 7.6);

  // main door between the stair turrets
  opening(f, '+v', cu, 0.5, cv + ap + 0.12, 2.0, 2.8, { arch: true, frame: C.oak, fill: '#4a3020', fw: 0.25 });
  f.box(3.0, 0.3, 0.3, C.oak, cu, 3.55, cv + ap + 0.3);

  // stair turrets from the footprint's two square bumps
  const fp = a.footprint.map(([x, z]) => f.local(x, z));
  for (const idx of [[4, 5, 6, 7], [20, 21, 22, 23]]) {
    const q = idx.map((i) => fp[i]);
    const tu = q.reduce((s, p) => s + p[0], 0) / 4, tv = q.reduce((s, p) => s + p[1], 0) / 4;
    const ry = -Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
    const w = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), d = Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]);
    f.box(w + 0.1, 0.55, d + 0.1, C.brick, tu, 0, tv, ry);
    f.box(w, 7.0, d, C.plaster, tu, 0.55, tv, ry);
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (const [du, dv] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) {
      f.box(0.3, 7.6, 0.3, C.oak, tu + du * cs + dv * sn, 0, tv - du * sn + dv * cs, ry);
    }
    for (const y of [0.55, 3.3, 7.35]) f.box(w + 0.12, 0.22, d + 0.12, C.oak, tu, y, tv, ry);
    f.put(hipRoofGeometry(w + 0.8, d + 0.8, 1.8), C.thatch, tu, 7.55, tv, 0, ry);
    for (const y of [1.6, 4.6]) f.box(0.5, 0.8, d + 0.06, C.window, tu, y, tv, ry);
  }

  // gravel apron and the walk out to the path
  const g = new Frame(new GeoBuilder(), f.x, f.z, f.a, f.y0);
  g.cyl(R + 2.2, R + 2.2, 0.06, N, C.gravel, cu, 0, cv);
  g.box(3.2, 0.06, 6.5, C.gravel, cu, 0, cv + R + 4.0);

  colliders.addRing(a.footprint, 'building');
  ctx.reserve({ x: f.w(cu, cv)[0], z: f.w(cu, cv)[1], r: 15 });
  ctx.reserve({ ring: [f.w(-2.2, 8), f.w(2.2, 8), f.w(2.2, 15.5), f.w(-2.2, 15.5)] });
  const group = new THREE.Group();
  group.name = 'globe-theatre';
  group.add(f.gb.build(undefined, { name: 'globe' }), g.gb.build(undefined, { castShadow: false, name: 'globe-apron' }));
  return { group };
}
