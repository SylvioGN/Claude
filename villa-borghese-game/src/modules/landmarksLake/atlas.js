// One canvas atlas for every painted or carved detail of the lake-garden landmarks, so all of
// them render in a single draw call: inscriptions, the temple's stucco relief, hieroglyphs,
// signs. Regions are returned as uv rects [u0, v0, u1, v1].
import { canvasTexture } from '../../core/util.js';

const W = 1024, H = 1024;
const SERIF = 'Georgia, "Times New Roman", serif';

const LAYOUT = {
  templeFrieze: [0, 0, 512, 64],
  bilotti: [512, 0, 512, 64],
  archAttic: [0, 64, 512, 128],
  tympanum: [512, 64, 512, 128],
  glyphPanel: [0, 192, 256, 512],
  obelisk: [256, 192, 64, 512],
  sunDisk: [320, 192, 256, 64],
  glyphFrieze: [576, 192, 448, 64],
  boatSign: [320, 256, 512, 128],
  felixRelief: [320, 384, 256, 256],
  felixText: [576, 384, 448, 64],
  gnamFrieze: [576, 448, 448, 64],
  gnamText: [0, 704, 1024, 64],
  shutter: [832, 256, 64, 128],
};

export function createAtlas(rnd) {
  const R = {};
  for (const [k, [x, y, w, h]] of Object.entries(LAYOUT)) R[k] = [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H];
  const texture = canvasTexture(W, H, (g) => {
    g.fillStyle = '#e9e1cf';
    g.fillRect(0, 0, W, H);
    const at = (name, fn) => { const [x, y, w, h] = LAYOUT[name]; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); fn(w, h); g.restore(); };

    at('templeFrieze', (w, h) => carvedText(g, 'ΑΣΚΛΗΠΙΩΙ  ΣΩΤΗΡΙ', w, h, '#e7dfcc', 40));
    at('bilotti', (w, h) => {
      g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5a4b3a'; g.font = `600 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('MUSEO CARLO BILOTTI', w / 2, h / 2 + 2);
    });
    at('archAttic', (w, h) => {
      g.fillStyle = '#e4dac4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8bb9e'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#6a5d4a';
      g.font = `700 30px ${SERIF}`; g.fillText('SENATVS POPVLVSQVE ROMANVS', w / 2, h * 0.36);
      g.font = `600 22px ${SERIF}`; g.fillText('IMP · CAES · L · SEPTIMIO · SEVERO', w / 2, h * 0.68);
    });
    at('tympanum', (w, h) => tympanumRelief(g, w, h));
    at('glyphPanel', (w, h) => glyphPanel(g, w, h, rnd));
    at('obelisk', (w, h) => {
      g.fillStyle = '#c99886'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, rnd, ['#b8836f', '#d8ab99', '#a87664'], 500);
      for (let y = 30; y < h - 30; y += 54) glyph(g, rnd, w / 2, y, 46, '#6e4639');
    });
    at('sunDisk', (w, h) => {
      g.fillStyle = '#e6c98f'; g.fillRect(0, 0, w, h);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          g.fillStyle = ['#2f5f9e', '#3e7f4f', '#b0402c', '#2f5f9e'][k];
          g.beginPath();
          g.moveTo(w / 2 + s * 22, h / 2 - 12 + k * 7);
          g.quadraticCurveTo(w / 2 + s * 70, h / 2 - 26 + k * 6, w / 2 + s * (120 - k * 14), h / 2 - 16 + k * 9);
          g.lineTo(w / 2 + s * (120 - k * 14), h / 2 - 8 + k * 9);
          g.quadraticCurveTo(w / 2 + s * 70, h / 2 - 16 + k * 6, w / 2 + s * 22, h / 2 - 4 + k * 7);
          g.fill();
        }
        g.fillStyle = '#3e7f4f';
        g.fillRect(w / 2 + s * 24 - 4, h / 2 - 2, 8, 22); // uraeus
      }
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(w / 2, h / 2, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0a63a'; g.beginPath(); g.arc(w / 2, h / 2, 13, 0, Math.PI * 2); g.fill();
    });
    at('glyphFrieze', (w, h) => {
      g.fillStyle = '#e6c98f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f5f9e'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
      for (let x = 24; x < w - 10; x += 38) glyph(g, rnd, x, h / 2, 32, null);
    });
    at('boatSign', (w, h) => {
      g.fillStyle = '#2f6b4a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f4ead2'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#fff6e3'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 46px system-ui, sans-serif`; g.fillText('NOLEGGIO BARCHE', w / 2 + 40, h * 0.4);
      g.font = `600 26px system-ui, sans-serif`; g.fillText('BOAT RENTAL', w / 2 + 40, h * 0.74);
      // little rowing boat
      g.fillStyle = '#f2c14e';
      g.beginPath(); g.moveTo(26, 62); g.lineTo(104, 62); g.lineTo(90, 86); g.lineTo(38, 86); g.closePath(); g.fill();
      g.strokeStyle = '#f2c14e'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(40, 40); g.lineTo(96, 100); g.stroke();
      g.fillStyle = '#8ec5e8'; g.fillRect(20, 92, 92, 8);
    });
    at('felixRelief', (w, h) => felixRelief(g, w, h));
    at('felixText', (w, h) => carvedText(g, 'AQVA · FELIX', w, h, '#e4dac4', 40));
    at('gnamFrieze', (w, h) => {
      g.fillStyle = '#ece6d8'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) {
        // garland swag between rosettes
        g.strokeStyle = '#c9bfa8'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(x + 8, 18); g.quadraticCurveTo(x + 32, 56, x + 56, 18); g.stroke();
        g.fillStyle = '#d3c9b2'; g.beginPath(); g.arc(x + 4, 16, 8, 0, Math.PI * 2); g.fill();
      }
    });
    at('gnamText', (w, h) => carvedText(g, "GALLERIA NAZIONALE D'ARTE MODERNA", w, h, '#f1ece0', 40, '#5d574c'));
    at('shutter', (w, h) => {
      g.fillStyle = '#4f7d55'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3f6a46';
      for (let y = 6; y < h; y += 9) g.fillRect(4, y, w - 8, 4);
    });
  }, { wrap: false });
  return { texture, R };
}

