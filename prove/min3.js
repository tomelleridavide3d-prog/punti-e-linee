// Il Minotauro: scatti al cambio dei muri. uso: CPU=4 node prove/cdp.mjs . prove/min3.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { minotauro: { tm: 2, n: 8, mino: 'c', wall: 60, time: 420, map: 'labirinto', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=minotauro]').click(); await w(2500);
  $('#lbGo').click(); await w(4000);
  const G = cq.g; G.me.alive = false;   // fantasma: non mi prende nessuno
  // tempi delle parti sospette
  const T = {}, wrap = (o, k, n) => { const f = o[k]; o[k] = function (...a) { const t = performance.now(), r = f.apply(this, a); T[n] = (T[n] || 0) + performance.now() - t; return r; }; };
  wrap(window, 'cqBgCell', 'cqBgCell');
  const tm = G.M.tick, lc = G.M.local;
  G.M.tick = function (...a) { const t = performance.now(); const r = tm.apply(this, a); const d = performance.now() - t; if (d > (T.maxTick || 0)) T.maxTick = d; return r; };
  G.M.local = function (...a) { const t = performance.now(); const r = lc.apply(this, a); const d = performance.now() - t; if (d > (T.maxLocal || 0)) T.maxLocal = d; return r; };
  const ov = G.M.over; G.M.over = function (...a) { const t = performance.now(); const r = ov.apply(this, a); const d = performance.now() - t; if (d > (T.maxOver || 0)) T.maxOver = d; return r; };
  const res = [];
  for (let k = 0; k < 2; k++) {
    G.next = G.time + 6.2; const v0 = G.wv;
    const fr = []; let last = performance.now(), run = true, tShift = 0;
    const tick = t => { if (!run) return; fr.push([t - last, G.wv !== v0 ? 1 : G.pend ? 0.5 : 0, G.rz && G.rz.length ? 1 : 0]); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    for (let i = 0; i < 16; i++) { const kk = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][i % 4]; cq.keys[kk] = true; await w(500); cq.keys[kk] = false; }
    run = false;
    const slow = fr.filter(f => f[0] > 34);
    res.push('giro ' + k + ': fotogrammi ' + fr.length + ', lenti ' + slow.length + ' (' + slow.map(f => f[0].toFixed(0) + (f[1] === 1 ? 'd' : f[1] ? 'a' : 'p')).join(' ') + ') max ' + Math.max(...fr.map(f => f[0])).toFixed(0) + ' ms, ridisegno ' + Math.round(fr.filter(f => f[2]).reduce((a, f) => a + f[0], 0)) + ' ms, spostamenti ' + G.wv);
  }
  out.push(...res, 'tempi: ' + JSON.stringify(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(1)]))));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
