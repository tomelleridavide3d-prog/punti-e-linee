// Mister X: 1) citta' col seme (tutto raggiungibile, quanti oggetti, tempo per farla), 2) partite simulate con il computer (anche "io").
// uso: node prove/cdp.mjs . prove/mx1.js [foto.png]   (window.__N = quante partite, default 6; window.__MX = chi e' Mister X: c/r/p; window.__NC = personaggi)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=misterx]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Mister X'));
  // ---- citta' ----
  const bad = [];
  for (let sd = 1; sd <= 8; sd++) {
    const t0 = performance.now(); cq.mapDirty = true; cqUseMap('citta', sd * 7919); const ms = performance.now() - t0, M = CQ_MAP;
    const s0 = cqSpot(Math.floor(M.pstart.x), Math.floor(M.pstart.y)), miss = [];
    let free = 0, reach = 0; const seen = new Uint8Array(M.w * M.h), q = [[Math.floor(s0.x), Math.floor(s0.y)]]; seen[q[0][1] * M.w + q[0][0]] = 1;
    while (q.length) { const [x, y] = q.pop(); reach++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * M.w + nx]) { seen[ny * M.w + nx] = 1; q.push([nx, ny]); } } }
    const isl = []; for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqCellFree(x, y)) { free++; if (!seen[y * M.w + x]) isl.push(x + ',' + y); }
    if (free !== reach) miss.push('chiuse ' + (free - reach) + ' (' + isl.slice(0, 6).join(' ') + ')');
    const ok = (x, y) => seen[Math.floor(y) * M.w + Math.floor(x)];
    M.loot.forEach((l, i) => { if (!ok(l.sx, l.sy)) miss.push('colpo' + i); });
    M.metro.forEach((m, i) => { if (!ok(m.sx, m.sy)) miss.push('metro' + i); });
    M.EP.forEach((e, i) => { if (!ok(e.x, e.y)) miss.push('fuga' + i); });
    M.tombs.forEach((t, i) => { if (!ok(t.x + 0.5, t.y + 0.5)) miss.push('tombino' + i); });
    let pbad = 0; for (const R of M.PR) for (const [x, y] of R.p) if (!cqCellFree(Math.floor(x), Math.floor(y))) pbad++;
    if (pbad) miss.push('passanti nei muri ' + pbad);
    if (M.loot.length < 6 || M.metro.length < 5 || M.cams.length < 8 || M.tombs.length < 12) miss.push('pochi oggetti');
    if (sd <= 3) out.push('città ' + sd + ': ' + Math.round(ms) + ' ms, strade ' + M.VX.length + 'x' + M.HY.length + ', palazzi ' + M.B.length + ', colpi ' + M.loot.length + ', metro ' + M.metro.length + ', telecamere ' + M.cams.length + ', tombini ' + M.tombs.length + ', lampioni ' + M.lamps.length + ', passanti ' + M.PR.length + ', ponti ' + M.bridges.length + ', parco ' + !!M.parkR + ', piazze ' + M.plazas.length + ', libere ' + free + ', oggetti ' + M.props.length);
    if (miss.length) bad.push(sd + ': ' + miss.join(' '));
  }
  out.push('città con problemi: ' + (bad.length ? bad.join(' | ') : 'nessuna'));
  // ---- partite ----
  const N = +(window.__N || 6);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.misterx = Object.assign({}, store.settings.cqModeOpt.misterx || {}, { mx: window.__MX || 'c', n: +(window.__NC || 7), flash: 30, time: 420 }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  const res = { x: 0, d: 0 };
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name + (c.mx ? ':X' : '')).join(' ') + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = []; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['lampeggi', /avvistato|Ti hanno visto/], ['colpi', /Allarme|Colpo riuscito|svaligiato/], ['duelli', /DIVINCOLATI|STRINGI|ha preso Mister X|sta lottando/], ['liberato', /divincolato|liberato/], ['arresti', /ammanettato!/], ['passanti', /passante innocente/], ['telecamere', /Telecamera:|telecamera ti ha visto/], ['tombini', /tombino|fogne/i], ['metro', /metro|Biglietto/i], ['travestimenti', /travestito da passante/], ['fuga', /3 colpi/], ['scappato', /scappato/], ['rete', /il doppio/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now(), wallHit = 0;
    for (let i = 0; i < 20 * 620 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (G.du && G.du.id !== G.__du) { G.__du = G.du.id; const X = G.chars.find(c => c.id === G.du.x), K = G.kn; (window.__dl = window.__dl || []).push(Math.round(G.time) + 's ' + (X.op ? X.op.k : X.dg ? 'trav' : X.sp > G.time ? 'scatto' : 'cammina') + ' kn' + (K ? Math.round(G.time - K.t) + 's/' + Math.round(Math.hypot(K.x - X.x, K.y - X.y)) : '-') + (window.__lit = (CQ_MAP.lit[Math.floor(X.y) * 100 + Math.floor(X.x)] ? ' luce' : ' buio')) + ' vistoD' + (X.sawD != null ? Math.round(G.time - X.sawD) : '-') + ' metro' + (X.mcd ? 1 : 0)); }
      if (!G.du && G.duLast && G.duLast.t !== G.__dl2) { G.__dl2 = G.duLast.t; window.__dl.push('→ ' + G.duLast.sx + ' a ' + G.duLast.sd + ' (' + G.duLast.ds.length + ' det)'); }
      if (i % 100 === 0) for (const c of G.chars) if (c.alive && !c.out && !cqFree(c.x, c.y)) wallHit++;
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    if (/Vinc(e|ono i) Mister X/.test(t)) res.x++; else res.d++;
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, ' + t.slice(0, 110) + ' | ' + JSON.stringify(ev) + ' | colpi ' + G.nrob + ', dentro ai muri ' + wallHit + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('risultati: ' + JSON.stringify(res));
  out.push('duelli: ' + (window.__dl || []).join(' | '));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
