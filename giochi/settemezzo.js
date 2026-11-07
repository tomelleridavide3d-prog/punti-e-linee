// SETTE E MEZZO al tavolino del te' (sessione "Minigioco Sette e mezzo", decisioni in CLAUDE.md "SETTE E MEZZO: DECISIONI").
// Motore SME fra i marcatori (in node: require('giochi/settemezzo.js') = motore). Schermo window.SM: da solo contro i computer.
// Serve prima giochi/lib/carte.js (carte napoletane) e giochi/poker.js (PKART: fiches e tavolo, e le classi .pk* dello schermo).
// ==SM ENGINE==
const SME = (() => {
  const SU = 'dcsb', MATTA = 'd10';   // d denari, c coppe, s spade, b bastoni; 8 fante, 9 cavallo, 10 re; la matta = re di denari
  const rank = c => +c.slice(1);
  const val = c => { const r = rank(c); return r <= 7 ? r : 0.5; };
  function deck() { const d = []; for (const s of SU) for (let r = 1; r <= 10; r++) d.push(s + r); return d; }
  function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // punti di una mano: la matta vale quello che serve (il massimo senza sballare)
  function total(cs, matta) {
    let s = 0, m = false;
    for (const c of cs) { if (matta && c === MATTA) m = true; else s += val(c); }
    if (!m) return s;
    for (const x of [7, 6, 5, 4, 3, 2, 1, 0.5]) if (s + x <= 7.5) return s + x;
    return s + 0.5;
  }
  // sette e mezzo reale: un 7 e una figura, con due carte sole
  const reale = cs => cs.length === 2 && cs.some(c => rank(c) === 7) && cs.some(c => rank(c) >= 8);
  const words = t => t > 7.5 ? 'sballato' : t === 7.5 ? 'sette e mezzo' : t === 0.5 ? 'mezzo' : (t % 1 ? Math.floor(t) + ' e mezzo' : String(t));

  const push = (G, e) => { e.ch = G.P.map(p => p.chips); e.bk = G.bank; G.ev.push(e); };
  const prev = (G, i) => (i - 1 + G.P.length) % G.P.length;   // si gira in senso antiorario
  function nextActive(G, i) { let j = i; for (let k = 0; k < G.P.length; k++) { j = prev(G, j); if (!G.P[j].out) return j; } return i; }
  function order(G) { const o = []; let j = G.bank; for (let k = 0; k < G.P.length - 1; k++) { j = prev(G, j); if (!G.P[j].out && j !== G.bank) o.push(j); } return o; }

  // o = { players: [{ n, bot, ch }], chips, min, max, endHands (0 = finche' restano le fiches), rise (ogni quante mani la posta raddoppia, 0 = mai),
  //       bank, matta, watch (posto che se resta senza fiches chiude la partita) }
  function newGame(o) {
    const G = {
      P: o.players.map(p => ({ n: p.n, bot: !!p.bot, ch: p.ch || null, chips: o.chips, out: false, cards: [], bet: 0, done: false, bust: false, bustAt: 0 })),
      bank: o.bank || 0, hand: 0, endHands: o.endHands || 0, rise: o.rise || 0, min: o.min || 10, max: o.max || 100, matta: o.matta !== false,
      watch: o.watch == null ? -1 : o.watch, ev: [], ph: 'idle', turn: -1, over: false, deck: [], ord: [], used: [],
    };
    return G;
  }
  function startHand(G) {
    if (G.over) return;
    G.hand++; G.deck = shuffle(deck()); G.used = [];
    const up = G.rise > 0 && G.hand > 1 && (G.hand - 1) % G.rise === 0;
    if (up) { G.min *= 2; G.max *= 2; }
    for (const p of G.P) { p.cards = []; p.bet = 0; p.done = false; p.bust = false; }
    G.ord = order(G); G.ph = 'bet'; G.turn = -1;
    push(G, { t: 'hand', hand: G.hand, up, min: G.min, max: G.max });
    const seq = [];
    for (const i of [...G.ord, G.bank]) { const c = G.deck.pop(); G.P[i].cards.push(c); seq.push([i, c]); }
    push(G, { t: 'deal', seq });
  }
  const maxBet = (G, i) => Math.max(0, Math.min(G.max, G.P[i].chips));
  function bet(G, i, amt) {
    const p = G.P[i];
    if (G.ph !== 'bet' || !G.ord.includes(i) || p.bet) return false;
    p.bet = Math.max(Math.min(G.min, maxBet(G, i)), Math.min(maxBet(G, i), Math.round(amt)));
    push(G, { t: 'bet', p: i, amt: p.bet });
    if (G.ord.every(j => G.P[j].bet)) { G.ph = 'play'; G.turn = -1; nextTurn(G); }
    return true;
  }
  function draw(G, i) {
    if (!G.deck.length) {   // mazzo finito (succede quasi mai): si rimescolano le carte che non sono sul tavolo
      const on = new Set(G.P.flatMap(p => p.cards)); G.deck = shuffle(deck().filter(c => !on.has(c)));
      push(G, { t: 'reshuffle' });
    }
    const c = G.deck.pop(); G.P[i].cards.push(c); push(G, { t: 'card', p: i, c }); return c;
  }
  function act(G, i, k) {
    const p = G.P[i];
    if (G.ph === 'play' && i === G.turn) {
      if (k === 'c') {
        draw(G, i); const t = total(p.cards, G.matta);
        if (t > 7.5) {
          const bk = G.P[G.bank], amt = Math.min(p.bet, p.chips); p.bust = true; p.done = true; p.chips -= amt; bk.chips += amt;
          push(G, { t: 'bust', p: i, cov: p.cards[0], amt, tot: t }); nextTurn(G);
        } else if (t === 7.5) { p.done = true; push(G, { t: 'stand', p: i, auto: 1 }); nextTurn(G); }
      } else { p.done = true; push(G, { t: 'stand', p: i }); nextTurn(G); }
      return true;
    }
    if (G.ph === 'bank' && i === G.bank) {
      if (k === 'c') { draw(G, i); const t = total(p.cards, G.matta); if (t >= 7.5) settle(G); }
      else settle(G);
      return true;
    }
    return false;
  }
  function nextTurn(G) {
    const nx = G.ord.find(j => !G.P[j].done);
    if (nx != null) { G.turn = nx; push(G, { t: 'turn', p: nx }); return; }
    if (!G.ord.some(j => !G.P[j].bust)) { push(G, { t: 'nobank' }); settle(G); return; }
    G.ph = 'bank'; G.turn = G.bank;
    push(G, { t: 'bankopen', p: G.bank, c: G.P[G.bank].cards[0] });
    push(G, { t: 'turn', p: G.bank });
  }
  // i conti: il banco paga chi ha piu' di lui (doppio il reale), incassa a pari merito; se sballa paga tutti quelli rimasti
  function settle(G) {
    const bk = G.P[G.bank], bt = total(bk.cards, G.matta), bBust = bt > 7.5, bReal = !bBust && reale(bk.cards);
    const res = [];
    for (const i of G.ord) {
      const p = G.P[i]; if (p.bust) continue;
      const t = total(p.cards, G.matta), r = reale(p.cards), win = bBust || t > bt;
      let amt;
      if (win) { amt = Math.min(p.bet * (r ? 2 : 1), bk.chips); bk.chips -= amt; p.chips += amt; }
      else { amt = -Math.min(p.bet * (bReal ? 2 : 1), p.chips); p.chips += amt; bk.chips -= amt; }
      res.push({ p: i, t, r, win, amt, cov: p.cards[0] });
    }
    push(G, { t: 'show', bank: { p: G.bank, t: bt, bust: bBust, r: bReal, cov: bk.cards[0] }, res });
    // chi fa sette e mezzo reale (e non lo batte il banco) prende il banco; il primo in ordine di gioco
    const rw = res.find(x => x.r && x.win);
    let nb = rw ? rw.p : G.bank;
    for (const [i, p] of G.P.entries()) if (!p.out && p.chips < G.min) { p.out = true; p.bustAt = G.hand; push(G, { t: 'out', p: i }); }
    if (G.P[nb].out) nb = nextActive(G, nb);
    if (nb !== G.bank) { const why = rw && rw.p === nb ? 'r' : 'f'; G.bank = nb; push(G, { t: 'newbank', p: nb, why }); }
    G.ph = 'done'; G.turn = -1;
    const alive = G.P.filter(p => !p.out).length;
    if (alive <= 1 || (G.endHands && G.hand >= G.endHands) || (G.watch >= 0 && G.P[G.watch].out)) { G.over = true; G.ph = 'over'; push(G, { t: 'over' }); }
  }

  // ---- il computer: non bara, ragiona solo sulle carte che vede ----
  function known(G, i) {
    const k = new Set(G.P[i].cards);
    for (const [j, p] of G.P.entries()) {
      p.cards.forEach((c, n) => { if (n > 0) k.add(c); });
      if (p.bust || (j === G.bank && G.ph === 'bank')) k.add(p.cards[0]);
    }
    return k;
  }
  const unseen = (G, i) => { const k = known(G, i); return deck().filter(c => !k.has(c)); };
  const pBust = (cs, pool, matta) => pool.length ? pool.filter(c => total(cs.concat([c]), matta) > 7.5).length / pool.length : 0;
  // quanto punta: piu' forte se la carta coperta e' buona (la matta, il 7, il 6, una figura), e secondo il carattere
  function botBet(G, i, rnd = Math.random) {
    const p = G.P[i], c = p.cards[0], r = rank(c), ch = p.ch || { a: 0.5 };
    const w = G.matta && c === MATTA ? 1 : r === 7 ? 0.72 : r === 6 ? 0.55 : r >= 8 ? 0.5 : r === 5 ? 0.4 : 0.28;
    const f = Math.max(0.03, Math.min(1, w + (ch.a - 0.5) * 0.45 + (rnd() - 0.5) * 0.3));
    const mx = maxBet(G, i), step = G.min, amt = G.min + (mx - G.min) * f * f;
    return Math.max(Math.min(G.min, mx), Math.min(mx, Math.round(amt / step) * step));
  }
  // carta o sto: rischio di sballare (sulle carte che non ha visto) contro quanto e' alto il punteggio
  const LIM = { 4.5: 0.62, 5: 0.52, 5.5: 0.42, 6: 0.3, 6.5: 0.17, 7: 0.05 };
  function botPlay(G, i, rnd = Math.random) {
    const p = G.P[i], t = total(p.cards, G.matta), ch = p.ch || { a: 0.5 };
    if (t >= 7.5) return 's';
    if (t <= 4) return 'c';
    const lim = LIM[t] + (ch.a - 0.5) * 0.18 + (rnd() - 0.5) * 0.08;
    return pBust(p.cards, unseen(G, i), G.matta) <= lim ? 'c' : 's';
  }
  // il banco: immagina le carte coperte di chi e' rimasto (tenendo conto di quando ha chiesto carta e quando si e' fermato)
  // e confronta quanto guadagna fermandosi o chiedendo ancora una carta
  const PST = t => t >= 7.5 ? 1 : t >= 7 ? 0.97 : t >= 6.5 ? 0.9 : t >= 6 ? 0.75 : t >= 5.5 ? 0.55 : t >= 5 ? 0.35 : t >= 4.5 ? 0.2 : t >= 4 ? 0.1 : 0.04;
  function bankPlay(G, rnd = Math.random, K = 320) {
    const bk = G.P[G.bank], bt = total(bk.cards, G.matta);
    if (bt >= 7.5) return 's';
    const live = G.ord.filter(j => !G.P[j].bust).map(j => G.P[j]);
    if (!live.length) return 's';
    const pool0 = unseen(G, G.bank);
    let wS = 0, wH = 0, W = 0;
    // quanto incassa il banco con t punti contro le mani ts (mu = 2 per chi ha il reale; real = il banco ha il reale)
    const gain = (t, ts, mu, real) => { let g = 0; live.forEach((p, k) => { g += t > 7.5 || ts[k] > t ? -p.bet * mu[k] : p.bet * (real ? 2 : 1); }); return g; };
    for (let s = 0; s < K; s++) {
      const pool = shuffle(pool0.slice(), rnd); let w = 1; const ts = [], mu = [];
      for (const p of live) {
        const cov = pool.pop(), cs = [cov, ...p.cards.slice(1)];
        for (let n = 1; n < cs.length && w; n++) w *= 1 - PST(total(cs.slice(0, n), G.matta));
        const t = total(cs, G.matta); if (t > 7.5) w = 0; else w *= PST(t);
        mu.push(reale(cs) ? 2 : 1); ts.push(t);
        if (!w) break;
      }
      if (!w) continue;
      const nc = pool.pop(), b2 = bk.cards.concat([nc]), t2 = total(b2, G.matta);
      W += w; wS += w * gain(bt, ts, mu, false); wH += w * gain(t2, ts, mu, t2 === 7.5 && reale(b2));
    }
    if (!W) return bt < 5 ? 'c' : 's';
    const ch = bk.ch || { a: 0.5 }, tilt = (ch.a - 0.5) * 0.06 * Math.abs(wS / W || 1);
    return wH / W + tilt > wS / W ? 'c' : 's';
  }
  return { SU, MATTA, rank, val, deck, shuffle, total, reale, words, newGame, startHand, bet, act, maxBet, botBet, botPlay, bankPlay, unseen, order };
})();
// ==END SM ENGINE==
if (typeof module !== 'undefined' && module.exports) module.exports = SME;

