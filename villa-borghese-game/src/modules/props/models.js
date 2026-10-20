// Low-poly templates for the park furniture. Every model is built facing +z (its front, seat or
// spout towards +z) with its base on y = 0, baked to one vertex-coloured geometry and cached.
// Parts that sit on the ground reach a little below y = 0 so gentle slopes never show a gap.
import * as THREE from 'three';
import { GeoBuilder, buildGeometry, PALETTE } from '../../core/util.js';

export const C = {
  iron: '#252b29', benchWood: '#3f6b47', binGreen: '#2f5a3b', parkGreen: '#2e5a3f',
  nasone: '#3c4744', nasoneLight: '#55625d', grate: '#1d2120',
  lampIron: '#22302a', lampGlass: '#fff3c8',
  marble: '#eee9df', marbleShade: '#ddd5c6', bronze: '#5d4b31', patina: '#4f6656',
  plinth: '#d6caae', travertine: PALETTE.travertine, travertineShade: PALETTE.travertineShade,
  water: '#5aa8cf', dark: '#2e2a26', white: '#f7f4ee', cream: '#f3e6c4',
  waffle: '#d39a4f', strawberry: '#f39ab8', pistachio: '#a9d18e', chocolate: '#7a4a2c', cherry: '#d8263a',
  wood: '#b07c4a', woodDark: '#7b5232', roofGreen: '#2f5a3e', terracotta: PALETTE.roofTile,
  sand: '#e8d6a6', rubber: '#c9654a', signBlue: '#2c6fb5', signYellow: '#f2c230', tyre: '#262626',
  parchment: '#efe6cf', lawn: PALETTE.lawn, red: '#d9483b', yellow: '#f4c430', blue: '#3b7dd8',
  green: '#4caf50', orange: '#f08a24', pink: '#ef7fb0', purple: '#8e5bc8', gold: '#e2bd5c', skyBlue: '#62b4e8',
};

// ---------------------------------------------------------------- shape helpers

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _mid = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);

// Cylinder from point a to point b ([x, y, z]); radius r0 at a, r1 at b.
function limb(gb, a, b, r0, r1, color, seg = 5) {
  _a.fromArray(a); _b.fromArray(b);
  _d.subVectors(_b, _a);
  const L = _d.length();
  _d.divideScalar(L);
  _q.setFromUnitVectors(_Y, _d);
  _m.compose(_mid.addVectors(_a, _b).multiplyScalar(0.5), _q, _one);
  gb.add(new THREE.CylinderGeometry(r1, r0, L, seg), color, _m);
}

// Chain of limbs through points with ball joints.
function arm(gb, pts, r, color) {
  for (let i = 1; i < pts.length; i++) limb(gb, pts[i - 1], pts[i], r, r * 0.9, color);
  for (let i = 1; i < pts.length; i++) gb.sphere(r * (i === pts.length - 1 ? 1.15 : 1), 0, color, ...pts[i]);
}

// Rectangular pyramid / hip roof: w x d footprint, apex shrunk to `top` (0 = point).
function pyramid(gb, w, d, h, color, x, y, z, top = 0) {
  const g = new THREE.CylinderGeometry(Math.SQRT1_2 * top, Math.SQRT1_2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  gb.place(g, color, x, y, z, 0, 0, 0, w, 1, d);
}

// Umbrella-like canopy made of wedges in alternating colours. y = canopy base.
function stripedCone(gb, r, h, n, colors, x, y, z, open = true) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.ConeGeometry(r, h, 1, 1, open, (i / n) * Math.PI * 2, (Math.PI * 2) / n);
    gb.place(g, colors[i % colors.length], x, y + h / 2, z);
  }
}

// Wheel standing in the y/z plane (rolls along z).
function wheel(gb, r, tube, color, x, y, z, seg = 10) {
  gb.place(new THREE.TorusGeometry(r, tube, 3, seg), color, x, y, z, 0, Math.PI / 2, 0);
}

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}
// Templates are only needed while the chunks are merged.
export function releaseTemplates() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
const done = (gb) => buildGeometry(gb);

// ---------------------------------------------------------------- small furniture

// Classic Roman park bench: green wooden slats on cast-iron sides. 1.8 long, faces +z.
export const bench = () => cached('bench', () => {
  const gb = new GeoBuilder();
  for (const z of [0.14, 0.01, -0.12]) gb.box(1.84, 0.05, 0.11, C.benchWood, 0, 0.46, z);
  for (const [y, z] of [[0.64, -0.24], [0.79, -0.265], [0.94, -0.29]]) gb.box(1.84, 0.11, 0.04, C.benchWood, 0, y, z, 0, -0.18);
  for (const x of [-0.8, 0.8]) {
    gb.box(0.07, 0.56, 0.07, C.iron, x, 0.18, 0.16);
    gb.box(0.07, 1.12, 0.07, C.iron, x, 0.46, -0.25, 0, -0.18);
    gb.box(0.06, 0.06, 0.5, C.iron, x, 0.42, -0.03);
    gb.box(0.07, 0.06, 0.44, C.iron, x, 0.68, 0.0);
    gb.box(0.05, 0.22, 0.05, C.iron, x, 0.56, 0.19);
    gb.box(0.09, 0.05, 0.58, C.iron, x, 0.0, -0.04);
  }
  return done(gb);
});

// Park litter bin on a short post.
export const bin = () => cached('bin', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.05, 0.06, 0.5, 6, C.iron, 0, 0.15, 0);
  gb.cyl(0.25, 0.23, 0.6, 8, C.binGreen, 0, 0.68, 0);
  gb.cyl(0.275, 0.275, 0.06, 8, C.binGreen, 0, 1.0, 0);
  gb.cyl(0.22, 0.22, 0.02, 8, C.grate, 0, 1.03, 0);
  gb.cyl(0.255, 0.255, 0.05, 8, C.iron, 0, 0.5, 0);
  return done(gb);
});

