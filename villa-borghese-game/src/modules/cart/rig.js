// A GeoBuilder whose parts each ride on a bone, merged into ONE SkinnedMesh (one draw call).
// The wheels, the steering wheel and all seven riders share a single skeleton, so the family
// and everything that moves on the cart cost a single draw call (plus its shadow pass).
//
//   const rb = new RigBuilder();
//   const head = rb.bone(neck, 0, 0.5, 0);      // bone in its parent's space (null = top level)
//   rb.on(head).sphere(0.12, 1, skin, 0, 0.14, 0); // parts are given in the bone's local frame
//   const mesh = rb.buildSkinned(material);
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GeoBuilder } from '../../core/util.js';

const _up = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _one = new THREE.Vector3(1, 1, 1);

// Cylinder between two points, added to any GeoBuilder.
export function rod(gb, ax, ay, az, bx, by, bz, r, color, seg = 6) {
  _a.set(ax, ay, az);
  _b.set(bx, by, bz).sub(_a);
  const len = _b.length();
  _q.setFromUnitVectors(_up, _b.normalize());
  _m.compose(_a.addScaledVector(_b, len / 2), _q, _one);
  return gb.add(new THREE.CylinderGeometry(r, r, len, seg, 1), color, _m);
}

export class RigBuilder extends GeoBuilder {
  constructor() {
    super();
    this.bones = [];
    this.holder = new THREE.Group();
    this.current = 0;
    this.boneMatrix = new THREE.Matrix4();
  }

  bone(parent, x = 0, y = 0, z = 0, name = '') {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    (parent || this.holder).add(b);
    this.bones.push(b);
    return b;
  }

  // Following parts move with this bone; their coordinates are in the bone's frame (rest pose).
  on(bone) {
    this.holder.updateMatrixWorld(true);
    this.current = this.bones.indexOf(bone);
    this.boneMatrix.copy(bone.matrixWorld);
    return this;
  }

  add(geometry, color, matrix = null) {
    super.add(geometry, color, matrix);
    const g = this.parts[this.parts.length - 1];
    g.applyMatrix4(this.boneMatrix);
    g.userData.bone = this.current;
    return this;
  }

  buildSkinned(material) {
    for (const g of this.parts) {
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = g.userData.bone; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    }
    const merged = mergeGeometries(this.parts, false);
    const geo = mergeVertices(merged);
    merged.dispose();
    for (const p of this.parts) p.dispose();
    this.parts = [];
    const mesh = new THREE.SkinnedMesh(geo, material);
    for (const b of [...this.holder.children]) mesh.add(b);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(this.bones), new THREE.Matrix4());
    mesh.frustumCulled = false; // always next to the camera; skips re-skinning the bounds
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'cart';
    return mesh;
  }
}
