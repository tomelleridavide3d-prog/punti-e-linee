// Duello degli alchimisti: RIEMPI PER ME (cintura equilibrata con i soli ingredienti sbloccati). uso: node prove/cdp.mjs . prove/alc21.js [foto.png] [larg] [alt]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; const S = store.settings, g0 = S.alcGames; S.alcGames = 0; S.alcSeenLv = 0; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000);
  for (let i = 0; i < 5; i++) { G.me.belt = ['', '', '', '']; A.quickFill(G); const b = G.me.belt; out.push('apprendista: ' + b.map(k => A.brew(k).n + ' (' + k + ')').join(' | ') + ' -> ingredienti ok ' + b.every(k => [...k].every(id => A.ingOk(A.ING.find(g => g.id === id))) && k.length <= 2) + ', blocca ' + b.some(k => A.stops(A.brew(k))) + ', brucia ' + b.some(k => A.hurts(A.brew(k)))); }
  S.alcGames = 3; G.me.belt = ['f', '', 'v', '']; A.quickFill(G); out.push('esperto, con 2 già fatte: ' + G.me.belt.join(',') + ' | pulsante spento a cintura piena ' + document.getElementById('alFill').disabled);
  const P = document.getElementById('alPrep'); out.push('pannello: ' + P.scrollHeight + '/' + P.clientHeight + ' | errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  S.alcGames = g0; saveStore();
  return out.join('\n');
})()
