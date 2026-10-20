// Assedio: una sola foto con piu' inquadrature del castello (giorno, tramonto, notte, scala appoggiata, mira). uso: node prove/cdpimg.mjs . prove/as2.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = { n: 8, time: 240, lit: 'd', map: 'castello', fill: true }; saveStore();
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const G = cq.g; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  // una scala appoggiata al muro est, un attaccante che sale, uno sul camminamento, un difensore che tira
  const A = G.chars.filter(c => c.t === G.a0), D = G.chars.filter(c => c.t !== G.a0);
  const M = CQ_MAP, si = M.spots.findIndex(S => S.w === 'E' && S.fy === 20); G.ld[0].st = 2; G.ld[0].s = si; G.ld[0].pt = 0;
  const S = M.spots[si]; Object.assign(A[1], { x: S.ax, y: S.ay, cl: { s: si, d: 1, t0: G.time - 0.9, T: 1.5 }, path: [] });
  Object.assign(A[2], { x: 34.5, y: 23.5, path: [] }); Object.assign(D[0], { x: 33.5, y: 18.5, path: [], hp: 2 }); Object.assign(D[1], { x: 22.5, y: 33.6, path: [], hp: 1 });
  Object.assign(A[3], { x: 41.5, y: 21.5, path: [] }); G.ld[1].st = 1; G.ld[1].c = A[3].id;
  for (const c of G.chars) if (c !== G.me) c.bot = true;
  window.__as.syncLd(G);
  const V = window.__V || [[38, 22, 'd'], [22, 40, 'd'], [53, 52, 'd'], [18, 22, 'd'], [28, 28, 'd'], [38, 22, 's'], [22, 40, 'n'], [34.5, 21.5, 'n'], [53, 52, 'n']];
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 860, cols = 3, rows = Math.ceil(V.length / cols);
  const out = document.createElement('canvas'); out.width = cw * cols; out.height = ch * rows; const o = out.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const [x, y, lit] = V[i]; G.lit = lit; cq.x = x; cq.y = y; G.me.x = x; G.me.y = y; G.me.t = i === 4 ? G.a0 : G.me.t; G.M.local(G, 0.016); G.zn = null;
    G.aim = i === 0 ? { ok: true, x: 33.5, y: 18.5, d: 6, tg: true } : null;
    if (i === 0) window.__as.mkArrow(G, A[3], 34.5, 16.5); G.time += 0.25;
    cqHudFast(); cqDraw(); o.drawImage(cv, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    o.fillStyle = '#ff0'; o.font = '700 16px system-ui'; o.fillText((i + 1) + ') ' + x + ',' + y + ' ' + lit, (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  return { img: out.toDataURL('image/jpeg', 0.8), out: 'ok ' + V.length + ' errori: ' + (localStorage.getItem('errLog') || '').slice(0, 400) };
})()
