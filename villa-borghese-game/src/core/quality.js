// Picks a graphics tier for the device and eases off at runtime if frames get slow.
//   ctx.quality = { tier, pixelRatio, shadows, shadowMapSize, shadowRange, softShadows, treeDensity, drawDistance, antialias, particles }
// Modules read ctx.quality to scale their detail (e.g. treeDensity 0.5 = half the trees).

const TIERS = {
  low: { pixelRatio: 1, shadows: false, shadowMapSize: 512, shadowRange: 35, softShadows: false, treeDensity: 0.5, drawDistance: 260, antialias: false, particles: 0.5 },
  med: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024, shadowRange: 40, softShadows: false, treeDensity: 0.8, drawDistance: 320, antialias: false, particles: 0.8 },
  high: { pixelRatio: 2, shadows: true, shadowMapSize: 2048, shadowRange: 70, softShadows: true, treeDensity: 1, drawDistance: 420, antialias: true, particles: 1 },
};

// Phone GPUs that struggle with shadows and high resolution even in an 8-core phone.
const WEAK_GPU = /Mali-G(3\d|5[0-7]|6[0-8]|7[0-2])\b|Mali-T|Adreno \(TM\) ([1-5]\d\d|6[0-3]\d)\b|PowerVR|Vivante|SwiftShader/i;

function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name || '');
  } catch { return ''; }
}

export function detectQuality(params) {
  const forced = params.get('quality');
  let tier = TIERS[forced] ? forced : null;
  const gpu = gpuName();
  if (!tier) {
    const ua = navigator.userAgent || '';
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarse;
    const cores = navigator.hardwareConcurrency || 4;
    // Safari and Firefox don't report memory (or cores, on iOS): treat unknown as capable and let
    // the adaptive step-down below protect older devices.
    const mem = navigator.deviceMemory ?? 8;
    if (!mobile) tier = cores >= 6 ? 'high' : 'med';
    else if (/Apple GPU/i.test(gpu)) tier = 'med';
    else tier = cores >= 8 && mem >= 6 && !WEAK_GPU.test(gpu) ? 'med' : 'low';
  }
  const q = { tier, gpu, ...TIERS[tier] };
  q.pixelRatio = Math.min(q.pixelRatio, window.devicePixelRatio || 1);
  return q;
}

// Watches frame times. When the average stays under ~40 fps it steps down, one step per window:
// 1. stop updating the shadow map (no shader recompile), 2. pull the fog and draw distance in,
// 3. lower the resolution, never below 1x. It steps the resolution back up when there is headroom.
export function createAdaptiveQuality(ctx) {
  let acc = 0, frames = 0, cooldown = 5, level = 0;
  const q = ctx.quality;
  const maxRatio = q.pixelRatio;
  return {
    update(dt) {
      if (ctx.params.get('quality')) return; // fixed for tests
      if (ctx.game.state !== 'playing') { acc = 0; frames = 0; return; }
      cooldown -= dt;
      acc += dt; frames++;
      if (acc < 1.5) return;
      const fps = frames / acc;
      acc = 0; frames = 0;
      if (cooldown > 0) return;
      if (fps < 38) {
        cooldown = 2;
        if (level === 0 && q.shadows) {
          q.shadows = false;
          ctx.renderer.shadowMap.autoUpdate = false;
          ctx.renderer.shadowMap.needsUpdate = true; // one last clean shadow pass
          ctx.lights.sun.shadow.intensity = 0;
          level = 1;
        } else if (level <= 1 && q.drawDistance > 220) {
          q.drawDistance = Math.max(220, q.drawDistance - 60);
          ctx.scene.fog.near = q.drawDistance * 0.35;
          ctx.scene.fog.far = q.drawDistance;
          level = q.drawDistance <= 220 ? 2 : 1;
        } else if (q.pixelRatio > 1) {
          q.pixelRatio = Math.max(1, q.pixelRatio - 0.25);
          ctx.renderer.setPixelRatio(q.pixelRatio);
          level = 3;
        }
      } else if (fps > 57 && level === 3 && q.pixelRatio < maxRatio) {
        q.pixelRatio = Math.min(maxRatio, q.pixelRatio + 0.25);
        ctx.renderer.setPixelRatio(q.pixelRatio);
        cooldown = 8;
      }
    },
  };
}
