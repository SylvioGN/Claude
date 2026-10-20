// Piazza del Popolo, below the Pincio terrace: the Flaminio obelisk with its four lion fountains,
// the twin churches of Santa Maria dei Miracoli and in Montesanto, Porta del Popolo and Santa Maria
// del Popolo, and the two exedras with the Neptune fountain. The Dea Roma fountain and the terraces
// up the Pincio slope are landmarksPincio's. Positions are the real ones from OpenStreetMap.
import * as THREE from 'three';
import { mat, addBuilding } from './buildings.js';
import { TILE } from './atlas.js';

const TRAV = '#ece4d2', TRAV_SHADE = '#d9cfba', MARBLE = '#f3f0e8', GRANITE = '#dcc3b0', LEAD = '#8f989b';
const BRONZE = '#5b4a33', WATER = '#7fc2de';

export const OBELISK = [-394.5, 139.4];
// Areas the hand-built Piazza del Popolo pieces occupy (OSM footprints there are skipped).
export const POPOLO_ZONES = [
  [[-402.6, 108.6], [-403.0, 84.0], [-375.0, 78.5], [-366.8, 94.0], [-386.5, 108.0]],
  [[-398.5, 183.0], [-378.0, 182.0], [-376.5, 209.0], [-398.0, 210.0]],
  [[-377.0, 176.0], [-355.0, 186.0], [-357.0, 204.0], [-374.0, 201.0]],
];
const LION_BASINS = [[-396.8, 144.1], [-399.0, 137.2], [-391.9, 134.8], [-389.7, 141.8]];

export function buildPopolo(ctx, chunks) {
  const H = ctx.terrain.heightAt;
  const cb = chunks.at(OBELISK[0], OBELISK[1]);
  obelisk(cb, H);
  // the twin churches face the piazza, with Via del Corso running between them
  twinChurch(cb, H, { x: -389.0, z: 194.6, face: [-0.16, -0.99], plan: 'round', tower: [-381.3, 197.5] });   // Miracoli
  twinChurch(cb, H, { x: -366.4, z: 189.6, face: [-0.37, -0.93], plan: 'oval', tower: [-369.7, 197.0] });    // Montesanto
  portaDelPopolo(cb, H);
  santaMariaDelPopolo(cb, H, ctx);
  exedras(cb, H);
}

// ---- the obelisk and its lions -------------------------------------------------------------
function obelisk(cb, H) {
  const [x, z] = OBELISK;
  const y = H(x, z);
  const ry = 0.29;
  // round stepped platform carrying the four basins
  cb.geo(new THREE.CylinderGeometry(9.3, 9.6, 0.35, 24), mat(x, y + 0.1, z), TRAV_SHADE, 'ashlar', [24, 0.2]);
  cb.geo(new THREE.CylinderGeometry(8.3, 8.5, 0.35, 24), mat(x, y + 0.45, z), TRAV, 'ashlar', [20, 0.2]);
  // pedestal, shaft, pyramidion, cross
  cb.geo(new THREE.BoxGeometry(5.6, 1.0, 5.6), mat(x, y + 1.1, z, ry), TRAV_SHADE);
  cb.geo(new THREE.BoxGeometry(4.2, 4.6, 4.2), mat(x, y + 3.9, z, ry), TRAV, 'ashlar', [1.3, 1.2]);
  cb.geo(new THREE.BoxGeometry(4.8, 0.7, 4.8), mat(x, y + 6.5, z, ry), TRAV_SHADE);
  cb.geo(new THREE.BoxGeometry(3.4, 0.6, 3.4), mat(x, y + 7.1, z, ry), BRONZE);
  const shaft = new THREE.CylinderGeometry(1.0, 1.45, 16, 4, 1);
  cb.geo(shaft, mat(x, y + 15.4, z, ry + Math.PI / 4), GRANITE, 'stucco', [1, 3]);
  cb.geo(new THREE.ConeGeometry(1.0, 1.6, 4), mat(x, y + 24.2, z, ry + Math.PI / 4), GRANITE);
  cb.geo(new THREE.BoxGeometry(0.16, 1.6, 0.16), mat(x, y + 25.7, z, ry), BRONZE);
  cb.geo(new THREE.BoxGeometry(0.9, 0.16, 0.16), mat(x, y + 25.9, z, ry), BRONZE);
  for (const [bx, bz] of LION_BASINS) {
    const dx = bx - x, dz = bz - z, L = Math.hypot(dx, dz);
    const ux = dx / L, uz = dz / L, face = Math.atan2(ux, uz);
    // round basin with water
    const by = y + 0.6;
    const qx = bx + ux * 0.9, qz = bz + uz * 0.9;
    cb.geo(new THREE.CylinderGeometry(1.75, 1.85, 0.75, 16), mat(qx, by + 0.38, qz), TRAV);
    cb.geo(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16), mat(qx, by + 0.72, qz), WATER, 'water', [1, 1]);
    // stepped pedestal and the lion lying on it, facing out
    const px = x + ux * 3.5, pz = z + uz * 3.5;
    cb.geo(new THREE.BoxGeometry(2.0, 1.8, 2.2), mat(px, by + 0.9, pz, face), TRAV, 'ashlar', [0.6, 0.45]);
    cb.geo(new THREE.BoxGeometry(2.3, 0.3, 2.5), mat(px, by + 1.95, pz, face), TRAV_SHADE);
    lion(cb, px, by + 2.1, pz, face);
    // water arching from the lion's mouth into the basin
    const mouth = new THREE.Vector3(px + ux * 1.45, by + 3.0, pz + uz * 1.45);
    const end = new THREE.Vector3(qx - ux * 0.2, by + 0.8, qz - uz * 0.2);
    const mid = new THREE.Vector3((mouth.x + end.x) / 2 + ux * 0.4, by + 3.2, (mouth.z + end.z) / 2 + uz * 0.4);
    cb.geo(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(mouth, mid, end), 5, 0.12, 4), new THREE.Matrix4(), '#d8f0fa');
  }
}

