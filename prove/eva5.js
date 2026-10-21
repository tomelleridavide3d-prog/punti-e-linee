// Evasione passo 3: le vie di fuga (tunnel, divisa, camion, corda), la fuga scoperta, i compagni del computer che seguono, la vittoria. uso: node prove/cdp.mjs . prove/eva5.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  $('#lbGo').click(); await w(3500);
  const G = cq.g, M = CQ_MAP, E = window.__ev, me = G.me, DAY = 250; G.pre = 0;
  const last = (n = 1) => __T.slice(-n).join(' / ');
  const setT = t => { G.time = t; G.pc = E.cyc(G); };
  const park = () => G.gd.forEach((g, i) => { g.x = 108 + 56 + i; g.y = 59.5; g.st = 'pat'; g.path = []; g.wait = 1e9; g.sus = 0; });
  const btn = () => { const a = E.action(G, me); return a ? a.t + (a.on ? '' : ' (spento)') : '-'; };
  const act = async () => { G.M.act(G); await w(150); };
  const C = M.cells[me.cell], mate = G.chars.find(c => c !== me && c.cell === me.cell);
  out.push('io N°' + me.no + ' cella ' + C.n + ', compagno ' + (mate ? mate.name + (mate.bot ? ' (computer, segue ' + (mate.ld === me.id ? 'me' : 'altri') + ')' : '') : 'nessuno'));
  // posti delle vie di fuga liberi
  const fr = (x, y) => cqCellFree(Math.floor(x), Math.floor(y));
  out.push('posti: buco ' + fr(...C.hole) + ' uscita ' + C.exit.map(v => v.toFixed(1)) + ' porta camion ' + fr(...E.DOORP) + ' officina ' + fr(...E.MDP) + ' cancello ' + fr(...E.GATEP) + ' · percorsi al camion: dal corridoio ' + E.route(50, 50, E.DOORP[0], E.DOORP[1]).length + ' (dal magazzino), da officina con la porta aperta ' + (cqSolid[40][72] = cqSolid[41][72] = null, E.route(60, 40, E.DOORP[0], E.DOORP[1]).length));
  park();
  // 1) TUNNEL: di notte col cucchiaio
  setT(170); await w(300); cq.x = C.hole[0]; cq.y = C.hole[1]; for (const c of G.chars) if (c.bot) { const q = M.cells[c.cell].sp[c.slot]; c.x = q[0]; c.y = q[1]; c.path = []; c.ric = 0; } me.ric = 0; G.alE = 0; await w(200);
  out.push('al buco senza cucchiaio: ' + btn());
  me.pk = ['cu']; await w(100); out.push('col cucchiaio: ' + btn()); await act(); await w(3000);
  out.push('dopo 3 s: tunnel ' + (G.tun[me.cell] * 50).toFixed(0) + '% · scavo ' + me.dg + ' · ' + btn());
  G.tun[me.cell] = 0.97; G.digS[me.cell] = 8.5; await w(1500);
  out.push('fine del pezzo: tunnel ' + (G.tun[me.cell] * 50).toFixed(0) + '% terra ' + G.dirt[me.cell] + ' · ' + last() + ' · ' + btn());
  // visto scavare: il secondino davanti alle sbarre
  G.tun[me.cell] = 0.5; G.tun0[me.cell] = 0.25; G.dirt[me.cell] = 0; me.pk = ['cu']; await w(100); await act();
  const gb = G.gd.find(g => g.route === M.routes.braccio.route), by = C.y0 === 9 ? 15.0 : 24.0; gb.x = C.hole[0] + 0.5; gb.y = by; gb.a = Math.atan2(C.hole[1] - by, -0.5); gb.route = [[gb.x, gb.y, 99, gb.a]]; gb.ri = 0; gb.wait = 99; gb.st = 'pat';
  await w(1200); out.push('visto scavare: tunnel ' + (G.tun[me.cell] * 50).toFixed(0) + '% · tasca [' + me.pk + '] · ' + last());
  park(); gb.route = M.routes.braccio.route;
  // 2) TERRA: di giorno nell'orto; la perquisizione che trova i sacchi mura il tunnel
  setT(DAY + 40); G.alE = 0; me.ric = 0; G.dirt[me.cell] = 2; G.tun[me.cell] = 1; G.seal[me.cell] = 0; await w(300); cq.x = C.hole[0]; cq.y = C.hole[1]; me.pk = []; await w(200);
  out.push('di giorno al buco: ' + btn()); await act(); out.push('tasca [' + me.pk + '] terra in cella ' + G.dirt[me.cell]);
  cq.x = 14.5; cq.y = 60.2; await w(200); out.push('nell\'orto: ' + btn()); await act(); out.push('tasca [' + me.pk + '] · ' + last());
  window.__ev.stashChecked(G, C.st); await w(200); out.push('perquisizione con 1 sacco: murato ' + G.seal[me.cell] + ' · ' + last());
  // 3) TUNNEL FINITO: scappo e il compagno del computer viene con me
  G.seal[me.cell] = 0; G.tun[me.cell] = 2; G.dirt[me.cell] = 0; setT(DAY + 175); await w(300); for (const c of G.chars) if (c.bot) { const q = M.cells[c.cell].sp[c.slot]; c.x = q[0]; c.y = q[1]; c.path = []; } cq.x = C.hole[0]; cq.y = C.hole[1]; await w(300);
  out.push('tunnel finito: ' + btn()); await act(); await w(300);
  out.push('fuori: io ' + me.out + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + (mate ? ' · compagno ' + (mate.out || 'dentro') : '') + ' · ' + last(2));
  // la fuga si scopre al controllo delle celle: tunnel murato
  E.ncStart(G); gb.x = 12.5; gb.y = 20.5; gb.st = 'pat'; gb.path = []; gb.wait = 0; for (let i = 0; i < 40 && G.nc; i++) await w(500);
  out.push('controllo dopo la fuga: murato ' + G.seal[me.cell] + ' · allerta ' + (G.alE > G.time) + ' · ' + __T.filter(t => /EVASIONE|murato/.test(t)).slice(-2).join(' / '));
  // 4) DIVISA: rimetto tutti dentro
  for (const c of G.chars) { c.out = ''; c.seen = 0; } park(); setT(60); G.alE = 0; await w(300); me.ric = 0;
  cq.x = 49.5; cq.y = 40.5; me.pk = ['di', 'te']; await w(200); out.push('con la divisa in tasca: ' + btn()); await act(); out.push('travestito ' + me.dv + ' · fuori posto in sala guardie lontano dalle guardie: ' + (cq.x = 58.5, cq.y = 54.5, await w(200), E.illegal(G, me)));
  const g2 = G.gd.find(g => !g.post); g2.x = 59.5; g2.y = 54.5; await w(200); out.push('con una guardia a 1 casella: fuori posto ' + E.illegal(G, me)); park(); me.ric = 0; G.gd.forEach(g => g.st = 'pat'); await w(200);
  const esc = G.chars.find(c => c.bot && c !== mate) || mate; esc.x = 71.5; esc.y = 65.2; esc.path = []; cq.x = 71.5; cq.y = 66.2; await w(300);
  out.push('al cancello: ' + btn()); await act(); await w(300); out.push('io ' + me.out + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' · scortato ' + esc.name + ': ' + (esc.out || 'no') + ' · ' + last());
  // 5) CAMION
  for (const c of G.chars) { c.out = ''; c.seen = 0; c.dv = 0; } park(); setT(60); await w(300);
  G.camL = []; G.cam = { T: G.time + 6, st: 0 }; cq.x = 70.8; cq.y = 40.9; me.pk = ['ca']; await w(300);
  out.push('porta del carico: ' + btn()); await act(); out.push('porta aperta ' + G.mdO + ' · casella libera ' + !cqSolid[40][72]);
  await w(6500); const cp = E.camPh(G); out.push('camion: fase ' + cp.ph + ' · caselle occupate ' + !!cqSolid[40][87] + ' · serranda chiusa ' + !!cqSolid[40][91]);
  park(); cq.x = E.DOORP[0] - 0.3; cq.y = E.DOORP[1]; if (mate) { mate.x = E.DOORP[0] - 1.2; mate.y = E.DOORP[1] + 0.6; mate.path = []; } await w(300);
  out.push('dietro al camion: ' + btn()); await act(); out.push('nel camion ' + me.inT + (mate ? ' · compagno ' + mate.inT : ''));
  const rr = Math.random; G.cam.chk = 1; G.cam.T = G.time - 26 + 1; await w(6000); Math.random = rr;
  out.push('dopo la partenza: io ' + me.out + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + (mate ? ' · compagno ' + (mate.out || 'dentro') : '') + ' · ' + last(2));
  // 6) CORDA e RETE: io fuori col lenzuolo, poi un compagno dentro
  for (const c of G.chars) { c.out = ''; c.seen = 0; c.inT = 0; } park(); setT(60); await w(300);
  cq.x = 9.4; cq.y = 45.5; await w(200); out.push('accanto alla rete: ' + btn()); await act(); await w(200); out.push('dopo: io a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (fascia di ronda: fuori posto ' + E.illegal(G, me) + ')');
  E.escapeC(G, me, 'tun', 30.5, 3.4, { nf: 1 }); await w(300); me.pk = ['le']; cq.x = 30.5; cq.y = 3.4; await w(200);
  out.push('fuori al muro col lenzuolo: ' + btn()); await act(); out.push('corde ' + G.rope.length + (G.rope[0] ? ' dentro a ' + G.rope[0].ix.toFixed(1) + ',' + G.rope[0].iy.toFixed(1) : ''));
  const cl = G.chars.find(c => c.bot); cl.x = G.rope[0].ix; cl.y = G.rope[0].iy + 0.3; cl.path = []; window.__ev.doAct(G, cl, { k: 'climbR' }); await w(3200);
  out.push('il computer si arrampica: ' + (cl.out || 'dentro') + ' a ' + cl.x.toFixed(1) + ',' + cl.y.toFixed(1));
  // 7) VITTORIA
  for (const c of G.chars) if (!c.out) E.escapeC(G, c, 'cam', 88, 74.5, { nf: 1 }); await w(800);
  out.push('fine: ' + G.phase + ' · ' + $('#tkTitle').textContent + ' · ' + $('#tkBody').textContent.slice(0, 260));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return out.join('\n');
})()
