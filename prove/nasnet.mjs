// Nascondino online: host + amico (node prove/cdp2.mjs . prove/nasnet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: ruoli ' + G.chars.map(c => c.name + ':' + c.r).join(' ') + ' | amico vivo ' + a.alive + ' oggetto ' + JSON.stringify(a.pr) + ' cambi ' + a.chg + ' errori ' + a.err + ' stordito ' + Math.max(0, (a.stun || 0) - G.time).toFixed(1) + ' | corpi ' + G.bodies.length + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'nascondino' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { nascondino: { time: 240, seek: 1, hide: 20, map: 'studio', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco nascondino'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita: host cercatore, amico nascosto, computer fermi
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 1500)); const G = cq.g; G.pre = 0; for (const c of G.chars) { c.r = c === G.me ? 1 : 0; if (c.bot) { c.think = 999; c.path = []; } } return 'host: partita, io cercatore'; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, `(() => { const G = cq.g, P = CQ_PROPS.find(p => p[0] === 'crate' && cqCellFree(p[1] + 1, p[2]) && !CQ_PROPS.some(q => q !== p && Math.hypot(q[1] - p[1] - 1, q[2] - p[2]) < 1.7)); cq.x = P[1] + 1.5; cq.y = P[2] + 0.5; return 'amico vicino a una cassa: pulsante ' + $('#cqKill').textContent + ' | ' + $('#cqCount').textContent; })()`, 800],
  [1, `(() => { cqMyKill(); document.querySelector('#tkBody [data-v]').click(); return 'amico: trasformato ' + JSON.stringify(cq.g.me.pr) + ' | ' + __T.slice(-1)[0]; })()`, 1500],
  [0, st('host'), 0],
  [0, `(() => { const G = cq.g; return 'host durante la conta: schermo nero ' + !!(G.M.night(G)) + ' | ' + $('#cqCount').textContent + ' | pulsante nascosto ' + $('#cqKill').hidden; })()`, 0],
  // fine della conta: l'host va accanto all'amico e colpisce prima un oggetto vero lontano dall'amico, poi l'amico
  [0, `(() => { const G = cq.g; G.time = G.opt.hide + 0.1; const a = G.chars.find(c => c.name === 'zzAmico'), o = CQ_PROPS.find(p => ['plant', 'crate', 'lamp'].includes(p[0]) && Math.hypot(p[1] - a.x, p[2] - a.y) > 6 && cqCellFree(p[1] + 1, p[2])); cq.x = o[1] + 1.5; cq.y = o[2] + 0.5; return 'host: vicino a un oggetto vero (' + o[0] + ')'; })()`, 600],
  [0, `(() => { const G = cq.g; G.me.hitH = 0; cqMyKill(); return 'host: colpo -> ' + __T.slice(-1)[0] + ' | ' + $('#cqCount').textContent; })()`, 1500],
  [1, `(() => 'amico: ' + __T.slice(-2).join(' / '))()`, 0],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); G.me.stun = 0; G.me.hitH = 0; cq.x = a.x + 0.9; cq.y = a.y; return 'host: accanto all amico, bersaglio ' + JSON.stringify(G.M.btn(G)); })()`, 600],
  [0, `(() => { cqMyKill(); return 'host: colpo -> ' + __T.slice(-1)[0]; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | ' + $('#cqModeBar').textContent)()`, 0],
  // ruoli scambiati: l'amico (di nuovo vivo) cerca, io sono una cassa accanto a lui
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); a.alive = true; a.r = 1; G.me.r = 0; G.me.pr = ['crate', 0]; cq.x = a.x + 0.9; cq.y = a.y; return 'host: ora sono una cassa vicino all amico'; })()`, 1500],
  [1, `(() => { const G = cq.g; G.me.hitH = 0; const b = G.M.btn(G); cqMyKill(); return 'amico cercatore: pulsante ' + JSON.stringify(b); })()`, 1800],
  [0, st('host'), 0], [0, `(() => 'host: ' + __T.slice(-1)[0] + ' | io vivo ' + cq.g.me.alive)()`, 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0])()`, 0],
  [0, `(() => { const G = cq.g; return 'host: fine? ' + G.phase + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent : ''); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
