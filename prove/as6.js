// Assedio passo C1: foto ingrandita della catapulta (spinta, tiro, sasso col cerchio rosso e l'avviso), crepe e breccia nel muro, balestra sulla torre, mira della catapulta.
// uso: node prove/cdpimg.mjs . prove/as6.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); localStorage.setItem('asCls', 'a'); } catch {}
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = { n: 8, time: 240, lit: 'd', map: 'castello', fill: true }; saveStore();
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const G = cq.g, AS = window.__as; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  for (const c of G.chars) if (c !== G.me) c.bot = true;
  const A = G.chars.filter(c => c.t === G.a0 && c !== G.me), D = G.chars.filter(c => c.t !== G.a0 && c !== G.me);
  const put = (c, x, y, k, o) => c && Object.assign(c, { x, y, path: [], cl: null, pu: null, sd: 0, sw: null, cls: k, alive: true, dn: 0, stn: 0 }, o || {});
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 600, cols = 4;
  const V = [];
  // 1) la catapulta spinta nel campo di battaglia (uno la guida, uno porta un sasso)
  V.push(() => { G.me.t = G.a0; G.ct.x = 39.5; G.ct.y = 65; G.ct.n = 3; G.ct.rl = 0; G.ct.drv = A[0].id; put(A[0], 39.6, 66.5, 'g'); put(A[1], 41.5, 66.8, 'n', { stn: 1 }); return [39.5, 64.5]; });
  // 1b) la catapulta da sola (senza nessuno intorno), carica, e poi mentre tira
  V.push(() => { for (const c of G.chars) if (c !== G.me) Object.assign(c, { x: 5.5, y: 80.5 }); G.ct.drv = -1; G.ct.arm = -9; G.ct.rl = 0; return [39.5, 64.6]; });
  V.push(() => { G.ct.arm = G.time - 0.3; G.ct.rl = G.time + 4; G.ct.hp = 4; return [39.5, 64.6]; });
  // 2) il tiro: braccio in alto, sasso in volo, cerchio rosso sul muro; io difensore li' vicino vedo l'avviso
  V.push(() => { G.ct.drv = -1; G.ct.arm = G.time - 0.25; G.ct.rl = G.time + 5; G.ct.n = 2; G.me.t = 1 - G.a0; G.me.alive = true;
    G.rk = [{ id: 1, o: A[0].id, t: G.a0, x0: 39.5, y0: 64.7, z0: 2.2, x1: 41.5, y1: 51.2, z1: 3.4, t0: G.time - 0.7, d: 1.8, pk: 5.4, te: 0 }]; put(D[0], 40.5, 49.8, 'a'); return [41.5, 50.5]; });
  // 3) il tratto di muro crepato (3 sassi su 5), visto da fuori
  V.push(() => { G.rk = []; G.wl = [0, 0, 0, 0, 0, 3, 0, 0]; AS.syncMap(G); G.me.t = G.a0; return [42.5, 55]; });
  // 4) la BRECCIA aperta (5 su 5): si passa
  V.push(() => { G.wl = [0, 0, 5, 0, 0, 3, 0, 0]; AS.syncMap(G); put(A[0], 17, 50.5, 'g'); put(A[1], 18.5, 53, 'a'); put(D[1], 17.5, 47.5, 'g', { sd: 1, sdA: Math.PI / 2 }); return [17.5, 51.5]; });
  // 5) la balestra sulla torre di sud-est, un dardo verso la catapulta (gia' colpita)
  V.push(() => { G.me.t = 1 - G.a0; put(D[0], 55.4, 49.3, 'a'); G.bl[1].a = Math.atan2(65 - 50.5, 39.5 - 55.5); G.bl[1].rl = G.time + 3; G.ct.hp = 5;
    G.ar = [{ id: 99, o: D[0].id, t: D[0].t, q: 0, k: 'b', x0: 55.5, y0: 50.5, z0: 5, x1: 39.5, y1: 65, z1: 0.7, t0: G.time - 0.12, d: 0.6, pk: 0.6, te: 0, hit: -1 }]; return [53, 52]; });
  // 6) io attaccante alla catapulta: mira sul tratto crepato (scritta "Breccia 3/5")
  V.push(() => { G.ar = []; G.me.t = G.a0; G.me.cls = 'a'; cq.x = G.me.x = 39.5; cq.y = G.me.y = 66.6; G.ct.rl = 0; G.ct.n = 2; G.ct.hp = 9; G.aim = { ok: true, x: 42, y: 51.3, d: 14, tg: false, m: 'c', i: -1, o: { x: 39.5, y: 64.7, z: 2.2 } }; for (let i = 0; i < 60; i++) G.vw = AS.viewTick(G, 0.05); return null; });
  const o = document.createElement('canvas'); o.width = cw * cols; o.height = ch * Math.ceil(V.length / cols); const g = o.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const r = V[i](); if (r) { cq.x = r[0]; cq.y = r[1]; G.me.x = r[0]; G.me.y = r[1]; G.vw = null; }
    if (i !== 3 && i !== 7) G.me.alive = false; else G.me.alive = true; AS.syncMap(G); G.zn = null; G.time += 0.02;
    cqHudFast(); cqDraw(); const k = cv.width / innerWidth; g.drawImage(cv, (innerWidth / 2 - 103) * k, (innerHeight / 2 - 190) * k, 206 * k, 300 * k, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    g.fillStyle = '#ff0'; g.font = '700 16px system-ui'; g.fillText((i + 1) + ')', (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  out.push('pulsante arma vicino alla catapulta: ' + (G.me.alive ? $('#asBow').textContent : '-') + ' | macchina: ' + JSON.stringify(AS.machOf ? AS.machOf(G, G.me) : null));
  out.push('altezza della breccia: ' + cqHc(17, 50) + ' (muro ' + cqHc(12, 50) + ') | merlo sopra la breccia: ' + (cqSolid[51][17] ? cqSolid[51][17].prop : 'tolto'));
  G.wl = SECS0(); AS.syncMap(G); out.push('a muro rimesso: altezza ' + cqHc(17, 50) + ' merlo ' + (cqSolid[51][17] ? cqSolid[51][17].prop : 'manca'));
  function SECS0() { return [0, 0, 0, 0, 0, 0, 0, 0]; }
  G.me.alive = true;
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return { img: o.toDataURL('image/jpeg', 0.8), out: out.join('\n') };
})()
