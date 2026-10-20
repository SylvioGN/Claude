// Storybook map of the park: rendered once into an offscreen canvas from MAP data, then
// reused by the heading-up mini-map (drawn every few frames) and the big full map.
import { drawIcon } from './icons.js';

export const MAP_COLORS = {
  city: '#ecdcbf', cityLine: '#e0cba6', park: '#a6d36b', parkEdge: '#5f9a3f', forest: '#7dba55', tree: '#5d9a3e',
  lawn: '#b8e07c', garden: '#c6e889', water: '#62b4e0', waterEdge: '#3d8fc0', plaza: '#f6e8c6',
  path: '#fff6e0', pathEdge: '#d6bf91', building: '#eab27a', buildingEdge: '#b9773f', nogo: '#d9e7a8', road: '#f8f1e4',
};

// 1.5 px per game unit: fine enough for the mini-map zoom, small enough for phones (~1.2k x 0.9k).
export function createMapImage(MAP, rnd, s = 1.5) {
  const B = MAP.BOUNDS, pad = 46;
  const x0 = B.minX - pad, z0 = B.minZ - pad;
  const W = Math.ceil((B.maxX - B.minX + pad * 2) * s), H = Math.ceil((B.maxZ - B.minZ + pad * 2) * s);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const C = MAP_COLORS;
  const X = (x) => (x - x0) * s, Z = (z) => (z - z0) * s;
  const ring = (r) => {
    g.beginPath();
    r.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.closePath();
  };
  const line = (pts) => {
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
  };
  g.lineJoin = 'round'; g.lineCap = 'round';

  // the city around the park: warm blocks with a faint street grid
  g.fillStyle = C.city; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.cityLine; g.lineWidth = 1;
  for (let i = 0; i < W; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H * 0.18, H); g.stroke(); }
  for (let j = 0; j < H; j += 26) { g.beginPath(); g.moveTo(0, j); g.lineTo(W, j - W * 0.1); g.stroke(); }
  const bd = MAP.BACKDROP || {};
  if (bd.muroTorto) { g.strokeStyle = C.road; g.lineWidth = 7 * s; line(bd.muroTorto); g.stroke(); }
  if (bd.piazzaPopolo) {
    const [px, pz] = bd.piazzaPopolo.center;
    g.fillStyle = C.plaza; g.beginPath(); g.arc(X(px), Z(pz), bd.piazzaPopolo.radius * s, 0, Math.PI * 2); g.fill();
  }

  // park
  ring(MAP.BOUNDARY);
  g.fillStyle = C.park; g.fill();
  g.strokeStyle = C.parkEdge; g.lineWidth = 3.5; g.stroke();
  for (const n of MAP.NOGO) { ring(n.r); g.fillStyle = C.nogo; g.fill(); }
  for (const f of MAP.FOREST) { ring(f); g.fillStyle = C.forest; g.fill(); }
  for (const l of MAP.LAWNS) { ring(l.r); g.fillStyle = l.k === 'garden' ? C.garden : C.lawn; g.fill(); }
  // little tree dots in the woods
  g.fillStyle = C.tree;
  for (const f of MAP.FOREST) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of f) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    g.save(); ring(f); g.clip();
    const n = Math.min(500, ((maxX - minX) * (maxZ - minZ)) / 70);
    for (let i = 0; i < n; i++) {
      const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ);
      g.beginPath(); g.arc(X(x), Z(z), (1.6 + rnd() * 1.6) * s, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  for (const p of MAP.PLAZAS) { ring(p.r); g.fillStyle = C.plaza; g.fill(); }
  for (const w of MAP.WATER) {
    ring(w.r); g.fillStyle = C.water; g.fill();
    g.strokeStyle = C.waterEdge; g.lineWidth = 1.5; g.stroke();
    for (const h of w.h || []) { ring(h); g.fillStyle = C.forest; g.fill(); }
  }

  // avenues: a darker edge pass, then the light gravel on top
  const paths = MAP.PATHS.filter((p) => p.k !== 'path');
  const width = (p) => Math.max(p.k === 'viale' ? 3.2 : 2, p.w * s * 0.75);
  for (const p of paths) { g.strokeStyle = C.pathEdge; g.lineWidth = width(p) + 2; line(p.p); g.stroke(); }
  for (const p of paths) { g.strokeStyle = C.path; g.lineWidth = width(p); line(p.p); g.stroke(); }
  for (const b of MAP.BUILDINGS) {
    ring(b.r); g.fillStyle = C.building; g.fill();
    g.strokeStyle = C.buildingEdge; g.lineWidth = 1; g.stroke();
  }
  for (const a of Object.values(MAP.ANCHORS)) {
    if (!a.footprint || a.name?.startsWith('Piazzale')) continue;
    ring(a.footprint); g.fillStyle = '#f3c98d'; g.fill();
    g.strokeStyle = C.buildingEdge; g.lineWidth = 1.2; g.stroke();
  }
  return { canvas: c, x0, z0, s, W, H };
}

