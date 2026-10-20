// Route finding for the guide: the park's avenues as a graph (path polylines joined where they
// meet or cross) and A* from any point in the park to a goal on an avenue.
// No three.js in here so it can be tested with plain node.
import { closestOnSegment, pointInRing, distToRingEdge, ringBBox } from '../../core/geo.js';

// Cost per unit of length: wide gravel avenues first, footways and dirt paths when they save time.
const OFF_PATH = 1.8;   // driving across the grass to reach an avenue
const KIND_COST = { viale: 1, bridge: 1, footway: 1.12, path: 1.3, plaza: 1.05, grass: OFF_PATH };
const CELL = 12;        // edge hash cell size
const cellKey = (i, j) => (i + 4096) * 8192 + j + 4096;

// blocked(ax, az, bx, bz): true when a straight hop across the grass would hit a wall or water.
export function buildRouteGraph(paths, { isInside = () => true, plazas = [], join = 1.5, blocked = () => false } = {}) {
  // --- 1. raw segments (inside the park only; bridges may leave the drivable outline)
  const segs = [];
  const ends = []; // polyline end points, joined to nearby segments (T junctions)
  paths.forEach((p, pi) => {
    const bridge = p.k === 'bridge';
    for (let k = 1; k < p.p.length; k++) {
      const [ax, az] = p.p[k - 1], [bx, bz] = p.p[k];
      if (!bridge && !isInside((ax + bx) / 2, (az + bz) / 2)) continue;
      segs.push({ ax, az, bx, bz, kind: p.k, bridge, path: pi, idx: k, splits: [0, 1] });
    }
    ends.push({ x: p.p[0][0], z: p.p[0][1], path: pi, idx: 0 });
    ends.push({ x: p.p[p.p.length - 1][0], z: p.p[p.p.length - 1][1], path: pi, idx: p.p.length - 1 });
  });

  const segGrid = new Map();
  const cellsOf = (minX, minZ, maxX, maxZ, fn) => {
    for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) {
      for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++) fn(cellKey(i, j));
    }
  };
  segs.forEach((s, si) => {
    cellsOf(Math.min(s.ax, s.bx) - join, Math.min(s.az, s.bz) - join, Math.max(s.ax, s.bx) + join, Math.max(s.az, s.bz) + join, (k) => {
      if (!segGrid.has(k)) segGrid.set(k, []);
      segGrid.get(k).push(si);
    });
  });

  // --- 2. crossings (bridges pass over the roads below, so they only join at their ends)
  const seen = new Set();
  for (const list of segGrid.values()) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const i = Math.min(list[a], list[b]), j = Math.max(list[a], list[b]);
        const s = segs[i], u = segs[j];
        if (s.bridge || u.bridge) continue;
        if (Math.max(s.ax, s.bx) < Math.min(u.ax, u.bx) || Math.min(s.ax, s.bx) > Math.max(u.ax, u.bx)) continue;
        if (Math.max(s.az, s.bz) < Math.min(u.az, u.bz) || Math.min(s.az, s.bz) > Math.max(u.az, u.bz)) continue;
        const key = i * 100003 + j;
        if (seen.has(key)) continue;
        seen.add(key);
        const rx = s.bx - s.ax, rz = s.bz - s.az, qx = u.bx - u.ax, qz = u.bz - u.az;
        const den = rx * qz - rz * qx;
        if (Math.abs(den) < 1e-9) continue;
        const wx = u.ax - s.ax, wz = u.az - s.az;
        const t = (wx * qz - wz * qx) / den, v = (wx * rz - wz * rx) / den;
        if (t > 0.001 && t < 0.999 && v > 0.001 && v < 0.999) { s.splits.push(t); u.splits.push(v); }
      }
    }
  }
  // T junctions: a polyline that ends on (or just short of) another avenue
  for (const e of ends) {
    cellsOf(e.x, e.z, e.x, e.z, (k) => {
      for (const si of segGrid.get(k) || []) {
        const s = segs[si];
        if (s.path === e.path && (s.idx === e.idx || s.idx === e.idx + 1)) continue;
        const c = closestOnSegment(e.x, e.z, s.ax, s.az, s.bx, s.bz);
        if (c.d2 < join * join * 2.25 && c.t > 0.001 && c.t < 0.999) s.splits.push(c.t);
      }
    });
  }

  // --- 3. nodes (points closer than `join` are merged) and edges
  const nx = [], nz = [], adj = [];
  const nodeGrid = new Map();
  const nodeAt = (x, z) => {
    const ci = Math.floor(x / join), cj = Math.floor(z / join);
    let best = -1, bd = join * join;
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        for (const n of nodeGrid.get(cellKey(i, j)) || []) {
          const d = (nx[n] - x) ** 2 + (nz[n] - z) ** 2;
          if (d < bd) { bd = d; best = n; }
        }
      }
    }
    if (best >= 0) return best;
    const id = nx.length;
    nx.push(x); nz.push(z); adj.push([]);
    const k = cellKey(ci, cj);
    if (!nodeGrid.has(k)) nodeGrid.set(k, []);
    nodeGrid.get(k).push(id);
    return id;
  };
  const edges = [];
  const link = (a, b, kind) => {
    if (a === b) return;
    if (adj[a].some((e) => e[0] === b)) return;
    const len = Math.hypot(nx[b] - nx[a], nz[b] - nz[a]);
    const cost = len * (KIND_COST[kind] || 1.2);
    adj[a].push([b, cost]);
    adj[b].push([a, cost]);
    edges.push({ a, b, kf: KIND_COST[kind] || 1.2 });
  };
  for (const s of segs) {
    const ts = [...new Set(s.splits)].sort((p, q) => p - q);
    let prev = -1;
    for (const t of ts) {
      const n = nodeAt(s.ax + (s.bx - s.ax) * t, s.az + (s.bz - s.az) * t);
      if (prev >= 0) link(prev, n, s.kind);
      prev = n;
    }
  }

  // --- 4. squares: the dead ends that open onto the same piazza are joined across it
  for (const pl of plazas) {
    const bb = ringBBox(pl.r);
    const near = [];
    for (let n = 0; n < nx.length; n++) {
      if (adj[n].length > 1 || nx[n] < bb.minX - 3 || nx[n] > bb.maxX + 3 || nz[n] < bb.minZ - 3 || nz[n] > bb.maxZ + 3) continue;
      if (pointInRing(nx[n], nz[n], pl.r) || distToRingEdge(nx[n], nz[n], pl.r) < 3) near.push(n);
    }
    for (let a = 0; a < near.length; a++) for (let b = a + 1; b < near.length; b++) link(near[a], near[b], 'plaza');
  }

  // --- 5. islands (garden paths, short loops): hop across the grass to the main network
  const comp = new Int32Array(nx.length).fill(-1);
  const members = [];
  for (let n = 0; n < nx.length; n++) {
    if (comp[n] >= 0) continue;
    const list = [n], stack = [n];
    comp[n] = members.length;
    while (stack.length) {
      for (const [v] of adj[stack.pop()]) if (comp[v] < 0) { comp[v] = members.length; list.push(v); stack.push(v); }
    }
    members.push(list);
  }
  const main = members.reduce((m, l, i) => (l.length > members[m].length ? i : m), 0);
  const splitEdge = (ei, x, z) => {
    const e = edges[ei], p = nx.length;
    nx.push(x); nz.push(z); adj.push([]);
    comp[p] = comp[e.a];
    adj[e.a] = adj[e.a].filter((a) => a[0] !== e.b);
    adj[e.b] = adj[e.b].filter((a) => a[0] !== e.a);
    const kind = Object.keys(KIND_COST).find((k) => KIND_COST[k] === e.kf) || 'path';
    edges.splice(ei, 1);
    link(e.a, p, kind);
    link(p, e.b, kind);
    return p;
  };
  members.forEach((list, ci) => {
    if (ci === main) return;
    const R = 45;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const n of list) {
      minX = Math.min(minX, nx[n] - R); maxX = Math.max(maxX, nx[n] + R);
      minZ = Math.min(minZ, nz[n] - R); maxZ = Math.max(maxZ, nz[n] + R);
    }
    const near = [];
    for (let ei = 0; ei < edges.length; ei++) {
      const e = edges[ei];
      if (comp[e.a] !== main) continue;
      if (Math.max(nx[e.a], nx[e.b]) < minX || Math.min(nx[e.a], nx[e.b]) > maxX) continue;
      if (Math.max(nz[e.a], nz[e.b]) < minZ || Math.min(nz[e.a], nz[e.b]) > maxZ) continue;
      near.push(ei);
    }
    let best = null;
    for (const n of list) {
      for (const ei of near) {
        const e = edges[ei];
        const c = closestOnSegment(nx[n], nz[n], nx[e.a], nz[e.a], nx[e.b], nz[e.b]);
        if (c.d2 > R * R || (best && c.d2 >= best.d2)) continue;
        if (blocked(nx[n], nz[n], c.x, c.z)) continue;
        best = { n, ei, x: c.x, z: c.z, d2: c.d2, t: c.t };
      }
    }
    if (!best) return;
    const e = edges[best.ei];
    const p = best.t < 0.02 ? e.a : best.t > 0.98 ? e.b : splitEdge(best.ei, best.x, best.z);
    link(best.n, p, 'grass');
    for (const n of list) comp[n] = main;
  });

  // --- 6. edge hash for nearest-avenue queries
  const edgeGrid = new Map();
  edges.forEach((e, ei) => {
    cellsOf(Math.min(nx[e.a], nx[e.b]), Math.min(nz[e.a], nz[e.b]), Math.max(nx[e.a], nx[e.b]), Math.max(nz[e.a], nz[e.b]), (k) => {
      if (!edgeGrid.has(k)) edgeGrid.set(k, []);
      edgeGrid.get(k).push(ei);
    });
  });

  return { nx, nz, adj, edges, edgeGrid };
}

