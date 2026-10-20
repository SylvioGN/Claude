// Giardino del Lago and the north-west of the park: the Temple of Aesculapius on its island,
// lake life (rowing boats, ducks, swans, turtles, reeds, lilies, the boat-rental pier), the
// Arco di Settimio Severo, the Propilei Egizi, the Aranciera (Museo Bilotti), the Peschiera,
// Fiocco and Acqua Felix fountains, the monumental holm oak and the GNAM palace beyond the park.
//
// Draw calls: one merged mesh per landmark, one for every inscription / painted detail (atlas),
// one for all flowing water, and a few InstancedMeshes for the boats, oars, birds and koi.
import * as THREE from 'three';
import { canvasTexture } from '../core/util.js';
import { UVBuilder } from './landmarksLake/kit.js';
import { createAtlas } from './landmarksLake/atlas.js';
import { buildTemple } from './landmarksLake/temple.js';
import { buildLake } from './landmarksLake/lake.js';
import { buildArch, buildPropylaea } from './landmarksLake/gates.js';
import { buildAranciera, buildGnam } from './landmarksLake/buildings.js';
import { buildPeschiera, buildFiocco, buildAcquaFelix } from './landmarksLake/fountains.js';

export async function create(ctx) {
  const group = new THREE.Group();
  group.name = 'landmarksLake';
  ctx.scene.add(group);

  const atlas = createAtlas(ctx.rng('lake-atlas'));
  const env = { group, decals: new UVBuilder(), jets: new UVBuilder(), R: atlas.R };

  buildTemple(ctx, env);
  const lake = buildLake(ctx, env);
  buildArch(ctx, env);
  buildPropylaea(ctx, env);
  buildAranciera(ctx, env);
  buildGnam(ctx, env);
  const peschiera = buildPeschiera(ctx, env);
  buildFiocco(ctx, env);
  buildAcquaFelix(ctx, env);

  const decalMat = new THREE.MeshLambertMaterial({ map: atlas.texture, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const decals = env.decals.build(decalMat, { name: 'lake-decals', receiveShadow: true });
  if (decals) group.add(decals);

  // flowing water: white streaks scrolling along every jet, arc and curtain
  const streaks = canvasTexture(64, 128, (g, w, h) => {
    const rnd = ctx.rng('lake-streaks');
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, len = 12 + rnd() * 40;
      g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.55})`;
      g.fillRect(x, y, 2 + rnd() * 4, len);
      if (y + len > h) g.fillRect(x, y - h, 2 + rnd() * 4, len);
    }
  });
  streaks.repeat.set(2, 1);
  const jetMat = new THREE.MeshLambertMaterial({
    map: streaks, color: '#eef8ff', emissive: '#7fa9c2', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide,
  });
  const jets = env.jets.build(jetMat, { name: 'lake-water-jets' });
  if (jets) { jets.renderOrder = 2; group.add(jets); }

  return {
    update(dt, t) {
      streaks.offset.y = (t * 1.6) % 1;
      lake.update(dt, t);
      peschiera?.update(dt, t);
    },
  };
}
