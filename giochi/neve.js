// Battaglia di palle di neve (gioco 1 contro 1, vedi CLAUDE.md "BATTAGLIA DI PALLE DI NEVE").
// Il giardino dell'hotel innevato, la sera. Ognuno DISEGNA COL DITO il suo fortino (in segreto, sotto la nevicata) con una sola neve per tutto:
// ogni blocco del muro e' una palla in meno (la neve avanzata diventa il mucchio delle scorte). Poi battaglia: TIRO DRITTO (veloce, il muro lo
// ferma) e PALLONETTO (lento, passa sopra i muri, la sua ombra ti avvisa). 3 colpi = sepolto (diventi un pupazzo di neve). Al meglio di 3 manche:
// il fortino resta (i pezzi crollati restano a terra, le crepe si richiudono) e tra una manche e l'altra si ripara con un po' di neve nuova.
// TENUTA: ogni ANGOLO del muro, ogni ASSE di legno e ogni ATTACCO a un altro muro e' un PILASTRO; il pezzo fra due pilastri e' una CAMPATA:
// i colpi la crepano e quando cede cade TUTTA insieme (effetto domino). Muro DOPPIO (ripassato) = il doppio dei colpi.
(() => {
  const W = 30, H = 18, MID = 15;
  const ZONE = [{ x0: 1.3, x1: 10.5, y0: 3.5, y1: 14.5 }, { x0: 19.5, x1: 28.7, y0: 3.5, y1: 14.5 }];
  const START = [[3.2, 9], [26.8, 9]], STOCK0 = [[2.4, 6.4], [27.6, 6.4]];
  const PILES = [[12.4, 5.3], [17.6, 5.3], [12.4, 12.7], [17.6, 12.7], [15, 2.4], [15, 15.6]];
  const FOUNT = [15, 9];
  const B_T0 = 44, B_T1 = 25, REVEAL = 2.8, FIGHT = 120, DOWN = 2.8, MRES = 6.5, WINS = 2, MAXR = 4;
  const NV0 = 72, NV1 = 20, ASSI = 3, HAND = 3, HITS = 3, STOCK_MAX = 10;
  const SP = 0.5, HLEN = 0.3, TH1 = 0.16, TH2 = 0.28, WH1 = 0.82, WH2 = 0.94;
  const R1 = 0.31, R2 = 0.42, RP = 0.34;   // sagome per camminare (capsule intorno ai blocchi; il personaggio e' un quadrato di 0,3)
  const TURN = 0.7;   // 40 gradi di curva = un pilastro
  const SAL = { w1: 3, w2: 6, p1: 3, p2: 5, as: 2 };
  const RMIN = 1.2, RMAX_D = 12, RMAX_L = 14, V_D = 11, V_L = 7, PULL = 110, CD = 0.5, LEAN = 1.0, SPORTO = 0.8;
  const MK = { s: 0.6, p: 0.8, w: 1.1 }, PILE_N = 5, PILE_MAX = 6, PILE_RG = 10;
  const SIDE = [{ c: '#d8402e', c2: '#f4a07a', d: '#8a2414', n: 'rosso' }, { c: '#2e6ad8', c2: '#9ac0f4', d: '#14348a', n: 'blu' }];
  // PASSO 2: igloo e gnomi (costano palle in mano; massimo 3 in campo; un colpo e sono fuori)
  const IG_COST = 8, IG_HP = 4, IG_R = 0.62;
  const GN = { p: { cost: 2, ico: '⛏️', n: 'Picconatore', sp: 0.6 }, c: { cost: 3, ico: '🎯', n: 'Cecchino', sp: 0.7 }, r: { cost: 2, ico: '☃️', n: 'Rotolone', sp: 0.55 } };
  const GN_MAX = 3, GN_LIFE = 45, DIG_T = 1.4, ROLL_V = 2.7, SNIPE_T = 1.8, SNIPE_R = 5.5, GLANCE = 0.7, HIDE_V = 1.6;
  // PASSO 3: lo SLITTINO-ARIETE compare al centro a SLED_AT s; chi ci sale per primo va piu' veloce per SLED_T s, sfonda i muri presi di petto
  // (di striscio scivola), ha un cannone con SLED_AM palle grosse (2 di danno ai muri) e travolge chi incontra. Un colpo e cadi dallo slittino.
  // QUARTO GIRO (adrenalina, scelte dell'utente): niente slittino (SLED_ON spento, il codice resta), TORMENTA FINALE negli ultimi STORM s
  // (palle piu' veloci, mucchi pieni, ogni colpo vale doppio), RAFFICA (3 colpi di fila entro RAF_T s = palla di ghiaccio), fischio, cuore, rallentatore
  const SLED_ON = false, STORM = 40, RAF_T = 8;
  const SLED_AT = 40, SLED_T = 15, SLED_AM = 6, SLED_POS = [15, 12.9], SLED_SP = 1.7, RAM_DMG = 3, SLED_CD = 0.8;
  const now = () => performance.now() / 1000;
  const r2 = v => Math.round(v * 100) / 100;
  const U = { ph: '', tool: 'w', str: null, evSeen: 0, fx: [], aim: null, wdAsk: 0, lastCs: '', vis: '', tPrev: null, tAt: 0, vel: {}, seen: {}, gsel: null, gp: {} };
  const U0 = () => ({ ph: '', tool: 'w', str: null, evSeen: 0, fx: [], aim: null, bur: null, pend: null, wdAsk: 0, tPrev: null, vel: {}, seen: {}, gsel: null, gp: {} });

  // ======================= IL GIARDINO =======================
  const LAMPS = [[11, 1], [19, 1], [11, 16], [19, 16], [1, 1], [28, 16]];
  function mapNeve() {
    const rooms = [{ n: 'Giardino', x: 1, y: 1, w: 28, h: 16, k: 'snow', vk: 'snow', c: ['#e8eef5', '#e4ebf3'], wc: '#d8e2ec', nl: 1 }];
    const props = [];
    for (const [x, y] of [[14, 8], [15, 8], [14, 9], [15, 9]]) props.push([x === 15 && y === 9 ? 'fount' : 'part', x, y, x === 15 && y === 9 ? undefined : { part: 1 }]);
    for (const [x, y] of LAMPS) props.push(['nlamp', x, y]);
    props.push(['nbench', 6, 1], ['nbench', 23, 1], ['nbench', 6, 16], ['nbench', 23, 16], ['nsnowman', 28, 1], ['nsled', 1, 16]);
    const trees = [];
    return { w: W, h: H, rooms, doors: [], decals: [], props, trees, snowy: 1, tasks: [], hall: 0, cams: [], vending: [], ring: [[3, 9], [26, 9]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Giardino: 'nel giardino' }, help: '', btnTxt: '', sabTxt: '',
      pxProp: drawProp, pxFloor: floorSnow, drawWall, bg: () => '#17223a', sky: skyDraw };
  }
  CQ_MAPS.neve = { n: 'Giardino innevato', make: mapNeve, only: 'neve' };

  const hsh = (x, y, k) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 7, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  // pavimento: neve con le onde del vento; il bordo della zona di ognuno (corda colorata a terra); i pezzi di muro crollati (mucchietti bassi)
  function floorSnow(K, x, y) {
    const { g, S, poly, TW } = K, P = (u, v) => S(x + u, y + v, 0);
    const base = (x + y) % 2 ? '#e9eff6' : '#e5ecf4';
    poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], base);
    if (TW >= 30) {
      for (let i = 0; i < 4; i++) { const u = 0.1 + 0.8 * hsh(x, y, i), v = 0.1 + 0.8 * hsh(x, y, i + 9), r = 0.1 + 0.2 * hsh(x, y, i + 3); poly([P(u - r, v), P(u, v - r * 0.6), P(u + r, v), P(u, v + r * 0.6)], hsh(x, y, i + 5) < 0.5 ? 'rgba(150,175,210,.13)' : 'rgba(255,255,255,.55)'); }
      if (hsh(x, y, 60) < 0.35) { const a = 0.1 + 0.5 * hsh(x, y, 61), b = 0.2 + 0.6 * hsh(x, y, 62), A = P(a, b), B = P(a + 0.4, b - 0.06); g.strokeStyle = 'rgba(150,178,210,.35)'; g.lineWidth = Math.max(1, TW / 30); g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo((A[0] + B[0]) / 2, A[1] - TW * 0.03, B[0], B[1]); g.stroke(); }
      for (let i = 0; i < 4; i++) { const [X, Y] = P(0.08 + 0.84 * hsh(x, y, i + 30), 0.08 + 0.84 * hsh(x, y, i + 40)); g.fillStyle = hsh(x, y, i + 50) < 0.5 ? '#ffffff' : '#c8d6e8'; g.fillRect(X - 1, Y - 0.5, 2, 1.2); }
    }
    // corda del confine della zona da costruire (a terra, coi paletti)
    for (let s = 0; s < 2; s++) { const Z = ZONE[s], col = SIDE[s].c, L = [];
      const seg = (ax, ay, bx2, by2) => { const x0 = Math.max(ax, x), x1 = Math.min(bx2, x + 1), y0 = Math.max(ay, y), y1 = Math.min(by2, y + 1); if (x0 <= x1 && y0 <= y1 && (x1 - x0 > 0.001 || y1 - y0 > 0.001)) L.push([S(x0, y0, 0.02), S(x1, y1, 0.02)]); };
      seg(Z.x0, Z.y0, Z.x1, Z.y0); seg(Z.x0, Z.y1, Z.x1, Z.y1); seg(s ? Z.x0 : Z.x1, Z.y0, s ? Z.x0 : Z.x1, Z.y1);
      if (L.length) { g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = Math.max(1.5, TW / 24); g.setLineDash([TW * 0.12, TW * 0.08]); g.beginPath(); for (const [a, b] of L) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
    }
    // macerie dei muri crollati in questa casella
    const G = cq.g, Sx = G && G.mode === 'neve' && G.S; if (!Sx) return;
    const L = Sx.cell.get(y * W + x); if (!L) return;
    for (const n of L) { const b = Sx.bl[n]; if (!vis(G, b) || live(G, n)) continue; rubble(K, b); }
  }
  function rubble(K, b) {
    const { g, S, TW } = K;
    for (let i = 0; i < 3; i++) { const u = (i - 1) * 0.2, x = b.x + Math.cos(b.a) * u + (hsh(b.s, b.i, i) - 0.5) * 0.2, y = b.y + Math.sin(b.a) * u + (hsh(b.i, b.s, i) - 0.5) * 0.2, [X, Y] = S(x, y, 0.06), r = TW * (0.1 + 0.05 * hsh(b.s, i, b.i)) * (b.k === 2 ? 1.3 : 1);
      g.fillStyle = '#c4d2e2'; g.beginPath(); g.ellipse(X, Y + r * 0.2, r, r * 0.5, 0, 0, 7); g.fill(); g.fillStyle = '#f2f6fb'; g.beginPath(); g.ellipse(X - r * 0.15, Y, r * 0.8, r * 0.4, 0, 0, 7); g.fill(); }
  }
  // muri del bordo: dietro (y = 0) la facciata dell'hotel con le finestre accese; a sinistra (x = 0) la siepe innevata; davanti siepe bassa
  function drawWall(K, x, y) {
    const { bx, poly, S, g, TW } = K;
    if (y === 0 && x >= 1 && x <= 28) return facade(K, x);
    if (x === 0 && y >= 1 && y <= 16) { hedge(K, x, y, 1.05, 'y'); return; }
    if (x === 29 && y >= 1 && y <= 16) { hedge(K, x, y, 0.42, 'y'); return; }
    if (y === 17 && x >= 1 && x <= 28) { hedge(K, x, y, 0.42, 'x'); return; }
    if (x === 0 && y === 0) { bx(x + 0.1, y + 0.1, x + 1, y + 1, 0, 3.2, '#8a7a92'); return; }
  }
  function hedge(K, x, y, h, dir) {
    const { bx, S, g, TW } = K;
    const [a0, a1, b0, b1] = dir === 'y' ? [x + 0.15, x + 0.85, y, y + 1] : [x, x + 1, y + 0.15, y + 0.85];
    bx(a0, b0, a1, b1, 0, h, '#2f5a3a'); bx(a0 - 0.03, b0, a1 + 0.03, b1, h, h + 0.12, '#f2f6fb');
    for (let i = 0; i < 3; i++) { const u = (i + 0.5) / 3, [X, Y] = dir === 'y' ? S(a1, y + u, h * (0.4 + 0.35 * hsh(x, y, i))) : S(x + u, b1, h * (0.4 + 0.35 * hsh(x, y, i))); g.fillStyle = '#e8eef5'; g.beginPath(); g.ellipse(X, Y, TW * 0.09, TW * 0.05, 0, 0, 7); g.fill(); }
  }
  function facade(K, x) {
    const { g, S, poly, TW } = K, Y = 1, u0 = x, u1 = x + 1, HT = 3.6;
    poly([S(u0, Y, 0), S(u1, Y, 0), S(u1, Y, HT), S(u0, Y, HT)], '#7a5a6a');
    // mattoni
    g.strokeStyle = 'rgba(40,20,30,.25)'; g.lineWidth = Math.max(1, TW / 60); g.beginPath();
    for (let z = 0.25; z < HT; z += 0.25) { const a = S(u0, Y, z), b = S(u1, Y, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
    const door = x === 14 || x === 15;
    if (door) {   // la porta a vetri dell'hotel, accesa
      const a = x === 14 ? 0.1 : 0, b = x === 14 ? 1 : 0.9;
      poly([S(u0 + a, Y, 0), S(u0 + b, Y, 0), S(u0 + b, Y, 1.7), S(u0 + a, Y, 1.7)], '#3a2a20');
      poly([S(u0 + a + 0.06, Y, 0.05), S(u0 + b - 0.06, Y, 0.05), S(u0 + b - 0.06, Y, 1.62), S(u0 + a + 0.06, Y, 1.62)], '#ffd98a');
      poly([S(u0 + a + 0.06, Y, 1.0), S(u0 + b - 0.06, Y, 1.0), S(u0 + b - 0.06, Y, 1.62), S(u0 + a + 0.06, Y, 1.62)], '#ffe8b0');
      K.glow(x === 14 ? x + 1 : x, Y + 0.3, 0.9, 1.4, 'rgba(255,210,130,.32)');
    } else {
      for (const z0 of [0.55, 2.1]) { const lit = hsh(x, z0 * 10, 3) < 0.7;
        poly([S(u0 + 0.22, Y, z0 - 0.05), S(u1 - 0.22, Y, z0 - 0.05), S(u1 - 0.22, Y, z0 + 0.95), S(u0 + 0.22, Y, z0 + 0.95)], '#4a3040');
        poly([S(u0 + 0.27, Y, z0), S(u1 - 0.27, Y, z0), S(u1 - 0.27, Y, z0 + 0.9), S(u0 + 0.27, Y, z0 + 0.9)], lit ? '#ffcf6a' : '#2a3450');
        if (lit) { poly([S(u0 + 0.27, Y, z0 + 0.45), S(u1 - 0.27, Y, z0 + 0.45), S(u1 - 0.27, Y, z0 + 0.9), S(u0 + 0.27, Y, z0 + 0.9)], '#ffe2a0'); if (hsh(x, z0, 7) < 0.4) poly([S(u0 + 0.27, Y, z0), S(u0 + 0.4, Y, z0), S(u0 + 0.4, Y, z0 + 0.9), S(u0 + 0.27, Y, z0 + 0.9)], '#a83040'); }
        poly([S(u0 + 0.18, Y + 0.04, z0 - 0.08), S(u1 - 0.18, Y + 0.04, z0 - 0.08), S(u1 - 0.18, Y + 0.04, z0 - 0.02), S(u0 + 0.18, Y + 0.04, z0 - 0.02)], '#f2f6fb');   // neve sul davanzale
      }
    }
    poly([S(u0, Y, HT), S(u1, Y, HT), S(u1, Y - 0.25, HT + 0.18), S(u0, Y - 0.25, HT + 0.18)], '#f2f6fb');   // neve sul cornicione
    if (x === 13 || x === 16) { const [X, Yp] = S(u0 + 0.5, Y, 1.95); g.fillStyle = '#1a1018'; g.fillRect(X - TW * 0.02, Yp, TW * 0.04, TW * 0.05); K.glow(u0 + 0.5, Y + 0.2, 1.9, 0.6, 'rgba(255,200,120,.3)'); g.fillStyle = '#ffc860'; g.beginPath(); g.arc(X, Yp + TW * 0.1, TW * 0.06, 0, 7); g.fill(); }
    if (x >= 12 && x <= 17) {   // insegna HOTEL (ogni casella disegna la sua fetta)
      g.save(); const [X0, Y0] = S(12.2, Y, 3.25); g.translate(X0, Y0); g.transform(1, 0.5, 0, 1, 0, 0);
      const x0 = (u0 - 12.2) * TW / 2, w = TW / 2; g.beginPath(); g.rect(x0, -TW * 0.4, w + 0.5, TW * 0.5); g.clip();
      g.fillStyle = '#2a1a24'; g.fillRect(0, -TW * 0.28, 5.6 * TW / 2, TW * 0.34); g.fillStyle = '#ffd24a'; g.font = '900 ' + Math.round(TW * 0.22) + 'px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOTEL DEI GIOCHI', 2.8 * TW / 2, -TW * 0.1); g.restore();
    }
  }
  // ---- oggetti fissi del giardino ----
  function drawProp(K, t, x, y, o) {
    const { bx, cyl, g, S, TW, poly } = K;
    if (t === 'part') return true;
    if (t === 'nw') { wallCell(K, x, y); return true; }
    if (t === 'nwx') return true;
    if (t === 'fount') {   // fontana ghiacciata in mezzo (2 x 2 caselle, centro nell'angolo 15, 9)
      const cx = 15, cy = 9;
      cyl(cx, cy, 0.95, 0, 0.38, '#9aa8b8'); cyl(cx, cy, 0.82, 0.38, 0.4, '#bfe4f4');
      g.fillStyle = '#e2f4fb'; { const [X, Y] = S(cx - 0.3, cy - 0.2, 0.41); g.beginPath(); g.ellipse(X, Y, TW * 0.22, TW * 0.06, -0.3, 0, 7); g.fill(); }
      cyl(cx, cy, 0.16, 0.4, 1.3, '#9aa8b8'); cyl(cx, cy, 0.42, 1.3, 1.42, '#aab6c4'); cyl(cx, cy, 0.36, 1.42, 1.48, '#f2f6fb');
      for (let i = 0; i < 6; i++) { const a = i * 1.047, [X, Y] = S(cx + Math.cos(a) * 0.38, cy + Math.sin(a) * 0.38, 1.3); g.fillStyle = '#d6f0fa'; g.beginPath(); g.moveTo(X - 2, Y); g.lineTo(X + 2, Y); g.lineTo(X, Y + TW * 0.18); g.closePath(); g.fill(); }   // ghiaccioli
      cyl(cx, cy, 0.1, 1.48, 1.9, '#c8d4e0'); { const [X, Y] = S(cx, cy, 2.0); g.fillStyle = '#f2f6fb'; g.beginPath(); g.arc(X, Y, TW * 0.09, 0, 7); g.fill(); }
      return true;
    }
    if (t === 'nlamp') { cyl(x + 0.5, y + 0.5, 0.05, 0, 2.0, '#2a2e3a'); bx(x + 0.36, y + 0.36, x + 0.64, y + 0.64, 2.0, 2.34, '#ffe08a'); bx(x + 0.32, y + 0.32, x + 0.68, y + 0.68, 2.34, 2.42, '#22262e'); bx(x + 0.34, y + 0.34, x + 0.66, y + 0.66, 2.42, 2.5, '#f2f6fb'); K.glow(x + 0.5, y + 0.5, 2.15, 1.5, 'rgba(255,214,140,.38)'); return true; }
    if (t === 'nbench') { for (const a of [0.12, 0.8]) bx(x + a, y + 0.35, x + a + 0.08, y + 0.65, 0, 0.36, '#3a2a20'); bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.36, 0.43, '#7a4a2a'); bx(x + 0.05, y + 0.26, x + 0.95, y + 0.32, 0.43, 0.85, '#7a4a2a'); bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.43, 0.5, '#f2f6fb'); bx(x + 0.04, y + 0.25, x + 0.96, y + 0.33, 0.85, 0.9, '#f2f6fb'); return true; }
    if (t === 'nsnowman') { snowman(K.g, ...S(x + 0.5, y + 0.5, 0), TW, 1, 2); return true; }
    if (t === 'nsled') { sledDraw(K, x + 0.5, y + 0.5, 0.5); return true; }
    return false;
  }
  function sledDraw(K, x, y, a) {
    const { bx, g, S, TW } = K, c = Math.cos(a), s = Math.sin(a);
    const R = (u, v, z) => S(x + c * u - s * v, y + s * u + c * v, z);
    for (const v of [-0.22, 0.22]) { g.strokeStyle = '#3a2a20'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(...R(-0.45, v, 0.04)); g.lineTo(...R(0.4, v, 0.04)); g.quadraticCurveTo(...R(0.62, v, 0.06), ...R(0.55, v, 0.28)); g.stroke(); }
    K.poly([R(-0.45, -0.28, 0.22), R(0.45, -0.28, 0.22), R(0.45, 0.28, 0.22), R(-0.45, 0.28, 0.22)], '#b8402a');
    K.poly([R(-0.45, 0.28, 0.22), R(0.45, 0.28, 0.22), R(0.45, 0.28, 0.14), R(-0.45, 0.28, 0.14)], '#8a2a1a');
    K.poly([R(-0.3, -0.24, 0.235), R(0.3, -0.24, 0.235), R(0.3, 0.24, 0.235), R(-0.3, 0.24, 0.235)], '#f2e2dc');
  }
  // ---- IL CIELO DI SERA e la neve tutto intorno (la parte ferma si disegna una volta) ----
  let SKY = null;
  function skyBuild(w, h, dpr) {
    const Wd = w * 1.1, Hd = h * 2, cv = document.createElement('canvas'); cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const hy = h, m = Math.min(w, h);
    let gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#0a1024'); gr.addColorStop(0.55, '#1c2a52'); gr.addColorStop(0.85, '#3a4a7a'); gr.addColorStop(1, '#6a6a9a');
    g.fillStyle = gr; g.fillRect(0, 0, Wd, hy + 2);
    for (let i = 0; i < 90; i++) { const y = rnd() * hy * 0.7; g.fillStyle = `rgba(255,250,240,${0.7 * (1 - y / (hy * 0.7)) * rnd()})`; g.fillRect(rnd() * Wd, y, 1.5, 1.5); }
    { const mx = Wd * 0.78, my = hy * 0.22, r = m * 0.05; gr = g.createRadialGradient(mx, my, r * 0.5, mx, my, r * 5); gr.addColorStop(0, 'rgba(220,230,255,.35)'); gr.addColorStop(1, 'rgba(220,230,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, hy); g.fillStyle = '#f4f2e4'; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); g.fillStyle = 'rgba(200,196,170,.5)'; for (const [a, b, c] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [0.1, -0.35, 0.1]]) { g.beginPath(); g.arc(mx + a * r, my + b * r, c * r, 0, 7); g.fill(); } }
    // colline innevate lontane con gli abeti
    for (let k = 0; k < 2; k++) { g.fillStyle = k ? '#7a88aa' : '#5a6890'; g.beginPath(); g.moveTo(0, hy + 2); for (let x = 0; x <= Wd; x += 20) g.lineTo(x, hy - h * (0.05 + 0.04 * k) - Math.sin(x / (90 + k * 40) + k) * h * 0.025); g.lineTo(Wd, hy + 2); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = rnd() * Wd, y = hy - h * 0.03 - rnd() * h * 0.04, s = 6 + rnd() * 10; g.fillStyle = '#2a3a52'; g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.7, y); g.lineTo(x - s * 0.7, y); g.fill(); g.fillStyle = 'rgba(240,245,255,.7)'; g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.25, y - s * 1.3); g.lineTo(x - s * 0.25, y - s * 1.3); g.fill(); }
    gr = g.createLinearGradient(0, hy - 4, 0, Hd); gr.addColorStop(0, '#8a98ba'); gr.addColorStop(0.2, '#aebbd4'); gr.addColorStop(1, '#b8c6dc'); g.fillStyle = gr; g.fillRect(0, hy - 2, Wd, Hd - hy + 2);
    return { cv, w, h, dpr, W: Wd, H: Hd, hy };
  }
  const GX0 = -14, GX1 = 44, GY0 = -10, GY1 = 30;
  const GDECO = (() => {
    let sd = 41; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }, L = [];
    const free = (x, y) => !(x > -2 && x < 32 && y > -2 && y < 20);
    for (let i = 0; i < 140 && L.length < 54; i++) { const x = GX0 + 2 + rnd() * (GX1 - GX0 - 4), y = GY0 + 2 + rnd() * (GY1 - GY0 - 4); if (!free(x, y) || L.some(o => Math.hypot(o[1] - x, o[2] - y) < 2.4)) continue; L.push([rnd() < 0.7 ? 'fir' : 'drift', x, y, 0.8 + rnd() * 0.7]); }
    return L.sort((a, b) => a[1] + a[2] - b[1] - b[2]);
  })();
  function iso(g, X, Y, TW) {
    const Uz = TW * 0.575, S = (x, y, z) => [X + (x - y) * TW / 2, Y + (x + y) * TW / 4 - z * Uz];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const bx = (x0, y0, x1, y1, z0, z1, col) => { poly([S(x0, y1, z1), S(x1, y1, z1), S(x1, y1, z0), S(x0, y1, z0)], cqShade(col, 0.82)); poly([S(x1, y1, z1), S(x1, y0, z1), S(x1, y0, z0), S(x1, y1, z0)], cqShade(col, 0.66)); poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], cqShade(col, 1.04)); };
    const cyl = (cx, cy, r, z0, z1, col) => { const [X0, Y0] = S(cx, cy, z0), [X1, Y1] = S(cx, cy, z1), rx = r * TW * 0.707, ry = r * TW * 0.3535; g.fillStyle = cqShade(col, 0.8); g.fillRect(X0 - rx, Y1, rx * 2, Y0 - Y1); g.beginPath(); g.ellipse(X0, Y0, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = cqShade(col, 1.04); g.beginPath(); g.ellipse(X1, Y1, rx, ry, 0, 0, 7); g.fill(); };
    return { g, S, poly, bx, cyl, TW, U: Uz, glow: () => {} };
  }
  function groundDraw(g, tx, ty, TW) {
    const Uz = TW * 0.575, S = (x, y, z = 0) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * Uz];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const rect = (x0, y0, x1, y1, col) => poly([S(x0, y0), S(x1, y0), S(x1, y1), S(x0, y1)], col);
    for (const [m, col] of [[5, 'rgba(184,198,220,.3)'], [3, 'rgba(190,204,226,.55)'], [1.5, 'rgba(200,212,232,.85)'], [0, '#cdd8e8']]) rect(GX0 - m, GY0 - m, GX1 + m, GY1 + m, col);
    for (let i = 0; i < 30; i++) { const x = GX0 + ((i * 7.31) % (GX1 - GX0)), y = GY0 + ((i * 3.77) % (GY1 - GY0)), r = 0.8 + (i % 4) * 0.6; poly([S(x - r, y), S(x, y - r * 0.6), S(x + r, y), S(x, y + r * 0.6)], i % 2 ? 'rgba(150,170,205,.14)' : 'rgba(255,255,255,.35)'); }
    // il vialetto che esce dal giardino verso la strada
    rect(29, 7.6, GX1, 10.4, '#c2cee0'); rect(-1, 7.6, 1, 10.4, '#c2cee0');
    for (const [t, x, y, s] of GDECO) {
      const [X, Y] = S(x, y), K = iso(g, X, Y, TW), { bx } = K;
      g.fillStyle = 'rgba(60,80,120,.18)'; g.beginPath(); g.ellipse(X, Y, TW * 0.6 * s, TW * 0.25 * s, 0, 0, 7); g.fill();
      if (t === 'fir') { bx(-0.06, -0.06, 0.06, 0.06, 0, 0.5 * s, '#4a3424'); for (let k = 0; k < 3; k++) { const r = (0.62 - k * 0.17) * s, z0 = (0.4 + k * 0.62) * s; K.poly([K.S(-r, r, z0), K.S(r, r, z0), K.S(r, -r, z0), K.S(0, 0, z0 + 0.95 * s)], k % 2 ? '#24503a' : '#1f4834'); K.poly([K.S(-r * 0.55, r * 0.55, z0 + 0.45 * s), K.S(r * 0.55, r * 0.55, z0 + 0.45 * s), K.S(0, 0, z0 + 0.95 * s)], '#eef4f9'); } }
      else { bx(-0.5 * s, -0.4 * s, 0.5 * s, 0.4 * s, 0, 0.25 * s, '#e6eef5'); bx(-0.25 * s, -0.2 * s, 0.3 * s, 0.2 * s, 0.25 * s, 0.4 * s, '#f6f9fc'); }
    }
  }
  function skyDraw(g, CX, CY, tx, ty, TW) {
    const w = cq.w, h = cq.h, dpr = Math.min(2, cq.dpr);
    if (!SKY || SKY.w !== w || SKY.h !== h || SKY.dpr !== dpr) SKY = skyBuild(w, h, dpr);
    const m0 = g.getTransform(), hz = tx == null ? h * 0.45 : Math.max(h * 0.06, Math.min(h * 0.92, (m0.d * (ty + (GX0 + GY0 + 2) * TW / 4) + m0.f) / cq.dpr)), ox = -w * 0.05 - Math.max(-1, Math.min(1, (CX - CY - 6) / 24)) * w * 0.04;
    g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.drawImage(SKY.cv, ox, hz - SKY.hy, SKY.W, SKY.H); g.restore();
    if (tx != null) groundDraw(g, tx, ty, TW);
  }

  // ======================= I MURI DI NEVE: geometria, tenuta, disegno =======================
  // Un blocco: { o: lato 0/1, s: tratto, i: posto nel tratto, x, y, a: direzione, k: 1 semplice / 2 doppio, j: attaccato a un altro muro, as: asse, fx, fy: piede dell'asse }
  const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const adj = (p, q) => p && q && p.s === q.s && q.i === p.i + 1 && Math.hypot(p.x - q.x, p.y - q.y) < 0.75;
  function resample(pts) {
    const out = []; if (!pts.length) return out; out.push(pts[0].slice()); let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      let ax = pts[i - 1][0], ay = pts[i - 1][1]; const bx = pts[i][0], by = pts[i][1]; let seg = Math.hypot(bx - ax, by - ay);
      while (seg > 1e-6 && acc + seg >= SP) { const k = (SP - acc) / seg; ax += (bx - ax) * k; ay += (by - ay) * k; out.push([ax, ay]); seg = Math.hypot(bx - ax, by - ay); acc = 0; }
      acc += seg;
    }
    return out;
  }
  // la TENUTA: pilastri (angoli >= 40 gradi accumulati, attacchi, assi) e campate (i pezzi fra i pilastri, con la salute in comune)
  function structure(B) {
    const n = B.length, pil = new Uint8Array(n), bc = new Int32Array(n), camp = [], cell = new Map(), hash = new Map();
    let turn = 0;
    for (let i = 0; i < n; i++) {
      const b = B[i], q = i && adj(B[i - 1], b) ? B[i - 1] : null;
      if (!q) turn = 0; else { turn += Math.abs(angD(b.a, q.a)); if (turn >= TURN) { pil[i] = 1; turn = 0; } }
      if (b.j || b.as) pil[i] = 1;
    }
    let cur = null;
    for (let i = 0; i < n; i++) {
      const b = B[i];
      if (pil[i]) { camp.push({ b: [i], k: b.k, p: 1, o: b.o, max: (b.k === 2 ? SAL.p2 : SAL.p1) + (b.as ? SAL.as : 0) }); bc[i] = camp.length - 1; cur = null; continue; }
      if (!cur || !adj(B[i - 1], b) || B[i - 1].k !== b.k) { cur = { b: [], k: b.k, p: 0, o: b.o, max: b.k === 2 ? SAL.w2 : SAL.w1 }; camp.push(cur); }
      cur.b.push(i); bc[i] = camp.length - 1;
    }
    for (let i = 0; i < n; i++) {
      const b = B[i], ck = Math.floor(b.y) * W + Math.floor(b.x); (cell.get(ck) || cell.set(ck, []).get(ck)).push(i);
      for (let y = Math.floor(b.y - 0.75); y <= Math.floor(b.y + 0.75); y++) for (let x = Math.floor(b.x - 0.75); x <= Math.floor(b.x + 0.75); x++) { const k = y * W + x; (hash.get(k) || hash.set(k, []).get(k)).push(i); }
    }
    return { bl: B, pil, bc, camp, cell, hash };
  }
  const salOf = (G, n) => { const S = G.S, st = G.st, c = S.bc[n]; return st && st.cs && st.wv === S.v && st.cs.length === S.camp.length ? st.cs[c] : S.camp[c].max; };
  const live = (G, n) => salOf(G, n) > 0;
  const mySide = G => G.chars.indexOf(G.me) === 1 ? 1 : 0;
  const revealed = G => { const p = G.st && G.st.ph; return p && p !== 'build'; };
  const vis = (G, b) => b.o === mySide(G) || revealed(G);
  // distanza da un punto alla sagoma di un blocco (capsula lungo il muro, o tondo se e' un pilastro)
  function bDist(S, n, x, y) {
    const b = S.bl[n]; if (S.pil[n]) return Math.hypot(x - b.x, y - b.y);
    const c = Math.cos(b.a), s = Math.sin(b.a), dx = x - b.x, dy = y - b.y, t = Math.max(-HLEN, Math.min(HLEN, dx * c + dy * s));
    return Math.hypot(dx - c * t, dy - s * t);
  }
  const bRad = (S, n) => S.pil[n] ? RP : S.bl[n].k === 2 ? R2 : R1;
  // il primo blocco vivo vicino a un punto (entro r oltre la sagoma); skip(n) = blocchi da ignorare
  function blockAt(G, x, y, r, skip, side) {
    const S = G.S; if (!S) return -1; const L = S.hash.get(Math.floor(y) * W + Math.floor(x)); if (!L) return -1;
    let best = -1, bd = 1e9;
    for (const n of L) { if (!live(G, n) || (skip && skip(n)) || (side != null && S.bl[n].o !== side)) continue; const d = bDist(S, n, x, y) - (S.pil[n] ? 0.22 : S.bl[n].k === 2 ? TH2 : TH1); if (d < r && d < bd) { bd = d; best = n; } }
    return best;
  }
  function blkAt(G, x, y) {
    const S = G.S, st = G.st; if (!S || !st) return false;
    const L = S.hash.get(Math.floor(y) * W + Math.floor(x));
    if (L) for (const n of L) { if (!live(G, n) || !vis(G, S.bl[n])) continue; if (bDist(S, n, x, y) < bRad(S, n)) return true; }
    for (let s = 0; s < 2; s++) { const ig = st.p && st.p[s] && st.p[s].ig; if (ig && ig[2] > 0 && (s === mySide(G) || revealed(G)) && Math.hypot(x - ig[0], y - ig[1]) < IG_R + 0.04) return true; }
    return false;
  }
  // l'igloo vivo di un lato (o null)
  const iglooOf = (G, s) => { const ig = G.st && G.st.p && G.st.p[s] && G.st.p[s].ig; return ig && ig[2] > 0 ? ig : null; };
  // geometria che viaggia in rete: un testo compatto (cambia solo costruendo e a fine manche)
  function encode(B) { return B.map(b => [b.o, b.s, b.i, Math.round(b.x * 100), Math.round(b.y * 100), Math.round(b.a * 100), b.k, b.j ? 1 : 0, b.as ? 1 : 0, b.as ? Math.round(b.fx * 100) : 0, b.as ? Math.round(b.fy * 100) : 0].join(',')).join(';'); }
  function decode(s) { if (!s) return []; return s.split(';').map(t => { const v = t.split(',').map(Number); return { o: v[0], s: v[1], i: v[2], x: v[3] / 100, y: v[4] / 100, a: v[5] / 100, k: v[6], j: v[7], as: v[8], fx: v[9] / 100, fy: v[10] / 100 }; }); }
  function setGeo(G, v, B) { G.S = structure(B); G.S.v = v; G.geoSig = null; }
  // dopo ogni cambio (solo l'host): nuova versione, salute piena alle campate nuove
  function regeo(G, keepCs) {
    const old = G.S, oldCs = G.st.cs || [];
    G.wv = (G.wv || 0) + 1; setGeo(G, G.wv, G.wb);
    G.st.cs = G.S.camp.map(c => c.max); G.st.wv = G.wv;
    if (keepCs && old) { /* (nessun danno da tenere: in costruzione la salute e' sempre piena) */ }
    G.wdS = encode(G.wb); G.wdAck = G.wdAck || {}; void oldCs;
  }

  // ---- COSTRUIRE (host): tratti di muro, assi, mucchio delle scorte, gomma, annulla ----
  const PSd = (G, s) => G.st.p[s];
  const posOf = (G, c) => c === G.me ? cq : c;
  const charOf = (G, s) => G.chars[s];
  const inZ = (s, x, y) => { const Z = ZONE[s]; return x >= Z.x0 && x <= Z.x1 && y >= Z.y0 && y <= Z.y1; };
  const clampZ = (s, x, y) => { const Z = ZONE[s]; return [Math.max(Z.x0, Math.min(Z.x1, x)), Math.max(Z.y0, Math.min(Z.y1, y))]; };
  function nearOwn(G, s, x, y, r, skipS) { let best = null, bd = r; for (const b of G.wb) { if (b.o !== s || b.s === skipS) continue; const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } } return best; }
  function badSpot(G, s, x, y) {
    const p = PSd(G, s), P = posOf(G, charOf(G, s));
    if (Math.hypot(P.x - x, P.y - y) < 0.62) return true;
    if (Math.hypot(p.sx - x, p.sy - y) < 0.8) return true;
    if (p.ig && Math.hypot(p.ig[0] - x, p.ig[1] - y) < 0.95) return true;
    return false;
  }
  function addStroke(G, s, raw, opt = {}) {
    const p = PSd(G, s); if (!raw || !raw.length || p.nv <= 0) return 0;
    const pts = resample(raw.map(([x, y]) => clampZ(s, x, y))).slice(0, 60);
    const sid = ++G.wsN, rec = { k: 'w', nb: [], th: [], j: [] }; let prev = null, idx = 0, pend = false, spent = 0;
    for (let n = 0; n < pts.length; n++) {
      if (p.nv <= 0) break;
      const [x, y] = pts[n], A = pts[Math.max(0, n - 1)], Bp = pts[Math.min(pts.length - 1, n + 1)], a = pts.length > 1 ? Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) : 0;
      if (badSpot(G, s, x, y)) { prev = null; continue; }
      const near = nearOwn(G, s, x, y, 0.42, sid);   // (i pezzi dello stesso tratto non contano: negli angoli stretti stanno vicini)
      if (near) {
        const par = Math.abs(Math.cos(near.a - a)) > 0.75;
        if (near.s !== sid && par && near.k === 1 && !opt.noThick) { near.k = 2; p.nv--; spent++; rec.th.push(near); }
        else if (near.s !== sid && !par && (n === 0 || n === pts.length - 1)) { if (!near.j) { near.j = 1; rec.j.push(near); } if (n === 0) pend = true; else if (prev && !prev.j) { prev.j = 1; } }
        prev = null; continue;
      }
      const b = { o: s, s: sid, i: idx++, x: r2(x), y: r2(y), a: r2(a), k: 1, j: pend ? 1 : 0, as: 0, fx: 0, fy: 0 }; pend = false;
      G.wb.push(b); rec.nb.push(b); p.nv--; spent++; prev = b;
    }
    if (rec.nb.length || rec.th.length || rec.j.length) { (G.undo[s] || (G.undo[s] = [])).push(rec); regeo(G); }
    return spent;
  }
  function addAsse(G, s, raw) {
    const p = PSd(G, s); if (p.as <= 0 || !raw || !raw.length) return false;
    const A = clampZ(s, ...raw[0]), B = clampZ(s, ...raw[raw.length - 1]);
    let b = nearOwn(G, s, A[0], A[1], 0.6), foot = B; if (!b) { b = nearOwn(G, s, B[0], B[1], 0.6); foot = A; } if (!b || b.as) return false;
    let fx = foot[0] - b.x, fy = foot[1] - b.y, l = Math.hypot(fx, fy);
    if (l < 0.35) { const side = s ? 1 : -1; fx = side * 0.75; fy = 0; l = 0.75; }   // un tocco: l'asse va dalla parte di casa
    const L = Math.max(0.55, Math.min(1.0, l)); fx = b.x + fx / l * L; fy = b.y + fy / l * L;
    b.as = 1; b.fx = r2(fx); b.fy = r2(fy); p.as--; (G.undo[s] || (G.undo[s] = [])).push({ k: 'a', b }); regeo(G); return true;
  }
  function eraseAt(G, s, x, y) {
    const p = PSd(G, s), kill = G.wb.filter(b => b.o === s && Math.hypot(b.x - x, b.y - y) < 0.62); if (!kill.length) return false;
    for (const b of kill) { p.nv += b.k; if (b.as) p.as++; }
    G.wb = G.wb.filter(b => !kill.includes(b)); regeo(G); return true;
  }
  function undo(G, s) {
    const L = G.undo[s]; if (!L || !L.length) return false; const r = L.pop(), p = PSd(G, s);
    if (r.k === 'a') { if (G.wb.includes(r.b) && r.b.as) { r.b.as = 0; p.as++; } }
    else { for (const b of r.nb) if (G.wb.includes(b)) { p.nv += b.k; if (b.as) p.as++; } G.wb = G.wb.filter(b => !r.nb.includes(b)); for (const b of r.th) if (G.wb.includes(b) && b.k === 2) { b.k = 1; p.nv++; } for (const b of r.j) b.j = 0; }
    regeo(G); return true;
  }
  function placeStock(G, s, x, y) {
    const p = PSd(G, s); [x, y] = clampZ(s, x, y);
    if (G.wb.some(b => b.o === s && Math.hypot(b.x - x, b.y - y) < 0.85) || (p.ig && Math.hypot(p.ig[0] - x, p.ig[1] - y) < 1.1)) return false;
    p.sx = r2(x); p.sy = r2(y); return true;
  }
  // l'IGLOO degli gnomi (8 neve, uno solo; toccando di nuovo si sposta)
  function placeIgloo(G, s, x, y) {
    const p = PSd(G, s); [x, y] = clampZ(s, x, y); const P = START[s];
    if (G.wb.some(b => b.o === s && Math.hypot(b.x - x, b.y - y) < 1.0) || Math.hypot(P[0] - x, P[1] - y) < 1.2 || Math.hypot(p.sx - x, p.sy - y) < 1.1) return false;
    if (!p.ig) { if (p.nv < IG_COST) return false; p.nv -= IG_COST; }
    p.ig = [r2(x), r2(y), IG_HP]; return true;
  }
  function buildAct(G, s, t, pts) {
    const st = G.st; if (!st || st.ph !== 'build' || PSd(G, s).rd) return;
    const tap = pts.length < 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.3, [lx, ly] = pts[pts.length - 1], p = PSd(G, s);
    if (t === 'w') addStroke(G, s, pts);
    else if (t === 'a') addAsse(G, s, pts);
    else if (t === 'e') { if (p.ig && Math.hypot(p.ig[0] - lx, p.ig[1] - ly) < 0.8) { p.ig = 0; p.nv += IG_COST; } else eraseAt(G, s, lx, ly); }
    else if (t === 's' && tap) placeStock(G, s, lx, ly);
    else if (t === 'i' && tap) placeIgloo(G, s, lx, ly);
  }

  // ---- disegno di un blocco di neve (nella mappa pronta: si ridisegna solo quando cambia) ----
  // una casella della mappa pronta: i blocchi di muro e gli oggetti fermi (mucchi, scorte, igloo) che hanno il centro qui, dal piu' lontano al piu' vicino
  function wallCell(K, x, y) {
    const G = cq.g; if (!G || G.mode !== 'neve') return; const S = G.S, k = y * W + x, L = S ? S.cell.get(k) || [] : [], items = [];
    for (const n of L) if (vis(G, S.bl[n]) && live(G, n)) items.push([S.bl[n].x + S.bl[n].y, n]);
    for (const o of (G.objCell && G.objCell.get(k)) || []) items.push([o[1] + o[2], o]);
    items.sort((p, q) => p[0] - q[0]);
    for (const [, it] of items) {
      if (typeof it === 'number') { const b = S.bl[it], c = S.camp[S.bc[it]], sal = salOf(G, it); if (b.as) asseDraw(K, b); if (S.pil[it]) pilDraw(K, b, sal / c.max); else blockDraw(K, b, sal / c.max, S, it); continue; }
      const [t, ox, oy, n, s] = it, [X, Y] = K.S(ox, oy, 0);
      if (t === 'p') pileDraw(K.g, X, Y, K.TW, n, 0); else if (t === 's') pileDraw(K.g, X, Y, K.TW, n, s + 1); else iglooDraw(K.g, X, Y, K.TW, s, n);
    }
  }
  // oggetti bassi fermi: anche loro nella mappa pronta (si ridisegnano solo quando cambiano: costa molto meno che a ogni immagine)
  function objList(G) {
    const st = G.st, L = []; if (!st || !st.pl) return L;
    PILES.forEach(([x, y], i) => L.push(['p', x, y, st.pl[i], i]));
    for (let s = 0; s < 2; s++) { const p = st.p[s]; if (!(s === mySide(G) || revealed(G))) continue;
      L.push(['s', p.sx, p.sy, st.ph !== 'build' ? p.sk : Math.min(STOCK_MAX, Math.floor(Math.max(0, p.nv) / 2)), s]);
      if (p.ig && p.ig[2] > 0) L.push(['i', p.ig[0], p.ig[1], p.ig[2], s]); }
    return L;
  }
  function blockDraw(K, b, hp, S, n) {
    const { g, S: P, poly, TW } = K, c = Math.cos(b.a), s = Math.sin(b.a), T = b.k === 2 ? TH2 : TH1, h = b.k === 2 ? WH2 : WH1, L = HLEN;
    const pt = (u, v, z) => P(b.x + c * u - s * v, b.y + s * u + c * v, z);
    const C = [[-L, -T], [L, -T], [L, T], [-L, T]];
    const faces = [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]];   // [da, a, normale u, normale v]
    for (const [i0, i1, nu, nv] of faces) {
      const nx = c * nu - s * nv, ny = s * nu + c * nv; if (nx + ny <= 0.001) continue;
      const sh = (Math.max(0, nx) * 0.74 + Math.max(0, ny) * 0.88) / (Math.max(0, nx) + Math.max(0, ny));
      const A = C[i0], B = C[i1]; poly([pt(A[0], A[1], 0), pt(B[0], B[1], 0), pt(B[0], B[1], h), pt(A[0], A[1], h)], cqShade('#e2eaf3', sh));
      if (TW >= 30) { g.strokeStyle = cqShade('#c8d4e2', sh + 0.12); g.lineWidth = Math.max(1, TW / 48); g.beginPath(); for (const z of [h * 0.36, h * 0.7]) { const a = pt(A[0], A[1], z), bb = pt(B[0], B[1], z); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); } g.stroke(); }
    }
    poly([pt(-L, -T, h), pt(L, -T, h), pt(L, T, h), pt(-L, T, h)], '#f6f9fd');
    { const a = pt(-L * 0.8, -T * 0.4, h + 0.05), bb = pt(L * 0.8, T * 0.4, h + 0.05), m = pt(0, 0, h + 0.09); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], bb[0], bb[1]); g.lineTo(a[0], a[1]); g.fill(); }
    if (hp < 0.999) crackDraw(g, pt, h, T, hp, b);
  }
  function crackDraw(g, pt, h, T, hp, b) {
    const k = hp < 0.4 ? 3 : hp < 0.7 ? 2 : 1;
    g.strokeStyle = '#3a5a8a'; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < k; i++) { const u0 = (hsh(b.s, b.i, i) - 0.5) * 0.4; let p0 = pt(u0, T, h * 0.98); g.moveTo(p0[0], p0[1]); for (let j = 1; j <= 3; j++) { const p1 = pt(u0 + (hsh(b.i, j, i) - 0.5) * 0.18, T, h * (1 - j * 0.28)); g.lineTo(p1[0], p1[1]); } }
    g.stroke();
  }
  function pilDraw(K, b, hp) {
    const { cyl, g, S, TW } = K, h = (b.k === 2 ? WH2 : WH1) + 0.14, r = b.k === 2 ? 0.27 : 0.21;
    cyl(b.x, b.y, r, 0, h, '#e6eef6'); cyl(b.x, b.y, r * 0.86, h, h + 0.06, '#ffffff');
    { const [X, Y] = S(b.x, b.y, h + 0.16); g.fillStyle = '#f8fbff'; g.beginPath(); g.arc(X, Y, TW * r * 0.55, 0, 7); g.fill(); g.fillStyle = '#d0dbe8'; g.beginPath(); g.arc(X + TW * 0.03, Y + TW * 0.03, TW * r * 0.4, 0, Math.PI); g.fill(); }
    // bandierina del colore del fortino (si capisce subito dove sono i pilastri)
    const [Xs, Ys] = S(b.x, b.y, h + 0.25), [Xt, Yt] = S(b.x, b.y, h + 0.62); g.strokeStyle = '#4a3424'; g.lineWidth = Math.max(1.2, TW / 40); g.beginPath(); g.moveTo(Xs, Ys); g.lineTo(Xt, Yt); g.stroke();
    g.fillStyle = SIDE[b.o].c; g.beginPath(); g.moveTo(Xt, Yt); g.lineTo(Xt + TW * 0.16, Yt + TW * 0.05); g.lineTo(Xt, Yt + TW * 0.11); g.closePath(); g.fill();
    if (hp < 0.999) { g.strokeStyle = '#3a5a8a'; g.lineWidth = 1.6; g.beginPath(); const [X, Y] = S(b.x + r * 0.7, b.y + r * 0.7, h * 0.9); g.moveTo(X, Y); g.lineTo(X + 3, Y + TW * 0.12); g.lineTo(X - 1, Y + TW * 0.2); if (hp < 0.5) { g.moveTo(X - 4, Y + 2); g.lineTo(X - 6, Y + TW * 0.18); } g.stroke(); }
  }
  function asseDraw(K, b) {
    const { g, S, TW } = K, h = (b.k === 2 ? WH2 : WH1) * 0.92, A = S(b.fx, b.fy, 0), B = S(b.x, b.y, h);
    g.strokeStyle = '#5a3a20'; g.lineWidth = Math.max(3, TW / 9); g.lineCap = 'round'; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    g.strokeStyle = '#9a6a3a'; g.lineWidth = Math.max(1.5, TW / 18); g.beginPath(); g.moveTo(A[0], A[1] - 1); g.lineTo(B[0], B[1] - 1); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#f6f9fd'; const M = S((b.fx + b.x) / 2, (b.fy + b.y) / 2, h / 2 + 0.05); g.beginPath(); g.ellipse(M[0], M[1], TW * 0.07, TW * 0.035, 0, 0, 7); g.fill();
  }
  // le caselle con i muri diventano oggetti della mappa (solo per disegnarli e per i percorsi del computer: la sagoma vera e' blkAt)
  function syncProps(G) {
    const S = G.S; if (!S) return;
    const st = G.st, objs = objList(G);
    const sig = (S.v || 0) + '|' + (st && st.wv === S.v ? (st.cs || []).join('') : '') + '|' + (revealed(G) ? 1 : 0) + mySide(G) + '|' + objs.map(o => o.join(',')).join(';');
    if (sig === G.geoSig) return; G.geoSig = sig;
    const want = new Map(), oc = new Map();
    for (const o of objs) { const k = Math.floor(o[2]) * W + Math.floor(o[1]); (oc.get(k) || oc.set(k, []).get(k)).push(o); }
    G.objCell = oc;
    for (const [k, L] of S.cell) { let s = ''; for (const n of L) { const b = S.bl[n]; if (!vis(G, b)) continue; s += n + ':' + salOf(G, n) + (b.as ? 'a' : '') + ','; } if (s) want.set(k, s); }
    for (const [k, L] of oc) want.set(k, (want.get(k) || '') + '|' + L.map(o => o.join(',')).join(';'));
    const old = G.propSig || new Map();
    for (const [k] of old) if (!want.has(k)) { const x = k % W, y = (k / W) | 0; if (cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].prop === 'nw') cqSolid[y][x] = null; cqBgCell(x, y); }
    for (const [k, s] of want) {
      if (old.get(k) === s) continue; const x = k % W, y = (k / W) | 0; if (!cqSolid[y]) continue;
      const L = S.cell.get(k) || [], any = oc.has(k) || L.some(n => vis(G, S.bl[n]) && live(G, n)), cur = cqSolid[y][x];
      if (any) { if (!cur || cur.prop === 'nw' || cur.prop === 'nwx') cqSolid[y][x] = { prop: 'nw', soft: true, o: { k } }; }
      else if (cur && cur.prop === 'nw') cqSolid[y][x] = null;
      cqBgCell(x, y);
    }
    G.propSig = want;
    // anche le caselle toccate dalla sagoma (non solo dal centro) sono chiuse per i percorsi del computer (solo se i muri sono cambiati)
    const wsig = sig.slice(0, sig.lastIndexOf('|')) + [0, 1].map(s => { const ig = iglooOf(G, s); return ig ? ig[0] + ',' + ig[1] : '-'; }).join('/');
    if (wsig === G.wallSig) return; G.wallSig = wsig;
    if (G.softX) for (const k of G.softX) { const x = k % W, y = (k / W) | 0; if (cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].prop === 'nwx') cqSolid[y][x] = null; }
    G.softX = [];
    for (let n = 0; n < S.bl.length; n++) { const b = S.bl[n]; if (!vis(G, b) || !live(G, n)) continue; const c = Math.cos(b.a) * HLEN, s = Math.sin(b.a) * HLEN;
      for (const [px, py] of [[b.x + c, b.y + s], [b.x - c, b.y - s]]) { const x = Math.floor(px), y = Math.floor(py); if (cqSolid[y] && !cqSolid[y][x] && cqFloor[y] && cqFloor[y][x]) { cqSolid[y][x] = { prop: 'nwx', soft: true }; G.softX.push(y * W + x); } } }
    for (let s = 0; s < 2; s++) { const ig = iglooOf(G, s); if (!ig || !(s === mySide(G) || revealed(G))) continue;
      for (const [px, py] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { const x = Math.floor(ig[0] + px), y = Math.floor(ig[1] + py); if (cqSolid[y] && !cqSolid[y][x] && cqFloor[y] && cqFloor[y][x]) { cqSolid[y][x] = { prop: 'nwx', soft: true }; G.softX.push(y * W + x); } } }
    for (const c of G.chars) if (c.bot && !c.remote) { c.path = []; c.goal = null; }
    for (const g of G.gn || []) g.path = [];
  }
  function clearProps() {
    for (let y = 0; y < CQ_H; y++) for (let x = 0; x < CQ_W; x++) { const s = cqSolid[y] && cqSolid[y][x]; if (s && (s.prop === 'nw' || s.prop === 'nwx')) cqSolid[y][x] = null; }
  }

  // ======================= I BAMBINI =======================
  const HEAD = { omino: [0, -39], procione: [4, -40], gatto: [4, -40], regista: [4, -43], guardia: [5, -42], tonno: [6, -44], giraffa: [10, -73], polipo: [4, -40], bruco: [8, -42], bassotto: [14, -29], palma: [3, -40], pinguino: [4, -52], pane: [1, -41], lupo: [17, -49] };
  function beanie(g, x0, hy, S2) {   // berretto di lana col pompon (unita' del personaggio)
    g.fillStyle = S2.c; g.beginPath(); g.arc(x0, hy + 4, 10.5, Math.PI, 0); g.fill();
    g.fillStyle = S2.d; for (let i = -2; i <= 2; i++) g.fillRect(x0 + i * 4 - 0.6, hy - 4 + Math.abs(i) * 1.3, 1.2, 7 - Math.abs(i) * 1.2);
    g.fillStyle = S2.c2; cqRR(g, x0 - 11.5, hy + 2, 23, 5.5, 2.5); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x0, hy - 7.2, 4.4, 0, 7); g.fill(); g.fillStyle = 'rgba(180,200,230,.6)'; g.beginPath(); g.arc(x0 + 1.2, hy - 6, 2, 0, 7); g.fill();
  }
  function kid(g, X, Y, TW, L, walk, f, s, o) {
    const u = TW / 34, bob = Math.abs(Math.sin(walk)) * 4 * u, [hx, hy] = HEAD[L.skin] || HEAD.omino, S2 = SIDE[s];
    g.save();
    if (o.cr) { g.translate(X, Y); g.scale(1, 0.8); g.translate(-X, -Y); }
    cqPlayer(g, X, Y, TW, L.skin === 'omino' ? Object.assign({}, L, { hat: 'nessuno' }) : L, walk, f, true);
    g.translate(X, Y - bob); g.scale(u, u);
    { const ny = hy + 17; g.fillStyle = S2.c; g.beginPath(); g.ellipse(f * hx * 0.5, ny, 10.5, 3.6, 0, 0, 7); g.fill(); g.fillStyle = S2.c2; g.fillRect(f * hx * 0.5 - 9, ny - 0.8, 18, 1.6);
      g.fillStyle = S2.c; g.save(); g.translate(f * (hx * 0.5 + 5), ny + 1); g.rotate(f * 0.25); g.fillRect(-2.4, 0, 4.8, 11); g.fillStyle = S2.c2; g.fillRect(-2.4, 8, 4.8, 1.5); g.restore(); }
    if (o.ball) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f * 13, hy + 30 - (o.throw || 0) * 22, 4.2, 0, 7); g.fill(); g.fillStyle = 'rgba(150,175,210,.6)'; g.beginPath(); g.arc(f * 13 + 1.4, hy + 31.4 - (o.throw || 0) * 22, 2.2, 0, Math.PI); g.fill(); }
    beanie(g, f * hx, hy + 1, S2);
    g.restore();
    // neve addosso: una macchia bianca per ogni colpo preso
    if (o.hits) { g.save(); g.translate(X, Y); g.scale(u, u); for (let i = 0; i < o.hits; i++) { const [a, b] = [[-5, -18], [6, -26], [-2, -32]][i]; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(a, b, 5.2, 0, 7); g.fill(); g.fillStyle = 'rgba(160,185,215,.5)'; g.beginPath(); g.arc(a + 1.4, b + 1.2, 2.4, 0, 7); g.fill(); } g.restore(); }
  }
  // pupazzo di neve (sepolto: cresce dal basso; s = lato per il berretto, 2 = pupazzo del giardino col cappello)
  function snowman(g, X, Y, TW, k, s) {
    const u = TW / 34, e = Math.max(0, Math.min(1, k)); g.save(); g.translate(X, Y); g.scale(u, u);
    g.fillStyle = '#c8d4e2'; g.beginPath(); g.ellipse(0, 1, 17, 6, 0, 0, 7); g.fill();
    const ball = (y, r) => { if (r <= 0) return; g.fillStyle = '#f2f6fb'; g.beginPath(); g.arc(0, y, r, 0, 7); g.fill(); g.fillStyle = '#cfdae8'; g.beginPath(); g.arc(r * 0.25, y + r * 0.2, r * 0.8, -0.3, 1.9); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-r * 0.35, y - r * 0.35, r * 0.3, 0, 7); g.fill(); };
    ball(-12 * Math.min(1, e * 1.6), 15 * Math.min(1, e * 1.6)); if (e > 0.35) ball(-33, 11 * Math.min(1, (e - 0.35) * 2.5)); if (e > 0.6) ball(-50, 8.5 * Math.min(1, (e - 0.6) * 3));
    if (e > 0.85) {
      g.fillStyle = '#1a1a22'; for (const a of [-3, 3]) { g.beginPath(); g.arc(a, -52, 1.3, 0, 7); g.fill(); } for (const yy of [-36, -30, -16, -8]) { g.beginPath(); g.arc(0, yy, 1.5, 0, 7); g.fill(); }
      g.fillStyle = '#e8782a'; g.beginPath(); g.moveTo(0, -49.5); g.lineTo(9, -48); g.lineTo(0, -47); g.closePath(); g.fill();
      g.strokeStyle = '#5a3a24'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-10, -33); g.lineTo(-20, -40); g.moveTo(10, -33); g.lineTo(19, -41); g.moveTo(-17, -38); g.lineTo(-19, -43); g.stroke();
      if (s === 2) { g.fillStyle = '#22222a'; g.fillRect(-8, -59, 16, 2.5); g.fillRect(-5.5, -68, 11, 9); g.fillStyle = '#a83030'; g.fillRect(-5.5, -61.5, 11, 2); }
      else beanie(g, 0, -57, SIDE[s]);
    }
    g.restore();
  }

  // ======================= STATO, TEMPO =======================
  const lt = G => { if (!G.guest) return G.time; if (U.tPrev !== G.time) { U.tPrev = G.time; U.tAt = now(); } return G.time + Math.min(0.5, now() - U.tAt); };
  const sideOf = (G, c) => G.chars.indexOf(c) === 1 ? 1 : 0;
  const PS = (G, c) => (G.st && G.st.p && G.st.p[sideOf(G, c)]) || {};
  const oppOf = (G, c) => G.chars.find(o => o !== c);
  const making = (G, s, T) => { const p = G.st.p[s]; return !!(p.mk && p.mk[0] > T); };
  const frozenS = (G, s, T) => { const st = G.st; if (!st || st.ph !== 'fight') return true; const p = st.p[s]; return !!p.d || making(G, s, T) || (p.stn || 0) > T; };

  // ======================= SUONI =======================
  const sfxOk = () => { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
  function swp(f0, f1, d, v, delay = 0, type = 'sine') {
    const A = sfxOk(); if (!A) return; const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(Math.min(0.5, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d + 0.02);
  }
  let NOISE = null;
  function noise(d, v, f, delay = 0, type = 'lowpass', q = 0.8) {
    const A = sfxOk(); if (!A) return;
    if (!NOISE || NOISE.sampleRate !== A.sampleRate) { NOISE = A.createBuffer(1, A.sampleRate, A.sampleRate); const ch = NOISE.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = A.currentTime + delay, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain();
    s.buffer = NOISE; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(Math.min(0.6, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(fl); fl.connect(g); g.connect(A.destination); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  const SFX = {
    throw: () => { noise(0.18, 0.06, 1800, 0, 'bandpass', 1.2); swp(500, 900, 0.12, 0.015, 0, 'triangle'); },
    lob: () => { noise(0.3, 0.05, 1200, 0, 'bandpass', 1); swp(400, 700, 0.25, 0.012, 0, 'triangle'); },
    plof: () => { noise(0.16, 0.16, 700); swp(180, 70, 0.14, 0.05); },
    hit: () => { noise(0.2, 0.2, 900); swp(320, 90, 0.2, 0.06, 0, 'triangle'); swp(700, 1100, 0.08, 0.03, 0.12, 'square'); },
    wall: () => { noise(0.22, 0.16, 500); noise(0.08, 0.06, 2500, 0.05, 'highpass'); },
    crash: () => { noise(0.9, 0.22, 320); noise(0.5, 0.12, 900, 0.1); swp(110, 40, 0.7, 0.08); },
    crunch: () => { for (let i = 0; i < 4; i++) noise(0.06, 0.06, 1400 + i * 200, i * 0.13, 'bandpass', 2); },
    draw: () => { noise(0.07, 0.03, 2200, 0, 'bandpass', 2); },
    gnome: () => { swp(900, 1600, 0.08, 0.03, 0, 'square'); swp(1300, 1900, 0.06, 0.025, 0.09, 'square'); },
    squeak: () => { swp(1800, 2600, 0.1, 0.03, 0, 'triangle'); swp(2600, 900, 0.25, 0.03, 0.1, 'triangle'); noise(0.2, 0.08, 900, 0.05); },
    dig: () => { swp(1500, 1200, 0.04, 0.025, 0, 'square'); noise(0.1, 0.06, 1800, 0.02, 'bandpass', 2); },
    roll: () => { noise(0.9, 0.06, 220); swp(90, 60, 0.8, 0.03); },
    slide: () => { noise(0.35, 0.06, 2600, 0, 'bandpass', 1.5); swp(700, 1300, 0.3, 0.015, 0, 'triangle'); },
    wind: () => { noise(2.4, 0.07, 500, 0, 'bandpass', 0.6); noise(2.0, 0.04, 1400, 0.4, 'bandpass', 1.2); },
    heart: () => { swp(70, 45, 0.12, 0.12, 0, 'sine'); swp(65, 40, 0.12, 0.09, 0.2, 'sine'); },
    whiz: () => { swp(2400, 600, 0.3, 0.04, 0, 'triangle'); noise(0.25, 0.05, 3000, 0, 'highpass'); },
    ice: () => { [1318, 1568, 1976, 2637].forEach((f, i) => swp(f, f, 0.18, 0.03, i * 0.07, 'triangle')); },
    jingle: () => { for (let i = 0; i < 8; i++) { swp(2200 + (i % 3) * 300, 2100 + (i % 3) * 300, 0.12, 0.018, i * 0.09, 'triangle'); swp(3300, 3200, 0.08, 0.01, i * 0.09 + 0.03, 'sine'); } },
    ram: () => { noise(0.4, 0.22, 260); swp(90, 40, 0.35, 0.1, 0, 'square'); noise(0.3, 0.1, 1200, 0.05); },
    igloo: () => { noise(0.3, 0.14, 600); swp(240, 120, 0.25, 0.04, 0, 'triangle'); },
    ok: () => { swp(660, 990, 0.12, 0.03, 0, 'triangle'); },
    no: () => { swp(300, 200, 0.15, 0.03, 0, 'square'); },
    reveal: () => { noise(1.4, 0.05, 4000, 0, 'highpass'); [523, 659, 784].forEach((f, i) => swp(f, f, 0.3, 0.03, 0.3 + i * 0.1, 'triangle')); },
    buried: () => { [523, 440, 349, 262].forEach((f, i) => swp(f, f * 0.96, 0.3, 0.04, i * 0.16, 'triangle')); noise(0.6, 0.1, 600, 0.2); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => swp(f, f, 0.25, 0.04, i * 0.12, 'triangle')); },
    lose: () => { [392, 330, 262].forEach((f, i) => swp(f, f * 0.97, 0.35, 0.04, i * 0.2, 'triangle')); },
    tick: () => swp(1200, 1100, 0.04, 0.02, 0, 'square')
  };

  // ======================= LA MANCHE (host) =======================
  function newRound(G, n, sc) {
    const first = n === 1, old = G.st;
    if (!first) {   // i pezzi crollati restano a terra (spariscono dal fortino); le crepe si richiudono
      const S = G.S, keep = []; G.wb.forEach((b, i) => { if (S && old && old.cs && old.wv === S.v && old.cs[S.bc[i]] <= 0) return; keep.push(b); }); G.wb = keep;
    }
    G.undo = {};
    const p = [0, 1].map(s => { const q = old && old.p ? old.p[s] : null, standing = G.wb.filter(b => b.o === s && b.as).length;
      return { nv: first ? NV0 : NV1, as: Math.max(0, ASSI - standing), rd: 0, b: 0, sk: 0, h: 0, d: 0, mk: null, lt: -9, sp: -9, stn: 0, sx: q ? q.sx : STOCK0[s][0], sy: q ? q.sy : STOCK0[s][1], ig: q && q.ig && q.ig[2] > 0 ? [q.ig[0], q.ig[1], IG_HP] : 0 }; });
    G.st = { n, ph: 'build', t0: r2(G.time), bt: first ? B_T0 : B_T1, sc: sc || {}, p, cs: [], wv: 0, B: [], bn: (old && old.bn) || 0, ev: [], en: (old && old.en) || 0, pl: PILES.map(() => PILE_N), pr: 0, say: null, gn: [] };
    G.gn = []; G.gnN = G.gnN || 0;
    if (G.tut) G.st.bt = 999;
    regeo(G);
    G.chars.forEach((c, i) => { const P = START[i % 2]; c.x = P[0]; c.y = P[1]; if (c === G.me) { cq.x = P[0]; cq.y = P[1]; } c.path = []; c.face = i ? -1 : 1; });   // anche G.me: il motore dopo start rimette cq su G.me
    G.botBuildAt = G.time + 2.5 + Math.random() * 3;
  }
  function ev(G, k, a, b, c, d, e) { const st = G.st; st.en++; st.ev.push([st.en, k, r2(a), r2(b), c, d, e]); if (st.ev.length > 16) st.ev.shift(); }
  function startFight(G) {
    const st = G.st;
    for (let s = 0; s < 2; s++) { const p = st.p[s]; p.sk = Math.min(STOCK_MAX, Math.floor(p.nv / 2)); if (G.tut && !charOf(G, s).bot) p.sk = Math.max(p.sk, 4); p.b = 2; p.rd = 1; }   // nel tutorial qualche palla nelle scorte c'e' sempre
    st.ph = 'reveal'; st.t0 = r2(G.time);
  }
  // un colpo arriva su un muro: la campata perde un po' di salute; a zero cade tutta insieme
  function hitWall(G, n, x, y, dmg = 1) {
    const S = G.S, st = G.st, c = S.bc[n]; if (st.cs[c] <= 0) return;
    st.cs[c] = Math.max(0, st.cs[c] - dmg);
    if (st.cs[c] <= 0) ev(G, 'cr', x, y, c, S.camp[c].b.length); else ev(G, 'w', x, y, c);
  }
  function hitPlayer(G, s, x, y, from) {
    const st = G.st, p = st.p[s]; if (p.d) return;
    const dmg2 = stormOn(G, G.time) ? 2 : 1; p.h = Math.min(HITS, p.h + dmg2); p.mk = null; p.stn = r2(G.time + 0.35);
    if (riding(G, s)) { st.sl = { ph: "x" }; ev(G, "sx", x, y, s); }   // colpito sullo slittino: cade e lo slittino si rompe
    if (p.h >= HITS) { p.d = 1; ev(G, 'bu', x, y, s); if (st.ph === 'fight') { st.ph = 'down'; st.t0 = r2(G.time); st.win = 1 - s; } }
    else ev(G, 'h', x, y, s, from, dmg2);
  }
  const riding = (G, s) => { const sl = G.st && G.st.sl; return !!(sl && sl.ph === 'r' && sl.s === s); };
  function throwFrom(G, s, ty, tx, tyy) {
    const st = G.st, T = G.time, p = st.p[s], c = charOf(G, s), P = posOf(G, c), rd = riding(G, s); if (!st || st.ph !== 'fight' || p.d || (rd ? st.sl.am <= 0 : p.b <= 0) || making(G, s, T) || T - p.lt < (rd ? SLED_CD : CD) || (p.stn || 0) > T) return false;
    let dx = tx - P.x, dy = tyy - P.y, d = Math.hypot(dx, dy); if (d < 0.3) return false;
    const RM = ty === 'd' ? RMAX_D : RMAX_L; if (d > RM) { dx *= RM / d; dy *= RM / d; d = RM; } if (d < RMIN) { dx *= RMIN / d; dy *= RMIN / d; d = RMIN; }
    const ice = !rd && !!p.ice; if (ice) p.ice = 0; const kv = (stormOn(G, T) ? 1.3 : 1) * (ice ? 1.6 : 1);
    const dur = ty === 'd' ? d / (V_D * kv) : Math.max(0.6, d / (V_L * kv));
    if (rd) st.sl.am--; else p.b--; p.lt = r2(T); if (ty === 'd') p.sp = r2(T);
    if (!c.bot && !G.tut && G.chars.some(o => o.bot && !o.remote)) { const M = piMem(); if (ty === 'l') M.lob++; else M.dr++; }
    st.bn++; st.B.push([st.bn, s, ty, r2(P.x), r2(P.y), r2(P.x + dx), r2(P.y + dy), r2(T), r2(dur), 0, ice ? 99 : rd ? 2 : 1]);   // 99 = palla di ghiaccio: la campata che prende crolla tutta   // [9] gnomo, [10] danno ai muri (palla grossa del cannone = 2)
    ev(G, ty === 'd' ? 'td' : 'tl', P.x, P.y, s);
    return true;
  }
  const ballZ = (ty, u, d) => ty === 'd' ? 1.15 + 0.22 * Math.sin(Math.PI * u) - 1.1 * Math.pow(u, 5) : 1.1 * (1 - u) + 4 * (1 + d * 0.32) * u * (1 - u);
  // il tiro dritto: il primo muro (vivo) sulla strada, ignorando quelli dove ti sporgi tu (LEAN) e quelli dove si sporge l'altro
  function dritIgnore(G, B) {
    const S = G.S, x0 = B[3], y0 = B[4], o = 1 - B[1], q = G.st.p[o], Q = posOf(G, charOf(G, o)), sp = G.time - (q.sp || -9) < SPORTO;
    return n => { const b = S.bl[n]; return Math.hypot(b.x - x0, b.y - y0) < LEAN || (sp && Math.hypot(b.x - Q.x, b.y - Q.y) < LEAN); };
  }
  function traceWall(G, x0, y0, x1, y1, skip) {   // per la mira (anche sul telefono dell'amico): dove si ferma un tiro dritto
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 0.14));
    for (let i = 1; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, k = blockAt(G, x, y, 0.04, skip); if (k >= 0) return { n: k, u, x, y }; }
    return null;
  }
  function ballTick(G) {
    const st = G.st, T = G.time, S = G.S;
    for (const B of st.B.slice()) {
      const [, s, ty, x0, y0, x1, y1, t0, dur] = B, u1 = Math.min(1, (T - t0) / dur), u0 = G.bu.get(B[0]) || 0, o = 1 - s, oc = charOf(G, o), Q = posOf(G, oc), oq = st.p[o];
      const gone = () => { st.B = st.B.filter(b => b !== B); G.bu.delete(B[0]); };
      const canHit = !oq.d && !(oc.remote && cqLagging(oc));
      if (ty === 'd') {
        const skip = dritIgnore(G, B), d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil((u1 - u0) * d / 0.12)); let done = false;
        for (let i = 1; i <= n && !done; i++) {
          const u = u0 + (u1 - u0) * i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
          if (canHit && Math.hypot(Q.x - x, Q.y - y) < 0.42) { hitPlayer(G, o, x, y, s); if (!B[9]) streak(G, s); gone(); done = true; break; }
          if (ballOnGnome(G, s, x, y, 0.08)) { if (!B[9]) streak(G, s); gone(); done = true; break; }
          const ig = iglooOf(G, o); if (ig && Math.hypot(ig[0] - x, ig[1] - y) < IG_R) { igHit(G, o, x, y, B[10] === 99 ? 2 : B[10] || 1); gone(); done = true; break; }
          const k = blockAt(G, x, y, 0.04, skip); if (k >= 0) { hitWall(G, k, x, y, B[10] || 1); gone(); done = true; break; }
        }
        if (done) continue;
      }
      G.bu.set(B[0], u1);
      if (u1 < 1) continue;
      gone();
      if (canHit && Math.hypot(Q.x - x1, Q.y - y1) < (ty === 'd' ? 0.45 : 0.62)) { hitPlayer(G, o, x1, y1, s); if (!B[9]) streak(G, s); continue; }
      if (ballOnGnome(G, s, x1, y1, ty === 'd' ? 0.12 : 0.3)) { if (!B[9]) streak(G, s); continue; }
      if (ty === 'l') { const ig = iglooOf(G, o); if (ig && Math.hypot(ig[0] - x1, ig[1] - y1) < IG_R + 0.12) { igHit(G, o, x1, y1, B[10] === 99 ? 2 : B[10] || 1); continue; } const k = blockAt(G, x1, y1, 0.22); if (k >= 0) { hitWall(G, k, x1, y1, B[10] || 1); continue; } }
      ev(G, 'p', x1, y1, s);
      void S;
    }
  }
  // FARE LE PALLE: chinati 1 s sulla neve fresca (dal mucchio delle scorte piu' in fretta; grattando il proprio muro lo indebolisci)
  function srcFor(G, s, wallOnly) {
    const st = G.st, p = st.p[s], P = posOf(G, charOf(G, s));
    if (wallOnly) { const k = blockAt(G, P.x, P.y, 0.62, null, s); return k >= 0 ? ['w', k] : null; }   // mani piene: si puo' solo grattare il muro (per uscire se ti sei chiuso dentro)
    if (p.sk > 0 && Math.hypot(P.x - p.sx, P.y - p.sy) < 1.3) return ['s', 0];
    let bi = -1, bd = 1.4; PILES.forEach(([x, y], i) => { const d = Math.hypot(P.x - x, P.y - y); if (st.pl[i] > 0 && d < bd) { bd = d; bi = i; } }); if (bi >= 0) return ['p', bi];
    const k = blockAt(G, P.x, P.y, 0.62, null, s); if (k >= 0) return ['w', k];
    return null;
  }
  function startMake(G, s) {
    const st = G.st, T = G.time, p = st.p[s]; if (!st || st.ph !== 'fight' || p.d || making(G, s, T) || (p.stn || 0) > T || riding(G, s)) return false;
    const src = srcFor(G, s, p.b >= HAND); if (!src) return false;
    p.mk = [r2(T + MK[src[0]]), src[0], src[1]]; ev(G, 'mk', 0, 0, s, src[0]); return true;
  }
  function makeTick(G) {
    const st = G.st, T = G.time;
    for (let s = 0; s < 2; s++) { const p = st.p[s]; if (!p.mk || p.mk[0] > T) continue; const [, k, ref] = p.mk; p.mk = null;
      if (k === 's') { if (p.sk <= 0) continue; p.sk--; }
      else if (k === 'p') { if (st.pl[ref] <= 0) continue; st.pl[ref]--; }
      else if (k === 'w') { if (!live(G, ref)) continue; const b = G.S.bl[ref]; hitWall(G, ref, b.x, b.y); }
      p.b = Math.min(HAND, p.b + 1);
    }
    { const so = stormOn(G, T); if (T - (st.pr || 0) > (so ? 2 : PILE_RG)) { st.pr = r2(T); st.pl = st.pl.map(v => Math.min(so ? PILE_MAX + 2 : PILE_MAX, v + 1)); } }
  }
  // ======================= IL FORTINO NASCONDE (su ogni telefono, e per Pierino) =======================
  // Chi sta fermo (o cammina piano) subito dietro un muro non si vede da lontano: si vede solo dove era. Correre, tirare dritto (ti sporgi) o stare allo scoperto ti mostrano.
  function coveredFrom(G, vx, vy, P) {
    const dx = vx - P.x, dy = vy - P.y, d = Math.hypot(dx, dy); if (d < 2.4) return false;
    for (let k = 0.3; k <= 1.35; k += 0.15) { const x = P.x + dx / d * k, y = P.y + dy / d * k; if (blockAt(G, x, y, 0.03) >= 0) return true; }
    return false;
  }
  const spdOf = (G, c) => { const v = U.vel[c.id]; return v ? v.v : 0; };
  function hiddenFrom(G, vs, c) {
    const st = G.st; if (!st || st.ph !== 'fight' || !G.S) return false; const s = sideOf(G, c), p = st.p[s], T = lt(G);
    if (s === vs || p.d || riding(G, s) || T - (p.sp || -9) < SPORTO + 0.2 || T - (p.lt || -9) < 0.45 || spdOf(G, c) > HIDE_V) return false;
    const V = posOf(G, G.chars[vs]); return coveredFrom(G, V.x, V.y, posOf(G, c));
  }
  function velTick(G, dt) {   // velocita' di ognuno (lisciata) su questo telefono
    if (!(dt > 0)) return;
    for (const c of G.chars) { const P = posOf(G, c), v = U.vel[c.id] || (U.vel[c.id] = { x: P.x, y: P.y, v: 0 }); const sp = Math.hypot(P.x - v.x, P.y - v.y) / dt; v.v = v.v * 0.8 + Math.min(8, sp) * 0.2; v.x = P.x; v.y = P.y;
      if (c !== G.me) { if (!hiddenFrom(G, mySide(G), c)) U.seen[c.id] = { x: P.x, y: P.y, t: now(), h: 0 }; else if (U.seen[c.id]) U.seen[c.id].h = 1; } }
  }

  // ======================= GLI GNOMI (host) =======================
  // Nascono dall'igloo (costano palle in mano), un tocco sceglie il bersaglio (se no lo scelgono loro), poi si arrangiano. Un colpo e sono fuori.
  const homeDir = s => s ? 1 : -1;
  const gnAlive = (G, s) => G.gn.filter(g => g.s === s).length;
  function spawnGnome(G, s, ty, tx, tyy) {
    const st = G.st, T = G.time, p = st.p[s], ig = iglooOf(G, s), D = GN[ty]; if (!D || !ig || st.ph !== 'fight' || p.d || p.b < D.cost || gnAlive(G, s) >= GN_MAX) return false;
    let x = ig[0] - homeDir(s) * 0.9, y = ig[1];
    if (!freeAt(G, x, y)) { for (const [a, b] of [[0, 0.9], [0, -0.9], [homeDir(s) * 0.9, 0], [-homeDir(s) * 0.7, 0.7], [-homeDir(s) * 0.7, -0.7]]) if (freeAt(G, ig[0] + a, ig[1] + b)) { x = ig[0] + a; y = ig[1] + b; break; } }
    p.b -= D.cost;
    const g = { id: ++G.gnN, s, ty, x, y, st: 0, t0: T, tx: tx != null && isFinite(tx) ? +tx : null, ty2: tyy != null && isFinite(tyy) ? +tyy : null, r: ty === 'r' ? 0.28 : 0, a: s ? Math.PI : 0, nb: ty === 'c' ? 3 : 0, wt: 0.6, path: [], tg: -1 };
    G.gn.push(g); ev(G, 'gs', x, y, s, ty); return true;
  }
  function killGnome(G, g, k) { G.gn = G.gn.filter(o => o !== g); ev(G, k || 'gk', g.ty === 'r' && g.st === 2 ? g.bx : g.x, g.ty === 'r' && g.st === 2 ? g.by : g.y, g.s, g.ty); }
  function gStep(g, dt, sp) {
    const q = g.path[0]; if (!q) return true; const dx = q[0] - g.x, dy = q[1] - g.y, d = Math.hypot(dx, dy), st = CQ_SPEED * sp * dt;
    if (d <= st) { g.x = q[0]; g.y = q[1]; g.path.shift(); } else { g.x += dx / d * st; g.y += dy / d * st; } if (d > 0.01) g.a = Math.atan2(dy, dx); return !g.path.length;
  }
  function gGo(g, x, y) { const p = cqPath(g.x, g.y, x, y); if (p.length) { p[p.length - 1] = [x, y]; g.path = p; } else g.path = Math.hypot(x - g.x, y - g.y) < 1.6 ? [[x, y]] : []; return g.path.length > 0; }
  function igHit(G, s, x, y, dmg = 1) { const ig = iglooOf(G, s); if (!ig) return; ig[2] = Math.max(0, ig[2] - dmg); ev(G, ig[2] <= 0 ? 'ix' : 'ih', x, y, s); }
  // dove si mette il picconatore per scavare un blocco: dalla parte di fuori (verso casa sua)
  function digSpot(G, g, n) { const S = G.S, b = S.bl[n], off = (S.pil[n] ? 0.22 : b.k === 2 ? TH2 : TH1) + 0.5; let nx = -Math.sin(b.a), ny = Math.cos(b.a); if (S.pil[n] || Math.abs(nx) < 0.2) { nx = homeDir(g.s); ny = 0; } else if (nx * homeDir(g.s) < 0) { nx = -nx; ny = -ny; } return [b.x + nx * off, b.y + ny * off]; }
  function pickDig(G, g) {
    const S = G.S, o = 1 - g.s, want = g.tx != null ? [g.tx, g.ty2] : null; let best = -1, bs = -1e9;
    for (let n = 0; n < S.bl.length; n++) { const b = S.bl[n]; if (b.o !== o || !live(G, n)) continue; const c = S.camp[S.bc[n]];
      let sc = want ? -Math.hypot(b.x - want[0], b.y - want[1]) * 3 : c.b.length * 1.2 - salOf(G, n) * 0.6 - Math.abs(b.x - MID) * 0.5;
      sc -= Math.hypot(b.x - g.x, b.y - g.y) * 0.08; if (sc <= bs) continue;
      const [x, y] = digSpot(G, g, n); if (!freeAt(G, x, y)) continue; bs = sc; best = n; }
    return best;
  }
  // il ROTOLONE parte dal davanti del suo fortino e rotola dritto: scelta del bersaglio (di petto, se puo') e del punto di partenza
  function launchFor(G, g) {
    const S = G.S, o = 1 - g.s, X = g.s ? 19.0 : 11.0, free = (x, y) => { for (const d of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) if (freeAt(G, x, y + d)) return [x, y + d]; return null; };
    if (g.tx != null) { const L = free(X, Math.max(1.8, Math.min(16.2, g.ty2))); return L ? { L, T: [g.tx, g.ty2] } : null; }
    let best = null, bs = -1e9;
    for (let n = 0; n < S.bl.length; n++) { const b = S.bl[n]; if (b.o !== o || !live(G, n) || S.pil[n]) continue; const L = free(X, Math.max(1.8, Math.min(16.2, b.y))); if (!L) continue;
      const dx = b.x - L[0], dy = b.y - L[1], l = Math.hypot(dx, dy) || 1, inc = Math.acos(Math.min(1, Math.abs((dx * Math.cos(b.a) + dy * Math.sin(b.a)) / l))), c = S.camp[S.bc[n]];
      const sc = (inc > GLANCE + 0.1 ? 3 : -3) + c.b.length * 0.4 - salOf(G, n) * 0.3 - l * 0.05 + Math.random() * 0.5; if (sc > bs) { bs = sc; best = { L, T: [b.x, b.y] }; } }
    if (!best) { const Q = posOf(G, charOf(G, o)), L = free(X, Math.max(1.8, Math.min(16.2, Q.y))); if (L) best = { L, T: [Q.x, Q.y] }; }
    return best;
  }
  function gnomeThrow(G, g, ty, x, y) {
    const st = G.st, d = Math.hypot(x - g.x, y - g.y), dur = ty === 'd' ? d / V_D : Math.max(0.75, d / V_L);
    st.bn++; st.B.push([st.bn, g.s, ty, r2(g.x), r2(g.y), r2(x), r2(y), r2(G.time), r2(dur), 1]); ev(G, ty === 'd' ? 'td' : 'tl', g.x, g.y, g.s);
  }
  function rollTick(G, g, dt) {
    const S = G.S, st = G.st, o = 1 - g.s, T = G.time, step = ROLL_V * dt;
    g.bx += g.dx * step; g.by += g.dy * step; g.trav += step; g.r = Math.min(0.78, 0.28 + 0.045 * g.trav); g.a = Math.atan2(g.dy, g.dx);
    g.x = g.bx - g.dx * (g.r + 0.22); g.y = g.by - g.dy * (g.r + 0.22);
    const cx = Math.floor(g.bx), cy = Math.floor(g.by), fl = cqFloor[cy] && cqFloor[cy][cx], sol = cqSolid[cy] && cqSolid[cy][cx];
    if (!fl || (sol && !sol.soft) || g.trav > 21) { killGnome(G, g, 'rb'); return; }
    const oc = charOf(G, o), Q = posOf(G, oc); if (!st.p[o].d && !(oc.remote && cqLagging(oc)) && Math.hypot(Q.x - g.bx, Q.y - g.by) < g.r + 0.3) { hitPlayer(G, o, Q.x, Q.y, g.s); killGnome(G, g, 'rb'); return; }
    for (const e of G.gn.slice()) if (e.s !== g.s && Math.hypot((e.st === 2 ? e.bx : e.x) - g.bx, (e.st === 2 ? e.by : e.y) - g.by) < g.r + 0.25 + (e.r || 0)) killGnome(G, e);
    const ig = iglooOf(G, o); if (ig && Math.hypot(ig[0] - g.bx, ig[1] - g.by) < g.r + IG_R) { igHit(G, o, g.bx, g.by, 2); killGnome(G, g, 'rb'); return; }
    const seen = new Set();
    for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) { const L = S.hash.get(yy * W + xx); if (!L) continue;
      for (const n of L) { if (seen.has(n)) continue; seen.add(n); if (!live(G, n)) continue; const c = S.bc[n]; if (g.skipC === c && T < g.skipT) continue;
        const half = S.pil[n] ? 0.22 : S.bl[n].k === 2 ? TH2 : TH1; if (bDist(S, n, g.bx, g.by) >= g.r + half) continue;
        const b = S.bl[n], ux = Math.cos(b.a), uy = Math.sin(b.a), dot = g.dx * ux + g.dy * uy, inc = Math.acos(Math.min(1, Math.abs(dot)));
        if (!S.pil[n] && inc < GLANCE) {   // DI STRISCIO: scivola lungo il muro
          const sg = dot >= 0 ? 1 : -1; g.dx = ux * sg; g.dy = uy * sg; g.r *= 0.93; g.trav = (g.r - 0.28) / 0.045; g.skipC = c; g.skipT = T + 0.6; ev(G, 'rs', g.bx, g.by, g.s); return;
        }
        const dmg = Math.min(5, 1 + Math.round((g.r - 0.28) / 0.12));   // DI PETTO: sfonda (piu' e' grossa, piu' fa danno)
        hitWall(G, n, g.bx, g.by, dmg);
        if (st.cs[c] <= 0 && g.r > 0.5) { g.r *= 0.6; g.trav = (g.r - 0.28) / 0.045; g.skipC = c; g.skipT = T + 1; return; }
        killGnome(G, g, 'rb'); return;
      } }
  }
  function gnomeTick(G, dt) {
    const st = G.st, T = G.time;
    for (const g of G.gn.slice()) {
      if (!G.gn.includes(g)) continue;
      const o = 1 - g.s, oc = charOf(G, o), Q = posOf(G, oc);
      if (T - g.t0 > GN_LIFE && g.st !== 2) g.st = 3;
      if (g.st === 3) {   // torna a casa e sparisce
        const ig = st.p[g.s].ig || [START[g.s][0], START[g.s][1]];
        if (!g.path.length && !g.home) { g.home = 1; if (!gGo(g, ig[0] - homeDir(g.s) * 0.9, ig[1])) { killGnome(G, g, 'gh'); continue; } }
        gStep(g, dt, GN[g.ty].sp); if (!g.path.length || T - g.t0 > GN_LIFE + 12) killGnome(G, g, 'gh'); continue;
      }
      if (g.ty === 'p') {
        if (g.tg < 0 || !live(G, g.tg)) { g.tg = pickDig(G, g); g.path = []; g.st = 0; if (g.tg < 0) { g.st = 3; continue; } }
        const [sx, sy] = digSpot(G, g, g.tg);
        if (Math.hypot(sx - g.x, sy - g.y) > 0.25) { g.st = 0; if (!g.path.length && !gGo(g, sx, sy)) { g.tx = null; g.tg = -1; g.fail = (g.fail || 0) + 1; if (g.fail > 4) g.st = 3; continue; } gStep(g, dt, GN.p.sp); continue; }
        const b = G.S.bl[g.tg]; g.st = 1; g.a = Math.atan2(b.y - g.y, b.x - g.x); g.wt -= dt;
        if (g.wt <= 0) { g.wt = DIG_T; hitWall(G, g.tg, b.x, b.y, 1); ev(G, 'gd', b.x, b.y, g.s); }
        continue;
      }
      if (g.ty === 'c') {
        if (g.nb <= 0 || st.p[o].d) { g.st = 3; continue; }
        const d = Math.hypot(Q.x - g.x, Q.y - g.y); g.wt -= dt;
        const clear = d < SNIPE_R && !traceWall(G, g.x, g.y, Q.x, Q.y, null) && !hiddenFrom(G, g.s, oc);
        if (clear) { g.st = 1; g.path = []; g.a = Math.atan2(Q.y - g.y, Q.x - g.x); if (g.wt <= 0) { g.wt = SNIPE_T; g.nb--; const e = 0.25 + d * 0.04; gnomeThrow(G, g, 'd', Q.x + (Math.random() - 0.5) * e * 2, Q.y + (Math.random() - 0.5) * e * 2); } continue; }
        g.st = 0;
        if (!g.path.length || T - (g.pt || 0) > 1.4) { g.pt = T; const ok = gGo(g, Q.x, Q.y); if (!ok && d < RMAX_L && g.wt <= 0) { g.wt = SNIPE_T * 1.4; g.nb--; gnomeThrow(G, g, 'l', Q.x + (Math.random() - 0.5) * 1.2, Q.y + (Math.random() - 0.5) * 1.2); } }
        gStep(g, dt, GN.c.sp); continue;
      }
      if (g.ty === 'r') {
        if (g.st === 2) { rollTick(G, g, dt); continue; }
        if (!g.plan) { g.plan = launchFor(G, g); if (!g.plan) { killGnome(G, g, 'gh'); continue; } gGo(g, g.plan.L[0], g.plan.L[1]); }
        if (Math.hypot(g.plan.L[0] - g.x, g.plan.L[1] - g.y) > 0.2 && g.path.length) { gStep(g, dt, GN.r.sp); continue; }
        if (Math.hypot(g.plan.L[0] - g.x, g.plan.L[1] - g.y) > 0.6) { if (!gGo(g, g.plan.L[0], g.plan.L[1])) { g.plan = null; g.fail = (g.fail || 0) + 1; if (g.fail > 3) killGnome(G, g, 'gh'); } continue; }
        const dx = g.plan.T[0] - g.x, dy = g.plan.T[1] - g.y, l = Math.hypot(dx, dy) || 1; g.dx = dx / l; g.dy = dy / l; g.st = 2; g.trav = 0; g.r = 0.28; g.bx = g.x + g.dx * 0.5; g.by = g.y + g.dy * 0.5; ev(G, 'gr', g.x, g.y, g.s);
      }
    }
    st.gn = G.gn.map(g => [g.id, g.s, g.ty, r2(g.st === 2 ? g.bx : g.x), r2(g.st === 2 ? g.by : g.y), g.st, r2(g.r || 0), r2(g.a || 0)]);
  }
  // una palla (o un rotolone) contro gli gnomi dell'altro
  function ballOnGnome(G, s, x, y, rad) {
    for (const g of G.gn) { if (g.s === s) continue;
      if (g.ty === 'r' && g.st === 2) { if (Math.hypot(g.bx - x, g.by - y) < g.r + rad) { g.r -= 0.22; g.trav = Math.max(0, (g.r - 0.28) / 0.045); if (g.r < 0.3) killGnome(G, g); else ev(G, 'rh', g.bx, g.by, g.s); return true; } }
      else if (Math.hypot(g.x - x, g.y - y) < 0.3 + rad) { killGnome(G, g); return true; } }
    return false;
  }

  // ======================= LO SLITTINO-ARIETE =======================
  function sledTick(G) {
    const st = G.st, T = G.time;
    if (SLED_ON && !st.sl && T - st.t0 > SLED_AT && !tutOn(G)) { st.sl = { ph: 'w', x: SLED_POS[0], y: SLED_POS[1], t0: r2(T) }; ev(G, 'sa', SLED_POS[0], SLED_POS[1], -1); return; }
    const sl = st.sl; if (!sl || sl.ph !== 'r') return;
    if (T - sl.t0 > SLED_T) { const P = posOf(G, charOf(G, sl.s)); st.sl = { ph: 'x' }; ev(G, 'sx', P.x, P.y, sl.s); return; }
    // TRAVOLTO: chi sta davanti allo slittino prende un colpo
    const o = 1 - sl.s, oc = charOf(G, o), P = posOf(G, charOf(G, sl.s)), Q = posOf(G, oc);
    if (!st.p[o].d && !(oc.remote && cqLagging(oc)) && Math.hypot(P.x - Q.x, P.y - Q.y) < 0.75 && T - (sl.run || -9) > 1.5) {
      sl.run = r2(T); let dx = Q.x - P.x, dy = Q.y - P.y, l = Math.hypot(dx, dy); if (l < 0.05) { dx = sl.s ? -1 : 1; dy = 0; l = 1; } dx /= l; dy /= l;
      ev(G, 'run', Q.x, Q.y, sl.s, Math.round(dx * 100), Math.round(dy * 100)); hitPlayer(G, o, Q.x, Q.y, sl.s);
      if (oc === G.me) knock(G, cq, dx, dy); else if (!oc.remote) { knock(G, oc, dx, dy); oc.path = []; }   // l'amico si sposta da solo quando riceve l'evento
    }
    for (const g of G.gn.slice()) if (g.s === o && Math.hypot(g.x - P.x, g.y - P.y) < 0.7) killGnome(G, g);
    { const ig = iglooOf(G, o); if (ig && Math.hypot(ig[0] - P.x, ig[1] - P.y) < IG_R + 0.6 && T - (sl.ri || -9) > 0.8) { sl.ri = r2(T); igHit(G, o, ig[0], ig[1], 2); } }
  }
  // sbalzato via di KNOCK caselle a piccoli passi (si ferma contro i muri)
  function knock(G, o, dx, dy, dist = 1.4) { for (let k = 0; k < dist; k += 0.1) { const nx = o.x + dx * 0.1, ny = o.y + dy * 0.1; if (!freeAt(G, nx, ny)) break; o.x = nx; o.y = ny; } }
  function mountSled(G, s) {
    const st = G.st, sl = st.sl, p = st.p[s], P = posOf(G, charOf(G, s)); if (st.ph !== 'fight' || !sl || sl.ph !== 'w' || p.d || Math.hypot(P.x - sl.x, P.y - sl.y) > 1.3) return false;
    p.mk = null; st.sl = { ph: 'r', s, t0: r2(G.time), am: SLED_AM }; ev(G, 'sm', P.x, P.y, s);
    { const c = charOf(G, s), b = G.chars.find(o => o.bot && !o.remote); if (!c.bot && b && !G.tut) piMem().sled++; else if (c === b && !G.tut && Math.random() < 0.7) G.st.say = { id: b.id, t: r2(G.time), x: 'Brum brum! 🛷 Arrivo!' }; }
    return true;
  }
  // SPINGI lo slittino contro un muro nemico: di petto lo sfonda (RAM_DMG), di striscio scivola via
  function ram(G, s, n, dx, dy) {
    const S = G.S, T = G.time; if (!riding(G, s) || !S || n == null || n < 0 || n >= S.bl.length || !live(G, n) || S.bl[n].o === s) return false;
    const b = S.bl[n], P = posOf(G, charOf(G, s)); if (Math.hypot(b.x - P.x, b.y - P.y) > 1.1) return false;
    G.ramT = G.ramT || {}; if (T - (G.ramT[s] || -9) < 0.6) return false; G.ramT[s] = T;
    const l = Math.hypot(dx, dy) || 1, inc = Math.acos(Math.min(1, Math.abs((dx * Math.cos(b.a) + dy * Math.sin(b.a)) / l)));
    if (!S.pil[n] && inc < GLANCE) { ev(G, 'rs', b.x, b.y, s); return false; }
    ev(G, 'ram', b.x, b.y, s); hitWall(G, n, b.x, b.y, RAM_DMG); return true;
  }
  // sul telefono di chi guida: se spingo col dito contro un muro nemico e non mi muovo, e' un colpo d'ariete
  function rideTick(G, dt) {
    const s = mySide(G); if (!G.st || G.st.ph !== 'fight' || !riding(G, s) || !G.S) { U.rl = null; return; }
    const d = cqDir(), last = U.rl; U.rl = { x: cq.x, y: cq.y }; if (!d || !last || !(dt > 0)) return;
    const moved = Math.hypot(cq.x - last.x, cq.y - last.y), want = CQ_SPEED * SLED_SP * dt; if (moved > want * 0.45) return;
    const l = Math.hypot(d.wx, d.wy) || 1, ux = d.wx / l, uy = d.wy / l, n = blockAt(G, cq.x + ux * 0.62, cq.y + uy * 0.62, 0.15, null, 1 - s); if (n < 0) return;
    if (now() - (U.ramT || 0) < 0.6) return; U.ramT = now();
    if (G.guest) cqNetSend({ k: 'ram', n, dx: r2(ux), dy: r2(uy) }); else ram(G, s, n, ux, uy);
  }
  // Pierino sullo slittino: punta dritto verso di te, sfonda quello che trova, spara con il cannone
  function botRide(G, c, dt) {
    const st = G.st, s = sideOf(G, c), o = oppOf(G, c), Q = posOf(G, o), T = G.time; let dx = Q.x - c.x, dy = Q.y - c.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    if (st.sl.am > 0 && T - st.p[s].lt > SLED_CD + 0.3 && d < RMAX_D && !traceWall(G, c.x, c.y, Q.x, Q.y, n => Math.hypot(G.S.bl[n].x - c.x, G.S.bl[n].y - c.y) < LEAN) && !hiddenFrom(G, s, o)) throwFrom(G, s, 'd', Q.x, Q.y);
    if (c.rideA != null && T < (c.rideT || 0)) { dx = Math.cos(c.rideA); dy = Math.sin(c.rideA); }
    const step = CQ_SPEED * 1.6 * dt, nx = c.x + dx * step, ny = c.y + dy * step;
    if (freeAt(G, nx, ny)) { c.x = nx; c.y = ny; c.walk += dt * 10; if (Math.abs(dx - dy) > 0.01) c.face = dx - dy > 0 ? 1 : -1; return; }
    const n = blockAt(G, c.x + dx * 0.62, c.y + dy * 0.62, 0.15, null, 1 - s);
    if (n >= 0 && ram(G, s, n, dx, dy)) return;
    if (T >= (c.rideT || 0)) { c.rideA = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.7); c.rideT = T + 0.6 + Math.random() * 0.5; }
  }

  // TORMENTA FINALE: gli ultimi STORM secondi della battaglia (non nel tutorial)
  const stormOn = (G, T) => !!(G.st && G.st.ph === 'fight' && !tutOn(G) && T - G.st.t0 > FIGHT - STORM);
  // RAFFICA: colpi di fila (persone o gnomi) entro RAF_T s l'uno dall'altro; al terzo, palla di ghiaccio
  function streak(G, s) {
    const p = G.st.p[s], T = G.time, P = posOf(G, charOf(G, s)); p.rf = T - (p.rfT || -99) < RAF_T ? (p.rf || 0) + 1 : 1; p.rfT = r2(T);
    if (p.rf >= 3) { p.rf = 0; p.ice = 1; ev(G, 'ice', P.x, P.y, s); } else if (p.rf === 2) ev(G, 'rf2', P.x, P.y, s);
  }
  // sensazioni sul mio telefono: fischio quando una palla ti sfiora, cuore quando ti resta un colpo, vento della tormenta
  function feelTick(G) {
    const st = G.st, t = now(); if (!st || st.ph !== 'fight') { U.nm = {}; U.storm = 0; return; }
    const s = mySide(G), T = lt(G), p = st.p[s]; U.nm = U.nm || {}; const alive = new Set();
    for (const B of st.B || []) { if (B[1] === s) continue; alive.add(String(B[0])); const u = Math.max(0, Math.min(1, (T - B[7]) / B[8])), x = B[3] + (B[5] - B[3]) * u, y = B[4] + (B[6] - B[4]) * u, d = Math.hypot(x - cq.x, y - cq.y), m = U.nm[B[0]]; U.nm[B[0]] = m == null ? d : Math.min(m, d); }
    for (const id in U.nm) if (!alive.has(id)) { if (U.nm[id] < 1.0 && t - (U.hitT || 0) > 0.6 && !p.d) { SFX.whiz(); U.fx.push({ k: 'txt', x: cq.x, y: cq.y, t, s: '💨 di un soffio!', c: '#dfe8ff' }); } delete U.nm[id]; }
    const so = stormOn(G, T);
    if (!p.d && (p.h >= HITS - 1 || (so && p.h >= HITS - 2)) && t - (U.hbT || 0) > 0.85) { U.hbT = t; SFX.heart(); }
    if (so) { if (!U.storm) { U.storm = 1; SFX.wind(); U.shake = t; } if (t - (U.wT || 0) > 2.6) { U.wT = t; SFX.wind(); } } else U.storm = 0;
  }

  function roundEnd(G, win, why) {
    const st = G.st; st.sc = st.sc || {}; if (win >= 0) st.sc[win] = (st.sc[win] || 0) + 1;
    st.ph = 'mres'; st.t0 = r2(G.time); st.win = win; st.B = []; st.gn = []; G.gn = [];
    const a = G.chars[0], b = G.chars[1], s = i => st.sc[i] || 0;
    st.msg = (win >= 0 ? '🏆 Manche a ' + G.chars[win].name + '!' : '🤝 Manche pari!') + '\n' + why + '\n' + a.name + ' ' + s(0) + ' – ' + s(1) + ' ' + b.name;
    st.fin = s(0) >= WINS || s(1) >= WINS || st.n >= MAXR || G.tut ? 1 : 0;
    piLearnRound(G, win);
    const bot = G.chars.find(c => c.bot && !c.remote); if (bot && !G.tut) say(G, bot, win === sideOf(G, bot) ? 'win' : win >= 0 ? 'lose' : 'start');
  }
  function finalEnd(G) {
    const st = G.st, a = G.chars[0], b = G.chars[1], s = i => st.sc[i] || 0, w = s(0) > s(1) ? a : s(1) > s(0) ? b : null;
    { const bot = G.chars.find(c => c.bot && !c.remote); if (bot && !G.tut && G.chars.every(c => c.bot || !c.remote)) { const M = piMem(); M.lv = Math.max(0.2, Math.min(1, M.lv + (w === bot ? -0.1 : w ? 0.15 : 0))); saveStore(); } }   // vinci tu: Pierino si fa piu' forte; vince lui: piu' calmo
    cqModeEnd({ t: w ? '🏆 Vince ' + esc(w.name) + '!' : '🤝 Pari!', why: 'Manche ' + s(0) + ' – ' + s(1), rank: (w === b ? [b, a] : [a, b]).map(c => [c.name, s(sideOf(G, c)) + ' manche']), win: w ? [w.id] : [] });
  }

  // ======================= PIERINO DEL TERZO PIANO (computer) =======================
  const PI_LINES = {
    start: ['Il mio fortino è indistruttibile!', 'Ti seppellisco, vedrai.', 'Preparati a diventare un pupazzo!', 'Ho le mani gelate… ma la mira no.'],
    hit: ['PRESO! 😆', 'Ahah, dritto in faccia!', 'Un pupazzo in arrivo…'],
    ouch: ['Ahia! Era fredda!', 'Questa me la paghi!', 'Fortuna…'],
    wall: ['Il mio muro!', 'Nooo, la mia torre!'],
    win: ['Pupazzo! Pupazzo! ☃️', 'Il re del giardino sono io.', 'Torna quando sai tirare!'],
    lose: ['Uffa… rivincita!', 'Mi è entrata la neve nelle scarpe.', 'Non vale, avevo freddo.']
  };
  // PIERINO IMPARA (per dispositivo, store.settings.nevePi): quanto ti nascondi, se tiri piu' pallonetti o dritti, se corri allo slittino,
  // e quale dei suoi fortini funziona meglio contro di te. A inizio manche ti dice cosa ha capito e cambia gioco.
  const piMem = () => { const S = store.settings; if (!S.nevePi || typeof S.nevePi !== 'object' || !S.nevePi.fw) S.nevePi = { n: 0, hid: 0, tot: 0, lob: 0, dr: 0, sled: 0, fw: {} }; if (S.nevePi.lv == null) S.nevePi.lv = 0.3; return S.nevePi; };
  const piLv = G => G.tut ? 0.3 : (G.piLv != null ? G.piLv : (G.piLv = piMem().lv));
  function piRead() {
    const M = piMem(); if (M.n < 1 || M.tot < 120) return null; const hr = M.hid / M.tot, lr = M.lob / Math.max(1, M.lob + M.dr);
    if (hr > 0.4) return ['Ti nascondi sempre dietro i muri… stavolta ti mando un cecchino. 🎯', 'c'];
    if (M.lob + M.dr > 10 && lr > 0.65) return ['Tu tiri solo pallonetti. Io non sto fermo un secondo!', 'move'];
    if (M.lob + M.dr > 10 && lr < 0.3) return ['Tiri sempre dritto, eh? Io resto dietro al muro.', 'wall'];
    if (M.sled >= 2) return ['Lo slittino stavolta è MIO! 🛷', 'sled'];
    return M.n >= 3 && Math.random() < 0.5 ? ['Ho studiato il tuo modo di giocare… preparati.', null] : null;
  }
  function piLearnRound(G, win) {   // a fine manche: com'e' andato il suo fortino
    const bot = G.chars.find(c => c.bot && !c.remote); if (!bot || G.tut || !G.botFort) return; const M = piMem(), k = G.botFort.n;
    M.fw[k] = Math.max(-4, Math.min(4, (M.fw[k] || 0) + (win === sideOf(G, bot) ? 1 : win >= 0 ? -1 : 0))); M.n++; saveStore();
  }
  function say(G, c, k) { const L = PI_LINES[k]; G.st.say = { id: c.id, t: r2(G.time), x: L[Math.floor(Math.random() * L.length)] }; }
  const mx = (s, pts) => s ? pts.map(([x, y]) => [30 - x, y]) : pts;
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const L = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; L.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return L; };
  const FORTS = [
    { n: 'dritto', st: [['w', [[8.7, 5.4], [8.7, 12.6]]], ['w', [[8.7, 5.4], [8.7, 12.6]]], ['a', [[8.7, 7.4], [7.9, 7.4]]], ['a', [[8.7, 10.6], [7.9, 10.6]]]] },
    { n: 'zigzag', st: [['i', [[4.6, 11.6]]], ['w', [[8.1, 5.0], [9.3, 6.4], [8.1, 7.8], [9.3, 9.2], [8.1, 10.6], [9.3, 12.0], [8.1, 13.4]]], ['w', [[5.2, 7.0], [5.2, 9.6]]]] },
    { n: 'ferro', st: [['i', [[4.4, 9]]], ['w', arc(6.2, 9, 3.4, 4.2, -1.25, 1.25, 12)], ['w', arc(6.2, 9, 3.4, 4.2, -0.4, 0.4, 4)], ['a', [[9.6, 9], [8.8, 9]]]] },
    { n: 'torri', st: [['i', [[6.2, 11.4]]], ['w', [[9.1, 5.3], [9.1, 7.6]]], ['w', [[9.1, 5.3], [9.1, 7.6]]], ['w', [[9.1, 10.4], [9.1, 12.7]]], ['w', [[9.1, 10.4], [9.1, 12.7]]], ['w', [[6.5, 6.6], [7.5, 7.5], [6.5, 8.4]]], ['a', [[9.1, 6.4], [8.3, 6.4]]], ['a', [[9.1, 11.6], [8.3, 11.6]]]] }
  ];
  function botBuild(G, c) {
    const s = sideOf(G, c), p = PSd(G, s), first = G.st.n === 1;
    if (first || !G.botFort) { const M = piMem(), w = FORTS.map(F => Math.exp((M.fw[F.n] || 0) * 0.55)), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot, i = 0; while (i < FORTS.length - 1 && (r -= w[i]) > 0) i++; G.botFort = G.tut ? FORTS[0] : FORTS[i]; }
    // prima manche: il suo fortino; dopo: prima riempie i buchi (senza ripassare), poi con la neve che resta ripassa (muri doppi)
    for (const pass of first ? [0, 0] : [1, 0]) for (const [k, pts] of G.botFort.st) { if (p.nv <= 0) break; const P = mx(s, pts); if (k === 'w') addStroke(G, s, P, { noThick: !!pass }); else if (k === 'i') { if (!p.ig && pass === 0) placeIgloo(G, s, P[0][0], P[0][1]); } else if (!pass) addAsse(G, s, P); }
    p.rd = 1;
  }
  // un punto libero accanto a un mucchio (la casella del mucchio e' un oggetto: i percorsi non ci finiscono dentro)
  function besideObj(G, x, y, c) { let best = null, bd = 1e9; for (const [a, b] of [[-0.9, 0], [0.9, 0], [0, 0.9], [0, -0.9], [-0.75, 0.75], [0.75, 0.75], [-0.75, -0.75], [0.75, -0.75]]) { const px = x + a, py = y + b; if (!cqCellFree(Math.floor(px), Math.floor(py)) || !freeAt(G, px, py)) continue; const d = Math.hypot(px - c.x, py - c.y); if (d < bd) { bd = d; best = [px, py]; } } return best || [x, y]; }
  function botGo(G, c, x, y) { const p = cqPath(c.x, c.y, x, y); if (p.length) { p[p.length - 1] = [x, y]; c.path = p; } else c.path = [[x, y]]; c.goal = [x, y]; }
  const freeAt = (G, x, y) => cqFree(x, y) && !blkAt(G, x, y);
  // un posto dietro un mio muro, dalla parte di casa (verso l'altro c'e' il muro)
  function postFor(G, s, Q) {
    const S = G.S, dir = s ? 1 : -1; let best = null, bs = 1e9;
    for (let n = 0; n < S.bl.length; n++) { const b = S.bl[n]; if (b.o !== s || !live(G, n)) continue; const x = b.x + dir * 0.78, y = b.y; if (!freeAt(G, x, y)) continue;
      const d = Math.hypot(Q.x - x, Q.y - y); if (d > RMAX_L - 1) continue;   // troppo lontano: da li' non arriva
      const sc = Math.abs(y - Q.y) * 0.35 + Math.max(0, d - (RMAX_D - 1.5)) * 1.2 + Math.random() * 1.2; if (sc < bs) { bs = sc; best = [x, y]; } }
    return best;
  }
  // nessun muro buono: si avvicina allo scoperto fino a tiro (con 3 palle anche nella terra di nessuno)
  function approach(G, c, s, Q, bold) {
    const d = Math.hypot(Q.x - c.x, Q.y - c.y) || 1, lim = s ? (bold ? 17.4 : 19.6) : (bold ? 12.6 : 10.4);
    for (let k = 0; k < 6; k++) { const r = 10 - k * 0.4, a = (Math.random() - 0.5) * 0.9, ux = (c.x - Q.x) / d, uy = (c.y - Q.y) / d, x0 = Q.x + (ux * Math.cos(a) - uy * Math.sin(a)) * r, y = Math.max(1.6, Math.min(16.4, Q.y + (ux * Math.sin(a) + uy * Math.cos(a)) * r)), x = s ? Math.max(lim, x0) : Math.min(lim, x0);
      if (freeAt(G, x, y)) { botGo(G, c, x, y); return true; } }
    return false;
  }
  function threatGnome(G, c, s, skip) {
    let best = null, bd = 1e9;
    for (const e of G.gn) { if (e.s === s) continue; const roll = e.ty === 'r' && e.st === 2, x = roll ? e.bx : e.x, y = roll ? e.by : e.y, d = Math.hypot(x - c.x, y - c.y);
      if (d > RMAX_D - 1) continue; const danger = roll ? 3 : e.ty === 'p' && e.st === 1 ? 2.5 : e.ty === 'c' && d < 7 ? 2 : e.ty === 'p' && d < 5 ? 1 : 0; if (!danger) continue;
      const lead = roll ? d / V_D : 0, ex = x + (roll ? e.dx * ROLL_V * lead : 0), ey = y + (roll ? e.dy * ROLL_V * lead : 0); if (traceWall(G, c.x, c.y, ex, ey, skip)) continue;
      const sc = d - danger * 3; if (sc < bd) { bd = sc; best = [ex, ey]; } }
    return best;
  }
  // quale gnomo mandare: rotolone contro un muro lungo e dritto (di petto), cecchino se ti nascondi tanto, picconatore sul muro che ti copre
  function chooseGnome(G, c, s, hid) {
    const S = G.S, so = 1 - s, Q = c.mem || posOf(G, charOf(G, so)), p = G.st.p[s]; let long = null, ln = 0;
    for (const cp of S.camp) { if (cp.o !== so || cp.p || cp.b.length < 7 || salOf(G, cp.b[0]) <= 0) continue; if (cp.b.length > ln) { ln = cp.b.length; long = cp; } }
    const R = Math.random();
    if (long && R < 0.55) { const b = S.bl[long.b[long.b.length >> 1]]; return ['r', b.x, b.y]; }
    if ((hid || (c.hidN || 0) > 12 || c.style === 'c') && p.b >= 3 && R < (c.style === 'c' ? 0.9 : 0.7)) return ['c', null, null];
    const wb = traceWall(G, c.x, c.y, Q.x, Q.y, n => Math.hypot(S.bl[n].x - c.x, S.bl[n].y - c.y) < LEAN); if (wb && S.bl[wb.n].o === so) return ['p', wb.x, wb.y];
    return R < 0.3 ? ['r', null, null] : R < 0.5 ? ['p', null, null] : null;
  }
  function botTick(G, c, dt) {
    const st = G.st, s = sideOf(G, c), p = st.p[s], o = oppOf(G, c), so = 1 - s, Q = posOf(G, o), T = G.time;
    if (st.ph !== 'fight' || frozenS(G, s, T)) { c.path = []; c.walk = 0; return; }
    const L = piLv(G);
    if (riding(G, s)) { botRide(G, c, dt); return; }
    { const sl = st.sl; if (sl && sl.ph === 'w') { const dS = Math.hypot(sl.x - c.x, sl.y - c.y), dH = Math.hypot(sl.x - Q.x, sl.y - Q.y);
      if (dS < 1.2 && mountSled(G, s)) { c.path = []; return; }
      const rush = c.style === 'sled' ? 7 : L < 0.45 ? 0 : 3; if (p.h < 2 && dS < dH + rush && (!c.goal || Math.hypot(c.goal[0] - sl.x, c.goal[1] - sl.y) > 0.5)) { botGo(G, c, sl.x, sl.y); } if (p.h < 2 && dS < dH + rush) { if (c.path && c.path.length) cqModeStep(c, dt, 0.95); return; } } }
    // schiva: un pallonetto che mi cade addosso (vede l'ombra), o a volte un tiro dritto
    for (const B of st.B) { if (B[1] === s) continue; const u = (T - B[7]) / B[8], left = (1 - u) * B[8];
      if (B[2] === 'l' && left > 0.22 && Math.hypot(B[5] - c.x, B[6] - c.y) < (c.style === 'move' ? 1.35 : 0.95) && !c.dodge) { const a = Math.atan2(c.y - B[6], c.x - B[5]) + (Math.random() - 0.5) * 0.8, x = c.x + Math.cos(a) * 1.3, y = c.y + Math.sin(a) * 1.3; if (freeAt(G, x, y)) { c.path = [[x, y]]; c.dodge = B[0]; } }
      if (B[2] === 'd' && left > 0.18 && c.dodge !== B[0] && Math.random() < 0.012) { const vx = B[5] - B[3], vy = B[6] - B[4], l = Math.hypot(vx, vy) || 1, x = c.x - vy / l * 1.1, y = c.y + vx / l * 1.1; if (freeAt(G, x, y)) { c.path = [[x, y]]; c.dodge = B[0]; } } }
    c.think = (c.think || 0) - dt;
    if (c.think <= 0) {
      c.think = 0.35 + Math.random() * 0.4;
      const skip0 = n => Math.hypot(G.S.bl[n].x - c.x, G.S.bl[n].y - c.y) < LEAN;
      // se sei nascosto non sa dove sei: si ricorda dove ti ha visto l'ultima volta
      const hid = hiddenFrom(G, s, o); if (!hid) c.mem = { x: Q.x, y: Q.y, t: T }; else c.hidN = (c.hidN || 0) + 1;
      // prima gli gnomi nemici che arrivano (il rotolone che rotola, il picconatore che scava, il cecchino vicino)
      if (p.b > 0 && T - p.lt > CD + 0.3) { const th = threatGnome(G, c, s, skip0); if (th) { throwFrom(G, s, 'd', th[0], th[1]); return; } }
      // i suoi gnomi
      // i suoi gnomi: decide quale vuole, mette da parte le palle che servono, poi lo manda
      if (iglooOf(G, s) && T > (c.gnT || 0) && gnAlive(G, s) < 2) {
        if (!c.want) { c.want = chooseGnome(G, c, s, hid); c.wantT = T; if (!c.want) c.gnT = T + 5; }
        if (c.want && (T - c.wantT > 20 || gnAlive(G, s) >= GN_MAX)) { c.want = null; c.gnT = T + 6; }
        else if (c.want && p.b >= GN[c.want[0]].cost && spawnGnome(G, s, c.want[0], c.want[1], c.want[2])) { c.want = null; c.gnT = T + 13 + Math.random() * 10 + (1 - L) * 14; return; }
      }
      if (hid) {   // nascosto: pallonetto dove l'ha visto (a caso intorno) oppure butta giu' il muro che lo copre
        const M = c.mem || Q, dm = Math.hypot(M.x - c.x, M.y - c.y);
        if (p.b > 0 && T - p.lt > CD + 1.4 + Math.random() * 1.6 + (1 - L) * 1.2) {   // nascosto da tanto: lo cerca lo stesso intorno a dove l'ha visto
          const wb = traceWall(G, c.x, c.y, M.x, M.y, skip0); if (wb && G.S.bl[wb.n].o === so && dm <= RMAX_D && Math.random() < 0.55) { throwFrom(G, s, 'd', wb.x, wb.y); return; }
          if (dm <= RMAX_L && dm >= 3) { const e = 1.6 + Math.min(2, (T - (c.mem ? c.mem.t : T)) * 0.1); throwFrom(G, s, 'l', M.x + (Math.random() - 0.5) * e, M.y + (Math.random() - 0.5) * e); return; }
        }
      }
      const d = Math.hypot(Q.x - c.x, Q.y - c.y), saving = !!(c.want && iglooOf(G, s) && p.b < GN[c.want[0]].cost);   // mette da parte le palle per lo gnomo che vuole
      if (!hid && p.b > 0 && !(saving && d > 6) && T - p.lt > CD + 0.7 + Math.random() * 0.9 + (1 - L) * (stormOn(G, T) ? 0.5 : 1.6) && !st.p[so].d) {
        const vx = o.nvx || 0, vy = o.nvy || 0, skip = skip0;
        const lead = d / V_D * 0.8, ex = Q.x + vx * lead, ey = Q.y + vy * lead, block = traceWall(G, c.x, c.y, ex, ey, skip);
        if (!block && d <= RMAX_D) { const e = (0.18 + d * 0.025) * (1.9 - L); throwFrom(G, s, 'd', ex + (Math.random() - 0.5) * e * 2, ey + (Math.random() - 0.5) * e * 2); return; }
        if (d <= RMAX_L && d >= 3) { const dur = Math.max(0.75, d / V_L), still = Math.hypot(vx, vy) < 0.3, e = (still ? 0.3 : 0.7) * (1.9 - L); throwFrom(G, s, 'l', Q.x + vx * dur * 0.7 + (Math.random() - 0.5) * e * 2, Q.y + vy * dur * 0.7 + (Math.random() - 0.5) * e * 2); return; }
        if (block && d <= RMAX_D && block.n >= 0 && G.S.bl[block.n].o === so && Math.random() < 0.45) { throwFrom(G, s, 'd', block.x, block.y); return; }   // gli butta giu' il muro
      }
      // a secco: va a fare le palle (prima le scorte, poi la neve fresca, poi gratta il suo muro)
      if (p.b === 0 || saving || (p.b < 2 && d > RMAX_L)) {
        { const src = srcFor(G, s); if (src && (src[0] !== 'w' || (p.sk === 0 && Math.random() < 0.3)) && startMake(G, s)) { c.path = []; return; } }
        let tgt = null;
        if (p.sk > 0) tgt = besideObj(G, p.sx, p.sy, c);
        else { let bd = 1e9; PILES.forEach(([x, y], i) => { if (st.pl[i] <= 0) return; const dd = Math.hypot(x - c.x, y - c.y) + Math.hypot(x - Q.x, y - Q.y) < 5 ? 6 : 0; const sc = Math.hypot(x - c.x, y - c.y) + dd; if (sc < bd) { bd = sc; tgt = besideObj(G, x, y, c); } }); }
        if (tgt && (!c.goal || Math.hypot(c.goal[0] - tgt[0], c.goal[1] - tgt[1]) > 0.5)) botGo(G, c, tgt[0], tgt[1]);
        return;
      }
      // con le palle in mano: dietro un muro a distanza di tiro
      if (!c.path || !c.path.length) { const P = postFor(G, s, Q); if (P && Math.hypot(P[0] - c.x, P[1] - c.y) > 0.6 && Math.random() < (c.style === 'wall' ? 0.85 : c.style === 'move' ? 0.75 : 0.5)) botGo(G, c, P[0], P[1]); else if (!P && d > RMAX_D - 1 && T - st.t0 > 8 + (1 - L) * 14) approach(G, c, s, Q, (p.b >= 3 && L > 0.45 && T - st.t0 > 25) || (stormOn(G, T) && p.b >= 2)); }
    }
    if (c.path && c.path.length) { const q = c.path[0]; if (blkAt(G, q[0], q[1])) { c.path = []; c.goal = null; } else cqModeStep(c, dt, 0.92); } else { c.walk = 0; c.dodge = 0; }
  }

  // ======================= IL MIO TELEFONO =======================
  function css() {
    if (document.getElementById('nvCss')) return;
    const s = document.createElement('style'); s.id = 'nvCss';
    s.textContent = `#nvBuild{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:min(96vw,420px);z-index:6;background:linear-gradient(#2a3e66,#1a2848);border:2px solid #9ac0f4;border-radius:16px;padding:7px 8px 8px;color:#eef4ff;text-align:center;font-family:system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45);user-select:none;-webkit-user-select:none}
#nvBuild .hd{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:14px;margin:0 4px 4px}#nvBuild .hd b{font-size:16px}#nvBuild .tip{font-size:12px;line-height:1.3;min-height:31px;margin:2px 2px 6px;color:#cfe0ff}
#nvBuild .tl{display:flex;gap:4px;justify-content:center}#nvBuild button{flex:1;min-width:0;border:0;border-radius:11px;padding:6px 2px 5px;background:#3a5488;color:#fff;font:700 11px system-ui;display:flex;flex-direction:column;align-items:center;gap:1px;touch-action:manipulation}
#nvBuild button i{font-style:normal;font-size:19px;line-height:1.1}#nvBuild button.on{background:#f2f6fb;color:#1a2848;box-shadow:0 0 0 3px #ffd24a}#nvBuild button.ok{background:#3aa860}#nvBuild button.ok.on{background:#ffd24a;color:#1a2848}#nvBuild button.off{opacity:.45}
.nvPad{position:absolute;bottom:150px;width:84px;height:84px;border-radius:50%;border:3px solid rgba(255,255,255,.4);padding:0;background:radial-gradient(circle at 40% 35%,#4a6aa8,#1a2848);box-shadow:0 5px 16px rgba(0,0,0,.45);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;z-index:5;color:#fff;font-family:system-ui}
.nvPad b{position:absolute;left:0;right:0;top:12px;font-size:28px;pointer-events:none;transition:transform .05s}.nvPad i{position:absolute;left:0;right:0;bottom:12px;font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.02em;pointer-events:none}
#nvD{right:max(14px,4%)}#nvL{right:calc(max(14px,4%) + 94px);background:radial-gradient(circle at 40% 35%,#6a5aa8,#2a1a48)}.nvPad.off{opacity:.4}.nvPad.aim{border-color:#ffd24a;box-shadow:0 0 0 4px rgba(255,210,74,.3),0 5px 16px rgba(0,0,0,.45)}
#ciack.nvFight #cqKill{bottom:272px;right:max(14px,4%)}
#nvHand{position:absolute;right:max(14px,4%);bottom:242px;z-index:5;background:rgba(16,24,44,.75);color:#fff;border-radius:12px;padding:4px 9px;font:800 13px system-ui;pointer-events:none}
#nvG{position:absolute;left:max(10px,3%);bottom:150px;z-index:5;display:flex;flex-direction:column;gap:6px;user-select:none;-webkit-user-select:none}#nvG .t{font:800 10px system-ui;color:#fff;text-align:center;text-shadow:0 1px 2px #000}
#nvG button{width:62px;height:54px;border-radius:14px;border:2px solid rgba(255,255,255,.35);background:linear-gradient(#3a5a3a,#1e3a22);color:#fff;font:800 10px system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;touch-action:manipulation}
#nvTut{position:absolute;inset:0;pointer-events:none;z-index:9}#nvTut .bub{position:absolute;left:50%;transform:translateX(-50%);width:min(92vw,380px);background:#fffdf6;color:#1a2848;border-radius:16px;padding:9px 12px 10px;box-shadow:0 8px 24px rgba(0,0,0,.4);font:600 14px/1.35 system-ui;pointer-events:auto}#nvTut .bub small{display:block;font-weight:800;color:#4a7aa8;margin-bottom:3px}#nvTut .bub button{float:right;border:0;background:#e8eef8;border-radius:10px;padding:3px 8px;font:700 12px system-ui;color:#1a2848;margin-left:6px}#nvTut .hl{position:absolute;border:3px solid #ffd24a;border-radius:50%;box-shadow:0 0 0 4px rgba(255,210,74,.35)}#nvTut .fg{position:absolute;font-size:40px;transform:translateX(-50%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.4))}
#nvG button i{font-style:normal;font-size:21px;line-height:1}#nvG button.off{opacity:.38}#nvG button.sel{border-color:#ffd24a;box-shadow:0 0 0 3px rgba(255,210,74,.45);background:linear-gradient(#5a8a4a,#2e5a2a)}`;
    document.head.appendChild(s);
  }
  const ROOT = () => document.getElementById('ciack');
  const TOOLS = [['w', '✏️', 'Muro'], ['a', '🪵', 'Asse'], ['i', '🛖', 'Igloo'], ['s', '📦', 'Scorte'], ['e', '🧽', 'Togli'], ['u', '↩️', 'Annulla'], ['r', '✔', 'Pronto']];
  const TIPS = {
    i: 'Tocca dove mettere l\'<b>igloo</b> (8 neve): in battaglia ne escono gli <b>gnomi</b> ⛏️ 🎯 ☃️ (costano palle). Proteggilo: l\'altro può distruggerlo.',
    w: 'Disegna col dito i <b>muri</b>. Ogni pezzo costa neve. <b>Ripassa</b> un muro per farlo <b>doppio</b>. Gli <b>angoli</b> diventano pilastri 🚩.',
    a: 'Trascina dal muro verso casa: un\'<b>asse di legno</b> diagonale fa da <b>pilastro</b> e rinforza.',
    s: 'Tocca dove vuoi il <b>mucchio delle scorte</b>: la neve che <b>non usi</b> diventa palle già pronte (una ogni 2 neve).',
    e: 'Tocca un pezzo di muro per toglierlo (la neve torna indietro).'
  };
  function buildUI(G, on) {
    css(); let el = document.getElementById('nvBuild');
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'nvBuild';
      el.innerHTML = '<div class="hd"><span class="nv"></span><span class="tm"></span></div><div class="tip"></div><div class="tl">' + TOOLS.map(([k, i, n]) => `<button type="button" data-k="${k}"${k === 'r' ? ' class="ok"' : ''}><i>${i}</i>${n}</button>`).join('') + '</div>';
      ROOT().appendChild(el);
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const G2 = cq.g; if (!G2 || G2.mode !== 'neve') return; const k = b.dataset.k;
        if (k === 'u') { myBuild(G2, 'u', null); return; } if (k === 'r') { myReady(G2); return; } U.tool = k; SFX.tick(); buildRender(G2); }));
    }
    buildRender(G);
  }
  function buildRender(G) {
    const el = document.getElementById('nvBuild'); if (!el || !G.st) return; const p = PS(G, G.me);
    el.querySelectorAll('button').forEach(b => { const k = b.dataset.k; b.classList.toggle('on', k === U.tool || (k === 'r' && !!p.rd)); if (k === 'a') b.classList.toggle('off', !(p.as > 0)); });
    const tp = el.querySelector('.tip'), tx = p.rd ? '✔ <b>Pronto!</b> Aspetti l\'altro… (tocca ✔ per tornare a costruire)' : TIPS[U.tool] || ''; if (tp.innerHTML !== tx) tp.innerHTML = tx;
  }
  function uiTickBuild(G) {
    const el = document.getElementById('nvBuild'); if (!el || !G.st) return; const p = PS(G, G.me), T = lt(G), st = G.st;
    const nv = el.querySelector('.nv'), tx = '❄️ <b>' + Math.max(0, p.nv) + '</b> neve · 🪵 ' + (p.as || 0) + ' · 📦 ' + Math.min(STOCK_MAX, Math.floor(Math.max(0, p.nv) / 2)) + ' palle'; if (nv.innerHTML !== tx) nv.innerHTML = tx;
    const tm = el.querySelector('.tm'), left = st.bt - (T - st.t0), t2 = G.tut ? '🎓' : '⏱ ' + Math.max(0, Math.ceil(left)) + ' s'; if (tm.textContent !== t2) tm.textContent = t2;
    const r = el.querySelector('[data-k=r]'); if (r.classList.contains('on') !== !!p.rd) buildRender(G);
  }
  function myBuild(G, t, pts) {
    const st = G.st; if (!st || st.ph !== 'build') return; const s = mySide(G);
    if (t === 'u') { if (G.guest) cqNetSend({ k: 'un' }); else undo(G, s); SFX.tick(); return; }
    const enc = pts.slice(0, 120).map(([x, y]) => Math.round(x * 20) + ',' + Math.round(y * 20)).join(' ');
    if (G.guest) { cqNetSend({ k: 'wl', t, p: enc }); U.pend = { t, pts, at: now(), v0: G.S ? G.S.v : -1 }; }
    else buildAct(G, s, t, pts);
    SFX.draw();
    if (G.tut) G.tutDid = (G.tutDid || '') + t;
  }
  function myReady(G) { const st = G.st; if (!st || st.ph !== 'build') return; const on = !PS(G, G.me).rd; if (G.guest) cqNetSend({ k: 'rdy', on: on ? 1 : 0 }); else st.p[mySide(G)].rd = on ? 1 : 0; SFX.ok(); setTimeout(() => buildRender(G), 50); }
  // tocco sullo schermo -> punto della mappa (a terra)
  function toMap(G, cx, cy) {
    const cv = document.getElementById('cqCanvas'), V = G.camv; if (!cv || !V) return null; const rc = cv.getBoundingClientRect(), vz = cq.vz || 1, lx = (cx - rc.left) / vz, ly = (cy - rc.top) / vz;
    const a = 2 * (lx - V.tx) / V.TW, b = 4 * (ly - V.ty) / V.TW; return [(a + b) / 2, (b - a) / 2];
  }
  // ---- LA FIONDA: due pulsanti, tiro DRITTO e PALLONETTO (trascini all'indietro, piu' lungo = piu' lontano) ----
  function fightUI(G, on) {
    css(); { const r = ROOT(); if (r) r.classList.toggle('nvFight', !!on); } for (const id of ['nvD', 'nvL', 'nvHand']) { const e = document.getElementById(id); if (!on && e) e.remove(); }
    if (!on) { U.aim = null; return; }
    const mk = (id, ico, txt, ty) => {
      if (document.getElementById(id)) return; const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'nvPad'; b.innerHTML = `<b>${ico}</b><i>${txt}</i>`; ROOT().appendChild(b);
      let ptr = null;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const G2 = cq.g; if (!G2 || G2.mode !== 'neve' || !(PS(G2, G2.me).b > 0 || (riding(G2, mySide(G2)) && G2.st.sl.am > 0))) { SFX.no(); return; } ptr = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { b.setPointerCapture(e.pointerId); } catch {} b.classList.add('aim'); U.aim = { ty, ok: false }; });
      b.addEventListener('pointermove', e => { if (!ptr || ptr.id !== e.pointerId) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; U.aim = aimFrom(ty, dx, dy); const m = Math.min(1, Math.hypot(dx, dy) / PULL), l = Math.hypot(dx, dy) || 1; b.querySelector('b').style.transform = 'translate(' + (dx / l * m * 20) + 'px,' + (dy / l * m * 20) + 'px)'; });
      const up = e => { if (!ptr || ptr.id !== e.pointerId) return; ptr = null; b.classList.remove('aim'); b.querySelector('b').style.transform = ''; const A = U.aim; U.aim = null; const G2 = cq.g; if (G2 && A && A.ok && e.type === 'pointerup') myThrow(G2, A.ty, A.x, A.y); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.oncontextmenu = e => e.preventDefault();
    };
    mk('nvD', '➡️', 'TIRO DRITTO', 'd'); mk('nvL', '🌙', 'PALLONETTO', 'l');
    if (!document.getElementById('nvHand')) { const h = document.createElement('div'); h.id = 'nvHand'; ROOT().appendChild(h); }
  }
  function aimFrom(ty, dx, dy) {
    const TW = Math.max(48, Math.min(cq.w, cq.h) / 8), m = Math.hypot(dx, dy); if (m < 14) return { ty, ok: false };
    let wx = -dx / TW - 2 * dy / TW, wy = dx / TW - 2 * dy / TW; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const RM = ty === 'd' ? RMAX_D : RMAX_L, dist = RMIN + (RM - RMIN) * Math.min(1, (m - 14) / (PULL - 14));
    return { ty, ok: true, x: Math.max(0.6, Math.min(W - 0.6, cq.x + wx * dist)), y: Math.max(0.6, Math.min(H - 0.6, cq.y + wy * dist)) };
  }
  function myThrow(G, ty, x, y) {
    const st = G.st, p = PS(G, G.me), T = lt(G), rd = st && riding(G, mySide(G)); if (!st || st.ph !== 'fight' || p.d || !(rd ? st.sl.am > 0 : p.b > 0) || making(G, mySide(G), T)) return;
    if (G.guest) { if (now() - (U.thT || 0) < CD) return; U.thT = now(); cqNetSend({ k: 'th', ty, x: r2(x), y: r2(y) }); U.myThrow = now(); }
    else if (throwFrom(G, mySide(G), ty, x, y)) U.myThrow = now();
    if (G.tut) G.tutThrow = (G.tutThrow || '') + ty;
  }
  function myMake(G) { const st = G.st; if (!st || st.ph !== 'fight') return; if (G.guest) cqNetSend({ k: 'mk' }); else if (startMake(G, mySide(G)) && G.tut) G.tutMk = 1; }
  function uiTickFight(G) {
    const p = PS(G, G.me), T = lt(G), h = document.getElementById('nvHand'); if (!h) return;
    const rd = riding(G, mySide(G)), sl = G.st.sl, tx = rd ? '🛷 cannone ' + '🔵'.repeat(Math.max(0, sl.am)) + ' · ' + Math.max(0, Math.ceil(SLED_T - (T - sl.t0))) + ' s' : '⚪'.repeat(Math.max(0, p.b || 0)) + '<span style="opacity:.35">' + '⚪'.repeat(Math.max(0, HAND - (p.b || 0))) + '</span> in mano' + (rd ? '' : p.ice ? '<br>❄️ <b>PALLA DI GHIACCIO</b> pronta!' : p.rf > 0 && T - (p.rfT || -99) < RAF_T ? '<br>🔥 raffica ' + p.rf + '/3' : ''); if (h.innerHTML !== tx) h.innerHTML = tx;
    const off = !(rd ? sl.am > 0 : p.b > 0) || !!p.d || making(G, mySide(G), T); for (const id of ['nvD', 'nvL']) { const e = document.getElementById(id); if (e && e.classList.contains('off') !== off) e.classList.toggle('off', off); }
  }
  // ---- GLI GNOMI: tre pulsanti (solo con l'igloo in piedi). Tocchi lo gnomo, poi tocchi il punto da attaccare (se non tocchi, sceglie lui) ----
  function gnSmooth(G, dt) {   // le posizioni degli gnomi arrivano a scatti: qui si lisciano
    const st = G.st, seen = new Set(), k = 1 - Math.exp(-Math.max(0, dt) * 14);
    for (const e of (st && st.gn) || []) { const id = e[0]; seen.add(String(id)); let P = U.gp[id]; if (!P || Math.hypot(P.x - e[3], P.y - e[4]) > 3) P = U.gp[id] = { x: e[3], y: e[4], rot: 0 }; else { P.x += (e[3] - P.x) * k; P.y += (e[4] - P.y) * k; } if (e[5] === 2) P.rot += dt * ROLL_V / Math.max(0.2, e[6]); P.e = e; }
    for (const id in U.gp) if (!seen.has(id)) delete U.gp[id];
  }
  function sendGnome(G, ty, x, y) {
    U.gsel = null; const s = mySide(G);
    if (G.guest) cqNetSend(x != null ? { k: 'gn', ty, x: r2(x), y: r2(y) } : { k: 'gn', ty }); else spawnGnome(G, s, ty, x, y);
    SFX.gnome(); if (G.tut) G.tutGn = 1;
  }
  function gnUI(G) {
    const st = G.st, s = mySide(G), on = st && st.ph === 'fight' && !!iglooOf(G, s) && !st.p[s].d; let el = document.getElementById('nvG');
    if (!on) { if (el) el.remove(); U.gsel = null; return; }
    css();
    if (!el) {
      el = document.createElement('div'); el.id = 'nvG'; el.innerHTML = '<div class="t">🛖 GNOMI</div>' + Object.entries(GN).map(([k, D]) => `<button type="button" data-k="${k}"><i>${D.ico}</i>${D.cost}⚪</button>`).join(''); ROOT().appendChild(el);
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const G2 = cq.g; if (!G2 || G2.mode !== 'neve') return; const k = b.dataset.k, p = PS(G2, G2.me);
        if (U.gsel && U.gsel.ty === k) { sendGnome(G2, k); return; }   // secondo tocco sullo stesso: parte subito e sceglie lui
        if (b.classList.contains('off')) { SFX.no(); cqToast(p.b < GN[k].cost ? '⚪ Servono <b>' + GN[k].cost + ' palle in mano</b> per il ' + GN[k].n + '.' : '🛖 Al massimo <b>3 gnomi</b> in campo.'); return; }
        U.gsel = { ty: k, t: now() }; SFX.tick(); }));
    }
    const p = st.p[s], n = (st.gn || []).filter(g => g[1] === s).length, key = p.b + ',' + n + ',' + (U.gsel ? U.gsel.ty : '');
    if (el.dataset.k !== key) { el.dataset.k = key; el.querySelectorAll('button').forEach(b => { const k = b.dataset.k; b.classList.toggle('off', p.b < GN[k].cost || n >= GN_MAX); b.classList.toggle('sel', !!U.gsel && U.gsel.ty === k); }); }
    if (U.gsel && now() - U.gsel.t > 3.5) sendGnome(G, U.gsel.ty);   // non ha scelto: sceglie lo gnomo
  }
  // ---- passaggi di fase sul mio telefono ----
  function stage(G) {
    const st = G.st, key = st ? st.ph + st.n : ''; if (key === U.ph) return; const was = U.ph; U.ph = key; const p = st ? st.ph : '';
    buildUI(G, p === 'build'); fightUI(G, p === 'fight');
    if (p === 'build') { const P = START[mySide(G)]; cq.x = P[0]; cq.y = P[1]; cq.face = mySide(G) ? -1 : 1; U.tool = 'w'; if (st.n === 1 && !G.tut) helpOnce(); }
    if (p === 'reveal') SFX.reveal();
    if (p === 'mres') { const w = st.win === mySide(G); if (st.win >= 0) SFX[w ? 'win' : 'lose'](); }
    void was;
  }
  function fxEvents(G) {
    const st = G.st; if (!st || !st.ev) return; const T = now();
    for (const e of st.ev) {
      if (e[0] <= U.evSeen) continue; U.evSeen = e[0]; if (G.time - (e[7] || 0) > 9e9) continue;
      const [, k, x, y, a, b] = e, me = a === mySide(G);
      if (k === 'td') SFX.throw(); else if (k === 'tl') SFX.lob();
      else if (k === 'p') { SFX.plof(); U.fx.push({ k: 'puff', x, y, t: T }); }
      else if (k === 'w') { SFX.wall(); U.fx.push({ k: 'chunk', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: 'CRAC', c: '#bfe0ff' }); }
      else if (k === 'cr') { SFX.crash(); U.fx.push({ k: 'big', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: b > 6 ? '💥 CROLLA TUTTO!' : '💥 CROLLATO!', c: '#ffd0a0' }); U.shake = T; }
      else if (k === 'h') { SFX.hit(); const two = e[6] === 2; U.fx.push({ k: 'puff', x, y, t: T, big: 1 }); U.fx.push({ k: 'txt', x, y, t: T, s: (me ? '❄️ PRESO!' : '❄️ PLOF!') + (two ? ' x2' : ''), c: me ? '#ff9a8a' : '#ffffff' }); if (me) { U.shake = T; U.hitT = T; } }
      else if (k === 'ice') { SFX.ice(); U.fx.push({ k: 'txt', x, y, t: T, s: me ? '🔥 RAFFICA! ❄️ palla di ghiaccio pronta' : '🔥 RAFFICA di ' + (G.chars[a] ? G.chars[a].name : ''), c: '#9ad8ff' }); }
      else if (k === 'rf2') { if (me) U.fx.push({ k: 'txt', x, y, t: T, s: '🔥 2 di fila! Ancora uno…', c: '#ffd0a0' }); }
      else if (k === 'bu') { SFX.buried(); U.slow = T; if (a === mySide(G)) U.hitT = T; U.fx.push({ k: 'puff', x, y, t: T, big: 1 }); U.bur = { s: a, t: T }; U.fx.push({ k: 'txt', x, y, t: T, s: '☃️ SEPOLTO!', c: '#ffffff' }); }
      else if (k === 'mk' && me) SFX.crunch();
      else if (k === 'gs') { SFX.gnome(); U.fx.push({ k: 'txt', x, y, t: T, s: GN[b] ? GN[b].ico + ' ' + GN[b].n + '!' : '', c: me ? '#c8ffb0' : '#ffd0a0' }); }
      else if (k === 'gk') { SFX.squeak(); U.fx.push({ k: 'puff', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '😵 gnomo a terra!', c: '#ffffff' }); }
      else if (k === 'gh') U.fx.push({ k: 'puff', x, y, t: T });
      else if (k === 'gd') { SFX.dig(); U.fx.push({ k: 'chunk', x, y, t: T }); }
      else if (k === 'gr') { SFX.roll(); U.fx.push({ k: 'txt', x, y, t: T, s: '☃️ ROTOLAAA!', c: '#ffffff' }); }
      else if (k === 'rs') { SFX.slide(); U.fx.push({ k: 'txt', x, y, t: T, s: '↗ di striscio: scivola!', c: '#bfe0ff' }); }
      else if (k === 'rh') { SFX.plof(); U.fx.push({ k: 'puff', x, y, t: T }); }
      else if (k === 'rb') { SFX.crash(); U.fx.push({ k: 'big', x, y, t: T }); }
      else if (k === 'sa') { SFX.jingle(); U.fx.push({ k: 'txt', x, y, t: T, s: '🛷 SLITTINO-ARIETE!', c: '#ffd24a' }); }
      else if (k === 'sm') { SFX.jingle(); U.fx.push({ k: 'txt', x, y, t: T, s: me ? '🛷 IN SELLA! Spingi contro i muri!' : '🛷 ' + (G.chars[a] ? G.chars[a].name : '') + ' è sullo slittino!', c: me ? '#c8ffb0' : '#ffb0a0' }); }
      else if (k === 'sx') { SFX.plof(); U.fx.push({ k: 'big', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '🛷 slittino rotto!', c: '#ffffff' }); }
      else if (k === 'ram') { SFX.ram(); U.fx.push({ k: 'big', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '💥 SBAM!', c: '#ffd0a0' }); U.shake = T; }
      else if (k === 'run') { U.fx.push({ k: 'txt', x, y, t: T + 0.15, s: '🛷 TRAVOLTO!', c: '#ffb0a0' }); U.fx.push({ k: 'puff', x, y, t: T, big: 1 }); if (G.guest && 1 - a === mySide(G)) knock(G, cq, (e[5] || 0) / 100, (e[6] || 0) / 100); }
      else if (k === 'ih') { SFX.igloo(); U.fx.push({ k: 'chunk', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '🛖 igloo colpito', c: '#bfe0ff' }); }
      else if (k === 'ix') { SFX.crash(); U.fx.push({ k: 'big', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '🛖 IGLOO DISTRUTTO!', c: '#ffd0a0' }); }
    }
    U.fx = U.fx.filter(f => T - f.t < 2);
  }
  function helpOnce() {
    try { if (localStorage.getItem('neveHelp')) return; localStorage.setItem('neveHelp', '1'); } catch { return; }
    setTimeout(() => cqToast('☃️ <b>Costruisci il fortino!</b> Disegna i muri col dito: gli <b>angoli</b> e le <b>assi</b> fanno da pilastri 🚩, un muro lungo e dritto crolla tutto insieme. La neve che avanzi diventa <b>palle</b> nel mucchio 📦.'), 1500);
  }
  // ======================= TUTORIAL (da solo contro Pierino, che aspetta finche' non hai imparato; un dito ti mostra cosa fare) =======================
  const qs = q => document.querySelector(q);
  const tutOn = G => !!(G && G.tut && !G.tutDone);
  const mineB = G => G.S ? G.S.bl.filter(b => b.o === mySide(G)) : [];
  const TUT = [
    { t: 'Benvenuto nel giardino! ☃️ Prima si costruisce il <b>fortino</b>, in segreto. <b>Trascina il dito</b> come ti mostro per disegnare un muro.', ph: 'build', at: () => ({ x: 8.6, y: 5.6, x2: 8.6, y2: 10 }), ok: G => mineB(G).length > 0 },
    { t: 'Ogni pezzo costa <b>neve</b> ❄️ (in basso). Ora <b>ripassa</b> lo stesso muro col dito: diventa <b>doppio</b> e regge il doppio dei colpi.', ph: 'build', at: G => { const b = mineB(G)[0]; return b ? { x: b.x, y: b.y - 0.8, x2: b.x, y2: b.y + 2 } : null; }, ok: G => mineB(G).some(b => b.k === 2) },
    { t: "Vedi la riga colorata? <b>Rossa</b> = un pezzo lungo che <b>crolla tutto insieme</b>. Disegna un muro con un <b>angolo</b> (una L): l'angolo diventa un <b>pilastro</b> ⚪ e lo spezza in pezzi più forti.", ph: 'build', at: () => ({ x: 9.4, y: 11.2, x2: 9.4, y2: 13.4, x3: 7.4, y3: 13.4 }), ok: G => mineB(G).some(b => { const i = G.S.bl.indexOf(b); return G.S.pil[i] && !b.j && !b.as; }) },
    { t: 'Tocca <b>🛖 Igloo</b> e poi un punto dietro i muri: da lì in battaglia usciranno gli <b>gnomi</b>.', ph: 'build', at: G => PS(G, G.me).ig ? null : U.tool === 'i' ? { x: 4.5, y: 11.4 } : qs('#nvBuild [data-k=i]'), ok: G => !!PS(G, G.me).ig },
    { t: 'La neve che ti avanza diventa <b>palle</b> già pronte nel mucchio 📦. Quando hai finito tocca <b>✔ Pronto</b>.', ph: 'build', at: () => qs('#nvBuild [data-k=r]'), ok: G => G.st.ph !== 'build' },
    { t: "Ecco il fortino di Pierino! 🌙 <b>Trascina all'indietro</b> il pulsante PALLONETTO (come una fionda), guarda dove cade e <b>lascia</b>: passa <b>sopra</b> i muri.", ph: 'fight', at: () => qs('#nvL'), ok: G => (G.tutThrow || '').includes('l') },
    { t: '➡️ Il <b>tiro dritto</b> è veloce, ma <b>il muro lo ferma</b>: la ✖ ti dice dove si fermerebbe. Provalo.', ph: 'fight', at: () => qs('#nvD'), ok: G => (G.tutThrow || '').includes('d') },
    { t: 'Per fare altre palle vai al tuo mucchio 📦 (o ai mucchi in mezzo) e premi <b>⚪ Fai palla</b>. Resti fermo un attimo: occhio ai pallonetti!', ph: 'fight', at: G => { const b = qs('#cqKill'); if (b && !b.hidden) return b; const p = PS(G, G.me); return { x: p.sx, y: p.sy }; }, ok: G => !!G.tutMk },
    { t: 'Ora uno <b>gnomo</b>: tocca ⛏️ <b>Picconatore</b> e poi il <b>muro di Pierino</b> da scavare.', ph: 'fight', go: G => { if (!G.guest) G.st.p[mySide(G)].b = HAND; }, at: () => qs('#nvG [data-k=p]'), ok: G => !!G.tutGn || G.time - (G.tutT || 0) > 30 },
    { t: '💡 Ultimi segreti: se stai <b>fermo dietro un muro</b> Pierino non ti vede. Colpi di fila = <b>raffica</b> 🔥 e palla di ghiaccio; negli ultimi 40 secondi arriva la <b>tormenta</b> 🌨️ e ogni colpo vale doppio. Ora si fa sul serio: buona battaglia!', ph: 'fight', at: () => null, ok: G => G.time - (G.tutT || 0) > 8 }];
  window.neveTutorial = () => {
    if (cq.net) { cqToast('🎓 Il tutorial si fa <b>da soli</b>: esci dal set e riprova.'); return; }
    U.tut = 1; const go = document.getElementById('lbGo'); if (go) go.click();
  };
  function tutEnd(G) { G.tutS = TUT.length; G.tutDone = true; G.tutHold = false; const el = document.getElementById('nvTut'); if (el) el.remove(); store.settings.neveTut = 1; saveStore(); if (G.st && G.st.ph === 'fight') G.st.t0 = r2(G.time); }
  function tutTick(G) {
    let el = document.getElementById('nvTut');
    if (!G || G.mode !== 'neve' || !tutOn(G) || G.phase !== 'play' || G.tutS == null || G.tutS >= TUT.length || !G.st) { if (el) el.remove(); return; }
    css(); G.tutHold = true;
    const S = TUT[G.tutS];
    if (G.tutGo !== G.tutS) { G.tutGo = G.tutS; if (S.go) S.go(G); }
    if (!el) { el = document.createElement('div'); el.id = 'nvTut'; el.innerHTML = '<div class="bub"><button type="button">Salta ✕</button><small></small><span></span></div><div class="hl"></div><div class="fg">👆</div>'; ROOT().appendChild(el); el.querySelector('button').onclick = () => { const G2 = cq.g; if (G2) tutEnd(G2); }; }
    if (el.dataset.s !== String(G.tutS)) { el.dataset.s = G.tutS; el.querySelector('span').innerHTML = S.t; el.querySelector('small').textContent = '🎓 Tutorial · ' + (G.tutS + 1) + ' di ' + TUT.length; }
    el.querySelector('.bub').style.top = '96px';
    const tg = S.ph === G.st.ph ? S.at(G) : null, fg = el.querySelector('.fg'), hl = el.querySelector('.hl'), box = ROOT().getBoundingClientRect(); let X = null, Y = null, rw = 0, rh = 0, map = false;
    const scr = (x, y) => { const cv = document.getElementById('cqCanvas').getBoundingClientRect(), vz = cq.vz || 1, V = G.camv; return [cv.left - box.left + (V.tx + (x - y) * V.TW / 2) * vz, cv.top - box.top + (V.ty + (x + y) * V.TW / 4) * vz, V.TW * vz]; };
    if (tg && tg.getBoundingClientRect) { const b = tg.getBoundingClientRect(); if (b.width) { X = b.left + b.width / 2 - box.left; Y = b.top + b.height / 2 - box.top; rw = b.width; rh = b.height; } }
    else if (tg && G.camv) {   // un punto della mappa; con x2/y2 (e x3/y3) il dito fa il gesto da disegnare
      map = true; const pts = [[tg.x, tg.y]]; if (tg.x2 != null) pts.push([tg.x2, tg.y2]); if (tg.x3 != null) pts.push([tg.x3, tg.y3]);
      let u = pts.length > 1 ? (now() * 0.6) % 1.25 : 0; u = Math.min(1, u) * (pts.length - 1); const i = Math.min(pts.length - 2, Math.floor(u)), k = u - Math.max(0, i), A = pts[Math.max(0, i)], B = pts[Math.min(pts.length - 1, Math.max(0, i) + 1)];
      const [px, py, tw] = scr(A[0] + (B[0] - A[0]) * (pts.length > 1 ? k : 0), A[1] + (B[1] - A[1]) * (pts.length > 1 ? k : 0)); X = px; Y = py; rw = rh = tw * 0.9;
    }
    fg.style.display = X == null ? 'none' : ''; hl.style.display = X == null || map ? 'none' : '';
    if (X != null) { const up = Y < box.height - 140; fg.textContent = up ? '👆' : '👇'; fg.style.left = X + 'px'; fg.style.top = (map ? Y - 6 : up ? Y + rh / 2 - 4 : Y - rh / 2 - 52) + 'px'; hl.style.left = (X - rw / 2 - 5) + 'px'; hl.style.top = (Y - rh / 2 - 5) + 'px'; hl.style.width = (rw + 10) + 'px'; hl.style.height = (rh + 10) + 'px'; }
    if (S.ok(G)) { G.tutS++; G.tutT = G.time; SFX.ok(); if (G.tutS >= TUT.length) tutEnd(G); }
  }
  cqEachFrame(() => tutTick(cq.g));

  const RULES = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">📖 Come si gioca</summary><p>Uno contro uno nel <b>giardino innevato</b> dell\'hotel. Vince chi prende per primo <b>2 manche</b>.</p><p><b>1. Il fortino</b> (in segreto, sotto la nevicata): disegna col dito i muri nella tua zona. Hai poca neve, e <b>la stessa neve serve per le palle</b>: quella che avanzi finisce nel mucchio delle scorte 📦 (una palla ogni 2 neve).</p><p><b>2. La tenuta</b>: ogni <b>angolo</b> del muro, ogni <b>asse di legno</b> 🪵 e ogni <b>attacco</b> a un altro muro è un <b>pilastro</b> 🚩. Il pezzo fra due pilastri è una <b>campata</b>: i colpi la crepano e quando cede <b>cade tutta insieme</b>. Un muro lungo e dritto crolla in un colpo solo; uno a zig-zag perde un pezzo alla volta (ma costa più neve). <b>Ripassa</b> un muro per farlo <b>doppio</b>: regge il doppio.</p><p><b>3. La battaglia</b>: ➡️ <b>tiro dritto</b> = veloce, ma <b>il muro lo ferma</b>; 🌙 <b>pallonetto</b> = lento, <b>passa sopra i muri</b>, e la sua <b>ombra</b> avvisa dove cade. Trascini il pulsante all\'indietro come una fionda: più tiri, più va lontano.</p><p><b>4. Le palle</b>: al massimo 3 in mano. Per farne altre ti chini (fermo!) sul tuo mucchio 📦, sui <b>mucchi di neve fresca</b> al centro, o <b>grattando il tuo muro</b> (che si indebolisce).</p><p><b>5.</b> Quando tiri dritto ti <b>sporgi</b>: per un attimo il tuo muro non ti copre. <b>3 colpi</b> e diventi un pupazzo di neve ☃️.</p><p><b>6. Nascosto</b>: se stai <b>fermo</b> (o cammini piano) subito dietro un muro, l\'altro <b>non ti vede</b>: vede solo un ❓ dove eri. Correre o tirare dritto ti scopre. Buttare giù i suoi muri serve anche a <b>scoprirlo</b>.</p><p><b>7. Gli gnomi</b> 🛖: costruisci un <b>igloo</b> (8 neve) e in battaglia ne escono gli gnomi, che <b>costano palle</b> (al massimo 3 in campo; un colpo e sono a terra). Tocchi lo gnomo e poi il punto da attaccare (o lasci scegliere lui). ⛏️ <b>Picconatore</b> (2): scava un muro (quello doppio gli costa il doppio). 🎯 <b>Cecchino</b> (3): entra dai varchi e ti tira da vicino. ☃️ <b>Rotolone</b> (2): spinge una palla che <b>cresce rotolando</b>: se prende un muro <b>di petto</b> lo sfonda, se lo prende <b>di striscio</b> (muro inclinato, a V) <b>scivola via</b>.</p><p><b>8. La raffica</b> 🔥: colpisci l\'altro (o un suo gnomo) <b>3 volte di fila</b> senza fermarti troppo e ti arriva una <b>palla di ghiaccio</b> ❄️: velocissima, e il pezzo di muro che prende <b>crolla tutto</b>.</p><p><b>9. La tormenta</b> 🌨️: negli <b>ultimi 40 secondi</b> arriva la bufera: palle più veloci, mucchi al centro pieni di neve e <b>ogni colpo vale doppio</b>. Chi è sotto può ancora ribaltare tutto!</p><p>Tra una manche e l\'altra il fortino <b>resta</b>: i pezzi crollati restano a terra, le crepe si richiudono, e hai un po\' di neve nuova per ripararlo.</p></details>';

  CQ_MODES.neve = {
    n: 'Battaglia di palle di neve',
    desc: '☃️ Uno contro uno: disegna il fortino (che deve reggere!) e poi palle di neve dritte o a pallonetto.',
    maps: [['neve', 'Giardino innevato']],
    ns: [[2, '2']],
    def: { map: 'neve', n: 2, fill: true },
    opts: () => { css(); const done = store.settings.neveTut; return '<div style="background:rgba(74,122,168,.15);border:1px solid rgba(74,122,168,.5);border-radius:12px;padding:8px 10px;margin:6px 0"><b>' + (done ? '🎓 Vuoi ripassare?' : '🎓 Prima volta? Impara in due minuti!') + '</b><br><small>Una manche da solo contro Pierino, con un dito che ti mostra cosa fare.</small><br><button type="button" onclick="neveTutorial()" style="margin-top:6px;border:0;border-radius:10px;padding:7px 14px;font-weight:800;background:#4a7aa8;color:#fff">🎓 Tutorial</button></div>' + RULES; },
    read: () => ({}),
    start(G) {
      G.opp = G.chars.find(c => c !== G.me) || null;
      G.tut = !!U.tut; U.tut = null; G.tutS = G.tut ? 0 : null; G.tutDone = false; G.tutHold = false; G.wb = []; G.wsN = 0; G.wv = 0; G.bu = new Map(); G.undo = {}; G.wdAck = {};
      for (const c of G.chars) if (c.bot && !c.remote) c.name = 'Pierino';
      clearProps(); G.S = null; G.propSig = null; G.softX = null; G.gn = []; G.gnN = 0;
      Object.assign(U, U0());
      newRound(G, 1, {});
      cq.bg = null;
    },
    gstart(G) { G.opp = G.chars.find(c => c !== G.me) || null; G.st = null; G.S = null; G.propSig = null; G.softX = null; G.wdV = -1; clearProps(); cq.bg = null; G.gn = []; Object.assign(U, U0()); },
    hide: c => { const G = cq.g; return !!(G && G.st && c !== G.me && hiddenFrom(G, mySide(G), c)); },
    intro: () => '☃️ Giardino innevato…',
    voice: () => 1,
    speed: c => { const G = cq.g; if (!G || !G.st || c !== G.me) return 1; return frozenS(G, mySide(G), lt(G)) ? 0 : riding(G, mySide(G)) ? SLED_SP : 1; },
    blk: (G, x, y) => blkAt(G, x, y),
    night: () => ({ a: 0.3, r: 6, lights: LAMPS.map(([x, y]) => [x + 0.5, y + 0.5, 4.2, 0.9]).concat([[15, 1.3, 3, 0.8]]), see: () => true }),
    extras(G) {
      const L = [], st = G.st; if (!st) return L;
      G.__xd = G.__xd || {};
      // (mucchi, scorte e igloo stanno nella mappa pronta: wallCell / objList)
      if (st.sl && st.sl.ph === 'w') { let d = G.__xd.sled; if (!d) { d = G.__xd.sled = (g, X, Y, TW) => sledFig(g, X, Y, TW, 1, -0.785); d.box = [1.0, 1.0, 0.5]; d.top = 0.9; } L.push({ x: st.sl.x, y: st.sl.y, L: null, w: 0, f: 1, name: null, all: true, dr: d }); }
      // gnomi (posizione lisciata su questo telefono) e palle dei rotoloni
      for (const id in U.gp) { const P = U.gp[id], E = P.e; if (!E) continue;
        let d = G.__xd['g' + id]; if (!d) { d = G.__xd['g' + id] = (g, X, Y, TW) => { const q = U.gp[id]; if (q && q.e) gnomeDraw(g, X, Y, TW, q.e[1], q.e[2], q.e[5] === 2 ? 0 : q.e[5], q.e[7], now()); }; d.box = [0.6, 1.2, 0.3]; d.top = 1.0; }
        if (E[5] === 2) { const dx = Math.cos(E[7]), dy = Math.sin(E[7]); let db = G.__xd['b' + id]; if (!db) { db = G.__xd['b' + id] = (g, X, Y, TW) => { const q = U.gp[id]; if (q && q.e) rollBallDraw(g, X, Y, TW, q.e[6], q.rot || 0); }; db.box = [1.1, 1.9, 0.5]; db.top = 1.6; }
          L.push({ x: P.x, y: P.y, L: null, w: 0, f: 1, name: null, all: true, dr: db }); L.push({ x: P.x - dx * (E[6] + 0.22), y: P.y - dy * (E[6] + 0.22), L: null, w: 0, f: 1, name: null, all: true, dr: d }); }
        else L.push({ x: P.x, y: P.y, L: null, w: 0, f: 1, name: null, all: true, dr: d }); }
      return L;
    },
    hud(G) {
      const st = G.st; if (!st) return '☃️'; const sc = st.sc || {}, o = G.opp, s = mySide(G);
      const T = lt(G), left = st.ph === 'build' ? st.bt - (T - st.t0) : st.ph === 'fight' ? FIGHT - (T - st.t0) : 0;
      return `☃️ Manche ${st.n} · 🏆 ${sc[s] || 0}-${sc[1 - s] || 0}${o ? ' ' + esc(o.name) : ''}${st.ph === 'fight' ? ' · ⏱ ' + Math.max(0, Math.ceil(left)) : ''}`;
    },
    big(G) {
      const st = G.st; if (!st) return '⏳ Un attimo…'; const T = lt(G), p = PS(G, G.me);
      if (st.ph === 'build') return p.rd ? '' : T - st.t0 < 3 ? (st.n === 1 ? '✏️ Disegna il tuo fortino!' : '🔧 Ripara il fortino!') : '';
      if (st.ph === 'reveal') return T - st.t0 < 1.4 ? '🌨️ La nevicata si dirada…' : '👀 Ecco il fortino di ' + (G.opp ? G.opp.name : '…') + '!';
      if (st.ph === 'fight') { if (T - st.t0 < 1.2) return '❄️ VIA!'; if (p.d) return ''; if (!tutOn(G)) { const so = T - st.t0 - (FIGHT - STORM); if (so >= 0 && so < 3.5) return '🌨️ TORMENTA! Ogni colpo vale DOPPIO'; if (so > -9 && so < -5) return '🌬️ Sta arrivando la tormenta…'; } if (st.sl && st.sl.ph === 'w' && T - st.sl.t0 < 3) return '🛷 Lo SLITTINO-ARIETE è al centro!'; if (riding(G, mySide(G)) && T - st.sl.t0 < 2.5) return '🛷 Spingi contro i muri per sfondarli!'; if (making(G, mySide(G), T)) return '🫳 Fai una palla…'; return ''; }
      if (st.ph === 'down') { return st.win === mySide(G) ? '☃️ L\'hai sepolto!' : '☃️ Sei un pupazzo di neve!'; }
      if (st.ph === 'mres') return st.msg + (st.fin ? '' : '\nProssima manche tra ' + Math.max(1, Math.ceil(MRES - (T - st.t0))) + '…');
      return '';
    },
    btn(G) {
      const st = G.st; if (!st || st.ph !== 'fight') return null; const s = mySide(G), p = st.p[s], T = lt(G); if (p.d) return null;
      if (making(G, s, T)) return { t: '🫳 …', on: false };
      if (riding(G, s)) return null;
      { const sl = st.sl, P = posOf(G, G.me); if (sl && sl.ph === 'w' && Math.hypot(P.x - sl.x, P.y - sl.y) < 1.3) return { t: '🛷 Sali sullo slittino!', on: true }; }
      const full = p.b >= HAND, src = srcFor(G, s, full); if (!src) return null;
      return { t: src[0] === 's' ? '⚪ Fai palla (scorte)' : src[0] === 'p' ? '⚪ Fai palla' : full ? '🧱 Gratta il muro (per passare)' : '🧱 Gratta il muro', on: true };
    },
    act(G) { const sl = G.st && G.st.sl, P = posOf(G, G.me); if (sl && sl.ph === 'w' && Math.hypot(P.x - sl.x, P.y - sl.y) < 1.3) { if (G.guest) cqNetSend({ k: 'sl' }); else mountSled(G, mySide(G)); return; } myMake(G); },
    view(G) {
      const V = G.vw || (G.vw = { z: 0.86, x: 0, y: 0 }), st = G.st, s = mySide(G); let tx = 0, ty = 0, tz = 0.86, k = 0.1;
      if (st && st.ph === 'build') { const Z = ZONE[s]; tx = (Z.x0 + Z.x1) / 2 + (s ? -0.6 : 0.6) - cq.x; ty = (Z.y0 + Z.y1) / 2 - cq.y; tz = 0.84; }
      else if (st && st.ph === 'reveal') { tx = MID - cq.x; ty = 9 - cq.y; tz = 0.6; k = 0.06; }
      else if (st && (st.ph === 'down' || st.ph === 'mres')) { const P = posOf(G, G.chars[st.win >= 0 ? 1 - st.win : 0]); tx = (P.x - cq.x) * 0.7; ty = (P.y - cq.y) * 0.7; tz = 0.9; k = 0.05; }
      else if (U.aim && U.aim.ok) { tx = (U.aim.x - cq.x) * 0.45; ty = (U.aim.y - cq.y) * 0.45; tz = Math.hypot(U.aim.x - cq.x, U.aim.y - cq.y) > 6 ? 0.72 : 0.84; }
      V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k; return V;
    },
    tick(G, dt) {
      const st = G.st; G.dt = dt;
      for (const c of G.chars) { const P = posOf(G, c); if (c.lx != null && dt > 0) { c.nvx = (c.nvx || 0) * 0.8 + (P.x - c.lx) / dt * 0.2; c.nvy = (c.nvy || 0) * 0.8 + (P.y - c.ly) / dt * 0.2; } c.lx = P.x; c.ly = P.y; }
      for (const c of G.chars) if (c.bot && !c.remote) {
        if (st.ph === 'build') { const i = sideOf(G, c); c.x = START[i][0]; c.y = START[i][1]; c.walk = 0; if (!PSd(G, i).rd && G.time > G.botBuildAt) botBuild(G, c); }
        else if (st.ph === 'fight' && !G.tutHold) botTick(G, c, dt); else { c.walk = 0; c.path = []; } }
      if (st.ph === 'build') {
        const left = st.bt - (G.time - st.t0);
        if ([0, 1].every(s => st.p[s].rd) || left < -0.5) startFight(G);
        return;
      }
      if (st.ph === 'reveal') { if (G.time - st.t0 > REVEAL) { st.ph = 'fight'; st.t0 = r2(G.time); const b = G.chars.find(c => c.bot && !c.remote); if (b) { b.gnT = G.time + 10 + Math.random() * 6 + (1 - piLv(G)) * 14; b.want = null; b.mem = null; b.hidN = 0; const r = G.tut ? null : piRead(); b.style = r ? r[1] : null; if (!G.tut) { if (r && Math.random() < 0.8) st.say = { id: b.id, t: r2(G.time), x: r[0] }; else say(G, b, 'start'); } } } return; }
      if (st.ph === 'fight') {
        { const b = G.chars.find(c => c.bot && !c.remote); if (b && !G.tut && G.time - (G.piT || 0) > 0.25) { G.piT = G.time; const M = piMem(), h = oppOf(G, b); M.tot++; if (hiddenFrom(G, sideOf(G, b), h)) M.hid++; } }
        ballTick(G); makeTick(G); if (st.ph === 'fight') { gnomeTick(G, dt); sledTick(G); }
        if (st.ph === 'fight' && G.time - st.t0 > FIGHT && !tutOn(G)) { const h0 = st.p[0].h, h1 = st.p[1].h; roundEnd(G, h0 < h1 ? 0 : h1 < h0 ? 1 : -1, '⏱ Tempo scaduto: vince chi ha preso meno colpi'); }
        return;
      }
      if (st.ph === 'down') { ballTick(G); if (G.time - st.t0 > DOWN) { const w = st.win, v = 1 - w; roundEnd(G, w, '☃️ ' + G.chars[w].name + ' ha sepolto ' + G.chars[v].name + ' (3 colpi)'); } return; }
      if (st.ph === 'mres') { if (G.time - st.t0 > MRES) { if (st.fin) finalEnd(G); else newRound(G, st.n + 1, st.sc); } }
    },
    local(G, dt) {
      if (!G.st) return;
      // la geometria dei muri: l'host ce l'ha, l'amico la riceve (e la chiede se manca)
      if (G.guest && G.wdS != null && G.wdV !== (G.S && G.S.v)) setGeo(G, G.wdV, decode(G.wdS));
      if (G.guest && G.st.wv && (!G.S || G.S.v !== G.st.wv) && now() - U.wdAsk > 1.2) { U.wdAsk = now(); cqNetSend({ k: 'wd?', v: G.S ? G.S.v : -1 }); }
      if (G.guest && G.S && G.S.v === G.st.wv && G.ackV !== G.S.v) { G.ackV = G.S.v; cqNetSend({ k: 'wda', v: G.S.v }); }
      syncProps(G); stage(G); fxEvents(G); velTick(G, dt); gnUI(G); gnSmooth(G, dt); rideTick(G, dt); feelTick(G);
      if (G.st.ph === 'build') uiTickBuild(G); if (G.st.ph === 'fight') uiTickFight(G);
      if (U.pend && (now() - U.pend.at > 1.5 || (G.S && G.S.v === G.st.wv && G.S.v !== U.pend.v0))) U.pend = null;
    },
    ev(G, c, o) {
      const st = G.st; if (!st) return; const s = sideOf(G, c);
      if (o.k === 'wl' && st.ph === 'build') { const pts = String(o.p || '').split(' ').slice(0, 120).map(t => t.split(',').map(v => +v / 20)).filter(p => p.length === 2 && isFinite(p[0]) && isFinite(p[1])); if (pts.length && ['w', 'a', 'e', 's', 'i'].includes(o.t)) buildAct(G, s, o.t, pts); }
      else if (o.k === 'un' && st.ph === 'build') undo(G, s);
      else if (o.k === 'rdy' && st.ph === 'build') st.p[s].rd = o.on ? 1 : 0;
      else if (o.k === 'th' && st.ph === 'fight' && (o.ty === 'd' || o.ty === 'l')) throwFrom(G, s, o.ty, +o.x || 0, +o.y || 0);
      else if (o.k === 'mk' && st.ph === 'fight') startMake(G, s);
      else if (o.k === 'sl' && st.ph === 'fight') mountSled(G, s);
      else if (o.k === 'ram' && st.ph === 'fight') ram(G, s, Math.round(+o.n), +o.dx || 0, +o.dy || 0);
      else if (o.k === 'gn' && st.ph === 'fight' && GN[o.ty]) spawnGnome(G, s, o.ty, o.x != null ? +o.x : null, o.y != null ? +o.y : null);
      else if (o.k === 'wd?') { G.wdAck[c.id] = -1; }
      else if (o.k === 'wda') { G.wdAck[c.id] = +o.v; }
    },
    snap: G => {
      const need = G.chars.some(c => c.remote && (G.wdAck[c.id] == null || G.wdAck[c.id] !== G.wv)), T = now();
      if (need && T - (G.wdSent || 0) > 0.45) { G.wdSent = T; return { st: G.st, wd: G.wdS, wv: G.wv }; }
      return { st: G.st };
    },
    apply(G, x) { if (x.st) G.st = x.st; if (x.wd != null) { G.wdS = x.wd; G.wdV = x.wv; } },
    draw(c) {
      const G = cq.g, s = sideOf(G, c), L = cqLookOf(c), key = s + (L.skin || '');
      if (c.__dk !== key) {
        c.__dk = key;
        c.__dr = (g, X, Y, TW, L2, w, f) => {
          const G2 = cq.g, st = G2 && G2.st, p = st && st.p ? st.p[sideOf(G2, c)] || {} : {}, T = lt(G2), me = c === G2.me;
          g.fillStyle = 'rgba(40,60,100,.25)'; g.beginPath(); g.ellipse(X, Y, TW * 0.32, TW * 0.13, 0, 0, 7); g.fill();
          if (p.d) { const k = U.bur && U.bur.s === sideOf(G2, c) ? (now() - U.bur.t) / 1.1 : 1; if (k < 0.55) kid(g, X, Y, TW, L2, 0, f, s, { hits: 2 }); snowman(g, X, Y, TW, k, s); return; }
          let ff = f; const o = G2 && oppOf(G2, c); if (o && st && st.ph === 'fight' && !w) { const P = posOf(G2, c), Q = posOf(G2, o), v = (Q.x - P.x) - (Q.y - P.y); if (Math.abs(v) > 0.05) ff = v > 0 ? 1 : -1; }
          const thr = me && U.myThrow ? now() - U.myThrow : (c.__thT ? now() - c.__thT : 9);
          if (st && st.sl && st.sl.ph === 'r' && st.sl.s === sideOf(G2, c)) { sledFig(g, X, Y + TW * 0.05, TW, ff, ff > 0 ? -0.785 : 2.356); g.save(); g.translate(X, Y - TW * 0.16); g.scale(1, 0.86); g.translate(-X, -Y); kid(g, X, Y, TW, L2, 0, ff, s, { hits: Math.min(2, p.h || 0) }); g.restore(); return; }
          kid(g, X, Y, TW, L2, w, ff, s, { cr: st && st.p && making(G2, sideOf(G2, c), T), hits: Math.min(2, p.h || 0), ball: (p.b || 0) > 0 && thr > 0.25, throw: thr < 0.25 ? 1 - thr / 0.25 : 0 });
        };
        c.__dr.top = cqTop(L) + 0.1;
      }
      return c.__dr;
    },
    deco(g, c, X, Y, TW, G) {
      const st = G.st; if (!st || !st.p) return; const s = sideOf(G, c), p = st.p[s] || {}, T = lt(G), L = cqLookOf(c), Hh = TW * (cqTop(L) + 0.1), top = Y - Hh - 14;
      if (p.d || st.ph === 'build') return;
      // colpi presi (☃️ = sepolto al terzo) e palle in mano (le vede anche l'altro: contale!)
      g.save(); g.fillStyle = 'rgba(14,22,40,.6)'; cqRR(g, X - 34, top - 8, 68, 16, 8); g.fill();
      for (let i = 0; i < HITS; i++) { const x = X - 26 + i * 10; g.beginPath(); g.arc(x, top, 4, 0, 7); g.fillStyle = i < p.h ? '#8ac8ff' : 'rgba(255,255,255,.18)'; g.fill(); }
      for (let i = 0; i < HAND; i++) { const x = X + 8 + i * 9; g.beginPath(); g.arc(x, top, 3.6, 0, 7); if (i < (p.b || 0)) { g.fillStyle = '#ffffff'; g.fill(); } else { g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; g.stroke(); } }
      g.restore();
      if (p.mk && p.mk[0] > T) { const tot = MK[p.mk[1]] || 1, k = 1 - (p.mk[0] - T) / tot; g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(X, top - 16, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke(); g.restore(); }
      if (st.say && st.say.id === c.id && T - st.say.t < 3.5 && T >= st.say.t) {
        const t = st.say.x; g.save(); g.font = '600 12.5px system-ui'; const w = Math.min(230, g.measureText(t).width + 18), bx = X - w / 2, by = top - 44;
        g.fillStyle = 'rgba(248,252,255,.96)'; cqRR(g, bx, by, w, 24, 10); g.fill(); g.beginPath(); g.moveTo(X - 6, by + 24); g.lineTo(X + 2, by + 32); g.lineTo(X + 6, by + 24); g.fill();
        g.fillStyle = '#1a2848'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, X, by + 12.5, w - 10); g.restore();
      }
    },
    over(g, G, sx, sy, TW) {
      const t = now(), Uz = TW * 0.575, st = G.st, T = lt(G), s = mySide(G);
      G.camv = { tx: sx(0, 0), ty: sy(0, 0), TW };
      if (!st) return;
      const P3 = (x, y, z) => [sx(x, y), sy(x, y) - z * Uz];
      // COLLAUDO (mentre costruisco): ogni campata colorata (verde corta, gialla media, rossa lunga = crolla tutta insieme), pilastri bianchi
      if ((st.ph === 'build' || st.ph === 'reveal') && G.S) {
        const S = G.S; g.save(); g.lineCap = 'round';
        S.camp.forEach((c) => { if (c.o !== s || c.p) return; const n = c.b.length, col = n <= 3 ? '#3ad870' : n <= 6 ? '#ffd24a' : '#ff5a3a'; g.strokeStyle = col; g.lineWidth = Math.max(3, TW / 10); g.globalAlpha = 0.85; g.beginPath();
          c.b.forEach((i, j) => { const b = S.bl[i], h = (b.k === 2 ? WH2 : WH1) + 0.03, [X, Y] = P3(b.x, b.y, h); j ? g.lineTo(X, Y) : g.moveTo(X, Y); }); if (n === 1) { const b = S.bl[c.b[0]], [X, Y] = P3(b.x, b.y, (b.k === 2 ? WH2 : WH1) + 0.03); g.lineTo(X + 1, Y); } g.stroke(); });
        g.globalAlpha = 1;
        for (let i = 0; i < S.bl.length; i++) { if (!S.pil[i] || S.bl[i].o !== s) continue; const b = S.bl[i], [X, Y] = P3(b.x, b.y, (b.k === 2 ? WH2 : WH1) + 0.2); g.fillStyle = '#ffffff'; g.strokeStyle = '#1a2848'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, Math.max(4, TW / 11), 0, 7); g.fill(); g.stroke(); }
        g.restore();
      }
      if (G.S && st.ph !== 'mres') { const S = G.S; g.save(); g.lineCap = 'round'; for (let i = 0; i < S.bl.length; i++) { const b = S.bl[i]; if (!b.as || !vis(G, b) || !live(G, i)) continue; const h = (b.k === 2 ? WH2 : WH1) * 0.92, A = P3(b.fx, b.fy, 0), B = P3(b.x, b.y, h);
        g.globalAlpha = st.ph === 'build' ? 0.9 : 0.55; g.strokeStyle = '#5a3a20'; g.lineWidth = Math.max(3, TW / 9); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.strokeStyle = '#c8945a'; g.lineWidth = Math.max(1.5, TW / 18); g.beginPath(); g.moveTo(A[0], A[1] - 1); g.lineTo(B[0], B[1] - 1); g.stroke(); } g.restore(); }
      // il tratto che sto disegnando
      if (U.str && U.str.pts.length) { g.save(); g.strokeStyle = U.tool === 'a' ? '#c8945a' : U.tool === 'e' ? '#ff8a7a' : '#ffffff'; g.lineWidth = Math.max(4, TW / 7); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.8; g.setLineDash(U.tool === 'w' ? [] : [6, 6]); g.beginPath(); U.str.pts.forEach(([x, y], i) => { const [X, Y] = P3(x, y, 0.5); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.restore(); }
      if (U.pend && U.pend.t === 'w' && now() - U.pend.at < 1.5) { g.save(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(4, TW / 7); g.lineCap = 'round'; g.beginPath(); U.pend.pts.forEach(([x, y], i) => { const [X, Y] = P3(x, y, 0.5); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.restore(); }
      // palle in volo (con l'ombra a terra: il pallonetto si vede arrivare)
      for (const B of st.B || []) {
        const [, bs, ty, x0, y0, x1, y1, t0, dur] = B, u = Math.max(0, Math.min(1, (T - t0) / dur)), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, d = Math.hypot(x1 - x0, y1 - y0), z = ballZ(ty, u, d);
        if (ty === 'l') { const k = 0.4 + 0.6 * u; g.fillStyle = 'rgba(30,40,80,' + (0.18 + 0.3 * u) + ')'; g.beginPath(); g.ellipse(sx(x1, y1), sy(x1, y1), TW * 0.34 * k, TW * 0.15 * k, 0, 0, 7); g.fill(); if (bs !== s) { g.strokeStyle = 'rgba(255,80,60,' + (0.3 + 0.5 * u) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx(x1, y1), sy(x1, y1), TW * 0.42, TW * 0.19, 0, 0, 7); g.stroke(); } }
        g.fillStyle = 'rgba(30,40,80,.25)'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * 0.1, TW * 0.045, 0, 0, 7); g.fill();
        const [X, Y] = P3(x, y, z), r = Math.max(3.5, TW * 0.085) * (B[10] === 99 ? 1.25 : 1); if (B[10] === 99) { g.fillStyle = 'rgba(140,210,255,.45)'; for (let i = 1; i < 5; i++) { const u2 = Math.max(0, u - i * 0.04), [Xs, Ys] = P3(x0 + (x1 - x0) * u2, y0 + (y1 - y0) * u2, ballZ(ty, u2, d)); g.beginPath(); g.arc(Xs, Ys, r * (1 - i * 0.18), 0, 7); g.fill(); } } g.fillStyle = B[10] === 99 ? '#bfe8ff' : '#ffffff'; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(150,175,210,.6)'; g.beginPath(); g.arc(X + r * 0.25, Y + r * 0.25, r * 0.6, 0, Math.PI); g.fill();
      }
      // LA MIA MIRA: tiro dritto = linea (si ferma dove c'e' un muro: ✖), pallonetto = arco a puntini e cerchio dove cade
      if (st.ph === 'fight' && U.aim && U.aim.ok) {
        const A = U.aim, x0 = cq.x, y0 = cq.y; g.save();
        if (A.ty === 'd') { const skip = n => { const b = G.S.bl[n]; return Math.hypot(b.x - x0, b.y - y0) < LEAN; }, hit = G.S ? traceWall(G, x0, y0, A.x, A.y, skip) : null, ex = hit ? hit.x : A.x, ey = hit ? hit.y : A.y;
          g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(...P3(x0, y0, 1.1)); g.lineTo(...P3(ex, ey, 1.1)); g.stroke(); g.setLineDash([]);
          if (hit) { const [X, Y] = P3(ex, ey, 1.0); g.strokeStyle = '#ff5a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(X - 7, Y - 7); g.lineTo(X + 7, Y + 7); g.moveTo(X + 7, Y - 7); g.lineTo(X - 7, Y + 7); g.stroke(); }
          else { g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(sx(A.x, A.y), sy(A.x, A.y), TW * 0.3, TW * 0.14, 0, 0, 7); g.stroke(); } }
        else { const d = Math.hypot(A.x - x0, A.y - y0); g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 1; i < 14; i++) { const u = i / 14, [X, Y] = P3(x0 + (A.x - x0) * u, y0 + (A.y - y0) * u, ballZ('l', u, d)); g.beginPath(); g.arc(X, Y, 2.4, 0, 7); g.fill(); }
          g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx(A.x, A.y), sy(A.x, A.y), TW * 0.38, TW * 0.17, 0, 0, 7); g.stroke(); }
        g.restore();
      }
      // effetti: sbuffi di neve, pezzi di muro, scritte
      for (const f of U.fx) {
        const a = t - f.t; if (a < 0) continue;
        if (f.k === 'puff' && a < 0.7) for (let i = 0; i < (f.big ? 10 : 6); i++) { const an = i * (6.28 / (f.big ? 10 : 6)), dd = a * (f.big ? 2.2 : 1.5); g.globalAlpha = Math.max(0, 0.9 - a * 1.3); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * dd * 0.35, f.y + Math.sin(an) * dd * 0.35), sy(f.x, f.y) - (0.5 + dd * 0.5 - dd * dd * 0.6) * Uz, TW * (0.05 + a * 0.08), 0, 7); g.fill(); }
        if (f.k === 'chunk' && a < 0.8) for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.3, dd = a * 1.8, X = sx(f.x, f.y) + Math.cos(an) * dd * TW * 0.4, Y = sy(f.x, f.y) - (0.8 + dd * 0.8 - dd * dd * 1.2) * Uz; g.globalAlpha = Math.max(0, 1 - a); g.fillStyle = i % 2 ? '#e2eaf3' : '#ffffff'; g.fillRect(X - 3, Y - 3, 6, 5); }
        if (f.k === 'big' && a < 1.2) { for (let i = 0; i < 14; i++) { const an = i * 0.45, dd = a * 1.6; g.globalAlpha = Math.max(0, 0.85 - a * 0.7); g.fillStyle = '#f2f6fb'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * dd * 0.6, f.y + Math.sin(an) * dd * 0.6), sy(f.x, f.y) - (0.4 + a * 0.7) * Uz, TW * (0.12 + a * 0.18), 0, 7); g.fill(); } }
        g.globalAlpha = 1;
        if (f.k === 'txt' && a < 1.5) { g.save(); g.globalAlpha = Math.min(1, (1.5 - a) * 2); g.font = '900 ' + Math.round(Math.max(13, TW * 0.27)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(14,22,48,.85)'; const X = sx(f.x, f.y), Y = sy(f.x, f.y) - (2.0 + a * 0.6) * Uz; g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
      }
      // fiocchi che cadono (sempre: e' sera e nevica piano)
      { const n = st.ph === 'build' ? 26 : 18; g.fillStyle = '#ffffff'; for (let i = 0; i < n; i++) { const ph = (t * (0.05 + (i % 5) * 0.01) + i / n) % 1, x = (i * 2.37) % W, y = (i * 1.61) % H; g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; g.beginPath(); g.arc(sx(x, y) + Math.sin(t * 0.8 + i) * 10, sy(x, y) - (4 - ph * 4) * Uz, Math.max(1.2, TW / 32), 0, 7); g.fill(); } g.globalAlpha = 1; }
      // LA NEVICATA FITTA sulla meta' dell'altro mentre si costruisce (poi si dirada)
      if (st.ph === 'build' || (st.ph === 'reveal' && T - st.t0 < 2)) {
        const k = st.ph === 'build' ? 1 : Math.max(0, 1 - (T - st.t0) / 2), x0 = s ? -1 : MID + 0.2, x1 = s ? MID - 0.2 : W + 1;
        g.save(); g.globalAlpha = 0.93 * k; g.fillStyle = '#dfe8f3'; g.beginPath(); for (const [x, y] of [[x0, -1], [x1, -1], [x1, H + 1], [x0, H + 1]]) g.lineTo(sx(x, y), sy(x, y) - 0.5 * Uz); g.closePath(); g.fill();
        g.globalAlpha = 0.6 * k; g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const ph = (t * 0.25 + i / 40) % 1, x = x0 + ((i * 3.7) % (x1 - x0)), y = (i * 2.3) % H; g.beginPath(); g.arc(sx(x, y) + Math.sin(t + i) * 8, sy(x, y) - (5 - ph * 5) * Uz, Math.max(2, TW / 14), 0, 7); g.fill(); }
        g.globalAlpha = k; const cx = (x0 + x1) / 2, [X, Y] = P3(cx, 9, 2); g.font = '800 ' + Math.round(Math.max(13, TW * 0.26)) + 'px system-ui'; g.textAlign = 'center'; g.fillStyle = '#4a6a98'; g.fillText('🌨️ nevicata fitta: non si vede cosa costruisce', X, Y);
        g.restore();
      }
      // chi e' NASCOSTO dietro un muro: si vede solo dove l'hai visto l'ultima volta (❓ che sbiadisce)
      if (st.ph === 'fight') for (const c of G.chars) { if (c === G.me) continue; const v = U.seen[c.id]; if (!v || !v.h) continue; const a = now() - v.t; if (a > 7) continue;
        const [X, Y] = P3(v.x, v.y, 1.2); g.save(); g.globalAlpha = Math.max(0.25, 1 - a / 7); g.fillStyle = 'rgba(14,22,48,.75)'; g.beginPath(); g.arc(X, Y, Math.max(11, TW * 0.24), 0, 7); g.fill(); g.font = '800 ' + Math.round(Math.max(13, TW * 0.28)) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('❓', X, Y + 1);
        g.font = '700 ' + Math.round(Math.max(10, TW * 0.17)) + 'px system-ui'; g.fillStyle = '#dfe8ff'; g.fillText('nascosto', X, Y + Math.max(20, TW * 0.42)); g.restore(); }
      if (st.ph === 'fight' && st.sl && st.sl.ph === 'w') { const k = (Math.sin(t * 5) + 1) / 2, X = sx(st.sl.x, st.sl.y), Yg = sy(st.sl.x, st.sl.y); g.save(); g.strokeStyle = 'rgba(255,210,74,' + (0.5 + 0.4 * k) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Yg, TW * (0.7 + 0.15 * k), TW * (0.32 + 0.07 * k), 0, 0, 7); g.stroke();
        const [Xb, Yb] = P3(st.sl.x, st.sl.y, 1.6 + 0.15 * k); g.fillStyle = 'rgba(14,22,48,.8)'; g.beginPath(); g.arc(Xb, Yb, Math.max(12, TW * 0.26), 0, 7); g.fill(); g.font = Math.round(Math.max(14, TW * 0.3)) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🛷', Xb, Yb + 1); g.restore(); }
      // gnomo scelto: aspetta il tocco sul bersaglio
      if (U.gsel) { const D = GN[U.gsel.ty], k = Math.max(0, 1 - (now() - U.gsel.t) / 3.5); g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const w = Math.min(cq.w - 24, 340), x0 = (cq.w - w) / 2, y0 = 118;
        g.fillStyle = 'rgba(20,40,24,.88)'; cqRR(g, x0, y0, w, 44, 14); g.fill(); g.fillStyle = '#ffd24a'; g.fillRect(x0 + 10, y0 + 37, (w - 20) * k, 3);
        g.fillStyle = '#fff'; g.font = '800 13.5px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👆 Tocca dove mandare il ' + D.ico + ' ' + D.n, cq.w / 2, y0 + 14); g.font = '600 11.5px system-ui'; g.fillStyle = '#cfe8c8'; g.fillText('(se non tocchi, sceglie lui il punto più debole)', cq.w / 2, y0 + 28); g.restore(); }
      if (st.ph === 'fight' && stormOn(G, T)) { const k = Math.min(1, (T - st.t0 - (FIGHT - STORM)) / 2); g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.fillStyle = 'rgba(220,232,248,' + 0.13 * k + ')'; g.fillRect(0, 0, cq.w, cq.h);
        g.strokeStyle = 'rgba(255,255,255,' + 0.75 * k + ')'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 70; i++) { const ph = (t * (0.9 + (i % 7) * 0.08) + i * 0.137) % 1, x = ((i * 97) % 100) / 100 * cq.w * 1.3 - ph * cq.w * 0.5, y = ph * cq.h * 1.1 - 20; g.moveTo(x, y); g.lineTo(x - 16, y + 6); } g.stroke(); g.restore(); }
      if (U.slow && t - U.slow < 2.4) { const k = Math.min(1, (t - U.slow) * 3) * Math.min(1, (2.4 - (t - U.slow)) * 2), W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7); gr.addColorStop(0, 'rgba(10,20,50,0)'); gr.addColorStop(1, 'rgba(10,20,50,' + 0.6 * k + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
      // scossa dello schermo
      if (U.shake && t - U.shake < 0.3) { const k = 1 - (t - U.shake) / 0.3; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.fillStyle = 'rgba(255,255,255,' + 0.18 * k + ')'; g.fillRect(0, 0, cq.w, cq.h); g.restore(); }
    }
  };
  // mucchio di neve fresca (i 6 al centro) o delle scorte (o = 1 rosso, 2 blu: col paletto colorato)
  function pileDraw(g, X, Y, TW, n, o) {
    const K = iso(g, X, Y, TW), k = Math.max(0, Math.min(1, n / (o ? STOCK_MAX : PILE_MAX)));
    g.fillStyle = '#cbd7e5'; g.beginPath(); g.ellipse(X, Y, TW * 0.5, TW * 0.22, 0, 0, 7); g.fill();
    if (n <= 0) { g.fillStyle = '#d4dfeb'; g.beginPath(); g.ellipse(X, Y, TW * 0.36, TW * 0.15, 0, 0, 7); g.fill(); }
    else { const h = 0.15 + 0.45 * k, r = 0.28 + 0.2 * k; K.cyl(0, 0, r, 0, h * 0.6, '#e8eff7'); g.fillStyle = '#f6f9fd'; const [Xa, Ya] = K.S(0, 0, h * 0.6); g.beginPath(); g.ellipse(Xa, Ya, r * TW * 0.707, r * TW * 0.3535 + h * TW * 0.25, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(Xa, Ya, r * TW * 0.707, r * TW * 0.3535, 0, 0, 7); g.fill(); }
    if (o) { const c = SIDE[o - 1].c; K.bx(0.28, -0.05, 0.33, 0, 0, 0.75, '#4a3424'); const [Xf, Yf] = K.S(0.3, -0.03, 0.75); g.fillStyle = c; g.beginPath(); g.moveTo(Xf, Yf); g.lineTo(Xf + TW * 0.18, Yf + TW * 0.06); g.lineTo(Xf, Yf + TW * 0.12); g.fill();
      if (n > 0) { g.font = '800 ' + Math.round(Math.max(10, TW * 0.2)) + 'px system-ui'; g.textAlign = 'center'; g.fillStyle = '#1a2848'; g.fillText(n, X, Y - TW * 0.32); } }
    else if (n > 0) { for (let i = 0; i < Math.min(3, n); i++) { const [Xb, Yb] = K.S(-0.15 + i * 0.15, 0.2, 0.08); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Xb, Yb, TW * 0.055, 0, 7); g.fill(); } }
  }

  // IGLOO: cupola di blocchi di neve con l'entrata verso l'altro (s = lato), crepe secondo la salute
  function iglooDraw(g, X, Y, TW, s, hp) {
    const R = IG_R * TW * 0.74, Hh = TW * 0.62, f = s ? -1 : 1;
    g.fillStyle = '#c6d2e2'; g.beginPath(); g.ellipse(X, Y + 2, R * 1.1, R * 0.5, 0, 0, 7); g.fill();
    const dome = () => { g.beginPath(); g.ellipse(X, Y, R, R * 0.48, 0, 0, Math.PI); g.lineTo(X - R, Y); g.ellipse(X, Y, R, Hh + R * 0.1, 0, Math.PI, 0); g.closePath(); };
    g.fillStyle = '#d2deeb'; dome(); g.fill();
    g.fillStyle = '#b8c8dc'; g.beginPath(); g.ellipse(X, Y, R, Hh + R * 0.1, 0, -Math.PI / 2, 0); g.lineTo(X + R, Y); g.ellipse(X, Y, R, R * 0.48, 0, 0, Math.PI / 2); g.lineTo(X, Y - Hh); g.fill();   // lato in ombra
    g.strokeStyle = '#7f96b4'; g.lineWidth = Math.max(1.5, TW / 26); dome(); g.stroke();
    g.fillStyle = '#f4f8fc'; g.beginPath(); g.ellipse(X - R * 0.2, Y - Hh * 0.45, R * 0.62, Hh * 0.62, -0.2, Math.PI * 1.05, Math.PI * 1.9); g.lineTo(X - R * 0.2, Y - Hh * 0.2); g.fill();
    g.strokeStyle = '#b4c4d8'; g.lineWidth = Math.max(1, TW / 45); g.beginPath();
    for (const k of [0.3, 0.58, 0.82]) { const ry = Hh * k, rx = R * Math.sqrt(1 - k * k * 0.9); g.moveTo(X - rx, Y - ry); g.quadraticCurveTo(X, Y - ry + Hh * 0.08, X + rx, Y - ry); }
    for (const [k, u] of [[0.15, -0.5], [0.15, 0.1], [0.15, 0.65], [0.44, -0.25], [0.44, 0.38], [0.7, 0.05]]) { const y0 = Y - Hh * k, x0 = X + u * R * Math.sqrt(1 - k * k); g.moveTo(x0, y0); g.lineTo(x0, y0 - Hh * 0.22); }
    g.stroke();
    // l'entrata (tunnel) verso l'altro
    const ex = X + f * R * 0.62, ey = Y + R * 0.22; g.fillStyle = '#e8eff7'; g.beginPath(); g.ellipse(ex, ey - Hh * 0.18, R * 0.38, Hh * 0.36, 0, Math.PI, 0); g.lineTo(ex + R * 0.38, ey); g.lineTo(ex - R * 0.38, ey); g.fill();
    g.fillStyle = '#1e2a40'; g.beginPath(); g.ellipse(ex + f * R * 0.04, ey - Hh * 0.08, R * 0.22, Hh * 0.26, 0, Math.PI, 0); g.lineTo(ex + f * R * 0.04 + R * 0.22, ey); g.lineTo(ex + f * R * 0.04 - R * 0.22, ey); g.fill();
    g.fillStyle = '#8a7a5a'; g.beginPath(); g.ellipse(ex + f * R * 0.04, ey - Hh * 0.02, R * 0.12, Hh * 0.08, 0, 0, 7); g.fill();
    // bandierina del lato
    g.strokeStyle = '#4a3424'; g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); g.moveTo(X, Y - Hh - R * 0.08); g.lineTo(X, Y - Hh - TW * 0.42); g.stroke();
    g.fillStyle = SIDE[s].c; g.beginPath(); g.moveTo(X, Y - Hh - TW * 0.42); g.lineTo(X + TW * 0.22, Y - Hh - TW * 0.35); g.lineTo(X, Y - Hh - TW * 0.27); g.fill();
    if (hp < IG_HP) { g.strokeStyle = '#3a5a8a'; g.lineWidth = 1.8; g.beginPath(); for (let i = 0; i < IG_HP - hp; i++) { const x0 = X + (i - 1) * R * 0.45, y0 = Y - Hh * 0.85; g.moveTo(x0, y0); g.lineTo(x0 + 4, y0 + Hh * 0.25); g.lineTo(x0 - 2, y0 + Hh * 0.45); g.lineTo(x0 + 3, y0 + Hh * 0.65); } g.stroke(); }
  }
  // GNOMO (piccolo, col cappello a punta del colore del lato e la barba bianca); st 1 = lavora (picchia, mira), a = direzione
  function gnomeDraw(g, X, Y, TW, s, ty, st, a, t) {
    const u = TW / 34 * 0.62, f = Math.cos(a) - Math.sin(a) >= 0 ? 1 : -1, bob = st === 0 ? Math.abs(Math.sin(t * 12)) * 2 : 0, S2 = SIDE[s];
    g.save(); g.translate(X, Y); g.scale(u, u);
    g.fillStyle = 'rgba(40,60,100,.28)'; g.beginPath(); g.ellipse(0, 0, 13, 5, 0, 0, 7); g.fill();
    g.translate(0, -bob);
    g.fillStyle = '#3a2a20'; for (const x of [-5, 4]) { g.beginPath(); g.ellipse(x * f, -2, 5, 3.2, 0, 0, 7); g.fill(); }
    g.fillStyle = ty === 'p' ? '#6a4a2a' : ty === 'c' ? '#3a6a4a' : '#5a5a8a'; g.beginPath(); g.ellipse(0, -13, 10, 11, 0, 0, 7); g.fill();
    g.fillStyle = '#2a1a10'; g.fillRect(-10, -12, 20, 3);
    g.fillStyle = '#f2c8a0'; g.beginPath(); g.arc(f * 1.5, -27, 7, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(f * 1.5 - 7, -26); g.quadraticCurveTo(f * 1.5, -8, f * 1.5 + 7, -26); g.quadraticCurveTo(f * 1.5, -21, f * 1.5 - 7, -26); g.fill();
    g.fillStyle = '#e8786a'; g.beginPath(); g.arc(f * 5.5, -26, 2.6, 0, 7); g.fill();
    g.fillStyle = '#1a1a22'; g.beginPath(); g.arc(f * 4.2, -29.5, 1.1, 0, 7); g.fill();
    g.fillStyle = S2.c; g.beginPath(); g.moveTo(f * 1.5 - 8.5, -31); g.lineTo(f * 1.5 + 8.5, -31); g.quadraticCurveTo(f * 6, -44, -f * 3, -52); g.closePath(); g.fill();
    g.fillStyle = S2.c2; g.fillRect(f * 1.5 - 8.5, -32.5, 17, 2.5);
    if (ty === 'p') {   // piccone (picchia quando lavora)
      g.save(); g.translate(f * 8, -16); g.rotate(f * (st === 1 ? -0.9 + Math.abs(Math.sin(t * 7)) * 1.6 : 0.4)); g.fillStyle = '#7a5a3a'; g.fillRect(-1.2, -16, 2.4, 18); g.fillStyle = '#9aa4ae'; g.beginPath(); g.moveTo(-9 * f, -15); g.quadraticCurveTo(0, -20, 9 * f, -13); g.lineTo(0, -16); g.closePath(); g.fill(); g.restore();
    } else if (ty === 'c') {   // fionda con la palla
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(f * 8, -12); g.lineTo(f * 10, -22); g.moveTo(f * 10, -22); g.lineTo(f * 7, -27); g.moveTo(f * 10, -22); g.lineTo(f * 13, -27); g.stroke();
      if (st === 1) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f * 10, -27, 3, 0, 7); g.fill(); }
    } else { g.fillStyle = '#f2c8a0'; for (const y of [-17, -11]) { g.beginPath(); g.arc(f * 10, y, 2.6, 0, 7); g.fill(); } }   // braccia avanti (spinge)
    g.restore();
  }
  // lo SLITTINO-ARIETE sullo schermo: slitta rossa con il musone d'ariete davanti e il cannoncino per le palle grosse (f = verso, a = direzione nella mappa)
  function sledFig(g, X, Y, TW, f, a) {
    const K = iso(g, X, Y, TW); g.fillStyle = 'rgba(40,60,100,.28)'; g.beginPath(); g.ellipse(X, Y, TW * 0.55, TW * 0.22, 0, 0, 7); g.fill();
    sledDraw(K, 0, 0, a);
    const c = Math.cos(a), s2 = Math.sin(a), P = (u, v, z) => K.S(c * u - s2 * v, s2 * u + c * v, z);
    K.poly([P(0.42, -0.24, 0.2), P(0.62, 0, 0.32), P(0.42, 0.24, 0.2), P(0.42, 0.24, 0.42), P(0.62, 0, 0.5), P(0.42, -0.24, 0.42)], '#7a5a3a');   // musone dell'ariete
    const A = P(-0.1, 0, 0.42), B = P(0.5, 0, 0.62); g.strokeStyle = '#2a2e3a'; g.lineWidth = Math.max(4, TW / 6); g.lineCap = 'round'; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(B[0], B[1], Math.max(3, TW * 0.07), 0, 7); g.fill();
    g.fillStyle = '#ffd24a'; for (const v of [-0.2, 0.2]) { const [Xc, Yc] = P(-0.42, v, 0.3); g.beginPath(); g.arc(Xc, Yc, Math.max(2, TW * 0.04), 0, 7); g.fill(); }   // campanelli
  }
  // la palla del rotolone: tonda, gira rotolando (r in caselle)
  function rollBallDraw(g, X, Y, TW, r, rot) {
    const R = r * TW * 0.78, cy = Y - R * 0.95;
    g.fillStyle = 'rgba(40,60,100,.28)'; g.beginPath(); g.ellipse(X, Y, R * 1.05, R * 0.42, 0, 0, 7); g.fill();
    g.fillStyle = '#eef3f9'; g.beginPath(); g.arc(X, cy, R, 0, 7); g.fill();
    g.fillStyle = 'rgba(150,175,210,.45)'; g.beginPath(); g.arc(X + R * 0.2, cy + R * 0.2, R * 0.82, -0.4, 2.2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X - R * 0.35, cy - R * 0.35, R * 0.28, 0, 7); g.fill();
    g.strokeStyle = 'rgba(120,150,190,.5)'; g.lineWidth = Math.max(1.2, R / 10); g.beginPath(); for (let i = 0; i < 3; i++) { const a = rot + i * 2.1; g.moveTo(X + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3); g.lineTo(X + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); } g.stroke();
  }
  // ---- disegnare col dito: nella fase del fortino il tocco sulla mappa costruisce (niente camminata) ----
  { const root = document.getElementById('ciack');
    if (root && !root.__nvPtr) { root.__nvPtr = 1; let dr = null;
      const can = G => G && G.mode === 'neve' && G.phase === 'play' && G.pre <= 0 && G.st && G.st.ph === 'build' && !PS(G, G.me).rd;
      root.addEventListener('pointerdown', e => {
        const G = cq.g; if (!can(G) || !e.target || e.target.id !== 'cqCanvas') return;
        e.stopPropagation(); e.preventDefault(); const p = toMap(G, e.clientX, e.clientY); if (!p) return;
        const s = mySide(G); dr = { id: e.pointerId, pts: [clampZ(s, p[0], p[1])] }; U.str = dr; try { e.target.setPointerCapture(e.pointerId); } catch {}
      }, true);
      root.addEventListener('pointermove', e => {
        if (!dr || dr.id !== e.pointerId) return; e.stopPropagation(); const G = cq.g; if (!can(G)) { dr = null; U.str = null; return; }
        const p = toMap(G, e.clientX, e.clientY); if (!p) return; const q = clampZ(mySide(G), p[0], p[1]), l = dr.pts[dr.pts.length - 1];
        if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= 0.16 && dr.pts.length < 240) dr.pts.push(q);
      }, true);
      const up = e => { if (!dr || dr.id !== e.pointerId) return; e.stopPropagation(); const d = dr; dr = null; U.str = null; const G = cq.g; if (e.type === 'pointerup' && can(G)) myBuild(G, U.tool, d.pts); };
      root.addEventListener('pointerup', up, true); root.addEventListener('pointercancel', up, true);
      // gnomo scelto: il prossimo tocco sulla mappa e' il bersaglio (niente camminata)
      let gt = null;
      root.addEventListener('pointerdown', e => { const G = cq.g; if (!U.gsel || !G || G.mode !== 'neve' || !G.st || G.st.ph !== 'fight' || !e.target || e.target.id !== 'cqCanvas') return; e.stopPropagation(); e.preventDefault(); gt = { id: e.pointerId, x: e.clientX, y: e.clientY }; }, true);
      root.addEventListener('pointerup', e => { if (!gt || gt.id !== e.pointerId) return; e.stopPropagation(); gt = null; const G = cq.g; if (!U.gsel || !G || !G.st) return; const p = toMap(G, e.clientX, e.clientY); if (p) sendGnome(G, U.gsel.ty, p[0], p[1]); }, true);
    } }
  // esce dalla partita: via i pannelli e i pulsanti
  cqEachFrame(() => { const G = cq.g; if ((!G || G.mode !== 'neve' || G.phase !== 'play') && (document.getElementById('nvBuild') || document.getElementById('nvD'))) { buildUI(G || {}, false); fightUI(G || {}, false); U.ph = ''; } });
  window.__neve = { piRead, piMem, TUT, sledTick, mountSled, ram, riding, botRide, SLED_AT, spawnGnome, gnomeTick, hiddenFrom, coveredFrom, placeIgloo, iglooOf, launchFor, pickDig, chooseGnome, threatGnome, GN, U, ZONE, START, PILES, FORTS, mapNeve, structure, resample, addStroke, addAsse, eraseAt, undo, placeStock, buildAct, startFight, throwFrom, startMake, srcFor, ballTick, hitWall, blockAt, blkAt, traceWall, encode, decode, botBuild, botTick, newRound, live, salOf, mySide, SFX, PS, lt, myThrow, myBuild, myReady, aimFrom, toMap };
})();
