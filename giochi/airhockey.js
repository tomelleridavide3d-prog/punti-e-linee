// ==== AIR HOCKEY NELLA HALL (23-10-2026, piano in CLAUDE.md "PIANO PASSATEMPI DELLA HALL", sessione 2) ====
// Tavolo bucherellato nell'angolo giochi (prop 'hockey', x R-6..R-5, y 7-9). Visuale a tutto schermo dall'alto: la mia porta sempre in basso.
// Muovi la manopola col dito (solo nella tua meta'), il disco scivola, vince chi arriva a 7. Contro il computer o un amico; gli altri guardano.
// Rete: il disco lo calcola il telefono del giocatore nella cui meta' si trova (chi colpisce lo sente subito, senza ritardo); ognuno manda ogni 50 ms
// con cqNetPut la sua manopola (e il disco quando e' suo) in cq/<set>/ah/<banco>/r/<posto> {m, p, q, t}. Il gol lo segnala chi ha il disco
// (azione {k:'goal', s: chi segna, q: numero del disco}); il banco (giochi/lib/tavolo.js) conta i punti e rimette il disco a chi ha subito.
// Coordinate del tavolo: 50 x 100, il posto 0 difende la porta in basso (y = 100), il posto 1 quella in alto (y = 0).
window.AH = (() => {
  const W = 50, H = 100, MR = 4.4, PR = 2.7, GW = 8.5, WIN = 7, VP = 175, MSP = 240, DT = 1 / 240;
  const r2 = v => Math.round(v * 100) / 100;
  function newMatch(S0) { const f = S0.f == null ? 0 : 1 - S0.f; return { sc: [0, 0], rid: 1, serve: f, last: null, win: null, why: '' }; }
  function act(T, seat, a) {
    const S = T.S;
    if (a.k !== 'goal' || S.ph !== 'play' || a.q !== S.rid) return false;
    const s = a.s ? 1 : 0; S.sc[s]++; S.rid++; S.serve = 1 - s; S.last = { by: s, rid: S.rid };
    if (S.sc[s] >= WIN) { S.ph = 'end'; S.win = s; }
    return true;
  }
  const home = s => [25, s ? 12 : 88];
  function reset(T) {
    const A = T.ah, S = T.S;
    A.rid = S.rid; A.px = 25; A.py = S.serve ? 32 : 68; A.vx = 0; A.vy = 0; A.sent = 0; A.wait = 0;
    A.m = [home(0), home(1)]; A.mv = [[0, 0], [0, 0]]; A.tgt = null;
  }
  function view(T) {
    const r = T.root;
    r.style.background = 'radial-gradient(ellipse at 50% 45%,#22344a,#0a1018)';
    r.innerHTML = '<canvas></canvas><div class="tvTop"></div><div class="tvHint"></div>';
    T.cv = r.querySelector('canvas'); T.ah = { rep: [null, null], fx: [], lastT: 0 }; reset(T);
    const cv = T.cv, tgt = e => { const [x, y] = toT(T, e.offsetX, e.offsetY); T.ah.tgt = [x, y]; };
    cv.addEventListener('pointerdown', e => { if (T.me < 0) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); tgt(e); });
    cv.addEventListener('pointermove', e => { if (T.me >= 0 && (e.buttons || e.pressure > 0 || e.pointerType === 'touch')) tgt(e); });
    T.ro = () => { if (T.root === r) size(T); }; window.addEventListener('resize', T.ro);
    size(T);
  }
  function size(T) {
    const cv = T.cv, dpr = Math.min(window.devicePixelRatio || 1, 2.5), Wp = cv.clientWidth, Hp = cv.clientHeight;
    cv.width = Math.round(Wp * dpr); cv.height = Math.round(Hp * dpr); T.W = Wp; T.H = Hp; T.dpr = dpr;
    const k = Math.min((Wp - 30) / (W + 6), (Hp - 140) / (H + 6)); T.k = k; T.ox = Wp / 2 - W * k / 2; T.oy = 72 + (Hp - 140 - (H + 6) * k) / 2 + 3 * k;
  }
  const flip = T => T.me === 1;
  const toS = (T, x, y) => flip(T) ? [T.ox + (W - x) * T.k, T.oy + (H - y) * T.k] : [T.ox + x * T.k, T.oy + y * T.k];
  const toT = (T, px, py) => { const x = (px - T.ox) / T.k, y = (py - T.oy) / T.k; return flip(T) ? [W - x, H - y] : [x, y]; };
  const clampM = (s, x, y) => [Math.max(MR, Math.min(W - MR, x)), s ? Math.max(MR, Math.min(H / 2 - MR, y)) : Math.max(H / 2 + MR, Math.min(H - MR, y))];
  function raw(T, t) {
    const R = t && t.r; if (!R || !T.ah) return;
    for (const s of [0, 1]) { const v = R[s]; if (v && v.t && (!T.ah.rep[s] || T.ah.rep[s].t !== v.t)) T.ah.rep[s] = Object.assign({ at: performance.now() }, v); }
  }
  function render(T) {
    if (!T.root || !T.cv) return;
    const S = T.S, A = T.ah;
    if (S.rid !== A.rid) {
      if (S.last && S.last.rid === S.rid) { A.fx.push({ t0: performance.now(), txt: S.last.by === T.me ? '🎉 GOL!' : T.me < 0 ? 'GOL di ' + S.n[S.last.by] + '!' : '😱 Gol subito!', mine: S.last.by === T.me }); thud(1, 120); [0, 4, 7].forEach((n, i) => beep(440 * Math.pow(2, n / 12), 0.14, 0.04, i * 0.08, 'square')); }
      reset(T);
    }
    const top = T.root.querySelector('.tvTop'), pl = i => `<div class="pl">${i === T.me ? '⭐ ' : ''}${esc(S.n[i] || '?')} <b>${S.sc[i]}</b></div>`, a = flip(T) ? 1 : 0;
    top.innerHTML = pl(1 - a) + `<div class="mid">🏒 a ${WIN}${T.watch ? '<br>👀 ' + T.watch : ''}</div>` + pl(a);
    const h = T.root.querySelector('.tvHint'), ht = S.ph !== 'play' ? '' : T.me < 0 ? '👀 Stai guardando.' : 'Muovi la manopola col dito e colpisci il disco: chi arriva a ' + WIN + ' vince!';
    if (h.innerHTML !== ht) h.innerHTML = ht;
    BAH.endBox(esc(S.n[0]) + ' <b>' + S.sc[0] + '</b> · ' + esc(S.n[1]) + ' <b>' + S.sc[1] + '</b>');
    if (S.ph === 'play' && !T.raf) loop(T);
  }
  // ---- fisica del disco ----
  function collide(A, s) {
    const [mx, my] = A.m[s], [vx, vy] = A.mv[s], dx = A.px - mx, dy = A.py - my, d = Math.sqrt(dx * dx + dy * dy);
    if (d >= MR + PR || d === 0) return false;
    const nx = dx / d, ny = dy / d; A.px = mx + nx * (MR + PR); A.py = my + ny * (MR + PR);
    const rv = (A.vx - vx) * nx + (A.vy - vy) * ny;
    if (rv < 0) { A.vx -= 1.9 * rv * nx; A.vy -= 1.9 * rv * ny; const s2 = Math.sqrt(A.vx * A.vx + A.vy * A.vy); if (s2 > VP) { A.vx *= VP / s2; A.vy *= VP / s2; } return -rv; }
    return false;
  }
  function physics(T, dt) {   // ritorna chi ha segnato (0/1) o -1
    const A = T.ah; let n = Math.ceil(dt / DT), hit = 0;
    const st = dt / n;
    while (n--) {
      const k = Math.max(0, 1 - 0.22 * st); A.vx *= k; A.vy *= k;
      A.px += A.vx * st; A.py += A.vy * st;
      if (A.px < PR) { A.px = 2 * PR - A.px; A.vx = -A.vx * 0.92; hit = Math.max(hit, Math.abs(A.vx) * 0.5); }
      if (A.px > W - PR) { A.px = 2 * (W - PR) - A.px; A.vx = -A.vx * 0.92; hit = Math.max(hit, Math.abs(A.vx) * 0.5); }
      const inMouth = Math.abs(A.px - 25) < GW - PR * 0.6;
      if (A.py < PR && !inMouth) { A.py = 2 * PR - A.py; A.vy = -A.vy * 0.92; hit = Math.max(hit, Math.abs(A.vy) * 0.5); }
      if (A.py > H - PR && !inMouth) { A.py = 2 * (H - PR) - A.py; A.vy = -A.vy * 0.92; hit = Math.max(hit, Math.abs(A.vy) * 0.5); }
      if (A.py < -PR) return 0;   // nella porta in alto: segna il posto 0
      if (A.py > H + PR) return 1;
      for (const s of [0, 1]) { const h = collide(A, s); if (h) { hit = Math.max(hit, h); A.hitS = s; } }
    }
    if (hit > 8) { beep(1100 + Math.random() * 200, 0.03, Math.min(0.06, hit / 2500), 0, 'square'); thud(Math.min(0.5, hit / 250), 500); }
    return -1;
  }
  function moveMallet(A, s, tx, ty, sp, dt) {
    const [mx, my] = A.m[s], [cx, cy] = clampM(s, tx, ty), dx = cx - mx, dy = cy - my, d = Math.sqrt(dx * dx + dy * dy), mv = Math.min(d, sp * dt);
    const nx = d ? mx + dx / d * mv : mx, ny = d ? my + dy / d * mv : my;
    A.mv[s] = [(nx - mx) / dt, (ny - my) / dt]; A.m[s] = [nx, ny];
  }
  // il Conte: difende davanti alla porta, attacca quando il disco e' lento nella sua meta'
  function aiMove(T, dt) {
    const A = T.ah, s = 1, slow = Math.abs(A.vy) < 45, mine = A.py < H / 2;
    let tx, ty;
    if (mine && (slow || A.vy < 0)) { const gx = 25 - A.px, gy = H - A.py, l = Math.hypot(gx, gy) || 1; tx = A.px - gx / l * (MR + PR - 1.5); ty = A.py - gy / l * (MR + PR - 1.5); if (Math.hypot(A.m[1][0] - tx, A.m[1][1] - ty) < 2) { tx = A.px + gx / l * 4; ty = A.py + gy / l * 4; } }
    else { tx = 25 + (A.px - 25) * 0.6; ty = 13; }
    moveMallet(A, s, tx, ty, 95, dt);   // un po' piu' lento di una mano vera: si puo' battere
  }
  function loop(T) {
    cancelAnimationFrame(T.raf); T.ah.lastT = performance.now();
    const step = now => {
      if (BAH.T !== T || !T.root) { T.raf = 0; return; }
      const A = T.ah, S = T.S, dt = Math.min(0.05, (now - A.lastT) / 1000); A.lastT = now;
      if (S.ph === 'play') {
        const solo = S.ai >= 0, me = T.me, opp = 1 - me;
        if (me >= 0) { const t = A.tgt || A.m[me]; moveMallet(A, me, t[0], t[1], MSP, dt); }
        if (solo) aiMove(T, dt);
        else for (const s of [0, 1]) if (s !== me) { const R = A.rep[s]; if (R && R.m) { const [mx, my] = A.m[s], k = Math.min(1, dt * 18), nx = mx + (R.m[0] - mx) * k, ny = my + (R.m[1] - my) * k; A.mv[s] = [(nx - mx) / dt, (ny - my) / dt]; A.m[s] = [nx, ny]; } }
        const owner = A.py > H / 2 ? 0 : 1, simMe = solo || (me >= 0 && owner === me);
        if (A.wait) { /* gol segnalato: aspetto il banco */ }
        else if (simMe) {
          const g = physics(T, dt);
          if (g >= 0) { A.wait = 1; if (solo) BAH.act({ k: 'goal', s: g, q: S.rid }); else BAH.act({ k: 'goal', s: g, q: S.rid }); }
        } else {
          const R = A.rep[owner];
          if (R && R.p && R.q === S.rid) { const age = Math.min(0.3, (now - R.at) / 1000 + 0.05), tx = R.p[0] + R.p[2] * age, ty = R.p[1] + R.p[3] * age, far = Math.hypot(tx - A.px, ty - A.py) > 6; A.px = far ? tx : A.px + (tx - A.px) * 0.5; A.py = far ? ty : A.py + (ty - A.py) * 0.5; A.vx = R.p[2]; A.vy = R.p[3]; }
          else physics(T, dt);
        }
        if (!solo && me >= 0 && cq.net && now - A.sent > 50) {
          A.sent = now;
          cqNetPut(`cq/${cq.net.code}/ah/${T.key}/r/${me}`, { m: [r2(A.m[me][0]), r2(A.m[me][1])], p: owner === me && !A.wait ? [r2(A.px), r2(A.py), r2(A.vx), r2(A.vy)] : 0, q: S.rid, t: Date.now() });
        }
      }
      draw(T);
      if (S.ph === 'play' || A.fx.length) T.raf = requestAnimationFrame(step); else T.raf = 0;
    };
    T.raf = requestAnimationFrame(step);
  }
  function draw(T) {
    const g = T.cv.getContext('2d'), k = T.k, A = T.ah;
    g.setTransform(T.dpr, 0, 0, T.dpr, 0, 0); g.clearRect(0, 0, T.W, T.H);
    const [x0, y0] = toS(T, flip(T) ? W : 0, flip(T) ? H : 0), [x1, y1] = toS(T, flip(T) ? 0 : W, flip(T) ? 0 : H);
    // bordo rosso e blu, piano bianco-azzurro con i forellini
    g.fillStyle = '#c8303a'; cqRR(g, x0 - 3 * k, y0 - 3 * k, x1 - x0 + 6 * k, (y1 - y0) / 2 + 3 * k, 12); g.fill();
    g.fillStyle = '#2a5ad8'; cqRR(g, x0 - 3 * k, (y0 + y1) / 2, x1 - x0 + 6 * k, (y1 - y0) / 2 + 3 * k, 12); g.fill();
    const sg = g.createLinearGradient(0, y0, 0, y1); sg.addColorStop(0, '#e8f2fa'); sg.addColorStop(0.5, '#f8fcff'); sg.addColorStop(1, '#e8f2fa');
    g.fillStyle = sg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = 'rgba(90,130,170,.25)'; for (let y = 2.5; y < H; y += 2.5) for (let x = 2.5 + ((y / 2.5) % 2) * 1.25; x < W; x += 2.5) { const [px, py] = toS(T, x, y); g.fillRect(px - 0.6, py - 0.6, 1.2, 1.2); }
    g.strokeStyle = 'rgba(200,48,58,.7)'; g.lineWidth = 2; const [cl0, cly] = toS(T, 0, H / 2), [cl1] = toS(T, W, H / 2); g.beginPath(); g.moveTo(cl0, cly); g.lineTo(cl1, cly); g.stroke();
    const [ccx, ccy] = toS(T, 25, 50); g.strokeStyle = 'rgba(42,90,216,.55)'; g.beginPath(); g.arc(ccx, ccy, 9 * k, 0, 7); g.stroke();
    for (const gy of [0, H]) { const [gx0, gyy] = toS(T, 25 - GW, gy), [gx1] = toS(T, 25 + GW, gy); g.fillStyle = '#1a1a22'; g.fillRect(Math.min(gx0, gx1), gyy - 3 * k * (gyy < (y0 + y1) / 2 ? 1 : 0), Math.abs(gx1 - gx0), 3 * k); g.strokeStyle = 'rgba(42,90,216,.45)'; g.beginPath(); g.arc((gx0 + gx1) / 2, gyy, GW * k, gyy < (y0 + y1) / 2 ? 0 : Math.PI, gyy < (y0 + y1) / 2 ? Math.PI : Math.PI * 2); g.stroke(); }
    // disco e manopole
    const [px, py] = toS(T, A.px, A.py);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(px + 2, py + 3, PR * k, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(px, py, PR * k, 0, 7); g.fill(); g.strokeStyle = '#f2c230'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, PR * k * 0.6, 0, 7); g.stroke();
    for (const s of [0, 1]) {
      const [mx, my] = toS(T, A.m[s][0], A.m[s][1]), c = s ? '#2a5ad8' : '#d8342a', c2 = s ? '#8ab0ff' : '#ff9a8a';
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(mx + 3, my + 4, MR * k, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(mx, my, MR * k, 0, 7); g.fill();
      g.fillStyle = c2; g.beginPath(); g.arc(mx, my, MR * k * 0.62, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(mx - k * 0.4, my - k * 0.6, MR * k * 0.42, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(mx - MR * k * 0.25, my - MR * k * 0.35, MR * k * 0.15, 0, 7); g.fill();
    }
    const now = performance.now(); A.fx = A.fx.filter(f => now - f.t0 < 1600);
    for (const f of A.fx) { const q = (now - f.t0) / 1600, s = 1 + 0.4 * Math.sin(Math.min(1, q * 5) * Math.PI / 2); g.save(); g.globalAlpha = Math.min(1, (1 - q) * 3); g.translate(T.W / 2, T.H / 2); g.scale(s, s); g.font = '900 40px system-ui'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(f.txt, 0, 0); g.fillStyle = f.mine ? '#ffe14a' : '#fff'; g.fillText(f.txt, 0, 0); g.restore(); }
  }
  const BAH = cqTable({
    id: 'ah', title: 'Air hockey', emoji: '🏒', aiName: 'Il Conte', rule: 'chi arriva a ' + WIN + ' gol vince',
    near: () => { const R = CQ_W - 2; return cq.x > R - 7.3 && cq.x < R - 3.7 && cq.y > 5.8 && cq.y < 11.2; },
    newMatch, act, view, render, raw, btnCss: 'background:linear-gradient(#d8342a,#2a5ad8)',
    drop: T => { cancelAnimationFrame(T.raf); T.raf = 0; if (T.ro) window.removeEventListener('resize', T.ro); },
  });
  return BAH;
})();
