// Every water surface in MAP.WATER: the lake (with its island) at WATER_Y, ponds, and fountain
// basins at heightAt(centre) + 0.45 inside a plain travertine rim 0.6 high. All surfaces share one
// animated shader (two scrolling ripple normal maps, sky reflection, sun glints) and draw in one call.
import { SKY } from './sky.js';

export const FOUNTAIN_WATER = 0.45;
export const FOUNTAIN_RIM = 0.6;
const POND_RIM = 0.3;

const LAKE_TINT = '#3f6b5e', FOUNTAIN_TINT = '#4f9fae', POND_TINT = '#476f55';

// Signed area > 0 when the ring runs clockwise on screen (x right, z down).
function signedArea(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] * r[i][1] - r[i][0] * r[j][1]);
  return a / 2;
}

// Ring shifted inwards (d > 0) or outwards (d < 0) with mitred, clamped corners.
export function offsetRing(r, d) {
  const s = signedArea(r) > 0 ? 1 : -1;
  const n = r.length;
  return r.map((p, i) => {
    const a = r[(i - 1 + n) % n], b = r[(i + 1) % n];
    let e1x = p[0] - a[0], e1z = p[1] - a[1], e2x = b[0] - p[0], e2z = b[1] - p[1];
    const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1;
    e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
    // inward normals of both edges
    const n1x = -e1z * s, n1z = e1x * s, n2x = -e2z * s, n2z = e2x * s;
    let mx = n1x + n2x, mz = n1z + n2z;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml; mz /= ml;
    const k = Math.min(2.5, 1 / Math.max(0.2, mx * n1x + mz * n1z));
    return [p[0] + mx * d * k, p[1] + mz * d * k];
  });
}

