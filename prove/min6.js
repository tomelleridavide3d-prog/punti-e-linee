// Il Minotauro: scenetta d'uscita (foto a meta') e frasi di fine partita. uso: node prove/cdp.mjs . prove/min6.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { minotauro: { tm: 2, n: 8, mino: 'c', wall: 60, time: 420, map: 'labirinto', fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=minotauro]').click(); await w(2500);
  $('#lbGo').click(); await w(4000);
  const G = cq.g, me = G.me, M = G.chars.find(c => c.mino), e = CQ_MAP.exit;
  for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; }
  // statistiche finte per vedere le frasi
  const ex = G.chars.filter(c => !c.mino && c !== me); ex[0].fred = 2; ex[1].tp = 3; ex[2].hdT = 75; ex[3].tfc = 1; ex[3].alive = false; ex[3].cg = 1; M.ct = 2;
  G.fc[me.t] = 15; G.cs[0] = G.cs[1] = G.cs[2] = G.cs[3] = me.t; G.open[me.t] = 1;
  const q = cqSpot(Math.floor(e.x), Math.floor(e.y)); M.x = q.x + 1.5; M.y = q.y + 1; cq.x = e.x; cq.y = e.y;
  await w(1800);
  out.push('scena: ' + !!G.esc + ' md ' + (G.esc && G.esc.md));
  return out;
})()
