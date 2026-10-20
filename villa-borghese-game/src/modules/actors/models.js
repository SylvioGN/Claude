// Low-poly models for the actors. Everything faces +z with its feet at y = 0 (see rig.js for
// the aRig limb/region attributes). Sizes are in metres: the park map is shrunk, people are not.
import * as THREE from 'three';
import { RigBuilder, R, REG } from './rig.js';

const W = '#ffffff';
const { TOP, BOTTOM, SKIN, HAIR, ACCENT, LOWER } = REG;

// --- people -------------------------------------------------------------------------------
const HIP = 0.93, SH = 1.43, SX = 0.235;

function legs(b, upperReg, hipY = HIP) {
  for (const s of [1, -1]) {
    const x = 0.1 * s;
    b.limb(0.088, 0.078, [x, hipY + 0.02, 0], [x, 0.5, 0], 6, W, R.leg(s, hipY, 0, upperReg));
    b.limb(0.074, 0.06, [x, 0.53, 0], [x, 0.09, 0], 6, W, R.leg(s, hipY, 0, LOWER));
    b.box(0.13, 0.09, 0.27, W, R.leg(s, hipY, 0, ACCENT), x, 0.045, 0.04);
  }
}

function arms(b) {
  for (const s of [1, -1]) {
    const side = s > 0 ? 2 : 1, x = SX * s, sw = -0.8 * s;
    b.limb(0.064, 0.056, [x, SH, 0], [x + 0.03 * s, 1.17, 0], 6, W, R.arm(side, sw, SH, x, TOP));
    b.limb(0.05, 0.044, [x + 0.03 * s, 1.18, 0], [x + 0.035 * s, 0.9, 0.03], 6, W, R.arm(side, sw, SH, x, SKIN));
    b.sphere(0.055, 0, W, R.arm(side, sw, SH, x, SKIN), x + 0.035 * s, 0.86, 0.035);
  }
}

function head(b, y = 1.63) {
  b.cyl(0.055, 0.062, 0.12, 6, W, R.region(SKIN), 0, y - 0.13, 0);
  b.sphere(0.13, 1, W, R.region(SKIN), 0, y, 0.01, 1, 1.08, 1);
  b.box(0.034, 0.05, 0.05, W, R.region(SKIN), 0, y - 0.02, 0.14);
  for (const s of [1, -1]) b.box(0.028, 0.038, 0.02, '#2a2018', R.fixed, 0.048 * s, y + 0.02, 0.128);
}

// Short hair, trousers or shorts (LOWER = trousers colour or skin).
export function personMale() {
  const b = new RigBuilder();
  legs(b, BOTTOM);
  b.box(0.36, 0.2, 0.23, W, R.region(BOTTOM), 0, 0.95, 0);
  b.cyl(0.21, 0.18, 0.5, 8, W, R.region(TOP), 0, 1.2, 0, 0, 0, 0, 1, 0.62);
  b.cyl(0.215, 0.21, 0.06, 8, W, R.region(TOP), 0, 1.45, 0, 0, 0, 0, 1, 0.66);
  arms(b);
  head(b);
  b.dome(0.142, 8, 3, W, R.region(HAIR), 0, 1.645, -0.01, 1, 0.85, 1.05, -0.25);
  b.box(0.25, 0.13, 0.1, W, R.region(HAIR), 0, 1.6, -0.085);
  return b.build();
}

// Long hair and a skirt (LOWER = bare legs or leggings).
export function personFemale() {
  const b = new RigBuilder();
  legs(b, LOWER, 0.9);
  b.cyl(0.19, 0.28, 0.44, 8, W, R.region(BOTTOM), 0, 0.79, 0, 0, 0, 0, 1, 0.82);
  b.cyl(0.19, 0.16, 0.5, 8, W, R.region(TOP), 0, 1.2, 0, 0, 0, 0, 1, 0.62);
  b.cyl(0.2, 0.19, 0.06, 8, W, R.region(TOP), 0, 1.45, 0, 0, 0, 0, 1, 0.66);
  arms(b);
  head(b);
  b.dome(0.145, 8, 3, W, R.region(HAIR), 0, 1.645, -0.01, 1, 0.9, 1.06, -0.2);
  b.box(0.27, 0.36, 0.11, W, R.region(HAIR), 0, 1.53, -0.075);
  for (const s of [1, -1]) b.box(0.05, 0.24, 0.1, W, R.region(HAIR), 0.125 * s, 1.56, 0.0);
  return b.build();
}

