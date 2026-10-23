// Battaglia di palle di neve: giardino (raggiungibile), fortino disegnato (tenuta: pilastri, campate, doppio, assi), partita intera contro Pierino.
// uso: node prove/cdp.mjs . prove/neve1.js [foto.png]   (window.__SHOT = 'build' foto del fortino; 'fight' foto della battaglia)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzNeProva'; store.settings.sound = false; saveStore();
  try { localStorage.setItem('neveHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzNeProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=neve]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + ($('#tkBody').textContent.includes('Come si gioca') ? 'ok' : 'MANCANO'));
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'neve') return out.concat('partita non partita').join('\n');
  const N = window.__neve, M = G.M;
  // ---- giardino raggiungibile ----
  const Wd = CQ_W, Hd = CQ_H, seen = new Uint8Array(Wd * Hd), q = [[3, 9]]; seen[9 * Wd + 3] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < Wd && ny < Hd && cqCellFree(nx, ny) && !seen[ny * Wd + nx]) { seen[ny * Wd + nx] = 1; q.push([nx, ny]); } } }
  let n = 0; const isl = []; for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (cqCellFree(x, y)) { n++; if (!seen[y * Wd + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + n + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.join(' ') : ' | tutto raggiungibile'));
  // ---- la tenuta su forme di prova (senza partita) ----
  { const mk = pts => { const B = []; N.resample(pts).forEach((p, i, a) => { const A = a[Math.max(0, i - 1)], C = a[Math.min(a.length - 1, i + 1)]; B.push({ o: 0, s: 1, i, x: p[0], y: p[1], a: Math.atan2(C[1] - A[1], C[0] - A[0]), k: 1, j: 0, as: 0 }); }); return N.structure(B); };
    const cnt = S => S.camp.length + ' campate (' + S.camp.filter(c => c.p).length + ' pilastri), la piu\' lunga ' + Math.max(...S.camp.map(c => c.b.length)) + ' blocchi';
    out.push('muro dritto 6 caselle: ' + cnt(mk([[5, 5], [5, 11]])));
    out.push('zig-zag: ' + cnt(mk([[5, 5], [6.2, 6.4], [5, 7.8], [6.2, 9.2], [5, 10.6]])));
    out.push('curva a U: ' + cnt(mk(Array.from({ length: 13 }, (_, i) => { const a = -1.25 + 2.5 * i / 12; return [6 + Math.cos(a) * 3, 9 + Math.sin(a) * 4]; }))));
  }
  // ---- costruisco io (lato 0): muro dritto, lo ripasso (doppio), un'asse, un muro ad angolo attaccato ----
  while (G.pre > 0) { cqModeTick(0.05); }
  const st = G.st, me = 0, p = st.p[me], nv0 = p.nv;
  N.buildAct(G, me, 'w', [[8.5, 5.5], [8.5, 9.5]]); const a1 = nv0 - p.nv;
  N.buildAct(G, me, 'w', [[8.5, 5.5], [8.5, 9.5]]); const a2 = nv0 - p.nv - a1;
  N.buildAct(G, me, 'a', [[8.5, 7.5], [7.7, 7.5]]);
  N.buildAct(G, me, 'w', [[8.5, 9.5], [8.5, 12.5], [6.5, 12.5]]);
  const S = G.S, mine = S.bl.filter(b => b.o === 0);
  out.push('mio fortino: ' + mine.length + ' blocchi (muro ' + a1 + ' neve, ripassato ' + a2 + ' neve), doppi ' + mine.filter(b => b.k === 2).length + ', assi ' + mine.filter(b => b.as).length + ', pilastri ' + mine.filter((b, i) => S.pil[S.bl.indexOf(b)]).length + ', campate ' + S.camp.filter(c => c.o === 0).length + ', neve rimasta ' + p.nv + ', assi rimaste ' + p.as);
  N.undo(G, me); out.push('annulla: blocchi ' + G.S.bl.filter(b => b.o === 0).length + ', neve ' + p.nv);
  N.buildAct(G, me, 'w', [[8.5, 9.5], [8.5, 12.5], [6.5, 12.5]]);
  { const before = p.nv; N.buildAct(G, me, 'e', [[8.5, 12.0]]); out.push('gomma: +' + (p.nv - before) + ' neve'); }
  N.buildAct(G, me, 's', [[3, 12]]); out.push('scorte spostate in ' + p.sx + ',' + p.sy);
  // sagoma: il muro ferma chi cammina
  out.push('sagoma: dentro il muro ' + (N.blkAt(G, 8.5, 7) ? 'bloccato' : 'LIBERO!') + ', accanto ' + (N.blkAt(G, 7.6, 7) ? 'BLOCCATO!' : 'libero'));
  // ---- disegno ----
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms'); }
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma (costruzione): ' + (t / 20).toFixed(1) + ' ms'); }
  if (window.__SHOT === 'build') { cqDraw(); return out.join('\n'); }
  // ---- partita intera: lascio costruire Pierino, io pronto; poi sto dietro il mio muro e tiro ogni tanto ----
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  const log = {}, cnt = k => { log[k] = (log[k] || 0) + 1; }, rounds = [], says = new Set(); let lastN = 0, evS = 0, shot = false;
  for (let i = 0; i < 40000 && G.phase === 'play'; i++) {
    step(0.05); const s2 = G.st; if (!s2) continue;
    if (s2.say) says.add(s2.say.x);
    if (s2.ph === 'build' && !s2.p[0].rd && G.time - s2.t0 > 6) { if (s2.n > 1) N.buildAct(G, 0, 'w', [[8.5, 5.5], [8.5, 12.5]]); s2.p[0].rd = 1; }
    if (s2.ph === 'fight') {
      if (window.__SHOT === 'fight' && !shot && G.time - s2.t0 > 8) { shot = true; cq.on = true; cqDraw(); return out.join('\n'); }
      const P = s2.p[0], o = G.chars[1];
      if (P.b > 0 && Math.random() < 0.02) { if (Math.random() < 0.5) N.throwFrom(G, 0, 'd', o.x, o.y); else N.throwFrom(G, 0, 'l', o.x + (Math.random() - 0.5), o.y + (Math.random() - 0.5)); }
      if (P.b === 0 && !P.mk) { if (Math.hypot(cq.x - P.sx, cq.y - P.sy) > 1 && P.sk > 0) { cq.x = P.sx + 0.6; cq.y = P.sy; } N.startMake(G, 0); }
      if (P.b > 0 && Math.random() < 0.01) { cq.x = 7.6; cq.y = 6 + Math.random() * 6; if (!cqFree(cq.x, cq.y) || N.blkAt(G, cq.x, cq.y)) { cq.x = 6.5; cq.y = 9; } }
    }
    for (const e of s2.ev) if (e[0] > evS) { evS = e[0]; cnt(e[1] + (e[1] === 'h' || e[1] === 'td' || e[1] === 'tl' || e[1] === 'bu' ? (e[4] === 0 ? ':io' : ':Pierino') : '')); }
    if (s2.ph === 'mres' && s2.n !== lastN) { lastN = s2.n; rounds.push(s2.msg.split('\n')[1] + ' [colpi presi ' + s2.p[0].h + '/' + s2.p[1].h + ', blocchi vivi ' + G.S.bl.filter((b, i) => N.live(G, i)).length + '/' + G.S.bl.length + ']'); }
  }
  out.push('manche: ' + rounds.length + ' | ' + rounds.join(' ; '));
  out.push('fine: ' + G.phase + ' ' + (G.endInfo ? G.endInfo.t + ' ' + G.endInfo.why : ''));
  out.push('eventi: ' + Object.entries(log).map(([k, v]) => k + ' ' + v).join(', '));
  out.push('Pierino ha detto: ' + [...says].slice(0, 6).join(' | '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
