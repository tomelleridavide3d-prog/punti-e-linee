// Duello degli alchimisti: GIOCABILITA' (anteprima al calderone, reazioni segrete, ampolle contate con riserva, ricarica delle tue pozioni, COMBO, computer paziente).
// uso: node prove/cdp.mjs . prove/alc8.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot), B = A.book(), own0 = B.own;
  step(0.2);
  // 1) PREPARAZIONE: tempo e anteprima
  out.push('1) tempo di preparazione: ' + $('#alTm').textContent + ' (prima manche)');
  const prev = ids => { A.U2.pot = []; ids.forEach(id => A.addIng(G, id)); const t = (document.querySelector('#alPot .pv') || {}).textContent || 'NIENTE'; A.U2.pot = []; return t; };
  B.own = 0;
  out.push('   🌶️ da solo: ' + prev(['f']));
  out.push('   🌶️⏳ peperoncino + sabbia: ' + prev(['f', 's']));
  out.push('   🌶️❄️ (reagiscono) senza ricettario: ' + prev(['f', 'i']));
  B.own = 1; out.push('   🌶️❄️ col ricettario: ' + prev(['f', 'i'])); B.own = own0;
  out.push('   barattolo: ' + document.querySelector('#alJars [data-i="r"]').textContent);
  // 2) duello: ampolle contate, ricarica delle MIE pozioni
  step(3.5); G.me.belt = ['r', 'f', 'fs', 'v']; A.setReady(G, true); step(0.3);
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; bot.hold = 1; bot.path = []; G.st.t0 = G.time; };
  fresh();
  out.push('2) duello: fase ' + G.st.ph + ', cintura ' + G.me.belt.join(',') + ', riserva ' + G.me.rf + ', computer riserva ' + bot.rf + ', cintura computer ' + bot.belt.map(k => A.brew(k).n).join(' | '));
  for (let i = 0; i < 4; i++) { G.sel = i; G.me.thT = 0; A.myThrow(G, cq.x + 3, cq.y); }
  out.push('   lanciate tutte: cintura ' + G.me.belt.map(k => k || '-').join(','));
  const [kx, ky] = A.KETTLE[0]; cq.x = kx + 0.5; cq.y = ky + 1.3; step(0.1);
  out.push('   al calderone: pulsante "' + (M.btn(G) || {}).t + '"'); M.act(G); step(2.6);
  out.push('   dopo 2,6 s: cintura ' + G.me.belt.map(k => k || '-').join(',') + ', riserva ' + G.me.rf + ', scritta "' + M.big(G) + '"');
  step(8); out.push('   dopo altri 8 s: cintura ' + G.me.belt.map(k => k || '-').join(',') + ', riserva ' + G.me.rf + ', ricarico ancora ' + !!G.fill);
  for (let i = 0; i < 4; i++) G.me.belt[i] = ''; G.me.rf = 0; G.me.rfT = G.time; step(0.1);
  out.push('   riserva vuota: pulsante "' + (M.btn(G) || {}).t + '"'); step(20.2); out.push('   dopo 20 s: riserva ' + G.me.rf + ', pulsante "' + (M.btn(G) || {}).t + '"');
  // 3) COMBO: incollato prima, poi fuoco = -2; colla+fuoco nella stessa pozione = -1
  fresh(); cq.x = 6.5; cq.y = 14.5; bot.x = 12.5; bot.y = 8.5;
  A.burst(G, 'r', bot.x, bot.y, G.me.id); step(0.6); out.push('3) colla sul computer: bloccato ' + A.blocked(G, bot) + ', cuori ' + bot.hp);
  G.zn = []; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(0.1); out.push('   poi fuoco: cuori ' + bot.hp + ' | avviso: ' + (toasts.filter(t => /COMBO/.test(t)).pop() || 'NO'));
  fresh(); bot.x = 12.5; bot.y = 8.5; A.burst(G, 'fr', bot.x, bot.y, G.me.id); step(0.1); out.push('   colla+fuoco insieme in una pozione: cuori ' + bot.hp + ' (deve essere 2)');
  fresh(); bot.x = 12.5; bot.y = 8.5; A.burst(G, 'i', bot.x, bot.y, G.me.id); step(0.5); G.zn = []; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(0.1); out.push('   gelo (rallenta) poi fuoco: cuori ' + bot.hp);
  // 4) etichetta dell'ampolla in mano nel duello
  fresh(); G.me.belt = ['f', 'fi', '', '']; G.sel = 0; G.me.thT = 0; step(0.1); const nm = () => document.getElementById('alNm').textContent;
  out.push('4) etichetta: ' + nm()); A.burst(G, 'r', bot.x, bot.y, G.me.id); step(0.4); out.push('   computer incollato: ' + nm() + ' | rossa ' + document.getElementById('alNm').classList.contains('cb'));
  G.sel = 1; B.own = 0; step(0.1); out.push('   ampolla nata da reazione: ' + nm()); B.own = own0;
  // 5) il computer: quante ampolle lancia in 40 s e quante combo mi fa (io fermo al centro della mia meta')
  fresh(); bot.hold = 0; bot.belt = A.cpuBelt(G); A.duelArm(G, bot); const belt0 = bot.belt.map(k => A.brew(k).n).join(' | ');
  let thr = 0, combos = 0, lost = 0; const n0 = G.flN, h0 = G.hxN;
  for (let i = 0; i < 40 / 0.05; i++) { cq.x = 7.5; cq.y = 13.5; G.st.t0 = G.time; const hp = G.me.hp; step(0.05); if (G.me.hp < hp) lost += hp - G.me.hp; G.me.hp = 3; G.me.iv = 0; }
  thr = G.flN - n0; combos = G.hx.filter(h => h[0] > h0 && h[3] === 'combo').length;
  out.push('5) computer in 40 s: cintura ' + belt0 + ' | lanci ' + thr + ', cuori tolti ' + lost + ', combo ' + combos + ', riserva rimasta ' + bot.rf);
  const blk = []; for (let i = 0; i < 6; i++) { const b = A.cpuBelt(G); blk.push(b.some(k => A.stops(A.brew(k))) ? 'si' : 'NO'); } out.push('   cinture del computer con qualcosa che blocca: ' + blk.join(' '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
