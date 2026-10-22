// prova delle regole e del computer della Briscola (node prove/bc1.js): partite simulate
const E = require('../giochi/briscola.js');
let s = 7; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
const rnd = (S, p) => S.h[p][Math.floor(R() * S.h[p].length)];
// "giocatore semplice": prende se puo' con lo stesso seme, se no liscia la carta piu' debole
const simple = (S, p) => {
  const H = S.h[p];
  if (S.t.length) { const a = S.t[0][1], w = H.filter(c => c[0] === a[0] && E.str(c) > E.str(a)); if (w.length) return w[0]; }
  return H.slice().sort((x, y) => E.pts(x) - E.pts(y) || E.str(x) - E.str(y))[0];
};
function match(f0, f1, first) {
  const S = E.newGame(1 + Math.floor(R() * 1e9), first), F = [f0, f1];
  let n = 0;
  while (S.ph === 'play') {
    const c = F[S.tu](S, S.tu);
    if (!E.play(S, S.tu, c)) throw new Error('mossa rifiutata ' + c);
    if (S.t.length === 2) E.resolve(S);
    if (++n > 100) throw new Error('ciclo');
  }
  const sc = E.score(S);
  if (sc[0] + sc[1] !== 120) throw new Error('totale ' + sc);
  if (S.w[0].length + S.w[1].length !== 40) throw new Error('carte ' + S.w[0].length);
  if (S.k !== 20) throw new Error('prese ' + S.k);
  return sc;
}
function vs(name, f0, f1, N = 600) {
  let w = 0, l = 0, t = 0, pts = 0;
  for (let i = 0; i < N; i++) { const sc = match(f0, f1, i % 2); pts += sc[0]; if (sc[0] > 60) w++; else if (sc[0] < 60) l++; else t++; }
  console.log(`${name}: vinte ${w}, perse ${l}, pari ${t} (punti medi ${(pts / N).toFixed(1)})`);
}
const ai = (S, p) => E.ai(S, p, R);
vs('Computer contro carte a caso', ai, rnd, 200);
vs('Computer contro giocatore semplice', ai, simple, 300);
vs('Computer contro computer', ai, ai, 100);

const h = (S, p) => E.hint(S, p, R, 0);
vs('Computer contro solo-regole (senza immaginare)', ai, h, 300);
vs('Solo-regole contro giocatore semplice', h, simple);
// regola della presa
const ok = [['d3', 'd1', 's', false], ['d1', 'd3', 's', true], ['c7', 'd1', 'c', true], ['d1', 'c7', 'c', false], ['b2', 'd1', 's', false], ['s10', 's9', 's', true]];
for (const [b, a, B, r] of ok) if (E.beats(b, a, B) !== r) throw new Error('presa sbagliata ' + b + ' su ' + a);
console.log('regole ok');