// Egyptian-style lion (Valadier's), lying with its head up. Built facing +z, then turned by ry.
function lion(cb, x, y, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, v, w) => [x + u * c + w * s, y + v, z - u * s + w * c];
  const part = (g, u, v, w, sx = 1, sy = 1, sz = 1, col = MARBLE) => { const p = P(u, v, w); cb.geo(g, mat(p[0], p[1], p[2], ry, sx, sy, sz), col); };
  part(new THREE.BoxGeometry(1.1, 0.75, 2.2), 0, 0.38, -0.25);                 // body
  part(new THREE.SphereGeometry(0.62, 7, 5), 0, 0.85, 0.75, 1, 1.1, 0.9);        // mane
  part(new THREE.BoxGeometry(0.62, 0.55, 0.6), 0, 0.92, 1.18);                   // head
  part(new THREE.BoxGeometry(0.36, 0.26, 0.3), 0, 0.78, 1.5, 1, 1, 1, '#e8e2d6'); // muzzle
  part(new THREE.BoxGeometry(0.34, 0.22, 0.9), -0.35, 0.11, 0.95);               // front paws
  part(new THREE.BoxGeometry(0.34, 0.22, 0.9), 0.35, 0.11, 0.95);
  part(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 4), 0.45, 0.2, -1.4, 1, 1, 1);  // tail
}

