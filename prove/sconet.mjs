// Scopa online (2 pagine, Firebase vero): seduti al tavolino, "🃏 Carte" -> Scopa -> sfida all'amico, accetta, partita giocata da sola, stesso stato.
// uso: node prove/cdp2.mjs . prove/sconet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sit = i => `(async () => { const p = cqSalaSeats()[${i}]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await new Promise(r => setTimeout(r, 300)); cqSitToggle(); await new Promise(r => setTimeout(r, 1200)); return 'seduto ' + cq.sit; })()`;
const auto = `(() => { clearInterval(window.__a); window.__a = setInterval(() => { const T = SC.T; if (!T || T.me < 0) return; const S = T.S;
  if (S.ph === 'tally' && !S.ok[T.me]) { const b = document.querySelector('.scTally button'); if (b && !b.disabled) b.click(); return; }
  if (S.ph !== 'play' || S.tu !== T.me || Date.now() < (T.hold || 0) || window.__w) return; window.__w = 1; setTimeout(() => { window.__w = 0; }, 900);
  SC.act(SC.aiTurn({ S: Object.assign({}, S, { ai: T.me }) })); }, 300); return 'gioco da solo'; })()`;
const st = `(() => { const T = SC.T; if (!T) return 'nessuna partita'; const S = T.S; return S.ph + ' v' + S.v + ' smazzata ' + S.hand + ' totale ' + S.tot.join('-') + ' tavola ' + S.tb.join(',') + ' mazzo ' + S.d.length + ' io ' + T.me; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, sit(0), 0], [1, sit(1), 2000],
  [0, `(async () => { document.getElementById('bcHallB').click(); await new Promise(r => setTimeout(r, 400)); [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('Scopa')).click(); await new Promise(r => setTimeout(r, 400)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzCarB')); if (!b) return 'amico seduto non in lista: ' + document.getElementById('tvModal').innerText.replace(/\\s+/g, ' '); b.click(); return 'sfidato a scopa'; })()`, 3000],
  [1, `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; const t = m.innerText.replace(/\\s+/g, ' '); m.querySelector('[data-k=ok]').click(); return t; })()`, 3500],
  [0, st, 0], [1, st, 0],
  [0, auto, 0], [1, auto, 40000],
  [0, st, 0], [1, st, 0],
  [1, `(async () => { clearInterval(window.__a); window.confirm = () => true; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 2000)); return 'B esce'; })()`, 0],
  [0, st, 0],
  [0, errs, 0], [1, errs, 0],
];
