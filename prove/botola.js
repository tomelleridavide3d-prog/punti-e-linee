// Gru: la botola sopra la buca (24-10-2026). Peluche lasciati cadere sopra la botola chiusa tornano nel mucchio; la pinza bassa che spazza
// il mucchio verso la buca non regala premi; con la pinza fortunata il peluche preso e portato alla buca passa dalla botola aperta ed e' premio.
// uso: node prove/cdp.mjs . prove/botola.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  try {
    store.settings.myName = 'zzCarA'; store.settings.sound = false; store.settings.gruPity = 0; saveStore();
    const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
    if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
    await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3000);
    cqBank().coins = 50; saveStore(); GR.open(); await w(400);
    const V = GR.V, n0 = V.pl.length;
    // 1) tre peluche lasciati cadere proprio sopra la buca
    const drop = V.pl.slice(0, 3); drop.forEach((p, i) => { p.x = p.px = V.gx0 + V.chW * (0.3 + i * 0.2); p.y = p.py = V.lhy - 70 - i * 45; });
    await w(3000);
    o.push('caduti sopra la botola: ' + drop.map(p => V.pl.includes(p) ? (p.x > V.BX ? 'tornato nel mucchio' : 'fermo sulla botola x' + p.x.toFixed(0)) : 'SPARITO').join(', ') + ' | premi ' + V.pq.length + ' fase ' + V.ph);
    // 2) pinza bassa che spazza il mucchio verso la buca per 15 s
    document.querySelector('#grRoot .grGo').click(); await w(150);
    const C = V.claw; let lost = 0; const all0 = new Set(V.pl);
    for (let k = 0; k < 5; k++) {
      V.kx = 1; await w(900); V.kx = 0; V.ky = 1; await w(900); V.ky = 0; V.kx = -1; await w(1200); V.kx = 0; V.ky = -1; await w(500); V.ky = 0;
    }
    lost = [...all0].filter(p => !V.pl.includes(p)).length;
    o.push('spazzate verso la buca: peluche finiti giu\' ' + lost + ', premi ' + V.pq.length + ', botola aperta ' + V.lo.toFixed(2) + ', fase ' + V.ph);
    GR.prendi(); for (let i = 0; i < 100 && !['prize', 'miss'].includes(V.ph); i++) await w(100);
    o.push('fine tentativo: ' + V.ph);
    for (let i = 0; i < 60 && V.ph !== 'idle'; i++) { if (V.ph === 'prize') { const b = document.querySelector('.grPrize .grOk'); b && b.click(); } else if (V.ph === 'miss') GR.idle(); await w(100); }
    // 3) pinza fortunata: presa sicura, portata alla buca
    store.settings.gruPity = 9; saveStore();
    document.querySelector('#grRoot .grGo').click(); await w(150);
    const tg = V.pl.slice().sort((a, b) => a.y - b.y)[0];
    for (let i = 0; i < 80 && Math.abs(C.x - tg.x) > 2; i++) { V.kx = Math.sign(tg.x - C.x); await w(30); }
    V.kx = 0; await w(500); V.ky = 1; let last = -1, still = 0;
    for (let i = 0; i < 120 && still < 8; i++) { await w(50); if (Math.abs(C.L - last) < 0.3) still++; else still = 0; last = C.L; }
    V.ky = 0; GR.prendi(); let maxLo = 0;
    for (let i = 0; i < 150 && !['prize', 'miss'].includes(V.ph); i++) { await w(60); maxLo = Math.max(maxLo, V.lo); }
    o.push('pinza fortunata: ' + V.ph + ' (botola aperta fino a ' + maxLo.toFixed(2) + ') ' + ((document.querySelector('.grPrize h2') || {}).textContent || ''));
    await w(1500); o.push('botola dopo: ' + V.lo.toFixed(2));
  } catch (e) { o.push('ECCEZIONE ' + e.message); }
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
