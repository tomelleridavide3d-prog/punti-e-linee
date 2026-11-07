// ==== POKER AL TAVOLINO (Texas Hold'em No Limit) ====
// Decisioni dell'utente in CLAUDE.md "POKER: DECISIONI". Carte: CARTE.fr (giochi/lib/carte.js, mazzo francese a 4 colori).
// Tre parti: motore delle regole (PKE, anche in node: require = motore), grafica comune (PKART: fiches, pile, tavolo), schermo (PK.start).
// ==PK ENGINE==
const PKE = (() => {
  // livelli dei bui (piccolo, grande): salgono ogni G.every mani
  const LV = [[10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200], [1000, 2000], [1500, 3000], [2500, 5000], [4000, 8000], [6000, 12000]];
  // carta = numero 0..51: valore (c >> 2) + 2 (2..14, 14 = asso), seme c & 3 ('hdcs')
  const SU = 'hdcs', rk = c => (c >> 2) + 2, su = c => c & 3;
  const P16 = [1048576, 65536, 4096, 256, 16, 1];
  const pack = (cat, ks) => { let v = cat * P16[0]; for (let i = 0; i < ks.length && i < 5; i++) v += ks[i] * P16[i + 1]; return v; };
  const catOf = v => Math.floor(v / P16[0]), kOf = (v, i) => Math.floor(v / P16[i + 1]) % 16;
  const straight = m => { if (m & (1 << 14)) m |= 2; for (let h = 14; h >= 5; h--) { const need = 0x1f << (h - 4); if ((m & need) === need) return h; } return 0; };
  // valore della mano migliore fra 2..7 carte (numero: piu' alto = migliore). Categorie 0 carta alta .. 8 scala colore
  function eval7(cs) {
    const rc = new Array(15).fill(0), sc = [0, 0, 0, 0], sm = [0, 0, 0, 0]; let all = 0;
    for (const c of cs) { const r = rk(c), s = su(c); rc[r]++; sc[s]++; sm[s] |= 1 << r; all |= 1 << r; }
    let fs = -1; for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) { const h = straight(sm[fs]); if (h) return pack(8, [h]); }
    let quad = 0; const trips = [], pairs = [];
    for (let r = 14; r >= 2; r--) { if (rc[r] === 4) quad = r; else if (rc[r] === 3) trips.push(r); else if (rc[r] === 2) pairs.push(r); }
    const kick = (n, ex) => { const k = []; for (let r = 14; r >= 2 && k.length < n; r--) if (rc[r] && !ex.includes(r)) k.push(r); return k; };
    if (quad) return pack(7, [quad, ...kick(1, [quad])]);
    if (trips.length && (trips.length > 1 || pairs.length)) return pack(6, [trips[0], Math.max(trips[1] || 0, pairs[0] || 0)]);
    if (fs >= 0) { const k = []; for (let r = 14; r >= 2 && k.length < 5; r--) if (sm[fs] & (1 << r)) k.push(r); return pack(5, k); }
    const h = straight(all); if (h) return pack(4, [h]);
    if (trips.length) return pack(3, [trips[0], ...kick(2, [trips[0]])]);
    if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], ...kick(1, [pairs[0], pairs[1]])]);
    if (pairs.length) return pack(1, [pairs[0], ...kick(3, [pairs[0]])]);
    return pack(0, kick(5, []));
  }
  // le 5 carte che fanno la mano (per illuminarle allo showdown)
  function best5(cs) {
    if (cs.length <= 5) return { v: eval7(cs), c: cs.slice() };
    let bv = -1, bc = null; const n = cs.length, pick = [];
    const rec = st => { if (pick.length === 5) { const h = pick.map(i => cs[i]), v = eval7(h); if (v > bv) { bv = v; bc = h; } return; } for (let i = st; i <= n - (5 - pick.length); i++) { pick.push(i); rec(i + 1); pick.pop(); } };
    rec(0); return { v: bv, c: bc };
  }
  const NAMES = ['Carta alta', 'Coppia', 'Doppia coppia', 'Tris', 'Scala', 'Colore', 'Full', 'Poker', 'Scala colore'];
  const PL = { 14: 'assi', 13: 're', 12: 'donne', 11: 'fanti', 10: 'dieci', 9: 'nove', 8: 'otto', 7: 'sette', 6: 'sei', 5: 'cinque', 4: 'quattro', 3: 'tre', 2: 'due' };
  const SG = { 14: 'asso', 13: 're', 12: 'donna', 11: 'fante' };
  const al = r => r === 14 ? "all'asso" : r === 13 ? 'al re' : r === 12 ? 'alla donna' : r === 11 ? 'al fante' : r === 8 ? "all'8" : 'al ' + r;
  function describe(v) {
    const c = catOf(v), a = kOf(v, 0), b = kOf(v, 1);
    if (c === 8 && a === 14) return { n: 'Scala reale', d: '', c };
    const d = c === 0 ? (SG[a] || String(a)) : c === 1 || c === 3 || c === 7 ? 'di ' + PL[a] : c === 2 || c === 6 ? PL[a] + ' e ' + PL[b] : al(a);
    return { n: NAMES[c], d, c };
  }
  const mul = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // ---- partita ----
  // o = { players: [{ n, bot, ch }], chips, every (mani per livello dei bui), endHands (0 = fino all'ultimo), seed }
  function newGame(o) {
    const rnd = o.seed != null ? mul(o.seed) : Math.random;
    return {
      rnd, every: o.every || 8, endHands: o.endHands || 0, hand: 0, lvl: 0, dealer: Math.floor(rnd() * o.players.length),
      P: o.players.map((p, i) => ({ i, n: p.n, bot: !!p.bot, ch: p.ch || null, chips: o.chips, hole: [], fold: true, allin: false, bet: 0, tot: 0, acted: false, cap: false, out: false, bust: 0 })),
      board: [], deck: [], street: 0, turn: -1, cur: 0, minR: 0, nr: 0, ph: 'idle', run: false, ev: [], over: false, rank: null,
    };
  }
  const blinds = G => LV[Math.min(G.lvl, LV.length - 1)];
  const alive = p => !p.out, inHand = p => !p.fold, canAct = p => !p.fold && !p.allin;
  const nextIdx = (G, i, f) => { const n = G.P.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (f(G.P[j])) return j; } return -1; };
  const potOf = G => G.P.reduce((s, p) => s + p.tot, 0);
  // ogni evento porta la fotografia di quel momento (fiches, puntate, piatto): lo schermo mostra quella, non lo stato che intanto e' andato avanti
  const evp = (G, e) => { e.ch = G.P.map(p => p.chips); e.bt = G.P.map(p => p.bet); e.pt = G.P.reduce((s, p) => s + p.tot - p.bet, 0); G.ev.push(e); };
  function put(G, p, amt) { amt = Math.max(0, Math.min(amt, p.chips)); p.chips -= amt; p.bet += amt; p.tot += amt; if (p.chips === 0) p.allin = true; return amt; }
  function startHand(G) {
    if (G.over) return;
    const live = G.P.filter(alive);
    if (live.length < 2 || (G.endHands && G.hand >= G.endHands)) { finish(G); return; }
    G.hand++; G.lvl = Math.floor((G.hand - 1) / G.every);
    const [sb, bb] = blinds(G);
    G.dealer = nextIdx(G, G.dealer, alive);
    for (const p of G.P) Object.assign(p, { hole: [], fold: p.out, allin: false, bet: 0, tot: 0, acted: false, cap: false });
    const d = []; for (let c = 0; c < 52; c++) d.push(c);
    for (let i = 51; i > 0; i--) { const j = Math.floor(G.rnd() * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    G.deck = d; G.board = []; G.street = 0; G.run = false; G.nr = 0;
    G.sbP = live.length === 2 ? G.dealer : nextIdx(G, G.dealer, alive); G.bbP = nextIdx(G, G.sbP, alive);   // in due il mazziere mette il buio piccolo
    evp(G, { t: 'hand', hand: G.hand, d: G.dealer, sb, bb, lvl: G.lvl });
    evp(G, { t: 'post', p: G.sbP, amt: put(G, G.P[G.sbP], sb), k: 'sb' });
    evp(G, { t: 'post', p: G.bbP, amt: put(G, G.P[G.bbP], bb), k: 'bb' });
    for (let r = 0; r < 2; r++) { let i = G.sbP; do { G.P[i].hole.push(G.deck.pop()); i = nextIdx(G, i, alive); } while (i !== G.sbP); }
    evp(G, { t: 'deal', from: G.sbP });
    G.cur = bb; G.minR = bb; G.ph = 'bet';
    advance(G, G.bbP, true);
  }
  // dopo ogni mossa: chi tocca, oppure il giro e' finito
  function advance(G, last) {
    if (G.P.filter(inHand).length === 1) { award(G, true); return; }
    const act = G.P.filter(canAct);
    const pend = p => canAct(p) && (!p.acted || p.bet < G.cur);
    const done = act.length === 0 || !act.some(pend) || (act.length === 1 && act[0].bet >= G.cur);
    if (!done) { G.turn = nextIdx(G, last, pend); return; }
    endStreet(G);
  }
  function endStreet(G) {
    if (G.P.some(p => p.bet > 0)) evp(G, { t: 'collect', pot: potOf(G) });
    for (const p of G.P) { p.bet = 0; p.acted = false; p.cap = false; }
    G.cur = 0; G.minR = blinds(G)[1]; G.nr = 0; G.turn = -1;
    if (G.street >= 3) { showdown(G); return; }
    if (!G.run && G.P.filter(canAct).length < 2) {   // tutti all-in (o quasi): carte scoperte e si gira fino in fondo
      G.run = true; evp(G, { t: 'reveal', hands: G.P.filter(inHand).map(p => ({ p: p.i, hole: p.hole.slice() })) });
    }
    G.street++;
    G.deck.pop();   // carta bruciata
    const cs = []; for (let i = 0; i < (G.street === 1 ? 3 : 1); i++) cs.push(G.deck.pop());
    G.board.push(...cs);
    evp(G, { t: 'board', cards: cs, street: G.street, run: G.run });
    if (G.run) { endStreet(G); return; }
    G.turn = nextIdx(G, G.dealer, canAct);
  }
  function showdown(G) {
    const ih = G.P.filter(inHand);
    if (!G.run) evp(G, { t: 'reveal', hands: ih.map(p => ({ p: p.i, hole: p.hole.slice() })) });
    award(G, false);
  }
  // piatto principale e piatti laterali, a pari merito si divide (la fiche in piu' al primo a sinistra del mazziere)
  function award(G, unc) {
    const pots = [], total = potOf(G);
    if (unc) { const w = G.P.find(inHand); w.chips += total; pots.push({ amt: total, win: [w.i], solo: true }); }
    else {
      const ih = G.P.filter(inHand), sc = {}; for (const p of ih) sc[p.i] = eval7(p.hole.concat(G.board));
      const lv = [...new Set(ih.map(p => p.tot))].sort((a, b) => a - b); let prev = 0, given = 0;
      for (const L of lv) {
        let amt = 0; for (const p of G.P) amt += Math.max(0, Math.min(p.tot, L) - prev);
        const el = ih.filter(p => p.tot >= L); prev = L;
        if (amt > 0) pots.push({ amt, el });
      }
      for (const q of pots) given += q.amt;
      if (given < total && pots.length) pots[pots.length - 1].amt += total - given;   // sicurezza: niente fiches perse
      for (const q of pots) {
        const best = Math.max(...q.el.map(p => sc[p.i])), ws = q.el.filter(p => sc[p.i] === best);
        ws.sort((a, b) => ((a.i - G.dealer - 1 + G.P.length) % G.P.length) - ((b.i - G.dealer - 1 + G.P.length) % G.P.length));
        const share = Math.floor(q.amt / ws.length); let rem = q.amt - share * ws.length;
        for (const w of ws) { w.chips += share + (rem > 0 ? 1 : 0); rem--; }
        q.win = ws.map(w => w.i); q.v = best; q.solo = q.el.length === 1;
        const b = best5(ws[0].hole.concat(G.board)); q.best = b.c; q.d = describe(best);
        delete q.el;
      }
    }
    for (const p of G.P) { p.tot = 0; p.bet = 0; }
    evp(G, { t: 'win', pots, unc });
    for (const p of G.P) if (!p.out && p.chips === 0) { p.out = true; p.bust = G.hand; evp(G, { t: 'bust', p: p.i }); }
    G.ph = 'done'; G.turn = -1;
    if (G.P.filter(alive).length < 2) finish(G);
  }
  function finish(G) {
    if (G.over) return;
    G.over = true; G.ph = 'over';
    G.rank = G.P.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.bust - a.bust : b.chips - a.chips)).map(p => p.i);
    evp(G, { t: 'over', rank: G.rank });
  }
  function legal(G, i) {
    const p = G.P[i], toCall = Math.max(0, G.cur - p.bet), call = Math.min(toCall, p.chips), maxTo = p.bet + p.chips;
    const others = G.P.some(q => q !== p && canAct(q));
    return { toCall, call, check: toCall === 0, canR: !p.cap && maxTo > G.cur && others, minTo: Math.min(maxTo, G.cur + G.minR), maxTo, pot: potOf(G), cur: G.cur };
  }
  // a = { k: 'f' passa | 'c' bussa/chiama | 'r' punta/rilancia, to: puntata totale del giro }
  function act(G, i, a) {
    if (G.ph !== 'bet' || G.turn !== i) return false;
    const p = G.P[i], L = legal(G, i); let k = a.k;
    if (k === 'r' && !L.canR) k = 'c';
    if (k === 'f') { p.fold = true; evp(G, { t: 'act', p: i, k: 'f' }); }
    else if (k === 'c') { const amt = put(G, p, L.call); evp(G, { t: 'act', p: i, k: L.check ? 'x' : p.allin ? 'a' : 'c', amt, to: p.bet }); }
    else {
      const to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(a.to || L.minTo))), was = G.cur;
      put(G, p, to - p.bet);
      if (to - was >= G.minR) { G.minR = to - was; for (const q of G.P) if (q !== p && canAct(q)) { q.acted = false; q.cap = false; } }
      else for (const q of G.P) if (q !== p && canAct(q) && q.acted) { q.acted = false; q.cap = true; }   // all-in corto: chi aveva gia' parlato puo' solo chiamare o passare
      G.cur = to; G.nr++;
      evp(G, { t: 'act', p: i, k: p.allin ? 'a' : was === 0 ? 'b' : 'r', amt: to, to });
    }
    p.acted = true;
    advance(G, i);
    return true;
  }

  // ---- computer: forza della mano simulando le carte che non vede (NON guarda le carte degli altri) ----
  function equity(G, i, iters) {
    const me = G.P[i], opp = G.P.filter(q => inHand(q) && q !== me).length;
    if (!opp) return 1;
    const known = new Set(me.hole.concat(G.board)), rest = []; for (let c = 0; c < 52; c++) if (!known.has(c)) rest.push(c);
    const need = 5 - G.board.length, take = need + opp * 2, R = G.rnd; let win = 0;
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < take; k++) { const j = k + Math.floor(R() * (rest.length - k)); const t = rest[k]; rest[k] = rest[j]; rest[j] = t; }
      const bd = G.board.concat(rest.slice(0, need)), mv = eval7(me.hole.concat(bd));
      let best = 0, ties = 0, lost = false;
      for (let o = 0; o < opp; o++) { const v = eval7([rest[need + o * 2], rest[need + o * 2 + 1]].concat(bd)); if (v > mv) { lost = true; break; } if (v === mv) ties++; best = Math.max(best, v); }
      if (!lost) win += 1 / (ties + 1);
    }
    return win / iters;
  }
  // livelli: rumore nella stima, larghezza nel chiamare, quante simulazioni
  const LEVELS = [{ k: 'pr', n: 'Principiante', f: 0 }, { k: 'fa', n: 'Facile', f: 30 }, { k: 'me', n: 'Medio', f: 62 }, { k: 'di', n: 'Difficile', f: 100 }];
  const levelOpts = f => ({ noise: 0.22 - 0.2 * f / 100, loose: 0.15 * (1 - f / 100), iters: Math.round(140 + 260 * f / 100), pos: f / 100 });
  function decide(G, i, o) {
    const p = G.P[i], L = legal(G, i), C = p.ch || { t: 0, a: 0.5, b: 0.2 }, R = G.rnd, bb = blinds(G)[1];
    const opp = G.P.filter(q => inHand(q) && q !== p).length;
    const eq0 = equity(G, i, o.iters), gs = (R() + R() + R() - 1.5) * 0.8;
    const eq = Math.max(0, Math.min(1, eq0 + gs * o.noise)), fair = 1 / (opp + 1), s = (eq - fair) / (1 - fair);
    const late = o.pos * (((i - G.dealer + G.P.length) % G.P.length) === 0 ? 0.06 : 0);   // in posizione (mazziere) un po' piu' coraggio
    const sz = f => {
      let to = L.cur === 0 ? Math.max(bb, L.pot * f) : G.cur + Math.max(G.minR, (L.pot + L.toCall) * f);
      to = Math.round(to / (bb / 2)) * (bb / 2); to = Math.max(L.minTo, Math.min(L.maxTo, to));
      if (to >= L.maxTo * 0.72) to = L.maxTo; return to;
    };
    const stack = p.chips + p.bet;
    if (L.canR && stack <= 10 * bb && s > 0.14 - C.a * 0.1 - late) return { k: 'r', to: L.maxTo };   // pochi gettoni: tutto o niente
    const vt = 0.3 - 0.14 * C.a + 0.1 * C.t - late + (G.nr >= 2 ? 0.25 : 0);
    if (L.canR && s > vt && R() < 0.82 + 0.15 * C.a) return { k: 'r', to: sz(s > 0.62 ? 0.8 + 0.3 * R() : 0.5 + 0.25 * R()) };
    if (L.canR && L.check && G.street > 0 && R() < C.b * 0.3 * (opp <= 2 ? 1 : 0.35)) return { k: 'r', to: sz(0.45 + 0.25 * R()) };   // bluff
    if (L.canR && G.street === 0 && L.toCall <= bb && G.nr === 0 && R() < C.b * 0.14) return { k: 'r', to: sz(0.6) };
    if (L.check) return { k: 'c' };
    const odds = L.call / (L.pot + L.call), need = odds * (1 + 0.3 * C.t) - o.loose - (G.street === 0 && L.toCall <= bb ? 0.05 : 0);
    if (eq >= need) return { k: 'c' };
    if (L.canR && G.nr < 2 && R() < C.b * 0.05) return { k: 'r', to: sz(0.9) };   // bluff a rilancio, raro
    return { k: 'f' };
  }
  return { LV, SU, rk, su, eval7, best5, describe, NAMES, newGame, startHand, legal, act, equity, decide, LEVELS, levelOpts, blinds, potOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PKE;
// ==END PK ENGINE==

// ======== GRAFICA COMUNE: fiches, pile, tavolo ========
if (typeof window !== 'undefined') (() => {
  const TAU = Math.PI * 2, E = 0.5;   // E = schiacciamento delle fiches viste di tre quarti
  const CPU = typeof CQ_CPU !== 'undefined' ? CQ_CPU : { willReadFrequently: true };
  const CHIPS = [[5000, '#e06a1c'], [1000, '#e2a91c'], [500, '#7a46b8'], [100, '#2a2d33'], [25, '#2c9a52'], [10, '#2f6fd0'], [5, '#d03a32']];
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const chipCol = v => (CHIPS.find(c => c[0] === v) || CHIPS[CHIPS.length - 1])[1];
  function chipTop(g, r, col, val) {
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = col; g.fill();
    g.fillStyle = '#fbf7ee';
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, w = 0.3; g.beginPath(); g.arc(0, 0, r, a - w, a + w); g.arc(0, 0, r * 0.74, a + w, a - w, true); g.closePath(); g.fill(); }
    g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fillStyle = shade(col, 1.18); g.fill();
    g.setLineDash([r * 0.16, r * 0.12]); g.beginPath(); g.arc(0, 0, r * 0.55, 0, TAU); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, r * 0.05); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(0, 0, r - 0.5, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    if (val && r >= 14) {
      g.fillStyle = col === '#e2a91c' ? '#3a2408' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = val >= 1000 ? (val / 1000) + 'K' : String(val); g.font = `800 ${Math.round(r * (t.length > 2 ? 0.52 : 0.62))}px system-ui, sans-serif`; g.fillText(t, 0, r * 0.03);
    }
  }
  function chipSide(g, x, y, r, t, col) {
    g.beginPath(); g.ellipse(x, y, r, r * E, 0, 0, Math.PI); g.lineTo(x - r, y - t); g.ellipse(x, y - t, r, r * E, 0, Math.PI, 0, true); g.closePath();
    g.fillStyle = shade(col, 0.82); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#f3eee2';
    for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * Math.PI, w = r * 0.3 * Math.sin(a), cx = x + r * Math.cos(a), yb = y + r * E * Math.sin(a); g.fillRect(cx - w / 2, yb - t + 0.5, w, t - 1); }
  }
  const cache = new Map();
  function stack(cols, r) {
    const key = cols.join() + '_' + r; let c = cache.get(key); if (c) return c;
    const t = Math.max(2, r * 0.24), W = Math.ceil(r * 2 + 4), H = Math.ceil(r * E * 2 + t * cols.length + 4);
    c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    const x = W / 2, yb = H - r * E - 2;
    cols.forEach((col, i) => chipSide(g, x, yb - i * t, r, t, col));
    g.save(); g.translate(x, yb - cols.length * t); g.scale(1, E); chipTop(g, r, cols[cols.length - 1]); g.restore();
    if (cache.size > 300) cache.clear();
    cache.set(key, c); return c;
  }
  function chip(val, r) {
    const key = 'c' + val + '_' + r; let c = cache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2 + 2); const g = c.getContext('2d', CPU);
    g.translate(c.width / 2, c.height / 2); chipTop(g, r, chipCol(val), val); cache.set(key, c); return c;
  }
  function piles(amount, max = 3, per = 8) {
    let left = Math.round(amount); const out = [];
    for (const [v, col] of CHIPS) {
      let n = Math.floor(left / v); if (!n) continue; left -= n * v;
      while (n > 0 && out.length < max) { const k = Math.min(per, n); out.push(Array(k).fill(col)); n -= k; }
      if (out.length >= max) break;
    }
    if (!out.length && amount > 0) out.push([CHIPS[CHIPS.length - 1][1]]);
    return out;
  }
  function pileImg(amount, r, max, per) {
    const ps = piles(amount, max, per); if (!ps.length) return null;
    const ims = ps.map(p => stack(p, r)), gap = r * 1.55, W = Math.ceil(ims[0].width + gap * (ims.length - 1)), H = Math.max(...ims.map(i => i.height));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    ims.forEach((im, i) => g.drawImage(im, i * gap, H - im.height));
    return c;
  }
  function stadium(g, x, y, w, h) { const r = Math.min(w, h) / 2; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function table(cv, vw, vh, T, dpr) {
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const bg = g.createRadialGradient(vw / 2, T.y + T.h * 0.45, 40, vw / 2, T.y + T.h * 0.45, Math.max(vw, vh) * 0.75);
    bg.addColorStop(0, '#4a3220'); bg.addColorStop(0.55, '#2a1b11'); bg.addColorStop(1, '#120b07'); g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
    g.globalAlpha = 0.07; g.fillStyle = '#000'; for (let x = 0; x < vw; x += 34) g.fillRect(x, 0, 1.2, vh); g.globalAlpha = 1;
    const { x, y, w, h } = T, R = T.rail;
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 14; stadium(g, x, y, w, h); g.fillStyle = '#1a0f09'; g.fill(); g.restore();
    stadium(g, x, y, w, h); const lp = g.createLinearGradient(x, y, x + w, y + h); lp.addColorStop(0, '#5a3522'); lp.addColorStop(0.5, '#3a2014'); lp.addColorStop(1, '#24130b'); g.fillStyle = lp; g.fill();
    g.save(); stadium(g, x, y, w, h); g.clip(); g.globalAlpha = 0.18; const hl = g.createRadialGradient(x + w * 0.35, y + h * 0.2, 10, x + w * 0.35, y + h * 0.2, w * 0.9); hl.addColorStop(0, '#fff'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(x, y, w, h); g.restore();
    stadium(g, x + 1.5, y + 1.5, w - 3, h - 3); g.strokeStyle = 'rgba(255,220,180,.18)'; g.lineWidth = 1.5; g.stroke();
    const wx = x + R, wy = y + R, ww = w - 2 * R, wh = h - 2 * R, WB = Math.max(5, R * 0.32);
    stadium(g, wx, wy, ww, wh); const wd = g.createLinearGradient(wx, wy, wx + ww, wy + wh); wd.addColorStop(0, '#c48a4a'); wd.addColorStop(0.5, '#8a5a2c'); wd.addColorStop(1, '#5a3618'); g.fillStyle = wd; g.fill();
    stadium(g, wx, wy, ww, wh); g.strokeStyle = '#2a170b'; g.lineWidth = 1.5; g.stroke();
    const fx = wx + WB, fy = wy + WB, fw = ww - 2 * WB, fh = wh - 2 * WB;
    stadium(g, fx, fy, fw, fh);
    const fl = g.createRadialGradient(fx + fw / 2, fy + fh * 0.45, 20, fx + fw / 2, fy + fh * 0.45, Math.max(fw, fh) * 0.62);
    fl.addColorStop(0, '#2f8d55'); fl.addColorStop(0.55, '#22713f'); fl.addColorStop(1, '#133f25'); g.fillStyle = fl; g.fill();
    g.save(); stadium(g, fx, fy, fw, fh); g.clip();
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let yy = fy; yy < fy + fh; yy += 4) for (let xx = fx + ((yy / 4) % 2) * 2; xx < fx + fw; xx += 4) g.fillRect(xx, yy, 1, 1);
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; stadium(g, fx - 12, fy - 12, fw + 24, fh + 24); g.lineWidth = 24; g.strokeStyle = '#000'; g.stroke();
    g.restore();
    const li = Math.min(fw, fh) * 0.16; stadium(g, fx + li * 0.55, fy + li, fw - li * 1.1, fh - li * 2); g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1.5; g.stroke();
    if (typeof CARTE !== 'undefined' && T.emY) {
      g.globalAlpha = 0.12; const cx = fx + fw / 2, s = 15;
      for (const [su, dx] of [['s', -1.5], ['h', -0.5], ['c', 0.5], ['d', 1.5]]) CARTE.fr.pip(g, su, cx + dx * s * 1.5, T.emY, s, false, true);
      g.globalAlpha = 1;
    }
  }
  window.PKART = { CHIPS, chip, stack, piles, pileImg, table, stadium, fmt, chipCol };
})();

