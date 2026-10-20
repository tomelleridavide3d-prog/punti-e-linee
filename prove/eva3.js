// Evasione passo 2: refurtiva, nascondigli, perquisizioni, appello con le tasche, controllo notturno e fantoccio. uso: node prove/cdp.mjs . prove/eva3.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  $('#lbGo').click(); await w(3000);
  const G = cq.g, M = CQ_MAP, E = window.__ev, me = G.me; G.pre = 0; G.time = 40; G.pc = 40; await w(300);
  const last = () => __T.slice(-1)[0] || '';
  // 1) posti: attrezzi e nascondigli su caselle libere e raggiungibili
  const bad = [], sx0 = cq.x, sy0 = cq.y; out.push('io a ' + sx0.toFixed(1) + ',' + sy0.toFixed(1) + ' prova percorso ' + E.route(sx0, sy0, 50, 30).length + ' / cqPath ' + cqPath(sx0, sy0, 50, 30).length);
  for (const s of E.SRC) if (!cqCellFree(Math.floor(s.x), Math.floor(s.y)) || !E.route(sx0, sy0, s.x, s.y).length) bad.push('attrezzo ' + s.k);
  M.stash.forEach((h, i) => { if (!cqCellFree(h.x, h.y)) bad.push('nascondiglio ' + i + ' ' + h.n + ' non libero'); else if (!E.route(sx0, sy0, h.x + 0.5, h.y + 0.5).length && h.cell !== 2) bad.push('nascondiglio irraggiungibile ' + h.n); });
  out.push('posti: ' + (bad.length ? bad.join(' | ') : 'tutti liberi e raggiungibili (' + E.SRC.length + ' attrezzi, ' + M.stash.length + ' nascondigli)'));
  // le guardie lontane (ferme al primo piano), tutto di giorno
  const park = () => G.gd.forEach((g, i) => { g.x = 108 + 56 + i; g.y = 59.5; g.st = 'pat'; g.path = []; g.wait = 1e9; g.sus = 0; });
  park(); G.time = 40; G.pc = 40; G.alE = 0; await w(200);
  // 2) rubo il cucchiaio senza testimoni
  cq.x = 68.5; cq.y = 12.5; await w(150);
  let a = E.action(G, me); out.push('pulsante in mensa: ' + (a && a.t));
  G.M.act(G); await w(100); out.push('in tasca: ' + me.pk.join(',') + ' · ricercato ' + (me.ric > G.time) + ' · messaggio: ' + last());
  // 3) rubo gli stracci con una guardia che guarda: ricercato e inseguito
  cq.x = 78.5; cq.y = 28.5; const g0 = G.gd[0], r0 = g0.route; g0.x = 78.5; g0.y = 25.0; g0.a = Math.PI / 2; g0.route = [[78.5, 25.0, 99, Math.PI / 2]]; g0.ri = 0; g0.wait = 99; await w(150);
  a = E.action(G, me); out.push('pulsante in lavanderia con la guardia: ' + (a && a.t));
  G.M.act(G); await w(150); out.push('in tasca: ' + me.pk.join(',') + ' · ricercato ' + (me.ric > G.time) + ' · guardia ' + g0.st + ' · ' + last());
  me.ric = 0; g0.route = r0; g0.ri = 0; park(); G.alE = 0; await w(300);
  // tasche piene
  cq.x = 56.5; cq.y = 35.5; await w(150); a = E.action(G, me); out.push('tasche piene in officina: ' + (a && a.t + ' (attivo ' + a.on + ')'));
  // 4) nascondo nella piastrella della mia cella, poi riprendo
  const myC = M.cells[me.cell], h = myC.st, S = M.stash[h];
  cq.x = S.x + 0.5; cq.y = S.y + 0.5; await w(150); a = E.action(G, me); out.push('nella mia cella ' + myC.n + ': ' + (a && a.t));
  G.M.act(G); await w(100); out.push('pannello aperto: ' + !$('#evSt').hidden + ' · ' + $('#evSt').textContent.slice(0, 80));
  $('#evSt button[data-a=put]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await w(100);
  $('#evSt button[data-a=put]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await w(100);
  out.push('dopo nascondi x2: tasca [' + me.pk.join(',') + '] piastrella [' + G.st[h].join(',') + ']');
  $('#evSt button[data-a=take]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); await w(100);
  out.push('dopo prendi: tasca [' + me.pk.join(',') + '] piastrella [' + G.st[h].join(',') + ']');
  cq.x = myC.sp[me.slot][0]; cq.y = myC.sp[me.slot][1]; await w(150); out.push('pannello chiuso allontanandomi: ' + $('#evSt').hidden);
  // 5) fantoccio (ho gli stracci?) : prendo gli stracci dalla piastrella se servono
  if (!me.pk.includes('st')) { G.st[h].splice(G.st[h].indexOf('st'), 1); me.pk.push('st'); }
  a = E.action(G, me); out.push('in cella con gli stracci: ' + (a && a.t)); G.M.act(G); await w(300);
  out.push('fantoccio ' + me.dm + ' · tasca [' + me.pk.join(',') + '] · branda ridisegnata ' + JSON.stringify((cqSolid[myC.y0 === 9 ? 10 : 30][myC.x0].o || {}).dm));
  // 6) PERQUISIZIONE della mia cella: la guardia del braccio arriva, trova la piastrella
  G.st[h] = ['cu', 'le']; G.gd.forEach(g => { g.wait = 0; }); const gb = G.gd.find(g => g.route === M.routes.braccio.route); gb.x = 30.5; gb.y = 20.5; gb.st = 'pat'; gb.path = [];
  cq.x = 40.5; cq.y = 44.5;   // io in cortile
  G.psL = []; E.psStart(G, G.time + 1); out.push('annuncio: ' + last());
  // la cella giusta? forzo la mia
  G.ps.k = me.cell; G.ps.h = h;
  for (let i = 0; i < 40 && G.ps && G.ps.st < 2; i++) await w(500);
  out.push('perquisizione: ' + (G.ps ? 'stato ' + G.ps.st : 'finita') + ' · piastrella [' + G.st[h].join(',') + '] · ' + __T.slice(-2).join(' / ') + ' · fumetto: ' + (gb.bub && gb.bub.t));
  // 7) APPELLO: chi ha roba in tasca rischia (forzo la sorte)
  park(); me.pk = ['te']; G.time = 26.5; G.pc = 26.5; const s = M.spots[me.no - 1]; cq.x = s[0]; cq.y = s[1];
  for (const c of G.chars) if (c.bot) { const q = M.spots[c.no - 1]; c.x = q[0]; c.y = q[1]; c.path = []; }
  const rr = Math.random; Math.random = () => 0.01; await w(2600); Math.random = rr;
  out.push('appello: tasca [' + me.pk.join(',') + '] · ' + __T.slice(-3).join(' / '));
  // 8) NOTTE: controllo delle celle; io fuori cella col fantoccio -> inganna; poi con l'allerta -> scoperto
  park(); G.gd.forEach(g => { g.wait = 0; }); const gb2 = G.gd.find(g => g.route === M.routes.braccio.route); gb2.x = 12.5; gb2.y = 20.5; gb2.st = 'pat'; gb2.path = []; gb2.wait = 0;
  G.time = 188; G.pc = 188; await w(400); cq.x = 82.5; cq.y = 15.5;   // in cucina, lontano
  for (const g of G.gd) if (g !== gb2) { g.x = 108 + 56 + g.id; g.y = 59.5; g.wait = 1e9; }
  for (const c of G.chars) if (c.bot) { const q = M.cells[c.cell].sp[c.slot]; c.x = q[0]; c.y = q[1]; c.path = []; c.ric = 0; }
  await w(300); me.dm = 1; G.alE = 0; me.ric = 0; E.ncStart(G);
  for (let i = 0; i < 40 && G.nc; i++) await w(500);
  out.push('controllo 1: fantoccio ' + me.dm + ' · ricercato ' + (me.ric > G.time) + ' · ' + __T.filter(t => /fantoccio|letto vuoto|secondino/.test(t)).slice(-2).join(' / '));
  me.ric = 0; G.alE = G.time + 999; gb2.x = 12.5; gb2.y = 20.5; gb2.st = 'pat'; gb2.path = []; E.ncStart(G);
  for (let i = 0; i < 40 && G.nc; i++) await w(500);
  out.push('controllo 2 con allerta: fantoccio ' + me.dm + ' · ricercato ' + (me.ric > G.time) + ' · ' + __T.slice(-1)[0]);
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return out.join('\n');
})()
