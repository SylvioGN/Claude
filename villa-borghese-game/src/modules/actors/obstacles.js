// Things on the road: kids kicking a football back and forth across an avenue, "lavori in
// corso" roadworks with cones that fly away when hit, puddles by the nasoni drinking fountains
// that splash, and balloon sellers (Pincio and the lake) whose balloons sometimes escape.
import * as THREE from 'three';
import { pack, RigBuilder } from './rig.js';
import { roadworks, puddles as puddleGeometry } from './models.js';
import { SPR } from './fx.js';
import { SURF } from '../../core/terrain.js';
import { clamp } from '../../core/geo.js';

const BALLOONS = ['#e63946', '#ffd60a', '#1d7af3', '#2ec46d', '#ff70a6', '#ff9f1c', '#9b5de5', '#4cc9f0', '#ffffff', '#e63946', '#ffd60a'];

export function createObstacles(env) {
  const { ctx, graph, crowds, fx, people, routeDist } = env;
  const T = ctx.terrain;
  const rnd = ctx.rng('actors-obstacles');
  const live = Math.random;
  const stops = ctx.game.stops;
  const farFromStops = (x, z, d) => stops.every((s) => Math.hypot(s.spotX - x, s.spotZ - z) > d && Math.hypot(s.x - x, s.z - z) > d);
  const clearGround = (x, z, r) => T.isInside(x, z) && ctx.colliders.isFree(x, z, r) && !ctx.isReserved(x, z, 0.5);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _e = new THREE.Euler();
  const ONE = new THREE.Vector3(1, 1, 1), _s = new THREE.Vector3();

  // Candidate straight avenue spots, route edges first.
  const spots = [];
  for (const e of graph.edges) {
    if (e.kind !== 'viale' || e.len < 16) continue;
    const A = graph.nodes[e.a];
    const t = e.len / 2, x = A.x + e.dx * t, z = A.z + e.dz * t;
    spots.push({ e, t, x, z, route: routeDist(x, z) < 3, r: rnd() });
  }
  spots.sort((a, b) => (b.route - a.route) || (a.r - b.r));
  const used = [];
  const takeSpot = (minGap, test) => {
    for (const s of spots) {
      if (used.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < minGap)) continue;
      if (!test(s)) continue;
      used.push(s);
      return s;
    }
    return null;
  };

  // --- roadworks: barrier, sign, sand heap and a taper of cones --------------------------------
  // On the tour avenues for fun, but the barrier and the sand stand at the edge (their inner end
  // at least 1.7 from the centre line) and the other lane must be clear, so they never block the
  // way: the golden route bends past them and the cones are there to be knocked over.
  const works = [];
  const staticParts = new RigBuilder();
  const BARRIER_IN = 1.25 + 0.15; // barrier half-length + collider pad, towards the centre line
  const laneClear = (s, lat) => {
    for (let along = -8; along <= 8; along += 2) {
      const x = s.x + s.e.dx * along - s.e.dz * lat, z = s.z + s.e.dz * along + s.e.dx * lat;
      if (!ctx.colliders.isFree(x, z, 1.5) || !T.isInside(x, z)) return false;
    }
    return true;
  };
  for (let i = 0; i < 3; i++) {
    const s = takeSpot(130, (s) => s.e.len >= 24 && s.e.w >= 6.4 && farFromStops(s.x, s.z, 30) && s.route && laneClear(s, -0.6));
    if (!s) break;
    const e = s.e, dx = e.dx, dz = e.dz, rx = -dz, rz = dx;
    const half = e.w / 2;
    const at = (along, lat) => [s.x + dx * along + rx * lat, s.z + dz * along + rz * lat];
    const [bx, bz] = at(0, Math.max(half - 0.55, 1.7 + BARRIER_IN));
    const by = T.heightAt(bx, bz);
    // local frame: x across the avenue, z towards oncoming traffic
    _m.makeBasis(_v.set(rx, 0, rz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dx, 0, -dz)).setPosition(bx, by, bz);
    roadworks(staticParts, _m);
    const pt = (lx, lz) => [bx + rx * lx - dx * lz, bz + rz * lx - dz * lz];
    const [a0x, a0z] = pt(-1.08, 0), [a1x, a1z] = pt(1.08, 0);
    ctx.colliders.addSegment(a0x, a0z, a1x, a1z, 'fence', null, 0.15);
    const [sx, sz] = pt(1.9, 0);
    ctx.colliders.addCircle(sx, sz, 0.3, 'sign');
    const [hx, hz] = pt(-0.3, -1.0);
    ctx.colliders.addCircle(hx, hz, 0.7, 'sand');
    ctx.reserve({ x: bx, z: bz, r: 3 });
    const cones = [];
    // the taper leads traffic out of the closed lane, upstream of the barrier (where the sign faces)
    const taper = [[half - 0.4, -10], [half - 1.1, -8], [half - 1.8, -6], [half - 2.5, -4], [half - 3.0, -2], [half - 3.1, -0.4], [half - 1.0, 1.4]];
    for (const [lat, along] of taper) {
      const [x, z] = at(along, lat);
      if (!ctx.colliders.isFree(x, z, 0.3)) continue;
      cones.push({ hx: x, hz: z, x, z, y: T.heightAt(x, z), vx: 0, vy: 0, vz: 0, q: new THREE.Quaternion(), w: new THREE.Vector3(), mode: 0, cool: 0 });
    }
    works.push({ x: bx, z: bz, dx, dz, cones, messy: 0 });
  }
  if (staticParts.parts.length) {
    const geo = staticParts.build();
    geo.deleteAttribute('aRig');
    const mesh = new THREE.Mesh(geo, ctx.util.mats().vcFlat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'roadworks';
    env.root.add(mesh);
  }

  // --- football games ---------------------------------------------------------------------------
  const games = [];
  const NG = ctx.quality.tier === 'low' ? 5 : 8;
  for (let i = 0; i < NG; i++) {
    const s = takeSpot(90, (s) => {
      if (!farFromStops(s.x, s.z, 25)) return false;
      const nx = -s.e.dz, nz = s.e.dx, off = s.e.w / 2 + 4.5;
      for (const side of [1, -1]) {
        const x = s.x + nx * off * side, z = s.z + nz * off * side, g = T.surfaceAt(x, z);
        if ((g !== SURF.GRASS && g !== SURF.FOREST) || !clearGround(x, z, 1.5)) return false;
      }
      return true;
    });
    if (!s) break;
    const nx = -s.e.dz, nz = s.e.dx, off = s.e.w / 2 + 4.5;
    games.push({
      x: s.x, z: s.z,
      ends: [[s.x + nx * off, s.z + nz * off], [s.x - nx * off, s.z - nz * off]],
      kids: null, ball: null, wait: 1 + rnd() * 2,
    });
  }

  function wakeGame(g) {
    g.kids = g.ends.map(([x, z], i) => {
      const [ox, oz] = g.ends[1 - i];
      return people.addStatic({ kind: 'kid', x, z, h: Math.atan2(ox - x, oz - z), s: 0.58 + live() * 0.1 });
    });
    const [x, z] = g.ends[0];
    g.ball = { x, z, y: T.heightAt(x, z) + 0.3, vx: 0, vy: 0, vz: 0, q: new THREE.Quaternion(), mode: 'held', holder: 0, t: 0, idle: 0, cool: 0 };
  }
  function sleepGame(g) {
    for (const k of g.kids) people.removeStatic(k);
    g.kids = null; g.ball = null;
  }

  const BR = 0.3;
  function kick(g, from) {
    const b = g.ball;
    const [tx, tz] = g.ends[1 - from];
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz) || 1;
    const v = 4.8 + live() * 1.2;
    b.vx = (dx / d) * v; b.vz = (dz / d) * v; b.vy = live() < 0.3 ? 2.5 : 0;
    b.mode = 'roll'; b.t = 0;
    g.kids[from].kickT = 0.35;
  }

  function updateBall(g, dt) {
    const b = g.ball, c = env.cart;
    const g0 = T.heightAt(b.x, b.z) + BR;
    if (b.mode === 'held') {
      const k = g.kids[b.holder];
      const fx0 = Math.sin(k.h) * 0.45, fz0 = Math.cos(k.h) * 0.45;
      b.x += (k.x0 + fx0 - b.x) * Math.min(1, dt * 6); b.z += (k.z0 + fz0 - b.z) * Math.min(1, dt * 6); b.y = g0;
      b.t += dt;
      if (b.t > g.wait) { g.wait = 0.8 + live() * 1.6; kick(g, b.holder); }
    } else {
      b.t += dt;
      b.vy -= 18 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      const gy = T.heightAt(b.x, b.z) + BR;
      if (b.y < gy) {
        b.y = gy;
        if (b.vy < -2) { b.vy *= -0.45; b.vx *= 0.8; b.vz *= 0.8; } else b.vy = 0;
      }
      const fr = b.y <= gy + 0.01 ? Math.exp(-dt * (b.mode === 'roll' ? 0.35 : 0.9)) : 1;
      b.vx *= fr; b.vz *= fr;
      // trees, benches and walls stop it
      const hit = ctx.colliders.collideCircle(b.x, b.z, BR);
      if (hit.hit) {
        b.x = hit.x; b.z = hit.z;
        const dot = b.vx * hit.nx + b.vz * hit.nz;
        if (dot < 0) { b.vx -= 1.6 * dot * hit.nx; b.vz -= 1.6 * dot * hit.nz; }
      }
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0.05) {
        _v.set(b.vz, 0, -b.vx).normalize();
        b.q.premultiply(_q.setFromAxisAngle(_v, (sp * dt) / BR));
      }
      if (b.mode === 'roll') {
        for (let i = 0; i < 2; i++) {
          const [ex, ez] = g.ends[i];
          if (i === b.holder && b.t < 0.5) continue;
          if (Math.hypot(b.x - ex, b.z - ez) < 0.9) { b.mode = 'held'; b.holder = i; b.t = 0; }
        }
        if (sp < 0.4 && b.t > 1) b.mode = 'lost';
      }
      if (b.mode === 'lost' || b.mode === 'flying') {
        b.idle += dt;
        const near = Math.hypot(b.x - g.x, b.z - g.z);
        if ((sp < 0.3 && b.idle > 2.5) || b.idle > 7 || near > 45) {
          // the nearest kid fetches a new ball
          b.mode = 'held'; b.holder = live() < 0.5 ? 0 : 1; b.t = -0.6; b.idle = 0;
          const k = g.kids[b.holder];
          b.x = k.x0; b.z = k.z0;
          fx.burst(b.x, b.y, b.z, { count: 6, colors: ['#ffffff'], speed: 1, up: 1, life: 0.4, size: 0.3, sprite: SPR.STAR, gravity: 0 });
        }
      }
    }
    // the cart kicks it
    b.cool -= dt;
    if (env.playing && b.cool <= 0) {
      for (const cc of c.circles) {
        const ex = b.x - cc.x, ez = b.z - cc.z, rr = cc.r + BR;
        if (ex * ex + ez * ez < rr * rr) {
          const L = Math.hypot(ex, ez) || 1;
          const sp = Math.abs(c.speed);
          b.vx = c.fx * (sp * 1.25 + 2) + (ex / L) * 3;
          b.vz = c.fz * (sp * 1.25 + 2) + (ez / L) * 3;
          b.vy = 3.5 + sp * 0.3;
          b.mode = 'flying'; b.t = 0; b.idle = 0; b.cool = 0.5;
          if (sp > 1.5) {
            env.bumpCart('ball', 0.12, b.x, b.z, 0, 0, false);
            const kid = g.kids[live() < 0.5 ? 0 : 1];
            fx.bubble(sp > 7 ? 'Gooool!' : live() < 0.5 ? 'Ehi!' : 'La palla!', kid.x0, kid.y + 1.6, kid.z0, 1.5);
          }
          break;
        }
      }
    }
    _m.compose(_v.set(b.x, b.y, b.z), b.q, ONE);
    crowds.ball.pushMatrix(_m);
    fx.shadow(b.x, T.heightAt(b.x, b.z), b.z, 0.35 * clamp(1 - (b.y - g0) / 6, 0.3, 1));
  }

  let coneBumpCool = 0;
  function updateCones(w, dt) {
    const c = env.cart;
    const dc = Math.hypot(w.x - c.x, w.z - c.z);
    if (dc > 160) return;
    let displaced = false;
    for (const k of w.cones) {
      k.cool -= dt;
      if (k.mode === 1) {
        k.vy -= 20 * dt;
        k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt;
        const L = k.w.length();
        if (L > 1e-3) k.q.premultiply(_q.setFromAxisAngle(_v.copy(k.w).divideScalar(L), L * dt));
        const g = T.heightAt(k.x, k.z);
        if (k.y < g + 0.2) {
          k.y = g + 0.2;
          if (k.vy < -2.5) { k.vy *= -0.35; k.vx *= 0.6; k.vz *= 0.6; k.w.multiplyScalar(0.6); }
          else {
            // settle on its side
            k.mode = 2;
            const yaw = Math.atan2(k.vx, k.vz) || live() * 6;
            k.q.setFromEuler(_e.set(Math.PI / 2 - 0.24, yaw, 0, 'YXZ'));
          }
        }
        const hit = ctx.colliders.collideCircle(k.x, k.z, 0.25);
        if (hit.hit) { k.x = hit.x; k.z = hit.z; k.vx *= -0.4; k.vz *= -0.4; }
      }
      if (k.mode !== 0) displaced = true;
      // hit by the cart
      if (env.playing && k.cool <= 0) {
        for (const cc of c.circles) {
          const ex = k.x - cc.x, ez = k.z - cc.z, rr = cc.r + 0.3;
          if (ex * ex + ez * ez < rr * rr) {
            const L = Math.hypot(ex, ez) || 1, sp = Math.abs(c.speed);
            k.vx = c.fx * (sp * 1.1 + 1.5) + (ex / L) * (2 + sp * 0.2);
            k.vz = c.fz * (sp * 1.1 + 1.5) + (ez / L) * (2 + sp * 0.2);
            k.vy = 3 + sp * 0.4;
            k.w.set(live() - 0.5, live() - 0.5, live() - 0.5).normalize().multiplyScalar(6 + sp);
            k.mode = 1; k.cool = 0.4;
            if (k.y < T.heightAt(k.x, k.z) + 0.1) k.y = T.heightAt(k.x, k.z) + 0.2;
            if (coneBumpCool <= 0) {
              coneBumpCool = 0.25;
              env.bumpCart('cone', clamp(sp / 40, 0.05, 0.2), k.x, k.z, 0, 0, false);
            }
            fx.burst(k.x, k.y + 0.4, k.z, { count: 5, colors: ['#ffffff', '#ffd166'], speed: 2, up: 2, life: 0.5, size: 0.3, sprite: SPR.STAR, gravity: 4 });
            break;
          }
        }
      }
      if (dc < 140) {
        if (k.mode === 0) {
          crowds.cone.push(k.x, k.y, k.z, 0, 1);
          fx.shadow(k.x, k.y, k.z, 0.3);
        } else {
          // the model's origin is its base: lift the lying cone so it rests on its side
          _m.compose(_v.set(k.x, k.y - (k.mode === 2 ? 0.02 : 0.2), k.z), k.q, ONE);
          crowds.cone.pushMatrix(_m);
          fx.shadow(k.x, T.heightAt(k.x, k.z), k.z, 0.35);
        }
      }
    }
    // tidy up once the cart has gone
    if (displaced) {
      w.messy += dt;
      if (w.messy > 12 && dc > 60) {
        w.messy = 0;
        for (const k of w.cones) { k.mode = 0; k.x = k.hx; k.z = k.hz; k.y = T.heightAt(k.x, k.z); k.q.identity(); }
      }
    }
  }

  // --- puddles: by the nasoni (they never stop running) and a few on the avenues ---------------
  const pud = [];
  const addPuddle = (x, z, r) => {
    if (!T.isInside(x, z)) return;
    const s = T.surfaceAt(x, z);
    if (s !== SURF.PATH && s !== SURF.PLAZA) return;
    if (pud.some((p) => Math.hypot(p.x - x, p.z - z) < 12)) return;
    if (ctx.isReserved?.(x, z, r)) return; // keep souvenir-photo corridors clear
    pud.push({ x, z, r, sx: 1.2 + rnd() * 0.3, rot: rnd() * Math.PI, seed: rnd() * 10, cool: 0 });
  };
  for (const p of ctx.MAP.POIS) {
    if (p.k !== 'nasone') continue;
    const hit = graph.nearest(p.x, p.z, 10);
    if (!hit || hit.d > 7) continue;
    const L = hit.d || 1, w = hit.e.w / 2;
    const ins = Math.max(0, L - w * 0.55);
    addPuddle(p.x + ((hit.x - p.x) / L) * ins, p.z + ((hit.z - p.z) / L) * ins, 1.2 + rnd() * 0.5);
  }
  for (let i = 0; i < 60 && pud.length < 24; i++) {
    const s = spots[Math.floor(rnd() * spots.length)];
    if (!s || !farFromStops(s.x, s.z, 15)) continue;
    const lat = (rnd() - 0.5) * s.e.w * 0.5, along = (rnd() - 0.5) * s.e.len * 0.6;
    addPuddle(s.x + s.e.dx * along - s.e.dz * lat, s.z + s.e.dz * along + s.e.dx * lat, 1.3 + rnd() * 0.9);
  }
  if (pud.length) {
    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 90, specular: new THREE.Color('#9fb7c8'),
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(puddleGeometry(pud, T.heightAt), mat);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'puddles';
    env.root.add(mesh);
  }
  function updatePuddles(dt) {
    if (!env.playing) return;
    const c = env.cart, sp = Math.abs(c.speed);
    for (const p of pud) {
      p.cool -= dt;
      if (p.cool > 0 || sp < 1.5) continue;
      if (Math.abs(p.x - c.x) > 8 || Math.abs(p.z - c.z) > 8) continue;
      for (const cc of c.circles) {
        if (Math.hypot(cc.x - p.x, cc.z - p.z) < p.r * p.sx * 0.8 + cc.r * 0.6) {
          p.cool = 0.45;
          const strength = clamp(sp / 13, 0.2, 1);
          fx.splash(cc.x, T.heightAt(cc.x, cc.z), cc.z, c.fx, c.fz, strength);
          env.emit('splash', { x: cc.x, z: cc.z, strength });
          break;
        }
      }
    }
  }

  // --- balloon sellers ---------------------------------------------------------------------------
  const sellers = [];
  function addSeller(sx, sz, h) {
    // the collider stops the cart (cart.js plays that bump); the larger reach lets her react to it
    const a = people.addStatic({ kind: 'walker', x: sx, z: sz, h, seller: true });
    a.holdL = 1.15;
    a.r = 0.8;
    a.solid = true;
    ctx.colliders.addCircle(sx, sz, 0.45, 'person');
    const balloons = BALLOONS.slice(0, 9).map((col, i) => ({
      col, pal: { p: [pack(col), 0, 0, 0], a: 0, l: 0 }, az: i * 2.39996, tilt: 0.12 + (i % 3) * 0.13, len: 1 + (i % 2) * 0.12,
      mode: 0, x: 0, y: 0, z: 0, vy: 0, t: 0,
    }));
    sellers.push({ a, balloons });
  }
  // beside the nearest avenue, on the dry side, facing it
  function sellerAt(x, z) {
    const hit = graph.nearest(x, z, 40, (e) => e.kind === 'viale');
    if (!hit) return;
    const e = hit.e, nx = -e.dz, nz = e.dx;
    for (const side of [1, -1]) {
      for (const off of [e.w / 2 + 1.0, e.w / 2 + 1.8, e.w / 2 - 0.6]) {
        const sx = hit.x + nx * side * off, sz = hit.z + nz * side * off;
        const s = T.surfaceAt(sx, sz);
        if (s === SURF.WATER || s === SURF.OUTSIDE || !clearGround(sx, sz, 0.9)) continue;
        addSeller(sx, sz, Math.atan2(-nx * side, -nz * side));
        return;
      }
    }
  }
  // one on Piazzale Napoleone, a little to the side of the start line, facing it
  const st = ctx.game.start;
  const fx0 = Math.sin(st.heading), fz0 = Math.cos(st.heading);
  const px = st.x + fx0 * 15 + fz0 * 7, pz = st.z + fz0 * 15 - fx0 * 7;
  const ps = T.surfaceAt(px, pz);
  if ((ps === SURF.PLAZA || ps === SURF.PATH) && clearGround(px, pz, 0.9)) addSeller(px, pz, Math.atan2(st.x - px, st.z - pz));
  else sellerAt(px, pz);
  // and one where the rowing boats are rented
  const boats = ctx.MAP.POIS.find((p) => p.k === 'rental' && /barche/i.test(p.n || '')) || ctx.MAP.ANCHORS.lago;
  if (boats) sellerAt(boats.x + 6, boats.z + 6);

  function releaseBalloon(s) {
    const b = s.balloons.find((q) => q.mode === 0);
    if (!b) return;
    b.mode = 1; b.t = 0;
    b.vy = 1.4 + live() * 0.6;
    b.dx = (live() - 0.5) * 0.8; b.dz = (live() - 0.5) * 0.8;
  }
  ctx.events.on('honk', () => {
    for (const s of sellers) if (Math.hypot(s.a.x - env.cart.x, s.a.z - env.cart.z) < 24 && live() < 0.4) releaseBalloon(s);
  });

  const UP = new THREE.Vector3(0, 1, 0);
  function updateSellers(dt, t) {
    const c = env.cart;
    for (const s of sellers) {
      const a = s.a;
      if (Math.hypot(a.x - c.x, a.z - c.z) > 150) continue;
      if (a.react?.type === 'bumped' && a.react !== s.lastReact) releaseBalloon(s);
      s.lastReact = a.react;
      // hand position: shoulder + raised left arm (see rig.js), turned by the heading
      const sc = a.s, ang = a.raiseL;
      const lx = (0.235 + 0.035 * Math.cos(ang) + 0.57 * Math.sin(ang)) * sc;
      const ly = (1.43 + 0.035 * Math.sin(ang) - 0.57 * Math.cos(ang)) * sc + a.hop;
      const ch = Math.cos(a.h + a.spin), sh = Math.sin(a.h + a.spin);
      const hx = a.x + a.ox + lx * ch, hz = a.z + a.oz - lx * sh, hy = a.y + ly;
      for (const b of s.balloons) {
        if (b.mode === 0) {
          const az = b.az + Math.sin(t * 0.7 + b.az) * 0.12, tilt = b.tilt + Math.sin(t * 1.1 + b.az * 2) * 0.04;
          _v.set(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
          _q.setFromUnitVectors(UP, _v);
          _m.compose(_v.set(hx, hy, hz), _q, _s.set(1, b.len, 1));
          crowds.balloon.pushMatrix(_m, b.pal);
        } else if (b.mode === 1) {
          if (b.t === 0) { b.x = hx; b.y = hy; b.z = hz; }
          b.t += dt;
          b.x += (b.dx + Math.sin(b.t * 1.3) * 0.3) * dt; b.z += b.dz * dt; b.y += b.vy * dt;
          _q.setFromAxisAngle(_v.set(0, 0, 1), Math.sin(b.t * 2) * 0.15);
          _m.compose(_v.set(b.x, b.y, b.z), _q, ONE);
          crowds.balloon.pushMatrix(_m, b.pal);
          if (b.t > 14) { b.mode = 2; b.t = 0; }
        } else {
          b.t += dt;
          if (b.t > 18) b.mode = 0;
        }
      }
    }
  }

  return {
    games, works, puddles: pud, sellers,
    update(dt, t) {
      const c = env.cart;
      coneBumpCool -= dt;
      for (const g of games) {
        const d = Math.hypot(g.x - c.x, g.z - c.z);
        if (d < 125 && !g.kids) wakeGame(g);
        else if (d > 150 && g.kids) sleepGame(g);
        if (g.kids) updateBall(g, dt);
      }
      for (const w of works) updateCones(w, dt);
      updatePuddles(dt);
      updateSellers(dt, t);
    },
  };
}