// --- dog ----------------------------------------------------------------------------------
export function dog() {
  const b = new RigBuilder();
  b.cyl(0.14, 0.13, 0.6, 6, W, R.region(TOP), 0, 0.47, -0.02, Math.PI / 2, 0, 0, 0.95, 1);
  b.sphere(0.16, 0, W, R.region(TOP), 0, 0.5, 0.25, 0.95, 1, 1);
  b.box(0.22, 0.22, 0.24, W, R.region(TOP), 0, 0.66, 0.38);
  b.box(0.13, 0.11, 0.15, W, R.region(TOP), 0, 0.6, 0.54);
  b.box(0.06, 0.05, 0.04, '#1a1412', R.fixed, 0, 0.64, 0.62);
  b.box(0.06, 0.02, 0.08, '#e47a8a', R.fixed, 0, 0.53, 0.57);
  for (const s of [1, -1]) {
    b.box(0.05, 0.15, 0.1, W, R.region(HAIR), 0.12 * s, 0.66, 0.35, 0, 0, 0.3 * s);
    b.box(0.03, 0.035, 0.02, '#1a1412', R.fixed, 0.06 * s, 0.7, 0.5);
  }
  b.limb(0.035, 0.02, [0, 0.55, -0.3], [0, 0.8, -0.47], 4, W, R.region(TOP));
  b.cyl(0.11, 0.11, 0.05, 6, W, R.region(ACCENT), 0, 0.6, 0.31, 0.6);
  for (const [x, z, sw] of [[0.09, 0.22, 1], [-0.09, 0.22, -1], [0.09, -0.24, -1], [-0.09, -0.24, 1]]) {
    b.limb(0.048, 0.042, [x, 0.42, z], [x, 0.16, z], 5, W, R.leg(sw, 0.42, z, TOP));
    b.limb(0.04, 0.04, [x, 0.17, z], [x, 0.02, z + 0.02], 5, W, R.leg(sw, 0.42, z, LOWER));
  }
  return b.build();
}

// --- cyclist on a city bike -----------------------------------------------------------------
function wheel(b, z, r, y = r) {
  b.place(new THREE.TorusGeometry(r - 0.03, 0.035, 4, 14), '#26262a', R.fixed, 0, y, z, 0, Math.PI / 2, 0);
  b.box(0.02, (r - 0.04) * 2, 0.02, '#c8c8c8', R.fixed, 0, y, z);
  b.box(0.02, 0.02, (r - 0.04) * 2, '#c8c8c8', R.fixed, 0, y, z);
  b.cyl(0.05, 0.05, 0.08, 6, '#9a9a9a', R.fixed, 0, y, z, 0, 0, Math.PI / 2);
}

export function cyclist() {
  const b = new RigBuilder();
  wheel(b, 0.52, 0.34); wheel(b, -0.52, 0.34);
  const fr = R.region(ACCENT);
  b.limb(0.025, 0.025, [0, 0.88, -0.13], [0, 0.86, 0.38], 5, W, fr);
  b.limb(0.03, 0.03, [0, 0.4, -0.02], [0, 0.84, 0.39], 5, W, fr);
  b.limb(0.025, 0.025, [0, 0.4, -0.02], [0, 0.93, -0.16], 5, W, fr);
  b.limb(0.02, 0.02, [0, 0.4, -0.02], [0, 0.34, -0.52], 4, W, fr);
  b.limb(0.02, 0.02, [0, 0.88, -0.13], [0, 0.34, -0.52], 4, W, fr);
  b.limb(0.022, 0.022, [0, 0.9, 0.39], [0, 0.34, 0.52], 4, W, fr);
  b.limb(0.02, 0.02, [0, 0.9, 0.39], [0, 1.06, 0.34], 4, '#2b2b2e', R.fixed);
  b.limb(0.018, 0.018, [-0.27, 1.06, 0.34], [0.27, 1.06, 0.34], 4, '#2b2b2e', R.fixed);
  b.box(0.13, 0.05, 0.24, '#26262a', R.fixed, 0, 0.97, -0.16);
  b.box(0.32, 0.2, 0.26, '#b98b4a', R.fixed, 0, 1.0, 0.58);
  b.box(0.36, 0.03, 0.4, W, fr, 0, 0.62, -0.5);
  // rider
  const hipY = 1.02, hipZ = -0.12;
  for (const s of [1, -1]) {
    const x = 0.11 * s;
    b.limb(0.085, 0.075, [x, hipY, hipZ], [x, 0.78, 0.2], 6, W, R.leg(s, hipY, hipZ, BOTTOM));
    b.limb(0.07, 0.058, [x, 0.79, 0.2], [x, 0.44, 0.04], 6, W, R.leg(s, hipY, hipZ, LOWER));
    b.box(0.12, 0.08, 0.24, W, R.leg(s, hipY, hipZ, SKIN), x, 0.42, 0.08);
  }
  b.box(0.34, 0.18, 0.24, W, R.region(BOTTOM), 0, 1.05, -0.12);
  b.cyl(0.2, 0.17, 0.5, 8, W, R.region(TOP), 0, 1.3, 0.0, 0.42, 0, 0, 1, 0.62);
  for (const s of [1, -1]) {
    const sh = [0.22 * s, 1.5, 0.08], el = [0.25 * s, 1.27, 0.24], ha = [0.26 * s, 1.08, 0.34];
    b.limb(0.06, 0.055, sh, el, 6, W, R.region(TOP));
    b.limb(0.05, 0.045, el, ha, 6, W, R.region(SKIN));
  }
  b.cyl(0.055, 0.062, 0.12, 6, W, R.region(SKIN), 0, 1.57, 0.14);
  b.sphere(0.13, 1, W, R.region(SKIN), 0, 1.69, 0.2, 1, 1.08, 1);
  for (const s of [1, -1]) b.box(0.028, 0.038, 0.02, '#2a2018', R.fixed, 0.048 * s, 1.71, 0.318);
  b.dome(0.15, 8, 3, W, R.region(HAIR), 0, 1.71, 0.18, 1, 0.9, 1.12, -0.15);
  return b.build();
}

