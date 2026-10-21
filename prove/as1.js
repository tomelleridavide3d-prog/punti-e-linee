// Assedio al castello: 1) mappa a zone (tutto raggiungibile a porte aperte, scale, argano, olio, zone, strada dell'ariete), 2) partite simulate col computer.
// uso: node prove/cdp.mjs . prove/as1.js   (window.__N = quante partite, default 3; window.__NC = personaggi)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=assedio]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Tempo dell') + ' / come si gioca: ' + $('#tkBody').textContent.includes('Come si gioca'));
  cq.mapDirty = true; cqUseMap('castello'); const M = CQ_MAP, W = M.w, H = M.h, A = window.__as;
  const free = (x, y) => { const s = cqSolid[y] && cqSolid[y][x]; return !!(cqFloor[y] && cqFloor[y][x]) && (!s || ['aGate', 'aKdoor', 'aIdoor'].includes(s.prop)); };
  const flood = (sx, sy) => { const seen = new Uint8Array(W * H), q = [[sx, sy]]; seen[sy * W + sx] = 1; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && free(nx, ny) && !seen[ny * W + nx] && Math.abs(cqHc(nx, ny) - cqHc(x, y)) <= 1) { seen[ny * W + nx] = 1; q.push([nx, ny]); } } } return seen; };
  const all = flood(29, 80);
  let n = 0, isl = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (free(x, y)) { n++; if (!all[y * W + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + n + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.slice(0, 40).join(' ') + (isl.length > 40 ? ' …' + isl.length : '') : ' | tutto raggiungibile (a porte aperte)'));
  const bad = [], ok = (x, y, k) => { if (!all[Math.floor(y) * W + Math.floor(x)] || !cqCellFree(Math.floor(x), Math.floor(y))) bad.push(k + ' ' + x + ',' + y); };
  M.spots.forEach((S, i) => { if (!cqCellFree(S.fx, S.fy)) bad.push('piede scala ' + i); ok(S.ax, S.ay, 'partenza scala'); ok(S.tx, S.ty, 'cima scala'); });
  ok(A.RK.x + 0.5, A.RK.y + 1.5, 'rastrelliera'); ok(A.LEV.x - 0.5, A.LEV.y + 0.5, 'argano'); ok(26.5, 51.5, 'olio ovest'); ok(33.5, 51.5, 'olio est');
  ok(A.Z2.x, A.Z2.y + 1.5, 'zona cortile');
  if (A.PORT) { ok(A.PORT.ix, A.PORT.iy, 'porticina dentro'); ok(A.PORT.ox, A.PORT.oy, 'porticina fuori'); for (const D of A.DOCKS) { ok(D.x, D.y + 1.45, 'retro della torre attraccata'); ok(D.x, 50.5, 'uscita della torre sul camminamento'); } for (const [x, y] of A.QUIV) if (!all[(y + 1) * W + x] && !all[(y - 1) * W + x] && !all[y * W + x + 1] && !all[y * W + x - 1]) bad.push('cesta irraggiungibile ' + x + ',' + y); } ok(A.Z3.x, A.Z3.y + 1, 'zona trono');
  for (const [x, y] of [[25.5, 81.5], [29.5, 59.5], [29.5, 44.5], [29.5, 42.5], [13.5, 13.5], [45.5, 13.5]]) ok(x, y, 'ricomparsa');
  for (let y = 52; y <= 80; y++) for (const x of [28, 29, 30, 31]) if (!cqCellFree(x, y)) bad.push('strada ariete ' + x + ',' + y);
  out.push('problemi mappa: ' + (bad.length ? bad.join(' | ') : 'nessuno'));
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms, tessere ' + cq.bg.tiles.length); }
  // ---- partite col computer ----
  const N = +(window.__N || 4);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = Object.assign({}, store.settings.cqModeOpt.assedio || {}, { n: +(window.__NC || 8), time: +(window.__T || 240), lit: window.__LIT || 'r', map: 'castello' }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name + '(' + c.t + (c.role ? ' ' + c.role : '') + ')').join(' ') + ' | luce ' + G.lit + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = []; G.me.look = cqLook(); G.me.role = G.me.t === G.a0 ? 'ram' : 'wal';
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}, tl = []; window.cqToast = () => {};
    let t1 = performance.now(), wallHit = 0, stuck = 0, lastPh = 1, lastH = 1; const last = {};
    for (let i = 0; i < 20 * 900 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (G.ph !== lastPh || G.half !== lastH) { tl.push('t' + G.half + ' ' + Math.round(G.time - G.hs) + 's→fase ' + G.ph); lastPh = G.ph; lastH = G.half; }
      for (const e of G.lg) if (!e.seenT) { e.seenT = 1; ev[e.k] = (ev[e.k] || 0) + 1; }
      if (i % 100 === 0) { for (const c of G.chars) { if (!cqFree(c.x, c.y) && !c.cl) { wallHit++; (window.__WH = window.__WH || []).push(c.name + '@' + c.x.toFixed(1) + ',' + c.y.toFixed(1)); }
        const key = c.x.toFixed(1) + ',' + c.y.toFixed(1); if (last[c.id] === key && c.path && c.path.length && !c.cl && !c.pu && !(c.dn > G.time)) stuck++; last[c.id] = key; } }
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const res = G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, '').replace(/😂.*/, '').slice(0, 200) : 'NON FINITA (tempo ' + Math.round(G.time) + ')';
    out.push('partita ' + (k + 1) + ': ' + res + ' | durata ' + Math.round(G.time) + ' s | ' + tl.join(', ') + ' | eventi ' + JSON.stringify(Object.fromEntries(Object.entries(ev).filter(([k2]) => k2 !== 'ram'))) + ' colpi ariete ' + (ev.ram || 0) + ' | frecce att ' + G.chars.filter(c => c.t === G.a0).reduce((s, c) => s + (c.sh || 0), 0) + ' dif ' + G.chars.filter(c => c.t !== G.a0).reduce((s, c) => s + (c.sh || 0), 0) + ' abbattuti ' + G.chars.reduce((s, c) => s + (c.k || 0), 0) + ' | classi: colpi ' + G.chars.reduce((s, c) => s + (c.mh || 0), 0) + ' parate ' + G.chars.reduce((s, c) => s + (c.blk || 0), 0) + ' frecce rimaste ' + G.chars.filter(c => c.q != null).map(c => c.q).join('') + ' barricate ' + G.chars.reduce((s, c) => s + (c.bN || 0), 0) + ' (rotte ' + G.chars.reduce((s, c) => s + (c.bk || 0), 0) + ') riparato ' + Math.round(G.chars.reduce((s, c) => s + (c.fxT || 0), 0)) + ' s | nei muri ' + wallHit + ', fermi ' + stuck + ' | ' + Math.round((performance.now() - t1) / Math.max(1, G.time * 20) * 100) / 100 + ' ms a giro');
  }
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  if (window.__WH) out.push('nei muri: ' + window.__WH.slice(0, 10).join(' '));
  return out.join('\n');
})()