// Heading-up circular mini-map. `view` = {x, z, heading}; `stops` = [{x, z, icon, color, visited, next}].
export function drawMinimap(g, img, size, view, stops, radiusUnits, northLabel) {
  const R = size / 2;
  const cy = R * 1.12; // cart a little below the centre: more map ahead
  const theta = view.heading - Math.PI;
  const k = R / radiusUnits; // canvas px per game unit
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, size, size);
  g.save();
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = MAP_COLORS.city; g.fillRect(0, 0, size, size);
  g.translate(R, cy);
  g.rotate(theta);
  g.scale(k / img.s, k / img.s);
  g.translate(-(view.x - img.x0) * img.s, -(view.z - img.z0) * img.s);
  g.drawImage(img.canvas, 0, 0);
  g.restore();

  const cos = Math.cos(theta), sin = Math.sin(theta);
  const toScreen = (x, z) => {
    const dx = (x - view.x) * k, dz = (z - view.z) * k;
    return [R + dx * cos - dz * sin, cy + dx * sin + dz * cos];
  };
  const u = size / 110;
  const mr = 8 * u;
  for (const st of stops) {
    let [sx, sy] = toScreen(st.x, st.z);
    const dx = sx - R, dy = sy - R, d = Math.hypot(dx, dy);
    const edge = R - mr - 2;
    if (d > edge) {
      if (!st.next) continue;
      sx = R + (dx / d) * edge; sy = R + (dy / d) * edge;
    }
    g.beginPath(); g.arc(sx, sy, mr + (st.next ? 1.5 : 0), 0, Math.PI * 2);
    g.fillStyle = st.visited ? '#ffffff' : st.color; g.fill();
    g.lineWidth = (st.next ? 2.6 : 1.6) * u; g.strokeStyle = st.next ? '#ffffff' : 'rgba(42,33,24,.55)'; g.stroke();
    if (st.next) { g.lineWidth = 1.4 * u; g.strokeStyle = '#2a2118'; g.beginPath(); g.arc(sx, sy, mr + 3.4 * u, 0, Math.PI * 2); g.stroke(); }
    if (st.visited) drawIcon(g, 'check', sx, sy, mr * 1.5, '#3f9b3a');
    else drawIcon(g, st.icon, sx, sy, mr * 1.45, '#2a2118');
  }

  // north badge on the rim
  const nx = R + sin * (R - 9 * u), ny = R - cos * (R - 9 * u);
  g.beginPath(); g.arc(nx, ny, 7.5 * u, 0, Math.PI * 2); g.fillStyle = '#c9673e'; g.fill();
  g.fillStyle = '#fff'; g.font = `800 ${Math.round(10 * u)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(northLabel, nx, ny + 0.5 * u);

  // the cart
  g.save();
  g.translate(R, cy);
  const a = 7.5 * u;
  g.beginPath(); g.moveTo(0, -a * 1.25); g.lineTo(a * 0.9, a * 0.85); g.lineTo(0, a * 0.4); g.lineTo(-a * 0.9, a * 0.85); g.closePath();
  g.fillStyle = '#ffffff'; g.fill();
  g.lineWidth = 2.2 * u; g.strokeStyle = '#c9673e'; g.stroke();
  g.restore();
}
