// Gelato cones in fun trails along the avenues (denser on the routes between tour stops):
// spinning, bobbing and twinkling, pulled in by the cart when it gets close, popped with
// confetti and a "+1", back 45 s later. Plus eight golden pine cones hidden under big pines
// away from the paths; the ones already found are remembered between visits.
import { pack } from './rig.js';
import { SPR } from './fx.js';
import { SURF } from '../../core/terrain.js';
import { pointInRing, randomPointInRing, clamp } from '../../core/geo.js';

const FLAVOURS = {
  fragola: '#f27fa5', pistacchio: '#a8d672', cioccolato: '#7b4a2d', limone: '#fbe56b', puffo: '#4fa3e8',
  fiordilatte: '#fff3d6', amarena: '#b8325a', mango: '#ffb347', menta: '#9ee6c7', nocciola: '#c49a6c',
};
const FL = Object.values(FLAVOURS);
const TARGET = 140;
const RESPAWN = 45;
const PINECONES = 8;
const SAVE_KEY = 'villa-borghese-cart-v1-pinecones';

export function createCollectibles(env) {
  const { ctx, graph, routes, crowds, fx } = env;
  const T = ctx.terrain;
  const rnd = ctx.rng('actors-gelato');

  // --- gelato placement --------------------------------------------------------------------
  const items = [];
  const fits = (x, z) => {
    if (!T.isInside(x, z)) return false;
    const s = T.surfaceAt(x, z);
    if (s !== SURF.PATH && s !== SURF.PLAZA) return false;
    if (!ctx.colliders.isFree(x, z, 0.8)) return false;
    return !items.some((g) => Math.abs(g.x - x) < 2.4 && Math.abs(g.z - z) < 2.4);
  };
  const flavourSet = () => {
    const a = FL[Math.floor(rnd() * FL.length)];
    let b = a, c = a;
    while (b === a) b = FL[Math.floor(rnd() * FL.length)];
    while (c === b) c = FL[Math.floor(rnd() * FL.length)];
    return { hex: [a, b, c], pal: { p: [pack(a), pack(b), pack(c), 0], a: 0, l: 0 } };
  };
  const add = (x, z) => {
    const f = flavourSet();
    items.push({ x, z, gx: T.heightAt(x, z), rx: x, rz: z, hex: f.hex, pal: f.pal, phase: rnd() * 6.28, state: 0, t: 0, grow: 1 });
  };

  // polyline walker: point at distance d along pts
  function along(pts, cum, d) {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = cum[i] - cum[i - 1] || 1, f = clamp((d - cum[i - 1]) / L, 0, 1);
    return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, dx: (bx - ax) / L, dz: (bz - az) / L };
  }
  // lateral offset of the i-th of n cones, w = room either side of the centre line
  const PATTERNS = [
    () => 0,
    (i, n, w) => Math.min(1.4, w),
    (i, n, w) => (i % 2 ? 1 : -1) * Math.min(1.3, w),
    (i, n, w) => Math.sin((i / (n - 1)) * Math.PI) * Math.min(1.8, w),
    (i, n, w) => (-1 + (2 * i) / (n - 1)) * Math.min(1.6, w),
  ];
  function trail(pts, cum, d, n, w) {
    const pat = PATTERNS[Math.floor(rnd() * PATTERNS.length)];
    const flip = rnd() < 0.5 ? -1 : 1;
    let placed = 0;
    for (let i = 0; i < n && items.length < TARGET; i++) {
      const p = along(pts, cum, d + i * 3.4);
      const off = pat(i, n, w) * flip;
      const x = p.x - p.dz * off, z = p.z + p.dx * off;
      if (fits(x, z)) { add(x, z); placed++; }
    }
    return placed;
  }
  const halfW = (x, z) => {
    const hit = graph.nearest(x, z, 12);
    return hit ? Math.max(0, hit.e.w / 2 - 1.1) : 0.5;
  };
  // trails along the tour routes
  const routeBudget = Math.round(TARGET * 0.78);
  for (const pts of routes) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1];
    for (let d = 14 + rnd() * 10; d < L - 16 && items.length < routeBudget; d += 42 + rnd() * 26) {
      const p = along(pts, cum, d);
      trail(pts, cum, d, 3 + Math.floor(rnd() * 3), halfW(p.x, p.z));
    }
  }
  // the rest on other avenues
  for (let k = 0; k < 400 && items.length < TARGET; k++) {
    const e = graph.edges[Math.floor(rnd() * graph.edges.length)];
    if (e.kind !== 'viale' || e.len < 14) continue;
    const A = graph.nodes[e.a], B = graph.nodes[e.b];
    const pts = [[A.x, A.z], [B.x, B.z]], cum = [0, e.len];
    trail(pts, cum, e.len / 2 - 4, 3, e.w / 2 - 1.1);
  }

  // --- pine cones ------------------------------------------------------------------------------
  const found = new Set();
  try { for (const id of JSON.parse(localStorage.getItem(SAVE_KEY) || '[]')) found.add(id); } catch { /* storage unavailable */ }
  if (!ctx.game.score.pinecones) found.clear();
  const saveFound = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify([...found])); } catch { /* storage unavailable */ } };

  const cones = pineSpots().map((p, id) => ({ id, ...p, gy: T.heightAt(p.x, p.z), state: found.has(id) ? 2 : 0, t: 0 }));

  function pineSpots() {
    const prng = ctx.rng('actors-pinecones');
    const cand = [];
    const veg = ctx.modules.vegetation;
    const trees = veg && (veg.trees || veg.list || veg.items);
    if (Array.isArray(trees)) {
      for (const t of trees) {
        const kind = String(t.kind || t.k || t.type || '');
        if (!/pine/i.test(kind) || typeof t.x !== 'number') continue;
        cand.push({ tx: t.x, tz: t.z, big: t.canopy || t.h || 1, r: t.r || 0.6 });
      }
    }
    if (cand.length < 40) {
      for (const ring of ctx.MAP.FOREST) {
        for (let k = 0; k < 10; k++) {
          const p = randomPointInRing(ring, prng);
          if (p) cand.push({ tx: p[0], tz: p[1], big: 1, r: 0.6 });
        }
      }
      for (const p of ctx.MAP.POIS) if (p.k === 'tree') cand.push({ tx: p.x, tz: p.z, big: 1.2, r: 0.6 });
    }
    // a spot just beside the trunk, on the side facing the nearest path, 6-20 m from it
    const ok = [];
    for (const c of cand) {
      const hit = graph.nearest(c.tx, c.tz, 30);
      if (!hit || hit.d < 6 || hit.d > 22) continue;
      const dx = (hit.x - c.tx) / hit.d, dz = (hit.z - c.tz) / hit.d;
      const x = c.tx + dx * (c.r + 1.3), z = c.tz + dz * (c.r + 1.3);
      if (!T.isInside(x, z) || ctx.isReserved(x, z, 0.5)) continue;
      const s = T.surfaceAt(x, z);
      if (s !== SURF.GRASS && s !== SURF.FOREST) continue;
      if (!ctx.colliders.isFree(x, z, 0.7)) continue;
      if (ctx.MAP.NOGO.some((n) => pointInRing(x, z, n.r))) continue;
      ok.push({ x, z, big: c.big });
    }
    if (!ok.length) return [];
    // spread them over the whole park
    ok.sort((a, b) => b.big - a.big || a.x - b.x);
    const chosen = [ok[Math.floor(prng() * Math.min(ok.length, 10))]];
    while (chosen.length < PINECONES && chosen.length < ok.length) {
      let best = null, bd = -1;
      for (const p of ok) {
        let d = Infinity;
        for (const q of chosen) d = Math.min(d, Math.hypot(p.x - q.x, p.z - q.z));
        if (d > bd) { bd = d; best = p; }
      }
      chosen.push(best);
    }
    return chosen;
  }

  ctx.events.on('tourReset', () => {
    found.clear(); saveFound();
    for (const c of cones) { c.state = 0; c.t = 0; }
  });

  // --- update ------------------------------------------------------------------------------------
  const VIS = ctx.quality.tier === 'low' ? 85 : 115;
  const P = ctx.quality.particles ?? 1;
  function collectGelato(g) {
    g.state = 1; g.t = 0;
    env.emit('collect', { kind: 'gelato', x: g.rx, z: g.rz, value: 1 });
    const y = g.gx + 1.6;
    fx.burst(g.rx, y, g.rz, { count: 18, colors: g.hex, speed: 4.5, up: 4, life: 0.9, size: 0.45, sizeEnd: 0.1, gravity: 10, drag: 1.2 });
    fx.burst(g.rx, y, g.rz, { count: 5, colors: ['#ffffff', '#fff3b0'], speed: 3, up: 2.5, life: 0.6, size: 0.55, sizeEnd: 0.1, sprite: SPR.STAR, gravity: 3 });
    fx.plusOne(g.rx, y + 0.5, g.rz);
  }

  function update(dt, t) {
    const c = env.cart;
    const magnet = ctx.game.boosting ? 5.5 : 4.2;
    for (const g of items) {
      if (g.state === 2) {
        g.t += dt;
        if (g.t > RESPAWN && Math.hypot(g.x - c.x, g.z - c.z) > 25) { g.state = 0; g.grow = 0; g.rx = g.x; g.rz = g.z; }
        continue;
      }
      const dx = g.rx - c.x, dz = g.rz - c.z, d2 = dx * dx + dz * dz;
      if (d2 > VIS * VIS) continue;
      g.grow = Math.min(1, g.grow + dt * 2);
      const bob = Math.sin(t * 2.6 + g.phase) * 0.14;
      let s = 1.0 * (g.grow < 1 ? g.grow * g.grow * (3 - 2 * g.grow) : 1);
      if (g.state === 1) {
        g.t += dt;
        s = (1 + g.t * 4) * Math.max(0, 1 - g.t / 0.2);
        if (g.t > 0.2) { g.state = 2; g.t = 0; continue; }
      } else if (env.playing) {
        // magnet towards the cart, then collect
        const d = Math.sqrt(d2);
        if (d < magnet) {
          const k = Math.min(1, dt * (8 + 10 * (1 - d / magnet)));
          g.rx -= dx * k; g.rz -= dz * k;
        }
        for (const cc of c.circles) {
          const ex = g.rx - cc.x, ez = g.rz - cc.z, rr = cc.r + 0.9;
          if (ex * ex + ez * ez < rr * rr) { collectGelato(g); break; }
        }
      }
      const ground = T.heightAt(g.rx, g.rz);
      const y = ground + 0.75 + bob;
      crowds.gelato.push(g.rx, y, g.rz, t * 1.7 + g.phase, s * 0.95, g.pal, null, 0.18);
      fx.shadow(g.rx, ground, g.rz, 0.45 * s);
      // twinkles
      if (d2 < 3600 && P > 0.4) {
        for (let i = 0; i < 2; i++) {
          const a = t * 1.3 + g.phase + i * Math.PI;
          const tw = Math.max(0, Math.sin(t * 3.1 + g.phase * 3 + i * 2.1));
          if (tw > 0.2) fx.sparkle(g.rx + Math.cos(a) * 0.55, y + 0.9 + Math.sin(a * 1.7) * 0.35, g.rz + Math.sin(a) * 0.55, 0.42 * tw, '#fff6c8', tw);
        }
      }
    }

    // pine cones
    for (const p of cones) {
      if (p.state === 2) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d2 = dx * dx + dz * dz;
      if (d2 > 140 * 140) continue;
      let s = 1;
      if (p.state === 1) {
        p.t += dt;
        s = (1 + p.t * 3) * Math.max(0, 1 - p.t / 0.35);
        if (p.t > 0.35) { p.state = 2; continue; }
      } else if (env.playing) {
        for (const cc of c.circles) {
          const ex = p.x - cc.x, ez = p.z - cc.z, rr = cc.r + 1.9;
          if (ex * ex + ez * ez < rr * rr) {
            p.state = 1; p.t = 0;
            found.add(p.id); saveFound();
            env.emit('collect', { kind: 'pinecone', x: p.x, z: p.z, value: 1, id: p.id, found: found.size, total: cones.length });
            const y = p.gy + 1;
            fx.burst(p.x, y, p.z, { count: 26, colors: ['#ffd84a', '#fff3b0', '#ffb703'], speed: 6, up: 6, life: 1.1, size: 0.45, sizeEnd: 0.1, sprite: SPR.STAR, gravity: 6 });
            fx.burst(p.x, y, p.z, { count: 14, colors: ['#ff6f91', '#ffd84a', '#4fa3e8', '#6cc070'], speed: 5, up: 5, life: 1.0, size: 0.3, gravity: 9 });
            fx.plusOne(p.x, y + 0.8, p.z, '#ffcf3a', 1.2);
            break;
          }
        }
      }
      const y = p.gy + 0.25 + Math.sin(t * 2 + p.id) * 0.08;
      crowds.pinecone.push(p.x, y, p.z, t * 0.9 + p.id, 1.15 * s, null, null, 0.35);
      fx.shadow(p.x, p.gy, p.z, 0.45);
      if (d2 < 70 * 70) {
        // golden glints, and a slow column of motes so a sharp eye can spot it from the path
        for (let i = 0; i < 3; i++) {
          const tw = Math.max(0, Math.sin(t * 2.3 + i * 2.09 + p.id));
          const a = t * 0.8 + i * 2.09;
          if (tw > 0.15) fx.sparkle(p.x + Math.cos(a) * 0.6, y + 0.5 + i * 0.25, p.z + Math.sin(a) * 0.6, 0.55 * tw, '#ffe27a', tw);
        }
        for (let i = 0; i < 4; i++) {
          const u = (t * 0.35 + i / 4 + p.id * 0.13) % 1;
          fx.sparkle(p.x + Math.sin(i * 7 + t) * 0.3, p.gy + 0.8 + u * 4, p.z + Math.cos(i * 5 + t) * 0.3, 0.16, '#ffe9a0', Math.sin(u * Math.PI) * 0.7, SPR.DOT);
        }
      }
    }
  }

  return {
    items, cones, found, update,
    // for the mini-map / debugging
    pinecones: () => cones.map((c) => ({ id: c.id, x: c.x, z: c.z, found: c.state === 2 })),
  };
}
