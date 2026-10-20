// Pigeon flocks pecking on squares and avenues (they burst into the air when the cart comes
// close or honks, circle, then land again) and a mallard family crossing Viale del Lago: the
// mother leads five ducklings in a line from the water to the lawn and back, and hurries on a honk.
import { pack } from './rig.js';
import { SPR } from './fx.js';
import { SURF } from '../../core/terrain.js';
import { pointInRing, ringCentroid, distToRingEdge, angleLerp, clamp } from '../../core/geo.js';

const PIGEON_PALS = [
  ['#9aa1ad', '#b3b8c2', '#5f8f80'], ['#8a909c', '#a9aeb8', '#6a7f95'], ['#6e7380', '#868b96', '#55806f'],
  ['#c9c6bf', '#dad7d0', '#8f9a8c'], ['#a48d7a', '#bba590', '#7a8f7c'], ['#eeeeea', '#f6f6f2', '#d8d8d2'],
].map(([b, w, n]) => ({ p: [pack(b), pack(w), 0, pack(n)], a: 0, l: 0 }));

export function createAnimals(env) {
  const { ctx, graph, crowds, fx } = env;
  const T = ctx.terrain, MAP = ctx.MAP;
  const rnd = ctx.rng('actors-animals');
  const live = Math.random;
  const flockScale = ctx.quality.tier === 'low' ? 0.6 : ctx.quality.tier === 'med' ? 0.85 : 1;

  // --- pigeon sites: squares, cafés, fountains and statues, plus the Pincio terrace -----------
  const sites = [];
  const okGround = (x, z) => {
    if (!T.isInside(x, z)) return false;
    const s = T.surfaceAt(x, z);
    return s === SURF.PATH || s === SURF.PLAZA || s === SURF.GRASS;
  };
  const addSite = (x, z, r, n) => {
    if (!okGround(x, z) || !ctx.colliders.isFree(x, z, 1.0)) return;
    if (sites.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) return;
    sites.push({ i: sites.length, x, z, r, n: Math.max(4, Math.round(n * flockScale)), birds: null, scared: 0, cool: 0 });
  };
  const st = ctx.game.start;
  addSite(st.x + Math.sin(st.heading) * 16, st.z + Math.cos(st.heading) * 16 + 3, 4.5, 12);
  const terr = MAP.ANCHORS.terrazza;
  if (terr) addSite(terr.x + 8, terr.z - 2, 4, 9);
  for (const p of MAP.PLAZAS) {
    const [cx, cz] = ringCentroid(p.r);
    addSite(cx, cz, 4.5, 8 + Math.floor(rnd() * 5));
  }
  for (const p of MAP.POIS) {
    if (!/cafe|fountain|statue|playground/.test(p.k)) continue;
    const hit = graph.nearest(p.x, p.z, 14);
    if (hit && hit.d < 12) addSite(hit.x + (p.x - hit.x) * 0.3, hit.z + (p.z - hit.z) * 0.3, 3.5, 6 + Math.floor(rnd() * 5));
  }
  // and some along the avenues
  for (let i = 0; i < 40 && sites.length < 40; i++) {
    const e = graph.edges[Math.floor(rnd() * graph.edges.length)];
    if (e.kind !== 'viale' || e.len < 10) continue;
    const t = e.len * (0.2 + rnd() * 0.6), A = graph.nodes[e.a];
    addSite(A.x + e.dx * t, A.z + e.dz * t, 3, 5 + Math.floor(rnd() * 4));
  }

  function wakeSite(s) {
    const rnd = ctx.rng(`actors-pigeons-${s.i}`);
    s.birds = [];
    for (let i = 0; i < s.n; i++) {
      let x = s.x, z = s.z;
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * s.r;
        x = s.x + Math.cos(a) * r; z = s.z + Math.sin(a) * r;
        if (okGround(x, z) && ctx.colliders.isFree(x, z, 0.15)) break;
      }
      s.birds.push({
        hx: x, hz: z, x, z, y: T.heightAt(x, z), h: rnd() * 6.28, tx: x, tz: z,
        mode: 0, t: rnd() * 3, peck: 0, vx: 0, vy: 0, vz: 0, orbit: rnd() * 6.28, orbitR: 5 + rnd() * 4,
        alt: 4 + rnd() * 4, pal: PIGEON_PALS[rnd() < 0.7 ? Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 3)],
        s: 1.25 + rnd() * 0.2, flap: rnd() * 6.28,
      });
    }
  }

  function scare(s, fromX, fromZ) {
    if (s.cool > 0) return;
    s.cool = 2.5;
    s.scared = 6 + live() * 3;
    env.emit('animal', { kind: 'pigeons', x: s.x, z: s.z });
    for (const b of s.birds) {
      if (b.mode === 1) continue;
      let dx = b.x - fromX, dz = b.z - fromZ;
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      b.mode = 1; b.t = 0;
      b.vx = dx * (2.5 + live() * 2.5) + (live() - 0.5) * 2;
      b.vz = dz * (2.5 + live() * 2.5) + (live() - 0.5) * 2;
      b.vy = 4 + live() * 2.5;
      b.orbit = Math.atan2(b.z - s.z, b.x - s.x);
      if (live() < 0.35) fx.burst(b.x, b.y + 0.3, b.z, { count: 2, colors: ['#e8e8ec', '#b9bdc6'], speed: 1.5, up: 1.2, life: 1.4, size: 0.16, sizeEnd: 0.1, gravity: 1.2, drag: 2.5 });
    }
  }

  function updatePigeons(dt, t) {
    const c = env.cart;
    const honk = env.honkNow;
    for (const s of sites) {
      const dc = Math.hypot(s.x - c.x, s.z - c.z);
      if (dc > 125) { if (dc > 150) s.birds = null; continue; }
      if (!s.birds) wakeSite(s);
      s.cool -= dt;
      s.scared -= dt;
      if (honk && dc < 30) scare(s, c.x, c.z);
      const cartNear = dc < s.r + 10;
      for (const b of s.birds) {
        b.t += dt;
        if (b.mode === 0) {
          // ground: walk to little targets, peck in between
          const dx = b.x - c.x, dz = b.z - c.z, d2 = dx * dx + dz * dz;
          if (env.playing && (d2 < 49 && Math.abs(c.speed) > 1 || d2 < 12)) { scare(s, c.x, c.z); continue; }
          if (b.t > 0) {
            if (live() < 0.5) { b.peck = 0.9; b.t = -(0.8 + live() * 1.6); }
            else {
              const a = live() * Math.PI * 2, r = live() * 1.2;
              b.tx = clamp(b.hx + Math.cos(a) * r, s.x - s.r, s.x + s.r);
              b.tz = clamp(b.hz + Math.sin(a) * r, s.z - s.r, s.z + s.r);
              b.t = -(1 + live() * 2);
            }
          }
          const mx = b.tx - b.x, mz = b.tz - b.z, md = Math.hypot(mx, mz);
          if (md > 0.05) {
            const step = Math.min(md, 0.55 * dt);
            b.x += (mx / md) * step; b.z += (mz / md) * step;
            b.h = angleLerp(b.h, Math.atan2(mx, mz), Math.min(1, dt * 8));
          }
          b.peck = Math.max(0, b.peck - dt);
          b.y = T.heightAt(b.x, b.z);
        } else {
          // flying: climb, circle the site, land when the coast is clear
          const landing = s.scared <= 0 && !cartNear;
          let tx, ty, tz;
          if (!landing) {
            b.orbit += dt * (0.7 + (b.orbitR - 5) * 0.05);
            tx = s.x + Math.cos(b.orbit) * b.orbitR; tz = s.z + Math.sin(b.orbit) * b.orbitR;
            ty = T.heightAt(s.x, s.z) + b.alt;
          } else {
            tx = b.hx; tz = b.hz; ty = T.heightAt(b.hx, b.hz);
            if (Math.hypot(tx - b.x, tz - b.z) > 1.5) ty += 1.5;
          }
          const k = b.t < 0.5 ? 0.6 : 2.2;
          b.vx += ((tx - b.x) * 1.4 - b.vx) * Math.min(1, dt * k);
          b.vz += ((tz - b.z) * 1.4 - b.vz) * Math.min(1, dt * k);
          b.vy += ((ty - b.y) * 1.6 - b.vy) * Math.min(1, dt * k);
          const sp = Math.hypot(b.vx, b.vz);
          if (sp > 8) { b.vx *= 8 / sp; b.vz *= 8 / sp; }
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (sp > 0.3) b.h = angleLerp(b.h, Math.atan2(b.vx, b.vz), Math.min(1, dt * 6));
          b.flap += dt * (landing && b.y - ty < 1 ? 14 : 22);
          const g = T.heightAt(b.x, b.z);
          if (b.y < g) b.y = g;
          if (landing && Math.hypot(b.hx - b.x, b.hz - b.z) < 0.35 && b.y - g < 0.15) {
            b.mode = 0; b.x = b.hx; b.z = b.hz; b.y = g; b.tx = b.x; b.tz = b.z; b.t = -1;
          }
        }
        // draw
        if (b.mode === 0) {
          const bob = b.peck > 0 ? Math.max(0, Math.sin(b.peck * 14)) * 0.55 : Math.sin(t * 9 + b.orbit) * 0.06;
          crowds.pigeon.push(b.x, b.y, b.z, b.h, b.s, b.pal, null, 0, bob);
          fx.shadow(b.x, b.y, b.z, 0.22 * b.s);
        } else {
          const a = Math.PI / 2 + Math.sin(b.flap) * 0.95;
          crowds.pigeonFly.push(b.x, b.y, b.z, b.h, b.s, b.pal, [0, 0, a, a], 0, -clamp(b.vy * 0.06, -0.4, 0.4));
          const g = T.heightAt(b.x, b.z);
          fx.shadow(b.x, g, b.z, 0.25 * b.s * clamp(1 - (b.y - g) / 12, 0.3, 1));
        }
      }
    }
  }

  // --- ducks ----------------------------------------------------------------------------------
  const lake = MAP.WATER.find((w) => w.k === 'lake');
  const island = lake?.h?.[0] || null;
  const inWater = (x, z) => lake && pointInRing(x, z, lake.r) && !(island && pointInRing(x, z, island));
  const surfY = (x, z) => Math.max(T.heightAt(x, z), ctx.WATER_Y - 0.07);

  // Crossing: a lakeside avenue with water on one side and lawn on the other.
  let crossing = null;
  if (lake) {
    const [lx, lz] = ringCentroid(lake.r);
    let best = Infinity;
    for (const k of graph.edgesNear(lx, lz, 60)) {
      const e = graph.edges[k];
      if (e.kind !== 'viale' || e.len < 6) continue;
      const A = graph.nodes[e.a];
      for (let t = 2; t < e.len - 2; t += 1.5) {
        const px = A.x + e.dx * t, pz = A.z + e.dz * t;
        const nx = -e.dz, nz = e.dx;
        for (const side of [1, -1]) {
          const wx = px + nx * side * (e.w / 2 + 2.5), wz = pz + nz * side * (e.w / 2 + 2.5);
          const gx = px - nx * side * (e.w / 2 + 5), gz = pz - nz * side * (e.w / 2 + 5);
          if (!inWater(wx, wz) || distToRingEdge(wx, wz, lake.r) < 1) continue;
          const sg = T.surfaceAt(gx, gz);
          if ((sg !== SURF.GRASS && sg !== SURF.FOREST) || !ctx.colliders.isFree(gx, gz, 1.2)) continue;
          // prefer straight stretches where the water is right next to the avenue
          const score = distToRingEdge(px, pz, lake.r) + Math.abs(t - e.len / 2) * 0.05;
          if (score < best) {
            best = score;
            const deep = [wx + nx * side * 5, wz + nz * side * 5];
            crossing = { px, pz, nx: nx * side, nz: nz * side, water: [wx, wz], deep: inWater(deep[0], deep[1]) ? deep : [wx, wz], lawn: [gx, gz] };
          }
        }
      }
    }
  }

  const DUCK_MOM = { p: [pack('#8a6a4a'), pack('#f4f1ea'), 0, pack('#7a5a3c')], a: pack('#f08a24'), l: 0 };
  const DUCKLING = { p: [pack('#f2cf5b'), pack('#f2cf5b'), 0, pack('#f7dc74')], a: pack('#f0a03a'), l: 0 };
  const DRAKE = { p: [pack('#b9b2a6'), pack('#f4f1ea'), 0, pack('#2f7a4a')], a: pack('#f2c230'), l: 0 };

  let family = null;
  if (crossing) {
    const [dx, dz] = crossing.deep;
    family = {
      x: dx, z: dz, h: 0, phase: 0, mode: 'swim', t: 0, wait: 6, path: null, pi: 0,
      hurry: 0, cool: 0, trail: [], ducks: [], ox: 0, oz: 0,
    };
    for (let i = 0; i < 5; i++) family.ducks.push({ x: dx, z: dz, h: 0, ox: 0, oz: 0, hop: 0, phase: rnd() * 6 });
  }
  // a few ducks paddling on the lake in slow loops
  const swimmers = [];
  if (lake) {
    const [cx, cz] = ringCentroid(lake.r);
    for (let i = 0; i < 4; i++) {
      const loop = lake.r.map(([x, z]) => [cx + (x - cx) * (0.72 - i * 0.04), cz + (z - cz) * (0.72 - i * 0.04)]);
      if (loop.every(([x, z]) => inWater(x, z))) swimmers.push({ loop, u: rnd() * loop.length, speed: 0.35 + rnd() * 0.2, pal: i % 2 ? DRAKE : DUCK_MOM, h: 0, x: loop[0][0], z: loop[0][1] });
    }
  }

  function walkPath(f, pts) { f.path = pts; f.pi = 0; }

  function updateDucks(dt, t) {
    const c = env.cart;
    for (const s of swimmers) {
      const n = s.loop.length;
      s.u = (s.u + dt * s.speed / 6) % n;
      const i = Math.floor(s.u), j = (i + 1) % n, f = s.u - i;
      const x = s.loop[i][0] + (s.loop[j][0] - s.loop[i][0]) * f, z = s.loop[i][1] + (s.loop[j][1] - s.loop[i][1]) * f;
      if (Math.hypot(x - c.x, z - c.z) > 140) continue;
      s.h = angleLerp(s.h, Math.atan2(x - s.x, z - s.z), Math.min(1, dt * 2));
      s.x = x; s.z = z;
      crowds.duck.push(x, ctx.WATER_Y - 0.08 + Math.sin(t * 2 + s.u) * 0.015, z, s.h, 1.4, s.pal, null, 0);
    }
    const f = family;
    if (!f || Math.hypot(f.x - c.x, f.z - c.z) > 140) return;
    const C = crossing;
    f.t += dt; f.cool -= dt; f.hurry -= dt;
    // honk or a close cart: hurry up, quack
    const dcart = Math.hypot(f.x - c.x, f.z - c.z);
    if ((env.honkNow && dcart < 32) || (env.playing && dcart < 9 && Math.abs(c.speed) > 2)) {
      f.hurry = 3;
      if (f.cool <= 0) {
        f.cool = 2.5;
        env.emit('animal', { kind: 'ducks', x: f.x, z: f.z });
        fx.bubble('Qua qua!', f.x, surfY(f.x, f.z) + 1.0, f.z, 1.3);
      }
    }
    const sp = (f.mode === 'swim' ? 0.5 : 0.75) * (f.hurry > 0 ? 2.3 : 1);
    if (f.mode === 'swim') {
      // paddle a little circle, then head for the shore
      const a = f.t * 0.25;
      const tx = C.deep[0] + Math.cos(a) * 2.5, tz = C.deep[1] + Math.sin(a) * 2.5;
      f.h = angleLerp(f.h, Math.atan2(tx - f.x, tz - f.z), Math.min(1, dt * 1.5));
      f.x += (tx - f.x) * Math.min(1, dt * 0.4); f.z += (tz - f.z) * Math.min(1, dt * 0.4);
      if (f.t > f.wait) { f.mode = 'cross'; walkPath(f, [C.water, [C.px, C.pz], C.lawn]); }
    } else if (f.mode === 'graze') {
      if (f.t > f.wait) { f.mode = 'back'; walkPath(f, [[C.px, C.pz], C.water, C.deep]); }
    } else {
      const [tx, tz] = f.path[f.pi];
      const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
      if (d < 0.2) {
        if (++f.pi >= f.path.length) {
          f.t = 0;
          if (f.mode === 'cross') { f.mode = 'graze'; f.wait = 5 + live() * 5; }
          else { f.mode = 'swim'; f.wait = 7 + live() * 6; }
        }
      } else {
        const step = Math.min(d, sp * dt);
        f.x += (dx / d) * step; f.z += (dz / d) * step;
        f.h = angleLerp(f.h, Math.atan2(dx, dz), Math.min(1, dt * 6));
      }
    }
    if (f.mode === 'graze') { f.x += Math.sin(f.t * 0.7) * 0.15 * dt; f.z += Math.cos(f.t * 0.5) * 0.15 * dt; }
    // trail for the ducklings
    const last = f.trail[0];
    if (!last || Math.hypot(last[0] - f.x, last[1] - f.z) > 0.12) {
      f.trail.unshift([f.x, f.z]);
      if (f.trail.length > 40) f.trail.pop();
    }
    // mom flutters aside from the wheels too
    if (env.playing) {
      for (const cc of c.circles) {
        const ex = f.x + f.ox - cc.x, ez = f.z + f.oz - cc.z, e2 = ex * ex + ez * ez, rr = cc.r + 0.7;
        if (e2 >= rr * rr) continue;
        const L = Math.sqrt(e2) || 1;
        f.ox += (ex / L) * (rr - L + 0.2); f.oz += (ez / L) * (rr - L + 0.2);
        if (f.cool <= 0) {
          f.cool = 1.5; f.hurry = 3;
          env.emit('animal', { kind: 'ducks', x: f.x, z: f.z });
          fx.burst(f.x + f.ox, surfY(f.x, f.z) + 0.4, f.z + f.oz, { count: 5, colors: ['#8a6a4a', '#f4f1ea'], speed: 1.6, up: 1.5, life: 1.2, size: 0.18, gravity: 1.5, drag: 2, sprite: SPR.DOT });
        }
      }
    }
    f.ox *= Math.exp(-dt * 0.8); f.oz *= Math.exp(-dt * 0.8);
    const mx0 = f.x + f.ox, mz0 = f.z + f.oz;
    const onLand = !inWater(mx0, mz0);
    const moving = f.mode !== 'swim' && f.mode !== 'graze';
    f.phase += dt * (moving ? 14 * (f.hurry > 0 ? 1.8 : 1) : 0);
    const momY = surfY(mx0, mz0);
    crowds.duck.push(mx0, momY + (onLand ? 0 : -0.08), mz0, f.h, 1.5, DUCK_MOM,
      [f.phase, onLand && moving ? 0.6 : 0, 0, 0], 0, 0, onLand && moving ? Math.sin(f.phase) * 0.12 : 0);
    if (onLand) fx.shadow(mx0, momY, mz0, 0.4);
    f.ducks.forEach((d, i) => {
      const k = Math.min(f.trail.length - 1, 4 + i * 4);
      const [tx, tz] = f.trail[k] || [f.x, f.z];
      const mx = tx - d.x, mz = tz - d.z;
      if (mx * mx + mz * mz > 1e-5) d.h = angleLerp(d.h, Math.atan2(mx, mz), Math.min(1, dt * 8));
      d.x = tx; d.z = tz;
      // flutter aside from the cart's wheels
      if (env.playing) {
        for (const cc of c.circles) {
          const ex = d.x + d.ox - cc.x, ez = d.z + d.oz - cc.z, e2 = ex * ex + ez * ez, rr = cc.r + 0.6;
          if (e2 < rr * rr) {
            const L = Math.sqrt(e2) || 1;
            d.ox += (ex / L) * (rr - L + 0.2); d.oz += (ez / L) * (rr - L + 0.2);
            d.hop = 0.35;
          }
        }
      }
      d.ox *= Math.exp(-dt * 0.8); d.oz *= Math.exp(-dt * 0.8);
      d.hop = Math.max(0, d.hop - dt);
      d.phase += dt * (moving ? 20 : 0);
      const x = d.x + d.ox, z = d.z + d.oz, land = !inWater(x, z);
      const y = surfY(x, z) + (land ? 0 : -0.04) + Math.sin(Math.min(1, d.hop / 0.35) * Math.PI) * 0.3;
      crowds.duck.push(x, y, z, d.h, 0.7, DUCKLING, [d.phase, land && moving ? 0.7 : 0, 0, 0], 0, 0, land && moving ? Math.sin(d.phase) * 0.15 : 0);
      if (land) fx.shadow(x, surfY(x, z), z, 0.2);
    });
  }

  return {
    sites, crossing,
    update(dt, t) {
      updatePigeons(dt, t);
      updateDucks(dt, t);
    },
  };
}
