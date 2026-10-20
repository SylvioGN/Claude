// The Galoppatoio: Villa Borghese's riding ground, a big sand oval behind a white post-and-rail
// fence. A show-jumping arena with colourful jumps and a little grandstand faces Viale San Paolo
// del Brasile, the stables stand by the east gate, and riders trot and canter around the track
// (instanced horses, legs and riders: three draw calls, matrices updated each frame).
import * as THREE from 'three';
import { Frame, horseBody, horseLeg, rider, HORSE_LEGS } from './parts.js';
import { RECT } from './atlas.js';

const C = {
  rail: '#f7f5ef', railShade: '#e4e0d4', sandLight: '#ecd9aa', sandEdge: '#dcc08c',
  red: '#d8392f', blue: '#2f6fc4', yellow: '#f2c230', green: '#3f9a4c', white: '#fbfaf6', brick: '#b8492f',
  wood: '#a5733f', woodDark: '#6f4a28', roof: '#b5532f', stableWall: '#f0dcae', stableTrim: '#f8f1e2',
  door: '#3f6b3e', dark: '#2a2420', hay: '#e2bd5a', hayDark: '#c99d3c', trough: '#8a8f94', water: '#5d9ec8',
  flagRed: '#e8463a', flagBlue: '#3b7fd1', flowers: ['#e8463a', '#f2c14e', '#f6f1e7', '#e05a7a'],
};
const COATS = ['#7a4a2a', '#a35a2e', '#d9d4ca', '#3a302a', '#c99a5a', '#5e3b24', '#efebe2', '#8c5a34'];
const JACKETS = { pad: '#f4f4f0', saddle: '#4a3020', legs: '#ece6d6', boots: '#1f1f22', jacket: '#24365e', skin: '#e8b996', helmet: '#1c1c20', gloves: '#2a2a2a' };

const tmpM = new THREE.Matrix4(), tmpL = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
const tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1);

// Closed polyline with cumulative lengths for sampling by distance.
function loopPath(pts) {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[pts.length];
  return {
    total,
    // {x, z, dx, dz} at distance s (wraps)
    at(s, out) {
      s = ((s % total) + total) % total;
      let lo = 0, hi = pts.length;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const a = pts[lo], b = pts[(lo + 1) % pts.length];
      const L = cum[lo + 1] - cum[lo] || 1, t = (s - cum[lo]) / L;
      out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
      out.dx = (b[0] - a[0]) / L; out.dz = (b[1] - a[1]) / L;
      return out;
    },
  };
}

