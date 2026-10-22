// tornare indietro (23-10-2026): pulsanti "← Indietro" del personaggio e della reception + tasto indietro del telefono (history.back)
// uso: node prove/cdp.mjs . prove/indietro.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], vis = id => !$(id).hidden;
  const where = () => !cq.on ? 'schermata iniziale' : vis('#cqPick') ? 'personaggio' : vis('#cqTask') ? 'pannello "' + $('#tkTitle').textContent + '"' + (vis('#tkBack') ? ' con Indietro' : '') : cq.g ? (cq.g.hall ? 'hall' : 'partita') : 'hotel vuoto';
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400);
  openCiack(); await w(300); out.push('1) entro: ' + where());
  $('#pkBack').click(); await w(300); out.push('Indietro: ' + where() + ', home visibile ' + vis('#home'));
  openCiack(); await w(300); $('#pkGo').click(); await w(500); out.push('2) Entra: ' + where());
  $('#tkBack').click(); await w(300); out.push('Indietro: ' + where());
  $('#pkGo').click(); await w(500);
  history.back(); await w(500); out.push('3) tasto indietro dalla reception: ' + where());
  history.back(); await w(500); out.push('tasto indietro dal personaggio: ' + where());
  openCiack(); await w(300); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=infezione]').click(); await w(2000); out.push('4) impostazioni del gioco: ' + where());
  $('#lbGo').click(); await w(2500); cqCloseTask(); out.push('partita: ' + where());
  const c0 = window.confirm; window.confirm = () => false; history.back(); await w(500); out.push('indietro in partita, rispondo No: ' + where());
  window.confirm = () => true; history.back(); await w(500); window.confirm = c0; out.push('indietro in partita, rispondo Si: ' + where());
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out.join(' | ');
})()
