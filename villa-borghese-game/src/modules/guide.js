// Guide: helps a six-year-old find the next place to visit, and celebrates arriving.
//  * beacons: a soft pillar of light and a pulsing ground ring at every stop still to visit (the
//    next one gold and bigger), with a floating picture badge; visited stops get a green flag + tick
//  * route: golden dots flowing along the avenues to the next stop (A* on the path network)
//  * arrow: a chunky 3D arrow above the cart roof pointing the way
//  * celebrations: confetti and sparkles on arrival, more for a medal, fireworks for the whole tour
// Draw calls: pillars+rings 1, badges 2, flags 1, dots 1, arrow 1, confetti 1, sparks 1.
import * as THREE from 'three';
import { buildRouteGraph, findRoute } from './guide/route.js';
import { ICONS, ATLAS_GRID, drawAtlas } from './guide/icons.js';
import { createEffects } from './guide/effects.js';

const GOLD = new THREE.Color('#ffb21f');
const SOFT = new THREE.Color('#8fd8ff');

const DOT_SPACING = 2.4;
const DOT_AHEAD = 150;         // how far ahead the dotted route is drawn
const MAX_DOTS = Math.ceil(DOT_AHEAD / DOT_SPACING) + 2;
const REPLAN_EVERY = 1;        // seconds
const OFF_ROUTE = 7;           // replan at once when the cart is this far from the route

