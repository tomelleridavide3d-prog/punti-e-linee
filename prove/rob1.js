// Officina dei robot (PROTOTIPO): officina a griglia (montare col dito, girare, togliere, pezzi staccati), fisica (guida, ruote solo da
// un lato = tira storto, spinta del manichino, fossa), armi (sega, martello, cannone col rinculo), pezzi che cadono, misure.
// uso: node prove/cdp.mjs . prove/rob1.js [foto.png]   (window.__SHOT = 'shop' / 'drive' per la foto)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzRoProva'; store.settings.sound = false; store.settings.robo2 = null; saveStore();
  try { localStorage.setItem('robotHelp2', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzRoProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=robot]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2000); cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, N = window.__robot, M = G.M; if (!G || G.mode !== 'robot') return 'partita non partita';
  while (G.pre > 0) cqModeTick(0.05);
  M.local(G, 0.05); await w(200);
  out.push('officina aperta: ' + !!document.getElementById('r2Shop') + ', progetto ' + JSON.stringify(N.myD().b));
  // ---- monto col dito: tocco la griglia come un giocatore ----
  const cv = document.querySelector('#r2Shop canvas.gr'); let r = cv.getBoundingClientRect();
  const tap = (x, y, move) => { r = cv.getBoundingClientRect(); const cx = r.left + (x + 0.5) / 7 * r.width, cy = r.top + (y + 0.5) / 7 * r.height; cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, pointerId: 1, bubbles: true })); for (const [mx, my] of move || []) cv.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (mx + 0.5) / 7 * r.width, clientY: r.top + (my + 0.5) / 7 * r.height, pointerId: 1, bubbles: true })); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true })); };
  const pick = t => document.querySelector('#r2Shop [data-t=' + t + ']').click();
  pick('telaio'); tap(2, 3, [[1, 3]]); tap(4, 3, [[5, 3]]); tap(3, 2); tap(3, 4);   // trascinando: due blocchi per volta
  pick('ruota'); tap(1, 2); tap(5, 2); tap(1, 4); tap(5, 4); tap(2, 2); tap(4, 2);
  out.push('ruote staccate? ' + N.statsOf(N.myD()).loose + ' pezzi non collegati (le ruote in 2,2 e 4,2 toccano il telaio)');
  pick('cuneo'); tap(3, 1); tap(3, 1); tap(3, 1); tap(3, 1); tap(3, 1);   // montato e girato 4 volte = di nuovo avanti
  pick('sega'); tap(2, 1); pick('martello'); tap(4, 1); pick('cannone'); tap(3, 5); tap(3, 5); tap(3, 5);   // cannone girato indietro
  pick('corazza'); tap(6, 6);   // staccata
  const st = N.statsOf(N.myD());
  out.push('progetto: ' + N.myD().b.length + ' pezzi, peso ' + st.M + ', velocita ' + st.v.toFixed(2) + ', spinta ' + st.push.toFixed(1) + ', agilita ' + st.agi.toFixed(2) + ', armi ' + st.wpn.join('/') + ', non collegati ' + st.loose + ' | avviso: ' + document.querySelector('#r2Shop .msg').textContent.slice(0, 80));
  document.querySelector('#r2Shop [data-k=x]').click(); tap(6, 6); document.querySelector('#r2Shop [data-k=x]').click();
  out.push('tolta la corazza staccata: non collegati ' + N.statsOf(N.myD()).loose + ', cuneo verso ' + N.myD().b.find(q => q[2] === 'cuneo')[3] + ', cannone verso ' + N.myD().b.find(q => q[2] === 'cannone')[3]);
  for (let i = 0; i < 6; i++) { M.local(G, 0.05); await w(40); }
  if (window.__SHOT === 'shop') { cqDraw(); return out.join('\n'); }
  // ---- banco di prova ----
  document.querySelector('#r2Shop [data-k=go]').click(); await w(200);
  out.push('banco di prova: ' + (N.U.mode) + ', pulsanti armi ' + [...document.querySelectorAll('#r2W button')].map(b => b.dataset.t).join(','));
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = (dt, n) => { for (let i = 0; i < n; i++) { cqModeTick(dt); M.local(G, dt); } };
  const me = G.mine, keys = cq.keys;
  // guida dritta (tasto destra = verso +x sullo schermo; qui uso il gas diretto)
  const drive = (thr, steer, t) => { const f = N.myInput; N.myInput = () => {}; for (let i = 0; i < t / 0.05; i++) { me.inp.thr = thr; me.inp.steer = steer; cqModeTick(0.05); } N.myInput = f; };
  const x0 = me.x, y0 = me.y, a0 = me.a; window.__robot.myInput = () => {};
  for (let i = 0; i < 40; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); }
  out.push('2 s di gas: percorso ' + Math.hypot(me.x - x0, me.y - y0).toFixed(2) + ' caselle, velocita ' + Math.hypot(me.vx, me.vy).toFixed(2) + ', deviazione ' + ((me.a - a0) * 57).toFixed(1) + ' gradi');
  for (let i = 0; i < 30; i++) { me.inp.thr = 0.3; me.inp.steer = 1; cqModeTick(0.05); }
  out.push('sterzo a destra 1,5 s: direzione ' + ((me.a - a0) * 57).toFixed(0) + ' gradi');
  // ruote solo da un lato: tira storto
  { const b = N.makeBody({ b: [[3, 3, 'cabina', 0], [2, 3, 'telaio', 0], [1, 3, 'ruota', 0], [1, 2, 'ruota', 0], [3, 2, 'telaio', 0]] }, 10, 15, 0, 0); G.rbs.push(b); const a1 = b.a; for (let i = 0; i < 30; i++) { b.inp.thr = 1; b.inp.steer = 0; N.physics(G, 0.05); }
    out.push('robot con le ruote solo a sinistra, 1,5 s di gas dritto: gira di ' + ((b.a - a1) * 57).toFixed(0) + ' gradi (deve girare a destra, verso +)'); G.rbs = G.rbs.filter(o => o !== b); }
  // spingo il manichino: lo metto davanti e do gas
  { const D = G.dummy; me.x = D.x - 3.7; me.y = D.y; me.a = 0; me.vx = me.vy = me.w = 0; D.a = 0; D.vx = D.vy = D.w = 0; const dx0 = D.x; for (let i = 0; i < 60; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); }
    out.push('spinta: il manichino si e\' spostato di ' + (D.x - dx0).toFixed(2) + ' caselle (io peso ' + me.M + ', lui ' + D.M + '), sollevato dal cuneo ' + (D.lift > 0) + ', pezzi del manichino ' + D.bl.length); }
  // armi: sega e martello sul manichino
  { const D = G.dummy, n0 = D.bl.length, hp0 = D.bl.reduce((s, q) => s + q.hp, 0); D.a = 0; D.vx = D.vy = D.w = 0; me.a = 0; me.vx = me.vy = me.w = 0; me.x = 0; me.y = 0; const sq = me.bl.find(q => q.t === 'sega'), [sx0, sy0] = N.wpos(me, sq), tg = D.bl.find(q => q.t === 'corazza') || D.bl[0], [tx0, ty0] = N.wpos(D, tg); me.x = tx0 - sx0 - 0.95; me.y = ty0 - sy0;
    for (let i = 0; i < 20; i++) { me.inp.thr = 0; me.inp.sega = true; cqModeTick(0.05); } me.inp.sega = false; me.inp.martello = true; cqModeTick(0.05); for (let i = 0; i < 6; i++) cqModeTick(0.05);
    out.push('sega 1 s + martello: salute del manichino ' + Math.round(hp0) + ' -> ' + Math.round(D.bl.reduce((s, q) => s + q.hp, 0)) + ', pezzi ' + n0 + ' -> ' + D.bl.length + ', pezzi a terra ' + G.rbs.filter(b => b.debris).length + ', sega calda ' + me.heat.toFixed(1)); }
  // cannone indietro: il rinculo mi spinge avanti
  { me.vx = me.vy = me.w = 0; const xx = me.x, yy = me.y; me.inp.cannone = true; cqModeTick(0.05); for (let i = 0; i < 6; i++) cqModeTick(0.05); out.push('cannone (girato indietro): palle ' + G.proj.length + ', rinculo mi sposta di ' + Math.hypot(me.x - xx, me.y - yy).toFixed(2)); }
  // il manichino nella fossa
  { const D = G.dummy; if (!D.ko) { D.x = N.PIT[0] - 0.4; D.y = N.PIT[1]; D.vx = 1.5; cqModeTick(0.05); for (let i = 0; i < 20; i++) cqModeTick(0.05); }
    out.push('manichino nella fossa: ' + (G.dummy.ko || D.ko || 'NO') + ', abbattuti ' + G.score); for (let i = 0; i < 70; i++) cqModeTick(0.05); out.push('nuovo manichino: ' + (G.dummy !== D)); }
  // rompere la cabina del manichino = esplode tutto
  { const D = G.dummy, c = D.bl.find(q => q.t === 'cabina'); N.hurt(G, D, c, 99, 'prova'); out.push('cabina del manichino distrutta: ' + D.ko + ', pezzi a terra ' + G.rbs.filter(b => b.debris).length); }
  // perdo una ruota: il baricentro si sposta
  { const cx = me.cu, w0 = me.bl.find(q => q.t === 'ruota' && q.gx === 1); N.hurt(G, me, w0, 99, 'prova'); out.push('persa una ruota a sinistra: baricentro ' + cx.toFixed(2) + ' -> ' + me.cu.toFixed(2) + ' / ' + me.cv.toFixed(2) + ', ruote ' + me.bl.filter(q => q.t === 'ruota').length); }
  // disegno
  cq.on = true; { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma (banco di prova): ' + (t / 20).toFixed(1) + ' ms'); }
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); N.physics(G, 0.016); t += performance.now() - t0; } out.push('un giro di fisica: ' + (t / 20).toFixed(2) + ' ms con ' + G.rbs.length + ' corpi'); }
  if (window.__SHOT === 'drive') { const D = G.dummy; me.x = cq.x = D.x - 3.6; me.y = cq.y = D.y + 0.6; me.a = -0.2; N.spawnDummy(G); for (let i = 0; i < 3; i++) { M.local(G, 0.016); cqDraw(); } }
  return out.join('\n');
})()
