// Cactus: partite computer contro computer (node prove/ct1.js). Controlla: carte sempre 54 e tutte diverse, partite che finiscono,
// regole dei poteri e delle coppie, valori; stampa le medie per livello (punti, turni, coppie sbagliate).
const E = require('../giochi/cactus.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('ERRORE:', m); } };
// valori
ok(E.val('h13') === 1 && E.val('d13') === 1 && E.val('c13') === 25 && E.val('s13') === 25, 're rossi 1, neri 25');
ok(E.val('x0') === -5 && E.val('y0') === -5 && E.val('h1') === 1 && E.val('s11') === 10 && E.val('d12') === 10 && E.val('c7') === 7, 'valori');
ok(E.deck().length === 54 && new Set(E.deck()).size === 54, 'mazzo da 54');
function count(G) { const all = [...G.deck, ...G.pile, ...(G.held ? [G.held] : []), ...G.P.flatMap(p => p.slots.filter(c => c != null))]; return all; }
// regole a mano
{
  const G = E.newGame({ players: [{ n: 'A' }, { n: 'B' }], first: 0 });
  E.begin(G);
  ok(!E.act(G, 0, { k: 'stop' }), 'stop non al primo giro');
  // forzo una coppia giusta: metto in cima al mazzo una carta dello stesso rango della carta 0 di A
  const c0 = G.P[0].slots[0], r = E.rank(c0), mate = count(G).find(c => c !== c0 && E.rank(c) === r && G.deck.includes(c));
  if (mate) {
    G.deck.splice(G.deck.indexOf(mate), 1); G.deck.push(mate);
    ok(E.act(G, 0, { k: 'draw' }) && G.held === mate, 'pesca');
    ok(E.act(G, 0, { k: 'pair', s: 0 }), 'coppia');
    ok(G.P[0].slots[0] === null && G.pile.includes(mate) && G.pile.includes(c0), 'coppia giusta: due carte scartate');
  }
  // coppia sbagliata: la carta resta scoperta
  const c1 = G.P[1].slots[1], wrong = G.deck.find(c => E.rank(c) !== E.rank(c1));
  G.deck.splice(G.deck.indexOf(wrong), 1); G.deck.push(wrong);
  E.act(G, 1, { k: 'draw' }); E.act(G, 1, { k: 'pair', s: 1 });
  ok(G.P[1].up[1] && G.P[1].slots[1] === c1 && G.P[0].mem[E.key(1, 1)] === c1, 'coppia sbagliata: scoperta e vista da tutti');
  // J: scambio
  const J = G.deck.find(c => E.rank(c) === 11); G.deck.splice(G.deck.indexOf(J), 1); G.deck.push(J);
  E.act(G, 0, { k: 'draw' }); E.act(G, 0, { k: 'disc' }); ok(G.ph === 'J', 'il J scartato da il potere');
  const a = G.P[0].slots[1], b = G.P[1].slots[1];
  ok(!E.act(G, 0, { k: 'J', a: [1, 1], b: [0, 1] }), 'J: prima una carta tua');
  ok(E.act(G, 0, { k: 'J', a: [0, 1], b: [1, 1] }) && G.P[0].slots[1] === b && G.P[1].slots[1] === a && G.P[0].up[1] && !G.P[1].up[1], 'J: scambio (la scoperta resta scoperta)');
  // Q: guarda
  const Q = G.deck.find(c => E.rank(c) === 12); G.deck.splice(G.deck.indexOf(Q), 1); G.deck.push(Q);
  E.act(G, 1, { k: 'draw' }); E.act(G, 1, { k: 'disc' }); ok(G.ph === 'Q', 'la Q scartata da il potere');
  ok(!E.act(G, 1, { k: 'Q', at: [0, 0] }), 'Q: non si guarda un posto vuoto');
  ok(E.act(G, 1, { k: 'Q', at: [0, 2] }) && G.P[1].mem[E.key(0, 2)] === G.P[0].slots[2], 'Q: guarda e ricorda');
  ok(count(G).length === 54, '54 carte dopo le prove a mano');
  // stop: gli altri fanno un ultimo turno
  E.act(G, 0, { k: 'stop' }); ok(G.stopBy === 0 && G.turn === 1, 'stop');
  E.act(G, 1, { k: 'draw' }); E.act(G, 1, { k: 'disc' }); if (G.ph !== 'over') E.act(G, 1, { k: 'skip' });
  ok(G.over && G.res.length === 2, 'fine dopo l\'ultimo giro');
}
// partite intere
for (const lv of [1, 2, 3]) {
  let sc = 0, tn = 0, bad = 0, good = 0, games = 0, J = 0, Q = 0, stops = 0; const N = 400;
  for (let g = 0; g < N; g++) {
    const n = 2 + (g % 5), G = E.newGame({ players: Array.from({ length: n }, (_, i) => ({ n: 'B' + i, bot: 1 })), lv });
    E.begin(G); let guard = 0;
    while (!G.over && guard++ < 5000) {
      const i = G.turn, a = E.botMove(G, i);
      if (!E.act(G, i, a)) { ok(false, 'mossa rifiutata ' + JSON.stringify(a) + ' fase ' + G.ph); break; }
      const all = count(G); if (all.length !== 54 || new Set(all).size !== 54) { ok(false, 'carte sbagliate: ' + all.length); break; }
    }
    ok(G.over, 'partita finita');
    games++; tn += G.tn / n; sc += G.res.reduce((s, r) => s + r.sc, 0) / n; if (G.stopBy >= 0) stops++;
    for (const e of G.ev) { if (e.t === 'pair') e.ok ? good++ : bad++; if (e.t === 'jswap') J++; if (e.t === 'qpeek') Q++; }
  }
  console.log(`livello ${lv}: punti medi ${(sc / games).toFixed(1)}, giri ${(tn / games).toFixed(1)}, coppie giuste ${(good / games).toFixed(2)} sbagliate ${(bad / games).toFixed(2)}, J ${(J / games).toFixed(2)} Q ${(Q / games).toFixed(2)}, chiuse con stop ${(stops / games * 100).toFixed(0)}%`);
}
console.log(fail ? fail + ' ERRORI' : 'PASSATA');
