// Fountains of the north-west: the Peschiera (the great fish pond) with a jetting island,
// lilies and koi that leap out of the water; the Fontana del Fiocco (Canina, 1830), a rockwork
// mound crowned by an arch with the Borghese eagle, two draped statues and a marble tazza with
// its plume of water; and the Mostra dell'Acqua Felix, a relief wall fountain on Viale Canonica.
// World draws the basins' water and plain rims; flowing water goes into the shared jets mesh.
import * as THREE from 'three';
import { GeoBuilder, mats } from '../../core/util.js';
import { ringCentroid, pointInRing, distToRingEdge, closestOnPolyline } from '../../core/geo.js';
import { frame, headingOf, figureTemplate, stamp, mat, template, rockGeometry, archPanel } from './kit.js';

const STONE = '#e3d9c3', STONE_SHADE = '#cdbf9f', ROCK = ['#b9ae96', '#a89d85', '#c4b9a0'];

// Water level of a MAP.WATER basin (world module when present, same rule otherwise).
function levelOf(ctx, w) {
  const lv = ctx.modules.world?.waterLevel?.(w);
  if (Number.isFinite(lv)) return lv;
  const [cx, cz] = ringCentroid(w.r);
  return ctx.terrain.heightAt(cx, cz) + 0.45;
}

// Flowing-water pieces (uv.v runs along the flow so one scrolling texture animates them all).
function column(rTop, rBottom, h, matrix, falling = false, seg = 10) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, true);
  if (falling) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); }
  g.applyMatrix4(matrix);
  return g;
}
function arc(points, r, matrix) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, r, 5);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setXY(i, uv.getY(i), 1 - u); }
  g.applyMatrix4(matrix);
  return g;
}
function splash(r0, r1, matrix) {
  const g = new THREE.RingGeometry(r0, r1, 14, 1);
  g.rotateX(-Math.PI / 2);
  g.applyMatrix4(matrix);
  return g;
}

