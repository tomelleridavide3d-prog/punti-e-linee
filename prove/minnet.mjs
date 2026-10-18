// Il Minotauro online: host (esploratore) + amico (Minotauro) (node prove/cdp2.mjs . prove/minnet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
// impronta dei muri (segmenti chiusi) per confrontare host e amico
const walls = `CQ_MAP.S.map(s => cqSolid[s.c[0][1]][s.c[0][0]] ? 1 : 0).join('')`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'), h = G.chars.find(c => c.name === 'zzHost'); return '${who}: amico minotauro ' + !!a.mino + ' t ' + a.t + ' | host vivo ' + h.alive + ' stordito ' + Math.max(0, (h.slow || 0) - G.time).toFixed(1) + ' | cristalli ' + G.cs.join('') + ' esplorate ' + G.ex.reduce((s, v) => s + v, 0) + ' | segni ' + G.mk.length + ' | muri v' + G.wv + ' ' + (${walls}).slice(0, 40) + ' | corpi ' + G.bodies.length + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'minotauro' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { minotauro: { time: 420, wall: 60, tm: 2, mino: 'p', map: 'labirinto', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco minotauro'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita: l'amico e' il Minotauro, l'host esploratore Rossi, computer fermi
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAmico');
    for (const c of G.chars) { c.mino = false; c.dname = null; if (c.t === -1) c.t = 0; } a.mino = true; a.t = -1; a.dname = '🐂 ' + a.name; G.me.t = 0;
    for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; } return 'host: partita ' + G.mode + ', mappa ' + cq.map + ' seme ' + cq.mapSeed; })()`, 3000],
  [1, `(() => { const G = cq.g; return 'amico: partita ' + (G && G.mode) + ' mappa ' + cq.map + ' seme ' + cq.mapSeed + ' | io minotauro ' + !!G.me.mino + ' | gesso visibile ' + !$('#mnChalk').hidden + ' | pulsante ' + JSON.stringify(G.M.btn(G)) + ' | ' + $('#cqModeBar').textContent; })()`, 0],
  [0, `(() => 'host: gesso visibile ' + !$('#mnChalk').hidden + ' | ' + $('#cqModeBar').textContent)()`, 0],
  [0, st('host'), 0],
  // l'host va su un frammento e lo copia
  [0, `(() => { const f = CQ_MAP.frag[0], q = cqSpot(f.cx, f.cy); cq.x = q.x; cq.y = q.y; return 'host accanto al cristallo'; })()`, 500],
  [0, `(() => { const b = cq.g.M.btn(cq.g); cqMyKill(); return 'host: ' + JSON.stringify(b) + ' -> ' + $('#cqCount').textContent; })()`, 3800],
  [0, `(() => 'host: ' + __T.slice(-1)[0])()`, 0], [1, st('amico'), 0],
  // l'host lascia un segno col gesso
  [0, `(() => { cq.wdx = 0; cq.wdy = 1; $('#mnChalk').click(); return 'host: segno a ' + Math.floor(cq.x) + ',' + Math.floor(cq.y); })()`, 1800],
  [1, `(() => { const G = cq.g, m = G.mk[0]; return 'amico: segni ' + G.mk.length + (m ? ' a ' + m.x + ',' + m.y + ' dir ' + m.d + ' squadra ' + m.t + ' deco ' + cqDeco[m.y][m.x] : ''); })()`, 0],
  // il Minotauro (amico) muggisce vicino all'host (l'host azzera la sua attesa)
  [0, `(() => { cq.g.chars.find(c => c.name === 'zzAmico').rcd = 0; return 'host: muggito pronto'; })()`, 600],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c.name === 'zzHost'); const q = cqSpot(Math.floor(h.x) + 3, Math.floor(h.y)); cq.x = h.x + 3 > 0 ? h.x : h.x; cq.y = h.y; for (let d = 3; d > 1; d--) { if (cqCellFree(Math.floor(h.x + d), Math.floor(h.y))) { cq.x = h.x + d; break; } } h.x; cq.g.me.rcd = 0; return 'amico vicino all host (' + Math.hypot(cq.x - h.x, cq.y - h.y).toFixed(1) + ')'; })()`, 700],
  [1, `(() => { const b = cq.g.M.btn(cq.g); cqMyKill(); return 'amico: ' + JSON.stringify(b); })()`, 900],
  [0, `(() => { const G = cq.g; return 'host: stordito ' + Math.max(0, G.me.slow - G.time).toFixed(1) + ' trema ' + $('#cqCanvas').style.transform + ' | ' + $('#cqCount').textContent + ' | ' + __T.slice(-1)[0]; })()`, 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | pulsante ' + JSON.stringify(cq.g.M.btn(cq.g)))()`, 0],
  // i muri si spostano tra poco: avviso e confronto host/amico
  [0, `(() => { const G = cq.g; G.next = G.time + 6.5; return 'host: cambio tra 6,5 s'; })()`, 3000],
  [1, `(() => { const G = cq.g; return 'amico: avviso ' + !!G.pend + ' caselle che cambiano ' + (G.pc || []).length + ' | ' + $('#cqCount').textContent; })()`, 5000],
  [0, `(() => 'host muri: v' + cq.g.wv + ' ' + ${walls})()`, 0],
  [1, `(() => 'amico muri: v' + cq.g.wv + ' ' + ${walls})()`, 0],
  // il Minotauro prende l'host
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c.name === 'zzHost'); cq.x = h.x; cq.y = h.y; return 'amico addosso all host'; })()`, 1500],
  [0, `(() => { const G = cq.g; return 'host: vivo ' + G.me.alive + ' | ' + __T.slice(-1)[0] + ' | ' + $('#cqCount').textContent; })()`, 0],
  [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | ' + $('#cqModeBar').textContent)()`, 0],
  // fine a tempo scaduto: vince il Minotauro
  [0, `(() => { cq.g.left = 0.3; return 'host: tempo quasi finito'; })()`, 2500],
  [0, `(() => 'host: ' + $('#tkTitle').textContent + ' / ' + ($('#tkBody .lead') || {}).textContent)()`, 0],
  [1, `(() => 'amico: ' + $('#tkTitle').textContent + ' / ' + ($('#tkBody .lead') || {}).textContent)()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
