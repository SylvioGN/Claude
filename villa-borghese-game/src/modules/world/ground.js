// Paints the park's ground onto one big canvas mapped by world x/z (top-down "satellite" view):
// lawns, woods, gravel avenues, plazas, flower beds, the riding ground and the streets around.
// Alongside it paints a one-channel coverage mask (1 = paved: avenues, plazas, streets; 0 = green
// ground) that the terrain shader cuts at 0.5, so the edges between gravel and grass stay crisp up
// close whatever the size of the colour canvas.
// Also makes the small tiled detail texture (grass blades / gravel grain) the terrain shader adds on top.

// World rectangle covered by the ground canvas: the park, Piazza del Popolo and the edges of the
// zoo and Villa Medici. Beyond it the terrain shader draws plain city ground.
export const REGION = { x0: -440, z0: -330, x1: 425, z1: 300 };

// sRGB colours (the canvas is uploaded as an sRGB texture).
const C = {
  asphalt: '#86817a', cobble: '#958b7f', sidewalk: '#aaa193', verge: '#748f45',
  meadow: '#74a345', lawn: '#72a843', lawnLight: '#84bc52', lawnDark: '#609639',
  forest: '#667a3c',
  viale: '#dcc9a0', vialeEdge: '#b9a57c', rut: '#bea984', footway: '#e0cfa8', path: '#cdb68b', pathEdge: '#a99068',
  plaza: '#e2d3ad', travertine: '#e8dfca', sand: '#e0c58e', sandDark: '#cfae74',
  soil: '#6a4e33', bedLeaves: '#3c6a2c', lakeBed: '#4f6142', basin: '#d9d2bf',
};
// Flower bed tints (October in Rome: begonias, marigolds, cyclamen, salvias). The 3D bedding
// plants from the vegetation module carry the colour; the ground only takes a hint of it.
const BED_TINTS = ['#d93a48', '#f2b830', '#c8509e', '#e03838', '#f07a9a'];