export function buildPeschiera(ctx, env) {
  const w = ctx.MAP.WATER.find((x) => /Peschiera/.test(x.n || ''));
  if (!w) return null;
  const L = levelOf(ctx, w);
  const [cx, cz] = ringCentroid(w.r);
  const gb = new GeoBuilder();
  const rnd = ctx.rng('peschiera');
  const I = mat(cx, L, cz);

  // central island: stone drum, rocks, a tall jet and arcs of water falling back into the pond
  gb.cyl(2.1, 2.3, 0.9, 16, STONE, cx, L - 0.2, cz);
  gb.cyl(2.25, 2.25, 0.12, 16, '#efe6d2', cx, L + 0.28, cz);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    gb.place(rockGeometry(rnd, 0.55 + rnd() * 0.3), ROCK[i % 3], cx + Math.cos(a) * 0.9, L + 0.45, cz + Math.sin(a) * 0.9, 0, rnd() * 6, 0, 1, 0.8, 1);
  }
  gb.cyl(0.35, 0.55, 0.9, 8, STONE_SHADE, cx, L + 0.75, cz);
  env.jets.add(column(0.1, 0.22, 4.2, I.clone().multiply(mat(0, 1.2 + 2.1, 0))));
  env.jets.add(column(0.32, 1.25, 3.6, I.clone().multiply(mat(0, 1.2 + 1.6, 0)), true, 12));
  env.jets.add(splash(1.0, 2.6, I.clone().multiply(mat(0, 0.03, 0))));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(ca * (2.2 + t * 2.4), 0.35 + Math.sin(t * Math.PI) * 1.3 - t * 0.3, sa * (2.2 + t * 2.4)));
    env.jets.add(arc(pts, 0.05, I));
    env.jets.add(splash(0.15, 0.5, I.clone().multiply(mat(ca * 4.6, 0.03, sa * 4.6))));
  }
  // water lilies round the edges
  for (let k = 0; k < 5; k++) {
    let p = null;
    for (let t = 0; t < 20 && !p; t++) {
      const x = cx + (rnd() - 0.5) * 18, z = cz + (rnd() - 0.5) * 20;
      if (pointInRing(x, z, w.r) && distToRingEdge(x, z, w.r) > 1.2 && distToRingEdge(x, z, w.r) < 3 && Math.hypot(x - cx, z - cz) > 5.5) p = [x, z];
    }
    if (!p) continue;
    for (let i = 0; i < 6; i++) {
      const x = p[0] + (rnd() - 0.5) * 2, z = p[1] + (rnd() - 0.5) * 2;
      if (!pointInRing(x, z, w.r) || distToRingEdge(x, z, w.r) < 0.8) continue;
      gb.place(new THREE.CircleGeometry(0.3 + rnd() * 0.2, 8, 0.35, Math.PI * 2 - 0.7), i % 2 ? '#4f8a3a' : '#5f9a45', x, L + 0.03, z, -Math.PI / 2, 0, rnd() * 6);
      if (i === 2) gb.place(new THREE.ConeGeometry(0.15, 0.17, 6), '#f3a6c0', x, L + 0.12, z, Math.PI, 0, 0);
    }
  }
  env.group.add(gb.build(undefined, { name: 'peschiera', castShadow: false }));
  ctx.reserve({ ring: w.r });

  // koi that leap out of the pond now and then
  const koi = template((g) => {
    g.sphere(0.2, 1, '#f08a24', 0, 0, 0, 0.8, 0.85, 2.2);
    g.sphere(0.12, 0, '#ffffff', 0, 0.06, 0.12, 1.1, 0.8, 1.6);
    g.place(new THREE.ConeGeometry(0.18, 0.3, 4), '#e8742e', 0, 0, -0.55, -Math.PI / 2, 0, 0, 0.25, 1, 1);
    g.box(0.03, 0.14, 0.22, '#e8742e', 0, 0.18, 0);
    for (const s of [-1, 1]) g.sphere(0.03, 0, '#1d1d1d', s * 0.1, 0.05, 0.36);
  });
  const fish = new THREE.InstancedMesh(koi, mats().vcFlat, 2);
  fish.name = 'peschiera-koi';
  fish.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, L, cz), 14);
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  env.group.add(fish);
  const jumps = [0, 1].map((i) => ({ t: -1 - i * 2.3, x: 0, z: 0, dx: 0, dz: 0 }));
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3();
  const DUR = 1.2;
  return {
    update(dt) {
      const cam = ctx.camera.position;
      fish.visible = Math.hypot(cam.x - cx, cam.z - cz) < 110;
      if (!fish.visible) return;
      jumps.forEach((j, i) => {
        j.t += dt;
        if (j.t > DUR) {
          // pick a new spot a little away from the island and the rim
          j.t = -2 - rnd() * 3.5;
          const a = rnd() * Math.PI * 2, r = 4 + rnd() * 3;
          j.x = cx + Math.cos(a) * r; j.z = cz + Math.sin(a) * r;
          if (!pointInRing(j.x, j.z, w.r) || distToRingEdge(j.x, j.z, w.r) < 1.6) { j.x = cx + Math.cos(a) * 3.2; j.z = cz + Math.sin(a) * 3.2; }
          const b = a + Math.PI / 2 * (rnd() < 0.5 ? 1 : -1);
          j.dx = Math.cos(b); j.dz = Math.sin(b);
        }
        if (j.t < 0) { M.makeScale(0, 0, 0); fish.setMatrixAt(i, M); return; }
        const f = j.t / DUR;
        const y = L - 0.15 + Math.sin(f * Math.PI) * 1.3;
        const pitch = -Math.cos(f * Math.PI) * 0.9;
        M.compose(v.set(j.x + j.dx * (f - 0.5) * 1.8, y, j.z + j.dz * (f - 0.5) * 1.8), q.setFromEuler(e.set(pitch, Math.atan2(j.dx, j.dz), Math.sin(f * 9) * 0.2)), s.set(1, 1, 1));
        fish.setMatrixAt(i, M);
      });
      fish.instanceMatrix.needsUpdate = true;
    },
  };
}