// ---- Santa Maria dei Miracoli / in Montesanto ------------------------------------------------
function twinChurch(cb, H, { x, z, face, plan, tower }) {
  const y = H(x, z);
  const ry = Math.atan2(face[0], face[1]);
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, w) => [x + u * c + w * s, z - u * s + w * c]; // u across, w towards the piazza
  // round or oval body with a ring of pilasters
  const rx = plan === 'oval' ? 7.2 : 7.6, rz = plan === 'oval' ? 9.0 : 7.6;
  const body = new THREE.CylinderGeometry(1, 1, 12.5, 16, 1);
  cb.geo(body, mat(x, y + 6.0, z, ry, rx, 1, rz), '#efe4cc', 'classic', [6, 3.6]);
  cb.geo(new THREE.CylinderGeometry(1, 1, 0.8, 16), mat(x, y + 12.6, z, ry, rx + 0.3, 1, rz + 0.3), TRAV);
  // drum, dome and lantern (octagonal for Miracoli, twelve sides for Montesanto)
  const seg = plan === 'oval' ? 12 : 8;
  const dr = plan === 'oval' ? 5.2 : 5.4;
  const dzs = plan === 'oval' ? 1.18 : 1;
  cb.geo(new THREE.CylinderGeometry(dr, dr, 3.6, seg, 1), mat(x, y + 14.8, z, ry, 1, 1, dzs), '#efe6d3', 'classic', [seg, 1.05]);
  cb.geo(new THREE.CylinderGeometry(dr + 0.35, dr + 0.35, 0.5, seg), mat(x, y + 16.8, z, ry, 1, 1, dzs), TRAV);
  cb.geo(new THREE.SphereGeometry(dr, seg, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, y + 17.0, z, ry, 1, 1.1, dzs), LEAD, 'ribs', [seg, 1]);
  cb.geo(new THREE.CylinderGeometry(1.0, 1.1, 2.2, 8), mat(x, y + 23.6, z, ry), TRAV, 'colonnade', [2, 1]);
  cb.geo(new THREE.SphereGeometry(1.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, y + 24.7, z, ry), LEAD);
  cb.geo(new THREE.CylinderGeometry(0.12, 0.25, 1.6, 6), mat(x, y + 26.3, z, ry), BRONZE);
  // pronaos: podium, four columns, entablature, pediment and statues on top
  const w0 = rz + 2.6;
  const [fx, fz] = P(0, w0);
  cb.geo(new THREE.BoxGeometry(14, 1.2, 6.4), mat(fx, y + 0.6, fz, ry), TRAV_SHADE, 'ashlar', [4, 0.4]);
  for (const u of [-5.1, -1.7, 1.7, 5.1]) {
    const [cx, cz] = P(u, w0 + 1.6);
    cb.geo(new THREE.CylinderGeometry(0.55, 0.62, 8.2, 10), mat(cx, y + 5.3, cz), MARBLE);
    cb.geo(new THREE.BoxGeometry(1.4, 0.4, 1.4), mat(cx, y + 9.55, cz, ry), TRAV);
  }
  for (const u of [-5.1, 5.1]) {
    const [cx, cz] = P(u, w0 - 1.7);
    cb.geo(new THREE.CylinderGeometry(0.55, 0.62, 8.2, 10), mat(cx, y + 5.3, cz), MARBLE);
  }
  const [ex, ez] = P(0, w0);
  cb.geo(new THREE.BoxGeometry(13.2, 1.5, 6.2), mat(ex, y + 10.5, ez, ry), TRAV, 'classic', [4, 0.4]);
  const tri = new THREE.Shape([new THREE.Vector2(-6.8, 0), new THREE.Vector2(6.8, 0), new THREE.Vector2(0, 2.7)]);
  const ped = new THREE.ExtrudeGeometry(tri, { depth: 1.0, bevelEnabled: false });
  const [px, pz] = P(0, w0 + 2.1);
  cb.geo(ped, mat(px, y + 11.25, pz, ry), TRAV);
  // balustrade with statues along the top of the pronaos
  const [bx, bz] = P(0, w0 - 1.4);
  cb.geo(new THREE.BoxGeometry(13.2, 1.0, 2.6), mat(bx, y + 11.7, bz, ry), TRAV_SHADE, 'colonnade', [9, 1]);
  for (const u of [-6.2, -3.1, 3.1, 6.2]) {
    const [sx, sz] = P(u, w0 + 2.6);
    statue(cb, sx, y + 11.3, sz, ry, 0.9);
  }
  // bell tower beside the apse
  const [tx, tz] = tower;
  const ty = H(tx, tz);
  cb.geo(new THREE.BoxGeometry(3.4, 18, 3.4), mat(tx, ty + 9, tz, ry), '#ead9b8', 'classic', [1.3, 5.3]);
  cb.geo(new THREE.BoxGeometry(3.9, 0.5, 3.9), mat(tx, ty + 18.2, tz, ry), TRAV);
  cb.geo(new THREE.BoxGeometry(3.1, 3.2, 3.1), mat(tx, ty + 20.0, tz, ry), '#efe6d3', 'arcade', [1, 1]);
  cb.geo(new THREE.BoxGeometry(3.6, 0.4, 3.6), mat(tx, ty + 21.8, tz, ry), TRAV);
  cb.geo(new THREE.SphereGeometry(1.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(tx, ty + 22.0, tz, ry, 1, 1.4, 1), LEAD);
  cb.geo(new THREE.ConeGeometry(0.25, 1.6, 6), mat(tx, ty + 25, tz), BRONZE);
}

