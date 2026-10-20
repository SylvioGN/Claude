// Everything on screen: title screen with the "Who drives?" picker, touch controls, HUD with the
// heading-up mini-map, photo moments at the tour stops, photo album, menus and translations.
// DOM lives in #ui; CSS is injected from ui/style.js. All text goes through STRINGS.
import { FAMILY } from '../data/family.js';
import { LANGS } from '../core/game.js';
import { stopName, stopFacts } from './content.js';
import { CSS } from './ui/style.js';
import { svgIcon, ART, FLAGS, CART_ART, medalSvg, MEDAL_COLORS, shade } from './ui/icons.js';
import { drawPortrait, PORTRAIT_BG } from './ui/portraits.js';
import { createMapImage, drawMinimap } from './ui/map.js';

export const STRINGS = {
  en: {
    subtitle: 'Cart Adventure', play: 'Play', whoDrives: 'Who drives?', namePh: 'Type a name',
    easyShort: 'Easy', easy: 'Easy driving', sound: 'Sounds', music: 'Music', language: 'Language',
    album: 'Photo album', map: 'Map', settings: 'Settings', resume: 'Keep playing', home: 'Home', paused: 'Pause',
    newTour: 'New tour', sure: 'Sure? Tap again', allDone: 'All places found!', oops: 'Oops!|Bonk!|Whoa!',
    youFound: 'You found', smile: 'Smile!', letsGo: "Let's go!", readAloud: 'Read aloud', close: 'Close',
    medal_bronze: 'Bronze medal!', medal_silver: 'Silver medal!', medal_gold: 'Gold medal!',
    youDidIt: 'You did it!', tourDone: 'You visited the whole park!', keepDriving: 'Keep driving',
    rotate: 'Turn your phone sideways for a bigger park!', ok: 'OK', go: 'GO', north: 'N',
    keysDrive: 'drive', keysHorn: 'horn', keysSpace: 'space', keysPause: 'pause', driver: 'Driver', places: 'places',
    albumEmpty: 'Find the places in the park to take photos!', youAreHere: 'You are here',
    d_blue: 'Blue shirt', d_kid: 'Little explorer', d_cap: 'Cap and beard', d_leopard: 'Leopard skirt',
    d_jacket: 'Brown jacket', d_red: 'Red top', d_polo: 'Green polo',
  },
  it: {
    subtitle: 'Avventura in golf cart', play: 'Gioca', whoDrives: 'Chi guida?', namePh: 'Scrivi un nome',
    easyShort: 'Facile', easy: 'Guida facile', sound: 'Suoni', music: 'Musica', language: 'Lingua',
    album: 'Album di foto', map: 'Mappa', settings: 'Impostazioni', resume: 'Continua', home: 'Inizio', paused: 'Pausa',
    newTour: 'Nuovo giro', sure: 'Sicuro? Tocca ancora', allDone: 'Tutti i posti trovati!', oops: 'Ops!|Bum!|Ehi!',
    youFound: 'Hai trovato', smile: 'Sorridete!', letsGo: 'Andiamo!', readAloud: 'Leggi ad alta voce', close: 'Chiudi',
    medal_bronze: 'Medaglia di bronzo!', medal_silver: "Medaglia d'argento!", medal_gold: "Medaglia d'oro!",
    youDidIt: "Ce l'hai fatta!", tourDone: 'Hai visitato tutto il parco!', keepDriving: 'Continua a guidare',
    rotate: 'Gira il telefono per vedere più parco!', ok: 'OK', go: 'VAI', north: 'N',
    keysDrive: 'guida', keysHorn: 'clacson', keysSpace: 'spazio', keysPause: 'pausa', driver: 'Alla guida', places: 'posti',
    albumEmpty: 'Trova i posti del parco per scattare le foto!', youAreHere: 'Sei qui',
    d_blue: 'Maglia azzurra', d_kid: 'Piccolo esploratore', d_cap: 'Cappellino e barba', d_leopard: 'Gonna leopardata',
    d_jacket: 'Giacca marrone', d_red: 'Top rosso', d_polo: 'Polo verde',
  },
  fr: {
    subtitle: "L'aventure en voiturette", play: 'Jouer', whoDrives: 'Qui conduit ?', namePh: 'Écris un prénom',
    easyShort: 'Facile', easy: 'Conduite facile', sound: 'Sons', music: 'Musique', language: 'Langue',
    album: 'Album photo', map: 'Carte', settings: 'Réglages', resume: 'Continuer', home: 'Accueil', paused: 'Pause',
    newTour: 'Nouvelle visite', sure: 'Sûr ? Touche encore', allDone: 'Tous les lieux trouvés !', oops: 'Oups !|Boum !|Ouh là !',
    youFound: 'Tu as trouvé', smile: 'Souriez !', letsGo: 'En route !', readAloud: 'Lire à voix haute', close: 'Fermer',
    medal_bronze: 'Médaille de bronze !', medal_silver: "Médaille d'argent !", medal_gold: "Médaille d'or !",
    youDidIt: 'Bravo, tu as réussi !', tourDone: 'Tu as visité tout le parc !', keepDriving: 'Continuer à rouler',
    rotate: 'Tourne ton téléphone pour voir le parc en grand !', ok: 'OK', go: 'GO', north: 'N',
    keysDrive: 'conduire', keysHorn: 'klaxon', keysSpace: 'espace', keysPause: 'pause', driver: 'Au volant', places: 'lieux',
    albumEmpty: 'Trouve les lieux du parc pour prendre des photos !', youAreHere: 'Tu es ici',
    d_blue: 'T-shirt bleu', d_kid: 'Petit explorateur', d_cap: 'Casquette et barbe', d_leopard: 'Jupe léopard',
    d_jacket: 'Veste marron', d_red: 'Haut rouge', d_polo: 'Polo vert',
  },
  es: {
    subtitle: 'Aventura en carrito', play: 'Jugar', whoDrives: '¿Quién conduce?', namePh: 'Escribe un nombre',
    easyShort: 'Fácil', easy: 'Conducción fácil', sound: 'Sonidos', music: 'Música', language: 'Idioma',
    album: 'Álbum de fotos', map: 'Mapa', settings: 'Ajustes', resume: 'Seguir jugando', home: 'Inicio', paused: 'Pausa',
    newTour: 'Nuevo paseo', sure: '¿Seguro? Toca otra vez', allDone: '¡Todos los lugares encontrados!', oops: '¡Uy!|¡Bum!|¡Ay!',
    youFound: 'Encontraste', smile: '¡Sonrían!', letsGo: '¡Vamos!', readAloud: 'Leer en voz alta', close: 'Cerrar',
    medal_bronze: '¡Medalla de bronce!', medal_silver: '¡Medalla de plata!', medal_gold: '¡Medalla de oro!',
    youDidIt: '¡Lo lograste!', tourDone: '¡Visitaste todo el parque!', keepDriving: 'Seguir conduciendo',
    rotate: '¡Gira el móvil para ver el parque más grande!', ok: 'OK', go: 'YA', north: 'N',
    keysDrive: 'conducir', keysHorn: 'bocina', keysSpace: 'espacio', keysPause: 'pausa', driver: 'Al volante', places: 'lugares',
    albumEmpty: '¡Encuentra los lugares del parque para hacer fotos!', youAreHere: 'Estás aquí',
    d_blue: 'Camiseta azul', d_kid: 'Pequeño explorador', d_cap: 'Gorra y barba', d_leopard: 'Falda de leopardo',
    d_jacket: 'Chaqueta marrón', d_red: 'Top rojo', d_polo: 'Polo verde',
  },
  pt: {
    subtitle: 'Aventura de carrinho', play: 'Jogar', whoDrives: 'Quem dirige?', namePh: 'Escreva um nome',
    easyShort: 'Fácil', easy: 'Direção fácil', sound: 'Sons', music: 'Música', language: 'Idioma',
    album: 'Álbum de fotos', map: 'Mapa', settings: 'Ajustes', resume: 'Continuar', home: 'Início', paused: 'Pausa',
    newTour: 'Novo passeio', sure: 'Certeza? Toque de novo', allDone: 'Todos os lugares encontrados!', oops: 'Opa!|Bum!|Eita!',
    youFound: 'Você achou', smile: 'Sorriam!', letsGo: 'Vamos!', readAloud: 'Ler em voz alta', close: 'Fechar',
    medal_bronze: 'Medalha de bronze!', medal_silver: 'Medalha de prata!', medal_gold: 'Medalha de ouro!',
    youDidIt: 'Você conseguiu!', tourDone: 'Você visitou o parque inteiro!', keepDriving: 'Continuar dirigindo',
    rotate: 'Vire o celular para ver o parque maior!', ok: 'OK', go: 'VAI', north: 'N',
    keysDrive: 'dirigir', keysHorn: 'buzina', keysSpace: 'espaço', keysPause: 'pausa', driver: 'No volante', places: 'lugares',
    albumEmpty: 'Encontre os lugares do parque para tirar fotos!', youAreHere: 'Você está aqui',
    d_blue: 'Camiseta azul', d_kid: 'Pequeno explorador', d_cap: 'Boné e barba', d_leopard: 'Saia de oncinha',
    d_jacket: 'Jaqueta marrom', d_red: 'Blusa vermelha', d_polo: 'Polo verde',
  },
};
const LANG_NAMES = { en: 'English', it: 'Italiano', fr: 'Français', es: 'Español', pt: 'Português' };
const SPEECH_LANG = { en: 'en-GB', it: 'it-IT', fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR' };
// one gelato colour per tour stop (markers, stamps)
const STOP_COLORS = ['#ff9fc0', '#ffd36b', '#8fd3ff', '#b5e47a', '#ffb27d', '#c7a8ff', '#7fe0c6', '#ffc4a8', '#9fc4ff', '#ffe58a', '#a8e6a1', '#ffb3c8'];
const ALBUM_KEY = 'villa-borghese-album-v1';
const TIP_KEY = 'villa-borghese-rotate-tip';
const UNITS_PER_METRE = 0.55;

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function storeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storeSet(key, v) { try { localStorage.setItem(key, v); return true; } catch { return false; } }

export async function create(ctx) {
  const root = document.getElementById('ui');
  if (!root) return {};
  const G = ctx.game, ev = ctx.events, MAP = ctx.MAP;
  const stops = G.stops;
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // ---------- fonts, css, strings ----------
  // Playful web font, loaded without blocking rendering (falls back to rounded system fonts).
  // Automated test browsers skip it: they have no network and screenshots wait for fonts.
  if (!document.getElementById('vb-font') && !navigator.webdriver) {
    const link = document.createElement('link');
    link.id = 'vb-font'; link.rel = 'stylesheet'; link.media = 'print';
    link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap';
    link.onload = () => { link.media = 'all'; };
    document.head.appendChild(link);
  }
  let style = document.getElementById('vb-ui-css');
  if (!style) { style = document.createElement('style'); style.id = 'vb-ui-css'; document.head.appendChild(style); }
  style.textContent = CSS;
  root.textContent = '';

  let lang = LANGS.includes(G.settings.lang) ? G.settings.lang : 'en';
  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  function applyStrings(scope = root) {
    for (const n of scope.querySelectorAll('[data-t]')) n.textContent = t(n.dataset.t);
    for (const n of scope.querySelectorAll('[data-tp]')) n.placeholder = t(n.dataset.tp);
    for (const n of scope.querySelectorAll('[data-ta]')) n.setAttribute('aria-label', t(n.dataset.ta));
  }
  const sfx = (name) => { try { ctx.modules.audio?.play?.(name); } catch { /* audio is optional */ } };
  // click handler with the tap sound
  const tap = (node, fn) => node.addEventListener('click', (e) => { sfx('tap'); fn(e); });
  const layer = (cls) => {
    const d = document.createElement('div');
    d.className = `vb-layer ${cls}`;
    d.hidden = true;
    root.appendChild(d);
    return d;
  };
  const stopColor = (s) => STOP_COLORS[s.index % STOP_COLORS.length];
  const driverName = (i) => {
    const p = FAMILY[i] || FAMILY[0];
    return (G.settings.names?.[p.id] || '').trim() || t(`d_${p.id}`);
  };
  const medalAt = (n) => [...G.medals].reverse().find((m) => n >= m.at)?.id || null;

  let touchMode = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;

  // ---------- portraits ----------
  const portraitCache = new Map();
  function portrait(i, px = 160) {
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const key = `${i}:${px}`;
    if (!portraitCache.has(key)) {
      const src = document.createElement('canvas');
      src.width = src.height = px;
      drawPortrait(src, FAMILY[i], PORTRAIT_BG[i % PORTRAIT_BG.length]);
      portraitCache.set(key, src);
    }
    c.getContext('2d').drawImage(portraitCache.get(key), 0, 0);
    return c;
  }

  // ---------- title screen ----------
  const title = layer('vb-title');
  title.innerHTML = `
    <div class="t-left">
      <div class="logo"><span class="l1">Villa Borghese</span><span class="l2" data-t="subtitle"></span></div>
      ${CART_ART}
      <button class="vb-btn green big play">${svgIcon('play')}<span data-t="play"></span></button>
      <div class="t-prog">
        <span class="chip p-stops"></span>
        <span class="chip p-gel">${ART.gelato}<b></b></span>
        <span class="chip p-cone">${ART.pinecone}<b></b></span>
        <button class="vb-btn round small p-album" data-ta="album">${svgIcon('photos')}</button>
        <button class="vb-btn round small p-new" data-ta="newTour">${svgIcon('refresh')}<span></span></button>
      </div>
    </div>
    <div class="t-right">
      <div class="vb-card drivers-card">
        <h2>${svgIcon('wheel')}<span data-t="whoDrives"></span></h2>
        <div class="drivers"></div>
        <label class="namebox">${svgIcon('pencil')}<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done"></label>
      </div>
      <div class="setrow">
        <button class="vb-btn round t-lang" data-ta="language"></button>
        <button class="vb-btn t-easy">${svgIcon('wheel')}<span data-t="easyShort"></span><i class="vb-switch"></i></button>
        <button class="vb-btn round t-snd" data-ta="sound"></button>
        <button class="vb-btn round t-mus" data-ta="music"></button>
      </div>
    </div>`;
  const q = (sel, scope = root) => scope.querySelector(sel);
  const driversBox = q('.drivers', title);
  const nameInput = q('.namebox input', title);
  FAMILY.forEach((p, i) => {
    const b = el(`<button class="drv" data-i="${i}"><span class="tick">${svgIcon('check')}</span><span class="nm"></span></button>`);
    b.prepend(portrait(i));
    tap(b, () => selectDriver(i));
    driversBox.appendChild(b);
  });
  function refreshDrivers() {
    const sel = G.settings.driver | 0;
    driversBox.querySelectorAll('.drv').forEach((b, i) => {
      b.classList.toggle('sel', i === sel);
      b.querySelector('.nm').textContent = (G.settings.names?.[FAMILY[i].id] || '').trim();
      b.setAttribute('aria-label', driverName(i));
    });
    const id = FAMILY[sel]?.id;
    if (document.activeElement !== nameInput) nameInput.value = G.settings.names?.[id] || '';
    nameInput.placeholder = t(`d_${id}`);
  }
  function selectDriver(i) {
    if (i < 0 || i >= FAMILY.length) return;
    nameInput.blur();
    G.setSettings({ driver: i });
    ev.emit('driver', { index: i });
    refreshDrivers();
  }
  let nameTimer = 0;
  nameInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // keep the core keyboard (space = horn) away from typing
    if (e.key === 'Enter') nameInput.blur();
  });
  nameInput.addEventListener('input', () => {
    const id = FAMILY[G.settings.driver | 0].id;
    const names = { ...(G.settings.names || {}), [id]: nameInput.value.slice(0, 14) };
    G.settings.names = names;
    driversBox.querySelector('.drv.sel .nm').textContent = nameInput.value.trim();
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => G.setSettings({ names }), 400);
  });

  function refreshToggles() {
    const s = G.settings;
    for (const b of root.querySelectorAll('.t-lang')) b.innerHTML = FLAGS[lang];
    for (const b of root.querySelectorAll('.t-snd')) { b.innerHTML = svgIcon(s.sound ? 'sound' : 'soundOff'); b.classList.toggle('off', !s.sound); }
    for (const b of root.querySelectorAll('.t-mus')) { b.innerHTML = svgIcon(s.music ? 'music' : 'musicOff'); b.classList.toggle('off', !s.music); }
    for (const b of root.querySelectorAll('.t-easy')) b.classList.toggle('on', !!s.easy);
    for (const b of root.querySelectorAll('.set-langs button')) b.classList.toggle('sel', b.dataset.lang === lang);
  }
  function bindToggles(scope) {
    scope.querySelectorAll('.t-snd').forEach((b) => tap(b, () => G.setSettings({ sound: !G.settings.sound })));
    scope.querySelectorAll('.t-mus').forEach((b) => tap(b, () => G.setSettings({ music: !G.settings.music })));
    scope.querySelectorAll('.t-easy').forEach((b) => tap(b, () => G.setSettings({ easy: !G.settings.easy })));
    scope.querySelectorAll('.t-lang').forEach((b) => tap(b, () => openLangPopover(b)));
    scope.querySelectorAll('.set-langs button').forEach((b) => tap(b, () => setLang(b.dataset.lang)));
  }
  bindToggles(title);

  function setLang(l) {
    if (!LANGS.includes(l)) return;
    lang = l;
    document.documentElement.lang = l;
    G.setSettings({ lang: l });
  }
  function openLangPopover(btn) {
    const pop = el(`<div class="langpop">${LANGS.map((l) => `<button data-lang="${l}" class="${l === lang ? 'sel' : ''}">${FLAGS[l]}<span>${LANG_NAMES[l]}</span></button>`).join('')}</div>`);
    const catcher = el('<div style="position:absolute;inset:0;z-index:4;pointer-events:auto"></div>');
    const close = () => { pop.remove(); catcher.remove(); };
    catcher.addEventListener('pointerdown', close);
    pop.querySelectorAll('button').forEach((b) => tap(b, () => { setLang(b.dataset.lang); close(); }));
    root.append(catcher, pop);
    const r = btn.getBoundingClientRect();
    const ph = pop.offsetHeight, pw = pop.offsetWidth;
    pop.style.left = `${Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2))}px`;
    pop.style.top = `${Math.max(8, r.top - ph - 10 < 8 ? r.bottom + 10 : r.top - ph - 10)}px`;
  }

  let newBtns = [];
  function confirmButton(btn, onConfirm) {
    let armed = 0;
    const label = btn.querySelector('span');
    newBtns.push({ btn, label, reset: () => { armed = 0; btn.classList.remove('confirm', 'wide'); label.textContent = btn.dataset.idle ? t(btn.dataset.idle) : ''; } });
    btn.addEventListener('click', () => {
      sfx('tap');
      if (armed && performance.now() - armed < 3500) { onConfirm(); armed = 0; resetConfirms(); return; }
      armed = performance.now();
      btn.classList.add('confirm', 'wide');
      label.textContent = t('sure');
      setTimeout(() => { if (armed && performance.now() - armed >= 3400) resetConfirms(); }, 3600);
    });
  }
  function resetConfirms() {
    newBtns = newBtns.filter((n) => n.btn.isConnected);
    for (const n of newBtns) n.reset();
  }

  function newTour() {
    G.resetTour();
    const c = ctx.cart;
    if (c && G._placed) {
      c.reset(G.start.x, G.start.z, G.start.heading);
      if (G.state !== 'title') ctx.camRig.setMode('chase', { snap: true });
    }
    refreshProgress();
    refreshHud(true);
  }
  confirmButton(q('.p-new', title), newTour);
  tap(q('.p-album', title), () => openAlbum());

  function refreshProgress() {
    const n = G.visitedCount, total = stops.length, m = medalAt(n);
    q('.p-stops', title).innerHTML = `${medalSvg(m ? MEDAL_COLORS[m] : 'none')}<b>${n}/${total}</b>`;
    q('.p-gel b', title).textContent = G.score.gelato;
    q('.p-cone b', title).textContent = G.score.pinecones;
    const any = n > 0 || G.score.gelato > 0 || G.score.pinecones > 0;
    for (const s of ['.p-gel', '.p-cone', '.p-new']) q(s, title).hidden = !any;
  }

  tap(q('.play', title), () => {
    const i = G.settings.driver | 0;
    nameInput.blur();
    ev.emit('driver', { index: i });
    G.setSettings({ driver: i });
    enterImmersive();
    G.begin();
  });

  // fullscreen + landscape + keep the screen awake: all optional
  let wakeLock = null;
  function requestWakeLock() {
    try {
      navigator.wakeLock?.request('screen').then((l) => { wakeLock = l; }).catch(() => {});
    } catch { /* not supported */ }
  }
  function enterImmersive() {
    requestWakeLock();
    if (!touchMode) return;
    try {
      const de = document.documentElement;
      if (!document.fullscreenElement && de.requestFullscreen) {
        de.requestFullscreen({ navigationUI: 'hide' })
          .then(() => screen.orientation?.lock?.('landscape'))
          .catch(() => {});
      }
    } catch { /* blocked inside some frames */ }
  }

  // ---------- HUD ----------
  const hud = layer('vb-hud');
  hud.innerHTML = `
    <div class="speedlines"></div>
    <div class="hud-top">
      <button class="vb-btn round pause" data-ta="paused">${svgIcon('pause')}</button>
      <div class="counters">
        <span class="chip h-gel">${ART.gelato}<b>0</b></span>
        <span class="chip h-cone">${ART.pinecone}<b>0</b></span>
      </div>
      <div class="hud-next"><div class="next">
        <span class="medalct"></span>
        <span class="stopic"></span><span class="nm"></span><span class="dist"></span>
        <span class="dir">${svgIcon('arrow')}</span>
      </div></div>
      <button class="minimap" data-ta="map"><span class="disc"><canvas></canvas></span><span class="zoom">${svgIcon('map')}</span></button>
    </div>
    <div class="turbo"><b>TURBO!</b></div>
    <div class="oops"></div>
    <div class="keys"><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd><span data-t="keysDrive"></span><span class="sep"></span><kbd data-t="keysSpace"></kbd><span data-t="keysHorn"></span><span class="sep"></span><kbd>P</kbd><span data-t="keysPause"></span></div>`;
  const hGel = q('.h-gel', hud), hCone = q('.h-cone', hud);
  const nextEl = q('.next', hud), nextIc = q('.stopic', nextEl), nextNm = q('.nm', nextEl), nextDist = q('.dist', nextEl);
  const nextDir = q('.dir .ic', nextEl), medalCt = q('.medalct', nextEl);
  const mini = q('.minimap', hud), miniCanvas = q('canvas', mini), miniG = miniCanvas.getContext('2d');
  const keysHint = q('.keys', hud);
  tap(q('.pause', hud), () => openPause());
  tap(mini, () => openMap(true));

  const mapImg = createMapImage(MAP, ctx.rng('ui-map'));
  const hudCache = {};
  let dirAngle = 0;
  function setText(node, key, v) {
    if (hudCache[key] === v) return;
    hudCache[key] = v;
    node.textContent = v;
  }
  function refreshHud(force = false) {
    if (force) for (const k of Object.keys(hudCache)) delete hudCache[k];
    setText(q('b', hGel), 'gel', String(G.score.gelato));
    setText(q('b', hCone), 'cone', String(G.score.pinecones));
    const n = G.visitedCount, m = medalAt(n);
    const mk = `${n}:${m}`;
    if (hudCache.medal !== mk) { hudCache.medal = mk; medalCt.innerHTML = `${medalSvg(m ? MEDAL_COLORS[m] : 'none')}<b>${n}/${stops.length}</b>`; }
    const s = G.nextStop();
    if (!s) {
      nextEl.classList.add('done');
      if (hudCache.stop !== 'done') { hudCache.stop = 'done'; nextIc.innerHTML = svgIcon('star'); nextIc.style.background = '#ffd23f'; }
      setText(nextNm, 'nm', t('allDone'));
      return;
    }
    nextEl.classList.remove('done');
    if (hudCache.stop !== s.id) { hudCache.stop = s.id; nextIc.innerHTML = svgIcon(s.icon); nextIc.style.background = stopColor(s); }
    setText(nextNm, 'nm', stopName(s.id, lang));
    const c = ctx.cart;
    if (!c) return;
    const dx = s.spotX - c.position.x, dz = s.spotZ - c.position.z;
    const metres = Math.hypot(dx, dz) / UNITS_PER_METRE;
    setText(nextDist, 'dist', `${metres > 100 ? Math.round(metres / 10) * 10 : Math.max(5, Math.round(metres / 5) * 5)} m`);
    // arrow relative to the cart's heading (screen up = forward)
    const th = c.heading - Math.PI;
    const u = dx * Math.cos(th) - dz * Math.sin(th), v = dx * Math.sin(th) + dz * Math.cos(th);
    const target = Math.atan2(u, -v);
    dirAngle += wrapPi(target - dirAngle);
    nextDir.style.transform = `rotate(${dirAngle.toFixed(3)}rad)`;
  }

  let miniSize = 0;
  function sizeMinimap() {
    const w = mini.clientWidth - 8;
    if (w <= 0) return;
    const px = Math.round(w * dpr);
    if (px !== miniSize) { miniSize = px; miniCanvas.width = miniCanvas.height = px; }
  }
  const marks = stops.map((s) => ({ x: s.x, z: s.z, icon: s.icon, color: stopColor(s), visited: false, next: false }));
  function drawMini() {
    const c = ctx.cart;
    if (!c || !miniSize) return;
    const next = G.nextStop();
    stops.forEach((s, i) => { marks[i].visited = s.visited; marks[i].next = s === next; });
    drawMinimap(miniG, mapImg, miniSize, { x: c.position.x, z: c.position.z, heading: c.heading }, marks, 70, t('north'));
  }

  // pops and banners
  function pop(node) {
    node.classList.remove('pop');
    void node.offsetWidth;
    node.classList.add('pop');
  }
  function floater(node, text) {
    const r = node.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const f = el(`<span class="plus">${text}</span>`);
    f.style.left = `${r.left - rr.left + r.width * 0.55}px`;
    f.style.top = `${r.bottom - rr.top - 6}px`;
    hud.appendChild(f);
    setTimeout(() => f.remove(), 950);
  }
  function toast(html) {
    const n = el(`<div class="toast">${html}</div>`);
    root.appendChild(n);
    setTimeout(() => n.remove(), 3100);
  }
  let lastOops = -10;
  const oopsEl = q('.oops', hud);

  ev.on('collect', (e) => {
    if (e.kind === 'gelato') { refreshHud(); pop(hGel); floater(hGel, `+${e.value || 1}`); }
    else if (e.kind === 'pinecone') { refreshHud(); pop(hCone); floater(hCone, '+1'); }
  });
  ev.on('boost', (e) => {
    q('.turbo', hud).classList.toggle('show', !!e.on);
    q('.speedlines', hud).classList.toggle('show', !!e.on && ctx.quality.particles >= 0.5);
  });
  ev.on('bump', (e) => {
    if (G.state !== 'playing' || (e.strength || 0) < 0.45 || ctx.time - lastOops < 1.4) return;
    lastOops = ctx.time;
    const words = t('oops').split('|');
    oopsEl.textContent = words[Math.floor(Math.random() * words.length)];
    oopsEl.style.setProperty('--rot', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
    oopsEl.classList.remove('show'); void oopsEl.offsetWidth; oopsEl.classList.add('show');
  });
  ev.on('medal', (e) => {
    if (photo) { photo.medal = e.id; return; }
    toast(`${medalSvg(MEDAL_COLORS[e.id])}<span>${t(`medal_${e.id}`)}</span>`);
  });

  // ---------- touch controls ----------
  const controls = layer('vb-controls');
  controls.innerHTML = `
    <div class="steer" data-ctl="steer">
      <div class="ctl sl" data-ctl="steer">${svgIcon('left')}</div>
      <div class="ctl sr" data-ctl="steer">${svgIcon('right')}</div>
    </div>
    <div class="ctl horn" data-ctl="horn">${ART.horn}</div>
    <div class="ctl brake" data-ctl="brake">${svgIcon('down')}</div>
    <div class="ctl gas" data-ctl="gas">${svgIcon('up2')}<span data-t="go"></span></div>`;
  const ti = { steer: 0, throttle: 0, brake: 0, honk: false };
  ctx.touchInput = ti;
  const steerPad = q('.steer', controls);
  const ctlEls = { gas: q('.gas', controls), brake: q('.brake', controls), horn: q('.horn', controls), sl: q('.sl', controls), sr: q('.sr', controls) };
  const pointers = new Map(); // pointerId -> {ctl, x}
  let steerTarget = 0;

  function steerFromX(x) {
    const r = steerPad.getBoundingClientRect();
    const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
    const a = Math.abs(dx);
    if (a < 0.06) return 0;
    return Math.sign(dx) * (0.6 + 0.4 * Math.min(1, (a - 0.06) / 0.7));
  }
  function pedalAt(x, y) {
    for (const k of ['gas', 'brake', 'horn']) {
      const r = ctlEls[k].getBoundingClientRect();
      if (x > r.left - 10 && x < r.right + 10 && y > r.top - 10 && y < r.bottom + 10) return k;
    }
    return null;
  }
  function applyPointers() {
    let steer = null, gas = false, brake = false, horn = false;
    for (const p of pointers.values()) {
      if (p.ctl === 'steer') steer = steerFromX(p.x);
      else if (p.ctl === 'gas') gas = true;
      else if (p.ctl === 'brake') brake = true;
      else if (p.ctl === 'horn') horn = true;
    }
    steerTarget = steer ?? 0;
    ti.throttle = gas ? 1 : 0;
    ti.brake = brake ? 1 : 0;
    ti.honk = horn;
    ctlEls.gas.classList.toggle('on', gas);
    ctlEls.brake.classList.toggle('on', brake);
    ctlEls.horn.classList.toggle('on', horn);
    ctlEls.sl.classList.toggle('on', steerTarget < 0);
    ctlEls.sr.classList.toggle('on', steerTarget > 0);
  }
  function releaseControls() {
    pointers.clear();
    steerTarget = 0; ti.steer = 0;
    applyPointers();
  }
  controls.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('[data-ctl]');
    if (!c) return;
    e.preventDefault();
    try { controls.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    pointers.set(e.pointerId, { ctl: c.dataset.ctl, x: e.clientX });
    try { navigator.vibrate?.(8); } catch { /* no haptics */ }
    applyPointers();
  });
  controls.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    if (p.ctl !== 'steer') p.ctl = pedalAt(e.clientX, e.clientY) || p.ctl; // slide between pedals
    applyPointers();
  });
  const lift = (e) => { if (pointers.delete(e.pointerId)) applyPointers(); };
  controls.addEventListener('pointerup', lift);
  controls.addEventListener('pointercancel', lift);
  controls.addEventListener('lostpointercapture', lift);
  controls.addEventListener('contextmenu', (e) => e.preventDefault());

  // hybrid devices: a touch shows the controls, driving keys without touches hide them
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !touchMode) { touchMode = true; applyState(G.state); }
  }, true);
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && (G.state === 'playing' || G.state === 'paused')) {
      if (G.state === 'playing') openPause(); else resume();
      return;
    }
    if (touchMode && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !pointers.size) {
      touchMode = false; applyState(G.state);
    }
  });

  // ---------- modals ----------
  const modals = [];
  function openModal(node, { onClose } = {}) {
    const wrap = el('<div class="vb-modal"></div>');
    wrap.appendChild(node);
    if (modals.length) modals[modals.length - 1].wrap.hidden = true;
    modals.push({ wrap, onClose });
    root.appendChild(wrap);
    applyStrings(wrap);
    return wrap;
  }
  function closeModal() {
    const m = modals.pop();
    if (!m) return;
    m.wrap.remove();
    if (modals.length) modals[modals.length - 1].wrap.hidden = false;
    m.onClose?.();
  }
  function closeAllModals() {
    while (modals.length) modals.pop().wrap.remove();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }
  const closeBtn = () => `<button class="vb-btn round x" data-ta="close">${svgIcon('close')}</button>`;

  function resume() {
    closeAllModals();
    if (G.state === 'paused') G.pause(false);
  }

  function openPause() {
    if (modals.length) { if (G.state === 'playing') G.pause(true); return; }
    const drv = G.settings.driver | 0;
    const panel = el(`<div class="panel">
      <h2>${svgIcon('pause')}<span data-t="paused"></span></h2>${closeBtn()}
      <div class="pause-grid">
        <button class="vb-btn green big resume">${svgIcon('play')}<span data-t="resume"></span></button>
        <button class="vb-btn tile blue m-map">${svgIcon('map')}<span data-t="map"></span></button>
        <button class="vb-btn tile pink m-album">${svgIcon('photos')}<span data-t="album"></span></button>
        <button class="vb-btn tile yellow m-set">${svgIcon('settings')}<span data-t="settings"></span></button>
        <button class="vb-btn tile m-home">${svgIcon('home')}<span data-t="home"></span></button>
      </div>
      <div class="pause-foot">
        <div class="whodrives"><span class="pf-name"></span></div>
        <button class="vb-btn small m-new" data-idle="newTour">${svgIcon('refresh')}<span data-t="newTour"></span></button>
      </div>
    </div>`);
    const who = q('.whodrives', panel);
    who.prepend(portrait(drv, 104));
    q('.pf-name', panel).textContent = driverName(drv);
    tap(q('.x', panel), resume);
    tap(q('.resume', panel), resume);
    tap(q('.m-map', panel), () => openMap(false));
    tap(q('.m-album', panel), () => openAlbum());
    tap(q('.m-set', panel), () => openSettings());
    tap(q('.m-home', panel), () => {
      closeAllModals();
      const c = ctx.cart;
      G.setState('title');
      if (c) ctx.camRig.setMode('title', { x: c.position.x, z: c.position.z, r: 26, h: 10, a: c.heading + Math.PI * 0.75 });
    });
    confirmButton(q('.m-new', panel), () => { newTour(); resume(); });
    openModal(panel);
    if (G.state === 'playing') G.pause(true);
  }

  function openSettings() {
    const panel = el(`<div class="panel">
      <h2>${svgIcon('settings')}<span data-t="settings"></span></h2>${closeBtn()}
      <div class="set-list">
        <div class="set-row"><span data-t="language"></span><div class="set-langs">
          ${LANGS.map((l) => `<button data-lang="${l}">${FLAGS[l]}<span>${l.toUpperCase()}</span></button>`).join('')}
        </div></div>
        <button class="set-row t-easy"><span>${svgIcon('wheel')}<span data-t="easy"></span></span><i class="vb-switch"></i></button>
        <button class="set-row t-snd2"><span>${svgIcon('sound')}<span data-t="sound"></span></span><i class="vb-switch"></i></button>
        <button class="set-row t-mus2"><span>${svgIcon('music')}<span data-t="music"></span></span><i class="vb-switch"></i></button>
      </div>
    </div>`);
    tap(q('.x', panel), closeModal);
    bindToggles(panel);
    tap(q('.t-snd2', panel), () => G.setSettings({ sound: !G.settings.sound }));
    tap(q('.t-mus2', panel), () => G.setSettings({ music: !G.settings.music }));
    const sync = () => {
      q('.t-snd2', panel).classList.toggle('on', !!G.settings.sound);
      q('.t-mus2', panel).classList.toggle('on', !!G.settings.music);
    };
    sync();
    const off = ev.on('settings', sync);
    openModal(panel, { onClose: off });
    refreshToggles();
  }

  // ---------- full map ----------
  function openMap(fromHud) {
    const pauseIt = fromHud && G.state === 'playing';
    const panel = el(`<div class="panel map-panel">${closeBtn()}<div class="map-wrap"><canvas></canvas><div class="map-head"></div></div></div>`);
    const wrap = q('.map-wrap', panel), canvas = q('canvas', wrap), head = q('.map-head', wrap);
    const availW = innerWidth - 40, availH = innerHeight - 40;
    const k = Math.min(availW / mapImg.W, availH / mapImg.H);
    const w = Math.floor(mapImg.W * k), h = Math.floor(mapImg.H * k);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g2 = canvas.getContext('2d');
    g2.imageSmoothingQuality = 'high';
    g2.drawImage(mapImg.canvas, 0, 0, canvas.width, canvas.height);
    const px = (x) => (x - mapImg.x0) * mapImg.s * k, pz = (z) => (z - mapImg.z0) * mapImg.s * k;
    const next = G.nextStop();
    let label = null;
    for (const s of stops) {
      const b = el(`<button class="map-stop${s.visited ? ' visited' : ''}${s === next ? ' next' : ''}"><i style="background:${stopColor(s)}">${svgIcon(s.visited ? 'check' : s.icon)}</i></button>`);
      b.style.left = `${px(s.x)}px`; b.style.top = `${pz(s.z)}px`;
      b.setAttribute('aria-label', stopName(s.id, lang));
      tap(b, () => {
        label?.remove();
        wrap.querySelectorAll('.map-stop.sel').forEach((n) => n.classList.remove('sel'));
        b.classList.add('sel');
        label = el(`<div class="map-label"></div>`);
        label.textContent = stopName(s.id, lang);
        label.style.left = b.style.left; label.style.top = b.style.top;
        wrap.appendChild(label);
      });
      wrap.appendChild(b);
    }
    const c = ctx.cart;
    if (c) {
      const arrow = el(`<svg class="map-cart" viewBox="-12 -12 24 24"><path d="M0-10L8 8 0 4-8 8z" fill="#fff" stroke="#c9673e" stroke-width="2.6" stroke-linejoin="round"/></svg>`);
      arrow.style.left = `${px(c.position.x)}px`; arrow.style.top = `${pz(c.position.z)}px`;
      arrow.style.transform = `rotate(${Math.atan2(Math.sin(c.heading), -Math.cos(c.heading))}rad)`;
      wrap.appendChild(arrow);
    }
    const n = G.visitedCount, m = medalAt(n);
    head.innerHTML = `<span class="chip">${medalSvg(m ? MEDAL_COLORS[m] : 'none')}<b>${n}/${stops.length}</b></span>`;
    if (next) {
      const chip = el(`<span class="chip"><span class="stopic" style="background:${stopColor(next)}">${svgIcon(next.icon)}</span><b></b></span>`);
      q('b', chip).textContent = stopName(next.id, lang);
      head.appendChild(chip);
    }
    tap(q('.x', panel), closeModal);
    openModal(panel, { onClose: () => { if (fromHud && !modals.length) resume(); } });
    if (pauseIt) G.pause(true);
  }

  // ---------- photo album ----------
  let album = {};
  try { album = JSON.parse(storeGet(ALBUM_KEY) || '{}') || {}; } catch { album = {}; }
  function saveAlbum() {
    if (storeSet(ALBUM_KEY, JSON.stringify(album))) return;
    // storage full: keep the newest photos only
    const ids = Object.keys(album).sort((a, b) => album[b].t - album[a].t);
    while (ids.length > 4) { delete album[ids.pop()]; if (storeSet(ALBUM_KEY, JSON.stringify(album))) return; }
  }
  function openAlbum() {
    const have = stops.filter((s) => album[s.id]).length;
    const panel = el(`<div class="panel">
      <h2>${svgIcon('photos')}<span data-t="album"></span><span class="chip" style="font-size:18px;height:34px">${have}/${stops.length}</span></h2>${closeBtn()}
      <div class="album-grid"></div>
      ${have ? '' : '<p class="album-hint" data-t="albumEmpty"></p>'}
    </div>`);
    const grid = q('.album-grid', panel);
    const rnd = ctx.rng('album');
    for (const s of stops) {
      const a = album[s.id];
      const tile = el(`<button class="album-tile${a ? '' : ' empty'}" style="--r:${(rnd() * 5 - 2.5).toFixed(1)}deg"><div class="ph"></div><div class="cap"></div></button>`);
      if (a) { const img = new Image(); img.src = a.img; img.alt = ''; q('.ph', tile).appendChild(img); }
      else { q('.ph', tile).innerHTML = svgIcon(s.icon); q('.ph', tile).style.color = shade(stopColor(s), -0.12); }
      q('.cap', tile).textContent = a ? stopName(s.id, lang) : '?';
      if (a) tap(tile, () => openPhoto(panel, s, a));
      grid.appendChild(tile);
    }
    tap(q('.x', panel), closeModal);
    openModal(panel);
  }
  function openPhoto(panel, s, a) {
    const box = el(`<div class="lightbox"><div class="polaroid" style="width:min(70vw,460px,calc((100vh - 110px) * 1.5 + 20px))"><div class="ph"><img alt=""></div><div class="cap"></div></div></div>`);
    q('img', box).src = a.img;
    q('.cap', box).textContent = stopName(s.id, lang);
    box.addEventListener('click', () => { sfx('tap'); box.remove(); });
    panel.appendChild(box);
  }

  // ---------- photo moment ----------
  const photoLayer = layer('vb-photo');
  let photo = null; // {id, index, total, medal, t, step, img}
  ev.on('stopReached', (e) => {
    photo = { ...e, medal: null, t: 0, step: -1, img: null };
    closeAllModals();
    photoLayer.innerHTML = `<div class="viewfinder"><i></i><i></i><i></i><i></i>
      <div class="vf-label">${svgIcon('camera')}<span>${t('smile')}</span></div></div>`;
    photoLayer.hidden = false;
  });
  function snapshot() {
    try {
      ctx.renderer.render(ctx.scene, ctx.camera);
      const src = ctx.renderer.domElement;
      const W = 480, H = 320;
      let cw = src.width, ch = (src.width * H) / W;
      if (ch > src.height) { ch = src.height; cw = (src.height * W) / H; }
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      // tall (portrait) frames: crop a little below the middle where the cart sits
      const sy = Math.min(src.height - ch, Math.max(0, src.height * 0.56 - ch / 2));
      g.drawImage(src, (src.width - cw) / 2, sy, cw, ch, 0, 0, W, H);
      // orange film-camera date stamp
      const d = new Date();
      g.font = '700 17px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = 'right';
      g.fillStyle = 'rgba(255,140,40,.92)'; g.shadowColor = 'rgba(255,80,0,.6)'; g.shadowBlur = 4;
      g.fillText(`${String(d.getDate()).padStart(2, '0')} ${String(d.getMonth() + 1).padStart(2, '0')} '${String(d.getFullYear()).slice(2)}`, W - 14, H - 14);
      return c.toDataURL('image/jpeg', 0.8);
    } catch { return null; }
  }
  function updatePhoto(dt) {
    if (!photo) return;
    photo.t += dt;
    const p = photo;
    // 3-2-1 countdown while the camera swings round, then click!
    const count = p.t < 0.35 ? 0 : p.t < 0.85 ? 3 : p.t < 1.35 ? 2 : p.t < 1.85 ? 1 : 4;
    if (count !== p.step && count > 0 && count < 4) {
      p.step = count;
      q('.vf-count', photoLayer)?.remove();
      const c = el(`<div class="vf-count">${count}</div>`);
      q('.viewfinder', photoLayer)?.appendChild(c);
    }
    if (count === 4 && p.step !== 4) {
      p.step = 4;
      p.img = snapshot();
      sfx('shutter');
      if (p.img) {
        album[p.id] = { img: p.img, t: Date.now() };
        saveAlbum();
      }
      photoLayer.innerHTML = '<div class="flash"></div>';
      p.cardAt = p.t + 0.25;
    }
    if (p.step === 4 && p.cardAt && p.t >= p.cardAt) {
      p.cardAt = 0;
      showCard(p);
    }
  }
  function showCard(p) {
    const s = stops.find((x) => x.id === p.id);
    const color = s ? stopColor(s) : '#ff9fc0';
    // two of the stop's facts, a different pair on each visit
    const all = stopFacts(p.id, lang);
    const skip = all.length > 2 ? Math.floor(Math.random() * all.length) : -1;
    const facts = all.filter((_, i) => i !== skip).slice(0, 2);
    const card = el(`<div class="pcard">
      <div class="polaroid"><span class="tape"></span><div class="ph"></div><div class="cap"></div>
        <div class="stamp" style="--c:${color}">${svgIcon(s?.icon || 'star')}</div></div>
      <div class="pinfo vb-card">
        <div class="found">${svgIcon('star')}<span>${t('youFound')}</span><span class="count">${p.index}/${p.total}</span></div>
        <h3></h3>
        <ul class="facts"></ul>
        <div class="pbtns">
          ${'speechSynthesis' in window ? `<button class="vb-btn round yellow p-read" aria-label="${t('readAloud')}">${svgIcon('speak')}</button>` : ''}
          <button class="vb-btn green big go"><span>${t('letsGo')}</span>${svgIcon('play')}</button>
        </div>
      </div>
    </div>`);
    if (p.img) { const img = new Image(); img.src = p.img; img.alt = ''; q('.ph', card).appendChild(img); }
    const name = stopName(p.id, lang);
    q('.polaroid .cap', card).textContent = name;
    q('h3', card).textContent = name;
    const ul = q('.facts', card);
    for (const f of facts) {
      const li = el(`<li>${svgIcon('star')}<span></span></li>`);
      q('span', li).textContent = f;
      ul.appendChild(li);
    }
    if (p.medal) {
      const m = el(`<div class="pmedal">${medalSvg(MEDAL_COLORS[p.medal])}<span>${t(`medal_${p.medal}`)}</span></div>`);
      q('.pbtns', card).before(m);
    }
    const read = q('.p-read', card);
    if (read) {
      tap(read, () => {
        try {
          const ss = window.speechSynthesis;
          ss.cancel();
          const u = new SpeechSynthesisUtterance([name, ...facts].join('. '));
          u.lang = SPEECH_LANG[lang]; u.rate = 0.95; u.pitch = 1.1;
          ss.speak(u);
        } catch { /* no voices */ }
      });
    }
    tap(q('.go', card), closeCard);
    photoLayer.innerHTML = '';
    photoLayer.appendChild(card);
    confetti(photoLayer, p.medal ? 70 : 34);
  }
  function closeCard() {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    photo = null;
    photoLayer.innerHTML = '';
    photoLayer.hidden = true;
    G.closeStop();
  }
  function confetti(parent, n) {
    const box = el('<div class="confetti"></div>');
    const colors = ['#ff8db0', '#ffd23f', '#6cc13b', '#5bb2f0', '#ffb77d', '#b79cff', '#73d7c1', '#ffffff'];
    const count = Math.round(n * (ctx.quality.particles ?? 1));
    for (let i = 0; i < count; i++) {
      const c = document.createElement('i');
      const w = 7 + Math.random() * 7;
      c.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * (1 + Math.random())).toFixed(0)}px;`
        + `background:${colors[i % colors.length]};animation-duration:${(2.2 + Math.random() * 2).toFixed(2)}s;animation-delay:${(Math.random() * 0.7).toFixed(2)}s;`
        + `border-radius:${Math.random() < 0.4 ? '50%' : '3px'}`;
      box.appendChild(c);
    }
    parent.appendChild(box);
    setTimeout(() => box.remove(), 5200);
  }

  // ---------- tour complete ----------
  ev.on('tourComplete', () => {
    const stars = Math.max(1, Math.min(3, G.stars()));
    const panel = el(`<div class="panel finish">
      <div class="big-title" data-t="youDidIt"></div>
      <div class="sub" data-t="tourDone"></div>
      <div class="stars">${[0, 1, 2].map((i) => svgIcon('star', i < stars ? 'lit' : '')).join('')}</div>
      <div class="row">
        <span class="chip stat">${medalSvg(MEDAL_COLORS.gold)}<b>${stops.length}/${stops.length}</b></span>
        <span class="chip stat">${ART.gelato}<b>${G.score.gelato}</b></span>
        <span class="chip stat">${ART.pinecone}<b>${G.score.pinecones}</b></span>
        <span class="chip stat">${svgIcon('clock')}<b>${fmtTime(G.tourTime)}</b></span>
      </div>
      <div class="row">
        <button class="vb-btn green big f-keep">${svgIcon('play')}<span data-t="keepDriving"></span></button>
        <button class="vb-btn terra f-new">${svgIcon('refresh')}<span data-t="newTour"></span></button>
      </div>
    </div>`);
    panel.querySelectorAll('.stars .lit').forEach((s, i) => { s.style.animationDelay = `${0.4 + i * 0.35}s`; });
    tap(q('.f-keep', panel), () => { closeAllModals(); G.keepDriving(); });
    tap(q('.f-new', panel), () => { closeAllModals(); newTour(); G.keepDriving(); });
    const wrap = openModal(panel);
    confetti(wrap, 90);
  });

  // ---------- portrait tip ----------
  let tipShown = storeGet(TIP_KEY) === '1';
  let tipEl = null;
  function checkRotateTip() {
    const portraitNow = innerHeight > innerWidth * 1.1;
    if (tipEl && (!portraitNow || G.state !== 'playing')) { tipEl.remove(); tipEl = null; }
    if (tipShown || tipEl || !portraitNow || G.state !== 'playing' || !touchMode) return;
    tipShown = true;
    tipEl = el(`<div class="vb-card rotate-tip">${svgIcon('rotate')}<span data-t="rotate"></span><button class="vb-btn green small" data-t="ok"></button></div>`);
    applyStrings(tipEl);
    const dismiss = () => { tipEl?.remove(); tipEl = null; storeSet(TIP_KEY, '1'); };
    tap(q('button', tipEl), dismiss);
    hud.appendChild(tipEl);
    setTimeout(dismiss, 8000);
  }

  // ---------- state ----------
  let playTime = 0;
  function applyState(s) {
    const playing = s === 'playing';
    title.hidden = s !== 'title';
    hud.hidden = !(playing || s === 'paused');
    controls.hidden = !(playing && touchMode);
    keysHint.hidden = touchMode || playTime > 18;
    if (!playing) releaseControls();
    if (s === 'title') {
      closeAllModals();
      photo = null; photoLayer.hidden = true;
      refreshDrivers(); refreshProgress(); refreshToggles();
    }
    if (s === 'paused' && !modals.length) openPause();
    if (playing) {
      // left paused from the outside (keyboard): drop the menus
      if (modals.length && !q('.finish', root)) closeAllModals();
      requestAnimationFrame(() => { sizeMinimap(); refreshHud(true); drawMini(); });
      checkRotateTip();
    }
    if (s !== 'stop' && photo) { photo = null; photoLayer.innerHTML = ''; photoLayer.hidden = true; }
  }
  ev.on('state', ({ to }) => applyState(to));
  ev.on('settings', (s) => {
    if (s.lang && s.lang !== lang && LANGS.includes(s.lang)) lang = s.lang;
    applyStrings();
    refreshToggles();
    refreshDrivers();
    resetConfirms();
    refreshHud(true);
  });
  ev.on('tourReset', () => { refreshProgress(); refreshHud(true); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G.state === 'playing') openPause(); }
    else if (G.state === 'playing' || G.state === 'paused') requestWakeLock();
  });
  addEventListener('resize', () => {
    sizeMinimap();
    checkRotateTip();
    const top = modals[modals.length - 1];
    if (top && q('.map-panel', top.wrap)) { const fromHud = G.state === 'paused' && modals.length === 1; closeModal(); openMap(fromHud); }
  });

  document.documentElement.lang = lang;
  applyStrings();
  refreshToggles();
  refreshDrivers();
  refreshProgress();
  applyState(G.state);

  let hudT = 0, mapT = 0;
  return {
    strings: STRINGS,
    openMap: () => openMap(G.state === 'playing'),
    openAlbum, openPause,
    update(dt) {
      // smooth steering: quick to turn, quicker to straighten
      const rate = (steerTarget === 0 ? 9 : 6) * dt;
      ti.steer += Math.max(-rate, Math.min(rate, steerTarget - ti.steer));
      if (Math.abs(ti.steer) < 0.01 && steerTarget === 0) ti.steer = 0;

      updatePhoto(dt);
      if (G.state !== 'playing') return;
      playTime += dt;
      if (playTime > 18 && !keysHint.hidden) keysHint.hidden = true;
      hudT += dt; mapT += dt;
      if (hudT > 0.25) { hudT = 0; refreshHud(); }
      if (mapT > 1 / 30) { mapT = 0; if (!miniSize) sizeMinimap(); drawMini(); }
    },
  };
}
