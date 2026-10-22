// Duello degli alchimisti, passo 4: reazioni sul campo (pozione + pozza) e ampolle instabili che scoppiano alla cintura.
// uso: node prove/cdp.mjs . prove/alc4.js
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
  step(3.5); G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); step(0.2); A.useFloor(2); G.pl = [];   // le prove dei passi 3-5 si fanno in cima (voragine)
  const freeze = () => { bot.hold = 1; bot.think = 1e9; bot.aimT = 1e9; bot.path = []; bot.goal = 'f'; };
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; freeze(); bot.x = 14.5; bot.y = 9.5; cq.x = 5.5; cq.y = 12.5; };
  const react = () => G.bx.filter(b => b[5] === 'react').map(b => b[1]);
  const zones = () => G.zn.map(z => z.k).join(',') || 'nessuna';
  // pozza dell'altro (A.burst con il suo id), poi la mia pozione sopra
  const cases = [
    ['🔥 fuoco sul ghiaccio', 'i', 'f'], ['❄️ brina sul fuoco (spegne)', 'f', 'i'], ['🔥 fuoco nel fumo', 'c', 'f'],
    ['❄️ brina sulla colla', 'r', 'i'], ['🦅 vento sul fuoco', 'f', 'v'], ['🍯 colla sul ghiaccio', 'i', 'r'], ['🍄 fungo sul ghiaccio (niente)', 'i', 'g']];
  for (const [t, pz, pot] of cases) {
    fresh(); const n0 = G.bxN;
    A.burst(G, pz, 14.5, 10.3, bot.id); const z0 = zones();
    A.burst(G, pot, 14.2, 10.0, G.me.id); step(0.4); freeze();
    const r = G.bx.filter(b => b[0] > n0 && b[5] === 'react').map(b => b[1]);
    out.push(t + ': pozza ' + z0 + ' -> reazione ' + (r.join(',') || 'nessuna') + ' | pozze ora ' + zones() + ' | computer: cuori ' + bot.hp + ', stati ' + Object.keys(bot.fx).filter(k => bot.fx[k] > G.time).join(',') + ', spostato ' + Math.hypot(bot.x - 14.5, bot.y - 9.5).toFixed(1));
  }
  // ampolle instabili alla cintura: il computer ha 4 pozioni instabili, lo colpisco col fuoco
  fresh(); bot.belt = ['ooo', 'ffo', 'f', 'ooo']; const hp0 = bot.hp; Math.random = (r => () => 0.1)(Math.random);
  A.burst(G, 'f', bot.x, bot.y, G.me.id); step(1.5); freeze();
  out.push('💥 cintura instabile: cintura ' + bot.belt.map(k => k || '-').join(',') + ', cuori ' + hp0 + ' -> ' + bot.hp + ' | avviso: ' + toasts.filter(t => t.includes('ampolle')).slice(-1)[0]);
  out.push('scintille sulla cintura (fuoco + occhio di rospo instabile): ' + (A.brew('ffo').inst >= 0.45) + ' (inst ' + A.brew('ffo').inst + '), pozione semplice: ' + A.brew('f').inst);
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
