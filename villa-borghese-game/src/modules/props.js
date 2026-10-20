// Park furniture that makes the avenues feel lived-in: benches, bins, nasoni (Rome's drinking
// fountains), marble and bronze statues, info boards, coin telescopes, café kiosks with gelato
// signs, bike and risciò rentals, toilets, playgrounds, small fountains, an obelisk (all from
// MAP.POIS) and Roman lamp posts along every viale. Nothing stands in a path's drivable width, in a
// flower bed, in an area a landmark module reserved or at the ends of the Pincio footbridge.
//
// Static props are merged per chunk into two layers (props/batch.js): 'near' for small things,
// hidden beyond ~115 units, and 'far' for lamps, statues and kiosks. Only the carousel and the
// running water (props/water.js) are separate meshes.
import { SURF } from '../core/terrain.js';
import { ChunkBatch } from './props/batch.js';
import * as M from './props/models.js';
import { createWaterFx } from './props/water.js';

// Known monuments: [model, material]. Others get a deterministic random pose in marble.
const MONUMENTS = {
  'General José Artigas': ['horse', 'bronze'],
  'Victor Hugo': ['thinker', 'marble'],
  'Aleksandr Sergeevič Puškin': ['cloak', 'bronze'],
  'Nikolai Gogol': ['cloak', 'bronze'],
  'Francisco de Paula Santander': ['wave', 'bronze'],
  'Inca Garcilaso de la Vega': ['book', 'bronze'],
  'Petar II Petrovic Njegos': ['scroll', 'bronze'],
  'Ferdowsi': ['seated', 'marble'],
  'Nizami Ganjavi': ['book', 'marble'],
  'Ahmed Shawky': ['orator', 'marble'],
  'Henryk Sienkiewicz': ['bust', 'bronze'],
  'Shota Rustaveli': ['bust', 'bronze'],
  "Monumento all'Alpino": ['cloak', 'bronze'],
  "Monumento all'Umile Eroe": ['stele', 'marble'],
};
// Footprint radius and how far from the path edge each statue model stands.
const STATUE_SIZE = { horse: [1.45, 1.6], seated: [0.85, 1.1], bust: [0.45, 0.7], stele: [0.75, 0.9], standing: [0.7, 1.0] };

// Room kept free around both ends of the Pincio footbridge: the cart turns sharply there.
const BRIDGE_CLEAR = 12;

// Landmarks given only as a point: room kept free for their own module.
const POINT_ROOM = {
  terrazza: 5, idrocronometro: 6, acquafelix: 2.5, zoo_gate: 8, boats: 5, leccio: 3, goethe: 5,
  obelisco: 3.5, peschiera: 3, mose: 4, cavallimarini: 5, canonica_entrance: 3,
};

const UMBRELLAS = [[M.C.red, M.C.white], [M.C.roofGreen, M.C.cream], [M.C.blue, M.C.white], [M.C.orange, M.C.cream]];
const BIKES = [M.C.red, M.C.blue, M.C.yellow, M.C.green, M.C.orange, M.C.pink];
const SURREYS = [M.C.red, M.C.blue, M.C.orange, M.C.green];

