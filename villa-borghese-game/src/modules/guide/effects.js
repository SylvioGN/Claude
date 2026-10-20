// Cheap celebration particles: confetti (one InstancedMesh) and glowing sparks (one Points cloud).
// Bursts for arriving at a stop and winning a medal, fireworks for the end of the tour, and a
// gentle sparkle at the next stop's beacon.
import * as THREE from 'three';

const CONFETTI_COLORS = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#7bd94b', '#b46bff', '#ff9f1c', '#ffffff', '#ff7ac8'];
const FIREWORK_COLORS = ['#ff2d3a', '#ffc400', '#1fb8ff', '#ff2fc0', '#3fe02a', '#8a4dff', '#ff7a00', '#ffffff'];
export const MEDAL_COLORS = { bronze: '#e08a4a', silver: '#e6eef8', gold: '#ffd23a' };

const SPARK_VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSize;
uniform float uScale;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * uScale / max(0.1, -mv.z), 96.0);
  gl_Position = projectionMatrix * mv;
  vColor = aColor;
}`;
const SPARK_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec4 vColor;
void main() {
  float a = texture2D(uMap, gl_PointCoord).r * vColor.a;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor.rgb * a, a * 0.85);
  #include <colorspace_fragment>
}`;

function sparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  // four-point twinkle
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[64, 3], [3, 64]]) {
    const lg = g.createLinearGradient(32 - w / 2, 32 - h / 2, 32 + w / 2, 32 + h / 2);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(32 - w / 2, 32 - h / 2, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function createEffects(ctx) {
  const { scene, camera, renderer, terrain } = ctx;
  const q = Math.max(0.3, ctx.quality.particles ?? 1);
  const MAX_CONF = Math.round(260 * q);
  const MAX_SPARK = Math.round(900 * q);

  // --- confetti
  const confMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.38, 0.22), confMat, MAX_CONF);
  confetti.name = 'guide-confetti';
  confetti.frustumCulled = false;
  confetti.setColorAt(0, new THREE.Color('#ffffff'));
  confetti.count = 0;
  confetti.visible = false;
  scene.add(confetti);
  const conf = [];

  // --- sparks
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(MAX_SPARK * 3), sCol = new Float32Array(MAX_SPARK * 4), sSize = new Float32Array(MAX_SPARK);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 4).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1).setUsage(THREE.DynamicDrawUsage));
  sGeo.setDrawRange(0, 0);
  const sMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: sparkTexture() }, uScale: { value: 400 } },
    vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const sparks = new THREE.Points(sGeo, sMat);
  sparks.name = 'guide-sparks';
  sparks.frustumCulled = false;
  sparks.renderOrder = 6;
  scene.add(sparks);
  const sp = [];
  const rockets = [];
  let fireworksLeft = 0, nextRocket = 0;

  const col = new THREE.Color();
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function spark(x, y, z, vx, vy, vz, color, size, life, o = {}) {
    if (sp.length >= MAX_SPARK) return;
    col.set(color);
    sp.push({ x, y, z, vx, vy, vz, r: col.r, g: col.g, b: col.b, size, life, max: life,
      grav: o.grav ?? 0, drag: o.drag ?? 0, twinkle: o.twinkle ?? 0, ph: Math.random() * 6.3 });
  }

  function confettiPiece(x, y, z, vx, vy, vz) {
    if (conf.length >= MAX_CONF) return;
    conf.push({ x, y, z, vx, vy, vz, rx: rand(0, 6.3), ry: rand(0, 6.3), rz: rand(0, 6.3),
      wx: rand(-9, 9), wy: rand(-6, 6), wz: rand(-9, 9), ph: rand(0, 6.3), life: rand(3.6, 5), max: 5,
      color: new THREE.Color(pick(CONFETTI_COLORS)), landed: false });
  }

  // Confetti fountain + an expanding ring of sparkles at (x, y, z). scale 1 = a stop, 2 = a medal.
  function burst(x, y, z, scale = 1, ringColor = '#ffd84a') {
    const n = Math.round(70 * q * scale);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), h = rand(1.2, 3.8) * Math.sqrt(scale);
      confettiPiece(x + Math.cos(a) * 0.6, y + 2.4, z + Math.sin(a) * 0.6, Math.cos(a) * h, rand(5.5, 9.5) * Math.sqrt(scale), Math.sin(a) * h);
    }
    const m = Math.round(Math.max(30, 56 * q) * Math.min(scale, 1.5));
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2;
      spark(x + Math.cos(a) * 1.5, y + 0.9, z + Math.sin(a) * 1.5, Math.cos(a) * 11 * Math.sqrt(scale), 0.8, Math.sin(a) * 11 * Math.sqrt(scale),
        ringColor, 0.5, 1.1, { drag: 2.6 });
    }
    const k = Math.round(18 * q * scale);
    for (let i = 0; i < k; i++) {
      const a = rand(0, Math.PI * 2), r = rand(0, 2.5);
      spark(x + Math.cos(a) * r, y + 0.5, z + Math.sin(a) * r, rand(-0.6, 0.6), rand(3, 7) * Math.sqrt(scale), rand(-0.6, 0.6),
        pick(['#ffffff', '#fff2a8', ringColor]), rand(0.3, 0.5), rand(1.2, 2), { drag: 0.8, twinkle: 1 });
    }
  }

  // Shower of stars for a medal, in the medal's colour.
  function medal(x, y, z, id) {
    const c = MEDAL_COLORS[id] || MEDAL_COLORS.gold;
    burst(x, y, z, 1.8, c);
    const n = Math.round(50 * q);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), h = rand(1, 4);
      spark(x, y + 2.5, z, Math.cos(a) * h, rand(9, 14), Math.sin(a) * h, pick([c, c, c, '#fff2c0']), rand(0.35, 0.6), rand(1.6, 2.4), { grav: 7, drag: 0.6, twinkle: 1 });
    }
  }

  function fireworks(seconds = 10) { fireworksLeft = seconds; nextRocket = 0; }

  // A rocket aimed at a random spot inside the current view, 60-110 units away.
  const _v = new THREE.Vector3();
  function launchRocket() {
    _v.set(rand(-0.75, 0.75), rand(0.2, 0.7), 0.5).unproject(camera).sub(camera.position).normalize();
    const d = rand(60, 110);
    const bx = camera.position.x + _v.x * d, bz = camera.position.z + _v.z * d;
    const by = Math.max(camera.position.y + _v.y * d, terrain.heightAt(bx, bz) + 16);
    const gy = terrain.heightAt(bx, bz);
    rockets.push({ x: bx, y: gy, z: bz, top: by, vy: Math.max(24, (by - gy) * 1.15), color: pick(FIREWORK_COLORS), color2: pick(FIREWORK_COLORS), trail: 0 });
  }

  const _right = new THREE.Vector3(), _up = new THREE.Vector3();
  function explode(r) {
    const n = Math.round(rand(70, 110) * q);
    // now and then a ring facing the camera instead of a ball
    const ring = Math.random() < 0.3;
    if (ring) {
      _right.setFromMatrixColumn(camera.matrixWorld, 0);
      _up.setFromMatrixColumn(camera.matrixWorld, 1);
    }
    for (let i = 0; i < n; i++) {
      let vx, vy, vz;
      if (ring) {
        const a = (i / n) * Math.PI * 2, v = rand(13, 15);
        vx = (_right.x * Math.cos(a) + _up.x * Math.sin(a)) * v;
        vy = (_right.y * Math.cos(a) + _up.y * Math.sin(a)) * v;
        vz = (_right.z * Math.cos(a) + _up.z * Math.sin(a)) * v;
      } else {
        const u = rand(-1, 1), a = rand(0, Math.PI * 2), s = Math.sqrt(1 - u * u), v = rand(11, 16);
        vx = Math.cos(a) * s * v; vy = u * v; vz = Math.sin(a) * s * v;
      }
      spark(r.x, r.y, r.z, vx, vy, vz, i % 3 ? r.color : r.color2, rand(1.6, 2.3), rand(1.5, 2.3), { grav: 5, drag: 1.4, twinkle: 0.5 });
    }
    spark(r.x, r.y, r.z, 0, 0, 0, '#fff6d8', 3.5, 0.2, {});
  }

  // Little sparkles rising from the next stop's ground ring.
  let sparkleAcc = 0;
  function beaconSparkles(dt, x, y, z, radius) {
    sparkleAcc += dt * 14 * q;
    while (sparkleAcc >= 1) {
      sparkleAcc -= 1;
      const a = rand(0, Math.PI * 2), r = radius * rand(0.5, 1);
      spark(x + Math.cos(a) * r, y + 0.2, z + Math.sin(a) * r, 0, rand(1.8, 3.6), 0, pick(['#ffe27a', '#ffffff', '#ffc93a']), rand(0.25, 0.4), rand(1.2, 1.8), { twinkle: 1 });
    }
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const _size = new THREE.Vector2();

  function update(dt, t) {
    // fireworks show
    if (fireworksLeft > 0) {
      fireworksLeft -= dt;
      nextRocket -= dt;
      if (nextRocket <= 0) {
        launchRocket();
        if (Math.random() < 0.35) launchRocket();
        nextRocket = rand(0.35, 0.8);
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.y += r.vy * dt;
      r.trail -= dt;
      if (r.trail <= 0) { r.trail = 0.03; spark(r.x, r.y, r.z, rand(-0.4, 0.4), -2, rand(-0.4, 0.4), '#ffe0a0', 0.6, 0.45, {}); }
      if (r.y >= r.top) { explode(r); rockets.splice(i, 1); }
    }

    // confetti
    if (conf.length) {
      for (let i = conf.length - 1; i >= 0; i--) {
        const c = conf[i];
        c.life -= dt;
        if (c.life <= 0) { conf[i] = conf[conf.length - 1]; conf.pop(); continue; }
        if (!c.landed) {
          c.vy -= 9.8 * dt;
          const k = Math.exp(-(c.vy < 0 ? 2.6 : 0.9) * dt);
          c.vx *= k; c.vz *= k; c.vy *= k;
          c.x += (c.vx + Math.sin(t * 3 + c.ph) * 0.8) * dt;
          c.y += c.vy * dt;
          c.z += (c.vz + Math.cos(t * 2.6 + c.ph) * 0.8) * dt;
          c.rx += c.wx * dt; c.ry += c.wy * dt; c.rz += c.wz * dt;
          const gy = terrain.heightAt(c.x, c.z) + 0.03;
          if (c.y <= gy && c.vy < 0) { c.y = gy; c.landed = true; c.rx = -Math.PI / 2; c.rz = 0; }
        }
      }
      for (let i = 0; i < conf.length; i++) {
        const c = conf[i];
        const s = Math.min(1, c.life / 0.6);
        _m.compose(_p.set(c.x, c.y, c.z), _q.setFromEuler(_e.set(c.rx, c.ry, c.rz)), _s.set(s, s, s));
        confetti.setMatrixAt(i, _m);
        confetti.setColorAt(i, c.color);
      }
      confetti.instanceMatrix.needsUpdate = true;
      confetti.instanceColor.needsUpdate = true;
    }
    confetti.count = conf.length;
    confetti.visible = conf.length > 0;

    // sparks
    for (let i = sp.length - 1; i >= 0; i--) {
      const p = sp[i];
      p.life -= dt;
      if (p.life <= 0) { sp[i] = sp[sp.length - 1]; sp.pop(); continue; }
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    for (let i = 0; i < sp.length; i++) {
      const p = sp[i];
      const f = p.life / p.max;
      let a = Math.min(1, f * 2.5) * Math.min(1, (p.max - p.life) * 12);
      if (p.twinkle) a *= 1 - p.twinkle * 0.5 * (1 + Math.sin(t * 24 + p.ph));
      sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.y; sPos[i * 3 + 2] = p.z;
      sCol[i * 4] = p.r; sCol[i * 4 + 1] = p.g; sCol[i * 4 + 2] = p.b; sCol[i * 4 + 3] = a;
      sSize[i] = p.size * (0.6 + 0.4 * f);
    }
    if (sp.length) {
      sGeo.attributes.position.needsUpdate = true;
      sGeo.attributes.aColor.needsUpdate = true;
      sGeo.attributes.aSize.needsUpdate = true;
    }
    sGeo.setDrawRange(0, sp.length);
    sparks.visible = sp.length > 0;
    renderer.getDrawingBufferSize(_size);
    sMat.uniforms.uScale.value = _size.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  return { burst, medal, fireworks, beaconSparkles, update, get active() { return conf.length + sp.length + rockets.length; } };
}
