// People and horses walking the park's paths: walkers (some with a dog or a child), joggers,
// cyclists, risciò surreys and a pair of mounted Carabinieri. Groups live only within ~130 m
// of the cart and are recycled ahead of it. Everyone reacts comically: they hop aside when
// the cart rushes at them, spin with arms up ("Mamma mia!") when touched, wave on a honk.
// Balloon sellers and the football kids are "static" agents sharing the same reactions.
import { pack } from './rig.js';
import { SPR } from './fx.js';
import { angleLerp, clamp } from '../../core/geo.js';

const TOPS = ['#e94f4f', '#f2c14e', '#4f9de9', '#6cc070', '#f28fb1', '#ffffff', '#2f4b7c', '#ff8c42', '#9b6dd6', '#3fb8af', '#f4e9d8', '#d64545', '#1f7a8c', '#ffd166', '#a9c9e8'];
const BOTTOMS = ['#2f3542', '#3d5a80', '#c9b79c', '#556b2f', '#1e1e24', '#7d8597', '#e9e2d0', '#5a4632', '#6f8fb5'];
const SKIRTS = ['#e85d75', '#4a6fa5', '#f2c14e', '#2f3542', '#6cc070', '#9b6dd6', '#f4a261', '#c9934a', '#ffffff'];
const SKINS = ['#f1c7a5', '#e2a983', '#c68863', '#8d5a3b', '#f5d3b8', '#b07850', '#ecbe9c'];
const HAIRS = ['#2b1d14', '#5a3b26', '#8a5a32', '#d8b46a', '#1a1a1a', '#a4a4a4', '#c46a3a', '#e8d3a0', '#3b261b'];
const SHOES = ['#f2f2f2', '#2b2b2b', '#c0392b', '#3a6fd8', '#8a5a32', '#f2f2f2'];
const SPORT = ['#ff4d6d', '#3ae374', '#18dcff', '#ffaf40', '#f8f32b', '#ff7ab6'];
const DOGS = [['#d9a35b', '#b9823f', '#d9a35b'], ['#2b2622', '#2b2622', '#2b2622'], ['#efe8dc', '#8a5a32', '#efe8dc'], ['#8a5a32', '#5e3b20', '#8a5a32'], ['#c9c3b8', '#7a746b', '#ffffff']];
const COLLARS = ['#e63946', '#1d7af3', '#ffb703', '#2a9d8f'];
const CANOPIES = ['#e63946', '#f4a91f', '#1d7af3', '#2a9d8f', '#e85d9e'];
const BIKES = ['#e63946', '#1d7af3', '#2a9d8f', '#f4f1ea', '#2b2b2e', '#f2c14e', '#7fb069'];

const SAY = {
  bump: ['Mamma mia!', 'Ops!', 'Ahi ahi!', 'Piano piano!', 'Che botta!'],
  wave: ['Ciao!', 'Ciao bambini!', 'Ciao ciao!', 'Buongiorno!'],
  dodge: ['Attenzione!', 'Ops!', 'Uh-oh!'],
};

// kind: speed range (m/s), walk swing (rad), stride (m per half step), lane (fraction of half width),
// radius (m), edge kinds allowed
const KIND = {
  walker: { speed: [1.0, 1.4], swing: 0.5, stride: 0.72, lane: [0.55, 0.85], r: 0.4 },
  jogger: { speed: [2.8, 3.5], swing: 0.95, stride: 1.05, lane: [0.45, 0.8], r: 0.4 },
  kid: { speed: [1.0, 1.4], swing: 0.7, stride: 0.45, lane: [0.55, 0.85], r: 0.3 },
  dog: { speed: [1.0, 1.4], swing: 0.6, stride: 0.32, lane: [0.55, 0.85], r: 0.35 },
  cyclist: { speed: [4.2, 5.6], swing: 0.55, stride: 2.4, lane: [0.38, 0.55], r: 0.6, edges: /viale|footway|bridge/ },
  risciò: { speed: [2.3, 3.0], swing: 0.65, stride: 1.6, lane: [0.46, 0.52], r: 0.95, edges: /viale|bridge/ },
  horse: { speed: [1.25, 1.45], swing: 0.4, stride: 0.95, lane: [0.52, 0.58], r: 0.85, edges: /viale|bridge/ },
};