// width: colour canvas width in pixels; maskWidth: coverage mask width (cheap, one byte a texel).
export function paintGround(ctx, width, maskWidth = width) {
  const { MAP, geo } = ctx;
  const R = REGION;
  const W = width, H = Math.round((width * (R.z1 - R.z0)) / (R.x1 - R.x0));
  const S = W / (R.x1 - R.x0); // canvas pixels per world unit
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const rnd = ctx.rng('world-ground');
  const X = (x) => (x - R.x0) * S, Y = (z) => (z - R.z0) * S;

  const ring = (r) => traceRing(g, r, X, Y);
  const line = (p) => traceLine(g, p, X, Y);
  const fillRing = (r, style, alpha = 1) => { g.globalAlpha = alpha; g.fillStyle = style; g.beginPath(); ring(r); g.fill(); g.globalAlpha = 1; };
  const strokeLines = (list, widthUnits, style, alpha = 1) => {
    g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = Math.max(1, widthUnits * S);
    g.beginPath(); for (const p of list) line(p); g.stroke(); g.globalAlpha = 1;
  };
  // Soft edge: a wide translucent stroke around a ring before filling it.
  const featherRing = (r, style, widthUnits, alpha) => {
    g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = widthUnits * S;
    g.beginPath(); ring(r); g.stroke(); g.globalAlpha = 1;
  };
  const mask = makeMask(maskWidth, R);

  const pat = makePatterns(g, rnd);
  g.lineJoin = 'round'; g.lineCap = 'round';

  // --- the city around the park
  g.fillStyle = C.asphalt; g.fillRect(0, 0, W, H);
  g.fillStyle = pat.asphalt; g.fillRect(0, 0, W, H);
  mask.all(1);
  // pavements of sampietrini all around the park walls
  strokeLines([[...MAP.BOUNDARY, MAP.BOUNDARY[0]]], 14, C.sidewalk);
  strokeLines([[...MAP.BOUNDARY, MAP.BOUNDARY[0]]], 14, pat.cobble);

  // Viale del Muro Torto runs in a green cutting along the Aurelian wall
  const muro = MAP.BACKDROP.muroTorto || [];
  if (muro.length) {
    strokeLines([muro], 30, C.verge);
    strokeLines([muro], 30, pat.grass);
    strokeLines([muro], 11, C.asphalt);
    strokeLines([muro], 11, pat.asphalt);
    mask.lines([muro], 30, 0);
    mask.lines([muro], 11, 1);
    g.setLineDash([3 * S, 4 * S]);
    strokeLines([muro], 0.35, '#f4efe2', 0.85);
    g.setLineDash([]);
    for (const off of [-4.6, 4.6]) strokeLines([offsetLine(muro, off)], 0.3, '#f4efe2', 0.7);
  }

  // Piazza del Popolo and the Trident streets leaving it to the south
  const pp = MAP.BACKDROP.piazzaPopolo;
  if (pp) {
    const [cx, cz] = pp.center;
    const trident = [[-0.62, 1], [0, 1], [0.55, 1]].map(([dx, dz]) => {
      const L = Math.hypot(dx, dz);
      return [[cx, cz], [cx + (dx / L) * 260, cz + (dz / L) * 260]];
    });
    strokeLines(trident, 12, C.cobble);
    strokeLines(trident, 12, pat.cobble);
    strokeLines([[[cx, cz], [cx - 10, cz - 70]]], 14, C.cobble); // Porta del Popolo, Piazzale Flaminio
    mask.lines(trident, 12, 1);
    mask.lines([[[cx, cz], [cx - 10, cz - 70]]], 14, 1);
    mask.ellipse(cx, cz, pp.radius * 1.08, pp.radius * 0.95, 1);
    g.save();
    g.beginPath(); g.ellipse(X(cx), Y(cz), pp.radius * 1.08 * S, pp.radius * 0.95 * S, 0, 0, Math.PI * 2);
    g.fillStyle = '#b5ab9b'; g.fill();
    g.fillStyle = pat.cobble; g.fill();
    g.clip();
    // travertine bands radiating from the obelisk, like the real paving
    g.strokeStyle = C.travertine; g.globalAlpha = 0.75; g.lineWidth = 0.9 * S;
    g.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      g.moveTo(X(cx + Math.cos(a) * 6), Y(cz + Math.sin(a) * 6));
      g.lineTo(X(cx + Math.cos(a) * 60), Y(cz + Math.sin(a) * 60));
    }
    g.stroke();
    g.beginPath(); g.ellipse(X(cx), Y(cz), pp.radius * 0.7 * S, pp.radius * 0.62 * S, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    g.beginPath(); g.arc(X(cx), Y(cz), 7 * S, 0, Math.PI * 2); g.fillStyle = C.travertine; g.fill();
  }

  // --- fenced neighbours: the zoo, the riding ground, Villa Medici's gardens
  for (const n of MAP.NOGO) {
    if (n.k === 'zoo') {
      fillRing(n.r, C.meadow); fillRing(n.r, pat.grass);
      mask.ring(n.r, 0);
      g.save(); g.beginPath(); ring(n.r); g.clip();
      blotches(g, rnd, n.r, geo, X, Y, S, 70, 6, 16, ['rgba(93,106,53,0.8)', 'rgba(170,140,95,0.55)', 'rgba(110,140,70,0.6)']);
      g.restore();
    } else if (n.k === 'galoppatoio') {
      featherRing(n.r, C.verge, 4, 0.8);
      fillRing(n.r, C.sand); fillRing(n.r, pat.sand);
      mask.edge(n.r, 4, 0); mask.ring(n.r, 1);
      g.save(); g.beginPath(); ring(n.r); g.clip();
      raked(g, n.r, geo, X, Y, S, 2.2, 'rgba(160,120,70,0.16)');
      g.restore();
    } else if (n.k === 'villamedici') {
      fillRing(n.r, C.plaza); fillRing(n.r, pat.gravel);
      g.save(); g.beginPath(); ring(n.r); g.clip();
      gardenGrid(g, n.r, geo, X, Y, S, 9, 2.2, ['#5f8c3e', '#6b9a45']);
      g.restore();
    }
  }

  // --- the park itself
  fillRing(MAP.BOUNDARY, C.meadow);
  fillRing(MAP.BOUNDARY, pat.grass);
  mask.ring(MAP.BOUNDARY, 0);
  g.save(); g.beginPath(); ring(MAP.BOUNDARY); g.clip();
  // sun-dried patches and lush hollows: October lawns are never one flat green
  blotches(g, rnd, MAP.BOUNDARY, geo, X, Y, S, 260, 5, 20, ['rgba(160,170,80,0.22)', 'rgba(90,140,60,0.25)', 'rgba(175,165,95,0.18)']);
  g.restore();

  // woods: forest floor of needles and leaf litter, darker where the canopy is thickest
  for (const f of MAP.FOREST) featherRing(f, C.forest, 4, 0.45);
  for (const f of MAP.FOREST) fillRing(f, C.forest);
  for (const f of MAP.FOREST) {
    g.save(); g.beginPath(); ring(f); g.clip();
    blotches(g, rnd, f, geo, X, Y, S, Math.min(400, geo.ringArea(f) / 60), 4, 12, ['rgba(66,84,40,0.55)', 'rgba(115,100,60,0.3)', 'rgba(98,130,58,0.45)']);
    g.fillStyle = pat.litter; g.fillRect(0, 0, W, H);
    g.restore();
  }

  // --- avenues and paths are drawn in passes so junctions merge cleanly: first their worn,
  // darker margins; plazas and lawns go over those, then the path surfaces on top of everything
  const byKind = (k) => MAP.PATHS.filter((p) => p.k === k).map((p) => p.p);
  const viali = byKind('viale'), foot = byKind('footway'), paths = byKind('path');
  strokeLines(paths, 2.8 + 1.4, C.pathEdge, 0.35);
  strokeLines(foot, 3.6 + 1.4, C.vialeEdge, 0.4);
  strokeLines(viali, 7 + 1.8, C.vialeEdge, 0.45);

  // --- plazas
  for (const p of MAP.PLAZAS) {
    if (p.n === 'Piazza di Siena') { siena(p.r); continue; }
    const area = geo.ringArea(p.r);
    const paved = area < 60 || /Scalea|Esedra/.test(p.n || '');
    featherRing(p.r, C.vialeEdge, 1.4, 0.4);
    fillRing(p.r, paved ? C.travertine : C.plaza);
    fillRing(p.r, paved ? pat.paving : pat.gravel);
    mask.ring(p.r, 1);
    if (/Scalea/.test(p.n || '')) { // the steps
      g.save(); g.beginPath(); ring(p.r); g.clip();
      stripes(g, p.r, geo, X, Y, S, 0.7, 'rgba(255,255,255,0.35)', 'rgba(120,100,70,0.25)', true);
      g.restore();
    }
  }

  // lawns and gardens: fresh green with mowing stripes (their crisp edge comes from the mask)
  for (const l of MAP.LAWNS) {
    if (l.k === 'flowers') continue;
    fillRing(l.r, C.lawn);
    mask.ring(l.r, 0);
    g.save(); g.beginPath(); ring(l.r); g.clip();
    stripes(g, l.r, geo, X, Y, S, 2.6, C.lawnLight, C.lawnDark);
    g.fillStyle = pat.lawn; g.fillRect(0, 0, W, H);
    g.restore();
  }
  // flower beds: dark soil and leaves with a hint of the flowers' colour, edged with low box
  // hedges; the 3D bedding plants on top carry the colour. Beds of one garden share their colours.
  for (const l of MAP.LAWNS) {
    if (l.k !== 'flowers') continue;
    const [cx, cz] = geo.ringCentroid(l.r);
    const tint = BED_TINTS[Math.abs(Math.floor(cx / 40) * 7 + Math.floor(cz / 40) * 13) % BED_TINTS.length];
    fillRing(l.r, C.soil);
    g.save(); g.beginPath(); ring(l.r); g.clip();
    g.globalAlpha = 0.55; g.fillStyle = C.bedLeaves; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.fillStyle = pat.leaves; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.15; g.fillStyle = tint; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    g.restore();
    g.strokeStyle = '#3d6a2e'; g.lineWidth = 0.8 * S;
    g.beginPath(); ring(l.r); g.stroke();
    mask.ring(l.r, 0); mask.edge(l.r, 0.8, 0);
  }

  // water beds (the water surfaces are meshes; this shows through at the edges)
  for (const w of MAP.WATER) {
    if (w.k === 'lake') {
      featherRing(w.r, '#6c7a4a', 2, 0.8);
      fillRing(w.r, C.lakeBed);
      mask.ring(w.r, 0);
      for (const h of w.h || []) { fillRing(h, C.meadow); fillRing(h, pat.lawn); }
    } else {
      featherRing(w.r, C.travertine, 1.2, 0.9);
      fillRing(w.r, C.basin);
      mask.edge(w.r, 1.2, 1); mask.ring(w.r, 1);
    }
  }

  // path surfaces
  strokeLines(paths, 2.8, C.path);
  strokeLines(foot, 3.6, C.footway);
  strokeLines(viali, 7, C.viale);
  // worn wheel tracks along the wide avenues (a wide dark stroke, then the middle painted back)
  strokeLines(viali, 3.5, C.rut, 0.4);
  strokeLines(viali, 2.3, C.viale, 0.85);
  strokeLines(viali, 0.9, '#e6d6b0', 0.5);
  strokeLines(paths, 2.8, pat.dirt);
  strokeLines(foot, 3.6, pat.gravel);
  strokeLines(viali, 7, pat.gravel);
  mask.lines(paths, 2.8, 1);
  mask.lines(foot, 3.6, 1);
  mask.lines(viali, 7, 1);

  // Piazza di Siena: an oval arena of grass inside a sandy track, with grass banks around it
  function siena(r) {
    const [cx, cz] = geo.ringCentroid(r);
    const scaled = (k) => r.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
    fillRing(r, C.lawn); fillRing(r, pat.lawn);
    featherRing(scaled(0.84), C.sandDark, 1.5, 0.5);
    fillRing(scaled(0.84), C.sand); fillRing(scaled(0.84), pat.sand);
    const inner = scaled(0.72);
    fillRing(inner, C.lawn);
    mask.ring(r, 0); mask.ring(scaled(0.84), 1); mask.ring(inner, 0);
    g.save(); g.beginPath(); ring(inner); g.clip();
    stripes(g, inner, geo, X, Y, S, 3, C.lawnLight, C.lawnDark);
    g.fillStyle = pat.lawn; g.fillRect(0, 0, W, H);
    g.restore();
  }

  // gentle large-scale light variation over everything (clouds of shade, sunnier spots)
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = 0.35;
  g.imageSmoothingEnabled = true;
  g.drawImage(pat.macro, 0, 0, W, H);
  g.restore();

  return { canvas, width: W, height: H, scale: S, region: R, mask: mask.read() };
}

