// One canvas-painted texture atlas for every building, wall, roof and street of the city, plus the
// shared material that samples it.
//
// Each atlas cell is a small tileable picture (one window bay, a patch of roof tiles, bricks...).
// Geometry carries two extra attributes:
//   fuv  (vec3) = (u, v, groundRow): unwrapped tile coordinates (1 = one tile) and, for facades,
//                 the atlas offset of the ground-floor cell used where v < 1
//   cell (vec4) = atlas rectangle (x0, y0, w, h) of the cell to repeat
// The fragment shader repeats the cell with fract() and textureGrad (no mip seams), so a whole
// facade is a single quad. The atlas alpha channel is a tint mask: where it is 1 the texel is
// multiplied by the vertex colour (stucco, roof tiles, bricks), where it is 0 the painted colour
// is kept (white window frames, green shutters, dark glass).
import * as THREE from 'three';
import { rng } from '../../core/rng.js';

const PW = 128, PH = 160, GUT = 4;          // cell pitch and gutter (px)
const CW = PW - GUT * 2, CH = PH - GUT * 2; // drawable cell content
const COLS = 8, ROWS = 4;
const AW = PW * COLS, AH = PH * ROWS;

// World size of one tile, in game units: [width, height]
export const BAY = 2.7, FLOOR = 3.4;

// [column, row]. Facade cells live in row 0 and their ground floor right below in row 1.
const LAYOUT = {
  palazzo: [0, 0], pediment: [1, 0], tapparelle: [2, 0], balcony: [3, 0],
  modern: [4, 0], villa: [5, 0], classic: [6, 0], brickHouse: [7, 0],
  white: [0, 2], tiles: [1, 2], brick: [2, 2], ashlar: [3, 2], stucco: [4, 2], leaves: [5, 2], cobbles: [6, 2], asphalt: [7, 2],
  roadMain: [0, 3], road: [1, 3], colonnade: [2, 3], ribs: [3, 3], water: [4, 3], terrace: [5, 3], grass: [6, 3], arcade: [7, 3],
};
// Tile size in world units for the material cells (facades use BAY x FLOOR).
export const TILE = {
  white: [1, 1], tiles: [2.4, 3.0], brick: [2.2, 2.8], ashlar: [3.2, 4.0], stucco: [4, 5], leaves: [2.5, 3.1],
  cobbles: [2.4, 3.0], asphalt: [6, 7.5], roadMain: [9, 1], road: [6, 1], colonnade: [2.2, 1], ribs: [1, 1],
  water: [3, 3.8], terrace: [2.4, 3.0], grass: [4, 5], arcade: [3.2, 1],
};
export const FACADES = ['palazzo', 'pediment', 'tapparelle', 'balcony', 'modern', 'villa', 'classic', 'brickHouse'];

// Normalised atlas rectangles: CELL[name] = [x0, y0, w, h]; GROUND_ROW = offset to the cell below.
export const CELL = {};
for (const [name, [c, r]] of Object.entries(LAYOUT)) {
  CELL[name] = [(c * PW + GUT) / AW, (r * PH + GUT) / AH, CW / AW, CH / AH];
}
export const GROUND_ROW = PH / AH;

// --- painting -------------------------------------------------------------------------------
// Every shape goes to two canvases: colour and tint mask (white = tintable).
function painter(gc, gm) {
  const m = (t) => (t ? '#fff' : '#000');
  return {
    gc, gm,
    rect(x, y, w, h, color, t = 0) {
      gc.fillStyle = color; gc.fillRect(x, y, w, h);
      gm.fillStyle = m(t); gm.fillRect(x, y, w, h);
    },
    poly(pts, color, t = 0) {
      for (const [g, c] of [[gc, color], [gm, m(t)]]) {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath(); g.fillStyle = c; g.fill();
      }
    },
    // arch-topped opening: rectangle with a half-circle on top
    arch(x, y, w, h, color, t = 0) {
      for (const [g, c] of [[gc, color], [gm, m(t)]]) {
        g.beginPath();
        g.moveTo(x, y + h); g.lineTo(x, y + w / 2);
        g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
        g.lineTo(x + w, y + h); g.closePath(); g.fillStyle = c; g.fill();
      }
    },
    ellipse(x, y, rx, ry, color, t = 0) {
      for (const [g, c] of [[gc, color], [gm, m(t)]]) {
        g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = c; g.fill();
      }
    },
    // colour-only touches (shading, noise) that keep the mask as it is
    shade(x, y, w, h, color) { gc.fillStyle = color; gc.fillRect(x, y, w, h); },
    noise(x, y, w, h, n, amp, rnd, size = 2) {
      for (let i = 0; i < n; i++) {
        const v = rnd() < 0.5 ? 0 : 255;
        gc.fillStyle = `rgba(${v},${v},${v},${amp * rnd()})`;
        gc.fillRect(x + rnd() * w, y + rnd() * h, size, size);
      }
    },
  };
}