// --- risciò: the 4-wheel pedal surrey rented on the Pincio ------------------------------------
function seatedRider(b, x, topReg, armSide) {
  const hipY = 0.82, hipZ = -0.18;
  for (const s of [1, -1]) {
    const lx = x + 0.1 * s;
    b.limb(0.085, 0.075, [lx, hipY, hipZ], [lx, 0.86, 0.22], 6, W, R.leg(s, hipY, hipZ, LOWER));
    b.limb(0.07, 0.06, [lx, 0.86, 0.23], [lx, 0.47, 0.36], 6, W, R.leg(s, hipY, hipZ, LOWER));
    b.box(0.12, 0.08, 0.24, '#f2f2f2', R.leg(s, hipY, hipZ, 0), lx, 0.45, 0.42);
  }
  b.cyl(0.19, 0.16, 0.48, 8, W, R.region(topReg), x, 1.1, -0.2, -0.08, 0, 0, 1, 0.62);
  b.cyl(0.055, 0.062, 0.12, 6, W, R.region(SKIN), x, 1.41, -0.22);
  b.sphere(0.13, 1, W, R.region(SKIN), x, 1.54, -0.21, 1, 1.08, 1);
  for (const s of [1, -1]) b.box(0.028, 0.038, 0.02, '#2a2018', R.fixed, x + 0.048 * s, 1.56, -0.09);
  b.dome(0.142, 8, 3, W, R.region(HAIR), x, 1.555, -0.22, 1, 0.88, 1.05, -0.25);
  // inner arm rests forward, outer arm can rise
  for (const s of [1, -1]) {
    const sx = x + 0.22 * s, outer = (armSide === 2) === (s > 0);
    if (outer) {
      const side = armSide;
      b.limb(0.06, 0.055, [sx, 1.32, -0.2], [sx + 0.02 * s, 1.07, -0.18], 6, W, R.arm(side, 0, 1.32, sx, topReg));
      b.limb(0.05, 0.045, [sx + 0.02 * s, 1.08, -0.18], [sx + 0.02 * s, 1.0, 0.1], 6, W, R.arm(side, 0, 1.32, sx, SKIN));
    } else {
      b.limb(0.06, 0.055, [sx, 1.32, -0.2], [sx, 1.08, -0.08], 6, W, R.region(topReg));
      b.limb(0.05, 0.045, [sx, 1.08, -0.08], [x + 0.08 * s, 1.0, 0.22], 6, W, R.region(SKIN));
    }
  }
}

