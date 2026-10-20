// 2D helpers on the ground plane. Points are [x, z] arrays or {x, z} objects where noted.

export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a) / 2;
}

export function ringCentroid(ring) {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return [x / ring.length, z / ring.length];
}

export function ringBBox(ring) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minZ, maxX, maxZ };
}

// Closest point on segment AB to P. Returns {x, z, t, d2}.
export function closestOnSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t, z = az + dz * t;
  return { x, z, t, d2: (px - x) * (px - x) + (pz - z) * (pz - z) };
}

// Closest point on a polyline. Returns {x, z, d, seg, t, dirX, dirZ}.
export function closestOnPolyline(px, pz, pts, closed = false) {
  let best = null;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const c = closestOnSegment(px, pz, a[0], a[1], b[0], b[1]);
    if (!best || c.d2 < best.d2) best = { ...c, seg: i, ax: a[0], az: a[1], bx: b[0], bz: b[1] };
  }
  if (!best) return null;
  const L = Math.hypot(best.bx - best.ax, best.bz - best.az) || 1;
  return { x: best.x, z: best.z, d: Math.sqrt(best.d2), seg: best.seg, t: best.t, dirX: (best.bx - best.ax) / L, dirZ: (best.bz - best.az) / L };
}

export function distToRingEdge(x, z, ring) {
  return closestOnPolyline(x, z, ring, true).d;
}

export function polylineLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// Evenly spaced samples along a polyline: [{x, z, dirX, dirZ, s}]
export function samplePolyline(pts, spacing, offset = 0) {
  const out = [];
  let carry = offset;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1];
    const L = Math.hypot(bx - ax, bz - az);
    if (L === 0) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    let s = carry;
    while (s <= L) {
      out.push({ x: ax + dx * s, z: az + dz * s, dirX: dx, dirZ: dz });
      s += spacing;
    }
    carry = s - L;
  }
  return out;
}

// Uniform random point inside a ring (rejection sampling); rnd is a () => [0,1) function.
export function randomPointInRing(ring, rnd, tries = 60) {
  const b = ringBBox(ring);
  for (let i = 0; i < tries; i++) {
    const x = b.minX + (b.maxX - b.minX) * rnd();
    const z = b.minZ + (b.maxZ - b.minZ) * rnd();
    if (pointInRing(x, z, ring)) return [x, z];
  }
  return null;
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function wrapAngle(a) {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}
