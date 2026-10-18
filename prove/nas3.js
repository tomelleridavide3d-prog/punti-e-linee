// Nascondino: da nascosto il menu si apre da solo all'inizio, poi resta il pulsante in alto al centro (node prove/cdp.mjs . prove/nas3.js foto.png)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { nascondino: { time: 240, seek: 1, hide: 20, me: 'h', dark: 'on', map: 'studio', n: 8, fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=nascondino]').click(); await w(1500);
  const go = $('#lbGo') || [...document.querySelectorAll('#tkBody button')].find(b => /gira|Inizia|Gioca/i.test(b.textContent));
  out.push('pulsante partenza: ' + (go ? go.textContent : 'NON TROVATO'));
  go.click(); await w(1200);
  const G = cq.g, b = document.getElementById('nsPick');
  out.push('ruolo ' + G.me.r + ' | menu aperto: ' + !$('#cqTask').hidden + ' titolo: ' + $('#tkTitle').textContent + ' voci ' + document.querySelectorAll('#tkBody [data-v]').length);
  document.querySelector('#tkBody [data-v="3"]').click(); await w(400);
  out.push('dopo la scelta: ' + JSON.stringify(G.me.pr) + ' | menu aperto: ' + !$('#cqTask').hidden + ' | pulsante in alto: ' + (b && !b.hidden ? b.textContent : 'nascosto') + ' | pulsante grande: ' + ($('#cqKill').hidden ? 'nascosto' : $('#cqKill').textContent));
  const r1 = $('#cqModeBar').getBoundingClientRect(), r2 = b.getBoundingClientRect(), r3 = $('#cqCount').getBoundingClientRect();
  out.push('barra ' + Math.round(r1.top) + '-' + Math.round(r1.bottom) + ' | pulsante ' + Math.round(r2.top) + '-' + Math.round(r2.bottom) + ' | scritta ' + Math.round(r3.top) + '-' + Math.round(r3.bottom) + ' visibile ' + !$('#cqCount').hidden);
  b.click(); await w(300); out.push('ritocco il pulsante: menu ' + !$('#cqTask').hidden); cqCloseTask(); await w(300);
  // fine della conta: diventa "Cambia oggetto (2)"
  G.time = G.opt.hide + 0.5; await w(400); out.push('in caccia: ' + (b.hidden ? 'nascosto' : b.textContent));
  G.time = 1; await w(400);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