export function buildGaloppatoio(ctx, gb, decals) {
  const N = ctx.MAP.NOGO.find((n) => n.k === 'galoppatoio');
  if (!N) return null;
  const { geo, terrain: T, MAP } = ctx;
  const H = T.heightAt;
  const ring = N.r;
  const low = ctx.quality.tier === 'low';
  const f0 = new Frame(gb);

  // --- the edge of the riding ground, resampled and gently rounded, with inward normals
  const spacing = low ? 3.4 : 2.8;
  let S = geo.samplePolyline([...ring, ring[0]], spacing).map((p) => [p.x, p.z]);
  if (Math.hypot(S[0][0] - S[S.length - 1][0], S[0][1] - S[S.length - 1][1]) < spacing * 0.5) S.pop();
  const smooth = (pts) => pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
  });
  S = smooth(smooth(S));
  const n = S.length;
  const inward = S.map((p, i) => {
    const a = S[(i - 1 + n) % n], b = S[(i + 1) % n];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    let nx = -tz, nz = tx;
    if (!geo.pointInRing(p[0] + nx * 2, p[1] + nz * 2, ring)) { nx = -nx; nz = -nz; }
    return [nx, nz];
  });

  // --- fence posts: hug the park boundary (just inside the drivable area so the cart touches the
  // rails), elsewhere stay a little outside the sand
  let posts = S.map((p, i) => {
    const b = geo.closestOnPolyline(p[0], p[1], MAP.BOUNDARY, true);
    if (b && b.d < 2.6 && b.d > 0.3) {
      const ox = (b.x - p[0]) / b.d, oz = (b.z - p[1]) / b.d;
      return [b.x + ox * 0.25, b.z + oz * 0.25];
    }
    return [p[0] - inward[i][0] * 0.8, p[1] - inward[i][1] * 0.8];
  });
  posts = smooth(posts);

  // gates where avenues and paths meet the riding ground
  const gates = [];
  for (const p of MAP.PATHS) {
    for (const e of [p.p[0], p.p[p.p.length - 1]]) {
      if (geo.distToRingEdge(e[0], e[1], ring) > 2.5) continue;
      let best = 0, bd = Infinity;
      posts.forEach((q, i) => { const d = Math.hypot(q[0] - e[0], q[1] - e[1]); if (d < bd) { bd = d; best = i; } });
      if (bd < 5 && !gates.some((g) => Math.min(Math.abs(g.i - best), n - Math.abs(g.i - best)) < 5)) gates.push({ i: best, viale: p.k === 'viale', x: e[0], z: e[1] });
    }
  }
  // the grand gate with the sign: the avenue arriving from the east
  let main = null;
  for (const g of gates) if (g.viale && (!main || g.x > main.x)) main = g;
  const inGate = (i) => gates.some((g) => { const d = (i - g.i + n) % n; return d === 0 || d === n - 1; });

  const postH = 1.3, railY = [0.55, 1.05];
  const py = posts.map(([x, z]) => H(x, z));
  for (let i = 0; i < n; i++) {
    const [x, z] = posts[i], y = py[i];
    const gatePost = gates.some((g) => i === (g.i + 1) % n || i === (g.i - 1 + n) % n);
    const t = gatePost ? 0.26 : 0.16, h = postH + (gatePost ? 0.35 : 0);
    if (!gates.some((g) => g.i === i)) f0.box(t, h + 0.25, t, C.rail, x, y + h / 2 - 0.12, z, Math.atan2(inward[i][0], inward[i][1]));
    const j = (i + 1) % n;
    if (inGate(i)) continue;
    const [x2, z2] = posts[j], y2 = py[j];
    for (const ry of railY) f0.beam([x, y + ry, z], [x2, y2 + ry, z2], 0.07, 0.15, ry > 1 ? C.rail : C.railShade);
  }
  for (const g of gates) {
    const a = posts[(g.i - 1 + n) % n], b = posts[(g.i + 1) % n];
    const ya = H(a[0], a[1]), yb = H(b[0], b[1]);
    const gw = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const gf = new Frame(gb, (a[0] + b[0]) / 2, (ya + yb) / 2, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2);
    // closed double gate: frame, bars and a diagonal brace per leaf
    for (const s of [-1, 1]) {
      const cx = s * gw / 4;
      for (const y of [0.35, 0.75, 1.15]) gf.box(gw / 2 - 0.2, 0.09, 0.07, C.rail, cx, y, 0);
      gf.box(0.1, 1.0, 0.08, C.rail, cx + s * (gw / 4 - 0.15), 0.75, 0);
      gf.box(0.1, 1.0, 0.08, C.rail, cx - s * (gw / 4 - 0.15), 0.75, 0);
      gf.beam([cx - s * (gw / 4 - 0.2), 0.35, 0.02], [cx + s * (gw / 4 - 0.2), 1.15, 0.02], 0.08, 0.08, C.railShade);
    }
    if (g === main) {
      for (const s of [-1, 1]) gf.box(0.3, 4.2, 0.3, C.woodDark, s * (gw / 2 + 0.05), 2.0, 0);
      gf.box(gw + 1.2, 0.26, 0.3, C.woodDark, 0, 4.0, 0);
      gf.box(gw + 0.2, 0.86, 0.1, C.woodDark, 0, 3.4, 0);
      decals.quad(gf, gw, (gw * 120) / 1024, RECT.galoppatoioSign, 0, 3.4, -0.06, Math.PI);
      decals.quad(gf, gw, (gw * 120) / 1024, RECT.galoppatoioSign, 0, 3.4, 0.06);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = posts[i], b = posts[(i + 1) % n];
    ctx.colliders.addSegment(a[0], a[1], b[0], b[1], 'fence', { name: 'galoppatoio' }, 0.18);
  }

  // --- show-jumping arena facing the avenue on the north-east side
  const arena = placeArena(ctx, ring, inward, S);
  buildArena(ctx, gb, arena);
  // --- stables by the east gate
  const stables = placeStables(ctx, ring, main, S, inward);
  if (stables) buildStables(ctx, gb, stables);
  // --- umbrella pines dotted over the sand, keeping clear of the round pen
  const pen = findPen(ctx, ring);
  if (pen) ctx.reserve({ x: pen.x, z: pen.z, r: pen.r + 6 });
  plantPines(ctx, ring, arena, stables);

  // --- horses
  const horses = buildHorses(ctx, S, inward, arena, ring, pen);
  return { arena, stables, horses, sand: arena.sand, update: horses.update };
}