function carvedText(g, text, w, h, bg, size, ink = '#5b5246') {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.font = `700 ${size}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = size;
  while (g.measureText(text).width > w - 24 && s > 10) { s -= 2; g.font = `700 ${s}px ${SERIF}`; }
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText(text, w / 2 + 1.5, h / 2 + 3.5);
  g.fillStyle = ink; g.fillText(text, w / 2, h / 2 + 2);
}

function speckle(g, w, h, rnd, colors, n) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[i % colors.length];
    g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 2, 2 + rnd() * 2);
  }
}

// Stucco relief in the pediment: the god's serpent arriving in Rome by ship, figures greeting it.
function tympanumRelief(g, w, h) {
  g.fillStyle = '#ddd3bd'; g.fillRect(0, 0, w, h);
  const fig = (x, y, s, lean = 0) => {
    for (const [dx, dy, c] of [[2, 2, '#bfb39a'], [0, 0, '#f4efe2']]) {
      g.fillStyle = c;
      g.beginPath(); g.arc(x + dx + lean * 6, y + dy - s * 1.05, s * 0.22, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(x + dx - s * 0.28 + lean * 4, y + dy - s * 0.8);
      g.lineTo(x + dx + s * 0.28 + lean * 4, y + dy - s * 0.8);
      g.lineTo(x + dx + s * 0.38, y + dy);
      g.lineTo(x + dx - s * 0.38, y + dy);
      g.closePath(); g.fill();
    }
  };
  // ship on the left with a coiled serpent
  for (const [dx, dy, c] of [[2, 2, '#bfb39a'], [0, 0, '#f4efe2']]) {
    g.fillStyle = c;
    g.beginPath(); g.moveTo(120 + dx, 100 + dy); g.lineTo(230 + dx, 100 + dy); g.lineTo(212 + dx, 118 + dy); g.lineTo(136 + dx, 118 + dy); g.closePath(); g.fill();
    g.fillRect(168 + dx, 52 + dy, 5, 48);
    g.beginPath(); g.moveTo(174 + dx, 56 + dy); g.lineTo(214 + dx, 84 + dy); g.lineTo(174 + dx, 92 + dy); g.closePath(); g.fill();
  }
  g.strokeStyle = '#f4efe2'; g.lineWidth = 6;
  g.beginPath(); g.arc(150, 92, 9, Math.PI, Math.PI * 2.6); g.stroke();
  // central god figure and greeting figures
  fig(w / 2, 118, 70);
  fig(w / 2 + 70, 118, 54, -1);
  fig(w / 2 + 120, 118, 44, -1);
  fig(w / 2 - 52, 118, 52, 1);
  // a reclining river god (the Tiber) on the right corner
  for (const [dx, dy, c] of [[2, 2, '#bfb39a'], [0, 0, '#f4efe2']]) {
    g.fillStyle = c;
    g.beginPath(); g.ellipse(410 + dx, 112 + dy, 44, 9, -0.1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(372 + dx, 98 + dy, 9, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#b8ab90'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h - 2); g.lineTo(w, h - 2); g.stroke();
}

// Relief panel of the Acqua Felix fountain: a reclining river god pouring water from an urn.
function felixRelief(g, w, h) {
  g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b9ac90'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  for (const [dx, dy, c] of [[3, 3, '#b3a688'], [0, 0, '#f1ebdc']]) {
    g.fillStyle = c;
    g.beginPath(); g.ellipse(120 + dx, 168 + dy, 78, 20, -0.15, 0, Math.PI * 2); g.fill();   // body
    g.beginPath(); g.ellipse(70 + dx, 128 + dy, 22, 34, 0.3, 0, Math.PI * 2); g.fill();      // torso
    g.beginPath(); g.arc(62 + dx, 88 + dy, 17, 0, Math.PI * 2); g.fill();                     // head
    g.beginPath(); g.ellipse(190 + dx, 140 + dy, 24, 30, 0.6, 0, Math.PI * 2); g.fill();     // urn
  }
  g.fillStyle = '#9cc6dc';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(206 + i * 4, 176 + i * 9, 6, 9, 0.4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#8fb9cf'; g.lineWidth = 4;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(14, 214 + i * 10); g.bezierCurveTo(80, 204 + i * 10, 150, 224 + i * 10, 242, 210 + i * 10); g.stroke(); }
}

// A column-and-cartouche wall of painted hieroglyphs, big enough to read from the avenue.
function glyphPanel(g, w, h, rnd) {
  g.fillStyle = '#e6c98f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f5f9e'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
  g.fillStyle = '#b0402c'; g.fillRect(0, 12, w, 6); g.fillRect(0, h - 18, w, 6);
  const cols = 2, cw = w / cols;
  g.strokeStyle = '#8a6a3a'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cw, 24); g.lineTo(cw, h - 24); g.stroke();
  g.strokeStyle = '#2a241c'; g.lineWidth = 4;
  roundRectPath(g, cw + 10, 150, cw - 20, 230, 40); g.stroke();
  for (let c = 0; c < cols; c++) {
    for (let y = 62; y < h - 40; y += 74) glyph(g, rnd, c * cw + cw / 2, y, 58, null);
  }
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// One simple hieroglyph at (x, y) of size s. ink: fixed colour (carved) or null (painted colours).
function glyph(g, rnd, x, y, s, ink) {
  const paint = ['#2f5f9e', '#b0402c', '#3e7f4f', '#2a241c'];
  const col = ink || paint[Math.floor(rnd() * paint.length)];
  g.fillStyle = col; g.strokeStyle = col;
  g.lineWidth = Math.max(2, s * 0.09);
  g.lineCap = 'round';
  const k = Math.floor(rnd() * 9);
  const u = s / 2;
  g.beginPath();
  switch (k) {
    case 0: // bird
      g.ellipse(x, y, u * 0.55, u * 0.35, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + u * 0.45, y - u * 0.45, u * 0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x - u * 0.1, y + u * 0.3); g.lineTo(x - u * 0.1, y + u * 0.8); g.moveTo(x + u * 0.15, y + u * 0.3); g.lineTo(x + u * 0.15, y + u * 0.8); g.stroke();
      break;
    case 1: // eye
      g.ellipse(x, y, u * 0.7, u * 0.32, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, u * 0.16, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x - u * 0.2, y + u * 0.3); g.lineTo(x - u * 0.35, y + u * 0.8); g.stroke();
      break;
    case 2: // ankh
      g.ellipse(x, y - u * 0.45, u * 0.25, u * 0.32, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - u * 0.5, y); g.lineTo(x + u * 0.5, y); g.moveTo(x, y - u * 0.12); g.lineTo(x, y + u * 0.85); g.stroke();
      break;
    case 3: // water
      for (let i = 0; i < 2; i++) {
        g.beginPath();
        for (let t = 0; t <= 6; t++) g.lineTo(x - u * 0.8 + t * u * 0.27, y - u * 0.25 + i * u * 0.5 + (t % 2 ? -u * 0.15 : u * 0.15));
        g.stroke();
      }
      break;
    case 4: // reed leaf
      g.moveTo(x, y + u * 0.8); g.quadraticCurveTo(x + u * 0.5, y, x, y - u * 0.8); g.quadraticCurveTo(x - u * 0.1, y, x, y + u * 0.8); g.fill();
      break;
    case 5: // snake
      g.moveTo(x - u * 0.7, y + u * 0.4);
      g.bezierCurveTo(x - u * 0.2, y + u * 0.6, x - u * 0.2, y - u * 0.2, x + u * 0.3, y);
      g.lineTo(x + u * 0.6, y - u * 0.6); g.stroke();
      break;
    case 6: // sun
      g.arc(x, y, u * 0.45, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, u * 0.12, 0, Math.PI * 2); g.fill();
      break;
    case 7: // seated figure
      g.arc(x, y - u * 0.55, u * 0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x - u * 0.15, y - u * 0.35); g.lineTo(x + u * 0.25, y - u * 0.35); g.lineTo(x + u * 0.25, y + u * 0.2); g.lineTo(x + u * 0.6, y + u * 0.2); g.lineTo(x + u * 0.6, y + u * 0.75); g.lineTo(x - u * 0.15, y + u * 0.75); g.closePath(); g.fill();
      break;
    default: // scarab
      g.ellipse(x, y, u * 0.35, u * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); for (const sx of [-1, 1]) for (const dy of [-0.3, 0, 0.3]) { g.moveTo(x + sx * u * 0.3, y + dy * u); g.lineTo(x + sx * u * 0.65, y + dy * u + u * 0.1); } g.stroke();
  }
}
