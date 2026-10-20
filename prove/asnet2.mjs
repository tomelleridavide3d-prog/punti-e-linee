// Assedio online, passo B (classi): host + amico (node prove/cdp2.mjs . prove/asnet2.mjs)
// l'amico sceglie il guerriero, colpisce l'host con la spada, para una freccia con lo scudo; poi fa il genio e pianta una barricata, che l'host (guerriero) fa a pezzi
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  try { localStorage.setItem('asHelpN', '9'); localStorage.setItem('asCls', 'a'); } catch {}
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAsAmico'), h = G.chars.find(c => c.name === 'zzAsHost');
  return '${who}: amico ' + a.cls + (a.ncls ? '(→' + a.ncls + ')' : '') + ' cuori ' + a.hp + (a.sd ? ' SCUDO' : '') + ' colpi ' + (a.mh || 0) + ' parate ' + (a.blk || 0) + ' barricate ' + (a.bN || 0) + ' | host ' + h.cls + ' cuori ' + h.hp + ' | barricate in mappa ' + JSON.stringify((G.bw || []).map(b => [b.x, b.y, b.hp])) + ' celle ' + (G.bw || []).map(b => cqSolid[b.y][b.x] ? cqSolid[b.y][b.x].prop : 'vuota').join(','); })()`;
export default [
  [0, name('zzAsHost'), 0], [1, name('zzAsAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'assedio' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { assedio: { time: 240, lit: 'd', map: 'castello', n: 4, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAsHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.t = 1 - a.t; G.a0 = a.t; for (const c of G.chars) if (c.bot) c.alive = false; window.__as.setupHalf(G); G.me.x = cq.x = 20.5; G.me.y = cq.y = 66.5; return 'host: partita, amico attacca, bot fermi'; })()`, 3000],
  [1, st('amico'), 0],
  // l'amico va alla partenza e sceglie il guerriero dal pannello
  [1, `(async () => { cq.x = 29.5; cq.y = 79.5; await new Promise(r => setTimeout(r, 800)); window.__as.pickCls(cq.g, 'g'); return 'amico sceglie il guerriero: ' + cq.g.me.cls + ' | pulsante ' + $('#asBow').textContent; })()`, 1500],
  [0, st('host'), 0],
  // colpo di spada sull'host (vicino, sullo stesso piano)
  [1, `(() => { cq.x = 21.6; cq.y = 66.5; return 'amico accanto all host'; })()`, 1200],
  [1, `(() => { window.__as.meleeMe(cq.g); return 'amico: fendente'; })()`, 1500], [0, st('host'), 0],
  // scudo alzato, l'host tira una freccia dritta su di lui
  [1, `(() => { cq.x = 20.5; cq.y = 72.5; window.__as.setShield(cq.g, 1); return 'amico alza lo scudo a 6 caselle'; })()`, 1500],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.rl = 0; G.me.x = cq.x = 20.5; G.me.y = cq.y = 66.5; window.__as.mkArrow(G, G.me, a.x, a.y); return 'host tira: amico ' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' scudo ' + a.sd + ' verso ' + (a.sdA || 0).toFixed(2); })()`, 1800],
  [0, st('host'), 0], [1, `(() => { window.__as.setShield(cq.g, 0); return 'amico abbassa lo scudo'; })()`, 600],
  // genio alla partenza, poi pianta una barricata nell'accampamento
  [1, `(async () => { cq.x = 29.5; cq.y = 79.5; await new Promise(r => setTimeout(r, 800)); window.__as.pickCls(cq.g, 'n'); await new Promise(r => setTimeout(r, 1200)); cq.x = 20.5; cq.y = 78.6; cq.wdx = 0; cq.wdy = -1; await new Promise(r => setTimeout(r, 900)); const a = window.__as.action(cq.g, cq.g.me); return 'amico genio: ' + cq.g.me.cls + ' | pulsante grande: ' + (a ? a.t + (a.on ? ' (attivo)' : ' (spento)') : 'nessuno'); })()`, 300],
  [1, `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'amico preme: ' + t; })()`, 1800],
  [0, st('host'), 0], [1, st('amico'), 0],
  // l'host diventa guerriero e la fa a pezzi
  [0, `(async () => { const G = cq.g; G.me.sf = G.time + 2; window.__as.setCls(G, G.me, 'g'); const b = G.bw[0]; if (!b) return 'host: niente barricata'; G.me.x = cq.x = b.x + 0.5; G.me.y = cq.y = b.y - 0.8; for (let i = 0; i < 5; i++) { G.me.rl = 0; window.__as.melee(G, G.me); await new Promise(r => setTimeout(r, 200)); } return 'host guerriero: 5 colpi alla barricata, ne restano ' + G.bw.length; })()`, 1800],
  [1, st('amico'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