// A marble statue on a little plinth, about `s` units of scale.
export function statue(cb, x, y, z, ry, s = 1, color = MARBLE) {
  cb.geo(new THREE.BoxGeometry(0.9 * s, 0.4 * s, 0.9 * s), mat(x, y + 0.2 * s, z, ry), TRAV_SHADE);
  cb.geo(new THREE.CylinderGeometry(0.28 * s, 0.42 * s, 1.5 * s, 6), mat(x, y + 1.15 * s, z, ry), color);
  cb.geo(new THREE.BoxGeometry(0.75 * s, 0.4 * s, 0.38 * s), mat(x, y + 1.85 * s, z, ry), color);
  cb.geo(new THREE.IcosahedronGeometry(0.22 * s, 0), mat(x, y + 2.25 * s, z), color);
  cb.geo(new THREE.BoxGeometry(0.14 * s, 0.7 * s, 0.14 * s), mat(x + 0.35 * s * Math.cos(ry), y + 2.1 * s, z - 0.35 * s * Math.sin(ry), ry, 1, 1, 1, 0, 0.4), color);
}

// ---- Porta del Popolo ------------------------------------------------------------------------
function portaDelPopolo(cb, H) {
  const x = -410.3, z = 90.0;
  const y = H(x, z) - 0.3;
  const ry = Math.atan2(0.26, 0.966); // faces the piazza
  const W = 22, Ht = 13.5, D = 4.2;
  const sh = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, Ht), new THREE.Vector2(-W / 2, Ht)]);
  const arch = (cx, w, h) => {
    const p = new THREE.Path();
    p.moveTo(cx - w / 2, 0); p.lineTo(cx + w / 2, 0); p.lineTo(cx + w / 2, h - w / 2);
    p.absarc(cx, h - w / 2, w / 2, 0, Math.PI, false);
    p.lineTo(cx - w / 2, 0);
    return p;
  };
  sh.holes.push(arch(0, 5.4, 9.4), arch(-7.6, 2.8, 5.6), arch(7.6, 2.8, 5.6));
  const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -D / 2);
  cb.geo(g, mat(x, y, z, ry), TRAV, 'ashlar', [1 / TILE.ashlar[0], 1 / TILE.ashlar[1]]);
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
  // paired columns on both faces, entablature and the crowning attic with the Chigi star
  for (const w of [D / 2 + 0.45, -D / 2 - 0.45]) {
    for (const u of [-4.6, -3.5, 3.5, 4.6]) {
      const [cx, cz] = P(u, w);
      cb.geo(new THREE.CylinderGeometry(0.42, 0.48, 9.0, 10), mat(cx, y + 5.2, cz), MARBLE);
    }
    const [ex, ez] = P(0, w * 0.98);
    cb.geo(new THREE.BoxGeometry(11.2, 1.1, 1.2), mat(ex, y + 10.3, ez, ry), TRAV_SHADE);
  }
  const [ax, az] = P(0, 0);
  cb.geo(new THREE.BoxGeometry(9.0, 2.8, D + 0.4), mat(ax, y + Ht + 1.4, az, ry), TRAV, 'ashlar', [3, 0.7]);
  const crown = new THREE.Shape();
  crown.moveTo(-4.5, 0); crown.lineTo(4.5, 0); crown.absarc(0, 0, 4.5, 0, Math.PI, false);
  const cg = new THREE.ExtrudeGeometry(crown, { depth: 1.2, bevelEnabled: false, curveSegments: 8 });
  cg.translate(0, 0, -0.6);
  cb.geo(cg, mat(ax, y + Ht + 2.8, az, ry, 1, 0.45, 1), TRAV_SHADE);
  // the star of the Chigi family on top
  for (let k = 0; k < 4; k++) cb.geo(new THREE.BoxGeometry(2.0, 0.22, 0.22), mat(ax, y + Ht + 5.6, az, ry, 1, 1, 1, 0, (k * Math.PI) / 4), '#c9a24a');
}