// The 'nasone': Rome's cast-iron drinking fountain with its curved spout ("big nose").
// Spout tip at NASONE_SPOUT; the water falls into the grate in front.
export const NASONE_SPOUT = [0, 0.66, 0.45];
export const nasone = () => cached('nasone', () => {
  const gb = new GeoBuilder();
  gb.box(0.6, 0.12, 1.0, C.travertineShade, 0, 0.0, 0.2);
  gb.box(0.4, 0.02, 0.34, C.grate, 0, 0.065, 0.45);
  gb.cyl(0.21, 0.24, 0.16, 10, C.nasone, 0, 0.13, 0);
  gb.cyl(0.155, 0.175, 0.98, 10, C.nasone, 0, 0.7, 0);
  gb.cyl(0.185, 0.185, 0.05, 10, C.nasoneLight, 0, 0.36, 0);
  gb.cyl(0.175, 0.175, 0.05, 10, C.nasoneLight, 0, 1.0, 0);
  gb.cyl(0.2, 0.17, 0.07, 10, C.nasone, 0, 1.22, 0);
  gb.dome(0.17, 10, 3, C.nasone, 0, 1.25, 0, 0.55);
  gb.sphere(0.055, 0, C.nasoneLight, 0, 1.36, 0);
  gb.box(0.13, 0.17, 0.04, C.nasoneLight, 0, 0.66, 0.165); // SPQR plate
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0.84, 0.1), new THREE.Vector3(0, 0.9, 0.32),
    new THREE.Vector3(0, 0.82, 0.46), new THREE.Vector3(0, 0.68, 0.45));
  gb.add(new THREE.TubeGeometry(curve, 6, 0.034, 5, false), C.nasone);
  gb.sphere(0.04, 0, C.nasone, ...NASONE_SPOUT);
  return done(gb);
});

// Roman cast-iron lamp post with a lantern, about 4.4 tall.
export const lamp = () => cached('lamp', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.27, 0.32, 0.5, 8, C.lampIron, 0, 0.1, 0);
  gb.cyl(0.19, 0.24, 0.42, 8, C.lampIron, 0, 0.55, 0);
  gb.cyl(0.08, 0.115, 2.6, 8, C.lampIron, 0, 2.05, 0);
  gb.cyl(0.15, 0.15, 0.08, 8, C.lampIron, 0, 0.82, 0);
  gb.cyl(0.13, 0.13, 0.07, 8, C.lampIron, 0, 2.6, 0);
  gb.cyl(0.19, 0.09, 0.2, 8, C.lampIron, 0, 3.44, 0);
  gb.cyl(0.13, 0.13, 0.05, 4, C.lampIron, 0, 3.55, 0, Math.PI / 4);
  gb.cyl(0.25, 0.14, 0.5, 4, C.lampGlass, 0, 3.82, 0, Math.PI / 4);
  gb.cyl(0.28, 0.28, 0.05, 4, C.lampIron, 0, 4.08, 0, Math.PI / 4);
  gb.cone(0.3, 0.26, 4, C.lampIron, 0, 4.23, 0, Math.PI / 4);
  gb.sphere(0.055, 0, C.lampIron, 0, 4.39, 0);
  return done(gb);
});

// Park information board with a little painted map, facing +z.
export const infoBoard = () => cached('info', () => {
  const gb = new GeoBuilder();
  for (const x of [-0.75, 0.75]) gb.box(0.1, 2.05, 0.1, C.parkGreen, x, 0.92, 0);
  gb.box(1.52, 1.06, 0.08, C.parkGreen, 0, 1.36, 0);
  gb.box(1.36, 0.9, 0.02, C.parchment, 0, 1.33, 0.045);
  gb.box(1.3, 0.12, 0.02, C.parkGreen, 0, 1.72, 0.05);
  gb.box(1.0, 0.56, 0.01, C.lawn, -0.08, 1.3, 0.06);
  gb.box(0.26, 0.15, 0.01, C.water, -0.32, 1.2, 0.067);
  gb.box(0.9, 0.03, 0.01, C.sand, -0.08, 1.38, 0.067);
  gb.box(0.03, 0.5, 0.01, C.sand, 0.08, 1.3, 0.067);
  gb.box(0.06, 0.06, 0.01, C.red, 0.2, 1.24, 0.072);
  gb.box(1.72, 0.06, 0.4, C.parkGreen, 0, 1.97, 0.02, 0, 0.18);
  return done(gb);
});

// Coin-operated binocular viewer, looking along +z, with a step for kids.
export const telescope = () => cached('telescope', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.26, 0.3, 0.3, 8, C.lampIron, 0, 0.05, 0);
  gb.cyl(0.065, 0.075, 1.0, 8, C.lampIron, 0, 0.65, 0);
  gb.box(0.4, 0.12, 0.12, C.lampIron, 0, 1.18, 0);
  gb.box(0.34, 0.3, 0.46, '#2f6f8f', 0, 1.36, 0);
  gb.box(0.36, 0.035, 0.18, '#2f6f8f', 0, 1.53, 0.2);
  for (const x of [-0.08, 0.08]) {
    gb.cyl(0.085, 0.085, 0.14, 8, C.gold, x, 1.34, 0.28, 0, Math.PI / 2);
    gb.cyl(0.04, 0.04, 0.1, 6, C.grate, x, 1.4, -0.27, 0, Math.PI / 2);
  }
  gb.box(0.14, 0.18, 0.1, C.gold, 0, 1.0, -0.09);
  gb.box(0.5, 0.16, 0.36, C.lampIron, 0, 0.08, -0.38);
  return done(gb);
});

