// Freccette contro il computer: pulsante sulla linea, scelta, tiri simulati col dito (tocco, tiro indietro, lascio), punteggio, fine partita.
// uso: node prove/cdp.mjs . prove/frec1.js foto.png   (la foto resta sulla visuale del bersaglio a meta' partita)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500);
  $('#netNew').click(); await w(3500);
  o.push('punti: centro ' + DA.score(0, 0)[1] + ', T20 ' + DA.score(0, -0.6)[1] + ', D3 ' + DA.score(0, 0.97)[1] + ', fuori ' + DA.score(1.2, 0)[1] + ', 6 ' + DA.score(0.4, 0)[1]);
  cq.x = CQ_W - 4.5; cq.y = 5.4; await w(500);
  const B = document.getElementById('daHallB'); o.push('pulsante ' + (B && !B.hidden));
  B.click(); await w(300); const m = document.getElementById('daModal'); o.push('scelta: ' + m.innerText.replace(/\s+/g, ' ').slice(0, 120));
  m.querySelector('[data-k=ai]').click(); await w(500);
  const cv = document.querySelector('#daRoot canvas'), r = cv.getBoundingClientRect();
  const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, isPrimary: true }));
  const throwAt = async (bx, by, pull) => { const T = DA.T; const x = T.cx + bx * T.R, y = T.cy + by * T.R + 70; ev('pointerdown', x, y); await w(250); ev('pointermove', x, y + pull); await w(200); ev('pointerup', x, y + pull); await w(700); };
  let shot = false;
  for (let guard = 0; guard < 260 && DA.T && DA.T.S.ph === 'play'; guard++) {
    const S = DA.T.S;
    if (S.tu === 0 && !S.wait && !DA.T.anim && !DA.T.pend) { await throwAt(0, -0.6, 110); if (!shot && S.r === 1) { shot = true; o.push('a meta: ' + document.getElementById('daTop').innerText.replace(/\s+/g, ' ')); } }
    else await w(300);
  }
  await w(2500); const S = DA.T.S; o.push('fine: ' + S.ph + ' io ' + S.th[0].join(',') + ' Conte ' + S.th[1].join(',') + ' vince ' + S.win);
  o.push('fine scritta: ' + (document.getElementById('daEnd') || {}).innerText);
  o.push('record locale ' + store.settings.daBest);
  const rb = document.querySelector('#daEnd [data-k=rv]'); if (!rb) return o.join(' | ') + ' | NIENTE RIVINCITA, root ' + !!document.getElementById('daRoot'); rb.click(); await w(800); o.push('rivincita: ' + DA.T.S.ph + ' giro ' + DA.T.S.r + ' primo ' + DA.T.S.f);
  await w(2200); if (DA.T.S.tu === 0) await throwAt(0.05, -0.62, 110);
  ev('pointerdown', DA.T.cx, DA.T.cy + 70); await w(1400); ev('pointermove', DA.T.cx, DA.T.cy + 180);
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
