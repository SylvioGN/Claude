// Walking network built from MAP.PATHS: shared vertices become nodes, dead ends that stop
// within a few metres of another path are joined to it (OSM T-junctions), edges outside the
// park are dropped. Used for people's walks, spawn points and gelato routes between stops.
import { closestOnSegment } from '../../core/geo.js';

const SNAP = 5;
const CELL = 25;

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = [k[0], v[0]];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mk = lk;
        if (l < k.length && k[l] < mk) { m = l; mk = k[l]; }
        if (r < k.length && k[r] < mk) { m = r; }
        if (m === i) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

export function buildGraph(MAP, terrain) {
  const nodes = [], edges = [];
  const index = new Map();
  const key = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`;
  const node = (x, z) => {
    const k = key(x, z);
    let i = index.get(k);
    if (i === undefined) { i = nodes.length; nodes.push({ x, z, e: [] }); index.set(k, i); }
    return i;
  };
  const raw = [];
  for (const p of MAP.PATHS) {
    let prev = -1;
    for (const [x, z] of p.p) {
      const n = node(x, z);
      if (prev >= 0 && prev !== n) raw.push({ a: prev, b: n, kind: p.k, w: p.w, name: p.n });
      prev = n;
    }
  }
  // join dead ends onto the nearest other edge
  const deg = new Map();
  for (const r of raw) { deg.set(r.a, (deg.get(r.a) || 0) + 1); deg.set(r.b, (deg.get(r.b) || 0) + 1); }
  for (const [i, d] of deg) {
    if (d !== 1) continue;
    const n = nodes[i];
    let best = null;
    for (const r of raw) {
      if (r.a === i || r.b === i) continue;
      const A = nodes[r.a], B = nodes[r.b];
      const c = closestOnSegment(n.x, n.z, A.x, A.z, B.x, B.z);
      if (c.d2 < SNAP * SNAP && (!best || c.d2 < best.c.d2)) best = { r, c };
    }
    if (!best) continue;
    const { r, c } = best;
    const A = nodes[r.a], B = nodes[r.b];
    let target;
    if (Math.hypot(A.x - c.x, A.z - c.z) < 1) target = r.a;
    else if (Math.hypot(B.x - c.x, B.z - c.z) < 1) target = r.b;
    else {
      target = nodes.length;
      nodes.push({ x: c.x, z: c.z, e: [] });
      raw.push({ a: target, b: r.b, kind: r.kind, w: r.w, name: r.name });
      r.b = target;
    }
    const nn = nodes[target];
    if (Math.hypot(nn.x - n.x, nn.z - n.z) > 0.05) raw.push({ a: i, b: target, kind: 'path', w: 2.8, name: '' });
  }
  for (const r of raw) {
    const A = nodes[r.a], B = nodes[r.b];
    const len = Math.hypot(B.x - A.x, B.z - A.z);
    if (len < 0.05) continue;
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
    if (r.kind !== 'bridge' && !terrain.isInside(mx, mz)) continue;
    const e = { i: edges.length, a: r.a, b: r.b, len, kind: r.kind, w: r.w, name: r.name, dx: (B.x - A.x) / len, dz: (B.z - A.z) / len };
    edges.push(e);
    A.e.push(e.i); B.e.push(e.i);
  }

  // spatial grid of edges
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const n of nodes) { minX = Math.min(minX, n.x); minZ = Math.min(minZ, n.z); maxX = Math.max(maxX, n.x); maxZ = Math.max(maxZ, n.z); }
  const gx0 = minX, gz0 = minZ, gnx = Math.ceil((maxX - minX) / CELL) + 1, gnz = Math.ceil((maxZ - minZ) / CELL) + 1;
  const grid = new Array(gnx * gnz);
  for (const e of edges) {
    const A = nodes[e.a], B = nodes[e.b];
    const i0 = Math.floor((Math.min(A.x, B.x) - gx0) / CELL), i1 = Math.floor((Math.max(A.x, B.x) - gx0) / CELL);
    const j0 = Math.floor((Math.min(A.z, B.z) - gz0) / CELL), j1 = Math.floor((Math.max(A.z, B.z) - gz0) / CELL);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (grid[j * gnx + i] ||= []).push(e.i);
  }
  function edgesNear(x, z, r, out = []) {
    out.length = 0;
    const i0 = Math.max(0, Math.floor((x - r - gx0) / CELL)), i1 = Math.min(gnx - 1, Math.floor((x + r - gx0) / CELL));
    const j0 = Math.max(0, Math.floor((z - r - gz0) / CELL)), j1 = Math.min(gnz - 1, Math.floor((z + r - gz0) / CELL));
    const seen = new Set();
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      for (const k of grid[j * gnx + i] || []) if (!seen.has(k)) { seen.add(k); out.push(k); }
    }
    return out;
  }

  const g = {
    nodes, edges, edgesNear,
    other(e, n) { return e.a === n ? e.b : e.a; },
    // nearest point on the network: {e, t (distance from e.a), x, z, d}
    nearest(x, z, r = 40, filter = null) {
      let best = null;
      for (const k of edgesNear(x, z, r)) {
        const e = edges[k];
        if (filter && !filter(e)) continue;
        const A = nodes[e.a], B = nodes[e.b];
        const c = closestOnSegment(x, z, A.x, A.z, B.x, B.z);
        if (!best || c.d2 < best.d2) best = { e, t: c.t * e.len, x: c.x, z: c.z, d2: c.d2 };
      }
      if (best) best.d = Math.sqrt(best.d2);
      return best;
    },
    // random point on an edge between rMin and rMax from (x, z); accept(p) can veto candidates
    randomNear(x, z, rMin, rMax, rnd, filter = null, accept = null, tries = 40) {
      const list = edgesNear(x, z, rMax).filter((k) => !filter || filter(edges[k]));
      if (!list.length) return null;
      let fallback = null;
      for (let i = 0; i < tries; i++) {
        const e = edges[list[Math.floor(rnd() * list.length)]];
        const t = rnd() * e.len;
        const A = nodes[e.a];
        const px = A.x + e.dx * t, pz = A.z + e.dz * t;
        const d = Math.hypot(px - x, pz - z);
        if (d < rMin || d > rMax) continue;
        const p = { e, t, x: px, z: pz, d };
        if (!accept || accept(p)) return p;
        fallback ||= p;
      }
      return fallback;
    },
    // shortest route between two nodes as a list of [x, z] points
    route(from, to) {
      const N = nodes.length;
      const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
      const heap = new MinHeap();
      heap.push(0, from);
      dist[from] = 0;
      while (heap.size) {
        const [d, u] = heap.pop();
        if (u === to) break;
        if (d > dist[u]) continue;
        for (const k of nodes[u].e) {
          const e = edges[k], v = e.a === u ? e.b : e.a;
          const w = e.len * (e.kind === 'viale' ? 1 : e.kind === 'footway' ? 1.4 : 2);
          if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; heap.push(d + w, v); }
        }
      }
      if (from !== to && prev[to] < 0) return null;
      const pts = [];
      for (let u = to; u >= 0; u = prev[u]) { pts.push([nodes[u].x, nodes[u].z]); if (u === from) break; }
      return pts.reverse();
    },
    nearestNode(x, z) {
      const hit = g.nearest(x, z, 60);
      if (!hit) return -1;
      return hit.t < hit.e.len / 2 ? hit.e.a : hit.e.b;
    },
  };
  return g;
}

// Routes of the Grand Tour: from the start, always on to the nearest unvisited stop.
export function tourRoutes(graph, game) {
  const left = game.stops.map((s) => ({ x: s.spotX, z: s.spotZ }));
  let cur = { x: game.start.x, z: game.start.z };
  const routes = [];
  while (left.length) {
    let bi = 0, bd = Infinity;
    left.forEach((s, i) => { const d = Math.hypot(s.x - cur.x, s.z - cur.z); if (d < bd) { bd = d; bi = i; } });
    const next = left.splice(bi, 1)[0];
    const a = graph.nearestNode(cur.x, cur.z), b = graph.nearestNode(next.x, next.z);
    if (a >= 0 && b >= 0) {
      const r = graph.route(a, b);
      if (r && r.length > 1) routes.push(r);
    }
    cur = next;
  }
  return routes;
}
