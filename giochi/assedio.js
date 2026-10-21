// ASSEDIO AL CASTELLO (a squadre). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa il MODULO SQUADRE comune (giochi/lib/squadre.js): squadre, ricomparsa, voce, cerchio, freccia sul bordo, fine partita.
// CASTELLO DI ROCCAFORTE, mappa FISSA a ZONE IN FILA (una sola mappa in comune, si vede tutto): dal basso (sud) verso l'alto (nord)
//   1) il BORGO fuori le mura (case di legno da attraversare, piazze, barricate, accampamento degli attaccanti) e il PORTONE tra due torri;
//   2) il CORTILE (stalle, forgia, pozzo, muretti) = zona da tenere;  3) il MASTIO con la SALA DEL TRONO (colonne, tappeto rosso, vetrate), l'armeria e la cappella.
// CONQUISTA A FASI con un FRONTE: chi attacca spinge l'ARIETE lungo la strada fino al portone e lo sfonda (oppure sale con le SCALE e gira l'ARGANO),
// chi difende tira frecce dalle mura e versa l'OLIO BOLLENTE. Poi si conquista il cortile e infine il trono (si sta dentro la zona in piu' dei nemici).
// A ogni fase: tempo bonus, la ricomparsa di chi attacca avanza, annuncio. DUE TEMPI (poi si cambia): vince chi arriva piu' lontano, o prima.
// Tutti hanno l'ARCO (si mira tirando indietro come una fionda) e 3 CUORI sopra la testa. Le classi arrivano al passo B.
CQ_WAIT.assedio = cqLib('squadre').then(L => {
  const SQ = L.squadre, TEAMS = SQ.TEAMS;
  const W = 60, H = 84, HB = 0.8, WZ = 4, TZ = 5;   // altezza di un livello (U), camminamento, torri
  const HP = 3, SAFE = 2.5, RELOAD = 0.85, RMAX = 12, RMIN = 1.6, CLIMB = 1.5, DOWN = 1.0, PUSH = 1.5, LEVER = 5, CARRY_L = 0.78;
  const NLAD = 3, IV = 7, RESP_A = 4, WAVE = 8;
  const CH_T = 1.5, RAM_WIN = 0.4, RAM_CD = 0.6;   // ariete: secondi per la carica piena, finestra del colpo di squadra, pausa dopo il colpo
  const GATE_HP = 130, RAM_Y0 = 78.5, RAM_Y1 = 53.4, RAM_X = 29.5, RAM_R = 2.3, HIT_T = 1.6, OIL_T = 15, BURN = 2.4;
  const BONUS = [0, 60, 45];   // secondi in piu' a fase conquistata
  // LE CLASSI (passo B): si sceglie prima di tornare in battaglia (pannello in basso quando sei a terra, o il pulsante a sinistra)
  const CL = {
    g: { n: 'Guerriero', i: '🗡️', hp: 4, d: 'Spada e scudo · 4 ❤', w: 'TIENI = SCUDO' },
    a: { n: 'Arciere', i: '🏹', hp: 3, d: 'Arco · tiro lungo', w: 'TIRA INDIETRO' },
    n: { n: 'Genio', i: '🔨', hp: 3, d: 'Martello · barricate · ripara', w: 'COLPISCI' } };
  const CLK = ['g', 'a', 'n'];
  const PARRY_CD = 4;   // lo scudo para UN colpo di spada o martello, poi per PARRY_CD secondi e' scosso (le frecce le para sempre)
  const SW_R = 1.55, SW_CD = 0.55, HM_R = 1.35, HM_CD = 0.8, SHIELD_SP = 0.55, SHIELD_HOLD = 220, KNOCK = 0.55;   // spada, martello, scudo (ms da tenere premuto), spinta del colpo
  const BAR_HP = 4, BAR_CD = 8, BAR_N = 2, FIX = 2.2, FIX2 = 1.0, OIL_TG = 9;   // barricate del genio, riparazione del portone (punti al secondo), olio piu' veloce
  const clsOf = c => CL[c.cls] ? c.cls : 'a';
  const maxHp = c => CL[clsOf(c)].hp;
  const Z2 = { x: 29.5, y: 33.5, r: 4.3, t: 18 }, Z3 = { x: 29.5, y: 8.2, r: 3.9, t: 24 };
  const RK = { x: 25, y: 77 }, LEV = { x: 24, y: 49 }, OILC = [{ x: 27, y: 51, sx: 26.5, sy: 51.5 }, { x: 32, y: 51, sx: 33.5, sy: 51.5 }];
  const SPAWN_A = [null, { x: 25.5, y: 81.5 }, { x: 29.5, y: 59.5 }, { x: 29.5, y: 44.5 }], SPAWN_D = [null, [{ x: 29.5, y: 42.5 }], [{ x: 13.5, y: 13.5 }, { x: 45.5, y: 13.5 }], [{ x: 13.5, y: 13.5 }, { x: 45.5, y: 13.5 }]];
  const PHN = [null, '🚪 Il portone', '⚔️ Il cortile', '👑 La sala del trono'];
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

  // ======================= MAPPA: CASTELLO DI ROCCAFORTE (fissa, a zone) =======================
  const TOWERS = [[2, 1, 'NW'], [53, 1, 'NE'], [2, 47, 'SW'], [53, 47, 'SE']];   // torri 5x5 agli angoli
  const GTOW = [[23, 47], [32, 47]];                                           // torri del portone 5x6 (y 47..52)
  const inTower = (x, y) => TOWERS.some(([a, b]) => x >= a && x <= a + 4 && y >= b && y <= b + 4) || GTOW.some(([a, b]) => x >= a && x <= a + 4 && y >= b && y <= b + 5);
  const inPass = (x, y) => x >= 28 && x <= 31 && y >= 47 && y <= 52;            // il passaggio del portone
  const inBand = (x, y) => (y >= 49 && y <= 51 && x >= 3 && x <= 56) || ((x >= 3 && x <= 5 || x >= 54 && x <= 56) && y >= 2 && y <= 51);
  const inCastle = (x, y) => (inBand(x, y) || inTower(x, y) || (x >= 6 && x <= 53 && y >= 2 && y <= 48) || inPass(x, y));
  // case del borgo: [x0, y0, x1, y1 interni], porte [x, y] (sull'anello dei muri), nome. Passo C: tolte le 4 case vicino alla strada
  // (fabbro, bottega, fornaio, locanda) per fare i CAMPI DI BATTAGLIA ai lati della strada (spazio per la catapulta e per arrivare da piu' parti)
  // CASETTE RUSTICHE (richiesta dell'utente 21-10-2026: le case aperte "sembravano appartamenti moderni"): chiuse, di legno, col tetto a due falde
  // (t = paglia, s = scandole), porta, finestre con le imposte, camino. Piu' piccole e un po' piu' a sud: sotto le mura resta la strada per la torre.
  const COTS = [[6, 59, 10, 62, 'Casa del mugnaio', 't'], [49, 59, 53, 62, 'Casa del pescatore', 's'], [48, 66, 53, 70, 'Stalla del borgo', 's']];
  let COTI = null;
  const FIELDS = [[15, 55, 25, 74], [34, 55, 45, 74]];   // campi di battaglia [x0, y0, x1, y1]
  const inField = (x, y) => FIELDS.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  // le BALESTRE A TORRETTA sulle torri d'angolo del sud (chi difende le usa contro la catapulta e chi si avvicina): casella, posto di chi la usa
  const BAL = [{ x: 4, y: 50, ux: 4.5, uy: 49.3 }, { x: 55, y: 50, ux: 55.5, uy: 49.3 }];
  const STONES = { x: 44, y: 79 };
  // FARETRA: l'arciere ha QV frecce; si ricarica passando vicino alle CESTE di frecce (mura, cortile, mastio, accampamento, campi)
  const QV = 6, QUIV = [[13, 49], [20, 49], [39, 49], [46, 49], [24, 44], [35, 44], [14, 11], [45, 19], [32, 77], [23, 66], [40, 67]];
  // PORTICINA nel muro sud accanto al portone (x 22): solo chi difende, per le SORTITE (incendiare l'ariete, buttare giu' le scale, colpire catapulta e torre)
  const PORT = { ix: 22.5, iy: 48.4, ox: 22.5, oy: 52.6 };
  // TORRE D'ASSEDIO: si spinge col corpo fino a un ATTRACCO sotto le mura; abbassa il ponte, si sale dentro e si esce sul camminamento
  const DOCKS = [{ x: 9.5, y: 54 }, { x: 12.5, y: 54 }, { x: 47.5, y: 54 }, { x: 50.5, y: 54 }];
  const TW_HP = 12, TW_RESP = 40, TW_HB = 1.0, TW_DIST = 1.8, TW0 = { x: 19.5, y: 76.5 };
  const PUT = { lever: LEVER, push: PUSH, wfix: 3, post: 0.8, burn: 2.5, ext: 2, twup: 1.4, twdn: 1.0 };   // quanto si tiene fermo per ogni azione
  const PUL = { lever: '⚙️ Giro l\'argano…', fix: '🔧 Riparo…', push: '🤚 Rovescio…', wfix: '🧱 Tappo la crepa…', post: '🚪 Porticina…', burn: '🔥 Incendio…', ext: '💧 Spengo…', twup: '🧗 Salgo nella torre…', twdn: '🧗 Scendo…' };
  const RAM_FIRE = 14;   // secondi che l'ariete resta in fiamme (fermo) se nessuno lo spegne   // catasta dei sassi della catapulta (accampamento)
  const inPool = (x, y) => y >= 53 && y <= 54 && ((x >= 15 && x <= 21) || (x >= 38 && x <= 44));
  // che muro c'e' in una casella senza pavimento: lago, siepe del bordo, casa, mastio, vasche d'acqua davanti alle mura
  let WK = null;
  function spotsOf() {
    const S = [];
    for (const x of [7, 8, 9, 10, 11, 12, 13, 14, 45, 46, 47, 48, 49, 50, 51, 52]) S.push({ w: 'S', fx: x, fy: 52, ax: x + 0.5, ay: 53.5, tx: x + 0.5, ty: 50.5 });
    return S;
  }
  function mapCastle() {
    const rooms = [], props = [], deco = [], holes = [], lamps = [], decals = [], hz = [];
    for (let y = 0; y < H; y++) hz.push(new Uint8Array(W));
    WK = []; for (let y = 0; y < H; y++) WK.push(new Array(W).fill(''));
    const R = (n, x, y, w, h, k, c, ala, o) => { rooms.push(Object.assign({ n, x, y, w, h, k, c, wc: '#3a5a30', ala }, o || {})); return rooms.length - 1; };
    const pp = (t, x, y, o) => { if (x >= 0 && y >= 0 && x < W && y < H) props.push([t, x, y, o]); };
    const hole = (x, y, k) => { holes.push([x, y, 1, 1]); WK[y][x] = k; };
    const Z = (x0, y0, x1, y1, z) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) hz[y][x] = z; };
    const ring = (x0, y0, x1, y1, k, doors) => { const D = new Set((doors || []).map(([x, y]) => x + ',' + y)); for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (!D.has(x + ',' + y)) hole(x, y, k); for (let y = y0 + 1; y < y1; y++) for (const x of [x0, x1]) if (!D.has(x + ',' + y)) hole(x, y, k); };
    const L = (x, y, r) => lamps.push([x, y, r || 2.4]);
    const GRASS = ['#4f7a34', '#4b7631'], DIRT = ['#7a6142', '#755d3f'], STONE = ['#8f897d', '#8a8478'], COB = ['#7c766b', '#787267'], TOWF = ['#857f73', '#817b6f'];
    const PLANK = ['#8a6440', '#84603d'], FLAG = ['#6e6a64', '#6a6660'], MARB = ['#cfc8bc', '#3e3a44'], MARB2 = ['#b8b0a2', '#a8a092'], MUD = ['#6a5638', '#665234'], STR = ['#8a8274', '#857d70'];
    // ---------------- BASE: borgo e cortile ----------------
    const hall = R('Borgo', 3, 52, 54, 31, 'adirt', DIRT, 'B', { nl: 1 });
    for (const [a, b, c, d] of FIELDS) R('Campo di battaglia', a, b, c - a + 1, d - b + 1, 'abattle', ['#6e5a3e', '#6a563b'], 'B', { lx: (a + c) / 2 + 0.5, ly: d + 0.4 });
    R('Strada maestra', 26, 53, 8, 30, 'acob', STR, 'B', { nl: 1 });
    R('Piazza del mercato', 4, 63, 11, 11, 'acob', STR, 'B', { lx: 9.5, ly: 73.6 });
    R('Accampamento', 14, 75, 32, 8, 'amud', MUD, 'K', { lx: 30, ly: 82.4 });
    R('Cortile', 6, 21, 48, 28, 'acob', COB, 'C', { lx: 29.5, ly: 47.4 });
    R('Giardino', 6, 2, 4, 20, 'agrass', GRASS, 'C', { nl: 1 }); R('Orto', 50, 2, 4, 20, 'agrass', GRASS, 'C', { nl: 1 });
    R('Mura', 3, 49, 54, 3, 'astone', STONE, 'M', { nl: 1 }); R('Mura', 3, 2, 3, 47, 'astone', STONE, 'M', { nl: 1 }); R('Mura', 54, 2, 3, 47, 'astone', STONE, 'M', { nl: 1 });
    for (const [a, b] of TOWERS) R('Torre', a, b, 5, 5, 'atower', TOWF, 'T', { nl: 1 });
    for (const [a, b] of GTOW) R('Torre del portone', a, b, 5, 6, 'atower', TOWF, 'T', { nl: 1 });
    R('Portone', 28, 47, 4, 6, 'acob', COB, 'G', { nl: 1 });
    // ---------------- IL MASTIO: sala del trono, armeria, cappella (muri bassi: si vede dentro) ----------------
    R('Mastio', 11, 3, 38, 18, 'aflag', FLAG, 'P', { nl: 1 });
    R('Armeria', 11, 3, 6, 18, 'aflag', FLAG, 'P', { ly: 20.4, lx: 14 });
    R('Sala del trono', 18, 3, 24, 18, 'amarb', MARB, 'P', { lx: 29.5, ly: 20.4 });
    R('Cappella', 43, 3, 6, 18, 'amarb2', MARB2, 'P', { ly: 20.4, lx: 46 });
    ring(10, 2, 49, 21, 'keep', [[28, 21], [29, 21], [30, 21], [31, 21], [13, 21], [14, 21], [45, 21], [46, 21]]);
    for (let y = 3; y <= 20; y++) { if (y !== 10 && y !== 11) { hole(17, y, 'keep'); hole(42, y, 'keep'); } }
    for (let i = 0; i < 4; i++) pp('aKdoor', 28 + i, 21, { i });
    for (const [x, y] of [[17, 10], [17, 11], [42, 10], [42, 11]]) pp('aIdoor', x, y, { v: 1, i: y - 10 });
    // trono su una pedana (hz 1), colonne, tappeto rosso, bracieri, stendardi
    Z(24, 3, 35, 5, 1); pp('aThrone', 30, 4, {}); pp('aThrone', 29, 4, { part: 1 });
    for (const x of [21, 38]) for (const y of [7, 11, 15, 19]) pp('aCol', x, y);
    decals.push([28.1, 6, 3.8, 15, '#7a1a22'], [28.25, 6, 0.1, 15, '#d8a840'], [31.65, 6, 0.1, 15, '#d8a840'], [25, 3.1, 10, 2.9, '#6a1820']);
    for (const [x, y] of [[19, 4], [40, 4], [24, 19], [35, 19]]) { pp('aBraz', x, y); L(x + 0.5, y + 0.5, 2.8); }
    for (const x of [23, 26, 33, 36]) pp('aBench2', x, 13);
    pp('aTable', 24, 16); pp('aTable', 35, 16);
    // armeria: rastrelliere, armature, barili, un forziere
    for (const x of [11, 13, 15]) pp('aRackW', x, 3); pp('aArmor', 11, 7); pp('aArmor', 16, 7); pp('aArmor', 11, 15); pp('barrel', 16, 18, '#6a4a2a'); pp('crate', 11, 19); pp('aChest', 16, 3); L(14, 9, 2.4); pp('aBraz', 16, 13); L(16.5, 13.5, 2.4);
    // cappella: altare, panche, candelabri
    pp('aAltar', 46, 3); pp('aAltar', 45, 3, { part: 1 }); for (const y of [8, 10, 12, 14, 16]) { pp('aPew', 44, y); pp('aPew', 47, y); } pp('aCandle', 43, 4); pp('aCandle', 48, 4); L(45.5, 5, 2.6);
    decals.push([45.2, 5, 1.6, 15.5, '#3a3a6a'], [45.3, 5, 0.06, 15.5, '#c8a840'], [46.65, 5, 0.06, 15.5, '#c8a840']);
    // ---------------- CORTILE ----------------
    pp('aWell', 29, 32); L(26.5, 30.5, 1.8);
    // muretti bassi (riparo dalle frecce), con i varchi
    for (let x = 8; x <= 51; x++) if (!(x >= 13 && x <= 15) && !(x >= 27 && x <= 32) && !(x >= 44 && x <= 46)) pp('aLowW', x, 40, {});
    // stalle (ovest)
    for (const x of [8, 11, 14]) for (const y of [24, 25, 26]) pp('aStallW', x, y, {}); pp('aHorse', 9, 25, { c: '#6a4a2a' }); pp('aHorse', 12, 25, { c: '#e8e0d0' }); pp('hay', 15, 24); pp('hay', 15, 25); pp('aTrough', 10, 28); pp('aTrough', 11, 28); pp('hay', 7, 28);
    // forgia (est)
    pp('aForge', 48, 24); pp('aAnvil', 47, 26); pp('aRackW', 50, 23); pp('aGrind', 51, 27); pp('aTrough', 45, 27); pp('barrel', 52, 23, '#5a3a22'); pp('crate', 52, 24); L(48.5, 24.5, 3.2);
    // ripari intorno al pozzo, carri, fantocci
    for (const [x, y] of [[23, 30], [24, 30], [35, 36], [36, 36], [22, 37], [37, 29]]) pp('crate', x, y); pp('aCart', 18, 33); pp('aCart', 41, 34); pp('barrel', 26, 27, '#6a4a2a'); pp('barrel', 33, 27, '#6a4a2a');
    pp('aDummy', 15, 44); pp('aDummy', 17, 44); pp('aTarget', 43, 44); pp('aRackW', 20, 44); pp('hay', 8, 45); pp('hay', 50, 45);
    for (const [x, y] of [[20, 36], [39, 36], [25, 24], [34, 24], [13, 45], [46, 45]]) { pp('aBraz', x, y); L(x + 0.5, y + 0.5, 2.6); }
    pp('aBann', 26, 22); pp('aBann', 33, 22);
    // giardino e orto
    for (const [x, y] of [[7, 4], [8, 10], [7, 16]]) pp('oak', x, y); pp('bush', 9, 7); pp('bush', 6, 13); pp('bush', 9, 19);
    for (let y = 3; y <= 19; y += 2) for (const x of [50, 52]) deco.push([x, y, 'aVeg']); pp('aScare', 51, 12);
    // ---------------- MURA, TORRI, PORTONE (altezze) ----------------
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (inBand(x, y)) hz[y][x] = WZ; if (inTower(x, y)) hz[y][x] = TZ; }
    Z(28, 47, 31, 52, 0);
    const stair = cells => cells.forEach(([x, y, z]) => { hz[y][x] = z; });
    for (const x of [10, 11, 48, 49]) stair([[x, 48, 3], [x, 47, 2], [x, 46, 1]]);
    for (const y of [30, 31]) { stair([[6, y, 3], [7, y, 2], [8, y, 1]]); stair([[53, y, 3], [52, y, 2], [51, y, 1]]); }
    // parapetto coi merli (alti/bassi alternati), torce ogni tanto sulla faccia di fuori
    const merl = (x, y, f, tw) => pp('aMerl', x, y, { k: tw ? 1 : (x + y) % 2, f, t: f === 'S' && (x % 6 === 1) ? 1 : 0, tw: tw ? 1 : 0 });
    for (let x = 7; x <= 52; x++) if (!inTower(x, 51) && !inPass(x, 51)) merl(x, 51, 'S');
    for (let y = 6; y <= 46; y++) { merl(3, y, 'W'); merl(56, y, 'E'); }
    for (const [a, b, k] of TOWERS) for (let y = b; y <= b + 4; y++) for (let x = a; x <= a + 4; x++) {
      const ox = k.includes('W') ? x === a : x === a + 4, oy = k.includes('N') ? y === b : y === b + 4; if (ox || oy) merl(x, y, oy && k.includes('S') ? 'S' : ox && k.includes('E') ? 'E' : oy ? 'N' : 'W', 1);
    }
    for (const [a] of GTOW) { for (let x = a; x <= a + 4; x++) merl(x, 52, 'S', 1); const sx = a === 23 ? 27 : 32; for (let y = 47; y <= 50; y++) merl(sx, y, a === 23 ? 'E' : '', 1); }
    for (const p of props) if (p[0] === 'aMerl' && p[1] === 22 && p[2] === 51) p[3].post = 1;   // la porticina, sulla faccia di fuori del muro
    for (const p of props) if (p[0] === 'aMerl' && p[3].f === 'S' && GTOW.some(([a]) => p[1] === a || p[1] === a + 4) && p[2] === 52) p[3].t = 1;
    for (let i = 0; i < 4; i++) pp('aGate', 28 + i, 50, { i, d: 0 });
    pp('aWinch', LEV.x, LEV.y, {}); for (const o of OILC) pp('aOil', o.x, o.y, {});
    // vasche d'acqua ai piedi delle mura (ai lati del portone) e il lago dietro al castello
    for (let y = 53; y <= 54; y++) for (let x = 0; x < W; x++) if (inPool(x, y)) hole(x, y, 'pool');
    pp('rock', 37, 53);
    for (const [x, y] of QUIV) pp('aQuiv', x, y, {});
    // ---------------- BORGO ----------------
    COTI = []; for (let y = 0; y < H; y++) COTI.push(new Int8Array(W).fill(-1));
    COTS.forEach(([x0, y0, x1, y1, n], i) => { R(n, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 'aplank', PLANK, 'H', { nl: 1 }); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { pp('aCot', x, y, {}); COTI[y][x] = i; } L((x0 + x1) / 2 + 0.5, y1 + 1.3, 1.7); });   // pavimento coperto da un oggetto per casella (i vuoti in mezzo il motore non li disegna)
    // intorno alle casette: legna, botti, fieno, un carretto
    for (const [t, x, y] of [['logpile', 11, 60], ['barrel', 5, 62], ['logpile', 48, 61], ['barrel', 54, 60], ['hay', 54, 67], ['hay', 47, 70], ['aCart', 50, 72]]) pp(t, x, y, t === 'barrel' ? '#6a4a2a' : {});
    // piazza del mercato: fontana, bancarelle
    pp('aFount', 9, 67); pp('aFount', 8, 67, { part: 1 }); pp('aFount', 9, 66, { part: 1 }); pp('aFount', 8, 66, { part: 1 }); L(8.5, 66.5, 1.6);
    for (const [x, y, c] of [[5, 64, '#c83a2a'], [12, 64, '#3a6ac8'], [5, 71, '#e8b020'], [12, 71, '#3a9a4a']]) { pp('aStall', x, y, { c }); L(x + 0.5, y + 1, 1.5); }
    // barricate di legno (riparo), carri, botti, fieno lungo la strada
    for (const [x, y] of [[25, 56], [34, 56], [25, 65], [34, 65], [16, 65], [17, 65], [43, 64], [44, 64], [21, 75], [38, 75], [45, 74], [14, 74]]) pp('aBarr', x, y);
    for (const [x, y] of [[25, 61], [34, 62], [25, 71], [34, 72]]) pp('aCart', x, y);
    for (const [x, y] of [[33, 58], [26, 68], [44, 61], [15, 60], [45, 70], [16, 72]]) pp('barrel', x, y, '#6a4a2a');
    for (const [x, y] of [[33, 69], [26, 59], [55, 64], [4, 75], [55, 75]]) pp('hay', x, y);
    for (const [x, y] of [[26, 54], [33, 54], [26, 74], [33, 74], [15, 68], [44, 68]]) { pp('aLamp', x, y); L(x + 0.5, y + 0.5, 2.3); }
    for (const [x, y] of [[4, 55], [55, 55], [4, 61], [55, 62], [5, 78], [55, 79], [11, 81], [48, 81]]) pp(((x + y) % 3) ? 'oak' : 'pine', x, y);
    // ---------------- ACCAMPAMENTO (attaccanti) ----------------
    for (const [x, y, c] of [[17, 78, '#c8b48a'], [21, 81, '#a85a3a'], [39, 78, '#8a9a6a'], [43, 81, '#c8b48a']]) { pp('aTent', x, y, { c }); pp('aTent', x - 1, y, { part: 1 }); pp('aTent', x, y - 1, { part: 1 }); pp('aTent', x - 1, y - 1, { part: 1 }); L(x + 0.6, y + 1.2, 1.8); }
    pp('aRack', RK.x, RK.y, { n: NLAD }); pp('aFire', 35, 80); L(35.5, 80.5, 3.6); pp('logpile', 36, 77); pp('logpile', 37, 77); pp('aBench', 24, 80); pp('crate2', 33, 81); pp('barrel', 26, 81, '#6a4a2a');
    // CAMPI DI BATTAGLIA: qualche riparo (carri rotti, mantelletti), e a terra (calpestabili) lance spezzate, scudi, elmi, frecce piantate, sangue, crateri, rottami
    for (const [x, y] of [[16, 59], [22, 63], [17, 69], [21, 72], [37, 59], [41, 64], [38, 70], [43, 72]]) pp(((x + y) % 2) ? 'aWreck' : 'aMant', x, y, {});
    pp('aStones', STONES.x, STONES.y, {});
    for (const B of BAL) pp('aBalS', B.x, B.y, {});
    const taken = new Set(props.map(p => p[1] + ',' + p[2]));
    for (let y = 55; y <= 74; y++) for (let x = 15; x <= 45; x++) {
      if (!inField(x, y) || taken.has(x + ',' + y)) continue; const h = Math.sin(x * 91.17 + y * 47.31) * 43758.5453, r = h - Math.floor(h);
      const k = r < 0.06 ? 'aSpear' : r < 0.1 ? 'aShG' : r < 0.16 ? 'aBlood' : r < 0.19 ? 'aCrat' : r < 0.22 ? 'aWrk' : r < 0.29 ? 'aArw' : r < 0.31 ? 'aHelm' : r < 0.34 ? 'aTuft' : null;
      if (k) deco.push([x, y, k]);
    }
    // decorazioni calpestabili: erba e fiori nel borgo
    for (let y = 53; y < 83; y++) for (let x = 3; x < 57; x++) {
      if ((x >= 26 && x <= 33) || inField(x, y)) continue; const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, r = h - Math.floor(h);
      if (r < 0.06) deco.push([x, y, 'aTuft']); else if (r < 0.09) deco.push([x, y, 'aFlw']);
    }
    // bordo: lago dietro e ai lati del castello, siepe intorno al borgo
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!WK[y][x]) WK[y][x] = y <= 52 ? 'lake' : 'hedge';
    for (const p of props) if (p[0] === 'aMerl' && p[3].t) L(p[1] + 0.5, p[2] + (p[3].f === 'S' ? 1.2 : 0.5), 2.4);
    return { w: W, h: H, rooms, doors: [], decals, props, holes, deco, tasks: [], hall, cams: [], vending: [], ring: [[29, 80]], button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      draw, floor: FLOOR, decoDraw, drawWall, ground, bg: () => '#21465a', bgSc: 1.5, hz, hb: HB, hzSide, lamps, spots: spotsOf() };
  }
  const roomAt = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); return cqRoomOf[yi] && cqRoomOf[yi][xi] != null ? cqRoomOf[yi][xi] : -1; };
  // dove si trova un personaggio: fuori (borgo), sulle mura (camminamento e torri) o dentro (cortile, mastio)
  const zoneAt = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); if (!inCastle(xi, yi) || (inPass(xi, yi) && yi >= 51)) return 'out'; return hzAt(x, y) >= 3 && (inBand(xi, yi) || inTower(xi, yi)) ? 'wall' : 'in'; };

  // ---- disegno della mappa (K = attrezzi di cqTools). REGOLA DELLE LUCI: aloni solo con K.glow, colori pieni negli oggetti alti ----
  const FLOOR = {
    agrass(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 6, ['rgba(120,170,70,.45)', 'rgba(30,60,20,.3)', 'rgba(160,190,90,.3)'], K.TW / 22); },
    adirt(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 7, ['rgba(255,240,210,.12)', 'rgba(40,25,10,.25)'], K.TW / 20); if (K.hsh(x, y, 4) < 0.1) K.dot(x + 0.3 + 0.4 * K.hsh(x, y, 5), y + 0.5, 0, 0.05, '#8a8478'); if (K.hsh(x, y, 6) < 0.05) { const [X, Y] = K.S(x + 0.5, y + 0.5, 0); K.g.fillStyle = 'rgba(60,45,30,.35)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.3, K.TW * 0.13, 0, 0, 7); K.g.fill(); } },
    abattle(K, x, y) {   // terra battuta della battaglia: zolle smosse, impronte, fango
      if (K.TW < 40) return; K.speck(x, y, 9, ['rgba(30,20,10,.28)', 'rgba(255,235,200,.08)', 'rgba(60,40,20,.25)'], K.TW / 18);
      if (K.hsh(x, y, 5) < 0.18) { const [X, Y] = K.S(x + 0.3 + 0.4 * K.hsh(x, y, 6), y + 0.5, 0); K.g.fillStyle = 'rgba(40,28,16,.32)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.12, K.TW * 0.05, 0, 0, 7); K.g.ellipse(X + K.TW * 0.18, Y + K.TW * 0.04, K.TW * 0.12, K.TW * 0.05, 0, 0, 7); K.g.fill(); }
    },
    amud(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 8, ['rgba(30,20,10,.3)', 'rgba(255,240,210,.08)'], K.TW / 18); if (K.hsh(x, y, 3) < 0.12) { const [X, Y] = K.S(x + 0.5, y + 0.5, 0); K.g.fillStyle = 'rgba(50,70,80,.35)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.25, K.TW * 0.1, 0, 0, 7); K.g.fill(); } },
    astone(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)], [Pp(0.5, 0), Pp(0.5, 0.5)], [Pp(0, 0.5), Pp(1, 0.5)]], 'rgba(40,35,30,.28)'); if (K.hsh(x, y, 3) < 0.15) K.speck(x, y, 3, ['rgba(80,110,50,.5)'], K.TW / 16); },
    atower(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(40,35,30,.3)'); K.speck(x, y, 3, ['rgba(255,255,255,.08)'], K.TW / 20); },
    acob(K, x, y) {   // ciottoli
      if (K.TW < 40) return;
      for (let i = 0; i < 4; i++) { const u = 0.15 + (i % 2) * 0.5 + 0.12 * K.hsh(x, y, i), v = 0.15 + Math.floor(i / 2) * 0.5 + 0.12 * K.hsh(x, y, i + 4); const [X, Y] = K.S(x + u + 0.13, y + v + 0.13, 0); K.g.fillStyle = (i + x + y) % 3 ? 'rgba(255,250,240,.07)' : 'rgba(0,0,0,.12)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.15, K.TW * 0.075, 0, 0, 7); K.g.fill(); }
      if (K.hsh(x, y, 9) < 0.07) K.speck(x, y, 3, ['rgba(90,120,60,.55)'], K.TW / 18);
    },
    aplank(K, x, y) { const Pp = (u, v) => K.S(x + u, y + v, 0), L = []; for (const u of [0.25, 0.5, 0.75]) L.push([Pp(0, u), Pp(1, u)]); K.strokes(L, 'rgba(40,24,10,.35)'); if (K.TW >= 40 && K.hsh(x, y, 2) < 0.3) K.strokes([[Pp(0.3 + 0.4 * K.hsh(x, y, 3), 0), Pp(0.3 + 0.4 * K.hsh(x, y, 3), 0.25)]], 'rgba(40,24,10,.35)'); },
    aflag(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)], [Pp(0.4 + 0.2 * (y % 2), 0), Pp(0.4 + 0.2 * (y % 2), 1)]], 'rgba(20,18,16,.35)'); K.speck(x, y, 3, ['rgba(255,255,255,.06)'], K.TW / 20); },
    amarb(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 3, [(x + y) % 2 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)'], K.TW / 12); },
    amarb2(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(60,50,40,.25)'); }
  };
  // decorazioni calpestabili: ciuffi d'erba, fiori, ortaggi, scala caduta, macerie del portone
  function decoDraw(K, t, x, y) {
    const h = i => K.hsh(x, y, i);
    if (t === 'aSpear') {   // lance spezzate: una a terra, una piantata storta con la punta
      K.line(K.S(x + 0.1, y + 0.3 + 0.4 * h(1), 0.03), K.S(x + 0.85, y + 0.2 + 0.5 * h(2), 0.03), '#6a4a2a', Math.max(2, K.TW / 18));
      const u = 0.3 + 0.4 * h(3), v = 0.4 + 0.3 * h(4); K.line(K.S(x + u, y + v, 0), K.S(x + u + 0.25, y + v - 0.1, 0.7), '#7a5632', Math.max(2, K.TW / 18));
      K.poly([K.S(x + u + 0.25, y + v - 0.1, 0.7), K.S(x + u + 0.31, y + v - 0.12, 0.92), K.S(x + u + 0.3, y + v - 0.06, 0.7)], '#b8bcc2'); return;
    }
    if (t === 'aShG') {   // scudo tondo a terra
      const c = ['#a83a2a', '#3a5aa8', '#c8a040', '#5a7a3a'][Math.floor(h(1) * 4)], [X, Y] = K.S(x + 0.5, y + 0.5, 0.04), g = K.g;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X + 2, Y + 2, K.TW * 0.22, K.TW * 0.11, 0, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(X, Y, K.TW * 0.21, K.TW * 0.105, 0, 0, 7); g.fill(); g.strokeStyle = '#8a8478'; g.lineWidth = Math.max(1.5, K.TW / 30); g.stroke();
      g.fillStyle = '#d8d0b8'; g.beginPath(); g.ellipse(X, Y, K.TW * 0.05, K.TW * 0.025, 0, 0, 7); g.fill(); return;
    }
    if (t === 'aBlood') { const g = K.g; g.fillStyle = 'rgba(110,14,18,.55)'; for (let i = 0; i < 4; i++) { const [X, Y] = K.S(x + 0.25 + 0.5 * h(i), y + 0.25 + 0.5 * h(i + 4), 0); g.beginPath(); g.ellipse(X, Y, K.TW * (0.05 + 0.1 * h(i + 8)), K.TW * (0.025 + 0.05 * h(i + 8)), 0, 0, 7); g.fill(); } return; }
    if (t === 'aCrat') {   // cratere di un sasso: anello di terra smossa e fondo bruciato
      const g = K.g, [X, Y] = K.S(x + 0.5, y + 0.5, 0); g.fillStyle = 'rgba(40,28,16,.45)'; g.beginPath(); g.ellipse(X, Y, K.TW * 0.42, K.TW * 0.21, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(20,14,10,.55)'; g.beginPath(); g.ellipse(X, Y + 1, K.TW * 0.26, K.TW * 0.12, 0, 0, 7); g.fill(); K.dot(x + 0.35, y + 0.6, 0.04, 0.06, '#8a8478'); return;
    }
    if (t === 'aWrk') { for (let i = 0; i < 3; i++) { const a = h(i) * 3, u = 0.25 + 0.5 * h(i + 3), v = 0.25 + 0.5 * h(i + 6); K.line(K.S(x + u - Math.cos(a) * 0.3, y + v - Math.sin(a) * 0.3, 0.04), K.S(x + u + Math.cos(a) * 0.3, y + v + Math.sin(a) * 0.3, 0.06), i % 2 ? '#5a3a20' : '#7a5230', Math.max(3, K.TW / 11)); } return; }
    if (t === 'aArw') { for (let i = 0; i < 4; i++) { const u = 0.2 + 0.6 * h(i), v = 0.2 + 0.6 * h(i + 4); K.line(K.S(x + u, y + v, 0), K.S(x + u - 0.08, y + v - 0.12, 0.32), '#5a3a1a', Math.max(1.5, K.TW / 30)); K.dot(x + u - 0.08, y + v - 0.12, 0.33, 0.03, '#e8e0d0'); } return; }
    if (t === 'aHelm') { K.dot(x + 0.5, y + 0.5, 0.08, 0.16, '#8a9098'); K.dot(x + 0.46, y + 0.46, 0.14, 0.06, '#c8ccd2'); K.line(K.S(x + 0.36, y + 0.5, 0.08), K.S(x + 0.64, y + 0.5, 0.08), '#5a6068', Math.max(2, K.TW / 22)); return; }
    if (t === 'aRubS') {   // macerie di pietra (merlo rotto, breccia)
      for (let i = 0; i < 5; i++) K.dot(x + 0.15 + 0.7 * h(i), y + 0.15 + 0.7 * h(i + 5), 0.06, 0.07 + 0.08 * h(i + 9), i % 2 ? '#8f897d' : '#a29c90'); return;
    }
    if (t === 'aTuft') { const L = []; for (let i = 0; i < 5; i++) { const u = 0.3 + 0.1 * i + 0.05 * K.hsh(x, y, i); L.push([K.S(x + u, y + 0.55, 0), K.S(x + u + 0.04 * (i - 2), y + 0.55, 0.22 + 0.08 * K.hsh(x, y, i + 3))]); } K.strokes(L, '#6a9a3a', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'aFlw') { for (let i = 0; i < 3; i++) { const u = 0.25 + 0.25 * i, v = 0.35 + 0.3 * K.hsh(x, y, i); K.line(K.S(x + u, y + v, 0), K.S(x + u, y + v, 0.16), '#5a8a32', 1.5); K.dot(x + u, y + v, 0.18, 0.045, ['#f2e24a', '#f2f0ea', '#d85a8a', '#8a7ad8'][(x + y + i) % 4]); } return; }
    if (t === 'aVeg') { K.bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0, 0.12, '#5a3a22'); for (let i = 0; i < 4; i++) K.dot(x + 0.25 + (i % 2) * 0.5, y + 0.3 + Math.floor(i / 2) * 0.4, 0.2, 0.1, (x + i) % 3 ? '#5aa83a' : '#d84a2a'); return; }
    if (t === 'aLadG') {   // scala caduta nell'erba
      const L = []; for (const v of [0.3, 0.7]) L.push([K.S(x - 0.6, y + v, 0.04), K.S(x + 1.6, y + v, 0.04)]); K.strokes(L, '#8a5a2a', Math.max(2.5, K.TW / 14));
      const R = []; for (let i = 0; i < 7; i++) { const u = -0.45 + i * 0.32; R.push([K.S(x + u, y + 0.3, 0.05), K.S(x + u, y + 0.7, 0.05)]); } K.strokes(R, '#a8743a', Math.max(2, K.TW / 20)); return;
    }
    if (t === 'aRubble') {   // il portone sfondato: assi spezzate e schegge a terra
      for (let i = 0; i < 4; i++) { const a = K.hsh(x, y, i) * 3, u = 0.2 + 0.6 * K.hsh(x, y, i + 4), v = 0.2 + 0.6 * K.hsh(x, y, i + 8); K.line(K.S(x + u - Math.cos(a) * 0.35, y + v - Math.sin(a) * 0.35, 0.05), K.S(x + u + Math.cos(a) * 0.35, y + v + Math.sin(a) * 0.35, 0.1), i % 2 ? '#5a3a20' : '#7a5230', Math.max(3, K.TW / 10)); }
      K.dot(x + 0.5, y + 0.5, 0.06, 0.05, '#3a3632');
    }
  }
  // SEGNI A TERRA: solchi delle ruote lungo la strada (dove passa l'ariete)
  function ground(K) {
    const g = K.g, S = K.S, TW = K.TW;
    if (!MP() || MP().w !== W) return;
    const ln = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = S(x, y, 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); };
    for (const x of [28.7, 30.3]) ln([[x, 81], [x, 52.5]], Math.max(2, TW / 14), 'rgba(50,38,24,.35)');
  }
  // MURI senza pavimento: lago (acqua con la schiuma a riva), vasche, siepe del borgo, MURI DELLE CASE (a graticcio, bassi: si vede dentro), MURI DEL MASTIO (pietra coi merli)
  function drawWall(K, x, y) {
    const { S, TW, bx, qL, strokes, dot } = K, k = WK && WK[y] ? WK[y][x] : 'lake';
    if (k === 'lake' || k === 'pool') {
      K.poly([S(x, y, -0.06), S(x + 1, y, -0.06), S(x + 1, y + 1, -0.06), S(x, y + 1, -0.06)], (x + y) % 2 ? '#2c5a70' : '#2a576c');
      if (TW < 40) return;
      if (K.hsh(x, y, 2) < 0.35) { const u = 0.2 + 0.5 * K.hsh(x, y, 3), v = 0.2 + 0.6 * K.hsh(x, y, 4); strokes([[S(x + u, y + v, -0.05), S(x + u + 0.3, y + v, -0.05)]], 'rgba(170,215,235,.35)', Math.max(1.5, TW / 30)); }
      const land = (a, b) => cqFloor[b] && cqFloor[b][a];
      const L = []; if (land(x, y + 1)) L.push([S(x, y + 1, -0.05), S(x + 1, y + 1, -0.05)]); if (land(x + 1, y)) L.push([S(x + 1, y, -0.05), S(x + 1, y + 1, -0.05)]);
      if (land(x, y - 1)) L.push([S(x, y, -0.05), S(x + 1, y, -0.05)]); if (land(x - 1, y)) L.push([S(x, y, -0.05), S(x, y + 1, -0.05)]);
      if (L.length) strokes(L, 'rgba(230,245,250,.55)', Math.max(2, TW / 18));
      if (k === 'pool' && K.hsh(x, y, 7) < 0.3) { K.line(S(x + 0.5, y + 0.5, -0.05), S(x + 0.55, y + 0.5, 0.6), '#5a7a3a', 2); K.dot(x + 0.55, y + 0.5, 0.62, 0.05, '#6a4a2a'); }
      return;
    }
    if (k === 'hedge') { bx(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0, 0.8, '#2f5a2e'); if (TW >= 40) for (let i = 0; i < 3; i++) dot(x + 0.2 + 0.6 * K.hsh(x, y, i), y + 0.96, 0.15 + 0.5 * K.hsh(x, y, i + 9), 0.035, '#4a7a3a'); return; }
    if (k === 'house') {   // muro a graticcio: zoccolo di pietra, intonaco, travi scure, finestrella con le imposte
      const H2 = 1.35; bx(x, y, x + 1, y + 1, 0, 0.3, '#7a7268'); bx(x, y, x + 1, y + 1, 0.3, H2, '#e0d2b4'); bx(x - 0.03, y - 0.03, x + 1.03, y + 1.03, H2, H2 + 0.12, '#5a3a22');
      if (TW < 40) return;
      const sF = !(WK[y + 1] && WK[y + 1][x]), eF = !(WK[y] && WK[y][x + 1]);
      const L = [];
      if (sF) { L.push([S(x + 0.05, y + 1, 0.3), S(x + 0.05, y + 1, H2)], [S(x, y + 1, 0.85), S(x + 1, y + 1, 0.85)], [S(x, y + 1, 0.3), S(x + 1, y + 1, 0.3)]); if (x % 3 === 1) L.push([S(x, y + 1, 0.3), S(x + 1, y + 1, H2)]); }
      if (eF) { L.push([S(x + 1, y + 0.05, 0.3), S(x + 1, y + 0.05, H2)], [S(x + 1, y, 0.85), S(x + 1, y + 1, 0.85)]); if (y % 3 === 1) L.push([S(x + 1, y + 1, 0.3), S(x + 1, y, H2)]); }
      strokes(L, '#5a3a22', Math.max(2, TW / 16));
      if (sF && (x * 7 + y) % 5 === 2) { qL(x + 0.3, x + 0.7, y + 1, 0.92, 1.25, '#2a2018'); qL(x + 0.34, x + 0.66, y + 1, 0.95, 1.22, (x + y) % 2 ? '#e8b860' : '#3a4a5a'); qL(x + 0.12, x + 0.28, y + 1, 0.92, 1.25, '#6a3a22'); qL(x + 0.72, x + 0.88, y + 1, 0.92, 1.25, '#6a3a22'); }
      return;
    }
    // mastio: muro di pietra basso (si vede dentro) coi merli in cima; sulle facce in vista vetrate, stendardi e torce
    const H2 = 1.3; bx(x, y, x + 1, y + 1, 0, H2, '#8a8478'); bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, H2, H2 + 0.08, '#a29c90');
    if ((x + y) % 2 === 0) bx(x + 0.08, y + 0.08, x + 0.92, y + 0.92, H2 + 0.08, H2 + 0.5, '#958f83');
    if (TW < 40) return;
    const sF = !(WK[y + 1] && WK[y + 1][x]) && cqFloor[y + 1] && cqFloor[y + 1][x], eF = !(WK[y] && WK[y][x + 1]) && cqFloor[y] && cqFloor[y][x + 1];
    const L = []; for (const z of [0.43, 0.86]) { if (sF) L.push([S(x, y + 1, z), S(x + 1, y + 1, z)]); if (eF) L.push([S(x + 1, y, z), S(x + 1, y + 1, z)]); } strokes(L, 'rgba(30,26,22,.25)');
    if (sF && y === 2) {   // vetrate e stendardi della parete in fondo
      if (x % 4 === 2) { qL(x + 0.25, x + 0.75, y + 1, 0.35, 1.2, '#2a2430'); const c = ['#c83a3a', '#3a6ac8', '#e8c040', '#3aa85a']; for (let i = 0; i < 4; i++) qL(x + 0.3 + (i % 2) * 0.22, x + 0.48 + (i % 2) * 0.22, y + 1.001, 0.42 + Math.floor(i / 2) * 0.38, 0.75 + Math.floor(i / 2) * 0.38, c[(i + x) % 4]); K.glow(x + 0.5, y + 1.2, 0.8, 1.0, 'rgba(255,220,160,.25)'); }
      else if (x % 4 === 0 && x > 17 && x < 42) { qL(x + 0.2, x + 0.8, y + 1, 0.2, 1.25, '#7a1a22'); qL(x + 0.25, x + 0.75, y + 1.001, 0.25, 1.2, '#a82a32'); dot(x + 0.5, y + 1.002, 0.8, 0.12, '#e8c040'); }
    }
    else if (sF && y === 21 && (x % 5 === 1)) { qL(x + 0.35, x + 0.65, y + 1, 0.45, 1.05, '#2a2018'); qL(x + 0.39, x + 0.61, y + 1, 0.5, 1.0, '#e8b860'); }
    else if (sF && y === 21 && (x % 5 === 3)) { bx(x + 0.45, y + 1, x + 0.55, y + 1.14, 0.8, 1.05, '#3a3028'); dot(x + 0.5, y + 1.14, 1.15, 0.06, '#ffb030'); K.glow(x + 0.5, y + 1.2, 1.1, 1.5, 'rgba(255,170,70,.4)'); }
  }
  function cotDraw(K, x, y) {   // CASETTA RUSTICA, una casella: zoccolo, assi, travi, tetto a due falde con lo sbalzo, frontone a est, porta, finestre, camino
    const { S, TW, bx, qL, strokes, dot } = K;
    {
      const C = COTS[COTI[y][x]], [x0, y0, x1, y1, , rf] = C, ym = (y0 + y1 + 1) / 2, hh = (y1 - y0 + 1) / 2, E = 1.25, RH = 0.8, zr = yy => E + (hh - Math.abs(yy - ym)) * RH;
      const sF = y === y1, eF = x === x1, barn = COTI[y][x] === 2, wood = barn ? '#7a4a2a' : '#8a6038', dark = '#4a2e16';
      bx(x, y, x + 1, y + 1, 0, 0.28, '#7a7268'); bx(x, y, x + 1, y + 1, 0.28, E, wood);
      if (eF) qR(K, x + 1.001, y, y + 1, E, E + 0.001, wood);
      if (TW >= 40) {
        const L = []; if (sF) { for (const u of [0.25, 0.5, 0.75]) L.push([S(x + u, y + 1.001, 0.3), S(x + u, y + 1.001, E)]); L.push([S(x, y + 1.001, 0.28), S(x + 1, y + 1.001, 0.28)]); }
        if (eF) for (const v of [0.25, 0.5, 0.75]) L.push([S(x + 1.001, y + v, 0.3), S(x + 1.001, y + v, E)]);
        strokes(L, 'rgba(30,18,8,.35)', 1.2);
        const B = []; if (sF) { B.push([S(x, y + 1.002, 0.28), S(x, y + 1.002, E)], [S(x, y + 1.002, E - 0.05), S(x + 1, y + 1.002, E - 0.05)]); if (x === x1) B.push([S(x + 1, y + 1.002, 0.28), S(x + 1, y + 1.002, E)]); }
        if (eF) B.push([S(x + 1.002, y, 0.28), S(x + 1.002, y, E)], [S(x + 1.002, y, E - 0.05), S(x + 1.002, y + 1, E - 0.05)]);
        strokes(B, dark, Math.max(2, TW / 18));
        const mid = Math.floor((x0 + x1) / 2);
        if (sF && x === mid) { if (barn) { qL(x - 0.4, x + 1.4, y + 1.003, 0.28, 1.15, '#3a2210'); qL(x - 0.32, x + 1.32, y + 1.004, 0.28, 1.08, '#6a3e22'); strokes([[S(x - 0.32, y + 1.005, 0.3), S(x + 1.32, y + 1.005, 1.06)], [S(x - 0.32, y + 1.005, 1.06), S(x + 1.32, y + 1.005, 0.3)]], '#3a2210', 2); }
          else { qL(x + 0.25, x + 0.75, y + 1.003, 0.28, 1.05, '#3a2210'); qL(x + 0.3, x + 0.7, y + 1.004, 0.28, 1.0, '#7a4a26'); dot(x + 0.62, y + 1.005, 0.62, 0.03, '#c8a040'); } }
        else if (sF && !barn && (x === x0 + 1 || x === x1 - 1 || x === x1)) { qL(x + 0.3, x + 0.7, y + 1.003, 0.6, 0.95, '#2a2018'); qL(x + 0.34, x + 0.66, y + 1.004, 0.63, 0.92, (x + y) % 2 ? '#e8b860' : '#3a4a5a'); qL(x + 0.12, x + 0.29, y + 1.004, 0.6, 0.95, '#3a5a2a'); qL(x + 0.71, x + 0.88, y + 1.004, 0.6, 0.95, '#3a5a2a'); if ((x + y) % 2) K.glow(x + 0.5, y + 1.15, 0.78, 0.8, 'rgba(255,200,120,.3)'); }
        if (eF && y === y0 + 1) { qR(K, x + 1.003, y + 0.3, y + 0.7, 0.6, 0.95, '#2a2018'); qR(K, x + 1.004, y + 0.34, y + 0.66, 0.63, 0.92, '#e8b860'); }
      }
      // tetto: la falda di questa casella (divisa in due se ci passa il colmo), con lo sbalzo ai bordi; colmo scuro; frontone a est
      const rc = rf === 't' ? ['#c8a050', '#a8843c', '#8a6a2a'] : ['#8a4e30', '#6e3c24', '#4a2616'];
      const ox0 = x === x0 ? -0.14 : 0, ox1 = x === x1 ? 0.14 : 0, ya0 = y === y0 ? y - 0.18 : y, yb0 = y === y1 ? y + 1.18 : y + 1;
      const piece = (ya, yb) => { if (yb <= ya) return; const za = zr(ya), zb = zr(yb), south = ya >= ym - 0.001;
        if (eF) K.poly([S(x + 1, Math.max(ya, y), E), S(x + 1, Math.min(yb, y + 1), E), S(x + 1, Math.min(yb, y + 1), zr(Math.min(yb, y + 1))), S(x + 1, Math.max(ya, y), zr(Math.max(ya, y)))], wood);
        K.poly([S(x + ox0, ya, za), S(x + 1 + ox1, ya, za), S(x + 1 + ox1, yb, zb), S(x + ox0, yb, zb)], south ? rc[0] : rc[1]);
        if (TW >= 40) { const L = []; for (let t = 0.2; t < 1; t += 0.25) { const yy = ya + (yb - ya) * t; L.push([S(x + ox0, yy, zr(yy) + 0.005), S(x + 1 + ox1, yy, zr(yy) + 0.005)]); } strokes(L, rf === 't' ? 'rgba(90,60,20,.35)' : 'rgba(30,14,6,.4)', 1.2); }
      };
      piece(ya0, Math.min(yb0, ym)); piece(Math.max(ya0, ym), yb0);
      if (ym > ya0 && ym < yb0) K.line(S(x + ox0, ym, zr(ym) + 0.02), S(x + 1 + ox1, ym, zr(ym) + 0.02), rc[2], Math.max(3, TW / 12));
      if (x === x1 - 1 && y === y0 && !barn) { bx(x + 0.3, y + 0.35, x + 0.7, y + 0.75, zr(y + 0.55) - 0.3, zr(y + 0.55) + 0.55, '#8a8478'); bx(x + 0.26, y + 0.31, x + 0.74, y + 0.79, zr(y + 0.55) + 0.5, zr(y + 0.55) + 0.6, '#6a645a'); }
    }
  }
  // facce delle colonne alzate (mura, torri, pedana del trono): pietra a corsi, la cima un po' piu' chiara
  function hzSide(x, y, i, z) {
    if (inTower(x, y)) return i === z - 1 ? '#8e887c' : '#7f796d';
    if (y < 22 && x > 10 && x < 49) return '#6a1820';
    return i === z - 1 ? '#9a9488' : i % 2 ? '#857f73' : '#8b8579';
  }
  const qR = (K, x, y0, y1, z0, z1, col) => K.poly([K.S(x, y0, z1), K.S(x, y1, z1), K.S(x, y1, z0), K.S(x, y0, z0)], col);
  function torch(K, x, y, z, f) {
    const { bx, dot, glow } = K;
    if (f === 'S') { bx(x + 0.45, y + 1, x + 0.55, y + 1.14, z - 0.1, z + 0.2, '#3a3028'); dot(x + 0.5, y + 1.14, z + 0.32, 0.06, '#ffb030'); dot(x + 0.5, y + 1.14, z + 0.4, 0.035, '#fff0a0'); glow(x + 0.5, y + 1.2, z + 0.35, 1.6, 'rgba(255,170,70,.42)'); }
    else if (f === 'E') { bx(x + 1, y + 0.45, x + 1.14, y + 0.55, z - 0.1, z + 0.2, '#3a3028'); dot(x + 1.14, y + 0.5, z + 0.32, 0.06, '#ffb030'); glow(x + 1.2, y + 0.5, z + 0.35, 1.6, 'rgba(255,170,70,.42)'); }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, qL, strokes } = K, g = K.g, TW = K.TW;
    o = o || {};
    switch (t) {
      case 'aMerl': {   // parapetto: merlo alto o feritoia bassa sulla cella alzata; sulla faccia di fuori feritoie, muschio, torce
        const hgt = o.k ? 0.95 : 0.38, st = o.tw ? '#8a8478' : '#958f83';
        bx(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0, hgt, st); bx(x, y, x + 1, y + 1, hgt, hgt + 0.06, cqShade(st, 1.08));
        if (TW >= 40) {
          const zl = -(o.tw ? TZ : WZ) * HB;
          if (o.f === 'S') { if ((x * 3 + y) % 4 === 1) qL(x + 0.44, x + 0.56, y + 1, zl * 0.55, zl * 0.32, '#1f1b17'); if (K.hsh(x, y, 2) < 0.3) qL(x + 0.1 + 0.6 * K.hsh(x, y, 3), x + 0.28 + 0.6 * K.hsh(x, y, 3), y + 1, zl, zl * 0.6, 'rgba(60,80,40,.28)'); }
          if (o.f === 'E') { if ((x + y * 3) % 4 === 1) qR(K, x + 1, y + 0.44, y + 0.56, zl * 0.55, zl * 0.32, '#1f1b17'); }
        }
        if (o.post && TW >= 40) {   // PORTICINA: piccola porta ad arco di legno con le borchie, alla base del muro
          const zl = -WZ * HB; qL(x + 0.18, x + 0.82, y + 1.003, zl, zl + 1.45, '#3a3028'); qL(x + 0.24, x + 0.76, y + 1.004, zl, zl + 1.32, '#6a4424');
          strokes([[S(x + 0.42, y + 1.005, zl), S(x + 0.42, y + 1.005, zl + 1.3)], [S(x + 0.58, y + 1.005, zl), S(x + 0.58, y + 1.005, zl + 1.3)], [S(x + 0.24, y + 1.005, zl + 0.45), S(x + 0.76, y + 1.005, zl + 0.45)], [S(x + 0.24, y + 1.005, zl + 0.95), S(x + 0.76, y + 1.005, zl + 0.95)]], '#3a2412', 1.5);
          dot(x + 0.68, y + 1.006, zl + 0.65, 0.035, '#c8a040');
        }
        if (o.t) torch(K, x, y, -1.1, o.f === 'S' || o.f === 'E' ? o.f : '');
        break; }
      case 'aGate': {   // PORTONE di legno con le borchie (4 caselle); o.d = quanto e' rovinato (crepe, assi saltate)
        const z1 = 3.3, d = o.d || 0; bx(x, y + 0.3, x + 1, y + 0.7, 0, z1, d >= 2 ? '#4a3018' : '#5a3a20');
        if (TW >= 40) { const L = []; for (const u of [0.33, 0.66]) L.push([S(x + u, y + 0.7, 0.05), S(x + u, y + 0.7, z1 - 0.05)]); strokes(L, 'rgba(0,0,0,.35)'); }
        for (const z of [0.6, 1.6, 2.6]) { bx(x - 0.01, y + 0.68, x + 1.01, y + 0.74, z, z + 0.16, '#3a3632'); for (const u of [0.2, 0.5, 0.8]) dot(x + u, y + 0.75, z + 0.08, 0.025, '#b8a070'); }
        if (d >= 1) { const L = []; for (let i = 0; i < 3 + d * 2; i++) { const u = 0.15 + 0.7 * K.hsh(x, i, 3), z = 0.4 + 2.4 * K.hsh(x, i, 4); L.push([S(x + u, y + 0.71, z), S(x + u + 0.15 * (K.hsh(x, i, 5) - 0.5), y + 0.71, z + 0.5)]); } strokes(L, '#1a1008', Math.max(1.5, TW / 26)); }
        if (d >= 2) { qL(x + 0.2 + 0.3 * K.hsh(x, y, 1), x + 0.45 + 0.3 * K.hsh(x, y, 1), y + 0.71, 0.9, 1.5, '#120c08'); bx(x + 0.3, y + 0.75, x + 0.7, y + 1.0, 0, 0.08, '#6a4a2a'); }
        if (o.i === 1) { bx(x - 1, y + 0.2, x + 3, y + 0.8, z1, z1 + 0.6, '#7f796d'); for (let i = 0; i < 7; i++) qL(x - 0.9 + i * 0.58, x - 0.6 + i * 0.58, y + 0.81, z1 + 0.1, z1 + 0.5, '#6a645a'); dot(x + 1, y + 0.82, z1 + 0.3, 0.16, '#c8a040'); dot(x + 1, y + 0.83, z1 + 0.3, 0.1, '#5a2a6a'); }
        break; }
      case 'aKdoor': {   // portone del mastio (chiuso fino all'ultima fase)
        bx(x, y + 0.25, x + 1, y + 0.75, 0, 1.6, '#5a3418'); if (TW >= 40) strokes([[S(x + 0.5, y + 0.75, 0.05), S(x + 0.5, y + 0.75, 1.55)]], 'rgba(0,0,0,.35)');
        for (const z of [0.4, 1.1]) bx(x - 0.01, y + 0.73, x + 1.01, y + 0.78, z, z + 0.12, '#2a2622');
        if (o.i === 1) { dot(x + 1, y + 0.8, 0.85, 0.08, '#c8a040'); bx(x - 1, y + 0.2, x + 3, y + 0.8, 1.6, 1.9, '#8a8478'); }
        break; }
      case 'aIdoor': { bx(x + 0.3, y, x + 0.7, y + 1, 0, 1.3, '#5a3418'); dot(x + 0.71, y + (o.i ? 0.2 : 0.8), 0.7, 0.04, '#c8a040'); break; }
      case 'aWinch': {   // ARGANO del portone (sulla torre): ruota con le maniglie e la catena che scende
        bx(x + 0.15, y + 0.3, x + 0.25, y + 0.7, 0, 1.1, '#5a3a20'); bx(x + 0.75, y + 0.3, x + 0.85, y + 0.7, 0, 1.1, '#5a3a20'); bx(x + 0.15, y + 0.46, x + 0.85, y + 0.54, 0.9, 0.98, '#3a3632');
        const [X, Y] = S(x + 0.5, y + 0.5, 0.95); g.strokeStyle = '#7a5232'; g.lineWidth = Math.max(2, TW / 16); g.beginPath(); g.ellipse(X, Y, TW * 0.32, TW * 0.4, 0, 0, 7); g.stroke();
        for (let i = 0; i < 4; i++) { const b = i * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(b) * TW * 0.42, Y + Math.sin(b) * TW * 0.5); g.stroke(); }
        line(S(x + 0.9, y + 0.5, 0.9), S(x + 1.4, y + 0.9, -0.6), '#2a2622', 2); break; }
      case 'aOil': {   // CALDERONE DELL'OLIO sulla torre: il fuoco sotto, il pentolone fumante
        for (const [a, b] of [[0.2, 0.2], [0.8, 0.2], [0.5, 0.85]]) line(S(x + a, y + b, 0), S(x + 0.5, y + 0.5, 0.55), '#2a2a2e', Math.max(2, TW / 22));
        dot(x + 0.5, y + 0.5, 0.15, 0.14, '#e8642a'); glow(x + 0.5, y + 0.5, 0.3, 1.4, 'rgba(255,130,40,.45)');
        cyl(x + 0.5, y + 0.5, 0.36, 0.5, 1.05, '#3a3a3e'); cyl(x + 0.5, y + 0.5, 0.3, 1.04, 1.06, '#c8a050'); break; }
      case 'aThrone': {   // TRONO (2 caselle lungo x, dalla casella davanti): schienale alto rosso e oro
        if (o.part) break; const x0 = x - 1;
        bx(x0 + 0.3, y + 0.15, x + 0.7, y + 0.85, 0, 0.6, '#c8a040'); bx(x0 + 0.35, y + 0.2, x + 0.65, y + 0.8, 0.6, 0.72, '#a8202a');
        bx(x0 + 0.3, y + 0.1, x + 0.7, y + 0.3, 0.6, 2.4, '#c8a040'); qL(x0 + 0.4, x + 0.6, y + 0.31, 0.75, 2.25, '#a8202a');
        for (const u of [0.3, 1.7]) bx(x0 + u - 0.08, y + 0.3, x0 + u + 0.08, y + 0.85, 0.6, 1.1, '#c8a040');
        dot(x0 + 1, y + 0.32, 2.55, 0.14, '#e8c040'); dot(x0 + 0.7, y + 0.32, 2.45, 0.07, '#e8c040'); dot(x0 + 1.3, y + 0.32, 2.45, 0.07, '#e8c040'); glow(x0 + 1, y + 0.5, 1.5, 2.0, 'rgba(255,215,120,.22)'); break; }
      case 'aCol': cyl(x + 0.5, y + 0.5, 0.36, 0, 0.25, '#a8a092'); cyl(x + 0.5, y + 0.5, 0.27, 0.25, 3.0, '#c8c0b2'); cyl(x + 0.5, y + 0.5, 0.36, 3.0, 3.25, '#a8a092');
        if (TW >= 40) { const L = []; for (const a of [-0.15, 0, 0.15]) L.push([S(x + 0.5 + a, y + 0.5 + 0.2, 0.3), S(x + 0.5 + a, y + 0.5 + 0.2, 2.95)]); strokes(L, 'rgba(0,0,0,.08)'); } break;
      case 'aBench2': bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.4, 0.5, '#6a3a20'); for (const a of [0.12, 0.82]) bx(x + a, y + 0.35, x + a + 0.06, y + 0.65, 0, 0.4, '#4a2a18'); break;
      case 'aTable': bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0.62, 0.72, '#7a5232'); for (const [a, b] of [[0.1, 0.15], [0.84, 0.15], [0.1, 0.78], [0.84, 0.78]]) bx(x + a, y + b, x + a + 0.06, y + b + 0.06, 0, 0.62, '#5a3a20');
        cyl(x + 0.35, y + 0.4, 0.08, 0.72, 0.85, '#c8c0a8'); bx(x + 0.55, y + 0.5, x + 0.8, y + 0.7, 0.72, 0.76, '#c89a50'); dot(x + 0.6, y + 0.35, 0.8, 0.05, '#d84a2a'); break;
      case 'aArmor': cyl(x + 0.5, y + 0.5, 0.25, 0, 0.1, '#5a3a20'); bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0.1, 0.9, '#5a3a20'); bx(x + 0.3, y + 0.38, x + 0.7, y + 0.62, 0.9, 1.55, '#a8acb4'); cyl(x + 0.5, y + 0.5, 0.17, 1.55, 1.95, '#b8bcc4'); bx(x + 0.42, y + 0.6, x + 0.58, y + 0.64, 1.7, 1.78, '#1a1a1e'); bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 1.95, 2.15, '#c83a2a'); break;
      case 'aChest': bx(x + 0.15, y + 0.25, x + 0.85, y + 0.75, 0, 0.45, '#6a4220'); bx(x + 0.13, y + 0.23, x + 0.87, y + 0.77, 0.45, 0.6, '#7a5028'); for (const u of [0.25, 0.75]) bx(x + u - 0.03, y + 0.22, x + u + 0.03, y + 0.78, 0, 0.62, '#c8a040'); dot(x + 0.5, y + 0.78, 0.4, 0.04, '#c8a040'); break;
      case 'aAltar': { if (o.part) break; const x0 = x - 1; bx(x0 + 0.1, y + 0.1, x + 0.9, y + 0.8, 0, 1.0, '#d8d0c0'); bx(x0 + 0.05, y + 0.05, x + 0.95, y + 0.85, 1.0, 1.1, '#f2ead8'); qL(x0 + 0.3, x + 0.7, y + 0.86, 0.2, 0.95, '#3a3a7a'); dot(x0 + 1, y + 0.87, 0.6, 0.12, '#e8c040');
        bx(x0 + 0.95, y + 0.4, x0 + 1.05, y + 0.5, 1.1, 1.8, '#c8a040'); bx(x0 + 0.8, y + 0.4, x0 + 1.2, y + 0.5, 1.55, 1.63, '#c8a040'); break; }
      case 'aPew': bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.38, 0.46, '#6a4220'); bx(x + 0.05, y + 0.22, x + 0.95, y + 0.3, 0.38, 0.95, '#5a3418'); for (const a of [0.08, 0.86]) bx(x + a, y + 0.3, x + a + 0.06, y + 0.7, 0, 0.38, '#4a2a14'); break;
      case 'aCandle': cyl(x + 0.5, y + 0.5, 0.15, 0, 0.1, '#c8a040'); bx(x + 0.48, y + 0.48, x + 0.52, y + 0.52, 0.1, 1.4, '#c8a040'); for (const a of [-0.2, 0, 0.2]) { cyl(x + 0.5 + a, y + 0.5, 0.04, 1.4, 1.6, '#f2ead8'); dot(x + 0.5 + a, y + 0.5, 1.66, 0.03, '#ffd060'); } glow(x + 0.5, y + 0.5, 1.6, 1.4, 'rgba(255,210,120,.4)'); break;
      case 'aWell': cyl(x + 0.5, y + 0.5, 0.42, 0, 0.7, '#8a8478'); cyl(x + 0.5, y + 0.5, 0.32, 0.69, 0.7, '#1e3a4a'); for (const a of [0.12, 0.88]) bx(x + a - 0.04, y + 0.46, x + a + 0.04, y + 0.54, 0.7, 1.9, '#5a3a20');
        bx(x + 0.05, y + 0.47, x + 0.95, y + 0.53, 1.75, 1.82, '#5a3a20'); poly([S(x - 0.05, y + 0.2, 1.9), S(x + 1.05, y + 0.2, 1.9), S(x + 1.05, y + 0.5, 2.35), S(x - 0.05, y + 0.5, 2.35)], '#7a3a2a'); poly([S(x - 0.05, y + 0.8, 1.9), S(x + 1.05, y + 0.8, 1.9), S(x + 1.05, y + 0.5, 2.35), S(x - 0.05, y + 0.5, 2.35)], '#9a4a32');
        bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 1.1, 1.35, '#6a4a2a'); break;
      case 'aLowW': bx(x, y + 0.25, x + 1, y + 0.75, 0, 0.95, '#8a8276'); bx(x - 0.01, y + 0.23, x + 1.01, y + 0.77, 0.95, 1.05, '#a29a8c'); if (TW >= 40) strokes([[S(x, y + 0.75, 0.48), S(x + 1, y + 0.75, 0.48)], [S(x + 0.5, y + 0.75, 0), S(x + 0.5, y + 0.75, 0.48)]], 'rgba(0,0,0,.18)'); break;
      case 'aStallW': bx(x + 0.42, y, x + 0.58, y + 1, 0, 1.1, '#6a4a2a'); bx(x + 0.4, y - 0.02, x + 0.6, y + 1.02, 1.1, 1.18, '#7a5832'); break;
      case 'aHorse': {   // cavallo nella stalla (di profilo lungo x)
        const c = o.c || '#6a4a2a', d = cqShade(c, 0.75);
        for (const u of [0.25, 0.75]) for (const v of [0.4, 0.6]) bx(x + u - 0.04, y + v - 0.04, x + u + 0.04, y + v + 0.04, 0, 0.7, d);
        bx(x + 0.15, y + 0.35, x + 0.85, y + 0.65, 0.65, 1.15, c); bx(x + 0.75, y + 0.4, x + 0.95, y + 0.6, 1.0, 1.55, c); bx(x + 0.85, y + 0.38, x + 1.2, y + 0.62, 1.35, 1.6, c);
        bx(x + 0.76, y + 0.42, x + 0.86, y + 0.58, 1.3, 1.75, '#2a1a10'); bx(x + 0.05, y + 0.45, x + 0.15, y + 0.55, 0.6, 1.05, '#2a1a10'); dot(x + 1.1, y + 0.62, 1.52, 0.025, '#111'); break; }
      case 'aTrough': bx(x + 0.05, y + 0.25, x + 0.95, y + 0.75, 0, 0.5, '#6a4a2a'); bx(x + 0.12, y + 0.32, x + 0.88, y + 0.68, 0.45, 0.48, '#3a6a8a'); break;
      case 'aGrind': bx(x + 0.2, y + 0.3, x + 0.8, y + 0.7, 0, 0.6, '#5a3a20'); { const [X, Y] = S(x + 0.5, y + 0.5, 0.95); g.fillStyle = '#8a8478'; g.beginPath(); g.ellipse(X, Y, TW * 0.12, TW * 0.3, 0, 0, 7); g.fill(); g.fillStyle = '#6a645a'; g.beginPath(); g.ellipse(X, Y, TW * 0.04, TW * 0.08, 0, 0, 7); g.fill(); } break;
      case 'aScare': bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0, 1.9, '#6a4a2a'); bx(x + 0.15, y + 0.47, x + 0.85, y + 0.53, 1.45, 1.52, '#6a4a2a'); bx(x + 0.32, y + 0.4, x + 0.68, y + 0.6, 0.9, 1.5, '#8a3a2a'); cyl(x + 0.5, y + 0.5, 0.13, 1.55, 1.85, '#e8d8a0'); cyl(x + 0.5, y + 0.5, 0.2, 1.85, 1.9, '#8a6a2a'); break;
      case 'aForge': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.9, '#5a544c'); bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0.9, 0.95, '#2a2420'); dot(x + 0.5, y + 0.5, 0.97, 0.18, '#e8642a'); dot(x + 0.5, y + 0.5, 1.0, 0.1, '#ffc040');
        bx(x + 0.3, y + 0.05, x + 0.7, y + 0.35, 0.95, 2.6, '#4a443c'); glow(x + 0.5, y + 0.5, 1.1, 2.0, 'rgba(255,120,40,.45)'); break;
      case 'aAnvil': bx(x + 0.35, y + 0.35, x + 0.65, y + 0.65, 0, 0.5, '#5a3a20'); bx(x + 0.2, y + 0.38, x + 0.8, y + 0.62, 0.5, 0.75, '#3a3e44'); bx(x + 0.1, y + 0.42, x + 0.9, y + 0.58, 0.75, 0.82, '#4a4e54'); break;
      case 'aDummy': bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 1.4, '#6a4a2a'); bx(x + 0.15, y + 0.46, x + 0.85, y + 0.54, 1.25, 1.32, '#6a4a2a'); cyl(x + 0.5, y + 0.5, 0.2, 0.7, 1.45, '#c8b07a'); cyl(x + 0.5, y + 0.5, 0.15, 1.5, 1.85, '#d8c08a'); break;
      case 'aTarget': for (const a of [0.2, 0.8]) bx(x + a - 0.04, y + 0.46, x + a + 0.04, y + 0.54, 0, 1.3, '#6a4a2a');
        { const [X, Y] = S(x + 0.5, y + 0.55, 1.35); for (const [r, c] of [[0.42, '#f2efe4'], [0.32, '#d83a2a'], [0.22, '#f2efe4'], [0.11, '#d83a2a']]) { g.fillStyle = c; g.beginPath(); g.ellipse(X, Y, TW * r * 0.7, TW * r * 0.9, 0, 0, 7); g.fill(); } } break;
      case 'aRackW': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.3, 0, 1.5, '#6a4a2a'); for (let i = 0; i < 4; i++) { const u = 0.2 + i * 0.2; line(S(x + u, y + 0.35, 0.1), S(x + u, y + 0.3, 1.7), '#9aa0a8', Math.max(1.5, TW / 30)); dot(x + u, y + 0.3, 1.72, 0.03, '#c8ccd2'); } break;
      case 'aCart': for (const v of [0.15, 0.85]) { const [X, Y] = S(x + 0.5, y + v, 0.35); g.fillStyle = '#4a3018'; g.beginPath(); g.ellipse(X, Y, TW * 0.24, TW * 0.32, 0, 0, 7); g.fill(); g.fillStyle = '#7a5432'; g.beginPath(); g.ellipse(X, Y, TW * 0.08, TW * 0.11, 0, 0, 7); g.fill(); }
        bx(x + 0.1, y + 0.2, x + 0.9, y + 0.8, 0.45, 0.85, '#8a6a3a'); bx(x + 0.15, y + 0.25, x + 0.85, y + 0.75, 0.85, 1.05, '#c8a85a'); break;
      case 'aBraz': for (const [a, b] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.75]]) line(S(x + a, y + b, 0), S(x + 0.5, y + 0.5, 0.9), '#2a2a2e', Math.max(2, TW / 22));
        cyl(x + 0.5, y + 0.5, 0.3, 0.9, 1.15, '#3a3a3e'); dot(x + 0.5, y + 0.5, 1.2, 0.16, '#e8642a'); dot(x + 0.48, y + 0.5, 1.35, 0.09, '#ffb030'); dot(x + 0.5, y + 0.5, 1.48, 0.045, '#fff0a0'); glow(x + 0.5, y + 0.5, 1.3, 2.2, 'rgba(255,150,60,.5)'); break;
      case 'aBann': bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 3.2, '#3a3030'); bx(x + 0.2, y + 0.46, x + 0.8, y + 0.54, 3.05, 3.12, '#3a3030');
        qL(x + 0.22, x + 0.78, y + 0.55, 1.6, 3.05, '#5a2a6a'); qL(x + 0.26, x + 0.74, y + 0.56, 1.7, 3.0, '#7a3a8a'); dot(x + 0.5, y + 0.57, 2.5, 0.09, '#e8c040'); break;
      case 'aHearth': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.45, 0, 1.3, '#7a7268'); qL(x + 0.25, x + 0.75, y + 0.451, 0.05, 0.6, '#1a1410'); dot(x + 0.5, y + 0.47, 0.18, 0.12, '#e8642a'); dot(x + 0.5, y + 0.47, 0.28, 0.06, '#ffc040'); glow(x + 0.5, y + 0.6, 0.3, 1.6, 'rgba(255,140,50,.45)'); bx(x + 0.3, y + 0.1, x + 0.7, y + 0.35, 1.3, 1.9, '#6a6258'); break;
      case 'aBed': { if (o.part) break; const y0 = y - 1; bx(x + 0.1, y0 + 0.05, x + 0.9, y + 0.9, 0, 0.4, '#6a4220'); bx(x + 0.13, y0 + 0.1, x + 0.87, y + 0.85, 0.4, 0.55, '#e8e0cc'); bx(x + 0.13, y0 + 0.7, x + 0.87, y + 0.85, 0.55, 0.62, (x % 2) ? '#8a3a3a' : '#3a5a8a'); bx(x + 0.2, y0 + 0.12, x + 0.8, y0 + 0.5, 0.55, 0.66, '#f2ead8'); bx(x + 0.1, y0 + 0.02, x + 0.9, y0 + 0.1, 0, 0.9, '#5a3418'); break; }
      case 'aStool': cyl(x + 0.5, y + 0.5, 0.18, 0, 0.42, '#6a4a2a'); cyl(x + 0.5, y + 0.5, 0.2, 0.42, 0.47, '#8a6a3a'); break;
      case 'aShelf': bx(x + 0.1, y + 0.6, x + 0.9, y + 0.95, 0, 1.6, '#6a4a2a'); for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) cyl(x + 0.25 + i * 0.25, y + 0.75, 0.08, 0.15 + r * 0.5, 0.4 + r * 0.5, ['#c8a060', '#8a3a2a', '#e8d8a8', '#5a7a3a'][(r + i + x) % 4]); break;
      case 'aFount': {   // FONTANA della piazza (2x2): vasca, colonna, getti d'acqua
        if (o.part) break; const cx = x, cy = y; cyl(cx, cy, 0.95, 0, 0.45, '#9a948a'); cyl(cx, cy, 0.82, 0.44, 0.46, '#4a8ab0'); cyl(cx, cy, 0.14, 0.45, 1.4, '#a8a29a'); cyl(cx, cy, 0.35, 1.4, 1.5, '#9a948a'); dot(cx, cy, 1.55, 0.1, '#bfe0f0');
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; line(S(cx, cy, 1.5), S(cx + Math.cos(a) * 0.6, cy + Math.sin(a) * 0.6, 0.5), 'rgba(200,235,250,.85)', 1.5); } break; }
      case 'aStall': {   // bancarella del mercato: banco, frutta, tendone a strisce
        const c = o.c || '#c83a2a'; bx(x + 0.05, y + 0.2, x + 0.95, y + 0.8, 0, 0.75, '#7a5232');
        for (let i = 0; i < 5; i++) dot(x + 0.18 + i * 0.16, y + 0.45 + (i % 2) * 0.15, 0.8, 0.07, ['#e8442a', '#f2c030', '#6ab83a', '#e88a2a'][(i + x) % 4]);
        for (const [a, b] of [[0.05, 0.15], [0.9, 0.15]]) bx(x + a, y + b, x + a + 0.05, y + b + 0.05, 0, 1.75, '#5a3a20');
        poly([S(x - 0.05, y + 0.1, 1.75), S(x + 1.05, y + 0.1, 1.75), S(x + 1.05, y + 0.95, 1.4), S(x - 0.05, y + 0.95, 1.4)], c);
        for (let i = 0; i < 3; i++) poly([S(x + 0.1 + i * 0.36, y + 0.1, 1.751), S(x + 0.28 + i * 0.36, y + 0.1, 1.751), S(x + 0.28 + i * 0.36, y + 0.95, 1.401), S(x + 0.1 + i * 0.36, y + 0.95, 1.401)], '#f2ead8'); break; }
      case 'aBarr': {   // BARRICATA: cavalli di frisia con i pali appuntiti
        for (const u of [0.2, 0.8]) { line(S(x + u - 0.2, y + 0.2, 0), S(x + u + 0.2, y + 0.8, 1.0), '#6a4a2a', Math.max(3, TW / 12)); line(S(x + u + 0.2, y + 0.2, 0), S(x + u - 0.2, y + 0.8, 1.0), '#7a5432', Math.max(3, TW / 12)); }
        line(S(x - 0.05, y + 0.5, 0.5), S(x + 1.05, y + 0.5, 0.5), '#5a3a20', Math.max(3, TW / 11)); for (const u of [0.1, 0.5, 0.9]) dot(x + u, y + 0.5, 0.95, 0.04, '#c8b07a'); break; }
      case 'aWreck': {   // carro rotto rovesciato: cassone storto, una ruota spezzata
        bx(x + 0.08, y + 0.25, x + 0.9, y + 0.75, 0, 0.55, '#6a4a2a'); bx(x + 0.04, y + 0.22, x + 0.94, y + 0.3, 0.45, 0.8, '#7a5632');
        line(S(x + 0.15, y + 0.8, 0.05), S(x + 0.15, y + 0.8, 0.75), '#3a2412', Math.max(3, TW / 12)); dot(x + 0.8, y + 0.85, 0.28, 0.2, '#4a2e16'); dot(x + 0.8, y + 0.85, 0.28, 0.06, '#8a6036'); break; }
      case 'aMant': {   // mantelletto: parete di assi inclinata su due ruote (riparo dalle frecce)
        poly([S(x + 0.05, y + 0.62, 0), S(x + 0.95, y + 0.62, 0), S(x + 0.95, y + 0.42, 1.35), S(x + 0.05, y + 0.42, 1.35)], '#8a6038');
        for (const u of [0.25, 0.5, 0.75]) line(S(x + u, y + 0.62, 0), S(x + u, y + 0.42, 1.35), 'rgba(40,24,10,.45)', 1.5);
        for (const u of [0.15, 0.85]) dot(x + u, y + 0.72, 0.15, 0.13, '#3a2412'); break; }
      case 'aStones': {   // catasta dei sassi per la catapulta
        for (let i = 0; i < 7; i++) { const u = 0.2 + (i % 3) * 0.3, v = 0.25 + Math.floor(i / 3) * 0.28, z = i > 5 ? 0.45 : 0.15; dot(x + u, y + v, z, 0.17, i % 2 ? '#8a8478' : '#9a948a'); }
        dot(x + 0.5, y + 0.45, 0.5, 0.16, '#a8a296'); break; }
      case 'aCatS': case 'aBalS': case 'aTowS': break;
      case 'aCot': cotDraw(K, x, y); break;
      case 'aQuiv': {   // CESTA DI FRECCE: cesto di vimini con le frecce dritte e le penne colorate
        cyl(x + 0.5, y + 0.5, 0.26, 0, 0.5, '#a8804a'); cyl(x + 0.5, y + 0.5, 0.27, 0.45, 0.52, '#7a5a32');
        if (TW >= 40) for (let i = 0; i < 7; i++) { const a = i * 0.9, u = x + 0.5 + Math.cos(a) * 0.13, v = y + 0.5 + Math.sin(a) * 0.1; line(S(u, v, 0.5), S(u, v, 1.05), '#6a4a2a', 1.5); dot(u, v, 1.05, 0.04, i % 2 ? '#e8e0d0' : '#c83a2a'); }
        break; }   // caselle solide sotto la catapulta e le balestre (disegnate a parte, in profondita')
      case 'aPal': {   // BARRICATA DEL GENIO: palizzata di pali appuntiti con due traverse e la bandierina della squadra (rotta: due pali spezzati)
        const col = TEAMS[o.t || 0].c, dm = o.d;
        bx(x + 0.02, y + 0.36, x + 0.98, y + 0.64, 0, 0.08, '#5a4228');
        for (let i = 0; i < 5; i++) {
          const u = 0.1 + i * 0.2, br = dm && (i === 1 || i === 3), h = br ? 0.55 : 1.22 + (i % 2) * 0.14, c1 = i % 2 ? '#8a6038' : '#a87a4a';
          bx(x + u - 0.08, y + 0.43, x + u + 0.08, y + 0.57, 0, h, c1);
          if (!br) poly([S(x + u - 0.08, y + 0.57, h), S(x + u + 0.08, y + 0.57, h), S(x + u + 0.08, y + 0.43, h), S(x + u, y + 0.5, h + 0.3)], cqShade(c1, 1.12));
          else poly([S(x + u - 0.08, y + 0.57, h), S(x + u + 0.08, y + 0.57, h + 0.12), S(x + u, y + 0.57, h - 0.05)], '#c8a070');
        }
        for (const z of [0.32, 0.86]) bx(x - 0.02, y + 0.57, x + 1.02, y + 0.64, z, z + 0.11, '#5a3a1e');
        bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 1.3, 2.05, '#3a2412');
        poly([S(x + 0.5, y + 0.5, 2.02), S(x + 0.5 - 0.46, y + 0.5 + 0.12, 1.86), S(x + 0.5, y + 0.5, 1.66)], col);
        break; }
      case 'aLamp': cyl(x + 0.5, y + 0.5, 0.06, 0, 2.3, '#3a3030'); bx(x + 0.5, y + 0.47, x + 0.85, y + 0.53, 2.2, 2.26, '#3a3030'); bx(x + 0.75, y + 0.42, x + 0.92, y + 0.58, 1.75, 2.05, '#f6d890'); glow(x + 0.83, y + 0.5, 1.9, 1.8, 'rgba(255,210,130,.42)'); break;
      case 'aTent': {
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
      case 'aLad': {   // SCALA appoggiata al parapetto sud: dal piede a terra fin sopra il merlo
        const top = WZ * HB + 0.75, rails = [], R = [];
        const A = (s, u) => [x + s, y + 0.9 - u * 0.9];
        for (const s of [0.22, 0.78]) { const [a1, b1] = A(s, 0), [a2, b2] = A(s, 1); rails.push([S(a1, b1, 0), S(a2, b2, top)]); }
        strokes(rails, '#7a4a22', Math.max(3, TW / 11));
        for (let i = 1; i < 10; i++) { const u = i / 10, [a1, b1] = A(0.22, u), [a2, b2] = A(0.78, u); R.push([S(a1, b1, top * u), S(a2, b2, top * u)]); }
        strokes(R, '#b07a40', Math.max(2, TW / 18)); break; }
      case 'aBench': bx(x + 0.05, y + 0.2, x + 0.95, y + 0.8, 0.6, 0.72, '#8a6a3a'); for (const [a, b] of [[0.1, 0.25], [0.85, 0.25], [0.1, 0.7], [0.85, 0.7]]) bx(x + a, y + b, x + a + 0.06, y + b + 0.06, 0, 0.6, '#5a3a20'); bx(x + 0.2, y + 0.35, x + 0.7, y + 0.5, 0.72, 0.8, '#c8a060'); break;
    }
  }
  CQ_MAPS.castello = { n: 'Castello di Roccaforte', make: mapCastle, only: 'assedio' };
  // altezza (in U) di quello che c'e' in una casella, per le frecce: muro/oggetto alto = la freccia si pianta
  const PH = { aMerl: 0, aGate: 3.3, aKdoor: 1.6, aIdoor: 1.3, aWinch: 1.1, aOil: 1.05, aThrone: 2.4, aCol: 3.25, aBench2: 0.5, aTable: 0.8, aArmor: 2.1, aChest: 0.6, aAltar: 1.1, aPew: 0.95, aCandle: 1.6, aWell: 2.2, aLowW: 1.05, aStallW: 1.15, aHorse: 1.6, aTrough: 0.5, aGrind: 1.0, aScare: 1.9,
    aForge: 2.6, aAnvil: 0.8, aDummy: 1.8, aTarget: 1.6, aRackW: 1.7, aCart: 1.1, aBraz: 1.4, aBann: 3.2, aHearth: 1.9, aBed: 0.7, aStool: 0.45, aShelf: 1.6, aFount: 1.5, aStall: 1.75, aBarr: 1.0, aCot: 2.6, aQuiv: 0.9, aTowS: 0, aPal: 1.3, aRamS: 0, aCatS: 1.5, aBalS: 1.0, aWreck: 0.8, aMant: 1.35, aStones: 0.6, aLamp: 2.3, aTent: 1.9, aFire: 0.3, aRack: 2.6, aLad: 0.3, aBench: 0.8, pine: 4, oak: 4, rock: 0.8, bush: 0.7, hay: 1.0, barrel: 0.9, crate: 0.8, crate2: 1.2, logpile: 0.8 };
  function topAt(xi, yi) {
    if (!cqFloor[yi] || !cqFloor[yi][xi]) { const k = WK && WK[yi] ? WK[yi][xi] : 'lake'; return k === 'lake' || k === 'pool' ? -0.1 : k === 'house' ? 1.5 : k === 'cot' ? 2.6 : k === 'keep' ? 1.4 : 9; }
    const base = cqHc(xi, yi) * HB, s = cqSolid[yi][xi]; if (!s) return base;
    if (s.wall) return 9; if (s.prop === 'aMerl') return base + (s.o && s.o.k ? 0.95 : 0.38);
    return base + (PH[s.prop] != null ? PH[s.prop] : 1.2);
  }

  // ======================= LE FRECCE =======================
  const arPos = (a, t) => { const u = Math.max(0, Math.min(1, (t - a.t0) / a.d)); return [a.x0 + (a.x1 - a.x0) * u, a.y0 + (a.y1 - a.y0) * u, a.z0 + (a.z1 - a.z0) * u + 4 * a.pk * u * (1 - u), u]; };
  const clU = (G, c) => { const k = Math.max(0, Math.min(1, (G.time - c.cl.t0) / c.cl.T)); return c.cl.d > 0 ? k : 1 - k; };
  const clZ = (G, c) => clU(G, c) * WZ * HB;
  const clXY = (G, c) => { const S = MP().spots[c.cl.s], u = clU(G, c); return [S.ax + (S.tx - S.ax) * u * 0.55, S.ay + (S.ty - S.ay) * u * 0.55]; };
  const bodyZ = (G, c) => { const p = P(c); return c.cl ? clZ(G, c) : zAt(p.x, p.y); };
  const xyOf = (G, c) => { if (c.cl) { const q = clXY(G, c); return { x: q[0], y: q[1] }; } return P(c); };
  // lo scudo alzato ferma le frecce che arrivano dal davanti (sdA = dove guarda lo scudo, sulla mappa)
  const shieldBlocks = (c, a) => { if (!c.sd || c.sdA == null || c.cl || c.pu) return false; const vx = a.x1 - a.x0, vy = a.y1 - a.y0, m = Math.hypot(vx, vy) || 1; return -(vx * Math.cos(c.sdA) + vy * Math.sin(c.sdA)) / m > 0.2; };
  // PARABOLA AUTOMATICA: la freccia sale quanto basta per scavalcare merli, muretti e barricate lungo il tiro (non si incastra nel bordo del muro).
  // Il punto d'arrivo resta quello mirato: cambia solo l'altezza (al massimo ARC_UP in piu'). I muri veri (case, mastio, torri: alti 9) non si scavalcano.
  const ARC_UP = 3, ARC_M = 0.18;
  function arcPk(x0, y0, z0, x1, y1, z1, b) {
    const d0 = Math.hypot(x1 - x0, y1 - y0), base = b != null ? b : 0.45 + 0.13 * d0; if (d0 < 0.8) return base;
    const n = Math.max(2, Math.ceil(d0 / 0.2)), u0 = Math.min(0.3, 0.3 / d0), u1 = 1 - Math.min(0.3, 0.6 / d0); let pk = base;
    for (let i = 1; i < n; i++) {
      const u = i / n; if (u < u0 || u > u1) continue;
      const top = topAt(Math.floor(x0 + (x1 - x0) * u), Math.floor(y0 + (y1 - y0) * u)); if (top >= 8) continue;
      const need = (top + ARC_M - z0 - (z1 - z0) * u) / (4 * u * (1 - u)); if (need > pk) pk = need;
    }
    return Math.min(pk, base + ARC_UP);
  }
  function mkArrow(G, c, x1, y1, q) {
    const p = P(c), z0 = bodyZ(G, c) + 1.25, d0 = Math.hypot(x1 - p.x, y1 - p.y), z1 = zAt(x1, y1) + 0.45;
    const a = { id: ++G.arN, o: c.id, t: c.t, q: q || 0, x0: p.x, y0: p.y, z0, x1, y1, z1, t0: G.time, d: 0.16 + d0 / 15, pk: 0.45 + 0.13 * d0, te: 0, hit: -1 };
    if (c.cl) { const [cx, cy] = clXY(G, c); a.x0 = cx; a.y0 = cy; }
    const pk = arcPk(a.x0, a.y0, z0, x1, y1, z1); a.d += 0.05 * (pk - a.pk); a.pk = pk;   // un tiro piu' alto ci mette un attimo in piu'
    G.ar.push(a); c.rl = G.time + RELOAD * (c.bot ? 1.5 : 1); c.sh = (c.sh || 0) + 1; if (c.q != null) c.q = Math.max(0, c.q - 1);
    return a;
  }
  function aimEnd(px, py, dx, dy, dist, k) {
    const sp = (0.12 + 0.045 * dist) * (k || 1), a = Math.atan2(dy, dx) + gauss() * sp * 0.09, d = dist * (1 + gauss() * 0.05 * (k || 1));
    return [px + Math.cos(a) * d + gauss() * sp * 0.25, py + Math.sin(a) * d + gauss() * sp * 0.25];
  }
  function arTick(G) {
    for (const a of G.ar) {
      if (a.te) continue;
      const u0 = Math.max(0, Math.min(1, (G.time - 0.05 - a.t0) / a.d)), u1 = Math.max(0, Math.min(1, (G.time - a.t0) / a.d)), len = Math.hypot(a.x1 - a.x0, a.y1 - a.y0) * (u1 - u0), n = Math.max(1, Math.ceil(len / 0.2));
      for (let i = 1; i <= n; i++) {
        const u = u0 + (u1 - u0) * i / n, x = a.x0 + (a.x1 - a.x0) * u, y = a.y0 + (a.y1 - a.y0) * u, z = a.z0 + (a.z1 - a.z0) * u + 4 * a.pk * u * (1 - u), tt = a.t0 + u * a.d;
        let hit = null; const bolt = a.k === 'b';
        for (const c of G.chars) {
          if (!c.alive || c.t === a.t || dead(G, c) || c.id === a.o) continue;
          const p = c.cl ? (() => { const q = clXY(G, c); return { x: q[0], y: q[1] }; })() : P(c), cz = bodyZ(G, c);
          if (Math.hypot(p.x - x, p.y - y) < (bolt ? 0.55 : 0.44) && z > cz - 0.1 && z < cz + 2.35) { hit = c; break; }
        }
        if (bolt && ctAlive(G) && G.ct && a.t !== atkT(G) && inCtBox(G.ct, x, y, 0.2) && z < 2.6) {   // il dardo della balestra nella catapulta
          a.te = tt; a.hx = x; a.hy = y; a.hz = z; a.hit = -3; const by = byId(G, a.o); if (by) by.ctH = (by.ctH || 0) + 1; ctHurt(G, BAL_DMG, by); break;
        }
        if (bolt && twAlive(G) && a.t !== atkT(G) && inTwBox(G.tw, x, y, 0.15) && z < 4.6) { a.te = tt; a.hx = x; a.hy = y; a.hz = z; a.hit = -3; twHurt(G, BAL_DMG, byId(G, a.o)); break; }
        if (hit) {
          a.te = tt; a.hx = x; a.hy = y; a.hz = z;
          if (!bolt && shieldBlocks(hit, a)) { a.hit = -2; hit.blk = (hit.blk || 0) + 1; }   // lo scudo del guerriero (davanti) la ferma; il dardo della balestra no
          else { a.hit = hit.id; if (!safe(G, hit)) hurt(G, hit, bolt ? 2 : 1, byId(G, a.o), bolt ? 'bal' : 'ar'); }
          break;
        }
        if (u > 0.06 && z < topAt(Math.floor(x), Math.floor(y))) { a.te = tt; a.hx = x; a.hy = y; a.hz = z; break; }
        if (u >= 1) { a.te = tt; a.hx = x; a.hy = y; a.hz = Math.max(z - 0.4, zAt(x, y)); break; }
      }
    }
    G.ar = G.ar.filter(a => !a.te || G.time - a.te < 4);
  }
  function hurt(G, c, n, by, why) {
    if (dead(G, c)) return;
    c.hp = Math.max(0, (c.hp == null ? maxHp(c) : c.hp) - n); c.hitT = G.time;
    if (by) by.hi = (by.hi || 0) + 1;
    if (c.pu) c.pu = null;
    if (c.hp <= 0) down(G, c, by, why);
  }
  // cade (corpo a terra) e torna: chi attacca dopo RESP_A secondi al punto di partenza della fase, chi difende con l'ondata di rinforzi
  function down(G, c, by, why) {
    const p = c.cl ? (() => { const q = clXY(G, c); return { x: q[0], y: q[1] }; })() : P(c);
    c.dn = isAtk(G, c) ? G.time + RESP_A : G.hs + Math.ceil((G.time - G.hs + 3) / WAVE) * WAVE;
    c.d = (c.d || 0) + 1; c.path = []; c.walk = 0; c.pu = null; c.cl = null; c.sd = 0; c.stn = 0; if (G.ct && G.ct.drv === c.id) G.ct.drv = -1;
    if (by && by.t !== c.t) by.k = (by.k || 0) + 1;
    const lc = G.ld.find(l => l.st === 1 && l.c === c.id); if (lc) dropLad(G, lc, p.x, p.y);
    G.bodies = G.bodies.filter(b => b.id !== c.id);
    G.bodies.push({ id: c.id, x: p.x, y: p.y, face: c === G.me ? cq.face : c.face, look: cqLookOf(c), name: c.name, t: G.time, nk: 1 });
    say(G, 'down', { a: c.id, b: by ? by.id : -1, w: why || '', x: r1(p.x), y: r1(p.y) });
  }
  function revive(G, c) { if (CL[c.ncls]) c.cls = c.ncls; c.q = QV; c.dn = 0; c.hp = maxHp(c); c.sf = G.time + SAFE; c.angel = G.time; G.bodies = G.bodies.filter(b => b.id !== c.id); const p = baseSpawn(G, c); tp(G, c, p.x, p.y); }
  function tp(G, c, x, y) { c.x = x; c.y = y; c.path = []; c.cl = null; if (c === G.me) { cq.x = x; cq.y = y; } c.tpN = (c.tpN || 0) + 1; c.tp = [r2(x), r2(y)]; }
  const baseSpawn = (G, c) => { const ph = Math.min(3, G.ph); if (isAtk(G, c)) return SQ.spawn(SPAWN_A[ph], 5); const L2 = SPAWN_D[ph]; return SQ.spawn(L2[(c.id + (c.d || 0)) % L2.length], 4); };
  const atSpawn = (G, c) => { const p = P(c), ph = Math.min(3, G.ph || 1), L2 = isAtk(G, c) ? [SPAWN_A[ph]] : SPAWN_D[ph]; return L2.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 4.5); };

  // ======================= LE CLASSI: cambio, spada e martello, scudo, barricate =======================
  // si cambia subito se sei a terra, all'intervallo, al conto alla rovescia o vicino al punto di partenza; se no al prossimo ritorno
  const clsNow = (G, c) => dead(G, c) || inIv(G) || (G.pre || 0) > 0 || atSpawn(G, c) || safe(G, c);
  function setCls(G, c, k) {
    if (!CL[k]) return; c.ncls = k;
    if (!dead(G, c) && clsNow(G, c) && c.cls !== k) { c.cls = k; c.hp = maxHp(c); c.sd = 0; c.rl = 0; }
  }
  const canHit = (G, c) => c.alive && !dead(G, c) && !c.pu && !c.cl && !c.stn && !inIv(G) && !G.ld.some(l => l.st === 1 && l.c === c.id);
  // verso il nemico piu' vicino (gli arcieri contano di piu': lo scudo si gira verso chi tira)
  function aimDir(G, c, R, arcFirst) { const p = P(c); let b = null, bd = 1e9; for (const e of enemies(G, c)) { const q = xyOf(G, e), d = Math.hypot(q.x - p.x, q.y - p.y); if (d > R) continue; const s = d - (arcFirst && clsOf(e) === 'a' ? 4 : 0); if (s < bd) { bd = s; b = q; } } return b ? Math.atan2(b.y - p.y, b.x - p.x) : null; }
  function melee(G, c) {
    const k = clsOf(c); if (k === 'a' || !canHit(G, c) || (c.rl || 0) > G.time + 0.05) return;
    const R = k === 'g' ? SW_R : HM_R, p = P(c), z = bodyZ(G, c);
    c.rl = G.time + (k === 'g' ? SW_CD : HM_CD) * (c.bot ? 1.35 : 1); c.sw = G.time; c.sd = 0; c.swN = (c.swN || 0) + 1;
    let best = null, bd = R;
    for (const e of enemies(G, c)) { const q = xyOf(G, e), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && Math.abs(bodyZ(G, e) - z) < 1.4) { bd = d; best = [e, q]; } }
    if (best) {
      const [e, q] = best, ax = q.x - p.x, ay = q.y - p.y, m = Math.hypot(ax, ay) || 1; c.swA = Math.atan2(ay, ax);
      // PARATA: scudo alzato, girato verso chi colpisce, non scosso -> niente danno, ma per PARRY_CD secondi non para piu' i colpi da vicino
      if (e.sd && clsOf(e) === 'g' && !e.cl && !e.pu && e.sdA != null && (e.pmT || 0) <= G.time && -(Math.cos(e.sdA) * ax + Math.sin(e.sdA) * ay) / m > 0.2) {
        e.pmT = G.time + PARRY_CD; e.pmN = (e.pmN || 0) + 1; say(G, 'parry', { a: e.id, b: c.id, x: r1(q.x), y: r1(q.y) }); return;
      }
      if (!safe(G, e)) {
        if (e.cl) { const S = MP().spots[e.cl.s]; e.cl = null; tp(G, e, S.ax, S.ay); e.fallN = (e.fallN || 0) + 1; hurt(G, e, 1, c, 'fall'); }   // chi sale la scala cade giu'
        else { hurt(G, e, 1, c, k === 'g' ? 'sw' : 'hm'); if (!dead(G, e)) { const nx = q.x + ax / m * KNOCK, ny = q.y + ay / m * KNOCK; if (cqFree(nx, ny) && hzAt(nx, ny) === hzAt(q.x, q.y)) tp(G, e, nx, ny); } }
        c.mh = (c.mh || 0) + 1;
      }
      say(G, 'mel', { a: c.id, b: e.id, x: r1(q.x), y: r1(q.y), w: k });
      return;
    }
    const a = aimDir(G, c, 6); c.swA = a != null ? a : c.swA || 0;
    // nessun nemico a portata: colpisce la barricata nemica li' davanti
    if (!isAtk(G, c)) {   // in sortita: a colpi contro la catapulta e la torre
      if (ctAlive(G) && inCtBox(G.ct, p.x, p.y, 1.0)) { c.swA = Math.atan2(G.ct.y - p.y, G.ct.x - p.x); ctHurt(G, k === 'n' ? 2 : 1, c); return; }
      if (twAlive(G) && inTwBox(G.tw, p.x, p.y, 1.0)) { c.swA = Math.atan2(G.tw.y - p.y, G.tw.x - p.x); twHurt(G, k === 'n' ? 2 : 1, c); return; }
    }
    const b = G.bw.find(b => b.t !== c.t && Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < 1.45);
    if (b) { b.hp -= k === 'n' ? 2 : 1; c.swA = Math.atan2(b.y + 0.5 - p.y, b.x + 0.5 - p.x); say(G, 'bhit', { a: c.id, x: b.x + 0.5, y: b.y + 0.5, d: b.hp <= 0 ? 1 : 0 }); if (b.hp <= 0) { G.bw = G.bw.filter(o => o !== b); c.bk = (c.bk || 0) + 1; } }
  }
  function shieldTick(G) {
    for (const c of G.chars) {
      if (!c.sd) continue;
      if (clsOf(c) !== 'g' || dead(G, c) || inIv(G)) { c.sd = 0; continue; }
      const a = aimDir(G, c, 14, true); if (a != null) c.sdA = a; else if (c === G.me && (cq.wdx || cq.wdy)) c.sdA = Math.atan2(cq.wdy, cq.wdx); else if (c.sdA == null) c.sdA = -Math.PI / 2;
    }
  }
  // BARRICATA: il genio pianta un muretto di assi nella casella davanti (max BAR_N a testa, la piu' vecchia sparisce); mai dove chiude un passaggio
  function keepsWay(x, y) {
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], z = cqHc(x, y);
    const N = D4.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => cqCellFree(a, b) && Math.abs(cqHc(a, b) - z) <= 1);
    if (N.length < 2) return true;
    const R = 8, seen = new Set([x + ',' + y, N[0].join(',')]), q = [N[0]];
    while (q.length) { const [a, b] = q.pop(); for (const [dx, dy] of D4) { const nx = a + dx, ny = b + dy, k = nx + ',' + ny; if (Math.abs(nx - x) > R || Math.abs(ny - y) > R || seen.has(k) || !cqCellFree(nx, ny) || Math.abs(cqHc(nx, ny) - cqHc(a, b)) > 1) continue; seen.add(k); q.push([nx, ny]); } }
    return N.every(n => seen.has(n.join(',')));
  }
  function buildOk(G, c, x, y) {
    if (clsOf(c) !== 'n' || !canHit(G, c) || (c.bwT || 0) > G.time || G.phase !== 'play') return false;
    const p = P(c); if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) > 1.75) return false;
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || !cqCellFree(x, y) || cqHc(x, y) !== hzAt(p.x, p.y)) return false;
    if (inPass(x, y) || (x >= 26 && x <= 33 && (y >= 52 || (y >= 19 && y <= 23)))) return false;   // il portone, la strada dell'ariete, la porta del mastio
    if (MP().spots.some(S => (S.fx === x && S.fy === y) || (Math.floor(S.ax) === x && Math.floor(S.ay) === y) || (Math.floor(S.tx) === x && Math.floor(S.ty) === y))) return false;
    const pts = [[LEV.x - 0.5, LEV.y + 0.5], [RK.x + 0.5, RK.y + 1.5], ...OILC.map(o => [o.sx, o.sy]), ...SPAWN_A.filter(Boolean).map(s => [s.x, s.y]), ...SPAWN_D.filter(Boolean).flat().map(s => [s.x, s.y])];
    if (pts.some(([a, b]) => Math.hypot(a - x - 0.5, b - y - 0.5) < 2.2)) return false;
    if (G.chars.some(o => { if (!o.alive || dead(G, o)) return false; const q = xyOf(G, o); return Math.abs(q.x - x - 0.5) < 0.95 && Math.abs(q.y - y - 0.5) < 0.95; })) return false;   // nessuno dentro o a cavallo della casella
    return keepsWay(x, y);
  }
  function doBuild(G, c, x, y) {
    x = Math.floor(x); y = Math.floor(y); if (!buildOk(G, c, x, y)) return false;
    const own = G.bw.filter(b => b.o === c.id); if (own.length >= BAR_N) G.bw = G.bw.filter(b => b !== own[0]);
    G.bw.push({ id: ++G.bwN, x, y, t: c.t, o: c.id, hp: BAR_HP }); c.bwT = G.time + BAR_CD; c.bN = (c.bN || 0) + 1;
    say(G, 'build', { a: c.id, x: x + 0.5, y: y + 0.5 }); return true;
  }
  // la casella davanti a me (dove guardo camminando)
  const frontCell = () => { let dx = cq.wdx || 0, dy = cq.wdy || 0; if (!dx && !dy) dy = -1; const m = Math.hypot(dx, dy); return [Math.floor(cq.x + dx / m * 1.1), Math.floor(cq.y + dy / m * 1.1)]; };

  // ======================= LE SCALE =======================
  function dropLad(G, l, x, y) {
    let best = null, bd = 1e9;
    for (let yy = Math.floor(y) - 3; yy <= Math.floor(y) + 3; yy++) for (let xx = Math.floor(x) - 3; xx <= Math.floor(x) + 3; xx++) {
      if (!cqCellFree(xx, yy) || cqHc(xx, yy) || inCastle(xx, yy) || (cqDeco && cqDeco[yy] && cqDeco[yy][xx]) || G.ld.some(o => o.st === 3 && Math.abs(o.x - xx) < 2 && Math.abs(o.y - yy) < 1)) continue;
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y); if (d < bd) { bd = d; best = [xx, yy]; }
    }
    if (!best) { l.st = 0; l.c = -1; return; }
    l.st = 3; l.c = -1; l.x = best[0]; l.y = best[1]; l.s = -1;
  }
  const ladAt = (G, s) => G.ld.find(l => l.st === 2 && l.s === s);
  const spotOk = S => cqCellFree(S.fx, S.fy) && cqCellFree(Math.floor(S.ax), Math.floor(S.ay));
  const spotFree = (G, s) => !G.ld.some(l => l.st === 2 && Math.abs(MP().spots[l.s].fx - MP().spots[s].fx) < 2);
  function nearSpot(G, x, y, r = 1.1) { let b = -1, bd = r; MP().spots.forEach((S, i) => { const d = Math.hypot(S.ax - x, S.ay - y); if (d < bd && spotFree(G, i) && spotOk(S)) { bd = d; b = i; } }); return b; }
  function nearLadFoot(G, x, y, r = 1.15) { let b = null, bd = r; for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s], d = Math.hypot(S.ax - x, S.ay - y); if (d < bd) { bd = d; b = l; } } return b; }
  function nearLadTop(G, x, y, r = 1.3) { let b = null, bd = r; for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s], d = Math.hypot(S.tx - x, S.ty - y); if (d < bd) { bd = d; b = l; } } return b; }
  function jumpAt(G, x, y) { let b = -1, bd = 0.75; MP().spots.forEach((S, i) => { const d = Math.hypot(S.tx - x, S.ty - y); if (d < bd && cqCellFree(Math.floor(S.ax), Math.floor(S.ay)) && !ladAt(G, i)) { bd = d; b = i; } }); return b; }
  const nearRack = (x, y) => Math.hypot(x - RK.x - 0.5, y - RK.y - 0.5) < 1.6;
  const nearGroundLad = (G, x, y) => G.ld.find(l => l.st === 3 && Math.hypot(l.x + 0.5 - x, l.y + 0.5 - y) < 1.5);
  function fall(G, l, by) {
    const S = MP().spots[l.s];
    for (const c of G.chars) if (c.cl && c.cl.s === l.s) { c.cl = null; tp(G, c, S.ax, S.ay); hurt(G, c, 1, by, 'fall'); c.fallN = (c.fallN || 0) + 1; }
    dropLad(G, l, S.ax, S.ay + 1.2);
    if (by) by.pn = (by.pn || 0) + 1;
    say(G, 'fall', { a: by ? by.id : -1, x: S.fx, y: S.fy });
  }
  // la mappa segue le scale, il portone, le porte del mastio (su ogni telefono)
  function syncMap(G) {
    const M = MP();
    const sig = G.ld.map(l => l.st + ':' + (l.st === 2 ? l.s : l.st === 3 ? l.x + ',' + l.y : '')).join('|');
    if (sig !== G.ldSig) {
      G.ldSig = sig;
      const want = new Set(), wantD = new Set();
      for (const l of G.ld) { if (l.st === 2) { const S = M.spots[l.s]; want.add(S.fx + ',' + S.fy); } if (l.st === 3) wantD.add(l.x + ',' + l.y); }
      const old = G.ldOld || { p: new Set(), d: new Set() };
      for (const k of old.p) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aLad') { cqSolid[y][x] = null; cqBgCell(x, y); } }
      for (const k of want) { const [x, y] = k.split(',').map(Number); if (!(cqSolid[y][x] && cqSolid[y][x].prop === 'aLad')) { cqSolid[y][x] = { prop: 'aLad', o: { w: 'S' } }; cqBgCell(x, y); } }
      if (cqDeco) { for (const k of old.d) if (!wantD.has(k)) { const [x, y] = k.split(',').map(Number); if (cqDeco[y][x] === 'aLadG') { cqDeco[y][x] = null; cqBgCell(x, y, 1); } }
        for (const k of wantD) { const [x, y] = k.split(',').map(Number); if (cqDeco[y][x] !== 'aLadG') { cqDeco[y][x] = 'aLadG'; cqBgCell(x, y, 1); } } }
      const n = G.ld.filter(l => l.st === 0).length, rk = cqSolid[RK.y][RK.x];
      if (rk && rk.prop === 'aRack' && rk.o.n !== n) { cqSolid[RK.y][RK.x] = { prop: 'aRack', o: { n } }; cqBgCell(RK.x, RK.y); }
      G.ldOld = { p: want, d: wantD };
    }
    // barricate del genio (rotte = un'asse in meno); chi del computer aveva una strada che ci passa la ricalcola
    const bs = (G.bw || []).map(b => b.x + ',' + b.y + ',' + b.t + ',' + (b.hp <= BAR_HP / 2 ? 1 : 0)).join('|');
    if (bs !== G.bwSig) {
      G.bwSig = bs; const want = new Map(); for (const b of G.bw || []) want.set(b.x + ',' + b.y, b);
      for (const k of G.bwOld || []) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aPal') { cqSolid[y][x] = null; cqBgCell(x, y); } }
      for (const [k, b] of want) { const s = cqSolid[b.y][b.x], d = b.hp <= BAR_HP / 2 ? 1 : 0; if (!s || s.prop !== 'aPal' || s.o.t !== b.t || s.o.d !== d) { if (!s || s.prop === 'aPal') { cqSolid[b.y][b.x] = { prop: 'aPal', o: { t: b.t, d } }; cqBgCell(b.x, b.y); } } }
      G.bwOld = [...want.keys()];
      for (const c of G.chars) if (c.bot && c.path && c.path.length) { c.path = []; c.goal = null; }
    }
    // l'ariete e' solido finche' il portone non cade (casella invisibile 'aRamS'; chi del computer ci passava in mezzo ricalcola la strada)
    const rs = G.ph === 1 && !G.gopen && G.rm ? ramCells(G.rm).map(q => q.join(',')).join('|') : '';
    if (rs !== G.rmSig) {
      G.rmSig = rs; const want = new Set(rs ? rs.split('|') : []);
      for (const k of G.rmOld || []) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aRamS') cqSolid[y][x] = null; }
      for (const k of want) { const [x, y] = k.split(',').map(Number); if (!cqSolid[y][x] && cqFloor[y] && cqFloor[y][x]) cqSolid[y][x] = { prop: 'aRamS', o: {}, soft: 1 }; }
      G.rmOld = [...want];
      for (const c of G.chars) if (c.bot && c.path && c.path.some(([x, y]) => want.has(Math.floor(x) + ',' + Math.floor(y)))) { c.path = []; c.goal = null; }
    }
    // la catapulta: caselle 'soft' sotto di lei (solo per i percorsi dei computer; la sagoma vera e' in M.blk)
    const cs = ctAlive(G) ? ctCells(G.ct).map(q => q.join(',')).join('|') : '';
    if (cs !== G.ctSig) {
      G.ctSig = cs; const want = new Set(cs ? cs.split('|') : []);
      for (const k of G.ctOld || []) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aCatS') cqSolid[y][x] = null; }
      for (const k of want) { const [x, y] = k.split(',').map(Number); if (!cqSolid[y][x] && cqFloor[y] && cqFloor[y][x]) cqSolid[y][x] = { prop: 'aCatS', o: {}, soft: 1 }; }
      G.ctOld = [...want];
    }
    const tsg = twAlive(G) ? G.tw.x.toFixed(1) + ',' + G.tw.y.toFixed(1) : '';
    if (tsg !== G.twSig) {
      G.twSig = tsg; const want = new Set(); if (tsg) for (let cy = Math.floor(G.tw.y - 0.9); cy <= Math.floor(G.tw.y + 0.9); cy++) for (let cx = Math.floor(G.tw.x - 0.9); cx <= Math.floor(G.tw.x + 0.9); cx++) want.add(cx + ',' + cy);
      for (const k of G.twOld || []) if (!want.has(k)) { const [x, y] = k.split(',').map(Number); if (cqSolid[y][x] && cqSolid[y][x].prop === 'aTowS') cqSolid[y][x] = null; }
      for (const k of want) { const [x, y] = k.split(',').map(Number); if (!cqSolid[y][x] && cqFloor[y] && cqFloor[y][x]) cqSolid[y][x] = { prop: 'aTowS', o: {}, soft: 1 }; }
      G.twOld = [...want];
    }
    // merli rotti, crepe e brecce dei tratti di muro (all'inizio di ogni tempo tutto torna intero)
    const ws = (G.wl || []).join(',') + '|' + (G.mb || []).join(';');
    if (ws !== G.wlSig) { G.wlSig = ws; applyWalls(G); for (const c of G.chars) if (c.bot) { c.path = []; c.goal = null; } }
    // portone: crepe secondo i colpi, sfondato = macerie (si passa)
    const gs = G.gopen ? 3 : G.gh > GATE_HP * 0.66 ? 0 : G.gh > GATE_HP * 0.33 ? 1 : 2;
    if (gs !== G.gsS) { G.gsS = gs; for (let i = 0; i < 4; i++) { const x = 28 + i, y = 50; if (gs === 3) { cqSolid[y][x] = null; if (cqDeco) cqDeco[y][x] = 'aRubble'; } else { cqSolid[y][x] = { prop: 'aGate', o: { i, d: gs } }; if (cqDeco) cqDeco[y][x] = null; } cqBgCell(x, y); } }
    // porte del mastio: aperte nell'ultima fase
    const ko = G.ph >= 3 ? 1 : 0;
    if (ko !== G.koS) { G.koS = ko; for (let i = 0; i < 4; i++) { cqSolid[21][28 + i] = ko ? null : { prop: 'aKdoor', o: { i } }; cqBgCell(28 + i, 21, 1); }
      for (const [x, y] of [[17, 10], [17, 11], [42, 10], [42, 11]]) { cqSolid[y][x] = ko ? null : { prop: 'aIdoor', o: { v: 1, i: y - 10 } }; cqBgCell(x, y, 1); } }
  }

  const ctCells = T => { const L = []; for (let cy = Math.floor(T.y - 0.6); cy <= Math.floor(T.y + 0.6); cy++) for (let cx = Math.floor(T.x - 0.6); cx <= Math.floor(T.x + 0.6); cx++) L.push([cx, cy]); return L; };
  // muro: altezze originali (HZ0) e merli tolti (ORIG), per rimetterli; ridisegno di una sola zona che comprende tutte le caselle cambiate
  const ORIG = new Map(); let HZ0 = null;
  function applyWalls(G) {
    const M = MP(); if (!M || !M.hz) return; if (!HZ0 || HZ0.m !== M) HZ0 = { m: M, z: M.hz.map(r => Uint8Array.from(r)) };
    const B = cq.bg, Z = [1e9, 1e9, -1e9, -1e9]; let any = false;
    const touch = (x, y) => { any = true; if (!B) return; const TW = B.TW, TH = TW / 2, U = TH * 1.15; Z[0] = Math.min(Z[0], B.ox + (x - y - 1) * TW / 2 - 2 * TW); Z[1] = Math.min(Z[1], B.oy + (x + y) * TH / 2 - 10 * U - TW - 6 * U); Z[2] = Math.max(Z[2], B.ox + (x - y + 1) * TW / 2 + 2 * TW); Z[3] = Math.max(Z[3], B.oy + (x + y + 2) * TH / 2 + TW); };
    const setDeco = (x, y, k) => { if (!cqDeco || !cqDeco[y]) return; const cur = cqDeco[y][x]; if (k ? !cur : cur === 'aRubS') { cqDeco[y][x] = k; touch(x, y); } };
    const mb = new Set(G.mb || []), open = SECS.map((S, i) => (G.wl[i] || 0) >= SEC_HP);
    const takeOff = (x, y) => { const s = cqSolid[y][x]; if (s && s.prop === 'aMerl') { ORIG.set(x + ',' + y, s); cqSolid[y][x] = null; touch(x, y); } };
    SECS.forEach((S, i) => {
      for (let x = S.x0; x <= S.x1; x++) {
        for (let y = 49; y <= 51; y++) { const want = open[i] ? 0 : HZ0.z[y][x]; if (M.hz[y][x] !== want) { M.hz[y][x] = want; touch(x, y); } setDeco(x, y, open[i] && (x + y) % 2 ? 'aRubS' : null); }
        if (open[i]) takeOff(x, 51);
        const s = cqSolid[51][x]; if (s && s.prop === 'aMerl') { const cr = G.wl[i] || 0; if ((s.o.cr || 0) !== cr) { s.o = Object.assign({}, s.o, { cr }); touch(x, 51); } }
        setDeco(x, 52, !open[i] && (G.wl[i] || 0) >= 2 && (x + (G.wl[i] || 0)) % 2 ? 'aRubS' : null);
      }
    });
    for (const k of mb) { const [x, y] = k.split(',').map(Number); takeOff(x, y); }
    for (const [k, o] of ORIG) { const [x, y] = k.split(',').map(Number), si = y === 51 ? SECS.findIndex(S => x >= S.x0 && x <= S.x1) : -1; if (mb.has(k) || (si >= 0 && open[si])) continue; if (!cqSolid[y][x]) { cqSolid[y][x] = o; touch(x, y); } ORIG.delete(k); }
    if (any) { M.mimg = null; if (B) cqBgZone(Z); }
  }

  // ======================= CRONACA E ANNUNCI =======================
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 16) G.lg.shift(); show(G, e); }
  function ann(G, t, sub, col) { (G.annQ = G.annQ || []).push({ t, sub, col: col || '#8a1a1a' }); }
  function shake(G, a) { G.shk = { a: Math.max(a, G.shk && performance.now() < G.shk.e ? G.shk.a : 0), e: performance.now() + 120 + a * 25 }; }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', bn = B ? '<b>' + esc(B.name) + '</b>' : '', atk = isAtk(G, me), d = e.x != null ? Math.hypot(e.x - cq.x, e.y - cq.y) : 99;
    let t = '';
    if (e.k === 'down') {
      if (A === me) { t = e.w === 'fall' ? '💥 Sei caduto dalla scala!' : e.w === 'oil' ? '🔥 Olio bollente!' : e.w === 'jump' ? '💥 Atterraggio storto!' : B ? (e.w === 'sw' ? '🗡️ ' : e.w === 'hm' ? '🔨 ' : '💀 ') + bn + ' ti ha abbattuto!' : '💀 Sei caduto!'; shake(G, 12); }
      else if (B === me) { t = '🎯 Hai abbattuto ' + an + '!'; beep(880, 0.08, 0.04); beep(1175, 0.12, 0.04, 0.08); }
      if (d < 14 && A !== me) { const v = 0.05 * (1 - d / 14); beep(420 + (e.a * 37) % 120, 0.25, v, 0, 'sawtooth'); beep(260, 0.3, v, 0.12, 'sawtooth'); }
    }
    else if (e.k === 'place') { if (!atk) { t = '🪜 Una scala sulle mura! Rovesciala!'; beep(300, 0.1, 0.05); } else if (A === me) t = '🪜 Scala appoggiata: sali!'; if (d < 16) thud(0.4, 200); }
    else if (e.k === 'fall') { if (A === me) { t = '🤚 Scala rovesciata!'; beep(700, 0.06, 0.04); } else if (atk) t = '💥 ' + (A ? an + ' ha' : 'Hanno') + ' rovesciato una scala!'; if (d < 14) { thud(0.6 * (1 - d / 14), 150); thud(0.4 * (1 - d / 14), 90); shake(G, 4); } }
    else if (e.k === 'jump') { if (A === me) t = '🪂 Che salto! (−1 ❤)'; if (d < 12) thud(0.5 * (1 - d / 12), 110); }
    else if (e.k === 'ram') { const f = 0.6 + 0.4 * Math.min(1.5, e.s || 1); if (d < 16) { thud(0.8 * (1 - d / 16) * f, 70); thud(0.5 * (1 - d / 16), 140); shake(G, 8 * f * (1 - d / 16)); } if (e.n > 1) fxAdd(G, 'txt', e.x, e.y, '💥 COLPO DI SQUADRA!'); }
    else if (e.k === 'ramgate') { ann(G, '🐏 L\'ARIETE È AL PORTONE!', atk ? 'Spingete e sfondatelo!' : 'Olio bollente, presto!', atk ? '#8a5a1a' : '#8a1a1a'); bell(); }
    else if (e.k === 'gate50') { ann(G, '🚪 IL PORTONE STA CEDENDO!', atk ? 'Ancora qualche colpo!' : 'Tenete duro!', '#8a3a1a'); bell(); }
    else if (e.k === 'lever') { if (!atk) { ann(G, '⚙️ NEMICO ALL\'ARGANO!', 'Sta aprendo il portone: fermatelo!', '#8a1a1a'); bell(); } else if (A === me) t = '⚙️ Gira l\'argano: resta fermo!'; }
    else if (e.k === 'gate') { ann(G, '🚪 IL PORTONE È CADUTO!', atk ? 'Al cortile! (+' + BONUS[1] + ' s)' : 'Ritirata: difendete il cortile!', atk ? '#2a6a2a' : '#8a1a1a'); shake(G, 14); for (let i = 0; i < 4; i++) thud(0.5, 60 + i * 30); }
    else if (e.k === 'oil') { if (d < 16) { shake(G, 6); thud(0.5, 90); beep(160, 0.6, 0.03, 0, 'sawtooth'); } if (A === me) t = '🔥 Olio versato!'; }
    else if (e.k === 'cont') { ann(G, e.z === 3 ? '👑 IL TRONO È CONTESO!' : '⚔️ IL CORTILE È CONTESO!', atk ? 'Cacciateli dalla zona!' : 'Non mollate la zona!', '#6a2a6a'); }
    else if (e.k === 'zone') { ann(G, '⚔️ IL CORTILE È CADUTO!', atk ? 'Alla sala del trono! (+' + BONUS[2] + ' s)' : 'Ultima difesa: il trono!', atk ? '#2a6a2a' : '#8a1a1a'); shake(G, 10); bell(); }
    else if (e.k === 'win') { ann(G, '👑 IL CASTELLO È CADUTO!', (A ? A.name : 'Gli attaccanti') + ' sul trono', '#a8801a'); fanfare(atk); shake(G, 10); }
    else if (e.k === 'half') { horn(); }
    else if (e.k === 'ctfire') { if (d < 18) { thud(0.6 * (1 - d / 18), 110); beep(140, 0.2, 0.03 * (1 - d / 18), 0, 'sawtooth'); } }
    else if (e.k === 'rock') {   // il sasso arriva: polvere, schegge, cratere, schermo che trema vicino
      fxAdd(G, 'boom', e.x, e.y); if (d < 20) { const v = 1 - d / 20; thud(0.9 * v, 55); thud(0.6 * v, 90); shake(G, 12 * v); }
      const xi = Math.floor(e.x), yi = Math.floor(e.y); if (cqDeco && cqDeco[yi] && !cqDeco[yi][xi] && cqFloor[yi] && cqFloor[yi][xi] && !cqHc(xi, yi) && !inCastle(xi, yi)) { cqDeco[yi][xi] = 'aCrat'; cqBgCell(xi, yi, 1); }
      if (e.w > 0 && e.w < SEC_HP && d < 30) { fxAdd(G, 'txt', e.x, e.y, '🧱 ' + e.w + '/' + SEC_HP); if (!atk) cqToast('🧱 Il muro si crepa! Un genio può tapparlo'); }
    }
    else if (e.k === 'breach') { ann(G, '🧱 BRECCIA NELLE MURA!', atk ? 'Dentro, al cortile!' + (G.ph <= 2 ? ' (+' + BONUS[1] + ' s)' : '') : 'Ritirata: difendete il cortile!', atk ? '#2a6a2a' : '#8a1a1a'); shake(G, 14); for (let i = 0; i < 4; i++) thud(0.5, 50 + i * 25); }
    else if (e.k === 'cthit') { fxAdd(G, 'wood', e.x, e.y); if (d < 16) thud(0.5 * (1 - d / 16), 160); }
    else if (e.k === 'ctdown') { fxAdd(G, 'wreck', e.x, e.y); fxAdd(G, 'boom', e.x, e.y); ann(G, '🪨 CATAPULTA DISTRUTTA!', atk ? 'Se ne monta un\'altra: ' + CT_RESP + ' s' : 'Bel colpo, balestrieri!', atk ? '#8a1a1a' : '#2a6a2a'); }
    else if (e.k === 'ctback') { if (atk) cqToast('🪨 Catapulta pronta all\'accampamento!'); }
    else if (e.k === 'balfire') { if (d < 18) { beep(170, 0.1, 0.05 * (1 - d / 18), 0, 'triangle'); thud(0.4 * (1 - d / 18), 240); } }
    else if (e.k === 'baldown') { fxAdd(G, 'wreck', e.x, e.y); if (!atk) ann(G, '🎯 BALESTRA DISTRUTTA!', 'Torna tra ' + BAL_RESP + ' s', '#8a1a1a'); else if (d < 30) cqToast('🎯 Balestra distrutta!'); }
    else if (e.k === 'quiv') { if (A === me) { fxAdd(G, 'txt', e.x, e.y, '🏹 +' + QV); beep(880, 0.05, 0.03); beep(1100, 0.05, 0.03, 0.06); } }
    else if (e.k === 'burning') { if (atk && d < 30) cqToast('🔥 Vogliono incendiare l\'ariete!'); }
    else if (e.k === 'ramfire') { ann(G, '🔥 L\'ARIETE BRUCIA!', atk ? 'Spegnetelo, presto!' : 'Ottima sortita!', atk ? '#8a1a1a' : '#2a6a2a'); if (d < 20) thud(0.5, 80); }
    else if (e.k === 'ramext') { if (atk) cqToast('💧 Fuoco spento: spingete!'); }
    else if (e.k === 'twdock') { ann(G, '🗼 LA TORRE È SOTTO LE MURA!', atk ? 'Salite e prendete il camminamento!' : 'Respingeteli sul camminamento!', atk ? '#2a6a2a' : '#8a1a1a'); bell(); if (d < 20) thud(0.7, 70); }
    else if (e.k === 'twhit') { fxAdd(G, 'wood', e.x, e.y); if (d < 16) thud(0.5 * (1 - d / 16), 150); }
    else if (e.k === 'twdown') { fxAdd(G, 'wreck', e.x, e.y); fxAdd(G, 'boom', e.x, e.y); ann(G, '🗼 TORRE DISTRUTTA!', atk ? 'Se ne monta un\'altra: ' + TW_RESP + ' s' : 'Bel lavoro!', atk ? '#8a1a1a' : '#2a6a2a'); }
    else if (e.k === 'twback') { if (atk) cqToast('🗼 Torre d\'assedio pronta all\'accampamento!'); }
    else if (e.k === 'wfix') { if (A === me) t = '🧱 Crepa tappata!'; }
    else if (e.k === 'mel') {   // colpo di spada o martello andato a segno
      fxAdd(G, 'hit', e.x, e.y);
      if (A === me) { G.hm = { x: e.x, y: e.y, z: zAt(e.x, e.y) + 1, t: performance.now() }; beep(1500, 0.04, 0.03); }
      if (d < 12) { const v = 1 - d / 12; clang(0.6 * v, e.w === 'n'); }
    }
    else if (e.k === 'parry') { fxAdd(G, 'txt', e.x, e.y, '🛡️ PARATA!'); fxAdd(G, 'spark', e.x, e.y); if (d < 12) clang(0.9 * (1 - d / 12)); if (A === me) beep(1400, 0.06, 0.03, 0.03); }
    else if (e.k === 'bhit') { fxAdd(G, e.d ? 'wreck' : 'wood', e.x, e.y); if (d < 12) thud(0.5 * (1 - d / 12), e.d ? 90 : 180); if (e.d && A === me) t = '🪓 Barricata distrutta!'; }
    else if (e.k === 'build') { fxAdd(G, 'dust', e.x, e.y); if (d < 12) { thud(0.4 * (1 - d / 12), 200); beep(330, 0.05, 0.03, 0.08, 'square'); } if (A === me) t = '🪵 Barricata piantata!'; }
    if (t) cqToast(t);
  }
  function horn() { beep(196, 0.6, 0.06, 0, 'sawtooth'); beep(262, 0.8, 0.05, 0.5, 'sawtooth'); }
  function bell() { for (let i = 0; i < 4; i++) { beep(660, 0.4, 0.04, i * 0.35, 'triangle'); beep(990, 0.25, 0.02, i * 0.35 + 0.02, 'sine'); } }
  function fanfare(ok) { const f = ok ? [523, 659, 784, 1047] : [392, 330, 294, 262]; f.forEach((v, i) => beep(v, 0.18, 0.05, i * 0.15, 'triangle')); }
  const twang = () => { beep(220, 0.06, 0.04, 0, 'triangle'); beep(140, 0.08, 0.03, 0.02, 'sine'); };
  const swish = () => { beep(900, 0.05, 0.015, 0, 'sawtooth'); beep(500, 0.07, 0.015, 0.03, 'sawtooth'); };
  const clang = (v, wood) => { if (wood) { thud(v, 150); beep(240, 0.06, 0.03 * v, 0, 'square'); } else { beep(1250, 0.09, 0.04 * v, 0, 'square'); beep(1870, 0.12, 0.025 * v, 0.01, 'triangle'); } };
  // piccoli effetti sulla mappa (colpi, schegge, polvere): solo da disegnare, su ogni telefono
  function fxAdd(G, k, x, y, t) { (G.fx = G.fx || []).push({ k, x, y, t, t0: performance.now() }); if (G.fx.length > 24) G.fx.shift(); }

  // ======================= AZIONI (pulsante grande) =======================
  const nearLever = (x, y) => Math.hypot(x - LEV.x - 0.5, y - LEV.y - 0.5) < 1.45;
  const nearOil = (x, y) => OILC.findIndex(o => Math.hypot(x - o.x - 0.5, y - o.y - 0.5) < 1.45);
  function action(G, c) {
    if (!c.alive || dead(G, c) || inIv(G) || c.cl) return null;
    const p = P(c), atk = isAtk(G, c), carry = G.ld.find(l => l.st === 1 && l.c === c.id), z = zoneAt(p.x, p.y);
    if (c.pu) return { k: c.pu.k, t: PUL[c.pu.k] || '…', on: false };
    if (atk) {
      if (carry) { const s = nearSpot(G, p.x, p.y); return s >= 0 ? { k: 'place', s, t: '🪜 Appoggia la scala', on: true } : { k: 'ldrop', t: '🪜 Lascia la scala', on: true }; }
      if (ramFire(G) && inRamBox(G.rm, p.x, p.y, 1.4) && !carry) return { k: 'ext', t: '💧 Spegni il fuoco!', on: true };
      if (twAlive(G) && !carry && !c.stn) {
        const T = G.tw;
        if (T.dk && z === 'out' && Math.hypot(p.x - twBack(T).x, p.y - twBack(T).y) < 1.3) return { k: 'twup', t: '🧗 Sali nella torre', on: true };
        if (T.dk && z === 'wall' && Math.hypot(p.x - twTop(T).x, p.y - twTop(T).y) < 1.3) return { k: 'twdn', t: '🧗 Scendi dalla torre', on: true };
        if (!T.dk && nearTw(G, c)) { if (T.drv === c.id) return { k: 'tdrive', t: '🛞 Lascia la torre', on: true }; if (T.drv < 0) return { k: 'tdrive', t: '🛞 Spingi la torre', on: true }; }
      }
      if (c.stn) return nearCt(G, c) ? { k: 'ctload', t: '🪨 Carica il sasso (' + G.ct.n + '/' + CT_N + ')', on: G.ct.n < CT_N } : { k: 'sdrop', t: '🪨 Lascia il sasso', on: true };
      if (ctAlive(G) && Math.hypot(p.x - STONES.x - 0.5, p.y - STONES.y - 0.5) < 1.7 && !carry) return { k: 'stone', t: '🪨 Prendi un sasso', on: true };
      if (nearCt(G, c) && !carry) { if (G.ct.drv === c.id) return { k: 'drive', t: '🛞 Lascia la catapulta', on: true }; if (G.ct.drv < 0) return { k: 'drive', t: '🛞 Spingi la catapulta', on: true }; }
      if (atGate(G) && inRamZone(G, p)) { const k = c === G.me && G.chg ? Math.min(1, (performance.now() - G.chg) / 1000 / CH_T) : chgK(G, c); return { k: 'ram', t: k > 0 ? '🐏 ' + Math.round(k * 100) + '% · lascia!' : '🐏 Tieni premuto: carica!', on: true }; }
      if (G.ph === 1 && !G.gopen && z === 'wall' && nearLever(p.x, p.y)) return { k: 'lever', t: '⚙️ Apri il portone!', on: true };
      const top = nearLadTop(G, p.x, p.y); if (top && z === 'wall') return { k: 'down', l: top, t: '🧗 Scendi', on: true };
      const js = z === 'wall' ? jumpAt(G, p.x, p.y) : -1; if (js >= 0) return { k: 'jump', s: js, t: '🪂 Salta giù (−1 ❤)', on: true };
      const foot = nearLadFoot(G, p.x, p.y); if (foot && z === 'out') return { k: 'climb', l: foot, t: '🧗 Sali!', on: true };
      if (G.ph === 1 && nearRack(p.x, p.y)) { const n = G.ld.filter(l => l.st === 0).length; return { k: 'take', t: n ? '🪜 Prendi una scala (' + n + ')' : '🪜 Scale finite', on: n > 0 }; }
      const gl = G.ph === 1 ? nearGroundLad(G, p.x, p.y) : null; if (gl) return { k: 'take', g: gl, t: '🪜 Raccogli la scala', on: true };
      return buildAct(G, c);
    }
    // porticina (solo chi difende) e sortite fuori: incendiare l'ariete, buttare giu' le scale dal basso
    if (Math.hypot(p.x - PORT.ix, p.y - PORT.iy) < 1.1 && z === 'in') return { k: 'post', t: '🚪 Esci dalla porticina', on: true };
    if (z === 'out') {
      if (Math.hypot(p.x - PORT.ox, p.y - PORT.oy) < 1.1) return { k: 'post', t: '🚪 Rientra dalla porticina', on: true };
      if (ramOn(G) && !ramFire(G) && inRamBox(G.rm, p.x, p.y, 1.4)) return { k: 'burn', t: '🔥 Incendia l\'ariete!', on: true };
      const lf = nearLadFoot(G, p.x, p.y, 1.3); if (lf) return { k: 'push', l: lf, t: '🤚 Butta giù la scala!', on: true };
    }
    if (G.ph === 1 && z === 'wall') { const o = nearOil(p.x, p.y); if (o >= 0) { const w = (G.oil[o] || 0) - G.time; return { k: 'oil', o, t: w > 0 ? '🔥 Olio tra ' + Math.ceil(w) + ' s' : '🔥 Versa l\'olio!', on: w <= 0 }; } }
    const top = nearLadTop(G, p.x, p.y, 1.45); if (top && z === 'wall') return { k: 'push', l: top, t: '🤚 Rovescia la scala!', on: true };
    if (clsOf(c) === 'n' && z === 'wall' && p.y > 48.8) { const si = SECS.findIndex(S => p.x >= S.x0 - 0.5 && p.x < S.x1 + 1.5); if (si >= 0 && G.wl[si] > 0 && G.wl[si] < SEC_HP) return { k: 'wfix', s: si, t: '🧱 Tappa la crepa (' + G.wl[si] + '/' + SEC_HP + ')', on: true }; }
    if (G.ph === 1 && !G.gopen && clsOf(c) === 'n' && nearFix(p.x, p.y)) return { k: 'fix', t: G.gh >= GATE_HP ? '🔧 Portone intatto' : '🔧 Ripara il portone', on: G.gh < GATE_HP };
    return buildAct(G, c);
  }
  // il genio (solo io: la casella davanti la so solo io) pianta una barricata
  function buildAct(G, c) {
    if (clsOf(c) !== 'n' || c !== G.me || G.ld.some(l => l.st === 1 && l.c === c.id)) return null;
    const [x, y] = frontCell(), w = (c.bwT || 0) - G.time;
    return { k: 'build', x, y, t: w > 0 ? '🪵 Barricata tra ' + Math.ceil(w) + ' s' : '🪵 Barricata', on: w <= 0 && buildOk(G, c, x, y) };
  }
  const nearFix = (x, y) => x > 27.3 && x < 32.7 && y > 46 && y < 50;   // dentro al portone, dalla parte del cortile
  function doAct(G, c, a) {
    if (a.k === 'build') { if (a.x != null) doBuild(G, c, a.x, a.y); return; }
    const p = P(c), x = action(G, c); if (!x || x.k !== a.k || !x.on) return;
    if (x.k === 'take') { const l = x.g || G.ld.find(l => l.st === 0); if (!l) return; l.st = 1; l.c = c.id; return; }
    if (x.k === 'ldrop') { const l = G.ld.find(l => l.st === 1 && l.c === c.id); if (l) dropLad(G, l, p.x, p.y); return; }
    if (x.k === 'place') { const l = G.ld.find(l => l.st === 1 && l.c === c.id); if (!l) return; l.st = 2; l.s = x.s; l.c = -1; l.pt = G.time; c.lp = (c.lp || 0) + 1; const S = MP().spots[x.s]; say(G, 'place', { a: c.id, x: S.fx, y: S.fy }); return; }
    if (x.k === 'climb') { const S = MP().spots[x.l.s]; c.cl = { s: x.l.s, d: 1, t0: G.time, T: CLIMB }; c.path = []; c.x = S.ax; c.y = S.ay; if (c === G.me) { cq.x = S.ax; cq.y = S.ay; } return; }
    if (x.k === 'down') { c.cl = { s: x.l.s, d: -1, t0: G.time, T: DOWN }; c.path = []; return; }
    if (x.k === 'jump') { const S = MP().spots[x.s]; tp(G, c, S.ax, S.ay); say(G, 'jump', { a: c.id, x: S.ax, y: S.ay }); hurt(G, c, 1, null, 'jump'); return; }
    if (x.k === 'push') { c.pu = { k: 'push', l: G.ld.indexOf(x.l), e: G.time + PUSH, x: p.x, y: p.y }; c.path = []; return; }
    if (x.k === 'lever') { c.pu = { k: 'lever', e: G.time + LEVER, x: p.x, y: p.y }; c.path = []; say(G, 'lever', { a: c.id }); return; }
    if (x.k === 'tdrive') { const T = G.tw; if (!twAlive(G) || T.dk) return; T.drv = T.drv === c.id ? -1 : T.drv < 0 ? c.id : T.drv; return; }
    if (['post', 'burn', 'ext', 'twup', 'twdn'].includes(x.k)) { c.pu = { k: x.k, e: G.time + PUT[x.k], x: p.x, y: p.y }; c.path = []; if (x.k === 'burn') say(G, 'burning', { a: c.id }); return; }
    if (x.k === 'drive') { const T = G.ct; if (!ctAlive(G)) return; T.drv = T.drv === c.id ? -1 : T.drv < 0 ? c.id : T.drv; return; }
    if (x.k === 'stone') { c.stn = 1; return; }
    if (x.k === 'sdrop') { c.stn = 0; return; }
    if (x.k === 'ctload') { if (c.stn && nearCt(G, c, CT_GRAB + 0.4) && G.ct.n < CT_N) { G.ct.n++; c.stn = 0; c.ldN = (c.ldN || 0) + 1; } return; }
    if (x.k === 'wfix') { c.pu = { k: 'wfix', s: x.s, e: G.time + WFIX_T, x: p.x, y: p.y }; c.path = []; return; }
    if (x.k === 'fix') { c.pu = { k: 'fix', e: G.time + 999, x: p.x, y: p.y }; c.path = []; return; }
    if (x.k === 'oil') { G.oil[x.o] = G.time + (clsOf(c) === 'n' ? OIL_TG : OIL_T); G.burn = { t0: G.time, e: G.time + BURN, hit: [] }; c.oN = (c.oN || 0) + 1; say(G, 'oil', { a: c.id, x: 29.5, y: 53 }); return; }
  }
  function holdTick(G) {
    for (const c of G.chars) {
      if (c.cl && G.time >= c.cl.t0 + c.cl.T) { const S = MP().spots[c.cl.s], up = c.cl.d > 0; c.cl = null; if (up) { tp(G, c, S.tx, S.ty); c.up = (c.up || 0) + 1; } else tp(G, c, S.ax, S.ay); }
      if (c.cl && !ladAt(G, c.cl.s)) c.cl = null;
      if (c.pu) {
        const p = P(c);
        if (Math.hypot(p.x - c.pu.x, p.y - c.pu.y) > 0.35 || dead(G, c)) { c.pu = null; continue; }
        if (c.pu.k === 'push') { const l = G.ld[c.pu.l]; if (!l || l.st !== 2) { c.pu = null; continue; } if (G.time >= c.pu.e) { c.pu = null; fall(G, l, c); } }
        else if (['post', 'burn', 'ext', 'twup', 'twdn'].includes(c.pu.k)) {
          const k = c.pu.k; if ((k === 'twup' || k === 'twdn') && !(twAlive(G) && G.tw.dk)) { c.pu = null; continue; } if (k === 'burn' && (!ramOn(G) || ramFire(G))) { c.pu = null; continue; } if (k === 'ext' && !ramFire(G)) { c.pu = null; continue; }
          if (G.time < c.pu.e) continue; c.pu = null;
          if (k === 'post') { const out = zoneAt(P(c).x, P(c).y) === 'out'; tp(G, c, out ? PORT.ix : PORT.ox, out ? PORT.iy : PORT.oy); c.poN = (c.poN || 0) + (out ? 0 : 1); }
          else if (k === 'burn') { G.rm.fire = G.time + RAM_FIRE; c.brN = (c.brN || 0) + 1; say(G, 'ramfire', { a: c.id, x: RAM_X, y: r1(G.rm.y) }); }
          else if (k === 'ext') { G.rm.fire = 0; say(G, 'ramext', { a: c.id }); }
          else if (k === 'twup') { const t = twTop(G.tw); tp(G, c, t.x, t.y); c.twU = (c.twU || 0) + 1; }
          else if (k === 'twdn') { const t = twBack(G.tw); tp(G, c, t.x, t.y); }
        }
        else if (c.pu.k === 'lever') { if (G.gopen || G.ph !== 1) { c.pu = null; continue; } if (G.time >= c.pu.e) { c.pu = null; c.lvN = (c.lvN || 0) + 1; openGate(G, c); } }
        else if (c.pu.k === 'wfix') { const w = G.wl[c.pu.s]; if (!(w > 0 && w < SEC_HP)) { c.pu = null; continue; } if (G.time >= c.pu.e) { const si = c.pu.s; G.wl[si]--; c.wfN = (c.wfN || 0) + 1; c.pu = null; say(G, 'wfix', { a: c.id, x: SECS[si].cx, y: 50.5 }); } }
        else if (c.pu.k === 'fix') { if (G.gopen || G.gh >= GATE_HP || G.ph !== 1) c.pu = null; }
      }
    }
  }
  function openGate(G, by) { if (G.gopen) return; G.gopen = true; G.gh = 0; if (G.ph !== 1) return; say(G, 'gate', { a: by ? by.id : -1 }); nextPhase(G); }   // dopo una breccia il portone non fa avanzare di nuovo la fase
  function nextPhase(G) {
    G.ph++; if (G.ph <= 3) { G.lim += BONUS[G.ph - 1]; G.zp = 0; G.zc = 0; }
    for (const c of G.chars) if (c.bot) c.post = null;
  }

  // ======================= ARIETE, OLIO, ZONE (host) =======================
  // L'ARIETE e' SOLIDO con la sua sagoma vera (M.blk: rettangolo RAM_HX x da RAM_F davanti a RAM_B dietro, senza scatti) e si SPINGE COL CORPO:
  // chi gli sta attaccato dietro (inRamZone) lo spinge, piu' siete piu' va. Le caselle sotto (ramCells, 'soft') servono solo ai percorsi dei computer.
  // Al portone si CARICA il colpo: tieni premuto (c.rc = quando ho cominciato), lasci = colpo; chi lascia insieme (entro RAM_WIN) fa il colpo di squadra.
  const RAM_HX = 1.2, RAM_F = 1.9, RAM_B = 1.95;
  const ramOn = G => G.ph === 1 && !G.gopen && !!G.rm;
  const ramBack = R => R.y + RAM_B;
  const inRamBox = (R, x, y, m = 0) => Math.abs(x - RAM_X) < RAM_HX + m && y > R.y - RAM_F - m && y < R.y + RAM_B + m;
  const ramCells = R => { const L = []; for (let y = Math.ceil(R.y - RAM_F); y < Math.floor(R.y + RAM_B); y++) for (let x = 28; x <= 30; x++) L.push([x, y]); return L; };
  const inRamZone = (G, p) => { const Yb = ramBack(G.rm); return p.x > 27.6 && p.x < 31.4 && p.y >= Yb - 0.15 && p.y < Yb + 1.25; };
  const atGate = G => G.ph === 1 && !G.gopen && G.rm.y <= RAM_Y1 + 0.05;
  const chgK = (G, c) => c.rc ? Math.min(1, (G.time - c.rc) / CH_T) : 0;
  function ramTick(G, dt) {
    if (G.ph !== 1 || G.gopen) return;
    const R = G.rm, push = G.chars.filter(c => c.alive && !dead(G, c) && isAtk(G, c) && !c.cl && inRamZone(G, P(c)));
    R.n = push.reduce((s, c) => s + (clsOf(c) === 'n' ? 2 : 1), 0); for (const c of push) c.rmT = (c.rmT || 0) + dt;   // il genio spinge per due
    for (const c of G.chars) if (c.rc && (!push.includes(c) || !atGate(G))) c.rc = 0;   // uscito da dietro l'ariete: carica persa
    R.pl = push.reduce((m, c) => Math.max(m, chgK(G, c)), 0);
    // chi ci e' finito dentro (i computer seguono il loro percorso e non sbattono): spostato di lato
    for (const c of G.chars) { if (!c.alive || dead(G, c) || c.cl) continue; const p = P(c); if (inRamBox(R, p.x, p.y)) tp(G, c, p.x < RAM_X ? RAM_X - RAM_HX - 0.4 : RAM_X + RAM_HX + 0.4, p.y); }
    for (const c of G.chars) if (c.bot && c.alive && !dead(G, c) && !c.cl && inRamBox(R, c.x, c.y, 0.31) && c.y > R.y) c.y = R.y + RAM_B + 0.31;   // i computer dietro: attaccati alla schiena, non dentro
    if (ramFire(G)) { R.pl = 0; for (const c of push) c.rc = 0; R.win = null; return; }   // in fiamme: non va avanti e non colpisce finche' non lo spengono
    if (R.y > RAM_Y1) {
      if (!R.n) return;
      R.y = Math.max(RAM_Y1, R.y - (0.25 + 0.22 * Math.min(4, R.n)) * dt);
      // chi e' davanti all'ariete viene spostato di lato (non ci finisce dentro)
      for (const c of G.chars) { if (!c.alive || dead(G, c) || c.cl) continue; const p = P(c); if (inRamBox(R, p.x, p.y, 0.28) && p.y < R.y) tp(G, c, p.x < RAM_X ? RAM_X - RAM_HX - 0.4 : RAM_X + RAM_HX + 0.4, p.y); }
      if (R.y === RAM_Y1) say(G, 'ramgate', {});
      return;
    }
    if (R.win && G.time >= R.win.e) {   // il colpo: piu' carica = piu' danno, in squadra di piu'
      const W2 = R.win; R.win = null; R.cd = G.time + RAM_CD; R.hit = G.time; const before = G.gh;
      G.gh = Math.max(0, G.gh - (2 + 6 * W2.s * (W2.n > 1 ? 1.2 : 1)));
      say(G, 'ram', { x: RAM_X, y: R.y - 1.5, n: W2.n, s: r1(W2.s) });
      if (before > GATE_HP / 2 && G.gh <= GATE_HP / 2) say(G, 'gate50', {});
      if (G.gh <= 0) openGate(G, byId(G, W2.ids[0]));
    }
  }
  function ramCharge(G, c) { if (!atGate(G) || c.rc || !isAtk(G, c) || dead(G, c) || !inRamZone(G, P(c))) return; c.rc = G.time; }
  function ramRelease(G, c, p) {
    if (!c.rc) return; const mx = chgK(G, c); c.rc = 0;
    if (!atGate(G) || !inRamZone(G, P(c))) return;
    const k = p != null ? Math.max(0, Math.min(mx + 0.25, 1, p)) : mx; if (k < 0.12) return;
    const R = G.rm; c.rhN = (c.rhN || 0) + 1;
    if (R.win) { R.win.s += k; R.win.n++; R.win.ids.push(c.id); } else R.win = { e: Math.max(G.time, R.cd || 0) + RAM_WIN, s: k, n: 1, ids: [c.id] };
  }
  // il genio ripara il portone da dentro mentre l'ariete lo colpisce (piu' genii, un po' piu' veloce)
  function fixTick(G, dt) {
    if (G.ph !== 1 || G.gopen) return;
    const F = G.chars.filter(c => c.pu && c.pu.k === 'fix' && !dead(G, c)); if (!F.length) return;
    G.gh = Math.min(GATE_HP, G.gh + (FIX + FIX2 * (F.length - 1)) * dt); for (const c of F) c.fxT = (c.fxT || 0) + dt;
  }
  // ======================= LA CATAPULTA, I SASSI, LE BRECCE, LE BALESTRE (host) =======================
  // CATAPULTA (G.ct, una sola, di chi attacca): si SPINGE COL CORPO (pulsante '🛞 Spingi': chi la guida la spinge davanti a se', piu' compagni vicino = piu' veloce),
  // si mira come l'arco (vicino a lei il pulsante dell'arma diventa 🪨), ha CT_N sassi: si ricaricano portandoli a mano dalla catasta dell'accampamento.
  // Il sasso fa danno ad area, spacca merli e barricate; SEC_HP sassi nello stesso TRATTO di muro = BRECCIA (si passa: vale come il portone caduto).
  // BALESTRE A TORRETTA (G.bl) sulle torri d'angolo: chi difende tira dardi pesanti (2 cuori, non li para lo scudo) che rompono la catapulta (CT_HP).
  const CT_HP = 9, CT_N = 3, CT_RL = 6, CT_RLG = 3.5, CT_RMIN = 5, CT_RMAX = 22, CT_RESP = 25, CT_GRAB = 2.0, CT_DIST = 1.6, CT_HB = 0.92;
  const ROCK_R = 1.6, SEC_HP = 5, WFIX_T = 3;
  const BAL_HP = 3, BAL_RL = 5, BAL_RMAX = 30, BAL_DMG = 3, BAL_RESP = 30;
  const CT0 = { x: 41, y: 74 }, CT_SPOTS = [[20.5, 63.5], [39.5, 63.5]];
  const SECS = [7, 11, 15, 19, 37, 41, 45, 49].map(x0 => ({ x0, x1: x0 + 3, cx: x0 + 2 }));   // tratti del muro sud (4 caselle), escluse torri e portone
  const newCt = () => ({ x: CT0.x, y: CT0.y, hp: CT_HP, n: CT_N, rl: 0, dn: 0, drv: -1, arm: -9 });
  const ctAlive = G => G.ct && !G.ct.dn;
  const secAt = (x, y) => y > 48.5 && y < 52.9 ? SECS.findIndex(S => x >= S.x0 && x < S.x1 + 1) : -1;
  function ctValid(G, x, y) {   // la catapulta (2x2 caselle) sta solo fuori, in piano, su caselle libere
    for (let cy = Math.floor(y - 0.8); cy <= Math.floor(y + 0.8); cy++) for (let cx = Math.floor(x - 0.8); cx <= Math.floor(x + 0.8); cx++) {
      if (!cqFloor[cy] || !cqFloor[cy][cx] || cqHc(cx, cy) || inCastle(cx, cy) || cy < 55 || cy > 82) return false;
      const s = cqSolid[cy][cx]; if (s && s.prop !== 'aCatS') return false;
    }
    return !(ramOn(G) && Math.abs(x - RAM_X) < RAM_HX + 0.8 && y > G.rm.y - RAM_F - 0.8 && y < G.rm.y + RAM_B + 0.8);
  }
  const inCtBox = (T, x, y, m = 0) => Math.abs(x - T.x) < CT_HB + m && Math.abs(y - T.y) < CT_HB + m;
  const nearCt = (G, c, r = CT_GRAB) => ctAlive(G) && Math.hypot(P(c).x - G.ct.x, P(c).y - G.ct.y) < r;
  const balOf = (G, c) => { if (isAtk(G, c) || zoneAt(P(c).x, P(c).y) !== 'wall') return -1; const p = P(c); return BAL.findIndex((B, i) => Math.hypot(p.x - B.ux, p.y - B.uy) < 1.3 && G.bl && G.bl[i] && !G.bl[i].dn); };
  // la macchina che uso col pulsante dell'arma: catapulta (chi attacca, vicino, senza guidarla ne' portare roba) o balestra (chi difende, al suo posto)
  function machOf(G, c) {
    if (!c || dead(G, c) || c.cl || c.pu || inIv(G) || !G.ld || G.ld.some(l => l.st === 1 && l.c === c.id) || c.stn) return null;
    if (isAtk(G, c)) { if (nearCt(G, c) && G.ct.drv !== c.id) return { k: 'c', o: { x: G.ct.x, y: G.ct.y - 0.3, z: 2.2 }, rmin: CT_RMIN, rmax: CT_RMAX }; return null; }
    const i = balOf(G, c); if (i < 0) return null; const B = BAL[i]; return { k: 'b', i, o: { x: B.x + 0.5, y: B.y + 0.5, z: TZ * HB + 1.0 }, rmin: 3, rmax: BAL_RMAX };
  }
  const machRl = (G, m) => m.k === 'c' ? G.ct.rl : G.bl[m.i].rl;
  const machReady = (G, m) => m.k === 'c' ? G.ct.n > 0 && G.ct.rl <= G.time : G.bl[m.i].rl <= G.time;
  function fireCt(G, c, x, y) {
    const T = G.ct; if (!ctAlive(G) || !nearCt(G, c, CT_GRAB + 0.5) || T.drv === c.id || T.n <= 0 || T.rl > G.time + 0.1) return;
    const d0 = Math.hypot(x - T.x, y - T.y); if (d0 < CT_RMIN - 0.5 || d0 > CT_RMAX + 0.5) return;
    const [x1, y1] = aimEnd(T.x, T.y, x - T.x, y - T.y, d0, c.bot ? 1.1 : 0.6);
    T.n--; T.rl = G.time + (clsOf(c) === 'n' ? CT_RLG : CT_RL); T.arm = G.time; c.ctN = (c.ctN || 0) + 1;
    const z0 = 2.2, z1 = zAt(x1, y1) + 0.2, d = Math.hypot(x1 - T.x, y1 - T.y);
    G.rk.push({ id: ++G.rkN, o: c.id, t: c.t, x0: T.x, y0: T.y - 0.3, z0, x1, y1, z1, t0: G.time + 0.25, d: 1.1 + d * 0.05, pk: 2.4 + 0.22 * d });
    say(G, 'ctfire', { a: c.id, x: r1(T.x), y: r1(T.y) });
  }
  function fireBal(G, c, i, x, y) {
    const B = BAL[i], S = G.bl && G.bl[i]; if (!S || S.dn || S.rl > G.time + 0.1 || balOf(G, c) !== i) return;
    const ox = B.x + 0.5, oy = B.y + 0.5, d0 = Math.hypot(x - ox, y - oy); if (d0 < 2 || d0 > BAL_RMAX + 0.5) return;
    const [x1, y1] = aimEnd(ox, oy, x - ox, y - oy, d0, c.bot ? 0.45 : 0.3);   // la balestra e' precisa (e' il suo bello)
    S.rl = G.time + BAL_RL; S.a = Math.atan2(y1 - oy, x1 - ox); c.blN = (c.blN || 0) + 1;
    const z0 = TZ * HB + 1.0, z1 = zAt(x1, y1) + 0.7, dd = Math.hypot(x1 - ox, y1 - oy), base = 0.12 + 0.02 * dd;
    G.ar.push({ id: ++G.arN, o: c.id, t: c.t, q: 0, k: 'b', x0: ox, y0: oy, z0, x1, y1, z1, t0: G.time, d: 0.12 + dd / 45, pk: arcPk(ox, oy, z0, x1, y1, z1, base), te: 0, hit: -1 });
    say(G, 'balfire', { a: c.id, x: ox, y: oy });
  }
  function ctTick(G, dt) {
    const T = G.ct; if (!T) return;
    for (const S of G.bl) if (S.dn && G.time >= S.dn) { S.dn = 0; S.hp = BAL_HP; }
    if (T.dn) { if (G.time >= T.dn) { Object.assign(T, newCt()); say(G, 'ctback', { x: T.x, y: T.y }); } return; }
    const d = T.drv >= 0 ? byId(G, T.drv) : null;
    if (T.drv >= 0 && (!d || !d.alive || dead(G, d) || !isAtk(G, d) || d.cl || d.stn || inIv(G) || Math.hypot(P(d).x - T.x, P(d).y - T.y) > 2.8)) T.drv = -1;
    if (d && T.drv >= 0) {
      const p = P(d), vx = T.x - p.x, vy = T.y - p.y, m = Math.hypot(vx, vy) || 1; d.ctT = (d.ctT || 0) + dt;
      if (m < CT_DIST) { const nx = p.x + vx / m * CT_DIST, ny = p.y + vy / m * CT_DIST; if (ctValid(G, nx, ny)) { T.x = nx; T.y = ny; } else if (ctValid(G, nx, T.y)) T.x = nx; else if (ctValid(G, T.x, ny)) T.y = ny; }   // contro un ostacolo scivola di lato
    }
    for (const c of G.chars) { if (!c.alive || dead(G, c) || c.cl || c.id === T.drv) continue; const p = P(c); if (inCtBox(T, p.x, p.y)) { const a = Math.atan2(p.y - T.y, p.x - T.x); tp(G, c, T.x + Math.cos(a) * (CT_HB + 0.45), T.y + Math.sin(a) * (CT_HB + 0.45)); } }
  }
  function ctHurt(G, n, by) {
    const T = G.ct; if (!ctAlive(G)) return; T.hp -= n;
    if (T.hp <= 0) { T.hp = 0; T.dn = G.time + CT_RESP; T.drv = -1; if (by) by.ctK = (by.ctK || 0) + 1; say(G, 'ctdown', { a: by ? by.id : -1, x: r1(T.x), y: r1(T.y) }); }
    else say(G, 'cthit', { x: r1(T.x), y: r1(T.y) });
  }
  // il sasso arriva: danno ad area ai nemici, barricate e merli rotti, crepa nel tratto di muro (e breccia), balestra colpita
  function rkTick(G) {
    for (const r of G.rk) {
      if (r.te || G.time < r.t0 + r.d) continue; r.te = G.time;
      const by = byId(G, r.o), x = r.x1, y = r.y1;
      for (const c of G.chars) { if (!c.alive || dead(G, c) || c.t === r.t || safe(G, c)) continue; const q = xyOf(G, c), dd = Math.hypot(q.x - x, q.y - y); if (dd < ROCK_R && Math.abs(bodyZ(G, c) - (r.z1 - 0.2)) < 1.6) hurt(G, c, dd < 0.9 ? 2 : 1, by, 'rock'); }
      G.bw = G.bw.filter(b => b.t === r.t || Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y) > 1.4);
      let mb = 0; for (let yy = Math.floor(y) - 1; yy <= Math.floor(y) + 1; yy++) for (let xx = Math.floor(x) - 1; xx <= Math.floor(x) + 1; xx++) { const s = cqSolid[yy] && cqSolid[yy][xx]; if (s && s.prop === 'aMerl' && mb < 2 && Math.hypot(xx + 0.5 - x, yy + 0.5 - y) < 1.25 && !G.mb.includes(xx + ',' + yy)) { G.mb.push(xx + ',' + yy); mb++; } }
      const si = secAt(x, y); let wall = 0;
      if (si >= 0 && G.wl[si] < SEC_HP) { G.wl[si]++; wall = G.wl[si]; if (by) by.wlN = (by.wlN || 0) + 1; }
      BAL.forEach((B, i) => { const S = G.bl[i]; if (!S.dn && Math.hypot(B.x + 0.5 - x, B.y + 0.5 - y) < 1.4) { S.hp -= 2; if (S.hp <= 0) { S.dn = G.time + BAL_RESP; say(G, 'baldown', { i, x: B.x + 0.5, y: B.y + 0.5 }); } } });
      say(G, 'rock', { a: r.o, x: r1(x), y: r1(y), w: wall, s: si });
      if (wall >= SEC_HP) { say(G, 'breach', { a: r.o, s: si, x: SECS[si].cx, y: 51 }); if (G.ph === 1 && !G.gopen) nextPhase(G); }
    }
    G.rk = G.rk.filter(r => !r.te || G.time - r.te < 1);
  }
  // ---- TORRE D'ASSEDIO (G.tw) ----
  const twAlive = G => G.tw && !G.tw.dn;
  const inTwBox = (T, x, y, m = 0) => Math.abs(x - T.x) < TW_HB + m && Math.abs(y - T.y) < TW_HB + m;
  function twValid(G, x, y) {
    for (let cy = Math.floor(y - 0.9); cy <= Math.floor(y + 0.9); cy++) for (let cx = Math.floor(x - 0.9); cx <= Math.floor(x + 0.9); cx++) {
      if (!cqFloor[cy] || !cqFloor[cy][cx] || cqHc(cx, cy) || inCastle(cx, cy) || cy < 53 || cy > 82) return false;
      const s = cqSolid[cy][cx]; if (s && s.prop !== 'aTowS') return false;
    }
    if (ramOn(G) && Math.abs(x - RAM_X) < RAM_HX + 1.1 && y > G.rm.y - RAM_F - 1.1 && y < G.rm.y + RAM_B + 1.1) return false;
    return !(ctAlive(G) && Math.hypot(x - G.ct.x, y - G.ct.y) < 2.1);
  }
  function newTw(G) {   // all'accampamento: la prima posizione buona vicino a TW0
    for (let r = 0; r < 6; r++) for (let a = 0; a < 8; a++) { const x = TW0.x + Math.cos(a * 0.785) * r, y = TW0.y + Math.sin(a * 0.785) * r; if (twValid(G, x, y)) return { x, y, hp: TW_HP, drv: -1, dk: 0, dn: 0 }; }
    return { x: TW0.x, y: TW0.y, hp: TW_HP, drv: -1, dk: 0, dn: 0 };
  }
  const twBack = T => ({ x: T.x, y: T.y + TW_HB + 0.45 });
  const twTop = T => { const D = DOCKS[T.dk - 1]; return { x: D.x, y: 50.5 }; };
  const nearTw = (G, c, r = 2.5) => twAlive(G) && Math.hypot(P(c).x - G.tw.x, P(c).y - G.tw.y) < r;
  function twTick(G, dt) {
    const T = G.tw; if (!T) return;
    if (T.dn) { if (G.time >= T.dn) { Object.assign(T, newTw(G)); say(G, 'twback', {}); } return; }
    const d = T.drv >= 0 ? byId(G, T.drv) : null;
    if (T.drv >= 0 && (!d || !d.alive || dead(G, d) || !isAtk(G, d) || d.cl || d.stn || inIv(G) || T.dk || Math.hypot(P(d).x - T.x, P(d).y - T.y) > 3)) T.drv = -1;
    if (d && T.drv >= 0) {
      const p = P(d), vx = T.x - p.x, vy = T.y - p.y, m = Math.hypot(vx, vy) || 1; d.twT = (d.twT || 0) + dt;
      if (m < TW_DIST) { const nx = p.x + vx / m * TW_DIST, ny = p.y + vy / m * TW_DIST; if (twValid(G, nx, ny)) { T.x = nx; T.y = ny; } else if (twValid(G, nx, T.y)) T.x = nx; else if (twValid(G, T.x, ny)) T.y = ny; }
      const di = DOCKS.findIndex(D => Math.hypot(D.x - T.x, D.y - T.y) < 0.9);
      if (di >= 0) { T.x = DOCKS[di].x; T.y = DOCKS[di].y; T.dk = di + 1; T.drv = -1; say(G, 'twdock', { a: d.id, x: T.x, y: T.y - 2 }); }
    }
    for (const c of G.chars) { if (!c.alive || dead(G, c) || c.cl || c.id === T.drv) continue; const p = P(c); if (inTwBox(T, p.x, p.y)) { const a = Math.atan2(p.y - T.y, p.x - T.x); tp(G, c, T.x + Math.cos(a) * (TW_HB + 0.5), T.y + Math.sin(a) * (TW_HB + 0.5)); } }
  }
  function twHurt(G, n, by) {
    const T = G.tw; if (!twAlive(G)) return; T.hp -= n;
    if (T.hp <= 0) { T.hp = 0; T.dn = G.time + TW_RESP; T.drv = -1; T.dk = 0; if (by) by.twK = (by.twK || 0) + 1; say(G, 'twdown', { a: by ? by.id : -1, x: r1(T.x), y: r1(T.y) }); }
    else say(G, 'twhit', { x: r1(T.x), y: r1(T.y) });
  }
  // ---- FARETRA: vicino a una cesta si riempie ----
  function quivTick(G) {
    for (const c of G.chars) { if (!c.alive || dead(G, c) || clsOf(c) !== 'a' || (c.q != null && c.q >= QV)) continue; const p = P(c); if (QUIV.some(([x, y]) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 1.45 && Math.abs(cqHc(x, y) - hzAt(p.x, p.y)) < 1)) { c.q = QV; say(G, 'quiv', { a: c.id, x: r1(p.x), y: r1(p.y) }); } }
  }
  const nearQuiv = (x, y) => { let b = null, bd = 1e9; for (const [qx, qy] of QUIV) { const d = Math.hypot(qx + 0.5 - x, qy + 0.5 - y); if (d < bd) { bd = d; b = [qx + 0.5, qy + 0.5]; } } return b; };
  const ramFire = G => G.rm && (G.rm.fire || 0) > G.time;
  const inBurn = (x, y) => x > 27.2 && x < 32.8 && y > 51.6 && y < 56.2;
  function oilTick(G) {
    const B = G.burn; if (!B || G.time > B.e) return;
    for (const c of G.chars) { if (!c.alive || dead(G, c) || !isAtk(G, c) || B.hit.includes(c.id)) continue; const p = P(c); if (inBurn(p.x, p.y) && !c.cl) { B.hit.push(c.id); hurt(G, c, 2, null, 'oil'); } }
  }
  function zoneTick(G, dt) {
    if (G.ph < 2 || G.ph > 3) return;
    const Z = G.ph === 2 ? Z2 : Z3, inZ = c => { const p = P(c); return c.alive && !dead(G, c) && !c.cl && Math.hypot(p.x - Z.x, p.y - Z.y) < Z.r && zoneAt(p.x, p.y) !== 'wall'; };
    const a = G.chars.filter(c => isAtk(G, c) && inZ(c)).length, d = G.chars.filter(c => !isAtk(G, c) && inZ(c)).length;
    G.za = a; G.zd = d;
    if (a && d) { if (!G.zc) { G.zc = 1; say(G, 'cont', { z: G.ph }); } return; }
    if (a) { G.zp = Math.min(1, G.zp + dt / Z.t * (1 + 0.35 * (Math.min(4, a) - 1))); for (const c of G.chars) if (isAtk(G, c) && inZ(c)) c.zt = (c.zt || 0) + dt; }
    else G.zp = Math.max(0, G.zp - dt * 0.025);
    if (G.zp >= 1) {
      if (G.ph === 2) { say(G, 'zone', {}); nextPhase(G); }
      else { const w = G.chars.find(c => isAtk(G, c) && inZ(c)); if (w) w.cap = (w.cap || 0) + 1; say(G, 'win', { a: w ? w.id : -1 }); G.ph = 4; endHalf(G, true); }
    }
  }
  // quanto e' arrivato lontano chi attacca (per lo spareggio): 0-100 portone (ariete + colpi), 100-200 cortile, 200-300 trono
  const score = G => G.ph >= 4 ? 300 : G.ph === 1 ? Math.max(Math.round(90 * Math.max(0, ...(G.wl || [0])) / SEC_HP), Math.round(25 * (RAM_Y0 - G.rm.y) / (RAM_Y0 - RAM_Y1) + 75 * (GATE_HP - G.gh) / GATE_HP)) : Math.round((G.ph - 1) * 100 + 100 * G.zp);
  const scoreTxt = s => s >= 300 ? 'castello conquistato' : s >= 200 ? 'sala del trono ' + (s - 200) + '%' : s >= 100 ? 'cortile ' + (s - 100) + '%' : 'portone ' + s + '%';

  // ======================= I TEMPI =======================
  function setupHalf(G) {
    G.hs = G.time; G.ar = []; G.bodies = []; G.ph = 1; G.lim = G.opt.time || 240; G.gh = GATE_HP; G.gopen = false; G.zp = 0; G.zc = 0; G.za = G.zd = 0;
    G.rm = { y: RAM_Y0, n: 0, nx: 0, hit: -9, pl: 0, win: null, cd: 0 }; G.oil = [0, 0]; G.burn = null; G.best = G.best || [0, 0];
    G.ld = []; for (let i = 0; i < NLAD; i++) G.ld.push({ st: 0, c: -1, s: -1, x: 0, y: 0 });
    G.bw = []; G.bwN = G.bwN || 0; G.gopen = false;
    G.ct = newCt(); G.bl = BAL.map(() => ({ hp: BAL_HP, dn: 0, rl: 0, a: Math.PI / 2 })); G.rk = []; G.rkN = G.rkN || 0; G.wl = SECS.map(() => 0); G.mb = [];
    for (const c of G.chars) { c.stn = 0; c.q = QV; }
    G.tw = newTw(G);
    syncMap(G);   // l'ariete solido subito: nessuno ricompare dentro di lui
    // i personaggi del computer: compito e classe (chi attacca: guerriero e genio all'ariete, guerriero con la scala, arcieri; chi difende: genio all'olio, arcieri, genio al portone, guerriero)
    const A = G.chars.filter(c => isAtk(G, c) && c.bot), D = G.chars.filter(c => !isAtk(G, c) && c.bot);
    const RA = [['ram', 'g'], ['ram', 'n'], ['lad', 'g'], ['cat', 'a'], ['arc', 'a'], ['ram', 'g'], ['arc', 'a'], ['lad', 'n']], RD = [['oil', 'n'], ['bal', 'a'], ['wal', 'a'], ['fix', 'n'], ['wal', 'g'], ['bal', 'a'], ['wal', 'g'], ['wal', 'a']];
    A.forEach((c, i) => { [c.role, c.cls] = RA[i % RA.length]; c.ncls = null; });
    D.forEach((c, i) => { [c.role, c.cls] = RD[i % RD.length]; c.ncls = null; });
    for (const c of G.chars) { if (CL[c.ncls]) c.cls = c.ncls; c.hp = maxHp(c); c.dn = 0; c.sf = 0; c.cl = null; c.pu = null; c.sd = 0; c.rc = 0; c.rl = 0; c.bwT = 0; c.post = null; c.sp = null; const p = baseSpawn(G, c); tp(G, c, p.x, p.y); }
  }
  function endHalf(G, done) {
    const t = atkT(G); G.res[G.half - 1] = { done: !!done, t: hT(G), s: score(G) }; G.best[t] = score(G);
    if (G.half === 1) { G.half = 2; G.iv = G.time + IV; say(G, 'half', {}); return; }
    MODE.finish(G);
  }

  // ======================= I PERSONAGGI DEL COMPUTER =======================
  function go(c, x, y) { if (c.goal && Math.hypot(c.goal[0] - x, c.goal[1] - y) < 0.3 && c.path && c.path.length) return; c.path = cqPath(c.x, c.y, x, y); if (!c.path.length && Math.hypot(c.x - x, c.y - y) < 1.2 && cqCellFree(Math.floor(x), Math.floor(y))) c.path = [[x, y]]; c.goal = [x, y]; }
  const enemies = (G, c) => G.chars.filter(e => e.alive && e.t !== c.t && !dead(G, e));
  function clear(G, x0, y0, z0, x1, y1, z1) {
    const d0 = Math.hypot(x1 - x0, y1 - y0), pk = arcPk(x0, y0, z0, x1, y1, z1), n = Math.max(2, Math.ceil(d0 / 0.3));
    for (let i = 1; i < n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, z = z0 + (z1 - z0) * u + 4 * pk * u * (1 - u); if (u > 0.06 && z < topAt(Math.floor(x), Math.floor(y))) return false; }
    return true;
  }
  const canShoot = (G, c) => clsOf(c) === 'a' && !dead(G, c) && !c.pu && !c.stn && (c.q == null || c.q > 0) && !inIv(G) && !G.ld.some(l => l.st === 1 && l.c === c.id);
  function botShoot(G, c) {
    if ((c.rl || 0) > G.time || c.cl || !canShoot(G, c)) return;
    const p = P(c), z0 = bodyZ(G, c) + 1.25; let best = null, bs = 1e9;
    for (const e of enemies(G, c)) {
      if (safe(G, e)) continue; const q = e.cl ? (() => { const v = clXY(G, e); return { x: v[0], y: v[1] }; })() : P(e), d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d > RMAX - 0.5 || d < 1) continue; if (G.lit === 'n' && !litFor(G, q.x, q.y) && d > 6) continue;
      if (!clear(G, p.x, p.y, z0, q.x, q.y, bodyZ(G, e) + 0.9)) continue;
      const s = d + (e.cl ? -4 : 0) + (e.pu ? -5 : 0) + (G.ph === 1 && Math.abs(q.x - RAM_X) < 2 && Math.abs(q.y - G.rm.y) < 3 ? -3 : 0); if (s < bs) { bs = s; best = [e, q, d]; }
    }
    if (!best) return;
    const [e, q, d] = best, vx = (q.x - (e.lx || q.x)) / 0.4, vy = (q.y - (e.ly || q.y)) / 0.4, tf = 0.16 + d / 15;
    const tx = q.x + vx * tf * 0.8, ty = q.y + vy * tf * 0.8, [x1, y1] = aimEnd(p.x, p.y, tx - p.x, ty - p.y, Math.hypot(tx - p.x, ty - p.y), 1.3);
    mkArrow(G, c, x1, y1);
  }
  // guerriero e genio del computer: colpiscono chi e' a portata; il guerriero alza lo scudo se un arciere lo tiene sotto tiro
  function botMelee(G, c) {
    if (!canHit(G, c)) { if (c.sd && c.pu) c.sd = 0; return; }
    const k = clsOf(c), p = P(c), z = bodyZ(G, c), R = (k === 'g' ? SW_R : HM_R) * 0.92;
    const tgt = enemies(G, c).some(e => { const q = xyOf(G, e); return !safe(G, e) && Math.hypot(q.x - p.x, q.y - p.y) < R && Math.abs(bodyZ(G, e) - z) < 1.4; });
    if (tgt) { if ((c.rl || 0) <= G.time) melee(G, c); return; }
    if (k === 'n') { const b = G.bw.find(b => b.t !== c.t && Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < 1.3); if (b && (c.rl || 0) <= G.time) melee(G, c); return; }
    const th = enemies(G, c).some(e => clsOf(e) === 'a' && Math.hypot(P(e).x - p.x, P(e).y - p.y) < 12.5 && !dead(G, e));
    const busy = c.role === 'ram' && G.ph === 1 && inRamZone(G, p);
    c.sd = th && (busy || Math.random() < 0.45) ? 1 : 0;
  }
  // il genio del computer pianta una barricata verso i nemici, se ha la carica e la casella va bene
  function botBuild(G, c, dy) {
    if (clsOf(c) !== 'n' || (c.bwT || 0) > G.time || Math.random() > 0.25) return false;
    const p = P(c), xi = Math.floor(p.x), yi = Math.floor(p.y);
    for (const [ax, ay] of [[0, dy], [1, dy], [-1, dy], [1, 0], [-1, 0]]) if (doBuild(G, c, xi + ax, yi + ay)) return true;
    return false;
  }
  // il nemico piu' vicino sullo stesso piano (per chi combatte da vicino)
  function nearFoe(G, c, R) { const p = P(c), z = bodyZ(G, c); let b = null, bd = R; for (const e of enemies(G, c)) { if (e.cl) continue; const q = P(e), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && Math.abs(bodyZ(G, e) - z) < 1.4) { bd = d; b = q; } } return b; }
  // CATAPULTA del computer (compito 'cat'): sassi dalla catasta, la spinge al posto da tiro piu' vicino, tira al tratto di muro piu' crepato a tiro
  // (fasi 2-3: alla zona se ci sono difensori); se resta incastrata la lascia e tira da li'
  function botCat(G, c, act) {
    const T = G.ct, p = P(c);
    if (c.stn) { if (act('ctload')) return true; go(c, T.x, T.y + 1.2); return true; }
    if (T.n <= 0) { if (T.drv === c.id) { act('drive'); return true; } if (act('stone')) return true; go(c, STONES.x + 0.5, STONES.y - 0.6); return true; }
    let tgt = null;
    if (G.ph === 1) { let bi = -1, bs = -1e9; SECS.forEach((S, i) => { if (G.wl[i] >= SEC_HP) return; const d = Math.hypot(S.cx - T.x, 51 - T.y); if (d > CT_RMAX - 0.6) return; const sc = G.wl[i] * 10 - d; if (sc > bs) { bs = sc; bi = i; } }); if (bi >= 0) tgt = [SECS[bi].cx, 51.3]; }
    else { const Z = G.ph === 2 ? Z2 : Z3; if (G.zd && Math.hypot(Z.x - T.x, Z.y - T.y) < CT_RMAX - 0.5) tgt = [Z.x, Z.y]; }
    if (tgt || c.ctStk > 3) {
      if (T.drv === c.id) { act('drive'); return true; }
      if (!tgt) return false;
      if (Math.hypot(p.x - T.x, p.y - T.y) > CT_GRAB - 0.2) { go(c, T.x, T.y + 1.2); return true; }
      c.path = []; if (T.n > 0 && T.rl <= G.time) fireCt(G, c, tgt[0], tgt[1]); return true;
    }
    if (G.ph !== 1) return false;
    const sp = CT_SPOTS.reduce((a, b) => Math.hypot(a[0] - T.x, a[1] - T.y) < Math.hypot(b[0] - T.x, b[1] - T.y) ? a : b), dx = sp[0] - T.x, dy = sp[1] - T.y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
    if (T.drv !== c.id) { if (T.drv >= 0) return false; const bx = T.x - ux * 1.2, by = T.y - uy * 1.2; if (Math.hypot(p.x - bx, p.y - by) < 0.7) { act('drive'); c.ctP = [T.x, T.y]; c.ctStk = 0; return true; } go(c, bx, by); return true; }
    const mv = c.ctP ? Math.hypot(T.x - c.ctP[0], T.y - c.ctP[1]) : 1; c.ctStk = mv < 0.05 ? (c.ctStk || 0) + 0.45 : 0; c.ctP = [T.x, T.y];
    c.path = [[sp[0] - ux * CT_DIST, sp[1] - uy * CT_DIST]]; c.goal = null; return true;   // chi spinge va dritto: la catapulta davanti a lui
  }
  // BALESTRA del computer (compito 'bal'): va alla balestra piu' vicina alla catapulta (o all'ariete) e tira alla catapulta, se no al nemico fuori piu' vicino
  function botBal(G, c) {
    const ref = ctAlive(G) ? G.ct : { x: RAM_X, y: G.rm.y };
    let bi = -1, bd = 1e9; BAL.forEach((B, i) => { if (G.bl[i].dn || G.chars.some(o => o !== c && balOf(G, o) === i)) return; const d = Math.hypot(B.x - ref.x, B.y - ref.y); if (d < bd) { bd = d; bi = i; } });
    if (bi < 0) return false; const B = BAL[bi];
    if (balOf(G, c) !== bi) { go(c, B.ux, B.uy); return true; }
    c.path = []; if (G.bl[bi].rl > G.time) return true;
    let t = null; if (ctAlive(G) && Math.hypot(G.ct.x - B.x - 0.5, G.ct.y - B.y - 0.5) < BAL_RMAX - 0.5) t = [G.ct.x, G.ct.y];
    else if (twAlive(G) && Math.hypot(G.tw.x - B.x - 0.5, G.tw.y - B.y - 0.5) < BAL_RMAX - 0.5) t = [G.tw.x, G.tw.y];
    else { let ed = BAL_RMAX - 0.5; for (const e of enemies(G, c)) { const q = P(e), d = Math.hypot(q.x - B.x - 0.5, q.y - B.y - 0.5); if (d < ed && zoneAt(q.x, q.y) === 'out') { ed = d; t = [q.x, q.y]; } } }
    if (t) fireBal(G, c, bi, t[0], t[1]);
    return true;
  }
  // TORRE del computer (compito 'lad' quando c'e' la torre): la spinge all'attracco piu' vicino (passando sopra le case dei lati), poi ci sale
  function botTow(G, c, act) {
    const T = G.tw, p = P(c);
    if (T.dk) { if (zoneAt(p.x, p.y) !== 'out') return false; if (act('twup')) return true; const b = twBack(T); go(c, b.x, b.y + 0.2); return true; }
    // a tappe, per la corsia libera del campo ovest: dritto a nord, sopra la casa del mugnaio, all'attracco; se resta incastrata la lascia e riprova
    const D = DOCKS[1], goal = T.y > 57.7 ? { x: 19.5, y: 57.2 } : T.x > 13.1 ? { x: 12.5, y: 56.9 } : D;
    if (T.drv === c.id) { const mv = c.twP ? Math.hypot(T.x - c.twP[0], T.y - c.twP[1]) : 1; c.twStk = mv < 0.04 ? (c.twStk || 0) + 0.45 : 0; c.twP = [T.x, T.y]; if (c.twStk > 2.5) { act('tdrive'); c.twStk = 0; return true; } }
    const dx = goal.x - T.x, dy = goal.y - T.y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
    if (T.drv !== c.id) { if (T.drv >= 0) return false; const bx = T.x - ux * 1.8, by = T.y - uy * 1.8; if (Math.hypot(p.x - bx, p.y - by) < 0.8) { act('tdrive'); return true; } go(c, bx, by); return true; }
    if ((T.x - p.x) * ux + (T.y - p.y) * uy < 0.9) { act('tdrive'); return true; }   // non sono piu' dietro (la strada gira): la lascio e mi rimetto dietro
    c.path = [[goal.x - ux * TW_DIST, goal.y - uy * TW_DIST]]; c.goal = null; return true;
  }
  // SORTITA del computer (il genio al portone): quando l'ariete avanza sulla strada esce dalla porticina, lo incendia e rientra
  function botSortie(G, c, act) {
    const p = P(c), z = zoneAt(p.x, p.y), want = ramOn(G) && !ramFire(G) && !atGate(G) && G.rm.n > 0 && c.hp >= 2;
    if (z === 'out') {
      if (want) { if (act('burn')) return true; go(c, RAM_X + (p.x < RAM_X ? -1.7 : 1.7), G.rm.y); return true; }
      if (act('post')) return true; go(c, PORT.ox, PORT.oy); return true;
    }
    if (!want) return false; if (act('post')) return true; go(c, PORT.ix, PORT.iy); return true;
  }
  const zoneP = (Z, k) => { for (let i = 0; i < 12; i++) { const a = Math.random() * 7, r = Math.random() * Z.r * (k || 0.85), x = Z.x + Math.cos(a) * r, y = Z.y + Math.sin(a) * r; if (cqCellFree(Math.floor(x), Math.floor(y))) return [Math.floor(x) + 0.5, Math.floor(y) + 0.5]; } return [Z.x, Z.y + 1]; };
  const ARC1 = [[25.5, 57.5], [34.5, 57.5], [15.5, 63.5], [44.5, 63.5], [27.5, 63.5], [32.5, 63.5], [10.5, 55.5], [49.5, 55.5], [24.5, 66.5], [35.5, 66.5]];
  const WAL1 = [[20.5, 49.5], [21.5, 50.5], [38.5, 49.5], [37.5, 50.5], [25.5, 51.5], [34.5, 51.5], [12.5, 50.5], [47.5, 50.5], [16.5, 50.5], [43.5, 50.5]];
  function botT(G, c) {
    if (dead(G, c) || c.cl || c.pu) { c.walk = 0; return; }
    const atk = isAtk(G, c), zn = zoneAt(c.x, c.y), M = MP(), carry = G.ld.find(l => l.st === 1 && l.c === c.id);
    const act = k => { const a = action(G, c); if (a && a.k === k && a.on) { doAct(G, c, { k }); return true; } return false; };
    const placed = G.ld.filter(l => l.st === 2);
    const nearestL = key => { let b = null, bd = 1e9; for (const l of placed) { const S = M.spots[l.s], d = Math.hypot(S[key + 'x'] - c.x, S[key + 'y'] - c.y); if (d < bd) { bd = d; b = l; } } return b; };
    if (atk) {
      if (ramFire(G) && G.ph === 1 && c.role === 'ram') { if (act('ext')) return; go(c, RAM_X + (c.id % 2 ? -1.7 : 1.7), G.rm.y + 0.5); return; }   // l'ariete brucia: a spegnerlo
      if (c.role === 'cat' && ctAlive(G) && botCat(G, c, act)) return;
      if (clsOf(c) === 'a' && c.q === 0 && !c.stn) { const b = nearQuiv(c.x, c.y); if (b) { go(c, b[0], b[1] + 0.6); return; } }
      if (G.ph >= 2) {   // all'assalto della zona
        const Z = G.ph === 2 ? Z2 : Z3;
        if (zn === 'wall') { if (act('down') || act('jump')) return; }
        if (clsOf(c) !== 'a' && Math.hypot(c.x - Z.x, c.y - Z.y) < Z.r + 7) { const f = nearFoe(G, c, 5.5); if (f) { go(c, f.x, f.y); return; } if (botBuild(G, c, -1)) return; }
        if (c.role === 'arc' && clsOf(c) === 'a' && G.zd > 0 && Math.hypot(c.x - Z.x, c.y - Z.y) < Z.r + 6 && Math.random() < 0.5) { c.path = []; return; }
        if (!c.post || Math.hypot(c.post[0] - Z.x, c.post[1] - Z.y) > Z.r || Math.random() < 0.08) c.post = zoneP(Z);
        go(c, c.post[0], c.post[1]); return;
      }
      // FASE 1: dentro (salito con la scala) -> all'argano
      if (zn !== 'out') { if (act('lever')) return; go(c, LEV.x - 0.5, LEV.y + 0.5); if (!c.path.length) go(c, LEV.x + 0.5, LEV.y + 1.5); return; }
      if (carry) {
        if (act('place')) return;
        if (c.sp == null || !spotFree(G, c.sp)) { let b = -1, bs = 1e9; M.spots.forEach((S, i) => { if (!spotFree(G, i) || !spotOk(S)) return; const nd = enemies(G, c).filter(e => Math.hypot(P(e).x - S.tx, P(e).y - S.ty) < 6).length; const s = Math.hypot(S.ax - c.x, S.ay - c.y) * 0.25 + nd * 5 + Math.abs(S.fx - 24) * 0.3 + Math.random() * 4; if (s < bs) { bs = s; b = i; } }); c.sp = b; }
        if (c.sp >= 0) { const S = M.spots[c.sp]; go(c, S.ax, S.ay); }
        return;
      }
      if (c.role === 'lad' && twAlive(G) && G.ph === 1 && botTow(G, c, act)) return;
      if (c.role === 'lad') {
        if (placed.length) { if (act('climb')) return; const l = nearestL('a'); const S = M.spots[l.s]; go(c, S.ax, S.ay); return; }
        const gl = G.ld.find(l => l.st === 3); if (gl) { if (act('take')) return; go(c, gl.x + 0.5, gl.y + 1.5); return; }
        if (G.ld.some(l => l.st === 0)) { if (act('take')) return; go(c, RK.x + 0.5, RK.y + 1.5); return; }
      }
      // all'ariete (chi spinge e chi da' una mano quando non spinge nessuno)
      if (c.role === 'ram' || (G.rm.n < 2 && c.role !== 'lad' && Math.random() < 0.3)) {
        if (atGate(G) && inRamZone(G, P(c))) { if (!c.rc) { ramCharge(G, c); c.rcT = 0.7 + Math.random() * 0.3; } else if (chgK(G, c) >= c.rcT || (G.rm.win && Math.random() < 0.7)) ramRelease(G, c); c.path = []; return; }
        go(c, RAM_X + [-0.85, 0, 0.85][c.id % 3], ramBack(G.rm) + 0.4); return;
      }
      // arciere: si mette a tiro delle mura dietro un riparo
      if (!c.post || Math.random() < 0.03) { const lim = G.rm.y + 4; const L2 = ARC1.filter(p => p[1] < lim + 6); c.post = rnd(L2.length ? L2 : ARC1); }
      go(c, c.post[0], c.post[1]); return;
    }
    // DIFENSORI
    if (G.ph >= 2) {
      const Z = G.ph === 2 ? Z2 : Z3;
      if (clsOf(c) !== 'a' && Math.hypot(c.x - Z.x, c.y - Z.y) < Z.r + 6) { const f = nearFoe(G, c, 5); if (f) { go(c, f.x, f.y); return; } if (!G.za && botBuild(G, c, 1)) return; }
      if (!c.post || Math.hypot(c.post[0] - Z.x, c.post[1] - Z.y) > Z.r || Math.random() < 0.06) c.post = zoneP(Z, G.za ? 0.7 : 1);
      go(c, c.post[0], c.post[1]); return;
    }
    // chi e' all'argano: tutti addosso
    const lv = G.chars.find(e => e.pu && e.pu.k === 'lever' && !dead(G, e)); if (lv && Math.random() < 0.8) { go(c, LEV.x - 0.5, LEV.y + 1.5); return; }
    const intr = enemies(G, c).filter(e => zoneAt(P(e).x, P(e).y) !== 'out'); if (intr.length && Math.random() < 0.5) { const q = P(intr[0]); go(c, q.x, q.y); return; }
    if (c.role === 'bal' && G.ph === 1 && botBal(G, c)) return;
    if (c.role === 'fix' && G.ph === 1 && botSortie(G, c, act)) return;
    if (clsOf(c) === 'a' && c.q === 0) { const b = nearQuiv(c.x, c.y); if (b) { go(c, b[0], b[1] + 0.6); return; } }
    if (c.role === 'fix' && clsOf(c) === 'n') { const ws = SECS.findIndex((S, i) => G.wl[i] > 0 && G.wl[i] < SEC_HP); if (ws >= 0 && !(atGate(G) && G.gh < GATE_HP - 1 && !G.gopen)) { if (act('wfix')) return; go(c, SECS[ws].cx + 0.5, 50.5); return; } }
    if (c.role === 'fix' && clsOf(c) === 'n' && !G.gopen) {   // il genio dietro al portone: ripara quando l'ariete colpisce
      if (G.gh < GATE_HP - 0.5 && act('fix')) return;
      go(c, 28.5 + (c.id % 3), 48.5); return;
    }
    if (c.role === 'oil') { const o = OILC[c.id % 2]; const n = G.chars.filter(e => isAtk(G, e) && !dead(G, e) && inBurn(P(e).x, P(e).y)).length; if (n && act('oil')) return; go(c, o.sx, o.sy); return; }
    if (placed.length) {
      let tgt = null, bd = 1e9; for (const l of placed) { if (G.time - (l.pt || 0) < 1.0) continue; const S = M.spots[l.s], taken = G.chars.some(o => o !== c && o.bot && o.t === c.t && o.lt2 === l); if (taken) continue; const d = Math.hypot(S.tx - c.x, S.ty - c.y); if (d < bd) { bd = d; tgt = l; } }
      if (tgt && bd < 30) { c.lt2 = tgt; if (act('push')) return; const S = M.spots[tgt.s]; go(c, S.tx, S.ty); return; }
    }
    c.lt2 = null;
    if (!c.post || Math.random() < 0.03) c.post = rnd(WAL1);
    go(c, c.post[0], c.post[1]);
  }

  // ======================= IL GIOCO =======================
  const litFor = (G, x, y) => G.lit !== 'n' || MP().lamps.some(([lx, ly, r]) => Math.abs(lx - x) < r && Math.abs(ly - y) < r && Math.hypot(lx - x, ly - y) < r * 0.9);
  const MODE = CQ_MODES.assedio = {
    n: 'Assedio al castello',
    desc: '🏰 Due squadre: una assalta il castello di Roccaforte (ariete, scale, cortile, trono), l\'altra lo difende. Tre classi: 🗡️ guerriero, 🏹 arciere, 🔨 genio. Poi si cambia. Vince chi arriva più lontano, o prima.',
    maps: [['castello', 'Castello di Roccaforte']],
    def: { map: 'castello', n: 8, fill: true, time: 240, lit: 'r' },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],
    opts: o => `<details class="row asHow"><summary><b>📖 Come si gioca</b> (tocca per leggere)</summary>${helpHtml()}</details>
      <div class="row"><div class="lbl">Tempo dell'assalto</div>${seg('time', [[210, '3:30'], [240, '4:00'], [270, '4:30']], o.time || 240)}<div class="hint">+${BONUS[1]} s quando cade il portone, +${BONUS[2]} s quando cade il cortile.</div></div>
      <div class="row"><div class="lbl">Luce</div>${seg('lit', [['r', '🎲 A caso'], ['d', '☀️ Giorno'], ['s', '🌇 Tramonto'], ['n', '🌙 Notte']], o.lit || 'r')}</div>
      <div class="hint">Due tempi: una squadra attacca, l'altra difende, poi si cambia.</div>`,
    read: d => ({ time: +d.get('time') || 240, lit: d.get('lit') || 'r' }),
    start(G) {
      cq.mapDirty = true; cqUseMap('castello');
      G.lit = G.opt.lit && G.opt.lit !== 'r' ? G.opt.lit : rnd(['d', 'd', 's', 'n']);
      G.lg = []; G.lgN = 0; G.ar = []; G.arN = 0; G.res = [null, null]; G.half = 1; G.iv = 0; G.best = [0, 0];
      SQ.split(G); G.a0 = Math.random() < 0.5 ? 0 : 1;
      for (const c of G.chars) Object.assign(c, { k: 0, d: 0, hi: 0, lp: 0, pn: 0, cap: 0, sh: 0, up: 0, rmT: 0, zt: 0, oN: 0, lvN: 0, mh: 0, blk: 0, bN: 0, bk: 0, fxT: 0 });
      for (const c of G.chars) if (!c.bot) { c.cls = c === G.me ? myCls() : c.cls || 'a'; c.ncls = null; }
      setupHalf(G); G.ldSig = null; G.ldOld = null; G.gsS = null; G.koS = null; G.bwSig = null; G.bwOld = null;
      cq.x = G.me.x; cq.y = G.me.y;
    },
    gstart(G) { cq.mapDirty = true; cqUseMap('castello'); G.lg = []; G.lgN = 0; G.ar = []; G.arN = 0; G.best = [0, 0]; G.ld = []; for (let i = 0; i < NLAD; i++) G.ld.push({ st: 0, c: -1, s: -1 }); G.res = [null, null]; G.half = 1; G.hs = 0; G.iv = 0; G.a0 = 0; G.lit = 'd'; G.ph = 1; G.lim = 240; G.gh = GATE_HP; G.gopen = false; G.zp = 0; G.rm = { y: RAM_Y0, n: 0, hit: -9 }; G.oil = [0, 0]; G.ready = 0; G.ldSig = null; G.ldOld = null; G.gsS = null; G.koS = null; G.bw = []; G.bwSig = null; G.bwOld = null; G.ct = null; G.tw = null; G.twSig = null; G.bl = []; G.rk = []; G.wl = SECS.map(() => 0); G.mb = []; G.wlSig = null; G.ctSig = null; if (G.me) G.me.cls = myCls(); },
    intro: G => isAtk(G, G.me) ? '⚔️ All\'attacco! Spingete l\'ariete fino al portone' : '🛡️ Difendete il portone dalle mura!',
    speed(c) { const G = cq.g; if (!G || dead(G, c) || c.cl || c.pu || inIv(G)) return 0; if (G.ld.some(l => l.st === 1 && l.c === c.id)) return clsOf(c) === 'n' ? 0.92 : CARRY_L;
      if (G.ct && G.ct.drv === c.id && ctAlive(G)) { const h = G.chars.filter(o => o !== c && o.alive && !dead(G, o) && o.t === c.t && Math.hypot(P(o).x - G.ct.x, P(o).y - G.ct.y) < 2.2).length; return Math.min(0.95, 0.45 + 0.18 * h); }
      if (G.tw && G.tw.drv === c.id && twAlive(G)) { const h = G.chars.filter(o => o !== c && o.alive && !dead(G, o) && o.t === c.t && Math.hypot(P(o).x - G.tw.x, P(o).y - G.tw.y) < 2.5).length; return Math.min(0.8, 0.35 + 0.15 * h); }
      if (c.stn) return 0.8; return c.sd ? SHIELD_SP : 1; },
    big(G) {
      const me = G.me; if (G.guest && !G.ready) return '';
      if (inIv(G)) { const r = G.res[0]; return (r && r.done ? '🏆 Castello conquistato in ' + mmss(r.t) + '!' : '🛡️ Il castello ha resistito: ' + scoreTxt(r ? r.s : 0)) + '\n🔁 Si cambia: ora attaccano i ' + TEAMS[1 - G.a0].e + ' ' + TEAMS[1 - G.a0].n + ' · ' + Math.ceil(G.iv - G.time); }
      if (dead(G, me)) return '💀 Torni in battaglia tra ' + Math.ceil(me.dn - G.time) + '…' + (isAtk(G, me) ? '' : ' (rinforzi)');
      if (me.cl) return me.cl.d > 0 ? '🧗 Sali…' : '🧗 Scendi…';
      return '';
    },
    hud(G) {
      const me = G.me; if (me.t == null || G.ph == null) return '🏰 Assedio al castello';
      const T = TEAMS[me.t], atk = isAtk(G, me), r0 = G.half === 2 ? G.res[0] : null, lim = r0 && r0.done ? Math.min(G.lim, r0.t) : G.lim, left = inIv(G) ? G.lim : lim - hT(G);
      const ph = G.ph > 3 ? 3 : G.ph, pr = G.ph === 1 ? (G.rm.y > RAM_Y1 + 0.1 ? '🐏 ariete ' + Math.round(100 * (RAM_Y0 - G.rm.y) / (RAM_Y0 - RAM_Y1)) + '%' : '🚪 portone ' + Math.round(100 * G.gh / GATE_HP) + '%') : Math.round(G.zp * 100) + '%';
      const steps = [1, 2, 3].map(i => `<span style="opacity:${i === ph ? 1 : i < ph ? 0.85 : 0.35}">${['', '🚪', '⚔️', '👑'][i]}</span>`).join('<span style="opacity:.4">›</span>');
      return `<b style="color:${T.l}">${T.e} ${atk ? '⚔️ Attaccate' : '🛡️ Difendete'}</b> · ${steps} ${pr} · ⏱ <b>${mmss(left)}</b>` + (r0 ? ` · 🎯 ${r0.done ? mmss(r0.t) : scoreTxt(r0.s)}` : '');
    },
    hide: c => dead(cq.g, c),
    blk: (G, x, y) => (ramOn(G) && inRamBox(G.rm, x, y)) || (ctAlive(G) && G.ct.drv !== G.me.id && inCtBox(G.ct, x, y)) || (twAlive(G) && G.tw.drv !== G.me.id && inTwBox(G.tw, x, y)),   // la sagoma dell'ariete (motore: cqBlocked)
    view: G => G.vw && (G.vw.z < 0.995 || Math.abs(G.vw.x) + Math.abs(G.vw.y) > 0.02) ? G.vw : null,   // visuale allargata mentre miro (motore: M.view)
    nameCol: c => c.t != null ? TEAMS[c.t].l : null,
    voice: SQ.voice,
    btn(G) { if (G.guest && !G.ready) return null; const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) { const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'ram') { if (G.chg) return; G.chg = performance.now(); beep(180, 0.12, 0.03, 0, 'sawtooth'); if (G.guest) { cqNetSend({ k: 'rc' }); me.rc = G.time; } else ramCharge(G, me); return; }   // si lascia con ramLet
      beep(520, 0.04, 0.02); if (G.guest) { cqNetSend({ k: 'a', a: a.k, x: a.x, y: a.y }); if (a.k === 'climb') { const S = MP().spots[a.l.s]; cq.x = S.ax; cq.y = S.ay; } } else doAct(G, me, { k: a.k, x: a.x, y: a.y }); },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'a') doAct(G, c, { k: o.a, x: o.x, y: o.y });
      if (o.k === 'ml') melee(G, c);
      if (o.k === 'rc') ramCharge(G, c);
      if (o.k === 'rh') ramRelease(G, c, +o.p || 0);
      if (o.k === 'cf') fireCt(G, c, +o.x, +o.y);
      if (o.k === 'bf') fireBal(G, c, +o.i, +o.x, +o.y);
      if (o.k === 'sd') c.sd = o.on && clsOf(c) === 'g' && canHit(G, c) ? 1 : 0;
      if (o.k === 'cls') setCls(G, c, o.c);
      if (o.k === 'sh' && !dead(G, c) && (c.rl || 0) <= G.time + 0.25 && canShoot(G, c)) mkArrow(G, c, o.x, o.y, o.q);
    },
    draw(c) {   // chi sale o scende la scala: disegnato lungo la scala
      const G = cq.g; if (!G || !c.cl) return null;
      const u = clU(G, c), S = MP().spots[c.cl.s], [x, y] = clXY(G, c), dx = x - S.ax, dy = y - S.ay, z = u * WZ * HB;
      const f = (g, X, Y, TW, L) => { const U = TW * 0.575; cqPlayer(g, X + (dx - dy) * TW / 2, Y + (dx + dy) * TW / 4 - z * U, TW, L, G.time * 9, 1); };
      f.top = cqTop(cqLookOf(c)) + z * 0.575 - (dx + dy) / 4; return f;
    },
    local(G, dt) {
      const me = G.me; if (G.guest && !G.ready) return;
      syncMap(G);
      for (const c of G.chars) { if (!c.lxT || G.time - c.lxT > 0.4) { const p = P(c); c.lx = c.cx0 == null ? p.x : c.cx0; c.ly = c.cy0 == null ? p.y : c.cy0; c.cx0 = p.x; c.cy0 = p.y; c.lxT = G.time; } }
      // nome del posto quando ci entro (zone e case)
      { const z = zoneAt(cq.x, cq.y), r = roomAt(cq.x, cq.y), R = r >= 0 ? MP().rooms[r] : null, n = z === 'wall' ? (R && R.ala === 'T' ? 'Torre' : 'Mura') : R ? R.n : '';
        if (n && n !== G.myZn) { if (G.myZn != null && n !== 'Borgo' && n !== 'Strada maestra' && n !== 'Portone') G.zn = { n, t: performance.now() }; G.myZn = n; } }
      bowUI(G); clsUI(G);
      // carica dell'ariete persa se mi sposto da dietro o se il portone cade
      if (G.chg && (!atGate(G) || !inRamZone(G, { x: cq.x, y: cq.y }) || dead(G, me))) { G.chg = 0; if (G.guest) cqNetSend({ k: 'rh', p: 0 }); me.rc = 0; }
      { const rg = G.gopen || G.ph > 1; if (rg && !G.goT) G.goT = performance.now(); if (!rg) G.goT = 0; }
      G.vw = viewTick(G, dt);
      // l'amico dice all'host che classe ha scelto (una volta, appena entra)
      if (G.guest && G.ready && G.clsSent !== myCls()) { G.clsSent = myCls(); cqNetSend({ k: 'cls', c: myCls() }); }
      // guerriero: tenendo premuto il pulsante si alza lo scudo
      if (G.hold && clsOf(me) === 'g' && !G.sdOn && performance.now() - G.hold > SHIELD_HOLD) setShield(G, 1);
      if (G.sdOn && (clsOf(me) !== 'g' || dead(G, me))) setShield(G, 0);
      if (G.sdOn && !G.guest && !me.sd && canHit(G, me)) me.sd = 1;   // dopo un colpo o una scala lo scudo torna su se tengo ancora premuto
      // frecce parate dagli scudi qui vicino: clang
      for (const a of G.ar) if (a.hit === -2 && a.te && !a.blS && G.time >= a.te) { a.blS = 1; const d = Math.hypot(a.hx - cq.x, a.hy - cq.y); if (d < 12) clang(0.8 * (1 - d / 12)); }
      // il martello del genio che ripara il portone
      if (!G.hmT || G.time - G.hmT > 0.38) { const F = G.chars.find(c => c.pu && c.pu.k === 'fix' && Math.hypot(P(c).x - cq.x, P(c).y - cq.y) < 12); if (F) { G.hmT = G.time; clang(0.35, true); } }
      if (G.myHp != null && me.hp < G.myHp && !dead(G, me)) { G.myHurt = performance.now(); thud(0.4, 160); shake(G, 8); }
      G.myHp = me.hp;
      // colpi andati a segno (le mie frecce): crocetta e "tic"
      for (const a of G.ar) if (a.o === me.id && a.hit >= 0 && a.te && !a.hmS) { a.hmS = 1; G.hm = { x: a.hx, y: a.hy, z: a.hz, t: performance.now() }; beep(1500, 0.04, 0.03); beep(1900, 0.05, 0.02, 0.04); }
      // lo schermo che trema
      const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas');
      if (cv) { const S2 = G.shk, now = performance.now(); if (S2 && now < S2.e) { const k = (S2.e - now) / (120 + S2.a * 25), a = S2.a * k; cv.style.transform = 'translate(' + ((Math.random() - 0.5) * a).toFixed(1) + 'px,' + ((Math.random() - 0.5) * a).toFixed(1) + 'px)'; G.shkOn = 1; } else if (G.shkOn) { cv.style.transform = ''; G.shkOn = 0; } }
    },
    tick(G, dt) {
      if (inIv(G)) { if (G.time + dt >= G.iv) { G.iv = 0; setupHalf(G); } G.ar = []; return; }
      arTick(G); holdTick(G); shieldTick(G); ramTick(G, dt); fixTick(G, dt); ctTick(G, dt); twTick(G, dt); rkTick(G); quivTick(G); oilTick(G); zoneTick(G, dt);
      if (G.phase !== 'play' || inIv(G)) return;
      for (const c of G.chars) if (c.dn && c.dn <= G.time) revive(G, c);
      G.best[atkT(G)] = Math.max(G.best[atkT(G)], score(G));
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.35 + Math.random() * 0.2; botT(G, c); if (clsOf(c) === 'a') { if (Math.random() < 0.55) botShoot(G, c); } else botMelee(G, c); }
        if (!dead(G, c) && !c.cl && !c.pu) cqModeStep(c, dt, 0.9 * (MODE.speed(c) || 0));
      }
      const r0 = G.half === 2 ? G.res[0] : null, lim = r0 && r0.done ? Math.min(G.lim, r0.t) : G.lim;
      if (hT(G) >= lim) endHalf(G, false);
    },
    finish(G) {
      const [a, b] = G.res, A = G.a0, B = 1 - G.a0;
      const txt = (t, r) => TEAMS[t].e + ' ' + TEAMS[t].n + ': ' + (r && r.done ? 'conquistato in ' + mmss(r.t) : 'arrivati a ' + scoreTxt(r ? r.s : 0));
      let w = -1;
      if (a && b) { if (a.done && b.done) w = a.t < b.t ? A : b.t < a.t ? B : -1; else if (a.done) w = A; else if (b.done) w = B; else w = a.s > b.s ? A : b.s > a.s ? B : -1; }
      const why = txt(A, a) + ' · ' + txt(B, b) + '.';
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— ' + TEAMS[c.t].e + CL[clsOf(c)].i + ' ' + [c.cap ? '👑 sul trono' : '', '🎯 ' + (c.k || 0) + ' abbattuti', c.rmT > 8 ? '🐏 ariete ' + Math.round(c.rmT) + ' s' : '', c.lvN ? '⚙️ argano' : '', c.pn ? '🤚 ' + c.pn + ' scale' : '', c.oN ? '🔥 ' + c.oN + ' olio' : '', c.zt > 5 ? '⚔️ zona ' + Math.round(c.zt) + ' s' : '', (c.blk || 0) + (c.pmN || 0) >= 3 ? '🛡️ ' + ((c.blk || 0) + (c.pmN || 0)) + ' parate' : '', c.fxT > 5 ? '🔧 portone ' + Math.round(c.fxT) + ' s' : '', c.bN ? '🪵 ' + c.bN : ''].filter(Boolean).join(' · ')];
      const sc = c => (c.cap || 0) * 20 + (c.k || 0) * 3 + (c.pn || 0) * 3 + (c.lvN || 0) * 8 + (c.rmT || 0) * 0.2 + (c.zt || 0) * 0.3 + (c.oN || 0) * 2 + (c.blk || 0) * 0.5 + (c.fxT || 0) * 0.3 + (c.bN || 0) + (c.bk || 0) * 2;
      SQ.end(G, w, why + funny(G, w), line, sc);
    },
    csnap: c => { const G = cq.g; return [c.t, c.hp == null ? maxHp(c) : c.hp, r1(Math.max(0, (c.dn || 0) - G.time)), r1(Math.max(0, (c.sf || 0) - G.time)), c.cl ? [c.cl.s, c.cl.d, r2(c.cl.t0 - G.time), c.cl.T] : 0, c.pu ? [['push', 'lever', 'fix', 'wfix', 'post', 'burn', 'ext', 'twup', 'twdn'].indexOf(c.pu.k), r1(c.pu.e - G.time), c.pu.s || 0] : 0, c.tpN || 0, c.tp || 0, r1(Math.max(0, (c.rl || 0) - G.time)), [c.k || 0, c.d || 0, c.lp || 0, c.pn || 0, c.cap || 0, Math.round(c.rmT || 0), Math.round(c.zt || 0), c.oN || 0, c.lvN || 0],
      [clsOf(c), c.ncls || 0, c.sd ? 1 : 0, r1(c.sdA || 0), c.sw ? r2(Math.min(9, G.time - c.sw)) : 9, r1(c.swA || 0), r1(Math.max(0, (c.bwT || 0) - G.time)), r1(Math.max(0, (c.pmT || 0) - G.time)), c.stn ? 1 : 0, c.q == null ? QV : c.q], [c.mh || 0, c.blk || 0, c.bN || 0, c.bk || 0, Math.round(c.fxT || 0)], c.rc ? r2(G.time - c.rc) : 0]; },
    capply(G, c, a) {
      c.t = a[0]; c.hp = a[1]; const was = !!c.dn && c.dn > G.time; c.dn = a[2] > 0 ? G.time + a[2] : 0; c.sf = a[3] > 0 ? G.time + a[3] : 0;
      if (was && !c.dn) c.angel = G.time;
      c.cl = a[4] ? { s: a[4][0], d: a[4][1], t0: G.time + a[4][2], T: a[4][3] } : null; c.pu = a[5] ? { k: ['push', 'lever', 'fix', 'wfix', 'post', 'burn', 'ext', 'twup', 'twdn'][a[5][0]] || 'push', e: G.time + a[5][1], s: a[5][2] || 0 } : null;
      c.tpN = a[6]; c.tp = a[7] || null; if (c !== G.me || !G.shotT || performance.now() - G.shotT > 600) c.rl = G.time + a[8];
      [c.k, c.d, c.lp, c.pn, c.cap, c.rmT, c.zt, c.oN, c.lvN] = a[9];
      if (a[10]) { const v = a[10]; c.cls = v[0]; if (c !== G.me || !G.clsT || performance.now() - G.clsT > 1500) c.ncls = v[1] || null; if (c !== G.me || !G.sdT || performance.now() - G.sdT > 500) { c.sd = v[2]; } c.sdA = v[3]; if (v[4] < 9 && (c !== G.me || !G.shotT || performance.now() - G.shotT > 600)) c.sw = G.time - v[4]; c.swA = v[5]; c.bwT = G.time + v[6]; c.pmT = G.time + (v[7] || 0); c.stn = v[8] || 0; if (c !== G.me || !G.shotT || performance.now() - G.shotT > 600) c.q = v[9] == null ? QV : v[9]; }
      if (a[11]) [c.mh, c.blk, c.bN, c.bk, c.fxT] = a[11];
      if (c !== G.me || !G.chg) c.rc = a[12] ? G.time - a[12] : 0;
      if (c === G.me) { if (!G.ready) { G.ready = 1; G.myTp = c.tpN; } else if (c.tpN !== G.myTp) { G.myTp = c.tpN; if (c.tp) { cq.x = c.tp[0]; cq.y = c.tp[1]; } } }
    },
    snap(G) {
      return { lg: G.lg, h: G.half, hs: r1(G.time - G.hs), iv: r1(Math.max(0, G.iv - G.time)), res: G.res, a0: G.a0, li: G.lit, bs: G.best,
        ph: G.ph, lim: G.lim, gh: Math.round(G.gh), go: G.gopen ? 1 : 0, zp: r2(G.zp), za: G.za || 0, zd: G.zd || 0, rm: [r2(G.rm.y), G.rm.n, r1(G.rm.hit - G.time), r2(G.rm.pl || 0), ramFire(G) ? r1(G.rm.fire - G.time) : 0], oil: G.oil.map(t => r1(t - G.time)), bu: G.burn ? [r1(G.burn.t0 - G.time), r1(G.burn.e - G.time)] : 0,
        ld: G.ld.map(l => [l.st, l.c, l.s, l.x || 0, l.y || 0]), bw: (G.bw || []).map(b => [b.x, b.y, b.t, b.hp, b.o]),
        ar: G.ar.filter(a => G.time - a.t0 < 3).map(a => [a.id, a.o, a.q, r2(a.x0), r2(a.y0), r2(a.z0), r2(a.x1), r2(a.y1), r2(a.z1), r2(a.t0 - G.time), r2(a.d), r2(a.pk), a.te ? r2(a.te - G.time) : 0, a.hit, a.te ? [r2(a.hx), r2(a.hy), r2(a.hz)] : 0, a.t, a.k || 0]),
        ct: G.ct ? [r2(G.ct.x), r2(G.ct.y), G.ct.hp, G.ct.n, r1(G.ct.rl - G.time), G.ct.dn ? r1(G.ct.dn - G.time) : 0, G.ct.drv, r2(G.ct.arm - G.time)] : 0,
        bl: (G.bl || []).map(S => [S.hp, S.dn ? r1(S.dn - G.time) : 0, r1(S.rl - G.time), r2(S.a)]),
        rk: (G.rk || []).map(r => [r.id, r.o, r.t, r2(r.x0), r2(r.y0), r2(r.z0), r2(r.x1), r2(r.y1), r2(r.z1), r2(r.t0 - G.time), r2(r.d), r2(r.pk), r.te ? r2(r.te - G.time) : 0]),
        wl: G.wl || [], mb: G.mb || [], tw: G.tw ? [r2(G.tw.x), r2(G.tw.y), G.tw.hp, G.tw.drv, G.tw.dk, G.tw.dn ? r1(G.tw.dn - G.time) : 0] : 0,
        bd: G.bodies.map(b => [b.id, r2(b.x), r2(b.y), b.face, r1(b.t - G.time)]) };
    },
    apply(G, x) {
      G.half = x.h; G.hs = G.time - x.hs; G.iv = x.iv > 0 ? G.time + x.iv : 0; G.res = x.res; G.a0 = x.a0; G.lit = x.li; G.best = x.bs;
      G.ph = x.ph; G.lim = x.lim; G.gh = x.gh; G.gopen = !!x.go; G.zp = x.zp; G.za = x.za; G.zd = x.zd; G.rm = { y: x.rm[0], n: x.rm[1], hit: G.time + x.rm[2], pl: x.rm[3] || 0, fire: x.rm[4] ? G.time + x.rm[4] : 0 }; G.oil = x.oil.map(v => G.time + v); G.burn = x.bu ? { t0: G.time + x.bu[0], e: G.time + x.bu[1], hit: [] } : null;
      G.ld = x.ld.map(a => ({ st: a[0], c: a[1], s: a[2], x: a[3], y: a[4] }));
      G.bw = (x.bw || []).map(a => ({ x: a[0], y: a[1], t: a[2], hp: a[3], o: a[4] }));
      G.ct = x.ct ? { x: x.ct[0], y: x.ct[1], hp: x.ct[2], n: x.ct[3], rl: G.time + x.ct[4], dn: x.ct[5] > 0 ? G.time + x.ct[5] : 0, drv: x.ct[6], arm: G.time + x.ct[7] } : null;
      G.bl = (x.bl || []).map(v => ({ hp: v[0], dn: v[1] > 0 ? G.time + v[1] : 0, rl: G.time + v[2], a: v[3] }));
      { const old = G.rk || []; G.rk = (x.rk || []).map(v => { const o = old.find(r => r.id === v[0]); return Object.assign(o || {}, { id: v[0], o: v[1], t: v[2], x0: v[3], y0: v[4], z0: v[5], x1: v[6], y1: v[7], z1: v[8], t0: G.time + v[9], d: v[10], pk: v[11], te: v[12] ? G.time + v[12] : 0 }); }); }
      G.wl = x.wl || []; G.mb = x.mb || [];
      G.tw = x.tw ? { x: x.tw[0], y: x.tw[1], hp: x.tw[2], drv: x.tw[3], dk: x.tw[4], dn: x.tw[5] > 0 ? G.time + x.tw[5] : 0 } : null;
      for (const v of x.ar) { const o = { id: v[0], o: v[1], q: v[2], x0: v[3], y0: v[4], z0: v[5], x1: v[6], y1: v[7], z1: v[8], t0: G.time + v[9], d: v[10], pk: v[11], te: v[12] ? G.time + v[12] : 0, hit: v[13], t: v[15], k: v[16] || undefined }; if (v[14]) [o.hx, o.hy, o.hz] = v[14]; const old = G.ar.find(a => a.id === o.id); if (old) Object.assign(old, { te: o.te, hit: o.hit, hx: o.hx, hy: o.hy, hz: o.hz }); else G.ar.push(o); }
      G.ar = G.ar.filter(a => a.id < 0 ? G.time - a.t0 < a.d + 0.2 && !G.ar.some(b => b.o === G.me.id && b.q === a.q && b.id > 0) : G.time - a.t0 < 4 + a.d);
      if (x.bd) G.bodies = x.bd.map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: G.time + a[4], look: cqLookOf(c), name: c.name, nk: 1 } : null; }).filter(Boolean);
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    night(G) {
      if (G.lit === 'd' || !G.lit) return { a: 0, r: 0, lights: [], see: () => true };
      const me = G.me, near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k, lights = [];
      for (const [x, y, r] of MP().lamps) if (near(x, y, 22)) lights.push([x, y, r * 1.35, 0.85]);
      for (const c of G.chars) if (c !== me && c.alive && c.t === me.t && near(c.x, c.y, 16)) lights.push([c.x, c.y, 1.2, 0.5]);
      if (G.burn && G.time < G.burn.e) lights.push([30, 53.5, 4, 1]);
      if (G.lit === 's') return { a: 0.42, r: 7, lights, see: () => true };
      return { a: 0.8, r: 4.8, lights, see: (x, y) => { const d = Math.hypot(x - cq.x, y - cq.y); if (d < 6.5) return true; const c = G.chars.find(o => o.x === x && o.y === y); if (c && c.t === me.t) return true; return d < 22 && litFor(G, x, y); } };
    },
    deco(g, c, X, Y, TW, G, L) {
      SQ.ring(g, c, X, Y, TW);
      if (dead(G, c)) return;
      const lad = G.ld && G.ld.some(l => l.st === 1 && l.c === c.id), f = c === G.me ? cq.face : c.face || 1;
      if (c.stn) { const rx = X, ry = Y - TW * 1.25; g.fillStyle = '#8a8478'; g.beginPath(); g.arc(rx, ry, TW * 0.24, 0, 7); g.fill(); g.fillStyle = '#a8a296'; g.beginPath(); g.arc(rx - TW * 0.07, ry - TW * 0.07, TW * 0.1, 0, 7); g.fill(); g.strokeStyle = '#5a554c'; g.lineWidth = 1.5; g.beginPath(); g.arc(rx, ry, TW * 0.24, 0, 7); g.stroke(); }
      else if (!c.cl && !lad) weapon(g, c, X, Y, TW, f, G);
      if (lad) { g.save(); g.translate(X, Y - TW * 1.05); g.rotate(-0.38 * f); g.strokeStyle = '#8a5a2a'; g.lineWidth = Math.max(2.5, TW / 14); g.beginPath(); for (const s of [-0.12, 0.12]) { g.moveTo(-TW * 0.95, s * TW); g.lineTo(TW * 0.95, s * TW); } g.stroke(); g.strokeStyle = '#b07a40'; g.lineWidth = Math.max(2, TW / 20); g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(i * TW * 0.2, -0.12 * TW); g.lineTo(i * TW * 0.2, 0.12 * TW); } g.stroke(); g.restore(); }
      const dr = c.cl ? MODE.draw(c) : null, top = Y - TW * (dr ? dr.top : cqTop(L)) - 15, hp = c.hp == null ? maxHp(c) : c.hp, sh = c.hitT && G.time - c.hitT < 0.35 ? Math.sin((G.time - c.hitT) * 60) * 2 : 0;
      hearts(g, X + sh, top, hp, safe(G, c), maxHp(c));
      { const ck = c === G.me && G.chg ? Math.min(1, (performance.now() - G.chg) / 1000 / CH_T) : chgK(G, c); if (ck > 0) { const bw = 44, full = ck >= 1; g.fillStyle = 'rgba(0,0,0,.65)'; cqRR(g, X - bw / 2 - 2, top - 16, bw + 4, 10, 5); g.fill(); g.fillStyle = full ? (Math.sin(performance.now() / 70) > 0 ? '#fff0a0' : '#ffc030') : '#ff8a30'; cqRR(g, X - bw / 2, top - 14, bw * ck, 6, 3); g.fill(); } }
      if (c.pu) { const T = PUT[c.pu.k] || PUSH, k = c.pu.k === 'fix' ? G.gh / GATE_HP : Math.max(0, Math.min(1, 1 - (c.pu.e - G.time) / T)), bw = 38; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - bw / 2 - 2, top - 14, bw + 4, 8, 4); g.fill(); g.fillStyle = c.pu.k === 'lever' ? '#e8c040' : c.pu.k === 'fix' || c.pu.k === 'wfix' ? '#7ad070' : c.pu.k === 'burn' ? '#ff6a20' : c.pu.k === 'ext' ? '#6ab8ff' : '#ffb040'; cqRR(g, X - bw / 2, top - 12, bw * k, 4, 2); g.fill(); }
    },
    extras(G) {
      const out = [];
      if (G.rm && ((!G.gopen && G.ph === 1) || (G.goT && performance.now() - G.goT < 1200))) {   // l'ARIETE (disegnato in profondita' come un personaggio); a portone caduto sparisce piano
        if (!MODE.__rd) { MODE.__rd = (g, X, Y, TW) => { const G2 = cq.g, a = G2.gopen || G2.ph > 1 ? Math.max(0, 1 - (performance.now() - (G2.goT || performance.now())) / 1200) : 1; if (a <= 0) return; g.save(); g.globalAlpha = a; ramDraw(g, X, Y, TW, G2); g.restore(); }; MODE.__rd.top = 2.2; }
        out.push({ x: RAM_X, y: G.rm.y, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__rd });
      }
      if (G.ct && (!G.ct.dn || G.time < G.ct.dn - CT_RESP + 4)) {   // la CATAPULTA (e i rottami per 4 s dopo che l'hanno distrutta)
        if (!MODE.__ct) { MODE.__ct = (g, X, Y, TW) => ctDraw(g, X, Y, TW, cq.g); MODE.__ct.top = 3.1; }
        out.push({ x: G.ct.x, y: G.ct.y, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__ct });
      }
      if (G.tw && (!G.tw.dn || G.time < G.tw.dn - TW_RESP + 4)) {   // la TORRE D'ASSEDIO
        if (!MODE.__tw) { MODE.__tw = (g, X, Y, TW) => towDraw(g, X, Y, TW, cq.g); MODE.__tw.top = 4.6; }
        out.push({ x: G.tw.x, y: G.tw.y, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__tw });
      }
      if (G.bl && G.bl.length) {   // le BALESTRE A TORRETTA sulle torri
        if (!MODE.__bl) MODE.__bl = BAL.map((B, i) => { const f = (g, X, Y, TW) => balDraw(g, X, Y, TW, cq.g, i); f.top = 1.4; return f; });
        BAL.forEach((B, i) => out.push({ x: B.x + 0.5, y: B.y + 0.5, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__bl[i] }));
      }
      if (!MODE.__cb) { MODE.__cb = (g, X, Y, TW) => banner(g, X, Y, TW, TEAMS[atkT(cq.g)].c, performance.now() / 1000); MODE.__cb.top = 1.5; }
      out.push({ x: 31.5, y: 79.5, L: null, w: 0, f: 1, name: null, all: true, dr: MODE.__cb });
      return out;
    },
    over(g, G, sx, sy, TW) {
      if (G.guest && !G.ready) return;
      const me = G.me, W2 = cq.w / (cq.vz || 1), H2 = cq.h / (cq.vz || 1), now = performance.now() / 1000, U = TW * 0.575, near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r;
      const SX = (x, y) => sx(x, y), SY = (x, y, z) => sy(x, y) + cqZpx(x, y, TW) - z * U;
      const MN = MODE.night(G);
      if (G.lit === 's') { g.fillStyle = 'rgba(255,120,50,.07)'; g.fillRect(0, 0, W2, H2); }
      const ellipse = (x, y, r) => { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2, X = sx(x + Math.cos(t) * r, y + Math.sin(t) * r), Y = sy(x + Math.cos(t) * r, y + Math.sin(t) * r); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
      // ZONA DA CONQUISTARE: cerchio, avanzamento del colore di chi attacca, lampeggia se contesa
      if (G.ph >= 2 && G.ph <= 3) {
        const Z = G.ph === 2 ? Z2 : Z3, Ta = TEAMS[atkT(G)], Td = TEAMS[1 - atkT(G)], cont = G.za && G.zd;
        if (near(Z.x, Z.y, 26)) {
          ellipse(Z.x, Z.y, Z.r); g.fillStyle = (cont ? (Math.sin(now * 10) > 0 ? '#ffffff' : Ta.c) : Td.c) + '22'; g.fill(); g.setLineDash([10, 7]); g.lineDashOffset = -now * 16; g.strokeStyle = Td.c + 'b0'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
          g.beginPath(); for (let i = 0; i <= 48 * G.zp; i++) { const t = -Math.PI / 2 + i / 48 * Math.PI * 2, X = sx(Z.x + Math.cos(t) * Z.r, Z.y + Math.sin(t) * Z.r), Y = sy(Z.x + Math.cos(t) * Z.r, Z.y + Math.sin(t) * Z.r); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.strokeStyle = Ta.c; g.lineWidth = 6; g.stroke();
          const X = sx(Z.x, Z.y), Y = sy(Z.x, Z.y) - TW * 3.2; const tx = (cont ? '⚔️ CONTESA ' : G.ph === 2 ? '⚔️ ' : '👑 ') + Math.round(G.zp * 100) + '%'; g.font = '800 13px system-ui,sans-serif'; const w = g.measureText(tx).width + 18; g.fillStyle = 'rgba(20,16,14,.78)'; cqRR(g, X - w / 2, Y - 12, w, 24, 9); g.fill(); g.fillStyle = cont ? '#ffd080' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, X, Y);
        }
      }
      // OLIO BOLLENTE: lingue di fuoco e fumo davanti al portone
      if (G.burn && G.time < G.burn.e + 1 && near(30, 53, 24)) {
        const k = Math.max(0, Math.min(1, (G.burn.e + 1 - G.time) / 1)), f = G.time < G.burn.e ? 1 : k;
        g.globalAlpha = 0.5 * f; g.fillStyle = '#3a2410'; g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, x = 30 + Math.cos(t) * 2.9, y = 54 + Math.sin(t) * 2.1; i ? g.lineTo(sx(x, y), sy(x, y)) : g.moveTo(sx(x, y), sy(x, y)); } g.fill();
        for (let i = 0; i < 34; i++) { const x = 27.4 + (i * 0.37 % 5.2), y = 51.9 + ((i * 1.73) % 4.1), h = (0.5 + 0.7 * Math.abs(Math.sin(now * 7 + i))) * TW * 0.8, X = sx(x, y), Y = sy(x, y);
          g.globalAlpha = 0.9 * f; g.fillStyle = i % 3 ? '#ff7a18' : i % 2 ? '#ffd040' : '#e8401a'; g.beginPath(); g.moveTo(X - TW * 0.16, Y); g.quadraticCurveTo(X - TW * 0.05, Y - h * 0.7, X, Y - h * 1.25); g.quadraticCurveTo(X + TW * 0.05, Y - h * 0.7, X + TW * 0.16, Y); g.fill(); }
        g.globalAlpha = 0.25 * f; g.fillStyle = '#2a2420'; for (let i = 0; i < 5; i++) { const X = sx(28 + i, 53 + (i % 2)), Y = sy(28 + i, 53) - TW * (1.5 + ((now * 0.8 + i * 0.3) % 1) * 2); g.beginPath(); g.arc(X, Y, TW * 0.4, 0, 7); g.fill(); } g.globalAlpha = 1;
        if (G.time - G.burn.t0 < 0.9) for (const o of OILC) { const X = SX(o.x + 0.5, o.y + 1.2), Y0 = SY(o.x + 0.5, o.y + 1.2, TZ * HB + 0.9), Y1 = sy(o.x + 0.5, o.y + 1.6); g.globalAlpha = 0.9; g.strokeStyle = '#6a3a10'; g.lineWidth = TW * 0.22; g.beginPath(); g.moveTo(X, Y0); g.lineTo(X + 2, Y1); g.stroke(); g.strokeStyle = '#ffb040'; g.lineWidth = TW * 0.07; g.beginPath(); g.moveTo(X - 2, Y0); g.lineTo(X, Y1); g.stroke(); g.globalAlpha = 1; }
      }
      // FRECCE in volo (con l'ombra) e piantate
      for (const a of G.ar) {
        if (!near(a.x0, a.y0, 26) && !near(a.x1, a.y1, 26)) continue;
        const fly = !a.te || G.time < a.te;
        if (fly) {
          const [x, y, z, u] = arPos(a, G.time); if (u <= 0) continue; const [x2, y2, z2] = arPos(a, G.time - 0.03), X = SX(x, y), Y = SY(x, y, z), X2 = SX(x2, y2), Y2 = SY(x2, y2, z2);
          let dx = X - X2, dy = Y - Y2; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; const Lg = TW * (a.k === 'b' ? 0.75 : 0.42);
          if (a.k === 'b') { g.strokeStyle = '#4a2e16'; g.lineWidth = Math.max(4, TW / 10); g.beginPath(); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X, Y); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * 0.12, TW * 0.05, 0, 0, 7); g.fill();
          g.strokeStyle = '#5a3a1a'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X, Y); g.stroke();
          g.fillStyle = '#c8ccd2'; g.beginPath(); g.moveTo(X + dx * 6, Y + dy * 6); g.lineTo(X - dy * 3, Y + dx * 3); g.lineTo(X + dy * 3, Y - dx * 3); g.fill();
          g.strokeStyle = TEAMS[a.t != null ? a.t : 0].l; g.lineWidth = 2; g.beginPath(); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X - dx * Lg * 0.7 - dy * 3, Y - dy * Lg * 0.7 + dx * 3); g.moveTo(X - dx * Lg, Y - dy * Lg); g.lineTo(X - dx * Lg * 0.7 + dy * 3, Y - dy * Lg * 0.7 - dx * 3); g.stroke();
        } else if (a.hit === -2 && a.hx != null) {   // parata dallo scudo: scintille d'oro
          const k = (G.time - a.te) / 0.45; if (k >= 1) continue; const X = SX(a.hx, a.hy), Y = SY(a.hx, a.hy, a.hz);
          g.globalAlpha = 1 - k; g.fillStyle = '#ffe070'; for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2 + a.id; g.beginPath(); g.arc(X + Math.cos(t) * k * TW * 0.5, Y + Math.sin(t) * k * TW * 0.35 - k * TW * 0.2, 2.2, 0, 7); g.fill(); }
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, TW * 0.2 * (0.5 + k), 0, 7); g.stroke(); g.globalAlpha = 1;
        } else if (a.hit < 0 && a.hx != null) {
          const k = 1 - (G.time - a.te) / 4; if (k <= 0) continue; g.globalAlpha = Math.min(1, k * 2);
          const X = SX(a.hx, a.hy), Y = SY(a.hx, a.hy, a.hz), ddx = sx(a.x1, a.y1) - sx(a.x0, a.y0), ddy = sy(a.x1, a.y1) - sy(a.x0, a.y0), m = Math.hypot(ddx, ddy) || 1, ux = ddx / m, uy = ddy / m * 0.5 + 0.5;
          g.strokeStyle = '#5a3a1a'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(X, Y); g.lineTo(X - ux * TW * 0.3, Y - uy * TW * 0.3); g.stroke(); g.globalAlpha = 1;
        } else if (a.hit >= 0 && G.time - a.te < 0.6 && a.hx != null) {
          const k = (G.time - a.te) / 0.6, X = SX(a.hx, a.hy), Y = SY(a.hx, a.hy, a.hz);
          g.globalAlpha = 1 - k; g.fillStyle = '#ff4a3a'; for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * k * TW * 0.45, Y + Math.sin(t) * k * TW * 0.32, 2.6, 0, 7); g.fill(); }
          g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('-1 ❤', X, Y - TW * (0.5 + k * 0.6)); g.fillStyle = '#ff6a5a'; g.fillText('-1 ❤', X, Y - TW * (0.5 + k * 0.6)); g.globalAlpha = 1;
        }
      }
      // colpi di spada e martello (-1 ❤), schegge delle barricate, polvere di quelle nuove
      if (G.fx && G.fx.length) {
        const t1 = performance.now();
        for (const e of G.fx) {
          const k = (t1 - e.t0) / (e.k === 'hit' ? 650 : e.k === 'txt' ? 1400 : e.k === 'boom' ? 900 : 600); if (k >= 1 || !near(e.x, e.y, 24)) continue; const X = SX(e.x, e.y), Y = SY(e.x, e.y, zAt(e.x, e.y));
          g.globalAlpha = 1 - k;
          if (e.k === 'txt') { g.font = '900 16px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(40,20,0,.75)'; const ty = Y - TW * (2.6 + k * 0.8); g.strokeText(e.t, X, ty); g.fillStyle = '#ffd040'; g.fillText(e.t, X, ty); }
          else if (e.k === 'hit') { g.fillStyle = '#ff4a3a'; for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * k * TW * 0.4, Y - TW * 0.8 + Math.sin(t) * k * TW * 0.3, 2.6, 0, 7); g.fill(); }
            g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('-1 ❤', X, Y - TW * (1.2 + k * 0.6)); g.fillStyle = '#ff6a5a'; g.fillText('-1 ❤', X, Y - TW * (1.2 + k * 0.6)); }
          else if (e.k === 'boom') { g.fillStyle = '#b8a888'; for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * TW * (0.4 + k * 1.3), Y + Math.sin(t) * TW * (0.2 + k * 0.6) - k * TW * 0.3, TW * (0.3 - k * 0.15), 0, 7); g.fill(); } g.fillStyle = '#6a645a'; for (let i = 0; i < 8; i++) { const t = i * 0.8 + 0.3; g.fillRect(X + Math.cos(t) * TW * k * 1.6, Y - TW * (1.2 * k - 1.4 * k * k) + Math.sin(t) * TW * 0.4 * k, 5, 4); } }
          else if (e.k === 'spark') { g.fillStyle = '#ffe070'; for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * k * TW * 0.55, Y - TW * 0.6 + Math.sin(t) * k * TW * 0.35, 2.4, 0, 7); g.fill(); } }
          else if (e.k === 'dust') { g.fillStyle = '#c8b898'; for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t) * TW * (0.3 + k * 0.5), Y + Math.sin(t) * TW * (0.15 + k * 0.25), TW * (0.12 + k * 0.1), 0, 7); g.fill(); } }
          else { g.fillStyle = '#9a6c40'; const n = e.k === 'wreck' ? 10 : 5; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2 + 0.5, r = TW * (0.2 + k * 0.6); g.fillRect(X + Math.cos(t) * r - 2, Y - TW * 0.5 + Math.sin(t) * r * 0.6 + k * k * TW * 0.6, 5, 3); } }
          g.globalAlpha = 1;
        }
      }
      // anteprima della barricata (io genio, carica pronta): rombo verde dove la pianto, rosso se li' non si puo'
      if (clsOf(me) === 'n' && !dead(G, me) && !inIv(G) && (me.bwT || 0) <= G.time && !me.pu && !me.cl && !G.ld.some(l => l.st === 1 && l.c === me.id)) {
        const [bx2, by2] = frontCell(), ok = buildOk(G, me, bx2, by2), z = cqHc(bx2, by2) * HB;
        if (cqFloor[by2] && cqFloor[by2][bx2]) { g.beginPath(); [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => { const X = SX(bx2 + u, by2 + v), Y = SY(bx2 + u, by2 + v, z); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
          g.fillStyle = ok ? 'rgba(120,230,110,.22)' : 'rgba(230,80,60,.14)'; g.fill(); g.setLineDash([5, 4]); g.strokeStyle = ok ? 'rgba(150,255,140,.85)' : 'rgba(255,110,90,.6)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]); }
      }
      // colpo andato a segno (la mia freccia): crocetta bianca
      if (G.hm && performance.now() - G.hm.t < 380) { const k = (performance.now() - G.hm.t) / 380, X = SX(G.hm.x, G.hm.y), Y = SY(G.hm.x, G.hm.y, G.hm.z), s = 7 + 5 * k; g.globalAlpha = 1 - k; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(X - s, Y - s); g.lineTo(X - s / 3, Y - s / 3); g.moveTo(X + s, Y - s); g.lineTo(X + s / 3, Y - s / 3); g.moveTo(X - s, Y + s); g.lineTo(X - s / 3, Y + s / 3); g.moveTo(X + s, Y + s); g.lineTo(X + s / 3, Y + s / 3); g.stroke(); g.globalAlpha = 1; }
      // SASSI DELLA CATAPULTA: in volo (con l'ombra che cresce), cerchio rosso lampeggiante dove cadranno; se cade vicino a me (nemico) freccia rossa verso il punto
      for (const r of G.rk || []) {
        if (r.te || G.time < r.t0) continue; const u = Math.min(1, (G.time - r.t0) / r.d), x = r.x0 + (r.x1 - r.x0) * u, y = r.y0 + (r.y1 - r.y0) * u, z = r.z0 + (r.z1 - r.z0) * u + 4 * r.pk * u * (1 - u);
        const fl = 0.55 + 0.45 * Math.sin(now * 14), foe = r.t !== me.t, dm = Math.hypot(r.x1 - cq.x, r.y1 - cq.y);
        if (near(r.x1, r.y1, 26)) { ellipse(r.x1, r.y1, ROCK_R); g.fillStyle = 'rgba(230,40,30,' + (0.12 + 0.12 * fl * u) + ')'; g.fill(); g.setLineDash([8, 6]); g.lineDashOffset = -now * 20; g.strokeStyle = 'rgba(255,60,40,' + (0.5 + 0.4 * fl) + ')'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
          g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.3 * u) + ')'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * (0.15 + 0.2 * u), TW * (0.07 + 0.1 * u), 0, 0, 7); g.fill(); }
        if (near(x, y, 26)) { const X = SX(x, y), Y = SY(x, y, z), R = TW * 0.27; g.fillStyle = '#7a756c'; g.beginPath(); g.arc(X, Y, R, 0, 7); g.fill(); g.fillStyle = '#a29c90'; g.beginPath(); g.arc(X - R * 0.3, Y - R * 0.3, R * 0.45, 0, 7); g.fill(); g.strokeStyle = '#3a3630'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, R, 0, 7); g.stroke(); }
        if (foe && dm < 4 + ROCK_R && !dead(G, me)) {   // PERICOLO: arriva un sasso qui vicino
          const a = Math.atan2(r.y1 - cq.y, r.x1 - cq.x), [su, sv] = scrDir(a), X = sx(cq.x, cq.y), Y = sy(cq.x, cq.y) + cqZpx(cq.x, cq.y, TW) - TW * 0.4, k = TW * (dm < ROCK_R ? 0.6 : 1.0);
          g.save(); g.globalAlpha = fl; g.fillStyle = '#ff2a1a'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X + su * (k + TW * 0.45), Y + sv * (k + TW * 0.45)); g.lineTo(X + su * k - sv * TW * 0.22, Y + sv * k + su * TW * 0.22); g.lineTo(X + su * k + sv * TW * 0.22, Y + sv * k - su * TW * 0.22); g.closePath(); g.fill(); g.stroke();
          g.font = '900 15px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(60,0,0,.8)'; g.strokeText('⚠️ SASSO!', X, Y - TW * 2.45); g.fillStyle = '#ff5a40'; g.fillText('⚠️ SASSO!', X, Y - TW * 2.45); g.restore();
          if (!r.wS && u > 0.35) { r.wS = 1; beep(1300, 0.5, 0.03, 0, 'sine'); beep(700, 0.6, 0.03, 0.35, 'sine'); }
        }
      }
      // MIRA DELLA MACCHINA (catapulta o balestra): parabola dalla macchina, cerchio grande del sasso, "Breccia n/5" sul muro
      if (G.aim && G.aim.ok && G.aim.m) {
        const A = G.aim, O = A.o, cat = A.m === 'c', d0 = Math.hypot(A.x - O.x, A.y - O.y), z1 = zAt(A.x, A.y) + (cat ? 0.2 : 0.7), pk = cat ? 2.4 + 0.22 * d0 : arcPk(O.x, O.y, O.z, A.x, A.y, z1, 0.12 + 0.02 * d0);
        g.save(); g.setLineDash([7, 6]); g.lineDashOffset = -now * 30; g.strokeStyle = cat ? 'rgba(255,200,150,.95)' : 'rgba(255,240,200,.9)'; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 24; i++) { const u = i / 24, x = O.x + (A.x - O.x) * u, y = O.y + (A.y - O.y) * u, z = O.z + (z1 - O.z) * u + 4 * pk * u * (1 - u); i ? g.lineTo(SX(x, y), SY(x, y, z)) : g.moveTo(SX(x, y), SY(x, y, z)); }
        g.stroke(); g.restore();
        if (cat) { ellipse(A.x, A.y, ROCK_R); g.fillStyle = 'rgba(255,140,60,.18)'; g.fill(); g.strokeStyle = 'rgba(255,170,90,.95)'; g.lineWidth = 3; g.stroke(); }
        else { const X = sx(A.x, A.y), Y = sy(A.x, A.y); g.strokeStyle = A.tg ? 'rgba(255,90,70,.95)' : 'rgba(255,240,200,.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y, TW * 0.5, TW * 0.25, 0, 0, 7); g.stroke(); }
        const si = cat ? secAt(A.x, A.y) : -1, lab = cat && G.ct && G.ct.n <= 0 ? '🪨 Niente sassi: portane uno!' : si >= 0 ? '🧱 Breccia ' + (G.wl[si] || 0) + '/' + SEC_HP : '';
        if (lab) { const X = sx(A.x, A.y), Y = sy(A.x, A.y) - TW * 1.3; g.font = '800 14px system-ui,sans-serif'; const w = g.measureText(lab).width + 20; g.fillStyle = 'rgba(20,16,14,.82)'; cqRR(g, X - w / 2, Y - 13, w, 26, 9); g.fill(); g.fillStyle = '#ffd890'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, X, Y); }
      }
      // MIRA (io): traiettoria tratteggiata e cerchio d'arrivo
      if (G.aim && G.aim.ok && !G.aim.m) {
        const A = G.aim, p = { x: cq.x, y: cq.y }, z0 = (me.cl ? clZ(G, me) : zAt(p.x, p.y)) + 1.25, z1 = zAt(A.x, A.y) + 0.45, d0 = Math.hypot(A.x - p.x, A.y - p.y), pk = arcPk(p.x, p.y, z0, A.x, A.y, z1);   // la mira mostra gia' la parabola corretta
        g.save(); g.setLineDash([6, 6]); g.lineDashOffset = -now * 30; g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 2.5; g.beginPath();
        for (let i = 0; i <= 18; i++) { const u = i / 18, x = p.x + (A.x - p.x) * u, y = p.y + (A.y - p.y) * u, z = z0 + (z1 - z0) * u + 4 * pk * u * (1 - u); i ? g.lineTo(SX(x, y), SY(x, y, z)) : g.moveTo(SX(x, y), SY(x, y, z)); }
        g.stroke(); g.restore();
        const r = 0.25 + 0.06 * d0, X = sx(A.x, A.y), Y = sy(A.x, A.y); g.strokeStyle = A.tg ? 'rgba(255,90,70,.95)' : 'rgba(255,240,200,.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y, TW * r * 1.1, TW * r * 0.55, 0, 0, 7); g.stroke();
        if (A.tg) { g.beginPath(); g.ellipse(X, Y, TW * r * 0.5, TW * r * 0.25, 0, 0, 7); g.stroke(); }
      }
      // sagome di chi e' dietro alle mura
      for (const c of G.chars) {
        if (!c.alive || dead(G, c) || c.cl) continue; const p = P(c); if (!near(p.x, p.y, 20)) continue; if (c !== me && !MN.see(c.x, c.y)) continue;
        const z = zAt(p.x, p.y), xi = Math.floor(p.x), yi = Math.floor(p.y); let hid = false;
        for (const [dx, dy] of [[1, 1], [1, 2], [2, 1], [2, 2], [0, 1], [1, 0], [2, 3], [3, 2]]) if (cqHc(xi + dx, yi + dy) * HB > z + 1.4) { hid = true; break; }
        if (!hid) continue;
        g.globalAlpha = 0.5; cqPlayer(g, sx(p.x, p.y), sy(p.x, p.y), TW, c === me ? cqLook() : cqLookOf(c), c === me ? cq.walk : c.walk, c === me ? cq.face : c.face); g.globalAlpha = 1;
        g.strokeStyle = TEAMS[c.t || 0].c; g.lineWidth = 2; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(sx(p.x, p.y), sy(p.x, p.y), TW * 0.34, TW * 0.17, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
      }
      // scale appoggiate (per chi difende) e argano in pericolo: segnali rossi
      if (!isAtk(G, me)) {
        for (const l of G.ld) if (l.st === 2) { const S = MP().spots[l.s]; if (!near(S.tx, S.ty, 22)) continue; sign(g, SX(S.tx, S.ty), SY(S.tx, S.ty, WZ * HB) - TW * (1.9 + 0.12 * Math.sin(now * 5)), '🪜'); }
        if (G.chars.some(c => c.pu && c.pu.k === 'lever') && near(LEV.x, LEV.y, 22)) sign(g, SX(LEV.x + 0.5, LEV.y + 0.5), SY(LEV.x + 0.5, LEV.y + 0.5, TZ * HB) - TW * (2.2 + 0.12 * Math.sin(now * 5)), '⚙️');
      }
      // l'ARIETE IN FIAMME
      if (ramFire(G) && near(RAM_X, G.rm.y, 24)) { for (let i = 0; i < 16; i++) { const x = RAM_X - 1 + (i * 0.37 % 2), y = G.rm.y - 1.6 + ((i * 1.31) % 3.4), h = (0.6 + 0.8 * Math.abs(Math.sin(now * 8 + i))) * TW * 0.9, X = SX(x, y), Y = SY(x, y, 1.2 + (i % 3) * 0.4); g.globalAlpha = 0.9; g.fillStyle = i % 3 ? '#ff7a18' : '#ffd040'; g.beginPath(); g.moveTo(X - TW * 0.15, Y); g.quadraticCurveTo(X, Y - h * 0.7, X, Y - h * 1.2); g.quadraticCurveTo(X, Y - h * 0.7, X + TW * 0.15, Y); g.fill(); } g.globalAlpha = 1; }
      // la PORTICINA (per chi difende): cartello sopra le due porte
      if (!isAtk(G, me) && !dead(G, me)) for (const [x, y] of [[PORT.ix, PORT.iy], [PORT.ox, PORT.oy]]) if (near(x, y, 9)) { const X = sx(x, y), Y = sy(x, y) - TW * (1.6 + 0.08 * Math.sin(now * 4)); g.fillStyle = 'rgba(40,90,40,.92)'; g.beginPath(); g.arc(X, Y, 12, 0, 7); g.fill(); g.font = '13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('🚪', X, Y + 1); }
      // FARETRA VUOTA: freccia verso la cesta piu' vicina
      if (clsOf(me) === 'a' && me.q === 0 && !dead(G, me) && !inIv(G)) { const b = nearQuiv(cq.x, cq.y); if (b) SQ.edge(g, sx(b[0], b[1]), sy(b[0], b[1]) - TW, W2, H2, '🏹', '#c8a040'); }
      if (!dead(G, me) && !inIv(G)) { const o = objective(G); if (o) SQ.edge(g, sx(o.x, o.y), sy(o.x, o.y) - TW, W2, H2, o.i, o.c); }
      if (G.myHurt && performance.now() - G.myHurt < 450) { const k = 1 - (performance.now() - G.myHurt) / 450; g.strokeStyle = 'rgba(230,30,30,' + (0.55 * k) + ')'; g.lineWidth = 16; g.strokeRect(0, 0, W2, H2); }
      { const W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0);   // scritte e radar in pixel dello schermo (anche con la visuale allargata)
      if (G.zn) { const t = performance.now() - G.zn.t; if (t < 2200) { const a = Math.min(1, t / 200, (2200 - t) / 500); g.globalAlpha = a; const tx = G.zn.n.toUpperCase(); g.font = '800 13px system-ui,sans-serif'; const w = g.measureText(tx).width + 26; g.fillStyle = 'rgba(20,18,16,.7)'; cqRR(g, W2 / 2 - w / 2, H2 * 0.62 - 14, w, 28, 10); g.fill(); g.fillStyle = '#f2e2b8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, W2 / 2, H2 * 0.62); g.globalAlpha = 1; } else G.zn = null; }
      annDraw(g, G, W2, H2);
      minimap(g, G, W2);
      g.restore(); }
    }
  };
  // l'obiettivo del momento (freccia sul bordo)
  function objective(G) {
    const me = G.me, M = MP(), z = zoneAt(cq.x, cq.y), T = TEAMS[me.t], E = TEAMS[1 - me.t];
    if (G.ph >= 2 && G.ph <= 3) { const Z = G.ph === 2 ? Z2 : Z3; return { x: Z.x, y: Z.y, i: G.ph === 2 ? '⚔️' : '👑', c: isAtk(G, me) ? T.c : E.c }; }
    if (isAtk(G, me)) {
      if (G.ld.some(l => l.st === 1 && l.c === me.id)) { const s = M.spots.find((S, i) => spotFree(G, i) && spotOk(S)); return s ? { x: s.ax, y: s.ay, i: '🪜', c: T.c } : null; }
      if (z !== 'out') return { x: LEV.x + 0.5, y: LEV.y + 0.5, i: '⚙️', c: T.c };
      return { x: RAM_X, y: ramBack(G.rm) + 0.5, i: '🐏', c: T.c };
    }
    const lv = G.chars.find(c => c.pu && c.pu.k === 'lever'); if (lv) return { x: LEV.x + 0.5, y: LEV.y + 0.5, i: '⚙️', c: '#e04030' };
    const l = G.ld.filter(l => l.st === 2).sort((a, b) => Math.hypot(M.spots[a.s].tx - cq.x, M.spots[a.s].ty - cq.y) - Math.hypot(M.spots[b.s].tx - cq.x, M.spots[b.s].ty - cq.y))[0];
    if (l) return { x: M.spots[l.s].tx, y: M.spots[l.s].ty, i: '🪜', c: '#e04030' };
    if (z !== 'wall') return { x: 29.5, y: 50.2, i: '🏰', c: T.c };
    return null;
  }
  // ---- disegni: ariete, cartello, cuori, arco, stendardo, annunci ----
  function ramDraw(g, X, Y, TW, G) {   // ARIETE coperto su ruote (circa 2,6 x 4 caselle lungo y): tetto di pelli, il tronco con la testa di montone di ferro che dondola e colpisce
    const U = TW * 0.575, K = 1.3, Pp = (u, v, z) => [X + (u - v) * K * TW / 2, Y + (u + v) * K * TW / 4 - z * K * U];
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { const [a, b] = Pp(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); };
    const ln = (a, b, col, w) => { const [x1, y1] = Pp(...a), [x2, y2] = Pp(...b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const at = G.ph === 1 && G.rm.y <= RAM_Y1 + 0.05, sw = at ? Math.max(0, 1 - (G.time - G.rm.hit) / 0.35) : 0, push = G.rm.n > 0, sway = push ? Math.sin(performance.now() / 160) * 0.06 : 0;
    const head = -1.85 - 0.45 * sw + (at ? 0.3 + 0.6 * (G.rm.pl || 0) * (1 - sw) : 0) + sway;   // caricando, il tronco si tira indietro
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y + TW * 0.08, TW * 1.75, TW * 0.8, 0, 0, 7); g.fill();
    // il tronco con la testa di montone (dietro, verso il portone)
    ln([0, head + 0.25, 0.95], [0, 1.4, 0.95], '#5a3818', TW * 0.34); ln([0, head + 0.25, 1.05], [0, 1.4, 1.05], '#7a5028', TW * 0.12);
    { const [e, f] = Pp(0, head, 0.95); g.fillStyle = '#3a3e44'; g.beginPath(); g.ellipse(e, f, TW * 0.27, TW * 0.22, 0, 0, 7); g.fill(); g.strokeStyle = '#5a6068'; g.lineWidth = Math.max(2, TW / 14); g.beginPath(); g.arc(e - TW * 0.16, f - TW * 0.05, TW * 0.13, Math.PI * 0.3, Math.PI * 1.6); g.stroke(); g.beginPath(); g.arc(e + TW * 0.16, f - TW * 0.05, TW * 0.13, -Math.PI * 0.6, Math.PI * 0.7); g.stroke(); g.fillStyle = '#e8c040'; g.beginPath(); g.arc(e - TW * 0.06, f - TW * 0.04, 2, 0, 7); g.arc(e + TW * 0.06, f - TW * 0.04, 2, 0, 7); g.fill(); }
    if (sw > 0.5) { const [e, f] = Pp(0, head - 0.25, 1.0); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = TW * 0.5 * (1.6 - sw); g.fillStyle = i % 2 ? '#ffe080' : '#c8a070'; g.beginPath(); g.arc(e + Math.cos(a) * r, f + Math.sin(a) * r * 0.6, 2.5, 0, 7); g.fill(); } }
    // ruote
    for (const [u, v] of [[-1.05, -1.25], [1.05, -1.25], [-1.05, 1.25], [1.05, 1.25]]) { const [a, b] = Pp(u, v, 0.36); g.fillStyle = '#2e1c0e'; g.beginPath(); g.ellipse(a, b, TW * 0.17, TW * 0.36, 0.5 * (u > 0 ? 1 : -1), 0, 7); g.fill(); g.strokeStyle = '#6a4626'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#8a6036'; g.beginPath(); g.ellipse(a, b, TW * 0.05, TW * 0.1, 0, 0, 7); g.fill(); }
    // telaio, montanti, tetto a capanna coperto di pelli a strisce
    poly([[-1, -1.6, 0.6], [1, -1.6, 0.6], [1, 1.6, 0.6], [-1, 1.6, 0.6]], '#5a3a20');
    for (const [u, v] of [[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5], [-1, 0], [1, 0]]) ln([u, v, 0.6], [u, v, 1.5], '#4a2a14', Math.max(3, TW / 12));
    poly([[-1.2, -1.75, 1.45], [-1.2, 1.75, 1.45], [0, 1.75, 2.5], [0, -1.75, 2.5]], '#8a6a42');
    poly([[1.2, -1.75, 1.45], [1.2, 1.75, 1.45], [0, 1.75, 2.5], [0, -1.75, 2.5]], '#b8925a');
    for (let i = 0; i < 6; i++) { const v = -1.6 + i * 0.64; ln([0.08, v, 2.45], [1.15, v + 0.06, 1.5], 'rgba(60,36,16,.55)', 2); }
    ln([0, -1.75, 2.52], [0, 1.75, 2.52], '#5a3a20', Math.max(3, TW / 12));
    poly([[-1.2, 1.75, 1.45], [1.2, 1.75, 1.45], [0, 1.75, 2.5]], '#7a5230');
    poly([[-1, 1.6, 0.6], [1, 1.6, 0.6], [1, 1.6, 1.45], [-1, 1.6, 1.45]], 'rgba(20,12,6,.6)');
    // lo stendardo di chi attacca sulla cima
    { const [a, b] = Pp(0, 1.5, 2.5), col = TEAMS[atkT(G)].c, fl = Math.sin(performance.now() / 300) * 3; g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(a, b - TW * 0.9); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(a, b - TW * 0.9); g.lineTo(a + TW * 0.45, b - TW * 0.8 + fl); g.lineTo(a, b - TW * 0.62); g.fill(); }
  }
  // CATAPULTA (mangano): telaio su 4 ruote, due montanti, il braccio col cucchiaio che scatta in avanti (verso il castello, -y) e torna giu' mentre si ricarica.
  // Sassi pronti nella cesta di lato, stendardo di chi attacca, barra della vita se e' danneggiata; distrutta = rottami che spariscono piano
  function ctDraw(g, X, Y, TW, G) {
    const T = G.ct; if (!T) return; const U = TW * 0.575, K = 1.35, Pp = (u, v, z) => [X + (u - v) * K * TW / 2, Y + (u + v) * K * TW / 4 - z * K * U];   // K: grande come l'ariete
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { const [a, b] = Pp(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); };
    const ln = (a, b, col, w) => { const [x1, y1] = Pp(...a), [x2, y2] = Pp(...b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    if (T.dn) {   // rottami
      const k = Math.max(0, 1 - (G.time - (T.dn - CT_RESP)) / 4); if (k <= 0) return; g.save(); g.globalAlpha = k;
      for (let i = 0; i < 6; i++) { const a = i * 1.1, r = 0.2 + (i % 3) * 0.25; ln([Math.cos(a) * r - 0.3, Math.sin(a) * r, 0.05], [Math.cos(a) * r + 0.3, Math.sin(a) * r + 0.1, 0.12], i % 2 ? '#5a3a20' : '#7a5230', Math.max(3, TW / 10)); }
      g.fillStyle = 'rgba(40,36,32,.5)'; g.beginPath(); g.arc(X, Y - TW * 0.4, TW * 0.5, 0, 7); g.fill(); g.restore(); return;
    }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y + TW * 0.05, TW * 0.95, TW * 0.48, 0, 0, 7); g.fill();
    for (const [u, v] of [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.55], [0.62, 0.55]]) { const [a, b] = Pp(u, v, 0.26); g.fillStyle = '#2e1c0e'; g.beginPath(); g.ellipse(a, b, TW * 0.12, TW * 0.26, 0.5 * (u > 0 ? 1 : -1), 0, 7); g.fill(); g.strokeStyle = '#6a4626'; g.lineWidth = 2; g.stroke(); }
    poly([[-0.55, -0.75, 0.35], [0.55, -0.75, 0.35], [0.55, 0.75, 0.35], [-0.55, 0.75, 0.35]], '#6a4626');
    poly([[-0.55, 0.75, 0.2], [0.55, 0.75, 0.2], [0.55, 0.75, 0.38], [-0.55, 0.75, 0.38]], '#4a2e16'); poly([[0.55, -0.75, 0.2], [0.55, 0.75, 0.2], [0.55, 0.75, 0.38], [0.55, -0.75, 0.38]], '#5a3a20');
    for (const u of [-0.45, 0.45]) { ln([u, -0.25, 0.35], [u, -0.25, 1.45], '#4a2a14', Math.max(3, TW / 11)); ln([u, 0.35, 0.35], [u, -0.2, 1.4], '#5a3a1e', Math.max(2, TW / 16)); }
    ln([-0.5, -0.25, 1.38], [0.5, -0.25, 1.38], '#7a5230', Math.max(4, TW / 9));
    // il braccio: a riposo indietro e in basso; quando tira scatta in avanti contro la traversa, poi torna giu' durante la ricarica
    const tf = G.time - T.arm, ready = T.rl <= G.time, up = tf < 0.18 ? tf / 0.18 : tf < 0.5 ? 1 : ready ? 0 : Math.max(0, 1 - (tf - 0.5) / Math.max(0.5, T.rl - T.arm - 0.5));
    const th = 0.35 + 1.75 * up, pv = [0, 0.15, 0.55], L = 1.25, end = [0, pv[1] + Math.cos(th) * L, pv[2] + Math.sin(th) * L];
    ln(pv, end, '#8a5a2e', Math.max(4, TW / 9)); ln([-0.2, pv[1], pv[2]], [0.2, pv[1], pv[2]], '#3a2412', Math.max(5, TW / 8));
    { const [a, b] = Pp(...end); g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(a, b, TW * 0.2, TW * 0.12, 0, 0, 7); g.fill(); if (ready && T.n > 0) { g.fillStyle = '#8a8478'; g.beginPath(); g.arc(a, b - TW * 0.08, TW * 0.15, 0, 7); g.fill(); g.fillStyle = '#a8a296'; g.beginPath(); g.arc(a - TW * 0.05, b - TW * 0.12, TW * 0.06, 0, 7); g.fill(); } }
    // la cesta coi sassi di scorta
    { const [a, b] = Pp(0.85, 0.3, 0.2); g.fillStyle = '#7a5a32'; g.beginPath(); g.ellipse(a, b, TW * 0.22, TW * 0.12, 0, 0, 7); g.fill(); for (let i = 0; i < Math.max(0, T.n - (ready ? 1 : 0)); i++) { g.fillStyle = i % 2 ? '#8a8478' : '#9a948a'; g.beginPath(); g.arc(a - TW * 0.1 + i * TW * 0.1, b - TW * 0.06, TW * 0.08, 0, 7); g.fill(); } }
    { const [a, b] = Pp(-0.5, 0.7, 0.38), col = TEAMS[atkT(G)].c, fl = Math.sin(performance.now() / 300) * 3; g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(a, b - TW * 1.1); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(a, b - TW * 1.1); g.lineTo(a + TW * 0.4, b - TW * 1.0 + fl); g.lineTo(a, b - TW * 0.84); g.fill(); }
    if (T.hp < CT_HP) { const bw = 46, [a, b] = Pp(0, 0, 2.4); g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, a - bw / 2 - 2, b - 4, bw + 4, 8, 4); g.fill(); g.fillStyle = T.hp > CT_HP / 3 ? '#e8b040' : '#e84030'; cqRR(g, a - bw / 2, b - 2, bw * T.hp / CT_HP, 4, 2); g.fill(); }
  }
  // TORRE D'ASSEDIO: base su 4 ruote, castello di travi alto piu' delle mura, fronte coperto di pelli, piattaforma coi merli di legno,
  // ponte levatoio in cima: alzato mentre la si spinge, abbassato sul camminamento quando e' attraccata. Stendardo, vita; distrutta = rottami
  function towDraw(g, X, Y, TW, G) {
    const T = G.tw; if (!T) return; const U = TW * 0.575, Pp = (u, v, z) => [X + (u - v) * TW / 2, Y + (u + v) * TW / 4 - z * U];
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { const [a, b] = Pp(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); };
    const ln = (a, b, col, w) => { const [x1, y1] = Pp(...a), [x2, y2] = Pp(...b); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    if (T.dn) { const k = Math.max(0, 1 - (G.time - (T.dn - TW_RESP)) / 4); if (k <= 0) return; g.save(); g.globalAlpha = k; for (let i = 0; i < 9; i++) { const a = i * 0.8, r = 0.3 + (i % 3) * 0.35; ln([Math.cos(a) * r - 0.4, Math.sin(a) * r, 0.05], [Math.cos(a) * r + 0.4, Math.sin(a) * r + 0.1, 0.2], i % 2 ? '#5a3a20' : '#7a5230', Math.max(3, TW / 9)); } g.restore(); return; }
    const H = 4.1, B = 0.95;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y + TW * 0.05, TW * 1.3, TW * 0.62, 0, 0, 7); g.fill();
    for (const [u, v] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) { const [a, b] = Pp(u, v, 0.28); g.fillStyle = '#2e1c0e'; g.beginPath(); g.ellipse(a, b, TW * 0.14, TW * 0.28, 0.5 * (u > 0 ? 1 : -1), 0, 7); g.fill(); g.strokeStyle = '#6a4626'; g.lineWidth = 2; g.stroke(); }
    // facce in vista: sud (dove si entra, con la scala dentro) ed est; poi la piattaforma in cima
    poly([[-B, B, 0.3], [B, B, 0.3], [B, B, H], [-B, B, H]], '#7a5530');
    poly([[B, -B, 0.3], [B, B, 0.3], [B, B, H], [B, -B, H]], '#6a4628');
    { const L = []; for (const z of [1.4, 2.7]) { L.push([[-B, B, z], [B, B, z]], [[B, -B, z], [B, B, z]]); } for (const u of [-0.5, 0, 0.5]) L.push([[u, B, 0.3], [u, B, H]]); for (const v of [-0.5, 0, 0.5]) L.push([[B, v, 0.3], [B, v, H]]); for (const [a, b] of L) ln(a, b, 'rgba(40,24,10,.45)', 1.5); }
    poly([[-0.35, B + 0.001, 0.3], [0.35, B + 0.001, 0.3], [0.35, B + 0.001, 1.35], [-0.35, B + 0.001, 1.35]], '#2a1a0c');   // l'entrata
    for (let i = 0; i < 4; i++) ln([-0.2, B + 0.002, 0.45 + i * 0.26], [0.2, B + 0.002, 0.45 + i * 0.26], '#a8743a', 2);
    for (const [u, v] of [[-B, B], [B, B], [B, -B]]) ln([u, v, 0.3], [u, v, H + 0.1], '#4a2a14', Math.max(3, TW / 12));
    poly([[-B, -B, H], [B, -B, H], [B, B, H], [-B, B, H]], '#8a6a42');
    for (let i = 0; i < 4; i++) { const u = -B + 0.1 + i * 0.5; poly([[u, B, H], [u + 0.3, B, H], [u + 0.3, B, H + 0.4], [u, B, H + 0.4]], '#6a4a28'); const v = -B + 0.1 + i * 0.5; poly([[B, v, H], [B, v + 0.3, H], [B, v + 0.3, H + 0.4], [B, v, H + 0.4]], '#5a3a20'); }
    // ponte: alzato (dritto sul fronte nord) o abbassato sulle mura
    if (T.dk) { poly([[-0.65, -B, H - 0.1], [0.65, -B, H - 0.1], [0.65, -B - 2.05, WZ * HB + 0.02], [-0.65, -B - 2.05, WZ * HB + 0.02]], '#9a7a4a'); for (let i = 1; i < 6; i++) { const v = -B - i * 0.34, z = H - 0.1 - (H - 0.1 - WZ * HB) * i / 6; ln([-0.65, v, z], [0.65, v, z], 'rgba(40,24,10,.5)', 1.5); } }
    else poly([[-0.65, -B, H - 0.1], [0.65, -B, H - 0.1], [0.65, -B, H + 1.7], [-0.65, -B, H + 1.7]], '#8a6a42');
    { const [a, b] = Pp(0.6, 0.6, H + 0.4), col = TEAMS[atkT(G)].c, fl = Math.sin(performance.now() / 300) * 3; g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, b); g.lineTo(a, b - TW * 1.1); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(a, b - TW * 1.1); g.lineTo(a + TW * 0.45, b - TW * 1.0 + fl); g.lineTo(a, b - TW * 0.82); g.fill(); }
    if (T.hp < TW_HP) { const bw = 52, [a, b] = Pp(0, 0, H + 2.3); g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, a - bw / 2 - 2, b - 4, bw + 4, 8, 4); g.fill(); g.fillStyle = T.hp > TW_HP / 3 ? '#e8b040' : '#e84030'; cqRR(g, a - bw / 2, b - 2, bw * T.hp / TW_HP, 4, 2); g.fill(); }
  }
  // BALESTRA A TORRETTA: treppiede, fusto e archi girati verso dove ha tirato l'ultima volta, dardo pronto; distrutta = grigia e storta
  function balDraw(g, X, Y, TW, G, i) {
    const S = G.bl && G.bl[i]; if (!S) return; const dn = !!S.dn, [u, v] = scrDir(S.a == null ? Math.PI / 2 : S.a), cy = Y - TW * 0.7;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y, TW * 0.45, TW * 0.22, 0, 0, 7); g.fill();
    g.strokeStyle = dn ? '#5a5650' : '#4a2e16'; g.lineWidth = Math.max(3, TW / 12); g.beginPath(); for (const a of [0.6, 2.6, 4.6]) { g.moveTo(X, cy); g.lineTo(X + Math.cos(a) * TW * 0.42, Y + Math.sin(a) * TW * 0.18); } g.stroke();
    if (dn) { g.strokeStyle = '#6a645a'; g.lineWidth = Math.max(4, TW / 9); g.beginPath(); g.moveTo(X - TW * 0.4, cy + TW * 0.3); g.lineTo(X + TW * 0.35, cy + TW * 0.05); g.stroke(); return; }
    const L = TW * 0.8, bx = X - u * L * 0.35, by = cy - v * L * 0.35, fx = X + u * L * 0.6, fy = cy + v * L * 0.6, px = -v, py = u;
    g.strokeStyle = '#6a4626'; g.lineWidth = Math.max(4, TW / 9); g.beginPath(); g.moveTo(bx, by); g.lineTo(fx, fy); g.stroke();
    const ax = X + u * L * 0.35, ay = cy + v * L * 0.35, w = TW * 0.55;
    g.strokeStyle = '#8a5a2e'; g.lineWidth = Math.max(3, TW / 12); g.beginPath(); g.moveTo(ax + px * w, ay + py * w * 0.6); g.quadraticCurveTo(ax + u * TW * 0.15, ay + v * TW * 0.15, ax - px * w, ay - py * w * 0.6); g.stroke();
    const ready = S.rl <= G.time, sb = ready ? 0.15 : 0.0;
    g.strokeStyle = 'rgba(240,230,210,.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax + px * w, ay + py * w * 0.6); g.lineTo(X - u * L * sb, cy - v * L * sb); g.lineTo(ax - px * w, ay - py * w * 0.6); g.stroke();
    if (ready) { g.strokeStyle = '#3a2412'; g.lineWidth = Math.max(3, TW / 14); g.beginPath(); g.moveTo(X - u * L * 0.15, cy - v * L * 0.15); g.lineTo(fx + u * TW * 0.15, fy + v * TW * 0.15); g.stroke(); g.fillStyle = '#c8ccd2'; g.beginPath(); g.arc(fx + u * TW * 0.18, fy + v * TW * 0.18, 3, 0, 7); g.fill(); }
    if (S.hp < BAL_HP) { const bw = 34; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - bw / 2 - 2, Y - TW * 1.55, bw + 4, 8, 4); g.fill(); g.fillStyle = '#e8b040'; cqRR(g, X - bw / 2, Y - TW * 1.55 + 2, bw * S.hp / BAL_HP, 4, 2); g.fill(); }
  }
  function sign(g, X, Y, ic) { g.fillStyle = 'rgba(200,40,30,.92)'; g.beginPath(); g.arc(X, Y, 12, 0, 7); g.fill(); g.font = '13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ic, X, Y + 1); }
  function hearts(g, X, Y, hp, sf, mx) {
    mx = mx || HP; const s = 5.2, gap = 13, x0 = X - gap * (mx - 1) / 2;
    g.save(); if (sf) g.globalAlpha = 0.55 + 0.35 * Math.sin(performance.now() / 90);
    for (let i = 0; i < mx; i++) {
      const cx = x0 + i * gap, on = i < hp;
      g.beginPath(); g.moveTo(cx, Y + s * 0.95); g.bezierCurveTo(cx - s * 1.5, Y - s * 0.1, cx - s * 0.8, Y - s * 1.25, cx, Y - s * 0.45); g.bezierCurveTo(cx + s * 0.8, Y - s * 1.25, cx + s * 1.5, Y - s * 0.1, cx, Y + s * 0.95); g.closePath();
      g.fillStyle = on ? '#ff3b4e' : 'rgba(30,20,24,.55)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = on ? '#7a0a18' : 'rgba(255,255,255,.45)'; g.stroke();
      if (on) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - s * 0.45, Y - s * 0.35, s * 0.25, 0, 7); g.fill(); }
    }
    g.restore();
  }
  function bow(g, X, Y, TW, f) {
    const r = TW * 0.28, a = 1.0, cx = X - f * r * 0.5, ex = cx + f * Math.cos(a) * r;
    g.strokeStyle = '#6a3a18'; g.lineWidth = Math.max(2, TW / 20); g.beginPath(); if (f > 0) g.arc(cx, Y, r, -a, a); else g.arc(cx, Y, r, Math.PI - a, Math.PI + a); g.stroke();
    g.strokeStyle = 'rgba(240,230,210,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ex, Y - Math.sin(a) * r); g.lineTo(ex, Y + Math.sin(a) * r); g.stroke();
  }
  // ---- le armi delle classi (disegnate sopra al personaggio) ----
  const scrDir = a => { const dx = Math.cos(a), dy = Math.sin(a), u = dx - dy, v = (dx + dy) / 2, m = Math.hypot(u, v) || 1; return [u / m, v / m]; };
  function weapon(g, c, X, Y, TW, f, G) {
    const k = clsOf(c), sw = c.sw != null ? G.time - c.sw : 9, col = TEAMS[c.t || 0].c;
    if (k === 'a') { bow(g, X + f * TW * 0.26, Y - TW * 0.72, TW, f); return; }
    if (k === 'g') {
      if (c.sd) { const [u, v] = scrDir(c.sdA || 0), sh = (c.pmT || 0) > G.time; if (sh) { g.save(); g.globalAlpha = 0.5; } shieldUp(g, X + u * TW * 0.3, Y - TW * (v < 0 ? 0.55 : 0.5) + v * TW * 0.2, TW, sh ? '#6a6460' : col, v < 0); if (sh) g.restore(); }
      else roundShield(g, X - f * TW * 0.22, Y - TW * 0.6, TW * 0.17, col);
      if (sw < 0.28) slash(g, X, Y, TW, c.swA || 0, sw / 0.28, '#ffffff');
      else if (!c.sd) sword(g, X + f * TW * 0.27, Y - TW * 0.6, TW, f);
      return;
    }
    const fixing = c.pu && c.pu.k === 'fix', ph = fixing ? (G.time * 2.6 + c.id * 0.3) % 1 : sw < 0.3 ? sw / 0.3 : -1;
    hammer(g, X + f * TW * 0.26, Y - TW * 0.58, TW, f, ph);
    if (sw < 0.3) slash(g, X, Y, TW, c.swA || 0, sw / 0.3, '#ffe2a8');
    if (fixing && ph > 0.4 && ph < 0.55) { g.fillStyle = '#ffe080'; for (let i = 0; i < 5; i++) { const a = i * 1.3 + G.time * 7; g.beginPath(); g.arc(X + f * TW * 0.55 + Math.cos(a) * TW * 0.18, Y - TW * 0.42 + Math.sin(a) * TW * 0.1, 1.8, 0, 7); g.fill(); } }
  }
  function sword(g, x, y, TW, f) {
    const L = TW * 0.64, ux = f * 0.33, uy = -0.94;
    g.lineCap = 'round';
    g.strokeStyle = '#4a3020'; g.lineWidth = Math.max(2, TW / 15); g.beginPath(); g.moveTo(x - ux * TW * 0.12, y - uy * TW * 0.12); g.lineTo(x, y); g.stroke();
    g.strokeStyle = '#c8a040'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.moveTo(x + uy * TW * 0.12, y - ux * TW * 0.12); g.lineTo(x - uy * TW * 0.12, y + ux * TW * 0.12); g.stroke();
    g.strokeStyle = '#e2e7ee'; g.lineWidth = Math.max(2.5, TW / 12); g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * L, y + uy * L); g.stroke();
    g.strokeStyle = 'rgba(110,120,135,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + ux * 2, y + uy * 2); g.lineTo(x + ux * L * 0.92, y + uy * L * 0.92); g.stroke();
    g.lineCap = 'butt';
  }
  function roundShield(g, x, y, r, col) {
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = Math.max(1.5, r / 4); g.strokeStyle = '#9a9488'; g.stroke();
    g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
  }
  function shieldUp(g, x, y, TW, col, back) {   // scudo alzato a mandorla, girato verso il nemico
    const w = TW * 0.24, h = TW * 0.34;
    g.beginPath(); g.moveTo(x - w, y - h * 0.8); g.quadraticCurveTo(x, y - h * 1.05, x + w, y - h * 0.8); g.lineTo(x + w * 0.92, y); g.quadraticCurveTo(x + w * 0.5, y + h * 0.75, x, y + h); g.quadraticCurveTo(x - w * 0.5, y + h * 0.75, x - w * 0.92, y); g.closePath();
    g.fillStyle = back ? '#5a4030' : col; g.fill(); g.lineWidth = Math.max(2, TW / 18); g.strokeStyle = '#d8d0bc'; g.stroke();
    if (!back) { g.strokeStyle = 'rgba(255,240,200,.85)'; g.lineWidth = Math.max(1.5, TW / 26); g.beginPath(); g.moveTo(x, y - h * 0.85); g.lineTo(x, y + h * 0.8); g.moveTo(x - w * 0.8, y - h * 0.3); g.lineTo(x + w * 0.8, y - h * 0.3); g.stroke(); }
  }
  function hammer(g, x, y, TW, f, ph) {
    const a = (-0.45 + (ph < 0 ? 0 : 1.8 * Math.sin(ph * Math.PI))) * f, L = TW * 0.48, ux = Math.sin(a), uy = -Math.cos(a), ex = x + ux * L, ey = y + uy * L;
    g.lineCap = 'round'; g.strokeStyle = '#7a5230'; g.lineWidth = Math.max(2, TW / 15); g.beginPath(); g.moveTo(x - ux * TW * 0.08, y - uy * TW * 0.08); g.lineTo(ex, ey); g.stroke();
    g.lineCap = 'butt'; g.strokeStyle = '#5a6068'; g.lineWidth = TW * 0.17; g.beginPath(); g.moveTo(ex - uy * TW * 0.14, ey + ux * TW * 0.14); g.lineTo(ex + uy * TW * 0.14, ey - ux * TW * 0.14); g.stroke();
    g.strokeStyle = '#8a9098'; g.lineWidth = TW * 0.05; g.beginPath(); g.moveTo(ex - uy * TW * 0.13 - ux * TW * 0.05, ey + ux * TW * 0.13 - uy * TW * 0.05); g.lineTo(ex + uy * TW * 0.13 - ux * TW * 0.05, ey - ux * TW * 0.13 - uy * TW * 0.05); g.stroke();
  }
  function slash(g, X, Y, TW, a, u, col) {   // il fendente: mezzaluna che spazza davanti, verso il colpo
    const [sx2, sy2] = scrDir(a), sa = Math.atan2(sy2, sx2), R = TW * 0.85, cy = Y - TW * 0.45, a0 = sa - 1.2, a1 = a0 + 2.4 * Math.min(1, u * 1.8);
    g.save(); g.lineCap = 'round'; g.globalAlpha = Math.max(0, 1 - u * 0.7);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = TW * 0.2; g.beginPath(); g.ellipse(X, cy + 2, R, R * 0.62, 0, a0, a1); g.stroke();
    g.strokeStyle = col; g.lineWidth = TW * 0.16; g.beginPath(); g.ellipse(X, cy, R, R * 0.62, 0, a0, a1); g.stroke();
    g.globalAlpha *= 0.5; g.lineWidth = TW * 0.36; g.beginPath(); g.ellipse(X, cy, R * 0.82, R * 0.5, 0, a0 + 0.25, a1); g.stroke();
    g.restore();
  }
  function banner(g, X, Y, TW, col, t) {
    const u = TW / 34, h = 64 * u, sw = Math.sin(t * 2.5) * 1.8 * u;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 8 * u, 3.5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(X - 1.8 * u, Y - h, 3.6 * u, h); g.fillRect(X - 11 * u, Y - h, 22 * u, 3 * u);
    g.fillStyle = col; g.beginPath(); g.moveTo(X - 10 * u, Y - h + 3 * u); g.lineTo(X + 10 * u, Y - h + 3 * u); g.lineTo(X + 10 * u + sw, Y - h + 30 * u); g.lineTo(X + sw, Y - h + 24 * u); g.lineTo(X - 10 * u + sw, Y - h + 30 * u); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = Math.round(12 * u) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', X + sw * 0.5, Y - h + 14 * u);
  }
  // ANNUNCIO: nastro rosso e oro in alto (uno alla volta), entra e sparisce piano
  function annDraw(g, G, W2, H2) {
    const Q = G.annQ; if (!Q || !Q.length) return;
    const A = Q[0], now = performance.now(); if (!A.t0) A.t0 = now; const t = now - A.t0, D = 2600;
    if (t > D) { Q.shift(); return; }
    const a = Math.min(1, t / 180, (D - t) / 400), sc = 0.9 + 0.1 * Math.min(1, t / 180), y = H2 * 0.3;
    g.save(); g.globalAlpha = a; g.translate(W2 / 2, y); g.scale(sc, sc);
    g.font = '900 19px Georgia,serif'; const w = Math.min(W2 - 40, Math.max(g.measureText(A.t).width + 54, 220)), h = A.sub ? 58 : 40;
    g.fillStyle = 'rgba(0,0,0,.35)'; cqRR(g, -w / 2 + 3, -h / 2 + 4, w, h, 8); g.fill();
    g.fillStyle = cqShade(A.col, 0.75); g.beginPath(); g.moveTo(-w / 2 - 16, -h / 2 + 8); g.lineTo(-w / 2, -h / 2 + 8); g.lineTo(-w / 2, h / 2 - 2); g.lineTo(-w / 2 - 16, h / 2 - 2); g.lineTo(-w / 2 - 8, 3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w / 2 + 16, -h / 2 + 8); g.lineTo(w / 2, -h / 2 + 8); g.lineTo(w / 2, h / 2 - 2); g.lineTo(w / 2 + 16, h / 2 - 2); g.lineTo(w / 2 + 8, 3); g.closePath(); g.fill();
    g.fillStyle = A.col; cqRR(g, -w / 2, -h / 2, w, h, 6); g.fill(); g.strokeStyle = '#e8c060'; g.lineWidth = 2; cqRR(g, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff4d8'; g.fillText(A.t, 0, A.sub ? -9 : 1);
    if (A.sub) { g.font = '700 12px system-ui,sans-serif'; g.fillStyle = 'rgba(255,236,200,.9)'; g.fillText(A.sub, 0, 14); }
    g.restore();
  }

  // ======================= MAPPA: radar (toccandolo si ingrandisce) =======================
  function mapImg() {
    const M = MP(); if (M.mimg) return M.mimg;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, fl = cqFloor[y] && cqFloor[y][x], s = cqSolid[y] && cqSolid[y][x], z = cqHc(x, y), k = WK[y][x]; let col;
      if (!fl) col = k === 'lake' || k === 'pool' ? [44, 90, 112] : k === 'house' ? [190, 170, 130] : k === 'cot' ? [150, 92, 56] : k === 'keep' ? [120, 112, 100] : [30, 50, 30];
      else if (z >= 3) col = inTower(x, y) ? [165, 158, 145] : [145, 138, 125];
      else { const hx = parseInt(fl.slice(1), 16); col = [(hx >> 16) & 255, (hx >> 8) & 255, hx & 255].map(v => Math.min(255, v * 1.15)); if (s && /pine|oak/.test(s.prop)) col = [40, 80, 34]; else if (s) col = col.map(v => v * 0.75); }
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), img = mapImg(), MN = MODE.night(G);
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(14,16,20,.88)'; g.strokeStyle = '#c8a050'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; g.drawImage(img, 0, 0); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0);
    const dot = (x, y, r, col) => { const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke(); };
    const ico = (x, y, t, sz) => { const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 14 : 10;
    if (ctAlive(G)) ico(G.ct.x, G.ct.y, '🪨', sz - 1);
    if (twAlive(G)) ico(G.tw.x, G.tw.y, '🗼', sz);
    if (G.ph === 1) { ico(RAM_X, G.rm.y, '🐏', sz); ico(29.5, 50, '🚪', sz); } else if (G.ph === 2) ico(Z2.x, Z2.y, '⚔️', sz + 2); else if (G.ph === 3) ico(Z3.x, Z3.y, '👑', sz + 2);
    for (const l of G.ld) if (l.st === 2) { const S = M.spots[l.s]; ico(S.fx + 0.5, S.fy + 0.5, '🪜', sz - 1); }
    for (const c of G.chars) { if (c === me || !c.alive || dead(G, c)) continue; const p = P(c); if (c.t !== me.t && (!MN.see(c.x, c.y) || Math.hypot(p.x - cq.x, p.y - cq.y) > (big ? 30 : 16))) continue; dot(p.x, p.y, 3, TEAMS[c.t].c); }
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 62;
  function minimap(g, G, W2) {
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 460) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 8) / (72 * 0.7071), 30, 42, true);
      g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText('Castello di Roccaforte', W2 / 2, cy - R - 26);
      g.font = '600 12px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText('🐏 ariete · 🚪 portone · ⚔️ cortile · 👑 trono', W2 / 2, cy - R - 9); g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 10, 122 + RADAR, RADAR, 2.4, cq.x, cq.y, false);
  }

  function funny(G, w) {
    const L = [], N = c => '<b>' + esc(c.name) + '</b>', add = (pr, t) => L.push([pr + Math.random() * 0.5, t]);
    for (const c of G.chars) {
      if ((c.pn || 0) >= 3) add(8, N(c) + ' ha rovesciato ' + c.pn + ' scale: gli attaccanti gli hanno dedicato una canzone. Piena di parolacce.');
      if ((c.fallN || 0) >= 2) add(7, N(c) + ' è caduto dalla scala ' + c.fallN + ' volte. Le sue chiappe chiedono pietà.');
      if ((c.k || 0) >= 6) add(7, N(c) + ' ha abbattuto ' + c.k + ' nemici. Robin Hood gli ha chiesto l\'autografo, quel maledetto.');
      if ((c.cap || 0) >= 1) add(8, N(c) + ' si è seduto sul trono: stasera birra gratis, cavolo!');
      if ((c.rmT || 0) >= 40) add(6, N(c) + ' ha spinto l\'ariete per ' + Math.round(c.rmT) + ' secondi. Ha le braccia di un mulo e la schiena di un ottantenne.');
      if ((c.oN || 0) >= 2) add(6, N(c) + ' ha versato l\'olio ' + c.oN + ' volte. Frittura di attaccanti, porca miseria.');
      if ((c.lvN || 0) >= 1) add(7, N(c) + ' ha girato l\'argano e aperto il portone da dentro. Furbo come una volpe, stronzo come un gatto.');
      if ((c.blk || 0) >= 5) add(7, N(c) + ' ha parato ' + c.blk + ' frecce con lo scudo. Gli arcieri nemici hanno chiesto il rimborso, porca paletta.');
      if ((c.fxT || 0) >= 20) add(6, N(c) + ' ha riparato il portone per ' + Math.round(c.fxT) + ' secondi. Martellate su martellate: il falegname più odiato del regno.');
      if ((c.bN || 0) >= 3) add(5, N(c) + ' ha piantato ' + c.bN + ' barricate. Mezzo castello è fatto di assi storte, ma regge, cavolo.');
      if ((c.bk || 0) >= 2) add(5, N(c) + ' ha fatto a pezzi ' + c.bk + ' barricate nemiche. Le termiti gli fanno un baffo.');
      if ((c.mh || 0) >= 8) add(6, N(c) + ' ha menato ' + c.mh + ' colpi a segno. Più botte di una sagra di paese finita male.');
      if ((c.d || 0) >= 7) add(5, N(c) + ' è caduto ' + c.d + ' volte. Più frecce in corpo di un puntaspilli.');
    }
    if (w < 0) add(3, 'Pareggio: tutti a casa con le frecce nel sedere.');
    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 4).map(l => l[1]);
    return out.length ? '<br><span style="display:block;margin-top:10px;text-align:left;font-size:14px;line-height:1.45">' + out.map(t => '😂 ' + t).join('<br>') + '</span>' : '';
  }
  const HELP = [
    ['🏰', 'Lo scopo', 'Due squadre, <b>due tempi</b>: una <b>attacca</b> il castello, l\'altra lo <b>difende</b>, poi si cambia. L\'assalto ha <b>3 fasi</b>: 🚪 il portone, ⚔️ il cortile, 👑 la sala del trono. Ogni fase conquistata dà <b>tempo in più</b> e chi attacca riparte più avanti.'],
    ['🐏', 'Il portone', 'Chi attacca <b>spinge l\'ariete col corpo</b> (camminaci contro da dietro: più siete, più va veloce). Al portone <b>tieni premuto 🐏</b> per caricare e <b>lascia</b>: più carichi, più fa male; se lasciate insieme è un <b>colpo di squadra</b>. Oppure: prendi una <b>scala</b> 🪜 all\'accampamento, appoggiala alle mura, sali e gira l\'<b>argano</b> ⚙️ sulla torre del portone (resta fermo 5 secondi).'],
    ['🔥', 'Difendere il portone', 'Dalle mura tira frecce. Rovescia le scale 🤚 (chi sale cade). Sulle torri del portone c\'è l\'<b>olio bollente</b>: versalo quando l\'ariete è sotto (toglie 2 cuori, poi si ricarica).'],
    ['⚔️', 'Le zone', 'Cortile e trono si conquistano <b>stando nel cerchio</b>: se ci sono solo attaccanti avanza (più siete, più veloce), se ci sono anche difensori è <b>contesa</b> e si ferma. Cacciateli!'],
    ['🎭', 'Le classi', 'Scegli prima di tornare in battaglia (pannello in basso, o il pulsante a sinistra): <b>🗡️ Guerriero</b> spada e 4 cuori, <b>tieni premuto</b> = scudo che para le frecce davanti e <b>un colpo di spada</b> (poi è scosso per ' + PARRY_CD + ' secondi); <b>🏹 Arciere</b> l\'unico con l\'arco; <b>🔨 Genio</b> martello, pianta <b>🪵 barricate</b>, spinge l\'ariete per due, <b>ripara il portone</b> da dentro e ricarica l\'olio prima.'],
    ['🏹', 'Colpire', 'Arco: tieni premuto <b>🏹</b>, <b>trascina indietro</b> come una fionda e <b>lascia</b> (più lontano = più storta; merli e muretti fermano le frecce). Spada e martello: <b>tocca</b> il pulsante vicino al nemico. Chi sale una scala, colpito in cima, cade giù.'],
    ['❤️', 'I cuori', '<b>3 cuori</b> sopra la testa (anche dei nemici). A zero cadi: chi attacca torna dopo ' + RESP_A + ' secondi, chi difende arriva con l\'<b>ondata di rinforzi</b> (ogni ' + WAVE + ' secondi).'],
    ['🪨', 'La catapulta', 'Chi attacca la <b>spinge</b> (🛞 vicino a lei: più compagni intorno, più va) fino al punto che vuoi; poi col pulsante <b>🪨</b> si mira come l\'arco (fino a ' + CT_RMAX + ' caselle). Ha ' + CT_N + ' sassi: gli altri si portano a mano dalla catasta dell\'accampamento. ' + SEC_HP + ' sassi nello stesso tratto di muro aprono una <b>BRECCIA</b> (vale come il portone). Il genio ricarica prima; un genio che difende <b>tappa le crepe</b>. Dove cade un sasso compare un <b>cerchio rosso</b>: scappa!'],
    ['🎯', 'Le balestre', 'Sulle torri d\'angolo: chi difende si mette dietro e col pulsante <b>🎯</b> tira dardi pesanti (2 cuori, lo scudo non li ferma) fino a ' + BAL_RMAX + ' caselle. ' + Math.ceil(CT_HP / BAL_DMG) + ' dardi distruggono la catapulta.'],
    ['🗼', 'La torre d\'assedio', 'Chi attacca la <b>spinge</b> (🛞) fino a uno dei 4 attracchi sotto le mura (ai lati, sopra le case): lì <b>abbassa il ponte</b>. Entri dal retro (🧗 Sali nella torre) ed esci sul camminamento. Le balestre e chi esce in sortita la possono distruggere.'],
    ['🏹', 'Faretra e sortite', 'L\'arciere ha <b>' + QV + ' frecce</b>: si ricarica passando vicino alle <b>ceste di frecce</b> (mura, cortile, accampamento, campi). Chi difende ha la <b>🚪 porticina</b> accanto al portone: fuori può <b>incendiare l\'ariete</b> (resta fermo finché non lo spengono 💧), buttare giù le scale dal basso e prendere a colpi catapulta e torre.'],
    ['⏱️', 'Chi vince', 'Vince chi arriva <b>più lontano</b>; se tutte e due conquistano il trono, chi ci mette <b>meno</b>. Nel secondo tempo vedi il risultato da battere 🎯.']
  ];
  const helpHtml = () => HELP.map(([i, t, d]) => '<p><b>' + i + ' ' + t + '</b><br>' + d + '</p>').join('') + '<p class="n">Sul PC: frecce o WASD per muoverti · trascina il pulsante 🏹 col mouse · F tira o colpisce · Q (tenuto) scudo · E azione · 1 2 3 classe · M mappa</p>';
  function helpUI(on) { const el = document.getElementById('asHelp'); if (!el) return; if (on) { el.innerHTML = '<div class="t">🏰 Assedio al castello: come si gioca</div>' + helpHtml() + '<div class="c">Tocca per chiudere</div>'; el.scrollTop = 0; } el.hidden = !on; }

  // ======================= IL PULSANTE DELL'ARCO (tira indietro come una fionda) =======================
  const PULL = 110;
  function aimFrom(G, dx, dy) {
    const TW = Math.max(48, Math.min(cq.w, cq.h) / 8), m = Math.hypot(dx, dy); if (m < 14) return { ok: false };
    let wx = -dx / TW - 2 * dy / TW, wy = dx / TW - 2 * dy / TW; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const M = machOf(G, G.me), O = M ? M.o : { x: cq.x, y: cq.y }, r0 = M ? M.rmin : RMIN, r1m = M ? M.rmax : RMAX;
    const dist = r0 + (r1m - r0) * Math.min(1, (m - 14) / (PULL - 14));
    let x = O.x + wx * dist, y = O.y + wy * dist, tg = null;
    if (!M || M.k === 'b') { let bd = 0.9 + dist * 0.06; for (const e of enemies(G, G.me)) { const p = P(e), d = Math.hypot(p.x - x, p.y - y); if (d < bd && MODE.night(G).see(e.x, e.y)) { bd = d; tg = p; } } if (M && ctAlive(G) && Math.hypot(G.ct.x - x, G.ct.y - y) < 1.6) tg = { x: G.ct.x, y: G.ct.y }; }
    if (tg) { x = tg.x; y = tg.y; }
    return { ok: true, x, y, d: Math.hypot(x - O.x, y - O.y), tg: !!tg, m: M ? M.k : null, i: M ? M.i : -1, o: O };
  }
  function fire(G, ax, ay) {
    const me = G.me; if (!canShoot(G, me) || (me.rl || 0) > G.time) return;
    const [x1, y1] = aimEnd(cq.x, cq.y, ax - cq.x, ay - cq.y, Math.hypot(ax - cq.x, ay - cq.y), 1);
    twang(); G.shotT = performance.now();
    if (G.guest) { const q = (G.q = (G.q || 0) + 1); cqNetSend({ k: 'sh', x: r2(x1), y: r2(y1), q }); const a = mkArrow(G, me, x1, y1, q); a.id = -q; a.t = me.t; }
    else mkArrow(G, me, x1, y1);
  }
  // ======================= LE CLASSI DEL GIOCATORE: scelta, colpo, scudo =======================
  const myCls = () => { try { const k = localStorage.getItem('asCls'); if (CL[k]) return k; } catch {} return 'a'; };
  function pickCls(G, k) {
    if (!CL[k]) return; try { localStorage.setItem('asCls', k); } catch {}
    const me = G.me, now = clsNow(G, me), was = clsOf(me); beep(660, 0.05, 0.03);
    if (G.guest) { G.clsSent = k; G.clsT = performance.now(); cqNetSend({ k: 'cls', c: k }); me.ncls = k; if (now && !dead(G, me)) me.cls = k; }
    else setCls(G, me, k);
    if (!dead(G, me) && !inIv(G) && !((G.pre || 0) > 0) && k !== was) cqToast(now ? CL[k].i + ' Ora sei ' + CL[k].n + '!' : CL[k].i + ' ' + CL[k].n + ' al prossimo ritorno');
    G.clsOpen = 0;
  }
  function setShield(G, on) {
    const me = G.me; G.sdOn = on ? 1 : 0; G.sdT = performance.now();
    if (G.guest) cqNetSend({ k: 'sd', on: G.sdOn });
    me.sd = on && clsOf(me) === 'g' && canHit(G, me) ? 1 : 0;
    if (me.sd) beep(300, 0.05, 0.03, 0, 'square');
  }
  function meleeMe(G) {
    const me = G.me; if (!canHit(G, me) || (me.rl || 0) > G.time) return;
    swish(); G.shotT = performance.now();
    if (G.guest) { cqNetSend({ k: 'ml' }); me.sw = G.time; me.sd = 0; me.rl = G.time + (clsOf(me) === 'g' ? SW_CD : HM_CD); const a = aimDir(G, me, 6); if (a != null) me.swA = a; }
    else melee(G, me);
  }
  function clsUI(G) {
    const cp = document.getElementById('asCls'), cb = document.getElementById('asClsB'); if (!cp || !cb) return;
    const me = G.me, ck = clsOf(me), sel = CL[me.ncls] ? me.ncls : ck, pend = sel !== ck && !dead(G, me);
    const show = !(G.guest && !G.ready) && (dead(G, me) || inIv(G) || (G.pre || 0) > 0 || (G.clsOpen || 0) > performance.now());
    if (cp.hidden === show) cp.hidden = !show;
    const st = sel + (pend ? 1 : 0) + ck;
    if (cp.dataset.s !== st) { cp.dataset.s = st; for (const b of cp.querySelectorAll('button')) { b.classList.toggle('on', b.dataset.k === sel); b.classList.toggle('pend', b.dataset.k === sel && pend); } cb.innerHTML = CL[ck].i + (pend ? '<i></i>' : ''); }
  }
  // VISUALE CHE SI ALLARGA: mirando lontano la telecamera va verso il punto d'arrivo e si allontana quanto basta per vedere me e lui (dolce, entra ed esce)
  function viewTick(G, dt) {
    const V = G.vw || { z: 1, x: 0, y: 0 }, A = G.aim && G.aim.ok && !dead(G, G.me) ? G.aim : null;
    let tz = 1, tx = 0, ty = 0;
    if (A) {
      const dx = A.x - cq.x, dy = A.y - cq.y, TW = Math.max(48, Math.min(cq.w, cq.h) / 8);
      if (Math.hypot(dx, dy) > 3) { tx = dx * 0.45; ty = dy * 0.45; }
      const ox = dx - tx, oy = dy - ty, sxa = Math.max(Math.abs((ox - oy) * TW / 2), Math.abs((tx - ty) * TW / 2)), sya = Math.max(Math.abs((ox + oy) * TW / 4), Math.abs((tx + ty) * TW / 4));
      tz = Math.max(0.55, Math.min(1, (cq.w / 2 - 46) / (sxa || 1), (cq.h / 2 - 150) / (sya || 1)));
    }
    const k = 1 - Math.exp(-Math.min(0.1, dt) * 6);
    V.z += (tz - V.z) * k; V.x += (tx - V.x) * k; V.y += (ty - V.y) * k;
    return V;
  }
  // lascio il pulsante dell'ariete: parte il colpo (forza = quanto ho tenuto premuto)
  function ramLet(G) {
    if (!G || !G.chg) return; const p = r2(Math.min(1, (performance.now() - G.chg) / 1000 / CH_T)); G.chg = 0;
    if (G.guest) { cqNetSend({ k: 'rh', p }); G.me.rc = 0; } else ramRelease(G, G.me, p);
    if (p >= 0.12) { beep(120, 0.1, 0.04, 0, 'square'); }
  }
  function fireMach(G, A) {
    const me = G.me, M = machOf(G, me); if (!M || M.k !== A.m || !machReady(G, M)) { beep(200, 0.08, 0.02); return; }
    if (M.k === 'c') { thud(0.6, 120); beep(150, 0.25, 0.04, 0, 'sawtooth'); } else { beep(180, 0.08, 0.05, 0, 'triangle'); thud(0.4, 220); }
    G.shotT = performance.now();
    if (G.guest) cqNetSend(M.k === 'c' ? { k: 'cf', x: r2(A.x), y: r2(A.y) } : { k: 'bf', i: M.i, x: r2(A.x), y: r2(A.y) });
    else if (M.k === 'c') fireCt(G, me, A.x, A.y); else fireBal(G, me, M.i, A.x, A.y);
  }
  function autoFire(G) { const me = G.me; let b = null, bd = RMAX; for (const e of enemies(G, me)) { const p = P(e), d = Math.hypot(p.x - cq.x, p.y - cq.y); if (d < bd && MODE.night(G).see(e.x, e.y)) { bd = d; b = p; } } if (b) fire(G, b.x, b.y); }
  function bowUI(G) {
    const el = document.getElementById('asBow'); if (!el) return;
    const me = G.me, M = machOf(G, me), cc = clsOf(me), ck = M ? 'm' + M.k + (M.k === 'c' ? G.ct.n : '') : cc + (cc === 'a' ? me.q : '');
    if (el.dataset.c !== ck) { el.dataset.c = ck; el.innerHTML = M ? '<span>' + (M.k === 'c' ? '🪨' : '🎯') + '</span><i>' + (M.k === 'c' ? 'CATAPULTA ' + G.ct.n + '/' + CT_N : 'BALESTRA') + '</i>' : '<span>' + CL[cc].i + '</span><i>' + (cc === 'a' ? (me.q === 0 ? 'FARETRA VUOTA' : '🏹 ' + (me.q == null ? QV : me.q) + '/' + QV) : CL[cc].w) + '</i>'; el.dataset.s = ''; }
    const cd = M ? (M.k === 'c' ? (cc === 'n' ? CT_RLG : CT_RL) : BAL_RL) : cc === 'a' ? RELOAD : cc === 'g' ? SW_CD : HM_CD, rl = M ? machRl(G, M) : me.rl || 0, k = Math.max(0, Math.min(1, 1 - (rl - G.time) / cd)), ok = M ? (M.k !== 'c' || G.ct.n > 0) : (cc === 'a' ? canShoot(G, me) : canHit(G, me)) && !me.cl, st = (ok ? 'o' : 'x') + Math.round(k * 20) + (me.sd ? 's' : '');
    if (el.dataset.s !== st) { el.dataset.s = st; el.style.setProperty('--k', (k * 360).toFixed(0) + 'deg'); el.classList.toggle('off', !ok); el.classList.toggle('rdy', ok && k >= 1); el.classList.toggle('sd', !!me.sd); }
  }
  if (!document.getElementById('asCss')) {
    const st = document.createElement('style'); st.id = 'asCss';
    st.textContent = '#asHelp{position:absolute;left:12px;right:12px;top:118px;bottom:150px;max-width:480px;margin:0 auto;overflow-y:auto;background:rgba(28,24,30,.96);border:2px solid #c8a050;border-radius:16px;padding:12px 16px;color:#f2ead8;font-size:14px;line-height:1.4;z-index:31;box-shadow:0 8px 30px rgba(0,0,0,.5)}#asHelp .t{font-weight:800;font-size:17px;color:#f2c860;margin-bottom:4px}#asHelp p{margin:7px 0}#asHelp b{color:#ffe0a0}#asHelp .n{font-size:12px;color:#c8b898}#asHelp .c{text-align:center;font-size:13px;color:#f2c860;font-weight:700;margin-top:10px}'
      + '#asHelpB{position:absolute;left:12px;top:122px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(28,24,30,.82);color:#f2c860;font-size:19px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.35)}'
      + '#asBow{--k:360deg;touch-action:none;user-select:none;-webkit-user-select:none;position:absolute;right:max(96px,22%);bottom:138px;width:94px;height:94px;border-radius:50%;border:0;padding:0;background:conic-gradient(#f2c860 var(--k),rgba(255,255,255,.12) 0);box-shadow:0 5px 16px rgba(0,0,0,.4);-webkit-tap-highlight-color:transparent}'
      + '#asBow::before{content:"";position:absolute;inset:5px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#6a4a32,#3a2618)}#asBow span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;pointer-events:none;transition:transform .05s}#asBow i{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:800;color:#f2dca0;letter-spacing:.04em;pointer-events:none;white-space:nowrap}'
      + '#asBow.off{opacity:.45}#asBow.rdy::before{background:radial-gradient(circle at 40% 35%,#7a5638,#3a2618)}#asBow.aim{background:conic-gradient(#ff7a50 360deg,#ff7a50 0)}'
      + '#asBow.sd{background:conic-gradient(#7ab8ff 360deg,#7ab8ff 0)}#asBow.sd::before{background:radial-gradient(circle at 40% 35%,#3a5a7a,#1a2a3a)}'
      + '#asCls{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);width:min(370px,calc(100% - 24px));z-index:30;text-align:center;pointer-events:none}'
      + '#asCls .h{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#f2dca0;background:rgba(20,16,14,.78);padding:4px 12px 3px;border-radius:9px 9px 0 0}'
      + '#asCls .r{display:flex;gap:8px;pointer-events:auto}'
      + '#asCls button{position:relative;flex:1;min-width:0;border:2px solid rgba(200,160,80,.3);background:rgba(28,24,30,.9);border-radius:14px;padding:8px 4px 7px;color:#f2ead8;display:flex;flex-direction:column;align-items:center;gap:1px;box-shadow:0 4px 12px rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent;font:inherit;cursor:pointer;transition:transform .08s}'
      + '#asCls button:active{transform:scale(.96)}#asCls button b{font-size:26px;line-height:1.15}#asCls button span{font-size:13px;font-weight:800}#asCls button small{font-size:10px;line-height:1.2;opacity:.72}'
      + '#asCls button.on{border-color:#f2c860;background:rgba(74,54,30,.96);box-shadow:0 0 0 3px rgba(242,200,96,.25),0 4px 12px rgba(0,0,0,.4)}'
      + '#asCls button em{display:none;position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-style:normal;font-size:9px;font-weight:800;white-space:nowrap;background:#f2c860;color:#2a1e10;padding:1px 6px;border-radius:6px}#asCls button.pend em{display:block}'
      + '#asClsB{position:absolute;left:12px;top:170px;width:40px;height:40px;border-radius:50%;border:2px solid rgba(200,160,80,.7);background:rgba(28,24,30,.82);font-size:19px;line-height:1;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.35)}#asClsB i{position:absolute;right:-1px;top:-1px;width:11px;height:11px;border-radius:50%;background:#f2c860;border:2px solid #2a1e10}'
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
    const bw = document.createElement('button'); bw.id = 'asBow'; bw.type = 'button'; bw.hidden = true; bw.innerHTML = '<span>🏹</span><i>TIRA INDIETRO</i>';
    let ptr = null;
    // arciere: tira indietro e lascia; guerriero e genio: tocca = colpo (il guerriero tenendo premuto alza lo scudo)
    bw.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const G = cq.g; if (!G || G.mode !== 'assedio') return; const mel = clsOf(G.me) !== 'a' && !machOf(G, G.me); ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, mel }; try { bw.setPointerCapture(e.pointerId); } catch {}
      if (mel) { G.hold = performance.now(); meleeMe(G); return; }
      bw.classList.add('aim'); G.aim = { ok: false }; });
    bw.addEventListener('pointermove', e => { if (!ptr || ptr.id !== e.pointerId || ptr.mel) return; const G = cq.g; if (!G) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; G.aim = aimFrom(G, dx, dy); const m = Math.min(1, Math.hypot(dx, dy) / PULL), sp = bw.querySelector('span'); if (sp) sp.style.transform = 'translate(' + (dx / (Math.hypot(dx, dy) || 1) * m * 22) + 'px,' + (dy / (Math.hypot(dx, dy) || 1) * m * 22) + 'px)'; });
    const up = e => { if (!ptr || ptr.id !== e.pointerId) return; if (ptr.mel) { ptr = null; const G = cq.g; if (G) { G.hold = 0; if (G.sdOn) setShield(G, 0); } return; } ptr = null; bw.classList.remove('aim'); const sp = bw.querySelector('span'); if (sp) sp.style.transform = ''; const G = cq.g; if (!G) return; const A = G.aim; G.aim = null; if (A && A.ok && e.type === 'pointerup') { if (A.m) fireMach(G, A); else fire(G, A.x, A.y); } };
    bw.addEventListener('pointerup', up); bw.addEventListener('pointercancel', up); bw.oncontextmenu = e => e.preventDefault();
    if (host) host.appendChild(bw);
    window.addEventListener('keydown', e => { const k = e.key && e.key.toLowerCase(), G = cq.g; if (!G || G.mode !== 'assedio' || !cq.on || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; if (k === 'm') G.big = !G.big; if (k === 'f') { if (clsOf(G.me) === 'a') autoFire(G); else meleeMe(G); } if (k === 'q' && !e.repeat && clsOf(G.me) === 'g') setShield(G, 1); if (/^[123]$/.test(k)) pickCls(G, CLK[+k - 1]); });
    window.addEventListener('keyup', e => { const G = cq.g, k = e.key && e.key.toLowerCase(); if (!G || G.mode !== 'assedio') return; if (k === 'q' && G.sdOn) setShield(G, 0); if (k === 'e' || k === 'enter' || k === ' ') ramLet(G); });
    // il pulsante grande: il motore lo usa alla pressione; il colpo caricato dell'ariete parte quando si lascia
    { const kb = document.getElementById('cqKill'); if (kb) { const rl = () => { const G = cq.g; if (G && G.mode === 'assedio') ramLet(G); }; for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) kb.addEventListener(ev, rl); } }
    // il pannello delle classi (in basso: compare da solo quando sei a terra, all'intervallo e al via) e il pulsante a sinistra per aprirlo
    const cp = document.createElement('div'); cp.id = 'asCls'; cp.hidden = true;
    cp.innerHTML = '<div class="h">Scegli la classe</div><div class="r">' + CLK.map(k => '<button type="button" data-k="' + k + '"><b>' + CL[k].i + '</b><span>' + CL[k].n + '</span><small>' + CL[k].d + '</small><em>al ritorno</em></button>').join('') + '</div>';
    cp.addEventListener('pointerdown', e => { e.stopPropagation(); const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); const G = cq.g; if (G && G.mode === 'assedio') pickCls(G, b.dataset.k); });
    cp.addEventListener('pointerup', e => e.stopPropagation());
    if (host) host.appendChild(cp);
    const cb = document.createElement('button'); cb.id = 'asClsB'; cb.type = 'button'; cb.hidden = true; cb.textContent = '🏹';
    cb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const G = cq.g; if (!G || G.mode !== 'assedio') return; G.clsOpen = (G.clsOpen || 0) > performance.now() ? 0 : performance.now() + 7000; beep(560, 0.04, 0.02); });
    if (host) host.appendChild(cb);
    setInterval(() => {
      const G = cq.g, on = !!(G && G.mode === 'assedio' && G.phase === 'play' && (!G.guest || G.ready) && $('#cqTask').hidden && !$('#ciack').hidden);
      if (host && host.classList.contains('asMode') !== on) host.classList.toggle('asMode', on);
      if (hb.hidden === on) hb.hidden = !on; if (mb.hidden === on) mb.hidden = !on; if (bw.hidden === on) bw.hidden = !on; if (cb.hidden === on) cb.hidden = !on;
      if (!on) { if (!hp.hidden) hp.hidden = true; if (!cp.hidden) cp.hidden = true; const cv = document.getElementById('cqCanvas') || document.querySelector('#ciack canvas'); if (cv && cv.style.transform) cv.style.transform = ''; return; }
      if (!G.helpAuto) { G.helpAuto = 1; let n = 0; try { n = +localStorage.getItem('asHelpN') || 0; localStorage.setItem('asHelpN', n + 1); } catch {} if (n < 3) { helpUI(true); G.helpHold = !cq.net; } }
      if (G.helpHold) { if (hp.hidden) G.helpHold = 0; else G.pre = Math.max(G.pre || 0, 1); }
      bowUI(G); clsUI(G);   // anche durante il conto alla rovescia (li' il gioco non gira ancora): si sceglie la classe prima del via
      const W2 = cq.w, H2 = cq.h; let css;
      if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 460) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:16px'; }
      else css = 'left:' + (W2 - 2 * RADAR - 10) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px;border-radius:50%';
      if (mb.dataset.k !== css) { mb.dataset.k = css; mb.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;' + css; }
    }, 200);
  }
  window.__as = { PORT, DOCKS, QUIV, fireMach, machOf, arcPk, action, doAct, zoneAt, spotsOf, inCastle, topAt, mkArrow, aimFrom, fire, botT, botShoot, setupHalf, syncMap, clear, score, Z2, Z3, RK, LEV, openGate, nextPhase, CL, setCls, pickCls, viewTick, ramLet, ramCharge, ramRelease, melee, meleeMe, setShield, buildOk, doBuild, keepsWay, frontCell };
});
