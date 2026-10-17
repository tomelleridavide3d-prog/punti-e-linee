// La Cosa online: host (la Cosa) + amico (squadra). node prove/cdp2.mjs . prove/cosnet.mjs
// contagio di un computer, compito fatto dall'amico (-> kit), esame chiamato all'amico, elicottero con "Sali" -> vince la squadra
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; return '${who}: ' + G.chars.map(c => c.name + (c.th ? ':COSA' : '') + (c.alive ? '' : ':morto') + (c.on ? ':a bordo' : '') + (G.clear[c.id] ? ':verde' : '')).join(' ') + ' | radio ' + G.tk.done + '/' + G.tk.tot + ' kit ' + G.kits + ' (' + G.kp + ') | chiamata ' + JSON.stringify(G.call && [G.call.id, G.call.st]) + ' | elicottero ' + !!G.heli + ' | centro ' + $('#cqCount').textContent; })()`;
const btn = who => `(() => '${who} pulsante: ' + ($('#cqKill').hidden ? '-' : $('#cqKill').textContent))()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'cosa' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { cosa: { time: 420, nt: '1', nt5: 3, map: 'base', n: 6, fill: true } }); cqNetList(); return 'host: set aperto, gioco cosa'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2000)); const G = cq.g; G.pre = 0; G.time = 62; for (const c of G.chars) { c.th = c === G.me; c.ab = c.th ? 1 : 0; c.kcd = 0; if (c.bot) { c.think = 1e9; c.path = []; } } const B = G.chars.filter(c => c.bot), PL = [[26.5, 51.5], [56.5, 40.5], [58.5, 24.5], [58.5, 28.5]]; B.forEach((b, i) => { b.x = PL[i][0]; b.y = PL[i][1]; }); cq.x = 26.5; cq.y = 50.6; return 'host: partita'; })()`, 2500],
  [1, `(() => { cq.x = 27.5; cq.y = 25.5; return 'amico in dormitorio'; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0], [0, btn('host'), 0],
  [0, `(() => { cqMyKill(); const a = !!$('#akA'); if (a) $('#akA').click(); return 'host: menu ' + a + ' -> ' + __T.slice(-1)[0]; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(() => { cq.g.kp = 3; return 'host: kp 3'; })()`, 300],
  [1, `(() => { const G = cq.g, T = G.M.TASKS, i = G.me.tl.find(i => !T[i][5]); const s = cqSpot(T[i][3], T[i][4]); cq.x = s.x; cq.y = s.y; window.__I = i; return 'amico vicino a ' + T[i][1]; })()`, 900],
  [1, btn('amico'), 0],
  [1, `(() => { cqMyKill(); const t = $('#tkTitle').textContent; cqCloseTask(); cqNetSend({ k: 'task', i: __I }); return 'amico: mini-gioco ' + t + ' aperto, compito mandato'; })()`, 1800],
  [0, st('host'), 0], [1, st('amico'), 0], [1, `(() => 'amico: ' + __T.slice(-2).join(' / '))()`, 0],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); G.call = { id: a.id, st: 0, end: G.time + 40 }; return 'host: chiamata all amico'; })()`, 1200],
  [1, st('amico'), 0],
  [1, `(() => { cq.x = 53.5; cq.y = 25.5; return 'amico al bancone'; })()`, 3000],
  [0, st('host'), 0],
  [1, `(() => 'amico (durante): ' + $('#cqCount').textContent)()`, 9000],
  [0, st('host'), 0], [1, st('amico'), 0], [1, `(() => 'amico: ' + __T.slice(-2).join(' / '))()`, 0],
  [0, `(() => { const G = cq.g; G.heli = { t: G.time - 9 }; return 'host: elicottero atterrato'; })()`, 1500],
  [1, `(() => { cq.x = 54.5; cq.y = 57.5; return 'amico sulla piazzola'; })()`, 1200],
  [1, btn('amico'), 0],
  [1, `(() => { cqMyKill(); return 'amico: preme Sali'; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(() => { const G = cq.g; G.heli.t = G.time - 9 - 39; return 'host: si parte'; })()`, 8500],
  [0, `(() => { const G = cq.g; return 'host: ' + G.phase + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent : __T.slice(-1)[0]); })()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: ' + G.phase + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent : __T.slice(-1)[0]); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
