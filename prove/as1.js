// Assedio al castello: 1) mappa fissa (fuori e dentro raggiungibili, scale, posti delle scale), 2) partite simulate col computer (anche "io").
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
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Durata di un tempo') + ' / come si gioca: ' + $('#tkBody').textContent.includes('Come si gioca'));
  cq.mapDirty = true; cqUseMap('castello'); const M = CQ_MAP, W = M.w, H = M.h, A = window.__as;
  const flood = (sx, sy) => { const seen = new Uint8Array(W * H), q = [[sx, sy]]; seen[sy * W + sx] = 1; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * W + nx] && Math.abs(cqHc(nx, ny) - cqHc(x, y)) <= 1) { seen[ny * W + nx] = 1; q.push([nx, ny]); } } } return seen; };
  const out0 = flood(53, 53), in0 = flood(23, 23);
  let fo = 0, fi = 0, isl = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cqCellFree(x, y)) { const o = out0[y * W + x], i = in0[y * W + x]; if (o) fo++; if (i) fi++; if (o && i) isl.push('fuori e dentro insieme ' + x + ',' + y); if (!o && !i) isl.push(x + ',' + y); }
  out.push('caselle fuori ' + fo + ', dentro ' + fi + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.slice(0, 30).join(' ') + (isl.length > 30 ? ' …' + isl.length : '') : ' | tutto raggiungibile'));
  const bad = [];
  M.spots.forEach((S, i) => { const ok = cqCellFree(S.fx, S.fy) && cqCellFree(Math.floor(S.ax), Math.floor(S.ay)); if (!ok) return; if (!out0[Math.floor(S.ay) * W + Math.floor(S.ax)]) bad.push('piede scala ' + i); if (!in0[Math.floor(S.ty) * W + Math.floor(S.tx)]) bad.push('cima scala ' + i); });
  out.push('posti per le scale: ' + M.spots.filter(S => cqCellFree(S.fx, S.fy) && cqCellFree(Math.floor(S.ax), Math.floor(S.ay))).length + '/' + M.spots.length);
  if (!in0[18 * W + 16]) bad.push('bandiera non raggiungibile'); if (!out0[50 * W + 51]) bad.push('rastrelliera'); if (!out0[53 * W + 53]) bad.push('accampamento');
  out.push('problemi mappa: ' + (bad.length ? bad.join(' | ') : 'nessuno'));
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms, tessere ' + cq.bg.tiles.length); }
  // ---- partite col computer ----
  const N = +(window.__N || 4);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = Object.assign({}, store.settings.cqModeOpt.assedio || {}, { n: +(window.__NC || 8), time: +(window.__T || 240), lit: window.__LIT || 'r' }); saveStore();
  $('#cqTask').hidden = true; cqLobby(); await w(500);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name + '(' + c.t + (c.role ? ' ' + c.role : '') + ')').join(' ') + ' | luce ' + G.lit + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.think = 0; G.me.path = []; G.me.look = cqLook(); G.me.role = G.me.t === G.a0 ? 'run' : 'wal';
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; window.cqToast = h => { h = String(h); for (const [k2, re] of [['scale', /Scala appoggiata|scala sulle mura/], ['rovesciate', /rovesciat/], ['bandiera presa', /preso la bandiera|Hai la bandiera|rubato la bandiera/], ['conquista', /conquistato/], ['mura', /sulle mura!/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let t1 = performance.now(), wallHit = 0, maxAr = 0, half2 = 0, stuck = 0;
    const last = {};
    for (let i = 0; i < 20 * 700 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (G.me.bot && G.me.path && G.me.path.length) { }
      maxAr = Math.max(maxAr, G.ar.length); if (G.half === 2) half2++;
      if (i % 100 === 0) { for (const c of G.chars) { if (!cqFree(c.x, c.y) && !c.cl) { wallHit++; (window.__WH = window.__WH || []).push(c.name + '@' + c.x.toFixed(1) + ',' + c.y.toFixed(1)); }
        const key = c.x.toFixed(1) + ',' + c.y.toFixed(1); if (last[c.id] === key && c.path && c.path.length && !c.cl && !c.pu && !(c.dn > G.time)) stuck++; last[c.id] = key; } }
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    const res = G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, '').slice(0, 220) : 'NON FINITA (tempo ' + Math.round(G.time) + ', tempo n. ' + G.half + ')';
    out.push('partita ' + (k + 1) + ': ' + res + ' | durata ' + Math.round(G.time) + ' s | eventi ' + JSON.stringify(ev) + ' | abbattuti ' + G.chars.reduce((s, c) => s + (c.k || 0), 0) + ', frecce ' + G.chars.reduce((s, c) => s + (c.sh || 0), 0) + ', salite ' + G.chars.reduce((s, c) => s + (c.up || 0), 0) + ' | nei muri ' + wallHit + ', fermi ' + stuck + ' | frecce max ' + maxAr + ' | bandiera piu vicina ' + JSON.stringify(G.fBest.map(v => Math.round(v))) + ' salti ' + G.chars.reduce((s, c) => s + (c.jN || 0), 0) + ' | ' + Math.round((performance.now() - t1) / Math.max(1, G.time * 20) * 100) / 100 + ' ms a giro');
  }
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  if (window.__WH) out.push('nei muri: ' + window.__WH.slice(0, 10).join(' '));
  return out.join('\n');
})()
