// ==== BRISCOLA AL TAVOLINO (23-10-2026) ====
// Attivita' del salotto della hall (NON e' un gioco con la porta): seduti al tavolino del te' si gioca a Briscola 1 contro 1, con un amico
// seduto o con il computer ("il Conte"); gli altri del party possono guardare. Da soli: "🃏 Carte al tavolino" nella reception.
// Tavolo a tutto schermo fatto di <img> (carte da giochi/lib/carte.js) mossi con le transizioni CSS: niente ridisegni a ogni fotogramma.
// ONLINE: chi sfida fa da BANCO e tiene la partita in cq/<party>/bc/<suo sid>/s ({m: JSON, ts}, scritto con cqNetPut); le giocate dell'altro
// arrivano in bc/<sid>/a (azioni: il banco controlla turno e carta, poi le cancella); chi guarda si segna in bc/<sid>/w/<suo sid>.
// Le mani stanno nello stato condiviso: chi leggesse il database vedrebbe le carte (tra amici va bene; detto all'utente).
(() => {
// ==BC ENGINE==   (regole e computer: si provano in node con require, vedi prove/bc1.js)
const BCE = (() => {
  const PTS = [0, 11, 0, 10, 0, 0, 0, 0, 2, 3, 4];   // Asso 11, Tre 10, Re 4, Cavallo 3, Fante 2: totale 120
  const STR = [0, 10, 1, 9, 2, 3, 4, 5, 6, 7, 8];    // forza: Asso, 3, Re, Cavallo, Fante, 7, 6, 5, 4, 2
  const su = c => c[0], rk = c => +c.slice(1), pts = c => PTS[rk(c)], str = c => STR[rk(c)];
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // partita nuova: first = chi gioca per primo (chi non ha dato le carte)
  function newGame(seed, first) {
    const R = rng(seed), d = [];
    for (const s of 'dcsb') for (let r = 1; r <= 10; r++) d.push(s + r);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const S = { ph: 'play', d, h: [[], []], t: [], w: [[], []], tu: first, ld: first, first, k: 0, v: 1, last: null };
    for (let i = 0; i < 3; i++) { S.h[first].push(d.pop()); S.h[1 - first].push(d.pop()); }
    S.bc = d[0]; S.b = su(d[0]);   // la briscola: scoperta sotto il mazzo, e' l'ultima carta che si pesca
    return S;
  }
  // b (risposta) batte a (carta di chi ha aperto)? Stesso seme: la piu' forte; seme diverso: solo se b e' briscola
  const beats = (b, a, B) => su(b) === su(a) ? str(b) > str(a) : su(b) === B;
  function play(S, p, c) {
    if (S.ph !== 'play' || S.tu !== p || S.t.length >= 2) return false;
    const i = S.h[p].indexOf(c); if (i < 0) return false;
    S.h[p].splice(i, 1); S.t.push([p, c]); S.v++;
    S.tu = S.t.length === 2 ? -1 : 1 - p;
    return true;
  }
  // la presa: chi vince prende le due carte, pesca per primo e apre la prossima
  function resolve(S) {
    if (S.t.length !== 2) return -1;
    const [[pa, a], [pb, b]] = S.t, win = beats(b, a, S.b) ? pb : pa;
    S.w[win].push(a, b); S.last = { c: [a, b], w: win }; S.t = []; S.k++;
    if (S.d.length) { S.h[win].push(S.d.pop()); S.h[1 - win].push(S.d.pop()); }
    S.ld = S.tu = win; S.v++;
    if (!S.h[0].length && !S.h[1].length) { S.ph = 'end'; S.tu = -1; }
    return win;
  }
  const score = S => S.w.map(w => w.reduce((a, c) => a + pts(c), 0));
  // finale a carte scoperte (mazzo finito): la giocata migliore fino in fondo. Ritorna { v: miei punti - suoi, c: carta }
  function mm(h, t, tu, me, B) {
    if (!h[tu].length) return { v: 0, c: null };
    let best = null;
    for (const c of h[tu]) {
      const nh = [h[0].slice(), h[1].slice()]; nh[tu].splice(nh[tu].indexOf(c), 1);
      let v;
      if (!t.length) v = mm(nh, [[tu, c]], 1 - tu, me, B).v;
      else { const [pa, a] = t[0], win = beats(c, a, B) ? tu : pa, g = pts(a) + pts(c); v = (win === me ? g : -g) + mm(nh, [], win, me, B).v; }
      if (!best || (tu === me ? v > best.v : v < best.v)) best = { v, c };
    }
    return best;
  }
  // IL COMPUTER: gioca bene ma non perfetto. Tiene i carichi, liscia quando conviene, "strozza" i lisci con l'asso o il tre dello stesso seme,
  // taglia i carichi con la briscola piu' piccola, conta le briscole uscite; a mazzo finito conta tutto e gioca a carte scoperte.
  // Ogni tanto (err) sceglie la seconda giocata migliore.
  function hint(S, p, R = Math.random, err = 0.1) {
    const H = S.h[p], B = S.b, o = 1 - p;
    if (H.length === 1) return H[0];
    if (!S.d.length) {   // mazzo finito: le carte che non ho visto sono tutte in mano all'altro
      const seen = new Set([...S.w[0], ...S.w[1], ...S.t.map(x => x[1]), ...H]), opp = [];
      for (const s of 'dcsb') for (let r = 1; r <= 10; r++) if (!seen.has(s + r)) opp.push(s + r);
      const h = []; h[p] = H; h[o] = opp;
      if (opp.length === S.h[o].length) return mm(h, S.t.slice(), p, p, B).c;
    }
    // briscole ancora in giro (non viste da me): servono a capire se un mio carico e' al sicuro
    const seen = new Set([...S.w[0], ...S.w[1], ...S.t.map(x => x[1]), ...H, S.bc]);
    const outB = r => { let n = 0; for (let k = 1; k <= 10; k++) if (STR[k] > STR[r] && !seen.has(B + k)) n++; return n; };
    const brOut = 10 - [...seen].filter(c => su(c) === B).length;   // briscole che l'altro potrebbe avere
    const late = S.d.length <= 6;
    // quanto mi costa usare/perdere una briscola: le alte valgono di piu', verso la fine di meno
    const keepB = c => su(c) !== B ? 0 : (late ? 1 : 2) + str(c) * (late ? 0.3 : 0.45) + (pts(c) >= 10 ? 3 : 0);
    const val = [];
    if (S.t.length === 1) {   // rispondo
      const a = S.t[0][1];
      for (const c of H) {
        const win = beats(c, a, B), g = pts(a) + pts(c);
        let v = win ? g - keepB(c) : -g - (su(c) === B ? keepB(c) * 0.6 : 0);
        if (!win && su(c) !== B) v -= str(c) * 0.04;   // a parita' libero la carta piu' debole
        val.push([c, v]);
      }
    } else {   // apro io: meglio un liscio; i carichi e le briscole il piu' tardi possibile
      for (const c of H) {
        let v;
        if (su(c) === B) v = -(3 + str(c) * 0.5) - pts(c) * 0.6 + (outB(rk(c)) === 0 && late ? 3 : 0);
        else if (!pts(c)) v = 1 - str(c) * 0.05;
        else {
          // un carico o una figura si prende con una carta piu' forte dello stesso seme o con una briscola
          const higher = []; for (let k = 1; k <= 10; k++) if (STR[k] > str(c) && !seen.has(su(c) + k)) higher.push(k);
          const risk = Math.min(1, (higher.length ? 0.5 : 0) + (brOut ? 0.55 : 0));
          v = -pts(c) * (0.35 + 0.65 * risk);
        }
        val.push([c, v]);
      }
    }
    val.sort((x, y) => y[1] - x[1]);
    return val.length > 1 && R() < err ? val[1][0] : val[0][0];
  }
  // IL COMPUTER VERO: per ogni carta che puo' giocare immagina n volte le carte che non vede (mano dell'altro e mazzo, mescolati a caso
  // ma senza quelle gia' uscite) e gioca la partita fino in fondo con le regole qui sopra (hint); sceglie la carta che in media fa piu' punti.
  // Non bara: usa solo quello che vedrebbe una persona al tavolo. Ogni tanto (err) sceglie la seconda giocata migliore.
  function ai(S, p, R = Math.random, err = 0.08, n = 48) {
    const H = S.h[p], o = 1 - p;
    if (H.length === 1) return H[0];
    if (!S.d.length) return hint(S, p, R, 0);   // mazzo finito: a carte scoperte gia' perfetto
    const seen = new Set([...S.w[0], ...S.w[1], ...S.t.map(x => x[1]), ...H, S.bc]), un = [];
    for (const s of 'dcsb') for (let r = 1; r <= 10; r++) if (!seen.has(s + r)) un.push(s + r);
    const no = S.h[o].length, tot = H.map(() => 0);
    for (let k = 0; k < n; k++) {
      const u = un.slice(); for (let i = u.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [u[i], u[j]] = [u[j], u[i]]; }
      const base = { ph: 'play', b: S.b, bc: S.bc, t: S.t.map(x => x.slice()), w: [S.w[0].slice(), S.w[1].slice()], tu: S.tu, ld: S.ld, k: S.k, v: 0, h: [], d: [S.bc, ...u.slice(no)] };
      base.h[p] = H.slice(); base.h[o] = u.slice(0, no);
      H.forEach((c, i) => {
        const X = { ...base, t: base.t.map(x => x.slice()), w: [base.w[0].slice(), base.w[1].slice()], h: [base.h[0].slice(), base.h[1].slice()], d: base.d.slice() };
        play(X, p, c); if (X.t.length === 2) resolve(X);
        while (X.ph === 'play') { play(X, X.tu, hint(X, X.tu, R, 0)); if (X.t.length === 2) resolve(X); }
        const sc = score(X); tot[i] += sc[p] - sc[o];
      });
    }
    const val = H.map((c, i) => [c, tot[i] / n]).sort((x, y) => y[1] - x[1]);
    return R() < err && val[1][1] > val[0][1] - 8 ? val[1][0] : val[0][0];   // l'errore solo tra due giocate vicine: niente regali assurdi
  }
  return { newGame, play, resolve, score, ai, hint, beats, pts, str, su, rk };
})();
// ==END BC ENGINE==
if (typeof window === 'undefined') { module.exports = BCE; return; }

// ---------------------------------------------------------------- tavolo ----------------------------------------------------------------
const NAMES = { d: 'Denari', c: 'Coppe', s: 'Spade', b: 'Bastoni' };
const AI_NAME = 'Il Conte 🎩';
const SAY = {   // il Conte parla ogni tanto (sotto il suo nome)
  take: ['Grazie, molto gentile!', 'Questo lo prendo io.', 'Ah, che bel carico!', 'Oplà!'],
  lose: ['Accidenti!', 'Ahi ahi ahi…', 'Me l\'aspettavo…', 'Bel colpo, lo ammetto.'],
  cut: ['Briscola!', 'Taglio!', 'E questa?'],
  win: 'Bella partita! Una rivincita?', loss: 'Complimenti, mi hai battuto!', tie: 'Pari! Nessuno ci crederà.',
};
const myName = () => (store.settings.myName || '').trim().slice(0, 14) || 'Tu';
const BC = {};
let T = null;   // il tavolo aperto (o la sfida in attesa): { key, host, me, S, root, els, ... }
let G = null;   // misure del tavolo
const L = { N: null, un: [], tabs: {}, ms: {}, asked: {}, acc: {}, hudT: 0, bubT: 0 };   // ascolto della rete del party

// ---- stile ----
const st = document.createElement('style');
st.textContent = `
#bcT{position:fixed;inset:0;z-index:80;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff;
 background:radial-gradient(ellipse 120% 85% at 50% 45%,#2f8d55 0%,#22713f 50%,#123f24 100%)}
#bcT .felt{position:absolute;inset:0;pointer-events:none;opacity:.55;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1.3px);background-size:5px 5px}
#bcT .rim{position:absolute;inset:0;pointer-events:none;z-index:1;box-shadow:inset 0 0 0 6px #4a2a12,inset 0 0 0 8px #9a6a32,inset 0 0 0 9px #3a200c,inset 0 0 70px 14px rgba(0,0,0,.45)}
#bcT.noanim .bcC,#bcT.noanim .bcC .in,#bcT.noanim .bcStack{transition:none!important}
#bcTop{position:absolute;left:14px;right:14px;top:calc(14px + env(safe-area-inset-top));display:flex;align-items:center;gap:8px;z-index:300}
#bcTop button{background:rgba(0,0,0,.32);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:7px 12px;font:600 15px system-ui,sans-serif}
#bcTop button.on{background:rgba(40,160,90,.75)}
#bcTop .sp{flex:1}
#bcWatch{font:600 14px system-ui,sans-serif;background:rgba(0,0,0,.28);padding:6px 10px;border-radius:11px}
.bcC{position:absolute;left:0;top:0;transition:transform .45s cubic-bezier(.2,.75,.25,1);will-change:transform}
.bcC .in{position:absolute;inset:0;transition:transform .4s ease;transform-style:preserve-3d}
.bcC.down .in{transform:rotateY(180deg)}
.bcC img{position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:7%/4.2%;box-shadow:0 4px 10px rgba(0,0,0,.38);pointer-events:none}
.bcC img.b{transform:rotateY(180deg)}
.bcC.go img.f{box-shadow:0 0 0 3px rgba(255,224,120,.95),0 7px 16px rgba(0,0,0,.45)}
.bcC.no{animation:bcNo .35s}
@keyframes bcNo{25%{margin-left:-6px}75%{margin-left:6px}}
.bcStack{position:absolute;left:0;top:0;transition:transform .3s}
.bcStack img{position:absolute;inset:0;width:100%;height:100%;border-radius:7%/4.2%}
.bcCnt{position:absolute;right:-8px;top:-8px;min-width:26px;height:26px;border-radius:13px;background:#f2c230;color:#3a2408;font:800 14px/26px system-ui,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.4);padding:0 4px;box-sizing:border-box}
.bcLbl{position:absolute;left:0;right:0;text-align:center;z-index:150;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.55)}
#bcMsg{font:800 21px system-ui,sans-serif}
#bcMsg.me{color:#ffe27a;animation:bcPulse 1.5s ease-in-out infinite}
@keyframes bcPulse{50%{transform:scale(1.07)}}
#bcOpp,#bcBot{font:700 15px system-ui,sans-serif;opacity:.95}
#bcOpp .th{display:inline-block;animation:bcDots 1.2s infinite;opacity:.8}
@keyframes bcDots{50%{opacity:.25}}
#bcSay{position:absolute;z-index:160;left:50%;transform:translateX(-50%);background:#fdf8ec;color:#2b1b12;font:600 14px system-ui,sans-serif;padding:7px 12px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.35);white-space:nowrap;transition:opacity .3s;pointer-events:none}
#bcSay::before{content:'';position:absolute;left:50%;top:-6px;margin-left:-6px;border:6px solid transparent;border-top:0;border-bottom-color:#fdf8ec}
#bcBr{position:absolute;z-index:150;font:700 13px system-ui,sans-serif;background:rgba(0,0,0,.3);padding:5px 9px 5px 6px;border-radius:10px;display:flex;align-items:center;gap:6px;pointer-events:none}
#bcBr img{width:22px;height:auto;border-radius:3px}
#bcFx{position:absolute;z-index:190;left:0;right:0;text-align:center;font:900 28px system-ui,sans-serif;pointer-events:none;text-shadow:0 3px 10px rgba(0,0,0,.6);opacity:0;transition:transform 1s cubic-bezier(.2,.8,.3,1),opacity .35s}
#bcFx.on{opacity:1}
.bcBox{background:linear-gradient(#fdf8ec,#efe2c2);color:#2b1b12;border-radius:18px;padding:18px 16px 16px;max-width:380px;width:100%;box-shadow:0 14px 44px rgba(0,0,0,.55);text-align:center;box-sizing:border-box}
.bcBox h2{margin:0 0 6px;font:900 24px system-ui,sans-serif}
.bcBox p{margin:6px 0;font:500 15px/1.35 system-ui,sans-serif}
.bcBox button{display:block;width:100%;margin-top:10px;border:0;border-radius:13px;padding:13px;font:800 17px system-ui,sans-serif;background:#e6d6b0;color:#2b1b12}
.bcBox button.pr{background:#2f8a52;color:#fff;box-shadow:0 3px 0 #1d5c35}
.bcBox button.pr.wait{background:#7a9a85;box-shadow:none}
#bcEnd,#bcAsk,#bcModal{position:absolute;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px;box-sizing:border-box}
#bcModal{position:fixed;z-index:120}
.bcSc{font:900 46px system-ui,sans-serif;letter-spacing:1px;margin:4px 0 2px}
.bcRows{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 2px;text-align:left}
.bcRows>div{background:rgba(255,255,255,.55);border-radius:12px;padding:8px 9px;font:500 13px/1.35 system-ui,sans-serif}
.bcRows b.n{display:block;font:800 15px system-ui,sans-serif;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bcRows .pt{font:900 26px system-ui,sans-serif}
.bcMini{display:flex;flex-wrap:wrap;gap:2px;margin:3px 0}
.bcMini img{width:24px;height:auto;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.bcSer{font:600 13px system-ui,sans-serif;opacity:.75;margin-top:6px}
.bcPick{display:flex;align-items:center;gap:10px;text-align:left}
#bcHallB,#bcWatchB{position:absolute;right:18px;font-size:16px;font-weight:700;padding:11px 15px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:5}
#bcHallB{bottom:356px}#bcWatchB{bottom:412px}
`;
document.head.appendChild(st);

// ---- suoni (con beep/thud del motore: seguono l'interruttore dei suoni) ----
const sfx = {
  tac: () => { thud(0.6, 1500); thud(0.32, 380); },
  swish: () => thud(0.3, 2900),
  shuffle: () => { for (let i = 0; i < 11; i++) setTimeout(() => thud(0.24, 2000 + Math.random() * 1800), i * 48); },
  take: mine => { if (mine) { beep(988, 0.08, 0.03); beep(1319, 0.14, 0.03, 0.08); } else beep(392, 0.13, 0.025); },
  carico: () => [1568, 2093, 2637].forEach((f, i) => beep(f, 0.09, 0.025, i * 0.07, 'triangle')),
  no: () => beep(180, 0.08, 0.03, 0, 'square'),
  tick: () => beep(1700 + Math.random() * 200, 0.025, 0.015),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, i === 3 ? 0.45 : 0.14, 0.035, i * 0.13, 'triangle')),
  lose: () => [392, 370, 349, 262].forEach((f, i) => beep(f, i === 3 ? 0.5 : 0.18, 0.03, i * 0.18, 'triangle')),
  tie: () => [523, 523, 659].forEach((f, i) => beep(f, 0.16, 0.03, i * 0.15, 'triangle')),
};

