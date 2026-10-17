// Ruba la bandiera online: host + amico (node prove/cdp2.mjs . prove/bannet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: basi ' + G.B.map(b => b.x + ',' + b.y).join(' / ') + ' | squadre ' + G.chars.map(c => c.name + ':' + c.t).join(' ') + ' | bandiere ' + G.F.map(f => f.st + '/' + f.c).join(' ') + ' | amico torcia ' + a.tc + ' prigione ' + Math.max(0, (a.jail || 0) - G.time).toFixed(1) + ' pos ' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'bandiera' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { bandiera: { time: 300, pts: 3, map: 'bosco', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco bandiera'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 1500)); const G = cq.g; G.pre = 0; for (const c of G.chars) if (c.bot) { c.alive = false; } return 'host: partita, bot fermi'; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, `(() => { cqMyKill(); return 'amico: torcia ' + cq.g.me.tc + ' | pulsante ' + $('#cqKill').textContent; })()`, 1500],
  [0, st('host'), 0],
  // l'amico va sulla bandiera nemica
  [1, `(() => { const G = cq.g, b = G.B[1 - G.me.t]; cq.x = b.x; cq.y = b.y; return 'amico: sulla bandiera nemica'; })()`, 1500],
  [0, st('host'), 0], [1, `(() => 'amico: ' + $('#cqCount').textContent + ' | ' + __T.slice(-1)[0])()`, 0],
  // un nemico (bot riacceso) lo tocca: va in prigione alla sua base e la bandiera cade
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'), e = G.chars.find(c => c.bot && c.t !== a.t); e.alive = true; e.x = a.x; e.y = a.y; e.think = 999; e.path = []; return 'host: ' + e.name + ' tocca l amico'; })()`, 1500],
  [0, `(() => { const G = cq.g, e = G.chars.find(c => c.bot && c.alive); e.alive = false; return 'host: ' + __T.slice(-1)[0]; })()`, 0],
  [1, `(() => { const G = cq.g, b = G.B[G.me.t]; return 'amico: ' + $('#cqCount').textContent + ' | distanza dalla mia base ' + Math.hypot(cq.x - b.x, cq.y - b.y).toFixed(1) + ' | ' + __T.slice(-1)[0]; })()`, 5500],
  [0, st('host'), 0],
  // l'amico riprende la bandiera a terra e la porta a casa
  [1, `(() => { const G = cq.g, f = G.F[1 - G.me.t]; cq.x = f.x; cq.y = f.y; return 'amico: sulla bandiera a terra (' + f.st + ')'; })()`, 1500],
  [1, `(() => { const G = cq.g, b = G.B[G.me.t]; cq.x = b.x; cq.y = b.y; return 'amico: a casa'; })()`, 1500],
  [0, st('host'), 0], [1, `(() => 'amico: ' + $('#cqModeBar').textContent + ' | ' + __T.slice(-2).join(' / '))()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: voce compagno ' + G.M.voice(G, G.chars.find(c => c !== G.me && c.t === G.me.t) || G.me) + ' nemico ' + G.M.voice(G, G.chars.find(c => c.t !== G.me.t)); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
