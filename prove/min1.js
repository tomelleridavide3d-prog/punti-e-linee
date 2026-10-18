// Il Minotauro: 1) labirinti col seme (tutto raggiungibile, anche dopo tanti spostamenti dei muri), 2) partite simulate con il computer (anche "io").
// uso: node prove/cdp.mjs . prove/min1.js [foto.png]   (window.__N = quante partite, default 4; window.__TM = squadre)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=minotauro]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Minotauro'));
  // ---- labirinti ----
  const bad = [];
  for (let sd = 1; sd <= 12; sd++) {
    const t0 = performance.now(); cq.mapDirty = true; cqUseMap('labirinto', sd * 7919); const ms = performance.now() - t0, M = CQ_MAP;
    const miss = [], c0 = M.startP[0], s0 = cqSpot(Math.floor(c0.x), Math.floor(c0.y));
    const check = tag => {
      const ok = (x, y) => cqPath(s0.x, s0.y, x, y).length > 0;
      M.startP.forEach((p, i) => { const q = cqSpot(Math.floor(p.x), Math.floor(p.y)); if (i && !ok(q.x, q.y)) miss.push(tag + 'partenza' + i); });
      if (!ok(M.exit.x, M.exit.y)) miss.push(tag + 'uscita');
      M.frag.forEach((f, i) => { if (f.vi != null) return; const q = cqSpot(f.cx, f.cy); if (!ok(q.x, q.y)) miss.push(tag + 'cristallo' + i); });
      { const a = cqSpot(Math.floor(M.arena.x), Math.floor(M.arena.y)); if (!ok(a.x, a.y)) miss.push(tag + 'arena'); }
      // tutte le caselle libere raggiungibili
      const vg = []; for (const v of (M.vaults || [])) for (const [x, y] of v.cells) { vg.push([x, y, cqSolid[y][x]]); cqSolid[y][x] = null; } for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqSolid[y][x] && cqSolid[y][x].prop === 'sdoor') { vg.push([x, y, cqSolid[y][x]]); cqSolid[y][x] = null; }
      let free = 0, reach = 0; const seen = new Uint8Array(M.w * M.h), q = [[Math.floor(s0.x), Math.floor(s0.y)]]; seen[q[0][1] * M.w + q[0][0]] = 1;
      while (q.length) { const [x, y] = q.pop(); reach++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * M.w + nx]) { seen[ny * M.w + nx] = 1; q.push([nx, ny]); } } }
      for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqCellFree(x, y)) free++;
      if (free !== reach) miss.push(tag + 'chiuse ' + (free - reach));
      for (const [x, y, o] of vg) cqSolid[y][x] = o;
    };
    check('');
    if (sd <= 3) out.push('labirinto ' + sd + ': ' + Math.round(ms) + ' ms, sale ' + M.R.length + ', colonnine ' + M.frag.length + ', torce ' + M.torches.length + ', nascondigli ' + M.hides.length + ', porte ' + M.gates.length + ', leve antiche ' + M.levers.length + ', catene ' + M.chains.length + ', cripte ' + M.vaults.length + ', trappole ' + M.traps.length + ', uscita ' + M.exit.x + ',' + M.exit.y + ', partenze ' + JSON.stringify(M.starts) + ', muri chiusi ' + M.st0.reduce((a, v) => a + v, 0) + '/' + M.S.length);
    if (miss.length) bad.push(sd + ': ' + miss.join(' '));
  }
  out.push('labirinti con problemi: ' + (bad.length ? bad.join(' | ') : 'nessuno'));
  // ---- partite ----
  const N = +(window.__N || 8), TM = +(window.__TM || 2);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.minotauro = Object.assign({}, store.settings.cqModeOpt.minotauro || {}, { tm: TM, n: TM === 3 ? 10 : 8, mino: window.__MINO || 'c', wall: 60, time: 420 }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  const res = { mino: 0, team: 0 };
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1500);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name + ':' + c.t).join(' ') + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = [];
    G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['presi', /ha preso|ti ha preso|Hai preso/], ['cristalli', /cristall/], ['complete', /completa/], ['muggiti', /MUUUH|muggito/], ['spostati', /si sono spostati/], ['catene', /incatenat/], ['liberati', /liberato/], ['trappole', /trappola!/], ['porte', /porta di pietra/], ['leve', /leva/], ['aperte', /porta è aperta/], ['lontani', /muggito lontano/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now(), stuck = 0, wallHit = 0;
    for (let i = 0; i < 20 * 460 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (i % 100 === 0) for (const c of G.chars) if (c.alive && !c.out && !cqFree(c.x, c.y)) wallHit++;
      if (G.wv !== G.lastWv) {   // dopo ogni spostamento: tutte le caselle libere ancora raggiungibili?
        G.lastWv = G.wv; for (let n = 0; n < 40; n++) G.M.local(G, 0.001);
        const M = CQ_MAP, s = cqSpot(Math.floor(M.arena.x), Math.floor(M.arena.y)); const vg = []; for (const v of (M.vaults || [])) for (const [x, y] of v.cells) { vg.push([x, y, cqSolid[y][x]]); cqSolid[y][x] = null; } for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqSolid[y][x] && cqSolid[y][x].prop === 'sdoor') { vg.push([x, y, cqSolid[y][x]]); cqSolid[y][x] = null; }
      let free = 0, reach = 0; const seen = new Uint8Array(M.w * M.h), q = [[Math.floor(s.x), Math.floor(s.y)]]; seen[q[0][1] * M.w + q[0][0]] = 1;
        while (q.length) { const [x, y] = q.pop(); reach++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * M.w + nx]) { seen[ny * M.w + nx] = 1; q.push([nx, ny]); } } }
        for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (cqCellFree(x, y)) free++;
        if (free !== reach) stuck++;
        for (const [x, y, o] of vg) cqSolid[y][x] = o;
      }
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    if (/Vince il Minotauro/.test(t)) res.mino++; else res.team++;
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, ' + t.slice(0, 90) + ' | ' + JSON.stringify(ev) + ' | cristalli ' + Array.from({ length: G.nt }, (_, t) => G.cs.filter(v => v === t).length).join('-') + ', fantasmi ' + G.chars.filter(c => !c.alive).length + ', dentro ai muri ' + wallHit + ', spostamenti ' + G.wv + ' (chiusi ' + stuck + '), segni ' + G.mk.length + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('risultati: ' + JSON.stringify(res));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
