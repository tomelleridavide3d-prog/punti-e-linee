// Hall, caramelle pazze: compra una caramella (2 monete) e foto dei 10 effetti visti da un amico. uso: node prove/cdpimg.mjs . prove/hall2.js foto.jpg 700 520
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500);
  $('#netNew').click(); await w(3500);
  cqBank().coins = 3; saveStore();
  cq.x = 11.5; cq.y = 2.7; await w(400);
  const B = document.getElementById('hlCandyB'); o.push('pulsante ' + (B && !B.hidden ? B.textContent : 'NO'));
  B.click(); await w(300); o.push('scena ' + !!document.getElementById('hlCandy')); await w(2200);
  o.push('effetto ' + HL.S.k + ', monete ' + cqBank().coins + ', pillola ' + document.getElementById('hlFx').textContent);
  B.click(); await w(2400); o.push('seconda: monete ' + cqBank().coins + ', effetto ' + HL.S.k);
  // velocita': Fulmine
  HL.apply('fulm'); o.push('vel fulmine x' + HL.spd()); HL.apply('matta'); const d = HL.dir({ wx: 1, wy: 0, sx: 1, sy: 0 }); o.push('matta wx ' + d.wx);
  HL.apply('fly'); cq.x = 26.5; cq.y = 11.5; o.push('fly sopra divano libero ' + cqFree(26.5, 12.5)); HL.off(); o.push('dopo off libero ' + cqFree(26.5, 12.5) + ' fly ' + cq.fly);
  // foto: un amico finto con ogni effetto
  cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  const G = cq.g, cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), dpr = cv.width / cv.clientWidth;
  const fake = { id: 99, sid: 'zzfake', remote: true, alive: true, name: 'Amico', x: 20, y: 8, tx: 20, ty: 8, face: 1, walk: 0, look: { skin: 'omino', col: '#3a9ad8', hat: 'cilindro' } };
  G.chars.push(fake); G.me.alive = false; HL.S.green = 0;
  const ks = HL.IDS, cols = 5, cw = 260, ch = 260, out = document.createElement('canvas'); out.width = cw * cols; out.height = ch * 2; const g = out.getContext('2d');
  for (let i = 0; i < ks.length; i++) {
    fake.cy = ks[i]; fake.bub = ks[i] === 'mini' || ks[i] === 'big' ? { u: Date.now() + 5000, t: 'Ciao a tutti' } : null;
    HL.S.tr.clear();
    for (let s = 0; s < 12; s++) { fake.x = 18 + s * 0.2; fake.y = 9.5 - s * 0.12; fake.walk = s; HL.tick(G, 0.016); await w(30); }
    cq.x = fake.x - 0.3; cq.y = fake.y + 0.3; cqDraw();
    const c = cv.clientWidth / 2, m = cv.clientHeight / 2;
    g.drawImage(cv, (c - cw / 2 + 20) * dpr, (m - ch / 2 - 60) * dpr, cw * dpr, ch * dpr, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    g.fillStyle = '#ff0'; g.font = '700 15px system-ui'; g.fillText(HL.K[ks[i]].e + ' ' + HL.K[ks[i]].n, (i % cols) * cw + 6, Math.floor(i / cols) * ch + 18);
  }
  o.push('scia ' + (HL.S.tr.get(99) || []).length); G.chars.splice(G.chars.indexOf(fake), 1);
  return { img: out.toDataURL('image/jpeg', 0.85), out: o.join(' | ') + ' | errori: ' + (localStorage.getItem('errLog') || '').slice(0, 500) };
})()
