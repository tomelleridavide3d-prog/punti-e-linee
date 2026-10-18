// Luce "quadrata" intorno ai personaggi (aloni delle torce sommati nei riquadri ridisegnati): foto con il personaggio accanto a una torcia.
// uso: node prove/cdp.mjs . prove/luce.js foto.png   (window.__G = gioco, default minotauro)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], game = window.__G || 'minotauro';
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=' + game + ']').click(); await w(2500);
  $('#lbGo').click(); await w(4000);
  const G = cq.g;
  for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 1; c.y = 1; }
  // accanto alla prima torcia con due caselle libere davanti
  const M = CQ_MAP, tr = (M.torches || []).find(([x, y]) => cqCellFree(x, y + 1) && cqCellFree(x, y + 2));
  if (tr) { cq.x = tr[0] + 0.5; cq.y = tr[1] + 1.6; }
  if (G.M.local) G.left = 1e9; G.next = 1e9;
  await w(800);
  out.push('aloni registrati: ' + (cq.glw ? cq.glw.size : 0) + ', torcia ' + JSON.stringify(tr));
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
