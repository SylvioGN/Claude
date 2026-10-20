// Game rules: state machine, the Grand Tour of stops, score, settings and saved progress.
//
// States: 'loading' -> 'title' -> 'playing' <-> 'stop' (photo moment) ... -> 'finished' (celebration,
// then free driving continues in 'playing'). 'paused' can be entered from 'playing'.
//
// Input: modules write into ctx.touchInput (ui.js) and core keyboard fills ctx.keyInput; every frame
// game.update() merges them into ctx.input = {steer -1..1 (right = +1), throttle 0..1, brake 0..1, honk bool}.
import { STOPS, MEDALS, START } from '../data/stops.js';
import * as MAP from '../data/park.js';
import { closestOnSegment, clamp, pointInRing, distToRingEdge } from './geo.js';

const SAVE_KEY = 'villa-borghese-cart-v1';
export const LANGS = ['en', 'it', 'fr', 'es', 'pt'];

function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function save(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

export function createGame(ctx, hotData = null) {
  const T = ctx.terrain;
  const saved = hotData?.save || load() || {};

  // Photo spot for each stop: closest point on an avenue/footway to the landmark.
  function photoSpot(anchor) {
    const ring = anchor.footprint;
    let best = null, bestScore = Infinity;
    for (const s of T.segments) {
      if (s.kind === 'bridge') continue;
      let c;
      if (ring) {
        // nearest to any footprint vertex/edge: test ring vertices against the segment
        c = null;
        for (const [rx, rz] of ring) {
          const cc = closestOnSegment(rx, rz, s.ax, s.az, s.bx, s.bz);
          if (!c || cc.d2 < c.d2) c = cc;
        }
      } else {
        c = closestOnSegment(anchor.x, anchor.z, s.ax, s.az, s.bx, s.bz);
      }
      if (!T.isInside(c.x, c.z)) continue;
      // never inside the building itself (some footways run through courtyards)
      if (ring && (pointInRing(c.x, c.z, ring) || distToRingEdge(c.x, c.z, ring) < 2.5)) continue;
      const score = Math.sqrt(c.d2) + (s.kind === 'viale' ? 0 : 6);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best ? { x: best.x, z: best.z } : { x: anchor.x, z: anchor.z };
  }

  const stops = STOPS.map((s, index) => {
    const a = MAP.ANCHORS[s.anchor];
    const spot = photoSpot(a);
    return {
      ...s, index, x: a.x, z: a.z, spotX: spot.x, spotZ: spot.z, footprint: a.footprint || null,
      visited: !!saved.visited?.includes(s.id),
    };
  });

  const startAnchor = MAP.ANCHORS[START.anchor];
  const settingsDefault = {
    lang: 'en', // English unless the player picks another language on the title screen
    sound: true, music: true, easy: true, driver: 0, names: {},
  };

  const game = {
    state: 'loading',
    stops,
    medals: MEDALS,
    score: { gelato: saved.gelato || 0, pinecones: saved.pinecones || 0, bumps: 0, ...(hotData?.score || {}) },
    // Stars on the finish screen: one for finishing, one for gelato, one for careful driving
    // (only hard knocks count as bumps, and never in the first seconds after a photo stop).
    starRules: { gelato: 12, bumps: 25 },
    target: null,
    settings: { ...settingsDefault, ...(saved.settings || {}), ...(saved.settings?.langChosen ? {} : { lang: 'en' }) },
    start: { x: startAnchor.x + START.offsetX, z: startAnchor.z + START.offsetZ, heading: START.heading },
    currentStop: null,
    boostTime: 0,
    tourTime: saved.tourTime || 0,
    finishedOnce: !!saved.finishedOnce,

    get visitedCount() { return stops.filter((s) => s.visited).length; },
    get boosting() { return game.boostTime > 0; },

    setState(to) {
      if (to === game.state) return;
      const from = game.state;
      game.state = to;
      ctx.events.emit('state', { from, to });
    },

    // Called by the UI "Play" button (or automatically without a UI).
    begin() {
      const c = ctx.cart;
      if (c && !game._placed) {
        const hot = hotData?.cart;
        if (hot) c.reset(hot.x, hot.z, hot.heading);
        else c.reset(game.start.x, game.start.z, game.start.heading);
        game._placed = true;
      }
      ctx.camRig.setMode('chase', { snap: true });
      game.setState('playing');
    },

    pause(on = true) {
      if (on && game.state === 'playing') game.setState('paused');
      else if (!on && game.state === 'paused') game.setState('playing');
    },

    // The stop the guide points at. It stays the same until it is visited, then the closest
    // unvisited stop (by route length along the avenues when the guide is loaded) takes over.
    nextStop() {
      if (game.target && !game.target.visited) return game.target;
      const px = ctx.cart?.position.x ?? game.start.x, pz = ctx.cart?.position.z ?? game.start.z;
      const route = ctx.modules.guide?.findRoute;
      let best = null, bd = Infinity;
      for (const s of stops) {
        if (s.visited) continue;
        let d = Math.hypot(s.spotX - px, s.spotZ - pz);
        if (route && d < bd * 1.6) {
          const pts = route(px, pz, s.spotX, s.spotZ);
          if (pts && pts.length > 1) {
            d = 0;
            for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          }
        }
        if (d < bd) { bd = d; best = s; }
      }
      game.target = best;
      return best;
    },

    reachStop(stop) {
      stop.visited = true;
      game._autoClose = 0;
      game.currentStop = stop;
      const c = ctx.cart || { position: { x: stop.spotX, y: 0, z: stop.spotZ } };
      // Landmarks with an authored postcard view park the cart on its spot for the photo.
      if (stop.view && ctx.cart) ctx.cart.reset(stop.spotX, stop.spotZ, stop.view.heading);
      c.freeze?.(true);
      ctx.camRig.setMode('photo', {
        cartX: c.position.x, cartZ: c.position.z, cartY: c.position.y,
        lmX: stop.x, lmZ: stop.z, lmY: 8, t0: ctx.time, view: stop.view || null,
      });
      game.setState('stop');
      ctx.events.emit('stopReached', { id: stop.id, index: game.visitedCount, total: stops.length });
      const medal = MEDALS.find((m) => m.at === game.visitedCount);
      if (medal) ctx.events.emit('medal', { id: medal.id, count: game.visitedCount });
      game.persist();
    },

    // Called by the UI when the photo card is closed.
    closeStop() {
      if (game.state !== 'stop') return;
      const stop = game.currentStop;
      game.currentStop = null;
      game.turnTowardNext(stop);
      ctx.cart?.freeze?.(false);
      ctx.camRig.setMode('chase', { snap: true });
      // auto-gas waits for the player's first touch so nobody drives into the monument
      game._holdAuto = true;
      game._closedAt = ctx.time;
      ctx.events.emit('stopClosed', { id: stop?.id });
      if (game.visitedCount === stops.length && !game._celebrated) {
        game._celebrated = true;
        game.finishedOnce = true;
        game.persist();
        game.setState('finished');
        ctx.events.emit('tourComplete', {});
      } else {
        game.setState('playing');
      }
    },

    // Point the cart along the route to the next stop (or away from the landmark it just visited).
    turnTowardNext(stop) {
      const c = ctx.cart;
      if (!c) return;
      const x = c.position.x, z = c.position.z;
      let hx = x - (stop?.x ?? x), hz = z - (stop?.z ?? z + 1);
      const next = game.nextStop();
      const pts = next && ctx.modules.guide?.findRoute?.(x, z, next.spotX, next.spotZ);
      if (pts) {
        const ahead = pts.find((p) => Math.hypot(p[0] - x, p[1] - z) > 6) || pts[pts.length - 1];
        if (ahead) { hx = ahead[0] - x; hz = ahead[1] - z; }
      } else if (next) { hx = next.spotX - x; hz = next.spotZ - z; } else {
        // tour finished: drive off along the avenue, in the direction leading away from the landmark
        const np = T.nearestPath(x, z);
        if (np) {
          const s = np.dirX * hx + np.dirZ * hz >= 0 ? 1 : -1;
          hx = np.dirX * s; hz = np.dirZ * s;
        }
      }
      if (Math.hypot(hx, hz) > 0.01) c.reset(x, z, Math.atan2(hx, hz));
    },

    // From the 'finished' screen back to free driving.
    keepDriving() { if (game.state === 'finished') game.setState('playing'); },

    resetTour() {
      for (const s of stops) s.visited = false;
      game.score.gelato = 0; game.score.bumps = 0; game.score.pinecones = 0;
      game.tourTime = 0; game._celebrated = false; game.target = null;
      game.persist();
      ctx.events.emit('tourReset', {});
    },

    setSettings(patch) {
      if (patch.lang && patch.lang !== game.settings.lang) patch = { ...patch, langChosen: true };
      Object.assign(game.settings, patch);
      game.persist();
      ctx.events.emit('settings', { ...game.settings });
    },

    // What is saved between visits (also handed to a hot update when storage is blocked).
    saveData() {
      return {
        visited: stops.filter((s) => s.visited).map((s) => s.id),
        gelato: game.score.gelato, pinecones: game.score.pinecones,
        tourTime: game.tourTime, finishedOnce: game.finishedOnce, settings: game.settings,
      };
    },
    persist() { save(game.saveData()); },

    stars() {
      return 1 + (game.score.gelato >= game.starRules.gelato ? 1 : 0) + (game.score.bumps <= game.starRules.bumps ? 1 : 0);
    },

    snapshot() {
      const c = ctx.cart;
      return {
        save: game.saveData(), score: { ...game.score },
        cart: c && game._placed ? { x: c.position.x, z: c.position.z, heading: c.heading } : null,
      };
    },

    update(dt) {
      // merge inputs
      const k = ctx.keyInput, t = ctx.touchInput || {};
      const inp = ctx.input;
      inp.steer = clamp((k.steer || 0) + (t.steer || 0), -1, 1);
      inp.throttle = clamp(Math.max(k.throttle || 0, t.throttle || 0), 0, 1);
      inp.brake = clamp(Math.max(k.brake || 0, t.brake || 0), 0, 1);
      const honk = !!(k.honk || t.honk);
      if (game._holdAuto && (inp.steer !== 0 || inp.throttle > 0 || inp.brake > 0)) game._holdAuto = false;
      if (game.state === 'playing' && game.settings.easy && inp.brake === 0 && !game._holdAuto) {
        // auto-gas, eased off while steering hard so corners and U-turns stay tight
        inp.throttle = Math.max(inp.throttle, Math.abs(inp.steer) > 0.5 ? 0.3 : 0.6);
      }
      if (game.state !== 'playing') { inp.throttle = 0; inp.brake = 0; inp.steer = 0; }
      if (honk && !game._honkHeld && game.state === 'playing') ctx.events.emit('honk', {});
      game._honkHeld = honk;
      inp.honk = honk;

      if (game.boostTime > 0) {
        game.boostTime -= dt;
        if (game.boostTime <= 0) ctx.events.emit('boost', { on: false });
      }
      if (game.state === 'playing') {
        game.tourTime += dt;
        const c = ctx.cart;
        if (c) {
          for (const s of stops) {
            if (s.visited) continue;
            const px = c.position.x, pz = c.position.z;
            const ds = Math.hypot(s.spotX - px, s.spotZ - pz);
            let near = ds < 10;
            if (!near && Math.abs(s.x - px) < 90 && Math.abs(s.z - pz) < 90) {
              near = s.footprint
                ? pointInRing(px, pz, s.footprint) || distToRingEdge(px, pz, s.footprint) < 9
                : Math.hypot(s.x - px, s.z - pz) < 12;
            }
            if (near) { game.reachStop(s); break; }
          }
        }
      } else if (game.state === 'stop' && !ctx.modules.ui) {
        game._autoClose = (game._autoClose || 0) + dt;
        if (game._autoClose > 4) { game._autoClose = 0; game.closeStop(); }
      }
    },
  };

  ctx.events.on('collect', (e) => {
    if (e.kind === 'gelato') {
      game.score.gelato += e.value || 1;
      if (game.score.gelato % 5 === 0) {
        game.boostTime = 4;
        ctx.events.emit('boost', { on: true });
      }
    } else if (e.kind === 'pinecone') game.score.pinecones += 1;
    game.persist();
  });
  ctx.events.on('bump', (e) => {
    if ((e.strength || 0) > 0.6 && ctx.time - (game._closedAt ?? -99) > 3) game.score.bumps++;
  });

  return game;
}
