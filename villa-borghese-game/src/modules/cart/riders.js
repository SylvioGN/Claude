// The seven riders from the family photo (src/data/family.js), as friendly low-poly people sitting
// on the cart's benches. Each rider has 7 bones (pelvis, spine, head, two upper arms, two forearms)
// in the cart's skinned mesh, so seating, leaning, looking around and waving cost no draw calls.
import * as THREE from 'three';
import { FAMILY, SEATS } from '../../data/family.js';
import { DIM } from './model.js';
import { clamp } from '../../core/geo.js';

const DARK = '#2a211c';
const LIP = '#b0574c';
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Vector3();
const _f = new THREE.Vector3();
const _qi = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _one = new THREE.Vector3(1, 1, 1);
const _eul = new THREE.Euler();
const DOWN = new THREE.Vector3(0, -1, 0);

function shade(hex, k) {
  const c = new THREE.Color(hex);
  return `#${c.multiplyScalar(k).getHexString()}`;
}

// Hip point (centre of the sitting area, on the cushion) for seat k.
export function seatPosition(k, rider) {
  const [row, side] = SEATS[k];
  return {
    x: side === 0 ? 0.29 : -0.29,
    y: DIM.cushionTop,
    z: DIM.rowFront(row) + rider.hipBack,
  };
}

