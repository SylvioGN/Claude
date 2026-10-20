// The long white 8-seat electric golf cart from the family photo (Melex / Marshell style).
// Built facing +z with the ground at y = 0; +x is the cart's LEFT side (the driver's side).
// The static body is one plain mesh hung on the `body` bone (so the suspension can bob it);
// each wheel (spin + steer) and the steering wheel are bones of the riders' skinned mesh.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GeoBuilder, mats } from '../../core/util.js';
import { smoothstep } from '../../core/geo.js';
import { rod } from './rig.js';

export const COLORS = {
  white: '#f7f6f1', canvas: '#f4f1e8', canvasHem: '#d8d3c4', underRoof: '#bdb7a6',
  black: '#1d1e21', seat: '#2a2b30', seatBack: '#222327', floor: '#323337', dash: '#2c2e33',
  tyre: '#222225', hub: '#f3f3ef', hubDark: '#9a9ea4', lens: '#fffbe6', lensRim: '#b9bcc2',
  amber: '#f2a03a', red: '#d6372b', plate: '#eef0f2',
};

// Main dimensions (game units ~ metres).
export const DIM = {
  length: 4.9, width: 1.35, roofY: 2.0,
  wheelR: 0.28, track: 0.6, frontAxle: 1.85, rearAxle: -1.72,
  cushionTop: 0.8,
  rowFront: (i) => 0.45 - 0.88 * i, // backrest front face of row i (0 = driver's bench)
  steer: { x: 0.3, y: 1.15, z: 0.98, tilt: -0.85, r: 0.17 },
};

// Side profile (u = z, v = y) extruded across the cart's width, with soft creased normals.
function sideExtrude(profile, width, bevel) {
  const shape = Array.isArray(profile) ? new THREE.Shape(profile.map(([u, v]) => new THREE.Vector2(u, v))) : profile;
  const depth = width - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(depth / 2, 0, 0);
  return g;
}

function creased(g, angle = 0.6) {
  const out = toCreasedNormals(g, angle);
  if (out !== g) g.dispose();
  return out;
}

// Downward faces of the canopy get upward normals so the canvas glows softly in the sun
// instead of picking up the olive ground bounce.
function glowUnderside(g) {
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) if (n.getY(i) < -0.5) n.setXYZ(i, 0, 1, 0);
  return g;
}

// Rounded nose cowl with the front wheel arch, a domed hood and a tapered nose in plan view.
function cowlGeometry() {
  const pts = [[1.43, 0.3]];
  const cz = DIM.frontAxle, r = 0.38;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    pts.push([cz + Math.cos(a) * r, 0.28 + Math.sin(a) * r]);
  }
  pts.push([2.34, 0.3], [2.42, 0.4], [2.45, 0.54], [2.42, 0.67], [2.33, 0.77], [2.15, 0.85], [1.85, 0.91], [1.55, 0.95], [1.43, 0.95]);
  const g = sideExtrude(pts, 1.32, 0.06);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const taper = 1 - 0.24 * Math.pow(smoothstep(1.95, 2.52, z), 1.4);
    const dome = y > 0.72 ? 0.045 * (1 - Math.min(1, (x / 0.66) ** 2)) * smoothstep(0.72, 0.9, y) : 0;
    pos.setXYZ(i, x * taper, y + dome, z);
  }
  return creased(g);
}

// Flat canopy roof: rounded rectangle in plan with a gently bowed front edge.
function roofGeometry(halfW, zBack, zFront, thick, bevel) {
  const s = new THREE.Shape();
  const rb = 0.14, rf = 0.32;
  // shape coordinates are (x, -z)
  s.moveTo(-halfW + rb, -zBack);
  s.lineTo(halfW - rb, -zBack);
  s.quadraticCurveTo(halfW, -zBack, halfW, -zBack - rb);
  s.lineTo(halfW, -zFront + rf);
  s.quadraticCurveTo(halfW, -zFront, halfW - rf, -zFront - 0.02);
  s.quadraticCurveTo(0, -zFront - 0.09, -halfW + rf, -zFront - 0.02);
  s.quadraticCurveTo(-halfW, -zFront, -halfW, -zFront + rf);
  s.lineTo(-halfW, -zBack - rb);
  s.quadraticCurveTo(-halfW, -zBack, -halfW + rb, -zBack);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);
  return creased(g);
}