export function createPeople(env) {
  const { ctx, graph, crowds, fx } = env;
  const T = ctx.terrain;
  const rnd = ctx.rng('actors-people');
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (r) => r[0] + (r[1] - r[0]) * rnd();
  const lowQ = ctx.quality.tier === 'low';
  const GROUPS = lowQ ? 12 : ctx.quality.tier === 'med' ? 17 : 22;
  const RANGE = 132;

  const agents = [];
  const groups = [];

  function personPal(female, sporty) {
    const top = sporty ? pick(SPORT) : pick(TOPS);
    const skin = pick(SKINS);
    const bottom = female ? pick(SKIRTS) : pick(BOTTOMS);
    const shorts = !female && (sporty || rnd() < 0.3);
    const lower = female ? (rnd() < 0.7 ? skin : pick(['#1e1e24', '#3d5a80'])) : shorts ? skin : bottom;
    const bald = !female && rnd() < 0.12;
    const hair = bald ? skin : pick(HAIRS);
    return { p: [pack(top), pack(bottom), pack(skin), pack(hair)], a: pack(sporty ? pick(['#f2f2f2', '#ff4d6d', '#18dcff']) : pick(SHOES)), l: pack(lower) };
  }

  function makeAgent(kind, opts = {}) {
    const K = KIND[kind];
    const a = {
      kind, K, crowd: null, pal: null, s: 1, r: K.r,
      e: null, from: -1, t: 0, side: 1, laneFrac: range(K.lane), baseSpeed: range(K.speed), speed: 0,
      x: 0, z: 0, y: 0, h: 0, tx: 0, tz: 0, phase: rnd() * 6.28, raiseR: 0, raiseL: 0,
      leader: null, offFwd: 0, offSide: 0,
      react: null, ox: 0, oz: 0, pvx: 0, pvz: 0, hop: 0, spin: 0, rx: 0, rz: 0, glow: 0,
      cool: 0, pause: 0, dodged: false, lookH: null, fade: 0, active: false, static: false, kickT: 0,
      ...opts,
    };
    agents.push(a);
    return a;
  }

  function dress(a) {
    const k = a.kind;
    if (k === 'walker' || k === 'jogger' || k === 'kid') {
      const female = rnd() < 0.5;
      a.crowd = female ? crowds.female : crowds.male;
      a.pal = personPal(female, k === 'jogger');
      a.s = k === 'kid' ? 0.58 + rnd() * 0.08 : 0.94 + rnd() * 0.1;
    } else if (k === 'dog') {
      const d = pick(DOGS);
      a.crowd = crowds.dog;
      a.pal = { p: [pack(d[0]), 0, 0, pack(d[1])], a: pack(pick(COLLARS)), l: pack(d[2]) };
      a.s = 0.8 + rnd() * 0.45;
    } else if (k === 'cyclist') {
      const p = personPal(false, rnd() < 0.4);
      p.a = pack(pick(BIKES));
      p.l = p.p[2];
      a.crowd = crowds.cyclist;
      a.pal = p;
      a.s = 0.95 + rnd() * 0.08;
    } else if (k === 'risciò') {
      a.crowd = crowds.risciò;
      a.pal = { p: [pack(pick(TOPS)), pack(pick(TOPS)), pack(pick(SKINS)), pack(pick(HAIRS))], a: pack(pick(CANOPIES)), l: pack(pick(SKINS)) };
    } else if (k === 'horse') {
      a.crowd = crowds.horse;
      const coat = pick(['#5a3420', '#4a2c1c', '#6b4026', '#2e221c']);
      a.pal = { p: [pack(coat), 0, pack(pick(SKINS)), pack('#17110d')], a: 0, l: 0 };
    }
  }

  // --- groups ---------------------------------------------------------------------------------
  function newGroup(type) {
    const g = { type, members: [] };
    const lead = (kind) => { const a = makeAgent(kind); g.members.push(a); g.lead = a; return a; };
    const follow = (kind, offFwd, offSide) => { const a = makeAgent(kind, { offFwd, offSide }); a.leader = g.lead; g.members.push(a); return a; };
    if (type === 'dog') { lead('walker'); follow('dog', 1.0, 0.55); }
    else if (type === 'family') { lead('walker'); follow('kid', 0.1, -0.62); if (rnd() < 0.4) follow('kid', -0.45, 0.6); }
    else if (type === 'couple') { lead('walker'); follow('walker', 0, -0.68); }
    else if (type === 'horse') { lead('horse'); follow('horse', -0.5, -1.4); }
    else lead(type);
    groups.push(g);
    return g;
  }
  const TYPES = [['walker', 30], ['couple', 10], ['dog', 16], ['family', 12], ['jogger', 15], ['cyclist', 11], ['risciò', 6]];
  const totalW = TYPES.reduce((s, t) => s + t[1], 0);
  for (let i = 0; i < GROUPS; i++) {
    let r = rnd() * totalW, type = 'walker';
    for (const [t, w] of TYPES) { if ((r -= w) < 0) { type = t; break; } }
    newGroup(type);
  }
  const patrol = newGroup('horse');

  function edgeOk(K, e) { return !K.edges || K.edges.test(e.kind); }

  function placeOnEdge(a, e, t, fromA) {
    a.e = e;
    a.from = fromA ? e.a : e.b;
    a.t = fromA ? t : e.len - t;
  }

  function edgePoint(a, out) {
    const e = a.e, A = graph.nodes[a.from];
    const dir = a.from === e.a ? 1 : -1;
    const fx = e.dx * dir, fz = e.dz * dir;
    const lane = a.side * a.laneFrac * Math.max(0.6, e.w / 2 - 0.3);
    out.x = A.x + fx * a.t - fz * lane;
    out.z = A.z + fz * a.t + fx * lane;
    out.fx = fx; out.fz = fz;
    return out;
  }
  const _pt = { x: 0, z: 0, fx: 0, fz: 0 };

  function spawnGroup(g, initial) {
    const c = env.cart;
    const K = g.lead.K;
    // keep respawns out of the camera's near view so nobody pops up in front of the cart
    const hidden = (p) => {
      const ahead = ((p.x - c.x) * c.fx + (p.z - c.z) * c.fz) / (p.d || 1);
      return ahead < 0.35 || p.d > 100;
    };
    const hit = graph.randomNear(c.x, c.z, initial ? 14 : 60, RANGE - 8, rnd, (e) => edgeOk(K, e), initial ? null : hidden);
    if (!hit) { for (const m of g.members) m.active = false; return false; }
    const lead = g.lead;
    placeOnEdge(lead, hit.e, hit.t, rnd() < 0.5);
    lead.side = /risciò|cyclist|horse/.test(lead.kind) ? 1 : rnd() < 0.5 ? 1 : -1;
    for (const m of g.members) {
      dress(m);
      m.active = true;
      m.fade = initial ? 1 : 0;
      m.react = null; m.ox = m.oz = m.pvx = m.pvz = 0; m.hop = 0; m.spin = 0; m.pause = 0; m.cool = 0;
      m.raiseR = m.raiseL = 0; m.glow = 0; m.rx = 0; m.rz = 0;
      m.speed = lead.baseSpeed;
      if (m !== lead) { m.baseSpeed = lead.baseSpeed; m.side = lead.side; m.laneFrac = lead.laneFrac; }
    }
    edgePoint(lead, _pt);
    for (const m of g.members) {
      const rx = -_pt.fz, rz = _pt.fx;
      m.x = _pt.x + _pt.fx * m.offFwd + rx * m.offSide * lead.side;
      m.z = _pt.z + _pt.fz * m.offFwd + rz * m.offSide * lead.side;
      m.h = Math.atan2(_pt.fx, _pt.fz);
      m.y = T.heightAt(m.x, m.z);
    }
    return true;
  }

  function nextEdge(a) {
    const e = a.e;
    const at = graph.other(e, a.from);
    const opts = graph.nodes[at].e.filter((k) => k !== e.i && edgeOk(a.K, graph.edges[k]));
    if (!opts.length) { a.from = at; a.t = 0; return; } // dead end: turn around
    let ne = graph.edges[opts[0]];
    if (opts.length > 1) {
      // mostly keep going straight-ish
      const fx = graph.nodes[at].x - graph.nodes[a.from].x, fz = graph.nodes[at].z - graph.nodes[a.from].z;
      const L = Math.hypot(fx, fz) || 1;
      let best = -Infinity;
      for (const k of opts) {
        const c = graph.edges[k];
        const d = c.a === at ? 1 : -1;
        const score = ((c.dx * d * fx + c.dz * d * fz) / L) + rnd() * 1.6;
        if (score > best) { best = score; ne = c; }
      }
    }
    a.e = ne;
    a.from = at;
    a.t = 0;
  }

  // --- reactions ------------------------------------------------------------------------------
  const isPerson = (a) => a.kind === 'walker' || a.kind === 'jogger' || a.kind === 'kid';

  function say(a, list, dur = 1.6) {
    const top = a.kind === 'horse' ? 3.1 : a.kind === 'risciò' ? 2.6 : a.kind === 'dog' ? 1.2 : 2.15 * a.s;
    fx.bubble(typeof list === 'string' ? list : pick(list), a.x + a.ox, a.y + top + 0.35, a.z + a.oz, dur);
  }

  function bumped(a, circle) {
    const c = env.cart;
    let nx = a.x + a.ox - circle.x, nz = a.z + a.oz - circle.z;
    const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    const sp = Math.abs(c.speed);
    a.react = { type: 'bumped', t: 0, dur: a.kind === 'horse' ? 2.0 : 1.5 };
    a.cool = 2.5;
    a.glow = 0.5;
    a.pause = a.kind === 'horse' ? 2.2 : 1.4;
    if (a.kind !== 'horse' && !a.solid) {
      // thrown sideways out of the cart's way (the push decays at 5/s, so displacement = v / 5)
      const side = (a.x + a.ox - c.x) * -c.fz + (a.z + a.oz - c.z) * c.fx >= 0 ? 1 : -1;
      const disp = (a.kind === 'risciò' ? 1.2 : 2.4) + a.r;
      a.pvx = (-c.fz * side * disp + c.fx * 0.5) * 5;
      a.pvz = (c.fx * side * disp + c.fz * 0.5) * 5;
    }
    const kind = a.kind === 'horse' ? 'horse' : a.kind === 'dog' ? 'dog' : 'person';
    if (!a.solid) env.bumpCart(kind, clamp(sp / 22, 0.08, 0.45), a.x, a.z, -nx, -nz);
    if (a.kind === 'horse') { say(a, 'Piano piano!', 2); env.emit('animal', { kind: 'horse', x: a.x, z: a.z }); }
    else if (a.kind === 'dog') { say(a, 'Bau bau!'); env.emit('animal', { kind: 'dog', x: a.x, z: a.z }); }
    else say(a, SAY.bump);
    fx.burst(a.x, a.y + 1.2 * a.s, a.z, { count: 10, colors: ['#ffe066', '#ffffff', '#ffb3c6'], speed: 3, up: 3, life: 0.7, size: 0.35, sprite: SPR.STAR, gravity: 5 });
  }

  function dodge(a, side) {
    const c = env.cart;
    const rx = -c.fz, rz = c.fx;
    const mag = 2.6 + a.r;
    a.react = { type: 'dodge', t: 0, dur: 0.5 };
    a.pvx = rx * side * mag / 0.45; a.pvz = rz * side * mag / 0.45;
    a.cool = 0.8;
    if (rnd() < 0.3) say(a, SAY.dodge, 1.1);
  }

  function onHonk() {
    const c = env.cart;
    let closest = null, cd = Infinity;
    let neigh = false;
    for (const a of agents) {
      if (!a.active || a.react?.type === 'bumped') continue;
      const d = Math.hypot(a.x - c.x, a.z - c.z);
      if (d > 26) continue;
      a.react = { type: 'wave', t: 0, dur: 2.0 + rnd() * 0.6 };
      a.pause = a.kind === 'cyclist' ? 0 : 2.0;
      a.lookH = Math.atan2(c.x - a.x, c.z - a.z);
      if (a.kind === 'dog' && rnd() < 0.6) { say(a, 'Bau bau!', 1.2); env.emit('animal', { kind: 'dog', x: a.x, z: a.z }); }
      if (a.kind === 'horse' && !neigh) { neigh = true; env.emit('animal', { kind: 'horse', x: a.x, z: a.z }); }
      if (a.kind === 'cyclist' && rnd() < 0.5) say(a, 'Drin drin!', 1.3);
      if ((isPerson(a) || a.kind === 'risciò' || a.seller) && d < cd) { cd = d; closest = a; }
    }
    if (closest) say(closest, closest.seller ? 'Palloncini!' : SAY.wave, 1.8);
  }
  ctx.events.on('honk', onHonk);

  // --- update ---------------------------------------------------------------------------------
  function updateAgent(a, dt, t) {
    const c = env.cart;
    a.cool -= dt;
    a.pause -= dt;
    a.glow = Math.max(0, a.glow - dt * 1.2);
    a.fade = Math.min(1, a.fade + dt * 2.5);
    const hurry = a.react?.type === 'dodge' ? 1.6 : 1;
    const want = a.pause > 0 ? 0 : a.baseSpeed * hurry;
    a.speed += (want - a.speed) * Math.min(1, dt * (a.pause > 0 ? 6 : 2));

    // move
    if (a.static) {
      a.tx = a.x0; a.tz = a.z0;
    } else if (!a.leader) {
      a.t += a.speed * dt;
      let guard = 0;
      while (a.t > a.e.len && guard++ < 4) { const over = a.t - a.e.len; nextEdge(a); a.t = over; }
      edgePoint(a, _pt);
      a.tx = _pt.x; a.tz = _pt.z;
    } else {
      const L = a.leader;
      const fx = Math.sin(L.h), fz = Math.cos(L.h);
      a.tx = L.x + fx * a.offFwd - fz * a.offSide * L.side;
      a.tz = L.z + fz * a.offFwd + fx * a.offSide * L.side;
      a.speed = L.speed;
    }
    // push from reactions, then drift back to the lane
    a.ox += a.pvx * dt; a.oz += a.pvz * dt;
    const damp = Math.exp(-dt * 5);
    a.pvx *= damp; a.pvz *= damp;
    if (!a.react) { const back = Math.exp(-dt * 0.6); a.ox *= back; a.oz *= back; }
    const k = a.static ? 1 : Math.min(1, dt * (a.leader ? 6 : 8));
    const px = a.x, pz = a.z;
    a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k;
    const mvx = a.x - px, mvz = a.z - pz;
    let wantH = a.h;
    if (a.lookH !== null && a.react?.type === 'wave') wantH = a.lookH;
    else if (a.static) wantH = a.h0 ?? a.h;
    else if (mvx * mvx + mvz * mvz > 1e-6 * dt) wantH = Math.atan2(mvx, mvz);
    a.h = angleLerp(a.h, wantH, Math.min(1, dt * 6));
    const gx = a.x + a.ox, gz = a.z + a.oz;
    a.y = T.heightAt(gx, gz);
    a.phase += (a.speed / a.K.stride) * Math.PI * dt;

    // reactions
    a.hop = 0; a.spin = 0; a.rx = 0; a.rz = 0;
    let raiseR = 0, raiseL = 0;
    const r = a.react;
    if (r) {
      r.t += dt;
      const f = r.t / r.dur;
      if (r.type === 'dodge') {
        if (a.kind !== 'cyclist' && a.kind !== 'risciò') a.hop = Math.sin(Math.min(1, f) * Math.PI) * 0.45;
        if (a.kind === 'cyclist') a.rz = Math.sin(Math.min(1, f) * Math.PI) * 0.35 * Math.sign(a.pvx * Math.cos(a.h) - a.pvz * Math.sin(a.h) || 1);
        raiseR = raiseL = 1.1 * Math.sin(Math.min(1, f) * Math.PI);
      } else if (r.type === 'bumped') {
        if (a.kind === 'horse') {
          const up = Math.sin(Math.min(1, r.t / 1.2) * Math.PI);
          a.rx = -0.5 * up;
          a.hop = 0.55 * up;
          raiseR = 1.6 * up;
        } else if (a.kind === 'risciò') {
          a.rz = Math.sin(r.t * 18) * 0.08 * (1 - f);
          a.hop = Math.abs(Math.sin(r.t * 9)) * 0.12 * (1 - f);
          raiseR = raiseL = 2.6 + Math.sin(t * 14) * 0.35;
        } else {
          const ft = Math.min(1, r.t / 0.75);
          a.hop = Math.sin(ft * Math.PI) * (a.kind === 'dog' ? 0.6 : 0.95);
          a.spin = ft * Math.PI * 2;
          raiseR = raiseL = 2.7 + Math.sin(t * 16) * 0.35;
          // dizzy stars
          if (r.t > 0.6 && r.t < r.dur) {
            const hy = a.y + (a.kind === 'dog' ? 0.9 : 2.0 * a.s);
            for (let i = 0; i < 3; i++) {
              const ang = t * 5 + (i * Math.PI * 2) / 3;
              fx.sparkle(gx + Math.cos(ang) * 0.35, hy, gz + Math.sin(ang) * 0.35, 0.28, '#ffe14d', 1 - f * 0.5);
            }
          }
        }
      } else if (r.type === 'wave') {
        raiseR = 2.5 + Math.sin(t * 13) * 0.4;
        if (a.kind === 'risciò') raiseL = 2.5 + Math.sin(t * 13 + 1) * 0.4;
        if (a.kind === 'dog') a.hop = Math.abs(Math.sin(r.t * 7)) * 0.25 * (1 - f);
      }
      if (r.t >= r.dur) { a.react = null; a.lookH = null; a.dodged = false; }
    }
    if (a.kickT > 0) a.kickT -= dt;
    a.raiseR = raiseR; a.raiseL = raiseL || a.holdL || 0;

    // cart interaction
    if (!env.playing || a.fade < 1) return;
    const dx = gx - c.x, dz = gz - c.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > 400) { a.dodged = false; return; }
    for (const cc of c.circles) {
      const ex = gx - cc.x, ez = gz - cc.z, rr = cc.r + a.r, e2 = ex * ex + ez * ez;
      if (e2 >= rr * rr) continue;
      // (the cart has already been slowed by a solid agent's collider, hence the lower bar)
      if (Math.abs(c.speed) > (a.solid ? 0.5 : 1.5) && a.cool <= 0) { bumped(a, cc); return; }
      if (a.solid) continue;
      // a parked cart: just step around it
      const L = Math.sqrt(e2) || 1;
      a.ox += (ex / L) * (rr - L); a.oz += (ez / L) * (rr - L);
    }
    // hop aside when the cart rushes at them (most of the time)
    if (!a.react && !a.dodged && !a.solid && Math.abs(c.speed) > 4) {
      const fwd = dx * c.fx + dz * c.fz, lat = dx * -c.fz + dz * c.fx;
      if (fwd > 0.5 && fwd < 3 + Math.abs(c.speed) * 0.7 && Math.abs(lat) < a.r + 1.6) {
        a.dodged = true;
        if (a.kind === 'risciò' || a.kind === 'horse') { a.pause = 1.6; a.react = { type: 'dodge', t: 0, dur: 0.8 }; }
        else if (rnd() < 0.85) dodge(a, Math.abs(lat) < 0.25 ? a.side : Math.sign(lat));
      }
    }
  }

  function render(a, t) {
    const s = a.s * (a.fade < 1 ? 0.2 + 0.8 * a.fade : 1);
    const gx = a.x + a.ox, gz = a.z + a.oz;
    let phase = a.phase, swing = a.K.swing * clamp(a.speed / (a.baseSpeed || 1), 0, 1.2);
    if (a.kickT > 0) { phase = Math.PI * (0.5 - (a.kickT / 0.35) * 1.4); swing = 1.0; }
    if (a.kind === 'cyclist' && a.speed > 0.3) swing = a.K.swing;
    let y = a.y + a.hop;
    let rx = a.rx, rz = a.rz;
    if (a.kind === 'jogger') { rx += 0.1; y += Math.abs(Math.cos(a.phase)) * 0.07; }
    if (isPerson(a) && a.speed > 0.2) y += Math.abs(Math.cos(a.phase)) * 0.03;
    if (a.kind === 'horse') y += Math.abs(Math.sin(a.phase)) * 0.04;
    a.crowd.push(gx, y, gz, a.h + a.spin, s, a.pal, [phase, swing, a.raiseR, a.raiseL], a.glow, rx, rz);
    const sr = a.kind === 'horse' ? 1.5 : a.kind === 'risciò' ? 1.5 : a.kind === 'cyclist' ? 0.8 : a.kind === 'dog' ? 0.45 * a.s : 0.5 * a.s;
    fx.shadow(gx, a.y, gz, sr * (1 - Math.min(0.5, a.hop * 0.4)));
    if (a.kind === 'dog' && a.leader && a.leader.active) {
      // hand on the dog's side: the right hand is local -x, i.e. world (-cos h, sin h)
      const L = a.leader, lx = L.x + L.ox, lz = L.z + L.oz;
      const hand = a.offSide * L.side > 0 ? -0.27 * L.s : 0.27 * L.s;
      const hx = lx + Math.cos(L.h) * hand, hz = lz - Math.sin(L.h) * hand;
      fx.leash(hx, L.y + L.hop + 0.88 * L.s, hz, gx + Math.sin(a.h) * 0.3 * a.s, y + 0.6 * a.s, gz + Math.cos(a.h) * 0.3 * a.s);
    }
  }

  // --- static agents (balloon sellers, football kids) ------------------------------------------
  function addStatic(def) {
    const a = makeAgent(def.kind || 'walker', { static: true, active: true, fade: 1, x0: def.x, z0: def.z, x: def.x, z: def.z, h: def.h, h0: def.h, seller: !!def.seller });
    dress(a);
    if (def.s) a.s = def.s;
    a.baseSpeed = 0; a.speed = 0;
    a.y = T.heightAt(def.x, def.z);
    return a;
  }
  function removeStatic(a) {
    const i = agents.indexOf(a);
    if (i >= 0) agents.splice(i, 1);
  }

  let first = true;
  return {
    agents, addStatic, removeStatic,
    update(dt, t) {
      const c = env.cart;
      if (first) {
        first = false;
        for (const g of groups) spawnGroup(g, true);
      }
      // recycle groups that fell far behind (a couple per frame at most)
      let budget = 2;
      for (const g of groups) {
        const L = g.lead;
        if (budget > 0 && (!L.active || Math.hypot(L.x - c.x, L.z - c.z) > RANGE + 10)) {
          if (g === patrol) {
            g.wait = (g.wait || 0) + dt;
            if (g.wait < 25 && L.active) continue;
            g.wait = 0;
          }
          budget--;
          spawnGroup(g, false);
        }
      }
      for (const a of agents) {
        if (!a.active) continue;
        if (a.static && Math.hypot(a.x - c.x, a.z - c.z) > RANGE + 30) continue;
        if (!a.leader) updateAgent(a, dt, t);
      }
      for (const a of agents) if (a.active && a.leader) updateAgent(a, dt, t);
      for (const a of agents) {
        if (!a.active) continue;
        if (Math.hypot(a.x - c.x, a.z - c.z) > RANGE + 30) continue;
        render(a, t);
      }
    },
  };
}