// Big gelato cone (three scoops and a cherry), base at y = 0, about 1.9 tall.
function gelato(gb, x, y, z, s = 1) {
  gb.place(new THREE.ConeGeometry(0.32 * s, 0.85 * s, 8), C.waffle, x, y + 0.425 * s, z, Math.PI);
  gb.sphere(0.35 * s, 1, C.strawberry, x, y + 0.93 * s, z);
  gb.sphere(0.3 * s, 1, C.pistachio, x + 0.04 * s, y + 1.3 * s, z);
  gb.sphere(0.25 * s, 1, C.chocolate, x - 0.02 * s, y + 1.6 * s, z);
  gb.sphere(0.08 * s, 0, C.cherry, x, y + 1.87 * s, z);
}

// Gelato sign on a pole (for cafés that live in a real building).
export const gelatoSign = () => cached('gelatoSign', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.06, 0.07, 2.4, 6, C.parkGreen, 0, 1.1, 0);
  gb.cyl(0.2, 0.25, 0.3, 8, C.parkGreen, 0, 0.05, 0);
  gelato(gb, 0, 2.2, 0, 0.9);
  return done(gb);
});

// Small travertine fountain: round basin, column and an upper bowl. Jet rises from FOUNTAIN_JET.
export const FOUNTAIN_JET = [0, 1.18, 0];
export const fountain = () => cached('fountain', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.8, 0.72, 0.55, 12, C.travertine, 0, 0.12, 0);
  gb.cyl(0.87, 0.87, 0.08, 12, C.travertineShade, 0, 0.42, 0);
  gb.cyl(0.74, 0.74, 0.02, 12, C.water, 0, 0.37, 0);
  gb.cyl(0.11, 0.15, 0.75, 8, C.travertine, 0, 0.72, 0);
  gb.cyl(0.34, 0.1, 0.18, 10, C.travertine, 0, 1.08, 0);
  gb.cyl(0.29, 0.29, 0.02, 10, C.water, 0, 1.16, 0);
  return done(gb);
});

// ---------------------------------------------------------------- statues

const POSES = ['orator', 'book', 'thinker', 'cloak', 'wave', 'scroll'];
export const STATUE_POSES = POSES;

// Classical pedestal: base, dado with a bronze plaque, cornice. Returns the top height.
function pedestal(gb, w, d, h, plaque = true) {
  gb.box(w + 0.3, 0.45, d + 0.3, C.plinth, 0, 0.0, 0);
  gb.box(w, h - 0.27, d, C.plinth, 0, 0.2 + (h - 0.27) / 2, 0);
  gb.box(w + 0.16, 0.14, d + 0.16, C.travertine, 0, h - 0.02, 0);
  if (plaque) gb.box(w * 0.5, 0.28, 0.03, C.bronze, 0, h * 0.55, d / 2 + 0.015);
  return h + 0.05;
}

// Standing figure in a long robe on top of y0.
function standing(gb, col, y0, pose) {
  const shade = col === C.marble ? C.marbleShade : col;
  gb.cyl(0.2, 0.3, 1.0, 8, col, 0, y0 + 0.5, 0);
  gb.cyl(0.22, 0.18, 0.52, 8, col, 0, y0 + 1.24, 0);
  gb.cyl(0.06, 0.07, 0.14, 6, col, 0, y0 + 1.55, 0);
  gb.sphere(0.13, 1, col, 0, y0 + 1.71, 0.01, 1, 1.12, 1);
  gb.box(0.5, 0.12, 0.26, col, 0, y0 + 1.45, 0);
  gb.box(0.08, 0.95, 0.28, shade, 0.08, y0 + 1.0, 0.03, 0, 0, 0.35); // toga fold across the chest
  const L = [-0.27, y0 + 1.44, 0], R = [0.27, y0 + 1.44, 0];
  const y = y0;
  switch (pose) {
    case 'orator':
      arm(gb, [R, [0.42, y + 1.58, 0.2], [0.5, y + 1.86, 0.36]], 0.06, col);
      arm(gb, [L, [-0.33, y + 1.14, 0.06], [-0.28, y + 0.9, 0.16]], 0.06, col);
      gb.box(0.12, 0.6, 0.2, shade, -0.31, y + 0.72, 0.14);
      break;
    case 'book':
      arm(gb, [R, [0.3, y + 1.16, 0.1], [0.1, y + 1.24, 0.25]], 0.06, col);
      arm(gb, [L, [-0.3, y + 1.16, 0.1], [-0.1, y + 1.24, 0.25]], 0.06, col);
      gb.box(0.3, 0.36, 0.07, shade, 0, y + 1.3, 0.27, 0, -0.5);
      break;
    case 'thinker':
      arm(gb, [R, [0.3, y + 1.18, 0.2], [0.06, y + 1.58, 0.15]], 0.06, col);
      arm(gb, [L, [-0.3, y + 1.15, 0.12], [0.06, y + 1.16, 0.24]], 0.06, col);
      break;
    case 'cloak':
      gb.place(new THREE.ConeGeometry(0.42, 1.55, 7, 1, true), shade, 0, y + 0.78, -0.08);
      arm(gb, [R, [0.33, y + 1.13, 0.06], [0.24, y + 0.97, 0.16]], 0.06, col);
      arm(gb, [L, [-0.34, y + 1.14, 0.1], [-0.18, y + 1.12, 0.3]], 0.06, col);
      gb.cyl(0.035, 0.035, 0.22, 5, shade, -0.16, y + 1.12, 0.38, 0, Math.PI / 2.4); // hat in hand
      break;
    case 'wave':
      arm(gb, [R, [0.42, y + 1.72, 0.06], [0.48, y + 2.08, 0.1]], 0.06, col);
      arm(gb, [L, [-0.32, y + 1.13, 0.05], [-0.26, y + 0.88, 0.1]], 0.06, col);
      break;
    default: // scroll
      arm(gb, [R, [0.32, y + 1.15, 0.12], [0.16, y + 1.12, 0.33]], 0.06, col);
      arm(gb, [L, [-0.32, y + 1.15, 0.12], [-0.16, y + 1.12, 0.33]], 0.06, col);
      gb.cyl(0.055, 0.055, 0.42, 6, shade, 0, y + 1.12, 0.36, 0, 0, Math.PI / 2);
  }
}