// Arena rectangle, about 36 x 20 (shorter if the edge curves), parallel to the edge nearest
// Viale San Paolo del Brasile.
function placeArena(ctx, ring, inward, S) {
  const geo = ctx.geo;
  // edge segment of the ring closest to the Goethe monument side of the avenue
  const target = [58, 118];
  let bi = 0, bd = Infinity;
  for (let i = 0; i < S.length; i++) { const d = Math.hypot(S[i][0] - target[0], S[i][1] - target[1]); if (d < bd) { bd = d; bi = i; } }
  const [nx, nz] = inward[bi];
  const ax = nz, az = -nx;
  let len = 36, wid = 20, off = 18;
  let cx = S[bi][0] + nx * off, cz = S[bi][1] + nz * off;
  const corners = () => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [cx + ax * u * len / 2 + nx * v * wid / 2, cz + az * u * len / 2 + nz * v * wid / 2]);
  while (len > 20 && corners().some(([x, z]) => !geo.pointInRing(x, z, ring) || geo.distToRingEdge(x, z, ring) < 7)) len -= 2;
  return { x: cx, z: cz, ax, az, nx, nz, len, wid };
}

function buildArena(ctx, gb, A) {
  const H = ctx.terrain.heightAt;
  const rnd = ctx.rng('arena');
  // local frame: +x along the arena, +z towards the middle of the riding ground
  const f = new Frame(gb, A.x, 0, A.z, Math.atan2(A.nx, A.nz));
  const hl = A.len / 2, hw = A.wid / 2;
  const ground = (x, z) => { const p = f.world(x, 0, z); return H(p.x, p.z); };

  // lighter raked-sand surface following the ground (own mesh with polygon offset)
  const nx = 12, nz = 7, pos = [], col = [], c = new THREE.Color(), ce = new THREE.Color(C.sandEdge), cl = new THREE.Color(C.sandLight);
  const vtx = (i, j) => {
    const x = -hl - 0.6 + ((A.len + 1.2) * i) / nx, z = -hw - 0.6 + ((A.wid + 1.2) * j) / nz;
    const p = f.world(x, 0, z);
    const edge = i === 0 || j === 0 || i === nx || j === nz;
    c.copy(edge ? ce : cl).multiplyScalar(0.96 + rnd() * 0.06);
    return { p: [p.x, H(p.x, p.z) + 0.05, p.z], c: [c.r, c.g, c.b] };
  };
  const grid = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) grid.push(vtx(i, j));
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = grid[j * (nx + 1) + i], b = grid[j * (nx + 1) + i + 1], d = grid[(j + 1) * (nx + 1) + i], e = grid[(j + 1) * (nx + 1) + i + 1];
      for (const v of [a, d, b, b, d, e]) { pos.push(...v.p); col.push(...v.c); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const sand = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  sand.receiveShadow = true;
  sand.name = 'arenaSand';
  A.sand = sand;

  // white rail fence around the arena, an opening on the inner long side
  const fencePts = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]];
  for (let k = 0; k < 4; k++) {
    const [x0, z0] = fencePts[k], [x1, z1] = fencePts[(k + 1) % 4];
    const L = Math.hypot(x1 - x0, z1 - z0), m = Math.max(1, Math.round(L / 2.6));
    for (let s = 0; s < m; s++) {
      const t0 = s / m, t1 = (s + 1) / m;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const ya = ground(ax, az), yb = ground(bx, bz);
      f.box(0.14, 1.35, 0.14, C.rail, ax, ya + 0.55, az);
      if (k === 2 && s === Math.floor(m / 2)) continue; // entry
      for (const ry of [0.5, 0.95]) f.beam([ax, ya + ry, az], [bx, yb + ry, bz], 0.06, 0.13, C.rail);
    }
  }
  // flags at the corners
  for (const [x, z] of fencePts) {
    const y = ground(x, z);
    f.cyl(0.04, 0.04, 2.6, 4, C.white, x, y + 1.3, z);
    f.box(0.02, 0.4, 0.6, rnd() < 0.5 ? C.flagRed : C.flagBlue, x, y + 2.35, z + 0.3);
  }

  // the course: four jumps on the straights of an oval route
  const route = { a: hl - 4.5, b: hw - 4.2 };
  const jumpAt = [0.32, 0.68, 1.32, 1.68].map((k) => k * Math.PI);
  const styles = ['vertical', 'oxer', 'wall', 'cross'];
  A.route = route; A.jumps = jumpAt;
  jumpAt.forEach((th, k) => {
    const x = route.a * Math.cos(th), z = route.b * Math.sin(th);
    const tx = -route.a * Math.sin(th), tz = route.b * Math.cos(th);
    const jf = f.child(x, ground(x, z), z, Math.atan2(tx, tz));
    jump(jf, styles[k], k);
  });

  // a small grandstand outside the inner long side, and the judges' hut
  const gsz = hw + 3.2, gy = Math.max(ground(-6, gsz), ground(6, gsz));
  for (let r = 0; r < 4; r++) {
    const z = gsz + r * 0.8, top = 0.45 * (r + 1);
    f.box(12, top + 0.6, 0.8, r % 2 ? C.wood : C.woodDark, 0, gy + (top - 0.6) / 2, z);
    for (let x = -5.5; x <= 5.5; x += 1.1) f.box(0.5, 0.08, 0.5, [C.red, C.blue, C.yellow][(((r + Math.round(x)) % 3) + 3) % 3], x, gy + top + 0.04, z - 0.05);
  }
  f.box(12.4, 0.12, 4.0, C.roof, 0, gy + 4.0, gsz + 1.2, 0, 0.15);
  for (const x of [-6, 6]) for (const z of [gsz - 0.5, gsz + 2.9]) f.box(0.16, 4.2, 0.16, C.woodDark, x, gy + 1.9, z);
  const hx = hl - 1.5, hz = hw + 3.5, hy = ground(hx, hz);
  f.box(2.4, 2.6, 2.0, C.stableWall, hx, hy + 1.1, hz);
  f.box(2.8, 0.18, 2.4, C.roof, hx, hy + 2.5, hz);
  f.box(1.6, 0.7, 0.1, '#35424c', hx, hy + 1.6, hz - 1.01);
  f.cyl(0.03, 0.03, 1.4, 4, C.white, hx + 0.9, hy + 3.3, hz);
  f.box(0.02, 0.36, 0.55, C.flagRed, hx + 0.9, hy + 3.8, hz + 0.28);

  ctx.reserve({ ring: [[-hl - 2, -hw - 2], [hl + 2, -hw - 2], [hl + 2, hw + 7], [-hl - 2, hw + 7]].map(([x, z]) => { const p = f.world(x, 0, z); return [p.x, p.z]; }) });
  A.frame = f;
}

