// The bridge of Viale dell'Obelisco over Viale del Muro Torto (1908): travertine balustrades and
// lamps along the deck, planted verges, and arched faces down in the cutting where the road runs
// underneath. The deck itself is the path drawn by the world module.
import * as THREE from 'three';
import { COL, balustrade, lampPost, faceY, archOutline } from './kit.js';

const RAIL = 0.8;   // balustrade distance beyond the path edge
const FACE = 10;    // arched face distance from the axis

export function buildBridge(ctx, tb) {
  const { MAP, terrain: T, colliders } = ctx;
  const H = T.heightAt;
  const path = MAP.PATHS.find((p) => p.k === 'bridge' && p.p.some(([x, z]) => x > -185 && x < -140 && z > 90 && z < 125));
  if (!path) return null;
  const [A, B] = [path.p[0], path.p[path.p.length - 1]];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], n = [-d[1], d[0]];
  const at = (u, v) => [A[0] + d[0] * u + n[0] * v, A[1] + d[1] * u + n[1] * v];
  const railV = path.w / 2 + RAIL;
  const muro = MAP.BACKDROP.muroTorto || [];
  const out = { lamps: [], centre: at(len / 2, 0) };

  for (const s of [-1, 1]) {
    // where the ground beyond the deck falls into the cutting
    const us = [];
    for (let u = -10; u <= len + 10; u += 0.5) {
      const deck = H(...at(u, 0));
      if (H(...at(u, s * (railV + 4))) < deck - 2) us.push(u);
    }
    if (us.length < 4) continue;
    let best = [us[0], us[0]], cur = [us[0], us[0]];
    for (let i = 1; i < us.length; i++) {
      if (us[i] - us[i - 1] > 0.6) cur = [us[i], us[i]]; else cur[1] = us[i];
      if (cur[1] - cur[0] > best[1] - best[0]) best = [...cur];
    }
    const u0 = best[0] - 2, u1 = best[1] + 2;

    // balustrade with lamps at both ends
    const rail = [at(u0, s * railV), at(u1, s * railV)];
    const piers = balustrade(tb, rail, (x, z) => H(x, z) + 0.02, { height: 1.1, panel: 2.2 });
    colliders.addPolyline(rail, false, 'wall', { name: 'Ponte del Muro Torto' }, 0.3);
    for (const p of [piers[0], piers[piers.length - 1]]) { lampPost(tb, p.x, p.y + 1.15, p.z, { tall: 2.6 }); out.lamps.push(p); }

    // planted verge and the arched face below it
    const step = 1;
    const rows = [];
    for (let u = u0 - 0.5; u <= u1 + 0.51; u += step) {
      const top = Math.max(H(...at(u, s * (railV + 0.2))), H(...at(u, s * (railV + 1))), H(...at(u, s * (railV + 2)))) + 0.06;
      const floor = Math.min(H(...at(u, s * (FACE + 1.5))), H(...at(u, s * FACE))) - 1.2;
      rows.push({ u, top, floor });
    }
    const outN = [n[0] * s, 0, n[1] * s];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const pa = at(a.u, s * (railV + 0.2)), pb = at(b.u, s * (railV + 0.2)), fa = at(a.u, s * FACE), fb = at(b.u, s * FACE);
      tb.poly([[pa[0], a.top, pa[1]], [pb[0], b.top, pb[1]], [fb[0], b.top, fb[1]], [fa[0], a.top, fa[1]]], COL.grassDark, [0, 1, 0]);
      tb.poly([[fa[0], a.top, fa[1]], [fb[0], b.top, fb[1]], [fb[0], b.floor, fb[1]], [fa[0], a.floor, fa[1]]], COL.wall, outN);
    }
    for (const [r, k, sign] of [[rows[0], 0, -1], [rows[rows.length - 1], 1, 1]]) {
      const pa = at(r.u, s * (railV + 0.2)), fa = at(r.u, s * FACE);
      tb.poly([[pa[0], r.top, pa[1]], [fa[0], r.top, fa[1]], [fa[0], r.floor, fa[1]], [pa[0], r.floor, pa[1]]], COL.wall, [d[0] * sign, 0, d[1] * sign]);
    }
    const ry = faceY(n[0] * s, n[1] * s), ryAlong = Math.atan2(-d[1], d[0]);
    const topMax = Math.max(...rows.map((r) => r.top));
    const mid = at((u0 + u1) / 2, s * (FACE + 0.15));
    tb.box(u1 - u0 + 1.6, 0.35, 0.5, COL.trim, mid[0], topMax - 0.15, mid[1], ryAlong);
    // a clipped hedge along the verge
    const hv = at((u0 + u1) / 2, s * (railV + 2.6));
    tb.box(u1 - u0 - 1, 0.45, 0.8, COL.hedge, hv[0], topMax + 0.2, hv[1], ryAlong);

    // the arch where Viale del Muro Torto passes under
    let uc = (u0 + u1) / 2;
    const f0 = at(u0, s * FACE), f1 = at(u1, s * FACE);
    for (let k = 1; k < muro.length; k++) {
      const hit = segX(f0, f1, muro[k - 1], muro[k]);
      if (hit !== null) { uc = u0 + hit * (u1 - u0); break; }
    }
    uc = Math.min(u1 - 5, Math.max(u0 + 5, uc));
    const base = H(...at(uc, s * (FACE + 1.2))) - 0.4;
    const archH = Math.max(3, topMax - 1.0 - base);
    const ac = at(uc, s * (FACE + 0.03));
    tb.place(new THREE.ShapeGeometry(archOutline(8, archH), 10), COL.recess, ac[0], base, ac[1], 0, ry, 0);
    const ringShape = archOutline(9.2, archH + 0.6);
    ringShape.holes.push(archOutline(8, archH));
    tb.extrude(ringShape, 0.3, COL.travertine, ac[0], base, ac[1], 0, ry, 0);
    const key = at(uc, s * (FACE + 0.35));
    tb.box(0.8, 0.9, 0.3, COL.trim, key[0], base + archH + 0.15, key[1], ry);
    for (const e of [u0 - 0.5, u1 + 0.5]) {
      const pc = at(e, s * (FACE + 0.1));
      tb.box(1.0, topMax - base + 1, 0.5, COL.trim, pc[0], (topMax + base) / 2 - 0.5, pc[1], ryAlong);
    }
  }
  ctx.reserve({ x: out.centre[0], z: out.centre[1], r: 10 });
  return out;
}

// Parameter t along segment ab where it crosses segment cd, or null.
function segX(a, b, c, e) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = e[0] - c[0], sz = e[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}