function buildPerson(rb, body, p, idx, rnd, lowDetail) {
  const child = p.age === 'child';
  const S = child ? 0.64 : p.height;          // lengths
  const W = p.build;                          // widths
  const H = child ? 0.95 : 1.1;               // head size: big friendly heads, kids relatively bigger
  const aw = Math.max(0.8, W) * 1.1;          // limb thickness
  const hipBack = 0.035 + 0.115 * W;
  const r = { data: p, idx, S, W, H, hipBack, a: 0.26 * S, b: 0.24 * S + 0.03 };
  const sp = seatPosition(idx, r);

  const pelvis = rb.bone(body, sp.x, sp.y, sp.z, `${p.id}-pelvis`);
  const spine = rb.bone(pelvis, 0, 0.04 * S, -0.02, `${p.id}-spine`);
  const head = rb.bone(spine, 0, 0.53 * S, 0, `${p.id}-head`);
  const shoulderX = 0.2 * W + 0.025;
  const arms = [1, -1].map((o) => rb.bone(spine, o * shoulderX, 0.45 * S, 0, `${p.id}-arm${o}`));
  const fores = arms.map((a, i) => rb.bone(a, 0, -r.a, 0, `${p.id}-fore${i}`));
  r.bones = { pelvis, spine, head, arms, fores };

  const skin = p.skin, top = p.top, bottom = p.bottom;
  const skirt = p.bottomStyle === 'skirt';
  const shorts = p.bottomStyle === 'shorts';
  const seg = lowDetail ? 6 : 8;

  // ---- legs and hips (pelvis bone)
  rb.on(pelvis);
  rb.box(0.36 * W, 0.15 * S, 0.3 * S, bottom, 0, 0.075 * S, 0.02);
  for (const o of [1, -1]) {
    const lx = o * 0.095 * W;
    rb.cyl(0.078 * aw, 0.082 * aw, 0.44 * S, 7, bottom, lx, 0.075 * S, 0.17 * S, 0, Math.PI / 2);
    rb.cyl(0.058 * aw, 0.064 * aw, 0.38 * S, 7, shorts || skirt ? skin : bottom, lx, -0.11 * S, 0.38 * S);
    rb.box(0.1 * aw, 0.075, 0.21, p.shoes, lx, -0.3 * S - 0.03, 0.38 * S + 0.05);
    if (shorts) rb.cyl(0.08 * aw, 0.08 * aw, 0.06, 7, bottom, lx, 0.075 * S, 0.37 * S, 0, Math.PI / 2); // hem
  }
  if (skirt) {
    rb.place(new THREE.BoxGeometry(0.38 * W, 0.07, 0.46 * S), bottom, 0, 0.16 * S, 0.17 * S);
    rb.box(0.37 * W, 0.34 * S, 0.06, bottom, 0, -0.04 * S, 0.42 * S, 0, 0.08);
    if (p.bottomPattern === 'leopard') {
      for (let i = 0; i < 16; i++) {
        const onTop = i < 8;
        const x = (rnd() - 0.5) * 0.32 * W;
        if (onTop) rb.sphere(0.022, 0, '#4a2a14', x, 0.196 * S, (0.0 + rnd() * 0.36) * S, 1, 0.3, 1);
        else rb.sphere(0.022, 0, '#4a2a14', x, (-0.18 + rnd() * 0.3) * S, 0.455 * S, 1, 1, 0.3);
      }
    }
  }

  // ---- torso (spine bone)
  rb.on(spine);
  rb.place(new THREE.CylinderGeometry(0.195 * W, 0.17 * W, 0.48 * S, seg + 2), top, 0, 0.24 * S, 0, 0, 0, 0, 1, 1, 0.68);
  rb.sphere(0.195 * W, 1, top, 0, 0.45 * S, 0, 1.1, 0.42, 0.7);
  rb.cyl(0.045 * H, 0.05 * H, 0.12 * S, 6, skin, 0, 0.53 * S, 0);
  const chestZ = 0.13 * W;
  switch (p.topStyle) {
    case 'polo':
      rb.torus(0.07 * W, 0.022, 4, 10, shade(top, 1.08), 0, 0.51 * S, 0.0);
      rb.box(0.035, 0.12 * S, 0.012, shade(top, 0.85), 0, 0.44 * S, chestZ);
      break;
    case 'blouse':
      rb.torus(0.075 * W, 0.03, 4, 10, shade(top, 1.04), 0, 0.51 * S, 0.0);
      for (let i = 0; i < 3; i++) rb.box(0.11 * W, 0.03, 0.03, shade(top, 1.02), 0, (0.43 - i * 0.07) * S, chestZ);
      break;
    case 'jacket':
      rb.box(0.1 * W, 0.42 * S, 0.02, '#f1ebdd', 0, 0.26 * S, chestZ + 0.004);
      for (const o of [1, -1]) rb.box(0.05, 0.24 * S, 0.02, shade(top, 0.82), o * 0.06 * W, 0.37 * S, chestZ + 0.01, 0, 0, o * 0.35);
      rb.torus(0.075 * W, 0.028, 4, 10, shade(top, 0.9), 0, 0.51 * S, 0.0);
      break;
    case 'tank':
      rb.box(0.12 * W, 0.07, 0.03, skin, 0, 0.47 * S, chestZ - 0.02);
      break;
    default: // t-shirt: a little henley placket
      rb.box(0.03, 0.1 * S, 0.012, shade(top, 0.86), 0, 0.45 * S, chestZ);
  }
  if (p.bag) {
    rb.box(0.035, 0.62 * S, 0.015, p.bag, 0, 0.26 * S, chestZ + 0.008, 0, 0, 0.62);
    rb.box(0.035, 0.62 * S, 0.015, p.bag, 0, 0.26 * S, -chestZ - 0.008, 0, 0, -0.62);
    rb.box(0.06, 0.14, 0.17, p.bag, -0.17 * W - 0.04, 0.07 * S, 0.06);
  }

  // ---- head (head bone): face, hair, glasses, cap
  rb.on(head);
  const hy = 0.15 * H;
  rb.sphere(0.125 * H, 1, skin, 0, hy, 0.01, 0.94, 1.06, 1);
  for (const o of [1, -1]) {
    rb.sphere(0.03 * H, 0, skin, o * 0.118 * H, hy - 0.005, 0, 0.6, 1, 1);
    rb.box(0.03 * H, 0.04 * H, 0.02, DARK, o * 0.045 * H, hy + 0.015 * H, 0.117 * H);
    rb.box(0.012 * H, 0.012 * H, 0.01, '#ffffff', o * 0.04 * H, hy + 0.025 * H, 0.127 * H);
    rb.box(0.046 * H, 0.012, 0.02, p.hairStyle === 'bald' ? shade(skin, 0.6) : shade(p.hair, 0.8), o * 0.046 * H, hy + 0.058 * H, 0.114 * H, 0, 0, o * -0.12);
  }
  rb.sphere(0.024 * H, 0, shade(skin, 0.95), 0, hy - 0.015 * H, 0.13 * H);
  if (p.beard === true) rb.sphere(0.113 * H, 1, p.hair, 0, hy - 0.055 * H, 0.032 * H, 1, 0.74, 0.96);
  else if (p.beard === 'stubble') rb.sphere(0.112 * H, 1, shade(skin, 0.78), 0, hy - 0.05 * H, 0.028 * H, 0.97, 0.72, 0.96);
  const mouthZ = p.beard === true ? 0.142 * H : 0.122 * H;
  rb.place(new THREE.TorusGeometry(0.026 * H, 0.0065, 3, 7, Math.PI), LIP, 0, hy - 0.04 * H, mouthZ, 0, 0, Math.PI);

  const hair = p.hair;
  const capHair = (tilt, len = 0.5) => rb.place(new THREE.SphereGeometry(0.135 * H, 12, 6, 0, Math.PI * 2, 0, Math.PI * len), hair, 0, hy + 0.004, 0.0, tilt, 0, 0, 0.97, 1.06, 1.04);
  switch (p.hairStyle) {
    case 'short':
      capHair(-0.62);
      break;
    case 'long':
      capHair(-0.55);
      rb.box(0.22 * H, 0.34 * H, 0.06, hair, 0, hy - 0.11 * H, -0.105 * H, 0, 0.12);
      for (const o of [1, -1]) rb.box(0.045 * H, 0.24 * H, 0.1 * H, hair, o * 0.112 * H, hy - 0.06 * H, -0.03 * H);
      break;
    case 'bob':
      capHair(-0.36);
      rb.place(new THREE.CylinderGeometry(0.14 * H, 0.152 * H, 0.15 * H, 12, 1, true, 0.85, Math.PI * 2 - 1.7), hair, 0, hy - 0.05 * H, -0.004);
      break;
    case 'bun':
      capHair(-0.62);
      rb.sphere(0.062 * H, 1, hair, 0, hy + 0.09 * H, -0.105 * H);
      break;
    default: // bald
      break;
  }
  if (p.glasses === 'sun') {
    for (const o of [1, -1]) {
      rb.cyl(0.036 * H, 0.036 * H, 0.012, 10, '#141416', o * 0.046 * H, hy + 0.015 * H, 0.128 * H, 0, Math.PI / 2);
      rb.box(0.01, 0.01, 0.12 * H, '#141416', o * 0.118 * H, hy + 0.025 * H, 0.07 * H);
    }
    rb.box(0.03 * H, 0.008, 0.01, '#141416', 0, hy + 0.025 * H, 0.13 * H);
  } else if (p.glasses) {
    for (const o of [1, -1]) {
      rb.place(new THREE.TorusGeometry(0.031 * H, 0.0065, 4, 10), '#3a2c26', o * 0.045 * H, hy + 0.015 * H, 0.128 * H);
      rb.box(0.008, 0.008, 0.12 * H, '#3a2c26', o * 0.118 * H, hy + 0.022 * H, 0.07 * H);
    }
    rb.box(0.026 * H, 0.007, 0.008, '#3a2c26', 0, hy + 0.02 * H, 0.13 * H);
  }
  if (p.cap) {
    rb.place(new THREE.SphereGeometry(0.142 * H, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), p.cap, 0, hy + 0.025 * H, -0.006, -0.08, 0, 0, 0.98, 0.82, 1.04);
    rb.box(0.2 * H, 0.016, 0.13 * H, shade(p.cap, 0.94), 0, hy + 0.035 * H, 0.165 * H, 0, 0.14);
    rb.sphere(0.014, 0, shade(p.cap, 0.9), 0, hy + 0.14 * H, -0.01);
  }

  // ---- arms (rest pose hangs straight down from the shoulder)
  const sleeve = p.topStyle === 'tank' ? skin : top;
  const longSleeve = p.topStyle === 'jacket' || p.topStyle === 'blouse';
  arms.forEach((arm, i) => {
    rb.on(arm);
    rb.sphere(0.062 * aw, 0, sleeve, 0, -0.005, 0, 1, 1.1, 1);
    if (longSleeve || p.topStyle === 'tank') {
      rb.cyl(0.056 * aw, 0.05 * aw, r.a, 7, sleeve, 0, -r.a / 2, 0);
    } else {
      rb.cyl(0.062 * aw, 0.06 * aw, 0.13 * S, 7, sleeve, 0, -0.065 * S, 0);
      rb.cyl(0.045 * aw, 0.043 * aw, r.a - 0.11 * S, 6, skin, 0, -r.a + (r.a - 0.11 * S) / 2, 0);
    }
    rb.on(fores[i]);
    rb.sphere(0.045 * aw, 0, longSleeve ? sleeve : skin, 0, 0, 0);
    if (p.topStyle === 'jacket') {
      rb.cyl(0.05 * aw, 0.046 * aw, 0.2 * S, 7, sleeve, 0, -0.1 * S, 0);
      rb.cyl(0.036 * aw, 0.036 * aw, 0.05 * S, 6, skin, 0, -0.22 * S, 0);
    } else if (p.topStyle === 'blouse') {
      rb.cyl(0.05 * aw, 0.044 * aw, 0.1 * S, 7, sleeve, 0, -0.05 * S, 0);
      rb.cyl(0.04 * aw, 0.035 * aw, 0.14 * S, 6, skin, 0, -0.17 * S, 0);
    } else {
      rb.cyl(0.042 * aw, 0.036 * aw, 0.24 * S, 6, skin, 0, -0.12 * S, 0);
    }
    rb.sphere(0.046 * aw, 0, skin, 0, -r.b, 0.005, 0.8, 1.15, 1);
  });
  return r;
}

