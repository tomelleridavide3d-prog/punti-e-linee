// Battaglia navale, foto delle animazioni (tocchi veri sul canvas): node prove/firefox2.mjs . prove/navale.html prove/nv3.mjs
// Razzo in volo, esplosione della croce, siluro che corre, colpo del nemico sulla mia flotta.
const D = process.env.NV_DIR || '.';
const H = `const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const tap = (x, y) => { const U = NV.U, B = U.L.big, r = U.cv.getBoundingClientRect(), o = { clientX: r.left + (B.x + (x + 0.5) * B.c) * U.k, clientY: r.top + (B.y + (y + 0.5) * B.c) * U.k, bubbles: true, pointerId: 1, pointerType: 'mouse' };
    U.cv.dispatchEvent(new PointerEvent('pointerdown', o)); U.cv.dispatchEvent(new PointerEvent('pointerup', o)); };
  const myTurn = async () => { const U = NV.U; let g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 1500) await sl(10); };`;
export default [
  [`(async () => { ${H} window.__errs = []; window.addEventListener('error', e => window.__errs.push(e.message));
     click(document.querySelector('.nvOv [data-k=go]')); await sl(100); click(document.querySelector('#nvTools [data-p=rnd]'));
     window.__NVFIRST = 0; window.__NVFAST = true; click(document.querySelector('#nvFire')); const U = NV.U;
     // nemico scelto apposta: un razzo che prende la sua fregata
     for (let t = 0; t < 3; t++) { await myTurn(); const V = U.G.P[0].V; let id; do { id = Math.floor(Math.random() * 100); } while (V[id] || U.G.P[1].ships.some(s => NVE.cells(s).some(([a, b]) => b * 10 + a === id))); tap(id % 10, (id / 10) | 0); tap(id % 10, (id / 10) | 0); await sl(20); }
     await myTurn(); window.__NVFAST = false;
     const f = U.G.P[1].ships[0], c = NVE.cells(f)[1]; window.__tgt = c;
     click(document.querySelector('#nvTools [data-t=rocket]')); await sl(350); tap(c[0], c[1]);
     return { tn: U.G.tn, fire: document.querySelector('#nvFire').textContent, errs: window.__errs }; })()`, 300, D + '/nv_5_mira.png'],
  [`(() => { document.querySelector('#nvFire').click(); return NV.U.busy; })()`, 560, D + '/nv_6_volo.png'],
  [`'esplosione'`, 420, D + '/nv_7_boom.png'],
  [`'timbro'`, 500, D + '/nv_8_colpito.png'],
  [`(async () => { ${H} const U = NV.U; await myTurn();
     click(document.querySelector('#nvTools [data-t=torp]')); await sl(350); const s = U.G.P[1].ships.find(z => !z.sunk), c = NVE.cells(s)[0]; tap(c[0] <= 4 ? 0 : 9, c[1]);
     document.querySelector('#nvFire').click(); return { errs: window.__errs }; })()`, 700, D + '/nv_9_siluro.png'],
  [`(async () => { ${H} await sl(2500); const U = NV.U; let g = 0; while (U.G.turn !== 1 && g++ < 300) await sl(10); return U.view; })()`, 1150, D + '/nv_10_nemico.png'],
  [`(async () => { ${H} window.__NVFAST = true; const U = NV.U; for (let t = 0; t < 200 && !U.G.over; t++) { await myTurn(); if (U.G.over) break; const V = U.G.P[0].V; let id; do { id = Math.floor(Math.random() * 100); } while (V[id] === 2 || V[id] === 4); U.tool = 'shot'; tap(id % 10, (id / 10) | 0); tap(id % 10, (id / 10) | 0); await sl(5); }
     await sl(1500); return { over: U.G.over, win: U.G.win, box: (document.querySelector('.nvOv h2') || {}).textContent, errs: window.__errs }; })()`, 300, D + '/nv_11_fine.png'],
];
