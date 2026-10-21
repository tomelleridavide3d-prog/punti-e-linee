// iPhone (microfono della tastiera / riempimento automatico) manda tasti senza nome: nessun errore
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzTasto'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTasto'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(400); openCiack(); $('#pkGo').click(); await sl(1200);
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  for (const t of ['keydown', 'keyup']) { window.dispatchEvent(new KeyboardEvent(t, {})); document.dispatchEvent(new KeyboardEvent(t, {})); }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
  await sl(300);
  return 'errori: ' + (errs.length ? errs.join('; ') : 'nessuno') + ' | barra rossa: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'no');
})()
