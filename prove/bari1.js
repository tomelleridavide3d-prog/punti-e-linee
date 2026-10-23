// Duello all'alba dei bari: strada (raggiungibile), disegno, partita intera contro lo Sceriffo giocata da sola.
// uso: node prove/cdp.mjs . prove/bari1.js [foto.png]   (window.__SHOT = 'load' foto del tamburo; altrimenti foto del duello)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzBaProva'; store.settings.sound = false; saveStore();
  try { localStorage.setItem('bariHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzBaProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=bari]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + ($('#tkBody').textContent.includes('Come si gioca') ? 'ok' : 'MANCANO'));
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'bari') return out.concat('partita non partita').join('\n');
  const B = window.__bari, M = G.M;
  // ---- strada raggiungibile ----
  const Wd = CQ_W, Hd = CQ_H, seen = new Uint8Array(Wd * Hd), q = [[8, 8]]; seen[8 * Wd + 8] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < Wd && ny < Hd && cqCellFree(nx, ny) && !seen[ny * Wd + nx]) { seen[ny * Wd + nx] = 1; q.push([nx, ny]); } } }
  let n = 0; const isl = []; for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (cqCellFree(x, y)) { n++; if (!seen[y * Wd + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + n + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.join(' ') : ' | tutto raggiungibile (ripari a parte)'));
  { let bad = 0; for (let i = 0; i < 200; i++) { const L = B.genCovers(); if (L.length !== 6) bad++; for (const [, x, y] of L) if (!cqFloor[y][x] || (cqSolid[y][x] && cqSolid[y][x].prop !== 'bsoft')) bad++; for (let j = 0; j < 3; j++) { const a = L[j], b = L[j + 3]; if (a[1] !== 25 - b[1] || a[2] !== 15 - b[2]) bad++; } } out.push('ripari: 200 manche finte, problemi ' + bad); }
  // ---- disegno ----
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms'); }
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma: ' + (t / 20).toFixed(1) + ' ms'); }
  if (window.__SHOT === 'load') { cqDraw(); return out.join('\n'); }
  // ---- partita intera: io sto fermo allo scoperto, sparo a ogni rintocco con un ritardo a caso ----
  cq.on = false; cancelAnimationFrame(cq.raf);
  const bot = G.chars.find(c => c.bot); const log = {}, cnt = k => { log[k] = (log[k] || 0) + 1; };
  const step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  let lastN = 0, myPlan = null, says = new Set(), seen2 = 0, rounds = [];
  for (let i = 0; i < 20000 && G.phase === 'play'; i++) {
    step(0.05);
    const st = G.st; if (!st) continue;
    if (st.say) says.add(st.say.x);
    if (st.ph === 'load' && !B.U2.rdy && G.time - st.t0 > 1) { B.U2.d = B.randDrum(); B.setReady(G, true); }
    if (st.ph === 'duel') {
      const k = B.winOpen(G, G.time);
      if (k >= 0 && myPlan !== k) { myPlan = k; G.__shootAt = G.time + 0.2 + Math.random() * 0.4; }
      if (k >= 0 && G.__shootAt && G.time >= G.__shootAt) { G.__shootAt = 0; B.myAct(G, Math.random() < 0.85 ? 's' : 'f'); }
      if (Math.random() < 0.01) { cq.x = 3 + Math.random() * 6; cq.y = 5.5 + Math.random() * 5; if (!cqFree(cq.x, cq.y) || G.M.blk(G, cq.x, cq.y)) { cq.x = 8; cq.y = 8; } }
    }
    for (const e of st.sh) if (e[0] > seen2) { seen2 = e[0]; cnt(e[2] + ':' + e[3]); }
    if (st.ph === 'mres' && st.n !== lastN) { lastN = st.n; rounds.push(st.msg.split('\n')[1] + ' [' + G.chars.map(c => (st.ff || {})[c.id]).join('/') + ' colpi]'); }
  }
  out.push('manche: ' + rounds.length + ' | ' + rounds.join(' ; '));
  out.push('fine: ' + G.phase + ' ' + (G.endInfo ? G.endInfo.t + ' ' + G.endInfo.why : ''));
  out.push('azioni: ' + Object.entries(log).map(([k, v]) => k + ' ' + v).join(', '));
  out.push('lo Sceriffo ha detto: ' + [...says].slice(0, 8).join(' | '));
  out.push('memoria dello Sceriffo: ' + JSON.stringify(B.shMem()) + ' -> ' + B.shRead());
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
