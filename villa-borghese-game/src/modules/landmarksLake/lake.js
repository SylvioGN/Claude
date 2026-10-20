// Life on the Giardino del Lago: the boat-rental pier and kiosk with moored boats, the closed
// footbridge to the island, reeds, water lilies, turtles sunning on a rock, rowing boats gliding
// round the lake with their oars dipping, mallard families and a pair of swans. The animated
// things are a handful of InstancedMeshes updated only while the camera is near the lake.
import * as THREE from 'three';
import { GeoBuilder, PALETTE, mats } from '../../core/util.js';
import { pointInRing, distToRingEdge, closestOnPolyline } from '../../core/geo.js';
import { frame, headingOf, template, stamp, mat, loopPath, rockGeometry, limb, absorb } from './kit.js';

const WOOD = '#a77b4f', WOOD_DARK = '#7d5a3a', WOOD_LIGHT = '#c49a68';

// Boat routes (game units), checked to stay 2.5+ units off the shore, the island and the pier.
const BOAT_LOOP = [[-108, -99.5], [-100, -93], [-87, -94], [-77.5, -101], [-75.5, -111], [-80, -120.5], [-87, -125], [-90.5, -117], [-89, -106], [-99, -105], [-106, -104]];
const DUCK_LOOPS = [
  [[-80, -96], [-73, -102], [-72, -110], [-76, -104]],
  [[-96, -129], [-88, -133], [-84, -126.5], [-92, -127]],
  [[-106, -91.5], [-98, -90.5], [-92, -92], [-100, -94]],
];
const SWAN_LOOP = [[-111, -113], [-113.5, -106], [-117, -100.5], [-113, -104]];

