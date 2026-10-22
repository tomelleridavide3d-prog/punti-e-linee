// Duello degli alchimisti: le AMPOLLE dei pulsanti (cintura nel calderone e barra in basso), con il colore delle pozioni. uso: node prove/cdp.mjs . prove/alc16.js [foto.png]
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
  for (const ids of [['f'], ['i', 'r'], ['v']]) { A.U2.pot = []; ids.forEach(id => A.addIng(G, id)); A.bottle(G); }
  await w(300);
  const cols = [...document.querySelectorAll('#alBelt .vi')].map(v => v.style.getPropertyValue('--c') || '-').join(' ');
  const pb = document.getElementById('alPrep'); pb.scrollTop = pb.scrollHeight;   // in fondo: si vede la cintura
  return 'cintura nel calderone: ' + document.querySelectorAll('#alBelt .vi svg').length + ' ampolle, colori ' + cols + ' | errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
