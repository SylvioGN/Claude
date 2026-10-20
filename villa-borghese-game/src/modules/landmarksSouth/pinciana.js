// Porta Pinciana: the gate in the Aurelian Walls just outside the south edge of the park, with its
// travertine arch (a Greek cross on the keystone) between two round brick towers, and a stretch of
// crenellated wall with square towers either side. Built along the gate's axis; the park is north.
import * as THREE from 'three';
import { Frame, archedPanel } from './parts.js';

const C = {
  brick: '#dfa271', brickDark: '#c98c5f', brickLight: '#ecb789', travertine: '#f6efe0', travShade: '#e4d8bf',
  dark: '#2c2420', green: '#55783a', greenDark: '#41612f',
};

function archRing(r0, r1) {
  const s = new THREE.Shape();
  s.moveTo(r1, 0);
  s.absarc(0, 0, r1, 0, Math.PI, false);
  s.lineTo(-r0, 0);
  s.absarc(0, 0, r0, Math.PI, 0, true);
  s.lineTo(r1, 0);
  return s;
}

export function buildPinciana(ctx, gb) {
  const A = ctx.MAP.ANCHORS.pinciana;
  const a = A.angle || 0;
  const ux = Math.cos(a), uz = Math.sin(a);
  // the opening sits between the two tower bumps of the OSM outline
  const gx = 156.8, gz = 215.5; // gate centre on the wall line
  const T = ctx.terrain;
  const y0 = T.heightAt(gx, gz);
  const f = new Frame(gb, gx, y0, gz, -a); // local +x along the wall (east), +z towards the city (south)
  const ground = (x) => T.heightAt(gx + ux * x, gz + uz * x) - y0;
  const low = ctx.quality.tier === 'low';

  // gate block: travertine with the arch, brick attic and battlements
  const gw = 2.7, gd = 1.4, gh = 7.2, ow = 3.2, oh = 5.7;
  f.extrude(archedPanel(-gw, gw, -2, gh, [{ x: 0, w: ow, h: oh, y0: 0 }]), gd * 2, C.travertine, 0, 0, -gd);
  f.extrude(archRing(ow / 2, ow / 2 + 0.45), 0.22, C.travShade, 0, oh - ow / 2, -gd - 0.2);
  f.box(0.62, 0.8, 0.3, C.travShade, 0, oh + 0.12, -gd - 0.16);
  f.box(0.42, 0.1, 0.12, C.dark, 0, oh + 0.18, -gd - 0.34);
  f.box(0.1, 0.42, 0.12, C.dark, 0, oh + 0.18, -gd - 0.34);
  for (const y of [1.6, 3.2]) f.box(gw * 2 + 0.04, 0.06, gd * 2 + 0.04, C.travShade, 0, y, 0);
  f.box(gw * 2 + 0.3, 0.3, gd * 2 + 0.3, C.travShade, 0, gh + 0.1, 0);
  f.box(gw * 2, 1.8, gd * 2, C.brick, 0, gh + 1.15, 0);
  const merlons = (x0, x1, y, z, depth = 0.5) => {
    for (let x = x0 + 0.4; x <= x1 - 0.4; x += 1.6) f.box(0.8, 0.9, depth, C.brickLight, x, y + 0.45, z);
  };
  merlons(-gw, gw, gh + 2.05, -gd + 0.25);
  merlons(-gw, gw, gh + 2.05, gd - 0.25);

  // two round towers projecting towards the park
  for (const s of [-1, 1]) {
    const tx = s * 4.6, tz = -1.1, r = 2.45, th = 9.6;
    const yb = Math.min(ground(tx - r), ground(tx + r)) - 1.5;
    f.cyl(r + 0.25, r + 0.4, 1.8 - yb, 14, C.travShade, tx, (1.8 + yb) / 2, tz);
    f.cyl(r, r + 0.15, th - 1.8, 14, C.brick, tx, 1.8 + (th - 1.8) / 2, tz);
    f.cyl(r + 0.15, r + 0.15, 0.25, 14, C.brickLight, tx, th - 0.6, tz);
    for (let k = 0; k < 12; k++) {
      const t = (k / 12) * Math.PI * 2;
      f.box(0.7, 0.9, 0.45, C.brickLight, tx + Math.sin(t) * (r - 0.2), th + 0.45, tz + Math.cos(t) * (r - 0.2), t);
    }
    for (const [dy, t] of [[4.2, Math.PI], [6.8, Math.PI - s * 0.6], [6.8, Math.PI + s * 0.6]]) {
      f.box(0.22, 0.95, 0.3, C.dark, tx + Math.sin(t) * (r + 0.02), dy, tz + Math.cos(t) * (r + 0.02), t);
    }
    ctx.colliders.addCircle(...xz(f.world(tx, 0, tz)), r + 0.2, 'wall', { name: 'porta-pinciana' });
  }

  // the walls: brick with lacing courses, battlements, square towers and some greenery on top
  const wallH = 7.8, wd = 1.0, seg = 6.4;
  const runs = [[-7.0, -42.0], [7.0, 42.0]];
  const rnd = ctx.rng('pinciana');
  for (const [x0, x1] of runs) {
    const dir = Math.sign(x1 - x0);
    for (let x = x0; dir * (x1 - x) > 0.1; x += dir * seg) {
      const xe = dir > 0 ? Math.min(x + seg, x1) : Math.max(x + seg, x1);
      const xm = (x + xe) / 2, len = Math.abs(xe - x) + 0.02;
      const gy = Math.max(ground(x), ground(xe));
      const end = Math.abs(xe - x1) < 0.1;
      const h = end ? wallH * 0.7 : wallH;
      const yb = Math.min(ground(x), ground(xe)) - 1.5;
      f.box(len, gy + h - yb, wd * 2, C.brick, xm, (gy + h + yb) / 2, 0);
      for (const y of [2.4, 4.9]) f.box(len, 0.12, wd * 2 + 0.04, C.brickDark, xm, gy + y, 0);
      if (!end) merlons(Math.min(x, xe), Math.max(x, xe), gy + h, -wd + 0.25);
      if (!low && rnd() < 0.6) f.sphere(0.5 + rnd() * 0.4, 0, rnd() < 0.5 ? C.green : C.greenDark, xm + rnd.range(-2, 2), gy + h + 0.15, -wd + 0.3 + rnd() * 1.2, 1.4, 0.6, 1);
    }
    for (const tx of [x0 + (x1 - x0) * 0.42, x0 + (x1 - x0) * 0.84]) {
      const gy = Math.max(ground(tx - 2), ground(tx + 2)), yb = Math.min(ground(tx - 2), ground(tx + 2)) - 1.5;
      f.box(4.2, gy + 9.6 - yb, 3.4, C.brick, tx, (gy + 9.6 + yb) / 2, -wd - 0.7);
      f.box(4.5, 0.22, 3.7, C.brickLight, tx, gy + 8.7, -wd - 0.7);
      for (const dx of [-1.6, 0, 1.6]) f.box(0.8, 0.9, 0.5, C.brickLight, tx + dx, gy + 10.05, -wd - 2.15);
      for (const dz of [-0.6, 0.6]) for (const s of [-1, 1]) f.box(0.5, 0.9, 0.8, C.brickLight, tx + s * 1.85, gy + 10.05, -wd - 0.7 + dz);
      for (const dx of [-0.9, 0.9]) f.box(0.3, 1.0, 0.1, C.dark, tx + dx, gy + 6.2, -wd - 2.42);
      const c = f.world(tx, 0, -wd - 0.7);
      ctx.colliders.addBox(c.x, c.z, 4.2, 3.4, a, 'wall');
    }
    const p0 = f.world(x0, 0, 0), p1 = f.world(x1, 0, 0);
    ctx.colliders.addSegment(p0.x, p0.z, p1.x, p1.z, 'wall', { name: 'aurelian-walls' }, wd);
  }
  const g0 = f.world(-gw, 0, 0), g1 = f.world(gw, 0, 0);
  for (const s of [-1, 1]) {
    const p = f.world(s * (ow / 2 + (gw - ow / 2) / 2), 0, 0);
    ctx.colliders.addBox(p.x, p.z, gw - ow / 2, gd * 2, a, 'wall');
  }
  ctx.reserve({ ring: [[-44, -5], [44, -5], [44, 3], [-44, 3]].map(([x, z]) => xz(f.world(x, 0, z))) });
  return { x: gx, z: gz, y: y0, span: [g0, g1] };
}

function xz(v) { return [v.x, v.z]; }
