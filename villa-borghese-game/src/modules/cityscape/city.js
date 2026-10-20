// Ordinary buildings: the houses and casinos inside the park (MAP.BUILDINGS) and the real city
// blocks around it (OpenStreetMap footprints in osmCity.js), styled by district.
import { BLDG } from './osmCity.js';
import { addBuilding, addDome } from './buildings.js';
import { cleanRing, signedArea } from './builder.js';
import { FLOOR } from './atlas.js';
import { POPOLO_ZONES } from './popolo.js';
import { pointInRing } from './builder.js';

export function decode(arr, k, off = 0) {
  const pts = [];
  let x = 0, z = 0;
  for (let i = off; i < arr.length; i += 2) { x += arr[i]; z += arr[i + 1]; pts.push([x / k, z / k]); }
  return pts;
}
export function centroid(r) {
  let x = 0, z = 0;
  for (const p of r) { x += p[0]; z += p[1]; }
  return [x / r.length, z / r.length];
}

const ROOFS = ['#b5532f', '#a94b2c', '#bd5f38', '#9e4a2f', '#b8653f', '#c06a43'];
const VILLA_WALLS = ['#e3b365', '#efdfbf', '#e8bba3', '#d38f58', '#ead08b', '#f0e8d6', '#dca46b'];

// District look: wall colours, facade styles, storeys, share of flat roof terraces.
const DISTRICTS = {
  centro: { walls: ['#d99f55', '#c9774a', '#b9603f', '#e3b25f', '#dd9a76', '#e8b8a2', '#d4844a', '#e6c48e'], facades: ['palazzo', 'palazzo', 'pediment', 'balcony', 'tapparelle'], floors: [4, 6], terrace: 0.35 },
  flaminio: { walls: ['#e3b25f', '#efe0c0', '#d99f55', '#ebcf8a', '#e6c48e', '#c9774a'], facades: ['tapparelle', 'palazzo', 'balcony', 'modern'], floors: [5, 7], terrace: 0.3 },
  ludovisi: { walls: ['#efe0c0', '#f1ead8', '#ebcf8a', '#e3b25f', '#ddd3bd', '#e8b8a2', '#d99f55'], facades: ['pediment', 'balcony', 'palazzo', 'balcony'], floors: [5, 7], terrace: 0.25 },
  pinciano: { walls: ['#ebcf8a', '#efe0c0', '#e3b25f', '#dd9a76', '#e6c48e', '#d99f55'], facades: ['tapparelle', 'balcony', 'palazzo', 'modern'], floors: [5, 7], terrace: 0.3 },
  parioli: { walls: ['#efe0c0', '#f1ead8', '#ebcf8a', '#e6c48e', '#e8b8a2', '#ddd3bd'], facades: ['modern', 'tapparelle', 'modern', 'balcony'], floors: [4, 6], terrace: 0.45 },
};
function district(x, z) {
  if (x < -250 && z > 150) return 'centro';
  if (x < -330) return 'flaminio';
  if (z > 190 && x > -250) return 'ludovisi';
  if (z < -200 && x > -400) return 'parioli';
  if (x > 250) return 'pinciano';
  return z < 0 ? 'parioli' : 'ludovisi';
}

// Buildings inside the park: villas, casinos, academies and kiosks.
export function buildParkBuildings(ctx, chunks, skip) {
  const { MAP, terrain: T, colliders, rng } = ctx;
  let built = 0;
  MAP.BUILDINGS.forEach((b, idx) => {
    const ring = cleanRing(b.r);
    if (ring.length < 3 || Math.abs(signedArea(ring)) < 6) return;
    const [cx, cz] = centroid(ring);
    if (skip(cx, cz, ring)) return;
    const rnd = rng(`cityscape:park:${idx}:${b.n}`);
    const floors = Math.max(1, Math.round(b.h / FLOOR));
    const name = b.n || '';
    let facade = 'villa', wall = rnd.pick(VILLA_WALLS), roofType = 'hip';
    if (/Accademia|Istituto|Neerlandese/.test(name)) { facade = rnd.chance(0.5) ? 'classic' : 'brickHouse'; wall = rnd.pick(['#efe3cb', '#e7c9a0', '#d9a77a']); }
    if (/Villa Lubin|Villa Giulia/.test(name)) { facade = 'classic'; wall = '#efe6d2'; }
    if (/Cisternone/.test(name)) { facade = 'brickHouse'; wall = '#d28a5c'; }
    if (b.h < 3.5) roofType = rnd.chance(0.5) ? 'hip' : 'flat';
    addBuilding(chunks.at(cx, cz), {
      ring, floors, floorH: b.h / floors, facade, wall, roof: rnd.pick(ROOFS), roofType,
      heightAt: T.heightAt, rnd, sink: 0.5, hipDepth: 2.2,
    });
    colliders.addRing(ring, 'building', { name: name || 'building' });
    ctx.reserve({ ring });
    built++;
  });
  return built;
}

// The city around the park, from OpenStreetMap footprints.
export function buildCity(ctx, chunks, { specials, rings }) {
  const { terrain: T, colliders, rng } = ctx;
  const outside = T.outsideDistance || (() => 99);
  const plants = ctx.quality.tier !== 'low';
  let built = 0;
  BLDG.forEach((b, idx) => {
    const levels = b[0], kind = b[1];
    let ring = cleanRing(decode(b, 4, 2));
    if (ring.length < 3) return;
    const area = Math.abs(signedArea(ring));
    if (area < 8) return;
    const [cx, cz] = centroid(ring);
    if (kind === 6 || kind === 7) { specials.push({ kind, ring, cx, cz }); return; }
    if (POPOLO_ZONES.some((z) => pointInRing(cx, cz, z))) return;
    const rnd = rng(`cityscape:city:${idx}`);
    const d = DISTRICTS[district(cx, cz)];
    let floors = levels || rnd.int(d.floors[0], d.floors[1]);
    if (!levels && area < 70) floors = Math.min(floors, rnd.int(2, 4));
    if (kind === 3) floors = 1;
    let facade = rnd.pick(d.facades), wall = rnd.pick(d.walls);
    let roofType = rnd.chance(d.terrace) ? 'terrace' : 'hip';
    if (kind === 1) { facade = 'classic'; wall = rnd.pick(['#efe6d4', '#e9d9b8', '#e3c9a0']); roofType = 'hip'; floors = Math.max(floors, 5); }
    if (kind === 5) { facade = 'classic'; wall = rnd.pick(['#efe6d4', '#e6dcc6', '#ead2a8']); }
    if (kind === 2) { facade = rnd.pick(['pediment', 'balcony']); wall = rnd.pick(['#efe0c0', '#f1ead8', '#ebcf8a']); floors = Math.max(floors, 6); }
    if (facade === 'modern' && rnd.chance(0.6)) roofType = 'terrace';
    const res = addBuilding(chunks.at(cx, cz), {
      ring, floors, floorH: FLOOR, facade, wall, roof: rnd.pick(ROOFS), roofType,
      heightAt: T.heightAt, rnd: plants ? rnd : null, sink: 0.8,
    });
    if (res && kind === 1 && area > 140) addDome(chunks.at(cx, cz), cx, res.roofY + 1.2, cz, Math.min(5.5, Math.sqrt(area) * 0.28));
    // only the buildings the cart can actually reach need colliders
    if (ring.some(([x, z]) => outside(x, z) < 6)) colliders.addRing(ring, 'building', { name: 'building' });
    rings.push(ring);
    built++;
  });
  return built;
}
