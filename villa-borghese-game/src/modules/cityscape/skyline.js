// Rome beyond the edge of the terrain, drawn with the hazy skyline material: a sea of roofs on
// the world's horizon ring, the Tiber's plane trees, St Peter's (pulled in to ~850 units from the
// Pincio terrace so it reads big on the horizon), Castel Sant'Angelo, the Palace of Justice,
// the domes of the centre, the Vittoriano, and the green ridges of Monte Mario and the Gianicolo.
import * as THREE from 'three';
import { CityBuilder } from './builder.js';
import { mat, addDome } from './buildings.js';
import { BAY, FLOOR, TILE } from './atlas.js';
import { noise2 } from '../../core/rng.js';

const TERRACE = [-322, 116];
const TRAV = '#ebe4d4', LEAD = '#9aa3a8', BRONZE = '#5b4a33';
const WALLS = ['#d9a35a', '#e4b863', '#c9774a', '#ebcf8a', '#dd9a76', '#efe0c0', '#e6c48e', '#c47a48', '#e8b8a2'];
const ROOFS = ['#b5532f', '#a94b2c', '#bd5f38', '#9e4a2f', '#b8653f'];

// Point along a bearing (radians from +x towards +z) from the terrace.
function fromTerrace(bearing, dist) {
  return [TERRACE[0] + Math.cos(bearing) * dist, TERRACE[1] + Math.sin(bearing) * dist];
}
const deg = (d) => (d * Math.PI) / 180;

export function buildSkyline(ctx, material) {
  const T = ctx.terrain, E = T.extent;
  const cb = new CityBuilder();
  const rnd = ctx.rng('cityscape:skyline');
  const cx = (E.minX + E.maxX) / 2, cz = (E.minZ + E.maxZ) / 2;
  const density = ctx.quality.tier === 'low' ? 0.6 : 1;

  // ground height of the world's horizon ring (flat land out from the terrain edge)
  const groundY = (x, z) => {
    const dx = x - cx, dz = z - cz, R = Math.hypot(dx, dz) || 1;
    const ux = dx / R, uz = dz / R;
    const tx = ux > 0 ? (E.maxX - cx) / ux : ux < 0 ? (E.minX - cx) / ux : Infinity;
    const tz = uz > 0 ? (E.maxZ - cz) / uz : uz < 0 ? (E.minZ - cz) / uz : Infinity;
    const t0 = Math.min(tx, tz) - 0.75;
    const eh = T.heightAt(cx + ux * t0, cz + uz * t0);
    const r = R - t0;
    if (r < 40) return eh - 0.05 - (0.35 * Math.max(0, r)) / 40;
    if (r < 260) return eh - 0.4 + ((-3 - eh + 0.4) * (r - 40)) / 220;
    return -3;
  };
  const outsideRect = (x, z, m) => x < E.minX - m || x > E.maxX + m || z < E.minZ - m || z > E.maxZ + m;

  // landmarks first, so the roofs keep clear of them
  const clear = [];
  const keep = (x, z, r) => clear.push([x, z, r]);
  const sp = fromTerrace(Math.atan2(658.6 - 116, -1416.5 + 322), 820);
  stPeters(cb, sp[0], groundY(sp[0], sp[1]), sp[1], 1.3); keep(sp[0] + 50, sp[1], 160);
  castelSantAngelo(cb, -851, groundY(-851, 602), 602); keep(-851, 602, 45);
  palazzoGiustizia(cb, -600, groundY(-600, 575), 575); keep(-600, 575, 50);
  vittoriano(cb, -86, groundY(-86, 1060), 1060); keep(-86, 1060, 60);
  for (const [x, z, r, h] of [[-341, 456, 7.5, 24], [-369, 876, 0, 0], [-541, 863, 6.5, 22], [-532, 1052, 9, 26], [-310, 1060, 7, 22], [-215, 760, 5.5, 20], [-660, 980, 6, 20]]) {
    const y = groundY(x, z);
    if (r === 0) { pantheon(cb, x, y, z); keep(x, z, 25); continue; }
    cb.geo(new THREE.BoxGeometry(r * 2.6, h, r * 3.6), mat(x, y + h / 2 - 1, z), '#e3cfa8', 'classic', [3, h / FLOOR]);
    addDome(cb, x, y + h - 1, z, r, { drum: '#ece2cc', dome: LEAD });
    keep(x, z, r * 2.4);
  }
  hills(cb, rnd);
  tiberTrees(cb, groundY, outsideRect);

  // the sea of roofs
  let blocks = 0;
  const STEP = 24;
  for (let gx = -1500; gx <= 1600; gx += STEP) {
    for (let gz = -1500; gz <= 1500; gz += STEP) {
      const x = gx + (rnd() - 0.5) * 10, z = gz + (rnd() - 0.5) * 10;
      if (!outsideRect(x, z, 6)) continue;
      const dOut = Math.max(E.minX - x, x - E.maxX, E.minZ - z, z - E.maxZ);
      const bearing = Math.atan2(z - TERRACE[1], x - TERRACE[0]);
      // the long view west from the Pincio gets the full sea of roofs; elsewhere a band beyond
      // the terrain edge is enough (further out it is lost in the fog anyway)
      const west = Math.cos(bearing - deg(160)) > 0.55;
      if (Math.hypot(x - cx, z - cz) > 1180 || (!west && dOut > 240)) { rnd(); continue; }
      const p = density * (west ? 1 : 0.6) * Math.max(0.25, Math.min(1, 1.3 - dOut / 650));
      if (rnd() > p) continue;
      if (clear.some(([qx, qz, r]) => Math.hypot(qx - x, qz - z) < r)) continue;
      if (onTiber(x, z)) continue;
      const big = 1 + dOut / 500;
      const w = (9 + rnd() * 9) * big, d = (8 + rnd() * 8) * big;
      const ang = Math.round(noise2(x / 400, z / 400) * 3) * 0.35 + 0.1;
      const floors = 3 + Math.floor(rnd() * 4) + (rnd() < 0.08 ? 3 : 0);
      block(cb, x, groundY(x, z) - 1.5, z, w, d, ang, floors, rnd.pick(WALLS), rnd.pick(ROOFS), rnd() < 0.3);
      blocks++;
    }
  }
  const mesh = cb.build(material, { name: 'cityscape:skyline', castShadow: false, receiveShadow: false });
  if (mesh) mesh.renderOrder = -1;
  return { mesh, blocks };
}

