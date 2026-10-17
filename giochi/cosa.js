// La Cosa alla base polare. Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Stazione di ricerca in Antartide (mappa nuova "base", registrata qui in CQ_MAPS con only: 'cosa'), fuori la bufera.
// Uno dei giocatori e' LA COSA (2 se si e' in 8 o piu'): elimina in segreto (solo se nessun altro la vede), puo' ASSORBIRE il corpo
// della sua vittima e prenderne l'aspetto e il nome. Si vede come mostro solo quando attacca, quando e' scoperta (o dai fantasmi).
// La squadra: CORPI SEGNALABILI -> riunione in Mensa senza voto (si parla in vocale); ESAME DEL SANGUE in due al bancone del laboratorio
// (pochi kit); un LANCIAFIAMME in magazzino (2 colpi: la Cosa bruciata muore; un innocente muore e chi ha sparato perde l'arma, che torna
// in magazzino). FREDDO: fuori si gela in fretta, dentro ci si scalda finche' il generatore va (la Cosa puo' spegnerlo: buio e freddo).
// Allo scadere atterra l'elicottero sulla piazzola: parte con chi c'e' sopra. Se a bordo c'e' una Cosa non scoperta vince lei.
// Ganci del motore usati: draw(c) (la Cosa disegnata a mostro), corpi senza coltello (nk), CQ_MAP.draw/floor/drawWall (mappa nuova).
(() => {
  const MEET = 45, KCD = 35, KCD_RV = 14, REACH = 1.15, FLR = 2.4, TEST = 10, BENCH = 1.8, SEE_OUT = 4.6, WIT = 7, SAB_CD = 70, FIX = 12, HELI_T = 45, ATK_SHOW = 1.6, ABS_T = 15;
  const ICE = '#b9cad8', STEEL = '#8a95a2';

  // ================= MAPPA: base polare =================
  // 60 x 56: neve tutto intorno, la base al centro (x 10..49, y 9..42) con 11 moduli, piazzola dell'elicottero a sud.
  // Al bordo una fascia di cumuli invalicabili (4 caselle): cosi' la fine della mappa resta sempre nascosta nella bufera.
  function mapBase() {
    const W = 60, H = 56;
    let s = 7; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const MET = ['#6d7682', '#646d79'];
    const rooms = [
      { n: 'Neve', x: 1, y: 1, w: W - 2, h: H - 2, c: ['#e9f0f6', '#e1e9f1'], wc: ICE, k: 'snow', nl: 1 },
      { n: 'Dormitori', x: 11, y: 10, w: 10, h: 9, c: ['#56658a', '#4f5d80'], wc: STEEL, k: 'carpet' },
      { n: 'Mensa', x: 22, y: 10, w: 12, h: 9, c: ['#c9b98f', '#bfae84'], wc: STEEL, k: 'tile' },
      { n: 'Laboratorio', x: 35, y: 10, w: 14, h: 9, c: ['#dfe6ea', '#d2dadf'], wc: '#9aa6b2', k: 'tile' },
      { n: 'Corridoio', x: 11, y: 20, w: 38, h: 4, c: MET, wc: STEEL, k: 'metal' },
      { n: 'Radio', x: 11, y: 25, w: 8, h: 8, c: ['#5d6b5a', '#556352'], wc: STEEL, k: 'carpet' },
      { n: 'Generatore', x: 20, y: 25, w: 8, h: 8, c: ['#6a6152', '#61584a'], wc: '#857a68', k: 'metal' },
      { n: 'Magazzino', x: 29, y: 25, w: 9, h: 8, c: ['#8a8470', '#7f7965'], wc: STEEL, k: 'concrete' },
      { n: 'Serra', x: 39, y: 25, w: 10, h: 8, c: ['#5d7f4a', '#567645'], wc: '#7f9a86', k: 'grass' },
      { n: 'Hangar', x: 11, y: 34, w: 18, h: 8, c: ['#7a7f87', '#72777f'], wc: STEEL, k: 'concrete' },
      { n: 'Infermeria', x: 30, y: 34, w: 9, h: 8, c: ['#cfe3e0', '#c3d8d5'], wc: '#9aa6b2', k: 'tile' },
      { n: 'Ingresso', x: 40, y: 34, w: 9, h: 8, c: MET, wc: STEEL, k: 'metal' },
      { n: 'Piazzola', x: 38, y: 44, w: 8, h: 6, c: ['#59606b', '#535a64'], wc: ICE, k: 'concrete', ly: 48.6 }];
    // fra un modulo e l'altro: muri (le celle della base che non sono in nessun modulo)
    const inR = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    const holes = [];
    for (let y = 9; y <= 42; y++) for (let x = 10; x <= 49; x++) if (!rooms.slice(1, 12).some(r => inR(x, y, r))) holes.push([x, y, 1, 1]);
    const doors = [[15, 19, 2, 1], [27, 19, 2, 1], [41, 19, 2, 1], [21, 13, 1, 2], [34, 13, 1, 2],
      [14, 24, 2, 1], [23, 24, 2, 1], [32, 24, 2, 1], [43, 24, 2, 1], [14, 33, 2, 1], [33, 33, 2, 1], [43, 33, 2, 1], [29, 37, 1, 2], [39, 37, 1, 2],
      [10, 21, 1, 2], [49, 21, 1, 2], [44, 42, 2, 1], [18, 42, 3, 1], [29, 9, 2, 1]];   // le ultime 5 portano fuori, nella neve
    const decals = [
      [2, 21.2, 8, 1.6, '#d6e0ea'], [50, 21.2, 9, 1.6, '#d6e0ea'], [44, 43, 2, 1, '#d6e0ea'], [18, 43, 3, 7, '#d3dde8'], [29, 2, 2, 7, '#d6e0ea'],   // sentieri battuti
      [18.3, 43, 0.25, 7, '#c4cfdb'], [20.45, 43, 0.25, 7, '#c4cfdb'],   // tracce dei cingoli fuori dall'hangar
      [24, 13, 8, 3, '#8a6a48'], [24.2, 13.2, 7.6, 2.6, '#9a7a56'],   // tappeto della mensa
      [12, 15, 6, 3, '#3f4a6a'], [12.2, 15.2, 5.6, 2.6, '#47547a'],   // tappeto dei dormitori
      [38, 12, 8, 5, '#c8d2d8'], [38.15, 12.15, 7.7, 4.7, '#d8e2e8'],   // laboratorio: zona pulita
      [20.2, 25.2, 7.6, 0.16, '#e8c43a'], [20.2, 32.6, 7.6, 0.16, '#e8c43a'], [21.5, 26.8, 5, 4, '#2a2620'], [21.7, 27, 4.6, 3.6, '#3a352c'],   // generatore: strisce e pedana
      [12, 36, 15, 0.14, '#e8c43a'], [12, 40, 15, 0.14, '#e8c43a'], [17.6, 41.6, 3.8, 0.4, '#e8c43a'],   // righe dell'hangar
      [41, 40.4, 6, 1.2, '#4a4038'], [41.15, 40.55, 5.7, 0.9, '#5a4e44'],   // zerbino dell'ingresso
      [31, 37, 7, 0.12, '#7ab8b0'],
      [38.4, 44.4, 7.2, 5.2, '#e8c43a'], [38.6, 44.6, 6.8, 4.8, '#535a64']];   // piazzola: bordo giallo
    // la H della piazzola (dentro l'area 39..45 x 45..49)
    decals.push([40.3, 45.4, 0.6, 3.2, '#f2f2f2'], [43.1, 45.4, 0.6, 3.2, '#f2f2f2'], [40.3, 46.7, 3.4, 0.6, '#f2f2f2']);
    for (let i = 0; i < 6; i++) decals.push([34.5 + i * 0.25, 22.85, 0.12, 0.12, '#e8c43a']);
    const props = [], pp = (t, x, y, o) => props.push([t, x, y, o]), prow = (t, x0, y0, n, dx, dy, f) => { for (let i = 0; i < n; i++) pp(t, x0 + dx * i, y0 + dy * i, f ? f(i) : undefined); };
    const LOCK = ['#4f7aa8', '#a85a4f', '#4fa87a', '#a89a4f', '#8a4fa8'];
    // Dormitori
    prow('bunk', 11, 10, 5, 2, 0, i => ['#3f6fb0', '#b04a3f', '#3f9a6a', '#9a7a3f', '#7a4fa0'][i]); prow('locker', 20, 15, 3, 0, 1, i => LOCK[i % 5]);
    pp('table', 14, 16); pp('dchair', 13, 16, ['#7aa0d4', 'w']); pp('dchair', 15, 16, ['#d4a07a', 'e']); pp('heater', 11, 17); pp('tv', 11, 13); pp('crate', 19, 18); pp('plant', 11, 18);
    // Mensa: bancone, frighi, il tavolo lungo della riunione
    prow('counter', 23, 10, 5, 1, 0); pp('coffee', 28, 10); pp('fridge', 32, 10); pp('fridge', 33, 10); pp('heater', 33, 17); pp('plant', 22, 18);
    prow('table', 25, 14, 6, 1, 0); prow('dchair', 25, 13, 6, 1, 0, () => ['#c96a5a', 'n']); prow('dchair', 25, 15, 6, 1, 0, () => ['#5a8ac9', 's']);
    // Laboratorio: bancone degli esami (blood), banconi, microscopi, vasca col campione, monitor
    pp('bench', 40, 14); pp('blood', 41, 14, { n: 3 }); pp('bench', 42, 14);
    prow('shelf', 36, 10, 4, 1, 0); pp('monitor', 44, 10); pp('monitor', 45, 10); pp('dchair', 44, 11, ['#8a96a8', 's']); pp('dchair', 45, 11, ['#8a96a8', 's']);
    pp('freezer', 47, 10); pp('freezer', 48, 10); pp('specimen', 47, 16); pp('specimen', 48, 17); pp('bench', 36, 17); pp('micro', 37, 17); pp('bench', 38, 17); pp('heater', 35, 16);
    // Corridoio
    [13, 25, 37, 46].forEach(x => pp('heater', x, 20)); pp('crate', 20, 23); pp('crate2', 21, 23); pp('board', 31, 20);
    // Radio
    prow('radio', 16, 25, 3, 1, 0); prow('dchair', 16, 26, 3, 1, 0, () => ['#3a3f49', 's']); pp('shelf', 11, 26); pp('shelf', 11, 27); pp('monitor', 12, 25); pp('crate', 11, 31); pp('heater', 18, 29); pp('map', 18, 31);
    // Generatore: la macchina grande in mezzo alla pedana, serbatoi e quadro
    pp('pgen', 23, 28, { on: true }); pp('ftank', 20, 25); pp('ftank', 21, 25); pp('fusebox', 26, 25); pp('barrel', 27, 31, '#c9452f'); pp('barrel', 26, 32, '#c9452f'); pp('barrel', 20, 32, '#c9452f'); pp('pipes', 27, 27);
    // Magazzino: casse, barili e la rastrelliera del lanciafiamme
    pp('crate', 30, 26); pp('crate2', 31, 26); pp('crate', 30, 27); pp('crate', 33, 30); pp('crate2', 34, 30); pp('crate', 33, 31); pp('crate', 34, 31);
    prow('shelf', 29, 29, 3, 0, 1); prow('barrel', 35, 25, 3, 1, 0, i => ['#3b6ea5', '#a5493b', '#3ba56e'][i]); pp('flamer', 37, 28, { on: true }); pp('rack', 37, 31);
    // Serra
    prow('planter', 40, 27, 5, 1, 0); prow('planter', 40, 30, 5, 1, 0); pp('growlamp', 46, 27); pp('growlamp', 46, 30); pp('barrel', 48, 32, '#3b6ea5'); pp('plant', 48, 25); pp('plant', 39, 32); pp('plant', 48, 28);
    // Hangar: motoslitte, slitte, banco degli attrezzi, carburante
    pp('snowmob', 13, 37, '#c9452f'); pp('snowmob', 15, 37, '#e8a83a'); pp('snowmob', 17, 37, '#3b6ea5'); pp('sled', 22, 37); pp('sled', 24, 37);
    pp('workbench', 11, 34); pp('workbench', 12, 34); pp('barrel', 27, 34, '#c9452f'); pp('barrel', 28, 34, '#c9452f'); pp('crate', 26, 40); pp('crate2', 27, 40); pp('rack', 11, 39); pp('heater', 28, 39);
    // Infermeria
    pp('medbed', 31, 34); pp('medbed', 35, 34); pp('medbed', 37, 34); pp('cabinet', 38, 35); pp('cabinet', 38, 36); pp('dchair', 32, 40, '#d9c9a0'); pp('plant', 30, 41); pp('heater', 30, 39);
    // Ingresso: giacconi, panca, stufa
    prow('rack', 41, 34, 2, 1, 0); prow('locker', 46, 34, 3, 1, 0, i => LOCK[(i + 2) % 5]); pp('heater', 48, 38); pp('crate', 40, 41);
    // Fuori: antenna della radio, stazione meteo, fusti, lampioni verso la piazzola, bandiera
    pp('antenna', 6, 28); pp('meteo', 54, 12); pp('meteo', 6, 6); pp('barrel', 52, 30, '#c9452f'); pp('barrel', 53, 30, '#c9452f'); pp('barrel', 52, 31, '#c9452f');
    pp('polelamp', 43, 43); pp('polelamp', 46, 43); pp('polelamp', 37, 44); pp('polelamp', 46, 49); pp('polelamp', 9, 20); pp('polelamp', 50, 20); pp('polelamp', 26, 8); pp('flag', 47, 46); pp('sled', 33, 46); pp('snowmob', 51, 24, '#c9452f');
    // cumuli di neve e rocce ghiacciate sparsi (fissi: la mappa e' sempre la stessa), lontano dalla base, dai sentieri e dalla piazzola
    const taken = new Set(props.map(p => p[1] + ',' + p[2]));
    const keep = (x, y) => (x >= 8 && x <= 51 && y >= 7 && y <= 44) || (x >= 36 && x <= 48 && y >= 42) || (y >= 20 && y <= 23) || (x >= 17 && x <= 21 && y >= 42) || (x >= 28 && x <= 31 && y <= 9);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (taken.has(x + ',' + y)) continue;
      if (x < 5 || y < 5 || x > W - 6 || y > H - 6) { pp(rnd() < 0.8 ? 'drift' : 'icerock', x, y); taken.add(x + ',' + y); continue; }
      if (keep(x, y)) continue;
      const r = rnd(); if (r < 0.045) { pp(rnd() < 0.62 ? 'drift' : 'icerock', x, y); taken.add(x + ',' + y); }
      else if (r < 0.1) decals.push([x + rnd() * 0.6, y + rnd() * 0.6, 0.5 + rnd() * 0.8, 0.2 + rnd() * 0.3, rnd() < 0.5 ? '#f6f9fc' : '#d9e3ec']);
    }
    const ring = [[25, 12], [27, 12], [29, 12], [31, 12], [24, 14], [31, 16], [25, 16], [27, 16], [29, 16], [32, 14]];   // intorno al tavolo della mensa (partenza e riunioni)
    return { w: W, h: H, rooms, doors, decals, props, holes, tasks: [], hall: 4, cams: [], vending: [], ring, button: { x: -10, y: -10 }, sabs: {},
      inn: { Neve: 'fuori nella neve', Dormitori: 'nei Dormitori', Mensa: 'in Mensa', Laboratorio: 'in Laboratorio', Corridoio: 'nel Corridoio', Radio: 'alla Radio', Generatore: 'al Generatore', Magazzino: 'in Magazzino', Serra: 'nella Serra', Hangar: 'nell\'Hangar', Infermeria: 'in Infermeria', Ingresso: 'all\'Ingresso', Piazzola: 'sulla piazzola' },
      help: '', btnTxt: '', sabTxt: '', draw, floor: FLOOR, drawWall, pad: { x: 42, y: 47 }, gen: { x: 23, y: 28 }, bench: { x: 41, y: 14 }, flamer: { x: 37, y: 28 } };
  }
  // pavimenti nuovi: neve (soffice, con le onde del vento) e grata di metallo
  const FLOOR = {
    snow(K, x, y) {
      K.speck(x, y, 6, ['rgba(255,255,255,.8)', 'rgba(150,175,200,.25)'], K.TW / 22);
      if (K.hsh(x, y, 60) < 0.3) { const a = 0.1 + 0.5 * K.hsh(x, y, 61), b = 0.2 + 0.6 * K.hsh(x, y, 62); K.strokes([[K.S(x + a, y + b, 0), K.S(x + a + 0.35, y + b - 0.05, 0)]], 'rgba(160,185,210,.35)', K.lw * 1.4); }
    },
    metal(K, x, y) {
      const P = (u, v) => K.S(x + u, y + v, 0), L = [];
      for (let i = 1; i < 4; i++) { L.push([P(i / 4, 0.05), P(i / 4, 0.95)]); L.push([P(0.05, i / 4), P(0.95, i / 4)]); }
      K.strokes(L, 'rgba(0,0,0,.18)');
      for (const [u, v] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) { const [X, Y] = P(u, v); K.g.fillStyle = 'rgba(255,255,255,.22)'; K.g.fillRect(X - 1, Y - 0.5, 2, 1); }
    }
  };
  // muri: lamiera della base (pannelli, rivetti, fascia scura) oppure ghiaccio al bordo della mappa
  function drawWall(K, x, y, col) {
    if (col === ICE) {
      const h = 0.8 + 0.7 * K.hsh(x, y, 70);
      K.bx(x, y, x + 1, y + 1, 0, h, '#b7c8d8'); K.bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, h, h + 0.14, '#f4f8fb');
      if (K.hsh(x, y, 71) < 0.5) K.bx(x + 0.2, y + 0.15, x + 0.7, y + 0.6, h + 0.14, h + 0.3 + 0.3 * K.hsh(x, y, 72), '#e8f0f7');
      return;
    }
    const h = 1.05;
    K.bx(x, y, x + 1, y + 1, 0, h, col); K.bx(x, y, x + 1, y + 1, h - 0.06, h, K.shade(col, 1.3));
    if (K.TW < 40) return;
    const FS = (u, z) => K.S(x + u, y + 1, z), FE = (v, z) => K.S(x + 1, y + v, z);
    for (const [F, k] of [[FS, 0.74], [FE, 0.52]]) {
      K.g.fillStyle = K.shade(col, k * 0.55); K.g.beginPath(); K.g.moveTo(...F(0, 0.42)); K.g.lineTo(...F(1, 0.42)); K.g.lineTo(...F(1, 0.52)); K.g.lineTo(...F(0, 0.52)); K.g.closePath(); K.g.fill();
      K.strokes([[F(0.5, 0.02), F(0.5, h - 0.06)], [F(0.02, 0.02), F(0.02, h - 0.06)]], K.shade(col, k * 0.7));
      for (const u of [0.12, 0.38, 0.62, 0.88]) for (const z of [0.2, 0.8]) { const [X, Y] = F(u, z); K.g.fillStyle = K.shade(col, k * 1.25); K.g.fillRect(X - 0.8, Y - 0.8, 1.6, 1.6); }
    }
  }
  // oggetti nuovi della base (K = attrezzi di cqTools: bx scatola, cyl cilindro, qL faccia davanti, dot, line, glow, S punto 3D)
  function draw(K, t, x, y, o) {
    const { bx, cyl, qL, dot, glow, line, S } = K;
    switch (t) {
      case 'bunk': {   // letto a castello
        const c = o || '#3f6fb0';
        for (const [a, b] of [[0.06, 0.08], [0.88, 0.08], [0.06, 0.84], [0.88, 0.84]]) bx(x + a, y + b, x + a + 0.07, y + b + 0.08, 0, 1.9, '#7a8490');
        bx(x + 0.08, y + 0.1, x + 0.94, y + 0.9, 0.35, 0.5, '#9aa3ad'); bx(x + 0.1, y + 0.12, x + 0.92, y + 0.88, 0.5, 0.66, c); bx(x + 0.12, y + 0.14, x + 0.4, y + 0.86, 0.66, 0.76, '#eef1f4');
        bx(x + 0.08, y + 0.1, x + 0.94, y + 0.9, 1.3, 1.42, '#9aa3ad'); bx(x + 0.1, y + 0.12, x + 0.92, y + 0.88, 1.42, 1.58, K.shade(c, 1.15)); bx(x + 0.12, y + 0.14, x + 0.4, y + 0.86, 1.58, 1.68, '#eef1f4');
        for (let z = 0.5; z < 1.4; z += 0.3) bx(x + 0.9, y + 0.86, x + 0.96, y + 0.94, z, z + 0.04, '#7a8490');
        break; }
      case 'heater':   // termosifone
        bx(x + 0.1, y + 0.35, x + 0.9, y + 0.65, 0.1, 0.75, '#e6e9ec'); for (let i = 0; i < 6; i++) qL(x + 0.14 + i * 0.125, x + 0.2 + i * 0.125, y + 0.65, 0.16, 0.7, '#c4c9cf');
        bx(x + 0.16, y + 0.4, x + 0.22, y + 0.6, 0, 0.1, '#9aa3ad'); bx(x + 0.78, y + 0.4, x + 0.84, y + 0.6, 0, 0.1, '#9aa3ad'); dot(x + 0.84, y + 0.66, 0.66, 0.025, '#e2553a'); break;
      case 'bench': case 'blood': {   // bancone del laboratorio; blood = quello degli esami (centrifuga, provette: una per kit rimasto)
        bx(x + 0.04, y + 0.12, x + 0.96, y + 0.88, 0, 0.82, '#b9c3cc'); qL(x + 0.1, x + 0.48, y + 0.88, 0.1, 0.72, '#a5afb8'); qL(x + 0.52, x + 0.9, y + 0.88, 0.1, 0.72, '#a5afb8');
        dot(x + 0.45, y + 0.88, 0.45, 0.02, '#5a6470'); dot(x + 0.55, y + 0.88, 0.45, 0.02, '#5a6470');
        bx(x, y + 0.08, x + 1, y + 0.92, 0.82, 0.9, '#f2f5f7');
        if (t === 'bench') { cyl(x + 0.3, y + 0.4, 0.07, 0.9, 1.15, '#7ad0e8'); cyl(x + 0.5, y + 0.6, 0.06, 0.9, 1.1, '#e8d07a'); cyl(x + 0.7, y + 0.35, 0.08, 0.9, 1.05, '#a0e87a'); bx(x + 0.62, y + 0.55, x + 0.86, y + 0.8, 0.9, 0.95, '#ffffff'); break; }
        cyl(x + 0.3, y + 0.45, 0.2, 0.9, 1.15, '#d6dce2'); cyl(x + 0.3, y + 0.45, 0.16, 1.15, 1.2, '#5a6470'); dot(x + 0.3, y + 0.62, 1.05, 0.02, '#7be0a0');
        bx(x + 0.55, y + 0.3, x + 0.92, y + 0.6, 0.9, 0.98, '#e6eaee');
        for (let i = 0; i < 4; i++) { const on = i < ((o && o.n) || 0); cyl(x + 0.6 + i * 0.09, y + 0.45, 0.03, 0.98, 1.22, on ? '#c0222e' : '#e8eef2'); }
        glow(x + 0.5, y + 0.5, 1.2, 0.6, 'rgba(255,90,90,.18)'); break; }
      case 'micro':   // microscopio sul bancone
        bx(x + 0.04, y + 0.12, x + 0.96, y + 0.88, 0, 0.82, '#b9c3cc'); bx(x, y + 0.08, x + 1, y + 0.92, 0.82, 0.9, '#f2f5f7');
        bx(x + 0.35, y + 0.4, x + 0.65, y + 0.7, 0.9, 0.98, '#2f343d'); bx(x + 0.55, y + 0.45, x + 0.62, y + 0.6, 0.98, 1.5, '#2f343d'); cyl(x + 0.45, y + 0.5, 0.06, 1.25, 1.6, '#c9ccd4'); bx(x + 0.38, y + 0.42, x + 0.6, y + 0.62, 1.1, 1.14, '#9aa3ad'); break;
      case 'freezer':   // congelatore dei campioni
        bx(x + 0.08, y + 0.15, x + 0.92, y + 0.85, 0, 1.9, '#e8eef2'); qL(x + 0.14, x + 0.86, y + 0.85, 1.0, 1.82, '#d8e0e6'); qL(x + 0.14, x + 0.86, y + 0.85, 0.08, 0.92, '#d8e0e6');
        bx(x + 0.76, y + 0.85, x + 0.82, y + 0.9, 1.2, 1.6, '#9aa3ad'); qL(x + 0.2, x + 0.4, y + 0.85, 1.6, 1.72, '#59b6e8'); dot(x + 0.5, y + 0.86, 1.66, 0.02, '#7be0a0'); break;
      case 'specimen': {   // vasca di vetro con il campione congelato (una sagoma scura dentro)
        bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.22, '#5a6470');
        cyl(x + 0.5, y + 0.5, 0.3, 0.22, 1.85, 'rgba(120,200,190,.45)');
        dot(x + 0.5, y + 0.5, 0.9, 0.12, 'rgba(80,25,40,.8)'); dot(x + 0.42, y + 0.55, 1.15, 0.08, 'rgba(110,35,55,.75)'); dot(x + 0.58, y + 0.47, 0.7, 0.07, 'rgba(110,35,55,.7)');
        cyl(x + 0.5, y + 0.5, 0.32, 1.85, 2.0, '#5a6470'); glow(x + 0.5, y + 0.5, 1.2, 0.7, 'rgba(120,230,210,.25)'); break; }
      case 'radio':   // tavolo della radio: apparecchi con le lancette, microfono
        K.desk(x, y); bx(x + 0.12, y + 0.18, x + 0.88, y + 0.5, 0.85, 1.55, '#4a5240'); qL(x + 0.16, x + 0.84, y + 0.5, 0.92, 1.5, '#3a4232');
        qL(x + 0.2, x + 0.48, y + 0.5, 1.2, 1.42, '#9be07a'); dot(x + 0.62, y + 0.5, 1.3, 0.035, '#d8d2b8'); dot(x + 0.76, y + 0.5, 1.3, 0.035, '#d8d2b8'); dot(x + 0.3, y + 0.5, 1.02, 0.02, '#e2553a'); dot(x + 0.4, y + 0.5, 1.02, 0.02, '#f2d24a');
        bx(x + 0.6, y + 0.62, x + 0.66, y + 0.68, 0.85, 1.15, '#2a2e35'); dot(x + 0.63, y + 0.65, 1.2, 0.04, '#2a2e35'); break;
      case 'pgen': {   // generatore grande: giallo, tubo di scarico, spia verde (acceso) o rossa (spento, sabotato)
        const on = !o || o.on;
        bx(x - 0.3, y - 0.2, x + 1.3, y + 1.2, 0, 0.18, '#3a3f49');
        bx(x - 0.2, y - 0.1, x + 1.2, y + 1.1, 0.18, 1.35, '#e0b02a'); qL(x - 0.1, x + 1.1, y + 1.1, 0.4, 1.2, '#c99a1e');
        for (let i = 0; i < 5; i++) qL(x + i * 0.22, x + 0.12 + i * 0.22, y + 1.1, 0.5, 1.1, '#3a3020');
        bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 1.35, 1.6, '#2f343d'); cyl(x + 0.95, y + 0.2, 0.09, 1.35, 2.6, '#5a5f66');
        bx(x + 1.2, y + 0.3, x + 1.3, y + 0.8, 0.5, 1.0, '#2a2e35'); dot(x + 1.3, y + 0.42, 0.9, 0.04, on ? '#4fe08a' : '#ff3a3a'); dot(x + 1.3, y + 0.62, 0.9, 0.03, on ? '#f2d24a' : '#4a3a3a');
        if (on) glow(x + 1.3, y + 0.5, 0.9, 0.5, 'rgba(120,255,160,.35)'); else glow(x + 1.3, y + 0.5, 0.9, 0.6, 'rgba(255,60,60,.4)');
        break; }
      case 'ftank':   // serbatoio del gasolio
        cyl(x + 0.5, y + 0.5, 0.38, 0, 1.7, '#c9452f'); cyl(x + 0.5, y + 0.5, 0.39, 0.75, 0.9, '#f2f2f2'); cyl(x + 0.5, y + 0.5, 0.1, 1.7, 1.85, '#5a5f66'); break;
      case 'pipes':   // tubi lungo il muro
        bx(x + 0.6, y + 0.1, x + 0.75, y + 0.9, 0, 2.2, '#8a8f99'); bx(x + 0.8, y + 0.1, x + 0.92, y + 0.9, 0, 2.2, '#a5493b'); bx(x + 0.1, y + 0.3, x + 0.9, y + 0.42, 1.6, 1.72, '#8a8f99'); dot(x + 0.68, y + 0.92, 1.0, 0.04, '#e2553a'); break;
      case 'flamer':   // rastrelliera del lanciafiamme (o.on = c'e' ancora)
        bx(x + 0.55, y + 0.1, x + 0.9, y + 0.9, 0, 2.1, '#5a5f66'); bx(x + 0.5, y + 0.15, x + 0.55, y + 0.85, 0.4, 1.9, '#2a2e35');
        qL(x + 0.1, x + 0.9, y + 0.9, 1.95, 2.1, '#e8c43a');
        if (o && o.on) { cyl(x + 0.38, y + 0.35, 0.12, 0.4, 1.5, '#a5493b'); cyl(x + 0.38, y + 0.62, 0.12, 0.4, 1.5, '#a5493b'); bx(x + 0.3, y + 0.75, x + 0.38, y + 0.85, 0.6, 1.85, '#2f343d'); bx(x + 0.28, y + 0.72, x + 0.4, y + 0.88, 1.85, 1.95, '#c9ccd4'); glow(x + 0.4, y + 0.5, 1.2, 0.8, 'rgba(255,150,60,.3)'); }
        else { K.g.globalAlpha = 0.5; qL(x + 0.2, x + 0.5, y + 0.85, 0.5, 1.6, '#2a2e35'); K.g.globalAlpha = 1; }
        break;
      case 'planter':   // vasca della serra con le piantine
        bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0, 0.5, '#7a5232'); bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0.5, 0.52, '#4a3220');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { dot(x + 0.25 + i * 0.25, y + 0.32 + j * 0.36, 0.72, 0.09, j ? '#4fa84a' : '#62bd5a'); dot(x + 0.25 + i * 0.25, y + 0.32 + j * 0.36, 0.9, 0.05, (i + j) % 2 ? '#e2553a' : '#88d870'); }
        break;
      case 'growlamp':   // lampada viola della serra
        bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0, 2.3, '#3a3f49'); bx(x + 0.1, y + 0.35, x + 0.9, y + 0.65, 2.3, 2.42, '#2a2e35'); qL(x + 0.12, x + 0.88, y + 0.65, 2.3, 2.36, '#d070ff'); glow(x + 0.5, y + 0.5, 1.8, 1.4, 'rgba(210,110,255,.3)'); break;
      case 'snowmob': {   // motoslitta
        const c = o || '#c9452f';
        bx(x + 0.15, y + 0.2, x + 0.25, y + 0.85, 0, 0.06, '#2a2e35'); bx(x + 0.75, y + 0.2, x + 0.85, y + 0.85, 0, 0.06, '#2a2e35');
        bx(x + 0.2, y + 0.25, x + 0.8, y + 0.8, 0.12, 0.55, c); bx(x + 0.3, y + 0.45, x + 0.7, y + 0.8, 0.55, 0.72, '#22262d'); bx(x + 0.25, y + 0.1, x + 0.75, y + 0.32, 0.4, 0.75, K.shade(c, 1.15));
        qL(x + 0.3, x + 0.7, y + 0.32, 0.6, 0.72, '#bfe3f2'); bx(x + 0.22, y + 0.38, x + 0.78, y + 0.44, 0.75, 0.82, '#5a5f66'); break; }
      case 'sled':   // slitta con le casse
        bx(x + 0.1, y + 0.12, x + 0.9, y + 0.2, 0, 0.08, '#7a5232'); bx(x + 0.1, y + 0.8, x + 0.9, y + 0.88, 0, 0.08, '#7a5232');
        bx(x + 0.12, y + 0.14, x + 0.88, y + 0.86, 0.12, 0.2, '#a8793c'); bx(x + 0.2, y + 0.2, x + 0.6, y + 0.6, 0.2, 0.6, '#b88a4c'); bx(x + 0.55, y + 0.45, x + 0.85, y + 0.8, 0.2, 0.45, '#3b6ea5'); break;
      case 'workbench':
        K.desk(x, y); bx(x + 0.15, y + 0.25, x + 0.5, y + 0.5, 0.85, 1.0, '#c9452f'); bx(x + 0.6, y + 0.3, x + 0.9, y + 0.36, 0.85, 0.9, '#8a8f99'); bx(x + 0.2, y + 0.6, x + 0.7, y + 0.66, 0.85, 0.88, '#5a5f66'); break;
      case 'medbed':   // lettino dell'infermeria con la flebo
        bx(x + 0.12, y + 0.05, x + 0.88, y + 0.95, 0, 0.5, '#c9ccd4'); bx(x + 0.14, y + 0.07, x + 0.86, y + 0.93, 0.5, 0.64, '#f4f6f8'); bx(x + 0.2, y + 0.1, x + 0.8, y + 0.32, 0.64, 0.76, '#9ad0e8');
        bx(x + 0.9, y + 0.15, x + 0.94, y + 0.2, 0, 1.9, '#9aa3ad'); bx(x + 0.86, y + 0.12, x + 0.98, y + 0.24, 1.6, 1.85, 'rgba(200,230,255,.8)'); break;
      case 'cabinet':   // armadietto dei medicinali con la croce
        bx(x + 0.1, y + 0.2, x + 0.9, y + 0.8, 0, 1.8, '#f2f4f6'); qL(x + 0.15, x + 0.85, y + 0.8, 0.1, 1.7, '#e2e6ea');
        qL(x + 0.44, x + 0.56, y + 0.8, 1.0, 1.5, '#d0303a'); qL(x + 0.3, x + 0.7, y + 0.8, 1.2, 1.3, '#d0303a'); break;
      case 'board':   // bacheca con i fogli
        bx(x + 0.1, y + 0.05, x + 0.9, y + 0.15, 0.5, 1.7, '#8a6a40'); qL(x + 0.15, x + 0.85, y + 0.15, 0.55, 1.65, '#c8a070');
        for (const [a, z, c] of [[0.2, 1.2, '#fff'], [0.48, 1.3, '#f2e27a'], [0.62, 0.8, '#fff'], [0.25, 0.7, '#9ad0e8']]) qL(x + a, x + a + 0.2, y + 0.16, z, z + 0.3, c); break;
      case 'map':   // mappa dell'Antartide appesa
        bx(x + 0.1, y + 0.82, x + 0.9, y + 0.9, 0.5, 1.7, '#3a3f49'); qL(x + 0.14, x + 0.86, y + 0.9, 0.55, 1.65, '#9ad0e8'); dot(x + 0.5, y + 0.9, 1.1, 0.16, '#f4f8fb'); dot(x + 0.56, y + 0.9, 1.2, 0.03, '#e2553a'); break;
      case 'antenna': {   // traliccio della radio con la luce rossa
        const L = [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];
        for (const [a, b] of L) line(S(x + a, y + b, 0), S(x + 0.5, y + 0.5, 3.4), '#9aa3ad', 2);
        for (let z = 0.6; z < 3.2; z += 0.6) { const k = 1 - z / 3.4, A = S(x + 0.5 - 0.35 * k, y + 0.5 - 0.35 * k, z), B = S(x + 0.5 + 0.35 * k, y + 0.5 + 0.35 * k, z); line(A, B, '#7a8490', 1.5); }
        dot(x + 0.5, y + 0.5, 3.45, 0.05, '#ff3a3a'); glow(x + 0.5, y + 0.5, 3.45, 0.6, 'rgba(255,60,60,.35)'); break; }
      case 'meteo':   // stazione meteo: palo, cassetta bianca, anemometro
        bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 2.4, '#9aa3ad'); bx(x + 0.3, y + 0.35, x + 0.7, y + 0.65, 1.1, 1.6, '#f2f4f6');
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + performance.now() / 300 * 0; dot(x + 0.5 + Math.cos(a) * 0.25, y + 0.5 + Math.sin(a) * 0.25, 2.45, 0.04, '#2a2e35'); } break;
      case 'polelamp':   // lampione
        bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0, 2.3, '#3a3f49'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 2.3, 2.5, '#22262e'); qL(x + 0.32, x + 0.68, y + 0.7, 2.32, 2.45, '#ffe58a'); glow(x + 0.5, y + 0.8, 2.2, 1.2, 'rgba(255,230,140,.35)'); break;
      case 'flag':
        bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 2.6, '#c9ccd4'); qL(x + 0.54, x + 1.05, y + 0.5, 1.9, 2.5, '#2f5a8a'); qL(x + 0.54, x + 1.05, y + 0.5, 2.15, 2.25, '#f2f2f2'); break;
      case 'drift':   // cumulo di neve
        { const h = 0.3 + 0.35 * K.hsh(x, y, 90); bx(x + 0.05, y + 0.1, x + 0.95, y + 0.9, 0, h, '#e6eef5'); bx(x + 0.2, y + 0.25, x + 0.8, y + 0.75, h, h + 0.22, '#f6f9fc'); bx(x + 0.35, y + 0.35, x + 0.65, y + 0.6, h + 0.22, h + 0.32, '#ffffff'); break; }
      case 'icerock':   // roccia con la neve sopra
        { const h = 0.6 + 0.6 * K.hsh(x, y, 91); bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, h, '#6a7682'); bx(x + 0.2, y + 0.2, x + 0.75, y + 0.7, h, h + 0.25, '#7a8692'); bx(x + 0.12, y + 0.12, x + 0.88, y + 0.6, h, h + 0.1, '#f4f8fb'); break; }
    }
  }
  CQ_MAPS.base = { n: 'Base polare', make: mapBase, only: 'cosa' };

  // ================= LA COSA: il mostro =================
  // tentacoli che si muovono, corpo di carne con le vene, bocca verticale che si apre con i denti, tanti occhi gialli; in basso i resti dei vestiti
  function monster(g, X, Y, TW, L, walk, f) {
    const u = TW / 34, t = performance.now() / 1000, bob = Math.abs(Math.sin(walk)) * 3 * u, col = (L && L.col) || '#7a6a4a';
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 20 * u, 7.5 * u, 0, 0, 7); g.fill();
    g.save(); g.translate(X, Y - bob); g.scale(u, u);
    const tent = (a0, len, ph, w0, back) => {
      let px = 0, py = -24, a = a0; const N = 9;
      for (let i = 0; i < N; i++) {
        a += Math.sin(t * 3.2 + ph + i * 0.6) * 0.22; const k = 1 - i / N, l = len / N, nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l * 0.85;
        g.strokeStyle = back ? '#7a2438' : '#9a3048'; g.lineWidth = w0 * k + 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        if (i % 2 && i < N - 1) { g.fillStyle = '#f0a8b8'; g.beginPath(); g.arc(nx + Math.sin(a) * w0 * k * 0.3, ny - Math.cos(a) * w0 * k * 0.3, 0.9 + k * 0.8, 0, 7); g.fill(); }
        px = nx; py = ny;
      }
    };
    tent(-2.5, 34, 0, 6, 1); tent(-0.65, 34, 1.7, 6, 1); tent(-1.6, 30, 3.1, 5, 1); tent(-2.9, 26, 4.2, 4.5, 1);
    // corpo
    const gr = g.createLinearGradient(0, -50, 0, 0); gr.addColorStop(0, '#c8566c'); gr.addColorStop(1, '#7a2438');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-17, -3); g.quadraticCurveTo(-21, -26, -11, -40); g.quadraticCurveTo(0, -52, 11, -40); g.quadraticCurveTo(21, -26, 17, -3); g.quadraticCurveTo(0, 3, -17, -3); g.fill();
    // vene
    g.strokeStyle = 'rgba(70,10,30,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-10, -8); g.quadraticCurveTo(-14, -22, -6, -34); g.moveTo(9, -6); g.quadraticCurveTo(13, -20, 6, -30); g.moveTo(-3, -42); g.quadraticCurveTo(2, -46, 6, -40); g.stroke();
    // vestiti strappati
    g.fillStyle = col; g.beginPath(); g.moveTo(-17, -3); g.lineTo(-17.5, -12); for (let i = 0; i <= 8; i++) g.lineTo(-17 + i * 4.25, -12 - (i % 2 ? 5 : 0)); g.lineTo(17, -3); g.quadraticCurveTo(0, 3, -17, -3); g.fill();
    // bocca verticale con i denti (si apre e si chiude)
    const m = 0.45 + 0.55 * Math.abs(Math.sin(t * 5)), mx = f * 4;
    g.fillStyle = '#3a0612'; g.beginPath(); g.ellipse(mx, -26, 4 + 4 * m, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#c0142a'; g.beginPath(); g.ellipse(mx, -22, 2.5 * m + 1, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#f4efe2';
    for (let i = 0; i < 6; i++) { const yy = -36 + i * 4; for (const sd of [-1, 1]) { const ex = mx + sd * (3.6 + 3.6 * m) * Math.sqrt(Math.max(0, 1 - Math.pow((yy + 26) / 13, 2))); g.beginPath(); g.moveTo(ex, yy - 1.4); g.lineTo(ex, yy + 1.4); g.lineTo(ex - sd * 2.6, yy); g.fill(); } }
    // occhi
    for (const [ex, ey, r] of [[-9, -38, 2.2], [-12, -28, 1.6], [12, -36, 2], [9, -44, 1.5], [14, -26, 1.4], [-4, -45, 1.3]]) { g.fillStyle = '#f2d24a'; g.beginPath(); g.arc(f * ex, ey, r, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(f * ex + f * 0.4, ey, r * 0.35, r * 0.8, 0, 0, 7); g.fill(); }
    tent(-0.2, 26, 2.4, 5.5, 0); tent(-2.9 + 0.1, 24, 5.3, 5, 0);
    g.restore();
  }

  // ================= REGOLE =================
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const roomAt = (x, y) => (cqRoomOf[Math.floor(y)] || [])[Math.floor(x)];
  const isOut = (x, y) => { const r = roomAt(x, y); return r === 0 || r === 12 || r == null || r < 0; };
  const outC = c => { const p = P(c); return isOut(p.x, p.y); };
  const things = G => G.chars.filter(c => c.th && c.alive);
  const humans = G => G.chars.filter(c => !c.th && c.alive);
  const dispId = c => c.disg ? c.disg.id : c.id;
  const dispName = (G, c) => { const d = byId(G, dispId(c)); return d ? d.name : c.name; };
  const near = (c, x, y, r) => { const p = P(c); return Math.hypot(p.x - x - 0.5, p.y - y - 0.5) < r; };
  const MP = () => CQ_MAP;
  const genOn = G => G.gen.on;
  const padIn = (x, y) => x > 37.6 && x < 46.4 && y > 43.6 && y < 50.4;
  const busy = G => !!(G.mt || G.out);

  // cronaca: l'host scrive (G.lg), ognuno la racconta dal suo punto di vista (le cose segrete solo a chi le deve sapere)
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 12) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, b = s => '<b>' + esc(s || '') + '</b>';
    let t = '';
    if (e.k === 'kill') {
      if (e.v === me.id) t = '👾 La Cosa ti ha preso! Ora sei un fantasma: guarda come va a finire (gli altri non ti sentono).';
      else if (me.th && e.a !== me.id) t = '👾 L\'altra Cosa ha preso ' + b(e.vn) + '.';
      if (e.v === me.id || Math.hypot(e.x - cq.x, e.y - cq.y) < 7) { beep(110, 0.35, 0.05, 0, 'sawtooth'); beep(80, 0.5, 0.05, 0.2, 'sawtooth'); }
    } else if (e.k === 'abs') { if (e.a === me.id) t = '🎭 Hai assorbito ' + b(e.vn) + ': ora tutti ti vedono come ' + b(e.vn) + '.'; else if (me.th) t = '🎭 L\'altra Cosa ora sembra ' + b(e.vn) + '.'; }
    else if (e.k === 'rep') { t = '📢 ' + b(e.an) + ' ha trovato il corpo di ' + b(e.vn) + ' ' + (e.r || '') + '! Riunione in Mensa.'; beep(880, 0.15, 0.05); beep(660, 0.15, 0.05, 0.18); beep(880, 0.25, 0.05, 0.36); }
    else if (e.k === 'tq') { if (e.a === me.id) t = '🧪 Esame pronto: serve un compagno accanto al bancone.'; else if (e.i === me.id) t = '🧪 ' + b(e.an) + ' ti chiede di fare l\'esame del sangue: vai al bancone del laboratorio e premi Esame! (se non ci vai, sembrerai sospetto)'; else if (Math.hypot(e.x - cq.x, e.y - cq.y) < 9) t = '🧪 ' + b(e.an) + ' vuole fare l\'esame del sangue: avvicinati al bancone del laboratorio!'; }
    else if (e.k === 'tgo') { if (e.a === me.id || e.b === me.id) t = '🧪 Esame in corso: restate fermi accanto al bancone per ' + TEST + ' secondi…'; }
    else if (e.k === 'tx') { if (e.a === me.id || e.b === me.id) t = '🧪 Esame interrotto: ' + (e.why || 'qualcuno si è allontanato') + '. Il kit non è stato usato.'; }
    else if (e.k === 'tres') {
      const A = e.ra ? '<b style="color:#ff6a5a">' + esc(e.an) + ' è LA COSA!</b>' : b(e.an) + ' è umano', B = e.rb ? '<b style="color:#ff6a5a">' + esc(e.bn) + ' è LA COSA!</b>' : b(e.bn) + ' è umano';
      t = '🧪 Esame del sangue: ' + A + ' · ' + B + '.';
      if (e.ra || e.rb) { beep(220, 0.4, 0.06, 0, 'sawtooth'); beep(160, 0.6, 0.06, 0.3, 'sawtooth'); } else { beep(784, 0.12, 0.04); beep(1047, 0.2, 0.04, 0.12); }
    } else if (e.k === 'burn') {
      t = e.th ? '🔥 ' + b(e.bn) + ' ha bruciato ' + b(e.an) + ': ' + (e.real && e.real !== e.an ? 'era LA COSA (in realtà ' + b(e.real) + ')!' : 'era LA COSA!') : '🔥 ' + b(e.bn) + ' ha bruciato ' + b(e.an) + '… ed era umano! Il lanciafiamme torna in magazzino.';
      G.fx.push({ k: 'fl', a: [e.sx, e.sy], b: [e.x, e.y], t: performance.now() });
      beep(140, 0.5, 0.05, 0, 'sawtooth'); beep(200, 0.3, 0.04, 0.1, 'square');
    } else if (e.k === 'miss') { if (e.a === me.id) t = '🔥 Fiammata a vuoto! Colpi rimasti: ' + e.n; G.fx.push({ k: 'fl', a: [e.sx, e.sy], b: [e.x, e.y], t: performance.now() }); beep(150, 0.3, 0.04, 0, 'sawtooth'); }
    else if (e.k === 'take') { t = '🔥 ' + b(e.an) + ' ha preso il lanciafiamme (' + e.n + (e.n === 1 ? ' colpo' : ' colpi') + ').'; }
    else if (e.k === 'sab') { t = '⚡ Il generatore si è spento! Buio e freddo anche dentro: ripariamolo!'; beep(300, 0.2, 0.05, 0, 'square'); beep(200, 0.4, 0.05, 0.22, 'square'); }
    else if (e.k === 'fix') { t = '⚡ Generatore riparato: luce e caldo tornano.'; beep(523, 0.1, 0.04); beep(784, 0.18, 0.04, 0.1); }
    else if (e.k === 'frz') { if (e.v === me.id) t = '🥶 Sei morto congelato! Ora sei un fantasma.'; }
    else if (e.k === 'heli') { t = '🚁 L\'elicottero sta arrivando alla piazzola (a sud, fuori dall\'Ingresso)! Parte allo scadere: chi è sulla piazzola si salva.'; for (let i = 0; i < 4; i++) beep(90, 0.08, 0.04, i * 0.12, 'sawtooth'); }
    else if (e.k === 'mend') t = '📢 Riunione finita: si riparte.';
    if (t) cqToast(t);
  }

  // ---- azioni (sull'host o da solo) ----
  function body(G, v, k) {
    const q = P(v); G.bodies.push({ id: v.id, x: q.x, y: q.y, face: v === G.me ? cq.face : v.face, look: cqLookOf(v), name: v.name, t: G.time, nk: 1, k: k || 0 });
  }
  function die(G, v, k) { v.alive = false; v.path = []; v.walk = 0; v.dt = G.time; v.how = k; body(G, v, k); if (G.test && (G.test.a === v.id || G.test.b === v.id)) { G.test = null; } }
  // testimoni: un altro umano vivo vicino, nella stessa stanza (fuori nella bufera solo molto vicino; al buio meno)
  function witness(G, k, v) {
    const p = P(k), rk = roomAt(p.x, p.y), out = isOut(p.x, p.y), R = out ? SEE_OUT - 0.6 : genOn(G) ? WIT : 3.8;
    return G.chars.some(h => h.alive && !h.th && h !== v && h !== k && (() => { const q = P(h), d = Math.hypot(q.x - p.x, q.y - p.y); return d < R && (out ? isOut(q.x, q.y) : roomAt(q.x, q.y) === rk || d < 2.5); })());
  }
  function canAtk(G, k) { return k.th && k.alive && !busy(G) && (k.kcd || 0) <= 0; }
  function atkTarget(G, k) {
    let best = null, bd = REACH + (k.rv ? 0.2 : 0);
    for (const c of humans(G)) { const d = dist(k, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  function attack(G, k, v) {
    if (!canAtk(G, k) || !v || !v.alive || v.th || dist(k, v) > REACH + 0.8) return false;
    if (!k.rv && witness(G, k, v)) return false;
    die(G, v, 0); k.kcd = k.rv ? KCD_RV : KCD; k.atkT = G.time; k.kl = (k.kl || 0) + 1; k.fresh = { id: v.id, t: G.time };
    const q = P(v); say(G, 'kill', { a: k.id, v: v.id, vn: v.name, x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 });
    return true;
  }
  // assorbire la propria vittima: il corpo sparisce, la Cosa prende il suo aspetto e il suo nome
  function absorb(G, k) {
    const f = k.fresh; if (!k.th || !k.alive || k.rv || !f || G.time - f.t > ABS_T || busy(G)) return false;
    const b = G.bodies.find(o => o.id === f.id); if (!b || Math.hypot(P(k).x - b.x, P(k).y - b.y) > 1.6) return false;
    G.bodies = G.bodies.filter(o => o !== b); k.disg = { id: f.id, until: 1e9 }; if (k === G.me) G.disg = k.disg; k.fresh = null; k.atkT = G.time;
    say(G, 'abs', { a: k.id, vn: byId(G, f.id).name });
    return true;
  }
  const bodyNear = (G, c) => { const p = P(c); return G.bodies.find(b => Math.hypot(b.x - p.x, b.y - p.y) < 1.6); };
  function report(G, c) {
    const b = bodyNear(G, c); if (!b || !c.alive || busy(G)) return false;
    const R = MP().ring, ids = [];
    // sospetti: chi era vicino al corpo quando e' stato trovato
    for (const o of G.chars) if (o.alive && o !== c && Math.hypot(P(o).x - b.x, P(o).y - b.y) < 8) ids.push(dispId(o));
    G.sus = G.sus || {}; for (const i of ids) G.sus[i] = (G.sus[i] || 0) + 1;
    const vic = byId(G, b.id); G.dead.push(b.name);
    for (const o of G.bodies) if (!G.dead.includes(o.name)) G.dead.push(o.name);
    G.bodies = []; G.test = null;
    const live = G.chars.filter(o => o.alive), pres = live.map(o => dispName(G, o));
    G.mt = { end: G.time + MEET, an: dispName(G, c), vn: vic.name, r: CQ_IN[cqRoomName(b.x, b.y)] || '', ok: [], pres, dead: G.dead.slice(), miss: G.chars.filter(o => !pres.includes(o.name) && !G.dead.includes(o.name)).map(o => o.name), res: G.res.slice() };
    live.forEach((o, i) => { const [x, y] = R[i % R.length]; o.x = x + 0.5; o.y = y + 0.5; o.path = []; if (o === G.me) { cq.x = o.x; cq.y = o.y; } });
    G.ep++;
    say(G, 'rep', { an: G.mt.an, vn: G.mt.vn, r: G.mt.r }); meetUI(G);
    for (const o of G.chars) if (o.th) o.kcd = Math.max(o.kcd || 0, KCD * 0.6);
    return true;
  }
  function meetOk(G, c) { if (G.mt && c.alive && !G.mt.ok.includes(c.id)) G.mt.ok.push(c.id); }
  function meetEnd(G) { G.mt = null; say(G, 'mend', {}); if ($('#ctOk')) cqCloseTask(); }
  // esame del sangue: chi lo chiede (a) e un compagno (b) fermi accanto al bancone
  // inv = chi viene invitato (i computer invitano chi hanno vicino; se l'invitato non arriva diventa sospetto)
  function testAsk(G, c, inv) {
    const B = MP().bench; if (!c.alive || busy(G) || G.kits <= 0 || !near(c, B.x, B.y, BENCH)) return false;
    if (G.test && G.test.a !== c.id && G.test.b == null) { G.test.b = c.id; G.test.p = 0; say(G, 'tgo', { a: G.test.a, b: c.id }); return true; }
    if (G.test) return false;
    G.test = { a: c.id, b: null, p: 0, t0: G.time, inv: inv ? inv.id : null };
    const q = P(c); say(G, 'tq', { a: c.id, an: dispName(G, c), x: q.x, y: q.y, i: inv ? inv.id : -1 });
    return true;
  }
  function testTick(G, dt) {
    const T = G.test; if (!T) return; const B = MP().bench, A = byId(G, T.a), Bc = T.b != null ? byId(G, T.b) : null;
    if (!A || !A.alive || !near(A, B.x, B.y, BENCH + 0.5)) { const b = T.b; G.test = null; say(G, 'tx', { a: T.a, b, why: 'chi lo aveva chiesto si è allontanato' }); return; }
    if (!Bc) { if (G.time - T.t0 > 22) { const I = T.inv != null && byId(G, T.inv); if (I && I.alive) G.sus[dispId(I)] = (G.sus[dispId(I)] || 0) + 2; G.test = null; say(G, 'tx', { a: T.a, why: I ? esc(dispName(G, I)) + ' non è venuto' : 'nessun compagno è arrivato' }); } return; }   // il compagno entra premendo il pulsante (nessuno ci finisce dentro per sbaglio)
    if (!Bc.alive || !near(Bc, B.x, B.y, BENCH + 0.5)) { G.test = null; say(G, 'tx', { a: T.a, b: T.b }); return; }
    T.p += dt / TEST;
    if (T.p >= 1) {
      G.test = null; G.kits--; setKits(G);
      for (const c of [A, Bc]) { if (c.th) c.rv = true; G.res.push([dispName(G, c), c.th ? 1 : 0]); if (!c.th) G.clear[dispId(c)] = 1; }
      say(G, 'tres', { an: dispName(G, A), bn: dispName(G, Bc), ra: A.th ? 1 : 0, rb: Bc.th ? 1 : 0 });
    }
  }
  function setKits(G) { const p = CQ_PROPS.find(p => p[0] === 'blood'); if (p) { p[3].n = G.kits; const B = MP().bench; cqBgCell(B.x, B.y); } }
  function setRack(G) { const p = CQ_PROPS.find(p => p[0] === 'flamer'); if (p) { const on = G.fl.h < 0 && G.fl.n > 0; if (p[3].on !== on) { p[3].on = on; cqBgCell(MP().flamer.x, MP().flamer.y); } } }
  function setGen(G) { const p = CQ_PROPS.find(p => p[0] === 'pgen'); if (p && p[3].on !== G.gen.on) { p[3].on = G.gen.on; cqBgCell(MP().gen.x, MP().gen.y); } }
  function take(G, c) {
    const F = MP().flamer; if (!c.alive || busy(G) || G.fl.h >= 0 || G.fl.n <= 0 || !near(c, F.x, F.y, 1.6)) return false;
    G.fl.h = c.id; setRack(G); say(G, 'take', { an: dispName(G, c), n: G.fl.n }); return true;
  }
  function flTarget(G, c) {
    let best = null, bd = FLR;
    for (const o of G.chars) { if (o === c || !o.alive) continue; const d = dist(c, o); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  function burn(G, c, v) {
    if (G.fl.h !== c.id || !c.alive || busy(G) || G.fl.n <= 0) return false;
    const p = P(c); G.fl.n--;
    if (!v || !v.alive || dist(c, v) > FLR + 0.7) { const q = { x: p.x + (c === G.me ? cq.wdx || 0.7 : 0.7) * 2, y: p.y + (c === G.me ? cq.wdy || 0.7 : 0.7) * 2 }; say(G, 'miss', { a: c.id, n: G.fl.n, sx: p.x, sy: p.y, x: q.x, y: q.y }); if (G.fl.n <= 0) G.fl.h = -1; return true; }
    const q = P(v), an = dispName(G, v), real = v.name;
    die(G, v, 1);
    if (v.th) { v.burned = 1; c.bt = (c.bt || 0) + 1; say(G, 'burn', { th: 1, an, real, bn: dispName(G, c), sx: p.x, sy: p.y, x: q.x, y: q.y }); if (G.fl.n <= 0) G.fl.h = -1; }
    else { c.ff = (c.ff || 0) + 1; G.fl.h = -1; say(G, 'burn', { th: 0, an, bn: dispName(G, c), sx: p.x, sy: p.y, x: q.x, y: q.y }); }
    setRack(G);
    return true;
  }
  function sabotage(G, c) {
    const Gp = MP().gen; if (!c.th || !c.alive || busy(G) || !G.gen.on || G.time < G.gen.cd || !near(c, Gp.x, Gp.y, 2.2)) return false;
    G.gen.on = false; G.gen.p = 0; G.gen.cd = G.time + SAB_CD; setGen(G); say(G, 'sab', {}); return true;
  }

  // ---- personaggi del computer ----
  function go(c, x, y) { c.path = cqPath(c.x, c.y, x, y); if (!c.path.length) c.path = [[x, y]]; }
  const spotNear = (x, y) => cqSpot(x, y);
  function rndRoomSpot(G, inside) {
    for (let i = 0; i < 40; i++) { const R = CQ_ROOMS[inside ? 1 + Math.floor(Math.random() * 11) : Math.floor(Math.random() * CQ_ROOMS.length)], x = R.x + Math.floor(Math.random() * R.w), y = R.y + Math.floor(Math.random() * R.h); if (cqCellFree(x, y)) return { x: x + 0.5, y: y + 0.5 }; }
    return { x: 30.5, y: 21.5 };
  }
  function padSpot() { for (let i = 0; i < 30; i++) { const x = 39 + Math.floor(Math.random() * 6), y = 45 + Math.floor(Math.random() * 4); if (cqCellFree(x, y)) return { x: x + 0.5, y: y + 0.5 }; } return { x: 42.5, y: 47.5 }; }
  const seesP = (G, c, x, y) => { const d = Math.hypot(x - c.x, y - c.y), o = isOut(c.x, c.y); return o || isOut(x, y) ? d < SEE_OUT : genOn(G) ? d < 9 && (roomAt(c.x, c.y) === roomAt(x, y) || d < 3) : d < (c.th ? 7 : 4); };
  function botHuman(G, c) {
    const B = MP().bench, Gp = MP().gen, F = MP().flamer;
    if (G.left < 50) { if (!padIn(c.x, c.y) && (!c.path.length || !c.toPad)) { const s = padSpot(); c.toPad = 1; go(c, s.x, s.y); } return; }
    if (G.test && G.test.b === c.id) { c.path = []; return; }
    if (G.test && G.test.a === c.id) { if (!near(c, B.x, B.y, BENCH - 0.3) && !c.path.length) { const s = spotNear(B.x, B.y - 1); go(c, s.x, s.y); } return; }
    // esame del sangue: se mi hanno invitato ci vado subito (un umano non ha niente da nascondere)
    if (G.test && G.test.b == null && G.test.inv === c.id) { if (near(c, B.x, B.y, BENCH - 0.3)) { c.path = []; testAsk(G, c); } else if (!c.path.length) { const p = spotNear(B.x, B.y + 1); go(c, p.x, p.y); } return; }
    // un mostro scoperto qui vicino
    const rv = things(G).find(k => k.rv && dist(k, c) < 9 && seesP(G, c, k.x, k.y));
    // il sospetto piu' forte (chi era vicino ai corpi, chi ha rifiutato l'esame), se non e' stato esaminato
    const sus = G.chars.filter(o => o !== c && o.alive && !G.clear[dispId(o)] && (G.sus[dispId(o)] || 0) >= 2).sort((a, b) => (G.sus[dispId(b)] || 0) - (G.sus[dispId(a)] || 0))[0];
    if (G.fl.h === c.id) {
      const tg = rv || (sus && dist(sus, c) < 12 ? sus : null);
      if (tg) { if (dist(tg, c) < FLR - 0.2) { if (tg.rv || Math.random() < 0.35) { c.path = []; burn(G, c, tg); } } else go(c, tg.x, tg.y); return; }
    } else if (rv && dist(rv, c) < 5) { const a = Math.atan2(c.y - rv.y, c.x - rv.x); for (let i = 0; i < 8; i++) { const x = Math.floor(c.x + Math.cos(a + (i - 4) * 0.3) * 5), y = Math.floor(c.y + Math.sin(a + (i - 4) * 0.3) * 5); if (cqCellFree(x, y)) { go(c, x + 0.5, y + 0.5); break; } } return; }
    // c'e' una Cosa scoperta o un sospetto forte: qualcuno va a prendere il lanciafiamme
    if ((things(G).some(k => k.rv) || sus) && G.fl.h < 0 && G.fl.n > 0 && (c.id % 2 === 0 || dist(c, { x: F.x, y: F.y }) < 10)) { if (near(c, F.x, F.y, 1.5)) take(G, c); else if (!c.path.length) { const p = spotNear(F.x, F.y); go(c, p.x, p.y); } return; }
    // corpo visto: si va a segnalarlo
    const bd = G.bodies.find(b => seesP(G, c, b.x, b.y) && Math.hypot(b.x - c.x, b.y - c.y) < 8);
    if (bd) { if (Math.hypot(bd.x - c.x, bd.y - c.y) < 1.4) { c.path = []; report(G, c); } else go(c, bd.x, bd.y); return; }
    // freddo: dentro!
    if (outC(c) && (c.cold || 100) < 45) { if (!c.path.length || !c.warm) { c.warm = 1; const p = rndRoomSpot(G, true); go(c, p.x, p.y); } return; }
    c.warm = 0;
    // generatore spento: chi e' vicino va a ripararlo
    if (!genOn(G) && (c.id % 3 !== 0 || Math.hypot(c.x - Gp.x, c.y - Gp.y) < 14)) { if (!near(c, Gp.x, Gp.y, 1.9)) { if (!c.path.length || !c.fix) { c.fix = 1; const p = spotNear(Gp.x - 1, Gp.y); go(c, p.x, p.y); } } else c.path = []; return; }
    c.fix = 0;
    // voglio fare l'esame: invito chi mi sta vicino (se non viene… sospetto!) e vado al bancone
    if (!G.test && G.kits > 0 && !G.clear[c.id] && G.time > 25 && !c.wantT && Math.random() < 0.03) {
      const o = G.chars.filter(o => o !== c && o.alive && !G.clear[dispId(o)] && dist(o, c) < 12).sort((a, b) => dist(a, c) - dist(b, c))[0];
      if (o) { c.wantT = o.id; const p = spotNear(B.x, B.y - 1); go(c, p.x, p.y); return; }
    }
    if (c.wantT) { if (near(c, B.x, B.y, BENCH)) { const o = byId(G, c.wantT); c.wantT = 0; if (o && o.alive) testAsk(G, c, o); } else if (!c.path.length) { const p = spotNear(B.x, B.y - 1); go(c, p.x, p.y); } return; }
    // in giro: quasi sempre in coppia con qualcuno (in compagnia si e' piu' sicuri… se il compagno e' umano)
    const bu = c.buddy != null && byId(G, c.buddy);
    if (bu && bu.alive && G.time < c.buT && !outC(bu)) { if (dist(bu, c) > 2.2 && (!c.path.length || Math.random() < 0.3)) go(c, bu.x + (Math.random() - 0.5) * 1.5, bu.y + (Math.random() - 0.5) * 1.5); return; }
    if (Math.random() < 0.6) { const o = G.chars.filter(o => o !== c && o.alive && !outC(o) && (G.sus[dispId(o)] || 0) < 2).sort((a, b) => dist(a, c) - dist(b, c))[Math.floor(Math.random() * 2)]; if (o) { c.buddy = o.id; c.buT = G.time + 20 + Math.random() * 25; return; } }
    c.buddy = null;
    if (!c.path.length) { const p = rndRoomSpot(G, Math.random() < 0.88); go(c, p.x, p.y); }
  }
  function botThing(G, c) {
    const Gp = MP().gen;
    if (c.rv) {   // scoperta: caccia aperta, scappa dal lanciafiamme
      const fh = G.fl.h >= 0 ? byId(G, G.fl.h) : null;
      if (fh && fh.alive && dist(fh, c) < 5) { const a = Math.atan2(c.y - fh.y, c.x - fh.x), x = Math.floor(c.x + Math.cos(a) * 5), y = Math.floor(c.y + Math.sin(a) * 5); if (cqCellFree(x, y)) go(c, x + 0.5, y + 0.5); return; }
      const v = humans(G).sort((a, b) => dist(a, c) - dist(b, c))[0];
      if (v) { if (dist(v, c) < REACH && canAtk(G, c)) attack(G, c, v); else go(c, v.x, v.y); }
      return;
    }
    if (G.left < 50) { if (!padIn(c.x, c.y) && (!c.path.length || !c.toPad)) { const s = padSpot(); c.toPad = 1; go(c, s.x, s.y); } return; }
    if (G.test && G.test.b === c.id) { c.path = []; return; }
    if (G.test && G.test.inv === c.id && G.test.b == null && (c.bluff == null ? (c.bluff = Math.random() < 0.12) : c.bluff)) { const B = MP().bench; if (near(c, B.x, B.y, BENCH - 0.3)) { c.path = []; testAsk(G, c); } else if (!c.path.length) { const p = spotNear(B.x, B.y + 1); go(c, p.x, p.y); } return; }
    if (!G.test) c.bluff = null;
    // appena preso qualcuno: a volte lo assorbe, a volte scappa
    if (c.fresh && G.time - c.fresh.t < ABS_T) {
      if (c.wabs == null) c.wabs = Math.random() < 0.4;
      const b = G.bodies.find(o => o.id === c.fresh.id);
      if (c.wabs && b) { if (Math.hypot(b.x - c.x, b.y - c.y) < 1.3) { if (!witness(G, c, null)) absorb(G, c); } else go(c, b.x, b.y); return; }
      if (!c.path.length) { const s = rndRoomSpot(G, true); go(c, s.x, s.y); }
      return;
    }
    c.wabs = null;
    // sabotaggio del generatore ogni tanto
    if (genOn(G) && G.time > G.gen.cd && G.time > 50 && (c.wsab || Math.random() < 0.01)) {
      c.wsab = 1; if (near(c, Gp.x, Gp.y, 2)) { if (!witness(G, c, null)) { sabotage(G, c); c.wsab = 0; } } else if (!c.path.length) { const s = spotNear(Gp.x + 1, Gp.y); go(c, s.x, s.y); }
      return;
    }
    c.wsab = 0;
    // corpo altrui: a volte lo segnala per sembrare innocente
    const bd = G.bodies.find(b => Math.hypot(b.x - c.x, b.y - c.y) < 1.4 && (!c.fresh || b.id !== c.fresh.id));
    if (bd && Math.random() < 0.3) { report(G, c); return; }
    // caccia: una vittima da sola
    if ((c.kcd || 0) <= 2) {
      const v = c.prey && byId(G, c.prey);
      if (v && v.alive && !v.th) {
        if (dist(v, c) < REACH && canAtk(G, c)) { if (attack(G, c, v)) { c.prey = null; c.path = []; } else if (Math.random() < 0.15) c.prey = null; return; }
        if (!c.path.length || Math.random() < 0.35) go(c, v.x, v.y);
        if (Math.random() < 0.02) c.prey = null;
        return;
      }
      const alone = humans(G).filter(h => !G.chars.some(o => o !== h && o !== c && o.alive && !o.th && dist(o, h) < WIT)).sort((a, b) => dist(a, c) - dist(b, c))[0];
      if (alone) { c.prey = alone.id; go(c, alone.x, alone.y); return; }
    }
    if (!c.path.length) { if (Math.random() < 0.5) { const o = humans(G).sort(() => Math.random() - 0.5)[0]; if (o) { go(c, o.x, o.y); return; } } const s = rndRoomSpot(G, Math.random() < 0.9); go(c, s.x, s.y); }
  }

  // ---- riunione: pannello per tutti ----
  function meetUI(G) {
    const m = G.mt; if (!m) return;
    const list = (a, e) => a.length ? a.map(n => esc(n)).join(', ') : '<i>' + e + '</i>';
    cqCloseTask();
    $('#tkTitle').textContent = '📢 Riunione in Mensa';
    $('#tkBody').innerHTML = `<p class="lead"><b>${esc(m.an)}</b> ha trovato il corpo di <b>${esc(m.vn)}</b> ${esc(m.r)}.</p>
      <p class="hint">🗣️ Parlate in vocale (adesso vi sentite tutti): chi era dove? Non si vota: alla fine si riparte. Se avete dei sospetti… c'è l'esame del sangue, oppure il lanciafiamme.</p>
      <div class="row"><div class="lbl">🧪 Esami del sangue</div>${m.res.length ? m.res.map(r => r[1] ? '<b style="color:#ff6a5a">' + esc(r[0]) + ': LA COSA</b>' : '<span style="color:#7be0a0">' + esc(r[0]) + ': umano</span>').join(' · ') : '<i>nessuno, per ora</i>'}</div>
      <div class="row"><div class="lbl">🙋 All'appello</div>${list(m.pres, 'nessuno')}</div>
      <div class="row"><div class="lbl">💀 Morti</div>${list(m.dead, 'nessuno')}</div>
      ${m.miss.length ? '<div class="row"><div class="lbl">❓ Dispersi (nessun corpo trovato)</div>' + list(m.miss, '') + '</div>' : ''}
      <p class="hint" style="text-align:center">Si riparte tra <b id="ctMt">${Math.ceil(m.end - G.time)}</b> s</p>
      <div class="mtAct"><button class="btn primary" id="ctOk" type="button">✅ Ho finito di parlare</button></div>`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#tkClose').onclick = cqCloseTask; $('#cqTask').hidden = false;
    $('#ctOk').onclick = () => { if (G.guest) cqNetSend({ k: 'ok' }); else meetOk(G, G.me); G.myOk = G.mt && G.mt.end; $('#ctOk').disabled = true; $('#ctOk').textContent = '✅ Aspetto gli altri…'; };
    if (!G.me.alive) $('#ctOk').hidden = true;
  }

  // ---- elicottero (disegnato sopra alla mappa): alt = altezza in tessere ----
  function heli(g, X, Y, TW, alt, rot, mon) {
    const u = TW / 34, H = alt * TW;
    g.fillStyle = 'rgba(0,0,0,' + Math.max(0.08, 0.32 - alt * 0.03) + ')'; g.beginPath(); g.ellipse(X, Y, (60 - Math.min(30, alt * 3)) * u, (22 - Math.min(10, alt)) * u, 0, 0, 7); g.fill();
    g.save(); g.translate(X, Y - H - 18 * u); g.scale(u, u);
    g.strokeStyle = '#2a2e35'; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, 22); g.lineTo(30, 22); g.moveTo(-30, 30); g.lineTo(34, 30); g.moveTo(-20, 12); g.lineTo(-22, 24); g.moveTo(14, 12); g.lineTo(12, 24); g.moveTo(-14, 16); g.lineTo(-16, 30); g.moveTo(20, 16); g.lineTo(18, 30); g.stroke();
    g.fillStyle = '#b8261c'; g.beginPath(); g.moveTo(20, -6); g.lineTo(78, -22); g.lineTo(80, -14); g.lineTo(24, 6); g.fill();   // coda
    g.fillStyle = '#d23b2f'; g.beginPath(); g.ellipse(80, -24, 4, 12, 0.3, 0, 7); g.fill();
    g.fillStyle = '#d23b2f'; g.beginPath(); g.ellipse(0, 0, 38, 20, 0, 0, 7); g.fill();
    g.fillStyle = '#f2f2f2'; g.fillRect(-36, 2, 72, 5);
    g.fillStyle = '#9fd3ef'; g.beginPath(); g.ellipse(-24, -4, 14, 12, 0, Math.PI * 0.9, Math.PI * 2.05); g.fill();
    g.fillStyle = '#2a2e35'; g.fillRect(-4, -12, 18, 16);   // porta
    if (mon) {   // la Cosa a bordo: tentacoli dalla porta
      const t = performance.now() / 1000; g.strokeStyle = '#9a3048'; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.lineWidth = 5 - i; g.beginPath(); g.moveTo(5, -4 + i * 4); g.quadraticCurveTo(18 + Math.sin(t * 4 + i) * 6, -10 + i * 8, 28 + Math.sin(t * 3 + i) * 8, -2 + i * 10); g.stroke(); }
      g.fillStyle = '#f2d24a'; g.beginPath(); g.arc(2, -6, 2, 0, 7); g.arc(9, -8, 1.6, 0, 7); g.fill();
    }
    g.fillStyle = '#3a3f49'; g.fillRect(-3, -26, 6, 8);
    g.strokeStyle = 'rgba(40,44,52,.75)'; g.lineWidth = 3.5; g.beginPath();
    for (const k of [0, Math.PI / 2]) { const a = rot + k; g.moveTo(-Math.cos(a) * 70, -26 - Math.sin(a) * 26); g.lineTo(Math.cos(a) * 70, -26 + Math.sin(a) * 26); }
    g.stroke();
    g.restore();
  }

  // freccia sul bordo dello schermo verso qualcosa che e' fuori
  function edge(g, X, Y, W, H, icon, col) {
    const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
    const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
    g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
    g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
  }

  // il pulsante grande: cosa posso fare adesso (in ordine di importanza)
  function action(G) {
    const me = G.me; if (!me.alive || G.out) return null;
    if (G.mt) return null;
    const B = MP().bench, F = MP().flamer, Gp = MP().gen;
    if (me.th && !me.rv && me.fresh && G.time - me.fresh.t < ABS_T) { const b = G.bodies.find(o => o.id === me.fresh.id); if (b && Math.hypot(b.x - cq.x, b.y - cq.y) < 1.6) return { k: 'abs', t: '🎭 Assorbi ' + byId(G, b.id).name, on: true }; }
    if (me.th) { const v = atkTarget(G, me); if (v) { const w = !me.rv && witness(G, me, v); return { k: 'atk', v, t: (me.kcd || 0) > 0 ? '🩸 ' + Math.ceil(me.kcd) + ' s' : w ? '🩸 Ti vedono!' : '🩸 Attacca', on: (me.kcd || 0) <= 0 && !w }; } }
    if (G.bodies.length && bodyNear(G, me)) return { k: 'rep', t: '📢 Segnala il corpo', on: true };
    if (G.fl.h === me.id) { const v = flTarget(G, me); return { k: 'burn', v, t: '🔥 Brucia (' + G.fl.n + ')', on: true }; }
    if (G.fl.h < 0 && G.fl.n > 0 && near(me, F.x, F.y, 1.6)) return { k: 'take', t: '🔥 Prendi il lanciafiamme', on: true };
    if (me.th && genOn(G) && near(me, Gp.x, Gp.y, 2.2)) return { k: 'sab', t: G.time < G.gen.cd ? '⚡ ' + Math.ceil(G.gen.cd - G.time) + ' s' : '⚡ Spegni il generatore', on: G.time >= G.gen.cd };
    if (G.kits > 0 && near(me, B.x, B.y, BENCH)) { const T = G.test; return { k: 'test', t: T ? (T.a === me.id || T.b === me.id ? '🧪 Esame in corso…' : T.b == null ? '🧪 Fai l\'esame con ' + dispName(G, byId(G, T.a)) : '🧪 Bancone occupato') : '🧪 Esame del sangue (' + G.kits + ')', on: !T || (T.b == null && T.a !== me.id) }; }
    if (me.th) return { k: 'atk', t: (me.kcd || 0) > 0 ? '🩸 ' + Math.ceil(me.kcd) + ' s' : '🩸 Attacca', on: false };
    return null;
  }

  CQ_MODES.cosa = {
    n: 'La Cosa',
    desc: '❄️ Stazione di ricerca in Antartide, fuori la bufera. Uno di voi è <b>LA COSA</b> (due se siete in 8 o più): elimina in segreto chi resta da solo e può <b>assorbirlo</b>, prendendone aspetto e nome. 📢 Chi trova un corpo chiama la <b>riunione</b> (niente voto: si parla in vocale). 🧪 L\'<b>esame del sangue</b> si fa in due al bancone del laboratorio (pochi kit). 🔥 Un solo <b>lanciafiamme</b> in magazzino, 2 colpi: se bruci un innocente muore e perdi l\'arma. 🥶 Fuori si gela; dentro fa caldo finché va il <b>generatore</b>. 🚁 Allo scadere l\'elicottero parte dalla piazzola con chi c\'è sopra: se a bordo c\'è una Cosa non scoperta, vince lei!',
    maps: [['base', 'Base polare']],
    def: { time: 360, nt: 'auto', kits: 3, me: 'rnd', map: 'base', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Quante Cose</div>${seg('nt', [['auto', 'Auto (2 da 8 in su)'], ['1', '1'], ['2', '2']], String(o.nt || 'auto'))}</div>
      <div class="row"><div class="lbl">Kit per l'esame del sangue</div>${seg('kits', [[2, '2'], [3, '3'], [4, '4']], o.kits || 3)}</div>${cq.net ? '' : '<div class="row"><div class="lbl">Il mio ruolo</div>' + seg('me', [['rnd', 'A caso'], ['h', 'Squadra'], ['t', 'La Cosa']], o.me || 'rnd') + '</div>'}
      <div class="row"><div class="lbl">Durata (poi arriva l'elicottero)</div>${seg('time', [[300, '5:00'], [360, '6:00'], [420, '7:00']], o.time || 360)}</div>`,
    read: d => ({ time: +d.get('time') || 360, nt: d.get('nt') || 'auto', kits: +d.get('kits') || 3, me: d.get('me') || 'rnd' }),
    start(G) {
      const n = G.chars.length, nt = Math.max(1, Math.min(G.opt.nt === '2' ? 2 : G.opt.nt === '1' ? 1 : n >= 8 ? 2 : 1, Math.floor((n - 1) / 2)));
      const sh = G.chars.slice().sort(() => Math.random() - 0.5), mr = cq.net ? 'rnd' : G.opt.me;
      if (mr !== 'rnd') { sh.splice(sh.indexOf(G.me), 1); if (mr === 't') sh.unshift(G.me); else sh.push(G.me); }
      sh.forEach((c, i) => Object.assign(c, { th: i < nt, rv: false, disg: null, cold: 100, kcd: 30, kl: 0, atkT: -9, fresh: null, on: 0, prey: null }));
      G.disg = null;
      this.gstart(G);
      G.kits = G.opt.kits || 3; G.fl = { h: -1, n: 2 }; G.gen = { on: true, p: 0, cd: 45 };
      setKits(G); setRack(G); setGen(G);
    },
    gstart(G) {
      G.lg = []; G.lgN = 0; G.fx = []; G.left = G.opt.time || 360; G.res = []; G.clear = {}; G.dead = []; G.sus = {}; G.mt = null; G.test = null; G.out = null; G.heli = null;
      G.kits = G.opt.kits || 3; G.fl = { h: -1, n: 2 }; G.gen = { on: true, p: 0, cd: 45 }; G.flk = [];
      // la mappa si rimette com'era (kit, lanciafiamme, generatore)
      const p = CQ_PROPS.find(p => p[0] === 'blood'); if (p) p[3].n = G.kits; const q = CQ_PROPS.find(p => p[0] === 'flamer'); if (q) q[3].on = true; const r = CQ_PROPS.find(p => p[0] === 'pgen'); if (r) r[3].on = true; cq.bg = null;
      if (G.guest) for (const c of G.chars) { c.th = false; c.cold = 100; }
    },
    intro: G => G.me.th ? '👾 Sei LA COSA: elimina chi resta solo, non farti scoprire!' : '🧑‍🔬 Tra voi c\'è LA COSA. Fidati solo degli esami!',
    speed(c) { const G = cq.g; if (!G || busy(G)) return 0; if (!c.alive) return 1.15; return c.th && c.rv ? 1.12 : (c.cold || 100) < 25 && !c.th ? 0.82 : 1; },
    big(G) {
      const me = G.me;
      if (G.out) return G.out.thing ? '🚁 …' : '🚁 Decollo!';
      if (G.mt) return '';
      if (G.test && (G.test.a === me.id || G.test.b === me.id) && G.test.b != null) return '🧪 Esame… ' + Math.round(G.test.p * 100) + '%';
      if (G.heli && G.left > 0) return '🚁 L\'elicottero parte tra ' + Math.ceil(G.left) + ' s: alla piazzola!';
      if (!me.alive) return '';
      if (me.th && me.rv) return '👾 Ti hanno scoperta!';
      if (!genOn(G) && !me.th) return '⚡ Generatore spento: ripariamolo!';
      if (!me.th && me.cold < 30) return '🥶 Stai congelando: torna dentro!';
      return '';
    },
    hud(G) {
      const me = G.me, tm = G.mt ? '📢 ' + Math.max(0, Math.ceil(G.mt.end - G.time)) + ' s' : '⏱ ' + mmss(Math.max(0, G.left)), fl = G.fl.h === me.id ? ' · 🔥' + G.fl.n : '';
      if (G.mt) { const e = $('#ctMt'); if (e) e.textContent = Math.max(0, Math.ceil(G.mt.end - G.time)); }
      const cold = c => { const v = Math.round(c); return '<span style="color:' + (v < 30 ? '#ff7a6a' : v < 60 ? '#ffd27a' : '#9ad0ff') + '">❄️ ' + v + '%</span>'; };
      if (!me.alive) return '👻 <b>Fantasma</b> · vedi tutto (anche chi è la Cosa) · ' + tm;
      if (me.th) return '👾 <b style="color:#ff6a5a">' + (me.rv ? 'La Cosa (scoperta!)' : 'Sei LA COSA') + '</b>' + (me.disg ? ' · 🎭 ' + esc(dispName(G, me)) : '') + ' · 🩸 ' + ((me.kcd || 0) > 0 ? Math.ceil(me.kcd) + ' s' : 'pronta') + fl + ' · ' + tm;
      return '🧑‍🔬 <b style="color:#9ad0ff">Squadra</b> · ' + cold(me.cold == null ? 100 : me.cold) + ' · 🧪 ' + G.kits + fl + (genOn(G) ? '' : ' · <span style="color:#ff7a6a">⚡ spento</span>') + ' · ' + tm;
    },
    nameCol(c) {
      const G = cq.g;
      if (c.th && (c.rv || !G.me.alive)) return '#ff5a5a';
      if (G.me.th && c.th) return '#ff9a8a';
      if (G.clear[dispId(c)]) return '#7be0a0';
      return null;
    },
    draw(c) {
      const G = cq.g; if (!c.th || !c.alive || c.on) return null;
      if (c.rv || G.time - (c.atkT == null ? -9 : c.atkT) < ATK_SHOW || (!G.me.alive && G.me !== c)) return monster;
      return null;
    },
    hide: c => !!c.on,
    voice: G => G.mt ? 1 : null,
    btn(G) { const a = action(G); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const a = action(G); if (!a || !a.on) return; const me = G.me;
      if (G.time < (me.actH || 0)) return; me.actH = G.time + 0.5;
      const send = o => cqNetSend(o);
      switch (a.k) {
        case 'abs': if (G.guest) send({ k: 'abs' }); else absorb(G, me); break;
        case 'atk': if (G.guest) { send({ k: 'atk', id: a.v.id }); me.atkT = G.time; } else attack(G, me, a.v); break;
        case 'rep': if (G.guest) send({ k: 'rep' }); else report(G, me); break;
        case 'burn': if (G.guest) send({ k: 'burn', id: a.v ? a.v.id : -1 }); else burn(G, me, a.v); break;
        case 'take': if (G.guest) send({ k: 'take' }); else take(G, me); break;
        case 'sab': if (G.guest) send({ k: 'sab' }); else sabotage(G, me); break;
        case 'test': if (G.guest) send({ k: 'test' }); else testAsk(G, me); break;
      }
      beep(700, 0.05, 0.04);
    },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'atk') attack(G, c, byId(G, o.id));
      else if (o.k === 'abs') absorb(G, c);
      else if (o.k === 'rep') report(G, c);
      else if (o.k === 'burn') burn(G, c, o.id >= 0 ? byId(G, o.id) : null);
      else if (o.k === 'take') take(G, c);
      else if (o.k === 'sab') sabotage(G, c);
      else if (o.k === 'test') testAsk(G, c);
      else if (o.k === 'ok') meetOk(G, c);
    },
    tick(G, dt) {
      if (G.out) { if (G.time - G.out.t > 5.5) this.finish(G); return; }
      if (G.mt) {
        if (G.time >= G.mt.end || G.chars.every(c => !c.alive || c.bot || G.mt.ok.includes(c.id))) meetEnd(G);
        for (const c of G.chars) c.walk = 0;
        return;
      }
      G.left -= dt;
      if (!G.heli && G.left <= HELI_T) { G.heli = { t: G.time }; say(G, 'heli', {}); }
      if (G.left <= 0) { this.board(G); return; }
      // generatore: si ripara stando vicino (piu' in fretta in due)
      const Gp = MP().gen;
      if (!G.gen.on) {
        const n = G.chars.filter(c => c.alive && near(c, Gp.x, Gp.y, 2.2) && (!c.th || !c.bot)).length;   // anche una Cosa vera puo' far finta di riparare (e ripara davvero)
        if (n) { G.gen.p += dt / FIX * (n > 1 ? 1.6 : 1); if (G.gen.p >= 1) { G.gen.on = true; G.gen.p = 0; setGen(G); say(G, 'fix', {}); } }
      }
      // freddo (la Cosa non lo sente)
      for (const c of G.chars) {
        if (!c.alive) continue;
        if (c.th) { c.cold = 100; } else {
          const o = outC(c); c.cold = Math.max(0, Math.min(100, (c.cold == null ? 100 : c.cold) + dt * (o ? -2.1 : G.gen.on ? 5 : -0.65)));
          if (c.cold <= 0) { die(G, c, 2); say(G, 'frz', { v: c.id }); continue; }
        }
        if (c.kcd > 0) c.kcd -= dt;
      }
      testTick(G, dt);
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.4 + Math.random() * 0.2; c.th ? botThing(G, c) : botHuman(G, c); }
        cqModeStep(c, dt, (c.th && c.rv ? 1.08 : 0.94) * (!c.th && c.cold < 25 ? 0.82 : 1));
      }
      if (!things(G).length) this.finish(G, 'h', 'Tutte le Cose sono state bruciate!');
      else if (things(G).length >= humans(G).length) this.finish(G, 't', humans(G).length ? 'Le Cose sono tante quanti gli umani rimasti: la base è loro.' : 'Non è rimasto nessun umano.');
    },
    // allo scadere: sale chi e' sulla piazzola (una Cosa scoperta non la fanno salire)
    board(G) {
      const on = G.chars.filter(c => c.alive && padIn(P(c).x, P(c).y) && !(c.th && c.rv));
      for (const c of on) { c.on = 1; c.path = []; }
      G.out = { t: G.time, thing: on.some(c => c.th) ? 1 : 0, n: on.filter(c => !c.th).length };
    },
    finish(G, w, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      if (!w) {   // fine col decollo
        const O = G.out; w = O.thing || !O.n ? 't' : 'h';
        why = O.thing ? '🚁 L\'elicottero è partito… con una Cosa a bordo, travestita da umano!' : O.n ? '🚁 ' + O.n + (O.n === 1 ? ' umano è scappato' : ' umani sono scappati') + ' con l\'elicottero, senza la Cosa.' : '🚁 Nessuno è salito sull\'elicottero.';
      }
      const how = c => c.on ? '🚁 sull\'elicottero' : c.alive ? (G.out ? '❄️ rimasto alla base' : 'vivo') : c.how === 1 ? '🔥 bruciato' : c.how === 2 ? '🥶 congelato' : '💀 preso dalla Cosa';
      const line = c => [name(c), c.th ? '— 👾 la Cosa' + (c.disg ? ' (sembrava ' + byId(G, c.disg.id).name + ')' : '') + ' · 🩸 ' + (c.kl || 0) + ' prese · ' + how(c) : '— 🧑‍🔬 ' + how(c) + (c.bt ? ' · 🔥 ha bruciato la Cosa' : '') + (c.ff ? ' · 🔥 ha bruciato un innocente' : '')];
      const score = c => (c.on ? 100 : c.alive ? 50 : 0) + (c.kl || 0) * 10 + (c.bt || 0) * 30 - (c.ff || 0) * 20;
      const win = G.chars.filter(c => w === 't' ? c.th : !c.th);
      const rank = G.chars.slice().sort((a, b) => (win.includes(b) - win.includes(a)) || score(b) - score(a)).map(line);
      cqModeEnd(w === 't' ? { t: '👾 Vince la Cosa!', why, win: win.map(c => c.id), rank } : { t: '🧑‍🔬 Vince la squadra!', why, win: win.map(c => c.id), rank });
    },
    // online: Cosa?, scoperta, travestimento, freddo, ricarica, attacco (secondi fa), sull'elicottero, quante prese, morte
    csnap: c => { const G = cq.g; return [c.th ? 1 : 0, c.rv ? 1 : 0, c.disg ? c.disg.id : -1, Math.round(c.cold == null ? 100 : c.cold), Math.max(0, Math.ceil(c.kcd || 0)), Math.min(9, Math.round((G.time - (c.atkT == null ? -9 : c.atkT)) * 10) / 10), c.on ? 1 : 0, c.kl || 0, c.how || 0, c.fresh ? Math.round((G.time - c.fresh.t) * 10) / 10 : -1, c.fresh ? c.fresh.id : -1]; },
    capply(G, c, a) {
      c.th = !!a[0]; c.rv = !!a[1]; c.disg = a[2] >= 0 ? { id: a[2], until: 1e9 } : null; if (c === G.me) G.disg = c.disg;
      c.cold = a[3]; c.kcd = a[4]; if (!(c === G.me && G.time - (c.atkT || -9) < 1)) c.atkT = G.time - a[5]; c.on = a[6]; c.kl = a[7]; c.how = a[8];
      c.fresh = a[9] >= 0 ? { t: G.time - a[9], id: a[10] } : null;
    },
    snap: G => ({ bd: G.bodies.map(b => [b.id, Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.face, Math.round(b.t * 10) / 10, b.k || 0]), left: Math.round(G.left * 10) / 10, lg: G.lg,
      kt: G.kits, fl: [G.fl.h, G.fl.n], gn: [G.gen.on ? 1 : 0, Math.round(G.gen.p * 100) / 100, Math.round(G.gen.cd)], ts: G.test ? [G.test.a, G.test.b == null ? -1 : G.test.b, Math.round(G.test.p * 100) / 100] : 0,
      mt: G.mt, res: G.res, cl: Object.keys(G.clear).map(Number), he: G.heli ? 1 : 0, ou: G.out ? [G.out.t, G.out.thing, G.out.n] : 0 }),
    apply(G, x) {
      G.bodies = (x.bd || []).map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: a[4], k: a[5], nk: 1, look: cqLookOf(c), name: c.name } : null; }).filter(Boolean);
      G.left = x.left; G.res = x.res || []; G.clear = {}; for (const i of x.cl || []) G.clear[i] = 1;
      if (G.kits !== x.kt) { G.kits = x.kt; setKits(G); }
      if (x.fl) { G.fl = { h: x.fl[0], n: x.fl[1] }; setRack(G); }
      if (x.gn) { G.gen.on = !!x.gn[0]; G.gen.p = x.gn[1]; G.gen.cd = x.gn[2]; setGen(G); }
      G.test = x.ts ? { a: x.ts[0], b: x.ts[1] < 0 ? null : x.ts[1], p: x.ts[2] } : null;
      if (x.he && !G.heli) G.heli = { t: G.time - Math.max(0, HELI_T - G.left) };
      if (x.ou && !G.out) G.out = { t: x.ou[0], thing: x.ou[1], n: x.ou[2] };
      const was = G.mt; G.mt = x.mt || null; if (G.mt) for (const k of ['ok', 'pres', 'dead', 'miss', 'res']) G.mt[k] = G.mt[k] || [];
      if (G.mt && (!was || was.end !== G.mt.end)) meetUI(G);
      if (!G.mt && was && $('#ctOk')) cqCloseTask();
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // vista: fuori nella bufera si vede poco; dentro tutto (con il generatore spento e' buio: la Cosa vede meglio)
    night(G) {
      const me = G.me; if (!me.alive || G.phase === 'end') return null;
      const out = isOut(cq.x, cq.y), on = genOn(G), R = me.th ? 7 : 4.2;
      const lights = []; if (!on) for (const p of CQ_PROPS) if (p[0] === 'polelamp' && Math.abs(p[1] - cq.x) < 16 && Math.abs(p[2] - cq.y) < 16) lights.push([p[1] + 0.5, p[2] + 0.5, 3, 0.8]);
      if (!on && G.fl.h >= 0) { const h = byId(G, G.fl.h); if (h && h.alive) lights.push([h === me ? cq.x : h.x, h === me ? cq.y : h.y, 2.4, 0.6]); }
      return { a: !on && !out ? (me.th ? 0.72 : 0.9) : 0, r: me.th ? 5 : 3.6, lights,
        see: (x, y) => { const d = Math.hypot(x - cq.x, y - cq.y); if (out || isOut(x, y)) return d < SEE_OUT; return on ? true : d < R; } };
    },
    // sopra alla mappa: bufera (nebbia bianca e neve che vola) quando sono fuori, brina col freddo, bersagli, fiamme, elicottero, frecce
    over(g, G, sx, sy, TW) {
      const me = G.me, now = performance.now(), W = cq.w, H = cq.h, out = isOut(cq.x, cq.y), mx = sx(cq.x, cq.y), my = sy(cq.x, cq.y) - TW * 0.6;
      // corpi bruciati (fumo) e congelati (ghiaccio)
      for (const b of G.bodies) if (b.k) { const X = sx(b.x, b.y), Y = sy(b.x, b.y); if (X < -60 || X > W + 60 || Y < -60 || Y > H + 60) continue;
        if (b.k === 1) for (let i = 0; i < 4; i++) { const a = ((now / 1000 + i * 0.7) % 2.8) / 2.8; g.fillStyle = 'rgba(60,60,60,' + (0.4 * (1 - a)) + ')'; g.beginPath(); g.arc(X + Math.sin(i * 2 + a * 3) * 8, Y - 10 - a * 50, 6 + a * 10, 0, 7); g.fill(); }
        else { g.fillStyle = 'rgba(190,225,255,.55)'; g.beginPath(); g.ellipse(X, Y - 8, TW * 0.7, TW * 0.32, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; for (const [a, c] of [[-14, -12], [6, -18], [16, -8]]) g.fillRect(X + a, Y + c, 3, 3); } }
      // fiammate
      G.fx = G.fx.filter(f => now - f.t < 900);
      for (const f of G.fx) {
        const a = (now - f.t) / 900, X0 = sx(f.a[0], f.a[1]), Y0 = sy(f.a[0], f.a[1]) - TW * 0.7, X1 = sx(f.b[0], f.b[1]), Y1 = sy(f.b[0], f.b[1]) - TW * 0.6;
        for (let i = 0; i < 14; i++) { const k = i / 13, j = Math.sin(i * 7.3 + now / 40) * 8; g.fillStyle = ['rgba(255,240,150,', 'rgba(255,160,40,', 'rgba(230,70,30,'][i % 3] + (0.85 * (1 - a)) + ')'; g.beginPath(); g.arc(X0 + (X1 - X0) * k + j, Y0 + (Y1 - Y0) * k - j * 0.5, 4 + k * 12, 0, 7); g.fill(); }
      }
      // elicottero
      const pd = MP().pad, PX = sx(pd.x, pd.y), PY = sy(pd.x, pd.y);
      if (G.heli) {
        const ta = G.time - G.heli.t, land = Math.max(0, 1 - ta / 7), up = G.out ? Math.max(0, G.time - G.out.t - 0.6) : 0;
        const alt = land * land * 14 + up * up * 1.4, ox = land * 8 * TW;
        heli(g, PX + ox, PY - land * 3 * TW, TW, alt, now / 45, G.out && G.out.thing && up > 0);
        if (!out || Math.hypot(pd.x - cq.x, pd.y - cq.y) > 4) edge(g, PX, PY, W, H, '🚁', '#e8b830');
      }
      if (G.out) return;
      // bufera: se sono fuori la nebbia bianca copre lontano e la neve vola
      const fk = G.flk || (G.flk = []);
      if (out) {
        const gr = g.createRadialGradient(mx, my, TW * 2.6, mx, my, TW * 6.2); gr.addColorStop(0, 'rgba(236,243,250,0)'); gr.addColorStop(1, 'rgba(236,243,250,.94)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        while (fk.length < 140) fk.push({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 1.2, r: 1 + Math.random() * 2.2 });
        const gust = 1 + 0.6 * Math.sin(now / 900);
        g.fillStyle = 'rgba(255,255,255,.9)';
        for (const f of fk) { f.x -= 9 * f.v * gust; f.y += 3.2 * f.v; if (f.x < -10) f.x += W + 20; if (f.y > H + 10) f.y -= H + 20; g.fillRect(f.x, f.y, f.r * 2.4, f.r); }
        if ((G.windT = (G.windT || 0) - 1) <= 0) { G.windT = 70 + Math.random() * 60; if (store.settings.sound) beep(120 + Math.random() * 40, 0.9, 0.006, 0, 'triangle'); }
      }
      // brina ai bordi quando si congela
      if (me.alive && !me.th && me.cold < 40) {
        const k = (40 - me.cold) / 40, gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
        gr.addColorStop(0, 'rgba(200,230,255,0)'); gr.addColorStop(1, 'rgba(200,230,255,' + (0.7 * k) + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      if (!me.alive || G.phase !== 'play' || G.pre > 0 || G.mt) return;
      // contorno rosso su chi sto per prendere o bruciare
      const a = action(G);
      if (a && a.v && (a.k === 'burn' || (a.k === 'atk' && a.on))) {
        const q = a.v, X = sx(q.x, q.y), Y = sy(q.x, q.y), pu = 0.6 + 0.4 * Math.sin(now / 160);
        g.strokeStyle = '#ff6a5a'; g.globalAlpha = pu; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, TW * 0.55, TW * 0.27, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
      }
      // frecce: generatore spento (squadra), bancone dell'esame se qualcuno aspetta
      const Gp = MP().gen, B = MP().bench;
      if (!genOn(G) && !me.th) edge(g, sx(Gp.x + 0.5, Gp.y + 0.5), sy(Gp.x + 0.5, Gp.y + 0.5), W, H, '⚡', '#ff6a5a');
      if (G.test && G.test.b == null && G.test.a !== me.id) edge(g, sx(B.x + 0.5, B.y + 0.5), sy(B.x + 0.5, B.y + 0.5), W, H, '🧪', '#7be0a0');
      // barra della riparazione del generatore
      if (!genOn(G) && G.gen.p > 0) { const X = sx(Gp.x + 0.5, Gp.y + 0.5), Y = sy(Gp.x + 0.5, Gp.y + 0.5) - TW * 2.2; g.fillStyle = 'rgba(0,0,0,.65)'; cqRR(g, X - 32, Y - 4, 64, 9, 4.5); g.fill(); g.fillStyle = '#7be0a0'; cqRR(g, X - 30, Y - 2, 60 * G.gen.p, 5, 2.5); g.fill(); }
      if (G.test && G.test.b != null) { const X = sx(B.x + 0.5, B.y + 0.5), Y = sy(B.x + 0.5, B.y + 0.5) - TW * 1.9; g.fillStyle = 'rgba(0,0,0,.65)'; cqRR(g, X - 32, Y - 4, 64, 9, 4.5); g.fill(); g.fillStyle = '#ff9aa8'; cqRR(g, X - 30, Y - 2, 60 * G.test.p, 5, 2.5); g.fill(); }
    }
  };
})();
