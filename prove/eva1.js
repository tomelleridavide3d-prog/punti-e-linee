// Evasione: 1) mappa fissa (tutto raggiungibile, celle, posti dell'appello, giri delle guardie, posti dei detenuti), 2) partite simulate col computer (anche "io").
// uso: node prove/cdp.mjs . prove/eva1.js [foto.png]   (window.__N = quante partite, default 2; window.__NC = personaggi)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Guardie') + ' / come si gioca: ' + $('#tkBody').textContent.includes('Come si gioca'));
  // ---- mappa (due livelli: si passa dalle scale) ----
  cq.mapDirty = true; cqUseMap('carcere'); const M = CQ_MAP, W = M.w;
  for (const c of M.cells) for (const [x, y] of c.bars) cqSolid[y][x] = null; cqSolid[31][25] = cqSolid[31][26] = null;
  const portal = (x, y) => M.PORT[y * W + x];
  const s0 = [Math.floor(M.cells[2].sp[0][0]), Math.floor(M.cells[2].sp[0][1])], seen = new Uint8Array(M.w * M.h), q = [s0]; seen[s0[1] * W + s0[0]] = 1; let reach = 0, free = 0;
  while (q.length) { const [x, y] = q.pop(); reach++;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]);
    const P = portal(x, y); if (P) { const [ax, ay] = M.portals[P - 1].to(x + 0.5, y + 0.5); nb.push([Math.floor(ax), Math.floor(ay)]); }
    for (const [nx, ny] of nb) if (cqCellFree(nx, ny) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; q.push([nx, ny]); } }
  const isl = []; for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqCellFree(x, y)) { free++; if (!seen[y * W + x]) isl.push(x + ',' + y); }
  // le zone chiuse apposta: fuori dal muro, fascia di ronda, celle del primo piano, isolamento (si entra solo da presi)
  const isl2 = isl.filter(k => { const [x, y] = k.split(',').map(Number), r = M.ROOM[y * W + x], R = r >= 0 ? M.rooms[r] : null; return !(R && ('XR'.includes(R.ala) || /^Cella [CD]|isolamento/.test(R.n))); });
  out.push('caselle libere ' + free + ', raggiungibili dalla cella ' + reach + ', chiuse apposta ' + (isl.length - isl2.length) + (isl2.length ? ' CHIUSE PER SBAGLIO: ' + isl2.slice(0, 20).join(' ') : ''));
  const ok = (x, y) => seen[Math.floor(y) * W + Math.floor(x)], bad = [];
  const fr = (x, y) => cqCellFree(Math.floor(x), Math.floor(y));
  M.cells.forEach((c, i) => { for (const [x, y] of c.sp) if (!fr(x, y) || (M.pcells.includes(i) && !ok(x, y))) bad.push('posto in cella ' + c.n + ' ' + x + ',' + y); });
  M.spots.forEach(([x, y], i) => { if (!fr(x, y) || !ok(x, y)) bad.push('posto appello ' + (i + 1)); });
  for (const [x, y] of M.acts) if (!fr(x, y) || !ok(x, y)) bad.push('attivita ' + x + ',' + y);
  for (const k in M.routes) for (const [x, y] of M.routes[k].route) if (!fr(x, y)) bad.push('ronda ' + k + ' ' + x + ',' + y);
  for (const s of M.iso) if (!fr(s.x, s.y)) bad.push('isolamento ' + s.x + ',' + s.y);
  if (!fr(M.isoOut[0], M.isoOut[1]) || !ok(M.isoOut[0], M.isoOut[1])) bad.push('uscita isolamento');
  M.portals.forEach((P, i) => { const [ax, ay] = P.to(P.cells[0][0] + 0.5, P.cells[0][1] + 0.5); if (!fr(ax, ay) || portal(Math.floor(ax), Math.floor(ay)) || window.__ev.floorOf(ax) !== P.tf) bad.push('arrivo della scala ' + i); });
  // percorsi (come li fanno guardie e computer): dalla cella all'appello, alla mensa, al primo piano, agli uffici
  const R = window.__ev.route, A = M.cells[2].sp[0], tg = [M.spots[7], [62.5, 15.5], [108 + 30.5, 15.0], [108 + 72.5, 54.5], [80.5, 25.5], [56.5, 40.5]];
  for (const [x, y] of tg) if (!R(A[0], A[1], x, y).length) bad.push('percorso verso ' + x + ',' + y);
  for (const k in M.routes) { const r = M.routes[k].route; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1 && !R(a[0], a[1], b[0], b[1]).length) bad.push('giro ' + k + ' ' + i); } }
  out.push('problemi mappa: ' + (bad.length ? bad.join(' | ') : 'nessuno'));
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms, tessere ' + cq.bg.tiles.length); }
  // ---- partite ----
  const N = +(window.__N || 2);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.evasione = Object.assign({}, store.settings.cqModeOpt.evasione || {}, { n: +(window.__NC || 6), dif: window.__DIF || 'n' }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.dname + '(' + M.cells[c.cell].n + ')').join(' ') + ' | guardie ' + G.gd.length + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = []; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['tuttiPresenti', /tutti presenti/], ['mancano', /manca il|Non eri al tuo posto/], ['notte', /non è rientrato|non sei in cella/], ['inseguimenti', /Ti hanno visto/], ['isolamento', /isolamento!|Preso!/], ['riflettore', /riflettore/i], ['fuori', /Fuori dall/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now(), wallHit = 0, ap = [], late = 0, cellN = 0, ffT = 0;
    for (let i = 0; i < 20 * 600 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (G.ff) ffT += 0.05;
      if (i % 100 === 0) { for (const c of G.chars) if (!cqFree(c.x, c.y)) { wallHit++; (window.__WH = window.__WH || []).push(c.name + '@' + c.x.toFixed(1) + ',' + c.y.toFixed(1)); } for (const g of G.gd) if (!cqFree(g.x, g.y)) { wallHit++; (window.__WH = window.__WH || []).push('guardia' + g.id + ' ' + g.st + '@' + g.x.toFixed(1) + ',' + g.y.toFixed(1)); } }
      const t = window.__ev.cyc(G); if (Math.abs(t - 27) < 0.03 || Math.abs(t - 145) < 0.03) ap.push(Math.round(G.time) + 's:' + G.chars.filter(c => { const s = M.spots[c.no - 1]; return Math.hypot(c.x - s[0], c.y - s[1]) < 1.3; }).length + '/' + G.chars.length);
      if (Math.abs(t - 164) < 0.03) cellN = G.chars.filter(c => M.ROOM[Math.floor(c.y) * W + Math.floor(c.x)] === M.cells[c.cell].ri).length;
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s (dormito ' + Math.round(ffT) + ' s veri), appelli ' + ap.join(' ') + ', in cella prima della chiusura ' + cellN + '/' + G.chars.length + ', fine: ' + t.slice(0, 60) + ' | ' + JSON.stringify(ev) + ' | dentro ai muri ' + wallHit + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  if (window.__WH) out.push('dentro ai muri: ' + window.__WH.slice(0, 20).join(' | '));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno') + ' ' + (localStorage.getItem('errLog') || '').slice(0, 600));
  return out;
})()
