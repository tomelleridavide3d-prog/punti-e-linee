// Partite a raffica tra livelli diversi (node prove/ch3.js [partite]): nessun errore del computer, fine partita sempre riconosciuta, chi vince
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'giochi', 'scacchi.js'), 'utf8');
const blk = src.split(/^\/\/ ==CH ENGINE==$/m)[1].split(/^\/\/ ==END CH ENGINE==$/m)[0];
const E = new Function(blk + '; return CHE_SRC();')();
// stessi livelli di CH.aiOpts, ma con poco tempo per andare veloci
const opts = s => ({ depth: s < 12 ? 1 : s < 32 ? 2 : s < 55 ? 3 : s < 78 ? 4 : s < 92 ? 6 : 64, ms: +(process.argv[3] || 60), noise: s < 92 ? (100 - s) * 2.4 : 0, blunder: s < 62 ? (62 - s) / 62 * 0.24 : 0 });
const G = +(process.argv[2] || 40), PAIRS = [[4, 25], [25, 50], [50, 75], [75, 100]];
let errs = 0; const res = {}, wins = {};
for (let g = 0; g < G; g++) {
  const pr = PAIRS[g % PAIRS.length], flip = (g >> 2) & 1, lv = flip ? [pr[1], pr[0]] : pr, mv = [];
  let st = '';
  for (let n = 0; n < 500; n++) {
    const p = E.replay(mv); st = E.status(p); if (st) break;
    let r; try { r = E.think(E.replay(mv), opts(lv[n & 1])); } catch (e) { errs++; console.log('ERRORE', mv.join(' '), e.stack.slice(0, 300)); break; }
    if (!r || !E.parseUci(p, r.m)) { errs++; console.log('MOSSA NON VALIDA', JSON.stringify(r), mv.join(' ')); break; }
    mv.push(r.m);
  }
  res[st || 'lunga'] = (res[st || 'lunga'] || 0) + 1;
  const key = pr.join('-'); wins[key] = wins[key] || [0, 0, 0];
  if (st === 'mate') { const loser = mv.length & 1, w = lv[1 - loser]; wins[key][w === pr[1] ? 1 : 0]++; } else wins[key][2]++;
}
console.log('fine partite:', JSON.stringify(res));
console.log('vittorie [piu debole, piu forte, patte]:', JSON.stringify(wins));
console.log(errs ? errs + ' ERRORI' : 'TUTTO OK');