export function buildFiocco(ctx, env) {
  const w = ctx.MAP.WATER.find((x) => /Fiocco/.test(x.n || ''));
  if (!w) return;
  const L = levelOf(ctx, w);
  const [cx, cz] = ringCentroid(w.r);
  // the arch closes the view at the end of Viale Giorgio Washington
  const avenue = ctx.MAP.PATHS.find((p) => /Washington/.test(p.n || ''));
  const end = avenue ? avenue.p[avenue.p.length - 1] : [cx - 10, cz + 8];
  const F = frame(cx, L, cz, headingOf(end[0] - cx, end[1] - cz));
  const gb = new GeoBuilder();
  const rnd = ctx.rng('fiocco');
  const MASON = '#d6c4a2', MASON_SHADE = '#c2ae8a', EAGLE = '#9a4e36';

  // rockwork mound rising from the basin at the back
  for (let i = 0; i < 11; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 1.9;
    const s = 0.8 + rnd() * 0.7;
    gb.place(rockGeometry(rnd, s, 1), ROCK[i % 3], Math.cos(a) * r * 1.4, 0.2 + rnd() * 0.9, -2.3 + Math.sin(a) * r * 0.7, 0, rnd() * 6, 0, 1.2, 0.9, 1);
  }
  // the arch on the rocks, with the eagle on its attic
  const ay = 1.4, open = 1.45, spring = 2.3, top = 4.3;
  for (const s of [-1, 1]) {
    gb.box(1.0, top, 1.0, MASON, s * (open + 0.5), ay + top / 2, -2.7);
    gb.box(1.15, 0.18, 1.15, MASON_SHADE, s * (open + 0.5), ay + spring, -2.7);
  }
  const vault = new THREE.Shape();
  vault.moveTo(-open, top); vault.lineTo(-open, spring); vault.absarc(0, spring, open, Math.PI, 0, true); vault.lineTo(open, top); vault.closePath();
  gb.extrude(vault, 1.0, MASON, 0, ay, -3.2);
  gb.place(new THREE.TorusGeometry(open + 0.12, 0.12, 4, 12, Math.PI), MASON_SHADE, 0, ay + spring, -2.18);
  gb.box(5.2, 0.3, 1.3, MASON_SHADE, 0, ay + top + 0.15, -2.7);
  gb.box(3.4, 0.9, 1.0, MASON, 0, ay + top + 0.75, -2.7);
  gb.box(3.6, 0.15, 1.15, MASON_SHADE, 0, ay + top + 1.25, -2.7);
  const ey = ay + top + 1.35;
  gb.sphere(0.32, 1, EAGLE, 0, ey + 0.45, -2.7, 0.9, 1.2, 0.8);
  gb.sphere(0.18, 1, EAGLE, 0, ey + 0.95, -2.62);
  gb.cone(0.07, 0.16, 4, '#c9a24a', 0, ey + 0.95, -2.42);
  for (const s of [-1, 1]) {
    gb.box(1.1, 0.5, 0.1, EAGLE, s * 0.62, ey + 0.72, -2.72, 0, 0, s * 0.3);
    for (let f = 0; f < 3; f++) gb.box(0.18, 0.55 - f * 0.1, 0.08, EAGLE, s * (1.05 + f * 0.17), ey + 0.62 - f * 0.12, -2.72, 0, 0, s * (0.15 + f * 0.15));
  }
  gb.box(0.5, 0.15, 0.4, EAGLE, 0, ey + 0.08, -2.7);
  // the two draped statues on rock pedestals
  for (const s of [-1, 1]) {
    gb.place(rockGeometry(rnd, 0.9, 1), ROCK[1], s * 3.1, 0.3, -1.6, 0, rnd() * 6, 0, 1, 1, 1);
    gb.box(0.9, 0.5, 0.9, STONE, s * 3.1, 1.15, -1.6);
    stamp(gb, figureTemplate('lady', '#f1ece0', '#d8d1c2'), mat(s * 3.1, 1.4, -1.6, -s * 0.35, 0.95));
  }
  // marble tazza on its rock with the plume of water
  gb.place(rockGeometry(rnd, 1.0, 1), ROCK[2], 0, 0.2, 0.8, 0, 0.5, 0, 1.2, 0.8, 1.2);
  gb.cyl(0.3, 0.45, 1.0, 10, '#f2eee6', 0, 1.1, 0.8);
  gb.cyl(1.35, 0.6, 0.5, 16, '#f2eee6', 0, 1.85, 0.8);
  gb.cyl(1.2, 1.2, 0.02, 16, '#6aaed0', 0, 2.08, 0.8);
  const T0 = F.m.clone().multiply(mat(0, 0, 0.8));
  env.jets.add(column(0.07, 0.16, 2.4, T0.clone().multiply(mat(0, 2.1 + 1.2, 0))));
  env.jets.add(column(0.25, 1.15, 1.2, T0.clone().multiply(mat(0, 2.1 + 1.25, 0)), true, 12));
  env.jets.add(column(1.36, 1.5, 1.95, T0.clone().multiply(mat(0, 1.06, 0)), true, 16));
  env.jets.add(splash(1.4, 2.4, T0.clone().multiply(mat(0, 0.03, 0))));
  env.group.add(F.place(gb.build(undefined, { name: 'fontana-fiocco' })));
  ctx.reserve({ ring: w.r });
}

