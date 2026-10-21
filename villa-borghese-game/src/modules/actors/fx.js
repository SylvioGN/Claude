// Effects shared by all actors, each a single draw call:
//  * particles: one THREE.Points with a 2x2 sprite atlas (sparkle, dot, heart, "+1"),
//    simulated on the CPU; sparkle() adds one-frame points (twinkles around collectibles)
//  * blob shadows: one InstancedMesh of soft dark discs under every actor
//  * leashes: one LineSegments for dog leads
//  * speech bubbles: text sprites ("Mamma mia!", "Ciao!") shown for a moment above people
import * as THREE from 'three';
import { uploadFirst } from './rig.js';

export const SPR = { STAR: 0, DOT: 1, HEART: 2, PLUS: 3 };

function atlasTexture(util) {
  return util.canvasTexture(128, 128, (g) => {
    // star sparkle
    g.save(); g.translate(32, 32);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)'); glow.addColorStop(0.25, 'rgba(255,255,255,0.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow; g.fillRect(-32, -32, 64, 64);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 5 : 29, a = (i / 8) * Math.PI * 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.restore();
    // soft dot
    const d = g.createRadialGradient(96, 32, 0, 96, 32, 28);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.6, 'rgba(255,255,255,0.9)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(64, 0, 64, 64);
    // heart
    g.save(); g.translate(32, 98); g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(0, 20);
    g.bezierCurveTo(-30, 0, -22, -24, 0, -10);
    g.bezierCurveTo(22, -24, 30, 0, 0, 20);
    g.fill(); g.restore();
    // "+1"
    g.font = '900 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#5a3a12'; g.strokeText('+1', 96, 98);
    g.fillStyle = '#fff'; g.fillText('+1', 96, 98);
  }, { wrap: false });
}

