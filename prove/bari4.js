// Duello all'alba dei bari: i TUFFI (dentro la campana salvano, fuori sono sprecati, il computer vede il tuffo e tiene il colpo, il computer si tuffa)
// uso: node prove/cdp.mjs . prove/bari4.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzBaProva'; store.settings.sound = false; saveStore();
  try { localStorage.setItem('bariHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzBaProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=bari]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, B = window.__bari, M = G.M; if (!G || G.mode !== 'bari') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.pre <= 0 && G.phase === 'play') M.local(G, dt); };
  const bot = G.chars.find(c => c.bot);
  const toDuel = () => { for (let i = 0; i < 3000 && !(G.st && G.st.ph === 'duel'); i++) { step(0.05); if (G.st && G.st.ph === 'load' && !B.U2.rdy && G.time - G.st.t0 > 0.5) { B.U2.d = [0, 0, 0, 1, 1, 1]; B.setReady(G, true); } } };
  const toWin = () => { for (let i = 0; i < 400 && B.winOpen(G, G.time) < 0; i++) step(0.02); };
  const sh = () => G.st.sh.map(e => e[2] + ':' + e[3]).join(',');
  toDuel(); G.drum[bot.id] = [1, 1, 1, 0, 0, 0]; bot.path = []; bot.x = 17.9; bot.y = 8; cq.x = 8.1; cq.y = 8;
  // 1) tuffo prima della campana = sprecato
  for (let i = 0; i < 30; i++) step(0.05); G.st.bt = Math.max(G.st.bt, G.time + 3); G.st.fa = [];
  B.U2.dvT = 0; B.myDive(G); step(0.02);
  out.push('tuffo prima della campana: tuffi ' + B.PS(G, G.me).dv + ', spari ' + sh() + ', fermo ' + (M.speed(G.me) === 0));
  for (let i = 0; i < 30; i++) step(0.05);
  // 2) al DONG mi tuffo subito: lo Sceriffo vede il tuffo e tiene il colpo (o se ha gia' sparato: schivato)
  bot.hold = 0; G.st.bt = Math.max(G.st.bt, G.time + 0.3); toWin(); step(0.02); B.U2.dvT = 0; B.myDive(G);
  for (let i = 0; i < 100; i++) { step(0.02); cq.x = 8.1; cq.y = 8; }
  out.push('tuffo al DONG: tuffi ' + B.PS(G, G.me).dv + ', vivo ' + !B.PS(G, G.me).d + ', colpi dello Sceriffo ' + B.fired(G, bot) + ', spari ' + sh());
  // 3) tuffo dopo che ha gia' sparato: troppo tardi (si prova 20 volte con lo Sceriffo che spara presto)
  let late = 0, dodge = 0, n3 = 0;
  for (let r = 0; r < 20; r++) {
    G.st.ph = 'duel'; const p = B.PS(G, G.me); p.d = 0; p.dv = 2; p.su = 0; p.sm = 0; p.nf = -1; B.PS(G, bot).sm = 0; B.PS(G, bot).f = []; B.PS(G, bot).dv = 0;
    G.drum[bot.id] = [1, 1, 1, 0, 0, 0]; G.st.bk++; G.st.bt = G.time + 0.2; G.st.fa = []; bot.x = 17.9; bot.y = 8; bot.path = []; bot.hold = 1; toWin(); bot.hold = 0;
    const k = G.st.bk, rtB = 0.2 + Math.random() * 0.6, rtMe = 0.1 + Math.random() * 0.8; G.acts[bot.id] = { a: 's', rt: rtB, h: 1 }; let did = false;
    for (let i = 0; i < 100 && G.st.ph === 'duel'; i++) { if (!did && G.time - G.st.bt >= rtMe) { did = true; G.acts[G.me.id] = { a: 'd', rt: rtMe }; } step(0.02); cq.x = 8.1; cq.y = 8; }
    n3++; const e = G.st.sh.slice(-2).map(e => e[3]).join(','); if (rtMe < rtB) { if (!B.PS(G, G.me).d) dodge++; } else if (B.PS(G, G.me).d) late++;
    if (G.st.ph !== 'duel') { G.st.ph = 'duel'; }
  }
  out.push('tuffo prima dello sparo = salvo: ' + dodge + ' / tuffo dopo lo sparo = preso: ' + late + ' (su ' + n3 + ' prove)');
  // 4) quanto si tuffa lo Sceriffo (io allo scoperto con colpi veri in canna)
  G.st.cv = []; bot.x = 17.9; bot.y = 8; cq.x = 8.1; cq.y = 8; G.st.ph = 'duel';
  let dives = 0, acts = 0;
  for (let r = 0; r < 200; r++) { B.PS(G, bot).dv = 2; B.PS(G, bot).su = 0; B.PS(G, bot).nf = -1; B.PS(G, G.me).f = []; B.PS(G, G.me).d = 0; B.PS(G, G.me).su = 0; B.PS(G, G.me).nf = -1; const a = B.botAct(G, bot, G.st.bk); acts++; if (a.a === 'd') dives++; }
  out.push('lo Sceriffo si tuffa ' + Math.round(dives / acts * 100) + '% dei rintocchi (io scoperto, nessuna informazione)');
  for (let r = 0; r < 200; r++) { B.PS(G, G.me).f = ['b', 'b', 'b']; }   // gli ho mostrato 3 salve: ora ho solo veri
  dives = 0; for (let r = 0; r < 200; r++) { B.PS(G, bot).dv = 2; const a = B.botAct(G, bot, G.st.bk); if (a.a === 'd') dives++; }
  out.push('... dopo che gli ho mostrato 3 salve (ora ho solo veri): ' + Math.round(dives / 2) + '%');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return out.join('\n');
})()