// Coverage mask painter on its own canvas (same world rectangle, own resolution): every shape is
// filled with 1 (paved) or 0 (green). read() returns it as bytes, top row first, after a closing
// (3x3 max, then 3x3 min) that fills slivers of grass under two texels wide (two avenues side by
// side would leave a wiggly green thread between them) and a 3x3 box blur that gives the edges the
// soft ramp the shader's 0.5 cut turns into smooth curves.
function makeMask(width, R) {
  const S = width / (R.x1 - R.x0);
  const W = width, H = Math.round((width * (R.z1 - R.z0)) / (R.x1 - R.x0));
  const [, m] = canvas2d(W, H, true);
  const X = (x) => (x - R.x0) * S, Y = (z) => (z - R.z0) * S;
  const style = (v) => (v ? '#fff' : '#000');
  m.lineJoin = 'round'; m.lineCap = 'round';
  return {
    all(v) { m.fillStyle = style(v); m.fillRect(0, 0, W, H); },
    ring(r, v) { m.fillStyle = style(v); m.beginPath(); traceRing(m, r, X, Y); m.fill(); },
    ellipse(x, z, rx, rz, v) { m.fillStyle = style(v); m.beginPath(); m.ellipse(X(x), Y(z), rx * S, rz * S, 0, 0, Math.PI * 2); m.fill(); },
    edge(r, widthUnits, v) { m.strokeStyle = style(v); m.lineWidth = widthUnits * S; m.beginPath(); traceRing(m, r, X, Y); m.stroke(); },
    lines(list, widthUnits, v) {
      m.strokeStyle = style(v); m.lineWidth = Math.max(1, widthUnits * S);
      m.beginPath(); for (const p of list) traceLine(m, p, X, Y); m.stroke();
    },
    read() {
      const src = m.getImageData(0, 0, W, H).data;
      let a = new Uint8Array(W * H);
      for (let i = 0; i < a.length; i++) a[i] = src[i * 4];
      a = filter3(a, W, H, 'max');
      a = filter3(a, W, H, 'min');
      return { data: filter3(a, W, H, 'mean'), width: W, height: H };
    },
  };
}