// One show jump, built across local x (the horse jumps along +z). Wings, striped poles, flowers.
function jump(f, style, k) {
  const W = 3.4, colors = [[C.red, C.white], [C.blue, C.white], [C.yellow, C.green], [C.green, C.white]][k % 4];
  const pole = (y, z, rot = 0) => {
    const seg = 6, len = W - 0.4;
    for (let i = 0; i < seg; i++) {
      const x = -len / 2 + (len * (i + 0.5)) / seg;
      const yy = y + (rot ? x * Math.tan(rot) : 0);
      f.cyl(0.07, 0.07, len / seg + 0.01, 6, colors[i % 2], x, yy, z, 0, 0, Math.PI / 2 + rot);
    }
  };
  const wing = (x, z) => {
    f.box(0.12, 1.6, 0.12, C.white, x, 0.8, z - 0.25);
    f.box(0.12, 1.6, 0.12, C.white, x, 0.8, z + 0.25);
    f.box(0.08, 1.1, 0.5, colors[0], x, 0.75, z);
    for (const y of [0.45, 1.05]) f.box(0.1, 0.1, 0.5, C.white, x, y, z);
    f.box(0.6, 0.06, 0.7, C.white, x, 0.03, z);
  };
  const zs = style === 'oxer' ? [-0.45, 0.45] : [0];
  for (const z of zs) for (const s of [-1, 1]) wing(s * W / 2, z);
  if (style === 'vertical') { pole(0.45, 0); pole(0.8, 0); pole(1.15, 0); }
  else if (style === 'oxer') { pole(0.7, -0.45); pole(1.05, -0.45); pole(0.85, 0.45); pole(1.15, 0.45); }
  else if (style === 'wall') {
    f.box(W - 0.5, 0.8, 0.45, C.brick, 0, 0.4, 0);
    for (const y of [0.27, 0.54]) f.box(W - 0.48, 0.03, 0.47, C.white, 0, y, 0);
    f.box(W - 0.48, 0.08, 0.5, C.white, 0, 0.82, 0);
    pole(1.1, 0);
  } else {
    pole(0.65, 0, 0.32); pole(0.65, 0, -0.32); pole(1.15, 0);
  }
  // flower boxes in front of the wings
  for (const s of [-1, 1]) {
    f.box(0.9, 0.3, 0.35, C.woodDark, s * (W / 2 - 0.6), 0.15, -0.75);
    for (let i = 0; i < 3; i++) f.sphere(0.13, 0, C.flowers[(i + k) % 4], s * (W / 2 - 0.6) - 0.3 + i * 0.3, 0.36, -0.75);
  }
}

function placeStables(ctx, ring, main, S, inward) {
  const geo = ctx.geo;
  // near the gate on the east side of the ground
  let bi = 0, bd = Infinity;
  const tx = main ? main.x : 83, tz = main ? main.z + 4 : 168;
  for (let i = 0; i < S.length; i++) { const d = Math.hypot(S[i][0] - tx, S[i][1] - tz); if (d < bd) { bd = d; bi = i; } }
  const [nx, nz] = inward[bi];
  const x = S[bi][0] + nx * 13.5, z = S[bi][1] + nz * 13.5;
  if (!geo.pointInRing(x, z, ring)) return null;
  return { x, z, h: Math.atan2(-nx, -nz) }; // doors face the gate
}