// ---- misure ----
function geo() {
  const vw = innerWidth, vh = innerHeight, cs = getComputedStyle(document.documentElement);
  const sb = parseFloat(cs.getPropertyValue('--sab')) || 0;
  const W = Math.floor(Math.min(124, (vw - 36) / 3.25, vh * 0.145)), H = Math.round(W * CARTE.H / CARTE.W);
  const top = 64, cy = Math.round(vh * 0.44), dpr = Math.min(3, window.devicePixelRatio || 1);
  return { vw, vh, W, H, top, cy, dpr, bot: vh - 16 - sb, px: Math.round(W * dpr) };
}
const img = c => CARTE.url(c[0], +c.slice(1), G.px), backImg = () => CARTE.url('d', 0, G.px);

// ---- apri / chiudi ----
function open() {
  G = geo();
  const r = document.createElement('div'); r.id = 'bcT';
  r.innerHTML = `<div class="felt"></div><div class="rim"></div>
  <div id="bcTop"><button id="bcExit" type="button">✕ Esci</button><div class="sp"></div><span id="bcWatch" hidden></span><button id="bcMic" type="button" hidden>🎤</button></div>
  <div class="bcStack" id="bcDeck"><img alt=""><span class="bcCnt"></span></div>
  <div class="bcStack" id="bcPile0"><img alt=""></div><div class="bcStack" id="bcPile1"><img alt=""></div>
  <div id="bcBr"></div><div class="bcLbl" id="bcOpp"></div><div class="bcLbl" id="bcBot"></div><div id="bcSay" style="opacity:0"></div>
  <div class="bcLbl" id="bcMsg"></div><div id="bcFx"></div>`;
  document.body.appendChild(r);
  T.root = r; T.els = new Map(); T.prev = null; T.g = -1;
  r.querySelector('#bcExit').onclick = askExit;
  r.querySelector('#bcMic').onclick = () => { if (typeof cqVoiceMic === 'function') cqVoiceMic().then(micUI); };
  micUI();
  addEventListener('resize', onResize);
  render();
}
function micUI() { const b = T && T.root && T.root.querySelector('#bcMic'); if (!b) return; const on = !!(cq.net && typeof cqV !== 'undefined'); b.hidden = !on; if (on) { b.textContent = cqV.mic ? '🎤 Acceso' : '🎤 Spento'; b.classList.toggle('on', !!cqV.mic); } }
function onResize() { if (!T || !T.root) return; const g = geo(); if (g.W !== G.W) { for (const e of T.els.values()) e.remove(); T.els.clear(); } T.instant = true; render(); }
function close() {
  if (!T) return;
  clearTimeout(T.rt); clearTimeout(T.at); clearTimeout(T.it);
  if (T.root) T.root.remove();
  const N = cq.net;
  if (N && T.key) {
    if (T.host) N.F.remove(cqNetRef(`cq/${N.code}/bc/${T.key}`)).catch(() => {});
    else if (T.me < 0) N.F.remove(cqNetRef(`cq/${N.code}/bc/${T.key}/w/${N.sid}`)).catch(() => {});
  }
  removeEventListener('resize', onResize);
  T = null;
}
// uscire: durante la partita si chiede (con un amico vale come partita persa)
function askExit() {
  const S = T.S;
  if (T.me < 0 || S.ph !== 'play') { leave(); return; }
  const a = document.createElement('div'); a.id = 'bcAsk';
  a.innerHTML = `<div class="bcBox"><h2>Lasci il tavolo?</h2><p>${T.S.ai >= 0 || !T.key ? 'La partita finisce qui.' : 'La partita va a <b>' + esc(S.n[1 - T.me]) + '</b>.'}</p><button class="pr" type="button">🃏 Resto a giocare</button><button type="button">🚪 Esco</button></div>`;
  T.root.appendChild(a);
  const [stay, go] = a.querySelectorAll('button'); stay.onclick = () => a.remove(); go.onclick = () => { a.remove(); leave(); };
}
function leave() {
  if (!T) return;
  if (T.host) { if (T.key && cq.net && T.S.ph !== 'inv') { if (T.S.ph === 'play' && T.S.ai < 0) { T.S.ph = 'end'; T.S.fo = 0; } T.S.gone = 1; publish(); } close(); }
  else { if (T.me >= 0) send({ k: 'bye' }); close(); }
}

