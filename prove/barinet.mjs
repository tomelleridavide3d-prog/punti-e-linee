// Duello all'alba dei bari online (node prove/cdp2.mjs . prove/barinet.mjs): host + amico, tamburi, tre passi, campana,
// chi spara prima (dito piu' veloce), pallini uguali sui due telefoni, ricarica dell'amico, fine manche
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  try { localStorage.setItem('bariHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const look = who => `(() => { const G = cq.g, B = window.__bari; if (!G || !G.st) return '${who}: nessuna partita'; const o = G.chars.find(c => c !== G.me), st = G.st;
  return '${who}: fase ' + st.ph + ' manche ' + st.n + ' | io ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' | altro ' + o.x.toFixed(1) + ',' + o.y.toFixed(1) + ' | pallini io ' + (B.PS(G, G.me).f || []).join('') + ' altro ' + (B.PS(G, o).f || []).join('') + ' | mio tamburo ' + (B.U2.myD || []).join('') + ' | spari ' + st.sh.map(e => e[2] + ':' + e[3]).join(',') + ' | ' + $('#cqModeBar').textContent; })()`;
// spara da solo dopo "ms" millisecondi da quando suona la campana (una volta per rintocco)
const auto = (ms, a) => `(() => { const B = window.__bari; clearInterval(window.__auto); window.__auto = setInterval(() => { const G = cq.g; if (!G || !G.st) return; const k = B.winOpen(G, B.lt(G)); if (k < 0 || window.__k === k) return; if (B.lt(G) - B.tb(G, k) >= ${ms} / 1000) { window.__k = k; B.myAct(G, '${a}'); } }, 20); return 'spara da solo dopo ${ms} ms'; })()`;
const stop = `(() => { clearInterval(window.__auto); return 'fermo'; })()`;
export default [
  [0, name('zzBaHost'), 0], [1, name('zzBaAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'bari' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { bari: { map: 'bari', n: 2, fill: true } }); cqNetList(); return 'host: set aperto, gioco bari'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzBaHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); cqCloseTask(); const G = cq.g; return 'host: partita ' + G.mode + ', personaggi ' + G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', '); })()`, 1500],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode) + ', pannello del tamburo ' + !!document.getElementById('baLoad'); })()`, 0],
  // tamburi: l'amico mette i veri all'inizio, l'host alla fine
  [1, `(() => { const B = window.__bari, G = cq.g; for (const i of [0, 1, 2]) document.querySelector('#baLoad .ch[data-i="' + i + '"]').click(); document.querySelector('#baLoad .ok').click(); return 'amico: tamburo ' + B.U2.d.join('') + ' pronto ' + B.U2.rdy; })()`, 600],
  [0, `(() => { const B = window.__bari, G = cq.g, o = G.chars.find(c => c.remote); return 'host: pronti ' + JSON.stringify(G.st.rd) + ', tamburo amico arrivato ' + (G.drum[o.id] || []).join(''); })()`, 0],
  [0, `(() => { const B = window.__bari, G = cq.g; for (const i of [3, 4, 5]) document.querySelector('#baLoad .ch[data-i="' + i + '"]').click(); document.querySelector('#baLoad .ok').click(); return 'host: tamburo ' + B.U2.d.join('') + ', fase ' + G.st.ph; })()`, 1800],
  [1, look('amico (tre passi)'), 0], [0, look('host (tre passi)'), 3200],
  [0, look('host (duello)'), 0], [1, look('amico (duello)'), 0],
  // primo rintocco: l'amico spara dopo 150 ms (vero), l'host dopo 450 ms (salve): vince l'amico se l'host e' allo scoperto
  [1, auto(150, 's'), 0], [0, auto(450, 's'), 4500],
  [0, look('host'), 0], [1, look('amico'), 0], [0, stop, 0], [1, stop, 0],
  [0, `(async () => { await new Promise(r => setTimeout(r, 9000)); const G = cq.g; return 'host: fase ' + G.st.ph + ' manche ' + G.st.n + ' punti ' + JSON.stringify(G.st.sc) + ' | ' + (G.st.msg || '').split(String.fromCharCode(10)).join(' / '); })()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: fase ' + G.st.ph + ', tamburi svelati ' + (document.getElementById('baRes') ? document.getElementById('baRes').textContent.slice(0, 80) : 'NO') + ' | ' + $('#cqCount').textContent.slice(0, 80); })()`, 0],
  // manche 2: l'amico non sceglie (tamburo a caso allo scadere), l'host si'; poi nel duello l'amico ricarica
  [0, `(async () => { const G = cq.g; for (let i = 0; i < 60 && G.st.ph !== 'load'; i++) await new Promise(r => setTimeout(r, 200)); document.querySelector('#baLoad .rnd').click(); document.querySelector('#baLoad .ok').click(); return 'host: manche ' + G.st.n + ' ' + G.st.ph; })()`, 0],
  [0, `(async () => { const G = cq.g; for (let i = 0; i < 120 && G.st.ph !== 'duel'; i++) await new Promise(r => setTimeout(r, 200)); const o = G.chars.find(c => c.remote); return 'host: duello; tamburo amico ' + (G.drum[o.id] || []).join('') + ' dato ' + JSON.stringify(G.st.ad); })()`, 0],
  [1, `(() => { const B = window.__bari; return 'amico: mio tamburo ' + (B.U2.myD || []).join(''); })()`, 300],
  [1, `(() => { const G = cq.g; G.M.act(G); return 'amico: ricarica chiesta'; })()`, 900],
  [0, `(() => { const B = window.__bari, G = cq.g, o = G.chars.find(c => c.remote); return 'host: amico in ricarica ' + B.reloading(G, o) + ' fino al rintocco ' + B.PS(G, o).rl; })()`, 0],
  [1, `(() => { const B = window.__bari; document.querySelector('#baLoad .rnd').click(); return 'amico: pannello ricarica ' + !!document.getElementById('baLoad') + ', nuovo ordine ' + B.U2.d.join('') + ', fermo ' + (cq.g.M.speed(cq.g.me) === 0); })()`, 8500],
  [1, `(() => { const B = window.__bari, G = cq.g; return 'amico: ricarica finita ' + !B.reloading(G, G.me) + ', tamburo ' + (B.U2.myD || []).join('') + ', pannello ' + !!document.getElementById('baLoad'); })()`, 0],
  [0, `(() => { const B = window.__bari, G = cq.g, o = G.chars.find(c => c.remote); return 'host: tamburo amico dopo la ricarica ' + (G.drum[o.id] || []).join('') + ', spari ' + G.st.sh.map(e => e[2] + ':' + e[3]).join(','); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
