// Officina dei robot: officina (montare, regole dei posti), danni coi lati e le difese, armi, trappole, partita intera contro Nonno Bullone.
// uso: node prove/cdp.mjs . prove/rob1.js [foto.png]   (window.__SHOT = 'build' / 'reveal' / 'fight' per la foto di quella fase)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzRoProva'; store.settings.sound = false; store.settings.robotNb = window.__LV ? { n: 0, w: {}, sd: [0, 0, 0, 0, 0], ty: {}, df: {}, tp: {}, lv: window.__LV } : null; store.settings.robotLast = null; saveStore();
  try { localStorage.setItem('robotHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzRoProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=robot]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + ($('#tkBody').textContent.includes('Come si gioca') ? 'ok' : 'MANCANO') + ', quaderno ' + ($('#tkBody').textContent.includes('Quaderno delle combo') ? 'ok' : 'MANCA'));
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'robot') return out.concat('partita non partita').join('\n');
  const N = window.__robot, M = G.M;
  while (G.pre > 0) cqModeTick(0.05);
  for (let i = 0; i < 4; i++) { cqModeTick(0.05); M.local(G, 0.05); }
  const st = G.st; out.push('fase ' + st.ph + ', arena ' + st.ar + ', ordine ' + st.order.join(',') + ', pannello ' + !!document.getElementById('rbBuild'));
  // ---- regole dei posti ----
  out.push('valido: pala sopra ' + N.valid({ m: 'r', s: ['', '', '', '', 'pala'] }) + ', barra davanti ' + N.valid({ m: 'r', s: ['barra', '', '', '', ''] }) + ', barra sopra ' + N.valid({ m: 'r', s: ['', '', '', '', 'barra'] }) + ', 4 armi ' + N.valid({ m: 'r', s: ['pala', 'sega', 'fiamma', 'cannone', ''] }) + ', cannone sopra ' + N.valid({ m: 'c', s: ['', '', '', '', 'cannone'] }));
  // ---- monto col pannello: tocco i pulsanti come un giocatore ----
  N.U.sel = 0; document.querySelector('#rbBuild [data-p=sega]').click(); await w(80);
  N.U.sel = 2; document.querySelector('#rbBuild [data-p=piastre]').click(); await w(80);
  N.U.sel = 4; document.querySelector('#rbBuild [data-p=pala]').click(); await w(80);   // non va sopra
  N.U.sel = 4; document.querySelector('#rbBuild [data-p=barra]').click(); await w(80);
  document.querySelector('#rbBuild [data-m=c]').click(); await w(80);
  const bd = st.p[0].bd; out.push('montato: ' + bd.s.join('/') + ' ' + bd.m + ' | peso ' + N.weight(bd).toFixed(1) + ' velocita ' + N.spdOf(bd).toFixed(2) + ' spinta ' + N.pushOf(bd).toFixed(2) + ' | pentagono ' + N.stats(bd).map(v => v.toFixed(2)).join(' '));
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms'); }
  if (window.__SHOT === 'build') { cqDraw(); return out.join('\n'); }
  // ---- il computer monta, io pronto -> tenda -> battaglia ----
  for (let i = 0; i < 200 && !st.p[1].rd; i++) { cqModeTick(0.05); M.local(G, 0.05); }
  out.push('Nonno Bullone ha montato ' + G.botTpl + ': ' + st.p[1].bd.s.join('/') + ' ' + st.p[1].bd.m);
  document.querySelector('#rbBuild [data-k=r]').click(); await w(100);
  for (let i = 0; i < 10; i++) { cqModeTick(0.05); M.local(G, 0.05); }
  out.push('dopo pronto: fase ' + G.st.ph + ', tenda ' + !!document.getElementById('rbShow'));
  if (window.__SHOT === 'reveal') { for (let i = 0; i < 40; i++) { cqModeTick(0.05); M.local(G, 0.05); } await w(1700); cqDraw(); return out.join('\n'); }
  for (let i = 0; i < 120 && G.st.ph !== 'fight'; i++) { cqModeTick(0.05); M.local(G, 0.05); }
  out.push('fase ' + G.st.ph + ', pulsanti armi ' + document.querySelectorAll('#rbW button').length + ', stato ' + !!document.getElementById('rbSt'));
  // ---- danni coi lati (prove dirette, poi rimetto a posto) ----
  {
    const S = G.st, save = JSON.stringify(S.p), P = S.p[1], R1 = N.rob(G, 1);
    P.bd = { m: 'r', s: ['piastre', 'corazza', '', 'gomma', ''] }; P.hp = [20, 24, 0, 18, 0]; P.tel = 50;
    const t0 = P.tel; N.damage(G, 1, 0, 'cut', 10, R1.x, R1.y); const a = [P.hp[0], t0 - P.tel];
    const t1 = P.tel; N.damage(G, 1, 1, 'cut', 10, R1.x, R1.y); const b = [P.hp[1], t1 - P.tel];
    const t2 = P.tel; N.damage(G, 1, 3, 'cut', 10, R1.x, R1.y); const c = [P.hp[3], t2 - P.tel];
    const t3 = P.tel; N.damage(G, 1, 2, 'cut', 10, R1.x, R1.y); const d = t3 - P.tel;
    out.push('sega 10 di danno: davanti acciaio -> pezzo ' + a[0] + ' telaio -' + a[1].toFixed(1) + ' | destra corazza -> pezzo ' + b[0] + ' telaio -' + b[1].toFixed(1) + ' | sinistra gomma -> pezzo ' + c[0] + ' telaio -' + c[1].toFixed(1) + ' | dietro scoperto -> telaio -' + d.toFixed(1));
    S.p = JSON.parse(save);
  }
  // ---- le armi: metto il computer davanti a me e sparo ----
  {
    const S = G.st, me = S.p[0], bot = G.chars[1], R = N.U.R; S.p[1].tel = 50;
    R.x = 9; R.y = 10; R.a = 0; cq.x = 9; cq.y = 10; bot.R.x = bot.x = 9.95; bot.R.y = bot.y = 10; bot.R.a = Math.PI;
    const tel0 = S.p[1].tel; const ok = N.fire(G, 0, 0); for (let i = 0; i < 40; i++) { G.time += 0.05; N.arenaTick(G, 0.05); }
    out.push('sega davanti: sparata ' + ok + ', danno al Nonno ' + (tel0 - S.p[1].tel).toFixed(1) + ' (+pezzo davanti ' + S.p[1].hp[0].toFixed(1) + '), colpi rimasti ' + me.u[0]);
    out.push('sega di nuovo subito: ' + N.fire(G, 0, 0) + ' (ricarica)');
  }
  // ---- pala di fianco: ribalta (senza barra) / con la barra si raddrizza ----
  {
    const S = G.st, save = JSON.stringify(S.p), sv = { ph: S.ph, t0: S.t0 };
    S.p[0].bd = { m: 'r', s: ['pala', '', '', '', ''] }; S.p[0].hp = [14, 0, 0, 0, 0]; S.p[0].u = [8, 0, 0, 0, 0]; S.p[0].cd = [0, 0, 0, 0, 0];
    S.p[1].bd = { m: 'r', s: ['corazza', '', '', '', 'barra'] }; S.p[1].hp = [24, 0, 0, 0, 10]; S.p[1].d = 0; S.p[1].fp = null;
    const R = N.U.R, bot = G.chars[1]; R.x = 9; R.y = 10; R.a = 0; bot.R.x = bot.x = 9.9; bot.R.y = bot.y = 10; bot.R.a = Math.PI / 2;   // il Nonno mi mostra il fianco
    N.fire(G, 0, 0); const a1 = 'barra: ' + (S.p[1].d ? 'RIBALTATO' : 'raddrizzato, barra ' + S.p[1].hp[4]);
    S.p[0].cd = [0, 0, 0, 0, 0]; S.p[1].fp = null; G.time += 2; N.fire(G, 0, 0); const a2 = 'senza barra: ' + (S.p[1].d === 'r' ? 'ribaltato (fase ' + S.ph + ')' : 'NON ribaltato');
    out.push('pala di fianco -> ' + a1 + ' | ' + a2);
    S.p = JSON.parse(save); S.ph = sv.ph; S.t0 = sv.t0; S.win = -1;
  }
  // ---- pala di fronte: lancia ----
  {
    const S = G.st, save = JSON.stringify(S.p);
    S.p[0].bd = { m: 'r', s: ['pala', '', '', '', ''] }; S.p[0].hp = [14, 0, 0, 0, 0]; S.p[0].u = [8, 0, 0, 0, 0]; S.p[0].cd = [0, 0, 0, 0, 0];
    const R = N.U.R, bot = G.chars[1]; R.x = 9; R.y = 10; R.a = 0; bot.R.x = bot.x = 9.9; bot.R.y = bot.y = 10; bot.R.a = Math.PI; bot.R.kn = null; G.tutHold = true;
    N.fire(G, 0, 0); const x0 = bot.R.x; for (let i = 0; i < 30; i++) { await w(16); N.phys(G, 1, bot.R, null, 0.016); }
    out.push('pala di fronte: il Nonno vola da ' + x0.toFixed(2) + ' a ' + bot.R.x.toFixed(2));
    S.p = JSON.parse(save); G.tutHold = false;
  }
  // ---- le trappole: arena per arena ----
  for (const ar of ['seg', 'cen', 'cal']) {
    const S = G.st, save = JSON.stringify(S.p), sv = { ar: S.ar, t0: S.t0, ph: S.ph }; S.ar = ar; S.t0 = G.time; S.p[1].tel = 50; S.p[0].tel = 50; S.p[1].hp = S.p[1].hp.map(() => 0); S.p[0].hp = S.p[0].hp.map(() => 0);
    const bot = G.chars[1], R = N.U.R; let msg = ar + ': ';
    if (ar === 'seg') { const b = N.BLADES[0]; bot.R.x = bot.x = b[0]; bot.R.y = bot.y = b[1]; R.x = cq.x = 6; R.y = cq.y = 14; let up = 0; for (let i = 0; i < 160; i++) { G.time += 0.05; N.arenaTick(G, 0.05); if (N.bladeT(0, G.time - S.t0, false).up) up++; } msg += 'lame (8 s) -> telaio ' + S.p[1].tel.toFixed(1) + ' (lama alzata ' + (up * 0.05).toFixed(1) + ' s)';
      bot.R.x = bot.x = 12.2; bot.R.y = bot.y = 10; N.arenaTick(G, 0.05); msg += ', nella fossa -> ' + (S.p[1].d || 'NIENTE'); }
    if (ar === 'cen') { bot.R.x = bot.x = 4.45; bot.R.y = bot.y = 9; R.x = cq.x = 8; R.y = cq.y = 12; N.arenaTick(G, 0.05); msg += 'recinto -> telaio ' + S.p[1].tel.toFixed(1) + ' fermo ' + (S.p[1].stn > G.time);
      bot.R.x = bot.x = 8.3; bot.R.y = bot.y = 6.9; S.p[0].bd = { m: 'r', s: ['', '', '', '', 'scossa'] }; S.p[0].hp = [0, 0, 0, 0, 12]; S.p[0].u = [0, 0, 0, 0, 5]; S.p[0].cd = [0, 0, 0, 0, 0]; R.x = cq.x = 8.3; R.y = cq.y = 10.5; const t0 = S.p[1].tel; N.fire(G, 0, 4); msg += ' | scossa da 3,6 caselle nella pozzanghera -> -' + (t0 - S.p[1].tel).toFixed(1); }
    if (ar === 'cal') { bot.R.x = bot.x = N.HAMS[0][0]; bot.R.y = bot.y = N.HAMS[0][1]; R.x = cq.x = 5; R.y = cq.y = 5; G.hamK = 0; for (let i = 0; i < 130; i++) { G.time += 0.05; N.arenaTick(G, 0.05); } msg += 'martello -> telaio ' + S.p[1].tel.toFixed(1);
      S.p[1].tel = 50; S.p[0].bd = { m: 'r', s: ['fiamma', '', '', '', ''] }; S.p[0].hp = [12, 0, 0, 0, 0]; S.p[0].u = [6, 0, 0, 0, 0]; S.p[0].cd = [0, 0, 0, 0, 0]; S.p[0].d = 0; const o = N.OILS[2]; bot.R.x = bot.x = o[0] + 0.3; bot.R.y = bot.y = o[1]; R.x = cq.x = o[0] - 1.6; R.y = cq.y = o[1]; R.a = 0; S.oil = S.oil.map(() => 0); S.oilC = S.oilC.map(() => 0);
      N.fire(G, 0, 0); for (let i = 0; i < 40; i++) { G.time += 0.05; N.arenaTick(G, 0.05); } msg += ' | fiamma sull\'olio: acceso ' + (S.oil[2] > G.time - 3) + ', telaio ' + S.p[1].tel.toFixed(1); }
    out.push(msg);
    S.p = JSON.parse(save); S.ar = sv.ar; S.t0 = sv.t0; S.ph = sv.ph; S.win = -1;
  }
  // ---- disegno ----
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma (battaglia): ' + (t / 20).toFixed(1) + ' ms'); }
  if (window.__SHOT === 'fight') { const R = N.U.R, bot = G.chars[1]; R.x = cq.x = 9; R.y = cq.y = 10; R.a = 0.3; bot.R.x = bot.x = 11; bot.R.y = bot.y = 9; bot.R.a = 2.6; cq.on = true; cqDraw(); return out.join('\n'); }
  // ---- partita intera: io guido verso il Nonno e sparo quando e' nella zona ----
  cq.on = false; cancelAnimationFrame(cq.raf);
  const keys = cq.keys, step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  const log = {}, says = new Set(), rounds = []; let lastN = 0, evS = 0, maxE = 0;
  // il mio robot: torno al mio progetto
  G.st.p[0] = Object.assign(G.st.p[0], { bd: { m: 'c', s: ['sega', 'corazza', 'piastre', 'corazza', 'barra'] }, hp: [14, 24, 20, 24, 10], u: [10, 0, 0, 0, 0], cd: [0, 0, 0, 0, 0], tel: 50, d: 0 });
  for (let i = 0; i < 60000 && G.phase === 'play'; i++) {
    const S = G.st; if (!S) { step(0.05); continue; }
    if (S.say) says.add(S.say.x);
    if (S.ph === 'build' && !S.p[0].rd && G.time - S.t0 > 3) { if (S.n > 1) N.setBuild(G, 0, { m: 'r', s: ['pala', 'corazza', 'gomma', 'corazza', 'scossa'] }); S.p[0].rd = 1; }
    for (const k in keys) delete keys[k];
    if (S.ph === 'fight' && !S.p[0].d) {
      const R = N.U.R, Q = N.rob(G, 1); if (R) { const dx = Q.x - R.x, dy = Q.y - R.y; const sx = (dx - dy), sy = (dx + dy) / 2; if (Math.abs(sx) > 0.3) keys[sx > 0 ? 'd' : 'a'] = true; if (Math.abs(sy) > 0.3) keys[sy > 0 ? 's' : 'w'] = true;
        for (let k = 0; k < 5; k++) { const hot = N.zoneHit(G, 0, k, R, Q) && S.p[0].cd[k] <= G.time; const H = G.__hot || (G.__hot = {}); if (!hot) H[k] = null; else if (H[k] == null) H[k] = G.time; else if (G.time - H[k] >= 0.3) { N.fire(G, 0, k); H[k] = null; } } }
    }
    step(0.05);
    for (const e of S.ev) { if (e[0] <= evS) continue; evS = e[0]; log[e[1]] = (log[e[1]] || 0) + 1; }
    if (S.n !== lastN) { lastN = S.n; rounds.push('manche ' + S.n + ' ' + S.ar); }
    if (S.ph === 'mres' && !S.__seen) { S.__seen = 1; rounds.push('  -> ' + S.msg.replace(/\n/g, ' | ')); }
  }
  for (const k in keys) delete keys[k];
  out.push(rounds.join('\n'));
  out.push('fine: ' + (G.endInfo ? G.endInfo.t + ' ' + G.endInfo.why : 'NON FINITA (fase ' + G.st.ph + ')') + ' | tempo ' + G.time.toFixed(0) + ' s');
  out.push('eventi: ' + Object.entries(log).map(([k, v]) => k + ' ' + v).join(', '));
  out.push('frasi del Nonno: ' + [...says].slice(0, 6).join(' / '));
  out.push('memoria del Nonno: ' + JSON.stringify(N.nbMem()));
  return out.join('\n');
})()
