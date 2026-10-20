// Stylesheet for everything in #ui. Phones first: big rounded "candy" buttons, safe-area aware,
// no backdrop-filter (too slow over WebGL on mid-range Android).
export const CSS = String.raw`
#ui {
  --ink: #2a2118; --paper: #fffaf0; --cream: #fff3dc; --line: #eadcc0;
  --terra: #d9683c; --terra-d: #a8461f; --green: #6cc13b; --green-d: #3f8d1f; --pine: #3e6b35;
  --lemon: #ffd23f; --lemon-d: #d29a00; --straw: #ff8db0; --straw-d: #d5547d; --sky: #5bb2f0; --sky-d: #2d7ec1;
  --mint: #73d7c1; --peach: #ffb77d; --grape: #b79cff;
  --font: 'Baloo 2', 'Fredoka', ui-rounded, 'Arial Rounded MT Bold', 'Segoe UI', system-ui, sans-serif;
  --sl: max(12px, env(safe-area-inset-left)); --sr: max(12px, env(safe-area-inset-right));
  --st: max(10px, env(safe-area-inset-top)); --sb: max(10px, env(safe-area-inset-bottom));
  --cb: clamp(72px, 22vh, 98px);
  font-family: var(--font); color: var(--ink); line-height: 1.15;
  -webkit-font-smoothing: antialiased;
}
/* base rules wrapped in :where() so component classes always win */
:where(#ui) * { box-sizing: border-box; }
:where(#ui) [hidden] { display: none !important; }
:where(#ui) button { font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
:where(#ui) .ic { width: 1.4em; height: 1.4em; flex: none; display: block; }
:where(#ui) .art { width: 1.6em; height: 1.6em; flex: none; display: block; overflow: visible; }
:where(#ui) .flag { width: 30px; height: 20px; border-radius: 4px; flex: none; box-shadow: 0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.3); }
.vb-layer { position: absolute; inset: 0; pointer-events: none; }
.vb-layer[hidden] { display: none !important; }
.vb-layer > * { pointer-events: auto; }

/* ---------- buttons ---------- */
.vb-btn {
  --bg: #fff; --bgd: #d9c9a6; --fg: var(--ink);
  border: 0; border-radius: 999px; background: var(--bg); color: var(--fg);
  min-height: 64px; min-width: 64px; padding: 0 22px;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  font-weight: 800; font-size: 22px; letter-spacing: .2px; white-space: nowrap;
  box-shadow: inset 0 -5px 0 rgba(0,0,0,.13), inset 0 3px 0 rgba(255,255,255,.45), 0 4px 0 var(--bgd), 0 9px 16px rgba(42,33,24,.28);
  transition: transform .08s ease-out, box-shadow .08s ease-out;
}
.vb-btn:active, .vb-btn.on { transform: translateY(3px); box-shadow: inset 0 -3px 0 rgba(0,0,0,.13), inset 0 3px 0 rgba(255,255,255,.45), 0 1px 0 var(--bgd), 0 4px 8px rgba(42,33,24,.25); }
.vb-btn.green { --bg: var(--green); --bgd: var(--green-d); --fg: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.2); }
.vb-btn.terra { --bg: var(--terra); --bgd: var(--terra-d); --fg: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.2); }
.vb-btn.yellow { --bg: var(--lemon); --bgd: var(--lemon-d); }
.vb-btn.pink { --bg: var(--straw); --bgd: var(--straw-d); --fg: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.18); }
.vb-btn.blue { --bg: var(--sky); --bgd: var(--sky-d); --fg: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.18); }
.vb-btn.round { padding: 0; border-radius: 50%; width: 64px; height: 64px; }
.vb-btn.round .ic { width: 30px; height: 30px; }
.vb-btn.small { min-height: 52px; font-size: 18px; padding: 0 16px; }
.vb-btn.round.small { width: 52px; height: 52px; min-width: 52px; min-height: 52px; }
.vb-btn.round.small .ic { width: 26px; height: 26px; }
.vb-btn.round.wide { width: auto; padding: 0 16px 0 12px; border-radius: 999px; gap: 6px; font-size: 16px; }
.vb-btn.round span:empty { display: none; }
.vb-btn.big { min-height: 76px; font-size: 32px; padding: 0 34px; }
.vb-btn.big .ic { width: 34px; height: 34px; }
.vb-btn.confirm { animation: vb-wiggle .5s; --bg: var(--terra); --bgd: var(--terra-d); --fg: #fff; }

.vb-switch { position: relative; width: 54px; height: 32px; border-radius: 16px; background: #d9ccb1; flex: none; transition: background .15s; box-shadow: inset 0 2px 4px rgba(0,0,0,.18); }
.vb-switch::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 50%; background: #fff; box-shadow: 0 2px 3px rgba(0,0,0,.25); transition: transform .18s cubic-bezier(.3,1.6,.6,1); }
.on > .vb-switch, .vb-switch.on { background: var(--green); }
.on > .vb-switch::after, .vb-switch.on::after { transform: translateX(22px); }

.vb-card { background: rgba(255,250,240,.95); border-radius: 26px; box-shadow: 0 10px 28px rgba(42,33,24,.28), inset 0 0 0 3px #fff; }

/* ---------- title screen ---------- */
.vb-title {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr); gap: 14px 22px; align-items: center;
  padding: var(--st) var(--sr) var(--sb) var(--sl);
  background: radial-gradient(ellipse 70% 90% at 22% 40%, rgba(255,248,230,.6), rgba(255,248,230,0) 70%);
  animation: vb-fade .5s ease-out;
}
.vb-title > * { pointer-events: auto; }
.t-left { display: flex; flex-direction: column; align-items: center; gap: clamp(8px, 2.6vh, 16px); min-width: 0; }
.logo { text-align: center; display: flex; flex-direction: column; align-items: center; }
.logo .l0 {
  font-weight: 800; font-size: clamp(17px, min(5.4vh, 3.4vw), 30px); line-height: 1; color: #fff; letter-spacing: .4px; margin-bottom: 2px;
  text-shadow: 0 2px 0 var(--terra-d), 2px 0 0 var(--terra-d), -2px 0 0 var(--terra-d), 0 -2px 0 var(--terra-d),
    0 4px 0 var(--terra-d), 0 6px 10px rgba(42,33,24,.3);
}
.logo .l1 {
  font-weight: 800; font-size: clamp(32px, min(12vh, 6.2vw), 66px); line-height: .92; white-space: nowrap; color: #fff; letter-spacing: .5px;
  text-shadow: 0 3px 0 var(--terra-d), 3px 0 0 var(--terra-d), -3px 0 0 var(--terra-d), 0 -3px 0 var(--terra-d),
    2px 2px 0 var(--terra-d), -2px 2px 0 var(--terra-d), 2px -2px 0 var(--terra-d), -2px -2px 0 var(--terra-d),
    0 7px 0 var(--terra-d), 0 10px 14px rgba(42,33,24,.35);
}
.logo .l2 {
  margin-top: clamp(6px, 1.6vh, 12px); display: inline-block; background: var(--pine); color: #fff; font-weight: 800;
  font-size: clamp(18px, 5.2vh, 28px); padding: 2px 18px 0; border-radius: 14px; transform: rotate(-3deg);
  box-shadow: 0 4px 0 #26461f, 0 8px 14px rgba(0,0,0,.25);
}
.cart-art { width: clamp(96px, 30vh, 150px); height: auto; margin: -2px 0 -6px; animation: vb-bob 1.6s ease-in-out infinite; filter: drop-shadow(0 2px 0 rgba(255,255,255,.7)); }
.t-left .play { min-width: min(300px, 80%); }
.t-left .play .ic { width: 38px; height: 38px; }
.t-prog { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; }
.chip { height: 40px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px 0 8px; border-radius: 20px; background: rgba(255,250,240,.94); font-weight: 800; font-size: 19px; box-shadow: 0 3px 0 rgba(0,0,0,.08), 0 5px 10px rgba(42,33,24,.18); }
.chip .art { width: 28px; height: 28px; }
.chip small { font-size: .68em; margin-left: -5px; color: #8b7a5e; }
.chip small:empty { display: none; }
.chip .medals { display: inline-flex; margin-left: 2px; }
.chip .medals .art { width: 22px; height: 22px; margin-left: -4px; }
.t-right { display: flex; flex-direction: column; gap: clamp(8px, 2.4vh, 12px); min-width: 0; max-width: 470px; justify-self: center; width: 100%; }
.drivers-card { padding: clamp(8px, 2.4vh, 14px) 14px clamp(10px, 2.6vh, 16px); display: flex; flex-direction: column; align-items: center; gap: clamp(6px, 1.8vh, 10px); }
.drivers-card h2 { margin: 0; font-size: clamp(20px, 6vh, 28px); font-weight: 800; color: var(--terra-d); display: flex; align-items: center; gap: 8px; }
.drivers-card h2 .ic { color: var(--terra); }
.drivers { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(8px, 2.4vh, 14px) 12px; max-width: 380px; }
.drv { --d: clamp(52px, min(17.5vh, 9.4vw), 76px); position: relative; width: var(--d); height: var(--d); padding: 0; border-radius: 50%; border: 4px solid #fff; background: #fff; box-shadow: 0 3px 0 #d8c7a2, 0 6px 12px rgba(42,33,24,.2); transition: transform .15s cubic-bezier(.3,1.6,.6,1); }
.drv canvas { width: 100%; height: 100%; display: block; border-radius: 50%; }
.drv.sel { border-color: var(--lemon); transform: scale(1.1); box-shadow: 0 0 0 3px var(--terra), 0 6px 14px rgba(42,33,24,.3); z-index: 1; }
.drv .tick { position: absolute; right: -6px; top: -6px; width: 26px; height: 26px; border-radius: 50%; background: var(--green); color: #fff; display: none; place-items: center; box-shadow: 0 2px 0 var(--green-d); }
.drv .tick .ic { width: 18px; height: 18px; }
.drv.sel .tick { display: grid; animation: vb-pop .35s; }
.drv .nm { position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); max-width: 92px; padding: 0 7px; border-radius: 9px; background: #fff; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.drv .nm:empty { display: none; }
.namebox { display: flex; align-items: center; gap: 8px; width: min(100%, 320px); height: 48px; padding: 0 12px; border-radius: 24px; background: #fff; box-shadow: inset 0 0 0 3px var(--line); }
.namebox .ic { width: 24px; height: 24px; color: var(--terra); }
.namebox input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: 800 21px var(--font); color: var(--ink); -webkit-user-select: text; user-select: text; touch-action: auto; }
.namebox input::placeholder { color: #b7a68a; font-weight: 700; }
.setrow { display: flex; justify-content: center; gap: 10px; flex-wrap: nowrap; }
.setrow .vb-btn { font-size: 17px; flex: none; }
.setrow .t-easy { padding: 0 12px 0 14px; gap: 7px; }
.setrow .t-easy .ic { width: 26px; height: 26px; color: var(--pine); }
.vb-btn.off { opacity: .72; }
.vb-btn.off .ic { color: #9c8f78; }

/* language popover */
.catcher { position: absolute; inset: 0; z-index: 4; pointer-events: auto; }
.langpop { position: absolute; z-index: 5; pointer-events: auto; display: flex; gap: 6px; padding: 8px; border-radius: 22px; background: var(--paper); box-shadow: 0 10px 30px rgba(42,33,24,.35), inset 0 0 0 3px #fff; animation: vb-pop .25s; }
.langpop button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: min(64px, calc((100vw - 64px) / 5)); height: 66px; padding: 0; border: 0; border-radius: 16px; background: #fff; font-weight: 800; font-size: 14px; box-shadow: 0 3px 0 var(--line); }
.langpop button.sel { background: var(--lemon); box-shadow: 0 3px 0 var(--lemon-d); }

/* ---------- HUD ---------- */
.vb-hud { z-index: 10; }
.hud-top { position: absolute; top: var(--st); left: var(--sl); right: var(--sr); display: flex; align-items: flex-start; gap: 10px; pointer-events: none; }
.hud-top > * { pointer-events: auto; }
.hud-top .pause { flex: none; }
/* landscape: the counters stack under the pause button, so the next stop has the whole top row */
.counters { position: absolute; left: 0; top: 74px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; pointer-events: none; }
.counters .chip { height: 44px; font-size: 23px; }
.counters .chip .art { width: 32px; height: 32px; }
.chip.pop { animation: vb-pop .45s; }
.chip.near { animation: vb-twinkle .8s ease-in-out infinite alternate; }
.counters .medalct { display: none; }
.counters .medalct .art { width: 30px; height: 30px; }
.hud-next { flex: 1; min-width: 0; display: flex; justify-content: center; margin-top: 4px; pointer-events: none; }
.next {
  display: inline-flex; align-items: center; gap: 8px; max-width: 100%; height: 50px; padding: 0 14px 0 5px; border-radius: 25px;
  background: rgba(255,250,240,.95); box-shadow: 0 3px 0 rgba(0,0,0,.08), 0 6px 14px rgba(42,33,24,.22); font-weight: 800; font-size: 19px;
}
.next .stopic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; box-shadow: inset 0 -3px 0 rgba(0,0,0,.12); }
.next .stopic .ic { width: 26px; height: 26px; }
.next .nm { min-width: 0; overflow: hidden; line-height: 1.04; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
.next .dist { flex: none; color: var(--terra-d); font-size: 17px; }
.next .dir { flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--terra); color: #fff; display: grid; place-items: center; }
.next .dir .ic { width: 20px; height: 20px; transition: transform .2s linear; }
.next .medalct { display: inline-flex; align-items: center; gap: 2px; padding-right: 8px; margin-right: 2px; border-right: 2px solid var(--line); }
.next .medalct .art { width: 30px; height: 30px; }
.next.done .dist, .next.done .dir { display: none; }
.minimap { position: relative; flex: none; width: clamp(88px, 27vh, 124px); height: clamp(88px, 27vh, 124px); padding: 0; border: 0; border-radius: 50%; background: none; }
.minimap .disc { position: absolute; inset: 0; border-radius: 50%; border: 4px solid #fff; background: #ecdcbf; box-shadow: 0 4px 0 rgba(0,0,0,.1), 0 8px 16px rgba(42,33,24,.3); overflow: hidden; }
.minimap canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.minimap .zoom { position: absolute; left: -4px; bottom: -2px; width: 32px; height: 32px; border-radius: 50%; background: var(--terra); color: #fff; display: grid; place-items: center; box-shadow: 0 2px 0 var(--terra-d), 0 3px 6px rgba(0,0,0,.25); }
.minimap .zoom .ic { width: 19px; height: 19px; }
.keys { position: absolute; left: 50%; bottom: var(--sb); transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 18px; background: rgba(255,250,240,.88); font-weight: 700; font-size: 15px; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 10px rgba(42,33,24,.2); }
.keys kbd { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 5px; border-radius: 7px; background: #fff; font: 800 14px var(--font); box-shadow: inset 0 -3px 0 #e0d2b5, 0 1px 2px rgba(0,0,0,.25); }
.keys .sep { width: 8px; }

.turbo { position: absolute; left: 50%; top: 26%; transform: translate(-50%, -50%) rotate(-6deg); pointer-events: none; display: none; }
.turbo.show { display: block; animation: vb-turbo .5s cubic-bezier(.3,1.6,.6,1), vb-pulse .6s .5s ease-in-out infinite alternate; }
.turbo b { display: block; font-size: clamp(44px, 14vh, 84px); font-weight: 800; font-style: italic; letter-spacing: 2px; color: #fff;
  text-shadow: 0 4px 0 #e2541e, 4px 0 0 #e2541e, -4px 0 0 #e2541e, 0 -4px 0 #e2541e, 3px 3px 0 #e2541e, -3px 3px 0 #e2541e, 3px -3px 0 #e2541e, -3px -3px 0 #e2541e, 0 10px 0 #b33a12, 0 14px 22px rgba(0,0,0,.35); }
.speedlines { position: absolute; inset: -10%; pointer-events: none; opacity: 0; transition: opacity .3s;
  background: repeating-conic-gradient(from 0deg at 50% 55%, rgba(255,255,255,.0) 0deg 5deg, rgba(255,255,255,.5) 5deg 6deg);
  -webkit-mask: radial-gradient(ellipse at 50% 55%, transparent 38%, #000 75%); mask: radial-gradient(ellipse at 50% 55%, transparent 38%, #000 75%); }
.speedlines.show { opacity: .8; animation: vb-spin 1.2s linear infinite; }
.oops { position: absolute; left: 50%; top: 40%; pointer-events: none; opacity: 0; font-size: clamp(30px, 9vh, 46px); font-weight: 800; color: var(--terra-d);
  background: #fff; padding: 4px 22px 0; border-radius: 26px; box-shadow: 0 5px 0 #e3d3b4, 0 10px 18px rgba(0,0,0,.25); }
.oops.show { animation: vb-oops 1.1s ease-out forwards; }
.plus { position: absolute; font-weight: 800; font-size: 26px; color: #fff; pointer-events: none; text-shadow: 0 2px 0 var(--straw-d), 2px 0 0 var(--straw-d), -2px 0 0 var(--straw-d), 0 -2px 0 var(--straw-d); animation: vb-float .9s ease-out forwards; }
.toast { position: absolute; left: 50%; top: calc(var(--st) + 70px); transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 8px 22px 8px 10px; border-radius: 34px; background: var(--paper); font-weight: 800; font-size: 26px; box-shadow: 0 6px 0 var(--line), 0 12px 24px rgba(0,0,0,.3); pointer-events: none; animation: vb-toast 3s ease-in-out forwards; z-index: 60; }
.toast .art { width: 56px; height: 56px; }

/* ---------- touch controls ---------- */
.vb-controls { z-index: 20; touch-action: none; }
.vb-controls > * { -webkit-user-select: none; user-select: none; touch-action: none; }
.ctl { position: absolute; display: grid; place-items: center; border-radius: 50%; color: #fff;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.15), inset 0 4px 0 rgba(255,255,255,.4), 0 5px 0 var(--d), 0 10px 18px rgba(42,33,24,.3);
  transition: transform .06s, box-shadow .06s; opacity: .94; }
.ctl .ic { width: 46%; height: 46%; filter: drop-shadow(0 2px 0 rgba(0,0,0,.2)); }
.ctl.on { transform: translateY(4px) scale(.96); opacity: 1; box-shadow: inset 0 -3px 0 rgba(0,0,0,.15), inset 0 4px 0 rgba(255,255,255,.4), 0 1px 0 var(--d), 0 4px 8px rgba(42,33,24,.3); }
.steer { position: absolute; left: var(--sl); bottom: var(--sb); width: calc(var(--cb) * 2 + 14px); height: var(--cb); }
.steer .ctl { width: var(--cb); height: var(--cb); bottom: 0; background: #fffaf0; color: var(--sky-d); --d: #cdbb95; }
.steer .ctl .ic { width: 52%; height: 52%; filter: none; }
.steer .sl { left: 0; }
.steer .sr { right: 0; }
.gas { right: var(--sr); bottom: var(--sb); width: calc(var(--cb) * .98); height: calc(var(--cb) * 1.32); border-radius: 30px; background: var(--green); --d: var(--green-d); }
.gas .ic { width: 58%; height: auto; }
.gas span { position: absolute; bottom: 12%; font-weight: 800; font-size: calc(var(--cb) * .22); text-shadow: 0 2px 0 rgba(0,0,0,.2); }
.gas .ic { margin-top: -18%; }
.brake, .horn { --sm: max(64px, var(--cb) * .74); right: calc(var(--sr) + var(--cb) * .98 + 14px); width: var(--sm); height: var(--sm); }
.brake { bottom: var(--sb); background: var(--terra); --d: var(--terra-d); }
.horn { bottom: calc(var(--sb) + var(--sm) + 16px); background: var(--lemon); color: #7a4b00; --d: var(--lemon-d); }
.horn .art { width: 64%; height: 64%; filter: drop-shadow(0 2px 0 rgba(0,0,0,.15)); }
.horn.on { animation: vb-honk .18s ease-in-out infinite alternate; }

/* ---------- modal panels ---------- */
.vb-modal { position: absolute; inset: 0; z-index: 40; pointer-events: auto; display: grid; place-items: center; padding: var(--st) var(--sr) var(--sb) var(--sl); background: rgba(42,33,24,.42); animation: vb-fade .2s ease-out; overflow: hidden; }
.panel { position: relative; touch-action: pan-y; max-width: 100%; max-height: 100%; overflow: auto; background: var(--paper); border-radius: 28px; padding: 16px 18px 18px; box-shadow: 0 16px 40px rgba(0,0,0,.35), inset 0 0 0 3px #fff; animation: vb-rise .3s cubic-bezier(.3,1.4,.6,1); scrollbar-width: none; }
.panel::-webkit-scrollbar { display: none; }
.panel h2 { margin: 0 56px 12px 4px; font-size: 30px; font-weight: 800; color: var(--terra-d); display: flex; align-items: center; gap: 10px; line-height: 1.1; }
.panel h2 .ic { width: 32px; height: 32px; color: var(--terra); }
.panel .x { position: absolute; z-index: 4; top: 10px; right: 10px; width: 56px; height: 56px; min-width: 56px; min-height: 56px; }
.pause-body { display: flex; gap: 14px; align-items: stretch; }
.pause-main { flex: 1 1 auto; }
.pause-grid { display: grid; grid-template-columns: repeat(4, minmax(84px, 1fr)); gap: 12px; }
.pause-grid .resume { grid-column: 1 / -1; }
.tile { flex-direction: column; gap: 2px; min-height: 92px; border-radius: 24px; padding: 8px 6px; font-size: 16px; white-space: normal; text-align: center; line-height: 1.05; }
.tile .ic { width: 34px; height: 34px; }
.pause-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; }
.whodrives { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; min-width: 0; }
.whodrives canvas { width: 52px; height: 52px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); flex: none; }
.whodrives span { overflow: hidden; line-height: 1.05; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.fact { flex: 0 1 auto; width: 264px; min-width: 180px; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px 14px 14px; border-radius: 22px; background: var(--cream); box-shadow: inset 0 0 0 3px #fff; }
.fact-head { display: flex; align-items: center; gap: 8px; min-height: 52px; font-weight: 800; font-size: 18px; color: var(--pine); line-height: 1.05; }
.fact-head .art { width: 30px; height: 30px; }
.fact-head span { flex: 1; }
.fact p { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.25; }

.set-list { display: flex; flex-direction: column; gap: 10px; min-width: min(420px, 86vw); }
.set-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 6px 10px 6px 14px; border: 0; border-radius: 20px; background: #fff; box-shadow: 0 3px 0 var(--line); font-weight: 800; font-size: 21px; text-align: left; }
.set-row > span { display: flex; align-items: center; gap: 10px; }
.set-row .ic { width: 30px; height: 30px; color: var(--pine); }
.set-langs { display: flex; gap: 8px; flex-wrap: wrap; }
.set-langs button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; width: 64px; height: 64px; border: 0; border-radius: 16px; background: var(--cream); font-weight: 800; font-size: 13px; box-shadow: 0 3px 0 var(--line); }
.set-langs button.sel { background: var(--lemon); box-shadow: 0 3px 0 var(--lemon-d); }

/* full map */
.map-panel { padding: 10px; }
.map-wrap { position: relative; }
.map-wrap canvas { display: block; border-radius: 20px; }
.map-head { position: absolute; left: 10px; top: 10px; right: 76px; display: flex; flex-wrap: wrap; gap: 8px; pointer-events: none; }
.map-head .chip { font-size: 18px; }
.map-head .chip .stopic { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; }
.map-head .chip .stopic .ic { width: 20px; height: 20px; }
.map-stop { position: absolute; width: 48px; height: 48px; margin: -24px 0 0 -24px; padding: 0; border: 0; background: none; display: grid; place-items: center; }
.map-stop i { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 3px 6px rgba(0,0,0,.3); }
.map-stop i .ic { width: 22px; height: 22px; }
.map-stop.visited i { background: #fff !important; color: #3f9b3a; }
.map-stop.next::before { content: ''; position: absolute; inset: 2px; border-radius: 50%; border: 4px solid #fff; animation: vb-ring 1.2s ease-out infinite; }
.map-stop.sel i { transform: scale(1.25); }
.map-cart { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.4)); }
.map-label { position: absolute; transform: translate(-50%, -100%); margin-top: -26px; padding: 4px 12px 2px; border-radius: 14px; background: #fff; font-weight: 800; font-size: 17px; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 10px rgba(0,0,0,.25); animation: vb-pop .25s; }

/* album */
.album-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; width: min(820px, 94vw); }
.album-tile { position: relative; padding: 5px 5px 0; border: 0; background: #fff; border-radius: 6px; box-shadow: 0 3px 8px rgba(42,33,24,.25); display: flex; flex-direction: column; align-items: stretch; transform: rotate(var(--r, 0deg)); min-height: 64px; }
.album-tile .ph { aspect-ratio: 3 / 2; border-radius: 3px; overflow: hidden; background: var(--cream); display: grid; place-items: center; }
.album-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.album-tile .ph .ic { width: 44%; height: 44%; opacity: .7; }
.album-tile .cap { font-size: 13px; font-weight: 800; padding: 3px 2px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
.album-tile.empty { background: #f6eedf; box-shadow: inset 0 0 0 2px #e6d6b6; }
.album-tile.empty .cap { color: #a8977b; }
.album-hint { margin: 12px 0 0; text-align: center; font-weight: 700; font-size: 17px; color: #8b7a5e; }
.lightbox { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; background: rgba(42,33,24,.55); border-radius: 28px; animation: vb-fade .2s; }

/* ---------- photo moment ---------- */
.vb-photo { z-index: 50; }
.viewfinder { position: absolute; inset: 0; pointer-events: none; animation: vb-fade .3s; }
.viewfinder i { position: absolute; width: 14vmin; height: 14vmin; border: 0 solid #fff; filter: drop-shadow(0 2px 2px rgba(0,0,0,.35)); }
.viewfinder i:nth-child(1) { left: 7%; top: 9%; border-width: 6px 0 0 6px; border-radius: 18px 0 0 0; }
.viewfinder i:nth-child(2) { right: 7%; top: 9%; border-width: 6px 6px 0 0; border-radius: 0 18px 0 0; }
.viewfinder i:nth-child(3) { left: 7%; bottom: 9%; border-width: 0 0 6px 6px; border-radius: 0 0 0 18px; }
.viewfinder i:nth-child(4) { right: 7%; bottom: 9%; border-width: 0 6px 6px 0; border-radius: 0 0 18px 0; }
.vf-label { position: absolute; left: 50%; top: calc(var(--st) + 6%); transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 6px 22px 4px 12px; border-radius: 30px; background: var(--paper); font-weight: 800; font-size: clamp(22px, 7vh, 32px); box-shadow: 0 6px 0 var(--line), 0 10px 20px rgba(0,0,0,.3); animation: vb-drop .5s cubic-bezier(.3,1.5,.6,1); white-space: nowrap; }
.vf-label .ic { width: 36px; height: 36px; color: var(--terra); }
.vf-count { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); font-size: clamp(60px, 22vh, 120px); font-weight: 800; color: #fff; text-shadow: 0 5px 0 rgba(42,33,24,.35), 0 0 30px rgba(0,0,0,.25); animation: vb-count .5s ease-out; }
.flash { position: absolute; inset: 0; background: #fff; pointer-events: none; animation: vb-flash .7s ease-out forwards; }
.pcard { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: clamp(14px, 3vw, 34px); padding: var(--st) var(--sr) var(--sb) var(--sl); background: radial-gradient(ellipse at 50% 50%, rgba(42,33,24,.18), rgba(42,33,24,.5)); pointer-events: auto; }
.polaroid { position: relative; flex: none; background: #fff; padding: 10px 10px 0; border-radius: 4px; transform: rotate(-3.5deg); box-shadow: 0 2px 0 #e9e2d6, 0 18px 34px rgba(0,0,0,.4); animation: vb-polaroid .7s cubic-bezier(.25,1.3,.5,1); width: min(44vw, 330px, calc((100vh - 120px) * 1.5 + 20px)); }
.polaroid .ph { aspect-ratio: 3 / 2; background: #2a2118; overflow: hidden; border-radius: 2px; }
.polaroid img { width: 100%; height: 100%; object-fit: cover; display: block; animation: vb-develop 2.2s ease-out; }
.polaroid .cap { font-size: clamp(18px, 5.4vh, 26px); font-weight: 800; text-align: center; padding: 6px 4px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.polaroid .tape { position: absolute; left: 50%; top: -14px; width: 90px; height: 28px; margin-left: -45px; background: rgba(255,226,140,.82); transform: rotate(4deg); box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.stamp { position: absolute; right: -22px; top: -22px; width: 74px; height: 74px; border-radius: 50%; display: grid; place-items: center; border: 4px dashed rgba(255,255,255,.85); box-shadow: 0 0 0 4px var(--c, #ff8db0), 0 8px 14px rgba(0,0,0,.3); background: var(--c, #ff8db0); color: #2a2118; transform: rotate(14deg); animation: vb-stamp .55s .75s cubic-bezier(.3,1.6,.6,1) both; }
.stamp .ic { width: 40px; height: 40px; }
.pinfo { position: relative; touch-action: pan-y; flex: 0 1 400px; min-width: 0; max-height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 8px; padding: 14px 18px 16px; animation: vb-rise .5s .25s cubic-bezier(.3,1.3,.6,1) both; scrollbar-width: none; }
.pinfo .found { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: var(--terra); text-transform: uppercase; letter-spacing: .8px; }
.pinfo .found .count { margin-left: auto; padding: 1px 10px 0; border-radius: 12px; background: var(--cream); color: var(--ink); letter-spacing: 0; }
.pinfo h3 { margin: 0; font-size: clamp(24px, 7.4vh, 34px); font-weight: 800; line-height: 1.02; }
.facts { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.facts li { display: flex; gap: 8px; font-size: clamp(16px, 4.8vh, 20px); font-weight: 600; line-height: 1.22; }
.facts li .ic { width: 22px; height: 22px; color: var(--lemon-d); margin-top: 2px; }
.pmedal { display: flex; align-items: center; gap: 10px; padding: 4px 14px 4px 4px; border-radius: 36px; background: var(--cream); font-weight: 800; font-size: 22px; animation: vb-stamp .6s 1.2s cubic-bezier(.3,1.6,.6,1) both; align-self: flex-start; }
.pmedal .art { width: 54px; height: 54px; }
.pbtns { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.pbtns .go { flex: 1; }
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti i { position: absolute; top: -20px; width: 10px; height: 16px; border-radius: 3px; animation: vb-fall linear forwards; }

/* tour complete */
.finish { text-align: center; display: flex; flex-direction: column; align-items: center; gap: clamp(6px, 2.4vh, 12px); padding: clamp(12px, 4vh, 20px) 22px clamp(14px, 4.4vh, 22px); width: min(700px, 96vw); }
.finish .big-title { font-size: clamp(34px, 10vh, 52px); font-weight: 800; line-height: 1; color: var(--lemon); text-shadow: 0 3px 0 var(--terra-d), 3px 0 0 var(--terra-d), -3px 0 0 var(--terra-d), 0 -3px 0 var(--terra-d), 2px 2px 0 var(--terra-d), -2px 2px 0 var(--terra-d), 2px -2px 0 var(--terra-d), -2px -2px 0 var(--terra-d), 0 7px 0 var(--terra-d); }
.finish .sub { font-weight: 800; font-size: clamp(18px, 5.4vh, 22px); color: var(--pine); }
.finish .row .vb-btn.big { min-height: 68px; font-size: 27px; padding: 0 28px; }
.stars { display: flex; gap: 14px; }
.star { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.star > .ic { width: clamp(44px, 12vh, 74px); height: clamp(44px, 12vh, 74px); color: #e7dcc6; filter: drop-shadow(0 4px 0 rgba(0,0,0,.12)); }
.star > .ic.lit { color: var(--lemon); animation: vb-stamp .5s cubic-bezier(.3,1.6,.6,1) both; filter: drop-shadow(0 4px 0 var(--lemon-d)); }
.star .why { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px 0 6px; border-radius: 15px; background: #f1e7d3; color: #8b7a5e; font-weight: 800; font-size: 15px; white-space: nowrap; }
.star .why .art, .star .why .ic { width: 22px; height: 22px; }
.star .why .ic { color: var(--pine); }
.star.got .why { background: #fff0b8; color: var(--ink); }
.finish .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.finish .stat .art { width: 30px; height: 30px; }

/* portrait tip */
.rotate-tip { width: min(320px, 86vw); display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 18px; text-align: center; font-weight: 800; font-size: 22px; }
.rotate-tip .vb-btn { min-width: 140px; }
.rotate-tip .ic { width: 64px; height: 64px; color: var(--terra); animation: vb-turn 2.2s ease-in-out infinite; }

/* ---------- portrait phones ---------- */
@media (orientation: portrait) {
  #ui { --cb: clamp(70px, 19vw, 92px); }
  .vb-title { grid-template-columns: 1fr; align-content: center; align-content: safe center; gap: 14px; overflow-y: auto; }
  .t-left { display: contents; }
  .logo { order: 0; }
  .cart-art { order: 1; width: clamp(110px, 36vw, 160px); justify-self: center; margin: -8px auto -10px; }
  .t-right { order: 2; }
  .t-left .play { order: 3; justify-self: center; }
  .t-prog { order: 4; }
  .logo .l0 { font-size: clamp(18px, 5.6vw, 28px); }
  .logo .l1 { font-size: clamp(40px, 12.5vw, 64px); }
  .logo .l2 { font-size: clamp(20px, 6vw, 28px); }
  .drv { --d: clamp(60px, 17vw, 78px); }
  .hud-next { position: absolute; left: 0; right: 0; top: calc(clamp(88px, 27vw, 124px) + 10px); }
  .setrow { flex-wrap: wrap; max-width: 300px; justify-self: center; margin: 0 auto; }
  .setrow .t-easy { order: 5; }
  /* top row: pause, then gelato + pine cones and the medal count below them; the next stop gets the full width */
  .counters { position: static; flex-direction: row; flex-wrap: wrap; gap: 6px; min-width: 0; margin-top: 2px; }
  .counters .chip { height: 40px; font-size: 20px; padding: 0 9px 0 5px; }
  .counters .chip .art { width: 28px; height: 28px; }
  .counters .medalct { display: inline-flex; }
  .next .medalct { display: none; }
  .next { height: auto; min-height: 50px; padding-top: 4px; padding-bottom: 4px; }
  .minimap { width: clamp(88px, 27vw, 124px); height: clamp(88px, 27vw, 124px); margin-left: auto; }
  .pcard { flex-direction: column; justify-content: center; gap: 12px; }
  .polaroid { width: min(80vw, 340px); }
  .pinfo { flex: 0 1 auto; width: min(92vw, 420px); }
  .pause-grid { grid-template-columns: repeat(2, minmax(110px, 1fr)); }
  .pause-body { flex-direction: column; }
  .fact { width: auto; min-width: 0; }
  .pause-foot { flex-wrap: wrap; }
  .album-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .turbo { top: 34%; }
}
/* shorter portrait phones: everything on the title fits without scrolling */
@media (orientation: portrait) and (max-height: 800px) {
  .cart-art { display: none; }
}
@media (orientation: portrait) and (max-height: 720px) {
  .vb-title { gap: 10px; }
  .setrow { flex-wrap: nowrap; max-width: none; }
  .setrow .t-easy span { display: none; }
}
/* narrow landscape: the title settings stay on one line */
@media (orientation: landscape) and (max-width: 820px) {
  .setrow { gap: 8px; }
  .setrow .t-easy span { display: none; }
  .setrow .vb-btn { min-height: 56px; }
  .setrow .vb-btn.round { width: 56px; height: 56px; min-width: 56px; }
}
@media (orientation: landscape) and (max-height: 360px) {
  .vb-btn.big { min-height: 64px; font-size: 26px; }
  .cart-art { display: none; }
  .tile { min-height: 76px; }
}
@media (orientation: landscape) and (max-width: 760px) {
  .finish .row .vb-btn { font-size: 20px; padding: 0 18px; }
  .finish .row .vb-btn.big { min-height: 64px; font-size: 24px; padding: 0 22px; }
}
/* short landscape phones: the photo card fits */
@media (orientation: landscape) and (max-height: 400px) {
  .pinfo { padding: 10px 14px 12px; gap: 6px; }
  .pinfo h3 { font-size: 26px; }
  .facts li { font-size: 16px; line-height: 1.18; }
  .pbtns .vb-btn.big { min-height: 60px; font-size: 26px; }
  .pbtns .vb-btn.round { width: 60px; height: 60px; min-width: 60px; min-height: 60px; }
  .pmedal { font-size: 18px; }
  .pmedal .art { width: 40px; height: 40px; }
}
@media (min-width: 900px) and (min-height: 600px) {
  #ui { --cb: 104px; }
  .counters .chip { height: 50px; font-size: 26px; }
}

@keyframes vb-fade { from { opacity: 0; } }
@keyframes vb-pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 70% { transform: scale(.92); } 100% { transform: scale(1); } }
@keyframes vb-rise { from { opacity: 0; transform: translateY(40px) scale(.94); } }
@keyframes vb-drop { from { opacity: 0; transform: translate(-50%, -40px); } }
@keyframes vb-bob { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-4px) rotate(1deg); } }
@keyframes vb-wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
@keyframes vb-turbo { from { transform: translate(-50%, -50%) rotate(-6deg) scale(.2); opacity: 0; } }
@keyframes vb-pulse { to { transform: translate(-50%, -50%) rotate(-4deg) scale(1.08); } }
@keyframes vb-spin { to { transform: rotate(6deg); } }
@keyframes vb-oops { 0% { opacity: 0; transform: translate(-50%, 0) scale(.3) rotate(var(--rot, -8deg)); } 15% { opacity: 1; transform: translate(-50%, -10px) scale(1.1) rotate(var(--rot, -8deg)); } 25% { transform: translate(-50%, -12px) scale(1) rotate(var(--rot, -8deg)); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -40px) scale(1) rotate(var(--rot, -8deg)); } }
@keyframes vb-float { from { opacity: 1; transform: translateY(0) scale(.7); } 30% { transform: translateY(-14px) scale(1.2); } to { opacity: 0; transform: translateY(-50px) scale(1); } }
@keyframes vb-toast { 0% { opacity: 0; transform: translate(-50%, -30px) scale(.6); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.06); } 18% { transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, -20px); } }
@keyframes vb-honk { from { transform: translateY(4px) scale(.96) rotate(-4deg); } to { transform: translateY(4px) scale(1) rotate(4deg); } }
@keyframes vb-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes vb-count { from { opacity: 0; transform: translate(-50%, -50%) scale(2); } }
@keyframes vb-polaroid { from { opacity: 0; transform: translateY(70vh) rotate(18deg); } }
@keyframes vb-develop { 0% { filter: brightness(2.4) saturate(0) contrast(.5); } 60% { filter: brightness(1.2) saturate(.6) sepia(.25); } 100% { filter: none; } }
@keyframes vb-stamp { from { opacity: 0; transform: scale(2.6) rotate(-30deg); } }
@keyframes vb-fall { to { transform: translateY(110vh) rotate(720deg); } }
@keyframes vb-twinkle { from { box-shadow: 0 3px 0 rgba(0,0,0,.08), 0 0 0 0 rgba(255,210,63,.0); } to { box-shadow: 0 3px 0 rgba(0,0,0,.08), 0 0 0 5px rgba(255,210,63,.9), 0 0 18px 6px rgba(255,190,40,.7); transform: scale(1.08); } }
@keyframes vb-ring { from { transform: scale(.8); opacity: 1; } to { transform: scale(1.7); opacity: 0; } }
@keyframes vb-turn { 0%, 20% { transform: rotate(0); } 50%, 70% { transform: rotate(-90deg); } 100% { transform: rotate(0); } }
@media (prefers-reduced-motion: reduce) {
  .vb-layer *, .vb-modal, .panel { animation-duration: .01s !important; animation-iteration-count: 1 !important; }
}
`;