// A palazzo for the distant carpet: four walls of windows and a hip or flat roof.
function block(cb, x, y, z, w, d, ang, floors, wall, roof, flat) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const P = (u, v) => [x + u * c - v * s, z + u * s + v * c];
  const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
  const top = y + floors * FLOOR + 1.5;
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    const u1 = Math.max(1, Math.round(L / BAY));
    cb.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], top, b[1]], [a[0], top, a[1]], wall, 'palazzo',
      [[0, -1.5 / FLOOR], [u1, -1.5 / FLOOR], [u1, floors], [0, floors]], true, [nx, 0, nz]);
  }
  if (flat) {
    cb.quad([pts[0][0], top, pts[0][1]], [pts[1][0], top, pts[1][1]], [pts[2][0], top, pts[2][1]], [pts[3][0], top, pts[3][1]], '#d4c3a6', 'white',
      [[0, 0], [1, 0], [1, 1], [0, 1]], false, [0, 1, 0]);
    return;
  }
  // hip roof with the ridge along the longer side
  const long = w >= d;
  const half = (long ? d : w) / 2, rise = half * 0.5;
  const r1 = long ? P(-w / 2 + half, 0) : P(0, -d / 2 + half), r2 = long ? P(w / 2 - half, 0) : P(0, d / 2 - half);
  const Y = top + rise;
  const q = pts.map(([px, pz]) => [px, top, pz]);
  const A = [r1[0], Y, r1[1]], B = [r2[0], Y, r2[1]];
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (long) {
    cb.quad(q[0], q[1], B, A, roof, 'tiles', uv, false, [0, 1, 0]);
    cb.quad(q[2], q[3], A, B, roof, 'tiles', uv, false, [0, 1, 0]);
    cb.tri(q[1], q[2], B, roof, 'tiles', uv, [0, 1, 0]);
    cb.tri(q[3], q[0], A, roof, 'tiles', uv, [0, 1, 0]);
  } else {
    cb.quad(q[1], q[2], B, A, roof, 'tiles', uv, false, [0, 1, 0]);
    cb.quad(q[3], q[0], A, B, roof, 'tiles', uv, false, [0, 1, 0]);
    cb.tri(q[0], q[1], A, roof, 'tiles', uv, [0, 1, 0]);
    cb.tri(q[2], q[3], B, roof, 'tiles', uv, [0, 1, 0]);
  }
}

