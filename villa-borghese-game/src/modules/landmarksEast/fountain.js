// Fontana dei Cavalli Marini (Cristoforo Unterperger, 1791): four rearing sea-horses with
// curling fish tails spring from a rock and hold up a scalloped shell basin with a jet.
// world.js already draws the round basin, its water and a plain rim.
import * as THREE from 'three';
import { mats } from '../../core/util.js';
import { C, FrameBuilder, tube, photoView } from './kit.js';

const STONE = '#ebe4d2', STONE_DARK = '#cfc6ae';

// One sea-horse built facing +z (outwards) in the frame; base of the rock at y = 0.
function seaHorse(gb) {
  // fish tail: shrinking spheres coiling back round the central column
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.5, 0.85), new THREE.Vector3(0, 1.05, 0.45), new THREE.Vector3(0.15, 0.95, -0.05),
    new THREE.Vector3(0.35, 1.3, -0.35), new THREE.Vector3(0.2, 1.9, -0.55), new THREE.Vector3(-0.15, 2.4, -0.45),
  ]);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = tail.getPoint(t);
    gb.sphere(0.4 * (1 - t * 0.7), 1, STONE, p.x, p.y, p.z);
  }
  const end = tail.getPoint(1);
  for (const s of [-1, 1]) gb.place(new THREE.ConeGeometry(0.28, 0.7, 6), STONE_DARK, end.x + s * 0.18, end.y + 0.25, end.z, 0, 0, s * 0.9, 1, 1, 0.3);
  // chest and neck rearing up and out
  gb.sphere(0.5, 1, STONE, 0, 1.8, 1.05, 0.85, 1.0, 1.1);
  tube(gb, [0, 1.95, 1.15], [0, 2.75, 1.55], 0.34, 0.22, STONE, 9);
  // head bowed forwards: skull, long muzzle, ears, eyes, nostrils
  const head = new THREE.Matrix4().compose(new THREE.Vector3(0, 2.86, 1.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, 0)), new THREE.Vector3(1, 1, 1));
  const part = (g, color, x, y, z) => gb.add(g, color, head.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)));
  part(new THREE.SphereGeometry(1, 10, 7).scale(0.21, 0.23, 0.3), STONE, 0, 0, -0.05);
  part(new THREE.CylinderGeometry(0.13, 0.17, 0.5, 9).rotateX(Math.PI / 2), STONE, 0, -0.06, 0.32);
  part(new THREE.SphereGeometry(0.15, 9, 6), STONE, 0, -0.07, 0.58);
  for (const sx of [-1, 1]) {
    part(new THREE.ConeGeometry(0.08, 0.3, 5), STONE, sx * 0.12, 0.3, -0.18);
    part(new THREE.SphereGeometry(0.055, 6, 4), '#4d483f', sx * 0.2, 0.08, 0.08);
    part(new THREE.SphereGeometry(0.04, 6, 4), '#6b655a', sx * 0.08, -0.12, 0.74);
  }
  // flowing mane of fins down the back of the neck
  for (let i = 0; i < 5; i++) {
    gb.place(new THREE.BoxGeometry(0.07, 0.34, 0.3), STONE_DARK, 0, 2.95 - i * 0.2, 1.38 - i * 0.14, 0.6 + i * 0.12, 0, 0);
  }
  // front legs pawing the air, ending in webbed fins
  for (const sx of [-1, 1]) {
    const hip = [sx * 0.24, 1.7, 1.3], knee = [sx * 0.27, 2.05, 1.85], hoof = [sx * 0.25, 1.6, 2.12];
    tube(gb, hip, knee, 0.13, 0.11, STONE);
    tube(gb, knee, hoof, 0.1, 0.08, STONE);
    gb.place(new THREE.ConeGeometry(0.2, 0.34, 6), STONE_DARK, hoof[0], hoof[1] - 0.08, hoof[2] + 0.05, 0.5, 0, 0, 1, 1, 0.45);
    gb.place(new THREE.ConeGeometry(0.24, 0.55, 5), STONE_DARK, sx * 0.45, 1.55, 0.75, 0, 0, -sx * 1.25, 0.35, 1, 1);
  }
}

