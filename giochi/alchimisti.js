// Duello degli alchimisti (gioco 1 contro 1, vedi CLAUDE.md "MINIGIOCO Duello degli alchimisti").
// Passo 1: la TORRE DEI MAGHI (laboratorio tondo, voragine luminosa, ripari, calderoni di ricarica), alchimisti col cappello a punta, online in 2.
// Passo 2: le POZIONI calcolate dalle proprieta' degli ingredienti (ING, EL, REACT, brew) e la PREPARAZIONE al calderone.
// Passo 3: il DUELLO (lancio a fionda, effetti dalla tabella FX, pozze ZONE, spinte, voragine, ricarica, manche al meglio di 3, computer che lancia).
// PIANI DELLA TORRE: serra carnivora, sala dell'orologio, laboratorio in cima; una manche per piano (FLOORS, makeFloor, useFloor).
// Passo 6: RICETTARIO (60 monete; descrizioni calcolate dalle tabelle), schede la prima volta, regole.
// Passo 5: COMPUTER FURBO (cintura valutata con le tabelle e contro quello che lanci, schiva, ti spinge nella voragine, sfrutta le pozze, specchi).
// Passo 4: REAZIONI SUL CAMPO (pozione + pozza = la reazione della tabella REACT) e AMPOLLE INSTABILI che scoppiano alla cintura se ti colpisce il fuoco.
(() => {
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const HP = 3, TIME = 120;

  // ---- LA TORRE: una stanza tonda (raggio RAD) in una griglia N x N; al centro la voragine (PIT) con il bordo di pietra scolpita (RIM) ----
  // In fondo (x + y piccoli, in alto sullo schermo) i muri sono alti con librerie, finestre e torce; davanti sono bassi (si vede dentro).
  const N = 21, C = 10.5, RAD = 8.6, PIT = 2.25, RIM = 3.05, HT = 2.7, HL = 0.5;
  const dC = (x, y) => Math.hypot(x + 0.5 - C, y + 0.5 - C);
  const inside = (x, y) => dC(x, y) <= RAD;
  let FL = null;   // il piano in uso (FLOORS): lo cambia useFloor
  const isPit = (x, y) => !!(FL && FL.pit) && dC(x, y) <= PIT;
  const back = (x, y) => x + y <= 2 * C - 1;
  // i due angoli (simmetrici rispetto al centro): A in fondo, B davanti; accanto a ognuno il suo calderone di ricarica
  const SPAWN = [[6.5, 6.5], [14.5, 14.5]], KETTLE = [[5, 7], [15, 13]];
  const SIDE = [{ hat: '#4a2a7a', hat2: '#6a3fa8', band: '#e8c050', liq: '#b07aff' }, { hat: '#1f5a4a', hat2: '#2f7a64', band: '#d8dce8', liq: '#5ae0a0' }];
  // I PIANI DELLA TORRE (idea dell'utente): una manche per piano, si sale. Ogni piano = una riga: mappa, nome, consiglio, pavimenti (kind(x, y) -> tipo),
  // colori, muro, decorazioni (WSEQ in fondo, BSEQ lungo il bordo dietro, FSEQ davanti), ripari COVER (simmetrici rispetto al centro), cosa c'e' di speciale
  const GLASS = 'rgba(0,0,0,0)';   // caselle "di vetro": il pavimento pronto e' trasparente e sotto si disegnano ingranaggi e quadrante che girano (under)
  const GEARS = [[7, 14, 1], [14, 7, -1]], GR = 1.9, DIAL = 3.0;
  const GEARS_D = [[10.5, 5.1, 1, 0.9], [10.5, 15.9, -1, 0.9], [5.1, 10.5, -1, 0.9], [15.9, 10.5, 1, 0.9]];   // ingranaggini sotto vetro solo per bellezza (non spostano)   // sala dell'orologio: ingranaggi [x, y, verso] e quadrante al centro
  const PLANTS = [[10, 10, 1], [6, 12, 0], [14, 8, 0], [12, 5, 0], [8, 15, 0]];   // serra: piante carnivore [x, y, grande]
  const FLOORS = [
    { id: 'serra', map: 'torre1', n: 'La serra carnivora', e: '🌿', plants: 1, ivy: 1, dense: 1, flies: 1, ev: 'spores',
      tip: 'Le <b>piante carnivore</b> mordono chi passa vicino! Il fuoco le brucia, il ghiaccio le congela, il fungo le fa diventare enormi, la polvere di fata le rimpicciolisce, sabbia e colla le addormentano.',
      kind: (x, y) => dC(x, y) <= 2.3 ? 'bed' : dC(x, y) <= 6.2 ? 'stone' : 'lawn',
      cols: { lawn: ['#3e6a2e', '#3b662c'], bed: ['#3a2a1e', '#36271c'], stone: ['#66675a', '#626356'] }, wc: '#5a6652',
      WSEQ: ['glass', 'vines', 'glass', 'basket', 'glass', 'orchids', 'glass', 'vines', 'glass', 'basket', 'glass', 'orchids', 'glass', 'vines'],
      BSEQ: ['palm', 'terra', 'monst', 'gmush', 'orchid', 'palm', 'lamp2', 'monst', 'terra', 'gmush', 'palm', 'orchid', 'monst', 'lamp2'], FSEQ: ['fernp', 'flowerp', 'fernp', 'gmush', 'flowerp', 'fernp'],
      DECO: [['flw', 3], ['grs', 4], ['fernL', 2], ['mushL', 1]],
      COVER: [['monst', 8, 6], ['monst', 12, 14], ['rock', 5, 14], ['rock', 15, 6], ['gmush', 6, 9], ['gmush', 14, 11]] },
    { id: 'orologio', map: 'torre2', n: 'La sala dell\'orologio', e: '🕰️', gears: 1, pend: 1, rail: 1, dense: 1, dust: 1, ev: 'midnight',
      tip: 'Sotto il vetro gli <b>ingranaggi</b> girano e ti portano con loro; il <b>pendolo</b> spazza il centro e butta via chi c\'è sotto. Spingi l\'altro sotto il pendolo!',
      kind: (x, y) => dC(x, y) <= DIAL ? 'clock' : GEARS.concat(GEARS_D).some(([a, b, , r]) => Math.hypot(x + 0.5 - a, y + 0.5 - b) <= (r || GR)) ? 'gear' : 'parq',
      cols: { parq: ['#5a3a26', '#563824'], clock: [GLASS, GLASS], gear: [GLASS, GLASS] }, wc: '#5e5446',
      WSEQ: ['gearw', 'pipesw', 'clockw', 'shelfclk', 'gearw', 'torch', 'clockw', 'pipesw', 'gearw', 'shelfclk', 'clockw', 'pipesw', 'gearw', 'torch'],
      BSEQ: ['clockgf', 'cuckoo', 'pipes', 'wbench', 'glamp', 'clockgf', 'telescope', 'cuckoo', 'pipes', 'wbench', 'clockgf', 'glamp', 'cuckoo'], FSEQ: ['gearbox', 'hglass2', 'books', 'gearbox', 'candles', 'hglass2'],
      COVER: [['clockgf', 4, 11], ['clockgf', 16, 9], ['hglass', 8, 6], ['hglass', 12, 14], ['orrery', 6, 9], ['orrery', 14, 11]] },
    { id: 'lab', map: 'torre', n: 'Il laboratorio in cima', e: '⚗️', pit: 1, ev: 'surge',
      tip: 'In cima alla torre: al centro la <b>voragine</b>. Chi ci cade perde un cuore. Spingi, tira… e non avvicinarti troppo al bordo!',
      kind: (x, y) => dC(x, y) <= RIM && !isPit(x, y) ? 'rim' : 'lab', cols: { lab: ['#4a4555', '#46414f'], rim: ['#6b6377', '#665e71'] }, wc: '#575064',
      WSEQ: ['shelf', 'torch', 'win', 'shelf', 'banner', 'potions', 'torch', 'chart', 'win', 'shelf', 'banner', 'torch', 'potions', 'shelf', 'win', 'chart'],
      BSEQ: ['cauldron', 'globe', 'crystal', 'shelfp', 'owl', 'chest', 'telescope', 'skull', 'shelfp', 'books', 'cauldron2', 'crystal'], FSEQ: ['candles', 'books', 'skull', 'candles', 'urn', 'books'],
      COVER: [['pillar', 5, 14], ['pillar', 15, 6], ['bench', 8, 6], ['bench', 12, 14], ['books', 6, 9], ['books', 14, 11], ['urn', 9, 15], ['urn', 11, 5]] }];
  FL = FLOORS[2];
  const COLS = () => FL.cols, WCOL = () => FL.wc;

  // muri decorati in fondo (scelti in ordine lungo il giro) e oggetti lungo il bordo; luci per il buio
  let QC = {}, QOWN = [], DEC = [], LIGHTS = [];
  const RI = 9.35, RO = 10.05, RM = (RI + RO) / 2, NQ = 720;   // muro tondo: raggio dentro (copre gli spigoli del pavimento) e fuori; spicchi del giro
  const ang = (x, y) => { let a = Math.atan2(y + 0.5 - C, x + 0.5 - C); if (a < -Math.PI * 0.75) a += Math.PI * 2; return a; };   // da sinistra, passando dal fondo, fino a destra

  // ogni piano e' una mappa sua (stessa pianta tonda); i dati del disegno (spicchi del muro, decorazioni, luci) stanno nel pacchetto (P.alc)
  function makeFloor(fi) {
    const prev = FL; FL = FLOORS[fi];
    try { const P = mapTorre(); P.fi = fi; return P; } finally { FL = prev; }
  }
  // cambia piano: la mappa (anche sul telefono dell'amico) e i dati del disegno
  function useFloor(fi) { const F = FLOORS[fi]; if (cq.map !== F.map) cqUseMap(F.map, 1); syncFloor(); if (cq.g) cq.g.map = cq.map; }
  function syncFloor() { const P = CQ_MAP; if (!P || P.fi == null) return; FL = FLOORS[P.fi]; ({ QC, QOWN, DEC, LIGHTS } = P.alc); PITF = null; }
  function mapTorre() {
    const rooms = [], props = [], COVER = FL.COVER, WSEQ = FL.WSEQ, BSEQ = FL.BSEQ, FSEQ = FL.FSEQ;
    for (let y = 0; y < N; y++) {
      let cur = null;
      for (let x = 0; x < N; x++) {
        const k = inside(x, y) ? FL.kind(x, y) : null;
        if (cur && cur.k === k && k) { cur.w++; continue; }
        cur = k ? { n: 'Laboratorio', x, y, w: 1, h: 1, vk: k, k, c: FL.cols[k], wc: FL.wc, nl: 1 } : null;
        if (cur) rooms.push(cur);
      }
    }
    const taken = new Set(), put = (t, x, y, o) => { props.push([t, x, y, o]); taken.add(x + ',' + y); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isPit(x, y)) put('pit', x, y);
    COVER.forEach(([t, x, y, o]) => put(t, x, y, o));
    if (FL.plants) PLANTS.forEach(([x, y, b], i) => put('plantc', x, y, { i, b }));
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
      if (k++ % 2 && !(FL.dense && x + y <= 2 * C - 2)) continue;   // uno si' e uno no (nei piani ricchi in fondo tutti): si passa lungo il muro
      if (x + y <= 2 * C - 2) put(BSEQ[bi++ % BSEQ.length], x, y);
      else if (x + y >= 2 * C + 1 && fi < 9 && k % 3 === 1) put(FSEQ[fi++ % FSEQ.length], x, y);
    }
    // DECORAZIONI A TERRA che si attraversano (erba, fiori, felci basse, funghetti): disegnate col pavimento, non bloccano
    const DECOS = [];
    if (FL.DECO) { let sd = 99; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; const tot = FL.DECO.reduce((a, d) => a + d[1], 0);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!inside(x, y) || taken.has(x + ',' + y) || near(x, y, keep, 1.3) || dC(x, y) < 2.6) continue;
        if (rnd() > (FL.kind(x, y) === 'lawn' ? 0.75 : 0.35)) continue;
        let r = rnd() * tot; const t = FL.DECO.find(d => (r -= d[1]) < 0)[0]; DECOS.push([x, y, t]);
      } }
    // MURA TONDE: il giro e' diviso in NQ spicchi; ogni spicchio lo disegna la casella che contiene il suo centro (raggio RM).
    // Le caselle fuori dal pavimento che non sono gia' muri per il motore diventano oggetti 'ring' (cosi' vengono disegnate anche loro)
    const QC = {}, QOWN = [];
    for (let i = 0; i < NQ; i++) { const th = (i + 0.5) / NQ * 6.2832, key = Math.floor(C + RM * Math.cos(th)) + ',' + Math.floor(C + RM * Math.sin(th)); (QC[key] || (QC[key] = [])).push(i); QOWN.push(key); }
    for (const key of Object.keys(QC)) { const [x, y] = key.split(',').map(Number); if (!inside(x, y) && ![-1, 0, 1].some(a => [-1, 0, 1].some(b => inside(x + a, y + b)))) props.push(['ring', x, y]); }
    // decorazioni sulla parete curva in fondo (dove il muro e' alto), una ogni ~1,2 caselle
    const DEC = []; { const B = Math.PI * 1.25; let i = 0; for (let d = -1.12; d <= 1.121; d += 1.2 / RI) { const th = (B + d + 6.2832) % 6.2832; DEC.push({ th, t: WSEQ[i % WSEQ.length], i: i++, own: QOWN[Math.floor(th / 6.2832 * NQ) % NQ] }); } }
    // luci (per il buio): voragine, torce, finestre, sfere di cristallo, calderoni
    const LIGHTS = FL.pit ? [[C, C, 4.6, 1]] : FL.gears ? [[C, C, 3.4, 0.7]] : [[C, C, 2.6, 0.5]];
    for (const d of DEC) { const lx = C + (RI - 0.7) * Math.cos(d.th), ly = C + (RI - 0.7) * Math.sin(d.th); if (d.t === 'torch') LIGHTS.push([lx, ly, 3.2, 0.85]); else if (d.t === 'win') LIGHTS.push([lx, ly, 2.2, 0.4]); }
    { let n = 0; for (const [t, x, y] of props) if ((t === 'crystal' || t === 'cauldron' || t === 'cauldron2' || t === 'urn' || t === 'gmush' || t === 'lamp2' || t === 'glamp' || t === 'wbench' || t === 'orrery') && n++ < 7) LIGHTS.push([x + 0.5, y + 0.5, t === 'gmush' ? 2 : 2.5, 0.6]); }   // solo le luci grandi: ognuna costa al buio (prove/pesi.js)
    return { alc: { QC, QOWN, DEC, LIGHTS }, w: N, h: N, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring: [[6, 6], [14, 14]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Laboratorio: 'nel laboratorio' }, help: '', btnTxt: '', sabTxt: '',
      pxProp: drawFurn, drawWall, floor: { lab: floorLab, rim: floorRim, serra: floorSerra, parq: floorParq, clock: floorGlass, gear: floorGlass, lawn: floorLawn, bed: floorBed, stone: floorStone },
      deco: DECOS, decoDraw,
      bg: () => '#0c0a16', sky: skyDraw };   // dietro la torre: il paesaggio di notte (skyDraw)
  }
  CQ_MAPS.torre1 = { n: 'Serra carnivora', make: () => makeFloor(0), only: 'alchimisti' };
  CQ_MAPS.torre2 = { n: 'Sala dell\'orologio', make: () => makeFloor(1), only: 'alchimisti' };
  CQ_MAPS.torre = { n: 'Torre dei maghi', make: () => makeFloor(2), only: 'alchimisti' };
  // ---- IL PAESAGGIO intorno alla torre: notte al chiaro di luna vista dall'alto (cielo, stelle, luna, montagne, valle col lago, boschi, villaggi).
  // La parte ferma si disegna UNA volta (SKY, rifatta solo se cambia lo schermo); a ogni fotogramma solo nuvole che passano e luci che tremolano.
  // E' lontano: non si ingrandisce con la visuale e si sposta appena quando cammini (profondita'). Gancio del motore: CQ_MAP.sky(g, CX, CY) ----
  let SKY = null;
  const SKY_M = 0.12;   // margine per lo spostamento
  function skyBuild(w, h, dpr) {
    const W = w * (1 + SKY_M), H = h * (1 + SKY_M), cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const m = Math.min(W, H), hy = H * 0.4;   // orizzonte in alto: siamo in cima alla torre e guardiamo giu' nella valle
    // cielo
    let gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#060919'); gr.addColorStop(0.55, '#141f4a'); gr.addColorStop(0.9, '#33467e'); gr.addColorStop(1, '#4a5c92');
    g.fillStyle = gr; g.fillRect(0, 0, W, hy + 2);
    // luna con l'alone
    const mx = W * 0.8, my = H * 0.27, mr = m * 0.05;
    gr = g.createRadialGradient(mx, my, mr, mx, my, m * 0.32); gr.addColorStop(0, 'rgba(210,222,255,.32)'); gr.addColorStop(1, 'rgba(210,222,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, hy);
    // stelle (non dentro l'alone della luna)
    for (let i = 0; i < 190; i++) {
      const x = rnd() * W, y = rnd() * hy * 0.95, d = Math.hypot(x - mx, y - my); if (d < m * 0.12) continue;
      const r = 0.4 + rnd() * rnd() * 1.4, a = 0.35 + rnd() * 0.65 * (1 - y / hy * 0.5);
      g.fillStyle = `rgba(${230 + rnd() * 25 | 0},${230 + rnd() * 25 | 0},255,${a})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      if (r > 1.35) { g.strokeStyle = `rgba(220,230,255,${a * 0.5})`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - r * 3, y); g.lineTo(x + r * 3, y); g.moveTo(x, y - r * 3); g.lineTo(x, y + r * 3); g.stroke(); }
    }
    g.fillStyle = '#f4f1de'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
    g.fillStyle = 'rgba(190,186,165,.45)'; for (const [a, b, r] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.3], [-0.1, 0.4, 0.16], [0.35, -0.38, 0.12]]) { g.beginPath(); g.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); g.fill(); }
    // montagne lontane (due file), con il crinale illuminato dalla luna
    const ridge = (base, amp, col, rim, ph) => {   // sagome morbide: somma di onde, cime un po' appuntite
      const P = []; for (let i = 0; i <= 120; i++) { const u = i / 120 * 6.283, v = Math.abs(Math.sin(u * 1.3 + ph)) * 0.55 + Math.abs(Math.sin(u * 3.1 + ph * 2)) * 0.3 + Math.abs(Math.sin(u * 7.7 + ph * 3)) * 0.15; P.push([i / 120 * W, base - amp * v]); }
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (const [x, yy] of P) g.lineTo(x, yy); g.lineTo(W, H); g.closePath(); g.fill();
      g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); P.forEach(([x, yy], i) => i ? g.lineTo(x, yy) : g.moveTo(x, yy)); g.stroke();
    };
    ridge(hy + 3, h * 0.085, '#1c2650', 'rgba(150,170,230,.35)', 0.7);
    ridge(hy + h * 0.03, h * 0.05, '#111934', 'rgba(120,145,210,.25)', 2.1);
    // la valle sotto (scura, piu' scura verso di noi)
    const vy = hy + h * 0.04; gr = g.createLinearGradient(0, vy, 0, H); gr.addColorStop(0, '#13213a'); gr.addColorStop(0.5, '#0b1526'); gr.addColorStop(1, '#050a14');
    g.fillStyle = gr; g.fillRect(0, vy, W, H - vy);
    // campi un po' piu' chiari
    for (let i = 0; i < 14; i++) { const y = vy + Math.pow(rnd(), 1.5) * (H - vy) * 0.8, s = 0.3 + (y - vy) / (H - vy), x = rnd() * W; g.fillStyle = rnd() < 0.5 ? 'rgba(40,60,70,.35)' : 'rgba(30,48,62,.35)'; g.beginPath(); g.ellipse(x, y, W * 0.06 * s, h * 0.012 * s, 0, 0, 7); g.fill(); }
    // il lago con il riflesso della luna e il fiume che scende verso di noi
    const lx = mx - W * 0.04, ly = vy + h * 0.035;
    g.fillStyle = '#2e4878'; g.beginPath(); g.ellipse(lx, ly, W * 0.17, h * 0.026, 0, 0, 7); g.fill();
    { const Pt = k => { const u = k, a = 1 - u; return [a * a * a * (lx - W * 0.09) + 3 * a * a * u * (lx - W * 0.32) + 3 * a * u * u * (lx + W * 0.12) + u * u * u * (lx - W * 0.2), a * a * a * (ly + h * 0.01) + 3 * a * a * u * (ly + h * 0.12) + 3 * a * u * u * (ly + h * 0.3) + u * u * u * (H + 4)]; };
      const L = [], Rr = []; for (let i = 0; i <= 30; i++) { const k = i / 30, [x, y] = Pt(k), wd = W * (0.004 + 0.035 * k * k); L.push([x - wd, y]); Rr.push([x + wd, y]); }   // il fiume si allarga venendo verso di noi
      g.fillStyle = '#22385f'; g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (const [x, y] of Rr.reverse()) g.lineTo(x, y); g.closePath(); g.fill();
      for (let i = 3; i < 30; i += 3) { const [x, y] = Pt(i / 30); g.fillStyle = 'rgba(170,195,240,.35)'; g.fillRect(x - W * 0.01 * (i / 30), y, W * 0.02 * (i / 30), 1.2); } }
    for (let i = 0; i < 9; i++) { const yy = ly - h * 0.012 + i * h * 0.003, ww = W * (0.012 + 0.04 * (1 - Math.abs(i - 4) / 5)) * (0.6 + rnd() * 0.5); g.fillStyle = 'rgba(200,215,250,.55)'; g.fillRect(lx + W * 0.02 - ww / 2 + (rnd() - 0.5) * 6, yy, ww, 1.2); }
    // boschi: file di alberelli (piu' piccoli lontano)
    for (let row = 0; row < 7; row++) {
      const y0 = vy + h * 0.02 + Math.pow(row / 6, 1.6) * (H - vy) * 0.85, s = 0.35 + row * 0.22;
      for (let i = 0; i < 40; i++) { if (rnd() < 0.45) continue; const x = rnd() * W, y = y0 + (rnd() - 0.5) * h * 0.03, th = h * 0.012 * s * (0.7 + rnd() * 0.6); g.fillStyle = rnd() < 0.5 ? '#08111e' : '#0b1626'; g.beginPath(); g.moveTo(x - th * 0.45, y); g.lineTo(x, y - th * 1.4); g.lineTo(x + th * 0.45, y); g.fill(); g.fillStyle = 'rgba(110,135,190,.18)'; g.beginPath(); g.moveTo(x, y - th * 1.4); g.lineTo(x + th * 0.45, y); g.lineTo(x + th * 0.15, y); g.fill(); }
    }
    // foschia: veli chiari sull'orizzonte e nella valle
    for (const [y, a] of [[hy + h * 0.03, 0.16], [vy + h * 0.12, 0.08], [vy + h * 0.3, 0.06]]) { gr = g.createLinearGradient(0, y - h * 0.03, 0, y + h * 0.03); gr.addColorStop(0, 'rgba(150,170,215,0)'); gr.addColorStop(0.5, `rgba(150,170,215,${a})`); gr.addColorStop(1, 'rgba(150,170,215,0)'); g.fillStyle = gr; g.fillRect(0, y - h * 0.03, W, h * 0.06); }
    // nuvole (a ogni fotogramma): forma fissa, posizione che scorre
    const clouds = []; for (let i = 0; i < 6; i++) { const blobs = []; for (let k = 0; k < 7; k++) blobs.push([(k - 3) * 0.16 + (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.18 - (k > 1 && k < 5 ? 0.12 : 0), 0.12 + rnd() * 0.1]); clouds.push({ x: rnd(), y: i < 4 ? 0.05 + i * 0.075 + rnd() * 0.04 : hy / H + 0.06 + rnd() * 0.25, sz: (i < 4 ? 0.28 : 0.4) + rnd() * 0.12, sp: 0.004 + rnd() * 0.006, low: i >= 4, blobs }); }
    return { cv, w, h, dpr, W, H, clouds, mx, my };
  }
  // IL CORPO DELLA TORRE sotto il laboratorio: cilindro di pietra a mattoni (luce della luna da destra), cornice in cima, finestrelle accese,
  // edera che scende, poi sfuma nel buio tra nuvole scure. Disegnato UNA volta in un'immagine (rifatta solo se cambia la grandezza delle caselle)
  // e incollato nel punto giusto della mappa a ogni fotogramma (dietro la mappa: in cima lo coprono i muri del laboratorio)
  let TOWER = null;
  function towerBuild(TW, dpr) {
    const U = TW * 0.575, r = RO + 0.02, rx = r * TW * 0.7071, ry = rx / 2, deep = 13 * U, mg = TW * 3;
    const W = rx * 2 + mg * 2, H = ry + deep + TW * 2, cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const cx = W / 2, cy = 4, X = th => cx + rx * Math.cos(th), Yt = th => cy + ry * Math.sin(th);
    let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const shade = th => 0.42 + 0.58 * Math.max(0, Math.cos(th - 0.35));   // la luna e' a destra
    // pietra: strisce verticali (cilindro) con la luce
    const N = 64; for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI, b = (i + 1) / N * Math.PI;
      g.fillStyle = cqShade('#6a6478', shade((a + b) / 2)); g.beginPath(); g.moveTo(X(a), Yt(a)); g.lineTo(X(b), Yt(b)); g.lineTo(X(b), Yt(b) + deep); g.lineTo(X(a), Yt(a) + deep); g.closePath(); g.fill();
    }
    // mattoni: file orizzontali (archi) e giunti sfalsati
    const rowH = U * 0.36, rows = Math.ceil(deep / rowH); g.lineWidth = Math.max(1, TW / 60);
    for (let k = 1; k < rows; k++) { g.strokeStyle = 'rgba(20,16,30,.45)'; g.beginPath(); g.ellipse(cx, cy + k * rowH, rx, ry, 0, 0, Math.PI); g.stroke(); }
    const step = 0.75 / r; g.strokeStyle = 'rgba(20,16,30,.4)'; g.beginPath();
    for (let k = 0; k < rows; k++) for (let th = (k % 2) * step / 2; th < Math.PI; th += step) { const y = Yt(th) + k * rowH; g.moveTo(X(th), y); g.lineTo(X(th), y + rowH); }
    g.stroke();
    for (let i = 0; i < 260; i++) { const th = rnd() * Math.PI, k = Math.floor(rnd() * rows); g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.12)'; g.fillRect(X(th) - TW * 0.08, Yt(th) + k * rowH + 1, TW * 0.16 * Math.abs(Math.sin(th)) + 2, rowH - 2); }   // mattoni un po' diversi
    // cornice in cima (sotto il parapetto)
    for (const [o, c, w2] of [[U * 0.15, '#8a8496', U * 0.22], [U * 0.42, '#3e3a4a', U * 0.08]]) { g.strokeStyle = c; g.lineWidth = w2; g.beginPath(); g.ellipse(cx, cy + o, rx * 1.01, ry * 1.01, 0, 0.02, Math.PI - 0.02); g.stroke(); }
    // finestrelle accese (archetto, inferriata, luce calda intorno)
    for (const [th, k] of [[0.55, 6], [1.25, 10], [1.9, 5], [2.55, 12], [0.95, 17], [2.2, 19], [1.6, 24]]) {
      const x = X(th), y = Yt(th) + k * rowH, ww = TW * 0.22 * Math.max(0.35, Math.sin(th)), hh = TW * 0.42;
      const gl = g.createRadialGradient(x, y, 0, x, y, TW * 0.9); gl.addColorStop(0, 'rgba(255,190,100,.35)'); gl.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gl; g.fillRect(x - TW, y - TW, TW * 2, TW * 2);
      g.fillStyle = '#2a2430'; g.beginPath(); g.moveTo(x - ww / 2 - 2, y + hh / 2 + 2); g.lineTo(x - ww / 2 - 2, y - hh / 4); g.quadraticCurveTo(x, y - hh / 2 - ww / 2 - 4, x + ww / 2 + 2, y - hh / 4); g.lineTo(x + ww / 2 + 2, y + hh / 2 + 2); g.fill();
      g.fillStyle = '#ffc870'; g.beginPath(); g.moveTo(x - ww / 2, y + hh / 2); g.lineTo(x - ww / 2, y - hh / 4); g.quadraticCurveTo(x, y - hh / 2 - ww / 2, x + ww / 2, y - hh / 4); g.lineTo(x + ww / 2, y + hh / 2); g.fill();
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - hh / 2); g.lineTo(x, y + hh / 2); g.moveTo(x - ww / 2, y); g.lineTo(x + ww / 2, y); g.stroke();
    }
    // edera: rami che scendono dalla cima con le foglie (piu' fitta a sinistra, nell'ombra)
    for (const [a0, a1, n, len] of [[2.25, 3.05, 16, 9], [0.15, 0.6, 9, 6], [1.35, 1.7, 6, 4.5]]) for (let i = 0; i < n; i++) {
      const th = a0 + rnd() * (a1 - a0), L = (0.35 + rnd() * 0.65) * len * U, x0 = X(th), y0 = Yt(th) + U * 0.3; let x = x0;
      g.strokeStyle = '#1e3018'; g.lineWidth = Math.max(1, TW / 50); g.beginPath(); g.moveTo(x0, y0);
      const pts = []; for (let y = y0; y < y0 + L; y += U * 0.25) { x += (rnd() - 0.5) * TW * 0.08; g.lineTo(x, y); pts.push([x, y]); } g.stroke();
      for (const [px, py] of pts) for (let k = 0; k < 2; k++) { const lit = shade(th); g.fillStyle = cqShade(['#2f5a2a', '#3e7a34', '#24461f'][Math.floor(rnd() * 3)], 0.7 + lit * 0.5); g.beginPath(); g.ellipse(px + (rnd() - 0.5) * TW * 0.2, py + (rnd() - 0.5) * U * 0.2, TW * 0.06, TW * 0.04, rnd() * 3, 0, 7); g.fill(); }
    }
    // sfuma nel buio...
    let gr = g.createLinearGradient(0, cy + ry + U * 1.5, 0, cy + ry + U * 9.5); gr.addColorStop(0, 'rgba(7,10,22,0)'); gr.addColorStop(1, 'rgba(7,10,22,1)'); g.fillStyle = gr; g.fillRect(0, cy, W, H);
    // ...tra nuvole scure che girano intorno alla torre
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = cy + ry + U * (5 + rnd() * 5), rr = TW * (0.6 + rnd() * 1.1);
      g.fillStyle = '#0b1024'; g.beginPath(); g.ellipse(x, y, rr * 1.6, rr * 0.7, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(110,125,175,.16)'; g.beginPath(); g.ellipse(x + rr * 0.2, y - rr * 0.35, rr * 1.1, rr * 0.25, 0, 0, 7); g.fill();
    }
    g.fillStyle = '#070a16'; g.fillRect(0, cy + ry + U * 10.5, W, H);
    return { cv, TW, dpr, W, H, cx, cy };
  }
  function towerDraw(g, tx, ty, TW) {
    const dpr = cq.dpr;
    if (!TOWER || TOWER.TW !== TW || TOWER.dpr !== dpr) TOWER = towerBuild(TW, dpr);
    const T = TOWER, X = tx + 0, Y = ty + C * TW / 2;   // centro della torre: px(C, C) = 0, py(C, C) = C x TW / 2
    g.drawImage(T.cv, X - T.cx, Y - T.cy, T.W, T.H);
  }
  function skyDraw(g, CX, CY, tx, ty, TW) {
    const w = cq.w, h = cq.h, dpr = cq.dpr;
    if (!SKY || SKY.w !== w || SKY.h !== h || SKY.dpr !== dpr) SKY = skyBuild(w, h, dpr);
    const S = SKY, t = performance.now() / 1000;
    // profondita': il paesaggio si sposta appena quando ti muovi nella torre
    const ox = -w * SKY_M / 2 - Math.max(-1, Math.min(1, ((CX - C) - (CY - C)) / 16)) * w * SKY_M * 0.45, oy = -h * SKY_M / 2 - Math.max(-1, Math.min(1, ((CX - C) + (CY - C)) / 16)) * h * SKY_M * 0.45;
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(S.cv, ox, oy, S.W, S.H);
    // nuvole che passano (una ogni tanto copre la luna)
    for (const c of S.clouds) {
      const cw = S.W * c.sz, x = ox + ((c.x + t * c.sp * 0.1) % 1) * (S.W + cw) - cw / 2, y = oy + c.y * S.H, a = c.low ? 0.22 : 0.8;
      for (const [bx, by, br] of c.blobs) { g.fillStyle = c.low ? `rgba(120,140,190,${a})` : `rgba(34,44,86,${a})`; g.beginPath(); g.ellipse(x + bx * cw, y + by * cw * 0.4, br * cw, br * cw * 0.45, 0, 0, 7); g.fill(); }
      if (!c.low) for (const [bx, by, br] of c.blobs) { g.fillStyle = 'rgba(150,168,220,.22)'; g.beginPath(); g.ellipse(x + bx * cw - br * cw * 0.15, y + by * cw * 0.4 - br * cw * 0.2, br * cw * 0.7, br * cw * 0.22, 0, 0, 7); g.fill(); }
    }
    g.restore();
    if (tx != null) { towerDraw(g, tx, ty, TW); if (FL && FL.gears) clockUnder(g, tx, ty, TW); }
  }

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
  // serra: mattonelle di cotto con muschio e qualche foglia
  function floorSerra(K, x, y) {
    const { hsh, strokes, S, speck, TW, g } = K, P = (u, v) => S(x + u, y + v, 0);
    strokes([[P(0.5, 0), P(0.5, 1)], [P(0, 0.5), P(1, 0.5)]], 'rgba(40,20,10,.35)', Math.max(1, TW / 50));
    speck(x, y, 5, ['rgba(255,230,200,.08)', 'rgba(0,0,0,.14)'], TW / 22);
    if (hsh(x, y, 71) < 0.35) speck(x, y, 7, ['rgba(80,140,60,.45)', 'rgba(60,110,40,.4)'], TW / 16);   // muschio
    if (hsh(x, y, 72) < 0.12) { const [X, Y] = P(0.3 + 0.4 * hsh(x, y, 73), 0.3 + 0.4 * hsh(x, y, 74)); g.fillStyle = hsh(x, y, 75) < 0.5 ? '#5a8a3a' : '#8a7a2a'; g.beginPath(); g.ellipse(X, Y, TW * 0.09, TW * 0.04, hsh(x, y, 76) * 3, 0, 7); g.fill(); }
  }
  // serra: prato folto con fili d'erba e fiorellini; aiuola di terra scura intorno alla pianta grande; lastre di pietra col muschio
  function floorLawn(K, x, y) {
    const { hsh, strokes, S, speck, TW, g } = K, L = [];
    speck(x, y, 6, ['rgba(120,190,80,.35)', 'rgba(20,50,15,.3)'], TW / 20);
    for (let i = 0; i < 7; i++) { const u = 0.1 + 0.8 * hsh(x, y, 100 + i), v = 0.1 + 0.8 * hsh(x, y, 110 + i); L.push([S(x + u, y + v, 0), S(x + u + 0.03, y + v, 0.12 + 0.1 * hsh(x, y, 120 + i))]); }
    strokes(L, 'rgba(140,210,90,.6)', Math.max(1, TW / 45));
    if (hsh(x, y, 130) < 0.3) { const [X, Y] = S(x + 0.3 + 0.4 * hsh(x, y, 131), y + 0.3 + 0.4 * hsh(x, y, 132), 0.05); g.fillStyle = ['#f2e86a', '#f2f2f2', '#e86aa8', '#8ab8f8'][Math.floor(hsh(x, y, 133) * 4)]; g.beginPath(); g.arc(X, Y, TW * 0.03, 0, 7); g.fill(); }
  }
  function floorBed(K, x, y) {
    const { hsh, speck, S, TW, strokes } = K;
    speck(x, y, 9, ['rgba(120,90,60,.35)', 'rgba(0,0,0,.25)'], TW / 18);
    if (hsh(x, y, 140) < 0.5) { const a = S(x + 0.2 + 0.3 * hsh(x, y, 141), y + 0.5, 0), b = S(x + 0.5, y + 0.3 + 0.4 * hsh(x, y, 142), 0), c = S(x + 0.8, y + 0.4 + 0.3 * hsh(x, y, 143), 0); strokes([[a, b], [b, c]], 'rgba(90,60,40,.7)', Math.max(1.5, TW / 30)); }   // radici
  }
  function floorStone(K, x, y) {
    const { hsh, strokes, S, speck, TW, g } = K, P = (u, v) => S(x + u, y + v, 0);
    const bx2 = (x + (y >> 1)) % 2, by2 = y % 2, L = []; if (!bx2) L.push([P(0, 0), P(0, 1)]); if (!by2) L.push([P(0, 0), P(1, 0)]);
    strokes(L, 'rgba(30,40,20,.45)', Math.max(1.5, TW / 40));
    speck(x, y, 4, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.14)'], TW / 22);
    if (hsh(x, y, 150) < 0.55) { for (let i = 0; i < 3; i++) { const [X, Y] = P(0.15 + 0.7 * hsh(x, y, 151 + i), 0.15 + 0.7 * hsh(x, y, 155 + i)); g.fillStyle = i % 2 ? 'rgba(90,150,60,.55)' : 'rgba(70,120,50,.5)'; g.beginPath(); g.ellipse(X, Y, TW * (0.08 + 0.08 * hsh(x, y, 160 + i)), TW * 0.04, 0, 0, 7); g.fill(); } }   // muschio
  }
  // decorazioni a terra (si attraversano): fiori, ciuffi d'erba alta, felci basse, funghetti che brillano
  function decoDraw(K, t, x, y) {
    const { S, g, TW, hsh } = K, a = 0.25 + 0.5 * hsh(x, y, 170), b = 0.25 + 0.5 * hsh(x, y, 171);
    if (t === 'flw') { const cols = ['#f2e86a', '#e86aa8', '#f2f2f2', '#b07aff', '#ff8a5a']; for (let i = 0; i < 4; i++) { const u = a + (i - 1.5) * 0.09, v = b + (i % 2) * 0.08, [X0, Y0] = S(x + u, y + v, 0), [X1, Y1] = S(x + u, y + v, 0.22 + 0.06 * i % 0.18); g.strokeStyle = '#3e7a34'; g.lineWidth = Math.max(1, TW / 50); g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y1); g.stroke(); g.fillStyle = cols[Math.floor(hsh(x, y, 172 + i) * cols.length)]; g.beginPath(); g.arc(X1, Y1, TW * 0.035, 0, 7); g.fill(); g.fillStyle = '#f8e070'; g.beginPath(); g.arc(X1, Y1, TW * 0.012, 0, 7); g.fill(); } }
    else if (t === 'grs') { const L = []; for (let i = 0; i < 7; i++) { const u = a + (i - 3) * 0.04; L.push([S(x + u, y + b, 0), S(x + u + (i - 3) * 0.035, y + b, 0.3 + 0.08 * (i % 3))]); } K.strokes(L, '#5a9a3a', Math.max(1.5, TW / 30)); }
    else if (t === 'fernL') { const c = S(x + a, y + b, 0); for (let i = 0; i < 6; i++) { const ang = i * 1.05 + hsh(x, y, 175), e = S(x + a + Math.cos(ang) * 0.32, y + b + Math.sin(ang) * 0.32, 0.25); g.strokeStyle = i % 2 ? '#2f6a2a' : '#3f8a34'; g.lineWidth = Math.max(2, TW / 13); g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + e[0]) / 2, e[1] - TW * 0.1, e[0], e[1]); g.stroke(); } }
    else if (t === 'mushL') { for (let i = 0; i < 3; i++) { const u = a + (i - 1) * 0.12, v = b + (i % 2) * 0.1; K.cyl(x + u, y + v, 0.025, 0, 0.1, '#e8e4d8'); K.cyl(x + u, y + v, 0.06, 0.1, 0.13, i % 2 ? '#5ae0d0' : '#b07aff'); } }
  }
  // sala dell'orologio: assi di legno scuro
  function floorParq(K, x, y) {   // spina di pesce, con due anelli d'ottone e stelle intorno al quadrante
    const { strokes, S, TW, g } = K, P = (u, v) => S(x + u, y + v, 0), L = [];
    for (let i = 0; i < 4; i++) { const v = i * 0.25; if ((x + y + i) % 2) L.push([P(0, v), P(0.5, v + 0.25)], [P(0.5, v + 0.25), P(1, v)]); else L.push([P(0, v + 0.25), P(0.5, v)], [P(0.5, v), P(1, v + 0.25)]); }
    strokes(L, 'rgba(0,0,0,.3)', Math.max(1, TW / 55));
    strokes([[P(0, 0), P(1, 0)]], 'rgba(255,220,170,.07)');
    const d = dC(x, y);
    if ((d > 3.6 && d < 4.8) || (d > 6.6 && d < 7.8)) {
      clipCell(K, x, y); ring(K, 4.2, '#c8a050', Math.max(2, TW / 22)); ring(K, 4.32, 'rgba(90,60,20,.8)', 1); ring(K, 7.2, '#c8a050', Math.max(2, TW / 22));
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, [X, Y] = S(C + Math.cos(a) * 4.2, C + Math.sin(a) * 4.2, 0); g.fillStyle = '#f2d070'; g.beginPath(); g.moveTo(X, Y - TW * 0.09); g.lineTo(X + TW * 0.05, Y); g.lineTo(X, Y + TW * 0.045); g.lineTo(X - TW * 0.05, Y); g.fill(); }
      g.restore();
    }
  }
  // vetro sopra gli ingranaggi e il quadrante (si vede quello che c'e' sotto: under)
  function floorGlass(K, x, y) { const { S, poly } = K; poly([S(x, y, 0), S(x + 1, y, 0), S(x + 1, y + 1, 0), S(x, y + 1, 0)], 'rgba(170,210,255,.07)'); }
  // SOTTO IL VETRO (a ogni fotogramma, prima della mappa): il quadrante col tempo che passa e gli ingranaggi che girano
  const gearAng = t => { const k = Math.floor(t / 8), r = t - 8 * k; return 0.75 * (k % 2 ? 8 - r : r); };   // avanti e indietro, cambiano verso ogni 8 s
  const gearW = t => 0.75 * (Math.floor(t / 8) % 2 ? -1 : 1);
  function clockUnder(g, tx, ty, TW) {
    const t = cq.g ? cq.g.time : 0, U = TW * 0.575, sp = (x, y, z) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * U];
    const disc = (x, y, z, r, col) => { const [X, Y] = sp(x, y, z); g.fillStyle = col; g.beginPath(); g.ellipse(X, Y, r * TW * 0.7071, r * TW * 0.3536, 0, 0, 7); g.fill(); };
    // quadrante
    disc(C, C, -0.35, DIAL + 0.9, '#1e1610'); disc(C, C, -0.3, DIAL + 0.25, '#b08a3a'); disc(C, C, -0.28, DIAL, '#efe4c8'); disc(C, C, -0.27, DIAL * 0.88, '#f6eedb');
    g.fillStyle = '#3a2a1a'; g.font = '700 ' + Math.round(TW * 0.32) + 'px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * 6.2832 - Math.PI * 0.75, [X, Y] = sp(C + Math.cos(a) * DIAL * 0.75, C + Math.sin(a) * DIAL * 0.75, -0.27); g.save(); g.translate(X, Y); g.scale(1, 0.6); g.fillText(n, 0, 0); g.restore(); });
    const hand = (a, l, w, col) => { const [X0, Y0] = sp(C, C, -0.26), [X1, Y1] = sp(C + Math.cos(a) * l, C + Math.sin(a) * l, -0.26); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y1); g.stroke(); };
    hand(t / 360 * 6.2832 - Math.PI * 0.75, DIAL * 0.45, Math.max(3, TW / 9), '#2a1e14'); hand(t / 30 * 6.2832 - Math.PI * 0.75, DIAL * 0.7, Math.max(2, TW / 14), '#2a1e14'); disc(C, C, -0.25, 0.18, '#b08a3a');
    for (const [gx, gy, v, r] of GEARS_D) {   // ingranaggini
      disc(gx, gy, -0.4, r + 0.7, '#140e0a'); const a0 = gearAng(t) * v * 2.2, [X, Y] = sp(gx, gy, -0.3), rx = TW * 0.7071, ry = TW * 0.3536;
      g.fillStyle = '#9a7a34'; g.beginPath(); for (let i = 0; i <= 32; i++) { const a = a0 + i / 32 * 6.2832, rr = (Math.floor(i / 2) % 2 ? r + 0.18 : r); g.lineTo(X + Math.cos(a) * rr * rx, Y + Math.sin(a) * rr * ry); } g.fill(); disc(gx, gy, -0.28, r * 0.5, '#5a4020'); disc(gx, gy, -0.27, 0.15, '#d8b860');
    }
    // ingranaggi (i denti girano)
    for (const [gx, gy, v] of GEARS) {
      disc(gx, gy, -0.4, GR + 0.9, '#140e0a');
      const a0 = gearAng(t) * v, [X, Y] = sp(gx, gy, -0.3), rx = TW * 0.7071, ry = TW * 0.3536;
      g.fillStyle = '#8a6a2e'; g.beginPath();
      for (let i = 0; i <= 64; i++) { const a = a0 + i / 64 * 6.2832, r = (Math.floor(i / 2) % 2 ? GR + 0.25 : GR); g.lineTo(X + Math.cos(a) * r * rx, Y + Math.sin(a) * r * ry); }
      g.fill(); disc(gx, gy, -0.28, GR * 0.8, '#a8843a'); disc(gx, gy, -0.27, GR * 0.62, '#6a4e22');
      g.strokeStyle = '#b8944a'; g.lineWidth = Math.max(2, TW / 12); g.beginPath(); for (let i = 0; i < 6; i++) { const a = a0 + i / 6 * 6.2832; g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * GR * 0.62 * rx, Y + Math.sin(a) * GR * 0.62 * ry); } g.stroke();
      disc(gx, gy, -0.26, 0.3, '#d8b860');
      for (let i = 0; i < 3; i++) { const a = -a0 * 1.8 + i * 2.1, [X2, Y2] = sp(gx + Math.cos(i * 2.1 + 1) * (GR + 0.75), gy + Math.sin(i * 2.1 + 1) * (GR + 0.75), -0.32); g.fillStyle = '#6a5228'; g.beginPath(); for (let k = 0; k <= 24; k++) { const b = a + k / 24 * 6.2832, r = (Math.floor(k / 2) % 2 ? 0.55 : 0.45); g.lineTo(X2 + Math.cos(b) * r * rx, Y2 + Math.sin(b) * r * ry); } g.fill(); }   // ingranaggini intorno
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
  // altezza del muro lungo il giro: alta in fondo (x + y piccoli), scende morbida ai lati, parapetto basso davanti
  const hOf = th => { const a = -(Math.cos(th) + Math.sin(th)) / Math.SQRT2, k = Math.max(0, Math.min(1, (a + 0.2) / 0.6)); return HL + (HT - HL) * k * k * (3 - 2 * k); };
  // luce sul muro: dentro, un po' piu' chiaro dove guarda verso di noi; fuori, la luna da destra (come il corpo della torre)
  const litIn = th => 0.72 + 0.28 * Math.max(0, -(Math.cos(th) + Math.sin(th)) / Math.SQRT2);
  const litOut = th => { const c = (Math.cos(th) - Math.sin(th)) / Math.SQRT2; return 0.42 + 0.58 * Math.max(0, Math.cos(Math.acos(Math.max(-1, Math.min(1, c))) - 0.35)); };
  function drawWall(K, x, y, col) { ringPiece(K, x, y, col); }
  function ringPiece(K, x, y, col) {
    const { S, g, TW } = K, Q = QC[x + ',' + y], P = (r, th, z) => S(C + r * Math.cos(th), C + r * Math.sin(th), z);
    col = col || FL.wc;
    // il pavimento che arriva fino al muro (la parte della casella dentro il cerchio)
    if (dC(x, y) < RI + 0.75) {
      g.save(); g.beginPath(); for (const [i, p] of [S(x, y, 0), S(x + 1, y, 0), S(x + 1, y + 1, 0), S(x, y + 1, 0)].entries()) i ? g.lineTo(...p) : g.moveTo(...p); g.closePath(); g.clip();
      const [X0, Y0] = S(C, C, 0); g.beginPath(); g.ellipse(X0, Y0, RI * TW * 0.7071, RI * TW * 0.3536, 0, 0, 7); g.clip();
      const bk = Object.keys(FL.cols)[0]; K.poly([S(x, y, 0), S(x + 1, y, 0), S(x + 1, y + 1, 0), S(x, y + 1, 0)], FL.cols[bk][(x + y) % 2]); if (TW >= 40) ({ lab: floorLab, serra: floorSerra, parq: floorParq, lawn: floorLawn, bed: floorBed, stone: floorStone })[bk](K, x, y);
      g.restore();
    }
    if (!Q) return;
    const L = [];   // righe della malta
    for (const i of Q) {
      const a = i / NQ * 6.2832, b = (i + 1) / NQ * 6.2832, m = (a + b) / 2, h = hOf(m), inn = -(Math.cos(m) + Math.sin(m)) > 0;
      if (inn) K.poly([P(RI, a, 0), P(RI, b, 0), P(RI, b, h), P(RI, a, h)], K.shade(col, litIn(m)));   // in fondo si vede la parete di dentro
      else K.poly([P(RO, a, 0), P(RO, b, 0), P(RO, b, h), P(RO, a, h)], K.shade(col, litOut(m)));     // davanti quella di fuori
      K.poly([P(RI, a, h), P(RO, a, h), P(RO, b, h), P(RI, b, h)], K.shade(col, 1.28));                // cima
      if (TW >= 40) {
        const r = inn ? RI : RO;
        for (let z = 0.45; z < h - 0.1; z += 0.45) L.push([P(r, a, z), P(r, b, z)]);
        for (let k = 0, z = 0; z < h - 0.12; k++, z += 0.45) { const off = (k % 2) * 0.3, ja = Math.floor((a * r + off) / 0.6), jb = Math.floor((b * r + off) / 0.6); if (ja !== jb) { const tj = (jb * 0.6 - off) / r; L.push([P(r, tj, z), P(r, tj, Math.min(h - 0.12, z + 0.45))]); } }
        L.push([P(RI, a, h), P(RI, b, h)]);
      }
    }
    if (L.length) K.strokes(L, K.shade(col, 0.45));
    if (FL.ivy && TW >= 40) for (const i of Q) {   // rampicanti che scendono dalla cima del muro, con le foglie; muschio alla base
      const m = (i + 0.5) / NQ * 6.2832; if (-(Math.cos(m) + Math.sin(m)) <= 0.05) continue; const h = hOf(m);
      if (i % 7 === 0) { const len = 0.6 + ((i * 37) % 13) / 13 * 1.6; let a2 = m; const P2 = []; for (let z = h; z > h - len; z -= 0.12) { a2 += (((i * 7 + z * 31) % 10) / 10 - 0.5) * 0.004; P2.push(P(RI - 0.02, a2, z)); }
        K.g.strokeStyle = '#2a4a22'; K.g.lineWidth = Math.max(1.5, TW / 40); K.g.beginPath(); P2.forEach((p, k) => k ? K.g.lineTo(...p) : K.g.moveTo(...p)); K.g.stroke();
        P2.forEach(([X, Y], k) => { if (k % 2) return; K.g.fillStyle = k % 4 ? '#3e7a34' : '#5a9a3a'; K.g.beginPath(); K.g.ellipse(X + (k % 3 - 1) * 3, Y, TW * 0.06, TW * 0.035, 0.6, 0, 7); K.g.fill(); }); }
      if (i % 3 === 0) K.poly([P(RI - 0.01, i / NQ * 6.2832, 0), P(RI - 0.01, (i + 3) / NQ * 6.2832, 0), P(RI - 0.01, (i + 3) / NQ * 6.2832, 0.16 + (i % 5) * 0.03), P(RI - 0.01, i / NQ * 6.2832, 0.12)], '#4a6a3a');
    }
    if (FL.rail && TW >= 40) {   // corrimano di rame lungo il muro, con i rivetti
      const R1 = [], R2 = [];
      for (const i of Q) { const a = i / NQ * 6.2832, b = (i + 1) / NQ * 6.2832, m = (a + b) / 2; if (-(Math.cos(m) + Math.sin(m)) <= 0 || hOf(m) < 1.4) continue; R1.push([P(RI - 0.05, a, 0.95), P(RI - 0.05, b, 0.95)]); R2.push([P(RI - 0.05, a, 0.25), P(RI - 0.05, b, 0.25)]); if (i % 12 === 0) { const [X, Y] = P(RI - 0.06, m, 0.95); K.g.fillStyle = '#e8c070'; K.g.beginPath(); K.g.arc(X, Y, Math.max(1.5, TW / 40), 0, 7); K.g.fill(); } }
      if (R1.length) { K.strokes(R1, '#b0703a', Math.max(3, TW / 12)); K.strokes(R1, '#d89a5a', Math.max(1, TW / 40)); K.strokes(R2, '#6a4a2a', Math.max(2, TW / 18)); }
    }
    for (const d of DEC) if (d.own === x + ',' + y) wallDeco(K, d);
  }
  const BOOKS = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#a8842a', '#5a2a6a', '#2a6a6a', '#c8b88a', '#6a3a1a'];
  function wallDeco(K, d) {
    const { g, S, TW, hsh } = K, t = d.t, x = d.i, y = 7, span = 0.95 / RI, R2 = RI - 0.03, th = u => d.th - (u - 0.5) * span;   // u: da sinistra a destra lungo la parete curva
    const pt = (u, z) => S(C + R2 * Math.cos(th(u)), C + R2 * Math.sin(th(u)), z);
    const sh = litIn(d.th), Q = (u0, u1, z0, z1, c) => K.poly([pt(u0, z1), pt(u1, z1), pt(u1, z0), pt(u0, z0)], K.shade(c, sh));
    const gw = (u, z, r, c) => K.glow(C + (RI - 0.15) * Math.cos(th(u)), C + (RI - 0.15) * Math.sin(th(u)), z, r, c);
    const fy = 1;
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
    } else if (t === 'glass') {   // vetrata della serra: telaio di ferro ad arco, vetri con la notte e grandi foglie che ci premono contro
      Q(0.02, 0.98, 0.25, 2.6, '#2a3426'); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) Q(0.06 + i * 0.31, 0.33 + i * 0.31, 0.32 + j * 0.56, 0.82 + j * 0.56, (i + j) % 3 ? '#1a2a44' : '#20365a');
      for (let i = 0; i < 6; i++) { const [X, Y] = pt(0.1 + 0.8 * hsh(x, y, 60 + i), 1.2 + 1.3 * hsh(x, y, 70 + i)); g.fillStyle = '#dce8ff'; g.fillRect(X - 1, Y - 1, 2, 2); }
      for (let i = 0; i < 4; i++) { const [X, Y] = pt(0.15 + 0.7 * hsh(x, y, 80 + i), 0.4 + 0.9 * hsh(x, y, 90 + i)); g.fillStyle = i % 2 ? '#1e3a1e' : '#24481f'; g.beginPath(); g.ellipse(X, Y, TW * 0.22, TW * 0.11, hsh(x, y, 95 + i) * 3, 0, 7); g.fill(); g.strokeStyle = '#2f5a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - TW * 0.18, Y); g.lineTo(X + TW * 0.18, Y); g.stroke(); }
      for (let k = 0; k < 4; k++) { const z = 0.3 + k * 0.56; Q(0.02, 0.98, z - 0.02, z + 0.02, '#4a5a44'); } Q(0.36, 0.39, 0.25, 2.6, '#4a5a44'); Q(0.67, 0.7, 0.25, 2.6, '#4a5a44');
    } else if (t === 'basket') {   // cesto appeso con le foglie che ricadono
      const [Xa, Ya] = pt(0.5, 2.6), [Xb, Yb] = pt(0.5, 1.75); g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Xa, Ya); g.lineTo(Xb - TW * 0.15, Yb); g.moveTo(Xa, Ya); g.lineTo(Xb + TW * 0.15, Yb); g.stroke();
      g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(Xb, Yb, TW * 0.2, TW * 0.1, 0, 0, Math.PI); g.fill(); g.fillStyle = '#6a4a2a'; g.beginPath(); g.ellipse(Xb, Yb, TW * 0.2, TW * 0.06, 0, 0, 7); g.fill();
      for (let i = 0; i < 6; i++) { const ox = (i - 2.5) * TW * 0.07, len = TW * (0.25 + 0.35 * hsh(x, i, 3)); g.strokeStyle = '#2f6a2a'; g.lineWidth = Math.max(1.5, TW / 40); g.beginPath(); g.moveTo(Xb + ox, Yb); g.quadraticCurveTo(Xb + ox * 1.6, Yb + len * 0.5, Xb + ox * 1.3, Yb + len); g.stroke(); g.fillStyle = i % 2 ? '#4f9a40' : '#3e7a34'; g.beginPath(); g.ellipse(Xb + ox * 1.3, Yb + len, TW * 0.05, TW * 0.03, 0, 0, 7); g.fill(); }
      g.fillStyle = '#e86aa8'; g.beginPath(); g.arc(Xb - TW * 0.05, Yb - TW * 0.05, TW * 0.04, 0, 7); g.arc(Xb + TW * 0.08, Yb - TW * 0.04, TW * 0.035, 0, 7); g.fill();
    } else if (t === 'orchids') {   // mensola con le orchidee
      for (const z of [0.9, 1.7]) { Q(0.05, 0.95, z, z + 0.06, '#5a3c24'); for (let i = 0; i < 3; i++) { const u = 0.15 + i * 0.3; Q(u, u + 0.14, z + 0.06, z + 0.22, '#e8e4d8'); const [X, Y] = pt(u + 0.07, z + 0.22); g.strokeStyle = '#3e6a2e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + TW * 0.1, Y - TW * 0.3, X + TW * 0.18, Y - TW * 0.22); g.stroke(); for (let k = 0; k < 3; k++) { g.fillStyle = ['#f0a8e8', '#ffffff', '#c87ae8'][(i + k) % 3]; g.beginPath(); g.arc(X + TW * (0.06 + k * 0.05), Y - TW * (0.26 - k * 0.02), TW * 0.04, 0, 7); g.fill(); } } }
    } else if (t === 'vines') {   // rampicanti che scendono dal muro
      for (let i = 0; i < 5; i++) { const u0 = 0.1 + i * 0.2; let u = u0; const P2 = []; for (let z = 2.6; z > 0.4 + (i % 3) * 0.4; z -= 0.15) { u += (hsh(x, i, Math.round(z * 10)) - 0.5) * 0.05; P2.push(pt(Math.max(0.02, Math.min(0.98, u)), z)); } g.strokeStyle = '#2a4a22'; g.lineWidth = Math.max(1.5, TW / 40); g.beginPath(); P2.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); for (const [X, Y] of P2) { g.fillStyle = hsh(x, Math.round(X), Math.round(Y)) < 0.5 ? '#3e7a34' : '#4f9a40'; g.beginPath(); g.ellipse(X + 3, Y, TW * 0.05, TW * 0.03, 0.5, 0, 7); g.fill(); } }
    } else if (t === 'pots') {   // mensola con i vasetti
      for (const z of [0.95, 1.65]) { Q(0.06, 0.94, z, z + 0.06, '#5a3c24'); for (let i = 0; i < 4; i++) { const u = 0.12 + i * 0.2; Q(u, u + 0.12, z + 0.06, z + 0.22, '#b0603a'); Q(u - 0.02, u + 0.14, z + 0.22, z + 0.4, i % 2 ? '#3e7a34' : '#5a9a3a'); } }
    } else if (t === 'clockw') {   // orologio a muro
      const [X, Y] = pt(0.5, 1.55); g.fillStyle = '#6a4a28'; g.beginPath(); g.ellipse(X, Y, TW * 0.36, TW * 0.4, 0, 0, 7); g.fill(); g.fillStyle = '#efe4c8'; g.beginPath(); g.ellipse(X, Y, TW * 0.28, TW * 0.32, 0, 0, 7); g.fill();
      g.strokeStyle = '#2a1e14'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - TW * 0.22); g.moveTo(X, Y); g.lineTo(X + TW * 0.14, Y + TW * 0.05); g.stroke();
      Q(0.47, 0.53, 0.6, 1.2, '#b08a3a'); { const [X2, Y2] = pt(0.5, 0.6); g.fillStyle = '#d8b050'; g.beginPath(); g.arc(X2, Y2, TW * 0.09, 0, 7); g.fill(); }
    } else if (t === 'gearw') {   // tre ingranaggi d'ottone che si incastrano
      for (const [u, z, r, c] of [[0.42, 1.6, 0.42, '#8a6a2e'], [0.78, 2.15, 0.26, '#a8843a'], [0.72, 1.0, 0.22, '#6a5228']]) {
        const [X, Y] = pt(u, z); g.fillStyle = c; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.2832 + u * 3, rr = (Math.floor(i / 2) % 2 ? r : r * 0.82) * TW; g.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr * 1.05); } g.fill();
        g.fillStyle = K.shade(c, 1.25); g.beginPath(); g.arc(X, Y, r * TW * 0.62, 0, 7); g.fill(); g.strokeStyle = K.shade(c, 0.7); g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.2832; g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * r * TW * 0.62, Y + Math.sin(a) * r * TW * 0.62); } g.stroke(); g.fillStyle = '#3a2a14'; g.beginPath(); g.arc(X, Y, r * TW * 0.2, 0, 7); g.fill();
      }
    } else if (t === 'pipesw') {   // tubi di rame orizzontali con manometri e valvole
      for (const z of [0.6, 1.25, 1.95]) { Q(0.0, 1.0, z, z + 0.12, '#a8683a'); Q(0.0, 1.0, z + 0.09, z + 0.12, '#d8985a'); }
      Q(0.3, 0.38, 0.6, 2.07, '#8a5430'); Q(0.72, 0.8, 0.6, 1.37, '#8a5430');
      const [X, Y] = pt(0.55, 1.62); g.fillStyle = '#3a3a3a'; g.beginPath(); g.arc(X, Y, TW * 0.15, 0, 7); g.fill(); g.fillStyle = '#efe8d8'; g.beginPath(); g.arc(X, Y, TW * 0.12, 0, 7); g.fill(); g.strokeStyle = '#c83a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + TW * 0.08, Y - TW * 0.06); g.stroke();
      const [X2, Y2] = pt(0.76, 1.0); g.strokeStyle = '#b8302a'; g.lineWidth = Math.max(2, TW / 20); g.beginPath(); g.arc(X2, Y2, TW * 0.1, 0, 7); g.moveTo(X2 - TW * 0.1, Y2); g.lineTo(X2 + TW * 0.1, Y2); g.moveTo(X2, Y2 - TW * 0.1); g.lineTo(X2, Y2 + TW * 0.1); g.stroke();
    } else if (t === 'shelfclk') {   // mensole con tanti orologini
      for (const z of [0.95, 1.75]) { Q(0.04, 0.96, z, z + 0.06, '#5a3c24'); for (let i = 0; i < 3; i++) { const [X, Y] = pt(0.2 + i * 0.3, z + 0.28); g.fillStyle = ['#6a4a28', '#b08a3a', '#4a3a5a'][(i + Math.round(z)) % 3]; g.beginPath(); g.arc(X, Y, TW * 0.13, 0, 7); g.fill(); g.fillStyle = '#efe4c8'; g.beginPath(); g.arc(X, Y, TW * 0.1, 0, 7); g.fill(); g.strokeStyle = '#2a1e14'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + TW * 0.05 * Math.cos(i * 2 + z), Y - TW * 0.07); g.moveTo(X, Y); g.lineTo(X - TW * 0.04, Y + TW * 0.02 * i); g.stroke(); } }
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
      case 'ring': ringPiece(K, x, y, FL.wc); return true;
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
      case 'pot': case 'pot2': {   // vaso con una pianta (pot2 = grande, fa da riparo)
        const big = t === 'pot2', r = big ? 0.36 : 0.26;
        cyl(x + 0.5, y + 0.5, r, 0, big ? 0.5 : 0.36, '#a85a34'); cyl(x + 0.5, y + 0.5, r * 1.08, big ? 0.46 : 0.32, big ? 0.54 : 0.4, '#c06a3e'); cyl(x + 0.5, y + 0.5, r * 0.9, big ? 0.54 : 0.4, big ? 0.56 : 0.42, '#3a2a1a');
        const L = big ? 9 : 6; for (let i = 0; i < L; i++) { const a = i / L * 6.2832 + x, l = (big ? 0.55 : 0.35) * (0.7 + 0.3 * ((i * 7) % 3) / 2), [X0, Y0] = S(x + 0.5, y + 0.5, big ? 0.56 : 0.42), [X1, Y1] = S(x + 0.5 + Math.cos(a) * l, y + 0.5 + Math.sin(a) * l, (big ? 1.4 : 0.95) + 0.2 * Math.sin(i)); g.strokeStyle = i % 2 ? '#3e7a34' : '#4f9a40'; g.lineWidth = Math.max(3, TW / (big ? 7 : 10)); g.lineCap = 'round'; g.beginPath(); g.moveTo(X0, Y0); g.quadraticCurveTo(X0, Y1, X1, Y1); g.stroke(); }
        if (big) dot(x + 0.5, y + 0.45, 1.5, 0.07, '#e8508a');
        return true;
      }
      // --- SERRA ---
      case 'palm': {   // palma alta nel vaso
        cyl(x + 0.5, y + 0.5, 0.34, 0, 0.42, '#a85a34'); cyl(x + 0.5, y + 0.5, 0.36, 0.38, 0.46, '#c06a3e');
        for (let i = 0; i < 9; i++) { const z = 0.46 + i * 0.22, ox = Math.sin(i * 0.35) * 0.05; cyl(x + 0.5 + ox, y + 0.5, 0.09 - i * 0.004, z, z + 0.2, i % 2 ? '#7a5a34' : '#8a6a3e'); }
        const top = S(x + 0.5 + Math.sin(2.8) * 0.05, y + 0.5, 2.45);
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + 0.3, e = S(x + 0.5 + Math.cos(a) * 1.05, y + 0.5 + Math.sin(a) * 1.05, 1.75 + 0.2 * Math.sin(i * 1.7)), mx = (top[0] + e[0]) / 2, my = Math.min(top[1], e[1]) - TW * 0.25;
          g.strokeStyle = i % 2 ? '#2f6a2a' : '#3e8a34'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(...top); g.quadraticCurveTo(mx, my, e[0], e[1]); g.stroke();
          for (let k = 1; k < 7; k++) { const u = k / 7, px = (1 - u) * (1 - u) * top[0] + 2 * (1 - u) * u * mx + u * u * e[0], py = (1 - u) * (1 - u) * top[1] + 2 * (1 - u) * u * my + u * u * e[1]; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a + 1.5) * TW * 0.13 * (1 - u * 0.5), py + TW * 0.1); g.moveTo(px, py); g.lineTo(px + Math.cos(a - 1.5) * TW * 0.13 * (1 - u * 0.5), py + TW * 0.1); g.stroke(); } }
        return true;
      }
      case 'monst': {   // monstera: grandi foglie con i tagli
        cyl(x + 0.5, y + 0.5, 0.38, 0, 0.48, '#3a4a5a'); cyl(x + 0.5, y + 0.5, 0.4, 0.44, 0.52, '#4a5a6a'); cyl(x + 0.5, y + 0.5, 0.35, 0.52, 0.54, '#2a1e14');
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.2832 + x, l = 0.35 + 0.15 * (i % 3), z = 0.8 + 0.35 * (i % 3), [X0, Y0] = S(x + 0.5, y + 0.5, 0.54), [X1, Y1] = S(x + 0.5 + Math.cos(a) * l, y + 0.5 + Math.sin(a) * l, z);
          g.strokeStyle = '#2f5a2a'; g.lineWidth = Math.max(1.5, TW / 40); g.beginPath(); g.moveTo(X0, Y0); g.quadraticCurveTo(X0, Y1, X1, Y1); g.stroke();
          g.fillStyle = i % 2 ? '#2f7a34' : '#3e8a3e'; g.beginPath(); g.ellipse(X1, Y1, TW * 0.22, TW * 0.15, a, 0, 7); g.fill();
          g.strokeStyle = '#1e4a20'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X1 - Math.cos(a) * TW * 0.2, Y1 - Math.sin(a) * TW * 0.13); g.lineTo(X1 + Math.cos(a) * TW * 0.2, Y1 + Math.sin(a) * TW * 0.13); for (let k = -1; k <= 1; k++) { g.moveTo(X1 + k * TW * 0.06, Y1 - TW * 0.02); g.lineTo(X1 + k * TW * 0.09, Y1 - TW * 0.13); } g.stroke(); }
        return true;
      }
      case 'terra':   // terrario di vetro su un tavolino, piantine e una lucina
        legs4(K, x, y, 0.15, 0.2, 0.85, 0.8, 0.55, '#4a3220'); bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0.55, 0.62, '#6a4a2e');
        bx(x + 0.16, y + 0.2, x + 0.84, y + 0.8, 0.62, 1.25, '#9ad0c8'); bx(x + 0.16, y + 0.2, x + 0.84, y + 0.8, 0.62, 0.75, '#5a4a32');
        for (const [a, b, h, c] of [[0.35, 0.6, 0.25, '#3e8a34'], [0.6, 0.55, 0.35, '#5a9a3a'], [0.5, 0.7, 0.18, '#e86aa8']]) { cyl(x + a, y + b, 0.05, 0.75, 0.75 + h, c); dot(x + a, y + b, 0.75 + h, 0.05, K.shade(c, 1.3)); }
        K.line(S(x + 0.2, y + 0.8, 1.2), S(x + 0.2, y + 0.8, 0.7), '#e8f8f4', 1.5); K.line(S(x + 0.16, y + 0.2, 1.25), S(x + 0.84, y + 0.2, 1.25), '#c8eee8', 1.5);
        dot(x + 0.62, y + 0.5, 1.05, 0.03, '#f8ff9a');
        return true;
      case 'gmush': {   // funghi giganti che brillano
        for (const [a, b, h, r, c] of [[0.42, 0.45, 1.05, 0.34, '#5ae0d0'], [0.7, 0.62, 0.65, 0.22, '#b07aff'], [0.25, 0.7, 0.45, 0.16, '#5ae0d0']]) {
          cyl(x + a, y + b, r * 0.32, 0, h, '#ece6d4'); cyl(x + a, y + b, r, h, h + r * 0.35, K.shade(c, 0.75)); cyl(x + a, y + b, r * 0.8, h + r * 0.35, h + r * 0.5, c);
          for (let k = 0; k < 4; k++) dot(x + a + Math.cos(k * 1.7) * r * 0.5, y + b + Math.sin(k * 1.7) * r * 0.5, h + r * 0.5, 0.02, '#f2fff8');
        }
        K.glow(x + 0.45, y + 0.5, 1.2, 1.6, 'rgba(110,240,230,.32)');
        return true;
      }
      case 'rock':   // masso col muschio
        bx(x + 0.1, y + 0.15, x + 0.85, y + 0.88, 0, 0.55, '#6a6a62'); bx(x + 0.25, y + 0.1, x + 0.75, y + 0.65, 0.55, 0.85, '#7a7a70'); bx(x + 0.18, y + 0.18, x + 0.8, y + 0.8, 0.5, 0.58, '#4a7a3a'); bx(x + 0.3, y + 0.15, x + 0.7, y + 0.55, 0.85, 0.9, '#5a8a40');
        return true;
      case 'orchid':   // orchidea su un trespolo
        cyl(x + 0.5, y + 0.5, 0.15, 0, 0.06, '#3a2a1a'); cyl(x + 0.5, y + 0.5, 0.03, 0.06, 0.9, '#6a4a2e'); cyl(x + 0.5, y + 0.5, 0.18, 0.9, 1.08, '#e8e4d8');
        { const [X, Y] = S(x + 0.5, y + 0.5, 1.1); g.strokeStyle = '#3e6a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + TW * 0.2, Y - TW * 0.6, X + TW * 0.35, Y - TW * 0.4); g.stroke(); for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f0a8e8' : '#ffffff'; g.beginPath(); g.arc(X + TW * (0.12 + k * 0.07), Y - TW * (0.52 - k * 0.04), TW * 0.06, 0, 7); g.fill(); g.fillStyle = '#c8407a'; g.beginPath(); g.arc(X + TW * (0.12 + k * 0.07), Y - TW * (0.52 - k * 0.04), TW * 0.02, 0, 7); g.fill(); } }
        return true;
      case 'lamp2': case 'glamp': {   // lanterna (serra: ferro e vetro giallo; orologio: lampione d'ottone)
        const br = t === 'glamp';
        cyl(x + 0.5, y + 0.5, 0.15, 0, 0.08, br ? '#8a6a2e' : '#2a2a2a'); cyl(x + 0.5, y + 0.5, 0.035, 0.08, 1.8, br ? '#b08a3a' : '#2a2a2a');
        bx(x + 0.36, y + 0.36, x + 0.64, y + 0.64, 1.8, 2.15, '#ffd890'); bx(x + 0.32, y + 0.32, x + 0.68, y + 0.68, 2.15, 2.22, br ? '#8a6a2e' : '#2a2a2a'); bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 2.22, 2.3, br ? '#8a6a2e' : '#2a2a2a');
        K.glow(x + 0.5, y + 0.5, 2, 2.3, 'rgba(255,210,140,.4)');
        return true;
      }
      case 'fernp': case 'flowerp': {   // vasetto basso con felce o fiori (davanti, non coprono)
        cyl(x + 0.5, y + 0.5, 0.22, 0, 0.26, '#a85a34'); cyl(x + 0.5, y + 0.5, 0.2, 0.26, 0.28, '#2a1e14');
        if (t === 'fernp') { const c = S(x + 0.5, y + 0.5, 0.28); for (let i = 0; i < 7; i++) { const a = i * 0.9, e = S(x + 0.5 + Math.cos(a) * 0.4, y + 0.5 + Math.sin(a) * 0.4, 0.55); g.strokeStyle = i % 2 ? '#2f6a2a' : '#4f9a40'; g.lineWidth = Math.max(2, TW / 14); g.beginPath(); g.moveTo(c[0], c[1]); g.quadraticCurveTo((c[0] + e[0]) / 2, e[1] - TW * 0.12, e[0], e[1]); g.stroke(); } }
        else for (let i = 0; i < 6; i++) { const a = i * 1.05, [X, Y] = S(x + 0.5 + Math.cos(a) * 0.14, y + 0.5 + Math.sin(a) * 0.14, 0.45 + 0.08 * (i % 2)); g.fillStyle = '#3e7a34'; g.fillRect(X - 1, Y, 2, TW * 0.12); g.fillStyle = ['#e86aa8', '#f2e86a', '#b07aff'][i % 3]; g.beginPath(); g.arc(X, Y, TW * 0.06, 0, 7); g.fill(); }
        return true;
      }
      // --- OROLOGIO ---
      case 'cuckoo':   // orologio a cucu' su un palo, con i pesi a pigna
        cyl(x + 0.5, y + 0.5, 0.18, 0, 0.06, '#3a2a1a'); cyl(x + 0.5, y + 0.5, 0.05, 0.06, 1.3, '#5a3a20');
        bx(x + 0.25, y + 0.32, x + 0.75, y + 0.68, 1.3, 1.95, '#7a4a28'); bx(x + 0.18, y + 0.28, x + 0.82, y + 0.72, 1.95, 2.05, '#5a3018');
        { const [X, Y] = S(x + 0.5, y + 0.5, 2.25); g.fillStyle = '#5a3018'; g.beginPath(); g.moveTo(X - TW * 0.36, Y + TW * 0.12); g.lineTo(X, Y - TW * 0.16); g.lineTo(X + TW * 0.36, Y + TW * 0.12); g.fill(); }
        qL(x + 0.32, x + 0.68, y + 0.68, 1.45, 1.8, '#efe4c8'); dot(x + 0.5, y + 0.69, 1.86, 0.04, '#2a1e14');
        for (const [a, h] of [[0.36, 0.7], [0.64, 0.5]]) { K.line(S(x + a, y + 0.7, 1.3), S(x + a, y + 0.7, h + 0.2), '#2a2a2a', 1); cyl(x + a, y + 0.7, 0.05, h, h + 0.2, '#6a4a20'); }
        return true;
      case 'hglass': case 'hglass2': {   // clessidra (grande = riparo)
        const k = t === 'hglass' ? 1 : 0.6, h = 1.6 * k;
        cyl(x + 0.5, y + 0.5, 0.36 * k, 0, 0.1 * k, '#5a3a20'); cyl(x + 0.5, y + 0.5, 0.36 * k, h - 0.1 * k, h, '#5a3a20');
        for (const [a, b] of [[0.2, 0.25], [0.8, 0.3], [0.5, 0.85]]) bx(x + 0.5 + (a - 0.5) * k - 0.03, y + 0.5 + (b - 0.5) * k - 0.03, x + 0.5 + (a - 0.5) * k + 0.03, y + 0.5 + (b - 0.5) * k + 0.03, 0.1 * k, h - 0.1 * k, '#7a5a34');
        const [X0, Y0] = S(x + 0.5, y + 0.5, 0.1 * k), [X1, Y1] = S(x + 0.5, y + 0.5, h - 0.1 * k), Ym = (Y0 + Y1) / 2, w = TW * 0.26 * k;
        g.fillStyle = '#c8e0e8'; g.beginPath(); g.moveTo(X0 - w, Y0); g.lineTo(X0 + w, Y0); g.lineTo(X0 + 2, Ym); g.lineTo(X1 + w, Y1); g.lineTo(X1 - w, Y1); g.lineTo(X0 - 2, Ym); g.closePath(); g.fill();
        g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(X0 - w * 0.9, Y0); g.lineTo(X0 + w * 0.9, Y0); g.lineTo(X0, Y0 - (Y0 - Ym) * 0.55); g.fill(); g.beginPath(); g.moveTo(X1 - w * 0.5, Y1 + (Ym - Y1) * 0.55); g.lineTo(X1 + w * 0.5, Y1 + (Ym - Y1) * 0.55); g.lineTo(X0, Ym - 1); g.fill(); g.fillRect(X0 - 0.7, Ym - 2, 1.4, (Y0 - Ym) * 0.6);
        g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(X1 - w * 0.6, Y1 + 4); g.lineTo(X0 - 4, Ym - 4); g.stroke();
        return true;
      }
      case 'orrery': {   // planetario d'ottone: sole al centro e pianeti sui bracci
        cyl(x + 0.5, y + 0.5, 0.32, 0, 0.12, '#5a3a20'); cyl(x + 0.5, y + 0.5, 0.05, 0.12, 0.95, '#b08a3a');
        dot(x + 0.5, y + 0.5, 1.05, 0.13, '#ffc84a'); dot(x + 0.47, y + 0.47, 1.1, 0.05, '#fff2b0');
        for (const [r, a, c, s2] of [[0.42, 0.6, '#5a8ae0', 0.06], [0.6, 2.4, '#e06a3a', 0.07], [0.78, 4.3, '#c8a86a', 0.08], [0.3, 3.9, '#9a9a9a', 0.04]]) {
          const [X0, Y0] = S(x + 0.5, y + 0.5, 0.98), px2 = x + 0.5 + Math.cos(a) * r, py2 = y + 0.5 + Math.sin(a) * r, [X1, Y1] = S(px2, py2, 0.98);
          g.strokeStyle = '#b08a3a'; g.lineWidth = Math.max(1.5, TW / 40); g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y1); g.stroke(); dot(px2, py2, 1.0, s2, c);
          const [X2, Y2] = S(x + 0.5, y + 0.5, 0.98); g.strokeStyle = 'rgba(176,138,58,.9)'; g.lineWidth = 1; g.beginPath(); g.ellipse(X2, Y2, r * TW * 0.7071, r * TW * 0.3536, 0, 0, 7); g.stroke();
        }
        K.glow(x + 0.5, y + 0.5, 1.05, 1.4, 'rgba(255,200,90,.3)');
        return true;
      }
      case 'wbench':   // banco dell'orologiaio: lente con la lampada, ingranaggi sparsi, attrezzi
        legs4(K, x, y, 0.08, 0.14, 0.92, 0.86, 0.7, '#4a3220'); bx(x + 0.04, y + 0.1, x + 0.96, y + 0.9, 0.7, 0.8, '#7a5634');
        for (const [a, b, r] of [[0.3, 0.4, 0.09], [0.45, 0.65, 0.06], [0.65, 0.35, 0.07], [0.25, 0.7, 0.05]]) { cyl(x + a, y + b, r, 0.8, 0.83, '#c8a050'); cyl(x + a, y + b, r * 0.35, 0.83, 0.84, '#6a4e22'); }
        cyl(x + 0.75, y + 0.7, 0.03, 0.8, 1.35, '#3a3a3a'); { const [X, Y] = S(x + 0.62, y + 0.6, 1.4); g.strokeStyle = '#b08a3a'; g.lineWidth = Math.max(2, TW / 24); g.beginPath(); g.ellipse(X, Y, TW * 0.16, TW * 0.12, 0, 0, 7); g.stroke(); g.fillStyle = '#d8eef4'; g.beginPath(); g.ellipse(X, Y, TW * 0.13, TW * 0.09, 0, 0, 7); g.fill(); }
        dot(x + 0.75, y + 0.7, 1.4, 0.05, '#ffe08a'); K.glow(x + 0.6, y + 0.55, 1.0, 1.4, 'rgba(255,220,150,.32)');
        return true;
      case 'pipes':   // fascio di tubi di rame con valvola e manometro (esce il vapore: over)
        for (const [a, b] of [[0.3, 0.4], [0.55, 0.3], [0.45, 0.65]]) { cyl(x + a, y + b, 0.1, 0, 2.3, '#a8683a'); for (const z of [0.5, 1.2, 1.9]) cyl(x + a, y + b, 0.12, z, z + 0.08, '#d8985a'); }
        dot(x + 0.62, y + 0.7, 1.0, 0.1, '#efe8d8'); { const [X, Y] = S(x + 0.62, y + 0.7, 1.0); g.strokeStyle = '#c83a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + TW * 0.05, Y - TW * 0.05); g.stroke(); }
        { const [X, Y] = S(x + 0.32, y + 0.75, 0.7); g.strokeStyle = '#b8302a'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.arc(X, Y, TW * 0.11, 0, 7); g.stroke(); }
        return true;
      case 'urn':   // urna di pietra con la fiamma azzurra (laboratorio)
        cyl(x + 0.5, y + 0.5, 0.24, 0, 0.12, '#5a5466'); cyl(x + 0.5, y + 0.5, 0.12, 0.12, 0.45, '#6a6478'); cyl(x + 0.5, y + 0.5, 0.3, 0.45, 0.75, '#7a7488'); cyl(x + 0.5, y + 0.5, 0.33, 0.72, 0.8, '#8a8498');
        { const [X, Y] = S(x + 0.5, y + 0.5, 0.82); g.fillStyle = '#5ac8ff'; g.beginPath(); g.moveTo(X - TW * 0.15, Y); g.quadraticCurveTo(X, Y - TW * 0.6, X + TW * 0.15, Y); g.fill(); g.fillStyle = '#d8f4ff'; g.beginPath(); g.moveTo(X - TW * 0.07, Y); g.quadraticCurveTo(X, Y - TW * 0.32, X + TW * 0.07, Y); g.fill(); }
        K.glow(x + 0.5, y + 0.5, 1.1, 1.6, 'rgba(110,200,255,.35)');
        return true;
      case 'wcan': cyl(x + 0.5, y + 0.5, 0.18, 0, 0.36, '#7a8a96'); cyl(x + 0.5, y + 0.5, 0.19, 0.34, 0.38, '#9aa8b4'); K.line(S(x + 0.62, y + 0.5, 0.25), S(x + 0.95, y + 0.4, 0.5), '#7a8a96', Math.max(3, TW / 14)); return true;
      case 'plantc':   // vaso della pianta carnivora (la pianta che si muove la disegnano le figure extra)
        cyl(x + 0.5, y + 0.5, o.b ? 0.44 : 0.34, 0, o.b ? 0.55 : 0.42, '#6a3a4a'); cyl(x + 0.5, y + 0.5, (o.b ? 0.44 : 0.34) * 1.08, o.b ? 0.5 : 0.38, o.b ? 0.6 : 0.46, '#8a4a5a'); cyl(x + 0.5, y + 0.5, (o.b ? 0.44 : 0.34) * 0.9, o.b ? 0.6 : 0.46, o.b ? 0.62 : 0.48, '#2a1e14');
        return true;
      case 'clockgf': {   // pendola alta: cassa intagliata, quadrante, vetro col pendolo e i pesi
        const wd = ['#5a3420', '#3a2a3a', '#6a4a2a'][(x + y) % 3];
        bx(x + 0.18, y + 0.26, x + 0.82, y + 0.74, 0, 0.18, K.shade(wd, 0.8)); bx(x + 0.22, y + 0.3, x + 0.78, y + 0.7, 0.18, 2.3, wd); bx(x + 0.16, y + 0.24, x + 0.84, y + 0.76, 2.3, 2.42, K.shade(wd, 1.2));
        { const [X, Y] = S(x + 0.5, y + 0.5, 2.6); g.fillStyle = K.shade(wd, 1.1); g.beginPath(); g.moveTo(X - TW * 0.3, Y + TW * 0.12); g.quadraticCurveTo(X, Y - TW * 0.25, X + TW * 0.3, Y + TW * 0.12); g.fill(); dot(x + 0.5, y + 0.5, 2.7, 0.05, '#d8b050'); }
        qL(x + 0.28, x + 0.72, y + 0.7, 1.5, 2.2, '#c8a050'); qL(x + 0.31, x + 0.69, y + 0.7, 1.55, 2.15, '#efe4c8');
        K.line(S(x + 0.5, y + 0.71, 1.85), S(x + 0.6, y + 0.71, 1.95), '#2a1e14', 2); K.line(S(x + 0.5, y + 0.71, 1.85), S(x + 0.44, y + 0.71, 2.02), '#2a1e14', 2);
        qL(x + 0.3, x + 0.7, y + 0.7, 0.35, 1.42, '#1a1410'); qL(x + 0.33, x + 0.67, y + 0.7, 0.38, 1.39, '#2a2018');
        K.line(S(x + 0.5, y + 0.71, 1.38), S(x + 0.47, y + 0.71, 0.7), '#c8a050', 1.5); dot(x + 0.47, y + 0.71, 0.65, 0.07, '#d8b050');
        for (const a of [0.38, 0.6]) { K.line(S(x + a, y + 0.71, 1.38), S(x + a, y + 0.71, 1.0), '#8a8a8a', 1); cyl(x + a, y + 0.7, 0.03, 0.85, 1.0, '#b08a3a'); }
        return true;
      }
      case 'gearbox': {   // cassa con ingranaggi sopra
        bx(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, 0.6, '#7a5a34'); bx(x + 0.12, y + 0.46, x + 0.88, y + 0.54, 0.6, 0.63, '#5a4024');
        for (const [a, b, r, z] of [[0.4, 0.4, 0.24, 0.63], [0.66, 0.6, 0.16, 0.66]]) { cyl(x + a, y + b, r, z, z + 0.08, '#b8944a'); cyl(x + a, y + b, r * 0.4, z + 0.08, z + 0.1, '#6a4e22'); }
        return true;
      }
    }
    return false;   // gli altri (barili, casse) li disegna il motore
  }

  // ---- GLI ALCHIMISTI: il personaggio di ognuno con il CAPPELLO A PUNTA e la CINTURA DELLE AMPOLLE (disegnati insieme a lui: stessa profondita') ----
  // punto in cima alla testa per ogni personaggio (in unita' di cqPlayer: TW/34; x verso dove guarda)
  const HEAD = { omino: [0, -39], procione: [4, -40], gatto: [4, -40], regista: [4, -43], guardia: [5, -42], tonno: [6, -44], giraffa: [10, -73], polipo: [4, -40], bruco: [8, -42], bassotto: [14, -29], palma: [3, -40], pinguino: [4, -52], pane: [1, -41], lupo: [17, -49] };
  const BELT = { giraffa: -26, bassotto: -10, pinguino: -14, lupo: -20, palma: -14 };
  const sideOf = (G, c) => G && G.chars.indexOf(c) === 1 ? 1 : 0;
  function wizard(g, X, Y, TW, L, walk, f, s, vials, cos) {
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
    if (cos) cosDraw(g, cos, f, x0, hy, tx, ty, walk);
    g.restore();
  }
  // I PREMI DELLA COLLEZIONE sul mago (cos = 'stars,crown,owl,rose,…'), nelle unita' del cappello (x0, hy = tesa; tx, ty = punta)
  function cosDraw(g, cos, f, x0, hy, tx, ty, walk) {
    const has = k => cos.includes(k), t = performance.now() / 1000;
    if (has('stars')) { star(g, x0 + f * 5, hy - 9, 2.4, '#ffe070'); star(g, x0 - f * 5, hy - 19, 1.9, '#ffe070'); star(g, (x0 + tx) / 2 + f * 2, (hy + ty) / 2 - 2, 1.6, '#fff4b0'); star(g, tx, ty - 2.5, 2.2 + 0.4 * Math.sin(t * 4), '#ffe070'); }
    if (has('crown')) { g.fillStyle = '#f2c040'; g.beginPath(); g.moveTo(x0 - 10, hy - 1.5); for (let i = 0; i <= 6; i++) g.lineTo(x0 - 10 + i * 20 / 6, hy - (i % 2 ? 6 : 10)); g.lineTo(x0 + 10, hy - 1.5); g.closePath(); g.fill(); g.fillStyle = '#e8384a'; g.beginPath(); g.arc(x0, hy - 4.5, 1.6, 0, 7); g.fill(); g.fillStyle = '#5ab8ff'; g.beginPath(); g.arc(x0 - f * 6, hy - 4, 1.1, 0, 7); g.fill(); }
    if (has('rose')) { const rx = x0 + f * 7, ry = hy - 4; g.fillStyle = '#3e7a34'; g.beginPath(); g.ellipse(rx + f * 3, ry + 1, 2.6, 1.2, 0.4 * f, 0, 7); g.fill(); g.fillStyle = '#c8203a'; g.beginPath(); g.arc(rx, ry, 2.8, 0, 7); g.fill(); g.fillStyle = '#ff4a62'; g.beginPath(); g.arc(rx - 0.6, ry - 0.6, 1.5, 0, 7); g.fill(); }
    if (has('gear')) { const gx = x0 - f * 6, gy = hy - 4.5, a = t * 1.5; g.fillStyle = '#e8b830'; g.beginPath(); for (let i = 0; i < 16; i++) { const an = a + i * Math.PI / 8, r = i % 2 ? 2.4 : 3.2; i ? g.lineTo(gx + Math.cos(an) * r, gy + Math.sin(an) * r) : g.moveTo(gx + Math.cos(an) * r, gy + Math.sin(an) * r); } g.closePath(); g.fill(); g.fillStyle = '#7a5a10'; g.beginPath(); g.arc(gx, gy, 0.9, 0, 7); g.fill(); }
    if (has('phoenix')) { const px = x0 - f * 8, py = hy - 3; g.strokeStyle = '#ff8a2a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - f * 6, py - 8, px - f * 4, py - 16); g.stroke(); g.strokeStyle = '#ffd24a'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - f * 6, py - 8, px - f * 4, py - 16); g.stroke(); g.fillStyle = Math.sin(t * 12) > 0 ? '#ffe070' : '#ff7a2a'; g.beginPath(); g.arc(px - f * 4, py - 16.5, 1.3, 0, 7); g.fill(); }
    if (has('owl')) {   // gufetto sulla spalla (dalla parte opposta a dove guarda), dondola un po'
      const ox = x0 - f * 13, oy = hy + 14 + Math.sin(t * 2.2) * 0.6;
      g.fillStyle = '#7a5a3a'; g.beginPath(); g.ellipse(ox, oy, 4.6, 5.6, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(ox - 4, oy - 4); g.lineTo(ox - 3.6, oy - 8); g.lineTo(ox - 1.5, oy - 5); g.moveTo(ox + 4, oy - 4); g.lineTo(ox + 3.6, oy - 8); g.lineTo(ox + 1.5, oy - 5); g.fill();
      g.fillStyle = '#d8c0a0'; g.beginPath(); g.ellipse(ox, oy + 1.8, 3, 3.2, 0, 0, 7); g.fill();
      const bl = (t % 4) < 0.15; g.fillStyle = '#fff'; for (const e of [-1.7, 1.7]) { g.beginPath(); g.arc(ox + e, oy - 2.2, 1.5, 0, 7); g.fill(); }
      g.fillStyle = '#1a1410'; for (const e of [-1.7, 1.7]) { if (bl) g.fillRect(ox + e - 1.3, oy - 2.4, 2.6, 0.6); else { g.beginPath(); g.arc(ox + e + f * 0.4, oy - 2.2, 0.8, 0, 7); g.fill(); } }
      g.fillStyle = '#f0a030'; g.beginPath(); g.moveTo(ox - 0.8, oy - 1); g.lineTo(ox + 0.8, oy - 1); g.lineTo(ox, oy + 0.6); g.fill();
    }
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
    { id: 's', n: 'Sabbia del tempo', e: '⏳', c: '#e0c068', el: 'slow', pw: 1, spd: 0.25, dur: 1.3, inst: 0.1, d: 'rallenta tutto, anche il volo' },
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
  // POZIONI LEGGENDARIE: tre ricette segrete (una per piano), con l'indovinello nel ricettario. Sono piu' forti (LEG_AMP) e piu' larghe,
  // e chi le PREPARA per la prima volta sblocca un ornamento per il cappello (pr). Chiave = ingredienti in ordine alfabetico
  const LEGEND = {
    grw: { n: 'Linfa della Regina Carnivora', fl: 0, pr: 'rose', rid: 'Ciò che cresce, ciò che incolla, ciò che tesse: la regina della serra si nutre di tre doni.' },
    ims: { n: 'Lacrima di Crono', fl: 1, pr: 'gear', rid: 'Sabbia che scorre, gelo che ferma, vetro che riflette: così si imprigiona l\'attimo.' },
    cfx: { n: 'Fiamma della Fenice Nera', fl: 2, pr: 'phoenix', rid: 'Il drago presta il fuoco, la fenice la piuma, la cenere ricorda: rinasce ciò che brucia.' } };
  const LEG_AMP = 1.6, LEG_AREA = 1.3;
  const FUSE = 3.0, AREA = 1.3, SPEED = 5.5;   // (passo 5: 7 -> 5,5 e 2,6 -> 3,0: le ampolle si vedono arrivare e si possono schivare)   // miccia di una pozione stabile (s), raggio della zona (caselle), velocita' di volo (caselle/s)
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
    const LG = LEGEND[key]; if (LG) { amp *= LEG_AMP; area *= LEG_AREA; }   // leggendaria
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
    if (LG) n = LG.n;
    const P = { k: key, ings, s, main, n, leg: LG ? 1 : 0, e: LG ? '🌟' : main ? EL[main].e : '💧', c: LG ? '#f2c040' : mix(ings.map(g => g.c)), spd: SPEED * spd, area: AREA * area * (1 + 0.12 * (ings.length - 1)), dur, bnc, inst: Math.round(inst * 100) / 100, fuse: FUSE * Math.exp(-2.2 * inst), rx };
    BREW.set(key, P); return P;
  }

  // ======================= PREPARAZIONE: il CALDERONE a tutto schermo (ognuno dietro il suo paravento) =======================
  const BELT_N = 4, MAXI = 3, PREP = 90, PREP2 = 60, DUEL = 90;   // (giocabilita': +30 s per pensare alle miscele)
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
#alPrep>*{flex-shrink:0}#alPrep .top{width:100%;max-width:480px;display:flex;align-items:center;gap:8px}#alPrep .top b{flex:1;font-size:16px}#alPrep .tm{font:800 20px system-ui;min-width:56px;text-align:center;padding:4px 8px;border-radius:10px;background:rgba(0,0,0,.35)}#alPrep .tm.low{color:#ff8a7a}
#alPrep button{font:700 14px system-ui,sans-serif;border:0;border-radius:12px;color:#fff;cursor:pointer}
#alRdy{background:#2f8a4a;padding:9px 12px}#alRdy.on{background:#5a5a62}
#alCv{width:100%;max-width:480px;height:190px;display:block}
#alPot{display:flex;gap:6px;min-height:34px;align-items:center;justify-content:center;flex-wrap:wrap}#alPot .ch{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);padding:5px 9px;font-weight:600}#alPot .ch i{font-style:normal;opacity:.6;margin-left:4px}#alPot .h{opacity:.7;font-size:13px}
#alAct{display:flex;gap:8px;width:100%;max-width:480px}#alAct button{flex:1;padding:12px 6px}#alBot{background:#8a4ad0;font-size:16px!important}#alBot:disabled,#alEmp:disabled{opacity:.35}#alEmp{background:rgba(255,255,255,.14)}
#alJars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;max-width:480px}
#alJars button{position:relative;min-height:80px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.22);border-radius:14px 14px 10px 10px;overflow:hidden;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;font-weight:600;font-size:11px;line-height:1.1}
#alJars button .lq{position:absolute;left:0;right:0;bottom:0;height:38%;opacity:.55}#alJars button .e{font-size:26px;position:relative;margin-top:2px}#alJars button .n{position:relative;margin-top:2px}#alJars button .d{position:relative;font-weight:600;font-size:10.5px;color:#ffe6b0;margin-top:2px}#alJars button:active{transform:scale(.94)}#alJars button.off{opacity:.4}
#alBelt{display:flex;gap:10px;align-items:flex-end;justify-content:center;width:100%;max-width:480px;padding:6px 0 2px;border-top:2px solid #6a4a2e}#alBelt .lb{font-weight:700;margin-right:2px;align-self:center}
#alBelt button{width:58px;background:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:2px}#alBelt .vi{width:30px;height:40px;border-radius:7px 7px 15px 15px;border:2px solid rgba(220,230,240,.8);position:relative;overflow:hidden;background:rgba(255,255,255,.06)}#alBelt .vi::before{content:'';position:absolute;top:-2px;left:8px;width:10px;height:7px;background:#8a6a42;border-radius:2px}#alBelt .vi .lq{position:absolute;left:0;right:0;bottom:0;height:72%}#alBelt .ig{font-size:12px;min-height:16px;font-weight:400}
#alMsg{min-height:18px;font-size:13px;color:#ffd890;text-align:center}
#alBk{background:rgba(255,255,255,.14);padding:9px 11px}#alFl{width:100%;max-width:480px;text-align:center;font-size:14px;line-height:1.3;background:rgba(0,0,0,.25);border-radius:12px;padding:6px 10px;box-sizing:border-box}#alFl small{font-size:12px;opacity:.9}#alPot .bkl{flex-basis:100%;text-align:center;font-size:12.5px;line-height:1.3;color:#f2ead8;max-width:480px}
#alBook{position:absolute;inset:0;z-index:9;background:rgba(10,6,18,.86);display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 60px) 12px 20px;box-sizing:border-box;overflow-y:auto}
#alBook .bk{width:100%;max-width:460px;background:#2a1e36;border:2px solid #c8a050;border-radius:16px;padding:14px;color:#f2ead8;font:14px/1.4 system-ui,sans-serif}#alBook .bk>b{font-size:17px;display:block;margin-bottom:6px}
#alBook button{display:block;width:100%;margin-top:10px;padding:11px;border:0;border-radius:12px;font:700 15px system-ui;color:#fff;background:#8a4ad0}#alBook button:disabled{opacity:.4}#alBook .cl{background:rgba(255,255,255,.14)}
#alBook .col{margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(200,160,80,.4)}#alBook .col>b{display:block;font-size:16px;margin:4px 0}#alBook .col>small{display:block;opacity:.8;margin-bottom:4px}#alBook .pz{display:flex;gap:8px;align-items:center;padding:4px 0;opacity:.5}#alBook .pz.on{opacity:1}#alBook .pz span{flex:0 0 26px;font-size:18px;text-align:center}#alBook .pz i{margin-left:auto;font-style:normal;font-weight:700;color:#ffd890}#alBook .pz em{font-size:13px}
#alCol{width:100%;max-width:480px;text-align:center;font-size:12.5px;background:rgba(200,160,80,.14);border:1px solid rgba(200,160,80,.35);border-radius:10px;padding:5px 8px;box-sizing:border-box;cursor:pointer}
#alBook .rc{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid rgba(255,255,255,.1)}#alBook .rc .ig{flex:0 0 58px;font-size:18px}#alBook small{opacity:.85}
#alHelp{position:absolute;left:12px;right:12px;bottom:250px;z-index:10;max-width:460px;margin:0 auto;background:rgba(26,18,36,.95);color:#f2ead8;border:1px solid rgba(200,160,80,.6);border-radius:14px;padding:12px 14px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)}#alHelp.prep{bottom:auto;top:240px}
#alAsc{position:absolute;inset:0;z-index:12;background:#070b1c;cursor:pointer}#alAsc canvas{width:100%;height:100%;display:block}#alAsc .tx{position:absolute;left:0;right:0;top:27%;text-align:center;color:#f4ecd8;text-shadow:0 2px 14px #000,0 0 4px #000;font:700 15px system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;opacity:0;transition:opacity .45s;pointer-events:none}#alAsc .tx b{font-size:30px}#alAsc .tx span{font-size:21px;color:#ffe2a0}#alAsc .tx small{font-size:14px;opacity:.85;letter-spacing:.08em}
#alHelp button{display:block;margin:10px auto 0;padding:8px 18px;border:0;border-radius:10px;background:#8a4ad0;color:#fff;font:700 14px system-ui}`;
    document.head.appendChild(st);
  }
  function prepOpen(G) {
    prepCss(); prepClose();
    const el = document.createElement('div'); el.id = 'alPrep';
    el.innerHTML = `<div class="top"><span class="tm" id="alTm">${mmss((G.st && G.st.n > 1) ? PREP2 : PREP)}</span><b>⚗️ Prepara</b><button id="alBk" type="button">📖</button><button id="alRdy" type="button">✔ Pronto</button></div>
      <div id="alFl">${FL.e} <b>Piano ${G.st ? G.st.n : 1} di ${FLOORS.length}: ${FL.n}</b><br><small>${FL.tip}</small></div>
      <div id="alCol">${colLine()}</div>
      <canvas id="alCv"></canvas><div id="alPot"></div><div id="alMsg"></div>
      <div id="alAct"><button id="alEmp" type="button">🗑️ Svuota</button><button id="alBot" type="button">🧪 Imbottiglia</button></div>
      <div id="alJars">${ING.map(g => `<button type="button" data-i="${g.id}"><span class="lq" style="background:${g.c}"></span><span class="e">${g.e}</span><span class="n">${esc(g.n)}</span><span class="d">${esc(g.d)}</span></button>`).join('')}</div>
      <div id="alBelt"><span class="lb">Cintura</span>${Array.from({ length: BELT_N }, (_, i) => `<button type="button" data-b="${i}"><span class="vi"><span class="lq"></span></span><span class="ig"></span></button>`).join('')}</div>`;
    $('#ciack').appendChild(el);
    el.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => addIng(G, b.dataset.i); });
    el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => unbottle(G, +b.dataset.b); });
    $('#alBot').onclick = () => bottle(G); $('#alEmp').onclick = () => { if (!U2.pot.length) return; U2.pot = []; U2.drain = now(); SFX.pour(); prepRender(G); };
    $('#alRdy').onclick = () => setReady(G, !ready(G)); $('#alBk').onclick = () => bookOpen(G); $('#alCol').onclick = () => bookOpen(G);
    helpOnce('prep');
    U2.pot = []; U2.fx = []; U2.msg = '';
    prepRender(G);
  }
  function prepClose() { const el = document.getElementById('alPrep'); if (el) el.remove(); }
  const ready = G => !!(G.st && G.st.rd && G.st.rd[G.me.id]) || !!G.myRdy;
  function say(t) { U2.msg = t; U2.msgT = now(); const m = document.getElementById('alMsg'); if (m) m.textContent = t; }
  function addIng(G, id) {
    if (U2.pot.length >= MAXI) { say('Al massimo ' + MAXI + ' ingredienti: imbottiglia o svuota.'); SFX.full(); U2.shake = now(); return; }
    U2.pot.push(id); U2.fx.push({ id, t: now() }); SFX.plop(); say('');
    legendCheck(G); prepRender(G);
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
    // ANTEPRIMA: cosa esce dal calderone. Se gli ingredienti REAGISCONO tra loro e' un segreto (lo svela il ricettario): si vede solo la gittata
    if (U2.pot.length) { const P = brew(potKey(U2.pot)); p.insertAdjacentHTML('beforeend', '<div class="bkl">' + (secret(P) ? '✨ <b>Questi ingredienti reagiscono tra loro!</b> Cosa nasce è un segreto (📖 il ricettario lo svela)<br>' + esc(flight(P).join(' · ')) : (P.rx.length ? '📖 ' : '') + '<b style="color:' + cqShade(P.c, 1.4) + '">' + P.e + ' ' + esc(P.n) + '</b><br>' + esc(describe(P))) + '</div>'); }
    p.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { U2.pot.splice(+b.dataset.p, 1); SFX.pour(); prepRender(G); }; });
    const full = G.me.belt.every(Boolean);
    $('#alBot').disabled = !U2.pot.length || full; $('#alEmp').disabled = !U2.pot.length;
    el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('off', U2.pot.length >= MAXI));
    el.querySelectorAll('[data-b]').forEach(b => { const k = G.me.belt[+b.dataset.b], P = k && brew(k); b.querySelector('.lq').style.background = P ? P.c : 'transparent'; b.querySelector('.ig').textContent = P ? P.ings.map(g => g.e).join('') : '—'; });
    const r = $('#alRdy'), on = ready(G); r.classList.toggle('on', on); r.textContent = on ? '⏳ Aspetto…' : '✔ Pronto';
  }
  // ======================= LA SALITA: tra un piano e l'altro la telecamera sale FUORI dalla torre, sotto la luna (si tocca per saltarla) =======================
  const ASC_T = 3.4;
  function ascOpen(n) {
    const old = document.getElementById('alAsc'); if (old) old.remove();
    const F = FLOORS[n - 1]; if (!F) return; prepCss();
    const el = document.createElement('div'); el.id = 'alAsc'; el.dataset.t0 = performance.now();
    el.innerHTML = '<canvas></canvas><div class="tx"><small>⬆️ SI SALE…</small><b>' + F.e + ' Piano ' + n + ' di ' + FLOORS.length + '</b><span>' + esc(F.n) + '</span></div>';
    el.onclick = () => el.remove(); $('#ciack').appendChild(el); SFX.asc();
  }
  const fr = x => x - Math.floor(x);
  function ascCloud(g, x, y, s, col, al) { g.globalAlpha = al; g.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 1], [-0.9, 0.2, 0.7], [0.95, 0.15, 0.75], [-0.4, -0.35, 0.65], [0.45, -0.3, 0.6], [1.7, 0.3, 0.45], [-1.6, 0.35, 0.4]]) { g.beginPath(); g.ellipse(x + dx * s, y + dy * s * 0.6, r * s, r * s * 0.55, 0, 0, 7); g.fill(); } g.globalAlpha = 1; }
  function ascDraw(el) {
    const cv = el.querySelector('canvas'), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const a = (performance.now() - +el.dataset.t0) / 1000; if (a > ASC_T + 0.5) { el.remove(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = Math.min(1, a / ASC_T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, FLH = H * 1.1, cam = e * FLH;
    el.style.opacity = a > ASC_T ? String(Math.max(0, 1 - (a - ASC_T) / 0.5)) : '1';
    el.querySelector('.tx').style.opacity = a > 0.45 && a < ASC_T ? '1' : '0';
    // cielo, stelle, luna
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#060a1a'); sk.addColorStop(0.55, '#121a3a'); sk.addColorStop(1, '#283062'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) { const x = fr(i * 0.618034) * W, y = fr(fr(i * 0.754878) + cam * 0.06 / (H * 1.3)) * H * 1.3 - H * 0.15; g.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(a * 1.7 + i)); g.fillStyle = '#e8ecff'; g.fillRect(x, y, i % 7 ? 1.2 : 2, i % 7 ? 1.2 : 2); }
    g.globalAlpha = 1;
    const mr = Math.min(W, H) * 0.05, mx = W * 0.87, my = H * 0.13 + cam * 0.1, mg = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4.5);
    mg.addColorStop(0, 'rgba(240,236,210,.35)'); mg.addColorStop(1, 'rgba(240,236,210,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    g.fillStyle = '#f2ecd6'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.fillStyle = '#d8d0b4'; for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.25, 0.16], [0.35, -0.35, 0.1]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, 7); g.fill(); }
    // montagne lontane: scendono e spariscono mentre si sale
    for (const [base, col, amp, ph] of [[0.8, '#1c2448', 0.12, 0], [0.88, '#141a36', 0.08, 2]]) {
      const yb = H * base + cam * 0.5; if (yb - H * amp > H) continue; g.fillStyle = col; g.beginPath(); g.moveTo(0, H + cam);
      for (let x = 0; x <= W; x += 8) g.lineTo(x, yb - H * amp * (0.5 + 0.3 * Math.sin(x / W * 7 + ph) + 0.2 * Math.sin(x / W * 17 + ph * 2)));
      g.lineTo(W, H + cam); g.closePath(); g.fill();
    }
    // nuvole lontane
    for (let i = 0; i < 6; i++) ascCloud(g, (fr(i * 0.37 + a * 0.012) * 1.4 - 0.2) * W, fr(i * 0.23 + cam / (H * 2.2)) * H * 1.2 - H * 0.1, W * 0.09, '#2c3666', 0.75);
    // LA TORRE: cilindro di pietra illuminato dalla luna (a destra), mattoni, cornici dei piani, finestre accese, edera
    const R0 = Math.min(W * 0.25, 160), cx = W * 0.47, NS = 18, hs = (a2, b2) => fr(Math.sin(a2 * 12.9898 + b2 * 78.233) * 43758.5);
    for (let i = 0; i < NS; i++) { const t1 = -Math.PI / 2 + i / NS * Math.PI, t2 = -Math.PI / 2 + (i + 1) / NS * Math.PI, l = 0.32 + 0.75 * Math.max(0, Math.cos((t1 + t2) / 2 - 0.7)); g.fillStyle = cqShade('#4c4658', l); const x1 = cx + R0 * Math.sin(t1), x2 = cx + R0 * Math.sin(t2); g.fillRect(x1, 0, x2 - x1 + 0.6, H); }
    const bh = 15, off = ((cam % bh) + bh) % bh;
    for (let y = -bh + off; y < H; y += bh) {
      const row = Math.round((y - cam) / bh); g.fillStyle = 'rgba(10,8,16,.32)'; g.fillRect(cx - R0, y, R0 * 2, 1.4);
      for (let j = 0; j < 14; j++) {
        const th = -Math.PI / 2 + (j + (row & 1) * 0.5) / 14 * Math.PI, th2 = th + Math.PI / 14; if (Math.abs(th) > 1.5) continue;
        const h = hs(row, j); if (h < 0.22 && th2 < 1.55) { g.fillStyle = h < 0.1 ? 'rgba(255,240,220,.07)' : 'rgba(0,0,0,.16)'; g.fillRect(cx + R0 * Math.sin(th) + 1, y + 1.4, R0 * (Math.sin(th2) - Math.sin(th)) - 1, bh - 1.4); }
        g.fillStyle = 'rgba(10,8,16,.32)'; g.fillRect(cx + R0 * Math.sin(th), y, 1.2 * Math.cos(th) + 0.4, bh);
      }
    }
    const ledge = Lw => H * 0.66 + cam - Lw * FLH;
    for (const L of [-1, 0, 1, 2]) {   // finestre (due per piano) con la luce calda
      const yl = ledge(L);
      for (const [fy, th] of [[0.3, 0.45], [0.62, -0.5]]) {
        const y = yl - FLH * fy, x = cx + R0 * Math.sin(th), w = 18 * Math.cos(th), hh = 30; if (y < -60 || y > H + 60) continue;
        const gl = g.createRadialGradient(x, y, 2, x, y, 46); gl.addColorStop(0, 'rgba(255,190,90,.38)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gl; g.fillRect(x - 50, y - 50, 100, 100);
        g.fillStyle = '#231a26'; g.beginPath(); g.moveTo(x - w / 2 - 3, y + hh / 2 + 3); g.lineTo(x - w / 2 - 3, y - hh / 2 + w / 2); g.arc(x, y - hh / 2 + w / 2, w / 2 + 3, Math.PI, 0); g.lineTo(x + w / 2 + 3, y + hh / 2 + 3); g.closePath(); g.fill();
        g.fillStyle = Math.sin(a * 9 + L * 3 + th * 5) > 0.92 ? '#ffd890' : '#ffc260'; g.beginPath(); g.moveTo(x - w / 2, y + hh / 2); g.lineTo(x - w / 2, y - hh / 2 + w / 2); g.arc(x, y - hh / 2 + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + hh / 2); g.closePath(); g.fill();
        g.fillStyle = '#231a26'; g.fillRect(x - 0.8, y - hh / 2 + 2, 1.6, hh - 2); g.fillRect(x - w / 2, y + 2, w, 1.6);
      }
    }
    for (const L of [-1, 0, 1, 2]) {   // cornici di pietra tra un piano e l'altro (con i merli)
      const y = ledge(L); if (y < -30 || y > H + 30) continue; const R1 = R0 * 1.08;
      g.fillStyle = '#2a2632'; g.fillRect(cx - R1, y + 4, R1 * 2, 8); g.fillStyle = cqShade('#6a6478', 1); g.fillRect(cx - R1, y - 6, R1 * 2, 10);
      for (let j = 0; j < 9; j++) { const th = -1.35 + j / 8 * 2.7, x = cx + R1 * Math.sin(th), w = 13 * Math.cos(th); g.fillStyle = cqShade('#6a6478', 0.55 + 0.5 * Math.max(0, Math.cos(th - 0.7))); g.fillRect(x - w / 2, y - 16, w, 11); }
    }
    for (const L of [-1, 0, 1, 2]) for (const [th, seed, len] of [[-1.1, 1, 0.55], [-0.35, 2, 0.3], [0.5, 3, 0.42], [1.2, 4, 0.62]]) {   // edera: rampicanti che pendono dalle cornici
      const top = ledge(L) + 10, n = Math.round(len * FLH / 9), x0 = cx + R0 * Math.sin(th + (L & 1) * 0.15), cw = Math.cos(th); if (top > H || top + n * 9 < 0) continue;
      const X = i => x0 + Math.sin(i * 0.33 + seed * 2 + L) * 6 * cw;
      g.strokeStyle = '#1e3a1c'; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= n; i++) i ? g.lineTo(X(i), top + i * 9) : g.moveTo(X(i), top); g.stroke();
      for (let i = 1; i <= n; i++) { const h = hs(i + L * 7, seed), sz = (3 + 3.5 * h) * (1 - 0.5 * i / n) * (0.6 + 0.4 * cw), sd = i % 2 ? 1 : -1; g.fillStyle = h < 0.33 ? '#2a5228' : h < 0.7 ? '#3a6e34' : '#4a8a3e'; g.beginPath(); g.ellipse(X(i) + sd * sz * 0.8, top + i * 9, sz, sz * 0.62, sd * 0.6, 0, 7); g.fill(); if (h > 0.6) { g.beginPath(); g.ellipse(X(i) - sd * sz * 0.5, top + i * 9 + 4, sz * 0.7, sz * 0.45, -sd * 0.5, 0, 7); g.fill(); } }
    }
    // nuvole davanti (passano davanti alla torre) e buio in basso
    for (let i = 0; i < 4; i++) ascCloud(g, (fr(i * 0.53 - a * 0.03) * 1.6 - 0.3) * W, fr(i * 0.31 + cam / (H * 0.9)) * H * 1.5 - H * 0.25, W * 0.16, '#3a4476', 0.82);
    const vg = g.createLinearGradient(0, H * 0.7, 0, H); vg.addColorStop(0, 'rgba(6,8,18,0)'); vg.addColorStop(1, 'rgba(6,8,18,.85)'); g.fillStyle = vg; g.fillRect(0, H * 0.7, W, H * 0.3);
  }
  cqEachFrame(() => { const el = document.getElementById('alAsc'); if (el) ascDraw(el); });
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
    if (P && P.leg) { for (let i = 0; i < 12; i++) { const a2 = t * 1.5 + i * 0.5236, r = R * (0.5 + 0.25 * Math.sin(t * 3 + i)); g.fillStyle = i % 2 ? '#ffe070' : '#fff8d0'; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + i); g.beginPath(); g.arc(cx + Math.cos(a2) * r * 1.2, cy - R * 0.4 + Math.sin(a2) * r * 0.35 - Math.abs(Math.sin(t * 2 + i)) * R * 0.5, R * 0.035, 0, 7); g.fill(); } g.globalAlpha = 1; }   // leggendaria: scintille d'oro
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
  function randPot() {   // il calderone di ricarica: una pozione a caso, ma che arrivi almeno a 6 caselle
    for (let k = 0; k < 60; k++) {
      const n = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3, ids = [];
      for (let i = 0; i < n; i++) ids.push(cqPickOne(CPU_ING));
      const P = brew(potKey(ids)); if (P.spd * P.fuse >= 6 && P.main !== 'pop' && !P.leg) return P.k;
    }
    return 'f';
  }
  // IL COMPUTER PREPARA LA CINTURA: prova tante miscele e le VALUTA con le stesse tabelle del gioco (potScore: danno, stati, spinte, pozze),
  // scarta quelle che non arrivano lontano o che scoppiano in mano, tiene varieta' (al massimo 2 dello stesso elemento) e, dalla seconda manche,
  // si prepara contro quello che l'altro ha lanciato (G.seen: elementi lanciati dalle persone): porta gli elementi che reagiscono con i suoi e uno specchio se l'altro brucia molto
  function cpuBelt(G) {
    const seen = (G && G.seen) || {}, tot = Object.values(seen).reduce((a, b) => a + b, 0) || 1, cand = [];
    for (let k = 0; k < 160; k++) {
      const n = Math.random() < 0.35 ? 1 : Math.random() < 0.75 ? 2 : 3, ids = [];
      for (let i = 0; i < n; i++) ids.push(cqPickOne(CPU_ING));
      const P = brew(potKey(ids)); if (cand.some(c => c.P.k === P.k) || P.spd * Math.min(P.fuse, 9) < 6.5 || P.main === 'pop' || P.leg) continue;
      let sc = potScore(G, P, { x: C, y: C, pit: false, vol: false }) + Math.random() * 1.2;
      for (const [el, v] of Object.entries(seen)) {   // contro le sue pozze: elementi che reagiscono con quelli che usa
        if (REACT.some(([a, b]) => (a === el && P.s[b]) || (b === el && P.s[a]))) sc += 1.5 * v / tot;
        if (FX[el] && FX[el].dmg && P.main === 'mirror') sc += 2.5 * v / tot;
      }
      cand.push({ P, sc });
    }
    cand.sort((a, b) => b.sc - a.sc);
    const out = [], cnt = {};
    const burns = P => Object.entries(P.s).some(([el, v]) => FX[el] && FX[el].dmg && v >= 0.6);
    for (const { P } of cand) {   // varieta': al massimo 2 dello stesso elemento e 2 che bruciano; l'ultima, se mancano, una di controllo (stati o spinte)
      if ((cnt[P.main] || 0) >= 2 || (burns(P) && (cnt.burn || 0) >= 2)) continue;
      if (out.length === BELT_N - 1 && !out.some(k => stops(brew(k))) && !stops(P)) continue;   // almeno una che blocca (per la combo)
      cnt[P.main] = (cnt[P.main] || 0) + 1; if (burns(P)) cnt.burn = (cnt.burn || 0) + 1; out.push(P.k); if (out.length >= BELT_N) break;
    }
    while (out.length < BELT_N) out.push('f');
    return out;
  }
  // QUANTO VALE una pozione lanciata su un bersaglio (tutto dalle tabelle: se cambia un ingrediente o un effetto, il computer si adegua da solo).
  // tg = { x, y, pit: vicino alla voragine, vol: cintura che sfrigola }; conta anche le reazioni con le pozze che ci sono gia' li'
  const ST_VAL = { frz: 2.5, stuck: 2, slow: 1.2, blind: 1.5, big: 0.8, small: -0.6 };
  const ZN_VAL = { burn: 1.5, ice: 0.8, glue: 1, slowz: 0.7, smoke: 0.2, mirror: 0 };
  function potScore(G, P, tg) {
    const st = Object.assign({}, P.s); let sc = 0;
    if (st.chaos) { sc += 1; delete st.chaos; }
    if (G && G.zn) for (const z of zonesAt(G, tg.x, tg.y)) { const ze = ZONE[z.k].el; for (const [a, b, to] of REACT) { const pe = ze === a ? b : ze === b ? a : null; if (pe && st[pe] > 0.01) { st[to] = (st[to] || 0) + Math.max(1, st[pe] * 1.5); st[pe] = 0; sc += 0.8; break; } } }
    // COMBO: il danno vale il doppio su chi e' gia' bloccato; se non lo e' e ho un modo per bloccarlo (tg.set), prima conviene bloccare
    for (const [el, v] of Object.entries(st)) {
      const F = FX[el]; if (!F || v < 0.05) continue;
      if (F.dmg && v >= 0.6) sc += 3 * (tg.vol ? 1.6 : 1) * (tg.blk ? 2.2 : tg.set && !tg.vol ? 0.55 : 1);   // (cintura che sfrigola: il fuoco subito)
      if (F.st) sc += (ST_VAL[F.st[0]] || 0) * Math.min(v, 1.5) + (tg.set && !tg.blk && BLOCK.includes(F.st[0]) ? 1.8 : 0);
      if (F.push) sc += Math.abs(F.push * v) * (tg.pit ? 1.4 : 0.35);
      if (F.whirl) sc += tg.pit ? 2 : 0.6;
      if (F.zone) sc += ZN_VAL[F.zone[0]] || 0;
    }
    return sc;
  }
  // pericoli dei piani per il computer: vicino a una pianta sveglia, sulla strada del pendolo
  function hazardAt(G, x, y) {
    let h = 0;
    if (FL && FL.plants) for (const p of G.pl || []) { const [px, py] = PLANTS[p.i], fl = evPh(G) === 'warn' && G.st.ev.k === 'spores'; if ((plOn(G, p) || fl) && Math.hypot(px + 0.5 - x, py + 0.5 - y) < (fl ? EVENTS.spores.r + 0.6 : plReach(p) + 0.9)) h++; }
    if (FL && FL.pend) { const dx = x - C, dy = y - C, along = dx * PDX + dy * PDY, across = Math.abs(dx * PDY - dy * PDX); if (Math.abs(along) < PEND_A + 0.6 && across < 1.1) h++; }
    return h;
  }
  const hurts = P => Object.entries(P.s).some(([el, v]) => FX[el] && FX[el].dmg && v >= 0.6);   // toglie cuori
  const stops = P => Object.keys(P.s).some(el => FX[el] && FX[el].st && BLOCK.includes(FX[el].st[0]));   // blocca (prepara la combo)
  const secret = P => P.rx.length > 0 && !book().own && !P.leg;   // (le leggendarie si annunciano da sole)   // nata da una reazione e senza ricettario: non si sa cosa fa
  const pushOf = P => Object.entries(P.s).reduce((a, [el, v]) => a + ((FX[el] && FX[el].push) || 0) * v, 0);   // + spinge via, - tira

  // ======================= IL DUELLO =======================
  // EFFETTI di ogni elemento quando la pozione si rompe (v = forza dell'elemento nella pozione). Un elemento nuovo = una riga qui (e una in EL).
  //   dmg: toglie un cuore a chi e' nella zona (se v >= 0,6); st: [stato, secondi per forza] su chi e' preso; zone: [pozza che resta, secondi];
  //   zr: zona piu' larga (x); push: spinta in caselle per forza (+ via dal centro, - verso il centro); whirl: spinta in una direzione a caso; chaos: un elemento a caso
  const FX = {
    fire: { dmg: 1, zone: ['burn', 4] }, ice: { st: ['slow', 2.5], zone: ['ice', 6] }, smoke: { zone: ['smoke', 7], zr: 1.4 },
    glue: { st: ['stuck', 2.6], zone: ['glue', 5] }, grow: { st: ['big', 6] }, shrink: { st: ['small', 6] },
    slow: { st: ['slow', 4], zone: ['slowz', 5] }, pull: { push: -2.4, zr: 1.8 }, wind: { push: 2.6, zr: 1.2 },
    mirror: { zone: ['mirror', 6] }, chaos: { chaos: 1 },
    steam: { dmg: 1, push: 2.2, zr: 1.2 }, soot: { st: ['blind', 3.5], zone: ['smoke', 5], zr: 1.3 }, statue: { st: ['frz', 3] },
    pop: { push: 0.8 }, blaze: { dmg: 1, zone: ['burn', 5], zr: 1.4 }, whirl: { whirl: 2.6, zr: 1.3 } };
  const CHAOS = ['fire', 'ice', 'smoke', 'glue', 'grow', 'shrink', 'slow', 'pull', 'wind'];
  // POZZE sul pavimento: sp = velocita' di chi ci sta dentro (x); hurt = un cuore ogni tot secondi; slide = si scivola; hide = dentro non ti vedono; mirror = rimanda le pozioni
  // el = elemento della pozza: una pozione che ci cade sopra reagisce con lui (REACT)
  const ZONE = { burn: { c: '#ff6a2a', hurt: 1.5, el: 'fire', d: 'pozza che brucia' }, ice: { c: '#bfe8ff', sp: 0.85, slide: 1, el: 'ice', d: 'ghiaccio che fa scivolare' }, glue: { c: '#d89a2a', sp: 0.3, el: 'glue', d: 'colla a terra' }, slowz: { c: '#e0c068', sp: 0.5, el: 'slow', d: 'sabbia che rallenta' },
    smoke: { c: '#8a8694', hide: 1, el: 'smoke', d: 'nuvola che nasconde' }, mirror: { c: '#e8f0ff', mirror: 1, el: 'mirror', d: 'specchio che rimanda le pozioni' } };
  // stati sul personaggio: velocita' (x) e cosa si vede
  const STATE = { slow: { sp: 0.45, e: '⏳', d: 'rallenta' }, stuck: { sp: 0, e: '🍯', d: 'incolla a terra' }, frz: { sp: 0, e: '🧊', d: 'congela' }, big: { sp: 0.75, e: '🍄', d: 'fa diventare giganti' }, small: { sp: 1.3, e: '✨', d: 'rimpicciolisce' }, blind: { e: '🌑', d: 'acceca' },
    // stati BUONI (si prendono BEVENDO una pozione, vedi DRINK)
    fireS: { e: '🛡️', d: 'mantello di fiamme: il fuoco non ti brucia' }, skate: { sp: 1.55, e: '⛸️', d: 'pattini: corri veloce' }, haste: { sp: 1.3, e: '⚡', d: 'il tempo corre per te: veloce e lanci prima' },
    anchor: { e: '⚓', d: 'piedi piantati: nessuno ti spinge' }, shield: { e: '🪞', d: 'scudo: rimanda indietro la prossima ampolla' }, hidden: { e: '👻', d: 'sparisci nel fumo' }, stone: { sp: 0, e: '🗿', d: 'statua: niente ti fa male, ma sei fermo' } };
  // BERE O LANCIARE: ogni ampolla si puo' anche BERE. Ogni elemento bevuto da' a chi beve [stato buono di STATE, secondi per forza],
  // oppure 'dash' (scatto: caselle per forza) o 'chaos' (un effetto a caso). Elemento nuovo = una riga qui (senza riga, bevuto non fa niente)
  const DRINK = { fire: ['fireS', 6], blaze: ['fireS', 8], steam: ['dash', 3.2], ice: ['skate', 5], statue: ['stone', 2.5], smoke: ['hidden', 5], soot: ['hidden', 7],
    glue: ['anchor', 6], pull: ['anchor', 5], grow: ['big', 6], shrink: ['small', 6], slow: ['haste', 5], wind: ['dash', 3], whirl: ['dash', 3.6], pop: ['dash', 2.2], mirror: ['shield', 8], chaos: ['chaos', 1] };
  const DASH_D = 'scatto in avanti (per schivare)';
  // cosa fa una pozione BEVUTA: [[stato o 'dash', durata o caselle]] (il caos sceglie a caso quando la bevi)
  const drinkOf = P => Object.entries(P.s).filter(([el, v]) => DRINK[el] && v > 0.05).sort((a, b) => b[1] - a[1]).map(([el, v]) => [DRINK[el][0], DRINK[el][1] * Math.min(1.6, Math.max(0.6, v))]);
  const drinkTxt = P => { const L = drinkOf(P); return L.length ? [...new Set(L.map(([k]) => k === 'dash' ? '💨 ' + DASH_D : k === 'chaos' ? '🎲 un effetto a sorpresa' : STATE[k].e + ' ' + STATE[k].d))].join(', ') : 'niente'; };
  const RMIN = 1.6, RMAX = 9, PULL = 110, THROW_CD = 0.8, KETTLE_T = 2.5, IV = 0.9, FALL_T = 2, MRES = 5, WINS = 2;
  // GIOCABILITA' (niente lanci a raffica): le ampolle CONTANO. Il calderone del tuo angolo ha una RISERVA di RESERVE ricariche (+1 ogni RES_T s)
  // e ti ridà le TUE pozioni (quelle preparate, ampolla per ampolla). COMBO: chi è gia' bloccato (stati BLOCK o pozza lentissima) e viene
  // colpito da un elemento che fa male perde COMBO cuori invece di uno: prima lo fermi, poi lo colpisci
  const RESERVE = 4, RES_T = 20, BLOCK = ['stuck', 'frz', 'slow'], COMBO = 2;
  const r2 = v => Math.round(v * 100) / 100;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  const posOf = (G, c) => c === G.me ? cq : c;
  const fxOn = (G, c, k) => !!(c.fx && c.fx[k] > G.time);
  const out = (G, c) => fxOn(G, c, 'out');
  const body = (G, c) => fxOn(G, c, 'big') ? 0.75 : fxOn(G, c, 'small') ? 0.18 : 0.38;
  const inArena = (x, y) => Math.hypot(x - C, y - C) < RAD - 0.6;
  const clampIn = (x, y) => { const d = Math.hypot(x - C, y - C), m = RAD - 0.8; return d > m ? [C + (x - C) * m / d, C + (y - C) * m / d] : [x, y]; };
  const zonesAt = (G, x, y) => (G.zn || []).filter(z => G.time < z.te && Math.hypot(x - z.x, y - z.y) < z.r);
  const sideIdx = (G, c) => G.chars.indexOf(c) === 1 ? 1 : 0;
  const oppOf = (G, c) => G.chars.find(o => o !== c);
  // BLOCCATO (per la combo): uno stato di BLOCK preso PRIMA di questo scoppio (fx[stato + '@'] = quando e' cominciato), o in una pozza lentissima
  function blocked(G, c) {
    if (!c.fx) return false;
    if (BLOCK.some(s => fxOn(G, c, s) && (c.fx[s + '@'] || 0) < G.time - 0.05)) return true;
    const p = posOf(G, c); return zonesAt(G, p.x, p.y).some(z => ZONE[z.k].sp != null && ZONE[z.k].sp <= 0.3 && G.time - z.t0 > 0.3);
  }
  function speedOf(G, c) {
    if (!G.st || G.st.ph !== 'duel' || out(G, c) || (c === G.me && G.fill)) return 0;
    let k = 1; for (const [s, S] of Object.entries(STATE)) if (S.sp != null && fxOn(G, c, s)) k *= S.sp;
    const p = posOf(G, c); for (const z of zonesAt(G, p.x, p.y)) if (ZONE[z.k].sp) k *= ZONE[z.k].sp;
    if (evOn(G, 'midnight')) k *= EVENTS.midnight.sp;
    return k;
  }
  // ======================= EVENTO A META' DUELLO (uno per piano: FLOORS[].ev) =======================
  // Annunciato EV_WARN secondi prima (rintocco, tremore), poi dura d secondi. L'host lo scrive in G.st.ev = { k, t } (arriva a tutti con lo stato)
  //   spores (serra): le piante fioriscono e sparano nuvole di polline con un effetto a caso (pol) tutto intorno
  //   midnight (orologio): mezzanotte, il tempo rallenta per tutti: si cammina a sp, le ampolle lanciate volano a fl, gli ingranaggi si fermano
  //   surge (laboratorio): la voragine erutta magia: ogni pozione che scoppia e' piu' forte (amp) e piu' larga (ar)
  const EV_AT = 45, EV_WARN = 5;
  const EVENTS = {
    spores: { e: '🌸', d: 1.5, warn: '🌸 <b>Le piante stanno per fiorire!</b> Allontanati da loro…', go: '🌸 <b>FIORITURA!</b> Nuvole di polline magico', pol: ['slow', 'shrink', 'grow', 'smoke', 'glue'], r: 2.1 },
    midnight: { e: '🕛', d: 6, warn: '🔔 <b>Sta per suonare la mezzanotte…</b>', go: '🕛 <b>MEZZANOTTE!</b> Il tempo rallenta per tutti', sp: 0.55, fl: 0.5 },
    surge: { e: '🌋', d: 10, warn: '🌋 <b>La voragine trema…</b>', go: '🌋 <b>ERUZIONE MAGICA!</b> Tutte le pozioni sono più forti', amp: 1.5, ar: 1.25 } };
  const evPh = G => { const E = G.st && G.st.ph === 'duel' && G.st.ev && EVENTS[G.st.ev.k]; if (!E) return ''; const t = G.time - G.st.ev.t; return t < -EV_WARN ? '' : t < 0 ? 'warn' : t < E.d ? 'on' : 'done'; };
  const evOn = (G, k) => !!(G.st && G.st.ev && G.st.ev.k === k && evPh(G) === 'on');
  function evTick(G) {   // host: le fioriture (una volta, quando comincia)
    const ev = G.st.ev; if (!ev || ev.done || evPh(G) !== 'on') return; ev.done = 1;
    if (ev.k === 'spores') for (const p of G.pl || []) { const [px, py] = PLANTS[p.i], E = EVENTS.spores, el = cqPickOne(E.pol); applyEl(G, el, 1, px + 0.5, py + 0.5, E.r, 1, -1); note(G, '', px + 0.5, py + 0.5, 'spore'); }
  }

  // ---- le ampolle in volo: partenza, arrivo, tempo (ogni telefono le fa volare da se'); MICCIA: se finisce prima dell'arrivo scoppia in aria ----
  function mkFlask(G, o, k, x0, y0, x1, y1, fz, bn, q) {
    const P = brew(k), sl = evOn(G, 'midnight') ? EVENTS.midnight.fl : 1;[x1, y1] = clampIn(x1, y1);   // mezzanotte: volano piano (e la miccia dura di piu')
    const dist = Math.hypot(x1 - x0, y1 - y0), f = { id: ++G.flN, o, k, q, x0: r2(x0), y0: r2(y0), x1: r2(x1), y1: r2(y1), t0: r2(G.time), d: r2(Math.max(0.25, dist / P.spd / sl)), pk: r2(0.6 + dist * 0.22), fz: r2(fz / sl), bn: bn || 0 };
    G.fl.push(f); return f;
  }
  const flPos = (f, t) => { const u = Math.max(0, Math.min(1, (t - f.t0) / f.d)); return { x: f.x0 + (f.x1 - f.x0) * u, y: f.y0 + (f.y1 - f.y0) * u, z: 1.1 * (1 - u) + f.pk * 4 * u * (1 - u), u }; };
  // SCONTRO IN VOLO: due ampolle di giocatori diversi che si incrociano (vicine e alla stessa altezza) scoppiano insieme IN ARIA:
  // i loro ingredienti si sommano in una sola miscela (brew fa le reazioni con la stessa tabella REACT) e l'effetto cade li' sotto.
  // Si controlla tutto il tratto fatto dall'ultimo giro (5 punti), cosi' non si incrociano senza vedersi anche se l'host va a scatti
  const AIR_D = 0.65, AIR_Z = 1.2;
  function airHits(G) {
    const tp = G.flT != null && G.flT < G.time ? G.flT : G.time - 0.05; G.flT = G.time;
    const L = G.fl.filter(f => !f.done);
    for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
      const f = L[a], h = L[b]; if (f.o === h.o || f.done || h.done) continue;
      const t0 = Math.max(tp, f.t0 + 0.12, h.t0 + 0.12), t1 = Math.min(G.time, f.t0 + Math.min(f.d, f.fz), h.t0 + Math.min(h.d, h.fz)); if (t1 < t0) continue;
      for (let s = 0; s <= 4; s++) {
        const t = t0 + (t1 - t0) * s / 4, p = flPos(f, t), q = flPos(h, t);
        if (Math.hypot(p.x - q.x, p.y - q.y) > AIR_D || Math.abs(p.z - q.z) > AIR_Z) continue;
        f.done = h.done = 1; burst(G, potKey([...f.k, ...h.k]), (p.x + q.x) / 2, (p.y + q.y) / 2, h.t0 >= f.t0 ? h.o : f.o, false, 'air'); break;
      }
    }
  }
  function flTick(G) {
    airHits(G);
    for (const f of G.fl) {
      if (f.done) continue;
      const te = f.t0 + Math.min(f.d, f.fz), now2 = Math.min(G.time, te), p = flPos(f, now2);
      // scudo a specchio (pozione bevuta): la prima ampolla dell'altro che arriva addosso torna indietro, e lo scudo si consuma
      const sh = p.z < 2.6 && G.chars.find(c => c.id !== f.o && fxOn(G, c, 'shield') && Math.hypot(p.x - posOf(G, c).x, p.y - posOf(G, c).y) < body(G, c) + 0.55);
      if (sh) {
        f.done = 1; sh.fx.shield = 0; const th = G.chars.find(c => c.id === f.o), tp = th ? posOf(G, th) : { x: f.x0, y: f.y0 };
        const nf = mkFlask(G, sh.id, f.k, p.x, p.y, tp.x, tp.y, brew(f.k).fuse, f.bn); nf.mr = f.mr; note(G, '', p.x, p.y, 'mirror'); continue;   // miccia nuova: torna davvero da chi l'ha lanciata
      }
      // lo specchio dell'altro la rimanda indietro (una volta per specchio)
      const mz = (G.zn || []).find(z => z.k === 'mirror' && z.o !== f.o && G.time < z.te && !(f.mr || []).includes(z.i) && Math.hypot(p.x - z.x, p.y - z.y) < z.r && p.z < 2.6);
      if (mz) {
        f.done = 1; const th = G.chars.find(c => c.id === f.o), tp = th ? posOf(G, th) : { x: f.x0, y: f.y0 };
        const nf = mkFlask(G, mz.o, f.k, p.x, p.y, tp.x, tp.y, f.fz - (now2 - f.t0), f.bn); nf.mr = (f.mr || []).concat(mz.i);
        note(G, '', p.x, p.y, 'mirror'); continue;
      }
      if (G.time < te) continue;
      f.done = 1;
      if (f.d <= f.fz && f.bn > 0) {   // piuma di fenice: rimbalza avanti (meta' strada) se la miccia regge
        const dx = f.x1 - f.x0, dy = f.y1 - f.y0, nf = mkFlask(G, f.o, f.k, f.x1, f.y1, f.x1 + dx * 0.55, f.y1 + dy * 0.55, f.fz - f.d, f.bn - 1); nf.mr = f.mr;
        note(G, f.k, f.x1, f.y1, 'bounce'); continue;
      }
      burst(G, f.k, p.x, p.y, f.o, f.d > f.fz);
    }
    G.fl = G.fl.filter(f => !f.done);
  }
  // ---- la pozione si rompe: ogni elemento fa il suo effetto (tabella FX), con la sua forza ----
  function burst(G, key, x, y, o, early, how) {
    const P = brew(key); if (!P) return;
    note(G, key, x, y, how || (early ? 'early' : ''));
    const st = Object.assign({}, P.s), SU = evOn(G, 'surge') ? EVENTS.surge : null, area = P.area * (SU ? SU.ar : 1);
    if (SU) for (const k of Object.keys(st)) st[k] *= SU.amp;   // eruzione magica
    for (const k of Object.keys(st)) if (FX[k] && FX[k].chaos) { const e = cqPickOne(CHAOS); st[e] = (st[e] || 0) + st[k]; delete st[k]; }   // occhio di rospo: un elemento a caso
    // REAZIONI SUL CAMPO: la pozione cade su una pozza (anche dell'altro) e i due elementi reagiscono come nel calderone (stessa tabella REACT).
    // L'elemento della pozione si consuma, la pozza sparisce, nasce il prodotto (piu' forte) nel mezzo
    for (const z of G.zn.slice()) {
      const ze = ZONE[z.k].el; if (!ze || G.time >= z.te || Math.hypot(z.x - x, z.y - y) > z.r + area * 0.8) continue;
      for (const [a, b, to] of REACT) {
        const pe = ze === a ? b : ze === b ? a : null; if (!pe || !(st[pe] > 0.01)) continue;
        const v = Math.max(1, st[pe] * 1.5), mx = (x + z.x) / 2, my = (y + z.y) / 2;
        st[pe] = 0; G.zn = G.zn.filter(q => q !== z);
        note(G, to, mx, my, 'react');
        applyEl(G, to, v, mx, my, Math.max(z.r, area) * 1.1, P.dur, o);
        break;
      }
    }
    for (const [el, v] of Object.entries(st)) if (v > 0.01) applyEl(G, el, v, x, y, area, P.dur, o);
    plantsHit(G, st, x, y, area);
  }
  function note(G, k, x, y, how) { G.bxN++; G.bx.push([G.bxN, k, r2(x), r2(y), r2(G.time), how]); if (G.bx.length > 10) G.bx.shift(); }
  // l'effetto di UN elemento (tabella FX) con la sua forza v, nella zona di raggio area
  function applyEl(G, el, v, x, y, area, dur, o) {
    const F = FX[el]; if (!F) return;
    const r = area * (F.zr || 1);
    if (F.zone) addZone(G, F.zone[0], x, y, F.zone[0] === 'mirror' ? 1.1 : r, F.zone[1] * dur * Math.min(1.6, Math.max(0.6, v)), o);
    for (const c of G.chars) {
      if (out(G, c) || (c.remote && cqLagging(c))) continue;   // anti-lag: chi non manda la posizione non si colpisce
      const p = posOf(G, c), d = Math.hypot(p.x - x, p.y - y), reach = r + body(G, c);
      if (F.push && d < reach + 0.6) push(G, c, x, y, F.push * v * (1 - 0.4 * d / (reach + 0.6)));
      if (F.whirl && d < reach) { const a = Math.random() * 6.283; knock(G, c, Math.cos(a) * F.whirl * v, Math.sin(a) * F.whirl * v); }
      if (d > reach) continue;
      if (F.dmg && v >= 0.6 && !fxOn(G, c, 'fireS')) { const cb = blocked(G, c); hurt(G, c, EL[el].e + ' ' + EL[el].n, cb ? COMBO : 1); volatile(G, c); }
      if (F.st) setFx(G, c, F.st[0], F.st[1] * Math.min(1.8, Math.max(0.5, v)));
    }
  }
  // AMPOLLE INSTABILI alla cintura: se il fuoco (o un'esplosione) ti prende, quelle con la miccia corta possono scoppiarti addosso.
  // L'altro lo sa: la cintura instabile sfrigola (scintille). c.bz = [numero, ampolle scoppiate]: il telefono dell'amico le toglie dalla sua cintura
  const VOLATILE = 0.45;
  function volatile(G, c) {
    if (!c.belt) return; let mask = 0;
    c.belt.forEach((k, i) => { const P = k && brew(k); if (P && P.inst >= VOLATILE && Math.random() < 0.6) { mask |= 1 << i; G.pend.push({ t: G.time + 0.3 + 0.2 * i, k, c: c.id }); c.belt[i] = ''; } });
    if (!mask) return;
    c.bzN = (c.bzN || 0) + 1; c.bz = [c.bzN, mask];
    G.hxN++; G.hx.push([G.hxN, c.id, '💥 le ampolle instabili alla cintura scoppiano!', 'boom']); if (G.hx.length > 8) G.hx.shift();
  }
  function pendTick(G) {
    for (const p of G.pend) if (G.time >= p.t) { const c = G.chars.find(o => o.id === p.c); p.done = 1; if (c && !out(G, c) && G.st.ph === 'duel') { const q = posOf(G, c); burst(G, p.k, q.x, q.y, c.id, true); } }
    G.pend = G.pend.filter(p => !p.done);
  }
  function addZone(G, k, x, y, r, dur, o) { G.zn.push({ i: ++G.znN, k, x: r2(x), y: r2(y), r: r2(r), t0: r2(G.time), te: r2(G.time + dur), o }); if (G.zn.length > 16) G.zn.shift(); }
  function setFx(G, c, k, s) {
    c.fx = c.fx || {};
    if (k === 'big' && fxOn(G, c, 'small')) { c.fx.small = 0; return; }   // gigante e folletto si annullano
    if (k === 'small' && fxOn(G, c, 'big')) { c.fx.big = 0; return; }
    if (!fxOn(G, c, k)) c.fx[k + '@'] = r2(G.time);   // quando comincia (serve alla combo)
    c.fx[k] = r2(Math.max(c.fx[k] || 0, G.time + s));
  }
  function push(G, c, x, y, k) {
    const p = posOf(G, c); let dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
    if (d < 0.05) { const a = Math.random() * 6.283; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    let m = k * (fxOn(G, c, 'big') ? 0.5 : fxOn(G, c, 'small') ? 1.5 : 1);
    if (m < 0) m = -Math.min(-m, d);   // tirato verso il centro, non oltre
    knock(G, c, dx / d * m, dy / d * m);
  }
  // spinta: la fa il telefono di chi la subisce (c.kb = [numero, dx, dy]); se sbatte contro un muro o finisce nella voragine lo dice all'host
  function knock(G, c, dx, dy) { if (Math.hypot(dx, dy) < 0.15 || fxOn(G, c, 'anchor') || fxOn(G, c, 'stone')) return; c.kbN = (c.kbN || 0) + 1; c.kb = [c.kbN, r2(dx), r2(dy)]; }
  // scatto (pozione bevuta): una spinta "sicura" (kb[3] = 1): si ferma contro i muri e sul bordo della voragine, senza farsi male
  function dash(G, c, dx, dy, len) { const l = Math.hypot(dx, dy); if (l < 0.01) return; c.kbN = (c.kbN || 0) + 1; c.kb = [c.kbN, r2(dx / l * len), r2(dy / l * len), 1]; }
  function hurt(G, c, why, n = 1) {
    if (out(G, c) || (c.iv || 0) > G.time || !G.st || G.st.ph !== 'duel' || fxOn(G, c, 'stone')) return;
    c.hp = Math.max(0, c.hp - n); c.iv = r2(G.time + IV); c.hitT = r2(G.time);
    G.hxN++; G.hx.push(n > 1 ? [G.hxN, c.id, why, 'combo'] : [G.hxN, c.id, why]); if (G.hx.length > 8) G.hx.shift();
    if (c.hp <= 0) roundEnd(G, oppOf(G, c), (n > 1 ? '💥 COMBO! ' : '💀 ') + c.name + ' è a terra!');
  }
  function fell(G, c) {
    if (out(G, c) || !G.st || G.st.ph !== 'duel') return;
    c.fx = c.fx || {}; c.fx.out = r2(G.time + FALL_T); c.fx.fall = r2(G.time); c.iv = 0;
    c.hp = Math.max(0, c.hp - 1); c.hitT = r2(G.time); G.hxN++; G.hx.push([G.hxN, c.id, '🕳️ giù nella voragine']);
    if (c.hp <= 0) roundEnd(G, oppOf(G, c), '🕳️ ' + c.name + ' è caduto nella voragine!');
  }
  // ---- la spinta vista da chi la subisce (io sul mio telefono, i personaggi del computer sull'host) ----
  function slideStart(G, P, kb) { const d = Math.hypot(kb[1], kb[2]); P.sl = { vx: kb[1] / d, vy: kb[2] / d, left: d, sp: Math.max(6, d / 0.32), safe: kb[3] ? 1 : 0 }; }
  function slideStep(G, P, c, dt) {
    const S = P.sl; if (!S) return;
    const st = Math.min(S.left, S.sp * dt), nx = P.x + S.vx * st, ny = P.y + S.vy * st;
    if (S.safe && (isPit(Math.floor(nx), Math.floor(ny)) || !cqFree(nx, ny))) { P.sl = null; return; }   // scatto: si ferma e basta
    if (isPit(Math.floor(nx), Math.floor(ny))) { P.x = nx; P.y = ny; P.sl = null; report(G, c, 'fall'); return; }
    // il bordo della voragine non ferma: chi ci viene spinto ci cade dentro
    const r = CQ_R, ok = [[-r, -r], [r, -r], [-r, r], [r, r]].every(([a, b]) => isPit(Math.floor(nx + a), Math.floor(ny + b)) || !cqBlocked(nx + a, ny + b));
    if (!ok) { if (S.left > 0.7) report(G, c, 'bonk'); P.sl = null; return; }
    P.x = nx; P.y = ny; S.left -= st; if (S.left <= 0.01) P.sl = null;
  }
  function report(G, c, k) {
    if (k === 'fall') { if (c === G.me) { G.myFall = G.time; } else c.fallAt = G.time; }
    if (c === G.me && G.guest) { cqNetSend({ k }); return; }
    if (k === 'fall') fell(G, c); else { hurt(G, c, '💫 contro il muro'); setFx(G, c, 'stuck', 0.7); }
  }
  // ---- lancio: G.me sul mio telefono (l'amico lo chiede all'host), il computer sull'host ----
  function throwFrom(G, c, i, tx, ty, q) {
    const k = c.belt && c.belt[i]; if (!k || out(G, c) || fxOn(G, c, 'frz') || (c.thT || 0) > G.time || !G.st || G.st.ph !== 'duel') return null;
    if (!c.bot || c.remote) { G.seen = G.seen || {}; for (const [el, v] of Object.entries(brew(k).s)) G.seen[el] = (G.seen[el] || 0) + v; }   // il computer se lo ricorda
    const p = posOf(G, c); c.belt[i] = ''; c.thT = r2(G.time + cdOf(G, c)); c.face = (tx - ty) - (p.x - p.y) >= 0 ? 1 : -1;
    return mkFlask(G, c.id, k, p.x, p.y, tx, ty, brew(k).fuse, brew(k).bnc, q);
  }
  const cdOf = (G, c) => THROW_CD * (fxOn(G, c, 'haste') ? 0.5 : 1);
  // ---- BERE: l'host applica gli effetti di DRINK a chi beve (anche all'amico, che lo chiede con { k: 'dr' }); (dx, dy) = verso dello scatto ----
  function drinkFrom(G, c, i, dx, dy) {
    const k = c.belt && c.belt[i]; if (!k || out(G, c) || fxOn(G, c, 'frz') || (c.thT || 0) > G.time || !G.st || G.st.ph !== 'duel') return false;
    const P = brew(k); c.belt[i] = ''; c.thT = r2(G.time + cdOf(G, c));
    let L = drinkOf(P); if (L.some(([s]) => s === 'chaos')) { const pick = cqPickOne(Object.values(DRINK).filter(d => d[0] !== 'chaos')); L = L.map(d => d[0] === 'chaos' ? [pick[0], pick[1]] : d); }
    for (const [s, v] of L) { if (s === 'dash') dash(G, c, dx, dy, v); else setFx(G, c, s, v); }
    G.hxN++; G.hx.push([G.hxN, c.id, P.e + ' ' + P.n + ': ' + (L.length ? [...new Set(L.map(([s]) => s === 'dash' ? '💨 scatto' : STATE[s].e + ' ' + STATE[s].d.split(':')[0]))].join(', ') : 'niente'), 'drink']); if (G.hx.length > 8) G.hx.shift();
    if (P.inst >= VOLATILE && Math.random() < 0.5) hurt(G, c, '🤢 pozione instabile bevuta');   // instabile: anche in bocca e' un rischio
    return true;
  }
  // il mio scatto va dove sto camminando (se sto fermo: di lato rispetto all'altro)
  function dashDir(G) {
    if (Math.hypot(G.vx || 0, G.vy || 0) > 0.5) return [r2(G.vx), r2(G.vy)];
    const o = G.opp || { x: C, y: C }, dx = cq.x - o.x, dy = cq.y - o.y; return [r2(-dy || 1), r2(dx)];
  }
  function myDrink(G) {
    const i = G.sel, k = G.me.belt[i]; if (!k || (G.me.thT || 0) > G.time || out(G, G.me) || fxOn(G, G.me, 'frz')) return;
    SFX.drink(); const [dx, dy] = dashDir(G);
    if (G.guest) { cqNetSend({ k: 'dr', i, p: k, dx, dy }); G.me.belt[i] = ''; G.me.thT = G.time + cdOf(G, G.me); }
    else drinkFrom(G, G.me, i, dx, dy);
    nextSel(G);
  }
  function myThrow(G, tx, ty) {
    const i = G.sel, k = G.me.belt[i]; if (!k || (G.me.thT || 0) > G.time || out(G, G.me) || fxOn(G, G.me, 'frz')) return;
    SFX.whoosh();
    if (G.guest) { const q = (G.q = (G.q || 0) + 1); cqNetSend({ k: 'th', i, p: k, x: r2(tx), y: r2(ty), q }); const P = brew(k); G.me.belt[i] = ''; G.me.thT = G.time + cdOf(G, G.me); const d = Math.hypot(tx - cq.x, ty - cq.y);
      G.fl.push({ id: -q, o: G.me.id, k, q, x0: cq.x, y0: cq.y, x1: clampIn(tx, ty)[0], y1: clampIn(tx, ty)[1], t0: G.time, d: Math.max(0.25, d / P.spd / (evOn(G, 'midnight') ? EVENTS.midnight.fl : 1)), pk: 0.6 + d * 0.22, fz: P.fuse / (evOn(G, 'midnight') ? EVENTS.midnight.fl : 1), bn: 0, loc: 1 }); }
    else throwFrom(G, G.me, i, tx, ty);
    nextSel(G);
  }
  function nextSel(G) { const b = G.me.belt; if (b[G.sel]) return; for (let j = 1; j <= BELT_N; j++) { const i = (G.sel + j) % BELT_N; if (b[i]) { G.sel = i; return; } } }
  // ---- ricarica al calderone del mio angolo: fermo KETTLE_T secondi per ampolla; ti ridà la TUA pozione di quell'ampolla (c.b0: la cintura
  // com'era all'inizio del duello; se l'avevi lasciata vuota, una a caso). Costa una ricarica della riserva (c.rf), che cresce di 1 ogni RES_T s ----
  const nearKettle = (G, c) => { const p = posOf(G, c), [kx, ky] = KETTLE[sideIdx(G, c)]; return Math.hypot(p.x - kx - 0.5, p.y - ky - 0.5) < 1.45; };
  const canFill = c => (c.rf || 0) > 0 && c.belt.some(v => !v);
  function fillDone(G, c) { const b = c.belt, i = b.findIndex(v => !v); if (i < 0 || !(c.rf > 0)) return; c.rf--; b[i] = (c.b0 && c.b0[i]) || randPot(); if (c === G.me) { SFX.bottle(); G.sel = b[G.sel] ? G.sel : i; sendBelt(G); } }
  function duelArm(G, c) { c.b0 = c.belt.slice(); c.rf = RESERVE; c.rfT = G.time; }   // inizio duello: cintura da ricaricare e riserva piena
  function regen(G, c) { if ((c.rf || 0) >= RESERVE) c.rfT = G.time; else if (G.time - (c.rfT || 0) >= RES_T) { c.rf = (c.rf || 0) + 1; c.rfT = G.time; } }

  // ======================= I PERICOLI DEI PIANI =======================
  // PIANTE CARNIVORE (serra): mordono chi passa vicino (carica 0,55 s con la bocca che si apre, poi -1 cuore e incollato). Cosa fanno le pozioni alle piante:
  // una riga per elemento (un elemento nuovo senza riga non le tocca)
  const PLANT_FX = { fire: ['burnt', 12], blaze: ['burnt', 16], steam: ['burnt', 8], ice: ['frozen', 6], statue: ['frozen', 10], grow: ['giant', 15], shrink: ['tiny', 12], slow: ['sleepy', 8], glue: ['sleepy', 5], soot: ['sleepy', 6] };
  const PL_TXT = { burnt: '🔥 Pianta bruciata!', frozen: '🧊 Pianta congelata!', giant: '🍄 Pianta GIGANTE!', tiny: '✨ Pianta piccina', sleepy: '💤 Pianta addormentata' };
  const plReach = p => p.st === 'giant' && p.te > 0 ? 2.3 : p.st === 'tiny' ? 0.8 : PLANTS[p.i][2] ? 1.6 : 1.3;
  const plOn = (G, p) => !(p.te > G.time && (p.st === 'burnt' || p.st === 'frozen' || p.st === 'sleepy'));
  function plantsInit(G) { G.pl = FL && FL.plants ? PLANTS.map((_, i) => ({ i, st: '', te: 0, bt: 0, bid: -1, cd: 0 })) : []; }
  function plantsTick(G) {
    for (const p of G.pl || []) {
      const [px, py] = PLANTS[p.i], cx = px + 0.5, cy = py + 0.5;
      if (p.te && p.te <= G.time) { p.st = ''; p.te = 0; }
      if (p.bid >= 0) {   // morso in corso
        if (G.time - p.bt >= 0.55) { const c = G.chars.find(o => o.id === p.bid); p.bid = -1; p.cd = G.time + 2.6; if (c && !out(G, c) && !(c.remote && cqLagging(c))) { const q = posOf(G, c); if (Math.hypot(q.x - cx, q.y - cy) < plReach(p) + 0.35) { if (p.st !== 'tiny') hurt(G, c, '🌱 morso della pianta carnivora'); setFx(G, c, 'stuck', p.st === 'tiny' ? 0.5 : 1.1); } } }
        continue;
      }
      if (!plOn(G, p) || p.cd > G.time) continue;
      for (const c of G.chars) { if (out(G, c)) continue; const q = posOf(G, c); if (Math.hypot(q.x - cx, q.y - cy) < plReach(p)) { p.bid = c.id; p.bt = G.time; break; } }
    }
  }
  function plantsHit(G, st, x, y, area) {   // una pozione scoppia vicino a una pianta
    for (const p of G.pl || []) {
      const [px, py] = PLANTS[p.i]; if (Math.hypot(px + 0.5 - x, py + 0.5 - y) > area + 0.6) continue;
      for (const el of Object.keys(st)) { const E = PLANT_FX[el]; if (!E || !(st[el] > 0.2)) continue; p.st = E[0]; p.te = r2(G.time + E[1]); p.bid = -1; G.hxN++; G.hx.push([G.hxN, -1, PL_TXT[E[0]], 'plant']); if (G.hx.length > 8) G.hx.shift(); break; }
    }
  }
  // INGRANAGGI (sala dell'orologio): chi ci sta sopra gira con loro (avanti e indietro, verso diverso per i due)
  function gearMove(G, P, dt) {
    if (!FL || !FL.gears || evOn(G, 'midnight')) return;   // a mezzanotte gli ingranaggi si fermano
    for (const [gx, gy, v] of GEARS) {
      const dx = P.x - gx, dy = P.y - gy, d = Math.hypot(dx, dy); if (d > GR + 0.15) continue;
      const w = gearW(G.time) * v * dt, nx = gx + dx * Math.cos(w) - dy * Math.sin(w), ny = gy + dx * Math.sin(w) + dy * Math.cos(w);
      if (cqFree(nx, ny)) { P.x = nx; P.y = ny; }
    }
  }
  // PENDOLO (sala dell'orologio): oscilla sopra il centro da un lato all'altro dello schermo; chi e' sotto mentre passa veloce viene sbalzato (-1 cuore)
  const PEND_A = 3.4, PEND_T = 3.6, PDX = Math.SQRT1_2, PDY = -Math.SQRT1_2;
  const pendPos = t => { const s2 = Math.sin(t / PEND_T * 6.2832); return { x: C + PDX * PEND_A * s2, y: C + PDY * PEND_A * s2, v: Math.cos(t / PEND_T * 6.2832) }; };
  function pendTick2(G) {
    if (!FL || !FL.pend) return;
    const B = pendPos(G.time); if (Math.abs(B.v) < 0.35) return;
    for (const c of G.chars) {
      if (out(G, c) || (c.remote && cqLagging(c)) || (c.pendT || 0) > G.time) continue;
      const q = posOf(G, c); if (Math.hypot(q.x - B.x, q.y - B.y) > 0.85) continue;
      c.pendT = G.time + 1.5; const sg = B.v > 0 ? 1 : -1; knock(G, c, PDX * sg * 3, PDY * sg * 3); hurt(G, c, '🕰️ colpito dal pendolo'); setFx(G, c, 'stuck', 0.3);
    }
  }
  // FIGURE EXTRA (disegnate in profondita' come i personaggi): le teste delle piante carnivore e il pendolo
  function plantDraw(g, X, Y, TW, p) {
    const G = cq.g, t = G ? G.time : 0, u = TW / 34, big = PLANTS[p.i][2], st = p.te > t ? p.st : '';
    const sc = (big ? 1.25 : 1) * (st === 'giant' ? 1.7 : st === 'tiny' ? 0.55 : 1), open = p.bid >= 0 ? Math.min(1, (t - p.bt) / 0.5) : 0.25 + 0.1 * Math.sin(t * 2 + p.i);
    const green = st === 'burnt' ? '#2a2420' : st === 'frozen' ? '#9ad0e8' : '#3e8a34', dark = st === 'burnt' ? '#1a1410' : st === 'frozen' ? '#6aa8c8' : '#2a6a24', inner = st === 'burnt' ? '#3a2a20' : st === 'frozen' ? '#d8f0ff' : '#c8344a';
    g.save(); g.translate(X, Y - (big ? 0.6 : 0.45) * TW * 0.575); g.scale(u * sc, u * sc);
    const sway = Math.sin(t * 1.3 + p.i) * 3 * (st === 'sleepy' ? 0.2 : 1), hx = sway, hy = st === 'sleepy' ? -26 : -40;
    g.strokeStyle = dark; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, hy / 2, hx, hy); g.stroke();
    for (const s2 of [-1, 1]) { g.fillStyle = green; g.beginPath(); g.ellipse(s2 * 8, -6, 9, 4, s2 * 0.5, 0, 7); g.fill(); }
    // la testa: due mascelle con i denti che si aprono
    const ang = 0.15 + open * 0.9;
    for (const s2 of [-1, 1]) {
      g.save(); g.translate(hx, hy); g.rotate(s2 * ang - (st === 'sleepy' ? 0.6 : 0));
      g.fillStyle = green; g.beginPath(); g.ellipse(0, s2 * -9, 14, 9, 0, s2 > 0 ? Math.PI : 0, s2 > 0 ? 2 * Math.PI : Math.PI); g.fill();
      g.fillStyle = inner; g.beginPath(); g.ellipse(0, s2 * -7, 11, 6, 0, s2 > 0 ? Math.PI : 0, s2 > 0 ? 2 * Math.PI : Math.PI); g.fill();
      g.fillStyle = '#f4f0e0'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3.4 - 1.5, s2 * -1); g.lineTo(i * 3.4, s2 * 4); g.lineTo(i * 3.4 + 1.5, s2 * -1); g.fill(); }
      g.restore();
    }
    if (st === 'burnt') { g.fillStyle = 'rgba(120,110,100,.6)'; for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; g.beginPath(); g.arc(hx + Math.sin(i + t) * 4, hy - 10 - ph * 22, 4 + ph * 5, 0, 7); g.fill(); } }
    if (st === 'sleepy') { g.fillStyle = '#e8f0ff'; g.font = '700 10px system-ui'; g.fillText('z', hx + 10, hy - 14 - (t * 8 % 8)); g.fillText('Z', hx + 16, hy - 24 - (t * 8 % 8)); }
    g.restore();
  }
  function pendDraw(g, X, Y, TW) {
    const G = cq.g; if (!G) return; const B = pendPos(G.time), U = TW * 0.575, z = 0.95, by = Y - z * U, sw = B.v;
    g.strokeStyle = '#8a6a2e'; g.lineWidth = Math.max(3, TW / 12); g.beginPath(); g.moveTo(X, by); g.lineTo(X - sw * TW * 0.6, by - TW * 6); g.stroke();
    g.fillStyle = '#b8944a'; g.beginPath(); g.ellipse(X, by, TW * 0.55, TW * 0.48, 0, 0, 7); g.fill();
    g.fillStyle = '#d8b860'; g.beginPath(); g.ellipse(X - TW * 0.12, by - TW * 0.1, TW * 0.32, TW * 0.27, 0, 0, 7); g.fill();
    g.strokeStyle = '#6a4e22'; g.lineWidth = 2; g.beginPath(); g.ellipse(X, by, TW * 0.55, TW * 0.48, 0, 0, 7); g.stroke();
  }
  pendDraw.top = 1.8;

  // ---- IL COMPUTER nel duello: sta a distanza, gira intorno, evita le pozze, lancia con un piccolo errore, ricarica quando e' a secco ----
  // il computer BEVE: per salvarsi (want = stati buoni che cerca); sceglie la pozione che lanciata varrebbe meno, e non spreca quelle forti se sta bene
  function botDrink(G, c, want, dx, dy) {
    if ((c.drT || 0) > G.time || (c.thT || 0) > G.time || !c.belt) return false;
    let bi = -1, bs = 1e9;
    c.belt.forEach((k, i) => { const P = k && brew(k); if (!P || !drinkOf(P).some(([s]) => want.includes(s))) return; const v = potScore(G, P, { x: C, y: C }); if (v < bs) { bs = v; bi = i; } });
    if (bi < 0 || (bs > 3.5 && c.hp > 1)) return false;
    c.drT = G.time + 4; return drinkFrom(G, c, bi, dx, dy);
  }
  function botTick(G, c, dt) {
    const P = c;
    if (P.sl) { slideStep(G, P, c, dt); return; }
    if (out(G, c) || c.hold) { c.path = []; return; }   // hold: fermo (solo per le prove)
    const o = oppOf(G, c), po = o ? posOf(G, o) : { x: C, y: C }, d = Math.hypot(po.x - c.x, po.y - c.y);
    const sp = speedOf(G, c);
    // SCHIVA: vede dove cade un'ampolla dell'altro (dopo un attimo, come una persona) e si sposta di lato
    if (!c.dodge || G.time > c.dodge) for (const f of G.fl) {
      if (f.o === c.id || G.time - f.t0 < 0.28 + (c.rt || (c.rt = 0.05 + Math.random() * 0.2))) continue;
      const P3 = brew(f.k), te = f.t0 + Math.min(f.d, f.fz), e = flPos(f, te); if (!P3 || te - G.time < 0.15) continue;
      const dd = Math.hypot(c.x - e.x, c.y - e.y), need = P3.area * 1.3 + 0.6; if (dd > need) continue;
      let ax = c.x - e.x, ay = c.y - e.y; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
      if (Math.random() < 0.4) botDrink(G, c, ['dash', 'shield', 'stone', 'skate'], -ay, ax);   // a volte si salva bevendo
      else if (Math.random() < 0.2 && (c.thT || 0) <= G.time) {   // o risponde con un CONTRO-LANCIO dritto verso chi ha lanciato: le ampolle si scontrano a meta' strada
        let ci = -1, cs = 1e9; const dl = Math.hypot(f.x0 - c.x, f.y0 - c.y);
        c.belt.forEach((k, i) => { const P4 = k && brew(k); if (!P4 || P4.spd * Math.min(P4.fuse, 9) < dl * 0.6) return; const v = potScore(G, P4, { x: C, y: C }); if (v < cs) { cs = v; ci = i; } });
        if (ci >= 0) throwFrom(G, c, ci, f.x0 + gauss() * 0.5, f.y0 + gauss() * 0.5);
      }
      for (const sg of [1, -1, 0]) { const nx = c.x + (ax * 0.6 + (sg ? -ay * sg : 0)) * (need - dd + 0.8), ny = c.y + (ay * 0.6 + (sg ? ax * sg : 0)) * (need - dd + 0.8); if (inArena(nx, ny) && Math.hypot(nx - C, ny - C) > PIT + 1.2 && cqCellFree(Math.floor(nx), Math.floor(ny))) { c.path = cqPath(c.x, c.y, nx, ny).slice(0, 4); c.dodge = G.time + 0.8; c.think = 0.9; c.goal = 'd'; break; } }
      c.rt = 0; break;
    }
    if (c.dodge > G.time) { cqModeStep(c, dt, 0.95 * sp); return; }   // sta schivando: prima si salva, poi il resto
    if (canFill(c) && (!c.belt.some(Boolean) || c.goal === 'k')) {   // a secco: al calderone, e ci resta finche' la cintura e' piena (o la riserva finisce)
      const [kx, ky] = KETTLE[sideIdx(G, c)];
      if (nearKettle(G, c)) { c.path = []; c.goal = 'k'; c.fillT = (c.fillT || 0) + dt; if (c.fillT >= KETTLE_T) { c.fillT = 0; fillDone(G, c); } return; }
      if (!c.path || !c.path.length || c.goal !== 'k') { c.goal = 'k'; c.path = cqPath(c.x, c.y, kx + 0.5, ky + 1.3); if (!c.path.length) c.path = cqPath(c.x, c.y, kx + 1.3, ky + 0.5); }
      cqModeStep(c, dt, 0.95 * sp); return;
    }
    c.fillT = 0; c.think -= dt;
    if (c.hp === 1 && Math.random() < dt * 0.5) botDrink(G, c, ['fireS', 'shield', 'stone', 'hidden', 'anchor'], c.x - po.x, c.y - po.y);   // un cuore solo: si protegge
    if (c.think <= 0 || c.goal === 'k' || ((!c.path || !c.path.length) && Math.random() < dt)) {
      c.think = 1.2 + Math.random() * 1.6; c.goal = 'f';
      let best = null, bs = -1e9;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * 6.283, r = 4.2 + Math.random() * 2.6, x = po.x + Math.cos(a) * r, y = po.y + Math.sin(a) * r;
        if (!inArena(x, y) || Math.hypot(x - C, y - C) < PIT + 1 || !cqCellFree(Math.floor(x), Math.floor(y))) continue;
        const bad = zonesAt(G, x, y).filter(z => z.o !== c.id && z.k !== 'mirror').length + hazardAt(G, x, y), edge = FL.pit && Math.hypot(x - C, y - C) < PIT + 1.7 ? 1 : 0;
        const s = -bad * 5 - edge * 4 - Math.hypot(x - c.x, y - c.y) * 0.3 + Math.random();
        if (s > bs) { bs = s; best = [x, y]; }
      }
      if (best) c.path = cqPath(c.x, c.y, best[0], best[1]).slice(0, 8);
    }
    cqModeStep(c, dt, 0.92 * sp);
    // LANCIO FURBO: per ogni ampolla calcola quanto vale li' (potScore), sceglie la migliore; vicino alla voragine mira dalla parte giusta
    // (il vento dietro di lui = dentro; la ragnatela dentro la voragine = lo tira giu'); se la cintura dell'altro sfrigola, fuoco
    const oBlk = o && blocked(G, o);
    if (oBlk && !c.cbT && (c.aimT || 0) > G.time + 0.35) c.aimT = G.time + 0.35;   // l'altro e' appena stato bloccato: si sbriga a colpirlo
    c.cbT = oBlk ? 1 : 0;
    if ((c.thT || 0) <= G.time && o && !out(G, o) && !(fxOn(G, o, 'hidden') && d > 1.6) && d < RMAX + 0.5 && G.time > (c.aimT || 0)) {
      c.aimT = G.time + 1.4 + Math.random() * 1.6;
      const vx = (o.x - (o.px != null ? o.px : o.x)) / Math.max(dt, 0.016), vy = (o.y - (o.py != null ? o.py : o.y)) / Math.max(dt, 0.016);
      const set = c.belt.some(k => k && stops(brew(k))) && c.belt.some(k => k && hurts(brew(k)));   // ha sia chi blocca sia chi brucia
      const tg = { x: po.x, y: po.y, pit: FL.pit ? Math.hypot(po.x - C, po.y - C) < PIT + 1.9 : hazardAt(G, po.x, po.y) > 0, vol: (o.belt || []).some(k => k && brew(k).inst >= VOLATILE), blk: oBlk, set };
      let best = null;
      c.belt.forEach((k, i) => {
        const P2 = k && brew(k); if (!P2) return;
        if (P2.s.mirror && !P2.s.fire) {   // specchio: davanti a se', verso l'altro, se l'altro ha ancora ampolle
          if ((o.belt || []).some(Boolean) && d > 3) { const sc = 2 + Math.random(); if (!best || sc > best.sc) best = { i, sc, tx: c.x + (po.x - c.x) / d * 1.6, ty: c.y + (po.y - c.y) / d * 1.6 }; }
          return;
        }
        if (P2.s.grow && FL.plants) {   // il fungo sulla pianta vicino all'altro: diventa gigante e lo morde
          const pl = (G.pl || []).find(p => plOn(G, p) && p.st !== 'giant' && Math.hypot(PLANTS[p.i][0] + 0.5 - po.x, PLANTS[p.i][1] + 0.5 - po.y) < 2.3);
          if (pl) { const px = PLANTS[pl.i][0] + 0.5, py = PLANTS[pl.i][1] + 0.5, dp = Math.hypot(px - c.x, py - c.y); if (dp > P2.area + 1 && P2.spd * Math.min(P2.fuse, 9) >= dp) { const sc = 4 + Math.random(); if (!best || sc > best.sc) best = { i, sc, tx: px, ty: py }; } return; }
        }
        if (P2.spd * Math.min(P2.fuse, 9) < d * 0.9 || d < P2.area + 0.9) return;
        const tf = d / P2.spd; let tx = po.x + (Math.abs(vx) < 8 ? vx : 0) * tf * 0.6, ty = po.y + (Math.abs(vy) < 8 ? vy : 0) * tf * 0.6;
        const pu = pushOf(P2);
        if (tg.pit && Math.abs(pu) > 0.5) { const dx = tx - C, dy = ty - C, dl = Math.hypot(dx, dy) || 1; if (pu > 0) { tx += dx / dl * 0.8; ty += dy / dl * 0.8; } else { tx -= dx / dl * 1.2; ty -= dy / dl * 1.2; } }
        const sc = potScore(G, P2, Object.assign({}, tg, { x: tx, y: ty })) + Math.random() * 0.8;
        if (!best || sc > best.sc) best = { i, sc, tx, ty };
      });
      if (best && best.sc < 2.2 && !oBlk && Math.random() < 0.6) best = null;   // le ampolle sono poche: un lancio che vale poco spesso lo tiene
      if (best) { const er = (0.35 + d * 0.06) * (oBlk ? 0.6 : 1); throwFrom(G, c, best.i, best.tx + gauss() * er, best.ty + gauss() * er); }
    }
    if (o) { o.px = po.x; o.py = po.y; }
  }

  // ---- MANCHE: al meglio di 3; chi toglie tutti i cuori all'altro o, allo scadere, chi ne ha di piu' ----
  function roundEnd(G, win, why) {
    const st = G.st; if (!st || st.ph !== 'duel') return;
    st.sc = st.sc || {}; if (win) st.sc[win.id] = (st.sc[win.id] || 0) + 1;
    st.ph = 'mres'; st.t0 = G.time; st.win = win ? win.id : -1;
    const a = G.chars[0], b = G.chars[1], s = c => st.sc[c.id] || 0;
    st.msg = (win ? '🏆 Manche a ' + win.name + '!' : '🤝 Manche pari!') + '\n' + why + '\n' + a.name + ' ' + s(a) + ' – ' + s(b) + ' ' + b.name;
    st.fin = st.n >= FLOORS.length ? 1 : 0;   // sempre 3 manche, una per piano (vince chi ne prende di piu')
    if (!st.fin) st.msg += '\n⬆️ Si sale: ' + FLOORS[st.n].e + ' ' + FLOORS[st.n].n;
  }
  function newRound(G) {
    const st = G.st;
    G.st = { n: st.n + 1, ph: 'prep', t0: G.time, rd: {}, sc: st.sc };
    G.fl = []; G.zn = []; G.pend = []; useFloor(G.st.n - 1); plantsInit(G);
    G.chars.forEach((c, i) => { c.hp = HP; c.fx = {}; c.iv = 0; c.belt = Array(BELT_N).fill(''); c.thT = 0; if (c.bot && !c.remote) { [c.x, c.y] = SPAWN[i % 2]; c.path = []; c.sl = null; c.belt = cpuBelt(G); G.st.rd[c.id] = 1; } });
  }
  function finalEnd(G) {
    const st = G.st, a = G.chars[0], b = G.chars[1], s = c => st.sc[c.id] || 0, w = s(a) > s(b) ? a : s(b) > s(a) ? b : null;
    cqModeEnd({ t: w ? '🏆 Vince ' + esc(w.name) + '!' : '🤝 Pari!', why: 'Manche ' + s(a) + ' – ' + s(b), rank: (w === b ? [b, a] : [a, b]).map(c => [c.name, s(c) + (s(c) === 1 ? ' manche' : ' manche')]), win: w ? [w.id] : [] });
  }

  // ---- I PULSANTI DEL DUELLO: la fionda (trascina indietro e lascia) e la cintura (scegli l'ampolla) ----
  function duelCss() {
    if (document.getElementById('alCss2')) return;
    const st = document.createElement('style'); st.id = 'alCss2';
    st.textContent = `#alTh{position:absolute;right:max(20px,6%);bottom:150px;width:96px;height:96px;border-radius:50%;border:3px solid rgba(255,255,255,.35);padding:0;background:radial-gradient(circle at 40% 35%,#4a3a5e,#1e1628);box-shadow:0 5px 16px rgba(0,0,0,.45);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;z-index:5}
#alTh .vi{position:absolute;left:50%;top:44%;width:30px;height:38px;margin:-19px 0 0 -15px;border-radius:7px 7px 15px 15px;border:2px solid rgba(230,236,244,.9);pointer-events:none;transition:transform .05s}#alTh .vi::before{content:'';position:absolute;top:-8px;left:9px;width:8px;height:7px;background:#8a6a42;border-radius:2px}
#alTh i{position:absolute;left:0;right:0;bottom:9px;font-style:normal;font-size:9.5px;font-weight:800;color:#f2dca0;letter-spacing:.03em;pointer-events:none;text-align:center}#alTh.off{opacity:.4}#alTh.aim{border-color:#ffd24a;box-shadow:0 0 0 4px rgba(255,210,74,.3),0 5px 16px rgba(0,0,0,.45)}
#alSel{position:absolute;left:50%;bottom:46px;transform:translateX(-50%);display:flex;gap:8px;z-index:5;background:rgba(20,14,28,.72);padding:6px 10px;border-radius:14px;border:1px solid rgba(200,160,80,.4)}
#alSel button{width:46px;border:2px solid transparent;border-radius:10px;background:rgba(255,255,255,.06);padding:4px 0 2px;display:flex;flex-direction:column;align-items:center;gap:2px;color:#fff}#alSel button.on{border-color:#ffd24a;background:rgba(90,70,30,.6)}
#alSel .vi{width:18px;height:24px;border-radius:5px 5px 9px 9px;border:2px solid rgba(220,230,240,.8)}#alSel .ig{font-size:9px;min-height:11px;line-height:1}#alSel .rf{align-self:center;font:700 12px system-ui;color:#f2dca0;margin-left:2px;white-space:nowrap}
#alDr{position:absolute;right:calc(max(20px,6%) + 18px);bottom:258px;width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,.35);padding:0;background:radial-gradient(circle at 40% 35%,#6a3a5a,#2a1628);box-shadow:0 4px 12px rgba(0,0,0,.45);color:#fff;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent}#alDr b{font-size:22px;line-height:1}#alDr i{font-style:normal;font:800 9.5px system-ui;color:#f2dca0;margin-top:2px}#alDr.off{opacity:.4}#alDr:active{transform:scale(.92)}
#alNm{position:absolute;left:50%;bottom:108px;transform:translateX(-50%);z-index:5;background:rgba(20,14,28,.8);color:#f2ead8;font:600 12.5px system-ui,sans-serif;padding:4px 10px;border-radius:10px;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;pointer-events:none}#alNm.cb{background:rgba(150,40,20,.92);color:#fff}`;
    document.head.appendChild(st);
  }
  function duelUI(G, on) {
    duelCss();
    let th = document.getElementById('alTh'), sel = document.getElementById('alSel');
    if (!on) { if (th) th.remove(); if (sel) sel.remove(); for (const id of ['alNm', 'alDr']) { const e = document.getElementById(id); if (e) e.remove(); } G.aim = null; return; }
    if (!document.getElementById('alNm')) { const nm = document.createElement('div'); nm.id = 'alNm'; $('#ciack').appendChild(nm); }
    if (!document.getElementById('alDr')) {   // BEVI: la stessa ampolla scelta, bevuta invece che lanciata
      const dr = document.createElement('button'); dr.id = 'alDr'; dr.type = 'button'; dr.innerHTML = '<b>🍷</b><i>BEVI</i>'; $('#ciack').appendChild(dr);
      dr.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); const G2 = cq.g; if (G2 && G2.mode === 'alchimisti') myDrink(G2); });
      dr.addEventListener('pointerup', e => e.stopPropagation()); dr.oncontextmenu = e => e.preventDefault();
    }
    if (!th) {
      th = document.createElement('button'); th.id = 'alTh'; th.type = 'button'; th.innerHTML = '<span class="vi"></span><i>TIRA INDIETRO</i>'; $('#ciack').appendChild(th);
      let ptr = null;
      th.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const G2 = cq.g; if (!G2 || G2.mode !== 'alchimisti' || !G2.me.belt[G2.sel]) return; ptr = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { th.setPointerCapture(e.pointerId); } catch {} th.classList.add('aim'); G2.aim = { ok: false }; });
      th.addEventListener('pointermove', e => { if (!ptr || ptr.id !== e.pointerId) return; const G2 = cq.g; if (!G2) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; G2.aim = aimFrom(dx, dy); const m = Math.min(1, Math.hypot(dx, dy) / PULL), v = th.querySelector('.vi'), l = Math.hypot(dx, dy) || 1; v.style.transform = 'translate(' + (dx / l * m * 20) + 'px,' + (dy / l * m * 20) + 'px)'; });
      const up = e => { if (!ptr || ptr.id !== e.pointerId) return; ptr = null; th.classList.remove('aim'); th.querySelector('.vi').style.transform = ''; const G2 = cq.g; if (!G2) return; const A = G2.aim; G2.aim = null; if (A && A.ok && e.type === 'pointerup') myThrow(G2, A.x, A.y); };
      th.addEventListener('pointerup', up); th.addEventListener('pointercancel', up); th.oncontextmenu = e => e.preventDefault();
    }
    if (!sel) {
      sel = document.createElement('div'); sel.id = 'alSel'; sel.innerHTML = Array.from({ length: BELT_N }, (_, i) => `<button type="button" data-s="${i}"><span class="vi"></span><span class="ig"></span></button>`).join('') + '<span class="rf"></span>'; $('#ciack').appendChild(sel);
      sel.addEventListener('pointerdown', e => { e.stopPropagation(); const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); const G2 = cq.g; if (G2 && G2.me.belt[+b.dataset.s]) { G2.sel = +b.dataset.s; beep(660, 0.04, 0.02); } });
      sel.addEventListener('pointerup', e => e.stopPropagation());
    }
  }
  function duelUITick(G) {
    const th = document.getElementById('alTh'), sel = document.getElementById('alSel'); if (!th || !sel) return;
    const b = G.me.belt, P = b[G.sel] ? brew(b[G.sel]) : null, ok = !!P && (G.me.thT || 0) <= G.time && !out(G, G.me) && !fxOn(G, G.me, 'frz');
    const cb = !!P && hurts(P) && !!G.opp && blocked(G, G.opp);   // l'altro e' bloccato e io ho in mano qualcosa che fa male: e' il momento!
    const key = (P ? P.c : '') + ok + b.join(',') + G.sel + cb + (G.me.rf || 0);
    if (th.dataset.k === key) return; th.dataset.k = key;
    const nm = document.getElementById('alNm');
    if (nm) { nm.style.display = P ? '' : 'none'; nm.classList.toggle('cb', cb); if (P) nm.textContent = (secret(P) ? '❓ Miscela segreta' : P.e + ' ' + P.n + (cb ? '' : ' · 🍷 ' + ([...new Set(drinkOf(P).map(([s]) => s === 'dash' ? '💨' : s === 'chaos' ? '🎲' : STATE[s].e))].join('') || '—'))) + (cb ? ' · 💥 ORA: COMBO!' : ''); }
    const dr = document.getElementById('alDr'); if (dr) dr.classList.toggle('off', !ok);
    sel.querySelector('.rf').textContent = '🫕 ' + (G.me.rf || 0);
    th.querySelector('.vi').style.background = P ? P.c : 'transparent'; th.classList.toggle('off', !ok);
    th.querySelector('i').textContent = !b.some(Boolean) ? 'VAI AL CALDERONE' : 'TIRA INDIETRO';
    sel.querySelectorAll('[data-s]').forEach(x => { const k = b[+x.dataset.s], Q = k && brew(k); x.querySelector('.vi').style.background = Q ? Q.c : 'transparent'; x.querySelector('.ig').textContent = Q ? Q.ings.map(g => g.e).join('') : ''; x.classList.toggle('on', +x.dataset.s === G.sel && !!Q); });
  }
  // trascino il pulsante: direzione opposta (fionda), distanza = quanto tiro (come l'arco dell'Assedio)
  function aimFrom(dx, dy) {
    const TW = Math.max(48, Math.min(cq.w, cq.h) / 8), m = Math.hypot(dx, dy); if (m < 14) return { ok: false };
    let wx = -dx / TW - 2 * dy / TW, wy = dx / TW - 2 * dy / TW; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl;
    const dist = RMIN + (RMAX - RMIN) * Math.min(1, (m - 14) / (PULL - 14)), [x, y] = clampIn(cq.x + wx * dist, cq.y + wy * dist);
    return { ok: true, x, y };
  }

  // ---- disegni del duello (sopra alla mappa): pozze, ampolle in volo, schizzi col NOME della pozione, mira ----
  function zoneDraw(g, G, z, sx, sy, TW, t) {
    const Z = ZONE[z.k], a = Math.min(1, (G.time - z.t0) / 0.3, (z.te - G.time) / 0.6); if (a <= 0) return;
    const X = sx(z.x, z.y), Y = sy(z.x, z.y), rx = z.r * TW * 0.7071, ry = rx / 2, U = TW * 0.575;
    g.save(); g.globalAlpha = a;
    if (z.k === 'smoke') {
      for (let i = 0; i < 9; i++) { const an = i * 0.7 + t * 0.2, rr = (0.25 + 0.55 * ((i * 0.37) % 1)) * z.r, px = sx(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr), py = sy(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr) - (0.5 + 0.5 * Math.sin(t + i)) * U; g.fillStyle = i % 2 ? 'rgba(120,116,130,.55)' : 'rgba(150,146,160,.5)'; g.beginPath(); g.arc(px, py, TW * (0.45 + 0.15 * Math.sin(t * 1.3 + i)), 0, 7); g.fill(); }
    } else if (z.k === 'mirror') {
      g.strokeStyle = 'rgba(230,240,255,.85)'; g.lineWidth = Math.max(2, TW / 14); g.beginPath(); g.ellipse(X, Y - 1.1 * U, TW * 0.55, 1.15 * U, 0, 0, 7); g.stroke();
      g.fillStyle = 'rgba(200,220,255,.22)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X - TW * 0.2, Y - 1.8 * U + Math.sin(t * 3) * 4); g.lineTo(X + TW * 0.05, Y - 0.6 * U); g.stroke();
      g.fillStyle = 'rgba(230,240,255,.25)'; g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = Z.c; g.globalAlpha = a * (z.k === 'ice' ? 0.5 : 0.42); g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, 7); g.fill();
      g.globalAlpha = a;
      if (z.k === 'burn') for (let i = 0; i < 7; i++) { const an = i * 0.9, rr = z.r * 0.6 * ((i * 0.53) % 1), px = sx(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr), py = sy(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr), h = TW * (0.25 + 0.12 * Math.sin(t * 9 + i * 2)); g.fillStyle = i % 2 ? '#ff8a2a' : '#ffc24a'; g.beginPath(); g.moveTo(px - TW * 0.08, py); g.quadraticCurveTo(px, py - h * 2, px + TW * 0.08, py); g.fill(); }
      else if (z.k === 'ice') { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const an = i * 1.6 + 0.4, px = sx(z.x + Math.cos(an) * z.r * 0.5, z.y + Math.sin(an) * z.r * 0.5), py = sy(z.x + Math.cos(an) * z.r * 0.5, z.y + Math.sin(an) * z.r * 0.5); g.beginPath(); g.moveTo(px - 5, py); g.lineTo(px + 5, py); g.moveTo(px, py - 3); g.lineTo(px, py + 3); g.stroke(); } }
      else if (z.k === 'glue') { g.fillStyle = '#f0c060'; for (let i = 0; i < 4; i++) { const ph = (t * 0.6 + i / 4) % 1, an = i * 1.9, px = sx(z.x + Math.cos(an) * z.r * 0.4, z.y + Math.sin(an) * z.r * 0.4), py = sy(z.x + Math.cos(an) * z.r * 0.4, z.y + Math.sin(an) * z.r * 0.4); g.globalAlpha = a * (1 - ph); g.beginPath(); g.arc(px, py - ph * 6, 2 + ph * 4, 0, 7); g.fill(); } }
      else if (z.k === 'slowz') { g.strokeStyle = 'rgba(255,230,150,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y, rx * 0.6, ry * 0.6, 0, t % 6.283, t % 6.283 + 4); g.stroke(); }
    }
    g.restore();
  }
  // l'evento del piano disegnato: piante che pulsano e poi sparano il polline, notte blu di mezzanotte, colonna magica dalla voragine
  function evDraw(g, G, sx, sy, TW, t) {
    const ph = evPh(G); if (!ph || ph === 'done') return; const k = G.st.ev.k, U = TW * 0.575, a = G.time - G.st.ev.t;
    if (k === 'spores') for (const p of G.pl || []) {
      const [px, py] = PLANTS[p.i], x = px + 0.5, y = py + 0.5, X = sx(x, y), Y = sy(x, y), E = EVENTS.spores;
      if (ph === 'warn') {
        const pu = 0.5 + 0.5 * Math.sin(t * 8), r = E.r * TW * 0.7071 * (0.6 + 0.4 * pu); g.globalAlpha = 0.35 + 0.3 * pu; g.strokeStyle = '#ff9ad8'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y, r, r / 2, 0, 0, 7); g.stroke();
        for (let i = 0; i < 5; i++) { const q = (t * 0.8 + i / 5 + p.i * 0.3) % 1; g.globalAlpha = 1 - q; g.fillStyle = i % 2 ? '#ffb8e8' : '#fff0a0'; g.beginPath(); g.arc(X + Math.sin(i * 2 + t) * TW * 0.4, Y - (1.4 + q * 1.5) * U, Math.max(1.5, TW / 26), 0, 7); g.fill(); }
      } else {
        const q = Math.min(1, a / E.d); for (let i = 0; i < 16; i++) { const an = i * 0.3927 + p.i, r = E.r * q, x2 = x + Math.cos(an) * r, y2 = y + Math.sin(an) * r; g.globalAlpha = (1 - q) * 0.9; g.fillStyle = i % 3 ? '#ffb8e8' : '#fff0a0'; g.beginPath(); g.arc(sx(x2, y2), sy(x2, y2) - (1.5 - q) * U, Math.max(2, TW / 16) * (1 - q * 0.5), 0, 7); g.fill(); }
      }
    }
    else if (k === 'midnight' && ph === 'on') {
      const f = Math.max(0, Math.min(1, a / 0.6, (EVENTS.midnight.d - a) / 0.6));
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.24 * f; g.fillStyle = '#1e2a78'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
      for (let i = 0; i < 14; i++) { const q = (t * 0.12 + i / 14) % 1, x = C + Math.cos(i * 2.4) * (1.5 + (i * 0.41 % 1) * 6), y = C + Math.sin(i * 2.4) * (1.5 + (i * 0.41 % 1) * 6); g.globalAlpha = f * Math.sin(q * Math.PI) * 0.8; g.fillStyle = '#c8d4ff'; g.beginPath(); g.arc(sx(x, y), sy(x, y) - (0.5 + q * 2.5) * U, Math.max(1.2, TW / 34), 0, 7); g.fill(); }   // pulviscolo fermo nel tempo
    }
    else if (k === 'surge') {
      const X = sx(C, C), Y = sy(C, C), R0 = PIT * TW * 0.7071;
      if (ph === 'warn') { const pu = 0.5 + 0.5 * Math.sin(t * 10); g.globalAlpha = 0.25 + 0.25 * pu; g.fillStyle = '#b88aff'; g.beginPath(); g.ellipse(X + Math.sin(t * 40) * 2, Y, R0 * (0.8 + 0.2 * pu), R0 * (0.4 + 0.1 * pu), 0, 0, 7); g.fill(); }
      else {
        const f = Math.max(0, Math.min(1, a / 0.4, (EVENTS.surge.d - a) / 0.8));
        for (let i = 0; i < 6; i++) { const q = (t * 0.6 + i / 6) % 1; g.globalAlpha = f * (1 - q) * 0.32; g.fillStyle = i % 2 ? '#c8a8ff' : '#8ae8ff'; g.beginPath(); g.ellipse(X, Y - q * 7 * U, R0 * (0.9 - q * 0.45), R0 * (0.45 - q * 0.22), 0, 0, 7); g.fill(); }
        for (let i = 0; i < 18; i++) { const q = (t * 0.9 + i / 18) % 1, an = i * 2.4 + t; g.globalAlpha = f * (1 - q); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X + Math.cos(an) * R0 * 0.6 * (1 + q), Y - q * 8 * U, Math.max(1.5, TW / 26), 0, 7); g.fill(); }
      }
    }
    g.globalAlpha = 1;
  }
  function flaskDraw(g, f, sx, sy, TW, t) {
    const p = flPos(f, Math.min(t, f.t0 + Math.min(f.d, f.fz))), P = brew(f.k); if (!P) return;
    const X = sx(p.x, p.y), Y = sy(p.x, p.y), U = TW * 0.575, Z = Y - p.z * U, s = TW * 0.13, sp = (t - f.t0) * 12;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, s * 1.2, s * 0.5, 0, 0, 7); g.fill();
    const ow = cq.g && cq.g.chars.find(c => c.id === f.o); if (ow && ow.cos && ow.cos.includes('trail')) for (let i = 1; i <= 7; i++) { const tt = Math.min(t, f.t0 + Math.min(f.d, f.fz)) - i * 0.035; if (tt < f.t0) break; const q = flPos(f, tt); g.globalAlpha = 0.85 - i * 0.1; g.fillStyle = 'hsl(' + ((i * 50 + t * 200) % 360) + ',90%,65%)'; g.beginPath(); g.arc(sx(q.x, q.y), sy(q.x, q.y) - q.z * U, s * (0.55 - i * 0.05), 0, 7); g.fill(); }   // premio: scia arcobaleno
    g.globalAlpha = 1;
    g.save(); g.translate(X, Z); g.rotate(sp);
    g.fillStyle = P.c; g.beginPath(); g.arc(0, s * 0.3, s, 0, 7); g.fill(); g.fillStyle = '#d8e0e8'; g.fillRect(-s * 0.3, -s * 1.2, s * 0.6, s * 0.9); g.fillStyle = '#8a6a42'; g.fillRect(-s * 0.35, -s * 1.45, s * 0.7, s * 0.3);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-s * 0.35, 0, s * 0.25, 0, 7); g.fill();
    g.restore();
    // pozione instabile: la miccia sfrigola
    if (P.inst >= 0.3) { g.fillStyle = Math.sin(t * 40) > 0 ? '#ffe070' : '#ff7a2a'; g.beginPath(); g.arc(X + Math.sin(t * 50) * 3, Z - s * 1.7, 2.5, 0, 7); g.fill(); }
  }
  function splashDraw(g, G, s, sx, sy, TW, t, name) {
    const a = t - s.t, X = sx(s.x, s.y), Y = sy(s.x, s.y), U = TW * 0.575;
    if (s.how === 'react') {
      const E = EL[s.k] || { e: '⚗️', n: '?' };
      if (a < 0.8) { const k = a / 0.8; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#ffd24a'; g.lineWidth = Math.max(4, TW / 7) * (1 - k); g.beginPath(); g.ellipse(X, Y, TW * 2 * (0.3 + k), TW * (0.3 + k), 0, 0, 7); g.stroke(); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(X, Y - U, TW * 0.7 * (1 - k), 0, 7); g.fill(); g.restore(); }
      if (name && a < 2.4) { const k = a / 2.4, txt = '⚗️ REAZIONE! ' + E.e + ' ' + E.n; g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2); g.font = '900 ' + Math.round(Math.max(13, TW / 2.9)) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const y = Y - U * (2 + k * 1.6), w = g.measureText(txt).width + 18; g.fillStyle = 'rgba(60,40,10,.85)'; cqRR(g, X - w / 2, y - 14, w, 28, 14); g.fill(); g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#ffe9a0'; g.fillText(txt, X, y); g.restore(); }
      return;
    }
    const P = s.k ? brew(s.k) : null;
    if (a < 0.6) {
      const k = a / 0.6, col = P ? P.c : '#e8f0ff', r = (P ? P.area : 1) * TW * 0.7071 * (0.3 + 0.7 * k);
      g.save(); g.globalAlpha = 1 - k; g.strokeStyle = col; g.lineWidth = Math.max(3, TW / 10) * (1 - k); g.beginPath(); g.ellipse(X, Y, r, r / 2, 0, 0, 7); g.stroke();
      g.fillStyle = col; for (let i = 0; i < 10; i++) { const an = i * 0.628, px = X + Math.cos(an) * r * 0.8, py = Y + Math.sin(an) * r * 0.4 - Math.sin(k * Math.PI) * U * (0.8 + (i % 3) * 0.3); g.beginPath(); g.arc(px, py, Math.max(2, TW / 22), 0, 7); g.fill(); }
      if (s.how === 'early' || (P && P.inst >= 0.45)) { g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(X, Y - U * 0.8, TW * 0.5 * (1 - k), 0, 7); g.fill(); }
      if (s.how === 'air') { g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(X, Y - U * 1.9, TW * 0.8 * (1 - k), 0, 7); g.fill(); g.strokeStyle = '#ffd24a'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const an = i * 0.5236, r1 = TW * (0.3 + 1.4 * k), rr = r1 + TW * 0.4; g.beginPath(); g.moveTo(X + Math.cos(an) * r1, Y - U * 1.9 + Math.sin(an) * r1 * 0.6); g.lineTo(X + Math.cos(an) * rr, Y - U * 1.9 + Math.sin(an) * rr * 0.6); g.stroke(); } }   // scontro in volo: stella di luce in aria
      g.restore();
    }
    if (P && name && s.how !== 'bounce' && a < 2) {   // il nome della pozione sale dal punto dello scoppio
      const k = a / 2, txt = (s.how === 'air' ? '💥 IN VOLO! ' : '') + P.e + ' ' + P.n + (s.how === 'early' ? ' 💥' : '');
      g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2); g.font = '800 ' + Math.round(Math.max(12, TW / 3.2)) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const y = Y - U * (1.6 + k * 1.4), w = g.measureText(txt).width + 14; g.fillStyle = 'rgba(16,10,24,.75)'; cqRR(g, X - w / 2, y - 12, w, 24, 12); g.fill(); g.fillStyle = P.c; g.fillRect(X - w / 2 + 6, y + 8, w - 12, 2); g.fillStyle = '#fff'; g.fillText(txt, X, y); g.restore();
    }
    if (s.how === 'mirror' && a < 1.2) { g.save(); g.globalAlpha = 1 - a / 1.2; g.font = '800 14px system-ui'; g.textAlign = 'center'; g.fillStyle = '#e8f0ff'; g.fillText('🪞 Rimandata!', X, Y - U * (1.5 + a)); g.restore(); }
  }
  function aimDraw(g, G, sx, sy, TW) {
    const A = G.aim; if (!A || !A.ok) return; const P = brew(G.me.belt[G.sel] || ''); if (!P) return;
    const U = TW * 0.575, d = Math.hypot(A.x - cq.x, A.y - cq.y), pk = 0.6 + d * 0.22;
    g.save(); g.fillStyle = P.c;
    for (let i = 1; i < 14; i++) { const u = i / 14, x = cq.x + (A.x - cq.x) * u, y = cq.y + (A.y - cq.y) * u, z = 1.1 * (1 - u) + pk * 4 * u * (1 - u); g.globalAlpha = 0.85; g.beginPath(); g.arc(sx(x, y), sy(x, y) - z * U, Math.max(2, TW / 22), 0, 7); g.fill(); }
    const rx = P.area * TW * 0.7071; g.globalAlpha = 0.9; g.strokeStyle = P.c; g.lineWidth = Math.max(2, TW / 18); g.setLineDash([6, 5]); g.beginPath(); g.ellipse(sx(A.x, A.y), sy(A.x, A.y), rx, rx / 2, 0, 0, 7); g.stroke();
    g.restore();
  }
  SFX.whoosh = () => { swp(300, 900, 0.18, 0.03, 0, 'triangle'); };
  SFX.smash = (el) => { const A = sfxOk(); if (!A) return; for (let i = 0; i < 6; i++) swp(2200 + Math.random() * 1800, 1600, 0.12, 0.02, i * 0.025, 'triangle');
    if (el === 'fire' || el === 'blaze') swp(200, 60, 0.4, 0.06, 0.03, 'sawtooth'); else if (el === 'ice' || el === 'statue') swp(2400, 3200, 0.3, 0.03, 0.04, 'sine'); else if (el === 'wind' || el === 'steam' || el === 'whirl') swp(800, 200, 0.4, 0.04, 0.02, 'sawtooth'); else if (el === 'pop') swp(300, 1200, 0.1, 0.06, 0.02, 'square'); else swp(500, 150, 0.25, 0.04, 0.03); };
  SFX.boom = () => { swp(120, 40, 0.5, 0.09, 0, 'sawtooth'); swp(300, 80, 0.3, 0.05, 0.02, 'square'); };
  SFX.drink = () => { for (let i = 0; i < 3; i++) swp(260 + i * 60, 140, 0.11, 0.035, i * 0.11, 'sine'); swp(700, 1500, 0.25, 0.025, 0.36, 'triangle'); };   // glu glu glu… ah!
  SFX.ev = (k, on) => {
    if (k === 'midnight') { const n = on ? 3 : 1; for (let i = 0; i < n; i++) { swp(392, 388, 1.4, 0.05, i * 0.9, 'sine'); swp(784, 780, 0.9, 0.025, i * 0.9, 'sine'); swp(1180, 1170, 0.5, 0.012, i * 0.9, 'triangle'); } }   // rintocchi
    else if (k === 'surge') { if (on) { swp(80, 900, 0.9, 0.06, 0, 'sawtooth'); swp(120, 40, 0.8, 0.08, 0.5, 'sawtooth'); } else swp(70, 40, 1.6, 0.06, 0, 'sawtooth'); }   // brontolio, poi l'eruzione
    else if (k === 'spores') { for (let i = 0; i < (on ? 6 : 3); i++) swp(900 + i * 180, 1400 + i * 180, 0.18, 0.02, i * 0.09, 'sine'); }   // campanellini
  };
  SFX.asc = () => { [392, 494, 587, 784, 988].forEach((q, i) => swp(q, q * 1.01, 0.5, 0.03, i * 0.32, 'sine')); swp(200, 600, 2.4, 0.02, 0, 'sawtooth'); };   // salita: arpeggio e vento
  SFX.prize = () => { [523, 659, 784, 1047, 1319].forEach((q, i) => swp(q, q, 0.35, 0.035, i * 0.09, 'triangle')); };   // fanfara
  SFX.ouch = () => { swp(500, 220, 0.2, 0.05, 0, 'square'); };
  SFX.fall = () => { swp(900, 80, 1.1, 0.05, 0, 'triangle'); };

  // ---- FASI decise dall'host in G.st = { n: manche, ph: prep | duel | mres, t0, rd: pronti, sc: manche vinte, msg, fin } ----
  function stage(G) {
    const ph = G.st ? G.st.ph + G.st.n : ''; if (ph === U2.ph) return;
    const was = U2.ph; U2.ph = ph;
    if (was.startsWith('prep') && U2.pot.length && G.me.belt.some(v => !v)) bottle(G);   // tempo scaduto: quello che bolle si imbottiglia da solo
    const p = G.st ? G.st.ph : '';
    { const h = document.getElementById('alHelp'); if (h) h.remove(); const bk = document.getElementById('alBook'); if (bk) bk.remove(); }
    G.me.cos = myCos(); if (G.guest && G.cosSent !== G.me.cos) { G.cosSent = G.me.cos; cqNetSend({ k: 'cos', v: G.me.cos }); }   // i miei premi all'host
    if (p === 'prep') {
      useFloor(Math.min(FLOORS.length, G.st.n) - 1); if (!G.guest && !(G.pl && G.pl.length === (FL.plants ? PLANTS.length : 0))) plantsInit(G);
      G.myRdy = false; G.me.belt = G.me.belt && !was ? G.me.belt : Array(BELT_N).fill(''); G.fl = []; G.zn = []; cq.x = SPAWN[sideIdx(G, G.me)][0]; cq.y = SPAWN[sideIdx(G, G.me)][1]; cq.sl = null; G.myFall = null; G.fill = null;
      duelUI(G, false); prepOpen(G);
      if (was.startsWith('mres') && G.st.n > 1) ascOpen(G.st.n);   // si sale: scena lungo la torre
    } else prepClose();
    if (p === 'duel') { G.sel = Math.max(0, G.me.belt.findIndex(Boolean)); duelArm(G, G.me); duelUI(G, true); helpOnce('duel'); cqToast('⚔️ <b>Duello!</b> Le ampolle sono poche: <b>non sprecarle</b>. Prima <b>blocca</b> l\'altro (🍯 colla, 🧊 gelo, ⏳ sabbia), poi <b>brucialo</b>: <b>COMBO = -2 cuori!</b>'); }
    else duelUI(G, false);
    if (p === 'mres') SFX[G.st.win === G.me.id ? 'bottle' : 'pour']();
    if (p === 'prep') cqToast(FL.e + ' <b>Piano ' + G.st.n + ' di ' + FLOORS.length + ': ' + FL.n + '</b><br>' + FL.tip);
  }
  const vials = (G, c) => !c.belt || (G.st && G.st.ph === 'prep' && c !== G.me) ? null : c.belt.map(k => { const P = k && brew(k); return P ? P.c : null; });
  const cleanBelt = s => String(s || '').split(',').slice(0, BELT_N).map(k => [...k].filter(id => ING_BY[id]).slice(0, MAXI).sort().join('')).concat(Array(BELT_N).fill('')).slice(0, BELT_N);
  // il mio personaggio: spinte, voragine, ghiaccio che fa scivolare, ricarica, ritorno nell'angolo dopo la caduta
  function meTick(G, dt) {
    const me = G.me;
    if (me.kb && me.kb[0] !== G.kbSeen) { G.kbSeen = me.kb[0]; if (G.kbSeen && !out(G, me)) slideStart(G, cq, me.kb); }
    if (cq.sl) slideStep(G, cq, me, dt);
    if (G.myFall != null && G.time - G.myFall > FALL_T - 0.1) { G.myFall = null; [cq.x, cq.y] = SPAWN[sideIdx(G, me)]; }
    // ghiaccio: si scivola (il movimento segue la spinta di prima)
    const on = zonesAt(G, cq.x, cq.y).some(z => ZONE[z.k].slide);
    if (G.lx != null && dt > 0) {
      const rx = (cq.x - G.lx) / dt, ry = (cq.y - G.ly) / dt;
      if (on && !cq.sl) { G.vx = (G.vx || 0) * 0.93 + rx * 0.07; G.vy = (G.vy || 0) * 0.93 + ry * 0.07; const nx = G.lx + G.vx * dt * 1.15, ny = G.ly + G.vy * dt * 1.15; if (cqFree(nx, ny)) { cq.x = nx; cq.y = ny; } else { G.vx = G.vy = 0; } }
      else { G.vx = rx; G.vy = ry; }
    }
    G.lx = cq.x; G.ly = cq.y;
    // ricarica
    if (G.myFall == null && !out(G, me)) gearMove(G, cq, dt);
    regen(G, me);
    if (G.fill) { if (!nearKettle(G, me) || out(G, me) || !canFill(me)) G.fill = null; else if (G.time - G.fill > KETTLE_T) { fillDone(G, me); G.fill = canFill(me) ? G.time : null; } }   // una ampolla dopo l'altra
  }
  // scoppi e colpi arrivati dall'host (o fatti da me): suoni e scritte su ogni telefono
  // ======================= IL RICETTARIO (si compra con le monete: BOOK_COST) =======================
  // Annota ogni pozione vista scoppiare (tua o dell'altro); al calderone ti dice cosa stai preparando, se l'hai gia' scoperta.
  // Le descrizioni si calcolano dalle tabelle (FX, STATE, ZONE, miccia): un ingrediente nuovo ha subito la sua descrizione
  const BOOK_COST = 60;
  const book = () => store.settings.alcBook || (store.settings.alcBook = { own: 0, f: {} });
  const TOTAL = (() => { let n = 0; const k = ING.length; for (let m = 1; m <= MAXI; m++) { let c = 1; for (let i = 0; i < m; i++) c = c * (k + i) / (i + 1); n += Math.round(c); } return n; })();   // miscele possibili (ingredienti anche ripetuti)
  function describe(P) {
    const out = [];
    for (const [el, v] of Object.entries(P.s).sort((a, b) => b[1] - a[1])) {
      const F = FX[el]; if (!F) continue; const t = [];
      if (F.dmg && v >= 0.6) t.push('-1 ❤️');
      if (F.st) t.push(STATE[F.st[0]].d);
      if (F.push > 0) t.push('spinge via'); else if (F.push < 0) t.push('tira verso il centro');
      if (F.whirl) t.push('scaraventa a caso'); if (F.chaos) t.push('effetto a sorpresa');
      if (F.zone) t.push(ZONE[F.zone[0]].d);
      out.push(EL[el].e + ' ' + t.join(', '));
    }
    if (P.bnc) out.push('🪶 rimbalza');
    return out.concat(flight(P)).join(' · ') + ' · 🍷 se la bevi: ' + drinkTxt(P);
  }
  // gittata e instabilita' (si vedono anche quando l'effetto e' segreto: chi sta attento non si fa scoppiare le pozioni in mano)
  function flight(P) {
    const reach = P.spd * P.fuse, out = [reach < 4 ? '⚠️ scoppia dopo ' + reach.toFixed(1).replace('.', ',') + ' caselle!' : '🎯 arriva a ' + Math.min(RMAX, reach).toFixed(0) + ' caselle'];
    if (P.inst >= VOLATILE) out.push('💥 instabile alla cintura');
    return out;
  }
  // COLLEZIONE: ogni pozione vista scoppiare (tua o dell'altro) e' una SCOPERTA, anche senza ricettario. Ai traguardi di PRIZES si sblocca un premio
  // per il proprio mago (lo vede anche l'altro). Le leggendarie (LEGEND) danno il loro ornamento a chi le PREPARA (B.leg)
  const PRIZES = [{ n: 5, id: 'stars', e: '✨', t: 'Stelle d\'oro sul cappello' }, { n: 15, id: 'trail', e: '🌈', t: 'Scia arcobaleno per le ampolle' }, { n: 30, id: 'owl', e: '🦉', t: 'Gufetto sulla spalla' },
    { n: 50, id: 'crown', e: '👑', t: 'Corona d\'oro sul cappello' }, { n: 80, id: 'embers', e: '🔥', t: 'Scintille ai piedi' }, { n: 120, id: 'aura', e: '🌙', t: 'Aura di luna' }];
  const LEG_PR = { rose: ['🌹', 'Rosa della Regina sul cappello'], gear: ['⚙️', 'Ingranaggio d\'oro sul cappello'], phoenix: ['🪶', 'Piuma di fenice sul cappello'] };
  const found = () => Object.keys(book().f).length;
  function myCos() { const B = book(), n = found(); return PRIZES.filter(p => n >= p.n).map(p => p.id).concat(Object.keys(B.leg || {}).filter(k => LEGEND[k]).map(k => LEGEND[k].pr)).join(','); }
  const cleanCos = v => String(v || '').replace(/[^a-z,]/g, '').slice(0, 80);
  function bookNote(key) {
    const B = book(); if (!key || key.length > MAXI || !brew(key) || B.f[key]) return;
    B.f[key] = Date.now(); saveStore();
    const P = brew(key), n = found(); cqToast((B.own ? '📖 <b>Nuova pozione nel ricettario!</b> ' : '🔎 <b>Pozione scoperta!</b> ') + P.ings.map(g => g.e).join('') + ' = ' + esc(P.n) + ' (' + n + '/' + TOTAL + ')');
    const pr = PRIZES.find(p => p.n === n); if (pr) setTimeout(() => { cqToast('🎁 <b>Premio sbloccato!</b> ' + pr.e + ' ' + pr.t); SFX.prize(); }, 1400);
    const G = cq.g; if (G && G.mode === 'alchimisti') G.me.cos = myCos();
  }
  // una leggendaria appena nata nel calderone: festa, ornamento sbloccato
  function legendCheck(G) {
    const key = potKey(U2.pot), LG = LEGEND[key], B = book(); if (!LG) return;
    U2.gold = now(); SFX.prize();
    if ((B.leg || {})[key]) return;
    B.leg = B.leg || {}; B.leg[key] = Date.now(); saveStore(); G.me.cos = myCos(); if (G.guest) cqNetSend({ k: 'cos', v: G.me.cos });
    cqToast('🌟 <b>POZIONE LEGGENDARIA!</b> ' + esc(LG.n) + '<br>🎁 ' + LEG_PR[LG.pr][0] + ' ' + LEG_PR[LG.pr][1]);
  }
  function colHtml() {
    const B = book(), n = found();
    return '<div class="col"><b>🏅 Collezione · ' + n + ' / ' + TOTAL + ' scoperte</b><small>Ogni pozione che vedi scoppiare (tua o dell\'altro) è una scoperta.</small>'
      + PRIZES.map(p => '<div class="pz' + (n >= p.n ? ' on' : '') + '"><span>' + p.e + '</span>' + esc(p.t) + '<i>' + (n >= p.n ? '✔' : p.n) + '</i></div>').join('')
      + '<b>🌟 Pozioni leggendarie</b>' + Object.entries(LEGEND).map(([k, L]) => (B.leg || {})[k] ? '<div class="pz on"><span>' + LEG_PR[L.pr][0] + '</span>' + esc(L.n) + ' = ' + brew(k).ings.map(g => g.e).join('') + '<i>✔</i></div>' : '<div class="pz"><span>' + FLOORS[L.fl].e + '</span><em>«' + esc(L.rid) + '»</em></div>').join('') + '</div>';
  }
  function colLine() { const n = found(), nx = PRIZES.find(p => n < p.n), lg = Object.keys(book().leg || {}).filter(k => LEGEND[k]).length; return '🏅 <b>' + n + '</b>/' + TOTAL + ' scoperte' + (nx ? ' · 🎁 a ' + nx.n + ': ' + nx.e + ' ' + esc(nx.t) : ' · 🎁 tutti i premi!') + ' · 🌟 ' + lg + '/' + Object.keys(LEGEND).length; }
  function bookOpen(G) {
    const host = document.getElementById('alPrep') || $('#ciack'), old = document.getElementById('alBook'); if (old) old.remove();
    const B = book(), el = document.createElement('div'); el.id = 'alBook';
    const coins = cqBank().coins;
    if (!B.own) el.innerHTML = '<div class="bk">' + colHtml() + '<b>📖 Ricettario dell\'alchimista</b><p>Svela le <b>reazioni segrete</b>: al calderone vedi subito cosa nasce quando gli ingredienti reagiscono tra loro (vapore, cristallo, incendio…). E annota ogni pozione che vedi scoppiare.</p><p>Costa <b>🪙 ' + BOOK_COST + '</b> · ne hai <b>' + coins + '</b>' + (coins < BOOK_COST ? '<br><small>Le monete si vincono giocando: 3 per ogni vittoria, 1 per ogni partita.</small>' : '') + '</p><button type="button" id="alBuy"' + (coins < BOOK_COST ? ' disabled' : '') + '>🪙 Compra</button><button type="button" class="cl">Chiudi</button></div>';
    else {
      const L = Object.entries(B.f).sort((a, b) => b[1] - a[1]).map(([k]) => brew(k)).filter(Boolean);
      el.innerHTML = '<div class="bk">' + colHtml() + '<b>📖 Ricettario · ' + L.length + ' / ' + TOTAL + ' pozioni</b>' + (L.length ? L.map(P => '<div class="rc"><span class="ig">' + P.ings.map(g => g.e).join('') + '</span><span><b style="color:' + P.c + '">' + P.e + ' ' + esc(P.n) + '</b><br><small>' + esc(describe(P)) + '</small></span></div>').join('') : '<p>Ancora vuoto: lancia pozioni (o guarda quelle dell\'altro) per riempirlo!</p>') + '<button type="button" class="cl">Chiudi</button></div>';
    }
    host.appendChild(el);
    el.querySelector('.cl').onclick = () => el.remove();
    const buy = el.querySelector('#alBuy'); if (buy) buy.onclick = () => { const b = cqBank(); if (b.coins < BOOK_COST) return; b.coins -= BOOK_COST; book().own = 1; saveStore(); SFX.bottle(); cqToast('📖 <b>Ricettario comprato!</b> Ora al calderone vedi anche le reazioni segrete.'); bookOpen(G); if (G) prepRender(G); };
  }
  // SCHEDE di spiegazione: la prima volta di ogni fase su questo telefono (non fermano il tempo)
  const HELP = {
    prep: '<b>🧪 Prepara le pozioni</b><br>Tocca i barattoli: gli ingredienti cadono nel calderone (fino a 3). <b>Imbottiglia</b> per metterla nella cintura (4 ampolle). Sotto il calderone leggi <b>cosa uscirà</b>; se gli ingredienti <b>reagiscono tra loro</b> è un segreto (provalo, o compra il 📖 ricettario). Prepara una <b>coppia</b>: una pozione che <b>blocca</b> (🍯 ❄️ ⏳) e una che <b>brucia</b> 🌶️.',
    duel: '<b>⚔️ Duello</b><br>Scegli l\'ampolla in basso, poi <b>trascina indietro</b> il pulsante tondo come una fionda e lascia. Le ampolle sono <b>poche</b>: il calderone del tuo angolo ti ridà le <b>tue</b> pozioni, ma ha solo 🫕 ' + RESERVE + ' ricariche (+1 ogni ' + RES_T + ' s). <b>COMBO</b>: se l\'altro è incollato, congelato o rallentato, il fuoco gli toglie <b>' + COMBO + ' cuori</b>! <b>🍷 Bevi</b>: ogni ampolla si può anche <b>bere</b> per un potere su di te (🛡️ mantello di fiamme, 💨 scatto, 🪞 scudo, ⛸️ pattini…).'
  };
  function helpOnce(k) {
    let seen = {}; try { seen = JSON.parse(localStorage.getItem('alcHelp2') || '{}'); } catch {}   // (2: schede nuove con ampolle contate e combo)
    if (seen[k]) return; seen[k] = 1; try { localStorage.setItem('alcHelp2', JSON.stringify(seen)); } catch {}
    const old = document.getElementById('alHelp'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'alHelp'; el.className = k; el.innerHTML = HELP[k] + '<button type="button">Ho capito</button>';
    $('#ciack').appendChild(el); el.querySelector('button').onclick = () => el.remove();
  }
  // FISCHI DELLE AMPOLLE: ogni elemento "suona" in volo (si sente cosa arriva senza guardare). Riga = [forma, nota iniziale, nota finale, durata, ogni quanto,
  // variazione a caso]; l'elemento principale della pozione decide il suono (un elemento nuovo senza riga usa FISCHIO). Piu' forte se cade vicino a me, piu' acuto mentre arriva
  const FISCHIO = ['sine', 1000, 1150, 0.12, 0.16, 0];
  const WHIS = {
    fire: ['square', 160, 110, 0.03, 0.05, 90], blaze: ['square', 130, 90, 0.04, 0.045, 110],   // crepita
    ice: ['triangle', 2600, 3100, 0.06, 0.15, 700], statue: ['triangle', 2200, 2500, 0.08, 0.2, 400],   // tintinna
    wind: ['sine', 850, 1350, 0.16, 0.13, 60], whirl: ['sine', 700, 1500, 0.14, 0.11, 200], steam: ['sawtooth', 1300, 1600, 0.08, 0.1, 150],   // sibila
    smoke: ['sawtooth', 600, 520, 0.12, 0.16, 40], soot: ['sawtooth', 420, 380, 0.14, 0.18, 30],   // soffia
    glue: ['sine', 230, 140, 0.09, 0.22, 30], grow: ['sine', 95, 70, 0.15, 0.22, 10], shrink: ['sine', 3000, 3600, 0.04, 0.09, 900], pop: ['square', 600, 1200, 0.03, 0.12, 300],
    slow: ['triangle', 320, 210, 0.14, 0.42, 0], pull: ['sine', 520, 300, 0.12, 0.15, 50], mirror: ['sine', 1560, 1550, 0.22, 0.34, 0], chaos: ['triangle', 400, 1800, 0.06, 0.1, 1200] };
  function flSound(G) {
    if (!store.settings.sound || !G.fl || !G.fl.length) return;
    const now3 = performance.now() / 1000, T = G.sndT || (G.sndT = {}), L = G.fl.map(f => ({ f, d: Math.hypot(f.x1 - cq.x, f.y1 - cq.y) })).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const { f, d } of L) {
      const key = f.q ? f.o + ':' + f.q : f.id, P = brew(f.k); if (!P || (T[key] || 0) > now3) continue;
      const W = WHIS[P.main] || FISCHIO, u = Math.max(0, Math.min(1, (G.time - f.t0) / Math.min(f.d, f.fz))), up = 1 + 0.25 * u, rnd = (Math.random() - 0.5) * W[5];
      const vol = 0.011 * (f.o === G.me.id ? 0.5 : 1) * (0.35 + 0.9 * Math.max(0, 1 - d / 9));
      swp((W[1] + rnd) * up, (W[2] + rnd) * up, W[3], vol, 0, W[0]); T[key] = now3 + W[4];
    }
    if (Object.keys(T).length > 40) G.sndT = {};
  }
  // evento del piano: avviso e inizio (ogni telefono, con il suo suono)
  function evLocal(G) {
    const ev = G.st && G.st.ev, ph = evPh(G), key = ev ? ev.k + G.st.n + ph : ''; if (key === G.evSeen) return; G.evSeen = key;
    const E = ev && EVENTS[ev.k]; if (!E) return;
    if (ph === 'warn') { cqToast(E.warn); SFX.ev(ev.k, 0); } else if (ph === 'on') { cqToast(E.go); SFX.ev(ev.k, 1); }
  }
  function fxEvents(G) {
    for (const b of G.bx) if (b[0] > (G.bxSeen || 0)) {
      G.bxSeen = b[0]; if (G.time - b[4] > 1.5) continue;
      G.spl = (G.spl || []).filter(s => performance.now() / 1000 - s.t < 2.2); G.spl.push({ k: b[1], x: b[2], y: b[3], t: performance.now() / 1000, how: b[5] });
      if (b[1] && b[5] !== 'react' && b[5] !== 'mirror' && b[5] !== 'air') bookNote(b[1]);
      if (b[5] === 'air') { SFX.boom(); SFX.smash(''); swp(1800, 300, 0.5, 0.04, 0.05, 'triangle'); if (G.guest) G.fl = G.fl.filter(f => !(f.loc && Math.hypot(flPos(f, G.time).x - b[2], flPos(f, G.time).y - b[3]) < 1.3)); continue; }   // scontro in volo
      if (b[5] === 'react') { SFX.boom(); swp(400, 1600, 0.3, 0.04, 0.05, 'triangle'); continue; }
      const P = b[1] && brew(b[1]); if (b[5] !== 'bounce') { SFX.smash(P ? P.main : ''); if (b[5] === 'early' || (P && P.inst >= 0.45)) SFX.boom(); } else swp(400, 900, 0.12, 0.04);
      if (G.guest) G.fl = G.fl.filter(f => !(f.loc && Math.hypot(f.x1 - b[2], f.y1 - b[3]) < 0.1));
    }
    for (const h of G.hx) if (h[0] > (G.hxSeen || 0)) {
      G.hxSeen = h[0];
      if (h[3] === 'plant') { cqToast(h[2]); swp(300, 120, 0.3, 0.04); continue; }
      const c = G.chars.find(o => o.id === h[1]); if (!c) continue;
      if (h[3] === 'boom') { cqToast(c === G.me ? '💥 <b>Le tue ampolle instabili ti scoppiano addosso!</b>' : '💥 <b>A ' + esc(c.name) + ' scoppiano le ampolle alla cintura!</b>'); continue; }
      if (h[3] === 'drink') { if (c !== G.me) SFX.drink(); cqToast((c === G.me ? '🍷 <b>Hai bevuto</b> ' : '🍷 <b>' + esc(c.name) + ' beve</b> ') + esc(h[2])); continue; }
      if (h[3] === 'combo') { SFX.boom(); SFX.ouch(); cqToast(c === G.me ? '💥 <b>COMBO! -2 cuori</b>: eri bloccato (' + esc(h[2]) + ')' : '💥 <b>COMBO su ' + esc(c.name) + '!</b> -2 cuori (' + esc(h[2]) + ')'); continue; }
      if (h[2].startsWith('🕳️')) SFX.fall(); else SFX.ouch();
      cqToast((c === G.me ? '💔 <b>-1 cuore</b>: ' : '💥 <b>' + esc(c.name) + '</b> -1 cuore: ') + esc(h[2]));
    }
  }

  const RULES = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">📖 Come si gioca</summary><p>Uno contro uno in cima alla <b>torre dei maghi</b>, <b>3 manche, una per piano</b>: si parte dalla serra e si sale fino al laboratorio in cima. Vince chi vince più manche.</p><p>🌿 <b>Serra carnivora</b>: le piante mordono chi passa vicino (fuoco le brucia, ghiaccio le congela, fungo le fa giganti, fata le rimpicciolisce, sabbia e colla le addormentano). 🕰️ <b>Sala dell\'orologio</b>: gli ingranaggi sotto il vetro ti fanno girare, il pendolo sbalza chi è sotto. ⚗️ <b>Laboratorio</b>: la voragine al centro.</p><p>⏰ <b>A metà duello</b> ogni piano ha il suo <b>evento</b>, annunciato 5 secondi prima: 🌸 nella serra le piante fioriscono e sparano polline magico, 🕛 nell\'orologio suona la mezzanotte e il tempo rallenta per tutti (anche le ampolle), 🌋 in cima la voragine erutta e tutte le pozioni diventano più forti.</p><p><b>1. Preparazione</b> (90 s, poi 60 s): al calderone mescoli in segreto fino a 3 ingredienti per pozione e riempi le <b>4 ampolle</b> della cintura. Ogni barattolo dice cosa fa e sotto il calderone leggi <b>cosa uscirà</b>; quando gli ingredienti <b>reagiscono tra loro</b> (fuoco + ghiaccio = vapore…) è un <b>segreto</b>: lo scopri lanciando, o col ricettario. Se il calderone trema e ribolle forte, la miscela è instabile: la miccia è corta e potrebbe scoppiarti vicino.</p><p><b>2. Duello</b> (90 s): scegli l\'ampolla in basso, <b>trascina indietro</b> il pulsante come una fionda e lascia. Le ampolle si vedono arrivare: <b>schivale</b>! Fuoco, ghiaccio, colla, fumo, vento… lasciano pozze e spinte, e le pozze <b>reagiscono</b> con le pozioni che ci cadono sopra (fuoco sul ghiaccio = vapore che sbalza, ghiaccio sulla colla = cristallo che congela). Due ampolle che si <b>scontrano in volo</b> scoppiano in aria e mescolano i loro ingredienti: rispondere a un lancio con un contro-lancio dritto può fermarlo! <b>3 cuori</b> a testa: li perdi bruciando, sbattendo contro i muri e cadendo nella <b>voragine</b>. Le ampolle instabili alla cintura <b>sfrigolano</b>: se ti prende il fuoco possono scoppiarti addosso. <b>💥 COMBO</b>: se l\'altro è incollato 🍯, congelato 🧊 o rallentato ⏳, il fuoco gli toglie <b>' + COMBO + ' cuori</b>: prima lo blocchi, poi lo colpisci. <b>🍷 Bere o lanciare</b>: col pulsante 🍷 bevi l\'ampolla scelta e ti dà un potere (🔥 fuoco = mantello di fiamme, ❄️ brina = pattini, 🦅 vento = scatto, 🍯 colla = piedi piantati, 🪞 specchio = scudo che rimanda un\'ampolla, 🌫️ cenere = sparisci nel fumo, ⏳ sabbia = tutto più veloce…; quelle instabili possono farti male). Le ampolle sono <b>poche</b>: il <b>calderone del tuo angolo</b> ti ridà le <b>tue</b> pozioni, una alla volta, ma ha solo ' + RESERVE + ' ricariche (+1 ogni ' + RES_T + ' s).</p><p><b>📖 Ricettario</b> (🪙 ' + BOOK_COST + ' monete, dal pulsante 📖 al calderone): svela le reazioni segrete e annota le pozioni che vedi.</p><p><b>🏅 Collezione</b>: ogni pozione che vedi scoppiare (tua o dell\'altro) è una <b>scoperta</b> (' + TOTAL + ' in tutto). Ai traguardi sblocchi premi per il tuo mago, che vede anche l\'altro: ✨ stelle sul cappello, 🌈 scia arcobaleno, 🦉 gufetto, 👑 corona, 🔥 scintille, 🌙 aura. E ci sono <b>3 pozioni leggendarie</b> 🌟, una per piano: la ricetta è nascosta in un indovinello nel ricettario; chi la prepara la prima volta sblocca un ornamento speciale.</p><p>Vince la manche chi toglie tutti i cuori all\'altro o, allo scadere, chi ne ha di più.</p></details>';

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
      Object.assign(G, { fl: [], zn: [], bx: [], hx: [], pend: [], flN: 0, znN: 0, bxN: 0, hxN: 0, sel: 0 });
      G.chars.forEach((c, i) => { const [x, y] = SPAWN[i % 2]; c.x = x; c.y = y; c.face = i ? -1 : 1; c.hp = HP; c.fx = {}; c.path = []; c.think = 1 + i; c.belt = Array(BELT_N).fill(''); });
      G.st = { n: 1, ph: 'prep', t0: 0, rd: {}, sc: {} }; U2.ph = '';
      useFloor(0); plantsInit(G);
      for (const c of G.chars) if (c.bot && !c.remote) { c.belt = cpuBelt(G); G.st.rd[c.id] = 1; c.cos = PRIZES.filter(() => Math.random() < 0.35).map(p => p.id).join(','); }   // anche il computer ha qualche premio
      G.me.cos = myCos();
    },
    gstart(G) { syncFloor(); G.pl = []; G.opp = G.chars.find(c => c !== G.me) || null; G.st = null; U2.ph = ''; Object.assign(G, { fl: [], zn: [], bx: [], hx: [], sel: 0 }); G.chars.forEach(c => { c.hp = HP; c.fx = {}; c.belt = Array(BELT_N).fill(''); }); },
    intro: () => '⚗️ Benvenuto nella torre dei maghi!',
    voice: () => 1,   // voce sempre aperta tra i due
    speed: c => { const G = cq.g; return G ? speedOf(G, c) : 1; },
    extras(G) {
      const out2 = [];
      if (FL && FL.plants) for (const p of G.pl || []) { const [x, y] = PLANTS[p.i]; if (!p.__dr || (p.__dr.box && (p.st === 'giant') !== !!p.__dr.big)) { p.__dr = (g, X, Y, TW) => plantDraw(g, X, Y, TW, (cq.g.pl || [])[p.i] || p); p.__dr.top = 2.2; p.__dr.big = p.st === 'giant'; p.__dr.box = p.__dr.big ? [1.5, 3.2, 0.4] : PLANTS[p.i][2] ? [1.1, 2.5, 0.3] : [0.9, 2.1, 0.3]; } out2.push({ x: x + 0.5, y: y + 0.52, L: null, w: 0, f: 1, name: null, all: true, dr: p.__dr }); }
      if (FL && FL.pend) { const B = pendPos(G.time); out2.push({ x: B.x, y: B.y, L: null, w: 0, f: 1, name: null, all: true, dr: pendDraw }); }
      return out2;
    },
    hide(c) {   // nel fumo non ti vedono (se non da vicino); caduto nella voragine sparisce
      const G = cq.g; if (!G || !G.st) return false;
      if (c.fx && c.fx.fall && c.fx.out > G.time && G.time - c.fx.fall > 0.6) return true;
      if (c === G.me) return false;
      return (fxOn(G, c, 'hidden') || zonesAt(G, c.x, c.y).some(z => ZONE[z.k].hide)) && Math.hypot(c.x - cq.x, c.y - cq.y) > 1.6;
    },
    hud(G) {
      const h = c => c ? '❤️'.repeat(Math.max(0, c.hp)) + '🖤'.repeat(Math.max(0, HP - c.hp)) : '';
      const st = G.st; if (!st) return '⚗️';
      const left = st.ph === 'prep' ? (st.n > 1 ? PREP2 : PREP) - (G.time - st.t0) : st.ph === 'duel' ? DUEL - (G.time - st.t0) : 0, sc = st.sc || {};
      return `${FL ? FL.e : ''}${st.n} 🏆 ${sc[G.me.id] || 0}-${G.opp ? sc[G.opp.id] || 0 : 0} · ${h(G.me)}${G.opp ? ' · ' + esc(G.opp.name) + ' ' + h(G.opp) : ''} · ${st.ph === 'prep' ? '🧪' : '⚔️'} ${mmss(Math.max(0, left))}`;
    },
    big(G) {
      const st = G.st; if (!st) return '⏳ Un attimo…';
      if (st.ph === 'mres') return st.msg + (st.fin ? '' : '\nProssima manche tra ' + Math.max(1, Math.ceil(MRES - (G.time - st.t0))) + '…');
      if (st.ph === 'duel') {
        if (G.fill) return '🫕 Ricarico… ' + Math.max(0, KETTLE_T - (G.time - G.fill)).toFixed(1) + ' · riserva ' + (G.me.rf || 0);
        if (G.myFall != null) return '🕳️ Giù nella voragine!';
        const l = DUEL - (G.time - st.t0); return l < 10 && l > 0 ? '⏱ ' + Math.ceil(l) + '…' : '';
      }
      return '';
    },
    btn(G) {
      if (!G.st || G.st.ph !== 'duel' || out(G, G.me)) return null;
      if (G.fill) return { t: '✋ Basta così', on: true };
      if (!nearKettle(G, G.me) || !G.me.belt.some(v => !v)) return null;
      return G.me.rf > 0 ? { t: '🫕 Ricarica (' + G.me.rf + ')', on: true } : { t: '🫕 Vuoto: ' + Math.ceil(RES_T - (G.time - (G.me.rfT || 0))) + ' s', on: false };
    },
    act(G) { if (G.fill) { G.fill = null; return; } if (nearKettle(G, G.me) && canFill(G.me)) { G.fill = G.time; swp(200, 500, 0.4, 0.04); } },
    view(G) {   // mirando lontano la telecamera va un po' verso il punto d'arrivo
      const V = G.vw || (G.vw = { z: 0.84, x: 0, y: 0 }), A = G.aim && G.aim.ok ? G.aim : null, k = 0.12;
      const tx = A ? (A.x - cq.x) * 0.4 : 0, ty = A ? (A.y - cq.y) * 0.4 : 0, tz = A && Math.hypot(A.x - cq.x, A.y - cq.y) > 5 ? 0.74 : 0.84;
      V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k; return V;
    },
    tick(G, dt) {
      const st = G.st;
      if (st.ph === 'prep') {
        const left = (st.n > 1 ? PREP2 : PREP) - (G.time - st.t0);
        if (G.chars.every(c => st.rd[c.id]) || left < -1.5) { st.ph = 'duel'; st.t0 = G.time; st.rd = {}; st.ev = FL && FL.ev ? { k: FL.ev, t: r2(G.time + EV_AT) } : null; for (const c of G.chars) if (c.bot && !c.remote) duelArm(G, c); }
        return;
      }
      if (st.ph === 'mres') { if (G.time - st.t0 > MRES) { if (st.fin) finalEnd(G); else newRound(G); } return; }
      // duello
      for (const c of G.chars) {
        if (c.bot && !c.remote) {
          if (c.kb && c.kb[0] !== c.kbSeen) { c.kbSeen = c.kb[0]; if (!out(G, c)) slideStart(G, c, c.kb); }
          if (c.fallAt != null && G.time - c.fallAt > FALL_T - 0.1) { c.fallAt = null; [c.x, c.y] = SPAWN[sideIdx(G, c)]; c.path = []; }
          regen(G, c); botTick(G, c, dt);
        }
      }
      flTick(G); pendTick(G); plantsTick(G); pendTick2(G); evTick(G);
      for (const c of G.chars) if (c.bot && !c.remote && !out(G, c)) gearMove(G, c, dt);
      for (const z of G.zn) if (ZONE[z.k].hurt && G.time < z.te) for (const c of G.chars) {   // pozza che brucia: un cuore ogni tanto
        const p = posOf(G, c); if (Math.hypot(p.x - z.x, p.y - z.y) < z.r && (c.burnT || 0) < G.time && !(c.remote && cqLagging(c)) && !fxOn(G, c, 'fireS')) { c.burnT = G.time + ZONE[z.k].hurt; if (G.time - z.t0 > 0.3) hurt(G, c, '🔥 bruciato'); }
      }
      G.zn = G.zn.filter(z => G.time < z.te);
      if (st.ph === 'duel' && G.time - st.t0 > DUEL) { const a = G.chars[0], b = G.chars[1]; roundEnd(G, a.hp > b.hp ? a : b.hp > a.hp ? b : null, '⏱ Tempo scaduto'); }
    },
    local(G, dt) {
      stage(G); if (G.st && G.st.ph === 'duel') { meTick(G, dt); duelUITick(G); } fxEvents(G); evLocal(G); if (G.st && G.st.ph === 'duel') flSound(G);
      if (FL && FL.gears && G.st && G.st.ph !== 'prep') { const k = Math.floor(G.time); if (k !== G.tick) { G.tick = k; swp(k % 2 ? 2100 : 1700, k % 2 ? 1900 : 1500, 0.025, 0.012, 0, 'triangle'); } }   // tic-tac della sala dell'orologio
    },
    ev(G, c, o) {
      if (o.k === 'belt' && G.st && G.st.ph !== 'mres') c.belt = cleanBelt(o.b);
      else if (o.k === 'rdy' && G.st && G.st.ph === 'prep') { if (o.on) G.st.rd[c.id] = 1; else delete G.st.rd[c.id]; }
      else if (o.k === 'th' && +o.i >= 0 && +o.i < BELT_N) { const p = cleanBelt(o.p)[0]; if (p) c.belt[+o.i] = p; throwFrom(G, c, +o.i, +o.x || 0, +o.y || 0, o.q); }   // la pozione viaggia col lancio: cintura sempre uguale sui due telefoni
      else if (o.k === 'dr' && +o.i >= 0 && +o.i < BELT_N) { const p = cleanBelt(o.p)[0]; if (p) c.belt[+o.i] = p; drinkFrom(G, c, +o.i, +o.dx || 0, +o.dy || 0); }   // l'amico beve
      else if (o.k === 'cos') c.cos = cleanCos(o.v);   // i premi dell'amico
      else if (o.k === 'fall') fell(G, c);
      else if (o.k === 'bonk') { hurt(G, c, '💫 contro il muro'); setFx(G, c, 'stuck', 0.7); }
    },
    snap: G => ({ pl: (G.pl || []).map(p => [p.st, p.te, p.bt, p.bid]), st: G.st, fl: G.fl.map(f => [f.id, f.o, f.k, f.x0, f.y0, f.x1, f.y1, f.t0, f.d, f.pk, f.fz, f.q || 0]), zn: G.zn.map(z => [z.i, z.k, z.x, z.y, z.r, z.t0, z.te, z.o]), bx: G.bx, hx: G.hx }),
    apply(G, x) {
      if (x.st) { G.st = x.st; if (G.st.ph !== 'prep') G.myRdy = false; }
      if (x.pl) G.pl = x.pl.map((v, i) => ({ i, st: v[0], te: v[1], bt: v[2], bid: v[3] }));
      if (x.fl) { const mine = G.fl.filter(f => f.loc && !x.fl.some(v => v[1] === G.me.id && v[11] === f.q) && G.time - f.t0 < Math.min(f.d, f.fz) + 0.4); G.fl = x.fl.map(v => ({ id: v[0], o: v[1], k: v[2], x0: v[3], y0: v[4], x1: v[5], y1: v[6], t0: v[7], d: v[8], pk: v[9], fz: v[10], q: v[11] })).concat(mine); }
      if (x.zn) G.zn = x.zn.map(v => ({ i: v[0], k: v[1], x: v[2], y: v[3], r: v[4], t0: v[5], te: v[6], o: v[7] }));
      if (x.bx) G.bx = x.bx; if (x.hx) G.hx = x.hx;
    },
    csnap: c => [c.hp, (c.belt || []).join(','), c.fx || {}, c.kb || 0, c.hitT || 0, c.bz || 0, c.cos || ''],
    capply(G, c, a) {
      if (a[0] != null) c.hp = a[0]; if (c !== G.me && a[1] != null) c.belt = cleanBelt(a[1]); if (c !== G.me && a[6] != null) c.cos = cleanCos(a[6]);
      if (a[2]) c.fx = a[2]; if (a[3]) c.kb = a[3]; if (a[4] != null) c.hitT = a[4];
      if (c === G.me && G.kbSeen == null) G.kbSeen = c.kb ? c.kb[0] : 0;   // entrando non rifaccio le spinte vecchie
      if (c === G.me && G.bzSeen == null) G.bzSeen = a[5] ? a[5][0] : 0;   // entrando non rifaccio gli scoppi vecchi
      if (c === G.me && a[5]) { if (a[5][0] !== G.bzSeen) { G.bzSeen = a[5][0]; G.me.belt = G.me.belt.map((k, i) => a[5][1] & (1 << i) ? '' : k); nextSel(G); } }
    },
    draw(c) {
      const G = cq.g, s = sideOf(G, c), L = cqLookOf(c), key = s + (L.skin || '');
      if (c.__dk !== key) {
        c.__dk = key;
        c.__dr = (g, X, Y, TW, L2, w, f) => {
          const G2 = cq.g, sc = fxOn(G2, c, 'big') ? 1.5 : fxOn(G2, c, 'small') ? 0.6 : 1, fall = c.fx && c.fx.fall && c.fx.out > G2.time ? Math.min(1, (G2.time - c.fx.fall) / 0.6) : 0;
          const sh = c.hitT && G2.time - c.hitT < 0.35 ? Math.sin((G2.time - c.hitT) * 60) * 3 : 0;
          const gh = fxOn(G2, c, 'hidden');   // nascosto (pozione di fumo bevuta): io mi vedo trasparente
          if (sc === 1 && !fall && !sh && !gh) { wizard(g, X, Y, TW, L2, w, f, s, vials(G2, c), c.cos); return; }
          g.save(); if (gh) g.globalAlpha *= 0.45; g.translate(X + sh, Y + fall * TW * 0.8); g.scale(sc * (1 - fall * 0.7), sc * (1 - fall * 0.7)); if (fall) g.rotate(fall * 3 * f);
          wizard(g, 0, 0, TW, L2, w, f, s, vials(G2, c), c.cos); g.restore();
        };
        c.__dr.top = cqTop(L) + (L.skin === 'omino' ? 0.85 : 0.75);
      }
      return c.__dr;
    },
    deco(g, c, X, Y, TW, G) {
      const L = cqLookOf(c), sc = fxOn(G, c, 'big') ? 1.5 : fxOn(G, c, 'small') ? 0.6 : 1, H = TW * (cqTop(L) + (L.skin === 'omino' ? 0.85 : 0.75));
      if (fxOn(G, c, 'frz')) { g.save(); g.globalAlpha = 0.55; g.fillStyle = '#bfe8ff'; cqRR(g, X - TW * 0.42 * sc, Y - H * 0.85 * sc, TW * 0.84 * sc, H * 0.88 * sc, 6); g.fill(); g.globalAlpha = 0.9; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.stroke(); g.restore(); }
      if (c.cos && !out(G, c)) {   // premi ai piedi
        if (c.cos.includes('aura')) { g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 2); g.strokeStyle = '#c8e0ff'; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y, TW * 0.46 * sc, TW * 0.2 * sc, 0, 0, 7); g.stroke(); g.globalAlpha *= 0.6; g.lineWidth = 1; g.beginPath(); g.ellipse(X, Y, TW * 0.58 * sc, TW * 0.26 * sc, 0, 0, 7); g.stroke(); g.restore(); }
        if (c.cos.includes('embers')) for (let i = 0; i < 5; i++) { const q = (G.time * 0.9 + i / 5) % 1, an = i * 1.3 + G.time; g.globalAlpha = 1 - q; g.fillStyle = i % 2 ? '#ffb030' : '#ff6a2a'; g.beginPath(); g.arc(X + Math.cos(an) * TW * 0.3 * sc, Y - q * TW * 0.7, Math.max(1.4, TW / 30) * (1 - q * 0.5), 0, 7); g.fill(); g.globalAlpha = 1; }
      }
      if (fxOn(G, c, 'stone')) { g.save(); g.globalAlpha = 0.6; g.fillStyle = '#8a8a90'; cqRR(g, X - TW * 0.4 * sc, Y - H * 0.85 * sc, TW * 0.8 * sc, H * 0.88 * sc, 8); g.fill(); g.restore(); }
      if (fxOn(G, c, 'fireS')) { g.save(); for (let i = 0; i < 8; i++) { const an = G.time * 3 + i * 0.785, fl = 0.6 + 0.4 * Math.sin(G.time * 13 + i * 2); g.fillStyle = i % 2 ? '#ff8a2a' : '#ffd24a'; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(X + Math.cos(an) * TW * 0.42 * sc, Y + Math.sin(an) * TW * 0.18 * sc - TW * 0.08 * fl, TW * 0.05, TW * 0.11 * fl, 0, 0, 7); g.fill(); } g.restore(); }
      if (fxOn(G, c, 'shield')) { g.save(); g.globalAlpha = 0.5 + 0.2 * Math.sin(G.time * 5); g.strokeStyle = '#e8f0ff'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(X, Y - H * 0.45 * sc, TW * 0.5 * sc, H * 0.55 * sc, 0, 0, 7); g.stroke(); g.restore(); }
      if (fxOn(G, c, 'stuck')) { g.save(); g.globalAlpha = 0.8; g.fillStyle = '#d89a2a'; g.beginPath(); g.ellipse(X, Y, TW * 0.45 * sc, TW * 0.2 * sc, 0, 0, 7); g.fill(); g.restore(); }
      if (fxOn(G, c, 'blind')) { g.save(); g.fillStyle = 'rgba(20,16,24,.85)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X + (i - 2) * TW * 0.12, Y - H * 0.78 * sc + Math.sin(i + G.time * 3) * 3, TW * 0.16, 0, 7); g.fill(); } g.restore(); }
      if (c.hitT && G.time - c.hitT < 1) { const a = G.time - c.hitT; g.save(); g.font = '14px system-ui'; g.textAlign = 'center'; for (let i = 0; i < 3; i++) { const an = a * 5 + i * 2.1; g.fillText('⭐', X + Math.cos(an) * TW * 0.35, Y - H * 0.9 * sc + Math.sin(an) * TW * 0.1); } g.restore(); }
      if (c.belt && !(G.st && G.st.ph === 'prep' && c !== G.me) && c.belt.some(k => k && brew(k).inst >= VOLATILE)) for (let i = 0; i < 3; i++) { const t2 = G.time * 7 + i * 2.1; if (Math.sin(t2 * 3.3) > 0.2) { g.fillStyle = i % 2 ? '#ffe070' : '#ff7a2a'; g.beginPath(); g.arc(X + Math.sin(t2) * TW * 0.3 * sc, Y - TW * 0.42 * sc - Math.abs(Math.cos(t2 * 1.7)) * TW * 0.15, 2.2, 0, 7); g.fill(); } }   // cintura instabile: sfrigola
      const ic = Object.entries(STATE).filter(([k]) => fxOn(G, c, k)).map(([, S]) => S.e).join('');
      const top = Y - H * Math.max(1, sc) - 16;
      if (!out(G, c)) hearts(g, X, top, c.hp == null ? HP : c.hp);
      if (ic) { g.font = '13px system-ui'; g.textAlign = 'center'; g.fillText(ic, X, top - 16); }
    },
    // sopra alla mappa: luce dalla voragine, bolle dei calderoni, pozze, ampolle in volo, schizzi, mira
    over(g, G, sx, sy, TW) {
      const t = performance.now() / 1000, U = TW * 0.575;
      for (const z of G.zn || []) if (z.k !== 'smoke') zoneDraw(g, G, z, sx, sy, TW, t);
      if (FL && FL.pend) { const B = pendPos(G.time); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(sx(B.x, B.y), sy(B.x, B.y), TW * 0.55, TW * 0.25, 0, 0, 7); g.fill(); }
      if (FL && FL.plants) for (const p of G.pl || []) if (p.bid >= 0) { const [x, y] = PLANTS[p.i], r = plReach(p) * TW * 0.7071; g.strokeStyle = 'rgba(255,80,80,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx(x + 0.5, y + 0.5), sy(x + 0.5, y + 0.5), r, r / 2, 0, 0, 7); g.stroke(); }
      if (FL && FL.flies) for (let i = 0; i < 24; i++) {   // lucciole
        const bxf = C + Math.cos(i * 2.4) * (2.8 + (i * 0.37 % 1) * 5.5), byf = C + Math.sin(i * 2.4) * (2.8 + (i * 0.37 % 1) * 5.5), x = bxf + Math.sin(t * 0.5 + i) * 0.7, y = byf + Math.cos(t * 0.37 + i * 1.3) * 0.7, z = 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 2)), on = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 3.1);
        if (on < 0.15) continue; const X = sx(x, y), Y = sy(x, y) - z * U;
        g.globalAlpha = on * 0.35; g.fillStyle = '#d8ff7a'; g.beginPath(); g.arc(X, Y, TW * 0.12, 0, 7); g.fill(); g.globalAlpha = on; g.fillStyle = '#f4ffb0'; g.beginPath(); g.arc(X, Y, Math.max(1.5, TW / 30), 0, 7); g.fill();
      }
      if (FL && FL.dust) {   // polvere dorata che scende piano e vapore dai tubi
        for (let i = 0; i < 18; i++) { const ph = (t * 0.06 + i / 18) % 1, x = C + Math.cos(i * 2.1) * (1 + (i * 0.53 % 1) * 6.5), y = C + Math.sin(i * 2.1) * (1 + (i * 0.53 % 1) * 6.5); g.globalAlpha = Math.sin(ph * Math.PI) * 0.6; g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(sx(x, y) + Math.sin(t + i) * 6, sy(x, y) - (3 - ph * 3) * U, Math.max(1, TW / 45), 0, 7); g.fill(); }
        for (const p of CQ_PROPS) if (p[0] === 'pipes') for (let i = 0; i < 4; i++) { const ph = (t * 0.45 + i / 4 + p[1] * 0.13) % 1, x = p[1] + 0.45 + Math.sin(i + t) * 0.1 * ph, y = p[2] + 0.4; g.globalAlpha = (1 - ph) * 0.35; g.fillStyle = '#e8eef4'; g.beginPath(); g.arc(sx(x, y) + ph * 10, sy(x, y) - (2.35 + ph * 1.3) * U, TW * (0.1 + ph * 0.28), 0, 7); g.fill(); }
      }
      g.globalAlpha = 1;
      if (FL && FL.pit) for (let i = 0; i < 22; i++) {
        const ph = (t * 0.22 + i / 22) % 1, a = i * 2.39 + t * 0.15, r = 0.3 + 1.6 * ((i * 0.618) % 1), x = C + Math.cos(a) * r, y = C + Math.sin(a) * r, z = -1.5 + ph * 5;
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; g.fillStyle = i % 3 ? '#c8b8ff' : '#9ae8ff';
        g.beginPath(); g.arc(sx(x, y), sy(x, y) - z * U, Math.max(1.2, TW / 34), 0, 7); g.fill();
      }
      for (const [k, [x, y]] of KETTLE.entries()) for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1, bx2 = x + 0.5 + Math.sin(i * 2.1 + t) * 0.12, by2 = y + 0.5 + Math.cos(i * 1.7) * 0.1;
        g.globalAlpha = (1 - ph) * 0.9; g.fillStyle = SIDE[k].liq; g.beginPath(); g.arc(sx(bx2, by2), sy(bx2, by2) - (0.75 + ph * 0.5) * U, Math.max(1.5, TW / 30) * (0.6 + ph), 0, 7); g.fill();
      }
      g.globalAlpha = 1; evDraw(g, G, sx, sy, TW, t);
      for (const z of G.zn || []) if (z.k === 'smoke') zoneDraw(g, G, z, sx, sy, TW, t);
      for (const f of G.fl || []) flaskDraw(g, f, sx, sy, TW, G.time);
      { const L = G.spl || [], nm = L.filter(s => s.k && s.how !== 'bounce' && s.how !== 'mirror'); for (const s of L) splashDraw(g, G, s, sx, sy, TW, t, nm.indexOf(s) >= nm.length - 3); }   // al massimo 3 nomi alla volta
      if (G.fill) { const [kx, ky] = KETTLE[sideIdx(G, G.me)], k = Math.min(1, (G.time - G.fill) / KETTLE_T), X = sx(kx + 0.5, ky + 0.5), Y = sy(kx + 0.5, ky + 0.5) - 1.6 * U; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - 24, Y, 48, 8, 4); g.fill(); g.fillStyle = SIDE[sideIdx(G, G.me)].liq; cqRR(g, X - 22, Y + 2, 44 * k, 4, 2); g.fill(); }
      aimDraw(g, G, sx, sy, TW);
    },
    night(G) {
      if (G.st && G.st.ph === 'duel' && fxOn(G, G.me, 'blind')) return { a: 0.94, r: 1.4, lights: [], see: (x, y) => Math.hypot(x - cq.x, y - cq.y) < 2 };
      return { a: 0.42, r: 5, lights: LIGHTS, see: () => true };
    }
  };
  // esce dalla partita (fine, abbandono): via i pannelli e i pulsanti
  cqEachFrame(() => { const G = cq.g; if ((!G || G.mode !== 'alchimisti' || G.phase !== 'play') && (document.getElementById('alPrep') || document.getElementById('alTh'))) { prepClose(); for (const id of ['alTh', 'alSel', 'alNm', 'alDr', 'alAsc']) { const e = document.getElementById(id); if (e) e.remove(); } U2.ph = ''; } });
  window.__alc = { FLOORS, useFloor, plantsInit, PLANTS, GEARS, pendPos, hazardAt, book, bookOpen, bookNote, describe, TOTAL, helpOnce, potScore, randPot, volatile, pendTick, mapTorre, isPit, SPAWN, KETTLE, C, RAD, wizard, ING, EL, REACT, FX, ZONE, brew, potKey, cpuBelt, U2, addIng, bottle, setReady, prepOpen, burst, throwFrom, myThrow, aimFrom, slideStart, blocked, fillDone, duelArm, regen, canFill, secret, flight, hurts, stops, RESERVE, RES_T, COMBO, drinkFrom, myDrink, drinkOf, drinkTxt, DRINK, botDrink, airHits, flPos, EVENTS, evPh, evOn, EV_AT, ascOpen, LEGEND, PRIZES, myCos, colLine, legendCheck };   // per le prove (prove/alc*.js)
})();
