// Mister X: foto di un posto della citta' (window.__P = 'shop' negozio, 'bridge' ponte, 'park' parco, 'port' porto, 'heli' eliporto, 'metro').
// window.__GHOST = 1: da fantasma (buio leggero). Mister X del computer messo vicino a me. uso: node prove/cdp.mjs . prove/mx2.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], PL = window.__P || 'shop';
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { misterx: { mx: 'c', n: 6, flash: 30, time: 420, map: 'citta', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=misterx]').click(); await w(2500);
  $('#lbGo').click(); await w(4500);
  const G = cq.g, M = CQ_MAP; G.left = 1e9; G.nf = 1e9;
  for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; }
  const dk = (() => { let b = null, bd = 1e9; for (let i = 0; i < 10000; i++) if (M.dark[i] && M.T[i] === 1) { const x = i % 100, y = (i / 100) | 0, d = Math.hypot(x - 50, y - 45); if (d < bd) { bd = d; b = { x: x + 0.5, y: y + 0.5 }; } } return b; })();
  const at = PL === 'dark' ? dk : PL === 'bridge' ? { x: M.bridges[1] + 1.5, y: M.river[0] - 1.5 } : PL === 'park' ? { x: M.parkR[0] + 4, y: M.parkR[1] + 4 } : PL === 'port' ? { x: M.EP[0].x, y: M.DY + 1.5 } : PL === 'heli' ? { x: M.EP[1].x, y: M.EP[1].y + 1 } : PL === 'metro' ? { x: M.metro[0].sx, y: M.metro[0].sy + 1 } : { x: M.loot[0].sx, y: M.loot[0].sy + 1 };
  const q = cqSpot(Math.floor(at.x), Math.floor(at.y)); cq.x = q.x; cq.y = q.y; G.me.x = q.x; G.me.y = q.y;
  const X = G.chars.find(c => c.mx); if (X && !G.me.mx) { const s = cqSpot(Math.floor(q.x + 1), Math.floor(q.y - 2)); X.x = s.x; X.y = s.y; }
  const D = G.chars.filter(c => !c.mx && c !== G.me); D.forEach((c, i) => { const s = cqSpot(Math.floor(q.x - 2 + i), Math.floor(q.y + 2)); c.x = s.x; c.y = s.y; });
  if (window.__GHOST) G.me.alive = false;
  cq.wdx = 1; cq.wdy = 0; if (PL === 'dark' && X) { X.x = q.x + 4; X.y = q.y; for (const c of D) { c.x = q.x - 3; c.y = q.y + (c.id % 3) - 1; } }
  await w(1800);
  out.push(PL + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' | io ' + (G.me.mx ? 'Mister X' : 'detective') + ' | barra: ' + $('#cqModeBar').textContent + ' | errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
