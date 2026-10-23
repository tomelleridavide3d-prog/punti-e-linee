// Biliardo a soldi online (2 pagine, Firebase vero): posta troppo alta per l'amico, partita da 25 con l'amico che esce a meta' (la posta va al banco),
// partita da 10 col banco che esce a meta' (la posta va all'amico, che resta sul riquadro della vittoria).
// uso: node prove/cdp2.mjs . prove/betnet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore(); window.cqFast = 5;
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const coins = n => `(() => { cqBank().coins = ${n}; saveStore(); return 'monete ${n}'; })()`;
const sfida = bet => `(async () => { cq.x = CQ_W - 2 - 10.5; cq.y = 9.6; await new Promise(r => setTimeout(r, 600)); const B = document.getElementById('tvB_bi'); if (!B || B.hidden) return 'pulsante non visibile'; B.click(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzCarB')); if (!b) return 'niente sfida'; b.click(); await new Promise(r => setTimeout(r, 300)); document.querySelector('#tvModal [data-k=b${bet}]').click(); return 'sfidato con posta ${bet}'; })()`;
const vedi = k => `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; const t = m.innerText.replace(/\\s+/g, ' '); const b = m.querySelector('[data-k=${k}]'); if (!b) return 'manca il tasto ${k}: ' + t; b.click(); return t; })()`;
const st = `(() => { const T = BI.T, t = document.getElementById('cqToast'); const toast = t && !t.hidden ? ' | avviso: ' + t.innerText.replace(/\\s+/g, ' ') : ''; if (!T) return 'nessuna partita, monete ' + cqBank().coins + toast; const S = T.S; return S.ph + ' posta ' + S.bet + ' monete ' + cqBank().coins + (S.ph === 'end' ? ' vince ' + S.win + ' ' + (S.why || '').replace(/<[^>]+>/g, '') + ' | ' + ((document.querySelector('.tvEnd') || {}).innerText || '').replace(/\\s+/g, ' ') : '') + toast; })()`;
const esci = `(async () => { window.confirm = m => { window.__cm = m; return true; }; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 300)); return 'esce (domanda: ' + window.__cm + ')'; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, coins(100), 0], [1, coins(30), 0],
  [0, sfida(50), 2500], [1, vedi('poor'), 2500], [0, st, 0],
  [0, sfida(25), 2500], [1, vedi('ok'), 3000], [0, st, 0], [1, st, 0],
  [1, esci, 3000], [0, st, 0], [1, st, 0],
  [0, `(async () => { BI.close(); await new Promise(r => setTimeout(r, 1500)); return 'A chiude'; })()`, 0],
  [1, coins(40), 0],
  [0, sfida(10), 2500], [1, vedi('ok'), 3000], [0, st, 0], [1, st, 0],
  [0, esci, 2500], [1, st, 0], [0, st, 8000], [1, st, 0],
  [0, errs, 0], [1, errs, 0],
];
