// Officina dei robot: i robot disegnati in grande (tutti i pezzi, ruote e cingoli, ribaltato, scossa, fiamme) per controllarli a occhio.
// uso: node prove/cdp.mjs . prove/rob2.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  if (!window.__robot) { await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'giochi/robot.js?v=' + Date.now(); s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  { const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent); if (inp) { inp.value = 'zzRoProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); } await w(300); }
  const N = window.__robot, cv = document.createElement('canvas'), W = 412, H = 860, dpr = 2;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:99999;background:#30333a';
  document.body.appendChild(cv); const g = cv.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = '#3a3e46'; g.fillRect(0, 0, W, H);
  const L = [
    ['pala+corazze, cingoli', { m: 'c', s: ['pala', 'corazza', 'ammo', 'corazza', 'barra'] }, -0.6, {}],
    ['sega+acciaio, ruote', { m: 'r', s: ['sega', 'piastre', 'gomma', 'ignif', 'corazza'] }, -0.6, { act: 0 }],
    ['fiamma, cannone sopra', { m: 'r', s: ['fiamma', 'ignif', 'cannone', 'gomma', 'cannone'] }, 2.4, {}],
    ['scossa sopra, molle', { m: 'c', s: ['cannone', 'ammo', 'piastre', 'ammo', 'scossa'] }, 0.9, { stn: 1 }],
    ['dietro: sega + pala', { m: 'r', s: ['corazza', 'pala', 'sega', 'scossa', 'piastre'] }, 2.6, { burn: 1 }],
    ['ribaltato', { m: 'r', s: ['pala', 'corazza', '', 'corazza', ''] }, -0.6, { fp: 2, sv: false }]];
  L.forEach(([n, bd, a, o], i) => { const X = 105 + (i % 2) * 205, Y = 165 + Math.floor(i / 2) * 270; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X - 98, Y - 140, 196, 250);
    N.fig(g, X, Y, 150, Object.assign({ bd, hp: null, a, s: i % 2, t: 1.3, wa: 0, act: -1, fw: {}, ta: a + 0.8, tel: 50 }, o));
    g.fillStyle = '#fff'; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.fillText(n, X, Y + 98); });
  await w(200); return 'ok';
})()
