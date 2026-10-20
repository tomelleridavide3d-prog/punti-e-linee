// Caccia al mammut, giro 5: prova delle regole una per una (senza il ragionamento del computer).
// 1) lance da sole: la vita si ferma alla soglia; 2) 4 cacciatori intorno + urlo = CIRCONDATO, le lance fanno 2;
// 3) fossa sulla strada + urlo dalla parte opposta = ci cade; 4) notte: sciacalli e fuoco. uso: node prove/cdp.mjs . prove/mam3.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=mammut]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.mammut = Object.assign({}, store.settings.cqModeOpt.mammut || {}, { n: 6, nights: 2 }); saveStore();
  $('#lbGo').click(); await w(1800);
  const G = cq.g, m = G.mm, X = window.__mm, toasts = [];
  cq.on = false; cancelAnimationFrame(cq.raf);
  const t0 = window.cqToast; window.cqToast = h => toasts.push(String(h).replace(/<[^>]+>/g, ''));
  for (const c of G.chars) { c.bot = false; c.path = []; }
  const HS = G.chars.filter(c => c !== G.me); cq.x = G.me.x = 3; cq.y = G.me.y = 3;
  G.time = 10; G.pre = 0;
  // un posto aperto lontano dall'acqua: cerco una cella con 9 caselle libere intorno
  const open = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!cqCellFree(x + dx, y + dy)) return false; return true; };
  let px = 0, py = 0; for (let t = 0; t < 4000; t++) { const f = cqModeFree(40); if (f && open(Math.floor(f.x), Math.floor(f.y), 9)) { px = Math.floor(f.x) + 0.5; py = Math.floor(f.y) + 0.5; break; } }
  const place = () => { m.x = px; m.y = py; m.path = []; m.st = 'graze'; m.gT = 99; m.aw = 0; m.wary = 0; m.stuckCd = 0; m.fear = []; G.traps = []; };
  const ring = (n, r, a0 = 0) => HS.forEach((c, i) => { if (i < n) { const a = a0 + i / n * Math.PI * 2; c.x = px + Math.cos(a) * r; c.y = py + Math.sin(a) * r; } else { c.x = px + 30; c.y = py + 30; } c.dn = 0; c.alive = true; c.op = null; });
  const throwAt = c => { c.sp = 3; c.thT = 0; X.doThrow(G, c, 'any'); };
  // 1) lance da sole
  place(); m.hp = m.max; ring(1, 3);
  for (let i = 0; i < 20; i++) { place(); throwAt(HS[0]); m.st = 'graze'; }
  out.push('1) lance da sole: vita ' + m.hp + '/' + m.max + ', soglia ' + X.mmFloor(m) + (m.hp === X.mmFloor(m) ? ' OK' : ' SBAGLIATO') + ' | ' + (toasts.some(t => /non bastano/.test(t)) ? 'avviso ok' : 'manca l\'avviso'));
  // 2) circondato: 4 cacciatori a 4 caselle, uno urla
  const tries = [3, 4, 5].map(n => { place(); ring(n, 4, 0.3); X.doShout(G, HS[0]); const st = m.st; HS[0].shT = 0; return n + ' cacciatori: ' + st; });
  out.push('2) accerchiamento: ' + tries.join(', '));
  place(); m.hp = m.max; ring(4, 4, 0.3); X.doShout(G, HS[0]);
  if (m.st === 'stuck') { const h0 = m.hp; throwAt(HS[1]); out.push('   circondato, una lancia: vita ' + h0 + ' -> ' + m.hp + (h0 - m.hp === 2 ? ' OK (2)' : ' SBAGLIATO'));
    for (let i = 0; i < 20 * 9; i++) { X.mmTick(G, 0.05); G.time += 0.05; } out.push('   dopo ' + 9 + ' s: stato ' + m.st + ' (deve caricare o scappare)'); }
  // 3) fossa: io urlo da ovest, la fossa e' 3 caselle a est
  place(); m.hp = m.max; ring(1, 4, Math.PI); G.traps = [{ id: 99, x: px + 3, y: py, used: 0 }];
  X.doShout(G, HS[0]);
  let trapT = -1; for (let i = 0; i < 20 * 8 && trapT < 0; i++) { X.mmTick(G, 0.05); G.time += 0.05; if (m.st === 'trap') trapT = i * 0.05; }
  out.push('3) fossa: ' + (trapT >= 0 ? 'ci cade dopo ' + trapT.toFixed(1) + ' s OK' : 'NON ci cade (stato ' + m.st + ', distanza ' + Math.hypot(m.x - px - 3, m.y - py).toFixed(1) + ')'));
  if (m.st === 'trap') { let n = 0; ring(4, 3); m.x = px + 3; m.y = py; while (m.st !== 'dead' && n < 10) { throwAt(HS[n % 4]); n++; } out.push('   nella fossa: abbattuto con ' + n + ' lance (vita piena ' + m.max + ')'); }
  // 4) notte: fuoco al massimo, tutti accanto alle fiamme; quanto dura il fuoco senza legna e quando attaccano gli sciacalli
  const cyc0 = X.cyc(G); G.time = 120 + (G.time - cyc0) - 2; G.fuel = 70; G.ph = 0; m.st = 'sleep'; m.x = px; m.y = py;
  const F = { x: CQ_MAP.camp.x + 0.5, y: CQ_MAP.camp.y + 0.5 };
  G.chars.forEach((c, i) => { const a = i * 1.1; c.x = F.x + Math.cos(a) * 1.6; c.y = F.y + Math.sin(a) * 1.6; c.dn = 0; c.alive = true; c.logs = 0; });
  let off = -1, firstBite = -1; const t1 = G.time;
  for (let i = 0; i < 20 * 55; i++) { cqModeTick(0.05); if (off < 0 && G.fuel <= 0) off = G.time - t1; if (firstBite < 0 && G.chars.some(c => c.dn)) firstBite = G.time - t1; }
  out.push('4) notte senza legna: sciacalli ' + G.jk.length + ', fuoco spento dopo ' + (off < 0 ? 'mai' : off.toFixed(0) + ' s') + ', primo morso dopo ' + (firstBite < 0 ? 'mai' : firstBite.toFixed(0) + ' s') + ', a terra ' + G.chars.filter(c => c.dn).length);
  window.cqToast = t0;
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