const VS = /* glsl */`
uniform float uScale;
attribute vec3 aColor;
attribute vec3 aMisc; // size, sprite, alpha
varying vec3 vColor;
varying float vAlpha;
varying vec2 vCell;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aMisc.x * uScale / max(0.5, -mv.z), 0.0, 220.0);
  vColor = aColor;
  vAlpha = aMisc.z;
  vCell = vec2(mod(aMisc.y, 2.0), floor(aMisc.y / 2.0 + 0.01));
}`;
const FS = /* glsl */`
uniform sampler2D uTex;
varying vec3 vColor;
varying float vAlpha;
varying vec2 vCell;
void main() {
  vec2 uv = vec2((vCell.x + gl_PointCoord.x) * 0.5, 1.0 - (vCell.y + gl_PointCoord.y) * 0.5);
  vec4 t = texture2D(uTex, uv);
  float a = t.a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor * t.rgb, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createFx(ctx, scene) {
  const { util, camera, renderer } = ctx;
  const P = ctx.quality.particles ?? 1;

  // --- particles
  const CAP = 900;
  const pos = new Float32Array(CAP * 3), colA = new Float32Array(CAP * 3), misc = new Float32Array(CAP * 3);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aCol = new THREE.BufferAttribute(colA, 3).setUsage(THREE.DynamicDrawUsage);
  const aMisc = new THREE.BufferAttribute(misc, 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos); geo.setAttribute('aColor', aCol); geo.setAttribute('aMisc', aMisc);
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: atlasTexture(util) }, uScale: { value: 400 } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  points.name = 'actorsFx';
  scene.add(points);

  // live particles (struct of arrays)
  const MAXP = 520;
  const px = new Float32Array(MAXP), py = new Float32Array(MAXP), pz = new Float32Array(MAXP);
  const vx = new Float32Array(MAXP), vy = new Float32Array(MAXP), vz = new Float32Array(MAXP);
  const life = new Float32Array(MAXP), maxLife = new Float32Array(MAXP), size0 = new Float32Array(MAXP), size1 = new Float32Array(MAXP);
  const grav = new Float32Array(MAXP), drag = new Float32Array(MAXP), spr = new Uint8Array(MAXP);
  const cr = new Float32Array(MAXP), cg = new Float32Array(MAXP), cb = new Float32Array(MAXP);
  let alive = 0;
  let n = 0;
  const _c = new THREE.Color();
  // CSS colour -> [r, g, b], converted once (sparkles ask for the same few colours every frame)
  const rgbCache = new Map();
  const rgb = (color) => {
    let c = rgbCache.get(color);
    if (!c) { _c.set(color); c = [_c.r, _c.g, _c.b]; rgbCache.set(color, c); }
    return c;
  };

  function spawn(x, y, z, vxi, vyi, vzi, lifeS, s0, s1, color, sprite, g = 0, dr = 0) {
    if (alive >= MAXP) return;
    const i = alive++;
    px[i] = x; py[i] = y; pz[i] = z; vx[i] = vxi; vy[i] = vyi; vz[i] = vzi;
    life[i] = lifeS; maxLife[i] = lifeS; size0[i] = s0; size1[i] = s1; grav[i] = g; drag[i] = dr; spr[i] = sprite;
    const c = rgb(color);
    cr[i] = c[0]; cg[i] = c[1]; cb[i] = c[2];
  }

  function put(x, y, z, r, g, b, size, sprite, alpha) {
    if (n >= CAP) return;
    pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
    colA[n * 3] = r; colA[n * 3 + 1] = g; colA[n * 3 + 2] = b;
    misc[n * 3] = size; misc[n * 3 + 1] = sprite; misc[n * 3 + 2] = alpha;
    n++;
  }

  // --- blob shadows
  const blobTex = util.canvasTexture(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { wrap: false, srgb: false });
  const SHCAP = 320;
  const shGeo = new THREE.PlaneGeometry(2, 2);
  shGeo.rotateX(-Math.PI / 2);
  const shMat = new THREE.MeshBasicMaterial({
    color: 0x1a2010, map: blobTex, transparent: true, opacity: 0.42, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6,
  });
  const shadows = new THREE.InstancedMesh(shGeo, shMat, SHCAP);
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shadows.frustumCulled = false;
  shadows.renderOrder = 1;
  shadows.name = 'actorsShadows';
  shadows.count = 0;
  scene.add(shadows);
  const _m = new THREE.Matrix4();
  let ns = 0;

  // --- leashes
  const LCAP = 24;
  const lPos = new Float32Array(LCAP * 6);
  const lGeo = new THREE.BufferGeometry();
  const lAttr = new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage);
  lGeo.setAttribute('position', lAttr);
  lGeo.setDrawRange(0, 0);
  const leashes = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: '#3b2a1e' }));
  leashes.frustumCulled = false;
  leashes.name = 'actorsLeashes';
  scene.add(leashes);
  let nl = 0;

  // --- speech bubbles: one sprite per phrase, created on first use
  const bubbles = new Map();
  const active = [];
  // one hidden bubble from the start, so the boot-time shader warm-up covers bubble sprites
  const warm = util.textSprite('Ciao!', { height: 0.95, font: '800 60px system-ui, sans-serif', color: '#3a2412', bg: 'rgba(255,255,255,0.94)', pad: 26 });
  warm.material.depthTest = true;
  warm.visible = false;
  scene.add(warm);
  function bubble(text, x, y, z, dur = 1.6) {
    let b = bubbles.get(text);
    if (!b) {
      const s = util.textSprite(text, { height: 0.95, font: '800 60px system-ui, sans-serif', color: '#3a2412', bg: 'rgba(255,255,255,0.94)', pad: 26 });
      s.material.depthTest = true;
      s.material.transparent = true;
      s.renderOrder = 6;
      s.visible = false;
      scene.add(s);
      b = { sprite: s, w: s.scale.x, t: 0, dur: 0, x: 0, y: 0, z: 0 };
      bubbles.set(text, b);
    }
    b.t = 0; b.dur = dur; b.x = x; b.y = y; b.z = z;
    if (!active.includes(b)) active.push(b);
    return b;
  }

  const fx = {
    points, shadows,
    // presets ------------------------------------------------------------------------------
    burst(x, y, z, { count = 14, colors = ['#ffffff'], speed = 4, up = 3, life = 0.8, size = 0.35, sizeEnd = 0.05, sprite = SPR.DOT, gravity = 9, drag = 1.5 } = {}) {
      const k = Math.max(1, Math.round(count * P));
      for (let i = 0; i < k; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
        spawn(x, y, z, Math.cos(a) * s, up * (0.5 + Math.random() * 0.8), Math.sin(a) * s,
          life * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6), sizeEnd, colors[i % colors.length], sprite, gravity, drag);
      }
    },
    plusOne(x, y, z, color = '#ffd84a', size = 0.9) {
      spawn(x, y, z, 0, 2.2, 0, 1.0, size, size * 1.25, color, SPR.PLUS, 0, 1.2);
    },
    hearts(x, y, z, count = 3) {
      for (let i = 0; i < count; i++) spawn(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 1.4 + Math.random(), (Math.random() - 0.5) * 0.6, 1.3, 0.4, 0.55, '#ff6f91', SPR.HEART, -0.5, 0.5);
    },
    splash(x, y, z, dirX, dirZ, strength = 1) {
      const k = Math.round((10 + 14 * strength) * P);
      for (let i = 0; i < k; i++) {
        const side = i % 2 ? 1 : -1;
        const sx = -dirZ * side, sz = dirX * side;
        const s = 2 + Math.random() * 3 * strength;
        spawn(x + sx * 0.6, y + 0.1, z + sz * 0.6, sx * s + dirX * Math.random() * 2, 2.5 + Math.random() * 3.5 * strength, sz * s + dirZ * Math.random() * 2,
          0.6 + Math.random() * 0.4, 0.22 + Math.random() * 0.18, 0.08, i % 3 ? '#dff1fb' : '#9fcbe6', SPR.DOT, 13, 0.6);
      }
    },
    spawn,
    // immediate-mode point for this frame only
    sparkle(x, y, z, size, color, alpha = 1, sprite = SPR.STAR) {
      const c = rgb(color);
      put(x, y, z, c[0], c[1], c[2], size, sprite, alpha);
    },
    sparkleRGB(x, y, z, size, r, g, b, alpha = 1, sprite = SPR.STAR) { put(x, y, z, r, g, b, size, sprite, alpha); },
    shadow(x, y, z, r) {
      if (ns >= SHCAP || r <= 0.02) return;
      _m.makeScale(r, 1, r).setPosition(x, y + 0.04, z);
      shadows.setMatrixAt(ns++, _m);
    },
    leash(ax, ay, az, bx, by, bz) {
      if (nl >= LCAP) return;
      lPos.set([ax, ay, az, bx, by, bz], nl * 6);
      nl++;
    },
    bubble,

    begin() { n = 0; ns = 0; nl = 0; },
    end(dt) {
      // simulate live particles, compacting dead ones
      for (let i = 0; i < alive; i++) {
        life[i] -= dt;
        if (life[i] <= 0) {
          const j = --alive;
          px[i] = px[j]; py[i] = py[j]; pz[i] = pz[j]; vx[i] = vx[j]; vy[i] = vy[j]; vz[i] = vz[j];
          life[i] = life[j]; maxLife[i] = maxLife[j]; size0[i] = size0[j]; size1[i] = size1[j];
          grav[i] = grav[j]; drag[i] = drag[j]; spr[i] = spr[j]; cr[i] = cr[j]; cg[i] = cg[j]; cb[i] = cb[j];
          i--;
          continue;
        }
        const k = Math.exp(-drag[i] * dt);
        vx[i] *= k; vz[i] *= k; vy[i] = vy[i] * k - grav[i] * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
        const f = 1 - life[i] / maxLife[i];
        const alpha = f < 0.1 ? f / 0.1 : Math.min(1, (1 - f) * 3);
        put(px[i], py[i], pz[i], cr[i], cg[i], cb[i], size0[i] + (size1[i] - size0[i]) * f, spr[i], alpha);
      }
      geo.setDrawRange(0, n);
      points.visible = n > 0;
      if (n) {
        uploadFirst(aPos, n); uploadFirst(aCol, n); uploadFirst(aMisc, n);
        const h = renderer.getDrawingBufferSize(_v2).y;
        mat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
      }
      shadows.count = ns;
      shadows.visible = ns > 0;
      if (ns) uploadFirst(shadows.instanceMatrix, ns);
      lGeo.setDrawRange(0, nl * 2);
      leashes.visible = nl > 0;
      if (nl) uploadFirst(lAttr, nl * 2);
      // bubbles pop in, wobble and fade
      for (let i = active.length - 1; i >= 0; i--) {
        const b = active[i];
        b.t += dt;
        const s = b.sprite;
        if (b.t >= b.dur) { s.visible = false; active.splice(i, 1); continue; }
        const pop = Math.min(1, b.t / 0.15);
        const sc = pop * (1 + 0.15 * Math.sin(Math.min(1, b.t / 0.35) * Math.PI));
        s.visible = true;
        s.position.set(b.x, b.y + b.t * 0.25, b.z);
        s.scale.set(b.w * sc, 0.95 * sc, 1);
        s.material.opacity = Math.min(1, (b.dur - b.t) / 0.3);
      }
    },
  };
  const _v2 = new THREE.Vector2();
  return fx;
}
