// La Cosa online: host (la Cosa) + amico (squadra). node prove/cdp2.mjs . prove/cosnet.mjs
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; return '${who}: ' + G.chars.map(c => (c.name) + (c.th ? ':COSA' : '') + (c.alive ? '' : ':morto') + (c.disg ? ':sembra ' + G.chars.find(o => o.id === c.disg.id).name : '')).join(' ') + ' | corpi ' + G.bodies.length + ' | riunione ' + !!G.mt + ' | lanciafiamme ' + JSON.stringify(G.fl) + ' | ' + $('#cqModeBar').textContent + ' | pulsante ' + ($('#cqKill').hidden ? '-' : $('#cqKill').textContent); })()`;
const last = who => `(() => '${who}: ' + __T.slice(-2).join(' / '))()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'cosa' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { cosa: { time: 360, nt: '1', kits: 3, map: 'base', n: 6, fill: true } }); cqNetList(); return 'host: set aperto, gioco cosa'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  // partita: io (host) sono la Cosa, l'amico in dormitorio, i computer fermi nell'hangar
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2000)); const G = cq.g; G.pre = 0; for (const c of G.chars) { c.th = c === G.me; c.kcd = 0; if (c.bot) { c.think = 1e9; c.path = []; } } const B = G.chars.filter(c => c.bot); const PL = [[14.5, 39.5], [44.5, 28.5], [46.5, 12.5], [46.5, 16.5]]; B.forEach((b, i) => { b.x = PL[i][0]; b.y = PL[i][1]; }); cq.x = 14.5; cq.y = 38.6; return 'host: partita'; })()`, 2500],
  [1, `(() => { cq.x = 15.5; cq.y = 13.5; return 'amico in dormitorio | centro ' + $('#cqCount').textContent; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(() => { cqMyKill(); return 'host attacca: ' + __T.slice(-1)[0]; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(() => { cqMyKill(); return 'host assorbe: ' + __T.slice(-1)[0] + ' | io sembro ' + (cq.g.disg ? cq.g.chars[cq.g.disg.id].name : '-'); })()`, 1500],
  [1, st('amico'), 0],
  // seconda vittima, lasciata a terra: l'amico la trova e chiama la riunione
  [0, `(() => { const G = cq.g; G.me.kcd = 0; const b = G.chars.filter(c => c.bot && c.alive)[0]; cq.x = b.x - 0.9; cq.y = b.y; return 'host vicino a ' + b.name + ': ' + $('#cqKill').textContent; })()`, 800],
  [0, `(() => { cqMyKill(); cq.x = 30.5; cq.y = 28.5; return 'host attacca e scappa in magazzino'; })()`, 1500],
  [1, `(() => { const G = cq.g, b = G.bodies[0]; if (!b) return 'amico: nessun corpo!'; cq.x = b.x + 0.8; cq.y = b.y; return 'amico vicino al corpo'; })()`, 1000],
  [1, `(() => { const p = $('#cqKill').textContent; cqMyKill(); return 'amico preme ' + p; })()`, 2000],
  [0, `(() => 'host: ' + $('#tkTitle').textContent + ' | ' + __T.slice(-1)[0])()`, 0], [1, `(() => 'amico: ' + $('#tkTitle').textContent + ' | ' + ($('#tkBody').textContent || '').replace(/\\s+/g, ' ').slice(0, 260))()`, 0],
  [1, `(() => { $('#ctOk').click(); return 'amico: ho finito'; })()`, 800], [0, `(() => { $('#ctOk').click(); return 'host: ho finito'; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  // l'amico prende il lanciafiamme e brucia l'host
  [1, `(() => { cq.x = 36.5; cq.y = 28.5; return 'amico al lanciafiamme'; })()`, 1000],
  [1, `(() => { const p = $('#cqKill').textContent; cqMyKill(); return 'amico preme ' + p; })()`, 1500],
  [0, `(() => { cq.x = 35.2; cq.y = 28.5; return 'host vicino all amico'; })()`, 1200],
  [1, st('amico'), 0],
  [1, `(() => { const p = $('#cqKill').textContent; cqMyKill(); return 'amico preme ' + p; })()`, 2500],
  [0, `(() => { const G = cq.g; return 'host: ' + G.phase + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent : __T.slice(-1)[0]); })()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: ' + G.phase + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent : __T.slice(-1)[0]); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
