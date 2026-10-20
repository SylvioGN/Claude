// Villa Borghese Cart Adventure: boot, shared context, module lifecycle and the frame loop.
//
// Every feature module (src/modules/*.js, listed in build.mjs) exports:
//   export async function create(ctx) { ...build things...; return { update(dt, t) {}, ...api } }
// create() runs once at boot in build.mjs order; update() runs every frame.
// See README.md for the full ctx contract.
//
// URL parameters (handy for tests and screenshots):
//   ?state=play            skip the title screen          ?quality=low|med|high
//   ?cam=x,y,z&look=x,y,z   fixed debug camera             ?fov=60
//   ?spawn=x,z,headingDeg   start the cart elsewhere       ?debug=1  stats overlay
//   ?seed=n                 (reserved)
import * as THREE from 'three';
import registry from 'virtual:registry';
import * as MAP from './data/park.js';
import { Events } from './core/events.js';
import { rng } from './core/rng.js';
import { createTerrain, WATER_Y } from './core/terrain.js';
import { Colliders } from './core/colliders.js';
import { detectQuality, createAdaptiveQuality } from './core/quality.js';
import { createCameraRig } from './core/camera.js';
import { createGame } from './core/game.js';
import { fallbackWorld, fallbackCart, installKeyboard } from './core/fallbacks.js';
import * as util from './core/util.js';
import * as geo from './core/geo.js';