export async function create(ctx) {
  const t0 = performance.now();
  const { MAP, terrain: T, colliders: col, geo, quality: Q } = ctx;
  const rnd = ctx.rng('props');
  const H = (x, z) => T.heightAt(x, z);
  const near = new ChunkBatch('near', 80, Q.tier === 'low' ? 85 : Q.tier === 'med' ? 115 : 150);
  const far = new ChunkBatch('far', 80, Math.min(Q.drawDistance * 0.6, 220));
  const waterSpots = [];
  const placed = {};
  const record = (kind, x, z, ry) => (placed[kind] ||= []).push({ x, z, ry });
  const reservations = []; // handed to ctx.reserve at the end so props do not block each other

  // ------------------------------------------------------------ where things may stand

  const withBox = (ring) => ({ ring, bb: geo.ringBBox(ring) });
  const nearRing = (list, x, z, pad) => list.some(({ ring, bb }) => x > bb.minX - pad && x < bb.maxX + pad && z > bb.minZ - pad && z < bb.maxZ + pad
    && (geo.pointInRing(x, z, ring) || (pad > 0 && geo.distToRingEdge(x, z, ring) < pad)));
  const blockers = [
    ...Object.values(MAP.ANCHORS).filter((a) => a.footprint).map((a) => a.footprint),
    ...MAP.BUILDINGS.map((b) => b.r),
  ].map(withBox);
  const rooms = Object.entries(POINT_ROOM).filter(([k]) => MAP.ANCHORS[k]).map(([k, r]) => ({ x: MAP.ANCHORS[k].x, z: MAP.ANCHORS[k].z, r }));
  // flower beds: vegetation plants them without colliders
  const beds = MAP.LAWNS.filter((l) => l.k === 'flowers').map((l) => withBox(l.r));
  const bridgeEnds = MAP.PATHS.filter((p) => p.k === 'bridge').flatMap((p) => [p.p[0], p.p[p.p.length - 1]]);

  function onLandmark(x, z, pad, useRooms = true) {
    if (nearRing(blockers, x, z, pad)) return true;
    if (useRooms) for (const p of rooms) if (Math.hypot(x - p.x, z - p.z) < p.r + pad) return true;
    return false;
  }

  // Distance from (x, z) to the edge of the nearest path, negative inside it (reliable up to 2
  // units out). Unlike T.nearestPath, which only knows the nearest centre line, this also sees a
  // wide avenue next to a narrow footway.
  const SEG_CELL = 16, segGrid = new Map();
  for (const sg of T.segments) {
    const pad = sg.w / 2 + 2;
    const i0 = Math.floor((Math.min(sg.ax, sg.bx) - pad) / SEG_CELL), i1 = Math.floor((Math.max(sg.ax, sg.bx) + pad) / SEG_CELL);
    const j0 = Math.floor((Math.min(sg.az, sg.bz) - pad) / SEG_CELL), j1 = Math.floor((Math.max(sg.az, sg.bz) + pad) / SEG_CELL);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = `${i},${j}`;
        (segGrid.get(k) || segGrid.set(k, []).get(k)).push(sg);
      }
    }
  }
  function pathGap(x, z) {
    let gap = Infinity;
    for (const sg of segGrid.get(`${Math.floor(x / SEG_CELL)},${Math.floor(z / SEG_CELL)}`) || []) {
      gap = Math.min(gap, Math.sqrt(geo.segDist2(x, z, sg.ax, sg.az, sg.bx, sg.bz)) - sg.w / 2);
    }
    return gap;
  }

  const GROUND = new Set([SURF.GRASS, SURF.FOREST, SURF.PLAZA]);
  // gap: how far the point must stay from the edge of every path.
  function siteOk(x, z, r, { onPath = false, useRooms = true, gap = 0.2 } = {}) {
    const s = T.surfaceAt(x, z);
    if (!GROUND.has(s) && !(onPath && s === SURF.PATH)) return false;
    if (!onPath && pathGap(x, z) < gap) return false;
    if (bridgeEnds.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < BRIDGE_CLEAR + r)) return false;
    if (nearRing(beds, x, z, 0.5 + r * 0.5)) return false;
    if (ctx.isReserved(x, z, r) || onLandmark(x, z, r, useRooms)) return false;
    return col.isFree(x, z, r);
  }

  // Heading that turns a model's front (+z) towards (tx, tz).
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const toWorld = (o, lx, lz) => {
    const c = Math.cos(o.ry), s = Math.sin(o.ry);
    return [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
  };

  function facePlaza(x, z) {
    for (const p of MAP.PLAZAS) {
      if (geo.pointInRing(x, z, p.r)) {
        const [cx, cz] = geo.ringCentroid(p.r);
        if (Math.hypot(cx - x, cz - z) > 1) return faceTo(x, z, cx, cz);
      }
    }
    return rnd() * Math.PI * 2;
  }

  // Moves a point beside the nearest path so its centre sits `margin` beyond the edge, facing it.
  function besidePath(x, z, margin) {
    let np = T.nearestPath(x, z);
    if (!np) return { x, z, ry: rnd() * Math.PI * 2 };
    for (let i = 0; i < 3 && np; i++) {
      const need = np.w / 2 + margin;
      if (np.d >= need - 0.02) break;
      let nx, nz;
      if (np.d > 0.05) { nx = (x - np.x) / np.d; nz = (z - np.z) / np.d; } else {
        const s = rnd() < 0.5 ? 1 : -1;
        nx = -np.dirZ * s; nz = np.dirX * s;
      }
      x = np.x + nx * need; z = np.z + nz * need;
      np = T.nearestPath(x, z);
    }
    return { x, z, ry: np ? faceTo(x, z, np.x, np.z) : rnd() * Math.PI * 2 };
  }

  // Spot for a POI prop: plaza props stay put, the rest move beside the nearest path. When the
  // spot is taken, slide along the path a little.
  function spotFor(p, margin, r, opts = {}) {
    const np0 = T.nearestPath(p.x, p.z);
    const dx = np0 ? np0.dirX : 1, dz = np0 ? np0.dirZ : 0;
    for (const o of opts.along || [0, 2, -2, 4, -4]) {
      const x = p.x + dx * o, z = p.z + dz * o;
      const np = T.nearestPath(x, z);
      let s;
      if (T.surfaceAt(x, z) === SURF.PLAZA && (!np || np.d > np.w / 2 + margin)) {
        s = { x, z, ry: np && np.d < 10 ? faceTo(x, z, np.x, np.z) : facePlaza(x, z) };
      } else s = besidePath(x, z, margin);
      if (siteOk(s.x, s.z, r, { gap: margin - 0.05, ...opts })) return s;
    }
    return null;
  }

  // First spot on rings of growing radius around (x, z) that passes test(x, z).
  function searchNear(x, z, radii, test) {
    for (const d of radii) {
      const n = d === 0 ? 1 : Math.max(10, Math.ceil(d * 1.6));
      const a0 = rnd() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (test(px, pz)) return { x: px, z: pz };
      }
    }
    return null;
  }

  const add = (batch, tpl, x, z, ry) => batch.add(tpl, x, H(x, z), z, ry);
  const boxAt = (o, len, wid, tag) => col.addBox(o.x, o.z, len, wid, -o.ry, tag);

  // ------------------------------------------------------------ POIs

  const pois = (k) => MAP.POIS.filter((p) => p.k === k);

  // A w x d area near p, beside a path and facing it: tries rings of spots around p.
  function areaSpot(p, w, d, radii) {
    const probe = [[0, 0]];
    for (const fx of [-0.5, 0, 0.5]) for (const fz of [-0.5, 0, 0.5]) if (fx || fz) probe.push([fx * w, fz * d]);
    let o = null;
    searchNear(p.x, p.z, radii, (x, z) => {
      const s = besidePath(x, z, d / 2 + 0.8);
      if (!probe.every(([lx, lz]) => siteOk(...toWorld(s, lx, lz), 0.9))) return false;
      o = s;
      return true;
    });
    return o;
  }

  // playgrounds first: they need the most room. The Pincio one is a carousel and a bouncy castle;
  // the one at the Casina di Raffaello is landmarksCenter's.
  const carousels = [];
  const raffaello = MAP.ANCHORS.raffaello;
  for (const p of pois('playground')) {
    if (ctx.isReserved(p.x, p.z) || (raffaello && Math.hypot(p.x - raffaello.x, p.z - raffaello.z) < 25)) continue;
    const parts = /giostra/i.test(p.n || '')
      ? [['carousel', M.carouselBase(), 6.4, 6.4, [[0, 0, 3.2]]], ['castle', M.bouncyCastle(), 4.4, 4.8, [[0, -0.3, 2.3]]]]
      : [['playground', M.playground(), ...M.PLAYGROUND_SIZE, M.PLAYGROUND_SOLIDS]];
    for (const [kind, tpl, w, d, solids] of parts) {
      const o = areaSpot(p, w, d, [0, 3, 6, 9, 12, 15, 18]);
      if (!o) continue;
      add(far, tpl, o.x, o.z, o.ry);
      for (const [lx, lz, r] of solids) col.addCircle(...toWorld(o, lx, lz), r, 'playground');
      if (kind === 'carousel') {
        const mesh = M.carouselTop().build(ctx.util.mats().vcFlat, { name: 'props.carousel' });
        mesh.matrixAutoUpdate = true;
        mesh.position.set(o.x, H(o.x, o.z) + 0.29, o.z);
        ctx.scene.add(mesh);
        carousels.push(mesh);
      }
      reservations.push({ x: o.x, z: o.z, r: Math.hypot(w, d) / 2 });
      record(kind, o.x, o.z, o.ry);
    }
  }

  // cafés: a kiosk with tables and umbrellas, or just the terrace when the café is a real building
  const inBuilding = (x, z, pad) => onLandmark(x, z, pad, false);
  const TERRACE = [[-3.7, 0.5], [3.7, 0.5], [-3.5, -2.6], [3.5, -2.6], [-6.4, 0.2], [6.4, 0.2], [0, -4.2]];
  for (const p of pois('cafe')) {
    if ((placed.cafe || []).some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 12)) continue;
    const stripes = UMBRELLAS[Math.floor(rnd() * UMBRELLAS.length)];
    const umb = M.umbrella(...stripes);
    const terrace = (o, spots) => {
      let n = 0;
      for (const [lx, lz] of spots) {
        if (n === 3) break;
        const [x, z] = toWorld(o, lx, lz);
        if (!siteOk(x, z, 1.3, { gap: 0.75 })) continue;
        const ry = o.ry + rnd() * 1.2;
        add(near, M.cafeTable(), x, z, ry);
        add(far, umb, x, z, ry);
        col.addCircle(x, z, 0.75, 'table');
        n++;
      }
      return n;
    };
    if (inBuilding(p.x, p.z, 3)) {
      // terrace in front of the building, gelato sign by the path
      const s = searchNear(p.x, p.z, [3, 5, 7, 9, 11, 13], (x, z) => siteOk(x, z, 1.3, { gap: 0.75 }) && !inBuilding(x, z, 1.5));
      if (!s) continue;
      const np = T.nearestPath(s.x, s.z);
      const o = { x: s.x, z: s.z, ry: np ? faceTo(s.x, s.z, np.x, np.z) : 0 };
      if (terrace(o, [[0, 0], [-2.6, -0.4], [2.6, -0.4]]) === 0) continue;
      const g = searchNear(o.x, o.z, [2.2, 3.2], (x, z) => siteOk(x, z, 0.3));
      if (g) { add(far, M.gelatoSign(), g.x, g.z, o.ry); col.addCircle(g.x, g.z, 0.25, 'sign'); }
      record('cafe', o.x, o.z, o.ry);
      continue;
    }
    let o = null;
    for (const m of [2.6, 3.6, 5]) {
      o = spotFor(p, m, 1.9, { along: [0, 3, -3, 6, -6, 9, -9] });
      if (o) break;
    }
    if (!o) continue;
    add(far, M.cafeKiosk(stripes[0]), o.x, o.z, o.ry);
    boxAt(o, 3.2, 2.6, 'building');
    terrace(o, TERRACE);
    reservations.push({ x: o.x, z: o.z, r: 2 });
    record('cafe', o.x, o.z, o.ry);
  }

  // rentals: wooden hut, a row of bikes and two risciò surreys
  for (const p of pois('rental')) {
    if (/barche/i.test(p.n || '')) continue; // the rowing-boat rental belongs to the lake
    let o = null;
    for (const m of [2.2, 3.2, 4.5]) {
      o = spotFor(p, m, 1.7, { along: [0, 3, -3, 6, -6] });
      if (o) break;
    }
    if (!o) continue;
    add(far, M.rentalHut(), o.x, o.z, o.ry);
    boxAt(o, 2.9, 2.3, 'building');
    // risciò parked on one side of the hut, a row of bikes on the other (or behind it)
    const sides = rnd() < 0.5 ? [-1, 1] : [1, -1];
    let surreySide = 0;
    for (const sd of sides) {
      const spots = [2.8, 4.6].map((lx) => toWorld(o, sd * lx, 0.3));
      if (!spots.every(([x, z]) => siteOk(x, z, 0.75, { gap: 0.8 }))) continue;
      for (const [x, z] of spots) {
        add(far, M.surrey(SURREYS[Math.floor(rnd() * SURREYS.length)]), x, z, o.ry);
        col.addBox(x, z, 1.4, 2.2, -o.ry, 'surrey');
      }
      surreySide = sd;
      break;
    }
    const c0 = Math.floor(rnd() * BIKES.length);
    const bikeX = surreySide ? -surreySide * 2.2 : 2.2;
    for (const [bx0, bz0, turn] of [[bikeX, 0.2, 0], [-1.2, -2.0, Math.PI]]) {
      const dir = Math.sign(bx0);
      const bikes = [];
      for (let i = 0; i < 5; i++) bikes.push(toWorld(o, bx0 + dir * i * 0.6, bz0));
      if (!bikes.every(([x, z]) => siteOk(x, z, 0.35))) continue;
      bikes.forEach(([x, z], i) => add(near, M.bike(BIKES[(c0 + i) % BIKES.length]), x, z, o.ry + turn + (rnd() - 0.5) * 0.15));
      const [bx, bz] = toWorld(o, bx0 + dir * 1.2, bz0);
      col.addBox(bx, bz, 3.0, 1.2, -o.ry, 'bike');
      break;
    }
    record('rental', o.x, o.z, o.ry);
  }

  // toilets (skipped where the toilets are already a building of the cityscape)
  for (const p of pois('toilets')) {
    if (inBuilding(p.x, p.z, 3)) continue;
    let o = null;
    for (const m of [2.2, 3.2]) {
      o = spotFor(p, m, 1.9, { along: [0, 3, -3] });
      if (o) break;
    }
    if (!o) continue;
    add(far, M.toilets(), o.x, o.z, o.ry);
    boxAt(o, 3.4, 2.6, 'building');
    record('toilets', o.x, o.z, o.ry);
  }

  // statues, busts and memorials (not where a landmark module keeps the ground clear)
  const islands = MAP.WATER.flatMap((w) => w.h || []);
  for (const p of [...pois('statue'), ...pois('bust'), ...pois('memorial')]) {
    if (p.n === 'Esculapio' || islands.some((r) => geo.pointInRing(p.x, p.z, r))) continue; // landmarksLake's
    if (p.n === 'Leone del Pincio' || ctx.isReserved(p.x, p.z)) continue; // landmarksPincio's lion
    let [kind, mat] = MONUMENTS[p.n] || [];
    if (!kind) {
      if (p.k === 'bust') kind = 'bust';
      else if (p.k === 'memorial') kind = 'stele';
      else kind = rnd() < 0.15 ? 'seated' : M.STATUE_POSES[Math.floor(rnd() * M.STATUE_POSES.length)];
      mat = 'marble';
    }
    const [r, margin] = STATUE_SIZE[kind] || STATUE_SIZE.standing;
    const o = spotFor(p, margin, r);
    if (!o) continue;
    add(far, M.statue(kind, mat), o.x, o.z, o.ry);
    if (kind === 'horse') boxAt(o, 1.45, 2.8, 'statue');
    else col.addCircle(o.x, o.z, r, 'statue');
    record('statue', o.x, o.z, o.ry);
  }
  // the little obelisk on its stepped plinth
  for (const p of pois('obelisk')) {
    if (ctx.isReserved(p.x, p.z)) continue;
    const o = spotFor(p, 1.3, 1.0);
    if (!o) continue;
    add(far, M.obelisk(), o.x, o.z, o.ry);
    col.addCircle(o.x, o.z, 0.9, 'statue');
    record('obelisk', o.x, o.z, o.ry);
  }

  // small fountains (the ones without a basin in MAP.WATER)
  for (const p of pois('fountain')) {
    if (MAP.WATER.some((w) => geo.pointInRing(p.x, p.z, w.r) || geo.distToRingEdge(p.x, p.z, w.r) < 2.5)) continue;
    const o = spotFor(p, 1.3, 0.95);
    if (!o) continue;
    const y = H(o.x, o.z) + M.FOUNTAIN_JET[1];
    add(far, M.fountain(), o.x, o.z, o.ry);
    col.addCircle(o.x, o.z, 0.9, 'fountain');
    waterSpots.push({ x: o.x, y, z: o.z, h: -0.34, r: 0.025 });
    for (const a of [0, Math.PI]) {
      // overflow from the upper bowl into the basin
      const x = o.x + Math.sin(o.ry + a) * 0.33, z = o.z + Math.cos(o.ry + a) * 0.33;
      waterSpots.push({ x, y: y - 0.04, z, h: 0.74, r: 0.015 });
    }
    record('fountain', o.x, o.z, o.ry);
  }

  // coin telescopes on the viewpoints, looking towards St Peter's
  const dome = MAP.BACKDROP.stPeter || [-1400, 650];
  for (const p of pois('viewpoint')) {
    const s = searchNear(p.x, p.z, [0, 1.5, 3, 4.5, 6], (x, z) => siteOk(x, z, 0.45, { onPath: true, useRooms: false }));
    if (!s) continue;
    const ry = faceTo(s.x, s.z, dome[0], dome[1]);
    add(near, M.telescope(), s.x, s.z, ry);
    col.addCircle(s.x, s.z, 0.35, 'sign');
    record('viewpoint', s.x, s.z, ry);
  }

  // info boards
  for (const p of pois('info')) {
    const o = spotFor(p, 0.55, 0.6, { useRooms: p.n !== 'Leccio monumentale' });
    if (!o) continue;
    add(near, M.infoBoard(), o.x, o.z, o.ry);
    boxAt(o, 1.6, 0.3, 'sign');
    record('info', o.x, o.z, o.ry);
  }

  // nasoni: spout towards the path, water running into the grate
  for (const p of pois('nasone')) {
    const o = spotFor(p, 0.3, 0.3);
    if (!o) continue;
    const y = H(o.x, o.z);
    add(near, M.nasone(), o.x, o.z, o.ry);
    col.addCircle(o.x, o.z, 0.24, 'fountain');
    const [sx, sy, sz] = M.NASONE_SPOUT;
    const [wx, wz] = toWorld(o, sx, sz + 0.01);
    waterSpots.push({ x: wx, y: y + sy - 0.02, z: wz, h: sy - 0.1, r: 0.018 });
    record('nasone', o.x, o.z, o.ry);
  }

  // benches facing the path, then bins
  for (const p of pois('bench')) {
    const o = spotFor(p, 0.6, 0.9);
    if (!o) continue;
    add(near, M.bench(), o.x, o.z, o.ry);
    boxAt(o, 1.9, 0.62, 'bench');
    record('bench', o.x, o.z, o.ry);
  }
  for (const p of pois('bin')) {
    const o = spotFor(p, 0.45, 0.32);
    if (!o) continue;
    add(near, M.bin(), o.x, o.z, o.ry);
    col.addCircle(o.x, o.z, 0.28, 'bin');
    record('bin', o.x, o.z, o.ry);
  }

  // ------------------------------------------------------------ lamp posts along the viali

  const LAMP_CELL = 16;
  const lampHash = new Map();
  const lampKey = (i, j) => `${i},${j}`;
  const lampTooClose = (x, z, d) => {
    const i0 = Math.floor(x / LAMP_CELL), j0 = Math.floor(z / LAMP_CELL);
    for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
      for (const [lx, lz] of lampHash.get(lampKey(i, j)) || []) if (Math.hypot(lx - x, lz - z) < d) return true;
    }
    return false;
  };
  const lamp = M.lamp();
  for (const path of MAP.PATHS) {
    if (path.k !== 'viale') continue;
    geo.samplePolyline(path.p, 25, 9).forEach((s, i) => {
      if (lampTooClose(s.x, s.z, 15)) return;
      const first = i % 2 ? 1 : -1, off = path.w / 2 + 1.0;
      for (const side of [first, -first]) {
        for (const shift of [0, 3, -3, 6, -6]) {
          const x = s.x + s.dirX * shift - s.dirZ * side * off, z = s.z + s.dirZ * shift + s.dirX * side * off;
          if (pathGap(x, z) < 0.7 || !siteOk(x, z, 0.45)) continue;
          add(far, lamp, x, z, 0);
          col.addCircle(x, z, 0.22, 'lamp');
          const k = lampKey(Math.floor(x / LAMP_CELL), Math.floor(z / LAMP_CELL));
          (lampHash.get(k) || lampHash.set(k, []).get(k)).push([x, z]);
          record('lamp', x, z, 0);
          return;
        }
      }
    });
  }

  // ------------------------------------------------------------ build

  const mat = ctx.util.mats().vcFlat;
  near.build(ctx.scene, mat);
  far.build(ctx.scene, mat);
  M.releaseTemplates();
  const water = createWaterFx(ctx, waterSpots);
  for (const r of reservations) ctx.reserve(r);

  if (ctx.debug) {
    const counts = Object.fromEntries(Object.entries(placed).map(([k, v]) => [k, v.length]));
    console.info('[props]', counts, `near ${near.meshes.length} chunks ${Math.round(near.triangles / 1000)}k tris, far ${far.meshes.length} chunks ${Math.round(far.triangles / 1000)}k tris, ${Math.round(performance.now() - t0)} ms`);
  }

  return {
    // Where things ended up: {bench: [{x, z, ry}], nasone: [...], cafe: [...], lamp: [...], ...}
    placed,
    update(dt, t) {
      const c = ctx.camera.position;
      near.cull(c.x, c.z);
      far.cull(c.x, c.z);
      for (const m of carousels) {
        m.rotation.y += dt * 0.5;
        m.visible = Math.hypot(m.position.x - c.x, m.position.z - c.z) < far.range;
      }
      water.update(dt, t);
    },
  };
}
