// Prova del mazzo della Valle dei Clan (node prove/valle1.js): quantita' come la versione online, ogni tessera coerente.
const V = require('../giochi/valle.js');
let bad = 0; const err = (...a) => { bad++; console.log('ERRORE', ...a); };
const D = V.DECK, n = t => D.filter(t).reduce((s, d) => s + d.n, 0);
const tot = n(() => 1), land = n(d => !d.sp), sp = n(d => d.sp), st = n(d => d.start);
console.log('tessere', tot, '| normali (con la partenza)', land, '| speciali', sp, '| partenza', st);
if (tot !== 95 || land !== 79 || sp !== 16 || st !== 1) err('quantita\' totali');
for (const d of D) if (d.sp && !V.SPN[d.sp]) err(d.id, 'speciale senza nome');
const got = {}; for (const d of D) { const c = V.canon(d.e); got[c] = (got[c] || 0) + d.n; }
console.log('tipi di lati:', Object.keys(got).length, Object.entries(got).sort().map(([k, v]) => k + ' ' + v).join(', '));
const ids = new Set(); for (const d of D) { if (ids.has(d.id)) err('id doppio', d.id); ids.add(d.id); }
const t0 = Date.now(); let fish = 0, amber = 0; const an = { cav: 0, rin: 0, orso: 0, bis: 0 };
for (const d of D) {
  const { F, segOf } = V.feats(d), e = d.e;
  // lati <-> boschi e fiumi
  for (let s = 0; s < 4; s++) {
    const inF = (d.fz || []).filter(z => z.includes(s)).length, inR = (d.rv || []).filter(z => z.e.includes(s)).length;
    if ((e[s] === 'b') !== (inF === 1) || inF > 1) err(d.id, 'lato', s, 'bosco sbagliato');
    if ((e[s] === 'f') !== (inR === 1) || inR > 1) err(d.id, 'lato', s, 'fiume sbagliato');
  }
  for (const z of d.rv || []) {
    if (z.e.length + (z.end ? 1 : 0) !== 2) err(d.id, 'fiume con', z.e.length, 'lati e fine', z.end, ': un fiume ha sempre 2 capi');
    if (z.end === 'l' && !V.lakesOf(d)[z.lk || 0]) err(d.id, 'fiume che finisce in un lago che non c\'e\'');
    if (z.end === 'b' && !(z.at && V.forestF(d, z.at[0], z.at[1]) > 0)) err(d.id, 'fiume che finisce nel bosco ma il punto e\' fuori dal bosco');
  }
  V.lakesOf(d).forEach((L, k) => { if (!(L.p >= 1)) err(d.id, 'lago senza pesci'); if (!(d.rv || []).some(z => z.end === 'l' && (z.lk || 0) === k)) err(d.id, 'lago senza fiumi'); });
  // pezzi dei lati
  for (let g = 0; g < 12; g++) {
    const s = (g / 3) | 0, p = g % 3, f = F[segOf[g]];
    if (!f) { err(d.id, 'pezzo', g, 'senza zona'); continue; }
    const want = e[s] === 'b' ? 'b' : e[s] === 'f' && p === 1 ? 'f' : 'p';
    if (f.k !== want) err(d.id, 'pezzo', g, 'e\'', f.k, 'invece di', want);
  }
  // i prati ai due lati di un fiume che attraversa sono separati
  for (const z of d.rv || []) if (!z.end) for (const s of z.e) if (segOf[s * 3] === segOf[s * 3 + 2]) err(d.id, 'prato unito attraverso il fiume sul lato', s);
  // tra due boschi diversi sullo stesso angolo il prato non passa
  for (const o of d.ob || []) {
    if (o.z === undefined) continue;
    if (o.z < 0) err(d.id, o.k, 'non sta in nessuna zona');
    else { const k = F[o.z].k, want = (o.k === 'ambra' || o.k === 'miele') ? 'b' : (o.k === 'zattera' || o.k === 'canoa') ? 'l' : 'p'; if (k !== want) err(d.id, o.k, 'nella zona sbagliata', k); }
  }
  // rotazioni: i pezzi girano con i lati
  for (let r = 1; r < 4; r++) {
    const R = V.featsR(d, r), er = V.edges(d, r);
    for (let g = 0; g < 12; g++) { const s = (g / 3) | 0, p = g % 3, want = er[s] === 'b' ? 'b' : er[s] === 'f' && p === 1 ? 'f' : 'p'; if (R.F[R.segOf[g]].k !== want) err(d.id, 'rotazione', r, 'pezzo', g); }
  }
  const m = F.filter(f => f.k === 'p'), w = F.filter(f => f.k === 'b');
  for (const f of m) for (const k in an) an[k] += f[k] * d.n;
  for (const f of w) amber += f.amber * d.n;
  for (const f of F) if (f.k === 'l' || f.k === 'f') fish += (f.fish || 0) * d.n;
  console.log(d.id.padEnd(8), 'x' + String(d.n).padEnd(3), V.canon(d.e), '| boschi', w.length, w.map(f => f.amber ? 'ambra' : '').join(' ').trim(), '| fiumi', F.filter(f => f.k === 'f').length, '| laghi', F.filter(f => f.k === 'l').map(f => f.fish + ' pesci').join(' ') || '-', '| prati', m.length, m.map(f => ['cav', 'rin', 'orso', 'bis'].filter(k => f[k]).map(k => f[k] + k).join('+') + (f.fire ? '+falo' : '') + (f.pit ? '+fossa' : '') + (f.trap ? '+trappola' : '')).filter(x => x).join(' / '));
}
console.log('nel mazzo: pesci', fish, '| ambra', amber, '| animali', JSON.stringify(an), '| zone calcolate in', Date.now() - t0, 'ms');
console.log(bad ? 'PROVA FALLITA: ' + bad + ' errori' : 'PROVA PASSATA');
process.exit(bad ? 1 : 0);
