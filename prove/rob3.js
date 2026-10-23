// Officina dei robot: una manche registrata (io = guida dritta e sparo appena posso; il Nonno = computer) per capire l'equilibrio.
// uso: node prove/cdp.mjs . prove/rob3.js   (window.__LV forza del Nonno, window.__ME / __NB progetti, window.__AR arena)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzRoProva'; store.settings.sound = false; store.settings.robotNb = { n: 0, w: {}, sd: [0, 0, 0, 0, 0], ty: {}, df: {}, tp: {}, lv: window.__LV || 0.3 }; saveStore();
  try { localStorage.setItem('robotHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzRoProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=robot]').click(); await w(2000); cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, N = window.__robot, M = G.M; cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  while (G.pre > 0) step(0.05);
  if (window.__AR) G.st.ar = window.__AR;
  N.setBuild(G, 0, window.__ME || { m: 'r', s: ['sega', 'corazza', 'piastre', 'corazza', 'barra'] }); G.st.p[0].rd = 1;
  for (let i = 0; i < 300 && G.st.ph === 'build'; i++) { if (window.__NB && G.st.p[1].rd !== 2) { G.st.p[1].rd = 0; N.setBuild(G, 1, window.__NB); G.st.p[1].rd = 1; G.botBuildAt = 1e9; } step(0.05); }
  out.push('arena ' + G.st.ar + ' | io ' + G.st.p[0].bd.s.join('/') + ' ' + G.st.p[0].bd.m + ' | Nonno ' + G.st.p[1].bd.s.join('/') + ' ' + G.st.p[1].bd.m + ' | forza ' + (window.__LV || 0.3));
  while (G.st.ph !== 'fight') step(0.05);
  const keys = cq.keys, bot = G.chars[1], dmg = [0, 0], fires = [0, 0]; let evS = G.st.en, lastT = -1;
  const t0 = G.st.p.map(P => P.tel);
  while (G.st.ph === 'fight' && G.time - G.st.t0 < 92) {
    const S = G.st; for (const k in keys) delete keys[k];
    const R = N.U.R, Q = N.rob(G, 1);
    if (R && !S.p[0].d) { const dx = Q.x - R.x, dy = Q.y - R.y, sx = dx - dy, sy = (dx + dy) / 2; if (Math.abs(sx) > 0.3) keys[sx > 0 ? 'd' : 'a'] = true; if (Math.abs(sy) > 0.3) keys[sy > 0 ? 's' : 'w'] = true; for (let k = 0; k < 5; k++) { const hot = N.zoneHit(G, 0, k, R, Q) && S.p[0].cd[k] <= G.time; const H = G.__hot || (G.__hot = {}); if (!hot) H[k] = null; else if (H[k] == null) H[k] = G.time; else if (G.time - H[k] >= 0.3) { N.fire(G, 0, k); H[k] = null; } } }
    { const B = N.rob(G, 1), P1 = S.p[1]; for (let k = 0; k < 5; k++) if (N.PZ[P1.bd.s[k]] && N.PZ[P1.bd.s[k]].k === 'w' && P1.hp[k] > 0 && P1.u[k] > 0) { const z = N.zoneHit(G, 1, k, B, R), rd = P1.cd[k] <= G.time; G.__st = G.__st || { hot: 0, rd: 0, near: 0, ev: 0 }; if (rd) G.__st.rd++; if (z && rd) G.__st.hot++; if (rd && Math.hypot(B.x - R.x, B.y - R.y) < 2) G.__st.near++; } }
    step(0.05);
    for (const e of S.ev) { if (e[0] <= evS) continue; evS = e[0]; if (e[1] === 'h') dmg[1 - e[4]] += e[6]; if (e[1] === 'fw') fires[e[4]]++; }
    const ft = Math.floor(G.time - S.t0); if (ft !== lastT && ft % 5 === 0) { lastT = ft; const A = bot.ai || {}; out.push(ft + 's: dist ' + Math.hypot(Q.x - R.x, Q.y - R.y).toFixed(1) + ' | telaio io ' + Math.round(S.p[0].tel) + ' Nonno ' + Math.round(S.p[1].tel) + ' | arma del Nonno ' + A.wslot + ' pronta tra ' + (A.wslot >= 0 ? Math.max(0, S.p[1].cd[A.wslot] - G.time).toFixed(1) : '-') + ' | pezzi io ' + S.p[0].hp.map(v => Math.round(v)).join(',') + ' Nonno ' + S.p[1].hp.map(v => Math.round(v)).join(',') + ' | direz. Nonno ' + (bot.R.a * 57).toFixed(0) + ' verso me ' + (Math.atan2(R.y - Q.y, R.x - Q.x) * 57).toFixed(0)); }
  }
  for (const k in keys) delete keys[k];
  out.push('fine manche: ' + G.st.ph + ' ' + (G.st.msg || '').replace(/\n/g, ' | ') + ' | danni fatti io ' + dmg[0] + ' Nonno ' + dmg[1] + ' | colpi io ' + fires[0] + ' Nonno ' + fires[1] + ' | Nonno: arma pronta ' + (G.__st ? G.__st.rd : 0) + ' giri, pronta e vicino ' + (G.__st ? G.__st.near : 0) + ', pronta e in zona ' + (G.__st ? G.__st.hot : 0));
  return out.join('\n');
})()
