// Prova del motore del Sette e mezzo (node prove/sm1.js): valori, matta, reale, pagamenti, partite intere fra computer.
const E = require('../giochi/settemezzo.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('ERRORE: ' + m); } };
// valori e matta
ok(E.total(['c7', 'b8'], true) === 7.5, '7 + fante = 7,5');
ok(E.total(['c3', 'b2', 's9'], true) === 5.5, '3 + 2 + cavallo');
ok(E.total(['d10'], true) === 7, 'matta da sola = 7');
ok(E.total(['d10'], false) === 0.5, 'senza matta il re di denari = mezzo');
ok(E.total(['d10', 'c3'], true) === 7, 'matta + 3 = 7');
ok(E.total(['d10', 'c3', 'b4'], true) === 7.5, 'matta + 3 + 4 = 7,5 (matta = mezzo)');
ok(E.total(['d10', 'c4', 'b4'], true) === 8.5, 'matta + 4 + 4 sballa');
ok(E.total(['c7', 'd10'], true) === 7.5, 'matta + 7');
ok(E.reale(['c7', 'b8']) && E.reale(['d10', 's7']) && !E.reale(['c7', 'b8', 'c9']) && !E.reale(['d10', 'b8']), 'reale');
ok(E.total(['c7', 'b1'], true) === 8, 'sballato a 8');
ok(E.words(6.5) === '6 e mezzo' && E.words(0.5) === 'mezzo' && E.words(7.5) === 'sette e mezzo' && E.words(4) === '4', 'parole');
// una mano preparata a mano: banco 5, A sta a 6 (vince), B sballa, C sta a 5 (pari = banco), D reale (doppio, prende il banco)
{
  const G = E.newGame({ players: [{ n: 'Banco' }, { n: 'A' }, { n: 'B' }, { n: 'C' }, { n: 'D' }], chips: 1000, min: 10, max: 100, bank: 0 });
  E.startHand(G);
  const set = { 0: ['c5'], 4: ['b6'], 3: ['s7'], 2: ['b5'], 1: ['c7'] }; for (const i in set) G.P[i].cards = set[i].slice();
  G.deck = ['b8', 'c4', 'd8'];   // si pesca dal fondo: prima d8 (D), poi c4 (B), poi b8
  for (const i of G.ord) E.bet(G, i, 100);
  ok(G.ord.join() === '4,3,2,1', 'ordine antiorario dopo il banco: ' + G.ord);
  ok(G.ph === 'play' && G.turn === 4, 'tocca al primo dopo il banco');
  E.act(G, 4, 's');            // A: 6, sta
  E.act(G, 3, 'c');            // B: 7 + fante di denari = reale, si ferma da solo
  ok(G.P[3].done, 'B a 7,5 si ferma da solo');
  E.act(G, 2, 'c');            // C: 5 + c4 = 9 sballa
  ok(G.P[2].bust && G.P[2].chips === 900, 'C sballa e paga subito');
  E.act(G, 1, 'c');            // D: 7 + b8 = reale
  ok(G.ph === 'bank', 'tocca al banco');
  E.act(G, 0, 's');
  const sh = G.ev.find(e => e.t === 'show');
  ok(sh && sh.res.length === 3, 'tre al conto');
  ok(G.P[4].chips === 1100, 'A vince 100: ' + G.P[4].chips);
  ok(G.P[3].chips === 1200 && G.P[1].chips === 1200, 'i due reali prendono il doppio');
  ok(G.P[0].chips === 1000 + 100 - 100 - 200 - 200, 'banco: ' + G.P[0].chips);
  ok(G.bank === 3, 'il banco passa al primo reale in ordine di gioco (B): ' + G.bank);
}
// banco sballa: paga tutti quelli rimasti; tutti sballati: il banco non gioca
{
  const G = E.newGame({ players: [{ n: 'Banco' }, { n: 'A' }, { n: 'B' }], chips: 500, min: 10, max: 50, bank: 0 });
  E.startHand(G); G.P[0].cards = ['c6']; G.P[2].cards = ['b2']; G.P[1].cards = ['s3']; G.deck = ['c5', 'b1'];
  E.bet(G, 2, 50); E.bet(G, 1, 20); E.act(G, 2, 's'); E.act(G, 1, 's'); E.act(G, 0, 'c'); E.act(G, 0, 'c');
  ok(G.P[0].chips === 430 && G.P[1].chips === 520 && G.P[2].chips === 550, 'banco sballato paga tutti');
  const H = E.newGame({ players: [{ n: 'Banco' }, { n: 'A' }], chips: 500, min: 10, max: 50, bank: 0 });
  E.startHand(H); H.P[1].cards = ['s7']; H.deck = ['c5']; E.bet(H, 1, 50); E.act(H, 1, 'c');
  ok(H.ev.some(e => e.t === 'nobank') && H.ph === 'done' && H.P[0].chips === 550, 'tutti sballati');
}
// partite intere fra computer
const CH = [{ a: 0.15 }, { a: 0.45 }, { a: 0.9 }, { a: 0.6 }, { a: 0.35 }, { a: 0.65 }, { a: 0.8 }];
let games = 0, hands = 0, bankWins = 0, bankHands = 0, busts = 0, plays = 0, reali = 0, swaps = 0, maxCards = 0;
const t0 = Date.now();
for (let g = 0; g < 300; g++) {
  const n = 2 + (g % 7), chips = [500, 1000, 2000][g % 3], end = [10, 20, 0][g % 3];
  const G = E.newGame({ players: Array.from({ length: n }, (_, i) => ({ n: 'P' + i, bot: 1, ch: CH[i % 7] })), chips, min: 10, max: 100, endHands: end, rise: end ? 0 : 10, bank: g % n });
  let guard = 0;
  while (!G.over && guard++ < 3000) {
    E.startHand(G); hands++;
    const b0 = G.bank, bc0 = G.P[b0].chips;
    for (const i of G.ord) E.bet(G, i, E.botBet(G, i));
    let k = 0;
    while ((G.ph === 'play' || G.ph === 'bank') && k++ < 100) { const i = G.turn; E.act(G, i, G.ph === 'bank' ? E.bankPlay(G) : E.botPlay(G, i)); }
    ok(G.ph === 'done' || G.ph === 'over', 'mano finita');
    const sum = G.P.reduce((a, p) => a + p.chips, 0); ok(sum === n * chips, 'fiches conservate ' + sum);
    ok(G.P.every(p => p.chips >= 0), 'fiches mai sotto zero');
    bankHands++; if (G.P[b0].chips > bc0) bankWins++;
    for (const i of G.ord) { plays++; if (G.P[i].bust) busts++; if (E.reale(G.P[i].cards)) reali++; maxCards = Math.max(maxCards, G.P[i].cards.length); }
    if (G.bank !== b0) swaps++;
    const used = G.P.flatMap(p => p.cards); ok(new Set(used).size === used.length, 'nessuna carta doppia');
  }
  ok(G.over, 'partita finita');
  if (end) ok(G.hand <= end, 'non oltre le mani');
  games++;
}
console.log(JSON.stringify({ bad, games, hands, bancoInGuadagno: (bankWins / bankHands * 100).toFixed(1) + '%', sballati: (busts / plays * 100).toFixed(1) + '%', reali: (reali / plays * 100).toFixed(2) + '%', cambiBanco: swaps, maxCarte: maxCards, ms: Date.now() - t0 }));
// il banco che ragiona contro un banco semplice (si ferma a 5): quanto guadagna a mano contro gli stessi puntatori
for (const smart of [true, false]) {
  let gain = 0, N = 3000;
  for (let h = 0; h < N; h++) {
    const G = E.newGame({ players: Array.from({ length: 5 }, (_, i) => ({ n: 'P' + i, bot: 1, ch: CH[i] })), chips: 100000, min: 10, max: 100, bank: 0 });
    E.startHand(G); for (const i of G.ord) E.bet(G, i, 50);
    while (G.ph === 'play') E.act(G, G.turn, E.botPlay(G, G.turn));
    while (G.ph === 'bank') E.act(G, 0, smart ? E.bankPlay(G) : (E.total(G.P[0].cards, true) < 5 ? 'c' : 's'));
    gain += G.P[0].chips - 100000;
  }
  console.log((smart ? 'banco che ragiona' : 'banco semplice   ') + ': ' + (gain / N).toFixed(1) + ' fiches a mano');
}
process.exit(bad ? 1 : 0);
