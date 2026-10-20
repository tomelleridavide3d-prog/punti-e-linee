// Assedio: una sola foto con piu' inquadrature (borgo, ariete al portone con l'olio, cortile conteso, sala del trono, case, accampamento, notte). uso: node prove/cdpimg.mjs . prove/as2.js foto.jpg
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
  const G = cq.g, AS = window.__as; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  for (const c of G.chars) if (c !== G.me) c.bot = true;
  const A = G.chars.filter(c => c.t === G.a0 && c !== G.me), D = G.chars.filter(c => c.t !== G.a0 && c !== G.me);
  const put = (c, x, y, o) => Object.assign(c, { x, y, path: [], cl: null, pu: null }, o || {});
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 860, cols = 3;
  const V = [];
  // 1) borgo: l'ariete sulla strada, attaccanti dietro, difensori sulle mura
  V.push(() => { G.lit = 'd'; G.ph = 1; G.rm.y = 62; G.rm.n = 2; put(A[0], 29, 64); put(A[1], 30.2, 64.2); put(A[2], 24.5, 57.5); put(D[0], 20.5, 49.5); put(D[1], 37.5, 50.5); return [29.5, 60]; });
  // 2) portone: ariete che colpisce, olio bollente
  V.push(() => { G.rm.y = 53.4; G.rm.hit = G.time - 0.05; G.gh = 50; G.burn = { t0: G.time - 0.3, e: G.time + 2, hit: [] }; put(A[0], 29, 55); put(A[1], 30.3, 55.2); put(D[0], 26.5, 51.5); return [29.5, 51]; });
  // 3) case del borgo e piazza del mercato
  V.push(() => { G.burn = null; G.gh = 130; G.rm.y = 78.5; return [14, 63]; });
  // 4) accampamento
  V.push(() => [30, 78]);
  // 5) cortile conteso
  V.push(() => { G.ph = 2; G.gopen = true; G.zp = 0.45; G.za = 2; G.zd = 1; put(A[0], 28.5, 34.5); put(A[1], 31, 31); put(D[0], 30.5, 35.5); put(D[1], 26, 36); G.annQ = [{ t: '⚔️ IL CORTILE È CONTESO!', sub: 'Cacciateli dalla zona!', col: '#6a2a6a', t0: performance.now() - 500 }]; return [29.5, 34]; });
  // 6) stalle e forgia
  V.push(() => { G.annQ = []; return [14, 26]; });
  // 7) sala del trono
  V.push(() => { G.ph = 3; G.zp = 0.3; G.za = 1; G.zd = 0; put(A[0], 29.5, 9); put(D[0], 25, 12); return [29.5, 11]; });
  // 8) notte: il portone con le torce
  V.push(() => { G.lit = 'n'; G.ph = 1; G.gopen = false; G.gh = 130; G.rm.y = 56; put(A[0], 29, 58); put(D[0], 20.5, 49.5); return [29.5, 54]; });
  // 9) notte nel borgo
  V.push(() => [22, 66]);
  const out = document.createElement('canvas'); out.width = cw * cols; out.height = ch * Math.ceil(V.length / cols); const o = out.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const [x, y] = V[i](); cq.x = x; cq.y = y; G.me.x = x; G.me.y = y; AS.syncMap(G); G.M.local(G, 0.016); G.zn = null; G.time += 0.02;
    cqHudFast(); cqDraw(); o.drawImage(cv, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    o.fillStyle = '#ff0'; o.font = '700 16px system-ui'; o.fillText((i + 1) + ') ' + x + ',' + y + ' ' + G.lit, (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  return { img: out.toDataURL('image/jpeg', 0.8), out: 'ok ' + V.length + ' errori: ' + (localStorage.getItem('errLog') || '').slice(0, 400) };
})()