const STUCCO = '#f7f3ea', TRIM = '#f4efe4', TRIM_SHADE = '#d9d0bf', GLASS = '#2b3138', GLASS_HI = '#58646f';
const SHUTTER = '#3f6a48', SHUTTER_DK = '#2e5236', WOOD = '#7a5636';

// Window with a travertine frame. (x, y) top-left of the opening.
function framedWindow(d, x, y, w, h, frame = 5) {
  d.rect(x - frame, y - frame, w + frame * 2, h + frame * 2, TRIM);
  d.rect(x, y, w, h, GLASS);
  d.rect(x + w / 2 - 1, y, 2, h, '#3c4148');
  d.rect(x, y + h * 0.36, w, 2, '#3c4148');
  d.shade(x + 3, y + 3, w * 0.3, h * 0.25, GLASS_HI);
  d.rect(x - frame - 3, y + h + frame, w + frame * 2 + 6, 5, TRIM);     // sill
  d.shade(x - frame - 3, y + h + frame + 5, w + frame * 2 + 6, 2, 'rgba(0,0,0,0.18)');
}
function shutterLeaf(d, x, y, w, h) {
  d.rect(x, y, w, h, SHUTTER);
  for (let k = y + 4; k < y + h - 2; k += 5) d.rect(x + 2, k, w - 4, 2, SHUTTER_DK);
  d.rect(x, y, w, 2, SHUTTER_DK); d.rect(x, y + h - 2, w, 2, SHUTTER_DK);
}
function stuccoBase(d, rnd, w = CW, h = CH) {
  d.rect(0, 0, w, h, STUCCO, 1);
  d.noise(0, 0, w, h, 260, 0.06, rnd, 3);
}
// Thin string course at the floor line and a hint of shade under the cornice of the floor above.
function floorBands(d) {
  d.rect(0, CH - 6, CW, 6, TRIM);
  d.shade(0, CH - 2, CW, 2, 'rgba(0,0,0,0.12)');
}

