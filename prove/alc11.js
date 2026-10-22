// Duello degli alchimisti: SCONTRO IN VOLO (due ampolle che si incrociano scoppiano in aria e reagiscono) + quante volte capita in un duello vero.
// uso: node prove/cdp.mjs . prove/alc11.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); window.cqToast = () => {};
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot);
  step(3.5); G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); step(0.3); A.useFloor(2); G.pl = [];
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; c.thT = 0; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; bot.hold = 1; bot.path = []; G.st.t0 = G.time; };
  // 1) fuoco contro brina, lanciati insieme uno contro l'altro
  fresh(); cq.x = 6.5; cq.y = 13.5; bot.x = 13.5; bot.y = 8.5; G.me.belt = ['f', '', '', '']; G.sel = 0; bot.belt = ['i', '', '', ''];
  const b0 = G.bxN; A.myThrow(G, bot.x, bot.y); A.throwFrom(G, bot, 0, cq.x, cq.y); step(2);
  const air = G.bx.filter(b => b[0] > b0); out.push('1) 🔥 contro ❄️ insieme: scoppi ' + air.map(b => b[1] + '/' + (b[5] || '-') + ' a ' + b[2].toFixed(1) + ',' + b[3].toFixed(1)).join(' | ') + ' -> ' + (air[0] ? A.brew(air[0][1]).n : '') + ' | cuori io ' + G.me.hp + ' lui ' + bot.hp);
  // 2) lanci in direzioni diverse: nessuno scontro
  fresh(); cq.x = 6.5; cq.y = 13.5; bot.x = 13.5; bot.y = 8.5; G.me.belt = ['f', '', '', '']; G.sel = 0; bot.belt = ['i', '', '', ''];
  const b1 = G.bxN; A.myThrow(G, 12, 14); A.throwFrom(G, bot, 0, 8, 8); step(2); out.push('2) lanci che non si incrociano: ' + G.bx.filter(b => b[0] > b1).map(b => b[1] + '/' + (b[5] || '-')).join(' | '));
  // 3) il contro-lancio: quanto riesce in 12 prove (lui risponde mentre la mia ampolla arriva)
  let hits = 0, tries = 0;
  for (let i = 0; i < 12; i++) { fresh(); bot.hold = 0; bot.x = 13.5; bot.y = 8.5; bot.belt = ['c', 'p', 'w', '']; bot.drT = 99999; cq.x = 6.5; cq.y = 13.5; G.me.belt = ['f', '', '', '']; G.sel = 0; const b2 = G.bxN, n2 = G.flN; A.myThrow(G, bot.x, bot.y); step(1.6); if (G.flN - n2 > 1) tries++; if (G.bx.some(b => b[0] > b2 && b[5] === 'air')) hits++; }
  out.push('3) contro-lancio del computer: ha provato ' + tries + ' volte su 12, scontri in volo ' + hits);
  // 4) duello vero di 40 s: quante volte capita
  fresh(); bot.hold = 0; bot.belt = A.cpuBelt(G); A.duelArm(G, bot); bot.drT = 0; let airN = 0, mine = 0; const b3 = G.bxN;
  for (let i = 0; i < 40 / 0.05; i++) { if (i % 50 === 0) { G.me.belt = ['f', 'r', 'f', 'i']; G.sel = i % 4; G.me.thT = 0; A.myThrow(G, bot.x, bot.y); mine++; } step(0.05); G.me.hp = 3; G.me.iv = 0; bot.hp = 3; G.st.t0 = G.time; }
  airN = G.bx.filter(b => b[0] > b3 && b[5] === 'air').length; out.push('4) 40 s, io lancio ' + mine + ' volte dritto su di lui: scontri in volo ' + airN);
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
