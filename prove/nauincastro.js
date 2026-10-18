// Naufraghi: cerca i punti dove il mio personaggio resta incastrato (nessuna direzione lo fa muovere), camminando a caso con le regole vere (cqFreeZ, un asse alla volta)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(1500);
  cq.on = false; cancelAnimationFrame(cq.raf);
  const D = []; for (let i = 0; i < 16; i++) D.push([Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  const step = (x, y, dx, dy, k) => { let nx = x + dx * k, ny = y + dy * k; if (cqFreeZ(x, y, nx, y)) x = nx; if (cqFreeZ(x, y, x, ny)) y = ny; return [x, y]; };
  const stuck = (x, y) => D.every(([dx, dy]) => { let p = [x, y]; for (let j = 0; j < 20; j++) p = step(p[0], p[1], dx, dy, 0.06); return Math.hypot(p[0] - x, p[1] - y) < 0.05; });
  const found = new Map(); let n = 0;
  for (let sd = 1; sd <= +(window.__S || 6); sd++) {
    cq.mapDirty = true; cqUseMap('isola', sd * 7919);
    const free = []; for (let y = 0; y < CQ_H; y++) for (let x = 0; x < CQ_W; x++) if (cqCellFree(x, y)) free.push([x, y]);
    for (let r = 0; r < 300; r++) {
      const s = free[Math.floor(Math.random() * free.length)]; let x = s[0] + 0.5, y = s[1] + 0.5, dir = D[Math.floor(Math.random() * 16)];
      for (let i = 0; i < 1500; i++) {
        if (Math.random() < 0.03) dir = D[Math.floor(Math.random() * 16)];
        [x, y] = step(x, y, dir[0], dir[1], 0.03 + Math.random() * 0.05);
        if (i % 25 === 0 && stuck(x, y)) { n++; const k = sd + ':' + Math.floor(x) + ',' + Math.floor(y); if (!found.has(k)) { const cx = Math.floor(x), cy = Math.floor(y), hz = []; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) hz.push(cqSolid[cy + b] && cqSolid[cy + b][cx + a] ? 'X' + (cqSolid[cy + b][cx + a].prop || 'w').slice(0, 4) : cqHc(cx + a, cy + b)); found.set(k, k + ' @' + x.toFixed(2) + ',' + y.toFixed(2) + ' z ' + cqHc(cx, cy) + ' intorno ' + hz.join(' ')); } break; }
      }
    }
  }
  out.push('incastri: ' + n + ', punti diversi ' + found.size);
  out.push(...[...found.values()].slice(0, 15));
  return out;
})()
