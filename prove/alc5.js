// Duello degli alchimisti, passo 5: computer furbo (cintura valutata, contro-mosse, schivata, voragine, cintura che sfrigola, specchio).
// uso: node prove/cdp.mjs . prove/alc5.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); window.cqToast = () => {};
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot), nm = b => b.map(k => k ? A.brew(k).n : '-').join(' | ');
  // 1) cintura del computer: valutata; contro chi usa tanto fuoco
  out.push('1) cintura normale: ' + nm(A.cpuBelt(G)));
  out.push('   contro chi usa tanto fuoco: ' + nm(A.cpuBelt(Object.assign({}, G, { seen: { fire: 6 } }))) + ' | ' + nm(A.cpuBelt(Object.assign({}, G, { seen: { fire: 6 } }))));
  out.push('   valori: fuoco ' + A.potScore(G, A.brew('f'), { x: 0, y: 0 }).toFixed(1) + ', cristallo ' + A.potScore(G, A.brew('ir'), { x: 0, y: 0 }).toFixed(1) + ', vento ' + A.potScore(G, A.brew('v'), { x: 0, y: 0 }).toFixed(1) + ' / vicino alla voragine ' + A.potScore(G, A.brew('v'), { x: 0, y: 0, pit: true }).toFixed(1) + ', folletto ' + A.potScore(G, A.brew('p'), { x: 0, y: 0 }).toFixed(1));
  step(3.5); G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); step(0.2);
  const reset = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; c.hold = 0; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; G.st.t0 = G.time; G.myFall = null; };
  // 2) io fermo vicino al bordo della voragine, il computer ha solo vento: quante volte mi butta giu' in 25 s?
  reset(); bot.belt = ['v', 'v', 'v', 'v']; let falls = 0, thr0 = G.flN;
  for (let i = 0; i < 25 / 0.05; i++) { if (G.myFall == null && !cq.sl) { cq.x = 10.5; cq.y = 13.4; } const f0 = G.myFall; step(0.05); if (f0 == null && G.myFall != null) falls++; if (!bot.belt.some(Boolean)) bot.belt = ['v', 'v', 'v', 'v']; G.me.hp = 3; }
  out.push('2) io sul bordo della voragine, il computer col vento: lanci ' + (G.flN - thr0) + ', mi ha buttato giu\' ' + falls + ' volte');
  // 3) schivata: lancio 12 volte fuoco dove sta il computer (da 6 caselle), lui si muove
  reset(); let hits = 0;
  for (let i = 0; i < 12; i++) {
    G.zn = []; bot.belt = ['', '', '', '']; bot.hp = 3; bot.iv = 0; cq.x = 10.5; cq.y = 16.2; if (Math.hypot(bot.x - 10.5, bot.y - 16.2) < 4) { bot.x = 15.5; bot.y = 12.5; bot.path = []; }
    G.me.belt = ['f', '', '', '']; G.sel = 0; G.me.thT = 0; A.myThrow(G, bot.x, bot.y); step(1.4); if (bot.hp < 3) hits++;
  }
  out.push('3) 12 lanci di fuoco dritti sul computer: presi ' + hits + ' (schiva gli altri)');
  // 4) la mia cintura sfrigola: con fuoco, cristallo, colla e fumo in mano, cosa lancia per primo?
  reset(); const firsts = {};
  for (let i = 0; i < 10; i++) { G.me.belt = ['ooo', 'ooo', 'f', 'f']; bot.belt = ['c', 'r', 'f', 'g']; bot.aimT = 0; bot.thT = 0; cq.x = 10.5; cq.y = 16.2; bot.x = 14.5; bot.y = 12.5; bot.path = []; G.fl = []; G.me.thT = 99; const n0 = G.flN; for (let k = 0; k < 40 && G.flN === n0; k++) step(0.05); const f = G.fl.find(f => f.o === bot.id); if (f) firsts[A.brew(f.k).n] = (firsts[A.brew(f.k).n] || 0) + 1; }
  out.push('4) la mia cintura sfrigola: il computer lancia per primo ' + JSON.stringify(firsts));
  // 5) specchio: il computer ha uno specchio e io ho ampolle: lo mette tra noi
  reset(); bot.belt = ['m', '', '', '']; bot.aimT = 0; G.me.belt = ['f', 'f', '', '']; cq.x = 10.5; cq.y = 16.2; bot.x = 15.5; bot.y = 12.5; bot.path = []; const z0 = G.znN; step(3);
  const mz = G.zn.find(z => z.k === 'mirror'); out.push('5) specchio del computer: ' + (mz ? 'messo a ' + Math.hypot(mz.x - bot.x, mz.y - bot.y).toFixed(1) + ' caselle da lui, verso di me' : 'NO'));
  // 6) si tiene lontano dal bordo: posti scelti in 30 s di duello normale
  reset(); bot.belt = A.cpuBelt(G); G.me.belt = ['', '', '', '']; let edge = 0, n = 0;
  for (let i = 0; i < 30 / 0.05; i++) { step(0.05); n++; if (Math.hypot(bot.x - A.C, bot.y - A.C) < 2.25 + 1.2) edge++; G.me.hp = 3; }
  out.push('6) computer vicino al bordo della voragine: ' + Math.round(edge / n * 100) + '% del tempo');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
