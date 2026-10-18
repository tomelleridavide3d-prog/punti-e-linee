// Il Minotauro (labirinto al buio). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): squadre (spawn, freccia sul bordo), mappe (numeri col seme).
// Un labirinto antico diverso a ogni partita (16x16 incroci, corridoi larghi 2), al buio: ognuno ha la sua torcia, qualche torcia sui muri.
// Ogni 30/45/60/80 s un quarto del labirinto si rimescola (avviso 5 s prima con il rumore di pietra): i muri veri si alzano e si abbassano,
// il labirinto resta sempre tutto raggiungibile e le caselle con qualcuno sopra non si chiudono.
// Esploratori in 1, 2 o 3 squadre (1 = tutti insieme contro il Minotauro): ogni squadra deve prendere 4 CRISTALLI sulle colonnine (4 per squadra + 2,
// chi lo prende lo porta via: gara tra squadre; ci sono anche colonnine vuote). La MAPPINA si scopre esplorando; con 4 cristalli compare l'uscita e la porta si apre:
// il primo che ci arriva fa vincere la sua squadra. Segni col GESSO (✏️) del colore della squadra, li vedono tutti. Vicino a un vaso o a una statua "Nasconditi".
// Il MINOTAURO (personaggio disegnato apposta: una persona a caso o il computer) vede piu' lontano, vede le IMPRONTE fresche di chi corre,
// MUGGISCE (lo schermo trema a chi e' vicino e lo rallenta 3 s) e chi tocca diventa subito fantasma (guarda, non parla). Tempo finito = vince lui.
CQ_WAIT.minotauro = cqLib('squadre', 'mappe').then(L => {
  const SQ = L.squadre, MG = L.mappe;
  const NN = 18, W = NN * 3 + 1, HALF = W / 2, CA = NN / 2 - 2;   // incroci 18x18: incrocio i occupa le caselle 1+3i e 2+3i, i muri stanno su 3i
  const NEED = 4, COPY_T = 2, COPY_R = 1.35, EXPLORE = 3.8, CATCH = 0.75, ROAR_CD = 18, ROAR_R = 7, ROAR_T = 3, WARN = 5, MSPD = 1.05, EAT_T = 3, HEAR = 6;
  const VIS_E = 3.6, VIS_M = 5.6, TORCH_SEE = 10, LIT_R = 2.4, PRINT_T = 9, CHALK_MAX = 8, HIDE_R = 1.45, EXIT_R = 1.05, ESC_T = 2.5, LOOP = 0.1;
  const TEAMS = [{ n: 'Rossi', f: 'rossa', c: '#e04848', l: '#ff8a80', e: '🔴' }, { n: 'Blu', f: 'blu', c: '#3d7be0', l: '#8ab8ff', e: '🔵' }, { n: 'Verdi', f: 'verde', c: '#3fae5a', l: '#8fe0a0', e: '🟢' }];
  const COOP = [{ n: 'Esploratori', f: 'degli esploratori', c: '#e0b84a', l: '#ffe08a', e: '🔦' }];
  const TT = G => G.nt === 1 ? COOP : TEAMS;
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const mino = G => G.chars.find(c => c.mino);
  const expl = G => G.chars.filter(c => !c.mino && c.alive && !c.out);
  const quad = (x, y) => (x >= HALF ? 1 : 0) + (y >= HALF ? 2 : 0);
  const nfr = (G, t) => { let n = 0, m = G.fc[t] || 0; while (m) { n += m & 1; m >>= 1; } return n; };
  const full = (G, t) => t >= 0 && nfr(G, t) >= NEED;
  const here = (G, i) => i < G.ncr && G.cs[i] < 0;   // il cristallo i e' ancora sulla sua colonnina
  const slowOn = (G, c) => (c.slow || 0) > G.time;
  const isWall = (x, y) => { const s = cqSolid[y] && cqSolid[y][x]; return !!s && (s.prop === 'mw' || s.prop === 'mwt' || s.prop === 'exitd'); };
  const litAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); return !!(M.lit && xi >= 0 && yi >= 0 && xi < W && yi < W && M.lit[yi * W + xi]); };
  function los(ax, ay, bx, by) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3); for (let i = 1; i < n; i++) { const t = i / n; if (isWall(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t))) return false; } return true; }

  // ======================= LABIRINTO (col seme) =======================
  // segmenti di muro tra due incroci vicini: 2 caselle ciascuno; fix = sempre aperto (dentro una sala). Stato: 1 = chiuso
  function segments() {
    const S = [], id = (i, j) => j * NN + i;
    for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
      if (i < NN - 1) S.push({ a: id(i, j), b: id(i + 1, j), c: [[3 + 3 * i, 1 + 3 * j], [3 + 3 * i, 2 + 3 * j]] });
      if (j < NN - 1) S.push({ a: id(i, j), b: id(i, j + 1), c: [[1 + 3 * i, 3 + 3 * j], [2 + 3 * i, 3 + 3 * j]] });
    }
    return S;
  }
  // Kruskal a caso sui segmenti della lista: la zona diventa tutta collegata (i segmenti fissi aperti contano gia' come uniti), poi qualche anello in piu'
  function carve(S, st, list, rnd) {
    const par = new Int32Array(NN * NN).map((_, i) => i), f = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
    const nodes = new Set(); for (const k of list) { nodes.add(S[k].a); nodes.add(S[k].b); }
    S.forEach((s, k) => { if (s.fix && nodes.has(s.a) && nodes.has(s.b)) par[f(s.a)] = f(s.b); });
    const L = list.filter(k => !S[k].fix).sort(() => rnd() - 0.5);
    for (const k of L) { const a = f(S[k].a), b = f(S[k].b); if (a !== b) { par[a] = b; st[k] = 0; } else st[k] = rnd() < LOOP ? 0 : 1; }
  }
  function mapLab(seed) {
    const rnd = MG.rnd(seed), S = segments(), st = new Uint8Array(S.length).fill(1);
    // sale: angoli di partenza, arena del Minotauro al centro, qualche slargo a caso
    const R = [[0, 0, 2, 2, 's'], [NN - 2, 0, 2, 2, 's'], [0, NN - 2, 2, 2, 's'], [NN - 2, NN - 2, 2, 2, 's'], [CA, CA, 4, 4, 'a']];
    for (let k = 0; k < 300 && R.length < 13; k++) {
      const w = 2 + (rnd() < 0.35 ? 1 : 0), h = 2, i0 = 1 + Math.floor(rnd() * (NN - 1 - w)), j0 = 1 + Math.floor(rnd() * (NN - 1 - h));
      if (R.some(([a, b, c, d]) => i0 < a + c + 1 && a < i0 + w + 1 && j0 < b + d + 1 && b < j0 + h + 1)) continue;
      R.push(rnd() < 0.5 ? [i0, j0, w, h, 'h'] : [i0, j0, h, w, 'h']);
    }
    const roomOf = new Int8Array(NN * NN).fill(-1);
    R.forEach(([i0, j0, w, h], r) => { for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) roomOf[j * NN + i] = r; });
    S.forEach((s, k) => { if (roomOf[s.a] >= 0 && roomOf[s.a] === roomOf[s.b]) { s.fix = 1; st[k] = 0; } });
    carve(S, st, S.map((_, k) => k), rnd);
    // pilastri tolti dentro le sale (diventano posti per vasi, statue, altare)
    const inner = new Set(), K = (x, y) => x + ',' + y;
    R.forEach(([i0, j0, w, h]) => { for (let b = j0 + 1; b < j0 + h; b++) for (let a = i0 + 1; a < i0 + w; a++) inner.add(K(3 * a, 3 * b)); });
    const props = [], pp = (t, x, y, o) => props.push([t, x, y, o || {}]), taken = new Set();
    // uscita: su uno dei due bordi dietro (y = 0 o x = 0: la porta si vede di fronte), lontana dagli angoli di partenza
    const ex = []; for (let i = 2; i < NN - 2; i++) ex.push({ e: 'n', i, j: 0 }, { e: 'w', i: 0, j: i });
    const corners = [[0, 0], [NN - 1, 0], [0, NN - 1], [NN - 1, NN - 1]];
    const md = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const picks = [], combos = [[0], [1], [2], [3], [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
    // per ogni squadra il gruppo di angoli con le distanze dall'uscita piu' simili (con 3 squadre per forza un po' diverse: conta di piu' trovare i cristalli)
    let exit = null, starts = null;
    for (let k = 0; k < 60 && !exit; k++) {
      const e = ex[Math.floor(rnd() * ex.length)], d = corners.map(c => md(c, [e.i, e.j]));
      const pick = (n, min) => { let best = null, bs = 1e9; for (const cb of combos) { if (cb.length !== n || cb.some(c => d[c] < min)) continue; const sp = Math.max(...cb.map(c => d[c])) - Math.min(...cb.map(c => d[c])) - (n === 1 ? d[cb[0]] : 0); if (sp < bs) { bs = sp; best = cb; } } return best && (n !== 2 || bs <= 3) ? best : null; };
      const s1 = pick(1, 14), s2 = pick(2, 11), s3 = pick(3, 6); if (!s1 || !s2 || !s3) continue;
      exit = e; starts = [s1, s2, s3];
    }
    if (!exit) { exit = { e: 'n', i: CA, j: 0 }; starts = [[3], [2, 3], [1, 2, 3]]; }
    const exitCells = exit.e === 'n' ? [[1 + 3 * exit.i, 0], [2 + 3 * exit.i, 0]] : [[0, 1 + 3 * exit.j], [0, 2 + 3 * exit.j]];
    exitCells.forEach(([x, y], k) => { pp('exitd', x, y, { e: exit.e, k }); taken.add(K(x, y)); });
    const EX = exit.e === 'n' ? { x: 2 + 3 * exit.i, y: 1.15, dx: 0, dy: -1 } : { x: 1.15, y: 2 + 3 * exit.j, dx: -1, dy: 0 };
    // bordo, pilastri (alcuni con la torcia), segmenti chiusi
    const torches = [];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      if (taken.has(K(x, y))) continue;
      const border = x === 0 || y === 0 || x === W - 1 || y === W - 1, pil = x % 3 === 0 && y % 3 === 0;
      if (pil && inner.has(K(x, y))) continue;
      if (pil) { const tch = rnd() < 0.13 && !(x === W - 1 || y === W - 1) && (x < W - 1 && y < W - 1); if (tch) torches.push([x, y]); pp(tch ? 'mwt' : 'mw', x, y, { f: 1 }); continue; }
      if (border) pp('mw', x, y, { f: 1 });
    }
    // torce ai lati dell'uscita
    for (const [x, y] of exitCells) for (const [dx, dy] of exit.e === 'n' ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]]) { const xx = x + dx, yy = y + dy; if (xx % 3 === 0 && yy % 3 === 0) { const p = props.find(q => q[1] === xx && q[2] === yy); if (p) { p[0] = 'mwt'; if (!torches.some(t => t[0] === xx && t[1] === yy)) torches.push([xx, yy]); } } }
    S.forEach((s, k) => { if (st[k]) for (const [x, y] of s.c) pp('mw', x, y); });
    // arredi nelle sale: altare e statue nell'arena, vasi e statue negli slarghi (nascondigli)
    const hides = [];
    R.forEach(([i0, j0, w, h, kind]) => {
      const spots = []; for (let b = j0 + 1; b < j0 + h; b++) for (let a = i0 + 1; a < i0 + w; a++) spots.push([3 * a, 3 * b]);
      for (const [x, y] of spots) {
        let t;
        if (kind === 'a') { const cx = 3 * (i0 + 2), cy = 3 * (j0 + 2); t = x === cx && y === cy ? 'altar' : (x === cx || y === cy) ? 'brazier' : 'statue'; }
        else t = kind === 's' ? 'urn' : ['urn', 'statue', 'sarc', 'urn'][Math.floor(rnd() * 4)];
        pp(t, x, y, { v: Math.floor(rnd() * 3) }); if (t === 'urn' || t === 'statue' || t === 'sarc') hides.push([x, y]);
        if (t === 'brazier' || t === 'altar') torches.push([x, y]);
      }
    });
    // vasi anche lungo i corridoi, contro un pilastro che non ha la torcia (nascondigli in giro)
    // (sui pilastri no: restano muri. Si mettono nell'angolo dell'incrocio vicino al pilastro, solo dove non chiudono il passaggio: incroci con 3+ uscite)
    // pavimenti: base, sale di partenza piu' chiare, arena sabbiosa
    const rooms = [{ n: 'Labirinto', x: 0, y: 0, w: W, h: W, c: ['#5f5647', '#5a5143'], wc: '#7a6e5a', k: 'lab', nl: 1 }];
    R.forEach(([i0, j0, w, h, kind]) => rooms.push({ n: kind === 'a' ? 'Arena' : kind === 's' ? 'Partenza' : 'Sala', x: 1 + 3 * i0, y: 1 + 3 * j0, w: 3 * w - 1, h: 3 * h - 1, c: kind === 'a' ? ['#7a6248', '#735c43'] : kind === 's' ? ['#6a6150', '#655c4b'] : ['#645a4a', '#5f5545'], wc: '#7a6e5a', k: kind === 'a' ? 'sand' : 'lab', nl: 1 }));
    // decorazioni calpestabili: ossa, teschi, sassi, ragnatele per terra
    const deco = [], decoAt = new Map(), occ = new Set(props.map(p => K(p[1], p[2])));
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (occ.has(K(x, y)) || (x % 3 === 0 && y % 3 === 0)) continue;
      const r = rnd(); const t = r < 0.025 ? 'bones' : r < 0.035 ? 'skull' : r < 0.075 ? 'rubble' : null;
      if (t) { deco.push([x, y, t]); decoAt.set(K(x, y), t); }
    }
    // colonnine dei cristalli: in una casella d'angolo di un incrocio (le altre 3 restano libere), 3 per quarto + 2, lontane tra loro e dall'uscita.
    // frag[i] = { x, y } centro della colonnina. In partita i cristalli stanno sulle prime N (4 per squadra + 2): le altre restano vuote (ingannano)
    const nodeOk = (i, j) => roomOf[j * NN + i] < 0 || R[roomOf[j * NN + i]][4] === 'h';
    const frag = [];
    const far = (x, y, sep) => frag.every(f => Math.hypot(f.x - x, f.y - y) >= sep);
    const ped = (i, j, sep) => { if (!nodeOk(i, j)) return false; const x = 1 + 3 * i + (rnd() < 0.5 ? 1 : 0), y = 1 + 3 * j + (rnd() < 0.5 ? 1 : 0); if (Math.hypot(x - EX.x, y - EX.y) < 8 || !far(x + 0.5, y + 0.5, sep)) return false; frag.push({ x: x + 0.5, y: y + 0.5, cx: x, cy: y }); pp('ped', x, y, { v: Math.floor(rnd() * 3) }); return true; };
    for (let q = 0; q < 4; q++) for (let n = 0, k = 0; k < 400 && n < 3; k++) { if (ped(Math.floor(rnd() * NN / 2) + (q & 1 ? NN / 2 : 0), Math.floor(rnd() * NN / 2) + (q & 2 ? NN / 2 : 0), 9)) n++; }
    for (let k = 0; k < 600 && frag.length < 14; k++) ped(Math.floor(rnd() * NN), Math.floor(rnd() * NN), 8);
    for (let k = frag.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [frag[k], frag[r]] = [frag[r], frag[k]]; }   // mescolate: i cristalli veri non stanno sempre negli stessi quarti
    const startP = corners.map(([i, j]) => { const i0 = i ? NN - 2 : 0, j0 = j ? NN - 2 : 0; return { x: 3 * i0 + 3.5, y: 3 * j0 + 3.5 }; });
    const arena = { x: 3 * (CA + 2) + 0.5, y: 3 * (CA + 2) + 1.5 };
    // caselle illuminate dalle torce (servono a vedere un po' piu' lontano)
    const lit = new Uint8Array(W * W);
    for (const [tx, ty] of torches) for (let y = Math.max(0, ty - 3); y <= Math.min(W - 1, ty + 3); y++) for (let x = Math.max(0, tx - 3); x <= Math.min(W - 1, tx + 3); x++) if (Math.hypot(x - tx, y - ty) < LIT_R) lit[y * W + x] = 1;
    const ring = []; for (let i = 0; i < 10; i++) ring.push([Math.floor(startP[0].x) + (i % 3) - 1, Math.floor(startP[0].y) + Math.floor(i / 3) - 1]);
    return { w: W, h: W, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring, button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      deco, decoAt, draw, floor: FLOOR, decoDraw, bg: () => '#06070a',
      S, st0: st, R, roomOf, exit: EX, exitCells, starts, startP, arena, frag, torches, lit, hides, seed };
  }

  // ---- disegno della mappa (K = attrezzi di cqTools) ----
  const FLOOR = {
    lab(K, x, y) {   // lastre di pietra antica, polvere, crepe
      const Pp = (u, v) => K.S(x + u, y + v, 0);
      K.strokes([[Pp(0.04, 0.04), Pp(0.96, 0.04)], [Pp(0.04, 0.04), Pp(0.04, 0.96)]], 'rgba(255,240,210,.07)'); K.strokes([[Pp(0.96, 0.04), Pp(0.96, 0.96)], [Pp(0.04, 0.96), Pp(0.96, 0.96)]], 'rgba(0,0,0,.22)');
      if (K.TW < 40) return;
      if (K.hsh(x, y, 3) < 0.5) K.strokes([[Pp(0.5, 0.04), Pp(0.5, 0.96)]], 'rgba(0,0,0,.13)');
      if (K.hsh(x, y, 4) < 0.15) { const a = Pp(0.2, 0.3 + 0.4 * K.hsh(x, y, 5)), b = Pp(0.5, 0.55), c = Pp(0.8, 0.2 + 0.5 * K.hsh(x, y, 6)); K.strokes([[a, b], [b, c]], 'rgba(0,0,0,.32)'); }
      K.speck(x, y, 4, ['rgba(255,235,200,.08)', 'rgba(20,15,10,.2)'], K.TW / 22);
    }
  };
  // ossa, teschi e sassi per terra (ci si cammina sopra); il segno col gesso del colore della squadra
  function decoDraw(K, t, x, y) {
    const { bx, dot, line, S, hsh } = K;
    if (t === 'chalk') {
      const G = cq.g, m = G && G.mkMap && G.mkMap.get(x + ',' + y); if (!m) return;
      const col = (G.nt === 1 ? COOP : TEAMS)[m.t] ? (G.nt === 1 ? COOP : TEAMS)[m.t].l : '#eee', [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][m.d], px = -dy, py = dx, cx = x + 0.5, cy = y + 0.5;
      const A = (u, v) => S(cx + dx * u + px * v, cy + dy * u + py * v, 0.01), w = Math.max(2.5, K.TW / 11);
      for (const [c, lw] of [[col, w], ['rgba(255,255,255,.45)', w * 0.4]]) { line(A(-0.34, 0), A(0.32, 0), c, lw); line(A(0.34, 0), A(0.1, 0.2), c, lw); line(A(0.34, 0), A(0.1, -0.2), c, lw); }
      return;
    }
    const u = 0.25 + 0.5 * hsh(x, y, 120), v = 0.25 + 0.5 * hsh(x, y, 121);
    if (t === 'bones') { line(S(x + u - 0.22, y + v - 0.05, 0.03), S(x + u + 0.2, y + v + 0.06, 0.03), '#d8d0bc', Math.max(2, K.TW / 16)); line(S(x + u - 0.05, y + v - 0.2, 0.03), S(x + u + 0.08, y + v + 0.18, 0.03), '#cfc6b0', Math.max(2, K.TW / 18)); dot(x + u - 0.22, y + v - 0.05, 0.04, 0.035, '#e4dcc8'); dot(x + u + 0.2, y + v + 0.06, 0.04, 0.035, '#e4dcc8'); }
    else if (t === 'skull') { dot(x + u, y + v, 0.12, 0.12, '#e2dac6'); bx(x + u - 0.06, y + v + 0.04, x + u + 0.06, y + v + 0.14, 0, 0.08, '#d4ccb6'); dot(x + u - 0.05, y + v + 0.1, 0.14, 0.03, '#2a241c'); dot(x + u + 0.04, y + v + 0.11, 0.14, 0.03, '#2a241c'); }
    else if (t === 'rubble') { const n = 2 + Math.floor(hsh(x, y, 122) * 3); for (let i = 0; i < n; i++) { const a = 0.15 + 0.7 * hsh(x, y, 123 + i), b = 0.15 + 0.7 * hsh(x, y, 130 + i), s = 0.05 + 0.07 * hsh(x, y, 137 + i); bx(x + a - s, y + b - s, x + a + s, y + b + s, 0, s * 1.4, i % 2 ? '#7d7262' : '#8a7f6e'); } }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, qL, dot, glow, line, S, poly, hsh } = K;
    switch (t) {
      case 'mw': case 'mwt': {   // muro di blocchi di pietra antica, con muschio; mwt = pilastro con la torcia
        const C3 = ['#7d705c', '#766a56', '#837562'], col = C3[Math.floor(hsh(x, y, 140) * 3)], h = 1.2 + 0.08 * hsh(x, y, 141);
        bx(x, y, x + 1, y + 1, 0, h, col); bx(x - 0.03, y - 0.03, x + 1.03, y + 1.03, h, h + 0.1, K.shade(col, 1.18));
        if (K.TW >= 40) for (const [F, k] of [[(u, z) => S(x + u, y + 1, z), 0.72], [(u, z) => S(x + 1, y + u, z), 0.5]]) {
          const off = hsh(x, y, 142) < 0.5 ? 0.33 : 0.66;
          K.strokes([[F(0, 0.4), F(1, 0.4)], [F(0, 0.8), F(1, 0.8)], [F(off, 0), F(off, 0.4)], [F(1 - off, 0.4), F(1 - off, 0.8)], [F(off, 0.8), F(off, h)]], K.shade(col, k * 0.62));
          if (hsh(x, y, 143) < 0.28) { const [X, Y] = F(0.2 + 0.6 * hsh(x, y, 144), 0.12); K.g.fillStyle = '#4f6a36'; K.g.fillRect(X - K.TW / 10, Y - K.TW / 18, K.TW / 5, K.TW / 9); }
        }
        if (t === 'mwt') {   // torcia sul lato che si vede (davanti a sinistra se c'e' corridoio, se no a destra)
          const front = !isWall(x, y + 1) ? (u, z) => S(x + u, y + 1.04, z) : (u, z) => S(x + 1.04, y + u, z);
          line(front(0.5, 0.55), front(0.5, 0.85), '#4a3020', Math.max(3, K.TW / 9));
          const [X, Y] = front(0.5, 0.95); glow(...(!isWall(x, y + 1) ? [x + 0.5, y + 1.05] : [x + 1.05, y + 0.5]), 0.95, 1.5, 'rgba(255,170,60,.55)');
          K.g.fillStyle = '#ff9a2a'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW / 9, K.TW / 6, 0, 0, 7); K.g.fill(); K.g.fillStyle = '#ffe080'; K.g.beginPath(); K.g.ellipse(X, Y + K.TW / 30, K.TW / 18, K.TW / 10, 0, 0, 7); K.g.fill();
        }
        break; }
      case 'exitd': {   // portone dell'uscita: arco di pietra, due battenti di legno con le borchie, teschio di toro sopra
        const n = o.e === 'n', F = n ? (u, z) => S(x + u, y + 1.02, z) : (u, z) => S(x + 1.02, y + u, z);
        bx(x, y, x + 1, y + 1, 0, 1.75, '#6f6450'); bx(x - 0.03, y - 0.03, x + 1.03, y + 1.03, 1.75, 1.88, '#8a7e66');
        poly([F(0.06, 0), F(0.94, 0), F(0.94, 1.3), F(0.06, 1.3)], '#3a2416');
        poly([F(0.1, 0), F(0.9, 0), F(0.9, 1.22), F(0.1, 1.22)], o.k ? '#6a4226' : '#5e3a22');
        for (const z of [0.3, 0.85]) poly([F(0.1, z), F(0.9, z), F(0.9, z + 0.08), F(0.1, z + 0.08)], '#3a3a3a');
        for (const z of [0.15, 0.55, 1.05]) { const [X, Y] = F(o.k ? 0.2 : 0.8, z); K.g.fillStyle = '#b8a070'; K.g.beginPath(); K.g.arc(X, Y, K.TW / 26, 0, 7); K.g.fill(); }
        if (o.k === 0) { const [X, Y] = F(1.0, 1.55); K.g.fillStyle = '#e8e0cc'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW / 7, K.TW / 9, 0, 0, 7); K.g.fill(); K.g.strokeStyle = '#efe6d0'; K.g.lineWidth = Math.max(2, K.TW / 14); K.g.beginPath(); K.g.moveTo(X - K.TW / 8, Y - K.TW / 20); K.g.quadraticCurveTo(X - K.TW / 3.5, Y - K.TW / 6, X - K.TW / 4.5, Y - K.TW / 3); K.g.moveTo(X + K.TW / 8, Y - K.TW / 20); K.g.quadraticCurveTo(X + K.TW / 3.5, Y - K.TW / 6, X + K.TW / 4.5, Y - K.TW / 3); K.g.stroke(); K.g.fillStyle = '#2a2018'; K.g.fillRect(X - K.TW / 16, Y - K.TW / 40, K.TW / 30, K.TW / 30); K.g.fillRect(X + K.TW / 30, Y - K.TW / 40, K.TW / 30, K.TW / 30); }
        break; }
      case 'urn': {   // grande anfora di terracotta (ci si nasconde dietro)
        const C2 = [['#a8582e', '#c06a38'], ['#8e4a2a', '#a85a32'], ['#9a6a3a', '#b88048']][o.v || 0];
        cyl(x + 0.5, y + 0.5, 0.26, 0, 0.12, C2[0]); cyl(x + 0.5, y + 0.5, 0.38, 0.12, 0.75, C2[1]); cyl(x + 0.5, y + 0.5, 0.3, 0.75, 1.0, C2[0]); cyl(x + 0.5, y + 0.5, 0.17, 1.0, 1.25, C2[1]); cyl(x + 0.5, y + 0.5, 0.22, 1.25, 1.32, C2[0]);
        qL(x + 0.2, x + 0.8, y + 0.88, 0.42, 0.5, '#2a1a10'); break; }
      case 'statue': {   // guerriero di pietra con lo scudo (ci si nasconde dietro)
        bx(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, 0.35, '#7a7262'); bx(x + 0.3, y + 0.32, x + 0.7, y + 0.68, 0.35, 1.0, '#9a927f'); bx(x + 0.26, y + 0.28, x + 0.74, y + 0.72, 1.0, 1.6, '#a39b88');
        cyl(x + 0.5, y + 0.5, 0.15, 1.6, 1.95, '#a39b88'); bx(x + 0.42, y + 0.46, x + 0.58, y + 0.54, 1.95, 2.2, '#8a8270');
        cyl(x + 0.5, y + 0.85, 0.24, 0.8, 1.5, '#8f8774'); line(S(x + 0.85, y + 0.5, 0.9), S(x + 0.9, y + 0.5, 2.3), '#7a7262', Math.max(2, K.TW / 18)); break; }
      case 'sarc': {   // sarcofago di pietra
        bx(x + 0.05, y + 0.18, x + 0.95, y + 0.82, 0, 0.55, '#857b68'); bx(x + 0.02, y + 0.15, x + 0.98, y + 0.85, 0.55, 0.68, '#9a907c'); qL(x + 0.2, x + 0.8, y + 0.851, 0.15, 0.45, '#6f6654');
        bx(x + 0.35, y + 0.35, x + 0.65, y + 0.65, 0.68, 0.74, '#b0a68f'); break; }
      case 'ped': {   // colonnina di pietra per il cristallo: base, fusto scanalato, capitello
        bx(x + 0.18, y + 0.18, x + 0.82, y + 0.82, 0, 0.18, '#7a705e'); cyl(x + 0.5, y + 0.5, 0.2, 0.18, 0.95, ['#a39a86', '#9a917c', '#aca38e'][o.v || 0]);
        K.strokes([[S(x + 0.42, y + 0.69, 0.22), S(x + 0.42, y + 0.69, 0.92)], [S(x + 0.58, y + 0.69, 0.22), S(x + 0.58, y + 0.69, 0.92)], [S(x + 0.69, y + 0.5, 0.22), S(x + 0.69, y + 0.5, 0.92)]], 'rgba(60,50,40,.35)');
        bx(x + 0.22, y + 0.22, x + 0.78, y + 0.78, 0.95, 1.08, '#b0a690'); break; }
      case 'brazier': bx(x + 0.4, y + 0.4, x + 0.6, y + 0.6, 0, 0.8, '#3e352e'); cyl(x + 0.5, y + 0.5, 0.3, 0.8, 1.0, '#5a4a3a'); dot(x + 0.5, y + 0.5, 1.12, 0.13, '#ff9a2a'); dot(x + 0.5, y + 0.5, 1.22, 0.07, '#ffe080'); glow(x + 0.5, y + 0.5, 1.1, 1.6, 'rgba(255,170,60,.55)'); break;
      case 'altar': {   // altare con le corna di toro e le candele
        bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.3, '#6f6450'); bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0.3, 0.75, '#857a64'); bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.75, 0.85, '#9a8f78');
        K.strokes([[S(x + 0.3, y + 0.5, 0.86), S(x + 0.15, y + 0.5, 1.35)], [S(x + 0.7, y + 0.5, 0.86), S(x + 0.85, y + 0.5, 1.35)]], '#efe6d0', Math.max(3, K.TW / 9));
        dot(x + 0.5, y + 0.5, 0.9, 0.12, '#e8e0cc'); dot(x + 0.2, y + 0.85, 0.95, 0.04, '#ffe080'); dot(x + 0.8, y + 0.85, 0.95, 0.04, '#ffe080'); glow(x + 0.5, y + 0.5, 1.0, 1.4, 'rgba(255,150,60,.45)'); break; }
    }
  }
  CQ_MAPS.labirinto = { n: 'Labirinto', make: mapLab, seeded: true, only: 'minotauro' };

  // ======================= IL MINOTAURO (personaggio disegnato apposta) =======================
  // toro a due zampe: pelo bruno, petto chiaro, gonnellino di cuoio con la cintura d'oro, zoccoli, testa con le corna, anello al naso, occhi rossi; ascia a due lame
  function bull(g, X, Y, TW, L, walk, f) {
    const u = TW / 34 * 1.12, t = performance.now() / 1000, bob = Math.abs(Math.sin(walk)) * 3 * u, sw = Math.sin(walk) * 4;
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y, 18 * u, 7 * u, 0, 0, 7); g.fill();
    g.save(); g.translate(X, Y - bob); g.scale(u, u);
    const ell = (x, y, rx, ry, c, r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, r || 0, 0, 7); g.fill(); };
    const ln = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const FUR = '#6e4128', FUR2 = '#8a5634', CH = '#a8724a';
    // ascia dietro (dalla parte opposta allo sguardo)
    const ax = -f * 17, ay = -28;
    ln(ax, ay + 8, ax - f * 3, -70, '#5a3a22', 3.2);
    for (const s of [1, -1]) { g.fillStyle = '#9aa2ac'; g.beginPath(); g.moveTo(ax - f * 3, -66); g.quadraticCurveTo(ax - f * 3 + s * 14, -74, ax - f * 3 + s * 13, -58); g.quadraticCurveTo(ax - f * 3 + s * 6, -62, ax - f * 3, -60); g.fill(); }
    g.strokeStyle = '#d8dee4'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax - f * 3 + 12, -73); g.quadraticCurveTo(ax - f * 3 + 14, -66, ax - f * 3 + 12, -59); g.moveTo(ax - f * 3 - 12, -73); g.quadraticCurveTo(ax - f * 3 - 14, -66, ax - f * 3 - 12, -59); g.stroke();
    // zampe con gli zoccoli
    for (const [x0, k] of [[-7, 1], [7, -1]]) { const o = k * sw; g.fillStyle = FUR; g.beginPath(); g.moveTo(x0 - 5, -22); g.lineTo(x0 + 5, -22); g.lineTo(x0 + 3.5 + o * 0.5, -5); g.lineTo(x0 - 3.5 + o * 0.5, -5); g.fill(); ell(x0 + o * 0.6, -3, 5, 3.2, '#2a1e18'); ell(x0 + o * 0.6, -4, 1, 2.6, '#55463a'); }
    // busto muscoloso
    g.fillStyle = FUR; g.beginPath(); g.moveTo(-14, -20); g.quadraticCurveTo(-20, -40, -19, -50); g.quadraticCurveTo(0, -58, 19, -50); g.quadraticCurveTo(20, -40, 14, -20); g.closePath(); g.fill();
    g.fillStyle = CH; g.beginPath(); g.moveTo(f * 2 - 9, -30); g.quadraticCurveTo(f * 2 - 11, -46, f * 2, -50); g.quadraticCurveTo(f * 2 + 11, -46, f * 2 + 9, -30); g.quadraticCurveTo(f * 2, -27, f * 2 - 9, -30); g.fill();
    g.strokeStyle = 'rgba(60,30,15,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(f * 2, -48); g.lineTo(f * 2, -33); g.moveTo(f * 2 - 7, -41); g.quadraticCurveTo(f * 2 - 3, -38, f * 2, -41); g.moveTo(f * 2 + 7, -41); g.quadraticCurveTo(f * 2 + 3, -38, f * 2, -41); g.stroke();
    // gonnellino di cuoio e cintura d'oro
    g.fillStyle = '#4a2e1a'; g.beginPath(); g.moveTo(-15, -25); g.lineTo(15, -25); g.lineTo(13, -14); for (let i = 0; i <= 6; i++) g.lineTo(13 - i * 26 / 6, -14 + (i % 2 ? 3 : 0)); g.closePath(); g.fill();
    g.fillStyle = '#d8a830'; g.fillRect(-15, -27, 30, 3.4); ell(f * 3, -25.3, 3, 2.6, '#f2c84a');
    // braccia: quella dietro tiene l'ascia, quella davanti col bracciale
    ln(-f * 16, -46, ax, ay + 2, FUR2, 7); ell(ax, ay + 3, 4, 4, FUR);
    ln(f * 16, -46, f * 19 + sw * 0.3, -26, FUR2, 7); g.fillStyle = '#d8a830'; g.fillRect(f * 19 - 4 + sw * 0.3, -33, 8, 3); ell(f * 19 + sw * 0.3, -24, 4.2, 4.2, FUR);
    // testa di toro
    const hx = f * 3, hy = -60;
    g.fillStyle = FUR; g.beginPath(); g.moveTo(hx - 11, hy + 6); g.quadraticCurveTo(hx - 13, hy - 10, hx, hy - 12); g.quadraticCurveTo(hx + 13, hy - 10, hx + 11, hy + 6); g.quadraticCurveTo(hx, hy + 9, hx - 11, hy + 6); g.fill();
    ell(hx + f * 5, hy + 5, 8, 6, '#b08262'); ell(hx + f * 2, hy + 5, 1.6, 1.3, '#2a1a12'); ell(hx + f * 8, hy + 5, 1.6, 1.3, '#2a1a12');
    g.strokeStyle = '#f2c84a'; g.lineWidth = 1.8; g.beginPath(); g.arc(hx + f * 5, hy + 9, 3, 0.2, Math.PI - 0.2); g.stroke();
    // corna
    for (const s of [-1, 1]) { g.strokeStyle = '#efe4c8'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx + s * 9, hy - 6); g.quadraticCurveTo(hx + s * 22, hy - 8, hx + s * 20, hy - 22); g.stroke(); g.strokeStyle = '#3a3026'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(hx + s * 20.6, hy - 18); g.lineTo(hx + s * 20, hy - 22); g.stroke(); ell(hx + s * 12, hy - 3, 4, 2, FUR2, s * 0.5); }
    // occhi rossi che brillano
    for (const ex of [-4, 5]) { ell(hx + f * ex, hy - 3, 2.3, 1.6, '#ff3a2a'); ell(hx + f * ex, hy - 3, 1, 0.8, '#ffd0a0'); }
    g.strokeStyle = '#2a160c'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx + f * -7, hy - 6.5); g.lineTo(hx + f * -1, hy - 5); g.moveTo(hx + f * 8, hy - 6.5); g.lineTo(hx + f * 2, hy - 5); g.stroke();
    // fiato caldo dalle narici
    const k = (t * 0.7) % 1; if (k < 0.5) { g.fillStyle = 'rgba(230,230,230,' + (0.35 * (1 - k * 2)) + ')'; ell(hx + f * (12 + k * 14), hy + 6 - k * 4, 2 + k * 6, 1.5 + k * 4); }
    g.restore();
  }
  bull.top = 2.95;   // il nome sopra le corna

  // ======================= REGOLE =======================
  // vede a -> b? (al buio: vicino alla propria torcia o dove ci sono le torce dei muri; i muri coprono)
  function canSee(G, a, b) {
    if (!b.alive || b.out) return false;
    const p = P(a), q = P(b), d = Math.hypot(p.x - q.x, p.y - q.y);
    if (b.hd && b.t !== a.t) return d < 1.0;
    const r = a.mino ? VIS_M : VIS_E;
    if (d > Math.max(r, TORCH_SEE) || (d > r && !litAt(q.x, q.y))) return false;
    return d < 1.6 || los(p.x, p.y, q.x, q.y);
  }
  const fragAt = (G, c) => { const p = P(c); let b = -1, bd = COPY_R; MP().frag.forEach((f, i) => { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd && here(G, i)) { bd = d; b = i; } }); return b; };
  const hideNear = c => { const p = P(c); return MP().hides.some(([x, y]) => { const s = cqSolid[y] && cqSolid[y][x]; return s && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < HIDE_R; }); };
  const nearExit = c => { const e = MP().exit; return dxy(c, e.x, e.y) < EXIT_R + 0.6; };
  function action(G, c) {
    if (!c.alive || c.out || G.esc) return null;
    if (c.mino) return { k: 'roar', t: G.time < (c.rcd || 0) ? '🐂 ' + Math.ceil(c.rcd - G.time) + ' s' : '🐂 Muggito', on: G.time >= (c.rcd || 0) };
    if (c.op) return { k: 'wait', t: '💎 Prendo… ' + Math.round(Math.min(1, (G.time - c.op.t0) / COPY_T) * 100) + '%', on: false };
    if (fragAt(G, c) >= 0) return { k: 'copy', t: '💎 Prendi il cristallo', on: true };
    if (c.hd) return { k: 'unhide', t: '🏺 Esci', on: true };
    if (hideNear(c)) return { k: 'hide', t: '🏺 Nasconditi', on: true };
    return null;
  }
  function doAct(G, c, a) {
    if (!c || !c.alive || c.out || !a || G.esc) return;
    const p = P(c);
    if (a.k === 'roar' && c.mino && G.time >= (c.rcd || 0)) {
      c.rcd = G.time + ROAR_CD; c.rT = G.time;
      for (const e of expl(G)) if (dist(c, e) < ROAR_R) { e.slow = G.time + ROAR_T; e.op = null; }
      say(G, 'roar', { a: c.id, x: Math.round(p.x), y: Math.round(p.y) });
    }
    else if (a.k === 'copy' && !c.mino) { const i = fragAt(G, c); if (i >= 0 && !c.op) c.op = { k: 'copy', i, t0: G.time, x: p.x, y: p.y }; }
    else if (a.k === 'hide' && !c.mino) { if (hideNear(c)) { c.hd = 1; c.path = []; } }
    else if (a.k === 'unhide') c.hd = 0;
  }
  function copyDone(G, c) {
    const i = c.op.i; c.op = null; const t = c.t; if (!here(G, i)) return;
    G.cs[i] = t; G.fc[t] = (G.fc[t] || 0) | (1 << i); c.fr = (c.fr || 0) + 1;
    say(G, full(G, t) ? 'all' : 'copy', { a: c.id, b: t, n: nfr(G, t) });
  }
  function caught(G, v, by) {
    const p = P(v); v.alive = false; v.hd = 0; v.op = null; v.path = []; v.walk = 0; by.ct = (by.ct || 0) + 1; by.eat = G.time + EAT_T;
    G.bodies.push({ id: v.id, x: p.x, y: p.y, face: v === G.me ? cq.face : v.face, look: cqLookOf(v), name: v.name, t: G.time, nk: 1 });
    say(G, 'catch', { a: v.id, b: by.id });
  }

  // ======================= MURI CHE SI SPOSTANO =======================
  // l'host prepara il cambio 5 s prima (G.pend = nuovo stato) e lo applica allo scadere: le caselle con qualcuno sopra restano aperte
  const hex = st => { let s = ''; for (let i = 0; i < st.length; i += 4) s += ((st[i] | 0) | (st[i + 1] | 0) << 1 | (st[i + 2] | 0) << 2 | (st[i + 3] | 0) << 3).toString(16); return s; };
  const unhex = (s, n) => { const st = new Uint8Array(n); for (let i = 0; i < n; i++) st[i] = (parseInt(s[i >> 2], 16) >> (i & 3)) & 1; return st; };
  function planShift(G) {
    const S = MP().S, st = G.S.slice(), rnd = MG.rnd((MP().seed | 0) * 13 + G.wv * 977 + 5);
    const w = 7 + Math.floor(rnd() * 3), h = 7 + Math.floor(rnd() * 3), i0 = Math.floor(rnd() * (NN - w + 1)), j0 = Math.floor(rnd() * (NN - h + 1));
    const inR = n => { const i = n % NN, j = (n / NN) | 0; return i >= i0 && i < i0 + w && j >= j0 && j < j0 + h; };
    const list = []; S.forEach((s, k) => { if (inR(s.a) && inR(s.b)) list.push(k); });
    carve(S, st, list, rnd);
    return st;
  }
  // una casella che si chiuderebbe addosso a qualcuno (vivo o fantasma, con un po' di margine per il ritardo online)
  const busy = (G, x, y) => G.chars.some(c => { if (c.out) return false; const p = P(c); return Math.abs(p.x - x - 0.5) < 0.98 && Math.abs(p.y - y - 0.5) < 0.98; });
  function applyShift(G) {
    const S = MP().S, st = G.pend; G.pend = null; if (!st) return;
    S.forEach((s, k) => { if (st[k] && !G.S[k] && s.c.some(([x, y]) => busy(G, x, y))) st[k] = 0; });
    G.S = st; G.wv++; G.wsT = G.time;
    for (const c of G.chars) if (c.bot) c.path = [];
    say(G, 'shift', {});
  }
  // ridisegno della mappa pronta dopo un cambio dei muri: UNA zona che copre tutte le caselle cambiate (con cqBgCell casella per casella
  // le zone si sovrapponevano e lo stesso pezzo si ridisegnava molte volte: scatti di 1-2 s sul telefono), fatta a strisce dall'alto
  // in basso, tante quante stanno in ZONE_MS millisecondi per fotogramma
  const ZONE_MS = 4, STRIP = 40;
  function zoneOf(cells) {
    const B = cq.bg; if (!B || !cells.length) return null;
    const TW = B.TW, TH = TW / 2, U = TH * 1.15; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of cells) {
      x0 = Math.min(x0, B.ox + (x - y - 1) * TW / 2 - 0.6 * TW); x1 = Math.max(x1, B.ox + (x - y + 1) * TW / 2 + 0.6 * TW);
      y0 = Math.min(y0, B.oy + (x + y) * TH / 2 - 3.5 * U - TW); y1 = Math.max(y1, B.oy + (x + y + 2) * TH / 2 + TW);
    }
    return { B, x0, x1, y: y0, y1 };
  }
  function drawZones(G) {
    const B = cq.bg; if (!G.rz.length) return;
    if (!B) { G.rz = []; return; }   // mappa pronta da rifare: si rifa' gia' con i muri nuovi
    const t0 = performance.now(), TW = B.TW, sc = B.dpr; cq.baking = true;
    while (G.rz.length && performance.now() - t0 < ZONE_MS) {
      const z = G.rz[0]; if (z.B !== B) { G.rz.shift(); continue; }
      // pezzo di STRIP x STRIP*6 pixel: da sinistra a destra, poi la striscia sotto
      const ya = z.y, yb = Math.min(z.y1, z.y + STRIP), xa = z.x != null ? z.x : z.x0, xb = Math.min(z.x1, xa + STRIP * 6);
      if (xb >= z.x1) { z.x = null; z.y = yb; } else z.x = xb;
      for (const t of B.tiles) {
        const x0 = Math.max(xa, t.x), y0 = Math.max(ya, t.y), x1 = Math.min(xb, t.x + t.w), y1 = Math.min(yb, t.y + t.h);
        if (x1 <= x0 || y1 <= y0) continue;
        const g = t.c.getContext('2d', CQ_CPU); g.setTransform(sc, 0, 0, sc, -t.x * sc, -t.y * sc);
        cqRedraw(g, cqTools(g, TW), [x0, y0, x1, y1], B.ox, B.oy, TW, [], 17);
      }
      if (z.y >= z.y1) G.rz.shift();
    }
    cq.baking = false; B.ver++;
  }
  // su ogni telefono: le caselle dei muri come dice lo stato
  function syncWalls(G) {
    const S = MP().S; if (!G.Sd) G.Sd = MP().st0.slice();
    if (G.SdV !== G.wv) {
      G.SdV = G.wv; const ch = [];
      S.forEach((s, k) => { const v = G.S[k]; if (G.Sd[k] === v) return; G.Sd[k] = v; for (const [x, y] of s.c) { cqSolid[y][x] = v ? { prop: 'mw', o: {} } : null; ch.push([x, y]); } });
      const z = zoneOf(ch);
      if (z) {   // prima la parte che si vede sullo schermo, poi tutto il resto
        const B = z.B, cx = B.ox + (cq.x - cq.y) * B.TW / 2, cy = B.oy + (cq.x + cq.y) * B.TW / 4, v = { B, x0: Math.max(z.x0, cx - cq.w / 2 - 20), x1: Math.min(z.x1, cx + cq.w / 2 + 20), y: Math.max(z.y, cy - cq.h / 2 - 20), y1: Math.min(z.y1, cy + cq.h / 2 + 20) };
        if (v.x1 > v.x0 && v.y1 > v.y) G.rz.push(v);
        G.rz.push(z);
      }
      thud(0.7, 70); thud(0.5, 110);
      // se un muro mi e' finito addosso (ritardo online): alla casella libera piu' vicina
      if (!cqFree(cq.x, cq.y)) { const q = cqSpot(Math.floor(cq.x), Math.floor(cq.y)); cq.x = q.x; cq.y = q.y; }
    }
    drawZones(G);
    for (let n = 0; n < 2 && G.rq.length; n++) { const [x, y] = G.rq.shift(); cqBgCell(x, y, 1); }   // segni col gesso (pochi)
    // caselle che cambieranno (avviso): calcolate una volta
    const pk = G.pend ? (G.pendK || '') : '';
    if (G.pcK !== pk) { G.pcK = pk; G.pc = []; if (G.pend) S.forEach((s, k) => { if (G.pend[k] !== G.S[k]) for (const [x, y] of s.c) G.pc.push([x, y, G.pend[k]]); }); }
  }
  // segni col gesso: sul pavimento (deco 'chalk'), uno per casella, al massimo CHALK_MAX a testa
  function addMark(G, c, x, y, d) {
    if (!cqFloor[y] || !cqFloor[y][x] || isWall(x, y)) return;
    G.mk = G.mk.filter(m => !(m.x === x && m.y === y));
    G.mk.push({ x, y, t: c.t, d: d & 3, o: c.id });
    const mine = G.mk.filter(m => m.o === c.id); if (mine.length > CHALK_MAX) G.mk.splice(G.mk.indexOf(mine[0]), 1);
    G.mv++; G.mkT = G.time;
  }
  function syncMarks(G) {
    if (G.mkD === G.mv) return; G.mkD = G.mv;
    const now = new Map(G.mk.map(m => [m.x + ',' + m.y, m])), old = G.mkMap || new Map(), at = MP().decoAt;
    G.mkMap = now;
    for (const [k, m] of now) { const o = old.get(k); if (!o || o.t !== m.t || o.d !== m.d) { cqDeco[m.y][m.x] = 'chalk'; G.rq.push([m.x, m.y]); } }
    for (const [k, m] of old) if (!now.has(k)) { cqDeco[m.y][m.x] = at.get(k) || null; G.rq.push([m.x, m.y]); }
  }
  function chalk() {
    const G = cq.g; if (!G || G.mode !== 'minotauro' || G.phase !== 'play' || G.pre > 0) return;
    const me = G.me; if (!me.alive || me.mino || me.out) return;
    const x = Math.floor(cq.x), y = Math.floor(cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, d = Math.abs(wx) >= Math.abs(wy) ? (wx > 0 ? 0 : 2) : (wy > 0 ? 1 : 3);
    if (G.guest) { cqNetSend({ k: 'mk', x, y, d }); addMark(G, me, x, y, d); G.mkH = G.time + 1.5; } else addMark(G, me, x, y, d);
    beep(1500, 0.05, 0.02); beep(1200, 0.06, 0.015, 0.05);
  }
  // impronte: chi corre lascia le orme (le vede solo il Minotauro). Calcolate su ogni telefono dalle posizioni
  function feet(G) {
    for (const c of G.chars) {
      if (c.mino || !c.alive || c.out || c.hd) { c.fpx = null; continue; }
      const p = P(c); if (c.fpx == null) { c.fpx = p.x; c.fpy = p.y; continue; }
      const d = Math.hypot(p.x - c.fpx, p.y - c.fpy); if (d < 0.55) continue;
      if (d < 3) { c.fps = -(c.fps || 1); G.fp.push([p.x, p.y, Math.atan2(p.y - c.fpy, p.x - c.fpx), G.time, c.id, c.fps]); }
      c.fpx = p.x; c.fpy = p.y;
    }
    while (G.fp.length && G.time - G.fp[0][3] > PRINT_T) G.fp.shift();
  }

  // cronaca: l'host scrive (G.lg), ognuno racconta dal suo punto di vista
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 10) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', T = TT(G);
    let t = '';
    if (e.k === 'catch') { t = A === me ? '🐂 Il Minotauro ti ha preso! Sei un fantasma: guarda la partita (gli altri non ti sentono).' : B === me ? '🐂 Hai preso ' + an + '!' : '🐂 Il Minotauro ha preso ' + an + '!'; beep(110, 0.5, 0.08, 0, 'sawtooth'); beep(80, 0.6, 0.06, 0.1, 'square'); }
    else if (e.k === 'copy') { const mine = e.b === me.t; t = mine ? '💎 ' + (A === me ? 'Hai' : an + ' ha') + ' preso un cristallo (' + e.n + '/' + NEED + ')!' : me.mino ? '💎 ' + an + ' ha preso un cristallo.' : '💎 I ' + T[e.b].n + ' hanno ' + e.n + '/' + NEED + ' cristalli.'; if (mine) { beep(660, 0.1, 0.04); beep(880, 0.14, 0.04, 0.1); } }
    else if (e.k === 'all') { const mine = e.b === me.t; t = mine ? '💎 ' + NEED + ' cristalli! L\'uscita si è illuminata: guarda la mappina e correte!' : me.mino ? '⚠️ ' + (G.nt === 1 ? 'Gli esploratori hanno' : 'I ' + T[e.b].n + ' hanno') + ' tutti i cristalli: stanno andando all\'uscita!' : '⚠️ I ' + T[e.b].n + ' hanno tutti i cristalli!'; beep(523, 0.12, 0.05); beep(659, 0.12, 0.05, 0.12); beep(1047, 0.3, 0.05, 0.24); }
    else if (e.k === 'roar') { const d = Math.hypot(e.x - cq.x, e.y - cq.y), v = Math.max(0.03, 0.16 * (1 - d / 30)); beep(72, 1.0, v, 0, 'sawtooth'); beep(58, 1.2, v * 0.8, 0.12, 'sawtooth'); beep(96, 0.5, v * 0.5, 0, 'square'); if (A === me) t = '🐂 MUUUH! Chi era vicino trema e rallenta.'; else if (!me.mino && me.alive && d < ROAR_R) t = '😱 Il muggito ti ha stordito: vai più piano per qualche secondo!'; else if (!me.mino) t = '🐂 Un muggito ' + (d < 15 ? 'vicino!' : 'in lontananza…'); }
    else if (e.k === 'warn') { t = '🧱 Il labirinto trema: tra ' + WARN + ' secondi i muri si spostano!'; for (let i = 0; i < 4; i++) thud(0.5, 60 + i * 15); }
    else if (e.k === 'shift') t = '🧱 I muri si sono spostati!';
    else if (e.k === 'esc') { const mine = e.b === me.t; t = '🚪 ' + (A === me ? 'Sei uscito' : an + ' è uscito') + ' dal labirinto!'; beep(mine ? 523 : 330, 0.15, 0.06); beep(mine ? 659 : 294, 0.15, 0.06, 0.15); beep(mine ? 784 : 262, 0.4, 0.06, 0.3); }
    if (t) cqToast(t);
  }

  // ======================= PERSONAGGI DEL COMPUTER =======================
  function go(G, c, x, y) {
    if (!cqCellFree(Math.floor(x), Math.floor(y))) { const q = cqSpot(Math.floor(x), Math.floor(y)); x = q.x; y = q.y; }
    c.path = cqPath(c.x, c.y, x, y); return c.path.length > 0 || Math.hypot(c.x - x, c.y - y) < 0.8;
  }
  const randNode = () => { const i = Math.floor(Math.random() * NN), j = Math.floor(Math.random() * NN); return { x: 1.5 + 3 * i + (Math.random() < 0.5 ? 1 : 0), y: 1.5 + 3 * j + (Math.random() < 0.5 ? 1 : 0) }; };
  function wander(G, c, near) {
    if (c.path.length && Math.random() > 0.04) return;
    for (let i = 0; i < 12; i++) { const q = randNode(); if (near && Math.hypot(q.x - near.x, q.y - near.y) > near.r) continue; if (!near && Math.hypot(q.x - c.x, q.y - c.y) < 10) continue; if (go(G, c, q.x, q.y)) return; }
  }
  function flee(G, c, th) {
    const q = P(th); let best = null, bs = -1e9;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 7, r = 3 + Math.random() * 4, x = Math.floor(c.x + Math.cos(a) * r), y = Math.floor(c.y + Math.sin(a) * r); if (!cqCellFree(x, y)) continue;
      const p = cqPath(c.x, c.y, x + 0.5, y + 0.5); if (!p.length || p.length > 9) continue;
      const f = p[Math.min(2, p.length - 1)], s = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) + 2 * (Math.hypot(f[0] - q.x, f[1] - q.y) - Math.hypot(c.x - q.x, c.y - q.y));
      if (s > bs) { bs = s; best = p; }
    }
    if (best) c.path = best.slice(0, 6);
  }
  function hideSpot(c, r) { let b = null, bd = r; for (const [x, y] of MP().hides) { const s = cqSpot(x, y), d = Math.hypot(s.x - c.x, s.y - c.y); if (d < bd) { const n = cqPath(c.x, c.y, s.x, s.y).length; if (n > 0 && n < r * 1.6) { bd = d; b = s; } } } return b; }
  function botExpl(G, c) {
    if (c.op) return;
    const M = mino(G), t = c.t, dm = M ? dist(c, M) : 99, seeM = M && M.alive && (canSee(G, c, M) || (dm < HEAR && (M.walk || M.mv)));
    if (seeM) c.sawM = G.time;
    if (c.hd) { if (G.time - (c.sawM || -99) > 4 + Math.random() * 3 || (seeM && dm < 1.6)) c.hd = 0; else return; }
    if (seeM && dm < 6.5) {
      if (dm > 2.6 && hideNear(c) && Math.random() < 0.6) { doAct(G, c, { k: 'hide' }); return; }
      const hs = dm > 3.2 && hideSpot(c, 3); if (hs && Math.random() < 0.5) { go(G, c, hs.x, hs.y); c.goHide = 1; return; }
      flee(G, c, M); c.fleeT = G.time; return;
    }
    if (c.goHide && hideNear(c) && G.time - (c.sawM || -99) < 3) { c.goHide = 0; doAct(G, c, { k: 'hide' }); return; }
    c.goHide = 0;
    // squadra con la mappa completa: all'uscita
    if (full(G, t)) { const e = MP().exit; go(G, c, e.x - e.dx * 0.6, e.y - e.dy * 0.6); return; }
    // cristallo da prendere
    if (fragAt(G, c) >= 0) { doAct(G, c, { k: 'copy' }); c.path = []; return; }
    let best = null, bd = 1e9;
    MP().frag.forEach((f, i) => { if (!here(G, i) || !G.kn[t].has(i)) return; const d = Math.hypot(f.x - c.x, f.y - c.y) + (G.chars.some(o => o !== c && o.bot && o.t === t && o.gl === i) ? 14 : 0) + (M && Math.hypot(f.x - M.x, f.y - M.y) < 5 ? 10 : 0); if (d < bd) { bd = d; best = i; } });
    if (best != null) { if (c.gl !== best || !c.path.length) { c.gl = best; const f = MP().frag[best]; go(G, c, f.cx, f.cy); } return; }
    c.gl = -1; wander(G, c);
  }
  function botMino(G, c) {
    // un esploratore in vista: lo inseguo (e muggisco se e' a tiro)
    let tg = null, bd = 1e9;
    for (const e of expl(G)) { if (!canSee(G, c, e)) continue; const d = dist(c, e); if (d < bd) { bd = d; tg = e; } }
    if (tg) { const q = P(tg); c.hunt = { x: q.x, y: q.y, t: G.time }; if (bd > 1.6 && bd < 5.5 && G.time >= (c.rcd || 0) && Math.random() < 0.35) doAct(G, c, { k: 'roar' }); go(G, c, q.x, q.y); return; }
    // le impronte piu' fresche vicino a me
    if (Math.random() < 0.7) {
      let fp = null; for (let i = G.fp.length - 1; i >= 0; i--) { const f = G.fp[i]; if (G.time - f[3] > 4.5) break; if (Math.hypot(f[0] - c.x, f[1] - c.y) < 7.5) { fp = f; break; } }
      if (fp) { c.hunt = { x: fp[0], y: fp[1], t: G.time }; go(G, c, fp[0], fp[1]); return; }
    }
    if (c.hunt && G.time - c.hunt.t < 4 && Math.hypot(c.hunt.x - c.x, c.hunt.y - c.y) > 0.8) { if (!c.path.length) go(G, c, c.hunt.x, c.hunt.y); return; }
    // ronda: ogni tanto vicino a un cristallo, se no in giro
    if (!c.path.length || Math.random() < 0.03) {
      const live = MP().frag.filter((f, i) => here(G, i)); if (live.length && Math.random() < 0.25) { const f = live[Math.floor(Math.random() * live.length)]; go(G, c, f.cx, f.cy); }
      else wander(G, c);
    }
  }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.nt = G.opt.tm === 3 && G.chars.length >= 9 ? 3 : G.opt.tm === 1 || G.chars.length < 3 ? 1 : 2;
    G.S = MP().st0.slice(); G.Sd = MP().st0.slice(); G.SdV = 0; G.wv = 0; G.wsT = 0; G.pend = null; G.rq = []; G.rz = []; G.pc = [];
    G.next = G.opt.wall || 60; G.fc = [0, 0, 0]; G.ncr = Math.min(MP().frag.length, NEED * G.nt + 2); G.cs = MP().frag.map(() => -1); G.ex = new Uint8Array(W * W); G.exV = 0; G.exK = 0; G.kn = [new Set(), new Set(), new Set()];
    G.mk = []; G.mv = 0; G.mkD = 0; G.mkMap = new Map(); G.mkT = 0; G.fp = []; G.lg = []; G.lgN = 0; G.esc = null;
    G.left = G.opt.time || 420; cq.mapDirty = true;   // muri e segni cambiano la mappa: la prossima partita la rifa' da capo
  }
  CQ_MODES.minotauro = {
    n: 'Il Minotauro',
    desc: '🐂 Un labirinto antico, al buio, diverso ogni volta. Gli esploratori 🔦 (da soli contro il Minotauro, o in 2-3 squadre rivali) devono prendere <b>4 cristalli</b> 💎 appoggiati sulle colonnine (chi lo prende lo porta via: gli altri non lo trovano più). La <b>mappina</b> si disegna mentre esplori; con 4 cristalli compare l\'<b>uscita</b> e la porta si apre. Il primo che esce fa vincere la sua squadra. Ogni tanto <b>i muri si spostano</b> 🧱 (avviso col rumore di pietra). Lascia <b>segni col gesso</b> ✏️ per orientarti. Il <b>Minotauro</b> vede più lontano, vede le <b>impronte</b> fresche e col <b>muggito</b> fa tremare e rallenta chi è vicino: chi tocca diventa un fantasma. Gli esploratori non hanno armi: scappa o <b>nasconditi</b> 🏺 dietro vasi e statue. A tempo scaduto vince il Minotauro.',
    maps: [['labirinto', 'Labirinto']], TEAMS,
    def: { time: 420, wall: 60, tm: 2, mino: 'r', map: 'labirinto', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Squadre di esploratori</div>${seg('tm', [[1, 'Una (tutti insieme)'], [2, 'Due'], [3, 'Tre (9+ personaggi)']], o.tm || 2)}</div>
      <div class="row"><div class="lbl">Chi è il Minotauro</div>${seg('mino', [['r', 'A caso'], ['p', cq.net ? 'Una persona' : 'Io'], ['c', 'Il computer']], o.mino || 'r')}</div>
      <div class="row"><div class="lbl">I muri si spostano ogni</div>${seg('wall', [[30, '30 s'], [45, '45 s'], [60, '60 s'], [80, '80 s']], o.wall || 60)}</div>
      <div class="row"><div class="lbl">Durata</div>${seg('time', [[300, '5:00'], [420, '7:00'], [600, '10:00']], o.time || 420)}</div>`,
    read: d => ({ tm: +d.get('tm') || 2, mino: d.get('mino') || 'r', wall: +d.get('wall') || 60, time: +d.get('time') || 420 }),
    start(G) {
      setup(G);
      // il Minotauro: a caso tra tutti, una persona a caso (da solo: io) o il computer (se non c'e' nessun computer: a caso)
      const hum = G.chars.filter(c => !c.bot), bots = G.chars.filter(c => c.bot);
      const pool = G.opt.mino === 'p' ? hum : G.opt.mino === 'c' && bots.length ? bots : G.chars;
      const m = pool[Math.floor(Math.random() * pool.length)];
      const ex = G.chars.filter(c => c !== m).sort(() => Math.random() - 0.5);
      ex.forEach((c, i) => { c.t = i % G.nt; });
      m.t = -1; m.mino = true;
      const st = MP().starts[G.nt - 1];
      for (const c of G.chars) {
        Object.assign(c, { hd: 0, slow: 0, rcd: c.mino ? 20 : 0, op: null, out: 0, fr: 0, ct: 0, gl: -1, path: [], dname: c.mino ? '🐂 ' + c.name : null });
        const s = c.mino ? SQ.spawn(MP().arena, 4) : SQ.spawn(MP().startP[st[c.t]], 4); c.x = s.x; c.y = s.y;
      }
    },
    gstart(G) { setup(G); },
    intro: G => G.me.mino ? '🐂 Sei il Minotauro: prendili prima che escano!' : (() => { const T = TT(G)[G.me.t || 0]; return G.nt === 1 ? '🔦 Trovate 4 cristalli e scappate dal labirinto!' : T.e + ' Sei nei ' + T.n + ': 4 cristalli e fuori per primi!'; })(),
    speed(c) { const G = cq.g; if (!G || !G.fc) return 1; if (!c.alive) return 1.1; if (c.out || c.op) return 0; if (c.mino && (c.eat || 0) > G.time) return 0; return (c.mino ? MSPD : 1) * (slowOn(G, c) ? 0.6 : 1); },
    big(G) {
      const me = G.me; if (me.t == null) return '';
      if (G.esc) { const A = byId(G, G.esc.id); return '🚪 ' + (A ? A.name : '') + ' esce dal labirinto!'; }
      if (!me.alive) return '👻 Sei un fantasma: guardi la partita (gli altri non ti sentono).';
      if (G.pend) return '🧱 I muri si spostano tra ' + Math.max(0, Math.ceil(G.next - G.time)) + '…';
      if (me.op) return '💎 Prendo il cristallo… resta fermo!';
      if (slowOn(G, me) && !me.mino) return '😵 Il muggito ti ha stordito!';
      if (me.hd) return '🏺 Nascosto: il Minotauro non ti vede finché non ti muovi (ma attento alle impronte!).';
      if (!me.mino && nearExit(me) && !full(G, me.t)) return '🔒 L\'uscita! Si apre solo con ' + NEED + ' cristalli (' + nfr(G, me.t) + '/' + NEED + ').';
      return '';
    },
    hud(G) {
      const me = G.me; if (me.t == null) return '🐂 Il Minotauro';
      const T = TT(G), sc = Array.from({ length: G.nt }, (_, t) => (G.nt > 1 ? T[t].e + ' ' : '') + nfr(G, t) + '/' + NEED).join(' · ');
      const who = me.mino ? '<b style="color:#ff8a70">🐂 Minotauro</b>' + (me.ct ? ' · 👻 ' + me.ct : '') : '<b style="color:' + T[me.t].l + '">' + (G.nt === 1 ? '🔦 Esploratore' : T[me.t].n) + '</b>';
      return `${who} · 💎 ${sc} · 🧱 ${mmss(Math.max(0, G.next - G.time))} · ⏳ ${mmss(Math.max(0, G.left))}`;
    },
    hide: c => { const G = cq.g; if (c.out) return true; if (!G.me.alive || c === G.me) return false; return !!c.hd && c.t !== G.me.t && dist(G.me, c) > 1.0; },
    nameCol: c => c.mino ? '#ff8a70' : c.t != null && c.t >= 0 ? TT(cq.g)[c.t].l : null,
    draw: c => c.mino && c.alive ? bull : null,
    btn(G) { const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'hide' || a.k === 'unhide') { me.hd = a.k === 'hide' ? 1 : 0; me.hdH = G.time + 1; me.hdX = cq.x; me.hdY = cq.y; if (G.guest) cqNetSend({ k: 'hd', v: me.hd }); beep(me.hd ? 500 : 700, 0.06, 0.03); return; }
      if (G.guest) { cqNetSend({ k: 'a', a: a.k }); if (a.k === 'roar') { me.rcd = G.time + ROAR_CD; me.rcH = G.time + 1.5; } } else doAct(G, me, a);
    },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'hd') { if (!o.v) c.hd = 0; else if (hideNear(c)) c.hd = 1; }
      else if (o.k === 'mk') { if (c.alive && !c.mino && Math.hypot(c.x - o.x - 0.5, c.y - o.y - 0.5) < 2.5) addMark(G, c, o.x | 0, o.y | 0, o.d | 0); }
      else if (o.k === 'a') doAct(G, c, { k: o.a });
    },
    voice: (G, c) => !c.alive ? 0 : c.t >= 0 && c.t === G.me.t ? 1 : null,
    // su ogni telefono: muri, segni, impronte, esco dal nascondiglio se mi muovo, lo schermo trema col muggito
    local(G, dt) {
      const me = G.me; if (!G.fc) return;
      if (me.hd && Math.hypot(cq.x - (me.hdX != null ? me.hdX : cq.x), cq.y - (me.hdY != null ? me.hdY : cq.y)) > 0.25) { me.hd = 0; me.hdH = G.time + 1; if (G.guest) cqNetSend({ k: 'hd', v: 0 }); }
      if (me.hd && me.hdX == null) { me.hdX = cq.x; me.hdY = cq.y; }
      if (!me.hd) me.hdX = me.hdY = null;
      syncWalls(G); syncMarks(G); feet(G);
      if ((G.exT = (G.exT || 0) - dt) <= 0) { G.exT = 0.2; explore(G); }
      const M = mino(G);
      if (M && M !== me && M.alive && (M.walk || M.mv) && (G.stT = (G.stT || 0) - dt) <= 0) { G.stT = 0.42; const d = Math.hypot(M.x - cq.x, M.y - cq.y); if (d < 10) thud(0.7 * (1 - d / 10), 52 + Math.random() * 10); }
      const cv = $('#cqCanvas'), sh = !me.mino && me.alive && slowOn(G, me) && G.time - (me.slow - ROAR_T) < 0.9;
      if (sh) { const k = 7 * (1 - (G.time - (me.slow - ROAR_T)) / 0.9); cv.style.transform = 'translate(' + ((Math.random() - 0.5) * k).toFixed(1) + 'px,' + ((Math.random() - 0.5) * k).toFixed(1) + 'px)'; } else if (cv.style.transform) cv.style.transform = '';
    },
    tick(G, dt) {
      G.left -= dt;
      // muri che si spostano: avviso, poi cambio
      if (!G.pend && G.time >= G.next - WARN) { G.pend = planShift(G); G.pendK = 'p' + G.wv; say(G, 'warn', {}); }
      if (G.pend && G.time >= G.next) { applyShift(G); G.next += G.opt.wall || 60; }
      const M = mino(G);
      // cristalli (fermi COPY_T secondi), uscita, il Minotauro prende chi tocca
      for (const c of expl(G)) {
        const p = P(c);
        if (c.op) { if (Math.hypot(p.x - c.op.x, p.y - c.op.y) > 0.5) c.op = null; else if (G.time - c.op.t0 >= COPY_T) copyDone(G, c); }
        if (!G.esc && full(G, c.t) && dxy(c, MP().exit.x, MP().exit.y) < EXIT_R) { G.esc = { id: c.id, t: c.t, at: G.time + ESC_T }; c.out = 1; c.path = []; say(G, 'esc', { a: c.id, b: c.t }); }
      }
      if (M && M.alive && !G.esc && !((M.eat || 0) > G.time)) for (const e of expl(G)) if (dist(M, e) < CATCH) caught(G, e, M);
      if (G.esc && G.time >= G.esc.at) { this.finish(G); return; }
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive || c.out) continue;
        if (c.op || G.esc) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.3 + Math.random() * 0.2; if (c.mino) botMino(G, c); else botExpl(G, c); }
        if (!c.hd) cqModeStep(c, dt, (!c.mino && G.time - (c.fleeT || -9) < 2 ? 1 : 0.9) * this.speed(c)); else c.walk = 0;   // chi scappa corre
      }
      // cosa conosce ogni squadra: i cristalli visti da vicino
      if ((G.knT = (G.knT || 0) - dt) <= 0) { G.knT = 0.5; for (const c of expl(G)) MP().frag.forEach((f, i) => { const p = P(c); if (here(G, i) && Math.hypot(p.x - f.x, p.y - f.y) < 7 && los(p.x, p.y, f.x, f.y)) G.kn[c.t].add(i); }); }
      if (G.left <= 0 || !expl(G).length) this.finish(G);
    },
    finish(G) {
      const M = mino(G), T = TT(G), name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), c.mino ? '— 🐂 Minotauro · 👻 ' + (c.ct || 0) + ' presi' : '— ' + T[c.t].e + ' 💎 ' + (c.fr || 0) + ' cristalli' + (c.out ? ' · 🚪 uscito' : c.alive ? '' : ' · 👻')];
      if (G.esc) {
        const w = G.esc.t, A = byId(G, G.esc.id);
        const rank = G.chars.slice().sort((a, b) => (b.t === w) - (a.t === w) || (b.out | 0) - (a.out | 0) || (b.fr || 0) - (a.fr || 0)).map(line);
        cqModeEnd({ t: G.nt === 1 ? '🚪 Gli esploratori sono scappati!' : T[w].e + ' Vincono i ' + T[w].n + '!', why: (A ? A.name : 'Qualcuno') + ' ha trovato l\'uscita del labirinto.', win: G.chars.filter(c => !c.mino && c.t === w).map(c => c.id), rank });
      } else {
        const rank = G.chars.slice().sort((a, b) => (b.mino | 0) - (a.mino | 0) || (b.alive | 0) - (a.alive | 0) || (b.fr || 0) - (a.fr || 0)).map(line);
        cqModeEnd({ t: '🐂 Vince il Minotauro!', why: expl(G).length ? 'Tempo finito: nessuno è uscito dal labirinto.' : 'Ha preso tutti gli esploratori.', win: M ? [M.id] : [], rank });
      }
    },
    // online: squadra (-1 = Minotauro), nascosto, stordito, copia in corso, attesa del muggito, uscito, cristalli, presi
    csnap: c => { const G = cq.g, r = v => Math.max(0, Math.round((v - G.time) * 10) / 10); return [c.t, c.hd ? 1 : 0, r(c.slow || 0), c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : -1, r(c.rcd || 0), c.out ? 1 : 0, c.fr || 0, c.ct || 0, c.op ? c.op.i : -1, r(c.eat || 0)]; },
    capply(G, c, a) {
      c.t = a[0]; c.mino = a[0] === -1; c.dname = c.mino ? '🐂 ' + c.name : null;
      if (!(c === G.me && G.time < (c.hdH || 0))) c.hd = a[1];
      c.slow = a[2] > 0 ? G.time + a[2] : 0;
      c.op = a[3] >= 0 ? { k: 'copy', i: a[8], t0: G.time - a[3], x: c.x, y: c.y } : null;
      if (!(c === G.me && G.time < (c.rcH || 0))) c.rcd = a[4] > 0 ? G.time + a[4] : 0;
      c.out = a[5]; c.fr = a[6]; c.ct = a[7]; c.eat = a[9] > 0 ? G.time + a[9] : 0;
    },
    snap(G) {
      const per = G.time - G.wsT < 2.5 || Math.floor(G.time * 2) % 6 === 0, perM = G.time - G.mkT < 2.5 || Math.floor(G.time * 2) % 6 === 3;
      return { left: Math.round(G.left * 10) / 10, nx: Math.round((G.next - G.time) * 10) / 10, wv: G.wv, ws: per ? hex(G.S) : null, pd: G.pend ? hex(G.pend) : null, pk: G.pendK || '',
        fc: G.fc.slice(0, G.nt), cs: G.cs.map(v => v < 0 ? '-' : v).join(''), mv: G.mv, mk: perM ? G.mk.map(m => [m.x, m.y, m.t, m.d, m.o]) : null,
        esc: G.esc ? [G.esc.id, G.esc.t, Math.round((G.esc.at - G.time) * 10) / 10] : null, lg: G.lg,
        bd: G.bodies.map(b => [b.id, Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.face, Math.round(b.t * 10) / 10]) };
    },
    apply(G, x) {
      if (!G.fc) return;
      const n = MP().S.length;
      G.left = x.left; G.next = G.time + x.nx;
      if (x.ws && (x.wv !== G.wv || hex(G.S) !== x.ws)) { G.S = unhex(x.ws, n); G.wv = x.wv; G.SdV = -1; }
      G.pend = x.pd ? unhex(x.pd, n) : null; G.pendK = x.pk;
      x.fc.forEach((v, t) => { G.fc[t] = v; }); if (x.cs) G.cs = [...x.cs].map(v => v === '-' ? -1 : +v);
      if (x.mk && x.mv !== G.mv && !(G.time < (G.mkH || 0))) { G.mk = x.mk.map(a => ({ x: a[0], y: a[1], t: a[2], d: a[3], o: a[4] })); G.mv = x.mv; }
      G.esc = x.esc ? { id: x.esc[0], t: x.esc[1], at: G.time + x.esc[2] } : null;
      G.bodies = (x.bd || []).map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: a[4], look: cqLookOf(c), name: c.name, nk: 1 } : null; }).filter(Boolean);
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // buio: la mia torcia (il Minotauro vede piu' lontano, senza torcia), le torce dei compagni, le torce dei muri
    night(G) {
      const me = G.me; if (!G.fc) return null;
      if (!me.alive) return { a: 0.45, r: 7, lights: [], see: () => true };
      const lights = [], r = me.mino ? VIS_M : VIS_E;
      lights.push([cq.x, cq.y, r, me.mino ? 0.75 : 0.95]);
      for (const [x, y] of MP().torches) if (Math.abs(x - cq.x) < 13 && Math.abs(y - cq.y) < 13) lights.push([x + 0.5, y + 0.5, LIT_R, 0.8]);
      MP().frag.forEach((f, i) => { if (here(G, i) && Math.abs(f.x - cq.x) < 13 && Math.abs(f.y - cq.y) < 13) lights.push([f.x, f.y, 1.7, 0.6]); });
      const mates = [];
      if (!me.mino) for (const c of G.chars) if (c !== me && c.alive && !c.out && !c.mino && c.t === me.t) { mates.push(c); if (Math.hypot(c.x - cq.x, c.y - cq.y) < 16) lights.push([c.x, c.y, 2.8, 0.85]); }
      return { a: me.mino ? 0.86 : 0.93, r, lights, see: (x, y) => { const d = Math.hypot(x - cq.x, y - cq.y); return d < r + 0.3 || (d < TORCH_SEE && litAt(x, y)) || mates.some(c => c.x === x && c.y === y); } };
    },
    deco(g, c, X, Y, TW, G) {
      if (!c.mino && c.t != null && c.t >= 0 && G.nt > 1) { g.strokeStyle = TEAMS[c.t].c; g.lineWidth = 2.5; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(X, Y, TW * 0.34, TW * 0.17, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }
      if (c.hd) { g.font = Math.round(TW * 0.42) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏺', X + TW * 0.38, Y - TW * 1.2); }
      if (c.op) { const k = Math.min(1, (G.time - c.op.t0) / COPY_T); g.strokeStyle = '#f2c84a'; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 1.9, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
      if (!c.mino && c.alive && slowOn(G, c)) { const t = performance.now() / 300; g.font = Math.round(TW * 0.36) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💫', X + Math.cos(t) * TW * 0.3, Y - TW * 1.75 + Math.sin(t) * 3); }
    },
    over(g, G, sx, sy, TW) {
      if (!G.fc) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, now = performance.now() / 1000, MN = this.night(G), ghost = !me.alive;
      const vis = (x, y) => ghost || (MN ? MN.see(x, y) : true);
      const near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r;
      const ZU = TW * 0.575;
      // caselle che stanno per cambiare: polvere e contorno che pulsa
      if (G.pend && G.pc) {
        const a = 0.35 + 0.3 * Math.sin(now * 12);
        for (const [x, y, cl] of G.pc) {
          if (!near(x, y, 12) || !vis(x + 0.5, y + 0.5)) continue;
          const z = cl ? 0.02 : 1.3, Q = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([u, v]) => [sx(u, v) + (Math.random() - 0.5) * 2, sy(u, v) - z * ZU]);
          g.beginPath(); Q.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.strokeStyle = cl ? 'rgba(255,170,60,' + a + ')' : 'rgba(255,230,180,' + a + ')'; g.lineWidth = 2; g.stroke();
          g.fillStyle = 'rgba(170,150,120,.5)'; for (let i = 0; i < 3; i++) { const u = (Math.sin(now * 7 + x * 3 + i * 2) + 1) / 2, v = (Math.cos(now * 5 + y * 2 + i) + 1) / 2; g.beginPath(); g.arc(sx(x + u, y + v), sy(x + u, y + v) - z * ZU - ((now * 30 + i * 10) % 14), 1.6, 0, 7); g.fill(); }
        }
      }
      // impronte (solo il Minotauro le vede): orme che brillano e si spengono
      if (me.mino && me.alive) for (const f of G.fp) {
        if (!near(f[0], f[1], 13)) continue;
        const k = 1 - (G.time - f[3]) / PRINT_T; if (k <= 0) continue;
        const ox = -Math.sin(f[2]) * 0.14 * f[5], oy = Math.cos(f[2]) * 0.14 * f[5], X = sx(f[0] + ox, f[1] + oy), Y = sy(f[0] + ox, f[1] + oy), a = Math.atan2(sy(f[0] + Math.cos(f[2]), f[1] + Math.sin(f[2])) - sy(f[0], f[1]), sx(f[0] + Math.cos(f[2]), f[1] + Math.sin(f[2])) - sx(f[0], f[1]));
        g.fillStyle = 'rgba(255,110,50,' + (0.75 * k) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 0.11, TW * 0.055, a, 0, 7); g.fill();
      }
      // cristalli: galleggiano sopra la colonnina, girano piano e brillano (quelli presi non ci sono piu')
      MP().frag.forEach((f, i) => {
        if (!here(G, i) || !near(f.x, f.y, 14) || (!vis(f.x, f.y) && !(me.mino && near(f.x, f.y, 9)))) return;
        crystal(g, sx(f.x, f.y), sy(f.x, f.y) - TW * (1.45 + 0.08 * Math.sin(now * 2 + i)), TW, now + i);
      });
      // occhi rossi del Minotauro nel buio (quando non lo vedo)
      const M = mino(G);
      if (M && M !== me && M.alive && !ghost && !(MN && MN.see(M.x, M.y)) && Math.hypot(M.x - cq.x, M.y - cq.y) < 9) {
        const X = sx(M.x, M.y), Y = sy(M.x, M.y) - TW * 2.05, al = 0.55 + 0.45 * Math.sin(now * 3);
        g.fillStyle = 'rgba(255,50,30,' + al + ')'; g.beginPath(); g.ellipse(X - 5, Y, 3.5, 2.2, 0, 0, 7); g.ellipse(X + 6, Y, 3.5, 2.2, 0, 0, 7); g.fill();
      }
      // uscita: con la mappa completa un fascio di luce e la freccia sul bordo
      const ex = MP().exit;
      if (!me.mino && me.alive && full(G, me.t)) {
        const X = sx(ex.x + ex.dx * 0.3, ex.y + ex.dy * 0.3), Y = sy(ex.x + ex.dx * 0.3, ex.y + ex.dy * 0.3);
        const gr = g.createLinearGradient(X, Y - TW * 5, X, Y); gr.addColorStop(0, 'rgba(255,240,170,0)'); gr.addColorStop(1, 'rgba(255,240,170,' + (0.45 + 0.15 * Math.sin(now * 3)) + ')');
        g.fillStyle = gr; g.fillRect(X - TW * 0.6, Y - TW * 5, TW * 1.2, TW * 5);
        SQ.edge(g, X, Y - TW, W2, H2, '🚪', TT(G)[me.t].c);
      }
      // compagni lontani: freccia sul bordo (si vedono anche sulla mappina)
      // mappina in alto a destra
      minimap(g, G, W2);
    }
  };
  // ---- mappina vista dall'alto (girata come lo schermo): si scopre esplorando, con i muri come sono ADESSO (dopo un cambio si aggiorna da sola).
  // G.ex = caselle viste dalla mia squadra (calcolate sul mio telefono dalle posizioni: niente rete). Il Minotauro e i fantasmi la vedono tutta.
  function explore(G) {
    const me = G.me; if (me.mino || !me.alive) return;
    let nw = 0; const ex = G.ex, r = EXPLORE, R2 = Math.ceil(r);
    for (const c of G.chars) {
      if (c.mino || !c.alive || c.out || c.t !== me.t) continue;
      const q = P(c), cx = Math.floor(q.x), cy = Math.floor(q.y);
      for (let y = cy - R2; y <= cy + R2; y++) for (let x = cx - R2; x <= cx + R2; x++) {
        if (x < 0 || y < 0 || x >= W || y >= W || ex[y * W + x] || Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) > r) continue;
        // si vede la casella se nessun muro sta in mezzo (il muro stesso si vede)
        const n = Math.ceil(Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) * 3); let ok = true;
        for (let k = 1; k < n && ok; k++) { const t = k / n, ax = Math.floor(q.x + (x + 0.5 - q.x) * t), ay = Math.floor(q.y + (y + 0.5 - q.y) * t); if ((ax !== x || ay !== y) && isWall(ax, ay)) ok = false; }
        if (ok) { ex[y * W + x] = 1; nw++; }
      }
    }
    if (nw) G.exV++;
  }
  function minimap(g, G, W2) {
    const me = G.me, all = me.mino || !me.alive, mw = 148, x0 = W2 - mw - 6, y0 = 122, dpr = cq.dpr || 1, s = mw / W;
    let C = G.mm; const key = G.wv + '|' + all + '|' + G.exV + '|' + dpr + '|' + G.SdV + '|' + (G.rz ? G.rz.length : 0);
    if (!C || C.key !== key) {
      if (!C) { C = G.mm = { c: document.createElement('canvas') }; }
      C.key = key; C.c.width = Math.round(mw * dpr); C.c.height = Math.round(mw * dpr);
      const k = C.c.getContext('2d', CQ_CPU); k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, C.c.width, C.c.height);
      k.setTransform(s / 2 * dpr, s / 2 * dpr, -s / 2 * dpr, s / 2 * dpr, mw / 2 * dpr, 0);
      // una casella = un pixel di un'immagine piccola, poi incollata girata (molto piu' leggero di una forma per casella)
      const sm = C.s || (C.s = document.createElement('canvas')); sm.width = W; sm.height = W;
      const sg = sm.getContext('2d', CQ_CPU), im = sg.createImageData(W, W), d = im.data, ex = G.ex;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, o = cqSolid[y][x], c = !all && !ex[y * W + x] ? [8, 8, 12, 150] : o && (o.prop === 'mw' || o.prop === 'mwt') ? [70, 60, 46, 255] : o && o.prop === 'exitd' ? [224, 184, 74, 255] : [170, 155, 124, 255];
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
      }
      sg.putImageData(im, 0, 0); k.imageSmoothingEnabled = false; k.drawImage(sm, 0, 0);
    }
    g.drawImage(C.c, x0, y0, mw, mw);
    const P2 = (x, y) => [x0 + (x - y) * s / 2 + mw / 2, y0 + (x + y) * s / 2];
    const dot = (x, y, r, col) => { const [X, Y] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); };
    // cristalli: quelli che la squadra ha visto (il Minotauro li conosce tutti)
    const tw = 0.6 + 0.4 * Math.sin(performance.now() / 250);
    MP().frag.forEach((f, i) => { if (!here(G, i) || (!all && !G.ex[Math.floor(f.y) * W + Math.floor(f.x)])) return; dot(f.x, f.y, 2.6, 'rgba(110,230,255,' + tw + ')'); });
    // l'uscita: compare con i cristalli (il Minotauro la scopre quando una squadra li ha tutti)
    if (!me.alive || (me.mino ? Array.from({ length: G.nt }, (_, t) => t).some(t => full(G, t)) : full(G, me.t))) { const e = MP().exit; dot(e.x, e.y, 3.4, (performance.now() / 400 | 0) % 2 ? '#7be0a0' : '#2f8a5a'); }
    if (!me.mino && me.alive) for (const c of G.chars) if (c !== me && c.alive && !c.out && !c.mino && c.t === me.t) dot(c.x, c.y, 2.2, TT(G)[c.t].l);
    // io: punto con la direzione
    const [X, Y] = P2(cq.x, cq.y); g.fillStyle = me.mino ? '#ff5a3a' : '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 3, 0, 7); g.fill(); g.stroke();
  }
  // cristallo: ottaedro allungato azzurro-viola che gira (larghezza delle facce che cambia), alone e scintille
  function crystal(g, X, Y, TW, t) {
    const u = TW / 34 * 1.45, a = Math.sin(t * 1.3), w1 = 7 * u * (0.55 + 0.45 * Math.abs(a)), w2 = 7 * u - w1, h = 13 * u;
    const gl = g.createRadialGradient(X, Y, 0, X, Y, 24 * u); gl.addColorStop(0, 'rgba(120,230,255,.45)'); gl.addColorStop(1, 'rgba(120,230,255,0)'); g.fillStyle = gl; g.fillRect(X - 24 * u, Y - 24 * u, 48 * u, 48 * u);
    const face = (x0, x1, top, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(X, top ? Y - h : Y + h * 0.8); g.lineTo(X + x0, Y); g.lineTo(X + x1, Y); g.closePath(); g.fill(); };
    const sd = a > 0 ? 1 : -1;
    face(-7 * u, -7 * u + w1 * 2 * (sd > 0 ? 1 : 0.4), 1, '#8fe8ff'); face(-7 * u + w1 * 2 * (sd > 0 ? 1 : 0.4), 7 * u, 1, '#5ab8f0');
    face(-7 * u, -7 * u + w1 * 2 * (sd > 0 ? 1 : 0.4), 0, '#6a7ee8'); face(-7 * u + w1 * 2 * (sd > 0 ? 1 : 0.4), 7 * u, 0, '#4a58c8');
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y - h); g.lineTo(X - 7 * u, Y); g.lineTo(X, Y + h * 0.8); g.stroke();
    for (let k = 0; k < 3; k++) { const ph = (t * 0.9 + k / 3) % 1, sx = X + Math.sin(k * 2.1 + t) * 9 * u, sy = Y - ph * 18 * u; g.fillStyle = 'rgba(220,250,255,' + (1 - ph) + ')'; g.fillRect(sx - 1, sy - 1, 2, 2); }
    void w2;
  }

  // ---- pulsante del gesso (✏️) sopra il pulsante grande, solo agli esploratori vivi; tasto G sul PC ----
  const cb = document.getElementById('mnChalk') || (() => {
    const b = document.createElement('button'); b.id = 'mnChalk'; b.type = 'button'; b.textContent = '✏️'; b.hidden = true; b.title = 'Segno col gesso (G)';
    b.style.cssText = 'position:absolute;right:30px;bottom:240px;width:62px;height:62px;border-radius:50%;border:0;font-size:26px;background:#ece4cc;color:#222;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer';
    (document.getElementById('ciack') || document.body).appendChild(b); return b;
  })();
  cb.onclick = e => { e.stopPropagation(); chalk(); };
  if (!window.mnKeys) { window.mnKeys = 1; document.addEventListener('keydown', e => { if ((e.key === 'g' || e.key === 'G') && !e.repeat && cq.g && cq.g.mode === 'minotauro' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) chalk(); }); }
  (function loop() {
    requestAnimationFrame(loop);
    const G = cq.g, on = !!(cq.on && G && G.mode === 'minotauro' && G.fc && G.phase === 'play' && G.pre <= 0 && G.me.alive && !G.me.mino && !G.me.out && $('#cqTask').hidden);
    if (cb.hidden === on) cb.hidden = !on;
    if (!(G && G.mode === 'minotauro' && G.phase === 'play')) { const cv = document.getElementById('cqCanvas'); if (cv && cv.style.transform) cv.style.transform = ''; }
  })();
});
