// Briscola online (3 pagine, Firebase vero): host e amico seduti al tavolino, sfida, partita intera giocata da sole, spettatore, rivincita, abbandono.
// uso: node prove/cdp2.mjs . prove/bcnet.mjs
export const n = 3;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzBcHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sit = i => `(async () => { const p = cqSalaSeats()[${i}]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await new Promise(r => setTimeout(r, 300)); cq.x = p.x; cq.y = p.y; cq.sit = null; const q = cqSalaNear(); cqSitToggle(); return 'seduto ' + cq.sit + ' (poltrone ' + cqSalaSeats().length + ')'; })()`;
const auto = `(() => { clearInterval(window.__a); window.__a = setInterval(() => { const g = [...document.querySelectorAll('#bcT .bcC.go')]; if (g.length && !document.getElementById('bcEnd')) g[Math.floor(Math.random() * g.length)].onclick(); }, 450); return 'gioca da solo'; })()`;
const state = `(() => { const T = document.getElementById('bcT'), e = document.getElementById('bcEnd'); return T ? (e ? 'FINE: ' + e.innerText.replace(/\\s+/g, ' ').slice(0, 170) : 'al tavolo, carte ' + T.querySelectorAll('.bcC').length + ', scritta: ' + T.querySelector('#bcMsg').textContent + ', guardano: ' + T.querySelector('#bcWatch').textContent) : 'nessun tavolo'; })()`;
const errs = `(() => 'errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`;
export default [
  [0, name('zzBcHost'), 0], [1, name('zzBcAmico'), 0], [2, name('zzBcGuarda'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 0], [2, join, 1500],
  [0, sit(0), 0], [1, sit(1), 2500],
  [0, `(async () => { const b = document.getElementById('bcHallB'); if (!b || b.hidden) return 'pulsante Carte NON visibile'; b.click(); await new Promise(r => setTimeout(r, 300)); const m = document.getElementById('bcModal'); const t = m.innerText.replace(/\\s+/g, ' '); m.querySelector('[data-k=f0]').click(); return 'scelta: ' + t; })()`, 2500],
  [1, `(() => { const m = document.getElementById('bcModal'); if (!m) return 'NESSUNA SFIDA ARRIVATA'; const t = m.innerText.replace(/\\s+/g, ' '); m.querySelector('[data-k=ok]').click(); return 'sfida: ' + t; })()`, 3000],
  [0, state, 0], [1, state, 0],
  [2, `(async () => { cq.x = 3.5; cq.y = 14.2; await new Promise(r => setTimeout(r, 600)); const b = document.getElementById('bcWatchB'); if (!b || b.hidden) return 'pulsante Guarda NON visibile'; b.click(); await new Promise(r => setTimeout(r, 1500)); return 'guarda: carte scoperte in mano ' + [...document.querySelectorAll('#bcT .bcC:not(.down)')].length; })()`, 1500],
  [0, state, 0], [1, `(() => { const c = cq.g.chars.find(c => c.remote && c.name === 'zzBcHost'); return 'amico vede fumetto host: ' + (c && c.bub ? c.bub.t : 'nessuno') + ' | pronto per un minigioco: ' + cqHallReady(); })()`, 0],
  [0, auto, 0], [1, auto, 60000],
  [0, state, 0], [1, state, 0], [2, state, 0],
  [0, `(async () => { const b = document.getElementById('bcRv'); b && b.onclick(); await new Promise(r => setTimeout(r, 2000)); return 'host chiede la rivincita'; })()`, 0],
  [1, `(async () => { const b = document.getElementById('bcRv'); const t = b ? b.textContent : 'nessun pulsante'; b && b.onclick(); await new Promise(r => setTimeout(r, 3500)); return 'amico vedeva: ' + t; })()`, 0],
  [0, state, 0], [1, state, 0], [2, state, 2000],
  [1, `(async () => { clearInterval(window.__a); document.getElementById('bcExit').click(); await new Promise(r => setTimeout(r, 200)); const a = document.getElementById('bcAsk'); a.querySelectorAll('button')[1].click(); return 'amico lascia il tavolo'; })()`, 3000],
  [0, state, 0], [2, state, 0],
  [0, errs, 0], [1, errs, 0], [2, errs, 0],
  [2, `(() => { cqNetLeave(); return 'fuori'; })()`, 300], [1, `(() => { cqNetLeave(); return 'fuori'; })()`, 300],
  [0, `(async () => { clearInterval(window.__a); document.getElementById('bcExit') && document.getElementById('bcExit').click(); cqNetLeave(); await new Promise(r => setTimeout(r, 1500)); return 'party chiuso'; })()`, 500],
];
