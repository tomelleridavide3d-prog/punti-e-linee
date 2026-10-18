// Naufraghi: ordine di disegno. Un sasso piccolo o un cespuglio davanti a un masso deve stare sopra al masso (non il contrario).
// Cerca un masso con un sassolino o un cespuglio davanti e lo inquadra (foto da guardare).
// uso: node prove/cdp.mjs . prove/nau3.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=naufraghi]').click(); await w(2500);
  $('#lbGo').click(); await w(1500);
  const G = cq.g; G.pre = 0; for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; }
  // un masso con davanti (x+1 o y+1) una decorazione alta, tutto in piano
  let f = null, n = 0;
  for (let y = 1; y < CQ_H - 2; y++) for (let x = 1; x < CQ_W - 2; x++) {
    const o = cqSolid[y][x]; if (!o || o.prop !== 'bigrock' || cqHc(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (cqDecoUp(x + dx, y + dy)) { n++; if (!f) f = { x, y, dx, dy, t: cqDeco[y + dy][x + dx] }; }
  }
  out.push('massi con una decorazione davanti: ' + n + (f ? ', provo ' + f.t + ' davanti al masso ' + f.x + ',' + f.y : ''));
  if (f) {
    // il personaggio un po' piu' in la', cosi' la telecamera inquadra il masso
    const q = cqSpot(f.x + 3, f.y + 3); cq.x = q.x; cq.y = q.y; G.me.x = q.x; G.me.y = q.y;
    cq.bg = null; await w(800);
    out.push('decorazione disegnata col pavimento? ' + !cqDecoUp(f.x + f.dx, f.y + f.dy) + ' (deve essere false)');
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
