// Duello degli alchimisti: COLLEZIONE (scoperte, premi ai traguardi, pozioni leggendarie con indovinello, premi disegnati sul mago).
// uso: node prove/cdp.mjs . prove/alc14.js [foto.png]   (foto: i due maghi con tutti i premi, a duello)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  const A = window.__alc, B = A.book(), save = JSON.stringify(B); B.f = {}; B.leg = {}; B.own = 0; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  await w(3000);
  out.push('pannello: ' + (document.getElementById('alCol') || {}).textContent + ' | i miei premi: "' + A.myCos() + '"');
  ['f', 'i', 'v', 'r', 'c'].forEach(k => A.bookNote(k)); await w(1600);
  out.push('5 scoperte (senza ricettario): premi "' + A.myCos() + '" | avvisi: ' + toasts.slice(-2).join(' || '));
  // leggendaria: il computer non la prepara mai; nel calderone si annuncia anche senza ricettario
  const Lg = A.brew('grw'), N = A.brew('gw');
  out.push('leggendaria grw: ' + Lg.e + ' ' + Lg.n + ', forza ' + JSON.stringify(Lg.s) + ' (gw normale ' + JSON.stringify(N.s) + '), segreta ' + A.secret(A.brew('cfx')));
  let cpu = 0; for (let i = 0; i < 40; i++) if (A.cpuBelt(G).some(k => A.brew(k).leg)) cpu++; out.push('cinture del computer con una leggendaria (su 40): ' + cpu);
  A.U2.pot = []; ['g', 'r', 'w'].forEach(id => A.addIng(G, id)); await w(200);
  out.push('calderone g+r+w: ' + ((document.querySelector('#alPot .bkl') || {}).textContent || '').slice(0, 90) + ' | avviso: ' + (toasts.filter(t => /LEGGENDARIA/.test(t)).pop() || 'NO') + ' | premi "' + A.myCos() + '"');
  A.U2.pot = [];
  A.bookOpen(G); await w(100); const bk = document.getElementById('alBook'); out.push('ricettario: ' + bk.textContent.replace(/\s+/g, ' ').slice(0, 330)); bk.remove();
  out.push('riga collezione: ' + A.colLine().replace(/<[^>]+>/g, ''));
  out.push('premi del computer: "' + (G.chars.find(c => c.bot).cos || '') + '"');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  Object.assign(B, JSON.parse(save)); saveStore();
  // foto: a duello, tutti e due con tutti i premi, una ampolla con la scia in volo
  G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); await w(700);
  const bot = G.chars.find(c => c.bot); bot.hold = 1; bot.x = 9.6; bot.y = 11.6; cq.x = 8.3; cq.y = 12.9;
  const all = 'stars,trail,owl,crown,embers,aura'; G.me.cos = all + ',rose,phoenix'; bot.cos = all + ',gear'; G.me.thT = 0; G.sel = 0; A.myThrow(G, 12.5, 8.5);
  await w(150);
  return out.join('\n');
})()
