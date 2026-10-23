// Duello degli alchimisti: il pannello del calderone sta TUTTO nello schermo (niente scorrimento), anche con 3 ingredienti e su telefoni piccoli.
// uso: node prove/cdp.mjs . prove/alc19.js [foto.png] [larghezza] [altezza]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000);
  const P = document.getElementById('alPrep'), chk = tag => { const last = document.getElementById('alBelt').getBoundingClientRect(), cv = document.getElementById('alCv').getBoundingClientRect(); return tag + ': contenuto ' + P.scrollHeight + ' / schermo ' + P.clientHeight + (P.scrollHeight <= P.clientHeight + 1 ? ' ok' : ' SCORRE') + ', cintura finisce a ' + Math.round(last.bottom) + ', calderone alto ' + Math.round(cv.height); };
  const out = ['finestra ' + innerWidth + 'x' + innerHeight, chk('vuoto')];
  ['f', 's', 'r'].forEach(id => A.addIng(G, id)); await w(400); out.push(chk('3 ingredienti'));
  A.U2.pot = []; ['f', 'r'].forEach(id => A.addIng(G, id)); await w(500); out.push(chk('2 ingredienti'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return out.join(' | ');
})()
