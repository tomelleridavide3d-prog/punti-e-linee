// Colpo all'hotel: 1) mappa fissa (tutto raggiungibile con le porte aperte, posti da frugare, giri delle guardie), 2) partite simulate col computer (anche "io").
// uso: node prove/cdp.mjs . prove/colpo1.js [foto.png]   (window.__N = quante partite, default 6; window.__NC = personaggi; window.__DIF = f/n/d)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=colpo]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Guardie'));
  // ---- mappa ----
  cq.mapDirty = true; cqUseMap('grandhotel'); const M = CQ_MAP;
  for (const k in M.gates) for (const [x, y] of M.gates[k].c) cqSolid[y][x] = null;
  for (const [x, y] of M.vdoor.c) cqSolid[y][x] = null; cqSolid[3][55] = null; cqSolid[4][55] = null;
  const s0 = [58, 32], seen = new Uint8Array(M.w * M.h), q = [s0]; seen[s0[1] * M.w + s0[0]] = 1; let reach = 0, free = 0;
  while (q.length) { const [x, y] = q.pop(); reach++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * M.w + nx]) { seen[ny * M.w + nx] = 1; q.push([nx, ny]); } } }
  const isl = []; for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqCellFree(x, y)) { free++; if (!seen[y * M.w + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + free + ', raggiungibili ' + reach + (isl.length ? ' CHIUSE: ' + isl.slice(0, 12).join(' ') : ''));
  const ok = (x, y) => seen[Math.floor(y) * M.w + Math.floor(x)], bad = [];
  const adj = (x, y) => [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => cqCellFree(x + dx, y + dy) && ok(x + dx, y + dy));
  for (const k in M.SP) { const s = M.SP[k]; if (k === 'comod' || k === 'safe') continue; if (!cqSolid[s.y] || !cqSolid[s.y][s.x]) bad.push(k + ' senza oggetto'); else if (!adj(s.x, s.y)) bad.push(k + ' irraggiungibile'); }
  M.camere.forEach((r, i) => { if (!adj(r.ns[0], r.ns[1])) bad.push('comodino ' + i); if (!adj(r.sf[0], r.sf[1])) bad.push('cassaforte ' + i); });
  for (const k in M.routes) for (const [x, y] of M.routes[k].route) if (!cqCellFree(Math.floor(x), Math.floor(y)) || !ok(x, y)) bad.push('ronda ' + k + ' ' + x + ',' + y);
  for (const [x, y] of M.jail) if (!cqCellFree(Math.floor(x), Math.floor(y))) bad.push('cella ' + x + ',' + y);
  for (const k in M.gates) if (!ok(M.gates[k].s[0], M.gates[k].s[1])) bad.push('porta ' + k);
  if (!ok(M.van.x, M.van.y)) bad.push('furgone'); if (!ok(M.cellOut[0], M.cellOut[1])) bad.push('fuori cella');
  if (!adj(M.teca.x, M.teca.y)) bad.push('teca');
  out.push('problemi mappa: ' + (bad.length ? bad.join(' | ') : 'nessuno'));
  // ---- partite ----
  const N = +(window.__N || 6);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.colpo = Object.assign({}, store.settings.cqModeOpt.colpo || {}, { n: +(window.__NC || 4), dif: window.__DIF || 'n', time: 600 }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  const res = { win: 0, jail: 0, time: 0 };
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name).join(' ') + ' | guardie ' + G.gd.length + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = []; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['trovati', /Trovato|ha trovato/], ['vuoti', /Niente qui/], ['codice', /codice sulla|Codice sulla/i], ['aperto1', /si scende all/], ['caveau', /caveau si apre/], ['diamante', /il diamante!|HAI IL DIAMANTE/], ['presi', /preso|Preso!/], ['liberati', /aperto la cella/], ['evasi', /evaso/], ['evasioneKO', /provato a evadere/], ['stordite', /stordita/], ['allerta', /collega stordito/], ['telecamere', /telecamera/], ['inseguimenti', /Ti hanno visto/], ['confische', /ripreso la refurtiva/], ['codiceKO', /Codice sbagliato/], ['luci', /spento le luci/], ['laser', /spento i laser/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now(), wallHit = 0, steps = [];
    for (let i = 0; i < 20 * 620 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (G.o1 && !steps[0]) steps[0] = Math.round(G.time); if (G.o2 && !steps[1]) steps[1] = Math.round(G.time); if (G.o3 && !steps[2]) steps[2] = Math.round(G.time);
      if (i % 100 === 0) { for (const c of G.chars) if (!cqFree(c.x, c.y)) wallHit++; for (const g of G.gd) if (!cqFree(g.x, g.y)) wallHit++; }
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    if (/riuscito/.test(t)) res.win++; else if (/in cella/.test(t)) res.jail++; else res.time++;
    out.push('partita ' + (k + 1) + ' [' + G.plan.a + '/' + G.plan.b + (G.plan.b === 'tas' ? ':' + G.plan.bc : '') + '/' + G.plan.c + ']: ' + Math.round(G.time) + ' s, tappe ' + JSON.stringify(steps) + ', ' + t.slice(0, 70) + ' | ' + JSON.stringify(ev) + ' | dentro ai muri ' + wallHit + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('registro: ' + (window.__LOG || []).slice(0, 40).join(' | '));
  out.push('risultati: ' + JSON.stringify(res));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno') + ' ' + (localStorage.getItem('errLog') || '').slice(0, 600));
  return out;
})()
