const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; return '${who}: gen ' + G.gens.map(g => g.x + ',' + g.y + (g.on ? '*' : '')).join(' ') + ' furgone ' + G.van.x + ',' + G.van.y + (G.van.open ? ' APERTO' : '') + ' | io ' + (G.me.m ? 'mostro' : 'sopravv.') + (G.me.alive ? '' : ' (fuori)') + ' | mostro ' + G.chars.find(c => c.m).name + ' stun ' + Math.max(0, G.chars.find(c => c.m).stun - G.time).toFixed(1) + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'mostro', n: 6 }); cqNetList(); return 'host: set aperto, gioco mostro'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set, lista: ' + $('#hlInfo').textContent.slice(0, 50); })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 1500)); const G = cq.g, a = G.chars.find(c => c.remote); G.chars.forEach(c => { c.m = false; c.fl = 3; }); const Mo = G.chars.find(c => c.bot); Mo.m = true; Mo.fl = 0; G.me.m = false; G.pre = 0; G.time = 12; G.chars.forEach(c => { c.alive = true; c.ct = 0; c.stun = 0; }); Mo.x = 3.5; Mo.y = 3.5; for (let i = 0; i < 50; i++) { const f = cqModeFree(); if (f && Math.hypot(f.x - 30, f.y - 24) > 18) { Mo.x = f.x; Mo.y = f.y; break; } } Mo.path = []; Mo.cd = G.time + 60; Mo.think = 99; return 'host: partita, amico = ' + a.name + ', mostro = ' + Mo.name; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  // il mostro davanti all'amico, l'amico gli punta la torcia
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote), Mo = G.chars.find(c => c.m); for (const [dx, dy] of [[1.5, 0], [0, 1.5], [-1.5, 0], [0, -1.5]]) { const x = a.x + dx, y = a.y + dy; if (cqFree(x, y)) { Mo.x = x; Mo.y = y; Mo.path = []; Mo.think = 9; Mo.cd = G.time + 30; break; } } return 'host: mostro vicino all amico (dist ' + Math.hypot(Mo.x - a.x, Mo.y - a.y).toFixed(1) + ')'; })()`, 800],
  [1, `(() => { const G = cq.g, Mo = G.chars.find(c => c.m); cq.wdx = Mo.x - cq.x; cq.wdy = Mo.y - cq.y; cqMyKill(); return 'amico: lampo verso il mostro (torce ' + G.me.fl + ')'; })()`, 1200],
  [0, `(() => { const G = cq.g, Mo = G.chars.find(c => c.m); return 'host: mostro accecato ' + (Mo.stun > G.time) + ', torce amico ' + G.chars.find(c => c.remote).fl + ' | ' + __T.slice(-1)[0]; })()`, 0],
  [1, st('amico'), 0],
  // il mostro prende l'amico
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote), Mo = G.chars.find(c => c.m); Mo.stun = 0; Mo.cd = 0; Mo.x = a.x; Mo.y = a.y; return 'host: il mostro tocca l amico'; })()`, 1500],
  [1, `(() => 'amico: ' + (cq.g.me.alive ? 'ancora vivo' : 'preso') + ' | ' + __T.slice(-1)[0])()`, 0],
  // generatori tutti accesi: il furgone si apre anche per l'amico
  [0, `(() => { cq.g.gens[0].p = 0.999; return 'host: primo generatore al 99,9%'; })()`, 2500],
  [1, st('amico'), 0], [0, `(() => { cq.g.gens.forEach(g => { g.p = 1; }); return 'host: tutti i generatori finiti'; })()`, 2500], [1, st('amico'), 0], [1, `(() => 'amico messaggi: ' + __T.slice(-3).join(' / '))()`, 0],
  [0, st('host'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
