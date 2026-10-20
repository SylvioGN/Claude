// Static prop batching: every placed prop is baked into one merged mesh per spatial chunk and
// layer, so the whole park's furniture costs a handful of draw calls. Templates are vertex-coloured
// geometries from util.buildGeometry (position, normal, color). Chunks are hidden beyond a layer's
// view distance (small things like benches vanish sooner than lamps and kiosks).
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _n3 = new THREE.Matrix3();

export class ChunkBatch {
  // size: chunk edge in game units; range: distance from the camera beyond which a chunk is hidden.
  constructor(name, size, range) {
    this.name = name;
    this.size = size;
    this.range = range;
    this.chunks = new Map();
    this.meshes = [];
  }

  add(tpl, x, y, z, ry = 0, s = 1) {
    if (!tpl) return;
    const k = `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
    let list = this.chunks.get(k);
    if (!list) this.chunks.set(k, (list = []));
    _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(_up, ry), _s.set(s, s, s));
    list.push({ tpl, m: _m.clone() });
  }

  // Merges each chunk into one mesh: float positions, byte normals and byte colours keep memory low.
  build(scene, material, { castShadow = true, receiveShadow = true } = {}) {
    for (const list of this.chunks.values()) {
      let n = 0;
      for (const it of list) n += it.tpl.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Int8Array(n * 3), col = new Uint8Array(n * 3);
      let o = 0;
      for (const { tpl, m } of list) {
        const P = tpl.attributes.position.array, N = tpl.attributes.normal.array, C = tpl.attributes.color.array;
        const e = m.elements;
        // rotation about y with uniform scale: the normal matrix is a scaled rotation
        const ne = _n3.getNormalMatrix(m).elements;
        const k = 127 / Math.sqrt(ne[0] * ne[0] + ne[1] * ne[1] + ne[2] * ne[2]);
        const cnt = tpl.attributes.position.count;
        for (let i = 0; i < cnt; i++, o++) {
          const i3 = i * 3, o3 = o * 3;
          const x = P[i3], y = P[i3 + 1], z = P[i3 + 2];
          pos[o3] = e[0] * x + e[4] * y + e[8] * z + e[12];
          pos[o3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          pos[o3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          const a = N[i3], b = N[i3 + 1], c = N[i3 + 2];
          nor[o3] = Math.round((ne[0] * a + ne[3] * b + ne[6] * c) * k);
          nor[o3 + 1] = Math.round((ne[1] * a + ne[4] * b + ne[7] * c) * k);
          nor[o3 + 2] = Math.round((ne[2] * a + ne[5] * b + ne[8] * c) * k);
          col[o3] = Math.round(C[i3] * 255); col[o3 + 1] = Math.round(C[i3 + 1] * 255); col[o3 + 2] = Math.round(C[i3 + 2] * 255);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, material);
      mesh.name = `props.${this.name}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
      const bs = g.boundingSphere;
      this.meshes.push({ mesh, x: bs.center.x, z: bs.center.z, r: bs.radius });
    }
    this.chunks.clear();
    return this;
  }

  // Hide chunks that are too far from the camera to matter (cheap: a few dozen distance checks).
  cull(cx, cz) {
    for (const c of this.meshes) {
      const lim = this.range + c.r;
      const dx = c.x - cx, dz = c.z - cz;
      c.mesh.visible = dx * dx + dz * dz < lim * lim;
    }
  }

  get triangles() {
    let t = 0;
    for (const c of this.meshes) t += c.mesh.geometry.attributes.position.count / 3;
    return t;
  }
}
