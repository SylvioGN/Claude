// One 1024x1024 canvas holding every painted surface of the south landmarks: the Cinema dei Piccoli
// sign and film posters, the Casa del Cinema sign and banners, the open-air screen picture and the
// Galoppatoio sign. Rects are [x0, y0, x1, y1] in pixels.
import { canvasTexture, roundRect } from '../../core/util.js';

export const ATLAS_SIZE = 1024;
export const RECT = {
  cinemaSign: [0, 0, 1024, 200],
  casaSign: [0, 208, 1024, 320],
  galoppatoioSign: [0, 328, 1024, 448],
  posters: [[0, 456, 256, 816], [256, 456, 512, 816], [512, 456, 768, 816], [768, 456, 1024, 816]],
  screen: [0, 824, 512, 1024],
  banner: [520, 824, 600, 1024],
  ticket: [608, 824, 1024, 920],
  record: [608, 928, 1024, 1024],
};

const FONT = '"Trebuchet MS", "Verdana", system-ui, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function fitText(g, text, maxW, size, weight = 800, family = FONT) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

function star(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

function filmStrip(g, x, y, w, h) {
  g.fillStyle = '#2b2b2e';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#f4ead2';
  const n = Math.floor(h / 18);
  for (let i = 0; i < n; i++) {
    g.fillRect(x + 5, y + 6 + i * 18, 8, 9);
    g.fillRect(x + w - 13, y + 6 + i * 18, 8, 9);
  }
  g.fillStyle = '#7fc4e8';
  g.fillRect(x + 18, y + 10, w - 36, h / 2 - 16);
  g.fillStyle = '#f2c14e';
  g.fillRect(x + 18, y + h / 2 + 6, w - 36, h / 2 - 16);
}

function cinemaSign(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#7a2e22';
  roundRect(g, x0 + 4, y0 + 4, w - 8, h - 8, 34); g.fill();
  g.fillStyle = '#fff3d6';
  roundRect(g, x0 + 18, y0 + 18, w - 36, h - 36, 24); g.fill();
  filmStrip(g, x0 + 30, y0 + 30, 64, h - 60);
  filmStrip(g, x1 - 94, y0 + 30, 64, h - 60);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'CINEMA DEI PICCOLI', w - 260, 92);
  g.lineWidth = 10; g.strokeStyle = '#7a2e22'; g.lineJoin = 'round';
  g.strokeText('CINEMA DEI PICCOLI', x0 + w / 2, y0 + h / 2 - 6);
  g.fillStyle = '#e8463a';
  g.fillText('CINEMA DEI PICCOLI', x0 + w / 2, y0 + h / 2 - 6);
  for (let i = 0; i < 5; i++) star(g, x0 + w / 2 - 160 + i * 80, y1 - 34, 12, '#f2b33d');
}

function casaSign(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#f6efdf';
  g.fillRect(x0, y0, w, h);
  g.strokeStyle = '#8c3b2f'; g.lineWidth = 6;
  g.strokeRect(x0 + 8, y0 + 8, w - 16, h - 16);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'CASA DEL CINEMA', w - 120, 76, 700, SERIF);
  g.fillStyle = '#4a2a20';
  g.fillText('CASA DEL CINEMA', x0 + w / 2, y0 + h / 2 + 3);
}

function galoppatoioSign(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#2f5d3a';
  roundRect(g, x0 + 4, y0 + 4, w - 8, h - 8, 28); g.fill();
  g.strokeStyle = '#f4ecd8'; g.lineWidth = 6;
  roundRect(g, x0 + 16, y0 + 16, w - 32, h - 32, 20); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'GALOPPATOIO', w - 300, 80);
  g.fillStyle = '#fff8e6';
  g.fillText('GALOPPATOIO', x0 + w / 2, y0 + h / 2 + 4);
  // horseshoes
  for (const cx of [x0 + 90, x1 - 90]) {
    g.strokeStyle = '#e9c46a'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, y0 + h / 2 + 8, 30, Math.PI * 0.85, Math.PI * 2.15, false); g.stroke();
  }
}

