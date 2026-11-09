// CACTUS al tavolino del te' (sessione "Minigioco nuovo da tavola", decisioni in CLAUDE.md "CACTUS: DECISIONI").
// Motore CTE fra i marcatori (in node: require('giochi/cactus.js') = motore). Schermo window.CT: da solo contro i computer.
// Serve prima giochi/lib/carte.js (CARTE.fr con c2 e la matta) e giochi/poker.js (PKART: tavolo, classi .pk* dello schermo).
// ==CT ENGINE==
const CTE = (() => {
  // carte: seme h cuori, d quadri, c fiori, s picche + numero 1..13 (1 asso, 11 J, 12 Q, 13 K); matte 'x0' (rossa) e 'y0' (nera)
  const SU = 'hdcs';
  const rank = c => +c.slice(1);
  const red = c => c[0] === 'h' || c[0] === 'd' || c[0] === 'x';
  const val = c => { const r = rank(c); return r === 0 ? -5 : r === 13 ? (red(c) ? 1 : 25) : Math.min(r, 10); };
  const same = (a, b) => rank(a) === rank(b);
  function deck() { const d = []; for (const s of SU) for (let r = 1; r <= 13; r++) d.push(s + r); d.push('x0', 'y0'); return d; }
  function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const key = (j, k) => j + ':' + k;
  // livelli dei computer: quanto dimenticano a ogni loro turno, quanto spesso ricordano SBAGLIATO, quanto "tirano a indovinare"
  const LV = {
    1: { fg: 0.2, bad: 0.55, noise: 3, gam: 0.06, stop: 9 },    // Principiante
    2: { fg: 0.08, bad: 0.45, noise: 1.2, gam: 0.02, stop: 6.5 }, // Medio
    3: { fg: 0.02, bad: 0.3, noise: 0.3, gam: 0, stop: 5 },       // Esperto
  };

  const push = (G, e) => G.ev.push(e);
  // o = { players: [{ n, bot, ch }], lv (1-3), first, rnd }
  function newGame(o) {
    const rnd = o.rnd || Math.random;
    const G = {
      P: o.players.map(p => ({ n: p.n, bot: !!p.bot, ch: p.ch || null, slots: [], up: [false, false, false, false], mem: {} })),
      deck: shuffle(deck(), rnd), pile: [], held: null, turn: -1, ph: 'peek', tn: 0, stopBy: -1, over: false, ev: [], lv: o.lv || 2, rnd, res: null,
    };
    for (let k = 0; k < 4; k++) for (const p of G.P) p.slots.push(G.deck.pop());
    push(G, { t: 'deal' });
    // all'inizio ognuno guarda le 2 carte piu' vicine a se' (la fila sotto: posti 2 e 3)
    G.P.forEach((p, i) => { for (const k of [2, 3]) p.mem[key(i, k)] = p.slots[k]; });
    G.first = o.first == null ? Math.floor(rnd() * G.P.length) : o.first;
    return G;
  }
  function begin(G) { if (G.ph !== 'peek') return; G.ph = 'draw'; G.turn = G.first; push(G, { t: 'turn', p: G.turn }); }
  const canStop = G => G.ph === 'draw' && G.stopBy < 0 && G.tn >= G.P.length;
  // ---- la memoria: tutti vedono dove si spostano le carte; cosa sono lo sa solo chi le ha viste ----
  function forgetAt(G, k) { for (const p of G.P) delete p.mem[k]; }
  function seeAll(G, j, k) { const c = G.P[j].slots[k]; for (const p of G.P) p.mem[key(j, k)] = c; }
  function moveMem(G, a, b) { for (const p of G.P) { const x = p.mem[a], y = p.mem[b]; delete p.mem[a]; delete p.mem[b]; if (y !== undefined) p.mem[a] = y; if (x !== undefined) p.mem[b] = x; } }
  function draw(G) {
    if (!G.deck.length) {   // mazzo finito: si rimescolano gli scarti
      G.deck = shuffle(G.pile.splice(0), G.rnd); push(G, { t: 'reshuffle' });
      if (!G.deck.length) return null;
    }
    return G.deck.pop();
  }
  const has = (G, j, k) => G.P[j] && k >= 0 && k < 4 && G.P[j].slots[k] != null;
  // a = { k: 'draw' | 'stop' | 'swap' s | 'disc' | 'pair' s | 'J' a [j,k] b [j,k] | 'Q' at [j,k] | 'skip' }
  function act(G, i, a) {
    if (G.over || i !== G.turn) return false;
    const p = G.P[i];
    if (G.ph === 'draw') {
      if (a.k === 'stop') { if (!canStop(G)) return false; G.stopBy = i; push(G, { t: 'stop', p: i }); endTurn(G); return true; }
      if (a.k !== 'draw') return false;
      const c = draw(G); if (c == null) { finish(G); return true; }
      G.held = c; G.ph = 'hold'; push(G, { t: 'draw', p: i, c }); return true;
    }
    if (G.ph === 'hold') {
      const d = G.held;
      if (a.k === 'swap') {
        if (!has(G, i, a.s)) return false;
        const old = p.slots[a.s], wasUp = p.up[a.s]; p.slots[a.s] = d; p.up[a.s] = false; G.held = null; G.pile.push(old);
        forgetAt(G, key(i, a.s)); p.mem[key(i, a.s)] = d;
        push(G, { t: 'swap', p: i, s: a.s, c: d, old, wasUp }); endTurn(G); return true;
      }
      if (a.k === 'pair') {
        if (!has(G, i, a.s)) return false;
        const c = p.slots[a.s], ok = same(c, d), wasUp = p.up[a.s]; G.held = null;
        if (ok) { p.slots[a.s] = null; p.up[a.s] = false; G.pile.push(c, d); forgetAt(G, key(i, a.s)); }
        else { p.up[a.s] = true; G.pile.push(d); seeAll(G, i, a.s); }
        push(G, { t: 'pair', p: i, s: a.s, c, d, ok, wasUp }); endTurn(G); return true;
      }
      if (a.k === 'disc') {
        G.held = null; G.pile.push(d); const r = rank(d);
        const pw = r === 11 && p.slots.some(x => x != null) && G.P.some((q, j) => j !== i && q.slots.some(x => x != null)) ? 'J' : r === 12 ? 'Q' : '';
        push(G, { t: 'disc', p: i, c: d, pw });
        if (pw) { G.ph = pw; return true; }
        endTurn(G); return true;
      }
      return false;
    }
    if (G.ph === 'J' || G.ph === 'Q') {
      if (a.k === 'skip') { push(G, { t: 'skip', p: i }); endTurn(G); return true; }
      if (G.ph === 'J' && a.k === 'J') {
        const [j1, k1] = a.a, [j2, k2] = a.b;
        if (j1 !== i || j2 === i || !has(G, j1, k1) || !has(G, j2, k2)) return false;
        const A = G.P[j1], B = G.P[j2];
        [A.slots[k1], B.slots[k2]] = [B.slots[k2], A.slots[k1]]; [A.up[k1], B.up[k2]] = [B.up[k2], A.up[k1]];
        moveMem(G, key(j1, k1), key(j2, k2));
        push(G, { t: 'jswap', p: i, a: [j1, k1], b: [j2, k2] }); endTurn(G); return true;
      }
      if (G.ph === 'Q' && a.k === 'Q') {
        const [j, k] = a.at; if (!has(G, j, k)) return false;
        const c = G.P[j].slots[k]; p.mem[key(j, k)] = c;
        push(G, { t: 'qpeek', p: i, at: [j, k], c }); endTurn(G); return true;
      }
    }
    return false;
  }
  function endTurn(G) {
    G.held = null; G.tn++;
    const nx = (G.turn + 1) % G.P.length;
    if ((G.stopBy >= 0 && nx === G.stopBy) || G.tn > 60 * G.P.length) { finish(G); return; }
    G.ph = 'draw'; G.turn = nx; push(G, { t: 'turn', p: nx });
  }
  const score = p => p.slots.reduce((s, c) => s + (c == null ? 0 : val(c)), 0);
  function finish(G) {
    G.ph = 'over'; G.over = true; G.turn = -1;
    const res = G.P.map((p, i) => ({ p: i, sc: score(p), n: p.slots.filter(c => c != null).length }));
    const best = Math.min(...res.map(r => r.sc));
    res.forEach(r => { r.win = r.sc === best; });
    G.res = res; push(G, { t: 'end', res, stop: G.stopBy });
  }
  // classifica: punteggio piu' basso prima; a pari punti chi ha detto stop davanti
  const ranking = G => G.res.slice().sort((a, b) => a.sc - b.sc || (b.p === G.stopBy) - (a.p === G.stopBy) || a.p - b.p);

  // ---- il computer: ragiona solo su quello che ricorda (e la memoria e' "umana": dimentica e a volte ricorda male) ----
  function decay(G, i) {
    const p = G.P[i], L = LV[G.lv], all = deck();
    for (const k of Object.keys(p.mem)) {
      const [j, s] = k.split(':').map(Number);
      if (G.P[j].up[s] || G.rnd() >= L.fg) continue;
      if (G.rnd() < L.bad) { const c = p.mem[k], alt = all.filter(x => !same(x, c)); p.mem[k] = alt[Math.floor(G.rnd() * alt.length)]; }
      else delete p.mem[k];
    }
  }
  // quello che il computer crede di una carta (la verita' se e' scoperta)
  const belief = (G, i, j, k) => G.P[j].up[k] ? G.P[j].slots[k] : G.P[i].mem[key(j, k)];
  function pool(G, i) {
    const seen = new Set(G.pile); if (G.held) seen.add(G.held);
    G.P.forEach((q, j) => q.slots.forEach((c, k) => { if (c == null) return; const b = belief(G, i, j, k); if (b) seen.add(b); }));
    return deck().filter(c => !seen.has(c));
  }
  const avg = cs => cs.length ? cs.reduce((s, c) => s + val(c), 0) / cs.length : 6.3;
  // stima dei punti di un giocatore (per chi guarda: i)
  function est(G, i, j, EV) {
    let s = 0, unk = 0;
    G.P[j].slots.forEach((c, k) => { if (c == null) return; const b = belief(G, i, j, k); if (b) s += val(b); else { s += EV; unk++; } });
    return { s, unk };
  }
  // al suo turno: Stop o pesca
  function botStart(G, i) {
    decay(G, i);
    if (!canStop(G)) return { k: 'draw' };
    const L = LV[G.lv], EV = avg(pool(G, i)), me = est(G, i, i, EV);
    let thr = L.stop + (G.rnd() - 0.5) * L.noise;
    if (me.unk >= 2) thr -= 4;
    if (G.tn > 10 * G.P.length) thr += 5;   // la partita si allunga: si chiude prima
    const others = G.P.map((q, j) => j === i ? Infinity : est(G, i, j, EV).s);
    if (me.s <= thr && me.s < Math.min(...others) + 2) return { k: 'stop' };
    return { k: 'draw' };
  }
  // con la carta pescata: coppia, scambio o scarto (sceglie la mossa che abbassa di piu' i suoi punti)
  function botHold(G, i) {
    const p = G.P[i], d = G.held, v = val(d), L = LV[G.lv], P0 = pool(G, i), EV = avg(P0);
    const noise = () => (G.rnd() - 0.5) * L.noise;
    let best = { a: { k: 'disc' }, s: discGain(G, i, d, EV) + noise() };
    p.slots.forEach((c, k) => {
      if (c == null) return;
      const b = belief(G, i, i, k), ev = b ? val(b) : EV;
      // coppia sicura (o che crede sicura): toglie la sua carta
      if (b && same(b, d)) { const s = -ev - 0.5 + noise(); if (s < best.s) best = { a: { k: 'pair', s: k }, s }; }
      // tirare a indovinare su una carta che non ricorda (raro, di piu' i principianti)
      if (!b && G.rnd() < L.gam) { const s = -EV - 1 + noise(); if (s < best.s) best = { a: { k: 'pair', s: k }, s }; }
      // scambio: la pescata prende il posto della carta
      const s = v - ev - (b ? 0 : 0.6) + noise();
      if (s < best.s) best = { a: { k: 'swap', s: k }, s };
    });
    return best.a;
  }
  function discGain(G, i, d, EV) {
    const r = rank(d);
    if (r === 11) { const m = bestJ(G, i, EV); return m ? Math.min(0, m.g) : 0; }
    if (r === 12) return G.P[i].slots.some((c, k) => c != null && !belief(G, i, i, k)) ? -1.6 : -0.4;
    return 0;
  }
  // J: la sua carta peggiore contro la carta piu' bassa (o sconosciuta) degli altri
  function bestJ(G, i, EV) {
    let worst = null;
    G.P[i].slots.forEach((c, k) => { if (c == null) return; const b = belief(G, i, i, k), e = b ? val(b) : EV; if (!worst || e > worst.e) worst = { k, e }; });
    if (!worst) return null;
    let tgt = null;
    G.P.forEach((q, j) => { if (j === i) return; q.slots.forEach((c, k) => { if (c == null) return; const b = belief(G, i, j, k), e = b ? val(b) : EV; if (!tgt || e < tgt.e) tgt = { j, k, e }; }); });
    if (!tgt) return null;
    return { a: [i, worst.k], b: [tgt.j, tgt.k], g: tgt.e - worst.e };
  }
  function botPower(G, i) {
    const EV = avg(pool(G, i));
    if (G.ph === 'J') { const m = bestJ(G, i, EV); return m && m.g < -1.5 ? { k: 'J', a: m.a, b: m.b } : { k: 'skip' }; }
    const mine = G.P[i].slots.map((c, k) => c != null && !belief(G, i, i, k) ? k : -1).filter(k => k >= 0);
    if (mine.length) return { k: 'Q', at: [i, mine[Math.floor(G.rnd() * mine.length)]] };
    // guarda una carta sconosciuta di chi sembra messo meglio (per il J che verra')
    let tg = null;
    G.P.forEach((q, j) => { if (j === i) return; const e = est(G, i, j, EV); q.slots.forEach((c, k) => { if (c != null && !belief(G, i, j, k) && (!tg || e.s < tg.s)) tg = { j, k, s: e.s }; }); });
    return tg ? { k: 'Q', at: [tg.j, tg.k] } : { k: 'skip' };
  }
  function botMove(G, i) { return G.ph === 'draw' ? botStart(G, i) : G.ph === 'hold' ? botHold(G, i) : botPower(G, i); }
  return { SU, LV, rank, red, val, same, deck, shuffle, newGame, begin, act, canStop, score, ranking, botMove, key };
})();
// ==END CT ENGINE==
if (typeof module !== 'undefined' && module.exports) module.exports = CTE;

