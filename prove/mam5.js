// Caccia al mammut: spiegazione "Come si gioca" (impostazioni, apertura da sola a inizio partita con la partita ferma, pulsante ❓)
// e sciacalli di notte (sempre disegnati, occhi rossi che svaniscono nella luce). uso: node prove/cdp.mjs . prove/mam5.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  try { localStorage.removeItem('mmHelpN'); } catch {}
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=mammut]').click(); await w(2500);
  const det = document.querySelector('#tkBody .mmHow');
  out.push('impostazioni: tendina ' + !!det + ', righe ' + (det ? det.querySelectorAll('p').length : 0));
  $('#lbGo').click(); await w(2500);
  const G = cq.g, hp = $('#mmHelp');
  out.push('inizio: spiegazione aperta ' + !hp.hidden + ' | pulsante ❓ ' + !$('#mmHelpB').hidden);
  const t0 = G.time; await w(2500);
  out.push('mentre leggo: tempo fermo ' + (G.time === t0) + ' (pre ' + G.pre.toFixed(1) + ')');
  hp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 300 })); hp.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 300 }));
  await w(2500);
  out.push('chiusa: ' + hp.hidden + ' | la partita va: ' + (G.time > t0));
  $('#mmHelpB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(300);
  out.push('❓ la riapre: ' + !hp.hidden); $('#mmHelpB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(300);
  // notte: sciacalli
  const c0 = window.__mm.cyc(G); G.time += 125 - c0; await w(1500);
  const ex = G.M.extras(G).filter(e => e.all), MN = G.M.night(G);
  out.push('notte: sciacalli ' + G.jk.length + ', disegnati sempre ' + ex.length + ' | luce vicino al fuoco ' + MN.lit(CQ_MAP.camp.x + 0.5, CQ_MAP.camp.y + 2.5).toFixed(2) + ', lontano ' + MN.lit(CQ_MAP.camp.x + 20, CQ_MAP.camp.y).toFixed(2));
  // io accanto al fuoco, uno sciacallo nel buio a 7 caselle e uno al bordo della luce
  cq.x = CQ_MAP.camp.x + 0.5; cq.y = CQ_MAP.camp.y + 2; if (G.jk[0]) { G.jk[0].x = cq.x + 7; G.jk[0].y = cq.y; G.jk[0].path = []; } if (G.jk[1]) { G.jk[1].x = cq.x - 3.5; G.jk[1].y = cq.y + 2; G.jk[1].path = []; }
  for (const j of G.jk) j.cd = G.time + 99;
  await w(800);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
