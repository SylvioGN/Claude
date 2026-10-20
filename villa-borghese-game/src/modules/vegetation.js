// Vegetation: the umbrella pines, holm oaks, cedars, planes, cypresses, palms, magnolias, potted
// oranges, shrubs, clipped balls and flower beds that make Villa Borghese feel like itself.
//
// Placement lives in vegetation/placement.js, the models in vegetation/models.js and the shared
// plant material (tint, sway, see-through near the camera) in vegetation/material.js.
//
// Rendering: every model has two InstancedMeshes (near and far detail). Each frame they are
// refilled with just the plants inside the view frustum and the draw distance, near ones in the
// detailed mesh, so the whole park costs about one draw call per model in view, however many
// plants there are. Plants close to the cart stay in even when off screen so their shadows
// still fall into view.
//
// API: trees [{kind, x, z, r, h, canopy}] (r = trunk collider radius, canopy = crown radius),
//      treesNear(x, z, radius, kind?) for other modules (pine cones under the pines...).
// Test hook: ?vegdemo=x,z lines up every model in a row starting at (x, z).
import * as THREE from 'three';
import { makeModel, SPECIES } from './vegetation/models.js';
import { createPlantMaterial, createShadeMaterial } from './vegetation/material.js';
import { planPlants, demoPlants } from './vegetation/placement.js';

const LOD_DIST = { low: 50, med: 75, high: 115 };
const LOW_PLANTS = new Set(['shrub', 'hedgeBall', 'flowers', 'orange']);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _col = new THREE.Color();
const _pm = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const UP = new THREE.Vector3(0, 1, 0);

