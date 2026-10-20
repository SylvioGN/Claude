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

  const rig = {
    get mode() { return mode; },
    setMode(m, opts = {}) {
      if (debugCam && m !== 'debug') return; // ?cam= keeps the fixed debug view
      mode = m;
      if (m === 'title' && opts.x !== undefined) orbit = { ...orbit, ...opts };
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
        const back = (portrait ? 11.5 : 9.5) + sp * 0.12;
        const up = (portrait ? 5.6 : 4.4) + sp * 0.03;
        const cx = cart.position.x, cz = cart.position.z, cy = cart.position.y;
        wantPos.set(cx - fx * back, cy + up, cz - fz * back);
        const ground = H(wantPos.x, wantPos.z) + 1.6;
        if (wantPos.y < ground) wantPos.y = ground;
        wantLook.set(cx + fx * 5, cy + 1.6, cz + fz * 5);
        cam.fov += (baseFov() + sp * 0.35 - cam.fov) * k;
      } else if (mode === 'photo' && photo) {
        // Side-on family photo with the landmark behind the cart, like the real snapshot.
        const { cartX, cartZ, cartY, lmX, lmZ, lmY = 6 } = photo;
        let dx = lmX - cartX, dz = lmZ - cartZ;
        const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
        const t = (ctx.time - (photo.t0 ?? ctx.time));
        const swing = Math.sin(Math.min(t, 3) * 0.35) * 0.35;
        const ox = -dx * Math.cos(swing) + dz * Math.sin(swing), oz = -dz * Math.cos(swing) - dx * Math.sin(swing);
        const dist = 11;
        wantPos.set(cartX + ox * dist, cartY + 3.2, cartZ + oz * dist);
        const ground = H(wantPos.x, wantPos.z) + 1.5;
        if (wantPos.y < ground) wantPos.y = ground;
        wantLook.set(cartX + dx * Math.min(L, 18) * 0.45, cartY + Math.min(lmY, 10) * 0.35 + 1.2, cartZ + dz * Math.min(L, 18) * 0.45);
        k = 1 - Math.exp(-dt * 2.2);
        cam.fov += (58 - cam.fov) * k;
      } else {
        // title: slow orbit around a scenic spot
        orbit.a += dt * orbit.speed;
        const ox = orbit.x + Math.cos(orbit.a) * orbit.r, oz = orbit.z + Math.sin(orbit.a) * orbit.r;
        wantPos.set(ox, Math.max(H(ox, oz) + 4, H(orbit.x, orbit.z) + orbit.h), oz);
        wantLook.set(orbit.x, H(orbit.x, orbit.z) + (orbit.lookY ?? 4), orbit.z);
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
