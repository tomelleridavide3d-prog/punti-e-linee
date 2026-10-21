// Assedio, correzioni dopo la prova: visuale che si allarga mirando lontano, ariete solido con la carica al portone.
// Foto a schermo intero di 3 inquadrature + controlli automatici. uso: node prove/cdpimg.mjs . prove/as4.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); localStorage.setItem('asCls', 'a'); } catch {}
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = { n: 6, time: 240, lit: 'd', map: 'castello', fill: true }; saveStore();
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500);
  $('#lbGo').click(); await w(2500);
  const G = cq.g, AS = window.__as; G.pre = 0; await w(300);
  // ---- l'ariete e' solido: non ci si passa dentro ----
  const solid = [];
  for (let y = 74; y <= 82; y++) for (let x = 27; x <= 31; x++) if (cqSolid[y][x] && cqSolid[y][x].prop === 'aRamS') solid.push(x + ',' + y);
  out.push('ariete solido in ' + solid.length + ' caselle (' + solid[0] + ' … ' + solid[solid.length - 1] + ') | posso stare dentro? ' + cqFree(29.5, 78.5));
  // ---- io attaccante: spingo col corpo da dietro ----
  cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  for (const c of G.chars) if (c !== G.me) { c.bot = true; c.alive = false; }
  G.me.t = G.a0; const yb = (G.rm.y + 1.95); cq.x = G.me.x = 29.5; cq.y = G.me.y = yb + 0.35; const y0 = G.rm.y;
  for (let i = 0; i < 40; i++) { G.time += 0.05; G.M.tick(G, 0.05); }
  out.push('spingo da solo per 2 s: ariete da ' + y0.toFixed(2) + ' a ' + G.rm.y.toFixed(2) + ' (spingitori ' + G.rm.n + ')');
  cq.x = G.me.x = 24.5; const y1 = G.rm.y; for (let i = 0; i < 20; i++) { G.time += 0.05; G.M.tick(G, 0.05); }
  out.push('se mi allontano: ariete fermo? ' + (G.rm.y === y1));
  // ---- al portone: carica e colpo ----
  G.rm.y = 53.4; AS.syncMap(G); const yb2 = (53.4 + 1.95); cq.x = G.me.x = 29.5; cq.y = G.me.y = yb2 + 0.35;
  const a = AS.action(G, G.me); out.push('pulsante al portone: ' + (a ? a.t : 'nessuno'));
  const gh0 = G.gh; G.M.act(G); for (let i = 0; i < 30; i++) { G.time += 0.05; G.M.tick(G, 0.05); }
  out.push('dopo 1,5 s di carica: ' + AS.action(G, G.me).t + ' | carica ' + (G.rm.pl * 100).toFixed(0) + '%');
  G.chg = performance.now() - 1500; window.__as.ramLet(G); for (let i = 0; i < 12; i++) { G.time += 0.05; G.M.tick(G, 0.05); }
  out.push('colpo pieno da solo: portone ' + gh0 + ' -> ' + Math.round(G.gh));
  // freccia dalle mura su chi spinge dietro l'ariete (prima si piantava sul tetto dell'ariete)
  { const D = G.chars.find(c => c !== G.me && c.t !== G.a0); Object.assign(D, { alive: true, dn: 0, x: 25.5, y: 51.5, cls: 'a', rl: 0, path: [] }); G.me.hp = 3; G.me.sf = 0; G.me.cls = 'a'; const hp0 = G.me.hp;
    let hit = 0; for (let k = 0; k < 6; k++) { D.rl = 0; G.me.hp = 3; G.me.dn = 0; G.me.sf = 0; const ar = AS.mkArrow(G, D, cq.x + (Math.random() - 0.5) * 0.2, cq.y + (Math.random() - 0.5) * 0.2); for (let i = 0; i < 30; i++) { G.time += 0.05; G.M.tick(G, 0.05); } if (ar.hit === G.me.id) hit++; }
    out.push('frecce dalle mura su chi spinge (6 tiri precisi): colpito ' + hit + ' volte'); D.alive = false; }
  // attaccato all'ariete mentre spingo: distanza tra la mia schiena e quella dell'ariete
  { G.rm.y = 70; AS.syncMap(G); cq.x = G.me.x = 29.5; cq.y = G.me.y = 70 + 1.95 + 0.3; G.me.t = G.a0; for (let i = 0; i < 40; i++) { if (cqFreeZ(cq.x, cq.y, cq.x, cq.y - 3.4 * 0.05)) cq.y -= 3.4 * 0.05; G.time += 0.05; G.M.tick(G, 0.05); AS.syncMap(G); }
    out.push('spingendo di continuo: staccato di ' + (cq.y - (G.rm.y + 1.95)).toFixed(2) + ' caselle (il mio raggio: 0,30)'); }
  // parata dello scudo contro la spada
  { const E = G.chars.find(c => c !== G.me && c.t !== G.a0); Object.assign(E, { alive: true, dn: 0, sf: 0, x: 29.5, y: 66.5, cls: 'g', hp: 4, path: [], rl: 0 }); Object.assign(G.me, { cls: 'g', hp: 4, sf: 0, sd: 1, sdA: -Math.PI / 2, pmT: 0, rl: 0 }); cq.x = G.me.x = 29.5; cq.y = G.me.y = 67.6;
    E.rl = 0; AS.melee(G, E); const h1 = G.me.hp; E.rl = 0; G.time += 0.6; AS.melee(G, E); const h2 = G.me.hp;
    out.push('scudo contro la spada: primo colpo cuori ' + h1 + '/4 (parato), secondo subito dopo ' + h2 + '/4 | scudo scosso per ' + (G.me.pmT - G.time).toFixed(1) + ' s'); E.alive = false; G.me.sd = 0; }
  // ---- foto ----
  const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'), cw = 412, ch = 860;
  const V = [];
  // 1) io arciere sulle mura, miro lontano nel borgo: la visuale si allarga
  V.push(() => { G.me.t = 1 - G.a0; G.me.cls = 'a'; cq.x = G.me.x = 20.5; cq.y = G.me.y = 50.5; G.aim = { ok: true, x: 29.5, y: 61.5, d: 12, tg: false }; for (let i = 0; i < 60; i++) G.vw = AS.viewTick(G, 0.05); out.push('visuale mirando a 12 caselle: zoom ' + G.vw.z.toFixed(2) + ' spostata ' + G.vw.x.toFixed(1) + ',' + G.vw.y.toFixed(1)); });
  // 2) ariete al portone con due che caricano
  V.push(() => { G.aim = null; for (let i = 0; i < 80; i++) G.vw = AS.viewTick(G, 0.05); out.push('lasciato: zoom ' + G.vw.z.toFixed(2)); G.me.t = G.a0; G.me.cls = 'g'; const B = G.chars.filter(c => c !== G.me && c.t === G.a0)[0]; if (B) Object.assign(B, { alive: true, x: 30.4, y: yb2 + 0.4, cls: 'n', rc: G.time - 1.0, dn: 0, path: [] }); cq.x = G.me.x = 28.6; cq.y = G.me.y = yb2 + 0.35; G.me.rc = G.time - 0.6; G.rm.pl = 0.7; G.rm.y = 53.4; });
  // 3) mirando lontano verso destra (il caso peggiore sullo schermo stretto)
  V.push(() => { G.me.rc = 0; G.me.t = 1 - G.a0; G.me.cls = 'a'; cq.x = G.me.x = 12.5; cq.y = G.me.y = 50.5; G.aim = { ok: true, x: 21.5, y: 42.5, d: 12, tg: true }; for (let i = 0; i < 60; i++) G.vw = AS.viewTick(G, 0.05); out.push('mirando a destra: zoom ' + G.vw.z.toFixed(2)); });
  const o = document.createElement('canvas'); o.width = cw * V.length; o.height = ch; const g = o.getContext('2d');
  for (let i = 0; i < V.length; i++) { V[i](); AS.syncMap(G); G.zn = null; G.time += 0.02; cqHudFast(); cqDraw(); g.drawImage(cv, i * cw, 0, cw, ch); g.fillStyle = '#ff0'; g.font = '700 16px system-ui'; g.fillText((i + 1) + ')', i * cw + 8, 20); }
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return { img: o.toDataURL('image/jpeg', 0.8), out: out.join('\n') };
})()