const DRAW = {
  // --- upper floors (row 0) -----------------------------------------------------------------
  palazzo(d, rnd) {
    stuccoBase(d, rnd); floorBands(d);
    framedWindow(d, 40, 40, 40, 78);
    shutterLeaf(d, 40, 40, 20, 78); shutterLeaf(d, 60, 40, 20, 78);
    d.rect(32, 26, 56, 6, TRIM); d.shade(32, 32, 56, 2, 'rgba(0,0,0,0.2)');
  },
  pediment(d, rnd) {
    stuccoBase(d, rnd); floorBands(d);
    framedWindow(d, 42, 44, 36, 72);
    d.rect(25, 44, 14, 72, SHUTTER); d.rect(81, 44, 14, 72, SHUTTER);
    for (let k = 48; k < 114; k += 5) { d.rect(27, k, 10, 2, SHUTTER_DK); d.rect(83, k, 10, 2, SHUTTER_DK); }
    d.poly([[30, 34], [60, 16], [90, 34]], TRIM);
    d.poly([[38, 32], [60, 21], [82, 32]], TRIM_SHADE);
    d.rect(30, 34, 60, 5, TRIM);
    d.rect(36, 126, 48, 12, TRIM); for (let k = 40; k < 82; k += 7) d.rect(k, 128, 3, 9, TRIM_SHADE);
  },
  tapparelle(d, rnd) {
    stuccoBase(d, rnd); floorBands(d);
    framedWindow(d, 38, 40, 44, 76, 4);
    d.rect(38, 40, 44, 44, '#8f6f4c');
    for (let k = 42; k < 84; k += 4) d.rect(38, k, 44, 1, '#6e5238');
  },
  balcony(d, rnd) {
    stuccoBase(d, rnd); floorBands(d);
    d.rect(37, 24, 46, 6, TRIM);
    framedWindow(d, 42, 34, 36, 92, 4);
    d.rect(42, 34, 36, 92, '#3a3f45'); d.rect(59, 34, 2, 92, '#2a2e33'); d.shade(45, 38, 10, 30, GLASS_HI);
    d.rect(24, 34, 15, 92, SHUTTER); d.rect(81, 34, 15, 92, SHUTTER);
    for (let k = 38; k < 124; k += 5) { d.rect(26, k, 11, 2, SHUTTER_DK); d.rect(83, k, 11, 2, SHUTTER_DK); }
    d.rect(26, 126, 68, 6, TRIM); d.shade(26, 132, 68, 3, 'rgba(0,0,0,0.25)');
    d.rect(28, 100, 64, 3, '#26262a');
    for (let k = 30; k < 92; k += 6) d.rect(k, 100, 2, 26, '#26262a');
  },
  modern(d, rnd) {
    d.rect(0, 0, CW, CH, STUCCO, 1); d.noise(0, 0, CW, CH, 160, 0.05, rnd, 3);
    d.rect(0, 0, CW, 104, '#cfc6b6', 1);
    d.rect(8, 20, 104, 84, GLASS); d.shade(12, 24, 30, 20, GLASS_HI);
    d.rect(8, 20, 104, 40, '#8f7a62'); for (let k = 22; k < 60; k += 4) d.rect(8, k, 104, 1, '#6e5e4c');
    d.rect(0, 104, CW, 14, '#f3efe6');
    d.rect(0, 84, CW, 3, '#2f3034'); for (let k = 2; k < CW; k += 8) d.rect(k, 84, 2, 20, '#2f3034');
    d.ellipse(18, 84, 12, 8, '#4f7d3c'); d.ellipse(100, 82, 10, 9, '#5b8a43');
    d.rect(0, 118, CW, CH - 118, STUCCO, 1);
  },
  villa(d, rnd) {
    stuccoBase(d, rnd);
    d.rect(0, CH - 8, CW, 8, TRIM);
    framedWindow(d, 44, 38, 32, 76, 6);
    d.rect(26, 32, 16, 88, SHUTTER); d.rect(78, 32, 16, 88, SHUTTER);
    for (let k = 36; k < 118; k += 5) { d.rect(28, k, 12, 2, SHUTTER_DK); d.rect(80, k, 12, 2, SHUTTER_DK); }
    d.rect(36, 22, 48, 7, TRIM);
  },
  classic(d, rnd) {
    d.rect(0, 0, CW, CH, '#f3eee3', 1); d.noise(0, 0, CW, CH, 200, 0.05, rnd, 3);
    d.rect(0, 0, 14, CH, '#ece5d6'); d.rect(CW - 14, 0, 14, CH, '#ece5d6');
    d.shade(14, 0, 3, CH, 'rgba(0,0,0,0.12)'); d.shade(CW - 17, 0, 3, CH, 'rgba(0,0,0,0.08)');
    framedWindow(d, 42, 40, 36, 82, 5);
    d.poly([[32, 32], [60, 18], [88, 32]], '#ece5d6'); d.rect(32, 32, 56, 4, '#e2dac8');
    d.rect(0, CH - 10, CW, 10, '#e6dfd0');
  },
  brickHouse(d, rnd) {
    brickPattern(d, rnd, CW, CH);
    framedWindow(d, 40, 40, 40, 76, 6);
    d.rect(34, 26, 52, 8, TRIM);
    d.rect(0, CH - 8, CW, 8, TRIM);
  },
};

