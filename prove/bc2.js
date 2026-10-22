// prova nel browser: partita da solo contro il Conte (node prove/cdp.mjs . prove/bc2.js foto.png 412 860)
// window.__N = quante carte gioco prima di fermarmi (per la foto a meta' partita); senza: partita intera fino al riepilogo
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errs = []; addEventListener('error', e => errs.push(e.message));
  store.settings.sound = false; store.settings.myName = store.settings.myName || 'zzProva'; cq.on = true; const lb = document.getElementById('lobbyBody'); if (lb) { let p = lb; while (p.parentElement && p.parentElement !== document.body) p = p.parentElement; p.hidden = true; p.style.display = 'none'; }
  const B = await bcLoad(); B.solo();
  const N = window.__N || 99; let n = 0, t0 = performance.now();
  for (let i = 0; i < 1200 && n < N; i++) {
    await sleep(120);
    const T = document.getElementById('bcT'); if (!T || document.getElementById('bcEnd')) break;
    const go = [...T.querySelectorAll('.bcC.go')];
    if (go.length) { go[Math.floor(Math.random() * go.length)].onclick(); n++; await sleep(200); }
  }
  await sleep(N < 99 ? 900 : 2600);
  const end = document.getElementById('bcEnd');
  return { errs, giocate: n, secondi: Math.round((performance.now() - t0) / 1000), msg: (document.getElementById('bcMsg') || {}).textContent, fine: end ? end.innerText.replace(/\s+/g, ' ').slice(0, 300) : null, carteInTavolo: document.querySelectorAll('#bcT .bcC').length };
})()
