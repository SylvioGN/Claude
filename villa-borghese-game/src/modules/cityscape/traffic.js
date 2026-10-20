// A little Roman traffic outside the park: Fiat 500s, white taxis and orange buses driving along
// Viale del Muro Torto (in its cutting) and the main streets around Villa Borghese.
import * as THREE from 'three';
import { ROADS } from './osmCity.js';
import { decode } from './city.js';
import { CityBuilder } from './builder.js';
import { mat } from './buildings.js';

const CAR_COLORS = ['#f6f6f2', '#f6f6f2', '#a8d8c0', '#f2e6c8', '#c8302c', '#9cc8e6', '#f0c840', '#2a2a2e', '#b8bcc0', '#e58a3a', '#6d8fc4'];
const BUS_COLORS = ['#e2582f', '#d8452f', '#f1efe8'];

function carGeometry() {
  const cb = new CityBuilder();
  cb.geo(new THREE.BoxGeometry(1.7, 0.7, 3.6), mat(0, 0.6, 0), '#ffffff');
  cb.geo(new THREE.BoxGeometry(1.5, 0.62, 1.9), mat(0, 1.25, -0.2), '#2c3440');
  cb.geo(new THREE.BoxGeometry(1.52, 0.1, 1.7), mat(0, 1.58, -0.2), '#ffffff');
  cb.geo(new THREE.BoxGeometry(1.5, 0.18, 0.12), mat(0, 0.75, 1.82), '#f4f0d8');   // headlights / grille
  for (const [x, z] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) {
    cb.geo(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 8), mat(x, 0.34, z, 0, 1, 1, 1, 0, Math.PI / 2), '#1e1e20');
  }
  return cb.buildGeometry();
}

function busGeometry() {
  const cb = new CityBuilder();
  cb.geo(new THREE.BoxGeometry(2.5, 2.7, 11), mat(0, 1.75, 0), '#ffffff');
  cb.geo(new THREE.BoxGeometry(2.56, 1.0, 10.4), mat(0, 2.25, -0.1), '#2c3440');
  cb.geo(new THREE.BoxGeometry(2.3, 1.2, 0.08), mat(0, 2.1, 5.51), '#2c3440');
  cb.geo(new THREE.BoxGeometry(2.4, 0.25, 10.6), mat(0, 3.2, 0), '#e9e6de');
  for (const [x, z] of [[-1.15, 3.6], [1.15, 3.6], [-1.15, -3.4], [1.15, -3.4]]) {
    cb.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8), mat(x, 0.5, z, 0, 1, 1, 1, 0, Math.PI / 2), '#1e1e20');
  }
  return cb.buildGeometry();
}

// Height of a precomputed road profile (samples every `step` units) at distance s.
function level(prof, step, s) {
  const f = Math.max(0, Math.min(prof.length - 1.001, s / step)), i = Math.floor(f), t = f - i;
  return prof[i] + (prof[i + 1] - prof[i]) * t;
}

// A drivable polyline with cumulative lengths.
function lane(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, acc, length: acc[acc.length - 1] };
}
function sample(l, s, out) {
  let i = 1;
  while (i < l.acc.length - 1 && l.acc[i] < s) i++;
  const a = l.pts[i - 1], b = l.pts[i], seg = l.acc[i] - l.acc[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (s - l.acc[i - 1]) / seg));
  out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
  out.dx = (b[0] - a[0]) / seg; out.dz = (b[1] - a[1]) / seg;
  return out;
}

