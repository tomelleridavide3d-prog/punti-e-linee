// Officina dei robot online (node prove/cdp2.mjs . prove/robnet.mjs): host + amico. L'amico monta il suo robot (arriva all'host),
// in officina l'altro non si vede; dopo la tenda si vedono; la direzione del robot dell'amico arriva all'host; colpi in tutte e due le direzioni; spinta della pala sull'amico.
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  try { localStorage.setItem('robotHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const wait = ms => `await new Promise(r => setTimeout(r, ${ms}));`;
const look = who => `(() => { const G = cq.g, N = window.__robot; if (!G || !G.st) return '${who}: nessuna partita'; const st = G.st, s = N.mySide(G), o = 1 - s, Q = N.rob(G, o);
  return '${who}: fase ' + st.ph + ' manche ' + st.n + ' arena ' + st.ar + ' | lato ' + s + ' | mio ' + st.p[s].bd.s.join('/') + ' | altro ' + st.p[o].bd.s.join('/') + ' | telaio ' + Math.round(st.p[s].tel) + '/' + Math.round(st.p[o].tel) + ' | altro in ' + Q.x.toFixed(1) + ',' + Q.y.toFixed(1) + ' dir ' + (Q.a * 57).toFixed(0) + ' | altro nascosto ' + G.M.hide(G.chars[o]); })()`;
export default [
  [0, name('zzRoHost'), 0], [1, name('zzRoAmico'), 800],
  [0, `(async () => { $('#netNew').click(); ${wait(2500)} store.settings.cqOpt = Object.assign(cqOpt(), { game: 'robot' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { robot: { map: 'robot', n: 2, fill: true } }); cqNetList(); return 'host: set aperto, gioco robot'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzRoHost'); cqNetJoin(code); ${wait(2000)} return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); ${wait(5500)} cqCloseTask(); const G = cq.g; return 'host: partita ' + G.mode + ', personaggi ' + G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', '); })()`, 0],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode) + ', officina ' + !!document.getElementById('rbBuild'); })()`, 0],
  // l'amico (lato 1) monta col pannello: sega davanti, acciaio dietro, cingoli
  [1, `(async () => { const N = window.__robot, G = cq.g; N.U.sel = 0; document.querySelector('#rbBuild [data-p=sega]').click(); ${wait(500)} N.U.sel = 2; document.querySelector('#rbBuild [data-p=piastre]').click(); ${wait(500)} N.U.sel = 4; document.querySelector('#rbBuild [data-p=scossa]').click(); ${wait(500)} document.querySelector('#rbBuild [data-m=c]').click(); ${wait(1500)} return 'amico: montato, ora ho ' + G.st.p[1].bd.s.join('/') + ' ' + G.st.p[1].bd.m; })()`, 0],
  [0, `(async () => { const N = window.__robot, G = cq.g; N.setBuild(G, 0, { m: 'r', s: ['pala', 'corazza', 'gomma', 'corazza', 'barra'] }); ${wait(800)} return 'host: il robot dell\\'amico ' + G.st.p[1].bd.s.join('/') + ' ' + G.st.p[1].bd.m; })()`, 0],
  [1, look('amico (officina)'), 0], [0, look('host (officina)'), 0],
  [1, `(async () => { const N = window.__robot, G = cq.g; N.myReady(G); ${wait(600)} return 'amico: pronto'; })()`, 0],
  [0, `(async () => { const N = window.__robot, G = cq.g; N.myReady(G); ${wait(1500)} return 'host: fase ' + G.st.ph + ', tenda ' + !!document.getElementById('rbShow'); })()`, 0],
  [1, `(async () => { ${wait(400)} return 'amico: tenda ' + !!document.getElementById('rbShow'); })()`, 0],
  [0, `(async () => { ${wait(4000)} return 'host: fase ' + cq.g.st.ph + ', pulsanti armi ' + document.querySelectorAll('#rbW button').length; })()`, 0],
  [1, look('amico (battaglia)'), 0], [0, look('host (battaglia)'), 0],
  // l'amico guida (finto joystick) e si gira: l'host vede la sua posizione e la sua direzione
  [1, `(async () => { cq.keys.a = true; ${wait(1200)} delete cq.keys.a; ${wait(500)} const R = window.__robot.U.R; return 'amico: sono in ' + R.x.toFixed(1) + ',' + R.y.toFixed(1) + ' dir ' + (R.a * 57).toFixed(0); })()`, 0],
  [0, `(async () => { ${wait(300)} const Q = window.__robot.rob(cq.g, 1); return 'host: vedo l\\'amico in ' + Q.x.toFixed(1) + ',' + Q.y.toFixed(1) + ' dir ' + (Q.a * 57).toFixed(0); })()`, 0],
  // mi metto davanti all'amico (lui mi guarda): l'amico mi sega
  [1, `(async () => { const N = window.__robot, G = cq.g, R = N.U.R; R.x = cq.x = 13; R.y = cq.y = 10; R.a = Math.PI; ${wait(700)} return 'amico: in posizione'; })()`, 0],
  [0, `(async () => { const N = window.__robot, G = cq.g, R = N.U.R; R.x = cq.x = 12.05; R.y = cq.y = 10; R.a = 0; ${wait(800)} return 'host: davanti all\\'amico, telaio ' + Math.round(G.st.p[0].tel); })()`, 0],
  [1, `(async () => { const N = window.__robot, G = cq.g; document.querySelector('#rbW button[data-i="0"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); ${wait(2200)} return 'amico: ho segato, telaio dell\\'host ' + Math.round(G.st.p[0].tel) + ' pezzo davanti ' + Math.round(G.st.p[0].hp[0]) + ', colpi rimasti ' + G.st.p[1].u[0]; })()`, 0],
  [0, `(() => { const G = cq.g; return 'host: telaio ' + Math.round(G.st.p[0].tel) + ', pala ' + Math.round(G.st.p[0].hp[0]) + ', eventi ' + G.st.ev.map(e => e[1]).join(','); })()`, 0],
  // l'host lancia l'amico con la pala (di fronte: vola indietro)
  [0, `(async () => { const N = window.__robot, G = cq.g, R = N.U.R; R.x = cq.x = 12.05; R.y = cq.y = 10; R.a = 0; ${wait(300)} const ok = N.fire(G, 0, 0); ${wait(1500)} const Q = N.rob(G, 1); return 'host: pala ' + ok + ', l\\'amico ora in ' + Q.x.toFixed(2) + ',' + Q.y.toFixed(2); })()`, 0],
  [1, `(() => { const R = window.__robot.U.R; return 'amico: sono volato in ' + R.x.toFixed(2) + ',' + R.y.toFixed(2); })()`, 0],
  [1, look('amico (fine)'), 0], [0, look('host (fine)'), 0]
];
