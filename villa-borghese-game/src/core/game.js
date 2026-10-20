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
    score: { gelato: saved.gelato || 0, coins: 0, pinecones: saved.pinecones || 0, bumps: 0, ...(hotData?.score || {}) },
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

    // Nearest unvisited stop from the cart (or from the start when there is no cart).
    nextStop() {
      const px = ctx.cart?.position.x ?? game.start.x, pz = ctx.cart?.position.z ?? game.start.z;
      let best = null, bd = Infinity;
      for (const s of stops) {
        if (s.visited) continue;
        const d = Math.hypot(s.spotX - px, s.spotZ - pz);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },

    reachStop(stop) {
      stop.visited = true;
      game._autoClose = 0;
      game.currentStop = stop;
      const c = ctx.cart || { position: { x: stop.spotX, y: 0, z: stop.spotZ } };
      c.freeze?.(true);
      ctx.camRig.setMode('photo', {
        cartX: c.position.x, cartZ: c.position.z, cartY: c.position.y,
        lmX: stop.x, lmZ: stop.z, lmY: 8, t0: ctx.time,
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
      ctx.cart?.freeze?.(false);
      ctx.camRig.setMode('chase');
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

    // From the 'finished' screen back to free driving.
    keepDriving() { if (game.state === 'finished') game.setState('playing'); },

    resetTour() {
      for (const s of stops) s.visited = false;
      game.score.gelato = 0; game.score.bumps = 0; game.score.pinecones = 0;
      game.tourTime = 0; game._celebrated = false;
      game.persist();
      ctx.events.emit('tourReset', {});
    },

    setSettings(patch) {
      if (patch.lang && patch.lang !== game.settings.lang) patch = { ...patch, langChosen: true };
      Object.assign(game.settings, patch);
      game.persist();
      ctx.events.emit('settings', { ...game.settings });
    },

    persist() {
      save({
        visited: stops.filter((s) => s.visited).map((s) => s.id),
        gelato: game.score.gelato, pinecones: game.score.pinecones,
        tourTime: game.tourTime, finishedOnce: game.finishedOnce, settings: game.settings,
      });
    },

    // Stars for the end screen: careful driving and gelato hunting.
    stars() {
      let s = 1;
      if (game.score.bumps < 12) s++;
      if (game.score.gelato >= 15) s++;
      return s;
    },

    snapshot() {
      const c = ctx.cart;
      return {
        save: load(), score: { ...game.score },
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
      if (game.state === 'playing' && game.settings.easy && inp.brake === 0) inp.throttle = Math.max(inp.throttle, 0.6);
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
    else if (e.kind === 'coin') game.score.coins += e.value || 1;
    game.persist();
  });
  ctx.events.on('bump', (e) => { if ((e.strength || 0) > 0.25) game.score.bumps++; });

  return game;
}
