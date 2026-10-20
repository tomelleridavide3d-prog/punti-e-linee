// Assedio: parabola automatica delle frecce. Dal camminamento (e dalle torri) si tira verso il borgo a distanze e angoli diversi:
// quante frecce si piantano entro 2 caselle da chi tira (= incastrate nel bordo del muro) con la parabola vecchia e con quella automatica.
// uso: node prove/cdp.mjs . prove/as5.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500);
  cq.mapDirty = true; cqUseMap('castello');
  const A = window.__as, HB = 0.8, zAt = (x, y) => cqHc(Math.floor(x), Math.floor(y)) * HB;
  // come arTick: primo punto dove la freccia scende sotto un ostacolo (dopo u 0,06)
  const fly = (x0, y0, z0, x1, y1, z1, pk) => { const d0 = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.ceil(d0 / 0.2)); for (let i = 1; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, z = z0 + (z1 - z0) * u + 4 * pk * u * (1 - u); if (u > 0.06 && z < A.topAt(Math.floor(x), Math.floor(y))) return Math.hypot(x - x0, y - y0); } return null; };
  const P0 = [];
  for (let y = 49; y <= 51; y++) for (let x = 6; x <= 53; x++) if (cqCellFree(x, y) && cqHc(x, y) >= 4 && !(x >= 27 && x <= 32)) P0.push([x + 0.5, y + 0.5]);
  let n = 0, oldStuck = 0, newStuck = 0, oldFar = 0, newFar = 0, maxUp = 0;
  for (const [px, py] of P0) for (let d = 2; d <= 12; d += 1) for (let a = 0.35; a <= Math.PI - 0.35; a += 0.25) {
    const x1 = px + Math.cos(a) * d * 0.7 - Math.sin(a) * d * 0.3, y1 = py + Math.sin(a) * d; if (y1 < 52.5 || !cqFloor[Math.floor(y1)] || !cqFloor[Math.floor(y1)][Math.floor(x1)]) continue;
    const z0 = zAt(px, py) + 1.25, z1 = zAt(x1, y1) + 0.45, base = 0.45 + 0.13 * Math.hypot(x1 - px, y1 - py), pk = A.arcPk(px, py, z0, x1, y1, z1);
    n++; maxUp = Math.max(maxUp, pk - base);
    const h0 = fly(px, py, z0, x1, y1, z1, base), h1 = fly(px, py, z0, x1, y1, z1, pk);
    if (h0 != null && h0 < 2) oldStuck++; if (h1 != null && h1 < 2) newStuck++;
    if (h0 == null) oldFar++; if (h1 == null) newFar++;
  }
  out.push('tiri dalle mura verso il borgo: ' + n + ' (da ' + P0.length + ' posti)');
  out.push('incastrate nel bordo del muro (entro 2 caselle): prima ' + oldStuck + ' (' + Math.round(100 * oldStuck / n) + '%), ora ' + newStuck + ' (' + Math.round(100 * newStuck / n) + '%)');
  out.push('arrivate al punto mirato: prima ' + oldFar + ', ora ' + newFar + ' | parabola alzata al massimo di ' + maxUp.toFixed(2));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return out.join('\n');
})()
