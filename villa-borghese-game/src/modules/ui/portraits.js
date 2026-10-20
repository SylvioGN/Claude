// Cute 2D portraits of the riders (src/data/family.js) for the "Who drives?" picker.
// Drawn on a 100x100 design grid; the child is drawn smaller and lower.
import { shade } from './icons.js';

export const PORTRAIT_BG = ['#bfe3ff', '#ffe28f', '#c6efd2', '#ffc9dc', '#ffd6ad', '#ddd0ff', '#b9ead8'];

function ell(g, x, y, rx, ry, fill, a0 = 0, a1 = Math.PI * 2) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, a0, a1);
  g.fillStyle = fill;
  g.fill();
}

export function drawPortrait(canvas, p, bg) {
  const g = canvas.getContext('2d');
  const S = canvas.width / 100;
  g.setTransform(S, 0, 0, S, 0, 0);
  g.clearRect(0, 0, 100, 100);
  g.save();
  g.beginPath(); g.arc(50, 50, 50, 0, Math.PI * 2); g.clip();
  const bgGrad = g.createRadialGradient(50, 34, 6, 50, 50, 60);
  bgGrad.addColorStop(0, shade(bg, 0.45));
  bgGrad.addColorStop(1, bg);
  g.fillStyle = bgGrad; g.fillRect(0, 0, 100, 100);

  const child = p.age === 'child';
  const k = child ? 0.8 : 1;
  g.translate(50, child ? 60 : 52);
  g.scale(k, k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const skin = p.skin, skinD = shade(p.skin, -0.14);
  const hair = p.hair, hairD = shade(p.hair, -0.25);
  const bw = 34 * (p.build || 1) + 4;

  // hair behind the head
  if (p.hairStyle === 'long') {
    g.beginPath();
    g.moveTo(-22, -10); g.bezierCurveTo(-26, 10, -26, 28, -20, 38);
    g.lineTo(20, 38); g.bezierCurveTo(26, 28, 26, 10, 22, -10); g.closePath();
    g.fillStyle = hairD; g.fill();
  } else if (p.hairStyle === 'bob') {
    g.beginPath();
    g.moveTo(-23, -10); g.bezierCurveTo(-25, 4, -24, 14, -20, 17);
    g.lineTo(20, 17); g.bezierCurveTo(24, 14, 25, 4, 23, -10); g.closePath();
    g.fillStyle = hairD; g.fill();
  } else if (p.hairStyle === 'bun') {
    ell(g, 0, -30, 9.5, 8.5, hair);
  }

  // body + clothes
  g.beginPath();
  g.moveTo(-bw, 52); g.bezierCurveTo(-bw, 30, -bw * 0.72, 22, -10, 20);
  g.lineTo(10, 20); g.bezierCurveTo(bw * 0.72, 22, bw, 30, bw, 52); g.closePath();
  if (p.topStyle === 'tank') {
    g.fillStyle = skin; g.fill();
    g.beginPath();
    g.moveTo(-bw * 0.62, 52); g.lineTo(-bw * 0.55, 27); g.lineTo(-13, 22); g.quadraticCurveTo(0, 32, 13, 22);
    g.lineTo(bw * 0.55, 27); g.lineTo(bw * 0.62, 52); g.closePath();
  }
  g.fillStyle = p.top; g.fill();
  const topD = shade(p.top, -0.2), topL = shade(p.top, 0.35);

  // neck
  g.fillStyle = skinD;
  g.beginPath(); g.moveTo(-7, 8); g.lineTo(-7.5, 22); g.quadraticCurveTo(0, 27, 7.5, 22); g.lineTo(7, 8); g.closePath(); g.fill();

  if (p.topStyle === 'tshirt') {
    ell(g, 0, 21, 9, 4.6, topD, 0, Math.PI);
  } else if (p.topStyle === 'polo') {
    g.fillStyle = topL;
    g.beginPath(); g.moveTo(-10, 19); g.lineTo(-1, 27); g.lineTo(-12, 27); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(10, 19); g.lineTo(1, 27); g.lineTo(12, 27); g.closePath(); g.fill();
    g.strokeStyle = topD; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, 26); g.lineTo(0, 36); g.stroke();
    ell(g, 0, 29.5, 1.1, 1.1, '#f6f2ea'); ell(g, 0, 33.5, 1.1, 1.1, '#f6f2ea');
  } else if (p.topStyle === 'blouse') {
    g.fillStyle = topL;
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 1.15;
      ell(g, Math.sin(a) * 12, 21 + (1 - Math.cos(a)) * 5, 3.6, 3, topL);
    }
    ell(g, 0, 21, 7, 3.4, skinD, 0, Math.PI);
  } else if (p.topStyle === 'jacket') {
    g.fillStyle = '#f3ede2';
    g.beginPath(); g.moveTo(-8, 20); g.lineTo(8, 20); g.lineTo(4, 52); g.lineTo(-4, 52); g.closePath(); g.fill();
    g.fillStyle = topD;
    g.beginPath(); g.moveTo(-9, 19); g.lineTo(-2, 34); g.lineTo(-7, 52); g.lineTo(-14, 52); g.lineTo(-14, 24); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(9, 19); g.lineTo(2, 34); g.lineTo(7, 52); g.lineTo(14, 52); g.lineTo(14, 24); g.closePath(); g.fill();
  } else if (p.topStyle === 'tank') {
    ell(g, 0, 22, 7, 2.6, skinD, 0, Math.PI);
  }
  if (p.bag) {
    g.strokeStyle = p.bag; g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(-bw * 0.62, 25); g.lineTo(bw * 0.7, 52); g.stroke();
  }

  // head
  ell(g, -19.5, 0, 4, 5.6, skinD);
  ell(g, 19.5, 0, 4, 5.6, skinD);
  ell(g, 0, -3, 19.5, 22, skin);

  // hair on top
  g.fillStyle = hair;
  if (p.hairStyle === 'short') {
    g.beginPath();
    g.moveTo(-20, -2); g.bezierCurveTo(-22, -22, -10, -28, 2, -27);
    g.bezierCurveTo(14, -27, 22, -19, 20, -2);
    g.bezierCurveTo(18, -10, 14, -14, 8, -15);
    g.bezierCurveTo(2, -12, -8, -12, -13, -15);
    g.bezierCurveTo(-17, -12, -19, -8, -20, -2); g.fill();
  } else if (p.hairStyle === 'long' || p.hairStyle === 'bob') {
    g.beginPath();
    g.moveTo(-21, 8); g.bezierCurveTo(-24, -20, -12, -28, 0, -27);
    g.bezierCurveTo(12, -28, 24, -20, 21, 8);
    g.bezierCurveTo(18, -4, 14, -12, 4, -15);
    g.bezierCurveTo(-4, -10, -12, -10, -16, -12);
    g.bezierCurveTo(-18, -6, -19, 0, -21, 8); g.fill();
  } else if (p.hairStyle === 'bun') {
    g.beginPath();
    g.moveTo(-20, -2); g.bezierCurveTo(-22, -22, -10, -27, 0, -27);
    g.bezierCurveTo(10, -27, 22, -22, 20, -2);
    g.bezierCurveTo(16, -14, 8, -17, 0, -16);
    g.bezierCurveTo(-8, -17, -16, -14, -20, -2); g.fill();
  } else if (p.hairStyle === 'bald') {
    g.globalAlpha = 0.35; ell(g, -6, -17, 7, 3.6, '#fff'); g.globalAlpha = 1;
  }

  // cap
  if (p.cap) {
    const capD = shade(p.cap, -0.18);
    ell(g, 0, -12, 21.5, 17, p.cap, Math.PI, Math.PI * 2);
    g.fillStyle = capD;
    g.beginPath(); g.moveTo(-22, -12); g.quadraticCurveTo(0, -17, 22, -12); g.quadraticCurveTo(0, -4, -22, -12); g.fill();
    ell(g, 0, -28.5, 2.2, 1.4, capD);
  }

  // face
  const browY = p.cap ? -8 : -10;
  g.strokeStyle = p.hairStyle === 'bald' ? shade(skin, -0.45) : hairD; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-11, browY); g.quadraticCurveTo(-7, browY - 2.5, -3.5, browY); g.stroke();
  g.beginPath(); g.moveTo(11, browY); g.quadraticCurveTo(7, browY - 2.5, 3.5, browY); g.stroke();
  g.globalAlpha = 0.4;
  ell(g, -11.5, 7, 4.2, 3, '#ff8a8a'); ell(g, 11.5, 7, 4.2, 3, '#ff8a8a');
  g.globalAlpha = 1;
  if (p.beard === 'stubble') {
    g.fillStyle = 'rgba(70,45,30,0.22)';
    g.beginPath(); g.moveTo(-17, 4); g.quadraticCurveTo(-14, 19, 0, 19); g.quadraticCurveTo(14, 19, 17, 4);
    g.quadraticCurveTo(10, 10, 0, 10); g.quadraticCurveTo(-10, 10, -17, 4); g.fill();
  } else if (p.beard) {
    g.fillStyle = hair;
    g.beginPath(); g.moveTo(-19, 0); g.bezierCurveTo(-18, 18, -9, 24, 0, 24); g.bezierCurveTo(9, 24, 18, 18, 19, 0);
    g.bezierCurveTo(14, 8, 8, 6, 0, 6); g.bezierCurveTo(-8, 6, -14, 8, -19, 0); g.fill();
  }
  if (p.glasses !== 'sun') {
    ell(g, -7, -2, 2.6, 2.9, '#2a2118'); ell(g, 7, -2, 2.6, 2.9, '#2a2118');
    ell(g, -6.2, -3, 0.9, 0.9, '#fff'); ell(g, 7.8, -3, 0.9, 0.9, '#fff');
  }
  g.fillStyle = skinD;
  g.beginPath(); g.ellipse(0, 4, 2.4, 1.7, 0, 0, Math.PI * 2); g.fill();
  // smile (open and toothy for the kid)
  if (child) {
    g.fillStyle = '#8a3426';
    g.beginPath(); g.moveTo(-6.5, 9); g.quadraticCurveTo(0, 18, 6.5, 9); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-4.5, 9, 9, 2);
  } else {
    g.strokeStyle = p.beard === true ? '#f3d6c4' : '#8a3426'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-6, 10); g.quadraticCurveTo(0, 15.5, 6, 10); g.stroke();
  }
  if (p.glasses === 'sun') {
    g.fillStyle = '#1d1d22';
    g.beginPath(); g.ellipse(-7.5, -2, 6, 4.8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(7.5, -2, 6, 4.8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1d1d22'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-2, -3); g.lineTo(2, -3); g.moveTo(-13.4, -3); g.lineTo(-19, -4); g.moveTo(13.4, -3); g.lineTo(19, -4); g.stroke();
    g.globalAlpha = 0.5; ell(g, -9.5, -4, 1.8, 1.1, '#9ad0ff'); ell(g, 5.5, -4, 1.8, 1.1, '#9ad0ff'); g.globalAlpha = 1;
  } else if (p.glasses) {
    g.strokeStyle = '#2b2b2e'; g.lineWidth = 1.7;
    g.beginPath(); g.ellipse(-7.5, -2, 5.6, 5, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(7.5, -2, 5.6, 5, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-2, -3); g.quadraticCurveTo(0, -4.5, 2, -3); g.moveTo(-13, -3); g.lineTo(-19, -4); g.moveTo(13, -3); g.lineTo(19, -4); g.stroke();
  }
  g.restore();
}
