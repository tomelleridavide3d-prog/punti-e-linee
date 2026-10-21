// Evasione passo 3: una foto con le vie di fuga (camion fermo e in arrivo, tunnel con la terra, corda, divisa, SEI FUORI). uso: node prove/cdpimg.mjs . prove/eva6.js foto.jpg
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  $('#lbGo').click(); await w(3000);
  const G = cq.g, M = CQ_MAP, me = G.me; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf); await w(100);
  const C = M.cells[me.cell];
  for (const c of G.chars) if (c.bot) { c.x = 30; c.y = 50; }
  G.gd.forEach((g, i) => { g.x = 108 + 56 + i; g.y = 59.5; });
  const V = [
    [84.5, 43.5, 60, () => { G.cam = { T: G.time - 5, st: 2 }; G.mdO = 1; }],
    [88, 42, 60, () => { G.cam = { T: G.time + 1.5, st: 1 }; }],
    [C.x0 + 2.6, C.y0 + 0.6, 200, () => { G.cam = null; G.tun[me.cell] = 1.2; G.dirt[me.cell] = 3; }],
    [30.5, 8.5, 60, () => { G.rope = [{ ix: 30.5, iy: 6.6, ox: 30.5, oy: 3.4, e: G.time + 60 }]; }],
    [50, 40, 60, () => { me.dv = 1; G.rope = []; }],
    [25.5, 2.8, 60, () => { me.dv = 0; me.out = 'tun'; G.myOut = performance.now() - 800; }]];
  const cv = document.getElementById('cqCanvas'), cw = 412, ch = 860, cols = 3, rows = Math.ceil(V.length / cols);
  const out = document.createElement('canvas'); out.width = cw * cols; out.height = ch * rows; const o = out.getContext('2d');
  for (let i = 0; i < V.length; i++) {
    const [x, y, t, fn] = V[i]; G.time = t; G.pc = window.__ev.cyc(G); fn(); cq.x = x; cq.y = y; G.me.x = x; G.me.y = y; G.M.local(G, 0.016); G.zn = null; G.fade = 0;
    cqHudFast(); cqDraw(); o.drawImage(cv, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    o.fillStyle = '#ff0'; o.font = '700 16px system-ui'; o.fillText((i + 1) + ')', (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20);
  }
  return { img: out.toDataURL('image/jpeg', 0.8), out: 'ok ' + V.length + ' errori: ' + (localStorage.getItem('errLog') || '').slice(0, 400) };
})()