// ======== SCHERMO: PK.start({ name, look, onExit }) ========
if (typeof window !== 'undefined') (() => {
  const E = PKE, A = PKART, fmt = A.fmt, F = () => CARTE.fr;
  // i computer: caratteri diversi (t = prudenza, a = aggressivita', b = voglia di bluffare)
  const CHARS = [
    { n: 'Il Conte', t: 0.15, a: 0.5, b: 0.3, col: '#3a3f49', hat: 'cilindro', say: { r: ['Permettete: rilancio.', 'Un gentiluomo non bussa.'], w: ['Come previsto.', 'La fortuna aiuta i nobili.'], f: ['Questa la lascio a voi.'] } },
    { n: 'Nonna Pina', t: 0.85, a: 0.1, b: 0.05, col: '#8a4fd0', hat: 'basco', say: { r: ['Eh, stavolta ci provo.', 'Ho le carte buone, caro.'], w: ['Ai miei tempi si vinceva cosi\'.', 'Brava nonna!'], f: ['Troppo per me.', 'Passo, che il cuore non regge.'] } },
    { n: 'Rocco', t: -0.2, a: 0.9, b: 0.35, col: '#3b6fe0', hat: 'cappellino', say: { r: ['Vediamo se hai coraggio.', 'Alzo, e tu?', 'Si sale!'], w: ['Facile.', 'Te l\'avevo detto.'], f: ['Questa volta ti va bene.'] } },
    { n: 'Lola', t: -0.1, a: 0.5, b: 0.8, col: '#f07ab8', hat: 'borsalino', say: { r: ['Indovina cos\'ho.', 'Mi sento fortunata.'], w: ['Bluff o no? Non lo saprai mai.', 'Grazie, tesoro.'], f: ['Ti lascio vincere, per stavolta.'] } },
    { n: 'Il Professore', t: 0.35, a: 0.35, b: 0.12, col: '#2fa35a', hat: 'nessuno', say: { r: ['Le probabilita\' sono dalla mia.', 'Statisticamente, rilancio.'], w: ['Matematica pura.'], f: ['I numeri non tornano.'] } },
    { n: 'Zio Tano', t: 0.5, a: 0.6, b: 0.2, col: '#8a5a32', hat: 'borsalino', say: { r: ['Qua comando io.', 'Si fa sul serio.'], w: ['E chi mi ferma?'], f: ['Bah.'] } },
    { n: 'Gigi', t: -0.4, a: 0.3, b: 0.5, col: '#f08a24', hat: 'cuffie', say: { r: ['Andiamo, si balla!', 'Tutto o niente!'], w: ['Evvai!', 'Che botta di fortuna!'], f: ['Noo, carte orribili.'] } },
  ];
  const ALLIN = ['Tutto dentro!', 'All-in, vediamo.', 'Spingo tutto.'];
  const SLOTS = { 1: ['T'], 2: ['UL', 'UR'], 3: ['UL', 'T', 'UR'], 4: ['LL', 'UL', 'UR', 'LR'], 5: ['LL', 'UL', 'T', 'UR', 'LR'], 6: ['LL', 'ML', 'UL', 'UR', 'MR', 'LR'], 7: ['LL', 'ML', 'UL', 'T', 'UR', 'MR', 'LR'] };
  const OPT = {
    op: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7']],
    lv: [['pr', 'Principiante'], ['fa', 'Facile'], ['me', 'Medio'], ['di', 'Difficile'], ['ad', 'Adattivo']],
    ch: [['500', '500'], ['1000', '1.000'], ['1500', '1.500'], ['2000', '2.000']],
    bu: [['5', 'Veloci', 'ogni 5 mani'], ['8', 'Normali', 'ogni 8 mani'], ['12', 'Lenti', 'ogni 12 mani']],
    fi: [['0', 'Fino all\'ultimo'], ['20', 'Dopo 20 mani'], ['40', 'Dopo 40 mani']],
  };
  const DEF = { op: '3', lv: 'me', ch: '1000', bu: '8', fi: '0' };
  let LS = null;
  const st = () => (typeof store !== 'undefined' && store.settings) ? store.settings : (LS || (LS = (() => { try { return JSON.parse(localStorage.getItem('pkS') || '{}'); } catch { return {}; } })()));
  const save = () => { if (typeof store !== 'undefined' && store.settings && typeof saveStore === 'function') saveStore(); else try { localStorage.setItem('pkS', JSON.stringify(st())); } catch { } };
  const ada = () => { const v = st().pkAda; return typeof v === 'number' ? v : 45; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const FAST = () => !!window.__PKFAST;
  const sfx = {
    chip: () => { if (typeof beep === 'function') { beep(2500 + Math.random() * 600, 0.025, 0.016); beep(3300, 0.02, 0.01, 0.035); } },
    card: () => { if (typeof thud === 'function') thud(0.22, 2900); },
    flip: () => { if (typeof thud === 'function') thud(0.3, 2100); },
    fold: () => { if (typeof thud === 'function') thud(0.18, 1800); },
    turn: () => { if (typeof beep === 'function') beep(880, 0.07, 0.02, 0, 'triangle'); },
    win: () => { if (typeof beep === 'function') [523, 659, 784, 1047].forEach((f, i) => beep(f, i === 3 ? 0.4 : 0.12, 0.03, i * 0.11, 'triangle')); },
    lose: () => { if (typeof beep === 'function') [392, 370, 349, 262].forEach((f, i) => beep(f, i === 3 ? 0.45 : 0.16, 0.025, i * 0.16, 'triangle')); },
  };

  const css = document.createElement('style');
  css.textContent = `
#pkT{position:fixed;inset:0;z-index:120;overflow:hidden;background:#120b07;color:#fff;font-family:system-ui,"Segoe UI",Roboto,sans-serif;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#pkT *{box-sizing:border-box}
#pkS{position:absolute;left:0;top:0;transform-origin:0 0}
#pkS>canvas{position:absolute;left:0;top:0}
.pkAb{position:absolute}
#pkTop{left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));display:flex;align-items:center;gap:8px;z-index:60}
#pkTop button{background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:7px 13px;font:600 15px system-ui,sans-serif}
#pkTop .info{flex:1;text-align:center;font:600 13px/1.25 system-ui,sans-serif;opacity:.92}
#pkTop .info b{display:block;font:800 15px system-ui,sans-serif;color:#ffe27a}
.pkSeat{position:absolute;width:0;height:0;z-index:20}
.pkAv{position:absolute;left:-27px;top:-27px;width:54px;height:54px;border-radius:50%;box-shadow:0 0 0 3px #f3e6c4,0 4px 12px rgba(0,0,0,.55);background:#2a3442;overflow:hidden}
.pkAv canvas{width:100%;height:100%;display:block}
.pkSeat.out .pkAv,.pkSeat.out .pkPlate,.pkSeat.fold .pkAv{filter:grayscale(.8) brightness(.6)}
.pkSeat.gone{opacity:.35}
.pkSeat.turn .pkAv,#pkMe.turn .pkAv{box-shadow:0 0 0 3px #ffe27a,0 0 18px 4px rgba(255,214,90,.6)}
.pkRing{position:absolute;left:-33px;top:-33px;width:66px;height:66px;border-radius:50%;border:3px dashed #ffe27a;opacity:0;pointer-events:none}
.pkSeat.turn .pkRing{opacity:1;animation:pkSpin 2.4s linear infinite}
@keyframes pkSpin{to{transform:rotate(360deg)}}
.pkPlate{position:absolute;left:-46px;width:92px;top:25px;background:linear-gradient(#2a1a10,#1a100a);border:1px solid rgba(243,230,196,.35);border-radius:10px;text-align:center;padding:3px 0 4px;box-shadow:0 3px 8px rgba(0,0,0,.5)}
.pkPlate .n{font:700 12.5px system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
.pkPlate .c{font:800 13px system-ui,sans-serif;color:#ffe27a}
.pkTag{position:absolute;left:-46px;width:92px;top:-48px;text-align:center;font:800 12px system-ui,sans-serif;letter-spacing:.3px;transition:opacity .25s}
.pkTag span{background:rgba(0,0,0,.6);padding:3px 8px;border-radius:9px;white-space:nowrap}
.pkTag.f span{color:#c9c4b6}.pkTag.r span{color:#ffb36b}.pkTag.c span{color:#9ee6a8}.pkTag.a span{color:#ff7a7a}.pkTag.w span{color:#ffe27a}
.pkBet{position:absolute;z-index:15;display:flex;flex-direction:column;align-items:center;gap:1px;transform:translate(-50%,-50%);transition:left .4s cubic-bezier(.3,.7,.3,1),top .4s cubic-bezier(.3,.7,.3,1),opacity .3s;pointer-events:none}
.pkBet span{font:800 12px system-ui,sans-serif;background:rgba(0,0,0,.5);padding:1px 6px;border-radius:7px}
.pkBet.nt{transition:none}
.pkDb{position:absolute;z-index:16;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#e8e2d2);color:#2b1b12;font:900 13px/24px system-ui,sans-serif;text-align:center;box-shadow:0 2px 5px rgba(0,0,0,.5),inset 0 0 0 2px #c9b98f;transform:translate(-50%,-50%);transition:left .5s,top .5s}
.pkC{position:absolute;left:0;top:0;z-index:12;transition:transform .45s cubic-bezier(.2,.75,.25,1),opacity .35s,filter .3s;will-change:transform;pointer-events:none}
.pkC .in{position:absolute;inset:0;transition:transform .4s ease;transform-style:preserve-3d}
.pkC.down .in{transform:rotateY(180deg)}
.pkC.slow .in{transition-duration:1.05s}
.pkC img{position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:7%/5%;box-shadow:0 3px 8px rgba(0,0,0,.45)}
.pkC img.b{transform:rotateY(180deg)}
.pkC.win img.f{box-shadow:0 0 0 3px #ffe27a,0 0 16px 3px rgba(255,214,90,.75)}
.pkC.dim{filter:brightness(.5)}
.pkC.mine{z-index:25}
.pkSlot{position:absolute;z-index:9;border:2px dashed rgba(255,255,255,.16);border-radius:7%/5%}
#pkPot{z-index:13;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;transition:opacity .3s}
#pkPot span{font:800 14px system-ui,sans-serif;background:rgba(0,0,0,.45);padding:3px 10px;border-radius:10px;white-space:nowrap}
#pkPot span b{color:#ffe27a}
.pkFly{position:absolute;z-index:45;transform:translate(-50%,-50%);transition:left .6s cubic-bezier(.3,.6,.2,1),top .6s cubic-bezier(.3,.6,.2,1);pointer-events:none}
.pkSay{position:absolute;z-index:35;background:#fdf8ec;color:#2b1b12;font:600 13px/1.25 system-ui,sans-serif;padding:6px 10px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.4);max-width:128px;transition:opacity .3s;pointer-events:none}
#pkHand{z-index:26;transform:translateX(-50%);font:800 14px system-ui,sans-serif;background:rgba(20,12,7,.85);border:1px solid rgba(255,226,122,.55);color:#ffe27a;padding:5px 13px;border-radius:12px;white-space:nowrap;transition:opacity .3s}
#pkHand small{color:#fff;font-weight:600;opacity:.85}
#pkMe{z-index:26;display:flex;align-items:center;gap:8px}
#pkMe .pkAv{position:relative;left:0;top:0;width:46px;height:46px}
#pkMe .t{font:700 13px/1.2 system-ui,sans-serif}#pkMe .t b{display:block;font:800 15px system-ui,sans-serif;color:#ffe27a}
#pkMsg{left:50%;z-index:40;transform:translate(-50%,-50%);text-align:center;background:rgba(14,8,4,.86);border:1px solid rgba(255,226,122,.5);border-radius:14px;padding:8px 16px;font:800 16px/1.3 system-ui,sans-serif;white-space:nowrap;pointer-events:none;transition:opacity .3s}
#pkMsg small{display:block;font:600 13px system-ui,sans-serif;color:#ffe27a}
#pkAct{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:40}
#pkAct .pre{display:flex;gap:6px;margin-bottom:7px}
#pkAct .pre button{flex:1;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.4);color:#fff;border-radius:10px;padding:7px 0;font:700 13px system-ui,sans-serif}
#pkAct .pre button.on{background:rgba(242,194,48,.25);border-color:#f2c230;color:#ffe27a}
#pkAct .sl{display:flex;align-items:center;gap:10px;margin-bottom:8px}
#pkAct input[type=range]{flex:1;accent-color:#f2c230;height:28px}
#pkAct .sl .v{min-width:74px;text-align:right;font:800 16px system-ui,sans-serif;color:#ffe27a}
#pkAct .main{display:flex;gap:8px}
#pkAct .main button{flex:1;border:0;border-radius:14px;padding:14px 0 13px;font:800 16px system-ui,sans-serif;color:#fff}
#pkAct .f{background:linear-gradient(#7b4a3a,#5c3326);box-shadow:0 3px 0 #3a1f16}
#pkAct .k{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231}
#pkAct .r{background:linear-gradient(#f2c230,#d39b17);color:#3a2408!important;box-shadow:0 3px 0 #8f6609}
#pkAct .hide{visibility:hidden}
#pkWait{left:10px;right:10px;bottom:calc(30px + env(safe-area-inset-bottom));z-index:39;text-align:center;font:700 15px system-ui,sans-serif;opacity:.85}
#pkT.pkFast .pkC,#pkT.pkFast .pkC .in,#pkT.pkFast .pkBet,#pkT.pkFast .pkFly,#pkT.pkFast .pkDb{transition-duration:.08s!important}
.pkBox{background:linear-gradient(#2a1a10,#1a100a);color:#fff;border:2px solid #6a4a2a;border-radius:18px;padding:18px 16px 16px;max-width:380px;width:100%;box-shadow:0 14px 44px rgba(0,0,0,.6);max-height:calc(100% - 20px);overflow:auto}
.pkBox h2{margin:0 0 4px;font:900 24px system-ui,sans-serif;text-align:center;color:#ffe27a}
.pkBox p{margin:4px 0 10px;font:500 14px/1.35 system-ui,sans-serif;text-align:center;opacity:.85}
.pkBox button.big{display:block;width:100%;margin-top:10px;border:0;border-radius:13px;padding:13px;font:800 17px system-ui,sans-serif;background:#4a3020;color:#fff}
.pkBox button.big.pr{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231}
.pkOv{position:absolute;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:12px}
.pkD{margin:7px 0;border:2px solid #6a4a2a;border-radius:11px;background:rgba(0,0,0,.18);overflow:hidden}
.pkD[open]{border-color:#c99a44}
.pkD summary{list-style:none;display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;font-size:14px}
.pkD summary::-webkit-details-marker{display:none}
.pkD summary span{color:#c9b48a;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.05em;flex:none}
.pkD summary b{flex:1;text-align:right;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pkD summary::after{content:'\\25BE';color:#c9b48a;font-size:14px;transition:transform .2s}.pkD[open] summary::after{transform:rotate(180deg)}
.pkD .opts{display:flex;flex-wrap:wrap;gap:5px;margin:0 10px 10px}
.pkD .opts button{padding:7px 10px;border-radius:9px;border:2px solid #6a4a2a;background:#4a3020;color:#fff;font:700 13px system-ui,sans-serif}
.pkD .opts button.on{border-color:#e0b84a;background:#3e8a4a}
.pkD .opts small{opacity:.75;font-weight:600}
.pkNote{font:500 12px/1.35 system-ui,sans-serif;opacity:.75;margin:4px 2px 0;text-align:left}
.pkRows{margin:8px 0 2px}
.pkRows div{display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:5px;font:600 14px system-ui,sans-serif}
.pkRows div.me{background:rgba(242,194,48,.18);border:1px solid rgba(242,194,48,.5)}
.pkRows b{min-width:26px;color:#ffe27a;font-weight:900}
.pkRows span{flex:1}.pkRows i{font-style:normal;color:#ffe27a;font-weight:800}
.pkHT div{display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.08)}
.pkHT .nm{flex:1;font:800 14px system-ui,sans-serif}.pkHT .nm small{display:block;font:500 11.5px/1.3 system-ui,sans-serif;opacity:.75}
.pkHT .cs{display:flex;gap:2px}.pkHT img{width:26px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.5)}
`;
  document.head.appendChild(css);

  let U = null;   // la partita aperta
  const wait = ms => new Promise(r => setTimeout(r, FAST() || (U && U.skip) ? 0 : ms));
  const dprOf = () => Math.min(3, window.devicePixelRatio || 1);
  // ritratto: il personaggio dell'hotel (cqPlayer) se c'e', altrimenti un omino semplice
  function portrait(look) {
    const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
    const q = g.createLinearGradient(0, 0, 0, 120); q.addColorStop(0, '#3a4a5c'); q.addColorStop(1, '#1d2633'); g.fillStyle = q; g.fillRect(0, 0, 120, 120);
    if (typeof cqPlayer === 'function' && look) { try { cqPlayer(g, 60, 116, 66, look, 0, 1, true); return c; } catch (e) { } }
    const col = (look && look.col) || '#c8102e';
    g.fillStyle = col; g.beginPath(); g.ellipse(60, 124, 44, 34, 0, 0, 7); g.fill();
    g.fillStyle = '#f3c9a0'; g.beginPath(); g.arc(60, 62, 24, 0, 7); g.fill();
    g.fillStyle = '#2b1b12'; g.beginPath(); g.arc(51, 62, 2.8, 0, 7); g.arc(69, 62, 2.8, 0, 7); g.fill();
    g.strokeStyle = '#9a3a2a'; g.lineWidth = 2.2; g.beginPath(); g.arc(60, 70, 6.5, 0.2, Math.PI - 0.2); g.stroke();
    if (look && look.hat && look.hat !== 'nessuno') { g.fillStyle = '#2a2d33'; g.beginPath(); g.ellipse(60, 42, 35, 7.5, 0, 0, 7); g.fill(); g.fillRect(40, 20, 40, 23); }
    return c;
  }

  // ---- scelte prima della partita (tendine come gli scacchi, niente emoji) ----
  function tendina(name, title, items, def, note) {
    const cur = items.find(x => x[0] === def) || items[0];
    return `<details class="pkD" data-n="${name}"><summary><span>${title}</span><b>${cur[1]}${cur[2] ? ' <small>' + cur[2] + '</small>' : ''}</b></summary><div class="opts">`
      + items.map(([v, t, s]) => `<button type="button" data-v="${v}"${v === cur[0] ? ' class="on"' : ''}>${t}${s ? ' <small>' + s + '</small>' : ''}</button>`).join('') + `</div>${note || ''}</details>`;
  }
  function setup() {
    const sv = Object.assign({}, DEF, st().pkOpt || {}), rec = st().pkSt || {};
    const lv = OPT.lv.map(([k, n]) => [k, n, rec[k] ? rec[k][0] + ' vinte su ' + rec[k][1] : '']);
    const ov = overlay(`<div class="pkBox"><h2>Poker</h2><p>Texas Hold'em senza limite, con le fiches finte della partita.</p>`
      + tendina('op', 'Avversari', OPT.op, sv.op)
      + tendina('lv', 'Livello', lv, sv.lv, `<p class="pkNote" style="margin:0 12px 10px">Adattivo: i computer diventano piu' forti quando vinci e piu' deboli quando perdi (adesso forza <b>${Math.round(ada())}</b> su 100).</p>`)
      + tendina('ch', 'Fiches a testa', OPT.ch, sv.ch)
      + tendina('bu', 'Bui', OPT.bu, sv.bu)
      + tendina('fi', 'Fine partita', OPT.fi, sv.fi)
      + `<p class="pkNote">Si parte con i bui 10 / 20. Ogni computer ha il suo carattere: c'e' chi rischia, chi bluffa e chi aspetta le carte buone.</p>`
      + `<button type="button" class="big pr" data-k="go">Gioca</button><button type="button" class="big" data-k="x">Esci</button></div>`);
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
      st().pkOpt = o; save(); ov.remove(); begin(o);
    };
    ov.querySelector('[data-k=x]').onclick = stop;
  }
  function overlay(html) { const d = document.createElement('div'); d.className = 'pkOv'; d.innerHTML = html; U.root.appendChild(d); return d; }

  // ---- inizio partita ----
  function begin(o) {
    U.o = o;
    const n = +o.op, pool = CHARS.slice(1).sort(() => Math.random() - 0.5), bots = [CHARS[0], ...pool].slice(0, n).sort(() => Math.random() - 0.5);
    const G = E.newGame({ players: [{ n: U.opt.name || 'Tu' }, ...bots.map(c => ({ n: c.n, bot: 1, ch: c }))], chips: +o.ch, every: +o.bu, endHands: +o.fi });
    U.G = G; U.evi = 0; U.out = new Set(); U.fold = new Set(); U.board = []; U.dch = null; U.dealt = false; U.lvO = E.levelOpts(o.lv === 'ad' ? ada() : (E.LEVELS.find(l => l.k === o.lv) || E.LEVELS[2]).f);
    build();
    run();
  }
  // disposizione: misura logica (almeno 380 di larghezza e quanto serve in altezza), rimpicciolita sui telefoni piccoli
  function lay() {
    const G = U.G, n = G.P.length - 1, sl = SLOTS[n], mid = sl.includes('ML');
    const vw0 = U.root.clientWidth || innerWidth, vh0 = U.root.clientHeight || innerHeight, kw = Math.min(1, vw0 / 380), W0 = vw0 / kw;
    const cw = Math.min(64, (W0 - 70) / 5.35), ch = cw * 1.4, mw = Math.min(96, W0 * 0.25), mh = mw * 1.4;
    const Ty = 84; let topSy = Ty + 20, upSy = topSy + 110, cy = upSy + 79 + ch / 2, midSy = cy + ch / 2 + 58, lowSy = mid ? midSy + 112 : cy + ch / 2 + 58;
    const need = lowSy + 108 + mh + 14 + 150;
    const k = Math.min(kw, vh0 / need), W = vw0 / k, H = vh0 / k, e = H - need;
    topSy += e * 0.03; upSy += e * 0.1; cy += e * 0.25; midSy += e * 0.38; lowSy += e * (mid ? 0.5 : 0.42);
    const myTop = H - 164 - mh, mx = W / 2 + 18;
    const pos = { T: [W / 2, topSy, 'T'], UL: [50, upSy, 'L'], UR: [W - 50, upSy, 'R'], ML: [50, midSy, 'L'], MR: [W - 50, midSy, 'R'], LL: [50, lowSy, 'L'], LR: [W - 50, lowSy, 'R'] };
    const seats = [null, ...sl.map(s => pos[s])];
    const gap = cw * 0.12, x0 = W / 2 - (5 * cw + 4 * gap) / 2;
    return { k, W, H, cw, ch, mw, mh, cy, myTop, mx, seats, x0, gap, lowSy, T: { x: 10, y: Ty, w: W - 20, h: lowSy + 44 - Ty, rail: 20, emY: Math.min(cy + ch / 2 + 82, lowSy - 10) } };
  }
  // dove stanno le cose (centri, in misura logica)
  const boardXY = (L, i) => [L.x0 + i * (L.cw + L.gap) + L.cw / 2, L.cy];
  function betXY(L, i) {
    if (i === 0) return [L.W / 2, L.myTop - 64];
    const [sx, sy, side] = L.seats[i];
    return side === 'T' ? [sx, sy + 86] : [sx + (side === 'R' ? -70 : 70), sy + 2];
  }
  function dbXY(L, i) {
    if (i === 0) return [L.W / 2 + 70, L.myTop - 64];
    const [sx, sy, side] = L.seats[i];
    return side === 'T' ? [sx + 62, sy + 40] : [sx + (side === 'R' ? -40 : 40), sy + 38];
  }
  const potXY = L => [L.W / 2, L.cy + L.ch / 2 + 10];
  const seatXY = (L, i) => i === 0 ? [36, L.myTop + L.mh * 0.32 + 23] : [L.seats[i][0], L.seats[i][1]];
  const dealXY = L => [L.W / 2, L.cy - L.ch * 0.9];
  // carte coperte/scoperte dei giocatori: [x, y, larghezza, rotazione]
  function holeXY(L, i, j, open) {
    if (i === 0) return [L.mx - L.mw + j * L.mw * 0.62 + L.mw / 2, L.myTop + L.mh / 2 + (j ? 4 : 0), L.mw, j ? 7 : -7];
    const [sx, sy, side] = L.seats[i];
    if (open) return [sx - 19 + j * 38, sy - 4, 36, j ? 5 : -5];
    const off = side === 'T' ? 22 : side === 'R' ? 14 : -46;
    return [sx + off + 12 + j * 9, sy - 13, 24, j ? 6 : -8];
  }

  function build() {
    const R = U.root, G = U.G;
    R.querySelectorAll('#pkS').forEach(e => e.remove());
    const S = document.createElement('div'); S.id = 'pkS'; R.prepend(S); U.S = S;
    S.innerHTML = `<canvas></canvas>
      <div class="pkAb" id="pkTop"><button type="button" data-k="x">Esci</button><div class="info"></div><button type="button" data-k="h">Mani</button></div>
      <div class="pkAb" id="pkPot" style="opacity:0"></div><div class="pkAb" id="pkHand" style="opacity:0"></div><div class="pkAb" id="pkMsg" style="opacity:0"></div>
      <div class="pkAb" id="pkMe"><div class="pkAv"></div><div class="t"></div></div>
      <div class="pkAb" id="pkWait"></div>
      <div class="pkAb" id="pkAct" hidden><div class="pre"><button type="button" data-p="min">Min</button><button type="button" data-p="h">1/2 piatto</button><button type="button" data-p="p">Piatto</button><button type="button" data-p="a">All-in</button></div>
        <div class="sl"><input type="range" min="0" max="100" value="0"><div class="v"></div></div>
        <div class="main"><button type="button" class="f">Passa</button><button type="button" class="k">Bussa</button><button type="button" class="r">Punta</button></div></div>
      <div class="pkDb">D</div>`;
    S.querySelector('#pkTop [data-k=x]').onclick = askExit;
    S.querySelector('#pkTop [data-k=h]').onclick = handTable;
    U.seats = G.P.map((p, i) => {
      if (i === 0) { S.querySelector('#pkMe .pkAv').appendChild(portrait(U.opt.look || { col: '#c8102e', hat: 'borsalino' })); return S.querySelector('#pkMe'); }
      const s = document.createElement('div'); s.className = 'pkSeat';
      s.innerHTML = `<div class="pkRing"></div><div class="pkAv"></div><div class="pkPlate"><div class="n">${esc(p.n)}</div><div class="c"></div></div><div class="pkTag"></div>`;
      s.querySelector('.pkAv').appendChild(portrait({ skin: 'omino', col: p.ch.col, hat: p.ch.hat })); S.appendChild(s); return s;
    });
    U.bets = G.P.map(() => { const b = document.createElement('div'); b.className = 'pkBet'; b.style.opacity = 0; S.appendChild(b); return b; });
    U.slots = [0, 1, 2, 3, 4].map(() => { const d = document.createElement('div'); d.className = 'pkSlot'; S.appendChild(d); return d; });
    U.cards = [];   // { el, c, pl: ['b', i] | ['h', p, j], open }
    U.say = G.P.map(() => null);
    actUI();
    layout(true);
  }
  // ridisegna il tavolo e rimette ogni cosa al suo posto (all'inizio e quando cambia la misura dello schermo)
  function layout(first) {
    const L = U.L = lay(), S = U.S, dpr = dprOf();
    Object.assign(S.style, { width: L.W + 'px', height: L.H + 'px', transform: L.k < 1 ? `scale(${L.k})` : '' });
    A.table(S.querySelector('canvas'), L.W, L.H, L.T, dpr * L.k);
    U.G.P.forEach((p, i) => {
      const [x, y] = seatXY(L, i), s = U.seats[i];
      if (i === 0) Object.assign(s.style, { left: '14px', top: L.myTop + L.mh * 0.32 + 'px' });
      else Object.assign(s.style, { left: x + 'px', top: y + 'px' });
      const [bx, by] = betXY(L, i); U.bets[i].classList.add('nt'); Object.assign(U.bets[i].style, { left: bx + 'px', top: by + 'px' }); void U.bets[i].offsetWidth; U.bets[i].classList.remove('nt');
    });
    U.slots.forEach((d, i) => { const [x, y] = boardXY(L, i); Object.assign(d.style, { left: x - L.cw / 2 + 'px', top: y - L.ch / 2 + 'px', width: L.cw + 'px', height: L.ch + 'px' }); });
    const [px, py] = potXY(L); Object.assign(S.querySelector('#pkPot').style, { left: px + 'px', top: py + 'px' });
    Object.assign(S.querySelector('#pkHand').style, { left: L.mx - L.mw * 0.19 + 'px', top: L.myTop - 36 + 'px' });
    Object.assign(S.querySelector('#pkMsg').style, { top: L.cy - L.ch / 2 - 34 + 'px' });
    if (U.G.ph !== 'idle') dealerBtn();
    for (const c of U.cards) place(c, true);
    plates();
  }
  addEventListener('resize', () => { if (U && U.S && U.G) { clearTimeout(U.rz); U.rz = setTimeout(() => U && U.S && layout(), 120); } });

  // ---- carte ----
  const cardSrc = (c, w, j) => F().url(E.SU[E.su(c)], E.rk(c), w * dprOf() * (U.L ? U.L.k : 1), { j });
  function mkCard(c, pl, w) {
    const el = document.createElement('div'); el.className = 'pkC down';
    el.innerHTML = `<div class="in"><img class="f" alt=""><img class="b" alt=""></div>`;
    el.querySelector('img.b').src = F().url('s', 0, w * dprOf() * U.L.k);
    const o = { el, c, pl, open: false, w: 0 };
    if (pl[0] === 'h' && pl[1] === 0) el.classList.add('mine');
    U.S.appendChild(el); U.cards.push(o);
    const [x, y] = dealXY(U.L); setT(o, x, y, w, 0, 0.4); void el.offsetWidth;
    return o;
  }
  function setT(o, x, y, w, r, sc = 1) {
    if (o.w !== w) { o.w = w; o.el.style.width = w + 'px'; o.el.style.height = w * 1.4 + 'px'; }
    o.el.style.transform = `translate(${x - w / 2}px,${y - w * 0.7}px) rotate(${r || 0}deg) scale(${sc})`;
  }
  function front(o, j) { const im = o.el.querySelector('img.f'), w = o.w || 40, key = o.c + (j ? 'j' : '') + w; if (im.dataset.k !== key) { im.src = cardSrc(o.c, w, j); im.dataset.k = key; } }
  function place(o, now) {
    const L = U.L; if (now) o.el.style.transition = 'none';
    if (o.pl[0] === 'b') { const [x, y] = boardXY(L, o.pl[1]); setT(o, x, y, L.cw, 0); }
    else { const [x, y, w, r] = holeXY(L, o.pl[1], o.pl[2], o.open); setT(o, x, y, w, r); if (o.open || o.pl[1] === 0) front(o, o.pl[1] !== 0); }
    if (o.pl[0] === 'b') front(o, false);
    if (now) { void o.el.offsetWidth; o.el.style.transition = ''; }
  }
  function clearCards() { for (const o of U.cards) o.el.remove(); U.cards = []; }

  // ---- numeri sul tavolo ----
  function plates() {
    const G = U.G;
    G.P.forEach((p, i) => {
      const s = U.seats[i];
      const out = U.out.has(i), c = U.dch ? U.dch[i] : p.chips, t = out ? 'Fuori' : c === 0 ? 'All-in' : fmt(c);
      if (i === 0) s.querySelector('.t').innerHTML = `${esc(p.n)}<b>${t}</b>`;
      else { s.querySelector('.c').textContent = t; s.classList.toggle('out', out); s.classList.toggle('fold', !out && U.fold.has(i)); }
    });
    const [sb, bb] = E.blinds(G), left = G.every - ((G.hand - 1) % G.every) - 1;
    U.S.querySelector('#pkTop .info').innerHTML = `<b>Bui ${fmt(sb)} / ${fmt(bb)}</b>${G.endHands ? 'mano ' + G.hand + ' di ' + G.endHands + ' · ' : 'mano ' + G.hand + ' · '}${left > 0 ? 'salgono fra ' + left + (left === 1 ? ' mano' : ' mani') : 'salgono alla prossima'}`;
  }
  function updBet(i, v) {
    const b = U.bets[i];
    if (!v) { b.style.opacity = 0; b.dataset.v = 0; return; }
    if (+b.dataset.v !== v) {
      b.dataset.v = v; b.innerHTML = ''; const im = A.pileImg(v, Math.round(9 * dprOf()), 2, 6); im.style.width = im.width / dprOf() + 'px'; b.appendChild(im);
      b.insertAdjacentHTML('beforeend', `<span>${fmt(v)}</span>`);
    }
    b.style.opacity = 1;
  }
  function updPot(v) {
    const pot = U.S.querySelector('#pkPot');
    if (!v) { pot.style.opacity = 0; pot.dataset.v = 0; return; }
    if (+pot.dataset.v !== v) { pot.dataset.v = v; pot.innerHTML = ''; const im = A.pileImg(v, Math.round(11 * dprOf()), 3, 7); im.style.width = im.width / dprOf() + 'px'; pot.appendChild(im); pot.insertAdjacentHTML('beforeend', `<span>Piatto <b>${fmt(v)}</b></span>`); }
    pot.style.opacity = 1;
  }
  function tag(i, cls, txt) {
    if (i === 0) return; const t = U.seats[i].querySelector('.pkTag');
    t.className = 'pkTag ' + (cls || ''); t.innerHTML = txt ? `<span>${txt}</span>` : '';
  }
  function dealerBtn() { const [x, y] = dbXY(U.L, U.G.dealer), d = U.S.querySelector('.pkDb'); d.style.left = x + 'px'; d.style.top = y + 'px'; }
  function myHand() {
    const me = U.G.P[0], h = U.S.querySelector('#pkHand');
    if (!U.dealt || U.fold.has(0) || U.out.has(0)) { h.style.opacity = 0; return; }
    const d = E.describe(E.eval7(me.hole.concat(U.board)));
    h.innerHTML = `${d.n}${d.d ? ' <small>' + d.d + '</small>' : ''}`; h.style.opacity = 1;
  }
  function msg(a, b, ms) {
    const m = U.S.querySelector('#pkMsg'); m.innerHTML = esc(a) + (b ? `<small>${esc(b)}</small>` : ''); m.style.opacity = 1;
    clearTimeout(U.mt); if (ms) U.mt = setTimeout(() => { if (U && U.S) m.style.opacity = 0; }, ms);
  }
  function say(i, kind, p = 1) {
    const G = U.G, P = G.P[i]; if (!P.bot || Math.random() > p) return;
    const list = kind === 'a' ? ALLIN : (P.ch.say[kind] || []); if (!list.length) return;
    if (U.say[i]) U.say[i].remove();
    const L = U.L, [sx, sy, side] = L.seats[i], b = document.createElement('div'); b.className = 'pkSay'; b.textContent = '«' + list[Math.floor(Math.random() * list.length)] + '»';
    Object.assign(b.style, side === 'T' ? { left: sx + 34 + 'px', top: sy - 6 + 'px' } : side === 'R' ? { right: L.W - sx - 30 + 'px', top: sy - 96 + 'px' } : { left: sx - 44 + 'px', top: sy - 96 + 'px' });
    U.S.appendChild(b); U.say[i] = b;
    setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.remove(), 350); if (U && U.say[i] === b) U.say[i] = null; }, FAST() ? 10 : 2400);
  }

  // ---- gli eventi del motore, uno alla volta, con le animazioni ----
  async function flush() {
    const G = U.G;
    while (U && U.G === G && U.evi < G.ev.length) { const e = G.ev[U.evi++]; await show(e); }
  }
  async function show(e) {
    const G = U.G, L = U.L;
    if (e.ch) U.dch = e.ch;
    if (e.t === 'hand') {
      clearCards(); U.S.querySelector('#pkMsg').style.opacity = 0;
      U.board = []; U.fold = new Set(); U.dealt = false;
      G.P.forEach((p, i) => { tag(i, '', ''); updBet(i, 0); U.seats[i].classList.remove('turn'); }); updPot(0);
      dealerBtn(); plates(); myHand();
      if (e.lvl > 0 && (e.hand - 1) % G.every === 0) { msg('I bui salgono', fmt(e.sb) + ' / ' + fmt(e.bb), 1600); await wait(900); }
    } else if (e.t === 'post') {
      updBet(e.p, e.bt[e.p]); plates(); tag(e.p, '', e.k === 'sb' ? 'Buio piccolo' : 'Buio grande'); sfx.chip(); await wait(220);
    } else if (e.t === 'deal') {
      for (let r = 0; r < 2; r++) {
        let i = e.from;
        do {
          const p = G.P[i];
          if (!p.out) {
            const w = holeXY(L, i, r, false)[2], o = mkCard(p.hole[r], ['h', i, r], w);
            requestAnimationFrame(() => place(o)); sfx.card(); await wait(110);
          }
          i = (i + 1) % G.P.length;
        } while (i !== e.from);
      }
      await wait(420);
      const mine = U.cards.filter(o => o.pl[1] === 0); mine.forEach(o => { front(o); o.el.classList.remove('down'); }); if (mine.length) sfx.flip();
      await wait(380); U.dealt = true; myHand();
    } else if (e.t === 'act') {
      if (e.k === 'f') U.fold.add(e.p);
      updBet(e.p, e.bt[e.p]); plates();
      const TX = { f: ['f', 'Passa'], x: ['c', 'Bussa'], c: ['c', 'Chiama'], b: ['r', 'Punta ' + fmt(e.amt)], r: ['r', 'Rilancia a ' + fmt(e.amt)], a: ['a', 'All-in'] }[e.k];
      tag(e.p, TX[0], TX[1]);
      if (e.k === 'f') {
        sfx.fold();
        for (const o of U.cards.filter(o => o.pl[0] === 'h' && o.pl[1] === e.p)) {
          if (e.p === 0) o.el.classList.add('dim');
          else { const [x, y] = dealXY(L); setT(o, x, y, o.w, 0, 0.5); o.el.style.opacity = 0; }
        }
        if (e.p === 0) U.S.querySelector('#pkHand').style.opacity = 0;
        say(e.p, 'f', 0.12);
      } else {
        if (e.amt) sfx.chip();
        if (e.k === 'a') say(e.p, 'a', 0.5); else if (e.k === 'b' || e.k === 'r') say(e.p, 'r', 0.3);
      }
      U.seats.forEach(s => s.classList.remove('turn'));
      await wait(e.p === 0 ? 150 : 380);
    } else if (e.t === 'collect') {
      const [px, py] = potXY(L);
      let any = false;
      G.P.forEach((p, i) => { const b = U.bets[i]; if (+b.dataset.v) { any = true; b.style.left = px + 'px'; b.style.top = py + 14 + 'px'; } });
      if (any) { sfx.chip(); await wait(430); }
      G.P.forEach((p, i) => { const b = U.bets[i]; b.classList.add('nt'); b.style.opacity = 0; b.dataset.v = 0; const [bx, by] = betXY(L, i); b.style.left = bx + 'px'; b.style.top = by + 'px'; void b.offsetWidth; b.classList.remove('nt'); });
      updPot(e.pot);
      G.P.forEach((p, i) => { if (!U.fold.has(i) && e.ch[i] > 0) tag(i, '', ''); });
      await wait(160);
    } else if (e.t === 'reveal') {
      for (const h of e.hands) {
        if (h.p === 0) continue;
        for (const o of U.cards.filter(o => o.pl[0] === 'h' && o.pl[1] === h.p)) { o.open = true; place(o); front(o, true); o.el.classList.remove('down'); }
        sfx.flip(); await wait(260);
      }
      await wait(e.hands.length ? 450 : 0);
    } else if (e.t === 'board') {
      const slow = e.street === 3 || e.run;   // il river (e le carte di un all-in) si girano piano
      if (e.run) await wait(700);
      const os = e.cards.map((c, k) => mkCard(c, ['b', U.board.length + k], L.cw)); U.board.push(...e.cards);
      for (const o of os) { requestAnimationFrame(() => { const [x, y] = boardXY(L, o.pl[1]); setT(o, x, y, L.cw, 0); front(o); }); sfx.card(); await wait(120); }
      await wait(slow ? 650 : 330);
      for (const o of os) { if (slow) o.el.classList.add('slow'); o.el.classList.remove('down'); sfx.flip(); await wait(slow ? 300 : 120); }
      await wait(slow ? 950 : 380);
      myHand();
    } else if (e.t === 'win') {
      U.S.querySelector('#pkWait').textContent = '';
      await potsWon(e);
    } else if (e.t === 'bust') {
      U.out.add(e.p); plates(); if (e.p) { tag(e.p, 'f', 'Eliminato'); U.seats[e.p].classList.add('gone'); }
      await wait(500);
    }
  }
  async function potsWon(e) {
    const G = U.G, L = U.L, [px, py] = potXY(L);
    let mine = false;
    for (const q of e.pots) {
      const who = q.win.map(i => G.P[i].n).join(' e ');
      if (!e.unc && !q.solo) {
        const best = new Set(q.best);
        for (const o of U.cards) { const on = best.has(o.c) && (o.pl[0] === 'b' || q.win.includes(o.pl[1])); o.el.classList.toggle('win', on); o.el.classList.toggle('dim', !on && (o.pl[0] === 'b' || o.open || (o.pl[0] === 'h' && o.pl[1] === 0 && !U.fold.has(0)))); }
        msg((q.win.length > 1 ? who + ' si dividono ' : who + ' vince ') + fmt(q.amt), q.d.n + (q.d.d ? ': ' + q.d.d : ''));
        q.win.forEach(i => tag(i, 'w', q.win.length > 1 ? 'Pari' : 'Vince'));
        await wait(1500);
      } else if (e.unc) { msg(who + ' vince ' + fmt(q.amt), 'Gli altri hanno passato'); q.win.forEach(i => tag(i, 'w', 'Vince')); await wait(700); }
      // le fiches volano al vincitore
      for (const i of q.win) {
        const im = A.pileImg(Math.max(1, Math.round(q.amt / q.win.length)), Math.round(11 * dprOf()), 3, 7), f = document.createElement('div'); f.className = 'pkFly';
        im.style.width = im.width / dprOf() + 'px'; f.appendChild(im); f.style.left = px + 'px'; f.style.top = py + 14 + 'px'; U.S.appendChild(f);
        const [sx, sy] = seatXY(L, i); void f.offsetWidth; requestAnimationFrame(() => { f.style.left = sx + 'px'; f.style.top = sy + 'px'; });
        setTimeout(() => f.remove(), FAST() ? 0 : 700);
        if (i === 0) mine = true; else say(i, 'w', 0.4);
      }
      updPot(0); sfx.chip(); await wait(650); plates();
    }
    if (mine) sfx.win();
    await wait(e.unc ? 900 : 1300);
  }

  // ---- il giro della partita ----
  async function run() {
    const G = U.G, me = G.P[0];
    U.busy = true;
    E.startHand(G); await flush();
    while (U && U.G === G) {
      if (G.over || me.out) break;
      if (G.ph === 'bet') {
        const i = G.turn, p = G.P[i];
        if (p.bot) {
          U.seats[i].classList.add('turn');
          U.S.querySelector('#pkWait').textContent = 'Tocca a ' + p.n;
          await wait(U.fold.has(0) ? 250 + Math.random() * 300 : 500 + Math.random() * 900);
          if (!U || U.G !== G) return;
          E.act(G, i, E.decide(G, i, U.lvO));
        } else {
          U.skip = false; U.root.classList.remove('pkFast'); U.busy = false;
          const a = await myTurn(); if (!U || U.G !== G) return;
          U.busy = true; E.act(G, 0, a);
        }
        await flush();
      } else if (G.ph === 'done') {
        U.skip = false; U.root.classList.remove('pkFast');
        await wait(me.fold ? 600 : 900);
        if (!U || U.G !== G) return;
        E.startHand(G); await flush();
      } else break;
    }
    if (U && U.G === G) end();
  }
  // i pulsanti: Passa / Bussa o Chiama / Punta o Rilancia, con le scelte rapide e il cursore
  function actUI() {
    const a = U.S.querySelector('#pkAct'), rg = a.querySelector('input');
    a.querySelector('.main .f').onclick = () => U.res && U.res({ k: 'f' });
    a.querySelector('.main .k').onclick = () => U.res && U.res({ k: 'c' });
    a.querySelector('.main .r').onclick = () => U.res && U.res({ k: 'r', to: U.to });
    a.querySelectorAll('.pre button').forEach(b => b.onclick = () => { setTo(preset(b.dataset.p)); a.querySelectorAll('.pre button').forEach(x => x.classList.toggle('on', x === b)); });
    rg.oninput = () => { const L = U.lg; setTo(L.minTo + (L.maxTo - L.minTo) * rg.value / 100, true); a.querySelectorAll('.pre button').forEach(x => x.classList.remove('on')); };
  }
  function preset(k) {
    const L = U.lg, base = L.cur === 0 ? 0 : L.cur, pot = L.pot + L.toCall;
    return k === 'min' ? L.minTo : k === 'a' ? L.maxTo : base + pot * (k === 'h' ? 0.5 : 1);
  }
  function setTo(v, fromSlider) {
    const L = U.lg, bb = E.blinds(U.G)[1], step = bb / 2, a = U.S.querySelector('#pkAct');
    v = v >= L.maxTo - step / 2 ? L.maxTo : Math.round(v / step) * step; v = Math.max(L.minTo, Math.min(L.maxTo, v)); U.to = v;
    a.querySelector('.sl .v').textContent = fmt(v);
    a.querySelector('.main .r').textContent = (v >= L.maxTo ? 'All-in ' : L.cur === 0 ? 'Punta ' : 'Rilancia a ') + fmt(v);
    if (!fromSlider) a.querySelector('input').value = L.maxTo > L.minTo ? Math.round((v - L.minTo) / (L.maxTo - L.minTo) * 100) : 100;
  }
  function myTurn() {
    const G = U.G, L = U.lg = E.legal(G, 0), a = U.S.querySelector('#pkAct');
    U.seats[0].classList.add('turn'); sfx.turn();
    U.S.querySelector('#pkWait').textContent = '';
    a.querySelector('.main .k').textContent = L.check ? 'Bussa' : L.call >= G.P[0].chips ? 'All-in ' + fmt(L.call) : 'Chiama ' + fmt(L.call);
    a.querySelectorAll('.pre,.sl').forEach(x => x.classList.toggle('hide', !L.canR || L.maxTo <= L.minTo));
    a.querySelector('.main .r').classList.toggle('hide', !L.canR);
    a.querySelectorAll('.pre button').forEach(x => x.classList.toggle('on', x.dataset.p === 'min'));
    if (L.canR) setTo(L.minTo);
    a.hidden = false;
    return new Promise(res => { U.res = v => { U.res = null; a.hidden = true; U.seats[0].classList.remove('turn'); U.S.querySelector('#pkWait').textContent = ''; res(v); }; });
  }

  // ---- fine partita ----
  function end() {
    const G = U.G, me = G.P[0];
    const order = G.P.slice().sort((a, b) => (a.out - b.out) || (a.out ? b.bust - a.bust : b.chips - a.chips));
    const place = order.indexOf(me) + 1, n = G.P.length, won = place === 1;
    if (won) sfx.win(); else sfx.lose();
    const o = U.o, rec = st().pkSt || (st().pkSt = {}), r = rec[o.lv] || (rec[o.lv] = [0, 0]); r[1]++; if (won) r[0]++;
    if (o.lv === 'ad') st().pkAda = Math.max(0, Math.min(100, ada() + (won ? 9 : place <= Math.ceil(n / 2) ? 2 : -7)));
    save();
    const rows = order.map((p, k) => `<div class="${p === me ? 'me' : ''}"><b>${k + 1}°</b><span>${esc(p.n)}</span><i>${p.out ? 'fuori alla mano ' + p.bust : fmt(p.chips)}</i></div>`).join('');
    const ov = overlay(`<div class="pkBox"><h2>${won ? 'Hai vinto!' : me.out ? 'Sei senza fiches' : 'Partita finita'}</h2><p>${won ? 'Tutte le fiches del tavolo sono tue.' : 'Sei arrivato ' + place + '° su ' + n + '.'} Mani giocate: ${G.hand}.</p><div class="pkRows">${rows}</div>
      <button type="button" class="big pr" data-k="r">Rivincita</button><button type="button" class="big" data-k="s">Cambia le scelte</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelector('[data-k=r]').onclick = () => { ov.remove(); begin(U.o); };
    ov.querySelector('[data-k=s]').onclick = () => { ov.remove(); clearCards(); setup(); };
    ov.querySelector('[data-k=x]').onclick = stop;
  }
  function askExit() {
    const G = U.G;
    if (!G || G.over || G.P[0].out) { stop(); return; }
    const ov = overlay(`<div class="pkBox"><h2>Lasci il tavolo?</h2><p>La partita finisce qui.</p><button type="button" class="big pr" data-k="s">Resto a giocare</button><button type="button" class="big" data-k="x">Esco</button></div>`);
    ov.querySelector('[data-k=s]').onclick = () => ov.remove();
    ov.querySelector('[data-k=x]').onclick = stop;
  }
  // la tabella delle mani, dalla piu' forte alla piu' debole
  function handTable() {
    const C = s => { const r = { A: 14, K: 13, Q: 12, J: 11, T: 10 }[s[0]] || +s[0]; return [s[1], r]; };
    const ROWS = [
      ['Scala reale', 'Asso, re, donna, fante e 10 dello stesso seme.', 'As Ks Qs Js Ts'],
      ['Scala colore', 'Cinque carte in fila dello stesso seme.', '9h 8h 7h 6h 5h'],
      ['Poker', 'Quattro carte dello stesso valore.', 'Qc Qd Qh Qs 4d'],
      ['Full', 'Un tris e una coppia.', '8s 8h 8d Ac Ad'],
      ['Colore', 'Cinque carte dello stesso seme.', 'Kd Td 7d 4d 2d'],
      ['Scala', 'Cinque carte in fila (l\'asso puo\' anche valere 1).', '9c 8d 7s 6h 5c'],
      ['Tris', 'Tre carte dello stesso valore.', '7c 7d 7s Kh 2c'],
      ['Doppia coppia', 'Due coppie.', 'Ah Ad 8c 8s Qh'],
      ['Coppia', 'Due carte dello stesso valore.', 'Jh Jc 9d 5s 2h'],
      ['Carta alta', 'Niente di tutto questo: conta la carta piu\' alta.', 'Ad Qc 9s 6h 3d'],
    ];
    const w = 26, dpr = dprOf();
    const ov = overlay(`<div class="pkBox"><h2>Le mani</h2><p>Dalla piu' forte alla piu' debole. Si usano le 5 carte migliori fra le tue 2 e le 5 sul tavolo.</p><div class="pkHT">`
      + ROWS.map(([n, d, cs]) => `<div><div class="nm">${n}<small>${d}</small></div><div class="cs">${cs.split(' ').map(s => { const [su, r] = C(s); return `<img alt="" src="${F().url(su, r, w * dpr, { j: true })}">`; }).join('')}</div></div>`).join('')
      + `</div><button type="button" class="big pr" data-k="x">Chiudi</button></div>`);
    ov.querySelector('[data-k=x]').onclick = () => ov.remove();
  }

  function start(opt = {}) {
    if (U) stop(true);
    const root = document.createElement('div'); root.id = 'pkT'; document.body.appendChild(root);
    U = { root, opt, G: null, skip: false, busy: false };
    // tocco sul tavolo mentre giocano i computer = animazioni veloci fino al mio turno
    root.addEventListener('pointerdown', e => { if (U && U.busy && !e.target.closest('button,details,input,.pkOv')) { U.skip = true; root.classList.add('pkFast'); } });
    setup();
  }
  function stop(silent) {
    if (!U) return; const cb = U.opt.onExit; if (U.res) U.res = null;
    U.root.remove(); U = null; if (!silent && cb) cb();
  }
  window.PK = { start, stop, get U() { return U; } };
})();