// ---- Santa Maria del Popolo ----------------------------------------------------------------
function santaMariaDelPopolo(cb, H, ctx) {
  // church and convent block from the real footprint, kept low behind the facade
  const ring = [[-397.1, 107.2], [-402.4, 91.5], [-400.5, 85.4], [-399.7, 83.2], [-374.9, 79.5], [-373.3, 88.6], [-370.7, 88.1],
    [-367.4, 94.2], [-372.1, 95.0], [-371.6, 97.8], [-388.6, 100.4], [-387.5, 107.0]];
  addBuilding(cb, { ring, floors: 3, floorH: 3.4, facade: 'classic', wall: '#e7dcc4', roof: '#aa5a39', roofType: 'hip', heightAt: H, sink: 0.6, blank: true, hipDepth: 3 });
  const y = H(-392.3, 108);
  const ry = 0.05;
  const fx = -392.3, fz = 108.3;
  // two-storey Renaissance facade of travertine with curved volutes and a pediment
  cb.geo(new THREE.BoxGeometry(11.6, 9.5, 1.2), mat(fx, y + 4.7, fz, ry), TRAV, 'ashlar', [3.6, 2.4]);
  cb.geo(new THREE.BoxGeometry(12.2, 0.7, 1.5), mat(fx, y + 9.7, fz, ry), TRAV_SHADE);
  cb.geo(new THREE.BoxGeometry(6.6, 5.2, 1.0), mat(fx, y + 12.6, fz - 0.1, ry), TRAV, 'ashlar', [2, 1.3]);
  const tri = new THREE.Shape([new THREE.Vector2(-3.8, 0), new THREE.Vector2(3.8, 0), new THREE.Vector2(0, 1.9)]);
  cb.geo(new THREE.ExtrudeGeometry(tri, { depth: 1.1, bevelEnabled: false }), mat(fx, y + 15.2, fz - 0.6, ry), TRAV_SHADE);
  for (const u of [-1, 1]) {
    const vol = new THREE.Shape();
    vol.moveTo(0, 0); vol.lineTo(2.6 * u, 0); vol.quadraticCurveTo(0.4 * u, 0.6, 0, 3.4); vol.lineTo(0, 0);
    cb.geo(new THREE.ExtrudeGeometry(vol, { depth: 0.8, bevelEnabled: false, curveSegments: 4 }), mat(fx + 3.3 * u, y + 10.05, fz - 0.5, ry), TRAV_SHADE);
  }
  for (const u of [-3.4, 0, 3.4]) cb.geo(new THREE.BoxGeometry(u ? 1.5 : 2.2, u ? 3.2 : 4.2, 0.2), mat(fx + u, y + (u ? 1.6 : 2.1), fz + 0.62, ry), '#4a3a2c');
  cb.geo(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 12), mat(fx, y + 12.8, fz + 0.55, 0, 1, 1, 1, Math.PI / 2), '#3a3430');
  // dome over the crossing and the brick bell tower with its pointed spire
  const dx = -389.5, dz = 92.5, dy = H(dx, dz);
  cb.geo(new THREE.CylinderGeometry(3.6, 3.6, 3.2, 8), mat(dx, dy + 12.6, dz), '#efe6d3', 'classic', [8, 0.95]);
  cb.geo(new THREE.SphereGeometry(3.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(dx, dy + 14.2, dz, 0, 1, 1.05, 1), LEAD, 'ribs', [8, 1]);
  cb.geo(new THREE.CylinderGeometry(0.7, 0.8, 1.6, 6), mat(dx, dy + 18.4, dz), TRAV);
  const tx = -381.2, tz = 102.7, ty = H(tx, tz);
  cb.geo(new THREE.BoxGeometry(3.4, 17, 3.4), mat(tx, ty + 8.5, tz, ry), '#b47552', 'brick', [1.5, 6]);
  cb.geo(new THREE.BoxGeometry(3.8, 0.4, 3.8), mat(tx, ty + 17.2, tz, ry), TRAV);
  cb.geo(new THREE.ConeGeometry(2.2, 6.5, 8), mat(tx, ty + 20.6, tz), '#7b8a86', 'ribs', [8, 1]);
  for (const k of [-1, 1]) {
    cb.geo(new THREE.ConeGeometry(0.35, 1.6, 4), mat(tx + 1.5 * k, ty + 18.2, tz + 1.5), TRAV_SHADE);
    cb.geo(new THREE.ConeGeometry(0.35, 1.6, 4), mat(tx + 1.5 * k, ty + 18.2, tz - 1.5), TRAV_SHADE);
  }
}