export function buildLake(ctx, env) {
  const { MAP, terrain: T, WATER_Y } = ctx;
  const lake = MAP.WATER.find((w) => w.k === 'lake');
  const island = lake.h[0];
  const rnd = ctx.rng('lake-life');
  const gb = new GeoBuilder();
  const quality = ctx.quality;

  const inWater = (x, z, pad = 0) => pointInRing(x, z, lake.r) && !pointInRing(x, z, island)
    && distToRingEdge(x, z, lake.r) > pad && distToRingEdge(x, z, island) > pad;
  const boatPath = BOAT_LOOP;
  const nearBoats = (x, z, d) => closestOnPolyline(x, z, boatPath, true).d < d;

  // ---------------------------------------------------------------- boat-rental pier and kiosk
  const P0 = [MAP.ANCHORS.boats.x, MAP.ANCHORS.boats.z];
  const pier = frame(P0[0], 0, P0[1], headingOf(0.6, -0.8)); // looks out over the lake
  const pg = new GeoBuilder();
  const deckY = 0.12, pierLen = 8;
  // landing deck on the shore and the pier running out into the water
  for (let x = -4.2; x < 1.2; x += 0.42) pg.box(0.38, 0.12, 3.2, (Math.round(x * 10) % 3) ? WOOD : WOOD_LIGHT, x + 0.21, deckY - 0.06, -0.2);
  for (let z = 1.4; z < pierLen; z += 0.4) pg.box(1.7, 0.12, 0.36, (Math.round(z * 10) % 3) ? WOOD : WOOD_LIGHT, 0, deckY - 0.06, z + 0.2);
  pg.box(0.15, 0.2, pierLen - 1.4, WOOD_DARK, -0.82, deckY - 0.18, (pierLen + 1.4) / 2);
  pg.box(0.15, 0.2, pierLen - 1.4, WOOD_DARK, 0.82, deckY - 0.18, (pierLen + 1.4) / 2);
  for (let z = 1.6; z <= pierLen; z += 2.1) {
    for (const s of [-1, 1]) {
      pg.cyl(0.1, 0.1, 1.6, 6, WOOD_DARK, s * 0.85, deckY - 0.6, z);
      pg.cyl(0.11, 0.11, 0.55, 6, WOOD_DARK, s * 0.85, deckY + 0.27, z);   // mooring bollards
      pg.cyl(0.13, 0.13, 0.06, 6, '#e8e1d2', s * 0.85, deckY + 0.56, z);
    }
  }
  for (const [x, z] of [[-4.0, -1.7], [-4.0, 1.3], [1.0, 1.3], [1.0, -1.7]]) pg.cyl(0.12, 0.12, 1.4, 6, WOOD_DARK, x, deckY - 0.6, z);
  // kiosk: cream planks, green trim, striped awning over the ticket window, life ring
  const kx = -2.6, kz = -0.6;
  pg.box(2.4, 2.3, 1.8, '#efe3c4', kx, deckY + 1.15, kz);
  for (let i = 0; i < 6; i++) pg.box(2.42, 0.04, 1.82, '#d9c9a4', kx, deckY + 0.3 + i * 0.36, kz);
  pg.box(2.5, 0.25, 1.9, '#3f7a50', kx, deckY + 2.38, kz);
  const roof = new THREE.Shape([new THREE.Vector2(-1.55, 0), new THREE.Vector2(1.55, 0), new THREE.Vector2(0, 0.9)]);
  pg.extrude(roof, 2.4, '#3f7a50', kx, deckY + 2.5, kz - 1.2);
  // ticket window, counter, awning and sign face the avenue (local -z)
  pg.box(1.2, 0.85, 0.08, '#4a6a78', kx, deckY + 1.35, kz - 0.9);
  pg.box(1.4, 0.12, 0.3, '#3f7a50', kx, deckY + 0.88, kz - 1.0);
  for (let i = 0; i < 5; i++) pg.box(0.3, 0.06, 0.75, i % 2 ? '#ffffff' : '#d9473b', kx - 0.6 + i * 0.3, deckY + 1.95, kz - 1.25, 0, -0.45);
  pg.torus(0.32, 0.08, 6, 12, '#f07b2e', kx + 1.21, deckY + 1.2, kz + 0.2, 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pg.box(0.06, 0.12, 0.2, '#ffffff', kx + 1.24, deckY + 1.2 + Math.sin(a) * 0.32, kz + 0.2 + Math.cos(a) * 0.32, 0, -a);
  }
  env.decals.quad(2.1, 0.52, env.R.boatSign, pier.m.clone().multiply(mat(kx, deckY + 2.8, kz - 1.22, Math.PI)));
  // oars leaning on the kiosk and a little railing on the landing
  for (let i = 0; i < 3; i++) pg.box(0.07, 2.2, 0.05, WOOD_LIGHT, kx + 1.3 + i * 0.12, deckY + 1.05, kz - 0.6 + i * 0.25, 0, 0, -0.12);
  for (let x = -4.0; x <= -0.9; x += 0.78) pg.cyl(0.05, 0.05, 0.9, 5, WOOD_DARK, x, deckY + 0.45, 1.3);
  pg.box(3.2, 0.08, 0.08, WOOD, -2.45, deckY + 0.88, 1.3);
  absorb(gb, pg, pier.m);
  ctx.colliders.addBox(...pier.w(kx, kz), 2.5, 1.9, -pier.h, 'building', { name: 'boat-kiosk' });
  ctx.reserve({ x: P0[0], z: P0[1], r: 5 });

  // ---------------------------------------------------------------- boats
  const boatTemplates = [
    boatTemplate({ hull: '#6fbf9a', stripe: '#ffffff', people: [['rower', '#ffffff', '#3b2a1e'], ['kid', '#e5533d', '#5a3b26'], ['lady', '#f4d35e', '#8a5a3c', '#f6eedc']] }),
    boatTemplate({ hull: '#6fa8d8', stripe: '#fff6e3', people: [['rower', '#e88aa4', '#d9b26a'], ['kid', '#4f9a5a', '#2b211a', '#3a5fa8']] }),
  ];
  const emptyBoats = [
    boatTemplate({ hull: '#6fbf9a', stripe: '#ffffff', people: [] }),
    boatTemplate({ hull: '#6fa8d8', stripe: '#fff6e3', people: [] }),
    boatTemplate({ hull: '#f2e6c9', stripe: '#c9673e', people: [] }),
  ];
  // moored boats along the pier
  const mooredY = WATER_Y - 0.18;
  for (const [i, x, z] of [[0, 1.85, 3.3], [1, 1.85, 6.2], [2, -1.85, 4.6], [0, -1.85, 7.4]]) {
    const [wx, wz] = pier.w(x, z);
    stamp(gb, emptyBoats[i], mat(wx, mooredY, wz, pier.h + (x > 0 ? 0.04 : -0.04)));
    const [ox, oz] = pier.w(x * 0.55, z + 1.1);
    gb.box(0.03, 0.03, Math.hypot(wx - ox, wz - oz), '#e8dcc0', (wx + ox) / 2, deckY + 0.1, (wz + oz) / 2, Math.atan2(ox - wx, oz - wz));
  }

  // ---------------------------------------------------------------- footbridge to the island (closed by a gate)
  // OSM's footbridge (it is not in MAP.PATHS: nobody may cross it, and neither may the cart)
  const shoreEnd = [-111.0, -125.0], islandEnd = [-106.0, -121.0];
  {
    // the avenue hugs the shore here, so the deck and its gate start right at the water's edge
    const L = Math.hypot(islandEnd[0] - shoreEnd[0], islandEnd[1] - shoreEnd[1]) + 1.2;
    const bf = frame(shoreEnd[0], 0, shoreEnd[1], headingOf(islandEnd[0] - shoreEnd[0], islandEnd[1] - shoreEnd[1]));
    const fg = new GeoBuilder();
    const y = 0.28, z0 = 0, n = Math.ceil(L / 0.4);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, z = z0 + t * L, arch = Math.sin(t * Math.PI) * 0.35;
      fg.box(1.5, 0.1, 0.36, i % 3 ? WOOD : WOOD_LIGHT, 0, y + arch, z);
    }
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, z = z0 + t * L, arch = Math.sin(t * Math.PI) * 0.35;
      for (const s of [-1, 1]) {
        fg.cyl(0.035, 0.035, 0.95, 5, PALETTE.ironBlack, s * 0.72, y + arch + 0.5, z);
        if (i > 0 && i < 4) fg.cyl(0.09, 0.09, 1.4, 6, WOOD_DARK, s * 0.72, y - 0.6, z);
      }
    }
    for (const s of [-1, 1]) {
      for (const hh of [0.5, 0.95]) {
        for (let i = 0; i < 4; i++) {
          const t0 = i / 4, t1 = (i + 1) / 4, za = z0 + t0 * L, zb = z0 + t1 * L;
          const ya = y + Math.sin(t0 * Math.PI) * 0.35 + hh, yb = y + Math.sin(t1 * Math.PI) * 0.35 + hh;
          fg.box(0.04, 0.04, Math.hypot(zb - za, yb - ya), PALETTE.ironBlack, s * 0.72, (ya + yb) / 2, (za + zb) / 2, 0, -Math.atan2(yb - ya, zb - za));
        }
      }
    }
    // locked gate at the shore end: two stone piers and iron bars
    const gz = z0 + 0.6;
    for (const s of [-1, 1]) {
      fg.box(0.4, 2.2, 0.4, PALETTE.travertine, s * 1.0, y + 0.3, gz);
      fg.sphere(0.2, 0, PALETTE.travertine, s * 1.0, y + 1.55, gz);
    }
    for (let i = 0; i < 9; i++) fg.cyl(0.025, 0.025, 1.3, 4, PALETTE.ironBlack, -0.75 + i * 0.19, y + 0.75, gz);
    fg.box(1.6, 0.05, 0.05, PALETTE.ironBlack, 0, y + 1.37, gz);
    fg.box(1.6, 0.05, 0.05, PALETTE.ironBlack, 0, y + 0.25, gz);
    absorb(gb, fg, bf.m);
  }

  // ---------------------------------------------------------------- reeds, lilies, rocks, turtles
  const reedCols = ['#6f8f3c', '#88a24a', '#5d7d36', '#7a9a44'];
  const bridgeMid = [(shoreEnd[0] + islandEnd[0]) / 2, (shoreEnd[1] + islandEnd[1]) / 2];
  const keepClear = (x, z) => Math.hypot(x - P0[0], z - P0[1]) < 10 || Math.hypot(x - bridgeMid[0], z - bridgeMid[1]) < 5;
  const edgeSamples = (ring, step) => {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let d = 0; d < L; d += step) out.push([a[0] + ((b[0] - a[0]) * d) / L, a[1] + ((b[1] - a[1]) * d) / L, (b[0] - a[0]) / L, (b[1] - a[1]) / L]);
    }
    return out;
  };
  // point offset `off` from the edge into the water
  const intoWater = (x, z, dx, dz, off) => {
    for (const s of [1, -1]) {
      const px = x - dz * s * off, pz = z + dx * s * off;
      if (inWater(px, pz, off * 0.6)) return [px, pz];
    }
    return null;
  };
  const shore = [...edgeSamples(lake.r, 3.0), ...edgeSamples(island, 2.5).map((p) => [...p, true])];
  const reedClumps = [], lilyClumps = [];
  for (const [x, z, dx, dz, isl] of shore) {
    if (keepClear(x, z)) continue;
    const r = rnd();
    if (quality.tier === 'low' && rnd() < 0.4) continue;
    if (r < (isl ? 0.22 : 0.3)) reedClumps.push(intoWater(x, z, dx, dz, 0.9 + rnd() * 0.4));
    else if (r < 0.48 && !isl) lilyClumps.push(intoWater(x, z, dx, dz, 2.0 + rnd() * 1.5));
  }
  const temple = MAP.ANCHORS.esculapio;
  for (const p of reedClumps) {
    if (!p) continue;
    // keep the postcard front of the temple open
    if (Math.hypot(p[0] - (temple.x + 6), p[1] - (temple.z + 4.5)) < 6) continue;
    const n = 9 + Math.floor(rnd() * 7);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 0.9;
      const h = 1.1 + rnd() * 0.9;
      const x = p[0] + Math.cos(a) * d, z = p[1] + Math.sin(a) * d;
      gb.place(new THREE.ConeGeometry(0.06, h, 3), reedCols[i % 4], x, WATER_Y + h / 2 - 0.1, z, (rnd() - 0.5) * 0.25, rnd() * 3, (rnd() - 0.5) * 0.25);
      if (rnd() < 0.3) gb.cyl(0.06, 0.06, 0.3, 5, '#6b4423', x, WATER_Y + h * 0.78, z);
    }
  }
  const padCols = ['#4f8a3a', '#5f9a45', '#467d34'];
  for (const p of lilyClumps) {
    if (!p || nearBoats(p[0], p[1], 2.2)) continue;
    const n = 5 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 1.6;
      const x = p[0] + Math.cos(a) * d, z = p[1] + Math.sin(a) * d;
      if (!inWater(x, z, 0.4)) continue;
      const r = 0.3 + rnd() * 0.25;
      gb.place(new THREE.CircleGeometry(r, 8, 0.35, Math.PI * 2 - 0.7), padCols[i % 3], x, WATER_Y + 0.025 + i * 0.002, z, -Math.PI / 2, 0, rnd() * 6);
      if (rnd() < 0.35) {
        const pink = rnd() < 0.6;
        gb.place(new THREE.ConeGeometry(0.16, 0.18, 6), pink ? '#f3a6c0' : '#fbf6ee', x + 0.05, WATER_Y + 0.13, z, Math.PI, 0, 0);
        gb.sphere(0.05, 0, '#f2c94c', x + 0.05, WATER_Y + 0.2, z);
      }
    }
  }
  // accent boulders on the outer shore
  const rockCols = ['#a39b8a', '#948c7b', '#b4ab97'];
  for (const [x, z, dx, dz] of edgeSamples(lake.r, 9)) {
    if (keepClear(x, z) || rnd() < 0.4) continue;
    const r = 0.5 + rnd() * 0.5;
    gb.place(rockGeometry(rnd, r), rockCols[Math.floor(rnd() * 3)], x - dz * 0.2, WATER_Y + 0.05, z + dx * 0.2, 0, rnd() * 6, 0, 1.2, 0.6, 1);
  }
  // turtle rock near the east shore, where kids pass on Viale del Lago
  const tr = [-71.8, -102.4];
  gb.place(rockGeometry(rnd, 1.1, 1), '#8f8877', tr[0], WATER_Y - 0.2, tr[1], 0, 0.6, 0, 1.25, 0.62, 1.05);
  gb.place(rockGeometry(rnd, 0.7), '#9d9583', tr[0] + 1.3, WATER_Y - 0.1, tr[1] + 0.6, 0, 1, 0, 1, 0.55, 1);
  const turtle = template((t) => {
    t.dome(0.3, 8, 3, '#4f5a2c', 0, 0.03, 0, 0.55);
    t.dome(0.16, 6, 2, '#6f7a3a', 0, 0.12, 0, 0.55);
    t.cyl(0.31, 0.31, 0.04, 8, '#c9b45a', 0, 0.03, 0);
    t.sphere(0.09, 0, '#8d9150', 0, 0.08, 0.36, 1, 0.8, 1.3);
    t.box(0.05, 0.03, 0.12, '#e8c84a', 0.07, 0.1, 0.36);
    for (const [x, z] of [[-0.22, 0.18], [0.22, 0.18], [-0.2, -0.18], [0.2, -0.18]]) t.sphere(0.07, 0, '#7f8448', x, 0.02, z, 1.3, 0.5, 1);
    t.cone(0.05, 0.12, 4, '#7f8448', 0, 0.03, -0.33);
  });
  for (const [dx, dz, ry, s, dy] of [[-0.45, 0.05, 2.2, 1.6, 0.42], [0.45, -0.3, 1.4, 1.4, 0.45], [0.1, 0.5, 2.9, 1.2, 0.36], [1.35, 0.6, 2.4, 1.15, 0.22]]) {
    stamp(gb, turtle, mat(tr[0] + dx, WATER_Y - 0.2 + dy, tr[1] + dz, ry, s, -0.12));
  }

  // monumental holm oak: low stone ring round its foot (vegetation plants the tree)
  const lec = MAP.ANCHORS.leccio;
  const np = T.nearestPath(lec.x, lec.z);
  let ox = lec.x, oz = lec.z;
  if (np && np.d < np.w / 2 + 2.2) {
    const ux = (lec.x - np.x) / (np.d || 1), uz = (lec.z - np.z) / (np.d || 1);
    ox = np.x + ux * (np.w / 2 + 2.2); oz = np.z + uz * (np.w / 2 + 2.2);
  }
  ctx.plant('holmOak', ox, oz, { scale: 1.9 });
  ctx.colliders.addCircle(ox, oz, 2.0, 'tree', { name: 'leccio' });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    gb.box(0.75, 0.42, 0.35, i % 2 ? '#c9bea6' : '#b8ac93', ox + Math.cos(a) * 1.7, T.heightAt(ox, oz) + 0.2, oz + Math.sin(a) * 1.7, -a + Math.PI / 2);
  }

  const life = gb.build(undefined, { name: 'lake-life', castShadow: false });
  env.group.add(life);

  // ---------------------------------------------------------------- animated: boats, oars, birds
  const boatsN = quality.tier === 'low' ? 3 : 4;
  const loop = loopPath(BOAT_LOOP);
  const boatMeshes = boatTemplates.map((g, i) => {
    const im = new THREE.InstancedMesh(g, mats().vcFlat, Math.ceil((boatsN - i) / 2));
    im.name = `lake-boats-${i}`;
    im.castShadow = true;
    return im;
  });
  const oarGeo = template((t) => {
    t.cyl(0.035, 0.035, 2.5, 5, WOOD_LIGHT, 0.85, 0, 0, 0, 0, Math.PI / 2);
    t.box(0.55, 0.03, 0.2, WOOD_LIGHT, 2.3, 0, 0);
    t.cyl(0.045, 0.045, 0.2, 5, WOOD_DARK, -0.45, 0, 0, 0, 0, Math.PI / 2);
  });
  const oars = new THREE.InstancedMesh(oarGeo, mats().vcFlat, boatsN * 2);
  oars.name = 'lake-oars';
  // same average speed for every boat so they keep their spacing round the loop
  const boats = Array.from({ length: boatsN }, (_, i) => ({
    s: (loop.length * i) / boatsN, ph: rnd() * 6, mesh: boatMeshes[i % 2], idx: Math.floor(i / 2),
  }));

  const duckTpl = duckTemplate();
  const drakeTpl = duckTemplate(true);
  const swanTpl = swanTemplate();
  const families = DUCK_LOOPS.map((pts, i) => ({ path: loopPath(pts), s: rnd() * 30, v: 0.55 + i * 0.05, rush: 0, kids: [5, 3, 4][i] }));
  const nDrakes = families.length, nDucks = families.reduce((a, f) => a + 1 + f.kids, 0);
  const drakes = new THREE.InstancedMesh(drakeTpl, mats().vcFlat, nDrakes);
  const ducks = new THREE.InstancedMesh(duckTpl, mats().vcFlat, nDucks);
  drakes.name = 'lake-drakes'; ducks.name = 'lake-ducks';
  const swanPath = loopPath(SWAN_LOOP);
  const swans = new THREE.InstancedMesh(swanTpl, mats().vcFlat, 2);
  swans.name = 'lake-swans';
  const col = new THREE.Color();
  let k = 0;
  for (const f of families) {
    ducks.setColorAt(k++, col.set('#a37b54'));
    for (let i = 0; i < f.kids; i++) ducks.setColorAt(k++, col.set('#f6d860'));
  }
  const lakeSphere = new THREE.Sphere(new THREE.Vector3(-95, 0, -113), 40);
  for (const im of [...boatMeshes, oars, drakes, ducks, swans]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.boundingSphere = lakeSphere.clone();
    im.frustumCulled = true;
    env.group.add(im);
  }

  const M = new THREE.Matrix4(), B = new THREE.Matrix4(), O = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const pos = { x: 0, z: 0, h: 0 };
  const compose = (x, y, z, ry, rx = 0, rz = 0, s = 1) => M.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(s, s, s));

  // honk near the water: the ducks hurry away quacking
  ctx.events.on('honk', () => {
    const c = ctx.cart?.position;
    if (!c) return;
    for (const f of families) {
      f.path.at(f.s, pos);
      if (Math.hypot(pos.x - c.x, pos.z - c.z) < 26 && f.rush <= 0) {
        f.rush = 2.5;
        ctx.events.emit('animal', { kind: 'duck', x: pos.x, z: pos.z });
      }
    }
  });

  const animated = [...boatMeshes, oars, drakes, ducks, swans];
  function update(dt, t) {
    const cam = ctx.camera.position;
    // small lake life is invisible in the haze from far away: skip drawing and animating it
    const d = Math.hypot(cam.x - lakeSphere.center.x, cam.z - lakeSphere.center.z);
    life.visible = d < 250;
    for (const im of animated) im.visible = d < 170;
    if (d > 170) return;
    // rowing boats: speed surges with each stroke, oars sweep and dip
    boats.forEach((b, bi) => {
      const phase = t * 2.3 + b.ph;
      const stroke = Math.max(0, Math.sin(phase));
      b.s += dt * 1.3 * (0.55 + 0.75 * stroke);
      loop.at(b.s, pos);
      const bob = Math.sin(t * 1.4 + b.ph) * 0.035;
      B.compose(v.set(pos.x, WATER_Y - 0.2 + bob, pos.z), q.setFromEuler(e.set(-stroke * 0.03, pos.h, Math.sin(t * 1.1 + b.ph) * 0.03)), sc.set(1, 1, 1));
      b.mesh.setMatrixAt(b.idx, B);
      // blades sweep bow-to-stern in the water, then lift and swing back
      const yaw = 0.55 * Math.cos(phase), pitch = 0.175 + 0.095 * Math.max(-1, Math.min(1, Math.sin(phase) * 3));
      for (const side of [1, -1]) {
        O.compose(v.set(side * 0.62, 0.66, 0.15), q.setFromEuler(e.set(0, side > 0 ? -yaw : Math.PI + yaw, -pitch)), sc.set(1, 1, 1));
        oars.setMatrixAt(bi * 2 + (side > 0 ? 0 : 1), M.multiplyMatrices(B, O));
      }
    });
    for (const im of boatMeshes) im.instanceMatrix.needsUpdate = true;
    oars.instanceMatrix.needsUpdate = true;
    // duck families: mother leads, ducklings paddle behind in a wobbly line, drake nearby
    let di = 0;
    families.forEach((f, fi) => {
      f.rush = Math.max(0, f.rush - dt);
      f.s += dt * f.v * (f.rush > 0 ? 3 : 1);
      for (let i = 0; i <= f.kids; i++) {
        f.path.at(f.s - i * 0.75 - (i ? 0.4 : 0), pos);
        const w = Math.sin(t * 7 + i * 1.7 + fi);
        const s = i ? 0.55 : 1;
        compose(pos.x + w * 0.04, WATER_Y - 0.05 + Math.abs(w) * 0.02, pos.z, pos.h + w * 0.12, 0, w * 0.06, s);
        ducks.setMatrixAt(di++, M);
      }
      f.path.at(f.s + 1.4, pos);
      compose(pos.x + Math.sin(pos.h) * 0.3 + Math.cos(pos.h) * 0.9, WATER_Y - 0.05, pos.z + Math.cos(pos.h) * 0.3 - Math.sin(pos.h) * 0.9, pos.h + Math.sin(t * 0.8 + fi) * 0.2);
      drakes.setMatrixAt(fi, M);
    });
    ducks.instanceMatrix.needsUpdate = true;
    drakes.instanceMatrix.needsUpdate = true;
    // swans glide as a pair
    for (let i = 0; i < 2; i++) {
      swanPath.at(t * 0.32 + i * 2.6, pos);
      compose(pos.x, WATER_Y - 0.1 + Math.sin(t * 0.9 + i) * 0.02, pos.z, pos.h, 0, 0, i ? 0.92 : 1);
      swans.setMatrixAt(i, M);
    }
    swans.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { update };
}

