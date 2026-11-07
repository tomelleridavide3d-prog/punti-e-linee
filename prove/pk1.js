// Prove del motore del poker (node prove/pk1.js [quick])
// 1) tutte le 2.598.960 mani di 5 carte: quante per categoria (numeri ufficiali)
// 2) 7 carte a caso: confronto con un valutatore scritto in un altro modo
// 3) regole: bui in due, opzione del grande buio, rilancio minimo, all-in corto, piatti laterali, fiche dispari
// 4) partite intere computer contro computer: fiches sempre uguali, niente negativi, partite che finiscono
const E = require('../giochi/poker.js');
const quick = process.argv[2] === 'quick';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('ERRORE:', m); } };

// ---- 1) categorie su tutte le mani di 5 carte ----
if (!quick) {
  const cnt = new Array(9).fill(0);
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++) for (let d = c + 1; d < 52; d++) for (let e = d + 1; e < 52; e++) cnt[Math.floor(E.eval7([a, b, c, d, e]) / 1048576)]++;
  const REF = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40];
  ok(cnt.join() === REF.join(), 'categorie 5 carte ' + cnt.join() + ' invece di ' + REF.join());
  console.log('5 carte:', cnt.join(' '));
}

// ---- 2) valutatore di controllo (ordina per numero di copie e valore) ----
function ref5(cs) {
  const r = cs.map(c => (c >> 2) + 2).sort((x, y) => y - x), s = cs.map(c => c & 3);
  const fl = s.every(x => x === s[0]);
  const u = [...new Set(r)];
  let st = 0; if (u.length === 5) { if (r[0] - r[4] === 4) st = r[0]; else if (r.join() === '14,5,4,3,2') st = 5; }
  const g = {}; for (const x of r) g[x] = (g[x] || 0) + 1;
  const gr = Object.entries(g).map(([v, n]) => [n, +v]).sort((x, y) => y[0] - x[0] || y[1] - x[1]);
  const key = gr.map(x => x[1]), sh = gr.map(x => x[0]).join('');
  let cat;
  if (st && fl) return [8, st];
  if (sh === '41') cat = 7; else if (sh === '32') cat = 6; else if (fl) return [5, ...r]; else if (st) return [4, st];
  else if (sh === '311') cat = 3; else if (sh === '221') cat = 2; else if (sh === '2111') cat = 1; else cat = 0;
  return [cat, ...key];
}
const cmpA = (x, y) => { for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return Math.sign(d); } return 0; };
function ref7(cs) { let best = null; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) { const h = cs.filter((_, k) => k !== i && k !== j), v = ref5(h); if (!best || cmpA(v, best) > 0) best = v; } return best; }
let rs = 12345; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const draw = n => { const d = []; for (let c = 0; c < 52; c++) d.push(c); for (let i = 0; i < n; i++) { const j = i + Math.floor(rnd() * (52 - i)); [d[i], d[j]] = [d[j], d[i]]; } return d.slice(0, n); };
const N2 = quick ? 20000 : 150000;
for (let t = 0; t < N2; t++) {
  const d = draw(9), board = d.slice(0, 5), a = board.concat(d.slice(5, 7)), b = board.concat(d.slice(7, 9));
  const e = Math.sign(E.eval7(a) - E.eval7(b)), r = cmpA(ref7(a), ref7(b));
  if (e !== r) { ok(false, 'confronto 7 carte ' + a + ' / ' + b + ' motore ' + e + ' controllo ' + r); break; }
  if (t < 3000) { const b5 = E.best5(a); ok(E.eval7(b5.c) === E.eval7(a) && b5.c.length === 5, 'best5 ' + a); }
}
// nomi
const C = s => { const r = { A: 14, K: 13, Q: 12, J: 11, T: 10 }[s[0]] || +s[0]; return (r - 2) * 4 + 'hdcs'.indexOf(s[1]); };
const H = s => s.split(' ').map(C);
const nm = s => { const d = E.describe(E.eval7(H(s))); return d.n + (d.d ? ' ' + d.d : ''); };
ok(nm('As Ks Qs Js Ts 2d 3c') === 'Scala reale', 'scala reale');
ok(nm('Ah 2d 3c 4s 5h Kd Kc') === "Scala al 5", 'scala minima: ' + nm('Ah 2d 3c 4s 5h Kd Kc'));
ok(nm('8s 8h 8d Ac Ad 2c 3h') === 'Full otto e assi', 'full: ' + nm('8s 8h 8d Ac Ad 2c 3h'));
ok(nm('Ah Ad 8c 8s Qh 2c 3d') === 'Doppia coppia assi e otto', 'doppia coppia');
ok(nm('Ah Kd') === 'Carta alta asso' && nm('7h 7d') === 'Coppia di sette', 'due carte');
ok(E.eval7(H('Ah Ad 8c 8s 7h 7c Kd')) > E.eval7(H('Ah Ad 8c 8s 7h 7c Qd')), 'kicker della doppia coppia');

