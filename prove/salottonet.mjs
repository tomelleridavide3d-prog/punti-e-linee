// salotto e schiaffo online (2 pagine, Firebase vero): seduti, Bevi, schiaffo che sposta la vittima, a terra, poi torna da angelo
const name = n => `(async () => {
  store.settings.myName = '${n}'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const other = `cq.g.chars.find(c => c.remote)`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'set aperto'; })()`, 500],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'amico dentro'; })()`, 500],
  [0, `(async () => { cq.x = 4.4; cq.y = 13.6; await new Promise(r => setTimeout(r, 300)); cqSitToggle(); return 'host: poltrone ' + cqSalaSeats().length + ', seduto ' + cq.sit; })()`, 1500],
  [1, `(() => { const c = ${other}; return 'amico vede host seduto sulla poltrona ' + c.sit + ' in ' + c.x.toFixed(1) + ',' + c.y.toFixed(1); })()`, 0],
  [0, `(() => { cqDrink(); return 'host beve'; })()`, 1200],
  [1, `(() => { const c = ${other}; return 'amico: host sta bevendo da ' + (cq.g.time - c.dkT).toFixed(1) + ' s'; })()`, 0],
  [0, `(() => { cqSitToggle(); return 'host si alza in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`, 800],
  [1, `(async () => { const c = ${other}; cq.x = c.x - 0.8; cq.y = c.y; await new Promise(r => setTimeout(r, 400)); const x0 = c.x; cqHallPrank('s'); return 'amico da lo schiaffo all host (era in ' + x0.toFixed(1) + ')'; })()`, 1500],
  [0, `(() => 'host: vivo ' + cq.g.me.alive + ', a terra per schiaffo ' + !!(cq.g.bodies.find(b => b.id === cq.g.me.id) || {}).sl + ', spostato in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1))()`, 0],
  [1, `(() => { const c = ${other}; return 'amico vede host: vivo ' + c.alive + ', corpo schiaffo ' + !!(cq.g.bodies.find(b => b.id === c.id) || {}).sl + ', in ' + c.tx.toFixed(1) + ',' + c.ty.toFixed(1); })()`, 3500],
  [0, `(() => 'host dopo 5 s: vivo ' + cq.g.me.alive + ', angelo ' + (cq.g.me.angel != null))()`, 0],
  [1, `(() => 'amico vede host vivo ' + ${other}.alive + ' | errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito'; })()`, 300],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
