// Angolo giochi rifatto (23-10-2026): BILIARDO con posta (25 monete contro il Conte), comandi nuovi (la stecca gira seguendo il dito, stecca presa
// e spostata di lato, tocco su una palla, rotella, stecca tirata indietro = tiro), palle che rotolano, partita intera e pagamento della posta;
// poi la GRU nuova: mucchio fermo, pinza che penzola, discesa che si ferma sui peluche, PRENDI, 12 tentativi, peluche spostati, niente fuori dal vetro.
// uso: node prove/cdp.mjs . prove/angolo2.js foto.png   (foto = gru, con in un angolo il tavolo del biliardo mentre le palle rotolano)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [], f2 = v => v.toFixed(2);
  try {
  store.settings.myName = 'zzCarA'; store.settings.sound = false; store.settings.coll = {}; store.settings.gruPity = 0; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  cqBank().coins = 100; saveStore();
  if (!window.zzSoloGru) {
  // ---- biliardo ----
  cq.x = CQ_W - 2 - 10.5; cq.y = 9.6; await w(500);
  document.getElementById('tvB_bi').click(); await w(300); document.querySelector('#tvModal [data-k=ai]').click(); await w(300);
  o.push('poste: ' + [...document.querySelectorAll('#tvModal button')].map(b => b.textContent + (b.disabled ? '(no)' : '')).join(' / '));
  document.querySelector('#tvModal [data-k=b25]').click(); await w(700);
  o.push('monete dopo la posta ' + cqBank().coins);
  let T = BI.T; const cv = T.cv, rc = cv.getBoundingClientRect();
  const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: rc.left + x, clientY: rc.top + y, bubbles: true, pointerId: 1, isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
  const S = (x, y) => [T.ox + x * T.k, T.oy + y * T.k];
  const gest = pts => { ev('pointerdown', ...pts[0]); for (const p of pts.slice(1)) ev('pointermove', ...p); ev('pointerup', ...pts[pts.length - 1]); };
  const cue = () => T.S.b.find(b => b[0] === 0);
  o.push('tocca a me ' + (T.S.tu === 0));
  let [, cx, cy] = cue();
  gest([S(cx + 12, cy), S(cx + 12, cy + 4), S(cx + 8.5, cy + 8.5), S(cx, cy + 12)]);
  o.push('giro intorno alla bianca (atteso 1,0): ' + f2(T.aim.dx) + ',' + f2(T.aim.dy));
  gest([S(cx - 10, cy), S(cx - 10, cy - 3), S(cx - 10, cy - 6), S(cx - 10, cy - 10)]);
  o.push('stecca presa e spostata (atteso 0.71,0.71): ' + f2(T.aim.dx) + ',' + f2(T.aim.dy) + ' (la stecca segue il dito)');
  const tb = T.S.b.find(b => b[0] === 5); gest([S(tb[1], tb[2])]);
  const l = Math.hypot(tb[1] - cx, tb[2] - cy); o.push('tocco sulla palla 5: mira ' + f2(T.aim.dx) + ',' + f2(T.aim.dy) + ' atteso ' + f2((tb[1] - cx) / l) + ',' + f2((tb[2] - cy) / l));
  const a0 = Math.atan2(T.aim.dy, T.aim.dx), wy = (T.wh.y0 + T.wh.y1) / 2, wx = (T.wh.x0 + T.wh.x1) / 2;
  gest([[wx, wy], [wx + 20, wy], [wx + 50, wy]]); o.push('rotella +50 px: ' + ((Math.atan2(T.aim.dy, T.aim.dx) - a0) * 180 / Math.PI).toFixed(1) + ' gradi');
  gest([[wx, wy], [wx - 50, wy]]);
  // stecca tirata indietro col dito: 12 unita' su 16 = forza 0,75
  const ax = T.aim.dx, ay = T.aim.dy, sp = d => S(cx - ax * d, cy - ay * d);
  ev('pointerdown', ...sp(8)); ev('pointermove', ...sp(11)); ev('pointermove', ...sp(16)); ev('pointermove', ...sp(20));
  o.push('stecca tirata: forza ' + (T.pull ? f2(T.pull.p) : 'nessuna'));
  ev('pointerup', ...sp(20)); await w(400);
  o.push('tiro partito: ' + (T.S.shot ? 'forza ' + T.S.shot.p + ' verso ' + f2(T.S.shot.dx) + ',' + f2(T.S.shot.dy) : 'no'));
  await w(700); window.zzPool = T.cv.toDataURL('image/png');   // palle in corsa per la foto
  const M = T.ori[1] || T.ori[9]; o.push('palle girate: ' + Object.keys(T.ori).length + ' (matrice ok ' + (M && M.every(Number.isFinite)) + ')');
  window.cqFast = 6;
  let shots = 1;
  for (let g = 0; g < 500 && BI.T && BI.T.S.ph === 'play'; g++) {
    T = BI.T; const St = T.S;
    if (St.tu === 0 && !T.anim && !T.strike) { const sh = BI.aiTurn({ S: Object.assign({}, St, { ai: 0 }) }); BI.act(sh); shots++; }
    await w(200);
  }
  await w(2500); T = BI.T;
  o.push('partita: tiri miei ' + shots + ', vince ' + T.S.win + ' (' + (T.S.why || '').replace(/<[^>]+>/g, '') + '), monete ' + cqBank().coins + ' (attese ' + (T.S.win === 0 ? 125 : 75) + ')');
  o.push('fine: ' + ((document.querySelector('.tvEnd') || {}).innerText || '').replace(/\s+/g, ' '));
  window.cqFast = 1; BI.close(); await w(300);
  }
  // ---- gru ----
  cqBank().coins = 60; saveStore();
  cq.x = CQ_W - 2 + 0.3; cq.y = 2.6; await w(500);
  document.getElementById('grHallB').click(); await w(400);
  const V = GR.V; o.push('gru aperta, peluche ' + V.pl.length + ' rari ' + V.pl.filter(p => p.r).length);
  const snap = () => new Map(V.pl.map(p => [p, [p.x, p.y]])), dmax = (a, b) => Math.max(0, ...[...a].filter(([p]) => b.has(p)).map(([p, q]) => Math.hypot(q[0] - b.get(p)[0], q[1] - b.get(p)[1])));
  const toIdle = async () => { for (let i = 0; i < 60 && GR.V.ph !== 'idle'; i++) { if (GR.V.ph === 'prize') { const b = document.querySelector('.grPrize .grOk'); b && b.click(); } else if (GR.V.ph === 'miss') GR.idle(); await w(100); } };
  let s0 = snap(); await w(2500);
  o.push('premi regalati all\'apertura ' + V.pq.length + ' fase ' + V.ph + ' | mucchio fermo: spostamento massimo in 2,5 s ' + dmax(s0, snap()).toFixed(1) + ' px');
  const res = []; let swing = 0, moved = 0, stopOn = 0, outside = 0;
  for (let k = 0; k < 12; k++) {
    await toIdle();
    document.querySelector('#grRoot .grGo').click(); await w(150);
    const C = V.claw, tgt = V.pl[Math.floor(Math.random() * V.pl.length)], before = snap();
    // muovo il carrello con i tasti fino sopra al peluche (un po' a caso), poi giu' finche' si ferma, poi PRENDI
    const aimX = tgt.x + (Math.random() - 0.5) * tgt.s * 0.8;
    for (let i = 0; i < 80 && Math.abs(C.x - aimX) > 3; i++) { V.kx = Math.sign(aimX - C.x); await w(30); swing = Math.max(swing, Math.abs(C.th)); }
    V.kx = 0; await w(500); swing = Math.max(swing, Math.abs(C.th));
    V.ky = 1; let lastL = -1, still = 0;
    for (let i = 0; i < 120 && still < 8; i++) { await w(50); if (Math.abs(C.L - lastL) < 0.3) still++; else still = 0; lastL = C.L; }
    V.ky = 0; if (C.L < V.Lmax - 2) stopOn++;
    const after = snap(); moved += [...before].filter(([p, q]) => after.has(p) && Math.hypot(q[0] - after.get(p)[0], q[1] - after.get(p)[1]) > 3).length;
    GR.prendi();
    for (let i = 0; i < 120 && !['prize', 'miss'].includes(GR.V.ph); i++) await w(100);
    outside += V.pl.filter(p => !(p.x > V.gx0 - 1 && p.x < V.gx1 + 1 && p.y < V.gy1 + 40) || !Number.isFinite(p.x + p.y)).length;
    res.push(GR.V.ph === 'prize' ? 'P' + (document.querySelector('.grRar') || { textContent: '?' }).textContent[0] : GR.V.ph === 'miss' ? 'x' : '?' + GR.V.ph);
  }
  o.push('esiti ' + res.join(' ') + ' | oscillazione massima ' + (swing * 180 / Math.PI).toFixed(0) + ' gradi | discese fermate sopra un peluche ' + stopOn + '/12 | peluche spostati scendendo ' + moved + ' | fuori dal vetro ' + outside + ' | monete ' + cqBank().coins);
  await toIdle();
  // foto: la pinza mentre scende sul mucchio, e il biliardo in un angolo
  document.querySelector('#grRoot .grGo').click(); await w(150); V.kx = 1; await w(450); V.kx = 0; V.ky = 1; await w(1100); V.ky = 0;
  const im = document.createElement('img'); im.src = window.zzPool; im.style.cssText = 'position:fixed;left:4px;top:40px;width:150px;z-index:99;border:2px solid #fff;border-radius:8px'; document.body.appendChild(im);
  } catch (e) { o.push('ECCEZIONE ' + e.message + ' fase gru ' + (GR.V && GR.V.ph)); }
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
