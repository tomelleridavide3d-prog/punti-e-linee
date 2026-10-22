// La casa delle trappole, passo 6: suoni, schede di spiegazione, regole, moviola del momento migliore a fine manche.
// Manche 1 accelerata: il computer ruba nella mia villa e io faccio cadere il lampadario quando e' sotto; poi rubo io. Alla fine della manche
// la moviola (con la foto, se richiesta, mentre gira).   uso: node prove/cdp.mjs . prove/tr6.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  try { localStorage.removeItem('trHelp'); } catch {}
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=trappole]').click(); await w(2500);
  out.push('regole nelle impostazioni: ' + !!document.querySelector('#tkBody .trRules'));
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(3600);
  const G = cq.g, T = window.__tr;
  out.push('scheda della preparazione: ' + (document.getElementById('trHelp') ? document.getElementById('trHelp').textContent.slice(0, 40) : 'NO'));
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.M.local && G.pre <= 0 && G.phase === 'play') G.M.local(G, dt); };
  for (const [k, x, y] of [['dia', 21, 1], ['cam', 16, 4], ['cam', 16, 14], ['cam', 16, 24], ['jl', 16, 12], ['jl', 19, 5], ['botola', 17, 23], ['rastrello', 16, 22], ['buccia', 15, 22], ['piano', 16, 21]]) T.place(G.mine, k, x, y);
  T.buildDone(G);
  let fired = 0, raid = null;
  for (let i = 0; i < 20 * 400 && G.phase === 'play' && !(G.ph === 'mres'); i++) {
    if (G.ph === 'guard') {   // guardo la telecamera della stanza dove c'e' il ladro, e faccio cadere il lampadario quando e' sotto
      const b = G.thiefC, r = cqRoomName(b.x, b.y), ci = G.camList.indexOf(r); if (ci >= 0 && ci !== G.camI && (i % 10 === 0)) T.camSet(G, ci);
      const j = T.jollyHere(G); if (j) { const [cx, cy] = [j.x + 0.5, j.y + 0.5]; if (Math.hypot(b.x - cx, b.y - cy) < 0.9 && G.M.hide(b) === false) { G.M.act(G); fired++; } }
    }
    if (G.ph === 'raid') {
      if (!raid || raid.t0 !== G.t0) raid = { t0: G.t0, st: 0 };
      const S = T.spots()[G.dia];
      if (raid.st === 0 && !(G.stun > G.time) && !G.fall && !G.resp) { for (const [a, bb] of [[0.5, 1.32], [1.32, 0.5], [-0.32, 0.5], [0.5, -0.32], [0.5, 1.6], [1.6, 0.5]]) { cq.x = S.x + a; cq.y = S.y + bb; const n = cqFree(cq.x, cq.y) && G.M.spotNear(G); if (n && n.i === G.dia) break; } G.M.act(G); raid.st = 1; }
      if (G.safe) { G.safe.val = G.safe.nums[G.safe.k]; G.safe.fv = G.safe.val; }
      if (G.has && raid.st === 1) { cq.x = 16.8; cq.y = 28.6; raid.st = 2; }
      if (raid.st === 1 && !G.srch && !G.safe && !G.has && !(G.stun > G.time)) raid.st = 0;
    }
    step(0.05);
  }
  out.push('jolly fatti scattare: ' + fired + ' | fase ' + G.st.step + ' | momenti ' + (G.mvc || []).map(m => m.k + (m.hit ? '(preso)' : '(mancato)') + ' ' + m.v.toFixed(1)).join(', '));
  out.push('moviola: ' + (G.mv ? G.mv.cap + ' | punti ' + G.mv.pts.length : 'nessuna') + ' | scritta grande (vuota durante la moviola): "' + G.M.big(G) + '"');
  if (window.__SHOT !== 'no') { const t0 = G.st.t0; G.st.t0 = G.time - 1.6; cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame); await w(700); cq.on = false; cancelAnimationFrame(cq.raf); cqDraw(); return out.join('\n'); }
  for (let i = 0; i < 20 * 12 && G.phase === 'play' && G.st.step === 'mres'; i++) step(0.05);
  out.push('dopo la moviola: ' + G.st.step + ' n ' + G.st.n + ' | scritta ' + G.M.big(G).replace(/\n/g, ' / ').slice(0, 80));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
