// Sicurezza: il mio personaggio messo in mare, provando a camminare, torna sulla terra piu' vicina
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(4500);
  cq.x = 3.5; cq.y = 3.5; out.push('messo in mare: libero ' + cqFree(cq.x, cq.y));
  cq.keys = { ArrowRight: true, d: true, D: true }; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); await w(600);
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); cq.keys = {};
  out.push('dopo aver provato a camminare: ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' libero ' + cqFree(cq.x, cq.y));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
