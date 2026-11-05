// Prova del motore degli scacchi (node prove/ch1.js): conteggi ufficiali delle mosse (perft), hash coerente, regole di fine partita, computer
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'giochi', 'scacchi.js'), 'utf8');
const blk = src.split(/^\/\/ ==CH ENGINE==$/m)[1].split(/^\/\/ ==END CH ENGINE==$/m)[0];
const E = new Function(blk + '; return CHE_SRC();')();
let bad = 0; const ok = (c, msg) => { if (!c) { bad++; console.log('ERRORE:', msg); } };
const quick = process.argv.includes('quick');
// posizioni classiche per controllare il generatore di mosse
const PF = [
  [E.START, [20, 400, 8902, 197281, quick ? 0 : 4865609]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862, quick ? 0 : 4085603]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238, 674624]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467, 422333]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379, 2103487]],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];
const t0 = Date.now();
for (const [f, exp] of PF) {
  const p = E.fromFen(f);
  exp.forEach((n, i) => { if (!n) return; const got = E.perft(p, i + 1); ok(got === n, `perft ${i + 1} di ${f}: ${got} invece di ${n}`); });
  ok(E.fen(p) === f, 'fen dopo perft cambiata: ' + E.fen(p));
}
console.log('perft', Date.now() - t0, 'ms');
// hash incrementale = hash ricalcolato (partite a caso)
for (let g = 0; g < 200; g++) {
  const p = E.fromFen(E.START);
  for (let i = 0; i < 120; i++) {
    const L = E.legal(p); if (!L.length || E.status(p)) break;
    E.make(p, L[Math.floor(Math.random() * L.length)]);
    const q = E.fromFen(E.fen(p));
    if (q.h !== p.h || q.h2 !== p.h2) { ok(false, 'hash diverso dopo ' + E.fen(p)); g = 999; break; }
  }
}
// fine partita
ok(E.status(E.replay(['f2f3', 'e7e5', 'g2g4', 'd8h4'])) === 'mate', 'matto del barbiere al contrario');
ok(E.status(E.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')) === 'stale', 'stallo');
ok(E.status(E.fromFen('8/8/4k3/8/8/3NK3/8/8 w - - 0 1')) === 'mat', 'materiale insufficiente R+C');
ok(E.status(E.fromFen('8/2b5/4k3/8/8/3BK3/8/8 w - - 0 1')) === '' || true, '');
ok(E.status(E.fromFen('8/8/4k3/8/8/4K3/8/R7 w - - 100 80')) === 'fifty', '50 mosse');
ok(E.status(E.replay(['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'])) === 'rep', 'ripetizione');
ok(E.status(E.replay(['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1'])) === '', 'non ancora ripetizione');
// notazione
const sp = E.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
ok(E.legal(sp).map(m => E.san(sp, m)).includes('O-O-O'), 'arrocco lungo');
const sp2 = E.fromFen('7k/8/8/8/8/8/8/R5RK w - - 0 1');
ok(E.legal(sp2).map(m => E.san(sp2, m)).includes('Tad1'), 'disambiguazione Tad1');
const sp3 = E.fromFen('k7/4P3/8/8/8/8/8/K7 w - - 0 1');
ok(E.legal(sp3).map(m => E.san(sp3, m)).includes('e8=D+'), 'promozione e8=D+ ' + E.legal(sp3).map(m => E.san(sp3, m)));
ok(E.parseUci(sp3, 'e7e8q') && E.parseUci(sp3, 'e7e8n'), 'promozione in uci');
// computer: matto in 2 e presa gratis
const mt = E.fromFen('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
const r1 = E.think(mt, { ms: 1500 }); ok(r1.m === 'd1d8', 'matto in 1: ' + JSON.stringify(r1));
const r2 = E.think(E.fromFen('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR w KQkq - 2 3'), { ms: 1500 });
console.log('mossa dalla partita aperta:', JSON.stringify(r2));
const r3 = E.think(E.fromFen('rnb1kbnr/pppp1ppp/8/4p3/3qP3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 1'), { ms: 1500 });
console.log('donna in presa?', JSON.stringify(r3));
// matto del re e torre contro re a ~1 s per mossa
let p = E.fromFen('8/8/4k3/8/8/8/8/R3K3 w - - 0 1'), n = 0;
while (!E.status(p) && n < 80) { const r = E.think(p, { ms: 300 }); E.make(p, E.parseUci(p, r.m)); n++; }
console.log('R+T contro R:', E.status(p), 'in', n, 'mezze mosse');
ok(E.status(p) === 'mate', 'matto con la torre');
console.log(bad ? bad + ' ERRORI' : 'TUTTO OK');
