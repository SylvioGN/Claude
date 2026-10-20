// Where every plant in the park goes. Deterministic (ctx.rng), and never on paths, plazas,
// water, buildings, walls, landmark sites, areas other modules reserved, the souvenir-photo lines
// of the tour stops or the sites that props furnishes later (playgrounds, cafés, rentals).
//
// Order: landmark requests (ctx.plantQueue), OpenStreetMap trees (the monumental cedar and holm
// oak, the pines around Piazza di Siena, the Valle dei Platani), avenue rows, lawn specimens,
// garden hedge balls and flower beds, the woods, scattered trees on open grass, shrubs, then
// sparse trees in the fenced zoo and Villa Medici gardens behind the park edge.
import { Colliders } from '../../core/colliders.js';
import { SURF } from '../../core/terrain.js';
import { fbm2 } from '../../core/rng.js';
import { segDist2 } from '../../core/geo.js';
import { SPECIES } from './models.js';

const ALIASES = { pine: 'umbrellaPine', stonePine: 'umbrellaPine', oak: 'holmOak', ilex: 'holmOak', plane: 'plane', platanus: 'plane', bush: 'shrub', hedge: 'hedgeBall', box: 'hedgeBall', flower: 'flowers', flowerBed: 'flowers' };
const BAD = new Set([SURF.PATH, SURF.PLAZA, SURF.WATER, SURF.OUTSIDE, SURF.SAND]);
const FLOWER_COLOURS = ['#e8384f', '#f6c945', '#f27ab8', '#fbf6ee', '#9566d6', '#f39237', '#e04a8a'];

// Avenue rows: species by avenue name. Unlisted named avenues get a species picked from the name.
const VIALE_SPECIES = [
  [/Magnolie/, 'magnolia'],
  [/Ippocastani/, 'plane'],
  [/Pineta|Pietro Canonica|Canestre|Siena|Paolo del Brasile/, 'umbrellaPine'],
  [/Lago|Esculapio|Fiorello|Aranciera|Madama Letizia|Valle Giulia|Giardino Zoologico/, 'plane'],
  [/Obelisco|Valadier|Belvedere|Mickievicz|Bambini|Villa Medici|Aganoor|Orologio|Museo Borghese|Cavalli Marini/, 'holmOak'],
];

// Tiny grid hash of placed plants and their personal space.
class Spacing {
  constructor(cell = 8) { this.cell = cell; this.map = new Map(); this.maxR = 0; }
  add(x, z, r) {
    const k = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
    if (!this.map.has(k)) this.map.set(k, []);
    this.map.get(k).push(x, z, r);
    if (r > this.maxR) this.maxR = r;
  }
  free(x, z, r) {
    const R = r + this.maxR, c = this.cell;
    for (let j = Math.floor((z - R) / c); j <= Math.floor((z + R) / c); j++) {
      for (let i = Math.floor((x - R) / c); i <= Math.floor((x + R) / c); i++) {
        const a = this.map.get(`${i},${j}`);
        if (!a) continue;
        for (let k = 0; k < a.length; k += 3) {
          const m = r + a[k + 2], dx = x - a[k], dz = z - a[k + 1];
          if (dx * dx + dz * dz < m * m) return false;
        }
      }
    }
    return true;
  }
}

