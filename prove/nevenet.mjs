// Battaglia di palle di neve online (node prove/cdp2.mjs . prove/nevenet.mjs): host + amico. L'amico disegna i muri (arrivano all'host),
// i muri dell'altro restano nascosti finche' si costruisce, poi si vedono; tiri dell'amico sui muri dell'host, pallonetto dell'host sull'amico, palle dalle scorte.
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  try { localStorage.setItem('neveHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const wait = ms => `await new Promise(r => setTimeout(r, ${ms}));`;
const look = who => `(() => { const G = cq.g, N = window.__neve; if (!G || !G.st) return '${who}: nessuna partita'; const st = G.st, S = G.S, s = N.mySide(G);
  const own = S ? S.bl.filter(b => b.o === s).length : -1, oth = S ? S.bl.filter(b => b.o !== s).length : -1, props = []; for (let y = 0; y < CQ_H; y++) for (let x = 0; x < CQ_W; x++) if (cqSolid[y][x] && cqSolid[y][x].prop === 'nw') props.push(x);
  const vOth = props.filter(x => s ? x < 15 : x > 15).length;
  return '${who}: fase ' + st.ph + ' manche ' + st.n + ' | lato ' + s + ' | geometria v' + (S ? S.v : '-') + '/' + st.wv + ' | blocchi miei ' + own + ' altri ' + oth + ' | caselle di muro dell\\'altro disegnate ' + vOth + ' | colpi presi ' + st.p[s].h + '/' + st.p[1 - s].h + ' | in mano ' + st.p[s].b + ' scorte ' + st.p[s].sk; })()`;
export default [
  [0, name('zzNeHost'), 0], [1, name('zzNeAmico'), 800],
  [0, `(async () => { $('#netNew').click(); ${wait(2500)} store.settings.cqOpt = Object.assign(cqOpt(), { game: 'neve' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { neve: { map: 'neve', n: 2, fill: true } }); cqNetList(); return 'host: set aperto, gioco neve'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzNeHost'); cqNetJoin(code); ${wait(2000)} return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); ${wait(4500)} cqCloseTask(); const G = cq.g; return 'host: partita ' + G.mode + ', personaggi ' + G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', '); })()`, 0],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode) + ', pannello del fortino ' + !!document.getElementById('nvBuild') + ', parto in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (la mia zona: x da 19 a 29)'; })()`, 0],
  // l'amico (lato 1) disegna un muro, lo ripassa e mette un'asse; l'host disegna il suo
  [1, `(async () => { const N = window.__neve, G = cq.g; N.myBuild(G, 'w', [[21, 5.5], [21, 12.5]]); ${wait(900)} N.myBuild(G, 'w', [[21, 5.5], [21, 9]]); ${wait(900)} N.U.tool = 'a'; N.myBuild(G, 'a', [[21, 7], [21.8, 7]]); N.U.tool = 'w'; ${wait(900)} N.myBuild(G, 'i', [[25.5, 12]]); ${wait(1500)} return 'amico: disegnato, igloo ' + JSON.stringify(N.PS(G, G.me).ig); })()`, 0],
  [0, `(async () => { const N = window.__neve, G = cq.g; N.buildAct(G, 0, 'w', [[9, 5], [9.6, 6.5], [9, 8], [9.6, 9.5], [9, 11]]); ${wait(1500)} const a = G.wb.filter(b => b.o === 1); return 'host: blocchi dell\\'amico ' + a.length + ', doppi ' + a.filter(b => b.k === 2).length + ', assi ' + a.filter(b => b.as).length + ', neve amico ' + G.st.p[1].nv; })()`, 0],
  [1, look('amico (costruzione)'), 0], [0, look('host (costruzione)'), 0],
  // tutti e due pronti: si dirada la nevicata e si vedono i fortini
  [1, `(async () => { const N = window.__neve, G = cq.g; N.myReady(G); ${wait(600)} return 'amico: pronto'; })()`, 0],
  [0, `(async () => { const N = window.__neve, G = cq.g; N.myReady(G); ${wait(4500)} return 'host: fase ' + G.st.ph; })()`, 0],
  [1, look('amico (battaglia)'), 0], [0, look('host (battaglia)'), 0],
  // l'amico tira dritto contro il muro dell'host (da vicino: si sposta in avanti)
  [1, `(async () => { const N = window.__neve, G = cq.g; cq.x = 14; cq.y = 8.2; ${wait(700)} N.myThrow(G, 'd', 9.3, 8.2); ${wait(1500)} const S = G.S, n = S.bl.findIndex(b => b.o === 0 && Math.abs(b.y - 8.2) < 0.8); return 'amico: dopo il tiro, salute del muro vicino ' + N.salOf(G, n) + '/' + S.camp[S.bc[n]].max + ', palle in mano ' + N.PS(G, G.me).b; })()`, 0],
  [0, `(() => { const N = window.__neve, G = cq.g, S = G.S, n = S.bl.findIndex(b => b.o === 0 && Math.abs(b.y - 8.2) < 0.8); return 'host: salute del mio muro ' + N.salOf(G, n) + '/' + S.camp[S.bc[n]].max + ', eventi ' + G.st.ev.map(e => e[1]).join(','); })()`, 0],
  // l'host tira un pallonetto dove sta l'amico (fermo): lo prende
  [0, `(async () => { const N = window.__neve, G = cq.g, o = G.chars.find(c => c.remote); cq.x = 11; cq.y = 8.2; ${wait(400)} N.throwFrom(G, 0, 'l', o.x, o.y); ${wait(2200)} return 'host: colpi presi dall\\'amico ' + G.st.p[1].h; })()`, 0],
  [1, look('amico (colpito?)'), 0],
  // l'amico torna alle scorte e fa una palla
  [1, `(async () => { const N = window.__neve, G = cq.g, p = N.PS(G, G.me); cq.x = p.sx - 0.6; cq.y = p.sy; ${wait(700)} const b0 = p.b; G.M.act(G); ${wait(1800)} const p2 = N.PS(G, G.me); return 'amico: palle ' + b0 + ' -> ' + p2.b + ', scorte ' + p2.sk; })()`, 0],
  // l'amico manda un picconatore dall'igloo (tocca il pulsante due volte: sceglie lui il bersaglio)
  [1, `(async () => { const N = window.__neve, G = cq.g, p = N.PS(G, G.me); ${wait(300)} const b = document.querySelector('#nvG [data-k=p]'); if (!b) return 'amico: NIENTE PULSANTI DEGLI GNOMI (palle ' + p.b + ')'; b.click(); ${wait(200)} b.click(); ${wait(2500)} return 'amico: gnomi visti ' + JSON.stringify(G.st.gn.map(g => g.slice(0, 6))) + ', disegnati ' + Object.keys(N.U.gp).length; })()`, 0],
  [0, `(() => { const G = cq.g; return 'host: gnomi in campo ' + G.gn.map(g => g.ty + ' lato ' + g.s + ' stato ' + g.st + ' bersaglio ' + g.tg).join(' | '); })()`, 0],
  // l'host si ferma dietro il suo muro: l'amico non lo vede piu'
  [0, `(async () => { cq.x = 8.2; cq.y = 8; ${wait(2500)} return 'host fermo dietro il muro'; })()`, 0],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c !== G.me); return 'amico: host nascosto ' + G.M.hide(h) + ' (io in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ')'; })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