// Seated poet on a chair, book on the knee.
function seated(gb, col, y0) {
  const shade = col === C.marble ? C.marbleShade : col;
  gb.box(0.72, 0.55, 0.6, shade, 0, y0 + 0.275, -0.08);
  gb.box(0.72, 0.6, 0.1, shade, 0, y0 + 0.85, -0.36);
  for (const x of [-0.14, 0.14]) {
    limb(gb, [x, y0 + 0.62, -0.05], [x * 1.1, y0 + 0.64, 0.4], 0.1, 0.09, col);
    limb(gb, [x * 1.1, y0 + 0.64, 0.4], [x * 1.1, y0 + 0.06, 0.46], 0.08, 0.07, col);
    gb.box(0.12, 0.08, 0.24, col, x * 1.1, y0 + 0.04, 0.52);
  }
  gb.box(0.46, 0.5, 0.06, col, 0, y0 + 0.38, 0.47); // robe falling over the knees
  gb.cyl(0.22, 0.2, 0.62, 8, col, 0, y0 + 0.95, -0.08);
  gb.box(0.5, 0.12, 0.26, col, 0, y0 + 1.22, -0.08);
  gb.cyl(0.06, 0.07, 0.12, 6, col, 0, y0 + 1.33, -0.07);
  gb.sphere(0.13, 1, col, 0, y0 + 1.48, -0.06, 1, 1.12, 1);
  arm(gb, [[0.27, y0 + 1.2, -0.08], [0.3, y0 + 0.92, 0.12], [0.16, y0 + 0.8, 0.36]], 0.06, col);
  arm(gb, [[-0.27, y0 + 1.2, -0.08], [-0.34, y0 + 0.96, 0.1], [-0.12, y0 + 1.42, 0.06]], 0.06, col);
  gb.box(0.28, 0.06, 0.36, shade, 0.12, y0 + 0.78, 0.32, 0.2);
}

// Bust on a tapering herm.
function bustOn(gb, col, y0) {
  gb.box(0.6, 0.3, 0.6, C.plinth, 0, y0 + 0.05, 0);
  const g = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.44, Math.SQRT1_2 * 0.34, 1.35, 4, 1);
  g.rotateY(Math.PI / 4);
  gb.place(g, C.plinth, 0, y0 + 0.87, 0);
  gb.box(0.5, 0.08, 0.5, C.travertine, 0, y0 + 1.58, 0);
  gb.box(0.2, 0.15, 0.03, C.bronze, 0, y0 + 1.1, 0.2);
  gb.sphere(0.3, 1, col, 0, y0 + 1.78, 0, 1.05, 0.62, 0.62);
  gb.cyl(0.075, 0.085, 0.16, 6, col, 0, y0 + 1.95, 0.01);
  gb.sphere(0.15, 1, col, 0, y0 + 2.13, 0.02, 1, 1.12, 1.05);
}

// Statue templates. kind: one of POSES, 'seated', 'bust', 'horse', 'stele'. mat: 'marble' | 'bronze'.
export function statue(kind, mat = 'marble') {
  return cached(`statue:${kind}:${mat}`, () => {
    const gb = new GeoBuilder();
    const col = mat === 'bronze' ? C.bronze : C.marble;
    if (kind === 'bust') bustOn(gb, col, 0);
    else if (kind === 'horse') horseman(gb, col);
    else if (kind === 'stele') stele(gb);
    else if (kind === 'seated') seated(gb, col, pedestal(gb, 1.0, 1.25, 1.5));
    else standing(gb, col, pedestal(gb, 0.85, 0.85, 1.9), kind);
    return done(gb);
  });
}

// Equestrian monument: rider on a horse pawing the air, on a long pedestal.
function horseman(gb, col) {
  const t = pedestal(gb, 1.15, 2.5, 2.0);
  gb.place(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 8), col, 0, t + 1.0, 0, Math.PI / 2);
  gb.sphere(0.37, 1, col, 0, t + 1.04, 0.55);
  gb.sphere(0.38, 1, col, 0, t + 1.0, -0.55);
  limb(gb, [0, t + 1.15, 0.68], [0, t + 1.75, 0.98], 0.2, 0.14, col, 6);
  limb(gb, [0, t + 1.82, 0.98], [0, t + 1.52, 1.32], 0.14, 0.09, col, 6);
  gb.box(0.06, 0.45, 0.2, col, 0, t + 1.6, 0.86, 0, -0.5); // mane
  gb.cone(0.05, 0.14, 4, col, 0.07, t + 1.95, 0.96);
  gb.cone(0.05, 0.14, 4, col, -0.07, t + 1.95, 0.96);
  limb(gb, [0.17, t + 0.9, 0.62], [0.16, t + 0.0, 0.68], 0.1, 0.065, col);
  arm(gb, [[-0.17, t + 0.9, 0.62], [-0.17, t + 0.68, 0.95], [-0.17, t + 0.4, 0.9]], 0.075, col);
  limb(gb, [0.17, t + 0.9, -0.6], [0.18, t + 0.0, -0.78], 0.11, 0.065, col);
  limb(gb, [-0.17, t + 0.9, -0.6], [-0.18, t + 0.0, -0.7], 0.11, 0.065, col);
  limb(gb, [0, t + 1.15, -0.9], [0, t + 0.45, -1.08], 0.09, 0.05, col);
  // rider
  gb.cyl(0.21, 0.18, 0.6, 8, col, 0, t + 1.66, -0.08);
  gb.box(0.48, 0.11, 0.24, col, 0, t + 1.93, -0.08);
  gb.sphere(0.13, 1, col, 0, t + 2.12, -0.06, 1, 1.1, 1);
  gb.cyl(0.16, 0.13, 0.1, 8, col, 0, t + 2.25, -0.06);
  for (const x of [-0.24, 0.24]) arm(gb, [[x * 0.7, t + 1.42, -0.05], [x * 1.5, t + 1.1, 0.2], [x * 1.4, t + 0.75, 0.25]], 0.075, col);
  arm(gb, [[0.24, t + 1.9, -0.08], [0.34, t + 1.66, 0.15], [0.12, t + 1.6, 0.4]], 0.06, col);
  arm(gb, [[-0.24, t + 1.9, -0.08], [-0.34, t + 1.66, 0.15], [-0.12, t + 1.6, 0.4]], 0.06, col);
}

