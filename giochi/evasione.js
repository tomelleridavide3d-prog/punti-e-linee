// EVASIONE (fuga cooperativa dal carcere). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): guardie (ronde, cono di vista, ? -> !, ricerca, nascondigli), squadre (freccia sul bordo).
// CARCERE "ROCCA NERA", mappa FISSA (si impara) su DUE LIVELLI affiancati (si vede solo quello dove sei):
//  - PIANO TERRA: muro di cinta con 6 torrette e i riflettori, fascia di ronda (zona morta), Braccio A (celle, galleria), mensa e cucina,
//    infermeria, docce, lavanderia, officina (targhe), cortile di carico (camion), cortile con il campo da basket, l'orto e il palco dell'appello,
//    sala delle guardie, spogliatoio, magazzino, isolamento, ingresso col cancello principale, sala colloqui; fuori la strada e il bosco;
//  - PRIMO PIANO: ballatoio del braccio (altre celle, la rete sopra il vuoto), sala di controllo, ufficio del direttore, archivio.
// LA GIORNATA (2 giorni + 2 notti, ~8 min): campana -> APPELLO al proprio posto numerato in cortile (chi manca = ricercato), ora d'aria,
// appello della sera, RIENTRO in cella (le sbarre si chiudono), NOTTE con le ronde e i riflettori. Chi viene preso: ISOLAMENTO a tempo.
// Zone vietate (guardie, uffici, fascia di ronda, carico...): se una guardia ti vede li' ti insegue. Di notte fuori dalla cella sei sempre fuori posto.
CQ_WAIT.evasione = cqLib('squadre', 'guardie').then(L => {
  const SQ = L.squadre, GD = L.guardie;
  for (const t of ['bunk', 'gbox', 'sheet', 'kshelf', 'ushelf', 'press', 'urack', 'brack', 'boxes', 'mstack', 'shed', 'cctv', 'filecab', 'pallet', 'dumpster', 'mcab', 'screen', 'bgate', 'tgate', 'shut', 'mdoor', 'sdoor', 'kbox', 'pegb', 'ibed', 'serve']) GD.tall.add(t);   // fermano la vista (le sbarre e le reti no)
  // DUE LIVELLI AFFIANCATI: piano terra x 0-99, primo piano spostato di O1 (x 108-207). Si passa dalle scale (M.portals)
  const W = 208, H = 78, O1 = 108;
  const floorOf = x => x < 104 ? 0 : 1;
  const FLN = ['Piano terra', 'Primo piano'];
  // LA GIORNATA (secondi dentro il giorno): appello del mattino 0-28, ora d'aria fino a 120, appello della sera 120-146, rientro fino a 165, notte fino a 250
  const DAY = 250, AP1 = 28, AP2S = 120, AP2 = 146, CLOSE = 165, DUSK0 = 112, NIGHT0 = 158, DAWN0 = 236, NDAYS = 2;
  const ISO_T = 40, RIC_T = 60, ALERT_T = 45, SPOT_R = 1.3, SPOT_CD = 6;
  const DAY_R = 7.2, LIT_R = 6.2, DARK_R = 3.2, MY_R = 2.3, SEE_G = 24, HB_R = 5;
  const TC = '#ffa64a';
  const mmss = t => Math.floor(Math.max(0, t) / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const cyc = G => ((G.time % DAY) + DAY) % DAY;
  const dayN = G => Math.min(NDAYS, Math.floor(G.time / DAY) + 1);
  const dark = G => { const t = cyc(G); return t < DUSK0 ? 0 : t < NIGHT0 ? (t - DUSK0) / (NIGHT0 - DUSK0) : t < DAWN0 ? 1 : 1 - (t - DAWN0) / (DAY - DAWN0); };
  // fase: 'ap' appello, 'day' ora d'aria, 'rin' rientro in cella, 'night' notte (sbarre chiuse)
  const phase = G => { const t = cyc(G); return t < AP1 ? 'ap' : t < AP2S ? 'day' : t < AP2 ? 'ap' : t < CLOSE ? 'rin' : 'night'; };
  const closed = G => cyc(G) >= CLOSE;
  const alertOn = G => G.time < (G.alE || 0);
  // l'orologio del carcere (solo da mostrare): 0 = 07:00, 28 = 08:00, 120 = 18:30, 146 = 19:30, 165 = 21:00, 250 = 07:00 del giorno dopo
  const CLK = [[0, 420], [AP1, 480], [AP2S, 1110], [AP2, 1170], [CLOSE, 1260], [DAY, 1860]];
  function clock(G) { const t = cyc(G); let m = 420; for (let i = 1; i < CLK.length; i++) if (t <= CLK[i][0]) { const a = CLK[i - 1], b = CLK[i]; m = a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); break; } m = Math.floor(m) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  // ======================= MAPPA: CARCERE ROCCA NERA (fissa, su due livelli) =======================
  // colori dei muri (drawWall li riconosce): pittura del braccio, cemento delle celle, guardie, legno, isolamento, piastrelle della cucina
  const PAINT = '#4f6b5e', PAINTG = '#4a5a72', CELLW = '#8f897c', BRICK = '#7a3e2e', CONC = '#5a5854', HEDGE = '#2f5a2e', WOODW = '#5a3c26', ISOW = '#55524e', KITW = '#b8b4a8';
  const GRS = ['#3a5a30', '#38582e'], GRV = ['#8a8272', '#867e6e'], CELL = ['#8e8a80', '#8a867c'], PRIS = ['#7e8a84', '#76827c'], PRIS2 = ['#6e7a74', '#6a7670'], STR = ['#5a5248', '#56504a'];
  // torrette: la casella davanti (disegna tutta la torretta) e le altre tre
  const TOWER = [[5, 5], [95, 5], [5, 71], [95, 71], [5, 37], [95, 37]];
  const TOWK = new Set(); for (const [x, y] of TOWER) for (const [a, b] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) TOWK.add((x + a) + ',' + (y + b));
  function mapPrison() {
    const rooms = [], doors = [], props = [], deco = [], lamps = [], holes = [], decals = [];
    let ox = 0, fa = 'X';
    const R = (n, x, y, w, h, k, c, wc, o) => { rooms.push(Object.assign({ n, x: x + ox, y, w, h, k, c, wc, ala: fa, f: 0 }, o || {})); return rooms.length - 1; };
    const pp = (t, x, y, o) => props.push([t, x + ox, y, o]);
    const D = (x, y, w = 1, h = 1) => doors.push([x + ox, y, w, h]);
    const L = (x, y) => lamps.push([x + ox, y, fa]);
    const row = (t, x0, x1, y, o) => { for (let x = x0; x <= x1; x++) pp(t, x, y, o); };
    const col = (t, x, y0, y1, o) => { for (let y = y0; y <= y1; y++) pp(t, x, y, o); };
    const two = (t, x, y, o) => { pp(t, x, y, o); pp(t, x - 1, y, { part: 1 }); };   // 2 caselle lungo x: si disegna dalla casella davanti
    const twoY = (t, x, y, o) => { pp(t, x, y, o); pp(t, x, y - 1, { part: 1 }); };   // 2 caselle lungo y
    const DE = (t, x, y) => deco.push([x + ox, y, t]);
    const cells = [], iso = [];

    // ---------------- FUORI (bosco, prati, strada) ----------------
    R('Bosco', 1, 1, 98, 3, 'grass', GRS, HEDGE, { nl: 1, f: 1 });
    R('Prato', 1, 4, 3, 67, 'grass', GRS, HEDGE, { nl: 1, f: 1 });
    R('Prato', 96, 4, 3, 67, 'grass', GRS, HEDGE, { nl: 1, f: 1 });
    R('Prato', 1, 71, 3, 1, 'grass', GRS, HEDGE, { nl: 1, f: 1 }); R('Prato', 96, 71, 3, 1, 'grass', GRS, HEDGE, { nl: 1, f: 1 });   // fuori si gira tutto intorno al muro
    R('Strada provinciale', 1, 72, 98, 5, 'road', ['#3a3c40', '#383a3e'], HEDGE, { lx: 22, ly: 75.6, f: 1 });
    for (let x = 2; x < 98; x += 3) { const h = Math.sin(x * 12.9898) * 43758.5453, r = h - Math.floor(h); if (r < 0.75) pp(r < 0.5 ? 'pine' : 'oak', x + (r < 0.3 ? 1 : 0), r < 0.4 ? 1 : 2); }
    for (const y of [10, 22, 34, 48, 60]) { pp('pine', 2, y); pp('pine', 97, y + 4); }
    pp('bush', 1, 16); pp('bush', 3, 28); pp('bush', 98, 20); pp('bush', 96, 54); pp('rock', 2, 42); pp('rock', 97, 32);
    for (const [x, c] of [[15, '#2a4a7a'], [19, '#8a2a2a'], [23, '#d8d8d0'], [27, '#3a3a3e'], [84, '#4a6a3a'], [88, '#c8b030']]) two('car', x, 73, { c });
    pp('bstop', 40, 72); pp('sign', 62, 72); pp('flag', 66, 72); pp('flag', 76, 72); pp('bin', 41, 72);
    for (const [x, y] of [[10, 72], [34, 72], [56, 72], [80, 72], [94, 72]]) pp('lpost', x, y);
    for (const [x, y] of [[10.5, 72.5], [34.5, 72.5], [56.5, 72.5], [80.5, 72.5], [94.5, 72.5]]) L(x, y);

    // ---------------- FASCIA DI RONDA (la zona morta tra il muro di cinta e i palazzi) ----------------
    fa = 'R';
    R('Fascia di ronda', 6, 6, 88, 2, 'gravel', GRV, CONC, { nl: 1, f: 1 }); R('Fascia di ronda', 6, 68, 88, 2, 'gravel', GRV, CONC, { nl: 1, f: 1 });
    R('Fascia di ronda', 6, 8, 2, 60, 'gravel', GRV, CONC, { nl: 1, f: 1 }); R('Fascia di ronda', 92, 8, 2, 60, 'gravel', GRV, CONC, { nl: 1, f: 1 });
    for (let x = 12; x < 92; x += 10) { L(x, 6.6); L(x, 69.4); } for (let y = 14; y < 68; y += 10) { L(6.6, y); L(93.4, y); }
    // rete metallica col filo spinato tra il cortile e la fascia di ronda (si vede attraverso)
    D(8, 32, 1, 36); D(9, 67, 39, 1);
    for (let y = 32; y <= 67; y++) pp('fence', 8, y, { v: 1, c: y === 67 });
    for (let x = 9; x <= 47; x++) pp('fence', x, 67, {});

    // ---------------- BRACCIO A (celle e galleria) ----------------
    fa = 'B';
    for (let i = 0; i < 7; i++) {   // celle a nord (porta a sbarre a sud)
      const x0 = 9 + 5 * i, ri = R('Cella A' + (i + 1), x0, 9, 4, 4, 'cellf', CELL, CELLW, { nl: 1 });
      D(x0 + 1, 13, 2, 1); pp('bars', x0 + 1, 13, { l: 1 }); pp('bars', x0 + 2, 13, {});
      twoY('bunk', x0, 10, { c: ['#5a6a7a', '#7a4a3a', '#4a6a4a', '#6a5a7a'][i % 4] }); pp('wc', x0 + 3, 9); pp('desk1', x0 + 3, 11, { v: i });
      cells.push({ n: 'A' + (i + 1), ri, x0, y0: 9, bars: [[x0 + 1, 13], [x0 + 2, 13]], sp: [[x0 + 1.5, 11.4], [x0 + 2.5, 10.4]], bed: [x0 + 1.2, 10.4] });
    }
    for (const i of [0, 1, 2, 4, 5, 6]) {   // celle a sud (porta a sbarre a nord); al posto della quarta c'e' l'uscita verso il cortile
      const x0 = 9 + 5 * i, ri = R('Cella B' + (i + 1 - (i > 3 ? 1 : 0)), x0, 27, 4, 4, 'cellf', CELL, CELLW, { nl: 1 });
      D(x0 + 1, 26, 2, 1); pp('bars', x0 + 1, 26, { l: 1 }); pp('bars', x0 + 2, 26, {});
      twoY('bunk', x0, 30, { c: ['#6a5a3a', '#3a5a6a', '#6a3a4a'][i % 3] }); pp('wc', x0 + 3, 30); pp('desk1', x0 + 3, 28, { v: i + 3 });
      cells.push({ n: 'B' + (i + 1 - (i > 3 ? 1 : 0)), ri, x0, y0: 27, bars: [[x0 + 1, 26], [x0 + 2, 26]], sp: [[x0 + 1.5, 28.6], [x0 + 2.5, 29.6]], bed: [x0 + 1.2, 28.6] });
    }
    R('Uscita al cortile', 24, 27, 4, 4, 'pris', PRIS, CELLW, { nl: 1 }); D(24, 26, 4, 1); D(25, 31, 2, 1); pp('ygate', 25, 31, { l: 1 }); pp('ygate', 26, 31, {});
    R('Scala del braccio', 44, 9, 4, 4, 'mstair', ['#5a5e64', '#565a60'], PAINT, { nl: 1 }); D(45, 13, 2, 1);
    R('Ufficio del braccio', 44, 27, 4, 4, 'lino2', ['#56607a', '#525c76'], PAINTG, { nl: 1, f: 1 }); D(45, 26, 1, 1);
    pp('gdesk', 46, 29); pp('monitor', 47, 28); pp('locker', 44, 30, '#4a5a7a'); pp('kbox', 44, 27);
    const gal = R('Braccio A', 9, 14, 39, 12, 'pris', PRIS, PAINT, { lx: 30, ly: 24.9 });
    D(48, 18, 1, 3);
    // galleria: tavoli d'acciaio, la tv con le sedie, il ping pong, il box di vetro del secondino, distributore e acqua
    for (const x of [15, 18, 21]) for (const y of [17, 21]) pp('ptable', x, y);
    pp('tvw', 9, 19); for (const [x, y] of [[11, 18], [11, 20], [12, 19]]) pp('pchair', x, y);
    two('pong', 32, 19, {}); pp('gbox', 41, 20); pp('gbox', 40, 20, { part: 1 }); pp('gbox', 41, 19, { part: 1 }); pp('gbox', 40, 19, { part: 1 });
    pp('vending', 47, 15); pp('wcool', 47, 23); pp('bin', 27, 16); pp('bin', 36, 23);
    for (const x of [12, 20, 28, 36, 44]) { L(x, 16.5); L(x, 22.5); } L(46, 11); L(46, 29);
    for (const c of cells) L(c.x0 + 2, c.y0 + 1.5);

    // ---------------- CORRIDOIO CENTRALE e SERVIZI ----------------
    fa = 'C';
    const hall = R('Corridoio centrale', 49, 9, 2, 58, 'pris2', PRIS2, PAINT, { nl: 1 });
    for (let y = 12; y < 66; y += 7) L(50, y);
    fa = 'S';
    R('Mensa', 52, 9, 20, 12, 'tile', ['#b4ae9e', '#aca696'], PAINT, { ly: 19.9 }); D(51, 13, 1, 3);
    for (const y of [11, 14, 17]) { row('ltable', 54, 58, y); row('ltable', 60, 64, y); }
    col('serve', 69, 10, 16); pp('trays', 69, 9); pp('pot', 71, 11); pp('pot', 71, 14); pp('bin', 66, 20); pp('bin', 52, 20); pp('wcool', 52, 9);
    for (const [x, y] of [[56, 12.5], [56, 17.5], [62, 12.5], [62, 17.5], [70, 13]]) L(x, y);
    R('Cucina', 73, 9, 18, 12, 'ktile', ['#8a4436', '#843f32'], KITW, { ly: 19.9 }); D(72, 15, 1, 2);
    row('stove', 75, 80, 9); pp('fridge', 89, 9); pp('fridge', 90, 9); row('ksink', 85, 87, 9); row('kisl', 78, 84, 14); row('kisl', 78, 84, 15);
    col('kshelf', 90, 12, 17); pp('sack', 74, 19); pp('sack', 75, 20); pp('crate', 76, 20); pp('bucket', 88, 20);
    for (const [x, y] of [[77, 12], [84, 12], [81, 18], [88, 15]]) L(x, y);
    R('Infermeria', 52, 22, 11, 8, 'tile', ['#dde2de', '#d6dbd7'], '#a8b8b2', { ly: 29.4 }); D(51, 25, 1, 2); D(56, 30, 2, 1);
    for (const x of [53, 56, 59]) twoY('ibed', x, 23, {}); pp('drip', 54, 22); pp('drip', 57, 22); pp('screen', 61, 22); pp('mcab', 62, 25); pp('mcab', 62, 26); pp('desk', 60, 28); pp('dchair', 60, 27, ['#e8ecef', 's']);
    L(55, 25); L(60, 26);
    R('Docce', 64, 22, 8, 8, 'shtile', ['#5f7f8c', '#5a7a86'], '#8aa2aa', { ly: 29.4 }); D(67, 30, 2, 1);
    row('shower', 64, 71, 22); row('sbench', 66, 69, 26); L(66, 25); L(70, 25);
    R('Corridoio sud', 52, 31, 20, 2, 'pris2', PRIS2, PAINT, { nl: 1 }); D(51, 31, 1, 2); L(58, 31.5); L(68, 31.5);
    R('Lavanderia', 73, 22, 18, 12, 'tile', ['#8aa0aa', '#849aa4'], PAINT, { ly: 32.9 }); D(72, 31, 1, 2);
    row('washer', 74, 83, 22); row('dryer', 85, 90, 22); row('ftable', 76, 80, 27); for (let y = 26; y <= 29; y++) for (const x of [85, 87, 89]) pp('sheet', x, y, { k: (x + y) % 3 });
    pp('lcart', 75, 31); pp('lcart', 78, 31); pp('lcart', 89, 32); pp('ironb', 82, 29); col('ushelf', 90, 24, 25);
    for (const [x, y] of [[77, 25], [84, 25], [80, 30], [88, 31]]) L(x, y);
    R('Officina', 52, 34, 20, 12, 'concrete', ['#6e6a62', '#6a665e'], PAINT, { ly: 44.9 }); D(61, 33, 2, 1);
    row('pegb', 53, 59, 34); row('wbench', 54, 58, 38); row('wbench', 54, 58, 42); row('wbench', 63, 67, 38); row('wbench', 63, 67, 42);
    pp('press', 70, 36); pp('press', 70, 39); pp('plates', 70, 43); pp('plates', 69, 44); pp('saw', 63, 45); pp('barrel', 52, 45, '#7a3a2a'); pp('crate', 53, 45); pp('crate', 67, 34);
    for (const [x, y] of [[56, 40], [65, 40], [60, 36], [60, 44]]) L(x, y);

    // ---------------- CORTILE DI CARICO (camion della lavanderia) ----------------
    fa = 'G';
    R('Cortile di carico', 73, 35, 18, 11, 'dock', ['#5e5c58', '#5a5854'], BRICK, { ly: 45.4, f: 1 });
    D(72, 40, 1, 2); pp('mdoor', 72, 40, { v: 1 }); pp('mdoor', 72, 41, { v: 1, l: 1 });   // porta dell'officina: chiusa a chiave
    D(91, 39, 1, 3); D(94, 39, 2, 3); for (const y of [39, 40, 41]) { pp('shut', 91, y, { v: 1 }); pp('tgate', 95, y, { v: 1, l: y === 40 }); }
    pp('pallet', 74, 36); pp('pallet', 75, 36); pp('pallet', 74, 37); pp('crate', 76, 36); two('dumpster', 90, 45, {}); pp('barrel', 74, 45, '#3a6a3a'); pp('barrel', 75, 45, '#3a6a3a'); pp('cone', 85, 37); pp('cone', 85, 43);
    L(80, 38); L(88, 42);

    // ---------------- CORTILE (ora d'aria e appello) ----------------
    fa = 'Y';
    R('Cortile', 9, 32, 39, 35, 'yard', ['#5c5c5a', '#585856'], BRICK, { lx: 30, ly: 65.2 }); D(48, 44, 1, 3);
    pp('hoop', 11, 39, { d: 'e' }); pp('hoop', 25, 39, { d: 'w' });   // campo da basket
    pp('wbench2', 38, 34); pp('wbench2', 41, 34); pp('drack', 44, 33); pp('pullup', 46, 35); pp('drack', 38, 37);
    for (const x of [29, 28, 27]) for (const y of [48, 47]) pp('stage', x, y, x === 29 && y === 48 ? {} : { part: 1 });   // palco dell'appello
    for (const [x, b] of [[14, 'n'], [18, 'n'], [31, 'n'], [35, 'n']]) pp('pbench', x, 32, { b });
    pp('pbench', 47, 50, { b: 'e' }); pp('pbench', 47, 56, { b: 'e' });
    for (const [x, y] of [[16, 51], [16, 55], [39, 51], [39, 55]]) pp('ptab', x, y);
    for (const y of [59, 61, 63]) for (let x = 11; x <= 17; x += 2) pp('garden', x, y, { v: (x + y) % 3 });
    pp('shed', 20, 65); pp('shed', 19, 65, { part: 1 }); pp('shed', 20, 64, { part: 1 }); pp('shed', 19, 64, { part: 1 }); pp('scare', 14, 65); pp('bucket', 18, 59);
    pp('oak', 44, 62); pp('oak', 31, 62); pp('phone', 47, 38); pp('drink', 47, 33); pp('bin', 21, 47); pp('bin', 36, 47);
    for (const [x, y] of [[10, 34], [26, 44], [10, 48], [35, 59], [24, 60], [44, 44]]) pp('lpost', x, y);
    for (const [x, y] of [[10.5, 34.5], [26.5, 44.5], [10.5, 48.5], [35.5, 59.5], [24.5, 60.5], [44.5, 44.5], [28, 50]]) L(x, y);
    // i posti numerati dell'appello, davanti al palco
    const spots = []; for (let i = 0; i < 8; i++) spots.push([21.5 + i * 2, 51.5]);

    // ---------------- ZONA DELLE GUARDIE ----------------
    fa = 'G';
    R('Sala delle guardie', 52, 47, 13, 10, 'lino2', ['#56607a', '#525c76'], PAINTG, { ly: 56.4, f: 1 }); D(51, 50, 1, 2); D(62, 57, 2, 1);
    R('Scala delle guardie', 52, 47, 2, 2, 'mstair', ['#5a5e64', '#565a60'], PAINTG, { nl: 1, f: 1 });
    row('camdesk', 57, 60, 47); pp('kbox', 64, 47); pp('brack', 64, 50); pp('brack', 64, 51); pp('gdesk', 58, 52); pp('dchair', 58, 51, ['#2a2e36', 's']);
    pp('coffee', 52, 55); two('sofa', 56, 56, {}); pp('table', 60, 55); pp('wcool', 64, 56); pp('board', 61, 47);
    for (const [x, y] of [[55, 50], [61, 50], [58, 55]]) L(x, y);
    R('Spogliatoio', 66, 47, 8, 10, 'tile', ['#7a8a92', '#74848c'], PAINTG, { ly: 56.4, f: 1 }); D(65, 52, 1, 2); D(74, 49, 1, 2);
    row('locker', 66, 73, 47, '#3a5a8a'); row('sbench', 68, 71, 51); pp('urack', 73, 54); pp('urack', 73, 55); pp('mirror', 66, 56); pp('bin', 66, 54);
    L(69, 50); L(70, 54);
    R('Magazzino', 75, 47, 16, 10, 'concrete', ['#5e5a54', '#5a5650'], CONC, { ly: 56.4, f: 1 }); D(82, 46, 2, 1);
    row('shelf', 77, 81, 49); row('shelf', 77, 81, 52); row('shelf', 85, 89, 49); row('shelf', 85, 89, 52); pp('mstack', 90, 55); pp('mstack', 90, 56);
    row('boxes', 76, 79, 56); pp('crate', 84, 55); pp('crate', 85, 56); pp('sack', 87, 56); pp('barrel', 75, 47, '#8a6a2a');
    L(79, 50.5); L(87, 50.5); L(83, 55);
    fa = 'I';
    R('Isolamento', 52, 58, 9, 4, 'iso', ['#3e3c3a', '#3a3836'], ISOW, { ly: 61.4, f: 1 }); D(51, 59, 1, 2);
    pp('gdesk', 60, 58); L(56, 59.5);
    for (let j = 0; j < 3; j++) {
      const x0 = 52 + 3 * j, ri = R('Cella d\'isolamento', x0, 63, 2, 4, 'iso', ['#34322f', '#302e2c'], ISOW, { nl: 1, f: 1 });
      D(x0 + 1, 62, 1, 1); pp('sdoor', x0 + 1, 62, {}); DE('mat', x0, 66); iso.push({ ri, x: x0 + 1, y: 64.6, door: [x0 + 1, 62] });
    }
    fa = 'G';
    R('Ingresso', 62, 58, 18, 9, 'ptile', ['#a29a8a', '#9c9484'], PAINTG, { ly: 60.2, f: 1 }); D(70, 67, 3, 1); D(70, 70, 3, 2);
    for (const x of [70, 71, 72]) { pp('bgate', x, 67, { l: x === 71 }); pp('bgate', x, 71, { l: x === 71 }); }
    row('fdesk', 63, 66, 61); pp('mdet', 69, 62); pp('turn', 72, 62); pp('turn', 74, 62); pp('bench', 76, 59); pp('bench', 78, 59); pp('flag', 79, 64); pp('plant', 62, 65); pp('plant', 79, 66);
    for (const [x, y] of [[66, 63], [72, 64.5], [77, 61]]) L(x, y);
    R('Sala colloqui', 81, 58, 10, 9, 'lino2', ['#6a6058', '#665c54'], PAINTG, { ly: 59.5, f: 1 }); D(80, 61, 1, 2);
    row('booth', 82, 90, 63); pp('plant', 90, 58); L(84, 62); L(88, 62);

    // ---------------- PRIMO PIANO ----------------
    ox = O1; fa = 'P';
    for (let i = 0; i < 7; i++) {
      const x0 = 9 + 5 * i; R('Cella C' + (i + 1), x0, 9, 4, 4, 'cellf', CELL, CELLW, { nl: 1, f: 1 }); D(x0 + 1, 13, 2, 1); pp('bars', x0 + 1, 13, { l: 1, k: 1 }); pp('bars', x0 + 2, 13, { k: 1 });
      twoY('bunk', x0, 10, { c: ['#4a5a6a', '#6a4a3a', '#3a5a3a'][i % 3] }); pp('wc', x0 + 3, 9); pp('desk1', x0 + 3, 11, { v: i + 6 });
      R('Cella D' + (i + 1), x0, 27, 4, 4, 'cellf', CELL, CELLW, { nl: 1, f: 1 }); D(x0 + 1, 26, 2, 1); pp('bars', x0 + 1, 26, { l: 1, k: 1 }); pp('bars', x0 + 2, 26, { k: 1 });
      twoY('bunk', x0, 30, { c: ['#5a4a6a', '#3a4a6a', '#6a6a3a'][i % 3] }); pp('wc', x0 + 3, 30); pp('desk1', x0 + 3, 28, { v: i + 2 });
    }
    R('Scala del braccio', 44, 9, 4, 4, 'mstair', ['#5a5e64', '#565a60'], PAINT, { nl: 1 }); D(45, 13, 2, 1);
    R('Ballatoio', 9, 14, 39, 12, 'grate', ['#5e6266', '#5a5e62'], PAINT, { nl: 1 });
    R('Sopra la galleria', 11, 16, 32, 8, 'abyss', ['#0b0c0e', '#0c0d10'], PAINT, { nl: 1 });
    for (let y = 16; y <= 23; y++) for (let x = 11; x <= 42; x++) pp(x === 11 || x === 42 || y === 16 || y === 23 ? 'prail' : 'pvoid', x, y, { e: x === 11 ? 'w' : x === 42 ? 'e' : y === 16 ? 'n' : y === 23 ? 's' : '' });
    for (const x of [12, 22, 32, 42]) { L(x, 15); L(x, 24.5); } L(46, 11);
    fa = 'U';
    R('Sala di controllo', 52, 47, 13, 10, 'lino2', ['#4e586e', '#4a546a'], PAINTG, { ly: 56.4, f: 1 }); D(58, 57, 2, 1);
    R('Scala delle guardie', 52, 47, 2, 2, 'mstair', ['#5a5e64', '#565a60'], PAINTG, { nl: 1, f: 1 });
    row('cctv', 56, 62, 47); row('desk', 57, 61, 49); pp('dchair', 58, 50, ['#2a2e36', 'n']); pp('dchair', 60, 50, ['#2a2e36', 'n']); pp('spotsw', 64, 50); pp('spotsw', 64, 51); pp('coffee', 52, 55); pp('radio', 64, 55);
    L(56, 51); L(61, 53);
    R('Ufficio del direttore', 66, 47, 14, 10, 'parq', ['#6a4628', '#664426'], WOODW, { ly: 56.4, f: 1 }); D(72, 57, 2, 1);
    row('shelf', 66, 70, 47); pp('ddesk', 73, 51); pp('ddesk', 72, 51, { part: 1 }); pp('dchair', 73, 50, ['#5a2a1a', 's']); pp('flag', 79, 47); pp('safe', 79, 50); two('sofa', 68, 55, {}); pp('table', 68, 53); pp('plant', 66, 56); pp('plant', 79, 56); pp('globe', 76, 47);
    decals.push([O1 + 70.2, 49.2, 6.6, 5.6, '#4a1e22'], [O1 + 70.4, 49.4, 6.2, 0.07, '#c8a040'], [O1 + 70.4, 54.6, 6.2, 0.07, '#c8a040']);
    L(70, 50); L(76, 52); L(72, 55);
    R('Archivio', 82, 47, 9, 10, 'concrete', ['#5a5852', '#56544e'], CONC, { ly: 56.4, f: 1 }); D(85, 57, 2, 1);
    for (const y of [49, 52, 55]) row('filecab', 83, 89, y); L(86, 50.5); L(86, 53.5);
    R('Corridoio degli uffici', 52, 58, 39, 3, 'office', ['#3a4a6a', '#384868'], PAINTG, { nl: 1, f: 1 });
    for (const x of [56, 66, 76, 86]) L(x, 59.5); pp('plant', 52, 60); pp('plant', 90, 60); pp('bench', 70, 60); pp('bench', 80, 60);

    // PASSAGGI tra i livelli: la scala del braccio e la scala delle guardie
    const cellsOf = (x0, x1, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a.push([x, y]); return a; };
    const portals = [
      { k: 'braccio', n: 'la scala del braccio', f: 0, tf: 1, cells: cellsOf(44, 47, 9, 9), to: x => [x + O1, 11.6] },
      { k: 'braccio', n: 'la scala del braccio', f: 1, tf: 0, cells: cellsOf(O1 + 44, O1 + 47, 9, 9), to: x => [x - O1, 11.6] },
      { k: 'guardie', n: 'la scala delle guardie', f: 0, tf: 1, cells: cellsOf(52, 53, 47, 47), to: x => [x + O1, 49.6] },
      { k: 'guardie', n: 'la scala delle guardie', f: 1, tf: 0, cells: cellsOf(O1 + 52, O1 + 53, 47, 47), to: x => [x - O1, 49.6] }];
    const PORT = new Uint8Array(W * H); portals.forEach((p, i) => { for (const [x, y] of p.cells) PORT[y * W + x] = i + 1; });
    // RIFLETTORI delle torrette (di notte): una pozza di luce che spazza il cortile, il carico e la fascia di ronda (uguale su ogni telefono: dipende dal tempo)
    const spotl = [
      { t: [5, 71], cx: 27, cy: 57, rx: 14, ry: 7, per: 23, ph: 0 }, { t: [5, 37], cx: 24, cy: 41, rx: 12, ry: 6, per: 19, ph: 2.1 },
      { t: [95, 37], cx: 82, cy: 40, rx: 7, ry: 4, per: 15, ph: 1 }, { t: [95, 71], cx: 50, cy: 68.9, rx: 41, ry: 0.5, per: 31, ph: 0.5 },
      { t: [5, 5], cx: 50, cy: 6.9, rx: 41, ry: 0.5, per: 35, ph: 1.7 }, { t: [95, 5], cx: 92.9, cy: 37, rx: 0.5, ry: 29, per: 27, ph: 2.6 }];
    // guardie: giri di ronda [x, y, attesa, dove guarda]
    const routes = {
      braccio: { n: 'secondino', route: [[20.5, 15.0, 2, -1.57], [40.5, 15.0, 1.5, -1.57], [43.5, 22.5, 1.5, 3.14], [30.5, 24.6, 2, 1.57], [12.5, 24.6, 2, 1.57], [10.5, 15.5, 1.5, 0]] },
      cortile: { route: [[15.5, 46.5, 2, 0], [28.5, 44.5, 2, 1.57], [44.5, 40.5, 2, 3.14], [44.5, 58.5, 2, 3.14], [28.5, 63.5, 2, -1.57], [12.5, 56.5, 2, 0]] },
      centro: { route: [[49.5, 11.5, 1, 1.57], [59.5, 15.5, 2, 0], [67.5, 19.5, 2, 3.14], [50.0, 30.5, 1.5, 1.57], [60.5, 31.6, 1.5, 0], [50.0, 45.5, 2, 3.14], [50.0, 64.5, 1.5, -1.57]] },
      servizio: { route: [[81.5, 24.5, 2, 1.57], [82.5, 32.5, 1.5, -1.57], [61.5, 40.5, 2, 0], [69.5, 35.5, 1.5, 3.14], [81.5, 17.5, 2, 1.57]] },
      ingresso: { post: 1, n: 'portinaio', route: [[71.5, 64.5, 4, 1.57], [66.5, 63.5, 3, 0]] },
      ronda: { route: [[7.0, 7.0, 1, 0], [50.0, 7.0, 1, 0], [93.0, 7.0, 1, 1.57], [93.0, 50.0, 1, 1.57], [93.0, 69.0, 1, 3.14], [50.0, 69.0, 1, 3.14], [7.0, 69.0, 1, -1.57], [7.0, 40.0, 1, -1.57]] },
      isolamento: { post: 1, n: 'carceriere', route: [[57.5, 59.5, 4, 1.57], [54.5, 60.5, 3, 1.57]] },
      uffici: { route: [[O1 + 58.5, 52.5, 3, -1.57], [O1 + 72.5, 54.5, 2, 3.14], [O1 + 85.5, 51.0, 2, 3.14], [O1 + 70.5, 59.5, 2, 0], [O1 + 56.5, 59.5, 2, 0]] } };
    // posti dove i detenuti del computer passano la giornata [x, y]
    const acts = [[15.5, 40.5], [20.5, 37.5], [18.5, 43.5], [39.5, 35.5], [42.5, 36.5], [14.5, 33.5], [31.5, 33.5], [16.5, 52.5], [39.5, 52.5], [12.5, 60.5], [16.5, 62.5], [43.5, 60.5], [33.5, 55.5],
      [11.5, 19.5], [14.5, 18.5], [20.5, 22.5], [30.5, 18.5], [34.5, 21.5], [56.5, 12.5], [62.5, 15.5], [57.5, 18.5], [58.5, 25.5], [80.5, 25.5], [86.5, 31.5], [56.5, 40.5], [65.5, 40.5], [67.5, 24.5]];
    // per ogni casella: la stanza e le caselle in luce
    const LITC = new Uint8Array(W * H);
    for (const [lx, ly] of lamps) for (let y = Math.floor(ly - 2); y <= ly + 2; y++) for (let x = Math.floor(lx - 2); x <= lx + 2; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - lx, y + 0.5 - ly) < 2) LITC[y * W + x] = 1;
    const ri = (x, y) => { for (let i = rooms.length - 1; i >= 0; i--) { const r = rooms[i]; if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; };
    const ROOM = new Int16Array(W * H).fill(-1); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ROOM[y * W + x] = ri(x, y);
    // porte: la stanza accanto (prima quella sotto o a destra: le sbarre delle celle contano come corridoio, non come cella)
    for (const [x0, y0, w, h] of doors) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      let a = -1; for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const r = ri(x + dx, y + dy); if (r >= 0 && !/^Cella /.test(rooms[r].n)) { a = r; break; } if (r >= 0 && a < 0) a = r; }
      ROOM[y * W + x] = a;
    }
    const pcells = [2, 3, 4, 9], ring = pcells.map(k => cells[k]).flatMap(c => c.sp.map(([x, y]) => [Math.floor(x), Math.floor(y)]));
    // NASCONDIGLI per la refurtiva [casella]: prima quelli comuni (le guardie a volte li controllano), poi la piastrella smossa di ogni cella dei giocatori
    const stash = [{ x: 12, y: 60, n: 'l\'orto', i: '🌱' }, { x: 21, y: 64, n: 'la casetta degli attrezzi', i: '🏚️' }, { x: 10, y: 18, n: 'dietro la tv', i: '📺' }, { x: 67, y: 25, n: 'lo scarico della doccia', i: '🚿' }];
    for (const k of pcells) { const c = cells[k]; c.st = stash.length; stash.push({ x: c.x0 + 3, y: c.y0 === 9 ? 10 : 29, n: 'la piastrella della cella ' + c.n, i: '🧱', cell: k, r: 0.8 }); }
    // TUNNEL: si scava nell'angolo sotto la branda e si sbuca nel bosco oltre il muro (deco 'hole' ridisegnata quando cambia)
    for (const k of pcells) { const c = cells[k], hy = c.y0 === 9 ? 11 : 28; c.hole = [c.x0 + 0.5, hy + 0.5]; c.ht = [c.x0, hy]; c.exit = [c.x0 + 1.5, 2.5]; deco.push([c.x0, hy, 'hole']); }
    return { w: W, h: H, rooms, doors, decals, props, holes, deco, tasks: [], hall, cams: [], vending: [], ring, button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      draw, floor: FLOOR, decoDraw, drawWall, ground, bg: () => '#07080b', bgSc: 1.5,
      lamps, LITC, ROOM, cells, pcells, iso, spots, portals, PORT, spotl, routes, acts, gal, stash, isoOut: [50.0, 59.5] };
  }
  const roomAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); return xi < 0 || yi < 0 || xi >= W || yi >= H ? -1 : M.ROOM[yi * W + xi]; };
  const roomN = (x, y) => { const r = roomAt(x, y); return r >= 0 ? MP().rooms[r] : null; };
  const litAt = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); return xi >= 0 && yi >= 0 && xi < W && yi < H && !!MP().LITC[yi * W + xi]; };
  // zona vietata: stanze con f (guardie, uffici, carico, fuori, fascia di ronda, isolamento)
  const forbAt = (x, y) => { const r = roomN(x, y); return !!(r && r.f); };
  const portalAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); if (xi < 0 || yi < 0 || xi >= W || yi >= H || !M.PORT) return null; const i = M.PORT[yi * W + xi]; return i ? M.portals[i - 1] : null; };
  // PERCORSO anche tra i due livelli: fino alla casella della scala, poi dall'arrivo alla meta (la scala col percorso piu' corto)
  function route(sx, sy, ex, ey) {
    const a = floorOf(sx), b = floorOf(ex);
    if (a === b) return cqPath(sx, sy, ex, ey);
    let best = null;
    for (const Pq of MP().portals) {
      if (Pq.f !== a || Pq.tf !== b) continue;
      let c = Pq.cells[0], cd = 1e9; for (const q of Pq.cells) { const d = Math.hypot(q[0] + 0.5 - sx, q[1] + 0.5 - sy); if (d < cd) { cd = d; c = q; } }
      const p1 = cqPath(sx, sy, c[0] + 0.5, c[1] + 0.5); if (!p1.length && cd > 0.8) continue;
      const [ax, ay] = Pq.to(c[0] + 0.5, c[1] + 0.5), p2 = cqPath(ax, ay, ex, ey); if (!p2.length && Math.hypot(ax - ex, ay - ey) > 0.8) continue;
      if (!p1.length) p1.push([c[0] + 0.5, c[1] + 0.5]);
      const n = p1.length + p2.length; if (!best || n < best.n) best = { n, p: p1.concat(p2) };
    }
    return best ? best.p : [];
  }
  function npcTp(c) {
    const Pq = portalAt(c.x, c.y); if (!Pq || !c.path || !c.path.some(q => floorOf(q[0]) === Pq.tf)) return false;
    const [x, y] = Pq.to(c.x, c.y); c.x = x; c.y = y; while (c.path.length && floorOf(c.path[0][0]) !== Pq.tf) c.path.shift(); return true;
  }

  // ---- disegno della mappa (K = attrezzi di cqTools). REGOLA DELLE LUCI: aloni solo con K.glow, colori pieni negli oggetti ----
  const FLOOR = {
    cellf(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 5, ['rgba(255,255,255,.08)', 'rgba(0,0,0,.16)'], K.TW / 22); if (K.hsh(x, y, 7) < 0.18) { const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0.2, 0.3 + 0.4 * K.hsh(x, y, 8)), Pp(0.55, 0.5)], [Pp(0.55, 0.5), Pp(0.85, 0.35 + 0.5 * K.hsh(x, y, 9))]], 'rgba(0,0,0,.28)'); } },
    pris(K, x, y) {   // linoleum a quadrotti del braccio, consumato al centro
      const Pp = (u, v) => K.S(x + u, y + v, 0); if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], 'rgba(0,0,0,.06)');
      if (K.TW < 40) return; K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(0,0,0,.12)'); if (K.hsh(x, y, 3) < 0.1) K.speck(x, y, 3, ['rgba(0,0,0,.18)'], K.TW / 18);
    },
    pris2(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)]], 'rgba(0,0,0,.14)'); K.speck(x, y, 2, ['rgba(255,255,255,.07)'], K.TW / 22); },
    ktile(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0.5), Pp(1, 0.5)], [Pp(0.5, 0), Pp(0.5, 1)], [Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(40,10,5,.35)'); },
    shtile(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0), L = []; for (const u of [0.25, 0.5, 0.75]) L.push([Pp(u, 0), Pp(u, 1)], [Pp(0, u), Pp(1, u)]); K.strokes(L, 'rgba(255,255,255,.18)'); if (x === 67 && y === 25) K.dot(x + 0.5, y + 0.5, 0, 0.09, '#2a3438'); },
    yard(K, x, y) {   // asfalto del cortile: crepe, macchie e qualche ciuffo d'erba
      if (K.TW < 40) return; K.speck(x, y, 7, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.16)'], K.TW / 20);
      const h = K.hsh(x, y, 11), Pp = (u, v) => K.S(x + u, y + v, 0);
      if (h < 0.07) K.strokes([[Pp(0.1, 0.3), Pp(0.5, 0.45)], [Pp(0.5, 0.45), Pp(0.7, 0.9)]], 'rgba(0,0,0,.3)');
      else if (h < 0.1) { const [X, Y] = Pp(0.5, 0.5); K.g.fillStyle = 'rgba(20,20,22,.3)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.22, K.TW * 0.1, 0, 0, 7); K.g.fill(); }
      else if (h < 0.14) { const L = []; for (let i = 0; i < 4; i++) { const u = 0.3 + 0.1 * i; L.push([K.S(x + u, y + 0.6, 0), K.S(x + u + 0.03, y + 0.6, 0.16)]); } K.strokes(L, 'rgba(110,150,70,.7)', Math.max(1.5, K.TW / 30)); }
    },
    gravel(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 12, ['rgba(255,250,235,.22)', 'rgba(40,30,20,.25)', 'rgba(120,110,95,.4)'], K.TW / 22); },
    mstair(K, x, y) {   // scala di metallo: gradini a strisce
      const Pp = (u, v) => K.S(x + u, y + v, 0), L = []; for (let i = 0; i < 4; i++) L.push([Pp(0, i / 4 + 0.08), Pp(1, i / 4 + 0.08)]);
      K.strokes(L, '#2e3034', Math.max(2, K.TW / 16)); K.strokes([[Pp(0, 0.5), Pp(1, 0.5)]], 'rgba(220,220,230,.18)');
    },
    lino2(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(255,255,255,.06)'); },
    iso(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 4, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.05)'], K.TW / 18); },
    ptile(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 6, ['rgba(255,255,255,.18)', 'rgba(0,0,0,.14)', 'rgba(140,90,60,.2)'], K.TW / 28); const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(255,255,255,.12)'); },
    grate(K, x, y) {   // grigliato di metallo del ballatoio
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0), L = []; for (const u of [0.2, 0.4, 0.6, 0.8]) L.push([Pp(u, 0), Pp(u, 1)]); for (const v of [0.33, 0.66]) L.push([Pp(0, v), Pp(1, v)]);
      K.strokes(L, 'rgba(20,22,26,.45)'); K.strokes([[Pp(0, 0.02), Pp(1, 0.02)]], 'rgba(255,255,255,.12)');
    },
    abyss(K, x, y) { const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#0a0b0d' : '#0c0d10'); },
    office(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 6, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.12)'], K.TW / 26); },
    parq(K, x, y) {   // parquet a spina di pesce (ufficio del direttore)
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0), L = [];
      if ((x + y) % 2) for (const u of [0.25, 0.5, 0.75]) L.push([Pp(u, 0), Pp(u, 1)]); else for (const v of [0.25, 0.5, 0.75]) L.push([Pp(0, v), Pp(1, v)]);
      K.strokes(L, 'rgba(0,0,0,.2)');
    },
    road(K, x, y) {   // la strada: marciapiede in alto, asfalto, riga di mezzeria tratteggiata
      const Pp = (u, v) => K.S(x + u, y + v, 0);
      if (y === 72) { K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#7a766e'); if (K.TW >= 40) K.strokes([[Pp(0, 0.96), Pp(1, 0.96)], [Pp(0.5, 0), Pp(0.5, 1)]], 'rgba(0,0,0,.25)'); return; }
      if (K.TW < 40) return; K.speck(x, y, 5, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.16)'], K.TW / 22);
      if (y === 75 && x % 3 === 0) K.poly([Pp(0.1, 0.42), Pp(0.9, 0.42), Pp(0.9, 0.58), Pp(0.1, 0.58)], '#d8d0b0');
    },
    dock(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 6, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.18)'], K.TW / 20); if (K.hsh(x, y, 4) < 0.08) { const [X, Y] = K.S(x + 0.5, y + 0.5, 0); K.g.fillStyle = 'rgba(10,10,12,.3)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.25, K.TW * 0.12, 0, 0, 7); K.g.fill(); } }
  };
  // decorazioni calpestabili (materasso a terra in isolamento)
  // stato dei buchi (aggiornato da syncHoles): [progresso 0-2, sacchi di terra, murato]
  const HST = {};
  function holeArt(K, x, y) {
    const h = HST[x + ',' + y]; if (!h) return; const g = K.g, TW = K.TW;
    if (h.s) { K.bx(x + 0.08, y + 0.12, x + 0.88, y + 0.9, 0, 0.03, '#a8a296'); K.strokes([[K.S(x + 0.2, y + 0.3, 0.03), K.S(x + 0.6, y + 0.7, 0.03)], [K.S(x + 0.5, y + 0.2, 0.03), K.S(x + 0.75, y + 0.55, 0.03)]], 'rgba(0,0,0,.3)'); return; }
    if (h.p > 0) { const [X, Y] = K.S(x + 0.45, y + 0.5, 0), r = (0.2 + 0.1 * Math.min(2, h.p)) * TW * 0.707;
      g.fillStyle = '#6a4a2e'; g.beginPath(); g.ellipse(X, Y, r * 1.25, r * 0.62, 0, 0, 7); g.fill();
      g.fillStyle = h.p >= 2 ? '#050403' : '#1e140c'; g.beginPath(); g.ellipse(X, Y, r, r * 0.5, 0, 0, 7); g.fill(); }
    for (let i = 0; i < Math.min(4, h.d); i++) { const u = 0.12 + (i % 2) * 0.36, v = i < 2 ? 0.08 : 0.42; K.bx(x + u, y + v, x + u + 0.3, y + v + 0.28, 0, 0.26, '#8a6a42'); K.bx(x + u + 0.1, y + v + 0.1, x + u + 0.2, y + v + 0.18, 0.26, 0.31, '#6a4a2e'); }
  }
  // CAMION DELLA LAVANDERIA (x0, y0 = angolo dietro a nord-ovest; lungo 5,8 verso est, largo 2,4): cassone bianco con la striscia blu, cabina blu
  function truckArt(K, x0, y0) {
    const { bx, dot, poly, S } = K, x1 = x0 + 4.25, y1 = y0 + 2.4;
    for (const u of [0.8, 3.4]) { bx(x0 + u, y1 - 0.12, x0 + u + 0.7, y1 + 0.02, 0, 0.5, '#1a1a1e'); bx(x0 + u, y0 - 0.02, x0 + u + 0.7, y0 + 0.12, 0, 0.5, '#1a1a1e'); }
    bx(x1 + 0.4, y1 - 0.12, x1 + 1.1, y1 + 0.02, 0, 0.5, '#1a1a1e');
    bx(x0, y0, x1, y1, 0.42, 2.35, '#e8e6de'); K.qL(x0, x1, y1 + 0.005, 1.02, 1.26, '#2a5aa8'); K.qL(x0, x1, y1 + 0.006, 0.9, 0.96, '#c83a2a');
    dot(x0 + 2.1, y1 + 0.03, 1.75, 0.2, '#f4f2ea'); dot(x0 + 2.1, y1 + 0.03, 1.75, 0.13, '#3a7ad8');
    bx(x1 + 0.05, y0 + 0.15, x1 + 1.6, y1 - 0.15, 0.42, 1.75, '#3a6ab8'); bx(x1 + 0.05, y0 + 0.2, x1 + 0.9, y1 - 0.2, 1.75, 1.85, '#2a4a88');
    poly([S(x1 + 1.62, y0 + 0.35, 1.68), S(x1 + 1.62, y1 - 0.35, 1.68), S(x1 + 1.62, y1 - 0.35, 1.15), S(x1 + 1.62, y0 + 0.35, 1.15)], '#2a3a4a');
    poly([S(x1 + 0.3, y1 - 0.14, 1.62), S(x1 + 1.3, y1 - 0.14, 1.62), S(x1 + 1.3, y1 - 0.14, 1.15), S(x1 + 0.3, y1 - 0.14, 1.15)], '#2a3a4a');
    bx(x1 + 1.55, y0 + 0.2, x1 + 1.68, y1 - 0.2, 0.42, 0.72, '#c8ccd2'); dot(x1 + 1.69, y0 + 0.45, 0.85, 0.06, '#fff4b0'); dot(x1 + 1.69, y1 - 0.45, 0.85, 0.06, '#fff4b0');
  }
  function decoDraw(K, t, x, y) { if (t === 'hole') { holeArt(K, x, y); return; } if (t === 'mat') { K.bx(x + 0.15, y + 0.05, x + 1.85, y + 0.9, 0, 0.12, '#6a6656'); K.bx(x + 0.2, y + 0.1, x + 0.6, y + 0.85, 0.12, 0.18, '#8a8676'); } }
  // SEGNI A TERRA (nella mappa pronta): campo da basket, posti dell'appello, linee gialle, parcheggio del camion, strisce pedonali
  function ground(K) {
    const g = K.g, S = K.S, TW = K.TW, ln = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w || Math.max(1.5, TW / 22); g.beginPath(); pts.forEach((p, i) => { const [X, Y] = S(p[0], p[1], 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); };
    const arc = (cx, cy, r, a0, a1, col) => { const P2 = []; for (let i = 0; i <= 20; i++) { const a = a0 + (a1 - a0) * i / 20; P2.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } ln(P2, col); };
    const box = (x0, y0, x1, y1, col, w) => ln([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], col, w);
    const fill = (x0, y0, x1, y1, col) => K.poly([S(x0, y0, 0), S(x1, y0, 0), S(x1, y1, 0), S(x0, y1, 0)], col);
    if (MP() && MP().w === W) {
      // campo da basket: fondo rosso mattone, linee bianche, cerchio, aree e tiro da tre
      fill(10.6, 34.6, 25.4, 44.4, 'rgba(150,60,40,.45)'); const wl = 'rgba(240,236,224,.85)';
      box(10.8, 34.8, 25.2, 44.2, wl); ln([[18, 34.8], [18, 44.2]], wl); arc(18, 39.5, 1.6, 0, 7, wl);
      for (const [x0, x1] of [[10.8, 14.6], [25.2, 21.4]]) { box(Math.min(x0, x1), 38, Math.max(x0, x1), 41, wl); }
      arc(11.6, 39.5, 4.6, -1.35, 1.35, wl); arc(24.4, 39.5, 4.6, Math.PI - 1.35, Math.PI + 1.35, wl);
      // tappetone della palestra all'aperto
      fill(36.6, 32.4, 47.4, 38.4, 'rgba(30,32,36,.55)');
      // POSTI DELL'APPELLO: quadrati gialli col numero davanti al palco
      g.font = '800 ' + Math.round(TW * 0.36) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      MP().spots.forEach(([x, y], i) => { fill(x - 0.42, y - 0.42, x + 0.42, y + 0.42, 'rgba(240,200,60,.22)'); box(x - 0.42, y - 0.42, x + 0.42, y + 0.42, '#e8c040', Math.max(2, TW / 16)); const [X, Y] = S(x, y, 0); g.fillStyle = '#f2d050'; g.fillText(String(i + 1), X, Y); });
      ln([[20.6, 50.4], [37.4, 50.4]], 'rgba(240,200,60,.6)');
      // linea gialla davanti alla rete (oltre e' vietato)
      ln([[9.25, 32.2], [9.25, 66.75], [47.8, 66.75]], '#e8c040', Math.max(2, TW / 14));
      // galleria: linee gialle davanti alle sbarre
      for (const y of [14.25, 25.75]) for (let i = 0; i < 7; i++) { const x0 = 9 + 5 * i; if (y > 20 && i === 3) continue; ln([[x0 + 0.6, y], [x0 + 3.4, y]], 'rgba(230,190,60,.8)'); }
      // posto del camion nel cortile di carico (strisce gialle), strisce pedonali davanti al cancello
      box(82.4, 38.4, 89.6, 42.6, '#e8c040', Math.max(2, TW / 16)); for (let i = 0; i < 6; i++) ln([[83 + i * 1.1, 38.6], [83.8 + i * 1.1, 42.4]], 'rgba(232,192,64,.5)');
      for (let i = 0; i < 5; i++) fill(69.6 + i * 0.75, 73.2, 69.95 + i * 0.75, 76.6, 'rgba(230,230,220,.55)');
      for (let x = 13; x < 31; x += 4) ln([[x, 72.9], [x, 74.2]], 'rgba(230,230,220,.6)'); for (let x = 82; x < 92; x += 4) ln([[x, 72.9], [x, 74.2]], 'rgba(230,230,220,.6)');
    }
  }
  // MURI. Muro di cinta (alto, col filo spinato), torrette, siepe al bordo, facciate di mattoni verso il cortile/fuori, muri dipinti dentro
  const isCinta = (x, y) => x < 100 && (((x === 4 || x === 5 || x === 94 || x === 95) && y >= 4 && y <= 71) || ((y === 4 || y === 5 || y === 70 || y === 71) && x >= 4 && x <= 95));
  function drawWall(K, x, y, col) {
    const { bx, qL, strokes, S } = K, TW = K.TW, g = K.g;
    if (TOWK.has(x + ',' + y)) { if (TOWER.some(([a, b]) => a === x && b === y)) tower(K, x, y); return; }
    if (isCinta(x, y)) {   // muro di cinta di cemento con i pannelli, la cimasa e il filo spinato a spirale sul lato di fuori
      bx(x, y, x + 1, y + 1, 0, 2.15, '#8c8a84'); bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, 2.15, 2.25, '#a8a69e');
      if (TW >= 40) { const L = []; if (y === 71 || y === 5) L.push([S(x, y + 1, 0.05), S(x, y + 1, 2.1)]); if (x === 95 || x === 5) L.push([S(x + 1, y, 0.05), S(x + 1, y, 2.1)]); L.push([S(x, y + 1, 1.05), S(x + 1, y + 1, 1.05)], [S(x + 1, y, 1.05), S(x + 1, y + 1, 1.05)]); strokes(L, 'rgba(0,0,0,.18)');
        if ((x + y) % 7 === 0) { qL(x + 0.1, x + 0.9, y + 1, 0.1, 0.5, 'rgba(60,50,40,.25)'); } }
      if (x === 4 || x === 95 || y === 4 || y === 71) {   // filo spinato
        const v = x === 4 || x === 95, L = [];
        for (let i = 0; i < 4; i++) { const u = i / 4 + 0.125; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = (k + 1) / 8 * Math.PI * 2, r = 0.17; const p = (an) => v ? S(x + 0.5 + Math.cos(an) * r, y + u, 2.42 + Math.sin(an) * r) : S(x + u, y + 0.5 + Math.cos(an) * r, 2.42 + Math.sin(an) * r); L.push([p(a), p(b)]); } }
        strokes(L, '#b8bcc4', Math.max(1, TW / 40));
        for (const u of [0.1, 0.9]) bx(v ? x + 0.46 : x + u - 0.03, v ? y + u - 0.03 : y + 0.46, v ? x + 0.54 : x + u + 0.03, v ? y + u + 0.03 : y + 0.54, 2.25, 2.62, '#4a4c50');
      }
      return;
    }
    if (x < 100 && (x === 0 || x === 99 || y === 0 || y === 77)) { bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.8, '#2f5a2e'); if (TW >= 40) for (let i = 0; i < 3; i++) K.dot(x + 0.2 + 0.6 * K.hsh(x, y, i), y + 0.95, 0.2 + 0.5 * K.hsh(x, y, i + 9), 0.035, '#3f7a3a'); return; }
    // facciata: il muro tocca il cortile, la fascia di ronda o il fuori
    const M = MP(), outer = M && M.ROOM && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => { const r = M.ROOM[(y + dy) * W + x + dx]; return r >= 0 && 'XRY'.includes(M.rooms[r].ala); });
    if (outer && x < 100) {   // mattoni rossi con lo zoccolo di cemento e le finestrelle a sbarre (accese o buie)
      bx(x, y, x + 1, y + 1, 0, 1.4, '#7a3e2e'); bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, 1.4, 1.48, '#9a948a');
      if (TW >= 40) {
        qL(x, x + 1, y + 1, 0, 0.22, '#6a6660'); const L = []; for (const z of [0.45, 0.7, 0.95, 1.2]) L.push([S(x, y + 1, z), S(x + 1, y + 1, z)], [S(x + 1, y + 1, z), S(x + 1, y, z)]); strokes(L, 'rgba(0,0,0,.22)');
        if ((x + 2 * y) % 3 === 0) { const lit = K.hsh(x, y, 5) < 0.35; qL(x + 0.3, x + 0.7, y + 1, 0.6, 1.15, lit ? '#e8c878' : '#1e2430'); const B = []; for (const u of [0.4, 0.5, 0.6]) B.push([S(x + u, y + 1, 0.6), S(x + u, y + 1, 1.15)]); strokes(B, '#3a3c40', Math.max(1, TW / 34)); }
        if ((2 * x + y) % 3 === 0) { const lit = K.hsh(x, y, 6) < 0.35, P = (v, z) => S(x + 1, y + v, z); K.poly([P(0.3, 1.15), P(0.7, 1.15), P(0.7, 0.6), P(0.3, 0.6)], lit ? '#d8b868' : '#1a1f2a'); }
      }
      return;
    }
    // muri dentro: pittura a due colori (zoccolo scuro, sopra chiaro), con la riga in mezzo
    const low = col === CELLW ? '#6e6a60' : col === PAINTG ? '#3e4c64' : col === WOODW ? '#4a301c' : col === ISOW ? '#45423e' : col === KITW ? '#d8d6ce' : col === PAINT ? '#4f6b5e' : col;
    const up = col === CELLW ? '#a8a294' : col === PAINTG ? '#c8ccd2' : col === WOODW ? '#7a5236' : col === ISOW ? '#5e5a54' : col === KITW ? '#eceae4' : col === PAINT ? '#cfc8b4' : cqShade(col, 1.25);
    bx(x, y, x + 1, y + 1, 0, 0.45, low); bx(x, y, x + 1, y + 1, 0.45, 0.95, up); bx(x - 0.01, y - 0.01, x + 1.01, y + 1.01, 0.95, 1.0, cqShade(low, 0.9));
    if (TW < 40) return;
    strokes([[S(x, y + 1, 0.45), S(x + 1, y + 1, 0.45)], [S(x + 1, y + 1, 0.45), S(x + 1, y, 0.45)]], 'rgba(0,0,0,.25)');
    if (col === KITW) { const L = []; for (const u of [0.25, 0.5, 0.75]) L.push([S(x + u, y + 1, 0.45), S(x + u, y + 1, 0.95)]); strokes(L, 'rgba(0,0,0,.12)'); }
    // sul lato in vista: poster nelle celle, bacheche e orologi nel braccio, quadri dal direttore, crepe in isolamento
    const h = K.hsh(x, y, 13), r = M && M.ROOM ? M.ROOM[(y + 1) * W + x] : -1, R = r >= 0 ? M.rooms[r] : null;
    if (!R) return;
    if (col === CELLW && /^Cella [ABCD]/.test(R.n) && h < 0.55) { const c = ['#c84a3a', '#3a7ac8', '#e8c040', '#5aa84a', '#d878a8'][Math.floor(h * 9) % 5]; qL(x + 0.2, x + 0.8, y + 1, 0.45, 0.9, '#efe8d8'); qL(x + 0.26, x + 0.74, y + 1, 0.5, 0.84, c); if (h < 0.2) K.dot(x + 0.5, y + 1, 0.72, 0.06, '#f2e2c8'); }
    else if (col === PAINT && R.ala === 'B' && x % 9 === 4) { qL(x + 0.15, x + 0.85, y + 1, 0.55, 0.9, '#8a6a42'); for (let i = 0; i < 3; i++) qL(x + 0.22 + i * 0.2, x + 0.36 + i * 0.2, y + 1, 0.62 + (i % 2) * 0.1, 0.8 + (i % 2) * 0.06, ['#f2f0e8', '#f2e2a8', '#e8e8f2'][i]); }
    else if ((col === PAINT || col === PAINTG) && x % 13 === 7) { const [X, Y] = S(x + 0.5, y + 1, 0.72); g.fillStyle = '#f2f0e8'; g.beginPath(); g.arc(X, Y, TW * 0.11, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = Math.max(1, TW / 40); g.stroke(); g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - TW * 0.07); g.moveTo(X, Y); g.lineTo(X + TW * 0.05, Y); g.stroke(); }
    else if (col === WOODW && x % 4 === 1) { qL(x + 0.2, x + 0.8, y + 1, 0.5, 0.88, '#c8a040'); qL(x + 0.25, x + 0.75, y + 1, 0.54, 0.84, ['#3a5a3a', '#5a3a2a', '#2a3a5a'][x % 3]); }
    else if (col === ISOW && h < 0.3) strokes([[S(x + 0.3, y + 1, 0.9), S(x + 0.45, y + 1, 0.6)], [S(x + 0.45, y + 1, 0.6), S(x + 0.4, y + 1, 0.3)]], 'rgba(0,0,0,.35)');
  }
  // TORRETTA DI GUARDIA (2x2, sull'angolo del muro di cinta): fusto di cemento, cabina coi vetri, tetto, riflettore
  function tower(K, x, y) {
    const { bx, cyl, qL, dot, glow, S } = K, x0 = x - 1, y0 = y - 1;
    bx(x0 + 0.1, y0 + 0.1, x + 0.9, y + 0.9, 0, 3.3, '#8a8780'); bx(x0, y0, x + 1, y + 1, 3.3, 3.42, '#6a6862');
    if (K.TW >= 40) { const L = []; for (const z of [0.8, 1.6, 2.4]) L.push([S(x0 + 0.1, y + 0.9, z), S(x + 0.9, y + 0.9, z)], [S(x + 0.9, y + 0.9, z), S(x + 0.9, y0 + 0.1, z)]); K.strokes(L, 'rgba(0,0,0,.18)'); }
    bx(x0 - 0.05, y0 - 0.05, x + 1.05, y + 1.05, 3.42, 3.75, '#5a6066');
    qL(x0 + 0.05, x + 0.95, y + 1.05, 3.75, 4.35, '#26303a'); { const P = (v, z) => S(x + 1.05, y0 + v, z); K.poly([P(0.05, 4.35), P(1.95, 4.35), P(1.95, 3.75), P(0.05, 3.75)], '#1e2630'); }
    for (const u of [0.05, 0.98, 1.92]) { bx(x0 + u - 0.03, y + 1.0, x0 + u + 0.05, y + 1.08, 3.75, 4.35, '#5a6066'); bx(x + 1.0, y0 + u - 0.03, x + 1.08, y0 + u + 0.05, 3.75, 4.35, '#5a6066'); }
    bx(x0 - 0.15, y0 - 0.15, x + 1.15, y + 1.15, 4.35, 4.5, '#3a3e44'); bx(x0 + 0.2, y0 + 0.2, x + 0.8, y + 0.8, 4.5, 4.62, '#2e3236');
    cyl(x0 + 1.4, y0 + 1.4, 0.18, 4.62, 4.9, '#2a2c30'); dot(x0 + 1.45, y0 + 1.5, 4.8, 0.09, '#fff6d0');
    glow(x0 + 1.45, y0 + 1.5, 4.8, 1.2, 'rgba(255,245,200,.35)');
    dot(x0 + 0.4, y + 1.0, 3.6, 0.04, '#e8302a');
  }
  // sbarre di una porta (v = varco in un muro verticale)
  const barsAt = (K, x, y, v, z, col, n = 5) => { const L = []; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; L.push(v ? [K.S(x + 0.5, y + u, 0), K.S(x + 0.5, y + u, z)] : [K.S(x + u, y + 0.5, 0), K.S(x + u, y + 0.5, z)]); } K.strokes(L, col, Math.max(2, K.TW / 16)); };
  const slab = (K, x, y, v, z, col) => v ? K.bx(x + 0.38, y, x + 0.62, y + 1, 0, z, col) : K.bx(x, y + 0.38, x + 1, y + 0.62, 0, z, col);
  const qR = (K, x, y0, y1, z0, z1, col) => K.poly([K.S(x, y0, z1), K.S(x, y1, z1), K.S(x, y1, z0), K.S(x, y0, z0)], col);
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, qL, strokes } = K, g = K.g, TW = K.TW;
    o = o || {};
    switch (t) {
      case 'tblk': break;
      case 'ltruck': truckArt(K, x, y); break;   // il camion parcheggiato (si disegna a parte): caselle solo occupate
      // ---- celle ----
      case 'bunk': {   // letto a castello (2 caselle lungo y, disegnato dalla casella davanti): due materassi, coperte, cuscini, scaletta
        if (o.part) break; const y0 = y - 1, c = o.c || '#5a6a7a';
        for (const [a, b] of [[0.06, 0.06], [0.84, 0.06], [0.06, 1.84], [0.84, 1.84]]) bx(x + a, y0 + b, x + a + 0.1, y0 + b + 0.1, 0, 1.85, '#5a6068');
        bx(x + 0.08, y0 + 0.08, x + 0.92, y + 0.92, 0.28, 0.36, '#6a7078'); bx(x + 0.1, y0 + 0.1, x + 0.9, y + 0.9, 0.36, 0.55, '#d8d4c8');
        bx(x + 0.1, y0 + 0.75, x + 0.9, y + 0.9, 0.55, 0.6, c); bx(x + 0.2, y0 + 0.15, x + 0.8, y0 + 0.55, 0.55, 0.66, '#efece4');
        bx(x + 0.08, y0 + 0.08, x + 0.92, y + 0.92, 1.25, 1.33, '#6a7078'); bx(x + 0.1, y0 + 0.1, x + 0.9, y + 0.9, 1.33, 1.5, '#d8d4c8');
        bx(x + 0.1, y0 + 0.65, x + 0.9, y + 0.9, 1.5, 1.56, cqShade(c, 1.15)); bx(x + 0.2, y0 + 0.15, x + 0.8, y0 + 0.5, 1.5, 1.62, '#efece4');
        for (let i = 0; i < 3; i++) bx(x + 0.86, y + 0.55, x + 0.94, y + 0.85, 0.5 + i * 0.3, 0.55 + i * 0.3, '#4a5058');
        // FANTOCCIO (o.dm = [sotto, sopra]): una sagoma sotto la coperta e la "testa" di stracci sul cuscino
        if (o.dm) for (const [k, z] of [[0, 0.6], [1, 1.56]]) if (o.dm[k]) { const cc = k ? cqShade(c, 1.15) : c; bx(x + 0.22, y0 + 0.62, x + 0.78, y + 0.8, z, z + 0.16, cqShade(cc, 0.9)); bx(x + 0.28, y0 + 0.7, x + 0.72, y + 0.55, z + 0.16, z + 0.22, cc); dot(x + 0.5, y0 + 0.38, z + 0.14, 0.14, '#6a4a2a'); dot(x + 0.44, y0 + 0.34, z + 0.2, 0.06, '#8a6a42'); }
        break; }
      case 'wc':   // lavandino e water d'acciaio tutto in uno
        bx(x + 0.15, y + 0.06, x + 0.85, y + 0.28, 0, 1.05, '#9aa0a6'); bx(x + 0.2, y + 0.1, x + 0.8, y + 0.28, 1.05, 1.1, '#b8bec4');
        cyl(x + 0.5, y + 0.5, 0.22, 0, 0.38, '#b8bec4'); cyl(x + 0.5, y + 0.5, 0.15, 0.38, 0.39, '#5a7a8a'); dot(x + 0.5, y + 0.2, 1.12, 0.04, '#c8ccd0'); break;
      case 'desk1': {   // mensolina-tavolino d'acciaio attaccato al muro, con le cose del detenuto
        bx(x + 0.12, y + 0.1, x + 0.88, y + 0.85, 0.66, 0.74, '#8a9096'); bx(x + 0.45, y + 0.4, x + 0.55, y + 0.55, 0, 0.66, '#6a7076');
        const v = o.v || 0; if (v % 3 === 0) { bx(x + 0.2, y + 0.25, x + 0.5, y + 0.55, 0.74, 0.8, '#8a2a2a'); bx(x + 0.22, y + 0.27, x + 0.48, y + 0.53, 0.8, 0.84, '#2a4a8a'); }
        if (v % 2 === 0) { cyl(x + 0.68, y + 0.5, 0.07, 0.74, 0.86, '#e8e4dc'); } else { bx(x + 0.55, y + 0.3, x + 0.75, y + 0.36, 0.74, 0.98, '#e8dcc0'); qL(x + 0.57, x + 0.73, y + 0.36, 0.78, 0.95, ['#c8a070', '#7aa0c8', '#d88a6a'][v % 3]); }
        break; }
      case 'bars': {   // porta a sbarre scorrevole della cella (k = primo piano: sempre chiusa)
        barsAt(K, x, y, o.v, 1.9, '#9aa2aa', 5); bx(x, y + 0.42, x + 1, y + 0.58, 1.86, 1.98, '#6a7078'); bx(x, y + 0.45, x + 1, y + 0.55, 0.92, 0.98, '#7a8088'); bx(x, y + 0.42, x + 1, y + 0.58, 0, 0.05, '#4a4e54');
        if (o.l) bx(x + 0.02, y + 0.36, x + 0.14, y + 0.64, 0.85, 1.12, '#3a3e44'); break; }
      case 'ygate': barsAt(K, x, y, 0, 2.0, '#8a929a', 6); bx(x, y + 0.42, x + 1, y + 0.58, 1.96, 2.1, '#5a6068'); bx(x, y + 0.45, x + 1, y + 0.55, 1.0, 1.06, '#6a7078'); if (o.l) { bx(x + 0.85, y + 0.32, x + 1.0, y + 0.68, 0.9, 1.2, '#3a3e44'); dot(x + 0.95, y + 0.68, 1.05, 0.03, '#e8c040'); } break;
      // ---- galleria ----
      case 'ptable':   // tavolo d'acciaio con quattro sgabelli tondi fissati a terra
        for (const [a, b] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) { cyl(x + a, y + b, 0.03, 0, 0.42, '#5a6068'); cyl(x + a, y + b, 0.11, 0.42, 0.48, '#8a929a'); }
        cyl(x + 0.5, y + 0.5, 0.07, 0, 0.72, '#5a6068'); cyl(x + 0.5, y + 0.5, 0.36, 0.72, 0.79, '#a8b0b8');
        if (K.hsh(x, y, 2) < 0.5) { bx(x + 0.32, y + 0.4, x + 0.5, y + 0.6, 0.79, 0.81, '#f2f0e8'); bx(x + 0.52, y + 0.36, x + 0.7, y + 0.56, 0.79, 0.81, '#c84a3a'); } break;
      case 'tvw':   // televisore su un palo (guarda verso est)
        bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 0, 1.75, '#3a3e44'); bx(x + 0.35, y + 0.1, x + 0.7, y + 0.9, 1.6, 2.4, '#15181d');
        qR(K, x + 0.7, y + 0.15, y + 0.85, 1.68, 2.32, '#3a8ac8'); qR(K, x + 0.7, y + 0.2, y + 0.5, 2.0, 2.28, '#7ac0e8'); glow(x + 0.9, y + 0.5, 2.0, 1.4, 'rgba(120,190,255,.3)'); break;
      case 'pchair': bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.38, 0.45, '#c8642a'); bx(x + 0.25, y + 0.25, x + 0.32, y + 0.75, 0.45, 0.9, '#b85a24'); for (const [a, b] of [[0.28, 0.28], [0.7, 0.28], [0.28, 0.7], [0.7, 0.7]]) bx(x + a, y + b, x + a + 0.03, y + b + 0.03, 0, 0.38, '#3a3e44'); break;
      case 'pong': {   // tavolo da ping pong (2 caselle lungo x)
        if (o.part) break; const x0 = x - 1;
        for (const [a, b] of [[0.2, 0.2], [1.75, 0.2], [0.2, 0.75], [1.75, 0.75]]) bx(x0 + a, y + b, x0 + a + 0.06, y + b + 0.06, 0, 0.7, '#3a3e44');
        bx(x0 + 0.1, y + 0.12, x + 0.9, y + 0.88, 0.7, 0.76, '#2a6a4a'); strokes([[S(x0 + 0.12, y + 0.5, 0.77), S(x + 0.88, y + 0.5, 0.77)], [S(x0 + 0.12, y + 0.13, 0.77), S(x + 0.88, y + 0.13, 0.77)], [S(x0 + 0.12, y + 0.87, 0.77), S(x + 0.88, y + 0.87, 0.77)]], '#f2f0e8', Math.max(1, TW / 40));
        qR(K, x, y + 0.08, y + 0.92, 0.76, 0.92, '#e8e8e0'); dot(x0 + 0.5, y + 0.3, 0.8, 0.035, '#f2f0e8'); bx(x0 + 1.4, y + 0.6, x0 + 1.55, y + 0.75, 0.76, 0.79, '#c83a2a'); break; }
      case 'gbox': {   // box di vetro del secondino (2x2): base, montanti, vetri (solo i riflessi), tetto, scrivania dentro
        if (o.part) break; const x0 = x - 1, y0 = y - 1;
        bx(x0 + 0.05, y0 + 0.05, x + 0.95, y + 0.95, 0, 0.85, '#5a6470'); bx(x0 + 0.3, y0 + 0.3, x + 0.4, y0 + 0.9, 0.85, 1.15, '#8a7a5a'); bx(x0 + 0.5, y0 + 0.4, x0 + 0.8, y0 + 0.6, 1.15, 1.45, '#1b222c');
        for (const [a, b] of [[0.05, 0.05], [1.87, 0.05], [0.05, 1.87], [1.87, 1.87], [0.96, 1.87], [1.87, 0.96]]) bx(x0 + a, y0 + b, x0 + a + 0.08, y0 + b + 0.08, 0.85, 2.15, '#3a4048');
        strokes([[S(x0 + 0.3, y + 0.95, 1.2), S(x0 + 0.6, y + 0.95, 1.8)], [S(x + 0.2, y + 0.95, 1.1), S(x + 0.45, y + 0.95, 1.6)], [S(x + 0.95, y0 + 0.4, 1.2), S(x + 0.95, y0 + 0.7, 1.9)]], '#c8e0ec', Math.max(1, TW / 36));
        bx(x0, y0, x + 1, y + 1, 2.15, 2.28, '#3a4048'); bx(x0 + 0.2, y0 + 0.2, x + 0.8, y + 0.8, 2.28, 2.32, '#4a525c'); dot(x0 + 1, y0 + 1, 2.36, 0.06, '#e8302a'); break; }
      case 'wcool': bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0, 1.0, '#e8ecef'); cyl(x + 0.5, y + 0.5, 0.18, 1.0, 1.55, '#7ac0e8'); cyl(x + 0.5, y + 0.5, 0.1, 1.55, 1.62, '#4a8ab8'); dot(x + 0.4, y + 0.76, 0.7, 0.03, '#3a6ab8'); dot(x + 0.6, y + 0.76, 0.7, 0.03, '#d84a3a'); break;
      // ---- mensa e cucina ----
      case 'ltable':   // tavolo lungo della mensa con le panche ai lati e i vassoi
        bx(x, y + 0.04, x + 1, y + 0.22, 0, 0.42, '#7a8088'); bx(x, y + 0.78, x + 1, y + 0.96, 0, 0.42, '#7a8088');
        bx(x + 0.45, y + 0.4, x + 0.55, y + 0.6, 0, 0.7, '#5a6068'); bx(x, y + 0.27, x + 1, y + 0.73, 0.7, 0.78, '#c8c2b0');
        if (K.hsh(x, y, 4) < 0.6) { bx(x + 0.15, y + 0.3, x + 0.55, y + 0.48, 0.78, 0.81, '#c8a24a'); dot(x + 0.28, y + 0.39, 0.82, 0.04, ['#e8d84a', '#7aa84a', '#c84a3a'][Math.floor(K.hsh(x, y, 5) * 3)]); dot(x + 0.44, y + 0.39, 0.82, 0.035, '#8a5a32'); }
        if (K.hsh(x, y, 6) < 0.4) { bx(x + 0.5, y + 0.52, x + 0.88, y + 0.7, 0.78, 0.81, '#7a9ab8'); cyl(x + 0.62, y + 0.6, 0.05, 0.81, 0.9, '#e8e4dc'); } break;
      case 'serve': {   // bancone del self-service: acciaio, vaschette col cibo, il vetro parafiato
        bx(x + 0.1, y, x + 0.9, y + 1, 0, 0.95, '#9aa0a8'); bx(x + 0.05, y, x + 0.95, y + 1, 0.95, 1.0, '#c8ced4');
        const f = ['#e8c84a', '#6aa84a', '#c8402a', '#8a5a32', '#f2f0e0'], h = Math.floor(K.hsh(x, y, 3) * 5); bx(x + 0.2, y + 0.1, x + 0.8, y + 0.45, 0.98, 1.02, f[h]); bx(x + 0.2, y + 0.55, x + 0.8, y + 0.9, 0.98, 1.02, f[(h + 2) % 5]);
        bx(x + 0.05, y + 0.02, x + 0.12, y + 0.08, 1.0, 1.55, '#8a9098'); bx(x + 0.05, y, x + 0.25, y + 1, 1.5, 1.55, '#a8c8d4'); break; }
      case 'trays': for (let i = 0; i < 6; i++) bx(x + 0.2, y + 0.25, x + 0.8, y + 0.75, i * 0.1, i * 0.1 + 0.06, i % 2 ? '#b8964a' : '#c8a24a'); bx(x + 0.15, y + 0.2, x + 0.85, y + 0.8, 0, 0.02, '#5a6068'); break;
      case 'kisl': bx(x, y + 0.05, x + 1, y + 0.95, 0, 0.88, '#a8aeb4'); bx(x - 0.01, y + 0.03, x + 1.01, y + 0.97, 0.88, 0.94, '#d0d6dc');
        if (K.hsh(x, y, 1) < 0.5) { bx(x + 0.15, y + 0.2, x + 0.65, y + 0.55, 0.94, 0.98, '#c8a070'); dot(x + 0.3, y + 0.35, 1.0, 0.05, ['#d84a3a', '#e8a030', '#6aa84a'][x % 3]); } else { bx(x + 0.3, y + 0.5, x + 0.75, y + 0.56, 0.94, 0.97, '#c8ccd2'); cyl(x + 0.7, y + 0.3, 0.14, 0.94, 1.2, '#8a9098'); } break;
      case 'ksink': bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0, 0.92, '#a8aeb4'); bx(x + 0.15, y + 0.2, x + 0.85, y + 0.75, 0.86, 0.92, '#6a7a84'); cyl(x + 0.5, y + 0.16, 0.04, 0.92, 1.3, '#c8ccd2'); bx(x + 0.47, y + 0.16, x + 0.53, y + 0.4, 1.25, 1.3, '#c8ccd2'); break;
      case 'kshelf': bx(x + 0.15, y + 0.05, x + 0.85, y + 0.95, 0, 2.2, '#8a9098');
        for (let r = 0; r < 4; r++) { bx(x + 0.12, y + 0.05, x + 0.88, y + 0.95, 0.15 + r * 0.55, 0.2 + r * 0.55, '#a8aeb4'); for (let i = 0; i < 3; i++) cyl(x + 0.32, y + 0.2 + i * 0.3, 0.1, 0.2 + r * 0.55, 0.48 + r * 0.55, ['#c84a3a', '#e8c040', '#4a8ac8', '#e8e4dc'][(r + i + y) % 4]); } break;
      // ---- lavanderia ----
      case 'washer': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 1.05, '#e4e8ec'); dot(x + 0.5, y + 0.9, 0.52, 0.19, '#5a6a7a'); dot(x + 0.5, y + 0.9, 0.52, 0.13, '#7aa8c8'); dot(x + 0.46, y + 0.9, 0.56, 0.05, '#c8e4f4'); qL(x + 0.12, x + 0.88, y + 0.9, 0.86, 0.98, '#b8c0c8'); dot(x + 0.75, y + 0.9, 0.92, 0.03, '#3ac84a'); break;
      case 'dryer': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 1.6, '#c8ccd2'); dot(x + 0.5, y + 0.9, 0.95, 0.2, '#3a3e44'); dot(x + 0.5, y + 0.9, 0.95, 0.14, ['#e8742a', '#e8e4dc', '#4a6aa8'][x % 3]); qL(x + 0.12, x + 0.88, y + 0.9, 1.35, 1.52, '#9aa0a8'); dot(x + 0.3, y + 0.9, 1.44, 0.03, '#e8c040'); break;
      case 'ftable': bx(x + 0.05, y + 0.15, x + 0.95, y + 0.85, 0.75, 0.82, '#d8d4c8'); for (const a of [0.1, 0.85]) bx(x + a, y + 0.45, x + a + 0.05, y + 0.55, 0, 0.75, '#6a7078');
        for (let i = 0; i < 2; i++) { const h = 0.08 + 0.06 * ((x + i) % 3); bx(x + 0.15 + i * 0.4, y + 0.25, x + 0.5 + i * 0.4, y + 0.75, 0.82, 0.82 + h * 3, i ? '#e8742a' : '#f2f0e8'); } break;
      case 'sheet': {   // lenzuolo steso sul filo (fa da tenda)
        const k = o.k || 0; bx(x + 0.47, y + 0.02, x + 0.53, y + 0.08, 0, 1.95, '#6a7078');
        line(S(x + 0.5, y, 1.9), S(x + 0.5, y + 1, 1.9), '#c8ccd2', 1);
        qR(K, x + 0.5, y + 0.06, y + 0.94, 0.45, 1.88, ['#f2f0ea', '#e8eef4', '#e8742a'][k]); qR(K, x + 0.5, y + 0.06, y + 0.12, 0.45, 1.88, '#d8d6d0');
        for (const v of [0.25, 0.7]) dot(x + 0.5, y + v, 1.9, 0.025, '#c84a3a'); break; }
      case 'lcart':   // carrello della biancheria (telo, ruote, lenzuola sopra)
        for (const [a, b] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) dot(x + a, y + b, 0.06, 0.05, '#2a2a2a');
        bx(x + 0.12, y + 0.15, x + 0.88, y + 0.85, 0.1, 0.95, '#c8c0a8'); qL(x + 0.12, x + 0.88, y + 0.85, 0.5, 0.56, '#a89e86'); bx(x + 0.15, y + 0.18, x + 0.85, y + 0.82, 0.95, 1.05, '#f2f0ea'); bx(x + 0.3, y + 0.25, x + 0.7, y + 0.6, 1.05, 1.12, '#e8742a'); break;
      case 'ironb': bx(x + 0.1, y + 0.35, x + 0.9, y + 0.65, 0.8, 0.86, '#c8d8e4'); line(S(x + 0.3, y + 0.5, 0), S(x + 0.7, y + 0.5, 0.8), '#6a7078', 2); line(S(x + 0.7, y + 0.5, 0), S(x + 0.3, y + 0.5, 0.8), '#6a7078', 2); bx(x + 0.55, y + 0.42, x + 0.78, y + 0.58, 0.86, 0.98, '#4a6aa8'); break;
      case 'ushelf': bx(x + 0.1, y + 0.05, x + 0.9, y + 0.95, 0, 2.1, '#6a5a4a'); for (let r = 0; r < 4; r++) for (let i = 0; i < 2; i++) bx(x + 0.15, y + 0.1 + i * 0.42, x + 0.75, y + 0.48 + i * 0.42, 0.2 + r * 0.5, 0.42 + r * 0.5, r % 2 ? '#e8742a' : '#d8682a'); break;
      // ---- infermeria e docce ----
      case 'ibed': {   // letto d'ospedale (2 caselle lungo y): telaio bianco, lenzuola, sponde, testiera
        if (o.part) break; const y0 = y - 1;
        for (const [a, b] of [[0.1, 0.1], [0.82, 0.1], [0.1, 1.82], [0.82, 1.82]]) bx(x + a, y0 + b, x + a + 0.08, y0 + b + 0.08, 0, 0.55, '#c8ccd2');
        bx(x + 0.1, y0 + 0.1, x + 0.9, y + 0.9, 0.5, 0.68, '#f2f4f2'); bx(x + 0.1, y0 + 0.8, x + 0.9, y + 0.9, 0.68, 0.72, '#8ab8d8'); bx(x + 0.2, y0 + 0.15, x + 0.8, y0 + 0.55, 0.68, 0.8, '#ffffff');
        bx(x + 0.06, y0 + 0.04, x + 0.94, y0 + 0.12, 0.5, 1.2, '#c8ccd2'); bx(x + 0.04, y0 + 0.6, x + 0.1, y + 0.6, 0.78, 0.84, '#a8aeb4'); break; }
      case 'drip': cyl(x + 0.5, y + 0.5, 0.18, 0, 0.05, '#8a9098'); cyl(x + 0.5, y + 0.5, 0.025, 0.05, 2.0, '#b8bec4'); bx(x + 0.42, y + 0.45, x + 0.58, y + 0.55, 1.55, 1.9, '#d8ecf4'); line(S(x + 0.5, y + 0.5, 1.55), S(x + 0.3, y + 0.8, 0.7), '#c8dce4', 1); break;
      case 'screen': for (let i = 0; i < 3; i++) bx(x + 0.1 + i * 0.27, y + 0.4 + (i % 2) * 0.12, x + 0.35 + i * 0.27, y + 0.48 + (i % 2) * 0.12, 0.08, 1.8, i % 2 ? '#a8c8b0' : '#b8d4be'); break;
      case 'mcab': bx(x + 0.15, y + 0.1, x + 0.85, y + 0.9, 0, 2.0, '#e8ecef'); qR(K, x + 0.85, y + 0.15, y + 0.85, 0.9, 1.9, '#c8dce4');
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) qR(K, x + 0.86, y + 0.2 + i * 0.22, y + 0.32 + i * 0.22, 1.0 + r * 0.3, 1.18 + r * 0.3, ['#c84a3a', '#e8e4dc', '#4a8ac8', '#e8c040'][(r + i) % 4]);
        qR(K, x + 0.86, y + 0.4, y + 0.6, 0.45, 0.75, '#ffffff'); qR(K, x + 0.865, y + 0.47, y + 0.53, 0.48, 0.72, '#d83a2a'); qR(K, x + 0.865, y + 0.42, y + 0.58, 0.57, 0.63, '#d83a2a'); break;
      case 'shower': bx(x + 0.45, y + 0.04, x + 0.55, y + 0.14, 0, 2.15, '#a8aeb4'); bx(x + 0.45, y + 0.04, x + 0.55, y + 0.42, 2.05, 2.15, '#a8aeb4'); cyl(x + 0.5, y + 0.42, 0.1, 1.98, 2.05, '#c8ccd2'); bx(x + 0.43, y + 0.12, x + 0.57, y + 0.18, 1.1, 1.22, '#c8ccd2');
        if ((x + 1) % 3 === 0) { const L = []; for (let i = 0; i < 4; i++) L.push([S(x + 0.42 + i * 0.05, y + 0.42, 1.95), S(x + 0.38 + i * 0.08, y + 0.5, 0.1)]); strokes(L, '#bfe0ec', 1); } break;
      case 'sbench': bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.4, 0.48, '#b8905a'); for (const a of [0.15, 0.8]) bx(x + a, y + 0.42, x + a + 0.06, y + 0.58, 0, 0.4, '#6a7078'); break;
      // ---- officina ----
      case 'wbench': bx(x + 0.05, y + 0.12, x + 0.95, y + 0.88, 0, 0.78, '#6a5038'); bx(x, y + 0.08, x + 1, y + 0.92, 0.78, 0.86, '#a8784a'); qL(x + 0.15, x + 0.85, y + 0.88, 0.3, 0.6, '#5a4230');
        { const h = K.hsh(x, y, 3); if (h < 0.35) { bx(x + 0.6, y + 0.3, x + 0.85, y + 0.55, 0.86, 1.02, '#3a5a8a'); bx(x + 0.66, y + 0.35, x + 0.8, y + 0.5, 1.02, 1.08, '#2a3a5a'); } else if (h < 0.7) { bx(x + 0.2, y + 0.45, x + 0.7, y + 0.52, 0.86, 0.9, '#8a9098'); bx(x + 0.6, y + 0.4, x + 0.72, y + 0.57, 0.86, 0.95, '#6a4a2a'); } else { bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.86, 0.89, '#e8e8ec'); bx(x + 0.25, y + 0.25, x + 0.75, y + 0.38, 0.89, 0.9, '#2a4aa8'); } } break;
      case 'press':   // pressa per le targhe
        bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 0.9, '#5a6a5a'); bx(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0.9, 1.0, '#9aa0a8'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 1.55, 1.85, '#4a5a4a');
        for (const [a, b] of [[0.2, 0.2], [0.72, 0.72]]) bx(x + a, y + b, x + a + 0.08, y + b + 0.08, 1.0, 1.9, '#6a7a6a'); bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 1.85, 1.95, '#5a6a5a'); dot(x + 0.85, y + 0.6, 1.0, 0.06, '#d83a2a'); break;
      case 'plates': for (let i = 0; i < 5; i++) bx(x + 0.15, y + 0.3, x + 0.85, y + 0.7, i * 0.07, i * 0.07 + 0.05, '#f2f2ee'); qL(x + 0.15, x + 0.25, y + 0.7, 0.28, 0.33, '#2a4aa8'); qL(x + 0.3, x + 0.75, y + 0.7, 0.29, 0.32, '#2a2a2a'); break;
      case 'pegb': bx(x + 0.05, y + 0.02, x + 0.95, y + 0.16, 0, 1.95, '#c8a070'); { const c2 = ['#3a3e44', '#c83a2a', '#3a6ab8']; for (let i = 0; i < 3; i++) qL(x + 0.12 + i * 0.28, x + 0.24 + i * 0.28, y + 0.17, 0.9 + (i % 2) * 0.2, 1.5 + (i % 2) * 0.2, c2[(x + i) % 3]); } break;
      case 'saw': bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0, 0.82, '#3a5a8a'); bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0.82, 0.88, '#a8aeb4'); { const [X, Y] = S(x + 0.5, y + 0.5, 0.95); g.fillStyle = '#d8dce0'; g.beginPath(); g.ellipse(X, Y, TW * 0.16, TW * 0.06, 0, Math.PI, 0); g.fill(); } break;
      // ---- carico ----
      case 'pallet': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.14, '#a8844a'); bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.14, 0.8, '#b89a6a'); qL(x + 0.1, x + 0.9, y + 0.9, 0.4, 0.46, '#8a6a3a'); bx(x + 0.2, y + 0.2, x + 0.7, y + 0.7, 0.8, 1.3, '#c8a878'); break;
      case 'dumpster': { if (o.part) break; const x0 = x - 1; bx(x0 + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.1, 1.2, '#2e5a3a'); bx(x0 + 0.05, y + 0.05, x + 0.95, y + 0.95, 1.2, 1.32, '#244a2e'); for (const a of [0.3, 1.6]) dot(x0 + a, y + 0.88, 0.08, 0.07, '#1a1a1a'); qL(x0 + 0.6, x0 + 1.4, y + 0.9, 0.6, 0.8, '#d8d0b0'); break; }
      case 'mdoor': slab(K, x, y, o.v, 1.85, '#6a7480'); if (o.v) { bx(x + 0.6, y + (o.l ? 0.15 : 0.8), x + 0.66, y + (o.l ? 0.25 : 0.9), 0.85, 1.0, '#c8a040'); } break;
      case 'shut': { slab(K, x, y, o.v, 2.0, '#7a8088'); const L = []; for (let i = 1; i < 9; i++) L.push(o.v ? [S(x + 0.62, y, i * 0.22), S(x + 0.62, y + 1, i * 0.22)] : [S(x, y + 0.62, i * 0.22), S(x + 1, y + 0.62, i * 0.22)]); strokes(L, 'rgba(0,0,0,.3)'); break; }
      case 'tgate': case 'bgate': {   // cancello pesante a sbarre (quello dell'ingresso col cartello)
        const v = o.v; barsAt(K, x, y, v, 2.3, '#4a4e56', 4); v ? bx(x + 0.42, y, x + 0.58, y + 1, 2.25, 2.42, '#2a2e34') : bx(x, y + 0.42, x + 1, y + 0.58, 2.25, 2.42, '#2a2e34');
        v ? bx(x + 0.44, y, x + 0.56, y + 1, 1.1, 1.2, '#3a3e44') : bx(x, y + 0.44, x + 1, y + 0.56, 1.1, 1.2, '#3a3e44');
        if (o.l) { v ? bx(x + 0.38, y + 0.4, x + 0.62, y + 0.6, 0.95, 1.35, '#c8a040') : bx(x + 0.4, y + 0.38, x + 0.6, y + 0.62, 0.95, 1.35, '#c8a040'); } break; }
      // ---- cortile ----
      case 'hoop': {   // canestro: palo, tabellone bianco col quadrato rosso, anello arancione e retina
        const e = o.d === 'e'; bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 0, 2.6, '#3a4a6a'); bx(e ? x + 0.5 : x + 0.2, y + 0.46, e ? x + 0.8 : x + 0.5, y + 0.54, 2.45, 2.55, '#3a4a6a');
        const bxp = e ? x + 0.8 : x + 0.2; bx(bxp - 0.03, y + 0.05, bxp + 0.03, y + 0.95, 2.2, 3.05, '#f2f0ea'); qR(K, bxp + 0.031, y + 0.35, y + 0.65, 2.35, 2.7, '#d83a2a'); qR(K, bxp + 0.032, y + 0.4, y + 0.6, 2.4, 2.65, '#f2f0ea');
        const cx = e ? x + 1.05 : x - 0.05, [X, Y] = S(cx, y + 0.5, 2.3); g.strokeStyle = '#e8742a'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.ellipse(X, Y, TW * 0.17, TW * 0.08, 0, 0, 7); g.stroke();
        g.strokeStyle = '#f2f0ea'; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X + i * TW * 0.07, Y + TW * 0.03); g.lineTo(X + i * TW * 0.04, Y + TW * 0.24); g.stroke(); } break; }
      case 'wbench2':   // panca dei pesi col bilanciere
        bx(x + 0.35, y + 0.1, x + 0.65, y + 0.9, 0.35, 0.45, '#2a2a2e'); for (const b of [0.15, 0.85]) bx(x + 0.45, y + b - 0.03, x + 0.55, y + b + 0.03, 0, 0.35, '#5a6068');
        for (const b of [0.2, 0.8]) bx(x + b - 0.03, y + 0.15, x + b + 0.03, y + 0.2, 0.35, 1.05, '#8a9098');
        bx(x - 0.1, y + 0.16, x + 1.1, y + 0.2, 1.02, 1.07, '#c8ccd2'); for (const a of [-0.05, 1.0]) cyl(x + a + 0.05, y + 0.18, 0.2, 0.85, 1.25, '#2a2a2e'); break;
      case 'drack': bx(x + 0.1, y + 0.3, x + 0.9, y + 0.7, 0, 0.75, '#3a3e44'); for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { cyl(x + 0.25 + i * 0.25, y + 0.5, 0.08, 0.4 + r * 0.32, 0.55 + r * 0.32, '#1a1a1e'); } break;
      case 'pullup': for (const a of [0.15, 0.85]) bx(x + a - 0.04, y + 0.46, x + a + 0.04, y + 0.54, 0, 2.6, '#4a5a7a'); bx(x + 0.1, y + 0.47, x + 0.9, y + 0.53, 2.45, 2.52, '#c8ccd2'); break;
      case 'pbench': {   // panchina di legno con i piedi di ghisa (b = lato dello schienale)
        const b = o.b || 'n'; bx(x + 0.08, y + 0.3, x + 0.92, y + 0.72, 0.38, 0.45, '#9a6a3a');
        for (const a of [0.12, 0.82]) bx(x + a, y + 0.32, x + a + 0.06, y + 0.7, 0, 0.38, '#2a2a2e');
        if (b === 'n') bx(x + 0.08, y + 0.22, x + 0.92, y + 0.3, 0.45, 0.95, '#8a5a32'); else if (b === 'e') bx(x + 0.82, y + 0.08, x + 0.9, y + 0.92, 0.45, 0.95, '#8a5a32'); break; }
      case 'ptab':   // tavolo di cemento con gli sgabelli
        cyl(x + 0.5, y + 0.5, 0.12, 0, 0.7, '#8a8780'); cyl(x + 0.5, y + 0.5, 0.36, 0.7, 0.8, '#a8a69e'); for (const [a, b] of [[0.12, 0.5], [0.88, 0.5], [0.5, 0.12], [0.5, 0.88]]) cyl(x + a, y + b, 0.09, 0, 0.42, '#9a978f');
        if (K.hsh(x, y, 1) < 0.6) { bx(x + 0.35, y + 0.4, x + 0.5, y + 0.55, 0.8, 0.82, '#f2f0e8'); bx(x + 0.52, y + 0.38, x + 0.66, y + 0.52, 0.8, 0.82, '#f2f0e8'); dot(x + 0.42, y + 0.47, 0.83, 0.02, '#d83a2a'); } break;
      case 'garden': {   // aiuola rialzata dell'orto: pomodori, insalata, girasoli
        const v = o.v || 0; bx(x + 0.04, y + 0.12, x + 0.96, y + 0.88, 0, 0.32, '#7a5232'); bx(x + 0.1, y + 0.18, x + 0.9, y + 0.82, 0.32, 0.34, '#4a3220');
        if (v === 0) for (let i = 0; i < 3; i++) { bx(x + 0.2 + i * 0.25, y + 0.45, x + 0.26 + i * 0.25, y + 0.51, 0.34, 0.95, '#6a8a3a'); dot(x + 0.23 + i * 0.25, y + 0.48, 0.65, 0.06, '#d83a2a'); dot(x + 0.23 + i * 0.25, y + 0.48, 0.85, 0.05, '#4a8a3a'); }
        else if (v === 1) for (let i = 0; i < 4; i++) dot(x + 0.22 + (i % 2) * 0.5, y + 0.32 + Math.floor(i / 2) * 0.36, 0.42, 0.13, i % 2 ? '#7ac04a' : '#8ad05a');
        else for (let i = 0; i < 2; i++) { bx(x + 0.3 + i * 0.4, y + 0.48, x + 0.34 + i * 0.4, y + 0.52, 0.34, 1.6, '#5a8a3a'); const [X, Y] = S(x + 0.32 + i * 0.4, y + 0.5, 1.65); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(X, Y, TW * 0.11, 0, 7); g.fill(); g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(X, Y, TW * 0.05, 0, 7); g.fill(); }
        break; }
      case 'shed': {   // casetta degli attrezzi dell'orto (2x2)
        if (o.part) break; const x0 = x - 1, y0 = y - 1;
        bx(x0 + 0.1, y0 + 0.1, x + 0.9, y + 0.9, 0, 1.5, '#8a6a3a'); qL(x0 + 0.6, x0 + 1.3, y + 0.9, 0.05, 1.25, '#5a4228'); dot(x0 + 1.2, y + 0.9, 0.65, 0.03, '#c8a040');
        poly([S(x0, y0, 1.5), S(x + 1, y0, 1.5), S(x + 1, y + 1, 1.5), S(x0, y + 1, 1.5)], '#6a3a2a'); poly([S(x0, y + 1, 1.5), S(x + 1, y + 1, 1.5), S(x + 1, y0 + 1, 2.1), S(x0, y0 + 1, 2.1)], '#8a4a32'); poly([S(x + 1, y + 1, 1.5), S(x + 1, y0, 1.5), S(x + 1, y0 + 1, 2.1)], '#6a3424'); break; }
      case 'scare': bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0, 1.9, '#6a4a2a'); bx(x + 0.15, y + 0.47, x + 0.85, y + 0.53, 1.45, 1.52, '#6a4a2a'); bx(x + 0.32, y + 0.4, x + 0.68, y + 0.6, 0.9, 1.5, '#e8742a'); cyl(x + 0.5, y + 0.5, 0.13, 1.55, 1.85, '#e8d8a0'); cyl(x + 0.5, y + 0.5, 0.2, 1.85, 1.9, '#8a6a2a'); cyl(x + 0.5, y + 0.5, 0.11, 1.9, 2.05, '#8a6a2a'); break;
      case 'phone': bx(x + 0.3, y + 0.42, x + 0.7, y + 0.58, 0, 1.5, '#5a6068'); bx(x + 0.15, y + 0.2, x + 0.85, y + 0.75, 1.5, 2.2, '#2a5aa8'); bx(x + 0.3, y + 0.4, x + 0.7, y + 0.75, 1.62, 2.0, '#c8ccd2'); bx(x + 0.42, y + 0.72, x + 0.58, y + 0.78, 1.7, 1.95, '#1a1a1e'); bx(x + 0.1, y + 0.15, x + 0.9, y + 0.8, 2.2, 2.28, '#1e4a8a'); break;
      case 'drink': cyl(x + 0.5, y + 0.5, 0.14, 0, 0.8, '#a8aeb4'); cyl(x + 0.5, y + 0.5, 0.26, 0.8, 0.92, '#c8ccd2'); cyl(x + 0.5, y + 0.5, 0.18, 0.9, 0.92, '#6a9ab8'); break;
      case 'lpost': cyl(x + 0.5, y + 0.5, 0.12, 0, 0.2, '#1e2024'); cyl(x + 0.5, y + 0.5, 0.05, 0.2, 2.6, '#24262a'); bx(x + 0.2, y + 0.46, x + 0.8, y + 0.54, 2.55, 2.62, '#24262a'); bx(x + 0.62, y + 0.38, x + 0.86, y + 0.62, 2.45, 2.55, '#f6e2a0');
        glow(x + 0.74, y + 0.5, 2.4, 1.8, 'rgba(255,220,150,.42)'); break;
      case 'bin': bx(x + 0.15, y + 0.2, x + 0.85, y + 0.8, 0, 0.9, '#3a5a3a'); bx(x + 0.12, y + 0.17, x + 0.88, y + 0.83, 0.9, 0.98, '#2e4a2e'); break;
      case 'stage': {   // PALCO DELL'APPELLO (3x2): pedana di legno, gradini, ringhiera, palo col megafono, tettoia
        if (o.part) break; const x0 = x - 2, y0 = y - 1;
        bx(x0 + 0.05, y0 + 0.05, x + 0.95, y + 0.95, 0, 0.5, '#5a4a3a'); bx(x0, y0, x + 1, y + 1, 0.5, 0.58, '#8a6a42');
        if (TW >= 40) { const L = []; for (let i = 1; i < 6; i++) L.push([S(x0 + i * 0.5, y0, 0.58), S(x0 + i * 0.5, y + 1, 0.58)]); strokes(L, 'rgba(0,0,0,.2)'); }
        for (let i = 0; i < 2; i++) bx(x0 + 1 + i * 0.4, y + 0.95, x0 + 1.4 + i * 0.4, y + 1.25 - i * 0.12, 0, 0.25 - i * 0.12, '#6a5a48');
        for (const [a, b] of [[0.05, 0.05], [2.88, 0.05], [0.05, 1.88], [2.88, 1.88]]) bx(x0 + a, y0 + b, x0 + a + 0.07, y0 + b + 0.07, 0.58, 2.9, '#4a4038');
        bx(x0 + 0.05, y0 + 0.05, x + 0.95, y0 + 0.12, 1.4, 1.48, '#6a7078');
        bx(x0 + 2.4, y0 + 0.4, x0 + 2.48, y0 + 0.48, 0.58, 2.1, '#3a3e44'); { const [X, Y] = S(x0 + 2.44, y0 + 0.44, 2.15); g.fillStyle = '#e8e4dc'; g.beginPath(); g.moveTo(X - TW * 0.05, Y - TW * 0.05); g.lineTo(X + TW * 0.2, Y - TW * 0.16); g.lineTo(X + TW * 0.22, Y + TW * 0.08); g.lineTo(X - TW * 0.05, Y + TW * 0.05); g.closePath(); g.fill(); }
        poly([S(x0 - 0.1, y0 - 0.1, 2.9), S(x + 1.1, y0 - 0.1, 2.9), S(x + 1.1, y + 1.1, 2.9), S(x0 - 0.1, y + 1.1, 2.9)], '#7a2a24'); qL(x0 - 0.1, x + 1.1, y + 1.1, 2.75, 2.9, '#5a1e1a');
        for (let i = 0; i < 6; i++) qL(x0 - 0.1 + i * 0.53, x0 + 0.17 + i * 0.53, y + 1.1, 2.58, 2.75, i % 2 ? '#f2f0e8' : '#7a2a24');
        dot(x0 + 1.5, y0 + 1, 2.7, 0.05, '#fff2c0'); glow(x0 + 1.5, y0 + 1, 2.6, 1.6, 'rgba(255,230,170,.35)'); break; }
      // ---- guardie ----
      case 'gdesk': desk(K, x, y); bx(x + 0.2, y + 0.25, x + 0.55, y + 0.5, 0.85, 0.88, '#8a2a2a'); bx(x + 0.6, y + 0.25, x + 0.68, y + 0.33, 0.85, 1.25, '#3a3e44'); bx(x + 0.58, y + 0.22, x + 0.82, y + 0.38, 1.22, 1.32, '#2a4a3a'); dot(x + 0.7, y + 0.3, 1.25, 0.04, '#f2e2a0'); bx(x + 0.3, y + 0.6, x + 0.42, y + 0.68, 0.85, 1.05, '#1a1a1e'); break;
      case 'kbox': bx(x + 0.15, y + 0.06, x + 0.85, y + 0.22, 0, 1.95, '#5a4a3a'); qL(x + 0.2, x + 0.8, y + 0.23, 1.0, 1.85, '#3a3028'); for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) qL(x + 0.24 + i * 0.14, x + 0.3 + i * 0.14, y + 0.235, 1.15 + r * 0.24, 1.3 + r * 0.24, '#d8b84a'); break;
      case 'brack': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.4, 0, 1.8, '#3a3e44'); for (let i = 0; i < 3; i++) bx(x + 0.15 + i * 0.26, y + 0.4, x + 0.35 + i * 0.26, y + 0.48, 0.2, 1.55, '#2a3a5a'); for (let i = 0; i < 3; i++) bx(x + 0.2 + i * 0.26, y + 0.5, x + 0.26 + i * 0.26, y + 0.56, 0.6, 1.4, '#1a1a1e'); break;
      case 'board': bx(x + 0.08, y + 0.04, x + 0.92, y + 0.16, 0.5, 1.9, '#a8784a'); qL(x + 0.12, x + 0.88, y + 0.165, 0.55, 1.85, '#c8a070'); for (let i = 0; i < 6; i++) qL(x + 0.16 + (i % 3) * 0.24, x + 0.34 + (i % 3) * 0.24, y + 0.17, 0.75 + Math.floor(i / 3) * 0.5, 1.15 + Math.floor(i / 3) * 0.5, i === 2 ? '#e8c040' : '#f2f0e8'); break;
      case 'urack':   // stendino con le divise delle guardie appese
        for (const a of [0.1, 0.9]) bx(x + 0.47, y + a - 0.03, x + 0.53, y + a + 0.03, 0, 1.9, '#6a7078'); bx(x + 0.47, y + 0.08, x + 0.53, y + 0.92, 1.85, 1.9, '#6a7078');
        for (let i = 0; i < 3; i++) { bx(x + 0.3, y + 0.15 + i * 0.26, x + 0.7, y + 0.33 + i * 0.26, 0.95, 1.8, '#2a3a5a'); bx(x + 0.32, y + 0.2 + i * 0.26, x + 0.36, y + 0.28 + i * 0.26, 1.5, 1.6, '#d8b84a'); } break;
      case 'mstack': for (let i = 0; i < 5; i++) bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, i * 0.22, i * 0.22 + 0.2, i % 2 ? '#8a8676' : '#9a9686'); break;
      case 'boxes': for (let i = 0; i < 3; i++) bx(x + 0.1 + (i % 2) * 0.05, y + 0.12, x + 0.88 - (i % 2) * 0.05, y + 0.88, i * 0.55, i * 0.55 + 0.52, i % 2 ? '#b8915a' : '#c8a06a'); qL(x + 0.3, x + 0.7, y + 0.88, 0.2, 0.32, '#f2f0e8'); break;
      case 'sdoor': slab(K, x, y, 0, 1.9, '#5a5e64'); bx(x + 0.3, y + 0.62, x + 0.7, y + 0.66, 1.25, 1.42, '#1a1a1e'); bx(x + 0.35, y + 0.62, x + 0.65, y + 0.66, 0.75, 0.82, '#2a2e34'); bx(x + 0.8, y + 0.62, x + 0.86, y + 0.7, 0.9, 1.05, '#c8a040'); break;
      // ---- ingresso, colloqui ----
      case 'fdesk': bx(x, y + 0.2, x + 1, y + 0.85, 0, 1.0, '#5a4a3a'); bx(x - 0.01, y + 0.15, x + 1.01, y + 0.9, 1.0, 1.08, '#c8c2b0'); for (const a of [0.02, 0.96]) bx(x + a, y + 0.2, x + a + 0.04, y + 0.26, 1.08, 2.1, '#8a9098'); bx(x, y + 0.2, x + 1, y + 0.26, 2.06, 2.12, '#8a9098'); strokes([[S(x + 0.2, y + 0.23, 1.3), S(x + 0.45, y + 0.23, 1.9)]], '#c8e0ec', 1); qL(x + 0.4, x + 0.6, y + 0.85, 0.5, 0.7, '#c8a040'); break;
      case 'mdet': for (const a of [0.08, 0.84]) bx(x + a, y + 0.35, x + a + 0.08, y + 0.65, 0, 2.05, '#c8ccd2'); bx(x + 0.08, y + 0.35, x + 0.92, y + 0.65, 2.0, 2.2, '#a8aeb4'); dot(x + 0.5, y + 0.65, 2.1, 0.04, '#3ac84a'); dot(x + 0.38, y + 0.65, 2.1, 0.03, '#d83a2a'); break;
      case 'turn': cyl(x + 0.5, y + 0.5, 0.14, 0, 0.95, '#a8aeb4'); for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; line(S(x + 0.5, y + 0.5, 0.85), S(x + 0.5 + Math.cos(a) * 0.42, y + 0.5 + Math.sin(a) * 0.42, 0.85), '#c8ccd2', Math.max(2, TW / 18)); } cyl(x + 0.5, y + 0.5, 0.1, 0.95, 1.02, '#d83a2a'); break;
      case 'bench': bx(x + 0.1, y + 0.25, x + 0.9, y + 0.75, 0.38, 0.45, '#6a7078'); for (const a of [0.15, 0.8]) bx(x + a, y + 0.3, x + a + 0.05, y + 0.7, 0, 0.38, '#3a3e44'); bx(x + 0.1, y + 0.18, x + 0.9, y + 0.26, 0.45, 0.85, '#5a6068'); break;
      case 'flag': {   // asta con il tricolore
        cyl(x + 0.5, y + 0.5, 0.12, 0, 0.12, '#8a8780'); cyl(x + 0.5, y + 0.5, 0.03, 0.12, 3.0, '#c8ccd2'); dot(x + 0.5, y + 0.5, 3.02, 0.04, '#e8c040');
        const T = (k, c) => qL(x + 0.53 + k * 0.22, x + 0.75 + k * 0.22, y + 0.5, 2.4, 2.9, c); T(0, '#2a8a4a'); T(1, '#f2f0ea'); T(2, '#d83a2a'); break; }
      case 'booth': {   // postazione dei colloqui: bancone, vetro divisorio, telefoni dalle due parti, sgabelli
        bx(x, y + 0.3, x + 1, y + 0.7, 0, 0.85, '#5a6068'); bx(x - 0.01, y + 0.25, x + 1.01, y + 0.75, 0.85, 0.9, '#a8aeb4');
        for (const a of [0.02, 0.94]) bx(x + a, y + 0.47, x + a + 0.04, y + 0.53, 0.9, 2.05, '#3a3e44'); bx(x, y + 0.47, x + 1, y + 0.53, 2.0, 2.06, '#3a3e44'); strokes([[S(x + 0.25, y + 0.5, 1.1), S(x + 0.5, y + 0.5, 1.8)]], '#c8e0ec', 1);
        for (const b of [0.32, 0.62]) { bx(x + 0.7, y + b, x + 0.78, y + b + 0.06, 0.95, 1.35, '#1a1a1e'); } for (const b of [0.08, 0.92]) cyl(x + 0.5, y + b, 0.12, 0, 0.45, '#c8642a'); break; }
      // ---- fuori ----
      case 'car': {   // auto parcheggiata (2 caselle lungo x)
        if (o.part) break; const x0 = x - 1, c = o.c || '#3a4a6a';
        for (const [a, b] of [[0.4, 0.15], [1.6, 0.15], [0.4, 0.85], [1.6, 0.85]]) cyl(x0 + a, y + b, 0.17, 0, 0.3, '#141518');
        bx(x0 + 0.08, y + 0.14, x0 + 1.92, y + 0.86, 0.2, 0.62, c); bx(x0 + 0.5, y + 0.2, x0 + 1.45, y + 0.8, 0.62, 1.0, cqShade(c, 1.1));
        qL(x0 + 0.55, x0 + 1.4, y + 0.8, 0.66, 0.96, '#2a3a4a'); poly([S(x0 + 1.45, y + 0.2, 1.0), S(x0 + 1.45, y + 0.8, 1.0), S(x0 + 1.62, y + 0.8, 0.64), S(x0 + 1.62, y + 0.2, 0.64)], '#3a4a5a');
        dot(x0 + 1.93, y + 0.28, 0.45, 0.05, '#e8e0b0'); dot(x0 + 1.93, y + 0.72, 0.45, 0.05, '#e8e0b0'); break; }
      case 'bstop': cyl(x + 0.5, y + 0.5, 0.04, 0, 2.2, '#8a9098'); bx(x + 0.3, y + 0.46, x + 0.7, y + 0.54, 1.8, 2.3, '#2a5aa8'); { const [X, Y] = S(x + 0.5, y + 0.54, 2.05); g.fillStyle = '#fff'; g.font = '800 ' + Math.round(TW * 0.18) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', X, Y); } break;
      case 'sign': {   // il cartello all'ingresso: CASA CIRCONDARIALE ROCCA NERA
        for (const a of [-1.3, 1.3]) bx(x + 0.5 + a - 0.04, y + 0.46, x + 0.5 + a + 0.04, y + 0.54, 0, 1.2, '#3a3e44');
        bx(x - 1.0, y + 0.42, x + 2.0, y + 0.58, 1.1, 1.9, '#1e3a5a'); qL(x - 0.95, x + 1.95, y + 0.585, 1.15, 1.85, '#24466a'); qL(x - 0.95, x + 1.95, y + 0.586, 1.15, 1.2, '#c8a040');
        const [X, Y] = S(x + 0.5, y + 0.6, 1.55); g.save(); g.translate(X, Y); g.transform(1, 0.5, 0, 1, 0, 0); g.fillStyle = '#f2f0e8'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 ' + Math.round(TW * 0.13) + 'px system-ui,sans-serif'; g.fillText('CASA CIRCONDARIALE', 0, -TW * 0.1); g.font = '900 ' + Math.round(TW * 0.22) + 'px system-ui,sans-serif'; g.fillText('ROCCA NERA', 0, TW * 0.09); g.restore(); break; }
      // ---- primo piano ----
      case 'pvoid': {   // il vuoto sopra la galleria con la RETE anti-caduta tesa sotto (si vede il piano di sotto, lontano, al buio)
        const z = -0.55, Pp = (u, v) => S(x + u, y + v, z), L = [];
        for (const u of [0, 0.5]) L.push([Pp(u, 0), Pp(u, 1)], [Pp(0, u), Pp(1, u)]);
        strokes(L, '#3a4048', Math.max(1, K.TW / 40)); break; }
      case 'prail': {   // ringhiera del ballatoio (si vede attraverso) + la rete sotto
        const e = o.e, z = -0.55, Pp = (u, v) => S(x + u, y + v, z), L = []; for (const u of [0, 0.5]) L.push([Pp(u, 0), Pp(u, 1)], [Pp(0, u), Pp(1, u)]); strokes(L, '#3a4048', Math.max(1, K.TW / 40));
        const v = e === 'w' || e === 'e', a = e === 'w' || e === 'n' ? 0.12 : 0.88, P2 = [];
        for (let i = 0; i < 4; i++) { const u = (i + 0.5) / 4; P2.push(v ? [S(x + a, y + u, 0), S(x + a, y + u, 1.05)] : [S(x + u, y + a, 0), S(x + u, y + a, 1.05)]); }
        strokes(P2, '#c8a830', Math.max(1.5, K.TW / 26)); v ? bx(x + a - 0.05, y, x + a + 0.05, y + 1, 1.0, 1.1, '#e8c040') : bx(x, y + a - 0.05, x + 1, y + a + 0.05, 1.0, 1.1, '#e8c040'); break; }
      case 'cctv': {   // parete di monitor della sala di controllo
        bx(x + 0.04, y + 0.04, x + 0.96, y + 0.3, 0, 2.3, '#2a2e34');
        for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) { const c = ['#3a7a5a', '#4a6a8a', '#5a8a6a', '#3a5a7a'][(r + i + x) % 4]; qL(x + 0.1 + i * 0.42, x + 0.48 + i * 0.42, y + 0.31, 0.7 + r * 0.52, 1.12 + r * 0.52, '#14181e'); qL(x + 0.13 + i * 0.42, x + 0.45 + i * 0.42, y + 0.315, 0.74 + r * 0.52, 1.08 + r * 0.52, c); }
        glow(x + 0.5, y + 0.4, 1.5, 1.3, 'rgba(120,200,170,.25)'); break; }
      case 'spotsw': bx(x + 0.15, y + 0.2, x + 0.85, y + 0.8, 0, 1.2, '#5a6068'); bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 1.2, 1.28, '#3a3e44'); for (let i = 0; i < 3; i++) { bx(x + 0.2 + i * 0.22, y + 0.4, x + 0.3 + i * 0.22, y + 0.5, 1.28, 1.45, '#c8ccd2'); dot(x + 0.25 + i * 0.22, y + 0.65, 1.3, 0.03, i === 1 ? '#3ac84a' : '#d83a2a'); } break;
      case 'radio': desk(K, x, y); bx(x + 0.2, y + 0.3, x + 0.8, y + 0.7, 0.85, 1.15, '#3a3e44'); qL(x + 0.25, x + 0.55, y + 0.7, 0.92, 1.08, '#e8a030'); bx(x + 0.65, y + 0.4, x + 0.7, y + 0.45, 1.15, 1.7, '#8a9098'); break;
      case 'ddesk': {   // scrivania di mogano del direttore (2 caselle lungo x): lampada verde, carte, targhetta
        if (o.part) break; const x0 = x - 1;
        bx(x0 + 0.08, y + 0.15, x + 0.92, y + 0.85, 0, 0.82, '#5a2e1a'); bx(x0 + 0.02, y + 0.1, x + 0.98, y + 0.9, 0.82, 0.92, '#7a4228'); qL(x0 + 0.2, x0 + 0.8, y + 0.85, 0.3, 0.7, '#4a2414'); qL(x0 + 1.2, x0 + 1.8, y + 0.85, 0.3, 0.7, '#4a2414');
        bx(x0 + 0.3, y + 0.3, x0 + 0.9, y + 0.7, 0.92, 0.95, '#f2f0e8'); cyl(x + 0.6, y + 0.35, 0.03, 0.92, 1.3, '#c8a040'); bx(x + 0.45, y + 0.25, x + 0.78, y + 0.45, 1.25, 1.38, '#2a6a3a'); glow(x + 0.6, y + 0.4, 1.2, 1.0, 'rgba(255,230,160,.35)');
        bx(x0 + 1.1, y + 0.75, x0 + 1.5, y + 0.82, 0.92, 1.0, '#c8a040'); break; }
      case 'safe': bx(x + 0.18, y + 0.2, x + 0.82, y + 0.8, 0, 0.8, '#3a3e44'); qR(K, x + 0.82, y + 0.25, y + 0.75, 0.08, 0.72, '#4a4f56'); dot(x + 0.82, y + 0.5, 0.42, 0.08, '#8a8e94'); break;
      case 'filecab': bx(x + 0.15, y + 0.1, x + 0.85, y + 0.9, 0, 1.6, '#7a8088'); for (let i = 0; i < 4; i++) { qL(x + 0.2, x + 0.8, y + 0.9, 0.1 + i * 0.38, 0.42 + i * 0.38, '#8a9098'); qL(x + 0.42, x + 0.58, y + 0.905, 0.3 + i * 0.38, 0.34 + i * 0.38, '#3a3e44'); } break;
      case 'globe': cyl(x + 0.5, y + 0.5, 0.2, 0, 0.08, '#5a3a24'); cyl(x + 0.5, y + 0.5, 0.04, 0.08, 0.8, '#8a6a3a'); { const [X, Y] = S(x + 0.5, y + 0.5, 1.05); g.fillStyle = '#3a7aa8'; g.beginPath(); g.arc(X, Y, TW * 0.22, 0, 7); g.fill(); g.fillStyle = '#6aa04a'; g.beginPath(); g.ellipse(X - TW * 0.05, Y - TW * 0.03, TW * 0.1, TW * 0.07, 0.5, 0, 7); g.fill(); } break;
      case 'fence': {   // rete metallica col filo spinato (v = lungo y); c = palo d'angolo
        const v = o.v, H2 = 2.1, P2 = [];
        const pt = (u, z) => v ? S(x + 0.5, y + u, z) : S(x + u, y + 0.5, z);
        for (let i = 0; i <= 4; i++) { P2.push([pt(i / 4, 0.05), pt(Math.min(1, i / 4 + 0.5), 0.05 + H2 * 0.48)]); P2.push([pt(i / 4, 0.05), pt(Math.max(0, i / 4 - 0.5), 0.05 + H2 * 0.48)]); }
        for (let i = 0; i <= 4; i++) { P2.push([pt(Math.min(1, i / 4 + 0.5), 0.05 + H2 * 0.48), pt(i / 4, H2 * 0.95)]); P2.push([pt(Math.max(0, i / 4 - 0.5), 0.05 + H2 * 0.48), pt(i / 4, H2 * 0.95)]); }
        strokes(P2, '#8a9098', Math.max(1, TW / 48)); strokes([[pt(0, H2 * 0.95), pt(1, H2 * 0.95)], [pt(0, 0.05), pt(1, 0.05)]], '#6a7078', Math.max(1.5, TW / 30));
        v ? bx(x + 0.45, y - 0.04, x + 0.55, y + 0.06, 0, H2 + 0.3, '#5a6068') : bx(x - 0.04, y + 0.45, x + 0.06, y + 0.55, 0, H2 + 0.3, '#5a6068');
        const L2 = []; for (let k = 0; k < 6; k++) { const a = k / 6 * 7, b = (k + 1) / 6 * 7; L2.push([v ? S(x + 0.5 + Math.cos(a) * 0.14, y + k / 6, H2 + 0.18 + Math.sin(a) * 0.14) : S(x + k / 6, y + 0.5 + Math.cos(a) * 0.14, H2 + 0.18 + Math.sin(a) * 0.14), v ? S(x + 0.5 + Math.cos(b) * 0.14, y + (k + 1) / 6, H2 + 0.18 + Math.sin(b) * 0.14) : S(x + (k + 1) / 6, y + 0.5 + Math.cos(b) * 0.14, H2 + 0.18 + Math.sin(b) * 0.14)]); }
        strokes(L2, '#b8bcc4', Math.max(1, TW / 40));
        if (o.c) bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0, H2 + 0.3, '#5a6068'); break; }
    }
  }
  // scrivania semplice (come quella del motore)
  function desk(K, x, y) { for (const [a, b] of [[0.08, 0.16], [0.82, 0.16], [0.08, 0.74], [0.82, 0.74]]) K.bx(x + a, y + b, x + a + 0.1, y + b + 0.1, 0, 0.7, '#6b5238'); K.bx(x + 0.02, y + 0.1, x + 0.98, y + 0.9, 0.7, 0.85, '#b99a72'); }
  CQ_MAPS.carcere = { n: 'Carcere di Rocca Nera', make: mapPrison, only: 'evasione' };

  // ======================= REGOLE =======================
  const cellOf = c => MP().cells[c.cell];
  const inCell = (c, k) => { const p = P(c), r = roomAt(p.x, p.y); return r >= 0 && r === MP().cells[k == null ? c.cell : k].ri; };
  const isoOn = (G, c) => (c.iso || 0) > G.time;
  const ricOn = (G, c) => (c.ric || 0) > G.time;
  const mySpot = c => MP().spots[c.no - 1];
  const onSpot = c => { const s = mySpot(c), p = P(c); return Math.hypot(p.x - s[0], p.y - s[1]) < SPOT_R; };
  // FUORI POSTO: in una zona vietata, ricercato, oppure fuori dalla propria cella dopo che le sbarre si sono chiuse
  function illegal(G, c) {
    if (!c.alive || isoOn(G, c) || c.out || c.inT) return false;
    if (ricOn(G, c)) return true;
    // TRAVESTITO: le guardie ti credono un collega; da vicino (DV_R) ti riconoscono (il portinaio no: guarda il tesserino, tranne con l'allerta)
    if (c.dv) { const p = P(c); return G.gd.some(g => g.st !== 'ko' && floorOf(g.x) === floorOf(p.x) && (!g.post || alertOn(G) || g.route !== MP().routes.ingresso.route) && Math.hypot(g.x - p.x, g.y - p.y) < DV_R); }
    // SCORTATO: un detenuto accanto a un "secondino" travestito sembra in regola
    if (G.chars.some(o => o !== c && o.dv && !o.out && Math.hypot(o.x - P(c).x, o.y - P(c).y) < 1.7)) return false;
    const p = P(c); if (forbAt(p.x, p.y)) return true;
    if (closed(G) && !inCell(c)) return true;
    return false;
  }
  // l'host scrive (G.lg), ognuno racconta dal suo punto di vista
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), an = A ? '<b>' + esc(A.name) + '</b>' : 'Qualcuno', mine = A === me; let t = '';
    if (e.k === 'miss') { t = mine ? '🚨 Non eri al tuo posto all\'appello: sei RICERCATO! Fatti perdere di vista finché non si calmano.' : '🚨 All\'appello manca il N° ' + (A ? A.no : '?') + ' ' + an + ': le guardie lo cercano!'; for (let i = 0; i < 4; i++) beep(i % 2 ? 640 : 860, 0.18, 0.035, i * 0.22, 'square'); }
    else if (e.k === 'allok') { t = '✅ Appello: tutti presenti. Il capoguardia è soddisfatto (per ora).'; beep(660, 0.1, 0.03); beep(880, 0.14, 0.03, 0.1); }
    else if (e.k === 'night') { t = mine ? '🚨 Le sbarre si sono chiuse e tu non sei in cella: sei RICERCATO!' : '🚨 ' + an + ' non è rientrato in cella: lo cercano!'; for (let i = 0; i < 4; i++) beep(i % 2 ? 640 : 860, 0.18, 0.035, i * 0.22, 'square'); }
    else if (e.k === 'chase') { if (mine) { t = '❗ Ti hanno visto fuori posto! Scappa e fatti perdere di vista!'; cq.hurt = performance.now(); } beep(520, 0.1, 0.05, 0, 'square'); beep(780, 0.15, 0.05, 0.1, 'square'); }
    else if (e.k === 'caught') { t = mine ? '⛓️ Preso! ' + ISO_T + ' secondi in isolamento' + (e.it ? ', sequestrati ' + icons(e.it) : '') + '. Le guardie ora sono più attente.' : '⛓️ ' + an + ' è finito in isolamento!' + (e.it ? ' Sequestrati ' + icons(e.it) + '.' : ''); for (let i = 0; i < 4; i++) beep(i % 2 ? 600 : 800, 0.16, 0.03, i * 0.2); }
    else if (e.k === 'steal') { if (e.s) { t = mine ? '👀 Ti hanno visto rubare: sei RICERCATO! Scappa!' : '👀 ' + an + ' si è fatto vedere mentre rubava!'; beep(520, 0.1, 0.05, 0, 'square'); beep(780, 0.15, 0.05, 0.1, 'square'); } else if (mine) { t = '✋ Preso: <b>' + itx(e.it) + '</b> (' + IT[e.it][2] + '). Nascondilo prima dell\'appello!'; beep(990, 0.06, 0.03); beep(1320, 0.08, 0.03, 0.07); } }
    else if (e.k === 'stseen') { if (mine) t = '👀 Una guardia ti ha visto al nascondiglio: andrà a controllare!'; }
    else if (e.k === 'found') { const S = MP().stash[e.h]; t = '🔎 Le guardie hanno frugato ' + (S ? S.n : 'un nascondiglio') + ': sequestrati ' + icons(e.it) + '!'; beep(500, 0.15, 0.04); beep(380, 0.25, 0.04, 0.15); }
    else if (e.k === 'frisk') { t = mine ? '🔎 Ti hanno perquisito: sequestrati ' + icons(e.it) + '!' : '🔎 Perquisito ' + an + ': sequestrati ' + icons(e.it) + '.'; beep(500, 0.15, 0.04); beep(380, 0.25, 0.04, 0.15); }
    else if (e.k === 'ps') { const C = MP().cells[e.kc], my = me.cell === e.kc; t = (e.sn ? '🐀 Soffiata! ' : '') + (my ? '🔎 PERQUISIZIONE nella <b>tua cella ' + C.n + '</b> tra ' + Math.max(1, e.s) + ' s! Porta via la refurtiva!' : '🔎 Perquisizione in arrivo nella cella ' + (C ? C.n : '?') + ' tra ' + Math.max(1, e.s) + ' s.'); for (let i = 0; i < 3; i++) beep(700, 0.12, 0.04, i * 0.25, 'square'); }
    else if (e.k === 'psok') { const S = MP().stash[e.h]; t = '😎 Perquisizione finita' + (S && S.cell != null ? ' nella cella ' + MP().cells[S.cell].n : '') + ': non hanno trovato niente!'; }
    else if (e.k === 'dummy') { if (mine) { t = '🧸 Fantoccio pronto! Al controllo notturno delle celle il secondino crederà che dormi (ma con l\'allerta guarda meglio).'; beep(660, 0.08, 0.03); beep(880, 0.1, 0.03, 0.09); } }
    else if (e.k === 'out') { const v = VIA[e.v] || ['🌲', '']; t = mine ? v[0] + ' SEI FUORI! Sei scappato ' + v[1] + '. Ora aspetta i compagni (o aiutali con la corda).' : v[0] + ' ' + an + ' è scappato ' + v[1] + '!'; for (let i = 0; i < 5; i++) beep([523, 659, 784, 1046, 1318][i], 0.16, 0.04, i * 0.12, 'triangle'); }
    else if (e.k === 'evaso') { t = '🚨 EVASIONE! Le guardie hanno scoperto che manca ' + an + ': ALLERTA!'; for (let i = 0; i < 6; i++) beep(i % 2 ? 600 : 900, 0.2, 0.04, i * 0.22, 'square'); }
    else if (e.k === 'seal') { const C = MP().cells[e.kc]; t = '🧱 ' + (e.w === 'terra' ? 'Hanno trovato i sacchi di terra nella cella ' : 'Hanno trovato il buco nella cella ') + (C ? C.n : '') + ': il tunnel è stato murato!'; beep(300, 0.3, 0.05); beep(220, 0.4, 0.05, 0.3); }
    else if (e.k === 'piece') { const C = MP().cells[e.kc]; if (me.cell === e.kc) t = '⛏️ Un pezzo di tunnel fatto! Domani notte si finisce. Di giorno porta la terra nell\'orto 🟫'; }
    else if (e.k === 'tundone') { const C = MP().cells[e.kc]; t = '🕳️ Il tunnel della cella ' + (C ? C.n : '') + ' è finito: si può scappare!'; beep(784, 0.12, 0.04); beep(1046, 0.18, 0.04, 0.12); }
    else if (e.k === 'fulldirt') { if (mine) t = '🟫 Troppa terra in cella: di giorno portala nell\'orto, se no la perquisizione la trova!'; }
    else if (e.k === 'digseen') { t = mine ? '👀 Il secondino ti ha visto scavare! Ti ha preso il cucchiaio e il pezzo di stanotte è perso.' : '👀 Il secondino ha visto ' + an + ' scavare!'; beep(520, 0.1, 0.05, 0, 'square'); beep(780, 0.15, 0.05, 0.1, 'square'); }
    else if (e.k === 'dump') { if (mine) t = '🟫 Terra sparsa nell\'orto: nessuno se ne accorge (si spera).'; }
    else if (e.k === 'cam0') { t = '🚚 Oggi il camion della lavanderia arriva alle <b>' + e.t + '</b> nel cortile di carico. Ci si entra dalla porta dell\'officina (serve il 🪛).'; beep(660, 0.1, 0.03); beep(880, 0.1, 0.03, 0.12); }
    else if (e.k === 'cam1') { t = '🚚 Il camion della lavanderia è arrivato! Riparte tra ' + CAM_T + ' secondi.'; thud(0.4, 90); }
    else if (e.k === 'cam3') { t = '🚚 Il camion riparte…'; }
    else if (e.k === 'camchk') { t = '🔎 La guardia ha controllato il carico del camion: ' + (e.n > 1 ? 'presi in ' + e.n : 'preso') + '!'; }
    else if (e.k === 'inT') { if (mine) t = '🚚 Sei nel camion, nascosto tra i sacchi. Prima di partire a volte controllano il carico…'; }
    else if (e.k === 'mdoor') { t = mine ? '🪛 Porta del carico aperta (fino a stasera). Ha fatto rumore…' : '🪛 ' + an + ' ha aperto la porta del cortile di carico.'; }
    else if (e.k === 'wear') { if (mine) t = '👔 Ora sei una "guardia": le altre ti credono un collega, ma da vicino ti riconoscono. Col 🪪 tesserino esci dal cancello principale, e puoi scortare un compagno.'; }
    else if (e.k === 'rope') { t = mine ? '🪢 Corda lanciata! Resta lì ' + ROPE_T + ' s, se una guardia non la vede prima.' : '🪢 ' + an + ' ha lanciato una corda oltre il muro! Scavalca la rete del cortile e arrampicati.'; beep(880, 0.08, 0.03); }
    else if (e.k === 'ropegone') { t = '🪢 Una guardia ha trovato la corda e l\'ha tolta. ALLERTA!'; }
    else if (e.k === 'snitch') { if (mine) t = e.w ? '🐀 Soffiata fatta (' + e.w + '). Prossima tra ' + SPY_CD + ' s.' : '🐀 Non avevi niente da dire: la guardia ti ha guardato strano.'; }
    else if (e.k === 'nc') { t = '🔦 Il secondino passa a controllare le celle…'; }
    else if (e.k === 'dmok') { t = mine ? '🧸 Il fantoccio ha funzionato: il secondino crede che dormi!' : '🧸 Il fantoccio di ' + an + ' ha ingannato il secondino!'; }
    else if (e.k === 'dmbad' || e.k === 'ncmiss') { t = mine ? (e.k === 'dmbad' ? '🧸 Il secondino ha scoperto il fantoccio' : '🔦 Il secondino ha visto il tuo letto vuoto') + ': sei RICERCATO!' : '🔦 Al controllo delle celle manca ' + an + '!'; for (let i = 0; i < 4; i++) beep(i % 2 ? 640 : 860, 0.18, 0.035, i * 0.22, 'square'); }
    else if (e.k === 'free') { if (mine) t = '🔓 Fuori dall\'isolamento: ' + (e.n ? 'ti hanno riportato in cella.' : 'torna al tuo posto e non farti notare.'); }
    else if (e.k === 'spot') { t = mine ? '🔦 Il riflettore ti ha illuminato! Arriva una guardia…' : '🔦 Un riflettore ha illuminato ' + an + '!'; beep(1200, 0.06, 0.03); beep(1200, 0.06, 0.03, 0.12); }
    else if (e.k === 'notice') { if (e.x == null || floorOf(e.x) === floorOf(cq.x)) t = '👮 Una guardia ha notato qualcosa di strano: ora cerca nei dintorni…'; }
    if (t) cqToast(t);
  }
  // presa: ISOLAMENTO a tempo, la refurtiva in tasca e' persa; le guardie diventano piu' attente
  function catchT(G, gd, c) {
    if (isoOn(G, c) || !c.alive) return;
    const M = MP(), n = G.chars.filter(o => isoOn(G, o)).length, s = M.iso[n % M.iso.length], lost = pk(c).splice(0);
    if (c.remote) cqNetNow();   // l'amico deve vedersi in isolamento subito
    c.dv = 0; c.dg = 0; c.inT = 0; c.cl = 0;
    c.iso = G.time + ISO_T; c.ric = 0; c.isoN = (c.isoN || 0) + 1; c.path = []; c.isoC = n % M.iso.length;
    if (c.bot || c === G.me) { c.x = s.x; c.y = s.y; if (c === G.me) { cq.x = s.x; cq.y = s.y; G.myIso = c.isoN; } }
    G.alE = Math.max(G.alE || 0, G.time + ALERT_T); say(G, 'caught', { a: c.id, it: lost.join(',') });
  }

  // ======================= REFURTIVA, NASCONDIGLI, PERQUISIZIONI, FANTOCCIO =======================
  // gli attrezzi [icona, nome, a cosa serve] e dove si rubano (di giorno, se nessuna guardia ti vede); dopo un furto ne arriva un altro tra RESP_T s
  const IT = { cu: ['🥄', 'Cucchiaio', 'per scavare'], ca: ['🪛', 'Cacciavite', 'per le serrature'], le: ['🧵', 'Lenzuolo', 'per fare la corda'], st: ['🧻', 'Stracci', 'per il fantoccio'], di: ['👔', 'Divisa', 'per travestirsi'], te: ['🪪', 'Tesserino', 'per i cancelli'], tr: ['🟫', 'Terra', 'da spargere nell\'orto'] };
  const SRC = [{ k: 'cu', x: 68.5, y: 12.5 }, { k: 'st', x: 78.5, y: 28.5 }, { k: 'le', x: 86.5, y: 28.5 }, { k: 'ca', x: 56.5, y: 35.5 }, { k: 'di', x: 72.5, y: 54.5 }, { k: 'te', x: 59.5, y: 53.5 }];
  const POCK = 2, ST_N = 3, RESP_T = 45, PICK_R = 1.25, ST_R = 1.25, PS_W = 20, FR_P = 0.3, NCK = [190.5, 216];
  const PHF = ['Guarda guarda cosa abbiamo qui…', 'Sequestrato!', 'Questo me lo tengo io, grazie', 'E questo da dove salta fuori?', 'Bravi furbacchioni…'];
  const PHE = ['Tutto in ordine. Per ora.', 'Pulito. Strano…', 'Niente di niente', 'Solo un calzino puzzolente'];
  // frasi da carcere nei fumetti delle guardie (le altre restano quelle del modulo)
  const PHP = { idle: ['Che noia questo turno…', 'Il caffè della mensa fa schifo pure a me', 'Ancora tre ore e vado a casa', 'Chi ha lasciato le briciole sul tavolo?', '*sbadiglio*', 'Stasera c\'è la partita…', 'Il direttore mi ha sgridato di nuovo', 'Qui non succede mai niente. Speriamo.', 'Mi fanno male i piedi', 'Conto le sbarre per passare il tempo'], nerv: ['Qui c\'è qualcosa che non va…', 'Oggi i detenuti sono strani', 'Occhi aperti, ragazzi'] };
  const pk = c => c.pk || (c.pk = []);
  const itx = k => IT[k][0] + ' ' + IT[k][1];
  const icons = s => (s ? s.split(',') : []).map(k => IT[k] ? IT[k][0] : '').join(' ');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const difK = G => G.opt.dif === 'f' ? 0.8 : G.opt.dif === 'd' ? 1.25 : 1;
  const gsay = (G, gd, t) => { if (gd) { gd.bub = { t, e: G.time + 2.8 }; gd.bubT = G.time + 3; } };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // chi mi vede ADESSO (per rubare e per i nascondigli): la prima guardia che mi ha nel cono
  function seenBy(G, c) {
    const p = P(c), Rk = (alertOn(G) ? 1.22 : 1) * (0.85 + 0.15 * difK(G));
    for (const gd of G.gd) { if (gd.st === 'ko' || floorOf(gd.x) !== floorOf(p.x)) continue; if (GD.sees(gd, p.x, p.y, rangeAt(G, p.x, p.y) * Rk) > 0) return gd; }
    return null;
  }
  const srcOn = (G, i) => (G.src[i] || 0) <= G.time;
  const srcNear = c => { const p = P(c); let b = -1, bd = PICK_R; SRC.forEach((s, i) => { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; b = i; } }); return b; };
  const stNear = c => { const p = P(c); let b = -1, bd = 9; MP().stash.forEach((h, i) => { const d = Math.hypot(p.x - h.x - 0.5, p.y - h.y - 0.5); if (d < (h.r || ST_R) && d < bd) { bd = d; b = i; } }); return b; };
  function nearGuard(G, x, y, free) { let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || (free && (g.st === 'chase' || g.post))) continue; const d = Math.hypot(g.x - x, g.y - y) + (floorOf(g.x) !== floorOf(x) ? 40 : 0); if (d < bd) { bd = d; b = g; } } return b; }
  // la guardia va a controllare un nascondiglio (h = indice in M.stash): arrivata, lo apre (env.hiddenAt -> stashChecked)
  function sendCheck(G, gd, h, t) { const S = MP().stash[h]; gd.st = 'srch'; gd.sp = [{ x: S.x + 0.5, y: S.y + 0.5, h }]; gd.sEnd = G.time + (t || 30); gd.chk = 0; gd.lk = 0; gd.path = []; }
  // visto rubare: ricercato e inseguito subito
  function caughtAct(G, gd, c) {
    const p = P(c); c.ric = Math.max(c.ric || 0, G.time + RIC_T); G.alE = Math.max(G.alE || 0, G.time + ALERT_T);
    if (gd.st !== 'chase') { gd.st = 'chase'; gd.tgt = c.id; gd.lose = 0; gd.path = []; gd.sus = 1; gd.md = 1; gd.lx = p.x; gd.ly = p.y; GD.say(G, gd, 'chase'); GD.alarm(G, gd, env(G)); }
  }
  // nascondere / riprendere: se una guardia ti vede, andra' a controllare quel nascondiglio
  function stashMove(G, c, a) {
    const h = a.h, S = MP().stash[h]; if (!S || stNear(c) !== h || !IT[a.it]) return;
    const L = G.st[h], Pk = pk(c);
    if (a.k === 'put') { const j = Pk.indexOf(a.it); if (j < 0 || L.length >= ST_N) return; Pk.splice(j, 1); L.push(a.it); }
    else { const j = L.indexOf(a.it); if (j < 0 || Pk.length >= POCK) return; L.splice(j, 1); Pk.push(a.it); }
    const gd = seenBy(G, c);
    if (gd && gd.st !== 'chase' && !G.stW[h]) { G.stW[h] = 1; sendCheck(G, gd, h, 30); gsay(G, gd, 'Ehi! Cosa nascondi lì?'); say(G, 'stseen', { a: c.id, h }); }
  }
  // una guardia ha aperto il nascondiglio h: la refurtiva e' persa; nella cella perquisisce anche le tasche di chi c'e'
  function stashChecked(G, h) {
    const S = MP().stash[h]; if (!S) return null;
    const lost = G.st[h].splice(0), ps = G.ps && G.ps.h === h && G.ps.st === 1, gd = nearGuard(G, S.x + 0.5, S.y + 0.5); let fr = 0;
    G.stW[h] = 0;
    if (S.cell != null) for (const c of G.chars) if (c.alive && !isoOn(G, c) && inCell(c, S.cell) && pk(c).length) { fr = 1; say(G, 'frisk', { a: c.id, it: c.pk.splice(0).join(',') }); }
    if (S.cell != null && (G.dirt[S.cell] || 0) > 0 && !G.seal[S.cell]) { fr = 1; seal(G, S.cell, 'terra'); }
    if (lost.length) say(G, 'found', { h, it: lost.join(',') }); else if (ps && !fr) say(G, 'psok', { h });
    if (ps) { G.ps.st = 2; G.ps.e = G.time; }
    gsay(G, gd, rnd(lost.length || fr ? PHF : PHE));
    return null;
  }
  // PERQUISIZIONI: una cella al giorno (due il secondo giorno), annunciata PS_W secondi prima; di solito quella con piu' refurtiva nascosta
  function psStart(G, T) {
    const M = MP(), ks = [...new Set(G.chars.filter(c => c.alive).map(c => c.cell))];
    let k = rnd(ks); if (Math.random() < 0.6) k = ks.slice().sort((a, b) => G.st[M.cells[b].st].length + 2 * (G.dirt[b] || 0) - G.st[M.cells[a].st].length - 2 * (G.dirt[a] || 0))[0];
    G.ps = { k, h: M.cells[k].st, t: T, st: 0, g: -1 }; say(G, 'ps', { kc: k, s: Math.round(T - G.time) });
  }
  function psTick(G) {
    const ps = G.ps, M = MP();
    if (phase(G) !== 'day' || G.time > ps.t + 60 || (ps.st === 2 && G.time > ps.e + 4)) { G.ps = null; return; }
    if (ps.st === 0 && G.time >= ps.t) ps.st = 1;
    if (ps.st !== 1) return;
    let g = G.gd[ps.g];
    const busy = g && g.st === 'srch' && g.sp[0] && g.sp[0].h === ps.h;
    if (busy || (g && g.st === 'chase')) return;
    // il secondino del braccio (o la guardia libera piu' vicina) va nella cella
    const c = M.cells[ps.k]; g = G.gd.find(o => o.route === M.routes.braccio.route && o.st !== 'chase' && o.st !== 'ko') || nearGuard(G, c.x0 + 2, c.y0 + 2, true);
    if (!g) return; ps.g = g.id; sendCheck(G, g, ps.h, 45); gsay(G, g, 'Perquisizione! Cella ' + c.n + ', vediamo un po\'…');
  }
  // CONTROLLO NOTTURNO delle celle (00:00 e 03:00): il secondino passa davanti alle sbarre; il letto vuoto = ricercato, il FANTOCCIO lo inganna (non con l'allerta)
  function ncPts(G) { const M = MP(); return G.nc.k.filter(k => !G.nc.done.includes(k)).map(k => { const c = M.cells[k]; return { x: c.x0 + 2, y: c.y0 === 9 ? 14.6 : 25.4, h: -1, k }; }); }
  function ncStart(G) {
    const M = MP(), ks = [...new Set(G.chars.filter(c => c.alive).map(c => c.cell))].sort((a, b) => M.cells[a].x0 - M.cells[b].x0);
    G.nc = { t: G.time, k: ks, done: [], g: -1 }; say(G, 'nc', {}); ncSend(G);
  }
  function ncSend(G) {
    const M = MP(), g = G.gd.find(o => o.route === M.routes.braccio.route && o.st !== 'chase' && o.st !== 'ko') || nearGuard(G, 30, 20, true); if (!g) return;
    G.nc.g = g.id; g.st = 'srch'; g.sp = ncPts(G); g.sEnd = G.time + 60; g.chk = 0; g.lk = 0; g.path = []; gsay(G, g, 'Controllo delle celle… tutti a nanna?');
  }
  function ncTick(G) {
    const nc = G.nc, g = G.gd[nc.g];
    if (G.time > nc.t + 70 || nc.done.length >= nc.k.length || !closed(G)) { G.nc = null; return; }
    for (const p of ncPts(G)) if (g && Math.hypot(g.x - p.x, g.y - p.y) < 1.7) { nc.done.push(p.k); ncEval(G, p.k, g); }
    if ((!g || (g.st !== 'srch' && g.st !== 'chase')) && G.time > (nc.sT || 0)) { nc.sT = G.time + 3; ncSend(G); }
  }
  function ncEval(G, k, g) {
    let bad = 0;
    for (const c of G.chars) {
      if (c.cell !== k || !c.alive || isoOn(G, c) || inCell(c)) continue;
      if (c.out) { if (c.seen) continue; if (c.dm && !alertOn(G)) { say(G, 'dmok', { a: c.id }); continue; } found(G, c); bad = 1; continue; }
      if (c.dm && !alertOn(G)) { say(G, 'dmok', { a: c.id }); continue; }
      say(G, c.dm ? 'dmbad' : 'ncmiss', { a: c.id }); c.dm = 0; c.ric = G.time + RIC_T; c.miss = (c.miss || 0) + 1; bad = 1;
    }
    if (bad) { G.alE = Math.max(G.alE || 0, G.time + ALERT_T); gsay(G, g, 'Il letto è vuoto! ALLARME!'); g.md = 1; }
    else gsay(G, g, rnd(['Dormono come angioletti', 'Russano… tutto ok', 'Che pace', 'Zitti e a nanna']));
  }
  // ======================= LE VIE DI FUGA =======================
  // TUNNEL (sotto la branda, col cucchiaio, di notte, un pezzo per notte: TUN_T s di scavo a pezzo, un sacco di terra ogni SACK_T s, al massimo DIRT_MAX in cella),
  // DIVISA (+ tesserino al cancello principale, con un compagno scortato), CAMION della lavanderia (orario a caso annunciato; porta dell'officina col cacciavite),
  // CORDA (chi e' fuori la lancia dal muro col lenzuolo; dentro si scavalca la rete del cortile e ci si arrampica dalla fascia di ronda)
  const TUN_T = 36, SACK_T = 9, DIRT_MAX = 4, CAM_T = 26, CAM_P = 0.3, CL_T = 2.5, ROPE_T = 70, DV_R = 2.3;
  const DOORP = [83.9, 40.5], TRK = [84.6, 39.3], MDP = [71.5, 40.9], GATEP = [71.5, 66.3];
  const VIA = { tun: ['🕳️', 'dal tunnel'], div: ['👔', 'travestito da guardia'], cam: ['🚚', 'nel camion della lavanderia'], cor: ['🪢', 'con la corda'] };
  const clockAt = t => clock({ time: t });
  const tunCap = G => Math.min(2, dayN(G));
  const holeNear = c => { const p = P(c), M = MP(); for (const k of M.pcells) { const h = M.cells[k].hole; if (Math.hypot(p.x - h[0], p.y - h[1]) < 0.75) return k; } return -1; };
  const near = (c, q, r) => { const p = P(c); return Math.hypot(p.x - q[0], p.y - q[1]) < r; };
  // il camion adesso: 0 niente, 1 arriva, 2 parcheggiato, 3 riparte; sh = quanto e' spostato verso il cancello
  function camPh(G) {
    const C = G.cam; if (!C) return { ph: 0, sh: 0 };
    const u = G.time - C.T; if (u < -4) return { ph: 0, sh: 0 }; if (u < 0) return { ph: 1, sh: 12 * Math.pow(-u / 4, 2) };
    if (u < CAM_T) return { ph: 2, sh: 0 }; if (u < CAM_T + 4) return { ph: 3, sh: 12 * Math.pow((u - CAM_T) / 4, 2) }; return { ph: 0, sh: 0 };
  }
  // la rete del cortile: da una parte all'altra (cortile <-> fascia di ronda)
  function fenceAt(c) {
    const p = P(c), x = p.x, y = p.y; if (floorOf(x)) return null; let q = null;
    if (y > 32.3 && y < 66.7) { if (x > 9 && x < 9.9) q = [7.5, y]; else if (x > 6 && x < 8) q = [9.5, y]; }
    if (!q && x > 9.3 && x < 47.7) { if (y > 66 && y < 66.95) q = [x, 68.5]; else if (y > 68 && y < 70) q = [x, 66.5]; }
    return q && cqCellFree(Math.floor(q[0]), Math.floor(q[1])) ? q : null;
  }
  // da fuori, accanto al muro di cinta: dove cadrebbe la corda (ix, iy = dentro, nella fascia di ronda)
  function ropeAt(c) {
    const p = P(c), x = p.x, y = p.y; let r = null;
    if (y > 2 && y < 3.95 && x > 8 && x < 92) r = { ix: x, iy: 6.6, ox: x, oy: y };
    else if (x > 2 && x < 3.95 && y > 8 && y < 67) r = { ix: 6.6, iy: y, ox: x, oy: y };
    else if (x > 96.05 && x < 98 && y > 8 && y < 67) r = { ix: 93.4, iy: y, ox: x, oy: y };
    else if (y > 72.05 && y < 73.6 && x > 8 && x < 92) r = { ix: x, iy: 69.4, ox: x, oy: y };
    return r && cqCellFree(Math.floor(r.ix), Math.floor(r.iy)) ? r : null;
  }
  const ropeNear = (G, c) => G.rope.findIndex(r => near(c, [r.ix, r.iy], 1.1));
  const inOrto = c => { const p = P(c); return floorOf(p.x) === 0 && p.x > 10.3 && p.x < 18.7 && p.y > 58.3 && p.y < 64.2; };
  // SCAPPATO: fuori dal muro, aspetta i compagni; chi lo segue da vicino (detenuti del computer agganciati) scappa con lui
  function escapeC(G, c, via, x, y, o) {
    if (c.out) return; o = o || {}; const p0 = P(c), x0 = p0.x, y0 = p0.y;
    let tx = x, ty = y; if (!cqCellFree(Math.floor(tx), Math.floor(ty))) { const q = cqSpot(Math.floor(tx), Math.floor(ty)); tx = q.x; ty = q.y; }
    Object.assign(c, { out: via, outT: G.time, dv: 0, dg: 0, inT: 0, cl: 0, ric: 0, zz: 0, path: [], tk: o.k == null ? -1 : o.k });
    c.relN = (c.relN || 0) + 1; c.rel = [tx, ty];
    if (c.bot || c === G.me) { c.x = tx; c.y = ty; if (c === G.me) { cq.x = tx; cq.y = ty; G.myRel = c.relN; } }
    say(G, 'out', { a: c.id, v: via });
    if (o.nf) return;
    let esc = via === 'div' ? 1 : 9;   // col travestimento si scorta un compagno solo
    for (const b of G.chars) if (esc > 0 && b !== c && b.alive && !b.out && !isoOn(G, b) && (b.ld === c.id || via === 'div') && (b.bot || via === 'div') && Math.hypot(P(b).x - x0, P(b).y - y0) < (via === 'div' ? 2.2 : 3.2) && roomAt(P(b).x, P(b).y) === roomAt(x0, y0) && !b.inT) { esc--; escapeC(G, b, via, x + 0.6 * (2 - esc), y + 0.4, { k: o.k, nf: 1 }); }
  }
  // la fuga scoperta (all'appello o al controllo): allerta lunga; se era il tunnel, lo trovano e lo murano
  function found(G, c) {
    c.seen = 1; G.alE = Math.max(G.alE || 0, G.time + ALERT_T * 2); say(G, 'evaso', { a: c.id, v: c.out });
    if (c.out === 'tun' && c.tk >= 0 && !G.seal[c.tk]) seal(G, c.tk, 'fuga');
  }
  function seal(G, k, why) { G.seal[k] = 1; G.tun[k] = 0; G.dirt[k] = 0; for (const c of G.chars) if (c.dg === k + 1) c.dg = 0; say(G, 'seal', { kc: k, w: why }); }
  // SCAVARE (sull'host): progresso, sacchi di terra, rumore; se il secondino ti vede, perdi il pezzo di stanotte e il cucchiaio
  function digTick(G, dt) {
    const M = MP();
    for (const c of G.chars) {
      if (!c.dg) continue; const k = c.dg - 1, C = M.cells[k];
      if (!closed(G) || isoOn(G, c) || c.out || G.seal[k] || !inCell(c, k) || !near(c, C.hole, 0.85) || !pk(c).includes('cu') || (G.tun[k] || 0) >= tunCap(G) || (G.dirt[k] || 0) >= DIRT_MAX) { c.dg = 0; continue; }
      G.tun[k] = Math.min(tunCap(G), (G.tun[k] || 0) + dt / TUN_T);
      G.digS[k] = (G.digS[k] || 0) + dt; if (G.digS[k] >= SACK_T) { G.digS[k] -= SACK_T; G.dirt[k] = (G.dirt[k] || 0) + 1; }
      const bf = [C.x0 + 1.5, C.y0 === 9 ? 14.6 : 25.4], cc = [C.x0 + 2, C.y0 + 2];
      if ((c.nT = (c.nT || 0) - dt) <= 0) { c.nT = 1.6; GD.noise(G, bf[0], bf[1], 5); }
      const gd = seenBy(G, c) || G.gd.find(o => o.st !== 'ko' && Math.hypot(o.x - bf[0], o.y - bf[1]) < 3.5 && GD.sees(o, cc[0], cc[1], 5) > 0);
      if (gd) { G.tun[k] = G.tun0[k] || 0;   // si torna a com'era a inizio notte
        c.dg = 0; const j = c.pk.indexOf('cu'); if (j >= 0) c.pk.splice(j, 1); G.alE = Math.max(G.alE || 0, G.time + ALERT_T); gsay(G, gd, 'Che stai scavando?! Dammi quel cucchiaio!'); say(G, 'digseen', { a: c.id }); continue; }
      if (G.tun[k] >= tunCap(G)) { c.dg = 0; say(G, G.tun[k] >= 2 ? 'tundone' : 'piece', { kc: k }); }
      else if ((G.dirt[k] || 0) >= DIRT_MAX) { c.dg = 0; say(G, 'fulldirt', { a: c.id }); }
    }
  }
  // IL CAMION: annunciato dopo l'appello del mattino, arriva, aspetta CAM_T s (una guardia sorveglia), controlla il carico (a volte) e riparte
  function camTick(G) {
    if (!G.cam && G.camL.length && G.time >= Math.floor(G.camL[0] / DAY) * DAY + AP1 + 1.5) { const T = G.camL.shift(); G.cam = { T, st: 0 }; say(G, 'cam0', { t: clockAt(T) }); }
    const C = G.cam; if (!C) return;
    const u = G.time - C.T;
    if (C.st === 0 && u >= -4) { C.st = 1; say(G, 'cam1', {}); const g = nearGuard(G, 88, 44, true); if (g) { GD.postAt(G, g, 89.5, 43.5, 89.5, 40, CAM_T + 5); gsay(G, g, 'Forza, scaricate e via!'); } }
    if (C.st === 1 && u >= 0) C.st = 2;
    if (C.st === 2 && u >= CAM_T - 3 && !C.chk) { C.chk = 1; const inn = G.chars.filter(c => c.inT); if (inn.length && Math.random() < (alertOn(G) ? CAM_P + 0.35 : CAM_P)) { const g = nearGuard(G, DOORP[0], DOORP[1]); gsay(G, g, 'Diamo un\'occhiata al carico… AH-AH!'); say(G, 'camchk', { n: inn.length }); for (const c of inn) { c.inT = 0; catchT(G, g, c); } } }
    if (C.st === 2 && u >= CAM_T) { C.st = 3; say(G, 'cam3', {}); }
    if (C.st === 3 && u >= CAM_T + 4) { let i = 0; for (const c of G.chars) if (c.inT) escapeC(G, c, 'cam', 88.5 + (i++ % 4) * 0.9, 74.5, { nf: 1 }); G.cam = null; }
  }

  // LA SPIA: una SOFFIATA ogni SPY_CD s. Cosa dice alle guardie (la cosa piu' utile per fermare la fuga): il tunnel (perquisizione improvvisa di giorno,
  // controllo delle celle di notte), il nascondiglio comune piu' pieno, la corda, la porta del carico aperta. Il fumetto della guardia e' innocente.
  const SPY_CD = 60;
  function snitch(G, c, gd) {
    const M = MP(); let w = '';
    const tk = M.pcells.filter(k => !G.seal[k] && ((G.tun[k] || 0) > 0 || (G.dirt[k] || 0) > 0)).sort((a, b) => (G.tun[b] || 0) - (G.tun[a] || 0))[0];
    const st = M.stash.map((h, i) => ({ h, i, n: (G.st[i] || []).length })).filter(q => q.h.cell == null && q.n > 0).sort((a, b) => b.n - a.n)[0];
    if (tk != null && phase(G) === 'day' && !G.ps) { G.ps = { k: tk, h: M.cells[tk].st, t: G.time + 8, st: 0, g: -1, sn: 1 }; say(G, 'ps', { kc: tk, s: 8, sn: 1 }); w = 'il tunnel della cella ' + M.cells[tk].n; }
    else if (tk != null && closed(G) && !G.nc) { ncStart(G); w = 'chi non è in cella stanotte'; }
    else if (G.rope.length) { const r = G.rope[0], g = nearGuard(G, r.ix, r.iy, true); if (g) GD.investigate(g, r.ix, r.iy, 'an'); (G.gan = G.gan || []).push({ x: r.ix, y: r.iy, k: 'src', t: G.time - 1, n: 0, rope: 1 }); w = 'la corda sul muro'; }
    else if (st) { const g = nearGuard(G, st.h.x, st.h.y, true); if (g) sendCheck(G, g, st.i, 40); w = st.h.n; }
    else if (G.mdO) { GD.anomaly(G, 72.5, 40.5, 'door'); w = 'la porta del carico aperta'; }
    c.snN = (c.snN || 0) + 1;
    if (gd) gsay(G, gd, rnd(['Mmh… interessante.', 'Ah sì? Grazie, ragazzo.', 'Vedremo, vedremo…', 'Torna al tuo posto, va\'.']));
    say(G, 'snitch', { a: c.id, w });
  }

  // fine dell'isolamento: di notte in cella, di giorno nel corridoio centrale
  function release(G, c) {
    const M = MP(), night = closed(G), q = night ? cellOf(c).sp[c.slot] : M.isoOut;
    c.iso = 0; c.relN = (c.relN || 0) + 1; c.rel = q;
    if (c.bot || c === G.me) { c.x = q[0]; c.y = q[1]; if (c === G.me) { cq.x = q[0]; cq.y = q[1]; G.myRel = c.relN; } }
    say(G, 'free', { a: c.id, n: night ? 1 : 0 });
  }
  // cosa si puo' fare qui (pulsante grande)
  function action(G, c) {
    if (!c.alive) return null;
    if (isoOn(G, c)) return { k: 'wait', t: '⛓️ Isolamento: ' + Math.ceil(c.iso - G.time) + ' s', on: false };
    // il rischio si legge sul pulsante: se una guardia ti vede adesso, lo dice
    const seen = () => seenBy(G, c) ? ' · 👀 ti vedono!' : '';
    if (c.cl) return { k: 'x', t: '🧗 Ti arrampichi…', on: false };
    if (c.inT) { const u = G.cam ? Math.ceil(G.cam.T + CAM_T - G.time) : 0; return { k: 'outT', t: '🚚 Nascosto nel camion' + (u > 0 ? ' · riparte tra ' + u + ' s' : '') + ' (tocca per uscire)', on: camPh(G).ph === 2 }; }
    if (c.out) { const r = ropeAt(c); if (r && pk(c).includes('le')) return { k: 'rope', t: '🪢 Lancia la corda oltre il muro (🧵)', on: true }; return { k: 'x', t: '🌲 Sei fuori! ' + (pk(c).includes('le') ? 'Vai al muro e lancia la corda' : 'Aspetta i compagni'), on: false }; }
    const hk = holeNear(c);
    if (hk >= 0 && !G.seal[hk]) {
      const tn = G.tun[hk] || 0, pc = Math.floor(tn * 50) + '%', d = G.dirt[hk] || 0;
      if (tn >= 2) return { k: 'tun', t: '🕳️ Scappa dal tunnel!' + seen(), on: true };
      if (c.dg) return { k: 'undig', t: '⛏️ Scavi… ' + pc + ' · tocca per smettere', on: true };
      if (closed(G) && inCell(c, hk)) {
        if (!pk(c).includes('cu')) return { k: 'x', t: '⛏️ Per scavare serve il 🥄 cucchiaio', on: false };
        if (d >= DIRT_MAX) return { k: 'x', t: '🟫 Troppa terra in cella: di giorno portala nell\'orto', on: false };
        if (tn >= tunCap(G)) return { k: 'x', t: '⛏️ Tunnel ' + pc + ' · basta per stanotte', on: false };
        return { k: 'dig', t: '⛏️ Scava il tunnel · ' + pc, on: true };
      }
      if (d > 0 && pk(c).length < POCK) return { k: 'soil', t: '🟫 Prendi un sacco di terra (' + d + ')', on: true };
      if (tn > 0 && !closed(G)) return { k: 'x', t: '🕳️ Tunnel ' + pc + ' · si scava di notte', on: false };
    }
    if (c.spy && !c.out) { const g = nearGuard(G, P(c).x, P(c).y); if (g && Math.hypot(g.x - P(c).x, g.y - P(c).y) < 2.6 && floorOf(g.x) === floorOf(P(c).x)) return G.time > (c.spT || 0) ? { k: 'snitch', t: '🐀 Fai una soffiata alla guardia', on: true } : { k: 'x', t: '🐀 Prossima soffiata tra ' + Math.ceil(c.spT - G.time) + ' s', on: false }; }
    if (camPh(G).ph === 2 && near(c, DOORP, 1.3)) return { k: 'hideT', t: '🚚 Nasconditi nel camion' + seen(), on: true };
    if (near(c, MDP, 1.1) && !G.mdO && !closed(G)) return pk(c).includes('ca') ? { k: 'unscrew', t: '🪛 Svita la porta del carico' + seen(), on: true } : { k: 'x', t: '🔒 Porta del carico: serve il 🪛 cacciavite', on: false };
    if (near(c, GATEP, 1.4) && c.dv) return pk(c).includes('te') ? { k: 'gate', t: '🪪 Mostra il tesserino ed esci', on: true } : { k: 'x', t: '🪪 Al cancello serve il tesserino', on: false };
    if (ropeNear(G, c) >= 0) return { k: 'climbR', t: '🧗 Arrampicati sulla corda' + seen(), on: true };
    if (fenceAt(c)) return { k: 'fence', t: '🧗 Scavalca la rete' + seen(), on: true };
    if (pk(c).includes('tr') && inOrto(c)) return { k: 'dump', t: '🟫 Spargi la terra nell\'orto' + seen(), on: true };
    const h = stNear(c); if (h >= 0) { const S = MP().stash[h], n = (G.st[h] || []).length; return { k: 'stash', h, t: S.i + ' Nascondiglio' + (n ? ' · ' + n + '/' + ST_N : '') + seen(), on: true }; }
    const i = srcNear(c); if (i >= 0 && srcOn(G, i)) return pk(c).length >= POCK ? { k: 'full', t: '🎒 Tasche piene: nascondi qualcosa', on: false } : { k: 'steal', i, t: '✋ Ruba ' + itx(SRC[i].k) + seen(), on: true };
    if (pk(c).includes('di') && !c.dv) return { k: 'wear', t: '👔 Indossa la divisa' + seen(), on: true };
    if (inCell(c) && !c.dm && pk(c).includes('st') && !ricOn(G, c)) return { k: 'dummy', t: '🧸 Fai il fantoccio nel letto (usa 🧻)', on: true };
    if (closed(G) && inCell(c) && !ricOn(G, c)) return c.zz ? { k: 'wake', t: '💤 Dormi… (tocca per svegliarti)', on: true } : { k: 'sleep', t: '💤 Dormi fino all\'alba', on: true };
    return null;
  }
  function doAct(G, c, a) {
    if (!c || !a || G.phase !== 'play' || !c.alive || isoOn(G, c)) return;
    if (a.k === 'put' || a.k === 'take') { stashMove(G, c, a); return; }
    const cur = action(G, c); if (!cur || cur.k !== a.k || !cur.on) return;
    if (a.k === 'sleep') { c.zz = 1; c.zx = P(c).x; c.zy = P(c).y; }
    if (a.k === 'wake') c.zz = 0;
    if (a.k === 'steal') { const s = SRC[cur.i], gd = seenBy(G, c); pk(c).push(s.k); G.src[cur.i] = G.time + RESP_T; c.stN = (c.stN || 0) + 1; say(G, 'steal', { a: c.id, it: s.k, s: gd ? 1 : 0 }); if (gd) caughtAct(G, gd, c); }
    if (a.k === 'dummy') { c.pk.splice(c.pk.indexOf('st'), 1); c.dm = 1; say(G, 'dummy', { a: c.id }); }
    const gd = () => seenBy(G, c), M = MP(), rm = k => { const j = c.pk.indexOf(k); if (j >= 0) c.pk.splice(j, 1); };
    if (a.k === 'tun') { const k = holeNear(c); escapeC(G, c, 'tun', M.cells[k].exit[0], M.cells[k].exit[1], { k }); }
    if (a.k === 'dig') { c.dg = holeNear(c) + 1; c.zz = 0; c.nT = 0; }
    if (a.k === 'undig') c.dg = 0;
    if (a.k === 'soil') { const k = holeNear(c); G.dirt[k]--; c.pk.push('tr'); }
    if (a.k === 'dump') { rm('tr'); const g = gd(); say(G, 'dump', { a: c.id }); if (g) { gsay(G, g, 'Che ci fai con tutta quella terra?'); caughtAct(G, g, c); } }
    if (a.k === 'hideT') { const g = gd(); if (g) { gsay(G, g, 'Ehi! Giù dal camion!'); caughtAct(G, g, c); return; } c.inT = 1; c.path = []; say(G, 'inT', { a: c.id });
      for (const b of G.chars) if (b.bot && b.ld === c.id && !b.out && !b.inT && !isoOn(G, b) && Math.hypot(b.x - c.x, b.y - c.y) < 3.2) { b.inT = 1; b.path = []; } }
    if (a.k === 'outT') c.inT = 0;
    if (a.k === 'snitch') { c.spT = G.time + SPY_CD; snitch(G, c, nearGuard(G, P(c).x, P(c).y)); }
    if (a.k === 'unscrew') { G.mdO = 1; GD.noise(G, 72, 40.5, 6); GD.anomaly(G, 72.5, 40.5, 'door'); say(G, 'mdoor', { a: c.id }); const g = gd(); if (g) caughtAct(G, g, c); }
    if (a.k === 'gate') { rm('te'); const g = G.gd.find(o => o.route === M.routes.ingresso.route); gsay(G, g, rnd(['Buon lavoro, collega!', 'Tutto tranquillo? Ciao!', 'Porti il detenuto in tribunale? Vai pure'])); escapeC(G, c, 'div', 71.5, 73.5); }
    if (a.k === 'rope') { const r = ropeAt(c); if (r) { rm('le'); r.e = G.time + ROPE_T; G.rope.push(r); (G.gan = G.gan || []).push({ x: r.ix, y: r.iy, k: 'src', t: G.time, n: 0, rope: 1 }); say(G, 'rope', { a: c.id, x: r.ix, y: r.iy }); } }
    if (a.k === 'climbR') { c.cl = G.time + CL_T; c.clR = ropeNear(G, c); c.path = []; const g = gd(); if (g) caughtAct(G, g, c); }
    if (a.k === 'fence') { const q = fenceAt(c), g = gd(); if (q) { c.relN = (c.relN || 0) + 1; c.rel = q; if (c.bot || c === G.me) { c.x = q[0]; c.y = q[1]; if (c === G.me) { cq.x = q[0]; cq.y = q[1]; G.myRel = c.relN; } } thud(0.3, 240); } if (g) caughtAct(G, g, c);
      // i compagni del computer che lo seguono scavalcano con lui
      for (const b of G.chars) if (b.bot && b.ld === c.id && !b.out && !isoOn(G, b) && Math.hypot(b.x - c.x, b.y - c.y) < 3.5 && q) { const fb = fenceAt(b); if (fb) { b.x = fb[0]; b.y = fb[1]; b.path = []; } } }
    if (a.k === 'wear') { rm('di'); c.dv = 1; say(G, 'wear', { a: c.id }); const g = gd(); if (g) { gsay(G, g, 'Ehi, quella divisa non è tua!'); caughtAct(G, g, c); } }
  }
  // ---- DETENUTI DEL COMPUTER ----
  function go(G, c, x, y) {
    let tx = x, ty = y; if (!cqCellFree(Math.floor(tx), Math.floor(ty))) { const q = cqSpot(Math.floor(tx), Math.floor(ty)); tx = q.x; ty = q.y; }
    c.path = route(c.x, c.y, tx, ty); c.gx = tx; c.gy = ty; return c.path.length > 0 || Math.hypot(c.x - tx, c.y - ty) < 0.7;
  }
  function botT(G, c, dt) {
    if (isoOn(G, c) || c.inT || c.cl) { c.path = []; c.walk = 0; return; }
    if (c.out) { if ((c.think -= dt) <= 0) { c.think = 3 + Math.random() * 4; if (Math.random() < 0.4) { const a = Math.random() * 7; go(G, c, c.x + Math.cos(a) * 1.5, c.y + Math.sin(a) * 1.5); } } cqModeStep(c, dt, 0.5); return; }
    if ((c.think -= dt) <= 0) {
      c.think = 0.4 + Math.random() * 0.3;
      const ph = phase(G), L = byId(G, c.ld), M = MP(); let tg = null;
      const follow = L && !L.out && !isoOn(G, L) && (illegal(G, L) || L.dv || L.inT || L.cl || L.dg);
      // fuori c'e' gia' il mio compagno: un tunnel finito (raggiungibile), una corda, il camion con la porta aperta
      let plan = null;
      if (L && L.out && !closed(G)) {
        const tk = M.pcells.find(k => (G.tun[k] || 0) >= 2 && !G.seal[k]); const cp = camPh(G);
        if (tk != null) plan = { p: M.cells[tk].hole, k: 'tun', tk };
        else if (cp.ph === 2 && G.mdO) plan = { p: DOORP, k: 'cam' };
      } else if (L && L.out && closed(G) && inCell(c)) { const tk = M.pcells.find(k => (G.tun[k] || 0) >= 2 && !G.seal[k] && inCell(c, k)); if (tk != null) plan = { p: M.cells[tk].hole, k: 'tun', tk }; }
      if (plan) { if (Math.hypot(c.x - plan.p[0], c.y - plan.p[1]) < 0.9) { if (plan.k === 'tun') { const C = M.cells[plan.tk]; escapeC(G, c, 'tun', C.exit[0], C.exit[1], { k: plan.tk, nf: 1 }); } else { c.inT = 1; c.path = []; } return; } tg = plan.p; }
      else if (follow) {
        // dietro al compagno (nel camion: dentro anche lui se il camion e' fermo)
        if (L.inT && camPh(G).ph === 2) { if (Math.hypot(c.x - DOORP[0], c.y - DOORP[1]) < 1) { c.inT = 1; c.path = []; return; } tg = DOORP; }
        else { const d = Math.hypot(c.x - L.x, c.y - L.y); tg = d > 1.3 ? [L.x - Math.cos(L.a || 0) * 0.8, L.y - Math.sin(L.a || 0) * 0.8] : null; if (!tg) c.path = []; c.think = 0.25; }
      }
      else if (ph === 'ap') { const s = mySpot(c); tg = [s[0], s[1]]; }
      else if (ph === 'rin' || ph === 'night') tg = cellOf(c).sp[c.slot];
      else if (pk(c).includes('tr')) {
        // COMPAGNO FURBO: porta la terra del tunnel nell'orto e la sparge quando nessuna guardia lo guarda
        const o = [14.5, 60.2]; if (inOrto(c) && Math.hypot(c.x - o[0], c.y - o[1]) < 1.2) { c.path = []; if (!seenBy(G, c)) doAct(G, c, { k: 'dump' }); } else tg = o;
      }
      else if ((G.dirt[c.cell] || 0) > 0 && !G.seal[c.cell] && pk(c).length < POCK && !(G.ps && G.ps.k === c.cell && G.ps.st === 1)) {
        const h = cellOf(c).hole; if (Math.hypot(c.x - h[0], c.y - h[1]) < 0.7) { c.path = []; doAct(G, c, { k: 'soil' }); } else tg = h;
      }
      else {
        // ora d'aria: un posto dove passare un po' di tempo (basket, pesi, panchine, mensa, tv...)
        if (!c.act || (c.actT || 0) < G.time) { const A = MP().acts, taken = new Set(G.chars.filter(o => o !== c && o.act).map(o => o.act.join())); let a = A[Math.floor(Math.random() * A.length)]; for (let i = 0; i < 6 && taken.has(a.join()); i++) a = A[Math.floor(Math.random() * A.length)]; c.act = a; c.actT = G.time + 14 + Math.random() * 22; }
        tg = c.act;
      }
      if (tg) { const d = Math.hypot(c.x - tg[0], c.y - tg[1]); if (d > 0.4 && (!c.path.length || Math.hypot((c.gx || 0) - tg[0], (c.gy || 0) - tg[1]) > 0.8)) go(G, c, tg[0], tg[1]); else if (d <= 0.4) c.path = []; }
      // di notte in cella: dorme (cosi' la notte puo' passare in fretta)
      c.zz = closed(G) && inCell(c) && !ricOn(G, c) && !follow ? 1 : 0;
    }
    cqModeStep(c, dt, MODE.speed(c));
  }
  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.lg = []; G.lgN = 0; G.alE = 0; G.pc = -1; G.spT = {}; G.ff = 0; G.myIso = 0; G.myRel = 0; G.cnt = null; G.PH = PHP;
    G.src = SRC.map(() => 0); G.st = MP().stash.map(() => []); G.stW = {}; G.ps = null; G.nc = null; G.stO = null; G.dmK = '';
    // perquisizioni: una il primo giorno, due il secondo (orari a caso durante l'ora d'aria)
    const r = (a, b) => a + Math.random() * (b - a); G.psL = [r(52, 98), DAY + r(48, 70), DAY + r(86, 104)];
    // vie di fuga: tunnel (progresso, a inizio notte, sacchi di terra, murati), camion (un orario a caso al giorno), porta del carico, corde
    G.tun = {}; G.tun0 = {}; G.digS = {}; G.dirt = {}; G.seal = {}; G.cam = null; G.camL = [r(58, 92), DAY + r(58, 92)]; G.mdO = 0; G.rope = []; G.hK = ''; G.tK = ''; G.myOut = 0;
  }
  // sbarre delle celle e cancello del cortile: chiusi di notte (su ogni telefono, dal tempo)
  function syncDoors(G) {
    const M = MP(), v = closed(G) ? 1 : 0;
    if (G.dC === v) return; G.dC = v;
    const D2 = []; for (const c of M.cells) for (const [x, y] of c.bars) D2.push([x, y, 'bars', { l: x === c.bars[0][0] }]);
    D2.push([25, 31, 'ygate', { l: 1 }], [26, 31, 'ygate', {}]);
    for (const [x, y, t, o] of D2) { cqSolid[y][x] = v ? { prop: t, o } : null; cqBgCell(x, y, 1); }
    if (v) {   // chi e' sulla soglia quando si chiude: dentro la sua cella se e' la sua, se no fuori
      const fix = (c, set) => { const p = P(c); if (cqFree(p.x, p.y)) return; const mine = cellOf(c), on = mine && mine.bars.some(([x, y]) => Math.floor(p.x) === x && Math.floor(p.y) === y), q = on ? mine.sp[c.slot] : (() => { const s = cqSpot(Math.floor(p.x), Math.floor(p.y)); return [s.x, s.y]; })(); set(q); };
      for (const c of G.chars) { if (c === G.me) fix(c, q => { cq.x = q[0]; cq.y = q[1]; }); else if (c.bot) fix(c, q => { c.x = q[0]; c.y = q[1]; }); }
    }
    if (G.time > 0.5) { const d = Math.min(...D2.map(q => Math.hypot(q[0] - cq.x, q[1] - cq.y))); thud(0.7 * Math.max(0.15, 1 - d / 20), 110); setTimeout(() => thud(0.4 * Math.max(0.1, 1 - d / 20), 90), 140); }
  }
  // buchi dei tunnel (deco 'hole'): si ridisegnano quando cambia il progresso, la terra o se e' murato
  function syncHoles(G) {
    const M = MP(), key = M.pcells.map(k => Math.ceil((G.tun[k] || 0) * 4) + ':' + (G.dirt[k] || 0) + ':' + (G.seal[k] ? 1 : 0)).join('|');
    if (key === G.hK) return; G.hK = key;
    for (const k of M.pcells) { const c = M.cells[k], [x, y] = c.ht; HST[x + ',' + y] = { p: Math.ceil((G.tun[k] || 0) * 4) / 4, d: G.dirt[k] || 0, s: G.seal[k] ? 1 : 0 }; cqBgCell(x, y, 1); }
  }
  // camion parcheggiato = caselle occupate; serranda e cancello aperti mentre passa; porta dell'officina aperta col cacciavite
  function syncTruck(G) {
    const ph = camPh(G).ph, key = ph + ':' + (G.mdO ? 1 : 0); if (key === G.tK) return; G.tK = key;
    for (let y = 39; y <= 41; y++) for (let x = 85; x <= 90; x++) { const cur = cqSolid[y][x]; if (ph === 2 && !cur) cqSolid[y][x] = { prop: 'tblk', o: {} }; if (ph !== 2 && cur && cur.prop === 'tblk') cqSolid[y][x] = null; }
    if (ph === 2) for (const c of G.chars) { if (c !== G.me && !c.bot) continue; const p = P(c); if (!cqFree(p.x, p.y)) { const q = cqSpot(Math.floor(p.x), Math.floor(p.y)); if (c === G.me) { cq.x = q.x; cq.y = q.y; } else { c.x = q.x; c.y = q.y; } } }
    const op = ph === 1 || ph === 3;
    for (const y of [39, 40, 41]) { cqSolid[y][91] = op ? null : { prop: 'shut', o: { v: 1 } }; cqSolid[y][95] = op ? null : { prop: 'tgate', o: { v: 1, l: y === 40 } }; cqBgCell(91, y, 1); cqBgCell(95, y, 1); }
    for (const y of [40, 41]) { cqSolid[y][72] = G.mdO ? null : { prop: 'mdoor', o: { v: 1, l: y === 41 } }; cqBgCell(72, y, 1); }
  }
  const DVL = { skin: 'guardia', col: '#4a5f8a', hat: 'nessuno' };
  const dvDraw = (g, X, Y, TW, L, w, f) => cqPlayer(g, X, Y, TW, DVL, w, f);
  // il camion si disegna a FETTE (una per casella lungo x): ogni fetta e' un "personaggio" del motore (riquadro stretto, giusto davanti/dietro alle persone)
  const TDR = [0, 1, 2, 3, 4, 5].map(i => {
    const dr = (g, X, Y, TW) => {
      const G = cq.g; if (!G) return; const bx0 = TRK[0] + camPh(G).sh, ax = bx0 + i + 0.5, ay = TRK[1] + 1.2, U = TW * 0.575, S = (x, y, z) => [(x - y) * TW / 2, (x + y) * TW / 4 - z * U];
      const a = bx0 + i, b = a + 1, y0 = TRK[1] - 0.15, y1 = TRK[1] + 2.55, z = 2.5;
      g.save(); g.translate(X - (ax - ay) * TW / 2, Y - (ax + ay) * TW / 4); g.beginPath();
      for (const q of [[S(a, y0, z), S(b, y0, z), S(b, y1, z), S(a, y1, z)], [S(a, y1, z), S(b, y1, z), S(b, y1, 0), S(a, y1, 0)], [S(b, y1, z), S(b, y0, z), S(b, y0, 0), S(b, y1, 0)]]) { g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); }
      g.clip(); cqTools(g, TW).prop('ltruck', bx0, TRK[1]); g.restore();
    };
    dr.top = 3; return dr;
  });

  // PASSAGGI DA PRESIDIARE (allarme di squadra): uscite del braccio, del cortile, scale, cancello
  function chokes(G, x, y) {
    const f = floorOf(x), L = f === 0 ? [[48.5, 19.5], [48.5, 45.5], [25.5, 31.5], [45.5, 13.5], [51.5, 50.5], [71.5, 66.5], [72.5, 40.5]] : [[O1 + 45.5, 13.5], [O1 + 58.5, 57.5]];
    return L.map(p => [p, Math.hypot(p[0] - x, p[1] - y)]).filter(q => q[1] > 3).sort((a, b) => a[1] - b[1]).map(q => q[0]);
  }
  const rangeAt = (G, x, y) => { const dk = dark(G); if (dk < 0.5) return DAY_R; return litAt(x, y) ? LIT_R : DARK_R; };
  const scrA = a => { const c = Math.cos(a), s = Math.sin(a); return Math.atan2((c + s) / 2, c - s); };
  const env = G => { const E = { thieves: G.chars.filter(c => illegal(G, c)), pos: P, vis: c => c.bot ? 0.65 : 1,
    range: (x, y) => rangeAt(G, x, y), alert: alertOn(G), k: G.opt.dif === 'f' ? 0.8 : G.opt.dif === 'd' ? 1.25 : 1, speed: 1,
    hides: MP().stash.filter(h => h.cell == null), hiddenAt: i => stashChecked(G, i), same: (x1, y1, x2, y2) => floorOf(x1) === floorOf(x2),
    chokes: (x, y) => chokes(G, x, y), onNotice: (gd, an) => { if (an.rope) { G.rope = G.rope.filter(r => Math.hypot(r.ix - an.x, r.iy - an.y) > 0.1); gsay(G, gd, 'Una CORDA?! Qualcuno è scappato!'); say(G, 'ropegone', {}); G.alE = Math.max(G.alE || 0, G.time + ALERT_T); } else say(G, 'notice', { x: an.x }); },
    onCatch: (gd, c) => catchT(G, gd, c), onKo: () => {},
    onChase: (gd, c) => { GD.alarm(G, gd, E); say(G, 'chase', { a: c.id }); } };
  return E; };
  // riflettore: dove cade la sua luce adesso
  const spotPos = (G, s) => { const a = G.time * 2 * Math.PI / s.per + s.ph; return [s.cx + s.rx * Math.cos(a), s.cy + s.ry * Math.sin(a * 1.31)]; };
  const MODE = CQ_MODES.evasione = {
    n: 'Evasione',
    desc: '🔒 Detenuti nel carcere di Rocca Nera: di giorno a vista, appelli e ronde; di notte si prepara la fuga. Dovete scappare tutti.',
    maps: [['carcere', 'Carcere di Rocca Nera']],
    def: { dif: 'n', map: 'carcere', n: 4, fill: true, spy: 0 },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],
    opts: o => `<details class="row evHow"><summary><b>📖 Come si gioca</b> (tocca per leggere)</summary>${helpHtml()}</details>
      <div class="row"><div class="lbl">Guardie</div>${seg('dif', [['f', 'Facili'], ['n', 'Normali'], ['d', 'Difficili']], o.dif || 'n')}</div>
      <div class="row"><div class="lbl">Spia</div>${seg('spy', [['0', 'Nessuna'], ['1', '🐀 Una spia']], String(o.spy || 0))}</div><div class="hint">Con la spia: uno di voi (a caso, segreto) lavora per il direttore e fa soffiate alle guardie. Vince se qualcuno resta dentro. Da 3 detenuti in su.</div><div class="hint">Due giorni e due notti (circa 8 minuti). In due le guardie sono meno.</div>`,
    read: d => ({ dif: d.get('dif') || 'n', spy: d.get('spy') === '1' ? 1 : 0 }),
    start(G) {
      cq.mapDirty = true; cqUseMap('carcere');
      const M = MP(), R = M.routes, dif = G.opt.dif || 'n';
      const nl = G.chars.length, ng = Math.min(8, { f: 5, n: 6, d: 8 }[dif] - (nl <= 2 ? 1 : 0));
      const list = ['braccio', 'cortile', 'centro', 'servizio', 'ingresso', 'ronda', 'isolamento', 'uffici'].slice(0, ng);
      GD.pathFn = route;
      G.gd = GD.make(list.map(k => R[k])); G.gd.forEach(g => { if (!g.post) { g.ri = Math.floor(Math.random() * g.route.length); const w = g.route[g.ri]; g.x = w[0]; g.y = w[1]; g.a = w[3] || 0; } });
      setup(G);
      // nessun detenuto del computer vestito da guardia (si confonderebbe con quelle vere)
      const sk = Object.keys(CQ_SKINS).filter(k => k !== 'guardia' && k !== 'omino' && !G.chars.some(c => c.look && c.look.skin === k));
      for (const c of G.chars) if (c.bot && c.look && c.look.skin === 'guardia') { const k = sk.shift(); c.look = k ? { skin: k, col: CQ_SKINS[k].col, hat: 'nessuno' } : { skin: 'omino', col: '#e8742a', hat: 'nessuno' }; }
      // celle a due a due, numeri di matricola = posto dell'appello
      const order = G.chars.slice().sort(() => Math.random() - 0.5);
      order.forEach((c, i) => { const k = M.pcells[Math.floor(i / 2) % M.pcells.length], s = M.cells[k].sp[i % 2]; Object.assign(c, { cell: k, slot: i % 2, no: i + 1, x: s[0], y: s[1], iso: 0, ric: 0, isoN: 0, miss: 0, zz: 0, pk: [], dm: 0, stN: 0, out: '', seen: 0, dv: 0, inT: 0, cl: 0, dg: 0, ld: -1, path: [], think: Math.random(), dname: 'N°' + (i + 1) + ' ' + c.name }); });
      cq.x = G.me.x; cq.y = G.me.y; G.myF = null;
      // ogni detenuto del computer si aggancia a un giocatore vero (prima il compagno di cella) e lo segue nella fuga
      const hum = G.chars.filter(c => !c.bot);
      for (const c of G.chars) if (c.bot) { const m = hum.find(h => h.cell === c.cell) || hum[c.no % Math.max(1, hum.length)]; c.ld = m ? m.id : -1; }
      // LA SPIA (se scelta): uno a caso, segreto; i computer la seguono come gli altri
      for (const c of G.chars) { c.spy = 0; c.spT = 0; }
      if (G.opt.spy && G.chars.length >= 3) { const sp = G.chars[Math.floor(Math.random() * G.chars.length)]; sp.spy = 1; sp.spT = SPY_CD * 0.6; }
    },
    gstart(G) { cq.mapDirty = true; cqUseMap('carcere'); GD.pathFn = route; setup(G); G.gd = []; G.ready = 0; },
    intro: G => G.me && G.me.spy ? '🐀 Sei la SPIA: fai fallire la fuga!' : '🔒 Rocca Nera, giorno 1: suona la campana dell\'appello!',
    speed(c) { const G = cq.g; if (!G || isoOn(G, c) || c.inT || c.cl) return 0; return 1; },
    hide: c => !!c.inT,
    draw: c => c.dv ? dvDraw : null,
    big(G) {
      const me = G.me; if (!G.ready && G.guest) return '';
      if (isoOn(G, me)) return '⛓️ Isolamento · esci tra ' + Math.ceil(me.iso - G.time) + ' s';
      if (me.out) { const n = G.chars.filter(c => !c.out).length; return n ? '🌲 Sei fuori! Mancano ' + n + (n > 1 ? ' compagni' : ' compagno') + (pk(me).includes('le') ? ': lancia la corda dal muro' : '') : '🎉 Tutti fuori!'; }
      if (me.inT) return '🚚 Nascosto nel camion: zitto e fermo…';
      if (me.cl) return '🧗 Su per la corda!';
      if (me.dg) return '⛏️ Scavi… se passa il secondino, smetti!';
      const ch = G.gd.find(g => g.st === 'chase' && g.tgt === me.id); if (ch) return '❗ Ti inseguono: fatti perdere di vista!';
      const t = cyc(G), ph = phase(G);
      if (ph === 'ap') { const end = t < AP1 ? AP1 : AP2; return onSpot(me) ? '✅ Sei al posto N° ' + me.no + ' · conta tra ' + Math.ceil(end - t) + ' s' : '📣 APPELLO! Corri al posto N° ' + me.no + ' in cortile · ' + Math.ceil(end - t) + ' s'; }
      if (ph === 'rin') return inCell(me) ? '✅ Sei in cella ' + cellOf(me).n + ' · le sbarre si chiudono tra ' + Math.ceil(CLOSE - t) + ' s' : '🛏️ Tutti in cella! Vai nella cella ' + cellOf(me).n + ' · ' + Math.ceil(CLOSE - t) + ' s';
      if (ricOn(G, me)) return '🚨 Sei ricercato: stai alla larga dalle guardie (' + Math.ceil(me.ric - G.time) + ' s)';
      if (G.ps && G.ps.st < 2 && G.ps.k === me.cell) return G.ps.st === 0 ? '🔎 Perquisizione nella tua cella tra ' + Math.max(0, Math.ceil(G.ps.t - G.time)) + ' s: svuota la piastrella!' : '🔎 Stanno perquisendo la tua cella!';
      if (G.ff) return '💤 Zzz… la notte passa';
      if (me.dv) return '👔 Travestito da guardia: le guardie ti riconoscono da vicino';
      { const cp = camPh(G); if (cp.ph === 2) return '🚚 Il camion è nel cortile di carico: riparte tra ' + Math.ceil(G.cam.T + CAM_T - G.time) + ' s'; }
      const p = P(me); if (!closed(G) && forbAt(p.x, p.y)) return '🚫 Zona vietata: se una guardia ti vede, ti insegue!';
      return '';
    },
    hud(G) {
      const me = G.me, t = cyc(G), ph = phase(G), nightNow = ph === 'night', d = dayN(G);
      const camN = G.cam && G.cam.st === 0 && ph === 'day' ? G.cam.T - G.time : 1e9;
      const next = ph === 'ap' ? '' : ph === 'day' ? (camN < AP2S - t ? '🚚 Camion tra ' + mmss(camN) : '📣 Appello tra ' + mmss(AP2S - t)) : ph === 'rin' ? '🛏️ Celle chiuse tra ' + mmss(CLOSE - t) : d >= NDAYS ? '🚌 Trasferimento all\'alba tra ' + mmss(DAY - t) : '🌅 Alba tra ' + mmss(DAY - t);
      return `<b style="color:${TC}">${me.spy ? '🐀' : '🔒'} N°${me.no || '?'}</b> · ${nightNow ? '🌙' : t >= DUSK0 ? '🌇' : '☀️'} Giorno ${d}/${NDAYS} · <b>${clock(G)}</b>` + (next ? ' · ' + next : '') + (alertOn(G) ? ' · <b style="color:#ff6a5a">🚨 ALLERTA</b>' : '');
    },
    nameCol: c => { const G = cq.g; return G && isoOn(G, c) ? '#9aa0a8' : G && ricOn(G, c) ? '#ff6a5a' : TC; },
    // guardie (comparse del gioco) e gli altri detenuti di Rocca Nera
    extras(G) {
      if (!G.gd) return [];
      const out = [];
      for (const g of G.gd) {
        if (!guardSeen(G, g)) continue;
        if (!g.__dr) { const gg = g; g.__dr = (cx, X, Y, TW) => guardDraw(cx, X, Y, TW, gg); g.__dr.top = 2.05; }
        out.push({ x: g.x, y: g.y, L: null, w: g.walk, f: 1, name: null, all: true, dr: g.__dr });
      }
      for (const e of comparse(G)) out.push(e);
      { const cp = camPh(G); if (cp.ph && Math.abs(87 - cq.x) < 30 && Math.abs(40 - cq.y) < 30 && floorOf(cq.x) === 0) for (let i = 0; i < 6; i++) out.push({ x: TRK[0] + cp.sh + i + 0.5, y: TRK[1] + 1.2, L: null, w: 0, f: 1, name: null, all: true, dr: TDR[i] }); }
      return out;
    },
    btn(G) { if (G.guest && !G.ready) return null; const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) { const me = G.me, a = action(G, me); if (!a || !a.on) return; if (a.k === 'stash') { stUI(G, a.h); return; } if (G.guest) { cqNetSend({ k: 'a', a: a.k }); if (a.k === 'sleep') me.zz = 1; if (a.k === 'wake') me.zz = 0; } else doAct(G, me, { k: a.k }); },
    ev(G, c, o) { if (o && o.k === 'a') doAct(G, c, { k: o.a, h: o.h, it: o.it }); },
    voice: (G, c) => null,   // voce di vicinanza (in cella si sente il compagno; urlare dall'altra parte del cortile no)
    local(G, dt) {
      const me = G.me; if (G.guest && !G.ready) return;
      syncDoors(G); syncComp(G); syncHoles(G); syncTruck(G);
      if (G.guest) GD.smooth(G, dt);
      // isolamento e rilascio: il mio personaggio si sposta sul mio telefono
      if (isoOn(G, me) && me.isoN !== G.myIso) { G.myIso = me.isoN; const s = MP().iso[me.isoC || 0]; if (s) { cq.x = s.x; cq.y = s.y; } cqCloseTask(); }
      if (me.relN && me.relN !== G.myRel && me.rel) { G.myRel = me.relN; cq.x = me.rel[0]; cq.y = me.rel[1]; }
      // SCALE: entrando nella casella della scala si cambia livello (si riattiva dopo 2 caselle dall'arrivo)
      if (!isoOn(G, me)) {
        if (G.tpL && Math.hypot(cq.x - G.tpL[0], cq.y - G.tpL[1]) > 2) G.tpL = null;
        const Pq = portalAt(cq.x, cq.y); if (Pq && !G.tpL) { const [x, y] = Pq.to(cq.x, cq.y); cq.x = x; cq.y = y; G.tpL = [x, y]; thud(0.35, 160); }
      }
      { const f = floorOf(cq.x); if (G.myF !== f) { if (G.myF != null) G.fade = performance.now(); G.myF = f; } }
      // nome della stanza quando ci entro (le zone vietate in rosso)
      { const r = roomAt(cq.x, cq.y); if (r >= 0 && r !== G.myR) { const R = MP().rooms[r]; if (!R.nl || R.f) { if (G.myRn !== R.n) { G.zn = { n: R.n, f: !!R.f && !(R.ala === 'I' && isoOn(G, me)) && !me.out, t: performance.now() }; G.myRn = R.n; } } G.myR = r; } }
      // campane, fischi e cancelli: ogni telefono li sente dal tempo
      { const t = cyc(G), pt = G.lt == null ? t : G.lt; G.lt = t; const cross = e => (pt < e && t >= e) || (pt - t > DAY / 2 && t >= e);   // (all'indietro solo a mezzanotte: le piccole correzioni dell'orologio non contano)
        if (cross(0.05) || cross(AP2S)) { bell(); if (pk(me).length && !isoOn(G, me)) setTimeout(() => cqToast("🎒 Hai roba in tasca: all'appello frugano a caso. Nascondila prima di andare al posto!"), 900); }
        if (cross(AP2)) whistle(); }
      // il pannello del nascondiglio si chiude se mi allontano; il fantoccio si vede nel letto
      if (G.stO != null && (stNear(me) !== G.stO || isoOn(G, me))) G.stO = null;
      stRender(G); syncDm(G);
      // battito del cuore: una guardia che mi sospetta o mi insegue, o vicina quando sono fuori posto
      G.hb = 0; const bad = illegal(G, me);
      for (const g of G.gd) { if (g.st === 'chase' && g.tgt === me.id) G.hb = 1; else if (g.st === 'sus' && Math.hypot(g.lx - cq.x, g.ly - cq.y) < 2.5) G.hb = Math.max(G.hb, 0.4 + 0.6 * g.sus); }
      if (bad) for (const g of G.gd) { if (g.st === 'ko' || floorOf(g.x) !== floorOf(cq.x)) continue; const d = Math.hypot(g.x - cq.x, g.y - cq.y); if (d < HB_R) G.hb = Math.max(G.hb, 0.2 + 0.4 * (1 - d / HB_R)); }
      if (G.hb > 0 && (G.hbT = (G.hbT || 0) - dt) <= 0) { G.hbT = 0.35 + 0.4 * (1 - G.hb); G.hbP = performance.now(); const v = 0.05 + 0.1 * G.hb; beep(58, 0.11, v, 0, 'sine'); beep(50, 0.12, v * 0.8, 0.15, 'sine'); }
      // passi delle guardie vicine
      for (const g of G.gd) { if (g.st === 'ko' || !g.walk || floorOf(g.x) !== floorOf(cq.x)) continue; const d = Math.hypot(g.x - cq.x, g.y - cq.y); if (d < 9 && (g.stT = (g.stT || 0) - dt) <= 0) { g.stT = g.st === 'chase' ? 0.26 : 0.5; thud(0.16 * (1 - d / 9), 300 + g.id * 20); } }
      // dormendo, se mi muovo mi sveglio
      if (me.zz && Math.hypot(cq.x - (me.zx || cq.x), cq.y - (me.zy || cq.y)) > 0.35) { me.zz = 0; if (G.guest) cqNetSend({ k: 'a', a: 'wake' }); }
      if (me.zz && me.zx == null) { me.zx = cq.x; me.zy = cq.y; }
      if (!me.zz) me.zx = me.zy = null;
    },
    tick(G, dt) {
      const M = MP(), t = cyc(G), pt = G.pc < 0 ? t : G.pc, E = env(G);
      G.pc = t; const cross = e => pt < e && t >= e;
      // APPELLO: alla fine della finestra conta chi c'e'
      if (cross(AP1) || cross(AP2)) {
        const miss = G.chars.filter(c => c.alive && !isoOn(G, c) && !onSpot(c) && !c.out);
        for (const c of G.chars) if (c.out && !c.seen) found(G, c);
        // PERQUISIZIONE A CAMPIONE: il capoguardia fruga le tasche di qualcuno dei presenti (di piu' con l'allerta)
        { const cg = G.gd.find(g => g.route === M.routes.cortile.route); let any = 0;
          for (const c of G.chars) if (c.alive && !isoOn(G, c) && onSpot(c) && pk(c).length && Math.random() < (alertOn(G) ? 0.5 : FR_P)) { any = 1; say(G, 'frisk', { a: c.id, it: c.pk.splice(0).join(',') }); }
          if (any) gsay(G, cg, rnd(PHF)); }
        for (const c of miss) { c.ric = G.time + RIC_T; c.miss = (c.miss || 0) + 1; say(G, 'miss', { a: c.id }); const p = P(c); let b = null, bd = 1e9; for (const g of G.gd) { if (g.post || g.st === 'ko') continue; const d = Math.hypot(g.x - p.x, g.y - p.y) + (floorOf(g.x) !== floorOf(p.x) ? 30 : 0); if (d < bd) { bd = d; b = g; } } if (b) GD.investigate(b, p.x, p.y, 'see'); }
        if (miss.length) G.alE = Math.max(G.alE || 0, G.time + ALERT_T); else say(G, 'allok', {});
        G.cnt = { t: G.time, n: miss.length };
      }
      // il capoguardia sul palco durante l'appello
      { const cg = G.gd.find(g => g.route === M.routes.cortile.route); if (cg && phase(G) === 'ap' && cg.st !== 'chase' && cg.st !== 'post' && cg.st !== 'srch') { GD.postAt(G, cg, 28.5, 49.6, 28.5, 52, (t < AP1 ? AP1 : AP2) - t + 1); } }
      // le sbarre si chiudono: chi non e' nella sua cella e' ricercato
      if (cross(CLOSE)) { G.mdO = 0; for (const k of M.pcells) G.tun0[k] = G.tun[k] || 0; }
      if (cross(CLOSE)) for (const c of G.chars) if (c.alive && !isoOn(G, c) && !inCell(c) && !c.out) { c.ric = G.time + RIC_T * 1.5; c.miss = (c.miss || 0) + 1; say(G, 'night', { a: c.id }); G.alE = Math.max(G.alE || 0, G.time + ALERT_T); }
      GD.tick(G, dt, E);
      for (const g of G.gd) npcTp(g);
      // RIFLETTORI (di notte): chi e' fuori posto nella pozza di luce viene notato
      if (dark(G) > 0.5) M.spotl.forEach((s, i) => {
        if ((G.spT[i] || 0) > G.time) return; const [sx, sy] = spotPos(G, s);
        const c = E.thieves.find(o => { const p = P(o); return floorOf(p.x) === 0 && Math.hypot(p.x - sx, p.y - sy) < 2.4; }); if (!c) return;
        G.spT[i] = G.time + SPOT_CD; const p = P(c); let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase' || g.post) continue; const d = Math.hypot(g.x - p.x, g.y - p.y) + (floorOf(g.x) ? 40 : 0); if (d < bd) { bd = d; b = g; } }
        if (b) { GD.investigate(b, p.x, p.y, 'cam'); GD.say(G, b, 'sus'); } say(G, 'spot', { a: c.id });
      });
      // fine dell'isolamento
      for (const c of G.chars) if (c.iso && c.iso <= G.time) release(G, c);
      // perquisizioni (annunciate prima) e controlli notturni delle celle
      if (G.psL.length && !G.ps && G.time >= G.psL[0] - PS_W) psStart(G, G.psL.shift());
      if (G.ps) psTick(G);
      if (NCK.some(cross) && !G.nc) ncStart(G);
      if (G.nc) ncTick(G);
      // vie di fuga: scavo, camion, corde (si arrampica e scappa; la corda dura ROPE_T s o finche' una guardia la vede)
      digTick(G, dt); camTick(G);
      for (const c of G.chars) if (c.cl && G.time >= c.cl) { const r = G.rope[c.clR] || G.rope[0]; c.cl = 0; if (r) escapeC(G, c, 'cor', r.ox, r.oy); }
      G.rope = G.rope.filter(r => r.e > G.time);
      // computer
      for (const c of G.chars) { if (!c.bot || !c.alive) continue; botT(G, c, dt); npcTp(c); }
      // VITTORIA: tutti fuori
      { const all = G.chars.filter(c => c.alive && !c.left && !c.spy); if (all.length && all.every(c => c.out)) { MODE.finish(G, 'win'); return; } }
      // la spia del computer fa una soffiata ogni tanto
      for (const c of G.chars) if (c.spy && c.bot && !c.out && !isoOn(G, c) && G.time > (c.spT || 0)) { c.spT = G.time + SPY_CD * (1 + Math.random() * 0.5); snitch(G, c, nearGuard(G, c.x, c.y, true)); }
      // DORMIRE: se tutti i giocatori veri sono a letto (in cella, di notte) la notte passa piu' in fretta
      { const hum = G.chars.filter(c => c.alive && !c.bot && !c.left && !isoOn(G, c) && !c.out), outH = G.chars.some(c => !c.bot && c.out);
        G.ff = closed(G) && t < DAY - 3 && (hum.length > 0 || outH) && hum.every(c => c.zz && inCell(c)) && !G.chars.some(c => ricOn(G, c) || c.dg || c.cl) ? 1 : 0;
        if (G.ff) G.time += dt * 6; }
      if (G.time >= NDAYS * DAY) MODE.finish(G, 'time');
    },
    finish(G, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— N°' + c.no + ' · ' + [c.stN ? '✋ ' + c.stN + (c.stN > 1 ? ' furti' : ' furto') : '', c.isoN ? '⛓️ isolamento ' + c.isoN + (c.isoN > 1 ? ' volte' : ' volta') : '😇 mai in isolamento', c.miss ? '🚨 ' + c.miss + ' appelli saltati' : ''].filter(Boolean).join(' · ')];
      const line2 = c => { const l = line(c); if (c.out) l[1] = '— ' + VIA[c.out][0] + ' scappato ' + VIA[c.out][1] + ' · ' + l[1].slice(2); return l; };
      const rank = G.chars.slice().sort((a, b) => (b.out ? 1 : 0) - (a.out ? 1 : 0) || (a.outT || 0) - (b.outT || 0) || ((a.isoN || 0) + (a.miss || 0)) - ((b.isoN || 0) + (b.miss || 0))).map(line2);
      const n = G.chars.filter(c => c.out).length;
      const spy = G.chars.find(c => c.spy), team = G.chars.filter(c => !c.spy), spyT = spy ? '<br>🐀 La spia era <b>N°' + spy.no + ' ' + esc(spy.name) + '</b>' + (spy.snN ? ' (' + spy.snN + (spy.snN > 1 ? ' soffiate' : ' soffiata') + ')' : '') + (why === 'win' ? ': non è bastato!' : ': missione compiuta, il direttore le regala un panettone.') : '';
      if (why === 'win') cqModeEnd({ t: '🎉 Evasi tutti!', why: 'Rocca Nera si sveglia e le celle sono vuote: ' + [...new Set(team.map(c => c.out).filter(Boolean))].map(v => VIA[v][0]).join(' ') + ' Il direttore sviene.' + spyT + funny(G, 1), win: team.map(c => c.id), rank });
      else cqModeEnd({ t: '🚌 Trasferiti!', why: 'All\'alba del terzo giorno arriva il furgone blindato' + (n ? ': ne sono scappati ' + n + ' su ' + team.length + ', ma dovevate scappare tutti. Chi è rimasto va a Rocca Nera 2.' : ': vi portano a Rocca Nera 2, massima sicurezza. Nessuno è evaso.') + spyT + funny(G, 0), win: spy ? [spy.id] : [], rank });
    },
    csnap: c => { const G = cq.g; return [Math.round(Math.max(0, (c.iso || 0) - G.time) * 10) / 10, Math.round(Math.max(0, (c.ric || 0) - G.time) * 10) / 10, c.cell, c.slot, c.no, c.zz ? 1 : 0, c.isoN || 0, c.isoC || 0, c.relN || 0, c.rel || 0, c.miss || 0, pk(c).join(','), c.dm ? 1 : 0, c.stN || 0, c.out || '', c.dv ? 1 : 0, c.inT ? 1 : 0, c.cl ? 1 : 0, c.dg || 0, c.seen ? 1 : 0, c.spy ? 1 : 0, Math.round(Math.max(0, (c.spT || 0) - G.time))]; },
    capply(G, c, a) {
      c.iso = a[0] > 0 ? G.time + a[0] : 0; c.ric = a[1] > 0 ? G.time + a[1] : 0; c.cell = a[2]; c.slot = a[3]; c.no = a[4]; if (c !== G.me) c.zz = a[5];
      c.isoN = a[6]; c.isoC = a[7]; c.relN = a[8]; c.rel = a[9] || null; c.miss = a[10]; c.pk = a[11] ? a[11].split(',') : []; c.dm = a[12]; c.stN = a[13]; c.out = a[14] || ''; c.dv = a[15]; c.inT = a[16]; c.cl = a[17]; c.dg = a[18]; c.seen = a[19]; c.spy = a[20]; c.spT = G.time + (a[21] || 0); if (c === G.me && c.spy && !G.spyT) { G.spyT = 1; setTimeout(() => cqToast('🐀 <b>Sei la SPIA</b>: lavori per il direttore. Vicino a una guardia fai una soffiata (ogni ' + SPY_CD + ' s). Vinci se qualcuno resta dentro. Non farti scoprire!'), 1500); } c.dname = 'N°' + c.no + ' ' + c.name;
      if (c === G.me && !G.ready) { G.ready = 1; G.myIso = c.isoN; G.myRel = c.relN; }
    },
    snap(G) { const r = v => Math.round(v * 10) / 10; return { gd: GD.snap(G), lg: G.lg, al: r(Math.max(0, G.alE - G.time)), ff: G.ff, cnt: G.cnt ? [r(G.time - G.cnt.t), G.cnt.n] : null,
      src: G.src.map(t => r(Math.max(0, t - G.time))), st: G.st, ps: G.ps ? [G.ps.k, G.ps.h, r(G.ps.t - G.time), G.ps.st] : null,
      tun: G.tun, dirt: G.dirt, seal: G.seal, mdO: G.mdO, cam: G.cam ? [r(G.cam.T - G.time), G.cam.st] : null, rope: G.rope.map(q => [q.ix, q.iy, q.ox, q.oy, r(q.e - G.time)]) }; },
    apply(G, x) {
      if (!G.gd.length) G.gd = x.gd.map((v, id) => ({ id, x: v[0], y: v[1], a: v[2], st: 'pat', sus: 0, walk: 0, route: [], path: [] }));
      GD.apply(G, x.gd); G.alE = x.al > 0 ? G.time + x.al : 0; G.ff = x.ff; G.cnt = x.cnt ? { t: G.time - x.cnt[0], n: x.cnt[1] } : null;
      if (x.src) G.src = x.src.map(v => G.time + v); if (x.st) G.st = x.st; G.ps = x.ps ? { k: x.ps[0], h: x.ps[1], t: G.time + x.ps[2], st: x.ps[3] } : null;
      if (x.tun) { G.tun = x.tun; G.dirt = x.dirt; G.seal = x.seal; G.mdO = x.mdO; G.cam = x.cam ? { T: G.time + x.cam[0], st: x.cam[1] } : null; G.rope = (x.rope || []).map(q => ({ ix: q[0], iy: q[1], ox: q[2], oy: q[3], e: G.time + q[4] })); }
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // NOTTE: lampade, torce delle guardie, riflettori; di giorno luce dappertutto (si vede solo il proprio livello)
    night(G) {
      const mf = floorOf(cq.x), dk = dark(G), see = x => floorOf(x) === mf;
      if (dk <= 0.02) return { a: 0, r: 0, lights: [], see };
      const M = MP(), near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k && floorOf(x) === mf, lights = [[cq.x, cq.y, MY_R, 0.72]];
      for (const [x, y] of M.lamps) if (near(x, y, 18)) lights.push([x, y, 2.3, 0.78]);
      for (const g of G.gd) if (near(g.x, g.y, 20)) { lights.push([g.x, g.y, 1.0, 0.6]); if (g.st !== 'ko') lights.push([g.x, g.y, DARK_R * 1.05, 0.72, scrA(g.a), GD.HALF]); }
      if (dk > 0.4 && mf === 0) for (const s of M.spotl) { const [x, y] = spotPos(G, s); if (near(x, y, 22)) lights.push([x, y, 2.6, 0.92]); }
      for (const c of G.chars) if (c !== G.me && c.alive && near(c.x, c.y, 16)) lights.push([c.x, c.y, 0.9, 0.4]);
      return { a: 0.93 * dk, r: MY_R, lights, see };
    },
    deco(g, c, X, Y, TW, G) {
      if (c.zz && closed(G)) { const t = performance.now() / 700 + c.id; g.font = '700 ' + Math.round(TW * 0.3) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(220,230,255,.85)'; for (let i = 0; i < 2; i++) { const k = (t + i * 0.5) % 1; g.globalAlpha = 1 - k; g.fillText('z', X + TW * (0.3 + k * 0.3), Y - TW * (1.8 + k * 0.7)); } g.globalAlpha = 1; }
    },
    over(g, G, sx, sy, TW) {
      if (G.guest && !G.ready) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, M = MP(), now = performance.now() / 1000, mf = floorOf(cq.x), dk = dark(G), near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r && floorOf(x) === mf, U = TW * 0.575;
      const wedge = (pts, col, line) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(sx(x, y), sy(x, y)) : g.moveTo(sx(x, y), sy(x, y))); g.closePath(); g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = 1.5; g.stroke(); } };
      // RIFLETTORI: il fascio dalla torretta alla pozza di luce
      if (dk > 0.3 && mf === 0) for (const s of M.spotl) {
        const [x, y] = spotPos(G, s); if (!near(x, y, 26) && !near(s.t[0], s.t[1], 26)) continue;
        const X0 = sx(s.t[0] - 0.5, s.t[1] - 0.5), Y0 = sy(s.t[0] - 0.5, s.t[1] - 0.5) - 4.8 * U, X1 = sx(x, y), Y1 = sy(x, y), r = TW * 1.3, a = (dk - 0.3) / 0.7;
        const dx = X1 - X0, dy = Y1 - Y0, m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m;
        g.fillStyle = 'rgba(255,250,215,' + (0.09 * a) + ')'; g.beginPath(); g.moveTo(X0 + nx * 3, Y0 + ny * 3); g.lineTo(X1 + nx * r, Y1 + ny * r * 0.5); g.lineTo(X1 - nx * r, Y1 - ny * r * 0.5); g.lineTo(X0 - nx * 3, Y0 - ny * 3); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,250,215,' + (0.25 * a) + ')'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(X1, Y1, TW * 1.65, TW * 0.82, 0, 0, 7); g.stroke();
      }
      // REFURTIVA da rubare (luccica), NASCONDIGLI (con quante cose ci sono dentro), la cella da PERQUISIRE
      if (mf === 0 && !isoOn(G, me)) {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        SRC.forEach((s, i) => {
          if (!srcOn(G, i) || !near(s.x, s.y, 11)) return; const d = Math.hypot(s.x - cq.x, s.y - cq.y); if (dk > 0.5 && !litAt(s.x, s.y) && d > 3) return;
          const X = sx(s.x, s.y), Y = sy(s.x, s.y) - TW * (0.9 + 0.07 * Math.sin(now * 3 + i)), k = (now * 0.8 + i * 0.3) % 1;
          g.globalAlpha = dk > 0.5 ? 0.7 : 1; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx(s.x, s.y), sy(s.x, s.y), TW * 0.16, TW * 0.08, 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(255,236,150,' + (0.8 * (1 - k)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, TW * (0.2 + 0.2 * k), 0, 7); g.stroke();
          g.font = Math.round(TW * 0.5) + 'px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(IT[s.k][0], X, Y);
          g.fillStyle = '#ffe9a0'; g.font = Math.round(TW * 0.17) + 'px system-ui'; g.fillText('✦', X + TW * 0.24 * Math.cos(now * 2 + i), Y - TW * 0.2 * Math.sin(now * 2 + i)); g.globalAlpha = 1;
        });
        M.stash.forEach((h, i) => {
          const x = h.x + 0.5, y = h.y + 0.5; if (!near(x, y, 8)) return; const n = (G.st[i] || []).length, X = sx(x, y), Y = sy(x, y) - TW * 0.45;
          g.globalAlpha = n ? 0.95 : 0.55; g.font = Math.round(TW * 0.3) + 'px system-ui,sans-serif'; g.fillText(h.i, X, Y);
          if (n) { g.fillStyle = '#e8742a'; g.beginPath(); g.arc(X + TW * 0.2, Y - TW * 0.14, TW * 0.11, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '800 ' + Math.round(TW * 0.15) + 'px system-ui,sans-serif'; g.fillText(n, X + TW * 0.2, Y - TW * 0.135); }
          g.globalAlpha = 1;
        });
        if (G.ps && G.ps.st < 2) { const c = M.cells[G.ps.k], x = c.x0 + 2, y = c.y0 + 2; if (near(x, y, 24)) { const X = sx(x, y), Y = sy(x, y) - TW * (2.6 + 0.12 * Math.sin(now * 4)), tx = '🔎 PERQUISIZIONE' + (G.ps.st === 0 ? ' · ' + Math.max(0, Math.ceil(G.ps.t - G.time)) + ' s' : ''); g.font = '800 12px system-ui,sans-serif'; const w = g.measureText(tx).width + 18; g.fillStyle = 'rgba(150,30,30,.9)'; cqRR(g, X - w / 2, Y - 12, w, 24, 9); g.fill(); g.fillStyle = '#fff'; g.fillText(tx, X, Y); } }
      }
      // LE VIE DI FUGA: corde sul muro, segnali dove si fa qualcosa (porta del carico, camion, cancello, tunnel finito), scavo in corso
      if (mf === 0) {
        for (const r of G.rope) { if (!near(r.ix, r.iy, 22)) continue; const a = [sx(r.ix, r.iy), sy(r.ix, r.iy)], b = [sx(r.ox, r.oy), sy(r.ox, r.oy)], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 3.4 * U, k = Math.min(1, (r.e - G.time) / 5);
          g.globalAlpha = k; g.strokeStyle = '#5a4a30'; g.lineWidth = Math.max(3, TW * 0.09); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(mx, my); g.lineTo(b[0], b[1]); g.stroke();
          g.strokeStyle = '#e8dcc0'; g.lineWidth = Math.max(2, TW * 0.05); g.stroke(); g.fillStyle = '#e8dcc0'; for (let i = 1; i < 5; i++) { const u = i / 5; g.beginPath(); g.arc(a[0] + (mx - a[0]) * u, a[1] + (my - a[1]) * u, TW * 0.05, 0, 7); g.fill(); } g.globalAlpha = 1; }
        const mark = (x, y, ico, col) => { if (!near(x, y, 14)) return; const X = sx(x, y), Y = sy(x, y), k = (now * 1.2) % 1; g.strokeStyle = col.replace('A', String(0.9 * (1 - k))); g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y, TW * (0.3 + 0.3 * k), TW * (0.15 + 0.15 * k), 0, 0, 7); g.stroke(); g.font = Math.round(TW * 0.34) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ico, X, Y - TW * (1.1 + 0.08 * Math.sin(now * 3))); };
        if (!me.out && !isoOn(G, me)) {
          const cp = camPh(G);
          if (cp.ph === 2) mark(DOORP[0], DOORP[1], '🚚', 'rgba(120,200,255,A)');
          if (!G.mdO && !closed(G) && (pk(me).includes('ca') || (G.cam && G.cam.st < 3))) mark(MDP[0], MDP[1], '🪛', 'rgba(255,210,90,A)');
          if (me.dv) mark(GATEP[0], GATEP[1], '🪪', 'rgba(255,210,90,A)');
          for (const r of G.rope) mark(r.ix, r.iy, '🧗', 'rgba(232,220,192,A)');
          for (const k of M.pcells) if ((G.tun[k] || 0) >= 2 && !G.seal[k]) { const h = M.cells[k].hole; mark(h[0], h[1], '🕳️', 'rgba(120,255,140,A)'); }
          { const k = M.cells[me.cell] && me.cell, h = M.cells[me.cell].hole, tn = G.tun[me.cell] || 0; if (k != null && !G.seal[k] && tn > 0 && tn < 2 && near(h[0], h[1], 6)) { const X = sx(h[0], h[1]), Y = sy(h[0], h[1]) - TW * 0.9, tx = '⛏️ ' + Math.floor(tn * 50) + '%' + ((G.dirt[k] || 0) ? ' · 🟫' + G.dirt[k] : ''); g.font = '800 11px system-ui,sans-serif'; const w = g.measureText(tx).width + 14; g.fillStyle = 'rgba(30,22,14,.85)'; cqRR(g, X - w / 2, Y - 10, w, 20, 8); g.fill(); g.fillStyle = '#f2dcb4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, X, Y); } }
        }
      }
      // CONI DI VISTA delle guardie (fermati dai muri): di giorno uno solo, di notte torcia forte + alone "se sei in luce"
      for (const gd of G.gd) {
        if (gd.st === 'ko' || !guardSeen(G, gd)) continue;
        const ak = alertOn(G) ? 1.22 : 1, ch = gd.st === 'chase', su = gd.sus > 0.05;
        if (dk < 0.5) { wedge(GD.cone(gd.x, gd.y, gd.a, DAY_R * ak), ch ? 'rgba(255,60,50,.2)' : su ? 'rgba(255,150,40,.18)' : 'rgba(255,236,150,.11)', ch ? 'rgba(255,80,60,.7)' : su ? 'rgba(255,170,60,.6)' : 'rgba(220,190,90,.38)'); continue; }
        wedge(GD.cone(gd.x, gd.y, gd.a, LIT_R * ak), ch ? 'rgba(255,60,50,.1)' : su ? 'rgba(255,150,40,.09)' : 'rgba(255,236,150,.06)', ch ? 'rgba(255,80,60,.35)' : su ? 'rgba(255,170,60,.3)' : 'rgba(255,236,150,.18)');
        wedge(GD.cone(gd.x, gd.y, gd.a, DARK_R * ak), ch ? 'rgba(255,60,50,.3)' : su ? 'rgba(255,150,40,.28)' : 'rgba(255,236,150,.2)', ch ? 'rgba(255,80,60,.75)' : su ? 'rgba(255,170,60,.65)' : 'rgba(255,236,150,.45)');
      }
      for (const gd of G.gd) if (guardSeen(G, gd)) GD.mark(g, gd, sx(gd.x, gd.y), sy(gd.x, gd.y), TW, 1.75);
      for (const gd of G.gd) if (gd.bub && guardSeen(G, gd) && near(gd.x, gd.y, 12)) GD.bubble(g, gd, sx(gd.x, gd.y), sy(gd.x, gd.y), TW, 2.15);
      const ph = phase(G);
      // APPELLO: il mio posto lampeggia e la freccia ci porta; RIENTRO: la mia cella
      if (!isoOn(G, me) && (ph === 'ap' || ph === 'rin')) {
        const tg = ph === 'ap' ? mySpot(me) : cellOf(me).sp[me.slot], ok = ph === 'ap' ? onSpot(me) : inCell(me);
        if (near(tg[0], tg[1], 18)) { const X = sx(tg[0], tg[1]), Y = sy(tg[0], tg[1]), k = (now * 1.4) % 1; g.strokeStyle = ok ? 'rgba(90,230,120,.9)' : 'rgba(255,210,70,' + (1 - k) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, TW * (0.4 + (ok ? 0 : k * 0.5)), TW * (0.2 + (ok ? 0 : k * 0.25)), 0, 0, 7); g.stroke(); }
        if (!ok) { const tw = toward(tg[0], tg[1]); SQ.edge(g, sx(tw.x, tw.y), sy(tw.x, tw.y) - TW, W2, H2, tw.p ? '🪜' : ph === 'ap' ? '📣' : '🛏️', ph === 'ap' ? '#e8a020' : '#5a8ad8'); }
      }
      // fine conta: risultato sopra il palco
      if (G.cnt && G.time - G.cnt.t < 5 && near(28, 48, 20)) { const X = sx(28.5, 48.5), Y = sy(28.5, 48.5) - TW * 3.2, a = Math.min(1, (5 - (G.time - G.cnt.t)) / 1); g.globalAlpha = a; g.fillStyle = G.cnt.n ? 'rgba(160,30,30,.9)' : 'rgba(30,110,60,.9)'; cqRR(g, X - 70, Y - 14, 140, 28, 10); g.fill(); g.fillStyle = '#fff'; g.font = '800 13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(G.cnt.n ? '🚨 Ne manca' + (G.cnt.n > 1 ? 'no ' + G.cnt.n : ' uno') + '!' : '✅ Tutti presenti', X, Y); g.globalAlpha = 1; }
      // allerta e battito
      if (alertOn(G)) { const a = 0.16 + 0.1 * Math.sin(now * 4); g.strokeStyle = 'rgba(255,40,40,' + a + ')'; g.lineWidth = 8; g.strokeRect(4, 4, W2 - 8, H2 - 8); }
      if (G.hb > 0) { const k = Math.max(0, 1 - (performance.now() - (G.hbP || 0)) / 380), a = 0.12 + 0.3 * G.hb * (0.5 + 0.5 * k); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.72); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(160,0,0,' + a + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
      // zona vietata: bordo rosso tratteggiato
      { const p = P(me); if (!isoOn(G, me) && !me.out && forbAt(p.x, p.y) && !closed(G)) { g.save(); g.setLineDash([14, 10]); g.lineDashOffset = -now * 30; g.strokeStyle = 'rgba(255,70,60,.55)'; g.lineWidth = 4; g.strokeRect(10, 10, W2 - 20, H2 - 20); g.restore(); } }
      // isolamento: buio e sbarre di luce dallo spioncino
      if (isoOn(G, me)) { g.fillStyle = 'rgba(6,6,8,.55)'; g.fillRect(0, 0, W2, H2); const k = Math.min(1, (me.iso - G.time) / ISO_T); g.fillStyle = 'rgba(10,10,14,.75)'; cqRR(g, W2 / 2 - 110, H2 * 0.62 - 20, 220, 40, 12); g.fill(); g.fillStyle = '#3a3e48'; cqRR(g, W2 / 2 - 90, H2 * 0.62 + 6, 180, 6, 3); g.fill(); g.fillStyle = '#e8a030'; cqRR(g, W2 / 2 - 90, H2 * 0.62 + 6, 180 * (1 - k), 6, 3); g.fill(); g.fillStyle = '#e8e0c8'; g.font = '700 13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛓️ Isolamento · ancora ' + Math.ceil(me.iso - G.time) + ' s', W2 / 2, H2 * 0.62 - 6); }
      // si dorme: la notte passa (schermo scuro e orologio)
      if (G.ff) { g.fillStyle = 'rgba(4,6,14,.5)'; g.fillRect(0, 0, W2, H2); g.fillStyle = 'rgba(10,12,20,.8)'; cqRR(g, W2 / 2 - 100, H2 * 0.4 - 26, 200, 52, 14); g.fill(); g.fillStyle = '#c8d4ff'; g.font = '800 22px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💤 ' + clock(G), W2 / 2, H2 * 0.4 - 4); g.font = '600 11px system-ui,sans-serif'; g.fillStyle = 'rgba(200,210,255,.75)'; g.fillText('la notte passa… muoviti per svegliarti', W2 / 2, H2 * 0.4 + 15); }
      // nome della stanza quando ci entro
      if (G.zn) { const t = performance.now() - G.zn.t; if (t < 2400) { const a = Math.min(1, t / 200, (2400 - t) / 500); g.globalAlpha = a; const tx = (G.zn.f ? '🚫 ' : '') + G.zn.n.toUpperCase() + (G.zn.f ? ' · VIETATO' : ''); g.font = '800 14px system-ui,sans-serif'; const w = g.measureText(tx).width + 28; g.fillStyle = G.zn.f ? 'rgba(120,20,20,.82)' : 'rgba(14,16,20,.72)'; cqRR(g, W2 / 2 - w / 2, H2 * 0.24 - 15, w, 30, 10); g.fill(); g.fillStyle = G.zn.f ? '#ffd0c8' : '#f2e6c8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, W2 / 2, H2 * 0.24); g.globalAlpha = 1; } else G.zn = null; }
      // cambio di livello: si arriva dal nero, col nome del livello
      if (G.fade) { const t = performance.now() - G.fade;
        if (t < 520) { g.fillStyle = 'rgba(4,4,6,' + (1 - t / 520) + ')'; g.fillRect(0, 0, W2, H2); }
        if (t < 1700) { const a = Math.min(1, (1700 - t) / 400); g.globalAlpha = a; g.fillStyle = 'rgba(10,10,14,.7)'; cqRR(g, W2 / 2 - 90, H2 * 0.3 - 22, 180, 44, 12); g.fill(); g.fillStyle = '#f2dca0'; g.font = '800 20px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((mf ? '⬆️ ' : '🏛️ ') + FLN[mf].toUpperCase(), W2 / 2, H2 * 0.3); g.globalAlpha = 1; } }
      // SEI FUORI! (per 3 s)
      if (me.out && !G.myOut) { G.myOut = performance.now(); }
      if (G.myOut) { const t = performance.now() - G.myOut; if (t < 3200) { const a = Math.min(1, t / 250, (3200 - t) / 600), v = VIA[me.out] || ['🌲', '']; g.globalAlpha = a; g.fillStyle = 'rgba(14,40,20,.86)'; cqRR(g, W2 / 2 - 140, H2 * 0.44 - 34, 280, 68, 16); g.fill(); g.strokeStyle = 'rgba(140,230,150,.7)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#c8ffd0'; g.font = '900 26px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v[0] + ' SEI FUORI!', W2 / 2, H2 * 0.44 - 8); g.font = '600 13px system-ui,sans-serif'; g.fillStyle = '#e8ffe8'; g.fillText('scappato ' + v[1], W2 / 2, H2 * 0.44 + 18); g.globalAlpha = 1; } }
      board(g, G); pocket(g, G); minimap(g, G, W2);
    }
  };
  // verso un punto, anche all'altro livello: la scala piu' vicina (p = passa da una scala)
  function toward(x, y) {
    const a = floorOf(cq.x), b = floorOf(x); if (a === b) return { x, y };
    let best = null, bd = 1e9;
    for (const Pq of MP().portals) { if (Pq.f !== a || Pq.tf !== b || Pq.k !== 'braccio') continue; const c = Pq.cells[1], d = Math.hypot(c[0] + 0.5 - cq.x, c[1] + 0.5 - cq.y); if (d < bd) { bd = d; best = c; } }
    return best ? { x: best[0] + 0.5, y: best[1] + 0.5, p: 1 } : { x, y };
  }
  function guardSeen(G, gd) { return Math.abs(gd.x - cq.x) < SEE_G && Math.abs(gd.y - cq.y) < SEE_G && floorOf(gd.x) === floorOf(cq.x); }
  const GLOOK = { skin: 'guardia', col: '#4a5f8a', hat: 'nessuno' };
  function guardDraw(g, X, Y, TW, gd) {
    const f = Math.cos(gd.a) - Math.sin(gd.a) >= 0 ? 1 : -1;
    if (gd.st !== 'ko') { cqPlayer(g, X, Y, TW, GLOOK, gd.walk, f); return; }
    g.save(); g.translate(X - f * TW * 0.55, Y - TW * 0.12); g.rotate(f * Math.PI / 2); cqPlayer(g, 0, 0, TW, GLOOK, 0, f, true); g.restore();
  }
  // suoni della giornata
  function bell() { for (let i = 0; i < 6; i++) { beep(880, 0.35, 0.05, i * 0.42, 'triangle'); beep(1320, 0.2, 0.02, i * 0.42 + 0.02, 'sine'); } }
  function whistle() { beep(2100, 0.25, 0.04, 0, 'sine'); beep(2400, 0.4, 0.04, 0.3, 'sine'); }

  // ---- LE TASCHE (sotto la giornata): due posti, piu' il fantoccio se e' pronto ----
  function pocket(g, G) {
    if (G.big) return;
    const Pk = pk(G.me), dm = !!G.me.dm, x0 = 62, y0 = 252, h = 42, w = 112 + (dm ? 30 : 0);
    g.save(); g.fillStyle = 'rgba(30,24,20,.84)'; cqRR(g, x0, y0, w, h, 10); g.fill(); g.strokeStyle = 'rgba(232,168,80,.4)'; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '18px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText('🎒', x0 + 18, y0 + h / 2);
    for (let i = 0; i < POCK; i++) { const bx0 = x0 + 36 + i * 37; g.fillStyle = Pk[i] ? 'rgba(255,190,110,.2)' : 'rgba(255,255,255,.07)'; cqRR(g, bx0, y0 + 5, 32, 32, 8); g.fill(); if (Pk[i]) { g.font = '20px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(IT[Pk[i]][0], bx0 + 16, y0 + 22); } }
    if (dm) { g.font = '16px system-ui,sans-serif'; g.fillText('🧸', x0 + w - 17, y0 + h / 2); }
    g.restore();
  }
  // ---- IL PANNELLO DEL NASCONDIGLIO: cosa ho in tasca e cosa c'e' dentro; un tocco sposta la cosa ----
  function stUI(G, h) { G.stO = h; G.stSig = ''; stRender(G); beep(420, 0.05, 0.02); }
  function stRender(G) {
    const el = document.getElementById('evSt'); if (!el) return;
    const h = G.stO; if (h == null || G.phase !== 'play') { if (!el.hidden) el.hidden = true; return; }
    const S = MP().stash[h], L = G.st[h] || [], Pk = pk(G.me), sig = h + '|' + L.join() + '|' + Pk.join();
    if (sig === G.stSig && !el.hidden) return; G.stSig = sig;
    const b = (a, k, dis) => '<button type="button" data-a="' + a + '" data-it="' + k + '"' + (dis ? ' disabled' : '') + '><i>' + IT[k][0] + '</i>' + IT[k][1] + '<span>' + (a === 'put' ? 'nascondi ⬇️' : 'prendi ⬆️') + '</span></button>';
    el.innerHTML = '<div class="t">' + S.i + ' ' + cap(S.n) + '</div>'
      + '<div class="s">🎒 In tasca · ' + Pk.length + '/' + POCK + '</div>' + (Pk.length ? Pk.map(k => b('put', k, L.length >= ST_N)).join('') : '<div class="e">Tasche vuote</div>')
      + '<div class="s">' + S.i + ' Nascosto qui · ' + L.length + '/' + ST_N + '</div>' + (L.length ? L.map(k => b('take', k, Pk.length >= POCK)).join('') : '<div class="e">Vuoto</div>')
      + '<div class="c">' + (S.cell != null ? 'Le perquisizioni lo trovano' : 'Le guardie a volte lo controllano') + ' · tocca qui per chiudere</div>';
    el.hidden = false;
  }
  function stClick(a, it) {
    const G = cq.g; if (!G || G.stO == null) return; const h = G.stO;
    if (G.guest) cqNetSend({ k: 'a', a, h, it }); else doAct(G, G.me, { k: a, h, it });
    beep(a === 'put' ? 520 : 760, 0.05, 0.025);
  }
  // il fantoccio nel letto: si ridisegna la branda quando cambia (su ogni telefono)
  function syncDm(G) {
    const M = MP(), key = G.chars.filter(c => c.dm).map(c => c.cell + ':' + c.slot).sort().join();
    if (key === G.dmK) return; G.dmK = key;
    for (const k of M.pcells) {
      const c = M.cells[k], x = c.x0, y = c.y0 === 9 ? 10 : 30, s = cqSolid[y] && cqSolid[y][x]; if (!s || s.prop !== 'bunk') continue;
      const dm = [0, 1].map(sl => G.chars.some(o => o.dm && o.cell === k && o.slot === sl) ? 1 : 0);
      cqSolid[y][x] = { prop: 'bunk', o: Object.assign({}, s.o, { dm: dm[0] || dm[1] ? dm : null }) }; cqBgCell(x, y, 0);
    }
  }

  // ---- GLI ALTRI DETENUTI (comparse: non giocano, rendono vivo il carcere). Di giorno nel cortile, in mensa, in galleria; di notte nelle celle del primo piano ----
  const CL = ['#e8742a', '#d8682a', '#c87a3a', '#8a8f98', '#e8742a', '#6a5a4a'];
  const CSK = ['omino', 'omino', 'procione', 'omino', 'bassotto', 'omino', 'pinguino', 'omino', 'gatto', 'omino', 'omino', 'polipo', 'omino', 'omino'];
  const CNM = ['Tonio', 'il Rosso', 'Gigi', 'Mascella', 'Baffo', 'Nino', 'il Prof', 'Carmine', 'Sciabola', 'Ruggero', 'Pallino', 'Lupo', 'Ettore', 'Zio'];
  // [x di giorno, y di giorno, cosa fa, verso] (cella di notte = una delle celle del primo piano)
  const CD = [[14.6, 38.2, 'ball', 1], [19.4, 40.8, 'ball', -1], [21.6, 37.6, 'ball', -1], [39.5, 34.5, 'lift', 1], [44.2, 36.4, 'dumb', -1], [15.2, 33.0, 'sit', 1], [16.6, 50.4, 'sit', 1], [16.6, 52.3, 'sit', -1],
    [12.2, 60.4, 'hoe', 1], [44.8, 61.0, 'talk', -1], [43.6, 61.6, 'talk', 1], [56.6, 13.4, 'eat', 1], [62.4, 16.4, 'eat', -1], [11.0, 18.0, 'tv', 1]];
  let compL = null;
  function compList() {
    if (compL) return compL;
    compL = CD.map((d, i) => { const k = CSK[i], col = CL[i % CL.length], up = i % 7, south = i >= 7; return { i, L: k === 'omino' ? { skin: 'omino', col, hat: ['nessuno', 'cuffie', 'cappellino', 'nessuno'][i % 4] } : { skin: k, col: (CQ_SKINS[k] || {}).col || col, hat: 'nessuno' }, name: CNM[i], dx: d[0], dy: d[1], a: d[2], f: d[3], nx: O1 + 9 + 5 * up + 0.5, ny: south ? 30.0 : 10.0 }; });
    return compL;
  }
  function syncComp() {}
  function comparse(G) {
    // la sera spariscono dal cortile e ricompaiono a letto con una dissolvenza (mai a scatti)
    const out = [], ct = cyc(G), night = ct >= AP2S + 1.5, t = performance.now() / 1000;
    compAl = night ? Math.min(1, (ct - AP2S - 1.5) / 1.5) : ct >= AP2S ? 1 - (ct - AP2S) / 1.5 : Math.min(1, ct / 1.5 + 0.01);
    for (const c of compList()) {
      const x = night ? c.nx : c.dx, y = night ? c.ny : c.dy; if (Math.abs(x - cq.x) > SEE_G || Math.abs(y - cq.y) > SEE_G || floorOf(x) !== floorOf(cq.x)) continue;
      if (!c.__dr) { const cc = c; c.__dr = (g, X, Y, TW) => compDraw(g, X, Y, TW, cc, cq.g); c.__dr.top = 1.95; }
      out.push({ x, y, L: c.L, w: 0, f: c.f, name: null, all: true, dr: c.__dr });
    }
    // il pallone che rimbalza tra i tre giocatori di basket
    if (!night && Math.abs(18 - cq.x) < SEE_G && Math.abs(39 - cq.y) < SEE_G && floorOf(cq.x) === 0) {
      const C = compList(), k = (t * 0.55) % 3, a = C[Math.floor(k)], b = C[(Math.floor(k) + 1) % 3], u = k % 1, x = a.dx + (b.dx - a.dx) * u, y = a.dy + (b.dy - a.dy) * u;
      if (!comparse.ball) { comparse.ball = (g, X, Y, TW) => { const t2 = (performance.now() / 1000 * 0.55) % 1, z = Math.abs(Math.sin(t2 * Math.PI * 2)) * 1.6 + 0.2; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, TW * 0.1, TW * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#e8742a'; g.beginPath(); g.arc(X, Y - z * TW * 0.575, TW * 0.09, 0, 7); g.fill(); g.strokeStyle = '#5a2a10'; g.lineWidth = 1; g.stroke(); }; comparse.ball.top = 1; }
      out.push({ x, y, L: null, w: 0, f: 1, name: null, all: true, dr: comparse.ball });
    }
    return out;
  }
  let compAl = 1;
  function compDraw(g, X, Y, TW, c, G) { if (compAl <= 0.01) return; g.save(); g.globalAlpha = compAl; compDraw0(g, X, Y, TW, c, G); g.restore(); }
  function compDraw0(g, X, Y, TW, c, G) {
    const night = G && cyc(G) >= AP2S + 1.5, t = performance.now() / 1000 + c.i;
    if (night) {   // dorme nella branda del primo piano
      g.save(); g.translate(X, Y - TW * 0.25); g.rotate(-1.35); cqPlayer(g, 0, 0, TW, c.L, 0, 1); g.restore();
      const k = (t * 0.4) % 1; g.globalAlpha = compAl * (1 - k); g.fillStyle = 'rgba(220,230,255,.9)'; g.font = '700 ' + Math.round(TW * 0.26) + 'px system-ui'; g.textAlign = 'center'; g.fillText('z', X + TW * (0.2 + k * 0.3), Y - TW * (1.1 + k * 0.6)); return;
    }
    if (c.a === 'sit' || c.a === 'eat' || c.a === 'tv') { cqPlayer(g, X, Y + TW * 0.12, TW, c.L, 0, c.f); if (c.a === 'eat' && Math.sin(t * 2) > 0.6) { g.fillStyle = '#c8a24a'; g.beginPath(); g.arc(X + c.f * TW * 0.2, Y - TW * 0.85, TW * 0.04, 0, 7); g.fill(); } return; }
    if (c.a === 'lift') { const k = (Math.sin(t * 2.2) + 1) / 2; cqPlayer(g, X, Y, TW, c.L, 0, c.f); g.strokeStyle = '#c8ccd2'; g.lineWidth = Math.max(2, TW / 18); const yy = Y - TW * (1.15 + 0.35 * k); g.beginPath(); g.moveTo(X - TW * 0.45, yy); g.lineTo(X + TW * 0.45, yy); g.stroke(); g.fillStyle = '#1a1a1e'; for (const s of [-1, 1]) { g.fillRect(X + s * TW * 0.45 - TW * 0.05, yy - TW * 0.12, TW * 0.1, TW * 0.24); } return; }
    if (c.a === 'dumb') { cqPlayer(g, X, Y, TW, c.L, 0, c.f); const k = (Math.sin(t * 3) + 1) / 2; g.fillStyle = '#1a1a1e'; g.fillRect(X + c.f * TW * 0.25 - TW * 0.07, Y - TW * (0.7 + 0.35 * k), TW * 0.14, TW * 0.08); return; }
    if (c.a === 'hoe') { cqPlayer(g, X, Y - Math.abs(Math.sin(t * 1.5)) * 2, TW, c.L, 0, c.f); g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(2, TW / 20); const k = Math.sin(t * 1.5); g.beginPath(); g.moveTo(X + c.f * TW * 0.2, Y - TW * 0.7); g.lineTo(X + c.f * TW * (0.5 + 0.1 * k), Y - TW * (0.05 + 0.1 * k)); g.stroke(); return; }
    if (c.a === 'ball') { cqPlayer(g, X, Y - Math.abs(Math.sin(t * 3)) * 3, TW, c.L, t * 3, c.f); return; }
    cqPlayer(g, X, Y, TW, c.L, 0, Math.sin(t * 0.7) > 0.8 ? -c.f : c.f);   // chiacchierano
  }

  // ---- LA GIORNATA (in alto a sinistra): orari, cosa si fa adesso; toccandola si apre "come si gioca" ----
  const AG = [['📣', '07:00', 'Appello', 0, AP1], ['🏀', '08:00', 'Ora d\'aria', AP1, AP2S], ['📣', '18:30', 'Appello', AP2S, AP2], ['🛏️', '19:30', 'In cella', AP2, CLOSE], ['🌙', '21:00', 'Notte', CLOSE, DAY]];
  function board(g, G) {
    if (G.big) return;
    const t = cyc(G), x0 = 10, y0 = 122, w = 158, lh = 19, h = 24 + AG.length * lh;
    g.save(); g.fillStyle = 'rgba(30,24,20,.84)'; cqRR(g, x0, y0, w, h, 10); g.fill(); g.strokeStyle = 'rgba(232,168,80,.4)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#f2dcb4'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('📋 GIORNO ' + dayN(G) + ' · ' + clock(G) + (G.cam && G.cam.st < 3 ? ' · 🚚 ' + clockAt(G.cam.T) : ''), x0 + 9, y0 + 13);
    AG.forEach((r, i) => {
      const y = y0 + 26 + i * lh + lh / 2 - 2, cur = t >= r[3] && t < r[4], past = t >= r[4];
      g.globalAlpha = cur ? 1 : past ? 0.45 : 0.75; if (cur) { g.fillStyle = 'rgba(255,170,70,.18)'; g.fillRect(x0 + 3, y - lh / 2 + 1, w - 6, lh - 2); }
      g.font = '12px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(r[0], x0 + 8, y); g.font = '600 10px system-ui,sans-serif'; g.fillStyle = '#c8b898'; g.fillText(r[1], x0 + 27, y); g.font = '600 11px system-ui,sans-serif'; g.fillStyle = '#f2e6d0'; g.fillText(r[2], x0 + 62, y);
      if (cur) { g.textAlign = 'right'; g.font = '700 11px system-ui,sans-serif'; g.fillStyle = TC; g.fillText(mmss(r[4] - t), x0 + w - 8, y); g.textAlign = 'left'; }
    });
    g.restore();
  }
  // ---- MAPPA: radar in alto a destra, grande toccandolo. Le zone vietate sono rosse ----
  const FREG = [[0, 0, 100, 78], [O1 + 8, 8, 84, 54]];
  function mapImg(f) {
    const M = MP(); M.mimg = M.mimg || []; if (M.mimg[f]) return M.mimg[f];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (floorOf(x) !== f) continue;
      const i = y * W + x, r = M.ROOM[i], fl = cqFloor[y] && cqFloor[y][x], s = cqSolid[y] && cqSolid[y][x];
      let col = null;
      if (fl) { const R = M.rooms[r >= 0 ? r : M.hall]; const hx = parseInt(R.c[0].slice(1), 16); col = [(hx >> 16) & 255, (hx >> 8) & 255, hx & 255].map(v => Math.min(255, v * 1.1 + 16)); if (R.f && R.ala !== 'X') col = [col[0] * 0.55 + 90, col[1] * 0.45, col[2] * 0.45]; if (s && !s.wall && !(s.prop === 'pvoid' || s.prop === 'prail' || s.prop === 'fence')) col = col.map(v => v * 0.7); }
      else if (s && s.wall) col = isCinta(x, y) ? [150, 148, 140] : [62, 60, 58];
      if (!col) continue; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg[f] = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), mf = floorOf(cq.x), img = mapImg(mf), now = performance.now(), on = x => floorOf(x) === mf;
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(10,12,16,.88)'; g.strokeStyle = '#c8803a'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    { const FR = FREG[mf], rr = big ? 1e9 : R / s + 2, ax = Math.max(FR[0], Math.floor(cx - rr)), ay = Math.max(FR[1], Math.floor(cy - rr)), bx = Math.min(FR[0] + FR[2], Math.ceil(cx + rr)), by = Math.min(FR[1] + FR[3], Math.ceil(cy + rr));
      g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; if (bx > ax && by > ay) g.drawImage(img, ax, ay, bx - ax, by - ay, ax, ay, bx - ax, by - ay); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0); }
    const dot = (x, y, r, col, ring) => { if (!on(x)) return; const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); } };
    const ico = (x, y, t, sz) => { if (!on(x)) return; const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 13 : 10, ph = phase(G);
    if (ph === 'ap') { const s2 = mySpot(me); dot(s2[0], s2[1], big ? 5 : 4, 'rgba(255,210,70,' + (0.6 + 0.4 * Math.sin(now / 200)) + ')', '#000'); } else ico(28.5, 48.5, '📣', sz - 1);
    { const c = cellOf(me), q = c.sp[me.slot]; ico(q[0], q[1], '🛏️', sz - 1); }
    if (big) { SRC.forEach((s, i) => { if (srcOn(G, i)) ico(s.x, s.y, IT[s.k][0], sz - 2); }); M.stash.forEach((h, i) => { if ((G.st[i] || []).length) ico(h.x + 0.5, h.y + 0.5, h.i, sz - 3); }); }
    if (G.ps && G.ps.st < 2) { const c = M.cells[G.ps.k]; ico(c.x0 + 2, c.y0 + 2, '🔎', sz + 1); }
    if (camPh(G).ph) ico(87, 40.5, '🚚', sz + 1); for (const r of G.rope) ico(r.ix, r.iy, '🪢', sz);
    for (const k of M.pcells) if ((G.tun[k] || 0) >= 2 && !G.seal[k]) ico(M.cells[k].hole[0], M.cells[k].hole[1], '🕳️', sz - 1);
    for (const Pq of M.portals) if (Pq.f === mf) { const c = Pq.cells[Math.floor(Pq.cells.length / 2)]; ico(c[0] + 0.5, c[1] + 0.5, Pq.tf ? '⬆️' : '⬇️', sz - 2); }
    for (const gd of G.gd) dot(gd.x, gd.y, 3, gd.st === 'chase' ? '#ff3030' : gd.st === 'ko' ? '#888' : '#7aa8ff', '#000');
    for (const c of G.chars) if (c !== me && c.alive) dot(c.x, c.y, 3, isoOn(G, c) ? '#9aa0a8' : ricOn(G, c) ? '#ff6a5a' : TC, '#000');
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 66;
  function minimap(g, G, W2) {
    const mf = floorOf(cq.x), FR = FREG[mf];
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 10) / ((FR[2] + FR[3]) * 0.7071), FR[0] + FR[2] / 2, FR[1] + FR[3] / 2, true);
      g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText('Rocca Nera · ' + FLN[mf].toLowerCase(), W2 / 2, cy - R - 26);
      g.font = '600 12px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText('🟥 zone vietate · 🛏️ la tua cella · 📣 l\'appello', W2 / 2, cy - R - 9); g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 8, 122 + RADAR, RADAR, 3.2, cq.x, cq.y, false);
    g.fillStyle = 'rgba(10,12,16,.72)'; cqRR(g, W2 - RADAR - 8 - 46, 122 + RADAR * 2 + 3, 92, 28, 7); g.fill();
    g.font = '700 10px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText(mf ? '⬆️ Primo piano' : '🏛️ Piano terra', W2 - RADAR - 8, 122 + RADAR * 2 + 12);
    g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.75)'; g.fillText('🗺️ tocca', W2 - RADAR - 8, 122 + RADAR * 2 + 25);
  }
  // FRASI DI FINE PARTITA (con qualche parolaccia, come negli altri giochi): al massimo 4
  function funny(G, won) {
    const L = [], N = c => '<b>' + esc(c.name) + '</b>', add = (pr, t) => L.push([pr + Math.random() * 0.5, t]);
    if (won) { const f = G.chars.filter(c => c.out).sort((a, b) => a.outT - b.outT)[0], l = G.chars.filter(c => c.out).sort((a, b) => b.outT - a.outT)[0]; if (f !== l) add(9, N(f) + ' è scappato per primo, ' + N(l) + ' per ultimo: il primo ha già mangiato tre panini al bar della stazione.'); if (G.chars.every(c => c.out === 'tun' || c.spy)) add(8, 'Tutti dal tunnel: due notti col cucchiaio, le unghie distrutte, ma che soddisfazione. Fottuti secondini.'); if (G.chars.some(c => c.out === 'cam')) add(7, 'Il camion della lavanderia ha consegnato le lenzuola e qualche detenuto profumato di ammorbidente.'); if (G.chars.some(c => c.out === 'div')) add(7, 'Il portinaio ha salutato il "collega" con un sorriso. Domani lo licenziano, povero cristo.'); }
    for (const c of G.chars) if (!won && c.out) add(6, N(c) + ' è scappato davvero… e ha lasciato gli altri a marcire. Bell\'amico, porca miseria.');
    if (!won) { if (!G.chars.some(c => c.isoN || c.miss)) add(6, 'Detenuti modello: mai un appello saltato. Il direttore vi vuole fare santi. E restate dentro.'); else add(4, 'A Rocca Nera 2 almeno il caffè è peggiore. Ottimo motivo per evadere la prossima volta.'); }
    for (const c of G.chars) {
      if ((c.isoN || 0) >= 2) add(8, N(c) + ' è finito in isolamento ' + c.isoN + ' volte: ormai il materasso ha la sua forma.');
      if ((c.miss || 0) >= 2) add(7, N(c) + ' ha saltato ' + c.miss + ' appelli. Il capoguardia ha il suo nome tatuato sul braccio. Con le bestemmie intorno.');
    }
    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 4).map(l => l[1]);
    return out.length ? '<br><span style="display:block;margin-top:10px;text-align:left;font-size:14px;line-height:1.45">' + out.map(t => '😂 ' + t).join('<br>') + '</span>' : '';
  }
  // COME SI GIOCA: nelle impostazioni, da solo all'inizio delle prime partite, e col pulsante ❓
  const HELP = [
    ['🎯', 'Lo scopo', 'Siete detenuti a <b>Rocca Nera</b>. Avete <b>due giorni e due notti</b> per scappare <b>tutti</b>: all\'alba del terzo giorno vi trasferiscono. Rubate gli attrezzi, preparate la fuga e scegliete la via (anche diverse).'],
    ['📣', 'L\'appello', 'Mattina e sera suona la <b>campana</b>: corri al <b>tuo posto numerato</b> davanti al palco, in cortile. Chi manca diventa <b>ricercato</b> e le guardie lo cercano.'],
    ['🛏️', 'In cella', 'Dopo l\'appello della sera tutti in cella: alle 21:00 le <b>sbarre si chiudono</b>. Chi resta fuori è ricercato. Di notte, a letto, puoi <b>dormire</b> 💤 per far passare il tempo.'],
    ['🚫', 'Zone vietate', 'Sala delle guardie, uffici, carico, ingresso, isolamento e la <b>fascia di ronda</b> lungo il muro (in rosso sulla mappa): se una guardia ti vede lì ti insegue. Di notte fuori dalla cella sei sempre fuori posto.'],
    ['👮', 'Le guardie', 'Vedono nel loro <b>cono</b>: ❓ = sospettano, ❗ = ti inseguono. Fatti perdere di vista e ti cercano nei dintorni. Di notte i <b>riflettori</b> 🔦 spazzano il cortile.'],
    ['✋', 'La refurtiva', 'Per la fuga servono attrezzi: <b>rubali</b> dove luccicano ✨ (cucchiaio in mensa, stracci e lenzuola in lavanderia, cacciavite in officina, divisa e tesserino nelle zone vietate). Se una guardia ti <b>vede</b> rubare sei ricercato: il pulsante te lo dice (👀). In tasca ne porti <b>2</b>.'],
    ['🧱', 'Nascondigli', 'Nascondi la refurtiva nella <b>piastrella</b> della tua cella o in un nascondiglio comune (orto, casetta, dietro la tv, scarico della doccia). All\'<b>appello</b> frugano le tasche a caso. Le guardie a volte controllano i nascondigli comuni, e se ti vedono nascondere vanno a guardare.'],
    ['🔎', 'Perquisizioni', 'Ogni giorno una cella viene <b>perquisita</b> con un avviso di ' + PS_W + ' secondi: corri a svuotare la piastrella! Chi è dentro viene perquisito anche lui.'],
    ['🧸', 'Il fantoccio', 'Con gli <b>stracci</b>, in cella, fai un fantoccio nel letto. Di notte, al <b>controllo delle celle</b> 🔦 (mezzanotte e le tre), il secondino crede che dormi. Con l\'allerta però guarda meglio.'],
    ['🕳️', 'Tunnel', 'Di notte, nella tua cella, col 🥄 scava nell\'angolo sotto la branda: <b>un pezzo per notte</b>, pronto la seconda. Fa rumore: se il secondino ti vede perdi il pezzo e il cucchiaio. La terra 🟫 resta in cella: di giorno portala nell\'<b>orto</b>, se no la perquisizione la trova e il tunnel viene murato.'],
    ['👔', 'Divisa', 'Indossa la 👔 divisa: le guardie ti credono un collega, ma <b>da vicino ti riconoscono</b>. Col 🪪 tesserino esci dal <b>cancello principale</b> (dalla sala delle guardie), e puoi portarti dietro un compagno come "detenuto scortato".'],
    ['🚚', 'Camion', 'Ogni giorno il camion della lavanderia arriva a un\'ora diversa (lo dicono al mattino). Col 🪛 svita la porta dell\'officina verso il cortile di carico e nasconditi nel camion: prima di partire a volte controllano il carico.'],
    ['🪢', 'Corda', 'Chi è già fuori, col 🧵 lenzuolo, lancia la corda oltre il muro. Dentro si <b>scavalca la rete</b> del cortile, si attraversa la fascia di ronda (riflettori!) e ci si arrampica.'],
    ['🚨', 'La fuga si scopre', 'All\'appello o al controllo delle celle chi manca fa scattare l\'<b>allerta</b> (il fantoccio copre anche chi è scappato). Se era un tunnel, lo trovano e lo murano: scappate insieme!'],
    ['🐀', 'La spia', 'Solo se scelta nelle impostazioni: uno di voi, a caso e in segreto, lavora per il direttore. Vicino a una guardia fa una <b>soffiata</b> (tunnel, nascondigli, corda). Vincete se scappano tutti tranne lei. Occhio a chi chiacchiera con le guardie!'],
    ['⛓️', 'Presi', 'Chi viene preso finisce <b>' + ISO_T + ' secondi in isolamento</b>, perde quello che ha in tasca e le guardie diventano più attente.'],
    ['🗺️', 'Orientarsi', 'In alto a sinistra la <b>giornata</b> con gli orari; in alto a destra la <b>mappa</b> (toccala per ingrandirla). La scala del braccio porta al primo piano.']
  ];
  const helpHtml = () => HELP.map(([i, t, d]) => '<p><b>' + i + ' ' + t + '</b><br>' + d + '</p>').join('') + '<p class="n">Tasti sul PC: frecce o WASD per muoversi · M mappa · E azione</p>';
  function helpUI(on) { const el = document.getElementById('evHelp'); if (!el) return; if (on) { el.innerHTML = '<div class="t">📖 Evasione: come si gioca</div>' + helpHtml() + '<div class="c">Tocca per chiudere</div>'; el.scrollTop = 0; } el.hidden = !on; }
  if (!document.getElementById('evCss')) {
    const st = document.createElement('style'); st.id = 'evCss';
    st.textContent = '#evHelp{position:absolute;left:12px;right:12px;top:118px;bottom:150px;max-width:480px;margin:0 auto;overflow-y:auto;background:rgba(32,24,18,.96);border:2px solid #c8803a;border-radius:16px;padding:12px 16px;color:#f4e8d4;font-size:14px;line-height:1.4;z-index:31;box-shadow:0 8px 30px rgba(0,0,0,.5)}#evHelp .t{font-weight:800;font-size:17px;color:#ffb860;margin-bottom:4px}#evHelp p{margin:7px 0}#evHelp b{color:#ffd8a0}#evHelp .n{font-size:12px;color:#c8b498}#evHelp .c{text-align:center;font-size:13px;color:#ffb860;font-weight:700;margin-top:10px}'
      + '#evHelpB{position:absolute;left:14px;top:252px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(32,24,18,.85);color:#ffb860;font-size:20px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.35)}'
      + '#evSt{position:absolute;left:12px;right:12px;bottom:150px;max-width:360px;margin:0 auto;background:rgba(32,24,18,.96);border:2px solid #c8803a;border-radius:16px;padding:10px 14px;color:#f4e8d4;font-size:14px;z-index:30;box-shadow:0 8px 30px rgba(0,0,0,.5)}#evSt .t{font-weight:800;font-size:16px;color:#ffb860;margin-bottom:4px}#evSt .s{font-size:12px;font-weight:700;color:#c8b498;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.04em}#evSt .e{font-size:13px;color:#8a7a68;padding:4px 2px}#evSt .c{text-align:center;font-size:12px;color:#ffb860;font-weight:700;margin-top:10px}'
      + '#evSt button{display:flex;align-items:center;width:100%;gap:10px;margin:4px 0;padding:8px 12px;border:0;border-radius:11px;background:rgba(255,190,110,.16);color:#f4e8d4;font-size:15px;font-weight:700;text-align:left}#evSt button i{font-style:normal;font-size:20px}#evSt button span{margin-left:auto;font-size:12px;color:#ffb860}#evSt button:disabled{opacity:.4}'
      + '.evHow summary{cursor:pointer}.evHow p{margin:8px 0;font-size:14px;line-height:1.4}.evHow .n{font-size:12px;opacity:.75}';
    document.head.appendChild(st);
    const host = document.getElementById('ciack');
    const hp = document.createElement('div'); hp.id = 'evHelp'; hp.hidden = true; let hy = 0;
    hp.addEventListener('pointerdown', e => { e.stopPropagation(); hy = e.clientY; });
    hp.addEventListener('pointerup', e => { e.stopPropagation(); if (Math.abs(e.clientY - hy) < 8) helpUI(false); });
    hp.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); if (host) host.appendChild(hp);
    const hb = document.createElement('button'); hb.id = 'evHelpB'; hb.type = 'button'; hb.hidden = true; hb.textContent = '❓';
    hb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); helpUI(hp.hidden); }); if (host) host.appendChild(hb);
    const sp = document.createElement('div'); sp.id = 'evSt'; sp.hidden = true;
    sp.addEventListener('pointerdown', e => e.stopPropagation());
    sp.addEventListener('pointerup', e => { e.stopPropagation(); const b = e.target.closest('button'); if (b) { if (!b.disabled) stClick(b.dataset.a, b.dataset.it); return; } if (e.target.closest('.c') || e.target.closest('.t')) { const G = cq.g; if (G) G.stO = null; sp.hidden = true; } });
    sp.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); if (host) host.appendChild(sp);
    const mb = document.createElement('button'); mb.id = 'evMap'; mb.type = 'button'; mb.hidden = true;
    mb.onclick = e => { e.stopPropagation(); const G = cq.g; if (G && G.mode === 'evasione') { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } }; if (host) host.appendChild(mb);
    const bb = document.createElement('button'); bb.id = 'evBoard'; bb.type = 'button'; bb.hidden = true;
    bb.onclick = e => { e.stopPropagation(); const G = cq.g; if (G && G.mode === 'evasione') helpUI(hp.hidden); }; if (host) host.appendChild(bb);
    window.addEventListener('keydown', e => { const k = e.key && e.key.toLowerCase(); if (k === 'm' && cq.g && cq.g.mode === 'evasione' && cq.on && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) cq.g.big = !cq.g.big; });
    // all'inizio delle prime 3 partite (su questo telefono) la spiegazione si apre da sola; giocando da soli la partita aspetta che la chiudi
    setInterval(() => {
      const G = cq.g, on = !!(G && G.mode === 'evasione' && G.phase === 'play' && (!G.guest || G.ready) && $('#cqTask').hidden && !$('#ciack').hidden);
      if (hb.hidden === on) hb.hidden = !on; if (mb.hidden === on) mb.hidden = !on; if (bb.hidden === (on && !G.big)) bb.hidden = !(on && !G.big);
      if (!on) { if (!hp.hidden) hp.hidden = true; if (!sp.hidden) sp.hidden = true; return; }
      if (!G.helpAuto) { G.helpAuto = 1; let n = 0; try { n = +localStorage.getItem('evHelpN') || 0; localStorage.setItem('evHelpN', n + 1); } catch {} if (n < 3) { helpUI(true); G.helpHold = !cq.net; } }
      if (G.helpHold) { if (hp.hidden) G.helpHold = 0; else G.pre = Math.max(G.pre || 0, 1); }
      const W2 = cq.w, H2 = cq.h; let css;
      if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:16px'; }
      else css = 'left:' + (W2 - 2 * RADAR - 8) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px;border-radius:50%';
      if (mb.dataset.k !== css) { mb.dataset.k = css; mb.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;' + css; }
      const bc = 'position:absolute;left:10px;top:122px;width:158px;height:' + (24 + AG.length * 19) + 'px;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent';
      if (bb.dataset.k !== bc) { bb.dataset.k = bc; bb.style.cssText = bc; }
    }, 200);
  }
  window.__ev = { camPh, escapeC, fenceAt, ropeAt, holeNear, TRK, DOORP, MDP, GATEP, route, floorOf, illegal, phase, cyc, clock, action, roomAt, forbAt, SRC, IT, seenBy, doAct, psStart, ncStart, stashChecked, stNear, srcNear };
});