export function risciò() {
  const b = new RigBuilder();
  const frame = '#33343a';
  for (const [x, z] of [[0.66, 0.82], [-0.66, 0.82], [0.66, -0.82], [-0.66, -0.82]]) {
    b.cyl(0.26, 0.26, 0.12, 10, '#26262a', R.fixed, x, 0.26, z, 0, 0, Math.PI / 2);
    b.cyl(0.12, 0.12, 0.13, 8, '#d9d9d9', R.fixed, x, 0.26, z, 0, 0, Math.PI / 2);
  }
  b.box(1.22, 0.07, 2.0, frame, R.fixed, 0, 0.42, 0);
  b.box(1.34, 0.1, 0.12, frame, R.fixed, 0, 0.42, 1.02);
  b.box(1.34, 0.1, 0.12, frame, R.fixed, 0, 0.42, -1.02);
  b.box(1.24, 0.12, 0.48, '#2b2c33', R.fixed, 0, 0.74, -0.24);
  b.box(1.24, 0.5, 0.08, W, R.region(ACCENT), 0, 1.02, -0.52);
  b.box(0.08, 0.3, 0.48, frame, R.fixed, 0.62, 0.62, -0.24);
  b.box(0.08, 0.3, 0.48, frame, R.fixed, -0.62, 0.62, -0.24);
  // front bench for little ones, with a child on it
  b.box(1.0, 0.32, 0.5, W, R.region(ACCENT), 0, 0.62, 0.72);
  b.box(1.0, 0.06, 0.52, '#f4f1ea', R.fixed, 0, 0.8, 0.72);
  b.cyl(0.13, 0.11, 0.3, 8, W, R.region(TOP), 0, 0.98, 0.7, 0, 0, 0, 1, 0.65);
  b.sphere(0.11, 1, W, R.region(SKIN), 0, 1.24, 0.7);
  b.dome(0.12, 8, 3, W, R.region(HAIR), 0, 1.255, 0.69, 1, 0.85, 1.05, -0.25);
  for (const s of [1, -1]) b.box(0.024, 0.032, 0.02, '#2a2018', R.fixed, 0.04 * s, 1.26, 0.805);
  // steering wheel for the left rider
  b.limb(0.02, 0.02, [0.3, 0.45, 0.42], [0.3, 0.98, 0.22], 4, frame, R.fixed);
  b.place(new THREE.TorusGeometry(0.15, 0.025, 4, 10), '#202024', R.fixed, 0.3, 1.0, 0.2, -1.1, 0, 0);
  seatedRider(b, 0.32, TOP, 2);
  seatedRider(b, -0.32, BOTTOM, 1);
  // fringed, striped canopy
  for (const [x, z] of [[0.64, 0.95], [-0.64, 0.95], [0.64, -0.55], [-0.64, -0.55]]) {
    b.limb(0.025, 0.025, [x, 0.45, z], [x, 2.0, z], 5, '#e2e2e2', R.fixed);
  }
  b.box(1.5, 0.07, 1.8, W, R.region(ACCENT), 0, 2.03, 0.2);
  for (const x of [-0.5, 0, 0.5]) b.box(0.24, 0.08, 1.81, '#fbf7ee', R.fixed, x, 2.03, 0.2);
  for (let i = 0; i < 8; i++) {
    const x = -0.66 + i * 0.19, white = i % 2 === 1;
    for (const z of [1.1, -0.7]) b.box(0.17, 0.13, 0.02, white ? '#fbf7ee' : W, white ? R.fixed : R.region(ACCENT), x, 1.94, z);
  }
  return b.build();
}