export function buildTraffic(ctx, material) {
  const { MAP, terrain: T, quality } = ctx;
  const rnd = ctx.rng('cityscape:traffic');
  const outside = T.outsideDistance || (() => 99);
  const E = T.extent;
  const inExtent = (x, z) => x > E.minX + 4 && x < E.maxX - 4 && z > E.minZ + 4 && z < E.maxZ - 4;

  // routes: the Muro Torto both ways, then the long main streets from OpenStreetMap
  const routes = [];
  const muro = MAP.BACKDROP.muroTorto || [];
  if (muro.length > 1) {
    // Road level of each lane along the cutting. The cutting is V-shaped, so a lane follows the
    // higher of the centre line and the ground under it; under the Pincio footbridge the cars run
    // straight from one end of the arch to the other.
    const l = lane(muro), STEP = 2, OFF = 2.2, n = Math.ceil(l.length / STEP) + 1;
    const fwd = new Float32Array(n), back = new Float32Array(n), under = new Uint8Array(n), q = {};
    const bridges = MAP.PATHS.filter((pp) => pp.k === 'bridge');
    for (let i = 0; i < n; i++) {
      sample(l, i * STEP, q);
      const h = T.heightAt(q.x, q.z);
      // traffic keeps right: dir +1 drives on the (-dz, dx) side, dir -1 on the other
      fwd[i] = Math.max(h, T.heightAt(q.x - q.dz * OFF, q.z + q.dx * OFF));
      back[i] = Math.max(h, T.heightAt(q.x + q.dz * OFF, q.z - q.dx * OFF));
      under[i] = bridges.some((b) => b.p.some(([bx, bz]) => Math.hypot(bx - q.x, bz - q.z) < b.w / 2 + 9)) ? 1 : 0;
    }
    for (let i = 0; i < n; i++) {
      if (!under[i]) continue;
      let a = i, b = i;
      while (a > 0 && under[a]) a--;
      while (b < n - 1 && under[b]) b++;
      for (const prof of [fwd, back]) {
        for (let k = a + 1; k < b; k++) prof[k] = prof[a] + ((prof[b] - prof[a]) * (k - a)) / (b - a);
      }
      i = b;
    }
    routes.push({ l, two: true, off: OFF, weight: 2.2, prof: { 1: fwd, '-1': back }, step: STEP });
  }
  for (const r of ROADS) {
    if (r.c > 1 || /Muro Torto/.test(r.n)) continue;
    const pts = decode(r.p, 2).filter(([x, z]) => inExtent(x, z) && outside(x, z) > 5);
    if (pts.length < 2) continue;
    const l = lane(pts);
    if (l.length < 70) continue;
    routes.push({ l, two: !r.o, off: r.o ? 0 : 2.2, weight: 1 });
  }
  const total = routes.reduce((a, r) => a + r.l.length * r.weight, 0);
  const scale = quality.tier === 'low' ? 0.5 : quality.tier === 'med' ? 0.8 : 1;
  const nCars = Math.round(34 * scale), nBuses = Math.round(6 * scale);
  const pick = () => {
    let k = rnd() * total;
    for (const r of routes) { k -= r.l.length * r.weight; if (k <= 0) return r; }
    return routes[routes.length - 1];
  };
  const make = (bus) => {
    const r = pick();
    return { r, s: rnd() * r.l.length, dir: r.two && rnd() < 0.5 ? -1 : 1, speed: bus ? 5 + rnd() * 1.5 : 7 + rnd() * 4, bus };
  };
  if (!routes.length) return null;
  const cars = Array.from({ length: nCars }, () => make(false));
  const buses = Array.from({ length: nBuses }, () => make(true));

  const group = new THREE.Group();
  group.name = 'cityscape:traffic';
  const meshes = [];
  for (const [list, geo, colors] of [[cars, carGeometry(), CAR_COLORS], [buses, busGeometry(), BUS_COLORS]]) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(geo, material, list.length);
    im.frustumCulled = false;
    im.castShadow = false;
    im.receiveShadow = true;
    const c = new THREE.Color();
    list.forEach((v, i) => im.setColorAt(i, c.set(rnd.pick(colors))));
    im.instanceColor.needsUpdate = true;
    group.add(im);
    meshes.push([im, list]);
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const p = {}, ahead = {};
  function place(im, list) {
    list.forEach((v, i) => {
      const L = v.r.l.length;
      sample(v.r.l, v.s, p);
      // drive on the right: offset to the right of the direction of travel
      const fx = p.dx * v.dir, fz = p.dz * v.dir;
      const off = v.r.off * (v.r.two ? 1 : 0) + (v.bus ? 0.4 : 0);
      const x = p.x - fz * off, z = p.z + fx * off;
      const s2 = Math.max(0, Math.min(L, v.s + 2 * v.dir));
      sample(v.r.l, s2, ahead);
      let y, y2;
      if (v.r.prof) {
        const prof = v.r.prof[v.dir];
        y = level(prof, v.r.step, v.s); y2 = level(prof, v.r.step, s2);
      } else {
        y = T.heightAt(x, z); y2 = T.heightAt(ahead.x - fz * off, ahead.z + fx * off);
      }
      e.set(-Math.atan2(y2 - y, 2), Math.atan2(fx, fz), 0);
      m.compose(pos.set(x, y + 0.02, z), q.setFromEuler(e), one);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  }
  for (const [im, list] of meshes) place(im, list);

  return {
    group,
    update(dt) {
      for (const [im, list] of meshes) {
        for (const v of list) {
          v.s += v.speed * dt * v.dir;
          // loop round to the other end of the street (out of sight at the edges of the city)
          if (v.s > v.r.l.length) v.s -= v.r.l.length;
          if (v.s < 0) v.s += v.r.l.length;
        }
        place(im, list);
      }
    },
  };
}