// Rowing boat facing +z (bow), hull bottom at y = 0, with optional seated people.
// people: [kind, shirt, hair, hat?] with kind 'rower' (centre seat, faces the stern), 'kid' / 'lady' (stern seat).
function boatTemplate({ hull, stripe, people }) {
  return template((gb) => {
    const outline = [[0, 1.75], [0.42, 1.25], [0.62, 0.45], [0.64, -0.4], [0.55, -1.25], [0.5, -1.5], [-0.5, -1.5], [-0.55, -1.25], [-0.64, -0.4], [-0.62, 0.45], [-0.42, 1.25]];
    const shape = (pts, s = 1) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x * s, z * s)));
    const flat = (shp, depth, color, y) => {
      const g = new THREE.ExtrudeGeometry(shp, { depth, bevelEnabled: false, curveSegments: 1 });
      g.rotateX(Math.PI / 2);
      g.translate(0, y + depth, 0);
      gb.add(g, color);
    };
    flat(shape(outline, 0.8), 0.18, hull, 0);                     // keel
    flat(shape(outline), 0.3, hull, 0.15);                        // lower hull
    const band = shape(outline);
    band.holes.push(new THREE.Path(outline.map(([x, z]) => new THREE.Vector2(x * 0.86, z * 0.88)).reverse()));
    flat(band, 0.22, hull, 0.45);                                // topsides
    flat(band, 0.06, stripe, 0.67);                              // gunwale
    flat(shape(outline, 0.86), 0.02, WOOD_LIGHT, 0.46);           // floorboards
    for (const z of [-1.05, 0.5, 1.15]) gb.box(z > 1 ? 0.8 : 1.08, 0.06, 0.32, WOOD, 0, 0.6, z);
    for (const s of [-1, 1]) gb.cyl(0.03, 0.03, 0.14, 4, PALETTE.ironBlack, s * 0.62, 0.74, 0.15);
    for (const [kind, shirt, hair, hat] of people) {
      const rower = kind === 'rower', kid = kind === 'kid';
      const s = kid ? 0.75 : 1;
      const z = rower ? 0.5 : -1.05;           // the rower sits ahead of the oarlocks, facing the stern
      const x = rower ? 0 : kind === 'lady' ? -0.24 : 0.26;
      const dz = rower ? -1 : 1;               // which way the person looks
      const seat = 0.63;
      gb.box(0.38 * s, 0.16, 0.42 * s, '#3d4046', x, seat + 0.08, z + dz * 0.14 * s);   // thighs
      gb.box(0.34 * s, 0.34 * s, 0.13, '#3d4046', x, seat - 0.05, z + dz * 0.36 * s);   // shins
      const sy = seat + 0.15;
      gb.cyl(0.16 * s, 0.19 * s, 0.52 * s, 7, shirt, x, sy + 0.26 * s, z - dz * 0.04);
      const hy = sy + 0.67 * s;
      gb.sphere(0.14 * s, 1, '#e8b996', x, hy, z - dz * 0.04);
      gb.sphere(0.145 * s, 0, hair, x, hy + 0.05 * s, z - dz * 0.08, 1, 0.75, 1);
      if (hat) gb.cyl(0.26 * s, 0.26 * s, 0.03, 10, hat, x, hy + 0.1 * s, z - dz * 0.05);
      const shY = sy + 0.45 * s;
      if (rower) for (const side of [-1, 1]) limb(gb, [side * 0.2, shY, z - 0.04], [side * 0.14, 0.86, 0.08], 0.05, shirt);
      else if (kid) limb(gb, [x + 0.17 * s, shY, z], [x + 0.36 * s, shY + 0.42 * s, z + 0.08], 0.045, shirt); // waving
      else limb(gb, [x - 0.17, shY, z], [x - 0.42, 0.72, z + 0.12], 0.05, shirt);                           // hand on the gunwale
    }
  });
}

