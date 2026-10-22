// Duello degli alchimisti, passo 2: tutte le pozioni possibili (nomi, micce, reazioni), pannello del calderone, cintura, pronto -> duello.
// uso: node prove/cdp.mjs . prove/alc2.js [foto.png]   (foto: il pannello del calderone con 2 ingredienti dentro)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  // ---- tutte le pozioni (ingredienti anche ripetuti, da 1 a 3) ----
  const ids = A.ING.map(g => g.id), keys = new Set();
  for (const a of ids) { keys.add(a); for (const b of ids) { keys.add(A.potKey([a, b])); for (const c of ids) keys.add(A.potKey([a, b, c])); } }
  const P = [...keys].map(k => A.brew(k)), names = new Set(P.map(p => p.n)), reach = p => p.spd * p.fuse;
  out.push('pozioni possibili ' + P.length + ', nomi diversi ' + names.size + ', con reazioni ' + P.filter(p => p.rx.length).length);
  out.push('scoppiano in mano (meno di 1,5 caselle) ' + P.filter(p => reach(p) < 1.5).length + ', vicino (1,5-4) ' + P.filter(p => reach(p) >= 1.5 && reach(p) < 4).length + ', arrivano lontano ' + P.filter(p => reach(p) >= 9).length);
  const by = {}; for (const p of P) by[p.main] = (by[p.main] || 0) + 1; out.push('elemento principale: ' + Object.entries(by).map(([k, v]) => k + ' ' + v).join(', '));
  const show = k => { const p = A.brew(k); return p.ings.map(g => g.e).join('') + ' = ' + p.n + ' (miccia ' + p.fuse.toFixed(2) + ' s, arriva a ' + reach(p).toFixed(1) + ' caselle, zona ' + p.area.toFixed(1) + ')'; };
  for (const k of ['f', 'fs', 'fi', 'ir', 'gp', 'ooo', 'fv', 'vw', 'rw', 'fx', 'fff', 'cfo', 'gmx', 'iss']) out.push('  ' + show(k));
  // ---- pannello del calderone ----
  cq.on = false; cancelAnimationFrame(cq.raf);
  for (let i = 0; i < 70; i++) { cqModeTick(0.05); G.M.local(G, 0.05); }
  out.push('pannello aperto: ' + !!document.getElementById('alPrep') + ' | barra: ' + $('#cqModeBar').textContent);
  const jar = id => document.querySelector('#alJars [data-i="' + id + '"]').click();
  jar('f'); jar('s'); $('#alBot').click(); jar('i'); $('#alBot').click(); jar('r'); jar('w'); jar('o'); jar('f');
  out.push('4 ingredienti di fila: ' + A.U2.pot.join('') + ' | messaggio: ' + $('#alMsg').textContent);
  $('#alBot').click(); jar('v'); $('#alBot').click();
  out.push('cintura: ' + G.me.belt.map(k => k ? A.brew(k).n : '-').join(' | '));
  document.querySelector('#alBelt [data-b="1"]').click(); out.push('svuotata la seconda: ' + G.me.belt.map(k => k || '-').join(','));
  jar('c'); jar('f'); $('#alBot').click();
  out.push('computer: ' + G.chars.find(c => c.bot).belt.map(k => A.brew(k).n).join(' | '));
  // foto: due ingredienti nel calderone
  jar('i'); jar('o');
  
  const shotPot = A.U2.pot.join('');
  cq.on = false; cancelAnimationFrame(cq.raf);
  $('#alRdy').click();
  out.push('pronto con ' + shotPot + ' nel calderone -> imbottigliato da solo? ' + (A.U2.pot.length ? 'NO' : 'si') + ' | cintura ' + G.me.belt.join(','));
  cqModeTick(0.05); G.M.local(G, 0.05);
  out.push('fase: ' + G.st.ph + ' | pannello ' + (document.getElementById('alPrep') ? 'ANCORA APERTO' : 'chiuso') + ' | ampolle disegnate dell\'altro: ' + JSON.stringify((() => { const o = G.chars.find(c => c.bot); return o.belt.map(k => A.brew(k).c); })()));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  // rimetto il pannello per la foto
  G.myRdy = false; A.prepOpen(G); jar('i'); jar('o'); cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame); await w(900);
  return out.join('\n');
})()
