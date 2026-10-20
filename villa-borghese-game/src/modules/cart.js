// The family's white 8-seat golf cart: the model (static body mesh + one skinned mesh for the
// family, wheels and steering wheel), arcade driving physics tuned for small kids, collisions,
// surface events and effects.
//
// API (ctx.cart): object, position, heading, speed, surface, reset(x, z, heading), freeze(on),
// getHitCircles(), bounce(nx, nz, strength), pose('wave' | 'cheer' | 'whoa' | 'idle'),
// setDriver(index), driver, say(text).
import * as THREE from 'three';
import { RigBuilder } from './cart/rig.js';
import { buildCart, windscreen, DIM } from './cart/model.js';
import { buildRiders, createRiderAnimator } from './cart/riders.js';
import { createParticles, createBubble, createBlob } from './cart/effects.js';
import { SURF } from '../core/terrain.js';
import { clamp, wrapAngle } from '../core/geo.js';

const HIT_OFFSETS = [1.62, 0, -1.62];
const HIT_R = 0.74;
const TOP_SPEED = { path: 14, plaza: 14, grass: 11, sand: 9 };
const ROUGH = { path: 0.25, plaza: 0.1, grass: 1, sand: 0.7 };
const SURF_TYPE = { [SURF.PATH]: 'path', [SURF.PLAZA]: 'plaza', [SURF.GRASS]: 'grass', [SURF.FOREST]: 'grass', [SURF.SAND]: 'sand' };
const DUST = { path: '#fbf3df', plaza: '#f4efe4', sand: '#f0d4a4' };
const GREENS = ['#6f9e3e', '#8cbc52', '#5c8a34', '#a4c862'];
const SPARKS = ['#ffd54a', '#ff8ad8', '#fff7c0', '#7fe8ff', '#b4ff7a'];
const PHYS_DT = 1 / 60;
const SAY = { honk: ['Ciao!', 'Beep beep!', 'Ciao ciao!'], whoa: ['Whoa!', 'Oops!'], boost: ['Wheee!', 'Yay!'] };

