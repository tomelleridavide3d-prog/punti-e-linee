// Naufraghi: 1) isole col seme (tutto raggiungibile?), 2) partite simulate con il computer (anche "io" sono guidato dal computer).
// uso: node prove/cdp.mjs . prove/nau1.js [foto.png]   (window.__N = quante partite, default 4)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Durata'));
  // ---- isole ----
  const bad = [];
  for (let sd = 1; sd <= 12; sd++) {
    const t0 = performance.now(); cq.mapDirty = true; cqUseMap('isola', sd * 7919); const ms = performance.now() - t0, M = CQ_MAP;
    const c0 = cqSpot(M.camps[0].cx, M.camps[0].cy), ok = (x, y) => cqPath(c0.x, c0.y, x, y).length > 0;
    const miss = [];
    if (!M.ok) miss.push('ok=false');
    { const q = cqSpot(M.camps[1].cx, M.camps[1].cy); if (!ok(q.x, q.y)) miss.push('campo1'); }
    M.mouths.forEach((m, i) => { if (!ok(m.tx + 0.5, m.ty + 0.5)) miss.push('ingresso' + i); });
    M.items.forEach(([k, x, y]) => { if (k !== 'comp' && k !== 'log' && !ok(x, y)) miss.push(k + '@' + x + ',' + y); });
    M.camps.forEach((c, i) => { if (!ok(c.rx + 0.5 + Math.sign(Math.cos(c.a + Math.PI)), c.ry + 0.5) && !cqSpot(c.rx, c.ry)) miss.push('zattera' + i); });
    for (const H of M.RZ.half) { if (!cqPath(H.arr.x, H.arr.y, H.p1.x, H.p1.y).length) miss.push('pedana1-' + H.h); if (cqPath(H.arr.x, H.arr.y, H.lev.x + 1, H.lev.y + 1).length) miss.push('leva raggiungibile a porta chiusa ' + H.h); }
    if (sd <= 3) out.push('isola ' + sd + ': ' + Math.round(ms) + ' ms, pezzi ' + M.items.map(i => i[0]).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {}) && JSON.stringify(M.items.map(i => i[0]).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {})) + ', riferimenti ' + M.lms.map(l => l.k).join(' ') + ', palme ' + M.trees.length);
    if (miss.length) bad.push(sd + ': ' + miss.join(' '));
  }
  out.push('isole con problemi: ' + (bad.length ? bad.join(' | ') : 'nessuna'));
  // ---- partite ----
  const N = +(window.__N || 4);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1500);
    const G = cq.g;
    if (k === 0) out.push('partita: squadre ' + G.chars.map(c => c.name + ':' + c.t + (c.role || '')).join(' ') + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.role = 'g'; G.me.look = cqLook(); G.me.think = 0; G.me.path = []; G.me.gneed = 40;
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['colpi', /🔪|💥/], ['tagli', /Tronco tagliato|tagliato/], ['montati', /montato/], ['rubati', /rubato/], ['caduti', /cadere/], ['leva', /leva/], ['pedane', /pedane/], ['ingranaggi', /ingranaggi/], ['forziere', /forziere/], ['compra', /comprato/], ['bussola', /preso .*bussola/], ['vela', /preso .*vela/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now();
    for (let i = 0; i < 20 * 460 && G.phase === 'play'; i++) { cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05); if (i % 400 === 0) { cqHudFast(); cqDraw(); } }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    const comp = G.it.find(i => i.k === 'comp');
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, ' + t.slice(0, 90) + ' | ' + JSON.stringify(ev) + ' | porte ' + G.R.p.join('') + ', bussola st ' + comp.st + ' x ' + Math.round(comp.x) + ', fantasmi ' + G.chars.filter(c => !c.alive).length + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
