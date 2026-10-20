// The heart of the park around Piazza di Siena: the arena with its ring of pines, the Fortezzuola
// (Museo Pietro Canonica), the Globe Theatre, the Casina dell'Orologio, the fake-ruin Temple of
// Antoninus and Faustina, the Casina di Raffaello with its playground and the little Temple of Diana.
// Each landmark is one merged mesh (plus a flat ground mesh and a few small moving parts).
import { buildSiena } from './landmarksCenter/siena.js';
import { buildFortezzuola, buildOrologio, buildGlobe } from './landmarksCenter/buildings.js';
import { buildFaustina, buildDiana } from './landmarksCenter/temples.js';
import { buildRaffaello } from './landmarksCenter/raffaello.js';

const BUILDERS = { siena: buildSiena, fortezzuola: buildFortezzuola, globe: buildGlobe, orologio: buildOrologio, faustina: buildFaustina, raffaello: buildRaffaello, diana: buildDiana };

export async function create(ctx) {
  const parts = {};
  for (const [name, build] of Object.entries(BUILDERS)) {
    try {
      parts[name] = build(ctx);
      ctx.scene.add(parts[name].group);
    } catch (err) {
      console.error(`[landmarksCenter] ${name} failed`, err);
    }
  }
  const live = Object.values(parts).filter((p) => p.update);
  return {
    parts,
    update(dt, t) { for (const p of live) p.update(dt, t); },
  };
}
