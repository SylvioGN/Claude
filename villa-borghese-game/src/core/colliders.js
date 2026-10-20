// Static 2D collision world on the ground plane (x, z): circles and wall segments in a grid hash.
// Modules register solid things they build (tree trunks, buildings, fences, fountains...).
// The cart resolves its hit circles against this world every frame.
//
// Tags are free-form strings used for sounds/reactions: 'tree', 'building', 'wall', 'fence',
// 'hedge', 'water', 'fountain', 'statue', 'bench', 'lamp', 'boundary', 'rock', 'sign'...

const CELL = 8;

export class Colliders {
  constructor(extent) {
    this.x0 = extent.minX; this.z0 = extent.minZ;
    this.nx = Math.ceil((extent.maxX - extent.minX) / CELL) + 1;
    this.nz = Math.ceil((extent.maxZ - extent.minZ) / CELL) + 1;
    this.cells = new Array(this.nx * this.nz);
    this.shapes = [];
    this._stamp = 0;
  }

  _insert(shape, minX, minZ, maxX, maxZ) {
    shape.id = this.shapes.length;
    shape.stamp = 0;
    this.shapes.push(shape);
    const i0 = Math.max(0, Math.floor((minX - this.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((maxX - this.x0) / CELL));
    const j0 = Math.max(0, Math.floor((minZ - this.z0) / CELL)), j1 = Math.min(this.nz - 1, Math.floor((maxZ - this.z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (this.cells[j * this.nx + i] ||= []).push(shape);
    return shape;
  }

  addCircle(x, z, r, tag = 'solid', data = null) {
    return this._insert({ type: 0, x, z, r, tag, data }, x - r, z - r, x + r, z + r);
  }

  // A wall segment with half-thickness pad.
  addSegment(ax, az, bx, bz, tag = 'wall', data = null, pad = 0.25) {
    return this._insert({ type: 1, ax, az, bx, bz, pad, tag, data },
      Math.min(ax, bx) - pad, Math.min(az, bz) - pad, Math.max(ax, bx) + pad, Math.max(az, bz) + pad);
  }

  addPolyline(pts, closed = false, tag = 'wall', data = null, pad = 0.25) {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      this.addSegment(a[0], a[1], b[0], b[1], tag, data, pad);
    }
  }

  addRing(ring, tag = 'wall', data = null, pad = 0.25) { this.addPolyline(ring, true, tag, data, pad); }

  // Oriented rectangle: len along `angle` (radians, measured from +x towards +z), wid across.
  addBox(cx, cz, len, wid, angle, tag = 'building', data = null) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const hx = len / 2, hz = wid / 2;
    const pts = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]);
    this.addRing(pts, tag, data);
    return pts;
  }

  // Calls fn(shape) once for each shape whose cell overlaps the circle's bounds.
  query(x, z, r, fn) {
    const stamp = ++this._stamp;
    const i0 = Math.max(0, Math.floor((x - r - this.x0) / CELL)), i1 = Math.min(this.nx - 1, Math.floor((x + r - this.x0) / CELL));
    const j0 = Math.max(0, Math.floor((z - r - this.z0) / CELL)), j1 = Math.min(this.nz - 1, Math.floor((z + r - this.z0) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const list = this.cells[j * this.nx + i];
        if (!list) continue;
        for (const s of list) {
          if (s.stamp === stamp) continue;
          s.stamp = stamp;
          fn(s);
        }
      }
    }
  }

  // Push a circle out of every overlapping shape.
  // Returns {x, z, hit, nx, nz, depth, tag, shape} where (nx, nz) points away from the deepest hit.
  collideCircle(x, z, r) {
    const out = { x, z, hit: false, nx: 0, nz: 0, depth: 0, tag: null, shape: null };
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      this.query(out.x, out.z, r + 0.5, (s) => {
        let dx, dz, minD;
        if (s.type === 0) {
          dx = out.x - s.x; dz = out.z - s.z; minD = r + s.r;
        } else {
          const sx = s.bx - s.ax, sz = s.bz - s.az;
          const L2 = sx * sx + sz * sz;
          let t = L2 > 0 ? ((out.x - s.ax) * sx + (out.z - s.az) * sz) / L2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          dx = out.x - (s.ax + sx * t); dz = out.z - (s.az + sz * t); minD = r + s.pad;
        }
        const d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD) return;
        let d = Math.sqrt(d2);
        if (d < 1e-6) { dx = 1; dz = 0; d = 1e-6; }
        const depth = minD - d;
        const nx = dx / d, nz = dz / d;
        out.x += nx * depth; out.z += nz * depth;
        moved = true;
        if (depth > out.depth || !out.hit) { out.depth = depth; out.nx = nx; out.nz = nz; out.tag = s.tag; out.shape = s; }
        out.hit = true;
      });
      if (!moved) break;
    }
    return out;
  }

  // True when the circle overlaps nothing (handy for placing props).
  isFree(x, z, r) {
    let free = true;
    this.query(x, z, r + 0.5, (s) => {
      if (!free) return;
      if (s.type === 0) {
        const dx = x - s.x, dz = z - s.z, m = r + s.r;
        if (dx * dx + dz * dz < m * m) free = false;
      } else {
        const sx = s.bx - s.ax, sz = s.bz - s.az;
        const L2 = sx * sx + sz * sz;
        let t = L2 > 0 ? ((x - s.ax) * sx + (z - s.az) * sz) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = x - (s.ax + sx * t), dz = z - (s.az + sz * t), m = r + s.pad;
        if (dx * dx + dz * dz < m * m) free = false;
      }
    });
    return free;
  }
}