// Memorial stele: travertine slab with a bronze plaque and laurel wreath.
function stele(gb) {
  gb.box(1.3, 0.3, 0.7, C.plinth, 0, 0.05, 0);
  gb.box(1.0, 1.7, 0.36, C.travertine, 0, 1.0, 0);
  gb.box(1.12, 0.14, 0.46, C.plinth, 0, 1.9, 0);
  pyramid(gb, 1.12, 0.46, 0.22, C.plinth, 0, 2.08, 0, 0.3);
  gb.box(0.56, 0.42, 0.03, C.bronze, 0, 1.15, 0.19);
  gb.place(new THREE.TorusGeometry(0.17, 0.045, 4, 10), C.patina, 0, 1.58, 0.2);
}

// ---------------------------------------------------------------- kiosks

// Café kiosk: cream cabin, green trim, striped awning over the counter and a giant gelato on the roof.
export function cafeKiosk(stripe = C.red) {
  return cached(`cafe:${stripe}`, () => {
    const gb = new GeoBuilder();
    const W = 2.8, D = 2.2, H = 2.4, y0 = 0.15;
    gb.box(W + 0.4, 0.6, D + 0.4, C.travertineShade, 0, -0.15, 0);
    gb.box(W, H, D, C.cream, 0, y0 + H / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) gb.box(0.16, H, 0.16, C.roofGreen, (sx * W) / 2, y0 + H / 2, (sz * D) / 2);
    gb.box(W - 0.2, 0.85, 0.05, C.roofGreen, 0, y0 + 0.45, D / 2 + 0.02);
    gb.box(1.9, 0.95, 0.05, C.dark, 0, y0 + 1.42, D / 2 + 0.01);
    gb.box(2.1, 0.08, 0.42, C.white, 0, y0 + 0.92, D / 2 + 0.17);
    // menu boards on the sides
    for (const sx of [-1, 1]) gb.box(0.04, 0.8, 0.9, C.dark, (sx * W) / 2 + sx * 0.03, y0 + 1.35, 0);
    const n = 7, aw = (W + 0.2) / n;
    for (let i = 0; i < n; i++) {
      const x = -(W + 0.2) / 2 + (i + 0.5) * aw, c = i % 2 ? C.white : stripe;
      gb.box(aw + 0.005, 0.04, 0.85, c, x, y0 + 2.08, D / 2 + 0.38, 0, 0.42);
      gb.box(aw + 0.005, 0.2, 0.03, c, x, y0 + 1.82, D / 2 + 0.78);
    }
    gb.box(W + 0.5, 0.14, D + 0.5, C.roofGreen, 0, y0 + H + 0.07, 0);
    pyramid(gb, W + 0.3, D + 0.3, 0.5, C.roofGreen, 0, y0 + H + 0.39, 0, 0.25);
    gelato(gb, 0, y0 + H + 0.62, 0, 1.05);
    gb.cyl(0.06, 0.06, 0.3, 6, C.iron, 0, y0 + H + 0.55, 0);
    return done(gb);
  });
}

// Café table with chairs (no umbrella). Table centre at the origin.
export const cafeTable = () => cached('cafeTable', () => {
  const gb = new GeoBuilder();
  gb.cyl(0.42, 0.42, 0.04, 10, C.white, 0, 0.74, 0);
  gb.cyl(0.035, 0.035, 0.74, 5, C.iron, 0, 0.37, 0);
  gb.cyl(0.22, 0.24, 0.04, 8, C.iron, 0, 0.02, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4, cx = Math.sin(a) * 0.72, cz = Math.cos(a) * 0.72;
    gb.box(0.4, 0.04, 0.4, C.white, cx, 0.45, cz, a);
    gb.box(0.4, 0.4, 0.04, C.white, cx + Math.sin(a) * 0.19, 0.66, cz + Math.cos(a) * 0.19, a);
    for (const s of [-0.17, 0.17]) gb.box(0.04, 0.45, 0.36, C.iron, cx + Math.cos(a) * s, 0.21, cz - Math.sin(a) * s, a);
  }
  return done(gb);
});

// Striped café umbrella (pole + canopy), about 2.6 tall.
export function umbrella(a, b) {
  return cached(`umbrella:${a}:${b}`, () => {
    const gb = new GeoBuilder();
    gb.cyl(0.035, 0.035, 2.4, 5, C.white, 0, 1.2, 0);
    stripedCone(gb, 1.35, 0.42, 8, [a, b], 0, 2.18, 0);
    gb.place(new THREE.CylinderGeometry(1.35, 1.35, 0.14, 8, 1, true), a, 0, 2.11, 0);
    gb.sphere(0.06, 0, b, 0, 2.62, 0);
    return done(gb);
  });
}

