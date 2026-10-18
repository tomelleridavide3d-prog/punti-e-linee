// Colpo all'hotel: fluidita' (fotogrammi veri per 12 s mentre cammino nella hall, con guardie e telecamere) e una foto.
// uso: CPU=4 node prove/cdp.mjs . prove/colpo2.js foto.png   (window.__P = [x, y] dove mettermi; default nella hall)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=colpo]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.colpo = Object.assign({}, store.settings.cqModeOpt.colpo || {}, { n: 4, dif: 'n', time: 600 }); saveStore();
  const t0 = performance.now(); $('#lbGo').click(); await w(4200); out.push('avvio ' + Math.round(performance.now() - t0 - 4200) + ' ms in piu\'');
  const G = cq.g; const p = window.__P || [33.5, 28.5]; cq.x = p[0]; cq.y = p[1];
  for (const c of G.chars) if (c.bot) c.think = 999;   // computer fermi (solo guardie in giro)
  const gd = G.gd.find(g => g.route.some(r => Math.hypot(r[0] - p[0], r[1] - p[1]) < 10)); if (gd) { gd.x = p[0] - 3; gd.y = p[1] - 1.5; gd.path = []; }
  // cammino avanti e indietro con i tasti
  const fr = []; let last = performance.now(), run = true;
  (function f(t) { fr.push(t - last); last = t; if (run) requestAnimationFrame(f); })(performance.now());
  for (let i = 0; i < 6; i++) { cq.keys = { arrowright: i % 2 === 0, arrowleft: i % 2 === 1 }; await w(1500); }
  cq.keys = {}; await w(3000); run = false;
  fr.shift(); fr.sort((a, b) => a - b);
  out.push('fotogrammi ' + fr.length + ', mediana ' + fr[fr.length >> 1].toFixed(1) + ' ms, 95% ' + fr[Math.floor(fr.length * 0.95)].toFixed(1) + ' ms, peggiore ' + fr[fr.length - 1].toFixed(1) + ' ms, lenti (>50 ms) ' + fr.filter(v => v > 50).length);
  out.push('barra: ' + $('#cqModeBar').textContent + ' | pulsante: ' + ($('#cqKill').hidden ? '-' : $('#cqKill').textContent));
  if (gd) { gd.x = p[0] - 2.5; gd.y = p[1] - 0.5; gd.a = 0.2; gd.st = 'pat'; gd.wait = 99; gd.path = []; }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
