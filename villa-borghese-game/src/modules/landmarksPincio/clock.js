// Idrocronometro del Pincio: Embriaco's water clock (1867), a slender tower of cast iron dressed as
// tree trunks, with four dials, standing on a rocky islet in its pond. The hands show the real
// time and the pendulum swings (one InstancedMesh for all moving parts).
import * as THREE from 'three';
import { COL, local } from './kit.js';
import { ringCentroid } from '../../core/geo.js';
import { mats } from '../../core/util.js';

const POST = 0.62, DIAL_Y = 5.75, BOX = 1.56, PIVOT_Y = 4.85, ROD = 2.15;

export function nearestWater(MAP, x, z, kind = null) {
  let best = null, bd = Infinity;
  for (const w of MAP.WATER) {
    if (kind && w.k !== kind) continue;
    const [cx, cz] = ringCentroid(w.r);
    const d = Math.hypot(cx - x, cz - z);
    if (d < bd) { bd = d; best = w; }
  }
  return bd < 15 ? best : null;
}

export function buildClock(ctx, tb) {
  const { MAP, terrain: T } = ctx;
  const a = MAP.ANCHORS.idrocronometro;
  const pond = nearestWater(MAP, a.x, a.z);
  const [x, z] = pond ? ringCentroid(pond.r) : [a.x, a.z];
  const radius = pond ? pond.r.reduce((s, p) => s + Math.hypot(p[0] - x, p[1] - z), 0) / pond.r.length : 2.5;
  const g = T.heightAt(x, z);
  const water = g + 0.45;
  const rnd = ctx.rng('pincio-clock');
  const L = local(x, g, z, 0);

  // rocky islet with a few ferns
  for (let k = 0; k < 7; k++) {
    const ang = (k / 7) * Math.PI * 2 + rnd() * 0.5, r = k === 6 ? 0 : 0.55 + rnd() * 0.5;
    const s = 0.45 + rnd() * 0.35;
    tb.sphere(s, 0, k % 3 ? COL.rock : '#8d8a6c', ...L(Math.cos(ang) * r, 0.55 + rnd() * 0.25, Math.sin(ang) * r), 1.2, 0.8, 1.1);
  }
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2 + 0.4;
    tb.cone(0.3, 0.5, 5, '#4f8a3a', ...L(Math.cos(ang) * 0.95, 1.05, Math.sin(ang) * 0.95));
  }
  // water lilies
  for (let k = 0; k < 6; k++) {
    const ang = rnd() * Math.PI * 2, r = 1.4 + rnd() * Math.max(0.2, radius - 1.9);
    const [px, , pz] = L(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    tb.cyl(0.26, 0.26, 0.03, 7, '#5c9a45', px, water + 0.03, pz);
    if (k % 2 === 0) tb.place(new THREE.OctahedronGeometry(0.09, 0), COL.flowerPink, px + 0.05, water + 0.1, pz);
  }

  // stone plinth and four faux-bois posts with knots and branch braces
  tb.box(1.6, 0.32, 1.6, COL.travertineShade, ...L(0, 1.18, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    tb.cyl(0.1, 0.14, PIVOT_Y + 0.15 - 1.34, 6, COL.wood, ...L(sx * POST, (1.34 + PIVOT_Y + 0.15) / 2, sz * POST));
    tb.sphere(0.07, 0, COL.woodDark, ...L(sx * (POST + 0.07), 2.4 + (sx + sz) * 0.3, sz * POST));
    tb.sphere(0.06, 0, COL.woodDark, ...L(sx * POST, 3.5 - sx * 0.25, sz * (POST + 0.07)));
  }
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2;
    const F = local(x, g, z, ry);
    // a low rail and a V of branches under the clock box on each side
    tb.orient(new THREE.CylinderGeometry(0.05, 0.05, POST * 2, 5), COL.wood, ...F(0, 1.85, POST), ry, 0, Math.PI / 2);
    for (const s of [-1, 1]) {
      tb.orient(new THREE.CylinderGeometry(0.045, 0.06, 1.0, 5), COL.wood, ...F(s * 0.33, PIVOT_Y - 0.35, POST), ry, 0, s * 0.95);
      tb.orient(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 5), COL.woodDark, ...F(s * 0.31, 1.6, POST), ry, 0, s * 0.7);
    }
    // thin frame of the glass case round the pendulum
    tb.box(0.05, PIVOT_Y - 1.35, 0.05, COL.trim, ...F(0.42, (PIVOT_Y + 1.35) / 2, 0.42));
  }
  tb.box(0.95, 0.08, 0.95, COL.trim, ...L(0, 1.4, 0));
  // little water wheel and spout that drive the mechanism
  tb.cyl(0.18, 0.18, 0.08, 8, COL.gilt, ...L(0, 1.72, 0), 0, Math.PI / 2);
  tb.cyl(0.04, 0.04, 0.5, 5, '#cfe8f5', ...L(0.18, 2.0, 0));

  // clock box with four dials, cornice, gables, roof and finial
  const by = PIVOT_Y + 0.15;
  tb.box(BOX, BOX, BOX, COL.clockGreen, ...L(0, by + BOX / 2, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tb.box(0.14, BOX + 0.04, 0.14, COL.trim, ...L(sx * BOX / 2, by + BOX / 2, sz * BOX / 2));
  tb.box(BOX + 0.25, 0.14, BOX + 0.25, COL.trim, ...L(0, by - 0.05, 0));
  tb.box(BOX + 0.3, 0.16, BOX + 0.3, COL.trim, ...L(0, by + BOX + 0.06, 0));
  const gable = new THREE.Shape([new THREE.Vector2(-0.85, 0), new THREE.Vector2(0.85, 0), new THREE.Vector2(0, 0.62)]);
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2;
    const F = local(x, g, z, ry);
    tb.decal('clock', 1.3, 1.3, ...F(0, DIAL_Y, BOX / 2 + 0.012), ry);
    tb.extrude(gable, 0.1, COL.trim, ...F(0, by + BOX + 0.12, BOX / 2 + 0.02), 0, ry, 0);
    tb.place(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.6, 0.06), new THREE.Vector2(0.6, 0.06), new THREE.Vector2(0, 0.48)])), COL.clockGreen, ...F(0, by + BOX + 0.12, BOX / 2 + 0.125), 0, ry, 0);
    tb.sphere(0.07, 0, COL.gilt, ...F(0, by + BOX + 0.8, BOX / 2 + 0.07));
  }
  tb.place(new THREE.ConeGeometry(1.3, 1.9, 4), COL.slate, ...L(0, by + BOX + 0.14 + 0.95, 0), 0, Math.PI / 4, 0);
  tb.cyl(0.05, 0.05, 0.9, 5, COL.gilt, ...L(0, by + BOX + 2.4, 0));
  tb.sphere(0.14, 1, COL.gilt, ...L(0, by + BOX + 2.2, 0));
  tb.place(new THREE.OctahedronGeometry(0.12, 0), COL.gilt, ...L(0, by + BOX + 2.9, 0));

  // name board on the pond's edge, where it does not stand on an avenue
  for (let k = 0; k < 16; k++) {
    const ang = (k / 16) * Math.PI * 2, r = radius + 1.7;
    const bx = x + Math.cos(ang) * r, bz = z + Math.sin(ang) * r;
    const np = T.nearestPath(bx, bz);
    if ((np && np.d < np.w / 2 + 0.3) || !ctx.colliders.isFree(bx, bz, 0.6)) continue;
    const ry = Math.atan2(Math.cos(ang), Math.sin(ang));
    const F = local(bx, T.heightAt(bx, bz), bz, ry);
    for (const s of [-0.9, 0.9]) tb.cyl(0.05, 0.05, 1.5, 5, COL.woodDark, ...F(s, 0.75, 0));
    tb.box(2.2, 0.5, 0.08, COL.clockGreen, ...F(0, 1.3, 0), ry);
    tb.decal('signClock', 2.05, 0.38, ...F(0, 1.3, 0.045), ry);
    tb.decal('signClock', 2.05, 0.38, ...F(0, 1.3, -0.045), ry + Math.PI);
    ctx.colliders.addCircle(bx, bz, 0.5, 'sign', { name: 'Idrocronometro' });
    break;
  }
  return { x, z, g, water, radius };
}

