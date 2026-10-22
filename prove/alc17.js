// Duello degli alchimisti: ANTEPRIMA in due riquadri (se la lanci / se la bevi) che cambia a ogni ingrediente. uso: node prove/cdp.mjs . prove/alc17.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  const A = window.__alc, B = A.book(), own0 = B.own; B.own = 0;
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000);
  const card = () => { const pv = document.querySelector('#alPot .pv'); if (!pv) return 'NIENTE'; const q = s => [...pv.querySelectorAll(s + ' li')].map(l => l.textContent).join(' | '); return '[' + pv.querySelector('b').textContent + '] LANCI: ' + q('.th') + ' || BEVI: ' + q('.dr'); };
  for (const ids of [['f'], ['f', 'r'], ['f', 'r', 'v'], ['f', 'i'], ['s', 'f'], ['m'], ['o']]) { A.U2.pot = []; ids.forEach(id => A.addIng(G, id)); out.push(ids.join('+') + ' -> ' + card()); }
  A.U2.pot = []; ['f', 'r'].forEach(id => A.addIng(G, id)); await w(300);
  B.own = own0;
  const pv = document.querySelector('#alPot .pv').getBoundingClientRect(), act = document.getElementById('alAct').getBoundingClientRect();
  out.push('riquadri ' + Math.round(pv.top) + '-' + Math.round(pv.bottom) + ', pulsanti da ' + Math.round(act.top) + ' -> ' + (pv.bottom <= act.top ? 'ok, non si sovrappongono' : 'SOVRAPPOSTI'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  const pb = document.getElementById('alPrep'); pb.scrollTop = Math.max(0, pv.top - 260);
  return out.join('\n');
})()
