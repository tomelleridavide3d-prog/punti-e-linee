// Carte in 4 online (5 pagine, Firebase vero): A, B, C, D seduti in salotto; A apre la Briscola in quattro a coppie (compagno C) dal pulsante del
// tavolino, gli altri accettano, E guarda. Partita giocata da sola fino in fondo: stesso risultato sui 5 telefoni; rivincita (servono tutti);
// B esce a meta' = partita interrotta per tutti. Poi A apre la Scopa in tre con B e D e la gioca fino a 11.
// Uso: node prove/cdp2.mjs . prove/cnnet.mjs   (serve la regola "cn" pubblicata)
export const n = 5;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCnA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro ' + !!cq.net; })()`;
const sit = i => `(async () => { const p = cqSalaSeats()[${i}]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await new Promise(r => setTimeout(r, 300)); cqSitToggle(); await new Promise(r => setTimeout(r, 1200)); return 'seduto ' + cq.sit; })()`;
// gioca da solo: quando tocca a me tocco una carta a caso (scopa: poi la prima presa proposta); "Avanti" a fine smazzata
const auto = `(() => { clearInterval(window.__a); window.__bz = 0; window.__a = setInterval(() => { const T = CN.T; if (!T || T.me < 0) return; const S = T.S;
  if (S.ph === 'tally') { const b = T.root.querySelector('.cnTally button'); if (b && !b.disabled) b.click(); return; }
  if (S.ph !== 'play' || S.tu !== T.me || window.__bz || (S.gm === 'bc' && S.t.length >= S.p.length)) return;
  window.__bz = 1; setTimeout(() => { const T2 = CN.T; if (!T2 || T2.S.tu !== T2.me || T2.S.ph !== 'play') { window.__bz = 0; return; }
    const h = T2.S.h[T2.me], c = h[Math.floor(Math.random() * h.length)], e = T2.els.get(c); if (e) e.click();
    setTimeout(() => { const bs = T2.root.querySelectorAll('.cnOpts button'); if (bs.length) bs[0].click(); else if (T2.S.gm === 'sc' && e) e.click(); setTimeout(() => { window.__bz = 0; }, 400); }, 80); }, 120);
}, 120); return 'gioco da solo'; })()`;
const st = `(() => { const T = CN.T; if (!T) return 'nessun tavolo'; const S = T.S; return S.ph + ' g' + S.g + ' io ' + T.me + ' ' + (S.gm === 'bc' ? 'mazzo ' + S.d.length + ' prese ' + S.w.map(w => w.length).join('/') + (S.pts ? ' punti ' + S.pts.join('/') : '') : 'smazzata ' + S.hand + ' totali ' + S.tot.join('/')) + ' vince ' + S.win + ' guardano ' + (T.watch || 0) + (S.why ? ' | ' + S.why : ''); })()`;
const sig = `(() => { const S = CN.T && CN.T.S; return S ? 'FIRMA ' + S.g + ':' + S.ph + ':' + (S.pts || S.tot).join('/') + ':' + S.win : 'nessuna'; })()`;
const accept = `(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 40 && !document.querySelector('#tvModal [data-k="ok"]'); i++) await w(150);
  const t = document.querySelector('#tvModal .tvBox'), txt = t ? t.textContent.slice(0, 90) : 'nessun invito'; const b = document.querySelector('#tvModal [data-k="ok"]'); if (b) b.click(); return 'invito: ' + txt; })()`;
