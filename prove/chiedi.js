// all'apertura del sito: riquadro "Vuoi sapere quando un amico apre un set?"; No grazie -> non torna; Sì -> richiesta del telefono
(async () => {
  const o = [], sl = ms => new Promise(r => setTimeout(r, ms));
  o.push('permesso ' + Notification.permission);
  store.settings.pushAsked = 0; store.settings.pushId = ''; saveStore(); pushBoxShow();
  o.push('riquadro: ' + ($('#pushBox').hidden ? 'nascosto' : $('#pushBox').textContent.slice(0, 60)));
  $('#pushNo').click(); await sl(100); o.push('dopo No grazie: ' + ($('#pushBox').hidden ? 'nascosto' : 'visibile') + ', ricorda ' + store.settings.pushAsked);
  store.settings.pushAsked = 0; pushBoxShow(); let asked = 0; const r0 = Notification.requestPermission; Notification.requestPermission = async () => { asked++; return 'denied'; };
  $('#pushYes').click(); await sl(300); o.push('dopo Sì: richiesta del telefono ' + asked + ', riquadro ' + ($('#pushBox').hidden ? 'nascosto' : 'visibile'));
  Notification.requestPermission = r0; store.settings.pushAsked = 0; saveStore();
  return o.join(' | ');
})()
