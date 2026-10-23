// bug 23-10-2026: dopo essere rientrati nella hall la mano dello schiaffo restava disegnata a raffica (orario dello schiaffo della hall di prima)
// uso: node prove/cdp.mjs . prove/schiaffofermo.js   (party vero su Firebase con nome zz, chiuso alla fine)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzSchiaffo'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzSchiaffo'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(1500); openCiack(); $('#pkGo').click(); await w(800);
  $('#netNew').click(); await w(3000);
  // conto quante volte si disegna la mano dello schiaffo
  let hands = 0; const h0 = window.cqSlapHand; window.cqSlapHand = (...a) => { hands++; return h0(...a); };
  cq.g.time = 120; cq.swT = 119.9; cq.dkT = 119; await w(300);   // schiaffo e sorso "appena fatti" in una hall che va avanti da 2 minuti
  out.push('schiaffo appena dato: mano disegnata ' + (hands > 0));
  // si esce dalla hall (es. comincia un minigioco) e si rientra: hall nuova con l'orologio da zero
  cq.g = null; cqHallEnter(); await w(200); hands = 0; await w(1500);
  out.push('rientrato nella hall: orario schiaffo ' + cq.swT + ', sorso ' + cq.dkT + ', mano disegnata in 1,5 s: ' + hands + ' volte (deve essere 0)');
  cq.x = 4.4; cq.y = 13.6; await w(300); cqSitToggle(); await w(200); cqDrink(); await w(300);
  out.push('seduto e Bevi: sta bevendo ' + (cq.dkT != null && cq.g.time - cq.dkT < 2.3));
  window.cqSlapHand = h0; cqSitToggle();
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  cqNetLeave(); await w(500);
  return out.join(' | ');
})()
