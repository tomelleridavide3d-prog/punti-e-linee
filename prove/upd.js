// Aggiornamento del sito: durante una partita non si ricarica, alla schermata iniziale si'.
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(1500);
  sessionStorage.removeItem('plUpd'); window.__href = location.href;
  updSrv = Date.now() + 1e6; updTry();
  out.push('in partita (' + curGame + '): ricarica partita? ' + (sessionStorage.getItem('plUpd') != null));
  await w(1000);
  out.push('dopo 1 s, ancora in partita: ' + (cq.g && cq.g.mode) + ', ricaricata? ' + (sessionStorage.getItem('plUpd') != null));
  closeCiack();
  out.push('tornato alla schermata iniziale (' + curGame + '), finestre aperte: ' + !!document.querySelector('dialog[open]'));
  // fra 0,4 s la pagina si ricarica (qui non si puo' piu' aspettare): updTry ha le condizioni giuste
  out.push('condizioni per ricaricare: ' + (!!updSrv && !net && curGame === 'home' && !document.querySelector('dialog[open]')));
  return out;
})()
