// Naufraghi: scatti. Partita vera (computer attivi) con il mio personaggio che cammina da solo per l'isola (giungla, collina, rovine) per ~25 s.
// Misura ogni fotogramma e, per i piu' lenti, quanto tempo hanno preso le parti del lavoro.
// uso: CPU=4 node prove/cdp.mjs . prove/nau2.js   (CPU=4: processore rallentato come un telefono)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(4200);
  const G = cq.g, M = CQ_MAP;
  // parti misurate
  const T = {}, N = {}, wrap = (o, k, lab) => { const f = o[k]; if (!f) return; o[k] = function (...a) { const t = performance.now(); const r = f.apply(this, a); T[lab] = (T[lab] || 0) + performance.now() - t; N[lab] = (N[lab] || 0) + 1; return r; }; };
  for (const [k, lab] of [['cqPath', 'percorsi'], ['cqRedraw', 'riquadri'], ['cqTreePatch', 'ritaglio albero'], ['cqFadeImg', 'albero trasparente'], ['cqBgCell', 'ridisegno casella'], ['cqNightLayer', 'buio'], ['cqModeTick', 'regole'], ['cqDraw', 'disegno'], ['cqBuildBg', 'mappa pronta']]) wrap(window, k, lab);
  // il mio giro: dal campo verso la cima, poi all'ingresso della miniera e dentro le rovine
  const m = M.mouths[G.me.t], c0 = M.camps[G.me.t], H = M.RZ.half[G.me.t];
  const wp = [[c0.x, c0.y], [(c0.x + 64) / 2, (c0.y + 64) / 2], [64.5, 66.5], [m.ox, m.oy], [m.tx + 0.5, m.ty + 0.5], [H.p1.x, H.p1.y]];
  let i = 0, path = [];
  const frames = [], slow = []; let last = performance.now();
  const step = () => {
    if (!path.length && i < wp.length - 1) { path = cqPath(cq.x, cq.y, wp[i + 1][0], wp[i + 1][1]); i++; if (!path.length) { cq.x = wp[i][0]; cq.y = wp[i][1]; } }
    const p = path[0]; if (p) { const dx = p[0] - cq.x, dy = p[1] - cq.y, d = Math.hypot(dx, dy), s = CQ_SPEED / 60; if (d < s) { cq.x = p[0]; cq.y = p[1]; path.shift(); } else { cq.x += dx / d * s; cq.y += dy / d * s; } cq.walk += 0.18; }
  };
  cq.x = c0.x + 1; cq.y = c0.y;
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now(), dt = now - last; last = now; frames.push(dt);
    if (dt > 34) slow.push(Math.round(dt) + 'ms[' + Object.entries(T).filter(([, v]) => v > 1).map(([k, v]) => k + ' ' + v.toFixed(0) + (N[k] > 1 ? 'x' + N[k] : '')).join(', ') + ']');
    for (const k in T) delete T[k]; for (const k in N) delete N[k];
    step();
  }
  frames.sort((a, b) => a - b);
  const q = f => frames[Math.floor(frames.length * f)].toFixed(1);
  out.push('fotogrammi ' + frames.length + ' in 25 s · mediana ' + q(0.5) + ' ms · 90% ' + q(0.9) + ' · 99% ' + q(0.99) + ' · peggiore ' + frames[frames.length - 1].toFixed(0) + ' · sopra 34 ms: ' + frames.filter(f => f > 34).length);
  out.push('piu lenti: ' + slow.sort((a, b) => parseInt(b) - parseInt(a)).slice(0, 12).join(' | '));
  out.push('arrivato a ' + i + '/' + (wp.length - 1) + ' tappe · errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
