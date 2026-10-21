// Assedio passo C2: foto ingrandita di casette rustiche, torre d'assedio (spinta e attraccata col ponte), porticina e sortita con l'ariete in fiamme, cesta di frecce.
// uso: node prove/cdpimg.mjs . prove/as7.js foto.jpg
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
  for (const c of G.chars) if (c !== G.me) Object.assign(c, { bot: true, x: 5.5, y: 80.5, path: [] });
  const A = G.chars.filter(c => c.t === G.a0 && c !== G.me), D = G.chars.filter(c => c.t !== G.a0 && c !== G.me);
  const put = (c, x, y, k, o) => c && Object.assign(c, { x, y, path: [], cl: null, pu: null, sd: 0, sw: null, cls: k, alive: true, dn: 0, stn: 0 }, o || {});
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 600, cols = 3;
  const V = [];
  V.push(() => [8.5, 63]);                                                                     // 1) casa del mugnaio (paglia)
  V.push(() => [51, 66]);                                                                      // 2) casa del pescatore e stalla (scandole)
  V.push(() => { G.tw.x = 19.5; G.tw.y = 64; G.tw.drv = A[0].id; put(A[0], 19.5, 65.9, 'g'); put(A[1], 21, 65.5, 'a'); return [19.5, 63]; });   // 3) la torre spinta nel campo
  V.push(() => { G.tw.x = 12.5; G.tw.y = 54; G.tw.dk = 2; G.tw.drv = -1; put(A[0], 12.5, 50.5, 'g'); put(D[0], 14, 50.3, 'g', { sd: 1, sdA: Math.PI }); return [12.5, 53]; });   // 4) attraccata, ponte giu'
  V.push(() => { G.rm.y = 66; G.rm.fire = G.time + 10; put(D[1], 32.4, 66.5, 'n', { pu: { k: 'burn', e: G.time + 1, x: 32.4, y: 66.5 } }); put(A[1], 29.5, 68.4, 'a'); return [29.5, 66]; });   // 5) sortita: l'ariete brucia
  V.push(() => { G.rm.fire = 0; G.rm.y = 78.5; G.me.t = 1 - G.a0; G.me.alive = true; G.me.cls = 'a'; G.me.q = 0; return [22.5, 50.5]; });   // 6) porticina e cesta di frecce, io senza frecce
  const o = document.createElement('canvas'); o.width = cw * cols; o.height = ch * Math.ceil(V.length / cols); const g = o.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const r = V[i](); cq.x = r[0]; cq.y = r[1]; G.me.x = r[0]; G.me.y = r[1]; if (i !== 5) G.me.alive = false; AS.syncMap(G); G.zn = null; G.time += 0.02;
    cqHudFast(); cqDraw(); const k = cv.width / innerWidth; g.drawImage(cv, (innerWidth / 2 - 103) * k, (innerHeight / 2 - 190) * k, 206 * k, 300 * k, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    g.fillStyle = '#ff0'; g.font = '700 16px system-ui'; g.fillText((i + 1) + ')', (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  out.push('io a 22,5 50,5 (camminamento?) zona ' + AS.zoneAt(22.5, 50.5) + ' | dentro la porticina ' + AS.zoneAt(AS.PORT.ix, AS.PORT.iy) + ' fuori ' + AS.zoneAt(AS.PORT.ox, AS.PORT.oy));
  G.me.x = cq.x = AS.PORT.ix; G.me.y = cq.y = AS.PORT.iy; out.push('pulsante dentro la porticina: ' + (AS.action(G, G.me) || {}).t);
  G.me.x = cq.x = AS.PORT.ox; G.me.y = cq.y = AS.PORT.oy; out.push('pulsante fuori: ' + (AS.action(G, G.me) || {}).t);
  G.me.alive = true;
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return { img: o.toDataURL('image/jpeg', 0.8), out: out.join('\n') };
})()