// ---- disegno del tavolo: ogni carta va al suo posto (le transizioni CSS fanno il movimento) ----
function place(e, x, y, r, s, face, z, delay) {
  e.style.transitionDelay = delay ? delay + 's' : '';
  e.style.transform = `translate(${x - G.W / 2}px,${y - G.H / 2}px) rotate(${r}deg) scale(${s})`;
  e.style.zIndex = z;
  if (face) { const f = e.querySelector('.f'); if (!f.getAttribute('src')) f.src = img(e.code); }
  e.classList.toggle('down', !face);
  if (delay) e.querySelector('.in').style.transitionDelay = (delay + 0.12) + 's'; else e.querySelector('.in').style.transitionDelay = '';
}
function cardEl(code) {
  let e = T.els.get(code); if (e) return [e, false];
  e = document.createElement('div'); e.className = 'bcC down'; e.code = code;
  e.style.width = G.W + 'px'; e.style.height = G.H + 'px';
  e.innerHTML = `<div class="in"><img class="f" alt=""><img class="b" alt="" src="${backImg()}"></div>`;
  e.onclick = () => tap(code, e);
  T.root.appendChild(e); T.els.set(code, e); return [e, true];
}
function stack(el, x, y, r, s, n, z) {
  el.hidden = !n; if (!n) return;
  const im = el.querySelector('img'); if (im.getAttribute('src') !== backImg()) im.src = backImg();
  el.style.width = G.W + 'px'; el.style.height = G.H + 'px'; el.style.zIndex = z;
  el.style.transform = `translate(${x - G.W / 2}px,${y - G.H / 2}px) rotate(${r}deg) scale(${s})`;
  const th = Math.min(7, Math.ceil(n / 5)), sh = []; for (let i = 1; i <= th; i++) sh.push(`${-i * 0.7}px ${i * 1.2}px 0 ${i % 2 ? '#e9dcc0' : '#b9a57a'}`);
  im.style.boxShadow = sh.join(',') + ',0 6px 12px rgba(0,0,0,.4)';
}
function render() {
  if (!T || !T.root) return;
  G = geo();
  const S = T.S, P = T.prev, me = T.me, bot = me >= 0 ? me : 0, top = 1 - bot, R = T.root;
  if (S.ph === 'inv') return;
  if (T.g !== S.g) { for (const e of T.els.values()) e.remove(); T.els.clear(); T.g = S.g; T.deal = true; R.querySelector('#bcEnd') && R.querySelector('#bcEnd').remove(); }
  R.classList.toggle('noanim', !!T.instant);
  const myTurn = S.ph === 'play' && S.tu === me && S.t.length < 2;
  const deckX = 18 + G.W * 0.62 / 2 + 4, cy = G.cy, sTop = 0.56;
  const handY = G.bot - G.H / 2 - (myTurn ? 10 : 0), topY = G.top + G.H * sTop / 2;
  const pileX = G.vw - 18 - G.H * 0.5 / 2, pileY = [0, 0]; pileY[bot] = cy + G.H * 0.8; pileY[top] = cy - G.H * 0.8;
  const want = new Map();
  for (const seat of [0, 1]) {
    const h = S.h[seat], n = h.length;
    h.forEach((c, i) => {
      const k = i - (n - 1) / 2;
      if (seat === bot) want.set(c, [G.vw / 2 + k * G.W * 1.05, handY + Math.abs(k) * 4, k * 4, 1, me === bot, 60 + i, seat]);
      else want.set(c, [G.vw / 2 + k * G.W * sTop * 0.74, topY, 180 - k * 4, sTop, false, 60 + i, seat]);
    });
  }
  const tx = G.vw / 2 + G.W * 0.2;
  S.t.forEach(([p, c], k) => want.set(c, [tx + (k ? G.W * 0.34 : -G.W * 0.34), cy + (k ? 10 : -6) + (p === top ? -8 : 8), k ? 7 : -6, 0.9, true, 120 + k, -1]));
  if (S.d.length) want.set(S.bc, [deckX + G.W * 0.62 * 0.45, cy, 90, 0.62, true, 8, -1]);
  // carte prese: volano sul mucchio di chi ha vinto, poi spariscono
  for (const [c, e] of [...T.els]) if (!want.has(c)) {
    const seat = S.w[0].includes(c) ? 0 : 1;
    if (T.instant) { e.remove(); T.els.delete(c); continue; }
    place(e, pileX, pileY[seat], 90, 0.5, false, 140, 0.15);
    T.els.delete(c); setTimeout(() => e.remove(), 800);
  }
  // carte nuove: partono dal mazzo (chi ha preso pesca per primo); alla prima mano la distribuzione una per volta
  const fresh = [];
  for (const [c, w] of want) { const [e, isNew] = cardEl(c); if (isNew) fresh.push([c, e, w]); }
  if (fresh.length) {
    const order = T.deal ? [] : null;
    if (T.deal) { for (let i = 0; i < 3; i++) for (const seat of [S.first, 1 - S.first]) { const f = fresh.find(x => x[0] === S.h[seat][i]); if (f) order.push(f); } for (const f of fresh) if (!order.includes(f)) order.push(f); }
    const list = order || fresh.sort((a, b) => (b[2][6] === (S.last ? S.last.w : -2)) - (a[2][6] === (S.last ? S.last.w : -2)));
    list.forEach(([c, e], i) => {
      if (T.instant || c === S.bc && T.deal) return;
      e.style.transition = 'none'; e.querySelector('.in').style.transition = 'none';
      place(e, deckX, cy, 0, 0.62, false, 50, 0); void e.offsetWidth;
      e.style.transition = ''; e.querySelector('.in').style.transition = '';
      const d = T.deal ? 0.45 + i * 0.14 : 0.42 + i * 0.2;
      e.dly = d; setTimeout(() => { if (T && T.root) sfx.swish(); }, d * 1000);
    });
    if (T.deal && !T.instant) sfx.shuffle();
  }
  for (const [c, w] of want) {
    const e = T.els.get(c), d = e.dly || 0; e.dly = 0;
    place(e, w[0], w[1], w[2], w[3], w[4], w[5], d);
    const mine = me === w[6] && me === bot; e.classList.toggle('go', mine && myTurn); e.style.cursor = mine ? 'pointer' : '';
  }
  // mazzo, mucchi, scritte
  stack(R.querySelector('#bcDeck'), deckX, cy, 0, 0.62, Math.max(0, S.d.length - 1), 20);
  R.querySelector('#bcDeck .bcCnt').textContent = S.d.length;
  R.querySelector('#bcDeck .bcCnt').style.transform = `rotate(0deg) scale(${1 / 0.62})`;
  for (const seat of [0, 1]) stack(R.querySelector('#bcPile' + seat), pileX, pileY[seat], 90, 0.5, S.w[seat].length, 30);
  const br = R.querySelector('#bcBr'), brH = `<img alt="" src="${CARTE.url(S.b, 1, 60)}">Briscola: ${NAMES[S.b]}`;
  if (br.dataset.b !== S.b) { br.innerHTML = brH; br.dataset.b = S.b; }
  br.style.left = '14px'; br.style.top = (cy + G.W * 0.62 * 0.5 + G.H * 0.06 + 34) + 'px';
  const nm = i => esc(S.n[i] || '?'), aNm = i => i === S.ai ? 'al Conte' : nm(i), ilNm = i => i === S.ai ? 'il Conte' : nm(i);
  const opp = R.querySelector('#bcOpp'), think = S.ph === 'play' && S.tu === top && S.t.length < 2;
  opp.innerHTML = nm(top) + (think ? ' <span class="th">sta pensando…</span>' : '');
  opp.style.top = (G.top + G.H * sTop + 8) + 'px';
  const say = R.querySelector('#bcSay'); say.style.top = (G.top + G.H * sTop + 34) + 'px';
  const bl = R.querySelector('#bcBot'); bl.hidden = me >= 0; bl.innerHTML = nm(bot); bl.style.top = (G.bot - G.H - 30) + 'px';
  const msg = R.querySelector('#bcMsg');
  let m = '';
  if (S.ph === 'play') {
    if (S.t.length === 2) { const w = BCE.beats(S.t[1][1], S.t[0][1], S.b) ? S.t[1][0] : S.t[0][0]; m = w === me ? 'Prendi tu! ✨' : 'Prende ' + ilNm(w); }
    else if (S.tu === me) m = S.k === 0 && S.t.length === 0 && !T.tipped ? 'Tocca a te: tocca una carta' : 'Tocca a te';
    else m = 'Tocca ' + (S.tu === S.ai ? '' : 'a ') + aNm(S.tu) + '…';
    if (!S.d.length && S.k >= 17 && S.t.length < 2 && S.h[0].length + S.h[1].length === 6) m += ' · ultime carte!';
  }
  if (msg.innerHTML !== m) msg.innerHTML = m;
  msg.className = 'bcLbl' + (myTurn ? ' me' : '');
  msg.style.top = (me >= 0 ? G.bot - G.H - 44 - 10 : cy + G.H * 0.62) + 'px';
  watchUI();
  events(P, S);
  T.prev = JSON.parse(JSON.stringify(S)); T.instant = false; T.deal = false;
  if (S.ph === 'end' && !R.querySelector('#bcEnd') && !T.endT) T.endT = setTimeout(() => { if (T) { T.endT = 0; endPanel(); } }, P && P.ph === 'play' ? 1100 : 0);
  if (S.ph === 'end' && R.querySelector('#bcEnd')) endPanel(true);
}
// cosa e' appena successo (suoni, scritte che volano, il Conte che parla)
function events(P, S) {
  if (!P || P.g !== S.g || T.instant) return;
  const me = T.me;
  if (S.t.length > P.t.length) sfx.tac();
  if (S.k > P.k && S.last) {
    const w = S.last.w, mine = w === me, car = S.last.c.filter(c => BCE.pts(c) >= 10);
    setTimeout(() => { if (!T) return; sfx.swish(); if (me >= 0) sfx.take(mine); }, 120);
    if (car.length) {
      setTimeout(() => { if (T) sfx.carico(); }, 260);
      fx(me < 0 ? esc(S.n[w]) + ' prende ' + (car.length > 1 ? 'due carichi!' : 'un carico!') : mine ? '💰 Carico preso!' : '😬 Carico perso!', mine || me < 0 ? '#ffe27a' : '#ffb3a8');
    }
    if (S.ai >= 0 && Math.random() < 0.42 && S.k - (T.sayK || -9) >= 2) {
      const aiWon = w === S.ai, cut = aiWon && S.last.c.some(c => c[0] === S.b) && S.last.c.some(c => c[0] !== S.b);
      if (car.length || cut) { T.sayK = S.k; aiSay(aiWon ? (cut && !car.length ? SAY.cut : SAY.take) : SAY.lose); }
    }
  }
  if (P.d.length && !S.d.length && S.ph === 'play') setTimeout(() => fx('Mazzo finito: ultime carte!', '#fff'), 900);
}
function fx(t, col) {
  const f = T.root.querySelector('#bcFx'); f.innerHTML = t; f.style.color = col || '#fff';
  f.style.transition = 'none'; f.style.top = (G.cy - 30) + 'px'; f.style.transform = 'scale(.6)'; f.classList.remove('on'); void f.offsetWidth;
  f.style.transition = ''; f.classList.add('on'); f.style.transform = 'translateY(-50px) scale(1)';
  clearTimeout(T.fxT); T.fxT = setTimeout(() => { if (T && T.root) f.classList.remove('on'); }, 1300);
}
function aiSay(t) {
  if (!T || !T.root) return;
  const s = T.root.querySelector('#bcSay'); s.textContent = '«' + (Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : t) + '»'; s.style.opacity = 1;
  clearTimeout(T.sayT); T.sayT = setTimeout(() => { if (T && T.root) s.style.opacity = 0; }, 2600);
}
function watchUI() {
  const w = T.root.querySelector('#bcWatch'), n = T.watch || 0; w.hidden = !n || !T.key; w.textContent = '👀 ' + n;
}