const cleanRing = (r) => {
  const out = r.slice();
  if (out.length > 2 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
};

export function buildWater(ctx) {
  const { THREE, MAP, terrain: T, WATER_Y, geo } = ctx;
  const util = ctx.util;
  const rimGB = new util.GeoBuilder();
  const surfaces = [];
  const levels = new Map();
  const rnd = ctx.rng('world-water');

  const shapeGeo = (outer, holes, y, tint, lake) => {
    const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const n = g.attributes.position.count;
    const c = new THREE.Color(tint);
    const col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b, lake ? 1 : 0], i * 4);
    g.setAttribute('aTint', new THREE.BufferAttribute(col, 4));
    surfaces.push(g.index ? g.toNonIndexed() : g);
  };

  // Closed band with a flat top following a ring (basin rims, pond edges). Double-sided material,
  // so the winding of the quads does not matter.
  const rim = (outer, inner, top, bottomOut, bottomIn, color, colorTop) => {
    const n = outer.length;
    const pos = [];
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const o0 = outer[i], o1 = outer[j], i0 = inner[i], i1 = inner[j];
      const ti = typeof top === 'function' ? top(i) : top, tj = typeof top === 'function' ? top(j) : top;
      const bo0 = typeof bottomOut === 'function' ? bottomOut(i) : bottomOut, bo1 = typeof bottomOut === 'function' ? bottomOut(j) : bottomOut;
      // top
      quad([o0[0], ti, o0[1]], [i0[0], ti, i0[1]], [i1[0], tj, i1[1]], [o1[0], tj, o1[1]]);
      // outer face
      quad([o0[0], bo0, o0[1]], [o0[0], ti, o0[1]], [o1[0], tj, o1[1]], [o1[0], bo1, o1[1]]);
      // inner face
      quad([i0[0], ti, i0[1]], [i0[0], bottomIn, i0[1]], [i1[0], bottomIn, i1[1]], [i1[0], tj, i1[1]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    rimGB.add(g, color);
  };

  for (const w of MAP.WATER) {
    const r = cleanRing(w.r);
    if (w.k === 'lake') {
      const holes = (w.h || []).map(cleanRing);
      shapeGeo(r, holes, WATER_Y, LAKE_TINT, true);
      levels.set(w, WATER_Y);
      // low kerb of rough stones around the shore and the island
      for (const [edge, outward] of [[r, -0.55], ...holes.map((h) => [h, 0.55])]) {
        const dense = densify(edge, 1.3);
        const out = offsetRing(dense, outward);
        const tops = dense.map(() => 0.08 + rnd() * 0.12);
        const top = (i) => Math.max(T.heightAt(out[i][0], out[i][1]), WATER_Y + 0.25) + tops[i];
        const shades = ['#c4b89c', '#b3a78c', '#d2c7ab', '#a99d84'];
        // split into short runs of stones so the colours vary along the shore
        for (let s = 0; s < dense.length; s += 3) {
          const idx = [s, s + 1, s + 2, s + 3].map((k) => k % dense.length);
          const o = idx.map((k) => out[k]), inn = idx.map((k) => dense[k]);
          rimOpen(o, inn, idx.map(top), (k) => T.heightAt(o[k][0], o[k][1]) - 0.3, WATER_Y - 0.5, shades[Math.floor(rnd() * shades.length)]);
        }
      }
    } else {
      const [cx, cz] = geo.ringCentroid(r);
      const pond = w.k === 'pond';
      let base = T.heightAt(cx, cz);
      if (pond) for (const [x, z] of r) base = Math.max(base, T.heightAt(x, z));
      const level = base + (pond ? 0.15 : FOUNTAIN_WATER);
      const top = base + (pond ? POND_RIM : FOUNTAIN_RIM);
      let lowest = Infinity;
      for (const [x, z] of r) lowest = Math.min(lowest, T.heightAt(x, z));
      const size = Math.sqrt(geo.ringArea(r));
      const thick = Math.min(0.7, Math.max(0.28, size * 0.05));
      const inner = offsetRing(r, thick);
      shapeGeo(inner, [], level, pond ? POND_TINT : FOUNTAIN_TINT, false);
      levels.set(w, level);
      rim(r, inner, top, lowest - 0.15, level - 0.35, pond ? '#c9bea4' : '#e6dcc6');
    }
  }

  // open strip (not closed into a ring) used for the stone runs of the lake kerb
  function rimOpen(outer, inner, tops, bottomOut, bottomIn, color) {
    const pos = [];
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < outer.length - 1; i++) {
      const o0 = outer[i], o1 = outer[i + 1], i0 = inner[i], i1 = inner[i + 1];
      const t0 = tops[i], t1 = tops[i + 1];
      quad([o0[0], t0, o0[1]], [i0[0], t0 - 0.04, i0[1]], [i1[0], t1 - 0.04, i1[1]], [o1[0], t1, o1[1]]);
      quad([o0[0], bottomOut(i), o0[1]], [o0[0], t0, o0[1]], [o1[0], t1, o1[1]], [o1[0], bottomOut(i + 1), o1[1]]);
      quad([i0[0], t0 - 0.04, i0[1]], [i0[0], bottomIn, i0[1]], [i1[0], bottomIn, i1[1]], [i1[0], t1 - 0.04, i1[1]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    rimGB.add(g, color);
  }

  const rims = rimGB.build(util.mats().vcFlatDouble, { castShadow: true, receiveShadow: true, name: 'waterRims' });

  const lake = MAP.WATER.find((w) => w.k === 'lake');
  const { material, uniforms } = waterMaterial(ctx, lake);
  const merged = mergeAll(THREE, surfaces);
  const water = new THREE.Mesh(merged, material);
  water.name = 'water';
  water.receiveShadow = false;
  water.matrixAutoUpdate = false;
  water.renderOrder = 1;
  return { water, rims, uniforms, levels };
}

function densify(r, step) {
  const out = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(L / step));
    for (let s = 0; s < k; s++) out.push([a[0] + ((b[0] - a[0]) * s) / k, a[1] + ((b[1] - a[1]) * s) / k]);
  }
  return out;
}

function mergeAll(THREE, list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    col.set(g.attributes.aTint.array, o * 4);
    o += g.attributes.position.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aTint', new THREE.BufferAttribute(col, 4));
  g.computeBoundingSphere();
  return g;
}

// Ripple normal map: a sum of sine waves with whole-number frequencies, so it tiles.
function rippleTexture(THREE, rnd, N) {
  const waves = [];
  for (let i = 0; i < 14; i++) {
    const kx = Math.round((rnd() * 2 - 1) * 7), kz = Math.round((rnd() * 2 - 1) * 7);
    if (!kx && !kz) continue;
    waves.push({ kx, kz, a: 1 / Math.hypot(kx, kz), ph: rnd() * Math.PI * 2 });
  }
  const hgt = (x, z) => {
    let s = 0;
    for (const w of waves) s += w.a * Math.sin(((w.kx * x + w.kz * z) / N) * Math.PI * 2 + w.ph);
    return s;
  };
  const data = new Uint8Array(N * N * 4);
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const dx = (hgt(x + 1, z) - hgt(x - 1, z)) * 2.2, dz = (hgt(x, z + 1) - hgt(x, z - 1)) * 2.2;
      const L = Math.hypot(dx, dz, 1);
      const i = (z * N + x) * 4;
      data[i] = Math.round((-dx / L * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((-dz / L * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((1 / L * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Distance to the lake shore (0..1 over 10 units) baked into a small texture over the lake's box.
function shoreTexture(THREE, lake, geo) {
  const N = 96;
  const rings = [lake.r, ...(lake.h || [])];
  const bb = geo.ringBBox(lake.r);
  const pad = 2;
  const box = { x: bb.minX - pad, z: bb.minZ - pad, w: bb.maxX - bb.minX + pad * 2, h: bb.maxZ - bb.minZ + pad * 2 };
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = box.x + ((i + 0.5) / N) * box.w, z = box.z + ((j + 0.5) / N) * box.h;
      let d = Infinity;
      for (const r of rings) d = Math.min(d, geo.distToRingEdge(x, z, r));
      const v = Math.round(Math.min(1, d / 10) * 255);
      data.set([v, v, v, 255], (j * N + i) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { tex, box: new THREE.Vector4(box.x, box.z, 1 / box.w, 1 / box.h) };
}

function waterMaterial(ctx, lake) {
  const { THREE, geo } = ctx;
  const ripples = rippleTexture(THREE, ctx.rng('world-ripples'), ctx.quality.tier === 'low' ? 64 : 128);
  const shore = lake ? shoreTexture(THREE, lake, geo) : null;
  const lin = (hex) => new THREE.Color(hex); // Color stores linear values
  const uniforms = {
    uTime: { value: 0 },
    uRipples: { value: ripples },
    uShore: { value: shore ? shore.tex : null },
    uShoreBox: { value: shore ? shore.box : new THREE.Vector4(0, 0, 1, 1) },
    uSunDir: { value: ctx.lights.sunDir.clone().normalize() },
    uSkyZenith: { value: lin(SKY.mid) },
    uSkyHorizon: { value: lin(SKY.horizon) },
    uTrees: { value: lin('#2f4a2c') },
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 1 },
    fogFar: { value: 1000 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec4 aTint;
      varying vec3 vWPos;
      varying vec4 vTint;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWPos = wp.xyz;
        vTint = aTint;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform sampler2D uRipples;
      uniform sampler2D uShore;
      uniform vec4 uShoreBox;
      uniform vec3 uSunDir, uSkyZenith, uSkyHorizon, uTrees;
      varying vec3 vWPos;
      varying vec4 vTint;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWPos.xz;
        vec3 n1 = texture2D(uRipples, p * 0.085 + vec2(uTime * 0.021, uTime * 0.013)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(uRipples, p * 0.23 + vec2(-uTime * 0.017, uTime * 0.026)).xyz * 2.0 - 1.0;
        float lake = vTint.a;
        vec3 toCam = cameraPosition - vWPos;
        // calm park water: gentle ripples that fade out with distance (no shimmering far away)
        float rough = mix(0.4, 0.26, lake) / (1.0 + length(toCam) * 0.025);
        vec3 n = normalize(vec3((n1.x + n2.x) * rough, 1.0, (n1.y + n2.y) * rough));
        vec3 V = normalize(toCam);
        float ndv = max(dot(n, V), 0.0);
        float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.6, R.y));
        vec3 base = vTint.rgb;
        if (lake > 0.5) {
          // the wooded banks darken the reflection near the shore; a pale fringe right at the edge
          float d = texture2D(uShore, (p - uShoreBox.xy) * uShoreBox.zw).r;
          sky = mix(uTrees, sky, smoothstep(0.08, 0.75, d));
          base = mix(base * 0.85, base, smoothstep(0.0, 0.5, d));
          base = mix(vec3(0.55, 0.6, 0.45), base, smoothstep(0.0, 0.035, d));
        }
        vec3 col = mix(base, sky, clamp(fres * 1.1 + 0.12, 0.0, 0.92));
        float s = max(dot(R, uSunDir), 0.0);
        col += vec3(1.0, 0.95, 0.85) * (pow(s, 220.0) * 4.0 + pow(s, 24.0) * 0.12);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return { material, uniforms };
}
