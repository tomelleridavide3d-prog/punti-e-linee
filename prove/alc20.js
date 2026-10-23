// Duello degli alchimisti: SCOPERTA A GRADINI (apprendista: 6 ingredienti, 2 per pozione, niente ricettario/eventi/segreti; sblocchi dopo 1, 2, 3 partite complete).
// uso: node prove/cdp.mjs . prove/alc20.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; const S = store.settings, save = { g: S.alcGames, s: S.alcSeenLv }; S.alcGames = 0; S.alcSeenLv = 0; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  await w(3000);
  const jars = () => [...document.querySelectorAll('#alJars [data-i]')].map(b => b.classList.contains('off') ? '🔒' + b.dataset.i : b.dataset.i).join(' ');
  out.push('apprendista (0 partite): barattoli ' + jars() + ' | 📖 ' + !!document.getElementById('alBk') + ' | riga: ' + document.getElementById('alCol').textContent + ' | max ' + A.maxI());
  A.addIng(G, 's'); out.push('tocco la sabbia: ' + document.getElementById('alMsg').textContent + ' | nel calderone ' + A.U2.pot.length);
  A.addIng(G, 'f'); A.addIng(G, 'i'); A.addIng(G, 'r'); out.push('fuoco+brina+resina: nel calderone ' + A.U2.pot.join('') + ' | ' + document.getElementById('alMsg').textContent + ' | nome ' + document.getElementById('alNmP').textContent + ' (reazione visibile, non segreta)');
  A.U2.pot = []; G.me.belt = ['f', 'r', 'v', 'i']; A.setReady(G, true); await w(700);
  out.push('duello: fase ' + G.st.ph + ', evento a metà duello ' + JSON.stringify(G.st.ev));
  // fine di una partita completa: conta
  G.st.fin = 1; G.st.ph = 'mres'; G.st.n = 3; M.local(G, 0.01); out.push('partita finita: partite complete ' + A.LV());
  for (const n of [1, 2, 3]) { S.alcGames = n; saveStore(); toasts.length = 0; A.U2.ph = 'mres9'; G.st = { n: 1, ph: 'prep', t0: G.time, rd: {}, sc: {} }; M.local(G, 0.01); await w(2900); out.push('dopo ' + n + ' partite: barattoli ' + jars() + ' | max ' + A.maxI() + ' | avvisi: ' + toasts.filter(t => /Nuovi|alchimista/.test(t)).join(' || ')); }
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  S.alcGames = save.g; S.alcSeenLv = save.s; saveStore();
  return out.join('\n');
})()
