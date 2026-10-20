// Mostro della notte tolto dalla lista (file tenuto): 11 giochi in lista e nella hall, chi l'aveva scelto torna a Ciack US
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzTolto'; store.settings.cqOpt = Object.assign(cqOpt(), { game: 'mostro' }); saveStore();
  o.push('giochi in lista ' + CQ_GAMES.length + ', mostro in lista ' + CQ_GAMES.some(g => g[0] === 'mostro') + ', gioco scelto ora ' + cqOpt().game);
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTolto'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(400); openCiack(); $('#pkGo').click(); await sl(1500);
  o.push('reception: ' + document.querySelectorAll('details.gList [data-g]').length + ' giochi, mostro ' + !!document.querySelector('[data-g=mostro]'));
  $('#netNew').click(); await sl(3000);
  o.push('hall: porte ' + CQ_PROPS.filter(p => p[0] === 'gdoor').length + ' (giochi + presto)');
  cqNetLeave(); await sl(500);
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return o.join(' | ');
})()
