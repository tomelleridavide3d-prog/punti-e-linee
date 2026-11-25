// Battaglia navale, prove del motore in node: node prove/nv1.js [partite]
// Regole a mano (colpo, razzo, intercettore, siluro, movimento e segni grigi, affondato, armi perse) + partite computer contro computer.
const E = require('../giochi/navale.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('ERRORE: ' + m); } };
const seed = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const fleet = () => [E.mk('F', 0, 0, false), E.mk('S', 0, 2, false), E.mk('I', 6, 6, false), E.mk('M', 9, 0, true), E.mk('M', 0, 9, false)];
ok(E.validFleet(fleet()), 'flotta di prova valida');
ok(!E.validFleet([E.mk('F', 0, 0, false), E.mk('S', 1, 0, false), ...fleet().slice(2)]), 'navi sovrapposte rifiutate');
ok(!E.fits([], E.mk('F', 8, 0, false)), 'nave fuori dal mare rifiutata');
{ // colpo, affondato, arma persa
  const G = E.newGame({ fleets: [fleet(), fleet()], first: 0, rnd: seed(1) });
  ok(E.act(G, 0, { k: 'shot', x: 5, y: 5 }) && G.P[0].V[55] === 1, 'acqua');
  ok(!E.act(G, 0, { k: 'shot', x: 1, y: 1 }), 'non e\' il mio turno');
  E.act(G, 1, { k: 'shot', x: 9, y: 9 });
  for (let x = 0; x < 4; x++) { E.act(G, 0, { k: 'shot', x, y: 0 }); if (x < 3) E.act(G, 1, { k: 'shot', x: 9, y: 9 - x - 1 }); }
  ok(G.P[1].ships[0].sunk && G.P[0].V[0] === 4, 'fregata affondata');
  ok(!E.canRocket(G, 1), 'senza fregata niente razzi');
  G.turn = 0; ok(!E.legal(G, 0, { k: 'shot', x: 0, y: 0 }) && E.legal(G, 0, { k: 'shot', x: 5, y: 5 }), 'relitto no, acqua si\' (le navi si muovono)'); G.turn = 1;
}
{ // razzo a croce e intercettore
  const G = E.newGame({ fleets: [fleet(), fleet()], first: 0, rnd: seed(2) });
  E.act(G, 0, { k: 'rocket', x: 1, y: 1 });
  ok(G.P[0].V[1] === 2 && G.P[0].V[11] === 1 && G.P[0].V[21] === 2 && G.P[0].V[10] === 1 && G.P[0].V[12] === 1 && G.P[0].am.r === 1, 'razzo a croce: 2 colpiti 3 acqua');
  E.act(G, 1, { k: 'shot', x: 5, y: 5 });
  const n = G.ev.length; E.act(G, 0, { k: 'rocket', x: 7, y: 5 });
  ok(G.ev.slice(n).some(e => e.t === 'icpt') && G.P[0].V[57] === 0, 'intercettore abbatte il razzo vicino');
  ok(!E.canRocket(G, 0), 'razzi finiti');
}
{ // siluro: bordo piu' vicino, si ferma sulla prima nave, acqua prima
  ok(JSON.stringify(E.torpFrom(1, 6)) === '{"d":0,"l":6}' && JSON.stringify(E.torpFrom(5, 8)) === '{"d":3,"l":5}', 'siluro dal bordo piu\' vicino');
  const G = E.newGame({ fleets: [fleet(), fleet()], first: 0, rnd: seed(3) });
  E.act(G, 0, { k: 'torp', d: 1, l: 6 });
  ok(G.P[0].V[69] === 1 && G.P[0].V[68] === 2 && G.P[0].V[67] === 0, 'siluro da destra: acqua poi colpito');
  E.act(G, 1, { k: 'shot', x: 5, y: 5 });
  E.act(G, 0, { k: 'torp', d: 0, l: 4 });
  ok([...Array(10)].every((_, x) => G.P[0].V[40 + x] === 1) && G.P[0].am.s === 0, 'siluro a vuoto: riga tutta acqua');
}
{ // movimento: velocita', danni che seguono, segni grigi
  const G = E.newGame({ fleets: [fleet(), fleet()], first: 0, rnd: seed(4) });
  const m0 = E.movesOf(G, 1, 2); ok(m0.length === 5 && m0.some(m => m.x === 4 && m.y === 6) && m0.some(m => m.x === 6 && m.y === 5), 'intercettore: 2 avanti/indietro e 1 di lato');
  ok(E.movesOf(G, 1, 3).some(m => m.y === 3), 'motovedetta: 3 caselle');
  E.act(G, 0, { k: 'shot', x: 7, y: 6 });
  ok(E.movesOf(G, 1, 2).every(m => Math.abs(m.x - 6) + Math.abs(m.y - 6) === 1), 'nave colpita: solo 1 casella');
  E.act(G, 1, { k: 'move', s: 2, x: 6, y: 7 });
  ok(G.P[0].V[67] === 3 && G.P[1].ships[2].h[1] === 1, 'colpito diventa grigio, il danno resta sulla nave');
  E.act(G, 0, { k: 'shot', x: 7, y: 7 });
  ok(G.P[0].V[77] === 2 && G.P[0].st.hit === 1, 'ricolpire il pezzo gia\' danneggiato: colpito ma niente danno nuovo');
  E.act(G, 1, { k: 'move', s: 2, x: 6, y: 6 }); E.act(G, 0, { k: 'shot', x: 0, y: 5 });
  ok(G.P[1].ships[2].fu === 0 && E.movesOf(G, 1, 2).length === 0, 'carburante finito: la nave non si muove piu\'');
  const H = E.newGame({ fleets: [fleet(), [E.mk('F', 0, 0, false), E.mk('S', 0, 1, false), ...fleet().slice(2)]], first: 1 });
  ok(!E.movesOf(H, 1, 0).some(m => m.y === 1) && !E.movesOf(H, 1, 1).some(m => m.y === 0), 'non si va sopra le altre navi');
}
// partite computer contro computer
const games = +(process.argv[2] || 400);
const pairs = [[1, 1], [2, 2], [3, 3], [1, 2], [2, 3], [1, 3]];
for (const [a, b] of pairs) {
  let w = [0, 0, 0], tns = 0, use = { r: 0, s: 0, mv: 0, icpt: 0 }, maxT = 0, t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const G = E.newGame({ rnd: seed(1000 + g * 7 + a * 13 + b), first: g % 2 });
    while (!G.over) {
      G.lv = G.turn === 0 ? a : b;
      const m = E.bot(G, G.turn);
      if (!E.act(G, G.turn, m)) { ok(false, 'mossa del computer rifiutata ' + JSON.stringify(m)); break; }
    }
    w[G.win === -2 ? 2 : G.win]++; tns += G.tn; maxT = Math.max(maxT, G.tn);
    for (const P of G.P) { use.r += P.st.r; use.s += P.st.s; use.mv += P.st.mv; }
    use.icpt += G.ev.filter(e => e.t === 'icpt').length;
  }
  console.log(`livello ${a} contro ${b}: vittorie ${w[0]}-${w[1]} (pari ${w[2]}), turni medi ${(tns / games).toFixed(1)} (max ${maxT}), a partita: razzi ${(use.r / games).toFixed(2)} siluri ${(use.s / games).toFixed(2)} mosse ${(use.mv / games).toFixed(2)} intercettati ${(use.icpt / games).toFixed(2)}, ${((Date.now() - t0) / games).toFixed(1)} ms/partita`);
}
console.log(fail ? 'PROVE FALLITE: ' + fail : 'TUTTO OK');
