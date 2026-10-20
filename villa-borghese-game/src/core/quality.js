// Picks a graphics tier for the device and lowers resolution at runtime if frames get slow.
//   ctx.quality = { tier, pixelRatio, shadows, shadowMapSize, shadowRange, treeDensity, drawDistance, antialias, particles }
// Modules read ctx.quality to scale their detail (e.g. treeDensity 0.5 = half the trees).

const TIERS = {
  low: { pixelRatio: 1, shadows: false, shadowMapSize: 512, shadowRange: 40, treeDensity: 0.5, drawDistance: 260, antialias: false, particles: 0.5 },
  med: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024, shadowRange: 50, treeDensity: 0.8, drawDistance: 340, antialias: false, particles: 0.8 },
  high: { pixelRatio: 2, shadows: true, shadowMapSize: 2048, shadowRange: 70, treeDensity: 1, drawDistance: 420, antialias: true, particles: 1 },
};

export function detectQuality(params) {
  const forced = params.get('quality');
  let tier = TIERS[forced] ? forced : null;
  if (!tier) {
    const ua = navigator.userAgent || '';
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarse;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    if (!mobile) tier = cores >= 6 ? 'high' : 'med';
    else tier = cores >= 8 && mem >= 6 ? 'med' : 'low';
  }
  const q = { tier, ...TIERS[tier] };
  q.pixelRatio = Math.min(q.pixelRatio, window.devicePixelRatio || 1);
  return q;
}

// Watches frame times; when the average stays under ~40 fps, lowers pixel ratio, then shadows.
export function createAdaptiveQuality(ctx) {
  let acc = 0, frames = 0, cooldown = 4;
  return {
    update(dt) {
      if (ctx.params.get('quality')) return; // fixed for tests
      cooldown -= dt;
      acc += dt; frames++;
      if (acc < 2.5) return;
      const fps = frames / acc;
      acc = 0; frames = 0;
      if (cooldown > 0) return;
      const q = ctx.quality;
      if (fps < 38) {
        if (q.pixelRatio > 0.75) {
          q.pixelRatio = Math.max(0.75, q.pixelRatio - 0.25);
          ctx.renderer.setPixelRatio(q.pixelRatio);
          cooldown = 3;
        } else if (q.shadows) {
          q.shadows = false;
          ctx.renderer.shadowMap.enabled = false;
          ctx.lights.sun.castShadow = false;
          ctx.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
          cooldown = 3;
        }
      } else if (fps > 57 && q.pixelRatio < Math.min(TIERS[q.tier].pixelRatio, window.devicePixelRatio || 1)) {
        q.pixelRatio = Math.min(q.pixelRatio + 0.25, TIERS[q.tier].pixelRatio);
        ctx.renderer.setPixelRatio(q.pixelRatio);
        cooldown = 6;
      }
    },
  };
}
