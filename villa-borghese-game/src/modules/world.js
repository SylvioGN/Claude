// World: the ground everything stands on, the water, the sky and the light.
//  * terrain mesh tiled from the shared height grid, coloured by one big painted ground canvas
//    (lawns, woods, gravel avenues, plazas, flower beds, streets), a coverage mask that keeps the
//    edges between gravel and grass crisp, and a tiled detail texture
//  * the lake, ponds and fountain basins with animated water, fountain rims, the lake's stone kerb
//  * sky dome with sun and drifting clouds, fog matched to the horizon haze, tuned sun/hemi light
//  * a flat ring of land out to the horizon so the view never ends in a void
import { paintGround, makeDetailTexture, REGION } from './world/ground.js';
import { buildTerrain, terrainMaterial } from './world/terrainMesh.js';
import { buildSky, SKY } from './world/sky.js';
import { buildWater } from './world/water.js';

export async function create(ctx) {
  const { THREE, scene, renderer, quality, lights } = ctx;
  const low = quality.tier === 'low';

  // --- light: bright, warm October midday
  renderer.toneMappingExposure = 1.12;
  lights.sun.color.set('#fff1dc');
  lights.sun.intensity = 2.7;
  lights.hemi.color.set('#d7e9ff');
  lights.hemi.groundColor.set('#8a8f5a');
  lights.hemi.intensity = 1.25;

  // --- sky and fog
  const sky = buildSky(ctx);
  scene.add(sky.mesh);
  scene.background = new THREE.Color(SKY.horizon);
  scene.fog.color.set(SKY.horizon);
  // base fog range relative to the draw distance (the adaptive quality may pull it in later)
  const fogNearK = scene.fog.near / quality.drawDistance, fogFarK = scene.fog.far / quality.drawDistance;

  // --- ground textures and terrain: the colour canvas, and the coverage mask that keeps the
  // gravel/grass edges crisp (one byte a texel, so it stays at full size on every tier)
  const ground = paintGround(ctx, low ? 1536 : 2048, 2048);
  const groundTex = new THREE.CanvasTexture(ground.canvas);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.flipY = false;
  groundTex.wrapS = groundTex.wrapT = THREE.ClampToEdgeWrapping;
  groundTex.anisotropy = Math.min(low ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  const maskTex = new THREE.DataTexture(ground.mask.data, ground.mask.width, ground.mask.height, THREE.RedFormat, THREE.UnsignedByteType);
  maskTex.unpackAlignment = 1;
  maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.generateMipmaps = true;
  maskTex.anisotropy = groundTex.anisotropy;
  maskTex.needsUpdate = true;
  const detailTex = makeDetailTexture(THREE, ctx.rng('world-detail'), low ? 128 : 256);
  detailTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const { material: groundMat } = terrainMaterial(ctx, groundTex, maskTex, detailTex);
  const terrain = buildTerrain(ctx, groundMat);
  scene.add(terrain.group);

  const horizon = buildHorizonRing(ctx, groundMat);
  scene.add(horizon);

  // --- water
  const water = buildWater(ctx);
  scene.add(water.water);
  if (water.rims) scene.add(water.rims);

  // Follow the camera that is actually being rendered (after the camera rig has moved it): the sky
  // stays centred on it, the fog reaches further when it rises (title orbit, overviews) and tiles
  // beyond the fog are skipped.
  const _v = new THREE.Vector3();
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (r, s, camera, target) {
    before.call(this, r, s, camera, target);
    const p = camera.position;
    sky.mesh.position.copy(p);
    sky.mesh.updateMatrixWorld();
    const lift = Math.max(0, p.y - ctx.terrain.heightAt(p.x, p.z) - 20);
    const dd = quality.drawDistance;
    scene.fog.near = dd * fogNearK + lift * 1.2;
    scene.fog.far = dd * fogFarK + lift * 2.2;
    for (const tile of terrain.tiles) {
      const b = tile.geometry.boundingSphere;
      tile.visible = _v.copy(b.center).distanceTo(p) < scene.fog.far + b.radius;
    }
  };

  return {
    // Painted top-down map of the park (handy for a mini-map): canvas + world rectangle it covers.
    groundCanvas: ground.canvas,
    groundRegion: REGION,
    terrainTriangles: terrain.group.userData.triangles,
    // Water surface height of a MAP.WATER entry (lake: WATER_Y; fountains: heightAt(centre) + 0.45).
    waterLevel(w) { return water.levels.get(w); },
    update(dt, t) {
      water.uniforms.uTime.value = t;
      sky.uniforms.uTime.value = t;
    },
  };
}

// Flat land from the edge of the terrain out to the horizon, joined to the terrain's edge heights.
function buildHorizonRing(ctx, material) {
  const { THREE, terrain: T } = ctx;
  const { minX, minZ, maxX, maxZ } = T.extent;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const N = 160;
  const radii = [0, 40, 260, 2300];
  const pos = [], nor = [], idx = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    // where the ray from the centre leaves the terrain rectangle
    const tx = dx > 0 ? (maxX - cx) / dx : dx < 0 ? (minX - cx) / dx : Infinity;
    const tz = dz > 0 ? (maxZ - cz) / dz : dz < 0 ? (minZ - cz) / dz : Infinity;
    const t0 = Math.min(tx, tz) - 0.75;
    const ex = cx + dx * t0, ez = cz + dz * t0;
    const eh = T.heightAt(ex, ez);
    for (const [ri, r] of radii.entries()) {
      const y = ri === 0 ? eh - 0.05 : ri === 1 ? eh - 0.4 : -3;
      pos.push(ex + dx * r, y, ez + dz * r);
      nor.push(0, 1, 0);
    }
  }
  const R = radii.length;
  for (let k = 0; k < N; k++) {
    const k2 = (k + 1) % N;
    for (let r = 0; r < R - 1; r++) {
      const a = k * R + r, b = k * R + r + 1, c = k2 * R + r, d = k2 * R + r + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'horizonRing';
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  return mesh;
}
