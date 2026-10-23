// Duello degli alchimisti: LANCIO TOCCANDO LA MAPPA (tocco breve = lancio dove tocchi; trascinare = camminare, niente lancio). uso: node prove/cdp.mjs . prove/alc22.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  await w(3000); G.me.belt = ['f', 'r', 'v', 'i']; A.setReady(G, true); await w(900);
  const bot = G.chars.find(c => c.bot); bot.hold = 1; bot.x = 11.5; bot.y = 9.5; cq.x = 8.5; cq.y = 12.5; await w(400);
  const cv = document.getElementById('cqCanvas'), scr = (x, y) => { const V = G.camv, rc = cv.getBoundingClientRect(), vz = cq.vz || 1; return [rc.left + (V.tx + (x - y) * V.TW / 2) * vz, rc.top + (V.ty + (x + y) * V.TW / 4) * vz]; };
  const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y, isPrimary: true }));
  // 1) tocco sul computer
  let [sx, sy] = scr(bot.x, bot.y); const n0 = G.flN; G.me.thT = 0; G.sel = 0; ev('pointerdown', sx, sy); await w(80); ev('pointerup', sx, sy); await w(50);
  const f = G.fl[G.fl.length - 1]; out.push('1) tocco sul computer (' + bot.x + ',' + bot.y + '): lanci ' + (G.flN - n0) + (f ? ', mira a ' + f.x1.toFixed(1) + ',' + f.y1.toFixed(1) + ' (errore ' + Math.hypot(f.x1 - bot.x, f.y1 - bot.y).toFixed(2) + ' caselle)' : ''));
  // 2) trascinare (camminare): nessun lancio
  await w(900); G.me.thT = 0; const n1 = G.flN; ev('pointerdown', sx, sy); await w(60); ev('pointermove', sx + 40, sy); await w(60); ev('pointerup', sx + 40, sy); await w(50); out.push('2) trascinamento: lanci ' + (G.flN - n1));
  // 3) tocco lungo (> 0,3 s): nessun lancio
  G.me.thT = 0; const n2 = G.flN; ev('pointerdown', sx, sy); await w(450); ev('pointerup', sx, sy); await w(50); out.push('3) tocco lungo: lanci ' + (G.flN - n2));
  // 4) tocco lontanissimo: si ferma a RMAX
  G.me.thT = 0; const [fx, fy] = scr(cq.x + 30, cq.y - 30); ev('pointerdown', fx, fy); await w(60); ev('pointerup', fx, fy); await w(50); const f2 = G.fl[G.fl.length - 1]; out.push('4) tocco lontano: distanza del lancio ' + (f2 ? Math.hypot(f2.x1 - f2.x0, f2.y1 - f2.y0).toFixed(1) : '-'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return out.join('\n');
})()
