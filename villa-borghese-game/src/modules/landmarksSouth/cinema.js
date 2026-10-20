// Cinema dei Piccoli: the tiny green wooden chalet on Viale della Pineta (63 seats, a Guinness
// record as one of the smallest cinemas in the world). Front gable faces the avenue.
import { Frame, gableGeometry } from './parts.js';
import { RECT } from './atlas.js';

const C = {
  wall: '#4f7f4a', batten: '#3f6a3b', trim: '#f4e7c6', roof: '#7d3a2b', roofLine: '#5f2a20',
  stone: '#9f968a', deck: '#a5733f', door: '#a33a2e', glass: '#35424c', brass: '#c9a14a',
  rope: '#b5282e', reel: '#c4c8ce', reelDark: '#5d6168', box: '#7a4e2c',
  flowers: ['#e8463a', '#f28fb0', '#f2c14e'],
};

export function buildCinema(ctx, gb, decals) {
  const A = ctx.MAP.ANCHORS.cinema;
  const fx = Math.cos(A.angle), fz = Math.sin(A.angle); // long axis, towards Viale della Pineta
  // Set back 2 units so the porch sits at the edge of the (widened) avenue instead of on it.
  const cx = A.x - fx * 2, cz = A.z - fz * 2;
  const y0 = ctx.terrain.heightAt(cx, cz);
  const L = 7.45, W = 3.9, H = 2.8, base = 0.35, rise = 1.7;
  const top = base + H, ridge = top + rise, front = L / 2;
  const f = new Frame(gb, cx, y0, cz, Math.atan2(fx, fz));

  // body, with board-and-batten walls (battens skip windows and poster cases)
  f.box(W + 0.3, 1.0, L + 0.3, C.stone, 0, base - 0.5, 0);
  f.box(W, H, L, C.wall, 0, base + H / 2, 0);
  f.box(W + 0.08, 0.16, L + 0.08, C.batten, 0, base + 0.08, 0);
  f.box(W + 0.12, 0.18, L + 0.12, C.trim, 0, top - 0.06, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(0.2, H + 0.1, 0.2, C.trim, sx * W / 2, base + H / 2, sz * L / 2);
  const posterZ = [front - 0.9, front - 2.1], ticketZ = front - 1.1, windowZ = [-0.8, -2.5];
  const keepOut = { [-1]: [...posterZ.map((z) => [z, 0.55]), ...windowZ.map((z) => [z, 0.5])], [1]: [[ticketZ, 0.65], ...windowZ.map((z) => [z, 0.5])] };
  for (const sx of [-1, 1]) {
    for (let z = -L / 2 + 0.35; z < L / 2 - 0.2; z += 0.42) {
      if (keepOut[sx].some(([c, r]) => Math.abs(z - c) < r)) continue;
      f.box(0.05, H - 0.2, 0.07, C.batten, sx * (W / 2 + 0.025), base + H / 2, z);
    }
  }
  // gables, roof and bargeboards
  for (const sz of [-1, 1]) f.add(gableGeometry(W, rise, 0.12), C.wall, 0, top, sz * (L / 2 - 0.06));
  const th = Math.atan2(rise, W / 2), slope = Math.hypot(W / 2, rise) + 0.5;
  for (const s of [-1, 1]) {
    const mx = s * ((slope / 2) * Math.cos(th) + 0.07 * Math.sin(th));
    const my = ridge - (slope / 2) * Math.sin(th) + 0.07 * Math.cos(th);
    const slab = f.child(mx, my, 0, 0, 0, -s * th);
    slab.box(slope, 0.16, L + 1.1, C.roof, 0, 0, 0);
    for (let k = -1; k <= 1; k++) slab.box(0.07, 0.05, L + 1.12, C.roofLine, k * slope * 0.3, 0.09, 0);
  }
  f.box(0.32, 0.18, L + 1.16, C.roofLine, 0, ridge + 0.14, 0);
  const ez = L / 2 + 0.56, ex = W / 2 + 0.5 * Math.cos(th), ey = top - 0.5 * Math.sin(th);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) f.beam([0, ridge + 0.12, sz * ez], [sx * ex, ey, sz * ez], 0.1, 0.24, C.trim);

  // a film reel at the front peak and the record plaque on the gable
  const reelY = ridge - 0.22, reelZ = ez + 0.08;
  f.cyl(0.46, 0.46, 0.08, 12, C.reel, 0, reelY, reelZ, Math.PI / 2);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
    f.cyl(0.1, 0.1, 0.1, 8, C.reelDark, Math.cos(a) * 0.25, reelY + Math.sin(a) * 0.25, reelZ + 0.01, Math.PI / 2);
  }
  f.cyl(0.07, 0.07, 0.14, 8, C.reelDark, 0, reelY, reelZ + 0.02, Math.PI / 2);
  decals.quad(f, 1.7, 0.39, RECT.record, 0, top + 0.45, front + 0.01);

  // front: sign over a red double door, posters either side, a little porch
  f.box(3.66, 0.82, 0.08, C.box, 0, top - 0.42, front + 0.04);
  decals.quad(f, 3.5, 0.68, RECT.cinemaSign, 0, top - 0.42, front + 0.085);
  f.box(1.52, 1.98, 0.05, C.trim, 0, base + 0.99, front + 0.025);
  f.box(1.3, 1.88, 0.08, C.door, 0, base + 0.94, front + 0.04);
  f.box(0.04, 1.88, 0.1, C.roofLine, 0, base + 0.94, front + 0.05);
  for (const s of [-1, 1]) {
    f.box(0.06, 0.06, 0.06, C.brass, s * 0.14, base + 0.95, front + 0.1);
    f.box(0.94, 1.28, 0.05, C.brass, s * 1.38, base + 1.12, front + 0.025);
    decals.quad(f, 0.8, 1.13, RECT.posters[s < 0 ? 0 : 1], s * 1.38, base + 1.12, front + 0.055);
  }
  f.box(W + 0.5, 0.22, 1.0, C.deck, 0, base - 0.05, front + 0.6);
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.5) f.box(0.03, 0.02, 1.0, C.box, x, base + 0.065, front + 0.6);

  // left side: two poster cases; right side: the ticket window under a striped awning
  posterZ.forEach((z, i) => {
    f.box(0.06, 1.3, 0.96, C.brass, -W / 2 - 0.05, base + 1.15, z);
    decals.quad(f, 0.82, 1.15, RECT.posters[2 + i], -W / 2 - 0.085, base + 1.15, z, -Math.PI / 2);
  });
  f.box(0.06, 1.0, 1.15, C.trim, W / 2 + 0.03, base + 1.35, ticketZ);
  f.box(0.07, 0.78, 0.92, C.glass, W / 2 + 0.05, base + 1.38, ticketZ);
  f.box(0.38, 0.06, 1.15, C.trim, W / 2 + 0.2, base + 0.86, ticketZ);
  f.box(0.5, 0.05, 1.3, '#d8443a', W / 2 + 0.25, base + 2.02, ticketZ, 0, 0, -0.35);
  decals.quad(f, 1.3, 0.3, RECT.ticket, W / 2 + 0.07, base + 2.36, ticketZ, Math.PI / 2);
  // windows with flower boxes towards the back
  for (const sx of [-1, 1]) {
    for (const z of windowZ) {
      f.box(0.05, 0.95, 0.85, C.trim, sx * (W / 2 + 0.03), base + 1.55, z);
      f.box(0.06, 0.75, 0.65, C.glass, sx * (W / 2 + 0.05), base + 1.55, z);
      f.box(0.2, 0.18, 0.86, C.box, sx * (W / 2 + 0.12), base + 0.98, z);
      for (let k = 0; k < 3; k++) f.sphere(0.11, 0, C.flowers[(k + (z < -1 ? 1 : 0)) % 3], sx * (W / 2 + 0.13), base + 1.12, z - 0.27 + k * 0.27);
    }
  }
  // queue posts with a red rope on the porch, and a poster easel by the steps
  const qz = front + 0.8;
  for (const x of [0.95, 1.75]) {
    f.cyl(0.05, 0.05, 0.8, 6, C.brass, x, base + 0.46, qz);
    f.sphere(0.07, 0, C.brass, x, base + 0.88, qz);
  }
  f.beam([0.95, base + 0.76, qz], [1.75, base + 0.76, qz], 0.04, 0.04, C.rope);
  const easel = f.child(-1.5, 0, front + 1.5, 0.35);
  easel.beam([-0.32, 0, 0.12], [-0.28, 1.25, 0], 0.06, 0.06, C.box);
  easel.beam([0.32, 0, 0.12], [0.28, 1.25, 0], 0.06, 0.06, C.box);
  easel.beam([0, 0, -0.35], [0, 1.2, -0.02], 0.05, 0.05, C.box);
  easel.box(0.7, 0.98, 0.04, C.box, 0, 0.78, 0.05, 0, -0.1);
  decals.quad(easel, 0.6, 0.84, RECT.posters[3], 0, 0.78, 0.076, 0, -0.1);

  // the porch is part of the solid box; the easel is a small post
  ctx.colliders.addBox(cx + fx * 0.5, cz + fz * 0.5, L + 1.3, W + 0.3, A.angle, 'building', { name: 'cinema' });
  const e = easel.world(0, 0, 0);
  ctx.colliders.addCircle(e.x, e.z, 0.45, 'sign');
  ctx.reserve({ x: cx + fx, z: cz + fz, r: 6.6 });
  return { x: cx, z: cz, y: y0 };
}