export function buildAcquaFelix(ctx, env) {
  const A = ctx.MAP.ANCHORS.acquafelix;
  // set into the retaining wall east of the anchor, facing the junction of the avenues
  let best = null;
  for (const wl of ctx.MAP.WALLS) {
    if (wl.k !== 'retaining_wall') continue;
    const c = closestOnPolyline(A.x, A.z, wl.p);
    if (c && c.d < 12 && (!best || c.d < best.c.d)) best = { c, wl };
  }
  let px = A.x, pz = A.z, fx = 0, fz = 1;
  if (best) {
    // a point a little along the wall, on its straight run
    const c = closestOnPolyline(A.x, A.z, best.wl.p.slice(1));
    const along = 2.0;
    px = c.x + c.dirX * along; pz = c.z + c.dirZ * along;
    fx = -c.dirZ; fz = c.dirX;
    if (fx * (A.x - px) + fz * (A.z - pz) < 0) { fx = -fx; fz = -fz; }
  }
  const y0 = ctx.terrain.heightAt(px, pz);
  const F = frame(px + fx * 0.2, y0, pz + fz * 0.2, headingOf(fx, fz));
  const gb = new GeoBuilder();
  const TRAV = '#ecdfc1', TRAV_SHADE = '#d6c8a6', BRONZE = '#6f5a3a';

  gb.box(7.4, 0.4, 1.6, TRAV_SHADE, 0, 0.2, -0.6);
  gb.box(7.2, 5.4, 1.2, TRAV, 0, 2.7, -0.6);
  for (let y = 0.9; y < 5; y += 0.75) gb.box(7.25, 0.07, 1.25, TRAV_SHADE, 0, y, -0.6);
  for (const x of [-3.3, -1.75, 1.75, 3.3]) gb.box(0.55, 3.75, 0.3, '#ece3cf', x, 2.3, 0.12);
  for (const x of [-3.3, -1.75, 1.75, 3.3]) gb.box(0.7, 0.2, 0.36, TRAV_SHADE, x, 4.2, 0.12);
  archPanel(gb, 2.6, 3.9, 0.2, TRAV_SHADE, 0, 0.9, 0.06);
  env.decals.quad(2.2, 2.2, env.R.felixRelief, F.m.clone().multiply(mat(0, 2.85, 0.18)));
  gb.box(7.8, 0.5, 1.6, '#ece3cf', 0, 5.35, -0.5);
  gb.box(5.0, 0.7, 0.16, TRAV, 0, 4.7, 0.08);
  env.decals.quad(4.8, 0.62, env.R.felixText, F.m.clone().multiply(mat(0, 4.7, 0.17)));
  const ped = new THREE.Shape([new THREE.Vector2(-2.0, 0), new THREE.Vector2(2.0, 0), new THREE.Vector2(0, 1.0)]);
  gb.extrude(ped, 1.0, '#ece3cf', 0, 5.6, -1.0);
  // Borghese eagle and dragon on top
  gb.sphere(0.3, 1, BRONZE, -0.45, 6.55, -0.5, 0.9, 1.2, 0.8);
  for (const s of [-1, 1]) gb.box(0.9, 0.4, 0.08, BRONZE, -0.45 + s * 0.5, 6.75, -0.5, 0, 0, s * 0.5);
  gb.sphere(0.16, 0, BRONZE, -0.45, 7.0, -0.45);
  gb.sphere(0.28, 0, BRONZE, 0.55, 6.35, -0.5, 1.4, 0.8, 0.8);
  gb.cone(0.12, 0.45, 5, BRONZE, 0.95, 6.6, -0.5);
  // lion mask spout pouring into a half-round basin
  gb.cyl(0.42, 0.42, 0.25, 10, '#d7c39a', 0, 1.35, 0.15, 0, Math.PI / 2);
  gb.sphere(0.26, 1, '#e8dcc0', 0, 1.35, 0.3);
  // half-round basin: the shape's +y becomes the local +z (out from the wall)
  const basin = new THREE.Shape();
  basin.moveTo(2.6, 0); basin.absarc(0, 0, 2.6, 0, Math.PI, false); basin.closePath();
  basin.holes.push(new THREE.Path(Array.from({ length: 11 }, (_, i) => {
    const a = (i / 10) * Math.PI;
    return new THREE.Vector2(Math.cos(a) * 2.25, 0.3 + Math.sin(a) * 1.95);
  })));
  const bg = new THREE.ExtrudeGeometry(basin, { depth: 0.75, bevelEnabled: false, curveSegments: 10 });
  bg.rotateX(Math.PI / 2);
  bg.translate(0, 0.75, 0.05);
  gb.add(bg, TRAV);
  const water = new THREE.Shape(Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI + (i / 10) * Math.PI;
    return new THREE.Vector2(Math.cos(a) * 2.3, -0.3 + Math.sin(a) * 2.0);
  }));
  const wg = new THREE.ShapeGeometry(water);
  wg.rotateX(-Math.PI / 2);
  gb.add(wg.translate(0, 0.6, 0.05), '#5aa4c8');
  env.jets.add(column(0.11, 0.16, 0.8, F.m.clone().multiply(mat(0, 0.98, 0.62)), true, 8));
  env.jets.add(splash(0.15, 0.7, F.m.clone().multiply(mat(0, 0.62, 0.62))));
  env.group.add(F.place(gb.build(undefined, { name: 'acqua-felix' })));
  ctx.colliders.addBox(...F.w(0, -0.6), 7.4, 1.4, -F.h, 'building', { name: 'acquafelix' });
  ctx.colliders.addCircle(...F.w(0, 1.2), 1.6, 'fountain', { name: 'acquafelix' });
  ctx.reserve({ x: F.w(0, 0.6)[0], z: F.w(0, 0.6)[1], r: 4.5 });
}
