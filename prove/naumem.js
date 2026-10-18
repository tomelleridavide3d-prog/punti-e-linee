// Naufraghi: memoria delle immagini della mappa pronta (cq.bg) — sul telefono troppa memoria = pagina chiusa dal sistema
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const mb = B => Math.round(B.tiles.reduce((s, t) => s + t.c.width * t.c.height * 4, 0) / 1048576);
  for (const d of [2, 2.75, 3]) { cq.dpr = d; cq.bg = null; cqBuildBg(); out.push('dpr ' + d + ': mappa ' + CQ_W + 'x' + CQ_H + ', tessere ' + cq.bg.tiles.length + ', ' + mb(cq.bg) + ' MB'); }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
