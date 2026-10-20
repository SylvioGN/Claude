// Bioparco edge: the zoo perimeter railing, the monumental entrance (Armando Brasini, 1911:
// two pavilions with elephant-head keystones and an iron gate between panther pillars) and
// paddocks with animals that can be seen over the railing from the park. world.js paints the
// meadow inside the fence; vegetation.js plants the trees this module asks for.
import * as THREE from 'three';
import { C, FrameBuilder, UVBuilder, AnimBuilder, UV, run, beam, railingMaterial } from './kit.js';
import { giraffe, zebra, elephant, lion, flamingo, deer } from './animals.js';

const PIER = '#dcc9a0', PIER_CAP = '#efe5cf', PLINTH = '#cbbd9c', GATE_WALL = '#e8cf9c', GATE_TRIM = '#f4ead4';

function nearestSegment(ring, x, z, geo) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const c = geo.closestOnSegment(x, z, a[0], a[1], b[0], b[1]);
    if (!best || c.d2 < best.d2) best = { ...c, i };
  }
  return best;
}

// Douglas-Peucker: drops the tiny zig-zags of the mapped outline so the railing runs cleanly.
function simplify(pts, eps, geo) {
  if (pts.length < 3) return pts;
  let best = -1, bd = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.sqrt(geo.closestOnSegment(pts[i][0], pts[i][1], a[0], a[1], b[0], b[1]).d2);
    if (d > bd) { bd = d; best = i; }
  }
  if (bd <= eps) return [a, b];
  return [...simplify(pts.slice(0, best + 1), eps, geo).slice(0, -1), ...simplify(pts.slice(best), eps, geo)];
}

// Point at distance `along` the fence segment and `inside` metres into the zoo.
function fencePoint(seg, along, inside) {
  return [seg.ax + seg.dx * along + seg.inx * inside, seg.az + seg.dz * along + seg.inz * inside];
}

