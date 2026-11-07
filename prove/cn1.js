// regole delle carte in 3 e in 4 (giochi/carteN.js): partite intere a mosse a caso per ogni variante, controllando i conti.
// uso: node prove/cn1.js
const E = require('../giochi/carteN.js');
const ok = (c, m) => { if (!c) { console.log('ERRORE: ' + m); process.exitCode = 1; throw new Error(m); } };
const pick = a => a[Math.floor(Math.random() * a.length)];
function briscola(n, games) {
  let ties = 0, wins = Array(n === 4 ? 2 : n).fill(0);
  for (let g = 0; g < games; g++) {
    const S = Object.assign(E.bcNew({ p: Array(n).fill(0).map((_, i) => 's' + i) }), { ph: 'play' });
    ok(S.h.every(h => h.length === 3), 'tre carte a testa');
    ok(S.d.length === (n === 3 ? 39 : 40) - 3 * n, 'mazzo dopo la distribuzione');
    ok(n !== 3 || !S.d.concat(...S.h).includes('c2'), 'a tre manca il 2 di coppe');
    let tricks = 0;
    while (S.ph === 'play') {
      const first = S.tu;
      for (let k = 0; k < n; k++) { ok(S.tu === (first + k) % n, 'turno in senso giusto'); ok(!E.bcPlay(S, (S.tu + 1) % n, S.h[(S.tu + 1) % n][0]), 'fuori turno rifiutato'); ok(E.bcPlay(S, S.tu, pick(S.h[S.tu])), 'giocata'); }
      const w = E.bcWinner(S); ok(E.bcResolve(S), 'presa'); tricks++;
      ok(S.ph === 'end' || S.tu === w, 'chi prende gioca per primo');
      if (S.ph === 'play') ok(S.h.every(h => h.length === S.h[0].length), 'tutti con le stesse carte');
    }
    ok(tricks === (n === 3 ? 13 : 10), 'numero di prese ' + tricks);
    ok(S.w.flat().length === (n === 3 ? 39 : 40), 'tutte le carte prese');
    ok(S.pts.reduce((a, b) => a + b, 0) === 120, 'somma 120');
    if (S.win < 0) ties++; else wins[S.win]++;
  }
  return 'briscola in ' + n + ': ' + games + ' partite ok, vittorie ' + wins.join('/') + ', pari ' + ties;
}
// presa: la briscola batte, altrimenti il seme di uscita
{
  const S = { b: 'd', t: [[0, 's3'], [1, 's1'], [2, 'c1']] }; ok(E.bcWinner(S) === 1, 'asso dello stesso seme');
  S.t = [[0, 's1'], [1, 'd2'], [2, 'd4']]; ok(E.bcWinner(S) === 2, 'briscola piu\' alta');
  S.t = [[0, 'c4'], [1, 's1'], [2, 'c5'], [3, 'b1']]; ok(E.bcWinner(S) === 2, 'chi non risponde al seme non prende');
}
function scopa(n, v, games) {
  let hands = 0, scope = 0;
  for (let g = 0; g < games; g++) {
    const S = Object.assign(E.scNew({ p: Array(n).fill(0).map((_, i) => 's' + i), o: { v } }), { ph: 'play' });
    ok(S.h.every(h => h.length === (v === 'scn' ? 10 : 3)), 'carte a testa');
    ok(S.tb.length === (v === 'scn' ? 0 : 4), 'carte in tavola');
    let guard = 0;
    while (S.ph !== 'end') {
      ok(guard++ < 5000, 'partita infinita');
      if (S.ph === 'tally') {
        hands++; const tot = S.pl.flat().length; ok(tot === 40, 'smazzata: 40 carte prese, ' + tot);
        for (let i = 0; i < n; i++) E.scOk(S, i); continue;
      }
      const seat = S.tu, c = pick(S.h[seat]), opts = E.options(S.tb, c), before = S.h.flat().length + S.tb.length + S.pl.flat().length + S.d.length;
      ok(E.scPlay(S, seat, c, opts.length ? Math.floor(Math.random() * opts.length) : -1), 'giocata');
      if (S.mv.scopa) scope++;
      const after = S.h.flat().length + S.tb.length + S.pl.flat().length + S.d.length; ok(after === before, 'carte perse: ' + before + ' -> ' + after);
      if (S.ph === 'play') ok(S.tu === (seat + 1) % n, 'turno');
    }
    ok(Math.max(...S.tot) >= 11 && E.best(S.tot) === S.win, 'vittoria a 11');
  }
  return (v === 'scn' ? 'scopone scientifico' : 'scopa in ' + n) + ': ' + games + ' partite ok, ' + hands + ' smazzate, ' + scope + ' scope';
}
// prese della scopa: pari valore prima delle somme
ok(JSON.stringify(E.options(['d3', 'c4', 's7'], 'b7')) === '[["s7"]]', 'pari valore prima');
ok(E.options(['d3', 'c4', 's2', 'b5'], 'c7').length === 2, 'somme possibili');
// conteggio: primiera e categorie con il pari (nessun punto)
{
  const S = { pl: [['d7', 'c7', 's7', 'b7'], ['d1', 'c1'], ['s1']], sc: [1, 0, 0] }, t = E.scTally(S);
  ok(t.pts[0] === 4 && t.pts[1] === 0 && t.pts[2] === 0, 'conteggio a tre ' + t.pts);
}
console.log([briscola(3, 300), briscola(4, 300), scopa(3, 'sc', 150), scopa(4, 'sc', 150), scopa(4, 'scn', 150)].join('\n'));
if (!process.exitCode) console.log('TUTTO OK');
