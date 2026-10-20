// Terrain mesh cut from the shared height grid (terrain.H), so every vertex sits exactly on a grid
// node of heightAt. The grid is split into blocks of 48 nodes: blocks over the park (and a margin
// around it) use every 2nd node (3rd on 'low'); blocks out in the city get coarser when that keeps
// them within a few centimetres of heightAt. Skirts hang under block edges where the detail
// changes, and blocks are merged into tiles of 3x3 for few draw calls with useful culling.
import { REGION } from './ground.js';

const BLOCK = 48;         // grid nodes per block edge (72 world units)
const TILE = 3;           // blocks per tile edge
const SKIRT = 1.2;        // skirt depth
const COARSE_TOL = 0.08;  // max height error allowed for coarser city blocks
const PARK_MARGIN = 14;   // full detail this far outside the drivable area

export function buildTerrain(ctx, material) {
  const { THREE, terrain: T, quality } = ctx;
  const { H, nx, nz, G, x0, z0 } = T;
  const fine = quality.tier === 'low' ? 3 : 2;
  const h = (i, j) => H[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  const samples = (a, b, step) => {
    const out = [];
    for (let i = a; i < b; i += step) out.push(i);
    out.push(b);
    return out;
  };
  // Largest error between the full grid and a coarser grid (bilinear between samples).
  const coarseError = (is, js) => {
    let err = 0;
    for (let b = 0; b < js.length - 1; b++) {
      for (let a = 0; a < is.length - 1; a++) {
        const ia = is[a], ib = is[a + 1], ja = js[b], jb = js[b + 1];
        const h00 = h(ia, ja), h10 = h(ib, ja), h01 = h(ia, jb), h11 = h(ib, jb);
        for (let j = ja; j <= jb; j++) {
          const v = (j - ja) / (jb - ja);
          for (let i = ia; i <= ib; i++) {
            const u = (i - ia) / (ib - ia);
            const e = Math.abs((h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v - h(i, j));
            if (e > err) err = e;
          }
        }
      }
    }
    return err;
  };

  // pick a step for every block
  const bnx = Math.ceil((nx - 1) / BLOCK), bnz = Math.ceil((nz - 1) / BLOCK);
  const blocks = [];
  for (let bj = 0; bj < bnz; bj++) {
    for (let bi = 0; bi < bnx; bi++) {
      const i0 = bi * BLOCK, j0 = bj * BLOCK;
      const i1 = Math.min(i0 + BLOCK, nx - 1), j1 = Math.min(j0 + BLOCK, nz - 1);
      let near = false;
      for (let j = j0; j <= j1 && !near; j += 4) {
        for (let i = i0; i <= i1; i += 4) {
          if (T.outsideDistance(x0 + i * G, z0 + j * G) < PARK_MARGIN) { near = true; break; }
        }
      }
      let step = fine;
      if (!near) {
        for (const s of [fine * 4, fine * 2]) {
          if (coarseError(samples(i0, i1, s), samples(j0, j1, s)) < COARSE_TOL) { step = s; break; }
        }
      }
      blocks.push({ bi, bj, i0, i1, j0, j1, step });
    }
  }
  const blockAt = (bi, bj) => (bi < 0 || bj < 0 || bi >= bnx || bj >= bnz ? null : blocks[bj * bnx + bi]);

  const group = new THREE.Group();
  group.name = 'terrain';
  const tiles = [];
  let triangles = 0;
  for (let tj = 0; tj < bnz; tj += TILE) {
    for (let ti = 0; ti < bnx; ti += TILE) {
      const geo = new TileGeometry();
      for (let bj = tj; bj < Math.min(tj + TILE, bnz); bj++) {
        for (let bi = ti; bi < Math.min(ti + TILE, bnx); bi++) {
          const b = blockAt(bi, bj);
          const differs = (n) => n && n.step !== b.step;
          geo.addBlock(T, h, samples(b.i0, b.i1, b.step), samples(b.j0, b.j1, b.step), {
            n: differs(blockAt(bi, bj - 1)), e: differs(blockAt(bi + 1, bj)),
            s: differs(blockAt(bi, bj + 1)), w: differs(blockAt(bi - 1, bj)),
          });
        }
      }
      const mesh = geo.build(THREE, material);
      triangles += mesh.geometry.index.count / 3;
      group.add(mesh);
      tiles.push(mesh);
    }
  }
  group.userData.triangles = triangles;
  group.userData.blocks = blocks;
  return { group, tiles };
}

class TileGeometry {
  constructor() { this.pos = []; this.nor = []; this.idx = []; this.n = 0; }

  put(x, y, z, nx, ny, nz) {
    this.pos.push(x, y, z);
    this.nor.push(nx, ny, nz);
    return this.n++;
  }

  addBlock(T, h, is, js, skirts) {
    const { x0, z0, G } = T;
    const cols = is.length, rows = js.length;
    const base = this.n;
    const { pos, idx } = this;
    // normals from central differences on the full-resolution grid
    for (let b = 0; b < rows; b++) {
      for (let a = 0; a < cols; a++) {
        const i = is[a], j = js[b];
        const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * G), dz = (h(i, j + 1) - h(i, j - 1)) / (2 * G);
        const L = Math.hypot(dx, 1, dz);
        this.put(x0 + i * G, h(i, j), z0 + j * G, -dx / L, 1 / L, -dz / L);
      }
    }
    const y = (k) => pos[k * 3 + 1];
    for (let b = 0; b < rows - 1; b++) {
      for (let a = 0; a < cols - 1; a++) {
        const p = base + b * cols + a, q = p + 1, r = p + cols, s = r + 1;
        // split each quad along the diagonal that follows the ground better
        if (Math.abs(y(p) - y(s)) <= Math.abs(y(q) - y(r))) idx.push(p, r, s, p, s, q);
        else idx.push(p, r, q, q, r, s);
      }
    }
    // skirts, each edge walked so the wall faces outwards
    const edge = (list) => {
      let pt = -1, pb = -1;
      for (const t of list) {
        const bt = this.put(pos[t * 3], pos[t * 3 + 1] - SKIRT, pos[t * 3 + 2], this.nor[t * 3], this.nor[t * 3 + 1], this.nor[t * 3 + 2]);
        if (pt >= 0) idx.push(pt, t, pb, t, bt, pb);
        pt = t; pb = bt;
      }
    };
    const range = (n, f) => Array.from({ length: n }, (_, k) => base + f(k));
    if (skirts.n) edge(range(cols, (a) => a));                                   // west -> east
    if (skirts.e) edge(range(rows, (b) => b * cols + cols - 1));                 // north -> south
    if (skirts.s) edge(range(cols, (a) => (rows - 1) * cols + cols - 1 - a));    // east -> west
    if (skirts.w) edge(range(rows, (b) => (rows - 1 - b) * cols));               // south -> north
  }

  build(THREE, material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = 'terrainTile';
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

// Lambert material whose colour comes from the painted ground canvas, sharpened up close by a
// tiled detail texture (grass blades on green ground, grain on gravel), with earthy steep banks
// and plain city ground beyond the painted area.
// Crisp edges: the coverage mask (1 = paved) is cut at 0.5 with a one-pixel smoothstep, like
// alpha-tested text. Near an edge the colour is fetched a little way into the side the pixel is
// on (along the mask gradient), so neither side picks up the other's colour from the blurry
// colour texels. Far away, where a texel is smaller than a pixel, the plain filtered colour is used.
export function terrainMaterial(ctx, groundTex, maskTex, detailTex) {
  const { THREE } = ctx;
  const R = REGION;
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const uniforms = {
    uGround: { value: groundTex },
    uMask: { value: maskTex },
    uMaskSize: { value: new THREE.Vector2(maskTex.image.width, maskTex.image.height) },
    uDetail: { value: detailTex },
    uRegion: { value: new THREE.Vector4(R.x0, R.z0, 1 / (R.x1 - R.x0), 1 / (R.z1 - R.z0)) },
    uTexel: { value: new THREE.Vector2(1 / groundTex.image.width, 1 / groundTex.image.height) },
    uCity: { value: new THREE.Color('#8f887e') },
    uBank: { value: new THREE.Color('#77743f') },
    uWall: { value: new THREE.Color('#c2aa7e') },
    uCityGreen: { value: new THREE.Color('#5f7346') },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying float vUp;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUp = objectNormal.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying float vUp;
uniform sampler2D uGround;
uniform sampler2D uMask;
uniform vec2 uMaskSize;
uniform sampler2D uDetail;
uniform vec4 uRegion;
uniform vec2 uTexel;
uniform vec3 uCity;
uniform vec3 uBank;
uniform vec3 uWall;
uniform vec3 uCityGreen;`)
      .replace('#include <map_fragment>', `
  vec4 d1 = texture2D(uDetail, vWPos.xz * 0.31);
  vec4 d2 = texture2D(uDetail, vWPos.xz * 0.037 + vec2(0.37, 0.61));
  vec4 d3 = texture2D(uDetail, vWPos.xz * 0.0071 + vec2(0.13, 0.29));
  float macro = d2.a * 0.4 + d3.a * 0.6;
  vec2 guv = (vWPos.xz - uRegion.xy) * uRegion.zw;
  // ragged, natural edges between surfaces instead of ruler-straight ones
  guv += (d2.b - 0.5) * 2.6 * uTexel;
  vec3 gc;
  {
    // crisp edges: which side of the mask's 0.5 line this pixel is on, and the mask gradient
    vec2 gx = dFdx(guv), gy = dFdy(guv);
    vec2 ex = gx * uMaskSize, ey = gy * uMaskSize; // mask texels per pixel
    float m = texture2D(uMask, guv).r;
    float mx = dFdx(m), my = dFdy(m);
    float det = ex.x * ey.y - ex.y * ey.x;
    det = det >= 0.0 ? max(det, 1e-8) : min(det, -1e-8);
    vec2 grad = vec2(ey.y * mx - ex.y * my, ex.x * my - ey.x * mx) / det; // dm per mask texel
    float aa = max(fwidth(m) * 0.75, 1e-3);
    float side = smoothstep(0.5 - aa, 0.5 + aa, m) * 2.0 - 1.0;
    float closeUp = 1.0 - smoothstep(0.5, 1.2, max(length(ex), length(ey)));
    vec2 off = grad / max(length(grad), 0.3) * (side * closeUp * 1.6) * uTexel;
    gc = textureGrad(uGround, guv + off, gx, gy).rgb;
  }
  vec2 o = max(-guv, guv - 1.0);
  float beyond = max(o.x, o.y);
  if (beyond > 0.0) {
    // beyond the painted map: streets mottled with gardens and street trees
    float m = d3.b * 0.55 + texture2D(uDetail, vWPos.xz * 0.0029 + vec2(0.5, 0.2)).a * 0.45;
    vec3 city = mix(uCity, uCityGreen, smoothstep(0.45, 0.68, m) * 0.8) * (0.8 + 0.4 * macro);
    gc = mix(gc, city, smoothstep(0.0, 0.01, beyond));
  }
  // steep ground: grassy earth banks, and stone retaining walls where it is near vertical
  gc = mix(gc, uBank * (0.75 + 0.5 * d2.b), 1.0 - smoothstep(0.62, 0.84, vUp));
  float course = smoothstep(0.42, 0.48, abs(fract(vWPos.y * 1.25 + d1.b * 0.1) - 0.5));
  gc = mix(gc, uWall * (0.85 + 0.25 * d1.g) * (1.0 - course * 0.25), 1.0 - smoothstep(0.42, 0.56, vUp));
  float green = clamp((gc.g - max(gc.r, gc.b)) * 9.0, 0.0, 1.0);
  float det = mix(d1.g, d1.r, green);
  gc *= 0.6 + det * 0.8;
  gc *= 0.9 + macro * 0.2;
  diffuseColor.rgb *= gc;
`);
  };
  mat.customProgramCacheKey = () => 'vb-terrain';
  return { material: mat, uniforms };
}
