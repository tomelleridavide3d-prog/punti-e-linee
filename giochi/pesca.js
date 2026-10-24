// ==== PESCA DEI PELUCHE (gru dell'angolo giochi, 23-10-2026, CLAUDE.md "PESCA DEI PELUCHE - DECISIONI DELL'UTENTE") ====
// La gru e' il prop 'claw' in R,1 (disegnato in giochi/lib/pixel.js). Vicino compare "🧸 Pesca": visuale a tutto schermo della macchina.
// Ogni tentativo costa 3 monete: 20 secondi per muovere la pinza (◀ ▶ ▲ ▼, trascinando sul vetro o con le frecce), poi ✊ PRENDI chiude le griffe.
// La pinza penzola dal cavo; i peluche sono morbidi e si spostano se urtati (si puo' spingerli per arrivare a quello raro, che sta piu' in fondo).
// Sopra la buca c'e' una botola inclinata che si apre solo quando la pinza ci porta un peluche: conta solo quello preso.
// Tiene di piu' se e' ben centrata, scesa bene e se il peluche e' comune (i rari sono piu' piccoli e scivolosi): a volte molla, anche sopra la buca.
// Colore del peluche = rarita' del premio (bianco comune, blu raro, viola epico, oro leggendario). Premi da giochi/lib/guardaroba.js (CQX.ITEMS):
// cappelli, accessori per la faccia, personaggi esclusivi. Doppione = monete (1/2/3/6). Premio sicuro: dopo 9 tentativi senza un raro la pinza
// diventa "fortunata" (tiene sempre e il comune diventa raro). Leggendario: annuncio a tutto il party (campo hl.pz). Album con le sagome dei mancanti.
// Ganci: GR.tick (cqHallTick), GR.pub (cqHallPub), GR.busy (cqHallReady). requestAnimationFrame solo mentre la visuale e' aperta.
window.GR = (() => {
  const COST = 3, REFUND = [1, 2, 3, 6], HOLD = [0.52, 0.4, 0.27, 0.16], SIZE = [0.075, 0.068, 0.062, 0.056], TIME = 20;
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

  // ---- la macchina (rifatta il 23-10-2026: pinza che penzola, su/giu'/destra/sinistra + PRENDI, peluche morbidi che si spostano) ----
  // Fisica dei peluche a passi fissi di 1/120 s (solo sul mio telefono, la gru non e' online): cerchi morbidi che si schiacciano un po' e
  // hanno molto attrito (non rotolano come palline), spinti dalla testa e dalle griffe della pinza e dal peluche che porta.
  // La pinza e' un pendolo appeso al carrello: oscilla quando il carrello parte o si ferma e quando urta i peluche.
  const DT = 1 / 120, GRAV = 1500, PG = 1500, NPL = 16;
  function newPlush(W) {
    const u = Math.random(), r = u < 0.035 ? 3 : u < 0.15 ? 2 : u < 0.42 ? 1 : 0;
    return { x: 0, y: 0, px: 0, py: 0, r, s: SIZE[r] * W, col: r ? RC[r] : PASTEL[Math.floor(Math.random() * PASTEL.length)], ears: Math.floor(Math.random() * 3), ph: Math.random() * 6, a: 0, sq: 0, wb: 0, cmp: 0 };
  }
  function layout() {
    const W = V.W, H = V.H, gw = Math.min(W - 48, 380), gx0 = (W - gw) / 2, gy0 = 136, gh = Math.max(220, Math.min(H - 262 - gy0, gw * 1.02));
    Object.assign(V, { gw, gx0, gx1: gx0 + gw, gy0, gy1: gy0 + gh, floor: gy0 + gh - 8, chW: gw * 0.22, rail: gy0 + 14, PL: gw * 0.09, HR: gw * 0.026, BH: gw * 0.14 });
    V.BX = gx0 + V.chW; V.home = gx0 + V.chW / 2; V.lo = V.lo || 0;
    V.lhx = V.BX; V.lhy = V.floor - V.BH; V.lL = Math.hypot(V.chW, V.chW * 0.75); V.la0 = Math.atan2(-V.chW * 0.75, -V.chW); V.L0 = 22; V.Lmax = V.floor - V.rail - V.PL * 0.8;
  }
  function spawn(p, y) { const x0 = V.BX + p.s + 14; p.x = p.px = x0 + Math.random() * (V.gx1 - p.s - x0); p.y = p.py = y; V.pl.push(p); }
  function fill() {   // all'apertura: i peluche cadono dall'alto e si assestano subito (i rari per primi: restano piu' in fondo, sotto gli altri)
    V.pl = []; V.pq = []; V.filling = 1;   // filling: se uno scivola nella buca mentre si assesta non e' un premio, se ne mette un altro
    const L = Array.from({ length: NPL }, () => newPlush(V.gw)).map(p => [p, p.r + Math.random() * 1.6]).sort((a, b) => b[1] - a[1]).map(a => a[0]);
    L.forEach((p, i) => spawn(p, V.floor - p.s - i * V.gw * 0.09));
    for (let k = 0; k < 4; k++) { for (let i = 0; i < 700; i++) phys(); while (V.pl.length < NPL) { const p = newPlush(V.gw); spawn(p, V.gy0 + p.s + 4); } }
    for (let i = 0; i < 400; i++) phys();
    for (const p of V.pl) { p.px = p.x; p.py = p.y; p.wb = 0; }
    V.filling = 0;
  }
  // pinza: testa + punte (e meta') delle due griffe laterali, in coordinate del mondo
  function claws() {
    const C = V.claw, out = [[C.hx, C.hy, V.HR]], op = 1 - C.cl, c = Math.cos(C.th), s = Math.sin(C.th);
    for (const k of [-1, 1]) {
      const a = k * (0.25 + op * 0.75), lx = Math.sin(a) * V.PL, ly = Math.cos(a) * V.PL;
      for (const f of [0.55, 1]) { const x = lx * f, y = ly * f; out.push([C.hx + x * c + y * s, C.hy - x * s + y * c, f === 1 ? 4.5 : 3.5]); }
    }
    return out;
  }
  function push(p, cx, cy, cr, k) {
    if (p === V.cand || p.nc > 0) return;
    const dx = p.x - cx, dy = p.y - cy, R = cr + p.s * k, d2 = dx * dx + dy * dy; if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 0.01, m = (R - d) * 0.35; p.x += dx / d * m; p.y += dy / d * m; p.cmp += (R - d) * 0.5; p.hit = 1;
  }
  // BOTOLA sopra la buca (richiesta dell'utente 24-10-2026): chiusa e' inclinata, chi ci cade sopra scivola di nuovo nel mucchio;
  // cerniera a destra in cima alla parete della buca: si apre alzandosi dritta (verso destra, spinge nel mucchio chi c'e' sopra) solo quando la pinza
  // arriva con un peluche preso, e resta aperta finche' quel peluche non e' caduto giu' (al massimo 5 s)
  const lidTip = () => { const a = V.la0 + (-Math.PI / 2 - V.la0) * V.lo; return [V.lhx + V.lL * Math.cos(a), V.lhy + V.lL * Math.sin(a), a]; };
  function bounds(p, it) {
    const r = p.s * 0.9;
    { const [tx, ty, a] = lidTip(), hx = V.lhx, hy = V.lhy, vx = tx - hx, vy = ty - hy, t = Math.max(0, Math.min(1, ((p.x - hx) * vx + (p.y - hy) * vy) / (vx * vx + vy * vy))), qx = hx + vx * t, qy = hy + vy * t, dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy);
      if (d < r) { if (d < 0.01) { p.x = qx - Math.sin(a) * r; p.y = qy + Math.cos(a) * r; } else { p.x = qx + dx / d * r; p.y = qy + dy / d * r; } } }
    if (p.x < V.gx0 + r) p.x = V.gx0 + r; if (p.x > V.gx1 - r) p.x = V.gx1 - r;
    if (p.x > V.BX && p.y > V.floor - r) { p.y = V.floor - r; p.gnd = 1; if (it === 0) p.x = p.px + (p.x - p.px) * 0.55; }   // pavimento con attrito
    // parete trasparente della buca (segmento verticale da floor-BH a floor): sotto non c'e' pavimento, si cade nel premio
    const cy = Math.max(V.floor - V.BH, Math.min(V.floor, p.y)), dx = p.x - V.BX, dy = p.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) { const d = Math.sqrt(d2); if (d < 0.01) { p.x = V.BX + (p.px >= V.BX ? r : -r); } else { p.x = V.BX + dx / d * r; p.y = cy + dy / d * r; if (dy < 0) p.gnd = 1; } }
  }
  function phys() {
    const P = V.pl, H = V.held, cl = claws(), g = GRAV * DT * DT;
    for (const p of P) {
      const vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.995;
      p.px = p.x; p.py = p.y; p.vy0 = vy;
      p.x += Math.max(-8, Math.min(8, vx)); p.y += Math.max(-8, Math.min(12, vy + g));
      p.cmp = 0; p.gnd = 0; p.hit = 0; if (p.nc > 0) p.nc--;
    }
    for (let it = 0; it < 4; it++) {
      // prima la pinza spinge, poi i peluche si sistemano tra loro, per ultimi pavimento e pareti (vincono sempre)
      for (const p of P) { for (const [cx, cy, cr] of cl) push(p, cx, cy, cr, 0.85); if (H) push(p, H.x, H.y, H.s * 0.93, 0.93); }
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j], dx = b.x - a.x, dy = b.y - a.y, R = (a.s + b.s) * 0.93, d2 = dx * dx + dy * dy;
          if (d2 >= R * R || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, wa = 1 / (a.s * a.s), wb = 1 / (b.s * b.s), w = wa + wb, c = (R - d) * 0.6 / w;
          a.x -= nx * c * wa; a.y -= ny * c * wa; b.x += nx * c * wb; b.y += ny * c * wb; a.cmp += R - d; b.cmp += R - d;
          if (it === 0) {   // attrito: uno sopra l'altro non scivolano via come palline
            const tx = -ny, ty = nx, rt = ((a.x - a.px) - (b.x - b.px)) * tx + ((a.y - a.py) - (b.y - b.py)) * ty, f = rt * 0.5 / w;
            a.x -= tx * f * wa; a.y -= ty * f * wa; b.x += tx * f * wb; b.y += ty * f * wb;
          }
          if (ny > 0.5) a.gnd = 1; else if (ny < -0.5) b.gnd = 1;
        }
      }
      for (const p of P) bounds(p, it);
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      // aspetto morbido: si schiaccia quando e' premuto, ballonzola quando atterra, si piega un po' se spinto di lato (non rotola)
      if (p.gnd && p.vy0 > 2.5) p.wb = Math.min(1, Math.max(p.wb, p.vy0 / 8));
      p.sq += (Math.min(0.24, p.cmp / p.s * 0.8) - p.sq) * 0.2; p.wb *= 0.985;
      p.a += (Math.max(-0.35, Math.min(0.35, (p.x - p.px) * 0.1)) - p.a) * 0.08;
      if (p.y > V.gy1 + 34) { P.splice(i, 1); if (p.taken) won(p); else { p.wb = 0; spawn(p, V.gy0 + p.s + 4); } }   // premio solo il peluche portato dalla pinza; gli altri tornano dall'alto
    }
  }
  function open() {
    if (V) return;
    const r = document.createElement('div'); r.id = 'grRoot';
    r.innerHTML = `<canvas></canvas><div class="grTop"><span id="grCoin"></span><span id="grLuck"></span></div><div class="grCtl"></div><button type="button" class="grX">✕ Esci</button>`;
    document.body.appendChild(r);
    V = { root: r, cv: r.querySelector('canvas'), ph: 'idle', pl: [], pq: [], fx: [], claw: { x: 0, vx: 0, L: 22, th: 0, w: 0, cl: 0, hx: 0, hy: 0 }, kx: 0, ky: 0, held: null, acc: 0, spT: 0, sndT: 0,
      bok: Array.from({ length: 11 }, (_, i) => ({ x: Math.random(), y: Math.random() * 0.9, r: 40 + Math.random() * 70, sp: 0.15 + Math.random() * 0.3, ph: Math.random() * 6, c: ['rgba(255,90,190,.16)', 'rgba(90,170,255,.14)', 'rgba(255,210,90,.12)', 'rgba(150,110,255,.15)'][i % 4] })) };
    r.querySelector('.grX').onclick = close;
    const cv = V.cv;
    cv.addEventListener('pointerdown', e => { if (V.ph === 'move') { V.tx = e.offsetX; V.ty = e.offsetY; try { cv.setPointerCapture(e.pointerId); } catch {} } });
    cv.addEventListener('pointermove', e => { if (V.ph === 'move' && V.tx != null) { V.tx = e.offsetX; V.ty = e.offsetY; } });
    cv.addEventListener('pointerup', () => { V.tx = V.ty = null; });
    V.key = e => {   // tastiera (computer): frecce + spazio
      if (!V || V.ph !== 'move' || e.repeat && e.type === 'keydown' && e.key === ' ') return;
      const dn = e.type === 'keydown', m = { ArrowLeft: ['kx', -1], ArrowRight: ['kx', 1], ArrowUp: ['ky', -1], ArrowDown: ['ky', 1] }[e.key];
      if (m) { e.preventDefault(); if (dn) V[m[0]] = m[1]; else if (V[m[0]] === m[1]) V[m[0]] = 0; }
      else if (dn && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); prendi(); }
    };
    window.addEventListener('keydown', V.key); window.addEventListener('keyup', V.key);
    V.ro = () => { if (V && V.root === r) { size(); fill(); } }; window.addEventListener('resize', V.ro);
    size(); fill(); idle(); loop();
  }
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), W = V.cv.clientWidth, H = V.cv.clientHeight;
    V.cv.width = Math.round(W * dpr); V.cv.height = Math.round(H * dpr); V.W = W; V.H = H; V.dpr = dpr; layout();
    const C = V.claw; C.x = V.home; C.L = V.L0; C.th = C.w = C.vx = 0; place();
  }
  function place() {   // posizione della testa della pinza (pendolo) e niente uscite dal vetro
    const C = V.claw, mn = V.gx0 + V.HR + V.PL * 0.7, mx = V.gx1 - V.HR - V.PL * 0.7;
    C.hx = C.x + C.L * Math.sin(C.th); C.hy = V.rail + C.L * Math.cos(C.th);
    if (C.hx < mn || C.hx > mx) { const tx = C.hx < mn ? mn : mx; C.th = Math.asin(Math.max(-1, Math.min(1, (tx - C.x) / C.L))); C.w *= -0.3; C.hx = C.x + C.L * Math.sin(C.th); C.hy = V.rail + C.L * Math.cos(C.th); }
  }
  function close() { if (!V) return; cancelAnimationFrame(V.raf); clearTimeout(V.t1); window.removeEventListener('resize', V.ro); window.removeEventListener('keydown', V.key); window.removeEventListener('keyup', V.key); V.root.remove(); V = null; }
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
    V.ph = 'move'; V.t0 = now(); V.rel = 0; V.slipped = false; V.brush = null; V.cand = null; V.kx = V.ky = 0; V.pq = [];
    const c = ctl(`<div class="grRow"><button type="button" class="grL">◀</button><button type="button" class="grU">▲</button><button type="button" class="grD">▼</button><button type="button" class="grR">▶</button></div><button type="button" class="grGrab">✊ PRENDI</button>`);
    const hold = (el, ax, v) => { el.onpointerdown = e => { e.preventDefault(); V[ax] = v; }; el.onpointerup = el.onpointerleave = el.onpointercancel = () => { if (V && V[ax] === v) V[ax] = 0; }; };
    hold(c.querySelector('.grL'), 'kx', -1); hold(c.querySelector('.grR'), 'kx', 1); hold(c.querySelector('.grU'), 'ky', -1); hold(c.querySelector('.grD'), 'ky', 1);
    c.querySelector('.grGrab').onclick = prendi;
  }
  // PRENDI: la pinza si chiude dove si trova (il peluche tra le griffe lo decide adesso, la presa a pinza chiusa)
  function prendi() {
    if (!V || (V.ph !== 'move' && V.ph !== 'auto')) return;
    V.ph = 'close'; V.gt = now(); V.kx = V.ky = 0; V.tx = V.ty = null; V.cand = candidate();
    ctl('<p class="grMsg">✊ Presa…</p>'); beep(700, 0.05, 0.03); beep(500, 0.25, 0.025, 0.05, 'sawtooth');
  }
  function candidate() {
    const C = V.claw; let best = null;
    for (const p of V.pl) { const dx = Math.abs(p.x - C.hx); if (dx < p.s * 1.1 && C.hy + V.PL > p.y - p.s * 0.1 && C.hy < p.y + p.s * 0.2 && (!best || p.y < best.y)) best = p; }
    V.brush = best ? null : V.pl.find(p => Math.abs(p.x - C.hx) < p.s * 1.7 && Math.abs(p.y - C.hy - V.PL * 0.6) < p.s * 1.4) || null;
    return best;
  }
  function grab() {   // pinza chiusa: tiene il peluche? (centratura, rarita', quanto e' scesa in basso; la pinza fortunata tiene sempre)
    const C = V.claw, p = V.cand; V.cand = null;
    thud(0.5, 600); beep(900, 0.04, 0.03, 0.05, 'square');
    if (!p || !V.pl.includes(p)) { V.held = null; return; }
    const a = Math.abs(p.x - C.hx) / p.s, f = Math.max(0.6, Math.min(1, 0.6 + (C.hy + V.PL - p.y) / p.s));
    const ch = V.luck ? 1 : HOLD[p.r] * (1 - 0.5 * Math.min(1, a)) * f;
    V.held = p; p.taken = 1; V.pl.splice(V.pl.indexOf(p), 1); V.gL = C.L; V.gX = C.x;
    V.slip = Math.random() < ch ? -1 : (Math.random() < 0.35 ? 0.92 + Math.random() * 0.07 : Math.random() * 0.75);   // quando molla: 0 = appena preso, 1 = sopra la buca
  }
  function won(p) { if (V.filling) return; V.pq.push(p); if (V.ph === 'idle' || V.ph === 'miss') next(); }
  function next() {   // premi in coda (di solito uno; due se ne cade un altro nella buca spinto dalla pinza)
    const p = V.pq.shift(); if (!p) { idle(); return; }
    thud(0.7, 200); clearTimeout(V.t1); finishPrize(p);
  }
  function finishPrize(p) {
    const lucky = V.luck; let r = p.r; if (lucky && r === 0) r = 1;
    const pool = CQX.ITEMS.filter(i => i.r === r), w = pool.map(i => CQX.owned(i.id) ? 1 : 3), tot = w.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, it = pool[0]; for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { it = pool[i]; break; } }
    const c = CQX.coll(), dup = (c[it.id] || 0) > 0; c[it.id] = (c[it.id] || 0) + 1;
    S().gruPity = r >= 1 ? 0 : pity() + 1; V.luck = false;
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
    box.querySelector('.grWear').onclick = () => { const L = Object.assign(cqLook(), it.k === 'h' ? { ht: it.id } : it.k === 'f' ? { fc: it.id } : { skin: it.id }); store.settings.cqLook = L; saveStore(); const N = cq.net; if (N) N.F.set(cqNetRef(`cq/${N.code}/pl/${N.sid}`), { name: (store.settings.myName || 'Tu').trim().slice(0, 14) || 'Tu', look: cqLook(), ts: Date.now() }).catch(() => {}); cqToast('👕 Fatto! Ora hai ' + it.e + ' <b>' + esc(it.n) + '</b>.'); box.remove(); next(); };
    box.querySelector('.grOk').onclick = () => { box.remove(); next(); };
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
    const C = V.claw, sp = V.gw * 0.5, ph = V.ph;
    // cosa vuole la pinza in questa fase: kx = carrello (-1 / 0 / 1), ky = cavo (-1 su / 1 giu')
    let kx = 0, ky = 0;
    if (ph === 'move') {
      kx = V.kx; ky = V.ky;
      if (V.tx != null) { kx = Math.abs(V.tx - C.x) < 4 ? 0 : Math.sign(V.tx - C.x); ky = Math.abs(V.ty - C.hy - V.PL * 0.5) < 8 ? 0 : Math.sign(V.ty - C.hy - V.PL * 0.5); }
      const left = TIME - (now() - V.t0); V.left = left;
      if (left <= 0) { V.ph = 'auto'; V.kx = V.ky = 0; V.tx = V.ty = null; ctl('<p class="grMsg">⏱ Tempo scaduto: la pinza scende da sola!</p>'); }
    } else if (ph === 'auto') ky = 1;
    else if (ph === 'close') { C.cl = Math.min(1, (now() - V.gt) / 0.45); if (C.cl >= 1) { grab(); V.ph = 'up'; beep(260, 0.4, 0.03, 0, 'sawtooth'); } }
    else if (ph === 'up') { ky = -1; if (C.L <= V.L0 + 0.5) V.ph = 'carry'; }
    else if (ph === 'carry') { kx = -1; if (C.x <= V.home + 1 && Math.abs(C.vx) < 12) { C.x = V.home; C.vx = 0; V.ph = 'open'; V.rt = now(); } }
    else if (ph === 'open') {
      C.cl = Math.max(0, 1 - (now() - V.rt) / 0.35);
      if (V.held) { const H = V.held; H.px = H.x; H.py = H.y - 1; H.nc = 90; V.pl.push(H); V.held = null; V.rel = 1; beep(600, 0.06, 0.03); }
      if (C.cl <= 0) { V.ph = 'settle'; V.st = now(); }
    } else if (ph === 'settle') {
      const busyChute = V.pl.some(p => p.x < V.BX + p.s * 0.5 && p.y < V.gy1 + 34), el = now() - V.st;
      if ((el > 0.9 && !busyChute && V.lo < 0.05) || el > 6) {
        for (const q of V.pl) q.taken = 0;
        if (V.pq.length) next();
        else missed(V.slipped ? (Math.random() < 0.5 ? '😱 Ha mollato! C\'eri quasi…' : '😩 Noooo, è scivolato!') : V.brush ? '😬 La pinza è scivolata sul peluche!' : '🙈 Niente nella pinza…');
      }
    } else {   // idle / miss / prize: la pinza torna a casa
      if (C.L > V.L0 + 0.5) ky = -1; else if (Math.abs(C.x - V.home) > 1) kx = Math.sign(V.home - C.x);
      if (C.cl > 0) C.cl = Math.max(0, C.cl - dt * 3);
    }
    const lidT = (ph === 'carry' && V.held && C.x < V.home + V.chW) || (ph === 'open' && V.held) || ((ph === 'open' || ph === 'settle') && V.rel && now() - V.rt < 5 && (now() - V.rt < 0.6 || V.pl.some(q => q.taken))) ? 1 : 0;
    if (Math.abs(lidT - V.lo) > 0.001) { if (lidT && V.lo < 0.05) { thud(0.3, 300); beep(420, 0.06, 0.02); } V.lo += (lidT - V.lo) * Math.min(1, dt * 7); if (Math.abs(lidT - V.lo) < 0.002) V.lo = lidT; }
    // carrello e cavo
    let vt = kx * sp; if (ph !== 'move') vt = kx * Math.min(sp, Math.abs(C.x - V.home) * 5);   // verso casa frena dolce
    const ac = 1700 * dt, vx0 = C.vx;
    C.vx += Math.max(-ac, Math.min(ac, vt - C.vx));
    C.x += C.vx * dt;
    const xl = V.gx0 + 24, xr = V.gx1 - 24; if (C.x < xl || C.x > xr) { C.x = Math.max(xl, Math.min(xr, C.x)); C.vx = 0; }
    const L0 = C.L; C.L = Math.max(V.L0, Math.min(V.Lmax, C.L + ky * sp * 0.75 * dt));
    if ((kx || ky) && (V.sndT -= dt) <= 0) { V.sndT = 0.12; beep(ky ? 110 : 140, 0.08, 0.012, 0, 'sawtooth'); }
    // pendolo: il carrello che accelera fa oscillare la pinza
    const ax = (C.vx - vx0) / dt;
    C.w += (-(PG / C.L) * Math.sin(C.th) - 0.28 * (ax / C.L) * Math.cos(C.th)) * dt - C.w * 1.8 * dt;
    C.th = Math.max(-0.7, Math.min(0.7, C.th + C.w * dt));
    place();
    // peluche portato: tra le griffe, oscilla con la pinza; quando molla cade da solo
    const H = V.held;
    if (H) {
      const ly = V.HR * 0.5 + H.s * 0.8, tx = C.hx + Math.sin(C.th) * ly, ty = C.hy + Math.cos(C.th) * ly, k = Math.min(1, dt * 14);
      H.px = H.x; H.py = H.y; H.x += (tx - H.x) * k; H.y += (ty - H.y) * k; H.a = -C.th; H.sq *= 0.9;
      const prog = V.ph === 'up' ? 0.5 * (V.gL - C.L) / Math.max(1, V.gL - V.L0) : V.ph === 'carry' ? 0.5 + 0.5 * (V.gX - C.x) / Math.max(1, V.gX - V.home) : 0;
      if (V.slip >= 0 && prog >= V.slip) { H.taken = 0; H.nc = 60; H.px = H.x; H.py = H.y; V.pl.push(H); V.held = null; V.slip = -1; V.slipped = true; C.cl = 0.55; C.w += (Math.random() - 0.5) * 1.2; beep(500, 0.06, 0.04); beep(300, 0.15, 0.04, 0.06, 'triangle'); }
    }
    // fisica a passi fissi
    V.acc += dt; let n = 0;
    while (V.acc >= DT && n < 8) { phys(); V.acc -= DT; n++; }
    if (n === 8) V.acc = 0;
    // la testa non entra nei peluche appoggiati: scendendo si ferma sopra (ma i peluche liberi li sposta)
    let ov = 0, hit = false;
    for (const p of V.pl) { if (p === V.cand) continue; const d = Math.hypot(p.x - C.hx, p.y - C.hy), o = V.HR + p.s * 0.85 - d; if (o > ov) ov = o; if (p.hit) hit = true; }
    if (ky > 0 && ov > V.HR * 0.5) { C.L = Math.max(V.L0, Math.min(C.L, L0)); place(); if (V.ph === 'auto') prendi(); }
    else if (V.ph === 'auto' && C.L >= V.Lmax - 0.5) prendi();
    if (hit) { C.w *= 0.9; if ((V.sqT = (V.sqT || 0) - dt) <= 0) { V.sqT = 0.35; beep(240 + Math.random() * 60, 0.06, 0.02, 0, 'sine'); } }
    // peluche nuovi che cadono dall'alto quando ne mancano
    if ((ph === 'idle' || ph === 'miss') && V.pl.length < NPL && (V.spT -= dt) <= 0) { V.spT = 0.5; const p = newPlush(V.gw); spawn(p, V.gy0 + p.s + 4); }
  }
  function plush(g, p, t, sq) {
    const s = p.s, b = sq != null ? sq : p.sq + p.wb * 0.16 * Math.sin(t * 26 + p.ph);
    g.save(); g.translate(p.x, p.y + s * 0.85 + Math.sin(t * 2 + p.ph) * 0.5); g.rotate(p.a || 0); g.scale(1 + b * 0.7, 1 - b); g.translate(0, -s * 0.85);
    const x = 0, y = 0;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, s * 0.85, s * 0.8, s * 0.2, 0, 0, 7); g.fill();
    const c = p.col, dk = p.r === 3 ? '#c8960c' : p.r === 2 ? '#7a3ab8' : p.r === 1 ? '#2a6ab8' : 'rgba(0,0,0,.15)';
    if (p.r >= 2) { g.fillStyle = p.r === 3 ? 'rgba(255,220,100,.35)' : 'rgba(200,140,255,.3)'; g.beginPath(); g.arc(x, y, s * 1.45, 0, 7); g.fill(); }
    // orecchie: orso / coniglio / gatto
    g.fillStyle = c;
    if (p.ears === 0) for (const k of [-1, 1]) { g.beginPath(); g.arc(x + k * s * 0.62, y - s * 0.72, s * 0.3, 0, 7); g.fill(); }
    else if (p.ears === 1) for (const k of [-1, 1]) { g.beginPath(); g.ellipse(x + k * s * 0.35, y - s * 1.05, s * 0.17, s * 0.5, k * 0.15, 0, 7); g.fill(); }
    else for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + k * s * 0.75, y - s * 0.35); g.lineTo(x + k * s * 0.6, y - s * 1.05); g.lineTo(x + k * s * 0.15, y - s * 0.7); g.fill(); }
    // zampette, corpo morbido, pancia
    for (const k of [-1, 1]) { g.beginPath(); g.ellipse(x + k * s * 0.5, y + s * 0.78, s * 0.26, s * 0.17, 0, 0, 7); g.fill(); }
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.strokeStyle = dk; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(x, y + s * 0.45, s * 0.42, s * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - s * 0.35, y - s * 0.45, s * 0.25, s * 0.16, -0.5, 0, 7); g.fill();
    // cuciture
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(x, y - s * 0.98); g.lineTo(x, y - s * 0.62); g.stroke(); g.setLineDash([]);
    // faccina sospettosa
    for (const k of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + k * s * 0.32, y - s * 0.05, s * 0.17, s * 0.19, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + k * s * 0.32 + s * 0.07, y, s * 0.09, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(x + k * s * 0.32 - s * 0.2, y - s * 0.28, s * 0.4, s * 0.15); }
    g.fillStyle = 'rgba(255,110,140,.35)'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(x + k * s * 0.55, y + s * 0.2, s * 0.13, s * 0.08, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#3a2a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - s * 0.15, y + s * 0.4); g.quadraticCurveTo(x + s * 0.05, y + s * 0.34, x + s * 0.25, y + s * 0.3); g.stroke();
    if (p.r >= 2) for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1 + p.ph, sx = x + Math.cos(a) * s * 1.2, sy = y + Math.sin(a) * s * 0.9, z = (Math.sin(t * 5 + i) + 1) * 1.6; g.fillStyle = '#fff'; g.fillRect(sx - z / 2, sy - 0.5, z, 1); g.fillRect(sx - 0.5, sy - z / 2, 1, z); }
    g.restore();
  }
  function star(g, x, y, r, a) { g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, b = a + i * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr); } g.closePath(); }
  function chrome(g, x0, y0, x1, y1) { const cg = g.createLinearGradient(x0, y0, x1, y1); cg.addColorStop(0, '#f8f9fc'); cg.addColorStop(0.45, '#b8bdc8'); cg.addColorStop(0.55, '#8a909c'); cg.addColorStop(1, '#e0e4ec'); return cg; }
  // griffe (k = -1 / 1 laterali dietro, 0 quella davanti), nel sistema della testa
  function prongs(g, ks) {
    const C = V.claw, PL = V.PL, sc = PL / 18, op = 1 - C.cl;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const k of ks) {
      const a = k * (0.25 + op * 0.75), lx = Math.sin(a) * PL, ly = Math.cos(a) * PL, hx = lx - k * 5 * sc * (0.4 + C.cl), hy = ly + 7 * sc * (k ? 1 : 0.6);
      g.strokeStyle = '#5a5f6a'; g.lineWidth = 5.5; g.beginPath(); g.moveTo(k * 4, 0); g.lineTo(lx, ly); g.lineTo(hx, hy); g.stroke();
      g.strokeStyle = '#e8ecf2'; g.lineWidth = 3; g.beginPath(); g.moveTo(k * 4, 0); g.lineTo(lx, ly); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = '#c8ccd4'; g.beginPath(); g.arc(lx, ly, 2.6, 0, 7); g.fill();
    }
  }
  function draw() {
    const g = V.cv.getContext('2d'), t = now(), { W, H, gx0, gx1, gy0, gy1, floor, chW, BX } = V, gw = gx1 - gx0, C = V.claw;
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    // sala giochi: muro con luci sfocate che si muovono piano, pavimento a scacchi
    const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#2a1446'); wg.addColorStop(0.75, '#180a2a'); wg.addColorStop(1, '#0e0618'); g.fillStyle = wg; g.fillRect(0, 0, W, H);
    for (const b of V.bok) { const x = b.x * W + Math.sin(t * b.sp + b.ph) * 30, y = b.y * H + Math.cos(t * b.sp * 0.7 + b.ph) * 20, rg = g.createRadialGradient(x, y, 0, x, y, b.r); rg.addColorStop(0, b.c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2); }
    for (let y = H - 64, r = 0; y < H; y += 16, r++) for (let x = (r % 2) * 16 - 16; x < W; x += 32) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, y, 16, 16); }
    // mobile della gru: rosa con i bordi cromati e i pois
    const cx0 = gx0 - 24, cx1 = gx1 + 24, cy0 = gy0 - 84, cy1 = H - 4;
    g.fillStyle = 'rgba(0,0,0,.35)'; cqRR(g, cx0 + 6, cy0 + 30, cx1 - cx0, cy1 - cy0 - 26, 22); g.fill();
    const body = g.createLinearGradient(cx0, 0, cx1, 0); body.addColorStop(0, '#7a1c5c'); body.addColorStop(0.12, '#d84c9c'); body.addColorStop(0.5, '#f27ab8'); body.addColorStop(0.88, '#d84c9c'); body.addColorStop(1, '#7a1c5c');
    g.fillStyle = body; cqRR(g, cx0, cy0 + 24, cx1 - cx0, cy1 - cy0 - 24, 22); g.fill();
    g.save(); cqRR(g, cx0, gy1 + 66, cx1 - cx0, cy1 - gy1 - 66, 22); g.clip();
    for (let y = gy1 + 74, r = 0; y < cy1; y += 18, r++) for (let x = cx0 + 8 + (r % 2) * 9; x < cx1; x += 18) { g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
    g.restore();
    for (const x of [cx0 + 5, cx1 - 11]) { g.fillStyle = chrome(g, x, 0, x + 6, 0); g.fillRect(x, cy0 + 40, 6, cy1 - cy0 - 56); }
    // insegna con le lampadine che corrono e la stella in cima
    const mx0 = cx0 - 6, mw = cx1 - cx0 + 12, my0 = cy0, mh = 62;
    g.fillStyle = '#f2c230'; cqRR(g, mx0 - 3, my0 - 3, mw + 6, mh + 6, 18); g.fill();
    const mg = g.createLinearGradient(0, my0, 0, my0 + mh); mg.addColorStop(0, '#6a32b0'); mg.addColorStop(1, '#3a1870'); g.fillStyle = mg; cqRR(g, mx0, my0, mw, mh, 16); g.fill();
    const per = 2 * (mw + mh), nb = 34;
    for (let i = 0; i < nb; i++) {
      let d = i / nb * per, x, y;
      if (d < mw) { x = mx0 + d; y = my0 + 5; } else if ((d -= mw) < mh) { x = mx0 + mw - 5; y = my0 + d; } else if ((d -= mh) < mw) { x = mx0 + mw - d; y = my0 + mh - 5; } else { d -= mw; x = mx0 + 5; y = my0 + mh - d; }
      const on = (i + Math.floor(t * 8)) % 4 === 0;
      g.fillStyle = on ? '#fff6b0' : '#b8862a'; g.beginPath(); g.arc(x, y, on ? 3.4 : 2.6, 0, 7); g.fill();
      if (on) { g.fillStyle = 'rgba(255,240,150,.35)'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    }
    g.save(); g.shadowColor = '#ff7ac8'; g.shadowBlur = 12 + 6 * Math.sin(t * 3);
    g.fillStyle = '#fff3c4'; g.font = `900 ${Math.min(24, mw / 13)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🧸 PESCA DEI PELUCHE', W / 2, my0 + mh / 2 + 1);
    g.restore();
    g.save(); g.fillStyle = '#ffd84a'; g.strokeStyle = '#a8701a'; g.lineWidth = 2; star(g, W / 2, my0 - 10 + Math.sin(t * 2.4) * 2, 15, Math.sin(t * 1.3) * 0.25); g.fill(); g.stroke(); g.restore();
    // dentro il vetro: carta da parati a cuoricini, faretti, pavimento di peluche, buca dei premi
    g.save(); g.beginPath(); g.rect(gx0, gy0, gw, gy1 - gy0); g.clip();
    const bg = g.createLinearGradient(0, gy0, 0, gy1); bg.addColorStop(0, '#3a1f5c'); bg.addColorStop(1, '#5e3078'); g.fillStyle = bg; g.fillRect(gx0, gy0, gw, gy1 - gy0);
    g.fillStyle = 'rgba(255,170,220,.09)';
    for (let y = gy0 + 14, r = 0; y < floor; y += 26, r++) for (let x = gx0 + 10 + (r % 2) * 13; x < gx1; x += 26) { g.beginPath(); g.arc(x - 2.2, y, 2.6, Math.PI, 0); g.arc(x + 2.2, y, 2.6, Math.PI, 0); g.lineTo(x, y + 5); g.closePath(); g.fill(); }
    for (const [fx, ph] of [[gx0 + gw * 0.38, 0], [gx0 + gw * 0.78, 2]]) {
      const a = 0.08 + 0.02 * Math.sin(t * 1.7 + ph), lg = g.createLinearGradient(0, gy0, 0, floor); lg.addColorStop(0, `rgba(255,240,200,${a * 2})`); lg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(fx - 10, gy0); g.lineTo(fx + 10, gy0); g.lineTo(fx + gw * 0.22, floor); g.lineTo(fx - gw * 0.22, floor); g.closePath(); g.fill();
    }
    const fl = g.createLinearGradient(0, floor - 4, 0, gy1); fl.addColorStop(0, '#8a4a9a'); fl.addColorStop(1, '#5a2a6a'); g.fillStyle = fl; g.fillRect(BX, floor - 2, gx1 - BX, gy1 - floor + 2);
    const ch = g.createLinearGradient(0, floor - V.BH, 0, gy1); ch.addColorStop(0, 'rgba(10,4,16,.25)'); ch.addColorStop(1, '#0a0410'); g.fillStyle = ch; g.fillRect(gx0, floor - V.BH, chW, gy1 - floor + V.BH);
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ffd84a' : '#c8962a'; g.font = '900 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('▼', gx0 + chW / 2, V.lhy - chW * 0.75 - 14);
    // striscia di luci in alto che cambia colore
    for (let x = gx0, i = 0; x < gx1; x += 12, i++) { g.fillStyle = `hsl(${(i * 24 + t * 140) % 360},90%,66%)`; g.fillRect(x + 2, gy0 + 2, 8, 4); }
    g.restore();
    // pannello sotto il vetro: sportello del premio, leva, pulsante, gettoniera col tempo
    const dy0 = gy1 + 8, dh = 52;
    g.fillStyle = '#f2c230'; cqRR(g, gx0 - 10, dy0 - 2, gw + 20, dh + 4, 12); g.fill();
    const dg = g.createLinearGradient(0, dy0, 0, dy0 + dh); dg.addColorStop(0, '#3e1c48'); dg.addColorStop(1, '#22102a'); g.fillStyle = dg; cqRR(g, gx0 - 8, dy0, gw + 16, dh, 10); g.fill();
    g.fillStyle = '#0a0410'; cqRR(g, gx0 + 4, dy0 + 6, chW - 8, dh - 12, 6); g.fill();
    g.fillStyle = V.ph === 'prize' ? (Math.floor(t * 6) % 2 ? '#ffd84a' : '#ff7ac8') : '#c8962a'; g.font = '800 10px system-ui'; g.fillText('PREMIO', gx0 + chW / 2, dy0 + dh / 2);
    const jx = BX + (gx1 - BX) * 0.24, jy = dy0 + dh * 0.62, tilt = (V.ph === 'move' ? V.kx || (V.tx != null ? Math.sign(V.tx - C.x) : 0) : 0) * 0.45, tv = V.ph === 'move' ? V.ky : 0;
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(jx, jy + 6, 16, 6, 0, 0, 7); g.fill();
    g.strokeStyle = chrome(g, jx - 3, 0, jx + 3, 0); g.lineWidth = 4; g.lineCap = 'round'; const kx2 = jx + Math.sin(tilt) * 22, ky2 = jy + 4 - Math.cos(tilt) * 22 + tv * 4; g.beginPath(); g.moveTo(jx, jy + 4); g.lineTo(kx2, ky2); g.stroke();
    const rb = g.createRadialGradient(kx2 - 2, ky2 - 3, 1, kx2, ky2, 8); rb.addColorStop(0, '#ff9a9a'); rb.addColorStop(1, '#c81e2a'); g.fillStyle = rb; g.beginPath(); g.arc(kx2, ky2, 7.5, 0, 7); g.fill();
    const bx = BX + (gx1 - BX) * 0.5, by = dy0 + dh / 2 + 2, lit = V.ph === 'move' && Math.floor(t * 4) % 2;
    g.fillStyle = '#5a0a14'; g.beginPath(); g.ellipse(bx, by + 3, 14, 9, 0, 0, 7); g.fill();
    g.fillStyle = lit ? '#ff5a6a' : '#c81e2a'; g.beginPath(); g.ellipse(bx, by, 13, 8.5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(bx - 4, by - 3, 4, 2, -0.3, 0, 7); g.fill();
    const sx0 = gx1 - Math.min(92, (gx1 - BX) * 0.34), sw = gx1 - 10 - sx0;
    g.fillStyle = '#0a0a12'; cqRR(g, sx0, dy0 + 8, sw, dh - 16, 6); g.fill();
    g.font = '900 15px ui-monospace,monospace'; g.textAlign = 'center';
    if (V.ph === 'move') { const l = Math.max(0, V.left); g.fillStyle = l < 5 ? (Math.floor(t * 6) % 2 ? '#ff5a4a' : '#ffb0a0') : '#7bff8a'; g.fillText('⏱ ' + String(Math.ceil(l)).padStart(2, '0'), sx0 + sw / 2, dy0 + dh / 2); }
    else if (V.ph === 'idle') { g.fillStyle = Math.floor(t * 1.5) % 2 ? '#ffd84a' : '#7a6020'; g.font = '800 10px system-ui'; g.fillText('INSERISCI', sx0 + sw / 2, dy0 + dh / 2 - 6); g.fillText(COST + ' 🪙', sx0 + sw / 2, dy0 + dh / 2 + 7); }
    else { g.fillStyle = '#7bff8a'; g.fillText('· · ·', sx0 + sw / 2, dy0 + dh / 2); }
    // peluche (dentro il vetro e nello scivolo del premio)
    g.save(); g.beginPath(); g.rect(gx0, gy0, gw, gy1 - gy0); g.rect(gx0, gy1, chW, 60); g.clip();
    const P = V.pl.slice().sort((a, b) => a.y - b.y);
    for (const p of P) plush(g, p, t);
    g.restore();
    // pinza: binario, carrello, cavo che penzola, testa e griffe
    const rail = V.rail;
    g.fillStyle = chrome(g, 0, rail - 4, 0, rail + 4); g.fillRect(gx0, rail - 4, gw, 8);
    g.fillStyle = '#4a4f5a'; for (let x = gx0 + 6; x < gx1; x += 14) g.fillRect(x, rail - 1, 6, 2);
    g.fillStyle = chrome(g, 0, rail - 10, 0, rail + 10); cqRR(g, C.x - 17, rail - 10, 34, 20, 6); g.fill();
    g.fillStyle = V.ph === 'move' && (C.vx || V.ky) ? '#7bff8a' : '#3a6a40'; g.beginPath(); g.arc(C.x + 10, rail, 2.5, 0, 7); g.fill();
    const ex = C.hx - Math.sin(C.th) * V.HR, ey = C.hy - Math.cos(C.th) * V.HR, mxc = (C.x + ex) / 2 - C.w * 7, myc = (rail + 10 + ey) / 2;
    g.lineCap = 'round'; g.strokeStyle = '#2a2a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(C.x, rail + 10); g.quadraticCurveTo(mxc, myc, ex, ey); g.stroke();
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 1; g.beginPath(); g.moveTo(C.x - 0.5, rail + 10); g.quadraticCurveTo(mxc - 0.5, myc, ex - 0.5, ey); g.stroke();
    g.save(); g.translate(C.hx, C.hy); g.rotate(-C.th);
    prongs(g, [-1, 1]);
    const HR = V.HR; g.fillStyle = chrome(g, -HR * 1.3, 0, HR * 1.3, 0); cqRR(g, -HR * 1.3, -HR * 1.1, HR * 2.6, HR * 1.7, 5); g.fill();
    g.fillStyle = '#f08ab8'; g.fillRect(-HR * 1.3, -HR * 0.35, HR * 2.6, 3); g.fillStyle = '#5a5f6a'; for (const k of [-1, 1]) { g.beginPath(); g.arc(k * HR * 0.8, -HR * 0.7, 1.6, 0, 7); g.fill(); }
    g.restore();
    if (V.held) plush(g, V.held, t, 0.06);
    g.save(); g.translate(C.hx, C.hy); g.rotate(-C.th); prongs(g, [0]); g.restore();
    if (V.luck && V.ph !== 'idle') { g.fillStyle = `rgba(255,230,120,${0.22 + 0.18 * Math.sin(t * 6)})`; g.beginPath(); g.arc(C.hx, C.hy + V.PL * 0.4, V.PL * 0.8, 0, 7); g.fill(); }
    { const [tx, ty] = lidTip(); g.lineCap = 'round'; g.strokeStyle = '#4a4f5a'; g.lineWidth = 7; g.beginPath(); g.moveTo(V.lhx, V.lhy); g.lineTo(tx, ty); g.stroke(); g.strokeStyle = chrome(g, V.lhx, V.lhy, tx, ty); g.lineWidth = 4.5; g.stroke(); g.strokeStyle = '#f08ab8'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#e8ecf2'; g.beginPath(); g.arc(V.lhx, V.lhy, 4, 0, 7); g.fill(); g.fillStyle = '#5a5f6a'; g.beginPath(); g.arc(V.lhx, V.lhy, 1.6, 0, 7); g.fill(); }
    // parete trasparente della buca, riflessi del vetro che scorrono, cornice
    g.fillStyle = 'rgba(200,230,255,.22)'; g.fillRect(BX - 2, floor - V.BH, 4, V.BH); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(BX - 2, floor - V.BH, 4, 2);
    g.save(); g.beginPath(); g.rect(gx0, gy0, gw, gy1 - gy0); g.clip();
    const sh = ((t * 40) % (gw * 2.4)) - gw * 0.6;
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(gx0 + sh, gy0); g.lineTo(gx0 + sh + 46, gy0); g.lineTo(gx0 + sh - 60, gy1); g.lineTo(gx0 + sh - 106, gy1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(gx0 + 18, gy0); g.lineTo(gx0 + 50, gy0); g.lineTo(gx0 + 10, gy1 - 40); g.lineTo(gx0, gy1 - 60); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = chrome(g, gx0, gy0, gx1, gy1); g.lineWidth = 5; g.strokeRect(gx0 - 1, gy0 - 1, gw + 2, gy1 - gy0 + 2);
    // coriandoli
    V.fx = V.fx.filter(f => t - f.t0 < f.d);
    for (const f of V.fx) { const k = t - f.t0, x = f.x + f.vx * k, y = f.y + f.vy * k + 500 * k * k; g.fillStyle = f.c; g.fillRect(x, y, 5, 3); }
  }
  const css = document.createElement('style');
  css.textContent = `
#grRoot{position:fixed;inset:0;z-index:55;background:radial-gradient(ellipse at 50% 40%,#3a2040,#120a18);touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
#grRoot>canvas{position:absolute;inset:0;width:100%;height:100%}
#grRoot .grTop{position:absolute;left:10px;right:10px;top:8px;display:flex;justify-content:space-between;font-weight:800;font-size:14px;z-index:2;text-shadow:0 1px 3px #000}
#grRoot .grCtl{position:absolute;left:10px;right:10px;bottom:56px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;z-index:2}
#grRoot .grCtl button{padding:13px 16px;border-radius:14px;border:3px solid #fff3c4;background:linear-gradient(#f08ab8,#b04a8a);color:#fff;font-weight:900;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.5)}
#grRoot .grRow{display:flex;gap:8px;justify-content:center;width:100%}#grRoot .grRow button{min-width:66px;font-size:24px;padding:10px 12px}
#grRoot .grCtl .grGrab{width:min(300px,92%);background:linear-gradient(#ffd84a,#e0a020);color:#3a2a10;font-size:20px}
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
  return { tick, pub, busy, open, close, get V() { return V; }, play, prendi, finishPrize, album, idle: () => V && idle() };
})();
