// Assedio al castello online: host + amico (node prove/cdp2.mjs . prove/asnet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAsAmico'), h = G.chars.find(c => c.name === 'zzAsHost');
  return '${who}: tempo ' + G.half + ' attacca ' + G.a0 + '/' + (G.half === 1 ? G.a0 : 1 - G.a0) + ' | amico t' + a.t + ' cuori ' + a.hp + ' pos ' + (a === G.me ? cq.x : a.x).toFixed(1) + ',' + (a === G.me ? cq.y : a.y).toFixed(1) + (a.cl ? ' SALE' : '') + ' | host cuori ' + h.hp + ' | scale ' + G.ld.map(l => l.st + (l.st === 2 ? '@' + l.s : '')).join(' ') + ' | bandiera ' + G.F.st + '/' + G.F.c + ' | frecce ' + G.ar.length + ' | res ' + JSON.stringify(G.res); })()`;
const go = (x, y) => `(() => { cq.x = ${x}; cq.y = ${y}; return 'amico va a ${x},${y}'; })()`;
const btn = `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'amico preme: ' + t; })()`;
export default [
  [0, name('zzAsHost'), 0], [1, name('zzAsAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'assedio' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { assedio: { time: 240, lit: 'd', map: 'castello', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco assedio'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAsHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.t = 1 - a.t; G.a0 = a.t; for (const c of G.chars) if (c.bot) c.alive = false; window.__as.setupHalf(G); G.me.x = cq.x = 33.5; G.me.y = cq.y = 22.5; return 'host: partita, amico attacca, bot fermi'; })()`, 3000],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, go(50.5, 51), 1200], [1, btn, 1500], [0, st('host'), 0],
  [1, go(37.5, 20.5), 1200], [1, btn, 1500], [0, st('host'), 0],
  [1, `(() => { const G = cq.g; return 'amico: oggetto al piede ' + (cqSolid[20][36] && cqSolid[20][36].prop) + ' | pulsante ' + $('#cqKill').textContent; })()`, 0],
  [1, btn, 2800], [1, st('amico'), 0], [0, st('host'), 0],
  // l'amico tira all'host (sul camminamento accanto)
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c.name === 'zzAsHost'); window.__as.fire(G, h.x, h.y); return 'amico tira verso ' + h.x.toFixed(1) + ',' + h.y.toFixed(1) + ' frecce mie ' + G.ar.length; })()`, 2000],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-2).join(' / '))()`, 0],
  // l'host rovescia la scala (l'amico e' gia' sopra)
  [0, `(() => { cq.x = 34.5; cq.y = 20.6; return 'host alla cima della scala'; })()`, 600],
  [0, `(() => { const t = $('#cqKill').textContent; cqMyKill(); return 'host preme: ' + t; })()`, 2500], [0, st('host'), 0],
  [1, `(() => { const G = cq.g, l = G.ld.find(l => l.st === 3); return 'amico: scala a terra ' + (l ? l.x + ',' + l.y + ' disegnata ' + (cqDeco[l.y][l.x]) : 'no') + ' | ' + __T.slice(-1)[0]; })()`, 0],
  // l'amico prende la bandiera, salta giu' dalle mura e corre all'accampamento
  [1, go(16.5, 18.6), 1500], [0, st('host'), 0],
  [1, go(34.5, 22.5), 1000], [1, btn, 1500], [1, st('amico'), 0],
  [1, go(53.5, 51.5), 1500], [0, st('host'), 0], [1, `(() => 'amico: ' + $('#cqCount').textContent + ' | ' + __T.slice(-2).join(' / '))()`, 0],
  [0, st('host'), 7000], [1, st('amico'), 0], [1, `(() => 'amico: barra ' + $('#cqModeBar').textContent)()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
