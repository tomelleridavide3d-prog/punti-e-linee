// Caccia al mammut (cooperativo). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Una tribu' nella prateria deve abbattere un mammut furbo e portare la carne al fuoco del campo prima che migri (dopo 2-4 notti).
// IL MAMMUT non ha percorsi fissi: ha BISOGNI (fame, sete, sonno) e sceglie ogni volta tra tanti posti (pascoli, acqua, posti riparati).
// Lascia TRACCE che dicono come sta (impronte che sbiadiscono, fangose dopo aver bevuto, sterco fumante, erba brucata, rami spezzati,
// buche per dormire calde, sangue quando e' ferito) e ogni tanto BARRISCE da lontano. Vede chi gli si avvicina e FIUTA chi arriva col VENTO alle spalle.
// Spaventato scappa e diventa sospettoso; ferito o affrontato da vicino CARICA (chi colpisce resta a terra). Di notte dorme nella sua buca.
// CACCIA: lance da lanciare e raccogliere, FOSSA scavata in due (ci cade dentro e resta bloccato), torce e urla che lo spingono via.
// SOPRAVVIVENZA: legna per il fuoco (di notte gli SCIACALLI attaccano chi e' fuori dalla luce e rubano dal campo se il fuoco e' basso),
// conigli da catturare: al tramonto ognuno ne mangia uno, chi resta senza il giorno dopo e' piu' lento.
// Chi viene colpito resta A TERRA 30 s: un compagno vicino lo rialza; se nessuno arriva diventa fantasma.
// Abbattuto il mammut, si macella: 6 pezzi di carne, uno a testa (pesanti), da portare al fuoco: ne bastano 4. Gli sciacalli li sentono.
CQ_WAIT.mammut = cqLib('mappe', 'indizi').then(L => {
  const MG = L.mappe, IZ = L.indizi;
  const N = 88;
  // giro di un giorno: giorno, tramonto, notte, alba (secondi)
  const DAY = 180, DUSK = 105, NIGHT = 120, DAWN = 170;
  const DOWN_T = 30, REV_T = 3, CHOP_T = 2, DIG_T = 8, BUTCH_T = 4, REGROW = 150, TRAP_T = 15, TORCH_T = 70, SHOUT_CD = 6;
  const THROW_R = 5.5, SPEARS = 2, SPEAR_MAX = 3, LOGS_MAX = 3, LOG_FUEL = 22, MEAT_N = 6, MEAT_NEED = 4, RAB_MAX = 2;
  const VIS_D = 6.5, VIS_N = 4, VIS_S = 2.2, SMELL = 12, PUSH_R = 4, SHOUT_R = 7, CH_R = 2.8;
  const SEE_N = 3.0, TORCH_L = 5.2;   // fin dove si vede di notte: da soli, con la torcia
  const mmss = t => Math.floor(Math.max(0, t) / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const downed = c => !!c.dn;
  const active = G => G.chars.filter(c => c.alive && !c.dn);
  const cyc = G => ((G.time % DAY) + DAY) % DAY;
  const dayN = G => Math.floor(Math.max(0, G.time) / DAY) + 1;
  const dark = G => { const t = cyc(G); return t < DUSK ? 0 : t < NIGHT ? (t - DUSK) / (NIGHT - DUSK) : t < DAWN ? 1 : 1 - (t - DAWN) / (DAY - DAWN); };
  const isNight = G => { const t = cyc(G); return t >= NIGHT - 4 && t < DAWN + 3; };
  const endT = G => ((G.opt.nights || 3) - 1) * DAY + DAWN;
  const fireC = () => ({ x: MP().camp.x + 0.5, y: MP().camp.y + 0.5 });
  const fireR = G => G.fuel > 0 ? 3.2 + 2.8 * Math.min(1, G.fuel / 60) : 0;
  const inFire = (G, x, y) => G.fuel > 0 && Math.hypot(x - fireC().x, y - fireC().y) < fireR(G) * 0.92;
  const atCamp = (x, y, r = 3) => Math.hypot(x - fireC().x, y - fireC().y) < r;
  const torchOn = (G, c) => (c.tor || 0) > G.time;
  const ARW = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const arrowOf = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) / 2; return ARW[(Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) + 8) % 8]; };
  const thud = (v, f) => { try { beep(f || 160, 0.08, 0.03 * (v || 1)); } catch {} };
  const nm = (G, c) => c === G.me ? 'Tu' : c.name;

  // ======================= MAPPA: la prateria (col seme) =======================
  // ter[y][x]: 1 prato, 2 pascolo (erba alta, il mammut ci mangia), 3 sottobosco, 4 fango (riva), 5 guado (acqua bassa), 6 acqua, 7 campo
  function mapPrateria(seed) { let M = null; for (let k = 0; k < 10 && !(M && M.ok); k++) M = build((seed | 0) * 13 + k); return M; }
  function build(seed) {
    const rnd = MG.rnd(seed), W = N, H = N;
    const ter = [], hz = []; for (let y = 0; y < H; y++) { ter.push(new Uint8Array(W).fill(1)); hz.push(new Uint8Array(W)); }
    const inside = (x, y, m = 0) => x >= m && y >= m && x < W - m && y < H - m;
    const camp = { x: Math.floor(W / 2 + (rnd() - 0.5) * 18), y: Math.floor(H / 2 + (rnd() - 0.5) * 18) };
    const dC = (x, y) => Math.hypot(x - camp.x, y - camp.y);
    // ---- fiume che serpeggia da bordo a bordo, lontano dal campo; tre guadi ----
    const vert = rnd() < 0.5, side = rnd() < 0.5 ? -1 : 1, cc = vert ? camp.x : camp.y;
    let base = cc + side * (15 + Math.floor(rnd() * 8)); if (base < 9 || base > N - 10) base = cc - side * (15 + Math.floor(rnd() * 8));
    base = Math.max(9, Math.min(N - 10, base));
    const ph1 = rnd() * 7, ph2 = rnd() * 7, A1 = 3 + rnd() * 3, A2 = 1 + rnd() * 2;
    const riv = [];
    for (let v = 0; v < N; v++) { const u = Math.round(base + A1 * Math.sin(v * 0.11 + ph1) + A2 * Math.sin(v * 0.27 + ph2)), w = 2 + (Math.sin(v * 0.2 + ph2) > 0.6 ? 1 : 0); riv.push([u, w]); }
    const setT = (x, y, t) => { if (inside(x, y)) ter[y][x] = t; };
    riv.forEach(([u, w], v) => { for (let i = 0; i < w; i++) vert ? setT(u + i, v, 6) : setT(v, u + i, 6); });
    riv.forEach(([u, w], v) => { for (const i of [-1, w]) { const x = vert ? u + i : v, y = vert ? v : u + i; if (inside(x, y) && ter[y][x] !== 6) ter[y][x] = 4; } });
    const fords = []; for (const f of [0.2, 0.5, 0.8]) { const v = Math.floor(N * f + (rnd() - 0.5) * 8); fords.push(v); for (const vv of [v, v + 1]) { const [u, w] = riv[vv]; for (let i = -1; i <= w; i++) { const x = vert ? u + i : vv, y = vert ? vv : u + i; if (inside(x, y)) ter[y][x] = i < 0 || i >= w ? 4 : 5; } } }
    // ---- stagni ----
    const ponds = [];
    for (let i = 0; i < 300 && ponds.length < 3; i++) {
      const x = 8 + Math.floor(rnd() * (N - 16)), y = 8 + Math.floor(rnd() * (N - 16)), r = 1.6 + rnd() * 1.1;
      if (dC(x, y) < 12 || ponds.some(p => Math.hypot(p.x - x, p.y - y) < 18)) continue;
      let near = false; for (let yy = y - 6; yy <= y + 6 && !near; yy++) for (let xx = x - 6; xx <= x + 6; xx++) if (inside(xx, yy) && ter[yy][xx] >= 4) { near = true; break; }
      if (near) continue;
      const wb = MG.wobble(rnd, 2, 0.18);
      for (let yy = y - 5; yy <= y + 5; yy++) for (let xx = x - 5; xx <= x + 5; xx++) { if (!inside(xx, yy, 1)) continue; const d = Math.hypot(xx - x, yy - y) / wb(Math.atan2(yy - y, xx - x)); if (d < r) ter[yy][xx] = 6; else if (d < r + 1.2 && ter[yy][xx] !== 6) ter[yy][xx] = 4; }
      ponds.push({ x: x + 0.5, y: y + 0.5 });
    }
    // ---- colline leggere (al massimo 2 gradini) ----
    const hills = [];
    for (let i = 0; i < 200 && hills.length < 4; i++) {
      const x = 6 + Math.floor(rnd() * (N - 12)), y = 6 + Math.floor(rnd() * (N - 12)), R = 5 + rnd() * 4;
      if (dC(x, y) < 11 + R || hills.some(h => Math.hypot(h.x - x, h.y - y) < 16)) continue;
      hills.push({ x, y, R });
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const d = Math.hypot(xx - x, yy - y); if (d > R * 1.7) continue; const L2 = Math.round(2.4 * Math.exp(-Math.pow(d / R, 2)) - 0.25); if (L2 > hz[yy][xx]) hz[yy][xx] = L2; }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter[y][x] >= 4) hz[y][x] = 0;
    for (let k = 0; k < 3; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 9; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(x + dx, y + dy)) m = Math.min(m, hz[y + dy][x + dx]); if (hz[y][x] > m + 1) hz[y][x] = m + 1; }
    // ---- pascoli (erba alta) e boschetti ----
    const meadows = [], groves = [];
    for (let i = 0; i < 400 && meadows.length < 7; i++) {
      const x = 5 + Math.floor(rnd() * (N - 10)), y = 5 + Math.floor(rnd() * (N - 10)), r = 3.5 + rnd() * 2.5;
      if (dC(x, y) < 10 || ter[y][x] !== 1 || meadows.some(m => Math.hypot(m.x - x, m.y - y) < 15)) continue;
      const wb = MG.wobble(rnd, 3, 0.2); meadows.push({ x, y, r });
      for (let yy = y - 8; yy <= y + 8; yy++) for (let xx = x - 8; xx <= x + 8; xx++) if (inside(xx, yy) && ter[yy][xx] === 1 && Math.hypot(xx - x, yy - y) < r * wb(Math.atan2(yy - y, xx - x))) ter[yy][xx] = 2;
    }
    for (let i = 0; i < 400 && groves.length < 7; i++) {
      const x = 5 + Math.floor(rnd() * (N - 10)), y = 5 + Math.floor(rnd() * (N - 10)), r = 3.5 + rnd() * 3;
      if (dC(x, y) < 9 || ter[y][x] !== 1 || groves.some(m => Math.hypot(m.x - x, m.y - y) < 14) || meadows.some(m => Math.hypot(m.x - x, m.y - y) < 10)) continue;
      const wb = MG.wobble(rnd, 3, 0.22); groves.push({ x, y, r });
      for (let yy = y - 9; yy <= y + 9; yy++) for (let xx = x - 9; xx <= x + 9; xx++) if (inside(xx, yy) && ter[yy][xx] === 1 && Math.hypot(xx - x, yy - y) < r * wb(Math.atan2(yy - y, xx - x))) ter[yy][xx] = 3;
    }
    // ---- campo: terra battuta, fuoco al centro ----
    for (let y = camp.y - 5; y <= camp.y + 5; y++) for (let x = camp.x - 5; x <= camp.x + 5; x++) if (inside(x, y) && Math.hypot(x - camp.x, y - camp.y) < 4.6) { ter[y][x] = 7; hz[y][x] = 0; }
    for (let k = 0; k < 3; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 9; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(x + dx, y + dy)) m = Math.min(m, hz[y + dy][x + dx]); if (hz[y][x] > m + 1) hz[y][x] = m + 1; }
    const props = [], taken = new Set(), K = (x, y) => x + ',' + y, pp = (t, x, y, o) => { props.push([t, x, y, o]); taken.add(K(x, y)); };
    const free = (x, y) => inside(x, y) && ter[y][x] !== 6 && !taken.has(K(x, y));
    const step = (ax, ay, bx, by) => Math.abs(hz[by][bx] - hz[ay][ax]) <= 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter[y][x] === 6) pp('wat', x, y);
    // bordo: macchia fitta di rovi (non si passa)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && !taken.has(K(x, y))) pp('thick', x, y);
    const C2 = camp;
    pp('mfire', C2.x, C2.y);
    const campP = [['hide', -3, -2, 0], ['hide', 2, -3, 1], ['hide', -3, 2, 2], ['rack', 3, 1], ['dry', 1, 3], ['skull', -1, -4], ['stash', 3, -1]];
    for (const [t, dx, dy, v] of campP) pp(t, C2.x + dx, C2.y + dy, { v });
    // ---- alberi (boschetti fitti, qualcuno isolato nella prateria), rocce, cespugli ----
    const decals = [], deco = [], trees = [];
    const nearT = (x, y, r) => trees.some(t => Math.abs(t.x - x) < r && Math.abs(t.y - y) < r && Math.hypot(t.x - x, t.y - y) < r);
    const tree = (x, y, k) => { const o = { x, y, k, v: Math.floor(rnd() * 3), h: 1.22 + rnd() * 0.22, a: 1 }; trees.push(o); pp('tree', x, y, o); };
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (!free(x, y) || dC(x, y) < 6) continue;
      const t = ter[y][x], r = rnd();
      if (t === 3) { if (r < 0.3 && !nearT(x, y, 2.1)) { tree(x, y, rnd() < 0.7 ? 'oak' : 'pine'); continue; } if (r < 0.36) deco.push([x, y, 'fern']); else if (r < 0.45) deco.push([x, y, 'mush']); continue; }
      if (t === 1) { if (r < 0.008 && !nearT(x, y, 6)) { tree(x, y, 'oak'); continue; } if (r < 0.06) deco.push([x, y, 'flower']); else if (r < 0.2) deco.push([x, y, 'tuft']); else if (r < 0.215) deco.push([x, y, 'pebble']); continue; }
      if (t === 2) { if (r < 0.55) deco.push([x, y, 'tgrass']); else if (r < 0.62) deco.push([x, y, 'flower']); continue; }
      if (t === 4) { if (r < 0.28) deco.push([x, y, 'reed']); continue; }
    }
    // rocce: gruppi di massi (posti riparati per dormire, anche per il mammut)
    const rocks = [];
    for (let i = 0; i < 300 && rocks.length < 5; i++) {
      const x = 4 + Math.floor(rnd() * (N - 8)), y = 4 + Math.floor(rnd() * (N - 8));
      if (dC(x, y) < 10 || ter[y][x] !== 1 || rocks.some(r => Math.hypot(r.x - x, r.y - y) < 16)) continue;
      const cells = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [-1, 1]].filter(() => rnd() < 0.75);
      if (cells.length < 2 || !cells.every(([dx, dy]) => free(x + dx, y + dy) && ter[y + dy][x + dx] === 1)) continue;
      cells.forEach(([dx, dy]) => pp('boulder', x + dx, y + dy)); rocks.push({ x, y });
    }
    // tane dei conigli
    const burrows = [];
    for (let i = 0; i < 500 && burrows.length < 9; i++) {
      const x = 3 + Math.floor(rnd() * (N - 6)), y = 3 + Math.floor(rnd() * (N - 6));
      if (!free(x, y) || dC(x, y) < 8 || (ter[y][x] !== 1 && ter[y][x] !== 2) || burrows.some(b => Math.hypot(b.x - x, b.y - y) < 10)) continue;
      burrows.push({ x: x + 0.5, y: y + 0.5 }); deco.push([x, y, 'burrow']);
    }
    // ---- raggiungibile dal campo (un gradino alla volta) ----
    const nf = (x, y) => { for (const [dx, dy] of [[0, 2], [2, 0], [1, 1], [-2, 0], [0, -2]]) if (free(x + dx, y + dy)) return [x + dx, y + dy]; return [x, y + 2]; };
    const seen = MG.flood(W, H, free, ...nf(C2.x, C2.y), step), ok = (x, y) => inside(x, y) && !!seen[y * W + x];
    // posti del mammut: dove mangia (pascoli), beve (riva o guado accanto all'acqua), dorme (bordo dei boschetti, tra le rocce)
    const eat = meadows.map(m => [Math.floor(m.x), Math.floor(m.y)]).filter(([x, y]) => ok(x, y));
    const wetN = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && ter[y + dy][x + dx] >= 5);
    const drink = MG.scatter(rnd, 9, 3000, r => { const x = 2 + Math.floor(r() * (N - 4)), y = 2 + Math.floor(r() * (N - 4)); return free(x, y) && ok(x, y) && (ter[y][x] === 4 || ter[y][x] === 5) && wetN(x, y) && dC(x, y) > 9 ? [x, y] : null; }, 11);
    const sleep = MG.scatter(rnd, 7, 4000, r => {
      const x = 3 + Math.floor(r() * (N - 6)), y = 3 + Math.floor(r() * (N - 6)); if (!free(x, y) || !ok(x, y) || dC(x, y) < 12 || ter[y][x] > 3) return null;
      let tr = 0; for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const o = taken.has(K(xx, yy)) && props.find(p => p[1] === xx && p[2] === yy); if (o && (o[0] === 'tree' || o[0] === 'boulder')) tr++; }
      return tr >= 2 ? [x, y] : null;
    }, 12);
    const okAll = eat.length >= 4 && drink.length >= 4 && sleep.length >= 3 && burrows.filter(b => ok(Math.floor(b.x), Math.floor(b.y))).length >= 4 && trees.length >= 40;
    const deco2 = deco.filter(([x, y]) => !taken.has(K(x, y)));
    const ring = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = Math.round(C2.x + Math.cos(a) * 2.2), y = Math.round(C2.y + Math.sin(a) * 2.2); if (free(x, y) && !ring.some(r => r[0] === x && r[1] === y)) ring.push([x, y]); }
    const rooms = [{ n: 'Prateria', x: 0, y: 0, w: W, h: H, c: ['#7fa54a', '#7aa046'], wc: 'none', k: 'prat', nl: 1, nm: 1 }];
    return { ok: okAll, w: W, h: H, rooms, doors: [], decals, props, holes: [], trees, bg: () => '#2f4a26', deco: deco2, tasks: [], hall: 0, cams: [], vending: [], ring,
      button: { x: -10, y: -10 }, sabs: {}, inn: { Prateria: 'nella prateria' }, help: '', btnTxt: '', sabTxt: '', draw, floor: FLOOR, drawWall: () => {}, hz, hb: 0.55, hzSide, decoDraw, ground,
      ter, camp: C2, places: { eat, drink, sleep }, burrows: burrows.filter(b => ok(Math.floor(b.x), Math.floor(b.y))), ponds, vert, riv, fords, seed };
  }

  // ---- disegno della mappa (K = attrezzi di cqTools) ----
  const TERC = { 1: ['#86a84e', '#81a24a'], 2: ['#6f9c40', '#6a963d'], 3: ['#5a7a3c', '#567539'], 4: ['#86735a', '#806e56'], 5: ['#7fd0e6', '#78c9df'], 6: ['#4aa8e6', '#47a2df'], 7: ['#a08a64', '#9b8560'] };
  const FLOOR = {
    prat(K, x, y) {
      const t = CQ_MAP.ter[y][x], P2 = (u, v) => K.S(x + u, y + v, 0), col = TERC[t] || TERC[1];
      K.poly([P2(0, 0), P2(1, 0), P2(1, 1), P2(0, 1)], col[(x + y) % 2]);
      if (K.TW < 40) return;
      if (t === 6 || t === 5) { if (K.hsh(x, y, 70) < 0.4) { const u = 0.1 + 0.6 * K.hsh(x, y, 71), v = 0.15 + 0.7 * K.hsh(x, y, 72); K.poly([P2(u, v), P2(u + 0.3, v), P2(u + 0.3, v + 0.05), P2(u, v + 0.05)], t === 5 ? '#c4f2ff' : '#8cd4ff'); } if (t === 5) K.speck(x, y, 4, ['rgba(140,120,90,.35)'], K.TW / 18); return; }
      if (t === 4) { K.speck(x, y, 6, ['rgba(60,45,30,.35)', 'rgba(160,140,110,.3)'], K.TW / 20); return; }
      if (t === 7) { K.speck(x, y, 6, ['rgba(70,55,35,.3)', 'rgba(190,170,130,.3)'], K.TW / 22); return; }
      K.speck(x, y, 5, t === 3 ? ['rgba(30,50,20,.35)', 'rgba(120,90,50,.25)'] : ['rgba(200,210,110,.3)', 'rgba(40,70,20,.22)'], K.TW / 22);
      const Ls = []; for (let i = 0; i < 3; i++) { const u = 0.15 + 0.7 * K.hsh(x, y, 20 + i), v = 0.15 + 0.7 * K.hsh(x, y, 30 + i); Ls.push([K.S(x + u, y + v, 0), K.S(x + u + 0.04, y + v, 0.12 + 0.1 * K.hsh(x, y, 40 + i))]); }
      K.strokes(Ls, t === 2 ? 'rgba(150,200,90,.6)' : t === 3 ? 'rgba(90,130,60,.5)' : 'rgba(200,200,110,.55)');
    }
  };
  // le tracce stanno nel disegno del terreno (sotto alberi, mammut e persone): ogni cella disegna le sue, col loro stato (fresca, tiepida, vecchia)
  const FLOOR0 = FLOOR.prat;
  // in pianura si disegnano tutte insieme dopo i pavimenti (ground); sulle colline con la loro casella (che si alza)
  const groundTr = (K, t, x, y) => { const G = cq.g, sg = stageOf(G, t); if (sg < 0) return; const [X, Y] = K.S(t.x, t.y, 0); drawTrack(K.g, t, X, Y, K.TW, STAGE_AGE[sg] * (TR_LIFE[t.k] || 200) / 200, 0, true); G.trD.set(t.id, [sg, x, y]); };
  const trOn = () => { const G = cq.g; if (!G || G.mode !== 'mammut' || !G.tr) return null; if (!G.trD) G.trD = new Map(); return G; };
  FLOOR.prat = (K, x, y) => {
    FLOOR0(K, x, y);
    const G = trOn(); if (!G || K.TW < 20 || !cqHc(x, y)) return;
    const L2 = cellTracks(G).get(x + ',' + y); if (L2) for (const t of L2) groundTr(K, t, x, y);
  };
  function ground(K) {
    const G = trOn(); if (!G || K.TW < 20) return;
    for (const t of G.tr) { const x = Math.floor(t.x), y = Math.floor(t.y); if (!cqHc(x, y)) groundTr(K, t, x, y); }
  }
  function hzSide(x, y, i, z) { if (i === z - 1) return CQ_MAP.ter[y][x] === 2 ? '#5f8a38' : '#76984a'; return i % 2 ? '#8a7656' : '#7f6c4e'; }
  function decoDraw(K, t, x, y) {
    const { bx, dot, hsh, S, strokes } = K;
    if (t === 'tgrass') { const Ls = []; for (let i = 0; i < 9; i++) { const u = 0.1 + 0.8 * hsh(x, y, 50 + i), v = 0.1 + 0.8 * hsh(x, y, 60 + i), h = 0.3 + 0.35 * hsh(x, y, 70 + i); Ls.push([S(x + u, y + v, 0), S(x + u + 0.06 * (hsh(x, y, 80 + i) - 0.5), y + v, h)]); } strokes(Ls, 'rgba(170,200,90,.9)', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'reed') { const Ls = []; for (let i = 0; i < 5; i++) { const u = 0.2 + 0.6 * hsh(x, y, 50 + i), v = 0.2 + 0.6 * hsh(x, y, 60 + i); Ls.push([S(x + u, y + v, 0), S(x + u, y + v, 0.6 + 0.3 * hsh(x, y, 70 + i))]); } strokes(Ls, '#6e8a3a', Math.max(1.5, K.TW / 26)); for (let i = 0; i < 2; i++) dot(x + 0.3 + 0.4 * hsh(x, y, 90 + i), y + 0.4 + 0.3 * hsh(x, y, 95 + i), 0.75, 0.045, '#6a4a2a'); return; }
    if (t === 'flower') { for (let i = 0; i < 3; i++) dot(x + 0.2 + 0.6 * hsh(x, y, 40 + i), y + 0.2 + 0.6 * hsh(x, y, 45 + i), 0.08, 0.04, ['#f4e04a', '#f4f0e8', '#c870d0'][Math.floor(hsh(x, y, 49) * 3)]); return; }
    if (t === 'tuft') { const Ls = []; for (let i = 0; i < 4; i++) { const u = 0.4 + 0.2 * hsh(x, y, 50 + i), v = 0.4 + 0.2 * hsh(x, y, 60 + i); Ls.push([S(x + u, y + v, 0), S(x + u + 0.1 * (i - 1.5), y + v, 0.25)]); } strokes(Ls, 'rgba(110,150,60,.85)', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'fern') { const Ls = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; Ls.push([S(x + 0.5, y + 0.5, 0.05), S(x + 0.5 + Math.cos(a) * 0.3, y + 0.5 + Math.sin(a) * 0.3, 0.2)]); } strokes(Ls, '#3f7a36', Math.max(2, K.TW / 18)); return; }
    if (t === 'mush') { bx(x + 0.45, y + 0.45, x + 0.52, y + 0.52, 0, 0.12, '#e8e0cc'); dot(x + 0.48, y + 0.48, 0.15, 0.08, '#b8402a'); return; }
    if (t === 'pebble') { bx(x + 0.3, y + 0.35, x + 0.55, y + 0.55, 0, 0.1, '#9a958a'); bx(x + 0.6, y + 0.55, x + 0.72, y + 0.68, 0, 0.07, '#8a857a'); return; }
    if (t === 'burrow') { const [X, Y] = S(x + 0.5, y + 0.5, 0); K.g.fillStyle = '#6a5438'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.26, K.TW * 0.13, 0, 0, 7); K.g.fill(); K.g.fillStyle = '#22180e'; K.g.beginPath(); K.g.ellipse(X, Y + 1, K.TW * 0.15, K.TW * 0.075, 0, 0, 7); K.g.fill(); return; }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, line, S, poly, hsh, glow, qL } = K;
    switch (t) {
      case 'wat': break;   // l'acqua si disegna col pavimento; l'oggetto serve solo a non farci camminare
      case 'thick': for (let i = 0; i < 3; i++) { const u = 0.1 + 0.5 * hsh(x, y, 10 + i), v = 0.1 + 0.5 * hsh(x, y, 20 + i), h = 0.7 + 0.6 * hsh(x, y, 30 + i); bx(x + u - 0.05, y + v - 0.05, x + u + 0.45, y + v + 0.45, 0, h, ['#3a5a2a', '#44663a', '#355427'][i]); } break;
      case 'boulder': { const C3 = [['#8e8a82', '#a29e95'], ['#857f74', '#9a9488'], ['#938e84', '#aaa59a']][Math.floor(hsh(x, y, 77) * 3)], h = 0.7 + 0.6 * hsh(x, y, 78); bx(x + 0.05, y + 0.08, x + 0.95, y + 0.95, 0, h, C3[0]); bx(x + 0.2, y + 0.2, x + 0.8, y + 0.78, h, h + 0.35, C3[1]); if (hsh(x, y, 79) < 0.5) bx(x + 0.2, y + 0.2, x + 0.5, y + 0.45, h + 0.35, h + 0.4, '#5a8a44'); break; }
      case 'mfire': {   // cerchio di sassi e catasta; le fiamme si muovono e si disegnano sopra (over)
        for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10, u = 0.5 + Math.cos(a) * 0.4, v = 0.5 + Math.sin(a) * 0.4; bx(x + u - 0.08, y + v - 0.07, x + u + 0.08, y + v + 0.08, 0, 0.12 + 0.05 * (i % 2), '#8a8884'); }
        bx(x + 0.28, y + 0.44, x + 0.72, y + 0.56, 0, 0.12, '#5a3a24'); bx(x + 0.44, y + 0.28, x + 0.56, y + 0.72, 0.12, 0.22, '#6b4a2e'); dot(x + 0.5, y + 0.5, 0.05, 0.16, '#3a2a20'); break; }
      case 'hide': {   // tenda di pelli a cono con i pali che spuntano
        const cols = [['#b08a5a', '#9a7448'], ['#a07850', '#8a6440'], ['#c09a68', '#a8844e']][o.v || 0], top = S(x + 0.5, y + 0.5, 1.9);
        poly([S(x + 0.05, y + 0.95, 0), S(x + 0.95, y + 0.95, 0), top], cols[0]); poly([S(x + 0.95, y + 0.05, 0), S(x + 0.95, y + 0.95, 0), top], cols[1]);
        poly([S(x + 0.35, y + 0.95, 0), S(x + 0.62, y + 0.95, 0), S(x + 0.5, y + 0.95, 0.7)], '#2a1e14');
        for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.75]]) line(top, S(x + 0.5 + (u - 0.5) * 0.4, y + 0.5 + (v - 0.5) * 0.4, 2.35), '#6b4a2e', Math.max(2, K.TW / 18));
        K.strokes([[S(x + 0.2, y + 0.95, 0.4), S(x + 0.8, y + 0.95, 0.4)], [S(x + 0.95, y + 0.2, 0.4), S(x + 0.95, y + 0.8, 0.4)]], '#e8d0a0', 2); break; }
      case 'rack': {   // rastrelliera delle lance
        bx(x + 0.1, y + 0.4, x + 0.9, y + 0.5, 0.6, 0.7, '#6b4a2e'); bx(x + 0.12, y + 0.42, x + 0.2, y + 0.5, 0, 0.75, '#5a3e26'); bx(x + 0.8, y + 0.42, x + 0.88, y + 0.5, 0, 0.75, '#5a3e26');
        for (let i = 0; i < 4; i++) { const u = 0.22 + i * 0.18; line(S(x + u, y + 0.6, 0), S(x + u + 0.05, y + 0.45, 1.6), '#8a6a42', Math.max(2, K.TW / 20)); poly([S(x + u + 0.05, y + 0.45, 1.6), S(x + u + 0.02, y + 0.45, 1.75), S(x + u + 0.08, y + 0.45, 1.75)], '#d8d0c0'); } break; }
      case 'dry': {   // telaio per seccare la carne e le pelli
        for (const u of [0.1, 0.9]) line(S(x + u, y + 0.5, 0), S(x + u, y + 0.5, 1.2), '#6b4a2e', Math.max(2, K.TW / 18));
        line(S(x + 0.1, y + 0.5, 1.15), S(x + 0.9, y + 0.5, 1.15), '#6b4a2e', Math.max(2, K.TW / 18));
        poly([S(x + 0.2, y + 0.5, 1.1), S(x + 0.45, y + 0.5, 1.1), S(x + 0.45, y + 0.5, 0.55), S(x + 0.2, y + 0.5, 0.6)], '#b88a5a'); poly([S(x + 0.55, y + 0.5, 1.1), S(x + 0.8, y + 0.5, 1.1), S(x + 0.78, y + 0.5, 0.7), S(x + 0.55, y + 0.5, 0.65)], '#a85a3a'); break; }
      case 'skull': {   // cranio di mammut con le zanne all'ingresso del campo
        bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0, 0.55, '#e8e0cc'); bx(x + 0.32, y + 0.7, x + 0.42, y + 0.76, 0.25, 0.4, '#2a2018'); bx(x + 0.58, y + 0.7, x + 0.68, y + 0.76, 0.25, 0.4, '#2a2018');
        for (const s of [-1, 1]) { const a = S(x + 0.5 + s * 0.2, y + 0.75, 0.15), b = S(x + 0.5 + s * 0.6, y + 1.05, 0.55), c2 = S(x + 0.5 + s * 0.35, y + 1.1, 1.0); K.g.strokeStyle = '#f2ead8'; K.g.lineWidth = Math.max(3, K.TW / 9); K.g.lineCap = 'round'; K.g.beginPath(); K.g.moveTo(...a); K.g.quadraticCurveTo(b[0], b[1], c2[0], c2[1]); K.g.stroke(); } break; }
      case 'stash': {   // scorte del campo: cesta di vimini (i conigli si vedono sopra, over)
        cyl(x + 0.5, y + 0.5, 0.32, 0, 0.45, '#a8844e'); cyl(x + 0.5, y + 0.5, 0.28, 0.45, 0.47, '#4a3420'); K.strokes([[S(x + 0.18, y + 0.82, 0.15), S(x + 0.82, y + 0.82, 0.15)], [S(x + 0.18, y + 0.82, 0.3), S(x + 0.82, y + 0.82, 0.3)]], '#8a6a3a', 1.5); break; }
      case 'stump': cyl(x + 0.5, y + 0.5, 0.26, 0, 0.35, '#6b4a2e'); cyl(x + 0.5, y + 0.5, 0.19, 0.35, 0.36, '#d8b07a'); break;
    }
  }
  CQ_MAPS.prateria = { n: 'Prateria', make: mapPrateria, seeded: true, only: 'mammut' };

  // ======================= TRACCE =======================
  // { id, k: passo/fango/sterco/erba/ramo/corteccia/buca/sangue, x, y, t: quando, dx, dy: direzione, ct: creata (per mandarla agli amici) }
  const TR_LIFE = { foot: 210, mud: 230, dung: 400, graze: 260, branch: 320, bark: 400, bed: 520, blood: 220 };
  const STAGE_AGE = [12, 60, 150, 190];   // eta' rappresentativa di ogni stato (per 200 s di vita)
  // stato di una traccia: 0 freschissima, 1 fresca, 2 di qualche minuto, 3 vecchia, -1 sparita
  function stageOf(G, t) { const a = G.time - t.t, L2 = TR_LIFE[t.k] || 200; return a > L2 ? -1 : a < L2 * 0.12 ? 0 : a < L2 * 0.4 ? 1 : a < L2 * 0.75 ? 2 : 3; }
  function cellTracks(G) {
    if (G.trCv === G.trN && G.trCl === G.tr.length && G.trC) return G.trC;
    const M = new Map(); for (const t of G.tr) { const k = Math.floor(t.x) + ',' + Math.floor(t.y); let a = M.get(k); if (!a) M.set(k, a = []); a.push(t); }
    G.trC = M; G.trCv = G.trN; G.trCl = G.tr.length; return M;
  }
  // su ogni telefono: le celle con tracce nuove, cambiate o sparite si ridisegnano nella mappa pronta (poche alla volta)
  function trackCells(G) {
    if (!cq.bg || !G.trD) return;
    const want = new Map(); for (const t of G.tr) { const sg = stageOf(G, t); if (sg >= 0) want.set(t.id, [sg, Math.floor(t.x), Math.floor(t.y)]); }
    const cells = new Set();
    for (const [id, v] of want) { const d = G.trD.get(id); if (!d || d[0] !== v[0]) cells.add(v[1] + ',' + v[2]); }
    for (const [id, d] of G.trD) if (!want.has(id)) { cells.add(d[1] + ',' + d[2]); G.trD.delete(id); }
    const L2 = [...cells].map(k => k.split(',').map(Number)).sort((a, b) => Math.hypot(a[0] - cq.x, a[1] - cq.y) - Math.hypot(b[0] - cq.x, b[1] - cq.y));
    L2.slice(0, L2.length && Math.hypot(L2[0][0] - cq.x, L2[0][1] - cq.y) < 22 ? 2 : 1).forEach(([x, y]) => cqBgCell(x, y, 1));   // prima quelle vicine, poche per volta (ognuna ridisegna un pezzo di mappa)
  }
  function track(G, k, x, y, dx, dy) {
    const t = { id: ++G.trN, k, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, t: G.time, dx: Math.round((dx || 0) * 100) / 100, dy: Math.round((dy || 0) * 100) / 100, ct: Math.max(0, G.time) };
    G.tr.push(t); if (G.tr.length > 420) G.tr.splice(0, G.tr.length - 420);
    return t;
  }
  // cosa racconta una traccia (vista da vicino)
  function trackTxt(G, t) {
    const a = G.time - t.t, f = a < 30 ? 'freschissima' : a < 90 ? 'fresca' : a < 200 ? 'di qualche minuto fa' : 'vecchia', dir = t.dx || t.dy ? ' · va verso ' + arrowOf(t.dx, t.dy) : '';
    switch (t.k) {
      case 'foot': return '🐾 Impronta di mammut, ' + f + dir;
      case 'mud': return '💧 Impronta fangosa, ' + f + ': viene dall\'acqua, ha appena bevuto' + dir;
      case 'dung': return a < 60 ? '💩 Sterco ancora fumante! È passato da pochissimo. Ha mangiato: tra un po\' avrà sete.' : '💩 Sterco ' + (a < 200 ? 'tiepido' : 'secco') + ': è passato di qui ' + (a < 200 ? 'qualche minuto fa' : 'tempo fa') + '.';
      case 'graze': return '🌾 Erba strappata e mangiata, ' + f + ': qui ha pascolato.';
      case 'branch': return '🌿 Rami spezzati, ' + f + ': è passato tra gli alberi' + dir;
      case 'bark': return '🪵 Corteccia grattata, ' + f + ': si è fermato a strofinarsi qui.';
      case 'bed': return (G.mm && G.mm.st === 'sleep' && Math.hypot(G.mm.x - t.x, G.mm.y - t.y) < 1.5) || a < 90 ? '🛏️ Buca per dormire ancora calda!' : '🛏️ Buca per dormire, ormai fredda: ci ha passato la notte.';
      case 'blood': return '🩸 Sangue ' + (a < 40 ? 'fresco' : 'rappreso') + ': il mammut è ferito!' + dir;
    }
    return '';
  }
  function drawTrack(g, t, X, Y, TW, a, now, baked) {
    const u = TW / 34, life = TR_LIFE[t.k] || 200, al = Math.max(0.12, 1 - a / life);
    const ang = Math.atan2((t.dx + t.dy) / 2, t.dx - t.dy);
    switch (t.k) {
      case 'foot': case 'mud': {
        g.save(); g.translate(X, Y); g.rotate(ang); g.scale(1, 0.55);
        g.fillStyle = t.k === 'mud' ? 'rgba(52,38,26,' + (0.85 * al) + ')' : 'rgba(70,52,30,' + (0.7 * al) + ')';
        g.beginPath(); g.arc(0, 0, 7.5 * u, 0, 7); g.fill();
        g.fillStyle = t.k === 'mud' ? 'rgba(40,28,18,' + (0.9 * al) + ')' : 'rgba(55,40,24,' + (0.75 * al) + ')';
        for (const k of [-1.5, -0.5, 0.5, 1.5]) { g.beginPath(); g.arc(7.6 * u * Math.cos(k * 0.38), 7.6 * u * Math.sin(k * 0.38), 1.9 * u, 0, 7); g.fill(); }
        if (t.k === 'mud' && a < 60) { g.fillStyle = 'rgba(160,200,230,' + (0.35 * al) + ')'; g.beginPath(); g.ellipse(-2 * u, -2 * u, 3 * u, 1.6 * u, 0, 0, 7); g.fill(); }
        g.restore(); break; }
      case 'dung': {
        g.fillStyle = 'rgba(92,64,34,' + Math.min(1, 0.3 + al) + ')';
        for (const [dx, dy, r] of [[-4, 0, 5], [3, -1, 4.5], [0, -4, 4]]) { g.beginPath(); g.ellipse(X + dx * u, Y + dy * u, r * u, r * 0.65 * u, 0, 0, 7); g.fill(); }
        if (a < 60 && !baked) { g.strokeStyle = 'rgba(235,235,235,' + (0.55 * (1 - a / 60)) + ')'; g.lineWidth = 1.6; for (let i = 0; i < 2; i++) { const p = ((now * 0.6 + i * 0.5) % 1), x0 = X + (i ? 3 : -3) * u, y0 = Y - 6 * u - p * 16 * u; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 3 * u * Math.sin(now * 3 + i), y0 - 4 * u, x0, y0 - 8 * u); g.stroke(); } }
        break; }
      case 'graze': g.fillStyle = 'rgba(190,190,90,' + (0.5 * al) + ')'; g.beginPath(); g.ellipse(X, Y, 14 * u, 7 * u, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,140,50,' + (0.7 * al) + ')'; g.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X + i * 5 * u, Y + 3 * u); g.lineTo(X + i * 5 * u + 3 * u, Y - 1 * u); g.stroke(); } break;
      case 'branch': g.strokeStyle = 'rgba(110,80,46,' + Math.min(1, 0.3 + al) + ')'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(X - 9 * u, Y + 2 * u); g.lineTo(X + 1 * u, Y - 1 * u); g.lineTo(X + 8 * u, Y + 3 * u); g.moveTo(X + 1 * u, Y - 1 * u); g.lineTo(X + 4 * u, Y - 6 * u); g.stroke(); g.fillStyle = 'rgba(80,130,50,' + al + ')'; g.beginPath(); g.ellipse(X + 5 * u, Y - 6 * u, 3 * u, 1.8 * u, 0.5, 0, 7); g.fill(); break;
      case 'bark': g.fillStyle = 'rgba(232,204,150,' + Math.min(1, 0.3 + al) + ')'; for (const [dx, dy, r] of [[-7, 3, 2.6], [-2, 6, 2], [4, 4, 2.4], [8, 7, 1.8], [1, 9, 1.6]]) { g.beginPath(); g.ellipse(X + dx * u, Y + dy * u, r * u, r * 0.55 * u, 0.4, 0, 7); g.fill(); } break;   // schegge di corteccia ai piedi dell'albero
      case 'bed': {
        const warm = a < 90;
        g.fillStyle = 'rgba(70,52,30,' + Math.min(1, 0.4 + al) + ')'; g.beginPath(); g.ellipse(X, Y, 24 * u, 11 * u, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(45,32,18,' + Math.min(1, 0.4 + al) + ')'; g.beginPath(); g.ellipse(X, Y + 1 * u, 17 * u, 7 * u, 0, 0, 7); g.fill();
        if (warm && !baked) { g.strokeStyle = 'rgba(240,240,240,.4)'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { const p = ((now * 0.5 + i * 0.33) % 1), x0 = X + (i - 1) * 10 * u, y0 = Y - 2 * u - p * 18 * u; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 3 * u * Math.sin(now * 3 + i), y0 - 4 * u, x0, y0 - 8 * u); g.stroke(); } }
        break; }
      case 'blood': g.fillStyle = a < 40 ? 'rgba(200,20,30,' + Math.min(1, 0.4 + al) + ')' : 'rgba(110,20,20,' + Math.min(1, 0.3 + al) + ')'; for (const [dx, dy, r] of [[0, 0, 3.2], [5, 2, 2], [-4, 3, 1.6]]) { g.beginPath(); g.ellipse(X + dx * u, Y + dy * u, r * u, r * 0.6 * u, 0, 0, 7); g.fill(); } break;
    }
  }

  // ======================= IL MAMMUT =======================
  function placeList(k) { return (MP().places[k] || []).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, k })); }
  function feared(G, x, y) { return G.mm.fear.some(f => G.time - f.t < 160 && Math.hypot(f.x - x, f.y - y) < 12); }
  function choosePlace(G, k) {
    const m = G.mm, L2 = placeList(k).filter(p => Math.hypot(p.x - m.x, p.y - m.y) > 3);
    let best = null, bs = 1e9;
    for (const p of L2) { const d = Math.hypot(p.x - m.x, p.y - m.y), s = d * (0.6 + Math.random() * 0.9) + (feared(G, p.x, p.y) ? 70 : 0) + (k === 'sleep' && atCamp(p.x, p.y, 16) ? 40 : 0) + (p === m.last ? 50 : 0); if (s < bs) { bs = s; best = p; } }
    return best;
  }
  function mmGo(G, x, y, max) { const m = G.mm, p = cqPath(m.x, m.y, x, y); m.path = max ? p.slice(0, max) : p; if (!m.path.length) m.path = []; }
  function mmPlan(G) {
    const m = G.mm, t = cyc(G);
    if (t >= DUSK + 6 && t < DAWN) { const p = m.sleepP && !feared(G, m.sleepP.x, m.sleepP.y) ? m.sleepP : choosePlace(G, 'sleep'); m.sleepP = p; m.tgt = p; m.st = 'walk'; if (p) mmGo(G, p.x, p.y); return; }
    m.sleepP = null;
    const k = m.need.e > m.need.w ? 'eat' : 'drink';
    if (Math.max(m.need.e, m.need.w) < 0.35) {   // non ha bisogno di niente: gironzola, si gratta su un albero
      const tr = MP().trees.filter(o => !o.cut && Math.hypot(o.x - m.x, o.y - m.y) < 14 && Math.hypot(o.x - m.x, o.y - m.y) > 3);
      const o = tr.length ? tr[Math.floor(Math.random() * tr.length)] : null, sp = o && cqSpot(o.x, o.y);
      if (sp) { m.tgt = { x: sp.x, y: sp.y, k: 'rub', tr: o }; m.st = 'walk'; mmGo(G, sp.x, sp.y); return; }
    }
    const p = choosePlace(G, k); m.tgt = p; m.st = 'walk'; if (p) mmGo(G, p.x, p.y);
  }
  function mmFleeFrom(G, sx, sy, far) {
    const m = G.mm; let best = null, bs = -1e9;
    const a0 = Math.atan2(m.y - sy, m.x - sx);
    for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 2]) {
      const a = a0 + da, d = far || 12, x = Math.floor(m.x + Math.cos(a) * d), y = Math.floor(m.y + Math.sin(a) * d);
      const q = cqCellFree(x, y) ? { x: x + 0.5, y: y + 0.5 } : null; if (!q) continue;
      const p = cqPath(m.x, m.y, q.x, q.y); if (!p.length) continue;
      const s = -Math.abs(da) * 3 - p.length * 0.15; if (s > bs) { bs = s; best = p; }
    }
    m.path = best ? best.slice(0, 16) : []; m.st = 'flee'; m.fT = G.time; m.aw = 0.4;
  }
  function alarm(G, x, y) { const m = G.mm; m.wary = G.time + 120; m.fear.push({ x, y, t: G.time }); if (m.fear.length > 6) m.fear.shift(); }
  function trumpet(G, loud) { const m = G.mm; G.trump = { x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, t: G.time, l: loud ? 1 : 0 }; m.trT = G.time + 45 + Math.random() * 35; G.kn = { x: m.x + (Math.random() - 0.5) * 8, y: m.y + (Math.random() - 0.5) * 8, t: G.time, fuzzy: 1 }; }
  // reazione quando si accorge dei cacciatori: scappa, oppure carica (se ferito o se chi lo affronta e' solo e vicino)
  function mmReact(G, th) {
    const m = G.mm, q = P(th), d = Math.hypot(q.x - m.x, q.y - m.y), alone = !active(G).some(o => o !== th && dist2(o, th) < 4);
    alarm(G, q.x, q.y);
    if (!torchOn(G, th) && d < CH_R + 0.6 && Math.random() < (m.hp < m.max ? 0.55 : 0.28) + (alone ? 0.22 : 0)) { m.st = 'wind'; m.wT = G.time; m.chTgt = th.id; m.path = []; trumpet(G, 1); say(G, 'wind', { a: th.id }); return; }
    mmFleeFrom(G, q.x, q.y); if (Math.random() < 0.5) trumpet(G, 1);
  }
  const dist2 = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  function mmTick(G, dt, warm) {
    const m = G.mm; if (!m || m.st === 'dead') return;
    const t = cyc(G), slow = 0.6 + 0.4 * m.hp / m.max;
    m.need.e = Math.min(1, m.need.e + dt / 95); m.need.w = Math.min(1, m.need.w + dt / 120);
    // ---- percezione: vista (meno di notte, poco mentre dorme) e fiuto col vento ----
    if (!warm && m.st !== 'trap' && m.st !== 'wind' && m.st !== 'charge') {
      const sleeping = m.st === 'sleep', vis = sleeping ? VIS_S : dark(G) > 0.5 ? VIS_N : VIS_D, wx = Math.cos(G.wind), wy = Math.sin(G.wind);
      let gain = 0, who = null, wd = 99;
      for (const c of active(G)) {
        const q = P(c), dx = m.x - q.x, dy = m.y - q.y, d = Math.hypot(dx, dy);
        if (torchOn(G, c) && d < PUSH_R && !sleeping && (m.st !== 'flee' || G.time - m.fT > 2)) { alarm(G, q.x, q.y); mmFleeFrom(G, q.x, q.y, 10); who = null; gain = 0; break; }   // il fuoco lo spinge via
        const v = vis * (m.wary > G.time ? 1.35 : 1) * (torchOn(G, c) ? 1.5 : 1);
        if (d < v) { gain += (0.45 + 1.7 * (1 - d / v)) * (sleeping ? 0.5 : 1); if (d < wd) { wd = d; who = c; } }
        if (d < SMELL && d > 0.5 && (dx * wx + dy * wy) / d > 0.6) { gain += 0.75; if (d < wd) { wd = d; who = c; } if ((m.snT || 0) < G.time) { m.snT = G.time + 6; m.sn = { id: c.id, t: G.time }; } }
      }
      if (m.st !== 'flee') m.aw = Math.max(0, Math.min(1.2, m.aw + (gain ? gain * (m.wary > G.time ? 1.5 : 1) : -0.3) * dt));
      if (m.aw >= 1 && who && m.st !== 'flee') { if (sleeping) say(G, 'wake', {}); mmReact(G, who); }
    }
    // ---- stati ----
    if (m.st === 'trap') { m.path = []; m.walk = 0; if (G.time >= m.trapT) { m.st = 'flee'; mmFleeFrom(G, m.x - 1, m.y - 1); say(G, 'out', {}); } }
    else if (m.st === 'wind') { m.walk = 0; const c = byId(G, m.chTgt); if (c) { const q = P(c); m.face = (q.x - m.x) - (q.y - m.y) > 0 ? 1 : -1; } if (G.time - m.wT > 0.75) { const q = c ? P(c) : { x: m.x + 1, y: m.y }, d = Math.hypot(q.x - m.x, q.y - m.y) || 1; m.cd = [(q.x - m.x) / d, (q.y - m.y) / d]; m.st = 'charge'; m.cT = G.time; m.hit = []; } }
    else if (m.st === 'charge') {
      const sp = CQ_SPEED * 1.75 * dt, nx = m.x + m.cd[0] * sp, ny = m.y + m.cd[1] * sp;
      if (cqCellFree(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; } else m.cT = -99;
      m.walk += dt * 14; m.face = m.cd[0] - m.cd[1] > 0 ? 1 : -1;
      for (const c of active(G)) if (!m.hit.includes(c.id) && dxy(c, m.x, m.y) < 1.1) { m.hit.push(c.id); knock(G, c, 'm'); }
      if (G.time - m.cT > 1.3) { mmFleeFrom(G, m.x - m.cd[0], m.y - m.cd[1], 9); }
    }
    else if (m.st === 'flee') {
      const k = G.time - m.fT < 4 ? 1.25 : 0.8;
      if (m.path.length) cqModeStep(m, dt, k * slow); else { m.st = 'walk'; m.path = []; m.tgt = null; m.nT = G.time + 1; }
      if (G.time - m.fT > 9) { m.st = 'walk'; m.path = []; m.tgt = null; }
    }
    else if (m.st === 'sleep') { m.walk = 0; if (t >= DAWN || t < DUSK) { m.st = 'walk'; m.tgt = null; m.path = []; trumpet(G, 0); } }
    else if (m.st === 'graze') {
      m.need.e = Math.max(0, m.need.e - dt / 22);
      if ((m.gT -= dt) <= 0) { m.gT = 4 + Math.random() * 4; track(G, 'graze', m.x + (Math.random() - 0.5), m.y + (Math.random() - 0.5)); const a = Math.random() * 7, nx = m.x + Math.cos(a) * 1.5, ny = m.y + Math.sin(a) * 1.5; if (cqCellFree(Math.floor(nx), Math.floor(ny)) && MP().ter[Math.floor(ny)][Math.floor(nx)] === 2) m.path = [[nx, ny]]; }
      if (m.path.length) cqModeStep(m, dt, 0.25); else m.walk = 0;
      if (m.need.e <= 0.02 || isNight(G)) { m.st = 'walk'; m.tgt = null; m.path = []; if (Math.random() < 0.7) track(G, 'dung', m.x - 0.4, m.y + 0.3); }
    }
    else if (m.st === 'drink') { m.walk = 0; m.need.w = Math.max(0, m.need.w - dt / 8); if (m.need.w <= 0.02) { m.mudT = G.time + 35; m.st = 'walk'; m.tgt = null; m.path = []; } }
    else if (m.st === 'rub') { m.walk = 0; if (G.time > m.rT) { m.st = 'walk'; m.tgt = null; m.path = []; } }
    else {   // walk
      if (!m.tgt || (!m.path.length && m.tgt && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y) > 1.2 && (m.nT || 0) < G.time)) { m.nT = G.time + 2; mmPlan(G); }
      if (m.path.length) cqModeStep(m, dt, (m.wary > G.time ? 0.62 : 0.5) * slow);
      else if (m.tgt && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y) <= 1.2) {
        const k = m.tgt.k; m.last = m.tgt;
        if (k === 'sleep') { m.st = 'sleep'; track(G, 'bed', m.x, m.y); if (!warm) say(G, 'sleep', {}); }
        else if (k === 'eat') { m.st = 'graze'; m.gT = 1; }
        else if (k === 'drink') m.st = 'drink';
        else if (k === 'rub') { m.st = 'rub'; m.rT = G.time + 6 + Math.random() * 6; const o = m.tgt.tr; if (o) track(G, 'bark', o.x + 0.5, o.y + 0.5); }
        else m.tgt = null;
      }
    }
    // ---- impronte lungo la strada, rami spezzati tra gli alberi, sangue se e' ferito, sterco ogni tanto ----
    if (m.lx == null) { m.lx = m.x; m.ly = m.y; }
    const mv = Math.hypot(m.x - m.lx, m.y - m.ly);
    if (mv > 1.25) {
      const dx = (m.x - m.lx) / mv, dy = (m.y - m.ly) / mv, side = (m.side = -(m.side || 1)) * 0.28;
      track(G, m.mudT > G.time ? 'mud' : 'foot', m.x - dy * side, m.y + dx * side, dx, dy);
      if (m.hp < m.max && Math.random() < 0.8) track(G, 'blood', m.x + (Math.random() - 0.5) * 0.6, m.y + (Math.random() - 0.5) * 0.6, dx, dy);
      if (MP().trees.some(o => !o.cut && Math.abs(o.x + 0.5 - m.x) < 1.6 && Math.abs(o.y + 0.5 - m.y) < 1.6) && Math.random() < 0.35) track(G, 'branch', m.x + dx * 0.5, m.y + dy * 0.5, dx, dy);
      if ((m.dT -= mv) <= 0) { m.dT = 30 + Math.random() * 30; track(G, 'dung', m.x - dx * 0.8, m.y - dy * 0.8); }
      m.lx = m.x; m.ly = m.y;
    }
    // trappola sul percorso: ci cade dentro
    if (m.st !== 'trap' && m.st !== 'dead') for (const p of G.traps) if (!p.used && Math.hypot(p.x - m.x, p.y - m.y) < 0.8) { p.used = 1; m.st = 'trap'; m.trapT = G.time + TRAP_T; m.x = p.x; m.y = p.y; m.path = []; m.aw = 1; alarm(G, p.x, p.y); trumpet(G, 1); if (!warm) say(G, 'trap', {}); break; }
    if (!warm && G.time >= (m.trT || 0) && m.st !== 'sleep') trumpet(G, 0);
  }
  // un cacciatore colpito (carica del mammut o sciacallo): a terra, lascia cadere quello che porta
  function knock(G, c, by) {
    if (!c.alive || c.dn) return;
    c.dn = G.time; c.rv = 0; c.op = null; c.path = [];
    if (c.mt >= 0) { const it = G.meat[c.mt]; if (it) { if (by === 'j') { it.st = 3; } else { it.st = 0; const q = P(c); it.x = q.x + 0.4; it.y = q.y + 0.3; } } c.mt = -1; }
    if (c.logs) c.logs = 0;
    if (c.rab && by === 'j') c.rab = 0;
    c.tor = 0;
    say(G, 'down', { a: c.id, b: by });
  }

  // ======================= AZIONI =======================
  function nearTree(c, r = 1.5) { const q = P(c); let b = -1, bd = r; MP().trees.forEach((t, i) => { if (t.cut || cqSolid[t.y][t.x] == null || cqSolid[t.y][t.x].prop !== 'tree') return; const d = Math.hypot(t.x + 0.5 - q.x, t.y + 0.5 - q.y); if (d < bd) { bd = d; b = i; } }); return b; }
  function digOk(G, x, y) { const cx = Math.floor(x), cy = Math.floor(y), t = MP().ter[cy] && MP().ter[cy][cx]; return (t === 1 || t === 2 || t === 3) && cqCellFree(cx, cy) && !atCamp(x, y, 7) && !G.traps.some(p => Math.hypot(p.x - x, p.y - y) < 3); }
  function digAt(G, c) { const q = P(c); return G.digs.find(d => Math.hypot(d.x - q.x, d.y - q.y) < 1.6); }
  // pulsante grande a destra: macella / torcia / taglia / scava (le lance e le urla hanno i loro pulsanti a sinistra)
  function action(G, c) {
    if (!c.alive || c.dn) return null;
    const q = P(c), m = G.mm;
    if (m && m.st === 'dead' && !G.butch && Math.hypot(q.x - m.x, q.y - m.y) < 2.2) return { k: 'butch', t: '🔪 Macella il mammut', on: true };
    if (atCamp(q.x, q.y, 2.4) && G.fuel > 0 && !torchOn(G, c)) return { k: 'torch', t: '🔥 Prendi una torcia', on: true };
    if (c.mt < 0 && (c.logs || 0) < LOGS_MAX) { const i = nearTree(c); if (i >= 0) return { k: 'chop', i, t: '🪓 Taglia legna (' + (c.logs || 0) + '/' + LOGS_MAX + ')', on: !c.op }; }
    if (c.mt < 0) { const d = digAt(G, c); if (d) return { k: 'dig', i: d.id, t: '⛏️ Scava insieme (' + Math.round(d.p * 100) + '%)', on: true }; if (digOk(G, q.x, q.y)) return { k: 'dig', i: -1, t: '⛏️ Scava una fossa', on: true }; }
    return null;
  }
  function doAct(G, c, a) {
    if (!c.alive || c.dn || !a) return;
    const q = P(c);
    if (a.k === 'butch') { const m = G.mm; if (m && m.st === 'dead' && !G.butch && Math.hypot(q.x - m.x, q.y - m.y) < 2.4) c.op = { k: 'butch', t0: G.time, x: q.x, y: q.y }; return; }
    if (a.k === 'torch') { if (atCamp(q.x, q.y, 2.8) && G.fuel > 0) { c.tor = G.time + TORCH_T; say(G, 'torch', { a: c.id }); } return; }
    if (a.k === 'chop') { const i = a.i != null && a.i >= 0 ? a.i : nearTree(c); if (i >= 0 && !G.cut[i] && (c.logs || 0) < LOGS_MAX) c.op = { k: 'chop', i, t0: G.time, x: q.x, y: q.y }; return; }
    if (a.k === 'dig') {
      let d = digAt(G, c);
      if (!d) { if (!digOk(G, q.x, q.y)) return; d = { id: ++G.dgN, x: Math.floor(q.x) + 0.5, y: Math.floor(q.y) + 0.5, p: 0 }; G.digs.push(d); }
      c.op = { k: 'dig', i: d.id, t0: G.time, x: q.x, y: q.y }; return;
    }
  }
  // lancia: al mammut (se lo vedo e e' a tiro) o allo sciacallo piu' vicino
  function throwTarget(G, c) {
    const q = P(c), m = G.mm; let best = null, bd = 1e9;
    if (G.jk) for (const j of G.jk) { const d = Math.hypot(j.x - q.x, j.y - q.y); if (d < 4.5 && d < bd && canSee(G, c, j.x, j.y)) { bd = d; best = { k: 'j', id: j.id, x: j.x, y: j.y, d }; } }
    if (best && best.d < 3) return best;
    if (m && m.st !== 'dead') { const d = Math.hypot(m.x - q.x, m.y - q.y); if (d < THROW_R && canSee(G, c, m.x, m.y)) return { k: 'm', id: 'm', x: m.x, y: m.y, d }; }
    return best;
  }
  function canSee(G, c, x, y) {
    const q = P(c), d = Math.hypot(q.x - x, q.y - y); if (dark(G) < 0.5) return d < 12;
    if (d < (torchOn(G, c) ? TORCH_L : SEE_N)) return true;
    if (inFire(G, x, y) && d < 10) return true;
    return active(G).some(o => o !== c && torchOn(G, o) && dxy(o, x, y) < TORCH_L * 0.85) && d < 9;
  }
  function doThrow(G, c, tid) {
    if (!c.alive || c.dn || (c.sp || 0) <= 0 || (c.thT || 0) > G.time) return;
    const tg = throwTarget(G, c); if (!tg || (tid != null && String(tg.id) !== String(tid) && tid !== 'any')) { if (!tg) return; }
    c.sp--; c.thT = G.time + 1.1;
    const q = P(c), m = G.mm;
    let hit = false;
    if (tg.k === 'm') { const p = m.st === 'trap' ? 1 : m.st === 'sleep' ? 0.97 : Math.min(0.94, 0.94 - Math.max(0, tg.d - 2.5) * 0.12); hit = Math.random() < p; }
    else hit = Math.random() < Math.min(0.9, 0.95 - tg.d * 0.08);
    const lx = tg.x + (hit ? (Math.random() - 0.5) * 0.8 : (tg.x - q.x) / tg.d * (1 + Math.random()) + (Math.random() - 0.5) * 1.4), ly = tg.y + (hit ? (Math.random() - 0.5) * 0.8 : (tg.y - q.y) / tg.d * (1 + Math.random()) + (Math.random() - 0.5) * 1.4);
    const sp = { id: ++G.spN, x: lx, y: ly }; const cx = Math.floor(lx), cy = Math.floor(ly);
    if (!cqCellFree(cx, cy)) { const s = cqSpot(cx, cy); if (s) { sp.x = s.x; sp.y = s.y; } }
    G.sp.push(sp); G.fly.push([Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, Math.round(tg.x * 10) / 10, Math.round(tg.y * 10) / 10, G.time]);
    if (tg.k === 'j') { if (hit) { G.jk = G.jk.filter(j => j.id !== tg.id); c.jkK = (c.jkK || 0) + 1; say(G, 'jk', { a: c.id }); } else say(G, 'miss', { a: c.id, j: 1 }); return; }
    if (!hit) { say(G, 'miss', { a: c.id }); m.aw = Math.max(m.aw, 0.8); return; }
    m.hp -= m.st === 'trap' ? 2 : 1; c.hits = (c.hits || 0) + 1; G.kn = { x: m.x, y: m.y, t: G.time };
    if (m.hp <= 0) { m.hp = 0; m.st = 'dead'; m.path = []; m.walk = 0; G.killT = G.time; say(G, 'kill', { a: c.id }); return; }
    say(G, 'hit', { a: c.id, d: m.hp });
    if (m.st === 'trap') return;
    m.aw = 1; if (m.st === 'sleep' || m.st === 'graze' || m.st === 'drink' || m.st === 'walk' || m.st === 'rub' || m.st === 'flee') mmReact(G, c);
  }
  function doShout(G, c) {
    if (!c.alive || c.dn || (c.shT || 0) > G.time) return;
    c.shT = G.time + SHOUT_CD; const q = P(c), m = G.mm;
    G.shouts.push([Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, G.time, c.id]);
    if (m && m.st !== 'dead' && m.st !== 'trap' && m.st !== 'charge' && m.st !== 'wind' && Math.hypot(m.x - q.x, m.y - q.y) < SHOUT_R) { alarm(G, q.x, q.y); mmFleeFrom(G, q.x, q.y, 11); }
    for (const j of G.jk) if (Math.hypot(j.x - q.x, j.y - q.y) < SHOUT_R) { j.fear = G.time + 5; j.fx = q.x; j.fy = q.y; }
  }

  // ======================= CONIGLI E SCIACALLI =======================
  function rabTick(G, dt) {
    const B = MP().burrows, day = dark(G) < 0.3;
    if (day && G.rab.length < Math.min(7, 3 + Math.floor(G.chars.length / 2)) && (G.rabT -= dt) <= 0) {
      G.rabT = 5 + Math.random() * 4; const b = B[Math.floor(Math.random() * B.length)];
      if (b && !active(G).some(c => dxy(c, b.x, b.y) < 5)) G.rab.push({ id: ++G.rbN, x: b.x, y: b.y, b: B.indexOf(b), st: 'idle', t: 0, path: [], face: 1, walk: 0 });
    }
    for (const r of G.rab.slice()) {
      const b = B[r.b], th = active(G).filter(c => dxy(c, r.x, r.y) < 3.2).sort((a, c) => dxy(a, r.x, r.y) - dxy(c, r.x, r.y))[0];
      if (!day && Math.hypot(r.x - b.x, r.y - b.y) < 0.6) { G.rab = G.rab.filter(o => o !== r); continue; }
      if (th && r.st !== 'run') {
        const q = P(th); let tx = r.x + (r.x - q.x) * 2, ty = r.y + (r.y - q.y) * 2;
        if (Math.hypot(b.x - r.x, b.y - r.y) < 6 && ((b.x - r.x) * (r.x - q.x) + (b.y - r.y) * (r.y - q.y)) > 0) { tx = b.x; ty = b.y; }   // la tana e' dalla parte giusta: ci scappa dentro
        const cx = Math.floor(tx), cy = Math.floor(ty); if (cqCellFree(cx, cy)) { r.path = cqPath(r.x, r.y, cx + 0.5, cy + 0.5).slice(0, 4); r.st = 'run'; r.t = G.time + 1.3; }
      }
      if (r.st === 'run' && G.time > r.t) { r.st = 'rest'; r.t = G.time + 0.55; r.path = []; }
      else if (r.st === 'rest' && G.time > r.t) r.st = 'idle';
      else if (r.st === 'idle' && !r.path.length && Math.random() < dt * 0.4) { const a = Math.random() * 7, x = Math.floor(b.x + Math.cos(a) * 2.5), y = Math.floor(b.y + Math.sin(a) * 2.5); if (cqCellFree(x, y)) r.path = [[x + 0.5, y + 0.5]]; }
      if (!day && !r.path.length) r.path = [[b.x, b.y]];
      if (r.path.length) cqModeStep(r, dt, r.st === 'run' ? 1.3 : 0.45); else r.walk = 0;
      if (r.st === 'run' && Math.hypot(r.x - b.x, r.y - b.y) < 0.5) { G.rab = G.rab.filter(o => o !== r); continue; }   // al sicuro nella tana
      // preso: chi lo tocca (il computer ci riesce solo a volte: e' agile)
      const cat = active(G).find(c => (c.rab || 0) < RAB_MAX && c.mt < 0 && dxy(c, r.x, r.y) < (c.bot ? 0.55 : 0.62) && (!c.bot || Math.random() < dt * 3));
      if (cat) { cat.rab = (cat.rab || 0) + 1; cat.rbK = (cat.rbK || 0) + 1; G.rab = G.rab.filter(o => o !== r); say(G, 'rab', { a: cat.id }); }
    }
  }
  function jkSpawn(G) {
    const k = dayN(G), n = Math.min(10, 2 * k + Math.floor(G.chars.length / 4)), F = fireC();
    for (let i = 0; i < n; i++) { for (let t = 0; t < 60; t++) { const f = cqModeFree(40); if (f && Math.hypot(f.x - F.x, f.y - F.y) > 16) { G.jk.push({ id: ++G.jkN, x: f.x, y: f.y, path: [], face: 1, walk: 0, cd: 0, fear: 0, tk: 0, ang: Math.random() * 7 }); break; } } }
    say(G, 'night', { d: k, v: n, of: G.opt.nights || 3 });
  }
  function jkTick(G, dt) {
    const F = fireC(), fr = fireR(G), t = cyc(G);
    if (t >= DAWN + 4 || t < NIGHT - 5) { if (G.jk.length) { G.jk = []; } return; }
    for (const j of G.jk) {
      if ((j.tk -= dt) <= 0) {
        j.tk = 0.35 + Math.random() * 0.2; j.tg = null;
        if (j.fear > G.time) { const a = Math.atan2(j.y - j.fy, j.x - j.fx), x = Math.floor(j.x + Math.cos(a) * 6), y = Math.floor(j.y + Math.sin(a) * 6); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 6); }
        else if (j.cd > G.time) { const a = Math.atan2(j.y - F.y, j.x - F.x), x = Math.floor(F.x + Math.cos(a) * (fr + 7)), y = Math.floor(F.y + Math.sin(a) * (fr + 7)); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 8); }
        else {
          // bersagli: chi porta la carne, la carcassa (se non e' ancora macellata), chi e' solo fuori dalla luce, le scorte se il fuoco e' basso
          let best = null, bs = 1e9;
          for (const c of active(G)) { const q = P(c); if (inFire(G, q.x, q.y)) continue; const d = Math.hypot(q.x - j.x, q.y - j.y), alone = !active(G).some(o => o !== c && dist2(o, c) < 3); const s = d - (c.mt >= 0 ? 8 : 0) - (alone ? 3 : 0) + (torchOn(G, c) ? 4 : 0); if (d < 18 && s < bs) { bs = s; best = { c, x: q.x, y: q.y }; } }
          const m = G.mm; if (m && m.st === 'dead' && !G.butch && m.meat > 0) { const d = Math.hypot(m.x - j.x, m.y - j.y); if (d - 4 < bs && d < 26) { bs = d - 4; best = { car: 1, x: m.x, y: m.y }; } }
          for (const it of G.meat) if (it.st === 0) { const d = Math.hypot(it.x - j.x, it.y - j.y); if (d - 5 < bs && d < 22 && !inFire(G, it.x, it.y)) { bs = d - 5; best = { it, x: it.x, y: it.y }; } }
          if (G.fuel < 18 && G.food > 0) { const d = Math.hypot(F.x - j.x, F.y - j.y); if (d - 6 < bs) { bs = d - 6; best = { stash: 1, x: F.x + 2, y: F.y }; } }
          j.tg = best;
          if (best) { const cx = Math.floor(best.x), cy = Math.floor(best.y); const p = cqPath(j.x, j.y, cqCellFree(cx, cy) ? cx + 0.5 : best.x, cqCellFree(cx, cy) ? cy + 0.5 : best.y); j.path = p.slice(0, 10); }
          else { j.ang += 0.6; const R = fr + 6 + Math.random() * 3, x = Math.floor(F.x + Math.cos(j.ang) * R), y = Math.floor(F.y + Math.sin(j.ang) * R); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 8); }
        }
      }
      // non entrano nella luce del fuoco; stanno lontani dalle torce (se sono pochi)
      if (j.path.length) cqModeStep(j, dt, j.fear > G.time ? 1.2 : 1.04); else j.walk = 0;
      if (fr && Math.hypot(j.x - F.x, j.y - F.y) < fr * 0.95) { const a = Math.atan2(j.y - F.y, j.x - F.x); j.x = F.x + Math.cos(a) * fr * 0.95; j.y = F.y + Math.sin(a) * fr * 0.95; j.path = []; }
      if (j.cd > G.time || j.fear > G.time) continue;
      const pack = G.jk.filter(o => Math.hypot(o.x - j.x, o.y - j.y) < 2.5).length;
      for (const c of active(G)) {
        const q = P(c), d = Math.hypot(q.x - j.x, q.y - j.y); if (d > 0.75 || inFire(G, q.x, q.y)) continue;
        if (torchOn(G, c) && pack < 2) { j.fear = G.time + 3; j.fx = q.x; j.fy = q.y; break; }
        knock(G, c, 'j'); j.cd = G.time + 9; break;
      }
      if (j.tg && j.tg.car && Math.hypot(j.x - j.tg.x, j.y - j.tg.y) < 1.6 && G.mm.meat > 0 && (j.eat = (j.eat || 0) + dt) > 10) { j.eat = 0; G.mm.meat--; say(G, 'eatc', { v: G.mm.meat }); }
      if (j.tg && j.tg.it && j.tg.it.st === 0 && Math.hypot(j.x - j.tg.it.x, j.y - j.tg.it.y) < 0.7) { j.tg.it.st = 3; j.cd = G.time + 12; say(G, 'stolem', {}); }
      if (j.tg && j.tg.stash && Math.hypot(j.x - j.tg.x, j.y - j.tg.y) < 1 && G.food > 0 && G.fuel < 18) { G.food--; j.cd = G.time + 10; say(G, 'stoler', { v: G.food }); }
    }
  }

  // ======================= CRONACA (stessa su ogni telefono) =======================
  function say(G, k, o) { if (G.guest) return; const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, a = e.a != null ? byId(G, e.a) : null, who = a ? (a === me ? 'Hai' : '<b>' + esc(a.name) + '</b> ha') : '';
    const T = h => cqToast(h);
    switch (e.k) {
      case 'hit': T('🎯 ' + who + ' colpito il mammut! ' + (e.d <= 2 ? 'È allo stremo!' : 'Sanguina: seguite il sangue.')); beep(300, 0.1, 0.05); beep(220, 0.25, 0.05, 0.1); break;
      case 'miss': if (a === me) T(e.j ? '🎯 Mancato lo sciacallo!' : '🎯 Mancato! Raccogli la lancia da terra.'); beep(500, 0.05, 0.02); break;
      case 'jk': T('🐺 ' + who + ' trafitto uno sciacallo!'); beep(700, 0.08, 0.04); break;
      case 'kill': T('🦣 ' + who + ' abbattuto il MAMMUT! Macellatelo e portate la carne al fuoco: ne bastano ' + MEAT_NEED + ' pezzi.'); beep(392, 0.2, 0.06); beep(523, 0.2, 0.06, 0.2); beep(659, 0.4, 0.06, 0.4); break;
      case 'wind': if (a === me) T('🦣 Il mammut sta per CARICARTI! Spostati di lato!'); trumpetSnd(G, 1); break;
      case 'down': { const by = e.b === 'm' ? 'travolto dal mammut' : 'azzannato da uno sciacallo'; T(a === me ? '🤕 Sei stato ' + by + '! Resta giù: un compagno può rialzarti.' : '🤕 <b>' + esc(a.name) + '</b> è stato ' + by + '! Correte a rialzarlo!'); beep(160, 0.3, 0.06); break; }
      case 'up': { const b = byId(G, e.b); T(a === me ? '🤝 <b>' + esc(b ? b.name : '') + '</b> ti ha rialzato!' : '🤝 <b>' + esc(a.name) + '</b> è di nuovo in piedi.'); beep(660, 0.12, 0.04); break; }
      case 'ghost': T(a === me ? '👻 Nessuno è arrivato in tempo… ora guardi la caccia.' : '👻 <b>' + esc(a.name) + '</b> non ce l\'ha fatta.'); break;
      case 'butch': T('🔪 Mammut macellato: ' + e.v + ' pezzi di carne. Un pezzo a testa, al fuoco del campo!'); break;
      case 'home': T('🍖 ' + who + ' portato la carne al fuoco! (' + e.v + '/' + MEAT_NEED + ')'); beep(523, 0.1, 0.04); beep(784, 0.15, 0.04, 0.1); break;
      case 'stolem': T('🐺 Uno sciacallo ha portato via un pezzo di carne!'); break;
      case 'stoler': T('🐺 Gli sciacalli hanno rubato un coniglio dalle scorte! Il fuoco è troppo basso.'); break;
      case 'eatc': T('🐺 Gli sciacalli divorano la carcassa! (restano ' + e.v + ' pezzi)'); break;
      case 'trap': T('🕳️ Il mammut è caduto nella FOSSA! Per qualche secondo non può scappare: colpitelo!'); trumpetSnd(G, 1); break;
      case 'out': T('🦣 Il mammut è uscito dalla fossa!'); break;
      case 'dig': T('🕳️ Fossa pronta! Ora spingete il mammut fin lì (con le urla o le torce).'); break;
      case 'rab': if (a === me) T('🐇 Preso un coniglio! Portalo al fuoco.'); beep(880, 0.06, 0.03); break;
      case 'torch': if (a === me) T('🔥 Torcia accesa: illumina di notte, tiene lontani gli sciacalli e spinge via il mammut.'); break;
      case 'wake': T('🦣 Il mammut si è svegliato!'); break;
      case 'sleep': break;
      case 'night': T('🌙 Notte ' + e.d + ' di ' + e.of + '. Restate vicino al fuoco: nel buio ci sono ' + e.v + ' sciacalli.'); [520, 580, 640, 600, 520].forEach((f, i) => beep(f, 0.22, 0.02, i * 0.16)); break;
      case 'meal': T('🍖 Cena al fuoco: ' + (e.h ? e.h + ' senza coniglio, domani sarete più lenti.' : 'tutti hanno mangiato.')); break;
      case 'dawn': T('🌅 È l\'alba del giorno ' + e.d + '.' + (e.last ? ' Ultimo giorno: stanotte il mammut migra!' : '')); break;
      case 'fire': T('🔥 Il fuoco si è spento! Serve legna, presto!'); beep(200, 0.3, 0.05); break;
      case 'smell': break;
    }
  }
  function trumpetSnd(G, loud) { const v = loud ? 0.06 : 0.035; beep(150, 0.25, v); beep(196, 0.35, v, 0.18); beep(247, 0.5, v, 0.42); }

  // ======================= PERSONAGGI DEL COMPUTER =======================
  function go(G, c, x, y, max) { const p = cqPath(c.x, c.y, x, y); c.path = max ? p.slice(0, max) : p; if (!c.path.length && Math.hypot(x - c.x, y - c.y) < 1.5) c.path = [[x, y]]; }
  function bot(G, c) {
    const F = fireC(), t = cyc(G), m = G.mm, night = dark(G) > 0.4, q = { x: c.x, y: c.y };
    // compagno a terra vicino: lo si rialza
    const dn = G.chars.filter(o => o.alive && o.dn && dist2(o, c) < 22).sort((a, b) => dist2(a, c) - dist2(b, c))[0];
    if (dn && !G.chars.some(o => o !== c && o.bot && o.helpT === dn.id && dist2(o, dn) < dist2(c, dn))) { c.helpT = dn.id; const p = P(dn); go(G, c, p.x, p.y); return; }
    c.helpT = null;
    // carica in arrivo: via di lato
    if (m && (m.st === 'wind' || m.st === 'charge') && Math.hypot(m.x - c.x, m.y - c.y) < 5) { const a = Math.atan2(c.y - m.y, c.x - m.x) + (c.id % 2 ? 1.2 : -1.2), x = Math.floor(c.x + Math.cos(a) * 3), y = Math.floor(c.y + Math.sin(a) * 3); if (cqCellFree(x, y)) go(G, c, x + 0.5, y + 0.5); return; }
    // carne: macellare, prendere, portare
    if (c.mt >= 0) { go(G, c, F.x + 0.5, F.y + 1); return; }
    if (m && m.st === 'dead') {
      if (!G.butch) { if (Math.hypot(m.x - c.x, m.y - c.y) < 2) { if (!c.op) doAct(G, c, { k: 'butch' }); c.path = []; } else go(G, c, m.x, m.y); return; }
      const it = G.meat.filter(i => i.st === 0 && !G.chars.some(o => o !== c && o.bot && o.mtT === i.id)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (it && (c.logs || 0) === 0) { c.mtT = it.id; go(G, c, it.x, it.y); return; }
    }
    // di notte: al fuoco (con la legna se ne ha); i cacciatori col mammut che dorme vicino ci provano con la torcia
    const toDusk = DUSK - t, campD = Math.hypot(F.x - c.x, F.y - c.y);
    if (night || (toDusk < campD / 1.6 + 12 && toDusk > -40 && t < DAWN)) {
      if (c.role === 'h' && night && m && m.st === 'sleep' && G.kn && G.time - G.kn.t < 120 && !G.kn.fuzzy && (c.sp || 0) > 0 && dayN(G) >= 2 && torchOn(G, c)) { if (Math.hypot(m.x - c.x, m.y - c.y) > 4) go(G, c, m.x, m.y, 10); else if (Math.random() < 0.6) doThrow(G, c); return; }
      if ((c.logs || 0) < 2 && G.fuel < 70 && !night) { const i = nearTree(c, 9); if (i >= 0 && toDusk > 6) return chop(G, c, i); }
      if (campD > 1.8) { const a = c.id * 1.7, x = F.x + Math.cos(a) * 1.6, y = F.y + Math.sin(a) * 1.6; go(G, c, x, y); } else { c.path = []; if (night && !torchOn(G, c) && (c.sp || 0) > 0 && Math.random() < 0.1) doAct(G, c, { k: 'torch' }); }
      return;
    }
    // senza lance: si raccolgono (o alla rastrelliera del campo)
    if ((c.sp || 0) === 0) {
      const sp = G.sp.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (sp && Math.hypot(sp.x - c.x, sp.y - c.y) < 16) { go(G, c, sp.x, sp.y); return; }
      go(G, c, F.x + 2, F.y + 1); return;
    }
    // raccoglitori: legna e conigli
    if (c.role === 'g') {
      if ((c.logs || 0) >= LOGS_MAX || ((c.logs || 0) > 0 && G.fuel < 30) || (c.rab || 0) >= RAB_MAX || ((c.rab || 0) > 0 && t > DUSK - 40)) { go(G, c, F.x + 1, F.y); return; }
      if (G.fuel < 85 && (c.logs || 0) < LOGS_MAX && (G.food >= G.chars.filter(o => o.alive).length || c.id % 2 || (c.logs || 0) > 0)) { const i = nearTree(c, 30); if (i >= 0) return chop(G, c, i); }
      const r = G.rab.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (r) { go(G, c, r.x, r.y, 6); return; }
      const b = MP().burrows[(c.id + Math.floor(G.time / 30)) % MP().burrows.length]; go(G, c, b.x, b.y, 12); return;
    }
    // cacciatori: se sanno dov'e' il mammut ci vanno (a tiro di lancia), altrimenti seguono le tracce piu' fresche
    if (m && m.st !== 'dead' && G.kn && G.time - G.kn.t < 40) {
      const d = Math.hypot(m.x - c.x, m.y - c.y), seeIt = d < 11;
      if (seeIt) {
        if (m.st === 'trap' || d < THROW_R - 0.3) { c.path = []; if (Math.random() < 0.55) doThrow(G, c); return; }
        if (G.traps.some(p => !p.used) && Math.random() < 0.08) { const p = G.traps.find(p => !p.used); if ((m.x - c.x) * (p.x - m.x) + (m.y - c.y) * (p.y - m.y) > 0 && Math.hypot(p.x - m.x, p.y - m.y) < 12) doShout(G, c); }
        const a = Math.atan2(c.y - m.y, c.x - m.x) + (c.id % 3 - 1) * 0.5, x = m.x + Math.cos(a) * 4.2, y = m.y + Math.sin(a) * 4.2; go(G, c, x, y, 8); return;
      }
      go(G, c, G.kn.x, G.kn.y, 14); return;
    }
    const tr = G.tr.filter(o => G.time - o.t < 160 && Math.hypot(o.x - c.x, o.y - c.y) < 14 && o.id > (c.trS || 0)).sort((a, b) => b.t - a.t)[0];
    if (tr) { c.trS = tr.id; const x = tr.x + (tr.dx || 0) * 4, y = tr.y + (tr.dy || 0) * 4, cx = Math.floor(x), cy = Math.floor(y); go(G, c, cqCellFree(cx, cy) ? cx + 0.5 : tr.x, cqCellFree(cx, cy) ? cy + 0.5 : tr.y, 12); return; }
    if (!c.path.length) { const L2 = placeList(['eat', 'drink', 'sleep'][Math.floor(Math.random() * 3)]); const p = L2[Math.floor(Math.random() * L2.length)]; if (p) go(G, c, p.x, p.y, 16); }
  }
  function chop(G, c, i) { const t = MP().trees[i], sp = cqSpot(t.x, t.y); if (Math.hypot(t.x + 0.5 - c.x, t.y + 0.5 - c.y) < 1.45) { c.path = []; if (!c.op) doAct(G, c, { k: 'chop', i }); } else if (sp) go(G, c, sp.x, sp.y); }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.tr = []; G.trN = 0; G.trD = new Map(); G.trC = null; G.sp = []; G.spN = 0; G.fly = []; G.shouts = []; G.digs = []; G.dgN = 0; G.traps = []; G.rab = []; G.rbN = 0; G.rabT = 2; G.jk = []; G.jkN = 0;
    G.meat = []; G.home = 0; G.butch = 0; G.cut = {}; G.fall = []; G.lg = []; G.lgN = 0; G.trump = null; G.kn = null; G.ph = 0;
    G.fuel = 42; G.food = 0; G.wind = Math.random() * Math.PI * 2; G.windT = 70; G.windTo = G.wind;
    cq.mapDirty = true;
  }
  function mmStart(G) {
    const C = MP().camp, L2 = placeList('eat').concat(placeList('drink')).filter(p => Math.hypot(p.x - C.x, p.y - C.y) > 22);
    const p = L2.length ? L2[Math.floor(Math.random() * L2.length)] : placeList('eat')[0];
    G.mm = { x: p.x, y: p.y, face: 1, walk: 0, path: [], st: 'walk', tgt: null, hp: 0, max: 0, need: { e: Math.random(), w: Math.random() }, aw: 0, wary: 0, fear: [], mudT: 0, dT: 20, gT: 1, trT: 30, meat: MEAT_N, side: 1 };
    G.mm.max = G.mm.hp = 5 + Math.floor(G.chars.length / 2);
    // un paio di minuti di vita prima della partita: cosi' ci sono gia' tracce da seguire
    for (let i = 0; i < 260; i++) { G.time = -130 + i * 0.5; mmTick(G, 0.5, true); }
    G.time = 0; G.trump = null; if (G.mm.st === 'sleep') { G.mm.st = 'walk'; G.mm.tgt = null; }
  }
  CQ_MODES.mammut = {
    n: 'Caccia al mammut',
    desc: '🦣 Una tribù, un mammut furbo. Seguite le tracce, cacciatelo con lance e fosse, sopravvivete alle notti (fuoco e conigli) e portate la carne al campo prima che migri.',
    maps: [['prateria', 'Prateria']],
    def: { nights: 3, map: 'prateria', n: 6, fill: true },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],
    opts: o => `<div class="row"><div class="lbl">Notti prima che il mammut migri</div>${seg('nights', [[2, '2'], [3, '3'], [4, '4']], o.nights || 3)}</div>`,
    read: d => ({ nights: +d.get('nights') || 3 }),
    start(G) {
      setup(G);
      const bots = G.chars.filter(c => c.bot); bots.forEach((c, i) => { c.role = i % 3 === 2 || (bots.length <= 2 && i === 1) ? 'g' : 'h'; });
      for (const c of G.chars) Object.assign(c, { sp: SPEARS, logs: 0, rab: 0, mt: -1, tor: 0, dn: 0, rv: 0, hun: 0, op: null, hits: 0, rbK: 0, lgK: 0, rvK: 0, mtK: 0, jkK: 0 });
      mmStart(G);
    },
    gstart(G) { setup(G); for (const c of G.chars) Object.assign(c, { sp: SPEARS, logs: 0, rab: 0, mt: -1, tor: 0, dn: 0, rv: 0, hun: 0 }); G.mm = { x: 0, y: 0, face: 1, walk: 0, path: [], st: 'walk', hp: 1, max: 1, need: { e: 0, w: 0 }, fear: [], meat: MEAT_N }; },
    intro: () => '🦣 Trovate il mammut seguendo le tracce. Prima del buio: legna per il fuoco e conigli!',
    speed(c) {
      const G = cq.g; if (!G || !G.tr) return 1; if (!c.alive) return 1.1; if (c.dn) return 0;
      if (c.op) { const q = P(c); if (Math.hypot(q.x - c.op.x, q.y - c.op.y) < 0.6 && G.time - c.op.t0 < 0.4) return 1; }
      return (c.mt >= 0 ? 0.72 : 1) * (1 - 0.07 * (c.logs || 0)) * (c.hun ? 0.85 : 1);
    },
    big(G) {
      const me = G.me, q = { x: cq.x, y: cq.y }, t = cyc(G), m = G.mm; if (!G.tr) return '';
      if (G.won) return '🍖 La tribù ha la sua carne! Festa al fuoco!';
      if (!me.alive) return '👻 Sei un fantasma: guardi la caccia.';
      if (me.dn) return '🤕 A terra! Un compagno vicino ti rialza… (' + Math.ceil(DOWN_T - (G.time - me.dn)) + ' s)';
      if (me.op) return { chop: '🪓 Taglio la legna… resta fermo', dig: G.chars.filter(o => o.op && o.op.k === 'dig' && o.op.i === me.op.i && o.alive && !o.dn).length >= 2 ? '⛏️ Scavate insieme… restate fermi' : '⛏️ Da solo non si scava: serve un compagno vicino a te!', butch: '🔪 Macello il mammut… resta fermo' }[me.op.k] || '';
      if (me.mt >= 0) return '🍖 Porta la carne al fuoco del campo! (pesante)';
      if (m && m.st === 'wind' && Math.hypot(m.x - q.x, m.y - q.y) < 6) return '⚠️ IL MAMMUT STA PER CARICARE! Spostati di lato!';
      if (m && m.sn && m.sn.id === me.id && G.time - m.sn.t < 3) return '👃 Il mammut ti ha fiutato: hai il vento alle spalle!';
      if (t > DUSK - 25 && t < NIGHT && !atCamp(q.x, q.y, 8)) return G.fuel < 30 ? '🌇 Sta per fare buio e il fuoco è quasi spento: portate legna al campo!' : '🌇 Sta per fare buio: torna al fuoco del campo!';
      if (isNight(G) && !inFire(G, q.x, q.y) && !torchOn(G, me)) return '🌑 Sei fuori dalla luce del fuoco: gli sciacalli cacciano al buio…';
      // la traccia piu' vicina sotto i piedi: cosa racconta
      let tb = null, td = 1.15; for (const tr of G.tr) { const d = Math.hypot(tr.x - q.x, tr.y - q.y); if (d < td) { td = d; tb = tr; } }
      if (tb) return trackTxt(G, tb);
      if ((me.logs || 0) || (me.rab || 0)) return '🔥 Porta al fuoco del campo: ' + (me.logs ? '🪵×' + me.logs + ' ' : '') + (me.rab ? '🐇×' + me.rab : '');
      return '';
    },
    hud(G) {
      if (!G.tr) return '🦣 Caccia al mammut';
      const t = cyc(G), d = dayN(G), nightNow = t >= NIGHT && t < DAWN, left = nightNow ? DAWN - t : t < DUSK ? DUSK - t : t < NIGHT ? NIGHT - t : DAY - t + DUSK, last = d >= (G.opt.nights || 3);
      const m = G.mm, hp = m && m.st === 'dead' ? '🦴' : m ? '❤️' + m.hp : '';
      return `🦣 ${hp} · ${nightNow ? '🌙 Notte' : t >= DUSK ? '🌇 Tramonto' : '☀️ Giorno'} ${d}/${G.opt.nights || 3}${last && !nightNow ? ' ⚠️' : ''} · ⏳ ${mmss(left)} · 🔥 ${Math.round(G.fuel)} · 🐇 ${G.food} · 🍖 ${G.home}/${MEAT_NEED} · 💨 ${windArrow(G)}`;
    },
    nameCol: c => c.dn ? '#ff8a6a' : c.hun ? '#e0c060' : null,
    draw: c => { const f = (g, X, Y, TW, L2, w, fc) => tribal(g, X, Y, TW, L2, w, fc, c); return f; },
    extras: G => extras(G),
    btn(G) { const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) { const me = G.me, a = action(G, me); if (!a || !a.on) return; if (G.guest) { cqNetSend({ k: 'a', a: a.k, i: a.i }); if (a.k === 'chop' || a.k === 'dig' || a.k === 'butch') me.op = { k: a.k, i: a.i, t0: G.time, x: cq.x, y: cq.y, local: 1 }; } else doAct(G, me, a); },
    ev(G, c, o) { if (!o) return; if (o.k === 'a') doAct(G, c, { k: o.a, i: o.i }); else if (o.k === 'th') doThrow(G, c, 'any'); else if (o.k === 'sh') doShout(G, c); },
    // su ogni telefono: alberi tagliati, pulsanti, colpi d'ascia, battito quando uno sciacallo e' vicino al buio
    local(G, dt) {
      if (!G.tr) return;
      syncTrees(G); sideHud(G); if ((G.tcT = (G.tcT || 0) - dt) <= 0) { G.tcT = 0.25; trackCells(G); }
      for (const c of G.chars) if (c.op && c.op.k === 'chop' && Math.hypot(c.x - cq.x, c.y - cq.y) < 12 && (c.axT = (c.axT || 0) - dt) <= 0) { c.axT = 0.45; thud(0.9, 480 + Math.random() * 120); }
      for (const c of G.chars) if (c.op && c.op.k === 'dig' && Math.hypot(c.x - cq.x, c.y - cq.y) < 10 && (c.axT = (c.axT || 0) - dt) <= 0) { c.axT = 0.6; thud(0.7, 260); }
      const me = G.me;
      if (me.op && me.op.local && Math.hypot(cq.x - me.op.x, cq.y - me.op.y) > 0.6) me.op = null;
      // passi pesanti del mammut, sciacalli vicini nel buio (battito)
      const now = performance.now();
      if (me.alive && isNight(G) && G.phase === 'play') { let d = 99; for (const j of G.jk) d = Math.min(d, Math.hypot(j.x - cq.x, j.y - cq.y)); if (d < 7 && now > (G.hb || 0)) { const v = 0.02 + 0.05 * (1 - d / 7); beep(55, 0.09, v); beep(50, 0.11, v * 0.8, 0.16); G.hb = now + 360 + d * 110; } }
      if (G.trump && G.trump.t !== G.trHeard && G.time - G.trump.t < 1.5) { G.trHeard = G.trump.t; trumpetSnd(G, G.trump.l); const d = Math.hypot(G.trump.x - cq.x, G.trump.y - cq.y); if (d > 10 && me.alive) cqToast('🦣 Un barrito ' + (d > 30 ? 'lontano' : 'non lontano') + ', ' + IZ.dir(G.trump.x - cq.x, G.trump.y - cq.y) + '.'); }
      if (isNight(G) && (G.howlT = (G.howlT || 8) - dt) <= 0 && G.jk.length && me.alive) { G.howlT = 14 + Math.random() * 14; const j = G.jk[Math.floor(Math.random() * G.jk.length)]; G.howl = { x: j.x, y: j.y, t: performance.now() }; [520, 580, 640, 600, 520].forEach((f, i) => beep(f, 0.22, 0.018, i * 0.16)); }
      G.fly = G.fly.filter(f => G.time - f[4] < 0.6); G.shouts = G.shouts.filter(s => G.time - s[2] < 1.2);
    },
    tick(G, dt) {
      const t = cyc(G), F = fireC();
      // vento che gira piano
      if ((G.windT -= dt) <= 0) { G.windT = 70 + Math.random() * 40; G.windTo = G.wind + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9); }
      G.wind += Math.max(-dt * 0.15, Math.min(dt * 0.15, G.windTo - G.wind));
      // fuoco: si consuma (di piu' di notte)
      const was = G.fuel > 0; G.fuel = Math.max(0, G.fuel - dt * (isNight(G) ? 0.85 : 0.3)); if (was && G.fuel <= 0) say(G, 'fire', {});
      // fasi del giorno: notte (cena, sciacalli), alba
      const ph = t >= NIGHT && t < DAWN ? 1 : 0;
      if (ph !== G.ph) {
        G.ph = ph;
        if (ph) {
          let h = 0; for (const c of G.chars) if (c.alive) { if (G.food > 0) { G.food--; c.hun = 0; } else { c.hun = 1; h++; } }
          say(G, 'meal', { h }); jkSpawn(G);
        } else if (G.time > 10) say(G, 'dawn', { d: dayN(G), last: dayN(G) >= (G.opt.nights || 3) });
      }
      mmTick(G, dt);
      const m = G.mm;
      // chi vede il mammut lo dice agli altri (per il computer)
      if (m.st !== 'dead') for (const c of active(G)) if (canSee(G, c, m.x, m.y) && dxy(c, m.x, m.y) < 10) { G.kn = { x: m.x, y: m.y, t: G.time }; break; }
      rabTick(G, dt); jkTick(G, dt);
      // azioni in corso (tagliare, scavare, macellare): ci si deve stare fermi
      for (const c of active(G)) {
        if (!c.op) continue; const q = P(c);
        if (Math.hypot(q.x - c.op.x, q.y - c.op.y) > 0.6) { c.op = null; continue; }
        if (c.op.k === 'chop' && G.time - c.op.t0 >= CHOP_T) { const i = c.op.i; c.op = null; if (!G.cut[i] && (c.logs || 0) < LOGS_MAX) { G.cut[i] = G.time + REGROW; c.logs = (c.logs || 0) + 1; c.lgK = (c.lgK || 0) + 1; } }
        else if (c.op.k === 'butch' && G.time - c.op.t0 >= BUTCH_T) {
          c.op = null; if (!G.butch && m.st === 'dead') { G.butch = 1; const n = Math.max(0, m.meat); for (let i = 0; i < n; i++) { const a = i / Math.max(1, n) * Math.PI * 2, x = Math.floor(m.x + Math.cos(a) * 1.2), y = Math.floor(m.y + Math.sin(a) * 1.2), s = cqCellFree(x, y) ? { x: x + 0.5, y: y + 0.5 } : cqSpot(Math.floor(m.x), Math.floor(m.y)); G.meat.push({ id: i, st: 0, c: -1, x: s.x, y: s.y }); } say(G, 'butch', { v: n }); }
        }
      }
      for (const d of G.digs.slice()) {
        const n = active(G).filter(c => c.op && c.op.k === 'dig' && c.op.i === d.id).length;
        if (n >= 2) d.p += dt / DIG_T * (n >= 3 ? 1.3 : 1);
        if (d.p >= 1) { G.digs = G.digs.filter(o => o !== d); G.traps.push({ id: d.id, x: d.x, y: d.y, used: 0 }); for (const c of G.chars) if (c.op && c.op.k === 'dig' && c.op.i === d.id) c.op = null; say(G, 'dig', {}); }
      }
      // raccogliere (lance, carne), consegnare al campo (legna, conigli, carne), rialzare i compagni
      for (const c of active(G)) {
        const q = P(c);
        if ((c.sp || 0) < SPEAR_MAX) { const s = G.sp.find(o => Math.hypot(o.x - q.x, o.y - q.y) < 0.75); if (s) { G.sp = G.sp.filter(o => o !== s); c.sp = (c.sp || 0) + 1; } }
        if (c.mt < 0 && !(c.logs || 0)) { const it = G.meat.find(i => i.st === 0 && Math.hypot(i.x - q.x, i.y - q.y) < 0.8); if (it) { it.st = 1; it.c = c.id; c.mt = it.id; } }
        if (atCamp(q.x, q.y, 3.2)) {
          if (c.logs) { G.fuel = Math.min(100, G.fuel + c.logs * LOG_FUEL); c.logs = 0; }
          if (c.rab) { G.food += c.rab; c.rab = 0; }
          if (c.mt >= 0) { const it = G.meat[c.mt]; if (it) { it.st = 2; it.c = -1; } c.mt = -1; c.mtK = (c.mtK || 0) + 1; G.home++; say(G, 'home', { a: c.id, v: G.home }); }
          if (atCamp(q.x, q.y, 2.6) && (c.sp || 0) < SPEARS) c.sp = SPEARS;   // rastrelliera del campo
        }
      }
      for (const c of G.chars) {
        if (!c.alive || !c.dn) continue;
        const h = active(G).find(o => dist2(o, c) < 1.4);
        if (h) { c.rv += dt / REV_T; if (c.rv >= 1) { c.dn = 0; c.rv = 0; h.rvK = (h.rvK || 0) + 1; say(G, 'up', { a: c.id, b: h.id }); } } else c.rv = Math.max(0, c.rv - dt / 6);
        if (c.dn && G.time - c.dn > DOWN_T) { c.alive = false; c.dn = 0; say(G, 'ghost', { a: c.id }); }
      }
      for (const i in G.cut) if (G.cut[i] <= G.time) delete G.cut[i];
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if (c.dn || c.op) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.35 + Math.random() * 0.25; bot(G, c); }
        cqModeStep(c, dt, 0.92 * this.speed(c));
      }
      // fine
      if (G.home >= MEAT_NEED) { G.won = 1; this.finish(G, 1); return; }
      const avail = G.home + G.meat.filter(i => i.st === 0 || i.st === 1).length + (m.st === 'dead' && !G.butch ? Math.max(0, m.meat) : 0) + (m.st !== 'dead' ? MEAT_N : 0);
      if (avail < MEAT_NEED) { this.finish(G, 0, '🐺 Gli sciacalli si sono presi troppa carne: non ne resta abbastanza.'); return; }
      if (!G.chars.some(c => c.alive)) { this.finish(G, 0, '👻 Nessuno della tribù è sopravvissuto.'); return; }
      if (G.time >= endT(G) && m.st !== 'dead') { this.finish(G, 0, '🦣 Il mammut è migrato lontano: la caccia è fallita.'); return; }
      if (G.time >= endT(G) + DAY && G.home < MEAT_NEED) this.finish(G, 0, '🌅 Troppo tardi: la carne non è arrivata al campo.');
    },
    finish(G, win, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— 🎯 ' + (c.hits || 0) + ' · 🪵 ' + (c.lgK || 0) + ' · 🐇 ' + (c.rbK || 0) + ' · 🍖 ' + (c.mtK || 0) + ' · 🤝 ' + (c.rvK || 0) + (c.alive ? '' : ' · 👻')];
      const score = c => (c.hits || 0) * 5 + (c.mtK || 0) * 6 + (c.lgK || 0) + (c.rbK || 0) * 2 + (c.rvK || 0) * 4 + (c.jkK || 0) * 2;
      const rank = G.chars.slice().sort((a, b) => score(b) - score(a)).map(line);
      if (win) cqModeEnd({ t: '🍖 La tribù ce l\'ha fatta!', why: 'Il mammut è stato abbattuto e la carne è al sicuro nel campo (' + G.home + ' pezzi) dopo ' + mmss(G.time) + '.', win: G.chars.map(c => c.id), rank });
      else cqModeEnd({ t: '🦣 Caccia fallita', why: why || 'Il mammut è sfuggito.', win: [], rank });
    },
    // online: lance, legna, conigli, carne in mano, torcia, a terra, rialzo, fame, azione in corso, statistiche
    csnap: c => { const G = cq.g, r = v => Math.max(0, Math.round((v - G.time) * 10) / 10); return [c.sp || 0, c.logs || 0, c.rab || 0, c.mt, r(c.tor || 0), c.dn ? Math.round((G.time - c.dn) * 10) / 10 : 0, Math.round((c.rv || 0) * 100), c.hun ? 1 : 0, c.op ? ({ chop: 1, dig: 2, butch: 3 })[c.op.k] || 0 : 0, c.op ? (c.op.k === 'chop' ? c.op.i : c.op.k === 'dig' ? c.op.i : 0) : 0, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, c.hits || 0, c.lgK || 0, c.rbK || 0, c.mtK || 0, c.rvK || 0, c.jkK || 0]; },
    capply(G, c, a) {
      [c.sp, c.logs, c.rab, c.mt] = a; c.tor = a[4] > 0 ? G.time + a[4] : 0; c.dn = a[5] > 0 ? G.time - a[5] || 0.01 : 0; c.rv = a[6] / 100; c.hun = a[7];
      const k = ['', 'chop', 'dig', 'butch'][a[8]];
      if (k) { if (!(c === G.me && c.op && c.op.local && c.op.k === k)) c.op = { k, i: a[9], t0: G.time - a[10], x: c === G.me ? cq.x : c.x, y: c === G.me ? cq.y : c.y }; else c.op.local = 0; } else if (!(c === G.me && c.op && c.op.local && G.time - c.op.t0 < 0.8)) c.op = null;
      [c.hits, c.lgK, c.rbK, c.mtK, c.rvK, c.jkK] = a.slice(11);
    },
    snap(G) {
      const r = v => Math.round(v * 10) / 10, m = G.mm;
      return { m: [r(m.x), r(m.y), m.face, m.walk ? 1 : 0, m.st, m.hp, m.max, r(m.aw || 0), m.sn ? [m.sn.id, r(m.sn.t)] : 0, m.meat],
        tr: G.tr.filter(t => t.ct > G.time - 6 || G.time < 6).map(t => [t.id, t.k, t.x, t.y, r(t.t), t.dx, t.dy]),
        sp: G.sp.map(s => [s.id, r(s.x), r(s.y)]), fl: G.fly.map(f => f.slice()), sh: G.shouts.map(s => s.slice()),
        dg: G.digs.map(d => [d.id, d.x, d.y, Math.round(d.p * 100)]), tp: G.traps.map(p => [p.id, p.x, p.y, p.used]),
        rb: G.rab.map(o => [o.id, r(o.x), r(o.y), o.face]), jk: G.jk.map(j => [j.id, r(j.x), r(j.y), j.face]),
        me: G.meat.map(i => [i.st, i.c, r(i.x), r(i.y)]), cut: Object.keys(G.cut).map(i => [+i, Math.round(G.cut[i] - G.time)]),
        f: r(G.fuel), fo: G.food, ho: G.home, bu: G.butch, w: Math.round(G.wind * 100) / 100, tu: G.trump ? [G.trump.x, G.trump.y, r(G.trump.t), G.trump.l] : 0, lg: G.lg };
    },
    apply(G, x) {
      if (!G.tr) return;
      const m = G.mm, a = x.m;
      m.tx = a[0]; m.ty = a[1]; if (Math.hypot(m.x - a[0], m.y - a[1]) > 3 || !m.seen) { m.x = a[0]; m.y = a[1]; m.seen = 1; } m.face = a[2]; m.mv = a[3]; m.st = a[4]; m.hp = a[5]; m.max = a[6]; m.aw = a[7]; m.sn = a[8] ? { id: a[8][0], t: a[8][1] } : null; m.meat = a[9];
      const have = new Set(G.tr.map(t => t.id)); for (const t of x.tr) if (!have.has(t[0])) G.tr.push({ id: t[0], k: t[1], x: t[2], y: t[3], t: t[4], dx: t[5], dy: t[6] });
      if (G.tr.length > 420) G.tr.splice(0, G.tr.length - 420);
      G.sp = x.sp.map(s => ({ id: s[0], x: s[1], y: s[2] }));
      for (const f of x.fl) if (!G.fly.some(o => o[4] === f[4] && o[0] === f[0])) G.fly.push(f);
      for (const s of x.sh) if (!G.shouts.some(o => o[2] === s[2] && o[3] === s[3])) G.shouts.push(s);
      G.digs = x.dg.map(d => ({ id: d[0], x: d[1], y: d[2], p: d[3] / 100 })); G.traps = x.tp.map(p => ({ id: p[0], x: p[1], y: p[2], used: p[3] }));
      const mv = (L2, arr) => arr.map(v => { const o = L2.find(q => q.id === v[0]) || { id: v[0], x: v[1], y: v[2], walk: 0 }; o.tx = v[1]; o.ty = v[2]; if (Math.hypot(o.x - v[1], o.y - v[2]) > 3) { o.x = v[1]; o.y = v[2]; } o.face = v[3]; return o; });
      G.rab = mv(G.rab, x.rb); G.jk = mv(G.jk, x.jk);
      G.meat = x.me.map((v, i) => ({ id: i, st: v[0], c: v[1], x: v[2], y: v[3] }));
      G.cut = {}; for (const [i, s] of x.cut || []) G.cut[i] = G.time + s;
      G.fuel = x.f; G.food = x.fo; G.home = x.ho; G.butch = x.bu; G.wind = x.w; G.trump = x.tu ? { x: x.tu[0], y: x.tu[1], t: x.tu[2], l: x.tu[3] } : null;
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
      if (G.home >= MEAT_NEED) G.won = 1;
    },
    // notte: buio pesto tranne il fuoco, la mia torcia e quelle dei compagni
    night(G) {
      if (!G.tr) return null;
      const dk = dark(G), me = G.me; if (dk <= 0) return null;
      if (!me.alive) return { a: 0.45 * dk, r: 6, lights: [], see: () => true };
      const lights = [], src = [], F = fireC(), fr = fireR(G);
      const mine = torchOn(G, me) ? TORCH_L : SEE_N;
      lights.push([cq.x, cq.y, mine + 0.6, 0.95]); src.push([cq.x, cq.y, mine]);
      if (fr) { const fl = fr + 0.6 + Math.sin(performance.now() / 160) * 0.15; lights.push([F.x, F.y, fl, 1]); src.push([F.x, F.y, fr]); }
      for (const c of G.chars) { if (c === me || !c.alive) continue; if (Math.hypot(c.x - cq.x, c.y - cq.y) > 24) continue; const r = torchOn(G, c) ? TORCH_L : 2.2; lights.push([c.x, c.y, r + 0.4, torchOn(G, c) ? 0.9 : 0.6]); src.push([c.x, c.y, r * 0.9]); }
      return { a: 0.96 * dk, r: mine, lights, see: (x, y) => dk < 0.5 || src.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r) };
    },
    deco(g, c, X, Y, TW, G) {
      if (c.op) { const T2 = { chop: CHOP_T, dig: DIG_T, butch: BUTCH_T }[c.op.k] || 3, k = c.op.k === 'dig' ? ((G.digs.find(d => d.id === c.op.i) || {}).p || 0) : Math.min(1, (G.time - c.op.t0) / T2); g.strokeStyle = { chop: '#c8a070', dig: '#a88a5a', butch: '#e05050' }[c.op.k]; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 2.05, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
      if (c.dn) { const k = c.rv || 0; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - 22, Y - TW * 1.45, 44, 8, 4); g.fill(); g.fillStyle = '#7be0a0'; cqRR(g, X - 21, Y - TW * 1.45 + 1, Math.max(3, 42 * k), 6, 3); g.fill(); g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🤕', X, Y - TW * 1.85); }
      // cosa porta: sopra la testa
      const L2 = []; if (c.mt >= 0) L2.push('🍖'); if (c.logs) L2.push('🪵' + (c.logs > 1 ? c.logs : '')); if (c.rab) L2.push('🐇' + (c.rab > 1 ? c.rab : ''));
      if (L2.length && !c.dn) { g.font = Math.round(TW * 0.36) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L2.join(' '), X + TW * 0.55, Y - TW * 1.6); }
      if (torchOn(G, c) && !c.dn) { const f = c === G.me ? cq.face : c.face, x0 = X + f * TW * 0.42, y0 = Y - TW * 1.25, t = performance.now() / 90; g.strokeStyle = '#6b4a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0 + TW * 0.5); g.lineTo(x0, y0); g.stroke(); g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(x0, y0 - 4 - Math.sin(t) * 1.5, 5, 8 + Math.sin(t * 1.3) * 2, 0, 0, 7); g.fill(); g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(x0, y0 - 2, 2.6, 4.5, 0, 0, 7); g.fill(); }
    },
    over(g, G, sx, sy, TW) {
      if (!G.tr) return;
      const W = cq.w, H = cq.h, now = performance.now() / 1000, MN = this.night(G), see = (x, y) => !MN || MN.see(x, y), on = (X, Y, m = 40) => X > -m && X < W + m && Y > -m && Y < H + m;
      const font = (s) => { g.font = s + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; };
      // fiamme del fuoco del campo
      { const F = fireC(), X = sx(F.x, F.y), Y = sy(F.x, F.y); if (on(X, Y) && G.fuel > 0) { const k = Math.min(1, 0.4 + G.fuel / 70); for (let i = 0; i < 3; i++) { const t = now * 6 + i * 2.1, dx = (i - 1) * 6, h = (18 + Math.sin(t) * 5) * k; g.fillStyle = i === 1 ? '#ffd040' : '#ff7a1a'; g.beginPath(); g.moveTo(X + dx - 7 * k, Y - 4); g.quadraticCurveTo(X + dx - 4, Y - h * 0.6, X + dx + Math.sin(t * 1.7) * 2, Y - 4 - h); g.quadraticCurveTo(X + dx + 4, Y - h * 0.6, X + dx + 7 * k, Y - 4); g.fill(); } } if (on(X, Y) && G.fuel <= 0) { g.strokeStyle = 'rgba(200,200,200,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y - 6); g.quadraticCurveTo(X + 6 * Math.sin(now * 2), Y - 18, X, Y - 30); g.stroke(); }
        // scorte: conigli sulla cesta
        const sx2 = sx(F.x + 3, F.y - 1), sy2 = sy(F.x + 3, F.y - 1); if (on(sx2, sy2) && G.food > 0) { font(13); g.fillText('🐇' + (G.food > 1 ? '×' + G.food : ''), sx2, sy2 - TW * 0.75); } }
      // tracce del mammut (solo dove si vede)
      for (const t of G.tr) {   // il vapore dello sterco fresco e delle buche calde (le tracce sono nel terreno)
        if ((t.k !== 'dung' && t.k !== 'bed') || Math.abs(t.x - cq.x) > 14 || Math.abs(t.y - cq.y) > 14 || !see(t.x, t.y)) continue;
        const a = G.time - t.t, warm = t.k === 'dung' ? a < 60 : a < 90 || (G.mm.st === 'sleep' && Math.hypot(G.mm.x - t.x, G.mm.y - t.y) < 1.5); if (!warm) continue;
        const X = sx(t.x, t.y), Y = sy(t.x, t.y), u = TW / 34; if (!on(X, Y)) continue;
        g.strokeStyle = 'rgba(240,240,240,.45)'; g.lineWidth = 1.6; for (let i = 0; i < (t.k === 'bed' ? 3 : 2); i++) { const p = ((now * 0.55 + i * 0.4) % 1), x0 = X + (i - 0.5) * (t.k === 'bed' ? 10 : 6) * u, y0 = Y - 4 * u - p * 18 * u; g.globalAlpha = 1 - p; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 3 * u * Math.sin(now * 3 + i), y0 - 4 * u, x0, y0 - 8 * u); g.stroke(); } g.globalAlpha = 1;
      }
      // fosse in corso e pronte (coperte di rami: le vedono solo i cacciatori)
      for (const d of G.digs) { const X = sx(d.x, d.y), Y = sy(d.x, d.y); if (!on(X, Y) || !see(d.x, d.y)) continue; g.fillStyle = '#4a3420'; g.beginPath(); g.ellipse(X, Y, TW * 0.45 * (0.4 + 0.6 * d.p), TW * 0.22 * (0.4 + 0.6 * d.p), 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - 20, Y - TW * 0.9, 40, 7, 3.5); g.fill(); g.fillStyle = '#e0c060'; cqRR(g, X - 19, Y - TW * 0.9 + 1, Math.max(3, 38 * d.p), 5, 2.5); g.fill(); }
      for (const p of G.traps) { const X = sx(p.x, p.y), Y = sy(p.x, p.y); if (!on(X, Y) || !see(p.x, p.y)) continue; const used = p.used && !(G.mm.st === 'trap' && Math.hypot(G.mm.x - p.x, G.mm.y - p.y) < 0.5); g.fillStyle = used ? '#3a2818' : '#2a1e14'; g.beginPath(); g.ellipse(X, Y, TW * 0.55, TW * 0.27, 0, 0, 7); g.fill(); if (!p.used) { g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X - TW * 0.45, Y + i * 3); g.lineTo(X + TW * 0.45, Y - i * 2); g.stroke(); } g.fillStyle = 'rgba(120,150,60,.75)'; g.beginPath(); g.ellipse(X, Y, TW * 0.3, TW * 0.12, 0, 0, 7); g.fill(); font(11); g.fillText('🕳️', X, Y - TW * 0.55); } }
      // lance a terra, carne a terra
      for (const s of G.sp) { const X = sx(s.x, s.y), Y = sy(s.x, s.y); if (!on(X, Y) || !see(s.x, s.y)) continue; g.strokeStyle = '#8a6a42'; g.lineWidth = 3; g.beginPath(); g.moveTo(X - 13, Y + 3); g.lineTo(X + 13, Y - 5); g.stroke(); g.fillStyle = '#d8d0c0'; g.beginPath(); g.moveTo(X + 13, Y - 5); g.lineTo(X + 19, Y - 8); g.lineTo(X + 12, Y - 9); g.fill(); g.fillStyle = 'rgba(255,240,160,.25)'; g.beginPath(); g.ellipse(X, Y, 16, 7, 0, 0, 7); g.fill(); }
      for (const it of G.meat) { if (it.st !== 0) continue; const X = sx(it.x, it.y), Y = sy(it.x, it.y); if (!on(X, Y) || !see(it.x, it.y)) continue; g.fillStyle = 'rgba(255,200,160,' + (0.25 + Math.sin(now * 3 + it.id) * 0.08) + ')'; g.beginPath(); g.ellipse(X, Y, 15, 7, 0, 0, 7); g.fill(); font(20); g.fillText('🍖', X, Y - 8); }
      // lance in volo
      for (const f of G.fly) { const k = Math.min(1, (G.time - f[4]) / 0.35); if (k >= 1) continue; const x = f[0] + (f[2] - f[0]) * k, y = f[1] + (f[3] - f[1]) * k, X = sx(x, y), Y = sy(x, y) - TW * (0.9 + Math.sin(k * Math.PI) * 0.6), a = Math.atan2(sy(f[2], f[3]) - sy(f[0], f[1]), sx(f[2], f[3]) - sx(f[0], f[1])); g.save(); g.translate(X, Y); g.rotate(a); g.strokeStyle = '#8a6a42'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.lineTo(12, 0); g.stroke(); g.fillStyle = '#d8d0c0'; g.beginPath(); g.moveTo(12, -3); g.lineTo(19, 0); g.lineTo(12, 3); g.fill(); g.restore(); }
      // urla: onde
      for (const s of G.shouts) { const k = (G.time - s[2]) / 1.2; if (k < 0 || k >= 1) continue; const X = sx(s[0], s[1]), Y = sy(s[0], s[1]) - TW; g.strokeStyle = 'rgba(255,230,160,' + (0.7 * (1 - k)) + ')'; g.lineWidth = 3; for (const o of [0, 0.3]) { const r = (0.5 + Math.max(0, k - o) * 5) * TW; if (k > o) { g.beginPath(); g.ellipse(X, Y + TW, r, r * 0.5, 0, 0, 7); g.stroke(); } } }
      const m = G.mm;
      // il mammut: punto interrogativo che si riempie se si sta accorgendo di qualcuno, naso se ha fiutato, "!" rosso prima della carica, zzz se dorme
      if (m && m.st !== 'dead' && see(m.x, m.y)) {
        const X = sx(m.x, m.y), Y = sy(m.x, m.y) - TW * 2.35;
        if (on(X, Y)) {
          if (m.st === 'wind' || m.st === 'charge') { font(26); g.fillStyle = '#ff3a2a'; g.fillText('❗', X, Y - 6 + Math.sin(now * 20) * 2); }
          else if (m.st === 'sleep') { font(14); g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const p = (now * 0.5 + i / 3) % 1; g.globalAlpha = 1 - p; g.fillText('z', X + 10 + p * 14, Y - p * 22); } g.globalAlpha = 1; }
          else if (m.sn && G.time - m.sn.t < 2.5) { font(20); g.fillText('👃', X, Y); }
          else if ((m.aw || 0) > 0.25 && m.st !== 'flee' && m.st !== 'trap') { const k = Math.min(1, m.aw); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(X, Y, 11, 0, 7); g.fill(); g.strokeStyle = k > 0.75 ? '#ff6a4a' : '#ffd060'; g.lineWidth = 3; g.beginPath(); g.arc(X, Y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); font(13); g.fillStyle = '#fff'; g.fillText('?', X, Y + 1); }
        }
      }
      // occhi rossi degli sciacalli nel buio (quelli che non si vedono ancora)
      if (MN && dark(G) > 0.5) for (const j of G.jk) {
        if (see(j.x, j.y) || Math.hypot(j.x - cq.x, j.y - cq.y) > 13) continue;
        const X = sx(j.x, j.y), Y = sy(j.x, j.y) - TW * 0.55; if (!on(X, Y)) continue;
        const blink = Math.sin(now * 2.3 + j.id * 1.7) > 0.93 ? 0.15 : 1; g.fillStyle = 'rgba(255,40,30,' + (0.85 * blink) + ')';
        for (const dx of [-3.5, 3.5]) { g.beginPath(); g.ellipse(X + dx * (j.face || 1), Y, 2.6, 1.8, 0, 0, 7); g.fill(); }
      }
      // ululato: freccia sul bordo verso lo sciacallo che ulula
      if (G.howl && performance.now() - G.howl.t < 2200) edge(g, sx(G.howl.x, G.howl.y), sy(G.howl.x, G.howl.y), W, H, '🐺', 'rgba(255,90,70,.9)');
      // barrito: freccia sul bordo per qualche secondo
      if (G.trump && G.time - G.trump.t < 4) { const X = sx(G.trump.x, G.trump.y), Y = sy(G.trump.x, G.trump.y); edge(g, X, Y, W, H, '🦣', '#e0b84a'); }
      // freccia verso il fuoco: quando porto qualcosa, al tramonto e di notte se sono lontano
      { const F = fireC(), me = G.me, t = cyc(G); if (me.alive && !me.dn && (me.mt >= 0 || me.logs || me.rab || (t > DUSK - 25 && t < DAWN)) && !atCamp(cq.x, cq.y, 6)) edge(g, sx(F.x, F.y), sy(F.x, F.y), W, H, '🔥', '#ff9a40'); }
      // rosa del vento in alto a destra
      { const X = W - 34, Y = 150, a = G.wind, sxv = Math.cos(a) - Math.sin(a), syv = (Math.cos(a) + Math.sin(a)) / 2, an = Math.atan2(syv, sxv);
        g.fillStyle = 'rgba(20,22,28,.6)'; g.beginPath(); g.arc(X, Y, 22, 0, 7); g.fill(); g.save(); g.translate(X, Y); g.rotate(an); g.strokeStyle = '#e8f4ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 0); g.lineTo(11, 0); g.stroke(); g.fillStyle = '#e8f4ff'; g.beginPath(); g.moveTo(14, 0); g.lineTo(5, -6); g.lineTo(5, 6); g.fill(); g.restore(); font(11); g.fillStyle = '#fff'; g.fillText('💨', X, Y + 32); }
    }
  };
  function windArrow(G) { const a = G.wind; return arrowOf(Math.cos(a), Math.sin(a)); }
  function edge(g, X, Y, W, H, icon, col) {
    const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
    const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
    g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
    g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
  }
  function syncTrees(G) {
    MP().trees.forEach((t, i) => {
      const want = G.cut[i] ? 1 : 0; if ((t.cut ? 1 : 0) === want) return;
      t.cut = want; cqSolid[t.y][t.x] = want ? { prop: 'stump', o: {} } : { prop: 'tree', o: t };
      cqBgCell(t.x, t.y);
      if (want && G.time > 0.5 && Math.hypot(t.x - cq.x, t.y - cq.y) < 14) thud(1.2, 120);
    });
  }

  // ======================= PERSONAGGI DISEGNATI =======================
  // la tribu': pelliccia sulle spalle e maschera dipinta sul viso (sopra al personaggio di ognuno). A terra: sdraiato
  function tribal(g, X, Y, TW, L2, w, f, c) {
    const u = TW / 34;
    if (c.dn) { g.save(); g.translate(X, Y - 4 * u); g.rotate(f > 0 ? -1.35 : 1.35); g.translate(0, 6 * u); cqPlayer(g, 0, 0, TW, L2, 0, f); g.restore(); return; }
    if (!c.alive) g.globalAlpha = 0.45;
    cqPlayer(g, X, Y, TW, L2, w, f);
    const top = cqTop(L2) * TW, sh = Y - top * 0.5, ey = Y - top * 0.72;
    // pelliccia: mantella arruffata sulle spalle
    g.fillStyle = '#7a5434'; g.beginPath(); g.ellipse(X, sh, 13 * u, 6 * u, 0, Math.PI, 0); g.lineTo(X + 13 * u, sh);
    for (let i = 0; i <= 8; i++) { const x = X + 13 * u - i * 26 * u / 8, y = sh + (i % 2 ? 7 : 3) * u; g.lineTo(x, y); } g.closePath(); g.fill();
    g.fillStyle = '#9a7048'; g.beginPath(); g.ellipse(X - 3 * u, sh - 1 * u, 7 * u, 2.5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(X + 5 * u, sh + 1 * u, 1.6 * u, 0, 7); g.fill();   // dente d'osso
    // maschera: osso dipinto con due righe e una piuma
    const mx = X + f * 4 * u; g.fillStyle = '#ece2c8'; g.beginPath(); g.ellipse(mx, ey + 1 * u, 7.5 * u, 6 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#c0392b'; g.fillRect(mx - 6 * u, ey - 1.5 * u, 12 * u, 1.6 * u); g.fillStyle = '#2a2018'; g.fillRect(mx - 5 * u, ey + 2.8 * u, 10 * u, 1.2 * u);
    g.fillStyle = '#1a140e'; for (const dx of [-2.6, 2.6]) { g.beginPath(); g.ellipse(mx + dx * u, ey + 0.6 * u, 1.5 * u, 1.2 * u, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#d8402a'; g.lineWidth = 2.2 * u; g.beginPath(); g.moveTo(mx - f * 5 * u, ey - 4 * u); g.quadraticCurveTo(mx - f * 9 * u, ey - 11 * u, mx - f * 6 * u, ey - 15 * u); g.stroke();
    g.globalAlpha = 1;
  }
  // il mammut: grande, peloso, con le zanne; dorme sdraiato, cade su un fianco, nella fossa si vede solo meta'
  function drawMammoth(g, X, Y, TW, mm) {
    const u = TW / 34, f = mm.face || 1, st = mm.st, t = performance.now() / 1000, w = mm.walkA || 0;
    const sleep = st === 'sleep', dead = st === 'dead', trap = st === 'trap', wind = st === 'wind';
    g.save();
    if (trap) { g.fillStyle = '#2a1e14'; g.beginPath(); g.ellipse(X, Y, 44 * u, 20 * u, 0, 0, 7); g.fill(); g.beginPath(); g.rect(X - 60 * u, Y - 90 * u, 120 * u, 92 * u); g.clip(); g.translate(0, 26 * u); }
    if (wind) g.translate(Math.sin(t * 40) * 1.5 * u, 0);
    // ombra
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(X, Y, 42 * u, 13 * u, 0, 0, 7); g.fill();
    if (dead) {
      g.fillStyle = '#5a3a22'; g.beginPath(); g.ellipse(X, Y - 14 * u, 40 * u, 17 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4628'; g.beginPath(); g.ellipse(X - 4 * u, Y - 20 * u, 30 * u, 9 * u, 0, 0, 7); g.fill();
      g.strokeStyle = '#f2ead8'; g.lineWidth = 5 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(X + f * 30 * u, Y - 10 * u); g.quadraticCurveTo(X + f * 52 * u, Y - 4 * u, X + f * 50 * u, Y - 22 * u); g.stroke();
      if (mm.meat <= 0 || (cq.g && cq.g.butch)) { g.strokeStyle = '#e8e0cc'; g.lineWidth = 3 * u; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(X - 24 * u + i * 11 * u, Y - 12 * u); g.quadraticCurveTo(X - 20 * u + i * 11 * u, Y - 34 * u, X - 14 * u + i * 11 * u, Y - 12 * u); g.stroke(); } }
      g.restore(); return;
    }
    const body = '#6e4628', dark2 = '#55341c', hair = '#7e5432';
    const lift = sleep ? 14 * u : 0;
    // zampe (si muovono camminando)
    if (!sleep) for (const [dx, ph] of [[-22, 0], [-10, Math.PI], [12, Math.PI], [24, 0]]) { const s = Math.sin(w + ph) * 4 * u; g.fillStyle = ph ? dark2 : body; g.fillRect(X + dx * u * f - 6 * u + s * f, Y - 24 * u, 12 * u, 24 * u - Math.max(0, -s)); g.fillStyle = '#3a2614'; g.fillRect(X + dx * u * f - 6 * u + s * f, Y - 3 * u, 12 * u, 3 * u); }
    // corpo con il pelo lungo che pende
    g.fillStyle = body; g.beginPath(); g.ellipse(X - f * 4 * u, Y - 40 * u + lift, 36 * u, 24 * u, 0, 0, 7); g.fill();
    g.fillStyle = hair; for (let i = 0; i < 10; i++) { const x = X - f * 4 * u - 32 * u + i * 7 * u; g.beginPath(); g.moveTo(x, Y - 30 * u + lift); g.lineTo(x + 3.5 * u, Y - (18 + (i % 3) * 3) * u + lift); g.lineTo(x + 7 * u, Y - 30 * u + lift); g.fill(); }
    g.fillStyle = '#8a5e38'; g.beginPath(); g.ellipse(X - f * 10 * u, Y - 54 * u + lift, 22 * u, 9 * u, 0, 0, 7); g.fill();   // dorso piu' chiaro
    // gobba e testa
    g.fillStyle = body; g.beginPath(); g.ellipse(X + f * 22 * u, Y - 52 * u + lift, 15 * u, 16 * u, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(X + f * 30 * u, Y - 40 * u + lift, 14 * u, 15 * u, 0, 0, 7); g.fill();
    g.fillStyle = dark2; g.beginPath(); g.ellipse(X + f * 21 * u, Y - 42 * u + lift, 7 * u, 9 * u, 0, 0, 7); g.fill();   // orecchio
    // proboscide (si alza prima della carica, ondeggia camminando)
    const tr = wind ? -1 : Math.sin(t * 1.6) * 0.25;
    g.strokeStyle = body; g.lineWidth = 9 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(X + f * 38 * u, Y - 36 * u + lift);
    if (wind) g.quadraticCurveTo(X + f * 58 * u, Y - 50 * u, X + f * 52 * u, Y - 70 * u); else g.quadraticCurveTo(X + f * (46 + tr * 6) * u, Y - 20 * u + lift, X + f * (42 + tr * 10) * u, Y - (sleep ? 12 : 4) * u + lift * 0.3);
    g.stroke(); g.strokeStyle = dark2; g.lineWidth = 1.5 * u; for (let i = 0; i < 4; i++) { const k = 0.3 + i * 0.15; g.beginPath(); g.moveTo(X + f * (40 + k * 6) * u - 4 * u, Y - (36 - k * 26) * u + lift); g.lineTo(X + f * (40 + k * 6) * u + 4 * u, Y - (36 - k * 26) * u + lift); g.stroke(); }
    // zanne
    g.strokeStyle = '#f2ead8'; g.lineWidth = 4.5 * u; g.beginPath(); g.moveTo(X + f * 36 * u, Y - 32 * u + lift); g.quadraticCurveTo(X + f * 56 * u, Y - 24 * u + lift, X + f * 54 * u, Y - 44 * u + lift); g.stroke();
    g.strokeStyle = '#ded4bc'; g.lineWidth = 3.5 * u; g.beginPath(); g.moveTo(X + f * 32 * u, Y - 31 * u + lift); g.quadraticCurveTo(X + f * 48 * u, Y - 20 * u + lift, X + f * 47 * u, Y - 38 * u + lift); g.stroke();
    // occhio (chiuso se dorme)
    if (sleep) { g.strokeStyle = '#1a120a'; g.lineWidth = 1.5 * u; g.beginPath(); g.moveTo(X + f * 30 * u - 2.5 * u, Y - 45 * u + lift); g.lineTo(X + f * 30 * u + 2.5 * u, Y - 45 * u + lift); g.stroke(); }
    else { g.fillStyle = wind ? '#ff3a2a' : '#1a120a'; g.beginPath(); g.arc(X + f * 31 * u, Y - 46 * u + lift, 2 * u, 0, 7); g.fill(); }
    // ferite: lance piantate nel fianco
    const hurt = mm.max - mm.hp; g.strokeStyle = '#8a6a42'; g.lineWidth = 2.5 * u; for (let i = 0; i < Math.min(4, hurt); i++) { const x0 = X - f * (16 - i * 9) * u, y0 = Y - (44 + (i % 2) * 6) * u + lift; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - f * 10 * u, y0 - 16 * u); g.stroke(); }
    g.restore();
  }
  function drawRabbit(g, X, Y, TW, r) {
    const u = TW / 34, f = r.face || 1, hop = Math.abs(Math.sin((r.walk || 0) * 1.2)) * 5 * u;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(X, Y, 8 * u, 3 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#9a8268'; g.beginPath(); g.ellipse(X, Y - 6 * u - hop, 8 * u, 5.5 * u, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(X + f * 6 * u, Y - 10 * u - hop, 4.5 * u, 4 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#8a7258'; g.beginPath(); g.ellipse(X + f * 5 * u, Y - 17 * u - hop, 1.6 * u, 5 * u, -0.2 * f, 0, 7); g.fill(); g.beginPath(); g.ellipse(X + f * 7.5 * u, Y - 17 * u - hop, 1.6 * u, 5 * u, 0.2 * f, 0, 7); g.fill();
    g.fillStyle = '#f4f0e8'; g.beginPath(); g.arc(X - f * 8 * u, Y - 7 * u - hop, 2.4 * u, 0, 7); g.fill();
    g.fillStyle = '#1a120a'; g.beginPath(); g.arc(X + f * 8 * u, Y - 11 * u - hop, 0.9 * u, 0, 7); g.fill();
  }
  function drawJackal(g, X, Y, TW, j) {
    const u = TW / 34, f = j.face || 1, w = j.walk || 0, nt = cq.g && dark(cq.g) > 0.5;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y, 14 * u, 4 * u, 0, 0, 7); g.fill();
    for (const [dx, ph] of [[-8, 0], [-4, Math.PI], [5, Math.PI], [9, 0]]) { const s = Math.sin(w * 1.3 + ph) * 2.5 * u; g.strokeStyle = '#8a7048'; g.lineWidth = 2.6 * u; g.beginPath(); g.moveTo(X + f * dx * u, Y - 10 * u); g.lineTo(X + f * dx * u + s * f, Y); g.stroke(); }
    g.fillStyle = '#a88a58'; g.beginPath(); g.ellipse(X, Y - 13 * u, 12 * u, 5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#7a6040'; g.beginPath(); g.ellipse(X - 2 * u, Y - 16 * u, 8 * u, 2 * u, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a7048'; g.lineWidth = 3.5 * u; g.beginPath(); g.moveTo(X - f * 11 * u, Y - 14 * u); g.quadraticCurveTo(X - f * 18 * u, Y - 12 * u, X - f * 19 * u, Y - 6 * u); g.stroke();
    g.fillStyle = '#a88a58'; g.beginPath(); g.moveTo(X + f * 9 * u, Y - 16 * u); g.lineTo(X + f * 20 * u, Y - 15 * u); g.lineTo(X + f * 11 * u, Y - 22 * u); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(X + f * 10 * u, Y - 21 * u); g.lineTo(X + f * 12 * u, Y - 28 * u); g.lineTo(X + f * 14 * u, Y - 21 * u); g.fill();
    g.fillStyle = nt ? '#ff3020' : '#1a120a'; g.beginPath(); g.arc(X + f * 14 * u, Y - 18 * u, (nt ? 1.6 : 1) * u, 0, 7); g.fill();
  }
  // il mammut, i conigli e gli sciacalli si disegnano come persone in piu' (senza nome); il mammut ha il riquadro grande
  function extras(G) {
    const out = [], m = G.mm; if (!G.tr || !m) return out;
    const lerp = o => { if (o.tx == null || !G.guest) return; o.x += (o.tx - o.x) * 0.2; o.y += (o.ty - o.y) * 0.2; };
    if (G.guest) { lerp(m); if (m.mv) m.walk = (m.walk || 0) + 0.25; }
    m.walkA = m.walk || 0;
    const md = (g, X, Y, TW) => drawMammoth(g, X, Y, TW, m); md.big = 1;
    out.push({ x: m.x, y: m.y, dr: md, name: null, mam: 1 });
    for (const r of G.rab) { lerp(r); if (G.guest) r.walk = (r.walk || 0) + 0.3; out.push({ x: r.x, y: r.y, dr: (g, X, Y, TW) => drawRabbit(g, X, Y, TW, r), name: null }); }
    for (const j of G.jk) { lerp(j); if (G.guest) j.walk = (j.walk || 0) + 0.3; out.push({ x: j.x, y: j.y, dr: (g, X, Y, TW) => drawJackal(g, X, Y, TW, j), name: null }); }
    return out;
  }
  // pulsanti a sinistra: 🎯 lancia (Q) e 📣 urla (R)
  function sideHud(G) {
    const b = document.getElementById('mmThrow'), s = document.getElementById('mmShout'); if (!b || !s) return;
    const me = G.me, tg = me.alive && !me.dn ? throwTarget(G, me) : null, n = me.sp || 0, on = !!(tg && n > 0 && (me.thT || 0) <= G.time);
    const t = '🎯' + n; if (b.textContent !== t) b.textContent = t; if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
    const so = me.alive && !me.dn && (me.shT || 0) <= G.time, st = so ? '📣' : '📣' + Math.ceil((me.shT || 0) - G.time); if (s.textContent !== st) s.textContent = st; if (s.classList.contains('on') !== so) s.classList.toggle('on', so);
  }
  function throwBtn() { const G = cq.g; if (!G || G.mode !== 'mammut' || G.phase !== 'play' || G.pre > 0) return; const me = G.me; if (!throwTarget(G, me) || (me.sp || 0) <= 0) { beep(180, 0.05, 0.03); return; } if (G.guest) { cqNetSend({ k: 'th' }); me.thT = G.time + 1.1; } else doThrow(G, me, 'any'); }
  function shoutBtn() { const G = cq.g; if (!G || G.mode !== 'mammut' || G.phase !== 'play' || G.pre > 0) return; const me = G.me; if ((me.shT || 0) > G.time || !me.alive || me.dn) return; [300, 260, 330].forEach((f, i) => beep(f, 0.12, 0.05, i * 0.08)); if (G.guest) { cqNetSend({ k: 'sh' }); me.shT = G.time + SHOUT_CD; G.shouts.push([cq.x, cq.y, G.time, me.id]); } else doShout(G, me); }
  if (!document.getElementById('mmCss')) {
    const st = document.createElement('style'); st.id = 'mmCss';
    st.textContent = '#mmThrow,#mmShout{position:absolute;border-radius:50%;border:0;font:inherit;font-weight:800;background:#5d6578;color:#c9ccd4;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#mmThrow{left:18px;bottom:142px;width:86px;height:86px;font-size:24px}#mmShout{left:112px;bottom:150px;width:62px;height:62px;font-size:19px}#mmThrow.on{background:#b8662a;color:#fff}#mmShout.on{background:#8a6a2a;color:#fff}';
    document.head.appendChild(st);
    const host = document.getElementById('ciack');
    const mk = (id, fn) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.hidden = true; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); if (host) host.appendChild(b); return b; };
    const tb = mk('mmThrow', throwBtn), sb = mk('mmShout', shoutBtn);
    window.addEventListener('keydown', e => { const k = e.key && e.key.toLowerCase(); if (!cq.g || cq.g.mode !== 'mammut' || !cq.on) return; if (k === 'q') throwBtn(); else if (k === 'r') shoutBtn(); });
    setInterval(() => { const G = cq.g, live = !!(G && G.mode === 'mammut' && G.phase === 'play' && G.tr && G.pre <= 0 && G.me.alive && $('#cqTask').hidden && !$('#ciack').hidden); if (tb.hidden === live) { tb.hidden = !live; sb.hidden = !live; } }, 300);
  }
  window.__mm = { mmTick, doThrow, doShout, knock, cyc, dark, trackTxt };
});