// --- Carabiniere on horseback ---------------------------------------------------------------
export function mountedCarabiniere() {
  const b = new RigBuilder();
  const coat = R.region(TOP), dark = R.region(HAIR);
  b.cyl(0.36, 0.34, 1.2, 8, W, coat, 0, 1.32, -0.05, Math.PI / 2, 0, 0, 0.82, 1);
  b.sphere(0.37, 1, W, coat, 0, 1.33, 0.52, 0.8, 0.98, 0.9);
  b.sphere(0.37, 1, W, coat, 0, 1.36, -0.62, 0.86, 0.95, 0.9);
  b.limb(0.2, 0.15, [0, 1.42, 0.62], [0, 2.02, 0.98], 6, W, coat);
  b.box(0.22, 0.25, 0.56, W, coat, 0, 2.02, 1.18, 0.75);
  b.box(0.18, 0.2, 0.18, '#3a2a22', R.fixed, 0, 1.79, 1.38, 0.75);
  for (const s of [1, -1]) {
    b.cone(0.04, 0.13, 4, W, dark, 0.07 * s, 2.24, 1.0, -0.2);
    b.box(0.03, 0.04, 0.03, '#120d0a', R.fixed, 0.11 * s, 2.1, 1.16);
  }
  b.limb(0.055, 0.045, [0, 1.75, 0.6], [0, 2.22, 0.92], 5, W, dark);
  b.limb(0.08, 0.035, [0, 1.48, -0.95], [0, 0.85, -1.1], 5, W, dark);
  for (const [x, z, sw] of [[0.19, 0.5, 1], [-0.19, 0.5, -1], [0.19, -0.6, -1], [-0.19, -0.6, 1]]) {
    b.limb(0.095, 0.07, [x, 1.15, z], [x, 0.48, z], 6, W, R.leg(sw, 1.12, z, TOP));
    b.limb(0.058, 0.058, [x, 0.5, z], [x, 0.09, z], 5, W, R.leg(sw, 1.12, z, HAIR));
    b.box(0.12, 0.09, 0.15, '#1a1513', R.leg(sw, 1.12, z, 0), x, 0.045, z + 0.02);
  }
  // saddle cloth, saddle, reins
  b.box(0.76, 0.34, 0.66, '#1c2540', R.fixed, 0, 1.6, -0.04);
  b.box(0.78, 0.05, 0.68, '#b3202a', R.fixed, 0, 1.45, -0.04);
  b.box(0.5, 0.1, 0.56, '#3b2416', R.fixed, 0, 1.73, -0.04);
  // rider: dark navy uniform, red trouser stripe, white bandolier and belt, black helmet
  const navy = '#1b2233', red = '#c0262d';
  for (const s of [1, -1]) {
    b.limb(0.09, 0.08, [0.15 * s, 1.84, -0.04], [0.33 * s, 1.52, 0.16], 6, navy, R.fixed);
    b.limb(0.072, 0.065, [0.33 * s, 1.52, 0.16], [0.33 * s, 1.1, 0.04], 6, '#141414', R.fixed);
    b.limb(0.02, 0.02, [0.23 * s, 1.72, 0.12], [0.36 * s, 1.5, 0.21], 3, red, R.fixed);
    b.box(0.12, 0.09, 0.26, '#101010', R.fixed, 0.33 * s, 1.05, 0.1);
  }
  b.box(0.36, 0.2, 0.26, navy, R.fixed, 0, 1.88, -0.05);
  b.cyl(0.205, 0.175, 0.5, 8, navy, R.fixed, 0, 2.15, -0.04, 0.05, 0, 0, 1, 0.62);
  b.cyl(0.19, 0.19, 0.06, 8, '#f4f4f4', R.fixed, 0, 1.96, -0.04, 0, 0, 0, 1, 0.66);
  b.box(0.06, 0.58, 0.03, '#f4f4f4', R.fixed, 0, 2.17, 0.085, 0, 0, 0.62);
  b.cyl(0.055, 0.062, 0.12, 6, W, R.region(SKIN), 0, 2.44, -0.03);
  b.sphere(0.13, 1, W, R.region(SKIN), 0, 2.57, -0.02, 1, 1.08, 1);
  for (const s of [1, -1]) b.box(0.028, 0.038, 0.02, '#2a2018', R.fixed, 0.048 * s, 2.59, 0.1);
  b.dome(0.15, 8, 4, '#141414', R.fixed, 0, 2.6, -0.03, 1, 0.95, 1.08, -0.1);
  b.box(0.2, 0.025, 0.09, '#141414', R.fixed, 0, 2.62, 0.13, 0.25);
  b.box(0.05, 0.05, 0.02, '#e4c25a', R.fixed, 0, 2.7, 0.14);
  // left hand holds the reins, right arm hangs and can wave
  b.limb(0.064, 0.056, [0.235, 2.38, -0.03], [0.26, 2.12, 0.12], 6, navy, R.fixed);
  b.limb(0.05, 0.045, [0.26, 2.12, 0.12], [0.12, 1.98, 0.36], 6, navy, R.fixed);
  b.limb(0.012, 0.012, [0.1, 1.97, 0.38], [0.11, 1.95, 1.2], 3, '#2a1a10', R.fixed);
  b.limb(0.012, 0.012, [0.1, 1.97, 0.38], [-0.11, 1.95, 1.2], 3, '#2a1a10', R.fixed);
  const x = -0.235;
  b.limb(0.064, 0.056, [x, 2.38, -0.03], [x - 0.03, 2.11, -0.03], 6, navy, R.arm(1, 0, 2.38, x, 0));
  b.limb(0.05, 0.044, [x - 0.03, 2.12, -0.03], [x - 0.035, 1.86, 0.0], 6, navy, R.arm(1, 0, 2.38, x, 0));
  b.box(0.08, 0.1, 0.07, '#f2f2f2', R.arm(1, 0, 2.38, x, 0), x - 0.035, 1.82, 0.0);
  return b.build();
}