export async function create(ctx) {
  const { scene, terrain: T, quality, camera } = ctx;
  const items = planPlants(ctx);
  const demo = ctx.params.get('vegdemo');
  if (demo) {
    const [x, z] = demo.split(',').map(Number);
    items.push(...demoPlants(x, z));
  }

  const { material, uniforms } = createPlantMaterial();
  const root = new THREE.Group();
  root.name = 'vegetation';
  scene.add(root);

  // One batch per model: per-plant matrices, colours and bounding spheres, plus the two meshes.
  const batches = new Map();
  for (const it of items) {
    const key = `${it.kind}:${it.v}`;
    if (!batches.has(key)) batches.set(key, { key, kind: it.kind, v: it.v, list: [] });
    batches.get(key).list.push(it);
  }
  for (const b of batches.values()) {
    const n = b.list.length;
    const lods = [makeModel(b.kind, b.v, 0), makeModel(b.kind, b.v, 1)];
    b.crown = crownOf(lods[0]);
    b.mats = new Float32Array(n * 16);
    b.cols = new Float32Array(n * 3);
    b.sph = new Float32Array(n * 4);
    const bs = lods[0].boundingSphere;
    b.list.forEach((it, i) => {
      it.y = T.heightAt(it.x, it.z) - SPECIES[it.kind].sink;
      _m.compose(_p.set(it.x, it.y, it.z), _q.setFromEuler(_e.set(0, it.ry, 0)), _s.set(it.s * (it.sx || 1), it.sy, it.s * (it.sz || 1)));
      _m.toArray(b.mats, i * 16);
      if (Array.isArray(it.tint)) _col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      else _col.set(it.tint);
      _col.toArray(b.cols, i * 3);
      _p.copy(bs.center).applyMatrix4(_m).toArray(b.sph, i * 4);
      b.sph[i * 4 + 3] = bs.radius * Math.max(it.s, it.sy) * 1.1;
    });
    b.meshes = lods.map((geo, lod) => {
      const mesh = new THREE.InstancedMesh(geo, material, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, _col);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = lod === 0 && b.kind !== 'flowers';
      mesh.receiveShadow = LOW_PLANTS.has(b.kind);
      mesh.name = `veg:${b.key}:${lod}`;
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
      return mesh;
    });
    // until the first update everything shows in the far mesh
    b.meshes[1].instanceMatrix.array.set(b.mats);
    b.meshes[1].instanceColor.array.set(b.cols);
    b.meshes[0].count = 0;
    b.meshes[0].visible = false;
  }

  // Soft shade discs under every crown, tilted to the ground (one draw call for the park).
  const shaded = items.filter((it) => it.kind !== 'flowers');
  const shade = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    createShadeMaterial(ctx.util, quality.shadows ? 0.22 : 0.4), shaded.length);
  shaded.forEach((it, i) => {
    const crown = batches.get(`${it.kind}:${it.v}`).crown;
    const c = Math.cos(it.ry), sn = Math.sin(it.ry);
    const x = it.x + (crown.x * c + crown.z * sn) * it.s, z = it.z + (-crown.x * sn + crown.z * c) * it.s;
    const d = crown.r * it.s * 2.3;
    _n.fromArray(T.normalAt(x, z, 1.5));
    _m.compose(_p.set(x, T.heightAt(x, z) + 0.06, z), _q.setFromUnitVectors(UP, _n), _s.set(d, 1, d));
    shade.setMatrixAt(i, _m);
  });
  shade.computeBoundingSphere();
  shade.name = 'veg:shade';
  shade.renderOrder = 1;
  shade.matrixAutoUpdate = false;
  root.add(shade);

  // Trunk colliders and the public list of trees.
  const trees = [];
  for (const it of items) {
    const sp = SPECIES[it.kind];
    if (!sp.tag || it.src === 'demo') continue;
    const r = sp.trunk * it.s;
    ctx.colliders.addCircle(it.x, it.z, r, sp.tag, { kind: it.kind });
    trees.push({ kind: it.kind, x: it.x, z: it.z, r, h: sp.h * it.sy, canopy: sp.canopy * it.s });
  }

  const drawDist = quality.drawDistance || 340;
  const lodDist = LOD_DIST[quality.tier] ?? 75;
  const shadowKeep = (quality.shadowRange || 50) + 12;
  const batchList = [...batches.values()];
  const last = { x: Infinity, y: 0, z: 0, dx: 0, dy: 0, dz: 0, cx: 0, cz: 0, fov: 0, aspect: 0 };
  const dir = new THREE.Vector3();

  // Refill the meshes with the plants in view (skipped while the camera and the cart stay put).
  function cull(force) {
    const cam = camera.position, cart = ctx.cart?.position;
    camera.getWorldDirection(dir);
    const cx = cart ? cart.x : cam.x, cz = cart ? cart.z : cam.z;
    if (!force && Math.abs(cam.x - last.x) + Math.abs(cam.y - last.y) + Math.abs(cam.z - last.z) < 0.25
      && dir.x * last.dx + dir.y * last.dy + dir.z * last.dz > 0.99995 && Math.abs(cx - last.cx) + Math.abs(cz - last.cz) < 1
      && Math.abs(camera.fov - last.fov) < 0.1 && camera.aspect === last.aspect) return;
    Object.assign(last, { x: cam.x, y: cam.y, z: cam.z, dx: dir.x, dy: dir.y, dz: dir.z, cx, cz, fov: camera.fov, aspect: camera.aspect });
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const planes = _frustum.planes;
    const shadows = ctx.quality.shadows;
    for (const b of batchList) {
      const [hi, lo] = b.meshes;
      const hm = hi.instanceMatrix.array, hc = hi.instanceColor.array, lm = lo.instanceMatrix.array, lc = lo.instanceColor.array;
      const { mats, cols, sph } = b;
      let nh = 0, nl = 0;
      for (let i = 0, n = b.list.length; i < n; i++) {
        const x = sph[i * 4], y = sph[i * 4 + 1], z = sph[i * 4 + 2], r = sph[i * 4 + 3];
        const dx = x - cam.x, dz = z - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > (drawDist + r) * (drawDist + r)) continue;
        let inView = true;
        for (let p = 0; p < 6; p++) {
          const pl = planes[p];
          if (pl.normal.x * x + pl.normal.y * y + pl.normal.z * z + pl.constant < -r - 1) { inView = false; break; }
        }
        const near = d2 < lodDist * lodDist;
        if (!inView && !(near && shadows && (x - cx) ** 2 + (z - cz) ** 2 < shadowKeep * shadowKeep)) continue;
        let k;
        if (near) {
          k = nh++;
          for (let j = 0; j < 16; j++) hm[k * 16 + j] = mats[i * 16 + j];
          hc[k * 3] = cols[i * 3]; hc[k * 3 + 1] = cols[i * 3 + 1]; hc[k * 3 + 2] = cols[i * 3 + 2];
        } else {
          k = nl++;
          for (let j = 0; j < 16; j++) lm[k * 16 + j] = mats[i * 16 + j];
          lc[k * 3] = cols[i * 3]; lc[k * 3 + 1] = cols[i * 3 + 1]; lc[k * 3 + 2] = cols[i * 3 + 2];
        }
      }
      setCount(hi, nh);
      setCount(lo, nl);
    }
  }

  return {
    trees,
    count: items.length,
    treesNear(x, z, radius, kind = null) {
      return trees.filter((t) => (!kind || t.kind === kind) && Math.abs(t.x - x) < radius && Math.abs(t.z - z) < radius && Math.hypot(t.x - x, t.z - z) < radius);
    },
    // Re-cull now (after moving the camera outside the frame loop, e.g. in tests).
    refresh() { cull(true); },
    update(dt, t) {
      uniforms.uTime.value = t;
      const cart = ctx.cart?.position;
      if (cart) uniforms.uCart.value.set(cart.x, cart.y + 1.2, cart.z);
      const mode = ctx.camRig?.mode;
      uniforms.uSeeThrough.value = cart && (mode === 'chase' || mode === 'photo') ? 1 : 0;
      cull(false);
    },
  };
}

function setCount(mesh, n) {
  mesh.count = n;
  mesh.visible = n > 0;
  if (!n) return;
  for (const attr of [mesh.instanceMatrix, mesh.instanceColor]) {
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, n * attr.itemSize);
    attr.needsUpdate = true;
  }
}

// Centre (x, z) and radius of a model's foliage, for its shade disc.
function crownOf(geometry) {
  const pos = geometry.attributes.position, leaf = geometry.attributes.aLeaf;
  let sx = 0, sz = 0, n = 0;
  for (let i = 0; i < pos.count; i++) if (leaf.getX(i) > 0.5) { sx += pos.getX(i); sz += pos.getZ(i); n++; }
  if (!n) {
    const bb = geometry.boundingBox;
    return { x: 0, z: 0, r: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 };
  }
  const cx = sx / n, cz = sz / n;
  let r = 0;
  for (let i = 0; i < pos.count; i++) if (leaf.getX(i) > 0.5) r = Math.max(r, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
  return { x: cx, z: cz, r: r * 0.75 };
}
