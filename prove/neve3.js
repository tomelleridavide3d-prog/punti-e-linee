// Battaglia di palle di neve, passo 3: lo SLITTINO-ARIETE. Compare al centro, ci salgo, spingo col dito contro un muro di traverso (sfonda)
// e contro uno inclinato (scivola), cannone con le palle grosse, colpito = cado, dopo 15 s si rompe; poi Pierino alla guida; partita intera.
// uso: node prove/cdp.mjs . prove/neve3.js
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
  st.p[1].nv = 80;
  N.buildAct(G, 1, 'w', [[20.5, 4.2], [20.5, 8.2]]);          // di traverso (di petto)
  N.buildAct(G, 1, 'w', [[20.2, 10.4], [24.2, 12.2]]);        // inclinato (di striscio)
  N.buildAct(G, 1, 'w', [[23.5, 5], [23.5, 8]]); N.buildAct(G, 1, 'w', [[23.5, 5], [23.5, 8]]);   // doppio
  N.startFight(G); for (let i = 0; i < 70; i++) step();
  const campOf = (x, y) => { const S = G.S, n = S.bl.findIndex(b => Math.hypot(b.x - x, b.y - y) < 0.3); return n < 0 ? null : { n, sal: N.salOf(G, n), max: S.camp[S.bc[n]].max }; };
  const evs = e0 => G.st.ev.filter(e => e[0] > e0).map(e => e[1]).join(',');
  // ---- compare a SLED_AT secondi ----
  G.st.t0 = G.time - N.SLED_AT - 0.2; step(); out.push('slittino: ' + JSON.stringify(G.st.sl) + ' | scritta: ' + M.big(G));
  // ---- ci salgo col pulsante grande ----
  cq.x = G.st.sl.x - 0.6; cq.y = G.st.sl.y; step(); const b = M.btn(G); out.push('pulsante: ' + (b && b.t)); M.act(G); step();
  out.push('in sella: ' + N.riding(G, 0) + ', velocita\' ' + M.speed(G.me) + ', cannone ' + G.st.sl.am);
  // ---- spingo col dito (verso +x nella mappa) contro il muro di traverso: SBAM ----
  { const k0 = campOf(20.5, 6.2), e0 = G.st.en; cq.x = 20.5 - 0.66; cq.y = 6.2; cq.joy = { id: 1, x0: 100, y0: 100, x: 140, y: 120 }; for (let i = 0; i < 30; i++) step(); cq.joy = null;
    const k1 = campOf(20.5, 6.2); out.push('ariete di petto: ' + evs(e0) + ' | salute ' + k0.sal + '/' + k0.max + ' -> ' + (k1 ? k1.sal : '-')); }
  // ---- contro il muro inclinato (stessa spinta verso +x): scivola ----
  { const k0 = campOf(22.2, 11.3), e0 = G.st.en; cq.x = 21.6; cq.y = 10.6; G.ramT = {}; N.ram(G, 0, k0.n, 1, 0); step();
    const k1 = campOf(22.2, 11.3); out.push('ariete di striscio: ' + (evs(e0) || 'niente') + ' | salute ' + k0.sal + ' -> ' + k1.sal + (evs(e0).includes('rs') && k1.sal === k0.sal ? ' (SCIVOLA, giusto)' : '')); }
  // ---- doppio: due colpi d'ariete ----
  { const k0 = campOf(23.5, 6.5); cq.x = 23.5 - 0.8; cq.y = 6.5; for (let i = 0; i < 2; i++) { G.ramT = {}; N.ram(G, 0, k0.n, 1, 0); } const k1 = campOf(23.5, 6.5); out.push('ariete sul muro DOPPIO (' + k0.max + '): ' + k0.sal + ' -> ' + (k1 ? k1.sal : '-')); }
  // ---- il cannone: palla grossa (2 di danno), si consumano le palle del cannone, non quelle in mano ----
  { const k = campOf(22.2, 11.3), e0 = G.st.en, b0 = G.st.p[0].b, a0 = G.st.sl.am; cq.x = 17; cq.y = 11.3; G.st.p[0].lt = -9; N.throwFrom(G, 0, 'd', 21.5, 11.3); for (let i = 0; i < 30; i++) step(); const k2 = campOf(22.2, 11.3);
    out.push('cannone: palle in mano ' + b0 + ' -> ' + G.st.p[0].b + ', cannone ' + a0 + ' -> ' + (G.st.sl.am != null ? G.st.sl.am : '-') + ', eventi ' + evs(e0) + ', salute ' + k.sal + ' -> ' + (k2 ? k2.sal : '-')); }
  // ---- travolgo Pierino ----
  { const e0 = G.st.en, h0 = G.st.p[1].h; bot.x = cq.x + 0.5; bot.y = cq.y; for (let i = 0; i < 4; i++) step(); out.push('travolto: colpi di Pierino ' + h0 + ' -> ' + G.st.p[1].h + ' | ' + evs(e0)); }
  // ---- colpito sullo slittino: cado ----
  { for (let i = 0; i < 12; i++) step(); bot.x = cq.x + 4; bot.y = cq.y; G.st.p[1].b = 3; G.st.p[1].lt = -9; const e0 = G.st.en; N.throwFrom(G, 1, 'd', cq.x, cq.y); for (let i = 0; i < 20; i++) step(); out.push('colpito sullo slittino: ' + evs(e0) + ' | slittino ' + JSON.stringify(G.st.sl)); }
  // ---- Pierino alla guida (lo slittino rimesso al centro) ----
  { G.st.p[0].h = 0; G.st.p[1].h = 0; G.st.sl = { ph: 'w', x: 15, y: 12.9, t0: G.time }; G.tutHold = false; G.wb.push(...[5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12].map((y, i) => ({ o: 0, s: 900, i, x: 8.6, y, a: 1.57, k: 1, j: 0, as: 0, fx: 0, fy: 0 }))); G.wv++; G.S = N.structure(G.wb); G.S.v = G.wv; G.st.wv = G.wv; G.st.cs = G.S.camp.map(c => c.max); G.wdS = N.encode(G.wb); bot.x = 15.5; bot.y = 12.9; cq.x = 6; cq.y = 9; const e0 = G.st.en;
    for (let i = 0; i < 20 * 17 && G.st.ph === 'fight'; i++) { G.st.t0 = G.time - 50; step(); }
    const E = G.st.ev.filter(e => e[0] > e0).map(e => e[1]); const c = k => E.filter(x => x === k).length;
    out.push('Pierino alla guida: salito ' + c('sm') + ', colpi d\'ariete ' + c('ram') + ', scivolate ' + c('rs') + ', cannonate ' + c('td') + ', fine ' + c('sx') + ' | slittino ' + JSON.stringify(G.st.sl)); }
  // ---- peso ----
  { cq.on = true; let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } cq.on = false; out.push('un fotogramma: ' + (t / 20).toFixed(1) + ' ms'); }
  // ---- partita intera ----
  G.st.p[0].h = 0; G.st.p[1].h = 0; G.st.t0 = G.time; G.st.sl = null; G.gn.length = 0;
  const log = {}, cnt = k => { log[k] = (log[k] || 0) + 1; }; let evS = G.st.en, rounds = 0;
  for (let i = 0; i < 40000 && G.phase === 'play'; i++) {
    step(); const s2 = G.st;
    if (s2.ph === 'build') { if (G.botBuildAt > 1e8) G.botBuildAt = G.time + 1; if (!s2.p[0].rd && G.time - s2.t0 > 5) s2.p[0].rd = 1; }
    if (s2.ph === 'fight') { const P = s2.p[0], o = G.chars[1];
      if (P.b > 0 && Math.random() < 0.015) N.throwFrom(G, 0, Math.random() < 0.5 ? 'd' : 'l', o.x + (Math.random() - 0.5), o.y + (Math.random() - 0.5));
      if (P.b === 0 && !P.mk) { if (P.sk > 0) { cq.x = P.sx + 0.6; cq.y = P.sy; } N.startMake(G, 0); }
      if (Math.random() < 0.01) { cq.x = 7.7; cq.y = 6.5 + Math.random() * 5; if (!cqFree(cq.x, cq.y) || N.blkAt(G, cq.x, cq.y)) { cq.x = 6.5; cq.y = 9; } } }
    for (const e of s2.ev) if (e[0] > evS) { evS = e[0]; cnt(e[1] + (['sm', 'gs', 'bu'].includes(e[1]) ? (e[4] === 0 ? ':io' : ':Pierino') : '')); }
    if (s2.ph === 'mres' && s2.t0 === G.time) rounds++;
  }
  out.push('partita: ' + (G.endInfo ? G.endInfo.t + ' ' + G.endInfo.why : G.phase));
  out.push('eventi: ' + Object.entries(log).sort().map(([k, v]) => k + ' ' + v).join(', '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
