// Cactus: partite computer contro computer (node prove/ct1.js). Controlla: carte sempre 54 e tutte diverse, partite che finiscono,
// coppia fuori turno (chiunque, finche' il prossimo non pesca; chi sbaglia resta scoperto), poteri, valori; stampa le medie per livello.
const E = require('../giochi/cactus.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('ERRORE:', m); } };
ok(E.val('h13') === 1 && E.val('d13') === 1 && E.val('c13') === 25 && E.val('s13') === 25, 're rossi 1, neri 25');
ok(E.val('x0') === -5 && E.val('y0') === -5 && E.val('h1') === 1 && E.val('s11') === 10 && E.val('d12') === 10 && E.val('c7') === 7, 'valori');
ok(E.deck().length === 54 && new Set(E.deck()).size === 54, 'mazzo da 54');
const count = G => [...G.deck, ...G.pile, ...(G.held ? [G.held] : []), ...G.P.flatMap(p => p.slots.filter(c => c != null))];
const onTop = (G, c) => { G.deck.splice(G.deck.indexOf(c), 1); G.deck.push(c); };
// regole a mano
{
  const G = E.newGame({ players: [{ n: 'A' }, { n: 'B' }, { n: 'C' }], first: 0 });
  E.begin(G);
  ok(!E.act(G, 0, { k: 'stop' }), 'stop non al primo giro');
  ok(!E.act(G, 1, { k: 'throw', s: 0 }), 'niente da buttare prima del primo scarto');
  // A pesca una carta uguale alla carta 0 di B e la scarta: B la butta fuori turno
  const b0 = G.P[1].slots[0], mate = G.deck.find(c => E.rank(c) === E.rank(b0) && E.rank(c) !== 11 && E.rank(c) !== 12);
  if (mate) {
    onTop(G, mate); E.act(G, 0, { k: 'draw' }); ok(!E.act(G, 1, { k: 'throw', s: 0 }), 'non si butta mentre uno ha la carta in mano');
    E.act(G, 0, { k: 'disc' });
    ok(E.act(G, 1, { k: 'throw', s: 0 }) && G.P[1].slots[0] === null && G.pile[G.pile.length - 1] === b0, 'coppia fuori turno giusta');
  }
  // C sbaglia: la carta resta scoperta, e non ributta su questa carta
  const top = G.pile[G.pile.length - 1], ks = G.P[2].slots.findIndex(c => c != null && E.rank(c) !== E.rank(top));
  ok(E.act(G, 2, { k: 'throw', s: ks }) && G.P[2].up[ks] && G.P[0].mem[E.key(2, ks)] === G.P[2].slots[ks], 'coppia sbagliata: scoperta e vista da tutti');
  ok(!E.act(G, 2, { k: 'throw', s: (ks + 1) % 4 }), 'chi sbaglia non ributta sulla stessa carta');
  // B pesca: la finestra si chiude
  const x = G.deck.find(c => E.rank(c) < 11 && E.rank(c) > 0); onTop(G, x); E.act(G, 1, { k: 'draw' });
  ok(!E.canThrow(G, 0), 'si chiude quando il prossimo pesca');
  const was = G.P[1].slots[1]; E.act(G, 1, { k: 'swap', s: 1 }); ok(G.pile[G.pile.length - 1] === was && E.canThrow(G, 2), 'lo scambio apre una nuova finestra (anche per chi aveva sbagliato prima)');
  // J: scambio
  const J = G.deck.find(c => E.rank(c) === 11); onTop(G, J);
  E.act(G, 2, { k: 'draw' }); E.act(G, 2, { k: 'disc' }); ok(G.ph === 'J', 'il J scartato da il potere');
  ok(!E.act(G, 0, { k: 'throw', s: 1 }), 'niente coppie mentre si usa il potere');
  const a = G.P[2].slots[ks], b = G.P[0].slots[1];
  ok(!E.act(G, 2, { k: 'J', a: [0, 1], b: [2, ks] }), 'J: prima una carta tua');
  ok(E.act(G, 2, { k: 'J', a: [2, ks], b: [0, 1] }) && G.P[2].slots[ks] === b && G.P[0].slots[1] === a && G.P[0].up[1] && !G.P[2].up[ks], 'J: scambio (la scoperta resta scoperta)');
  ok(E.canThrow(G, 1), 'dopo il potere si puo\' ancora buttare sul J');
  // Q: guarda
  const Q = G.deck.find(c => E.rank(c) === 12); onTop(G, Q);
  E.act(G, 0, { k: 'draw' }); E.act(G, 0, { k: 'disc' }); ok(G.ph === 'Q', 'la Q scartata da il potere');
  ok(!E.act(G, 0, { k: 'Q', at: [1, 0] }), 'Q: non si guarda un posto vuoto');
  ok(E.act(G, 0, { k: 'Q', at: [1, 2] }) && G.P[0].mem[E.key(1, 2)] === G.P[1].slots[2], 'Q: guarda e ricorda');
  ok(count(G).length === 54, '54 carte dopo le prove a mano');
  // stop: gli altri fanno un ultimo turno
  E.act(G, 1, { k: 'stop' }); ok(G.stopBy === 1 && G.turn === 2, 'stop');
  for (const i of [2, 0]) { E.act(G, i, { k: 'draw' }); E.act(G, i, { k: 'disc' }); if (G.ph === 'J' || G.ph === 'Q') E.act(G, i, { k: 'skip' }); }
  ok(G.over && G.res.length === 3, 'fine dopo l\'ultimo giro');
}
// partite intere: dopo ogni mossa i computer buttano le loro carte (in ordine di prontezza)
for (const lv of [1, 2, 3]) {
  let sc = 0, tn = 0, bad = 0, good = 0, games = 0, J = 0, Q = 0, stops = 0; const N = 400;
  for (let g = 0; g < N; g++) {
    const n = 2 + (g % 5), G = E.newGame({ players: Array.from({ length: n }, (_, i) => ({ n: 'B' + i, bot: 1 })), lv });
    E.begin(G); let guard = 0;
    while (!G.over && guard++ < 5000) {
      const i = G.turn, a = E.botMove(G, i);
      if (!E.act(G, i, a)) { ok(false, 'mossa rifiutata ' + JSON.stringify(a) + ' fase ' + G.ph); break; }
      for (let t = 0; t < 10; t++) {
        const tr = G.P.map((p, j) => [j, E.botThrow(G, j), E.react(G)]).filter(x => x[1] >= 0).sort((x, y) => x[2] - y[2]);
        if (!tr.length) break;
        ok(E.act(G, tr[0][0], { k: 'throw', s: tr[0][1] }), 'coppia rifiutata');
      }
      const all = count(G); if (all.length !== 54 || new Set(all).size !== 54) { ok(false, 'carte sbagliate: ' + all.length); break; }
    }
    ok(G.over, 'partita finita');
    games++; tn += G.tn / n; sc += G.res.reduce((s, r) => s + r.sc, 0) / n; if (G.stopBy >= 0) stops++;
    for (const e of G.ev) { if (e.t === 'throw') e.ok ? good++ : bad++; if (e.t === 'jswap') J++; if (e.t === 'qpeek') Q++; }
  }
  console.log(`livello ${lv}: punti medi ${(sc / games).toFixed(1)}, giri ${(tn / games).toFixed(1)}, coppie giuste ${(good / games).toFixed(2)} sbagliate ${(bad / games).toFixed(2)}, J ${(J / games).toFixed(2)} Q ${(Q / games).toFixed(2)}, chiuse con stop ${(stops / games * 100).toFixed(0)}%`);
}
console.log(fail ? fail + ' ERRORI' : 'PASSATA');
