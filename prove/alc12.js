// Duello degli alchimisti: EVENTO A META' DUELLO (fioritura nella serra, mezzanotte nell'orologio, eruzione in cima).
// uso: node prove/cdp.mjs . prove/alc12.js [foto.png]   (foto: le tre scene dell'evento)
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
  const bot = G.chars.find(c => c.bot);
  step(3.5); G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); step(0.3);
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; c.thT = 0; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; bot.hold = 1; bot.path = []; };
  const sts = c => Object.keys(c.fx).filter(k => !k.includes('@') && c.fx[k] > G.time).join(',') || '-';
  out.push('serra: evento ' + JSON.stringify(G.st.ev) + ', tra ' + (G.st.ev.t - G.time).toFixed(0) + ' s');
  // 1) FIORITURA: il computer accanto a una pianta, io lontano
  fresh(); G.st.ev.t = G.time + 5.5; G.st.t0 = G.time - 40; const [px, py] = A.PLANTS[1]; bot.x = px + 1.4; bot.y = py + 0.5; cq.x = 15.5; cq.y = 12.5; G.pl.forEach(p => { p.cd = G.time + 99; });
  step(1); out.push('1) avviso: fase ' + A.evPh(G) + ' | ' + (toasts.filter(t => /fiorire/.test(t)).pop() || 'NO') + ' | pericolo per il computer vicino alla pianta ' + A.hazardAt(G, bot.x, bot.y));
  const bx0 = [bot.x, bot.y]; step(4.6); out.push('   fioritura: fase ' + A.evPh(G) + ' | ' + (toasts.filter(t => /FIORITURA/.test(t)).pop() || 'NO') + ' | computer: stati ' + sts(bot) + ', spostato ' + Math.hypot(bot.x - bx0[0], bot.y - bx0[1]).toFixed(1) + ' | pozze ' + (G.zn.map(z => z.k).join(',') || '-') + ' | io lontano: stati ' + sts(G.me));
  // 2) MEZZANOTTE (sala dell'orologio)
  A.useFloor(1); G.pl = []; fresh(); G.st.ev = { k: 'midnight', t: G.time + 0.1 }; step(0.2);
  out.push('2) mezzanotte: fase ' + A.evPh(G) + ', mia velocita ' + M.speed(G.me).toFixed(2) + ' | ' + (toasts.filter(t => /MEZZANOTTE/.test(t)).pop() || 'NO'));
  cq.x = 6.5; cq.y = 13.5; G.me.belt = ['f', '', '', '']; G.sel = 0; G.me.thT = 0; A.myThrow(G, 12.5, 13.5); const fl = G.fl[G.fl.length - 1]; out.push('   ampolla a 6 caselle: volo ' + fl.d.toFixed(2) + ' s (di solito ' + (6 / A.brew('f').spd).toFixed(2) + '), miccia ' + fl.fz.toFixed(2));
  G.fl = []; const [gx, gy] = A.GEARS[0]; cq.x = gx + 1.2; cq.y = gy; step(1); out.push('   sull\'ingranaggio 1 s: spostato di ' + Math.hypot(cq.x - gx - 1.2, cq.y - gy).toFixed(2) + ' (fermo)');
  step(6.5); out.push('   dopo: fase ' + A.evPh(G) + ', velocita ' + M.speed(G.me).toFixed(2));
  // 3) ERUZIONE (in cima)
  A.useFloor(2); G.pl = []; fresh(); G.st.ev = null; A.burst(G, 'f', 6.5, 14.5, bot.id); const r0 = G.zn[0].r;
  fresh(); G.st.ev = { k: 'surge', t: G.time + 0.1 }; step(0.2); A.burst(G, 'f', 6.5, 14.5, bot.id); const r1 = G.zn[0].r;
  out.push('3) eruzione: fase ' + A.evPh(G) + ', pozza di fuoco larga ' + r0 + ' -> ' + r1 + ' | ' + (toasts.filter(t => /ERUZIONE/.test(t)).pop() || 'NO'));
  fresh(); cq.x = 6.5; cq.y = 14.5; bot.x = 14; bot.y = 13; const b0 = bot.x; A.burst(G, 'v', 13.4, 13, G.me.id); step(1); out.push('   vento durante l\'eruzione: computer spinto di ' + (bot.x - b0).toFixed(1) + ' caselle');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  if (window.__SHOT) {
    cqCloseTask(); G.phase = 'play'; const shots = [];
    for (const [fi, k, dt] of [[0, 'spores', -2], [1, 'midnight', 2], [2, 'surge', 2]]) {
      A.useFloor(fi); A.plantsInit(G); cq.bg = null; fresh(); cq.x = 9; cq.y = 13; bot.x = 12.5; bot.y = 8.5; G.st.ev = { k, t: G.time - dt }; G.time += 0.01; cqDraw(); shots.push($('#cqCanvas').toDataURL('image/png'));
    }
    document.body.innerHTML = '<div style="background:#000">' + shots.map(s => '<img src="' + s + '" style="display:block;width:100%;height:33.3vh;object-fit:cover">').join('') + '</div>'; document.body.style.margin = 0;
  }
  return out.join('\n');
})()