export function buildRiders(rb, body, { lowDetail = false, rng }) {
  const rnd = rng('cart-riders');
  return FAMILY.map((p, i) => buildPerson(rb, body, p, i, rnd, lowDetail));
}

// ------------------------------------------------------------------------------------------
// Animation

const P = {
  lap: [[-0.28, 0, 0.1], [-1.22, 0, -0.18]],
  cheer: [[0.25, 0, 2.75], [0, 0, 0.35]],
  wave: [[0.15, 0, 2.3], [0, 0, 0.45]],
  whoa: [[-1.95, 0, 0.45], [-0.45, 0, 0]],
};

function presetQuat(out, [x, y, z], o) {
  return out.setFromEuler(_eul.set(x, o * y, o * z, 'XYZ'));
}

// Two-bone IK in the spine frame. S = shoulder, T = hand target, pole = elbow hint.
function solveArm(S, T, pole, a, b, qUpper, qFore) {
  _v.subVectors(T, S);
  const d = clamp(_v.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  _v.normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _p.copy(pole).addScaledVector(_v, -pole.dot(_v)).normalize();
  _w.copy(_v).multiplyScalar(cosA).addScaledVector(_p, sinA); // upper arm direction
  _e.copy(S).addScaledVector(_w, a);
  _f.copy(S).addScaledVector(_v, d).sub(_e).normalize();      // forearm direction
  qUpper.setFromUnitVectors(DOWN, _w);
  _qi.copy(qUpper).invert();
  qFore.setFromUnitVectors(DOWN, _f.applyQuaternion(_qi));
}

export function createRiderAnimator(riders, { steerBone, rng }) {
  const rnd = rng('cart-life');
  let driverIndex = -1;
  let action = null;          // {kind, t0, dur, only?: Set of rider indices}
  const pendingKicks = [];
  const targets = riders.map(() => [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()]);
  const grip = new THREE.Vector3();
  const tmpT = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const spineInv = new THREE.Matrix4();
  const steerM = new THREE.Matrix4();

  for (const r of riders) {
    Object.assign(r, {
      seat: r.idx, bob: 0, bobV: 0, look: 0, lookTarget: 0, lookTimer: rnd() * 3,
      holdHandle: rnd() < 0.6, delay: 0, lean: 0, phase: rnd() * 6.28,
    });
  }

  function seatAll(driver) {
    driverIndex = driver;
    const order = [driver, ...riders.map((r) => r.idx).filter((i) => i !== driver)];
    order.forEach((ri, k) => {
      const r = riders[ri];
      r.seat = k;
      r.driver = k === 0;
      r.outer = SEATS[k][1] === 0 ? 0 : 1; // arm index on the cart's outside (0 = left arm)
      r.delay = k * 0.07 + rnd() * 0.08;
      const sp = seatPosition(k, r);
      r.bones.pelvis.position.set(sp.x, sp.y, sp.z);
    });
  }

  return {
    get driverIndex() { return driverIndex; },
    setDriver(i) { seatAll(clamp(i | 0, 0, riders.length - 1)); },
    // kind: 'wave' | 'cheer' | 'whoa' | 'idle'; only: rider indices (default everyone)
    act(kind, t, dur, only = null) {
      if (kind === 'idle') { action = null; return; }
      if (only && action && !action.only && t < action.t0 + action.dur) return; // don't cut a family moment short
      action = { kind, t0: t, dur, only: only ? new Set(only) : null };
    },
    kick(strength, t) {
      for (const r of riders) pendingKicks.push({ r, at: t + SEATS[r.seat][0] * 0.05, v: strength * (0.7 + rnd() * 0.6) });
    },

    // s: {dt, t, steer (smoothed -1..1), speed, accel, latAcc, frozen, look: {x, z} | null (body space), rough, snap}
    update(s) {
      const { dt, t } = s;
      const k = s.snap ? 1 : 1 - Math.exp(-dt * 12);
      for (let i = pendingKicks.length - 1; i >= 0; i--) {
        const pk = pendingKicks[i];
        if (t >= pk.at) { pk.r.bobV += pk.v; pendingKicks.splice(i, 1); }
      }
      if (action && t > action.t0 + action.dur + 1) action = null;
      steerBone.updateMatrix();
      steerM.copy(steerBone.matrix);

      for (const r of riders) {
        const B = r.bones;
        const at = action && (!action.only || action.only.has(r.idx)) ? t - action.t0 - r.delay : -1;
        const act = action && at >= 0 && at < action.dur ? action.kind : null;
        // the driver keeps both hands on the wheel unless cheering while the cart stands still
        const driving = r.driver && (act !== 'cheer' || (!s.frozen && Math.abs(s.speed) >= 0.5));

        // secondary bob on bumps and rough ground
        r.bobV += (-170 * r.bob - 11 * r.bobV) * dt + (rnd() - 0.5) * s.rough * dt * 9;
        r.bob += r.bobV * dt;
        r.bob = clamp(r.bob, -0.08, 0.08);
        const cheerHop = act === 'cheer' ? Math.abs(Math.sin(at * 8 + r.phase)) * 0.04 * r.S : 0;

        // lean in turns, rock back when accelerating
        r.lean += (clamp(s.latAcc * 0.014, -0.2, 0.2) - r.lean) * (1 - Math.exp(-dt * 6));
        const surge = clamp(-s.accel * 0.01, -0.1, 0.1);
        const breath = Math.sin(t * 1.7 + r.phase) * 0.012;

        // where to look
        r.lookTimer -= dt;
        if (r.lookTimer <= 0) {
          r.lookTimer = 1.8 + rnd() * 3.5;
          r.lookTarget = r.driver ? (rnd() < 0.3 ? (rnd() - 0.5) * 0.9 : 0) : (rnd() - 0.5) * 2.0;
          if (r.driver) r.lookTimer = r.lookTarget ? 0.8 : 2.5 + rnd() * 3;
        }
        let want = r.lookTarget;
        if (s.look && (!r.driver || s.frozen)) {
          const p = B.pelvis.position;
          want = clamp(Math.atan2(s.look.x - p.x, s.look.z - p.z), -1.5, 1.5);
        }
        if (r.driver && !s.frozen) want = want * 0.5 - s.steer * 0.45;
        r.look += (want - r.look) * (1 - Math.exp(-dt * 3.5));

        B.pelvis.position.y = DIM.cushionTop + r.bob * 0.4;
        B.spine.position.y = 0.04 * r.S + r.bob * 0.6 + cheerHop;
        B.spine.rotation.set(surge + breath + (act === 'whoa' ? -0.12 : 0), r.look * 0.22, r.lean);
        B.head.rotation.set(
          -r.bob * 2.5 + (act === 'whoa' ? -0.25 : act === 'cheer' ? -0.15 : 0) + Math.sin(t * 0.7 + r.phase) * 0.04,
          r.look * 0.78,
          -r.lean * 0.6 + Math.sin(t * 0.5 + r.phase * 2) * 0.05,
        );

        // arms
        const T = targets[r.idx];
        for (let ai = 0; ai < 2; ai++) {
          const o = ai === 0 ? 1 : -1;
          const qU = T[ai * 2], qF = T[ai * 2 + 1];
          let preset = 'lap';
          let ik = null;
          if (act === 'cheer' && !driving) preset = 'cheer';
          else if (act === 'whoa' && !driving) preset = 'whoa';
          else if (act === 'wave' && ai === r.outer) preset = 'wave';
          else if (driving) ik = 'wheel';
          else if (ai === r.outer && r.holdHandle) ik = 'handle';

          if (ik) {
            // target in the spine frame
            _m1.compose(B.pelvis.position, B.pelvis.quaternion, _one);
            _m2.compose(B.spine.position, B.spine.quaternion, _one);
            spineInv.multiplyMatrices(_m1, _m2).invert();
            if (ik === 'wheel') {
              const R = DIM.steer.r;
              grip.set(o * R * 0.87, -0.035, R * 0.45).applyMatrix4(steerM);
              pole.set(o * 0.8, -1, -0.5);
            } else {
              grip.set(o * 0.665, DIM.cushionTop + 0.17, B.pelvis.position.z + 0.08); // grab handle on this side
              pole.set(o * 0.4, -0.2, -1);
            }
            tmpT.copy(grip).applyMatrix4(spineInv);
            tmpS.copy(B.arms[ai].position);
            solveArm(tmpS, tmpT, pole.normalize(), r.a, r.b, qU, qF);
          } else {
            const [u, f] = P[preset];
            presetQuat(qU, u, o);
            if (preset === 'wave') presetQuat(qF, [0, 0, f[2] + 0.55 * Math.sin(at * 13)], o);
            else if (preset === 'cheer') presetQuat(qF, [0, 0, f[2] + 0.15 * Math.sin(at * 9 + ai)], o);
            else presetQuat(qF, f, o);
          }
          const kk = ik === 'wheel' ? Math.min(1, k * 2) : k;
          B.arms[ai].quaternion.slerp(qU, kk);
          B.fores[ai].quaternion.slerp(qF, kk);
        }
      }
    },
  };
}