// ---- St Peter's ----------------------------------------------------------------------------
// The basilica faces east. Proportions follow the real building at about 0.85 scale.
function stPeters(base, x, y, z, k) {
  // everything below is built at 0.85 of the real size, then scaled up by k about the base point
  const S = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-x, -y, -z));
  const cb = { geo: (g, m, ...rest) => base.geo(g, S.clone().multiply(m), ...rest) };
  // crossing, transepts, nave and apse
  cb.geo(new THREE.BoxGeometry(56, 40, 70), mat(x, y + 20, z), '#e2d6bd', 'classic', [16, 8]);
  cb.geo(new THREE.BoxGeometry(50, 34, 32), mat(x + 42, y + 17, z), '#e2d6bd', 'classic', [12, 7]);
  cb.geo(new THREE.CylinderGeometry(26, 26, 38, 12, 1, false, Math.PI, Math.PI), mat(x - 28, y + 19, z), '#e2d6bd', 'classic', [8, 8]);
  // facade with attic statues and the two clock cupolas
  cb.geo(new THREE.BoxGeometry(8, 42, 96), mat(x + 70, y + 21, z), TRAV, 'classic', [20, 9]);
  cb.geo(new THREE.BoxGeometry(9, 2, 98), mat(x + 70, y + 42.5, z), '#f1ebdd');
  const tri = new THREE.Shape([new THREE.Vector2(-15, 0), new THREE.Vector2(15, 0), new THREE.Vector2(0, 6)]);
  const ped = new THREE.ExtrudeGeometry(tri, { depth: 2, bevelEnabled: false });
  cb.geo(ped, mat(x + 74, y + 34, z, Math.PI / 2), TRAV);
  for (let k = -6; k <= 6; k++) cb.geo(new THREE.CylinderGeometry(0.7, 0.9, 4, 5), mat(x + 70, y + 45.5, z + k * 6.8), '#efe9dc');
  for (const k of [-1, 1]) addDome(cb, x + 70, y + 43, z + k * 50, 4.2, { drum: TRAV, dome: LEAD, seg: 8 });
  // drum ringed with paired columns, attic, ribbed dome and lantern
  const dy = y + 40;
  cb.geo(new THREE.CylinderGeometry(23, 23, 16, 20, 1, true), mat(x, dy + 8, z), TRAV, 'colonnade', [20, 1]);
  cb.geo(new THREE.CylinderGeometry(24.5, 24.5, 1.6, 20), mat(x, dy + 16.6, z), '#f3eee3');
  cb.geo(new THREE.CylinderGeometry(22.5, 23, 5, 20, 1, true), mat(x, dy + 19.6, z), '#ede6d6', 'classic', [20, 0.6]);
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, a = t * Math.PI / 2;
    prof.push(new THREE.Vector2(22.5 * Math.cos(a) * (1 - 0.06 * t), 34 * Math.sin(a) ** 0.85));
  }
  prof.push(new THREE.Vector2(0.01, 34));
  cb.geo(new THREE.LatheGeometry(prof, 20), mat(x, dy + 22, z), '#a8b2b7', 'ribs', [16, 1]);
  cb.geo(new THREE.CylinderGeometry(4.6, 4.8, 9, 12, 1, true), mat(x, dy + 58, z), TRAV, 'colonnade', [6, 1]);
  cb.geo(new THREE.SphereGeometry(4.8, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, dy + 62.5, z, 0, 1, 1.4, 1), '#a8b2b7');
  cb.geo(new THREE.ConeGeometry(1.4, 5, 8), mat(x, dy + 70.5, z), '#9aa1a3');
  cb.geo(new THREE.SphereGeometry(1.3, 8, 6), mat(x, dy + 73.5, z), '#c9a24a');
  cb.geo(new THREE.BoxGeometry(0.5, 4, 0.5), mat(x, dy + 76.5, z), '#c9a24a');
  cb.geo(new THREE.BoxGeometry(0.5, 0.5, 2.4), mat(x, dy + 77.2, z), '#c9a24a');
  // Bernini's colonnade embracing the piazza, with the obelisk
  const px = x + 130;
  for (const sgn of [-1, 1]) {
    const arc = new THREE.CylinderGeometry(52, 52, 14, 14, 1, true, sgn > 0 ? 0.25 : Math.PI + 0.25, Math.PI - 0.5);
    cb.geo(arc, mat(px, y + 7, z, Math.PI / 2, 1, 1, 0.82), TRAV, 'colonnade', [24, 1]);
  }
  cb.geo(new THREE.CylinderGeometry(0.8, 1.4, 22, 4), mat(px, y + 11, z), '#d8c7b4');
}

