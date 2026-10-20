// Inline SVG icons for the UI, drawn on a 24x24 grid. The same path data is reused on canvas
// (mini-map stop markers) through Path2D, so every icon is a single path string.
//   s: stroked (round caps), f: filled. Both may be given.

export const ICONS = {
  play: { f: 'M8 4.5c0-1.2 1.3-1.9 2.3-1.3l10 6.7c.9.6.9 2 0 2.6l-10 6.7c-1 .6-2.3-.1-2.3-1.3z' },
  pause: { s: 'M8.5 5v14M15.5 5v14', w: 3.6 },
  left: { s: 'M15 4.5L7.5 12l7.5 7.5', w: 4 },
  right: { s: 'M9 4.5l7.5 7.5L9 19.5', w: 4 },
  up2: { s: 'M5.5 12.5L12 6l6.5 6.5M5.5 19L12 12.5l6.5 6.5', w: 3.6 },
  arrow: { s: 'M12 20V5M5.5 11L12 4.5l6.5 6.5', w: 3.4 },
  down: { s: 'M5.5 9L12 15.5 18.5 9', w: 4 },
  horn: { f: 'M2.5 12a3.6 3.6 0 1 1 7.2 0 3.6 3.6 0 0 1-7.2 0zM9 10.6h3.6l8.4-5.3c.5-.3 1 .1 1 .6v12.2c0 .5-.5.9-1 .6l-8.4-5.3H9z' },
  map: { s: 'M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2zM9 4.5v13M15 6.5v13' },
  photos: { s: 'M3.5 6h17v13h-17zM3.5 16l5-5 4 4 2.5-2.5 5.5 5.5M15.5 9.5h.01', w: 2.4 },
  settings: { s: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.8v4.4M9 14.8v4.4' },
  close: { s: 'M6 6l12 12M18 6L6 18', w: 3.4 },
  home: { s: 'M3.5 11.5L12 4l8.5 7.5M6 9.8V20h4.5v-5.5h3V20H18V9.8' },
  sound: { s: 'M4 9h3.5L12 5v14l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11' },
  soundOff: { s: 'M4 9h3.5L12 5v14l-4.5-4H4zM15.5 9.5l5 5M20.5 9.5l-5 5' },
  music: { s: 'M9 17.5V5.5l10.5-2v12M9 17.5a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0zM19.5 15.5a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0z' },
  musicOff: { s: 'M9 17.5V5.5l10.5-2v12M9 17.5a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0zM3 3l18 18' },
  wheel: { s: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3.8 11.2h6.2M14 11.2h6.2M12 14v6.3' },
  refresh: { s: 'M19.5 12.5A7.5 7.5 0 1 1 17 6.6M19.5 3.8v4.8h-4.8' },
  camera: { s: 'M3.5 8h3.5l2-3h6l2 3h3.5v11.5h-17zM12 10a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z' },
  check: { s: 'M5 12.5l4.5 4.5L19 7', w: 3.6 },
  pencil: { s: 'M4.5 19.5l1-4.5L16 4.5l3.5 3.5L9 18.5zM13.5 7l3.5 3.5' },
  star: { f: 'M12 2.3l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.1l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z' },
  speak: { s: 'M4 9h3.5L12 5v14l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11' },
  rotate: { s: 'M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5zM11 17.5h2' },
  // tour stops
  view: { s: 'M7 9.5V5h3v4.5M17 9.5V5h-3v4.5M10 13.5h4M7 10a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 7 10zM17 10a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z' },
  clock: { s: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2.5' },
  boat: { s: 'M3 14.5h18l-3.2 5H6.2zM12 3v11.5M12 4l6 8.5h-6' },
  horse: { f: 'M6 19.5h12.5V21H6zM7.6 18.5c-.2-3.3 1.4-5.3 3.8-6.8L8 12.6 5.8 10l4.8-5.9 1-2.4 1.6 2.4c3.6 1 5.6 4.3 5.6 8.5v5.9z' },
  castle: { s: 'M5 20.5V8h2.6v2.6h2.6V8h3.6v2.6h2.6V8H19v12.5zM10 20.5v-3.8a2 2 0 0 1 4 0v3.8M3.5 20.5h17' },
  theatre: { s: 'M4.5 4h15v7.5a7.5 7.5 0 0 1-15 0zM7.8 9.2c.7-.8 1.9-.8 2.6 0M13.6 9.2c.7-.8 1.9-.8 2.6 0M8.6 13.4c1.8 2.2 5 2.2 6.8 0' },
  giraffe: { f: 'M7 10.4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM11.6 6.6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16.4 6.6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 10.4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 11.6c2.9 0 5.4 3.7 5.4 6.1 0 1.8-1.4 2.6-2.8 2.6-1.1 0-1.6-.6-2.6-.6s-1.5.6-2.6.6c-1.4 0-2.8-.8-2.8-2.6 0-2.4 2.5-6.1 5.4-6.1z' },
  museum: { s: 'M3 20.5h18M4.5 17.5h15M6 17.5v-7M10 17.5v-7M14 17.5v-7M18 17.5v-7M3.5 10.5h17L12 4.5z' },
  fountain: { s: 'M4 15h16l-2 4.5H6zM12 15V6.5M12 6.5c-3 0-5 2.6-5 5.5M12 6.5c3 0 5 2.6 5 5.5M12 3.5v.01', w: 2.4 },
  temple: { s: 'M4.5 10.5a7.5 5.5 0 0 1 15 0zM6.5 10.5v8.5M10 10.5v8.5M14 10.5v8.5M17.5 10.5v8.5M4 20h16' },
  playground: { s: 'M4 20.5L8 4h8l4 16.5M12 4v9.5M9.8 13.5h4.4' },
  film: { s: 'M4 10h16v10H4zM4 10L4.7 6l15-2.4.6 3.8M8.3 5.4l1.8 3.6M13.3 4.6l1.8 3.6M8 13.5h8' },
};

export function svgIcon(name, cls = '') {
  const ic = ICONS[name];
  if (!ic) return '';
  const w = ic.w || 2.6;
  const parts = [];
  if (ic.f) parts.push(`<path d="${ic.f}" fill="currentColor"/>`);
  if (ic.s) parts.push(`<path d="${ic.s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${parts.join('')}</svg>`;
}

// Strokes/fills an icon on a 2D canvas, centred on (x, y) with the given size.
const pathCache = new Map();
export function drawIcon(g, name, x, y, size, color) {
  const ic = ICONS[name];
  if (!ic || typeof Path2D === 'undefined') return;
  if (!pathCache.has(name)) pathCache.set(name, { f: ic.f && new Path2D(ic.f), s: ic.s && new Path2D(ic.s) });
  const p = pathCache.get(name);
  const k = size / 24;
  g.save();
  g.translate(x - size / 2, y - size / 2);
  g.scale(k, k);
  g.fillStyle = color; g.strokeStyle = color;
  g.lineWidth = (ic.w || 2.6) * 1.1;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (p.f) g.fill(p.f);
  if (p.s) g.stroke(p.s);
  g.restore();
}

// Colourful little illustrations (not single-colour icons).
export const ART = {
  gelato: `<svg class="art" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.2 11.5L12 23l4.8-11.5z" fill="#e3a65a" stroke="#b5752f" stroke-width="1" stroke-linejoin="round"/>
    <path d="M8.6 14.5l5.8-2.4M9.8 17.6l5-2.1M15.4 14.5l-5.8-2.4M14.2 17.6l-5-2.1" stroke="#b5752f" stroke-width=".9"/>
    <path d="M5.6 11.8c-.6-4 2.4-7.4 6.4-7.4s7 3.4 6.4 7.4c-.9.6-1.6-.4-2.4.2-.8.6-1.4 1.6-2.4.8-.7-.6-1.1-.2-1.6.4-.7.8-1.6.6-2-.3-.4-.9-1.3-.6-2-.4-.9.3-1.9 0-2.4-.7z" fill="#f59ab8" stroke="#d96d93" stroke-width=".9"/>
    <path d="M8.2 8.2c.6-1.4 1.8-2.2 3.2-2.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".8"/>
    <circle cx="13.4" cy="3.3" r="2" fill="#d8243c"/><path d="M13.6 1.4c.6-.6 1.4-.9 2.2-.8" stroke="#3d7a2b" stroke-width=".9" fill="none" stroke-linecap="round"/>
  </svg>`,
  horn: `<svg class="art" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 10.3h3.6v3.4H11z" fill="#c98f2a"/>
    <path d="M13.8 11L21 5.6c.9 2 1.3 4.2 1.3 6.4s-.4 4.4-1.3 6.4L13.8 13z" fill="#f2c14e" stroke="#a8741c" stroke-width="1.1" stroke-linejoin="round"/>
    <ellipse cx="21.2" cy="12" rx="1.3" ry="5.6" fill="#b57d1e"/>
    <ellipse cx="6.4" cy="12" rx="5" ry="5.6" fill="#e5483d" stroke="#9e2a22" stroke-width="1.1"/>
    <path d="M3.9 9.6c.6-1.4 1.6-2.2 2.8-2.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".75"/>
  </svg>`,
  pinecone: `<svg class="art" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5c1 0 2 .6 2 1.6" stroke="#4d8a35" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M12 4c4.2 0 6.4 4.8 6.4 9.4 0 4.6-3 8.1-6.4 8.1s-6.4-3.5-6.4-8.1C5.6 8.8 7.8 4 12 4z" fill="#f2b43a" stroke="#b77818" stroke-width="1.1"/>
    <path d="M7 9.5l5 3 5-3M6.2 13.6l5.8 3.3 5.8-3.3M7.4 17.7l4.6 2.6 4.6-2.6M9.2 6.3L12 8.2l2.8-1.9" fill="none" stroke="#b77818" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M9 8.3c.4-1.4 1.2-2.2 2.2-2.6" stroke="#fff3c2" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  </svg>`,
};

export function medalSvg(color = '#f4c430', cls = '') {
  const dark = color === 'none' ? '#b7aa92' : shade(color, -0.28);
  const fill = color === 'none' ? '#efe6d2' : color;
  return `<svg class="art medal ${cls}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 1.5h4l3 7h-4z" fill="${color === 'none' ? '#d6cbb4' : '#4f8fd8'}"/><path d="M17.5 1.5h-4l-3 7h4z" fill="${color === 'none' ? '#cabfa6' : '#e2504a'}"/>
    <circle cx="12" cy="15" r="7" fill="${fill}" stroke="${dark}" stroke-width="1.4"/>
    <path d="M12 10.6l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="${dark}" opacity=".75"/>
  </svg>`;
}

export const MEDAL_COLORS = { bronze: '#d0894a', silver: '#c9d1da', gold: '#f6c935' };

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, k = Math.abs(f);
  r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Language flags (3:2), drawn simply so they stay crisp at 20px.
export const FLAGS = {
  en: `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#24408e"/>
    <path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#cf142b" stroke-width="1.5"/>
    <path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6.5"/><path d="M15 0v20M0 10h30" stroke="#cf142b" stroke-width="3.6"/></svg>`,
  it: `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>`,
  fr: `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>`,
  es: `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/></svg>`,
  pt: `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#e42518"/><rect width="12" height="20" fill="#046a38"/><circle cx="12" cy="10" r="4.2" fill="#ffd200" stroke="#c99a00" stroke-width=".8"/><path d="M10.2 8.2h3.6v3a1.8 1.8 0 0 1-3.6 0z" fill="#e42518" stroke="#fff" stroke-width=".7"/></svg>`,
};

// The white 8-seat cart from the family photo, side view, for the title logo.
export const CART_ART = `<svg class="cart-art" viewBox="0 0 120 64" aria-hidden="true">
  <ellipse cx="60" cy="59" rx="50" ry="3.5" fill="#000" opacity=".18"/>
  <path d="M10 13c0-3 2-5 5-5h88c3 0 5 2 5 5v2H10z" fill="#fbfaf6" stroke="#8d8578" stroke-width="1.6"/>
  <path d="M10 15h98v2.6H10z" fill="#d9d3c6"/>
  <path d="M16 17v22M42 17v22M68 17v22M94 17v22M106 17l-4 22" stroke="#9a9387" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M8 39c0-2 1.5-3.4 3.4-3.4H100l9 3c2 .7 3 2.2 3 4.2V48c0 1.6-1.3 3-3 3H11c-1.7 0-3-1.4-3-3z" fill="#fff" stroke="#8d8578" stroke-width="1.6"/>
  <path d="M14 35.6V28c0-1.4 1.2-2.6 2.6-2.6h20c1.4 0 2.6 1.2 2.6 2.6v7.6M42 35.6V28c0-1.4 1.2-2.6 2.6-2.6h20c1.4 0 2.6 1.2 2.6 2.6v7.6M70 35.6V28c0-1.4 1.2-2.6 2.6-2.6h20c1.4 0 2.6 1.2 2.6 2.6v7.6" fill="#ece7dc" stroke="#8d8578" stroke-width="1.4"/>
  <circle cx="26" cy="22" r="4.6" fill="#f0c4a0"/><path d="M21.4 21c.6-3.4 2.6-4.8 4.6-4.8s4 1.4 4.6 4.8c-2-1-6.6-1-9.2 0z" fill="#5a3b26"/>
  <circle cx="53" cy="22" r="5" fill="#e7b08d"/><path d="M48 21.6c.4-3.8 2.8-5.4 5-5.4s4.6 1.6 5 5.4c-1.6-1.6-8.4-1.6-10 0z" fill="#3b261b"/><circle cx="53" cy="15.6" r="2.4" fill="#3b261b"/>
  <circle cx="81" cy="22" r="5" fill="#e9b896"/>
  <circle cx="30" cy="51" r="7.2" fill="#3a3a3e"/><circle cx="30" cy="51" r="3" fill="#cfcac0"/>
  <circle cx="92" cy="51" r="7.2" fill="#3a3a3e"/><circle cx="92" cy="51" r="3" fill="#cfcac0"/>
  <path d="M104 38.6l6 2" stroke="#f3c64b" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;
