// La casa delle trappole, passo 3: trappole che scattano nel furto (cuori, botola, buccia, rastrello, pianoforte, vernice, porta finta, armatura, cane),
// ritorno al portone a zero cuori, cassaforte "orecchio e manopola" con il premio.
// uso: node prove/cdp.mjs . prove/tr3.js [foto.png]   (con la foto: la cassaforte aperta sopra il furto, con qualche trappola scattata)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=trappole]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(3600);
  const G = cq.g, T = window.__tr, toasts = []; window.cqToast = t => toasts.push(String(t).replace(/<[^>]+>/g, ''));
  T.buildEnd(G);
  // villa del computer fatta apposta: ogni trappola in un posto noto
  const B = { items: [] }, P = (k, x, y) => { const e = T.place(B, k, x, y); if (e) out.push('NON MESSA ' + k + ': ' + e); };
  P('dia', 21, 1);          // in cassaforte (studio)
  P('botola', 16, 23); P('buccia', 13, 25); P('rastrello', 20, 24); P('piano', 19, 25);
  P('vernice', 23, 24);     // porta ingresso-cucina
  P('finta', 10, 25);       // porta ingresso-corridoio
  P('armatura', 13, 10);    // armatura del salone
  { const t = T.target('cane', 26, 26); B.items.push({ k: 'cane', key: t.key, x: t.x, y: t.y, cells: t.cells }); }   // cane in cucina (fuori dalle monete: la villa di prova costa piu' di 100)
  G.vb = B; T.raidStart(G);
  cq.on = false; cancelAnimationFrame(cq.raf);
  const tk = (s, f) => { for (let i = 0; i < s * 20; i++) { if (f) f(i); cqModeTick(0.05); } };
  const st = () => 'cuori ' + G.hp + ' fermo ' + (G.stun > G.time ? 'si' : 'no') + ' pos ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1);
  out.push('furto: ' + G.ph + ' | cani: ' + G.dogs.map(d => (d.armed ? 'vero' : 'finto') + '@' + d.x + ',' + d.y).join(' ') + ' | barra: ' + (G.M.hud(G).replace(/<[^>]+>/g, '')));
  // rastrello
  cq.x = 20.5; cq.y = 24.5; tk(0.1); out.push('rastrello: ' + st() + ' | ' + G.stunT); tk(1.3);
  // pianoforte: ci passo sopra e resto fermo -> preso;
  cq.x = 19.5; cq.y = 25.5; tk(0.8); out.push('pianoforte (fermo sotto): ' + st() + ' | ' + G.stunT); tk(2.2);
  // armatura: le passo accanto
  cq.x = 13.5; cq.y = 11.55; tk(0.1); out.push('armatura: ' + st() + ' | ' + G.stunT); tk(1.2);
  // botola: cado, -1 cuore, a zero cuori -> portone con 3 cuori nuovi
  cq.x = 16.5; cq.y = 23.5; tk(0.1); out.push('botola: ' + st() + ' | nascosto: ' + G.M.hide(G.me)); tk(1.5); out.push('dopo la botola: ' + st() + ' | ' + toasts.slice(-2).join(' / '));
  // vernice: passo dalla porta della cucina
  cq.x = 23.5; cq.y = 24.5; tk(0.1); out.push('vernice: impronte ' + !!G.paint + ' | cuori ' + G.hp);
  for (let i = 0; i < 8; i++) { cq.x = 24.5 + i * 0.4; tk(0.05); } out.push('impronte lasciate: ' + G.steps.length);
  // cane: gli corro vicino -> si sveglia e insegue, morde
  cq.x = 28.5; cq.y = 26.5; G.px = 30; tk(0.05); const dg = G.dogs.find(d => d.armed); out.push('cane: ' + dg.st);
  tk(2.5, () => { cq.x = 28.5; cq.y = 26.5; }); out.push('dopo 2,5 s: cane ' + dg.st + ' | ' + st() + ' | ' + (G.stunT || ''));
  // il cane finto della cucina non si sveglia mai
  out.push('cane della cucina: ' + G.dogs.find(d => !d.armed).st);
  // porta finta: provo a passare -> BONK e poi resta un muro
  await w(10); tk(2.5); cq.x = 11.3; cq.y = 25.5; G.px = cq.x; G.py = cq.y; cq.x = 10.6; cq.wdx = -1; cq.wdy = 0; tk(0.1); out.push('porta finta: ' + st() + ' | ' + G.stunT + ' | ora e\' muro: ' + G.M.blk(G, 10.5, 25.5) + ' | porta vera ancora libera: ' + !G.M.blk(G, 15.5, 20.5));
  tk(1.5);
  // buccia: scivolo
  cq.x = 13.5; cq.y = 25.5; cq.wdx = 0; cq.wdy = -1; const y0 = cq.y; tk(0.1); tk(1); out.push('buccia: scivolato di ' + (y0 - cq.y).toFixed(1) + ' caselle | ' + st());
  tk(2);
  out.push('cuori persi in tutto: ' + G.lost + ' | cuori ora: ' + G.hp);
  // cassaforte: apro, giro la manopola sui 3 numeri
  cq.x = 21.5; cq.y = 2.35; const sn = G.M.spotNear(G); out.push('vicino a: ' + (sn && sn.n) + ' | pulsante: ' + (G.M.btn(G) || {}).t);
  G.M.act(G); await w(50); out.push('cassaforte aperta: ' + !!document.getElementById('trSafe') + ' | numeri ' + G.safe.nums.join(' '));
  if (window.__SHOT !== 'no') { G.safe.fv = G.safe.nums[0] + 0.2; G.safe.val = G.safe.nums[0]; G.safe.hold = 0.2; G.M.over && 0; cq.on = true; cq.raf = requestAnimationFrame(cqFrame); await w(500); return out.join('\n'); }
  for (let n = 0; n < 3; n++) { G.safe.val = G.safe.nums[n]; G.safe.fv = G.safe.nums[n]; tk(0.7); }
  out.push('dopo i 3 numeri: ' + (G.has ? 'diamante preso' : 'NIENTE') + ' | sconto ' + G.bonus + ' s | ' + toasts.slice(-1)[0]);
  cq.x = 16.8; cq.y = 28.6; tk(0.05);
  out.push('fine: ' + (G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, '') : 'NON FINITA'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
