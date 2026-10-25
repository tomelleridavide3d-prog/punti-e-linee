// Infezione, Caccia al mammut ed Evasione tolti dalla lista (25-10-2026, file tenuti): non in reception ne' nella hall, chi li aveva scelti torna a Ciack US,
// la caramella Zombina (usa il disegno di Infezione) funziona ancora. uso: node prove/cdp.mjs . prove/tolti3.js
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), o = [], T = ['infezione', 'mammut', 'evasione'];
  store.settings.myName = 'zzTolti'; store.settings.cqOpt = Object.assign(cqOpt(), { game: 'mammut' }); saveStore();
  o.push('giochi in lista ' + CQ_GAMES.length + ', tolti in lista ' + T.filter(t => CQ_GAMES.some(g => g[0] === t)).length + ', tenuti da parte ' + T.filter(t => CQ_GAMES_OFF.some(g => g[0] === t)).length + ', motore ' + T.filter(t => CQ_MODES[t]).length + '/3, gioco scelto ora ' + cqOpt().game);
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTolti'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(400); openCiack(); $('#pkGo').click(); await sl(1500);
  o.push('reception: ' + document.querySelectorAll('details.gList [data-g]').length + ' giochi, tolti visibili ' + T.filter(t => document.querySelector('[data-g=' + t + ']')).length);
  $('#netNew').click(); await sl(3000);
  o.push('hall: porte ' + CQ_PROPS.filter(p => p[0] === 'gdoor').length + ', porte dei tolti ' + CQ_PROPS.filter(p => p[0] === 'gdoor' && T.some(t => JSON.stringify(p).includes(t))).length);
  if (window.HL && HL.give) { try { HL.give('zombina'); await sl(500); o.push('zombina ok'); } catch (e) { o.push('zombina ERRORE ' + e.message); } }
  cqNetLeave(); await sl(500);
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return o.join(' | ');
})()
