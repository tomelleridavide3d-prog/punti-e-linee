// Il Minotauro: foto di una zona del tempio (window.__Z = 0 ingresso, 1 giardino, 2 sale allagate, 3 santuario). Da fantasma (buio piu' leggero).
// uso: node prove/cdp.mjs . prove/min5.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], Z = +(window.__Z || 1);
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { minotauro: { tm: 2, n: 8, mino: 'c', wall: 60, time: 420, map: 'labirinto', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=minotauro]').click(); await w(2500);
  $('#lbGo').click(); await w(4000);
  const G = cq.g; G.left = 1e9; G.next = 1e9;
  for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 1.5; c.y = 1.5; }
  const sh = CQ_MAP.shafts.find(([x, y]) => ((x >= 28 ? 1 : 0) + (y >= 28 ? 2 : 0)) === Z);
  const q = cqSpot(sh[0], sh[1] + 1); cq.x = q.x; cq.y = q.y; G.me.alive = false;
  await w(1500);
  out.push('zona ' + Z + ' a ' + cq.x + ',' + cq.y + ' | errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
