// Battaglia navale, comandi veri: node prove/firefox2.mjs . prove/navale.html prove/nv4.mjs
// Trascina le 5 navi dal vassoio al mare, gira una nave col tocco, salpa, sposta una nave coi tocchi (nave + punto verde + Sposta qui).
export default [
  [`(async () => {
    const errs = []; window.addEventListener('error', e => errs.push(e.message));
    const sl = ms => new Promise(r => setTimeout(r, ms)), click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click(document.querySelector('.nvOv [data-k=go]')); await sl(50);
    const U = NV.U, r = () => U.cv.getBoundingClientRect(), P = (x, y) => ({ clientX: r().left + x * U.k, clientY: r().top + y * U.k, bubbles: true, pointerId: 1, pointerType: 'mouse' });
    const ev = (t, x, y) => U.cv.dispatchEvent(new PointerEvent(t, P(x, y)));
    const B = U.L.big, c = B.c, out = {};
    // trascina ogni nave dal vassoio alla riga 2k (colonna 1)
    for (let k = 0; k < 5; k++) {
      const L = U.L.lo, tx = L.x + [10, 174, 10, 138, 240][k] + 5, ty = L.y + [8, 8, 78, 78, 78][k] + 5;
      ev('pointerdown', tx, ty); ev('pointermove', tx + 20, ty - 20);
      const gx = B.x + 1 * c + 5, gy = B.y + (2 * k) * c + 5; ev('pointermove', gx, gy); ev('pointerup', gx, gy);
    }
    out.placed = U.pl.map(s => [s.x, s.y, s.v]);
    out.salpaOff = document.querySelector('#nvFire').disabled;
    // tocco sulla motovedetta (riga 8): gira in verticale
    ev('pointerdown', B.x + 1.5 * c, B.y + 8.5 * c); ev('pointerup', B.x + 1.5 * c, B.y + 8.5 * c);
    out.rot = [U.pl[4].x, U.pl[4].y, U.pl[4].v];
    // nave trascinata fuori dal mare torna nel vassoio
    ev('pointerdown', B.x + 1.5 * c, B.y + 0.5 * c); ev('pointermove', B.x + 40, B.y + 300); ev('pointermove', 100, U.L.lo.y + 30); ev('pointerup', 100, U.L.lo.y + 30);
    out.back = U.pl[0].x; out.salpa4 = document.querySelector('#nvFire').textContent;
    click(document.querySelector('#nvTools [data-p=rnd]')); out.rnd = U.pl.every(s => s.x >= 0);
    window.__NVFIRST = 0; window.__NVFAST = true; click(document.querySelector('#nvFire'));
    let g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 500) await sl(10);
    click(document.querySelector('#nvTools [data-t=move]')); await sl(50);
    const k = U.mine.findIndex((s, j) => NVE.movesOf(U.G, 0, j).length), s = U.mine[k], m = NVE.movesOf(U.G, 0, k)[0];
    ev('pointerdown', B.x + (s.x + 0.5) * c, B.y + (s.y + 0.5) * c); ev('pointerup', B.x + (s.x + 0.5) * c, B.y + (s.y + 0.5) * c);
    const dx = B.x + (m.x + (s.v ? 0.5 : s.n / 2)) * c, dy = B.y + (m.y + (s.v ? s.n / 2 : 0.5)) * c;
    ev('pointerdown', dx, dy); ev('pointerup', dx, dy);
    out.dest = U.mvDest && [U.mvDest.x, U.mvDest.y]; out.want = [m.x, m.y]; out.btn = document.querySelector('#nvFire').textContent;
    click(document.querySelector('#nvFire'));
    g = 0; while ((U.busy || U.G.turn !== 0) && g++ < 500) await sl(10);
    const S = U.G.P[0].ships[k]; out.moved = [S.x, S.y, S.fu]; out.view = U.view;
    out.errs = errs; return JSON.stringify(out);
  })()`, 300],
];