// Ground floors: same column as the upper cell, one row down.
const GROUND = {
  palazzo(d, rnd) {
    stuccoBase(d, rnd);
    for (let k = 14; k < CH; k += 16) d.shade(0, k, CW, 3, 'rgba(0,0,0,0.13)');
    d.arch(28, 34, 64, 118, TRIM);
    d.arch(36, 42, 48, 110, '#33302c');
    d.rect(57, 30, 8, 16, TRIM_SHADE);
    d.rect(0, CH - 12, CW, 12, '#d8cfbd');
  },
  pediment(d, rnd) {
    stuccoBase(d, rnd);
    d.rect(10, 60, 100, 92, '#3a3a3c');
    d.rect(16, 66, 88, 86, GLASS); d.shade(22, 72, 26, 40, GLASS_HI);
    d.rect(58, 66, 3, 86, '#4a4a4e');
    d.poly([[4, 44], [116, 44], [108, 70], [12, 70]], '#8e2b2b');
    for (let k = 14; k < 110; k += 16) d.poly([[k, 44], [k + 8, 44], [k + 7, 70], [k + 1, 70]], '#f3e9dc');
    d.rect(4, 40, 112, 5, '#6d1f1f');
    d.rect(10, 18, 100, 16, '#2f4f3a'); d.rect(16, 23, 60, 6, '#e8dcb5');
  },
  tapparelle(d, rnd) {
    stuccoBase(d, rnd);
    d.rect(10, 50, 100, 102, '#5e6166');
    d.rect(14, 54, 92, 98, '#8b8f94');
    for (let k = 58; k < 150; k += 5) d.rect(14, k, 92, 1, '#6d7176');
    d.rect(10, 22, 100, 20, '#1f3b5a'); d.rect(18, 28, 54, 7, '#f2e4b8');
  },
  balcony(d, rnd) {
    stuccoBase(d, rnd);
    for (let k = 14; k < CH; k += 16) d.shade(0, k, CW, 3, 'rgba(0,0,0,0.12)');
    d.arch(26, 26, 68, 126, TRIM);
    d.arch(33, 33, 54, 119, WOOD);
    d.rect(59, 60, 2, 92, '#5c3f26');
    for (let k = 70; k < 150; k += 22) { d.rect(38, k, 18, 16, '#6b4a2e'); d.rect(64, k, 18, 16, '#6b4a2e'); }
    d.rect(0, CH - 10, CW, 10, '#d8cfbd');
  },
  modern(d, rnd) {
    d.rect(0, 0, CW, CH, '#d9d2c4', 1); d.noise(0, 0, CW, CH, 120, 0.05, rnd, 3);
    d.rect(8, 30, 104, 122, GLASS); d.shade(14, 36, 28, 50, GLASS_HI);
    d.rect(56, 30, 8, 122, '#e9e4da');
    d.rect(0, 18, CW, 12, '#f3efe6');
  },
  villa(d, rnd) {
    stuccoBase(d, rnd);
    d.rect(0, CH - 14, CW, 14, '#d8cfbd');
    d.arch(40, 40, 40, 98, TRIM);
    d.arch(46, 46, 28, 92, GLASS); d.shade(49, 60, 8, 30, GLASS_HI);
    d.rect(28, 38, 12, 100, SHUTTER); d.rect(80, 38, 12, 100, SHUTTER);
    for (let k = 42; k < 136; k += 5) { d.rect(30, k, 8, 2, SHUTTER_DK); d.rect(82, k, 8, 2, SHUTTER_DK); }
  },
  classic(d, rnd) {
    d.rect(0, 0, CW, CH, '#ece6d9', 1); d.noise(0, 0, CW, CH, 200, 0.05, rnd, 3);
    for (let k = 10; k < CH; k += 18) d.shade(0, k, CW, 3, 'rgba(0,0,0,0.12)');
    d.rect(40, 50, 40, 70, '#e6dece'); d.rect(46, 56, 28, 60, GLASS);
    d.rect(0, CH - 12, CW, 12, '#dcd3c1');
  },
  brickHouse(d, rnd) {
    brickPattern(d, rnd, CW, CH);
    d.arch(36, 40, 48, 112, TRIM); d.arch(42, 46, 36, 106, WOOD);
    d.rect(0, CH - 10, CW, 10, '#d8cfbd');
  },
};