function castelSantAngelo(cb, x, y, z) {
  const ry = 0.12;
  cb.geo(new THREE.BoxGeometry(66, 9, 66), mat(x, y + 4.5, z, ry), '#c79a6a', 'brick', [20, 3]);
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const c = Math.cos(ry), s = Math.sin(ry);
    cb.geo(new THREE.BoxGeometry(14, 10, 14), mat(x + (u * c + v * s) * 33, y + 5, z + (-u * s + v * c) * 33, ry + Math.PI / 4), '#c08f5f', 'brick', [5, 3]);
  }
  cb.geo(new THREE.CylinderGeometry(22, 23, 24, 20), mat(x, y + 12, z), '#c9a378', 'ashlar', [16, 5]);
  cb.geo(new THREE.CylinderGeometry(23.5, 23.5, 1.4, 20), mat(x, y + 24.4, z), '#ddd0b8');
  cb.geo(new THREE.BoxGeometry(22, 12, 18), mat(x + 2, y + 30, z, ry), '#e0b878', 'palazzo', [6, 3.5]);
  cb.geo(new THREE.BoxGeometry(12, 7, 10), mat(x - 1, y + 39.5, z, ry), '#e5c48c', 'palazzo', [3, 2]);
  cb.geo(new THREE.CylinderGeometry(0.9, 1.2, 4, 6), mat(x - 1, y + 45, z), BRONZE);
  cb.geo(new THREE.BoxGeometry(5, 3, 0.6), mat(x - 1, y + 46.5, z, ry), BRONZE); // the angel's wings
}

function palazzoGiustizia(cb, x, y, z) {
  const ry = 0.2;
  cb.geo(new THREE.BoxGeometry(64, 26, 56), mat(x, y + 13, z, ry), '#eae2d0', 'classic', [24, 7.6]);
  cb.geo(new THREE.BoxGeometry(66, 1.6, 58), mat(x, y + 26.8, z, ry), '#f3eee2');
  cb.geo(new THREE.BoxGeometry(26, 8, 22), mat(x + 6, y + 31, z, ry), '#eae2d0', 'classic', [8, 2.3]);
  cb.geo(new THREE.BoxGeometry(8, 4, 3), mat(x + 18, y + 37, z - 3, ry), BRONZE); // quadriga
  for (const k of [-1, 1]) cb.geo(new THREE.BoxGeometry(1.2, 3, 1.2), mat(x + 18 + k * 2.5, y + 40, z - 3, ry), BRONZE);
}

function pantheon(cb, x, y, z) {
  cb.geo(new THREE.CylinderGeometry(14, 14, 14, 18), mat(x, y + 7, z), '#d6c4a2', 'brick', [14, 3]);
  cb.geo(new THREE.SphereGeometry(14.5, 18, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, y + 13.5, z, 0, 1, 0.55, 1), '#9ba2a3');
  cb.geo(new THREE.BoxGeometry(18, 13, 12), mat(x, y + 6.5, z - 18), '#e2d6bd', 'colonnade', [6, 1]);
}

function vittoriano(cb, x, y, z) {
  // the white "wedding cake" seen from the north, its long colonnade facing the Corso
  cb.geo(new THREE.BoxGeometry(110, 22, 60), mat(x, y + 11, z), '#f4f1e9', 'ashlar', [30, 5]);
  cb.geo(new THREE.BoxGeometry(70, 10, 40), mat(x, y + 27, z + 4), '#f4f1e9', 'ashlar', [20, 2]);
  cb.geo(new THREE.CylinderGeometry(62, 62, 18, 16, 1, true, -0.75, 1.5), mat(x, y + 41, z - 16, 0, 1, 1, 0.55), '#f6f3ec', 'colonnade', [26, 1]);
  cb.geo(new THREE.BoxGeometry(96, 3, 14), mat(x, y + 51, z + 22), '#f6f3ec');
  for (const k of [-1, 1]) {
    cb.geo(new THREE.BoxGeometry(16, 22, 16), mat(x + k * 48, y + 43, z + 18), '#f4f1e9', 'colonnade', [4, 1.6]);
    cb.geo(new THREE.BoxGeometry(9, 5, 4), mat(x + k * 48, y + 56.5, z + 18), '#4e5a4a'); // bronze quadriga
    cb.geo(new THREE.ConeGeometry(2, 5, 4), mat(x + k * 48, y + 61, z + 18), '#4e5a4a');
  }
  cb.geo(new THREE.BoxGeometry(14, 10, 8), mat(x, y + 37, z - 8), '#f4f1e9');
  cb.geo(new THREE.BoxGeometry(6, 6, 4), mat(x, y + 45, z - 8), '#6a5a3c'); // Vittorio Emanuele on horseback
}

