// Caramelle pazze online (2 pagine, Firebase vero): l'amico vede l'effetto (hl.cy), la Zombina contagia, il Gigante spinge, lo schiaffo della Superforza.
// uso: node prove/cdp2.mjs . prove/hallnet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const other = n => `(() => { const c = cq.g.chars.find(c => c.remote && c.name === '${n}'); return c ? 'vedo ${n} con cy=' + c.cy + ' a ' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ' vivo ' + c.alive : 'non vedo ${n}'; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1000],
  [0, `(async () => { cq.x = 20; cq.y = 8; HL.apply('zomb'); await new Promise(r => setTimeout(r, 300)); return 'A zombina ' + HL.pub(); })()`, 0],
  [1, `(async () => { cq.x = 24; cq.y = 8; await new Promise(r => setTimeout(r, 2000)); return 'B sta lontano'; })()`, 0],
  [1, other('zzCarA'), 0],
  [1, `(async () => { cq.x = 20.5; cq.y = 8; await new Promise(r => setTimeout(r, 1500)); return 'B tocca A: B diventa ' + HL.pub(); })()`, 0],
  [0, `(async () => { await new Promise(r => setTimeout(r, 800)); return 'A vede B: ' + (cq.g.chars.find(c => c.remote) || {}).cy; })()`, 0],
  [0, `(async () => { HL.apply('big'); cq.x = 30; cq.y = 8; await new Promise(r => setTimeout(r, 1200)); return 'A gigante'; })()`, 0],
  [1, `(async () => { HL.S.green = 0; cq.x = 30.6; cq.y = 8; await new Promise(r => setTimeout(r, 1500)); return 'B spinto fino a ' + cq.x.toFixed(2) + ',' + cq.y.toFixed(2); })()`, 0],
  [0, `(async () => { HL.apply('forza'); cq.x = 25; cq.y = 8; await new Promise(r => setTimeout(r, 300)); return 'A superforza'; })()`, 0],
  [1, `(async () => { cq.x = 25.8; cq.y = 8; await new Promise(r => setTimeout(r, 1500)); return 'B vicino ad A'; })()`, 0],
  [0, `(async () => { cq.g.me.pcd = 0; const v = cq.g.chars.find(c => c.remote); cqHallPrank('s'); await new Promise(r => setTimeout(r, 400)); return 'A schiaffo: B a ' + v.x.toFixed(2); })()`, 0],
  [1, `(async () => { await new Promise(r => setTimeout(r, 1500)); return 'B dopo lo schiaffo a ' + cq.x.toFixed(2) + ' vivo ' + cq.g.me.alive; })()`, 0],
  [0, errs, 0], [1, errs, 0],
];