function brickPattern(d, rnd, w, h, course = 8) {
  d.rect(0, 0, w, h, '#d9d2c6', 1); // mortar
  for (let y = 0, row = 0; y < h; y += course, row++) {
    const off = (row % 2) * 13;
    for (let x = -off; x < w; x += 26) {
      const v = 0.82 + rnd() * 0.18;
      const c = Math.round(255 * v);
      d.rect(x + 1, y + 1, 24, course - 2, `rgb(${c},${Math.round(c * 0.93)},${Math.round(c * 0.88)})`, 1);
    }
  }
}

const MATS = {
  white(d) { d.rect(0, 0, CW, CH, '#ffffff', 1); },
  tiles(d, rnd) {
    d.rect(0, 0, CW, CH, '#8a8a8a', 1);
    for (let row = 0; row < 8; row++) {
      const y = row * 19;
      for (let x = 0; x < CW; x += 15) {
        const v = 0.8 + rnd() * 0.2, c = Math.round(255 * v);
        d.rect(x + 1, y, 9, 19, `rgb(${c},${c},${c})`, 1);            // coppo (convex tile)
        d.shade(x + 1, y, 2, 19, 'rgba(255,255,255,0.25)');
        d.shade(x + 8, y, 2, 19, 'rgba(0,0,0,0.25)');
        d.shade(x + 10, y, 5, 19, 'rgba(0,0,0,0.35)');                // channel
      }
      d.shade(0, y + 16, CW, 3, 'rgba(0,0,0,0.25)');
    }
  },
  brick(d, rnd) { brickPattern(d, rnd, CW, CH, 8); d.noise(0, 0, CW, CH, 300, 0.08, rnd, 2); },
  ashlar(d, rnd) {
    d.rect(0, 0, CW, CH, '#cfc8bb', 1);
    for (let y = 0, row = 0; y < CH; y += 38, row++) {
      const off = (row % 2) * 30;
      for (let x = -off; x < CW; x += 60) {
        const v = Math.round(255 * (0.86 + rnd() * 0.14));
        d.rect(x + 1, y + 1, 58, 36, `rgb(${v},${v},${Math.round(v * 0.97)})`, 1);
      }
    }
    d.noise(0, 0, CW, CH, 400, 0.1, rnd, 2);
  },
  stucco(d, rnd) { d.rect(0, 0, CW, CH, '#f6f2ea', 1); d.noise(0, 0, CW, CH, 500, 0.07, rnd, 4); },
  leaves(d, rnd) {
    d.rect(0, 0, CW, CH, '#b8b8b8', 1);
    for (let i = 0; i < 520; i++) {
      const v = Math.round(255 * (0.55 + rnd() * 0.45));
      d.ellipse(rnd() * CW, rnd() * CH, 3 + rnd() * 4, 2 + rnd() * 3, `rgb(${v},${v},${v})`, 1);
    }
  },
  cobbles(d, rnd) {
    d.rect(0, 0, CW, CH, '#7d7871', 1);
    for (let y = 0, row = 0; y < CH; y += 8, row++) {
      for (let x = -(row % 2) * 4; x < CW; x += 8) {
        const v = Math.round(255 * (0.62 + rnd() * 0.3));
        d.rect(x + 1, y + 1, 6, 6, `rgb(${v},${Math.round(v * 0.97)},${Math.round(v * 0.93)})`, 1);
      }
    }
  },
  asphalt(d, rnd) { d.rect(0, 0, CW, CH, '#9a9a9a', 1); d.noise(0, 0, CW, CH, 900, 0.12, rnd, 2); },
  // road cross-section: v runs across the road, u along it
  roadMain(d, rnd) {
    d.rect(0, 0, CW, CH, '#5f5d5a'); d.noise(0, 0, CW, CH, 700, 0.1, rnd, 2);
    d.rect(0, 0, CW, 10, '#cfc8bb'); d.rect(0, CH - 10, CW, 10, '#cfc8bb');
    d.rect(0, 10, CW, 3, '#e9e6df'); d.rect(0, CH - 13, CW, 3, '#e9e6df');
    d.rect(0, CH / 2 - 2, CW * 0.5, 4, '#f2efe8');
  },
  road(d, rnd) {
    d.rect(0, 0, CW, CH, '#686562'); d.noise(0, 0, CW, CH, 700, 0.1, rnd, 2);
    d.rect(0, 0, CW, 12, '#cbc4b6'); d.rect(0, CH - 12, CW, 12, '#cbc4b6');
    d.shade(0, 12, CW, 3, 'rgba(0,0,0,0.2)'); d.shade(0, CH - 15, CW, 3, 'rgba(0,0,0,0.2)');
  },
  colonnade(d) {
    d.rect(0, 0, CW, CH, '#3d3a37');
    d.rect(0, 0, CW, 18, '#f1ece2', 1); d.rect(0, CH - 14, CW, 14, '#f1ece2', 1);
    for (let x = 6; x < CW; x += 30) { d.rect(x, 18, 16, CH - 32, '#f1ece2', 1); d.shade(x + 11, 18, 5, CH - 32, 'rgba(0,0,0,0.18)'); }
    d.rect(0, 18, CW, 4, '#d8d1c3', 1);
  },
  ribs(d) {
    d.rect(0, 0, CW, CH, '#ffffff', 1);
    d.rect(0, 0, 8, CH, '#f4f1ea'); d.shade(8, 0, 4, CH, 'rgba(0,0,0,0.12)');
  },
  water(d, rnd) {
    d.rect(0, 0, CW, CH, '#5aa6c9');
    for (let i = 0; i < 90; i++) {
      d.ellipse(rnd() * CW, rnd() * CH, 6 + rnd() * 10, 1.2, 'rgba(230,248,255,0.55)');
    }
  },
  terrace(d, rnd) {
    d.rect(0, 0, CW, CH, '#d9c6a8', 1);
    for (let y = 0; y < CH; y += 19) d.shade(0, y, CW, 1, 'rgba(0,0,0,0.18)');
    for (let x = 0; x < CW; x += 15) d.shade(x, 0, 1, CH, 'rgba(0,0,0,0.18)');
    d.noise(0, 0, CW, CH, 200, 0.06, rnd, 3);
  },
  grass(d, rnd) {
    d.rect(0, 0, CW, CH, '#c9c9c9', 1);
    for (let i = 0; i < 700; i++) {
      const v = Math.round(255 * (0.7 + rnd() * 0.3));
      d.rect(rnd() * CW, rnd() * CH, 2, 4, `rgb(${v},${v},${v})`, 1);
    }
  },
  arcade(d) {
    d.rect(0, 0, CW, CH, '#f1ece2', 1);
    d.arch(20, 30, 80, CH - 30, '#3b3733');
    d.shade(20, 30, 80, 6, 'rgba(0,0,0,0.25)');
  },
};