// Toilet cabin with two green doors and a blue WC sign.
export const toilets = () => cached('toilets', () => {
  const gb = new GeoBuilder();
  const W = 3.2, D = 2.4, H = 2.5, y0 = 0.15;
  gb.box(W + 0.3, 0.6, D + 0.3, C.travertineShade, 0, -0.15, 0);
  gb.box(W, H, D, '#eadcbc', 0, y0 + H / 2, 0);
  gb.box(W + 0.04, 0.45, D + 0.04, C.travertine, 0, y0 + 0.22, 0);
  for (const x of [-0.78, 0.78]) {
    gb.box(0.86, 1.95, 0.06, C.roofGreen, x, y0 + 0.98, D / 2 + 0.01);
    gb.box(0.06, 0.06, 0.04, C.gold, x + 0.3, y0 + 1.0, D / 2 + 0.05);
  }
  // blue sign with a man and a woman pictogram
  const sy = y0 + 2.2, sz = D / 2 + 0.06;
  gb.box(1.0, 0.62, 0.05, C.signBlue, 0, sy, D / 2 + 0.03);
  gb.box(0.025, 0.5, 0.02, C.white, 0, sy, sz);
  for (const x of [-0.22, 0.22]) gb.sphere(0.055, 1, C.white, x, sy + 0.2, sz);
  gb.box(0.16, 0.17, 0.02, C.white, -0.22, sy + 0.04, sz);
  for (const s of [-1, 1]) {
    gb.box(0.05, 0.16, 0.02, C.white, -0.22 + s * 0.045, sy - 0.13, sz);
    gb.box(0.045, 0.15, 0.02, C.white, -0.22 + s * 0.11, sy + 0.04, sz, 0, 0, s * 0.25);
    gb.box(0.045, 0.1, 0.02, C.white, 0.22 + s * 0.04, sy - 0.17, sz);
  }
  gb.place(new THREE.CylinderGeometry(0.05, 0.13, 0.24, 3), C.white, 0.22, sy + 0.0, sz, 0, Math.PI, 0, 1, 1, 0.15);
  for (const sx of [-1, 1]) gb.box(0.05, 0.3, 0.9, C.dark, (sx * W) / 2, y0 + 2.05, 0);
  gb.box(W + 0.5, 0.12, D + 0.5, C.travertineShade, 0, y0 + H + 0.06, 0);
  pyramid(gb, W + 0.4, D + 0.4, 0.45, C.terracotta, 0, y0 + H + 0.34, 0, 0.3);
  return done(gb);
});

// Rental hut: wooden cabin with a big yellow bike sign on the roof.
export const rentalHut = () => cached('rentalHut', () => {
  const gb = new GeoBuilder();
  const W = 2.6, D = 2.0, H = 2.3, y0 = 0.15;
  gb.box(W + 0.3, 0.6, D + 0.3, C.woodDark, 0, -0.15, 0);
  gb.box(W, H, D, C.wood, 0, y0 + H / 2, 0);
  for (let i = 0; i < 6; i++) gb.box(0.03, H, 0.02, C.woodDark, -W / 2 + 0.22 + i * 0.43, y0 + H / 2, D / 2 + 0.01);
  gb.box(1.7, 0.9, 0.05, C.dark, 0, y0 + 1.45, D / 2 + 0.02);
  gb.box(1.9, 0.08, 0.4, C.woodDark, 0, y0 + 0.98, D / 2 + 0.16);
  gb.box(W + 0.6, 0.12, D + 0.6, C.roofGreen, 0, y0 + H + 0.06, 0);
  pyramid(gb, W + 0.4, D + 0.4, 0.5, C.roofGreen, 0, y0 + H + 0.37, 0, 0.2);
  // sign with a bike drawn on it
  const sy = y0 + H + 0.95, sz = D / 2 - 0.1;
  for (const x of [-0.9, 0.9]) gb.box(0.06, 0.8, 0.06, C.iron, x, sy - 0.25, sz - 0.05);
  gb.box(2.3, 0.75, 0.08, C.signYellow, 0, sy, sz);
  for (const x of [-0.32, 0.32]) gb.place(new THREE.TorusGeometry(0.2, 0.035, 3, 12), C.dark, x, sy - 0.04, sz + 0.06);
  limb(gb, [-0.32, sy - 0.04, sz + 0.06], [-0.02, sy - 0.04, sz + 0.06], 0.03, 0.03, C.red, 4);
  limb(gb, [-0.02, sy - 0.04, sz + 0.06], [0.2, sy + 0.2, sz + 0.06], 0.03, 0.03, C.red, 4);
  limb(gb, [-0.32, sy - 0.04, sz + 0.06], [-0.12, sy + 0.2, sz + 0.06], 0.03, 0.03, C.red, 4);
  limb(gb, [-0.12, sy + 0.2, sz + 0.06], [0.2, sy + 0.2, sz + 0.06], 0.03, 0.03, C.red, 4);
  limb(gb, [0.2, sy + 0.2, sz + 0.06], [0.32, sy - 0.04, sz + 0.06], 0.03, 0.03, C.red, 4);
  return done(gb);
});

// Bicycle facing +z.
export function bike(color) {
  return cached(`bike:${color}`, () => {
    const gb = new GeoBuilder();
    wheel(gb, 0.32, 0.035, C.tyre, 0, 0.34, -0.52);
    wheel(gb, 0.32, 0.035, C.tyre, 0, 0.34, 0.52);
    const rear = [0, 0.34, -0.52], bb = [0, 0.32, -0.05], seat = [0, 0.86, -0.22], head = [0, 0.86, 0.36], front = [0, 0.34, 0.52];
    for (const [a, b] of [[bb, seat], [bb, head], [seat, head], [bb, rear], [seat, rear], [head, front]]) limb(gb, a, b, 0.03, 0.03, color, 4);
    gb.box(0.52, 0.04, 0.04, C.iron, 0, 0.98, 0.33);
    limb(gb, head, [0, 0.98, 0.33], 0.03, 0.03, C.iron, 4);
    gb.box(0.13, 0.05, 0.26, C.dark, 0, 0.9, -0.24);
    gb.box(0.32, 0.2, 0.24, C.white, 0, 0.82, 0.55);
    return done(gb);
  });
}

