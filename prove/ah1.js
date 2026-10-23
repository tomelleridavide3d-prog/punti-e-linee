// Air hockey contro il computer: pulsante vicino al tavolo, la mia manopola insegue il disco (dito simulato), gol contati, foto a meta' partita.
// uso: node prove/cdp.mjs . prove/ah1.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  cq.x = CQ_W - 2 - 3.8; cq.y = 8.5; await w(500);
  const B = document.getElementById('tvB_ah'); o.push('pulsante ' + (B && !B.hidden)); if (!B || B.hidden) return o.join(' | ');
  B.click(); await w(300); document.querySelector('#tvModal [data-k=ai]').click(); await w(600);
  const cv = document.querySelector('.tvRoot canvas'), r = cv.getBoundingClientRect(), T = AH.T;
  const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, pointerType: 'touch' }));
  const scr = (x, y) => [T.ox + x * T.k, T.oy + y * T.k];
  ev('pointerdown', ...scr(25, 88));
  const t0 = Date.now(); let shot = 0;
  while (Date.now() - t0 < 40000 && AH.T && AH.T.S.ph === 'play') {
    const A = AH.T.ah; let tx = A.px, ty = A.py + 3; if (A.py < 50) { tx = 25 + (A.px - 25) * 0.5; ty = 88; }
    ev('pointermove', ...scr(tx, ty)); await w(30); const sp = Math.hypot(A.vx, A.vy); o.vmax = Math.max(o.vmax || 0, sp); if ((A.py < 50) !== o.top) { o.top = A.py < 50; o.cross = (o.cross || 0) + 1; } o.my = A.m[0].map(v => v.toFixed(1)).join(',');
  }
  o.push('vel max ' + (o.vmax || 0).toFixed(0) + ' passaggi ' + o.cross + ' mia manopola ' + o.my); const S = AH.T.S; o.push('punteggio ' + S.sc.join('-') + ' fase ' + S.ph + ' disco n. ' + S.rid);
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
