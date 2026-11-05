// Officina dei robot: la PARTITA nella DISCARICA e le ARMI NUOVE. Conto alla rovescia coi comandi fermi, cumuli che tengono dentro,
// cabina distrutta, 2 round = pannello e rivincita, vittoria ai punti; taser (ruote bloccate), mina (scoppia sotto l'avversario, non sotto di me),
// razzi (inseguono, 2 colpi), lanciadischi (rimbalza sui cumuli), avviso dell'arma coperta in officina, fiamma che finisce.
// uso: node prove/cdp.mjs . prove/rob2.js [foto.png]   (window.__SHOT = 'arena' per la foto)
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
  const dC = b => Math.hypot(b.x - N.ARX, b.y - N.ARY), hpOf = b => Math.round(b.bl.reduce((a, q) => a + Math.max(0, q.hp), 0));
  out.push('discarica: ' + N.JUNK.props.length + ' caselle di cumulo, lampioni ' + N.JUNK.lamps.length + ', bidoni col fuoco ' + N.JUNK.fires.length + ', luccioline ' + N.JUNK.flies.length + ', altezza dei cumuli dietro ' + N.jH(N.ARX - 10, N.ARY - 10).toFixed(2) + ' / davanti ' + N.jH(N.ARX + 10, N.ARY + 10).toFixed(2));
  // ---- la partita ----
  document.querySelector('#r2Top [data-k=fight]').click(); await w(50); document.querySelector('#r2Pick [data-k=cpu]').click(); await w(100); const m = G.mt;
  { const me = G.mine; me.inp.thr = 1; loc(G, 0.05); const lock = me.inp.thr; const x0 = me.x; tick(20); out.push('prima del via: gas bloccato = ' + (lock === 0) + ', spostato ' + Math.abs(me.x - x0).toFixed(2)); tick(55); out.push('dopo 3,75 s: fase ' + m.ph); }
  { const op = G.dummy; op.x = N.ARX + 7; op.y = N.ARY; op.a = 0; let mx = 0; const ev0 = G.evN || 0; for (let i = 0; i < 30; i++) { op.vx = 6; op.vy = 0; tick(1); mx = Math.max(mx, dC(op)); }
    out.push('spinto contro i cumuli a 6/s per 1,5 s: baricentro al massimo a ' + mx.toFixed(2) + ' dal centro (raggio ' + N.ARR + '), caduto ' + (op.fall ? 'SI' : 'no') + ', botte ' + G.evs.filter(e => e.sq > ev0).filter(e => e[0] === 'bang').length + ', fase ' + m.ph); }
  { const op = G.dummy, c = op.bl.find(q => q.t === 'cabina'); N.hurt(G, op, c, 999, 'prova'); tick(2); out.push('cabina distrutta: vince ' + m.res[0] + ' (' + m.res[1] + '), punteggio ' + m.w.join('-')); tick(80); }
  { while (m.ph !== 'fight') tick(1); const op = G.dummy; op.bl.filter(q => q.t !== 'cabina').slice(0, 4).forEach(q => q.hp = q.mx * 0.2); m.t0 = G.time - N.RT - 0.05; tick(1); out.push('tempo scaduto: vince ' + m.res[0] + ' (' + m.res[1] + '), punteggio ' + m.w.join('-'));
    tick(80); loc(G, 0.05); const P = document.getElementById('r2End'); out.push('fine partita: ' + (P ? P.querySelector('h2').textContent + ' / ' + P.querySelector('p').textContent : 'MANCA')); P.querySelector('[data-k=free]').click(); await w(50); }
  // ---- le armi nuove, su un robot di prova pulito (cabina, telaio davanti con l'arma, due ruote) ----
  N.U.dumAI = false; N.goDrive(G); await w(50);
  const mk = (arm, dir, x, y, a) => { const T1 = N.makeBody({ b: [[3, 3, 'cabina', 0], [3, 2, 'telaio', 0], [3, 2, arm, dir], [2, 3, 'ruota', 0], [4, 3, 'ruota', 0]] }, x, y, a, 0); T1.uid = 'pv' + arm; G.rbs = G.rbs.filter(b => b !== G.mine && !String(b.uid).startsWith('pv')); G.rbs.push(T1); return T1; };
  const D = () => G.dummy;
  { const T1 = mk('taser', 0, N.ARX - 2, N.ARY, 0), d = D(); d.x = T1.x + 2.6; d.y = T1.y; d.a = Math.PI; d.vx = d.vy = d.w = 0; tick(2); const hp0 = hpOf(d); T1.inp.taser = true; tick(1);
    const st = d.stun - G.time; out.push('taser: manichino bloccato per ' + (st > 0 ? st.toFixed(2) + ' s' : 'NIENTE') + ', salute ' + hp0 + ' -> ' + hpOf(d) + ', ricarica ' + (T1.cd['T32'] - G.time).toFixed(1) + ' s');
    const run = s => { T1.x = N.ARX - 4; T1.y = N.ARY + 4; T1.a = 0; T1.vx = T1.vy = T1.w = 0; T1.stun = s ? G.time + 5 : 0; const x0 = T1.x; for (let i = 0; i < 10; i++) { T1.inp.thr = 1; T1.inp.steer = 0; tick(1); } return (T1.x - x0).toFixed(2); };
    out.push('gas a fondo per 0,5 s: stordito ' + run(true) + ' caselle, normale ' + run(false)); }
  { const T1 = mk('mina', 2, N.ARX, N.ARY + 3, 0), d = D(); d.x = N.ARX + 6; d.y = N.ARY - 4; tick(2); T1.inp.mina = true; tick(1); const mn = (G.mines || [])[0], am = T1.bl.find(q => q.t === 'mina').am;
    out.push('mina: lasciata ' + (mn ? 'a ' + mn.x.toFixed(1) + ',' + mn.y.toFixed(1) + ' (il robot e\' a ' + T1.x.toFixed(1) + ',' + T1.y.toFixed(1) + ')' : 'NESSUNA') + ', rimaste ' + am);
    if (mn) { T1.x = mn.x; T1.y = mn.y; T1.vx = T1.vy = 0; tick(30); const still = G.mines.length; const hp0 = hpOf(d), ev0 = G.evs.length; d.x = mn.x; d.y = mn.y; d.vx = d.vy = 0; d.z = 0; T1.x = N.ARX - 6; T1.y = N.ARY + 6; let mz = 0; for (let i = 0; i < 8; i++) { tick(1); mz = Math.max(mz, d.z); }
      out.push('mina sotto di me: ' + (still ? 'resta li' : 'SCOPPIATA') + ' | sotto il manichino: ' + (G.evs.filter(e => e.sq > ev0).some(e => e[0] === 'boom') ? 'BOOM' : 'niente') + ', salute ' + hp0 + ' -> ' + hpOf(d) + ', alzato fino a ' + mz.toFixed(2) + ', mine a terra ' + G.mines.length); } tick(40); }
  { const T1 = mk('razzo', 0, N.ARX - 6, N.ARY, 0), d = D(); d.x = N.ARX + 1; d.y = N.ARY + 3.5; d.vx = d.vy = d.w = 0; d.z = 0; tick(2); const hp0 = hpOf(d), ev0 = G.evs.length; T1.inp.razzo = true; tick(1); const rk = G.proj.find(p => p.k === 'rk'); const a0 = rk ? rk.ang : 0; let maxTurn = 0;
    for (let i = 0; i < 50 && G.proj.some(p => p.k === 'rk'); i++) { tick(1); if (rk) maxTurn = Math.max(maxTurn, Math.abs(rk.ang - a0)); }
    const booms = G.evs.filter(e => e.sq > ev0).filter(e => e[0] === 'boom'); out.push('razzo verso un manichino di lato (3,5 caselle fuori linea): curva di ' + (maxTurn * 57.3).toFixed(0) + ' gradi, esplosioni ' + booms.length + (booms[0] ? ' a ' + Math.hypot(booms[0][1] - d.x, booms[0][2] - d.y).toFixed(1) + ' dal manichino' : '') + ', salute ' + hp0 + ' -> ' + hpOf(d));
    T1.inp.razzo = true; tick(30); T1.inp.razzo = true; tick(2); const left = T1.bl.find(q => q.t === 'razzo').am; out.push('razzi: dopo altri due tocchi ne restano ' + left + ', in volo ' + G.proj.filter(p => p.k === 'rk').length); tick(60); }
  { const T1 = mk('dischi', 0, N.ARX, N.ARY, 0.3), d = D(); d.x = N.ARX - 8; d.y = N.ARY - 6; tick(2); const ev0 = G.evN || 0; T1.inp.dischi = true; tick(1); const dk = G.proj.find(p => p.k === 'dk'); let maxD = 0; for (let i = 0; i < 70 && G.proj.includes(dk); i++) { tick(1); maxD = Math.max(maxD, dC(dk)); }
    out.push('disco: rimbalzi sui cumuli ' + G.evs.filter(e => e.sq > ev0).filter(e => e[0] === 'tink' && !e[3]).length + ', colpi sui robot ' + G.evs.filter(e => e.sq > ev0).filter(e => e[0] === 'tink' && e[3]).length + ', sempre dentro la radura ' + (maxD <= N.ARR ? 'si' : 'NO ' + maxD.toFixed(2)) + ', ricarica ' + (T1.cd['D32'] - G.time).toFixed(1) + ' s'); }
  // ---- avviso in officina: sega che punta contro un telaio del mio robot ----
  { const d = N.cleanD({ b: [[3, 3, 'cabina', 0], [3, 2, 'telaio', 0], [3, 1, 'telaio', 0], [3, 2, 'sega', 0], [2, 3, 'ruota', 0], [4, 3, 'ruota', 0], [3, 1, 'martello', 0]] }); N.saveD(d); N.goShop(G); await w(100);
    out.push('arma coperta: ' + N.covered(N.myD()).map(i => N.myD().b[i][2]).join(',') + ' | scritta: ' + (document.querySelector('#r2Shop .msg').textContent.match(/⚠️[^!]*!/) || ['NESSUNA'])[0]); N.saveD(N.cleanD(N.MODELS[2])); N.goDrive(G); await w(50); }
  // ---- fiamma: 3 s di fuoco, poi spenta finche' non si ricarica ----
  { const T1 = mk('fiamma', 0, N.ARX, N.ARY + 5, 0); let on = 0, first = null, back = null; for (let i = 0; i < 200; i++) { T1.inp.fiamma = true; tick(1); if (T1.act.fiamma) { on++; if (first != null && back == null && i * 0.05 - first > 0.5) back = i * 0.05; } else if (first == null && on) first = i * 0.05; }
    out.push('fiamma tenuta premuta 10 s: accesa ' + (on * 0.05).toFixed(1) + ' s, si spegne a ' + (first != null ? first.toFixed(1) : '-') + ' s, riparte a ' + (back != null ? back.toFixed(1) : '-') + ' s'); }
  // ---- il manichino da solo 20 s contro di me fermo vicino ai cumuli ----
  { N.U.dumAI = true; N.goDrive(G); await w(20); const me = G.mine, d = D(); me.x = N.ARX - 8; me.y = N.ARY; let mx = 0; for (let i = 0; i < 400; i++) { me.inp.thr = 0; tick(1); mx = Math.max(mx, dC(d)); } out.push('manichino 20 s: al massimo a ' + mx.toFixed(1) + ' dal centro, la mia salute ' + hpOf(me) + '/' + Math.round(me.bl.reduce((a, q) => a + q.mx, 0))); }
  G.M.local = loc; cq.on = true; N.U.parts.length = 0; N.U.fx.length = 0;
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma nella discarica: ' + (t / 20).toFixed(1) + ' ms'); }
  if (window.__SHOT === 'arena') { N.saveD(N.cleanD(N.MODELS[2])); N.startMatch(G); await w(50); while (G.mt.ph !== 'fight') tick(1); tick(10); const me = G.mine, op = G.dummy; me.x = N.ARX - 3.5; me.y = N.ARY + 1.5; me.a = -0.3; op.x = N.ARX + 2; op.y = N.ARY - 1.5; op.a = Math.PI * 0.9;
    me.inp.razzo = true; tick(4); (G.mines = G.mines || []).push({ x: N.ARX - 1, y: N.ARY + 4, team: 1, t: G.time - 2 }); N.U.parts.length = 0; N.U.fx.length = 0; G.vw = { z: 0.62, x: 0.5, y: -1.2 }; cq.x = N.ARX - 1; cq.y = N.ARY; loc(G, 0.05); cqDraw(); }
  return out.join('\n');
})()