// ---- hills and trees -----------------------------------------------------------------------
function ridge(cb, pts, color, width) {
  // pts: [bearing (deg), distance, height]; a tent-shaped ridge seen from the Pincio
  const row = pts.map(([b, d, h]) => {
    const br = deg(b);
    const top = fromTerrace(br, d), front = fromTerrace(br, d - width), mid = fromTerrace(br, d - width * 0.45), back = fromTerrace(br, d + width);
    return { top: [top[0], h, top[1]], mid: [mid[0], h * 0.62, mid[1]], front: [front[0], -6, front[1]], back: [back[0], -6, back[1]] };
  });
  const [tw, th] = TILE.leaves;
  for (let i = 1; i < row.length; i++) {
    const a = row[i - 1], b = row[i];
    const uv = [[0, 0], [60 / tw, 0], [60 / tw, 30 / th], [0, 30 / th]];
    cb.quad(a.front, b.front, b.mid, a.mid, color, 'leaves', uv);
    cb.quad(a.mid, b.mid, b.top, a.top, color, 'leaves', uv);
    cb.quad(b.back, a.back, a.top, b.top, color, 'leaves', uv);
  }
  return row;
}

function hills(cb, rnd) {
  // Monte Mario to the north-west, with the long wooded slope down to the Tiber
  const mm = ridge(cb, [[188, 1350, 10], [198, 1300, 38], [206, 1280, 62], [214, 1300, 70], [222, 1330, 66], [232, 1380, 48], [242, 1420, 24], [250, 1450, 6]], '#56704a', 140);
  // the Vatican hill behind St Peter's and the Gianicolo with its umbrella pines
  ridge(cb, [[150, 1080, 6], [156, 1060, 22], [163, 1080, 26], [170, 1110, 10]], '#5d7650', 90);
  const gi = ridge(cb, [[104, 1300, 8], [112, 1260, 40], [122, 1230, 56], [132, 1240, 58], [142, 1260, 50], [150, 1300, 30], [156, 1340, 10]], '#577150', 120);
  for (const row of [mm, gi]) {
    for (let i = 1; i < row.length; i++) {
      for (let k = 0; k < 3; k++) {
        const t = rnd(), a = row[i - 1].top, b = row[i].top;
        const x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t;
        if (y < 15) continue;
        const s = 2 + rnd() * 1.5;
        cb.geo(new THREE.CylinderGeometry(0.3 * s, 0.4 * s, 2.6 * s, 4), mat(x, y + 0.9 * s, z), '#5a4434');
        cb.geo(new THREE.SphereGeometry(2.6 * s, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, y + 2.0 * s, z, 0, 1, 0.45, 1), '#46633b');
      }
    }
  }
}

// Tiber course (game units) and its two rows of Lungotevere plane trees.
const TIBER = [[-683, -426], [-640, -230], [-605, -55], [-533, 152], [-492, 426], [-583, 608], [-833, 687], [-878, 821], [-850, 1000]];
function onTiber(x, z) {
  for (let i = 1; i < TIBER.length; i++) {
    const [ax, az] = TIBER[i - 1], [bx, bz] = TIBER[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 36) return true;
  }
  return false;
}
function tiberTrees(cb, groundY, outsideRect) {
  for (let i = 1; i < TIBER.length; i++) {
    const [ax, az] = TIBER[i - 1], [bx, bz] = TIBER[i];
    const L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let s = 0; s < L; s += 16) {
      for (const side of [-27, 27]) {
        const x = ax + ((bx - ax) * s) / L + nx * side, z = az + ((bz - az) * s) / L + nz * side;
        if (!outsideRect(x, z, 8)) continue;
        const y = groundY(x, z);
        cb.geo(new THREE.IcosahedronGeometry(5.5, 0), mat(x, y + 9, z, s, 1, 0.8, 1), '#5f7f42', 'leaves', [2, 2]);
        cb.geo(new THREE.CylinderGeometry(0.6, 0.8, 6, 4), mat(x, y + 3, z), '#6b5a48');
      }
    }
  }
}
