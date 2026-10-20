// Whole-game audit in headless Chromium:
//  1. path blockage: samples every avenue/footway centre line and lists colliders sitting on it
//  2. autopilot tour: drives the cart along the avenues (A* over MAP.PATHS) to every tour stop,
//     closing each photo card, and reports stops reached, time taken and where it got stuck
//  3. renderer stats from a few viewpoints
//
//   node test/audit.mjs [--html=dist/index.html] [--quality=low] [--stops=12] [--shots]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const i = a.indexOf('=');
  return i < 0 ? [a.replace(/^--/, ''), true] : [a.slice(2, i), a.slice(i + 1)];
}));
const html = path.resolve(ROOT, args.html || 'dist/index.html');
const outDir = path.resolve(ROOT, args.out || '.out/audit');
fs.mkdirSync(outDir, { recursive: true });

const browser = await playwright.chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(`file://${html}?state=play&quality=${args.quality || 'low'}`);
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 180000 });

// ---------- 1. static blockage of paths
const blocked = await page.evaluate(() => {
  const { ctx } = window.__game;
  const out = [];
  for (const p of ctx.MAP.PATHS) {
    if (p.k !== 'viale') continue;
    for (let i = 1; i < p.p.length; i++) {
      const [ax, az] = p.p[i - 1], [bx, bz] = p.p[i];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < L; s += 2) {
        const x = ax + ((bx - ax) * s) / L, z = az + ((bz - az) * s) / L;
        if (!ctx.terrain.isInside(x, z)) continue;
        const hits = [];
        ctx.colliders.query(x, z, 1.4, (sh) => {
          let d;
          if (sh.type === 0) d = Math.hypot(x - sh.x, z - sh.z) - sh.r;
          else {
            const sx = sh.bx - sh.ax, sz = sh.bz - sh.az, L2 = sx * sx + sz * sz;
            let t = L2 ? ((x - sh.ax) * sx + (z - sh.az) * sz) / L2 : 0;
            t = Math.max(0, Math.min(1, t));
            d = Math.hypot(x - (sh.ax + sx * t), z - (sh.az + sz * t)) - sh.pad;
          }
          if (d < 0.9 && sh.tag !== 'boundary') hits.push(sh.tag);
        });
        if (hits.length) out.push({ path: p.n || '(unnamed)', x: +x.toFixed(1), z: +z.toFixed(1), tags: [...new Set(hits)] });
      }
    }
  }
  return out;
});
// cluster nearby blocked samples
const clusters = [];
for (const b of blocked) {
  const c = clusters.find((k) => Math.hypot(k.x - b.x, k.z - b.z) < 6);
  if (c) { c.n++; b.tags.forEach((t) => c.tags.add(t)); } else clusters.push({ ...b, n: 1, tags: new Set(b.tags) });
}
console.log(`\n== Avenue blockage: ${blocked.length} blocked samples in ${clusters.length} spots`);
for (const c of clusters.slice(0, 60)) console.log(`  ${c.path} @ ${c.x},${c.z}  [${[...c.tags].join(', ')}] x${c.n}`);

