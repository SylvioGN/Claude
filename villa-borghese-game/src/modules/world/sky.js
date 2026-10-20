// Sky dome: deep blue zenith fading to a warm pale haze at the horizon, the midday sun with a soft
// glow, and painted cumulus clouds that drift slowly. The shader writes display colours directly
// (no tone mapping) so the horizon matches the scene fog colour exactly.

export const SKY = {
  zenith: '#2a6fcf',
  mid: '#5c9de0',
  horizon: '#cfe1ea',
  sunGlow: '#fff2d6',
};

const srgb = (THREE, hex) => {
  const c = new THREE.Color().setHex(parseInt(hex.slice(1), 16), THREE.NoColorSpace);
  return new THREE.Vector3(c.r, c.g, c.b);
};

export function buildSky(ctx) {
  const { THREE } = ctx;
  const low = ctx.quality.tier === 'low';
  const clouds = cloudTexture(THREE, ctx.rng('world-clouds'), low ? 512 : 1024);
  const uniforms = {
    uZenith: { value: srgb(THREE, SKY.zenith) },
    uMid: { value: srgb(THREE, SKY.mid) },
    uHorizon: { value: srgb(THREE, SKY.horizon) },
    uSunGlow: { value: srgb(THREE, SKY.sunGlow) },
    uSunDir: { value: ctx.lights.sunDir.clone().normalize() },
    uClouds: { value: clouds },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZenith, uMid, uHorizon, uSunGlow, uSunDir;
      uniform sampler2D uClouds;
      uniform float uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float e = d.y;
        float sun = max(dot(d, uSunDir), 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.28, e));
        col = mix(col, uZenith, smoothstep(0.2, 0.95, e));
        // warm haze around the sun and low in the sky on the sunny side
        float side = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz)), 0.0);
        col = mix(col, uSunGlow, pow(sun, 5.0) * 0.32 + side * side * 0.22 * (1.0 - smoothstep(0.0, 0.3, e)));
        // clouds painted on a band of the dome (azimuth x elevation)
        float v = e / 0.62;
        if (v > 0.0 && v < 1.0) {
          float az = atan(d.x, d.z) * 0.15915494 + 0.5;
          vec4 c = textureLod(uClouds, vec2(az + uTime * 0.0009, 1.0 - v), 0.0);
          float a = c.r * smoothstep(0.0, 0.1, v);
          vec3 cc = mix(vec3(0.74, 0.80, 0.89), vec3(1.0, 0.995, 0.985), c.g);
          cc = mix(cc, uSunGlow, pow(sun, 12.0) * 0.6);
          col = mix(col, cc, a);
        }
        // the sun: bright disc and glow
        col += uSunGlow * (pow(sun, 900.0) * 0.9 + pow(sun, 60.0) * 0.22);
        col = mix(col, vec3(1.0, 0.995, 0.97), smoothstep(0.99955, 0.99975, sun));
        // hazy band at and below the horizon matches the fog
        col = mix(col, uHorizon, 1.0 - smoothstep(-0.03, 0.035, e));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const geo = new THREE.SphereGeometry(1, 32, 16);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'sky';
  mesh.scale.setScalar(1500);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return { mesh, uniforms };
}

// Cloud band: R = density, G = how sunlit (white tops, soft blue-grey bellies). Tiles horizontally.
function cloudTexture(THREE, rnd, W) {
  const H = W / 4;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return [c, c.getContext('2d')];
  };
  const [cd, gd] = mk(), [cl, gl] = mk();
  const puff = (g, x, y, r, a) => {
    for (const ox of [0, -W, W]) {
      if (ox && Math.abs(x + ox - W / 2) > W / 2 + r) continue;
      const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.75})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x + ox - r, y - r, 2 * r, 2 * r);
    }
  };
  const k = W / 1024;
  // fair-weather cumulus: flat bellies, rounded heads; smaller and flatter near the horizon
  const n = 16;
  for (let i = 0; i < n; i++) {
    const cx = ((i + rnd() * 0.7) / n) * W;
    const v = 0.12 + rnd() * 0.5; // elevation (0 horizon .. 1 high)
    const base = H * (1 - v);
    const size = (18 + rnd() * 26) * k * (0.55 + v);
    const width = size * (2.2 + rnd() * 2.2);
    const puffs = 8 + Math.floor(rnd() * 10);
    for (let p = 0; p < puffs; p++) {
      const t = rnd() * 2 - 1;
      const x = cx + t * width * 0.5;
      const r = size * (0.45 + rnd() * 0.55) * (1 - Math.abs(t) * 0.45);
      const y = base - r * (0.25 + rnd() * 0.5);
      puff(gd, x, y, r, 0.55);
      puff(gl, x - r * 0.08, y - r * 0.32, r * 0.92, 0.6);
    }
  }
  const dd = gd.getImageData(0, 0, W, H).data, ld = gl.getImageData(0, 0, W, H).data;
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const d = dd[i * 4 + 3] / 255;
    data[i * 4] = Math.round(Math.min(1, d * 1.15) * 255);
    data[i * 4 + 1] = Math.round(Math.min(1, ld[i * 4 + 3] / 255 / Math.max(0.05, d) * 0.9) * 255);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}
