// Cart effects: one Points system for every particle (dust puffs, grass bits, boost sparkles,
// splashes, bump stars), the riders' speech bubble and a blob shadow for the 'low' tier.
import * as THREE from 'three';

const KIND = { puff: 0, star: 1, leaf: 2 };

// Marks the first n items of a dynamic buffer for upload (not the whole capacity).
function uploadFirst(attr, n) {
  attr.clearUpdateRanges();
  attr.addUpdateRange(0, n * attr.itemSize);
  attr.needsUpdate = true;
}

function atlas(util) {
  return util.canvasTexture(192, 64, (g) => {
    g.clearRect(0, 0, 192, 64);
    // soft puff
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    // four-point sparkle star
    g.save();
    g.translate(96, 32);
    const sg = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    sg.addColorStop(0, 'rgba(255,255,255,1)');
    sg.addColorStop(1, 'rgba(255,255,255,0.85)');
    g.fillStyle = sg;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 29;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.restore();
    // grass blade / leaf
    g.save();
    g.translate(160, 32);
    g.rotate(0.6);
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(0, 0, 9, 24, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }, { wrap: false, anisotropy: 1 });
}

export function createParticles(ctx, max) {
  const n = Math.max(24, Math.round(max));
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 4);
  const size = new Float32Array(n);
  const kind = new Float32Array(n);
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n);   // remaining
  const span = new Float32Array(n);   // total
  const s0 = new Float32Array(n), s1 = new Float32Array(n), a0 = new Float32Array(n);
  const grav = new Float32Array(n), drag = new Float32Array(n), twinkle = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aCol = new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  const aSize = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
  const aKind = new THREE.BufferAttribute(kind, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('pcolor', aCol);
  geo.setAttribute('psize', aSize);
  geo.setAttribute('pkind', aKind);
  geo.setDrawRange(0, 0);

  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uScale: { value: 400 } }]),
    vertexShader: `
      attribute vec4 pcolor; attribute float psize; attribute float pkind;
      uniform float uScale;
      varying vec4 vColor; varying float vKind;
      #include <fog_pars_vertex>
      void main() {
        vColor = pcolor; vKind = pkind;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = psize * uScale / max(0.5, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec4 vColor; varying float vKind;
      #include <fog_pars_fragment>
      void main() {
        vec4 tex = texture2D(uMap, vec2((gl_PointCoord.x + vKind) / 3.0, 1.0 - gl_PointCoord.y));
        gl_FragColor = vec4(vColor.rgb * tex.rgb, vColor.a * tex.a);
        if (gl_FragColor.a < 0.02) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  mat.uniforms.uMap.value = atlas(ctx.util);
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  points.name = 'cart-particles';
  ctx.scene.add(points);

  let count = 0;
  const c = new THREE.Color();
  const rgbCache = new Map(); // CSS colour -> [r, g, b], converted once
  const rgbOf = (color) => {
    let v = rgbCache.get(color);
    if (!v) { c.set(color); v = [c.r, c.g, c.b]; rgbCache.set(color, v); }
    return v;
  };
  const dbs = new THREE.Vector2();

  return {
    points,
    get count() { return count; },
    // o: {x, y, z, vx, vy, vz, life, size0, size1, alpha, color, kind, gravity, drag, twinkle}
    spawn(o) {
      if (count >= n) return;
      const i = count++;
      pos[i * 3] = o.x; pos[i * 3 + 1] = o.y; pos[i * 3 + 2] = o.z;
      vel[i * 3] = o.vx || 0; vel[i * 3 + 1] = o.vy || 0; vel[i * 3 + 2] = o.vz || 0;
      life[i] = span[i] = o.life || 1;
      s0[i] = o.size0 ?? 0.5; s1[i] = o.size1 ?? s0[i];
      a0[i] = o.alpha ?? 1;
      const rgb = rgbOf(o.color || '#ffffff');
      col[i * 4] = rgb[0]; col[i * 4 + 1] = rgb[1]; col[i * 4 + 2] = rgb[2];
      kind[i] = KIND[o.kind || 'puff'];
      grav[i] = o.gravity || 0; drag[i] = o.drag || 0; twinkle[i] = o.twinkle || 0;
    },
    update(dt, t) {
      ctx.renderer.getDrawingBufferSize(dbs);
      mat.uniforms.uScale.value = dbs.y / (2 * Math.tan((ctx.camera.fov * Math.PI) / 360));
      for (let i = 0; i < count; i++) {
        life[i] -= dt;
        if (life[i] <= 0) {
          // swap the last live particle into this slot
          const j = --count;
          if (i !== j) {
            for (let k = 0; k < 3; k++) { pos[i * 3 + k] = pos[j * 3 + k]; vel[i * 3 + k] = vel[j * 3 + k]; }
            for (let k = 0; k < 4; k++) col[i * 4 + k] = col[j * 4 + k];
            life[i] = life[j]; span[i] = span[j]; s0[i] = s0[j]; s1[i] = s1[j]; a0[i] = a0[j];
            kind[i] = kind[j]; grav[i] = grav[j]; drag[i] = drag[j]; twinkle[i] = twinkle[j];
          }
          i--;
          continue;
        }
        const f = Math.exp(-drag[i] * dt);
        vel[i * 3] *= f; vel[i * 3 + 1] = vel[i * 3 + 1] * f - grav[i] * dt; vel[i * 3 + 2] *= f;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const u = 1 - life[i] / span[i];
        size[i] = s0[i] + (s1[i] - s0[i]) * u;
        let a = a0[i] * Math.min(1, (1 - u) * 2.2) * Math.min(1, u * 12 + 0.25);
        if (twinkle[i]) a *= 0.6 + 0.4 * Math.sin(t * twinkle[i] + i);
        col[i * 4 + 3] = a;
      }
      geo.setDrawRange(0, count);
      if (count) {
        uploadFirst(aPos, count); uploadFirst(aCol, count); uploadFirst(aSize, count); uploadFirst(aKind, count);
      }
    },
  };
}

// Speech bubble beside the riders ("Wheee!", "Ciao!"), out on the speaker's side of the cart so the
// guide arrow above the roof stays in sight. Its tail points back at the cart.
export function createBubble(ctx, parent) {
  const W = 256, H = 128, TAIL = 0.16; // tail tip at 16% of the width from the inner edge
  const cache = new Map();
  const tex = (text, tailLeft) => {
    const key = (tailLeft ? 'L' : 'R') + text;
    if (cache.has(key)) return cache.get(key);
    const t = ctx.util.canvasTexture(W, H, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#2a2118';
      g.lineWidth = 6;
      ctx.util.roundRect(g, 8, 8, w - 16, 84, 36);
      g.fill(); g.stroke();
      // tail from the bottom edge down to the tip, mirrored for the other side
      const tip = tailLeft ? w * TAIL : w * (1 - TAIL), base = tailLeft ? 1 : -1;
      const b0 = tip + base * 12, b1 = tip + base * 44;
      g.beginPath();
      g.moveTo(b0, 89); g.lineTo(tip, h - 6); g.lineTo(b1, 89);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(b0, 92); g.lineTo(tip, h - 6); g.lineTo(b1, 92);
      g.stroke();
      g.font = '900 52px system-ui, sans-serif';
      const fit = Math.min(1, (w - 52) / Math.max(1, g.measureText(text).width));
      g.font = `900 ${Math.floor(52 * fit)}px system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#e8572e';
      g.fillText(text, w / 2, 51);
    }, { wrap: false });
    cache.set(key, t);
    return t;
  };
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(mat);
  sprite.visible = false;
  sprite.renderOrder = 20;
  sprite.center.set(0.5, 0);
  parent.add(sprite);
  const sideW = new THREE.Vector3(), camRight = new THREE.Vector3();
  let left = 0, total = 0, cool = 0, y0 = 1.7;
  return {
    // side: -1 | 1, the cart side (local x) of the rider who speaks; z: the rider's row
    say(text, side, z, dur = 1.4) {
      if (cool > 0) return false;
      // which way is "outwards" on screen: the tail goes on the inner edge, towards the cart
      parent.updateMatrixWorld();
      sideW.set(side, 0, 0).transformDirection(parent.matrixWorld);
      camRight.setFromMatrixColumn(ctx.camera.matrixWorld, 0);
      const outRight = sideW.dot(camRight) >= 0;
      mat.map = tex(text, outRight);
      mat.needsUpdate = true;
      sprite.center.set(outRight ? TAIL : 1 - TAIL, 0);
      y0 = 1.7;
      sprite.position.set(side * 0.95, y0, z);
      left = total = dur;
      cool = dur + 0.6;
      sprite.visible = true;
      return true;
    },
    update(dt) {
      cool -= dt;
      if (left <= 0) { sprite.visible = false; return; }
      left -= dt;
      const u = 1 - left / total;
      const pop = u < 0.15 ? 0.6 + (u / 0.15) * 0.5 : u < 0.25 ? 1.1 - ((u - 0.15) / 0.1) * 0.1 : 1;
      const fade = left < 0.25 ? left / 0.25 : 1;
      sprite.scale.set(2.8 * pop, 1.4 * pop, 1);
      mat.opacity = fade;
      sprite.position.y = y0 + u * 0.2;
    },
  };
}

// Long soft shadow under the cart when shadow maps are off.
export function createBlob(ctx, parent) {
  const m = ctx.util.blobShadow(1, 0.55);
  m.scale.set(0.9, 2.8, 1);
  m.position.y = 0.04;
  parent.add(m);
  return m;
}
