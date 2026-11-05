// Partite computer contro computer della Valle dei Clan (node prove/valle2.js [partite] [giocatori]): regole, punti, tempi.
const V = require('../giochi/valle.js');
const N = +(process.argv[2] || 20), NP = +(process.argv[3] || 2);
let bad = 0; const err = (...a) => { bad++; console.log('ERRORE', ...a); };
const st = { forest: 0, river: 0, fpts: 0, rpts: 0, meadow: 0, mpts: 0, huts: 0, hpts: 0, bonus: 0, discard: 0, turns: 0, ms: 0, moves: 0, score: [], win: Array(NP).fill(0), tiles: 0, msMax: 0 };
for (let k = 0; k < N; k++) {
  const G = V.newGame({ n: NP, seed: 1000 + k, amberMan: true });
  let guard = 0;
  while (G.ph !== 'end' && guard++ < 400) {
    const t0 = Date.now(), m = V.aiMove(G, { noise: G.cur === 0 ? 0 : 0, seed: k });
    const dt = Date.now() - t0; st.ms += dt; st.moves++; st.msMax = Math.max(st.msMax, dt);
    if (!m) { err('nessuna mossa'); break; }
    if (!V.place(G, m.x, m.y, m.r)) { err('posto non valido'); break; }
    if (!V.meeple(G, m.m)) { err('omino non valido'); break; }
    if (G.ph === 'totem' && !V.totem(G, m.sh)) { err('sciamano non valido'); break; }
    // controlli: omini e palafitte sempre giusti
    const pcs = V.pieces(G);
    G.P.forEach((p, i) => {
      const men = pcs.filter(q => q.p === i && q.k === 'man').length, huts = pcs.filter(q => q.p === i && q.k === 'hut').length;
      if (men + p.men !== V.MEN || huts + p.huts !== V.HUTS) err('partita', k, 'omini sbagliati', i, men, p.men, huts, p.huts);
    });
  }
  if (G.ph !== 'end') err('partita non finita');
  if (G.deck.length) err('mazzo non finito');
  for (const e of G.ev) {
    if (e.t === 'score') {
      if (e.k === 'b') { st.forest++; st.fpts += e.pts; } else if (e.k === 'f') { st.river++; st.rpts += e.pts; } else if (e.k === 'p') { st.meadow++; st.mpts += e.pts; } else { st.huts++; st.hpts += e.pts; }
    }
    if (e.t === 'bonus') st.bonus++; if (e.t === 'discard') st.discard++;
  }
  st.turns += G.turn; st.tiles += G.tiles.length;
  const sc = G.P.map(p => p.sc); st.score.push(...sc);
  const mx = Math.max(...sc); sc.forEach((s, i) => { if (s === mx) st.win[i]++; });
}
const r = (a, b) => (a / b).toFixed(1);
console.log(`${N} partite a ${NP}: tessere messe ${r(st.tiles, N)}, turni ${r(st.turns, N)}, speciali ${r(st.bonus, N)}, scartate ${r(st.discard, N)}`);
console.log(`a partita: boschi chiusi ${r(st.forest, N)} (media ${r(st.fpts, st.forest)} punti), fiumi chiusi ${r(st.river, N)} (${r(st.rpts, st.river)}), prati contati ${r(st.meadow, N)} (${r(st.mpts, st.meadow)}), palafitte ${r(st.huts, N)} (${r(st.hpts, st.huts)})`);
console.log(`punti a testa: media ${r(st.score.reduce((a, b) => a + b, 0), st.score.length)}, min ${Math.min(...st.score)}, max ${Math.max(...st.score)} | vittorie per posto ${st.win.join(' / ')}`);
console.log(`computer: ${r(st.ms, st.moves)} ms a mossa (al massimo ${st.msMax} ms)`);
console.log(bad ? 'PROVA FALLITA: ' + bad + ' errori' : 'PROVA PASSATA');
process.exit(bad ? 1 : 0);
