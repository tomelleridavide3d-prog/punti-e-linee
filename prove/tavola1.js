// giochi da tavola (23-10-2026), un telefono: schermata iniziale senza Linee e quadrettini, reception con Minigiochi e Giochi da tavola,
// Briscola contro il Conte, Linee e quadrettini (amico a distanza = amici e nome, niente link), ritorno all'Hotel. uso: node prove/cdp.mjs . prove/tavola1.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; store.settings.friends = [{ k: 'zzamico', n: 'zzAmico' }]; store.settings.mode = 'ai'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(800);
  out.push('home: ' + [...document.querySelectorAll('#home .gcard')].filter(b => !b.hidden).map(b => b.querySelector('.gt').textContent).join(', '));
  openCiack(); await w(300); $('#pkGo').click(); await w(600);
  out.push('reception: ' + [...document.querySelectorAll('#tkBody .rcSec')].map(e => e.textContent).join(' / ') + ' | minigiochi da soli ' + document.querySelectorAll('#tkBody [data-g]').length + ', carte nella lista minigiochi ' + !!$('#bcSolo') + ' | giochi da tavola: ' + ['#tgBc', '#tgDots'].map(id => $(id) ? $(id).querySelector('.gt').textContent : 'MANCA').join(', '));
  $('#tgBc').click(); await w(300);
  out.push('Briscola: "' + $('#tkTitle').textContent + '", pulsante ' + $('#tbAI').textContent + ', amici ' + document.querySelectorAll('#tbFr [data-pk]').length + ', Indietro ' + !$('#tkBack').hidden);
  $('#tbAI').click(); await w(2500); out.push('contro il Conte: tavolo aperto ' + !!$('#bcT'));
  if ($('#bcExit')) { $('#bcExit').click(); await w(500); const go = document.querySelectorAll('#bcAsk button')[1]; if (go) go.click(); await w(500); }
  out.push('dopo Esci: tavolo ' + !!$('#bcT') + ', pannello "' + ($('#cqTask').hidden ? 'chiuso' : $('#tkTitle').textContent) + '"');
  if (!$('#cqTask').hidden && !$('#tkBack').hidden) $('#tkBack').click(); else cqReception(); await w(300);
  $('#tgDots').click(); await w(800);
  out.push('Linee e quadrettini: hotel aperto ' + cq.on + ', impostazioni aperte ' + $('#dSetup').open + ', pulsante "' + $('#bHome').textContent + '"');
  const on = [...document.querySelectorAll('#fSetup [name=mode]')].find(i => i.value === 'online'); on.checked = true; on.dispatchEvent(new Event('input', { bubbles: true })); $('#fSetup').oninput({ target: on }); await w(400);
  out.push('amico a distanza: "' + document.querySelector('#fSetup [data-for=online] .lbl').textContent + '", amici ' + document.querySelectorAll('#salaList [data-pk]').length + ', campo nome ' + !!document.querySelector('#salaList input') + ', link nella pagina ' + /link/i.test($('#fSetup').textContent) + ', Inizia nascosto ' + $('#bStart').hidden);
  $('#bHome').click(); await w(600);
  out.push('← Hotel dei Giochi: hotel ' + cq.on + ', pannello "' + $('#tkTitle').textContent + '", impostazioni chiuse ' + !$('#dSetup').open);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out.join(' | ');
})()