// ---- the exedras --------------------------------------------------------------------------
const EXEDRA_E = [[-381.2, 110.6], [-373.3, 110.8], [-367.3, 112.5], [-362.7, 115.2], [-358.8, 119.1], [-355.4, 124.2], [-353.6, 130.8],
  [-353.5, 135.6], [-354.6, 140.8], [-356.7, 145.9], [-359.7, 150.0], [-366.5, 155.6]];
const EXEDRA_W = [[-422.3, 124.3], [-426.5, 126.9], [-429.7, 129.9], [-433.2, 135.1], [-434.9, 139.2], [-435.5, 143.6], [-435.1, 147.8]];
const EXEDRA_W2 = [[-432.0, 156.9], [-429.6, 160.1], [-426.1, 163.4], [-421.4, 166.3], [-415.5, 168.1], [-407.9, 168.1]];

function exedras(cb, H) {
  for (const pts of [EXEDRA_E, EXEDRA_W, EXEDRA_W2]) {
    exedraWall(cb, pts, H);
    // statues at the ends
    for (const p of [pts[0], pts[pts.length - 1]]) statue(cb, p[0], H(p[0], p[1]) + 4.0, p[1], 0, 1.4);
  }
  // Fontana del Nettuno: Neptune with two tritons
  neptune(cb, H, [-431.9, 151.1], Math.atan2(1, 0.05));
}

function exedraWall(cb, pts, H) {
  const y0 = Math.min(...pts.map((p) => H(p[0], p[1]))) - 0.3;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    cb.geo(new THREE.BoxGeometry(1.4, 3.4, L + 0.25), mat(mx, y0 + 1.7, mz, ry), TRAV, 'ashlar', [L / 3.2, 0.85]);
    cb.geo(new THREE.BoxGeometry(1.7, 0.25, L + 0.3), mat(mx, y0 + 3.5, mz, ry), TRAV_SHADE);
    cb.geo(new THREE.BoxGeometry(0.6, 0.8, L + 0.3), mat(mx, y0 + 4.0, mz, ry), TRAV, 'colonnade', [L / 2.2, 1]);
  }
}

function neptune(cb, H, [x, z], ry) {
  const y = H(x, z);
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
  // half-round basin in front of the exedra
  const basin = new THREE.CylinderGeometry(5.2, 5.4, 1.0, 16, 1, false, -Math.PI / 2, Math.PI);
  cb.geo(basin, mat(x, y + 0.5, z, ry), TRAV);
  cb.geo(new THREE.CylinderGeometry(4.7, 4.7, 0.12, 16, 1, false, -Math.PI / 2, Math.PI), mat(x, y + 0.95, z, ry), WATER, 'water', [2, 1]);
  // rocky base and the figures
  const [rx, rz] = P(0, 0.6);
  cb.geo(new THREE.DodecahedronGeometry(2.2, 0), mat(rx, y + 1.6, rz, ry, 1.4, 0.8, 0.9), '#d9d0bd');
  const [sx, sz] = P(0, 1.0);
  statue(cb, sx, y + 2.3, sz, ry, 1.6);
  cb.geo(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 4), mat(sx + 0.7 * c, y + 4.6, sz - 0.7 * s), BRONZE); // trident
  cb.geo(new THREE.ConeGeometry(0.25, 0.5, 3), mat(sx + 0.7 * c, y + 6.9, sz - 0.7 * s), BRONZE);
  for (const u of [-1.9, 1.9]) {
    const [gx, gz] = P(u, 2.0);
    cb.geo(new THREE.CapsuleGeometry(0.4, 1.4, 2, 6), mat(gx, y + 1.9, gz, ry, 1, 1, 1, 0.5, Math.sign(u) * 0.6), MARBLE);
    cb.geo(new THREE.ConeGeometry(0.4, 1.0, 6), mat(gx, y + 1.3, gz + 0.3, ry, 1, 1, 1, Math.PI / 2), '#9fb5b0'); // dolphin
  }
}
