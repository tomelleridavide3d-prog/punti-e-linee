// Duello degli alchimisti (gioco 1 contro 1, vedi CLAUDE.md "MINIGIOCO Duello degli alchimisti").
// Passo 1: la TORRE DEI MAGHI (laboratorio tondo, voragine luminosa, ripari, calderoni di ricarica), alchimisti col cappello a punta, online in 2.
// Passo 2: le POZIONI calcolate dalle proprieta' degli ingredienti (ING, EL, REACT, brew) e la PREPARAZIONE al calderone. Duello nei passi dopo.
(() => {
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const HP = 3, TIME = 120;

  // ---- LA TORRE: una stanza tonda (raggio RAD) in una griglia N x N; al centro la voragine (PIT) con il bordo di pietra scolpita (RIM) ----
  // In fondo (x + y piccoli, in alto sullo schermo) i muri sono alti con librerie, finestre e torce; davanti sono bassi (si vede dentro).
  const N = 21, C = 10.5, RAD = 8.6, PIT = 2.25, RIM = 3.05, HT = 2.7, HL = 0.5;
  const dC = (x, y) => Math.hypot(x + 0.5 - C, y + 0.5 - C);
  const inside = (x, y) => dC(x, y) <= RAD;
  const isPit = (x, y) => dC(x, y) <= PIT;
  const back = (x, y) => x + y <= 2 * C - 1;
  // i due angoli (simmetrici rispetto al centro): A in fondo, B davanti; accanto a ognuno il suo calderone di ricarica
  const SPAWN = [[6.5, 6.5], [14.5, 14.5]], KETTLE = [[5, 7], [15, 13]];
  const SIDE = [{ hat: '#4a2a7a', hat2: '#6a3fa8', band: '#e8c050', liq: '#b07aff' }, { hat: '#1f5a4a', hat2: '#2f7a64', band: '#d8dce8', liq: '#5ae0a0' }];
  // ripari (simmetrici: ogni riparo ha il suo gemello dall'altra parte del centro)
  const COVER = [['pillar', 5, 14], ['pillar', 15, 6], ['bench', 8, 6], ['bench', 12, 14], ['books', 6, 9], ['books', 14, 11], ['barrel', 9, 15, '#6a4a2e'], ['barrel', 11, 5, '#6a4a2e']];
  const COLS = { lab: ['#4a4555', '#46414f'], rim: ['#6b6377', '#665e71'] };
  const WC = '#575064';

  // muri decorati in fondo (scelti in ordine lungo il giro) e oggetti lungo il bordo; luci per il buio
  let WD = {}, LIGHTS = [];
  const WSEQ = ['shelf', 'torch', 'win', 'shelf', 'banner', 'potions', 'torch', 'chart', 'win', 'shelf', 'banner', 'torch', 'potions', 'shelf', 'win', 'chart'];
  const BSEQ = ['cauldron', 'globe', 'crystal', 'shelfp', 'owl', 'chest', 'telescope', 'skull', 'shelfp', 'books', 'cauldron2', 'crystal'];
  const FSEQ = ['candles', 'barrel', 'books', 'crate', 'candles', 'sack'];
  const ang = (x, y) => { let a = Math.atan2(y + 0.5 - C, x + 0.5 - C); if (a < -Math.PI * 0.75) a += Math.PI * 2; return a; };   // da sinistra, passando dal fondo, fino a destra

  function mapTorre() {
    const rooms = [], props = [];
    for (let y = 0; y < N; y++) {
      let cur = null;
      for (let x = 0; x < N; x++) {
        const k = inside(x, y) ? (dC(x, y) <= RIM && !isPit(x, y) ? 'rim' : 'lab') : null;
        if (cur && cur.k === k && k) { cur.w++; continue; }
        cur = k ? { n: 'Laboratorio', x, y, w: 1, h: 1, vk: k, k, c: COLS[k], wc: WC, nl: 1 } : null;
        if (cur) rooms.push(cur);
      }
    }
    const taken = new Set(), put = (t, x, y, o) => { props.push([t, x, y, o]); taken.add(x + ',' + y); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isPit(x, y)) put('pit', x, y);
    COVER.forEach(([t, x, y, o]) => put(t, x, y, o));
    KETTLE.forEach(([x, y], i) => put('kettle', x, y, { s: i }));
    const wall = (x, y) => !inside(x, y);
    const near = (x, y, L, r) => L.some(([a, b]) => Math.hypot(x + 0.5 - a, y + 0.5 - b) < r);
    const keep = SPAWN.concat(KETTLE.map(([a, b]) => [a + 0.5, b + 0.5]));
    // bordo: caselle libere che toccano il muro, in ordine lungo il giro
    const edge = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y) && !taken.has(x + ',' + y) && (wall(x - 1, y) || wall(x + 1, y) || wall(x, y - 1) || wall(x, y + 1))) edge.push([x, y]);
    edge.sort((a, b) => ang(a[0], a[1]) - ang(b[0], b[1]));
    let bi = 0, fi = 0, k = 0;
    for (const [x, y] of edge) {
      if (near(x, y, keep, 2.4)) continue;
      if (k++ % 2) continue;   // uno si' e uno no: si passa lungo il muro
      if (x + y <= 2 * C - 2) put(BSEQ[bi++ % BSEQ.length], x, y);
      else if (x + y >= 2 * C + 1 && fi < 9 && k % 3 === 1) put(FSEQ[fi++ % FSEQ.length], x, y);
    }
    // muri decorati: quelli di fondo che guardano una casella libera
    WD = {}; let wi = 0;
    const wl = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (wall(x, y) && back(x, y) && (inside(x, y + 1) || inside(x + 1, y))) wl.push([x, y]);
    wl.sort((a, b) => ang(a[0], a[1]) - ang(b[0], b[1]));
    for (const [x, y] of wl) WD[x + ',' + y] = WSEQ[wi++ % WSEQ.length];
    // luci (per il buio): voragine, torce, finestre, sfere di cristallo, calderoni
    LIGHTS = [[C, C, 4.6, 1]];
    for (const [key, t] of Object.entries(WD)) { const [x, y] = key.split(',').map(Number), fy = inside(x, y + 1); if (t === 'torch') LIGHTS.push([fy ? x + 0.5 : x + 1.4, fy ? y + 1.4 : y + 0.5, 3.2, 0.85]); else if (t === 'win') LIGHTS.push([fy ? x + 0.5 : x + 1.4, fy ? y + 1.4 : y + 0.5, 2.2, 0.4]); }
    for (const [t, x, y] of props) if (t === 'crystal' || t === 'kettle' || t === 'cauldron' || t === 'cauldron2' || t === 'candles' || t === 'bench') LIGHTS.push([x + 0.5, y + 0.5, t === 'candles' ? 1.8 : 2.4, 0.6]);
    return { w: N, h: N, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring: [[6, 6], [14, 14]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Laboratorio: 'nel laboratorio' }, help: '', btnTxt: '', sabTxt: '',
      pxProp: drawFurn, drawWall, floor: { lab: floorLab, rim: floorRim },
      bg: () => '#0c0a16' };   // dietro la torre: il cielo di notte
  }
  CQ_MAPS.torre = { n: 'Torre dei maghi', make: mapTorre, only: 'alchimisti' };

  // ---- PAVIMENTI (si disegnano una volta sola nella mappa pronta: qui le trasparenze vanno bene) ----
  const clipCell = (K, x, y) => { const { g, S } = K; g.save(); g.beginPath(); for (const [i, p] of [S(x, y, 0), S(x + 1, y, 0), S(x + 1, y + 1, 0), S(x, y + 1, 0)].entries()) i ? g.lineTo(...p) : g.moveTo(...p); g.closePath(); g.clip(); };
  const ring = (K, r, col, w) => { const { g, S, TW } = K, [X, Y] = S(C, C, 0); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(X, Y, r * TW * 0.7071, r * TW * 0.3536, 0, 0, 7); g.stroke(); };
  // simboli alchemici sul cerchio magico (in coordinate della mappa: si deformano con la prospettiva come se fossero dipinti a terra)
  function glyph(K, cx, cy, s, k, col) {
    const { S, strokes, lw } = K, P = (a, b) => S(cx + a * s, cy + b * s, 0), L = [];
    const circ = (r, n = 10) => { for (let i = 0; i < n; i++) { const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283; L.push([P(Math.cos(a0) * r, Math.sin(a0) * r), P(Math.cos(a1) * r, Math.sin(a1) * r)]); } };
    if (k === 0) { circ(0.5); L.push([P(0, -0.5), P(0, -1)], [P(-0.25, -0.75), P(0.25, -0.75)]); }   // zolfo
    else if (k === 1) L.push([P(-0.6, 0.45), P(0.6, 0.45)], [P(0.6, 0.45), P(0, -0.6)], [P(0, -0.6), P(-0.6, 0.45)]);   // fuoco
    else if (k === 2) { L.push([P(-0.6, -0.45), P(0.6, -0.45)], [P(0.6, -0.45), P(0, 0.6)], [P(0, 0.6), P(-0.6, -0.45)], [P(-0.4, 0), P(0.4, 0)]); }   // terra
    else if (k === 3) { circ(0.55); L.push([P(-0.55, 0), P(0.55, 0)], [P(0, -0.55), P(0, 0.55)]); }   // sale
    else { for (let i = 0; i < 6; i++) { const a0 = 1.2 + i / 6 * 3.9, a1 = 1.2 + (i + 1) / 6 * 3.9; L.push([P(Math.cos(a0) * 0.55, Math.sin(a0) * 0.55), P(Math.cos(a1) * 0.55, Math.sin(a1) * 0.55)]); } }   // luna
    strokes(L, col, lw * 1.6);
  }
  function floorLab(K, x, y) {
    const { hsh, strokes, S, speck, TW } = K, P = (u, v) => S(x + u, y + v, 0);
    // lastre di pietra grandi (2x2 caselle, sfalsate) con qualche crepa
    const bx2 = (x + (y >> 1)) % 2, by2 = y % 2;
    const L = []; if (!bx2) L.push([P(0, 0), P(0, 1)]); if (!by2) L.push([P(0, 0), P(1, 0)]);
    strokes(L, 'rgba(0,0,0,.35)', Math.max(1.5, TW / 40));
    speck(x, y, 5, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.16)'], TW / 22);
    if (hsh(x, y, 61) < 0.12) { const a = P(0.2, 0.3 + 0.4 * hsh(x, y, 62)), b = P(0.5, 0.55), c = P(0.85, 0.4 + 0.4 * hsh(x, y, 63)); strokes([[a, b], [b, c]], 'rgba(0,0,0,.3)'); }
    // il CERCHIO MAGICO intorno alla voragine (doppio anello con i simboli)
    const d = dC(x, y);
    if (d > 3.4 && d < 5.8) {
      clipCell(K, x, y);
      ring(K, 4.0, 'rgba(176,150,255,.4)', Math.max(1.5, TW / 34)); ring(K, 5.05, 'rgba(176,150,255,.4)', Math.max(1.5, TW / 34)); ring(K, 5.25, 'rgba(176,150,255,.22)', Math.max(1, TW / 60));
      for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283 + 0.16, gx = C + Math.cos(a) * 4.52, gy = C + Math.sin(a) * 4.52; if (Math.abs(gx - x - 0.5) < 1.3 && Math.abs(gy - y - 0.5) < 1.3) glyph(K, gx, gy, 0.26, i % 5, 'rgba(190,168,255,.55)'); }
      K.g.restore();
    }
  }
  function floorRim(K, x, y) {
    const { g, strokes, S, TW } = K;
    clipCell(K, x, y);
    // blocchi scolpiti a raggiera, con le rune azzurre che brillano
    const L = []; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; L.push([S(C + Math.cos(a) * PIT, C + Math.sin(a) * PIT, 0), S(C + Math.cos(a) * RIM, C + Math.sin(a) * RIM, 0)]); }
    strokes(L, 'rgba(0,0,0,.4)', Math.max(1.5, TW / 40));
    ring(K, RIM - 0.02, 'rgba(0,0,0,.5)', Math.max(2, TW / 26)); ring(K, 2.68, 'rgba(255,255,255,.07)', Math.max(1, TW / 50));
    for (let i = 0; i < 18; i++) { const a = (i + 0.5) / 18 * 6.283, [X, Y] = S(C + Math.cos(a) * 2.68, C + Math.sin(a) * 2.68, 0); g.fillStyle = 'rgba(140,230,255,.75)'; g.beginPath(); g.ellipse(X, Y, TW * 0.05, TW * 0.025, 0, 0, 7); g.fill(); }
    g.restore();
  }

  // ---- LA VORAGINE: ogni casella disegna, dentro il suo rombo, tutto quello che si vede del pozzo (pareti che scendono e luce in fondo).
  // E' un "oggetto" della mappa (blocca il passo); si ridisegna sopra lo sfondo, ma e' tutto pieno: non si somma niente ----
  const DEEP = 3.2;
  let PITF = null;
  function pitFaces() {
    if (PITF) return PITF;
    PITF = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!isPit(x, y)) continue;
      if (!isPit(x - 1, y)) PITF.push({ a: [x, y], b: [x, y + 1], ex: 1, m: x + y + 0.5 });
      if (!isPit(x, y - 1)) PITF.push({ a: [x, y], b: [x + 1, y], ex: 0, m: x + y + 0.5 });
    }
    PITF.sort((p, q) => p.m - q.m);
    return PITF;
  }
  function pitDraw(K, x, y) {
    const { g, S, TW } = K;
    clipCell(K, x, y);
    const [BX, BY] = S(C, C, -DEEP), gr = g.createRadialGradient(BX, BY, 0, BX, BY, TW * 2.4);
    gr.addColorStop(0, '#f0ecff'); gr.addColorStop(0.35, '#a796f4'); gr.addColorStop(1, '#3a2f6e');
    g.fillStyle = gr; g.fillRect(BX - TW * 4, BY - TW * 4, TW * 8, TW * 8);
    for (const f of pitFaces()) {
      const [ax, ay] = f.a, [bx, by] = f.b, t0 = S(ax, ay, 0), t1 = S(bx, by, 0), b1 = S(bx, by, -DEEP), b0 = S(ax, ay, -DEEP);
      const lg = g.createLinearGradient(t0[0], t0[1], b0[0], b0[1]);
      lg.addColorStop(0, f.ex ? '#1e1a26' : '#2a2434'); lg.addColorStop(0.55, f.ex ? '#3a3060' : '#463a74'); lg.addColorStop(1, f.ex ? '#7262c8' : '#8a7ae0');
      g.fillStyle = lg; g.beginPath(); g.moveTo(...t0); g.lineTo(...t1); g.lineTo(...b1); g.lineTo(...b0); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, TW / 50); g.beginPath();
      for (const z of [-0.45, -1.0, -1.6]) { const p = S(ax, ay, z), q = S(bx, by, z); g.moveTo(...p); g.lineTo(...q); }
      g.stroke();
    }
    g.restore();
    if (x === 10 && y === 10) K.glow(C, C, 0, 3.6, 'rgba(160,130,255,.5)');
  }

  // ---- MURI: in fondo alti con le decorazioni, davanti un parapetto basso ----
  function drawWall(K, x, y, col) {
    const { bx, S, g, TW, strokes } = K;
    if (!back(x, y)) {   // parapetto davanti
      bx(x, y, x + 1, y + 1, 0, HL, col); bx(x - 0.03, y - 0.03, x + 1.03, y + 1.03, HL, HL + 0.1, K.shade(col, 1.3));
      if (TW >= 40) strokes([[S(x + 0.5, y + 1, 0), S(x + 0.5, y + 1, HL)], [S(x + 1, y + 0.5, 0), S(x + 1, y + 0.5, HL)], [S(x, y + 1, HL * 0.5), S(x + 1, y + 1, HL * 0.5)], [S(x + 1, y, HL * 0.5), S(x + 1, y + 1, HL * 0.5)]], K.shade(col, 0.45));
      return;
    }
    bx(x, y, x + 1, y + 1, 0, HT, col); bx(x, y, x + 1, y + 1, HT - 0.14, HT, K.shade(col, 1.22));
    if (TW >= 40) {   // pietre squadrate
      const L = [], rows = [0.45, 0.9, 1.35, 1.8, 2.25];
      for (const [F, o] of [[(u, z) => S(x + u, y + 1, z), 0], [(u, z) => S(x + 1, y + u, z), 1]]) {
        for (const z of rows) L.push([F(0, z), F(1, z)]);
        for (let r = 0; r <= rows.length; r++) { const z0 = r ? rows[r - 1] : 0, z1 = r < rows.length ? rows[r] : HT - 0.14; for (const u of (r + x + y + o) % 2 ? [0.5] : [0.15, 0.85]) L.push([F(u, z0), F(u, z1)]); }
      }
      strokes(L, K.shade(col, 0.42));
    }
    const t = WD[x + ',' + y]; if (t) wallDeco(K, x, y, t);
  }
  const BOOKS = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#a8842a', '#5a2a6a', '#2a6a6a', '#c8b88a', '#6a3a1a'];
  function wallDeco(K, x, y, t) {
    const { g, S, TW, hsh } = K, fy = inside(x, y + 1);
    const pt = (u, z) => fy ? S(x + u, y + 1, z) : S(x + 1, y + u, z);
    const Q = (u0, u1, z0, z1, c) => K.poly([pt(u0, z1), pt(u1, z1), pt(u1, z0), pt(u0, z0)], fy ? c : K.shade(c, 0.8));
    const gw = (u, z, r, c) => K.glow(fy ? x + u : x + 1.05, fy ? y + 1.05 : y + u, z, r, c);
    if (t === 'shelf') {
      Q(0.05, 0.95, 0.05, 2.35, '#3e2a1c'); Q(0.11, 0.89, 0.12, 2.28, '#1e140c');
      for (let r = 0; r < 4; r++) {
        const z = 0.12 + r * 0.54; Q(0.11, 0.89, z, z + 0.05, '#5a3c24');
        let u = 0.13; for (let i = 0; u < 0.86 && i < 12; i++) { const w = 0.05 + 0.05 * hsh(x * 7 + r, y, i), h = 0.32 + 0.14 * hsh(x, y * 5 + r, i); if (hsh(x, y, r * 13 + i) < 0.12) { u += w; continue; } Q(u, Math.min(0.87, u + w - 0.008), z + 0.05, z + 0.05 + h, BOOKS[Math.floor(hsh(x + r, y, i * 3) * BOOKS.length)]); u += w; }
      }
    } else if (t === 'win') {
      Q(0.16, 0.84, 0.62, 2.28, '#6a6474'); Q(0.24, 0.76, 0.72, 2.05, '#141c3e');
      for (let i = 0; i < 4; i++) { const k = (i + 1) / 5; Q(0.24 + 0.1 * k * k, 0.76 - 0.1 * k * k, 2.05 + 0.03 * i, 2.08 + 0.03 * i, '#141c3e'); }
      for (let i = 0; i < 7; i++) { const [X, Y] = pt(0.28 + 0.44 * hsh(x, y, 70 + i), 0.85 + 1.15 * hsh(x, y, 80 + i)); g.fillStyle = '#e8ecff'; g.fillRect(X - 1, Y - 1, 2, 2); }
      if (hsh(x, y, 90) < 0.5) { const [X, Y] = pt(0.6, 1.72); g.fillStyle = '#f4ecc8'; g.beginPath(); g.arc(X, Y, TW * 0.075, 0, 7); g.fill(); g.fillStyle = '#141c3e'; g.beginPath(); g.arc(X + TW * 0.03, Y - TW * 0.02, TW * 0.065, 0, 7); g.fill(); }
      Q(0.48, 0.52, 0.72, 2.05, '#3a3444'); Q(0.24, 0.76, 1.36, 1.4, '#3a3444'); Q(0.14, 0.86, 0.58, 0.66, '#7a7484');
      gw(0.5, 1.4, 1.7, 'rgba(140,170,255,.22)');
    } else if (t === 'torch') {
      Q(0.44, 0.56, 1.15, 1.5, '#2a2a30'); Q(0.4, 0.6, 1.5, 1.6, '#4a4a52');
      const [X, Y] = pt(0.5, 1.62); g.fillStyle = '#ff8a24'; g.beginPath(); g.moveTo(X - TW * 0.07, Y); g.quadraticCurveTo(X, Y - TW * 0.34, X + TW * 0.07, Y); g.closePath(); g.fill();
      g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(X - TW * 0.035, Y); g.quadraticCurveTo(X, Y - TW * 0.2, X + TW * 0.035, Y); g.closePath(); g.fill();
      gw(0.5, 1.75, 2.6, 'rgba(255,170,80,.42)');
    } else if (t === 'banner') {
      const c = hsh(x, y, 3) < 0.5 ? '#4a2a6a' : '#6a1e2a';
      Q(0.12, 0.88, 2.2, 2.27, '#8a6a3a'); Q(0.2, 0.8, 0.95, 2.2, c);
      K.poly([pt(0.2, 0.95), pt(0.8, 0.95), pt(0.5, 0.72)], fy ? c : K.shade(c, 0.8));
      Q(0.2, 0.8, 2.08, 2.12, '#d8b050');
      const A = pt(0.5, 1.95), B = pt(0.34, 1.3), Cc = pt(0.66, 1.3); K.strokes([[A, B], [B, Cc], [Cc, A], [pt(0.5, 1.95), pt(0.5, 1.12)]], '#d8b050', Math.max(1.5, TW / 30));
      const [X, Y] = pt(0.5, 1.5); g.strokeStyle = '#d8b050'; g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); g.arc(X, Y, TW * 0.09, 0, 7); g.stroke();
    } else if (t === 'potions') {
      const PC = ['#d0402a', '#3ab0e0', '#6ad04a', '#e0c030', '#b04ad0', '#e07ab0'];
      for (const z of [0.95, 1.6]) {
        Q(0.06, 0.94, z, z + 0.06, '#5a3c24');
        for (let i = 0; i < 5; i++) { const u = 0.12 + i * 0.16, h = 0.2 + 0.16 * hsh(x, y, i + z * 10), c = PC[Math.floor(hsh(x + i, y, z * 7) * PC.length)]; Q(u, u + 0.1, z + 0.06, z + 0.06 + h, c); Q(u + 0.035, u + 0.065, z + 0.06 + h, z + 0.14 + h, '#c8d0d8'); Q(u + 0.025, u + 0.075, z + 0.14 + h, z + 0.17 + h, '#7a5a3a'); }
      }
    } else if (t === 'chart') {
      Q(0.14, 0.86, 0.95, 2.05, '#8a6a3a'); Q(0.17, 0.83, 0.99, 2.01, '#dccb9a');
      const P = []; for (let i = 0; i < 6; i++) P.push(pt(0.24 + 0.52 * hsh(x, y, 40 + i), 1.1 + 0.8 * hsh(x, y, 50 + i)));
      K.strokes(P.slice(1).map((p, i) => [P[i], p]), '#5a4428', Math.max(1, TW / 60));
      for (const [X, Y] of P) { g.fillStyle = '#2a1e10'; g.beginPath(); g.arc(X, Y, TW * 0.018, 0, 7); g.fill(); }
      const [X, Y] = pt(0.5, 1.5); g.strokeStyle = '#8a3a2a'; g.lineWidth = Math.max(1, TW / 60); g.beginPath(); g.arc(X, Y, TW * 0.16, 0, 7); g.stroke();
    }
  }

  // ---- OGGETTI del laboratorio (colori pieni: si ridisegnano sopra lo sfondo) ----
  function legs4(K, x, y, a0, b0, a1, b1, h, col) { const w = 0.06; for (const [a, b] of [[a0, b0], [a1 - w, b0], [a0, b1 - w], [a1 - w, b1 - w]]) K.bx(x + a, y + b, x + a + w, y + b + w, 0, h, col); }
  function flame(K, x, y, z, s) {
    const { g, S, TW } = K, [X, Y] = S(x, y, z);
    g.fillStyle = '#ff9a2a'; g.beginPath(); g.moveTo(X - TW * 0.03 * s, Y); g.quadraticCurveTo(X, Y - TW * 0.16 * s, X + TW * 0.03 * s, Y); g.closePath(); g.fill();
    g.fillStyle = '#ffe890'; g.beginPath(); g.moveTo(X - TW * 0.015 * s, Y); g.quadraticCurveTo(X, Y - TW * 0.09 * s, X + TW * 0.015 * s, Y); g.closePath(); g.fill();
  }
  const candle = (K, x, y, z, h) => { K.cyl(x, y, 0.035, z, z + h, '#efe6cc'); flame(K, x, y, z + h, 1); };
  function cauldron(K, x, y, r, liq, legs) {
    const { cyl, bx, dot } = K, cx = x + 0.5, cy = y + 0.5;
    if (legs) for (const [a, b] of [[-0.24, 0.1], [0.24, 0.1], [0, -0.26]]) bx(cx + a - 0.04, cy + b - 0.04, cx + a + 0.04, cy + b + 0.04, 0, 0.2, '#1a1a1e');
    cyl(cx, cy, r * 0.75, 0.05, 0.16, '#1e1e24');
    cyl(cx, cy, r, 0.16, 0.66, '#2a2a32'); cyl(cx, cy, r * 1.06, 0.62, 0.72, '#3a3a44'); cyl(cx, cy, r * 0.86, 0.72, 0.73, liq);
    dot(cx - r * 0.3, cy + r * 0.1, 0.74, 0.03, K.shade(liq, 1.35)); dot(cx + r * 0.25, cy - r * 0.2, 0.74, 0.022, K.shade(liq, 1.35));
    for (const [a, b] of [[-0.12, 0.2], [0.14, 0.18], [0, 0.26]]) dot(cx + a, cy + b, 0.04, 0.035, '#ff8a2a');
  }
  function drawFurn(K, t, x, y, o) {
    const { bx, cyl, dot, g, S, TW, qL } = K;
    switch (t) {
      case 'pit': pitDraw(K, x, y); return true;
      case 'pillar':
        bx(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 0.22, '#6a6472'); bx(x + 0.14, y + 0.14, x + 0.86, y + 0.86, 0.22, 0.3, '#7a7484');
        cyl(x + 0.5, y + 0.5, 0.3, 0.3, 2.25, '#7a7484'); cyl(x + 0.5, y + 0.5, 0.305, 1.08, 1.18, '#8a7ad8'); cyl(x + 0.5, y + 0.5, 0.305, 1.6, 1.66, '#8a7ad8');
        bx(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 2.25, 2.4, '#8a8494'); bx(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 2.4, 2.55, '#6a6472');
        return true;
      case 'bench':
        legs4(K, x, y, 0.08, 0.14, 0.92, 0.86, 0.7, '#4a3220'); bx(x + 0.04, y + 0.1, x + 0.96, y + 0.9, 0.7, 0.8, '#6a4a2e');
        cyl(x + 0.3, y + 0.55, 0.15, 0.8, 1.06, '#5ab8a8'); cyl(x + 0.3, y + 0.55, 0.04, 1.06, 1.32, '#9ad8d0');   // alambicco
        K.line(S(x + 0.3, y + 0.55, 1.3), S(x + 0.7, y + 0.35, 1.1), '#c8a050', Math.max(1.5, TW / 34));
        cyl(x + 0.7, y + 0.35, 0.1, 0.8, 1.0, '#c84a7a'); cyl(x + 0.7, y + 0.35, 0.03, 1.0, 1.12, '#e8a0c0');
        cyl(x + 0.72, y + 0.72, 0.06, 0.8, 0.86, '#2a2a30'); candle(K, x + 0.72, y + 0.72, 0.86, 0.14);
        return true;
      case 'books': {
        const C2 = ['#7a2a2a', '#2a4a6a', '#5a6a2a', '#6a3a6a'];
        for (let i = 0; i < 4; i++) { const a = 0.15 + (i % 2) * 0.06, b = 0.18 + ((i + 1) % 2) * 0.05; bx(x + a, y + b, x + a + 0.62, y + b + 0.56, i * 0.14, i * 0.14 + 0.13, C2[i]); bx(x + a + 0.02, y + b + 0.02, x + a + 0.6, y + b + 0.54, i * 0.14 + 0.02, i * 0.14 + 0.11, '#e8dcc0'); }
        candle(K, x + 0.45, y + 0.48, 0.56, 0.16);
        return true;
      }
      case 'kettle': {   // calderone di ricarica del proprio angolo (col colore del suo alchimista)
        const s = SIDE[o.s || 0];
        cauldron(K, x, y, 0.36, s.liq, true);
        return true;
      }
      case 'cauldron': cauldron(K, x, y, 0.42, '#5ad06a', true); return true;
      case 'cauldron2': cauldron(K, x, y, 0.38, '#e0703a', true); return true;
      case 'globe': {
        cyl(x + 0.5, y + 0.5, 0.2, 0, 0.08, '#4a3220'); cyl(x + 0.5, y + 0.5, 0.04, 0.08, 0.8, '#8a6a3a');
        const [X, Y] = S(x + 0.5, y + 0.5, 1.15); g.strokeStyle = '#c8a050'; g.lineWidth = Math.max(1.5, TW / 30);
        for (const [rx, ry, rot] of [[0.34, 0.34, 0], [0.34, 0.12, 0.3], [0.12, 0.34, -0.2], [0.34, 0.16, -0.6]]) { g.beginPath(); g.ellipse(X, Y, rx * TW, ry * TW, rot, 0, 7); g.stroke(); }
        g.fillStyle = '#ffd860'; g.beginPath(); g.arc(X, Y, TW * 0.07, 0, 7); g.fill();
        return true;
      }
      case 'crystal':
        bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0, 0.12, '#3a3444'); cyl(x + 0.5, y + 0.5, 0.1, 0.12, 0.62, '#4a4454'); cyl(x + 0.5, y + 0.5, 0.18, 0.62, 0.7, '#c8a050');
        dot(x + 0.5, y + 0.5, 0.92, 0.2, '#7ac8f0'); dot(x + 0.5, y + 0.5, 0.92, 0.14, '#a8e0ff'); dot(x + 0.44, y + 0.44, 1.0, 0.045, '#ffffff');
        K.glow(x + 0.5, y + 0.5, 0.9, 1.5, 'rgba(140,210,255,.35)');
        return true;
      case 'shelfp': {
        bx(x + 0.06, y + 0.3, x + 0.94, y + 0.7, 0, 1.75, '#4a3220'); qL(x + 0.1, x + 0.9, y + 0.7, 0.06, 1.7, '#22160c');
        const PC = ['#d0402a', '#3ab0e0', '#6ad04a', '#e0c030', '#b04ad0'];
        for (const z of [0.1, 0.65, 1.2]) { qL(x + 0.1, x + 0.9, y + 0.7, z - 0.04, z, '#6a4a2e'); for (let i = 0; i < 4; i++) { const u = 0.14 + i * 0.19, c = PC[(x + y + i + Math.round(z * 3)) % PC.length]; bx(x + u, y + 0.45, x + u + 0.12, y + 0.62, z, z + 0.26, c); cyl(x + u + 0.06, y + 0.53, 0.025, z + 0.26, z + 0.36, '#c8d0d8'); } }
        return true;
      }
      case 'chest':
        bx(x + 0.12, y + 0.22, x + 0.88, y + 0.78, 0, 0.42, '#7a4a24'); bx(x + 0.1, y + 0.2, x + 0.9, y + 0.8, 0.42, 0.58, '#8a5a2e');
        bx(x + 0.1, y + 0.46, x + 0.9, y + 0.54, 0, 0.6, '#c8a050'); bx(x + 0.45, y + 0.78, x + 0.55, y + 0.81, 0.3, 0.44, '#e8c860');
        return true;
      case 'owl': {
        cyl(x + 0.5, y + 0.5, 0.16, 0, 0.06, '#3a2a1a'); cyl(x + 0.5, y + 0.5, 0.035, 0.06, 1.05, '#6a4a2e'); bx(x + 0.2, y + 0.46, x + 0.8, y + 0.54, 1.05, 1.1, '#6a4a2e');
        const [X, Y] = S(x + 0.5, y + 0.5, 1.1), e = (a, b, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(X + a * TW, Y + b * TW, rx * TW, ry * TW, 0, 0, 7); g.fill(); };
        e(0, -0.2, 0.15, 0.2, '#8a6a4a'); e(0, -0.16, 0.09, 0.13, '#c8aa84'); e(0, -0.4, 0.13, 0.11, '#8a6a4a');
        e(-0.05, -0.41, 0.045, 0.045, '#f2d24a'); e(0.05, -0.41, 0.045, 0.045, '#f2d24a'); e(-0.05, -0.41, 0.018, 0.024, '#111'); e(0.05, -0.41, 0.018, 0.024, '#111');
        g.fillStyle = '#e8a030'; g.beginPath(); g.moveTo(X - 0.02 * TW, Y - 0.37 * TW); g.lineTo(X + 0.02 * TW, Y - 0.37 * TW); g.lineTo(X, Y - 0.32 * TW); g.fill();
        g.fillStyle = '#6a4a2e'; g.beginPath(); g.moveTo(X - 0.12 * TW, Y - 0.47 * TW); g.lineTo(X - 0.08 * TW, Y - 0.56 * TW); g.lineTo(X - 0.04 * TW, Y - 0.48 * TW); g.moveTo(X + 0.12 * TW, Y - 0.47 * TW); g.lineTo(X + 0.08 * TW, Y - 0.56 * TW); g.lineTo(X + 0.04 * TW, Y - 0.48 * TW); g.fill();
        return true;
      }
      case 'telescope': {
        const top = S(x + 0.5, y + 0.5, 0.95); for (const [a, b] of [[0.2, 0.25], [0.8, 0.3], [0.5, 0.85]]) K.line(S(x + a, y + b, 0), top, '#5a3c24', Math.max(2, TW / 26));
        const p0 = S(x + 0.3, y + 0.7, 0.85), p1 = S(x + 0.75, y + 0.2, 1.45); K.line(p0, p1, '#b08a3a', Math.max(5, TW / 8)); K.line(S(x + 0.62, y + 0.34, 1.28), p1, '#d8b050', Math.max(6, TW / 6.5));
        return true;
      }
      case 'skull':
        legs4(K, x, y, 0.2, 0.2, 0.8, 0.8, 0.55, '#3a2a1a'); bx(x + 0.16, y + 0.16, x + 0.84, y + 0.84, 0.55, 0.62, '#5a3c24');
        dot(x + 0.42, y + 0.45, 0.78, 0.13, '#e8e0cc'); bx(x + 0.36, y + 0.44, x + 0.5, y + 0.58, 0.62, 0.7, '#e0d8c4');
        { const [X, Y] = S(x + 0.42, y + 0.45, 0.8); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(X - TW * 0.04, Y, TW * 0.028, 0, 7); g.arc(X + TW * 0.04, Y, TW * 0.028, 0, 7); g.fill(); }
        candle(K, x + 0.68, y + 0.66, 0.62, 0.18);
        return true;
      case 'candles': for (const [a, b, h] of [[0.35, 0.4, 0.28], [0.6, 0.5, 0.2], [0.42, 0.66, 0.14]]) candle(K, x + a, y + b, 0, h); return true;
      case 'sack': bx(x + 0.22, y + 0.22, x + 0.78, y + 0.78, 0, 0.5, '#a8885a'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.5, 0.62, '#8a6a42'); return true;
    }
    return false;   // gli altri (barili, casse) li disegna il motore
  }

  // ---- GLI ALCHIMISTI: il personaggio di ognuno con il CAPPELLO A PUNTA e la CINTURA DELLE AMPOLLE (disegnati insieme a lui: stessa profondita') ----
  // punto in cima alla testa per ogni personaggio (in unita' di cqPlayer: TW/34; x verso dove guarda)
  const HEAD = { omino: [0, -39], procione: [4, -40], gatto: [4, -40], regista: [4, -43], guardia: [5, -42], tonno: [6, -44], giraffa: [10, -73], polipo: [4, -40], bruco: [8, -42], bassotto: [14, -29], palma: [3, -40], pinguino: [4, -52], pane: [1, -41], lupo: [17, -49] };
  const BELT = { giraffa: -26, bassotto: -10, pinguino: -14, lupo: -20, palma: -14 };
  const sideOf = (G, c) => G && G.chars.indexOf(c) === 1 ? 1 : 0;
  function wizard(g, X, Y, TW, L, walk, f, s, vials) {
    const u = TW / 34, bob = Math.abs(Math.sin(walk)) * 4 * u, [hx, hy] = HEAD[L.skin] || HEAD.omino, by = BELT[L.skin] || -13;
    cqPlayer(g, X, Y, TW, L.skin === 'omino' ? Object.assign({}, L, { hat: 'nessuno' }) : L, walk, f);
    g.save(); g.translate(X, Y - bob); g.scale(u, u);
    // cintura con 4 ampolle (vuote per ora: grigie)
    g.fillStyle = '#5a3a1e'; g.beginPath(); g.ellipse(f * 1, by, 13, 3.2, 0, 0, Math.PI); g.lineTo(-12, by); g.fill();
    g.fillStyle = '#d8b050'; g.fillRect(f * 1 - 2, by - 1, 4, 3.4);
    for (let i = 0; i < 4; i++) {
      const vx = f * (-9 + i * 5.5) + (f > 0 ? 2 : -2), c = vials && vials[i] ? vials[i] : '#9aa4b0';
      g.fillStyle = '#c8d0d8'; g.fillRect(vx - 0.9, by - 0.5, 1.8, 2);
      g.fillStyle = c; g.beginPath(); g.ellipse(vx, by + 4, 2.3, 2.8, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(vx - 0.8, by + 3, 0.7, 0, 7); g.fill();
    }
    // cappello a punta con la tesa larga, la fascia e una stellina; la punta piegata all'indietro
    const S2 = SIDE[s], tx = f * (hx - 7), ty = hy - 34, x0 = f * hx;
    g.fillStyle = S2.hat; g.beginPath(); g.ellipse(x0, hy, 16, 4.6, 0, 0, 7); g.fill();
    g.fillStyle = S2.hat2; g.beginPath(); g.moveTo(x0 - 10, hy - 1); g.quadraticCurveTo(x0 - 6, hy - 18, x0 - f * 2 + (tx - x0) * 0.6, ty + 10); g.quadraticCurveTo(tx - f * 6, ty + 2, tx, ty); g.quadraticCurveTo(x0 + f * 2, hy - 20, x0 + 10, hy - 1); g.closePath(); g.fill();
    g.fillStyle = S2.hat; g.beginPath(); g.moveTo(x0 + f * 2, hy - 2); g.quadraticCurveTo(x0 + f * 6, hy - 16, x0 + 10 * f, hy - 1); g.closePath(); g.fill();
    g.fillStyle = S2.band; g.beginPath(); g.moveTo(x0 - 10, hy - 1.5); g.lineTo(x0 + 10, hy - 1.5); g.lineTo(x0 + 9, hy - 5.5); g.lineTo(x0 - 9, hy - 5.5); g.closePath(); g.fill();
    star(g, x0 - f * 2, hy - 12, 2.6, S2.band); star(g, x0 + f * 3, hy - 21, 1.8, S2.band);
    g.restore();
  }
  function star(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function hearts(g, X, Y, hp) {
    const s = 5.2, gap = 13, x0 = X - gap * (HP - 1) / 2;
    for (let i = 0; i < HP; i++) {
      const cx = x0 + i * gap, on = i < hp;
      g.beginPath(); g.moveTo(cx, Y + s * 0.95); g.bezierCurveTo(cx - s * 1.5, Y - s * 0.1, cx - s * 0.8, Y - s * 1.25, cx, Y - s * 0.45); g.bezierCurveTo(cx + s * 0.8, Y - s * 1.25, cx + s * 1.5, Y - s * 0.1, cx, Y + s * 0.95); g.closePath();
      g.fillStyle = on ? '#ff3b4e' : 'rgba(30,20,24,.55)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = on ? '#7a0a18' : 'rgba(255,255,255,.45)'; g.stroke();
      if (on) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - s * 0.45, Y - s * 0.35, s * 0.25, 0, 7); g.fill(); }
    }
  }

  // ======================= LE POZIONI: tutto CALCOLATO dalle proprieta' degli ingredienti (nessuna ricetta scritta a mano) =======================
  // REGOLA D'ORO (richiesta dell'utente): per aggiungere o cambiare un ingrediente basta UNA RIGA qui sotto; nome, colore, forza, miccia,
  // effetto, ricettario e scelte del computer si ricavano da soli. Campi:
  //   id: UNA lettera, unica e per sempre (le pozioni si salvano come lettere in ordine alfabetico, es. "fs" = peperoncino + sabbia)
  //   el: elemento che porta (vedi EL) e pw: quanto; spd: velocita' di volo (x); area: larghezza della zona (x); dur: durata (x);
  //   bnc: rimbalzi (+); inst: instabilita' (+: accorcia la miccia); amp: forza di tutto (x); d: cosa fa da solo (scritto sul barattolo)
  const ING = [
    { id: 'f', n: 'Peperoncino di drago', e: '🌶️', c: '#e2462a', el: 'fire', pw: 1, inst: 0.25, d: 'brucia' },
    { id: 'i', n: 'Brina', e: '❄️', c: '#9adcff', el: 'ice', pw: 1, d: 'gela e fa scivolare' },
    { id: 'c', n: 'Cenere', e: '🌫️', c: '#7a7684', el: 'smoke', pw: 1, area: 1.3, d: 'nuvola che nasconde' },
    { id: 'r', n: 'Resina', e: '🍯', c: '#d89a2a', el: 'glue', pw: 1, spd: 0.85, d: 'incolla a terra' },
    { id: 'g', n: 'Fungo gigante', e: '🍄', c: '#c83a3a', el: 'grow', pw: 1, area: 1.1, d: 'fa diventare enormi' },
    { id: 'p', n: 'Polvere di fata', e: '✨', c: '#f0a8e8', el: 'shrink', pw: 1, spd: 1.2, d: 'rimpicciolisce' },
    { id: 's', n: 'Sabbia del tempo', e: '⏳', c: '#e0c068', el: 'slow', pw: 1, spd: 0.3, dur: 1.3, d: 'rallenta tutto, anche il volo' },
    { id: 'w', n: 'Ragnatela', e: '🕸️', c: '#c8c8d4', el: 'pull', pw: 1, d: 'tira verso il punto' },
    { id: 'v', n: 'Piuma di grifone', e: '🦅', c: '#8ae0c8', el: 'wind', pw: 1, spd: 1.3, d: 'raffica che spinge via' },
    { id: 'x', n: 'Piuma di fenice', e: '🪶', c: '#ff8a3a', el: 'fire', pw: 0.4, bnc: 1, inst: 0.05, d: 'la pozione rimbalza' },
    { id: 'm', n: 'Specchio liquido', e: '🪞', c: '#d8e4f0', el: 'mirror', pw: 1, dur: 1.2, d: 'muro che rimanda le pozioni' },
    { id: 'o', n: 'Occhio di rospo', e: '👁️', c: '#7ac04a', el: 'chaos', pw: 0.6, amp: 1.5, inst: 0.35, area: 1.15, d: 'più forte, ma instabile' }];
  const ING_BY = Object.fromEntries(ING.map(g => [g.id, g]));
  // ELEMENTI: n = nome (maschile: "Fuoco lento"), a = aggettivo quando e' secondario, e = icona. I prodotti delle reazioni sono elementi anche loro
  const EL = {
    fire: { n: 'Fuoco', a: 'ardente', e: '🔥' }, ice: { n: 'Gelo', a: 'gelido', e: '❄️' }, smoke: { n: 'Fumo', a: 'fumoso', e: '💨' },
    glue: { n: 'Vischio', a: 'appiccicoso', e: '🍯' }, grow: { n: 'Gigante', a: 'gigante', e: '🍄' }, shrink: { n: 'Folletto', a: 'piccino', e: '✨' },
    slow: { n: 'Torpore', a: 'lento', e: '⏳' }, pull: { n: 'Vortice', a: 'risucchiante', e: '🕸️' }, wind: { n: 'Vento', a: 'ventoso', e: '🌬️' },
    mirror: { n: 'Specchio', a: 'specchiato', e: '🪞' }, chaos: { n: 'Caos', a: 'imprevedibile', e: '🎲' },
    steam: { n: 'Vapore', a: 'bollente', e: '♨️' }, soot: { n: 'Nerofumo', a: 'accecante', e: '🌑' }, statue: { n: 'Cristallo', a: 'pietrificante', e: '🧊' },
    pop: { n: 'Botto', a: 'scoppiettante', e: '🎈' }, blaze: { n: 'Incendio', a: 'divampante', e: '☄️' }, whirl: { n: 'Mulinello', a: 'turbinante', e: '🌪️' } };
  // REAZIONI tra COPPIE DI ELEMENTI (valgono nel calderone e, dal passo 4, anche sul pavimento): [a, b, prodotto, instabilita' in piu']
  const REACT = [['fire', 'ice', 'steam', 0.2], ['fire', 'smoke', 'soot', 0.1], ['glue', 'ice', 'statue', 0.05], ['grow', 'shrink', 'pop', 0.25], ['fire', 'wind', 'blaze', 0.15], ['pull', 'wind', 'whirl', 0.2]];
  const FUSE = 2.6, AREA = 1.3, SPEED = 7;   // miccia di una pozione stabile (s), raggio della zona (caselle), velocita' di volo (caselle/s)
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = cols => { const v = [0, 0, 0]; for (const c of cols) hexRgb(c).forEach((k, i) => { v[i] += k / cols.length; }); return '#' + v.map(k => Math.round(k).toString(16).padStart(2, '0')).join(''); };
  const potKey = ids => ids.slice().sort().join('');
  const BREW = new Map();
  // brew("fs") -> la pozione: { k, ings, s: forza per elemento, main, n: nome, e, c: colore, spd, area, dur, bnc, inst, fuse, rx: reazioni avvenute }
  function brew(key) {
    if (BREW.has(key)) return BREW.get(key);
    const ings = [...(key || '')].map(id => ING_BY[id]).filter(Boolean);
    if (!ings.length) return null;
    const s = {}; let spd = 1, area = 1, dur = 1, bnc = 0, inst = 0.08 * (ings.length - 1), amp = 1;   // piu' ingredienti = un po' piu' instabile
    for (const g of ings) { if (g.el) s[g.el] = (s[g.el] || 0) + (g.pw || 1); spd *= g.spd || 1; area *= g.area || 1; dur *= g.dur || 1; bnc += g.bnc || 0; inst += g.inst || 0; amp *= g.amp || 1; }
    const rx = [];
    for (let again = true; again;) { again = false; for (const [a, b, to, di] of REACT) if (s[a] > 0.01 && s[b] > 0.01) { const m = Math.min(s[a], s[b]); s[a] -= m; s[b] -= m; s[to] = (s[to] || 0) + m * 1.5; inst += di; rx.push(to); again = true; } }
    for (const k of Object.keys(s)) { s[k] = Math.round(s[k] * amp * 100) / 100; if (s[k] < 0.05) delete s[k]; }
    const ord = Object.keys(s).sort((a, b) => s[b] - s[a]), main = ord[0] || null, top = main ? s[main] : 0;
    // nome: elemento principale + aggettivi (elementi secondari, rimbalzi, forza, instabilita')
    let n = main ? EL[main].n : 'Acqua sporca';
    if (top >= 2.5) n = 'Triplo ' + n.toLowerCase(); else if (top >= 1.8) n = 'Doppio ' + n.toLowerCase();
    const adj = ord.slice(1).filter(k => s[k] >= 0.3).map(k => EL[k].a);
    if (bnc) adj.push('rimbalzante'); if (amp > 1.01) adj.push('potente');
    const words = adj.slice(0, 2); if (inst >= 0.45) words.push('instabile');
    if (words.length) n += ' ' + words.join(' ');
    const P = { k: key, ings, s, main, n, e: main ? EL[main].e : '💧', c: mix(ings.map(g => g.c)), spd: SPEED * spd, area: AREA * area * (1 + 0.12 * (ings.length - 1)), dur, bnc, inst: Math.round(inst * 100) / 100, fuse: FUSE * Math.exp(-2.2 * inst), rx };
    BREW.set(key, P); return P;
  }

  // ======================= PREPARAZIONE: il CALDERONE a tutto schermo (ognuno dietro il suo paravento) =======================
  const BELT_N = 4, MAXI = 3, PREP = 60, PREP2 = 30, DUEL = 90;
  const U2 = { pot: [], ph: '', fx: [], shake: 0, drain: 0, msg: '', msgT: 0 };
  const now = () => performance.now() / 1000;
  const sfxOk = () => { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
  function swp(f0, f1, d, v, delay = 0, type = 'sine') {
    const A = sfxOk(); if (!A) return; const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(Math.min(0.5, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SFX = {
    plop: () => { swp(520, 140, 0.16, 0.06); swp(900, 1400, 0.08, 0.03, 0.1); },
    bubble: () => { swp(300 + Math.random() * 300, 700 + Math.random() * 500, 0.07, 0.02); },
    bottle: () => { swp(1800, 2400, 0.08, 0.035, 0, 'triangle'); swp(2600, 3000, 0.12, 0.03, 0.07, 'triangle'); swp(400, 180, 0.25, 0.03, 0.02); },
    pour: () => { swp(600, 200, 0.35, 0.04); },
    full: () => { swp(220, 160, 0.18, 0.05, 0, 'square'); }
  };
  function prepCss() {
    if (document.getElementById('alCss')) return;
    const st = document.createElement('style'); st.id = 'alCss';
    st.textContent = `#alPrep{position:absolute;inset:0;z-index:7;background:radial-gradient(ellipse at 50% 30%,#3c285a,#0e0a18 70%);color:#f2ead8;font:14px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;padding:calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px);box-sizing:border-box;overflow-y:auto;touch-action:pan-y;gap:8px}
#alPrep .top{width:100%;max-width:480px;display:flex;align-items:center;gap:8px}#alPrep .top b{flex:1;font-size:16px}#alPrep .tm{font:800 20px system-ui;min-width:56px;text-align:center;padding:4px 8px;border-radius:10px;background:rgba(0,0,0,.35)}#alPrep .tm.low{color:#ff8a7a}
#alPrep button{font:700 14px system-ui,sans-serif;border:0;border-radius:12px;color:#fff;cursor:pointer}
#alRdy{background:#2f8a4a;padding:9px 12px}#alRdy.on{background:#5a5a62}
#alCv{width:100%;max-width:480px;height:190px;display:block}
#alPot{display:flex;gap:6px;min-height:34px;align-items:center;justify-content:center;flex-wrap:wrap}#alPot .ch{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);padding:5px 9px;font-weight:600}#alPot .ch i{font-style:normal;opacity:.6;margin-left:4px}#alPot .h{opacity:.7;font-size:13px}
#alAct{display:flex;gap:8px;width:100%;max-width:480px}#alAct button{flex:1;padding:12px 6px}#alBot{background:#8a4ad0;font-size:16px!important}#alBot:disabled,#alEmp:disabled{opacity:.35}#alEmp{background:rgba(255,255,255,.14)}
#alJars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;max-width:480px}
#alJars button{position:relative;min-height:80px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.22);border-radius:14px 14px 10px 10px;overflow:hidden;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;font-weight:600;font-size:11px;line-height:1.1}
#alJars button .lq{position:absolute;left:0;right:0;bottom:0;height:38%;opacity:.55}#alJars button .e{font-size:26px;position:relative;margin-top:2px}#alJars button .n{position:relative;margin-top:2px}#alJars button .d{position:relative;font-weight:400;font-size:9.5px;opacity:.8;margin-top:1px}#alJars button:active{transform:scale(.94)}#alJars button.off{opacity:.4}
#alBelt{display:flex;gap:10px;align-items:flex-end;justify-content:center;width:100%;max-width:480px;padding:6px 0 2px;border-top:2px solid #6a4a2e}#alBelt .lb{font-weight:700;margin-right:2px;align-self:center}
#alBelt button{width:58px;background:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:2px}#alBelt .vi{width:30px;height:40px;border-radius:7px 7px 15px 15px;border:2px solid rgba(220,230,240,.8);position:relative;overflow:hidden;background:rgba(255,255,255,.06)}#alBelt .vi::before{content:'';position:absolute;top:-2px;left:8px;width:10px;height:7px;background:#8a6a42;border-radius:2px}#alBelt .vi .lq{position:absolute;left:0;right:0;bottom:0;height:72%}#alBelt .ig{font-size:12px;min-height:16px;font-weight:400}
#alMsg{min-height:18px;font-size:13px;color:#ffd890;text-align:center}`;
    document.head.appendChild(st);
  }
  function prepOpen(G) {
    prepCss(); prepClose();
    const el = document.createElement('div'); el.id = 'alPrep';
    el.innerHTML = `<div class="top"><span class="tm" id="alTm">1:00</span><b>⚗️ Prepara le pozioni</b><button id="alRdy" type="button">✔ Pronto</button></div>
      <canvas id="alCv"></canvas><div id="alPot"></div><div id="alMsg"></div>
      <div id="alAct"><button id="alEmp" type="button">🗑️ Svuota</button><button id="alBot" type="button">🧪 Imbottiglia</button></div>
      <div id="alJars">${ING.map(g => `<button type="button" data-i="${g.id}"><span class="lq" style="background:${g.c}"></span><span class="e">${g.e}</span><span class="n">${esc(g.n)}</span><span class="d">${esc(g.d)}</span></button>`).join('')}</div>
      <div id="alBelt"><span class="lb">Cintura</span>${Array.from({ length: BELT_N }, (_, i) => `<button type="button" data-b="${i}"><span class="vi"><span class="lq"></span></span><span class="ig"></span></button>`).join('')}</div>`;
    $('#ciack').appendChild(el);
    el.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => addIng(G, b.dataset.i); });
    el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => unbottle(G, +b.dataset.b); });
    $('#alBot').onclick = () => bottle(G); $('#alEmp').onclick = () => { if (!U2.pot.length) return; U2.pot = []; U2.drain = now(); SFX.pour(); prepRender(G); };
    $('#alRdy').onclick = () => setReady(G, !ready(G));
    U2.pot = []; U2.fx = []; U2.msg = '';
    prepRender(G);
  }
  function prepClose() { const el = document.getElementById('alPrep'); if (el) el.remove(); }
  const ready = G => !!(G.st && G.st.rd && G.st.rd[G.me.id]) || !!G.myRdy;
  function say(t) { U2.msg = t; U2.msgT = now(); const m = document.getElementById('alMsg'); if (m) m.textContent = t; }
  function addIng(G, id) {
    if (U2.pot.length >= MAXI) { say('Al massimo ' + MAXI + ' ingredienti: imbottiglia o svuota.'); SFX.full(); U2.shake = now(); return; }
    U2.pot.push(id); U2.fx.push({ id, t: now() }); SFX.plop(); say('');
    prepRender(G);
  }
  function bottle(G) {
    if (!U2.pot.length) return;
    const b = G.me.belt, i = b.findIndex(v => !v);
    if (i < 0) { say('La cintura è piena: tocca un\'ampolla per svuotarla.'); SFX.full(); return; }
    b[i] = potKey(U2.pot); U2.pot = []; U2.drain = now(); SFX.bottle(); sendBelt(G);
    say(b.every(Boolean) ? 'Cintura piena! Premi ✔ Pronto (o cambia qualcosa).' : ''); prepRender(G);
  }
  function unbottle(G, i) { if (!G.me.belt[i]) return; G.me.belt[i] = ''; SFX.pour(); sendBelt(G); if (ready(G)) setReady(G, false); prepRender(G); }
  function sendBelt(G) { if (G.guest) cqNetSend({ k: 'belt', b: G.me.belt.join(',') }); }
  function setReady(G, on) {
    if (on && U2.pot.length && G.me.belt.some(v => !v)) bottle(G);   // quello che bolle nel calderone non si butta
    G.myRdy = on;
    if (G.guest) cqNetSend({ k: 'rdy', on: on ? 1 : 0 }); else if (G.st) { if (on) G.st.rd[G.me.id] = 1; else delete G.st.rd[G.me.id]; }
    if (on) beep(784, 0.08, 0.04); prepRender(G);
  }
  function prepRender(G) {
    const el = document.getElementById('alPrep'); if (!el) return;
    const p = document.getElementById('alPot');
    p.innerHTML = U2.pot.length ? U2.pot.map((id, i) => `<button type="button" class="ch" data-p="${i}">${ING_BY[id].e} ${esc(ING_BY[id].n)}<i>✕</i></button>`).join('') + `<span class="h">${U2.pot.length}/${MAXI}</span>`
      : '<span class="h">Tocca un barattolo: l\'ingrediente cade nel calderone (fino a ' + MAXI + ').</span>';
    p.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { U2.pot.splice(+b.dataset.p, 1); SFX.pour(); prepRender(G); }; });
    const full = G.me.belt.every(Boolean);
    $('#alBot').disabled = !U2.pot.length || full; $('#alEmp').disabled = !U2.pot.length;
    el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('off', U2.pot.length >= MAXI));
    el.querySelectorAll('[data-b]').forEach(b => { const k = G.me.belt[+b.dataset.b], P = k && brew(k); b.querySelector('.lq').style.background = P ? P.c : 'transparent'; b.querySelector('.ig').textContent = P ? P.ings.map(g => g.e).join('') : '—'; });
    const r = $('#alRdy'), on = ready(G); r.classList.toggle('on', on); r.textContent = on ? '⏳ Aspetto…' : '✔ Pronto';
  }
  // il calderone disegnato (bolle, fuoco, l'ingrediente che cade, schizzi). Trema e ribolle forte quando la miscela e' instabile: un indizio, non la ricetta
  function potDraw() {
    const cv = document.getElementById('alCv'); if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const t = now(), P = U2.pot.length ? brew(potKey(U2.pot)) : null, inst = P ? P.inst : 0;
    const sh = (P ? Math.max(0, inst - 0.2) * 5 : 0) + (t - U2.shake < 0.3 ? 4 : 0), cx = W / 2 + Math.sin(t * 40) * sh, cy = H * 0.5, R = Math.min(W * 0.3, H * 0.42);
    // fuoco sotto
    for (let i = 0; i < 7; i++) { const x = cx + (i - 3) * R * 0.18, h = R * (0.32 + 0.12 * Math.sin(t * 9 + i * 1.7)); g.fillStyle = i % 2 ? '#ff8a2a' : '#ffb84a'; g.beginPath(); g.moveTo(x - R * 0.09, cy + R * 0.78); g.quadraticCurveTo(x, cy + R * 0.78 - h * 2, x + R * 0.09, cy + R * 0.78); g.fill(); }
    // pentolone
    g.fillStyle = '#1e1e26'; g.beginPath(); g.ellipse(cx, cy + R * 0.1, R, R * 0.72, 0, 0, Math.PI); g.lineTo(cx - R, cy - R * 0.18); g.ellipse(cx, cy - R * 0.18, R, R * 0.3, 0, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#34343e'; g.beginPath(); g.ellipse(cx - R * 0.45, cy + R * 0.12, R * 0.12, R * 0.4, 0.3, 0, 7); g.fill();
    g.strokeStyle = '#4a4a56'; g.lineWidth = R * 0.11; g.beginPath(); g.ellipse(cx, cy - R * 0.2, R * 1.02, R * 0.3, 0, 0, 7); g.stroke();
    // liquido (scende quando imbottigli o svuoti)
    const dk = Math.max(0, 1 - (t - U2.drain) / 0.5), liq = P ? P.c : '#2e3e52', lv = 1 - dk * 0.6;
    g.save(); g.beginPath(); g.ellipse(cx, cy - R * 0.2, R * 0.95, R * 0.26, 0, 0, 7); g.clip();
    g.fillStyle = cqShade(liq, 0.7); g.fillRect(cx - R, cy - R * 0.5, R * 2, R);
    g.fillStyle = liq; g.beginPath(); g.ellipse(cx, cy - R * 0.2 + (1 - lv) * R * 0.3, R * 0.95 * lv, R * 0.24 * lv, 0, 0, 7); g.fill();
    // bolle (di piu' e piu' grosse se instabile)
    const nb = P ? 6 + Math.round(inst * 14) : 3;
    for (let i = 0; i < nb; i++) { const ph = (t * (0.8 + inst * 2) + i * 0.37) % 1, bx = cx + Math.sin(i * 2.3) * R * 0.7, by = cy - R * 0.2 + Math.cos(i * 1.7) * R * 0.15, r = R * (0.03 + 0.05 * ph) * (1 + inst); g.globalAlpha = 1 - ph; g.fillStyle = cqShade(liq, 1.5); g.beginPath(); g.arc(bx, by - ph * R * 0.08, r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // gli ingredienti che galleggiano
    g.font = Math.round(R * 0.22) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    U2.pot.forEach((id, i) => { const a = t * 0.8 + i * 2.1; g.fillText(ING_BY[id].e, cx + Math.cos(a) * R * 0.45, cy - R * 0.22 + Math.sin(a) * R * 0.1); });
    g.restore();
    // vapore
    for (let i = 0; i < 5; i++) { const ph = (t * 0.35 + i / 5) % 1; g.globalAlpha = (1 - ph) * 0.25; g.fillStyle = P ? cqShade(liq, 1.6) : '#c8d0dc'; g.beginPath(); g.arc(cx + Math.sin(i * 3 + t) * R * 0.4, cy - R * 0.4 - ph * R * 1.1, R * (0.12 + ph * 0.2), 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // l'ingrediente appena toccato cade dentro, poi lo schizzo
    U2.fx = U2.fx.filter(f => t - f.t < 0.9);
    for (const f of U2.fx) {
      const a = (t - f.t) / 0.4;
      if (a < 1) { g.font = Math.round(R * 0.4) + 'px system-ui'; g.fillText(ING_BY[f.id].e, cx, 10 + (cy - R * 0.25 - 10) * a * a); }
      else { const k = (t - f.t - 0.4) / 0.5; g.globalAlpha = 1 - k; g.fillStyle = ING_BY[f.id].c; for (let i = 0; i < 8; i++) { const an = Math.PI + i / 7 * Math.PI; g.beginPath(); g.arc(cx + Math.cos(an) * R * 0.5 * k, cy - R * 0.25 + Math.sin(an) * R * 0.5 * k - k * (1 - k) * R * 0.6, R * 0.05, 0, 7); g.fill(); } g.globalAlpha = 1; }
    }
    if (P && Math.random() < 0.02 + inst * 0.05) SFX.bubble();
  }
  cqEachFrame(() => {
    const G = cq.g; if (!G || G.mode !== 'alchimisti' || !document.getElementById('alPrep')) return;
    potDraw();
    const st = G.st; if (!st) return;
    const left = Math.max(0, (st.n > 1 ? PREP2 : PREP) - (G.time - st.t0)), tm = document.getElementById('alTm');
    const txt = mmss(left); if (tm.textContent !== txt) { tm.textContent = txt; tm.classList.toggle('low', left < 10); }
    if (U2.msg && now() - U2.msgT > 4) say('');
  });

  // ---- il computer prepara la sua cintura: pozioni sensate (la miccia non troppo corta), una volta su quattro con tre ingredienti ----
  const CPU_ING = ['f', 'i', 'r', 'v', 'w', 'g', 'c', 's', 'x', 'p', 'm', 'o'];
  function cpuBelt() {
    const out = [];
    for (let k = 0; k < 60 && out.length < BELT_N; k++) {
      const n = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3, ids = [];
      for (let i = 0; i < n; i++) ids.push(cqPickOne(CPU_ING));
      const P = brew(potKey(ids)); if (P.spd * P.fuse < 6 || P.main === 'pop') continue;
      out.push(P.k);
    }
    while (out.length < BELT_N) out.push('f');
    return out;
  }

  // ---- computer: per ora gira per il laboratorio ----
  function botTick(G, c, dt) {
    c.think -= dt;
    if ((!c.path || !c.path.length) && c.think <= 0) {
      c.think = 1 + Math.random() * 2.5;
      for (let i = 0; i < 20; i++) { const f = cqModeFree(); if (f && Math.hypot(f.x - C, f.y - C) < RAD - 1.2) { c.path = cqPath(c.x, c.y, f.x, f.y).slice(0, 12); break; } }
    }
    cqModeStep(c, dt, 0.9);
  }

  // ---- FASI decise dall'host in G.st = { n: manche, ph: 'prep' | 'duel', t0, rd: { id: 1 } (pronti) }; ogni telefono apre e chiude il suo pannello ----
  function stage(G) {
    const ph = G.st ? G.st.ph : ''; if (ph === U2.ph) return;
    if (U2.ph === 'prep' && U2.pot.length && G.me.belt.some(v => !v)) bottle(G);   // tempo scaduto: quello che bolle si imbottiglia da solo
    U2.ph = ph;
    if (ph === 'prep') { G.myRdy = false; prepOpen(G); }
    else prepClose();
    if (ph === 'duel') cqToast('⚔️ <b>Duello!</b> Guarda la cintura dell\'altro: i colori delle sue ampolle sono le sue pozioni. (Il lancio arriva nel prossimo passo.)');
  }
  const vials = (G, c) => !c.belt || (G.st && G.st.ph === 'prep' && c !== G.me) ? null : c.belt.map(k => { const P = k && brew(k); return P ? P.c : null; });
  const cleanBelt = s => String(s || '').split(',').slice(0, BELT_N).map(k => [...k].filter(id => ING_BY[id]).slice(0, MAXI).sort().join('')).concat(Array(BELT_N).fill('')).slice(0, BELT_N);

  const RULES = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">📖 Come si gioca</summary><p>Uno contro uno in cima alla <b>torre dei maghi</b>, al meglio di 3 manche.</p><p><b>1. Preparazione</b>: al calderone mescoli in segreto fino a 3 ingredienti per pozione e riempi le <b>4 ampolle</b> della cintura. Gli ingredienti si combinano in centinaia di modi… e qualche pozione ti scoppia in mano. Se il calderone trema e ribolle forte, la miscela è instabile!</p><p><b>2. Duello</b>: lanci le pozioni ad arco. 3 cuori a testa; le esplosioni ti sbalzano contro i muri o giù nella <b>voragine</b>.</p><p><i>In costruzione: per ora preparazione e giro nella torre.</i></p></details>';

  CQ_MODES.alchimisti = {
    n: 'Duello degli alchimisti',
    desc: '⚗️ Uno contro uno in cima alla torre dei maghi: mescola in segreto le pozioni e lanciale all\'altro.',
    maps: [['torre', 'Torre dei maghi']],
    ns: [[2, '2']],
    def: { map: 'torre', n: 2, fill: true },
    opts: () => RULES,
    read: () => ({}),
    start(G) {
      G.opp = G.chars.find(c => c !== G.me) || null;
      G.chars.forEach((c, i) => { const [x, y] = SPAWN[i % 2]; c.x = x; c.y = y; c.face = i ? -1 : 1; c.hp = HP; c.path = []; c.think = 1 + i; c.belt = Array(BELT_N).fill(''); });
      G.st = { n: 1, ph: 'prep', t0: 0, rd: {} }; U2.ph = '';
      for (const c of G.chars) if (c.bot && !c.remote) { c.belt = cpuBelt(); G.st.rd[c.id] = 1; }
    },
    gstart(G) { G.opp = G.chars.find(c => c !== G.me) || null; G.st = null; U2.ph = ''; G.chars.forEach(c => { c.hp = HP; c.belt = Array(BELT_N).fill(''); }); },
    intro: () => '⚗️ Benvenuto nella torre dei maghi!',
    voice: () => 1,   // voce sempre aperta tra i due
    speed: () => { const G = cq.g; return G && G.st && G.st.ph === 'prep' ? 0 : 1; },
    hud(G) {
      const h = c => c ? '❤️'.repeat(Math.max(0, c.hp)) + '🖤'.repeat(Math.max(0, HP - c.hp)) : '';
      const st = G.st, left = !st ? 0 : st.ph === 'prep' ? (st.n > 1 ? PREP2 : PREP) - (G.time - st.t0) : DUEL - (G.time - st.t0);
      return `⚗️ ${h(G.me)}${G.opp ? ' · ' + esc(G.opp.name) + ' ' + h(G.opp) : ''} · ${st && st.ph === 'prep' ? '🧪' : '⚔️'} ${mmss(Math.max(0, left))}`;
    },
    big(G) {
      const st = G.st; if (!st) return '⏳ Un attimo…';
      if (st.ph === 'duel') { const l = DUEL - (G.time - st.t0); return l < 10 && l > 0 ? '⏱ ' + Math.ceil(l) + '…' : ''; }
      return '';
    },
    view: () => ({ z: 0.84, x: 0, y: 0 }),
    tick(G, dt) {
      const st = G.st;
      for (const c of G.chars) if (c.bot && !c.remote && st.ph === 'duel') botTick(G, c, dt);
      if (st.ph === 'prep') {
        const left = (st.n > 1 ? PREP2 : PREP) - (G.time - st.t0);
        if (G.chars.every(c => st.rd[c.id]) || left < -1.5) { st.ph = 'duel'; st.t0 = G.time; st.rd = {}; }
      } else if (st.ph === 'duel' && G.time - st.t0 > DUEL) cqModeEnd({ t: '⚗️ Fine della prova', why: 'Per ora si preparano le pozioni e si gira nella torre: il lancio arriva nel prossimo passo!', rank: G.chars.map(c => [c.name, '']), win: [] });
    },
    local(G) { stage(G); },
    ev(G, c, o) {
      if (o.k === 'belt' && G.st && (G.st.ph === 'prep' || G.time - G.st.t0 < 3)) c.belt = cleanBelt(o.b);
      else if (o.k === 'rdy' && G.st && G.st.ph === 'prep') { if (o.on) G.st.rd[c.id] = 1; else delete G.st.rd[c.id]; }
    },
    snap: G => ({ st: G.st }),
    apply(G, x) { if (x.st) { G.st = x.st; if (G.st.ph !== 'prep') G.myRdy = false; } },
    csnap: c => [c.hp, (c.belt || []).join(',')],
    capply(G, c, a) { if (a[0] != null) c.hp = a[0]; if (c !== G.me && a[1] != null) c.belt = cleanBelt(a[1]); },
    draw(c) {
      const G = cq.g, s = sideOf(G, c), L = cqLookOf(c), key = s + (L.skin || '');
      if (c.__dk !== key) { c.__dk = key; c.__dr = (g, X, Y, TW, L2, w, f) => wizard(g, X, Y, TW, L2, w, f, s, vials(cq.g, c)); c.__dr.top = cqTop(L) + (L.skin === 'omino' ? 0.85 : 0.75); }
      return c.__dr;
    },
    deco(g, c, X, Y, TW) {
      const L = cqLookOf(c), top = Y - TW * (cqTop(L) + (L.skin === 'omino' ? 0.85 : 0.75)) - 16;
      hearts(g, X, top, c.hp == null ? HP : c.hp);
    },
    // sopra alla mappa: la luce che sale dalla voragine (puntini che salgono) e le bolle dei calderoni
    over(g, G, sx, sy, TW) {
      const t = performance.now() / 1000, U = TW * 0.575;
      for (let i = 0; i < 22; i++) {
        const ph = (t * 0.22 + i / 22) % 1, a = i * 2.39 + t * 0.15, r = 0.3 + 1.6 * ((i * 0.618) % 1), x = C + Math.cos(a) * r, y = C + Math.sin(a) * r, z = -1.5 + ph * 5;
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; g.fillStyle = i % 3 ? '#c8b8ff' : '#9ae8ff';
        g.beginPath(); g.arc(sx(x, y), sy(x, y) - z * U, Math.max(1.2, TW / 34), 0, 7); g.fill();
      }
      for (const [k, [x, y]] of KETTLE.entries()) for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1, bx2 = x + 0.5 + Math.sin(i * 2.1 + t) * 0.12, by2 = y + 0.5 + Math.cos(i * 1.7) * 0.1;
        g.globalAlpha = (1 - ph) * 0.9; g.fillStyle = SIDE[k].liq; g.beginPath(); g.arc(sx(bx2, by2), sy(bx2, by2) - (0.75 + ph * 0.5) * U, Math.max(1.5, TW / 30) * (0.6 + ph), 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    },
    night: () => ({ a: 0.42, r: 5, lights: LIGHTS, see: () => true })
  };
  // esce dalla partita (fine, abbandono): via il pannello
  cqEachFrame(() => { const G = cq.g; if ((!G || G.mode !== 'alchimisti' || G.phase !== 'play') && document.getElementById('alPrep')) { prepClose(); U2.ph = ''; } });
  window.__alc = { mapTorre, isPit, SPAWN, KETTLE, C, RAD, wizard, ING, EL, REACT, brew, potKey, cpuBelt, U2, addIng, bottle, setReady, prepOpen };   // per le prove (prove/alc*.js)
})();