// ---- 3) regole ----
const mk = (n, chips, seed) => { const G = E.newGame({ players: Array.from({ length: n }, (_, i) => ({ n: 'G' + i, bot: 1 })), chips, seed: seed || 1 }); G.dealer = n - 1; return G; };
const sum = G => G.P.reduce((s, p) => s + p.chips + p.tot, 0);
{ // in due: il mazziere mette il piccolo e parla per primo prima del flop, per secondo dopo
  const G = mk(2, 1000); E.startHand(G);
  ok(G.dealer === 0 && G.sbP === 0 && G.bbP === 1 && G.turn === 0, 'bui in due');
  E.act(G, 0, { k: 'c' }); ok(G.turn === 1 && G.ph === 'bet' && G.street === 0, 'opzione del grande buio in due');
  E.act(G, 1, { k: 'c' }); ok(G.street === 1 && G.turn === 1, 'dopo il flop parla il grande buio');
}
{ // in quattro: tutti chiamano, il grande buio puo' ancora rilanciare
  const G = mk(4, 1000); E.startHand(G);   // mazziere 0, piccolo 1, grande 2, parla 3
  ok(G.turn === 3, 'primo a parlare = dopo il grande buio');
  E.act(G, 3, { k: 'c' }); E.act(G, 0, { k: 'c' }); E.act(G, 1, { k: 'c' });
  ok(G.turn === 2 && G.street === 0, 'opzione del grande buio');
  const L = E.legal(G, 2); ok(L.check && L.canR && L.minTo === 40, 'grande buio: bussa o rilancia a 40');
  E.act(G, 2, { k: 'r', to: 100 }); ok(G.cur === 100 && G.minR === 80 && G.turn === 3, 'rilancio a 100');
  const L3 = E.legal(G, 3); ok(L3.minTo === 180, 'rilancio minimo dopo un rilancio di 80 = 180, non ' + L3.minTo);
  E.act(G, 3, { k: 'r', to: 50 }); ok(G.cur === 180, 'un rilancio troppo piccolo diventa il minimo');
}
{ // all-in corto: chi aveva gia' parlato puo' solo chiamare
  const G = E.newGame({ players: [{ n: 'A' }, { n: 'B' }, { n: 'C' }], chips: 1000, seed: 3 }); G.dealer = 2;
  G.P[2].chips = 1000; G.P[0].chips = 1000; G.P[1].chips = 1000;
  E.startHand(G);   // mazziere 0, piccolo 1 (10), grande 2 (20), parla 0
  E.act(G, 0, { k: 'r', to: 100 });           // A rilancia a 100 (rilancio di 80)
  G.P[1].chips = 130 - G.P[1].bet; // B ha in tutto 130: all-in a 130 = rilancio corto di 30
  E.act(G, 1, { k: 'r', to: 9999 }); ok(G.cur === 130 && G.P[1].allin, 'all-in corto a 130');
  ok(G.turn === 2, 'tocca a C');
  E.act(G, 2, { k: 'c' });
  ok(G.turn === 0 && !E.legal(G, 0).canR, 'A dopo l\'all-in corto puo\' solo chiamare o passare');
}
{ // piatti laterali: A 100, B 300, C 1000 tutti all-in / chiamata, pot = 100*3 + 200*2 + 0
  for (let s = 1; s <= 300; s++) {
    const G = E.newGame({ players: [{ n: 'A' }, { n: 'B' }, { n: 'C' }], chips: 1000, seed: s }); G.dealer = 2;
    G.P[0].chips = 100; G.P[1].chips = 300; G.P[2].chips = 1000; const tot0 = 1400;
    E.startHand(G);   // mazziere 0 (A), piccolo 1 (B), grande 2 (C), parla A
    E.act(G, 0, { k: 'r', to: 100 }); E.act(G, 1, { k: 'r', to: 300 }); E.act(G, 2, { k: 'c' });
    ok(G.ph === 'done' || G.ph === 'over', 'mano finita con tutti all-in (seme ' + s + ')');
    const w = G.ev.filter(e => e.t === 'win').pop();
    const amts = w.pots.map(q => q.amt);
    ok(amts[0] === 300 && amts[1] === 400 && (amts.length === 2), 'piatti 300 + 400: ' + amts);
    ok(G.P.reduce((a, p) => a + p.chips, 0) === tot0, 'fiches conservate nei piatti laterali');
    ok(G.ev.some(e => e.t === 'reveal') && G.board.length === 5, 'carte scoperte e tavolo completo');
    const sc = G.P.map(p => E.eval7(p.hole.concat(G.board)));
    const exp0 = [0, 1, 2].filter(i => sc[i] === Math.max(...sc));
    ok(w.pots[0].win.slice().sort().join() === exp0.join(), 'vincitore del piatto principale');
  }
}
{ // puntata non chiamata: torna a chi l'ha fatta
  const G = mk(3, 1000, 7); E.startHand(G);
  const before = G.P.map(p => p.chips + p.tot);
  E.act(G, G.turn, { k: 'r', to: 500 }); const r = (G.turn + 2) % 3; E.act(G, G.turn, { k: 'f' }); E.act(G, G.turn, { k: 'f' });
  const w = G.ev.filter(e => e.t === 'win').pop(); ok(w.unc && w.pots[0].amt === 530, 'vince il piatto senza showdown: ' + w.pots[0].amt);
  ok(G.P.reduce((a, p) => a + p.chips, 0) === 3000, 'fiches conservate');
}