// ---- fine partita: conteggio automatico dei punti, carichi, figure, serie, Rivincita ----
function endPanel(upd) {
  const S = T.S, R = T.root, me = T.me, bot = me >= 0 ? me : 0, top = 1 - bot, sc = BCE.score(S);
  let box = R.querySelector('#bcEnd');
  const rv = S.rv || [0, 0], other = 1 - me, gone = S.gone != null && S.gone !== me && S.ai < 0;
  const btn = () => {
    if (me < 0) return '<button type="button" id="bcEx">Chiudi</button>';
    if (gone) return `<p>${esc(S.n[other])} si è alzato dal tavolo.</p><button type="button" id="bcEx">🚪 Esci</button>`;
    const w = rv[me] ? (rv[other] ? '' : ' wait') : '';
    const t = rv[me] ? 'Aspetto ' + esc(S.n[other]) + '…' : rv[other] ? '🔁 ' + esc(S.n[other]) + ' vuole la rivincita!' : '🔁 Rivincita';
    return `<button class="pr${w}" type="button" id="bcRv">${t}</button><button type="button" id="bcEx">🚪 Esci</button>`;
  };
  if (upd && box) { const b = box.querySelector('.bcBtns'); const h = btn(); if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; hook(); } return; }
  if (box) return;
  const fo = S.fo != null, who = i => i === S.ai ? 'il Conte' : esc(S.n[i]);
  let title, snd;
  if (fo) { const w = 1 - S.fo; title = me < 0 ? '🏆 Vince ' + esc(S.n[w]) : w === me ? '🏆 Hai vinto!' : '🚪 Partita lasciata'; snd = w === me ? 'win' : null; }
  else if (sc[0] === sc[1]) { title = '🤝 Pareggio!'; snd = 'tie'; }
  else { const w = sc[0] > sc[1] ? 0 : 1; title = me < 0 ? '🏆 Vince ' + who(w) : w === me ? '🏆 Hai vinto!' : '😅 Ha vinto ' + who(w); snd = w === me || me < 0 ? 'win' : 'lose'; }
  const col = i => {
    const W = S.w[i], car = W.filter(c => BCE.pts(c) >= 10).sort((a, b) => BCE.pts(b) - BCE.pts(a)), fig = W.filter(c => BCE.rk(c) >= 8).length;
    return `<div><b class="n">${esc(S.n[i])}</b><span class="pt" data-p="${sc[i]}">0</span> punti<br>Carte prese: <b>${W.length}</b><br>Carichi (assi e tre): <b>${car.length}</b>
      <div class="bcMini">${car.map(c => `<img alt="" src="${CARTE.url(c[0], +c.slice(1), 72)}">`).join('')}</div>Figure: <b>${fig}</b></div>`;
  };
  const ser = S.sc && S.g > 0 ? `<div class="bcSer">Partite al tavolo: ${esc(S.n[bot])} ${S.sc[bot]} – ${S.sc[top]} ${esc(S.n[top])}</div>` : '';
  box = document.createElement('div'); box.id = 'bcEnd';
  box.innerHTML = `<div class="bcBox"><h2>${title}</h2>${fo ? `<p>${esc(S.n[S.fo])} ha lasciato la partita.</p>` : `<div class="bcSc"><span id="bcS0">0</span> – <span id="bcS1">0</span></div><p style="margin:0;font-size:13px;opacity:.7">${esc(S.n[bot])} – ${esc(S.n[top])} · per vincere servono più di 60 punti</p>`}
    <div class="bcRows">${col(bot)}${col(top)}</div>${ser}<div class="bcBtns"></div></div>`;
  R.appendChild(box);
  const b = box.querySelector('.bcBtns'); b.innerHTML = btn(); b.dataset.h = b.innerHTML; hook();
  // conteggio: i numeri salgono insieme, con un ticchettio
  const t0 = performance.now(), D = 1700, a = sc[bot], z = sc[top];
  const step = () => {
    if (!T || T.root !== R) return;
    const k = Math.min(1, (performance.now() - t0) / D), e = 1 - Math.pow(1 - k, 3), x = Math.round(a * e), y = Math.round(z * e);
    const s0 = box.querySelector('#bcS0'), s1 = box.querySelector('#bcS1');
    if (s0 && (s0.textContent !== String(x) || s1.textContent !== String(y))) { s0.textContent = x; s1.textContent = y; sfx.tick(); }
    box.querySelectorAll('.pt').forEach(p => { p.textContent = Math.round(+p.dataset.p * e); });
    if (k < 1) requestAnimationFrame(step);
    else { if (snd) sfx[snd](); if (S.ai >= 0 && !fo) aiSay(sc[S.ai] > sc[1 - S.ai] ? SAY.win : sc[S.ai] < sc[1 - S.ai] ? SAY.loss : SAY.tie); }
  };
  requestAnimationFrame(step);
  function hook() {
    const ex = box.querySelector('#bcEx'), r = box.querySelector('#bcRv');
    if (ex) ex.onclick = leave;
    if (r) r.onclick = () => { if (!(T.S.rv || [])[me]) act({ k: 'rv' }); };
  }
}

