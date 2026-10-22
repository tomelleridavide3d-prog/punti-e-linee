// richieste allo sviluppatore: si scrivono dalla schermata iniziale e arrivano nel pannello 🛠️ -> 📬 Richieste (poi la prova si cancella)
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzRichiesta'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzRichiesta'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(800);
  o.push('scheda: ' + ($('#gReq') ? $('#gReq').querySelector('.gt').textContent : 'MANCA'));
  $('#gReq').click(); await sl(200);
  document.querySelector('#rqWin [data-c=pers]').click(); $('#rqTxt').value = 'zz prova: vorrei un personaggio pinguino pirata'; $('#rqGo').click(); await sl(2500);
  o.push('dopo Manda: ' + $('#rqWin').textContent.slice(0, 60));
  $('#rqWin').remove();
  dlShow(); await sl(300); await rqShow(); await sl(1500);
  const it = [...document.querySelectorAll('#rqBody .rqItem')].find(e => e.textContent.includes('zz prova'));
  o.push('nel pannello: ' + (it ? it.textContent.slice(0, 80) : 'MANCA'));
  if (it) { it.querySelector('[data-rqdel]').click(); await sl(1500); }
  o.push('dopo cancella: ' + ([...document.querySelectorAll('#rqBody .rqItem')].some(e => e.textContent.includes('zz prova')) ? 'ANCORA' : 'tolta'));
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return o.join(' | ');
})()
