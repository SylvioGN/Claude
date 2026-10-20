// Famous buildings of the city edge that get more than a footprint: Villa Medici with its twin
// turrets and Trinità dei Monti above the Spanish Steps.
import * as THREE from 'three';
import { mat, addBuilding } from './buildings.js';

const TRAV = '#ece4d2', TRAV_SHADE = '#d9cfba', LEAD = '#8f989b', BRONZE = '#5b4a33';

export function buildLandmarks(ctx, chunks, specials) {
  const H = ctx.terrain.heightAt;
  for (const sp of specials) {
    if (sp.kind === 7) villaMedici(ctx, chunks.at(sp.cx, sp.cz), sp.ring, H);
  }
  trinita(chunks.at(-60, 400), H);
}

function villaMedici(ctx, cb, ring, H) {
  const res = addBuilding(cb, { ring, floors: 4, floorH: 3.4, facade: 'palazzo', wall: '#f1ebdd', roof: '#b25a36', roofType: 'hip', heightAt: H, sink: 0.6, hipDepth: 2.4 });
  // the two turrets of the belvedere, at the ends of the main wing
  const a = [-125.25, 276.25], b = [-103.6, 296.6];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  const ry = Math.atan2(ux, uz);
  for (const t of [4.2, L - 4.2]) {
    const x = a[0] + ux * t + uz * 1.5, z = a[1] + uz * t - ux * 1.5;
    const y0 = res.top - 1, h = 8.5;
    cb.geo(new THREE.BoxGeometry(5.4, h, 5.4), mat(x, y0 + h / 2, z, ry), '#f1ebdd', 'villa', [2, 2.5]);
    cb.geo(new THREE.BoxGeometry(5.9, 0.5, 5.9), mat(x, y0 + h + 0.25, z, ry), TRAV);
    cb.geo(new THREE.BoxGeometry(4.8, 3.0, 4.8), mat(x, y0 + h + 2.0, z, ry), '#f3eee3', 'arcade', [1.5, 1]);
    cb.geo(new THREE.BoxGeometry(5.4, 0.4, 5.4), mat(x, y0 + h + 3.7, z, ry), TRAV);
    cb.geo(new THREE.ConeGeometry(3.9, 2.2, 4), mat(x, y0 + h + 5.0, z, ry + Math.PI / 4), '#a9532f', 'tiles', [3, 1]);
    cb.geo(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 6), mat(x, y0 + h + 6.6, z), TRAV);
  }
  ctx.reserve({ ring });
}

// Trinità dei Monti: twin bell towers over the Spanish Steps, facing west.
function trinita(cb, H) {
  const x = -63.5, z = 409.4;
  const y = H(x, z) - 0.4;
  const ry = -Math.PI / 2; // facade looks west, down the steps
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
  // nave behind the facade
  const [nx, nz] = P(0, -12);
  cb.geo(new THREE.BoxGeometry(12, 13, 22), mat(nx, y + 6.5, nz, ry), '#e5c7a6', 'villa', [8, 3.8]);
  const gable = new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 4)]);
  const roof = new THREE.ExtrudeGeometry(gable, { depth: 22, bevelEnabled: false });
  roof.translate(0, 0, -11);
  cb.geo(roof, mat(nx, y + 13, nz, ry), '#ad5a37', 'tiles', [1 / 2.4, 1 / 3]);
  // facade with pilasters, cornice and a small pediment
  const [fx, fz] = P(0, 0);
  cb.geo(new THREE.BoxGeometry(19, 15, 1.6), mat(fx, y + 7.5, fz, ry), '#ecdcc0', 'classic', [7, 4.4]);
  cb.geo(new THREE.BoxGeometry(20, 0.8, 2.0), mat(fx, y + 15.3, fz, ry), TRAV);
  const tri = new THREE.Shape([new THREE.Vector2(-4.5, 0), new THREE.Vector2(4.5, 0), new THREE.Vector2(0, 2.2)]);
  const [px, pz] = P(0, 0.2);
  cb.geo(new THREE.ExtrudeGeometry(tri, { depth: 1.0, bevelEnabled: false }), mat(px, y + 15.7, pz, ry), TRAV);
  const [dx, dz] = P(0, 0.85);
  cb.geo(new THREE.BoxGeometry(2.4, 4.0, 0.3), mat(dx, y + 2.0, dz, ry), '#4a3a2c');
  // the two bell towers with arched belfries and pointed caps
  for (const u of [-7.6, 7.6]) {
    const [tx, tz] = P(u, -1.2);
    cb.geo(new THREE.BoxGeometry(4.4, 9, 4.4), mat(tx, y + 19.5, tz, ry), '#ecdcc0', 'classic', [1.6, 2.6]);
    cb.geo(new THREE.BoxGeometry(4.9, 0.5, 4.9), mat(tx, y + 24.2, tz, ry), TRAV);
    cb.geo(new THREE.BoxGeometry(4.0, 3.6, 4.0), mat(tx, y + 26.3, tz, ry), '#efe2c8', 'arcade', [1.25, 1]);
    cb.geo(new THREE.BoxGeometry(4.5, 0.4, 4.5), mat(tx, y + 28.3, tz, ry), TRAV);
    cb.geo(new THREE.ConeGeometry(2.6, 4.2, 4), mat(tx, y + 30.6, tz, ry + Math.PI / 4), LEAD, 'ribs', [4, 1]);
    cb.geo(new THREE.SphereGeometry(0.4, 6, 4), mat(tx, y + 32.9, tz), BRONZE);
  }
  // the top landing of the Spanish Steps and the Sallustiano obelisk
  for (let k = 0; k < 5; k++) {
    const [sx, sz] = P(0, 3 + k * 1.6);
    cb.geo(new THREE.BoxGeometry(24 - k, 0.6, 1.6), mat(sx, y - 0.3 - k * 0.6, sz, ry), TRAV_SHADE);
  }
  const [ox, oz] = P(0, 12);
  cb.geo(new THREE.BoxGeometry(2.6, 3.2, 2.6), mat(ox, y + 1.2, oz, ry), TRAV);
  cb.geo(new THREE.CylinderGeometry(0.55, 0.9, 11, 4), mat(ox, y + 8.3, oz, ry + Math.PI / 4), '#d8c7b4');
  cb.geo(new THREE.ConeGeometry(0.55, 0.9, 4), mat(ox, y + 14.25, oz, ry + Math.PI / 4), '#d8c7b4');
}
