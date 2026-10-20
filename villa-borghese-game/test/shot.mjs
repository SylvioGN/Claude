// Screenshot / smoke tool (headless Chromium with WebGL).
//
//   node test/shot.mjs --params="state=play&quality=med" --out=.out/shot.png
//   node test/shot.mjs --html=.out/mine/index.html --params="cam=-300,30,100&look=-320,5,116" --out=.out/pincio.png
//   node test/shot.mjs --sim=6 --input='{"throttle":1,"steer":0.3}'   (drive 6 simulated seconds first)
//   node test/shot.mjs --portrait          (390x844 instead of 844x390 phone landscape)
//   node test/shot.mjs --eval="window.__game.ctx.game.score"   (prints the value)
//   node test/shot.mjs --click="#ui .play"  (tap a UI element before the shot)
//   node test/shot.mjs --canvas           (3D canvas only, no DOM overlay; fastest)
//
// Prints console errors, failed modules and renderer stats. Exit code 1 when the page threw.
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
const out = path.resolve(ROOT, args.out || '.out/shot.png');
const portrait = !!args.portrait;
const W = Number(args.w || (portrait ? 390 : 844)), H = Number(args.h || (portrait ? 844 : 390));
const params = args.params || 'state=play&quality=med';

fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await playwright.chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(args.dpr || 1), hasTouch: true, isMobile: !!args.mobile });
page.setDefaultTimeout(240000);
// Once the game is ready, stop the free-running frame loop: SwiftShader frames are slow and a busy
// loop starves screenshots. Frames are then rendered on demand by __game.render() / simulate().
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => (window.__game && window.__game.ready && !window.__liveFrames ? setTimeout(() => cb(performance.now()), 250) : raf(cb));
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

const t0 = Date.now();
await page.goto(`file://${html}?${params}`);
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: Number(args.timeout || 120000) });
const bootMs = Date.now() - t0;
if (args.click) { await page.tap(args.click).catch((e) => errors.push(`[click] ${e.message}`)); await page.waitForTimeout(300); }
if (args.sim) {
  const input = args.input ? JSON.parse(args.input) : { throttle: 1 };
  await page.evaluate(([s, inp]) => window.__game.simulate(s, inp), [Number(args.sim), input]);
}
if (args.eval) {
  const v = await page.evaluate((code) => { try { return JSON.stringify(eval(code), null, 1); } catch (e) { return 'EVAL ERROR ' + e.message; } }, String(args.eval));
  console.log('eval:', v);
}
await page.waitForTimeout(Number(args.wait || 600));
// grab the WebGL canvas right after rendering, then let Playwright compose the DOM overlay on top
const png = await page.evaluate(() => { window.__game.render(); return window.__game.ctx.renderer.domElement.toDataURL('image/png'); });
if (args.canvas) fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
else await page.screenshot({ path: out });
const info = await page.evaluate(() => window.__game.info());
console.log(JSON.stringify({ out: path.relative(ROOT, out), bootMs, ...info }, null, 1));
if (errors.length) console.log('console:\n' + [...new Set(errors)].slice(0, 30).join('\n'));
await browser.close();
process.exit(errors.some((e) => e.startsWith('[pageerror]')) || info.failed.length ? 1 : 0);
