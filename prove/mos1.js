(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  out.push('reception: ' + [...document.querySelectorAll('#tkBody [data-g]')].map(b => b.querySelector('.gt').textContent).join(', '));
  document.querySelector('#tkBody [data-g=mostro]').click(); await w(1500);
  out.push('impostazioni: ' + $('#tkBody .row').textContent.trim().slice(0, 40) + ' | ' + $('#tkBody').textContent.includes('Durata'));
  const res = {};
  for (let k = 0; k < 6; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(900);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.mode + ', mappa ' + cq.map + ', generatori ' + G.gens.length + ' ' + G.gens.map(g => g.x + ',' + g.y).join(' ') + ', furgone ' + G.van.x + ',' + G.van.y + ', mostro ' + G.chars.find(c => c.m).name + (G.me.m ? ' (io)' : '') + ', centro: ' + $('#cqCount').textContent + ', pulsante: ' + $('#cqKill').textContent);
    cq.on = false; cancelAnimationFrame(cq.raf);
    let flashes = 0, noises = 0;
    for (let i = 0; i < 8000 && G.phase === 'play'; i++) { const f0 = G.fl.length; cqModeTick(0.05); if (G.fl.length > f0) flashes++; noises = Math.max(noises, G.noise.length); if (i % 200 === 0) { cqHudFast(); cqDraw(); } }
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, accesi ' + G.gens.filter(g => g.on).length + ', scappati ' + G.chars.filter(c => c.esc).length + ', presi ' + G.chars.filter(c => c.ct).length + ', lampi ' + flashes + ' | ' + t.slice(0, 90));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
