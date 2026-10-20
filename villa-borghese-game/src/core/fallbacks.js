// Minimal stand-ins used when a feature module is left out of a build (build.mjs --only=...)
// or fails to load, so every module can be tested on its own.
import * as THREE from 'three';
import { SURF } from './terrain.js';
import { clamp } from './geo.js';

export function fallbackWorld(ctx) {
  const T = ctx.terrain;
  const step = 3;
  const nx = Math.floor((T.extent.maxX - T.extent.minX) / step), nz = Math.floor((T.extent.maxZ - T.extent.minZ) / step);
  const geo = new THREE.PlaneGeometry(nx * step, nz * step, nx, nz);
  geo.rotateX(-Math.PI / 2);
  geo.translate(T.extent.minX + (nx * step) / 2, 0, T.extent.minZ + (nz * step) / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, T.heightAt(x, z));
    const s = T.surfaceAt(x, z);
    c.set(s === SURF.PATH || s === SURF.PLAZA ? '#d8c8a2' : s === SURF.WATER ? '#4a90b8' : s === SURF.FOREST ? '#5f8f3c' : s === SURF.OUTSIDE ? '#b9b2a4' : '#86b955');
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  ctx.scene.background = new THREE.Color('#8cc3e8');
  return {};
}

// A box on wheels with simple arcade handling.
export function fallbackCart(ctx) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 4.6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  body.position.y = 0.9; body.castShadow = true;
  group.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 4.8), new THREE.MeshLambertMaterial({ color: 0xf4f1ea }));
  roof.position.y = 2.2; group.add(roof);
  ctx.scene.add(group);
  let frozen = false;
  const cart = {
    object: group, position: group.position, heading: 0, speed: 0,
    reset(x, z, h) { group.position.set(x, ctx.terrain.heightAt(x, z), z); cart.heading = h; cart.speed = 0; },
    freeze(on) { frozen = on; if (on) cart.speed = 0; },
    getHitCircles() {
      const fx = Math.sin(cart.heading), fz = Math.cos(cart.heading);
      return [-1.6, 0, 1.6].map((o) => ({ x: group.position.x + fx * o, z: group.position.z + fz * o, r: 0.8 }));
    },
    update(dt) {
      if (frozen) return;
      const inp = ctx.input;
      const max = 13 * (ctx.game.boosting ? 1.4 : 1);
      cart.speed += (inp.throttle * 9 - inp.brake * 12 * (cart.speed > 0.5 ? 1 : 0.4)) * dt;
      cart.speed -= cart.speed * 0.6 * dt;
      cart.speed = clamp(cart.speed, -4, max);
      cart.heading -= inp.steer * dt * 1.6 * clamp(cart.speed / 6, -1, 1);
      let x = group.position.x + Math.sin(cart.heading) * cart.speed * dt;
      let z = group.position.z + Math.cos(cart.heading) * cart.speed * dt;
      const r = ctx.colliders.collideCircle(x, z, 1.0);
      if (r.hit) { x = r.x; z = r.z; ctx.events.emit('bump', { kind: r.tag, strength: clamp(Math.abs(cart.speed) / 12, 0, 1), x, z }); cart.speed *= -0.3; }
      group.position.set(x, ctx.terrain.heightAt(x, z), z);
      group.rotation.y = cart.heading;
    },
  };
  return cart;
}

// Keyboard controls (always on, also in the full game for desktop players).
export function installKeyboard(ctx) {
  const down = new Set();
  const map = (e) => e.key.length === 1 ? e.key.toLowerCase() : e.key;
  addEventListener('keydown', (e) => {
    down.add(map(e));
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(map(e)));
  addEventListener('blur', () => down.clear());
  ctx.keyInput = { steer: 0, throttle: 0, brake: 0, honk: false };
  return {
    update() {
      const k = ctx.keyInput;
      k.steer = (down.has('ArrowRight') || down.has('d') ? 1 : 0) - (down.has('ArrowLeft') || down.has('a') ? 1 : 0);
      k.throttle = down.has('ArrowUp') || down.has('w') ? 1 : 0;
      k.brake = down.has('ArrowDown') || down.has('s') ? 1 : 0;
      k.honk = down.has(' ') || down.has('h');
    },
  };
}
