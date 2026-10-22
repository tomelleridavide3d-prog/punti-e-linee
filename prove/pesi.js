// peso di ogni minigioco (23-10-2026): per ognuno una partita da solo, poi
// pacchetto per gli amici (leggero / completo, byte), giro del gioco (tick, ms), disegno (cqDraw, ms), fotogramma intero (ms), errori.
// uso: CPU=4 node prove/cdp.mjs . prove/pesi.js   (CPU=4: processore 4 volte piu' lento, come un telefono medio)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; store.settings.eco = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300);
  const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1]; }, p95 = a => { a.sort((x, y) => x - y); return a[Math.floor(a.length * 0.95)]; };
  const ids = (window.__IDS || CQ_GAMES.map(g => g[0]));
  for (const id of ids) {
    try {
      if (cq.on) closeCiack(); await w(200);
      openCiack(); $('#pkGo').click(); await w(600);
      const b = document.querySelector('#tkBody [data-g=' + id + ']'); if (!b) { out.push(id + ': manca nella lista'); continue; }
      b.click(); await w(2500);
      const go = $('#lbGo') || [...document.querySelectorAll('#tkBody button')].find(x => /Si gira/.test(x.textContent));
      if (!go) { out.push(id + ': niente pulsante per partire'); continue; }
      go.click(); await w(4000);
      cqCloseTask(); document.querySelectorAll('[id$=Help]:not([hidden]),.help:not([hidden])').forEach(e => e.hidden = true);
      const G = cq.g; if (!G) { out.push(id + ': partita non partita'); continue; }
      G.pre = 0; G.helpHold = 0; await w(3000);
      let L = 0, F = 0;
      if (G.mode) { L = JSON.stringify(cqModeSnap(false)).length; F = JSON.stringify(cqModeSnap(true)).length; }
      else { F = JSON.stringify(cqNetSnap()).length; L = F; }   // Ciack US: la versione leggera si calcola solo dentro un party
      const tk = [], dr = [];
      for (let i = 0; i < 40; i++) { const a = performance.now(); if (G.mode) G.M.tick(G, 1 / 60); else cqBots(1 / 60); tk.push(performance.now() - a); }
      for (let i = 0; i < 30; i++) { const a = performance.now(); cqDraw(); dr.push(performance.now() - a); }
      // fotogramma intero: si misura dentro cqFrame (senza aprire un secondo ciclo)
      const fr = [];
      const of = window.cqFrame; window.cqFrame = t => { const a = performance.now(); of(t); fr.push(performance.now() - a); };
      await w(2500); window.cqFrame = of;
      const n = CQ_GAMES.find(g => g[0] === id)[1];
      out.push(n + ': pacchetto ' + L + '/' + F + ' B, giro ' + med(tk).toFixed(2) + ' ms (max ' + Math.max(...tk).toFixed(1) + '), disegno ' + med(dr).toFixed(1) + ' ms, fotogramma ' + med(fr).toFixed(1) + ' / 95% ' + p95(fr).toFixed(1) + ' ms (' + Math.round(fr.length / 2.5) + ' al s), fase ' + G.phase);
    } catch (e) { out.push(id + ': ERRORE ' + (e && e.message)); }
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  if (cq.on) closeCiack();
  return out.join('\n');
})()