// Separable 3x3 filters over a one-byte image (edges clamp): 'max', 'min' or 'mean' (box blur).
function filter3(a, W, H, kind) {
  const op = kind === 'max' ? 0 : kind === 'min' ? 1 : 2;
  const t = new Uint16Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { // rows
    const o = y * W;
    let p = a[o], q = p;
    for (let x = 0; x < W; x++) {
      const r = x < W - 1 ? a[o + x + 1] : q;
      t[o + x] = op === 2 ? p + q + r : op === 0 ? (p > q ? (p > r ? p : r) : q > r ? q : r) : (p < q ? (p < r ? p : r) : q < r ? q : r);
      p = q; q = r;
    }
  }
  for (let y = 0; y < H; y++) { // columns
    const o = y * W, up = y > 0 ? o - W : o, dn = y < H - 1 ? o + W : o;
    for (let x = 0; x < W; x++) {
      const p = t[up + x], q = t[o + x], r = t[dn + x];
      out[o + x] = op === 2 ? (p + q + r + 4) / 9 : op === 0 ? (p > q ? (p > r ? p : r) : q > r ? q : r) : (p < q ? (p < r ? p : r) : q < r ? q : r);
    }
  }
  return out;
}

function traceRing(g, r, X, Y) {
  g.moveTo(X(r[0][0]), Y(r[0][1]));
  for (let i = 1; i < r.length; i++) g.lineTo(X(r[i][0]), Y(r[i][1]));
  g.closePath();
}

