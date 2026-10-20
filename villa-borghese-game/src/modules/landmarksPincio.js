// Pincio hill: the terrace over Piazza del Popolo, the water clock, the Moses fountain, the
// Obelisk of Antinous, Casina Valadier, the San Carlino puppet theatre, the footbridge over
// Viale del Muro Torto and the marble busts lining the avenues.
//
// Each landmark is one merged mesh using the Pincio atlas material (landmarksPincio/kit.js), so
// dials, signs, hieroglyphs and baluster cut-outs cost no extra draw calls. Moving parts: the
// clock hands and pendulum (one InstancedMesh) and the two puppets.
import { TexBuilder, atlasMaterial, offsetPolyline } from './landmarksPincio/kit.js';
import { buildTerrace } from './landmarksPincio/terrace.js';
import { buildClock, createClockHands } from './landmarksPincio/clock.js';
import { buildMoses, buildObelisk, buildValadier, buildSanCarlino, createPuppets } from './landmarksPincio/monuments.js';
import { buildBridge } from './landmarksPincio/bridge.js';
import { buildBusts } from './landmarksPincio/busts.js';
import { samplePolyline, pointInRing, distToRingEdge } from '../core/geo.js';

export async function create(ctx) {
  const { MAP } = ctx;
  const A = MAP.ANCHORS;
  const mat = atlasMaterial();
  const meshes = {};
  const build = (name, fn) => {
    const tb = new TexBuilder();
    const site = fn(ctx, tb);
    const mesh = tb.build(mat, { name: `pincio-${name}` });
    if (mesh) { ctx.scene.add(mesh); meshes[name] = mesh; }
    return site;
  };

  // Keep trees and props off the plazas and landmark sites.
  if (A.napoleone.footprint) ctx.reserve({ ring: A.napoleone.footprint });
  const belvedere = MAP.BUILDINGS.find((b) => pointInRing(A.terrazza.x + 1, A.terrazza.z, b.r));
  if (belvedere) ctx.reserve({ ring: belvedere.r });
  ctx.reserve({ x: A.mose.x, z: A.mose.z, r: 5.5 });
  const bucarest = MAP.PLAZAS.find((p) => pointInRing(A.obelisco.x, A.obelisco.z, p.r));
  ctx.reserve(bucarest ? { ring: bucarest.r } : { x: A.obelisco.x, z: A.obelisco.z, r: 8 });
  ctx.reserve({ x: A.valadier.x, z: A.valadier.z, r: 11 });

  const terrace = build('terrace', buildTerrace);
  const clock = build('clock', buildClock);
  ctx.reserve({ x: clock.x, z: clock.z, r: clock.radius + 2.5 });
  const moses = build('moses', buildMoses);
  build('obelisk', buildObelisk);
  build('valadier', buildValadier);
  const carlino = build('sancarlino', buildSanCarlino);
  ctx.reserve({ x: carlino.x + Math.sin(carlino.ry) * 2, z: carlino.z + Math.cos(carlino.ry) * 2, r: 6.5 });
  build('bridge', buildBridge);

  const busts = buildBusts(ctx);
  if (busts) ctx.scene.add(busts.group);

  plantTrees(ctx);

  const hands = createClockHands(ctx, clock);
  const puppets = createPuppets(ctx, carlino);

  return {
    meshes,
    sites: { terrace: terrace?.centre, clock, moses, sancarlino: carlino },
    bustCount: busts?.count || 0,
    update(dt, t) {
      hands.update(t);
      puppets.update(dt);
    },
  };
}

// Umbrella pines framing Piazzale Napoleone and palms by the Casina Valadier café.
function plantTrees(ctx) {
  const { MAP, terrain: T, colliders } = ctx;
  const A = MAP.ANCHORS;
  const ok = (x, z, clear, onPlaza = false) => {
    if (!T.isInside(x, z) || distToRingEdge(x, z, MAP.BOUNDARY) < 3) return false;
    const np = T.nearestPath(x, z);
    if (np && np.d < np.w / 2 + clear) return false;
    if (!onPlaza && MAP.PLAZAS.some((p) => pointInRing(x, z, p.r))) return false;
    return colliders.isFree(x, z, 2) && !ctx.plantQueue.some((p) => Math.hypot(p.x - x, p.z - z) < 8);
  };
  const rnd = ctx.rng('pincio-plants');
  if (A.napoleone.footprint) {
    let n = 0;
    const ring = [...A.napoleone.footprint, A.napoleone.footprint[0]];
    for (const d of [6, -6, 10, -10]) {
      for (const s of samplePolyline(offsetPolyline(ring, d), 9, 3)) {
        if (n >= 8 || ctx.isReserved(s.x, s.z, 1) || !ok(s.x, s.z, 1.2)) continue;
        ctx.plant('umbrellaPine', s.x, s.z, { scale: 1 + rnd() * 0.25, ry: rnd() * 6.28 });
        n++;
      }
    }
  }
  const v = A.valadier;
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  for (const [u, w] of [[-(v.len / 2 + 3), -(v.wid / 2 + 3)], [v.len / 2 + 2, -(v.wid / 2 + 3)], [-(v.len / 2 + 3.5), v.wid / 2 + 2.5], [v.len / 2 + 2, v.wid / 2 + 3], [-2, -(v.wid / 2 + 4)]]) {
    const x = v.x + u * c - w * s, z = v.z + u * s + w * c;
    if (ok(x, z, 0.8, true)) ctx.plant('palm', x, z, { scale: 1 + rnd() * 0.2, ry: rnd() * 6.28 });
  }
}
