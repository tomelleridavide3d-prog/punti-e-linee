// Duello degli alchimisti: il MAGO che fa gli incantesimi accanto al calderone. uso: node prove/cdp.mjs . prove/alc18.js [foto.png] (foto subito dopo un ingrediente)
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
  const seen = [];
  A.addIng(G, 'f'); await w(500); seen.push(A.U2.sp && A.U2.sp.w); A.bottle(G); await w(700); seen.push(A.U2.sp && A.U2.sp.w);
  A.addIng(G, 'o'); A.addIng(G, 'o'); await w(1700); A.U2.pot = []; await w(100);
  $('#alEmp').disabled = false; A.addIng(G, 'r'); $('#alEmp').click(); await w(300); seen.push(A.U2.sp && A.U2.sp.w);
  A.addIng(G, 'i'); await w(80);
  return 'il mago grida: ' + seen.join(' | ') + ' | errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
