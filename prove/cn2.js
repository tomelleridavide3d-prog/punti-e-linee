// carte in 3 e in 4 sul tavolo vero (giochi/carteN.js) senza rete: CN.local, si gioca al posto di tutti toccando le carte
// (briscola: un tocco; scopa: tocco + secondo tocco o pulsante della presa; "Avanti" alla fine della smazzata) fino al riquadro di fine.
// uso: node prove/cdp.mjs . prove/cn2.js [foto.png]   — con window.__STOP = 'b4:5' (variante:giocate) si ferma a meta' per la foto
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await bcLoad();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);   // la finestra del nome della prima visita
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); await wait(300); }
  const out = [], stop = (window.__STOP || '').split(':');
  for (const m of stop[0] ? [stop[0]] : ['b3', 'b4', 's3', 's4', 'sn']) {
    const names = m[1] === '3' ? ['Anna', 'Bruno', 'Carla'] : ['Anna', 'Bruno', 'Carla', 'Dario'];
    CN.local({ m, v: CN.MODES[m].v }, names);
    let plays = 0, opt = 0, tally = 0, guard = 0;
    while (CN.T && CN.T.S.ph !== 'end') {
      if (guard++ > 900) { out.push(m + ': BLOCCATO in ' + CN.T.S.ph); break; }
      const T = CN.T, S = T.S;
      if (stop[1] && plays >= +stop[1]) break;
      if (S.ph === 'tally') { for (let i = 0; i < S.p.length; i++) { T.me = i; CN.commit(); await wait(30); const b = T.root.querySelector('.cnTally button'); if (b && !b.disabled) b.click(); await wait(30); } tally++; continue; }
      if (S.gm === 'bc' && S.t.length >= S.p.length) { await wait(200); continue; }   // aspetta che la presa si risolva da sola
      T.me = S.tu; CN.commit(); await wait(20);
      const hand = S.h[T.me], c = hand[Math.floor(Math.random() * hand.length)], e = T.els.get(c);
      if (!e || e.style.opacity === '0') { out.push(m + ': carta in mano non visibile ' + c); break; }
      e.click(); await wait(20);
      if (S.gm === 'sc') {
        const bs = T.root.querySelectorAll('.cnOpts button');
        if (bs.length > 1) { bs[Math.floor(Math.random() * bs.length)].click(); opt++; }
        else if (CN.T.S.h[T.me] && CN.T.S.h[T.me].includes(c)) e.click();
        await wait(20);
      }
      plays++;
    }
    const T = CN.T, end = T && T.root.querySelector('.tvEnd');
    out.push(m + ': ' + plays + ' giocate' + (opt ? ', ' + opt + ' scelte di presa' : '') + (tally ? ', ' + tally + ' smazzate' : '') + ' | ' + (end ? 'fine: "' + end.querySelector('h2').textContent + '" ' + end.querySelectorAll('tr').length + ' righe, pulsanti ' + [...end.querySelectorAll('button')].map(b => b.textContent).join('/') : 'fermato a ' + (T && T.S.ph)));
    if (stop[1]) { CN.T.me = 0; CN.commit(); break; }
    // rivincita: tutti dicono si', parte una partita nuova con chi da' le carte che gira
    const dl = T.S.dl; for (let i = 0; i < T.S.p.length; i++) { T.me = i; CN.act({ k: 'rv' }); }
    out.push('   rivincita: partita ' + CN.T.S.g + ', mazziere ' + dl + ' -> ' + CN.T.S.dl + ', fase ' + CN.T.S.ph);
    CN.close();
  }
  return out.join('\n') + '\nerrori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
