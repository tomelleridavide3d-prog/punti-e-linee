// Duello degli alchimisti, passo 3: lancio, effetti (fuoco, cristallo, vento nella voragine, muro), miccia corta, specchio, ricarica,
// computer che combatte, manche fino alla fine. uso: node prove/cdp.mjs . prove/alc3.js [foto.png] (foto: un duello con pozze e un'ampolla in volo)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf);
  const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot);
  step(3.5);   // pronti
  G.me.belt = ['f', 'ir', 'v', 'fs']; A.setReady(G, true); step(0.2);
  out.push('fase ' + G.st.ph + ' | pulsanti: fionda ' + !!document.getElementById('alTh') + ', cintura ' + !!document.getElementById('alSel'));
  const freeze = () => { bot.think = 1e9; bot.aimT = 1e9; bot.path = []; };
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; } G.zn = []; G.me.thT = 0; };
  const place = (c, x, y) => { if (c === G.me) { cq.x = x; cq.y = y; } else { c.x = x; c.y = y; c.path = []; } };
  freeze();
  // 1) fuoco addosso al computer
  place(G.me, 6.5, 13.5); place(bot, 8.5, 15.5); G.sel = 0;
  A.myThrow(G, bot.x, bot.y); out.push('ampolle in volo: ' + G.fl.length); step(1.2); freeze();
  out.push('1) 🔥 sul computer: cuori ' + bot.hp + ', pozze ' + G.zn.map(z => z.k).join(',') + ' | scritte: ' + G.bx.map(b => b[1]).join(','));
  // 2) cristallo (ghiaccio + resina): congelato
  G.me.thT = 0; G.sel = 1; place(bot, 14.5, 9.5); place(G.me, 13.5, 13.5); A.myThrow(G, bot.x, bot.y); step(1.2); freeze();
  out.push('2) 🧊 cristallo: congelato ' + !!(bot.fx.frz > G.time) + ' per ' + (bot.fx.frz - G.time).toFixed(1) + ' s, velocita\' ' + M.speed(bot).toFixed(2) + ' (lui la usa da cqModeStep)');
  // 3) vento: lo spingo nella voragine
  fresh(); G.sel = 2; place(bot, 10.5, 7.6); place(G.me, 10.5, 3.2); const hp3 = bot.hp;
  A.myThrow(G, 10.5, 7.0); step(1.6); freeze();
  out.push('3) 🦅 vento: cuori ' + hp3 + ' -> ' + bot.hp + ', stati ' + JSON.stringify(bot.fx) + ', dove ' + bot.x.toFixed(1) + ',' + bot.y.toFixed(1) + ' | dopo 2 s: ' + (step(2.2), bot.x.toFixed(1) + ',' + bot.y.toFixed(1)));
  // 4) fuoco + sabbia del tempo: lanciato lontano scoppia vicino a me
  fresh(); G.sel = 3; place(G.me, 4.5, 10.5); place(bot, 16.5, 10.5); const n0 = G.bx.length ? G.bx[G.bx.length - 1][0] : 0; A.myThrow(G, 13.5, 10.5); step(2.5); freeze();
  const b4 = G.bx.find(b => b[0] > n0); out.push('4) 🌶️⏳ Fuoco lento lanciato a 9 caselle: scoppiato a ' + (b4 ? Math.hypot(b4[2] - 4.5, b4[3] - 10.5).toFixed(1) + ' caselle (' + (b4[5] || 'arrivato') + ')' : 'NIENTE') + ', miei cuori ' + G.me.hp);
  // 5) specchio: il computer ha uno specchio davanti, la mia pozione torna indietro
  fresh(); place(G.me, 5.5, 12.5); place(bot, 12.5, 15.5); A.burst(G, 'm', 9.5, 14.0, bot.id); G.me.belt[0] = 'f'; G.sel = 0; G.me.thT = 0;
  A.myThrow(G, 12.5, 15.5); step(2.6); freeze();
  out.push('5) 🪞 specchio: rimandata ' + G.bx.some(b => b[5] === 'mirror') + ', miei cuori ' + G.me.hp + ', suoi ' + bot.hp);
  // 6) sbattere contro il muro
  fresh(); const hp6 = bot.hp; place(bot, 3.2, 10.5); A.burst(G, 'vv', 5.0, 10.5, G.me.id); step(1); freeze();
  out.push('6) 💫 spinto contro il muro: cuori ' + hp6 + ' -> ' + bot.hp + ', incollato un attimo ' + !!(bot.fx.stuck));
  // 7) ricarica al mio calderone
  fresh(); G.me.belt = ['', '', '', '']; place(G.me, 6.5, 7.5); const b7 = M.btn(G); M.act(G); step(2.3);
  out.push('7) 🫕 vicino al calderone: pulsante "' + (b7 ? b7.t : 'NESSUNO') + '" -> cintura ' + G.me.belt.map(k => k ? A.brew(k).n : '-').join(' | '));
  // 8) il computer combatte da solo per 40 s contro di me fermo
  fresh(); place(G.me, 13.5, 13.5); bot.think = 0; bot.aimT = 0; G.st.t0 = G.time; G.me.belt = ['', '', '', ''];
  let thr = 0; const fl0 = G.flN; const hpLog = [];
  for (let i = 0; i < 40; i++) { step(1); hpLog.push(G.me.hp); if (G.me.hp <= 1) { G.me.hp = 3; } if (bot.hp <= 1) bot.hp = 3; if (G.st.ph !== 'duel') break; }
  out.push('8) computer in 40 s: lanci ' + (G.flN - fl0) + ', cuori miei nel tempo ' + hpLog.join('') + ', cintura ora ' + bot.belt.map(k => k || '-').join(','));
  // 9) manche: mi tolgo i cuori -> risultato -> manche 2 (preparazione 30 s)
  G.me.iv = 0; G.me.hp = 1; A.burst(G, 'f', cq.x, cq.y, bot.id); step(0.2);
  out.push('9) manche: ' + G.st.ph + ' | ' + (G.st.msg || '').split('\n').join(' / '));
  step(5.5); out.push('   dopo il risultato: manche ' + G.st.n + ' fase ' + G.st.ph + ', pannello ' + !!document.getElementById('alPrep') + ', cuori ' + G.me.hp + ', cintura vuota ' + G.me.belt.every(v => !v) + ', io nel mio angolo ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1));
  A.setReady(G, true); step(0.3); bot.hp = 1; bot.iv = 0; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(5.6);
  out.push('   manche 2 a me: punteggio ' + JSON.stringify(G.st.sc) + ', fase ' + G.st.ph + ' ' + G.st.n);
  A.setReady(G, true); step(0.3); bot.hp = 1; bot.iv = 0; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(5.6);
  out.push('   fine: ' + G.phase + ' | ' + $('#tkTitle').textContent + ' | ' + $('#tkBody').textContent.slice(0, 80));
  out.push('avvisi: ' + toasts.slice(-4).join(' || '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  // foto: un duello vero (riparto) con pozze e un'ampolla in volo
  if (window.__SHOT) {
    cqCloseTask(); G.phase = 'play'; G.st = { n: 1, ph: 'duel', t0: G.time, rd: {}, sc: {} }; G.me.hp = 3; bot.hp = 2; G.me.fx = {}; bot.fx = { slow: G.time + 9 };
    G.me.belt = ['fs', 'ir', 'v', 'cfo']; G.sel = 0; bot.belt = ['f', 'i', 'w', '']; place(G.me, 7.8, 12.6); place(bot, 13.2, 8.6); freeze();
    G.zn = []; A.burst(G, 'f', 11.6, 6.4, G.me.id); A.burst(G, 'i', 8.8, 15.2, bot.id); A.burst(G, 'c', 14.6, 12.8, bot.id); A.burst(G, 'm', 9.6, 12.2, G.me.id); bot.hp = 2; G.me.hp = 3;
    step(0.6); G.me.thT = 0; G.sel = 1; A.myThrow(G, 12.6, 8.2); step(0.35); G.aim = A.aimFrom(-40, 60);
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame); G.st.t0 = G.time; await w(300); cq.on = false; cancelAnimationFrame(cq.raf); cqDraw();
  }
  return out.join('\n');
})()
