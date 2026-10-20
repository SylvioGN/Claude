// Souvenir-photo check: parks the cart at every tour stop, lets the photo camera settle and saves
// the 3D view of each one (plus a contact sheet) to .out/album/.
//
//   node test/album.mjs [--html=dist/index.html] [--quality=med] [--portrait]
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
const out = path.resolve(ROOT, args.out || '.out/album');
fs.mkdirSync(out, { recursive: true });
const [W, H] = args.portrait ? [390, 844] : [844, 390];

const browser = await playwright.chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(300000);
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => (window.__game && window.__game.ready ? setTimeout(() => cb(performance.now()), 500) : raf(cb));
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${html}?state=play&quality=${args.quality || 'med'}`);
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 240000 });
const ids = await page.evaluate(() => window.__game.ctx.game.stops.map((s) => s.id));
const files = [];
for (const id of ids) {
  const png = await page.evaluate((id) => {
    const { ctx, step } = window.__game;
    const g = ctx.game;
    if (g.state === 'stop') g.closeStop();
    const s = g.stops.find((q) => q.id === id);
    s.visited = false;
    g.target = s;
    ctx.cart.reset(s.spotX, s.spotZ, ctx.cart.heading);
    for (let i = 0; i < 4 && g.state !== 'stop'; i++) step(1 / 30);
    for (let i = 0; i < 55; i++) step(1 / 30);
    ctx.renderer.render(ctx.scene, ctx.camera);
    return ctx.renderer.domElement.toDataURL('image/jpeg', 0.85);
  }, id);
  const f = path.join(out, `${id}.jpg`);
  fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'));
  files.push(f);
}
// contact sheet
const sheet = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const imgs = files.map((f) => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f, '.jpg')}</figcaption></figure>`).join('');
await sheet.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(${args.portrait ? 6 : 4},1fr);gap:4px;background:#222;font:12px sans-serif;color:#fff}figure{margin:0}img{width:100%;display:block}</style>${imgs}`);
await sheet.waitForTimeout(500);
await sheet.screenshot({ path: path.join(out, 'sheet.png'), fullPage: true });
console.log(`saved ${files.length} photos and ${path.relative(ROOT, path.join(out, 'sheet.png'))}`);
if (errors.length) console.log('errors:\n' + errors.join('\n'));
await browser.close();
