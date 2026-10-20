// ASSEDIO AL CASTELLO (a squadre). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa il MODULO SQUADRE comune (giochi/lib/squadre.js): squadre, ricomparsa, voce, cerchio, freccia sul bordo, fine partita.
// CASTELLO DI ROCCAFORTE, mappa FISSA (si impara), UNA SOLA MAPPA IN COMUNE: il castello sorge sul lago (a nord e a ovest l'acqua),
// davanti la campagna con l'accampamento degli attaccanti. Mura alte con il CAMMINAMENTO (altezze del motore: CQ_MAP.hz), quattro torri
// agli angoli, il portone tra due torri col ponte levatoio sul fossato, il cortile, il MASTIO con la terrazza e la BANDIERA.
// DUE TEMPI: una squadra attacca e l'altra difende, poi si cambia. Gli attaccanti prendono le SCALE all'accampamento, le appoggiano alle
// mura (lato sud ed est), salgono, rubano la bandiera e la portano all'accampamento. I difensori tirano frecce e ROVESCIANO le scale.
// Vince chi conquista prima (o chi conquista, se l'altra squadra non ce la fa). Tutti hanno l'ARCO: si mira tirando indietro come una fionda.
// 3 CUORI sopra la testa: a zero si cade e si torna alla base dopo qualche secondo.
CQ_WAIT.assedio = cqLib('squadre').then(L => {
  const SQ = L.squadre, TEAMS = SQ.TEAMS;
  const W = 64, H = 60, HB = 0.8, WZ = 4, TZ = 5, RZ = 2;   // altezza di un livello (U), camminamento, torri, terrazza del mastio
  const HP = 3, RESP = 5, SAFE = 2.5, RELOAD = 1.0, RMAX = 12, RMIN = 1.6, CLIMB = 1.5, DOWN = 1.0, PUSH = 1.5, CARRY_L = 0.78, CARRY_F = 0.95;
  const GRAB = 0.95, BACK = 25, CAMP_R = 3.2, NLAD = 3, IV = 7;
  const CAMP = { x: 53.5, y: 50.5 }, CAMPS = { x: 53.5, y: 53.5 }, FLAG0 = { x: 16.5, y: 18.6 }, YARD = { x: 23.5, y: 23.5 };
  const mmss = t => Math.floor(Math.max(0, t) / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const dead = (G, c) => (c.dn || 0) > G.time;
  const safe = (G, c) => (c.sf || 0) > G.time;
  const atkT = G => G.half === 1 ? G.a0 : 1 - G.a0;
  const isAtk = (G, c) => c.t === atkT(G);
  const hT = G => G.time - G.hs;
  const inIv = G => G.iv > G.time;
  const hzAt = (x, y) => cqHc(Math.floor(x), Math.floor(y));
  const zAt = (x, y) => hzAt(x, y) * HB;

  // ======================= MAPPA: CASTELLO DI ROCCAFORTE (fissa) =======================
  // il castello: quadrato 8..35 (mura spesse 3: fuori il parapetto coi merli, dentro il camminamento), torri 4x4 agli angoli che sporgono di 1,
  // portone a sud (x 21-23) tra due torri di guardia, cortile 11..32, mastio 11..16 con la terrazza davanti
  const inBox = (x, y) => x >= 8 && x <= 35 && y >= 8 && y <= 35;
  const TOWERS = [[7, 7, 'NW'], [33, 7, 'NE'], [7, 33, 'SW'], [33, 33, 'SE']];
  const GTOW = [[17, 32], [24, 32]];   // torri del portone (4 x 5, sporgono fino a y 36)
  const inTower = (x, y) => TOWERS.some(([a, b]) => x >= a && x <= a + 3 && y >= b && y <= b + 3) || GTOW.some(([a, b]) => x >= a && x <= a + 3 && y >= b && y <= b + 4);
  const inGate = (x, y) => x >= 21 && x <= 23 && y >= 32 && y <= 36;
  const inYard = (x, y) => x >= 11 && x <= 32 && y >= 11 && y <= 32;
  const castle = (x, y) => (inBox(x, y) || inTower(x, y));
  const inKeep = (x, y) => x >= 11 && x <= 16 && y >= 11 && y <= 16;
  const inMoat = (x, y) => y >= 37 && y <= 38 && ((x >= 15 && x <= 20) || (x >= 24 && x <= 29));
  function lake(x, y) {
    if (castle(x, y)) return false;
    if ((x <= 7 && y <= 37) || (y <= 7 && x <= 37)) return true;
    if (x + 1.6 * Math.sin(y * 0.41) + 1.2 < 6 && y < 52) return true;
    if (y + 1.6 * Math.sin(x * 0.37) + 1.2 < 6 && x < 54) return true;
    return x + y < 18;
  }
  // scale: dove si possono appoggiare (casella del piede accanto al parapetto), da dove si sale e dove si arriva sul camminamento
  function spotsOf() {
    const S = [];
    for (let y = 11; y <= 32; y++) S.push({ w: 'E', fx: 36, fy: y, ax: 37.5, ay: y + 0.5, tx: 34.5, ty: y + 0.5 });
    for (const x of [11, 12, 13, 14, 15, 16, 28, 29, 30, 31, 32]) S.push({ w: 'S', fx: x, fy: 36, ax: x + 0.5, ay: 37.5, tx: x + 0.5, ty: 34.5 });
    return S;
  }
  function mapCastle() {
    const rooms = [], props = [], deco = [], holes = [], lamps = [], hz = [];
    for (let y = 0; y < H; y++) hz.push(new Uint8Array(W));
    const R = (n, x, y, w, h, k, c, ala, o) => { rooms.push(Object.assign({ n, x, y, w, h, k, c, wc: '#3a5a30', ala }, o || {})); return rooms.length - 1; };
    const pp = (t, x, y, o) => { if (x >= 0 && y >= 0 && x < W && y < H) props.push([t, x, y, o]); };
    const Z = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) hz[y][x] = z; };
    const GRASS = ['#4f7a34', '#4b7631'], DIRT = ['#7a6142', '#755d3f'], STONE = ['#8f897d', '#8a8478'], COB = ['#7c766b', '#787267'], WOOD = ['#7a5432', '#74502f'], TOWF = ['#857f73', '#817b6f'], TERR = ['#948d80', '#8f887b'];
    // ---------------- CAMPAGNA e ACCAMPAMENTO ----------------
    const hall = R('Campagna', 1, 1, 62, 58, 'agrass', GRASS, 'O', { nl: 1 });
    R('Accampamento', 45, 43, 16, 14, 'adirt', DIRT, 'K', { lx: 53, ly: 56.2 });
    // ---------------- CASTELLO ----------------
    R('Mura', 8, 8, 28, 28, 'astone', STONE, 'M', { nl: 1 });
    for (const [a, b] of TOWERS) R('Torre', a, b, 4, 4, 'atower', TOWF, 'T', { nl: 1 });
    for (const [a, b] of GTOW) R('Torre del portone', a, b, 4, 5, 'atower', TOWF, 'T', { nl: 1 });
    R('Cortile', 11, 11, 22, 22, 'acob', COB, 'C', { lx: 25, ly: 31.2 });
    R('Portone', 21, 32, 3, 5, 'acob', COB, 'G', { nl: 1 });
    R('Ponte levatoio', 21, 37, 3, 2, 'awood', WOOD, 'B', { nl: 1 });
    R('Mastio', 11, 11, 10, 10, 'aterr', TERR, 'P', { nl: 1 });
    // il lago (a nord e a ovest: il castello sorge sull'acqua) e il fossato davanti al portone
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lake(x, y) || inMoat(x, y)) holes.push([x, y, 1, 1]);
    // ALTEZZE: mura (camminamento e parapetto) a WZ, torri a TZ, portone a terra, scale interne, terrazza del mastio
    for (let y = 8; y <= 35; y++) for (let x = 8; x <= 35; x++) if (!inYard(x, y)) hz[y][x] = WZ;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inTower(x, y)) hz[y][x] = TZ;
    Z(21, 32, 23, 36, 0);
    const stair = (cells) => cells.forEach(([x, y, z]) => { hz[y][x] = z; });
    for (const y of [24, 25]) stair([[32, y, 3], [31, y, 2], [30, y, 1]]);          // scala del muro est
    for (const x of [12, 13]) stair([[x, 32, 3], [x, 31, 2], [x, 30, 1]]);          // muro sud, a ovest del portone
    for (const x of [29, 30]) stair([[x, 32, 3], [x, 31, 2], [x, 30, 1]]);          // muro sud, a est del portone
    for (const x of [26, 27]) stair([[x, 11, 3], [x, 12, 2], [x, 13, 1]]);          // muro nord
    for (const y of [26, 27]) stair([[11, y, 3], [12, y, 2], [13, y, 1]]);          // muro ovest
    Z(11, 11, 19, 19, RZ); Z(11, 20, 20, 20, 1); Z(20, 11, 20, 19, 1);              // terrazza del mastio (e i gradini tutto intorno)
    // PARAPETTO coi MERLI (alti e bassi alternati) sul lato di fuori delle mura; torce ogni tanto
    const merl = (x, y, f) => pp('aMerl', x, y, { k: (x + y) % 2, f, t: f && (x + y) % 6 === 0 ? 1 : 0 });
    for (let y = 11; y <= 32; y++) { merl(8, y, 'W'); merl(35, y, 'E'); }
    for (let x = 11; x <= 32; x++) merl(x, 8, 'N');
    for (let x = 11; x <= 16; x++) merl(x, 35, 'S'); for (let x = 28; x <= 32; x++) merl(x, 35, 'S');
    for (const [a, b, k] of TOWERS) for (let y = b; y <= b + 3; y++) for (let x = a; x <= a + 3; x++) {
      const ox = k.includes('W') ? x === a : x === a + 3, oy = k.includes('N') ? y === b : y === b + 3;
      if (ox || oy) pp('aMerl', x, y, { k: 1, f: oy && k.includes('S') ? 'S' : ox && k.includes('E') ? 'E' : oy ? 'N' : 'W', t: (ox && oy) ? 1 : 0, tw: 1 });
    }
    for (const [a, b] of GTOW) for (let y = b; y <= b + 4; y++) for (let x = a; x <= a + 3; x++) {
      const side = (a === 17 && x === a + 3) || (a === 24 && x === a);
      if (y === b + 4 || side) pp('aMerl', x, y, { k: 1, f: y === b + 4 ? 'S' : a === 17 ? 'E' : '', t: y === b + 4 && (x === a || x === a + 3) ? 1 : 0, tw: 1 });
    }
    // il PORTONE (chiuso: al passo 2 l'ariete) e le catene del ponte
    for (let i = 0; i < 3; i++) pp('aGate', 21 + i, 34, { i });
    // IL MASTIO: una torre grande sulla terrazza (ogni casella disegna la sua colonna: si copre giusto con chi passa davanti)
    for (let y = 11; y <= 16; y++) for (let x = 11; x <= 16; x++) pp('aKeep', x, y, { e: x === 16, s: y === 16, n: y === 11, w: x === 11, c: x === 13 && y === 13 });
    // ---------------- CORTILE ----------------
    pp('aWell', 26, 21); pp('aForge', 30, 13); pp('aAnvil', 29, 15); pp('barrel', 32, 13, '#6a4a2a'); pp('barrel', 32, 14, '#5a3a22');
    pp('hay', 14, 23); pp('hay', 15, 23); pp('hay', 14, 22); pp('crate', 17, 29); pp('crate', 18, 29); pp('barrel', 26, 30, '#6a4a2a'); pp('crate', 27, 30);
    pp('aDummy', 28, 27); pp('aDummy', 30, 27); pp('aTarget', 31, 21); pp('aRackW', 21, 11); pp('aRackW', 23, 11); pp('aCart', 16, 26);
    for (const [x, y] of [[19, 25], [27, 25], [17, 31], [31, 17]]) { pp('aBraz', x, y); lamps.push([x + 0.5, y + 0.5, 2.6]); }
    pp('aBann', 20, 31); pp('aBann', 24, 31);
    // ---------------- FUORI: ACCAMPAMENTO ----------------
    for (const [x, y, c] of [[49, 46, '#c8b48a'], [57, 45, '#a85a3a'], [48, 54, '#8a9a6a'], [58, 53, '#c8b48a']]) { pp('aTent', x, y, { c }); pp('aTent', x - 1, y, { part: 1 }); pp('aTent', x, y - 1, { part: 1 }); pp('aTent', x - 1, y - 1, { part: 1 }); lamps.push([x + 0.6, y + 1.2, 1.8]); }
    pp('aFire', 53, 50); lamps.push([53.5, 50.5, 3.8]);
    pp('aRack', 50, 49, { n: NLAD }); pp('logpile', 56, 49); pp('logpile', 57, 49); pp('aBench', 55, 47);
    pp('aStool', 52, 49); pp('aStool', 55, 51); pp('barrel', 46, 50, '#6a4a2a'); pp('crate', 46, 51); pp('crate2', 60, 49);
    for (let x = 45; x <= 60; x++) if (x < 50 || x > 52) pp('aStake', x, 43, { v: 0 });   // palizzata col varco verso il castello
    for (let y = 44; y <= 56; y++) if (y < 48 || y > 50) pp('aStake', 61, y, { v: 1 });
    // ---------------- FUORI: CAMPAGNA (ripari per gli arcieri, alberi, rocce) ----------------
    for (const [x, y, f] of [[41, 15, 'W'], [42, 22, 'W'], [41, 29, 'W'], [13, 41, 'N'], [19, 43, 'N'], [31, 42, 'N'], [45, 37, 'W']]) pp('aMant', x, y, { f });
    for (const [x, y] of [[44, 9], [48, 12], [55, 10], [60, 14], [58, 22], [52, 30], [61, 33], [57, 38], [9, 47], [5, 54], [14, 55], [26, 53], [36, 56], [40, 50], [33, 48], [3, 45]]) pp(((x * 7 + y) % 3) ? 'oak' : 'pine', x, y);
    for (const [x, y] of [[14, 37], [14, 38], [30, 37], [30, 38], [46, 18], [39, 35], [24, 47], [10, 51], [50, 25], [44, 47], [37, 9]]) pp('rock', x, y);
    for (const [x, y] of [[47, 9], [56, 18], [61, 27], [6, 49], [20, 57], [43, 56], [38, 44], [28, 50], [54, 34]]) pp('bush', x, y);
    for (const [x, y] of [[42, 33], [43, 33], [36, 47]]) pp('hay', x, y);
    // erba alta e fiori nella campagna (decorazioni calpestabili, si disegnano col pavimento)
    for (let y = 1; y < 59; y++) for (let x = 1; x < 63; x++) {
      if (castle(x, y) || lake(x, y) || inMoat(x, y) || (x >= 45 && y >= 43)) continue;
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, r = h - Math.floor(h);
      if (r < 0.05) deco.push([x, y, 'aFlw']); else if (r < 0.13) deco.push([x, y, 'aTuft']);
    }
    // torce delle mura (luci di notte): sulle caselle dei merli con la torcia
    for (const [t, x, y, o] of props) if (t === 'aMerl' && o.t) lamps.push([x + 0.5, y + 0.5, 2.4]);
    return { w: W, h: H, rooms, doors: [], decals: [], props, holes, deco, tasks: [], hall, cams: [], vending: [], ring: [[52, 53]], button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      draw, floor: FLOOR, decoDraw, drawWall, ground, bg: () => '#21465a', bgSc: 1.5, hz, hb: HB, hzSide,
      lamps, spots: spotsOf() };
  }
  const roomAt = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); return cqRoomOf[yi] && cqRoomOf[yi][xi] != null ? cqRoomOf[yi][xi] : -1; };
  const alaAt = (x, y) => { const r = roomAt(x, y); return r >= 0 ? MP().rooms[r].ala : ''; };
  // dove si trova un personaggio: fuori, sulle mura (camminamento e torri) o dentro (cortile, terrazza)
  const zoneAt = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); if (!castle(xi, yi) || inGate(xi, yi) && yi >= 35) return 'out'; return hzAt(x, y) >= 3 && !inYard(xi, yi) || inTower(xi, yi) ? 'wall' : 'in'; };

  // ---- disegno della mappa (K = attrezzi di cqTools). REGOLA DELLE LUCI: aloni solo con K.glow, colori pieni negli oggetti alti ----
  const FLOOR = {
    agrass(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 6, ['rgba(120,170,70,.45)', 'rgba(30,60,20,.3)', 'rgba(160,190,90,.3)'], K.TW / 22); },
    adirt(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 7, ['rgba(255,240,210,.12)', 'rgba(40,25,10,.25)'], K.TW / 20); if (K.hsh(x, y, 4) < 0.12) K.dot(x + 0.3 + 0.4 * K.hsh(x, y, 5), y + 0.5, 0, 0.05, '#8a8478'); },
    astone(K, x, y) {   // lastroni del camminamento
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0);
      K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)], [Pp(0.5, 0), Pp(0.5, 0.5)], [Pp(0, 0.5), Pp(1, 0.5)]], 'rgba(40,35,30,.28)');
      if (K.hsh(x, y, 3) < 0.15) K.speck(x, y, 3, ['rgba(80,110,50,.5)'], K.TW / 16);
    },
    atower(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(40,35,30,.3)'); K.speck(x, y, 3, ['rgba(255,255,255,.08)'], K.TW / 20); },
    aterr(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)], [Pp(0.5, 0), Pp(0.5, 1)]], 'rgba(60,50,40,.22)'); },
    acob(K, x, y) {   // ciottoli del cortile
      if (K.TW < 40) return;
      for (let i = 0; i < 4; i++) { const u = 0.15 + (i % 2) * 0.5 + 0.12 * K.hsh(x, y, i), v = 0.15 + Math.floor(i / 2) * 0.5 + 0.12 * K.hsh(x, y, i + 4); const [X, Y] = K.S(x + u + 0.13, y + v + 0.13, 0); K.g.fillStyle = (i + x + y) % 3 ? 'rgba(255,250,240,.07)' : 'rgba(0,0,0,.12)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.15, K.TW * 0.075, 0, 0, 7); K.g.fill(); }
      if (K.hsh(x, y, 9) < 0.08) K.speck(x, y, 3, ['rgba(90,120,60,.55)'], K.TW / 18);
    },
    awood(K, x, y) { const Pp = (u, v) => K.S(x + u, y + v, 0), L = []; for (const u of [0.25, 0.5, 0.75]) L.push([Pp(u, 0), Pp(u, 1)]); K.strokes(L, 'rgba(30,18,8,.45)'); if (K.TW >= 40) for (const v of [0.15, 0.85]) K.dot(x + 0.1, y + v, 0.01, 0.02, '#2a2420'); }
  };
  // decorazioni calpestabili: ciuffi d'erba, fiori, scala caduta a terra
  function decoDraw(K, t, x, y) {
    if (t === 'aTuft') { const L = []; for (let i = 0; i < 5; i++) { const u = 0.3 + 0.1 * i + 0.05 * K.hsh(x, y, i); L.push([K.S(x + u, y + 0.55, 0), K.S(x + u + 0.04 * (i - 2), y + 0.55, 0.22 + 0.08 * K.hsh(x, y, i + 3))]); } K.strokes(L, '#6a9a3a', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'aFlw') { for (let i = 0; i < 3; i++) { const u = 0.25 + 0.25 * i, v = 0.35 + 0.3 * K.hsh(x, y, i); K.line(K.S(x + u, y + v, 0), K.S(x + u, y + v, 0.16), '#5a8a32', 1.5); K.dot(x + u, y + v, 0.18, 0.045, ['#f2e24a', '#f2f0ea', '#d85a8a', '#8a7ad8'][(x + y + i) % 4]); } return; }
    if (t === 'aLadG') {   // scala caduta: due staggi e i pioli, sdraiata nell'erba
      const L = []; for (const v of [0.3, 0.7]) L.push([K.S(x - 0.6, y + v, 0.04), K.S(x + 1.6, y + v, 0.04)]); K.strokes(L, '#8a5a2a', Math.max(2.5, K.TW / 14));
      const R = []; for (let i = 0; i < 7; i++) { const u = -0.45 + i * 0.32; R.push([K.S(x + u, y + 0.3, 0.05), K.S(x + u, y + 0.7, 0.05)]); } K.strokes(R, '#a8743a', Math.max(2, K.TW / 20));
    }
  }
  // SEGNI A TERRA (nella mappa pronta): il sentiero dall'accampamento al ponte, l'ombra del castello
  function ground(K) {
    const g = K.g, S = K.S, TW = K.TW;
    if (!MP() || MP().w !== W) return;
    const path = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w * TW * 0.7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = S(x, y, 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.lineCap = 'butt'; };
    const road = [[51.5, 44], [47, 41.5], [38, 40.2], [29, 39.6], [22.5, 39.4]];
    path(road, 1.9, 'rgba(120,96,62,.75)'); path(road, 1.1, 'rgba(140,114,76,.6)');
    path([[47, 41.5], [42, 34], [40, 26], [40.5, 18]], 1.2, 'rgba(120,96,62,.45)');
    // riflessi dell'acqua a ridosso delle mura (si disegna sopra al lago)
  }
  // LAGO e FOSSATO (le caselle senza pavimento accanto alla terra): acqua bassa con le onde e la schiuma a riva; il bordo della mappa: siepe
  function drawWall(K, x, y) {
    const S = K.S, TW = K.TW;
    if (lake(x, y) || inMoat(x, y)) {
      K.poly([S(x, y, -0.06), S(x + 1, y, -0.06), S(x + 1, y + 1, -0.06), S(x, y + 1, -0.06)], (x + y) % 2 ? '#2c5a70' : '#2a576c');
      if (TW < 40) return;
      if (K.hsh(x, y, 2) < 0.35) { const u = 0.2 + 0.5 * K.hsh(x, y, 3), v = 0.2 + 0.6 * K.hsh(x, y, 4); K.strokes([[S(x + u, y + v, -0.05), S(x + u + 0.3, y + v, -0.05)]], 'rgba(170,215,235,.35)', Math.max(1.5, TW / 30)); }
      const land = (a, b) => cqFloor[b] && cqFloor[b][a];
      const L = []; if (land(x, y + 1)) L.push([S(x, y + 1, -0.05), S(x + 1, y + 1, -0.05)]); if (land(x + 1, y)) L.push([S(x + 1, y, -0.05), S(x + 1, y + 1, -0.05)]);
      if (land(x, y - 1)) L.push([S(x, y, -0.05), S(x + 1, y, -0.05)]); if (land(x - 1, y)) L.push([S(x, y, -0.05), S(x, y + 1, -0.05)]);
      if (L.length) K.strokes(L, 'rgba(230,245,250,.55)', Math.max(2, TW / 18));
      return;
    }
    K.bx(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0, 0.75, '#2f5a2e'); if (TW >= 40) for (let i = 0; i < 3; i++) K.dot(x + 0.2 + 0.6 * K.hsh(x, y, i), y + 0.96, 0.15 + 0.5 * K.hsh(x, y, i + 9), 0.035, '#4a7a3a');
  }
  // facce delle colonne alzate (mura, torri, terrazza): pietra a corsi, la cima un po' piu' chiara
  function hzSide(x, y, i, z) {
    if (inTower(x, y)) return i === z - 1 ? '#8e887c' : '#7f796d';
    if (inKeep(x, y) || (x <= 20 && y <= 20 && inYard(x, y))) return i === z - 1 ? '#9a9386' : '#8a8376';
    return i === z - 1 ? '#9a9488' : i % 2 ? '#857f73' : '#8b8579';
  }
  const qR = (K, x, y0, y1, z0, z1, col) => K.poly([K.S(x, y0, z1), K.S(x, y1, z1), K.S(x, y1, z0), K.S(x, y0, z0)], col);
  function torch(K, x, y, z, f) {   // torcia su una faccia del muro (f = S: faccia a y+1, E: faccia a x+1)
    const { bx, dot, glow } = K;
    if (f === 'S') { bx(x + 0.45, y + 1, x + 0.55, y + 1.14, z - 0.1, z + 0.2, '#3a3028'); dot(x + 0.5, y + 1.14, z + 0.32, 0.06, '#ffb030'); dot(x + 0.5, y + 1.14, z + 0.4, 0.035, '#fff0a0'); glow(x + 0.5, y + 1.2, z + 0.35, 1.6, 'rgba(255,170,70,.42)'); }
    else if (f === 'E') { bx(x + 1, y + 0.45, x + 1.14, y + 0.55, z - 0.1, z + 0.2, '#3a3028'); dot(x + 1.14, y + 0.5, z + 0.32, 0.06, '#ffb030'); dot(x + 1.14, y + 0.5, z + 0.4, 0.035, '#fff0a0'); glow(x + 1.2, y + 0.5, z + 0.35, 1.6, 'rgba(255,170,70,.42)'); }
    else { dot(x + 0.5, y + 0.5, 0.9, 0.06, '#ffb030'); glow(x + 0.5, y + 0.5, 0.9, 1.4, 'rgba(255,170,70,.4)'); }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, qL, strokes } = K, g = K.g, TW = K.TW;
    o = o || {};
    switch (t) {
      case 'aMerl': {   // parapetto: merlo alto (k 1) o feritoia bassa (k 0), sulla cella alzata; sulla faccia di fuori le feritoie e le macchie
        const hgt = o.k ? 0.95 : 0.38, st = o.tw ? '#8a8478' : '#958f83';
        bx(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0, hgt, st); bx(x, y, x + 1, y + 1, hgt, hgt + 0.06, cqShade(st, 1.08));
        if (TW >= 40) {
          const zl = -(o.tw ? TZ : WZ) * HB;
          if (o.f === 'S') { if ((x * 3 + y) % 4 === 1) qL(x + 0.44, x + 0.56, y + 1, zl * 0.55, zl * 0.32, '#1f1b17'); if (K.hsh(x, y, 2) < 0.3) qL(x + 0.1 + 0.6 * K.hsh(x, y, 3), x + 0.28 + 0.6 * K.hsh(x, y, 3), y + 1, zl, zl * 0.6, 'rgba(60,80,40,.28)'); strokes([[S(x, y + 1, zl * 0.5), S(x + 1, y + 1, zl * 0.5)]], 'rgba(0,0,0,.08)'); }
          if (o.f === 'E') { if ((x + y * 3) % 4 === 1) qR(K, x + 1, y + 0.44, y + 0.56, zl * 0.55, zl * 0.32, '#1f1b17'); if (K.hsh(x, y, 2) < 0.3) qR(K, x + 1, y + 0.1 + 0.6 * K.hsh(x, y, 3), y + 0.28 + 0.6 * K.hsh(x, y, 3), zl, zl * 0.6, 'rgba(60,80,40,.28)'); }
          if (o.k && (o.f === 'S' || o.f === 'E')) strokes(o.f === 'S' ? [[S(x + 0.04, y + 0.96, hgt * 0.5), S(x + 0.96, y + 0.96, hgt * 0.5)]] : [[S(x + 0.96, y + 0.04, hgt * 0.5), S(x + 0.96, y + 0.96, hgt * 0.5)]], 'rgba(0,0,0,.15)');
        }
        if (o.t) torch(K, x, y, -1.1, o.f === 'S' || o.f === 'E' ? o.f : '');
        break; }
      case 'aGate': {   // PORTONE di legno con le borchie (3 caselle; quella di mezzo disegna l'arco e lo stemma)
        const z1 = 3.3; bx(x, y + 0.3, x + 1, y + 0.7, 0, z1, '#5a3a20');
        if (TW >= 40) { const L = []; for (const u of [0.33, 0.66]) L.push([S(x + u, y + 0.7, 0.05), S(x + u, y + 0.7, z1 - 0.05)]); strokes(L, 'rgba(0,0,0,.35)'); }
        for (const z of [0.6, 1.6, 2.6]) { bx(x - 0.01, y + 0.68, x + 1.01, y + 0.74, z, z + 0.16, '#3a3632'); for (const u of [0.2, 0.5, 0.8]) dot(x + u, y + 0.75, z + 0.08, 0.025, '#b8a070'); }
        if (o.i === 1) { dot(x + 0.5, y + 0.76, 1.35, 0.13, '#c8a040'); dot(x + 0.5, y + 0.77, 1.35, 0.08, '#8a2a2a');
          bx(x - 1, y + 0.2, x + 2, y + 0.8, z1, z1 + 0.55, '#7f796d'); for (let i = 0; i < 5; i++) qL(x - 0.9 + i * 0.6, x - 0.6 + i * 0.6, y + 0.81, z1 + 0.1, z1 + 0.45, '#6a645a'); }
        break; }
      case 'aKeep': {   // MASTIO: colonna di pietra alta, finestre accese sulle facce in vista, merli in cima, torretta al centro col tetto
        const KH = 5.4, st = '#8d877a';
        bx(x, y, x + 1, y + 1, 0, KH, st);
        if (TW >= 40) { const L = []; for (let z = 0.6; z < KH; z += 0.6) { if (o.s) L.push([S(x, y + 1, z), S(x + 1, y + 1, z)]); if (o.e) L.push([S(x + 1, y, z), S(x + 1, y + 1, z)]); } strokes(L, 'rgba(40,32,26,.22)'); }
        if (o.s && (x === 12 || x === 15)) { qL(x + 0.35, x + 0.65, y + 1, 2.7, 3.5, '#2a2018'); qL(x + 0.4, x + 0.6, y + 1, 2.75, 3.4, '#e8b860'); qL(x + 0.35, x + 0.65, y + 1, 3.5, 3.6, '#6a645a'); }
        if (o.e && (y === 12 || y === 15)) { qR(K, x + 1, y + 0.35, y + 0.65, 2.7, 3.5, '#2a2018'); qR(K, x + 1, y + 0.4, y + 0.6, 2.75, 3.4, '#e8b860'); }
        if (o.s && (x === 13 || x === 14)) {   // il portone del mastio (due caselle) e lo stendardo sopra
          qL(x === 13 ? x + 0.25 : x, x === 13 ? x + 1 : x + 0.75, y + 1, 0, 1.55, '#4a3018'); qL(x === 13 ? x + 0.3 : x, x === 13 ? x + 1 : x + 0.7, y + 1, 0.05, 1.5, '#6a4426');
          if (x === 13) { qL(x + 0.55, x + 1, y + 1, 1.9, 4.3, '#5a2a6a'); qL(x + 0.6, x + 1, y + 1, 2.0, 4.2, '#7a3a8a'); dot(x + 0.95, y + 1.01, 3.3, 0.14, '#e8c040'); }
          else { qL(x, x + 0.45, y + 1, 1.9, 4.3, '#5a2a6a'); qL(x, x + 0.4, y + 1, 2.0, 4.2, '#7a3a8a'); }
        }
        if (o.n || o.s || o.e || o.w) { const k = (x + y) % 2; bx(x + 0.04, y + 0.04, x + 0.96, y + 0.96, KH, KH + (k ? 0.7 : 0.3), '#958f83'); }
        if (o.c) {   // torretta sopra il mastio, con il tetto a punta e la banderuola
          cyl(x + 1.0, y + 1.0, 0.85, KH, KH + 2.2, '#8a8478'); cyl(x + 1.0, y + 1.0, 0.92, KH + 2.2, KH + 2.35, '#6a645a');
          const [X0, Y0] = S(x + 1.0, y + 1.0, KH + 2.35), [X1, Y1] = S(x + 1.0, y + 1.0, KH + 4.4), rx = 0.95 * TW * 0.707, ry = 0.95 * TW * 0.354;
          g.fillStyle = '#5a2a3a'; g.beginPath(); g.moveTo(X0 - rx, Y0); g.lineTo(X1, Y1); g.lineTo(X0 + rx, Y0); g.ellipse(X0, Y0, rx, ry, 0, 0, Math.PI); g.fill();
          g.fillStyle = '#7a3a4a'; g.beginPath(); g.moveTo(X0, Y0 + ry); g.lineTo(X1, Y1); g.lineTo(X0 + rx, Y0); g.ellipse(X0, Y0, rx, ry, 0, 0, Math.PI / 2); g.fill();
          line([X1, Y1], [X1, Y1 - TW * 0.4], '#3a3030', 2); g.fillStyle = '#e8c040'; g.beginPath(); g.moveTo(X1, Y1 - TW * 0.4); g.lineTo(X1 + TW * 0.28, Y1 - TW * 0.33); g.lineTo(X1, Y1 - TW * 0.26); g.fill();
          qL(x + 0.85, x + 1.15, y + 1.85, KH + 0.9, KH + 1.5, '#e8b860');
        }
        break; }
      case 'aWell': cyl(x + 0.5, y + 0.5, 0.42, 0, 0.7, '#8a8478'); cyl(x + 0.5, y + 0.5, 0.32, 0.69, 0.7, '#1e3a4a'); for (const a of [0.12, 0.88]) bx(x + a - 0.04, y + 0.46, x + a + 0.04, y + 0.54, 0.7, 1.9, '#5a3a20');
        bx(x + 0.05, y + 0.47, x + 0.95, y + 0.53, 1.75, 1.82, '#5a3a20'); poly([S(x - 0.05, y + 0.2, 1.9), S(x + 1.05, y + 0.2, 1.9), S(x + 1.05, y + 0.5, 2.35), S(x - 0.05, y + 0.5, 2.35)], '#7a3a2a'); poly([S(x - 0.05, y + 0.8, 1.9), S(x + 1.05, y + 0.8, 1.9), S(x + 1.05, y + 0.5, 2.35), S(x - 0.05, y + 0.5, 2.35)], '#9a4a32');
        bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 1.1, 1.35, '#6a4a2a'); break;
      case 'aForge': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.9, '#5a544c'); bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0.9, 0.95, '#2a2420'); dot(x + 0.5, y + 0.5, 0.97, 0.18, '#e8642a'); dot(x + 0.5, y + 0.5, 1.0, 0.1, '#ffc040');
        bx(x + 0.3, y + 0.05, x + 0.7, y + 0.35, 0.95, 2.6, '#4a443c'); glow(x + 0.5, y + 0.5, 1.1, 2.0, 'rgba(255,120,40,.45)'); break;
      case 'aAnvil': bx(x + 0.35, y + 0.35, x + 0.65, y + 0.65, 0, 0.5, '#5a3a20'); bx(x + 0.2, y + 0.38, x + 0.8, y + 0.62, 0.5, 0.75, '#3a3e44'); bx(x + 0.1, y + 0.42, x + 0.9, y + 0.58, 0.75, 0.82, '#4a4e54'); break;
      case 'aDummy': bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 1.4, '#6a4a2a'); bx(x + 0.15, y + 0.46, x + 0.85, y + 0.54, 1.25, 1.32, '#6a4a2a'); cyl(x + 0.5, y + 0.5, 0.2, 0.7, 1.45, '#c8b07a'); cyl(x + 0.5, y + 0.5, 0.15, 1.5, 1.85, '#d8c08a');
        for (const z of [0.9, 1.15]) dot(x + 0.5, y + 0.72, z, 0.03, '#8a2a2a'); break;
      case 'aTarget': for (const a of [0.2, 0.8]) bx(x + a - 0.04, y + 0.46, x + a + 0.04, y + 0.54, 0, 1.3, '#6a4a2a');
        { const [X, Y] = S(x + 0.5, y + 0.55, 1.35); for (const [r, c] of [[0.42, '#f2efe4'], [0.32, '#d83a2a'], [0.22, '#f2efe4'], [0.11, '#d83a2a']]) { g.fillStyle = c; g.beginPath(); g.ellipse(X, Y, TW * r * 0.7, TW * r * 0.9, 0, 0, 7); g.fill(); } } break;
      case 'aRackW': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.3, 0, 1.5, '#6a4a2a'); for (let i = 0; i < 4; i++) { const u = 0.2 + i * 0.2; line(S(x + u, y + 0.35, 0.1), S(x + u, y + 0.3, 1.7), '#9aa0a8', Math.max(1.5, TW / 30)); dot(x + u, y + 0.3, 1.72, 0.03, '#c8ccd2'); } break;
      case 'aCart': for (const v of [0.15, 0.85]) { const [X, Y] = S(x + 0.5, y + v, 0.35); g.fillStyle = '#4a3018'; g.beginPath(); g.ellipse(X, Y, TW * 0.24, TW * 0.32, 0, 0, 7); g.fill(); g.fillStyle = '#7a5432'; g.beginPath(); g.ellipse(X, Y, TW * 0.08, TW * 0.11, 0, 0, 7); g.fill(); }
        bx(x + 0.1, y + 0.2, x + 0.9, y + 0.8, 0.45, 0.85, '#8a6a3a'); bx(x + 0.15, y + 0.25, x + 0.85, y + 0.75, 0.85, 1.05, '#c8a85a'); break;
      case 'aBraz': for (const [a, b] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.75]]) line(S(x + a, y + b, 0), S(x + 0.5, y + 0.5, 0.9), '#2a2a2e', Math.max(2, TW / 22));
        cyl(x + 0.5, y + 0.5, 0.3, 0.9, 1.15, '#3a3a3e'); dot(x + 0.5, y + 0.5, 1.2, 0.16, '#e8642a'); dot(x + 0.48, y + 0.5, 1.35, 0.09, '#ffb030'); dot(x + 0.5, y + 0.5, 1.48, 0.045, '#fff0a0'); glow(x + 0.5, y + 0.5, 1.3, 2.2, 'rgba(255,150,60,.5)'); break;
      case 'aBann': bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 3.2, '#3a3030'); bx(x + 0.2, y + 0.46, x + 0.8, y + 0.54, 3.05, 3.12, '#3a3030');
        qL(x + 0.22, x + 0.78, y + 0.55, 1.6, 3.05, '#5a2a6a'); qL(x + 0.26, x + 0.74, y + 0.56, 1.7, 3.0, '#7a3a8a'); dot(x + 0.5, y + 0.57, 2.5, 0.09, '#e8c040'); break;
      case 'aTent': {   // tenda dell'accampamento (2x2, disegnata dalla casella davanti): telo a capanna, ingresso aperto, palo con il pennacchio
        if (o.part) break; const x0 = x - 1, y0 = y - 1, c = o.c || '#c8b48a';
        poly([S(x0 + 0.05, y + 0.95, 0), S(x + 0.95, y + 0.95, 0), S(x + 0.95, y0 + 1, 1.9), S(x0 + 0.05, y0 + 1, 1.9)], cqShade(c, 0.9));
        poly([S(x + 0.95, y + 0.95, 0), S(x + 0.95, y0 + 0.05, 0), S(x + 0.95, y0 + 1, 1.9)], cqShade(c, 0.7));
        poly([S(x0 + 0.75, y + 0.95, 0), S(x0 + 1.25, y + 0.95, 0), S(x0 + 1, y + 0.4, 1.25)], '#2a2018');
        line(S(x0 + 0.05, y0 + 1, 1.9), S(x + 0.95, y0 + 1, 1.9), cqShade(c, 0.6), 2);
        bx(x0 + 0.95, y0 + 0.95, x0 + 1.05, y0 + 1.05, 1.9, 2.5, '#5a3a20'); poly([S(x0 + 1, y0 + 1, 2.5), S(x0 + 1.5, y0 + 1, 2.4), S(x0 + 1, y0 + 1, 2.3)], '#c83a2a');
        dot(x0 + 1.55, y + 0.95, 0.9, 0.06, '#ffd070'); glow(x0 + 1.55, y + 1.0, 0.9, 1.1, 'rgba(255,200,110,.38)'); break; }
      case 'aFire': for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; dot(x + 0.5 + Math.cos(a) * 0.38, y + 0.5 + Math.sin(a) * 0.38, 0.06, 0.08, '#6a645a'); }
        for (const a of [0.4, 1.9, 3.4]) line(S(x + 0.5 + Math.cos(a) * 0.3, y + 0.5 + Math.sin(a) * 0.3, 0.05), S(x + 0.5 - Math.cos(a) * 0.3, y + 0.5 - Math.sin(a) * 0.3, 0.15), '#4a3018', Math.max(3, TW / 12));
        dot(x + 0.5, y + 0.5, 0.25, 0.2, '#e8542a'); dot(x + 0.5, y + 0.5, 0.45, 0.13, '#ff9a30'); dot(x + 0.52, y + 0.5, 0.65, 0.07, '#ffe080'); glow(x + 0.5, y + 0.5, 0.5, 3.0, 'rgba(255,140,50,.5)'); break;
      case 'aRack': {   // rastrelliera delle SCALE (o.n = quante ne restano)
        for (const a of [0.08, 0.92]) bx(x + a - 0.05, y + 0.42, x + a + 0.05, y + 0.58, 0, 2.6, '#5a3a20'); bx(x, y + 0.42, x + 1, y + 0.58, 2.45, 2.55, '#5a3a20');
        for (let i = 0; i < (o.n || 0); i++) { const v = 0.25 + i * 0.22; for (const u of [0.18, 0.82]) line(S(x + u, y + v, 0.05), S(x + u, y + v + 0.08, 2.5), '#a8743a', Math.max(2, TW / 18)); const R = []; for (let k = 0; k < 6; k++) R.push([S(x + 0.18, y + v + 0.01 * k, 0.3 + k * 0.38), S(x + 0.82, y + v + 0.01 * k, 0.3 + k * 0.38)]); strokes(R, '#c8904a', Math.max(1.5, TW / 26)); }
        break; }
      case 'aLad': {   // SCALA appoggiata al parapetto (w: E = muro est, S = muro sud): dal piede a terra fin sopra il merlo
        const top = WZ * HB + 0.75, rails = [], R = [];
        const A = (s, u) => o.w === 'E' ? [x + 0.9 - u * 0.9, y + s] : [x + s, y + 0.9 - u * 0.9];
        for (const s of [0.22, 0.78]) { const [a1, b1] = A(s, 0), [a2, b2] = A(s, 1); rails.push([S(a1, b1, 0), S(a2, b2, top)]); }
        strokes(rails, '#7a4a22', Math.max(3, TW / 11));
        for (let i = 1; i < 10; i++) { const u = i / 10, [a1, b1] = A(0.22, u), [a2, b2] = A(0.78, u); R.push([S(a1, b1, top * u), S(a2, b2, top * u)]); }
        strokes(R, '#b07a40', Math.max(2, TW / 18)); break; }
      case 'aBench': bx(x + 0.05, y + 0.2, x + 0.95, y + 0.8, 0.6, 0.72, '#8a6a3a'); for (const [a, b] of [[0.1, 0.25], [0.85, 0.25], [0.1, 0.7], [0.85, 0.7]]) bx(x + a, y + b, x + a + 0.06, y + b + 0.06, 0, 0.6, '#5a3a20');
        bx(x + 0.2, y + 0.35, x + 0.7, y + 0.5, 0.72, 0.8, '#c8a060'); bx(x + 0.55, y + 0.55, x + 0.75, y + 0.62, 0.72, 0.9, '#6a6e74'); break;
      case 'aStool': cyl(x + 0.5, y + 0.5, 0.2, 0, 0.42, '#6a4a2a'); cyl(x + 0.5, y + 0.5, 0.22, 0.42, 0.47, '#8a6a3a'); break;
      case 'aStake': {   // palo appuntito della palizzata
        for (let i = 0; i < 3; i++) { const u = 0.2 + i * 0.3, cx = o.v ? x + 0.5 : x + u, cy = o.v ? y + u : y + 0.5; cyl(cx, cy, 0.1, 0, 1.25 + 0.15 * ((x + y + i) % 2), '#7a5432'); const [X, Y] = S(cx, cy, 1.3 + 0.15 * ((x + y + i) % 2)); g.fillStyle = '#a8784a'; g.beginPath(); g.moveTo(X - TW * 0.07, Y + 2); g.lineTo(X, Y - TW * 0.16); g.lineTo(X + TW * 0.07, Y + 2); g.fill(); }
        bx(o.v ? x + 0.45 : x, o.v ? y : y + 0.45, o.v ? x + 0.55 : x + 1, o.v ? y + 1 : y + 0.55, 0.7, 0.8, '#5a3a20'); break; }
      case 'aMant': {   // MANTELLETTO: riparo di assi su ruote per gli arcieri (f = verso il castello)
        const v = o.f === 'W'; for (const s of [0.2, 0.8]) { const [X, Y] = v ? S(x + 0.6, y + s, 0.18) : S(x + s, y + 0.6, 0.18); g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(X, Y, TW * 0.1, 0, 7); g.fill(); }
        if (v) { bx(x + 0.3, y + 0.02, x + 0.45, y + 0.98, 0.15, 1.55, '#7a5a32'); const L = []; for (const u of [0.25, 0.5, 0.75]) L.push([S(x + 0.45, y + u, 0.2), S(x + 0.45, y + u, 1.5)]); strokes(L, 'rgba(0,0,0,.3)'); }
        else { bx(x + 0.02, y + 0.3, x + 0.98, y + 0.45, 0.15, 1.55, '#7a5a32'); const L = []; for (const u of [0.25, 0.5, 0.75]) L.push([S(x + u, y + 0.45, 0.2), S(x + u, y + 0.45, 1.5)]); strokes(L, 'rgba(0,0,0,.3)'); }
        break; }
    }
  }
  CQ_MAPS.castello = { n: 'Castello di Roccaforte', make: mapCastle, only: 'assedio' };
  // altezza (in U) di quello che c'e' in una casella, per le frecce: muro/oggetto alto = la freccia si pianta
  const PH = { aMerl: 0, aGate: 3.3, aKeep: 6.2, aWell: 2.2, aForge: 2.6, aAnvil: 0.8, aDummy: 1.8, aTarget: 1.6, aRackW: 1.7, aCart: 1.1, aBraz: 1.4, aBann: 3.2, aTent: 1.9, aFire: 0.3, aRack: 2.6, aLad: 0.3, aBench: 0.8, aStool: 0.4, aStake: 1.4, aMant: 1.55, pine: 4, oak: 4, rock: 0.8, bush: 0.7, hay: 1.0, barrel: 0.9, crate: 0.8, crate2: 1.2, logpile: 0.8 };
  function topAt(xi, yi) {
    if (!cqFloor[yi] || !cqFloor[yi][xi]) return lake(xi, yi) || inMoat(xi, yi) ? -0.1 : 9;   // acqua: niente; bordo della mappa: si pianta
    const base = cqHc(xi, yi) * HB, s = cqSolid[yi][xi]; if (!s) return base;
    if (s.wall) return 9; if (s.prop === 'aMerl') return base + (s.o && s.o.k ? 0.95 : 0.38);
    return base + (PH[s.prop] != null ? PH[s.prop] : 1.2);
  }

  // ======================= LE FRECCE =======================
  // una freccia vola in modo prevedibile (parabola da x0, y0, z0 a x1, y1, z1 in d secondi): ogni telefono la disegna da sola; l'host decide dove si pianta e chi colpisce
  const arPos = (a, t) => { const u = Math.max(0, Math.min(1, (t - a.t0) / a.d)); return [a.x0 + (a.x1 - a.x0) * u, a.y0 + (a.y1 - a.y0) * u, a.z0 + (a.z1 - a.z0) * u + 4 * a.pk * u * (1 - u), u]; };
  const bodyZ = (G, c) => { const p = P(c); return (c.cl ? clZ(G, c) : zAt(p.x, p.y)); };
  // posizione disegnata di chi sale/scende la scala (u = quanto manca)
  const clU = (G, c) => { const k = Math.max(0, Math.min(1, (G.time - c.cl.t0) / c.cl.T)); return c.cl.d > 0 ? k : 1 - k; };
  const clZ = (G, c) => clU(G, c) * WZ * HB;
  const clXY = (G, c) => { const S = MP().spots[c.cl.s], u = clU(G, c); return [S.ax + (S.tx - S.ax) * u * 0.55, S.ay + (S.ty - S.ay) * u * 0.55]; };
  function mkArrow(G, c, x1, y1, q) {
    const p = P(c), z0 = bodyZ(G, c) + 1.25, d0 = Math.hypot(x1 - p.x, y1 - p.y), z1 = zAt(x1, y1) + 0.45;
    const a = { id: ++G.arN, o: c.id, t: c.t, q: q || 0, x0: p.x, y0: p.y, z0, x1, y1, z1, t0: G.time, d: 0.16 + d0 / 15, pk: 0.45 + 0.13 * d0, te: 0, hit: -1 };
    if (c.cl) { const [cx, cy] = clXY(G, c); a.x0 = cx; a.y0 = cy; }
    G.ar.push(a); c.rl = G.time + RELOAD * (c.bot ? 1.5 : 1); c.sh = (c.sh || 0) + 1;
    return a;
  }
  // dove arriva la freccia (con l'imprecisione: piu' lontano = piu' storta)
  function aimEnd(px, py, dx, dy, dist, k) {
    const sp = (0.12 + 0.045 * dist) * (k || 1), a = Math.atan2(dy, dx) + gauss() * sp * 0.09, d = dist * (1 + gauss() * 0.05 * (k || 1));
    return [px + Math.cos(a) * d + gauss() * sp * 0.25, py + Math.sin(a) * d + gauss() * sp * 0.25];
  }
  // giro delle frecce (host): avanza a piccoli passi; si pianta nei muri, negli oggetti alti, a terra; colpisce i nemici (non chi e' appena tornato)
  function arTick(G) {
    for (const a of G.ar) {
      if (a.te) continue;
      const u0 = Math.max(0, Math.min(1, (G.time - 0.05 - a.t0) / a.d)), u1 = Math.max(0, Math.min(1, (G.time - a.t0) / a.d)), len = Math.hypot(a.x1 - a.x0, a.y1 - a.y0) * (u1 - u0), n = Math.max(1, Math.ceil(len / 0.2));
      for (let i = 1; i <= n; i++) {
        const u = u0 + (u1 - u0) * i / n, x = a.x0 + (a.x1 - a.x0) * u, y = a.y0 + (a.y1 - a.y0) * u, z = a.z0 + (a.z1 - a.z0) * u + 4 * a.pk * u * (1 - u);
        const tt = a.t0 + u * a.d;
        // personaggi colpiti
        let hit = null;
        for (const c of G.chars) {
          if (!c.alive || c.t === a.t || dead(G, c) || c.id === a.o) continue;
          const p = c.cl ? (() => { const q = clXY(G, c); return { x: q[0], y: q[1] }; })() : P(c), cz = bodyZ(G, c);
          if (Math.hypot(p.x - x, p.y - y) < 0.44 && z > cz - 0.1 && z < cz + 2.35) { hit = c; break; }
        }
        if (hit) { a.te = tt; a.hx = x; a.hy = y; a.hz = z; a.hit = hit.id; if (!safe(G, hit)) hurt(G, hit, 1, byId(G, a.o), 'ar'); else a.blk = 1; break; }
        if (u > 0.06 && z < topAt(Math.floor(x), Math.floor(y))) { a.te = tt; a.hx = x; a.hy = y; a.hz = z; break; }
        if (u >= 1) { a.te = tt; a.hx = x; a.hy = y; a.hz = Math.max(z - 0.4, zAt(x, y)); break; }
      }
    }
    G.ar = G.ar.filter(a => !a.te || G.time - a.te < 4);
  }
  function hurt(G, c, n, by, why) {
    if (dead(G, c)) return;
    c.hp = Math.max(0, (c.hp == null ? HP : c.hp) - n); c.hitT = G.time; c.hitN = (c.hitN || 0) + 1;
    if (by) by.hi = (by.hi || 0) + 1;
    if (c.pu) c.pu = null;
    if (c.hp <= 0) down(G, c, by, why);
  }
  // cade (corpo a terra senza coltello) e torna alla base dopo RESP secondi
  function down(G, c, by, why) {
    const p = P(c); c.dn = G.time + (isAtk(G, c) ? RESP - 1 : RESP + 4); c.d = (c.d || 0) + 1; c.path = []; c.walk = 0; c.pu = null;
    if (by && by.t !== c.t) by.k = (by.k || 0) + 1;
    if (c.cl) { const [x, y] = clXY(G, c); c.cl = null; }
    const lc = G.ld.find(l => l.st === 1 && l.c === c.id); if (lc) dropLad(G, lc, p.x, p.y);
    if (G.F.st === 1 && G.F.c === c.id) { G.F.st = 2; G.F.c = -1; G.F.x = p.x; G.F.y = p.y; G.F.dt = G.time; say(G, 'fdrop', { a: c.id }); }
    G.bodies = G.bodies.filter(b => b.id !== c.id);
    G.bodies.push({ id: c.id, x: p.x, y: p.y, face: c === G.me ? cq.face : c.face, look: cqLookOf(c), name: c.name, t: G.time, nk: 1 });
    say(G, 'down', { a: c.id, b: by ? by.id : -1, w: why || '' });
  }
  function revive(G, c) {
    c.dn = 0; c.hp = HP; c.sf = G.time + SAFE; c.angel = G.time; G.bodies = G.bodies.filter(b => b.id !== c.id);
    const p = baseSpawn(G, c); tp(G, c, p.x, p.y);
  }
  // spostamento sicuro su tutti i telefoni (l'amico lo legge in capply dal numero tpN)
  function tp(G, c, x, y) { c.x = x; c.y = y; c.path = []; c.cl = null; if (c === G.me) { cq.x = x; cq.y = y; } c.tpN = (c.tpN || 0) + 1; c.tp = [r2(x), r2(y)]; }
  const baseSpawn = (G, c) => isAtk(G, c) ? SQ.spawn(CAMPS, 6) : SQ.spawn(YARD, 7);

  // ======================= LE SCALE =======================
  // G.ld[i] = { st: 0 rastrelliera / 1 portata (c) / 2 appoggiata (s = indice del posto) / 3 a terra (x, y casella) }
  function dropLad(G, l, x, y) {
    let best = null, bd = 1e9;
    for (let yy = Math.floor(y) - 3; yy <= Math.floor(y) + 3; yy++) for (let xx = Math.floor(x) - 3; xx <= Math.floor(x) + 3; xx++) {
      if (!cqCellFree(xx, yy) || cqHc(xx, yy) || castle(xx, yy) || (cqDeco && cqDeco[yy] && cqDeco[yy][xx] === 'aLadG') || G.ld.some(o => o.st === 3 && Math.abs(o.x - xx) < 2 && Math.abs(o.y - yy) < 1)) continue;
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y); if (d < bd) { bd = d; best = [xx, yy]; }
    }
    if (!best) { l.st = 0; l.c = -1; return; }   // niente posto: torna alla rastrelliera
    l.st = 3; l.c = -1; l.x = best[0]; l.y = best[1]; l.s = -1;
  }
  const ladAt = (G, s) => G.ld.find(l => l.st === 2 && l.s === s);
  const spotOk = S => cqCellFree(S.fx, S.fy) && cqCellFree(Math.floor(S.ax), Math.floor(S.ay));
  const spotFree = (G, s) => !G.ld.some(l => l.st === 2 && Math.abs(MP().spots[l.s].fx - MP().spots[s].fx) + Math.abs(MP().spots[l.s].fy - MP().spots[s].fy) < 2);
  function nearSpot(G, x, y, r = 1.1) { let b = -1, bd = r; MP().spots.forEach((S, i) => { const d = Math.hypot(S.ax - x, S.ay - y); if (d < bd && spotFree(G, i) && spotOk(S)) { bd = d; b = i; } }); return b; }
  function nearLadFoot(G, x, y, r = 1.15) { let b = null, bd = r; for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s], d = Math.hypot(S.ax - x, S.ay - y); if (d < bd) { bd = d; b = l; } } return b; }
  function nearLadTop(G, x, y, r = 1.3) { let b = null, bd = r; for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s], d = Math.hypot(S.tx - x, S.ty - y); if (d < bd) { bd = d; b = l; } } return b; }
  // salto giu' dalle mura (dal camminamento accanto al parapetto, lato sud ed est): si atterra ai piedi del muro
  function jumpAt(G, x, y) { let b = -1, bd = 0.75; MP().spots.forEach((S, i) => { const d = Math.hypot(S.tx - x, S.ty - y); if (d < bd && cqCellFree(Math.floor(S.ax), Math.floor(S.ay)) && !ladAt(G, i)) { bd = d; b = i; } }); return b; }
  const nearRack = (x, y) => Math.hypot(x - 50.5, y - 50) < 1.6;
  const nearGroundLad = (G, x, y) => G.ld.find(l => l.st === 3 && Math.hypot(l.x + 0.5 - x, l.y + 0.5 - y) < 1.5);
  // la scala cade: chi la sta salendo cade giu' (perde un cuore), la scala resta a terra ai piedi del muro
  function fall(G, l, by) {
    const S = MP().spots[l.s];
    for (const c of G.chars) if (c.cl && c.cl.s === l.s) { c.cl = null; tp(G, c, S.ax, S.ay); hurt(G, c, 1, by, 'fall'); c.fallN = (c.fallN || 0) + 1; }
    dropLad(G, l, S.ax + (S.w === 'E' ? 1.2 : 0), S.ay + (S.w === 'S' ? 1.2 : 0));
    if (by) by.pn = (by.pn || 0) + 1;
    say(G, 'fall', { a: by ? by.id : -1, x: S.fx, y: S.fy });
  }
  // la mappa segue le scale (su ogni telefono): appoggiate = oggetto nella casella del piede, a terra = disegnata nell'erba, rastrelliera col numero giusto
  function syncLd(G) {
    const sig = G.ld.map(l => l.st + ':' + (l.st === 2 ? l.s : l.st === 3 ? l.x + ',' + l.y : '')).join('|');
    if (sig === G.ldSig) return; G.ldSig = sig;
    const M = MP(), want = new Map(), wantD = new Map();
    for (const l of G.ld) { if (l.st === 2) { const S = M.spots[l.s]; want.set(S.fx + ',' + S.fy, S.w); } if (l.st === 3) wantD.set(l.x + ',' + l.y, 1); }
    const old = G.ldOld || { p: new Set(), d: new Set() };
    for (const k of old.p) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aLad') { cqSolid[y][x] = null; cqBgCell(x, y); } }
    for (const [k, w] of want) { const [x, y] = k.split(',').map(Number); if (!(cqSolid[y][x] && cqSolid[y][x].prop === 'aLad')) { cqSolid[y][x] = { prop: 'aLad', o: { w } }; cqBgCell(x, y); } }
    if (cqDeco) { for (const k of old.d) if (!wantD.has(k)) { const [x, y] = k.split(',').map(Number); if (cqDeco[y][x] === 'aLadG') { cqDeco[y][x] = null; cqBgCell(x, y, 1); } }
      for (const k of wantD.keys()) { const [x, y] = k.split(',').map(Number); if (cqDeco[y][x] !== 'aLadG') { cqDeco[y][x] = 'aLadG'; cqBgCell(x, y, 1); } } }
    const n = G.ld.filter(l => l.st === 0).length, rk = cqSolid[49][50];
    if (rk && rk.prop === 'aRack' && rk.o.n !== n) { cqSolid[49][50] = { prop: 'aRack', o: { n } }; cqBgCell(50, 49); }
    G.ldOld = { p: new Set(want.keys()), d: new Set(wantD.keys()) };
  }

  // ======================= CRONACA (cosa succede: l'host la scrive, ognuno la racconta dal suo punto di vista) =======================
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', bn = B ? '<b>' + esc(B.name) + '</b>' : '', atk = isAtk(G, me);
    let t = '';
    if (e.k === 'down') {
      if (A === me) { t = e.w === 'fall' ? '💥 Sei caduto dalla scala!' : B ? '💀 ' + bn + ' ti ha colpito!' : '💀 Sei caduto!'; G.myHurt = performance.now(); thud(0.5, 120); }
      else if (B === me) { t = '🎯 Hai abbattuto ' + an + '!'; beep(880, 0.08, 0.04); beep(1175, 0.12, 0.04, 0.08); }
    }
    else if (e.k === 'take') { t = A === me ? '🚩 Hai la bandiera! Portala all\'accampamento!' : atk ? '🚩 ' + an + ' ha preso la bandiera: coprilo!' : '⚠️ ' + an + ' ha rubato la bandiera! Fermatelo!'; beep(atk ? 660 : 330, 0.12, 0.05); beep(atk ? 880 : 262, 0.18, 0.05, 0.12); }
    else if (e.k === 'fdrop') t = atk ? '🚩 La bandiera è caduta!' : '🚩 Bandiera a terra: toccala per riportarla!';
    else if (e.k === 'fret') { t = A ? '🏰 ' + (A === me ? 'Hai' : an + ' ha') + ' riportato la bandiera al mastio.' : '🏰 La bandiera è tornata al mastio.'; beep(587, 0.12, 0.04); }
    else if (e.k === 'place') { if (!atk) { t = '🪜 Una scala sulle mura! Rovesciala!'; beep(300, 0.1, 0.05); } else if (A === me) t = '🪜 Scala appoggiata: sali!'; thud(0.4, 200); }
    else if (e.k === 'fall') { if (A === me) { t = '🤚 Scala rovesciata!'; beep(700, 0.06, 0.04); } else if (atk) t = '💥 ' + (A ? an + ' ha' : 'Hanno') + ' rovesciato una scala!'; const d = Math.hypot(e.x - cq.x, e.y - cq.y); if (d < 14) { thud(0.6 * (1 - d / 14), 150); thud(0.4 * (1 - d / 14), 90); } }
    else if (e.k === 'jump') { if (A === me) t = '🪂 Che salto! (−1 ❤)'; const d = Math.hypot(e.x - cq.x, e.y - cq.y); if (d < 12) thud(0.5 * (1 - d / 12), 110); }
    else if (e.k === 'in') { if (!atk && A) t = '⚔️ ' + an + ' è sulle mura!'; }
    else if (e.k === 'cap') { t = '🏆 ' + (A === me ? 'Hai' : an + ' ha') + ' conquistato il castello!'; fanfare(A && A.t === me.t); }
    else if (e.k === 'half') { horn(); }
    if (t) cqToast(t);
  }
  function horn() { beep(196, 0.6, 0.06, 0, 'sawtooth'); beep(262, 0.8, 0.05, 0.5, 'sawtooth'); }
  function fanfare(ok) { const f = ok ? [523, 659, 784, 1047] : [392, 330, 294, 262]; f.forEach((v, i) => beep(v, 0.18, 0.05, i * 0.15, 'triangle')); }
  const twang = () => { beep(220, 0.06, 0.04, 0, 'triangle'); beep(140, 0.08, 0.03, 0.02, 'sine'); };

  // ======================= AZIONI (pulsante grande, uguale per persone e computer) =======================
  function action(G, c) {
    if (!c.alive || dead(G, c) || inIv(G) || c.cl) return null;
    const p = P(c), atk = isAtk(G, c), carry = G.ld.find(l => l.st === 1 && l.c === c.id);
    if (c.pu) return { k: 'push', t: '🤚 Rovescio…', on: false };
    if (atk) {
      if (carry) { const s = nearSpot(G, p.x, p.y); return s >= 0 ? { k: 'place', s, t: '🪜 Appoggia la scala', on: true } : { k: 'ldrop', t: '🪜 Lascia la scala', on: true }; }
      const hasF = G.F.st === 1 && G.F.c === c.id;
      const top = nearLadTop(G, p.x, p.y); if (top && zoneAt(p.x, p.y) === 'wall') return { k: 'down', l: top, t: hasF ? '🧗 Scendi con la bandiera' : '🧗 Scendi', on: true };
      const js = jumpAt(G, p.x, p.y); if (js >= 0) return { k: 'jump', s: js, t: '🪂 Salta giù (−1 ❤)', on: true };
      const foot = nearLadFoot(G, p.x, p.y); if (foot && zoneAt(p.x, p.y) === 'out') return { k: 'climb', l: foot, t: '🧗 Sali!', on: !hasF };
      if (!hasF && nearRack(p.x, p.y)) { const n = G.ld.filter(l => l.st === 0).length; return { k: 'take', t: n ? '🪜 Prendi la scala (' + n + ')' : '🪜 Scale finite', on: n > 0 }; }
      if (!hasF) { const gl = nearGroundLad(G, p.x, p.y); if (gl) return { k: 'take', g: gl, t: '🪜 Raccogli la scala', on: true }; }
      return null;
    }
    const top = nearLadTop(G, p.x, p.y, 1.45); if (top && zoneAt(p.x, p.y) === 'wall') return { k: 'push', l: top, t: '🤚 Rovescia la scala!', on: true };
    return null;
  }
  function doAct(G, c, a) {
    const p = P(c), x = action(G, c); if (!x || x.k !== a.k || !x.on) return;
    if (x.k === 'take') { const l = x.g || G.ld.find(l => l.st === 0); if (!l) return; l.st = 1; l.c = c.id; c.lt = (c.lt || 0) + 1; return; }
    if (x.k === 'ldrop') { const l = G.ld.find(l => l.st === 1 && l.c === c.id); if (l) dropLad(G, l, p.x, p.y); return; }
    if (x.k === 'place') { const l = G.ld.find(l => l.st === 1 && l.c === c.id); if (!l) return; l.st = 2; l.s = x.s; l.c = -1; l.pt = G.time; c.lp = (c.lp || 0) + 1; say(G, 'place', { a: c.id, s: x.s }); return; }
    if (x.k === 'climb') { const S = MP().spots[x.l.s]; c.cl = { s: x.l.s, d: 1, t0: G.time, T: CLIMB }; c.path = []; c.x = S.ax; c.y = S.ay; if (c === G.me) { cq.x = S.ax; cq.y = S.ay; } return; }
    if (x.k === 'jump') { const S = MP().spots[x.s]; tp(G, c, S.ax, S.ay); c.jN = (c.jN || 0) + 1; say(G, 'jump', { a: c.id, x: S.ax, y: S.ay }); hurt(G, c, 1, null, 'jump'); return; }
    if (x.k === 'down') { c.cl = { s: x.l.s, d: -1, t0: G.time, T: DOWN }; c.path = []; return; }
    if (x.k === 'push') { c.pu = { l: G.ld.indexOf(x.l), e: G.time + PUSH, x: p.x, y: p.y }; c.path = []; return; }
  }
  // fine della salita/discesa e della spinta (host)
  function climbTick(G) {
    for (const c of G.chars) {
      if (c.cl && G.time >= c.cl.t0 + c.cl.T) {
        const S = MP().spots[c.cl.s], up = c.cl.d > 0; c.cl = null;
        if (up) { tp(G, c, S.tx, S.ty); if (!c.inN || G.time - c.inN > 20) { c.inN = G.time; say(G, 'in', { a: c.id }); } c.up = (c.up || 0) + 1; }
        else tp(G, c, S.ax, S.ay);
      }
      if (c.cl && !ladAt(G, c.cl.s)) c.cl = null;
      if (c.pu) {
        const p = P(c), l = G.ld[c.pu.l];
        if (!l || l.st !== 2 || Math.hypot(p.x - c.pu.x, p.y - c.pu.y) > 0.35 || dead(G, c)) { c.pu = null; continue; }
        if (G.time >= c.pu.e) { c.pu = null; fall(G, l, c); }
      }
    }
  }

  // ======================= I TEMPI =======================
  function setupHalf(G) {
    G.hs = G.time; G.ar = []; G.bodies = [];
    G.ld = []; for (let i = 0; i < NLAD; i++) G.ld.push({ st: 0, c: -1, s: -1, x: 0, y: 0 });
    G.F = { st: 0, c: -1, x: FLAG0.x, y: FLAG0.y, dt: 0 }; G.fBest = G.fBest || [99, 99];
    for (const c of G.chars) { c.hp = HP; c.dn = 0; c.sf = 0; c.cl = null; c.pu = null; c.rl = 0; const p = baseSpawn(G, c); tp(G, c, p.x, p.y); c.role = null; }
    // ruoli del computer: attaccanti (2 portano le scale, gli altri arcieri e assaltatori), difensori (1 alla bandiera, gli altri sulle mura)
    const A = G.chars.filter(c => isAtk(G, c) && c.bot), D = G.chars.filter(c => !isAtk(G, c) && c.bot);
    A.forEach((c, i) => { c.role = i < 2 ? 'lad' : i % 2 ? 'arc' : 'run'; });
    D.forEach((c, i) => { c.role = i === 0 && D.length > 2 ? 'gua' : 'wal'; });
  }
  function endHalf(G, cap) {
    G.res[G.half - 1] = cap ? hT(G) : null;
    if (G.half === 1) { G.half = 2; G.iv = G.time + IV; G.ivK = cap ? 1 : 0; say(G, 'half', {}); return; }
    MODE.finish(G);
  }

  // ======================= I PERSONAGGI DEL COMPUTER =======================
  function go(c, x, y) { c.path = cqPath(c.x, c.y, x, y); if (!c.path.length && Math.hypot(c.x - x, c.y - y) < 1.2) c.path = [[x, y]]; c.goal = [x, y]; }
  const enemies = (G, c) => G.chars.filter(e => e.alive && e.t !== c.t && !dead(G, e));
  // una freccia da qui a li' passerebbe? (stessa traiettoria delle frecce vere, senza i personaggi)
  function clear(G, x0, y0, z0, x1, y1, z1) {
    const d0 = Math.hypot(x1 - x0, y1 - y0), pk = 0.45 + 0.13 * d0, n = Math.max(2, Math.ceil(d0 / 0.3));
    for (let i = 1; i < n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, z = z0 + (z1 - z0) * u + 4 * pk * u * (1 - u); if (u > 0.06 && z < topAt(Math.floor(x), Math.floor(y))) return false; }
    return true;
  }
  function botShoot(G, c) {
    if ((c.rl || 0) > G.time || c.cl || c.pu || G.ld.some(l => l.st === 1 && l.c === c.id) || (G.F.st === 1 && G.F.c === c.id)) return;
    const p = P(c), z0 = bodyZ(G, c) + 1.25; let best = null, bs = 1e9;
    for (const e of enemies(G, c)) {
      if (safe(G, e)) continue; const q = e.cl ? (() => { const v = clXY(G, e); return { x: v[0], y: v[1] }; })() : P(e), d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d > RMAX - 0.5 || d < 1) continue; if (G.lit === 'n' && !litFor(G, q.x, q.y) && d > 6) continue;
      if (!clear(G, p.x, p.y, z0, q.x, q.y, bodyZ(G, e) + 0.9)) continue;
      const s = d + (e.cl ? -4 : 0) + (G.F.st === 1 && G.F.c === e.id ? -6 : 0); if (s < bs) { bs = s; best = [e, q, d]; }
    }
    if (!best) return;
    const [e, q, d] = best, vx = (q.x - (e.lx || q.x)) / 0.4, vy = (q.y - (e.ly || q.y)) / 0.4, tf = 0.16 + d / 15;
    const tx = q.x + vx * tf * 0.8, ty = q.y + vy * tf * 0.8, [x1, y1] = aimEnd(p.x, p.y, tx - p.x, ty - p.y, Math.hypot(tx - p.x, ty - p.y), 1.25 + (c.t === G.me.t ? 0 : 0.15));
    mkArrow(G, c, x1, y1);
  }
  function botT(G, c, dt) {
    if (dead(G, c) || c.cl || c.pu) { c.walk = 0; return; }
    const p = c, atk = isAtk(G, c), zn = zoneAt(c.x, c.y), M = MP(), carry = G.ld.find(l => l.st === 1 && l.c === c.id), hasF = G.F.st === 1 && G.F.c === c.id;
    const act = k => { const a = action(G, c); if (a && a.k === k && a.on) { doAct(G, c, { k }); return true; } return false; };
    const placed = G.ld.filter(l => l.st === 2);
    const nearestL = (key) => { let b = null, bd = 1e9; for (const l of placed) { const S = M.spots[l.s], d = Math.hypot(S[key + 'x'] - c.x, S[key + 'y'] - c.y); if (d < bd) { bd = d; b = l; } } return b; };
    if (atk) {
      if (hasF) {
        if (zn === 'out') { go(c, CAMP.x, CAMP.y + 1.5); return; }
        if (act('down')) return; const l = nearestL('t'), ld = l ? Math.hypot(M.spots[l.s].tx - c.x, M.spots[l.s].ty - c.y) : 1e9;
        if (ld > 3 && (c.hp || 0) >= 2) { if (act('jump')) return; let b = null, bd = 1e9; for (const S of M.spots) { if (!cqCellFree(Math.floor(S.ax), Math.floor(S.ay))) continue; const d = Math.hypot(S.tx - c.x, S.ty - c.y); if (d < bd) { bd = d; b = S; } } if (b && bd < ld) { go(c, b.tx, b.ty); return; } }
        if (l) { const S = M.spots[l.s]; go(c, S.tx, S.ty); } else { const f = SQ.spawn({ x: 33.5, y: 22.5 }, 4); go(c, f.x, f.y); }
        return;
      }
      if (zn !== 'out') {   // dentro: alla bandiera (o a coprire chi la porta)
        if (G.F.st === 1) { const k = byId(G, G.F.c); if (k) { const q = P(k); if (Math.hypot(q.x - c.x, q.y - c.y) > 3) go(c, q.x, q.y); else c.path = []; } return; }
        go(c, G.F.st === 0 ? FLAG0.x : G.F.x, G.F.st === 0 ? FLAG0.y + 0.6 : G.F.y); return;
      }
      if (!carry && G.F.st === 2 && zoneAt(G.F.x, G.F.y) === 'out') { go(c, G.F.x, G.F.y); return; }
      if (carry) {
        if (act('place')) return;
        if (c.sp == null || !spotFree(G, c.sp)) {   // posto per la scala: lontano dai difensori, non troppo vicino alle altre
          let b = -1, bs = 1e9; M.spots.forEach((S, i) => { if (!spotFree(G, i) || !spotOk(S)) return; const nd = enemies(G, c).filter(e => Math.hypot(P(e).x - S.tx, P(e).y - S.ty) < 6).length; const s = Math.hypot(S.ax - c.x, S.ay - c.y) * 0.35 + nd * 5 + Math.random() * 4; if (s < bs) { bs = s; b = i; } });
          c.sp = b;
        }
        if (c.sp >= 0) { const S = M.spots[c.sp]; go(c, S.ax, S.ay); }
        return;
      }
      if (c.role === 'lad') {
        const gl = G.ld.find(l => l.st === 3), rk = G.ld.some(l => l.st === 0);
        if (gl && Math.hypot(gl.x - c.x, gl.y - c.y) < 18) { if (act('take')) return; go(c, gl.x + 0.5, gl.y + 1.5); return; }
        if (rk && placed.length < 2) { if (act('take')) return; go(c, 50.5, 51); return; }
      }
      if (placed.length && c.role !== 'arc' || placed.length >= 2) {   // all'assalto: alla scala piu' vicina e su
        if (act('climb')) return; const l = nearestL('a'); if (l) { const S = M.spots[l.s]; go(c, S.ax, S.ay); return; }
      }
      // arciere: si mette a tiro delle mura (meglio dietro un mantelletto) e tira ai difensori
      if (!c.post || Math.random() < 0.02) { const P2 = [[42.5, 15.5], [43.5, 22.5], [42.5, 29.5], [13.5, 42.5], [19.5, 44.5], [31.5, 43.5], [46.5, 37.5], [40.5, 19.5], [40.5, 26.5], [26.5, 41.5]]; c.post = rnd(P2); }
      if (Math.hypot(c.post[0] - c.x, c.post[1] - c.y) > 1) go(c, c.post[0], c.post[1]); else c.path = [];
      return;
    }
    // DIFENSORI
    if (G.F.st === 2) { const d = Math.hypot(G.F.x - c.x, G.F.y - c.y); if (d < 14 || c.role === 'gua') { go(c, G.F.x, G.F.y); return; } }
    if (G.F.st === 1) { const k = byId(G, G.F.c); if (k) { const q = P(k); if (zoneAt(q.x, q.y) !== 'out' || Math.hypot(q.x - c.x, q.y - c.y) < 8) { const S = (() => { const l = nearestL('t'); return l ? M.spots[l.s] : null; })(); if (zoneAt(q.x, q.y) === 'out' && S) go(c, S.tx, S.ty); else go(c, q.x, q.y); return; } } }
    const intr = enemies(G, c).filter(e => zoneAt(P(e).x, P(e).y) !== 'out');
    if (intr.length && (c.role === 'gua' || Math.random() < 0.6)) { const e = intr.sort((a, b) => Math.hypot(P(a).x - c.x, P(a).y - c.y) - Math.hypot(P(b).x - c.x, P(b).y - c.y))[0], q = P(e); if (Math.hypot(q.x - c.x, q.y - c.y) > 2.5) go(c, q.x, q.y); else c.path = []; return; }
    if (c.role === 'gua') { if (Math.hypot(FLAG0.x - c.x, FLAG0.y + 1 - c.y) > 2.5) go(c, FLAG0.x + 1, FLAG0.y + 1); else c.path = []; return; }
    // scale appoggiate: chi e' piu' vicino va a rovesciarle
    if (placed.length) {
      let tgt = null, bd = 1e9; for (const l of placed) { if (G.time - (l.pt || 0) < 1.2) continue; const S = M.spots[l.s], taken = G.chars.some(o => o !== c && o.bot && o.t === c.t && o.lt2 === l && Math.hypot(o.x - S.tx, o.y - S.ty) < Math.hypot(c.x - S.tx, c.y - S.ty)); if (taken) continue; const d = Math.hypot(S.tx - c.x, S.ty - c.y); if (d < bd) { bd = d; tgt = l; } }
      if (tgt && bd < 30) { c.lt2 = tgt; if (act('push')) return; const S = M.spots[tgt.s]; go(c, S.tx + (Math.random() - 0.5) * 0.4, S.ty + (Math.random() - 0.5) * 0.4); return; }
    }
    c.lt2 = null;
    // sulle mura verso dove sono gli attaccanti
    if (!c.post || Math.random() < 0.03) {
      const A = enemies(G, c); let mx = 45, my = 45; if (A.length) { mx = A.reduce((s, e) => s + P(e).x, 0) / A.length; my = A.reduce((s, e) => s + P(e).y, 0) / A.length; }
      const east = mx - 22 > my - 22; c.post = east ? [33.5 + Math.random(), Math.max(12, Math.min(31, my + (Math.random() - 0.5) * 8)) + 0.5] : [Math.max(12, Math.min(16, mx)) + (Math.random() < 0.5 ? 0 : 15) + 0.5, 33.5 + Math.random()];
      if (!cqCellFree(Math.floor(c.post[0]), Math.floor(c.post[1]))) c.post = [33.5, 22.5];
    }
    if (Math.hypot(c.post[0] - c.x, c.post[1] - c.y) > 1) go(c, c.post[0], c.post[1]); else c.path = [];
  }

  // ======================= IL GIOCO =======================
  const litFor = (G, x, y) => G.lit !== 'n' || MP().lamps.some(([lx, ly, r]) => Math.abs(lx - x) < r && Math.abs(ly - y) < r && Math.hypot(lx - x, ly - y) < r * 0.9);
  const LITN = { d: 'Giorno', s: 'Tramonto', n: 'Notte' };
  const MODE = CQ_MODES.assedio = {
    n: 'Assedio al castello',
    desc: '🏰 Due squadre: una assalta il castello di Roccaforte con le scale, l\'altra lo difende con gli archi. Poi si cambia. Vince chi conquista prima.',
    maps: [['castello', 'Castello di Roccaforte']],
    def: { map: 'castello', n: 8, fill: true, time: 240, lit: 'r' },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],
    opts: o => `<details class="row asHow"><summary><b>📖 Come si gioca</b> (tocca per leggere)</summary>${helpHtml()}</details>
      <div class="row"><div class="lbl">Durata di un tempo</div>${seg('time', [[180, '3 min'], [240, '4 min'], [300, '5 min']], o.time || 240)}</div>
      <div class="row"><div class="lbl">Luce</div>${seg('lit', [['r', '🎲 A caso'], ['d', '☀️ Giorno'], ['s', '🌇 Tramonto'], ['n', '🌙 Notte']], o.lit || 'r')}</div>
      <div class="hint">Due tempi: una squadra attacca, l'altra difende, poi si cambia. Vince chi conquista il castello prima.</div>`,
    read: d => ({ time: +d.get('time') || 240, lit: d.get('lit') || 'r' }),
    start(G) {
      cq.mapDirty = true; cqUseMap('castello');
      G.lit = G.opt.lit && G.opt.lit !== 'r' ? G.opt.lit : rnd(['d', 's', 'n']);
      G.lg = []; G.lgN = 0; G.ar = []; G.arN = 0; G.res = [null, null]; G.half = 1; G.iv = 0; G.fBest = [99, 99];
      SQ.split(G); G.a0 = Math.random() < 0.5 ? 0 : 1;
      for (const c of G.chars) Object.assign(c, { k: 0, d: 0, hi: 0, lp: 0, pn: 0, fc: 0, cap: 0, sh: 0, up: 0 });
      setupHalf(G); G.ldSig = null; G.ldOld = null;
      cq.x = G.me.x; cq.y = G.me.y;
    },
    gstart(G) { cq.mapDirty = true; cqUseMap('castello'); G.lg = []; G.lgN = 0; G.ar = []; G.arN = 0; G.fBest = [99, 99]; G.ld = []; for (let i = 0; i < NLAD; i++) G.ld.push({ st: 0, c: -1, s: -1 }); G.F = { st: 0, c: -1, x: FLAG0.x, y: FLAG0.y, dt: 0 }; G.res = [null, null]; G.half = 1; G.hs = 0; G.iv = 0; G.a0 = 0; G.lit = 'd'; G.ready = 0; G.ldSig = null; G.ldOld = null; },
    intro: G => isAtk(G, G.me) ? '⚔️ All\'attacco! Prendi una scala all\'accampamento' : '🛡️ Difendi il castello: tira frecce e rovescia le scale!',
    speed(c) { const G = cq.g; if (!G || dead(G, c) || c.cl || c.pu || inIv(G)) return 0; if (G.F.st === 1 && G.F.c === c.id) return CARRY_F; if (G.ld.some(l => l.st === 1 && l.c === c.id)) return CARRY_L; return 1; },
    big(G) {
      const me = G.me; if (G.guest && !G.ready) return '';
      if (inIv(G)) { const a = TEAMS[atkT(G) === 0 ? 1 : 0], b = TEAMS[1 - atkT(G) === 0 ? 1 : 0]; const r = G.res[0]; return (r != null ? '🏆 Castello conquistato in ' + mmss(r) + '!' : '🛡️ Il castello ha resistito!') + '\n🔁 Si cambia: ora attaccano i ' + TEAMS[1 - G.a0].e + ' ' + TEAMS[1 - G.a0].n + ' · ' + Math.ceil(G.iv - G.time); }
      if (dead(G, me)) return '💀 Colpito! Torni in gioco tra ' + Math.ceil(me.dn - G.time) + '…';
      if (me.cl) return me.cl.d > 0 ? '🧗 Sali…' : '🧗 Scendi…';
      if (G.F.st === 1 && G.F.c === me.id) return zoneAt(cq.x, cq.y) === 'out' ? '🚩 Corri all\'accampamento!' : '🚩 Scendi da una scala con la bandiera!';
      return '';
    },
    hud(G) {
      const me = G.me; if (me.t == null) return '🏰 Assedio al castello';
      const T = TEAMS[me.t], atk = isAtk(G, me), left = G.opt.time - hT(G), rec = G.half === 2 && G.res[0] != null ? G.res[0] : null;
      return `${T.e} <b style="color:${T.l}">${T.n}</b> · ${atk ? '⚔️ attaccate' : '🛡️ difendete'} · ${G.half}° tempo · ⏱ <b>${mmss(inIv(G) ? G.opt.time : Math.min(left, rec != null ? rec - hT(G) : left))}</b>` + (rec != null ? ` · 🎯 record ${mmss(rec)}` : '');
    },
    hide: c => dead(cq.g, c),
    nameCol: c => c.t != null ? TEAMS[c.t].l : null,
    voice: SQ.voice,
    btn(G) { if (G.guest && !G.ready) return null; const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) { const me = G.me, a = action(G, me); if (!a || !a.on) return; beep(520, 0.04, 0.02); if (G.guest) { cqNetSend({ k: 'a', a: a.k }); if (a.k === 'climb') { const S = MP().spots[a.l.s]; cq.x = S.ax; cq.y = S.ay; } } else doAct(G, me, { k: a.k }); },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'a') doAct(G, c, { k: o.a });
      if (o.k === 'sh' && !dead(G, c) && (c.rl || 0) <= G.time + 0.25 && canShoot(G, c)) { const a = mkArrow(G, c, o.x, o.y, o.q); }
    },
    draw(c) {   // chi sale o scende la scala: disegnato lungo la scala
      const G = cq.g; if (!G || !c.cl) return null;
      const u = clU(G, c), S = MP().spots[c.cl.s], [x, y] = clXY(G, c), dx = x - S.ax, dy = y - S.ay, z = u * WZ * HB;
      const f = (g, X, Y, TW, L, wk, fc) => { const U = TW * 0.575; cqPlayer(g, X + (dx - dy) * TW / 2, Y + (dx + dy) * TW / 4 - z * U, TW, L, G.time * 9, S.w === 'E' ? -1 : 1); };
      f.top = cqTop(cqLookOf(c)) + z * 0.575 - (dx + dy) / 4; return f;
    },
    local(G, dt) {
      const me = G.me; if (G.guest && !G.ready) return;
      syncLd(G);
      // per i computer: dove si muovono (per mirare un po' avanti)
      for (const c of G.chars) { if (!c.lxT || G.time - c.lxT > 0.4) { const p = P(c); c.lx = c.cx0 == null ? p.x : c.cx0; c.ly = c.cy0 == null ? p.y : c.cy0; c.cx0 = p.x; c.cy0 = p.y; c.lxT = G.time; } }
      // nome della zona quando ci entro
      { const z = zoneAt(cq.x, cq.y), r = roomAt(cq.x, cq.y), R = r >= 0 ? MP().rooms[r] : null, n = z === 'wall' ? (R && R.ala === 'T' ? 'Torre' : 'Camminamento') : R ? R.n : '';
        if (n && n !== G.myZn) { if (G.myZn != null && n !== 'Campagna' && n !== 'Mura' && n !== 'Portone' && n !== 'Ponte levatoio') G.zn = { n, t: performance.now() }; G.myZn = n; } }
      // il mio arco: si ricarica (il pulsante lo mostra)
      bowUI(G);
      if (G.myHp != null && me.hp < G.myHp && !dead(G, me)) { G.myHurt = performance.now(); thud(0.4, 160); }
      G.myHp = me.hp;
    },
    tick(G, dt) {
      if (inIv(G)) { if (G.time + dt >= G.iv) { G.iv = 0; setupHalf(G); } G.ar = []; return; }
      if (G.iv === 0 && G.half === 2 && !G.h2) { G.h2 = 1; }
      arTick(G); climbTick(G);
      for (const c of G.chars) if (c.dn && c.dn <= G.time) revive(G, c);
      // bandiera: chi la porta, a terra torna da sola, i difensori la riportano toccandola, gli attaccanti la prendono
      const F = G.F;
      if (F.st === 1) { const c = byId(G, F.c); if (!c || !c.alive || dead(G, c)) { if (c) { const p = P(c); F.st = 2; F.c = -1; F.x = p.x; F.y = p.y; F.dt = G.time; } else { F.st = 0; F.c = -1; } } }
      if (F.st === 2 && G.time - F.dt > BACK) { F.st = 0; F.x = FLAG0.x; F.y = FLAG0.y; say(G, 'fret', {}); }
      for (const c of G.chars) {
        if (!c.alive || dead(G, c) || safe(G, c) || c.cl) continue;
        const p = P(c), fx = F.st === 0 ? FLAG0.x : F.x, fy = F.st === 0 ? FLAG0.y : F.y, d = Math.hypot(p.x - fx, p.y - fy);
        if (isAtk(G, c)) { if ((F.st === 0 || F.st === 2) && d < GRAB && !G.ld.some(l => l.st === 1 && l.c === c.id)) { F.st = 1; F.c = c.id; c.fc = (c.fc || 0) + 1; say(G, 'take', { a: c.id }); } }
        else if (F.st === 2 && d < GRAB) { F.st = 0; F.x = FLAG0.x; F.y = FLAG0.y; say(G, 'fret', { a: c.id }); }
      }
      if (F.st === 1) { const c = byId(G, F.c), p = P(c), t = atkT(G), dc = Math.hypot(p.x - CAMP.x, p.y - CAMP.y); G.fBest[t] = Math.min(G.fBest[t], Math.max(0, dc - CAMP_R));
        if (dc < CAMP_R) { c.cap = (c.cap || 0) + 1; say(G, 'cap', { a: c.id }); endHalf(G, true); return; } }
      else if (G.fBest[atkT(G)] === 99 && F.st === 2) G.fBest[atkT(G)] = Math.max(0, Math.hypot(F.x - CAMP.x, F.y - CAMP.y) - CAMP_R);
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.35 + Math.random() * 0.2; botT(G, c, dt); if (Math.random() < 0.55) botShoot(G, c); }
        if (!dead(G, c) && !c.cl && !c.pu) cqModeStep(c, dt, 0.9 * (MODE.speed(c) || 0));
      }
      // il tempo: finito = il castello ha resistito; nel secondo tempo, se l'altra squadra ha conquistato, basta superare il suo tempo
      const lim = G.half === 2 && G.res[0] != null ? G.res[0] : G.opt.time;
      if (hT(G) >= lim) endHalf(G, false);
    },
    finish(G) {
      const [a, b] = G.res, A = G.a0, B = 1 - G.a0;   // a = tempo della squadra A (attaccava per prima), b = della squadra B
      let w = -1, why = '';
      const txt = (t, r) => TEAMS[t].e + ' ' + TEAMS[t].n + ': ' + (r != null ? 'conquistato in ' + mmss(r) : 'non hanno conquistato');
      if (a != null && b != null) { w = a < b ? A : b < a ? B : -1; why = txt(A, a) + ' · ' + txt(B, b) + '.'; }
      else if (a != null) { w = A; why = txt(A, a) + ' · ' + TEAMS[B].e + ' ' + TEAMS[B].n + ': non sono riusciti a fare meglio.'; }
      else if (b != null) { w = B; why = txt(B, b) + ' · ' + txt(A, a) + '.'; }
      else { const fa = Math.round(G.fBest[A]), fb = Math.round(G.fBest[B]); if (fa < 99 || fb < 99) { w = fa < fb ? A : fb < fa ? B : -1; why = 'Nessuno ha conquistato il castello. Spareggio: ' + (w >= 0 ? 'i ' + TEAMS[w].n + ' hanno portato la bandiera più vicino all\'accampamento.' : 'pari anche lì.'); } else why = 'Nessuno è riuscito nemmeno a toccare la bandiera. Che assedio di m…';
        w = w; }
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— ' + TEAMS[c.t].e + [c.cap ? '🏆 conquista' : '', '🎯 ' + (c.k || 0) + ' abbattuti', c.lp ? '🪜 ' + c.lp + ' scale' : '', c.pn ? '🤚 ' + c.pn + ' scale rovesciate' : '', c.fc ? '🚩 ' + c.fc + ' bandiere prese' : ''].filter(Boolean).join(' · ')];
      const score = c => (c.cap || 0) * 20 + (c.k || 0) * 3 + (c.pn || 0) * 4 + (c.lp || 0) * 2 + (c.fc || 0) * 5;
      SQ.end(G, w, why + funny(G, w), line, score);
    },
    csnap: c => { const G = cq.g, p = c === G.me ? { x: cq.x, y: cq.y } : c; return [c.t, c.hp == null ? HP : c.hp, r1(Math.max(0, (c.dn || 0) - G.time)), r1(Math.max(0, (c.sf || 0) - G.time)), c.cl ? [c.cl.s, c.cl.d, r2(c.cl.t0 - G.time), c.cl.T] : 0, c.pu ? r1(c.pu.e - G.time) : 0, c.tpN || 0, c.tp || 0, r1(Math.max(0, (c.rl || 0) - G.time)), [c.k || 0, c.d || 0, c.lp || 0, c.pn || 0, c.fc || 0, c.cap || 0]]; },
    capply(G, c, a) {
      c.t = a[0]; c.hp = a[1]; const was = !!c.dn && c.dn > G.time; c.dn = a[2] > 0 ? G.time + a[2] : 0; c.sf = a[3] > 0 ? G.time + a[3] : 0;
      if (was && !c.dn) c.angel = G.time;
      c.cl = a[4] ? { s: a[4][0], d: a[4][1], t0: G.time + a[4][2], T: a[4][3] } : null; c.pu = a[5] ? { e: G.time + a[5] } : null;
      c.tpN = a[6]; c.tp = a[7] || null; if (c !== G.me || !G.shotT || performance.now() - G.shotT > 600) c.rl = G.time + a[8];
      [c.k, c.d, c.lp, c.pn, c.fc, c.cap] = a[9];
      if (c === G.me) { if (!G.ready) { G.ready = 1; G.myTp = c.tpN; } else if (c.tpN !== G.myTp) { G.myTp = c.tpN; if (c.tp) { cq.x = c.tp[0]; cq.y = c.tp[1]; } } }
    },
    snap(G) {
      return { lg: G.lg, h: G.half, hs: r1(G.time - G.hs), iv: r1(Math.max(0, G.iv - G.time)), res: G.res, a0: G.a0, li: G.lit, fb: G.fBest,
        F: [G.F.st, G.F.c, r1(G.F.x), r1(G.F.y), r1(G.time - G.F.dt)], ld: G.ld.map(l => [l.st, l.c, l.s, l.x || 0, l.y || 0]),
        ar: G.ar.filter(a => G.time - a.t0 < 3).map(a => [a.id, a.o, a.q, r2(a.x0), r2(a.y0), r2(a.z0), r2(a.x1), r2(a.y1), r2(a.z1), r2(a.t0 - G.time), r2(a.d), r2(a.pk), a.te ? r2(a.te - G.time) : 0, a.hit, a.te ? [r2(a.hx), r2(a.hy), r2(a.hz)] : 0]),
        bd: G.bodies.map(b => [b.id, r2(b.x), r2(b.y), b.face, r1(b.t - G.time)]) };
    },
    apply(G, x) {
      G.half = x.h; G.hs = G.time - x.hs; G.iv = x.iv > 0 ? G.time + x.iv : 0; G.res = x.res; G.a0 = x.a0; G.lit = x.li; G.fBest = x.fb;
      G.F = { st: x.F[0], c: x.F[1], x: x.F[2], y: x.F[3], dt: G.time - x.F[4] };
      G.ld = x.ld.map(a => ({ st: a[0], c: a[1], s: a[2], x: a[3], y: a[4] }));
      const seen = new Set(G.ar.map(a => a.id));
      for (const v of x.ar) { const o = { id: v[0], o: v[1], q: v[2], x0: v[3], y0: v[4], z0: v[5], x1: v[6], y1: v[7], z1: v[8], t0: G.time + v[9], d: v[10], pk: v[11], te: v[12] ? G.time + v[12] : 0, hit: v[13] }; if (v[14]) [o.hx, o.hy, o.hz] = v[14]; const old = G.ar.find(a => a.id === o.id); if (old) Object.assign(old, { te: o.te, hit: o.hit, hx: o.hx, hy: o.hy, hz: o.hz }); else G.ar.push(o); }
      G.ar = G.ar.filter(a => a.id < 0 ? G.time - a.t0 < a.d + 0.2 && !G.ar.some(b => b.o === G.me.id && b.q === a.q && b.id > 0) : G.time - a.t0 < 4 + a.d);
      if (x.bd) G.bodies = x.bd.map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: G.time + a[4], look: cqLookOf(c), name: c.name, nk: 1 } : null; }).filter(Boolean);
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // luce: giorno (tutto chiaro), tramonto (caldo, un po' buio), notte (torce sulle mura, bracieri, fuoco dell'accampamento: al buio non si vede chi e' lontano)
    night(G) {
      if (G.lit === 'd' || !G.lit) return { a: 0, r: 0, lights: [], see: () => true };
      const me = G.me, near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k, lights = [];
      for (const [x, y, r] of MP().lamps) if (near(x, y, 22)) lights.push([x, y, r, 0.85]);
      for (const c of G.chars) if (c !== me && c.alive && c.t === me.t && near(c.x, c.y, 16)) lights.push([c.x, c.y, 1.2, 0.5]);
      for (const a of G.ar) if (!a.te && near(a.x0, a.y0, 20)) { const [x, y] = arPos(a, G.time); lights.push([x, y, 0.5, 0.4]); }
      if (G.lit === 's') return { a: 0.42, r: 7, lights, see: () => true };
      return { a: 0.9, r: 4.2, lights, see: (x, y) => { const d = Math.hypot(x - cq.x, y - cq.y); if (d < 6.5) return true; const c = G.chars.find(o => o.x === x && o.y === y); if (c && c.t === me.t) return true; return d < 22 && litFor(G, x, y); } };
    },
    // sopra al personaggio: cerchio della squadra, i CUORI, la scala o la bandiera in spalla, la barretta della spinta, l'arco
    deco(g, c, X, Y, TW, G, L) {
      SQ.ring(g, c, X, Y, TW);
      if (dead(G, c)) return;
      const lad = G.ld && G.ld.some(l => l.st === 1 && l.c === c.id), fl = G.F && G.F.st === 1 && G.F.c === c.id, f = c === G.me ? cq.face : c.face || 1;
      if (!c.cl && !lad && !fl) bow(g, X + f * TW * 0.26, Y - TW * 0.72, TW, f);
      if (lad) { g.save(); g.translate(X, Y - TW * 1.05); g.rotate(-0.38 * f); g.strokeStyle = '#8a5a2a'; g.lineWidth = Math.max(2.5, TW / 14); g.beginPath(); for (const s of [-0.12, 0.12]) { g.moveTo(-TW * 0.95, s * TW); g.lineTo(TW * 0.95, s * TW); } g.stroke(); g.strokeStyle = '#b07a40'; g.lineWidth = Math.max(2, TW / 20); g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(i * TW * 0.2, -0.12 * TW); g.lineTo(i * TW * 0.2, 0.12 * TW); } g.stroke(); g.restore(); }
      if (fl) flag(g, X - f * TW * 0.25, Y - TW * 0.5, TW, TEAMS[1 - atkT(G)].c, performance.now() / 1000, 0.8);
      // cuori sopra il nome (anche dei nemici: si vede chi e' quasi a terra)
      const dr = c.cl ? MODE.draw(c) : null, top = Y - TW * (dr ? dr.top : cqTop(L)) - 15, hp = c.hp == null ? HP : c.hp, sh = c.hitT && G.time - c.hitT < 0.35 ? Math.sin((G.time - c.hitT) * 60) * 2 : 0;
      hearts(g, X + sh, top, hp, safe(G, c));
      if (c.pu) { const k = Math.max(0, Math.min(1, 1 - (c.pu.e - G.time) / PUSH)), bw = 34; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - bw / 2 - 2, top - 14, bw + 4, 8, 4); g.fill(); g.fillStyle = '#ffb040'; cqRR(g, X - bw / 2, top - 12, bw * k, 4, 2); g.fill(); }
    },
    extras(G) {
      const out = [];
      // la bandiera sull'asta (a casa o a terra) e lo stendardo dell'accampamento: disegnati in ordine di profondita'
      if (G.F && G.F.st !== 1) { const x = G.F.st === 0 ? FLAG0.x : G.F.x, y = G.F.st === 0 ? FLAG0.y : G.F.y; if (!MODE.__fd) { MODE.__fd = (g, X, Y, TW) => { const G2 = cq.g; flag(g, X, Y, TW, TEAMS[1 - atkT(G2)].c, performance.now() / 1000, G2.F.st === 2 ? 0.7 : 1.15); if (G2.F.st === 2) { const k = Math.max(0, 1 - (G2.time - G2.F.dt) / BACK); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(X, Y - TW * 1.9, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); } }; MODE.__fd.top = 2.3; } out.push({ x, y, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__fd }); }
      if (!MODE.__cb) { MODE.__cb = (g, X, Y, TW) => banner(g, X, Y, TW, TEAMS[atkT(cq.g)].c, performance.now() / 1000); MODE.__cb.top = 1.5; }
      out.push({ x: CAMP.x + 0.2, y: CAMP.y - 1.6, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__cb });
      return out;
    },
    over(g, G, sx, sy, TW) {
      if (G.guest && !G.ready) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, now = performance.now() / 1000, U = TW * 0.575, near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r;
      const SX = (x, y, z) => sx(x, y), SY = (x, y, z) => sy(x, y) + cqZpx(x, y, TW) - z * U;   // punto del mondo all'altezza z (U)
      const MN = MODE.night(G);
      // tramonto: velo caldo
      if (G.lit === 's') { g.fillStyle = 'rgba(255,120,50,.07)'; g.fillRect(0, 0, W2, H2); }
      // zona dell'accampamento (dove si porta la bandiera)
      if (near(CAMP.x, CAMP.y, 22)) { const T = TEAMS[atkT(G)]; g.beginPath(); for (let i = 0; i <= 32; i++) { const t = i / 32 * Math.PI * 2, X = sx(CAMP.x + Math.cos(t) * CAMP_R, CAMP.y + Math.sin(t) * CAMP_R), Y = sy(CAMP.x + Math.cos(t) * CAMP_R, CAMP.y + Math.sin(t) * CAMP_R); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.fillStyle = T.c + (G.F.st === 1 ? '38' : '1c'); g.fill(); g.setLineDash([8, 6]); g.lineDashOffset = -now * 20; g.strokeStyle = T.c + 'c0'; g.lineWidth = 2.5; g.stroke(); g.setLineDash([]); }
      // FRECCE in volo (con l'ombra a terra) e piantate
      for (const a of G.ar) {
        if (!near(a.x0, a.y0, 26) && !near(a.x1, a.y1, 26)) continue;
        if (a.id > 0 && a.o === me.id && G.ar.some(b => b.id < 0 && b.q === a.q) && !a.te) continue;
        const fly = !a.te || G.time < a.te;
        if (fly) {
          const [x, y, z, u] = arPos(a, G.time); if (u <= 0) continue; const [x2, y2, z2] = arPos(a, G.time - 0.03), X = SX(x, y), Y = SY(x, y, z), X2 = SX(x2, y2), Y2 = SY(x2, y2, z2);
          let dx = X - X2, dy = Y - Y2; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; const Lg = TW * 0.42;
          g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * 0.12, TW * 0.05, 0, 0, 7); g.fill();
          g.strokeStyle = '#5a3a1a'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X, Y); g.stroke();
          g.fillStyle = '#c8ccd2'; g.beginPath(); g.moveTo(X + dx * 6, Y + dy * 6); g.lineTo(X - dy * 3, Y + dx * 3); g.lineTo(X + dy * 3, Y - dx * 3); g.fill();
          g.strokeStyle = TEAMS[a.t != null ? a.t : (byId(G, a.o) || {}).t || 0].l; g.lineWidth = 2; g.beginPath(); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X - dx * Lg * 0.7 - dy * 3, Y - dy * Lg * 0.7 + dx * 3); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X - dx * Lg * 0.7 + dy * 3, Y - dy * Lg * 0.7 - dx * 3); g.stroke();
        } else if (a.hit < 0 && a.hx != null) {   // piantata (sparisce piano)
          const k = 1 - (G.time - a.te) / 4; if (k <= 0) continue; g.globalAlpha = Math.min(1, k * 2);
          const X = SX(a.hx, a.hy), Y = SY(a.hx, a.hy, a.hz), ddx = sx(a.x1, a.y1) - sx(a.x0, a.y0), ddy = sy(a.x1, a.y1) - sy(a.x0, a.y0), m = Math.hypot(ddx, ddy) || 1, ux = ddx / m, uy = ddy / m * 0.5 + 0.5;
          g.strokeStyle = '#5a3a1a'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(X, Y); g.lineTo(X - ux * TW * 0.3, Y - uy * TW * 0.3); g.stroke(); g.globalAlpha = 1;
        } else if (a.hit >= 0 && G.time - a.te < 0.6 && a.hx != null) {   // colpito: sprazzo rosso e -1
          const k = (G.time - a.te) / 0.6, X = SX(a.hx, a.hy), Y = SY(a.hx, a.hy, a.hz);
          g.globalAlpha = 1 - k; g.fillStyle = a.blk ? '#e8e8f0' : '#ff4a3a'; for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * k * TW * 0.4, Y + Math.sin(t) * k * TW * 0.3, 2.5, 0, 7); g.fill(); }
          g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('-1 ❤', X, Y - TW * (0.5 + k * 0.6)); g.fillStyle = '#ff6a5a'; g.fillText('-1 ❤', X, Y - TW * (0.5 + k * 0.6)); g.globalAlpha = 1;
        }
      }
      // MIRA (io): traiettoria tratteggiata e cerchio dove arriva
      if (G.aim && G.aim.ok) {
        const A = G.aim, p = { x: cq.x, y: cq.y }, z0 = (me.cl ? clZ(G, me) : zAt(p.x, p.y)) + 1.25, z1 = zAt(A.x, A.y) + 0.45, d0 = Math.hypot(A.x - p.x, A.y - p.y), pk = 0.45 + 0.13 * d0;
        g.save(); g.setLineDash([6, 6]); g.lineDashOffset = -now * 30; g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 2.5; g.beginPath();
        for (let i = 0; i <= 18; i++) { const u = i / 18, x = p.x + (A.x - p.x) * u, y = p.y + (A.y - p.y) * u, z = z0 + (z1 - z0) * u + 4 * pk * u * (1 - u); i ? g.lineTo(SX(x, y), SY(x, y, z)) : g.moveTo(SX(x, y), SY(x, y, z)); }
        g.stroke(); g.restore();
        const r = 0.25 + 0.06 * d0, X = sx(A.x, A.y), Y = sy(A.x, A.y); g.strokeStyle = A.tg ? 'rgba(255,90,70,.95)' : 'rgba(255,240,200,.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y, TW * r * 1.1, TW * r * 0.55, 0, 0, 7); g.stroke();
        if (A.tg) { g.beginPath(); g.ellipse(X, Y, TW * r * 0.5, TW * r * 0.25, 0, 0, 7); g.stroke(); }
      }
      // sagome di chi e' dietro alle mura (i muri davanti coprirebbero tutto il cortile)
      for (const c of G.chars) {
        if (!c.alive || dead(G, c) || c.cl) continue; const p = P(c); if (!near(p.x, p.y, 20)) continue; if (c !== me && !MN.see(c.x, c.y)) continue;
        const z = zAt(p.x, p.y), xi = Math.floor(p.x), yi = Math.floor(p.y); let hid = false;
        for (const [dx, dy] of [[1, 1], [1, 2], [2, 1], [2, 2], [0, 1], [1, 0], [2, 3], [3, 2]]) if (cqHc(xi + dx, yi + dy) * HB > z + 1.4) { hid = true; break; }
        if (!hid) continue;
        g.globalAlpha = 0.5; cqPlayer(g, sx(p.x, p.y), sy(p.x, p.y), TW, c === me ? cqLook() : cqLookOf(c), c === me ? cq.walk : c.walk, c === me ? cq.face : c.face); g.globalAlpha = 1;
        g.strokeStyle = TEAMS[c.t || 0].c; g.lineWidth = 2; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(sx(p.x, p.y), sy(p.x, p.y), TW * 0.34, TW * 0.17, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
      }
      // scale appoggiate: per i difensori un segnale rosso sopra (da rovesciare!)
      if (!isAtk(G, me)) for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s]; if (!near(S.tx, S.ty, 22)) continue; const X = SX(S.tx, S.ty), Y = SY(S.tx, S.ty, 0) - TW * (1.9 + 0.12 * Math.sin(now * 5)); g.fillStyle = 'rgba(200,40,30,.9)'; g.beginPath(); g.arc(X, Y, 11, 0, 7); g.fill(); g.font = '13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('🪜', X, Y + 1); }
      // freccia sul bordo verso l'obiettivo
      if (!dead(G, me) && !inIv(G)) { const o = objective(G); if (o) SQ.edge(g, sx(o.x, o.y), sy(o.x, o.y) - TW, W2, H2, o.i, o.c); }
      // colpito: bordo rosso per un attimo
      if (G.myHurt && performance.now() - G.myHurt < 450) { const k = 1 - (performance.now() - G.myHurt) / 450; g.strokeStyle = 'rgba(230,30,30,' + (0.55 * k) + ')'; g.lineWidth = 16; g.strokeRect(0, 0, W2, H2); }
      // nome della zona quando ci entro
      if (G.zn) { const t = performance.now() - G.zn.t; if (t < 2200) { const a = Math.min(1, t / 200, (2200 - t) / 500); g.globalAlpha = a; const tx = G.zn.n.toUpperCase(); g.font = '800 14px system-ui,sans-serif'; const w = g.measureText(tx).width + 28; g.fillStyle = 'rgba(20,18,16,.72)'; cqRR(g, W2 / 2 - w / 2, H2 * 0.26 - 15, w, 30, 10); g.fill(); g.fillStyle = '#f2e2b8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, W2 / 2, H2 * 0.26); g.globalAlpha = 1; } else G.zn = null; }
      minimap(g, G, W2);
    }
  };
  const canShoot = (G, c) => !dead(G, c) && !c.pu && !inIv(G) && !(G.ld.some(l => l.st === 1 && l.c === c.id)) && !(G.F.st === 1 && G.F.c === c.id);
  // l'obiettivo del momento (freccia sul bordo)
  function objective(G) {
    const me = G.me, M = MP(), z = zoneAt(cq.x, cq.y), T = TEAMS[me.t], E = TEAMS[1 - me.t];
    if (isAtk(G, me)) {
      if (G.F.st === 1 && G.F.c === me.id) { if (z === 'out') return { x: CAMP.x, y: CAMP.y, i: '⛺', c: T.c }; const l = G.ld.filter(l => l.st === 2).sort((a, b) => Math.hypot(M.spots[a.s].tx - cq.x, M.spots[a.s].ty - cq.y) - Math.hypot(M.spots[b.s].tx - cq.x, M.spots[b.s].ty - cq.y))[0]; return l ? { x: M.spots[l.s].tx, y: M.spots[l.s].ty, i: '🪜', c: T.c } : null; }
      if (G.ld.some(l => l.st === 1 && l.c === me.id)) return null;
      if (z !== 'out' || G.F.st === 2) return { x: G.F.st === 0 ? FLAG0.x : G.F.x, y: G.F.st === 0 ? FLAG0.y : G.F.y, i: '🚩', c: E.c };
      const l = G.ld.filter(l => l.st === 2).sort((a, b) => Math.hypot(M.spots[a.s].ax - cq.x, M.spots[a.s].ay - cq.y) - Math.hypot(M.spots[b.s].ax - cq.x, M.spots[b.s].ay - cq.y))[0];
      if (l) return { x: M.spots[l.s].ax, y: M.spots[l.s].ay, i: '🪜', c: T.c };
      if (G.ld.some(l => l.st === 0)) return { x: 50.5, y: 50, i: '🪜', c: T.c };
      return null;
    }
    if (G.F.st === 1) { const k = byId(G, G.F.c); if (k) { const p = P(k); return { x: p.x, y: p.y, i: '🚩', c: E.c }; } }
    if (G.F.st === 2) return { x: G.F.x, y: G.F.y, i: '🚩', c: T.c };
    const l = G.ld.filter(l => l.st === 2).sort((a, b) => Math.hypot(M.spots[a.s].tx - cq.x, M.spots[a.s].ty - cq.y) - Math.hypot(M.spots[b.s].tx - cq.x, M.spots[b.s].ty - cq.y))[0];
    if (l) return { x: M.spots[l.s].tx, y: M.spots[l.s].ty, i: '🪜', c: '#e04030' };
    return null;
  }

  // ---- disegni piccoli: cuori, arco, bandiera, stendardo ----
  function hearts(g, X, Y, hp, sf) {
    const s = 5.2, gap = 13, x0 = X - gap;
    g.save(); if (sf) g.globalAlpha = 0.55 + 0.35 * Math.sin(performance.now() / 90);
    for (let i = 0; i < HP; i++) {
      const cx = x0 + i * gap, on = i < hp;
      g.beginPath(); g.moveTo(cx, Y + s * 0.95); g.bezierCurveTo(cx - s * 1.5, Y - s * 0.1, cx - s * 0.8, Y - s * 1.25, cx, Y - s * 0.45); g.bezierCurveTo(cx + s * 0.8, Y - s * 1.25, cx + s * 1.5, Y - s * 0.1, cx, Y + s * 0.95); g.closePath();
      g.fillStyle = on ? '#ff3b4e' : 'rgba(30,20,24,.55)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = on ? '#7a0a18' : 'rgba(255,255,255,.45)'; g.stroke();
      if (on) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - s * 0.45, Y - s * 0.35, s * 0.25, 0, 7); g.fill(); }
    }
    g.restore();
  }
  function bow(g, X, Y, TW, f) {   // arco in mano (f = verso dove guarda)
    const r = TW * 0.28, a = 1.0, cx = X - f * r * 0.5, ex = cx + f * Math.cos(a) * r;
    g.strokeStyle = '#6a3a18'; g.lineWidth = Math.max(2, TW / 20); g.beginPath(); if (f > 0) g.arc(cx, Y, r, -a, a); else g.arc(cx, Y, r, Math.PI - a, Math.PI + a); g.stroke();
    g.strokeStyle = 'rgba(240,230,210,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ex, Y - Math.sin(a) * r); g.lineTo(ex, Y + Math.sin(a) * r); g.stroke();
  }
  function flag(g, X, Y, TW, col, t, k = 1) {
    const u = TW / 34 * k, h = 58 * u;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 7 * u, 3 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2a1a'; g.fillRect(X - 1.6 * u, Y - h, 3.2 * u, h); g.fillStyle = '#e8c040'; g.beginPath(); g.arc(X, Y - h, 2.8 * u, 0, 7); g.fill();
    const w = 28 * u, fh = 18 * u, top = Y - h + 3 * u, wv = i => Math.sin(t * 6 + i * 2.2) * 3 * u * i;
    g.fillStyle = col; g.beginPath(); g.moveTo(X + 1.6 * u, top);
    for (let i = 1; i <= 4; i++) g.lineTo(X + 1.6 * u + w * i / 4, top + wv(i / 4));
    for (let i = 4; i >= 0; i--) g.lineTo(X + 1.6 * u + w * i / 4, top + fh + wv(i / 4) * 1.2);
    g.closePath(); g.fill();
    g.fillStyle = '#f2d050'; g.beginPath(); g.arc(X + 1.6 * u + w * 0.45, top + fh * 0.5 + wv(0.45), 3.6 * u, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(X + 1.6 * u, top); for (let i = 1; i <= 4; i++) g.lineTo(X + 1.6 * u + w * i / 4, top + wv(i / 4)); for (let i = 4; i >= 0; i--) g.lineTo(X + 1.6 * u + w * i / 4, top + 4 * u + wv(i / 4)); g.closePath(); g.fill();
  }
  function banner(g, X, Y, TW, col, t) {
    const u = TW / 34, h = 64 * u, sw = Math.sin(t * 2.5) * 1.8 * u;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 8 * u, 3.5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(X - 1.8 * u, Y - h, 3.6 * u, h); g.fillRect(X - 11 * u, Y - h, 22 * u, 3 * u);
    g.fillStyle = col; g.beginPath(); g.moveTo(X - 10 * u, Y - h + 3 * u); g.lineTo(X + 10 * u, Y - h + 3 * u); g.lineTo(X + 10 * u + sw, Y - h + 30 * u); g.lineTo(X + sw, Y - h + 24 * u); g.lineTo(X - 10 * u + sw, Y - h + 30 * u); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = Math.round(12 * u) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', X + sw * 0.5, Y - h + 14 * u);
  }

  // ======================= MAPPA: radar in alto a destra (toccandolo si ingrandisce) =======================
  function mapImg() {
    const M = MP(); if (M.mimg) return M.mimg;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, fl = cqFloor[y] && cqFloor[y][x], s = cqSolid[y] && cqSolid[y][x], z = cqHc(x, y); let col;
      if (!fl) col = lake(x, y) || inMoat(x, y) ? [44, 90, 112] : [30, 50, 30];
      else if (z >= 3) col = s && s.prop === 'aMerl' ? [170, 162, 148] : inTower(x, y) ? [160, 152, 138] : [140, 133, 120];
      else if (castle(x, y)) col = inKeep(x, y) ? [120, 80, 140] : z ? [150, 142, 128] : [118, 112, 102];
      else { const hx = parseInt(fl.slice(1), 16); col = [(hx >> 16) & 255, (hx >> 8) & 255, hx & 255].map(v => Math.min(255, v * 1.15)); if (s && /pine|oak/.test(s.prop)) col = [40, 80, 34]; else if (s) col = col.map(v => v * 0.75); }
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), img = mapImg(), now = performance.now(), MN = MODE.night(G);
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(14,16,20,.88)'; g.strokeStyle = '#c8a050'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; g.drawImage(img, 0, 0); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0);
    const dot = (x, y, r, col) => { const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke(); };
    const ico = (x, y, t, sz) => { const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 14 : 10;
    ico(CAMP.x, CAMP.y, '⛺', sz);
    for (const l of G.ld) if (l.st === 2) { const S = M.spots[l.s]; ico(S.fx + 0.5, S.fy + 0.5, '🪜', sz - 1); } else if (l.st === 3) ico(l.x + 0.5, l.y + 0.5, '🪜', sz - 3);
    if (G.F.st === 0) ico(FLAG0.x, FLAG0.y, '🚩', sz + 1); else if (G.F.st === 2) ico(G.F.x, G.F.y, '🚩', sz + 1);
    for (const c of G.chars) { if (c === me || !c.alive || dead(G, c)) continue; const p = P(c); if (c.t !== me.t && !MN.see(c.x, c.y)) continue; if (c.t !== me.t && Math.hypot(p.x - cq.x, p.y - cq.y) > (big ? 30 : 16) && !(G.F.st === 1 && G.F.c === c.id)) continue; dot(p.x, p.y, G.F.st === 1 && G.F.c === c.id ? 4.5 : 3, TEAMS[c.t].c); }
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 62;
  function minimap(g, G, W2) {
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 8) / (60 * 0.7071) * 0.98, 31, 30, true);
      g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText('Castello di Roccaforte', W2 / 2, cy - R - 26);
      g.font = '600 12px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText('🚩 bandiera · 🪜 scale · ⛺ accampamento', W2 / 2, cy - R - 9); g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 10, 122 + RADAR, RADAR, 2.6, cq.x, cq.y, false);
  }

  // FRASI DI FINE PARTITA (con qualche parolaccia, come negli altri giochi): al massimo 4
  function funny(G, w) {
    const L = [], N = c => '<b>' + esc(c.name) + '</b>', add = (pr, t) => L.push([pr + Math.random() * 0.5, t]);
    for (const c of G.chars) {
      if ((c.pn || 0) >= 3) add(8, N(c) + ' ha rovesciato ' + c.pn + ' scale: gli attaccanti gli hanno dedicato una canzone. Piena di parolacce.');
      if ((c.fallN || 0) >= 2) add(7, N(c) + ' è caduto dalla scala ' + c.fallN + ' volte. Le sue chiappe chiedono pietà.');
      if ((c.k || 0) >= 6) add(7, N(c) + ' ha abbattuto ' + c.k + ' nemici. Robin Hood gli ha chiesto l\'autografo, quel maledetto.');
      if ((c.cap || 0) >= 1) add(6, N(c) + ' ha portato la bandiera fino all\'accampamento: stasera birra gratis, cavolo!');
      if ((c.d || 0) >= 6) add(5, N(c) + ' è caduto ' + c.d + ' volte. Più frecce in corpo di un puntaspilli, porca miseria.');
      if ((c.sh || 0) >= 25 && (c.hi || 0) <= 2) add(6, N(c) + ' ha tirato ' + c.sh + ' frecce e ne ha prese ' + (c.hi || 0) + '. Le galline del cortile ringraziano.');
    }
    if (w < 0) add(3, 'Pareggio: tutti a casa con le frecce nel sedere e niente bandiera.');
    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 4).map(l => l[1]);
    return out.length ? '<br><span style="display:block;margin-top:10px;text-align:left;font-size:14px;line-height:1.45">' + out.map(t => '😂 ' + t).join('<br>') + '</span>' : '';
  }
  // COME SI GIOCA: nelle impostazioni, all'inizio delle prime partite, e col pulsante ❓
  const HELP = [
    ['🏰', 'Lo scopo', 'Due squadre, <b>due tempi</b>: una <b>attacca</b> il castello, l\'altra lo <b>difende</b>, poi si cambia. Chi attacca deve rubare la <b>bandiera</b> 🚩 dal mastio e portarla all\'<b>accampamento</b> ⛺. Vince chi conquista <b>prima</b>.'],
    ['🏹', 'L\'arco', 'Tutti hanno l\'arco. Tieni premuto il pulsante <b>🏹</b>, <b>trascina indietro</b> come una fionda (vedi la traiettoria) e <b>lascia</b>. Più tiri lontano, più la freccia è storta. Le frecce si fermano su merli e muri: mira sopra!'],
    ['❤️', 'I cuori', 'Hai <b>3 cuori</b> (sopra la testa). A zero cadi e torni alla base dopo ' + RESP + ' secondi. Si vedono anche i cuori dei nemici.'],
    ['🪜', 'Attaccare', 'All\'accampamento prendi una <b>scala</b>, portala sotto le mura (lato sud o est) e <b>appoggiala</b>. Poi <b>🧗 Sali</b>, scendi nel cortile, prendi la bandiera e torna giù da una scala. Con la scala o la bandiera in mano non puoi tirare.'],
    ['🤚', 'Difendere', 'Dal camminamento tira alle teste che spuntano. Quando una scala tocca le mura, corri in cima e <b>🤚 rovesciala</b>: chi la sta salendo cade e perde un cuore. Bandiera a terra? Toccala e torna al mastio.'],
    ['⏱️', 'I tempi', 'Nel secondo tempo, se l\'altra squadra ha conquistato, avete il suo <b>tempo da battere</b> 🎯. Se nessuno conquista, vince chi ha portato la bandiera più vicino all\'accampamento.'],
    ['🗺️', 'Orientarsi', 'In alto a destra la mappa (toccala per ingrandirla). La freccia sul bordo ti indica cosa fare. I compagni nascosti dietro le mura si vedono in trasparenza.']
  ];
  const helpHtml = () => HELP.map(([i, t, d]) => '<p><b>' + i + ' ' + t + '</b><br>' + d + '</p>').join('') + '<p class="n">Sul PC: frecce o WASD per muoverti · trascina il pulsante 🏹 col mouse · F tira al nemico più vicino · E azione · M mappa</p>';
  function helpUI(on) { const el = document.getElementById('asHelp'); if (!el) return; if (on) { el.innerHTML = '<div class="t">🏰 Assedio al castello: come si gioca</div>' + helpHtml() + '<div class="c">Tocca per chiudere</div>'; el.scrollTop = 0; } el.hidden = !on; }

  // ======================= IL PULSANTE DELL'ARCO (tira indietro come una fionda) =======================
  const PULL = 110;   // trascinando di PULL pixel si tira alla portata massima
  function aimFrom(G, dx, dy) {   // trascino (dx, dy) sullo schermo -> la freccia va dalla parte opposta
    const TW = Math.max(48, Math.min(cq.w, cq.h) / 8), m = Math.hypot(dx, dy); if (m < 14) return { ok: false };
    let wx = -dx / TW - 2 * dy / TW, wy = dx / TW - 2 * dy / TW; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const dist = RMIN + (RMAX - RMIN) * Math.min(1, (m - 14) / (PULL - 14));
    let x = cq.x + wx * dist, y = cq.y + wy * dist, tg = null;
    // un piccolo aiuto: un nemico vicino al punto di arrivo attira la mira
    let bd = 0.9 + dist * 0.06; for (const e of enemies(G, G.me)) { const p = P(e), d = Math.hypot(p.x - x, p.y - y); if (d < bd && MODE.night(G).see(e.x, e.y)) { bd = d; tg = p; } }
    if (tg) { x = tg.x; y = tg.y; }
    return { ok: true, x, y, d: Math.hypot(x - cq.x, y - cq.y), tg: !!tg };
  }
  function fire(G, ax, ay) {
    const me = G.me; if (!canShoot(G, me) || (me.rl || 0) > G.time) return;
    const [x1, y1] = aimEnd(cq.x, cq.y, ax - cq.x, ay - cq.y, Math.hypot(ax - cq.x, ay - cq.y), 1);
    twang(); G.shotT = performance.now();
    if (G.guest) { const q = (G.q = (G.q || 0) + 1); cqNetSend({ k: 'sh', x: r2(x1), y: r2(y1), q }); const a = mkArrow(G, me, x1, y1, q); a.id = -q; a.t = me.t; }
    else mkArrow(G, me, x1, y1);
  }
  function autoFire(G) {   // tasto F (PC): al nemico visibile piu' vicino
    const me = G.me; let b = null, bd = RMAX; for (const e of enemies(G, me)) { const p = P(e), d = Math.hypot(p.x - cq.x, p.y - cq.y); if (d < bd && MODE.night(G).see(e.x, e.y)) { bd = d; b = p; } }
    if (b) fire(G, b.x, b.y);
  }
  function bowUI(G) {
    const el = document.getElementById('asBow'); if (!el) return;
    const me = G.me, k = Math.max(0, Math.min(1, 1 - ((me.rl || 0) - G.time) / RELOAD)), ok = canShoot(G, me) && !me.cl, st = (ok ? 'o' : 'x') + Math.round(k * 20);
    if (el.dataset.s !== st) { el.dataset.s = st; el.style.setProperty('--k', (k * 360).toFixed(0) + 'deg'); el.classList.toggle('off', !ok); el.classList.toggle('rdy', ok && k >= 1); }
  }

  if (!document.getElementById('asCss')) {
    const st = document.createElement('style'); st.id = 'asCss';
    st.textContent = '#asHelp{position:absolute;left:12px;right:12px;top:118px;bottom:150px;max-width:480px;margin:0 auto;overflow-y:auto;background:rgba(28,24,30,.96);border:2px solid #c8a050;border-radius:16px;padding:12px 16px;color:#f2ead8;font-size:14px;line-height:1.4;z-index:31;box-shadow:0 8px 30px rgba(0,0,0,.5)}#asHelp .t{font-weight:800;font-size:17px;color:#f2c860;margin-bottom:4px}#asHelp p{margin:7px 0}#asHelp b{color:#ffe0a0}#asHelp .n{font-size:12px;color:#c8b898}#asHelp .c{text-align:center;font-size:13px;color:#f2c860;font-weight:700;margin-top:10px}'
      + '#asHelpB{position:absolute;left:12px;top:122px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(28,24,30,.82);color:#f2c860;font-size:19px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.35)}'
      + '#asBow{--k:360deg;touch-action:none;user-select:none;-webkit-user-select:none;position:absolute;right:16px;bottom:138px;width:94px;height:94px;border-radius:50%;border:0;padding:0;background:conic-gradient(#f2c860 var(--k),rgba(255,255,255,.12) 0);box-shadow:0 5px 16px rgba(0,0,0,.4);-webkit-tap-highlight-color:transparent}'
      + '#asBow::before{content:"";position:absolute;inset:5px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#6a4a32,#3a2618)}#asBow span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;pointer-events:none;transition:transform .05s}#asBow i{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:800;color:#f2dca0;letter-spacing:.04em;pointer-events:none;white-space:nowrap}'
      + '#asBow.off{opacity:.45}#asBow.rdy::before{background:radial-gradient(circle at 40% 35%,#7a5638,#3a2618)}#asBow.aim{background:conic-gradient(#ff7a50 360deg,#ff7a50 0)}'
      + '#ciack.asMode #cqKill{bottom:244px;right:20px;width:82px;height:82px}'
      + '.asHow summary{cursor:pointer}.asHow p{margin:8px 0;font-size:14px;line-height:1.4}.asHow .n{font-size:12px;opacity:.75}';
    document.head.appendChild(st);
    const host = document.getElementById('ciack');
    const hp = document.createElement('div'); hp.id = 'asHelp'; hp.hidden = true; let hy = 0;
    hp.addEventListener('pointerdown', e => { e.stopPropagation(); hy = e.clientY; });
    hp.addEventListener('pointerup', e => { e.stopPropagation(); if (Math.abs(e.clientY - hy) < 8) helpUI(false); });
    hp.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); if (host) host.appendChild(hp);
    const hb = document.createElement('button'); hb.id = 'asHelpB'; hb.type = 'button'; hb.hidden = true; hb.textContent = '❓';
    hb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); helpUI(hp.hidden); }); if (host) host.appendChild(hb);
    const mb = document.createElement('button'); mb.id = 'asMap'; mb.type = 'button'; mb.hidden = true;
    mb.onclick = e => { e.stopPropagation(); const G = cq.g; if (G && G.mode === 'assedio') { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } }; if (host) host.appendChild(mb);
    // l'arco: premi, trascina indietro (la mira va dall'altra parte), lascia
    const bw = document.createElement('button'); bw.id = 'asBow'; bw.type = 'button'; bw.hidden = true; bw.innerHTML = '<span>🏹</span><i>TIRA INDIETRO</i>';
    let ptr = null;
    bw.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const G = cq.g; if (!G || G.mode !== 'assedio') return; ptr = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { bw.setPointerCapture(e.pointerId); } catch {} bw.classList.add('aim'); G.aim = { ok: false }; });
    bw.addEventListener('pointermove', e => { if (!ptr || ptr.id !== e.pointerId) return; const G = cq.g; if (!G) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; G.aim = aimFrom(G, dx, dy); const m = Math.min(1, Math.hypot(dx, dy) / PULL), sp = bw.querySelector('span'); if (sp) sp.style.transform = 'translate(' + (dx / (Math.hypot(dx, dy) || 1) * m * 22) + 'px,' + (dy / (Math.hypot(dx, dy) || 1) * m * 22) + 'px)'; });
    const up = e => { if (!ptr || ptr.id !== e.pointerId) return; ptr = null; bw.classList.remove('aim'); const sp = bw.querySelector('span'); if (sp) sp.style.transform = ''; const G = cq.g; if (!G) return; const A = G.aim; G.aim = null; if (A && A.ok && e.type === 'pointerup') fire(G, A.x, A.y); };
    bw.addEventListener('pointerup', up); bw.addEventListener('pointercancel', up); bw.oncontextmenu = e => e.preventDefault();
    if (host) host.appendChild(bw);
    window.addEventListener('keydown', e => { const k = e.key && e.key.toLowerCase(), G = cq.g; if (!G || G.mode !== 'assedio' || !cq.on || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; if (k === 'm') G.big = !G.big; if (k === 'f') autoFire(G); });
    // all'inizio delle prime 3 partite (su questo telefono) la spiegazione si apre da sola; giocando da soli la partita aspetta che la chiudi
    setInterval(() => {
      const G = cq.g, on = !!(G && G.mode === 'assedio' && G.phase === 'play' && (!G.guest || G.ready) && $('#cqTask').hidden && !$('#ciack').hidden);
      if (host && host.classList.contains('asMode') !== on) host.classList.toggle('asMode', on);
      if (hb.hidden === on) hb.hidden = !on; if (mb.hidden === on) mb.hidden = !on; if (bw.hidden === on) bw.hidden = !on;
      if (!on) { if (!hp.hidden) hp.hidden = true; return; }
      if (!G.helpAuto) { G.helpAuto = 1; let n = 0; try { n = +localStorage.getItem('asHelpN') || 0; localStorage.setItem('asHelpN', n + 1); } catch {} if (n < 3) { helpUI(true); G.helpHold = !cq.net; } }
      if (G.helpHold) { if (hp.hidden) G.helpHold = 0; else G.pre = Math.max(G.pre || 0, 1); }
      const W2 = cq.w, H2 = cq.h; let css;
      if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:16px'; }
      else css = 'left:' + (W2 - 2 * RADAR - 10) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px;border-radius:50%';
      if (mb.dataset.k !== css) { mb.dataset.k = css; mb.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;' + css; }
    }, 200);
  }
  window.__as = { action, doAct, zoneAt, spotsOf, lake, castle, topAt, mkArrow, aimFrom, fire, botT, botShoot, setupHalf, syncLd, clear, LITN };
});