// ======== SCHERMO: CT.start({ name, look, onExit }) ========
if (typeof window !== 'undefined') (() => {
  const E = CTE, FR = () => CARTE.fr, CR = () => CARTE.fr.H / CARTE.fr.W;
  // i computer: gli ospiti del poker, con frasi da Cactus
  const CHARS = [
    { n: 'Il Conte', col: '#3a3f49', hat: 'cilindro', say: { ok: ['Come previsto.', 'Memoria di ferro.'], ko: ['Ohibo\'.', 'Un piccolo errore di calcolo.'], st: ['Stop, con eleganza.'], j: ['Permette? Scambio.'], w: ['Il Conte ringrazia.'] } },
    { n: 'Nonna Pina', col: '#8a4fd0', hat: 'basco', say: { ok: ['Brava nonna!', 'Me lo ricordavo!'], ko: ['Mannaggia, la memoria.', 'Ai miei tempi ricordavo tutto.'], st: ['Basta cosi\', caro. Stop.'], j: ['Questa la prendo io, caro.'], w: ['Brava nonna!'] } },
    { n: 'Rocco', col: '#3b6fe0', hat: 'cappellino', say: { ok: ['Coppia!', 'Facile.'], ko: ['Noo!', 'Ero sicuro!'], st: ['Stop! Tremate.'], j: ['Scambio, e zitti.'], w: ['Te l\'avevo detto.'] } },
    { n: 'Lola', col: '#f07ab8', hat: 'borsalino', say: { ok: ['Grazie, tesoro.'], ko: ['Uffa.', 'Non era lei.'], st: ['Stop, tesoro.'], j: ['Questa mi piace di piu\'.'], w: ['Grazie, tesoro.'] } },
    { n: 'Il Professore', col: '#2fa35a', hat: 'nessuno', say: { ok: ['Memoria eidetica.'], ko: ['Un evento improbabile.'], st: ['Statisticamente, stop.'], j: ['Uno scambio ragionato.'], w: ['Matematica pura.'] } },
    { n: 'Zio Tano', col: '#8a5a32', hat: 'borsalino', say: { ok: ['Eccola.'], ko: ['Bah.'], st: ['Stop. E zitti.'], j: ['Dammi qua.'], w: ['E chi mi ferma?'] } },
    { n: 'Gigi', col: '#f08a24', hat: 'cuffie', say: { ok: ['Evvai!'], ko: ['Che botta!', 'Era quella, giuro!'], st: ['Stop stop stop!'], j: ['Scambio volante!'], w: ['Evvai!'] } },
  ];
  const SLOTS = { 1: ['T'], 2: ['UL', 'UR'], 3: ['UL', 'T', 'UR'], 4: ['LL', 'UL', 'UR', 'LR'], 5: ['LL', 'UL', 'T', 'UR', 'LR'] };
  const OPT = {
    op: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']],
    lv: [['1', 'Principiante'], ['2', 'Medio'], ['3', 'Esperto']],
  };
  const DEF = { op: '3', lv: '2' };
  let LS = null;
  const st = () => (typeof store !== 'undefined' && store.settings) ? store.settings : (LS || (LS = (() => { try { return JSON.parse(localStorage.getItem('ctS') || '{}'); } catch { return {}; } })()));
  const save = () => { if (typeof store !== 'undefined' && store.settings && typeof saveStore === 'function') saveStore(); else try { localStorage.setItem('ctS', JSON.stringify(st())); } catch { } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const FAST = () => !!window.__CTFAST;
  const B = (...a) => { if (typeof beep === 'function') beep(...a); };
  const sfx = {
    card: () => { if (typeof thud === 'function') thud(0.22, 2900); },
    flip: () => { if (typeof thud === 'function') thud(0.3, 2100); },
    turn: () => B(880, 0.07, 0.02, 0, 'triangle'),
    ok: () => [523, 659, 784, 1047].forEach((f, i) => B(f, i === 3 ? 0.35 : 0.09, 0.03, i * 0.07, 'triangle')),
    ko: () => [330, 311, 294, 220].forEach((f, i) => B(f, i === 3 ? 0.5 : 0.18, 0.03, i * 0.18, 'sawtooth')),
    stop: () => [392, 392, 523].forEach((f, i) => B(f, i === 2 ? 0.4 : 0.1, 0.035, i * 0.14, 'square')),
    swish: () => B(1400, 0.06, 0.012, 0, 'sine'),
    win: () => [523, 659, 784, 1047].forEach((f, i) => B(f, i === 3 ? 0.4 : 0.12, 0.03, i * 0.11, 'triangle')),
    lose: () => [392, 370, 349, 262].forEach((f, i) => B(f, i === 3 ? 0.45 : 0.16, 0.025, i * 0.16, 'triangle')),
  };

  const css = document.createElement('style');
  css.textContent = `
#ctT{position:fixed;inset:0;z-index:120;overflow:hidden;background:#120b07;color:#fff;font-family:system-ui,"Segoe UI",Roboto,sans-serif;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#ctT *{box-sizing:border-box}
#ctS{position:absolute;left:0;top:0;transform-origin:0 0}
#ctS>canvas{position:absolute;left:0;top:0}
.ctAb{position:absolute}
#ctTop{left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));display:flex;align-items:center;gap:8px;z-index:60}
#ctTop button{background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:7px 13px;font:600 15px system-ui,sans-serif}
#ctTop .info{flex:1;text-align:center;font:600 13px/1.25 system-ui,sans-serif;opacity:.92}
#ctTop .info b{display:block;font:800 15px system-ui,sans-serif;color:#ffe27a}
#ctMe{z-index:26;width:0;height:0}
#ctMe .pkAv{position:absolute;left:-23px;top:-23px;width:46px;height:46px}
#ctMe .t{position:absolute;left:-40px;width:80px;top:27px;text-align:center;font:700 12.5px/1.2 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ctMe.turn .pkAv{box-shadow:0 0 0 3px #ffe27a,0 0 18px 4px rgba(255,214,90,.6)}
#ctMe .pkTag{left:-46px;top:-50px}
#ctMsg{left:50%;z-index:40;transform:translate(-50%,-50%);text-align:center;background:rgba(14,8,4,.86);border:1px solid rgba(255,226,122,.5);border-radius:14px;padding:8px 16px;font:800 16px/1.3 system-ui,sans-serif;white-space:nowrap;pointer-events:none;transition:opacity .3s}
#ctMsg small{display:block;font:600 13px system-ui,sans-serif;color:#ffe27a}
#ctStamp{left:50%;z-index:70;transform:translate(-50%,-50%);text-align:center;pointer-events:none;white-space:nowrap}
#ctStamp div{font:900 46px/1 system-ui,sans-serif;letter-spacing:1px;-webkit-text-stroke:2px #2b1208;paint-order:stroke fill;text-shadow:0 5px 0 #2b1208,0 10px 26px rgba(0,0,0,.7);opacity:0}
#ctStamp small{display:block;font:800 16px system-ui,sans-serif;margin-top:8px;color:#fff;text-shadow:0 2px 6px #000;opacity:0}
#ctStamp.go div{animation:ctPop 1.5s cubic-bezier(.2,.9,.3,1.25) forwards}
#ctStamp.go small{animation:ctFade 1.5s forwards}
#ctStamp.b div{color:#ff5a4a}#ctStamp.g div{color:#7dff9a}#ctStamp.h div{color:#ffe27a}
@keyframes ctPop{0%{opacity:0;transform:scale(2.6) rotate(-14deg)}14%{opacity:1;transform:scale(.92) rotate(-6deg)}22%{transform:scale(1.06) rotate(-7deg)}30%,80%{opacity:1;transform:scale(1) rotate(-7deg)}100%{opacity:0;transform:scale(1.08) rotate(-7deg)}}
@keyframes ctFade{0%,12%{opacity:0}24%,80%{opacity:1}100%{opacity:0}}
#ctT.pkFast #ctStamp div,#ctT.pkFast #ctStamp small{animation-duration:.5s}
#ctDeck{z-index:11;transform:translate(-50%,-50%)}
#ctDeck img{display:block;border-radius:7%/5%;box-shadow:1px 1px 0 #d8d2c2,2px 2px 0 #b9b2a0,3px 3px 0 #d8d2c2,4px 4px 0 #b9b2a0,5px 6px 10px rgba(0,0,0,.5)}
#ctDeck.tap{cursor:pointer}#ctDeck.tap img{animation:ctGlow 1s ease-in-out infinite alternate}
#ctPileL{z-index:5;transform:translate(-50%,-50%);border:2px dashed rgba(255,255,255,.18);border-radius:8px}
#ctPileL.tap{border-color:#ffe27a;cursor:pointer}
#ctT .pkC.tap{pointer-events:auto;cursor:pointer}
#ctT .pkC.tap .in{border-radius:7%/5%;animation:ctGlow 1s ease-in-out infinite alternate}
#ctT .pkC.sel .in{animation:none;box-shadow:0 0 0 4px #7dff9a,0 0 18px 5px rgba(125,255,154,.7)}
@keyframes ctGlow{from{box-shadow:0 0 0 2px #ffe27a,0 0 6px 1px rgba(255,214,90,.35)}to{box-shadow:0 0 0 3px #ffe27a,0 0 18px 5px rgba(255,214,90,.75)}}
#ctT .pkC.mal img.f{box-shadow:0 0 0 3px #ff5a4a,0 0 12px 2px rgba(255,90,74,.6)}
#ctT .pkC.top{z-index:30!important}
#ctAct{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:40}
#ctAct .hint{text-align:center;font:700 14px/1.3 system-ui,sans-serif;margin-bottom:8px;color:#ffe27a;text-shadow:0 1px 4px #000}
#ctAct .main{display:flex;gap:8px}
#ctAct .main button{flex:1;border:0;border-radius:14px;padding:14px 0 13px;font:800 17px system-ui,sans-serif;color:#fff;background:linear-gradient(#5a4030,#3e2a1e);box-shadow:0 3px 0 #22160e}
#ctAct .main button.k{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231}
#ctAct .main button.r{background:linear-gradient(#f2c230,#d39b17);color:#3a2408;box-shadow:0 3px 0 #8f6609}
#ctAct .main button.p{background:linear-gradient(#e0533f,#b8352a);box-shadow:0 3px 0 #7a2018}
#ctAct[hidden]{display:none!important}
#ctWait{left:10px;right:10px;bottom:calc(30px + env(safe-area-inset-bottom));z-index:39;text-align:center;font:700 15px system-ui,sans-serif;opacity:.85}
#ctT.pkFast .pkC,#ctT.pkFast .pkC .in{transition-duration:.08s!important}
.ctRu p{text-align:left!important;margin:6px 0!important}
`;
  document.head.appendChild(css);

  let U = null;
  const wait = ms => new Promise(r => setTimeout(r, FAST() || (U && U.skip) ? 0 : ms));
  const dprOf = () => Math.min(3, window.devicePixelRatio || 1);
  function portrait(look) {
    const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
    const q = g.createLinearGradient(0, 0, 0, 120); q.addColorStop(0, '#3a4a5c'); q.addColorStop(1, '#1d2633'); g.fillStyle = q; g.fillRect(0, 0, 120, 120);
    if (typeof cqPlayer === 'function' && look && !look.skin) { try { cqPlayer(g, 60, 116, 66, look, 0, 1, true); return c; } catch (e) { } }
    const col = (look && look.col) || '#c8102e';
    g.fillStyle = col; g.beginPath(); g.ellipse(60, 124, 44, 34, 0, 0, 7); g.fill();
    g.fillStyle = '#f3c9a0'; g.beginPath(); g.arc(60, 62, 24, 0, 7); g.fill();
    g.fillStyle = '#2b1b12'; g.beginPath(); g.arc(51, 62, 2.8, 0, 7); g.arc(69, 62, 2.8, 0, 7); g.fill();
    g.strokeStyle = '#9a3a2a'; g.lineWidth = 2.2; g.beginPath(); g.arc(60, 70, 6.5, 0.2, Math.PI - 0.2); g.stroke();
    if (look && look.hat && look.hat !== 'nessuno') { g.fillStyle = '#2a2d33'; g.beginPath(); g.ellipse(60, 42, 35, 7.5, 0, 0, 7); g.fill(); g.fillRect(40, 20, 40, 23); }
    return c;
  }
  function overlay(html) { const d = document.createElement('div'); d.className = 'pkOv'; d.innerHTML = html; U.root.appendChild(d); return d; }

  // ---- scelte prima della partita (tendine, niente emoji) ----
  function tendina(name, title, items, def) {
    const cur = items.find(x => x[0] === def) || items[0];
    return `<details class="pkD" data-n="${name}"><summary><span>${title}</span><b>${cur[1]}</b></summary><div class="opts">`
      + items.map(([v, t]) => `<button type="button" data-v="${v}"${v === cur[0] ? ' class="on"' : ''}>${t}</button>`).join('') + `</div></details>`;
  }
  function setup() {
    const sv = Object.assign({}, DEF, st().ctOpt || {}), rec = st().ctSt;
    const ov = overlay(`<div class="pkBox"><h2>Cactus</h2><p>Quattro carte coperte e tanta memoria: fai coppie, scambia, e chiudi con il punteggio piu' basso.${rec ? '<br>Partite vinte: ' + rec[0] + ' su ' + rec[1] + '.' : ''}</p>`
      + tendina('op', 'Computer al tavolo', OPT.op, sv.op)
      + tendina('lv', 'Livello', OPT.lv, sv.lv)
      + `<p class="pkNote">Il re rosso vale 1, il re nero 25, la matta -5. Il J scambia, la Q fa guardare.</p>`
      + `<button type="button" class="big pr" data-k="go">Gioca</button><button type="button" class="big" data-k="ru">Come si gioca</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelectorAll('.pkD').forEach(d => {
      d.onclick = e => {
        const b = e.target.closest('.opts button'); if (!b) return;
        d.querySelectorAll('.opts button').forEach(x => x.classList.toggle('on', x === b));
        d.querySelector('summary b').innerHTML = b.innerHTML; d.open = false;
      };
      d.ontoggle = () => { if (d.open) ov.querySelectorAll('.pkD').forEach(o => { if (o !== d) o.open = false; }); };
    });
    ov.querySelector('[data-k=go]').onclick = () => {
      const o = {}; for (const k of Object.keys(DEF)) { const b = ov.querySelector(`.pkD[data-n=${k}] .opts .on`); o[k] = b ? b.dataset.v : DEF[k]; }
      st().ctOpt = o; save(); ov.remove(); begin(o);
    };
    ov.querySelector('[data-k=ru]').onclick = rules;
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }
  function rules() {
    const ov = overlay(`<div class="pkBox ctRu"><h2>Come si gioca</h2>
      <p>Hai 4 carte coperte. All'inizio guardi le 2 piu' vicine a te: ricordale bene, poi si girano.</p>
      <p>A ogni turno <b>peschi</b> dal mazzo e scegli: <b>Scambia</b> (la pescata prende il posto di una tua carta, che va negli scarti), <b>Scarta</b>, oppure <b>Coppia</b>: tocchi una tua carta che pensi sia uguale. Se hai ragione scarti tutte e due; se sbagli la tua carta resta scoperta e la vedono tutti.</p>
      <p>Il <b>J</b> scartato ti fa scambiare una tua carta con quella di un altro, la <b>Q</b> ti fa guardare una carta, tua o di un altro.</p>
      <p>Valori: asso 1, dal 2 al 10 il numero, J e Q 10, <b>re rosso 1</b>, <b>re nero 25</b>, <b>matta -5</b>.</p>
      <p>Quando pensi di avere pochi punti, al tuo turno dici <b>Stop</b>: gli altri fanno un ultimo turno, poi si girano le carte. Vince chi ha meno punti.</p>
      <button type="button" class="big pr" data-k="x">Ho capito</button></div>`);
    ov.querySelector('[data-k=x]').onclick = () => ov.remove();
  }

  // ---- inizio partita ----
  function begin(o) {
    U.o = o;
    const n = +o.op, pool = CHARS.slice(1).sort(() => Math.random() - 0.5), bots = [CHARS[0], ...pool].slice(0, n).sort(() => Math.random() - 0.5);
    const players = [{ n: U.opt.name || 'Tu' }, ...bots.map(c => ({ n: c.n, bot: 1, ch: c }))];
    U.G = E.newGame({ players, lv: +o.lv, first: window.__CTFIRST != null ? window.__CTFIRST : undefined });
    U.evi = 0; U.grid = U.G.P.map(() => [null, null, null, null]); U.pile = []; U.held = null; U.peekO = null;
    build(); run();
  }
  function lay() {
    const G = U.G, n = G.P.length - 1, sl = SLOTS[n];
    const vw0 = U.root.clientWidth || innerWidth, vh0 = U.root.clientHeight || innerHeight, kw = Math.min(1, vw0 / 380), W0 = vw0 / kw;
    const mw = Math.min(68, W0 * 0.175), mh = mw * CR(), gh = mh * 2 + 10, ow = 27, oh = ow * CR();
    const Ty = 84, hasT = sl.includes('T'), hasU = sl.some(s => s[0] === 'U'), hasL = sl.some(s => s[0] === 'L');
    let topSy = Ty + 26, upSy = hasT ? topSy + (hasU ? 112 : 0) : topSy + 4, lowSy = upSy + 132;
    const need = (hasL ? lowSy : hasU ? upSy : topSy) + 66 + 130 + gh + 140;
    const k = Math.min(kw, vh0 / need), W = vw0 / k, H = vh0 / k, e = H - need;
    upSy += e * 0.08; lowSy += e * 0.16; topSy += e * 0.03;
    const last = hasL ? lowSy : hasU ? upSy : topSy;
    const myTop = H - 140 - gh, cy = (last + 66 + myTop) / 2 - 4;
    const pos = { T: [W / 2 - 36, topSy, 'T'], UL: [48, upSy, 'L'], UR: [W - 48, upSy, 'R'], LL: [48, lowSy, 'L'], LR: [W - 48, lowSy, 'R'] };
    const seats = [null, ...sl.map(s => pos[s])];
    return { k, W, H, mw, mh, gh, ow, oh, myTop, seats, cy, T: { x: 10, y: Ty, w: W - 20, h: myTop - 16 - Ty, rail: 20 } };
  }
  const deckXY = L => [L.W / 2 - 34, L.cy];
  const pileXY = L => [L.W / 2 + 34, L.cy];
  const seatXY = (L, i) => i === 0 ? [40, L.myTop + L.gh / 2 - 8] : [L.seats[i][0], L.seats[i][1]];
  // posto k (0,1 fila lontana; 2,3 fila vicina) del giocatore j: [x, y, larghezza]
  function slotXY(L, j, k) {
    if (j === 0) return [L.W / 2 + (k % 2 ? 1 : -1) * (L.mw / 2 + 5), L.myTop + (k < 2 ? 0 : L.mh + 10) + L.mh / 2, L.mw];
    const [sx, sy, side] = L.seats[j], gw = L.ow * 2 + 4, x0 = side === 'R' ? sx - 38 - gw : sx + 38;
    return [x0 + L.ow / 2 + (k % 2) * (L.ow + 4), sy - 2 + (k < 2 ? -1 : 1) * (L.oh / 2 + 2), L.ow];
  }
  // dove sta la carta appena pescata: la mia accanto alle mie carte, quella degli altri a meta' strada verso il centro
  function heldXY(L, i) {
    if (i === 0) return [L.W / 2 + L.mw + 10 + L.mw * 0.62 + 6, L.myTop + L.gh / 2, L.mw * 1.1];
    const [a, b] = slotXY(L, i, 0), [c, d] = slotXY(L, i, 3), [dx, dy] = deckXY(L);
    return [((a + c) / 2) * 0.45 + dx * 0.55, ((b + d) / 2) * 0.45 + dy * 0.55, 40];
  }

  function build() {
    const R = U.root, G = U.G;
    R.querySelectorAll('#ctS').forEach(e => e.remove());
    const S = document.createElement('div'); S.id = 'ctS'; R.prepend(S); U.S = S;
    S.innerHTML = `<canvas></canvas>
      <div class="ctAb" id="ctTop"><button type="button" data-k="x">Esci</button><div class="info"></div><button type="button" data-k="ru">Regole</button></div>
      <div class="ctAb" id="ctPileL"></div><div class="ctAb" id="ctDeck"><img alt=""></div><div class="ctAb" id="ctMsg" style="opacity:0"></div><div class="ctAb" id="ctStamp"><div></div><small></small></div>
      <div class="ctAb" id="ctMe"><div class="pkAv"></div><div class="t"></div><div class="pkTag"></div></div>
      <div class="ctAb" id="ctWait"></div>
      <div class="ctAb" id="ctAct" hidden><div class="hint"></div><div class="main"></div></div>`;
    S.querySelector('#ctTop [data-k=x]').onclick = askExit;
    S.querySelector('#ctTop [data-k=ru]').onclick = rules;
    S.querySelector('#ctDeck').onclick = () => U.tapDeck && U.tapDeck();
    S.querySelector('#ctPileL').onclick = () => U.tapPile && U.tapPile();
    U.seats = G.P.map((p, i) => {
      if (i === 0) { S.querySelector('#ctMe .pkAv').appendChild(portrait(U.opt.look || { col: '#c8102e', hat: 'borsalino', skin: 'omino' })); S.querySelector('#ctMe .t').textContent = p.n; return S.querySelector('#ctMe'); }
      const s = document.createElement('div'); s.className = 'pkSeat';
      s.innerHTML = `<div class="pkRing"></div><div class="pkAv"></div><div class="pkPlate"><div class="n">${esc(p.n)}</div><div class="c"></div></div><div class="pkTag"></div>`;
      s.querySelector('.pkAv').appendChild(portrait({ skin: 'omino', col: p.ch.col, hat: p.ch.hat })); S.appendChild(s); return s;
    });
    U.say = G.P.map(() => null);
    layout();
  }
  function layout() {
    const L = U.L = lay(), S = U.S, dpr = dprOf();
    Object.assign(S.style, { width: L.W + 'px', height: L.H + 'px', transform: L.k < 1 ? `scale(${L.k})` : '' });
    PKART.table(S.querySelector('canvas'), L.W, L.H, L.T, dpr * L.k);
    U.G.P.forEach((p, i) => { const [x, y] = seatXY(L, i); Object.assign(U.seats[i].style, { left: x + 'px', top: y + 'px' }); });
    const [dx, dy] = deckXY(L), dk = S.querySelector('#ctDeck'), dw = 46;
    Object.assign(dk.style, { left: dx + 'px', top: dy + 'px' }); const im = dk.querySelector('img'); im.style.width = dw + 'px'; im.src = FR().url('', 0, dw * dpr * L.k, { c2: true });
    const [px, py] = pileXY(L); Object.assign(S.querySelector('#ctPileL').style, { left: px + 'px', top: py + 'px', width: dw + 6 + 'px', height: dw * CR() + 6 + 'px' });
    Object.assign(S.querySelector('#ctMsg').style, { top: dy - 64 + 'px' });
    Object.assign(S.querySelector('#ctStamp').style, { top: dy + 'px' });
    U.grid.forEach((row, j) => row.forEach((o, k) => o && place(o, slotXY(L, j, k), true)));
    U.pile.forEach(o => place(o, [px, py, dw, o.rot], true));
    if (U.held) place(U.held, heldXY(L, U.heldBy), true);
    plates();
  }
  addEventListener('resize', () => { if (U && U.S && U.G) { clearTimeout(U.rz); U.rz = setTimeout(() => U && U.S && layout(), 120); } });

  // ---- carte: <div class="pkC"> con fronte e retro, mosse con le transizioni ----
  const frR = c => { const r = E.rank(c); return r === 0 ? 15 : r === 1 ? 14 : r; };
  function mkCard(c) {
    const el = document.createElement('div'); el.className = 'pkC down';
    el.innerHTML = `<div class="in"><img class="f" alt=""><img class="b" alt=""></div>`;
    const o = { el, c, open: false, w: 0, rot: 0 };
    el.onclick = () => U && U.tap && U.tap(o);
    U.S.appendChild(el);
    place(o, [...deckXY(U.L), 46, 0], true);
    return o;
  }
  function setT(o, x, y, w, r, lift) {
    if (o.w !== w) { o.w = w; o.el.style.width = w + 'px'; o.el.style.height = w * CR() + 'px'; o.el.querySelector('img.b').src = FR().url('', 0, w * dprOf() * U.L.k, { c2: true }); if (o.open) front(o); }
    o.el.style.transform = `translate(${x - w / 2}px,${y - w * CR() / 2 - (lift || 0)}px) rotate(${r || 0}deg)${lift ? ' scale(1.12)' : ''}`;
  }
  function front(o) { const im = o.el.querySelector('img.f'), k = o.c + '_' + o.w; if (im.dataset.k !== k) { im.src = FR().url(o.c[0], frR(o.c), o.w * dprOf() * U.L.k, { c2: true, j: o.w < 40 }); im.dataset.k = k; } }
  function place(o, [x, y, w, r], now, lift) {
    if (now) o.el.style.transition = 'none';
    setT(o, x, y, w, r, lift);
    if (now) { void o.el.offsetWidth; o.el.style.transition = ''; }
  }
  function open(o, slow) { o.open = true; front(o); o.el.classList.toggle('slow', !!slow); o.el.classList.remove('down'); }
  function shut(o) { o.open = false; o.el.classList.remove('slow'); o.el.classList.add('down'); }
  const raise = (o, ms = 700) => { o.el.classList.add('top'); clearTimeout(o.rt); o.rt = setTimeout(() => o.el.classList.remove('top'), FAST() ? 0 : ms); };
  function toPile(o) {
    const L = U.L, [px, py] = pileXY(L); o.rot = (Math.random() - 0.5) * 16;
    raise(o); place(o, [px, py, 46, o.rot]); if (!o.open) open(o);
    o.el.classList.remove('mal', 'sel', 'tap', 'win');
    U.pile.push(o); o.el.style.zIndex = 6 + Math.min(U.pile.length, 4);
    U.pile.forEach((x, n) => { x.el.style.zIndex = 6 + n; });
    while (U.pile.length > 3) U.pile.shift().el.remove();
  }
  function clearCards() { if (!U.root) return; U.root.querySelectorAll('.pkC').forEach(e => e.remove()); U.pile = []; U.held = null; }

  // ---- numeri, scritte, fumetti ----
  const pt = n => n + (Math.abs(n) === 1 ? ' punto' : ' punti');
  function plates(fin) {
    const G = U.G;
    G.P.forEach((p, i) => {
      if (i === 0) return;
      const n = p.slots.filter(c => c != null).length;
      U.seats[i].querySelector('.c').textContent = fin ? pt(fin[i]) : n + (n === 1 ? ' carta' : ' carte');
    });
    U.S.querySelector('#ctTop .info').innerHTML = `<b>Cactus</b>${G.over ? 'Fine partita' : G.stopBy >= 0 ? 'Ultimo giro: ' + (G.stopBy === 0 ? 'hai detto Stop' : esc(G.P[G.stopBy].n) + ' ha detto Stop') : 'Mazzo: ' + G.deck.length + ' carte'}`;
  }
  function tag(i, cls, txt) { const t = U.seats[i].querySelector('.pkTag'); t.className = 'pkTag ' + (cls || ''); t.innerHTML = txt ? `<span>${txt}</span>` : ''; }
  function msg(a, b, ms) {
    const m = U.S.querySelector('#ctMsg'); m.innerHTML = esc(a) + (b ? `<small>${esc(b)}</small>` : ''); m.style.opacity = 1;
    clearTimeout(U.mt); if (ms) U.mt = setTimeout(() => { if (U && U.S) m.style.opacity = 0; }, FAST() ? 5 : ms);
  }
  const hideMsg = () => { clearTimeout(U.mt); U.S.querySelector('#ctMsg').style.opacity = 0; };
  function stamp(kind, big, small) {
    const s = U.S.querySelector('#ctStamp'); s.className = 'ctAb ' + kind; s.querySelector('div').textContent = big; s.querySelector('small').textContent = small || '';
    void s.offsetWidth; s.classList.add('go');
  }
  function say(i, kind, p = 1) {
    const P = U.G.P[i]; if (!P.bot || Math.random() > p) return;
    const list = P.ch.say[kind] || []; if (!list.length) return;
    if (U.say[i]) U.say[i].remove();
    const L = U.L, [sx, sy, side] = L.seats[i], b = document.createElement('div'); b.className = 'pkSay'; b.textContent = '«' + list[Math.floor(Math.random() * list.length)] + '»';
    Object.assign(b.style, side === 'T' ? { left: sx + 104 + 'px', top: sy - 30 + 'px' } : side === 'R' ? { right: L.W - sx - 30 + 'px', top: sy - 100 + 'px' } : { left: sx - 30 + 'px', top: sy - 100 + 'px' });
    U.S.appendChild(b); U.say[i] = b;
    setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.remove(), 350); if (U && U.say[i] === b) U.say[i] = null; }, FAST() ? 10 : 2200);
  }
  const NAMEOF = i => i === 0 ? 'Tu' : U.G.P[i].n;

  // ---- gli eventi del motore, uno alla volta, con le animazioni ----
  async function flush() { const G = U.G; while (U && U.G === G && U.evi < G.ev.length) await show(G.ev[U.evi++]); }
  async function show(e) {
    const G = U.G, L = U.L;
    if (e.t === 'deal') {
      clearCards(); hideMsg(); plates();
      for (let k = 0; k < 4; k++) for (let j = 0; j < G.P.length; j++) {
        const o = mkCard(G.P[j].slots[k]); U.grid[j][k] = o; raise(o, 500);
        requestAnimationFrame(() => place(o, slotXY(L, j, k))); sfx.card(); await wait(70);
      }
      await wait(450);
    } else if (e.t === 'turn') {
      U.seats.forEach((s, i) => s.classList.toggle('turn', i === e.p));
      if (e.p !== 0) tag(e.p, G.stopBy === e.p ? 'w' : '', G.stopBy === e.p ? 'Stop' : '');
      plates();
    } else if (e.t === 'draw') {
      const o = mkCard(e.c); U.held = o; U.heldBy = e.p; raise(o, 900);
      requestAnimationFrame(() => place(o, heldXY(L, e.p))); sfx.card(); plates();
      if (e.p === 0) { await wait(220); open(o); sfx.flip(); await wait(300); } else await wait(480);
    } else if (e.t === 'swap') {
      const h = U.held, old = U.grid[e.p][e.s]; U.held = null; U.grid[e.p][e.s] = h;
      if (e.p === 0) { shut(h); await wait(260); }
      raise(h); place(h, slotXY(L, e.p, e.s)); toPile(old); sfx.swish();
      if (e.p !== 0) tag(e.p, 'c', 'Scambia');
      await wait(e.p === 0 ? 450 : 650);
    } else if (e.t === 'pair') {
      const h = U.held, o = U.grid[e.p][e.s]; U.held = null;
      const [x, y, w] = slotXY(L, e.p, e.s), wasOpen = o.open;
      raise(h, 2600); raise(o, 2600);
      place(h, [x + w * 0.55, y - w * 0.25, w, 8], false, 6); if (!h.open) open(h);
      place(o, [x, y, w, -4], false, 6);
      if (!wasOpen) { await wait(250); open(o, true); sfx.flip(); }
      await wait(wasOpen ? 500 : 1150);
      if (e.ok) {
        stamp('g', 'COPPIA!', NAMEOF(e.p)); sfx.ok(); say(e.p, 'ok', 0.5); await wait(800);
        U.grid[e.p][e.s] = null; toPile(o); await wait(140); toPile(h);
      } else {
        stamp('b', 'SBAGLIATO!', e.p === 0 ? 'La tua carta resta scoperta' : NAMEOF(e.p)); sfx.ko(); say(e.p, 'ko', 0.6); await wait(900);
        place(o, [x, y, w, 0]); o.el.classList.add('mal'); toPile(h);
      }
      plates(); await wait(650);
    } else if (e.t === 'disc') {
      const h = U.held; U.held = null; toPile(h); sfx.swish();
      if (e.p !== 0) tag(e.p, e.pw ? 'w' : 'f', e.pw === 'J' ? 'Scambia col J' : e.pw === 'Q' ? 'Guarda con la Q' : 'Scarta');
      await wait(e.pw ? 650 : 450);
    } else if (e.t === 'jswap') {
      const [j1, k1] = e.a, [j2, k2] = e.b, A = U.grid[j1][k1], Bc = U.grid[j2][k2];
      raise(A, 1500); raise(Bc, 1500);
      place(A, slotXY(L, j1, k1), false, 10); place(Bc, slotXY(L, j2, k2), false, 10); await wait(300);
      U.grid[j1][k1] = Bc; U.grid[j2][k2] = A;
      place(A, slotXY(L, j2, k2)); place(Bc, slotXY(L, j1, k1)); sfx.swish();
      if (e.p !== 0) { tag(e.p, 'w', 'Scambia'); say(e.p, 'j', 0.5); if (j2 === 0) msg(G.P[e.p].n + ' ti scambia una carta', '', 1600); }
      await wait(900);
    } else if (e.t === 'qpeek') {
      const [j, k] = e.at, o = U.grid[j][k];
      if (e.p === 0) { raise(o, 99999); place(o, slotXY(L, j, k), false, 10); await wait(200); open(o); sfx.flip(); U.peekO = o; }
      else { raise(o, 1300); place(o, slotXY(L, j, k), false, 9); await wait(1000); place(o, slotXY(L, j, k)); if (j === 0) msg(G.P[e.p].n + ' guarda una tua carta', '', 1500); await wait(300); }
    } else if (e.t === 'skip') {
      if (e.p !== 0) tag(e.p, 'f', 'Passa'); await wait(300);
    } else if (e.t === 'stop') {
      stamp('h', 'STOP!', NAMEOF(e.p)); sfx.stop(); tag(e.p, 'w', 'Stop'); say(e.p, 'st', 0.7);
      plates(); await wait(1200); msg('Ultimo giro', e.p === 0 ? 'Gli altri giocano un\'ultima volta' : 'Hai ancora un turno', 1800); await wait(600);
    } else if (e.t === 'reshuffle') {
      for (const o of U.pile) o.el.remove(); U.pile = []; msg('Si rimescolano gli scarti', '', 900); await wait(500);
    } else if (e.t === 'end') await showdown(e);
  }
  // fine: si girano le carte di tutti, uno alla volta, e si contano i punti
  async function showdown(e) {
    const G = U.G; U.seats.forEach(s => s.classList.remove('turn')); hideMsg();
    U.skip = false; U.root.classList.remove('pkFast');
    await wait(400);
    const fin = G.P.map(() => 0);
    for (let j = 0; j < G.P.length; j++) {
      for (let k = 0; k < 4; k++) { const o = U.grid[j][k]; if (o && !o.open) { open(o); sfx.flip(); await wait(140); } if (o) o.el.classList.remove('mal'); }
      fin[j] = e.res[j].sc; plates(fin);
      if (j === 0) tag(0, 'w', pt(fin[0])); else tag(j, e.res[j].win ? 'w' : 'f', pt(fin[j]));
      await wait(420);
    }
    const best = Math.min(...fin);
    e.res.forEach(r => { if (r.win) U.grid[r.p].forEach(o => o && o.el.classList.add('win')); });
    const winners = e.res.filter(r => r.win).map(r => NAMEOF(r.p));
    stamp('h', e.res[0].win ? 'HAI VINTO!' : 'VINCE ' + winners[0].toUpperCase() + '!', pt(best));
    if (e.res[0].win) sfx.win(); else { sfx.lose(); e.res.forEach(r => r.win && say(r.p, 'w', 0.8)); }
    await wait(2300);
  }

  // ---- il giro della partita ----
  async function run() {
    const G = U.G;
    U.busy = true;
    await flush(); if (!U || U.G !== G) return;
    // le 2 carte vicine: le guardi finche' non tocchi "Ricordate"
    const mine = [2, 3].map(k => U.grid[0][k]);
    mine.forEach(o => { raise(o, 99999); open(o); }); sfx.flip();
    await ask('peek'); if (!U || U.G !== G) return;
    mine.forEach(o => { shut(o); o.el.classList.remove('top'); }); sfx.flip(); await wait(450);
    E.begin(G); await flush();
    while (U && U.G === G && !G.over) {
      const i = G.turn;
      if (G.P[i].bot) {
        U.S.querySelector('#ctWait').textContent = 'Tocca a ' + G.P[i].n;
        await wait(G.ph === 'draw' ? 450 + Math.random() * 400 : 650 + Math.random() * 500); if (!U || U.G !== G) return;
        E.act(G, i, E.botMove(G, i));
      } else {
        U.S.querySelector('#ctWait').textContent = '';
        const a = await ask(G.ph); if (!U || U.G !== G) return;
        if (!E.act(G, 0, a)) continue;
      }
      await flush(); if (!U || U.G !== G) return;
      if (U.peekO) {   // la carta guardata con la Q resta girata finche' non tocchi "Fatto"
        await ask('look'); if (!U || U.G !== G) return;
        const o = U.peekO; U.peekO = null; shut(o); clearTimeout(o.rt); o.el.classList.remove('top');
        const p = U.grid.findIndex(r => r.includes(o)); if (p >= 0) place(o, slotXY(U.L, p, U.grid[p].indexOf(o)));
        await wait(350);
      }
    }
    if (!U || U.G !== G) return;
    U.S.querySelector('#ctWait').textContent = '';
    end();
  }
  // i miei comandi: pulsanti in basso + tocchi su carte, mazzo e scarti
  function ask(mode) {
    const G = U.G, a = U.S.querySelector('#ctAct'), hint = a.querySelector('.hint'), main = a.querySelector('.main');
    U.skip = false; U.root.classList.remove('pkFast'); U.busy = false;
    if (mode !== 'peek' && mode !== 'look') { U.seats[0].classList.add('turn'); if (mode === 'draw') sfx.turn(); }
    const mineAll = () => U.grid[0].map((o, k) => o ? k : -1).filter(k => k >= 0);
    return new Promise(res => {
      const clean = () => { U.tap = U.tapDeck = U.tapPile = null; U.root.querySelectorAll('.pkC.tap,.pkC.sel').forEach(e => e.classList.remove('tap', 'sel')); U.S.querySelector('#ctDeck').classList.remove('tap'); U.S.querySelector('#ctPileL').classList.remove('tap'); };
      const done = v => { clean(); a.hidden = true; U.busy = true; U.seats[0].classList.remove('turn'); res(v); };
      let btn = () => { };
      const btns = list => { main.innerHTML = list.map(([k, t, c]) => `<button type="button" data-k="${k}" class="${c || ''}">${t}</button>`).join(''); main.querySelectorAll('button').forEach(b => b.onclick = () => btn(b.dataset.k)); };
      const taps = (list, fn) => { clean(); list.forEach(([j, k]) => U.grid[j][k] && U.grid[j][k].el.classList.add('tap')); U.tap = o => { for (const [j, k] of list) if (U.grid[j][k] === o) return fn(j, k, o); }; };
      const step = m => {
        clean(); a.hidden = false;
        if (m === 'peek') { hint.textContent = 'Ricorda le tue 2 carte vicine: poi si girano'; btns([['ok', 'Ricordate', 'k']]); btn = () => done(null); }
        else if (m === 'look') { hint.textContent = 'Ecco la carta: ricordala'; btns([['ok', 'Fatto', 'k']]); btn = () => done(null); }
        else if (m === 'draw') {
          const can = E.canStop(G);
          hint.textContent = can ? 'Pesca una carta, o di\' Stop se hai pochi punti' : 'Tocca a te: pesca una carta';
          btns(can ? [['d', 'Pesca', 'k'], ['s', 'Stop', 'r']] : [['d', 'Pesca', 'k']]);
          btn = k => done({ k: k === 's' ? 'stop' : 'draw' });
          U.S.querySelector('#ctDeck').classList.add('tap'); U.tapDeck = () => done({ k: 'draw' });
        } else if (m === 'hold') {
          const has = mineAll().length;
          hint.textContent = has ? 'Cosa fai con questa carta?' : 'Non hai piu\' carte: scartala';
          btns(has ? [['sw', 'Scambia', 'k'], ['pa', 'Coppia', 'p'], ['di', 'Scarta']] : [['di', 'Scarta']]);
          btn = k => k === 'di' ? done({ k: 'disc' }) : step(k);
          U.S.querySelector('#ctPileL').classList.add('tap'); U.tapPile = () => done({ k: 'disc' });
        } else if (m === 'sw' || m === 'pa') {
          hint.textContent = m === 'sw' ? 'Tocca la tua carta da cambiare' : 'Tocca la tua carta uguale a questa';
          btns([['b', 'Indietro']]); btn = () => step('hold');
          taps(mineAll().map(k => [0, k]), (j, k) => done({ k: m === 'sw' ? 'swap' : 'pair', s: k }));
        } else if (m === 'J') {
          hint.textContent = 'J: tocca una tua carta da dare via';
          btns([['sk', 'Salta']]); btn = () => done({ k: 'skip' });
          taps(mineAll().map(k => [0, k]), (j, k, o) => {
            const others = []; G.P.forEach((p, jj) => { if (jj) U.grid[jj].forEach((x, kk) => x && others.push([jj, kk])); });
            taps(others, (j2, k2) => done({ k: 'J', a: [0, k], b: [j2, k2] }));
            o.el.classList.add('sel'); hint.textContent = 'J: ora tocca la carta di un altro da prendere';
            btns([['b', 'Indietro'], ['sk', 'Salta']]); btn = kk => kk === 'b' ? step('J') : done({ k: 'skip' });
          });
        } else if (m === 'Q') {
          hint.textContent = 'Q: tocca una carta da guardare, tua o di un altro';
          btns([['sk', 'Salta']]); btn = () => done({ k: 'skip' });
          const all = []; G.P.forEach((p, j) => U.grid[j].forEach((x, k) => x && !x.open && all.push([j, k])));
          taps(all, (j, k) => done({ k: 'Q', at: [j, k] }));
        }
      };
      step(mode);
    });
  }

  // ---- fine partita ----
  function end() {
    const G = U.G, rk = E.ranking(G), won = G.res[0].win, place = rk.findIndex(r => r.p === 0) + 1;
    const rec = st().ctSt || (st().ctSt = [0, 0]); rec[1]++; if (won) rec[0]++; save();
    const rows = rk.map((r, k) => `<div class="${r.p === 0 ? 'me' : ''}"><b>${k + 1}°</b><span>${esc(G.P[r.p].n)}${r.p === G.stopBy ? ' <small>(Stop)</small>' : ''}</span><i>${pt(r.sc)}</i></div>`).join('');
    const ov = overlay(`<div class="pkBox"><h2>${won ? 'Hai vinto!' : 'Partita finita'}</h2><p>${won ? 'Hai il punteggio piu\' basso del tavolo.' : 'Sei arrivato ' + place + '° su ' + G.P.length + '.'}</p><div class="pkRows">${rows}</div>
      <button type="button" class="big pr" data-k="r">Rivincita</button><button type="button" class="big" data-k="v">Guarda le carte</button><button type="button" class="big" data-k="s">Cambia le scelte</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelector('[data-k=r]').onclick = () => { ov.remove(); begin(U.o); };
    ov.querySelector('[data-k=v]').onclick = () => {
      ov.style.display = 'none'; U.S.querySelector('#ctWait').textContent = 'Tocca per tornare alla classifica';
      setTimeout(() => U && U.root.addEventListener('pointerdown', () => { ov.style.display = ''; if (U) U.S.querySelector('#ctWait').textContent = ''; }, { once: true }), 50);
    };
    ov.querySelector('[data-k=s]').onclick = () => { ov.remove(); clearCards(); setup(); };
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }
  function askExit() {
    const G = U.G;
    if (!G || G.over) { stop(); return; }
    const ov = overlay(`<div class="pkBox"><h2>Lasci il tavolo?</h2><p>La partita finisce qui.</p><button type="button" class="big pr" data-k="s">Resto a giocare</button><button type="button" class="big" data-k="x">Esco</button></div>`);
    ov.querySelector('[data-k=s]').onclick = () => ov.remove();
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }

  function start(opt = {}) {
    if (U) stop(true);
    const root = document.createElement('div'); root.id = 'ctT'; document.body.appendChild(root);
    U = { root, opt, G: null, skip: false, busy: false, grid: [], pile: [] };
    // tocco sul tavolo mentre giocano gli altri = animazioni veloci fino al mio turno
    root.addEventListener('pointerdown', e => { if (U && U.busy && U.G && !U.G.over && !e.target.closest('button,details,.pkOv')) { U.skip = true; root.classList.add('pkFast'); } });
    setup();
  }
  function stop(silent) {
    if (!U) return; const cb = U.opt.onExit;
    U.root.remove(); U = null; if (!silent && cb) cb();
  }
  window.CT = { start, stop, get U() { return U; } };
})();
