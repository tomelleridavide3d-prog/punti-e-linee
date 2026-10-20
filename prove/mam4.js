// Caccia al mammut: foto di giorno nella foschia, a 6 caselle dal mammut (si vede) e un compagno a 11 (si vede, il mammut a quella distanza no).
// uso: node prove/cdp.mjs . prove/mam4.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=mammut]').click(); await w(2500);
  $('#lbGo').click(); await w(5000);
  const G = cq.g, m = G.mm;
  for (const c of G.chars) if (c !== G.me) { c.bot = false; c.path = []; }
  m.st = 'graze'; m.gT = 99; m.path = []; m.aw = 0; G.time = 30;
  for (let t = 0; t < 200; t++) { const a = t * 0.37, x = m.x + Math.cos(a) * 6, y = m.y + Math.sin(a) * 6; if (cqCellFree(Math.floor(x), Math.floor(y))) { cq.x = G.me.x = x; cq.y = G.me.y = y; break; } }
  const o = G.chars.find(c => c !== G.me); if (o) { o.x = cq.x - 8; o.y = cq.y + 8; }
  await w(1500);
  return ['mammut a ' + Math.hypot(m.x - cq.x, m.y - cq.y).toFixed(1) + ' caselle', 'errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno')];
})()
