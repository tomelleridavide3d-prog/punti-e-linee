// Duello all'alba dei bari: foto del duello (io vicino a un riparo, lo Sceriffo che spara, pannello della ricarica aperto)
// uso: node prove/cdp.mjs . prove/bari2.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzBaProva'; store.settings.sound = false; saveStore();
  try { localStorage.setItem('bariHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzBaProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=bari]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, B = window.__bari, M = G.M; if (!G || G.mode !== 'bari') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  for (let i = 0; i < 2000 && !(G.st && G.st.ph === 'duel'); i++) { step(0.05); if (G.st && G.st.ph === 'load' && !B.U2.rdy && G.time - G.st.t0 > 1) { B.U2.d = [1, 0, 1, 0, 0, 1]; B.setReady(G, true); } }
  const bot = G.chars.find(c => c.bot); bot.hold = 1;
  const cv = G.st.cv.filter(c => c[1] < 13).sort((a, b) => Math.hypot(a[1] - 8, a[2] - 8) - Math.hypot(b[1] - 8, b[2] - 8))[0];
  cq.x = cv[1] + 0.5 - 0.9; cq.y = cv[2] + 0.5; if (!cqFree(cq.x, cq.y)) { cq.x = cv[1] - 0.4; cq.y = cv[2] - 0.4; }
  for (let i = 0; i < 60; i++) step(0.05);
  B.PS(G, G.me).f = ['b']; B.PS(G, bot).f = ['r', 'u']; B.PS(G, bot).dv = 1;
  bot.x = 16.5; bot.y = 7.5; bot.path = [];
  for (let i = 0; i < 400 && B.winOpen(G, G.time) < 0; i++) step(0.05);
  for (let i = 0; i < 5; i++) step(0.05);
  B.U2.fx.push({ k: 'alarm', ty: 'door', t: performance.now() / 1000 - 0.3 });
  G.st.sh.push([999, bot.id, 's', 'cover', cv[1] + 0.5, cv[2] + 0.5, G.time, G.me.id]); G.st.shN = 999; step(0.02);
  cq.on = true; for (let i = 0; i < 5; i++) { step(0.01); cqModeHud(); cqDraw(); await w(60); }
  return 'fase ' + G.st.ph + ' · finestra ' + B.winOpen(G, G.time) + ' · pulsante ' + document.getElementById('baShoot').className + ' · campana ' + (document.getElementById('baBell') ? 'si' : 'no') + ' · errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
