// air hockey online con la rete di un telefono (24-10-2026): ritardo finto 150-300 ms sulle scritture del tavolo, manopole mosse da sole.
// Misura su ogni telefono: SALTI del disco (spostamento in un fotogramma molto oltre la velocita' massima), cambi di chi comanda il disco, gol.
// uso: node prove/cdp2.mjs . prove/ahrete.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const lag = `(() => { const put = window.cqNetPut; window.cqNetPut = (p, v) => { if (p.indexOf('/ah/') < 0) return put(p, v); const at = Math.max(window.__lt || 0, performance.now() + 150 + Math.random() * 150); window.__lt = at; setTimeout(() => put(p, v), at - performance.now()); }; return 'rete lenta'; })()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAhA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sfida = `(async () => { cq.x = CQ_W - 2 - 3.8; cq.y = 8.5; await new Promise(r => setTimeout(r, 600)); const B = document.getElementById('tvB_ah'); if (!B || B.hidden) return 'pulsante non visibile'; B.click(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzAhB')); if (!b) return 'amico non in lista'; b.click(); return 'sfida mandata'; })()`;
const accetta = `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; m.querySelector('[data-k=ok]').click(); return 'accettata'; })()`;
const auto = `(() => { clearInterval(window.__a); const T = AH.T, cv = document.querySelector('.tvRoot canvas'), r = cv.getBoundingClientRect(); const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, pointerType: 'touch' }));
  const scr = (x, y) => { const k = T.k; return T.me === 1 ? [T.ox + (50 - x) * k, T.oy + (100 - y) * k] : [T.ox + x * k, T.oy + y * k]; };
  const home = T.me ? 12 : 88, mine = y => T.me ? y < 50 : y > 50; ev('pointerdown', ...scr(25, home));
  window.__a = setInterval(() => { const A = T.ah; let tx = A.px + (Math.random() - 0.5) * 6, ty = A.py + (T.me ? -3 : 3); if (!mine(A.py)) { tx = 25 + (A.px - 25) * 0.4; ty = home; } ev('pointermove', ...scr(tx, ty)); }, 40);
  // misura: posizione DISEGNATA del disco a ogni fotogramma
  window.__m = { f: 0, j: 0, big: 0, own: 0, lo: null }; let lp = null, lt = 0;
  const f = now => { const T2 = AH.T; if (!T2 || T2 !== T) return; const A = T.ah, x = A.px + (A.dx || 0), y = A.py + (A.dy || 0), M = window.__m;
    if (lp && T.S.rid === lp.rid && !A.wait) { const dt = (now - lt) / 1000, d = Math.hypot(x - lp.x, y - lp.y); M.f++; if (d > 175 * dt * 3 + 2) { M.j++; M.big = Math.max(M.big, Math.round(d * 10) / 10); if (d > 8 && (M.ex = M.ex || []).length < 8) M.ex.push([Math.round(lp.x), Math.round(lp.y), '->', Math.round(x), Math.round(y), 'ow', A.ow, 'ep', A.ep, 'v', Math.round(A.vx), Math.round(A.vy), 'wait', A.wait].join(' ')); } }
    const ow = A.ow != null ? A.ow : (A.py > 50 ? 0 : 1); if (M.lo != null && ow !== M.lo) M.own++; M.lo = ow;
    lp = { x, y, rid: T.S.rid }; lt = now; requestAnimationFrame(f); }; requestAnimationFrame(f);
  return 'manopola da sola'; })()`;
const st = who => `(() => { const T = AH.T; if (!T) return '${who}: nessuna partita'; const M = window.__m; return '${who}: punteggio ' + T.S.sc.join('-') + ' | fotogrammi ' + M.f + ', SALTI del disco ' + M.j + ' (il piu grande ' + M.big + ' unita, tavolo 50x100), cambi di chi comanda ' + M.own + ' | ' + (M.ex || []).join(' ; '); })()`;
export default [
  [0, name('zzAhA'), 0], [1, name('zzAhB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, sfida, 2500], [1, accetta, 2500],
  [0, lag, 0], [1, lag, 0],
  [0, auto, 0], [1, auto, 40000],
  [0, st('A (banco)'), 0], [1, st('B (amico)'), 0],
  [0, `(async () => { clearInterval(window.__a); window.confirm = () => true; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 1500)); return 'A esce'; })()`, 0],
  [1, `(() => { clearInterval(window.__a); cqNetLeave(); return 'errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 500],
];