export function buildZoo(ctx, rnd, animalMats) {
  const { MAP, terrain, colliders, geo } = ctx;
  const H = terrain.heightAt;
  const low = ctx.quality.tier === 'low';
  const zoo = MAP.NOGO.find((n) => n.k === 'zoo');
  if (!zoo) return { meshes: [] };
  const ring = zoo.r;
  const inZoo = (x, z) => geo.pointInRing(x, z, ring);
  const segInfo = (i) => {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    let inx = -dz, inz = dx;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (!inZoo(mx + inx * 0.5, mz + inz * 0.5)) { inx = -inx; inz = -inz; }
    return { ax: a[0], az: a[1], L, dx, dz, inx, inz };
  };

  // ---------------------------------------------------------------- the gate
  // On the fence nearest the Bioparco photo stop, so the stop's photo frames it.
  const stop = ctx.game?.stops?.find((s) => s.id === 'bioparco');
  const spot = stop ? [stop.spotX, stop.spotZ] : [MAP.ANCHORS.zoo_gate.x, MAP.ANCHORS.zoo_gate.z];
  const near = nearestSegment(ring, spot[0], spot[1], geo);
  const gs = segInfo(near.i);
  const HW = 9;
  const along = Math.min(Math.max(near.t * gs.L, HW + 0.5), gs.L - HW - 0.5);
  const [gx, gz] = fencePoint(gs, along, 0);
  const gry = Math.atan2(-gs.inx, -gs.inz); // local +z faces the park
  let gy = Infinity;
  for (let s = -HW; s <= HW; s += 3) for (const d of [-3.4, 0, 0.6]) gy = Math.min(gy, H(gx + gs.dx * s - gs.inx * d, gz + gs.dz * s - gs.inz * d));

  const gb = new FrameBuilder();
  const iron = new UVBuilder();
  const ab = new AnimBuilder();
  gb.setFrame(gx, gy, gz, gry);
  ab.setFrame(gx, gy, gz, gry);
  const gateToWorld = (x, z) => [gx + Math.cos(gry) * x + Math.sin(gry) * z, gz - Math.sin(gry) * x + Math.cos(gry) * z];
  {
    const Z0 = -3.4, Z1 = 0.6, D = Z1 - Z0, ZC = (Z0 + Z1) / 2;
    for (const sx of [-1, 1]) {
      const cx = sx * 6.5;
      gb.box(5.3, 1.2, D + 0.3, PLINTH, cx, 0.3, ZC);
      gb.box(5.0, 4.4, D, GATE_WALL, cx, 2.9, ZC);
      for (let k = 0; k < 6; k++) gb.box(5.04, 0.06, D + 0.04, '#cfb383', cx, 1.35 + k * 0.62, ZC);
      for (const px of [cx - 2.3, cx + 2.3]) gb.box(0.55, 4.4, D + 0.12, GATE_TRIM, px, 2.9, ZC);
      gb.box(5.7, 0.45, D + 0.7, GATE_TRIM, cx, 5.32, ZC);
      gb.box(4.4, 0.8, D - 0.6, GATE_WALL, cx, 5.95, ZC);
      gb.box(4.7, 0.2, D - 0.3, GATE_TRIM, cx, 6.45, ZC);
      // vestibule arch, closed with a dark wooden door
      gb.box(2.5, 2.6, 0.08, GATE_TRIM, cx, 2.3, Z1 + 0.02);
      gb.box(2.1, 2.5, 0.1, C.door, cx, 2.25, Z1 + 0.05);
      gb.place(new THREE.TorusGeometry(1.15, 0.16, 4, 10, Math.PI), GATE_TRIM, cx, 3.5, Z1 + 0.06, 0, 0, 0, 1, 1, 0.7);
      gb.place(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 10, 1, false, Math.PI / 2, Math.PI), C.door, cx, 3.5, Z1 + 0.05, Math.PI / 2, 0, 0);
      // elephant-head keystone
      const ex = cx, ey = 4.65, ez = Z1 + 0.35;
      gb.sphere(0.42, 1, '#9a948d', ex, ey, ez, 1, 0.95, 0.8);
      for (const s of [-1, 1]) {
        gb.place(new THREE.CylinderGeometry(0.38, 0.34, 0.06, 8), '#8f8983', ex + s * 0.46, ey + 0.02, ez - 0.12, 0, s * 0.5, Math.PI / 2, 1.2, 1, 1);
        beam(gb, [ex + s * 0.17, ey - 0.25, ez + 0.25], [ex + s * 0.24, ey - 0.45, ez + 0.5], 0.06, 0.06, '#f3ede0');
        gb.sphere(0.045, 0, '#2a2622', ex + s * 0.17, ey + 0.08, ez + 0.32);
      }
      beam(gb, [ex, ey - 0.15, ez + 0.3], [ex, ey - 0.7, ez + 0.42], 0.17, 0.17, '#9a948d');
      beam(gb, [ex, ey - 0.7, ez + 0.42], [ex, ey - 0.95, ez + 0.62], 0.12, 0.12, '#9a948d');
      // side windows
      for (const s of [-1, 1]) {
        gb.box(0.08, 1.5, 1.0, GATE_TRIM, cx + s * 2.52, 3.2, ZC);
        gb.box(0.08, 1.3, 0.8, C.glass, cx + s * 2.55, 3.2, ZC);
      }
      // a travertine lion (left) and lioness (right) lying on the attic
      gb.box(2.6, 0.3, 1.5, GATE_TRIM, cx, 6.7, ZC + 0.2);
      const [lx, lz] = gateToWorld(cx, ZC + 0.1);
      ab.setFrame(lx, gy + 6.85, lz, gry, 1.15);
      lion(ab, 0, sx < 0, true);
    }
    // gate piers with crouching panthers
    for (const sx of [-1, 1]) {
      const px = sx * 3.75;
      gb.box(1.0, 1.0, 1.1, PLINTH, px, 0.3, 0);
      gb.box(0.85, 4.2, 0.95, GATE_WALL, px, 2.6, 0);
      gb.box(1.1, 0.35, 1.2, GATE_TRIM, px, 4.85, 0);
      const P = '#2f2b29', py = 5.02;
      gb.sphere(1, 1, P, px, py + 0.3, 0.05, 0.28, 0.24, 0.62);
      gb.sphere(0.2, 1, P, px, py + 0.42, 0.62, 1, 0.95, 1.1);
      for (const s of [-1, 1]) {
        beam(gb, [px + s * 0.15, py + 0.12, 0.35], [px + s * 0.15, py + 0.1, 0.75], 0.09, 0.1, P);
        gb.sphere(0.05, 0, P, px + s * 0.12, py + 0.6, 0.6);
      }
      beam(gb, [px, py + 0.3, -0.55], [px + sx * 0.25, py - 0.4, -0.6], 0.05, 0.05, P);
      colliders.addCircle(...gateToWorld(px, 0), 0.7, 'wall');
    }
    // the iron gate and its arch with the sign
    iron.strip([{ x: -3.3, z: 0, y0: 0.05, y1: 3.4, u: 0 }, { x: 3.3, z: 0, y0: 0.05, y1: 3.4, u: 5.7 }], gb.frame);
    gb.box(0.14, 3.3, 0.14, C.iron, 0, 1.7, 0);
    gb.box(6.6, 0.12, 0.12, C.iron, 0, 1.2, 0);
    gb.place(new THREE.TorusGeometry(3.3, 0.08, 4, 16, Math.PI), C.iron, 0, 3.4, 0, 0, 0, 0, 1, 0.42, 1);
    gb.place(new THREE.TorusGeometry(3.0, 0.05, 4, 16, Math.PI), C.iron, 0, 3.4, 0, 0, 0, 0, 1, 0.36, 1);
    gb.sphere(0.16, 0, '#d9b45a', 0, 4.85, 0);
    gb.box(5.0, 0.95, 0.06, C.iron, 0, 4.1, -0.02);
    ab.setFrame(gx, gy, gz, gry).skin(UV.sign).place(new THREE.PlaneGeometry(4.8, 0.76), '#ffffff', 0, 4.1, 0.03).skin(UV.white);
    colliders.addSegment(...gateToWorld(-3.3, 0), ...gateToWorld(3.3, 0), 'fence', null, 0.3);
    for (const sx of [-1, 1]) colliders.addBox(...gateToWorld(sx * 6.5, (Z0 + Z1) / 2), 5.4, D + 0.4, -gry, 'building');
  }
  ctx.reserve({ ring: [[-HW - 2, -5], [HW + 2, -5], [HW + 2, 4], [-HW - 2, 4]].map(([x, z]) => gateToWorld(x, z)) });

  // ---------------------------------------------------------------- perimeter railing
  // Open polyline from one side of the gate all the way round to the other.
  const n = ring.length;
  const pE = [gx + gs.dx * HW, gz + gs.dz * HW], pS = [gx - gs.dx * HW, gz - gs.dz * HW];
  const raw = [pE];
  for (let k = 1; k <= n; k++) raw.push(ring[(near.i + k) % n]);
  raw.push(pS);
  const line = simplify(raw, 1.2, geo);
  gb.setFrame(0, 0, 0, 0);
  const railPts = [];
  let u = 0, sincePier = 0;
  const pierStep = low ? 18 : 11;
  const pier = (x, z) => {
    const h = H(x, z);
    gb.box(0.6, 2.55, 0.6, PIER, x, h + 1.0, z);
    gb.box(0.8, 0.18, 0.8, PIER_CAP, x, h + 2.33, z);
    gb.sphere(0.17, 0, PIER_CAP, x, h + 2.55, z);
  };
  pier(...pE);
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const L = Math.hypot(bx - ax, bz - az);
    const pieces = Math.max(1, Math.ceil(L / 5));
    for (let p = 0; p <= pieces; p++) {
      if (p === 0 && k > 1) continue;
      const t = p / pieces, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (p > 0) {
        const px = ax + (bx - ax) * ((p - 1) / pieces), pz = az + (bz - az) * ((p - 1) / pieces);
        const h0 = Math.min(H(px, pz), H(x, z)), h1 = Math.max(H(px, pz), H(x, z));
        run(gb, px, pz, x, z, h0 - 0.45, h1 - h0 + 0.95, 0.38, PLINTH);
        sincePier += L / pieces;
        u += L / pieces / 1.15;
      }
      railPts.push({ x, z, y0: H(x, z) + 0.45, y1: H(x, z) + 2.2, u });
      // piers at regular spacing and wherever the railing turns a corner
      let corner = false;
      if (p === pieces && k < line.length - 1) {
        const [cx2, cz2] = line[k + 1], L2 = Math.hypot(cx2 - bx, cz2 - bz) || 1;
        corner = ((bx - ax) * (cx2 - bx) + (bz - az) * (cz2 - bz)) / (L * L2) < 0.94;
      }
      if ((corner || sincePier > pierStep) && !(p === pieces && k === line.length - 1)) { pier(x, z); sincePier = 0; }
    }
  }
  pier(...pS);
  iron.strip(railPts);
  colliders.addPolyline(line, false, 'fence', null, 0.3);

  // ---------------------------------------------------------------- paddocks and animals
  const place = (x, z, ry, s, fn, ...args) => { ab.setFrame(x, H(x, z), z, ry, s); fn(ab, ...args); };
  const faceSeg = (sg) => Math.atan2(-sg.inx, -sg.inz);
  const groups = [];
  // trampled sandy ground of a paddock, draped over the terrain with a ragged edge
  const paddock = (x0, z0, r, col) => {
    const SEG = 18, RINGS = 3, pos = [];
    const P = (k, j) => {
      const a = (j / SEG) * Math.PI * 2;
      const rr = ((r * k) / RINGS) * (k === RINGS ? 0.82 + 0.3 * Math.abs(Math.sin(a * 2.3 + x0)) : 1);
      const x = x0 + Math.cos(a) * rr, z = z0 + Math.sin(a) * rr;
      return [x, H(x, z) + 0.08, z];
    };
    for (let k = 0; k < RINGS; k++) {
      for (let j = 0; j < SEG; j++) {
        const a = P(k, j), b = P(k, j + 1), c = P(k + 1, j), d = P(k + 1, j + 1);
        if (k) pos.push(...a, ...b, ...d);
        pos.push(...a, ...d, ...c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gb.add(g, col);
  };
  const feeder = ([x, z]) => {
    const h = H(x, z);
    gb.cyl(0.12, 0.15, 4.4, 6, '#7a5a3a', x, h + 2.2, z);
    gb.cyl(0.7, 0.45, 0.6, 8, '#6b4f33', x, h + 4.4, z);
    gb.cone(0.62, 0.5, 8, '#d8c27a', x, h + 4.9, z);
  };

  // savannah behind the gate: giraffes and their feeder, so they show in the stop's photo
  {
    const f = faceSeg(gs);
    const P = (a, i) => fencePoint(gs, along + a, i);
    const side = Math.PI / 2;
    place(...P(-2.4, 8.2), f + side - 0.35, 1, giraffe, 0.0);
    place(...P(3.8, 10.8), f - side + 0.3, 1.05, giraffe, 1.7);
    place(...P(-6.0, 9.4), f + side - 0.15, 0.62, giraffe, 3.1);
    feeder(P(0.8, 15.5));
    groups.push({ x: P(0, 11)[0], z: P(0, 11)[1], r: 10 });
    paddock(...P(0, 10.5), 7.5, '#d3bf8c');
  }
  // flamingo pond to the west of the gate
  {
    const sg = segInfo((near.i - 1 + n) % n);
    const [px, pz] = fencePoint(sg, sg.L * 0.45, 7.5);
    const ph = H(px, pz);
    gb.place(new THREE.CylinderGeometry(1, 1, 0.3, 14), '#b8ad94', px, ph + 0.02, pz, 0, 0, 0, 3.6, 1, 2.5);
    gb.place(new THREE.CylinderGeometry(1, 1, 0.06, 14), '#6db3d6', px, ph + 0.16, pz, 0, 0, 0, 3.3, 1, 2.25);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      gb.sphere(0.28 + rnd() * 0.15, 0, '#a59a86', px + Math.cos(a) * 3.5, ph + 0.12, pz + Math.sin(a) * 2.4, 1, 0.6, 1);
    }
    const f = faceSeg(sg);
    const spots = [[-1.6, 0.4], [-0.5, -0.9], [0.8, 0.6], [1.9, -0.3], [0.2, 1.4], [-2.6, -0.6], [2.8, 1.0]];
    spots.slice(0, low ? 4 : 7).forEach(([ox, oz], i) => {
      const x = px + ox, z = pz + oz;
      ab.setFrame(x, ph + (Math.hypot(ox / 3.3, oz / 2.25) < 1 ? 0.0 : 0.05), z, f + (rnd() - 0.5) * 2.5, 1);
      flamingo(ab, i * 1.3, i % 3 === 1);
    });
    groups.push({ x: px, z: pz, r: 7 });
  }
  // elephants on the east side of the gate
  {
    const sg = segInfo((near.i + 1) % n);
    const [ex, ez] = fencePoint(sg, sg.L * 0.55, 7.5);
    const f = faceSeg(sg);
    place(ex, ez, f + 0.25, 1, elephant, 0);
    const [bx2, bz2] = fencePoint(sg, sg.L * 0.55 - 3.6, 8.5);
    place(bx2, bz2, f - 0.35, 0.55, elephant, 2.0);
    const [mx, mz] = fencePoint(sg, sg.L * 0.55 + 3.8, 9.0);
    gb.place(new THREE.CylinderGeometry(1, 1, 0.08, 12), '#7a6248', mx, H(mx, mz) + 0.05, mz, 0, 0.5, 0, 2.2, 1, 1.5);
    beam(gb, [mx - 2.6, H(mx, mz) + 0.3, mz + 1.6], [mx - 0.4, H(mx, mz) + 0.3, mz + 2.3], 0.5, 0.5, '#6e5238');
    groups.push({ x: ex, z: ez, r: 8, elephant: true });
    paddock(ex, ez, 6.5, '#bfa77c');
  }
  // lions on their rock further west along Viale del Giardino Zoologico
  {
    const ln = nearestSegment(ring, 47.9, -235.9, geo);
    const sg = segInfo(ln.i);
    const [rx, rz] = fencePoint(sg, ln.t * sg.L, 7.5);
    const rh = H(rx, rz), f = faceSeg(sg);
    const rock = new THREE.IcosahedronGeometry(1, 1);
    const rp = rock.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const k = 0.85 + 0.25 * Math.abs(Math.sin(rp.getX(i) * 4.1 + rp.getZ(i) * 2.7));
      rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k, rp.getZ(i) * k);
    }
    gb.place(rock, '#a39a8a', rx, rh + 0.4, rz, 0, f, 0, 2.4, 1.5, 1.8);
    gb.place(new THREE.IcosahedronGeometry(1, 0), '#8f8778', rx + 1.9, rh + 0.3, rz - 1.0, 0, 0.4, 0, 1.2, 0.8, 1.0);
    ab.setFrame(rx, rh + 1.72, rz, f, 1);
    lion(ab, 0, true);
    const [lx, lz] = fencePoint(sg, ln.t * sg.L + 2.8, 4.6);
    ab.setFrame(lx, H(lx, lz), lz, f - 0.6, 0.9);
    lion(ab, 1.5, false);
    groups.push({ x: rx, z: rz, r: 8, lion: true });
    paddock(rx, rz, 5.5, '#ccb27e');
  }
  // giraffes and zebras along Viale dell'Uccelliera, at the zoo's south-east corner
  {
    const ln = nearestSegment(ring, 172.7, -192.6, geo);
    const sg = segInfo(ln.i);
    const mid = ln.t * sg.L, f = faceSeg(sg);
    const P = (a, i) => fencePoint(sg, mid + a, i);
    place(...P(-4, 8.5), f + 1.75, 1, giraffe, 0.6);
    place(...P(4, 11), f - 1.3, 0.95, giraffe, 2.4);
    if (!low) place(...P(-11, 9.5), f + 1.3, 0.95, zebra, 0.3);
    place(...P(-8, 6.5), f - 1.6, 1, zebra, 1.9);
    place(...P(-5.5, 10.5), f + 1.9, 0.9, zebra, 4.1);
    feeder(P(0, 15));
    groups.push({ x: P(-3, 10)[0], z: P(-3, 10)[1], r: 13 });
    paddock(...P(-3, 10), 9.5, '#d3bf8c');
  }
  // a pair of giraffes at the west end, where Viale del Giardino Zoologico starts
  {
    const ln = nearestSegment(ring, 5, -222, geo);
    const sg = segInfo(ln.i);
    const mid = ln.t * sg.L, f = faceSeg(sg);
    const P = (a, i) => fencePoint(sg, mid + a, i);
    place(...P(0, 8.5), f + 1.3, 1, giraffe, 4.2);
    place(...P(-3.2, 9.8), f + 1.45, 0.65, giraffe, 5.3);
    place(...P(8, 7.5), f - 1.7, 1, zebra, 2.7);
    groups.push({ x: P(3, 10)[0], z: P(3, 10)[1], r: 10 });
    paddock(...P(3, 9.5), 7.5, '#d3bf8c');
  }
  // fallow deer grazing in the Parco dei Daini, north-east of the Galleria
  const DEER = { x: 354.5, z: -148 };
  const deerSpots = [[352, -147, 2.2, true], [357, -150.5, -0.6, false], [348.5, -151.5, 0.9, false], [361, -145, 3.3, false]];
  deerSpots.slice(0, low ? 2 : 4).forEach(([x, z, ry, stag], i) => {
    if (!terrain.isInside(x, z)) return;
    ab.setFrame(x, H(x, z), z, ry, 1);
    deer(ab, i * 1.7, stag);
    colliders.addCircle(x, z, 0.6, 'animal');
  });
  ctx.reserve({ ...DEER, r: 9 });

  for (const g of groups) ctx.reserve({ x: g.x, z: g.z, r: g.r });

  // trees inside the zoo, kept away from paddocks, the fence and the zoo's buildings
  {
    const trng = ctx.rng('east-zoo-trees');
    const kinds = ['umbrellaPine', 'holmOak', 'plane', 'umbrellaPine', 'holmOak', 'palm'];
    const blds = MAP.BUILDINGS.filter((b) => inZoo(b.r[0][0], b.r[0][1]));
    let planted = 0;
    for (let tries = 0; tries < 900 && planted < (low ? 26 : 44); tries++) {
      const p = geo.randomPointInRing(ring, trng);
      if (!p) continue;
      const [x, z] = p;
      if (geo.distToRingEdge(x, z, ring) < 4) continue;
      if (groups.some((g) => Math.hypot(g.x - x, g.z - z) < g.r + 3)) continue;
      if (Math.hypot(x - gx, z - gz) < 14) continue;
      if (blds.some((b) => geo.pointInRing(x, z, b.r) || geo.distToRingEdge(x, z, b.r) < 3)) continue;
      ctx.plant(kinds[Math.floor(trng() * kinds.length)], x, z, { scale: 0.85 + trng() * 0.4, ry: trng() * 6.28 });
      planted++;
    }
  }

  const staticMesh = gb.build(undefined, { name: 'bioparco' });
  const ironMesh = iron.build(railingMaterial(), { name: 'bioparco-railing' });
  const animals = ab.build(animalMats.material, animalMats.depthMaterial, 'bioparco-animals');
  const elephantGroup = groups.find((g) => g.elephant), lionGroup = groups.find((g) => g.lion);
  return {
    meshes: [staticMesh, ironMesh, animals].filter(Boolean),
    gate: { x: gx, z: gz },
    elephant: elephantGroup ? { x: elephantGroup.x, z: elephantGroup.z } : null,
    lion: lionGroup ? { x: lionGroup.x, z: lionGroup.z } : null,
    deer: DEER,
  };
}
