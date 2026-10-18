// Il Minotauro: fluidita' (fotogrammi veri per 20 s, anche con un cambio dei muri) e posa per la foto.
// uso: CPU=4 node prove/cdp.mjs . prove/min2.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { minotauro: { tm: 2, n: 8, mino: 'c', wall: 30, time: 420, map: 'labirinto', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=minotauro]').click(); await w(2500);
  let t0 = performance.now(); $('#lbGo').click(); await w(200); out.push('avvio ' + Math.round(performance.now() - t0) + ' ms');
  await w(3500);
  const G = cq.g;
  // fotogrammi: il mio personaggio cammina avanti e indietro lungo un corridoio
  const fr = []; let last = performance.now(), run = true;
  const tick = t => { if (!run) return; fr.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  for (let i = 0; i < 40; i++) { const k = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][Math.floor(i / 5) % 4]; cq.keys[k] = true; await w(500); cq.keys[k] = false; }
  run = false;
  fr.sort((a, b) => a - b);
  out.push('fotogrammi ' + fr.length + ', mediana ' + fr[fr.length >> 1].toFixed(1) + ' ms, 99% ' + fr[Math.floor(fr.length * 0.99)].toFixed(1) + ', lenti (>34 ms) ' + fr.filter(v => v > 34).length + ', spostamenti ' + G.wv);
  // posa: io vicino a una torcia, il Minotauro poco lontano, due segni col gesso, la mappina con un quarto svelato
  const M = CQ_MAP, f0 = M.frag[0], sp = cqSpot(f0.cx, f0.cy);
  cq.x = sp.x; cq.y = sp.y; G.me.x = cq.x; G.me.y = cq.y;
  const mn = G.chars.find(c => c.mino); mn.think = 1e9; mn.path = [];
  for (const [dx, dy] of [[2, 0], [0, 2], [-2, 0], [2, 1], [1, 2]]) if (cqCellFree(Math.floor(cq.x + dx), Math.floor(cq.y + dy))) { mn.x = Math.floor(cq.x + dx) + 0.5; mn.y = Math.floor(cq.y + dy) + 0.5; break; }
  for (const c of G.chars) if (c.bot && !c.mino) { c.think = 1e9; c.path = []; }
  const mate = G.chars.find(c => c.bot && !c.mino && c.t === G.me.t); if (mate) { mate.x = cq.x - 1; mate.y = cq.y + 0.2; }
  G.fc[G.me.t] = 2; G.cs[1] = G.me.t; for (let i = 0; i < 30; i++) { G.M.local(G, 0.25); }
  cq.wdx = 0; cq.wdy = 1; $('#mnChalk').click(); cq.y -= 1; cq.wdx = 1; cq.wdy = 0; $('#mnChalk').click(); cq.y += 1;
  G.next = 1e9; G.left = 1e9;
  await w(600);
  out.push('barra: ' + $('#cqModeBar').textContent + ' | pulsante ' + $('#cqKill').textContent + ' | gesso ' + !$('#mnChalk').hidden);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
