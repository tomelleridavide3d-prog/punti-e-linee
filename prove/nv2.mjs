// Battaglia navale nel browser (Firefox senza finestra): node prove/firefox2.mjs . prove/navale.html prove/nv2.mjs
// Foto: schieramento a meta', mira col razzo a meta' partita, esplosione del razzo, spostamento di una nave.
const D = process.env.NV_DIR || '.';
const click = `const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));`;
export default [
  [`(() => { ${click} const errs = []; window.__errs = errs; window.addEventListener('error', e => errs.push(e.message));
     click(document.querySelector('.nvOv [data-k=go]'));
     const U = NV.U, f = NVE.randomFleet(); [0, 2, 3].forEach(k => { U.pl[k].x = f[k].x; U.pl[k].y = f[k].y; U.pl[k].v = f[k].v; U.pl[k].f = f[k].v ? -1 : 1; });
     document.querySelector('#nvTools [data-p=clr]'); NV.U.pl = U.pl; document.querySelector('#nvFire').click; return 'schieramento'; })()`, 300],
  [`(() => { const U = NV.U; U.pl.forEach(()=>{}); window.dispatchEvent(new Event('resize')); return U.pl.filter(s => s.x >= 0).length; })()`, 300, D + '/nv_1_schiera.png'],
  // tutta la flotta a caso, si salpa, 14 turni veloci
  [`(async () => { ${click} click(document.querySelector('#nvTools [data-p=rnd]')); window.__NVFIRST = 0; window.__NVFAST = true; click(document.querySelector('#nvFire'));
     const sl = ms => new Promise(r => setTimeout(r, ms)), U = NV.U;
     for (let t = 0; t < 14; t++) { let g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 400) await sl(10);
       const V = U.G.P[0].V; let id; do { id = Math.floor(Math.random() * 100); } while (V[id] === 2 || V[id] === 4);
       U.tool = 'shot'; U.aim = { x: id % 10, y: (id / 10) | 0 }; click(document.querySelector('#nvFire')); await sl(20); }
     let g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 400) await sl(10);
     window.__NVFAST = false; click(document.querySelector('#nvTools [data-t=rocket]')); await sl(400); U.aim = { x: 4, y: 5 }; NV.U && document.querySelector('#nvTools [data-t=rocket]');
     return { tn: U.G.tn, errs: window.__errs }; })()`, 200],
  [`(() => { const U = NV.U; U.aim = { x: 4, y: 5 }; U.tool = 'rocket'; window.dispatchEvent(new Event('resize')); return document.querySelector('#nvHint').textContent; })()`, 400, D + '/nv_2_mira.png'],
  [`(() => { document.querySelector('#nvFire').click(); return 'fuoco'; })()`, 1180, D + '/nv_3_razzo.png'],
  [`(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)), U = NV.U; window.__NVFAST = true; let g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 600) await sl(10); window.__NVFAST = false;
     document.querySelector('#nvTools [data-t=move]').click(); await sl(500);
     const k = U.mine.findIndex((s, j) => !s.sunk && NVE.movesOf(U.G, 0, j).length); U.sel = k; U.moves = NVE.movesOf(U.G, 0, k); U.mvDest = U.moves[0];
     window.dispatchEvent(new Event('resize')); return { k, errs: window.__errs }; })()`, 400, D + '/nv_4_sposta.png'],
];
