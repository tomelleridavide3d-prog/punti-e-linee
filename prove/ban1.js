// Ruba la bandiera: partite simulate con il computer (anche "io" sono guidato dal computer, come attaccante).
// uso: node prove/cdp.mjs . prove/ban1.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  out.push('reception: ' + [...document.querySelectorAll('#tkBody [data-g]')].map(b => b.querySelector('.gt').textContent).join(', '));
  document.querySelector('#tkBody [data-g=bandiera]').click(); await w(1500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Punti per vincere'));
  const N = +(window.__N || 8);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(900);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.mode + ', basi ' + G.B.map(b => b.x + ',' + b.y).join(' / ') + ', squadre ' + G.chars.map(c => c.name + ':' + c.t + (c.role || '')).join(' ') + ' | centro: ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent + ' | pulsante: ' + $('#cqKill').textContent);
    G.me.bot = true; G.me.role = 'a'; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    let takes = 0, tags = 0, rets = 0; const t0 = window.cqToast; window.cqToast = h => { h = String(h); if (h.includes('rubato') || h.includes('preso la bandiera') || h.includes('Hai preso la')) takes++; if (h.includes('⛓️') || h.includes('👮')) tags++; if (h.includes('🏠')) rets++; };
    for (let i = 0; i < 12000 && G.phase === 'play'; i++) { cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; if (i % 300 === 0) { cqHudFast(); cqDraw(); } }
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, punti ' + G.sc.join('-') + ', prese bandiera ' + takes + ', catture ' + tags + ', ritorni ' + rets + ' | ' + t.slice(0, 70));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  // una partita vera ferma all'inizio per la foto
  $('#enNew').click(); await w(300); $('#lbGo').click(); await w(4500);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
