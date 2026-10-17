// Naufraghi online: host + amico (node prove/cdp2.mjs . prove/naunet.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'), K = CQ_LIB.oggetti; return '${who}: amico squadra ' + a.t + ' vite ' + a.lv + ' preso ' + Math.max(0, (a.jail || 0) - G.time).toFixed(1) + ' nascosto ' + a.hd + ' monete ' + a.co + ' pistola ' + a.gun + ' | in mano ' + ((K.held(G, a) || {}).k || '-') + ' | zattere ' + [0, 1].map(t => K.count(G, t)).join('-') + ' | porte ' + G.R.p.join('') + ' | corpi ' + G.bodies.length + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'naufraghi' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { naufraghi: { time: 420, map: 'isola', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco naufraghi'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita: host Granchi, amico Delfini, computer fermi
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAmico'); G.me.t = 0; a.t = 1; for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; } return 'host: partita ' + G.mode + ', mappa ' + cq.map + ' seme ' + cq.mapSeed; })()`, 3000],
  [1, `(() => { const G = cq.g; return 'amico: partita ' + (G && G.mode) + ' mappa ' + cq.map + ' seme ' + cq.mapSeed + ' pezzi ' + (G && G.it ? G.it.length : '-') + ' | ' + $('#cqModeBar').textContent; })()`, 0],
  [0, st('host'), 0],
  // l'amico va su un tronco: lo prende (lo decide l'host)
  [1, `(() => { const G = cq.g, it = G.it.find(i => i.k === 'log' && i.st === 0); cq.x = it.x; cq.y = it.y; return 'amico sul tronco ' + it.id; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  // l'amico porta il tronco alla sua zattera
  [1, `(() => { const G = cq.g, c = CQ_MAP.camps[1], q = cqSpot(c.rx, c.ry); cq.x = q.x; cq.y = q.y; return 'amico alla zattera'; })()`, 1500],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-1)[0])()`, 0],
  // l'host colpisce l'amico
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); cq.x = a.x + 0.8; cq.y = a.y; return 'host accanto all amico: ' + JSON.stringify(G.M.btn(G)); })()`, 700],
  [0, `(() => { cqMyKill(); return 'host: ' + __T.slice(-1)[0]; })()`, 1200],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | ' + $('#cqCount').textContent)()`, 0],
  [1, `(() => { const G = cq.g, c = CQ_MAP.camps[1]; return 'amico risorto? posizione ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' campo ' + c.cx + ',' + c.cy; })()`, 6000],
  // l'amico si nasconde vicino a un cespuglio
  [1, `(() => { const G = cq.g; let b = null; for (let y = 0; y < CQ_H && !b; y++) for (let x = 0; x < 120 && !b; x++) if (cqDeco && cqDeco[y][x] === 'bush' && cqCellFree(x, y)) b = [x, y]; cq.x = b[0] + 0.5; cq.y = b[1] + 0.5; return 'amico vicino a un cespuglio'; })()`, 800],
  [1, `(() => { const b = cq.g.M.btn(cq.g); cqMyKill(); return 'amico: pulsante ' + JSON.stringify(b) + ' -> ' + $('#cqCount').textContent; })()`, 1200],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); return 'host vede l amico nascosto? ' + !G.M.hide(a) + ' (hd ' + a.hd + ')'; })()`, 0],
  // nelle rovine: l'amico entra dal suo ingresso, poi risolve gli ingranaggi
  [1, `(() => { const m = CQ_MAP.mouths[1]; cq.x = m.tx + 0.5; cq.y = m.ty + 0.5; return 'amico all ingresso delle rovine'; })()`, 800],
  [1, `(() => { const G = cq.g; return 'amico: ora a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (rovine da x ' + 82 + ') buio ' + (G.M.night(G) || {}).a; })()`, 0],
  [1, `(() => { const G = cq.g, H = CQ_MAP.RZ.half[1]; cq.x = H.gear.x; cq.y = H.gear.y; return 'amico alla porta: ' + JSON.stringify(G.M.btn(G)); })()`, 600],
  [1, `(() => { cqMyKill(); const s = cq.nfGear[CQ_MAP.seed + ':' + CQ_MAP.RZ.half[1].g[2]], s0 = s.join('');
    const tr = (a, i, d) => { a = a.slice(); a[i] = (a[i] + d + 8) % 8; if (i > 0) a[i - 1] = (a[i - 1] - d + 8) % 8; if (i < 3) a[i + 1] = (a[i + 1] - d + 8) % 8; return a; };
    const prev = { [s0]: null }, q = [s.slice()]; let end = null;
    while (q.length) { const a = q.shift(), k = a.join(''); if (k === '0000') { end = k; break; } for (let i = 0; i < 4; i++) for (const d of [1, -1]) { const b = tr(a, i, d), kb = b.join(''); if (!(kb in prev)) { prev[kb] = [k, i, d]; q.push(b); } } }
    const mv = []; for (let k = end; prev[k]; k = prev[k][0]) mv.unshift(prev[k].slice(1));
    for (const [i, d] of mv) document.querySelector('#tkBody [data-r="' + i + '"][data-d="' + d + '"]').click();
    return 'amico: ruote ' + s0 + ' -> ' + s.join('') + ' in ' + mv.length + ' mosse'; })()`, 1500],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-1)[0] + ' | porta aperta qui ' + cq.g.R.o.join(''))()`, 0],
  // mercante: l'host regala 5 monete all'amico, l'amico compra la pistola
  [0, `(() => { const a = cq.g.chars.find(c => c.name === 'zzAmico'); a.co = 5; return 'host: 5 monete all amico'; })()`, 800],
  [1, `(() => { const G = cq.g, t = CQ_MAP.top.trader, q = cqSpot(t[0], t[1]); cq.x = q.x; cq.y = q.y; return 'amico dal mercante: ' + JSON.stringify(G.M.btn(G)); })()`, 700],
  [1, `(() => { cqMyKill(); document.querySelector('#tkBody [data-b="1"]').click(); return 'amico: ' + __T.slice(-1)[0]; })()`, 1500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