function traceLine(g, p, X, Y) {
  g.moveTo(X(p[0][0]), Y(p[0][1]));
  for (let i = 1; i < p.length; i++) g.lineTo(X(p[i][0]), Y(p[i][1]));
}

// ---------------------------------------------------------------------------------------------

// Small helper canvas. Canvases read back with getImageData ask for a CPU-side backing store
// (willReadFrequently), which saves a GPU flush and readback per read.
function canvas2d(w, h = w, readBack = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', readBack ? { willReadFrequently: true } : undefined)];
}

// Tiling speckle patterns (transparent background, drawn over a base fill).
function makePatterns(g, rnd) {
  const speck = (size, layers) => {
    const [c, s] = canvas2d(size);
    for (const { colors, n, r0, r1, alpha = 1, stretch = 1 } of layers) {
      for (let i = 0; i < n; i++) {
        const x = rnd() * size, y = rnd() * size, r = r0 + (r1 - r0) * rnd();
        s.globalAlpha = alpha * (0.5 + 0.5 * rnd());
        s.fillStyle = colors[Math.floor(rnd() * colors.length)];
        for (const ox of [0, -size, size]) for (const oy of [0, -size, size]) {
          if (ox && Math.abs(x + ox - size / 2) > size / 2 + r * stretch + 1) continue;
          if (oy && Math.abs(y + oy - size / 2) > size / 2 + r + 1) continue;
          s.beginPath(); s.ellipse(x + ox, y + oy, r * stretch, r, rnd() * Math.PI, 0, Math.PI * 2); s.fill();
        }
      }
    }
    return g.createPattern(c, 'repeat');
  };
  const grassCols = ['#679538', '#84b04c', '#93b957', '#58843a', '#8aae50'];
  const macro = (() => {
    const [c, s] = canvas2d(96, 72);
    const img = s.createImageData(96, 72);
    for (let i = 0; i < 96 * 72; i++) {
      const v = 215 + rnd() * 40;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v * 0.98; img.data[i * 4 + 3] = 255;
    }
    s.putImageData(img, 0, 0);
    return c;
  })();
  return {
    macro,
    grass: speck(256, [{ colors: grassCols, n: 2600, r0: 0.5, r1: 1.3, alpha: 0.5 }, { colors: ['#b4b46a', '#c9c27a'], n: 140, r0: 0.6, r1: 1.4, alpha: 0.5 }]),
    lawn: speck(256, [{ colors: ['#6fa443', '#8cbf56', '#62963a', '#97c45e'], n: 2400, r0: 0.4, r1: 1.0, alpha: 0.45 }]),
    litter: speck(256, [
      { colors: ['#7d6640', '#8f7348', '#655034', '#9a7c50'], n: 1400, r0: 0.4, r1: 1.2, alpha: 0.5, stretch: 2.6 },
      { colors: ['#9c8350', '#a98c58', '#6e5a34', '#8a7444'], n: 500, r0: 0.7, r1: 1.5, alpha: 0.5 },
      { colors: ['#628f3c', '#6f9a44'], n: 500, r0: 0.6, r1: 1.8, alpha: 0.55 },
    ]),
    gravel: speck(256, [{ colors: ['#f2e6c8', '#c6b088', '#b39c74', '#fff4dc', '#d2c09a'], n: 4000, r0: 0.35, r1: 0.9, alpha: 0.55 }]),
    dirt: speck(256, [{ colors: ['#b39a70', '#e0cca0', '#9c8460', '#8aa050'], n: 2400, r0: 0.4, r1: 1.0, alpha: 0.5 }]),
    sand: speck(256, [{ colors: ['#f0d8a2', '#c9a46a', '#e8cc90', '#b8925a'], n: 3000, r0: 0.35, r1: 0.9, alpha: 0.45 }]),
    paving: speck(256, [{ colors: ['#f6efe0', '#cfc4ac', '#dcd2bc'], n: 2200, r0: 0.4, r1: 1.0, alpha: 0.5 }]),
    cobble: speck(256, [{ colors: ['#6f675e', '#a89e90', '#80776c', '#b8ae9e'], n: 5000, r0: 0.4, r1: 0.8, alpha: 0.55 }]),
    asphalt: speck(256, [{ colors: ['#6e6a65', '#9a958c', '#78736c'], n: 3500, r0: 0.3, r1: 0.8, alpha: 0.4 }]),
    leaves: speck(128, [{ colors: ['#3f7a30', '#4f8a3a', '#5f9a42'], n: 900, r0: 0.6, r1: 1.4, alpha: 0.9 }]),
  };
}

