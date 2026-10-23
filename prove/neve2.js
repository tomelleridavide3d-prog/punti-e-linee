// Battaglia di palle di neve, passo 2: igloo, muri che nascondono, gnomi (picconatore su muro semplice e doppio, rotolone di petto e di striscio,
// cecchino, palla che abbatte uno gnomo), poi una partita intera in cui Pierino usa gli gnomi. uso: node prove/cdp.mjs . prove/neve2.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzNeProva'; store.settings.sound = false; saveStore();
  try { localStorage.setItem('neveHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzNeProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=neve]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'neve') return 'partita non partita';
  const N = window.__neve, M = G.M; cq.on = false; cancelAnimationFrame(cq.raf);
  const step = (dt = 0.05) => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  while (G.pre > 0) step();
  G.botBuildAt = 1e9; G.tutHold = true;
  const st = G.st, bot = G.chars[1];
  // ---- costruzione: igloo (8 neve), il mio muro; i muri di Pierino fatti a mano: uno dritto di traverso (di petto), uno inclinato (di striscio), uno doppio ----
  { const nv = st.p[0].nv; N.buildAct(G, 0, 'i', [[4.5, 11]]); out.push('igloo: ' + JSON.stringify(st.p[0].ig) + ' costo ' + (nv - st.p[0].nv) + ' neve'); }
  N.buildAct(G, 0, 'w', [[8.5, 6], [8.5, 12]]);
  st.p[1].nv = 80; N.buildAct(G, 1, 'w', [[20.5, 4.2], [20.5, 8.2]]); N.buildAct(G, 1, 'w', [[26.6, 9.4], [26.6, 11.2]]);
  N.buildAct(G, 1, 'w', [[20.2, 10.4], [24.2, 12.2]]);
  N.buildAct(G, 1, 'w', [[23.5, 5], [23.5, 8]]); N.buildAct(G, 1, 'w', [[23.5, 5], [23.5, 8]]);
  N.buildAct(G, 1, 'i', [[26, 12.5]]);
  N.startFight(G); for (let i = 0; i < 70; i++) step();
  out.push('fase ' + G.st.ph);
  const S = () => G.S, campOf = (x, y) => { const n = S().bl.findIndex(b => Math.hypot(b.x - x, b.y - y) < 0.3); return n < 0 ? null : { n, c: S().bc[n], sal: N.salOf(G, n), max: S().camp[S().bc[n]].max, len: S().camp[S().bc[n]].b.length }; };
  // ---- nascosto? io fermo dietro il mio muro / allo scoperto; Pierino da casa sua ----
  { bot.x = 26; bot.y = 9; cq.x = 7.9; cq.y = 9; for (let i = 0; i < 20; i++) step(); const a = N.hiddenFrom(G, 1, G.me); cq.x = 5; cq.y = 2.2; for (let i = 0; i < 30; i++) step(); const b = N.hiddenFrom(G, 1, G.me);
    cq.x = 7.9; cq.y = 9; for (let i = 0; i < 20; i++) step(); let c2 = 0; for (let i = 0; i < 10; i++) { cq.y = 9 + (i % 2) * 0.4; step(); if (N.hiddenFrom(G, 1, G.me)) c2++; }
    out.push('nascosto dietro il muro: ' + a + ' | allo scoperto: ' + b + ' | correndo dietro il muro nascosto ' + c2 + '/10 volte'); }
  const play = (sec, f) => { for (let i = 0; i < sec * 20 && G.st.ph === 'fight'; i++) { G.st.t0 = G.time - 10; step(); if (f && f()) return i / 20; } return -1; };
  const evs = () => G.st.ev.map(e => e[1]).join(',');
  // ---- ROTOLONE di petto su un muro di traverso nuovo (ricostruito: lo faccio io a mano nella geometria) ----
  { G.gn.length = 0; st.p[0].b = 3; const e0 = G.st.en, k0 = campOf(20.5, 4.6); N.spawnGnome(G, 0, 'r', 20.5, 4.6); play(30, () => !G.gn.length);
    const E = G.st.ev.filter(e => e[0] > e0).map(e => e[1]), k1 = campOf(20.5, 4.6); out.push('rotolone di petto: ' + E.join(',') + ' | salute ' + (k0 ? k0.sal : '-') + ' -> ' + (k1 ? k1.sal : 'crollato')); }
  // ---- ROTOLONE di striscio sul muro inclinato ----
  { G.gn.length = 0; st.p[0].b = 3; const e0 = G.st.en; N.spawnGnome(G, 0, 'r', 22.2, 11.3); let maxR = 0; play(30, () => { const g = G.gn[0]; if (g && g.r > maxR) maxR = g.r; return !G.gn.length; });
    const E = G.st.ev.filter(e => e[0] > e0).map(e => e[1]); out.push('rotolone sul muro inclinato: ' + E.join(',') + ' | palla piu\' grossa ' + maxR.toFixed(2) + ' | ' + (E.includes('rs') ? 'SCIVOLATO (giusto)' : 'NON scivolato')); }
  // ---- PICCONATORE sul muro dritto di traverso (semplice, 3) ----
  { st.p[0].b = 3; cq.x = 6; cq.y = 9; const ok = N.spawnGnome(G, 0, 'p', 26.6, 10.3); const t = play(40, () => { const k = campOf(26.6, 10.4); return !k || k.sal <= 0; });
    out.push('picconatore (muro semplice): creato ' + ok + ', palle rimaste ' + st.p[0].b + ', muro crollato dopo ' + t.toFixed(1) + ' s'); }
  // ---- PICCONATORE sul muro doppio (6) ----
  { G.gn.length = 0; st.p[0].b = 3; const k0 = campOf(23.5, 6.5); N.spawnGnome(G, 0, 'p', 23.5, 6.5); const t = play(60, () => { const k = campOf(23.5, 6.5); return !k || k.sal <= 0; });
    out.push('picconatore (muro DOPPIO, salute ' + (k0 && k0.max) + '): crollato dopo ' + t.toFixed(1) + ' s'); }
  // ---- CECCHINO contro Pierino fermo allo scoperto ----
  { G.gn.length = 0; st.p[0].b = 3; bot.x = 26.5; bot.y = 2.5; const h0 = st.p[1].h; N.spawnGnome(G, 0, 'c'); const t = play(40, () => st.p[1].h > h0);
    out.push('cecchino: Pierino colpito dopo ' + t.toFixed(1) + ' s, palle del cecchino rimaste ' + (G.gn[0] ? G.gn[0].nb : '-')); }
  // ---- una palla di Pierino abbatte il mio gnomo (un cecchino che gli corre incontro) ----
  { G.gn.length = 0; st.p[0].b = 3; st.p[1].b = 3; bot.x = 26.5; bot.y = 2.5; N.spawnGnome(G, 0, 'c'); play(2.5); const g = G.gn[0]; if (!g) return out.concat('gnomo sparito').join(String.fromCharCode(10)); bot.x = g.x + 4; bot.y = g.y; st.p[1].lt = -9; const ok = N.throwFrom(G, 1, 'd', g.x + 0.3, g.y); play(2, () => !G.gn.length); out.push('palla sullo gnomo: tiro ' + ok + ', gnomo ' + (G.gn.length ? 'ANCORA IN PIEDI' : 'abbattuto') + ' | ' + G.st.ev.slice(-3).map(e => e[1]).join(',')); }
  // ---- colpi sull'igloo di Pierino ----
  { st.p[0].b = 3; const ig = st.p[1].ig; cq.x = 20.5; cq.y = 14.5; for (let k = 0; k < 4; k++) { st.p[0].lt = -9; st.p[0].b = 3; N.throwFrom(G, 0, 'l', ig[0], ig[1]); play(3); } out.push('igloo di Pierino dopo 4 pallonetti: ' + JSON.stringify(st.p[1].ig) + ' -> ' + (N.iglooOf(G, 1) ? 'in piedi' : 'DISTRUTTO')); }
  // ---- disegno con gnomi in campo ----
  { G.gn.length = 0; st.p[0].b = 3; N.spawnGnome(G, 0, 'r'); st.p[0].b = 3; N.spawnGnome(G, 0, 'p'); play(4); cq.on = true; let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma con gnomi e igloo: ' + (t / 20).toFixed(1) + ' ms'); cq.on = false;
    if (window.__SHOT) { cq.on = true; cq.x = 13; cq.y = 9; for (let i = 0; i < 30; i++) step(); cqDraw(); return out.join('\n'); } }
  // ---- partita intera: Pierino costruisce da se' e usa gli gnomi; io sto dietro il muro e tiro ogni tanto ----
  G.tutHold = false; G.st.p[0].h = 0; G.st.p[1].h = 0; G.st.t0 = G.time; G.gn.length = 0;
  const log = {}, cnt = k => { log[k] = (log[k] || 0) + 1; }; let evS = G.st.en, rounds = [];
  for (let i = 0; i < 40000 && G.phase === 'play'; i++) {
    step(); const s2 = G.st;
    if (s2.ph === 'build') { if (G.botBuildAt > 1e8) G.botBuildAt = G.time + 1; if (!s2.p[0].rd && G.time - s2.t0 > 5) s2.p[0].rd = 1; }
    if (s2.ph === 'fight') { const P = s2.p[0], o = G.chars[1];
      if (P.b > 0 && Math.random() < 0.015) N.throwFrom(G, 0, Math.random() < 0.5 ? 'd' : 'l', o.x + (Math.random() - 0.5), o.y + (Math.random() - 0.5));
      if (P.b === 0 && !P.mk) { if (P.sk > 0) { cq.x = P.sx + 0.6; cq.y = P.sy; } N.startMake(G, 0); }
      if (Math.random() < 0.01) { cq.x = 7.7; cq.y = 6.5 + Math.random() * 5; if (!cqFree(cq.x, cq.y) || N.blkAt(G, cq.x, cq.y)) { cq.x = 6.5; cq.y = 9; } } }
    for (const e of s2.ev) if (e[0] > evS) { evS = e[0]; cnt(e[1] + (['gs', 'h', 'bu'].includes(e[1]) ? (e[4] === 0 ? ':io' : ':Pierino') + (e[1] === 'gs' ? '-' + e[5] : '') : '')); }
    if (s2.ph === 'mres' && !rounds.includes(s2.n)) rounds.push(s2.n);
  }
  out.push('partita: ' + (G.endInfo ? G.endInfo.t + ' ' + G.endInfo.why : G.phase) + ' | manche ' + rounds.length);
  out.push('eventi: ' + Object.entries(log).sort().map(([k, v]) => k + ' ' + v).join(', '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