export function planPlants(ctx) {
  const { MAP, terrain: T, geo } = ctx;
  const density = ctx.quality.treeDensity ?? 1;
  const sq = Math.sqrt(density);
  const items = [];
  const spacing = new Spacing(8);

  // --- keep-out shapes of our own, so trees stay clear even when the module that owns a place
  // is not loaded: buildings, walls, landmark footprints and sites, the start line.
  const keep = new Colliders(T.extent);
  const zones = [];
  const addZone = (ring, pad) => zones.push({ ring, pad, bb: geo.ringBBox(ring) });
  for (const b of MAP.BUILDINGS) addZone(b.r, 1.8);
  for (const w of MAP.WALLS) keep.addPolyline(w.p, false, 'wall', null, 0.6);
  for (const [id, a] of Object.entries(MAP.ANCHORS)) {
    if (a.footprint) addZone(a.footprint, id === 'siena' ? 3 : 2.2);
    else if (id !== 'lago') keep.addCircle(a.x, a.z, id === 'zoo_gate' ? 14 : id === 'terrazza' ? 9 : 6);
  }
  const start = ctx.game?.start;
  if (start) keep.addCircle(start.x, start.z, 8);
  // sites props furnishes later: a playground needs room for its rides, a café for its tables
  for (const p of MAP.POIS) {
    if (p.k === 'playground') keep.addCircle(p.x, p.z, 12);
    else if (p.k === 'cafe' || p.k === 'rental') keep.addCircle(p.x, p.z, 5);
  }
  const inZone = (x, z) => zones.some((zn) => x > zn.bb.minX - zn.pad && x < zn.bb.maxX + zn.pad && z > zn.bb.minZ - zn.pad && z < zn.bb.maxZ + zn.pad
    && (geo.pointInRing(x, z, zn.ring) || geo.distToRingEdge(x, z, zn.ring) < zn.pad));

  // Souvenir photos: the stretch from each stop's photo spot (where the cart parks) to the
  // landmark stays clear; with an authored view, so do the triangle from its camera to the spot and
  // the landmark, and a fan in front of the camera (the near foreground of the frame).
  const photo = [];
  const addPhotoRing = (ring, pad) => photo.push({ ring, bb: geo.ringBBox(ring), pad });
  for (const st of ctx.game?.stops || []) {
    const sx = st.spotX ?? st.x, sz = st.spotZ ?? st.z;
    photo.push({ ring: null, ax: sx, az: sz, bx: st.x, bz: st.z, pad: 2.5 });
    const cam = st.view?.cam, look = st.view?.look;
    if (!cam) continue;
    const [cx, cz] = [cam[0], cam[2]];
    addPhotoRing([[cx, cz], [sx, sz], [st.x, st.z]], 3);
    const a0 = Math.atan2((look ? look[2] : sz) - cz, (look ? look[0] : sx) - cx);
    const reach = 0.75 * Math.hypot(sx - cx, sz - cz);
    const fan = [[cx, cz]];
    for (let k = -2; k <= 2; k++) fan.push([cx + Math.cos(a0 + k * 0.4) * reach, cz + Math.sin(a0 + k * 0.4) * reach]);
    addPhotoRing(fan, 1);
  }
  const inPhoto = (x, z, clear) => photo.some((ph) => {
    const pad = ph.pad + clear;
    if (!ph.ring) return segDist2(x, z, ph.ax, ph.az, ph.bx, ph.bz) < pad * pad;
    return x > ph.bb.minX - pad && x < ph.bb.maxX + pad && z > ph.bb.minZ - pad && z < ph.bb.maxZ + pad
      && (geo.pointInRing(x, z, ph.ring) || geo.distToRingEdge(x, z, ph.ring) < pad);
  });

  // A trunk of radius r that a landmark or the map put on (or right next to) a path is moved
  // sideways off it; null when that takes more than 3 units.
  function offPath(x, z, r) {
    const x0 = x, z0 = z;
    for (let k = 0; k < 4; k++) {
      const p = T.nearestPath(x, z);
      const need = p ? p.w / 2 + r + 0.3 : 0;
      if (!p || p.d >= need) return Math.hypot(x - x0, z - z0) <= 3 ? [x, z] : null;
      let nx = x - p.x, nz = z - p.z;
      const L = Math.hypot(nx, nz);
      if (L > 1e-3) { nx /= L; nz /= L; } else { nx = -p.dirZ; nz = p.dirX; }
      x = p.x + nx * (need + 0.05); z = p.z + nz * (need + 0.05);
    }
    return null;
  }

  const lawns = MAP.LAWNS.map((l) => ({ ...l, bb: geo.ringBBox(l.r), area: geo.ringArea(l.r) }));
  const lawnAt = (x, z) => lawns.find((l) => x > l.bb.minX && x < l.bb.maxX && z > l.bb.minZ && z < l.bb.maxZ && geo.pointInRing(x, z, l.r));

  // Can a plant with trunk clearance `clear` stand at (x, z) inside the park?
  function siteOk(x, z, clear, pathClear = 1.5) {
    if (BAD.has(T.surfaceAt(x, z))) return false;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.047;
      if (BAD.has(T.surfaceAt(x + Math.cos(a) * clear, z + Math.sin(a) * clear))) return false;
    }
    const p = T.nearestPath(x, z);
    if (p && p.d < p.w / 2 + pathClear) return false;
    return outsideOk(x, z, clear);
  }
  // The checks that also apply behind the park edge.
  function outsideOk(x, z, clear) {
    if (ctx.isReserved(x, z, clear) || inPhoto(x, z, clear)) return false;
    if (!ctx.colliders.isFree(x, z, clear) || !keep.isFree(x, z, clear)) return false;
    return !inZone(x, z);
  }

  function tintFor(kind, rnd) {
    if (kind === 'flowers') return FLOWER_COLOURS[Math.floor(rnd() * FLOWER_COLOURS.length)];
    const b = 0.88 + rnd() * 0.22;
    let h = rnd() * 2 - 1;
    if (kind === 'plane' && rnd() < 0.3) h = 1.5 + rnd() * 1.8; // first yellow leaves of October
    return [b * (1 + 0.07 * h), b, b * (1 - 0.08 * h)];
  }

  // Adds a plant; returns false when it would crowd another one (unless forced). room scales
  // its personal space (woods grow closer together than specimen trees).
  function put(kind, x, z, rnd, { s = 1, ry = rnd() * Math.PI * 2, v = Math.floor(rnd() * SPECIES[kind].variants), force = false, tint = null, src = '', room = 1, sy = null } = {}) {
    const sp = SPECIES[kind];
    const r = sp.space * s * room;
    if (!force && !spacing.free(x, z, r)) return false;
    spacing.add(x, z, r);
    if (sy === null) sy = s > 1.4 ? s * 0.8 : s * (0.92 + rnd() * 0.16); // big old trees spread more than they grow
    items.push({ kind, v: v % sp.variants, x, z, s, sx: 0.9 + rnd() * 0.2, sz: 0.9 + rnd() * 0.2, sy, ry, tint: tint || tintFor(kind, rnd), src });
    return true;
  }

  // Woods: groves of umbrella pines among holm oak stands, a few planes, cedars and cypresses.
  function woodSpecies(x, z, rnd) {
    let pine = 0.42 + fbm2(x / 95 + 3.1, z / 95 - 7.7, 2) * 1.1;
    pine += 0.3 * Math.exp(-((x - 95) ** 2 + (z + 20) ** 2) / (2 * 130 ** 2)); // the pine woods around Piazza di Siena
    if (x < -170 && z > 20) pine -= 0.3;                                       // Pincio: holm oaks
    if (x > 220) pine -= 0.2;                                                  // Parco dei Daini
    pine = Math.min(0.9, Math.max(0.12, pine));
    const u = rnd();
    if (u < 0.06) return 'plane';
    if (u < 0.1) return 'cedar';
    if (u < 0.115) return 'cypress';
    return rnd() < pine ? 'umbrellaPine' : 'holmOak';
  }

  const specimen = (x, z, rnd) => {
    const pincio = x < -170 && z > 20;
    const u = rnd();
    if (pincio && u < 0.16) return 'palm';
    if (u < 0.36) return 'umbrellaPine';
    if (u < 0.6) return 'cedar';
    if (u < 0.72) return 'plane';
    if (u < 0.84) return 'holmOak';
    if (u < 0.93) return 'magnolia';
    return 'cypress';
  };

  // 1. requests from landmark modules: planted where asked, just nudged off a path
  {
    const rnd = ctx.rng('veg-queue');
    for (const q of ctx.plantQueue) {
      const kind = SPECIES[q.kind] ? q.kind : ALIASES[q.kind] || 'shrub';
      const s = q.scale ?? 1;
      const at = offPath(q.x, q.z, SPECIES[kind].trunk * s);
      if (!at) continue;
      put(kind, at[0], at[1], rnd, { s, ry: q.ry ?? rnd() * Math.PI * 2, v: q.variant ?? Math.floor(rnd() * 8), force: true, tint: q.tint, src: 'queue' });
    }
  }

  // 2. trees mapped one by one in OpenStreetMap (kept off the paths and the photo lines)
  {
    const rnd = ctx.rng('veg-poi');
    const siena = MAP.ANCHORS.siena;
    for (const p of MAP.POIS) {
      if (p.k !== 'tree') continue;
      if (!spacing.free(p.x, p.z, 2.5)) continue; // already planted by a landmark
      let kind = 'umbrellaPine', o = { s: 1 + rnd() * 0.2, src: 'poi' };
      if (p.n === 'Cedro monumentale') { kind = 'cedar'; o = { s: 1.35, sy: 1.5, v: 1, src: 'monument' }; }
      else if (p.n === 'Leccio monumentale') { kind = 'holmOak'; o = { s: 1.9, sy: 1.45, v: 0, src: 'monument' }; }
      else if (p.x > 115 && p.x < 185 && p.z > -190 && p.z < -115) { kind = 'plane'; o = { s: 1.35 + rnd() * 0.2, src: 'poi' }; }
      else if (siena && Math.hypot(p.x - siena.x, p.z - siena.z) < 75) o = { s: 1.12 + rnd() * 0.15, v: rnd() < 0.5 ? 0 : 2, src: 'poi' };
      const r = SPECIES[kind].trunk * o.s;
      const at = offPath(p.x, p.z, r);
      if (!at || !ctx.colliders.isFree(at[0], at[1], r + 0.3) || inPhoto(at[0], at[1], r)) continue;
      if (o.src === 'poi' && ctx.isReserved(at[0], at[1], r)) continue;
      put(kind, at[0], at[1], rnd, { ...o, force: true });
    }
  }

  // 3. rows along the avenues, both sides, set back from the gravel
  {
    const rnd = ctx.rng('veg-rows');
    const nameHash = (n) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    for (const path of MAP.PATHS) {
      if (path.k !== 'viale') continue;
      let kind = null;
      if (path.n) {
        kind = VIALE_SPECIES.find(([re]) => re.test(path.n))?.[1];
        if (!kind) kind = ['holmOak', 'plane', 'umbrellaPine', 'holmOak'][nameHash(path.n) % 4];
      }
      const step = 11 / sq;
      const off = path.w / 2 + 2.6;
      for (const p of geo.samplePolyline(path.p, step, step * 0.5)) {
        for (const side of [-1, 1]) {
          if (!path.n && rnd() < 0.35) continue;
          const x = p.x - p.dirZ * off * side, z = p.z + p.dirX * off * side;
          const k = kind || woodSpecies(x, z, rnd);
          if (!siteOk(x, z, 1.2)) continue;
          put(k, x, z, rnd, { s: 0.95 + rnd() * 0.15, src: 'row' });
        }
      }
    }
    // the two mapped rows of planes along a street outside the park
    for (const row of MAP.TREE_ROWS) {
      for (const p of geo.samplePolyline(row.p, 10, 3)) {
        if (outsideOk(p.x, p.z, 1)) put('plane', p.x, p.z, rnd, { s: 0.95 + rnd() * 0.15, src: 'row' });
      }
    }
  }

  // 4. lawns and gardens: specimen trees, clipped balls along garden edges, flower beds
  {
    const rnd = ctx.rng('veg-lawns');
    for (const l of lawns) {
      if (l.k === 'flowers') {
        const palette = [0, 1, 2].map(() => FLOWER_COLOURS[Math.floor(rnd() * FLOWER_COLOURS.length)]);
        for (let z = l.bb.minZ + 0.4; z < l.bb.maxZ; z += 0.8) {
          for (let x = l.bb.minX + 0.4; x < l.bb.maxX; x += 0.8) {
            const px = x + (rnd() - 0.5) * 0.25, pz = z + (rnd() - 0.5) * 0.25;
            if (!geo.pointInRing(px, pz, l.r)) continue;
            const e = geo.distToRingEdge(px, pz, l.r);
            // mapped beds win over overlapping footways, reserved squares and the start line
            if (e < 0.35 || !ctx.colliders.isFree(px, pz, 0.2)) continue;
            put('flowers', px, pz, rnd, { s: 0.9 + rnd() * 0.3, tint: palette[Math.floor(e / 0.9) % 3], src: 'bed' });
          }
        }
        continue;
      }
      if (l.k === 'garden') {
        // the Galleria's secret gardens hold potted bitter oranges (Giardino dei Melangoli)
        const oranges = geo.ringCentroid(l.r)[0] > 250;
        let k = 0;
        for (const p of geo.samplePolyline([...l.r, l.r[0]], 3.6, 1)) {
          for (const side of [-1, 1]) {
            const x = p.x - p.dirZ * 1.5 * side, z = p.z + p.dirX * 1.5 * side;
            if (!geo.pointInRing(x, z, l.r) || !siteOk(x, z, 0.8, 0.9)) continue;
            if (oranges && k++ % 2 === 0) put('orange', x, z, rnd, { s: 0.95 + rnd() * 0.15, src: 'garden' });
            else put('hedgeBall', x, z, rnd, { s: 0.85 + rnd() * 0.25, src: 'garden' });
          }
        }
        const nBeds = Math.round(l.area / 260);
        for (let i = 0; i < nBeds; i++) {
          const c = geo.randomPointInRing(l.r, rnd);
          if (!c || !siteOk(c[0], c[1], 2.2, 1)) continue;
          const col = FLOWER_COLOURS[Math.floor(rnd() * FLOWER_COLOURS.length)];
          for (let k = 0; k < 14; k++) {
            const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 1.8;
            const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d;
            if (siteOk(x, z, 0.3, 0.6)) put('flowers', x, z, rnd, { s: 0.9 + rnd() * 0.3, tint: col, src: 'garden' });
          }
        }
      }
      const n = Math.round((l.area / (l.k === 'garden' ? 300 : 260)) * density);
      for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
        const c = geo.randomPointInRing(l.r, rnd);
        if (!c || !siteOk(c[0], c[1], 1.4)) continue;
        let kind = specimen(c[0], c[1], rnd);
        if (l.k === 'garden' && rnd() < 0.45) kind = rnd() < 0.5 ? 'magnolia' : 'cypress';
        if (put(kind, c[0], c[1], rnd, { s: 0.9 + rnd() * 0.35, src: 'lawn' })) {
          i++;
          if (kind === 'cypress') { // cypresses come in small groups
            for (let k = 0; k < 2; k++) {
              const a = rnd() * Math.PI * 2, x = c[0] + Math.cos(a) * 3.4, z = c[1] + Math.sin(a) * 3.4;
              if (siteOk(x, z, 1)) put('cypress', x, z, rnd, { s: 0.85 + rnd() * 0.3, src: 'lawn' });
            }
          }
        }
      }
    }
  }

  // 5. the woods: random darts kept apart by personal space, thick in stands, open in glades;
  // the umbrella pines grow taller than the holm oaks around them
  const B = MAP.BOUNDS;
  {
    const rnd = ctx.rng('veg-woods');
    const cell = 6 / sq;
    for (let z = B.minZ; z < B.maxZ; z += cell) {
      for (let x = B.minX; x < B.maxX; x += cell) {
        const px = x + rnd() * cell, pz = z + rnd() * cell;
        const u = rnd();
        if (T.surfaceAt(px, pz) !== SURF.FOREST || lawnAt(px, pz)) continue;
        const stand = fbm2(px / 60 - 2.3, pz / 60 + 8.1, 2);
        if (u > 0.5 + stand * 1.1) continue;
        const kind = woodSpecies(px, pz, rnd);
        if (!siteOk(px, pz, 1.4)) continue;
        const s = kind === 'umbrellaPine' ? 1 + rnd() * 0.4 : 0.8 + rnd() * 0.4;
        put(kind, px, pz, rnd, { s, src: 'wood', room: 0.72 });
      }
    }
  }

  // 6. scattered trees on the open grass
  {
    const rnd = ctx.rng('veg-open');
    const cell = 24 / sq;
    for (let z = B.minZ; z < B.maxZ; z += cell) {
      for (let x = B.minX; x < B.maxX; x += cell) {
        const px = x + rnd() * cell, pz = z + rnd() * cell;
        if (rnd() < 0.35 || T.surfaceAt(px, pz) !== SURF.GRASS || lawnAt(px, pz)) continue;
        const kind = specimen(px, pz, rnd);
        if (siteOk(px, pz, 1.4)) put(kind, px, pz, rnd, { s: 0.9 + rnd() * 0.35, src: 'open' });
      }
    }
  }

  // 7. shrubs: patchy understory along wood edges and paths
  {
    const rnd = ctx.rng('veg-shrubs');
    const cell = 9 / sq;
    for (let z = B.minZ; z < B.maxZ; z += cell) {
      for (let x = B.minX; x < B.maxX; x += cell) {
        const px = x + rnd() * cell, pz = z + rnd() * cell;
        const patch = fbm2(px / 40 + 5.5, pz / 40 - 1.9, 2);
        if (patch < 0.12 || rnd() < 0.35) continue;
        const p = T.nearestPath(px, pz);
        if (!p || p.d > p.w / 2 + 7) continue; // shrubs line the paths
        if (!siteOk(px, pz, 1, 1.4)) continue;
        put('shrub', px, pz, rnd, { s: 0.8 + rnd() * 0.5, src: 'shrub' });
      }
    }
  }

  // 8. behind the fences: the zoo's trees and the umbrella pines of the Villa Medici gardens,
  // unless the module that owns the place planted its own
  {
    const rnd = ctx.rng('veg-backdrop');
    for (const n of MAP.NOGO) {
      if (n.k === 'galoppatoio' || ctx.plantQueue.some((q) => geo.pointInRing(q.x, q.z, n.r))) continue;
      const bb = geo.ringBBox(n.r);
      const cell = (n.k === 'zoo' ? 19 : 15) / sq;
      for (let z = bb.minZ; z < bb.maxZ; z += cell) {
        for (let x = bb.minX; x < bb.maxX; x += cell) {
          const px = x + rnd() * cell, pz = z + rnd() * cell;
          if (!geo.pointInRing(px, pz, n.r) || geo.distToRingEdge(px, pz, n.r) < 3.5 || !outsideOk(px, pz, 1.6)) continue;
          const u = rnd();
          const kind = n.k === 'zoo'
            ? (u < 0.4 ? 'holmOak' : u < 0.75 ? 'umbrellaPine' : 'plane')
            : (u < 0.6 ? 'umbrellaPine' : u < 0.8 ? 'cypress' : 'holmOak');
          put(kind, px, pz, rnd, { s: 0.9 + rnd() * 0.3, src: 'backdrop' });
        }
      }
    }
  }

  return items;
}

// Lines up every model near (x0, z0) for screenshots (?vegdemo=x,z).
export function demoPlants(x0, z0) {
  const out = [];
  let x = x0;
  for (const [kind, sp] of Object.entries(SPECIES)) {
    for (let v = 0; v < sp.variants; v++) {
      const w = Math.max(1.2, sp.canopy);
      x += w;
      out.push({ kind, v, x, z: z0, s: 1, sy: 1, ry: 0, tint: kind === 'flowers' ? '#e8384f' : [1, 1, 1], src: 'demo' });
      x += w + 1;
    }
  }
  return out;
}