// Random soft blobs inside a ring (radius in world units).
function blotches(g, rnd, r, geo, X, Y, S, n, r0, r1, colors) {
  for (let i = 0; i < n; i++) {
    const p = geo.randomPointInRing(r, rnd, 20);
    if (!p) continue;
    const rad = (r0 + (r1 - r0) * rnd()) * S;
    const col = colors[Math.floor(rnd() * colors.length)];
    const gr = g.createRadialGradient(X(p[0]), Y(p[1]), 0, X(p[0]), Y(p[1]), rad);
    gr.addColorStop(0, col);
    gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = gr;
    g.fillRect(X(p[0]) - rad, Y(p[1]) - rad, rad * 2, rad * 2);
  }
}

// Direction of a ring's longest edge (radians), used to align stripes and garden grids.
function mainAngle(r) {
  let best = 0, bl = -1;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > bl) { bl = L; best = Math.atan2(b[1] - a[1], b[0] - a[0]); }
  }
  return best;
}

// Alternating bands across the (already clipped) ring, parallel to its longest edge.
function stripes(g, r, geo, X, Y, S, width, colA, colB, across = false) {
  const [cx, cz] = geo.ringCentroid(r);
  const bb = geo.ringBBox(r);
  const reach = Math.hypot(bb.maxX - bb.minX, bb.maxZ - bb.minZ);
  const a = mainAngle(r) + (across ? Math.PI / 2 : 0);
  g.save();
  g.translate(X(cx), Y(cz));
  g.rotate(a);
  for (let k = -Math.ceil(reach / width / 2), i = 0; k * width < reach / 2; k++, i++) {
    g.fillStyle = (k & 1) ? colA : colB;
    g.globalAlpha = 0.7;
    g.fillRect(-reach * S, k * width * S, reach * 2 * S, width * S);
  }
  g.restore();
}

// Fine parallel lines (raked sand).
function raked(g, r, geo, X, Y, S, spacing, color) {
  const [cx, cz] = geo.ringCentroid(r);
  const bb = geo.ringBBox(r);
  const reach = Math.hypot(bb.maxX - bb.minX, bb.maxZ - bb.minZ);
  g.save();
  g.translate(X(cx), Y(cz));
  g.rotate(mainAngle(r));
  g.strokeStyle = color; g.lineWidth = Math.max(1, 0.4 * S);
  g.beginPath();
  for (let k = -reach / 2; k < reach / 2; k += spacing) { g.moveTo(-reach * S, k * S); g.lineTo(reach * S, k * S); }
  g.stroke();
  g.restore();
}

