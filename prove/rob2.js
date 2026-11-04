// Officina dei robot, FASE B (la partita): conto alla rovescia coi comandi fermi, fuori dal ring da un varco, rimbalzo sulla sponda,
// cabina distrutta, 2 round = pannello finale e rivincita, sponde giu' + seghe a meta' round, vittoria ai punti, pedana, manichino ai varchi, fiamma che finisce.
// uso: node prove/cdp.mjs . prove/rob2.js [foto.png]   (window.__SHOT = 'ring' per la foto)
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
  N.saveD(N.cleanD(N.MODELS[2])); N.goDrive(G); await w(100);
  const loc = G.M.local; G.M.local = () => {};
  const tick = n => { for (let i = 0; i < n; i++) { N.U.stopT = 0; N.U.slowT = -9; cqModeTick(0.05); } };   // (fermo immagine e rallentatore vanno a tempo vero: nella prova si saltano)
  // ---- via dal banco di prova col pulsante ----
  document.querySelector('#r2Top [data-k=fight]').click(); await w(100); const m = G.mt;
  out.push('sfida: round ' + m.r + ', fase ' + m.ph + ', pulsanti in alto: ' + [...document.querySelectorAll('#r2Top button')].map(b => b.textContent).join(','));
  { const me = G.mine; me.inp.thr = 1; loc(G, 0.05); const lock = me.inp.thr; const x0 = me.x; tick(20); out.push('prima del via: gas bloccato = ' + (lock === 0) + ', spostato ' + Math.abs(me.x - x0).toFixed(2) + ' | conto alla rovescia: ' + N.U.fx.filter(f => f.k === 'big').map(f => f.s).join(' '));
    tick(55); out.push('dopo 3,75 s: fase ' + m.ph + ', tempo ' + m.left.toFixed(1)); }
  // ---- fuori dal ring da un varco (vicino all'angolo) ----
  { const op = G.dummy; op.x = N.AX0 + 1.0; op.y = N.AY0 + 1.2; op.vx = -5; op.vy = 0; op.w = 0; op.a = Math.PI; let t = 0; while (!op.fall && t < 60) { op.vx = Math.min(op.vx, -3); tick(1); t++; }
    tick(3); out.push('spinto nel varco: ' + (op.fall ? 'CADE dopo ' + (t * 0.05).toFixed(2) + ' s' : 'non cade (x ' + op.x.toFixed(2) + ')') + ' -> fase ' + m.ph + ', vince ' + (m.res && m.res[0]) + ' (' + (m.res && m.res[1]) + '), punteggio ' + m.w.join('-'));
    tick(80); out.push('dopo la pausa: round ' + m.r + ', fase ' + m.ph); tick(75); }
  // ---- contro la sponda (meta' del lato sinistro): rimbalza ----
  { const op = G.dummy; op.x = N.AX0 + 2.0; op.y = N.FLIP.y; op.a = Math.PI; op.vx = -6; op.vy = 0; let minx = 99; for (let i = 0; i < 20; i++) { tick(1); minx = Math.min(minx, op.x); }
    out.push('spinto sulla sponda a ' + (-6) + '/s: ' + (op.fall ? 'CADE (sbagliato)' : 'resta su, baricentro minimo x ' + minx.toFixed(2) + ' (bordo ' + N.AX0 + ')')); }
  // ---- cabina distrutta: secondo round e fine ----
  { const op = G.dummy, c = op.bl.find(q => q.t === 'cabina'); N.hurt(G, op, c, 999, 'prova'); tick(2); out.push('cabina del manichino distrutta: vince ' + m.res[0] + ' (' + m.res[1] + '), punteggio ' + m.w.join('-'));
    tick(80); loc(G, 0.05); const P = document.getElementById('r2End'); out.push('fine partita: fase ' + m.ph + ', pannello: ' + (P ? P.querySelector('h2').textContent + ' / ' + P.querySelector('p').textContent : 'MANCA'));
    P.querySelector('[data-k=again]').click(); await w(50); out.push('rivincita: round ' + G.mt.r + ', punteggio ' + G.mt.w.join('-') + ', pannello ' + (document.getElementById('r2End') ? 'ANCORA LI' : 'via')); }
  // ---- a meta' round: sponde giu', seghe; il manichino sopra una sega ----
  { const m2 = G.mt; tick(75); m2.t0 = G.time - (N.RT - N.SDT) - 0.05; tick(1); out.push('a meta round: sponde verso ' + G.rlT + ', seghe ' + G.sawOn); tick(30); out.push('dopo 1,5 s: sponde alte ' + G.rl.toFixed(2) + ', seghe fuori ' + G.sawZ.toFixed(2));
    const op = G.dummy, me = G.mine; me.x = N.AX0 + 3; me.y = N.FLIP.y; const h0 = N.rem(op); let dmg = 0; for (let i = 0; i < 20; i++) { op.x = N.SAWS[0][0]; op.y = N.SAWS[0][1]; op.vx = op.vy = op.w = 0; op.z = 0; op.vz = 0; const r0 = N.rem(op); tick(1); dmg += r0 - N.rem(op); }
    out.push('manichino sopra la sega 1 s: robot intero ' + Math.round(h0 * 100) + '% -> ' + Math.round(N.rem(op) * 100) + '%, eventi sega ' + G.evs.filter(e => e[0] === 'saw').length);
    // contro il bordo senza sponde: si cade anche a meta' lato
    op.x = N.AX0 + 1.2; op.y = N.FLIP.y; op.vx = -5; op.a = Math.PI; let t = 0; while (!op.fall && t < 40) { op.vx = Math.min(op.vx, -3); tick(1); t++; } out.push('sponde giu, meta lato: ' + (op.fall ? 'cade' : 'NON CADE'));
    tick(160); }
  // ---- vittoria ai punti ----
  { const m3 = G.mt; while (m3.ph !== 'fight' && m3.ph !== 'over') tick(1); const op = G.dummy, me = G.mine; me.x = N.AX0 + 3; me.y = N.FLIP.y - 3; op.x = N.AX1 - 3; op.y = N.FLIP.y + 3;
    op.bl.filter(q => q.t !== 'cabina').slice(0, 4).forEach(q => q.hp = q.mx * 0.2); m3.t0 = G.time - N.RT - 0.05; tick(1);
    out.push('tempo scaduto (manichino ammaccato): vince ' + (m3.res && m3.res[0]) + ' (' + (m3.res && m3.res[1]) + '), punteggio ' + m3.w.join('-')); tick(80); }
  // ---- la pedana: io al centro ----
  { G.mt = null; N.goDrive(G); await w(50); const me = G.mine; G.flp = null; me.x = N.FLIP.x; me.y = N.FLIP.y; me.vx = me.vy = me.w = 0; me.z = 0; let mz = 0, tUp = null; for (let i = 0; i < 40; i++) { tick(1); if (me.z > 0.05 && tUp == null) tUp = i * 0.05; mz = Math.max(mz, me.z); }
    out.push('pedana: scatta dopo ' + (tUp != null ? tUp.toFixed(2) + ' s' : 'MAI') + ', mi alza fino a ' + mz.toFixed(2) + ', ribaltato ' + (me.flip ? 'si' : 'no')); }
  // ---- il manichino da solo vicino ai varchi: si butta giu'? (20 s, io fermo vicino a un angolo) ----
  { let falls = 0, mine = 0; for (let k = 0; k < 3; k++) { N.startMatch(G); await w(20); while (G.mt.ph !== 'fight') tick(1); const me = G.mine, op = G.dummy; me.x = N.AX0 + 2.6; me.y = N.AY0 + 2.6 + k * 4; me.a = 0.8;
      for (let i = 0; i < 400 && G.mt.ph === 'fight'; i++) { me.inp.thr = 0; tick(1); } if (op.ko === 'fall') falls++; if (me.ko === 'fall') mine++; }
    out.push('manichino che insegue vicino ai varchi (3 x 20 s): caduto lui ' + falls + ' volte, buttato giu io ' + mine + ' volte'); }
  // ---- fiamma: 3 s di fuoco, poi spenta finche' non si ricarica ----
  { G.mt = null; N.goDrive(G); await w(20); G.rbs = []; const T1 = N.makeBody({ b: [[3, 3, 'cabina', 0], [3, 2, 'telaio', 0], [3, 2, 'fiamma', 0], [2, 3, 'ruota', 0], [4, 3, 'ruota', 0]] }, 10, 10, 0, 0); G.rbs.push(T1); G.mine = T1; G.dummy = null;
    let on = 0, first = null, back = null; for (let i = 0; i < 200; i++) { T1.inp.fiamma = true; tick(1); if (T1.act.fiamma) { on++; if (first != null && back == null && i * 0.05 - first > 0.5) back = i * 0.05; } else if (first == null && on) first = i * 0.05; }
    out.push('fiamma tenuta premuta 10 s: accesa ' + (on * 0.05).toFixed(1) + ' s, si spegne a ' + (first != null ? first.toFixed(1) : '-') + ' s, riparte a ' + (back != null ? back.toFixed(1) : '-') + ' s'); }
  G.M.local = loc; cq.on = true;
  if (window.__SHOT === 'ring') { N.saveD(N.cleanD(N.MODELS[2])); N.startMatch(G); await w(50); while (G.mt.ph !== 'fight') tick(1); tick(10); G.mt.t0 = G.time - (N.RT - N.SDT) - 0.05; tick(30); const me = G.mine, op = G.dummy; me.x = N.FLIP.x - 3.5; me.y = N.FLIP.y + 0.5; op.x = N.FLIP.x + 1.5; op.y = N.FLIP.y - 1; G.rl = 0.6; G.rlT = 0.6; N.U.parts.length = 0; N.U.fx.length = 0; G.vw = { z: 0.7, x: 0, y: 0 }; cq.x = N.FLIP.x - 1; cq.y = N.FLIP.y; loc(G, 0.05); cqDraw(); }
  return out.join('\n');
})()
