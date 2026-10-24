// Officina dei robot (PROTOTIPO): officina col dito (blocco sotto + arma sopra, girare, togliere, pezzi staccati), guida (velocita',
// sterzo, testacoda di 180), ruote da un lato = tira storto, cuneo che alza, pala che lancia e ribalta, raddrizzamento, armi, fossa, misure.
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
  // ---- officina col dito ----
  const cv = document.querySelector('#r2Shop canvas.gr'); let r = cv.getBoundingClientRect();
  const tap = (x, y, move) => { r = cv.getBoundingClientRect(); const P = (a, b) => ({ clientX: r.left + (a + 0.5) / 7 * r.width, clientY: r.top + (b + 0.5) / 7 * r.height, pointerId: 1, bubbles: true }); cv.dispatchEvent(new PointerEvent('pointerdown', P(x, y))); for (const [mx, my] of move || []) cv.dispatchEvent(new PointerEvent('pointermove', P(mx, my))); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true })); };
  const pick = t => document.querySelector('#r2Shop [data-t=' + t + ']').click();
  const cellOf = (x, y) => N.myD().b.filter(q => q[0] === x && q[1] === y).map(q => q[2] + (q[3] ? '@' + q[3] : '')).join('+') || '-';
  pick('telaio'); tap(2, 3, [[1, 3]]); tap(4, 3, [[5, 3]]); tap(3, 2); tap(3, 4); tap(3, 5);
  pick('ruota'); tap(1, 2); tap(5, 2); tap(1, 4); tap(5, 4);
  pick('cingolo'); tap(2, 2); tap(4, 2);
  pick('cuneo'); tap(3, 1);
  pick('pala'); tap(2, 3);   // sopra il telaio: il telaio resta
  pick('sega'); tap(4, 3); tap(4, 3);   // sopra il telaio, poi girata a destra
  pick('martello'); tap(2, 1);   // da solo nella casella vuota
  pick('cannone'); tap(3, 5); tap(3, 5); tap(3, 5);   // sopra il telaio dietro, girato indietro
  pick('fiamma'); tap(1, 2);   // sopra una ruota: non si puo'
  const tapS = (x, y, sx, sy) => { r = cv.getBoundingClientRect(); const P = { clientX: r.left + (x + 0.5 + sx * 0.38) / 7 * r.width, clientY: r.top + (y + 0.5 + sy * 0.38) / 7 * r.height, pointerId: 1, bubbles: true }; cv.dispatchEvent(new PointerEvent('pointerdown', P)); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true })); };
  pick('corazza'); tapS(1, 3, -1, 0); tapS(5, 3, 1, 0); tapS(3, 3, 1, 0); const blockedMsg = document.querySelector('#r2Shop .msg').textContent.slice(0, 50); tapS(1, 2, 0, -1);
  out.push('corazze: 1,3 = ' + cellOf(1, 3) + ' | 5,3 = ' + cellOf(5, 3) + ' | cabina, lato destro che tocca il telaio = ' + cellOf(3, 3) + ' -> ' + blockedMsg + ' | ruota 1,2 davanti = ' + cellOf(1, 2));
  pick('nos'); tap(3, 4); tap(3, 4); tap(3, 4); out.push('nos sopra il telaio 3,4 girato indietro: ' + cellOf(3, 4));
  out.push('caselle: 2,3 = ' + cellOf(2, 3) + ' | 4,3 = ' + cellOf(4, 3) + ' | 2,1 = ' + cellOf(2, 1) + ' | 3,5 = ' + cellOf(3, 5) + ' | 1,2 (fiamma sulla ruota) = ' + cellOf(1, 2) + ' -> ' + document.querySelector('#r2Shop .msg').textContent.slice(0, 60));
  document.querySelector('#r2Shop [data-k=x]').click(); tap(4, 3); const afterDel = cellOf(4, 3); document.querySelector('#r2Shop [data-k=x]').click();
  pick('sega'); tap(4, 3);
  const st = N.statsOf(N.myD());
  out.push('togli sulla casella con la sega: resta ' + afterDel + ' | progetto ' + N.myD().b.length + ' pezzi, peso ' + st.M + ', armi ' + st.wpn.join('/') + ', non collegati ' + st.loose);
  for (let i = 0; i < 6; i++) { M.local(G, 0.05); await w(40); }
  if (window.__SHOT === 'shop') { cqDraw(); return out.join('\n'); }
  // ---- banco di prova ----
  document.querySelector('#r2Shop [data-k=go]').click(); await w(200);
  out.push('pulsanti: ' + [...document.querySelectorAll('#r2W button')].map(b => b.dataset.t).join(','));
  cq.on = false; cancelAnimationFrame(cq.raf);
  const me = G.mine; N.myInput = () => {}; N.U.dumAI = false; const loc = G.M.local; G.M.local = () => {};
  const tick = n => { for (let i = 0; i < n; i++) cqModeTick(0.05); };
  const x0 = me.x, y0 = me.y; for (let i = 0; i < 20; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); }
  out.push('1 s di gas: ' + Math.hypot(me.x - x0, me.y - y0).toFixed(2) + ' caselle, velocita ' + Math.hypot(me.vx, me.vy).toFixed(2));
  me.inp.thr = 0; tick(10); out.push('mezzo secondo senza gas: velocita ' + Math.hypot(me.vx, me.vy).toFixed(2));
  { const a0 = me.a; for (let i = 0; i < 10; i++) { me.inp.thr = 0.3; me.inp.steer = 1; cqModeTick(0.05); } out.push('sterzo 0,5 s: ' + (((me.a - a0 + 9.42) % 6.283 - 3.14) * 57).toFixed(0) + ' gradi'); }
  { me.inp.thr = 0; me.inp.steer = 0; tick(10); const a0 = me.a; me.turn = { to: (me.a + Math.PI) % 6.283, t: G.time }; let n = 0; while (me.turn && n < 60) { tick(1); n++; } out.push('testacoda 180: ' + (n * 0.05).toFixed(2) + ' s, girato di ' + Math.abs(((me.a - a0 + 9.42) % 6.283 - 3.14) * 57).toFixed(0) + ' gradi'); }
  { const b = N.makeBody({ b: [[3, 3, 'cabina', 0], [2, 3, 'telaio', 0], [1, 3, 'ruota', 0], [1, 2, 'ruota', 0], [3, 2, 'telaio', 0]] }, 10, 15, 0, 0); G.rbs.push(b); const a1 = b.a; for (let i = 0; i < 20; i++) { b.inp.thr = 1; b.inp.steer = 0; N.physics(G, 0.05); } out.push('ruote solo a sinistra, 1 s dritto: gira di ' + (((b.a - a1 + 9.42) % 6.283 - 3.14) * 57).toFixed(0) + ' gradi'); G.rbs = G.rbs.filter(o => o !== b); }
  // ---- il cuneo: arrivo veloce contro il manichino ----
  { const D = G.dummy; D.a = Math.PI; D.vx = D.vy = D.w = 0; D.z = 0; me.a = 0; me.x = D.x - 4.6; me.y = D.y; me.vx = me.vy = me.w = 0; me.turn = null; let maxZ = 0; const ev0 = G.evs.length;
    for (let i = 0; i < 50; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); maxZ = Math.max(maxZ, D.z); }
    out.push('cuneo a tutta velocita: il manichino sale fino a ' + maxZ.toFixed(2) + ' (eventi "ci sale sopra" ' + G.evs.slice(ev0).filter(e => e[0] === 'lift').length + ')'); }
  // ---- pala e sega su un robot di prova pulito (cabina, telaio davanti con l'arma sopra, due ruote) ----
  const testArm = (arm, fn) => { const T1 = N.makeBody({ b: [[3, 3, 'cabina', 0], [3, 2, 'telaio', 0], [3, 2, arm, 0], [2, 3, 'ruota', 0], [4, 3, 'ruota', 0]] }, 8, 10, 0, 0); G.rbs.push(T1); N.spawnDummy(G); const D = G.dummy; D.a = Math.PI; D.vx = D.vy = D.w = 0; D.z = 0;
    const aq = T1.bl.find(q => q.t === arm), [px, py] = N.wpos(T1, aq), tg = D.bl.find(q => q.t === 'corazza'), [tx, ty] = N.wpos(D, tg); D.x += px + 0.95 * N.B * 1.25 - tx; D.y += py - ty; me.x = 4.6; me.y = 16; const r = fn(T1, D); G.rbs = G.rbs.filter(o => o !== T1); return r; };
  out.push(testArm('pala', (T1, D) => { let maxZ = 0, flipT = null, rightT = null; T1.inp.pala = true; for (let i = 0; i < 120; i++) { cqModeTick(0.05); maxZ = Math.max(maxZ, D.z); if (D.flip && flipT == null) flipT = i * 0.05; if (flipT != null && !D.flip && rightT == null && D.z === 0 && Math.cos(D.ro) > 0) rightT = i * 0.05; }
    return 'pala: il manichino vola fino a ' + maxZ.toFixed(2) + (flipT != null ? ', atterra A PANCIA IN SU dopo ' + flipT.toFixed(1) + ' s' + (rightT != null ? ', si raddrizza a ' + rightT.toFixed(1) + ' s' : ', NON si raddrizza') : ', atterra dritto'); }));
  let flips = 0; for (let k = 0; k < 6; k++) testArm('pala', (T1, D) => { T1.inp.pala = true; for (let i = 0; i < 40; i++) { cqModeTick(0.05); if (D.flip) { flips++; break; } } }); out.push('su 6 lanci con la pala, a pancia in su: ' + flips);
  out.push(testArm('sega', (T1, D) => { const hp0 = D.bl.reduce((s, q) => s + q.hp, 0), n0 = D.bl.length; for (let i = 0; i < 20; i++) { T1.inp.sega = true; cqModeTick(0.05); } return 'sega sopra il telaio, 1 s: salute del manichino ' + Math.round(hp0) + ' -> ' + Math.round(D.bl.reduce((s, q) => s + q.hp, 0)) + ', pezzi ' + n0 + ' -> ' + D.bl.length; }));
  out.push(testArm('martello', (T1, D) => { const hp0 = D.bl.reduce((s, q) => s + q.hp, 0); T1.inp.martello = true; for (let i = 0; i < 10; i++) cqModeTick(0.05); return 'martello: salute ' + Math.round(hp0) + ' -> ' + Math.round(D.bl.reduce((s, q) => s + q.hp, 0)); }));
  // ---- rompo il telaio sotto la pala: la pala cade ----
  { const pq = me.bl.find(q => q.t === 'pala'), base = me.bl.find(q => q.t === 'telaio' && q.gx === pq.gx && q.gy === pq.gy); const deb0 = G.rbs.filter(b => b.debris).length; N.hurt(G, me, base, 99, 'prova'); out.push('rotto il telaio sotto la pala: pala ancora sul robot ' + me.bl.includes(pq) + ', pezzi a terra +' + (G.rbs.filter(b => b.debris).length - deb0)); }
  { const keep = G.rbs; const run = nos => { G.rbs = [me]; me.vx = me.vy = me.w = 0; me.a = 0; me.z = 0; me.x = 5; me.y = 11; me.nosUsed = 0; me.nosT = 0; const x0 = me.x; me.inp.nos = nos; for (let i = 0; i < 20; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); } return (me.x - x0).toFixed(2) + ' caselle (' + Math.hypot(me.vx, me.vy).toFixed(2) + '/s)'; };
    out.push('1 s di gas ad arena libera: senza NOS ' + run(false) + ', col NOS ' + run(true)); G.rbs = keep; }
  { me.vx = me.vy = me.w = 0; me.a = 0; me.z = 0; me.x = 6; me.y = 11; const x0 = me.x; me.inp.nos = true; for (let i = 0; i < 20; i++) { me.inp.thr = 1; me.inp.steer = 0; cqModeTick(0.05); }
    const d1 = me.x - x0, v1 = Math.hypot(me.vx, me.vy); me.inp.nos = true; const t1 = me.nosT; cqModeTick(0.05); out.push('NOS: 1 s di gas col turbo = ' + d1.toFixed(2) + ' caselle, velocita ' + v1.toFixed(2) + ' | di nuovo: ' + (me.nosT === t1 ? 'non riparte (una volta sola)' : 'RIPARTITO')); }
  { G.rbs = G.rbs.filter(b => !b.debris); N.spawnDummy(G); const D = G.dummy; N.U.dumAI = true; me.x = 7; me.y = 11; me.a = 0; me.vx = me.vy = me.w = 0; me.z = 0; me.inp.thr = 0; me.inp.steer = 0; const d0 = Math.hypot(D.x - me.x, D.y - me.y), hp0 = me.bl.reduce((s, q) => s + q.hp, 0); let dmin = 99; const ev0 = G.evs.length;
    for (let i = 0; i < 200; i++) { me.inp.thr = 0; cqModeTick(0.05); dmin = Math.min(dmin, Math.hypot(D.x - me.x, D.y - me.y)); }
    const E = G.evs.slice(ev0).map(e => e[0]); out.push('manichino che reagisce (10 s): distanza ' + d0.toFixed(1) + ' -> minima ' + dmin.toFixed(1) + ', la mia salute ' + Math.round(hp0) + ' -> ' + Math.round(me.bl.reduce((s, q) => s + q.hp, 0)) + ', botte ' + E.filter(k => k === 'bang').length + ', sollevato ' + E.filter(k => k === 'lift').length + ', pezzi rotti ' + E.filter(k => k === 'brk').length); }
  G.M.local = loc; cq.on = true; { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma: ' + (t / 20).toFixed(1) + ' ms'); }
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); N.physics(G, 0.016); t += performance.now() - t0; } out.push('un giro di fisica: ' + (t / 20).toFixed(2) + ' ms con ' + G.rbs.length + ' corpi'); }
  if (window.__SHOT === 'drive') { N.spawnDummy(G); const D = G.dummy; me.x = cq.x = D.x - 3.4; me.y = cq.y = D.y + 0.6; me.a = -0.2; me.z = 0; me.ro = 0; D.z = 0.9; D.ro = 0.6; G.vw = { z: 0.95, x: 1.2, y: -0.2 }; cqDraw(); }
  return out.join('\n');
})()
