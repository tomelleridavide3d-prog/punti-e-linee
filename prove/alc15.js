// Duello degli alchimisti: pulsanti del duello (ricarica sopra a Bevi e alla fionda, senza sovrapporsi). uso: node prove/cdp.mjs . prove/alc15.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000); G.me.belt = ['f', 'r', 'v', 'i']; A.setReady(G, true); await w(800);
  G.chars.find(c => c.bot).hold = 1; G.me.belt = ['', 'r', 'v', 'i']; const [kx, ky] = A.KETTLE[0]; cq.x = kx + 0.5; cq.y = ky + 1.2; await w(600);
  const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  const K = r('cqKill'), D = r('alDr'), T = r('alTh'), hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  return 'ricarica ' + JSON.stringify(K) + ' "' + $('#cqKill').textContent + '" | bevi ' + JSON.stringify(D) + ' | fionda ' + JSON.stringify(T) + ' | sovrapposti: ricarica-fionda ' + hit(K, T) + ', ricarica-bevi ' + hit(K, D) + ', bevi-fionda ' + hit(D, T) + ' | finestra ' + innerWidth + 'x' + innerHeight + ' | errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300);
})()