let _atlas = null;
export function atlasTexture() {
  if (_atlas) return _atlas;
  const make = () => { const c = document.createElement('canvas'); c.width = AW; c.height = AH; return c; };
  const cc = make(), cm = make();
  const gc = cc.getContext('2d', { willReadFrequently: true }), gm = cm.getContext('2d', { willReadFrequently: true });
  gc.fillStyle = '#ffffff'; gc.fillRect(0, 0, AW, AH);
  gm.fillStyle = '#ffffff'; gm.fillRect(0, 0, AW, AH);
  const paint = (col, row, fn, seed) => {
    const x = col * PW, y = row * PH;
    // draw the cell 3x3 times so the gutters hold the wrapped neighbours (seamless filtering)
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        for (const g of [gc, gm]) {
          g.save();
          g.beginPath(); g.rect(x, y, PW, PH); g.clip();
          g.translate(x + GUT + dx * CW, y + GUT + dy * CH);
        }
        fn(painter(gc, gm), rng(seed));
        gc.restore(); gm.restore();
      }
    }
  };
  for (const [name, [c, r]] of Object.entries(LAYOUT)) {
    if (r === 0) {
      paint(c, 0, DRAW[name], 'u' + name);
      paint(c, 1, GROUND[name], 'g' + name);
    } else {
      paint(c, r, MATS[name], 'm' + name);
    }
  }
  const col = gc.getImageData(0, 0, AW, AH).data, mask = gm.getImageData(0, 0, AW, AH).data;
  const data = new Uint8Array(AW * AH * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = col[i]; data[i + 1] = col[i + 1]; data[i + 2] = col[i + 2]; data[i + 3] = mask[i];
  }
  const t = new THREE.DataTexture(data, AW, AH, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  _atlas = t;
  return t;
}