// Formal Italian garden: hedged squares separated by gravel walks.
function gardenGrid(g, r, geo, X, Y, S, cell, walk, colors) {
  const [cx, cz] = geo.ringCentroid(r);
  const bb = geo.ringBBox(r);
  const reach = Math.hypot(bb.maxX - bb.minX, bb.maxZ - bb.minZ);
  g.save();
  g.translate(X(cx), Y(cz));
  g.rotate(mainAngle(r));
  let n = 0;
  for (let u = -reach / 2; u < reach / 2; u += cell + walk) {
    for (let v = -reach / 2; v < reach / 2; v += cell + walk) {
      g.fillStyle = colors[n++ % colors.length];
      g.fillRect(u * S, v * S, cell * S, cell * S);
      g.fillStyle = 'rgba(40,70,30,0.35)';
      g.fillRect(u * S, v * S, cell * S, 0.6 * S);
      g.fillRect(u * S, v * S, 0.6 * S, cell * S);
    }
  }
  g.restore();
}

// A polyline shifted sideways by off units (simple per-segment offset with averaged joints).
function offsetLine(p, off) {
  return p.map((pt, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz) || 1;
    return [pt[0] - (dz / L) * off, pt[1] + (dx / L) * off];
  });
}

// ---------------------------------------------------------------------------------------------
// Detail texture tiled over the terrain (linear data):
//   R grass blades, G gravel grain (both average ~0.5), B and A smooth noise (UV jitter, macro tint).
export function makeDetailTexture(THREE, rnd, size = 256) {
  const N = size;
  const draw = (fn) => {
    const [, s] = canvas2d(N, N, true);
    s.fillStyle = 'rgb(128,128,128)'; s.fillRect(0, 0, N, N);
    fn(s);
    return s.getImageData(0, 0, N, N).data;
  };
  const wrapDraw = (s, x, y, pad, fn) => {
    for (const ox of [0, -N, N]) for (const oy of [0, -N, N]) {
      if (ox && (x + ox < -pad || x + ox > N + pad)) continue;
      if (oy && (y + oy < -pad || y + oy > N + pad)) continue;
      fn(x + ox, y + oy);
    }
  };
  const k = N / 256;
  const grass = draw((s) => {
    s.lineCap = 'round';
    for (let i = 0; i < 2600 * k * k; i++) {
      const x = rnd() * N, y = rnd() * N, len = (3 + rnd() * 7) * k, a = rnd() * Math.PI * 2;
      const v = 60 + Math.floor(rnd() * 150);
      s.strokeStyle = `rgba(${v},${v},${v},0.75)`;
      s.lineWidth = (1 + rnd() * 1.4) * k;
      wrapDraw(s, x, y, len, (px, py) => {
        s.beginPath(); s.moveTo(px, py); s.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); s.stroke();
      });
    }
  });
  const gravel = draw((s) => {
    for (let i = 0; i < 1500 * k * k; i++) {
      const x = rnd() * N, y = rnd() * N, r = (1.2 + rnd() * 3) * k;
      const v = 70 + Math.floor(rnd() * 160);
      wrapDraw(s, x, y, r + 2, (px, py) => {
        s.fillStyle = 'rgba(70,70,70,0.35)';
        s.beginPath(); s.ellipse(px + 0.8 * k, py + 0.9 * k, r, r * 0.8, 0, 0, Math.PI * 2); s.fill();
        s.fillStyle = `rgb(${v},${v},${v})`;
        s.beginPath(); s.ellipse(px, py, r, r * 0.8, rnd() * 3, 0, Math.PI * 2); s.fill();
      });
    }
  });
  const smooth = (cells) => {
    const lat = new Float32Array(cells * cells).map(() => rnd());
    const out = new Float32Array(N * N);
    const L = (i, j) => lat[((j % cells) + cells) % cells * cells + (((i % cells) + cells) % cells)];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells, fy = (y / N) * cells;
        const i = Math.floor(fx), j = Math.floor(fy);
        let u = fx - i, v = fy - j;
        u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
        out[y * N + x] = (L(i, j) * (1 - u) + L(i + 1, j) * u) * (1 - v) + (L(i, j + 1) * (1 - u) + L(i + 1, j + 1) * u) * v;
      }
    }
    return out;
  };
  const nB = smooth(8), nB2 = smooth(32), nA = smooth(4);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = grass[i * 4];
    data[i * 4 + 1] = gravel[i * 4];
    data[i * 4 + 2] = Math.round((nB[i] * 0.7 + nB2[i] * 0.3) * 255);
    data[i * 4 + 3] = Math.round(nA[i] * 255);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
