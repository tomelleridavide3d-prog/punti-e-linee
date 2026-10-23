// Scopa contro il Conte: seduto al tavolino, "🃏 Carte" -> Scopa -> Conte, partita intera giocata da sola (le mie mosse con la mente del Conte),
// conteggio delle smazzate, fine partita. Controlla anche le regole (prese di pari valore prima delle somme, primiera).
// uso: node prove/cdp.mjs . prove/sco1.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  o.push('regole: 7 con [7,3,4] -> ' + JSON.stringify(SC.options(['d7', 'c3', 's4'], 'b7')) + ', 7 con [3,4,2,5] -> ' + JSON.stringify(SC.options(['c3', 's4', 'd2', 'b5'], 'b7')) + ', primiera ' + SC.primiera(['d7', 'c7', 's7', 'b7']) + ' / ' + SC.primiera(['d7', 'c7']));
  // al tavolino
  const p = cqSalaSeats()[0]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await w(300); cqSitToggle(); await w(1500);
  const cb = document.getElementById('bcHallB'); o.push('pulsante carte ' + (cb && !cb.hidden)); if (!cb || cb.hidden) return o.join(' | ');
  cb.click(); await w(400);
  const sb = [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('Scopa')); o.push('scelta gioco ' + !!sb); if (!sb) return o.join(' | ');
  sb.click(); await w(400);
  document.querySelector('#tvModal [data-k=ai]').click(); await w(2000);
  o.push('aperta ' + !!SC.T + ' carte in tavola ' + (SC.T && SC.T.S.tb.length) + ' immagini ' + document.querySelectorAll('.scRoot img.sc').length);
  let moves = 0, hands = new Set(), scope = 0, shot = 0;
  for (let g = 0; g < 900 && SC.T && SC.T.S.ph !== 'end'; g++) {
    const T = SC.T, S = T.S;
    if (S.ph === 'tally' && !S.ok[0]) { hands.add(S.hand); document.querySelector('.scTally button').click(); }
    else if (S.ph === 'play' && S.tu === 0 && Date.now() > (T.hold || 0)) {
      const m = SC.aiTurn({ S: Object.assign({}, S, { ai: 0 }) });
      if (!shot && S.tb.length >= 3) { shot = 1; const c = m.c, img = T.els.get(c); img.click(); await w(400); o.push('selezione: pulsanti ' + [...document.querySelectorAll('.scOpts button')].map(b => b.textContent).join(' / ') + ', illuminate ' + document.querySelectorAll('.scRoot img.glow').length); [...document.querySelectorAll('.scOpts button')][Math.max(0, m.o)].click(); }
      else SC.act(m);
      moves++;
    }
    if (S.mv && S.mv.scopa && S.mv.id !== o.lastS) { o.lastS = S.mv.id; scope++; }
    await w(220);
  }
  await w(1000);
  const S = SC.T.S;
  o.push('mosse mie ' + moves + ', smazzate ' + S.hand + ', scope viste ' + scope + ', totale ' + S.tot.join('-') + ', fase ' + S.ph + ', vince ' + S.win);
  o.push('fine: ' + ((document.querySelector('.tvEnd') || {}).innerText || '').replace(/\s+/g, ' '));
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