function buildStables(ctx, gb, st) {
  const H = ctx.terrain.heightAt;
  const L = 17, D = 5.4, Wh = 3.0, rise = 1.7;
  let y0 = -Infinity, ymin = Infinity;
  for (const u of [-1, 1]) for (const v of [-1, 1]) {
    const x = st.x + Math.cos(st.h) * u * L / 2 + Math.sin(st.h) * v * D / 2, z = st.z - Math.sin(st.h) * u * L / 2 + Math.cos(st.h) * v * D / 2;
    const h = H(x, z); y0 = Math.max(y0, h); ymin = Math.min(ymin, h);
  }
  const f = new Frame(gb, st.x, y0, st.z, st.h); // +z = front with the stable doors
  const sink = y0 - ymin + 0.4;
  f.box(L + 0.3, 0.5 + sink, D + 0.3, '#b9a98c', 0, (0.5 - sink) / 2 - 0.25, 0);
  f.box(L, Wh, D, C.stableWall, 0, Wh / 2, 0);
  f.box(L + 0.1, 0.5, D + 0.1, '#c98a5a', 0, 0.25, 0);
  for (const s of [-1, 1]) f.box(0.3, Wh, 0.3, C.stableTrim, s * L / 2, Wh / 2, D / 2);
  // gabled roof with a deep canopy over the doors, and a cupola with a horse weathervane
  const th = Math.atan2(rise, D / 2), slope = Math.hypot(D / 2, rise);
  for (const s of [-1, 1]) {
    const over = s > 0 ? 1.4 : 0.5, sl = slope + over;
    const mz = s * ((sl / 2) * Math.cos(th) + 0.08 * Math.sin(th)), my = Wh + rise - (sl / 2) * Math.sin(th) + 0.08 * Math.cos(th);
    f.child(0, my, mz, 0, s * th).box(L + 0.8, 0.16, sl, C.roof, 0, 0, 0);
  }
  f.box(L + 0.9, 0.2, 0.3, '#8f3f24', 0, Wh + rise + 0.12, 0);
  for (const s of [-1, 1]) {
    const gable = new THREE.Shape();
    gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(0, rise); gable.lineTo(-D / 2, 0);
    f.extrude(gable, 0.1, C.stableWall, s * L / 2 - 0.05, Wh, 0, 0, Math.PI / 2);
  }
  f.box(1.2, 1.0, 1.2, C.stableTrim, 0, Wh + rise + 0.6, 0);
  f.cone(0.95, 0.8, 4, C.roof, 0, Wh + rise + 1.5, 0, 0, Math.PI / 4);
  f.cyl(0.03, 0.03, 0.9, 4, C.dark, 0, Wh + rise + 2.3, 0);
  const vane = f.child(0, Wh + rise + 2.65, 0, 0.6, 0, 0, 0.32);
  horseBody(vane, { coat: C.dark, dark: C.dark });
  for (const [x, y, z] of HORSE_LEGS) vane.box(0.1, 1.0, 0.12, C.dark, x, y - 0.5, z);
  // six stable doors: dark-green lower halves, open tops, horses looking out of four
  const rnd = ctx.rng('stables');
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + 1.5 + (i * (L - 3)) / 5;
    f.box(1.5, 2.4, 0.08, C.stableTrim, x, 1.2, D / 2 + 0.02);
    f.box(1.2, 1.1, 0.12, C.door, x, 0.6, D / 2 + 0.05);
    f.beam([x - 0.5, 0.15, D / 2 + 0.12], [x + 0.5, 1.05, D / 2 + 0.12], 0.08, 0.08, C.stableTrim);
    f.box(1.2, 1.05, 0.06, C.dark, x, 1.7, D / 2 + 0.02);
    if (i !== 1 && i !== 4) {
      const coat = COATS[(i * 3) % COATS.length];
      const hf = f.child(x, 0, D / 2 - 0.5, rnd.range(-0.35, 0.35));
      hf.limb([0, 1.5, 0.2], [0, 1.95, 0.8], 0.2, 0.15, 6, coat);
      hf.add(new THREE.BoxGeometry(0.22, 0.24, 0.56), coat, 0, 1.92, 1.05, 0.9, 0, 0);
      hf.add(new THREE.BoxGeometry(0.17, 0.17, 0.15), '#2c2420', 0, 1.74, 1.23, 0.9, 0, 0);
      hf.cone(0.045, 0.16, 4, coat, -0.07, 2.12, 0.78);
      hf.cone(0.045, 0.16, 4, coat, 0.07, 2.12, 0.78);
      hf.beam([0, 2.1, 0.62], [0, 1.6, 0.25], 0.06, 0.12, '#2c2420');
      if (i === 0) hf.box(0.08, 0.05, 0.25, C.white, 0, 1.98, 1.14, 0, 0.9);
    }
    if (i < 5) f.box(0.18, 0.7, 0.18, C.dark, x + (L - 3) / 10, 2.6, D / 2 + 0.12); // lantern bracket
  }
  // hay bales and a water trough at the ends
  for (const [x, z, y, r] of [[-L / 2 - 1.3, 1.0, 0, 0], [-L / 2 - 1.3, -0.4, 0, 0.1], [-L / 2 - 1.25, 0.3, 0.7, 1.5]]) {
    f.box(1.2, 0.7, 0.8, C.hay, x, y + 0.35, z, r);
    f.box(1.22, 0.06, 0.82, C.hayDark, x, y + 0.5, z, r);
  }
  f.box(0.8, 0.6, 2.2, C.trough, L / 2 + 1.0, 0.3, 1.2);
  f.box(0.62, 0.05, 2.0, C.water, L / 2 + 1.0, 0.58, 1.2);
  ctx.reserve({ x: st.x, z: st.z, r: 12 });
}