// ---- giocate ----
function tap(code, e) {
  const S = T.S, me = T.me;
  if (me < 0 || !S.h[me].includes(code)) return;
  if (S.ph !== 'play' || S.tu !== me || S.t.length >= 2) { e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); sfx.no(); return; }
  T.tipped = true;
  act({ k: 'play', c: code });
}
function act(a) {
  if (T.host) { hostAct(T.me, a); return; }
  if (a.k === 'play') { BCE.play(T.S, T.me, a.c); render(); }   // subito sul mio telefono: il banco poi conferma
  send(a);
}
function send(a) { const N = cq.net; if (N && T && T.key) N.F.push(cqNetRef(`cq/${N.code}/bc/${T.key}/a`), { s: N.sid, m: JSON.stringify(a) }).catch(() => {}); }
// il banco: controlla e applica le azioni (sue, dell'amico, del computer)
function hostAct(seat, a) {
  const S = T.S;
  if (a.k === 'play') { if (BCE.play(S, seat, a.c)) after(); }
  else if (a.k === 'rv' && S.ph === 'end' && S.gone == null) {
    (S.rv = S.rv || [0, 0])[seat] = 1;
    if (S.ai >= 0) S.rv[S.ai] = 1;
    if (S.rv[0] && S.rv[1]) newRound(); else commit();
  } else if (a.k === 'bye') {
    if (S.ph === 'play') { S.ph = 'end'; S.fo = seat; S.tu = -1; S.sc[1 - seat]++; }
    S.gone = seat; commit();
  }
}
function after() {
  commit();
  const S = T.S, tok = T;
  if (S.t.length === 2) {
    clearTimeout(T.rt);
    T.rt = setTimeout(() => {
      if (T !== tok) return;
      BCE.resolve(S);
      if (S.ph === 'end') { const sc = BCE.score(S); if (sc[0] !== sc[1]) S.sc[sc[0] > sc[1] ? 0 : 1]++; }
      commit();
    }, 1250);
  }
}
function commit() {
  T.S.v++; publish(); render();
  const S = T.S, tok = T;
  if (S.ph === 'play' && S.ai >= 0 && S.tu === S.ai && S.t.length < 2) {
    clearTimeout(T.at);
    T.at = setTimeout(() => { if (T !== tok || S.tu !== S.ai) return; hostAct(S.ai, { k: 'play', c: BCE.ai(S, S.ai) }); }, 750 + Math.random() * 750);
  }
}
function publish() {
  const N = cq.net; if (!N || !T.key) return;
  cqNetPut(`cq/${N.code}/bc/${T.key}/s`, { m: JSON.stringify(T.S), ts: Date.now() });
}
function newRound() {
  const S0 = T.S, first = S0.first == null ? Math.floor(Math.random() * 2) : 1 - S0.first;
  const S = BCE.newGame(1 + Math.floor(Math.random() * 1e9), first);
  Object.assign(S, { p: S0.p, n: S0.n, ai: S0.ai, ts0: S0.ts0, sc: S0.sc || [0, 0], g: (S0.g || 0) + 1, rv: [0, 0], v: (S0.v || 0) + 1 });
  T.S = S; commit();
}