// --- materials ------------------------------------------------------------------------------
const VERT_PARS = 'attribute vec3 fuv;\nattribute vec4 cell;\nvarying vec3 vFuv;\nvarying vec4 vCell;\n';
const FRAG_PARS = 'uniform sampler2D cityAtlas;\nvarying vec3 vFuv;\nvarying vec4 vCell;\n';
const FRAG_MAP = `
  {
    vec2 t = vFuv.xy;
    vec2 f = fract(t);
    float gnd = vFuv.z * step(t.y, 1.0);
    vec2 auv = vec2(vCell.x + f.x * vCell.z, vCell.y + gnd + (1.0 - f.y) * vCell.w);
    vec4 tx = textureGrad(cityAtlas, auv, dFdx(t) * vCell.zw, dFdy(t) * vCell.zw);
    diffuseColor.rgb *= tx.rgb * mix(vec3(1.0), vColor, tx.a);
  }
`;

function patch(material, { haze = null } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityAtlas = { value: atlasTexture() };
    shader.vertexShader = VERT_PARS + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vFuv = fuv;\n  vCell = cell;');
    let fs = FRAG_PARS + shader.fragmentShader
      .replace('#include <map_fragment>', FRAG_MAP)
      .replace('#include <color_fragment>', '');
    if (haze) {
      // like the scene fog, but whatever rises well above the ground (domes, hills) keeps some
      // contrast: the cap goes from 1 at ground level to hazeRange.z at 40 units up
      Object.assign(shader.uniforms, haze);
      shader.vertexShader = 'varying float vHazeY;\n' + shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n  vHazeY = (modelMatrix * vec4(transformed, 1.0)).y;');
      fs = 'uniform vec3 hazeColor;\nuniform vec3 hazeRange;\nvarying float vHazeY;\n' + fs.replace('#include <fog_fragment>', `
  {
    float cap = mix(1.0, hazeRange.z, smoothstep(0.0, 40.0, vHazeY));
    float hz = min(smoothstep(hazeRange.x, hazeRange.y, vViewPosition.z), cap);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, hazeColor, hz);
  }`);
    }
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => (haze ? 'cityAtlasHaze' : 'cityAtlas');
  return material;
}

let _mats = null;
// city: buildings, walls, streets (normal scene fog). sky: the far skyline, hazed like the fog but
// capped for tall things (hazeRange = fog near, fog far, cap) so St Peter's dome rises out of it.
// The module copies the scene fog into the haze uniforms every frame.
export function cityMaterials() {
  if (_mats) return _mats;
  const hazeUniforms = { hazeColor: { value: new THREE.Color('#cfe2ea') }, hazeRange: { value: new THREE.Vector3(120, 340, 0.6) } };
  _mats = {
    city: patch(new THREE.MeshLambertMaterial({ vertexColors: true })),
    sky: patch(new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }), { haze: hazeUniforms }),
    haze: hazeUniforms,
    rail: new THREE.MeshLambertMaterial({ map: railTexture(), alphaTest: 0.5, side: THREE.DoubleSide, color: 0xffffff }),
  };
  return _mats;
}

// Black iron railing with spear tips, for fences (u = 1 per 1.2 units, v = 0..1 over the height).
function railTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = '#26272a';
  g.fillRect(0, 8, 64, 4); g.fillRect(0, 50, 64, 4);
  for (let x = 4; x < 64; x += 16) {
    g.fillRect(x, 4, 4, 60);
    g.beginPath(); g.moveTo(x - 2, 6); g.lineTo(x + 2, 0); g.lineTo(x + 6, 6); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}