// Scalloped shell basin: a lathe whose rim waves in and out.
function shellGeometry(R) {
  const prof = [[0.05, 0], [0.32, 0.04], [0.85, 0.2], [R * 0.92, 0.42], [R, 0.58], [R * 0.96, 0.66], [R * 0.86, 0.6]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const a = Math.atan2(z, x), k = 1 + 0.09 * Math.cos(a * 10) * Math.min(1, y / 0.4);
    p.setXYZ(i, x * k, y + 0.05 * Math.cos(a * 10) * Math.min(1, y / 0.4), z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCavalliMarini(ctx, waterMat) {
  const { MAP, terrain } = ctx;
  const A = MAP.ANCHORS.cavallimarini;
  const w = MAP.WATER.find((x) => x.n === 'Fontana dei Cavalli Marini');
  const cx = w ? w.r.reduce((s, p) => s + p[0], 0) / w.r.length : A.x;
  const cz = w ? w.r.reduce((s, p) => s + p[1], 0) / w.r.length : A.z;
  const y0 = terrain.heightAt(cx, cz), wy = 0.45;
  const gb = new FrameBuilder();
  gb.setFrame(cx, y0, cz, 0);

  // rock in the middle of the pool
  const rock = new THREE.IcosahedronGeometry(1.3, 1);
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.82 + 0.3 * Math.abs(Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 2.3));
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  gb.place(rock, STONE_DARK, 0, 0.25, 0, 0, 0, 0, 1, 0.62, 1);
  gb.cyl(0.32, 0.48, 2.4, 8, STONE, 0, 1.75, 0);
  // the four sea-horses on the diagonals
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    gb.setFrame(cx, y0, cz, a);
    seaHorse(gb);
  }
  gb.setFrame(cx, y0, cz, 0);
  // shell basin and its pool
  const SH = 2.95, SR = 1.5;
  gb.add(shellGeometry(SR), STONE, new THREE.Matrix4().makeTranslation(0, SH, 0));
  gb.cyl(SR * 0.84, SR * 0.84, 0.05, 20, C.water, 0, SH + 0.55, 0);
  gb.cyl(0.18, 0.26, 0.45, 8, STONE_DARK, 0, SH + 0.72, 0);
  const mesh = gb.build(mats().vc, { name: 'cavalli-marini' });

  // water: overflow streams between the horses and arcs from their mouths
  const streams = [];
  const add = (g, m) => { const x = g.index ? g.toNonIndexed() : g; x.applyMatrix4(m); streams.push(x); };
  for (let k = 0; k < 8; k++) {
    const a = Math.floor(k / 2) * (Math.PI / 2) + ((k % 2) - 0.5) * 0.5;
    const r0 = SR * 1.02, r1 = SR * 1.35;
    const top = new THREE.Vector3(Math.cos(a) * r0, SH + 0.62, Math.sin(a) * r0);
    const bot = new THREE.Vector3(Math.cos(a) * r1, wy, Math.sin(a) * r1);
    const L = top.distanceTo(bot);
    const g = new THREE.CylinderGeometry(0.04, 0.08, L, 5, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize().negate());
    add(g, new THREE.Matrix4().compose(top.clone().add(bot).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const mouth = dir.clone().multiplyScalar(2.15).setY(2.2);
    const peak = dir.clone().multiplyScalar(2.75).setY(2.25);
    const hit = dir.clone().multiplyScalar(3.2).setY(wy);
    const curve = new THREE.QuadraticBezierCurve3(mouth, peak, hit);
    const g = new THREE.TubeGeometry(curve, 8, 0.05, 4, false);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), 1 - uv.getX(i));
    add(g, new THREE.Matrix4());
  }
  for (const g of streams) for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
  const geo = (() => {
    const merged = streams.length ? streams : [];
    // central jet: a slim rising cone (uv flipped so the streaks travel upwards)
    const jet = new THREE.CylinderGeometry(0.03, 0.11, 2.0, 6, 1, true).toNonIndexed();
    const uv = jet.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    jet.translate(0, SH + 1.95, 0);
    merged.push(jet);
    return merged;
  })();
  const wm = new THREE.Mesh(mergeAll(geo), waterMat);
  wm.position.set(cx, y0, cz);
  wm.updateMatrix();
  wm.matrixAutoUpdate = false;
  wm.name = 'cavalli-marini-water';
  wm.renderOrder = 2;

  ctx.reserve({ x: cx, z: cz, r: 5 });
  // the postcard from the south-east with the sun behind the camera: the cart on the roundabout,
  // the sea-horses and the jet just behind it
  photoView(ctx, 'cavallimarini', { spot: [cx + 5.4, cz + 3.6], face: [0.03, 1], cam: [cx + 11.5, cz + 10.5, 6.3], look: [cx + 3, cz + 1.5, 1.8], far: [cx, cz], wide: 4 });
  return {
    meshes: [mesh, wm],
    jets: [{ x: cx, y: y0 + SH + 0.75, z: cz, r: 0.12, v: 5.6, main: true }],
    mouths: Array.from({ length: 4 }, (_, k) => {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      return { x: cx + Math.sin(a) * 2.15, y: y0 + 2.2, z: cz + Math.cos(a) * 2.15, dx: Math.sin(a), dz: Math.cos(a) };
    }),
    rim: { x: cx, y: y0 + SH + 0.62, z: cz, r: SR * 1.05 },
    centre: { x: cx, z: cz },
  };
}

function mergeAll(list) {
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}