const bootbar = document.getElementById('bootbar');
const progress = (f) => { if (bootbar) bootbar.style.width = `${Math.round(f * 100)}%`; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot(hotData) {
  const params = new URLSearchParams(location.search);
  const quality = detectQuality(params);
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('cam') });
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8cc3e8');
  scene.fog = new THREE.Fog('#cfe2ea', quality.drawDistance * 0.35, quality.drawDistance);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 2400);

  // Lights: warm midday October sun from the south-south-east (photo taken at 12:13).
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#6f7f4a', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d8', 2.4);
  const sunDir = new THREE.Vector3(0.35, 0.78, 0.52).normalize(); // points from the scene towards the sun
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  const sr = quality.shadowRange;
  Object.assign(sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: 320 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  progress(0.08);
  await nextFrame();
  const terrain = createTerrain();
  const colliders = new Colliders(terrain.extent);
  colliders.addRing(MAP.BOUNDARY, 'boundary', null, 0.3);
  for (const h of MAP.HOLES) colliders.addRing(h, 'boundary', null, 0.3);
  for (const w of MAP.WATER) {
    colliders.addRing(w.r, w.k === 'fountain' ? 'fountain' : 'water', w, 0.4);
    for (const hr of w.h || []) colliders.addRing(hr, 'water', w, 0.4);
  }
  progress(0.2);

  const ctx = {
    THREE, renderer, scene, camera, params, quality, MAP, terrain, colliders, util, geo, rng,
    WATER_Y, events: new Events(), lights: { sun, hemi, sunDir },
    debug: params.has('debug'), time: 0, modules: {},
    input: { steer: 0, throttle: 0, brake: 0, honk: false }, touchInput: null, keyInput: null,
    cart: null, camRig: null, game: null,
    // Landmark modules ask for special trees (Piazza di Siena's pines, cypress rows...) with
    // ctx.plant(kind, x, z, {scale, ry}); modules/vegetation.js plants them with its models.
    // kinds: 'umbrellaPine' | 'holmOak' | 'cedar' | 'plane' | 'cypress' | 'palm' | 'magnolia' | 'orange' | 'shrub' | 'hedgeBall'
    plantQueue: [],
    plant(kind, x, z, opts = {}) { ctx.plantQueue.push({ kind, x, z, ...opts }); },
    // Areas kept clear of random trees and props: {x, z, r} circles or {ring: [[x, z], ...]}.
    reserved: [],
    reserve(area) { ctx.reserved.push(area); },
    isReserved(x, z, pad = 0) {
      for (const a of ctx.reserved) {
        if (a.ring) { if (geo.pointInRing(x, z, a.ring) || (pad > 0 && geo.distToRingEdge(x, z, a.ring) < pad)) return true; }
        else if (Math.hypot(x - a.x, z - a.z) < a.r + pad) return true;
      }
      return false;
    },
  };
  window.__game = { ctx };
  const keyboard = installKeyboard(ctx);
  ctx.camRig = createCameraRig(ctx);
  ctx.game = createGame(ctx, hotData);

  // Build feature modules. A module that throws is skipped so the rest of the park still works.
  const loaded = new Set(registry.map(([name]) => name));
  const updaters = [];
  let i = 0;
  for (const [name, mod] of registry) {
    try {
      const api = (await mod.create(ctx)) || {};
      ctx.modules[name] = api;
      if (name === 'cart') ctx.cart = api;
      if (typeof api.update === 'function') updaters.push([name, api]);
    } catch (err) {
      console.error(`[boot] module "${name}" failed`, err);
      loaded.delete(name);
      (ctx.failed ||= []).push({ name, message: String(err && err.stack || err) });
    }
    progress(0.2 + (0.75 * ++i) / registry.length);
    await nextFrame();
  }
  if (!loaded.has('world')) fallbackWorld(ctx);
  if (!loaded.has('cart')) {
    ctx.cart = fallbackCart(ctx);
    ctx.modules.cart = ctx.cart;
    updaters.push(['cart', ctx.cart]);
  }
  const adaptive = createAdaptiveQuality(ctx);

  // Start position / title camera
  const g = ctx.game;
  const spawn = params.get('spawn')?.split(',').map(Number);
  if (spawn) g.start = { x: spawn[0], z: spawn[1], heading: ((spawn[2] || 0) * Math.PI) / 180 };
  ctx.cart.reset(g.start.x, g.start.z, g.start.heading);
  ctx.camRig.setMode('title', { x: MAP.ANCHORS.terrazza.x + 10, z: MAP.ANCHORS.terrazza.z, r: 34, h: 14, a: 0 });
  g.setState('title');
  if (params.get('state') === 'play' || !loaded.has('ui')) g.begin();

  // Resize
  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', () => setTimeout(onResize, 200));

  // Debug overlay
  let stats = null;
  if (ctx.debug) {
    stats = document.createElement('div');
    stats.style.cssText = 'position:absolute;left:4px;bottom:4px;z-index:99;font:11px/1.3 monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre';
    document.getElementById('app').appendChild(stats);
  }
  let fpsAcc = 0, fpsN = 0, fps = 0;

  function step(dt) {
    ctx.time += dt;
    keyboard.update();
    g.update(dt);
    for (const [name, api] of updaters) {
      try { api.update(dt, ctx.time); } catch (err) {
        console.error(`[loop] ${name}.update failed`, err);
        api.update = () => {};
      }
    }
    ctx.camRig.update(dt);
    // keep the shadow camera centred on the cart
    const c = ctx.cart.position;
    sun.target.position.set(c.x, c.y, c.z);
    sun.position.set(c.x + sunDir.x * 120, c.y + sunDir.y * 120, c.z + sunDir.z * 120);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    step(dt);
    renderer.render(scene, camera);
    adaptive.update(dt);
    if (stats) {
      fpsAcc += dt; fpsN++;
      if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
      const info = renderer.info.render;
      const p = ctx.cart.position;
      stats.textContent = `${fps.toFixed(0)} fps  ${quality.tier} x${quality.pixelRatio}\ncalls ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k\n${g.state}  cart ${p.x.toFixed(1)},${p.z.toFixed(1)}  v ${ctx.cart.speed.toFixed(1)}`;
    }
    requestAnimationFrame(frame);
  }

  // Test hooks: advance the simulation without waiting for real frames.
  Object.assign(window.__game, {
    step,
    simulate(seconds, input = null, dt = 1 / 60) {
      const keep = ctx.touchInput;
      if (input) ctx.touchInput = { steer: 0, throttle: 0, brake: 0, honk: false, ...input };
      for (let t = 0; t < seconds; t += dt) step(dt);
      ctx.touchInput = keep;
      renderer.render(scene, camera);
    },
    render() { renderer.render(scene, camera); },
    info() {
      const r = renderer.info;
      return { calls: r.render.calls, triangles: r.render.triangles, geometries: r.memory.geometries, textures: r.memory.textures, failed: ctx.failed || [], state: g.state };
    },
  });

  // Keep progress when the page is hot-updated by the artifact viewer.
  window.claude?.hot?.snapshot?.(() => g.snapshot());

  progress(1);
  const bootEl = document.getElementById('boot');
  if (bootEl) { bootEl.style.opacity = '0'; setTimeout(() => bootEl.remove(), 450); }
  renderer.render(scene, camera);
  window.__game.ready = true;
  requestAnimationFrame(frame);
}

function start(data) {
  boot(data && Object.keys(data).length ? data : null).catch((err) => {
    console.error(err);
    const b = document.getElementById('boot');
    if (b) b.innerHTML = '<div>Sorry, the park could not load on this device.<small>Try reloading the page.</small></div>';
  });
}
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