// Kid-friendly film posters.
function poster(g, rect, i) {
  const [x0, y0, x1, y1] = rect;
  const w = x1 - x0, h = y1 - y0;
  const bgs = ['#5cb3e6', '#1f4e8c', '#20264d', '#f4a948'];
  const titles = ['IL DRAGHETTO', 'PIRATI!', 'LA LUNA', 'GELATO!'];
  g.save();
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = '#f7f0dc'; g.fillRect(x0, y0, w, h);
  g.fillStyle = bgs[i]; g.fillRect(x0 + 10, y0 + 10, w - 20, h - 20);
  const cx = x0 + w / 2, cy = y0 + h * 0.48;
  if (i === 0) { // little green dragon on a hill
    g.fillStyle = '#7cc56b'; g.beginPath(); g.ellipse(cx, y1 - 40, w * 0.6, 80, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#3f9a4c';
    g.beginPath(); g.ellipse(cx, cy + 20, 62, 50, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 50, cy - 40, 38, 32, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c14e';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - 40 + k * 22, cy - 22); g.lineTo(cx - 30 + k * 22, cy - 46); g.lineTo(cx - 20 + k * 22, cy - 22); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + 60, cy - 48, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(cx + 63, cy - 48, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff7a3d'; g.beginPath(); g.moveTo(cx + 86, cy - 36); g.lineTo(cx + 120, cy - 52); g.lineTo(cx + 118, cy - 22); g.fill();
  } else if (i === 1) { // pirate ship on the waves
    g.fillStyle = '#2f7fbf'; g.fillRect(x0 + 10, cy + 50, w - 20, h);
    g.fillStyle = '#7a4a2a';
    g.beginPath(); g.moveTo(cx - 80, cy + 30); g.lineTo(cx + 80, cy + 30); g.lineTo(cx + 55, cy + 70); g.lineTo(cx - 55, cy + 70); g.fill();
    g.fillStyle = '#4a3020'; g.fillRect(cx - 4, cy - 80, 8, 112);
    g.fillStyle = '#fbf6e8';
    g.beginPath(); g.moveTo(cx - 60, cy - 66); g.quadraticCurveTo(cx - 20, cy - 30, cx - 60, cy + 18); g.lineTo(cx - 6, cy + 18); g.lineTo(cx - 6, cy - 66); g.fill();
    g.beginPath(); g.moveTo(cx + 6, cy - 70); g.lineTo(cx + 64, cy - 70); g.quadraticCurveTo(cx + 40, cy - 26, cx + 64, cy + 18); g.lineTo(cx + 6, cy + 18); g.fill();
    g.fillStyle = '#222'; g.fillRect(cx + 4, cy - 100, 34, 22);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + 21, cy - 89, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d7efff'; g.lineWidth = 6;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x0 + 30 + k * 66, cy + 92, 22, Math.PI, 0); g.stroke(); }
  } else if (i === 2) { // rocket to the moon
    for (let k = 0; k < 26; k++) star(g, x0 + 20 + ((k * 73) % (w - 40)), y0 + 30 + ((k * 41) % (h - 120)), 5 + (k % 3) * 2, '#fff6c8');
    g.fillStyle = '#f4e9b8'; g.beginPath(); g.arc(cx + 50, cy - 70, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8c98e'; g.beginPath(); g.arc(cx + 34, cy - 84, 10, 0, Math.PI * 2); g.arc(cx + 66, cy - 56, 8, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(cx - 30, cy + 40); g.rotate(-0.5);
    g.fillStyle = '#e8463a'; g.beginPath(); g.moveTo(0, -80); g.quadraticCurveTo(30, -40, 24, 40); g.lineTo(-24, 40); g.quadraticCurveTo(-30, -40, 0, -80); g.fill();
    g.fillStyle = '#7fc4e8'; g.beginPath(); g.arc(0, -20, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2b33d'; g.beginPath(); g.moveTo(-18, 40); g.lineTo(0, 86); g.lineTo(18, 40); g.fill();
    g.restore();
  } else { // a happy gelato cone
    g.fillStyle = '#d99a52';
    g.beginPath(); g.moveTo(cx - 50, cy); g.lineTo(cx + 50, cy); g.lineTo(cx, cy + 130); g.fill();
    g.fillStyle = '#f6c6d8'; g.beginPath(); g.arc(cx - 26, cy - 14, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a7dd8a'; g.beginPath(); g.arc(cx + 26, cy - 14, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(cx, cy - 58, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8463a'; g.beginPath(); g.arc(cx, cy - 102, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#222';
    g.beginPath(); g.arc(cx - 14, cy - 60, 5, 0, Math.PI * 2); g.arc(cx + 14, cy - 60, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy - 52, 14, 0.2, Math.PI - 0.2); g.stroke();
  }
  // title band
  g.fillStyle = 'rgba(255,248,230,0.92)';
  g.fillRect(x0 + 10, y1 - 86, w - 20, 66);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, titles[i], w - 40, 40);
  g.fillStyle = '#7a2e22';
  g.fillText(titles[i], cx, y1 - 52);
  g.restore();
  g.strokeStyle = '#c9a05a'; g.lineWidth = 8; g.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
}

// The open-air screen: a sunny cartoon of the park with a little white cart.
function screenPicture(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  const sky = g.createLinearGradient(0, y0, 0, y1);
  sky.addColorStop(0, '#7cc3f0'); sky.addColorStop(1, '#d9f0ff');
  g.fillStyle = sky; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#ffd95a'; g.beginPath(); g.arc(x0 + w * 0.8, y0 + 46, 28, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#86c45a'; g.beginPath(); g.ellipse(x0 + w * 0.3, y1, w * 0.45, 80, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#6aae47'; g.beginPath(); g.ellipse(x0 + w * 0.78, y1, w * 0.4, 64, 0, Math.PI, 0); g.fill();
  for (const [tx, s] of [[0.14, 1], [0.5, 0.8], [0.9, 1.1]]) { // umbrella pines
    const px = x0 + w * tx;
    g.fillStyle = '#7a5534'; g.fillRect(px - 4 * s, y1 - 120 * s, 8 * s, 90 * s);
    g.fillStyle = '#3e6b35'; g.beginPath(); g.ellipse(px, y1 - 124 * s, 52 * s, 20 * s, 0, 0, Math.PI * 2); g.fill();
  }
  const cx = x0 + w * 0.42, cy = y1 - 44;
  g.fillStyle = '#ffffff'; roundRect(g, cx - 46, cy - 26, 92, 30, 8); g.fill();
  g.fillStyle = '#f3f3f3'; g.fillRect(cx - 50, cy - 62, 100, 8);
  g.fillStyle = '#555'; g.fillRect(cx - 40, cy - 56, 4, 32); g.fillRect(cx + 36, cy - 56, 4, 32);
  g.fillStyle = '#2b2b2e'; g.beginPath(); g.arc(cx - 26, cy + 6, 10, 0, Math.PI * 2); g.arc(cx + 26, cy + 6, 10, 0, Math.PI * 2); g.fill();
  const heads = ['#c8413f', '#a9c9e8', '#7f9a8c', '#efe3cc'];
  heads.forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(cx - 27 + k * 18, cy - 36, 7, 0, Math.PI * 2); g.fill(); });
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 10; g.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
}

function banner(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#b8322d'; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#f4ead2';
  g.fillRect(x0 + 8, y0 + 10, w - 16, 6);
  g.fillRect(x0 + 8, y1 - 16, w - 16, 6);
  star(g, x0 + w / 2, y0 + 46, 22, '#f2c14e');
  g.save(); g.translate(x0 + w / 2, y0 + h * 0.62); g.rotate(-Math.PI / 2);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'FILM', h * 0.55, 46);
  g.fillStyle = '#fff8e6'; g.fillText('FILM', 0, 2);
  g.restore();
}

function ticketSign(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff6e3' : '#d8443a'; g.fillRect(x0 + (i * w) / 8, y0, w / 8 + 1, h); }
  g.fillStyle = 'rgba(255,246,227,0.95)'; roundRect(g, x0 + 70, y0 + 18, w - 140, h - 36, 14); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'BIGLIETTI', w - 170, 44);
  g.fillStyle = '#7a2e22'; g.fillText('BIGLIETTI', x0 + w / 2, y0 + h / 2 + 2);
}

function recordPlaque(g, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0;
  g.fillStyle = '#1e3f73'; roundRect(g, x0 + 4, y0 + 4, w - 8, h - 8, 16); g.fill();
  star(g, x0 + 46, y0 + h / 2, 26, '#f2c14e');
  star(g, x1 - 46, y0 + h / 2, 26, '#f2c14e');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, 'WORLD RECORD!', w - 130, 40);
  g.fillStyle = '#fff6e3'; g.fillText('WORLD RECORD!', x0 + w / 2, y0 + h / 2 + 2);
}

export function createAtlas() {
  return canvasTexture(ATLAS_SIZE, ATLAS_SIZE, (g) => {
    g.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    cinemaSign(g, RECT.cinemaSign);
    casaSign(g, RECT.casaSign);
    galoppatoioSign(g, RECT.galoppatoioSign);
    RECT.posters.forEach((r, i) => poster(g, r, i));
    screenPicture(g, RECT.screen);
    banner(g, RECT.banner);
    ticketSign(g, RECT.ticket);
    recordPlaque(g, RECT.record);
  }, { wrap: false });
}
