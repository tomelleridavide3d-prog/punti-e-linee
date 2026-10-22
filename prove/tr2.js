// La casa delle trappole, passo 2: preparazione girando per la villa (telecamera libera, mirino, catalogo, Metti/Togli, pianta mini),
// villa del computer, giro nella mia villa, furto con i diamanti finti.
// uso: node prove/cdp.mjs . prove/tr2.js [foto.png]   (con la foto si ferma in preparazione, nel salone con qualche cosa messa)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=trappole]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(3600);
  const G = cq.g, T = window.__tr, toasts = []; window.cqToast = t => toasts.push(String(t).replace(/<[^>]+>/g, ''));
  out.push('fase ' + G.ph + ' | catalogo: ' + !!document.getElementById('trBar') + ' | telecamera libera: ' + JSON.stringify(cq.cam) + ' | barra: ' + $('#cqModeBar').textContent);
  const at = (x, y) => { cq.cam.x = x; cq.cam.y = y; };
  const put = (k, x, y) => { T.U.tool = k; at(x, y); const b = G.M.btn(G); G.M.act(G); return (b ? b.t + (b.on ? '' : ' (grigio)') : '-'); };
  // diamante nella credenza (14,10): il mirino davanti al mobile la trova lo stesso
  out.push('diamante: ' + put('dia', 14.5, 11.3) + ' | messe: ' + G.mine.items.map(i => i.k + '@' + i.x + ',' + i.y).join(' ') + ' | ora: ' + T.U.tool);
  at(15.5, 11.3); await w(150); out.push('scritta sotto (finto davanti alla credenza): ' + $('#trTip').textContent);
  out.push('botola sulla porta: ' + put('botola', 16.5, 20.5) + ' | avviso: ' + toasts.slice(-1)[0]);
  out.push('botola: ' + put('botola', 18.5, 12.5));
  out.push('telecamera: ' + put('cam', 20.5, 16.5) + ' | seconda: ' + put('cam', 12.5, 16.5) + ' | avviso: ' + toasts.slice(-1)[0]);
  put('jl', 17.5, 17.5); put('ja', 13.5, 10.6); out.push('terzo jolly: ' + put('jp', 23.5, 14.5) + ' | avviso: ' + toasts.slice(-1)[0]);
  put('armatura', 16.5, 10.6); put('piano', 19.5, 17.5); put('buccia', 16.5, 18.5); put('fake', 15.5, 11.3);
  out.push('messe: ' + G.mine.items.map(i => i.k).join(' ') + ' | ' + $('#cqModeBar').textContent);
  // togliere: mirino sulla buccia -> "Togli"
  { at(16.5, 18.5); const b = G.M.btn(G); const n0 = G.mine.items.length; G.M.act(G); out.push('togli: ' + (b && b.t) + ' -> tolta ' + (G.mine.items.length === n0 - 1)); }
  // pianta mini: tocco sulla cucina -> la telecamera vola li'
  { T.planOpen(); await w(100); const cv = $('#trPv'), rc = cv.getBoundingClientRect(), cs = rc.width / CQ_W; cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: rc.left + 28.5 * cs, clientY: rc.top + 23.5 * cs, bubbles: true })); await w(50);
    out.push('pianta mini -> cucina: telecamera ' + cq.cam.x.toFixed(1) + ',' + cq.cam.y.toFixed(1) + ' | pianta chiusa: ' + !document.getElementById('trPv')); }
  // villa del computer: 30 prove, tutto valido
  { let bad = 0, sp = 0; for (let i = 0; i < 30; i++) { const B = T.cpuBuild(); if (B.items.filter(o => o.k === 'dia').length !== 1 || T.spent(B) > T.BUDGET) bad++; sp += T.spent(B); } out.push('30 ville del computer: sbagliate ' + bad + ', monete spese in media ' + Math.round(sp / 30)); }
  if (window.__SHOT !== 'no') { at(16.2, 13.6); T.U.tool = 'cane'; await w(600); return out.join('\n'); }
  // fine della preparazione -> giro nella mia villa -> furto nella villa del computer
  $('#trDone').click(); await w(300);
  out.push('dopo Fatto: fase ' + G.ph + ' | catalogo tolto: ' + !document.getElementById('trBar') + ' | telecamera libera: ' + cq.cam + ' | barra: ' + $('#cqModeBar').textContent + ' | pulsante: ' + G.M.btn(G).t);
  cq.on = false; cancelAnimationFrame(cq.raf);
  G.M.act(G); out.push('furto: fase ' + G.ph + ' | ' + toasts.slice(-1)[0]);
  const SP = T.spots(), fk = G.vb.items.find(o => o.k === 'fake'), di = G.vb.items.find(o => o.k === 'dia');
  const open = i => { const s = SP[i]; for (const [a, b] of [[0.5, 1.32], [1.32, 0.5], [-0.32, 0.5], [0.5, -0.32], [0.5, 1.6], [1.6, 0.5], [-0.6, 0.5], [0.5, -0.6], [0.5, 2.6], [2.6, 0.5]]) { cq.x = s.x + a; cq.y = s.y + b; const n = cqFree(cq.x, cq.y) && G.M.spotNear(G); if (n && n.i === i) break; } const b = G.M.btn(G); G.M.act(G); for (let k = 0; k < 50; k++) cqModeTick(0.05); return b ? b.t : 'nessun pulsante'; };
  out.push('diamante finto: ' + open(fk.i) + ' -> ' + toasts.slice(-1)[0] + ' | fermo: ' + (G.stun > G.time) + ' | pulsante mentre e\' fermo: ' + (G.M.btn(G) ? G.M.btn(G).t : 'nessuno'));
  for (let k = 0; k < 80 && G.stun > G.time; k++) cqModeTick(0.05);
  out.push('diamante vero: ' + open(di.i) + ' -> ' + (G.has ? 'preso' : 'NO'));
  cq.x = 16.8; cq.y = 28.6; cqModeTick(0.05);
  out.push('fine: ' + (G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, '') : 'NON FINITA'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
