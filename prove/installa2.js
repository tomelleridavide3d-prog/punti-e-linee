// Android senza "Installa" (aperto da WhatsApp): dopo 5 s riquadro con "Apri in Chrome"; avviso dello sviluppatore: riquadro unico, silenzioso
(async () => {
  const o = [], sl = ms => new Promise(r => setTimeout(r, ms));
  Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36' });
  instEv = null; store.settings.instOk = 0; store.settings.instNo = 0; instLate = true; instShow();
  const a = $('#instCh'); o.push('riquadro: ' + $('#instBox').textContent.slice(0, 90) + '… | link ' + (a ? a.getAttribute('href') : 'MANCA'));
  let sent = null; const f0 = window.fetch; window.fetch = async (u, q) => { if (!String(u).includes('/msg')) return f0(u, q); const x = JSON.parse(q.body); sent = x; return new Response(JSON.stringify(x.pass === 'giusto' ? { ok: true, mandati: 3, iscritti: 3 } : { ok: false, codice: 'sbagliato' })); };
  pushSend(); $('#psTxt').value = 'Nuovi minigiochi!'; $('#psCode').value = 'sbagliato'; await $('#psGo').onclick(); o.push('codice sbagliato: ' + $('#psRes').textContent);
  $('#psCode').value = 'giusto'; await $('#psGo').onclick(); o.push('giusto: ' + $('#psRes').textContent + ' | mandato ' + JSON.stringify(sent));
  $('#psX').click(); pushSend(); o.push('riaperto, codice ricordato: ' + ($('#psCode').value === 'giusto')); $('#psX').click();
  return o.join(' || ');
})()
