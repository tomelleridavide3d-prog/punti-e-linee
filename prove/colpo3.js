// Colpo all'hotel: NASCONDIGLI e BATTITO. node prove/cdp.mjs . prove/colpo3.js
// 1) tutti i nascondigli raggiungibili; 2) mi nascondo; 3) una guardia mi passa accanto e non mi vede (battito); 4) se la guardia mi guarda non posso nascondermi; 5) muovendomi esco.
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=colpo]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.colpo = Object.assign({}, store.settings.cqModeOpt.colpo || {}, { n: 4, dif: 'n', time: 600 }); saveStore();
  $('#lbGo').click(); await w(4500);
  const G = cq.g, M = CQ_MAP; cqCloseTask(); G.brief = 1; G.pre = 0;
  for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 64.5; c.y = 30.5; }
  cq.on = false; cancelAnimationFrame(cq.raf);
  // 1) nascondigli: per tipo, e ognuno con una casella libera accanto
  const tipi = {}; let bad = 0; for (const h of M.HS) { tipi[h.t] = (tipi[h.t] || 0) + 1; if (![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => cqCellFree(h.x + dx, h.y + dy))) bad++; }
  out.push('nascondigli ' + M.HS.length + ' ' + JSON.stringify(tipi) + ', senza accesso ' + bad);
  // tutte le guardie lontane e ferme, tranne una
  G.gd.forEach((g, i) => { g.x = 30.5 + i; g.y = 16.5; g.st = 'ko'; g.ko = 1e9; g.found = 1; g.path = []; });
  const gd = G.gd[1]; gd.st = 'pat'; gd.ko = 0; gd.wait = 1e9;
  const tick = s => { for (let i = 0; i < s * 20; i++) { cqModeTick(0.05); G.M.local(G, 0.05); } };
  // 2) armadio della Camera 101 (primo piano)
  const h = M.HS.find(q => q.t === 'wardrobe'), q = cqSpot(h.x, h.y); cq.x = q.x; cq.y = q.y; tick(0.2);
  out.push('vicino: ' + JSON.stringify(G.M.btn(G))); G.M.act(G); tick(0.2);
  out.push('nascosto: ' + !!G.me.hd + ' | disegnato: ' + !G.M.hide(G.me));
  // 3) la guardia passa a 1 casella guardandomi dritto
  gd.x = cq.x + 1.0; gd.y = cq.y; gd.a = Math.PI; gd.sus = 0; tick(3);
  out.push('guardia accanto per 3 s: stato ' + gd.st + ', sospetto ' + gd.sus.toFixed(2) + ', preso ' + !!G.me.jail + ', battito ' + G.hb.toFixed(2));
  // 5) mi muovo: esco
  cq.keys = { arrowright: true }; await w(700); tick(0.3); cq.keys = {};
  out.push('dopo essermi mosso: nascosto ' + !!G.me.hd);
  // 4) la guardia mi guarda: niente nascondiglio
  gd.x = cq.x + 2.5; gd.y = cq.y; gd.a = Math.PI; gd.st = 'pat'; gd.sus = 0; gd.wait = 1e9; const b = G.M.btn(G);
  out.push('guardia che mi guarda: ' + JSON.stringify(b));
  // battito senza nascondermi, guardia di spalle a 3 caselle
  gd.x = cq.x + 3; gd.a = 0; gd.sus = 0; tick(0.3); out.push('guardia di spalle a 3 caselle: battito ' + G.hb.toFixed(2) + ', sospetto ' + gd.sus.toFixed(2));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
