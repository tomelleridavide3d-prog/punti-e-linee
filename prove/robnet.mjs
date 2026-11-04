// Officina dei robot DAL VIVO (fase D): host + amico in un set. Banco di prova anche sull'amico, invito e Accetta, partita (host arbitro,
// l'amico muove subito il suo robot e lo corregge sull'host), sega dell'amico che fa danno sull'host, round, rivincita, uscita dell'amico.
// uso: node prove/cdp2.mjs . prove/robnet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; store.settings.robo2 = null; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  try { localStorage.setItem('robotHelp2', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click();
  window.__dir = null; cqDir = () => window.__dir;   // il dito finto
  return 'pronto';
})()`;
const wait = ms => `await new Promise(r => setTimeout(r, ${ms}));`;
const st = who => `(() => { const G = cq.g, N = window.__robot; if (!G) return '${who}: nessuna partita'; const m = G.mt, me = G.mine, op = G.dummy;
  return '${who}: ' + (m ? (m.live ? 'DAL VIVO' : 'partita') + ' round ' + m.r + ' fase ' + m.ph + ' punti ' + (m.w || []).join('-') + ' nomi ' + (m.nm || []).join('/') : 'banco di prova') + ' | io squadra ' + (me ? me.team + ' a ' + me.x.toFixed(1) + ',' + me.y.toFixed(1) + ' pezzi ' + me.bl.length : '-') + ' | altro ' + (op ? op.x.toFixed(1) + ',' + op.y.toFixed(1) + ' pezzi ' + op.bl.length + ' intero ' + Math.round(op.bl.reduce((a, q) => a + Math.max(0, q.hp), 0) / (op.hp0 || 1) * 100) + '%' : '-') + ' | barra: ' + [...document.querySelectorAll('#r2Hp span')].map(s => s.textContent).join(' / '); })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400))()`;
export default [
  [0, name('zzRbHost'), 0], [1, name('zzRbAmico'), 800],
  [0, `(async () => { $('#netNew').click(); ${wait(2500)} store.settings.cqOpt = Object.assign(cqOpt(), { game: 'robot' }); cqNetList(); return 'host: set aperto'; })()`, 0],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzRbHost'); cqNetJoin(code); ${wait(2500)} return 'amico nel set ' + code; })()`, 500],
  [0, `(async () => { cqNewMatch(); ${wait(5000)} cqCloseTask(); const G = cq.g; return 'host: partita ' + (G && G.mode) + ', personaggi ' + (G ? G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', ') : '-'); })()`, 0],
  [1, `(async () => { ${wait(800)} cqCloseTask(); const G = cq.g; return 'amico: partita ' + (G && G.mode) + ', officina aperta ' + !!document.getElementById('r2Shop'); })()`, 0],
  // tutti e due col proprio robot sul banco di prova; l'amico guida (prima sul suo telefono non si muoveva niente)
  [0, `(async () => { const N = window.__robot, G = cq.g; N.saveD(N.cleanD(N.MODELS[2])); N.goDrive(G); ${wait(500)} return 'host: banco di prova, manichino ' + !!G.dummy; })()`, 0],
  [1, `(async () => { const N = window.__robot, G = cq.g; N.saveD(N.cleanD(N.MODELS[1])); N.goDrive(G); ${wait(500)} const me = G.mine, x0 = me.x; window.__dir = { wx: 1, wy: 0 }; ${wait(1500)} window.__dir = null; ${wait(300)} return 'amico: sul banco di prova da solo si muove di ' + (me.x - x0).toFixed(2) + ' (manichino ' + !!G.dummy + ')'; })()`, 0],
  // la sfida: l'host sceglie l'amico, l'amico vede l'invito e accetta
  [0, `(async () => { const N = window.__robot, G = cq.g; document.querySelector('#r2Top [data-k=fight]').click(); ${wait(200)} const ks = [...document.querySelectorAll('#r2Pick button')].map(b => b.textContent.split(' ·')[0]).join(' | '); document.querySelector('#r2Pick [data-k=live]').click(); ${wait(400)} return 'host: scelte [' + ks + '], invito: ' + (document.getElementById('r2Inv').hidden ? 'nascosto' : document.getElementById('r2Inv').textContent); })()`, 1200],
  [1, `(async () => { const iv = document.getElementById('r2Inv'); const t = iv && !iv.hidden ? iv.textContent : 'NESSUN INVITO'; const b = iv && iv.querySelector('[data-k=acc]'); if (b) b.click(); ${wait(2500)} return 'amico: ' + t; })()`, 0],
  [0, st('host'), 0], [1, st('amico'), 0],
  // aspetto il via, poi l'amico corre contro l'host tenendo la sega
  [0, `(async () => { const G = cq.g; for (let i = 0; i < 60 && G.mt && G.mt.ph !== 'fight'; i++) ${wait(100)} const op = G.dummy; window.__hx = op.x; return 'host: fase ' + (G.mt && G.mt.ph); })()`, 0],
  [1, `(async () => { const G = cq.g, N = window.__robot; for (let i = 0; i < 40 && G.mt.ph !== 'fight'; i++) ${wait(100)}
    const me = G.mine, op = G.dummy, x0 = me.x; let err = 0, n = 0; N.U.hold.sega = 1;
    for (let i = 0; i < 40; i++) { window.__dir = { wx: op.x - me.x, wy: op.y - me.y }; ${wait(100)} if (me.ns) { err = Math.max(err, Math.hypot(me.ns.x - me.x, me.ns.y - me.y)); n++; } }
    window.__dir = null; N.U.hold.sega = 0; ${wait(500)}
    return 'amico: corso verso l\\'host per 4 s: spostato ' + (x0 - me.x).toFixed(2) + ', stati arrivati ' + n + ', distanza massima tra il mio robot e quello dell\\'host ' + err.toFixed(2) + ', eventi visti ' + G.evs.length; })()`, 0],
  [0, `(async () => { const G = cq.g; const me = G.mine, op = G.dummy; return 'host: pacchetto di stato ' + JSON.stringify(window.__robot.liveSnap(G)).length + ' caratteri | il robot dell\\'amico si e\\' mosso di ' + (window.__hx - op.x).toFixed(2) + ', il mio robot intero ' + Math.round(me.bl.reduce((a, q) => a + Math.max(0, q.hp), 0) / me.hp0 * 100) + '%'; })()`, 0],
  [1, st('amico'), 0],
  // l'host distrugge la cabina dell'amico due volte: fine partita, rivincita da tutti e due
  [0, `(async () => { const N = window.__robot, G = cq.g; const c = G.dummy.bl.find(q => q.t === 'cabina'); N.hurt(G, G.dummy, c, 999, 'prova'); ${wait(1500)} return 'host: ' + JSON.stringify(G.mt.res); })()`, 0],
  [1, `(async () => { ${wait(500)} const G = cq.g; return 'amico: ' + JSON.stringify(G.mt && G.mt.res) + ' | scritta: ' + window.__robot.U.fx.filter(f => f.k === 'big').map(f => f.s + (f.s2 ? ' (' + f.s2 + ')' : '')).slice(-2).join(' / '); })()`, 0],
  [0, `(async () => { const N = window.__robot, G = cq.g; for (let i = 0; i < 80 && G.mt.ph !== 'fight'; i++) ${wait(100)} const c = G.dummy.bl.find(q => q.t === 'cabina'); N.hurt(G, G.dummy, c, 999, 'prova'); ${wait(5000)} return 'host: fase ' + G.mt.ph + ', pannello ' + (document.querySelector('#r2End h2') || {}).textContent; })()`, 0],
  [1, `(async () => { ${wait(500)} const P = document.getElementById('r2End'); const t = P ? P.querySelector('h2').textContent + ' / ' + P.querySelector('p').textContent : 'NESSUN PANNELLO'; if (P) P.querySelector('[data-k=again]').click(); ${wait(1500)} return 'amico: ' + t + ' -> rivincita chiesta: ' + (document.querySelector('#r2End p') || {}).textContent; })()`, 0],
  [0, `(async () => { const G = cq.g, id = G.mt.id, t = (document.querySelector('#r2End p') || {}).textContent; document.querySelector('#r2End [data-k=again]').click(); ${wait(2500)} return 'host: scritta "' + t + '" -> nuova partita ' + (G.mt && G.mt.id !== id) + ', round ' + (G.mt && G.mt.r); })()`, 0],
  [1, st('amico'), 0],
  // l'amico esce: tutti e due tornano al banco di prova
  [1, `(async () => { document.querySelector('#r2Top [data-k=quit]').click(); ${wait(2500)} const G = cq.g; return 'amico: uscito -> ' + (G.mt ? 'ANCORA IN PARTITA' : 'banco di prova') + ', manichino ' + !!G.dummy; })()`, 0],
  [0, st('host'), 0],
  [0, errs, 0], [1, errs, 0],
];
