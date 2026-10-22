// Duello degli alchimisti online, passo 1 (node prove/cdp2.mjs . prove/alcnet.mjs): host + amico nella torre,
// ognuno nel suo angolo, l'amico si muove e l'host lo vede, cuori e lati (cappello viola / verde) uguali sui due telefoni
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const pos = who => `(() => { const G = cq.g; if (!G) return '${who}: nessuna partita'; const o = G.chars.find(c => c !== G.me);
  return '${who}: ' + G.mode + ' | io ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (lato ' + G.chars.indexOf(G.me) + ', cuori ' + G.me.hp + ') | altro ' + (o ? o.name + ' ' + o.x.toFixed(1) + ',' + o.y.toFixed(1) + ' cuori ' + o.hp : '-') + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzAlHost'), 0], [1, name('zzAlAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'alchimisti' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { alchimisti: { map: 'torre', n: 2, fill: true } }); cqNetList(); return 'host: party aperto, gioco alchimisti'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAlHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel party'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); cqCloseTask(); const G = cq.g; return 'host: partita ' + G.mode + ', personaggi ' + G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', '); })()`, 1500],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode); })()`, 0],
  [0, pos('host'), 0], [1, pos('amico'), 0],
  [1, `(async () => { for (let i = 0; i < 20; i++) { cq.x -= 0.1; cq.walk += 0.5; await new Promise(r => setTimeout(r, 60)); } return 'amico: cammino fino a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`, 1500],
  [0, pos('host'), 0],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c !== G.me), d = G.M.draw(h), dm = G.M.draw(G.me); return 'amico: cappello host lato ' + G.chars.indexOf(h) + ', mio lato ' + G.chars.indexOf(G.me) + ', disegni ' + (typeof d) + '/' + (typeof dm); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'party chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
