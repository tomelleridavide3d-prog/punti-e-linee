// Nascondino: fantasmino (telecamera libera), campanella, obbligo di muoversi (node prove/cdp.mjs . prove/nas4.js foto.png)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], bar = id => { const b = document.getElementById(id); return b && !b.hidden ? b.textContent : '-'; };
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { nascondino: { time: 240, seek: 1, hide: 20, me: 'h', dark: 'on', map: 'studio', n: 8, fill: true } }); saveStore();
  document.querySelector('#tkBody [data-g=nascondino]').click(); await w(1500);
  $('#lbGo').click(); await w(1200);
  const G = cq.g, me = G.me;
  out.push('pulsanti senza oggetto: ' + bar('nsPick') + ' | ' + bar('nsGhost'));
  document.querySelector('#tkBody [data-v="5"]').click(); await w(400);
  out.push('con oggetto: ' + bar('nsPick') + ' | ' + bar('nsGhost') + ' | ' + bar('nsBell'));
  for (const c of G.chars) if (c.bot && c.r === 1) { c.think = 999; c.path = []; c.x = 50; c.y = 40; }
  G.time = G.opt.hide + 1; await w(300);
  const bx = cq.x, by = cq.y;
  document.getElementById('nsGhost').click(); await w(200);
  out.push('fantasmino: cam ' + !!cq.cam + ' | ' + bar('nsPick') + ' | ' + bar('nsGhost') + ' | ' + bar('nsBell'));
  // la telecamera vola con il joystick (finto: tasto freccia) e io resto fermo
  cq.keys = { arrowright: true }; await w(1500); cq.keys = {};
  out.push('dopo 1,5 s di freccia: cam ' + cq.cam.x.toFixed(1) + ',' + cq.cam.y.toFixed(1) + ' | io ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (prima ' + bx.toFixed(1) + ',' + by.toFixed(1) + ') | nel gioco ' + me.x.toFixed(1) + ',' + me.y.toFixed(1));
  if (window.__SHOT) return out;
  const n0 = G.lgN; document.getElementById('nsBell').click(); await w(300);
  const e = G.lg[G.lg.length - 1];
  out.push('campanella: evento ' + (G.lgN > n0 ? e.k + ' b=' + e.b + ' a ' + e.x + ',' + e.y : 'NIENTE') + ' (cam ' + cq.cam.x.toFixed(1) + ',' + cq.cam.y.toFixed(1) + ') | pulsante ora ' + bar('nsBell') + ' | seconda volta: ' + (document.getElementById('nsBell').click(), G.lgN - n0) + ' eventi');
  document.getElementById('nsGhost').click(); await w(200);
  out.push('torna: cam ' + !!cq.cam + ' | ' + bar('nsGhost'));
  // obbligo di muoversi: salto a meta' caccia, fermo
  const h = G.opt.hide + G.opt.time / 2; G.time = h + 16; await w(300);
  out.push('fermo 16 s dopo meta: ' + $('#cqCount').textContent + ' | suona ' + me.loud);
  G.time = h + 26; await w(300);
  out.push('fermo 26 s: ' + $('#cqCount').textContent + ' | suona ' + me.loud + ' | cerchio rosso ' + !!G.zw);
  if (window.__SHOT2) return out;
  const P = CQ_PROPS.find(p => cqCellFree(p[1] + 3, p[2]) && cqCellFree(p[1] + 2, p[2])); cq.x += 0; const ox = cq.x; cq.x = Math.floor(cq.x) + 0.5; cq.y = Math.floor(cq.y) + 0.5;
  for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (cqCellFree(Math.floor(cq.x + dx), Math.floor(cq.y + dy))) { cq.x += dx; cq.y += dy; break; }
  await w(300);
  out.push('spostato di 3 caselle (deve suonare ancora): suona ' + me.loud + ' | ' + $('#cqCount').textContent);
  { const f = []; for (let y = 0; y < CQ_H; y++) for (let x = 0; x < CQ_W; x++) if (cqCellFree(x, y) && Math.hypot(x + 0.5 - me.ax, y + 0.5 - me.ay) > 8 && Math.hypot(x + 0.5 - me.ax, y + 0.5 - me.ay) < 10) f.push([x, y]); cq.x = f[0][0] + 0.5; cq.y = f[0][1] + 0.5; }
  await w(300); out.push('spostato oltre 7 caselle: suona ' + me.loud + ' | cerchio verde ' + !!G.zg + ' | ' + $('#cqCount').textContent);
  // computer: chi sta per suonare si sposta (simulo 60 s dopo meta')
  const hs = G.chars.filter(c => c.bot && c.r === 0);
  const pos0 = hs.map(c => [c.x, c.y]);
  cq.on = false; cancelAnimationFrame(cq.raf);
  G.time = h; for (let i = 0; i < 1200 && G.phase === 'play'; i++) { cqModeTick(0.05); cq.x = me.x; cq.y = me.y; }
  cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  out.push('computer dopo 60 s da meta: spostati ' + hs.filter((c, i) => Math.hypot(c.x - pos0[i][0], c.y - pos0[i][1]) > 1.6).length + '/' + hs.length + ', suonano adesso ' + hs.filter(c => c.loud).length);
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