// Four-wheeled pedal surrey ("risciò") with a fringed striped canopy, facing +z.
export function surrey(color) {
  return cached(`surrey:${color}`, () => {
    const gb = new GeoBuilder();
    for (const x of [-0.64, 0.64]) for (const z of [-0.78, 0.78]) {
      gb.cyl(0.3, 0.3, 0.1, 10, C.tyre, x, 0.3, z, 0, 0, Math.PI / 2);
      gb.cyl(0.13, 0.13, 0.12, 8, C.white, x, 0.3, z, 0, 0, Math.PI / 2);
    }
    gb.box(1.24, 0.1, 2.1, C.iron, 0, 0.42, 0);
    gb.box(1.3, 0.06, 0.06, color, 0, 0.47, 1.05);
    for (const z of [-0.45, 0.25]) {
      gb.box(1.1, 0.26, 0.42, C.dark, 0, 0.6, z);
      gb.box(1.12, 0.1, 0.46, color, 0, 0.78, z);
      gb.box(1.12, 0.42, 0.08, color, 0, 1.02, z - 0.24, 0, -0.12);
    }
    limb(gb, [-0.3, 0.5, 0.75], [-0.3, 1.0, 0.6], 0.025, 0.025, C.iron, 4);
    gb.place(new THREE.TorusGeometry(0.15, 0.025, 3, 10), C.dark, -0.3, 1.02, 0.58, -1.0);
    gb.box(0.9, 0.28, 0.3, C.white, 0, 0.64, 0.98);
    for (const x of [-0.58, 0.58]) for (const z of [-0.88, 0.88]) limb(gb, [x, 0.45, z], [x, 1.86, z], 0.025, 0.025, C.white, 4);
    for (let i = 0; i < 5; i++) gb.box(0.27, 0.05, 2.0, i % 2 ? C.white : color, -0.54 + i * 0.27, 1.9, 0);
    for (const z of [-1.0, 1.0]) gb.box(1.36, 0.16, 0.02, color, 0, 1.8, z);
    for (const x of [-0.68, 0.68]) gb.box(0.02, 0.16, 2.0, color, x, 1.8, 0);
    return done(gb);
  });
}

// ---------------------------------------------------------------- playgrounds

// Safety-rubber floor with a timber border. Its top is just above y = 0.
function sandpit(gb, w, d) {
  gb.box(w, 0.5, d, C.rubber, 0, -0.2, 0);
  for (const s of [-1, 1]) {
    gb.box(w + 0.3, 0.5, 0.18, C.woodDark, 0, -0.08, (s * (d + 0.12)) / 2);
    gb.box(0.18, 0.5, d, C.woodDark, (s * (w + 0.12)) / 2, -0.08, 0);
  }
}

// Spring rider animal seen side-on: body along z, head up front, handles and a tail.
function springRider(gb, x, z, body, accent) {
  gb.cyl(0.18, 0.2, 0.06, 8, C.iron, x, 0.05, z);
  limb(gb, [x, 0.05, z], [x, 0.5, z], 0.07, 0.07, C.iron, 6);
  gb.sphere(0.3, 1, body, x, 0.68, z, 0.62, 0.62, 1.15);
  limb(gb, [x, 0.75, z + 0.25], [x, 1.08, z + 0.38], 0.11, 0.1, body, 6);
  gb.sphere(0.17, 1, body, x, 1.14, z + 0.42, 0.9, 0.9, 1.2);
  gb.cone(0.06, 0.16, 5, accent, x, 1.1, z + 0.64, 0);
  for (const s of [-1, 1]) {
    gb.sphere(0.035, 0, C.dark, x + s * 0.12, 1.2, z + 0.5);
    gb.box(0.08, 0.04, 0.04, accent, x + s * 0.17, 1.0, z + 0.3);
  }
  gb.box(0.26, 0.05, 0.3, accent, x, 0.95, z - 0.02);
  limb(gb, [x, 0.75, z - 0.32], [x, 0.98, z - 0.5], 0.06, 0.03, accent, 4);
}

