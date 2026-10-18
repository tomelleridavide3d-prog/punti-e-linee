// Mister X online: host (detective) + amico (Mister X) (node prove/cdp2.mjs . prove/mxnet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: amico X ' + !!a.mx + ' trav ' + a.dg + ' fuori ' + a.out + ' | colpi ' + G.nrob + '/' + G.need + ' rob ' + G.rob.join(',') + ' | amico a ' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' | ' + $('#cqModeBar').textContent; })()`;
const tap = n => `(async () => { const b = $('#mxTap'); if (b.hidden) return 'pulsante del duello nascosto!'; for (let i = 0; i < ${n}; i++) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(r => setTimeout(r, 40)); } return 'toccato ${n} volte (' + b.textContent + ')'; })()`;
const near = `(async () => { const G = cq.g, h = G.chars.find(c => c.name === 'zzHost'); for (const d of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) if (cqFree(h.x + d[0], h.y + d[1])) { cq.x = h.x + d[0]; cq.y = h.y + d[1]; break; } return 'amico accanto all host (' + Math.hypot(cq.x - h.x, cq.y - h.y).toFixed(2) + ')'; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'misterx' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { misterx: { time: 420, flash: 30, mx: 'p', map: 'citta', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco misterx'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita: l'amico e' Mister X, l'host detective, computer fermi
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 3000)); const G = cq.g; G.pre = 0; G.nf = G.time + 1e5; const a = G.chars.find(c => c.name === 'zzAmico');
    for (const c of G.chars) { c.mx = false; c.dname = null; c.t = 0; } a.mx = true; a.t = -1; a.dname = '🎩 ' + a.name;
    for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 2.5; c.y = 2.5; } return 'host: partita ' + G.mode + ', mappa ' + cq.map + ' seme ' + cq.mapSeed; })()`, 3000],
  [1, `(() => { const G = cq.g; return 'amico: partita ' + (G && G.mode) + ' seme ' + cq.mapSeed + ' | io X ' + !!G.me.mx + ' | scatto visibile ' + !$('#mxSpr').hidden + ' cattura ' + !$('#mxCat').hidden + ' | passanti ' + CQ_MAP.PR.length + ' (primo a ' + G.pp[0].x.toFixed(2) + ',' + G.pp[0].y.toFixed(2) + ' t ' + G.time.toFixed(1) + ') | ' + $('#cqModeBar').textContent; })()`, 0],
  [0, `(() => { const G = cq.g; return 'host: cattura visibile ' + !$('#mxCat').hidden + ' scatto ' + !$('#mxSpr').hidden + ' | primo passante a ' + G.pp[0].x.toFixed(2) + ',' + G.pp[0].y.toFixed(2) + ' t ' + G.time.toFixed(1) + ' | ' + $('#cqModeBar').textContent; })()`, 0],
  // COLPO: l'amico va davanti al primo negozio e ruba (allarme dopo 2 s, colpo dopo 6 s)
  [1, `(() => { const l = CQ_MAP.loot[0]; cq.x = l.sx; cq.y = l.sy; return 'amico davanti al negozio'; })()`, 600],
  [1, `(() => { const b = cq.g.M.btn(cq.g); cqMyKill(); return 'amico: ' + JSON.stringify(b); })()`, 3200],
  [0, `(() => 'host: ' + __T.slice(-1)[0])()`, 4200],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-2).join(' / '))()`, 0],
  // TRAVESTIMENTO
  [1, `(() => { const b = cq.g.M.btn(cq.g); cq.g.me.dgc = 0; return 'amico: ' + JSON.stringify(b); })()`, 1200],
  [1, `(() => { const G = cq.g; G.me.dgc = 0; const b = G.M.btn(G); cqMyKill(); return 'amico: ' + JSON.stringify(b); })()`, 2600],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'), d = G.M.draw(a); return 'host: amico travestito ' + a.dg + ' cariche ' + a.dgN + ' | nascosto come personaggio ' + G.M.hide(a) + ' | tra i passanti ' + G.M.extras(G).some(e => Math.abs(e.x - a.x) < 0.01) + ' | taccuino ' + G.tb.map(q => q.e).join(''); })()`, 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | ' + $('#cqCount').textContent)()`, 0],
  // METRO
  [1, `(() => { const m = CQ_MAP.metro[0]; cq.x = m.sx; cq.y = m.sy; return 'amico alla metro ' + m.n; })()`, 700],
  [1, `(() => { const b = cq.g.M.btn(cq.g); cqMyKill(); const bs = [...document.querySelectorAll('#tkBody [data-st]')]; const t = $('#tkTitle').textContent; bs[1].click(); return 'amico: ' + JSON.stringify(b) + ' / ' + t + ' fermate ' + bs.length; })()`, 4200],
  [1, `(() => { const M = CQ_MAP, i = M.metro.findIndex(m => Math.hypot(m.sx - cq.x, m.sy - cq.y) < 0.6); return 'amico uscito dalla metro ' + (i >= 0 ? M.metro[i].n : '?') + ' | ' + __T.slice(-1)[0]; })()`, 0],
  [0, `(() => 'host: ' + __T.slice(-1)[0])()`, 0],
  // DUELLO 1: l'host prende l'amico, l'amico tocca di piu' -> si libera
  [1, near, 1200],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); a.dg = 0; G.me.cc = 0; const on = $('#mxCat').classList.contains('on'); $('#mxCat').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'host: cattura (acceso ' + on + ', distanza ' + Math.hypot(a.x - cq.x, a.y - cq.y).toFixed(2) + ') duello ' + !!G.du; })()`, 300],
  [1, tap(16), 0], [0, tap(5), 3200],
  [0, `(() => 'host: ' + __T.slice(-1)[0] + ' | stordito ' + Math.max(0, cq.g.me.stun - cq.g.time).toFixed(1))()`, 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | intoccabile ' + Math.max(0, cq.g.me.inv - cq.g.time).toFixed(1))()`, 0],
  // DUELLO 2: l'host tocca di piu' -> ammanettato, vincono i detective
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); a.inv = 0; G.me.stun = 0; G.me.cc = 0; return 'host: pronto'; })()`, 300],
  [1, near, 1200],
  [0, `(() => { const G = cq.g; G.me.cc = 0; $('#mxCat').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'host: cattura, duello ' + !!G.du; })()`, 300],
  [0, tap(22), 0], [1, tap(3), 3500],
  [0, `(() => 'host: ' + $('#tkTitle').textContent + ' / ' + ($('#tkBody .lead') || {}).textContent)()`, 0],
  [1, `(() => 'amico: ' + $('#tkTitle').textContent + ' / ' + ($('#tkBody .lead') || {}).textContent)()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