export async function create(ctx) {
  const { scene, terrain: T, colliders, events, quality } = ctx;
  const low = quality.tier === 'low';

  // ---------------- model: body mesh on the suspension bone, family + wheels skinned, windscreen, effects
  const rb = new RigBuilder();
  const bones = buildCart(rb, { lowDetail: low });
  const riderList = buildRiders(rb, bones.body, { lowDetail: low, rng: ctx.rng });
  const mesh = rb.buildSkinned(ctx.util.mats().vc);
  const root = new THREE.Group();
  root.name = 'cart-root';
  root.add(mesh);
  bones.body.add(windscreen(ctx.util));
  scene.add(root);

  const riders = createRiderAnimator(riderList, { steerBone: bones.steer, rng: ctx.rng });
  riders.setDriver(ctx.game?.settings?.driver ?? 0);
  riders.update({ dt: 1 / 60, t: 0, steer: 0, speed: 0, accel: 0, latAcc: 0, frozen: true, look: null, rough: 0, snap: true });
  const particles = createParticles(ctx, 260 * (quality.particles ?? 1));
  const bubble = createBubble(ctx, root);
  const blob = createBlob(ctx, root);

  // ---------------- state
  const st = {
    x: 0, z: 0, heading: 0, speed: 0, yawRate: 0, steer: 0, extX: 0, extZ: 0,
    frozen: false, surface: 'path', surfPending: null, surfTimer: 0,
    lastGoodX: 0, lastGoodZ: 0, trail: [], trailTimer: 0,
    stuckT: 0, anchorX: 0, anchorZ: 0, rescueT: 0, rescueGo: -1, rescueTurn: 0, rescues: [],
    lastHit: { t: -9, nx: 0, nz: 0, dir: 1 }, bumpCool: 0, splashCool: 0,
    accel: 0, latAcc: 0, susY: 0, susV: 0, pitch: 0, pitchV: 0, roll: 0, rollV: 0,
    spin: 0, emitAcc: 0, sparkAcc: 0, lookTimer: 0, look: null, titleWave: 3,
  };
  const nrm = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3(0, 0, 1);
  const side = new THREE.Vector3(1, 0, 0);
  const basis = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  const hitCircles = HIT_OFFSETS.map(() => ({ x: 0, z: 0, r: HIT_R }));
  const rnd = ctx.rng('cart-fx');

  function surfaceAt(x, z) { return SURF_TYPE[T.surfaceAt(x, z)] || null; }

  // Pushes the three hit circles out of every collider. Returns the summed push and the deepest hit.
  const hit = { any: false, nx: 0, nz: 0, depth: 0, tag: null, cx: 0, cz: 0 };
  function resolve(iterations = 2) {
    hit.any = false; hit.nx = 0; hit.nz = 0; hit.depth = 0; hit.tag = null;
    for (let it = 0; it < iterations; it++) {
      const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
      let moved = false;
      for (const o of HIT_OFFSETS) {
        const cx = st.x + fx * o, cz = st.z + fz * o;
        const r = colliders.collideCircle(cx, cz, HIT_R);
        if (!r.hit) continue;
        const dx = r.x - cx, dz = r.z - cz;
        st.x += dx; st.z += dz;
        hit.nx += dx; hit.nz += dz;
        if (!hit.any || r.depth > hit.depth) { hit.depth = r.depth; hit.tag = r.tag; hit.cx = r.x - r.nx * HIT_R; hit.cz = r.z - r.nz * HIT_R; }
        hit.any = true;
        moved = true;
      }
      if (!moved) break;
    }
    return hit.any;
  }

  function onImpact(strength, tag, x, z) {
    if (strength < 0.05) return;
    st.susV += strength * 1.4;
    st.pitchV += strength * 1.5 * Math.sign(st.speed || 1);
    riders.kick(strength * 0.9, ctx.time);
    if (st.bumpCool <= 0 || strength > 0.6) {
      st.bumpCool = 0.35;
      events.emit('bump', { kind: tag || 'solid', strength, x, z });
      if (strength > 0.3) burstStars(x, z, strength);
      if (strength > 0.55) whoa();
    }
    if ((tag === 'water' || tag === 'fountain') && st.splashCool <= 0) {
      st.splashCool = 0.7;
      events.emit('splash', { x, z });
      burstSplash(x, z, strength);
    }
  }

  function whoa() {
    riders.act('whoa', ctx.time, 0.9);
    say(pick(SAY.whoa));
  }

  // A speech bubble above a random rider.
  function say(text) {
    const p = riderList[(rnd() * riderList.length) | 0].bones.pelvis.position;
    bubble.say(text, p.x * 0.5, p.z);
  }
  function pick(list) { return list[(rnd() * list.length) | 0]; }

  // ---------------- physics (fixed 60 Hz sub-steps)
  function physicsStep(h) {
    const inp = ctx.input;
    const g = ctx.game;
    let thr = inp.throttle || 0, brk = inp.brake || 0;
    if (st.rescueT > 0) { thr = st.rescueGo > 0 ? 0.6 : 0; brk = st.rescueGo > 0 ? 0 : 1; }
    const maxV = (TOP_SPEED[st.surface] || 11) * (g?.boosting ? 1.35 : 1);
    const v0 = st.speed;

    if (brk > 0.05) {
      if (st.speed > 0.25) st.speed = Math.max(0, st.speed - (6 + 14 * brk) * h);
      else st.speed = Math.max(-4.5 * brk, st.speed - 5 * h);
    } else if (thr > 0.02) {
      const target = maxV * (0.4 + 0.6 * thr);
      if (st.speed < 0) st.speed = Math.min(0, st.speed + 10 * h);
      else if (st.speed < target) st.speed = Math.min(target, st.speed + (3.5 + 5 * thr + (g?.boosting ? 4 : 0)) * (1 - 0.45 * st.speed / maxV) * h);
      else st.speed = Math.max(target, st.speed - 4 * h);
    } else {
      const d = (1.8 + 0.07 * Math.abs(st.speed)) * h;
      st.speed = Math.abs(st.speed) <= d ? 0 : st.speed - Math.sign(st.speed) * d;
    }

    // speed-sensitive steering: tight at walking pace, calm at full speed, never twitchy
    const av = Math.abs(st.speed);
    const yawMax = Math.min(av / 3.0, 1.8 / (1 + 0.045 * av));
    let targetYaw = -st.steer * yawMax * Math.sign(st.speed);
    if (st.rescueT > 0) targetYaw = st.rescueTurn * 1.2;
    st.yawRate += (targetYaw - st.yawRate) * (1 - Math.exp(-h * 9));
    st.heading = wrapAngle(st.heading + st.yawRate * h);

    const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
    st.x += (fx * st.speed + st.extX) * h;
    st.z += (fz * st.speed + st.extZ) * h;
    const ed = Math.exp(-h * 4);
    st.extX *= ed; st.extZ *= ed;

    if (resolve(2)) {
      let nx = hit.nx, nz = hit.nz;
      const L = Math.hypot(nx, nz);
      if (L > 1e-6) {
        nx /= L; nz /= L;
        const dir = st.speed < 0 ? -1 : 1;
        const fn = (fx * nx + fz * nz) * dir; // -1 = driving straight into it
        Object.assign(st.lastHit, { t: ctx.time, nx, nz, dir });
        const vn = (fx * st.speed + st.extX) * nx + (fz * st.speed + st.extZ) * nz;
        if (vn < 0) {
          // lose the part of the speed that went into the obstacle, keep the rest to slide along it
          const impact = -vn;
          st.speed -= dir * Math.min(Math.abs(st.speed), impact * (0.55 + 0.45 * Math.abs(fn)));
          const en = st.extX * nx + st.extZ * nz;
          if (en < 0) { st.extX -= nx * en; st.extZ -= nz * en; }
          if (fn < -0.75) { st.extX += nx * impact * 0.35; st.extZ += nz * impact * 0.35; }
          onImpact(clamp(impact / 9, 0, 1), hit.tag, hit.cx, hit.cz);
        }
        // glancing contact: scrape round so the cart slides along the wall instead of sticking
        if (fn > -0.75 && fn < 0) {
          let tx = -nz, tz = nx;
          if ((tx * fx + tz * fz) * dir < 0) { tx = -tx; tz = -tz; }
          st.heading = wrapAngle(st.heading + wrapAngle(Math.atan2(tx * dir, tz * dir) - st.heading) * 0.25);
        }
      }
    }

    // never leave the park: fall back to the last good spot
    if (!T.isInside(st.x, st.z)) {
      st.x = st.lastGoodX; st.z = st.lastGoodZ;
      st.speed *= -0.25; st.extX = 0; st.extZ = 0;
    } else {
      st.lastGoodX = st.x; st.lastGoodZ = st.z;
    }
    if (!Number.isFinite(st.x + st.z + st.heading + st.speed)) {
      st.x = st.lastGoodX; st.z = st.lastGoodZ; st.speed = 0; st.heading = 0; st.yawRate = 0;
    }
    if (st.rescueT > 0) st.rescueT -= h;
    st.accel += ((st.speed - v0) / h - st.accel) * (1 - Math.exp(-h * 6));
  }

  // Stuck against something while the player keeps pushing: back off (or pull away) and turn.
  // Wedged three times in a row: hop back to the last safe spot on an avenue.
  function watchStuck(dt) {
    const inp = ctx.input;
    const pushing = (inp.throttle > 0.2 || inp.brake > 0.2) && !st.frozen && ctx.game?.state === 'playing';
    if (!pushing || st.rescueT > 0 || Math.hypot(st.x - st.anchorX, st.z - st.anchorZ) > 0.8) {
      st.anchorX = st.x; st.anchorZ = st.z; st.stuckT = 0;
      return;
    }
    st.stuckT += dt;
    const recentHit = ctx.time - st.lastHit.t < 1.5;
    if (!(st.stuckT > 1.2 && recentHit) && st.stuckT < 3) return;
    st.stuckT = 0;
    const now = ctx.time;
    st.rescues = st.rescues.filter((t) => now - t < 10);
    st.rescues.push(now);
    if ((st.rescues.length >= 3 || !recentHit) && st.trail.length) {
      st.rescues = [];
      const p = st.trail[Math.max(0, st.trail.length - 3)];
      api.reset(p.x, p.z, p.heading);
      sparkleBurst();
      return;
    }
    const { nx, nz, dir } = st.lastHit;
    const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
    // the nose swings away from the obstacle: reverse off a wall ahead, drive off a wall behind
    st.rescueGo = -dir;
    st.rescueTurn = (fx * nz - fz * nx > 0 ? -1 : 1) * (dir > 0 ? 1 : -1);
    st.rescueT = 0.9;
  }

  // ---------------- per-frame helpers
  function orient(dt, snap = false) {
    const n = T.normalAt(st.x, st.z, 1.6);
    tmp.set(n[0], n[1], n[2]);
    if (snap) nrm.copy(tmp);
    else nrm.lerp(tmp, 1 - Math.exp(-dt * 8)).normalize();
    fwd.set(Math.sin(st.heading), 0, Math.cos(st.heading));
    fwd.addScaledVector(nrm, -fwd.dot(nrm)).normalize();
    side.crossVectors(nrm, fwd);
    basis.makeBasis(side, nrm, fwd);
    root.quaternion.setFromRotationMatrix(basis);
    root.position.set(st.x, T.heightAt(st.x, st.z), st.z);
  }

  function updateSurface(dt) {
    const s = surfaceAt(st.x, st.z);
    if (!s || s === st.surface) { st.surfPending = null; return; }
    if (st.surfPending !== s) { st.surfPending = s; st.surfTimer = 0; }
    st.surfTimer += dt;
    if (st.surfTimer > 0.12) {
      st.surface = s;
      st.surfPending = null;
      events.emit('surface', { type: s });
    }
  }

  function updateTrail(dt) {
    st.trailTimer -= dt;
    if (st.trailTimer > 0) return;
    st.trailTimer = 0.5;
    if (st.surface !== 'path' && st.surface !== 'plaza') return;
    const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
    for (const o of HIT_OFFSETS) if (!colliders.isFree(st.x + fx * o, st.z + fz * o, HIT_R + 0.15)) return;
    const last = st.trail[st.trail.length - 1];
    if (last && Math.hypot(last.x - st.x, last.z - st.z) < 3) return;
    st.trail.push({ x: st.x, z: st.z, heading: st.heading });
    if (st.trail.length > 24) st.trail.shift();
  }

  // Easy mode: on an avenue with the stick centred, gently line the cart up with the avenue.
  function pathAssist(dt) {
    const g = ctx.game;
    if (!g?.settings?.easy || Math.abs(ctx.input.steer) > 0.08 || st.speed < 2 || st.rescueT > 0) return;
    if (st.surface !== 'path') return;
    const np = T.nearestPath(st.x, st.z);
    if (!np || np.d > np.w / 2 + 1) return;
    let a = Math.atan2(np.dirX, np.dirZ);
    let d = wrapAngle(a - st.heading);
    if (Math.abs(d) > Math.PI / 2) { a += Math.PI; d = wrapAngle(a - st.heading); }
    if (Math.abs(d) < 0.45) st.heading = wrapAngle(st.heading + d * Math.min(1, dt * 1.1));
  }

  function suspension(dt) {
    const rough = (ROUGH[st.surface] ?? 0.5) * Math.min(1, Math.abs(st.speed) / 10);
    st.susV += ((-260 * st.susY - 16 * st.susV) + (rnd() - 0.5) * rough * 70) * dt;
    st.susY = clamp(st.susY + st.susV * dt, -0.12, 0.12);
    const pitchT = clamp(-st.accel * 0.006, -0.06, 0.06);
    const rollT = clamp(st.latAcc * 0.004, -0.05, 0.05);
    st.pitchV += ((pitchT - st.pitch) * 160 - 14 * st.pitchV + (rnd() - 0.5) * rough * 6) * dt;
    st.rollV += ((rollT - st.roll) * 160 - 14 * st.rollV + (rnd() - 0.5) * rough * 6) * dt;
    st.pitch = clamp(st.pitch + st.pitchV * dt, -0.12, 0.12);
    st.roll = clamp(st.roll + st.rollV * dt, -0.1, 0.1);
    bones.body.position.y = st.susY;
    bones.body.rotation.set(st.pitch, 0, st.roll);
    return rough;
  }

  function wheels(dt) {
    st.spin = (st.spin + (st.speed / DIM.wheelR) * dt) % (Math.PI * 2);
    bones.wheels.forEach((w, i) => {
      w.rotation.x = st.spin;
      w.rotation.y = i < 2 ? -st.steer * 0.5 : 0;
    });
    bones.steer.rotation.y = -st.steer * 1.7;
  }

  // world position of a point given in the cart's frame
  function cartPoint(lx, ly, lz, out = tmp) {
    return out.copy(root.position).addScaledVector(side, lx).addScaledVector(nrm, ly).addScaledVector(fwd, lz);
  }

  function emit(dt) {
    const pf = quality.particles ?? 1;
    const av = Math.abs(st.speed);
    if (av > 2.5) {
      const grass = st.surface === 'grass';
      st.emitAcc += dt * pf * (grass ? 4 + av * 2.4 : (av / 14) * 18);
      while (st.emitAcc >= 1) {
        st.emitAcc -= 1;
        const sx = rnd() < 0.5 ? DIM.track : -DIM.track;
        const p = cartPoint(sx, 0.12, DIM.rearAxle - 0.15 * Math.sign(st.speed));
        const bx = -fwd.x * st.speed, bz = -fwd.z * st.speed;
        if (grass && rnd() < 0.8) {
          particles.spawn({
            x: p.x, y: p.y + 0.1, z: p.z, vx: bx * 0.15 + side.x * (rnd() - 0.5) * 2, vy: 1.6 + rnd() * 1.6, vz: bz * 0.15 + side.z * (rnd() - 0.5) * 2,
            life: 0.6 + rnd() * 0.25, size0: 0.3, size1: 0.22, alpha: 1, color: GREENS[(rnd() * GREENS.length) | 0], kind: 'leaf', gravity: 8, drag: 0.6,
          });
        } else {
          particles.spawn({
            x: p.x + (rnd() - 0.5) * 0.3, y: p.y + 0.2, z: p.z + (rnd() - 0.5) * 0.3, vx: bx * 0.1 + (rnd() - 0.5) * 0.8, vy: 0.6 + rnd() * 0.5, vz: bz * 0.1 + (rnd() - 0.5) * 0.8,
            life: grass ? 0.5 : 0.7 + rnd() * 0.4, size0: 0.5, size1: grass ? 0.9 : 1.7 + rnd() * 0.5, alpha: grass ? 0.14 : 0.62, color: grass ? '#b9c48a' : DUST[st.surface] || DUST.path, kind: 'puff', gravity: -0.25, drag: 2.2,
          });
        }
      }
    } else st.emitAcc = 0;

    if (ctx.game?.boosting) {
      st.sparkAcc += dt * 50 * pf;
      while (st.sparkAcc >= 1) {
        st.sparkAcc -= 1;
        const p = cartPoint((rnd() - 0.5) * 1.6, 0.3 + rnd() * 1.8, -2.5 + rnd() * 2.2);
        particles.spawn({
          x: p.x, y: p.y, z: p.z, vx: -fwd.x * 2 + (rnd() - 0.5), vy: 0.5 + rnd() * 0.6, vz: -fwd.z * 2 + (rnd() - 0.5),
          life: 0.7 + rnd() * 0.4, size0: 0.6, size1: 0.12, alpha: 1, color: SPARKS[(rnd() * SPARKS.length) | 0], kind: 'star', gravity: -0.2, drag: 1.5, twinkle: 22,
        });
      }
    } else st.sparkAcc = 0;
  }

  function burstStars(x, z, strength) {
    const y = T.heightAt(x, z) + 1.1;
    const n = Math.round((4 + strength * 5) * (quality.particles ?? 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      particles.spawn({
        x, y, z, vx: Math.cos(a) * 2.6, vy: 1.8 + rnd() * 1.4, vz: Math.sin(a) * 2.6,
        life: 0.55, size0: 0.42, size1: 0.18, alpha: 1, color: i % 2 ? '#ffe066' : '#fff6c4', kind: 'star', gravity: 4, drag: 1.6,
      });
    }
  }

  function burstSplash(x, z, strength) {
    const y = ctx.WATER_Y + 0.6;
    const n = Math.round((10 + strength * 10) * (quality.particles ?? 1));
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, s = 0.8 + rnd() * 1.8;
      particles.spawn({
        x, y: Math.max(y, T.heightAt(x, z) + 0.3), z, vx: Math.cos(a) * s, vy: 2.6 + rnd() * 2.4, vz: Math.sin(a) * s,
        life: 0.6 + rnd() * 0.3, size0: 0.22, size1: 0.1, alpha: 0.95, color: i % 3 ? '#d6eeff' : '#ffffff', kind: 'puff', gravity: 9, drag: 0.4,
      });
    }
  }

  function sparkleBurst() {
    for (let i = 0; i < 24; i++) {
      const p = cartPoint((rnd() - 0.5) * 1.8, rnd() * 2.2, (rnd() - 0.5) * 5);
      particles.spawn({
        x: p.x, y: p.y, z: p.z, vx: (rnd() - 0.5) * 2, vy: 0.5 + rnd(), vz: (rnd() - 0.5) * 2,
        life: 0.9, size0: 0.4, size1: 0.05, alpha: 1, color: SPARKS[i % SPARKS.length], kind: 'star', gravity: -0.3, drag: 1.2, twinkle: 20,
      });
    }
  }

  // What the riders look at: the camera during photo stops, the next landmark when it is close.
  function lookTarget(dt) {
    const g = ctx.game;
    if (g?.state === 'stop' || g?.state === 'finished') {
      const c = ctx.camera.position;
      st.look = { x: (c.x - root.position.x) * side.x + (c.z - root.position.z) * side.z, z: (c.x - root.position.x) * fwd.x + (c.z - root.position.z) * fwd.z };
      return;
    }
    st.lookTimer -= dt;
    if (st.lookTimer > 0) return;
    st.lookTimer = 0.5;
    st.look = null;
    const s = g?.state === 'playing' ? g.nextStop?.() : null;
    if (!s) return;
    const dx = s.x - st.x, dz = s.z - st.z;
    if (dx * dx + dz * dz > 50 * 50) return;
    st.look = { x: dx * side.x + dz * side.z, z: dx * fwd.x + dz * fwd.z };
  }

  // ---------------- events
  events.on('honk', () => { riders.act('wave', ctx.time, 1.8); say(pick(SAY.honk)); });
  events.on('stopReached', () => riders.act('cheer', ctx.time, 2.6));
  events.on('medal', () => riders.act('cheer', ctx.time, 3));
  events.on('tourComplete', () => { riders.act('cheer', ctx.time, 4.5); say('Evviva!'); });
  events.on('boost', (e) => { if (e.on) { riders.act('cheer', ctx.time, 1.3); say(pick(SAY.boost)); } });
  events.on('collect', () => {
    const others = riderList.filter((r) => !r.driver);
    riders.act('cheer', ctx.time, 0.9, [others[(rnd() * others.length) | 0].idx]);
  });
  events.on('driver', (e) => api.setDriver(e.index ?? 0));
  events.on('settings', (s) => { if (s.driver !== undefined && s.driver !== riders.driverIndex) api.setDriver(s.driver); });

  // ---------------- API
  const api = {
    object: root,
    position: root.position,
    riders: riderList,
    get heading() { return st.heading; },
    get speed() { return st.speed; },
    get surface() { return st.surface; },
    get driver() { return riders.driverIndex; },

    reset(x, z, heading = 0) {
      Object.assign(st, { x, z, heading, speed: 0, yawRate: 0, extX: 0, extZ: 0, stuckT: 0, rescueT: 0, rescues: [], anchorX: x, anchorZ: z, accel: 0, latAcc: 0, susY: 0, susV: 0 });
      resolve(4);
      st.lastGoodX = st.x; st.lastGoodZ = st.z;
      st.trail = [{ x: st.x, z: st.z, heading: st.heading }];
      st.surface = surfaceAt(st.x, st.z) || 'path';
      orient(0, true);
    },
    freeze(on = true) {
      st.frozen = !!on;
      if (on) { st.speed = 0; st.extX = 0; st.extZ = 0; st.yawRate = 0; }
    },
    getHitCircles() {
      const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
      HIT_OFFSETS.forEach((o, i) => { hitCircles[i].x = st.x + fx * o; hitCircles[i].z = st.z + fz * o; });
      return hitCircles;
    },
    // Another module pushes the cart (a ball, a cone, a goose...): direction away from it, strength 0..1.
    bounce(nx, nz, strength = 0.5) {
      const L = Math.hypot(nx, nz) || 1;
      const s = clamp(strength, 0, 1);
      st.extX += (nx / L) * (1.5 + 5 * s); st.extZ += (nz / L) * (1.5 + 5 * s);
      st.speed *= 1 - 0.45 * s;
      st.susV += s * 1.2;
      riders.kick(s, ctx.time);
      if (s > 0.55) whoa();
    },
    pose(kind = 'idle', duration) {
      const dur = duration ?? { wave: 1.8, cheer: 2.6, whoa: 0.9 }[kind] ?? 2;
      riders.act(kind, ctx.time, dur);
    },
    setDriver(index) { riders.setDriver(index); },
    say(text) { say(text); },

    update(dt, t) {
      const g = ctx.game;
      st.bumpCool -= dt; st.splashCool -= dt;
      st.steer += ((ctx.input.steer || 0) - st.steer) * (1 - Math.exp(-dt * 10));
      const paused = g?.state === 'paused';
      if (st.frozen) { st.speed = 0; st.yawRate = 0; st.accel *= Math.exp(-dt * 6); }
      else if (!paused) {
        pathAssist(dt);
        const n = Math.max(1, Math.ceil(dt / PHYS_DT - 1e-6));
        for (let i = 0; i < n; i++) physicsStep(dt / n);
      }
      st.latAcc = st.speed * st.yawRate;
      watchStuck(dt);
      updateSurface(dt);
      updateTrail(dt);
      orient(dt);
      const rough = paused ? 0 : suspension(dt);
      wheels(dt);
      lookTarget(dt);

      if (g?.state === 'title') {
        st.titleWave -= dt;
        if (st.titleWave <= 0) {
          st.titleWave = 4 + rnd() * 3;
          riders.act('wave', t, 1.6, [(rnd() * riderList.length) | 0]);
        }
      }
      riders.update({
        dt, t, steer: st.steer, speed: st.speed, accel: st.accel, latAcc: st.latAcc,
        frozen: st.frozen || g?.state !== 'playing', look: st.look, rough,
      });
      if (!paused) emit(dt);
      particles.update(dt, t);
      bubble.update(dt);
      blob.visible = !quality.shadows;
    },
  };
  return api;
}