// ---- 4) partite intere computer contro computer ----
const NG = quick ? 40 : 220; let hands = 0, maxH = 0, ms = Date.now(), showdowns = 0, splits = 0, side = 0, bluffWins = 0;
for (let g = 0; g < NG; g++) {
  const n = 2 + (g % 7), CH = [{ t: 0.8, a: 0.1, b: 0.05 }, { t: -0.2, a: 0.9, b: 0.35 }, { t: -0.1, a: 0.5, b: 0.8 }, { t: 0.3, a: 0.35, b: 0.12 }];
  const G = E.newGame({ players: Array.from({ length: n }, (_, i) => ({ n: 'B' + i, bot: 1, ch: CH[i % 4] })), chips: [500, 1000, 1500, 2000][g % 4], every: [5, 8, 12][g % 3], endHands: g % 5 === 0 ? 20 : 0, seed: 1000 + g });
  const lv = E.levelOpts([0, 30, 62, 100][g % 4]); lv.iters = 60;
  const total = G.P.reduce((a, p) => a + p.chips, 0);
  E.startHand(G); let steps = 0;
  while (!G.over && steps < 200000) {
    steps++;
    if (G.ph === 'bet') {
      const i = G.turn; ok(i >= 0 && !G.P[i].fold && !G.P[i].allin, 'turno valido');
      const L = E.legal(G, i); ok(L.call >= 0 && L.minTo <= L.maxTo, 'mosse valide');
      ok(E.act(G, i, E.decide(G, i, lv)), 'mossa accettata');
      ok(G.P.every(p => p.chips >= 0), 'fiches negative');
    } else if (G.ph === 'done') {
      hands++;
      ok(G.P.reduce((a, p) => a + p.chips, 0) === total, 'fiches conservate (partita ' + g + ' mano ' + G.hand + ')');
      const w = G.ev.filter(e => e.t === 'win').pop();
      if (!w.unc) showdowns++; if (w.pots.length > 1 && !w.pots.slice(1).every(q => q.solo)) side++; if (w.pots.some(q => q.win.length > 1)) splits++;
      E.startHand(G);
    }
  }
  ok(G.over, 'partita ' + g + ' non finita'); maxH = Math.max(maxH, G.hand);
  ok(G.rank && G.rank.length === n, 'classifica');
  if (G.endHands) ok(G.hand <= G.endHands, 'fine dopo le mani scelte');
}
console.log(`partite ${NG}, mani ${hands} (al massimo ${maxH} in una partita), showdown ${showdowns}, piatti laterali ${side}, piatti divisi ${splits}, ${Date.now() - ms} ms`);
console.log(fails ? 'NON PASSATA: ' + fails + ' errori' : 'PASSATA');
