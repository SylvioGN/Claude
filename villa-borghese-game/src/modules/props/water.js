// Running water for the nasoni and the small fountains: thin streams with a scrolling streak
// texture plus a few sparkling droplets bouncing where the water lands. Two draw calls in all,
// hidden when no fountain is near the camera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// spots: [{x, y, z, h, r}]: stream from (x, y, z) down to y - h (or up when h < 0), radius r.
export function createWaterFx(ctx, spots) {
  if (!spots.length) return { update() {} };
  const { canvasTexture } = ctx.util;

  const streak = canvasTexture(16, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const a = 0.45 + 0.35 * Math.sin((y / h) * Math.PI * 6) ** 2 + (y % 11 === 0 ? 0.2 : 0);
      g.fillStyle = `rgba(235,248,255,${Math.min(1, a).toFixed(2)})`;
      g.fillRect(0, y, w, 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(w * 0.35, 0, w * 0.2, h);
  }, { repeat: [1, 3] });

  const parts = spots.map((s) => {
    const len = Math.abs(s.h);
    const g = new THREE.CylinderGeometry(s.r, s.r * 1.3, len, 5, 1, true);
    g.translate(s.x, s.h > 0 ? s.y - len / 2 : s.y + len / 2, s.z);
    return g;
  });
  const streams = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshBasicMaterial({
    map: streak, color: 0xe6f6ff, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  streams.name = 'props.streams';
  streams.renderOrder = 2;
  streams.matrixAutoUpdate = false;
  ctx.scene.add(streams);

  // droplets: each one hops out of the splash point, rises and fades on its own cycle
  const per = Math.max(3, Math.round(8 * (ctx.quality.particles ?? 1)));
  const n = spots.length * per;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const rnd = ctx.rng('props-sparkle');
  spots.forEach((s, i) => {
    const landY = s.h > 0 ? s.y - s.h : s.y;
    for (let k = 0; k < per; k++) {
      const j = i * per + k;
      pos.set([s.x, landY + 0.02, s.z], j * 3);
      seed[j] = rnd();
    }
  });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const dot = canvasTexture(32, 32, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.3, 'rgba(220,245,255,0.9)');
    r.addColorStop(1, 'rgba(200,235,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(w / 2 - 1, 2, 2, h - 4); g.fillRect(2, h / 2 - 1, w - 4, 2);
  }, { wrap: false });
  const uTime = { value: 0 };
  const pm = new THREE.PointsMaterial({ map: dot, size: 0.16, transparent: true, depthWrite: false, color: 0xffffff });
  pm.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeed;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = fract(uTime * (0.9 + aSeed * 0.8) + aSeed * 7.3);
        float ang = aSeed * 43.0;
        float rad = 0.05 + ph * (0.18 + 0.1 * fract(aSeed * 13.0));
        transformed += vec3(cos(ang) * rad, sin(ph * 3.1416) * (0.12 + 0.12 * fract(aSeed * 5.0)), sin(ang) * rad);
        float fade = 1.0 - ph;`)
      .replace('gl_PointSize = size;', 'gl_PointSize = size * (0.4 + fade);');
  };
  const sparks = new THREE.Points(pg, pm);
  sparks.name = 'props.sparkles';
  sparks.renderOrder = 3;
  sparks.frustumCulled = false;
  ctx.scene.add(sparks);

  const NEAR = 70;
  let check = 0;
  return {
    update(dt, t) {
      streak.offset.y = (t * 1.6) % 1;
      uTime.value = t;
      if ((check -= dt) > 0) return;
      check = 0.25;
      const c = ctx.camera.position;
      let near = false;
      for (const s of spots) {
        if (Math.abs(s.x - c.x) < NEAR && Math.abs(s.z - c.z) < NEAR) { near = true; break; }
      }
      streams.visible = sparks.visible = near;
    },
  };
}