// Closest points on edges within radius r of (x, z): [{edge, x, z, d}], nearest first.
export function nearestEdges(graph, x, z, r, max = 6) {
  const { nx, nz, edges, edgeGrid } = graph;
  const found = new Map();
  for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) {
      for (const ei of edgeGrid.get(cellKey(i, j)) || []) {
        if (found.has(ei)) continue;
        const e = edges[ei];
        const c = closestOnSegment(x, z, nx[e.a], nz[e.a], nx[e.b], nz[e.b]);
        found.set(ei, { edge: ei, x: c.x, z: c.z, d: Math.sqrt(c.d2) });
      }
    }
  }
  return [...found.values()].filter((c) => c.d <= r).sort((a, b) => a.d - b.d).slice(0, max);
}

// Tiny binary heap of [priority, node].
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(p, n) {
    const a = this.a;
    a.push([p, n]);
    let i = a.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (a[up][0] <= a[i][0]) break;
      [a[up], a[i]] = [a[i], a[up]];
      i = up;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

// Route from (sx, sz) to (gx, gz) along the avenues: an array of [x, z] or null.
// blocked(ax, az, bx, bz) says whether a straight hop across the grass hits a wall or water.
export function findRoute(graph, sx, sz, gx, gz, blocked = () => false) {
  const { nx, nz, adj, edges } = graph;
  const N = nx.length;
  // Virtual nodes: S = N (the cart), G = N + 1 (the goal), then entry points on nearby edges.
  const vx = [sx, gx], vz = [sz, gz];
  const extra = new Map(); // node -> [[to, cost]]
  const addArc = (from, to, cost) => {
    if (!extra.has(from)) extra.set(from, []);
    extra.get(from).push([to, cost]);
  };
  const S = N, G = N + 1;
  const entry = (c) => { vx.push(c.x); vz.push(c.z); return N + vx.length - 1; };

  // goal: it sits on an avenue (the stop's photo spot), so join it to the edges right there
  const goalEdges = nearestEdges(graph, gx, gz, 4, 4);
  const goalOn = new Map(); // edge -> goal entry node
  for (const c of goalEdges) {
    const v = entry(c), e = edges[c.edge];
    addArc(e.a, v, Math.hypot(nx[e.a] - c.x, nz[e.a] - c.z) * e.kf);
    addArc(e.b, v, Math.hypot(nx[e.b] - c.x, nz[e.b] - c.z) * e.kf);
    addArc(v, G, c.d * OFF_PATH);
    goalOn.set(c.edge, v);
  }

  // start: the avenues around the cart (it may be out on the grass, and a hop across a lawn can
  // beat driving round the block)
  let starts = [];
  for (const r of [30, 90, 200]) {
    starts = nearestEdges(graph, sx, sz, r, 14).filter((c) => c.d < 1.5 || !blocked(sx, sz, c.x, c.z));
    if (starts.length) break;
  }
  for (const c of starts) {
    const v = entry(c), e = edges[c.edge];
    addArc(S, v, c.d * OFF_PATH);
    addArc(v, e.a, Math.hypot(nx[e.a] - c.x, nz[e.a] - c.z) * e.kf);
    addArc(v, e.b, Math.hypot(nx[e.b] - c.x, nz[e.b] - c.z) * e.kf);
    const gv = goalOn.get(c.edge);
    if (gv !== undefined) addArc(v, gv, Math.hypot(vx[gv - N] - c.x, vz[gv - N] - c.z) * e.kf);
  }
  const direct = Math.hypot(gx - sx, gz - sz);
  if (direct < 25 && !blocked(sx, sz, gx, gz)) addArc(S, G, direct * OFF_PATH);

  const px = (n) => (n < N ? nx[n] : vx[n - N]);
  const pz = (n) => (n < N ? nz[n] : vz[n - N]);
  const M = N + vx.length;
  const g = new Float64Array(M).fill(Infinity);
  const from = new Int32Array(M).fill(-1);
  const closed = new Uint8Array(M);
  const open = new Heap();
  g[S] = 0;
  open.push(direct, S);
  while (open.size) {
    const u = open.pop()[1];
    if (u === G) break;
    if (closed[u]) continue;
    closed[u] = 1;
    const gu = g[u];
    const relax = (v, cost) => {
      const gv = gu + cost;
      if (gv < g[v]) {
        g[v] = gv;
        from[v] = u;
        open.push(gv + Math.hypot(gx - px(v), gz - pz(v)), v);
      }
    };
    if (u < N) for (const [v, cost] of adj[u]) relax(v, cost);
    const ex = extra.get(u);
    if (ex) for (const [v, cost] of ex) relax(v, cost);
  }
  if (from[G] < 0) return null;
  const out = [];
  for (let n = G; n >= 0; n = from[n]) {
    const x = px(n), z = pz(n);
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - x, last[1] - z) > 0.05) out.push([x, z]);
  }
  return out.reverse();
}
