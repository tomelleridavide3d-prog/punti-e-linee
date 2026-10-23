// Duello degli alchimisti: foto del pannello del calderone con l'anteprima (le scritte non devono coprire Svuota / Imbottiglia).
// uso: node prove/cdp.mjs . prove/alc9.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000); ['f', 's', 'r'].forEach(id => A.addIng(G, id)); await w(1200);
  const r = id => document.getElementById(id).getBoundingClientRect(), pot = r('alPot'), act = r('alAct'), msg = r('alPv');
  return 'scritte ' + Math.round(pot.top) + '-' + Math.round(pot.bottom) + ', riquadri ' + Math.round(msg.top) + '-' + Math.round(msg.bottom) + ', pulsanti ' + Math.round(act.top) + '-' + Math.round(act.bottom) + ' -> ' + (pot.bottom <= msg.top + 0.5 && msg.bottom <= act.top + 0.5 ? 'nessuna sovrapposizione' : 'SOVRAPPOSTI') + ' | errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
