// Round badges with a picture for every tour stop, drawn on one canvas atlas (4 x 4 cells).
// Each icon is drawn around (0, 0) in a box of about +-36 px.

export const ICONS = ['view', 'clock', 'boat', 'horse', 'castle', 'theatre', 'giraffe', 'museum',
  'fountain', 'temple', 'playground', 'film', 'check'];
export const ATLAS_GRID = 4;
const CELL = 128;

const INK = '#2d2a3a';

function circle(g, x, y, r, fill, stroke = null, lw = 0) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

function poly(g, pts, fill, stroke = INK, lw = 3) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
}

function rrect(g, x, y, w, h, r, fill, stroke = INK, lw = 3) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

function line(g, x0, y0, x1, y1, color, lw) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.stroke();
}

const DRAW = {
  view(g) { // binoculars: the view over Rome from the Pincio
    for (const s of [-1, 1]) {
      rrect(g, s * 17 - 11, -26, 22, 34, 7, '#41507a');
      circle(g, s * 17, 14, 16, '#41507a', INK, 3);
      circle(g, s * 17, 14, 9.5, '#8fd6ff');
      circle(g, s * 17 - 3, 11, 3.5, '#ffffff');
    }
    rrect(g, -7, -12, 14, 14, 3, '#2f3b5e');
  },
  clock(g) { // the water clock
    circle(g, 0, 0, 33, '#ffffff', '#2f78c4', 7);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r0 = i % 3 ? 24 : 21;
      line(g, Math.sin(a) * r0, -Math.cos(a) * r0, Math.sin(a) * 27, -Math.cos(a) * 27, INK, i % 3 ? 2 : 3.5);
    }
    line(g, 0, 0, 0, -20, INK, 4.5);
    line(g, 0, 0, 13, 7, '#d8452f', 4.5);
    circle(g, 0, 0, 4, INK);
  },
  boat(g) { // rowing boat on the lake
    g.fillStyle = '#5db7e8';
    g.beginPath();
    g.moveTo(-36, 22);
    for (let x = -36; x <= 36; x += 6) g.quadraticCurveTo(x + 1.5, 16, x + 3, 20), g.quadraticCurveTo(x + 4.5, 24, x + 6, 20);
    g.lineTo(36, 36); g.lineTo(-36, 36); g.closePath(); g.fill();
    line(g, -10, -2, -33, 24, '#8a5a32', 4);
    line(g, 10, -2, 33, 24, '#8a5a32', 4);
    circle(g, 0, -18, 7, '#f1c49f', INK, 2.5);
    rrect(g, -8, -11, 16, 15, 4, '#e8564a', INK, 2.5);
    poly(g, [[-31, 2], [31, 2], [22, 20], [-22, 20]], '#c8743c');
    line(g, -27, 7, 27, 7, '#ffffff', 3);
  },
  horse(g) { // horse head (Piazza di Siena horse show)
    poly(g, [[16, 34], [20, 8], [17, -14], [12, -24], [13, -36], [5, -26], [-2, -26], [-20, -8], [-31, 6], [-30, 14],
      [-22, 18], [-12, 12], [-3, 9], [-8, 34]], '#a8682f', INK, 3.5);
    poly(g, [[13, -24], [22, -12], [26, 8], [21, 30], [16, 34], [20, 8], [17, -14]], '#4a2c17', null);
    circle(g, -6, -10, 3.5, INK);
    circle(g, -26, 9, 2, INK);
    line(g, -14, 14, 6, -2, '#e14b3b', 3);
  },
  castle(g) { // the Fortezzuola, a little fairy-tale castle
    const wall = '#e2a65a', dark = '#b9773a';
    rrect(g, -24, -6, 48, 40, 2, wall);
    for (const x of [-24, -12, 4, 16]) rrect(g, x, -14, 8, 9, 1, wall);
    for (const s of [-1, 1]) {
      rrect(g, s * 26 - 8, -20, 16, 54, 2, dark);
      for (const dx of [-8, 0]) rrect(g, s * 26 + dx + (dx ? 0 : 2), -27, 6, 8, 1, dark);
    }
    g.beginPath(); g.moveTo(-8, 34); g.lineTo(-8, 16); g.arc(0, 16, 8, Math.PI, 0); g.lineTo(8, 34); g.closePath();
    g.fillStyle = '#5a3a24'; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    line(g, 26, -27, 26, -40, INK, 2.5);
    poly(g, [[26, -40], [38, -36], [26, -32]], '#e8443a', INK, 2);
    rrect(g, -3, 0, 6, 9, 3, '#3d2a1e', null);
  },
  theatre(g) { // comedy and tragedy masks (the Globe Theatre)
    const mask = (cx, cy, rot, fill, happy) => {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.beginPath();
      g.moveTo(-17, -18); g.quadraticCurveTo(0, -26, 17, -18);
      g.quadraticCurveTo(19, 8, 0, 22); g.quadraticCurveTo(-19, 8, -17, -18);
      g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
      g.fillStyle = INK;
      for (const s of [-1, 1]) {
        g.beginPath(); g.ellipse(s * 7, -6, 4.5, happy ? 3 : 4, 0, 0, Math.PI * 2); g.fill();
      }
      g.beginPath();
      if (happy) { g.moveTo(-9, 5); g.quadraticCurveTo(0, 17, 9, 5); g.closePath(); g.fill(); }
      else { g.moveTo(-8, 12); g.quadraticCurveTo(0, 3, 8, 12); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke(); }
      g.restore();
    };
    mask(11, 4, 0.28, '#7fb6ef', false);
    mask(-11, -3, -0.25, '#ffd24a', true);
  },
  giraffe(g) { // the zoo
    const body = '#f4b740';
    poly(g, [[-2, 36], [4, -8], [-4, -18], [-22, -14], [-28, -20], [-24, -26], [-6, -32], [8, -26], [16, -8], [16, 36]], body, INK, 3.5);
    for (const [x, y, r] of [[8, 20, 4.5], [5, 6, 4], [11, 0, 3], [9, 30, 3.5], [2, 26, 2.5], [-12, -22, 2.5]]) circle(g, x, y, r, '#a8642a');
    line(g, -2, -30, -5, -40, INK, 3); circle(g, -5, -40, 3.5, '#a8642a', INK, 2);
    line(g, 5, -29, 6, -39, INK, 3); circle(g, 6, -39, 3.5, '#a8642a', INK, 2);
    circle(g, -9, -24, 3, INK);
    poly(g, [[8, -26], [17, -32], [14, -24]], body, INK, 2.5);
  },
  museum(g) { // a framed painting (Galleria Borghese)
    rrect(g, -34, -28, 68, 56, 4, '#e2a42e', INK, 3);
    g.fillStyle = '#9fd8f7'; g.fillRect(-25, -19, 50, 38);
    circle(g, 13, -9, 6, '#ffd84a');
    g.fillStyle = '#64b14a';
    g.beginPath(); g.moveTo(-25, 19); g.quadraticCurveTo(-8, -2, 6, 10); g.quadraticCurveTo(16, 2, 25, 8); g.lineTo(25, 19); g.closePath(); g.fill();
    rrect(g, -25, -19, 50, 38, 1, null, '#a8701e', 3);
  },
  fountain(g) { // Fountain of the Seahorses
    g.strokeStyle = '#3c9be0'; g.lineWidth = 4; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(s * 22, -38, s * 28, -2); g.stroke();
    }
    g.beginPath(); g.moveTo(0, -18); g.lineTo(0, -32); g.stroke();
    for (const [x, y] of [[-30, 4], [30, 4], [-20, 8], [20, 8]]) circle(g, x, y, 2.5, '#3c9be0');
    rrect(g, -6, -18, 12, 26, 2, '#e8e2d2');
    poly(g, [[-16, -16], [16, -16], [10, -10], [-10, -10]], '#e8e2d2', INK, 2.5);
    rrect(g, -34, 10, 68, 10, 3, '#5db7e8', INK, 3);
    poly(g, [[-36, 18], [36, 18], [30, 32], [-30, 32]], '#e8e2d2', INK, 3);
  },
  temple(g) { // a little round temple (Temple of Diana)
    const stone = '#f3ead6';
    poly(g, [[-34, -12], [0, -34], [34, -12]], stone, INK, 3);
    rrect(g, -32, -13, 64, 7, 1, stone);
    for (const x of [-24, -10, 4, 18]) rrect(g, x, -6, 7, 30, 1, stone, INK, 2.5);
    rrect(g, -34, 24, 68, 6, 1, stone);
    rrect(g, -38, 30, 76, 6, 1, '#d9cfb8');
    circle(g, 0, -20, 3.5, '#d9b44a');
  },
  playground(g) { // slide (Casina di Raffaello)
    line(g, 16, -30, 16, 32, INK, 4);
    line(g, 30, -30, 30, 32, INK, 4);
    for (let y = -22; y <= 28; y += 10) line(g, 16, y, 30, y, INK, 3);
    g.beginPath();
    g.moveTo(16, -30); g.quadraticCurveTo(-6, -24, -12, 12); g.quadraticCurveTo(-16, 28, -34, 30);
    g.lineTo(-34, 20); g.quadraticCurveTo(-24, 20, -22, 8); g.quadraticCurveTo(-16, -30, 16, -40); g.closePath();
    g.fillStyle = '#ef4f3f'; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    rrect(g, 12, -40, 22, 8, 2, '#4f9de0');
  },
  film(g) { // clapperboard (Cinema dei Piccoli)
    rrect(g, -30, -6, 60, 38, 3, '#2e2e38');
    line(g, -22, 6, 22, 6, '#ffffff', 3); line(g, -22, 16, 10, 16, '#ffffff', 3);
    g.save(); g.translate(-30, -8); g.rotate(-0.32);
    rrect(g, 0, -12, 62, 12, 2, '#2e2e38');
    g.fillStyle = '#ffffff';
    for (let x = 6; x < 58; x += 14) { g.beginPath(); g.moveTo(x, -12); g.lineTo(x + 7, -12); g.lineTo(x + 2, 0); g.lineTo(x - 5, 0); g.closePath(); g.fill(); }
    g.restore();
    circle(g, -30, -7, 3, '#e8b33a');
  },
  check(g) {
    g.strokeStyle = '#ffffff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-20, 0); g.lineTo(-6, 15); g.lineTo(21, -15); g.stroke();
  },
};

// Draws the atlas: a cream badge with a golden rim for the stops, a green badge for "visited".
export function drawAtlas(g) {
  g.clearRect(0, 0, CELL * ATLAS_GRID, CELL * ATLAS_GRID);
  ICONS.forEach((name, i) => {
    const cx = (i % ATLAS_GRID) * CELL + CELL / 2, cy = Math.floor(i / ATLAS_GRID) * CELL + CELL / 2;
    g.save();
    g.translate(cx, cy);
    const glow = g.createRadialGradient(0, 0, 44, 0, 0, 63);
    glow.addColorStop(0, 'rgba(255,236,170,0.75)');
    glow.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = glow; g.fillRect(-64, -64, 128, 128);
    const done = name === 'check';
    circle(g, 0, 2, 52, 'rgba(60,40,10,0.35)');
    circle(g, 0, 0, 52, done ? '#2f9e44' : '#d99a1c');
    circle(g, 0, 0, 45, done ? '#43b95a' : '#fff8e8');
    if (!done) circle(g, 0, 0, 45, null, '#f4c64e', 3);
    g.lineJoin = 'round'; g.lineCap = 'round';
    DRAW[name](g);
    g.restore();
  });
}