// Mallard facing +z, waterline at y = 0. Drakes get the green head and white collar; the
// plain one is pale so instance colours can turn it into a brown duck or a yellow duckling.
function duckTemplate(drake = false) {
  return template((g) => {
    const body = drake ? '#9a958c' : '#f4f0e6';
    g.sphere(0.24, 1, body, 0, 0.08, 0, 1, 0.68, 1.45);
    if (drake) {
      g.sphere(0.17, 0, '#6e4a33', 0, 0.12, 0.2, 1.1, 0.9, 0.8);   // chestnut breast
      g.cyl(0.075, 0.075, 0.03, 8, '#ffffff', 0, 0.3, 0.24);
      g.cyl(0.04, 0.03, 0.1, 5, '#2b2b2e', 0, 0.13, -0.38, 0, -1.1);
    } else {
      g.cone(0.08, 0.16, 5, body, 0, 0.14, -0.36);
    }
    g.sphere(0.12, 1, drake ? '#2f7a45' : body, 0, 0.38, 0.27);
    g.box(0.07, 0.035, 0.13, drake ? '#e3c040' : '#e8963a', 0, 0.36, 0.42);
    for (const s of [-1, 1]) g.sphere(0.022, 0, '#1d1d1d', s * 0.09, 0.41, 0.33);
  });
}

// Mute swan facing +z, waterline at y = 0, about 1.6 long.
function swanTemplate() {
  return template((g) => {
    g.sphere(0.4, 1, '#fbfaf6', 0, 0.12, -0.05, 1, 0.62, 1.55);
    for (const s of [-1, 1]) g.sphere(0.3, 0, '#f1efe8', s * 0.2, 0.32, -0.2, 0.8, 0.55, 1.5);
    g.cone(0.14, 0.32, 5, '#fbfaf6', 0, 0.28, -0.72);
    const neck = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.25, 0.42), new THREE.Vector3(0, 0.62, 0.48), new THREE.Vector3(0, 0.98, 0.36), new THREE.Vector3(0, 1.12, 0.48),
    ]);
    g.add(new THREE.TubeGeometry(neck, 8, 0.075, 6), '#fbfaf6');
    g.sphere(0.1, 1, '#fbfaf6', 0, 1.14, 0.52, 0.9, 0.9, 1.2);
    g.place(new THREE.ConeGeometry(0.05, 0.2, 5), '#e8742e', 0, 1.1, 0.68, Math.PI / 2, 0, 0);
    g.sphere(0.04, 0, '#1d1d1d', 0, 1.13, 0.59);
  });
}
