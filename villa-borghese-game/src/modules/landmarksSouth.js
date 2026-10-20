// South of the park: Cinema dei Piccoli, Casa del Cinema with its open-air theatre, the Goethe
// monument, the Umberto I equestrian monument, Porta Pinciana in the Aurelian Walls and the
// Galoppatoio riding ground with its horses.
//
// Draw calls: one merged mesh per landmark, one textured mesh for every sign and poster, the
// arena sand, and three instanced meshes for the moving horses, their legs and the riders.
import { createAtlas, ATLAS_SIZE } from './landmarksSouth/atlas.js';
import { Decals } from './landmarksSouth/parts.js';
import { buildCinema } from './landmarksSouth/cinema.js';
import { buildCasa, buildTheatre } from './landmarksSouth/casa.js';
import { buildGoethe, buildUmberto } from './landmarksSouth/monuments.js';
import { buildPinciana } from './landmarksSouth/pinciana.js';
import { buildGaloppatoio } from './landmarksSouth/galoppatoio.js';

export async function create(ctx) {
  const { GeoBuilder, mats } = ctx.util;
  const scene = ctx.scene;
  const decals = new Decals(createAtlas(), ATLAS_SIZE, ATLAS_SIZE);

  // Each landmark is merged into its own mesh; one that fails to build is skipped, not the module.
  const landmark = (name, build) => {
    const gb = new GeoBuilder();
    try {
      const info = build(gb);
      const mesh = gb.build(mats().vcFlat, { name });
      if (mesh) scene.add(mesh);
      return info;
    } catch (err) {
      console.error(`[landmarksSouth] ${name} failed`, err);
      return null;
    }
  };

  const cinema = landmark('cinemaDeiPiccoli', (gb) => buildCinema(ctx, gb, decals));
  const casa = landmark('casaDelCinema', (gb) => ({ villa: buildCasa(ctx, gb, decals), theatre: buildTheatre(ctx, gb, decals) }));
  const goethe = landmark('goethe', (gb) => buildGoethe(ctx, gb));
  const umberto = landmark('umberto', (gb) => buildUmberto(ctx, gb));
  const pinciana = landmark('portaPinciana', (gb) => buildPinciana(ctx, gb));
  const galoppatoio = landmark('galoppatoio', (gb) => buildGaloppatoio(ctx, gb, decals));
  if (galoppatoio?.sand) scene.add(galoppatoio.sand);

  const signs = decals.build('southSigns');
  if (signs) scene.add(signs);

  return {
    cinema, casa, goethe, umberto, pinciana, galoppatoio,
    update(dt) { galoppatoio?.update(dt); },
  };
}
