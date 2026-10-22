// Duello degli alchimisti: LA SALITA tra un piano e l'altro (scena lungo la torre). uso: node prove/cdp.mjs . prove/alc13.js [foto.png] (foto a meta' salita)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  const bot = G.chars.find(c => c.bot); await w(3000);
  G.me.belt = ['f', 'f', 'f', 'f']; A.setReady(G, true); await w(600);
  out.push('fase ' + G.st.ph + ', scena salita al primo piano: ' + !!document.getElementById('alAsc'));
  bot.hp = 1; bot.iv = 0; A.burst(G, 'f', bot.x, bot.y, G.me.id); await w(400); out.push('fine manche: ' + G.st.ph);
  await w(5200); const el = document.getElementById('alAsc');
  out.push('manche ' + G.st.n + ' ' + G.st.ph + ': scena salita ' + !!el + (el ? ' | scritta: ' + el.querySelector('.tx').textContent : ''));
  await w(4300); out.push('dopo 4,3 s: scena ' + !!document.getElementById('alAsc') + ', pannello del calderone ' + !!document.getElementById('alPrep'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  A.ascOpen(3); await w(700);   // la foto (se chiesta) arriva 0,8 s dopo: a meta' salita
  return out.join('\n');
})()