// --- birds ----------------------------------------------------------------------------------
function pigeonBody(b, flying) {
  b.sphere(0.1, 1, W, R.region(TOP), 0, 0.16, 0, 1, 0.92, 1.55);
  b.sphere(0.07, 0, W, R.region(HAIR), 0, 0.245, 0.1);
  b.sphere(0.06, 0, W, R.region(TOP), 0, 0.305, 0.145);
  b.cone(0.02, 0.07, 4, '#3a3536', R.fixed, 0, 0.297, 0.215, Math.PI / 2);
  const tailW = flying ? 0.16 : 0.1;
  b.box(tailW, 0.024, 0.17, W, R.region(TOP), 0, flying ? 0.16 : 0.18, -0.21, flying ? 0 : -0.3);
  b.box(tailW + 0.002, 0.026, 0.045, '#2b2a30', R.fixed, 0, flying ? 0.16 : 0.155, flying ? -0.28 : -0.275, flying ? 0 : -0.3);
}

export function pigeon() {
  const b = new RigBuilder();
  pigeonBody(b, false);
  for (const s of [1, -1]) {
    b.box(0.02, 0.1, 0.23, W, R.region(BOTTOM), 0.088 * s, 0.185, -0.04, 0.12);
    b.box(0.022, 0.03, 0.06, '#2b2a30', R.fixed, 0.09 * s, 0.165, -0.08, 0.12);
    b.box(0.018, 0.075, 0.018, '#d15a6a', R.fixed, 0.035 * s, 0.035, 0.02);
  }
  return b.build();
}

// Wings hang down from the shoulders; raise them ~pi/2 to spread, and flap around that.
export function pigeonFlying() {
  const b = new RigBuilder();
  pigeonBody(b, true);
  for (const s of [1, -1]) {
    const side = s > 0 ? 2 : 1, x = 0.07 * s;
    const rg = (reg) => R.arm(side, 0, 0.22, x, reg);
    b.box(0.018, 0.2, 0.2, W, rg(BOTTOM), x, 0.12, 0.0);
    b.box(0.016, 0.16, 0.13, W, rg(BOTTOM), x, -0.06, -0.03);
    b.box(0.02, 0.1, 0.12, '#3b3a40', rg(0), x, -0.15, -0.04);
  }
  return b.build();
}

// Mallard mother; ducklings use the same model, smaller and yellow.
export function duck() {
  const b = new RigBuilder();
  b.sphere(0.15, 1, W, R.region(TOP), 0, 0.17, 0, 1, 0.82, 1.6);
  b.cone(0.07, 0.15, 4, W, R.region(TOP), 0, 0.22, -0.25, -2.0);
  b.sphere(0.09, 1, W, R.region(HAIR), 0, 0.35, 0.17);
  b.box(0.075, 0.03, 0.11, W, R.region(ACCENT), 0, 0.33, 0.28);
  for (const s of [1, -1]) {
    b.box(0.02, 0.03, 0.02, '#141414', R.fixed, 0.068 * s, 0.37, 0.22);
    b.box(0.02, 0.05, 0.12, '#f4f4f4', R.region(BOTTOM), 0.143 * s, 0.19, -0.05);
    b.box(0.022, 0.035, 0.09, '#3d66c9', R.region(BOTTOM), 0.145 * s, 0.19, -0.05);
    b.box(0.05, 0.02, 0.08, W, R.leg(s, 0.1, 0, ACCENT), 0.06 * s, 0.01, 0.04);
    b.box(0.02, 0.08, 0.02, W, R.leg(s, 0.1, 0, ACCENT), 0.06 * s, 0.05, 0.0);
  }
  return b.build();
}

// --- collectibles ---------------------------------------------------------------------------
// Gelato cone: origin at the tip, ~1.6 tall. Scoops tinted by TOP / BOTTOM / SKIN.
export function gelato() {
  const b = new RigBuilder();
  // waffle cone: checkered facets (ConeGeometry lists its side quads row by row, 2 triangles each)
  const seg = 12;
  b.place(new THREE.ConeGeometry(0.27, 0.7, seg, 4), '#e2ad62', R.fixed, 0, 0.35, 0, Math.PI);
  b.paintLast((f) => {
    const q = f >> 1;
    if (q >= seg * 4) return null;
    return ((q % seg) + Math.floor(q / seg)) % 2 ? '#c98a40' : null;
  });
  b.cyl(0.295, 0.27, 0.09, seg, '#cf9447', R.fixed, 0, 0.71, 0);
  b.sphere(0.3, 1, W, R.region(TOP), 0, 0.86, 0, 1, 0.86, 1);
  b.sphere(0.27, 1, W, R.region(BOTTOM), 0.02, 1.15, 0.01, 1, 0.9, 1);
  b.sphere(0.215, 1, W, R.region(SKIN), -0.01, 1.4, 0, 1, 0.92, 1);
  b.box(0.05, 0.4, 0.14, '#f0d08c', R.fixed, 0.16, 1.24, 0.08, 0, 0, -0.45);
  b.sphere(0.08, 1, '#d61f3c', R.fixed, 0, 1.61, 0);
  b.limb(0.01, 0.008, [0, 1.67, 0], [0.04, 1.79, -0.02], 3, '#5b8a2a', R.fixed);
  return b.build();
}

