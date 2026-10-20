// East side of the park: Galleria Borghese with the Giardini Segreti, the Uccelliera and the
// Meridiana; the Seahorse Fountain; the Bioparco fence, its monumental gate and the animals
// you can see over the railing (plus fallow deer in the Parco dei Daini).
//
// Draw calls: galleria, aviary cages, fountain, fountain water, spray, zoo ground, zoo masonry,
// zoo railing, animals. Animals and spray animate in their vertex shaders (no per-frame CPU).
// Honking near the zoo makes the elephants trumpet (ears spread, trunk up) and the zebras look
// up; honking at the Seahorse Fountain makes its jet shoot higher.
import * as THREE from 'three';
import { buildGalleriaComplex } from './landmarksEast/galleria.js';
import { buildCavalliMarini } from './landmarksEast/fountain.js';
import { buildZoo } from './landmarksEast/zoo.js';
import { animalAtlas, animalMaterials, waterMaterial, sprayMaterial } from './landmarksEast/kit.js';

// Droplets for every jet: {x, y, z, r, v, main} rise and fall back; mouths spout sideways arcs.
function buildSpray(ctx, jets, mouths, rim) {
  const rnd = ctx.rng('east-spray');
  const q = ctx.quality.particles ?? 1;
  const pos = [], vel = [], phase = [], life = [];
  const add = (x, y, z, vx, vy, vz, L) => { pos.push(x, y, z); vel.push(vx, vy, vz); phase.push(rnd()); life.push(L); };
  for (const j of jets) {
    const n = Math.round((j.main ? 150 : 22) * q);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, s = rnd() * (j.main ? 0.42 : 0.18);
      const vy = j.v * (0.82 + rnd() * 0.22);
      add(j.x + Math.cos(a) * j.r * rnd(), j.y, j.z + Math.sin(a) * j.r * rnd(), Math.cos(a) * s, vy, Math.sin(a) * s, (2 * vy) / 9.8);
    }
  }
  for (const m of mouths) {
    for (let i = 0; i < Math.round(16 * q); i++) {
      const sp = 1.45 + rnd() * 0.35;
      add(m.x, m.y, m.z, m.dx * sp + (rnd() - 0.5) * 0.15, 0.5 + rnd() * 0.2, m.dz * sp + (rnd() - 0.5) * 0.15, 0.7);
    }
  }
  if (rim) {
    for (let i = 0; i < Math.round(40 * q); i++) {
      const a = rnd() * Math.PI * 2;
      add(rim.x + Math.cos(a) * rim.r, rim.y, rim.z + Math.sin(a) * rim.r, Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45, 0.82);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aVel', new THREE.Float32BufferAttribute(vel, 3));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  g.setAttribute('aLife', new THREE.Float32BufferAttribute(life, 1));
  g.computeBoundingSphere();
  g.boundingSphere.radius += 5;
  const mat = sprayMaterial('#f4fbff');
  const points = new THREE.Points(g, mat);
  points.name = 'east-spray';
  points.renderOrder = 3;
  return { points, mat };
}

export async function create(ctx) {
  const rnd = ctx.rng('landmarksEast');
  const root = new THREE.Group();
  root.name = 'landmarksEast';

  const waterMat = waterMaterial();
  const animalMats = animalMaterials(animalAtlas(ctx.rng('east-atlas')));
  const gal = buildGalleriaComplex(ctx, rnd);
  const fountain = buildCavalliMarini(ctx, waterMat);
  const zoo = buildZoo(ctx, rnd, animalMats);
  for (const m of [...gal.meshes, ...fountain.meshes, ...zoo.meshes]) root.add(m);
  const spray = buildSpray(ctx, [...fountain.jets, ...gal.jets], fountain.mouths, fountain.rim);
  root.add(spray.points);
  ctx.scene.add(root);

  // reactions to the horn and to the tour stops
  let trumpet = 0, boost = 0;
  const near = (p, r) => p && ctx.cart && Math.hypot(ctx.cart.position.x - p.x, ctx.cart.position.z - p.z) < r;
  const trumpetNow = () => {
    if (trumpet > 0.6) return;
    trumpet = 2.6;
    if (zoo.elephant) ctx.events.emit('animal', { kind: 'elephant', x: zoo.elephant.x, z: zoo.elephant.z });
  };
  ctx.events.on('honk', () => {
    if (near(zoo.elephant, 60) || near(zoo.gate, 45)) trumpetNow();
    else if (near(zoo.deer, 30)) trumpet = Math.max(trumpet, 1.8);
    if (near(zoo.lion, 35)) ctx.events.emit('animal', { kind: 'lion', x: zoo.lion.x, z: zoo.lion.z });
    if (near(fountain.centre, 30)) boost = 3;
  });
  ctx.events.on('stopReached', (e) => {
    if (e.id === 'bioparco') setTimeout(trumpetNow, 900);
    if (e.id === 'cavallimarini') boost = 4;
  });

  const size = new THREE.Vector2();
  return {
    group: root,
    update(dt, t) {
      const U = animalMats.uniforms;
      U.uTime.value = t;
      trumpet = Math.max(0, trumpet - dt);
      const want = trumpet > 0.7 ? 1 : 0;
      U.uReact.value += (want - U.uReact.value) * Math.min(1, dt * (want ? 6 : 2.5));
      boost = Math.max(0, boost - dt);
      const su = spray.mat.uniforms;
      su.uTime.value = t;
      su.uBoost.value += ((boost > 0 ? 1 : 0) - su.uBoost.value) * Math.min(1, dt * 3);
      ctx.renderer.getDrawingBufferSize(size);
      su.uScale.value = size.y / (2 * Math.tan((ctx.camera.fov * Math.PI) / 360));
      const map = waterMat.map;
      map.offset.y = (map.offset.y + dt * 1.7) % 1;
    },
  };
}
