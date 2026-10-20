// hall in pixel art: si aggancia alla mappa dell'hotel, gli altri giochi restano come prima, nessun errore
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzPix'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzPix'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(400); openCiack(); $('#pkGo').click(); await sl(1500);
  $('#netNew').click(); await sl(3500);
  o.push('hall: mappa ' + cq.map + ', pixel ' + !!CQ_MAP.pxFloor + ', tessere ' + (cq.bg && cq.bg.tiles.length));
  cqNetLeave(); await sl(800);
  await cqModeStart('infezione'); await sl(3000);
  o.push('Infezione: mappa ' + cq.map + ', pixel ' + !!CQ_MAP.pxFloor);
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return o.join(' | ');
})()