// Golden pine cone (the umbrella pine's pigna): an egg covered in rows of low rhombic knobs.
export function pineCone() {
  const b = new RigBuilder();
  b.sphere(0.24, 1, '#b8862a', R.fixed, 0, 0.43, 0, 1, 1.5, 1);
  const rows = [[0.12, 0.16], [0.24, 0.235], [0.37, 0.265], [0.5, 0.25], [0.62, 0.2], [0.72, 0.12]];
  rows.forEach(([y, r], k) => {
    const n = k === rows.length - 1 ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const a = ((i + (k % 2) * 0.5) / n) * Math.PI * 2;
      const col = (i + k) % 3 === 0 ? '#ffe58a' : '#f5c842';
      b.aim(new THREE.ConeGeometry(0.1, 0.07, 4), col, R.fixed, Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(a), -0.25, Math.sin(a));
    }
  });
  b.cyl(0.035, 0.045, 0.08, 5, '#7a5126', R.fixed, 0, 0.02, 0);
  return b.build();
}

// --- obstacles ------------------------------------------------------------------------------
// Classic black and white football, r = 0.3 (centre at origin).
export function football(r = 0.3) {
  const b = new RigBuilder();
  b.add(new THREE.IcosahedronGeometry(r, 2), '#f7f7f4');
  const g = b.parts[0];
  const pos = g.attributes.position, col = g.attributes.color;
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const ip = ico.attributes.position;
  const dirs = [];
  for (let i = 0; i < ip.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ip, i).normalize();
    if (!dirs.some((d) => d.distanceTo(v) < 1e-3)) dirs.push(v);
  }
  ico.dispose();
  const black = new THREE.Color('#1d1d22');
  const v = new THREE.Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.x += pos.getX(f + k), v.y += pos.getY(f + k), v.z += pos.getZ(f + k);
    v.normalize();
    if (dirs.some((d) => d.dot(v) > 0.94)) for (let k = 0; k < 3; k++) col.setXYZ(f + k, black.r, black.g, black.b);
  }
  return b.build();
}

// Italian road cone, 0.75 tall, orange with two white bands.
export function trafficCone() {
  const b = new RigBuilder();
  b.box(0.46, 0.05, 0.46, '#2f2f33', R.fixed, 0, 0.025, 0);
  const rAt = (y) => 0.2 - (y - 0.05) * 0.235;
  const bands = [[0.05, 0.3, '#f0561d'], [0.3, 0.42, '#fafafa'], [0.42, 0.53, '#f0561d'], [0.53, 0.62, '#fafafa'], [0.62, 0.76, '#f0561d']];
  for (const [y0, y1, c] of bands) b.cyl(rAt(y1), rAt(y0), y1 - y0, 10, c, R.fixed, 0, (y0 + y1) / 2, 0);
  return b.build();
}

// Balloon on a 1 m string; origin at the bottom of the string (the seller's hand).
export function balloon() {
  const b = new RigBuilder();
  b.limb(0.007, 0.007, [0, 0, 0], [0, 1.02, 0], 3, '#f0f0f0', R.fixed);
  b.cone(0.045, 0.07, 5, W, R.region(TOP), 0, 1.04, 0, Math.PI);
  b.ball(0.27, 10, 8, W, R.region(TOP), 0, 1.33, 0, 1, 1.18, 1);
  b.sphere(0.05, 0, '#ffffff', R.fixed, 0.1, 1.44, 0.2);
  return b.build();
}

