// Evasione: una sola foto con 9 inquadrature del carcere (giorno e notte). uso: node prove/cdpimg.mjs . prove/eva2.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const G = cq.g; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  const V = window.__V || [[28, 19.5, 60], [22, 45, 60], [64, 14, 60], [71, 64, 60], [26, 50, 200], [108 + 28, 15, 60], [82, 28, 60], [58, 52, 60], [108 + 72, 52, 60]];
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 860, cols = 3, rows = Math.ceil(V.length / cols);
  const out = document.createElement('canvas'); out.width = cw * cols; out.height = ch * rows; const o = out.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const [x, y, t] = V[i]; G.time = t; G.pc = window.__ev.cyc(G); cq.x = x; cq.y = y; G.me.x = x; G.me.y = y; G.M.local(G, 0.016); G.zn = null; G.fade = 0;
    cqHudFast(); cqDraw(); o.drawImage(cv, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    o.fillStyle = '#ff0'; o.font = '700 16px system-ui'; o.fillText((i + 1) + ') ' + x + ',' + y + ' t' + t, (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  return { img: out.toDataURL('image/jpeg', 0.8), out: 'ok ' + V.length + ' errori: ' + (localStorage.getItem('errLog') || '').slice(0, 400) };
})()
