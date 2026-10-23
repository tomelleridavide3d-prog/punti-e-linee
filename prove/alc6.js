// Duello degli alchimisti, passo 6: ricettario (monete, scoperte, descrizioni, calderone che riconosce la miscela), schede la prima volta.
// uso: node prove/cdp.mjs . prove/alc6.js [foto.png]   (foto: il ricettario aperto sopra il calderone)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.removeItem('alcHelp2'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  store.settings.alcBook = { own: 0, f: {} }; cqBank().coins = 20; saveStore();
  step(3.5);
  out.push('scheda della preparazione: ' + (document.getElementById('alHelp') ? document.getElementById('alHelp').textContent.slice(0, 40) + '…' : 'NO'));
  document.querySelector('#alHelp button').click();
  $('#alBk').click(); out.push('ricettario con 20 monete: ' + $('#alBook').textContent.replace(/\s+/g, ' ').slice(0, 120) + ' | compra disattivo ' + $('#alBuy').disabled);
  cqBank().coins = 70; A.bookOpen(G); $('#alBuy').click();
  out.push('comprato: suo ' + A.book().own + ', monete rimaste ' + cqBank().coins + ' | ' + $('#alBook').textContent.replace(/\s+/g, ' ').slice(0, 80));
  document.querySelector('#alBook .cl').click();
  out.push('descrizioni: ' + ['f', 'fs', 'ir', 'v', 'w', 'ooo', 'fx', 'm'].map(k => A.brew(k).n + ' = ' + A.describe(A.brew(k))).join(' || '));
  out.push('pozioni possibili (calcolate): ' + A.TOTAL);
  // al calderone: una miscela mai vista, poi una gia' scoperta
  const jar = id => document.querySelector('#alJars [data-i="' + id + '"]').click();
  jar('f'); jar('s'); out.push('calderone con 🌶️⏳ mai vista: ' + ($('#alPv .pv') ? $('#alPv .pv').textContent : 'niente'));
  $('#alBot').click(); G.me.belt = ['fs', 'ir', 'v', 'f']; A.setReady(G, true); step(0.3);
  out.push('scheda del duello: ' + (document.getElementById('alHelp') ? 'si' : 'NO'));
  const bot = G.chars.find(c => c.bot); bot.hold = 1; bot.belt = ['c', '', '', '']; cq.x = 6.5; cq.y = 12.5; bot.x = 13.5; bot.y = 12.5;
  for (const i of [1, 2, 3]) { G.me.thT = 0; G.sel = i; A.myThrow(G, bot.x, bot.y); step(1.6); }
  out.push('dopo 3 lanci: ricettario ' + Object.keys(A.book().f).length + ' pozioni (' + Object.keys(A.book().f).map(k => A.brew(k).n).join(', ') + ') | avviso: ' + toasts.filter(t => t.includes('ricettario')).slice(-1)[0]);
  // manche dopo: calderone con una miscela gia' scoperta
  A.prepOpen(G); jar('i'); jar('r'); out.push('calderone con ❄️🍯 scoperta: ' + ($('#alPv .pv') ? $('#alPv .pv').textContent : 'niente'));
  // seconda volta: le schede non tornano
  const n0 = document.querySelectorAll('#alHelp').length; A.helpOnce('prep'); out.push('scheda la seconda volta: ' + (document.querySelectorAll('#alHelp').length > n0 ? 'TORNA (sbagliato)' : 'non torna'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  A.bookOpen(G);
  store.settings.alcBook = { own: 0, f: {} }; cqBank().coins = 0; saveStore();
  return out.join('\n');
})()
