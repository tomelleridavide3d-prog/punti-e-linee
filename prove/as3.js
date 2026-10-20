// Assedio, passo B: una foto con le CLASSI in azione (guerriero con lo scudo all'ariete, fendenti nel cortile, genio che ripara il portone, barricate)
// + controllo del pannello delle classi e dei pulsanti (posizioni, niente sovrapposizioni). uso: node prove/cdpimg.mjs . prove/as3.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); localStorage.setItem('asCls', 'g'); } catch {}
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = { n: 8, time: 240, lit: 'd', map: 'castello', fill: true }; saveStore();
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const G = cq.g, AS = window.__as;
  // ---- interfaccia: pannello delle classi al via, pulsante dell'arma col guerriero ----
  const R = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
  const ov = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  out.push('classe di partenza: ' + G.me.cls + ' | pulsante arma: ' + $('#asBow').textContent + ' | pannello al via: ' + (R('asCls') ? 'visibile' : 'nascosto'));
  G.pre = 0; await w(400);
  out.push('pannello in gioco: ' + (R('asCls') ? 'visibile' : 'nascosto') + ' | pulsante classe: ' + (R('asClsB') ? $('#asClsB').textContent : 'manca'));
  $('#asClsB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(300);
  const rc = R('asCls'), rb = R('asBow'), rk = R('cqKill'), rh = R('asHelpB'), rcb = R('asClsB'), rm = R('asMap');
  out.push('aperto dal pulsante: ' + (rc ? 'si, ' + Math.round(rc.left) + ',' + Math.round(rc.top) + ' ' + Math.round(rc.width) + 'x' + Math.round(rc.height) : 'NO') + ' | finestra ' + innerWidth + 'x' + innerHeight);
  out.push('sovrapposizioni: pannello/arma ' + ov(rc, rb) + ', pannello/azione ' + ov(rc, rk) + ', classe/aiuto ' + ov(rcb, rh) + ', classe/radar ' + ov(rcb, rm));
  // scelgo il genio: lontano dalla partenza = al prossimo ritorno
  G.me.x = cq.x = 29.5; G.me.y = cq.y = 66.5; G.me.sf = 0;
  document.querySelector('#asCls button[data-k=n]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(300);
  out.push('genio scelto lontano: classe ' + G.me.cls + ', prossima ' + G.me.ncls + ' | ' + ($('#asClsB').innerHTML.includes('<i>') ? 'pallino "al ritorno"' : 'senza pallino'));
  G.me.dn = G.time + 0.1; await w(400); G.time += 0.2; G.M.tick(G, 0.05); await w(300);
  out.push('dopo il ritorno: classe ' + G.me.cls + ' cuori ' + G.me.hp + ' | pulsante arma: ' + $('#asBow').textContent);
  AS.pickCls(G, 'g'); out.push('guerriero alla partenza: ' + G.me.cls + ' cuori ' + G.me.hp);
  // ---- foto ----
  cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  for (const c of G.chars) if (c !== G.me) c.bot = true;
  const A = G.chars.filter(c => c.t === G.a0 && c !== G.me), D = G.chars.filter(c => c.t !== G.a0 && c !== G.me);
  const put = (c, x, y, k, o) => c && Object.assign(c, { x, y, path: [], cl: null, pu: null, sd: 0, sw: null, cls: k }, o || {});
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 600, cols = 3;   // ogni riquadro = il centro dello schermo ingrandito 2 volte
  const V = [];
  // 1) borgo: guerriero con lo scudo alzato e genio all'ariete, arciere dietro la barricata, frecce parate
  V.push(() => { G.lit = 'd'; G.ph = 1; G.rm.y = 60; G.rm.n = 3; put(A[0], 29, 62.2, 'g', { sd: 1, sdA: -Math.PI / 2 - 0.3 }); put(A[1], 30.3, 62.3, 'n'); put(A[2], 24.5, 61.5, 'a'); put(A[3], 34.5, 63.5, 'g', { sd: 1, sdA: -Math.PI / 2 + 0.4 });
    G.bw = [{ x: 25, y: 61, t: G.a0, hp: 4, o: A[1].id }, { x: 34, y: 61, t: G.a0, hp: 2, o: A[1].id }]; put(D[0], 20.5, 49.5, 'a'); put(D[1], 37.5, 50.5, 'a');
    G.ar = [{ id: 901, o: D[0].id, t: D[0].t, x0: 20.5, y0: 49.5, z0: 4.4, x1: 29, y1: 62.2, z1: 0.5, t0: G.time - 0.5, d: 0.5, pk: 2, te: G.time - 0.08, hit: -2, hx: 28.8, hy: 61.8, hz: 1.2 }]; return [29.5, 59]; });
  // 2) cortile: mischia intorno al pozzo (fendente del guerriero, martellata del genio), barricate delle due squadre
  V.push(() => { G.ar = []; G.ph = 2; G.gopen = true; G.zp = 0.5; G.za = 2; G.zd = 2; put(A[0], 28.6, 35.6, 'g', { sw: G.time - 0.09, swA: -0.6 }); put(A[1], 31.4, 36.2, 'n', { sw: G.time - 0.12, swA: -2.2 }); put(D[0], 29.6, 34.8, 'n'); put(D[1], 30.6, 35.4, 'g', { sd: 1, sdA: 2.4 }); put(A[2], 26.5, 38.5, 'a'); put(D[2], 33.5, 31.5, 'a');
    G.bw = [{ x: 25, y: 36, t: G.a0, hp: 4 }, { x: 33, y: 37, t: G.a0, hp: 4 }, { x: 27, y: 30, t: 1 - G.a0, hp: 4 }, { x: 32, y: 30, t: 1 - G.a0, hp: 1 }];
    G.fx = [{ k: 'hit', x: 29.6, y: 34.8, t0: performance.now() - 180 }, { k: 'wood', x: 32.5, y: 30.5, t0: performance.now() - 200 }]; return [29.5, 34.5]; });
  // 3) dietro il portone: il genio ripara mentre l'ariete colpisce
  V.push(() => { G.fx = []; G.bw = []; G.ph = 1; G.gopen = false; G.gh = 70; G.zp = 0; G.rm.y = 53.4; G.rm.hit = G.time - 0.05; put(D[0], 29.2, 48.6, 'n', { pu: { k: 'fix', e: G.time + 99, x: 29.2, y: 48.6 } }); put(D[1], 30.6, 48.4, 'n', { pu: { k: 'fix', e: G.time + 99, x: 30.6, y: 48.4 } }); put(D[2], 26.5, 51.5, 'n'); put(A[0], 29, 55, 'g', { sd: 1, sdA: -Math.PI / 2 }); put(A[1], 30.3, 55.2, 'n'); return [29.5, 49.5]; });
  // 4) sala del trono: ultimo assalto
  V.push(() => { G.ph = 3; G.zp = 0.3; G.za = 2; G.zd = 1; put(A[0], 29.2, 9.6, 'g', { sw: G.time - 0.06, swA: -1.4 }); put(A[1], 31, 10.5, 'g', { sd: 1, sdA: -2.6 }); put(D[0], 29.6, 8.6, 'g'); put(D[1], 25, 12, 'a'); G.bw = [{ x: 27, y: 12, t: 1 - G.a0, hp: 4 }]; return [29.5, 10.5]; });
  // 5) notte nel cortile
  V.push(() => { G.lit = 'n'; G.ph = 2; G.za = 1; G.zd = 1; put(A[0], 29, 36, 'g', { sd: 1, sdA: -1.6 }); put(D[0], 30, 34.5, 'n', { sw: G.time - 0.1, swA: 1.9 }); G.bw = [{ x: 31, y: 37, t: G.a0, hp: 4 }]; return [29.5, 35]; });
  // 6) io genio: anteprima della barricata davanti
  V.push(() => { G.lit = 'd'; G.ph = 1; G.gopen = false; G.gh = 130; G.bw = []; G.me.cls = 'n'; G.me.bwT = 0; cq.wdx = 0; cq.wdy = -1; put(A[0], 14, 62, 'a'); return [14.5, 65.5]; });
  const o = document.createElement('canvas'); o.width = cw * cols; o.height = ch * Math.ceil(V.length / cols); const g = o.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const [x, y] = V[i](); cq.x = x; cq.y = y; G.me.x = x; G.me.y = y; if (i < 5) G.me.alive = false; else G.me.alive = true; AS.syncMap(G); G.zn = null; G.time += 0.02;
    cqHudFast(); cqDraw(); const k = cv.width / innerWidth; g.drawImage(cv, (innerWidth / 2 - 103) * k, (innerHeight / 2 - 190) * k, 206 * k, 300 * k, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    g.fillStyle = '#ff0'; g.font = '700 16px system-ui'; g.fillText((i + 1) + ') ' + x + ',' + y + ' ' + G.lit, (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  G.me.alive = true;
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return { img: o.toDataURL('image/jpeg', 0.8), out: out.join('\n') };
})()
