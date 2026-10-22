// La casa delle trappole, passo 5: partita intera da solo contro il computer (al meglio di 3 manche), accelerata.
// Io: preparo una villa e, quando rubo, vado dritto al diamante (window.__LOSE = 1: lascio scadere il tempo). Il computer fa tutto da solo.
// uso: node prove/cdp.mjs . prove/tr5.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=trappole]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(3600);
  const G = cq.g, T = window.__tr, toasts = []; window.cqToast = t => toasts.push(String(t).replace(/<[^>]+>/g, ''));
  cq.on = false; cancelAnimationFrame(cq.raf);
  const step = dt => { cqModeTick(dt); if (G.M.local && G.pre <= 0 && G.phase === 'play') G.M.local(G, dt); };
  let last = '', built = 0, raid = null; const log = [];
  for (let i = 0; i < 20 * 900 && G.phase === 'play'; i++) {
    const key = G.st ? G.st.n + ':' + G.st.step + ':' + G.ph : '';
    if (key !== last) { last = key; log.push(key + (G.st && G.st.msg ? ' «' + G.st.msg.replace(/\n/g, ' / ') + '»' : '')); }
    if (G.ph === 'build' && built !== G.st.n) {
      built = G.st.n;
      if (G.st.n === 1) for (const [k, x, y] of [['dia', 21, 1], ['fake', 28, 2], ['cam', 16, 14], ['cam', 16, 4], ['jl', 16, 12], ['botola', 18, 4], ['cane', 14, 6], ['vernice', 19, 9]]) { const e = T.place(G.mine, k, x, y); if (e) log.push('NON MESSA ' + k + ': ' + e); }
      else T.place(G.mine, 'dia', 32, 3);   // nelle manche dopo sposto il diamante nell'armadio... no: nel comò
      T.buildDone(G);
    }
    if (G.ph === 'raid' && !window.__LOSE) {
      if (!raid || raid.t0 !== G.t0) raid = { t0: G.t0, st: 0 };
      const S = T.spots()[G.dia];
      if (raid.st === 0 && !(G.stun > G.time) && !G.fall && !G.resp) { for (const [a, b] of [[0.5, 1.32], [1.32, 0.5], [-0.32, 0.5], [0.5, -0.32], [0.5, 1.6], [1.6, 0.5]]) { cq.x = S.x + a; cq.y = S.y + b; const n = cqFree(cq.x, cq.y) && G.M.spotNear(G); if (n && n.i === G.dia) break; } G.M.act(G); raid.st = 1; }
      if (G.safe) { G.safe.val = G.safe.nums[G.safe.k]; G.safe.fv = G.safe.val; }
      if (G.has && raid.st === 1) { cq.x = 16.8; cq.y = 28.6; raid.st = 2; }
      if (raid.st === 1 && !G.srch && !G.safe && !G.has && !(G.stun > G.time)) raid.st = 0;
    }
    step(0.05);
  }
  out.push('fasi: ' + log.join(' → '));
  out.push('fine: ' + (G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, ' ') + ' | ' + G.endInfo.rank.map(r => r.join(' ')).join(' / ') : 'NON FINITA ' + G.phase + ' ' + last));
  out.push('il computer ha spostato il diamante tra le manche: ' + (G.villa[G.opp.id] ? T.spots()[G.villa[G.opp.id].items.find(o => o.k === 'dia').i].n : '?'));
  out.push('pulsanti rimasti: ' + ['trBar', 'trCams', 'trCloak', 'trSafe', 'trPlan'].filter(id => document.getElementById(id)).join(',') + ' | tempo di gioco ' + Math.round(G.time) + ' s');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