function plantPines(ctx, ring, arena, stables) {
  const { geo } = ctx;
  const rnd = ctx.rng('galoppatoio-pines');
  const count = Math.round(18 * (ctx.quality.treeDensity ?? 1));
  const bb = geo.ringBBox(ring);
  let placed = 0;
  const spots = [];
  for (let tries = 0; tries < 600 && placed < count; tries++) {
    const x = bb.minX + rnd() * (bb.maxX - bb.minX), z = bb.minZ + rnd() * (bb.maxZ - bb.minZ);
    if (!geo.pointInRing(x, z, ring)) continue;
    const de = geo.distToRingEdge(x, z, ring);
    if (de < 10 || (de > 16 && rnd() < 0.6)) continue; // mostly a loose ring just inside the track
    if (Math.hypot(x - arena.x, z - arena.z) < Math.max(arena.len, arena.wid) / 2 + 9) continue;
    if (stables && Math.hypot(x - stables.x, z - stables.z) < 14) continue;
    if (ctx.isReserved(x, z, 4) || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 11)) continue;
    spots.push([x, z]);
    ctx.plant('umbrellaPine', x, z, { scale: 1.0 + rnd() * 0.3 });
    placed++;
  }
}

// --- riders -----------------------------------------------------------------------------------

function buildHorses(ctx, S, inward, arena, ring, pen) {
  const { GeoBuilder, buildGeometry, mats } = ctx.util;
  const scene = ctx.scene;
  const low = ctx.quality.tier === 'low';
  const H = ctx.terrain.heightAt;

  // templates: coat parts are white so the instance colour paints the coat
  const bodyGb = new GeoBuilder();
  horseBody(new Frame(bodyGb), { coat: '#ffffff', dark: '#3d3d3d', muzzle: '#9a9a9a' });
  const legGb = new GeoBuilder();
  horseLeg(new Frame(legGb), '#ffffff', '#3a3a3a');
  const riderGb = new GeoBuilder();
  rider(new Frame(riderGb), JACKETS);

  // routes: two lanes of the perimeter track, the arena course, the lunging ring
  const lane = (d) => loopPath(S.map((p, i) => [p[0] + inward[i][0] * d, p[1] + inward[i][1] * d]));
  const outer = lane(3.0), inner = lane(5.4);
  // start the groups where they are easy to see: near the arena and the east gate
  const startNear = (path, x, z) => {
    let best = 0, bd = Infinity;
    const o = {};
    for (let s = 0; s < path.total; s += 2) { path.at(s, o); const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = s; } }
    return best;
  };
  const sA = startNear(outer, arena.x - arena.nx * 18, arena.z - arena.nz * 18);
  const sB = startNear(inner, 82, 150);

  const horses = [];
  const addHorse = (o) => horses.push({ coat: COATS[horses.length % COATS.length], ridden: true, s: 0, ...o });
  addHorse({ route: 'track', path: outer, s: sA, v: 3.1, gait: 'trot' });
  addHorse({ route: 'track', path: outer, s: sA - 4.2, v: 3.1, gait: 'trot' });
  addHorse({ route: 'track', path: outer, s: sA - 8.4, v: 3.1, gait: 'trot' });
  addHorse({ route: 'track', path: inner, s: sB, v: 5.4, gait: 'canter' });
  if (!low) addHorse({ route: 'track', path: inner, s: sB - 5, v: 5.4, gait: 'canter' });
  addHorse({ route: 'arena', s: 0, v: 4.4, gait: 'canter' });
  if (!low) addHorse({ route: 'arena', s: Math.PI, v: 4.4, gait: 'canter' });
  // a horse on the lunge in the round pen (a walled ring in the map), with its trainer
  if (pen) addHorse({ route: 'pen', pen, s: 0, v: 2.6, gait: 'trot', ridden: false });

  const nH = horses.length, nR = horses.filter((h) => h.ridden).length;
  const bodies = new THREE.InstancedMesh(buildGeometry(bodyGb), mats().vcFlat, nH);
  const legs = new THREE.InstancedMesh(buildGeometry(legGb), mats().vcFlat, nH * 4);
  const riders = new THREE.InstancedMesh(buildGeometry(riderGb), mats().vcFlat, nR);
  const col = new THREE.Color();
  horses.forEach((h, i) => {
    col.set(h.coat);
    bodies.setColorAt(i, col);
    for (let k = 0; k < 4; k++) legs.setColorAt(i * 4 + k, col);
  });
  // one shared bounding sphere over the whole riding ground keeps culling cheap and correct
  const bb = ctx.geo.ringBBox(ring);
  const sphere = new THREE.Sphere(new THREE.Vector3((bb.minX + bb.maxX) / 2, H((bb.minX + bb.maxX) / 2, (bb.minZ + bb.maxZ) / 2), (bb.minZ + bb.maxZ) / 2), Math.hypot(bb.maxX - bb.minX, bb.maxZ - bb.minZ) / 2 + 6);
  for (const m of [bodies, legs, riders]) {
    m.boundingSphere = sphere;
    m.castShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
  }
  bodies.name = 'horses'; legs.name = 'horseLegs'; riders.name = 'riders';

  if (pen) {
    const gb = new GeoBuilder();
    const tf = new Frame(gb, pen.x, H(pen.x, pen.z), pen.z, 0);
    figureTrainer(tf);
    const m = gb.build(mats().vcFlat, { name: 'trainer' });
    if (m) scene.add(m);
  }

  // honk near the riding ground: the nearest horse rears up and neighs
  const REAR = 1.4;
  ctx.events.on('honk', () => {
    const c = ctx.cart?.position;
    if (!c) return;
    let best = null, bd = 30;
    for (const h of horses) {
      const d = Math.hypot(h.x - c.x, h.z - c.z);
      if (d < bd && !(h.rear > 0)) { bd = d; best = h; }
    }
    if (!best) return;
    best.rear = REAR;
    ctx.events.emit('animal', { kind: 'horse', x: best.x, z: best.z });
  });

  const o = { x: 0, z: 0, dx: 0, dz: 1 };
  const cam = ctx.camera;
  const hindPivot = new THREE.Matrix4().makeTranslation(0, 0, -0.72), hindBack = new THREE.Matrix4().makeTranslation(0, 0, 0.72);
  const rot = new THREE.Matrix4();
  let frameSkip = 0, acc = 0;
  function pose(h, dt) {
    let rearA = 0;
    if (h.rear > 0) {
      h.rear = Math.max(0, h.rear - dt);
      rearA = Math.sin(Math.PI * (1 - h.rear / REAR)) * 0.7;
    }
    h.s += h.v * dt * (rearA > 0 ? 0.1 : 1);
    let x, z, dx, dz, lift = 0, pitch = 0, tuck = 0;
    if (h.route === 'track') {
      h.path.at(h.s, o); x = o.x; z = o.z; dx = o.dx; dz = o.dz;
    } else if (h.route === 'arena') {
      const r = arena.route, th = h.s / ((r.a + r.b) / 2);
      const lx = r.a * Math.cos(th), lz = r.b * Math.sin(th);
      let tx = -r.a * Math.sin(th), tz = r.b * Math.cos(th);
      const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
      const p = arena.frame.world(lx, 0, lz), q = arena.frame.world(lx + tx, 0, lz + tz);
      x = p.x; z = p.z; dx = q.x - p.x; dz = q.z - p.z;
      // over the jumps: arc up, nose up then down, legs tucked
      const span = 3.4 / ((r.a + r.b) / 2);
      const thm = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      for (const j of arena.jumps) {
        const u = (thm - j) / span + 0.5;
        if (u > 0 && u < 1) {
          const sn = Math.sin(Math.PI * u);
          lift = 1.05 * sn; pitch = -0.32 * Math.cos(Math.PI * u); tuck = sn;
        }
      }
    } else {
      const pen = h.pen, th = h.s / pen.r;
      x = pen.x + Math.cos(th) * pen.r; z = pen.z + Math.sin(th) * pen.r;
      dx = -Math.sin(th); dz = Math.cos(th);
    }
    h.x = x; h.z = z; h.rearA = rearA;
    const heading = Math.atan2(dx, dz);
    const stride = h.gait === 'trot' ? 2.5 : 3.6;
    const ph = (h.s / stride) * Math.PI * 2;
    let bob, rock;
    if (h.gait === 'trot') { bob = 0.05 * Math.cos(ph * 2); rock = 0; } else { bob = 0.09 * Math.sin(ph); rock = 0.06 * Math.sin(ph + 0.6); }
    const y = H(x, z) + (bob + lift) * (1 - rearA);
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(pitch + rock * (1 - tuck), heading, 0, 'YXZ')), tmpS.set(1, 1, 1));
    if (rearA > 0) tmpM.multiply(hindPivot).multiply(rot.makeRotationX(-rearA)).multiply(hindBack);
    return { m: tmpM, ph, tuck };
  }

  function update(dt, force = false) {
    // far away: tick less often (the bounding sphere still culls rendering)
    acc += dt;
    const dc = cam.position.distanceTo(sphere.center);
    if (!force && dc > sphere.radius + 260) return;
    if (!force && dc > sphere.radius + 120 && (frameSkip = (frameSkip + 1) % 3)) return;
    const step = Math.min(acc, 0.25);
    acc = 0;
    let ri = 0;
    const t = ctx.time;
    horses.forEach((h, i) => {
      const { m, ph, tuck } = pose(h, step);
      bodies.setMatrixAt(i, m);
      if (h.ridden) {
        tmpL.makeTranslation(0, h.gait === 'trot' ? 0.05 * Math.max(0, Math.sin(ph * 2)) * (1 - h.rearA) : 0.02, 0);
        riders.setMatrixAt(ri++, tmpL.premultiply(m));
      }
      for (let k = 0; k < 4; k++) {
        const [lx, ly, lz, front] = HORSE_LEGS[k];
        let a;
        if (h.gait === 'trot') a = 0.42 * Math.sin(ph + (k === 0 || k === 3 ? 0 : Math.PI));
        else a = 0.55 * Math.sin(ph + [0.33, 0.66, 0, 0.33][k] * Math.PI * 2);
        if (tuck > 0) a = a * (1 - tuck) + (front ? -1.15 : 0.75) * tuck;
        if (h.rearA > 0) {
          const r = h.rearA / 0.7;
          a = a * (1 - r) + (front ? -0.9 - 0.35 * Math.sin(t * 14 + k * 2) : h.rearA) * r;
        }
        tmpL.compose(tmpP.set(lx, ly, lz), tmpQ.setFromEuler(tmpE.set(a, 0, 0, 'YXZ')), tmpS.set(1, 1, 1));
        legs.setMatrixAt(i * 4 + k, tmpL.premultiply(m));
      }
    });
    bodies.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
    riders.instanceMatrix.needsUpdate = true;
  }
  update(0, true);
  return { update, meshes: [bodies, legs, riders], count: nH };
}