// ---------- 2. autopilot tour
const tour = await page.evaluate(async (maxStops) => {
  const { ctx, step } = window.__game;
  const g = ctx.game;
  // graph from paths
  const key = (x, z) => `${Math.round(x / 1.5)},${Math.round(z / 1.5)}`;
  const nodes = new Map();
  const node = (x, z) => {
    const k = key(x, z);
    if (!nodes.has(k)) nodes.set(k, { k, x, z, e: [] });
    return nodes.get(k);
  };
  for (const p of ctx.MAP.PATHS) {
    let prev = null;
    for (let i = 0; i < p.p.length; i++) {
      const [x, z] = p.p[i];
      if (prev) {
        const L = Math.hypot(x - prev.x, z - prev.z);
        const steps = Math.max(1, Math.ceil(L / 6));
        for (let s = 1; s <= steps; s++) {
          const n = node(prev.x + ((x - prev.x) * s) / steps, prev.z + ((z - prev.z) * s) / steps);
          const a = s === 1 ? prev : node(prev.x + ((x - prev.x) * (s - 1)) / steps, prev.z + ((z - prev.z) * (s - 1)) / steps);
          if (a !== n) { const d = Math.hypot(a.x - n.x, a.z - n.z); a.e.push([n, d]); n.e.push([a, d]); }
        }
        prev = node(x, z);
      } else prev = node(x, z);
    }
  }
  // join near-coincident nodes (intersections not sharing exact points)
  const all = [...nodes.values()];
  const grid = new Map();
  for (const n of all) { const k = `${Math.floor(n.x / 4)},${Math.floor(n.z / 4)}`; (grid.get(k) || grid.set(k, []).get(k)).push(n); }
  for (const n of all) {
    const gx = Math.floor(n.x / 4), gz = Math.floor(n.z / 4);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const m of grid.get(`${gx + i},${gz + j}`) || []) {
      if (m !== n && Math.hypot(m.x - n.x, m.z - n.z) < 3.5 && !n.e.some(([q]) => q === m)) { const d = Math.hypot(m.x - n.x, m.z - n.z); n.e.push([m, d]); m.e.push([n, d]); }
    }
  }
  const nearest = (x, z) => { let b = null, bd = Infinity; for (const n of all) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = n; } } return b; };
  const astar = (a, b) => {
    const open = new Map([[a.k, { n: a, g: 0, f: 0, p: null }]]), closed = new Set();
    while (open.size) {
      let cur = null; for (const v of open.values()) if (!cur || v.f < cur.f) cur = v;
      open.delete(cur.n.k);
      if (cur.n === b) { const out = []; for (let c = cur; c; c = c.p) out.push(c.n); return out.reverse(); }
      closed.add(cur.n.k);
      for (const [m, d] of cur.n.e) {
        if (closed.has(m.k)) continue;
        const gg = cur.g + d, ex = open.get(m.k);
        if (!ex || gg < ex.g) open.set(m.k, { n: m, g: gg, f: gg + Math.hypot(m.x - b.x, m.z - b.z), p: cur });
      }
    }
    return null;
  };

  const report = { reached: [], stuck: [], unreachable: [], simSeconds: 0 };
  const dt = 1 / 30;
  for (let s = 0; s < maxStops + 6; s++) {
    const target = g.nextStop();
    if (!target) break;
    const c = ctx.cart;
    const route = astar(nearest(c.position.x, c.position.z), nearest(target.spotX, target.spotZ));
    if (!route) { report.unreachable.push(target.id); target.visited = true; continue; }
    route.push({ x: target.spotX, z: target.spotZ });
    let wp = 0, t = 0, lastProgress = 0, bestD = Infinity, reached = false, unstuckTried = false;
    const before = g.visitedCount;
    while (t < 240) {
      if (g.state === 'stop') { reached = true; break; }
      while (wp < route.length - 1 && Math.hypot(route[wp].x - c.position.x, route[wp].z - c.position.z) < 4.5) wp++;
      const w = route[wp];
      const want = Math.atan2(w.x - c.position.x, w.z - c.position.z);
      let diff = ((want - c.heading + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      ctx.touchInput = { steer: Math.max(-1, Math.min(1, -diff * 2.2)), throttle: Math.abs(diff) > 1.2 ? 0.45 : 1, brake: 0, honk: false };
      step(dt); t += dt;
      const d = Math.hypot(target.spotX - c.position.x, target.spotZ - c.position.z);
      if (d < bestD - 0.5) { bestD = d; lastProgress = t; unstuckTried = false; }
      if (t - lastProgress > 4 && !unstuckTried) {
        // back up and turn like a player would
        unstuckTried = true;
        for (let k = 0; k < 45; k++) { ctx.touchInput = { steer: diff > 0 ? 1 : -1, throttle: 0, brake: 1, honk: false }; step(dt); }
        t += 45 * dt;
      }
      if (t - lastProgress > 10) {
        const tags = new Set();
        ctx.colliders.query(c.position.x, c.position.z, 2.5, (sh) => tags.add(sh.tag));
        report.stuck.push({ stop: target.id, x: +c.position.x.toFixed(1), z: +c.position.z.toFixed(1), wp, of: route.length, tags: [...tags], wpx: +route[wp].x.toFixed(1), wpz: +route[wp].z.toFixed(1), inside: ctx.terrain.isInside(route[wp].x, route[wp].z) });
        // nudge past the obstacle
        const n = route[Math.min(route.length - 1, wp + 2)];
        c.reset(n.x, n.z, c.heading);
        lastProgress = t; unstuckTried = false;
      }
    }
    report.simSeconds += t;
    if (reached || g.visitedCount > before) {
      report.reached.push({ id: g.currentStop ? g.currentStop.id : target.id, seconds: +t.toFixed(1) });
      for (let i = 0; i < 20; i++) step(dt);
      g.closeStop();
      if (g.state === 'finished') g.keepDriving();
    } else {
      report.unreachable.push(target.id);
      target.visited = true;
    }
  }
  ctx.touchInput = null;
  report.score = { ...g.score };
  report.state = g.state;
  return report;
}, Number(args.stops || 12));
console.log(`\n== Autopilot tour: reached ${tour.reached.length}, unreachable ${tour.unreachable.length}, stuck ${tour.stuck.length}, ${tour.simSeconds.toFixed(0)} s simulated`);
for (const r of tour.reached) console.log(`  ok ${r.id} in ${r.seconds}s`);
for (const u of tour.unreachable) console.log(`  UNREACHABLE ${u}`);
for (const s of tour.stuck) console.log(`  stuck going to ${s.stop} at ${s.x},${s.z} (waypoint ${s.wp}/${s.of} at ${s.wpx},${s.wpz}${s.inside ? '' : ' OUTSIDE'}) near [${s.tags.join(', ')}]`);
console.log(`  score ${JSON.stringify(tour.score)} state ${tour.state}`);

// ---------- 3. renderer stats from a few viewpoints
const views = {
  start: null,
  lake: [-70, 8, -100, -102, 2, -117],
  siena: [40, 30, -10, 96, 0, -38],
  galleria: [300, 10, -50, 328, 5, -73],
  overview: [0, 260, 120, 0, 0, -40],
};
console.log('\n== Renderer stats');
for (const [name, v] of Object.entries(views)) {
  const info = await page.evaluate((v) => {
    const { ctx } = window.__game;
    if (v) { ctx.camRig.setMode('debug-off'); ctx.camera.position.set(v[0], v[1], v[2]); ctx.camera.lookAt(v[3], v[4], v[5]); ctx.camera.updateMatrixWorld(); }
    ctx.renderer.render(ctx.scene, ctx.camera);
    const r = ctx.renderer.info.render;
    return { calls: r.calls, tris: r.triangles };
  }, v);
  console.log(`  ${name.padEnd(9)} calls ${info.calls}  tris ${(info.tris / 1000).toFixed(0)}k`);
  if (args.shots) await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}
const mem = await page.evaluate(() => window.__game.info());
console.log(`  geometries ${mem.geometries} textures ${mem.textures} failed ${JSON.stringify(mem.failed)}`);
if (errors.length) console.log('\nconsole errors:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
await browser.close();
