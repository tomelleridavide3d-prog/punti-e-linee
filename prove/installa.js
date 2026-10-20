// riquadro "Metti il gioco sulla home": compare quando il browser permette l'installazione, Installa apre la richiesta del telefono
(async () => {
  const o = [], sl = ms => new Promise(r => setTimeout(r, ms));
  store.settings.instOk = 0; store.settings.instNo = 0; saveStore();
  o.push('prima: ' + ($('#instBox').hidden ? 'nascosto' : 'visibile'));
  let asked = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { asked++; }; e.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(e); await sl(100);
  o.push('dopo: ' + ($('#instBox').hidden ? 'nascosto' : $('#instBox').textContent));
  if (!window.__shot) { $('#instGo').click(); await sl(300); o.push('richiesta del telefono ' + asked + ', poi riquadro ' + ($('#instBox').hidden ? 'nascosto' : 'visibile')); }
  return o.join(' | ');
})()