const waitEnd = `(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); const t0 = Date.now(); while (Date.now() - t0 < 150000 && !(CN.T && CN.T.S.ph === 'end')) await w(500); return 'fine dopo ' + Math.round((Date.now() - t0) / 1000) + ' s'; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
const open = (game, how, pickNames, partner) => `(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById('bcHallB').click(); await w(400);
  [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('${game}')).click(); await w(400);
  [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('${how}')).click(); await w(400);
  for (const nm of ${JSON.stringify(pickNames)}) { [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes(nm)).click(); await w(200); }
  const go = document.querySelector('#tvModal [data-k="go"]'); const dis = go.disabled; go.click(); await w(300);
  ${partner ? `[...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('${partner}')).click(); await w(300);` : ''}
  return 'aperto: ' + (document.querySelector('#tvModal .tvBox') || {}).textContent; })()`;
export default [
  [0, name('zzCnA'), 0], [1, name('zzCnB'), 0], [2, name('zzCnC'), 0], [3, name('zzCnD'), 0], [4, name('zzCnE'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 0], [2, join, 0], [3, join, 0], [4, join, 1500],
  [0, sit(0), 0], [1, sit(1), 0], [2, sit(2), 0], [3, sit(3), 2000],
  // con troppi pochi amici seduti la scelta lo dice (qui ce ne sono 3: per la briscola in 4 bastano)
  [0, open('Briscola', 'In quattro', ['zzCnB', 'zzCnC', 'zzCnD'], 'zzCnC'), 1000],
  [1, accept, 0], [2, accept, 0], [3, accept, 2500],
  [0, st, 0], [1, st, 0], [2, st, 0], [3, st, 0],
  [0, `(() => { const S = CN.T.S; return 'posti ' + S.n.join(', ') + ' | coppie: ' + S.n[0] + '+' + S.n[2] + ' contro ' + S.n[1] + '+' + S.n[3]; })()`, 0],
  [4, `(async () => { await new Promise(r => setTimeout(r, 600)); const x = CN.games()[0]; if (!x) return 'E: nessun tavolo da guardare'; CN.watch(x.key); await new Promise(r => setTimeout(r, 800)); return 'E guarda: io ' + CN.T.me + ', carte coperte in basso ' + [...CN.T.els.values()].filter(e => e.style.opacity !== '0' && e.dataset.src === CARTE.url('d', 0, Math.round(e.offsetWidth))).length; })()`, 0],
  [0, auto, 0], [1, auto, 0], [2, auto, 0], [3, auto, 0],
  [0, waitEnd, 0], [1, waitEnd, 0], [2, waitEnd, 0], [3, waitEnd, 0], [4, waitEnd, 1500],
  [0, sig, 0], [1, sig, 0], [2, sig, 0], [3, sig, 0], [4, sig, 0],
  [0, `(() => { const e = CN.T.root.querySelector('.tvEnd'); return 'riquadro A: ' + (e ? e.textContent.slice(0, 120) : 'MANCA'); })()`, 0],
  [3, `(() => { const e = CN.T.root.querySelector('.tvEnd'); return 'riquadro D: ' + (e ? e.querySelector('h2').textContent : 'MANCA'); })()`, 0],
  // rivincita: A, B, C dicono si', si aspetta D; poi anche D e riparte
  [0, `(() => { CN.act({ k: 'rv' }); return 'A rivincita'; })()`, 0], [1, `(() => { CN.act({ k: 'rv' }); return 'B rivincita'; })()`, 0], [2, `(() => { CN.act({ k: 'rv' }); return 'C rivincita'; })()`, 1500],
  [3, `(() => { const b = CN.T.root.querySelector('.tvEnd button'); return 'D vede: ' + (b && b.textContent) + ' | fase ' + CN.T.S.ph; })()`, 0],
  [0, `(() => { const b = CN.T.root.querySelector('.tvEnd button'); return 'A vede: ' + (b && b.textContent); })()`, 0],
  [3, `(() => { CN.act({ k: 'rv' }); return 'D rivincita'; })()`, 2000],
  [0, st, 0], [2, st, 0], [4, st, 0],
  // B esce a meta' partita: finisce per tutti
  [1, `(() => { clearInterval(window.__a); CN.close(); return 'B esce'; })()`, 2500],
  [0, st, 0], [2, `(() => { const e = CN.T && CN.T.root.querySelector('.tvEnd'); return 'C vede: ' + (e ? e.textContent.slice(0, 80) : 'niente'); })()`, 0], [4, st, 0],
  [0, `(() => { CN.close(); return 'A chiude'; })()`, 0], [2, `(() => { CN.close(); return 'C chiude'; })()`, 0], [3, `(() => { CN.close(); return 'D chiude'; })()`, 0], [4, `(() => { CN.close(); return 'E chiude'; })()`, 1500],
  // Scopa in tre: A con B e D
  [0, open('Scopa', 'In tre', ['zzCnB', 'zzCnD'], null), 1000],
  [1, accept, 0], [3, accept, 2500], [1, auto, 0],
  [0, st, 0], [1, st, 0], [3, st, 0],
  [0, waitEnd, 0], [1, waitEnd, 0], [3, waitEnd, 1000],
  [0, sig, 0], [1, sig, 0], [3, sig, 0],
  [0, `(() => { clearInterval(window.__a); CN.close(); return 'A chiude; ' + (localStorage.getItem('errLog') || 'nessun errore').slice(0, 200); })()`, 0],
  [1, errs, 0], [2, errs, 0], [3, errs, 0], [4, errs, 0],
];
