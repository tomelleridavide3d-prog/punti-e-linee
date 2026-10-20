// Mister X (Scotland Yard in tempo reale). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): squadre (spawn, freccia sul bordo), mappe (numeri col seme).
// CITTA' DI NOTTE col seme, circa 100x100: strade larghe (marciapiede, 2 corsie, marciapiede), isolati di palazzi visti dall'alto con i tetti e le finestre
// accese, vicoli, un fiume con 3 ponti, un parco, piazze, il porto in fondo. Lampioni = luci (REGOLA DELLE LUCI: aloni solo con K.glow).
// CACCIA LENTA (secondo giro, voluto dall'utente: suspense e ricerca alla Scotland Yard, poche cose ma chiare): tutti all'80% della velocita', notte vera,
// alcune VIE BUIE senza lampioni. Mister X (1, o 2 con 8+ personaggi; a caso, una persona o il computer) e' invisibile: si vede solo vicinissimo, sotto un
// lampione o nel cono della TORCIA dei detective (sempre accesa, si vede da lontano). Ogni 30/45/60 s LAMPEGGIA a tutti (ticchettio negli ultimi 10 s).
// Tra un lampeggio e l'altro i detective hanno la ZONA (cerchio intorno all'ultimo punto noto, si allarga col tempo) e il TACCUINO (📸 🚇 🎭 💰, senza dire dove).
// Deve fare 3 COLPI (5 con due Mister X; l'allarme suona dopo 2 s di furto e rivela il negozio), poi la FUGA (porto o eliporto). Tempo finito = vince lui.
// Trucchi: TRAVESTIMENTO da passante (2 cariche da 25 s; la FOLLA di passanti gira uguale su tutti i telefoni: e' calcolata dal tempo, niente rete) e METRO
// (per tutti; per lui resta il biglietto nel taccuino). Detective: 🔗 CATTURA (si preme mentre si cammina): se tocca Mister X parte il DUELLO DELLE MANETTE
// a tiro alla fune (2,5 s, vince chi tocca piu' veloce, gli aiuti si sommano; pari = Mister X); se tocca un passante innocente resta fermo un po'.
CQ_WAIT.misterx = cqLib('squadre', 'mappe').then(L => {
  const SQ = L.squadre, MG = L.mappe;
  const W = 100, H = 100;
  // tipi di casella della citta'
  const BL = 0, RO = 1, SW = 2, PZ = 3, GR = 4, PA = 5, WA = 6, BR = 7, DK = 8, AL = 9, QY = 10;
  const SLOW = 0.8, ROB_T = 6, ALARM_T = 2, ROB_R = 1.35, DG_T = 1.5, DG_N = 2, DG_D = 25, DG_SPD = 0.68, CATCH_R = 1.15, DUEL_T = 2.5, DUEL_JOIN = 1.9, STUN_T = 1.5, INV_T = 3, FAKE_T = 2.5, CAT_CD = 1.2;
  const METRO_T = 4, METRO_R = 1.6, VIS = 3.4, VIS_XR = 4.4, VIS_X = 1.8, LIT_SEE = 10, LIT_X = 6, LAMP_R = 2.5, LIT_R = 1.7, TORCH_L = 7, TORCH_A = 0.42, ESC_R = 1.4, ESC_T = 2.2, PING_T = 7, FL_SHOW = 1.6, TICK = 10, ZONE_V = 0.9, ZONE_MAX = 32, NP = 35;
  const SHOPS = [['🏦', 'la Banca', '#2f5a8a'], ['💎', 'la Gioielleria', '#7a3a8a'], ['🖼️', 'il Museo', '#8a6a2f'], ['🎰', 'il Casinò', '#8a2f3a'], ['⌚', "l'Orologeria", '#2f7a6a'], ['🏺', "l'Antiquario", '#7a4a2e'], ['🎨', 'la Galleria', '#3a6a8a'], ['🪙', 'la Zecca', '#8a7a2a']];
  const STN = ['Centrale', 'Teatro', 'Mercato', 'Fiume', 'Castello', 'Duomo'];
  const XC = '#ff6a5a', DC = '#8ab8ff';
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const xs = G => G.chars.filter(c => c.mx && c.alive && !c.out);
  const dets = G => G.chars.filter(c => !c.mx && c.alive && !c.out);
  const ugOn = (G, c) => !!(c.ug && G.time < c.ug.e);
  const inDuel = (G, c) => !!(G.du && (G.du.x === c.id || G.du.ds.includes(c.id)));
  const T_ = (x, y) => { const M = MP(); return x < 0 || y < 0 || x >= W || y >= H ? BL : M.T[y * W + x]; };
  const isTall = (x, y) => { const s = cqSolid[y] && cqSolid[y][x]; return !!s && (s.prop === 'bld' || s.prop === 'metro' || s.prop === 'crate'); };
  const litAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); return !!(M.lit && xi >= 0 && yi >= 0 && xi < W && yi < H && M.lit[yi * W + xi]); };
  function los(ax, ay, bx, by) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3); for (let i = 1; i < n; i++) { const t = i / n; if (isTall(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t))) return false; } return true; }
  // TORCIA dei detective: cono lungo TORCH_L nella direzione c.ta (angolo nel mondo, dove sta guardando); i palazzi la fermano
  const taOf = c => c === cq.g.me ? Math.atan2(cq.wdy || 0, cq.wdx || 1) : (c.ta || 0);
  function inTorch(c, x, y) {
    if (c.mx || !c.alive || c.out) return false; const p = P(c), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > TORCH_L) return false; if (d < 0.8) return true;
    let a = Math.atan2(dy, dx) - taOf(c); a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < TORCH_A && los(p.x, p.y, x, y);
  }

  // ======================= CITTA' (col seme) =======================
  function mapCity(seed) {
    const rnd = MG.rnd(seed), N = W * H, T = new Uint8Array(N), RD = new Uint8Array(N), BI = new Int16Array(N).fill(-1);
    const I = (x, y) => y * W + x, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const DY = H - 9;   // prima riga del molo
    const lines = max => { const Lx = []; let p = 3; while (p + 4 <= max) { Lx.push(p); p += 4 + ri(9, 13); } return Lx; };
    const VX = lines(W - 3), HY = lines(DY - 3), VX1 = VX[VX.length - 1] + 4, HYL = HY[HY.length - 1] + 4;
    const vk = new Int8Array(N).fill(-1), hk = new Int8Array(N).fill(-1);
    for (const x0 of VX) for (let y = HY[0]; y < DY; y++) for (let k = 0; k < 4; k++) vk[I(x0 + k, y)] = k;
    for (const y0 of HY) for (let x = VX[0]; x < VX1; x++) for (let k = 0; k < 4; k++) hk[I(x, y0 + k)] = k;
    for (let i = 0; i < N; i++) {
      const a = vk[i], b = hk[i]; if (a < 0 && b < 0) continue;
      if (a >= 0 && b >= 0) { if ((a === 0 || a === 3) && (b === 0 || b === 3)) T[i] = SW; else { T[i] = RO; RD[i] = 5; } }
      else if (a >= 0) { T[i] = a === 0 || a === 3 ? SW : RO; if (T[i] === RO) RD[i] = a; }
      else { T[i] = b === 0 || b === 3 ? SW : RO; if (T[i] === RO) RD[i] = b + 2; }
    }
    // VIE BUIE: 2 strade verticali e 1-2 orizzontali (non quelle sul bordo) senza lampioni: di notte li' non si vede niente
    const darkV = VX.slice(1, -1).sort(() => rnd() - 0.5).slice(0, 2), darkH = HY.slice(1, -1).sort(() => rnd() - 0.5).slice(0, rnd() < 0.5 ? 2 : 1), dark = new Uint8Array(N);
    for (const x0 of darkV) for (let y = HY[0]; y < DY; y++) for (let k = 0; k < 4; k++) dark[I(x0 + k, y)] = 1;
    for (const y0 of darkH) for (let x = VX[0]; x < VX1; x++) for (let k = 0; k < 4; k++) dark[I(x, y0 + k)] = 1;
    // molo (3 righe di assi) e mare con 3 pontili
    for (let y = DY; y < H; y++) for (let x = 0; x < W; x++) T[I(x, y)] = y < DY + 3 ? DK : WA;
    const piers = []; { const cand = VX.slice(1, -1).sort(() => rnd() - 0.5).slice(0, 3); for (const x0 of cand) { piers.push(x0 + 1); for (let y = DY + 3; y < H - 1; y++) for (let k = 1; k <= 2; k++) T[I(x0 + k, y)] = DK; } }
    // isolati: colonne cx e righe ry (le prime e le ultime toccano il bordo: solo palazzi)
    const cx = [[0, VX[0]]], ry = [[0, HY[0]]];
    for (let k = 1; k < VX.length; k++) cx.push([VX[k - 1] + 4, VX[k]]); cx.push([VX1, W]);
    for (let k = 1; k < HY.length; k++) ry.push([HY[k - 1] + 4, HY[k]]); ry.push([HYL, DY]);
    // FIUME: la riga di isolati a meta' diventa lungofiume (QY) + acqua; acqua da bordo a bordo; 3 ponti sulle strade verticali
    const rj = Math.max(1, Math.floor(ry.length / 2)), [ra, rb] = ry[rj], hh = rb - ra, wh = hh >= 11 ? 5 : 4, wy0 = ra + Math.floor((hh - wh) / 2);
    for (let y = ra; y < rb; y++) for (let x = 0; x < W; x++) {
      const i = I(x, y), wat = y >= wy0 && y < wy0 + wh;
      if (wat) T[i] = WA;
      else if (x >= VX[0] && x < VX1 && vk[i] < 0) T[i] = QY;
    }
    const bridges = []; { const n = VX.length, pick = [Math.floor(n * 0.15), Math.floor(n * 0.5), Math.ceil(n * 0.85) - 1].map(k => Math.max(0, Math.min(n - 1, k))); for (const k of [...new Set(pick)]) { bridges.push(VX[k]); for (let y = wy0; y < wy0 + wh; y++) for (let j = 0; j < 4; j++) T[I(VX[k] + j, y)] = BR; } }
    // PARCO: 2x2 isolati interni (le strade dentro diventano vialetti); PIAZZE: 3 isolati
    const interior = []; for (let a = 1; a < cx.length - 1; a++) for (let b = 1; b < ry.length - 1; b++) if (b !== rj) interior.push([a, b]);
    const used = new Set(), K2 = (a, b) => a + ',' + b;
    let park = null;
    for (let k = 0; k < 200 && !park; k++) { const [a, b] = interior[Math.floor(rnd() * interior.length)]; if (a + 1 >= cx.length - 1 || b + 1 >= ry.length - 1 || b + 1 === rj || b === rj) continue; park = [a, b]; }
    if (park) { const [a, b] = park; for (const q of [[a, b], [a + 1, b], [a, b + 1], [a + 1, b + 1]]) used.add(K2(...q)); }
    const plazas = []; for (let k = 0; k < 400 && plazas.length < 3; k++) { const [a, b] = interior[Math.floor(rnd() * interior.length)]; if (used.has(K2(a, b)) || plazas.some(([c, d]) => Math.abs(c - a) + Math.abs(d - b) < 3)) continue; plazas.push([a, b]); used.add(K2(a, b)); }
    const props = [], pp = (t, x, y, o) => { props.push([t, x, y, o || {}]); occ.add(I(x, y)); }, occ = new Set();
    const B = [];   // palazzi: { x0, y0, x1, y1, h, c, r, lit }
    const WALL = ['#6a5a4e', '#5e5852', '#72604e', '#585e66', '#6e5248', '#4e5a5e', '#665e50', '#5a4e5e', '#7a6a58', '#545450'];
    const ROOF = ['#3a3836', '#3e3a34', '#33363a', '#403630', '#38342e', '#2e3236'];
    function bld(x0, y0, x1, y1) {
      const b = B.length; B.push({ x0, y0, x1, y1, h: 1.45 + rnd() * 1.0, c: WALL[Math.floor(rnd() * WALL.length)], r: ROOF[Math.floor(rnd() * ROOF.length)], lit: 0.12 + rnd() * 0.3, ws: rnd() < 0.5 ? 1 : 2 });
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { T[I(x, y)] = BL; BI[I(x, y)] = b; }
    }
    function split(x0, y0, x1, y1, d) {
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      if (d < 3 && w * h > 24 && rnd() < 0.85) { if (w >= h && w >= 6) { const s = ri(x0 + 2, x1 - 3); split(x0, y0, s + 1, y1, d + 1); split(s + 1, y0, x1, y1, d + 1); return; } if (h >= 6) { const s = ri(y0 + 2, y1 - 3); split(x0, y0, x1, s + 1, d + 1); split(x0, s + 1, x1, y1, d + 1); return; } }
      bld(x0, y0, x1, y1);
    }
    for (let a = 0; a < cx.length; a++) for (let b = 0; b < ry.length; b++) {
      const [x0, x1] = cx[a], [y0, y1] = ry[b]; if (x1 <= x0 || y1 <= y0) continue;
      if (b === rj) { if (a === 0 || a === cx.length - 1) { split(x0, ra, x1, wy0, 1); split(x0, wy0 + wh, x1, rb, 1); } continue; }   // lungo il fiume, ai bordi: palazzi sopra e sotto l'acqua
      if (used.has(K2(a, b))) continue;
      const inner = a > 0 && a < cx.length - 1 && b > 0 && b < ry.length - 1;
      if (!inner) { split(x0, y0, x1, y1, 1); continue; }
      // vicoli che tagliano l'isolato (scorciatoie)
      let ax = -1, ay = -1;
      if (x1 - x0 >= 9 && rnd() < 0.55) ax = ri(x0 + 3, x1 - 4);
      if (y1 - y0 >= 9 && rnd() < 0.35) ay = ri(y0 + 3, y1 - 4);
      const xsx = ax >= 0 ? [[x0, ax], [ax + 1, x1]] : [[x0, x1]], ysy = ay >= 0 ? [[y0, ay], [ay + 1, y1]] : [[y0, y1]];
      for (const [p0, p1] of xsx) for (const [q0, q1] of ysy) split(p0, q0, p1, q1, 0);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x === ax || y === ay) T[I(x, y)] = AL;
    }
    // caselle di palazzo rimaste senza palazzo (dove una strada finisce contro il bordo): vanno al palazzo accanto
    for (let pass = 0, left = 1; pass < 8 && left; pass++) { left = 0; for (let i = 0; i < N; i++) { if (T[i] !== BL || BI[i] >= 0) continue; const x = i % W, y = (i / W) | 0; const nb = [[x - 1, y], [x, y - 1], [x + 1, y], [x, y + 1]].find(([a, b]) => a >= 0 && b >= 0 && a < W && b < H && T[I(a, b)] === BL && BI[I(a, b)] >= 0); if (nb) BI[i] = BI[I(nb[0], nb[1])]; else left++; } }
    // parco
    let pond = null, parkR = null;
    if (park) {
      const [a, b] = park, x0 = cx[a][0], x1 = cx[a + 1][1], y0 = ry[b][0], y1 = ry[b + 1][1]; parkR = [x0, y0, x1, y1];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = I(x, y); T[i] = vk[i] >= 0 || hk[i] >= 0 ? PA : GR; RD[i] = 0; }
      // laghetto in un quarto
      const qx = rnd() < 0.5 ? x0 + 2 : cx[a + 1][0] + 1, qy = rnd() < 0.5 ? y0 + 2 : ry[b + 1][0] + 1, pw = Math.max(3, Math.min(6, cx[a][1] - cx[a][0] - 4)), ph = Math.max(3, Math.min(5, ry[b][1] - ry[b][0] - 4));
      pond = [qx, qy, pw, ph];
      for (let y = qy; y < qy + ph; y++) for (let x = qx; x < qx + pw; x++) { const u = (x + 0.5 - qx - pw / 2) / (pw / 2), v = (y + 0.5 - qy - ph / 2) / (ph / 2); if (u * u + v * v < 1.05 && T[I(x, y)] === GR) T[I(x, y)] = WA; }
    }
    for (const [a, b] of plazas) { const [x0, x1] = cx[a], [y0, y1] = ry[b]; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) T[I(x, y)] = PZ; }
    // acqua: oggetto invisibile che non fa camminare (il disegno e' nel pavimento)
    for (let i = 0; i < N; i++) if (T[i] === WA) pp('wat', i % W, (i / W) | 0);
    // palazzi
    for (let i = 0; i < N; i++) if (T[i] === BL && BI[i] >= 0) pp('bld', i % W, (i / W) | 0, { b: BI[i] });
    for (let i = 0; i < N; i++) if (T[i] === BL && BI[i] < 0) { BI[i] = -2; pp('bld', i % W, (i / W) | 0, { b: -1 }); }   // (non dovrebbe succedere)
    const free = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && T[I(x, y)] !== BL && T[I(x, y)] !== WA && !occ.has(I(x, y));
    const far = (L2, x, y, d) => L2.every(q => Math.hypot(q.x - x, q.y - y) >= d);
    // ELIPORTO nella prima piazza (elicottero su 2x2), FONTANA o STATUA nelle altre
    let heli = null; const pads = [];
    plazas.forEach(([a, b], k) => {
      const [x0, x1] = cx[a], [y0, y1] = ry[b], mx = Math.floor((x0 + x1) / 2) - 1, my = Math.floor((y0 + y1) / 2) - 1;
      if (k === 0) { heli = { x: mx, y: my }; pads.push([mx + 1, my + 1]); pp('heli', mx, my, { part: 1 }); pp('heli', mx + 1, my, { part: 1 }); pp('heli', mx, my + 1, { part: 1 }); pp('heli', mx + 1, my + 1, { main: 1 }); }
      else if (k === 1) { pp('fount', mx, my, { part: 1 }); pp('fount', mx + 1, my, { part: 1 }); pp('fount', mx, my + 1, { part: 1 }); pp('fount', mx + 1, my + 1, { main: 1 }); }
      else pp('statue', mx + 1, my + 1, {});
      // alberi nelle aiuole agli angoli e panchine
      for (const [tx, ty] of [[x0 + 1, y0 + 1], [x1 - 2, y0 + 1], [x0 + 1, y1 - 2], [x1 - 2, y1 - 2]]) if (free(tx, ty)) pp('ptree', tx, ty, { v: Math.floor(rnd() * 3) });
      for (let n = 0, t = 0; n < 3 && t < 30; t++) { const bx = ri(x0 + 2, x1 - 3), by = rnd() < 0.5 ? y0 + 1 : y1 - 2; if (free(bx, by) && Math.abs(bx - mx) > 1) { pp('bench', bx, by, { d: 0 }); n++; } }
    });
    // parco: alberi, panchine lungo i vialetti, statua al centro
    if (parkR) {
      const [x0, y0, x1, y1] = parkR, trees = new Set();
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (T[I(x, y)] !== GR || occ.has(I(x, y))) continue;
        const nearPath = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T[I(x + dx, y + dy)] === PA);
        const r = rnd();
        if (!nearPath && r < 0.16 && ![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => trees.has(I(x + dx, y + dy)))) { trees.add(I(x, y)); pp('tree', x, y, { v: Math.floor(rnd() * 3) }); }
        else if (nearPath && r < 0.05) pp('bench', x, y, { d: 0 });
      }
    }
    // LAMPIONI: lungo i marciapiedi ogni 6 caselle (alternati), sul lungofiume, sul molo, nei vialetti del parco e agli angoli delle piazze
    const lamps = [];
    const lampOk = (x, y) => free(x, y) && !lamps.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = I(x, y), t = T[i]; let want = false;
      if (t === SW && hk[i] < 0 && vk[i] >= 0) want = (y + (vk[i] === 0 ? 0 : 4)) % 8 === 0 && hk[I(x, y - 1)] < 0 && hk[I(x, y + 1)] < 0;
      else if (t === SW && vk[i] < 0 && hk[i] >= 0) want = (x + (hk[i] === 0 ? 0 : 4)) % 8 === 0 && vk[I(x - 1, y)] < 0 && vk[I(x + 1, y)] < 0;
      else if (t === QY) want = (y === ra || y === rb - 1) && x % 7 === 3;
      else if (t === DK) want = y === DY && x % 7 === 2;
      else if (t === PA) want = (x + y) % 6 === 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T[I(x + dx, y + dy)] === GR) && rnd() < 0.5;
      if (want && !dark[i] && lampOk(x, y)) { lamps.push([x, y]); pp('lamp', x, y, {}); }
    }
    for (const [a, b] of plazas) { const [x0, x1] = cx[a], [y0, y1] = ry[b]; for (const [lx, ly] of [[x0, y0], [x1 - 1, y0], [x0, y1 - 1], [x1 - 1, y1 - 1], [Math.floor((x0 + x1) / 2), y0]]) if (lampOk(lx, ly)) { lamps.push([lx, ly]); pp('lamp', lx, ly, {}); } }
    // caselle di palazzo con un lato visibile (sud = y+1, est = x+1) su un marciapiede: vetrine e ingressi
    const fronts = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = I(x, y); if (T[i] !== BL || BI[i] < 0) continue; const ins = vk[i] < 0 && hk[i] < 0; if (!ins) continue; if (T[I(x, y + 1)] === SW && !occ.has(I(x, y + 1))) fronts.push({ x, y, f: 's', sx: x + 0.5, sy: y + 1.5 }); else if (T[I(x + 1, y)] === SW && !occ.has(I(x + 1, y))) fronts.push({ x, y, f: 'e', sx: x + 1.5, sy: y + 0.5 }); }
    const sh = fronts.slice().sort(() => rnd() - 0.5);
    // COLPI: 6 negozi lontani tra loro (la vetrina sul lato che si vede)
    const loot = [];
    for (const f of sh) { if (loot.length >= SHOPS.length) break; if (f.y > DY - 2 || !far(loot, f.x, f.y, 17)) continue; loot.push(Object.assign({ k: loot.length }, f)); }
    for (const l of loot) occ.add(I(Math.floor(l.sx), Math.floor(l.sy)));   // davanti ai negozi niente telecamere o lampioni
    // QUESTURA: dove partono i detective (vicino al centro), con le volanti davanti
    let police = null; { let bd = 1e9; for (const f of sh) { if (loot.some(l => Math.hypot(l.x - f.x, l.y - f.y) < 10)) continue; const d = Math.hypot(f.x - W / 2, f.y - H * 0.42); if (d < bd) { bd = d; police = f; } } }
    // METRO: 5 ingressi agli angoli degli isolati (al posto della casella d'angolo di un palazzo)
    const metro = [];
    for (let k = 0; k < 2000 && metro.length < 5; k++) {
      const a = 1 + Math.floor(rnd() * (cx.length - 2)), b = 1 + Math.floor(rnd() * (ry.length - 2)); if (b === rj || used.has(K2(a, b))) continue;
      const x = cx[a][1] - 1, y = ry[b][1] - 1, i = I(x, y);   // angolo in basso a destra: si vede bene, si entra dal marciapiede davanti
      if (T[i] !== BL || occ.has(I(x, y + 1)) || loot.some(l => l.x === x && l.y === y) || (police && police.x === x && police.y === y) || !far(metro, x, y, k < 1000 ? 20 : 13)) continue;
      const pi = props.findIndex(p => p[1] === x && p[2] === y); if (pi >= 0) props.splice(pi, 1);
      BI[i] = -1; props.push(['metro', x, y, { n: metro.length }]);
      metro.push({ x, y, n: STN[metro.length], sx: x + 0.5, sy: y + 1.5 });
    }
    if (police) occ.add(I(Math.floor(police.sx), Math.floor(police.sy))); for (const m of metro) occ.add(I(Math.floor(m.sx), Math.floor(m.sy)));
    // (telecamere e tombini tolti nel secondo giro "caccia lenta")
    const tombs = [], deco = [], decoAt = new Map();
    const dput = (x, y, t) => { const k = x + ',' + y; if (decoAt.has(k)) { const j = deco.findIndex(d => d[0] === x && d[1] === y); if (j >= 0) deco.splice(j, 1); } deco.push([x, y, t]); decoAt.set(k, t); };
    // vie buie: lampioni rotti per terra e cartacce (si riconoscono anche di giorno)
    for (let i = 0; i < N; i++) if (dark[i] && T[i] === SW && !occ.has(i) && rnd() < 0.05) dput(i % W, (i / W) | 0, rnd() < 0.3 ? 'bin' : 'lt');
    // strisce pedonali davanti agli incroci
    for (const x0 of VX) for (const y0 of HY) {
      for (const k of [1, 2]) { for (const yy of [y0 - 1, y0 + 4]) if (T[I(x0 + k, yy)] === RO) dput(x0 + k, yy, 'zv'); for (const xx of [x0 - 1, x0 + 4]) if (T[I(xx, y0 + k)] === RO) dput(xx, y0 + k, 'zh'); }
    }
    // AUTO PARCHEGGIATE (2 caselle lungo la corsia vicino al marciapiede)
    const CARS = ['#a83a32', '#2f5a8a', '#d8d4c8', '#3a3a3e', '#6a7a3a', '#c8a030', '#5a3a6a'];
    const nearSpecial = (x, y) => [...loot, ...metro].some(l => Math.hypot(l.sx - x - 0.5, l.sy - y - 0.5) < 3) || (police && Math.hypot(police.sx - x, police.sy - y) < 3);
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = I(x, y); if (T[i] !== RO || occ.has(i) || decoAt.has(x + ',' + y) || nearSpecial(x, y)) continue;
      const v = RD[i] === 1 || RD[i] === 2, hz = RD[i] === 3 || RD[i] === 4; if (!v && !hz) continue;
      const nx = v ? x : x + 1, ny = v ? y + 1 : y, j = I(nx, ny); if (RD[j] !== RD[i] || occ.has(j) || decoAt.has(nx + ',' + ny)) continue;
      if (rnd() > 0.045) continue;
      const col = CARS[Math.floor(rnd() * CARS.length)]; pp('car', x, y, { part: 1, v: v ? 1 : 0 }); pp('car', nx, ny, { v: v ? 1 : 0, c: col, s: RD[i] === 1 || RD[i] === 3 ? 0 : 1 });
    }
    // volanti davanti alla questura (sulla strada vicina)
    const pstart = police ? { x: police.sx, y: police.sy } : { x: VX[1] + 1.5, y: HY[1] + 1.5 };
    // PORTO: barche ormeggiate accanto ai pontili; il motoscafo della fuga in fondo a un pontile
    let boat = null;
    piers.forEach((px0, k) => { const y = H - 3; if (k === 0) { boat = { x: px0 + 2, y: y }; pp('boat', px0 + 2, y, { main: 1, k: 1 }); } else if (T[I(px0 - 1, y)] === WA) { const j = props.findIndex(p => p[0] === 'wat' && p[1] === px0 - 1 && p[2] === y); if (j >= 0) props.splice(j, 1); pp('boat', px0 - 1, y, { main: 1, k: 0 }); } });
    // casse e bitte sul molo
    for (let x = 1; x < W - 1; x++) { const y = DY + 1; if (rnd() < 0.08 && free(x, y) && vk[I(x, DY - 1)] < 0 && !piers.some(p => Math.abs(p - x) < 3)) pp('crate', x, y, { v: Math.floor(rnd() * 3) }); if (x % 5 === 0 && T[I(x, DY + 2)] === DK && T[I(x, DY + 3)] === WA) dput(x, DY + 2, 'bol'); }
    // decorazioni sparse per terra
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = I(x, y), t = T[i]; if (occ.has(i) || decoAt.has(x + ',' + y)) continue; const r = rnd();
      if (t === RO && r < 0.025) dput(x, y, 'pd'); else if (t === SW && r < 0.03) dput(x, y, 'lt'); else if (t === GR && r < 0.08) dput(x, y, 'fl'); else if ((t === AL) && r < 0.12) dput(x, y, r < 0.05 ? 'bin' : 'lt');
    }
    // ESCAPE: 0 = porto (fondo del pontile col motoscafo), 1 = eliporto (davanti all'elicottero)
    const EP = [{ n: '🚤 il Porto', da: 'dal Porto', e: '🚤', x: boat ? boat.x - 0.5 : W / 2, y: boat ? boat.y + 0.5 : H - 4 }, { n: "🚁 l'Eliporto", da: "dall'Eliporto", e: '🚁', x: heli ? heli.x + 1 : W / 2, y: heli ? heli.y + 2.6 : H / 2 }];
    // caselle illuminate dai lampioni
    const lit = new Uint8Array(N);
    for (const [lx, ly] of lamps) for (let y = Math.max(0, ly - 3); y <= Math.min(H - 1, ly + 3); y++) for (let x = Math.max(0, lx - 3); x <= Math.min(W - 1, lx + 3); x++) if (Math.hypot(x - lx, y - ly) < LIT_R) lit[I(x, y)] = 1;
    // PASSANTI: giri chiusi sui marciapiedi (strade solo sulle strisce, se possibile), calcolati qui col seme: uguali su tutti i telefono
    const solid = new Uint8Array(N); for (const p of props) solid[I(p[1], p[2])] = 1; for (let i = 0; i < N; i++) if (T[i] === BL || T[i] === WA) solid[i] = 1;
    const cost = i => solid[i] ? 0 : dark[i] ? 7 : T[i] === RO ? (decoAt.has((i % W) + ',' + ((i / W) | 0)) ? 1 : 4) : T[i] === GR ? 2 : 1;   // nelle vie buie quasi nessuno
    function dfield(tx, ty) {   // costi dalla casella di arrivo (code a secchi: costi 1-7)
      const D = new Int32Array(N).fill(1e9), Q = [[], [], [], [], [], [], [], []]; let cur = 0, left = 1; D[I(tx, ty)] = 0; Q[0].push(I(tx, ty));
      while (left) { const q = Q[cur % 8]; if (!q.length) { cur++; continue; } const i = q.pop(); left--; const d = D[i]; if (d !== cur) continue; const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = I(nx, ny), c = cost(j); if (!c) continue; const nd = d + c; if (nd < D[j]) { D[j] = nd; Q[nd % 8].push(j); left++; } } }
      return D;
    }
    function legPath(ax, ay, bx, by) {
      const D = dfield(bx, by); if (D[I(ax, ay)] >= 1e9) return null;
      const out = [[ax, ay]]; let x = ax, y = ay, pdx = 0, pdy = 0;
      for (let n = 0; n < 600 && (x !== bx || y !== by); n++) {
        // un passo sulla strada piu' corta (D cala del costo della casella dove sono); a parita' si va dritti
        const tv = D[I(x, y)] - cost(I(x, y)); let best = null, bd = D[I(x, y)];
        for (const [dx, dy] of [[pdx, pdy], [1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const d = D[I(nx, ny)]; if (d === tv) { best = [dx, dy]; break; } if (d < bd) { bd = d; best = [dx, dy]; } }
        if (!best) break; x += best[0]; y += best[1]; pdx = best[0]; pdy = best[1]; out.push([x, y]);
      }
      return out;
    }
    const walkC = []; for (let i = 0; i < N; i++) if (!solid[i] && !dark[i] && (T[i] === SW || T[i] === PZ || T[i] === PA || T[i] === QY || T[i] === DK || T[i] === AL)) { walkC.push(i); if (T[i] === PZ) walkC.push(i, i); }   // piazze piu' affollate
    const PR = [];
    for (let k = 0; k < NP && walkC.length; k++) {
      const pts = [walkC[Math.floor(rnd() * walkC.length)]]; for (let t = 0; t < 40 && pts.length < 4; t++) { const j = walkC[Math.floor(rnd() * walkC.length)], a = pts[pts.length - 1], d = Math.abs(j % W - a % W) + Math.abs(((j / W) | 0) - ((a / W) | 0)); if (d > 12 && d < 45) pts.push(j); }
      pts.push(pts[0]); let cells = [];
      for (let s = 0; s + 1 < pts.length; s++) { const lp = legPath(pts[s] % W, (pts[s] / W) | 0, pts[s + 1] % W, (pts[s + 1] / W) | 0); if (!lp) { cells = null; break; } cells = cells.concat(s ? lp.slice(1) : lp); }
      if (!cells || cells.length < 8) continue;
      // solo gli angoli (tratti dritti), al centro delle caselle
      const p = [[cells[0][0] + 0.5, cells[0][1] + 0.5]];
      for (let s = 1; s < cells.length - 1; s++) { const [a0, b0] = cells[s - 1], [a1, b1] = cells[s], [a2, b2] = cells[s + 1]; if (a1 - a0 !== a2 - a1 || b1 - b0 !== b2 - b1) p.push([a1 + 0.5, b1 + 0.5]); }
      p.push([cells[cells.length - 1][0] + 0.5, cells[cells.length - 1][1] + 0.5]);
      const cum = [0]; for (let s = 1; s < p.length; s++) cum.push(cum[s - 1] + Math.hypot(p[s][0] - p[s - 1][0], p[s][1] - p[s - 1][1]));
      PR.push({ p, cum, L: cum[cum.length - 1], o: rnd() * cum[cum.length - 1], v: 0.15 + rnd() * 0.04, jx: (rnd() - 0.5) * 0.3, jy: (rnd() - 0.5) * 0.3, l: Math.floor(rnd() * 10) });
    }
    const rooms = [{ n: 'Città', x: 0, y: 0, w: W, h: H, c: ['#2a2d32', '#2a2d32'], wc: '#3a3a3a', k: 'city', nl: 1 }];
    const ring = []; for (let i = 0; i < 10; i++) ring.push([Math.floor(pstart.x) + (i % 3) - 1, Math.floor(pstart.y)]);
    return { w: W, h: H, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring, button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      deco, decoAt, draw, floor: FLOOR, decoDraw, bg: () => '#07090d',
      T, RD, BI, B, VX, HY, DY, river: [wy0, wh], bridges, parkR, plazas, loot, police, pstart, metro, cams: [], tombs, dark, lamps, lit, EP, heli, boat, PR, seed };
  }

  // ---- disegno della mappa (K = attrezzi di cqTools) ----
  const FLOOR = {
    city(K, x, y) {
      const M = MP(), t = M.T[y * W + x], rd = M.RD[y * W + x], Pp = (u, v) => K.S(x + u, y + v, 0), tile = c => K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], c), big = K.TW >= 40;
      const nb = (dx, dy) => T_(x + dx, y + dy);
      if (t === RO || (t === BR && (rd === 1 || rd === 2))) {
        tile('#30343a'); if (big) K.speck(x, y, 6, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.2)'], K.TW / 22);
        // linea di mezzeria tratteggiata tra le due corsie, bordo del marciapiede
        if (rd === 1 && y % 2 === 0) K.strokes([[Pp(0.98, 0.15), Pp(0.98, 0.85)]], '#c8b45a', Math.max(1.5, K.TW / 22));
        if (rd === 3 && x % 2 === 0) K.strokes([[Pp(0.15, 0.98), Pp(0.85, 0.98)]], '#c8b45a', Math.max(1.5, K.TW / 22));
        for (const [dx, dy, a, b] of [[-1, 0, Pp(0.02, 0), Pp(0.02, 1)], [1, 0, Pp(0.98, 0), Pp(0.98, 1)], [0, -1, Pp(0, 0.02), Pp(1, 0.02)], [0, 1, Pp(0, 0.98), Pp(1, 0.98)]]) if (nb(dx, dy) === SW) K.strokes([[a, b]], '#1e2024', Math.max(2, K.TW / 16));
        return;
      }
      if (t === BR) {   // ponte: corsie d'asfalto, marciapiedi di pietra con il parapetto sopra l'acqua
        const road = M.RD[y * W + x] === 1 || M.RD[y * W + x] === 2; tile(road ? '#30343a' : '#7a7268');
        if (!road && big) K.strokes([[Pp(0.5, 0), Pp(0.5, 1)]], 'rgba(0,0,0,.18)');
        for (const [dx, a, b] of [[-1, Pp(0.06, 0), Pp(0.06, 1)], [1, Pp(0.94, 0), Pp(0.94, 1)]]) if (nb(dx, 0) === WA) { K.strokes([[a, b]], '#4a4440', Math.max(3, K.TW / 9)); K.strokes([[a, b]], '#9a9288', Math.max(1.5, K.TW / 24)); }
        return;
      }
      if (t === SW) {   // marciapiede a lastre
        tile('#6c6b67'); if (big) { K.strokes([[Pp(0.5, 0.02), Pp(0.5, 0.98)], [Pp(0.02, 0.5), Pp(0.98, 0.5)]], 'rgba(0,0,0,.16)'); K.speck(x, y, 3, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.12)'], K.TW / 26); }
        return;
      }
      if (t === PZ) {   // piazza: grandi pietre a spina di pesce, l'eliporto disegnato sopra
        tile('#7a7266'); if (big) { if ((x + y) % 2) K.strokes([[Pp(0.1, 0.1), Pp(0.9, 0.9)]], 'rgba(0,0,0,.14)'); else K.strokes([[Pp(0.9, 0.1), Pp(0.1, 0.9)]], 'rgba(255,255,255,.07)'); }
        const hl = M.heli; if (hl && Math.abs(x - hl.x - 0.5) < 3 && Math.abs(y - hl.y - 0.5) < 3) {
          const cxp = hl.x + 1, cyp = hl.y + 1, g = K.g; g.save(); g.beginPath(); const Q = [Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)]; Q.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.clip();
          const [X, Y] = K.S(cxp, cyp, 0); g.fillStyle = '#3e4248'; g.beginPath(); g.ellipse(X, Y, K.TW * 2.1, K.TW * 1.05, 0, 0, 7); g.fill(); g.strokeStyle = '#e8c840'; g.lineWidth = Math.max(2, K.TW / 12); g.beginPath(); g.ellipse(X, Y, K.TW * 1.85, K.TW * 0.92, 0, 0, 7); g.stroke(); g.restore();
        }
        return;
      }
      if (t === GR) { tile('#2c5428'); if (big) { const L2 = []; for (let i = 0; i < 4; i++) { const u = 0.15 + 0.7 * K.hsh(x, y, 20 + i), v = 0.15 + 0.7 * K.hsh(x, y, 30 + i); L2.push([K.S(x + u, y + v, 0), K.S(x + u + 0.04, y + v, 0.12)]); } K.strokes(L2, '#4a7a3a'); } return; }
      if (t === PA) { tile('#7e6e52'); if (big) K.speck(x, y, 6, ['rgba(255,240,200,.14)', 'rgba(40,25,10,.22)'], K.TW / 22); return; }
      if (t === WA) {   // acqua scura con i riflessi
        tile('#132a40'); if (big && K.hsh(x, y, 50) < 0.5) { const u = 0.2 + 0.5 * K.hsh(x, y, 51), v = 0.2 + 0.6 * K.hsh(x, y, 52); K.strokes([[Pp(u, v), Pp(u + 0.25, v)]], '#2a4a66', Math.max(1.5, K.TW / 26)); }
        for (const [dx, dy, a, b] of [[0, -1, Pp(0, 0.04), Pp(1, 0.04)], [-1, 0, Pp(0.04, 0), Pp(0.04, 1)]]) { const n = nb(dx, dy); if (n !== WA && n !== BL) K.strokes([[a, b]], '#0a1828', Math.max(3, K.TW / 8)); }
        return;
      }
      if (t === DK) {   // assi di legno del molo
        tile('#5c4430'); if (big) { const L2 = []; for (let i = 1; i < 4; i++) L2.push([Pp(0, i / 4), Pp(1, i / 4)]); K.strokes(L2, 'rgba(0,0,0,.25)'); if (K.hsh(x, y, 60) < 0.3) K.dot(x + 0.2 + 0.6 * K.hsh(x, y, 61), y + 0.12, 0, 0.02, '#2a2018'); }
        return;
      }
      if (t === AL) { tile('#4a4642'); if (big) { for (let i = 0; i < 4; i++) { const u = 0.15 + 0.7 * K.hsh(x, y, 70 + i), v = 0.15 + 0.7 * K.hsh(x, y, 80 + i); K.dot(x + u, y + v, 0, 0.06, i % 2 ? '#56514c' : '#3e3a36'); } } return; }
      if (t === QY) {   // lungofiume: lastre di pietra, ringhiera sul bordo dell'acqua
        tile('#6a645c'); if (big) K.strokes([[Pp(0.33, 0.02), Pp(0.33, 0.98)], [Pp(0.66, 0.02), Pp(0.66, 0.98)]], 'rgba(0,0,0,.14)');
        for (const [dy, a, b] of [[1, Pp(0, 0.95), Pp(1, 0.95)], [-1, Pp(0, 0.05), Pp(1, 0.05)]]) if (nb(0, dy) === WA) K.strokes([[a, b]], '#3a3a3a', Math.max(2.5, K.TW / 12));
        return;
      }
      tile('#202226');
    }
  };
  function decoDraw(K, t, x, y) {
    const { S, dot, hsh } = K, g = K.g;
    if (t === 'mh') {   // tombino
      const [X, Y] = S(x + 0.5, y + 0.5, 0.01); g.fillStyle = '#1a1c20'; g.beginPath(); g.ellipse(X, Y, K.TW * 0.3, K.TW * 0.15, 0, 0, 7); g.fill();
      g.fillStyle = '#4a4c50'; g.beginPath(); g.ellipse(X, Y, K.TW * 0.25, K.TW * 0.125, 0, 0, 7); g.fill(); g.strokeStyle = '#2a2c30'; g.lineWidth = Math.max(1, K.TW / 34);
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X - K.TW * 0.2, Y + i * K.TW * 0.04); g.lineTo(X + K.TW * 0.2, Y + i * K.TW * 0.04); g.stroke(); }
    } else if (t === 'zv' || t === 'zh') {   // strisce pedonali
      const L2 = []; for (let i = 0; i < 4; i++) { const a = 0.1 + i * 0.22; L2.push(t === 'zv' ? [S(x + a, y + 0.15, 0.005), S(x + a, y + 0.85, 0.005)] : [S(x + 0.15, y + a, 0.005), S(x + 0.85, y + a, 0.005)]); }
      K.strokes(L2, '#d8d8d0', Math.max(2, K.TW / 9));
    } else if (t === 'pd') { const [X, Y] = S(x + 0.3 + 0.4 * hsh(x, y, 90), y + 0.3 + 0.4 * hsh(x, y, 91), 0.005); g.fillStyle = '#1e3040'; g.beginPath(); g.ellipse(X, Y, K.TW * 0.28, K.TW * 0.12, 0, 0, 7); g.fill(); g.fillStyle = '#4a6a80'; g.beginPath(); g.ellipse(X - K.TW * 0.06, Y - K.TW * 0.02, K.TW * 0.1, K.TW * 0.03, 0, 0, 7); g.fill(); }
    else if (t === 'lt') { for (let i = 0; i < 2; i++) dot(x + 0.2 + 0.6 * hsh(x, y, 92 + i), y + 0.2 + 0.6 * hsh(x, y, 94 + i), 0.01, 0.035, i ? '#c8c0a8' : '#8a6a4a'); }
    else if (t === 'fl') { for (let i = 0; i < 3; i++) dot(x + 0.15 + 0.7 * hsh(x, y, 96 + i), y + 0.15 + 0.7 * hsh(x, y, 99 + i), 0.05, 0.035, ['#e8d860', '#e87070', '#d8d8f0'][i]); }
    else if (t === 'bin') { K.bx(x + 0.3, y + 0.3, x + 0.7, y + 0.6, 0, 0.45, '#3a5a3a'); }
    else if (t === 'bol') { K.cyl(x + 0.5, y + 0.8, 0.1, 0, 0.3, '#2a2a2a'); }
  }
  // finestre su una faccia del palazzo: F(u, z) = punto sulla faccia (u lungo la faccia 0-1, z altezza)
  function windows(K, F, x, y, b, h, sd) {
    const rows = Math.max(1, Math.floor((h - 0.25) / 0.5));
    for (let r = 0; r < rows; r++) {
      const z0 = 0.28 + r * 0.5; if (z0 + 0.3 > h - 0.08) break;
      const n = b.ws; for (let k = 0; k < n; k++) {
        const u0 = n === 1 ? 0.3 : 0.14 + k * 0.44, u1 = u0 + (n === 1 ? 0.4 : 0.28), on = K.hsh(x * 3 + k, y * 5 + r, 300 + sd) < b.lit;
        K.poly([F(u0, z0), F(u1, z0), F(u1, z0 + 0.3), F(u0, z0 + 0.3)], on ? (K.hsh(x, y + r, 310 + k) < 0.5 ? '#f2cc70' : '#e8b860') : '#1c2430');
        if (on && K.TW >= 40) K.poly([F(u0, z0 + 0.15), F(u1, z0 + 0.15), F(u1, z0 + 0.17), F(u0, z0 + 0.17)], '#b88a40');
      }
    }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, hsh } = K, g = K.g, TW = K.TW;
    switch (t) {
      case 'wat': break;   // acqua: si disegna col pavimento
      case 'bld': {   // palazzo visto dall'alto: muri, finestre accese sui due lati che si vedono, tetto con il parapetto e qualche oggetto
        const M = MP(), b = M.B[o.b]; if (!b) { bx(x, y, x + 1, y + 1, 0, 1.5, '#555'); break; }
        const h = b.h, same = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && M.BI[yy * W + xx] === o.b;
        bx(x, y, x + 1, y + 1, 0, h, b.c);
        poly([S(x, y, h), S(x + 1, y, h), S(x + 1, y + 1, h), S(x, y + 1, h)], b.r);
        // parapetto sui bordi del tetto
        const pc = K.shade(b.c, 0.9);
        if (!same(x, y - 1)) bx(x, y, x + 1, y + 0.08, h, h + 0.12, pc);
        if (!same(x - 1, y)) bx(x, y, x + 0.08, y + 1, h, h + 0.12, pc);
        if (!same(x, y + 1)) bx(x, y + 0.92, x + 1, y + 1, h, h + 0.12, pc);
        if (!same(x + 1, y)) bx(x + 0.92, y, x + 1, y + 1, h, h + 0.12, pc);
        // oggetti sul tetto (condizionatori, comignoli, serbatoi)
        const r = hsh(x, y, 320), inner = same(x - 1, y) && same(x + 1, y) && same(x, y - 1) && same(x, y + 1);
        if (inner && r < 0.1) bx(x + 0.25, y + 0.3, x + 0.7, y + 0.7, h, h + 0.22, '#8a8e92');
        else if (inner && r < 0.15) { bx(x + 0.4, y + 0.4, x + 0.62, y + 0.62, h, h + 0.5, '#6a4a3a'); bx(x + 0.37, y + 0.37, x + 0.65, y + 0.65, h + 0.5, h + 0.56, '#5a3a2a'); }
        else if (inner && r < 0.18) { for (const [a, c] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) bx(x + a - 0.03, y + c - 0.03, x + a + 0.03, y + c + 0.03, h, h + 0.3, '#3a3a3a'); cyl(x + 0.5, y + 0.5, 0.32, h + 0.3, h + 0.8, '#7a5a3a'); }
        if (TW < 40) break;
        const shop = M.loot.find(l => l.x === x && l.y === y), pol = M.police && M.police.x === x && M.police.y === y;
        const faces = [[(u, z) => S(x + u, y + 1.002, z), !same(x, y + 1), 's'], [(u, z) => S(x + 1.002, y + u, z), !same(x + 1, y), 'e']];
        for (const [F, open, sd] of faces) {
          if (!open) continue;
          const fr = (shop && shop.f === sd) || (pol && M.police.f === sd);
          if (fr) {   // vetrina del negozio (o ingresso della questura) a pianterreno, insegna sopra
            const G0 = cq.g, robbed = shop && G0 && G0.mode === 'misterx' && G0.rob && G0.rob[shop.k] >= 0, col = pol ? '#2a4a8a' : SHOPS[shop.k][2];
            poly([F(0.08, 0.04), F(0.92, 0.04), F(0.92, 0.66), F(0.08, 0.66)], robbed ? '#141a22' : pol ? '#9ab8e8' : '#f8e0a0');
            if (robbed) K.strokes([[F(0.3, 0.1), F(0.5, 0.4)], [F(0.5, 0.4), F(0.75, 0.2)], [F(0.5, 0.4), F(0.45, 0.62)]], '#c8d0d8', Math.max(1, TW / 34));
            else if (!pol) { for (let i = 0; i < 3; i++) dot(...(sd === 's' ? [x + 0.25 + i * 0.25, y + 1.01] : [x + 1.01, y + 0.25 + i * 0.25]), 0.18, 0.04, ['#ffe9a0', '#a0e0ff', '#ffb0d0'][i]); }
            poly([F(0.02, 0.7), F(0.98, 0.7), F(0.98, 1.0), F(0.02, 1.0)], col);
            g.font = Math.round(TW * 0.3) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const [Xs, Ys] = F(0.5, 0.86);
            if (pol) { g.fillStyle = '#fff'; g.font = '700 ' + Math.round(TW * 0.16) + 'px system-ui,sans-serif'; g.fillText('POLIZIA', Xs, Ys); } else g.fillText(SHOPS[shop.k][0], Xs, Ys);
            if (!robbed) glow(...(sd === 's' ? [x + 0.5, y + 1.1] : [x + 1.1, y + 0.5]), 0.4, 1.2, pol ? 'rgba(120,170,255,.45)' : 'rgba(255,220,140,.5)');
            windows(K, (u, z) => F(u, z + 0.6), x, y, b, h - 0.6, sd === 's' ? 1 : 2);
            continue;
          }
          windows(K, F, x, y, b, h, sd === 's' ? 1 : 2);
          // scala antincendio su qualche facciata est
          if (sd === 'e' && hsh(x, y, 330) < 0.12 && h > 1.8) { const L2 = []; for (let z = 0.6; z < h - 0.2; z += 0.5) L2.push([F(0.1, z), F(0.9, z)], [F(0.15, z), F(0.85, z + 0.5 > h - 0.2 ? z : z + 0.5)]); K.strokes(L2, '#22262a', Math.max(1.5, TW / 26)); }
        }
        break; }
      case 'lamp': {   // lampione: palo verde scuro, braccio, lampada che fa luce
        cyl(x + 0.5, y + 0.5, 0.06, 0, 2.0, '#2e3a32'); line(S(x + 0.5, y + 0.5, 2.0), S(x + 0.5, y + 0.25, 2.1), '#2e3a32', Math.max(2, TW / 16));
        bx(x + 0.38, y + 0.15, x + 0.62, y + 0.36, 1.98, 2.12, '#3a4a40'); dot(x + 0.5, y + 0.25, 1.96, 0.07, '#ffe6a0');
        glow(x + 0.5, y + 0.25, 1.95, 1.5, 'rgba(255,205,120,.45)'); break; }
      case 'cam': {   // telecamera su un palo all'angolo dell'incrocio (la lucina rossa quando e' accesa si disegna sopra in partita)
        cyl(x + 0.5, y + 0.5, 0.05, 0, 1.75, '#3a3e44'); line(S(x + 0.5, y + 0.5, 1.75), S(x + 0.3, y + 0.3, 1.8), '#3a3e44', Math.max(2, TW / 18));
        bx(x + 0.15, y + 0.2, x + 0.4, y + 0.38, 1.7, 1.85, '#d8dce0'); dot(x + 0.2, y + 0.32, 1.78, 0.04, '#1a1a1a'); break; }
      case 'metro': {   // ingresso della metro: buco con le scale, ringhiere, palo con la M rossa
        poly([S(x + 0.1, y + 0.1, 0), S(x + 0.95, y + 0.1, 0), S(x + 0.95, y + 0.95, 0), S(x + 0.1, y + 0.95, 0)], '#12141a');
        for (let i = 1; i < 6; i++) K.strokes([[S(x + 0.15, y + 0.95 - i * 0.14, -0.0), S(x + 0.9, y + 0.95 - i * 0.14, 0)]], '#3a3e46', Math.max(1.5, TW / 24));
        bx(x + 0.05, y + 0.05, x + 0.1, y + 0.95, 0, 0.5, '#2e5a3a'); bx(x + 0.9, y + 0.05, x + 0.95, y + 0.95, 0, 0.5, '#2e5a3a'); bx(x + 0.05, y + 0.05, x + 0.95, y + 0.1, 0, 0.5, '#2e5a3a');
        cyl(x + 0.95, y + 0.95, 0.05, 0, 1.9, '#2a2a2a'); bx(x + 0.8, y + 0.8, x + 1.1, y + 1.1, 1.9, 2.25, '#c8302a');
        { const [X, Y] = S(x + 0.95, y + 1.1, 2.08); g.fillStyle = '#fff'; g.font = '800 ' + Math.round(TW * 0.24) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', X, Y); }
        glow(x + 0.95, y + 0.95, 2.05, 1.1, 'rgba(255,90,70,.4)'); break; }
      case 'car': {   // auto parcheggiata su due caselle: si disegna dalla casella davanti (o.part = quella dietro)
        if (o.part) break;
        const v = o.v, x0 = v ? x + 0.2 : x - 0.92, y0 = v ? y - 0.92 : y + 0.2, x1 = v ? x + 0.8 : x + 0.92, y1 = v ? y + 0.92 : y + 0.8, c = o.c || '#888';
        bx(x0, y0, x1, y1, 0.12, 0.5, c);
        const sx0 = v ? x0 + 0.06 : x0 + 0.45, sy0 = v ? y0 + 0.45 : y0 + 0.06, sx1 = v ? x1 - 0.06 : x1 - 0.5, sy1 = v ? y1 - 0.5 : y1 - 0.06;
        bx(sx0, sy0, sx1, sy1, 0.5, 0.82, K.shade(c, 0.85)); poly([S(sx0, sy0, 0.83), S(sx1, sy0, 0.83), S(sx1, sy1, 0.83), S(sx0, sy1, 0.83)], '#2a3440');
        for (const [a, b] of v ? [[x0, y0 + 0.3], [x1, y0 + 0.3], [x0, y1 - 0.3], [x1, y1 - 0.3]] : [[x0 + 0.3, y0], [x0 + 0.3, y1], [x1 - 0.3, y0], [x1 - 0.3, y1]]) dot(a, b, 0.12, 0.08, '#111');
        break; }
      case 'tree': case 'ptree': {   // albero del parco (ptree = nell'aiuola della piazza)
        if (t === 'ptree') bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.25, '#6a645a');
        cyl(x + 0.5, y + 0.5, 0.08, 0, 1.1, '#4a3424');
        const C = [['#2e5a2a', '#3a6e34'], ['#33602e', '#447a3a'], ['#2a5030', '#3a683e']][o.v || 0];
        dot(x + 0.5, y + 0.5, 1.45, 0.42, C[0]); dot(x + 0.38, y + 0.42, 1.65, 0.3, C[1]); dot(x + 0.62, y + 0.6, 1.6, 0.26, C[1]); dot(x + 0.48, y + 0.48, 1.9, 0.22, C[1]); break; }
      case 'bench': bx(x + 0.15, y + 0.3, x + 0.85, y + 0.7, 0.28, 0.36, '#6a4a2e'); bx(x + 0.15, y + 0.62, x + 0.85, y + 0.7, 0.36, 0.7, '#6a4a2e'); for (const a of [0.2, 0.75]) bx(x + a, y + 0.35, x + a + 0.05, y + 0.65, 0, 0.28, '#2a2a2a'); break;
      case 'statue': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.6, '#7a7468'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.6, 1.5, '#4e6a5e'); cyl(x + 0.5, y + 0.5, 0.15, 1.5, 1.85, '#4e6a5e'); line(S(x + 0.7, y + 0.5, 1.3), S(x + 0.95, y + 0.4, 2.0), '#4e6a5e', Math.max(3, TW / 10)); break;
      case 'fount': {   // fontana su 2x2 (disegnata dalla casella davanti)
        if (o.part) break; const cx0 = x, cy0 = y;
        cyl(cx0, cy0, 1.2, 0, 0.35, '#8a8274'); cyl(cx0, cy0, 1.05, 0.35, 0.37, '#2a5a7a'); cyl(cx0, cy0, 0.22, 0.35, 1.1, '#9a9284'); cyl(cx0, cy0, 0.45, 1.1, 1.2, '#9a9284'); cyl(cx0, cy0, 0.4, 1.2, 1.22, '#3a7a9a');
        glow(cx0, cy0, 0.5, 1.8, 'rgba(120,190,255,.35)'); break; }
      case 'heli': {   // elicottero della fuga su 2x2 (disegnato dalla casella davanti)
        if (o.part) break; const cx0 = x, cy0 = y;
        bx(cx0 - 0.9, cy0 - 0.4, cx0 + 0.6, cy0 + 0.4, 0.15, 0.9, '#2a3a4a'); bx(cx0 - 0.85, cy0 - 0.35, cx0 - 0.3, cy0 + 0.35, 0.9, 1.05, '#24323e');
        poly([S(cx0 + 0.6, cy0 - 0.35, 0.85), S(cx0 + 0.6, cy0 + 0.35, 0.85), S(cx0 + 0.6, cy0 + 0.35, 0.25), S(cx0 + 0.6, cy0 - 0.35, 0.25)], '#8ab8e0');
        bx(cx0 - 2.0, cy0 - 0.08, cx0 - 0.9, cy0 + 0.08, 0.6, 0.75, '#2a3a4a'); bx(cx0 - 2.05, cy0 - 0.1, cx0 - 1.9, cy0 + 0.1, 0.6, 1.1, '#2a3a4a');
        for (const s of [-1, 1]) bx(cx0 - 0.8, cy0 + s * 0.45 - 0.03, cx0 + 0.5, cy0 + s * 0.45 + 0.03, 0, 0.1, '#1a1a1a');
        cyl(cx0 - 0.2, cy0, 0.06, 1.05, 1.25, '#1a1a1a'); line(S(cx0 - 1.6, cy0 - 1.2, 1.26), S(cx0 + 1.2, cy0 + 1.2, 1.26), '#111', Math.max(2, TW / 14)); line(S(cx0 - 1.4, cy0 + 1.3, 1.26), S(cx0 + 1.0, cy0 - 1.3, 1.26), '#111', Math.max(2, TW / 14));
        dot(cx0 + 0.5, cy0 - 0.4, 0.5, 0.05, '#ff3a3a'); glow(cx0 + 0.5, cy0 - 0.4, 0.5, 0.8, 'rgba(255,60,60,.4)'); break; }
      case 'boat': {   // barca ormeggiata (k = 1: il motoscafo bianco della fuga)
        const c = o.k ? '#e8e8e0' : '#7a4a2e', x0 = x + 0.1, y0 = y - 0.9, x1 = x + 0.9, y1 = y + 0.95;
        poly([S(x0, y0 + 0.4, 0.1), S(x1, y0 + 0.4, 0.1), S(x1, y1, 0.1), S(x0, y1, 0.1)], '#0e2034');
        bx(x0, y0 + 0.3, x1, y1, 0.0, 0.35, c); poly([S(x0, y0 + 0.3, 0.35), S(x1, y0 + 0.3, 0.35), S((x0 + x1) / 2, y0 - 0.2, 0.35)], K.shade(c, 1.05));
        if (o.k) { bx(x0 + 0.15, y0 + 0.6, x1 - 0.15, y0 + 1.1, 0.35, 0.7, '#3a5a7a'); bx(x0 + 0.2, y1 - 0.4, x1 - 0.2, y1 - 0.1, 0.35, 0.55, '#2a2a2a'); dot((x0 + x1) / 2, y0 + 0.4, 0.4, 0.05, '#7aff7a'); glow((x0 + x1) / 2, y0 + 0.4, 0.4, 0.8, 'rgba(120,255,120,.35)'); }
        else line(S((x0 + x1) / 2, y0 + 1, 0.35), S((x0 + x1) / 2, y0 + 1, 1.8), '#4a3020', Math.max(2, TW / 16));
        break; }
      case 'crate': { const C2 = ['#8a6a3a', '#6a7a4a', '#7a4a3a'][o.v || 0]; bx(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 0.75, C2); bx(x + 0.15, y + 0.15, x + 0.75, y + 0.7, 0.75, 1.3, K.shade(C2, 0.9)); break; }
    }
  }
  CQ_MAPS.citta = { n: 'Città di notte', make: mapCity, seeded: true, only: 'misterx' };

  // ======================= MISTER X (personaggio disegnato apposta) =======================
  // cappello nero a tesa larga, impermeabile lungo con il bavero alzato e la cintura, sciarpa rossa tirata sul naso, occhi sospettosi sotto la tesa, guanti; sacco del bottino
  function mrx(g, X, Y, TW, walk, f, bag) {
    const u = TW / 34 * 1.05, bob = Math.abs(Math.sin(walk)) * 2.2 * u, sw = Math.sin(walk) * 4;
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y, 13 * u, 5.5 * u, 0, 0, 7); g.fill();
    g.save(); g.translate(X, Y - bob); g.scale(u, u);
    const ell = (x, y, rx, ry, c, r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, r || 0, 0, 7); g.fill(); };
    const ln = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const COAT = '#4a4038', COAT2 = '#3a322c';
    // sacco del bottino dietro la schiena (con i colpi fatti)
    if (bag) { ell(-f * 11, -30, 8, 9, '#8a7a5a'); ln(-f * 8, -38, -f * 4, -44, '#6a5a3a', 2.5); g.fillStyle = '#3a2a1a'; g.font = '700 9px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', -f * 11, -29); }
    // gambe e scarpe
    for (const [x0, k] of [[-4, 1], [4, -1]]) { const o = k * sw; ln(x0, -14, x0 + o * 0.6, -3, '#1e1e22', 4.5); ell(x0 + o * 0.6 + f * 1.5, -2, 4, 2.2, '#0e0e10'); }
    // impermeabile: lungo fino alle ginocchia, che ondeggia
    g.fillStyle = COAT; g.beginPath(); g.moveTo(-9, -44); g.lineTo(9, -44); g.lineTo(12 + sw * 0.25, -11); g.lineTo(-12 + sw * 0.25, -11); g.closePath(); g.fill();
    g.fillStyle = COAT2; g.beginPath(); g.moveTo(f * 1, -40); g.lineTo(f * 3 + sw * 0.25, -11); g.lineTo(f * -1 + sw * 0.25, -11); g.closePath(); g.fill();
    g.fillStyle = '#2a221c'; g.fillRect(-10.5, -27, 21, 3); ell(f * 1, -25.5, 2.2, 2, '#b8a060');
    // braccia con i guanti
    ln(-f * 9, -41, -f * 11 + sw * 0.3, -24, COAT2, 5.5); ell(-f * 11 + sw * 0.3, -22.5, 2.6, 2.6, '#121214');
    ln(f * 9, -41, f * 11 - sw * 0.3, -24, COAT, 5.5); ell(f * 11 - sw * 0.3, -22.5, 2.6, 2.6, '#121214');
    // bavero alzato e sciarpa rossa
    g.fillStyle = COAT2; g.beginPath(); g.moveTo(-9, -44); g.lineTo(-6, -53); g.lineTo(-2, -44); g.fill(); g.beginPath(); g.moveTo(9, -44); g.lineTo(6, -53); g.lineTo(2, -44); g.fill();
    ell(0, -45, 6.5, 2.6, '#b02a2a'); ln(f * -3, -45, f * -5, -36, '#b02a2a', 3);
    // testa: cappello calato sugli occhi, sopracciglia aggrottate, occhi a fessura che guardano di lato (ogni tanto si voltano indietro), sciarpa tirata sul naso
    const hx = f * 0.8, gl = Math.sin(performance.now() / 650 + X * 0.07) > 0.45 ? -f : f;
    ell(hx, -51, 6, 6.5, '#d8b694');
    ell(hx, -53.6, 6, 2.4, 'rgba(20,14,10,.38)');
    ell(hx - 2.4 + f * 1.2, -51.9, 1.75, 0.62, '#ece6d8'); ell(hx + 2.4 + f * 1.2, -51.9, 1.75, 0.62, '#ece6d8');
    ell(hx - 2.4 + f * 1.2 + gl * 0.9, -51.9, 0.62, 0.55, '#111'); ell(hx + 2.4 + f * 1.2 + gl * 0.9, -51.9, 0.62, 0.55, '#111');
    ln(hx - 4.6 + f * 1.2, -54.3, hx - 0.9 + f * 1.2, -53, '#2a1a12', 1.4); ln(hx + 0.9 + f * 1.2, -53, hx + 4.6 + f * 1.2, -54.3, '#2a1a12', 1.4);
    ell(hx, -46.6, 6.6, 3.2, '#b02a2a'); ln(hx - 5, -47.6, hx + 5, -47.2, '#8a1e1e', 1);
    // cappello: tesa larga calata e un po' storta, cupola con la fascia
    g.save(); g.translate(hx, -55.6); g.rotate(f * 0.1);
    ell(0, 0, 12.5, 3.4, '#141416'); g.fillStyle = '#1c1c20'; g.beginPath(); g.moveTo(-6.5, 0); g.lineTo(-5.5, -8.5); g.quadraticCurveTo(0, -11, 5.5, -8.5); g.lineTo(6.5, 0); g.closePath(); g.fill();
    g.fillStyle = '#7a1e1e'; g.fillRect(-6.5, -3, 13, 2.6);
    g.restore();
    g.restore();
  }
  const mrxTop = 2.15;

  // ======================= PASSANTI (calcolati dal tempo: uguali su tutti i telefoni) =======================
  let PL = null;   // aspetti dei passanti (omini colorati con cappelli diversi)
  const looks = () => PL || (PL = Array.from({ length: 10 }, (_, i) => ({ skin: 'omino', col: CQ_COLORS[(i * 3 + 1) % CQ_COLORS.length], hat: CQ_HATS[[0, 1, 3, 6, 6, 0, 2, 6, 1, 3][i]][0] })));
  function ppos(i, t) {
    const R = MP().PR[i]; let s = (R.o + R.v * CQ_SPEED * t) % R.L; if (s < 0) s += R.L;
    let lo = 0, hi = R.cum.length - 1; while (lo < hi - 1) { const m = (lo + hi) >> 1; if (R.cum[m] <= s) lo = m; else hi = m; }
    const a = R.p[lo], b = R.p[lo + 1] || a, sg = R.cum[lo + 1] - R.cum[lo], k = sg ? (s - R.cum[lo]) / sg : 0;
    return { x: a[0] + (b[0] - a[0]) * k + R.jx, y: a[1] + (b[1] - a[1]) * k + R.jy, f: (b[0] - a[0]) - (b[1] - a[1]) > 0 ? 1 : -1, w: s * 3.1, l: R.l, i };
  }
  const passers = G => G.pp || (G.pp = MP().PR.map((_, i) => ppos(i, G.time)));

  // ======================= REGOLE =======================
  // a vede b? Mister X e' scuro: si vede solo vicinissimo, sotto un lampione o nella torcia di chi guarda; i palazzi coprono.
  // I detective si vedono da lontano (hanno la torcia accesa).
  function canSee(G, a, b) {
    if (!b.alive || b.out || ugOn(G, b)) return false;
    const p = P(a), q = P(b), d = Math.hypot(p.x - q.x, p.y - q.y);
    if (b.mx && !a.mx) { if (b.dg) return false; if (inDuel(G, b)) return d < 12; if (d < VIS_X) return true; if (inTorch(a, q.x, q.y)) return true; if (!(litAt(q.x, q.y) && d < LIT_X)) return false; }
    else if (a.mx && !b.mx) { if (d > 11) return false; }
    else { if (d > VIS && !(litAt(q.x, q.y) && d < LIT_SEE)) return false; }
    return d < 1.6 || los(p.x, p.y, q.x, q.y);
  }
  const lootAt = (G, c) => { const p = P(c); let b = -1, bd = ROB_R; MP().loot.forEach((l, i) => { if (G.rob[i] >= 0) return; const d = Math.hypot(l.sx - p.x, l.sy - p.y); if (d < bd) { bd = d; b = i; } }); return b; };
  const metroAt = c => { const p = P(c); return MP().metro.findIndex(m => Math.hypot(m.x + 0.5 - p.x, m.y + 0.5 - p.y) < METRO_R || Math.hypot(m.sx - p.x, m.sy - p.y) < 0.9); };
  // il pulsante grande: una cosa sola alla volta, la piu' importante
  function action(G, c) {
    if (!c.alive || c.out || G.esc || ugOn(G, c) || inDuel(G, c)) return null;
    if ((c.stun || 0) > G.time) return { k: 'wait', t: '😵 Stordito…', on: false };
    if (c.op) return { k: 'wait', t: c.op.k === 'rob' ? '💰 Rubo… ' + Math.round(Math.min(1, (G.time - c.op.t0) / ROB_T) * 100) + '%' : '🎭 Mi travesto…', on: false };
    if (c.mx) {
      { const i = lootAt(G, c); if (i >= 0 && !G.open) return { k: 'rob', i, t: '💰 Ruba (' + SHOPS[MP().loot[i].k][1].replace(/^(la |il |l')/, '') + ')', on: true }; }
      if (metroAt(c) >= 0) return { k: 'metro', t: '🚇 Prendi la metro', on: true };
      if (c.dg) return { k: 'undg', t: '🎭 Togli il travestimento (' + Math.ceil(c.dgE - G.time) + ' s)', on: true };
      return (c.dgN || 0) > 0 ? { k: 'dg', t: '🎭 Travestiti (' + c.dgN + ')', on: true } : null;
    }
    if (metroAt(c) >= 0) return { k: 'metro', t: '🚇 Prendi la metro', on: true };
    return null;
  }
  // il travestimento finisce (tempo, furto, duello, o tolto apposta): la carica e' consumata
  function breakDg(G, c, why) { if (!c.dg) return; c.dg = 0; c.dgE = 0; say(G, 'undg', { a: c.id, w: why }); }
  function doAct(G, c, a) {
    if (!c || !c.alive || c.out || !a || G.esc || ugOn(G, c) || inDuel(G, c)) return;
    if (a.k !== 'cat' && (c.stun || 0) > G.time) return;
    const p = P(c);
    if (a.k === 'rob' && c.mx && !c.op && !G.open) { const i = lootAt(G, c); if (i >= 0) { breakDg(G, c, 'rob'); c.op = { k: 'rob', i, t0: G.time, x: p.x, y: p.y }; } }   // l'allarme suona dopo ALARM_T secondi (vedi tick)
    else if (a.k === 'dg' && c.mx && !c.op && !c.dg && (c.dgN || 0) > 0) c.op = { k: 'dg', t0: G.time, x: p.x, y: p.y };
    else if (a.k === 'undg' && c.mx && c.dg) breakDg(G, c, 'me');
    else if (a.k === 'metro') {
      const s = metroAt(c), M0 = MP().metro; if (s < 0 || a.i == null || a.i === s || !M0[a.i]) return; const to = M0[a.i];
      if (c.bot && (c.mcd || 0) > G.time) return; c.mcd = G.time + 25;
      c.op = null; c.ug = { e: G.time + METRO_T, x: to.sx, y: to.sy, k: 'm', n: ++G.ugN, a: s, d: a.i }; c.path = []; c.mr = (c.mr || 0) + 1;
      if (c.mx) say(G, 'ticket', { a: c.id, s }); else say(G, 'ride', { a: c.id, s, d: a.i });
    }
    else if (a.k === 'cat' && !c.mx) doCatch(G, c);
  }
  // 🔗 CATTURA: Mister X vicino -> duello (o mi unisco a quello in corso); un passante innocente -> figuraccia e fermo un po'
  function doCatch(G, d) {
    if ((d.stun || 0) > G.time || (d.cc || 0) > G.time || d.out || ugOn(G, d)) return;
    d.cc = G.time + CAT_CD;
    if (G.du) { const X = byId(G, G.du.x); if (X && dist(d, X) < DUEL_JOIN && !G.du.ds.includes(d.id)) { G.du.ds.push(d.id); d.path = []; say(G, 'join', { a: d.id }); } return; }
    let best = null, bd = CATCH_R;
    for (const X of xs(G)) { if (ugOn(G, X) || (X.inv || 0) > G.time) continue; const e = dist(d, X); if (e < bd) { bd = e; best = X; } }
    if (best) { startDuel(G, d, best); return; }
    const p = P(d); let pi = -1, pd = CATCH_R; passers(G).forEach(q => { const e = Math.hypot(q.x - p.x, q.y - p.y); if (e < pd) { pd = e; pi = q.i; } });
    if (pi >= 0) { d.stun = G.time + FAKE_T; d.fk = (d.fk || 0) + 1; d.path = []; say(G, 'fake', { a: d.id, p: pi }); }
  }
  function startDuel(G, d, X) {
    G.du = { id: ++G.duN, x: X.id, ds: [d.id], t0: G.time, e: G.time + DUEL_T, n: {} };
    breakDg(G, X, 'duel'); X.op = null; X.path = []; d.path = []; X.dn = (X.dn || 0) + 1;
    const p = P(X); know(G, p.x, p.y); say(G, 'duel', { a: d.id, b: X.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
  }
  function endDuel(G) {
    const D = G.du, X = byId(G, D.x); G.du = null; if (!X) return;
    const sx = Math.floor(D.n[X.id] || 0), sd = D.ds.reduce((s, id) => s + Math.floor(D.n[id] || 0), 0);
    G.duLast = { x: X.id, ds: D.ds.slice(), sx, sd, t: G.time };
    if (sd > sx) {
      X.out = 1; X.ar = 1; X.op = null; for (const id of D.ds) { const c = byId(G, id); if (c) c.ar = (c.ar || 0) + 1; }
      say(G, 'arrest', { a: X.id, b: D.ds[0], d: sd, x: sx, ds: D.ds });
    } else {
      X.inv = G.time + INV_T; X.dw = (X.dw || 0) + 1; for (const id of D.ds) { const c = byId(G, id); if (c) { c.stun = G.time + STUN_T; c.dl = (c.dl || 0) + 1; } }
      say(G, 'free', { a: X.id, d: sd, x: sx, ds: D.ds });
    }
  }
  // cosa sanno i detective del computer: l'ultima posizione di Mister X (lampeggio, allarme, telecamera, biglietto, tombino, vista)
  function know(G, x, y) { G.kn = { x, y, t: G.time }; }
  function robDone(G, c) {
    const i = c.op.i; c.op = null; if (G.rob[i] >= 0 || G.open) return;
    G.rob[i] = c.id; G.nrob++; c.rb = (c.rb || 0) + 1; c.hot = G.time; G.lastRob = G.time; G.tight = false; const l = MP().loot[i]; know(G, l.sx, l.sy);
    say(G, 'rob', { a: c.id, i, n: G.nrob });
    if (G.nrob >= G.need) { G.open = 1; say(G, 'open', { e: G.ei }); }
  }

  // cronaca: l'host scrive (G.lg), ognuno racconta dal suo punto di vista. Pochi avvisi, solo quelli che contano.
  // Ogni telefono tiene la ZONA (G.lf: ultimo punto noto di ogni Mister X, con l'ora; m = ora della metro) e il TACCUINO (G.tb: 📸 🚇 🎭 💰)
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 12) G.lg.shift(); show(G, e); }
  const bn0 = B => B ? '<b>' + esc(B.name) + '</b>' : 'Qualcuno';
  function ping(G, x, y, k, ttl) { G.pg.push({ x, y, k, t: G.time, e: G.time + (ttl || PING_T) }); if (G.pg.length > 12) G.pg.shift(); }
  const xn = (G, id) => { const X = G.chars.filter(c => c.mx); return X.length > 1 ? X.findIndex(c => c.id === id) + 1 : 0; };   // 1 o 2 se i Mister X sono due
  function note(G, e, id) { G.tb.push({ e, t: G.time, n: xn(G, id) }); if (G.tb.length > 10) G.tb.shift(); G.tbT = performance.now(); }
  function seenAt(G, id, x, y) { G.lf[id] = { x, y, t: G.time }; }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), an = A ? '<b>' + esc(A.name) + '</b>' : '', isX = me.mx, M = MP();
    let t = '';
    if (e.k === 'flash') {
      G.fx = performance.now(); for (const f of e.f) { seenAt(G, f[0], f[1], f[2]); note(G, '📸', f[0]); }
      if (isX) { t = '📸 Ti hanno visto! Ora sanno dov\'eri: allontanati.'; beep(1800, 0.05, 0.05); beep(900, 0.2, 0.05, 0.05); }
      else { t = '📸 Mister X avvistato! Il cerchio sulla mappa è dove può essere adesso.'; beep(1400, 0.06, 0.05); beep(1900, 0.12, 0.05, 0.07); }
    }
    else if (e.k === 'alarm') {
      const l = M.loot[e.i], nm = SHOPS[l.k][1]; G.al[e.i] = G.time; seenAt(G, e.a, l.sx, l.sy); note(G, '🚨', e.a);
      const d = Math.hypot(l.sx - cq.x, l.sy - cq.y), v = isX ? 0.035 : Math.max(0.012, 0.04 * (1 - d / 60));
      for (let i = 0; i < 8; i++) beep(i % 2 ? 1250 : 950, 0.12, v, i * 0.14, 'square');
      if (A === me) t = '🚨 L\'allarme è scattato! Resta fermo ancora ' + (ROB_T - ALARM_T) + ' secondi per finire il colpo… se ce la fai.';
      else if (!isX) { t = '🚨 Allarme: stanno svaligiando ' + nm + '! Correte, avete ' + (ROB_T - ALARM_T) + ' secondi!'; ping(G, l.sx, l.sy, 'r', ROB_T + 3); }
    }
    else if (e.k === 'rob') {
      const l = M.loot[e.i], nm = SHOPS[l.k][1]; note(G, '💰', e.a);
      beep(660, 0.1, 0.04); beep(880, 0.14, 0.04, 0.1);
      t = isX ? '💰 Colpo riuscito a ' + nm + '! (' + e.n + '/' + G.need + ')' + (A === me ? ' Sparisci!' : '') : '💰 Troppo tardi: Mister X ha svaligiato ' + nm + ' (' + e.n + '/' + G.need + ')';
    }
    else if (e.k === 'open') { const E = M.EP[e.e]; t = isX ? '🎉 ' + G.need + ' colpi! Scappa verso ' + E.n + ' prima che ti prendano!' : '🚨 ' + G.need + ' colpi fatti: Mister X scappa verso ' + E.n + '! Fermatelo!'; beep(523, 0.15, 0.05); beep(659, 0.15, 0.05, 0.15); beep(784, 0.3, 0.05, 0.3); }
    else if (e.k === 'ticket') { note(G, '🚇', e.a); if (G.lf[e.a]) G.lf[e.a].m = G.time; if (A === me) t = '🚇 In metro… Nel taccuino dei detective resta solo il biglietto, non dove sei sceso.'; else if (!isX) t = '🎫 Mister X ha preso la metro! Può essere vicino a una qualsiasi fermata.'; beep(700, 0.08, 0.03); beep(500, 0.1, 0.03, 0.09); }
    else if (e.k === 'ride') { if (A === me) t = '🚇 In metro verso ' + M.metro[e.d].n + '…'; }
    else if (e.k === 'dg') { note(G, '🎭', e.a); if (A === me) { t = '🎭 Sei travestito da passante per ' + DG_D + ' secondi: cammina piano tra la folla.'; beep(500, 0.06, 0.03); beep(650, 0.08, 0.03, 0.06); } else if (!isX) t = '🎭 Mister X si è travestito: occhio ai passanti!'; }
    else if (e.k === 'undg') { if (A === me) t = e.w === 'rob' ? '🎭 Travestimento caduto: mentre rubi ti riconoscono!' : e.w === 'duel' ? '🎭 Smascherato!' : e.w === 'time' ? '🎭 Il travestimento è finito.' : '🎭 Travestimento tolto.'; }
    else if (e.k === 'duel') {
      const mine = e.a === me.id || e.b === me.id; G.dfx = performance.now(); seenAt(G, e.b, e.x, e.y);
      t = e.b === me.id ? '🔗 Ti hanno preso! DIVINCOLATI: tocca il pulsante più veloce che puoi!' : e.a === me.id ? '🔗 Preso! STRINGI le manette: tocca più veloce che puoi!' : isX ? '' : '🔗 ' + an + ' ha preso Mister X! Correte ad aiutarlo!';
      if (!isX && !mine) ping(G, e.x, e.y, 'd', 4); beep(220, 0.1, 0.06, 0, 'square'); beep(330, 0.15, 0.06, 0.1, 'square');
    }
    else if (e.k === 'join') { if (A === me) t = '🔗 Ti sei unito al duello: tocca, tocca, tocca!'; }
    else if (e.k === 'arrest') { t = (e.a === me.id ? '🚔 Ti hanno ammanettato! ' : '🚔 Manette ai polsi per ' + an + '! ') + '(' + e.d + ' a ' + e.x + ')'; beep(523, 0.12, 0.05); beep(392, 0.12, 0.05, 0.12); for (let i = 0; i < 4; i++) beep(i % 2 ? 700 : 900, 0.18, 0.03, 0.3 + i * 0.2); }
    else if (e.k === 'free') { const mine = e.ds.includes(me.id); t = e.a === me.id ? '💪 Ti sei liberato! (' + e.x + ' a ' + e.d + ') Scappa, sei intoccabile per ' + INV_T + ' secondi!' : mine ? '😵 Mister X si è divincolato (' + e.x + ' a ' + e.d + ')!' : isX ? '' : '😤 Mister X si è divincolato dalle manette!'; beep(330, 0.1, 0.05); beep(660, 0.15, 0.05, 0.1); }
    else if (e.k === 'fake') { G.fk.push({ p: e.p, t: G.time }); if (A === me) { t = '🤦 Era un passante innocente! Che figura: fermo per ' + FAKE_T + ' secondi.'; cq.hurt = performance.now(); } else if (isX) t = '😂 ' + an + ' ha ammanettato un passante innocente!'; beep(200, 0.2, 0.04, 0, 'sawtooth'); }
    else if (e.k === 'esc') { const E = M.EP[e.e]; t = '🏁 Fuga riuscita ' + (A === me ? '' : 'per ' + an + ' ') + E.da + '!'; beep(523, 0.15, 0.06); beep(659, 0.15, 0.06, 0.15); beep(784, 0.4, 0.06, 0.3); }
    if (t) cqToast(t);
  }

  // ======================= PERSONAGGI DEL COMPUTER =======================
  function go(G, c, x, y) {
    if (!cqCellFree(Math.floor(x), Math.floor(y))) { const q = cqSpot(Math.floor(x), Math.floor(y)); x = q.x; y = q.y; }
    c.path = cqPath(c.x, c.y, x, y); c.gx = x; c.gy = y; return c.path.length > 0 || Math.hypot(c.x - x, c.y - y) < 0.8;
  }
  function flee(G, c, th, all) {
    const Q = (all && all.length ? all : [th]).map(P); let best = null, bs = -1e9;
    const sc = (x, y) => Q.reduce((m, q) => Math.min(m, Math.hypot(x - q.x, y - q.y)), 99);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 7, r = 5 + Math.random() * 7, x = Math.floor(c.x + Math.cos(a) * r), y = Math.floor(c.y + Math.sin(a) * r); if (!cqCellFree(x, y)) continue;
      const p = cqPath(c.x, c.y, x + 0.5, y + 0.5); if (!p.length || p.length > 18) continue;
      const f = p[Math.min(2, p.length - 1)], s = sc(x + 0.5, y + 0.5) + 2.5 * (sc(f[0], f[1]) - sc(c.x, c.y));
      if (s > bs) { bs = s; best = p; }
    }
    if (best) c.path = best.slice(0, 12);
  }
  // un punto lontano dal pericolo, meglio se in una via buia (li' non lo vedono)
  function hideAway(G, c, th, r) {
    const M = MP(); let best = null, bs = -1e9;
    for (let k = 0; k < 16; k++) {
      const a = Math.random() * 7, d = r * (0.6 + Math.random() * 0.6), x = Math.floor(c.x + Math.cos(a) * d), y = Math.floor(c.y + Math.sin(a) * d); if (!cqCellFree(x, y)) continue;
      const s = Math.hypot(x - th.x, y - th.y) + (M.dark[y * W + x] ? 8 : 0) - (M.lit[y * W + x] ? 4 : 0);
      if (s > bs) { bs = s; best = [x + 0.5, y + 0.5]; }
    }
    if (best) go(G, c, best[0], best[1]);
  }
  function botX(G, c) {
    if (ugOn(G, c)) return;
    const M = MP(), seen = dets(G).filter(d => canSee(G, c, d)).sort((a, b) => dist(c, a) - dist(c, b)), dn = seen[0], dd = dn ? dist(c, dn) : 99;
    if (c.op && c.op.k === 'rob' && dn && dd < 4.5) c.op = null;   // arrivano i detective: lascio perdere il colpo
    if (c.op) return;
    if (dn) { c.sawD = G.time; const q = P(dn); c.thr = { x: q.x, y: q.y }; }
    // detective vicini: travestito faccio il passante; se no metro, travestimento o via (verso il buio)
    if (dn && dd < 7) {
      if (c.dg) { if (dd < 2.5) flee(G, c, dn, seen); else if (!c.path.length) wanderNear(G, c); return; }
      const s = metroAt(c); if (s >= 0 && dd < 6) { const q = P(dn); let bi = -1, bd = -1; M.metro.forEach((m, i) => { if (i === s) return; const e = Math.hypot(m.sx - q.x, m.sy - q.y); if (e > bd) { bd = e; bi = i; } }); doAct(G, c, { k: 'metro', i: bi }); if (c.ug) return; }
      if ((c.dgN || 0) > 0 && dd > 4.5 && passers(G).some(q => Math.hypot(q.x - c.x, q.y - c.y) < 4)) { doAct(G, c, { k: 'dg' }); c.path = []; return; }
      flee(G, c, dn, seen); return;
    }
    // pericolo visto da poco: resto lontano (non torno subito verso il negozio)
    if (c.thr && G.time - c.sawD < 8 && Math.hypot(c.thr.x - c.x, c.thr.y - c.y) < 12) { if (!c.path.length) hideAway(G, c, c.thr, 12); return; }
    // appena fatto un colpo: via lontano dal negozio (metro se e' li')
    if (c.hot != null && G.time - c.hot < 14 && !G.open) {
      const s = metroAt(c); if (s >= 0) { c.hot = null; let bi = -1, bd = -1; M.metro.forEach((m, i) => { if (i === s) return; const e = Math.hypot(m.sx - c.x, m.sy - c.y); if (e > bd) { bd = e; bi = i; } }); doAct(G, c, { k: 'metro', i: bi }); return; }
      if (!c.path.length || c.hotGo !== c.hot) { c.hotGo = c.hot; hideAway(G, c, { x: c.x, y: c.y }, 18); }
      return;
    }
    // poco prima del lampeggio: meglio essere in un posto da cui si scappa (niente colpi adesso)
    const preFlash = G.nf - G.time < 4;
    // obiettivo: il colpo piu' comodo (lontano dai detective conosciuti), o la fuga
    let gx, gy;
    if (G.open) { const E = M.EP[G.ei]; gx = E.x; gy = E.y; }
    else {
      const i = lootAt(G, c); if (i >= 0 && !preFlash && !dets(G).some(d => canSee(G, c, d) && dist(c, d) < 9)) { doAct(G, c, { k: 'rob' }); c.path = []; return; }
      if (c.tg == null || G.rob[c.tg] >= 0 || Math.random() < 0.01) {
        let best = -1, bs = 1e9; M.loot.forEach((l, k) => { if (G.rob[k] >= 0) return; const thr = Math.min(c.thr && G.time - c.sawD < 30 ? Math.hypot(c.thr.x - l.sx, c.thr.y - l.sy) : 99, G.kn && G.time - G.kn.t < 20 ? Math.hypot(G.kn.x - l.sx, G.kn.y - l.sy) + 6 : 99); const s = Math.hypot(l.sx - c.x, l.sy - c.y) - Math.min(thr, 20) * 1.2 + Math.random() * 6; if (s < bs) { bs = s; best = k; } });
        c.tg = best;
      }
      if (c.tg < 0) return; const l = M.loot[c.tg]; gx = l.sx; gy = l.sy;
    }
    const far = Math.hypot(gx - c.x, gy - c.y);
    if (far > 38) { const s = metroAt(c); if (s >= 0) { let bi = -1, bd = 1e9; M.metro.forEach((m, i) => { const e = Math.hypot(m.sx - gx, m.sy - gy); if (i !== s && e < bd) { bd = e; bi = i; } }); if (bi >= 0 && bd < far - 15) { doAct(G, c, { k: 'metro', i: bi }); return; } } }
    if (!c.path.length || Math.hypot((c.gx || 0) - gx, (c.gy || 0) - gy) > 2 || Math.random() < 0.03) go(G, c, gx, gy);
  }
  function wanderNear(G, c) { for (let i = 0; i < 8; i++) { const x = c.x + (Math.random() - 0.5) * 12, y = c.y + (Math.random() - 0.5) * 12; if (cqCellFree(Math.floor(x), Math.floor(y)) && go(G, c, x, y)) return; } }
  function botD(G, c) {
    if ((c.stun || 0) > G.time || ugOn(G, c)) { c.path = []; return; }
    const M = MP(), ds = dets(G), idx = ds.indexOf(c), n = Math.max(1, ds.length);
    if (G.du) { const X = byId(G, G.du.x); if (X && dist(c, X) < 2.5) { if (dist(c, X) < DUEL_JOIN) doCatch(G, c); else go(G, c, X.x, X.y); return; } }   // il computer aiuta solo se e' gia' li' vicino
    // Mister X in vista (non travestito): inseguo e prendo
    let tg = null, bd = 1e9; for (const X of xs(G)) { if (!canSee(G, c, X)) continue; const d = dist(c, X); if (d < bd) { bd = d; tg = X; } }
    if (tg) { const q = P(tg); know(G, q.x, q.y); if (bd < CATCH_R * 0.95 && (tg.inv || 0) <= G.time) { doCatch(G, c); return; } go(G, c, q.x, q.y); return; }
    // fuga aperta: meta' a fare la guardia all'uscita
    if (G.open && idx % 2 === 0) { const E = M.EP[G.ei], d = Math.hypot(c.x - E.x, c.y - E.y); if (d > 3) { if (!c.path.length || Math.random() < 0.1) go(G, c, E.x + (Math.random() - 0.5) * 3, E.y - 1.5 + (Math.random() - 0.5) * 2); } else c.path = []; return; }
    const K = G.kn, age = K ? G.time - K.t : 99, dgOn = G.tb.some(q => q.e === '🎭' && G.time - q.t < DG_D);
    // sospetti: passanti (o Mister X travestito) vicini all'ultimo avvistamento fresco, di piu' se il taccuino dice che e' travestito
    if (K && age < 12 && Math.hypot(c.x - K.x, c.y - K.y) < 6 && Math.random() < (dgOn ? 0.3 : 0.12)) {
      const fig = [...passers(G).map(q => ({ x: q.x, y: q.y })), ...xs(G).filter(X => X.dg && !ugOn(G, X)).map(X => ({ x: X.x, y: X.y }))].filter(q => Math.hypot(q.x - K.x, q.y - K.y) < 3 + age * ZONE_V);
      if (fig.some(q => Math.hypot(q.x - c.x, q.y - c.y) < CATCH_R * 0.95)) { doCatch(G, c); return; }
      const nearOne = fig.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (nearOne && Math.random() < 0.5) { go(G, c, nearOne.x, nearOne.y); return; }
    }
    // la ZONA: i 2 detective del computer piu' vicini la perlustrano (punti a caso dentro il cerchio, prima le vie buie); gli altri ronda
    const rk = K ? ds.filter(o => o.bot).sort((a, b) => dxy(a, K.x, K.y) - dxy(b, K.x, K.y)).indexOf(c) : 0;
    if (K && age < 40 && rk < 2) {
      if (!c.path.length || (c.zk !== K.t && Math.random() < 0.5)) {
        c.zk = K.t; const r = Math.min(ZONE_MAX, 2 + age * ZONE_V); let best = null, bs = -1e9;
        for (let k = 0; k < 10; k++) { const a = Math.random() * 7, d = Math.sqrt(Math.random()) * r, x = Math.floor(K.x + Math.cos(a) * d), y = Math.floor(K.y + Math.sin(a) * d); if (!cqCellFree(x, y)) continue; const s = (M.dark[y * W + x] ? 6 : 0) - Math.hypot(x - c.x, y - c.y) * 0.15 + Math.random() * 3; if (s > bs) { bs = s; best = [x + 0.5, y + 0.5]; } }
        if (best) go(G, c, best[0], best[1]);
      }
      return;
    }
    // ronda: in giro per la citta', meta' delle volte vicino a un colpo ancora da fare
    if (!c.path.length || Math.random() < 0.02) {
      const live = M.loot.filter((l, i) => G.rob[i] < 0); const l = live.length ? live[Math.floor(Math.random() * live.length)] : M.loot[0];
      if (Math.random() < 0.5) go(G, c, l.sx + (Math.random() - 0.5) * 16, l.sy + (Math.random() - 0.5) * 16); else { const f = cqModeFree(40); if (f) go(G, c, f.x, f.y); }
    }
  }


  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.need = G.chars.length >= 8 ? 5 : 3; G.rob = MP().loot.map(() => -1); G.robD = null; G.nrob = 0; G.open = 0; G.ei = G.ei || 0;
    G.du = null; G.duN = 0; G.duLast = null; G.myTap = 0; G.myTapId = 0; G.ugN = 0; G.lg = []; G.lgN = 0; G.esc = null; G.kn = null; G.lf = {}; G.tb = []; G.pg = []; G.al = {}; G.fk = [];
    G.nf = G.opt.flash || 45; G.left = G.opt.time || 420; G.fl = 0;
  }
  // angolo della torcia sullo schermo (il mondo e' girato di 45 gradi e schiacciato)
  const scrA = a => { const c = Math.cos(a), s = Math.sin(a); return Math.atan2((c + s) / 2, c - s); };
  const zoneR = (G, t) => Math.min(ZONE_MAX, 2 + (G.time - t) * ZONE_V);
  const MODE = CQ_MODES.misterx = {
    n: 'Mister X',
    desc: '🎩 Una città di notte, diversa ogni volta. <b>Mister X</b> è invisibile: si vede solo vicinissimo, sotto un lampione o nella <b>torcia</b> 🔦 dei detective. Ogni 45 secondi <b>lampeggia</b> 📸 a tutti; poi resta un <b>cerchio</b> sulla mappa (dove può essere) che si allarga, e il <b>taccuino</b> dice cosa ha fatto (🚇 metro, 🎭 travestimento, 💰 colpo) ma non dove. Deve fare <b>3 colpi</b> 💰 (con due Mister X 5 in tutto: l\'allarme suona e rivela il negozio) e poi <b>scappare</b> al porto o all\'eliporto. Ha 2 <b>travestimenti</b> 🎭 da passante (25 s) e la <b>metro</b> 🚇. Nelle <b>vie buie</b> non si vede niente. I <b>detective</b> 🕵️ lo prendono col pulsante <b>🔗 Cattura</b>: <b>duello delle manette</b>, vince chi tocca più veloce! Attenti ai passanti innocenti. A tempo scaduto vince Mister X.',
    maps: [['citta', 'Città di notte']],
    def: { time: 420, flash: 45, mx: 'r', map: 'citta', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Chi è Mister X</div>${seg('mx', [['r', 'A caso'], ['p', cq.net ? 'Una persona' : 'Io'], ['c', 'Il computer']], o.mx || 'r')}</div>
      <div class="row"><div class="lbl">Mister X lampeggia ogni</div>${seg('flash', [[30, '30 s'], [45, '45 s'], [60, '60 s']], o.flash || 45)}</div>
      <div class="row"><div class="lbl">Durata</div>${seg('time', [[300, '5:00'], [420, '7:00'], [600, '10:00']], o.time || 420)}</div>
      <div class="hint">Con 8 o più personaggi i Mister X sono due.</div>`,
    read: d => ({ mx: d.get('mx') || 'r', flash: +d.get('flash') || 45, time: +d.get('time') || 420 }),
    start(G) {
      G.ei = Math.random() < 0.5 ? 0 : 1; setup(G);
      const nx = G.chars.length >= 8 ? 2 : 1, hum = G.chars.filter(c => !c.bot), bots = G.chars.filter(c => c.bot);
      const pool = (G.opt.mx === 'p' ? hum : G.opt.mx === 'c' && bots.length ? bots : G.chars).slice().sort(() => Math.random() - 0.5);
      const X = pool.slice(0, nx); while (X.length < nx) { const r = G.chars.find(c => !X.includes(c)); X.push(r); }
      const M = MP(), ps = M.pstart; const spots = [];
      for (const c of G.chars) {
        const isX = X.includes(c);
        Object.assign(c, { mx: isX, t: isX ? -1 : 0, dg: 0, dgN: DG_N, dgE: 0, dgL: Math.floor(Math.random() * 10), op: null, ug: null, inv: 0, stun: 0, out: 0, ar: 0, rb: 0, fk: 0, mr: 0, dw: 0, dl: 0, dn: 0, cc: 0, path: [], dname: isX ? '🎩 ' + c.name : null, tr: isX ? 6.6 + Math.random() * 1.0 : 4.0 + Math.random() * 0.8 });
        let s;
        if (isX) { for (let k = 0; k < 60; k++) { const f = cqModeFree(80); if (f && Math.hypot(f.x - ps.x, f.y - ps.y) > 34 && spots.every(q => Math.hypot(q.x - f.x, q.y - f.y) > 25) && cqPath(f.x, f.y, ps.x, ps.y).length) { s = f; break; } } if (!s) s = SQ.spawn(M.metro[0] ? { x: M.metro[0].sx, y: M.metro[0].sy } : ps, 6); spots.push(s); }
        else s = SQ.spawn(ps, 5);
        c.x = s.x; c.y = s.y;
      }
    },
    gstart(G) { setup(G); },
    intro: G => G.me.mx ? '🎩 Sei Mister X: ' + G.need + ' colpi' + (G.need > 3 ? ' (in due)' : '') + ' e poi la fuga… o resisti fino alla fine!' : '🕵️ Sei un detective: trovate Mister X e ammanettatelo!',
    // caccia lenta: tutti all'80%; Mister X travestito cammina come un passante
    speed(c) {
      const G = cq.g; if (!G || !G.rob) return 1; if (!c.alive) return 1.1;
      if (c.out || c.op || ugOn(G, c) || inDuel(G, c) || (c.stun || 0) > G.time) return 0;
      return SLOW * (c.mx && c.dg ? DG_SPD : 1);
    },
    big(G) {
      const me = G.me; if (!G.rob) return '';
      if (G.esc) { const A = byId(G, G.esc.id); return '🏁 ' + (A ? A.name : '') + ' scappa con il bottino!'; }
      if (me.out) return me.mx ? '🚔 Sei stato ammanettato: guardi la partita.' : '';
      if (G.du && (G.du.x === me.id || G.du.ds.includes(me.id))) return me.mx ? '💪 DIVINCOLATI! Tocca più veloce che puoi!' : '🔗 STRINGI LE MANETTE! Tocca più veloce che puoi!';
      if (ugOn(G, me)) return '🚇 In metro verso ' + MP().metro[me.ug.d].n + '… ' + Math.ceil(me.ug.e - G.time);
      if ((me.stun || 0) > G.time) return me.mx ? '' : (me.fk && G.fk.length && G.time - G.fk[G.fk.length - 1].t < FAKE_T + 0.2 ? '🤦 Era un passante! Fermo per un po\'…' : '😵 Stordito: Mister X ti è sfuggito!');
      if (me.op) return me.op.k === 'rob' ? '💰 Stai rubando… ' + Math.round(Math.min(1, (G.time - me.op.t0) / ROB_T) * 100) + '% (resta fermo!)' : '🎭 Ti stai travestendo…';
      const fl = G.nf - G.time;
      if (fl <= 5 && fl > 0 && !G.open) return me.mx ? '📸 Tra ' + Math.ceil(fl) + '… tutti vedranno dove sei!' : '📸 Mister X si mostra tra ' + Math.ceil(fl) + '…';
      if (me.mx) {
        if ((me.inv || 0) > G.time) return '🛡️ Intoccabile per ' + Math.ceil(me.inv - G.time) + ' s: scappa!';
        if (G.open) return '🏁 Scappa verso ' + MP().EP[G.ei].n + '!';
        if (me.dg) return '🎭 Travestito ancora ' + Math.ceil(me.dgE - G.time) + ' s: cammini come un passante.';
        return '';
      }
      if (G.open) return '🚨 Mister X scappa verso ' + MP().EP[G.ei].n + ': fermatelo!';
      return '';
    },
    hud(G) {
      const me = G.me; if (!G.rob) return '🎩 Mister X';
      const who = me.mx ? '<b style="color:' + XC + '">🎩 Mister X</b> · 🎭 ' + (me.dgN || 0) : '<b style="color:' + DC + '">🕵️ Detective</b>';
      return `${who} · 💰 ${G.nrob}/${G.need} · 📸 ${mmss(Math.max(0, G.nf - G.time))} · ⏳ ${mmss(Math.max(0, G.left))}`;
    },
    // Mister X per i detective: si vede solo vicinissimo, nella torcia (mia o di un compagno) o sotto un lampione.
    // Travestito non si disegna come personaggio ma tra i passanti (M.extras): cosi' si comporta proprio come loro anche al buio.
    hide: c => {
      const G = cq.g; if (!G.rob) return false; if (c.out || ugOn(G, c)) return true;
      const me = G.me; if (c === me || me.mx || me.out || !me.alive || !c.mx) return false;
      if (c.dg) return true;
      if (inDuel(G, c) || (G.fx && performance.now() - G.fx < FL_SHOW * 1000)) return false;
      const d = Math.hypot(c.x - cq.x, c.y - cq.y); if (d < VIS_X) return false;
      if (dets(G).some(o => inTorch(o, c.x, c.y))) return false;
      return !(litAt(c.x, c.y) && d < LIT_X && los(cq.x, cq.y, c.x, c.y));
    },
    nameCol: c => c.mx ? XC : DC,
    // Mister X disegnato apposta; travestito (lo vede cosi' solo lui e l'altro Mister X) = uno dei passanti, col nome per riconoscersi
    draw: c => {
      const G = cq.g; if (!c.mx || !c.alive || !G || !G.rob) return null;
      if (c.dg) { if (!c.dgM || c.dgM.l !== c.dgL) { const L2 = looks()[c.dgL % 10], f = (g, X, Y, TW, L, w, fc) => cqPlayer(g, X, Y, TW, L2, w, fc); f.l = c.dgL; c.dgM = f; } return c.dgM; }
      if (!c.__dr) { c.__dr = (g, X, Y, TW, L, w, f) => mrx(g, X, Y, TW, w, f, (c.rb || 0) > 0); c.__dr.top = mrxTop; }
      return c.__dr;
    },
    // la folla di passanti (motore: M.extras): sempre disegnati (il buio li scurisce, non spariscono); per i detective anche Mister X travestito
    extras(G) {
      if (!G.rob) return [];
      const out = [], Ls = looks(), near = (x, y) => Math.abs(x - cq.x) < 16 && Math.abs(y - cq.y) < 16;
      for (const q of passers(G)) if (near(q.x, q.y)) out.push({ x: q.x, y: q.y, L: Ls[q.l], w: q.w, f: q.f, name: null, all: true });
      if (!G.me.mx) for (const X of xs(G)) if (X.dg && !ugOn(G, X) && near(X.x, X.y)) out.push({ x: X.x, y: X.y, L: Ls[X.dgL % 10], w: X.walk || 0, f: X.face || 1, name: null, all: true });
      return out;
    },
    btn(G) { const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'metro') { metroUI(G); return; }
      if (G.guest) { cqNetSend({ k: 'a', a: a.k, i: a.i }); if (a.k === 'undg') { me.dg = 0; me.dgH = G.time + 1.5; } } else doAct(G, me, a);
    },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'tp') { if (G.du && G.du.id === o.d && (G.du.x === c.id || G.du.ds.includes(c.id))) G.du.n[c.id] = Math.max(G.du.n[c.id] || 0, +o.n || 0); }
      else if (o.k === 'a') doAct(G, c, { k: o.a, i: o.i });
    },
    voice: (G, c) => !c.alive || c.out ? 0 : !!c.mx === !!G.me.mx ? 1 : null,
    // su ogni telefono: passanti, direzione delle torce (dal movimento), uscita dalla metro, vetrine, suoni, tocchi del duello
    local(G, dt) {
      const me = G.me; if (!G.rob) return;
      G.pp = null; passers(G);
      for (const c of G.chars) { if (c === me) continue; if (c.px != null) { const dx = c.x - c.px, dy = c.y - c.py; if (Math.hypot(dx, dy) > 0.02) c.ta = Math.atan2(dy, dx); } c.px = c.x; c.py = c.y; }
      if (me.ug && G.time >= me.ug.e - 0.03 && me.ugN !== me.ug.n) { me.ugN = me.ug.n; cq.x = me.ug.x; cq.y = me.ug.y; if (!cqFree(cq.x, cq.y)) { const q = cqSpot(Math.floor(cq.x), Math.floor(cq.y)); cq.x = q.x; cq.y = q.y; } beep(600, 0.1, 0.04); }
      if (!G.robD) G.robD = G.rob.map(() => -1);
      G.rob.forEach((v, i) => { if (G.robD[i] !== v) { G.robD[i] = v; const l = MP().loot[i]; cqBgCell(l.x, l.y, 1); } });
      // duello: i miei tocchi (l'host li conta subito, gli ospiti li mandano ogni 0,15 s)
      if (G.du && G.myTapId !== G.du.id) { G.myTapId = G.du.id; G.myTap = 0; G.tpS = 0; }
      if (G.du && (G.du.x === me.id || G.du.ds.includes(me.id))) {
        if (!G.guest && !me.bot) G.du.n[me.id] = G.myTap;
        else if (G.guest && (G.tpT = (G.tpT || 0) - dt) <= 0 && G.tpS !== G.myTap) { G.tpT = 0.15; G.tpS = G.myTap; cqNetSend({ k: 'tp', d: G.du.id, n: G.myTap }); }
      }
      // TICCHETTIO negli ultimi 10 s prima del lampeggio (per tutti: sale l'ansia), piu' forte alla fine
      const fl = G.nf - G.time;
      if (!G.open && fl <= TICK + 0.02 && fl > 0 && Math.ceil(fl) !== G.flB) { G.flB = Math.ceil(fl); const k = 1 - fl / TICK; beep(fl <= 3 ? 1100 : 760, 0.05, 0.012 + 0.03 * k); if (fl <= 3) beep(1100, 0.04, 0.02, 0.5); }
      // Mister X: battito del cuore se un detective e' vicino
      G.hb = 0;
      if (me.mx && me.alive && !me.out) {
        const dn = dets(G).reduce((m, d) => Math.min(m, Math.hypot(d.x - cq.x, d.y - cq.y)), 99);
        if (dn < 7) { G.hb = 1 - dn / 7; if ((G.hbT = (G.hbT || 0) - dt) <= 0) { G.hbT = 0.4 + 0.5 * (dn / 7); G.hbP = performance.now(); const v = 0.05 + 0.1 * G.hb; beep(58, 0.11, v, 0, 'sine'); beep(50, 0.12, v * 0.8, 0.15, 'sine'); } }
      }
      // sirene lontane ogni tanto (atmosfera)
      if ((G.snT = G.snT == null ? 25 : G.snT - dt) <= 0) { G.snT = 30 + Math.random() * 30; for (let i = 0; i < 4; i++) beep(i % 2 ? 620 : 780, 0.35, 0.008, i * 0.35, 'triangle'); }
      G.pg = G.pg.filter(q => q.e > G.time); G.fk = G.fk.filter(q => G.time - q.t < 2.5);
    },
    tick(G, dt) {
      G.left -= dt;
      G.pp = null; passers(G);
      // LAMPEGGIO
      if (G.time >= G.nf) {
        const f = xs(G).map(X => { const p = P(X); know(G, p.x, p.y); return [X.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]; });
        if (f.length) say(G, 'flash', { f }); G.fl++;
        G.nf += G.opt.flash || 45;
      }
      // operazioni in corso (furto 6 s, travestimento 1,5 s): ci si deve stare fermi; il travestimento finisce dopo DG_D s
      for (const c of G.chars) {
        if (c.dg && G.time >= c.dgE) breakDg(G, c, 'time');
        if (!c.op) continue; const p = P(c);
        if (Math.hypot(p.x - c.op.x, p.y - c.op.y) > 0.5) { c.op = null; continue; }
        if (c.op.k === 'rob' && !c.op.al && G.time - c.op.t0 >= ALARM_T) { c.op.al = 1; const l = MP().loot[c.op.i]; know(G, l.sx, l.sy); say(G, 'alarm', { a: c.id, i: c.op.i }); }
        if (c.op.k === 'rob' && G.time - c.op.t0 >= ROB_T) robDone(G, c);
        else if (c.op.k === 'dg' && G.time - c.op.t0 >= DG_T) { c.op = null; if ((c.dgN || 0) > 0) { c.dg = 1; c.dgN--; c.dgE = G.time + DG_D; c.dgL = Math.floor(Math.random() * 10); say(G, 'dg', { a: c.id }); } }
      }
      // uscita dalla metro (i computer li sposto io; le persone si spostano da sole sul loro telefono)
      for (const c of G.chars) {
        if (!c.ug) continue;
        if (G.time >= c.ug.e && !c.ugX) { c.ugX = 1; if (c.bot || c === G.me) { const q = cqFree(c.ug.x, c.ug.y) ? { x: c.ug.x, y: c.ug.y } : cqSpot(Math.floor(c.ug.x), Math.floor(c.ug.y)); c.x = q.x; c.y = q.y; if (c === G.me) { cq.x = q.x; cq.y = q.y; G.me.ugN = c.ug.n; } } }
        if (G.time >= c.ug.e + 0.8) { c.ug = null; c.ugX = 0; }
      }
      // duello: i computer toccano a ritmo medio; finito -> risultato
      if (G.du) {
        const D = G.du;
        for (const c of G.chars) { if (!c.bot) continue; if (D.x === c.id || D.ds.includes(c.id)) D.n[c.id] = (D.n[c.id] || 0) + dt * c.tr * (0.85 + Math.random() * 0.3); }
        if (G.time >= D.e + 0.35) endDuel(G);
      }
      // fuga
      if (G.open && !G.esc) { const E = MP().EP[G.ei]; for (const X of xs(G)) { if (ugOn(G, X) || inDuel(G, X)) continue; if (dxy(X, E.x, E.y) < ESC_R) { const md = dets(G).reduce((m, d) => Math.min(m, dist(d, X)), 99); G.esc = { id: X.id, at: G.time + ESC_T, md: Math.round(md * 10) / 10 }; X.out = 1; X.esc = 1; say(G, 'esc', { a: X.id, e: G.ei }); break; } } }
      if (G.esc && G.time >= G.esc.at) { MODE.finish(G); return; }
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive || c.out) continue;
        if (c.op || ugOn(G, c) || inDuel(G, c) || (c.stun || 0) > G.time) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.3 + Math.random() * 0.2; if (c.mx) botX(G, c); else botD(G, c); }
        cqModeStep(c, dt, (c.mx ? 0.95 : 0.88) * MODE.speed(c));
      }
      if (!xs(G).length && !G.esc) { MODE.finish(G); return; }
      if (G.left <= 0) MODE.finish(G);
    },
    finish(G) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), c.mx ? '— 🎩 Mister X · 💰 ' + (c.rb || 0) + ' colpi' + (c.dw ? ' · 💪 ' + c.dw + ' duelli vinti' : '') + (c.esc ? ' · 🏁 scappato' : c.ar ? ' · 🚔 preso' : '') : '— 🕵️ ' + (c.ar ? '🔗 ' + c.ar + ' arresti' : 'detective') + (c.fk ? ' · 🤦 ' + c.fk + ' passanti' : '')];
      const X = G.chars.filter(c => c.mx), D = G.chars.filter(c => !c.mx);
      if (G.esc || xs(G).length) {
        const rank = [...X, ...D].map(line), A = G.esc ? byId(G, G.esc.id) : null;
        cqModeEnd({ t: X.length > 1 ? '🎩 Vincono i Mister X!' : '🎩 Vince Mister X!', why: (A ? 'Fuga riuscita per ' + A.name + ' ' + MP().EP[G.ei].da + ', con il bottino.' : X.length > 1 ? 'Tempo scaduto: non li ha presi nessuno.' : 'Tempo scaduto: nessuno l\'ha preso.') + funny(G, 'x'), win: X.map(c => c.id), rank });
      } else {
        const rank = [...D.slice().sort((a, b) => (b.ar || 0) - (a.ar || 0)), ...X].map(line);
        cqModeEnd({ t: '🕵️ Vincono i detective!', why: (X.length > 1 ? 'I Mister X sono stati ammanettati.' : 'Mister X è stato ammanettato.') + funny(G, 'd'), win: D.map(c => c.id), rank });
      }
    },
    // online: per ognuno (Mister X, travestito, operazione, cariche e fine del travestimento, metro, intoccabile, stordito, fuori, statistiche)
    csnap: c => {
      const G = cq.g, r = v => Math.max(0, Math.round((v - G.time) * 10) / 10), u = c.ug;
      return [c.mx ? 1 : 0, c.dg ? 1 : 0, c.dgL || 0, c.op ? (c.op.k === 'rob' ? 1 : 2) : 0, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, c.op && c.op.i != null ? c.op.i : -1, c.dgN || 0, r(c.dgE || 0),
        u ? [Math.round((u.e - G.time) * 100) / 100, Math.round(u.x * 100) / 100, Math.round(u.y * 100) / 100, u.k, u.n, u.d] : 0, r(c.inv || 0), r(c.stun || 0), c.out ? 1 : 0, c.esc ? 1 : 0,
        [c.rb || 0, c.fk || 0, c.mr || 0, c.dw || 0, c.dl || 0, c.ar || 0, c.dn || 0]];
    },
    capply(G, c, a) {
      c.mx = !!a[0]; c.t = c.mx ? -1 : 0; c.dname = c.mx ? '🎩 ' + c.name : null;
      if (!(c === G.me && G.time < (c.dgH || 0))) c.dg = a[1]; c.dgL = a[2];
      c.op = a[3] ? { k: a[3] === 1 ? 'rob' : 'dg', t0: G.time - a[4], i: a[5] >= 0 ? a[5] : null, x: c === G.me ? cq.x : c.x, y: c === G.me ? cq.y : c.y } : null;
      c.dgN = a[6]; c.dgE = a[7] > 0 ? G.time + a[7] : 0;
      const u = a[8]; c.ug = u ? { e: G.time + u[0], x: u[1], y: u[2], k: u[3], n: u[4], d: u[5] } : null;
      c.inv = a[9] > 0 ? G.time + a[9] : 0; c.stun = a[10] > 0 ? G.time + a[10] : 0; c.out = a[11]; c.esc = a[12];
      [c.rb, c.fk, c.mr, c.dw, c.dl, c.ar, c.dn] = a[13];
    },
    snap(G) {
      const D = G.du;
      return { left: Math.round(G.left * 10) / 10, nf: Math.round((G.nf - G.time) * 10) / 10, rob: G.rob.map(v => v < 0 ? -1 : v), nr: G.nrob, op: G.open, ei: G.ei,
        du: D ? [D.id, D.x, D.ds, Math.round((D.e - G.time) * 100) / 100, D.ds.concat([D.x]).map(id => [id, Math.floor(D.n[id] || 0)])] : null,
        dl: G.duLast ? [G.duLast.x, G.duLast.sx, G.duLast.sd, Math.round((G.time - G.duLast.t) * 10) / 10] : null,
        esc: G.esc ? [G.esc.id, Math.round((G.esc.at - G.time) * 10) / 10, G.esc.md] : null, lg: G.lg };
    },
    apply(G, x) {
      if (!G.rob) return;
      G.left = x.left; G.nf = G.time + x.nf; G.rob = x.rob; G.nrob = x.nr; G.open = x.op; G.ei = x.ei;
      if (x.du) { const [id, X, ds, e, n] = x.du; if (!G.du || G.du.id !== id) G.du = { id, x: X, ds, e: G.time + e, n: {} }; G.du.ds = ds; G.du.e = G.time + e; for (const [k, v] of n) G.du.n[k] = v; } else G.du = null;
      G.duLast = x.dl ? { x: x.dl[0], sx: x.dl[1], sd: x.dl[2], t: G.time - x.dl[3] } : null;
      G.esc = x.esc ? { id: x.esc[0], at: G.time + x.esc[1], md: x.esc[2] } : null;
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // NOTTE VERA: vedo poco intorno a me, i lampioni fanno pozze di luce, le vie buie sono nere. Le TORCE dei detective (coni) si vedono da tutti:
    // Mister X capisce da dove arrivano. Mister X vede i detective da lontano (le loro torce).
    night(G) {
      const me = G.me; if (!G.rob) return null;
      if (!me.alive || me.out) return { a: 0.45, r: 8, lights: [], see: () => true };
      const r = me.mx ? VIS_XR : VIS, lights = [[cq.x, cq.y, r, 0.9]], M = MP(), near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k;
      for (const [x, y] of M.lamps) if (near(x, y, 15)) lights.push([x + 0.5, y + 0.3, LAMP_R, 0.85]);
      M.loot.forEach((l, i) => { if (G.rob[i] < 0 && near(l.sx, l.sy, 15)) lights.push([l.sx, l.sy - 0.4, 1.6, 0.6]); });
      for (const m of M.metro) if (near(m.x, m.y, 15)) lights.push([m.x + 0.95, m.y + 0.95, 1.4, 0.6]);
      const D = dets(G).filter(c => !ugOn(G, c) && near(P(c).x, P(c).y, 20));
      for (const c of D) { const p = P(c); lights.push([p.x, p.y, TORCH_L * 0.95, c === me ? 0.97 : 0.85, scrA(taOf(c)), TORCH_A * 1.25]); if (c !== me) lights.push([p.x, p.y, 1.4, 0.7]); }
      const mates = G.chars.filter(c => c !== me && c.alive && !c.out && !!c.mx === !!me.mx && !ugOn(G, c));
      for (const c of mates) if (me.mx && near(c.x, c.y, 16)) lights.push([c.x, c.y, 2.4, 0.75]);
      return { a: 0.92, r, lights, see: (x, y) => {
        const d = Math.hypot(x - cq.x, y - cq.y); if (d < r + 0.3 || (d < LIT_SEE && litAt(x, y))) return true;
        if (mates.some(c => Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01)) return true;
        if (me.mx) return d < 11 && D.some(c => Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01);   // i detective con la torcia si vedono da lontano
        return D.some(c => inTorch(c, x, y));
      } };
    },
    deco(g, c, X, Y, TW, G) {
      const me = G.me;
      if (c.mx && c.dg && !me.mx) return;
      if ((c.stun || 0) > G.time && c.alive) { const t = performance.now() / 300; g.font = Math.round(TW * 0.36) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💫', X + Math.cos(t) * TW * 0.3, Y - TW * 1.85 + Math.sin(t) * 3); }
      if (c.op) { const k = Math.min(1, (G.time - c.op.t0) / (c.op.k === 'rob' ? ROB_T : DG_T)); g.strokeStyle = c.op.k === 'rob' ? '#f2c84a' : '#c8a0ff'; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 2.1, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
        if (c.op.k === 'dg') { const t = performance.now() / 1000; for (let i = 0; i < 6; i++) { const a = t * 3 + i, r = TW * (0.3 + 0.2 * Math.sin(t * 5 + i)); g.fillStyle = 'rgba(200,200,210,.55)'; g.beginPath(); g.arc(X + Math.cos(a) * r, Y - TW * 0.8 + Math.sin(a) * r * 0.6, TW * 0.16, 0, 7); g.fill(); } } }
      if ((c.inv || 0) > G.time && c.alive) { g.strokeStyle = 'rgba(255,220,120,.85)'; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y - TW * 0.7, TW * 0.5, TW * 0.95, 0, 0, 7); g.stroke(); }
    },
    over(g, G, sx, sy, TW) {
      if (!G.rob) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, now = performance.now() / 1000, M = MP(), ZU = TW * 0.575, isX = me.mx;
      const near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r;
      silhouettes(g, G, sx, sy, TW);
      // la ZONA dove puo' essere Mister X (per tutti: anche lui sa cosa sanno i detective) e, dopo la metro, intorno alle fermate
      for (const id in G.lf) {
        const f = G.lf[id], X = byId(G, +id); if (!X || X.out) continue;
        const ring = (x, y, r, col) => { const cx = sx(x, y), cy = sy(x, y); g.setLineDash([6, 6]); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, r * TW * 0.707, r * TW * 0.354, 0, 0, 7); g.stroke(); g.setLineDash([]); };
        const r = zoneR(G, f.t), al = isX ? 0.25 : 0.55;
        if (Math.abs(f.x - cq.x) < r + 16 && Math.abs(f.y - cq.y) < r + 16) ring(f.x, f.y, r, 'rgba(255,216,74,' + al + ')');
        if (near(f.x, f.y, 16)) { g.globalAlpha = al + 0.2; g.font = Math.round(TW * 0.5) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('❓', sx(f.x, f.y), sy(f.x, f.y) - TW * 0.6); g.globalAlpha = 1; }
        if (f.m) { const rm = Math.min(ZONE_MAX, 1.5 + (G.time - f.m) * ZONE_V); for (const m of M.metro) if (near(m.sx, m.sy, rm + 16)) ring(m.sx, m.sy, rm, 'rgba(120,200,255,' + al + ')'); }
      }
      // allarme dei negozi svaligiati: luce rossa e blu che gira per 25 s
      for (const i in G.al) { const l = M.loot[i], a = G.time - G.al[i]; if (a > 25 || !near(l.x, l.y, 16)) continue; const X = sx(l.sx, l.sy), Y = sy(l.sx, l.sy) - 1.2 * ZU, c = (now * 4 | 0) % 2 ? '#ff2a2a' : '#2a6aff'; g.fillStyle = c; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill(); g.globalAlpha = 0.25; g.beginPath(); g.arc(X, Y, 16 + 4 * Math.sin(now * 8), 0, 7); g.fill(); g.globalAlpha = 1; }
      // passante ammanettato per sbaglio: faccina arrabbiata sopra la testa
      for (const f of G.fk) { const q = passers(G)[f.p]; if (!q || !near(q.x, q.y, 14)) continue; g.font = Math.round(TW * 0.45) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('😠', sx(q.x, q.y), sy(q.x, q.y) - TW * 2.2 - 6 * Math.sin((G.time - f.t) * 6)); }
      // LAMPEGGIO: colonna di luce sul punto di Mister X e cerchio che si allarga, freccia sul bordo
      if (G.fx && performance.now() - G.fx < FL_SHOW * 1000 + 600) {
        const k = (performance.now() - G.fx) / (FL_SHOW * 1000 + 600);
        for (const id in G.lf) { const f = G.lf[id]; if (G.time - f.t > 3) continue; const X = sx(f.x, f.y), Y = sy(f.x, f.y), a = Math.max(0, 1 - k);
          const gr = g.createLinearGradient(X, Y - TW * 7, X, Y); gr.addColorStop(0, 'rgba(255,250,220,0)'); gr.addColorStop(1, 'rgba(255,250,210,' + (0.55 * a) + ')'); g.fillStyle = gr; g.fillRect(X - TW * 0.5, Y - TW * 7, TW, TW * 7);
          g.strokeStyle = 'rgba(255,240,160,' + a + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, TW * (0.4 + k * 3), TW * (0.2 + k * 1.5), 0, 0, 7); g.stroke();
          if (!isX) SQ.edge(g, X, Y - TW, W2, H2, '📸', '#ffd84a'); }
        if (k < 0.15) { g.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - k / 0.15)) + ')'; g.fillRect(0, 0, W2, H2); }
      }
      // per i detective: allarme in corso e duello di un compagno (freccia sul bordo)
      if (!isX) for (const q of G.pg) { const X = sx(q.x, q.y), Y = sy(q.x, q.y), k = ((G.time - q.t) % 1), col = q.k === 'r' ? '255,60,50' : '120,180,255'; g.strokeStyle = 'rgba(' + col + ',' + (1 - k) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, TW * (0.4 + k * 1.6), TW * (0.2 + k * 0.8), 0, 0, 7); g.stroke(); SQ.edge(g, X, Y - TW, W2, H2, q.k === 'r' ? '🚨' : '🔗', 'rgb(' + col + ')'); }
      // fuga aperta: fascio di luce sull'uscita e freccia sul bordo
      if (G.open) { const E = M.EP[G.ei], X = sx(E.x, E.y), Y = sy(E.x, E.y); const gr = g.createLinearGradient(X, Y - TW * 6, X, Y); gr.addColorStop(0, 'rgba(120,255,160,0)'); gr.addColorStop(1, 'rgba(120,255,160,' + (0.4 + 0.15 * Math.sin(now * 3)) + ')'); g.fillStyle = gr; g.fillRect(X - TW * 0.6, Y - TW * 6, TW * 1.2, TW * 6); SQ.edge(g, X, Y - TW, W2, H2, E.e, isX ? '#3fae5a' : '#ff5a4a'); }
      // Mister X: freccia sul bordo verso il colpo piu' vicino
      if (isX && me.alive && !me.out && !G.open) { let b = null, bd = 1e9; M.loot.forEach((l, i) => { if (G.rob[i] >= 0) return; const d = Math.hypot(l.sx - cq.x, l.sy - cq.y); if (d < bd) { bd = d; b = l; } }); if (b) SQ.edge(g, sx(b.sx, b.sy), sy(b.sx, b.sy) - TW, W2, H2, SHOPS[b.k][0], '#f2c84a'); }
      // DUELLO
      if (G.du) duelBar(g, G, sx, sy, TW, W2, H2);
      else if (G.duLast && G.time - G.duLast.t < 2) { const D = G.duLast, ok = D.sd > D.sx; g.font = '800 22px system-ui,sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.7)'; const t = ok ? '🚔 PRESO! ' + D.sd + ' a ' + D.sx : '💪 LIBERO! ' + D.sx + ' a ' + D.sd; g.strokeText(t, W2 / 2, H2 * 0.3); g.fillStyle = ok ? '#8ab8ff' : '#ff8a70'; g.fillText(t, W2 / 2, H2 * 0.3); }
      // bordi rossi per Mister X quando un detective e' vicino
      if (G.hb > 0) { const k = Math.max(0, 1 - (performance.now() - (G.hbP || 0)) / 380), a = 0.15 + 0.35 * G.hb * (0.5 + 0.5 * k); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.72); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(160,0,0,' + a + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
      // ultimi secondi prima del lampeggio: bordo bianco che pulsa a tempo col ticchettio
      { const fl = G.nf - G.time; if (!G.open && fl <= TICK && fl > 0) { const k = 1 - (fl % 1), a = (1 - fl / TICK) * 0.35 * k; g.strokeStyle = 'rgba(255,240,200,' + a + ')'; g.lineWidth = 10; g.strokeRect(5, 5, W2 - 10, H2 - 10); } }
      notebook(g, G);
      minimap(g, G, W2);
    }
  };
  // TACCUINO: le ultime cose che ha fatto Mister X (📸 lampeggio, 🚨 allarme, 💰 colpo, 🚇 metro, 🎭 travestimento) con quanto tempo fa, senza dire dove
  function notebook(g, G) {
    if (G.big) return;
    const L = G.tb.slice(-6), x0 = 10, y0 = 122, cw = 40, h = 46; if (!L.length) return;
    const w = 8 + L.length * cw, fresh = G.tbT && performance.now() - G.tbT < 1200 ? 1 - (performance.now() - G.tbT) / 1200 : 0;
    g.save(); g.fillStyle = 'rgba(16,18,26,.78)'; cqRR(g, x0, y0, w, h, 10); g.fill(); g.strokeStyle = fresh ? 'rgba(255,216,74,' + (0.4 + 0.6 * fresh) + ')' : 'rgba(255,255,255,.18)'; g.lineWidth = 1.5 + 2 * fresh; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    L.forEach((q, i) => { const cx = x0 + 4 + cw * i + cw / 2; g.font = '20px system-ui,sans-serif'; g.fillText(q.e, cx, y0 + 17); g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText(mmss(Math.max(0, G.time - q.t)) + (q.n ? ' ' + q.n : ''), cx, y0 + 37); });
    g.font = '600 9px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.6)'; g.textAlign = 'left'; g.fillText('📓 taccuino di Mister X', x0 + 2, y0 + h + 9);
    g.restore();
  }
  // sagome dietro ai palazzi: chi sta dietro a una casella di palazzo piu' avanti (piu' vicina allo schermo) si ridisegna in trasparenza sopra
  function silhouettes(g, G, sx, sy, TW) {
    const me = G.me, M = MP(), ZU = TW * 0.575;
    for (const c of G.chars) {
      if (!c.alive || c.out || ugOn(G, c)) continue;
      const mine = c === me || !!c.mx === !!me.mx; if (!mine && (MODE.hide(c) || Math.hypot(c.x - cq.x, c.y - cq.y) > (me.mx ? VIS_XR : VIS) + 0.5 && !litAt(c.x, c.y))) continue;
      const p = P(c), X = sx(p.x, p.y), Y = sy(p.x, p.y), cy = Y - TW * 0.9, fx = Math.floor(p.x), fy = Math.floor(p.y); let hid = false;
      for (let dy = 0; dy <= 4 && !hid; dy++) for (let dx = 0; dx <= 4 && !hid; dx++) {
        if (!dx && !dy) continue; const bx2 = fx + dx, by2 = fy + dy; if (bx2 >= W || by2 >= H) continue; const bi = M.BI[by2 * W + bx2]; if (bi < 0) continue;
        const h = M.B[bi].h, cxs = sx(bx2 + 0.5, by2 + 0.5), top = sy(bx2, by2) - h * ZU, bot = sy(bx2 + 1, by2 + 1);
        if (Math.abs(X - cxs) < TW * 0.55 && cy > top && cy < bot) hid = true;
      }
      if (!hid) continue;
      const dr = MODE.draw(c); g.globalAlpha = 0.42;
      if (dr) dr(g, X, Y, TW, null, c === me ? cq.walk : c.walk, c === me ? cq.face : c.face); else cqPlayer(g, X, Y, TW, cqLookOf(c), c === me ? cq.walk : c.walk, c === me ? cq.face : c.face);
      g.globalAlpha = 1;
    }
  }
  function duelBar(g, G, sx, sy, TW, W2, H2) {
    const D = G.du, X = byId(G, D.x); if (!X) return; const me = G.me, part = D.x === me.id || D.ds.includes(me.id);
    const n = id => id === me.id ? G.myTap : Math.floor(D.n[id] || 0), vx = n(D.x), vd = D.ds.reduce((s, id) => s + n(id), 0), tot = Math.max(1, vx + vd), k = vd / tot;
    const draw = (cx, cy, w, h, big) => {
      g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8, h / 2 + 4); g.fill();
      g.fillStyle = '#c0392b'; cqRR(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
      g.fillStyle = '#3d7be0'; cqRR(g, cx - w / 2, cy - h / 2, Math.max(h, w * k), h, h / 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx - 1.5, cy - h / 2 - 3, 3, h + 6);
      if (big) { g.font = '800 15px system-ui,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('🔗 ' + vd, cx - w / 2 + 8, cy); g.textAlign = 'right'; g.fillText(vx + ' 💪', cx + w / 2 - 8, cy);
        const left = Math.max(0, D.e - G.time); g.textAlign = 'center'; g.font = '700 13px system-ui,sans-serif'; g.fillStyle = '#ffe9b0'; g.fillText('⏱️ ' + left.toFixed(1).replace('.', ','), cx, cy + h / 2 + 14); }
    };
    if (!G.me.mx || true) { const p = P(X), x0 = sx(p.x, p.y), y0 = sy(p.x, p.y) - TW * 2.6; draw(x0, y0, TW * 1.6, 8, false); }
    if (part) draw(W2 / 2, H2 * 0.27, Math.min(W2 - 60, 300), 26, true);
  }
  // ---- mappa: la citta' (un pixel per casella, fatta una volta), girata come lo schermo; radar in alto a destra, grande toccandolo ----
  const MCOL = { [BL]: [44, 42, 46], [RO]: [86, 90, 98], [SW]: [120, 118, 112], [PZ]: [140, 130, 112], [GR]: [52, 96, 48], [PA]: [130, 116, 86], [WA]: [26, 58, 90], [BR]: [110, 104, 96], [DK]: [110, 84, 56], [AL]: [80, 76, 70], [QY]: [112, 106, 98] };
  function mapImg() {
    const M = MP(); if (M.mimg) return M.mimg;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let i = 0; i < W * H; i++) { const col = MCOL[M.T[i]] || [30, 30, 30]; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
    sg.putImageData(im, 0, 0); return (M.mimg = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, isX = me.mx, M = MP(), img = mapImg(), now = performance.now();
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(10,12,16,.88)'; g.strokeStyle = isX ? '#c8503a' : '#5a8ad8'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9; g.drawImage(img, 0, 0); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0);
    const dot = (x, y, r, col, ring) => { const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); } };
    const ico = (x, y, t, sz) => { const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 13 : 10;
    for (const m of M.metro) { const [a, b] = P2(m.x + 0.5, m.y + 0.5); g.fillStyle = '#c8302a'; g.fillRect(a - sz / 2 + 1, b - sz / 2 + 1, sz - 2, sz - 2); g.fillStyle = '#fff'; g.font = '800 ' + (sz - 3) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', a, b + 0.5); }
    M.loot.forEach((l, i) => { if (G.rob[i] >= 0) { if (big) ico(l.sx, l.sy, '❌', sz - 2); return; } ico(l.sx, l.sy, SHOPS[l.k][0], sz); });
    if (M.police && big) ico(M.police.sx, M.police.sy, '🚓', sz);
    if (G.open) { const E = M.EP[G.ei]; ico(E.x, E.y, E.e, sz + 3); dot(E.x, E.y, sz * 0.9, 'rgba(120,255,160,' + (0.25 + 0.2 * Math.sin(now / 200)) + ')'); }
    // la ZONA (cerchio che si allarga dall'ultimo punto noto; dopo la metro anche intorno alle fermate): la vedono tutti
    const circ = (x, y, r, fill, line) => { const [a, b] = P2(x, y); g.beginPath(); g.arc(a, b, Math.max(3, r * s), 0, 7); g.fillStyle = fill; g.fill(); g.setLineDash([4, 3]); g.strokeStyle = line; g.lineWidth = 1.5; g.stroke(); g.setLineDash([]); };
    for (const id in G.lf) { const f = G.lf[id], X = byId(G, +id); if (!X || X.out) continue; circ(f.x, f.y, zoneR(G, f.t), 'rgba(255,216,74,.14)', 'rgba(255,216,74,.85)'); ico(f.x, f.y, '?', sz - 1); if (f.m) { const rm = Math.min(ZONE_MAX, 1.5 + (G.time - f.m) * ZONE_V); for (const m of M.metro) circ(m.sx, m.sy, rm, 'rgba(120,200,255,.12)', 'rgba(120,200,255,.8)'); } }
    if (!isX) for (const q of G.pg) dot(q.x, q.y, 4 + 3 * ((now / 300) % 1), q.k === 'r' ? 'rgba(255,60,50,.85)' : 'rgba(120,180,255,.85)', '#fff');
    for (const c of G.chars) if (c !== me && c.alive && !c.out && !!c.mx === !!isX && !ugOn(G, c)) dot(c.x, c.y, 3, isX ? XC : DC, '#000');
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = isX ? '#ff6a5a' : '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 66;
  function minimap(g, G, W2) {
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 10) / (W * 1.4142), W / 2, H / 2, true);
      g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 8, 122 + RADAR, RADAR, 3.2, cq.x, cq.y, false);
    g.font = '600 10px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(230,236,255,.75)'; g.fillText('🗺️ tocca', W2 - RADAR - 8, 122 + RADAR * 2 + 12);
  }
  // scelta della fermata della metro
  function metroUI(G) {
    const me = G.me, s = metroAt(me), M = MP(); if (s < 0) return; cqCloseTask();
    $('#tkTitle').textContent = '🚇 Metro: dove vai?';
    $('#tkBody').innerHTML = '<p class="lead">Sei alla fermata <b>' + esc(M.metro[s].n) + '</b>. Il viaggio dura ' + METRO_T + ' secondi.' + (me.mx ? ' I detective vedranno il biglietto timbrato qui.' : '') + '</p>' + M.metro.map((m, i) => i === s ? '' : '<button type="button" class="big" data-st="' + i + '" style="display:block;width:100%;margin:6px 0">🚇 ' + esc(m.n) + '</button>').join('');
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-st]').forEach(b => { b.onclick = () => { const i = +b.dataset.st, G2 = cq.g; cqCloseTask(); if (!G2 || G2.mode !== 'misterx') return; if (G2.guest) cqNetSend({ k: 'a', a: 'metro', i }); else doAct(G2, G2.me, { k: 'metro', i }); beep(600, 0.08, 0.03); }; });
  }
  // FRASI DI FINE PARTITA ("per un pelo"), in stile italiano con qualche parolaccia: al massimo 4, le piu' adatte
  function funny(G, w) {
    const L = [], N = c => '<b>' + esc(c.name) + '</b>', X = G.chars.filter(c => c.mx), D = G.chars.filter(c => !c.mx), add = (pr, t) => L.push([pr + Math.random() * 0.5, t]);
    if (w === 'x') {
      if (G.esc) { const A = byId(G, G.esc.id), d = G.esc.md; if (A && d < 3) add(10, 'Fuga riuscita per ' + N(A) + ' con un detective a ' + d.toFixed(1).replace('.', ',') + ' caselle dal culo. Che culo, appunto.'); else if (A && d > 20) add(6, N(A) + ' se n\'è andato con calma, tipo gita. I detective? A prendere il caffè, cazzo.'); }
      else add(6, 'Tempo scaduto e Mister X ancora libero: la polizia di questa città fa più schifo del caffè della macchinetta.');
      if (G.time < 180 && G.esc) add(8, 'Colpi e fuga in ' + mmss(G.time) + ': ma questi detective dormivano in macchina?');
    } else {
      for (const c of X) if ((c.dw || 0) >= 2) add(7, N(c) + ' si è liberato dalle manette ' + c.dw + ' volte prima di farsi beccare. Houdini dei poveri.');
      if (G.time < 120) add(8, 'Mister X preso in ' + mmss(G.time) + ': carriera criminale durata meno di un gratta e vinci.');
      for (const c of X) if (c.rb >= 2 && !c.esc) add(7, N(c) + ' aveva già ' + c.rb + ' colpi in tasca e si è fatto ammanettare. Avidità di merda.');
    }
    for (const c of D) {
      if ((c.fk || 0) >= 2) add(8, N(c) + ' ha ammanettato ' + c.fk + ' passanti innocenti. Denunciato per molestie, altro che promozione.');
      else if ((c.fk || 0) === 1) add(4, N(c) + ' ha ammanettato una vecchietta che passava di lì. Bel lavoro, sbirro.');
      if ((c.ar || 0) >= 1 && w === 'd') add(6, N(c) + ' ha stretto le manette con le dita a mitraglietta: tendinite garantita, ma che soddisfazione.');
      if ((c.dl || 0) >= 2) add(5, N(c) + ' ha perso ' + c.dl + ' duelli di manette: braccine di pastafrolla.');
    }
    for (const c of X) {
      if ((c.mr || 0) >= 3) add(4, N(c) + ' ha preso la metro ' + c.mr + ' volte: abbonamento mensile del crimine.');
      if (!(c.dgN || 0) && w === 'd') add(4, N(c) + ' ha finito i travestimenti e si è fatto beccare in borghese. Il carnevale è finito, coglione.');
      if (!(c.rb || 0) && G.time > 150) add(3, N(c) + ' non ha rubato manco una caramella: Mister X o Mister Sfigato?');
    }
    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 4).map(l => l[1]);
    return out.length ? '<br><span style="display:block;margin-top:10px;text-align:left;font-size:14px;line-height:1.45">' + out.map(t => '😂 ' + t).join('<br>') + '</span>' : '';
  }

  // ---- pulsanti: 🔗 CATTURA a sinistra (detective, si preme mentre si cammina), pulsantone del DUELLO, mappa (lo scatto e' stato tolto) ----
  if (!document.getElementById('mxCss')) {
    const st = document.createElement('style'); st.id = 'mxCss';
    st.textContent = '#mxCat{position:absolute;left:18px;bottom:142px;width:86px;height:86px;border-radius:50%;border:0;font:inherit;font-weight:800;font-size:30px;background:#4a5568;color:#c9ccd4;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#mxCat.on{background:#2f6ad8;color:#fff}'
      + '#mxSpr{position:absolute;right:30px;bottom:240px;width:62px;height:62px;border-radius:50%;border:0;font:inherit;font-weight:800;font-size:24px;background:#e8e0d0;color:#222;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#mxSpr.off{background:#5a5a66;color:#ccc}'
      + '#mxTap{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:170px;height:170px;border-radius:50%;border:6px solid #fff;font:inherit;font-weight:900;font-size:22px;line-height:1.15;color:#fff;box-shadow:0 6px 30px rgba(0,0,0,.5);touch-action:none;user-select:none;-webkit-user-select:none;z-index:5}#mxTap.d{background:#2f6ad8}#mxTap.x{background:#c0392b}#mxTap:active{transform:translate(-50%,-50%) scale(.94)}';
    document.head.appendChild(st);
  }
  const host = document.getElementById('ciack') || document.body;
  const mkBtn = (id, txt) => { let b = document.getElementById(id); if (!b) { b = document.createElement('button'); b.id = id; b.type = 'button'; b.hidden = true; b.textContent = txt; host.appendChild(b); } return b; };
  const catB = mkBtn('mxCat', '🔗'), sprB = mkBtn('mxSpr', '💨'), tapB = mkBtn('mxTap', ''), mapB = mkBtn('mxMap', '');
  const live = () => { const G = cq.g; return G && G.mode === 'misterx' && G.rob && G.phase === 'play' && G.pre <= 0 ? G : null; };
  function catchPress() { const G = live(); if (!G) return; const me = G.me; if (me.mx || !me.alive || me.out) return; if ((me.cc || 0) > G.time || (me.stun || 0) > G.time) { beep(180, 0.05, 0.03); return; } if (G.guest) { cqNetSend({ k: 'a', a: 'cat' }); me.cc = G.time + CAT_CD; } else doAct(G, me, { k: 'cat' }); beep(900, 0.04, 0.03); }
  function tapPress() { const G = live(); if (!G || !G.du) return; const me = G.me; if (G.du.x !== me.id && !G.du.ds.includes(me.id)) return; if (G.myTapId !== G.du.id) { G.myTapId = G.du.id; G.myTap = 0; G.tpS = 0; } G.myTap++; if (!G.guest) G.du.n[me.id] = G.myTap; beep(me.mx ? 300 + (G.myTap % 4) * 40 : 500 + (G.myTap % 4) * 50, 0.03, 0.03); }
  catB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); catchPress(); });
  tapB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tapPress(); });
  mapB.onclick = e => { e.stopPropagation(); const G = live(); if (G) { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } };
  if (!window.mxKeys) { window.mxKeys = 1; document.addEventListener('keydown', e => { if (e.repeat && e.key !== ' ') return; const G = live(); if (!G || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; const k = e.key.toLowerCase(); if (k === 'q') catchPress(); else if (k === ' ' && G.du) { e.preventDefault(); if (!e.repeat) tapPress(); } else if (k === 'm') G.big = !G.big; }); }
  (function loop() {
    requestAnimationFrame(loop);
    const G = live(), panel = !$('#cqTask').hidden, me = G && G.me, duelMe = !!(G && G.du && (G.du.x === me.id || G.du.ds.includes(me.id)));
    const cOn = !!(G && !me.mx && me.alive && !me.out && !panel && !duelMe), sOn = false, tOn = !!(G && duelMe);
    if (catB.hidden === cOn) catB.hidden = !cOn; if (sprB.hidden === sOn) sprB.hidden = !sOn; if (tapB.hidden === tOn) tapB.hidden = !tOn;
    if (cOn) { const ready = (me.cc || 0) <= G.time && (me.stun || 0) <= G.time, p = { x: cq.x, y: cq.y }; let tgt = !!G.du && byId(G, G.du.x) && Math.hypot(byId(G, G.du.x).x - p.x, byId(G, G.du.x).y - p.y) < DUEL_JOIN;
      if (!tgt) tgt = passers(G).some(q => Math.hypot(q.x - p.x, q.y - p.y) < CATCH_R) || xs(G).some(X => (X.dg || !MODE.hide(X)) && Math.hypot(X.x - p.x, X.y - p.y) < CATCH_R);
      const on = ready && tgt; if (catB.classList.contains('on') !== on) catB.classList.toggle('on', on); const t = (me.stun || 0) > G.time ? '😵' : '🔗'; if (catB.textContent !== t) catB.textContent = t; }
    if (sOn) { const cd = Math.max(0, (me.spc || 0) - G.time), t = cd > 0 ? Math.ceil(cd) + '' : '💨'; if (sprB.textContent !== t) sprB.textContent = t; if (sprB.classList.contains('off') !== cd > 0) sprB.classList.toggle('off', cd > 0); }
    if (tOn) { const t = me.mx ? '💪<br>DIVINCOLATI!' : '🔗<br>STRINGI!'; if (tapB.dataset.t !== t) { tapB.dataset.t = t; tapB.innerHTML = t; tapB.className = me.mx ? 'x' : 'd'; } }
    const mo = !!(G && !panel);
    if (mapB.hidden === mo) mapB.hidden = !mo;
    if (mo) { const W2 = cq.w, H2 = cq.h; let css;
      if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:16px'; }
      else css = 'left:' + (W2 - 2 * RADAR - 8) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px;border-radius:50%';
      if (mapB.dataset.k !== css) { mapB.dataset.k = css; mapB.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;' + css; } }
  })();
});
