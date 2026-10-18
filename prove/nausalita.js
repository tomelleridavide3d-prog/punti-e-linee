// Naufraghi: con le regole del mio movimento (cqFreeZ) si arriva in cima alla collina e agli ingressi delle rovine, seguendo il percorso a celle
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(1500);
  cq.on = false; cancelAnimationFrame(cq.raf);
  const OLD = (x0, y0, x1, y1) => { if (!cqFree(x1, y1)) return false; const a = cqHc(Math.floor(x0), Math.floor(y0)), r = CQ_R; for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (Math.abs(cqHc(Math.floor(x1 + dx), Math.floor(y1 + dy)) - a) > 1) return false; return true; };
  let F = cqFreeZ;
  const go = (x, y, tx, ty) => {
    const P = cqPath(x, y, tx, ty); if (!P.length) return 'nessun percorso';
    for (const c of P) { const cx = c[0], cy = c[1]; let k = 0;
      while (Math.hypot(cx - x, cy - y) > 0.12 && k++ < 200) { const d = Math.hypot(cx - x, cy - y), dx = (cx - x) / d, dy = (cy - y) / d, nx = x + dx * 0.05, ny = y + dy * 0.05; if (F(x, y, nx, y)) x = nx; if (F(x, y, x, ny)) y = ny; }
      if (k >= 200) return 'fermo a ' + x.toFixed(1) + ',' + y.toFixed(1) + ' (z ' + cqHc(Math.floor(x), Math.floor(y)) + ')'; }
    return 'arrivato (z ' + cqHc(Math.floor(x), Math.floor(y)) + ')';
  };
  for (const [nm, f] of [['vecchie', OLD], ['nuove', cqFreeZ]]) { F = f; let ok = 0, tot = 0;
  for (let sd = 1; sd <= 6; sd++) {
    cq.mapDirty = true; cqUseMap('isola', sd * 7919); const M = CQ_MAP, r = [];
    for (const c of M.camps) { const s = cqSpot(c.cx, c.cy), t = cqSpot(M.top.trader[0], M.top.trader[1]); r.push('cima: ' + go(s.x, s.y, t.x, t.y)); for (const m of M.mouths) r.push('ingresso: ' + go(s.x, s.y, m.tx + 0.5, m.ty + 0.5)); }
    ok += r.filter(t => t.includes('arrivato')).length; tot += r.length;
  }
  out.push('regole ' + nm + ': arrivato ' + ok + ' su ' + tot); }
  return out;
})()
