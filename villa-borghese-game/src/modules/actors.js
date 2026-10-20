// Actors: everything that moves or can be collected along the way - gelato and golden pine
// cones, pigeons and ducks, walkers, joggers, dogs, cyclists, risciò surreys, the mounted
// Carabinieri, football kids, roadwork cones, puddles and balloon sellers.
//
// Draw calls: every kind of thing is one dynamic InstancedMesh refilled each frame with only
// what is near the cart (see actors/rig.js), plus one Points for all particles, one instanced
// blob-shadow mesh, one line set for dog leads and two static meshes (roadworks, puddles).
//
// Events emitted: 'collect' {kind: 'gelato' | 'pinecone'}, 'animal' {kind: 'pigeons' | 'ducks' |
// 'horse' | 'dog'}, 'bump' {kind: 'person' | 'dog' | 'horse' | 'ball' | 'cone'}, 'splash'.
import { rigMaterials, Crowd } from './actors/rig.js';
import * as M from './actors/models.js';
import { createFx } from './actors/fx.js';
import { buildGraph, tourRoutes } from './actors/graph.js';
import { createCollectibles } from './actors/collect.js';
import { createAnimals } from './actors/animals.js';
import { createPeople } from './actors/people.js';
import { createObstacles } from './actors/obstacles.js';
import { closestOnSegment } from '../core/geo.js';

export async function create(ctx) {
  const root = new ctx.THREE.Group();
  root.name = 'actors';
  ctx.scene.add(root);
  const mats = rigMaterials();
  const fx = createFx(ctx, root);
  const crowd = (geo, cap, name, mat = mats.flat) => new Crowd(root, geo, mat, cap, name);
  const crowds = {
    male: crowd(M.personMale(), 40, 'peopleM'),
    female: crowd(M.personFemale(), 40, 'peopleF'),
    dog: crowd(M.dog(), 12, 'dogs'),
    cyclist: crowd(M.cyclist(), 10, 'cyclists'),
    risciò: crowd(M.risciò(), 6, 'risciò'),
    horse: crowd(M.mountedCarabiniere(), 2, 'carabinieri'),
    pigeon: crowd(M.pigeon(), 160, 'pigeons'),
    pigeonFly: crowd(M.pigeonFlying(), 160, 'pigeonsFlying'),
    duck: crowd(M.duck(), 12, 'ducks'),
    gelato: crowd(M.gelato(), 150, 'gelato', mats.smooth),
    pinecone: crowd(M.pineCone(), 8, 'pinecones'),
    ball: crowd(M.football(), 10, 'footballs', mats.smooth),
    cone: crowd(M.trafficCone(), 24, 'trafficCones'),
    balloon: crowd(M.balloon(), 24, 'balloons', mats.smooth),
  };
  const crowdList = Object.values(crowds);

  const graph = buildGraph(ctx.MAP, ctx.terrain);
  const routes = tourRoutes(graph, ctx.game);
  // distance to the nearest tour route (cheap: only used while placing things)
  const routeSegs = [];
  for (const r of routes) for (let i = 1; i < r.length; i++) routeSegs.push([r[i - 1][0], r[i - 1][1], r[i][0], r[i][1]]);
  const routeDist = (x, z) => {
    let best = Infinity;
    for (const [ax, az, bx, bz] of routeSegs) {
      if (Math.min(ax, bx) - best > x || Math.max(ax, bx) + best < x || Math.min(az, bz) - best > z || Math.max(az, bz) + best < z) continue;
      best = Math.min(best, Math.sqrt(closestOnSegment(x, z, ax, az, bx, bz).d2));
    }
    return best;
  };

  const cartState = { x: 0, y: 0, z: 0, fx: 0, fz: 1, speed: 0, circles: [] };
  const env = {
    ctx, root, graph, routes, routeDist, crowds, fx, cart: cartState, playing: false, honkNow: false,
    emit: (name, payload) => ctx.events.emit(name, payload),
    // Soft contact with the cart: event for sounds/score, and a gentle push back.
    bumpCart(kind, strength, x, z, nx = 0, nz = 0, push = true) {
      ctx.events.emit('bump', { kind, strength, x, z });
      const cart = ctx.cart;
      if (!push || !cart) return;
      if (typeof cart.bounce === 'function') cart.bounce(nx, nz, strength);
      else cart.speed *= 0.3;
    },
  };

  env.people = createPeople(env);
  const collect = createCollectibles(env);
  const animals = createAnimals(env);
  const obstacles = createObstacles(env);

  let honked = false;
  ctx.events.on('honk', () => { honked = true; });

  function readCart() {
    const c = ctx.cart;
    if (!c) return;
    cartState.x = c.position.x; cartState.y = c.position.y; cartState.z = c.position.z;
    cartState.fx = Math.sin(c.heading); cartState.fz = Math.cos(c.heading);
    cartState.speed = c.speed || 0;
    cartState.circles = c.getHitCircles ? c.getHitCircles() : [{ x: c.position.x, z: c.position.z, r: 1.2 }];
  }

  return {
    root, collect, animals, people: env.people, obstacles, graph, routes,
    update(dt, t) {
      const state = ctx.game.state;
      if (state === 'paused' || state === 'loading') dt = 0;
      readCart();
      env.playing = state === 'playing';
      env.honkNow = honked;
      honked = false;
      fx.begin();
      for (const c of crowdList) c.begin();
      env.people.update(dt, t);
      collect.update(dt, t);
      animals.update(dt, t);
      obstacles.update(dt, t);
      for (const c of crowdList) c.end();
      fx.end(dt);
    },
  };
}
