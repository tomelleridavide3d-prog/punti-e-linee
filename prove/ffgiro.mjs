// giro veloce in Firefox: nome, Hotel, set aperto e chiuso, una partita a Infezione da solo: nessun errore
export default [
  [`(async () => { store.settings.myName = 'zzFox'; saveStore(); const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent); if (inp) { inp.value = 'zzFox'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); } await new Promise(r => setTimeout(r, 500)); return 'riquadri: avvisi ' + !$('#pushBox').hidden + ', installa ' + !$('#instBox').hidden; })()`, 0],
  [`(async () => { openCiack(); $('#pkGo').click(); await new Promise(r => setTimeout(r, 2500)); return 'reception: ' + $('#tkTitle').textContent + ' | pulsante avvisi: ' + ($('#netBell') ? $('#netBell').textContent : 'manca'); })()`, 0],
  [`(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 3000)); const ok = !!(cq.net && cq.g && cq.g.hall); cqNetLeave(); return 'set aperto e hall: ' + ok; })()`, 1000],
  [`(async () => { cqModeStart('infezione'); await new Promise(r => setTimeout(r, 4000)); return 'partita: ' + (cq.g && cq.g.mode) + ' | errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 0],
];