// The round pen: a closed wall ring well inside the riding ground (from MAP.WALLS).
function findPen(ctx, ring) {
  const { geo } = ctx;
  let best = null;
  for (const w of ctx.MAP.WALLS) {
    const p = w.p;
    if (p.length < 6 || Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) > 0.5) continue;
    const [cx, cz] = geo.ringCentroid(p.slice(0, -1));
    if (!geo.pointInRing(cx, cz, ring) || geo.distToRingEdge(cx, cz, ring) < 10) continue;
    const r = Math.min(...p.map(([x, z]) => Math.hypot(x - cx, z - cz)));
    if (r < 5 || (best && best.r > r)) continue;
    best = { x: cx, z: cz, r: r - 2.2 };
  }
  return best;
}

function figureTrainer(f) {
  f.limb([-0.1, 0.9, 0], [-0.11, 0.03, 0.05], 0.085, 0.065, 5, '#3a3f4a');
  f.limb([0.1, 0.9, 0], [0.11, 0.03, -0.05], 0.085, 0.065, 5, '#3a3f4a');
  f.limb([0, 0.88, 0], [0, 1.45, 0], 0.17, 0.2, 6, '#c8413f');
  f.sphere(0.12, 1, '#e8b996', 0, 1.66, 0.01, 1, 1.1, 1);
  f.dome(0.13, 8, '#3b2a1c', 0, 1.7, 0, 0.9);
  f.limb([0.24, 1.42, 0], [0.5, 1.3, 0.35], 0.05, 0.04, 5, '#c8413f');
  f.limb([-0.24, 1.42, 0], [-0.35, 1.0, 0.15], 0.05, 0.04, 5, '#c8413f');
  f.beam([0.5, 1.3, 0.35], [1.6, 2.6, 1.2], 0.03, 0.03, '#3b2a1c');
}
