// Assedio al castello online (fasi): host + amico (node prove/cdp2.mjs . prove/asnet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAsAmico'), h = G.chars.find(c => c.name === 'zzAsHost');
  return '${who}: tempo ' + G.half + ' fase ' + G.ph + ' | ariete y ' + G.rm.y.toFixed(1) + ' (' + G.rm.n + ') portone ' + Math.round(G.gh) + (G.gopen ? ' APERTO' : '') + ' zona ' + Math.round(G.zp * 100) + '% | amico cuori ' + a.hp + ' pos ' + (a === G.me ? cq.x : a.x).toFixed(1) + ',' + (a === G.me ? cq.y : a.y).toFixed(1) + (a.cl ? ' SALE' : '') + (a.pu ? ' ' + a.pu.k : '') + ' | host cuori ' + h.hp + ' | scale ' + G.ld.map(l => l.st + (l.st === 2 ? '@' + l.s : '')).join(' ') + ' | olio ' + (G.burn && G.time < G.burn.e ? 'BRUCIA' : '-') + ' | gate solido ' + !!cqSolid[50][29] + ' | res ' + JSON.stringify(G.res); })()`;
const go = (x, y) => `(() => { cq.x = ${x}; cq.y = ${y}; return 'amico va a ${x},${y}'; })()`;
const btn = `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'amico preme: ' + t; })()`;
const hbtn = `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'host preme: ' + t; })()`;
export default [
  [0, name('zzAsHost'), 0], [1, name('zzAsAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'assedio' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { assedio: { time: 240, lit: 'd', map: 'castello', n: 4, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAsHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.t = 1 - a.t; G.a0 = a.t; for (const c of G.chars) if (c.bot) c.alive = false; window.__as.setupHalf(G); G.me.x = cq.x = 26.5; G.me.y = cq.y = 51.5; return 'host: partita, amico attacca, bot fermi, host al calderone'; })()`, 3000],
  [1, st('amico'), 0],
  // l'amico spinge l'ariete
  [1, `(() => { const G = cq.g; cq.x = 29.5; cq.y = Math.floor(G.rm.y + 1.7) + 1.35; return 'amico dietro l ariete'; })()`, 3000], [0, st('host'), 0],
  // al portone: l'amico carica tenendo premuto il pulsante grande e lascia
  [0, `(() => { const G = cq.g; G.rm.y = 53.4; return 'host: ariete portato al portone'; })()`, 800],
  [1, `(() => { const G = cq.g; cq.x = 29.5; cq.y = Math.floor(G.rm.y + 1.7) + 1.35; return 'amico dietro l ariete al portone'; })()`, 1200],
  [1, `(() => { const t = $('#cqKill').textContent; $('#cqKill').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'amico tiene premuto: ' + t; })()`, 1600],
  [0, `(() => { const a = cq.g.chars.find(c => c.name === 'zzAsAmico'); return 'host vede la carica: ' + (a.rc ? Math.round((cq.g.time - a.rc) * 100) / 100 + ' s' : 'NO') + ' | carica ariete ' + cq.g.rm.pl; })()`, 0],
  [1, `(() => { const t = $('#cqKill').textContent; $('#cqKill').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return 'amico lascia (' + t + ')'; })()`, 1500],
  [0, st('host'), 0],
  // scala: prende, appoggia, sale, va all'argano e lo gira
  [1, go(25.5, 78.5), 1200], [1, btn, 1200], [1, go(10.5, 53.5), 1200], [1, btn, 1200], [1, btn, 2500], [1, st('amico'), 0],
  [1, go(23.5, 49.5), 1200], [1, btn, 6200], [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-2).join(' / ') + ' | barra: ' + $('#cqModeBar').textContent)()`, 0],
  // olio: l'host lo versa sull'amico davanti al portone
  [1, go(29.5, 53.5), 800], [0, hbtn, 1500], [0, st('host'), 0],
  // cortile: l'amico sta nella zona (da solo)
  [1, `(() => { const G = cq.g; cq.x = window.__as.Z2.x; cq.y = window.__as.Z2.y + 1.5; return 'amico nel cortile'; })()`, 9000], [0, st('host'), 0],
  [1, `(() => { const G = cq.g; cq.x = window.__as.Z2.x; cq.y = window.__as.Z2.y + 1.5; return 'amico resta'; })()`, 9000], [0, st('host'), 0],
  [1, `(() => { const G = cq.g; return 'amico: porta del mastio solida ' + !!cqSolid[21][29] + ' | ' + $('#cqModeBar').textContent; })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
