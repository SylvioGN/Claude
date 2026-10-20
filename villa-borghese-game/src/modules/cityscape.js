// Cityscape: the ordinary buildings and walls of the park, and Rome all around it.
//   * MAP.BUILDINGS (villas, casinos, academies) and MAP.WALLS (Aurelian walls, garden walls,
//     railings, hedges) with colliders
//   * the real city blocks around the park from OpenStreetMap, streets with a little traffic,
//     Viale del Muro Torto in its cutting
//   * Piazza del Popolo below the Pincio terrace, Villa Medici, GNAM, Trinità dei Monti
//   * a hazy skyline beyond the fog: St Peter's dome, the Vittoriano, domes, Monte Mario, Gianicolo
// Everything shares one canvas atlas and material (cityscape/atlas.js), merged per spatial chunk.
import * as THREE from 'three';
import { cityMaterials } from './cityscape/atlas.js';
import { Chunks, pointInRing } from './cityscape/builder.js';
import { buildParkBuildings, buildCity } from './cityscape/city.js';
import { buildWalls, RailBuilder } from './cityscape/walls.js';
import { buildPopolo } from './cityscape/popolo.js';
import { buildLandmarks } from './cityscape/landmarks.js';
import { buildSkyline } from './cityscape/skyline.js';
import { buildTraffic } from './cityscape/traffic.js';
import { plantCityTrees } from './cityscape/trees.js';

const CHUNK = 240;

export async function create(ctx) {
  const { scene, MAP } = ctx;
  const mats = cityMaterials();
  const root = new THREE.Group();
  root.name = 'cityscape';
  scene.add(root);
  const chunks = new Chunks(CHUNK);
  const stats = {};

  // Footprints that would sit on a landmark or on the Muro Torto road are left out.
  const anchorRings = Object.values(MAP.ANCHORS).filter((a) => a.footprint).map((a) => a.footprint);
  const anchorPoints = Object.values(MAP.ANCHORS).filter((a) => !a.footprint);
  const muro = MAP.BACKDROP.muroTorto || [];
  const nearMuro = (x, z, d) => muro.some((p, i) => i > 0 && segDist(x, z, muro[i - 1], p) < d);
  const skipPark = (x, z) => anchorRings.some((r) => pointInRing(x, z, r))
    || anchorPoints.some((a) => Math.hypot(a.x - x, a.z - z) < 4)
    || nearMuro(x, z, 9);

  stats.park = buildParkBuildings(ctx, chunks, skipPark);
  const rails = new RailBuilder();
  stats.walls = buildWalls(ctx, chunks, rails);
  const specials = [], rings = [];
  stats.city = buildCity(ctx, chunks, { specials, rings });
  buildPopolo(ctx, chunks);
  buildLandmarks(ctx, chunks, specials);
  stats.trees = plantCityTrees(ctx, rings);

  stats.tris = chunks.buildInto(root, mats.city, { name: 'city' });
  const railMesh = rails.build(mats.rail);
  if (railMesh) root.add(railMesh);

  const sky = buildSkyline(ctx, mats.sky);
  if (sky.mesh) root.add(sky.mesh);
  stats.skyline = sky.blocks;
  const traffic = buildTraffic(ctx, mats.city);
  if (traffic) root.add(traffic.group);
  if (ctx.debug) console.log('[cityscape]', stats);

  return {
    stats,
    update(dt) {
      const fog = scene.fog;
      if (fog) {
        mats.haze.hazeColor.value.copy(fog.color);
        mats.haze.hazeRange.value.set(fog.near, fog.far, 0.6);
      }
      traffic?.update(dt);
    },
  };
}

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((x - a[0]) * dx + (z - a[1]) * dz) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
