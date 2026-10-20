// Camera rig: chase camera behind the cart, a photo-moment framing at tour stops,
// a slow scenic orbit for the title screen, and a fixed debug camera from URL params.
import * as THREE from 'three';
import { clamp } from './geo.js';

export function createCameraRig(ctx) {
  const cam = ctx.camera;
  const pos = new THREE.Vector3(0, 30, 0);
  const look = new THREE.Vector3();
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  let mode = 'title';
  let photo = null;
  let orbit = { x: 0, z: 0, r: 40, h: 18, a: 0, speed: 0.06 };
  let shake = 0;

  const p = ctx.params;
  const debugCam = p.get('cam') ? p.get('cam').split(',').map(Number) : null;
  const debugLook = p.get('look') ? p.get('look').split(',').map(Number) : null;
  if (debugCam) mode = 'debug';

  ctx.events.on('bump', (e) => { shake = Math.min(1, shake + (e.strength || 0.3) * 0.8); });

  function baseFov() {
    const aspect = cam.aspect;
    return aspect < 1 ? 72 : aspect < 1.5 ? 62 : 55; // portrait phones need a wider view
  }

  // Choose the photo camera once per stop: an authored view if the landmark module gave one,
  // otherwise the clearest of a few side-on angles that frame the cart and the landmark together.
  const BLOCKERS = new Set(['tree', 'building', 'lamp', 'statue', 'wall', 'hedge', 'sign', 'rock']);
  function blocked(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az);
    let hits = 0;
    for (let s = 1; s < L; s += 1.5) {
      const x = ax + ((bx - ax) * s) / L, z = az + ((bz - az) * s) / L;
      ctx.colliders.query(x, z, 1, (sh) => {
        if (!BLOCKERS.has(sh.tag)) return;
        if (sh.type === 0) { if (Math.hypot(x - sh.x, z - sh.z) < sh.r + 0.4) hits++; }
        else {
          const sx = sh.bx - sh.ax, sz = sh.bz - sh.az, L2 = sx * sx + sz * sz || 1;
          const u = clamp(((x - sh.ax) * sx + (z - sh.az) * sz) / L2, 0, 1);
          if (Math.hypot(x - sh.ax - sx * u, z - sh.az - sz * u) < sh.pad + 0.4) hits++;
        }
      });
    }
    return hits;
  }
  function photoShot(ph) {
    if (ph.view) return { cam: ph.view.cam, look: ph.view.look, fov: ph.view.fov };
    const H = ctx.terrain.heightAt;
    const { cartX, cartZ, cartY, lmX, lmZ, lmY = 8 } = ph;
    let dx = lmX - cartX, dz = lmZ - cartZ;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const dist = clamp(0.5 * L + 9, 11, 22);
    const mid = Math.min(L, 24) * 0.45;
    const look = [cartX + dx * mid, cartY + Math.min(lmY, 10) * 0.45 + 1, cartZ + dz * mid];
    let best = null;
    for (const th of [0.7, -0.7, 1.0, -1.0, 0.45, -0.45, 1.3, -1.3]) {
      const c = Math.cos(th), s = Math.sin(th);
      const ox = -dx * c + dz * s, oz = -dz * c - dx * s;
      const x = cartX + ox * dist, z = cartZ + oz * dist;
      if (!ctx.terrain.isInside(x, z)) continue;
      const tx = cartX + dx * L * 0.75, tz = cartZ + dz * L * 0.75; // stop short of the landmark's own walls
      const score = blocked(x, z, tx, tz) * 2 + blocked(x, z, cartX, cartZ) * 3 + Math.abs(th) * 0.5;
      if (!best || score < best.score) best = { score, cam: [x, Math.max(cartY + 3.4, H(x, z) + 1.6), z] };
    }
    if (!best) best = { cam: [cartX - dx * dist, cartY + 3.4, cartZ - dz * dist] };
    return { cam: best.cam, look, fov: 58 };
  }

  const rig = {
    get mode() { return mode; },
    setMode(m, opts = {}) {
      if (debugCam && m !== 'debug') return; // ?cam= keeps the fixed debug view
      mode = m;
      if (m === 'title' && opts.x !== undefined) orbit = { r: 40, h: 18, a: 0, speed: 0.06, ...opts };
      if (m === 'photo') photo = opts;
      if (m === 'chase' && opts.snap) rig.snap();
    },
    snap() {
      rig.update(1 / 60, true);
    },
    update(dt, instant = false) {
      const H = ctx.terrain.heightAt;
      if (mode === 'debug') {
        cam.position.set(debugCam[0], debugCam[1], debugCam[2]);
        if (debugLook) cam.lookAt(debugLook[0], debugLook[1], debugLook[2]);
        cam.fov = Number(p.get('fov')) || baseFov();
        cam.updateProjectionMatrix();
        return;
      }
      const cart = ctx.cart;
      let k = 1 - Math.exp(-dt * 4.5);
      if (mode === 'chase' && cart) {
        const h = cart.heading;
        const fx = Math.sin(h), fz = Math.cos(h);
        const sp = Math.abs(cart.speed || 0);
        const portrait = cam.aspect < 1;
        // close enough that the family on board is the star of the screen
        const back = (portrait ? 10 : 8) + sp * 0.09;
        const up = (portrait ? 5 : 3.9) + sp * 0.025;
        k = 1 - Math.exp(-dt * 6);
        const cx = cart.position.x, cz = cart.position.z, cy = cart.position.y;
        wantPos.set(cx - fx * back, cy + up, cz - fz * back);
        const ground = H(wantPos.x, wantPos.z) + 1.6;
        if (wantPos.y < ground) wantPos.y = ground;
        wantLook.set(cx + fx * 5, cy + 1.6, cz + fz * 5);
        cam.fov += (baseFov() + sp * 0.35 - cam.fov) * k;
      } else if (mode === 'photo' && photo) {
        // Holiday snapshot: the family in the cart in front, the landmark behind.
        if (!photo.shot) photo.shot = photoShot(photo);
        const { cam: c0, look: l0 } = photo.shot;
        const t = ctx.time - (photo.t0 ?? ctx.time);
        const settle = Math.max(0, 1 - t / 1.2); // gentle push-in that is still by the snapshot
        wantPos.set(c0[0] + (c0[0] - l0[0]) * 0.12 * settle, c0[1] + 0.6 * settle, c0[2] + (c0[2] - l0[2]) * 0.12 * settle);
        wantLook.set(l0[0], l0[1], l0[2]);
        k = 1 - Math.exp(-dt * 3);
        const pf = photo.shot.fov || 58;
        cam.fov += ((cam.aspect < 1 ? pf * 1.3 : pf) - cam.fov) * k; // portrait needs a wider lens
      } else {
        // title: a slow orbit (or a ping-pong arc when orbit.arc is set) around a scenic spot
        orbit.t = (orbit.t || 0) + dt;
        const a = orbit.arc ? orbit.a + orbit.arc * Math.sin(orbit.t * orbit.speed) : (orbit.a += dt * orbit.speed);
        const ox = orbit.x + Math.cos(a) * orbit.r, oz = orbit.z + Math.sin(a) * orbit.r;
        wantPos.set(ox, Math.max(H(ox, oz) + 2, H(orbit.x, orbit.z) + orbit.h), oz);
        const lx = orbit.lookX ?? orbit.x, lz = orbit.lookZ ?? orbit.z;
        wantLook.set(lx, H(orbit.x, orbit.z) + (orbit.lookY ?? 4), lz);
        k = 1 - Math.exp(-dt * 1.5);
        cam.fov += (baseFov() + 4 - cam.fov) * k;
      }
      if (instant) k = 1;
      pos.lerp(wantPos, k);
      look.lerp(wantLook, Math.min(1, k * 1.3));
      cam.position.copy(pos);
      if (shake > 0.001) {
        shake *= Math.exp(-dt * 7);
        cam.position.x += (Math.random() - 0.5) * shake * 0.5;
        cam.position.y += (Math.random() - 0.5) * shake * 0.4;
      }
      cam.lookAt(look);
      cam.fov = clamp(cam.fov, 40, 90);
      cam.updateProjectionMatrix();
    },
  };
  return rig;
}
