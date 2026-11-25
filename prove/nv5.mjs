// Battaglia navale, caccia al blocco: node prove/firefox2.mjs . prove/navale.html prove/nv5.mjs
// Tante partite con mosse umane a caso (colpi, razzi, siluri, spostamenti), prima veloci poi con le animazioni vere.
// Se il gioco resta fermo (occupato o turno del computer) per troppo tempo lo segnala con lo stato.
const run = (games, fast, maxMs) => `(async () => {
  const errs = []; window.addEventListener('error', e => errs.push('err ' + e.message + ' @' + e.lineno));
  window.addEventListener('unhandledrejection', e => errs.push('rej ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  const sl = ms => new Promise(r => setTimeout(r, ms)), click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const out = { games: 0, stuck: [], turns: 0 };
  window.__NVFAST = ${fast};
  for (let gi = 0; gi < ${games}; gi++) {
    const ov = document.querySelector('.nvOv [data-k=go]'); if (ov) click(ov); await sl(30);
    const U = NV.U;
    if (U.ph === 'place') { click(document.querySelector('#nvTools [data-p=rnd]')); click(document.querySelector('#nvFire')); }
    const t0 = Date.now(); let lastTn = -1, lastCh = Date.now();
    while (U.G && !U.G.over) {
      if (Date.now() - t0 > ${maxMs}) break;
      if (U.G.tn !== lastTn) { lastTn = U.G.tn; lastCh = Date.now(); }
      if (Date.now() - lastCh > ${fast ? 3000 : 25000}) { out.stuck.push({ g: gi, tn: U.G.tn, turn: U.G.turn, busy: U.busy, evi: U.evi, ev: U.G.ev.length, last: U.G.ev.slice(-4).map(e => e.t + (e.k || '') + (e.r || '')), act: U.act.map(a => [a.d, a.t, String(a.up).slice(0, 60)]), raf: U.raf, last2: U.last, now: performance.now() }); break; }
      if (U.busy || U.G.turn !== 0) { await sl(${fast ? 5 : 60}); continue; }
      const G = U.G, P = G.P[0], r = Math.random(), N = 10;
      let ok = false;
      if (r < 0.15) { const ks = U.mine.map((s, k) => k).filter(k => NVE.movesOf(G, 0, k).length); if (ks.length) { const k = ks[Math.floor(Math.random() * ks.length)], ms = NVE.movesOf(G, 0, k), m = ms[Math.floor(Math.random() * ms.length)]; U.tool = 'move'; U.sel = k; U.mvDest = { x: m.x, y: m.y }; ok = true; } }
      else if (r < 0.3 && NVE.canRocket(G, 0)) { U.tool = 'rocket'; U.aim = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; ok = true; }
      else if (r < 0.42 && NVE.canTorp(G, 0)) { U.tool = 'torp'; U.aim = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; ok = true; }
      if (!ok) { const c = []; for (let id = 0; id < 100; id++) if (P.V[id] !== 2 && P.V[id] !== 4) c.push(id); const id = c[Math.floor(Math.random() * c.length)]; U.tool = 'shot'; U.aim = { x: id % N, y: (id / N) | 0 }; }
      U.fire_ = 1; document.querySelector('#nvFire').disabled = false; click(document.querySelector('#nvFire')); out.turns++;
      if (!${fast} && Math.random() < 0.3) { await sl(200); U.cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 200, bubbles: true, pointerId: 1 })); }
      await sl(${fast ? 1 : 30});
    }
    out.games++;
    await sl(${fast ? 30 : 2500});
    const again = [...document.querySelectorAll('.nvOv button')].find(b => /Rivincita/.test(b.textContent)); if (again) click(again); await sl(50);
  }
  out.errs = errs.slice(0, 8); return JSON.stringify(out);
})()`;
export default [
  
  [run(3, false, 220000), 300],
];