// Hands (4 dials x hour/minute) and the pendulum rod + bob as one InstancedMesh.
export function createClockHands(ctx, site) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const n = geo.attributes.position.count;
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const mesh = new THREE.InstancedMesh(geo, mats().vcFlat, 10);
  mesh.name = 'pincio-clock-hands';
  mesh.castShadow = false;
  const c = new THREE.Color();
  for (let i = 0; i < 8; i++) mesh.setColorAt(i, c.set('#1b1b1d'));
  mesh.setColorAt(8, c.set(COL.gilt));
  mesh.setColorAt(9, c.set(COL.gilt));
  // the parts move every frame, so cull against a fixed sphere round the clock box
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(site.x, site.g + 5, site.z), 3.5);
  ctx.scene.add(mesh);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const set = (i, x, y, z, ry, rx, rz, sx, sy, sz) => {
    m.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s.set(sx, sy, sz));
    mesh.setMatrixAt(i, m);
  };
  const { x, z, g } = site;
  let lastMinute = -1;
  const cam = ctx.camera.position;
  const pose = (t) => {
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    if (minute !== lastMinute) {
      lastMinute = minute;
      const hourA = ((minute / 60) % 12) / 12 * Math.PI * 2;
      const minA = ((minute % 60) / 60) * Math.PI * 2;
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2, fx = Math.sin(ry), fz = Math.cos(ry);
        const d = BOX / 2 + 0.035;
        set(k * 2, x + fx * d, g + DIAL_Y, z + fz * d, ry, 0, -hourA, 0.075, 0.36, 0.025);
        set(k * 2 + 1, x + fx * (d + 0.02), g + DIAL_Y, z + fz * (d + 0.02), ry, 0, -minA, 0.05, 0.54, 0.025);
      }
    }
    const swing = Math.sin(t * Math.PI) * 0.2;
    set(8, x, g + PIVOT_Y, z, Math.PI / 4, 0, Math.PI + swing, 0.04, ROD, 0.04);
    const r = ROD - 0.05, ox = Math.sin(swing) * r * Math.SQRT1_2;
    set(9, x + ox, g + PIVOT_Y - Math.cos(swing) * r, z - ox, Math.PI / 4, 0, Math.PI + swing, 0.3, 0.3, 0.06);
    mesh.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  return {
    mesh,
    update(t) {
      if (Math.abs(cam.x - x) < 160 && Math.abs(cam.z - z) < 160) pose(t);
    },
  };
}
