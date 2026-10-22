// batteria (23-10-2026): fotogrammi fatti davvero con uno schermo finto a 120 Hz e a 60 Hz (partita 60, hall ferma 30, 🔋 sempre 30),
// tela piu' piccola col risparmio batteria, cicli dei giochi che non girano piu' fuori dall'Hotel
// uso: node prove/cdp.mjs . prove/batteria.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; store.settings.eco = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300);
  // i cicli dei giochi: caricati Colpo, Minotauro e Mister X, fuori dall'Hotel non deve girare niente
  for (const id of ['colpo', 'minotauro', 'misterx']) await cqModeLoad(id);
  let n = 0; const raf0 = window.requestAnimationFrame; window.requestAnimationFrame = f => { n++; return raf0(f); };
  await w(1000); window.requestAnimationFrame = raf0;
  out.push('fuori dall\'Hotel, richieste di fotogramma in 1 s: ' + n + ' (giochi caricati: ' + CQ_EACH.length + ' pulsanti affidati al motore)');
  openCiack(); $('#pkGo').click(); await w(600);
  document.querySelector('#tkBody [data-g=colpo]').click(); await w(2000);
  $('#lbGo').click(); await w(5000);
  // schermo finto: si ferma il ciclo vero e si chiama cqFrame con i tempi di uno schermo a hz
  const sim = (hz, secs) => {
    const raf = window.requestAnimationFrame, d0 = window.cqDraw; let draws = 0;
    window.requestAnimationFrame = () => 0; window.cqDraw = () => { draws++; };
    cancelAnimationFrame(cq.raf); cq.hz = 60; cq.rawT = 0; let t = performance.now(); cq.last = t;
    for (let i = 0; i < hz * secs; i++) { t += 1000 / hz; cqFrame(t); }
    window.requestAnimationFrame = raf; window.cqDraw = d0; cq.raf = requestAnimationFrame(cqFrame);
    return Math.round(draws / secs);
  };
  out.push('partita: 120 Hz -> ' + sim(120, 4) + ' fotogrammi/s, 60 Hz -> ' + sim(60, 4) + ', 90 Hz -> ' + sim(90, 4));
  const c = $('#cqCanvas'), w0 = c.width;
  $('#cqEco').click(); await w(300);
  out.push('🔋 acceso: 120 Hz -> ' + sim(120, 4) + ' fotogrammi/s, tela ' + w0 + ' -> ' + c.width + ' pixel di larghezza');
  $('#cqEco').click(); await w(300);
  out.push('🔋 spento: tela ' + c.width + ', 120 Hz -> ' + sim(120, 4));
  // il tempo del gioco non rallenta saltando i fotogrammi
  const t0 = cq.g.time; sim(120, 2); out.push('tempo di gioco passato in 2 s simulati: ' + (cq.g.time - t0).toFixed(2) + ' s');
  // hall (da solo non c'e': la si prova come stato) ferma = 30, mentre mi muovo = 60
  cq.g.hall = true; const h1 = sim(120, 2); cq.keys = { arrowup: true }; const h2 = sim(120, 2); cq.keys = {}; delete cq.g.hall;
  out.push('hall: fermo ' + h1 + ', mentre cammino ' + h2);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  closeCiack();
  return out.join(' | ');
})()