// ---------------------------------------------------------------- shaders
// Pillar of light (a vertical quad turned towards the camera) and a ground ring, one instanced mesh.
// Instance scale: x = pillar width, y = pillar height, z = ring radius.
const BEACON_VERT = /* glsl */ `
attribute float aKind;
attribute vec4 aTint;
varying vec2 vUv;
varying vec4 vTint;
varying float vKind;
varying float vNear;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 wp;
  if (aKind < 0.5) {
    vec3 tc = cameraPosition - c;
    tc.y = 0.0;
    float d = length(tc) + 0.001;
    wp = c + vec3(tc.z, 0.0, -tc.x) / d * position.x * s.x + vec3(0.0, position.y * s.y, 0.0);
    vNear = smoothstep(5.0, 16.0, d);
  } else {
    wp = c + vec3(position.x * s.z, 0.18, position.z * s.z);
    vNear = 1.0;
  }
  vUv = uv;
  vTint = aTint;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const BEACON_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec4 vTint;
varying float vKind;
varying float vNear;
void main() {
  float glow, cover;
  if (vKind < 0.5) {
    float x = abs(vUv.x - 0.5) * 2.0;
    float y = vUv.y;
    float core = exp(-x * x * 45.0);
    float halo = exp(-x * x * 6.0) * (1.0 - x * x);
    float fade = smoothstep(0.0, 0.025, y) * pow(1.0 - y, 1.6);
    float foot = 1.0 + 1.5 * exp(-y * 28.0);
    float rays = 0.78 + 0.22 * sin(y * 70.0 - uTime * 4.0 + x * 2.0);
    glow = (core * 1.3 + halo * 0.6 * rays) * fade * foot * vNear;
    cover = (core * 0.5 + halo * 0.32) * fade * vNear;
  } else {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ring = smoothstep(0.12, 0.03, abs(r - 0.84));
    float w = fract(uTime * 0.55);
    float wave = smoothstep(0.1, 0.0, abs(r - w)) * (1.0 - w);
    float fill = (1.0 - r) * 0.3;
    glow = ring * 1.3 + wave * 0.9 + fill;
    cover = ring * 0.75 + wave * 0.45 + fill * 0.5;
  }
  gl_FragColor = vec4(vTint.rgb * glow * vTint.a, clamp(cover * vTint.a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

// Picture badges: camera-facing quads reading their cell from the icon atlas.
const BADGE_VERT = /* glsl */ `
attribute vec4 aTint;
attribute float aCell;
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(instanceMatrix[0].xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = c + (right * position.x + up * position.y) * s;
  float col = mod(aCell, ${ATLAS_GRID}.0), row = floor((aCell + 0.5) / ${ATLAS_GRID}.0);
  vUv = vec2((col + uv.x) / ${ATLAS_GRID}.0, (${ATLAS_GRID - 1}.0 - row + uv.y) / ${ATLAS_GRID}.0);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const BADGE_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * vTint.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(t.rgb * vTint.rgb, a);
  #include <colorspace_fragment>
}`;

// Route dots: little golden lights hovering over the avenue, turned towards the camera so they
// read well from the low chase camera. They grow a little with distance.
const DOT_VERT = /* glsl */ `
attribute vec4 aTint;
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(instanceMatrix[0].xyz);
  s *= max(1.0, distance(cameraPosition, c) * 0.045);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vUv = uv;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(c + (right * position.x + up * position.y) * s, 1.0);
}`;
const DOT_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec4 vTint;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float body = smoothstep(0.6, 0.54, r);
  float rim = smoothstep(0.4, 0.54, r);
  float shine = smoothstep(0.42, 0.0, length(p - vec2(-0.16, 0.18)));
  vec3 col = mix(vec3(1.0, 0.7, 0.06), vec3(1.0, 0.97, 0.78), shine);
  col = mix(col, vec3(0.85, 0.36, 0.0), rim);
  float halo = pow(1.0 - smoothstep(0.5, 1.0, r), 2.0) * 0.6;
  col = mix(vec3(1.0, 0.86, 0.3) * 1.2, col, body);
  gl_FragColor = vec4(col * vTint.rgb, max(body, halo) * vTint.a);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- helpers
function beaconGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,      // pillar
    -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1,             // ground ring
  ], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 1, 1, 1], 1));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]);
  return g;
}

// Polygon [[x, y]...] shrunk by e (each edge moved inwards, corners re-intersected).
function insetPolygon(pts, e) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const sign = area > 0 ? 1 : -1;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const dx = (q[0] - p[0]) / L, dy = (q[1] - p[1]) / L;
    return { x: p[0] - dy * e * sign, y: p[1] + dx * e * sign, dx, dy };
  });
  return lines.map((b, i) => {
    const a = lines[(i + n - 1) % n];
    const den = a.dx * b.dy - a.dy * b.dx;
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / den;
    return [a.x + a.dx * t, a.y + a.dy * t];
  });
}

// A chunky arrow pointing +z: orange body, white rim and a golden face on top.
function arrowMesh(util) {
  const outline = [[0, 0.95], [0.66, 0.22], [0.25, 0.22], [0.25, -0.62], [-0.25, -0.62], [-0.25, 0.22], [-0.66, 0.22]];
  const extrude = (pts, depth, bevel) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
    geo.rotateX(Math.PI / 2); // shape +y -> +z (forward), extrusion -> down, cap at y = bevel faces up
    return geo;
  };
  const gb = new util.GeoBuilder();
  gb.place(extrude(outline, 0.2, 0.07), '#ef8f12', 0, 0, 0);
  gb.place(extrude(outline, 0.02, 0), '#ffffff', 0, 0.082, 0);
  gb.place(extrude(insetPolygon(outline, 0.1), 0.02, 0), '#ffd02a', 0, 0.094, 0);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#3a2600') });
  return gb.build(mat, { castShadow: false, receiveShadow: false, name: 'guide-arrow' });
}

function flagGeometry(util) {
  const { PALETTE } = util;
  const gb = new util.GeoBuilder();
  gb.cyl(0.32, 0.4, 0.18, 8, PALETTE.travertine, 0, 0.09, 0);
  gb.cyl(0.05, 0.06, 3.1, 6, '#ffffff', 0, 1.6, 0);
  gb.sphere(0.13, 0, '#f2c230', 0, 3.2, 0);
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.quadraticCurveTo(0.6, 0.05, 1.15, -0.32);
  pennant.quadraticCurveTo(0.6, -0.5, 0, -0.72);
  pennant.closePath();
  gb.extrude(pennant, 0.04, '#36b24a', 0.05, 3.08, -0.02);
  return util.buildGeometry(gb);
}

// 0 -> 1 with a springy overshoot (for things popping up).
function spring(e) {
  return e >= 1 ? 1 : 1 - Math.cos(e * Math.PI * 2.5) * Math.exp(-e * 4);
}

// Do two segments cross?
function segmentsCross(ax, az, bx, bz, cx, cz, dx, dz) {
  const d1 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
  const d2 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  const d3 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const d4 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export async function create(ctx) {
  const { scene, camera, terrain: T, colliders, util, game, events, MAP } = ctx;
  const stops = game.stops;
  const N = stops.length;

  // ---------------------------------------------------------------- route graph
  // A straight hop across the grass is blocked by walls, fences, water, buildings and the park edge.
  function blocked(ax, az, bx, bz) {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, r = Math.hypot(bx - ax, bz - az) / 2;
    let hit = false;
    colliders.query(mx, mz, r + 1, (s) => {
      if (hit) return;
      if (s.type === 1) hit = segmentsCross(ax, az, bx, bz, s.ax, s.az, s.bx, s.bz);
      else if (s.r > 2.5) {
        const c = ctx.geo.closestOnSegment(s.x, s.z, ax, az, bx, bz);
        hit = c.d2 < s.r * s.r;
      }
    });
    return hit;
  }
  const graph = buildRouteGraph(MAP.PATHS, { isInside: T.isInside, plazas: MAP.PLAZAS, blocked });

  // ---------------------------------------------------------------- beacons
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: BEACON_VERT, fragmentShader: BEACON_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const beaconGeo = beaconGeometry();
  const beaconTint = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
  beaconGeo.setAttribute('aTint', beaconTint);
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, N);
  beacons.name = 'guide-beacons';
  beacons.frustumCulled = false;
  beacons.renderOrder = 2;
  scene.add(beacons);

  // badges: one mesh for every stop, one for the next stop (always drawn on top so it is never lost)
  const atlas = util.canvasTexture(128 * ATLAS_GRID, 128 * ATLAS_GRID, drawAtlas, { wrap: false });
  const makeBadges = (count, onTop) => {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(count * 4).fill(1), 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: atlas } },
      vertexShader: BADGE_VERT, fragmentShader: BADGE_FRAG,
      transparent: true, depthWrite: false, depthTest: !onTop,
    });
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    m.renderOrder = onTop ? 5 : 4;
    m.name = onTop ? 'guide-badge-next' : 'guide-badges';
    scene.add(m);
    return m;
  };
  const badges = makeBadges(N, false);
  const nextBadge = makeBadges(1, true);

  // visited flags
  const flags = new THREE.InstancedMesh(flagGeometry(util), util.mats().vcFlat, N);
  flags.name = 'guide-flags';
  flags.castShadow = false;
  flags.frustumCulled = false;
  scene.add(flags);

  // Per stop: ground height, flag spot beside the avenue (on the landmark's side), animation state.
  const info = stops.map((s, i) => {
    const np = T.nearestPath(s.spotX, s.spotZ);
    let fx = s.spotX, fz = s.spotZ + 3, flagYaw = 0;
    if (np) {
      let px = -np.dirZ, pz = np.dirX;
      if (px * (s.x - s.spotX) + pz * (s.z - s.spotZ) < 0) { px = -px; pz = -pz; }
      fx = s.spotX + px * (np.w / 2 + 0.9);
      fz = s.spotZ + pz * (np.w / 2 + 0.9);
      flagYaw = Math.atan2(-np.dirZ, np.dirX);
    }
    return {
      y: T.heightAt(s.spotX, s.spotZ), fx, fz, fy: T.heightAt(fx, fz), flagYaw, cell: Math.max(0, ICONS.indexOf(s.icon)),
      show: s.visited ? 0 : 1, next: 0, flagT: 9, visited: s.visited, phase: i * 1.7,
    };
  });
  const CHECK = ICONS.indexOf('check');

  // ---------------------------------------------------------------- route dots
  const dotGeo = new THREE.PlaneGeometry(1, 1);
  const dotTint = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DOTS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  dotGeo.setAttribute('aTint', dotTint);
  const dotMat = new THREE.ShaderMaterial({ vertexShader: DOT_VERT, fragmentShader: DOT_FRAG, transparent: true, depthWrite: false });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, MAX_DOTS);
  dots.name = 'guide-route';
  dots.frustumCulled = false;
  dots.renderOrder = 3;
  dots.count = 0;
  scene.add(dots);

  // ---------------------------------------------------------------- arrow
  const arrow = new THREE.Group();
  const arrowTilt = new THREE.Group();
  const arrowSpin = new THREE.Group();
  arrowTilt.rotation.x = -0.72; // lean the arrow's face towards the chase camera
  arrowSpin.add(arrowMesh(util));
  arrowTilt.add(arrowSpin);
  arrow.add(arrowTilt);
  arrow.scale.setScalar(0.001);
  arrow.visible = false;
  scene.add(arrow);
  let roofY = null;
  let arrowYaw = 0, arrowShow = 0;

  const fx = createEffects(ctx);

  // ---------------------------------------------------------------- route state
  let route = null;          // {pts: [[x, z]], cum: [], len, stop}
  let replanIn = 0, sCart = 0, lastSeg = 0;

  function makeRoute(pts, stop) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1], stop };
  }
  function plan(stop) {
    const p = ctx.cart.position;
    const pts = findRoute(graph, p.x, p.z, stop.spotX, stop.spotZ, blocked) || [[p.x, p.z], [stop.spotX, stop.spotZ]];
    return makeRoute(pts, stop);
  }
  // Where the cart is along the route: arc length and distance off it.
  function project(r, x, z) {
    let best = Infinity, bd2 = 0, bs = 0, bi = 1;
    for (let i = 1; i < r.pts.length; i++) {
      const c = ctx.geo.closestOnSegment(x, z, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]);
      // prefer the stretch we were on when the route doubles back near itself
      const score = c.d2 + (i < lastSeg ? 4 : 0);
      if (score < best) { best = score; bd2 = c.d2; bi = i; bs = r.cum[i - 1] + (r.cum[i] - r.cum[i - 1]) * c.t; }
    }
    lastSeg = bi;
    return { s: bs, d: Math.sqrt(bd2) };
  }
  // Point at arc length s, written to `at` ({x, z, seg}); `from` = segment to start searching at.
  const at = { x: 0, z: 0, seg: 1 };
  function pointAt(r, s, from = 1) {
    let i = from;
    while (i < r.pts.length - 1 && r.cum[i] < s) i++;
    const a = r.pts[i - 1], b = r.pts[i], L = r.cum[i] - r.cum[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (s - r.cum[i - 1]) / L));
    at.x = a[0] + (b[0] - a[0]) * t;
    at.z = a[1] + (b[1] - a[1]) * t;
    at.seg = i;
    return at;
  }

  function updateRoute(dt, next) {
    if (!next) { route = null; return; }
    const p = ctx.cart.position;
    replanIn -= dt;
    if (!route || route.stop !== next) {
      lastSeg = 0;
      route = plan(next);
      replanIn = REPLAN_EVERY;
    }
    let pr = project(route, p.x, p.z);
    const moving = Math.abs(ctx.cart.speed || 0) > 0.3;
    if (moving && ((pr.d > OFF_ROUTE && replanIn < REPLAN_EVERY - 0.25) || replanIn <= 0)) {
      // take the fresh route when the cart left the old one, or when it is clearly shorter
      const cand = plan(next);
      const remaining = route.len - pr.s + pr.d;
      if (pr.d > OFF_ROUTE || cand.len < remaining - 4) {
        route = cand;
        lastSeg = 0;
        pr = project(route, p.x, p.z);
      }
      replanIn = REPLAN_EVERY;
    }
    sCart = pr.s;
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const _c = new THREE.Color();
  const _dir = new THREE.Vector3();

  function drawDots(t, show) {
    if (!route || show <= 0.01) { dots.count = 0; dots.visible = false; return; }
    const phase = (t * 3.2) % DOT_SPACING;
    const s0 = sCart + 3.4, s1 = Math.min(route.len - 0.5, sCart + DOT_AHEAD);
    let s = Math.ceil((s0 - phase) / DOT_SPACING) * DOT_SPACING + phase;
    let n = 0, seg = 1;
    for (; s < s1 && n < MAX_DOTS; s += DOT_SPACING) {
      const { x, z } = pointAt(route, s, seg);
      seg = at.seg;
      const fadeIn = Math.min(1, (s - s0) / 5), fadeOut = Math.min(1, (s1 - s) / 6, (route.len - s) / 3);
      const pulse = Math.pow(Math.max(0, Math.sin((s - t * 16) * 0.09)), 10);
      const k = Math.max(0, Math.min(fadeIn, fadeOut)) * show;
      const size = (0.62 + pulse * 0.25) * (0.3 + 0.7 * k);
      const hover = 0.42 + 0.08 * Math.sin(t * 4 - s * 0.5);
      _m.compose(_p.set(x, T.heightAt(x, z) + hover, z), _q.identity(), _s.set(size, size, size));
      dots.setMatrixAt(n, _m);
      const glow = 1 + 0.35 * pulse;
      dotTint.setXYZW(n, glow, glow, glow, k);
      n++;
    }
    dots.count = n;
    dots.visible = n > 0;
    dots.instanceMatrix.needsUpdate = true;
    dotTint.needsUpdate = true;
  }

  function updateArrow(dt, t, next, want) {
    arrowShow += ((want ? 1 : 0) - arrowShow) * (1 - Math.exp(-dt * (want ? 6 : 12)));
    arrow.visible = arrowShow > 0.02;
    if (!arrow.visible || !next) return;
    const c = ctx.cart;
    if (roofY === null) {
      const box = new THREE.Box3().setFromObject(c.object);
      roofY = Number.isFinite(box.max.y) ? Math.min(3.6, Math.max(1.8, box.max.y - c.position.y)) : 2.3;
    }
    let tx = next.spotX, tz = next.spotZ;
    if (route) {
      const a = pointAt(route, Math.min(route.len, sCart + 13));
      if (Math.hypot(a.x - c.position.x, a.z - c.position.z) > 2) { tx = a.x; tz = a.z; }
    }
    const targetYaw = Math.atan2(tx - c.position.x, tz - c.position.z);
    const d = targetYaw - arrowYaw;
    arrowYaw = arrowShow < 0.05 ? targetYaw : arrowYaw + Math.atan2(Math.sin(d), Math.cos(d)) * (1 - Math.exp(-dt * 7));
    camera.getWorldDirection(_dir);
    const camYaw = Math.atan2(_dir.x, _dir.z);
    const bob = Math.sin(t * 3.2) * 0.12;
    // float at about the camera's height, so the arrow sits on the horizon instead of covering the road ahead
    arrow.position.set(c.position.x, c.position.y + Math.max(roofY + 1.3, 4.1) + bob, c.position.z);
    arrow.rotation.y = camYaw;
    arrowSpin.rotation.y = arrowYaw - camYaw;
    const pop = arrowShow < 0.999 ? 1 + Math.sin(arrowShow * Math.PI) * 0.25 : 1;
    arrow.scale.setScalar(1.55 * arrowShow * pop);
  }

  function updateBeacons(dt, t, next, state) {
    const cam = camera.position;
    const k = 1 - Math.exp(-dt * 3);
    const photo = state === 'stop' ? 0.3 : 1;
    const tint = badges.geometry.attributes.aTint, cell = badges.geometry.attributes.aCell;
    let nextIdx = -1;
    for (let i = 0; i < N; i++) {
      const s = stops[i], b = info[i];
      if (s.visited !== b.visited) {
        b.visited = s.visited;
        b.flagT = 0;
      }
      b.flagT += dt;
      // on arrival the pillar sinks quickly, then the flag and the green tick pop up
      b.show += ((s.visited ? 0 : 1) - b.show) * (s.visited ? 1 - Math.exp(-dt * 5) : k);
      b.next += ((s === next ? 1 : 0) - b.next) * k;
      if (s === next) nextIdx = i;

      // pillar + ring
      const d = Math.hypot(cam.x - s.spotX, cam.z - s.spotZ);
      const width = Math.max(2.8 + 2.2 * b.next, d * (0.016 + 0.008 * b.next));
      const height = (52 + 36 * b.next) * b.show;
      const ring = (3.6 + 1.4 * b.next) * Math.min(1, b.show * 1.3);
      _m.compose(_p.set(s.spotX, b.y, s.spotZ), _q.identity(), _s.set(width, height, ring));
      beacons.setMatrixAt(i, _m);
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.4 + b.phase);
      _c.copy(SOFT).lerp(GOLD, b.next);
      const a = (0.5 + 0.55 * b.next) * pulse * photo * Math.min(1, b.show * 1.5);
      beaconTint.setXYZW(i, _c.r, _c.g, _c.b, a);

      // badge: high above the trees, bigger with distance so far stops stay readable
      const pop = s.visited ? spring(Math.min(1, Math.max(0, (b.flagT - 0.35) * 1.5))) : 0;
      if (!s.visited && b.show > 0.02) {
        const beat = b.next > 0.5 ? 1 + 0.06 * Math.sin(t * 4.5) : 1;
        const size = Math.max(3.4 + 1.2 * b.next, d * (0.06 + 0.02 * b.next)) * beat * Math.min(1, b.show * 1.3);
        const y = b.y + 7.5 + 1.5 * b.next + d * 0.03 + Math.sin(t * 1.6 + b.phase) * 0.35 + size * 0.5;
        _m.compose(_p.set(s.spotX, y, s.spotZ), _q.identity(), _s.set(size, size, size));
        cell.setX(i, b.cell);
        tint.setXYZW(i, 1, 1, 1, (s === next ? 0 : 1) * (state === 'stop' ? 0.5 : 1));
      } else if (s.visited && pop > 0) {
        const size = Math.max(1.6, d * 0.018) * pop;
        _m.compose(_p.set(b.fx, b.fy + 4.3 + size * 0.5, b.fz), _q.identity(), _s.set(size, size, size));
        cell.setX(i, CHECK);
        tint.setXYZW(i, 1, 1, 1, 1);
      } else {
        _m.makeScale(0, 0, 0);
      }
      badges.setMatrixAt(i, _m);

      // flag, its pennant flying along the avenue
      if (pop > 0) {
        _q.setFromAxisAngle(_p.set(0, 1, 0), b.flagYaw + Math.sin(t * 2.2 + b.phase) * 0.22);
        _m.compose(_p.set(b.fx, b.fy, b.fz), _q, _s.set(pop, pop, pop));
      } else _m.makeScale(0, 0, 0);
      flags.setMatrixAt(i, _m);
    }
    beacons.instanceMatrix.needsUpdate = true;
    beaconTint.needsUpdate = true;
    badges.instanceMatrix.needsUpdate = true;
    tint.needsUpdate = true;
    cell.needsUpdate = true;
    flags.instanceMatrix.needsUpdate = true;
    beaconMat.uniforms.uTime.value = t;

    // the next stop's badge, drawn on top of everything
    nextBadge.visible = nextIdx >= 0 && info[nextIdx].show > 0.05;
    if (nextBadge.visible) {
      badges.getMatrixAt(nextIdx, _m);
      nextBadge.setMatrixAt(0, _m);
      nextBadge.instanceMatrix.needsUpdate = true;
      const g = nextBadge.geometry.attributes;
      g.aCell.setX(0, info[nextIdx].cell);
      g.aTint.setXYZW(0, 1, 1, 1, info[nextIdx].next * (state === 'stop' ? 0.5 : 1));
      g.aCell.needsUpdate = true;
      g.aTint.needsUpdate = true;
      const s = stops[nextIdx];
      if (Math.hypot(cam.x - s.spotX, cam.z - s.spotZ) < 150) fx.beaconSparkles(dt, s.spotX, info[nextIdx].y, s.spotZ, 4.5);
    }
  }

  // ---------------------------------------------------------------- celebrations
  events.on('stopReached', () => {
    const p = ctx.cart.position;
    fx.burst(p.x, p.y, p.z, 1);
  });
  events.on('medal', (e) => {
    const p = ctx.cart.position;
    fx.medal(p.x, p.y, p.z, e.id);
  });
  events.on('tourComplete', () => fx.fireworks(11));
  events.on('tourReset', () => { route = null; });

  let routeShow = 0;
  const api = {
    graph,
    // the route being shown: {pts: [[x, z]...] from the cart to the stop, cum, len, stop} or null
    get route() { return route; },
    findRoute: (ax, az, bx, bz) => findRoute(graph, ax, az, bx, bz, blocked),
    effects: fx,
    update(dt, t) {
      const state = game.state;
      const driving = state === 'playing' || state === 'paused';
      const next = state === 'title' ? null : game.nextStop();
      if (driving && ctx.cart) updateRoute(dt, next);
      else if (!next) route = null;
      routeShow += ((driving && route ? 1 : 0) - routeShow) * (1 - Math.exp(-dt * 5));
      updateBeacons(dt, t, next, state);
      drawDots(t, routeShow);
      updateArrow(dt, t, next, driving && !!next);
      fx.update(dt, t);
    },
  };
  return api;
}