// ======== SCHERMO: SM.start({ name, look, onExit }) ========
if (typeof window !== 'undefined') (() => {
  const E = SME, fmt = n => PKART.fmt(n), CR = () => CARTE.H / CARTE.W;
  // i computer: gli stessi ospiti del poker, con frasi da sette e mezzo (a = voglia di rischiare)
  const CHARS = [
    { n: 'Il Conte', a: 0.45, col: '#3a3f49', hat: 'cilindro', say: { c: ['Carta, prego.', 'Un\'altra, con eleganza.'], s: ['Mi basta cosi\'.', 'Sto.'], b: ['Ohibo\'.', 'Che sgarbo, questa carta.'], w: ['Come previsto.', 'Il banco ringrazia.'] } },
    { n: 'Nonna Pina', a: 0.15, col: '#8a4fd0', hat: 'basco', say: { c: ['Ancora una, piano piano.'], s: ['Io mi fermo, caro.', 'Basta cosi\', che il cuore non regge.'], b: ['Mannaggia!', 'Ai miei tempi le carte erano piu\' buone.'], w: ['Brava nonna!'] } },
    { n: 'Rocco', a: 0.9, col: '#3b6fe0', hat: 'cappellino', say: { c: ['Carta!', 'Dai, dammene un\'altra!', 'Si rischia!'], s: ['Sto, e tremate.'], b: ['Noo!', 'Ancora sballato!'], w: ['Facile.', 'Te l\'avevo detto.'] } },
    { n: 'Lola', a: 0.6, col: '#f07ab8', hat: 'borsalino', say: { c: ['Mi sento fortunata.', 'Carta, tesoro.'], s: ['Indovina cos\'ho sotto.', 'Sto.'], b: ['Uffa.'], w: ['Grazie, tesoro.'] } },
    { n: 'Il Professore', a: 0.35, col: '#2fa35a', hat: 'nessuno', say: { c: ['Le probabilita\' lo consentono.'], s: ['Statisticamente, mi fermo.'], b: ['Un evento improbabile.'], w: ['Matematica pura.'] } },
    { n: 'Zio Tano', a: 0.65, col: '#8a5a32', hat: 'borsalino', say: { c: ['Carta. E zitti.'], s: ['Qua mi fermo io.'], b: ['Bah.'], w: ['E chi mi ferma?'] } },
    { n: 'Gigi', a: 0.8, col: '#f08a24', hat: 'cuffie', say: { c: ['Vai, carta!', 'Tutto o niente!'], s: ['Ok ok, sto.'], b: ['Che botta!', 'Noo, carte orribili.'], w: ['Evvai!'] } },
  ];
  const SLOTS = { 1: ['T'], 2: ['UL', 'UR'], 3: ['UL', 'T', 'UR'], 4: ['LL', 'UL', 'UR', 'LR'], 5: ['LL', 'UL', 'T', 'UR', 'LR'], 6: ['LL', 'ML', 'UL', 'UR', 'MR', 'LR'], 7: ['LL', 'ML', 'UL', 'T', 'UR', 'MR', 'LR'] };
  const OPT = {
    op: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7']],
    ch: [['500', '500'], ['1000', '1.000'], ['2000', '2.000']],
    pu: [['10-50', 'da 10 a 50'], ['10-100', 'da 10 a 100'], ['20-200', 'da 20 a 200']],
    fi: [['10', 'Dopo 10 mani'], ['20', 'Dopo 20 mani'], ['30', 'Dopo 30 mani'], ['0', 'Finche\' restano le fiches']],
  };
  const DEF = { op: '3', ch: '1000', pu: '10-100', fi: '20' };
  const RISE = 10;   // "finche' restano le fiches": la posta raddoppia ogni 10 mani (senza, i computer giocherebbero per centinaia di mani)
  let LS = null;
  const st = () => (typeof store !== 'undefined' && store.settings) ? store.settings : (LS || (LS = (() => { try { return JSON.parse(localStorage.getItem('smS') || '{}'); } catch { return {}; } })()));
  const save = () => { if (typeof store !== 'undefined' && store.settings && typeof saveStore === 'function') saveStore(); else try { localStorage.setItem('smS', JSON.stringify(st())); } catch { } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const FAST = () => !!window.__SMFAST;
  const B = (...a) => { if (typeof beep === 'function') beep(...a); };
  const sfx = {
    chip: () => { B(2500 + Math.random() * 600, 0.025, 0.016); B(3300, 0.02, 0.01, 0.035); },
    card: () => { if (typeof thud === 'function') thud(0.22, 2900); },
    flip: () => { if (typeof thud === 'function') thud(0.3, 2100); },
    turn: () => B(880, 0.07, 0.02, 0, 'triangle'),
    // suoni comici: lo sballo e' un trombone che scende, il sette e mezzo una fanfara
    bust: () => [330, 311, 294, 220].forEach((f, i) => B(f, i === 3 ? 0.55 : 0.2, 0.03, i * 0.2, 'sawtooth')),
    half: () => [523, 659, 784, 1047, 1319].forEach((f, i) => B(f, i === 4 ? 0.45 : 0.1, 0.03, i * 0.08, 'triangle')),
    real: () => [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => B(f, i === 7 ? 0.6 : 0.1, 0.034, i * 0.09, 'square')),
    win: () => [523, 659, 784, 1047].forEach((f, i) => B(f, i === 3 ? 0.4 : 0.12, 0.03, i * 0.11, 'triangle')),
    lose: () => [392, 370, 349, 262].forEach((f, i) => B(f, i === 3 ? 0.45 : 0.16, 0.025, i * 0.16, 'triangle')),
  };

  const css = document.createElement('style');
  css.textContent = `
#smT{position:fixed;inset:0;z-index:120;overflow:hidden;background:#120b07;color:#fff;font-family:system-ui,"Segoe UI",Roboto,sans-serif;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#smT *{box-sizing:border-box}
#smS{position:absolute;left:0;top:0;transform-origin:0 0}
#smS>canvas{position:absolute;left:0;top:0}
.smAb{position:absolute}
#smTop{left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));display:flex;align-items:center;gap:8px;z-index:60}
#smTop button{background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:7px 13px;font:600 15px system-ui,sans-serif}
#smTop .info{flex:1;text-align:center;font:600 13px/1.25 system-ui,sans-serif;opacity:.92}
#smTop .info b{display:block;font:800 15px system-ui,sans-serif;color:#ffe27a}
#smMe{z-index:26;display:flex;align-items:center;gap:8px}
#smMe .pkAv{position:relative;left:0;top:0;width:46px;height:46px}
#smMe .t{font:700 13px/1.2 system-ui,sans-serif}#smMe .t b{display:block;font:800 15px system-ui,sans-serif;color:#ffe27a}
#smMe.turn .pkAv{box-shadow:0 0 0 3px #ffe27a,0 0 18px 4px rgba(255,214,90,.6)}
#smMe .pkTag{left:-6px;top:-30px;width:auto;text-align:left}
#smMsg{left:50%;z-index:40;transform:translate(-50%,-50%);text-align:center;background:rgba(14,8,4,.86);border:1px solid rgba(255,226,122,.5);border-radius:14px;padding:8px 16px;font:800 16px/1.3 system-ui,sans-serif;white-space:nowrap;pointer-events:none;transition:opacity .3s}
#smMsg small{display:block;font:600 13px system-ui,sans-serif;color:#ffe27a}
#smStamp{left:50%;z-index:70;transform:translate(-50%,-50%);text-align:center;pointer-events:none;white-space:nowrap}
#smStamp div{font:900 46px/1 system-ui,sans-serif;letter-spacing:1px;-webkit-text-stroke:2px #2b1208;paint-order:stroke fill;text-shadow:0 5px 0 #2b1208,0 10px 26px rgba(0,0,0,.7);opacity:0}
#smStamp small{display:block;font:800 16px system-ui,sans-serif;margin-top:8px;color:#fff;text-shadow:0 2px 6px #000;opacity:0}
#smStamp.go div{animation:smPop 1.5s cubic-bezier(.2,.9,.3,1.25) forwards}
#smStamp.go small{animation:smFade 1.5s forwards}
#smStamp.b div{color:#ff5a4a}#smStamp.h div{color:#ffe27a}#smStamp.r div{color:#ffe27a;font-size:40px}
@keyframes smPop{0%{opacity:0;transform:scale(2.6) rotate(-14deg)}14%{opacity:1;transform:scale(.92) rotate(-6deg)}22%{transform:scale(1.06) rotate(-7deg)}30%,80%{opacity:1;transform:scale(1) rotate(-7deg)}100%{opacity:0;transform:scale(1.08) rotate(-7deg)}}
@keyframes smFade{0%,12%{opacity:0}24%,80%{opacity:1}100%{opacity:0}}
#smT.pkFast #smStamp div,#smT.pkFast #smStamp small{animation-duration:.5s}
#smDeck{z-index:11;transform:translate(-50%,-50%);pointer-events:none}
#smDeck img{display:block;border-radius:7%/5%;box-shadow:1px 1px 0 #d8cdb0,2px 2px 0 #b9ab88,3px 3px 0 #d8cdb0,4px 4px 0 #b9ab88,5px 6px 10px rgba(0,0,0,.5)}
.smBk{position:absolute;z-index:27;transform:translate(-50%,-50%);background:linear-gradient(#ffe27a,#d9a425);color:#3a2408;font:900 11px/1 system-ui,sans-serif;letter-spacing:.8px;padding:5px 9px 4px;border-radius:9px;box-shadow:0 2px 6px rgba(0,0,0,.55),inset 0 0 0 1px #fff3b8;transition:left .8s cubic-bezier(.3,.7,.3,1),top .8s cubic-bezier(.3,.7,.3,1);pointer-events:none}
.pkC.cov img.f{box-shadow:0 0 0 2px #2b1b12,0 0 0 4px #c99a44,0 3px 8px rgba(0,0,0,.45)}
#smAct{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:40}
#smAct .pre{display:flex;gap:6px;margin-bottom:7px}
#smAct .pre button{flex:1;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.4);color:#fff;border-radius:10px;padding:7px 0;font:700 13px system-ui,sans-serif}
#smAct .pre button.on{background:rgba(242,194,48,.25);border-color:#f2c230;color:#ffe27a}
#smAct .sl{display:flex;align-items:center;gap:10px;margin-bottom:8px}
#smAct input[type=range]{flex:1;accent-color:#f2c230;height:28px}
#smAct .sl .v{min-width:60px;text-align:right;font:800 16px system-ui,sans-serif;color:#ffe27a}
#smAct .main{display:flex;gap:8px}
#smAct .main button{flex:1;border:0;border-radius:14px;padding:14px 0 13px;font:800 17px system-ui,sans-serif;color:#fff}
#smAct .k{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231}
#smAct .r{background:linear-gradient(#f2c230,#d39b17);color:#3a2408!important;box-shadow:0 3px 0 #8f6609}
#smAct [hidden]{display:none!important}
#smWait{left:10px;right:10px;bottom:calc(30px + env(safe-area-inset-bottom));z-index:39;text-align:center;font:700 15px system-ui,sans-serif;opacity:.85}
#smT.pkFast .pkC,#smT.pkFast .pkC .in,#smT.pkFast .pkBet,#smT.pkFast .pkFly,#smT.pkFast .smBk{transition-duration:.08s!important}
.smRu p{text-align:left!important;margin:6px 0!important}
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
    const sv = Object.assign({}, DEF, st().smOpt || {}), rec = st().smSt;
    const ov = overlay(`<div class="pkBox"><h2>Sette e mezzo</h2><p>Carte napoletane, il Conte fa il banco. Chi supera sette e mezzo ha sballato.${rec ? '<br>Partite vinte: ' + rec[0] + ' su ' + rec[1] + '.' : ''}</p>`
      + tendina('op', 'Computer al tavolo', OPT.op, sv.op)
      + tendina('ch', 'Fiches a testa', OPT.ch, sv.ch)
      + tendina('pu', 'Puntata', OPT.pu, sv.pu)
      + tendina('fi', 'Fine partita', OPT.fi, sv.fi)
      + `<p class="pkNote">Il re di denari e' la matta: vale quello che ti serve. Chi fa sette e mezzo reale (un 7 e una figura) prende il doppio e diventa banco.</p>`
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
      st().smOpt = o; save(); ov.remove(); begin(o);
    };
    ov.querySelector('[data-k=ru]').onclick = rules;
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }
  function rules() {
    const ov = overlay(`<div class="pkBox smRu"><h2>Come si gioca</h2>
      <p>Ognuno riceve una carta coperta: la vedi solo tu. Guardala e punta le tue fiches contro il banco.</p>
      <p>Poi chiedi <b>Carta</b> (arriva scoperta) quante volte vuoi, oppure <b>Sto</b>. Le carte dall'asso al 7 valgono il loro numero, fante, cavallo e re mezzo punto. Il re di denari e' la <b>matta</b>: vale quello che serve.</p>
      <p>Se superi sette e mezzo hai <b>sballato</b>: giri la carta coperta e perdi subito la puntata.</p>
      <p>Il banco gioca per ultimo e gira le sue carte una alla volta. Paga chi ha piu' punti di lui; a pari punti vince il banco. Se il banco sballa paga tutti quelli rimasti.</p>
      <p><b>Sette e mezzo reale</b> = un 7 e una figura con due carte sole: si prende il doppio e si diventa banco.</p>
      <button type="button" class="big pr" data-k="x">Ho capito</button></div>`);
    ov.querySelector('[data-k=x]').onclick = () => ov.remove();
  }

  // ---- inizio partita ----
  function begin(o) {
    U.o = o;
    const n = +o.op, pool = CHARS.slice(1).sort(() => Math.random() - 0.5), bots = [CHARS[0], ...pool].slice(0, n).sort(() => Math.random() - 0.5);
    const [mn, mx] = o.pu.split('-').map(Number);
    const players = [{ n: U.opt.name || 'Tu' }, ...bots.map(c => ({ n: c.n, bot: 1, ch: c }))];
    U.G = E.newGame({ players, chips: +o.ch, min: mn, max: mx, endHands: +o.fi, rise: +o.fi ? 0 : RISE, bank: window.__SMBANK ? 0 : players.findIndex(p => p.n === 'Il Conte' && p.bot), watch: 0 });   // __SMBANK: prove col banco a me
    U.evi = 0; U.cards = []; U.dch = null;
    build(); run();
  }
  function lay() {
    const G = U.G, n = G.P.length - 1, sl = SLOTS[n], mid = sl.includes('ML');
    const vw0 = U.root.clientWidth || innerWidth, vh0 = U.root.clientHeight || innerHeight, kw = Math.min(1, vw0 / 380), W0 = vw0 / kw;
    const mw = Math.min(78, W0 * 0.2), mh = mw * CR();
    const Ty = 84; let topSy = Ty + 22, upSy = topSy + (sl.includes('T') ? 118 : 30), midSy = upSy + 122, lowSy = mid ? midSy + 122 : upSy + 150;
    const need = lowSy + 104 + 46 + mh + 150;
    const k = Math.min(kw, vh0 / need), W = vw0 / k, H = vh0 / k, e = H - need;
    topSy += e * 0.03; upSy += e * 0.1; midSy += e * 0.3; lowSy += e * (mid ? 0.48 : 0.4);
    const myTop = H - 152 - mh;
    const pos = { T: [W / 2, topSy, 'T'], UL: [50, upSy, 'L'], UR: [W - 50, upSy, 'R'], ML: [50, midSy, 'L'], MR: [W - 50, midSy, 'R'], LL: [50, lowSy, 'L'], LR: [W - 50, lowSy, 'R'] };
    const seats = [null, ...sl.map(s => pos[s])];
    const cy = mid ? (upSy + midSy) / 2 + 8 : (upSy + lowSy) / 2;
    return { k, W, H, mw, mh, myTop, seats, cy, T: { x: 10, y: Ty, w: W - 20, h: lowSy + 66 - Ty, rail: 20 } };
  }
  const deckXY = L => [L.W / 2, L.cy];
  const seatXY = (L, i) => i === 0 ? [37, L.myTop + L.mh * 0.32 + 23] : [L.seats[i][0], L.seats[i][1]];
  function betXY(L, i) {
    if (i === 0) return [L.W / 2 + 40, L.myTop - 40];
    const [sx, sy, side] = L.seats[i];
    return side === 'T' ? [sx - 84, sy + 8] : [sx + (side === 'R' ? -84 : 84), sy + 44];
  }
  function bkXY(L, i) { if (i === 0) return [37, L.myTop + L.mh * 0.32 - 14]; const [sx, sy] = L.seats[i]; return [sx, sy + 66]; }   // a cavallo del bordo sotto il nome
  // carte di un giocatore: [x, y, larghezza, rotazione]
  function cardXY(L, i, j, n) {
    if (i === 0) {
      const xs = 168, avail = L.W - 12 - xs - L.mw, step = n > 1 ? Math.min(L.mw * 0.56, avail / (n - 1)) : 0;
      return [xs + L.mw / 2 + j * step, L.myTop + L.mh / 2 + Math.abs(j - (n - 1) / 2) * 2, L.mw, (j - (n - 1) / 2) * 3];
    }
    const [sx, sy, side] = L.seats[i], w = 31, step = n > 1 ? Math.min(15, 86 / (n - 1)) : 0;
    const x0 = side === 'R' ? sx - 46 - (n - 1) * step : sx + 46;
    return [x0 + j * step, sy - 6, w, 0];
  }

  function build() {
    const R = U.root, G = U.G;
    R.querySelectorAll('#smS').forEach(e => e.remove());
    const S = document.createElement('div'); S.id = 'smS'; R.prepend(S); U.S = S;
    S.innerHTML = `<canvas></canvas>
      <div class="smAb" id="smTop"><button type="button" data-k="x">Esci</button><div class="info"></div><button type="button" data-k="ru">Regole</button></div>
      <div class="smAb" id="smDeck"><img alt=""></div><div class="smAb" id="smMsg" style="opacity:0"></div><div class="smAb" id="smStamp"><div></div><small></small></div>
      <div class="smAb" id="smMe"><div class="pkAv"></div><div class="t"></div><div class="pkTag"></div></div>
      <div class="smAb" id="smWait"></div>
      <div class="smAb" id="smAct" hidden><div class="pre"><button type="button" data-p="min">Minimo</button><button type="button" data-p="d">Doppio</button><button type="button" data-p="h">Meta'</button><button type="button" data-p="max">Massimo</button></div>
        <div class="sl"><input type="range" min="0" max="100" value="0"><div class="v"></div></div>
        <div class="main"><button type="button" class="k">Carta</button><button type="button" class="r">Sto</button></div></div>
      <div class="smBk">BANCO</div>`;
    S.querySelector('#smTop [data-k=x]').onclick = askExit;
    S.querySelector('#smTop [data-k=ru]').onclick = rules;
    U.seats = G.P.map((p, i) => {
      if (i === 0) { S.querySelector('#smMe .pkAv').appendChild(portrait(U.opt.look || { col: '#c8102e', hat: 'borsalino', skin: 'omino' })); return S.querySelector('#smMe'); }
      const s = document.createElement('div'); s.className = 'pkSeat';
      s.innerHTML = `<div class="pkRing"></div><div class="pkAv"></div><div class="pkPlate"><div class="n">${esc(p.n)}</div><div class="c"></div></div><div class="pkTag"></div>`;
      s.querySelector('.pkAv').appendChild(portrait({ skin: 'omino', col: p.ch.col, hat: p.ch.hat })); S.appendChild(s); return s;
    });
    U.bets = G.P.map(() => { const b = document.createElement('div'); b.className = 'pkBet'; b.style.opacity = 0; S.appendChild(b); return b; });
    U.say = G.P.map(() => null);
    actUI(); layout();
  }
  function layout() {
    const L = U.L = lay(), S = U.S, dpr = dprOf();
    Object.assign(S.style, { width: L.W + 'px', height: L.H + 'px', transform: L.k < 1 ? `scale(${L.k})` : '' });
    PKART.table(S.querySelector('canvas'), L.W, L.H, L.T, dpr * L.k);
    U.G.P.forEach((p, i) => {
      const [x, y] = seatXY(L, i), s = U.seats[i];
      if (i === 0) Object.assign(s.style, { left: '14px', top: L.myTop + L.mh * 0.32 + 'px' });
      else Object.assign(s.style, { left: x + 'px', top: y + 'px' });
      const b = U.bets[i], [bx, by] = betXY(L, i); b.classList.add('nt'); Object.assign(b.style, { left: bx + 'px', top: by + 'px' }); void b.offsetWidth; b.classList.remove('nt');
    });
    const [dx, dy] = deckXY(L), dk = S.querySelector('#smDeck'), dw = 46;
    Object.assign(dk.style, { left: dx + 'px', top: dy + 'px' }); const im = dk.querySelector('img'); im.style.width = dw + 'px'; im.src = CARTE.url('d', 0, dw * dpr * L.k);
    Object.assign(S.querySelector('#smMsg').style, { top: dy - 70 + 'px' });
    Object.assign(S.querySelector('#smStamp').style, { top: dy + 'px' });
    bankBadge(true);
    for (const o of U.cards) place(o, true);
    plates();
  }
  addEventListener('resize', () => { if (U && U.S && U.G) { clearTimeout(U.rz); U.rz = setTimeout(() => U && U.S && layout(), 120); } });

  // ---- carte: <div class="pkC"> con fronte e retro, mosse con le transizioni ----
  function mkCard(c, i) {
    const L = U.L, el = document.createElement('div'); el.className = 'pkC down';
    el.innerHTML = `<div class="in"><img class="f" alt=""><img class="b" alt=""></div>`;
    const o = { el, c, i, j: U.cards.filter(x => x.i === i).length, open: false, w: 0 };
    if (i === 0) el.classList.add('mine');
    el.querySelector('img.b').src = CARTE.url('d', 0, (i === 0 ? L.mw : 31) * dprOf() * L.k);
    U.S.appendChild(el); U.cards.push(o);
    const [x, y] = deckXY(L); setT(o, x, y, 46, 0, 1); void el.offsetWidth;
    return o;
  }
  function setT(o, x, y, w, r, sc = 1) {
    if (o.w !== w) { o.w = w; o.el.style.width = w + 'px'; o.el.style.height = w * CR() + 'px'; }
    o.el.style.transform = `translate(${x - w / 2}px,${y - w * CR() / 2}px) rotate(${r || 0}deg) scale(${sc})`;
  }
  function front(o) { const im = o.el.querySelector('img.f'), key = o.c + '_' + o.w; if (im.dataset.k !== key) { im.src = CARTE.url(o.c[0], +o.c.slice(1), o.w * dprOf() * U.L.k); im.dataset.k = key; } }
  function place(o, now) {
    const L = U.L, n = U.cards.filter(x => x.i === o.i).length, [x, y, w, r] = cardXY(L, o.i, o.j, n);
    if (now) o.el.style.transition = 'none';
    setT(o, x, y, w, r); if (o.open || o.i === 0) front(o);
    if (now) { void o.el.offsetWidth; o.el.style.transition = ''; }
  }
  const handOf = i => U.cards.filter(o => o.i === i);
  function open(o, slow) { o.open = true; front(o); if (slow) o.el.classList.add('slow'); o.el.classList.remove('down'); }
  function clearCards() { for (const o of U.cards) o.el.remove(); U.cards = []; }

  // ---- numeri, scritte, fumetti ----
  function plates() {
    const G = U.G, ch = U.dch || G.P.map(p => p.chips);
    G.P.forEach((p, i) => {
      const s = U.seats[i], t = p.out && ch[i] < G.min ? 'Fuori' : fmt(ch[i]);
      if (i === 0) s.querySelector('.t').innerHTML = `${esc(p.n)}<b>${t}</b>`;
      else { s.querySelector('.c').textContent = t; s.classList.toggle('out', p.out && ch[i] < G.min); }
    });
    const h = Math.max(1, G.hand), left = G.rise ? G.rise - ((h - 1) % G.rise) - 1 : 0;
    U.S.querySelector('#smTop .info').innerHTML = `<b>Puntata da ${fmt(G.min)} a ${fmt(G.max)}</b>${G.endHands ? 'mano ' + h + ' di ' + G.endHands : 'mano ' + h + ' · ' + (left > 0 ? 'sale fra ' + left + (left === 1 ? ' mano' : ' mani') : 'sale alla prossima')}`;
  }
  function bankBadge(now) {
    const b = U.S.querySelector('.smBk'), [x, y] = bkXY(U.L, U.bk == null ? U.G.bank : U.bk);
    if (now) b.style.transition = 'none';
    b.style.left = x + 'px'; b.style.top = y + 'px';
    if (now) { void b.offsetWidth; b.style.transition = ''; }
  }
  function updBet(i, v) {
    const b = U.bets[i];
    if (!v) { b.style.opacity = 0; b.dataset.v = 0; return; }
    if (+b.dataset.v !== v) {
      b.dataset.v = v; b.innerHTML = ''; const im = PKART.pileImg(v, Math.round(9 * dprOf()), 2, 6); im.style.width = im.width / dprOf() + 'px'; b.appendChild(im);
      b.insertAdjacentHTML('beforeend', `<span>${fmt(v)}</span>`);
    }
    b.style.opacity = 1;
  }
  function tag(i, cls, txt) { const t = U.seats[i].querySelector('.pkTag'); t.className = 'pkTag ' + (cls || ''); t.innerHTML = txt ? `<span>${txt}</span>` : ''; }
  function msg(a, b, ms) {
    const m = U.S.querySelector('#smMsg'); m.innerHTML = esc(a) + (b ? `<small>${esc(b)}</small>` : ''); m.style.opacity = 1;
    clearTimeout(U.mt); if (ms) U.mt = setTimeout(() => { if (U && U.S) m.style.opacity = 0; }, FAST() ? 5 : ms);
  }
  const hideMsg = () => { clearTimeout(U.mt); U.S.querySelector('#smMsg').style.opacity = 0; };
  function stamp(kind, big, small) {
    const s = U.S.querySelector('#smStamp'); s.className = 'smAb ' + kind; s.querySelector('div').textContent = big; s.querySelector('small').textContent = small || '';
    void s.offsetWidth; s.classList.add('go');
  }
  function say(i, kind, p = 1) {
    const P = U.G.P[i]; if (!P.bot || Math.random() > p) return;
    const list = P.ch.say[kind] || []; if (!list.length) return;
    if (U.say[i]) U.say[i].remove();
    const L = U.L, [sx, sy, side] = L.seats[i], b = document.createElement('div'); b.className = 'pkSay'; b.textContent = '«' + list[Math.floor(Math.random() * list.length)] + '»';
    Object.assign(b.style, side === 'T' ? { left: sx + 34 + 'px', top: sy - 44 + 'px' } : side === 'R' ? { right: L.W - sx - 30 + 'px', top: sy - 96 + 'px' } : { left: sx - 44 + 'px', top: sy - 96 + 'px' });
    U.S.appendChild(b); U.say[i] = b;
    setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.remove(), 350); if (U && U.say[i] === b) U.say[i] = null; }, FAST() ? 10 : 2200);
  }
  // le fiches volano da un posto all'altro
  function fly(amt, from, to) {
    const L = U.L, im = PKART.pileImg(Math.max(1, amt), Math.round(10 * dprOf()), 2, 6), f = document.createElement('div'); f.className = 'pkFly';
    im.style.width = im.width / dprOf() + 'px'; f.appendChild(im); f.style.left = from[0] + 'px'; f.style.top = from[1] + 'px'; U.S.appendChild(f);
    void f.offsetWidth; requestAnimationFrame(() => { f.style.left = to[0] + 'px'; f.style.top = to[1] + 'px'; });
    setTimeout(() => f.remove(), FAST() ? 0 : 680);
  }
  const NAMEOF = i => i === 0 ? 'Tu' : U.G.P[i].n;

  // ---- gli eventi del motore, uno alla volta, con le animazioni ----
  async function flush() { const G = U.G; while (U && U.G === G && U.evi < G.ev.length) await show(G.ev[U.evi++]); }
  async function show(e) {
    const G = U.G, L = U.L;
    if (e.ch) U.dch = e.ch;
    if (e.t === 'hand') {
      clearCards(); hideMsg(); U.bk = e.bk;
      G.P.forEach((p, i) => { tag(i, '', ''); updBet(i, 0); U.seats[i].classList.remove('turn'); });
      bankBadge(); plates();
      if (e.up) { msg('La posta sale', 'Puntata da ' + fmt(e.min) + ' a ' + fmt(e.max), 1700); sfx.chip(); await wait(1200); }
    } else if (e.t === 'deal') {
      for (const [i, c] of e.seq) {
        const o = mkCard(c, i); requestAnimationFrame(() => place(o)); sfx.card(); await wait(130);
      }
      await wait(380);
      const mine = handOf(0); mine.forEach(o => { o.el.classList.add('cov'); front(o); o.el.classList.remove('down'); }); if (mine.length) sfx.flip();
      await wait(300);
      msg(G.bank === 0 ? 'Sei il banco' : 'Guarda la tua carta e punta', G.bank === 0 ? 'Aspetta le puntate' : '', 1600);
    } else if (e.t === 'bet') {
      updBet(e.p, e.amt); plates(); tag(e.p, 'r', 'Punta ' + fmt(e.amt)); sfx.chip(); await wait(170);
    } else if (e.t === 'turn') {
      U.seats.forEach((s, i) => s.classList.toggle('turn', i === e.p));
      G.P.forEach((p, i) => { if (i !== e.p && U.seats[i].querySelector('.pkTag.r')) tag(i, '', ''); });
    } else if (e.t === 'card') {
      const bank = e.p === U.bk, o = mkCard(e.c, e.p);
      requestAnimationFrame(() => handOf(e.p).forEach(x => place(x))); sfx.card();
      if (bank && e.p !== 0) { await wait(650); open(o, true); sfx.flip(); await wait(1000); }
      else { await wait(260); open(o); sfx.flip(); await wait(e.p === 0 ? 260 : 420); }
      if (e.p !== 0 && !bank) { tag(e.p, 'c', 'Carta'); say(e.p, 'c', 0.25); }
    } else if (e.t === 'stand') {
      if (e.p === 0 && e.auto) { stamp('h', 'SETTE E MEZZO!', ''); sfx.half(); await wait(1300); }
      else if (e.p !== 0) { tag(e.p, 'w', 'Sto'); say(e.p, 's', 0.3); await wait(380); }
      else tag(0, 'w', 'Sto');
    } else if (e.t === 'bust') {
      const o = handOf(e.p)[0]; if (e.p !== 0) { open(o); sfx.flip(); } await wait(e.p === 0 ? 120 : 420);
      stamp('b', 'SBALLATO!', e.p === 0 ? '' : G.P[e.p].n); sfx.bust(); say(e.p, 'b', 0.6);
      tag(e.p, 'a', 'Sballato'); handOf(e.p).forEach(x => x.el.classList.add('dim'));
      await wait(900);
      fly(e.amt, betXY(L, e.p), seatXY(L, U.bk)); updBet(e.p, 0); sfx.chip(); await wait(520); plates();
      await wait(350);
    } else if (e.t === 'nobank') {
      msg('Tutti sballati', 'Il banco incassa senza giocare', 1600); await wait(1100);
    } else if (e.t === 'bankopen') {
      U.seats.forEach(s => s.classList.remove('turn'));
      msg(e.p === 0 ? 'Tocca a te, banco' : 'Il banco scopre la sua carta', '', 1500);
      const o = handOf(e.p)[0];
      if (e.p !== 0) { await wait(700); open(o, true); sfx.flip(); await wait(1100); } else await wait(300);
    } else if (e.t === 'show') await showdown(e);
    else if (e.t === 'out') {
      if (e.p !== 0) { tag(e.p, 'f', 'Fuori'); U.seats[e.p].classList.add('gone'); }
      plates(); await wait(400);
    } else if (e.t === 'newbank') {
      U.bk = e.p; bankBadge(); sfx.chip();
      msg(e.p === 0 ? 'Il banco e\' tuo!' : 'Il banco passa a ' + G.P[e.p].n, e.why === 'r' ? 'Ha fatto sette e mezzo reale' : 'Il banco e\' rimasto senza fiches', 2000);
      await wait(1700);
    } else if (e.t === 'reshuffle') { msg('Si rimescola', '', 900); await wait(500); }
  }
  // fine mano: il banco mostra i suoi punti, poi ognuno gira la sua carta coperta e si paga
  async function showdown(e) {
    const G = U.G, L = U.L, b = e.bank;
    U.seats.forEach(s => s.classList.remove('turn'));
    if (!e.res.length) { plates(); return; }
    if (b.bust) { stamp('b', 'SBALLATO!', b.p === 0 ? 'Il banco sei tu' : 'Il banco'); sfx.bust(); say(b.p, 'b', 0.7); tag(b.p, 'a', 'Sballato'); await wait(1500); }
    else {
      tag(b.p, 'w', b.r ? 'Reale' : cap(E.words(b.t)));
      if (b.r) { stamp('r', 'SETTE E MEZZO REALE!', 'Il banco'); sfx.real(); await wait(1500); }
      else if (b.t === 7.5) { stamp('h', 'SETTE E MEZZO!', 'Il banco'); sfx.half(); await wait(1400); }
      else await wait(500);
    }
    let me = null;
    for (const r of e.res) {
      const cs = handOf(r.p);
      if (r.p !== 0 && cs[0] && !cs[0].open) { open(cs[0]); sfx.flip(); await wait(380); }
      tag(r.p, r.win ? 'w' : 'f', r.r ? 'Reale' : cap(E.words(r.t)));
      if (r.r && r.win) { stamp('r', 'SETTE E MEZZO REALE!', NAMEOF(r.p)); sfx.real(); await wait(1500); }
      else if (r.t === 7.5 && r.win) { stamp('h', 'SETTE E MEZZO!', NAMEOF(r.p)); sfx.half(); await wait(1200); }
      if (r.win) { fly(r.amt, seatXY(L, b.p), betXY(L, r.p)); await wait(450); fly(r.amt + G.P[r.p].bet, betXY(L, r.p), seatXY(L, r.p)); }
      else { fly(-r.amt, betXY(L, r.p), seatXY(L, b.p)); cs.forEach(x => x.el.classList.add('dim')); }
      updBet(r.p, 0); sfx.chip();
      if (r.p === 0) me = r; else if (r.win) say(r.p, 'w', 0.3);
      await wait(r.p === 0 ? 650 : 420);
    }
    plates();
    if (me) { msg(me.win ? 'Vinci ' + fmt(me.amt) : 'Perdi ' + fmt(-me.amt), me.win ? (me.r ? 'Pagato doppio' : '') : 'Il banco vince a pari punti o con di piu\'', 1800); if (me.win) sfx.win(); else sfx.lose(); }
    else if (b.p === 0) { const s = e.res.reduce((a, r) => a - r.amt, 0); msg(s >= 0 ? 'Il banco incassa ' + fmt(s) : 'Il banco paga ' + fmt(-s), '', 1800); if (s >= 0) sfx.win(); else sfx.lose(); }
    else if (!b.bust) say(b.p, 'w', 0.4);
    await wait(1300);
  }
  const cap = s => s[0].toUpperCase() + s.slice(1);

  // ---- il giro della partita ----
  async function run() {
    const G = U.G;
    U.busy = true;
    while (U && U.G === G && !G.over) {
      E.startHand(G); await flush(); if (!U || U.G !== G) return;
      for (const i of G.ord) if (G.P[i].bot) { await wait(120 + Math.random() * 160); if (!U || U.G !== G) return; E.bet(G, i, E.botBet(G, i)); await flush(); }
      if (G.ord.includes(0) && G.ph === 'bet') { const a = await ask('bet'); if (!U || U.G !== G) return; E.bet(G, 0, a); await flush(); }
      while (U && U.G === G && (G.ph === 'play' || G.ph === 'bank')) {
        const i = G.turn, p = G.P[i];
        if (p.bot) {
          U.S.querySelector('#smWait').textContent = G.ph === 'bank' ? 'Gioca il banco' : 'Tocca a ' + p.n;
          await wait(G.ph === 'bank' ? 650 + Math.random() * 500 : 420 + Math.random() * 520); if (!U || U.G !== G) return;
          const k = G.ph === 'bank' ? E.bankPlay(G) : E.botPlay(G, i);
          if (k === 's' && G.ph === 'bank') { tag(i, 'w', 'Sto'); say(i, 's', 0.4); await wait(500); }
          E.act(G, i, k);
        } else { const k = await ask('play'); if (!U || U.G !== G) return; E.act(G, 0, k); }
        await flush();
      }
      if (!U || U.G !== G) return;
      U.S.querySelector('#smWait').textContent = '';
      U.skip = false; U.root.classList.remove('pkFast');
      await wait(700);
    }
    if (U && U.G === G) end();
  }
  // i pulsanti: puntata (scelte rapide + cursore + Punta) o Carta / Sto
  function actUI() {
    const a = U.S.querySelector('#smAct'), rg = a.querySelector('input');
    a.querySelector('.main .k').onclick = () => U.res && U.res(U.mode === 'bet' ? U.to : 'c');
    a.querySelector('.main .r').onclick = () => U.res && U.mode === 'play' && U.res('s');
    a.querySelectorAll('.pre button').forEach(b => b.onclick = () => { setTo(preset(b.dataset.p)); a.querySelectorAll('.pre button').forEach(x => x.classList.toggle('on', x === b)); });
    rg.oninput = () => { const G = U.G, mx = E.maxBet(G, 0); setTo(G.min + (mx - G.min) * rg.value / 100, true); a.querySelectorAll('.pre button').forEach(x => x.classList.remove('on')); };
  }
  function preset(k) { const G = U.G, mx = E.maxBet(G, 0); return k === 'min' ? G.min : k === 'd' ? G.min * 2 : k === 'h' ? mx / 2 : mx; }
  function setTo(v, fromSlider) {
    const G = U.G, mx = E.maxBet(G, 0), a = U.S.querySelector('#smAct'), step = G.min;
    v = v >= mx - step / 2 ? mx : Math.round(v / step) * step; v = Math.max(Math.min(G.min, mx), Math.min(mx, v)); U.to = v;
    a.querySelector('.sl .v').textContent = fmt(v);
    a.querySelector('.main .k').textContent = 'Punta ' + fmt(v);
    if (!fromSlider) a.querySelector('input').value = mx > G.min ? Math.round((v - G.min) / (mx - G.min) * 100) : 100;
  }
  function ask(mode) {
    const a = U.S.querySelector('#smAct'); U.mode = mode;
    U.skip = false; U.root.classList.remove('pkFast'); U.busy = false;
    U.seats[0].classList.add('turn'); sfx.turn();
    U.S.querySelector('#smWait').textContent = '';
    a.querySelector('.pre').hidden = a.querySelector('.sl').hidden = mode !== 'bet';
    a.querySelector('.main .r').hidden = mode === 'bet';
    if (mode === 'bet') { a.querySelectorAll('.pre button').forEach(x => x.classList.toggle('on', x.dataset.p === 'min')); setTo(U.G.min); }
    else { a.querySelector('.main .k').textContent = 'Carta'; a.querySelector('.main .r').textContent = 'Sto'; }
    a.hidden = false;
    return new Promise(res => { U.res = v => { U.res = null; a.hidden = true; U.busy = true; U.seats[0].classList.remove('turn'); res(v); }; });
  }

  // ---- fine partita ----
  function end() {
    const G = U.G, me = G.P[0];
    const order = G.P.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.bustAt - a.bustAt : b.chips - a.chips));
    const place = order.indexOf(me) + 1, n = G.P.length, won = place === 1 && !me.out;
    if (won) sfx.win(); else sfx.lose();
    const rec = st().smSt || (st().smSt = [0, 0]); rec[1]++; if (won) rec[0]++; save();
    const rows = order.map((p, k) => `<div class="${p === me ? 'me' : ''}"><b>${k + 1}°</b><span>${esc(p.n)}</span><i>${p.out ? 'fuori alla mano ' + p.bustAt : fmt(p.chips)}</i></div>`).join('');
    const ov = overlay(`<div class="pkBox"><h2>${won ? 'Hai vinto!' : me.out ? 'Sei senza fiches' : 'Partita finita'}</h2><p>${won ? 'Sei tu ad avere piu\' fiches di tutti.' : 'Sei arrivato ' + place + '° su ' + n + '.'} Mani giocate: ${G.hand}.</p><div class="pkRows">${rows}</div>
      <button type="button" class="big pr" data-k="r">Rivincita</button><button type="button" class="big" data-k="s">Cambia le scelte</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelector('[data-k=r]').onclick = () => { ov.remove(); begin(U.o); };
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
    const root = document.createElement('div'); root.id = 'smT'; document.body.appendChild(root);
    U = { root, opt, G: null, skip: false, busy: false, cards: [] };
    // tocco sul tavolo mentre giocano gli altri = animazioni veloci fino al mio turno
    root.addEventListener('pointerdown', e => { if (U && U.busy && U.G && !e.target.closest('button,details,input,.pkOv')) { U.skip = true; root.classList.add('pkFast'); } });
    setup();
  }
  function stop(silent) {
    if (!U) return; const cb = U.opt.onExit; if (U.res) U.res = null;
    U.root.remove(); U = null; if (!silent && cb) cb();
  }
  window.SM = { start, stop, get U() { return U; } };
})();