// Fender arch over a wheel: a half annulus seen from the side, extruded across.
function archGeometry(r0, r1, width) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, 0, Math.PI, false);
  s.absarc(0, 0, r0, Math.PI, 0, true);
  return creased(sideExtrude(s, width, 0.015));
}

// Shares identical vertices so the GPU transforms each one once.
function indexed(mesh) {
  const g = mergeVertices(mesh.geometry);
  mesh.geometry.dispose();
  g.computeBoundingSphere();
  mesh.geometry = g;
  return mesh;
}

function roundedBox(w, h, d, seg, r) {
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

// Adds the cart's bones (body, wheels, steering wheel) to the rig, builds the static body as its own
// mesh on the body bone and returns them. lowDetail trims segments for the 'low' tier.
export function buildCart(rb, { lowDetail = false } = {}) {
  const C = COLORS, D = DIM;
  const body = rb.bone(null, 0, 0, 0, 'body');
  const wheels = [
    [D.track, D.frontAxle], [-D.track, D.frontAxle], [D.track, D.rearAxle], [-D.track, D.rearAxle],
  ].map(([x, z], i) => {
    const b = rb.bone(null, x, D.wheelR, z, `wheel${i}`);
    b.rotation.order = 'YXZ';
    return b;
  });
  const st = D.steer;
  const steer = rb.bone(body, st.x, st.y, st.z, 'steeringWheel');
  steer.rotation.order = 'XYZ';
  steer.rotation.x = st.tilt;

  // ---------------- body: a plain mesh riding on the body bone (no skinning cost)
  const gb = new GeoBuilder();
  const cushSeg = lowDetail ? 1 : 2;
  // chassis, floor and side rockers
  gb.box(1.16, 0.14, 3.92, C.black, 0, 0.3, -0.48);
  gb.box(1.22, 0.05, 3.86, C.floor, 0, 0.42, -0.5);
  for (const sx of [1, -1]) {
    const rockFront = 1.46, rockBack = D.rearAxle + 0.4;
    gb.place(roundedBox(0.07, 0.22, rockFront - rockBack, 1, 0.03), C.white, sx * 0.635, 0.35, (rockFront + rockBack) / 2);
    gb.place(roundedBox(0.07, 0.22, 0.32, 1, 0.03), C.white, sx * 0.635, 0.35, -2.27);
    gb.box(0.02, 0.05, rockFront - rockBack - 0.1, C.black, sx * 0.672, 0.3, (rockFront + rockBack) / 2); // rubber step strip
  }
  // fender arches over all four wheels
  for (const [x, z] of [[D.track, D.frontAxle], [-D.track, D.frontAxle], [D.track, D.rearAxle], [-D.track, D.rearAxle]]) {
    gb.add(archGeometry(0.33, 0.39, 0.24), C.white, new THREE.Matrix4().makeTranslation(x, D.wheelR, z));
  }

  // front cowl, dash, headlights, bumper
  gb.add(cowlGeometry(), C.white);
  gb.box(1.2, 0.5, 0.04, C.dash, 0, 0.72, 1.355);
  gb.box(1.16, 0.05, 0.12, C.dash, 0, 0.95, 1.33); // dash shelf
  for (const sx of [1, -1]) {
    gb.cyl(0.1, 0.1, 0.04, 14, C.lensRim, sx * 0.36, 0.66, 2.465, 0, Math.PI / 2 - 0.12);
    gb.cyl(0.08, 0.08, 0.04, 14, C.lens, sx * 0.36, 0.66, 2.48, 0, Math.PI / 2 - 0.12);
    gb.box(0.09, 0.04, 0.04, C.amber, sx * 0.4, 0.53, 2.47);
  }
  gb.place(roundedBox(1.3, 0.14, 0.16, cushSeg, 0.05), C.black, 0, 0.37, 2.5);
  gb.place(roundedBox(0.16, 0.14, 0.4, cushSeg, 0.05), C.black, 0.6, 0.37, 2.33, 0, 0.25);
  gb.place(roundedBox(0.16, 0.14, 0.4, cushSeg, 0.05), C.black, -0.6, 0.37, 2.33, 0, -0.25);
  gb.box(0.46, 0.06, 0.03, C.black, 0, 0.5, 2.455); // air slot

  // steering column (wheel itself is on its own bone)
  const n = new THREE.Vector3(0, Math.cos(st.tilt), Math.sin(st.tilt));
  rod(gb, st.x, st.y - n.y * 0.62, st.z - n.z * 0.62, st.x, st.y - n.y * 0.04, st.z - n.z * 0.04, 0.03, C.black, 6);

  // four benches: white seat base with black kick panel, black padded cushions and backrests
  for (let i = 0; i < 4; i++) {
    const zb = D.rowFront(i);
    gb.box(1.14, 0.25, 0.5, C.white, 0, 0.57, zb + 0.2);
    gb.box(1.1, 0.19, 0.02, C.black, 0, 0.55, zb + 0.455);
    for (const sx of [1, -1]) {
      gb.place(roundedBox(0.56, 0.12, 0.52, cushSeg, 0.05), C.seat, sx * 0.29, 0.745, zb + 0.24);
      gb.place(roundedBox(0.56, 0.5, 0.11, cushSeg, 0.05), C.seat, sx * 0.29, 1.1, zb - 0.06, -0.1);
      // grab handle hoop at the row end
      gb.place(new THREE.TorusGeometry(0.2, 0.022, 4, 10, Math.PI), C.black, sx * 0.665, 0.79, zb + 0.24, 0, Math.PI / 2, 0);
    }
    gb.box(1.12, 0.46, 0.04, C.seatBack, 0, 1.08, zb - 0.125, 0, -0.1); // backrest shell
    if (i < 3) { // assist bar on top of the backrest for the row behind
      rod(gb, -0.42, 1.38, zb - 0.16, 0.42, 1.38, zb - 0.16, 0.02, C.black, 5);
      for (const sx of [1, -1]) rod(gb, sx * 0.42, 1.3, zb - 0.14, sx * 0.42, 1.38, zb - 0.16, 0.02, C.black, 5);
    }
  }
  // rear body, bumper and tail lights
  gb.place(roundedBox(1.26, 0.52, 0.14, cushSeg, 0.04), C.white, 0, 0.56, -2.36);
  gb.place(roundedBox(1.3, 0.13, 0.12, cushSeg, 0.05), C.black, 0, 0.36, -2.45);
  for (const sx of [1, -1]) {
    gb.box(0.15, 0.08, 0.03, C.red, sx * 0.47, 0.68, -2.44);
    gb.box(0.06, 0.08, 0.03, C.amber, sx * 0.36, 0.68, -2.44);
  }
  gb.box(0.32, 0.11, 0.02, C.plate, 0, 0.52, -2.44);

  // roof posts: front pair on the cowl, a middle pair behind row 1, a rear pair
  const yr = D.roofY;
  for (const sx of [1, -1]) {
    rod(gb, sx * 0.6, 0.95, 1.47, sx * 0.61, yr, 1.39, 0.03, C.black, 6);
    rod(gb, sx * 0.635, 0.46, D.rowFront(1) - 0.14, sx * 0.635, yr, D.rowFront(1) - 0.14, 0.028, C.black, 6);
    rod(gb, sx * 0.635, 0.46, -2.33, sx * 0.635, yr, -2.36, 0.028, C.black, 6);
  }
  // windscreen frame (the clear panel itself is a separate transparent mesh)
  gb.box(1.24, 0.045, 0.045, C.black, 0, yr - 0.03, 1.39);
  gb.box(1.2, 0.04, 0.045, C.black, 0, 1.04, 1.465);
  gb.box(1.2, 0.025, 0.03, C.black, 0, 1.5, 1.43);
  gb.box(0.2, 0.06, 0.03, C.black, 0, yr - 0.12, 1.37); // mirror

  // canopy roof with a slightly darker hem
  gb.add(glowUnderside(roofGeometry(0.72, -2.55, 1.62, 0.05, 0.025)), C.canvas, new THREE.Matrix4().makeTranslation(0, yr + 0.01, 0));
  gb.add(glowUnderside(roofGeometry(0.735, -2.565, 1.635, 0.04, 0)), C.canvasHem, new THREE.Matrix4().makeTranslation(0, yr - 0.025, 0));
  gb.add(glowUnderside(new THREE.BoxGeometry(1.3, 0.05, 3.7).toNonIndexed()), C.underRoof, new THREE.Matrix4().makeTranslation(0, yr - 0.04, -0.5));
  const bodyMesh = indexed(gb.build(mats().vc, { name: 'cart-body' }));
  body.add(bodyMesh);

  // ---------------- wheels: rounded tyre, white hubcap with spokes so the spin reads
  const tyreProfile = [[0.17, -0.085], [0.25, -0.088], [0.272, -0.07], [0.28, -0.035], [0.28, 0.035], [0.272, 0.07], [0.25, 0.088], [0.17, 0.085]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  wheels.forEach((wb, i) => {
    const out = i % 2 === 0 ? 1 : -1;
    rb.on(wb);
    rb.place(new THREE.LatheGeometry(tyreProfile, lowDetail ? 10 : 14), C.tyre, 0, 0, 0, 0, 0, Math.PI / 2);
    rb.cyl(0.175, 0.175, 0.15, 12, C.hubDark, 0, 0, 0, 0, 0, Math.PI / 2);
    rb.cyl(0.165, 0.175, 0.03, 12, C.hub, out * 0.085, 0, 0, 0, 0, Math.PI / 2);
    rb.cyl(0.05, 0.06, 0.03, 8, C.hubDark, out * 0.105, 0, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      rb.box(0.012, 0.03, 0.09, C.hubDark, out * 0.1, Math.sin(a) * 0.11, Math.cos(a) * 0.11, 0, -a);
    }
  });

  // ---------------- steering wheel (in its bone frame the rim lies in the x-z plane, +z = 12 o'clock)
  rb.on(steer);
  rb.place(new THREE.TorusGeometry(st.r, 0.022, 5, 16), C.black, 0, 0, 0, Math.PI / 2, 0, 0);
  rb.cyl(0.05, 0.05, 0.05, 8, C.dash, 0, 0, 0);
  rb.box(0.03, 0.02, st.r, C.dash, 0, 0, -st.r / 2);
  rb.box(st.r * 2 - 0.02, 0.02, 0.03, C.dash, 0, 0, 0);

  return { body, wheels, steer, bodyMesh };
}

// Clear plastic windscreen with a couple of soft reflections.
export function windscreen(util) {
  const tex = util.canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(220,240,255,0.10)';
    g.fillRect(0, 0, w, h);
    const streak = (x0, wdt, a) => {
      const gr = g.createLinearGradient(x0, 0, x0 + wdt, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.translate(-w / 2, -h / 2);
      g.fillStyle = gr; g.fillRect(x0, -h, wdt, h * 3);
      g.restore();
    };
    streak(18, 26, 0.45);
    streak(52, 10, 0.3);
    streak(92, 16, 0.22);
  }, { wrap: false });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const y0 = 1.05, y1 = DIM.roofY - 0.05, z0 = 1.465, z1 = 1.39;
  const geo = new THREE.PlaneGeometry(1.18, y1 - y0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.rotation.x = -Math.atan2(z0 - z1, y1 - y0);
  mesh.renderOrder = 2;
  mesh.name = 'windscreen';
  return mesh;
}
