// Mister X: fluidita' (fotogrammi veri per 20 s camminando per la citta', con i passanti e i computer che giocano) e tempo di avvio.
// uso: CPU=4 node prove/cdp.mjs . prove/mx3.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { misterx: { mx: 'c', n: 8, flash: 45, time: 420, map: 'citta', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=misterx]').click(); await w(2500);
  let t0 = performance.now(); $('#lbGo').click(); await w(200); out.push('avvio ' + Math.round(performance.now() - t0) + ' ms');
  await w(4500);
  const G = cq.g;
  const fr = []; let last = performance.now(), run = true;
  const tick = t => { if (!run) return; fr.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  for (let i = 0; i < 40; i++) { const k = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][Math.floor(i / 5) % 4]; cq.keys[k] = true; await w(500); cq.keys[k] = false; }
  run = false;
  fr.sort((a, b) => a - b);
  out.push('fotogrammi ' + fr.length + ', mediana ' + fr[fr.length >> 1].toFixed(1) + ' ms, 99% ' + fr[Math.floor(fr.length * 0.99)].toFixed(1) + ', peggiore ' + fr[fr.length - 1].toFixed(0) + ', lenti (>34 ms) ' + fr.filter(v => v > 34).length + ' | fase ' + G.phase + ' lampeggi ' + G.fl);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
