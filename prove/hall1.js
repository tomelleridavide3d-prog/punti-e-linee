// Hall: caramelle e freccette, passo 1 (angolo giochi): foto del distributore, del bersaglio con la lavagna e della linea di tiro. uso: node prove/cdpimg.mjs . prove/hall1.js foto.jpg 700 520
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzCarA'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500);
  $('#netNew').click(); await w(3500);
  const info = 'mappa ' + cq.map + ' ' + CQ_W + 'x' + CQ_H + ', candy ' + CQ_PROPS.some(p => p[0] === 'candy') + ', libero corsia ' + [[CQ_W - 6, 2], [CQ_W - 5, 3], [CQ_W - 4, 4], [CQ_W - 5, 5]].every(([x, y]) => !cqSolid[y][x]);
  cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = cv.clientWidth, ch = cv.clientHeight;
  const V = [[11.5, 3.5], [CQ_W - 5, 4.5], [CQ_W - 9, 8]];
  const out = document.createElement('canvas'); out.width = cw; out.height = ch * V.length; const o = out.getContext('2d');
  V.forEach(([x, y], i) => { cq.x = x; cq.y = y; cqDraw(); o.drawImage(cv, 0, i * ch, cw, ch); });
  return { img: out.toDataURL('image/jpeg', 0.85), out: info + ' | errori: ' + (localStorage.getItem('errLog') || '').slice(0, 400) };
})()
