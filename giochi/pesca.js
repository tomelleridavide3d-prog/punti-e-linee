// ==== PESCA DEI PELUCHE (gru dell'angolo giochi, 23-10-2026, CLAUDE.md "PESCA DEI PELUCHE - DECISIONI DELL'UTENTE") ====
// La gru e' il prop 'claw' in R,1 (disegnato in giochi/lib/pixel.js). Vicino compare "🧸 Pesca": visuale a tutto schermo della macchina.
// Ogni tentativo costa 3 monete: muovi la pinza (◀ ▶ o trascinando sul vetro, 15 secondi), poi CALA. La pinza prende il peluche se ci arriva sopra;
// tiene di piu' se e' ben centrata e se il peluche e' comune (i rari sono piu' piccoli e scivolosi): a volte molla, anche all'ultimo, sopra la buca.
// Colore del peluche = rarita' del premio (bianco comune, blu raro, viola epico, oro leggendario). Premi da giochi/lib/guardaroba.js (CQX.ITEMS):
// cappelli, accessori per la faccia, personaggi esclusivi. Doppione = monete (1/2/3/6). Premio sicuro: dopo 9 tentativi senza un raro la pinza
// diventa "fortunata" (tiene sempre e il comune diventa raro). Leggendario: annuncio a tutto il party (campo hl.pz). Album con le sagome dei mancanti.
// Ganci: GR.tick (cqHallTick), GR.pub (cqHallPub), GR.busy (cqHallReady). requestAnimationFrame solo mentre la visuale e' aperta.
window.GR = (() => {
  const COST = 3, REFUND = [1, 2, 3, 6], HOLD = [0.82, 0.58, 0.38, 0.22], SIZE = [0.075, 0.068, 0.062, 0.056], TIME = 15;
  const PASTEL = ['#f4a8c8', '#a8e0c8', '#f8c8a0', '#c8b8f0', '#f0e0a0', '#f4f0e6'], RC = ['#f4f0e6', '#4a9ae8', '#a86ae8', '#f2c230'];
  let V = null;   // visuale aperta
  const now = () => performance.now() / 1000;
  const S = () => store.settings;
  const pity = () => S().gruPity || 0;
  let pz = 0, pzN = 0;   // ultimo leggendario per l'annuncio al party
  const near = () => { const R = CQ_W - 2; return Math.hypot(cq.x - (R + 0.5), cq.y - 2.4) < 1.5; };
  // ---- pulsante nella hall e annunci ----
  let uiT = 0; const seen = {};
  let sqT = 0;
  function tick(G, dt) {
    // la Papera di gomma squittisce camminando (io e gli amici vicini)
    if ((sqT -= dt) <= 0) { sqT = 0.34; const me = cqLook(); if (me.skin === 'papera' && cq.walk > 0) { beep(1900, 0.05, 0.03, 0, 'sine'); beep(2300, 0.04, 0.025, 0.04, 'sine'); }
      for (const c of G.chars) if (c.remote && c.mv && c.look && c.look.skin === 'papera' && Math.hypot(c.x - cq.x, c.y - cq.y) < 7) { beep(1900, 0.05, 0.015, 0.1, 'sine'); beep(2300, 0.04, 0.012, 0.14, 'sine'); } }
    if ((uiT -= dt) > 0) return; uiT = 0.15;
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('grHallB');
    if (!b) { b = document.createElement('button'); b.id = 'grHallB'; b.className = 'btn tvHallB'; b.type = 'button'; b.hidden = true; b.style.background = 'linear-gradient(#f08ab8,#b04a8a)'; b.textContent = '🧸 Pesca · ' + COST + ' 🪙'; b.onclick = open; box.appendChild(b); }
    const on = !!(G && G.hall && G.me.alive && cqHallFree() && cq.sit == null && near() && !V);
    if (b.hidden === on) b.hidden = !on;
    for (const c of G.chars) if (c.remote && c.pz && seen[c.sid] !== c.pz) { const first = seen[c.sid] === undefined; seen[c.sid] = c.pz; if (!first) { const it = CQX.BY[String(c.pz).split(':')[0]]; if (it) { cqToast('🌟 <b>' + esc(c.name || '') + '</b> ha pescato un premio <b style="color:#f2c230">leggendario</b>: ' + it.e + ' ' + esc(it.n) + '!'); [0, 4, 7, 12].forEach((n, i) => beep(659 * Math.pow(2, n / 12), 0.16, 0.04, i * 0.08, 'triangle')); } } }
  }
  const pub = () => pz ? pz + ':' + pzN : 0;
  const busy = () => !!V;

  // ---- la macchina ----
  function newPlush(W, x) {
    const u = Math.random(), r = u < 0.035 ? 3 : u < 0.15 ? 2 : u < 0.42 ? 1 : 0;
    return { x, r, s: SIZE[r] * W, col: r ? RC[r] : PASTEL[Math.floor(Math.random() * PASTEL.length)], ears: Math.floor(Math.random() * 3), ph: Math.random() * 6, y: 0 };
  }
  function layout() {
    const W = V.W, H = V.H, gw = Math.min(W - 24, 380), gx0 = (W - gw) / 2, gy0 = 92, gh = Math.min(H * 0.56, gw * 1.25);
    Object.assign(V, { gw, gx0, gx1: gx0 + gw, gy0, gy1: gy0 + gh, floor: gy0 + gh - 8, chW: gw * 0.22 });
  }
  function fill() {   // mucchio di peluche: quelli rimasti scendono se hanno perso l'appoggio, i nuovi cadono nel punto piu' basso libero
    const P = V.pl, x0 = V.gx0 + V.chW + 8, x1 = V.gx1 - 8, placed = [];
    const rest = (x, sz) => { let y = V.floor - sz * 0.9; for (const q of placed) { const d = (q.s + sz) * 0.9; if (Math.abs(q.x - x) < d) y = Math.min(y, q.y - Math.sqrt(d * d - (q.x - x) ** 2)); } return Math.max(V.gy0 + V.gw * 0.35, y); };
    for (const q of P.filter(q => q.y).sort((a, b) => b.y - a.y)) { q.y = rest(q.x, q.s); placed.push(q); }
    for (const q of P.filter(q => !q.y)) { q.x = x0 + q.s; q.y = rest(q.x, q.s); placed.push(q); }
    while (P.length < 11) {
      const q = newPlush(V.gw, 0); let bx = x0 + q.s, by = -1e9;
      for (let x = x0 + q.s; x <= x1 - q.s; x += 5) { const y = rest(x, q.s) + Math.random() * 4; if (y > by) { by = y; bx = x; } }
      q.x = bx; q.y = rest(bx, q.s); placed.push(q); P.push(q);
    }
    P.sort((a, b) => a.y - b.y);   // disegno: prima quelli in alto (dietro), poi quelli sotto davanti
  }
  function open() {
    if (V) return;
    const r = document.createElement('div'); r.id = 'grRoot';
    r.innerHTML = `<canvas></canvas><div class="grTop"><span id="grCoin"></span><span id="grLuck"></span></div><div class="grCtl"></div><button type="button" class="grX">✕ Esci</button>`;
    document.body.appendChild(r);
    V = { root: r, cv: r.querySelector('canvas'), ph: 'idle', pl: [], fx: [], claw: { x: 0, y: 0, cl: 0 }, keys: 0, held: null };
    r.querySelector('.grX').onclick = close;
    const cv = V.cv;
    cv.addEventListener('pointerdown', e => { if (V.ph === 'move') { V.drag = e.offsetX; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener('pointermove', e => { if (V.ph === 'move' && V.drag != null) V.tx = e.offsetX; });
    cv.addEventListener('pointerup', () => { V.drag = null; V.tx = null; });
    V.ro = () => { if (V && V.root === r) { size(); fill(); } }; window.addEventListener('resize', V.ro);
    size(); fill(); idle(); loop();
  }
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), W = V.cv.clientWidth, H = V.cv.clientHeight;
    V.cv.width = Math.round(W * dpr); V.cv.height = Math.round(H * dpr); V.W = W; V.H = H; V.dpr = dpr; layout();
    V.claw.x = V.claw.x || V.gx0 + V.chW / 2; V.claw.y = V.gy0 + 26;
  }
  function close() { if (!V) return; cancelAnimationFrame(V.raf); clearTimeout(V.t1); window.removeEventListener('resize', V.ro); V.root.remove(); V = null; }
  function ctl(html) { const c = V.root.querySelector('.grCtl'); c.innerHTML = html; return c; }
  function head() {
    V.root.querySelector('#grCoin').textContent = '🪙 ' + cqBank().coins;
    const p = pity(); V.root.querySelector('#grLuck').innerHTML = p >= 9 ? '✨ <b>Pinza fortunata!</b>' : 'Premio sicuro tra ' + (10 - p) + (10 - p === 1 ? ' tentativo' : ' tentativi');
  }
  function idle() {
    V.ph = 'idle'; head();
    const c = ctl(`<button type="button" class="grGo">▶ Gioca · ${COST} 🪙</button><button type="button" class="grAl">📖 Album ${CQX.ITEMS.filter(i => CQX.owned(i.id)).length}/${CQX.ITEMS.length}</button>`);
    c.querySelector('.grGo').onclick = play; c.querySelector('.grAl').onclick = album;
  }
  function play() {
    if (V.ph !== 'idle') return;
    const b = cqBank(); if (b.coins < COST) { cqToast('🧸 Un tentativo costa <b>' + COST + ' 🪙</b> e ne hai ' + b.coins + '. Le monete si vincono nei minigiochi!'); beep(220, 0.14, 0.04); return; }
    cqCoins(-COST); clearTimeout(V.t1); V.luck = pity() >= 9; head();
    beep(1320, 0.05, 0.04); beep(1760, 0.08, 0.035, 0.06); [0, 4, 7].forEach((n, i) => beep(784 * Math.pow(2, n / 12), 0.08, 0.03, 0.15 + i * 0.07, 'square'));
    V.ph = 'move'; V.t0 = now(); V.claw.y = V.gy0 + 26; V.claw.cl = 0;
    const c = ctl(`<button type="button" class="grL">◀</button><button type="button" class="grDn">⬇ CALA</button><button type="button" class="grR">▶</button>`);
    const hold = (el, k) => { el.onpointerdown = e => { e.preventDefault(); V.keys = k; }; el.onpointerup = el.onpointerleave = el.onpointercancel = () => { if (V && V.keys === k) V.keys = 0; }; };
    hold(c.querySelector('.grL'), -1); hold(c.querySelector('.grR'), 1); c.querySelector('.grDn').onclick = drop;
    loop();
  }
  function drop() { if (V.ph !== 'move') return; V.ph = 'down'; V.keys = 0; ctl('<p class="grMsg">Giù…</p>'); beep(330, 0.3, 0.03, 0, 'sawtooth'); }
  // la pinza arriva in fondo: cosa c'e' sotto?
  function grab() {
    const C = V.claw; let best = null;
    for (const p of V.pl) { const dx = Math.abs(p.x - C.x); if (dx < p.s * 1.15 && (!best || p.y < best.y)) best = p; }
    V.ph = 'grab'; V.gt = now();
    thud(0.5, 600); beep(900, 0.04, 0.03, 0.15, 'square');
    if (!best) { V.held = null; return; }
    const a = Math.abs(best.x - C.x) / best.s, ok = a < 1.15;
    if (!ok) { V.held = null; V.brush = best; return; }
    const p = V.luck ? 1 : HOLD[best.r] * (1 - 0.5 * Math.min(1, a));
    const keep = Math.random() < p;
    V.held = best; V.pl.splice(V.pl.indexOf(best), 1);
    V.slip = keep ? -1 : (Math.random() < 0.35 ? 0.92 + Math.random() * 0.07 : Math.random() * 0.75);   // quando molla: 0 = appena preso, 1 = sopra la buca
  }
  function finishPrize(p) {
    const lucky = V.luck; let r = p.r; if (lucky && r === 0) r = 1;
    const pool = CQX.ITEMS.filter(i => i.r === r), w = pool.map(i => CQX.owned(i.id) ? 1 : 3), tot = w.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, it = pool[0]; for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { it = pool[i]; break; } }
    const c = CQX.coll(), dup = (c[it.id] || 0) > 0; c[it.id] = (c[it.id] || 0) + 1;
    S().gruPity = r >= 1 ? 0 : pity() + 1;
    if (dup) cqCoins(REFUND[r]);
    saveStore();
    if (r === 3) { pz = it.id; pzN++; if (cq.net) cqHallPub(true); }
    reveal(it, dup, lucky && p.r === 0);
  }
  function missed(txt) {
    S().gruPity = pity() + 1; saveStore();
    V.ph = 'miss'; head(); beep(392, 0.15, 0.04, 0, 'triangle'); beep(330, 0.15, 0.04, 0.15, 'triangle'); beep(262, 0.3, 0.04, 0.3, 'triangle');
    const c = ctl(`<p class="grMsg">${txt}</p><button type="button" class="grGo">▶ Riprova · ${COST} 🪙</button>`);
    c.querySelector('.grGo').onclick = () => { V.ph = 'idle'; play(); };
    V.t1 = setTimeout(() => { if (V && V.ph === 'miss') idle(); }, 6000);
  }
  // ---- premio ----
  function preview(it, px, dim) {
    const c = document.createElement('canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2.5); c.width = px * dpr; c.height = px * dpr; c.style.width = c.style.height = px + 'px';
    const g = c.getContext('2d', typeof CQ_CPU !== 'undefined' ? CQ_CPU : undefined); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const me = cqLook(), L = it.k === 'c' ? { skin: it.id, col: CQX.SKINS[it.id].col } : Object.assign({}, me, it.k === 'h' ? { ht: it.id } : { fc: it.id });
    if (dim) g.filter = 'brightness(0) opacity(.28)';
    const TW = px * (it.k === 'f' ? 0.62 : 0.38), oy = it.k === 'f' ? px * 1.02 : px * 0.95;
    cqPlayer(g, px / 2, oy, TW, L, 0, 1, true);
    return c;
  }
  function reveal(it, dup, upg) {
    V.ph = 'prize'; head();
    const R = CQX.RAR[it.r];
    [[0, 4, 7], [0, 4, 7, 12], [0, 4, 7, 12, 16], [0, 4, 7, 12, 16, 19, 24]][it.r].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.2, 0.05, i * 0.09, 'triangle'));
    if (it.r >= 2) for (let i = 0; i < 60; i++) V.fx.push({ x: V.W / 2, y: V.H * 0.42, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 420 - 80, c: ['#f2c230', '#ff7ac8', '#4a9ae8', '#7bff8a', '#fff'][i % 5], t0: now(), d: 1.8 });
    const c = ctl('');
    const box = document.createElement('div'); box.className = 'grPrize'; box.style.setProperty('--rc', R.c);
    box.innerHTML = `<div class="grRar">${R.n.toUpperCase()}</div><div class="grPv"></div><h2>${it.e} ${esc(it.n)}</h2><p>${upg ? '✨ La pinza fortunata l\'ha trasformato in raro! ' : ''}${dup ? 'Ce l\'avevi già: <b>+' + REFUND[it.r] + ' 🪙</b>' : '<b>NUOVO!</b> ' + (it.k === 'c' ? 'Un personaggio esclusivo: lo trovi nella scelta del personaggio.' : 'Lo trovi in 🎒 I miei accessori.')}</p>`
      + `<button type="button" class="grWear">👕 ${it.k === 'c' ? 'Diventa ' + esc(it.n) : 'Indossa'}</button><button type="button" class="grOk">Continua</button>`;
    box.querySelector('.grPv').appendChild(preview(it, 150));
    V.root.appendChild(box);
    box.querySelector('.grWear').onclick = () => { const L = Object.assign(cqLook(), it.k === 'h' ? { ht: it.id } : it.k === 'f' ? { fc: it.id } : { skin: it.id }); store.settings.cqLook = L; saveStore(); const N = cq.net; if (N) N.F.set(cqNetRef(`cq/${N.code}/pl/${N.sid}`), { name: (store.settings.myName || 'Tu').trim().slice(0, 14) || 'Tu', look: cqLook(), ts: Date.now() }).catch(() => {}); cqToast('👕 Fatto! Ora hai ' + it.e + ' <b>' + esc(it.n) + '</b>.'); box.remove(); idle(); };
    box.querySelector('.grOk').onclick = () => { box.remove(); idle(); };
  }
  function album() {
    const box = document.createElement('div'); box.className = 'grAlbum';
    const n = CQX.ITEMS.filter(i => CQX.owned(i.id)).length;
    box.innerHTML = `<h2>📖 Album della gru · ${n}/${CQX.ITEMS.length}</h2><div class="grGrid"></div><button type="button" class="grOk">Chiudi</button>`;
    const grid = box.querySelector('.grGrid');
    for (const r of [3, 2, 1, 0]) for (const it of CQX.ITEMS.filter(i => i.r === r)) {
      const own = CQX.owned(it.id), d = document.createElement('div'); d.className = 'grIt'; d.style.borderColor = CQX.RAR[it.r].c;
      d.appendChild(preview(it, 64, !own)); const t = document.createElement('span'); t.textContent = own ? it.n : '???'; d.appendChild(t);
      grid.appendChild(d);
    }
    box.querySelector('.grOk').onclick = () => box.remove();
    V.root.appendChild(box);
  }
  // ---- giro e disegno ----
  function loop() {
    if (!V) return; cancelAnimationFrame(V.raf); V.last = performance.now();
    const step = t => {
      if (!V) return;
      const dt = Math.min(0.05, (t - V.last) / 1000); V.last = t; update(dt); draw();
      V.raf = requestAnimationFrame(step);
    };
    V.raf = requestAnimationFrame(step);
  }
  function update(dt) {
    const C = V.claw, top = V.gy0 + 26, sp = V.gw * 0.42;
    if (V.ph === 'move') {
      let d = V.keys; if (V.tx != null) d = Math.abs(V.tx - C.x) < 3 ? 0 : Math.sign(V.tx - C.x);
      if (d) { C.x = Math.max(V.gx0 + 22, Math.min(V.gx1 - 22, C.x + d * sp * dt)); if ((V.wt = (V.wt || 0) - dt) <= 0) { V.wt = 0.12; beep(140, 0.08, 0.015, 0, 'sawtooth'); } }
      const left = TIME - (now() - V.t0); V.left = left; if (left <= 0) drop();
    } else if (V.ph === 'down') {
      C.y += sp * 0.9 * dt;
      let stop = V.floor - 10; for (const p of V.pl) if (Math.abs(p.x - C.x) < p.s * 1.15) stop = Math.min(stop, p.y - p.s * 0.55);
      if (C.y >= stop) { C.y = stop; grab(); }
    } else if (V.ph === 'grab') {
      C.cl = Math.min(1, (now() - V.gt) / 0.45);
      if (C.cl >= 1) { V.ph = 'up'; beep(260, 0.4, 0.03, 0, 'sawtooth'); }
    } else if (V.ph === 'up' || V.ph === 'carry') {
      const H = V.held;
      if (V.ph === 'up') { C.y = Math.max(top, C.y - sp * 0.7 * dt); if (C.y <= top) V.ph = 'carry'; }
      else { const tx = V.gx0 + V.chW / 2; C.x = Math.max(tx, C.x - sp * 0.8 * dt); if (C.x <= tx) { V.ph = 'release'; V.rt = now(); } }
      if (H) {
        const prog = V.ph === 'up' ? 0.5 * (1 - (C.y - top) / Math.max(1, V.floor - top)) : 0.5 + 0.5 * (1 - (C.x - V.gx0 - V.chW / 2) / Math.max(1, V.gw - V.chW));
        H.x = C.x; H.y = C.y + H.s * 0.7;
        if (V.slip >= 0 && prog >= V.slip) { V.fall = { p: H, vy: 0, chute: false }; V.held = null; V.slip = -1; beep(500, 0.06, 0.04); beep(300, 0.15, 0.04, 0.06, 'triangle'); C.cl = 0.3; }
      }
      if (!H && !V.fall && V.ph === 'carry' && C.x <= V.gx0 + V.chW / 2 + 1) { missed(V.brush ? '😬 La pinza è scivolata sul peluche!' : '🙈 Niente sotto la pinza…'); V.brush = null; }
    } else if (V.ph === 'release') {
      C.cl = Math.max(0, 1 - (now() - V.rt) / 0.3);
      if (V.held) { V.fall = { p: V.held, vy: 0, chute: true }; V.held = null; }
      if (C.cl <= 0 && !V.fall) V.ph = 'wait';
    }
    if (V.fall) {   // peluche che cade: nella buca (premio) o di nuovo nel mucchio
      const F = V.fall, p = F.p; F.vy += 900 * dt; p.y += F.vy * dt;
      const inChute = p.x < V.gx0 + V.chW;
      if (inChute && p.y > V.gy1 + 30) { V.fall = null; thud(0.7, 200); finishPrize(p); }
      else if (!inChute && p.y >= V.floor - p.s * 0.9) { p.y = V.floor - p.s * 0.9; V.pl.push(p); fill(); V.fall = null; thud(0.4, 400); if (V.ph !== 'miss' && V.ph !== 'prize') missed(Math.random() < 0.5 ? '😱 Ha mollato! C\'eri quasi…' : '😩 Noooo, è scivolato!'); }
    }
    if (V.ph === 'wait' && !V.fall) V.ph = 'prize-wait';
    if ((V.ph === 'miss' || V.ph === 'prize' || V.ph === 'idle') && V.claw.y > top) V.claw.y = Math.max(top, V.claw.y - sp * dt);
    if ((V.ph === 'idle' || V.ph === 'miss') && V.pl.length < 11) fill();
  }
  function plush(g, p, t) {
    const s = p.s, x = p.x, y = p.y + Math.sin(t * 2 + p.ph) * 0.6;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x + 2, y + s * 0.85, s * 0.8, s * 0.22, 0, 0, 7); g.fill();
    const c = p.col, dk = p.r === 3 ? '#c8960c' : p.r === 2 ? '#7a3ab8' : p.r === 1 ? '#2a6ab8' : 'rgba(0,0,0,.15)';
    if (p.r >= 2) { g.fillStyle = p.r === 3 ? 'rgba(255,220,100,.35)' : 'rgba(200,140,255,.3)'; g.beginPath(); g.arc(x, y, s * 1.45, 0, 7); g.fill(); }
    // orecchie: orso / coniglio / gatto
    g.fillStyle = c;
    if (p.ears === 0) for (const k of [-1, 1]) { g.beginPath(); g.arc(x + k * s * 0.62, y - s * 0.72, s * 0.3, 0, 7); g.fill(); }
    else if (p.ears === 1) for (const k of [-1, 1]) { g.beginPath(); g.ellipse(x + k * s * 0.35, y - s * 1.05, s * 0.17, s * 0.5, k * 0.15, 0, 7); g.fill(); }
    else for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + k * s * 0.75, y - s * 0.35); g.lineTo(x + k * s * 0.6, y - s * 1.05); g.lineTo(x + k * s * 0.15, y - s * 0.7); g.fill(); }
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.strokeStyle = dk; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - s * 0.35, y - s * 0.4, s * 0.25, s * 0.18, -0.5, 0, 7); g.fill();
    // faccina sospettosa
    for (const k of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + k * s * 0.32, y - s * 0.05, s * 0.17, s * 0.19, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + k * s * 0.32 + s * 0.07, y, s * 0.09, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(x + k * s * 0.32 - s * 0.2, y - s * 0.28, s * 0.4, s * 0.15); }
    g.strokeStyle = '#3a2a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - s * 0.15, y + s * 0.4); g.quadraticCurveTo(x + s * 0.05, y + s * 0.34, x + s * 0.25, y + s * 0.3); g.stroke();
    if (p.r >= 2) for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1 + p.ph, sx = x + Math.cos(a) * s * 1.2, sy = y + Math.sin(a) * s * 0.9, z = (Math.sin(t * 5 + i) + 1) * 1.6; g.fillStyle = '#fff'; g.fillRect(sx - z / 2, sy - 0.5, z, 1); g.fillRect(sx - 0.5, sy - z / 2, 1, z); }
  }
  function draw() {
    const g = V.cv.getContext('2d'), t = now(), { W, H, gx0, gx1, gy0, gy1, floor, chW } = V;
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); g.clearRect(0, 0, W, H);
    // mobile della gru: cornice rosa, insegna con le lampadine
    g.fillStyle = '#b04a8a'; cqRR(g, gx0 - 14, gy0 - 64, gx1 - gx0 + 28, gy1 - gy0 + 150, 18); g.fill();
    g.fillStyle = '#d86aa8'; cqRR(g, gx0 - 8, gy0 - 58, gx1 - gx0 + 16, 46, 12); g.fill();
    g.fillStyle = '#fff3c4'; g.font = '900 24px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🧸 PESCA DEI PELUCHE', W / 2, gy0 - 35);
    for (let i = 0; i < 14; i++) { const x = gx0 - 6 + i * (gx1 - gx0 + 12) / 13, on = (Math.floor(t * 4) + i) % 3 === 0; g.fillStyle = on ? '#fff3a0' : '#c89a40'; g.beginPath(); g.arc(x, gy0 - 62, 3.5, 0, 7); g.fill(); g.beginPath(); g.arc(x, gy0 - 10, 3, 0, 7); g.fill(); }
    // vetro e fondo
    const bg = g.createLinearGradient(0, gy0, 0, gy1); bg.addColorStop(0, '#2a1a3a'); bg.addColorStop(1, '#4a2a5a'); g.fillStyle = bg; g.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    g.fillStyle = '#6a3a7a'; g.fillRect(gx0, floor, gx1 - gx0, gy1 - floor);
    // buca dei premi con la parete trasparente
    g.fillStyle = '#120a18'; g.fillRect(gx0, floor - 4, chW, gy1 - floor + 4);
    g.fillStyle = 'rgba(200,230,255,.18)'; g.fillRect(gx0 + chW - 4, floor - 40, 4, 40);
    g.fillStyle = '#f2c230'; g.font = '700 11px system-ui'; g.fillText('PREMIO', gx0 + chW / 2, gy1 + 16);
    g.fillStyle = '#120a18'; cqRR(g, gx0 + 6, gy1 + 26, chW - 12, 24, 6); g.fill();
    // peluche
    for (const p of V.pl) plush(g, p, t);
    if (V.fall) plush(g, V.fall.p, t);
    // pinza col cavo
    const C = V.claw, rail = gy0 + 10;
    g.fillStyle = '#8a8f99'; g.fillRect(gx0, rail - 3, gx1 - gx0, 6);
    g.fillStyle = '#c8ccd4'; cqRR(g, C.x - 14, rail - 7, 28, 14, 4); g.fill();
    g.strokeStyle = '#d8dce4'; g.lineWidth = 2; g.beginPath(); g.moveTo(C.x, rail + 7); g.lineTo(C.x, C.y - 8); g.stroke();
    if (V.held) plush(g, V.held, t);
    g.fillStyle = '#c8ccd4'; cqRR(g, C.x - 9, C.y - 10, 18, 10, 3); g.fill();
    const op = 1 - C.cl;
    g.strokeStyle = '#e8ecf0'; g.lineWidth = 3.5; g.lineCap = 'round';
    for (const k of [-1, 0, 1]) { const a = k * (0.25 + op * 0.55), lx = C.x + Math.sin(a) * 18, ly = C.y + Math.cos(a) * 18; g.beginPath(); g.moveTo(C.x + k * 4, C.y); g.lineTo(lx, ly); g.lineTo(lx - k * 5 * (0.4 + C.cl), ly + 7); g.stroke(); }
    if (V.luck && V.ph !== 'idle') { g.fillStyle = `rgba(255,230,120,${0.25 + 0.2 * Math.sin(t * 6)})`; g.beginPath(); g.arc(C.x, C.y + 6, 20, 0, 7); g.fill(); }
    // riflessi del vetro
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(gx0 + 20, gy0); g.lineTo(gx0 + 60, gy0); g.lineTo(gx0 + 10, gy1); g.lineTo(gx0, gy1 - 30); g.closePath(); g.fill();
    g.strokeStyle = '#f08ab8'; g.lineWidth = 4; g.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    // tempo
    if (V.ph === 'move') { const l = Math.max(0, V.left); g.fillStyle = l < 4 ? '#ff6a5a' : '#fff'; g.font = '900 22px system-ui'; g.fillText('⏱ ' + Math.ceil(l), W / 2, gy1 + 16); }
    // coriandoli
    V.fx = V.fx.filter(f => t - f.t0 < f.d);
    for (const f of V.fx) { const k = t - f.t0, x = f.x + f.vx * k, y = f.y + f.vy * k + 500 * k * k; g.fillStyle = f.c; g.fillRect(x, y, 5, 3); }
  }
  const css = document.createElement('style');
  css.textContent = `
#grRoot{position:fixed;inset:0;z-index:55;background:radial-gradient(ellipse at 50% 40%,#3a2040,#120a18);touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
#grRoot>canvas{position:absolute;inset:0;width:100%;height:100%}
#grRoot .grTop{position:absolute;left:10px;right:10px;top:8px;display:flex;justify-content:space-between;font-weight:800;font-size:14px;z-index:2;text-shadow:0 1px 3px #000}
#grRoot .grCtl{position:absolute;left:10px;right:10px;bottom:62px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;z-index:2}
#grRoot .grCtl button{padding:13px 16px;border-radius:14px;border:3px solid #fff3c4;background:linear-gradient(#f08ab8,#b04a8a);color:#fff;font-weight:900;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.5)}
#grRoot .grCtl .grL,#grRoot .grCtl .grR{min-width:74px;font-size:24px}#grRoot .grCtl .grDn{background:linear-gradient(#ffd84a,#e0a020);color:#3a2a10}
#grRoot .grCtl .grAl{background:linear-gradient(#6a8ad8,#3a5aa8)}
#grRoot .grMsg{width:100%;text-align:center;font-weight:800;font-size:17px;margin:0 0 4px;text-shadow:0 1px 4px #000}
#grRoot .grX{position:absolute;right:10px;bottom:12px;background:rgba(20,16,14,.85);color:#fff;border:2px solid #6a4a2a;border-radius:12px;padding:8px 12px;font-weight:700;font-size:14px;z-index:3}
#grRoot .grPrize{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(320px,90vw);background:#2a1e18;border:4px solid var(--rc);border-radius:18px;padding:14px;text-align:center;z-index:5;box-shadow:0 0 40px var(--rc),0 10px 40px rgba(0,0,0,.7);animation:grPop .5s cubic-bezier(.2,1.6,.5,1)}
@keyframes grPop{from{transform:translate(-50%,-50%) scale(.4);opacity:0}}
#grRoot .grRar{display:inline-block;background:var(--rc);color:#1a1208;font-weight:900;letter-spacing:2px;border-radius:999px;padding:3px 14px;font-size:13px}
#grRoot .grPv{display:flex;justify-content:center;margin:6px 0}#grRoot .grPrize h2{margin:4px 0;font-size:22px}#grRoot .grPrize p{font-size:14px;margin:6px 0 10px}
#grRoot .grPrize button,#grRoot .grAlbum button{display:block;width:100%;margin:6px 0 0;padding:11px;border-radius:10px;border:2px solid #e0b84a;background:#3e8a4a;color:#fff;font-weight:800;font-size:16px}
#grRoot .grPrize .grOk{background:#4a3020;border-color:#6a4a2a}
#grRoot .grAlbum{position:absolute;inset:16px;background:#2a1e18;border:3px solid #c99a44;border-radius:16px;padding:12px;z-index:5;display:flex;flex-direction:column}
#grRoot .grAlbum h2{margin:0 0 8px;font-size:18px;text-align:center}
#grRoot .grGrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}
#grRoot .grIt{border:2px solid;border-radius:10px;background:#1a1412;display:flex;flex-direction:column;align-items:center;padding:3px;font-size:10px;text-align:center;line-height:1.1}`;
  document.head.appendChild(css);
  return { tick, pub, busy, open, close, get V() { return V; }, play, drop, finishPrize, album, idle: () => V && idle() };
})();