// ---- inizio: da solo, contro il computer nella hall, sfida a un amico, guardare ----
function startAI(hall) {
  close();
  const N = hall ? cq.net : null;
  T = { key: N ? N.sid : null, host: true, me: 0, hall: !!hall, S: { ph: 'inv', p: [N ? N.sid : null, null], n: [myName(), AI_NAME], ai: 1, sc: [0, 0], g: 0, v: 1 } };
  if (N) N.F.onDisconnect(cqNetRef(`cq/${N.code}/bc/${N.sid}`)).remove();
  open(); newRound();
}
BC.solo = () => startAI(false);
function challenge(c) {
  const N = cq.net; if (!N) return;
  close();
  T = { key: N.sid, host: true, me: 0, hall: true, S: { ph: 'inv', p: [N.sid, c.sid], n: [myName(), String(c.name || 'Amico').slice(0, 14)], ai: -1, sc: [0, 0], g: 0, v: 1, ts0: Date.now() } };
  N.F.onDisconnect(cqNetRef(`cq/${N.code}/bc/${N.sid}`)).remove();
  publish();
  modal(`<h2>🃏 Sfida a Briscola</h2><p>Aspetto la risposta di <b>${esc(T.S.n[1])}</b>…</p><button type="button" data-k="x">Annulla</button>`, k => { if (k === 'x' && T && T.S.ph === 'inv') close(); });
  const tok = T;
  T.it = setTimeout(() => { if (T === tok && T.S.ph === 'inv') { modalClose(); close(); cqToast('🃏 <b>' + esc(tok.S.n[1]) + '</b> non ha risposto alla sfida.'); } }, 30000);
}
function watch(key) {
  const N = cq.net, t = L.tabs[key]; if (!N || !t || !t.s) return;
  close();
  T = { key, host: false, me: -1, hall: true, S: JSON.parse(t.s.m) };
  N.F.set(cqNetRef(`cq/${N.code}/bc/${key}/w/${N.sid}`), 1).catch(() => {});
  N.F.onDisconnect(cqNetRef(`cq/${N.code}/bc/${key}/w/${N.sid}`)).remove();
  T.instant = true; open();
}
function joinAsGuest(key, S) {
  close();
  T = { key, host: false, me: 1, hall: true, S };
  T.instant = false; open();
}
// messaggi arrivati al mio tavolo (sono il banco)
function hostMsg(from, a) {
  if (!T || !T.host || !T.key) return;
  const S = T.S, seat = S.p.indexOf(from); if (seat < 0) return;
  if (S.ph === 'inv') {
    if (a.k === 'ok') { clearTimeout(T.it); modalClose(); open(); newRound(); }
    else if (a.k === 'no') { const n = S.n[1]; modalClose(); close(); cqToast('🃏 <b>' + esc(n) + '</b> ha detto di no. Sarà per un\'altra volta!'); }
    return;
  }
  hostAct(seat, a);
}