// Classic playground: swings, slide, see-saw and two spring riders on a sandpit.
// PLAYGROUND_SOLIDS lists [x, z, r] collider circles in the same local frame.
export const PLAYGROUND_SIZE = [11, 8];
export const PLAYGROUND_SOLIDS = [[-3.0, -1.6, 1.6], [2.6, -1.4, 1.0], [2.6, 0.6, 0.6], [-2.6, 2.2, 1.0], [1.2, 2.6, 0.45], [3.4, 2.6, 0.45]];
export const playground = () => cached('playground', () => {
  const gb = new GeoBuilder();
  sandpit(gb, 11, 8);
  gb.box(4.0, 0.1, 2.6, C.sand, -3.0, 0.03, -1.6);
  // swings
  const sx = -3.0, sz = -1.6;
  for (const s of [-1, 1]) {
    limb(gb, [sx + s * 1.6, 0, sz - 0.8], [sx + s * 1.6, 2.3, sz], 0.06, 0.06, C.red, 5);
    limb(gb, [sx + s * 1.6, 0, sz + 0.8], [sx + s * 1.6, 2.3, sz], 0.06, 0.06, C.red, 5);
  }
  gb.cyl(0.07, 0.07, 3.4, 6, C.yellow, sx, 2.3, sz, 0, 0, Math.PI / 2);
  for (const [o, c] of [[-0.65, C.blue], [0.65, C.green]]) {
    gb.box(0.48, 0.05, 0.22, c, sx + o, 0.5, sz);
    for (const e of [-0.2, 0.2]) limb(gb, [sx + o + e, 2.28, sz], [sx + o + e, 0.52, sz], 0.012, 0.012, C.iron, 3);
  }
  // slide: tower with roof, ladder at the back, chute to +z
  const tx = 2.6, tz = -1.4;
  for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) gb.box(0.1, 2.6, 0.1, C.blue, tx + a, 1.25, tz + b);
  gb.box(1.1, 0.1, 1.1, C.yellow, tx, 1.5, tz);
  pyramid(gb, 1.3, 1.3, 0.6, C.red, tx, 2.85, tz);
  for (const a of [-0.25, 0.25]) limb(gb, [tx + a, 0, tz - 1.2], [tx + a, 1.55, tz - 0.55], 0.04, 0.04, C.blue, 4);
  for (let i = 1; i < 5; i++) gb.box(0.5, 0.04, 0.06, C.yellow, tx, i * 0.31, tz - 1.2 + i * 0.13);
  const ang = Math.atan2(1.4, 2.2);
  gb.box(0.6, 0.06, 2.6, C.yellow, tx, 0.85, tz + 1.6, 0, ang);
  for (const a of [-0.3, 0.3]) gb.box(0.05, 0.18, 2.6, C.orange, tx + a, 0.94, tz + 1.6, 0, ang);
  // see-saw
  const wx = -2.6, wz = 2.2;
  gb.box(0.3, 0.42, 0.3, C.red, wx, 0.21, wz);
  gb.box(0.26, 0.06, 3.0, C.green, wx, 0.52, wz, 0, 0.16);
  for (const [z, y] of [[-1.2, 0.86], [1.2, 0.48]]) gb.box(0.4, 0.06, 0.06, C.red, wx, y, wz + z);
  springRider(gb, 1.2, 2.6, C.yellow, C.orange);
  springRider(gb, 3.4, 2.6, C.skyBlue, C.red);
  return done(gb);
});

// The Pincio "giostra": carousel base (its turning part is carouselTop, so it can spin) and a
// bouncy castle next to it.
export const carouselBase = () => cached('carouselBase', () => {
  const gb = new GeoBuilder();
  gb.cyl(3.0, 3.15, 0.5, 14, C.travertineShade, 0, 0.0, 0);
  gb.cyl(2.85, 2.85, 0.06, 14, C.rubber, 0, 0.26, 0);
  return done(gb);
});

export const bouncyCastle = () => cached('bouncyCastle', () => {
  const gb = new GeoBuilder();
  gb.box(3.6, 0.7, 3.4, C.red, 0, 0.3, 0);
  for (const [s, c] of [[-1, C.blue], [1, C.yellow]]) gb.box(0.4, 1.3, 3.0, c, s * 1.6, 1.25, 0);
  gb.box(3.0, 1.3, 0.4, C.blue, 0, 1.25, -1.5);
  gb.box(3.0, 0.4, 0.4, C.yellow, 0, 2.1, 1.5);
  for (const [ox, oz, c] of [[-1.65, -1.55, C.blue], [1.65, -1.55, C.yellow], [-1.65, 1.55, C.yellow], [1.65, 1.55, C.blue]]) {
    gb.cyl(0.42, 0.45, 2.4, 8, c, ox, 1.2, oz);
    gb.cone(0.5, 0.7, 8, C.red, ox, 2.75, oz);
  }
  gb.box(2.0, 0.08, 0.9, C.green, 0, 0.4, 1.95, 0, 0.5);
  return done(gb);
});

// Spinning part of the carousel: platform, horses on golden poles, striped canopy.
export function carouselTop() {
  const gb = new GeoBuilder();
  gb.cyl(2.7, 2.7, 0.2, 14, C.woodDark, 0, 0.1, 0);
  gb.cyl(0.35, 0.4, 3.0, 10, C.gold, 0, 1.6, 0);
  stripedCone(gb, 3.1, 1.0, 14, [C.red, C.white], 0, 3.05, 0);
  gb.place(new THREE.CylinderGeometry(3.1, 3.1, 0.35, 14, 1, true), C.gold, 0, 2.95, 0);
  gb.cyl(3.0, 3.0, 0.05, 14, C.cream, 0, 3.08, 0);
  const colors = [C.white, C.pink, C.skyBlue, C.white, C.yellow, C.white];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, x = Math.sin(a) * 2.0, z = Math.cos(a) * 2.0, y = 0.95 + (i % 2) * 0.25;
    gb.cyl(0.03, 0.03, 2.9, 4, C.gold, x, 1.65, z);
    const dirX = Math.cos(a), dirZ = -Math.sin(a); // horses face along the ride
    gb.place(new THREE.BoxGeometry(0.26, 0.32, 0.8), colors[i], x, y, z, 0, Math.atan2(dirX, dirZ), 0);
    limb(gb, [x + dirX * 0.3, y + 0.1, z + dirZ * 0.3], [x + dirX * 0.5, y + 0.5, z + dirZ * 0.5], 0.1, 0.08, colors[i], 5);
    gb.place(new THREE.BoxGeometry(0.16, 0.18, 0.3), colors[i], x + dirX * 0.6, y + 0.52, z + dirZ * 0.6, 0, Math.atan2(dirX, dirZ), 0);
    gb.place(new THREE.BoxGeometry(0.28, 0.06, 0.3), C.red, x, y + 0.18, z, 0, Math.atan2(dirX, dirZ), 0);
    for (const s of [-1, 1]) limb(gb, [x + dirX * s * 0.3, y - 0.1, z + dirZ * s * 0.3], [x + dirX * s * 0.42, y - 0.5, z + dirZ * s * 0.42], 0.04, 0.03, colors[i], 4);
  }
  return gb;
}
