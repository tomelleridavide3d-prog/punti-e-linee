// entrare nel party dell'amico al primo tocco (24-10-2026): il riquadro dei party non si rifa' se non cambia niente (prima il pulsante Entra
// veniva sostituito a ogni "sono qui" dei party e il tocco andava perso), "⏳ Entro…" mentre si collega, un solo ingresso anche toccando due volte.
// uso: node prove/cdp2.mjs . prove/entraparty.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
export default [
  [0, name('zzEnA'), 0], [1, name('zzEnB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); cqNetList(); return 'party aperto'; })()`, 3000],
  [1, `(async () => { const k = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzEnA'), b = document.querySelector('#lbNet [data-join="' + k + '"]'); if (!b) return 'B: PARTY NON IN LISTA';
    cq.sets[k] = Object.assign({}, cq.sets[k], { ts: Date.now() }); cqNetBox();   // arriva un "sono qui" mentre il dito e' sul pulsante
    const still = b.isConnected; const t0 = performance.now(); b.click(); const txt = b.textContent; b.click(); b.click();   // tocchi in piu'
    while (!(cq.g && cq.g.hall && cq.net) && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 20));
    return 'B: pulsante ancora lo stesso dopo l aggiornamento ' + still + ', scritta "' + txt + '", dentro dopo ' + Math.round(performance.now() - t0) + ' ms, party ' + (cq.net && cq.net.code === k); })()`, 2500],
  [0, `(() => 'A: dentro ' + Object.values(cq.net.pl).map(p => p.name).join(', '))()`, 0],
  [1, `(() => { cqNetLeave(); return 'B esce; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'A chiude; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 500],
];