// --- static scenery: "lavori in corso" (roadworks) ------------------------------------------
// Barrier + warning sign + sand heap with a shovel, built around (0,0) facing +z; returns parts
// pushed into the given RigBuilder with a placement matrix.
export function roadworks(b, m) {
  const local = new RigBuilder();
  const red = '#d42a2a', white = '#f6f4ef';
  // red/white barrier on two A-frame legs
  for (const x of [-1.05, 1.05]) {
    local.limb(0.03, 0.03, [x, 0, -0.25], [x, 1.0, 0], 4, '#f2f2f2', R.fixed);
    local.limb(0.03, 0.03, [x, 0, 0.25], [x, 1.0, 0], 4, '#f2f2f2', R.fixed);
  }
  for (let i = 0; i < 8; i++) local.box(0.275, 0.24, 0.04, i % 2 ? white : red, R.fixed, -0.96 + i * 0.275, 0.85, 0.02);
  // triangular warning sign on a tripod (temporary signs in Italy are yellow)
  const sx = 1.9;
  local.limb(0.022, 0.022, [sx, 0, 0.2], [sx, 1.05, 0], 4, '#5a5a5a', R.fixed);
  local.limb(0.022, 0.022, [sx - 0.18, 0, -0.15], [sx, 1.05, 0], 4, '#5a5a5a', R.fixed);
  local.limb(0.022, 0.022, [sx + 0.18, 0, -0.15], [sx, 1.05, 0], 4, '#5a5a5a', R.fixed);
  const tri = (r) => {
    const s = new THREE.Shape();
    s.moveTo(0, r); s.lineTo(-r * 0.866, -r * 0.5); s.lineTo(r * 0.866, -r * 0.5); s.closePath();
    return s;
  };
  local.place(new THREE.ExtrudeGeometry(tri(0.5), { depth: 0.03, bevelEnabled: false }), red, R.fixed, sx, 1.3, 0.04);
  local.place(new THREE.ExtrudeGeometry(tri(0.36), { depth: 0.03, bevelEnabled: false }), '#f4c625', R.fixed, sx, 1.27, 0.055);
  // the little digging worker on the sign
  local.box(0.06, 0.13, 0.02, '#1b1b1b', R.fixed, sx - 0.02, 1.25, 0.09, 0, 0, 0.35);
  local.sphere(0.035, 0, '#1b1b1b', R.fixed, sx - 0.06, 1.34, 0.09);
  local.box(0.02, 0.18, 0.02, '#1b1b1b', R.fixed, sx + 0.07, 1.2, 0.09, 0, 0, -0.6);
  local.box(0.16, 0.05, 0.02, '#1b1b1b', R.fixed, sx + 0.1, 1.12, 0.09);
  // sand heap and shovel behind the barrier
  local.cone(0.75, 0.55, 8, '#cdb27a', R.fixed, -0.3, 0.27, -1.0);
  local.cone(0.5, 0.4, 7, '#c2a46a', R.fixed, 0.5, 0.2, -1.3);
  local.limb(0.025, 0.025, [-0.2, 0.3, -1.0], [-0.05, 1.25, -0.85], 4, '#8a5a32', R.fixed);
  local.box(0.22, 0.28, 0.03, '#6b6f75', R.fixed, -0.22, 0.32, -1.02, 0.15);
  const g = local.build();
  g.applyMatrix4(m);
  b.parts.push(g);
}

// Puddles: irregular sky-coloured pools with a wet rim, draped over the terrain.
export function puddles(list, heightAt) {
  const pos = [], col = [];
  const cIn = new THREE.Color('#c7e2f3'), cMid = new THREE.Color('#86b4d4'), cRim = new THREE.Color('#9a8763');
  const push = (x, z, c, lift) => { pos.push(x, heightAt(x, z) + lift, z); col.push(c.r, c.g, c.b); };
  for (const p of list) {
    const n = 14, ring = [], rim = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = p.r * (0.78 + 0.22 * Math.sin(a * 2 + p.seed) * Math.cos(a * 3 - p.seed * 1.7)) ;
      ring.push([p.x + Math.cos(a) * r * p.sx, p.z + Math.sin(a) * r]);
      rim.push([p.x + Math.cos(a) * (r + 0.32) * p.sx, p.z + Math.sin(a) * (r + 0.32)]);
    }
    const rot = (q) => {
      const dx = q[0] - p.x, dz = q[1] - p.z, c = Math.cos(p.rot), s = Math.sin(p.rot);
      return [p.x + dx * c - dz * s, p.z + dx * s + dz * c];
    };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = rot(ring[i]), bq = rot(ring[j]), ra = rot(rim[i]), rb = rot(rim[j]);
      push(p.x, p.z, cIn, 0.07); push(bq[0], bq[1], cMid, 0.07); push(a[0], a[1], cMid, 0.07);
      push(a[0], a[1], cMid, 0.07); push(rb[0], rb[1], cRim, 0.05); push(ra[0], ra[1], cRim, 0.05);
      push(a[0], a[1], cMid, 0.07); push(bq[0], bq[1], cMid, 0.07); push(rb[0], rb[1], cRim, 0.05);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