// ---- finestrella (sfide, scelte) sopra la hall ----
function modal(html, then) {
  modalClose();
  const m = document.createElement('div'); m.id = 'bcModal'; m.innerHTML = `<div class="bcBox">${html}</div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { modalClose(); then && then(b.dataset.k); }; });
  return m;
}
function modalClose() { const m = document.getElementById('bcModal'); if (m) m.remove(); }
// "🃏 Carte": con chi gioco? (gli amici seduti al tavolino, o il Conte)
function pick() {
  const N = cq.net, Gm = cq.g; if (!Gm || !Gm.hall) return;
  const busy = playing(), fr = Gm.chars.filter(c => c.remote && c.alive && c.sit != null && !busy.has(c.sid));
  const list = fr.map((c, i) => `<button type="button" data-k="f${i}" class="bcPick">🙂 ${esc(c.name)}</button>`).join('');
  modal(`<h2>🃏 Briscola al tavolino</h2><p>Con chi giochi?</p>${list || '<p style="opacity:.7">Nessun amico seduto al tavolino: invita qualcuno a sedersi!</p>'}
    <button type="button" data-k="ai" class="bcPick">🎩 Il Conte (computer)</button><button type="button" data-k="x">Annulla</button>`, k => {
    if (k === 'ai') startAI(true);
    else if (k[0] === 'f') { const c = fr[+k.slice(1)]; if (c && N) challenge(c); }
  });
}

// ---- rete del party: tavoli, inviti, chi guarda ----
function resub() {
  for (const u of L.un) try { u(); } catch {}
  L.un = []; L.N = cq.net; L.tabs = {}; L.ms = {};
  const N = cq.net; if (!N) return;
  L.un.push(N.F.onValue(cqNetRef(`cq/${N.code}/bc`), s => { if (cq.net === N) { L.tabs = s.val() || {}; onTabs(); } }));
  L.un.push(N.F.onChildAdded(cqNetRef(`cq/${N.code}/bc/${N.sid}/a`), sn => { const v = sn.val(); N.F.remove(sn.ref).catch(() => {}); try { hostMsg(v.s, JSON.parse(v.m)); } catch {} }));
}
const parse = (key, t) => { if (!t || !t.s || typeof t.s.m !== 'string') return null; const c = L.ms[key]; if (c && c.m === t.s.m) return c.S; try { const S = JSON.parse(t.s.m); L.ms[key] = { m: t.s.m, S }; return S; } catch { return null; } };
// chi e' seduto a giocare (per i fumetti, il ventaglio di carte in mano e la lista degli sfidabili)
function playing() {
  const s = new Set(), now = Date.now();
  for (const [k, t] of Object.entries(L.tabs)) { const S = parse(k, t); if (S && S.ph !== 'inv' && now - (t.s.ts || 0) < 15 * 60000) for (const p of S.p) if (p) s.add(p); }
  return s;
}
function onTabs() {
  const N = cq.net; if (!N) return;
  for (const [key, t] of Object.entries(L.tabs)) {
    const S = parse(key, t); if (!S || !S.p) continue;
    // una sfida per me
    if (S.ph === 'inv' && S.p[1] === N.sid && !L.asked[key + ':' + S.ts0] && Date.now() - (t.s.ts || 0) < 30000) {
      L.asked[key + ':' + S.ts0] = 1; L.inv = key;
      sfx.carico();
      modal(`<h2>🃏 Sfida a Briscola!</h2><p><b>${esc(S.n[0])}</b> ti sfida a Briscola al tavolino.</p><button class="pr" type="button" data-k="ok">✅ Accetta</button><button type="button" data-k="no">❌ No</button>`, k => {
        L.inv = null; L.acc[key] = k === 'ok' ? S.ts0 : 0;
        if (!T || T.key !== key) N.F.push(cqNetRef(`cq/${N.code}/bc/${key}/a`), { s: N.sid, m: JSON.stringify({ k }) }).catch(() => {});
      });
    }
    // ho accettato e la partita e' partita: mi siedo al tavolo
    if (S.ph === 'play' && S.p[1] === N.sid && L.acc[key] && L.acc[key] === S.ts0 && (!T || T.key !== key)) { L.acc[key] = 0; joinAsGuest(key, S); }
  }
  if (L.inv && (!L.tabs[L.inv] || (parse(L.inv, L.tabs[L.inv]) || {}).ph !== 'inv')) { L.inv = null; modalClose(); }
  // il tavolo che sto guardando o dove gioco come ospite
  if (T && T.key) {
    const t = L.tabs[T.key];
    if (!T.host) {
      const S = parse(T.key, t);
      if (!S) { const n = T.S && T.S.n ? T.S.n[0] : ''; close(); if (T == null && n) cqToast('🃏 Il tavolo di <b>' + esc(n) + '</b> si è chiuso.'); return; }
      if (S.v !== T.S.v || S.g !== T.S.g || S.ph !== T.S.ph || JSON.stringify(S) !== JSON.stringify(T.S)) { T.S = JSON.parse(JSON.stringify(S)); render(); }
    }
    T.watch = t && t.w ? Object.keys(t.w).length : 0;
    if (T.root) watchUI();
  }
}

// ---- hall: pulsanti, fumetti, ventaglio di carte in mano ----
function btn(id, txt, fn) {
  let b = document.getElementById(id);
  if (!b) { b = document.createElement('button'); b.id = id; b.className = 'btn'; b.type = 'button'; b.hidden = true; (document.getElementById('cqSit') || {}).parentNode.appendChild(b); }
  b.onclick = fn; if (b.textContent !== txt) b.textContent = txt; return b;
}
BC.hud = salon => {
  if (cq.net !== L.N) resub();
  L.hudT = performance.now();
  const N = cq.net, open = !!(T && (T.root || T.S.ph === 'inv')), near = Math.hypot(cq.x - CQ_SALA.x, cq.y - CQ_SALA.y) < 4.2;
  const cb = btn('bcHallB', '🃏 Carte', pick), show = !!(salon && cq.sit != null && !open);
  if (cb.hidden === show) cb.hidden = !show;
  let wk = null; if (!open && near) for (const [k, t] of Object.entries(L.tabs)) { const S = parse(k, t); if (S && S.ph !== 'inv' && !S.gone && !S.p.includes(N && N.sid)) { wk = k; break; } }
  const wb = btn('bcWatchB', '👀 Guarda le carte', () => wk && watch(wk)), sw = !!wk && !!salon;
  if (wb.hidden === sw) wb.hidden = !sw;
  // fumetti "🃏 Briscola" sopra chi gioca (senza coprire la chat)
  const now = Date.now();
  if (now - L.bubT > 600 && cq.g && cq.g.hall) {
    L.bubT = now; const pl = playing();
    const put = (o, set) => { const b = o(); if (!b || b.u < now || b.bc) set({ t: '🃏 Briscola', u: now + 1200, bc: 1 }); };
    for (const c of cq.g.chars) if (c.remote && pl.has(c.sid)) put(() => c.bub, v => { c.bub = v; });
    if (N && pl.has(N.sid)) put(() => cq.myBub, v => { cq.myBub = v; });
  }
};
// pulsanti via quando non si e' piu' nella hall (BC.hud non viene piu' chiamato)
setInterval(() => {
  if (performance.now() - L.hudT > 400) for (const id of ['bcHallB', 'bcWatchB']) { const b = document.getElementById(id); if (b && !b.hidden) b.hidden = true; }
  // il tavolo della hall si chiude se comincia un minigioco o si esce dal party / dall'hotel
  if (T && T.hall && (!cq.on || !cq.g || !cq.g.hall || !cq.net || (T.key && cq.net && T.host && T.key !== cq.net.sid))) leave();
  else if (T && !T.hall && T.root && !cq.on) close();
  // l'altro giocatore non e' piu' nel party
  if (T && T.host && T.key && cq.net && T.S.ph === 'play' && T.S.ai < 0) { const o = T.S.p[1]; if (!cq.net.pl[o]) { if (!T.goneT) T.goneT = Date.now(); else if (Date.now() - T.goneT > 15000) hostAct(1, { k: 'bye' }); } else T.goneT = 0; }
  if (T && T.root) micUI();
}, 250);
// ventaglio di 3 carte coperte in mano a chi gioca (sopra la hall, come i fumetti)
BC.over = (g, list, TW) => {
  const pl = playing(); if (!pl.size) return;
  const N = cq.net;
  for (const o of list) {
    if (!o.on || !o.sid || !pl.has(o.sid)) continue;
    const X = o.sx + (o.f || 1) * TW * 0.2, Y = o.sy - TW * (0.95 + (o.sitK || 0)), w = TW * 0.16, h = TW * 0.25;
    for (let i = -1; i <= 1; i++) {
      g.save(); g.translate(X, Y); g.rotate(i * 0.32); g.translate(-w / 2, -h);
      g.fillStyle = '#fdf8ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#a51d18'; g.fillRect(w * 0.14, h * 0.1, w * 0.72, h * 0.8);
      g.strokeStyle = 'rgba(40,20,10,.6)'; g.lineWidth = 1; g.strokeRect(0, 0, w, h);
      g.restore();
    }
  }
};
// non sono "pronto" per un minigioco mentre gioco a carte
BC.busy = () => !!(T && T.hall && (T.root || T.S.ph === 'inv'));
BC.E = BCE;
window.BC = BC;   // per ultimo: se qualcosa sopra si rompe, bcLoad se ne accorge
})();
