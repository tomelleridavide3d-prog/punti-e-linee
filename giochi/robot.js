// L'officina dei robot - PROTOTIPO (24-10-2026, vedi CLAUDE.md "OFFICINA DEI ROBOT: SI RIPARTE").
// Un robot alla Robocraft: si parte da una CABINA col tuo personaggio seduto dentro e si attaccano i pezzi dove vuoi su una griglia 7x7
// (telaio, corazza, ruote, cingoli, cuneo, sega, martello, cannone, fiamma). Una piccola FISICA VERA: ogni pezzo ha peso e posizione,
// le ruote spingono dal punto dove sono (ruote da un lato solo = il robot tira storto), gli urti spingono e fanno girare, i pezzi colpiti
// si rompono e quello che resta attaccato solo a loro cade a terra. BANCO DI PROVA: guidi subito nello scantinato con un manichino da
// spingere nella fossa o fare a pezzi. Niente avversario e niente manche per ora: prima costruzione e guida devono dare il "wow".
(() => {
  const W = 26, H = 22, AX0 = 3, AX1 = 23, AY0 = 3, AY1 = 19;
  const B = 0.8, RB = 0.43, BS = B / 0.5, GN = 7, GC = 3, MAXW = 45;   // un blocco = 0,8 caselle (robot grandi); la griglia 7x7 con la cabina al centro; BS = scala del disegno dei pezzi
  const PIT = [17.3, 13.4, 2.4];
  const SPAWN = [[7.4, 10.5, 0], [14.6, 8.2, Math.PI * 0.85]];   // io, il manichino
  const PZ = {
    cabina: { n: 'Cabina', w: 3, hp: 30 },
    telaio: { n: 'Telaio', w: 1, hp: 10, d: 'Il blocco base: dà forma al robot e tiene attaccati gli altri pezzi. Leggero.' },
    corazza: { n: 'Corazza', w: 3, hp: 30, d: 'Pesante e durissima: protegge la cabina e i collegamenti. Più pesi, più sei lento… ma difficile da spostare.' },
    ruota: { n: 'Ruota', w: 1, hp: 8, drive: 18, vmax: 4.3, mu: 1.0, d: 'Spinge dal punto dove la metti. Ruote ai lati = curve strette; tutte da una parte = tiri storto!' },
    cingolo: { n: 'Cingolo', w: 2, hp: 14, drive: 26, vmax: 3.0, mu: 1.5, d: 'Più lento della ruota ma spinge forte e tiene la strada: difficile da spostare di lato.' },
    cuneo: { n: 'Cuneo', w: 2, hp: 18, dir: 1, d: 'Muso inclinato: chi ci sbatte contro ci sale sopra e le sue ruote perdono presa. Perfetto per spingere nella fossa. Toccalo di nuovo per girarlo.' },
    sega: { n: 'Sega', w: 1.5, hp: 8, dir: 1, wpn: 'hold', d: 'Tieni premuto: la lama gira e taglia i pezzi che tocca. Si scalda: lasciala respirare. Toccala di nuovo per girarla.' },
    martello: { n: 'Martello', w: 2, hp: 10, dir: 1, wpn: 'tap', cd: 1.6, d: 'Un colpo secco davanti: spacca il pezzo che prende e fa sobbalzare l\'altro. Toccalo di nuovo per girarlo.' },
    cannone: { n: 'Cannone', w: 2, hp: 8, dir: 1, wpn: 'tap', cd: 2.2, d: 'Spara lontano e spinge… anche te all\'indietro (il rinculo ti fa girare se è di lato!). Toccalo di nuovo per girarlo.' },
    fiamma: { n: 'Fiamma', w: 1, hp: 6, dir: 1, wpn: 'hold', d: 'Tieni premuto: getto di fuoco corto che brucia i pezzi. Il gas finisce e si ricarica. Toccala di nuovo per girarla.' }
  };
  const PAL = ['telaio', 'corazza', 'ruota', 'cingolo', 'cuneo', 'sega', 'martello', 'cannone', 'fiamma'];
  const WPN = ['sega', 'martello', 'cannone', 'fiamma'], WICO = { sega: '🪚', martello: '🔨', cannone: '💣', fiamma: '🔥' };
  const TEAM = ['#e0662e', '#2e86d8'];
  const now = () => performance.now() / 1000;
  const angN = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
  const angD = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const U0 = () => ({ mode: '', tool: 'telaio', parts: [], fx: [], shake: 0, slowT: 0, hold: {}, tap: null, pops: {}, msg: null, say: '' });
  const U = U0();

  // ======================= LO SCANTINATO (banco di prova) =======================
  function mapRobot() {
    const rooms = [{ n: 'Banco di prova', x: AX0, y: AY0, w: AX1 - AX0, h: AY1 - AY0, k: 'metal', vk: 'metal', c: ['#4a4e56', '#474b53'], wc: '#3a3e46', nl: 1 }];
    return { w: W, h: H, rooms, doors: [], decals: [], props: [], trees: [], tasks: [], hall: 0, cams: [], vending: [], ring: [[7, 11]], button: { x: -10, y: -10 }, sabs: {},
      inn: { 'Banco di prova': 'sul banco di prova' }, help: '', btnTxt: '', sabTxt: '', pxFloor: floorArena, drawWall, bg: () => '#14161c', sky: skyDraw };
  }
  CQ_MAPS.robot2 = { n: 'Banco di prova', make: mapRobot, only: 'robot' };
  const hsh = (x, y, k) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 7, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  function floorArena(K, x, y) {
    const { g, S, poly, TW } = K, P = (u, v) => S(x + u, y + v, 0);
    poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], (x + y) % 2 ? '#4c5058' : '#484c54');
    if (TW >= 24) {
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = Math.max(1, TW / 50); g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(1, 0)); g.moveTo(...P(0, 0)); g.lineTo(...P(0, 1)); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 6; i++) { const u = 0.12 + (i % 3) * 0.32, v = 0.18 + Math.floor(i / 3) * 0.5 + (i % 2) * 0.12, [X, Y] = P(u, v); g.fillRect(X - TW * 0.05, Y - 1, TW * 0.1, 2); }
      for (const [u, v] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) { const [X, Y] = P(u, v); g.fillStyle = '#2e3138'; g.beginPath(); g.arc(X, Y, Math.max(1.2, TW / 34), 0, 7); g.fill(); }
      if (hsh(x, y, 3) < 0.2) { const [X, Y] = P(0.3 + 0.4 * hsh(x, y, 4), 0.3 + 0.4 * hsh(x, y, 5)); g.fillStyle = 'rgba(20,16,10,.25)'; g.beginPath(); g.ellipse(X, Y, TW * 0.22, TW * 0.09, 0, 0, 7); g.fill(); }
    }
    const edge = (x === AX0 ? 1 : 0) | (x === AX1 - 1 ? 2 : 0) | (y === AY0 ? 4 : 0) | (y === AY1 - 1 ? 8 : 0);
    if (edge) { const k = 0.16; for (let i = 0; i < 4; i++) { const u0 = i / 4, u1 = (i + 1) / 4, col = (i + x + y) % 2 ? '#e8b830' : '#1c1c20';
      if (edge & 1) poly([P(0, u0), P(k, u0), P(k, u1), P(0, u1)], col); if (edge & 2) poly([P(1 - k, u0), P(1, u0), P(1, u1), P(1 - k, u1)], col);
      if (edge & 4) poly([P(u0, 0), P(u1, 0), P(u1, k), P(u0, k)], col); if (edge & 8) poly([P(u0, 1 - k), P(u1, 1 - k), P(u1, 1), P(u0, 1)], col); } }
    // la fossa (ritagliata nella sua casella)
    const [px, py, pr] = PIT; if (px + pr + 0.4 > x && px - pr - 0.4 < x + 1 && py + pr + 0.4 > y && py - pr - 0.4 < y + 1) {
      g.save(); g.beginPath(); { const q = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]; g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); } g.clip();
      const disc = (cx, cy, r, col, z = 0) => { g.beginPath(); for (let i = 0; i <= 32; i++) { const a = i / 32 * 6.2832, [X, Y] = S(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.fillStyle = col; g.fill(); };
      for (let i = 0; i < 16; i++) { const a0 = i / 16 * 6.2832, a1 = (i + 1) / 16 * 6.2832, R1 = pr + 0.28; g.beginPath(); for (const [a, r] of [[a0, pr], [a1, pr], [a1, R1], [a0, R1]]) g.lineTo(...S(px + Math.cos(a) * r, py + Math.sin(a) * r, 0)); g.closePath(); g.fillStyle = i % 2 ? '#e8b830' : '#1c1c20'; g.fill(); }
      disc(px, py, pr, '#08080a');
      g.fillStyle = '#3a2a24'; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = -2.36 + i / 16 * 3.14, [X, Y] = S(px + Math.cos(a) * pr, py + Math.sin(a) * pr, 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } for (let i = 16; i >= 0; i--) { const a = -2.36 + i / 16 * 3.14, [X, Y] = S(px + Math.cos(a) * pr * 0.96, py + Math.sin(a) * pr * 0.96, -0.5); g.lineTo(X, Y); } g.fill();
      disc(px + 0.15, py + 0.15, pr * 0.7, '#020203', -0.5);
      g.restore();
    }
  }
  function drawWall(K, x, y) {
    const { bx, S, poly } = K;
    if (x === AX0 - 1 && y === AY0 - 1) { bx(x + 0.55, y + 0.55, x + 1, y + 1, 0, 2.6, '#4a2e28'); return; }
    if (y === AY0 - 1 && x >= AX0 && x < AX1) { const Y = AY0, HT = 2.5; poly([S(x, Y, 0), S(x + 1, Y, 0), S(x + 1, Y, HT), S(x, Y, HT)], '#5a3a32'); bricks(K, x, x + 1, Y, HT, 'x'); pipe(K, x, x + 1, AY0 + 0.12, 1.85, 'x', '#8a7a5a'); pipe(K, x, x + 1, AY0 + 0.1, 2.15, 'x', '#6a7a8a'); if (x % 5 === 2) lampX(K, x + 0.5, AY0 + 0.08); if (x % 7 === 4) poster(K, x, AY0); return; }
    if (x === AX0 - 1 && y >= AY0 && y < AY1) { const X = AX0, HT = 2.5; poly([S(X, y, 0), S(X, y + 1, 0), S(X, y + 1, HT), S(X, y, HT)], '#4e322c'); bricks(K, y, y + 1, X, HT, 'y'); pipe(K, y, y + 1, AX0 + 0.12, 1.7, 'y', '#7a5a4a'); if (y % 4 === 1) lampY(K, AX0 + 0.08, y + 0.5); if (y === 9) toolWall(K, AX0, y); return; }
    if (x === AX1 && y >= AY0 && y < AY1) { bx(x, y, x + 0.4, y + 1, 0, 0.32, '#8a8a90'); for (let i = 0; i < 2; i++) bx(x - 0.01, y + i * 0.5, x + 0.01, y + i * 0.5 + 0.25, 0.08, 0.24, '#e8b830'); return; }
    if (y === AY1 && x >= AX0 && x < AX1) { bx(x, y, x + 1, y + 0.4, 0, 0.32, '#8a8a90'); for (let i = 0; i < 2; i++) bx(x + i * 0.5, y - 0.01, x + i * 0.5 + 0.25, y + 0.01, 0.08, 0.24, '#e8b830'); return; }
    if (x === AX1 && y === AY1) bx(x, y, x + 0.4, y + 0.4, 0, 0.32, '#8a8a90');
  }
  function bricks(K, a0, a1, c, HT, dir) {
    const { g, S, TW } = K; if (TW < 24) return; g.strokeStyle = 'rgba(20,10,8,.35)'; g.lineWidth = Math.max(1, TW / 60); g.beginPath();
    for (let z = 0.22, r = 0; z < HT; z += 0.22, r++) { const A = dir === 'x' ? S(a0, c, z) : S(c, a0, z), Bp = dir === 'x' ? S(a1, c, z) : S(c, a1, z); g.moveTo(A[0], A[1]); g.lineTo(Bp[0], Bp[1]); for (const u of r % 2 ? [0.25, 0.75] : [0.5]) { const P0 = dir === 'x' ? S(a0 + u, c, z - 0.22) : S(c, a0 + u, z - 0.22), P1 = dir === 'x' ? S(a0 + u, c, z) : S(c, a0 + u, z); g.moveTo(P0[0], P0[1]); g.lineTo(P1[0], P1[1]); } }
    g.stroke();
  }
  function pipe(K, a0, a1, c, z, dir, col) {
    const { g, S, TW } = K, A = dir === 'x' ? S(a0, c, z) : S(c, a0, z), Bp = dir === 'x' ? S(a1, c, z) : S(c, a1, z);
    g.strokeStyle = cqShade(col, 0.7); g.lineWidth = Math.max(3, TW / 8); g.beginPath(); g.moveTo(A[0], A[1] + 1); g.lineTo(Bp[0], Bp[1] + 1); g.stroke();
    g.strokeStyle = col; g.lineWidth = Math.max(2, TW / 12); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(Bp[0], Bp[1]); g.stroke();
  }
  function lampY(K, x, y) { const { bx } = K; bx(x, y - 0.12, x + 0.12, y + 0.12, 2.05, 2.25, '#2a2a30'); bx(x + 0.04, y - 0.1, x + 0.2, y + 0.1, 1.9, 2.05, '#ffe6a0'); K.glow(x + 0.3, y, 1.8, 2.4, 'rgba(255,214,140,.30)'); }
  function lampX(K, x, y) { const { bx } = K; bx(x - 0.12, y, x + 0.12, y + 0.12, 2.05, 2.25, '#2a2a30'); bx(x - 0.1, y + 0.04, x + 0.1, y + 0.2, 1.9, 2.05, '#ffe6a0'); K.glow(x, y + 0.3, 1.8, 2.4, 'rgba(255,214,140,.30)'); }
  function poster(K, x, Y) { const { poly, S } = K; poly([S(x + 0.15, Y + 0.02, 0.7), S(x + 0.85, Y + 0.02, 0.7), S(x + 0.85, Y + 0.02, 1.5), S(x + 0.15, Y + 0.02, 1.5)], '#e8d8b0'); poly([S(x + 0.22, Y + 0.03, 0.8), S(x + 0.78, Y + 0.03, 0.8), S(x + 0.78, Y + 0.03, 1.4), S(x + 0.22, Y + 0.03, 1.4)], '#c83a2a'); poly([S(x + 0.35, Y + 0.04, 0.95), S(x + 0.65, Y + 0.04, 0.95), S(x + 0.65, Y + 0.04, 1.25), S(x + 0.35, Y + 0.04, 1.25)], '#f2f2f6'); }
  function toolWall(K, X, y) { const { poly, S, g, TW } = K; poly([S(X + 0.02, y - 1, 0.8), S(X + 0.02, y + 2, 0.8), S(X + 0.02, y + 2, 1.8), S(X + 0.02, y - 1, 1.8)], '#8a6a4a'); g.strokeStyle = '#2a2a30'; g.lineWidth = Math.max(2, TW / 18); g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 5; i++) { const A = S(X + 0.04, y - 0.6 + i * 0.6, 1.65), Bq = S(X + 0.04, y - 0.6 + i * 0.6 + (i % 2 ? 0.1 : -0.1), 1.0); g.moveTo(...A); g.lineTo(...Bq); } g.stroke(); g.lineCap = 'butt'; }
  let SKY = null;
  function skyDraw(g, CXc, CYc, tx, ty, TW) {
    const w = cq.w / (cq.vz || 1), h = cq.h / (cq.vz || 1);
    if (!SKY || SKY.w !== w || SKY.h !== h) { const cv = document.createElement('canvas'), d = Math.min(2, cq.dpr); cv.width = Math.round(w * d); cv.height = Math.round(h * d); const c = cv.getContext('2d'); c.scale(d, d); const gr = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.8); gr.addColorStop(0, '#2a2c34'); gr.addColorStop(1, '#0c0d12'); c.fillStyle = gr; c.fillRect(0, 0, w, h); SKY = { cv, w, h }; }
    g.drawImage(SKY.cv, 0, 0, w, h);
    if (tx == null) return;
    const Uz = TW * 0.575, S = (x, y, z = 0) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * Uz];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const box = (x0, y0, x1, y1, z0, z1, col) => { poly([S(x0, y1, z1), S(x1, y1, z1), S(x1, y1, z0), S(x0, y1, z0)], cqShade(col, 0.74)); poly([S(x1, y1, z1), S(x1, y0, z1), S(x1, y0, z0), S(x1, y1, z0)], cqShade(col, 0.55)); poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], cqShade(col, 1.06)); };
    poly([S(-6, -6), S(32, -6), S(32, 28), S(-6, 28)], '#2a2b30');
    for (let i = 0; i < 7; i++) { const y = AY0 + 0.5 + i * 2.2; box(AX1 + 1.2, y, AX1 + 2.1, y + 0.9, 0, 0.7 + (i % 2) * 0.4, i % 3 ? '#7a5a3a' : '#5a6a7a'); }
    for (let i = 0; i < 8; i++) { const x = AX0 + 0.5 + i * 2.5; box(x, AY1 + 1.2, x + 0.9, AY1 + 2.0, 0, 0.6 + (i % 3) * 0.3, i % 2 ? '#6a4a32' : '#4a5a3a'); }
  }

  // ======================= IL PROGETTO (griglia 7x7, cabina al centro) =======================
  // progetto: { b: [[gx, gy, tipo, dir]] } (dir 0 avanti, 1 destra, 2 dietro, 3 sinistra). Avanti = in alto nella griglia.
  const D0 = () => ({ b: [[GC, GC, 'cabina', 0]] });
  const key = (x, y) => x + ',' + y;
  function cleanD(d) {
    const out = { b: [[GC, GC, 'cabina', 0]] }, seen = new Set([key(GC, GC)]);
    if (d && Array.isArray(d.b)) for (const q of d.b) { if (!Array.isArray(q)) continue; const [x, y, t, r] = q; if (!PZ[t] || t === 'cabina' || !(x >= 0 && x < GN && y >= 0 && y < GN) || seen.has(key(x, y))) continue; seen.add(key(x, y)); out.b.push([x | 0, y | 0, t, (r | 0) % 4]); }
    return out;
  }
  const myD = () => cleanD(store.settings.robo2);
  const saveD = d => { store.settings.robo2 = d; saveStore(); };
  const wOf = d => d.b.reduce((s, q) => s + PZ[q[2]].w, 0);
  // quali pezzi sono collegati alla cabina (4 vicini)
  function linked(list) {
    const m = new Map(list.map((q, i) => [key(q[0], q[1]), i])), ok = new Set(), st = [];
    const c = list.findIndex(q => q[2] === 'cabina'); if (c < 0) return ok; ok.add(c); st.push(c);
    while (st.length) { const i = st.pop(), [x, y] = list[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = m.get(key(x + dx, y + dy)); if (j != null && !ok.has(j)) { ok.add(j); st.push(j); } } }
    return ok;
  }
  // numeri del progetto per l'officina: peso, velocita' massima, spinta, agilita'
  function statsOf(d) {
    const L = linked(d.b), bl = d.b.filter((q, i) => L.has(i)), M = bl.reduce((s, q) => s + PZ[q[2]].w, 0);
    let P = 0, Pv = 0, nW = 0, sp = 0; for (const q of bl) { const p = PZ[q[2]]; if (!p.drive) continue; P += p.drive; Pv += p.drive / p.vmax; nW++; sp = Math.max(sp, Math.abs(q[0] - GC)); }
    const v = nW ? P / (Pv + 0.12 * M) * 0.75 : 0, grip = bl.reduce((s, q) => s + (PZ[q[2]].mu || 0), 0);
    return { M, v, push: M * (0.4 + 0.6 * Math.min(1, grip / 4)), agi: nW ? Math.min(1, (sp * 0.45 + 0.1) * P / Math.max(1, M) / 3) : 0, nW, loose: d.b.length - bl.length, wpn: WPN.filter(t => bl.some(q => q[2] === t)) };
  }

  // ======================= LA FISICA =======================
  // un corpo: { x, y (baricentro nel mondo), a, vx, vy, w, bl: [{ gx, gy, t, d, hp, mx, lu, lv, fl }], M, I, team, ko, debris }
  function makeBody(d, x, y, a, team) {
    const L = linked(d.b), bl = d.b.filter((q, i) => L.has(i)).map(([gx, gy, t, r]) => ({ gx, gy, t, d: r, hp: PZ[t].hp, mx: PZ[t].hp, fl: -9, burn: 0 }));
    const b = { x, y, a, vx: 0, vy: 0, w: 0, bl, team, cu: 0, cv: 0, lift: 0, heat: 0, fuel: 3, cd: {}, act: {}, wa: 0, ko: 0, inp: { thr: 0, steer: 0 } };
    mass(b, true); return b;
  }
  const gu = q => (GC - q.gy) * B, gv = q => (q.gx - GC) * B;   // posizione nella griglia: u avanti, v a destra
  function mass(b, first) {
    let M = 0, su = 0, sv = 0; for (const q of b.bl) { const m = PZ[q.t].w; M += m; su += gu(q) * m; sv += gv(q) * m; }
    if (!M) { b.M = 1; b.I = 1; b.R = 0.4; return; }
    const cu = su / M, cv = sv / M;
    if (!first) { const du = cu - b.cu, dv = cv - b.cv, c = Math.cos(b.a), s = Math.sin(b.a); b.x += c * du - s * dv; b.y += s * du + c * dv; }
    b.cu = cu; b.cv = cv; let I = 0;
    for (const q of b.bl) { const m = PZ[q.t].w; q.lu = gu(q) - cu; q.lv = gv(q) - cv; I += m * (q.lu * q.lu + q.lv * q.lv + B * B / 6); }
    b.M = M; b.I = Math.max(0.2, I); b.R = Math.max(0.4, ...b.bl.map(q => Math.hypot(q.lu, q.lv) + RB));
  }
  // dov'e' un blocco nel mondo
  const wpos = (b, q) => { const c = Math.cos(b.a), s = Math.sin(b.a); return [b.x + c * q.lu - s * q.lv, b.y + s * q.lu + c * q.lv]; };
  function impulse(b, jx, jy, rx, ry) { b.vx += jx / b.M; b.vy += jy / b.M; b.w += (rx * jy - ry * jx) / b.I; }
  // un pezzo si rompe: via dal robot; quello che resta attaccato solo a lui cade a terra (pezzi sciolti)
  function breakBlock(G, b, q) {
    const [x, y] = wpos(b, q); ev(G, 'brk', x, y, q.t, b.team);
    b.bl = b.bl.filter(o => o !== q);
    if (q.t !== 'cabina') { q.hp = 0.5; detach(G, b, q, 2.2); }   // il pezzo rotto resta a terra come rottame (annerito, fuma)
    if (q.t === 'cabina') { for (const o of b.bl.slice()) detach(G, b, o, 3.5); b.bl = []; koBody(G, b, 'boom', x, y); return; }
    if (!b.bl.length) return;
    const L = linked(b.bl.map(o => [o.gx, o.gy, o.t, o.d]));
    const lose = b.bl.filter((o, i) => !L.has(i)); for (const o of lose) detach(G, b, o, 1.2);
    b.bl = b.bl.filter((o, i) => L.has(i)); mass(b, false);
  }
  function detach(G, b, q, kick) {
    const [x, y] = wpos(b, q), rx = x - b.x, ry = y - b.y, l = Math.hypot(rx, ry) || 1;
    const vx = b.vx - b.w * ry + rx / l * kick * (0.5 + Math.random()), vy = b.vy + b.w * rx + ry / l * kick * (0.5 + Math.random());
    const o = { x, y, a: b.a + q.d * Math.PI / 2, vx, vy, w: (Math.random() - 0.5) * 9, bl: [{ gx: GC, gy: GC, t: q.t, d: 0, hp: Math.max(1, q.hp), mx: q.mx, fl: -9, burn: 0, lu: 0, lv: 0 }], team: b.team, debris: 1, z: 0.4, vz: 2 + Math.random() * 2, cd: {}, act: {} };
    o.M = PZ[q.t].w; o.I = o.M * B * B / 6 + 0.05; o.R = RB; o.cu = 0; o.cv = 0;
    G.rbs.push(o); const deb = G.rbs.filter(x2 => x2.debris); if (deb.length > 34) G.rbs = G.rbs.filter(x2 => x2 !== deb[0]);
  }
  function koBody(G, b, why, x, y) { if (b.ko) return; b.ko = why; b.koT = G.time; ev(G, why === 'fall' ? 'fall' : 'ko', x != null ? x : b.x, y != null ? y : b.y, 0, b.team); }
  // un colpo a un blocco
  function hurt(G, b, q, dmg, ty) {
    if (b.ko || dmg <= 0 || !b.bl.includes(q)) return; q.hp -= dmg; q.fl = G.time;
    if (ty) ev(G, 'h', ...wpos(b, q), Math.round(dmg), ty);
    if (q.hp <= 0) breakBlock(G, b, q);
  }
  // il giro della fisica (sottopassi piccoli: niente compenetrazioni)
  function physics(G, dt) {
    const N = 3, h = dt / N;
    for (let k = 0; k < N; k++) {
      for (const b of G.rbs) drive(G, b, h);
      for (const b of G.rbs) { if (b.fall) continue; b.x += b.vx * h; b.y += b.vy * h; b.a = angN(b.a + b.w * h); if (b.debris && b.z > 0) { b.vz -= 14 * h; b.z = Math.max(0, b.z + b.vz * h); } }
      for (let i = 0; i < G.rbs.length; i++) for (let j = i + 1; j < G.rbs.length; j++) collide(G, G.rbs[i], G.rbs[j]);
      for (const b of G.rbs) walls(G, b);
    }
    for (const b of G.rbs) {   // nella fossa
      if (b.fall) { b.fall += dt; continue; }
      if (b.bl.length && Math.hypot(b.x - PIT[0], b.y - PIT[1]) < PIT[2] - 0.25) { b.fall = 0.001; b.fx = b.x; b.fy = b.y; if (!b.debris) koBody(G, b, 'fall'); }
    }
    G.rbs = G.rbs.filter(b => !(b.debris && b.fall > 1.2));
  }
  function drive(G, b, h) {
    if (b.fall) return;
    if (b.debris) { const f = 1 - Math.min(1, (b.z > 0 ? 0.3 : 5) * h); b.vx *= f; b.vy *= f; b.w *= 1 - Math.min(1, 4 * h); return; }
    const inp = b.inp || { thr: 0, steer: 0 }, c = Math.cos(b.a), s = Math.sin(b.a), lift = b.lift > G.time ? 0.25 : 1, on = b.ko ? 0 : 1;
    let n = 0; for (const q of b.bl) if (PZ[q.t].drive) n++;
    if (!n) { const f = 1 - Math.min(1, 3 * h); b.vx *= f; b.vy *= f; b.w *= f; return; }
    let tq = 0;
    for (const q of b.bl) {
      const p = PZ[q.t]; if (!p.drive) continue;
      const rx = c * q.lu - s * q.lv, ry = s * q.lu + c * q.lv, pvx = b.vx - b.w * ry, pvy = b.vy + b.w * rx;
      const vf = pvx * c + pvy * s, vl = -b.vx * s + b.vy * c;   // (di lato conta solo lo scivolare del robot, non il suo girare: la presa non frena le curve)
      tq += p.drive * (Math.abs(q.lv) + 0.2);
      // spinta della ruota: avanti/indietro + differenziale per sterzare (le ruote a sinistra spingono di piu' per girare a destra)
      const tw = clamp(inp.thr * on - inp.steer * on * Math.sign(q.lv) * 0.9 * (Math.abs(q.lv) > 0.05 ? 1 : 0), -1, 1);
      const F = p.drive * clamp(tw - vf / p.vmax, -1, 1) * lift;
      impulse(b, c * F * h, s * F * h, rx, ry);
      // presa laterale (le ruote non scivolano di lato... finche' la spinta non e' troppa)
      const cap = p.mu * (b.M / n) * 9.8 * h * lift, j = clamp(-vl * (b.M / n) * 0.85, -cap, cap); b.vx += -s * j / b.M; b.vy += c * j / b.M;
    }
    // STERZO: quanto puo' girare dipende da quanta spinta hanno le ruote e da quanto sono larghe (ruote tutte in fila = non gira);
    // senza sterzo il robot non si raddrizza da solo: ruote storte o perse = tira da una parte
    if (Math.abs(inp.steer) > 0.02 && on) { const want = inp.steer * 2.9, tmax = tq * 0.55 * lift; b.w += clamp((want - b.w) * b.I * 10, -tmax, tmax) * h / b.I; }
    else b.w *= 1 - Math.min(1, 2.6 * h * lift);
    // resistenza: piu' pesi, piu' sei lento
    const k = Math.min(1, 0.12 * h); b.vx -= b.vx * k; b.vy -= b.vy * k; b.w *= 1 - Math.min(1, 0.6 * h);
  }
  function walls(G, b) {
    if (b.fall) return; const c = Math.cos(b.a), s = Math.sin(b.a);
    for (const q of b.bl) {
      const rx = c * q.lu - s * q.lv, ry = s * q.lu + c * q.lv, x = b.x + rx, y = b.y + ry;
      for (const [nx, ny, pen] of [[1, 0, AX0 + RB - x], [-1, 0, x - (AX1 - RB)], [0, 1, AY0 + RB - y], [0, -1, y - (AY1 - RB)]]) {
        if (pen <= 0) continue; b.x += nx * pen; b.y += ny * pen;
        const pvx = b.vx - b.w * ry, pvy = b.vy + b.w * rx, vn = pvx * nx + pvy * ny; if (vn >= 0) continue;
        const rn = rx * ny - ry * nx, j = -1.25 * vn / (1 / b.M + rn * rn / b.I); impulse(b, nx * j, ny * j, rx, ry);
        if (-vn > 2.2 && !b.debris) { ev(G, 'bang', x, y, Math.min(1, -vn / 5), 0); if (-vn > 3.2) hurt(G, b, q, (-vn - 3.2) * 4, 'urto'); }
      }
    }
  }
  // urti fra due corpi: blocco contro blocco (cerchi), impulso con rotazione, attrito, danni sopra una certa velocita'; il cuneo solleva
  function collide(G, A, Bd) {
    if (A.fall || Bd.fall || !A.bl.length || !Bd.bl.length || (A.debris && Bd.debris && (A.z > 0.05 || Bd.z > 0.05))) return;
    if (Math.hypot(Bd.x - A.x, Bd.y - A.y) > A.R + Bd.R) return;
    const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(Bd.a), sb = Math.sin(Bd.a);
    for (const qa of A.bl) { const xa = A.x + ca * qa.lu - sa * qa.lv, ya = A.y + sa * qa.lu + ca * qa.lv;
      for (const qb of Bd.bl) { const xb = Bd.x + cb * qb.lu - sb * qb.lv, yb = Bd.y + sb * qb.lu + cb * qb.lv;
        const dx = xb - xa, dy = yb - ya, d = Math.hypot(dx, dy); if (d >= 2 * RB || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, pen = 2 * RB - d, iA = 1 / A.M, iB = 1 / Bd.M, tot = iA + iB;
        A.x -= nx * pen * 0.8 * iA / tot; A.y -= ny * pen * 0.8 * iA / tot; Bd.x += nx * pen * 0.8 * iB / tot; Bd.y += ny * pen * 0.8 * iB / tot;
        const mx = (xa + xb) / 2, my = (ya + yb) / 2, pax = mx - A.x, pay = my - A.y, pbx = mx - Bd.x, pby = my - Bd.y;
        const vax = A.vx - A.w * pay, vay = A.vy + A.w * pax, vbx = Bd.vx - Bd.w * pby, vby = Bd.vy + Bd.w * pbx, rvx = vbx - vax, rvy = vby - vay, vn = rvx * nx + rvy * ny;
        if (vn >= 0) continue;
        const ra = pax * ny - pay * nx, rb = pbx * ny - pby * nx, den = iA + iB + ra * ra / A.I + rb * rb / Bd.I, j = -1.18 * vn / den;
        impulse(A, -nx * j, -ny * j, pax, pay); impulse(Bd, nx * j, ny * j, pbx, pby);
        // attrito di striscio
        const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = clamp(-vt / den * 0.5, -0.35 * j, 0.35 * j); impulse(A, -tx * jt, -ty * jt, pax, pay); impulse(Bd, tx * jt, ty * jt, pbx, pby);
        // il cuneo: chi ci sbatte di fronte ci sale sopra (le sue ruote perdono presa per un attimo)
        if (qa.t === 'cuneo' && !Bd.debris && Math.cos(A.a + qa.d * Math.PI / 2) * nx + Math.sin(A.a + qa.d * Math.PI / 2) * ny > 0.5) { if (Bd.lift < G.time) ev(G, 'lift', xb, yb, 0, Bd.team); Bd.lift = G.time + 0.7; }
        if (qb.t === 'cuneo' && !A.debris && -(Math.cos(Bd.a + qb.d * Math.PI / 2) * nx + Math.sin(Bd.a + qb.d * Math.PI / 2) * ny) > 0.5) { if (A.lift < G.time) ev(G, 'lift', xa, ya, 0, A.team); A.lift = G.time + 0.7; }
        // botta: rumore, scintille, danni
        const sp = -vn; if (sp > 1.4 && !(A.debris && Bd.debris)) { const k2 = 'c' + (A.uid || '') + (Bd.uid || ''); if (!G.cT[k2] || G.time - G.cT[k2] > 0.18) { G.cT[k2] = G.time; ev(G, 'bang', mx, my, Math.min(1, sp / 5), 1); }
          if (sp > 1.9 && !A.debris && !Bd.debris) { const dm = (sp - 1.9) * 5; hurt(G, A, qa, dm * (qa.t === 'cuneo' ? 0.3 : 1) * Math.min(2, Bd.M / A.M), 'urto'); hurt(G, Bd, qb, dm * (qb.t === 'cuneo' ? 0.3 : 1) * Math.min(2, A.M / Bd.M), 'urto'); return; } }
      } }
  }
  // ---- le armi ----
  function weapons(G, b, dt) {
    if (b.ko || b.debris || b.fall) return; const inp = b.inp || {}, T = G.time;
    // sega e fiamma: si tengono premute (si scaldano / finisce il gas)
    const saws = b.bl.filter(q => q.t === 'sega'), fl = b.bl.filter(q => q.t === 'fiamma');
    b.act.sega = !!(inp.sega && saws.length && !b.hot); if (b.act.sega) b.heat += dt; else b.heat = Math.max(0, b.heat - dt * 0.8); if (b.heat >= 3) b.hot = 1; if (b.hot && b.heat < 1) b.hot = 0;
    b.act.fiamma = !!(inp.fiamma && fl.length && b.fuel > 0); if (b.act.fiamma) b.fuel = Math.max(0, b.fuel - dt); else b.fuel = Math.min(3, b.fuel + dt * 0.6);
    for (const q of saws) if (b.act.sega) { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2, tx = x + Math.cos(fa) * 0.32 * BS, ty = y + Math.sin(fa) * 0.32 * BS;
      for (const o of G.rbs.slice()) { if (o === b || o.fall) continue; for (const r of o.bl.slice()) { const [ox, oy] = wpos(o, r); if (Math.hypot(ox - tx, oy - ty) < 0.42 * BS) { hurt(G, o, r, 10 * dt, null); impulse(o, Math.cos(fa) * 3 * dt, Math.sin(fa) * 3 * dt, ox - o.x, oy - o.y); if (Math.random() < dt * 20) ev(G, 'saw', tx, ty, 0, 0); } } } }
    for (const q of fl) if (b.act.fiamma) { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      for (const o of G.rbs.slice()) { if (o === b || o.fall) continue; for (const r of o.bl.slice()) { const [ox, oy] = wpos(o, r), dx = ox - x, dy = oy - y, d = Math.hypot(dx, dy); if (d < 1.5 * BS && d > 0.2 && Math.abs(angD(Math.atan2(dy, dx), fa)) < 0.5) { hurt(G, o, r, 5 * dt, null); r.burn = T + 2; } } } }
    for (const q of b.bl) if (q.t === 'martello' && inp.martello && !(b.cd['m' + q.gx + q.gy] > T)) { b.cd['m' + q.gx + q.gy] = T + PZ.martello.cd; q.sw = T; G.hams.push({ b, q, t: T + 0.16 }); }
    for (const q of b.bl) if (q.t === 'cannone' && inp.cannone && !(b.cd['c' + q.gx + q.gy] > T)) { b.cd['c' + q.gx + q.gy] = T + PZ.cannone.cd; q.sw = T; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      G.proj.push({ x: x + Math.cos(fa) * 0.4 * BS, y: y + Math.sin(fa) * 0.4 * BS, dx: Math.cos(fa), dy: Math.sin(fa), t: T, own: b }); impulse(b, -Math.cos(fa) * 5, -Math.sin(fa) * 5, x - b.x, y - b.y); ev(G, 'shot', x, y, fa, 0); }
    inp.martello = inp.cannone = false;
  }
  function hammers(G) {
    G.hams = G.hams.filter(Hm => { if (G.time < Hm.t) return true; const b = Hm.b; if (!b.bl.includes(Hm.q) || b.ko) return false; const [x, y] = wpos(b, Hm.q), fa = b.a + Hm.q.d * Math.PI / 2, tx = x + Math.cos(fa) * 0.55 * BS, ty = y + Math.sin(fa) * 0.55 * BS; let hit = 0;
      for (const o of G.rbs.slice()) { if (o === b || o.fall) continue; const L = o.bl.map(r => [r, ...wpos(o, r)]).filter(([, ox, oy]) => Math.hypot(ox - tx, oy - ty) < 0.5 * BS).sort((p, q) => Math.hypot(p[1] - tx, p[2] - ty) - Math.hypot(q[1] - tx, q[2] - ty)).slice(0, 2);
        for (const [r, ox, oy] of L) { impulse(o, Math.cos(fa) * 4, Math.sin(fa) * 4, ox - o.x, oy - o.y); if (!o.debris) o.lift = G.time + 0.4; hurt(G, o, r, 14, 'martello'); hit = 1; } }
      ev(G, 'ham', tx, ty, hit, 0); return false; });
  }
  function projectiles(G, dt) {
    G.proj = G.proj.filter(p => { for (let k = 0; k < 3; k++) { p.x += p.dx * 11 * dt / 3; p.y += p.dy * 11 * dt / 3;
      if (p.x < AX0 || p.x > AX1 || p.y < AY0 || p.y > AY1 || G.time - p.t > 1.2) { ev(G, 'pop', p.x, p.y, 0, 0); return false; }
      for (const o of G.rbs) { if (o === p.own || o.fall) continue; for (const r of o.bl) { const [ox, oy] = wpos(o, r); if (Math.hypot(ox - p.x, oy - p.y) < RB + 0.08) { impulse(o, p.dx * 7, p.dy * 7, ox - o.x, oy - o.y); hurt(G, o, r, 9, 'cannone'); ev(G, 'pop', p.x, p.y, 1, 0); return false; } } } }
      return true; });
  }
  function burning(G, dt) { for (const b of G.rbs) for (const q of b.bl.slice()) if (q.burn > G.time) { if (Math.random() < dt * 2) ev(G, 'ember', ...wpos(b, q), 0, 0); hurt(G, b, q, 2 * dt, null); } }
  function ev(G, k, x, y, a, b) { G.evs.push([k, x, y, a, b]); if (G.evs.length > 80) G.evs.shift(); }

  // ======================= SUONI =======================
  const sfxOk = () => { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
  function swp(f0, f1, d, v, delay = 0, type = 'sine') { const A = sfxOk(); if (!A) return; const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d); g.gain.setValueAtTime(Math.min(0.5, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d + 0.02); }
  let NOISE = null;
  function noise(d, v, f, delay = 0, type = 'lowpass', q = 0.8) { const A = sfxOk(); if (!A) return; if (!NOISE || NOISE.sampleRate !== A.sampleRate) { NOISE = A.createBuffer(1, A.sampleRate, A.sampleRate); const ch = NOISE.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } const t = A.currentTime + delay, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = NOISE; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(Math.min(0.6, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(A.destination); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02); }
  const SFX = {
    clank: k => { swp(700 + k * 200, 300, 0.1, 0.05, 0, 'square'); noise(0.12, 0.1, 2600, 0, 'bandpass', 3); swp(1800, 1600, 0.05, 0.02, 0.06, 'triangle'); },
    rot: () => { swp(900, 1300, 0.07, 0.03, 0, 'triangle'); },
    del: () => { noise(0.15, 0.08, 900); swp(500, 200, 0.12, 0.03, 0, 'square'); },
    no: () => { swp(300, 200, 0.15, 0.03, 0, 'square'); },
    go: () => { [392, 523, 659, 784].forEach((f, i) => swp(f, f, 0.18, 0.035, i * 0.08, 'square')); noise(0.6, 0.1, 400, 0.3); },
    bang: k => { noise(0.18 + k * 0.25, 0.12 + k * 0.25, 500 + k * 400); swp(160, 50, 0.2 + k * 0.2, 0.05 + k * 0.08, 0, 'square'); for (let i = 0; i < Math.round(k * 4); i++) swp(2000 + Math.random() * 2000, 700, 0.08, 0.015, 0.03 + i * 0.03, 'triangle'); },
    brk: () => { noise(0.4, 0.22, 700); for (let i = 0; i < 5; i++) swp(1500 + Math.random() * 1800, 500, 0.1, 0.02, 0.04 + i * 0.05, 'triangle'); },
    ham: h => { noise(0.35, h ? 0.3 : 0.12, 300); swp(120, 40, 0.3, h ? 0.14 : 0.06, 0, 'sine'); },
    shot: () => { noise(0.5, 0.3, 350); swp(150, 40, 0.45, 0.12, 0, 'sine'); },
    pop: k => { noise(0.25, k ? 0.2 : 0.08, 800); },
    lift: () => { swp(300, 900, 0.18, 0.03, 0, 'triangle'); },
    fall: () => { swp(900, 80, 1.2, 0.06, 0, 'triangle'); noise(0.5, 0.2, 300, 1.0); },
    ko: () => { noise(1.2, 0.35, 260); swp(110, 30, 1.0, 0.16, 0, 'sine'); for (let i = 0; i < 10; i++) swp(1600 + Math.random() * 2500, 400, 0.15, 0.015, 0.05 + i * 0.06, 'triangle'); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => swp(f, f, 0.25, 0.04, 0.3 + i * 0.12, 'triangle')); }
  };
  // il motore che ronza (piu' acuto quando vai forte) e la sega che fischia: suoni continui
  const HUM = { o: null, g: null, s: null, sg: null };
  function hum(spd, saw, on) {
    if (!HUM.o && !on) return; const A = sfxOk(); if (!A) return;
    if (!HUM.o) { const o = A.createOscillator(), f = A.createBiquadFilter(), g = A.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; o.connect(f); f.connect(g); g.connect(A.destination); o.start(); const s = A.createOscillator(), sg = A.createGain(); s.type = 'sawtooth'; s.frequency.value = 1700; sg.gain.value = 0; s.connect(sg); sg.connect(A.destination); s.start(); Object.assign(HUM, { o, g, s, sg }); }
    const t = A.currentTime; HUM.o.frequency.setTargetAtTime(48 + spd * 26, t, 0.08); HUM.g.gain.setTargetAtTime(on ? 0.014 + Math.min(0.02, spd * 0.006) : 0, t, 0.1);
    HUM.sg.gain.setTargetAtTime(on && saw ? 0.006 : 0, t, 0.05); HUM.s.frequency.setTargetAtTime(1500 + Math.random() * 400, t, 0.05);
  }

  // ======================= DISEGNO DEL ROBOT =======================
  // strumenti isometrici girati: frame(angolo, ox, oy, oz) -> S(p, q, z); box() con le facce verso chi guarda
  function iso(g, X, Y, TW) {
    const Uz = TW * 0.575;
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const frame = (ang, ox, oy, oz, k = 1) => { const c = Math.cos(ang), s = Math.sin(ang); return { a: ang, S: (p, q, z) => { p *= k; q *= k; z *= k; const x = ox + c * p - s * q, y = oy + s * p + c * q; return [X + (x - y) * TW / 2, Y + (x + y) * TW / 4 - (z + oz) * Uz]; } }; };
    const box = (fr, u0, u1, v0, v1, z0, z1, col) => {
      const C = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]], c = Math.cos(fr.a), s = Math.sin(fr.a);
      for (let i = 0; i < 4; i++) { const [nu, nv] = N[i], nx = c * nu - s * nv, ny = s * nu + c * nv; if (nx + ny <= 0.001) continue; const sh = (Math.max(0, nx) * 0.6 + Math.max(0, ny) * 0.82) / (Math.max(0, nx) + Math.max(0, ny)); const A = C[i], Bq = C[(i + 1) % 4]; poly([fr.S(A[0], A[1], z0), fr.S(Bq[0], Bq[1], z0), fr.S(Bq[0], Bq[1], z1), fr.S(A[0], A[1], z1)], cqShade(col, sh)); }
      poly([fr.S(u0, v0, z1), fr.S(u1, v0, z1), fr.S(u1, v1, z1), fr.S(u0, v1, z1)], cqShade(col, 1.08));
    };
    return { Uz, poly, frame, box };
  }
  // un robot (o un pezzo sciolto): blocchi dal piu' lontano al piu' vicino, il pilota seduto nella cabina
  function drawBody(g, X, Y, TW, b, o = {}) {
    const K = iso(g, X, Y, TW), { frame } = K, T = o.T != null ? o.T : -1;
    if (b.fall) { const k = Math.max(0, 1 - b.fall / 0.9); if (k <= 0) return; g.save(); g.translate(X, Y + (1 - k) * TW * 0.8); g.scale(k, k); g.translate(-X, -Y); }
    const lz = (b.lift > T ? 0.12 : 0) + (b.z || 0), c = Math.cos(b.a), s = Math.sin(b.a);
    if (!b.debris || (b.z || 0) < 0.05) { g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y, TW * (b.R || 0.4) * 0.72, TW * (b.R || 0.4) * 0.34, 0, 0, 7); g.fill(); }
    const L = b.bl.map(q => { const ox = c * q.lu - s * q.lv, oy = s * q.lu + c * q.lv; return [ox + oy, q, ox, oy]; }).sort((p, q) => p[0] - q[0]);
    for (const [, q, ox, oy] of L) block(g, K, frame(b.a + q.d * Math.PI / 2, ox, oy, lz, BS), frame(b.a, ox, oy, lz, BS), q, b, TW, o);
    if (b.fall) g.restore();
  }
  function block(g, K, F, F0, q, b, TW, o) {
    const { box, poly } = K, t = now(), T = o.T != null ? o.T : -1, hk = q.mx ? q.hp / q.mx : 1, flash = T - q.fl < 0.08, dim = c => flash ? '#ffffff' : hk < 0.35 ? cqShade(c, 0.6) : hk < 0.7 ? cqShade(c, 0.82) : c, h = 0.25, team = TEAM[b.team || 0], S = F.S;
    if (q.t === 'telaio') { box(F0, -h, h, -h, h, 0.06, 0.3, dim(team)); if (TW > 30) { const S0 = F0.S; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...S0(-h + 0.05, -h + 0.05, 0.301)); g.lineTo(...S0(h - 0.05, -h + 0.05, 0.301)); g.lineTo(...S0(h - 0.05, h - 0.05, 0.301)); g.lineTo(...S0(-h + 0.05, h - 0.05, 0.301)); g.closePath(); g.stroke(); } }
    else if (q.t === 'corazza') { box(F0, -h, h, -h, h, 0.04, 0.4, dim('#7c848e')); if (TW > 30) for (const [u, v] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) { const [Xr, Yr] = F0.S(u, v, 0.401); g.fillStyle = dim('#545a62'); g.beginPath(); g.arc(Xr, Yr, Math.max(1.2, TW / 30), 0, 7); g.fill(); } }
    else if (q.t === 'ruota') { box(F0, -0.12, 0.12, -0.08, 0.08, 0.1, 0.22, '#3a3e48'); const spin = (b.wa || 0); box(F0, -0.24, 0.24, -0.13, 0.13, 0, 0.42, dim('#1e1f24')); const S0 = F0.S; g.strokeStyle = '#4a4c54'; g.lineWidth = Math.max(1, TW / 40); g.beginPath(); for (let i = 0; i < 4; i++) { const u = -0.24 + (((i * 0.12 + spin * 0.1) % 0.48) + 0.48) % 0.48; for (const v of [-0.13, 0.13]) { g.moveTo(...S0(u, v, 0.01)); g.lineTo(...S0(u, v, 0.41)); } } g.stroke(); for (const v of [-0.135, 0.135]) { const [Xh, Yh] = S0(0, v, 0.21); g.fillStyle = '#b8bcc4'; g.beginPath(); g.arc(Xh, Yh, Math.max(1.5, TW * 0.04), 0, 7); g.fill(); } }
    else if (q.t === 'cingolo') { box(F0, -h, h, -0.17, 0.17, 0, 0.34, dim('#2a2a30')); const S0 = F0.S, spin = (b.wa || 0); g.strokeStyle = '#55565e'; g.lineWidth = Math.max(1, TW / 36); g.beginPath(); for (let i = 0; i < 5; i++) { const u = -h + (((i * 0.1 + spin * 0.08) % 0.5) + 0.5) % 0.5; g.moveTo(...S0(u, -0.17, 0.341)); g.lineTo(...S0(u, 0.17, 0.341)); } g.stroke(); }
    else if (q.t === 'cuneo') { box(F, -h, -0.1, -h, h, 0.04, 0.34, dim('#8a929c')); const A = S(-0.1, -h, 0.34), Bq = S(-0.1, h, 0.34), C = S(h + 0.04, h, 0.02), D = S(h + 0.04, -h, 0.02); poly([A, Bq, C, D], dim('#c0c8d0')); poly([S(-0.1, -h, 0.04), S(-0.1, -h, 0.34), D], dim('#8a929c')); poly([S(-0.1, h, 0.04), S(-0.1, h, 0.34), C], dim('#7a828c')); g.strokeStyle = '#e8b830'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(...C); g.lineTo(...D); g.stroke(); }
    else if (q.t === 'sega') { box(F, -h, 0, -0.12, 0.12, 0.06, 0.26, dim('#5a5e68')); const on = b.act && b.act.sega, spin = on ? t * 40 : t * 2, R = 0.28, N = 22; g.beginPath(); for (let i = 0; i <= N; i++) { const a = spin + i / N * 6.2832, r = i % 2 ? R : R + 0.06, [Xp, Yp] = S(0.18 + Math.cos(a) * r, Math.sin(a) * r, 0.24); i ? g.lineTo(Xp, Yp) : g.moveTo(Xp, Yp); } g.closePath(); g.fillStyle = dim(on && b.heat > 2 ? '#ffb08a' : '#d0d8e0'); g.fill(); g.strokeStyle = '#7a8088'; g.lineWidth = 1; g.stroke(); const [Xc, Yc] = S(0.18, 0, 0.25); g.fillStyle = '#5a5e68'; g.beginPath(); g.ellipse(Xc, Yc, TW * 0.06, TW * 0.03, 0, 0, 7); g.fill(); }
    else if (q.t === 'martello') { box(F, -h, -0.05, -0.14, 0.14, 0.04, 0.3, dim('#4a505a')); const a2 = q.sw != null ? T - q.sw : 9, up = a2 < 0 ? 0 : a2 < 0.16 ? a2 / 0.16 : a2 < 0.3 ? 1 - (a2 - 0.16) / 0.14 : 0, ang = up * 1.2, hl = 0.55, cz = 0.3 + Math.sin(ang) * hl, cu = -0.1 + Math.cos(ang) * hl; g.strokeStyle = '#2a2a30'; g.lineWidth = Math.max(3, TW / 12); g.lineCap = 'round'; g.beginPath(); g.moveTo(...S(-0.1, 0, 0.3)); g.lineTo(...S(cu, 0, cz)); g.stroke(); g.lineCap = 'butt'; box({ a: F.a, S: (pp, qq, z) => S(pp + cu, qq, z + cz - 0.12) }, -0.1, 0.1, -0.16, 0.16, 0, 0.24, dim('#6a707a')); }
    else if (q.t === 'cannone') { const a2 = q.sw != null ? T - q.sw : 9, rc = a2 >= 0 && a2 < 0.25 ? (1 - a2 / 0.25) * 0.1 : 0; box(F, -h, 0.05, -0.18, 0.18, 0.04, 0.3, '#4a505a'); box(F, -0.05 - rc, 0.42 - rc, -0.08, 0.08, 0.16, 0.3, dim('#2e323a')); box(F, 0.38 - rc, 0.46 - rc, -0.1, 0.1, 0.14, 0.32, '#1a1c22'); }
    else if (q.t === 'fiamma') { box(F, -h, 0.02, -0.16, 0.16, 0.04, 0.34, dim('#c8382e')); box(F, -0.2, -0.02, -0.12, 0.12, 0.34, 0.38, '#e8e0d0'); box(F, 0.02, 0.3, -0.05, 0.05, 0.18, 0.26, '#3a3e48'); const [Xp, Yp] = S(0.31, 0, 0.22); g.fillStyle = b.act && b.act.fiamma ? '#ffd24a' : '#3a8aff'; g.beginPath(); g.arc(Xp, Yp, Math.max(1.5, TW * 0.035), 0, 7); g.fill(); }
    else if (q.t === 'cabina') {
      box(F0, -h, h, -h, h, 0.04, 0.14, dim(cqShade(team, 0.8)));
      box(F0, -h, -0.15, -0.18, 0.18, 0.14, 0.5, dim('#2a2c34'));   // schienale del sedile
      const Lk = o.look; if (Lk && !o.noPilot) { const [Xp, Yp] = F0.S(0, 0, 0.14), TWp = TW * 0.42 * BS, f = (Math.cos(b.a) - Math.sin(b.a)) >= 0 ? 1 : -1, jit = o.jit || 0;
        g.save(); const clipY = F0.S(0, 0, 0.3)[1]; g.beginPath(); g.rect(Xp - TW * 2, Yp - TW * 4, TW * 4, clipY - (Yp - TW * 4)); g.clip(); cqPlayer(g, Xp + (Math.random() - 0.5) * jit * 3, Yp + (Math.random() - 0.5) * jit * 3 + TWp * 0.12, TWp, Lk, 0, f, true); g.restore(); }
      for (const [u0, u1, v0, v1] of [[-h, h, -h, -h + 0.05], [-h, h, h - 0.05, h], [h - 0.06, h, -h, h]]) box(F0, u0, u1, v0, v1, 0.14, 0.32, dim(team));
      box(F0, 0.12, 0.2, -0.07, 0.07, 0.32, 0.36, '#1a1c22');   // volante
    }
    if (q.burn > T && T > 0) { const [Xf, Yf] = F0.S(0, 0, 0.4); for (let i = 0; i < 3; i++) { const ph = (t * 2.5 + i / 3) % 1, hh = TW * 0.22 * (1 - ph), xo = Xf + (i - 1) * TW * 0.08, yo = Yf - ph * TW * 0.3; g.fillStyle = ph < 0.4 ? '#ffe070' : '#ff7a2a'; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(xo, yo - hh); g.quadraticCurveTo(xo + TW * 0.06, yo, xo, yo + TW * 0.03); g.quadraticCurveTo(xo - TW * 0.06, yo, xo, yo - hh); g.fill(); } g.globalAlpha = 1; }
    if (hk < 0.35 && q.t !== 'ruota' && Math.sin(t * 3 + q.gx * 7 + q.gy) > 0.3) { const [Xs, Ys] = F0.S(0, 0, 0.45 + ((t * 0.8 + q.gx * 0.3) % 1) * 0.8); g.fillStyle = 'rgba(60,60,64,.35)'; g.beginPath(); g.arc(Xs, Ys, TW * 0.08 * BS, 0, 7); g.fill(); }
  }
  // il manichino: un robot da prova con un pupazzo giallo da crash test seduto dentro
  const DUMMY_LOOK = { skin: 'omino', col: '#e8c830', hat: 'nessuno' };
  const DUMMY = { b: [[GC, GC, 'cabina', 0], [2, 3, 'telaio', 0], [4, 3, 'telaio', 0], [3, 2, 'telaio', 0], [3, 4, 'telaio', 0], [2, 2, 'ruota', 0], [4, 2, 'ruota', 0], [2, 4, 'ruota', 0], [4, 4, 'ruota', 0], [3, 1, 'corazza', 0], [1, 3, 'telaio', 0], [5, 3, 'telaio', 0], [3, 5, 'telaio', 0]] };

  // ======================= L'OFFICINA (costruire) =======================
  function css() {
    if (document.getElementById('r2Css')) return;
    const s = document.createElement('style'); s.id = 'r2Css';
    s.textContent = `#r2Shop{position:absolute;left:0;right:0;top:104px;bottom:0;z-index:6;overflow:auto;background:radial-gradient(circle at 50% 0,#3a3e48,#16181e 75%);color:#f2f2f6;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;padding:4px 8px 10px;box-sizing:border-box}
#r2Shop .wrap{max-width:440px;margin:0 auto}#r2Shop canvas.pv{display:block;width:100%;height:160px}#r2Shop .st{display:flex;gap:4px;justify-content:center;flex-wrap:nowrap;height:22px;overflow:hidden;margin:0 0 6px}#r2Shop .st span{background:rgba(0,0,0,.35);border-radius:10px;padding:3px 6px;font:700 11px system-ui;white-space:nowrap}#r2Shop .st i{display:inline-block;height:6px;border-radius:3px;vertical-align:middle;margin-left:4px}
#r2Shop canvas.gr{display:block;margin:0 auto;width:min(84vw,310px);height:min(84vw,310px);touch-action:none;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.5)}#r2Shop .msg{min-height:34px;font-size:12.5px;line-height:1.35;text-align:center;margin:6px 4px;color:#e8e8ee}#r2Shop .msg b{color:#ffd86a}
#r2Shop .pal{display:flex;gap:5px;overflow-x:auto;padding:4px 2px 6px;scrollbar-width:none}#r2Shop .pal button{flex:0 0 64px;border:0;border-radius:12px;background:#3a3e48;color:#fff;font:700 10.5px system-ui;padding:3px 2px;display:flex;flex-direction:column;align-items:center;touch-action:manipulation}#r2Shop .pal button img{width:46px;height:46px;pointer-events:none}#r2Shop .pal button small{opacity:.7;font-size:9.5px}#r2Shop .pal button.on{background:#f2f2f6;color:#1c1c20;box-shadow:0 0 0 3px #e8b830}
#r2Shop .act{display:flex;gap:6px;margin-top:4px}#r2Shop .act button{flex:1;border:0;border-radius:12px;padding:10px 4px;font:800 13px system-ui;background:#4a505c;color:#fff;touch-action:manipulation}#r2Shop .act button.on{background:#c83a2a}#r2Shop .act button.go{flex:1.6;background:linear-gradient(#3ac870,#249a50);font-size:16px;box-shadow:0 4px 0 #1a6a38}
#r2W{position:absolute;right:max(10px,3%);bottom:110px;z-index:5;display:flex;flex-direction:column;gap:9px;align-items:flex-end;user-select:none;-webkit-user-select:none}#r2W button{position:relative;width:82px;height:82px;border-radius:50%;border:3px solid rgba(255,255,255,.4);padding:0;background:radial-gradient(circle at 40% 35%,#5a606c,#22252c);box-shadow:0 5px 16px rgba(0,0,0,.5);touch-action:none;color:#fff;font:800 10px system-ui}#r2W button b{position:absolute;left:0;right:0;top:12px;font-size:32px;pointer-events:none}#r2W button i{position:absolute;left:0;right:0;bottom:9px;font-style:normal;pointer-events:none}#r2W button u{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;text-decoration:none}#r2W button.on{border-color:#ffd24a;transform:scale(.94)}
#r2Top{position:absolute;left:8px;right:8px;top:106px;z-index:5;display:flex;justify-content:space-between;gap:6px;pointer-events:none}#r2Top button{pointer-events:auto;border:0;border-radius:12px;padding:8px 11px;font:800 13px system-ui;background:rgba(20,22,28,.82);color:#fff;box-shadow:0 3px 10px rgba(0,0,0,.4)}#r2Top button.big{background:linear-gradient(#e8b830,#c8961a);color:#1c1c20}`;
    document.head.appendChild(s);
  }
  const ROOT = () => document.getElementById('ciack');
  const ICO = {};
  function icon(t, sz = 64) {
    const k = t + sz; if (ICO[k]) return ICO[k];
    const Bc = 220, tmp = document.createElement('canvas'); tmp.width = tmp.height = Bc; const g = tmp.getContext('2d');
    const b = { a: PZ[t].dir ? -0.4 : -0.75, bl: [{ gx: GC, gy: GC, t, d: 0, hp: 1, mx: 1, lu: 0, lv: 0, fl: -9 }], team: 0, R: 0.4, wa: 0, act: {} };
    try { drawBody(g, Bc / 2, Bc * 0.62, Bc * 0.7, b, { T: 0, noPilot: 1 }); } catch (e) { void e; }
    const D = g.getImageData(0, 0, Bc, Bc).data; let x0 = Bc, y0 = Bc, x1 = 0, y1 = 0;
    for (let y = 0; y < Bc; y++) for (let x = 0; x < Bc; x++) if (D[(y * Bc + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cv = document.createElement('canvas'); cv.width = cv.height = sz * 2; const c2 = cv.getContext('2d');
    if (x1 > x0) { const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(sz * 2 * 0.88 / w, sz * 2 * 0.88 / h); c2.drawImage(tmp, x0, y0, w, h, (sz * 2 - w * sc) / 2, (sz * 2 - h * sc) / 2, w * sc, h * sc); }
    return (ICO[k] = cv.toDataURL());
  }
  function shopUI(G, on) {
    css(); let el = document.getElementById('r2Shop'); if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div'); el.id = 'r2Shop';
    el.innerHTML = '<div class="wrap"><canvas class="pv" width="880" height="320"></canvas><div class="st"></div><canvas class="gr" width="700" height="700"></canvas><div class="msg"></div>'
      + '<div class="pal">' + PAL.map(t => `<button type="button" data-t="${t}"><img src="${icon(t, 46)}" alt="">${PZ[t].n}<small>peso ${PZ[t].w}</small></button>`).join('') + '</div>'
      + '<div class="act"><button type="button" data-k="x">🗑️ Togli</button><button type="button" data-k="c">🧹 Svuota</button><button type="button" class="go" data-k="go">▶️ PROVALO!</button></div></div>';
    ROOT().appendChild(el);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelectorAll('.pal button').forEach(b => b.onclick = () => { U.tool = b.dataset.t; SFX.rot(); U.say = PZ[U.tool].d; shopRender(); });
    el.querySelector('[data-k=x]').onclick = () => { U.tool = U.tool === 'x' ? 'telaio' : 'x'; SFX.rot(); U.say = U.tool === 'x' ? '🗑️ Tocca i pezzi da <b>togliere</b>.' : ''; shopRender(); };
    el.querySelector('[data-k=c]').onclick = () => { if (U.clr && now() - U.clr < 2.5) { U.clr = 0; saveD(D0()); SFX.del(); U.say = 'Tutto smontato: resta solo la <b>cabina</b>.'; } else { U.clr = now(); U.say = 'Tocca di nuovo <b>🧹 Svuota</b> per smontare tutto.'; } shopRender(); };
    el.querySelector('[data-k=go]').onclick = () => { const st = statsOf(myD()); if (!st.nW) { SFX.no(); U.say = '⚠️ Senza <b>ruote o cingoli</b> attaccati il robot non si muove! Mettine almeno due.'; shopRender(); return; } goDrive(G); };
    // la griglia: tocca per montare, trascina per montarne tanti; tocca di nuovo un pezzo che gira per girarlo
    const cv = el.querySelector('canvas.gr'); let drag = null;
    const cell = e => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * GN), y = Math.floor((e.clientY - r.top) / r.height * GN); return x >= 0 && x < GN && y >= 0 && y < GN ? [x, y] : null; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); const c = cell(e); if (!c) return; try { cv.setPointerCapture(e.pointerId); } catch {} drag = { last: key(...c), mode: put(c[0], c[1], true) }; });
    cv.addEventListener('pointermove', e => { if (!drag) return; const c = cell(e); if (!c || key(...c) === drag.last) return; drag.last = key(...c); if (drag.mode === 'put' || drag.mode === 'del') put(c[0], c[1], false); });
    const up = () => { drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    shopRender();
  }
  // monta / gira / togli un pezzo nella cella
  function put(x, y, first) {
    const d = myD(), i = d.b.findIndex(q => q[0] === x && q[1] === y), cur = i >= 0 ? d.b[i] : null, tool = U.tool;
    if (cur && cur[2] === 'cabina') { if (first) { SFX.no(); U.say = 'La <b>cabina</b> col pilota non si toglie: è il cuore del robot!'; shopRender(); } return 'none'; }
    if (tool === 'x') { if (!cur) return 'del'; d.b.splice(i, 1); saveD(d); SFX.del(); pop(x, y); U.say = ''; shopRender(); return 'del'; }
    if (cur && cur[2] === tool) { if (!first) return 'put'; if (PZ[tool].dir) { cur[3] = (cur[3] + 1) % 4; (U.lastDir || (U.lastDir = {}))[tool] = cur[3]; saveD(d); SFX.rot(); pop(x, y); U.say = PZ[tool].n + ' girato ' + ['in avanti ⬆️', 'a destra ➡️', 'indietro ⬇️', 'a sinistra ⬅️'][cur[3]] + '.'; shopRender(); } return 'rot'; }
    const nb = d.b.slice(); if (cur) nb.splice(i, 1); const w = wOf({ b: nb }) + PZ[tool].w;
    if (w > MAXW) { SFX.no(); U.say = '⚖️ <b>Troppo pesante!</b> (massimo ' + MAXW + '). Togli qualcosa o usa pezzi più leggeri.'; U.shk = now(); shopRender(); return 'none'; }
    const dir = PZ[tool].dir ? ((U.lastDir || {})[tool] || 0) : 0;
    if (cur) d.b[i] = [x, y, tool, dir]; else d.b.push([x, y, tool, dir]); saveD(d); SFX.clank(Math.random()); pop(x, y);
    const L = linked(d.b), j = d.b.findIndex(q => q[0] === x && q[1] === y);
    U.say = !L.has(j) ? '⚠️ Questo pezzo <b>non è attaccato</b> alla cabina: cadrà via! Collegalo con dei blocchi di telaio.' : PZ[tool].d;
    shopRender(); return 'put';
  }
  const pop = (x, y) => { U.pops[key(x, y)] = now(); };
  function shopRender() {
    const el = document.getElementById('r2Shop'); if (!el) return; const d = myD(), st = statsOf(d);
    el.querySelectorAll('.pal button').forEach(b => b.classList.toggle('on', b.dataset.t === U.tool)); el.querySelector('[data-k=x]').classList.toggle('on', U.tool === 'x');
    const bar = (v, mx, col) => `<i style="width:${Math.round(Math.max(3, Math.min(1, v / mx) * 30))}px;background:${col}"></i>`;
    el.querySelector('.st').innerHTML = `<span>⚖️ ${st.M}/${MAXW}</span><span>💨 velocità${bar(st.v, 3.2, '#3ad870')}</span><span>💪 spinta${bar(st.push, 36, '#ffb050')}</span><span>🔄 agilità${bar(st.agi, 1, '#7ac8ff')}</span>`;
    const m = U.say || (d.b.length === 1 ? '🔧 Questa è la tua <b>cabina</b>, col pilota. Scegli un pezzo qui sotto e tocca la griglia per attaccarlo. Senza <b>ruote</b> non si muove!' : !st.nW ? 'Ora attacca le <b>ruote</b> (o i cingoli): dove le metti cambia come guida!' : st.loose ? '⚠️ ' + st.loose + ' pezzi non sono attaccati alla cabina: cadranno via.' : 'Quando vuoi, <b>▶️ PROVALO!</b> sul banco di prova.');
    const ms = el.querySelector('.msg'); if (ms.innerHTML !== m) ms.innerHTML = m;
    gridDraw(el.querySelector('canvas.gr'), d);
  }
  // la griglia vista dall'alto (avanti = in alto)
  function gridDraw(cv, d) {
    const g = cv.getContext('2d'), w = cv.width, cs = w / GN, T = now(), L = linked(d.b);
    g.clearRect(0, 0, w, w); g.fillStyle = '#26282f'; g.fillRect(0, 0, w, w);
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) { g.fillStyle = (x + y) % 2 ? '#2c2f37' : '#30333c'; g.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4); g.fillStyle = 'rgba(0,0,0,.35)'; for (const [u, v] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) { g.beginPath(); g.arc(x * cs + u * cs, y * cs + v * cs, 3, 0, 7); g.fill(); } }
    g.fillStyle = 'rgba(232,184,48,.9)'; g.font = '800 22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('▲ AVANTI', w / 2, 4);
    d.b.forEach((q, i) => { const [x, y, t, r] = q, p = T - (U.pops[key(x, y)] || 0), sc = p < 0.25 ? 1 + 0.25 * Math.sin(p / 0.25 * Math.PI) : 1, cx = x * cs + cs / 2, cy = y * cs + cs / 2;
      g.save(); g.translate(cx, cy); g.scale(sc, sc); g.rotate(r * Math.PI / 2); topPiece(g, t, cs * 0.92); g.restore();
      if (!L.has(i)) { g.fillStyle = 'rgba(255,60,40,.38)'; g.fillRect(x * cs + 3, y * cs + 3, cs - 6, cs - 6); g.font = '24px system-ui'; g.textBaseline = 'middle'; g.fillText('⚠️', cx, cy); } });
  }
  // un pezzo visto dall'alto (centrato, avanti = in alto)
  function topPiece(g, t, s) {
    const h = s / 2, rr = (x, y, w, hh, r, col) => { g.fillStyle = col; cqRR(g, x, y, w, hh, r); g.fill(); };
    if (t === 'cabina') { rr(-h, -h, s, s, 10, TEAM[0]); rr(-h + 7, -h + 7, s - 14, s - 14, 8, '#2a2c34'); g.fillStyle = '#f2c8a0'; g.beginPath(); g.arc(0, 4, s * 0.2, 0, 7); g.fill(); g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(0, 1, s * 0.2, Math.PI, 0); g.fill(); g.fillStyle = '#1a1c22'; g.fillRect(-s * 0.18, -h + 10, s * 0.36, 6); return; }
    if (t === 'telaio') { rr(-h, -h, s, s, 7, TEAM[0]); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(-h + 8, -h + 8, s - 16, s - 16); return; }
    if (t === 'corazza') { rr(-h, -h, s, s, 6, '#7c848e'); rr(-h + 5, -h + 5, s - 10, s - 10, 4, '#8c949e'); g.fillStyle = '#545a62'; for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(u * h * 0.6, v * h * 0.6, 5, 0, 7); g.fill(); } return; }
    if (t === 'ruota') { rr(-h * 0.55, -h * 0.95, s * 0.55, s * 0.95, 8, '#1e1f24'); g.fillStyle = '#4a4c54'; for (let i = 0; i < 5; i++) g.fillRect(-h * 0.55, -h * 0.85 + i * s * 0.18, s * 0.55, 4); g.fillStyle = '#b8bcc4'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); return; }
    if (t === 'cingolo') { rr(-h * 0.7, -h, s * 0.7, s, 8, '#2a2a30'); g.fillStyle = '#55565e'; for (let i = 0; i < 6; i++) g.fillRect(-h * 0.7, -h + 4 + i * s * 0.16, s * 0.7, 5); return; }
    if (t === 'cuneo') { g.fillStyle = '#8a929c'; g.fillRect(-h, -h * 0.2, s, h * 1.2); g.fillStyle = '#c0c8d0'; g.beginPath(); g.moveTo(-h, -h * 0.2); g.lineTo(h, -h * 0.2); g.lineTo(h * 0.8, -h); g.lineTo(-h * 0.8, -h); g.closePath(); g.fill(); g.fillStyle = '#e8b830'; g.fillRect(-h * 0.8, -h, s * 0.8, 5); return; }
    if (t === 'sega') { rr(-h * 0.35, 0, s * 0.35, h, 4, '#5a5e68'); g.fillStyle = '#d0d8e0'; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * 6.2832, r = i % 2 ? h * 0.62 : h * 0.75; g.lineTo(Math.cos(a) * r, -h * 0.25 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#5a5e68'; g.beginPath(); g.arc(0, -h * 0.25, 6, 0, 7); g.fill(); return; }
    if (t === 'martello') { rr(-h * 0.4, h * 0.1, s * 0.4, h * 0.9, 4, '#4a505a'); g.fillStyle = '#2a2a30'; g.fillRect(-5, -h * 0.6, 10, h * 0.9); rr(-h * 0.7, -h, s * 0.7, h * 0.5, 4, '#6a707a'); return; }
    if (t === 'cannone') { rr(-h * 0.6, -h * 0.1, s * 0.6, h * 1.1, 6, '#4a505a'); rr(-h * 0.2, -h, s * 0.2, h * 1.3, 4, '#2e323a'); g.fillStyle = '#1a1c22'; g.fillRect(-h * 0.26, -h, s * 0.26, 7); return; }
    if (t === 'fiamma') { rr(-h * 0.6, -h * 0.1, s * 0.6, h * 1.1, 8, '#c8382e'); g.fillStyle = '#3a3e48'; g.fillRect(-5, -h, 10, h * 0.95); g.fillStyle = '#3a8aff'; g.beginPath(); g.arc(0, -h + 4, 5, 0, 7); g.fill(); }
  }
  // l'anteprima che gira, nel pannello (si aggiorna da sola)
  function previewTick(G) {
    const el = document.getElementById('r2Shop'); if (!el) return; const cv = el.querySelector('canvas.pv'); if (!cv) return;
    if (now() - (U.pvT || 0) < 1 / 30) return; U.pvT = now();
    const d = myD(), sig = JSON.stringify(d.b); if (U.pvSig !== sig) { U.pvSig = sig; const pb = { a: 0, x: 0, y: 0, team: 0, wa: 0, act: {}, cu: 0, cv: 0, bl: d.b.map(([gx, gy, t, r]) => ({ gx, gy, t, d: r, hp: 1, mx: 1, fl: -9 })) }; mass(pb, true); U.pvB = pb; }
    { const cw = Math.round((cv.clientWidth || 400) * 2), ch = Math.round((cv.clientHeight || 160) * 2); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } }
    const g = cv.getContext('2d'), w = cv.width, h = cv.height; g.clearRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.7, w * 0.5); gr.addColorStop(0, 'rgba(255,214,140,.22)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2c34'; g.beginPath(); g.ellipse(w / 2, h * 0.76, w * 0.3, h * 0.13, 0, 0, 7); g.fill(); g.strokeStyle = '#e8b830'; g.lineWidth = 3; g.setLineDash([12, 10]); g.stroke(); g.setLineDash([]);
    const b = U.pvB; b.a = angN(now() * 0.5); b.wa = now() * 3;
    const TW = Math.min(170, h * 0.9 / Math.max(1.2, b.R * 1.15));
    drawBody(g, w / 2, h * 0.74, TW, b, { look: cqLookOf(G.me), T: 0 });
    if (U.shk && now() - U.shk < 0.3) cv.style.transform = 'translateX(' + Math.sin((now() - U.shk) * 60) * 5 + 'px)'; else if (cv.style.transform) cv.style.transform = '';
  }

  // ======================= IL BANCO DI PROVA (guidare) =======================
  function goDrive(G) {
    const d = myD(); G.rbs = G.rbs.filter(b => b !== G.mine);
    const b = makeBody(d, SPAWN[0][0], SPAWN[0][1], SPAWN[0][2], 0); b.uid = 'me'; G.mine = b; G.rbs.unshift(b);
    if (!G.dummy || G.dummy.ko) spawnDummy(G);
    U.mode = 'drive'; shopUI(G, false); driveUI(G, true); SFX.go(); cq.x = b.x; cq.y = b.y;
    U.msg = { t: G.time, s: '🏁 Si va! Trascina il dito per guidare' };
    try { if (!localStorage.getItem('robotHelp2')) { localStorage.setItem('robotHelp2', '1'); setTimeout(() => cqToast('🎯 Butta il <b>manichino</b> nella <b>fossa</b> o fallo a pezzi! Se perdi una ruota il robot cambia: prova a capire perché.'), 1800); } } catch {}
  }
  function goShop(G) { U.mode = 'shop'; driveUI(G, false); shopUI(G, true); hum(0, false, false); }
  function spawnDummy(G) {
    if (G.dummy) G.rbs = G.rbs.filter(b => b !== G.dummy);
    const b = makeBody(DUMMY, SPAWN[1][0], SPAWN[1][1], SPAWN[1][2], 1); b.uid = 'dm' + (G.dmN = (G.dmN || 0) + 1); b.dummy = 1; G.dummy = b; G.rbs.push(b);
  }
  function driveUI(G, on) {
    css(); for (const id of ['r2W', 'r2Top']) { const e = document.getElementById(id); if (e) e.remove(); } if (!on) return;
    const top = document.createElement('div'); top.id = 'r2Top'; top.innerHTML = '<button type="button" class="big" data-k="shop">🔧 Officina</button><span style="display:flex;gap:6px"><button type="button" data-k="fix">🛠️ Ripara</button><button type="button" data-k="dum">🎯 Manichino</button></span>';
    ROOT().appendChild(top); top.addEventListener('pointerdown', e => e.stopPropagation());
    top.querySelector('[data-k=shop]').onclick = () => goShop(G); top.querySelector('[data-k=fix]').onclick = () => goDrive(G); top.querySelector('[data-k=dum]').onclick = () => { spawnDummy(G); SFX.clank(0.5); };
    const ws = statsOf(myD()).wpn; if (!ws.length) return;
    const w = document.createElement('div'); w.id = 'r2W'; w.innerHTML = ws.map(t => `<button type="button" data-t="${t}"><u></u><b>${WICO[t]}</b><i>${PZ[t].n.toUpperCase()}</i></button>`).join(''); ROOT().appendChild(w);
    w.querySelectorAll('button').forEach(bt => { const t = bt.dataset.t, hold = PZ[t].wpn === 'hold';
      bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bt.setPointerCapture(e.pointerId); } catch {} if (hold) U.hold[t] = 1; else U.tap = Object.assign(U.tap || {}, { [t]: 1 }); bt.classList.add('on'); });
      const up = () => { U.hold[t] = 0; bt.classList.remove('on'); }; bt.addEventListener('pointerup', up); bt.addEventListener('pointercancel', up); bt.oncontextmenu = e => e.preventDefault(); });
  }
  // il joystick -> gas e sterzo (spingendo all'indietro: retromarcia)
  function myInput(G) {
    const b = G.mine; if (!b) return; const d = cqDir(), inp = b.inp;
    if (b.ko || !d) { inp.thr = 0; inp.steer = 0; }
    else { const ta = Math.atan2(d.wy, d.wx); if (b.rev) { if (Math.abs(angD(ta + Math.PI, b.a)) > 2.0) b.rev = false; } else if (Math.abs(angD(ta, b.a)) > 2.0) b.rev = true;
      const want = b.rev ? ta + Math.PI : ta, df = angD(want, b.a); inp.steer = clamp(df * 2.2, -1, 1); inp.thr = (b.rev ? -0.8 : 1) * Math.max(0, Math.cos(df)) * (Math.abs(df) > 1.2 ? 0.3 : 1); }
    inp.sega = !!U.hold.sega; inp.fiamma = !!U.hold.fiamma; if (U.tap) { if (U.tap.martello) inp.martello = true; if (U.tap.cannone) inp.cannone = true; U.tap = null; }
    if (cq.keys[' ']) { inp.sega = inp.fiamma = true; inp.martello = inp.cannone = true; }   // tastiera: spazio = tutte le armi
  }
  function uiTickDrive(G) {
    const w = document.getElementById('r2W'), b = G.mine; if (!w || !b) return; const T = G.time;
    w.querySelectorAll('button').forEach(bt => { const t = bt.dataset.t, u = bt.querySelector('u'); let k = 1, col = '#3ad870';
      if (t === 'sega') { k = 1 - b.heat / 3; col = b.hot ? '#ff4a3a' : '#ffb050'; } else if (t === 'fiamma') { k = b.fuel / 3; col = '#ff8a3a'; }
      else { const cds = Object.entries(b.cd).filter(([kk]) => kk[0] === (t === 'martello' ? 'm' : 'c')).map(([, v]) => v), left = cds.length ? Math.max(0, Math.min(...cds) - T) : 0; k = 1 - left / PZ[t].cd; col = left > 0 ? '#8a8a90' : '#3ad870'; }
      const s = Math.round(k * 24) + col; if (bt.dataset.k === s) return; bt.dataset.k = s; u.style.background = `conic-gradient(${col} ${k * 360}deg, rgba(0,0,0,0) ${k * 360}deg)`; u.style.webkitMask = u.style.mask = 'radial-gradient(circle, transparent 58%, #000 60%)'; });
  }
  // effetti: scintille, botte, pezzi che si rompono (particelle sul mio telefono)
  function fxEvents(G) {
    const T = now();
    for (const e of G.evs) { if (e.seen) continue; e.seen = 1; const [k, x, y, a, b] = e;
      if (k === 'bang') { SFX.bang(a); for (let i = 0; i < 4 + a * 10; i++) U.parts.push({ x, y, z: 0.25, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 1 + Math.random() * 3, t: T, life: 0.4 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#ffe8a0' : '#ffb040', sp: 1 }); U.shake = Math.max(U.shake, a * 0.9); }
      else if (k === 'brk') { SFX.brk(); for (let i = 0; i < 14; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, vz: 2 + Math.random() * 3, t: T, life: 0.7, c: i % 3 ? '#9aa0aa' : '#ffd24a', sz: 3 }); U.shake = Math.max(U.shake, 0.7); U.fx.push({ k: 'txt', x, y, t: T, s: 'CRACK! ' + (PZ[a] ? PZ[a].n : ''), c: b === 0 ? '#ff9a8a' : '#ffe8a0' }); }
      else if (k === 'h') { if (a >= 3) U.fx.push({ k: 'num', x, y, t: T, s: '-' + a, c: '#ffe8a0' }); }
      else if (k === 'lift') { SFX.lift(); U.fx.push({ k: 'txt', x, y, t: T, s: '⬆️ CI SALE SOPRA!', c: '#b8e86a' }); }
      else if (k === 'saw') { for (let i = 0; i < 3; i++) U.parts.push({ x, y, z: 0.25, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: 1 + Math.random() * 2, t: T, life: 0.25, c: '#fff4c0', sp: 1 }); }
      else if (k === 'ham') { SFX.ham(a); U.shake = Math.max(U.shake, a ? 1 : 0.35); for (let i = 0; i < 10; i++) U.parts.push({ x, y, z: 0.05, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 0.5 + Math.random(), t: T, life: 0.6, c: 'rgba(150,140,130,.8)', sz: 5 }); if (a) U.fx.push({ k: 'txt', x, y, t: T, s: '💥 BAM!', c: '#ffd24a' }); }
      else if (k === 'shot') { SFX.shot(); U.shake = Math.max(U.shake, 0.6); U.fx.push({ k: 'smoke', x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 0.5, t: T }); }
      else if (k === 'pop') { SFX.pop(a); for (let i = 0; i < 8; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 1 + Math.random() * 2, t: T, life: 0.45, c: i % 2 ? '#ffb040' : '#ffe8a0', sp: 1 }); }
      else if (k === 'ember') U.parts.push({ x, y, z: 0.4, vx: 0, vy: 0, vz: 1.2, t: T, life: 0.6, c: '#ff8a3a', sz: 2 });
      else if (k === 'fall') { SFX.fall(); U.slowT = T; U.fx.push({ k: 'big', t: T, s: b === 0 ? '😱 SEI CADUTO NELLA FOSSA!' : '🕳️ GIÙ NELLA FOSSA!', c: b === 0 ? '#ff9a8a' : '#ffd24a' }); if (b === 1) { G.score = (G.score || 0) + 1; SFX.win(); } }
      else if (k === 'ko') { SFX.ko(); U.slowT = T; U.shake = 1.4; for (let i = 0; i < 26; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, vz: 2 + Math.random() * 4, t: T, life: 0.9, c: i % 2 ? '#ffb040' : '#ffe8a0', sp: 1 }); U.fx.push({ k: 'smoke', x, y, t: T }); U.fx.push({ k: 'big', t: T, s: b === 0 ? '💥 LA TUA CABINA È SALTATA!' : '💥 MANICHINO A PEZZI!', c: b === 0 ? '#ff9a8a' : '#ffd24a' }); if (b === 1) { G.score = (G.score || 0) + 1; SFX.win(); } }
    }
    U.parts = U.parts.filter(p => T - p.t < p.life); if (U.parts.length > 160) U.parts.splice(0, U.parts.length - 160);
    U.fx = U.fx.filter(f => T - f.t < 2.4);
  }

  // ======================= IL GIOCO =======================
  CQ_MODES.robot = {
    n: 'Officina dei robot',
    desc: '🤖 Prototipo: costruisci il tuo robot pezzo per pezzo, col tuo personaggio alla guida, e provalo sul banco di prova.',
    maps: [['robot2', 'Banco di prova']],
    ns: [[1, 'Solo io']],
    def: { map: 'robot2', n: 1, fill: false },
    opts: () => '<div style="background:rgba(232,184,48,.12);border:1px solid rgba(232,184,48,.5);border-radius:12px;padding:8px 10px;margin:6px 0"><b>🔧 Prototipo dell\'officina</b><br><small>Costruisci il robot attaccando i pezzi dove vuoi, poi guidalo sul banco di prova: spingi il manichino nella fossa o fallo a pezzi. (Per ora da soli: i combattimenti arrivano dopo.)</small></div>',
    read: () => ({}),
    start(G) { Object.assign(U, U0()); G.rbs = []; G.proj = []; G.hams = []; G.evs = []; G.cT = {}; G.mine = null; G.dummy = null; G.score = 0; spawnDummy(G); cq.bg = null; },
    gstart(G) { Object.assign(U, U0()); G.rbs = []; G.proj = []; G.hams = []; G.evs = []; G.cT = {}; },
    hide: c => { const G = cq.g; return !!G && c !== G.me; },
    intro: () => '🔧 Si accendono le luci dell\'officina…',
    voice: () => 1,
    speed: () => 0,
    night: () => ({ a: 0.15, r: 6, lights: [[7.5, AY0 + 0.4, 5, 0.9], [12.5, AY0 + 0.4, 5, 0.9], [17.5, AY0 + 0.4, 5, 0.9], [AX0 + 0.4, 6.5, 4.5, 0.8], [AX0 + 0.4, 10.5, 4.5, 0.8], [AX0 + 0.4, 14.5, 4.5, 0.8]], see: () => true }),
    hud: G => U.mode === 'drive' ? '🤖 Banco di prova · 🎯 manichini abbattuti: ' + (G.score || 0) : '🔧 Officina dei robot · prototipo',
    big(G) { const m = U.msg; if (m && G.time - m.t < 2.2) return m.s; return ''; },
    view(G) {
      const V = G.vw || (G.vw = { z: 0.8, x: 0, y: 0 }); let tx = 0, ty = 0, tz = 0.8; const k = 0.1;
      if (U.mode !== 'drive') { tx = 4; ty = 4; tz = 0.9; }
      else { const D = G.dummy && !G.dummy.fall ? G.dummy : null, b = G.mine; if (b && D) { const dx = D.x - b.x, dy = D.y - b.y, d = Math.hypot(dx, dy); tx = dx * 0.42; ty = dy * 0.42; tz = clamp(1.02 - d * 0.04, 0.6, 0.98); } }
      const sh = U.shake; V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k;
      return { z: V.z, x: V.x + (Math.random() - 0.5) * sh * 0.25, y: V.y + (Math.random() - 0.5) * sh * 0.25 };
    },
    tick(G, dt) {
      if (U.mode !== 'drive') return;
      const h = dt * (now() - U.slowT < 1.1 ? 0.3 : 1);
      for (const b of G.rbs) if (!b.debris) weapons(G, b, h);
      hammers(G); projectiles(G, h); burning(G, h); physics(G, h);
      for (const b of G.rbs) b.wa = (b.wa || 0) + (Math.cos(b.a) * b.vx + Math.sin(b.a) * b.vy) * h * 4;
      // il manichino rotto o caduto: dopo un po' ne arriva un altro; io caduto o saltato: si riparte riparato
      const D = G.dummy; if (D && D.ko && G.time - D.koT > 2.6) { spawnDummy(G); U.msg = { t: G.time, s: '🎯 Ecco un altro manichino!' }; }
      const M = G.mine; if (M && M.ko && G.time - M.koT > 2.4) goDrive(G);
      if (M && !M.ko) { cq.x = M.x; cq.y = M.y; }
    },
    local(G, dt) {
      if (U.mode === '') { U.mode = 'shop'; shopUI(G, true); }
      if (U.mode === 'shop') { previewTick(G); const T = now(); if (Object.values(U.pops).some(p => T - p < 0.3)) shopRender(); return; }
      myInput(G); fxEvents(G); uiTickDrive(G);
      U.shake = Math.max(0, U.shake - dt * 3);
      const b = G.mine; if (b) hum(Math.hypot(b.vx, b.vy), b.act && b.act.sega, !b.ko);
    },
    draw(c) {
      const G = cq.g; if (!G || c !== G.me) return null;
      if (!c.__r2) { c.__r2 = (g, X, Y, TW) => { const G2 = cq.g; if (!G2) return; const b = U.mode === 'drive' ? G2.mine : null; if (!b) return; drawBody(g, X, Y, TW, b, { look: cqLookOf(G2.me), T: G2.time, jit: U.shake }); }; c.__r2.box = [3.8, 4.0, 2.6]; c.__r2.top = 1.6; c.__r2.anon = 1; }
      return c.__r2;
    },
    extras(G) {
      const L = []; if (U.mode !== 'drive') return L; G.__xd = G.__xd || {};
      for (const b of G.rbs) { if (b === G.mine || !b.bl.length) continue; const id = b.uid || (b.uid = 'b' + (G.uidN = (G.uidN || 0) + 1));
        let d = G.__xd[id]; if (!d) { d = G.__xd[id] = (g, X, Y, TW) => drawBody(g, X, Y, TW, d.b, { look: d.b.dummy ? DUMMY_LOOK : null, T: cq.g.time }); d.box = b.debris ? [1.2, 2.2, 0.9] : [3.8, 4.0, 2.6]; d.top = 1.6; }
        d.b = b; L.push({ x: b.x, y: b.y, L: null, w: 0, f: 1, name: null, all: true, dr: d }); }
      return L;
    },
    over(g, G, sx, sy, TW) {
      if (U.mode !== 'drive') return; const T = now(), Uz = TW * 0.575, P3 = (x, y, z) => [sx(x, y), sy(x, y) - z * Uz];
      // getti di fuoco
      for (const b of G.rbs) if (b.act && b.act.fiamma) for (const q of b.bl) if (q.t === 'fiamma') { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
        for (let i = 0; i < 14; i++) { const ph = (T * 3 + i / 14) % 1, d = (0.3 + ph * 1.4) * BS, an = fa + Math.sin(i * 7.3 + T * 5) * 0.4, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d, [X, Y] = P3(px, py, 0.25 + ph * 0.3); g.fillStyle = ph < 0.3 ? '#fff0a0' : ph < 0.6 ? '#ffa030' : 'rgba(220,60,20,.75)'; g.beginPath(); g.arc(X, Y, TW * (0.07 + ph * 0.22) * BS, 0, 7); g.fill(); } }
      // palle del cannone
      for (const p of G.proj) { const [X, Y] = P3(p.x, p.y, 0.25); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx(p.x, p.y), sy(p.x, p.y), TW * 0.1, TW * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#1a1c22'; g.beginPath(); g.arc(X, Y, Math.max(3, TW * 0.09), 0, 7); g.fill(); g.fillStyle = 'rgba(255,210,74,.6)'; for (let k = 1; k < 4; k++) { const [Xs, Ys] = P3(p.x - p.dx * k * 0.2, p.y - p.dy * k * 0.2, 0.25); g.beginPath(); g.arc(Xs, Ys, TW * 0.05 * (1 - k * 0.2), 0, 7); g.fill(); } }
      // particelle
      for (const p of U.parts) { const a = T - p.t, x = p.x + p.vx * a, y = p.y + p.vy * a, z = Math.max(0, p.z + p.vz * a - 5 * a * a), [X, Y] = P3(x, y, z); g.globalAlpha = Math.max(0, 1 - a / p.life);
        if (p.sp) { const [X2, Y2] = P3(x - p.vx * 0.03, y - p.vy * 0.03, Math.max(0, z - (p.vz - 10 * a) * 0.03)); g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); g.lineTo(X2, Y2); g.stroke(); } else { g.fillStyle = p.c; g.beginPath(); g.arc(X, Y, p.sz || 2.5, 0, 7); g.fill(); } }
      g.globalAlpha = 1;
      for (const f of U.fx) { const a = T - f.t;
        if (f.k === 'smoke' && a < 1) { for (let i = 0; i < 5; i++) { const an = i * 1.26, d = a * 0.8; g.fillStyle = 'rgba(90,90,96,' + (0.5 * (1 - a)) + ')'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * d * 0.4, f.y + Math.sin(an) * d * 0.4), sy(f.x, f.y) - (0.3 + a * 0.8) * Uz, TW * (0.08 + a * 0.15), 0, 7); g.fill(); } }
        else if ((f.k === 'num' || f.k === 'txt') && a < 1.4) { g.save(); g.globalAlpha = Math.min(1, (1.4 - a) * 3); g.font = '900 ' + Math.round(Math.max(13, TW * (f.k === 'num' ? 0.3 : 0.26))) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,14,.85)'; const [X, Y] = P3(f.x, f.y, 1.4 + a * 0.7); g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
        else if (f.k === 'big' && a < 2.4) { g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const k = Math.min(1, a / 0.18), sc = 1 + 0.35 * (1 - k); g.globalAlpha = Math.min(1, (2.4 - a) * 2); g.translate(cq.w / 2, cq.h * 0.34); g.scale(sc, sc); g.font = '900 25px system-ui'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#140c10'; g.strokeText(f.s, 0, 0, cq.w * 0.92); g.fillStyle = f.c; g.fillText(f.s, 0, 0, cq.w * 0.92); g.restore(); } }
      if (now() - U.slowT < 1.1) { const k = Math.min(1, (now() - U.slowT) * 4) * Math.min(1, (1.1 - (now() - U.slowT)) * 3), W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7); gr.addColorStop(0, 'rgba(10,10,20,0)'); gr.addColorStop(1, 'rgba(10,10,20,' + 0.55 * k + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
    }
  };
  cqEachFrame(() => { const G = cq.g; if (!G || G.mode !== 'robot' || G.phase !== 'play') { if (document.getElementById('r2Shop') || document.getElementById('r2W') || document.getElementById('r2Top')) { shopUI(G || {}, false); driveUI(G || {}, false); } if (HUM.o) hum(0, false, false); if (U.mode && (!G || G.mode !== 'robot')) U.mode = ''; } });
  window.__robot = { U, PZ, GC, GN, B, PIT, SPAWN, DUMMY, makeBody, mass, linked, statsOf, physics, collide, weapons, hammers, projectiles, breakBlock, hurt, wpos, myD, saveD, cleanD, put, goDrive, goShop, spawnDummy, drawBody, icon, topPiece, myInput };
})();
