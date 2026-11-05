// L'officina dei robot - PROTOTIPO (vedi CLAUDE.md "OFFICINA DEI ROBOT: SI RIPARTE").
// Un robot alla Robocraft: si parte da una CABINA col tuo personaggio seduto dentro e si attaccano i pezzi dove vuoi su una griglia 7x7.
// Ogni casella ha un BLOCCO (telaio, corazza, ruota, cingolo, cuneo) e sopra telaio e corazza si puo' montare un'ARMA (pala, sega, martello,
// cannone, fiamma); le armi possono stare anche da sole. Piccola FISICA VERA anche in altezza: peso e posizione di ogni pezzo, ruote che
// spingono dal punto dove sono, urti che spingono e fanno girare, il cuneo che alza chi ci sbatte contro, la pala che lancia in aria;
// chi atterra a pancia in su resta indifeso e poi si raddrizza con un colpo di molla. I pezzi colpiti si rompono e quello che resta
// attaccato solo a loro cade a terra. BANCO DI PROVA: guidi nello scantinato con un manichino da buttare nella fossa o fare a pezzi.
(() => {
  const W = 56, H = 56, ARX = 28, ARY = 28, ARR = 11, AX0 = ARX - ARR, AX1 = ARX + ARR, AY0 = ARY - ARR, AY1 = ARY + ARR;   // la discarica: radura rotonda (centro ARX, ARY, raggio ARR) fra i cumuli
  const B = 0.8, RB = 0.43, BS = B / 0.5, GN = 7, GC = 3, MAXW = 45, GRAV = 16;   // un blocco = 0,8 caselle; BS = scala del disegno dei pezzi (disegnati per 0,5)
  const PIT = null;
  const RT = 90;   // durata di un round (s)

  const SPAWN = [[ARX - 6, ARY + 0.5, 0], [ARX + 5, ARY - 2.5, Math.PI * 0.85]];   // io, il manichino
  // top: arma che si monta sopra un blocco (o da sola); BH = altezza dei blocchi su cui si puo' montare un'arma
  const PZ = {
    cabina: { n: 'Cabina', w: 3, hp: 30 },
    telaio: { n: 'Telaio', w: 1, hp: 10, d: 'Il blocco base: dà forma al robot, tiene attaccati gli altri pezzi e sopra ci puoi montare un\'arma. Leggero.' },
    corazza: { n: 'Corazza', w: 2, hp: 26, plate: 1, d: 'Piastra spessa un terzo di blocco: tocca il <b>LATO</b> di un blocco (vicino al bordo della casella) per montarla lì. Protegge da quel lato senza allargare il robot. Tocca di nuovo per toglierla.' },
    ruota: { n: 'Ruota', w: 1, hp: 8, drive: 27, vmax: 5.2, mu: 1.2, d: 'Spinge dal punto dove la metti. Ruote ai lati = curve strette; tutte da una parte = tiri storto!' },
    cingolo: { n: 'Cingolo', w: 2, hp: 14, drive: 38, vmax: 3.9, mu: 1.8, d: 'Più lento della ruota ma spinge forte e tiene la strada: difficile da spostare di lato.' },
    cuneo: { n: 'Cuneo', w: 2, hp: 18, dir: 1, d: 'Muso inclinato: chi ci sbatte contro ci SALE SOPRA e viene alzato (più arriva veloce, più vola). Toccalo di nuovo per girarlo.' },
    pala: { n: 'Pala', w: 2, hp: 12, dir: 1, top: 1, wpn: 'tap', cd: 2.4, d: 'Un colpo e LANCIA IN ARIA chi ha davanti: spesso atterra a pancia in su! Va sopra un telaio (o da sola). Toccala di nuovo per girarla.' },
    sega: { n: 'Sega', w: 1.5, hp: 8, dir: 1, top: 1, wpn: 'hold', d: 'Tieni premuto: la lama gira e taglia i pezzi che tocca. Si scalda: lasciala respirare. Va sopra un telaio (o da sola).' },
    martello: { n: 'Martello', w: 2, hp: 10, dir: 1, top: 1, wpn: 'tap', cd: 1.6, d: 'Un colpo secco davanti: spacca il pezzo che prende e fa sobbalzare l\'altro. Va sopra un telaio (o da solo).' },
    cannone: { n: 'Cannone', w: 2, hp: 8, dir: 1, top: 1, wpn: 'tap', cd: 2.2, d: 'Spara lontano e spinge… anche te all\'indietro (il rinculo ti fa girare se è di lato!). Va sopra un telaio (o da solo).' },
    fiamma: { n: 'Fiamma', w: 1, hp: 6, dir: 1, top: 1, wpn: 'hold', d: 'Tieni premuto: getto di fuoco corto che brucia i pezzi. Il gas finisce e si ricarica. Va sopra un telaio (o da sola).' },
    taser: { n: 'Taser', w: 1.5, hp: 8, dir: 1, top: 1, wpn: 'tap', cd: 4, d: 'Scarica elettrica corta davanti: BLOCCA LE RUOTE di chi prende per 1,5 s (non scappa e non spinge). Si ricarica in 4 s. Va sopra un telaio (o da solo).' },
    razzo: { n: 'Torretta lanciarazzi', lb: 'Razzi', w: 2.5, hp: 10, top: 1, wpn: 'tap', cd: 1.6, am: 4, d: 'Torretta militare che GIRA DA SOLA verso il nemico: ogni tocco spara 2 razzi a parabola che lo inseguono e gli ricadono addosso dall\'alto. 4 razzi per round. Contro i razzi servono i Flare.' },
    flare: { n: 'Flare', w: 1, hp: 6, top: 1, wpn: 'tap', cd: 1.5, am: 2, d: 'Contromisura contro i razzi: tocca 🎆 e lanci una pioggia di flare accesi per 1,5 s. Un razzo che ti arriva vicino mentre sono accesi ha il 60% di farsi ingannare: conta il TEMPISMO (né troppo presto né troppo tardi). 2 lanci per round.' },
    dischi: { n: 'Lanciadischi', lb: 'Dischi', w: 2, hp: 10, dir: 1, top: 1, wpn: 'tap', cd: 2, d: 'Spara una lama rotante che RIMBALZA sui rottami e sui robot (fino a 4 volte): puoi colpire di sponda.' },
    mina: { n: 'Mine', lb: 'Mine', w: 1.5, hp: 8, dir: 1, top: 1, wpn: 'tap', cd: 0.8, am: 3, d: '3 mine per round: tocca e ne lasci una per terra dalla parte dove punta il pezzo. Dopo 1 s si arma e scoppia quando ci passa l\'avversario (tu no). Girala per scegliere dove cadono.' },
    nos: { n: 'NOS', w: 1.5, hp: 8, dir: 1, top: 1, wpn: 'nos', d: 'Bombola di nitro: un TURBO di 4 secondi, una volta sola per partita. Va sopra un telaio; lo scarico punta dove la giri (toccala di nuovo).' }
  };
  const BH = { telaio: 0.3 };
  const PDIR = [[1, 0], [0, 1], [-1, 0], [0, -1]], GDIR = [[0, -1], [1, 0], [0, 1], [-1, 0]], POFF = B / 2 + B / 6, PR = 0.3;   // corazza: verso (u, v), verso nella griglia, distanza dal centro del blocco, raggio per gli urti
  const PAL = ['telaio', 'corazza', 'ruota', 'cingolo', 'cuneo', 'pala', 'sega', 'martello', 'cannone', 'fiamma', 'taser', 'razzo', 'flare', 'dischi', 'mina', 'nos'];
  const WPN = ['pala', 'sega', 'martello', 'cannone', 'fiamma', 'taser', 'razzo', 'flare', 'dischi', 'mina', 'nos'], WICO = { flare: '🎆', pala: '⏫', sega: '🪚', martello: '🔨', cannone: '💣', fiamma: '🔥', taser: '⚡', razzo: '🚀', dischi: '💿', mina: '🧨', nos: '💨' };
  const CDK = { flare: 'F', martello: 'm', pala: 'p', cannone: 'c', taser: 'T', razzo: 'R', dischi: 'D', mina: 'M' };   // iniziale dei tempi di ricarica in b.cd
  const TEAM = ['#e0662e', '#2e86d8', '#7a6656'];   // io, l'avversario, i robot rottamati
  const now = () => performance.now() / 1000;
  const angN = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
  const angD = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const isTop = t => !!(PZ[t] && PZ[t].top), isPlate = t => t === 'corazza', isBase = t => !!PZ[t] && !isTop(t) && !isPlate(t);
  const U0 = () => ({ dumAI: true, mode: '', tool: 'telaio', parts: [], fx: [], shake: 0, slowT: 0, stopT: 0, hist: [], mir: 0, tpl: -1, hold: {}, tap: null, pops: {}, msg: null, say: '' });
  const U = U0();

  // ======================= LO SCANTINATO (banco di prova) =======================
  function mapRobot() {
    const rooms = [{ n: 'Discarica', x: 1, y: 1, w: W - 2, h: H - 2, k: 'metal', vk: 'metal', c: ['#4a443c', '#46403a'], wc: '#2a2420', nl: 1 }];
    return { w: W, h: H, rooms, doors: [], decals: [], props: JUNK.props, trees: [], tasks: [], hall: 0, cams: [], vending: [], ring: [[ARX, ARY]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Discarica: 'nella discarica' }, help: '', btnTxt: '', sabTxt: '', pxFloor: floorJunk, ground: groundJunk, draw: junkDraw, drawWall, bg: () => '#14110f', sky: skyDraw };
  }
  CQ_MAPS.robot2 = { n: 'La discarica', make: mapRobot, only: 'robot' };
  const hsh = (x, y, k) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 7, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  // ======================= LA DISCARICA =======================
  // I cumuli sono un'altezza continua jH (le caselle vicine si attaccano), piu' bassa dalla parte della telecamera (davanti non coprono
  // i robot); sopra: rottami, gomme, bidoni, casse, portiere, frigoriferi, tubi, televisori. Qua e la' lampioni, bidoni col fuoco, robot rottamati.
  const vn = (x, y, k) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, s = q => q * q * (3 - 2 * q), a = hsh(ix, iy, k), b = hsh(ix + 1, iy, k), c = hsh(ix, iy + 1, k), d = hsh(ix + 1, iy + 1, k), u = s(fx), v = s(fy); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  function jH(x, y) {
    const d = Math.hypot(x - ARX, y - ARY), an = Math.atan2(y - ARY, x - ARX), fr = Math.max(0, Math.cos(an - Math.PI / 4)), f2 = fr * fr, e = d - ARR - 0.45 - 1.4 * f2; if (e <= 0) return 0;
    return Math.min(4.4, e * 1.05) * (1 - 0.4 * f2) * (0.6 + 0.7 * vn(x / 2.6, y / 2.6, 21)) + Math.min(1, e) * 0.35 * vn(x * 1.3, y * 1.3, 22);
  }
  const JUNK = (() => {
    const props = [], lamps = [], fires = [], flies = [], smokes = [], special = new Map();
    const put = (x, y, v) => { const k = Math.floor(x) + ',' + Math.floor(y); special.set(k, Object.assign(special.get(k) || {}, v)); };
    // punti sparsi lungo l'anello (a0..a1: lontano dalla telecamera, che sta verso +x +y)
    const spots = (n, d0, d1, k, a0, a1) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * (i + 0.2 + 0.6 * hsh(i, k, 33)) / n, d = d0 + (d1 - d0) * hsh(i, k, 34); return [ARX + Math.cos(a) * d, ARY + Math.sin(a) * d]; });
    const F0 = Math.PI / 4, back0 = F0 + 0.9, back1 = F0 + 2 * Math.PI - 0.9;
    spots(6, ARR + 2.2, ARR + 3.2, 1, back0, back1).forEach(([x, y], i) => { const col = i % 2 ? '#ffd890' : '#a8d8ff'; put(x, y, { lamp: col, lx: x, ly: y }); lamps.push([x, y]); });
    spots(3, ARR + 1.3, ARR + 1.7, 2, Math.PI * 0.85, Math.PI * 1.75).forEach(([x, y]) => { put(x, y, { fire: 1, fx: x, fy: y }); fires.push([x, y]); });
    spots(4, ARR + 1.7, ARR + 2.4, 3, F0 + 0.7, F0 + 2 * Math.PI - 0.7).forEach(([x, y], i) => { put(x, y, { wreck: i, wx: x, wy: y }); if (i === 1) smokes.push([x, y]); });
    spots(40, ARR + 1, ARR + 6, 4, 0, 2 * Math.PI).forEach(([x, y], i) => flies.push([x, y, hsh(i, 5, 35) * 6.28, 0.4 + hsh(i, 6, 36) * 0.9]));
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (Math.hypot(x + 0.5 - ARX, y + 0.5 - ARY) < ARR - 0.35) continue; const k = x + ',' + y; props.push(['junk', x, y, Object.assign({}, special.get(k) || {})]); }
    return { props, lamps, fires, flies, smokes };
  })();
  // il pavimento: ghiaia battuta nella radura (bulloni, macchie d'olio), terra scura sotto i cumuli
  function floorJunk(K, x, y) {
    const { S, poly, TW, g } = K, P = (u, v) => S(x + u, y + v, 0), inR = Math.hypot(x + 0.5 - ARX, y + 0.5 - ARY) < ARR + 0.3, n = hsh(x, y, 3);
    poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], inR ? (n < 0.5 ? '#4d463d' : '#49423a') : (n < 0.5 ? '#2c2520' : '#29231e'));
    if (TW < 20) return;
    if (inR) {
      for (let i = 0; i < 7; i++) { const [X, Y] = P(hsh(x, y, 10 + i), hsh(x, y, 20 + i)); g.fillStyle = hsh(x, y, 30 + i) < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,240,220,.08)'; g.fillRect(X - TW * 0.03, Y - TW * 0.015, TW * 0.06, TW * 0.03); }
      if (hsh(x, y, 4) < 0.12) { const [X, Y] = P(0.3 + 0.4 * hsh(x, y, 5), 0.3 + 0.4 * hsh(x, y, 6)); g.fillStyle = '#8a8e96'; g.beginPath(); g.arc(X, Y, Math.max(1.5, TW * 0.035), 0, 7); g.fill(); g.fillStyle = '#4a4e56'; g.beginPath(); g.arc(X, Y, Math.max(0.8, TW * 0.015), 0, 7); g.fill(); }
      if (hsh(x, y, 7) < 0.1) { const [X, Y] = P(0.2 + 0.6 * hsh(x, y, 8), 0.2 + 0.6 * hsh(x, y, 9)); g.fillStyle = 'rgba(10,8,12,.35)'; g.beginPath(); g.ellipse(X, Y, TW * (0.2 + 0.25 * hsh(x, y, 2)), TW * 0.1, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(110,120,160,.12)'; g.beginPath(); g.ellipse(X - TW * 0.05, Y - TW * 0.02, TW * 0.08, TW * 0.03, 0, 0, 7); g.fill(); }
    } else for (let i = 0; i < 5; i++) { const [X, Y] = P(hsh(x, y, 10 + i), hsh(x, y, 20 + i)); g.fillStyle = ['#5a4a3a', '#3a3e46', '#6a3a2a'][i % 3]; g.fillRect(X - TW * 0.04, Y - TW * 0.02, TW * 0.08, TW * 0.04); }
  }
  // a terra, una volta sola: il cerchio di vernice consumata e i segni delle gomme
  function groundJunk(K) {
    const { S, g, TW } = K, R = ARR - 0.55, N = 96, pt = (a, r) => S(ARX + Math.cos(a) * r, ARY + Math.sin(a) * r, 0);
    g.fillStyle = 'rgba(235,205,120,.3)';
    for (let i = 0; i < N; i += 2) { if (hsh(i, 7, 95) < 0.25) continue; const a0 = i / N * 6.2832, a1 = (i + 1.2) / N * 6.2832, w = 0.07; g.beginPath(); [pt(a0, R - w), pt(a1, R - w), pt(a1, R + w), pt(a0, R + w)].forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(15,12,10,.22)'; g.lineWidth = Math.max(2, TW * 0.14); g.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const r0 = 2 + 6 * hsh(k, 1, 96), a0 = hsh(k, 2, 97) * 6.28, cx = ARX + (hsh(k, 3, 98) - 0.5) * 6, cy = ARY + (hsh(k, 4, 99) - 0.5) * 6;
      for (const off of [-0.35, 0.35]) { g.beginPath(); for (let i = 0; i <= 16; i++) { const a = a0 + i / 16 * 2.2, [X, Y] = S(cx + Math.cos(a) * (r0 + off), cy + Math.sin(a) * (r0 + off), 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); } }
    g.lineCap = 'butt';
  }
  const JKIND = [1, 1, 2, 2, 3, 3, 5, 5, 8, 8, 8, 4, 6, 7, 7];   // bidoni, casse, portiere, tubi, lamiere x3, frigo, tv, auto x2 (niente copertoni)
  const JCOL = ['#6e4630', '#7a5236', '#5a5e66', '#4a4e56', '#3a5a7a', '#7a2e2a', '#5a6a3a', '#a89060', '#8a3a2a'];
  const WRK = [];
  function wreckBody(i) {
    if (WRK[i]) return WRK[i];
    const src = [MODELS[0], MODELS[1], DUMMY, MODELS[2]][i % 4], d = cleanD({ b: src.b.filter((q, k) => q[2] === 'cabina' || hsh(k, i, 90) > 0.3) });
    const b = makeBody(d, 0, 0, hsh(i, 1, 91) * 6.28, 2); b.wa = hsh(i, 2, 92) * 3; for (const q of b.bl) { q.hp = q.mx * (0.36 + 0.3 * hsh(q.gx, q.gy, 93 + i)); q.fl = -99; }
    if (i === 2) b.ro = Math.PI;   // a pancia in su
    return (WRK[i] = b);
  }
  // una casella di cumulo (disegnata nell'immagine pronta della mappa; il motore la ridisegna davanti ai robot che le passano dietro)
  function junkDraw(K, t, x, y, o) {
    if (t !== 'junk') return; const { S, poly, bx, cyl, glow, g, TW } = K, sh = cqShade;
    const z00 = jH(x, y), z10 = jH(x + 1, y), z11 = jH(x + 1, y + 1), z01 = jH(x, y + 1), zm = (z00 + z10 + z11 + z01) / 4;
    if (zm > 0.02) {
      const fd = clamp(1 - (Math.hypot(x + 0.5 - ARX, y + 0.5 - ARY) - ARR - 8) / 10, 0.1, 1), base = sh((x + y) % 2 ? '#3b3129' : '#382e27', fd), hz = (u, v) => z00 * (1 - u) * (1 - v) + z10 * u * (1 - v) + z11 * u * v + z01 * (1 - u) * v;
      poly([S(x, y + 1, z01), S(x + 1, y + 1, z11), S(x + 1, y + 1, 0), S(x, y + 1, 0)], sh(base, 0.62));
      poly([S(x + 1, y, z10), S(x + 1, y + 1, z11), S(x + 1, y + 1, 0), S(x + 1, y, 0)], sh(base, 0.46));
      poly([S(x, y, z00), S(x + 1, y, z10), S(x + 1, y + 1, z11), S(x, y + 1, z01)], sh(base, clamp(0.95 + (z00 - z11) * 0.45 + (z01 - z10) * 0.15, 0.55, 1.45)));
      for (let i = 0; i < 6; i++) { const u = 0.1 + 0.8 * hsh(x, y, 40 + i), v = 0.1 + 0.8 * hsh(x, y, 50 + i), c = sh(JCOL[Math.floor(hsh(x, y, 60 + i) * JCOL.length)], 0.7 * fd), w = 0.06 + 0.1 * hsh(x, y, 70 + i), z = hz(u, v);
        poly([S(x + u - w, y + v, z + 0.02), S(x + u, y + v - w * 0.6, z + 0.05), S(x + u + w, y + v, z + 0.02), S(x + u, y + v + w * 0.6, z)], c); }
      const cu = x + 0.5, cv = y + 0.5;
      if (!o.lamp && !o.fire && o.wreck == null && fd > 0.55 && hsh(x, y, 80) < 0.62) {
        const kind = JKIND[Math.floor(hsh(x, y, 81) * JKIND.length)], zz = zm - 0.05, c = JCOL[Math.floor(hsh(x, y, 82) * JCOL.length)];
        if (kind === 0) { cyl(cu, cv, 0.3, zz, zz + 0.14, '#1c1c20'); cyl(cu, cv, 0.3, zz + 0.14, zz + 0.28, '#232328'); const [Xh, Yh] = S(cu, cv, zz + 0.28); g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(Xh, Yh, 0.13 * TW * 0.707, 0.13 * TW * 0.35, 0, 0, 7); g.fill(); }   // gomme
        else if (kind === 1) { cyl(cu, cv, 0.24, zz, zz + 0.62, c); cyl(cu, cv, 0.25, zz + 0.2, zz + 0.25, sh(c, 0.7)); cyl(cu, cv, 0.25, zz + 0.45, zz + 0.5, sh(c, 0.7)); }   // bidone
        else if (kind === 2) { const w = 0.3 + 0.1 * hsh(x, y, 83); bx(cu - w, cv - w, cu + w, cv + w, zz, zz + 0.45, '#7a6040'); bx(cu - w, cv - 0.04, cu + w, cv + 0.04, zz + 0.45, zz + 0.47, '#5a4630'); }   // cassa
        else if (kind === 3) { poly([S(cu - 0.45, cv - 0.1, zz), S(cu + 0.4, cv - 0.3, zz + 0.05), S(cu + 0.35, cv - 0.25, zz + 0.65), S(cu - 0.4, cv - 0.05, zz + 0.55)], c); poly([S(cu - 0.3, cv - 0.11, zz + 0.32), S(cu + 0.15, cv - 0.22, zz + 0.37), S(cu + 0.13, cv - 0.2, zz + 0.52), S(cu - 0.29, cv - 0.09, zz + 0.47)], '#20262e'); }   // portiera
        else if (kind === 4) { bx(cu - 0.25, cv - 0.22, cu + 0.25, cv + 0.22, zz, zz + 0.85, '#a8a498'); bx(cu - 0.26, cv - 0.23, cu + 0.26, cv + 0.23, zz + 0.55, zz + 0.57, '#7a766c'); }   // frigorifero
        else if (kind === 8) { const cc = sh(['#7a7e86', '#8a5a3a', '#5a6a7a'][Math.floor(hsh(x, y, 85) * 3)], 0.85), tl = 0.25 + 0.3 * hsh(x, y, 86); poly([S(cu - 0.45, cv - 0.3, zz + 0.05), S(cu + 0.45, cv - 0.35, zz + 0.05 + tl), S(cu + 0.45, cv + 0.25, zz + 0.1 + tl), S(cu - 0.45, cv + 0.3, zz + 0.1)], cc); for (const k of [-0.25, 0, 0.25]) K.line(S(cu + k, cv - 0.32, zz + 0.07 + tl * (k + 0.45) / 0.9), S(cu + k, cv + 0.28, zz + 0.12 + tl * (k + 0.45) / 0.9), sh(cc, 0.7), Math.max(1, TW / 40)); }   // lamiera ondulata
        else if (kind === 7) { const cc = ['#8a4a2e', '#4a5a6a', '#6a6a3a', '#7a3a3a'][Math.floor(hsh(x, y, 84) * 4)]; bx(cu - 0.48, cv - 0.27, cu + 0.48, cv + 0.27, zz, zz + 0.3, cc); bx(cu - 0.22, cv - 0.24, cu + 0.2, cv + 0.24, zz + 0.3, zz + 0.52, sh(cc, 0.9)); bx(cu - 0.2, cv + 0.24, cu + 0.18, cv + 0.25, zz + 0.33, zz + 0.49, '#151a20'); bx(cu + 0.2, cv - 0.22, cu + 0.21, cv + 0.22, zz + 0.33, zz + 0.49, '#151a20'); for (const u of [-0.3, 0.3]) cyl(cu + u, cv + 0.27, 0.11, zz, zz + 0.04, '#141416'); }   // vecchia auto
        else if (kind === 5) { K.line(S(cu - 0.5, cv + 0.2, zz + 0.15), S(cu + 0.5, cv - 0.3, zz + 0.4), '#5a5e66', Math.max(3, TW * 0.14)); K.line(S(cu - 0.5, cv + 0.2, zz + 0.17), S(cu + 0.5, cv - 0.3, zz + 0.42), '#7a7e88', Math.max(1, TW * 0.05)); }   // tubo
        else { bx(cu - 0.35, cv - 0.3, cu + 0.35, cv + 0.3, zz, zz + 0.4, '#3a3e48'); bx(cu - 0.28, cv + 0.3, cu + 0.2, cv + 0.31, zz + 0.08, zz + 0.33, '#4a6a5a'); }   // televisore
      }
    }
    if (o.lamp) { const lx = o.lx, ly = o.ly, z0 = jH(lx, ly); bx(lx - 0.05, ly - 0.05, lx + 0.05, ly + 0.05, z0, z0 + 3.1, '#3a3e48'); bx(lx - 0.22, ly - 0.12, lx + 0.22, ly + 0.12, z0 + 3.0, z0 + 3.2, '#2a2c30'); bx(lx - 0.18, ly - 0.08, lx + 0.18, ly + 0.08, z0 + 2.92, z0 + 3.0, o.lamp); glow(lx, ly, z0 + 2.9, 2.6, o.lamp === '#ffd890' ? 'rgba(255,214,140,.32)' : 'rgba(150,200,255,.28)'); }
    if (o.fire) { const fx = o.fx, fy = o.fy, z0 = jH(fx, fy); cyl(fx, fy, 0.28, z0, z0 + 0.7, '#5a3a26'); cyl(fx, fy, 0.29, z0 + 0.22, z0 + 0.27, '#3a2618'); cyl(fx, fy, 0.29, z0 + 0.48, z0 + 0.53, '#3a2618'); const [Xh, Yh] = S(fx, fy, z0 + 0.7); g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(Xh, Yh, 0.22 * TW * 0.707, 0.22 * TW * 0.35, 0, 0, 7); g.fill(); glow(fx, fy, z0 + 0.9, 2.2, 'rgba(255,140,50,.35)'); }
    if (o.wreck != null) { const b = wreckBody(o.wreck), [X, Y] = S(o.wx, o.wy, jH(o.wx, o.wy) * 0.85); try { drawBody(g, X, Y, TW, b, { T: 0, noPilot: 1 }); } catch (e) { void e; } }
  }
  function drawWall() {}   // (niente muri: intorno ci sono i cumuli)
  let SKY = null;
  function skyDraw(g, CXc, CYc, tx, ty, TW) {
    const w = cq.w / (cq.vz || 1), h = cq.h / (cq.vz || 1);
    if (!SKY || SKY.w !== w || SKY.h !== h) { const cv = document.createElement('canvas'), d = Math.min(2, cq.dpr); cv.width = Math.round(w * d); cv.height = Math.round(h * d); const c = cv.getContext('2d'); c.scale(d, d); const gr = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.8); gr.addColorStop(0, '#120f0d'); gr.addColorStop(1, '#080706'); c.fillStyle = gr; c.fillRect(0, 0, w, h); SKY = { cv, w, h }; }
    g.drawImage(SKY.cv, 0, 0, w, h);
    if (tx == null) return;
    const Uz = TW * 0.575, S = (x, y, z = 0) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * Uz];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const box = (x0, y0, x1, y1, z0, z1, col) => { poly([S(x0, y1, z1), S(x1, y1, z1), S(x1, y1, z0), S(x0, y1, z0)], cqShade(col, 0.74)); poly([S(x1, y1, z1), S(x1, y0, z1), S(x1, y0, z0), S(x1, y1, z0)], cqShade(col, 0.55)); poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], cqShade(col, 1.06)); };
    poly([S(-12, -12), S(W + 12, -12), S(W + 12, H + 12), S(-12, H + 12)], '#0d0a08');
  }

  // ======================= IL PROGETTO (griglia 7x7, cabina al centro) =======================
  // progetto: { b: [[gx, gy, tipo, dir]] } (dir 0 avanti, 1 destra, 2 dietro, 3 sinistra; avanti = in alto nella griglia).
  // In una casella: un blocco e/o un'arma (l'arma sta sopra un telaio o una corazza, oppure da sola).
  const D0 = () => ({ b: [[GC, GC, 'cabina', 0]] });
  const key = (x, y) => x + ',' + y;
  function cleanD(d) {
    const out = { b: [[GC, GC, 'cabina', 0]] }, base = new Map([[key(GC, GC), 'cabina']]), top = new Set();
    if (d && Array.isArray(d.b)) {
      const L = d.b.filter(q => Array.isArray(q) && PZ[q[2]] && q[2] !== 'cabina' && q[0] >= 0 && q[0] < GN && q[1] >= 0 && q[1] < GN).sort((a, b) => (isPlate(a[2]) ? 2 : isTop(a[2]) ? 1 : 0) - (isPlate(b[2]) ? 2 : isTop(b[2]) ? 1 : 0));
      const pl = new Set();
      for (const [x, y, t, r] of L) { const k = key(x, y);
        if (isPlate(t)) { const dd = (r | 0) % 4, [gx2, gy2] = GDIR[dd]; if (!base.has(k) || base.has(key(x + gx2, y + gy2)) || pl.has(k + dd)) continue; pl.add(k + dd); out.b.push([x | 0, y | 0, t, dd]); continue; }
        if (!isTop(t)) { if (base.has(k)) continue; base.set(k, t); out.b.push([x | 0, y | 0, t, (r | 0) % 4]); }
        else { if (top.has(k)) continue; const bt = base.get(k); if (bt && !BH[bt]) continue; top.add(k); out.b.push([x | 0, y | 0, t, (r | 0) % 4]); } }
    }
    return out;
  }
  const myD = () => cleanD(store.settings.robo2);
  const saveD = d => { store.settings.robo2 = d; saveStore(); };
  const wOf = d => d.b.reduce((s, q) => s + PZ[q[2]].w, 0);
  // quali pezzi sono collegati alla cabina (caselle vicine, sui 4 lati)
  function linked(list) {
    const cells = new Map(); list.forEach((q, i) => { const k = key(q[0], q[1]); (cells.get(k) || cells.set(k, []).get(k)).push(i); });
    const ok = new Set(), seen = new Set(), c = list.findIndex(q => q[2] === 'cabina'); if (c < 0) return ok;
    const st = [[list[c][0], list[c][1]]]; seen.add(key(list[c][0], list[c][1]));
    while (st.length) { const [x, y] = st.pop(); for (const i of cells.get(key(x, y))) ok.add(i); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(x + dx, y + dy); if (cells.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); } } }
    return ok;
  }
  // numeri del progetto per l'officina: peso, velocita' massima, spinta, agilita'
  function statsOf(d) {
    const L = linked(d.b), bl = d.b.filter((q, i) => L.has(i)), M = bl.reduce((s, q) => s + PZ[q[2]].w, 0);
    let P = 0, Pv = 0, nW = 0, sp = 0; for (const q of bl) { const p = PZ[q[2]]; if (!p.drive) continue; P += p.drive; Pv += p.drive / p.vmax; nW++; sp = Math.max(sp, Math.abs(q[0] - GC)); }
    const v = nW ? P / (Pv + 0.12 * M) * 0.75 : 0, grip = bl.reduce((s, q) => s + (PZ[q[2]].mu || 0), 0);
    return { M, v, push: M * (0.4 + 0.6 * Math.min(1, grip / 4)), agi: nW ? Math.min(1, (sp * 0.45 + 0.1) * P / Math.max(1, M) / 4) : 0, nW, loose: d.b.length - bl.length, wpn: WPN.filter(t => bl.some(q => q[2] === t)) };
  }

  // ======================= LA FISICA =======================
  // un corpo: { x, y (baricentro), z (altezza da terra), a, vx, vy, vz, w, ro (rotolamento: pi = a pancia in su), rr, bl: [blocchi], M, I, team, ko, debris }
  // blocco: { gx, gy, t, d, hp, mx, lu, lv, fl, over (arma sopra un blocco), cov (blocco con un'arma sopra), on (tipo del blocco sotto) }
  function makeBody(d, x, y, a, team) {
    const L = linked(d.b), bl = d.b.map((q, i) => [q, i]).filter(([, i]) => L.has(i)).map(([[gx, gy, t, r], i]) => ({ i, gx, gy, t, d: r, hp: PZ[t].hp, mx: PZ[t].hp, fl: -9, burn: 0, am: PZ[t].am }));
    const b = { x, y, z: 0, a, vx: 0, vy: 0, vz: 0, w: 0, ro: 0, rr: 0, bl, team, cu: 0, cv: 0, heat: 0, fuel: 3, cd: {}, act: {}, wa: 0, ko: 0, flip: 0, inp: { thr: 0, steer: 0 } };
    mass(b, true); return b;
  }
  const gu = q => (GC - q.gy) * B + (isPlate(q.t) ? PDIR[q.d][0] * POFF : 0), gv = q => (q.gx - GC) * B + (isPlate(q.t) ? PDIR[q.d][1] * POFF : 0);   // posizione nella griglia: u avanti, v a destra
  function mass(b, first) {
    let M = 0, su = 0, sv = 0; const cells = new Map();
    for (const q of b.bl) { const m = PZ[q.t].w; M += m; su += gu(q) * m; sv += gv(q) * m; const k = key(q.gx, q.gy); (cells.get(k) || cells.set(k, []).get(k)).push(q); }
    for (const L of cells.values()) { const bs = L.find(q => isBase(q.t)), tp = L.find(q => isTop(q.t)); for (const q of L) { q.over = !!(tp && bs && q === tp); q.cov = !!(tp && bs && q === bs); q.on = q.over ? bs.t : null; q.r = isPlate(q.t) ? PR : RB; } }
    if (!M) { b.M = 1; b.I = 1; b.R = 0.4; return; }
    const cu = su / M, cv = sv / M;
    if (!first) { const du = cu - b.cu, dv = cv - b.cv, c = Math.cos(b.a), s = Math.sin(b.a); b.x += c * du - s * dv; b.y += s * du + c * dv; }
    b.cu = cu; b.cv = cv; let I = 0;
    for (const q of b.bl) { const m = PZ[q.t].w; q.lu = gu(q) - cu; q.lv = gv(q) - cv; I += m * (q.lu * q.lu + q.lv * q.lv + B * B / 6); }
    b.M = M; b.I = Math.max(0.2, I); b.R = Math.max(0.4, ...b.bl.map(q => Math.hypot(q.lu, q.lv) + RB));
  }
  const wpos = (b, q) => { const c = Math.cos(b.a), s = Math.sin(b.a); return [b.x + c * q.lu - s * q.lv, b.y + s * q.lu + c * q.lv]; };
  const hitable = q => !q.cov;   // un blocco con un'arma sopra: si colpisce prima l'arma
  const upright = b => Math.cos(b.ro || 0) > 0;
  const grounded = b => (b.z || 0) < 0.04;
  function impulse(b, jx, jy, rx, ry) { b.vx += jx / b.M; b.vy += jy / b.M; b.w += (rx * jy - ry * jx) / b.I; }
  // un pezzo si rompe: resta a terra come rottame; quello che resta attaccato solo a lui (e l'arma che c'era sopra) cade a terra
  function breakBlock(G, b, q) {
    const [x, y] = wpos(b, q); ev(G, 'brk', x, y, q.t, b.team);
    b.bl = b.bl.filter(o => o !== q);
    if (q.t === 'cabina') { for (const o of b.bl.slice()) detach(G, b, o, 3.5); b.bl = []; koBody(G, b, 'boom', x, y); return; }
    q.hp = 0.5; detach(G, b, q, 2.2);
    if (isBase(q.t)) for (const tp of b.bl.filter(o => (o.over || isPlate(o.t)) && o.gx === q.gx && o.gy === q.gy)) { b.bl = b.bl.filter(o => o !== tp); detach(G, b, tp, 2.6); }
    if (!b.bl.length) return;
    const L = linked(b.bl.map(o => [o.gx, o.gy, o.t, o.d]));
    const lose = b.bl.filter((o, i) => !L.has(i)); for (const o of lose) detach(G, b, o, 1.2);
    b.bl = b.bl.filter((o, i) => L.has(i)); mass(b, false);
  }
  function detach(G, b, q, kick) {
    const [x, y] = wpos(b, q), rx = x - b.x, ry = y - b.y, l = Math.hypot(rx, ry) || 1;
    const vx = b.vx - b.w * ry + rx / l * kick * (0.5 + Math.random()), vy = b.vy + b.w * rx + ry / l * kick * (0.5 + Math.random());
    const o = { x, y, a: b.a + q.d * Math.PI / 2, vx, vy, w: (Math.random() - 0.5) * 9, bl: [{ gx: GC, gy: GC, t: q.t, d: 0, hp: Math.max(0.5, q.hp), mx: q.mx, fl: -9, burn: 0, lu: 0, lv: 0 }], team: b.team, debris: 1, z: (b.z || 0) + 0.4 + (q.over ? 0.4 : 0), vz: 2 + Math.random() * 2, ro: 0, rr: 0, cd: {}, act: {} };
    o.M = PZ[q.t].w; o.I = o.M * B * B / 6 + 0.05; o.R = RB; o.cu = 0; o.cv = 0; o.bl[0].r = isPlate(q.t) ? PR : RB;
    G.rbs.push(o); const deb = G.rbs.filter(x2 => x2.debris); if (deb.length > 34) G.rbs = G.rbs.filter(x2 => x2 !== deb[0]);
  }
  const rem = b => b.ko ? 0 : Math.min(1, b.bl.reduce((a, q) => a + Math.max(0, q.hp), 0) / (b.hp0 || 1));
  function startMatch(G, opp) { pubRobot().catch(() => {}); resetWorld(G); G.mt = { id: Math.random(), r: 0, w: [0, 0], opp: opp || null }; U.mode = 'drive'; shopUI(G, false); nextRound(G); driveUI(G, true); hum(0, false, false); }
  function nextRound(G) {
    const m = G.mt; m.r++; m.ph = 'intro'; m.t0 = G.time; m.sd = 0; m.left = RT; m.res = null;
    G.rbs = []; G.proj = []; G.hams = []; G.mines = []; G.flr = []; G.rq = []; G.cT = {}; G.rl = 1; G.rlT = 1; G.sawOn = 0; G.sawZ = 0; G.flp = null;
    const dz = m.dz ? m.dz.map(s => cleanD(JSON.parse(s))) : null, me = makeBody(dz ? dz[0] : myD(), ARX - 6.5, ARY, 0, 0); me.uid = 'me'; G.mine = me;
    const op = makeBody(dz ? dz[1] : m.opp ? cleanD(m.opp.d) : DUMMY, ARX + 6.5, ARY, Math.PI, 1); op.uid = 'dm' + (G.dmN = (G.dmN || 0) + 1); op.dummy = m.live ? 0 : 1; G.dummy = op;
    op.look = m.live ? (m.fc ? cqLookOf(m.fc) : null) : m.opp ? m.opp.look : null; G.rin = null;
    G.rbs.push(me, op); for (const b of G.rbs) b.hp0 = b.bl.reduce((a, q) => a + q.mx, 0);
    cq.x = me.x; cq.y = me.y; U.parts.length = 0; U.fx.length = 0; U.hold = {}; U.tap = null;
  }
  const friend = G => G.chars.find(c => c !== G.me && c.sid && (G.guest || c.remote));
  const oppName = G => { const m = G.mt, MT = G.mine ? G.mine.team : 0; return m && m.live && m.nm ? m.nm[1 - MT] : m && m.opp ? 'Robot di ' + m.opp.n : 'Manichino'; };
  function resetWorld(G) { G.mines = []; G.flr = []; G.rq = []; G.rbs = []; G.proj = []; G.hams = []; G.mine = null; G.dummy = null; G.pv = 0; G.gdeb = null; G.rl = 1; G.rlT = 1; G.sawOn = 0; G.sawZ = 0; G.flp = null; G.rin = null; }
  function endMatch(G) { const m = G.mt; if (m && m.live) { if (G.guest) cqNetSend({ k: 'bye' }); G.lv = { h: 0, g: null }; U.rdy = 0; } resetWorld(G); G.mt = null; }

  // ======================= DAL VIVO (1 contro 1 con un amico del set) =======================
  // L'HOST e' l'arbitro: fa la fisica di tutti e due i robot e decide colpi e danni; manda lo stato (snap) ogni 120 ms.
  // L'AMICO manda solo i comandi (dito, armi a tenere, colpi, testacoda) e intanto muove SUBITO il suo robot (previsione, G.pv):
  // a ogni stato dell'host lo riporta piano verso dove l'host dice che e' (piu' la sua velocita' per il ritardo). L'avversario lo
  // disegna dall'ultimo stato + velocita' per il tempo passato. Pronti: G.lv sull'host { h: io pronto, g: progetto dell'amico pronto }.
  const r2 = v => Math.round(v * 100) / 100;
  const meRdy = G => G.guest ? !!U.rdy : !!(G.lv && G.lv.h), otherRdy = G => G.guest ? !!(G.lr && G.lr[0]) : !!(G.lv && G.lv.g);
  function liveReady(G, on) {
    const f = friend(G); if (!f) return;
    if (G.guest) { U.rdy = on ? 1 : 0; U.rdyAck = 0; cqNetSend({ k: 'rdy', d: on ? JSON.stringify(myD()) : 0 }); }
    else { const lv = G.lv || (G.lv = { h: 0, g: null }); lv.h = on ? 1 : 0; cqNetNow(); }
    SFX.rot();
  }
  function liveHost(G) {
    const f = friend(G), lv = G.lv || (G.lv = { h: 0, g: null });
    if (G.mt && G.mt.live && !f) { endMatch(G); U.msg = { t: G.time, s: '👋 L\'amico è uscito' }; goDrive(G); return; }
    if (lv.h && lv.g && f && !(G.mt && G.mt.live && G.mt.ph !== 'over')) startLive(G, f);
  }
  function startLive(G, f) {
    const lv = G.lv; resetWorld(G);
    G.mt = { id: Math.random(), r: 0, w: [0, 0], live: 1, fc: f, nm: [(store.settings.myName || 'Tu').trim().slice(0, 14) || 'Tu', String(f.name || 'Amico').slice(0, 14)], dz: [JSON.stringify(myD()), lv.g] };
    G.lv = { h: 0, g: null }; U.mode = 'drive'; shopUI(G, false); nextRound(G); driveUI(G, true); hum(0, false, false); cqNetNow();
  }
  // l'amico sull'host: i suoi comandi arrivati dalla rete (se non arriva niente da 0,8 s si ferma)
  function remoteInput(G, b) {
    const R = G.rin, inp = b.inp; if (!R || performance.now() - R.at > 800 || G.mt.ph !== 'fight') { inp.thr = 0; inp.steer = 0; inp.sega = inp.fiamma = false; return; }
    steerTo(b, R.d ? { wx: R.d[0], wy: R.d[1] } : null, inp); inp.sega = !!(R.h & 1); inp.fiamma = !!(R.h & 2);
  }
  function liveEv(G, c, o) {
    const f = friend(G); if (!o || !f || c !== f) return; const lv = G.lv || (G.lv = { h: 0, g: null });
    if (o.k === 'rdy') { const was = !!lv.g; lv.g = typeof o.d === 'string' && o.d.length < 4000 ? o.d : null; if (lv.g && !was && !lv.h) { cqToast('⚔️ <b>' + esc(f.name) + '</b> ti sfida dal vivo! Sul banco di prova tocca <b>Accetta</b>.'); SFX.go(); } cqNetNow(); return; }
    if (o.k === 'no') { if (lv.h) { lv.h = 0; cqToast('🙅 ' + esc(f.name) + ' per ora non accetta la sfida.'); } return; }
    if (o.k === 'bye') { if (G.mt && G.mt.live) { endMatch(G); U.msg = { t: G.time, s: '👋 ' + f.name + ' è uscito dalla sfida' }; goDrive(G); } return; }
    const m = G.mt, b = G.dummy; if (!m || !m.live || m.ph !== 'fight' || !b) return;
    if (o.k === 'in') G.rin = { d: Array.isArray(o.d) ? [+o.d[0] || 0, +o.d[1] || 0] : null, h: o.h | 0, at: performance.now() };
    else if (o.k === 'tp' && Array.isArray(o.w)) { for (const k of o.w) if (['martello', 'cannone', 'pala', 'nos', 'taser', 'mina', 'razzo', 'dischi', 'flare'].includes(k)) b.inp[k] = true; }
    else if (o.k === 'tn' && !b.ko && !b.flip) { b.turn = { to: angN(b.a + Math.PI), t: G.time }; b.rev = false; }
  }
  // stato di un robot: posizione, velocita', altezza, salute di ogni blocco (i:salute, b = brucia, s = colpo del martello/pala)
  function packB(G, b) {
    const bl = b.bl.map(q => q.i + ':' + r2(q.hp) + (q.burn > G.time ? 'b' : '') + (q.sw != null && G.time - q.sw < 0.7 ? 's' + r2(q.sw) : '') + (q.am != null ? 'a' + q.am : '')).join(',');
    return [b.team, r2(b.x), r2(b.y), Math.round(b.a * 1000) / 1000, r2(b.vx), r2(b.vy), r2(b.w), r2(b.z || 0), r2(b.vz || 0), r2(b.ro || 0), r2(b.rr || 0), b.flip ? r2(b.flip) : 0, b.ko || 0, b.fall ? r2(b.fall) : 0, r2(b.heat || 0),
      (b.act.sega ? 1 : 0) | (b.act.fiamma ? 2 : 0) | (b.hot ? 4 : 0) | (b.fout ? 8 : 0) | (b.nosUsed ? 16 : 0), r2(b.nosT || 0), r2(b.fuel), bl, b.cd, r2(b.stun || 0)];
  }
  function liveSnap(G) {
    const x = {}, lv = G.lv; if (lv) x.lr = [lv.h ? 1 : 0, lv.g ? 1 : 0];
    const m = G.mt; if (!m || !m.live || !G.mine || !G.dummy) return x;
    x.mt = { id: m.id, r: m.r, w: m.w, ph: m.ph, t0: r2(m.t0), left: r2(m.left || 0), sd: m.sd, res: m.res, live: 1, nm: m.nm }; if (m.ph === 'intro' || G.time % 2 < 0.15) x.mt.dz = m.dz;
    x.rb = [G.mine, G.dummy].map(b => packB(G, b)); x.rl = r2(G.rl); x.sz = r2(G.sawZ || 0); x.fp = G.flp ? [G.flp.st, r2(G.flp.t)] : 0;
    x.pj = G.proj.map(q => [r2(q.x), r2(q.y), r2(q.z), r2(q.dx), r2(q.dy), r2(q.t), q.k || 0, r2(q.v || 0), r2(q.sl || 0)]); x.fr = (G.flr || []).map(f => [r2(f.x), r2(f.y), r2(f.z), r2(f.t), f.team]); x.mn = (G.mines || []).map(m => [r2(m.x), r2(m.y), m.team, r2(m.t)]);
    x.db = G.rbs.filter(b => b.debris).slice(-24).map(b => [b.bl[0].t, r2(b.x), r2(b.y), r2(b.a), r2(b.z || 0), b.fall ? r2(b.fall) : 0]);
    const n = G.evN || 0; x.ev = G.evs.filter(e => e.sq > n - 30 && e.tm > G.time - 0.6).map(e => [e.sq, e[0], r2(e[1]), r2(e[2]), typeof e[3] === 'number' ? r2(e[3]) : e[3], e[4]]);
    return x;
  }
  // amico: i due robot nuovi a ogni round (io = squadra 1, a destra)
  function buildGuest(G, dz) {
    const d = dz.map(s => cleanD(JSON.parse(s))), me = makeBody(d[1], ARX + 6.5, ARY, Math.PI, 1), op = makeBody(d[0], ARX - 6.5, ARY, 0, 0);
    me.uid = 'me'; op.uid = 'lv' + (G.dmN = (G.dmN || 0) + 1); for (const b of [me, op]) b.hp0 = b.bl.reduce((a, q) => a + q.mx, 0);
    const hc = friend(G); op.look = hc ? cqLookOf(hc) : null;
    G.rbs = [me, op]; G.mine = me; G.dummy = op; G.pv = 1; G.proj = []; G.hams = []; G.gdeb = []; G.gdebC = {};
    U.mode = 'drive'; shopUI(G, false); driveUI(G, true); U.parts.length = 0; U.fx.length = 0; U.hold = {}; U.tap = null; hum(0, false, false);
  }
  function unpackB(G, b, s, mine) {
    const [, x, y, a, vx, vy, w, z, vz, ro, rr, flip, ko, fall, heat, fl, nosT, fuel, bls, cd, stun] = s, H = new Map();
    for (const tk of bls ? String(bls).split(',') : []) { const mm = /^(\d+):(-?[\d.]+)(b?)(?:s(-?[\d.]+))?(?:a(\d+))?$/.exec(tk); if (mm) H.set(+mm[1], [+mm[2], !!mm[3], mm[4] != null ? +mm[4] : null, mm[5] != null ? +mm[5] : null]); }
    const keep = b.bl.filter(q => H.has(q.i)); if (keep.length !== b.bl.length) { b.bl = keep; if (keep.length) mass(b, false); }
    for (const q of b.bl) { const [hp, bn, sw, am] = H.get(q.i); if (hp < q.hp - 0.05) q.fl = G.time; q.hp = hp; q.burn = bn ? G.time + 0.3 : 0; if (sw != null) q.sw = sw; if (am != null) q.am = am; }
    Object.assign(b, { z, vz, ro, rr, flip, ko, fall, heat, nosT, fuel, stun: stun || 0, cd: cd || {}, hot: fl & 4 ? 1 : 0, fout: fl & 8 ? 1 : 0, nosUsed: fl & 16 ? 1 : 0 }); b.act.sega = !!(fl & 1); b.act.fiamma = !!(fl & 2);
    b.ns = { x, y, a, vx, vy, w, at: performance.now() };
    if (mine) { const L = 0.1, tx = x + vx * L, ty = y + vy * L, ta = a + w * L, ex = tx - b.x, ey = ty - b.y;
      if (ko || fall || Math.hypot(ex, ey) > 2) { b.x = tx; b.y = ty; b.a = ta; b.vx = vx; b.vy = vy; b.w = w; }
      else { b.x += ex * 0.3; b.y += ey * 0.3; b.a = angN(b.a + angD(ta, b.a) * 0.3); b.vx += (vx - b.vx) * 0.5; b.vy += (vy - b.vy) * 0.5; b.w += (w - b.w) * 0.5; } }
  }
  function leaveLiveGuest(G, msg) { resetWorld(G); G.mt = null; U.rdy = 0; U.msg = { t: G.time, s: msg }; goDrive(G); }
  function liveApply(G, x) {
    if (!G.guest || !x) return;
    G.lr = x.lr || [0, 0];
    if (U.rdy && G.lr[1]) U.rdyAck = 1; else if (U.rdy && U.rdyAck && !G.lr[1] && !x.mt) { U.rdy = 0; U.rdyAck = 0; cqToast('🙅 Per ora l\'amico non accetta la sfida.'); }
    if (G.lr[0] && !U.invSeen && !x.mt) { U.invSeen = 1; const f = friend(G); if (U.mode !== 'drive' && f) cqToast('⚔️ <b>' + esc(f.name) + '</b> ti sfida dal vivo! Sul banco di prova tocca <b>Accetta</b>.'); } else if (!G.lr[0]) U.invSeen = 0;
    const L = x.mt; if (!L) { if (G.mt && G.mt.live) leaveLiveGuest(G, '👋 Sfida finita'); return; }
    const fresh = !G.mt || !G.mt.live || G.mt.id !== L.id;
    if (fresh) { G.mt = { live: 1 }; G.evSeen = Math.max(0, ...(x.ev || []).map(e => e[0])); U.rdy = 0; U.rdyAck = 0; }
    const m = G.mt, dz = L.dz || m.dz; Object.assign(m, L); m.dz = dz;
    if ((fresh || m.bR !== L.r) && dz) { m.bR = L.r; buildGuest(G, dz); }
    if (!G.mine || !G.dummy || !x.rb || m.bR !== L.r) return;
    for (const s of x.rb) unpackB(G, s[0] === 1 ? G.mine : G.dummy, s, s[0] === 1);
    G.rl = x.rl; G.sawZ = x.sz; G.flp = x.fp ? { st: x.fp[0], t: x.fp[1] } : null;
    G.proj = (x.pj || []).map(a => ({ x: a[0], y: a[1], z: a[2], dx: a[3], dy: a[4], t: a[5], k: a[6] || undefined, v: a[7] || undefined, sl: a[8] || 0 })); G.flr = (x.fr || []).map(a => ({ x: a[0], y: a[1], z: a[2], t: a[3], team: a[4] })); G.mines = (x.mn || []).map(a => ({ x: a[0], y: a[1], team: a[2], t: a[3] }));
    const C = G.gdebC || (G.gdebC = {}); G.gdeb = (x.db || []).map((a, i) => { const k = i + a[0], o = C[k] || (C[k] = { uid: 'gd' + k, debris: 1, team: 0, R: RB, act: {}, cd: {}, ro: 0, wa: 0, bl: [{ gx: GC, gy: GC, t: a[0], d: 0, hp: 1, mx: 1, fl: -9, burn: 0, lu: 0, lv: 0, r: RB }] }); o.x = a[1]; o.y = a[2]; o.a = a[3]; o.z = a[4]; o.fall = a[5]; return o; });
    for (const e of x.ev || []) if (e[0] > (G.evSeen || 0)) { G.evSeen = e[0]; G.evs.push([e[1], e[2], e[3], e[4], e[5]]); if (G.evs.length > 80) G.evs.shift(); }
  }
  // amico, a ogni immagine: comandi all'host, il mio robot mosso subito, l'avversario dove dovrebbe essere adesso
  function guestLive(G, dt) {
    const m = G.mt, me = G.mine, op = G.dummy; if (!me || !op) return;
    const taps = U.tap ? Object.keys(U.tap).filter(k => U.tap[k]) : [];
    myInput(G);
    if (m.ph === 'fight') {
      const d = !me.ko ? cqDir() : null, sp = !!cq.keys[' '], h = (U.hold.sega || sp ? 1 : 0) | (U.hold.fiamma || sp ? 2 : 0), k = (d ? Math.round(Math.atan2(d.wy, d.wx) * 16) : 'x') + ':' + h, T = now();
      if (k !== U.inK || T - (U.inT || 0) > 0.35) { U.inK = k; U.inT = T; cqNetSend({ k: 'in', d: d ? [r2(d.wx), r2(d.wy)] : 0, h }); }
      if (sp && !U.spK) taps.push('martello', 'cannone', 'pala', 'taser', 'dischi'); U.spK = sp;
      if (taps.length) cqNetSend({ k: 'tp', w: taps });
      if (me.turn && me.turn !== U.tnS) { U.tnS = me.turn; cqNetSend({ k: 'tn' }); }
      physics(G, dt);
    }
    const S = op.ns; if (S) { const age = Math.min(0.3, (performance.now() - S.at) / 1000 + 0.05), k = Math.min(1, dt * 14), tx = S.x + S.vx * age, ty = S.y + S.vy * age, ta = S.a + S.w * age;
      if (Math.hypot(tx - op.x, ty - op.y) > 2) { op.x = tx; op.y = ty; op.a = ta; } else { op.x += (tx - op.x) * k; op.y += (ty - op.y) * k; op.a = angN(op.a + angD(ta, op.a) * k); } op.vx = S.vx; op.vy = S.vy; op.w = S.w; }
    for (const q of G.proj) { q.x += q.dx * (q.v || 11) * dt; q.y += q.dy * (q.v || 11) * dt; if (q.sl) q.z = Math.max(0, q.z + q.sl * (q.v || 11) * dt); }
    for (const b of G.rbs) b.wa = (b.wa || 0) + (Math.cos(b.a) * b.vx + Math.sin(b.a) * b.vy) * dt * 4;
    if (!me.ko) { cq.x = me.x; cq.y = me.y; }
  }

  // ======================= LA BACHECA (rb/<chi> nel database: il robot di ognuno, sfidabile guidato dal computer) =======================
  function pubRobot() {
    const d = myD(), s = JSON.stringify(d), nm = (store.settings.myName || '').trim().slice(0, 14);
    if (!nm || !statsOf(d).nW || U.pubS === s) return Promise.resolve();
    return hubLoad().then(F => { const v = { n: nm, d: s, ts: Date.now() }; try { const lk = JSON.stringify(cqLook()); if (lk.length < 4000) v.lk = lk; } catch (e) { void e; }
      if (store.settings.robo2pub !== s) { v.w = 0; v.l = 0; } return F.update(F.ref(F.db, 'rb/' + nameKey(nm)), v); }).then(() => { U.pubS = s; store.settings.robo2pub = s; saveStore(); });
  }
  function boardResult(k, iWon) { hubLoad().then(F => F.runTransaction(F.ref(F.db, 'rb/' + k + '/' + (iWon ? 'l' : 'w')), v => (v || 0) + 1)).catch(() => {}); }
  const THC = {};
  function thumbOf(d) {
    const k = JSON.stringify(d.b); if (THC[k]) return THC[k];
    const Bc = 300, tmp = document.createElement('canvas'); tmp.width = tmp.height = Bc; const g = tmp.getContext('2d'), b = makeBody(d, 0, 0, -0.75, 1); b.wa = 0.4;
    try { drawBody(g, Bc / 2, Bc * 0.6, 28, b, { T: 0, noPilot: 1 }); } catch (e) { void e; }
    const D = g.getImageData(0, 0, Bc, Bc).data; let x0 = Bc, y0 = Bc, x1 = 0, y1 = 0;
    for (let y = 0; y < Bc; y++) for (let x = 0; x < Bc; x++) if (D[(y * Bc + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cv = document.createElement('canvas'); cv.width = 168; cv.height = 126; const c2 = cv.getContext('2d');
    if (x1 > x0) { const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(168 * 0.92 / w, 126 * 0.92 / h); c2.drawImage(tmp, x0, y0, w, h, (168 - w * sc) / 2, (126 - h * sc) / 2, w * sc, h * sc); }
    return (THC[k] = cv.toDataURL());
  }
  function boardUI(G) {
    const el = document.createElement('div'); el.id = 'r2Bc';
    el.innerHTML = '<div class="hd"><b>🏛️ Bacheca dei robot</b><button type="button" data-k="x">✖</button></div><div class="me">🤖 …</div><div class="ls"><p>⏳ Carico i robot…</p></div>';
    ROOT().appendChild(el); el.addEventListener('pointerdown', e => e.stopPropagation()); el.querySelector('[data-k=x]').onclick = () => el.remove();
    const myK = nameKey(store.settings.myName);
    pubRobot().catch(() => {}).then(() => hubLoad()).then(F => F.get(F.ref(F.db, 'rb'))).then(sn => {
      if (!el.isConnected) return; const all = sn.val() || {}, mine = all[myK];
      el.querySelector('.me').innerHTML = mine ? '🤖 Anche il tuo robot è qui: gli amici lo sfidano quando vogliono. Finora ha vinto <b>' + (mine.w || 0) + '</b> sfide e ne ha perse <b>' + (mine.l || 0) + '</b>.' : '🤖 Il tuo robot finisce qui appena ha le ruote.';
      const L = Object.entries(all).filter(([k, r]) => k !== myK && r && typeof r.d === 'string').sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)).slice(0, 40), ls = el.querySelector('.ls'); ls.innerHTML = '';
      for (const [k, r] of L) { let d; try { d = cleanD(JSON.parse(r.d)); } catch (e) { continue; } const st = statsOf(d); if (!st.nW) continue;
        const it = document.createElement('div'); it.className = 'it';
        it.innerHTML = '<img alt=""><div><b>Robot di ' + esc(r.n) + '</b><small>⚖️ ' + st.M + ' · ' + (st.wpn.map(w => WICO[w]).join(' ') || 'senza armi') + '<br>🏆 ' + (r.w || 0) + ' vinte · 💥 ' + (r.l || 0) + ' perse</small></div><button type="button">⚔️ Sfida</button>';
        it.querySelector('img').src = thumbOf(d); ls.appendChild(it);
        it.querySelector('button').onclick = () => { let look = null; try { look = r.lk ? cqNetLook(JSON.parse(r.lk)) : null; } catch (e) { void e; } el.remove(); startMatch(G, { n: String(r.n).slice(0, 14), k, d, look }); };
      }
      if (!ls.children.length) ls.innerHTML = '<p>Ancora nessun altro robot: quando i tuoi amici provano i loro, compaiono qui.</p>';
    }).catch(() => { if (el.isConnected) el.querySelector('.ls').innerHTML = '<p>⚠️ Non riesco a leggere la bacheca (sei senza rete?).</p>'; });
  }
  // contro chi: il computer, l'amico dal vivo, la bacheca
  function pickUI(G) {
    const old = document.getElementById('r2Pick'); if (old) { old.remove(); return; }
    const f = friend(G), el = document.createElement('div'); el.id = 'r2Pick';
    el.innerHTML = '<h3>⚔️ Contro chi?</h3><button type="button" data-k="cpu">🤖 Il computer<small>il manichino con cuneo, martello e sega</small></button>'
      + (f ? '<button type="button" class="lv" data-k="live">👤 ' + esc(f.name) + ' · dal vivo<small>vi sfidate adesso, ognuno col suo robot</small></button>' : '')
      + '<button type="button" data-k="board">🏛️ La bacheca dei robot<small>i robot degli amici, guidati dal computer</small></button><button type="button" class="x" data-k="x">✖ Chiudi</button>';
    ROOT().appendChild(el); el.addEventListener('pointerdown', e => e.stopPropagation());
    el.onclick = e => { const bt = e.target.closest('button'), k = bt && bt.dataset.k; if (!k) return; el.remove(); if (k === 'cpu') startMatch(G); else if (k === 'live') liveReady(G, true); else if (k === 'board') boardUI(G); };
  }
  // la striscia dell'invito sul banco di prova
  function invTick(G) {
    const el = document.getElementById('r2Inv'); if (!el) return; const f = friend(G), me = meRdy(G), ot = otherRdy(G) && !(U.noT && now() - U.noT < 1.5);
    const st = !f || G.mt ? '' : me && !ot ? 'wait' : ot && !me ? 'inv' : '', key = st + (f ? f.name : '');
    if (el.dataset.k === key) return; el.dataset.k = key; el.hidden = !st;
    el.innerHTML = st === 'wait' ? '⏳ Aspetto che <b>' + esc(f.name) + '</b> accetti… <button type="button" data-k="cancel">Annulla</button>' : st === 'inv' ? '⚔️ <b>' + esc(f.name) + '</b> ti sfida dal vivo! <button type="button" class="ok" data-k="acc">Accetta</button><button type="button" data-k="no">No</button>' : '';
  }
  function matchTick(G) {
    const m = G.mt; if (!m) return; const el = G.time - m.t0, me = G.mine, op = G.dummy;
    if (m.ph === 'intro') { me.turn = null; if (el > 3.6) { m.ph = 'fight'; m.t0 = G.time; ev(G, 'go', me.x, me.y, 0, 0); } return; }
    if (m.ph === 'fight') {
      m.left = Math.max(0, RT - el);
      let w = null, why = '';
      if (me.ko || op.ko) { w = me.ko && op.ko ? -1 : me.ko ? 1 : 0; const lo = me.ko ? me : op; why = lo.ko === 'fall' ? 'fuori dal ring!' : 'cabina distrutta!'; }
      else if (m.left <= 0) { const a = rem(me), b2 = rem(op); w = Math.abs(a - b2) < 0.02 ? -1 : a > b2 ? 0 : 1; why = 'tempo scaduto: robot intero al ' + Math.round(a * 100) + '% contro ' + Math.round(b2 * 100) + '%'; }
      if (w != null) { m.ph = 'end'; m.t0 = G.time; m.res = [w, why]; if (w >= 0) m.w[w]++; ev(G, 'rend', 0, 0, w, why); }
      return;
    }
    if (m.ph === 'end' && el > 3.8) { if (Math.max(...m.w) >= 2) { m.ph = 'over'; ev(G, 'mover', 0, 0, m.w[0] >= 2 ? 0 : 1, 0); } else nextRound(G); }
  }
  function koBody(G, b, why, x, y) { if (b.ko || G.pv) return; b.ko = why; b.koT = G.time; ev(G, why === 'fall' ? 'fall' : 'ko', x != null ? x : b.x, y != null ? y : b.y, 0, b.team); }
  function hurt(G, b, q, dmg, ty) {
    if (G.pv || b.ko || dmg <= 0 || !b.bl.includes(q)) return; q.hp -= dmg; q.fl = G.time;
    if (ty) ev(G, 'h', ...wpos(b, q), Math.round(dmg), ty);
    if (q.hp <= 0) breakBlock(G, b, q);
  }
  // in aria: lancio (vz) e rotolamento (rr): chi atterra a pancia in su resta indifeso, poi si raddrizza con un colpo di molla
  function launch(G, o, vz, rr) { if (o.debris || o.fall) { o.vz = Math.max(o.vz || 0, vz); o.z = Math.max(o.z || 0, 0.02); return; } o.vz = Math.max(o.vz, vz); o.z = Math.max(o.z, 0.02); o.rr += rr; }
  function airTick(G, b, h) {
    if (b.debris) return;
    if (b.z > 0 || b.vz > 0) { b.vz -= GRAV * h; b.z += b.vz * h; b.ro += b.rr * h;
      if (b.z <= 0) { const v = -b.vz; b.z = 0; b.vz = 0; b.rr = 0;
        if (v > 3) { ev(G, 'land', b.x, b.y, Math.min(1, v / 9), b.team); if (v > 6.5) { const L = b.bl.filter(q => !q.over && q.t !== 'cabina'); if (L.length) hurt(G, b, L[Math.floor(Math.random() * L.length)], (v - 6.5) * 3, 'urto'); } }
        if (Math.cos(b.ro) < -0.1 && !b.ko) { b.ro = Math.PI; if (!b.flip) { b.flip = G.time; ev(G, 'flip', b.x, b.y, 0, b.team); } } else { b.ro = 0; if (b.flip) b.flip = 0; } } }
    // a pancia in su da 2,5 s: colpo di molla e si raddrizza (fa mezzo giro in aria)
    if (b.flip && G.time - b.flip > 2.5 && grounded(b) && !b.ko) { b.flip = 0; b.vz = 4.6; b.z = 0.02; b.rr = Math.PI / (2 * 4.6 / GRAV) * (Math.random() < 0.5 ? 1 : -1); ev(G, 'right', b.x, b.y, 0, b.team); }
  }
  // il giro della fisica (sottopassi piccoli: niente compenetrazioni)
  function physics(G, dt) {
    const N = 3, h = dt / N;
    for (let k = 0; k < N; k++) {
      for (const b of G.rbs) { drive(G, b, h); airTick(G, b, h); }
      for (const b of G.rbs) { if (b.fall) { b.x += (b.fvx || 0) * h; b.y += (b.fvy || 0) * h; continue; } b.x += b.vx * h; b.y += b.vy * h; b.a = angN(b.a + b.w * h); if (b.debris && (b.z > 0 || b.vz > 0)) { b.vz -= 14 * h; b.z = Math.max(0, b.z + b.vz * h); if (!b.z) b.vz = 0; } }
      for (let i = 0; i < G.rbs.length; i++) for (let j = i + 1; j < G.rbs.length; j++) collide(G, G.rbs[i], G.rbs[j]);
      for (const b of G.rbs) walls(G, b);
    }
    for (const b of G.rbs) {   // nella fossa (solo toccando terra)
      if (b.fall) { b.fall += dt; continue; }
      // (nella discarica non si cade: intorno ci sono i cumuli)
    }
    G.rbs = G.rbs.filter(b => !(b.debris && b.fall > 1.2));
  }
  function drive(G, b, h) {
    if (b.fall) return;
    if (b.debris) { const f = 1 - Math.min(1, (b.z > 0 ? 0.3 : 5) * h); b.vx *= f; b.vy *= f; b.w *= 1 - Math.min(1, 4 * h); return; }
    const c = Math.cos(b.a), s = Math.sin(b.a), lift = b.lift > G.time ? 0.3 : 1;
    if (!grounded(b)) { const f = 1 - Math.min(1, 0.4 * h); b.vx *= f; b.vy *= f; return; }   // in aria: niente presa
    const on = b.ko || b.flip || b.stun > G.time ? 0 : 1, nos = b.nosT > G.time ? 1 : 0; let inp = b.inp || { thr: 0, steer: 0 };
    // GIRA DI 180: testacoda automatico sul posto
    if (b.turn && on) { const d = angD(b.turn.to, b.a); if (Math.abs(d) < 0.12 || G.time - b.turn.t > 1.6) b.turn = null; else inp = { thr: 0, steer: Math.sign(d) * 1.4 }; }
    let n = 0; for (const q of b.bl) if (PZ[q.t].drive) n++;
    if (!n || !upright(b)) { const f = 1 - Math.min(1, 5 * h); b.vx *= f; b.vy *= f; b.w *= f; return; }
    let tq = 0;
    for (const q of b.bl) {
      const p = PZ[q.t]; if (!p.drive) continue;
      const rx = c * q.lu - s * q.lv, ry = s * q.lu + c * q.lv, pvx = b.vx - b.w * ry, pvy = b.vy + b.w * rx;
      const vf = pvx * c + pvy * s, vl = -b.vx * s + b.vy * c;   // (di lato conta solo lo scivolare del robot, non il suo girare: la presa non frena le curve)
      tq += p.drive * (Math.abs(q.lv) + 0.2);
      // spinta della ruota: avanti/indietro + differenziale per sterzare; senza gas frena
      const tw = clamp(inp.thr * on - inp.steer * on * Math.sign(q.lv) * 0.9 * (Math.abs(q.lv) > 0.05 ? 1 : 0), -1, 1);
      const F = (Math.abs(tw) > 0.04 ? p.drive * (nos ? 1.9 : 1) * clamp(tw - vf / (p.vmax * (nos ? 1.7 : 1)), -1, 1) : -p.drive * clamp(vf * 0.9, -1, 1)) * lift;
      impulse(b, c * F * h, s * F * h, rx, ry);
      // presa laterale (le ruote non scivolano di lato... finche' la spinta non e' troppa)
      const cap = p.mu * (b.M / n) * 9.8 * h * lift, j = clamp(-vl * (b.M / n) * 0.9, -cap, cap); b.vx += -s * j / b.M; b.vy += c * j / b.M;
    }
    // STERZO: quanto puo' girare dipende da quanta spinta hanno le ruote e da quanto sono larghe (ruote tutte in fila = non gira);
    // senza sterzo il robot non si raddrizza da solo: ruote storte o perse = tira da una parte
    if (Math.abs(inp.steer) > 0.02 && on) { const want = inp.steer * 3.8, tmax = tq * 0.95 * lift * (b.turn ? 1.6 : 1); b.w += clamp((want - b.w) * b.I * 12, -tmax, tmax) * h / b.I; }
    else b.w *= 1 - Math.min(1, 5 * h * lift);
    const k = Math.min(1, 0.12 * h); b.vx -= b.vx * k; b.vy -= b.vy * k; b.w *= 1 - Math.min(1, 0.6 * h);
  }
  // i cumuli intorno alla radura: si rimbalza (anche in volo: i rottami sono alti) e si fa male se si arriva forte
  function walls(G, b) {
    if (b.fall) return; const c = Math.cos(b.a), s = Math.sin(b.a);
    for (const q of b.bl) {
      if (q.over) continue; const rx = c * q.lu - s * q.lv, ry = s * q.lu + c * q.lv, x = b.x + rx, y = b.y + ry, qr = q.r || RB, dx = x - ARX, dy = y - ARY, d = Math.hypot(dx, dy) || 1, pen = d + qr - ARR;
      if (pen <= 0) continue; const nx = -dx / d, ny = -dy / d; b.x += nx * pen; b.y += ny * pen;
      const pvx = b.vx - b.w * ry, pvy = b.vy + b.w * rx, vn = pvx * nx + pvy * ny; if (vn >= 0) continue;
      const rn = rx * ny - ry * nx, j = -1.25 * vn / (1 / b.M + rn * rn / b.I); impulse(b, nx * j, ny * j, rx, ry);
      if (-vn > 2.2 && !b.debris) { ev(G, 'bang', x, y, Math.min(1, -vn / 5), 0); if (-vn > 3.4) hurt(G, b, q, (-vn - 3.4) * 4, 'urto'); }
    }
  }
  function collide(G, A, Bd) {
    if (A.fall || Bd.fall || !A.bl.length || !Bd.bl.length) return;
    if (Math.abs((A.z || 0) - (Bd.z || 0)) > 0.5) return;   // uno passa sopra l'altro
    if (A.debris && Bd.debris && (A.z > 0.05 || Bd.z > 0.05)) return;
    if (Math.hypot(Bd.x - A.x, Bd.y - A.y) > A.R + Bd.R) return;
    const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(Bd.a), sb = Math.sin(Bd.a);
    for (const qa of A.bl) { if (qa.over) continue; const xa = A.x + ca * qa.lu - sa * qa.lv, ya = A.y + sa * qa.lu + ca * qa.lv;
      for (const qb of Bd.bl) { if (qb.over) continue; const xb = Bd.x + cb * qb.lu - sb * qb.lv, yb = Bd.y + sb * qb.lu + cb * qb.lv;
        const dx = xb - xa, dy = yb - ya, d = Math.hypot(dx, dy), rr2 = (qa.r || RB) + (qb.r || RB); if (d >= rr2 || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, pen = rr2 - d, iA = 1 / A.M, iB = 1 / Bd.M, tot = iA + iB;
        const mx = (xa + xb) / 2, my = (ya + yb) / 2, pax = mx - A.x, pay = my - A.y, pbx = mx - Bd.x, pby = my - Bd.y;
        const vax = A.vx - A.w * pay, vay = A.vy + A.w * pax, vbx = Bd.vx - Bd.w * pby, vby = Bd.vy + Bd.w * pbx, rvx = vbx - vax, rvy = vby - vay, vn = rvx * nx + rvy * ny, sp = -vn;
        // il cuneo: chi lo prende di fronte ci sale sopra e viene alzato (piu' arriva veloce, piu' vola); l'urto e' molto piu' morbido
        const wA = qa.t === 'cuneo' && !Bd.debris && grounded(Bd) && Math.cos(A.a + qa.d * Math.PI / 2) * nx + Math.sin(A.a + qa.d * Math.PI / 2) * ny > 0.45;
        const wB = qb.t === 'cuneo' && !A.debris && grounded(A) && -(Math.cos(Bd.a + qb.d * Math.PI / 2) * nx + Math.sin(Bd.a + qb.d * Math.PI / 2) * ny) > 0.45;
        if ((wA || wB) && sp > 0.6) { const up = wA ? Bd : A, oth = wA ? A : Bd, k = clamp(sp, 1, 7); launch(G, up, 2.0 + k * 1.3, (Math.random() - 0.5) * k * 1.6); up.lift = G.time + 0.5; if (!up.liftT || G.time - up.liftT > 0.5) { up.liftT = G.time; ev(G, 'lift', wA ? xb : xa, wA ? yb : ya, Math.min(1, k / 6), up.team); }
          const ux = wA ? nx : -nx, uy = wA ? ny : -ny; up.vx += ux * k * 0.25; up.vy += uy * k * 0.25; void oth; continue; }
        A.x -= nx * pen * 0.8 * iA / tot; A.y -= ny * pen * 0.8 * iA / tot; Bd.x += nx * pen * 0.8 * iB / tot; Bd.y += ny * pen * 0.8 * iB / tot;
        if (vn >= 0) continue;
        const ra = pax * ny - pay * nx, rb = pbx * ny - pby * nx, den = iA + iB + ra * ra / A.I + rb * rb / Bd.I, j = -1.32 * vn / den;
        impulse(A, -nx * j, -ny * j, pax, pay); impulse(Bd, nx * j, ny * j, pbx, pby);
        const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = clamp(-vt / den * 0.5, -0.35 * j, 0.35 * j); impulse(A, -tx * jt, -ty * jt, pax, pay); impulse(Bd, tx * jt, ty * jt, pbx, pby);
        if (sp > 1.4 && !(A.debris && Bd.debris)) { const k2 = 'c' + (A.uid || '') + (Bd.uid || ''); if (!G.cT[k2] || G.time - G.cT[k2] > 0.18) { G.cT[k2] = G.time; ev(G, 'bang', mx, my, Math.min(1, sp / 5), 1); }
          // botta forte: un piccolo salto ai due (gli urti si sentono) e danni
          if (sp > 2.6 && !A.debris && !Bd.debris) { launch(G, A, Math.min(2.6, (sp - 2.6) * 0.7) * Math.min(1.5, Bd.M / A.M), 0); launch(G, Bd, Math.min(2.6, (sp - 2.6) * 0.7) * Math.min(1.5, A.M / Bd.M), 0); }
          if (sp > 1.9 && !A.debris && !Bd.debris) { const dm = (sp - 1.9) * 5; hurt(G, A, qa, dm * Math.min(2, Bd.M / A.M), 'urto'); hurt(G, Bd, qb, dm * Math.min(2, A.M / Bd.M), 'urto'); return; } }
      } }
  }
  // ---- le armi ----
  function weapons(G, b, dt) {
    if (b.ko || b.debris || b.fall || b.flip || b.z > 0.3) { if (b.act) { b.act.sega = b.act.fiamma = false; } return; }
    const inp = b.inp || {}, T = G.time;
    const saws = b.bl.filter(q => q.t === 'sega'), fl = b.bl.filter(q => q.t === 'fiamma');
    b.act.sega = !!(inp.sega && saws.length && !b.hot); if (b.act.sega) b.heat += dt; else b.heat = Math.max(0, b.heat - dt * 0.8); if (b.heat >= 3) b.hot = 1; if (b.hot && b.heat < 1) b.hot = 0;
    // serbatoio di 3 s: vuoto = spenta finche' non si e' ricaricato tutto (6 s), e si ricarica solo a fiamma spenta
    b.act.fiamma = !!(inp.fiamma && fl.length && b.fuel > 0 && !b.fout); if (b.act.fiamma) { b.fuel -= dt; if (b.fuel <= 0) { b.fuel = 0; b.fout = 1; ev(G, 'empty', b.x, b.y, 0, b.team); } } else { b.fuel = Math.min(3, b.fuel + dt * 0.5); if (b.fout && b.fuel >= 3) b.fout = 0; }
    for (const q of saws) if (b.act.sega) { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2, tx = x + Math.cos(fa) * 0.32 * BS, ty = y + Math.sin(fa) * 0.32 * BS;
      for (const o of G.rbs.slice()) { if (o === b || o.fall || Math.abs((o.z || 0) - b.z) > 0.6) continue; for (const r of o.bl.slice()) { if (!hitable(r)) continue; const [ox, oy] = wpos(o, r); if (Math.hypot(ox - tx, oy - ty) < 0.42 * BS) { hurt(G, o, r, 10 * dt, null); impulse(o, Math.cos(fa) * 3 * dt * o.M / 4, Math.sin(fa) * 3 * dt * o.M / 4, ox - o.x, oy - o.y); if (Math.random() < dt * 20) ev(G, 'saw', tx, ty, 0, 0); } } } }
    for (const q of fl) if (b.act.fiamma) { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      for (const o of G.rbs.slice()) { if (o === b || o.fall) continue; for (const r of o.bl.slice()) { if (!hitable(r)) continue; const [ox, oy] = wpos(o, r), dx = ox - x, dy = oy - y, d = Math.hypot(dx, dy); if (d < 1.5 * BS && d > 0.2 && Math.abs(angD(Math.atan2(dy, dx), fa)) < 0.5) { hurt(G, o, r, 5 * dt, null); r.burn = T + 2; } } } }
    for (const q of b.bl) if ((q.t === 'martello' && inp.martello) || (q.t === 'pala' && inp.pala)) { const kk = q.t[0] + q.gx + q.gy; if (b.cd[kk] > T) continue; b.cd[kk] = T + PZ[q.t].cd; q.sw = T; G.hams.push({ b, q, t: T + (q.t === 'pala' ? 0.05 : 0.16) }); }
    for (const q of b.bl) if (q.t === 'cannone' && inp.cannone && !(b.cd['c' + q.gx + q.gy] > T)) { b.cd['c' + q.gx + q.gy] = T + PZ.cannone.cd; q.sw = T; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      G.proj.push({ x: x + Math.cos(fa) * 0.4 * BS, y: y + Math.sin(fa) * 0.4 * BS, z: (b.z || 0) + 0.35, dx: Math.cos(fa), dy: Math.sin(fa), t: T, own: b }); impulse(b, -Math.cos(fa) * 6, -Math.sin(fa) * 6, x - b.x, y - b.y); ev(G, 'shot', x, y, fa, 0); }
    // TASER: scarica corta davanti, blocca le ruote di chi prende
    for (const q of b.bl) if (q.t === 'taser' && inp.taser && !(b.cd['T' + q.gx + q.gy] > T)) { b.cd['T' + q.gx + q.gy] = T + PZ.taser.cd; q.sw = T; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2, sx = x + Math.cos(fa) * 0.36 * BS, sy = y + Math.sin(fa) * 0.36 * BS, tx = x + Math.cos(fa) * 0.66 * BS, ty = y + Math.sin(fa) * 0.66 * BS; let best = null, bd = 0.75 * BS;
      for (const o of G.rbs) { if (o === b || o.fall || o.debris || Math.abs((o.z || 0) - b.z) > 0.6) continue; for (const r of o.bl) { const [ox, oy] = wpos(o, r), dd = Math.hypot(ox - tx, oy - ty); if (dd < bd) { bd = dd; best = [o, r, ox, oy]; } } }
      if (best) { const [o, r, ox, oy] = best; o.stun = T + 1.5; hurt(G, o, r, 3, 'taser'); ev(G, 'zap', ox, oy, [r2(sx), r2(sy)], o.team); } else ev(G, 'zap', tx, ty, [r2(sx), r2(sy)], -1); }
    // MINE: una per tocco, dalla parte dove punta il pezzo
    for (const q of b.bl) if (q.t === 'mina' && inp.mina && q.am > 0 && !(b.cd['M' + q.gx + q.gy] > T)) { b.cd['M' + q.gx + q.gy] = T + PZ.mina.cd; q.am--; q.sw = T; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      let mx = x + Math.cos(fa) * 0.8 * BS, my = y + Math.sin(fa) * 0.8 * BS; const dc = Math.hypot(mx - ARX, my - ARY); if (dc > ARR - 0.5) { mx = ARX + (mx - ARX) * (ARR - 0.5) / dc; my = ARY + (my - ARY) * (ARR - 0.5) / dc; }
      (G.mines || (G.mines = [])).push({ x: mx, y: my, team: b.team, t: T }); ev(G, 'mdrop', mx, my, 0, b.team); break; }
    // TORRETTA LANCIARAZZI: ogni tocco 2 razzi a parabola (4 per torretta e per round) verso il robot avversario piu' vicino
    if (inp.razzo) { const tg = enemyOf(G, b); if (tg) for (const q of b.bl) if (q.t === 'razzo' && q.am > 0 && !(b.cd['R' + q.gx + q.gy] > T)) { b.cd['R' + q.gx + q.gy] = T + PZ.razzo.cd; q.sw = T; const n = Math.min(2, q.am); q.am -= n; for (let k = 0; k < n; k++) (G.rq || (G.rq = [])).push({ t: T + k * 0.22, b, q, tg: tg.uid, k }); break; } }
    // FLARE (a pulsante)
    if (inp.flare) for (const q of b.bl) if (q.t === 'flare' && q.am > 0 && !(b.cd['F' + q.gx + q.gy] > T)) { b.cd['F' + q.gx + q.gy] = T + PZ.flare.cd; q.sw = T; flareFire(G, b, q); break; }
    // LANCIADISCHI
    for (const q of b.bl) if (q.t === 'dischi' && inp.dischi && !(b.cd['D' + q.gx + q.gy] > T)) { b.cd['D' + q.gx + q.gy] = T + PZ.dischi.cd; q.sw = T; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2;
      G.proj.push({ k: 'dk', x: x + Math.cos(fa) * 0.5 * BS, y: y + Math.sin(fa) * 0.5 * BS, z: (b.z || 0) + 0.3, dx: Math.cos(fa), dy: Math.sin(fa), v: 8.5, t: T, own: b, team: b.team, nb: 0, hT: -9 }); ev(G, 'dsk', x, y, 0, b.team); }
    if (inp.nos && !b.nosUsed && b.bl.some(q => q.t === 'nos')) { b.nosUsed = 1; b.nosT = T + 4; ev(G, 'nos', b.x, b.y, 0, b.team); }
    inp.martello = inp.cannone = inp.pala = inp.nos = inp.taser = inp.mina = inp.razzo = inp.dischi = inp.flare = false;
  }
  // martello (colpo secco) e pala (lancio in aria): scattano un attimo dopo il tocco
  function hammers(G) {
    G.hams = G.hams.filter(Hm => { if (G.time < Hm.t) return true; const b = Hm.b, q = Hm.q; if (!b.bl.includes(q) || b.ko) return false; const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2, pala = q.t === 'pala', reach = pala ? 0.62 : 0.55, tx = x + Math.cos(fa) * reach * BS, ty = y + Math.sin(fa) * reach * BS; let hit = 0;
      for (const o of G.rbs.slice()) { if (o === b || o.fall || Math.abs((o.z || 0) - b.z) > 0.6) continue; const L = o.bl.filter(hitable).map(r => [r, ...wpos(o, r)]).filter(([, ox, oy]) => Math.hypot(ox - tx, oy - ty) < (pala ? 0.62 : 0.5) * BS).sort((p, q2) => Math.hypot(p[1] - tx, p[2] - ty) - Math.hypot(q2[1] - tx, q2[2] - ty)).slice(0, pala ? 1 : 2);
        for (const [r, ox, oy] of L) {
          if (pala) { const k = clamp(20 / o.M, 0.55, 1.3); launch(G, o, 8.2 * k, (Math.random() < 0.5 ? -1 : 1) * (6.5 + Math.random() * 3.5) * k); o.vx += Math.cos(fa) * 2.4 * k; o.vy += Math.sin(fa) * 2.4 * k; hurt(G, o, r, 4, 'pala'); ev(G, 'launch', ox, oy, 0, o.team || 0); }
          else { impulse(o, Math.cos(fa) * 5, Math.sin(fa) * 5, ox - o.x, oy - o.y); if (!o.debris) { o.lift = G.time + 0.4; launch(G, o, 1.8, 0); } hurt(G, o, r, 14, 'martello'); }
          hit = 1; } }
      if (pala) { launch(G, b, 1.2, 0); ev(G, 'palaFx', tx, ty, hit, 0); } else ev(G, 'ham', tx, ty, hit, 0);
      return false; });
  }
  // esplosione (razzi e mine): danno ai nMax blocchi piu' vicini (meno ai bordi), spinta via e un salto; solo alla squadra avversaria
  function boom(G, x, y, R, dmg, push, team, nMax = 4, up = 2.2) {
    ev(G, 'boom', x, y, R, team);
    for (const o of G.rbs.slice()) { if (o.fall || (o.team === team && !o.debris)) continue; let hit = 0;
      const near = o.bl.map(r => [r, Math.hypot(wpos(o, r)[0] - x, wpos(o, r)[1] - y)]).filter(([, d]) => d < R).sort((a, b) => a[1] - b[1]).slice(0, nMax);
      for (const [r, d] of near) { hit = 1; if (!o.debris) hurt(G, o, r, dmg * (1 - 0.5 * d / R), null); }
      if (hit) { const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) || 1, k = push * Math.min(1.5, 20 / (o.M || 10)); o.vx += dx / d * k; o.vy += dy / d * k; launch(G, o, o.debris ? 3 : up, (Math.random() - 0.5) * 3); } }
  }
  const enemyOf = (G, b) => { let best = null, bd = 1e9; for (const o of G.rbs) { if (o.team === b.team || o.debris || o.fall || o.ko || !o.bl.length) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; best = o; } } return best; };
  // i razzi in coda escono dalla torretta (il secondo 0,22 s dopo), un po' aperti a destra e a sinistra
  function launchQ(G) {
    if (!G.rq || !G.rq.length) return;
    G.rq = G.rq.filter(L => { if (G.time < L.t) return true; const { b, q } = L; if (b.ko || !b.bl.includes(q)) return false; const tg = G.rbs.find(o => o.uid === L.tg) || enemyOf(G, b); if (!tg) return false;
      const [x, y] = wpos(b, q), ang = Math.atan2(tg.y - y, tg.x - x) + (L.k ? 0.35 : -0.35), z0 = (b.z || 0) + 0.6, d = Math.hypot(tg.x - x, tg.y - y);
      G.proj.push({ k: 'rk', x, y, z: z0, z0, ang, dx: Math.cos(ang), dy: Math.sin(ang), v: 7.5, t: G.time, own: b, team: b.team, tg: tg.uid, trav: 0, H: 2.2 + 0.22 * d, sl: 1 }); ev(G, 'rkt', x, y, L.k, b.team); return false; });
  }
  // razzo a parabola: insegue il bersaglio (o il flare che l'ha ingannato) e gli ricade addosso dall'alto
  function rocketStep(G, p, dt) {
    for (let s = 0; s < 3; s++) { const h = dt / 3, fl = p.dec && (G.flr || []).includes(p.dec) ? p.dec : null; let tx = p.lx, ty = p.ly;
      if (fl) { tx = fl.x; ty = fl.y; } else { const o = G.rbs.find(o => o.uid === p.tg && !o.fall && o.bl.length); if (o) { tx = o.x; ty = o.y; flareCheck(G, p, o); } }
      if (tx == null) { tx = p.x + p.dx; ty = p.y + p.dy; } p.lx = tx; p.ly = ty;
      p.ang += clamp(angD(Math.atan2(ty - p.y, tx - p.x), p.ang), -2.4 * h, 2.4 * h); p.dx = Math.cos(p.ang); p.dy = Math.sin(p.ang);
      const st = p.v * h; p.x += p.dx * st; p.y += p.dy * st; p.trav += st;
      const rem = Math.hypot(tx - p.x, ty - p.y), pr = p.trav / (p.trav + rem), zt = p.z0 * (1 - pr) + p.H * 4 * pr * (1 - pr), z = p.z + clamp(zt - p.z, -9 * h, 9 * h); p.sl = (z - p.z) / st; p.z = z;
      if ((pr > 0.5 && z < 0.35) || rem < 0.3 || G.time - p.t > 5) { if (fl) boom(G, p.x, p.y, 0.8, 2, 3, p.team, 2); else boom(G, p.x, p.y, 1.25, 8, 7, p.team, 3); return false; }
      if (pr > 0.6 && z < 0.8) for (const o of G.rbs) { if (o.team === p.team || o.debris || o.fall) continue; for (const r of o.bl) { const [ox, oy] = wpos(o, r); if (Math.hypot(ox - p.x, oy - p.y) < (r.r || RB) + 0.15) { boom(G, p.x, p.y, 1.25, 8, 7, p.team, 3); return false; } } }
    }
    return true;
  }
  // FLARE: quando un razzo nemico arriva a 4,5 caselle il robot lancia i flare (2 lanci per pezzo e per round); ogni razzo ha il 60% di farsi ingannare
  function flareCheck(G, p, o) {
    if (p.fc || !(o.flT > G.time - 1.5) || Math.hypot(p.x - o.x, p.y - o.y) > 4.5) return; p.fc = 1;
    if (Math.random() < 0.6) { const c = (G.flr || []).filter(f => f.team === o.team && G.time - f.t < 2); if (c.length) { p.dec = c[Math.floor(Math.random() * c.length)]; ev(G, 'decoy', p.x, p.y, 0, p.team); } }
  }
  function flareFire(G, o, q) {
    { q.am--; o.flT = G.time; const [x, y] = wpos(o, q);
      for (let i = 0; i < 6; i++) { const a = o.a + Math.PI + (i - 2.5) * 0.5; (G.flr || (G.flr = [])).push({ x, y, z: (o.z || 0) + 0.6, vx: Math.cos(a) * (2 + Math.random()), vy: Math.sin(a) * (2 + Math.random()), vz: 3 + Math.random() * 2, t: G.time, team: o.team }); }
      ev(G, 'flare', x, y, 0, o.team); }
  }
  function flaresTick(G, h) { if (!G.flr || !G.flr.length) return; for (const f of G.flr) { f.x += f.vx * h; f.y += f.vy * h; f.z = Math.max(0, f.z + f.vz * h); f.vz -= 5 * h; f.vx *= 1 - h * 0.8; f.vy *= 1 - h * 0.8; } G.flr = G.flr.filter(f => G.time - f.t < 2.6); }
  // disco: rimbalza sui rottami intorno alla radura e sui robot (non sul suo), al massimo 4 volte
  function discStep(G, p, dt) {
    for (let s = 0; s < 3; s++) { const h = dt / 3; p.x += p.dx * p.v * h; p.y += p.dy * p.v * h;
      const ex = p.x - ARX, ey = p.y - ARY, d = Math.hypot(ex, ey);
      if (d > ARR - 0.15) { const nx = ex / d, ny = ey / d, dot = p.dx * nx + p.dy * ny; if (dot > 0) { p.dx -= 2 * dot * nx; p.dy -= 2 * dot * ny; p.nb++; ev(G, 'tink', p.x, p.y, 0, 0); } p.x = ARX + nx * (ARR - 0.15); p.y = ARY + ny * (ARR - 0.15); }
      if (p.nb > 4 || G.time - p.t > 4.5) { ev(G, 'pop', p.x, p.y, 0, 0); return false; }
      hit: for (const o of G.rbs) { if (o === p.own || o.fall || o.debris || Math.abs((o.z || 0) + 0.28 - p.z) > 0.7) continue; for (const r of o.bl) { const [ox, oy] = wpos(o, r), dx = p.x - ox, dy = p.y - oy, dd = Math.hypot(dx, dy);
        if (dd < (r.r || RB) + 0.14 && G.time - p.hT > 0.2) { p.hT = G.time; hurt(G, o, r, 9, 'disco'); impulse(o, p.dx * 4, p.dy * 4, ox - o.x, oy - o.y); const nx = dx / (dd || 1), ny = dy / (dd || 1), dot = p.dx * nx + p.dy * ny; if (dot < 0) { p.dx -= 2 * dot * nx; p.dy -= 2 * dot * ny; } p.nb++; ev(G, 'tink', p.x, p.y, 1, 0); break hit; } } }
    }
    return true;
  }
  // mine: armate dopo 1 s, scoppiano quando un blocco avversario ci passa sopra
  function mines(G) {
    if (!G.mines || !G.mines.length) return;
    G.mines = G.mines.filter(m => { if (G.time - m.t < 1) return true;
      for (const o of G.rbs) { if (o.team === m.team || o.debris || o.fall || (o.z || 0) > 0.25) continue; for (const r of o.bl) { const [ox, oy] = wpos(o, r); if (Math.hypot(ox - m.x, oy - m.y) < 0.62) { boom(G, m.x, m.y, 1.4, 11, 7, m.team, 4, 3.4); return false; } } }
      return true; });
  }
  function projectiles(G, dt) {
    G.proj = G.proj.filter(p => { if (p.k === 'rk') return rocketStep(G, p, dt); if (p.k === 'dk') return discStep(G, p, dt); for (let k = 0; k < 3; k++) { p.x += p.dx * 11 * dt / 3; p.y += p.dy * 11 * dt / 3;
      if (Math.hypot(p.x - ARX, p.y - ARY) > ARR || G.time - p.t > 1.2) { ev(G, 'pop', p.x, p.y, 0, 0); return false; }
      for (const o of G.rbs) { if (o === p.own || o.fall || Math.abs((o.z || 0) + 0.3 - p.z) > 0.8) continue; for (const r of o.bl) { if (!hitable(r)) continue; const [ox, oy] = wpos(o, r); if (Math.hypot(ox - p.x, oy - p.y) < RB + 0.08) { impulse(o, p.dx * 9, p.dy * 9, ox - o.x, oy - o.y); hurt(G, o, r, 9, 'cannone'); ev(G, 'pop', p.x, p.y, 1, 0); return false; } } } }
      return true; });
  }
  function burning(G, dt) { for (const b of G.rbs) for (const q of b.bl.slice()) if (q.burn > G.time) { if (Math.random() < dt * 2) ev(G, 'ember', ...wpos(b, q), 0, 0); hurt(G, b, q, 2 * dt, null); } }
  function ev(G, k, x, y, a, b) { if (G.pv) return; const e = [k, x, y, a, b]; e.sq = G.evN = (G.evN || 0) + 1; e.tm = G.time; G.evs.push(e); if (G.evs.length > 80) G.evs.shift(); }

  // ======================= SUONI =======================
  const sfxOk = () => { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
  function swp(f0, f1, d, v, delay = 0, type = 'sine') { const A = sfxOk(); if (!A) return; const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d); g.gain.setValueAtTime(Math.min(0.5, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d + 0.02); }
  let NOISE = null;
  function noise(d, v, f, delay = 0, type = 'lowpass', q = 0.8) { const A = sfxOk(); if (!A) return; if (!NOISE || NOISE.sampleRate !== A.sampleRate) { NOISE = A.createBuffer(1, A.sampleRate, A.sampleRate); const ch = NOISE.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } const t = A.currentTime + delay, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = NOISE; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(Math.min(0.6, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(A.destination); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02); }
  const SFX = {
    clank: k => { swp(700 + k * 200, 300, 0.1, 0.05, 0, 'square'); noise(0.12, 0.1, 2600, 0, 'bandpass', 3); swp(1800, 1600, 0.05, 0.02, 0.06, 'triangle'); },
    rot: () => { swp(900, 1300, 0.07, 0.03, 0, 'triangle'); },
    del: () => { noise(0.15, 0.08, 900); swp(500, 200, 0.12, 0.03, 0, 'square'); },
    no: () => { swp(300, 200, 0.15, 0.03, 0, 'square'); },
    go: () => { [392, 523, 659, 784].forEach((f, i) => swp(f, f, 0.18, 0.035, i * 0.08, 'square')); noise(0.6, 0.1, 400, 0.3); },
    bang: k => { noise(0.18 + k * 0.25, 0.12 + k * 0.25, 500 + k * 400); swp(160, 50, 0.2 + k * 0.2, 0.05 + k * 0.08, 0, 'square'); for (let i = 0; i < Math.round(k * 4); i++) swp(2000 + Math.random() * 2000, 700, 0.08, 0.015, 0.03 + i * 0.03, 'triangle'); },
    brk: () => { noise(0.4, 0.22, 700); for (let i = 0; i < 5; i++) swp(1500 + Math.random() * 1800, 500, 0.1, 0.02, 0.04 + i * 0.05, 'triangle'); },
    ham: h => { noise(0.35, h ? 0.3 : 0.12, 300); swp(120, 40, 0.3, h ? 0.14 : 0.06, 0, 'sine'); },
    shot: () => { noise(0.5, 0.3, 350); swp(150, 40, 0.45, 0.12, 0, 'sine'); },
    pop: k => { noise(0.25, k ? 0.2 : 0.08, 800); },
    lift: k => { swp(250, 700 + k * 500, 0.25, 0.04, 0, 'triangle'); noise(0.2, 0.08, 1800, 0, 'bandpass', 2); },
    launch: () => { noise(0.25, 0.3, 500); swp(200, 1400, 0.35, 0.06, 0, 'sawtooth'); swp(1400, 400, 0.6, 0.03, 0.35, 'triangle'); },
    land: k => { noise(0.25 + k * 0.3, 0.15 + k * 0.25, 260); swp(90, 35, 0.3, 0.08 + k * 0.08, 0, 'sine'); },
    flip: () => { [523, 392, 330, 262].forEach((f, i) => swp(f, f * 0.9, 0.18, 0.03, i * 0.1, 'square')); },
    right: () => { swp(220, 900, 0.18, 0.06, 0, 'triangle'); swp(900, 500, 0.25, 0.04, 0.18, 'triangle'); },
    turn: () => { noise(0.4, 0.08, 2200, 0, 'bandpass', 1.5); },
    nos: () => { noise(1.2, 0.25, 1600, 0, 'highpass'); swp(300, 1800, 0.6, 0.05, 0, 'sawtooth'); noise(3.5, 0.12, 900, 0.3, 'bandpass', 0.8); },
    fall: () => { swp(900, 80, 1.2, 0.06, 0, 'triangle'); noise(0.5, 0.2, 300, 1.0); },
    ko: () => { noise(1.2, 0.35, 260); swp(110, 30, 1.0, 0.16, 0, 'sine'); for (let i = 0; i < 10; i++) swp(1600 + Math.random() * 2500, 400, 0.15, 0.015, 0.05 + i * 0.06, 'triangle'); },
    zap: () => { swp(2400, 700, 0.22, 0.05, 0, 'sawtooth'); swp(1700, 2600, 0.12, 0.03, 0.05, 'square'); noise(0.2, 0.08, 5000, 0, 'highpass'); },
    boom: () => { noise(0.9, 0.4, 220); swp(140, 30, 0.7, 0.18, 0, 'sine'); for (let i = 0; i < 6; i++) swp(1200 + Math.random() * 1500, 300, 0.12, 0.015, 0.05 + i * 0.05, 'triangle'); },
    whoosh: () => { noise(0.6, 0.15, 1400, 0, 'bandpass', 1.2); swp(300, 900, 0.5, 0.03, 0, 'sawtooth'); },
    flare: () => { noise(0.6, 0.14, 3200, 0, 'highpass'); for (let i = 0; i < 5; i++) swp(700 + i * 200, 1600, 0.12, 0.025, i * 0.07, 'triangle'); },
    tink: k => { swp(2600 + k * 600, 1800, 0.07, 0.03 + k * 0.02, 0, 'triangle'); noise(0.06, 0.05, 4000, 0, 'highpass'); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => swp(f, f, 0.25, 0.04, 0.3 + i * 0.12, 'triangle')); }
  };
  const HUM = { o: null, g: null, s: null, sg: null };
  function hum(spd, saw, on) {
    if (!HUM.o && !on) return; const A = sfxOk(); if (!A) return;
    if (!HUM.o) { const o = A.createOscillator(), f = A.createBiquadFilter(), g = A.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; o.connect(f); f.connect(g); g.connect(A.destination); o.start(); const s = A.createOscillator(), sg = A.createGain(); s.type = 'sawtooth'; s.frequency.value = 1700; sg.gain.value = 0; s.connect(sg); sg.connect(A.destination); s.start(); Object.assign(HUM, { o, g, s, sg }); }
    const t = A.currentTime; HUM.o.frequency.setTargetAtTime(48 + spd * 22, t, 0.08); HUM.g.gain.setTargetAtTime(on ? 0.014 + Math.min(0.02, spd * 0.005) : 0, t, 0.1);
    HUM.sg.gain.setTargetAtTime(on && saw ? 0.006 : 0, t, 0.05); HUM.s.frequency.setTargetAtTime(1500 + Math.random() * 400, t, 0.05);
  }

  // ======================= DISEGNO DEL ROBOT =======================
  // strumenti isometrici: frame(angolo, ox, oy, oz, scala) -> S(p, q, z) sullo schermo, Wm(p, q, z) nella mappa; box() e solid() pieni (facce verso chi guarda)
  const VIEW = [1, 1, 0.87];   // verso chi guarda (nella mappa)
  function iso(g, X, Y, TW) {
    const Uz = TW * 0.575;
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const frame = (ang, ox, oy, oz, k = 1) => { const c = Math.cos(ang), s = Math.sin(ang); return { a: ang, k,
      Wm: (p, q, z) => [ox + c * p * k - s * q * k, oy + s * p * k + c * q * k, z * k + oz],
      S: (p, q, z) => { p *= k; q *= k; z *= k; const x = ox + c * p - s * q, y = oy + s * p + c * q; return [X + (x - y) * TW / 2, Y + (x + y) * TW / 4 - (z + oz) * Uz]; } }; };
    const box = (fr, u0, u1, v0, v1, z0, z1, col) => {
      const C = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]], c = Math.cos(fr.a), s = Math.sin(fr.a);
      for (let i = 0; i < 4; i++) { const [nu, nv] = N[i], nx = c * nu - s * nv, ny = s * nu + c * nv; if (nx + ny <= 0.001) continue; const sh = (Math.max(0, nx) * 0.6 + Math.max(0, ny) * 0.82) / (Math.max(0, nx) + Math.max(0, ny)); const A = C[i], Bq = C[(i + 1) % 4]; poly([fr.S(A[0], A[1], z0), fr.S(Bq[0], Bq[1], z0), fr.S(Bq[0], Bq[1], z1), fr.S(A[0], A[1], z1)], cqShade(col, sh)); }
      poly([fr.S(u0, v0, z1), fr.S(u1, v0, z1), fr.S(u1, v1, z1), fr.S(u0, v1, z1)], cqShade(col, 1.08));
    };
    // solido convesso qualsiasi: vertici [p, q, z] e facce (indici); si disegnano solo le facce girate verso chi guarda
    const solid = (fr, V, F, col, cols) => {
      const Wv = V.map(v => fr.Wm(...v)), cx = Wv.reduce((s, v) => s + v[0], 0) / Wv.length, cy = Wv.reduce((s, v) => s + v[1], 0) / Wv.length, cz = Wv.reduce((s, v) => s + v[2], 0) / Wv.length;
      F.forEach((f, fi) => { const a = Wv[f[0]], b = Wv[f[1]], c = Wv[f[2]], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const m = Math.hypot(...n) || 1; n = n.map(x => x / m);
        const fc = f.reduce((s, i) => [s[0] + Wv[i][0], s[1] + Wv[i][1], s[2] + Wv[i][2]], [0, 0, 0]).map(x => x / f.length); if ((fc[0] - cx) * n[0] + (fc[1] - cy) * n[1] + (fc[2] - cz) * n[2] < 0) n = n.map(x => -x);
        if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 0.001) return;
        const pp = Math.max(0, n[0]), pq = Math.max(0, n[1]), pz = Math.max(0, n[2]), sh = (pp * 0.6 + pq * 0.82 + pz * 1.08) / (pp + pq + pz || 1);
        poly(f.map(i => fr.S(...V[i])), cqShade(cols && cols[fi] || col, sh)); });
    };
    return { Uz, poly, frame, box, solid };
  }
  // un robot (o un pezzo sciolto): blocchi dal piu' lontano al piu' vicino (l'arma subito dopo il suo blocco), il pilota seduto nella cabina
  function drawBody(g, X, Y, TW, b, o = {}) {
    const K = iso(g, X, Y, TW), { frame } = K, T = o.T != null ? o.T : -1, Uz = TW * 0.575;
    if (b.fall) { const k = Math.max(0, 1 - b.fall / 0.9); if (k <= 0) return; g.save(); g.translate(X, Y + (1 - k) * TW * 0.8); g.scale(k, k); g.translate(-X, -Y); }
    const lz = b.z || 0, c = Math.cos(b.a), s = Math.sin(b.a), ro = b.ro || 0, flipped = Math.cos(ro) < 0;
    { const sc = 1 / (1 + lz * 0.35); g.fillStyle = 'rgba(0,0,0,' + (0.32 * sc) + ')'; g.beginPath(); g.ellipse(X, Y, TW * (b.R || 0.4) * 0.72 * sc, TW * (b.R || 0.4) * 0.34 * sc, 0, 0, 7); g.fill(); }
    const tilt = Math.sin(ro) * 0.55; let rot = false; if (Math.abs(tilt) > 0.01) { rot = true; g.save(); const cy = Y - (lz + 0.3) * Uz; g.translate(X, cy); g.rotate(tilt); g.translate(-X, -cy); }
    const L = b.bl.map(q => { const ox = c * q.lu - s * q.lv, oy = s * q.lu + c * q.lv; return [ox + oy + (q.over ? 0.001 : 0), q, ox, oy]; }).sort((p, q) => p[0] - q[0]);
    if (flipped) { for (const [, q, ox, oy] of L) belly(g, K, frame(b.a, ox, oy, lz, BS), q, b, TW, o); }
    else for (const [, q, ox, oy] of L) { const oz = lz + (q.over ? (BH[q.on] || 0) * BS : 0); block(g, K, frame(b.a + q.d * Math.PI / 2, ox, oy, oz, BS), frame(b.a, ox, oy, oz, BS), q, b, TW, o); }
    if (rot) g.restore();
    if (b.fall) g.restore();
  }
  // a pancia in su: si vede il fondo scuro e le ruote che girano a vuoto
  function belly(g, K, F0, q, b, TW, o) {
    const { box } = K, h = 0.25, t = now();
    if (q.over) return; if (isPlate(q.t)) { box(F0, -0.1, 0.1, -0.1, 0.1, 0.04, 0.3, '#2c2e34'); return; }
    box(F0, -h, h, -h, h, 0.04, 0.3, q.t === 'cabina' ? '#3a3c44' : '#2c2e34');
    if (q.t === 'ruota' || q.t === 'cingolo') { const [Xw, Yw] = F0.S(0, 0, 0.5); g.fillStyle = '#18181c'; g.beginPath(); g.ellipse(Xw, Yw, TW * 0.16 * BS, TW * 0.1 * BS, 0, 0, 7); g.fill(); g.strokeStyle = '#6a6a72'; g.lineWidth = 2; g.beginPath(); const sp = t * 20; g.moveTo(Xw + Math.cos(sp) * TW * 0.12 * BS, Yw + Math.sin(sp) * TW * 0.06 * BS); g.lineTo(Xw - Math.cos(sp) * TW * 0.12 * BS, Yw - Math.sin(sp) * TW * 0.06 * BS); g.stroke(); }
    if (q.t === 'cabina') { const [Xs, Ys] = F0.S(0, 0, 0.6 + (t % 1) * 0.6); g.fillStyle = 'rgba(70,70,74,.45)'; g.beginPath(); g.arc(Xs, Ys, TW * 0.12 * BS, 0, 7); g.fill(); }
  }
  // una RUOTA rotonda (piena) che gira, girata lungo il robot; cx = spostamento lungo il robot, R raggio, w mezza larghezza
  function wheel(g, K, F0, cu, cv, R, w, spin, col, rim) {
    const { poly } = K, N = 14, c = Math.cos(F0.a), s = Math.sin(F0.a);
    const P = (t, v) => F0.S(cu + Math.cos(t) * R, cv + v, R + Math.sin(t) * R);
    const nearV = (-s + c) >= 0 ? w : -w, farV = -nearV;
    poly(Array.from({ length: N }, (_, i) => P(i / N * 6.2832, farV)), cqShade(col, 0.55));
    for (let i = 0; i < N; i++) { const t0 = i / N * 6.2832, t1 = (i + 1) / N * 6.2832, tm = (t0 + t1) / 2, nd = Math.cos(tm) * (c + s) + 0.87 * Math.sin(tm); if (nd <= 0) continue; poly([P(t0, -w), P(t1, -w), P(t1, w), P(t0, w)], cqShade(col, 0.7 + 0.35 * Math.max(0, Math.sin(tm)) + (i % 2 ? 0.06 : 0))); }
    poly(Array.from({ length: N }, (_, i) => P(i / N * 6.2832, nearV)), cqShade(col, 0.9));
    const Pr = (t, r) => F0.S(cu + Math.cos(t) * r, cv + nearV * 1.02, R + Math.sin(t) * r);
    poly(Array.from({ length: 12 }, (_, i) => Pr(i / 12 * 6.2832, R * 0.62)), rim || '#9aa0aa');
    g.strokeStyle = '#4a4e56'; g.lineWidth = Math.max(1.5, R * 18); g.beginPath(); for (let k = 0; k < 3; k++) { const a = spin + k * 2.094; g.moveTo(...Pr(a, R * 0.15)); g.lineTo(...Pr(a, R * 0.58)); } g.stroke();
    poly(Array.from({ length: 8 }, (_, i) => Pr(i / 8 * 6.2832, R * 0.18)), '#d8dce4');
  }
  // il CINGOLO a triangolo (pieno) con i tre ingranaggi dentro
  const TRI = (() => { const C = [[0.22, 0.1, 0.1], [-0.22, 0.1, 0.1], [0, 0.34, 0.1]], pts = []; for (const [u, z, r] of C) for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; pts.push([u + Math.cos(a) * (r + 0.03), z + Math.sin(a) * (r + 0.03)]); }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return { C, hull: lo.slice(0, -1).concat(up.slice(0, -1)) }; })();
  function track(g, K, F0, w, spin, col) {
    const { poly } = K, c = Math.cos(F0.a), s = Math.sin(F0.a), Hh = TRI.hull, n = Hh.length, nearV = (-s + c) >= 0 ? w : -w, farV = -nearV;
    const P = (p, v) => F0.S(p[0], v, p[1]);
    poly(Hh.map(p => P(p, farV)), cqShade(col, 0.5));
    for (let i = 0; i < n; i++) { const a = Hh[i], b = Hh[(i + 1) % n], du = b[0] - a[0], dz = b[1] - a[1], nu = dz, nz = -du, nd = nu * (c + s) + 0.87 * nz; if (nd <= 0) continue; poly([P(a, -w), P(b, -w), P(b, w), P(a, w)], cqShade(col, 0.72 + ((i + Math.floor(spin * 3)) % 2 ? 0.1 : 0))); }
    poly(Hh.map(p => P(p, nearV)), cqShade(col, 0.85));
    const inner = TRI.C.map(([u, z]) => [u * 0.82, z * 0.82 + 0.04]); poly(inner.map(p => F0.S(p[0], nearV * 1.01, p[1])), '#3a3c44');
    for (const [u, z, r] of TRI.C) { const G2 = (a, rr) => F0.S(u + Math.cos(a) * rr, nearV * 1.03, z + Math.sin(a) * rr); poly(Array.from({ length: 16 }, (_, i) => G2(spin + i / 16 * 6.2832, i % 2 ? r * 0.95 : r * 0.72)), '#8a909a'); poly(Array.from({ length: 8 }, (_, i) => G2(i / 8 * 6.2832, r * 0.3)), '#d0d4dc'); }
  }
  function block(g, K, F, F0, q, b, TW, o) {
    const { box, poly, solid } = K, t = now(), T = o.T != null ? o.T : -1, hk = q.mx ? q.hp / q.mx : 1, flash = T - q.fl < 0.08, dim = c => flash ? '#ffffff' : hk < 0.35 ? cqShade(c, 0.6) : hk < 0.7 ? cqShade(c, 0.82) : c, h = 0.25, team = TEAM[b.team || 0], S = F.S;
    if (q.t === 'telaio') { box(F0, -h, h, -h, h, 0.06, 0.3, dim(team)); if (TW > 30) { const S0 = F0.S; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...S0(-h + 0.05, -h + 0.05, 0.301)); g.lineTo(...S0(h - 0.05, -h + 0.05, 0.301)); g.lineTo(...S0(h - 0.05, h - 0.05, 0.301)); g.lineTo(...S0(-h + 0.05, h - 0.05, 0.301)); g.closePath(); g.stroke(); } }
    else if (q.t === 'corazza') { const tk = 0.083; box(F, -tk, tk, -h, h, 0.03, 0.38, dim('#7c848e')); box(F, -tk - 0.01, tk + 0.01, -h - 0.01, h + 0.01, 0.38, 0.41, dim('#9aa2ac')); if (TW > 30) for (const [v, z] of [[-0.17, 0.1], [0.17, 0.1], [-0.17, 0.3], [0.17, 0.3], [0, 0.2]]) { const [Xr, Yr] = S(tk + 0.003, v, z); g.fillStyle = dim('#545a62'); g.beginPath(); g.arc(Xr, Yr, Math.max(1.2, TW / 32 * BS), 0, 7); g.fill(); } }
    else if (q.t === 'nos') { const R2 = 0.11, N2 = 10, Vn = []; for (let i = 0; i < N2; i++) { const a = i / N2 * 6.2832; Vn.push([-0.2, Math.cos(a) * R2, 0.13 + Math.sin(a) * R2]); } for (let i = 0; i < N2; i++) { const a = i / N2 * 6.2832; Vn.push([0.16, Math.cos(a) * R2, 0.13 + Math.sin(a) * R2]); }
      for (const v of [-0.1, 0.1]) box(F, -0.12, -0.08, v - 0.03, v + 0.03, 0, 0.06, '#3a3e48');
      const Fn = [Array.from({ length: N2 }, (_, i) => i), Array.from({ length: N2 }, (_, i) => N2 + i)]; for (let i = 0; i < N2; i++) Fn.push([i, (i + 1) % N2, N2 + (i + 1) % N2, N2 + i]); solid(F, Vn, Fn, dim('#2a66d8'));
      box(F, -0.06, 0.0, -R2 - 0.005, R2 + 0.005, 0.02, 0.245, '#e8e8f0');
      box(F, -0.29, -0.2, -0.04, 0.04, 0.09, 0.17, '#9aa0aa'); box(F, -0.33, -0.29, -0.06, 0.06, 0.07, 0.19, '#3a3e48'); box(F, 0.16, 0.22, -0.035, 0.035, 0.1, 0.16, '#c8ccd4'); box(F, 0.2, 0.24, -0.06, 0.06, 0.15, 0.19, '#c83a2a');
      const [Xl, Yl] = S(0.0, 0, 0.26); g.fillStyle = '#ffffff'; g.font = '900 ' + Math.max(6, Math.round(TW * 0.07 * BS)) + 'px system-ui'; g.textAlign = 'center'; g.fillText('N2O', Xl, Yl);
      if (b.nosT > T) { const [Xe, Ye] = S(-0.36, 0, 0.13); for (let i = 0; i < 6; i++) { const ph = (t * 6 + i / 6) % 1, [Xf, Yf] = S(-0.36 - ph * 0.6, (Math.sin(i * 5 + t * 30)) * 0.05, 0.13 + ph * 0.05); g.fillStyle = ph < 0.3 ? '#e8f4ff' : ph < 0.6 ? '#7ac8ff' : 'rgba(80,120,255,.6)'; g.beginPath(); g.arc(Xf, Yf, TW * 0.05 * BS * (1 - ph * 0.5), 0, 7); g.fill(); } void Xe; void Ye; } }
    else if (q.t === 'ruota') { box(F0, -0.08, 0.08, -0.06, 0.06, 0.1, 0.2, '#3a3e48'); wheel(g, K, F0, 0, 0, 0.21, 0.12, -(b.wa || 0) * 1.6, dim('#1e1f24')); }
    else if (q.t === 'cingolo') { track(g, K, F0, 0.16, -(b.wa || 0) * 1.4, dim('#26272c')); }
    else if (q.t === 'cuneo') { const V = [[-h, -h, 0.02], [-h, h, 0.02], [h + 0.04, h, 0.02], [h + 0.04, -h, 0.02], [-h, -h, 0.38], [-h, h, 0.38]];
      solid(F, V, [[0, 1, 5, 4], [4, 5, 2, 3], [0, 4, 3], [1, 2, 5], [0, 3, 2, 1]], dim('#aab2bc'), [dim('#7a828c'), dim('#c4ccd4'), dim('#8a929c'), dim('#8a929c'), '#3a3e46']);
      g.strokeStyle = '#e8b830'; g.lineWidth = Math.max(2, TW / 22); g.beginPath(); g.moveTo(...S(h + 0.04, -h, 0.03)); g.lineTo(...S(h + 0.04, h, 0.03)); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); for (const v of [-0.12, 0, 0.12]) { g.moveTo(...S(-h + 0.02, v, 0.37)); g.lineTo(...S(h + 0.02, v, 0.04)); } g.stroke(); }
    else if (q.t === 'pala') { const a2 = q.sw != null ? T - q.sw : 9, up = a2 >= 0 && a2 < 0.12 ? a2 / 0.12 : a2 >= 0.12 && a2 < 0.5 ? 1 - (a2 - 0.12) / 0.38 : 0, ang = up * 1.0;
      box(F, -h, 0, -0.2, 0.2, 0.04, 0.16, dim('#4a505a'));
      const hz = 0.16, L = 0.5, tipU = -0.05 + Math.cos(ang) * L, tipZ = hz + Math.sin(ang) * L * 0.9;
      const V = [[-0.05, -0.24, hz], [-0.05, 0.24, hz], [tipU, 0.24, tipZ], [tipU, -0.24, tipZ], [-0.05, -0.24, hz + 0.06], [-0.05, 0.24, hz + 0.06], [tipU, 0.24, tipZ + 0.05], [tipU, -0.24, tipZ + 0.05]];
      solid(F, V, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]], dim('#e8b830'));
      g.strokeStyle = '#1c1c20'; g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); for (const v of [-0.12, 0.04]) { g.moveTo(...S(0.05, v, hz + 0.07 + (tipZ - hz) * 0.2)); g.lineTo(...S(tipU - 0.05, v + 0.08, tipZ + 0.06)); } g.stroke();
      g.strokeStyle = '#9aa0aa'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.moveTo(...S(-0.18, 0, 0.16)); g.lineTo(...S(-0.05 + Math.cos(ang) * 0.25, 0, hz + Math.sin(ang) * 0.22)); g.stroke(); }
    else if (q.t === 'sega') { box(F, -h, 0, -0.12, 0.12, 0.06, 0.26, dim('#5a5e68')); box(F, -0.02, 0.18, -0.04, 0.04, 0.22, 0.3, '#3a3e48'); const on = b.act && b.act.sega, spin = on ? t * 40 : t * 2, R = 0.28, N = 22; g.beginPath(); for (let i = 0; i <= N; i++) { const a = spin + i / N * 6.2832, r = i % 2 ? R : R + 0.06, [Xp, Yp] = S(0.18 + Math.cos(a) * r, Math.sin(a) * r, 0.24); i ? g.lineTo(Xp, Yp) : g.moveTo(Xp, Yp); } g.closePath(); g.fillStyle = dim(on && b.heat > 2 ? '#ffb08a' : '#d0d8e0'); g.fill(); g.strokeStyle = '#7a8088'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = spin * 0.2 + i / 10 * 3.14, [Xp, Yp] = S(0.18 + Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7, 0.245); i ? g.lineTo(Xp, Yp) : g.moveTo(Xp, Yp); } g.fill(); const [Xc, Yc] = S(0.18, 0, 0.25); g.fillStyle = '#5a5e68'; g.beginPath(); g.ellipse(Xc, Yc, TW * 0.06 * BS, TW * 0.03 * BS, 0, 0, 7); g.fill(); }
    else if (q.t === 'martello') { box(F, -h, -0.05, -0.14, 0.14, 0.04, 0.3, dim('#4a505a')); box(F, -0.2, -0.08, -0.16, 0.16, 0.24, 0.34, '#e8b830'); const a2 = q.sw != null ? T - q.sw : 9, up = a2 < 0 ? 0 : a2 < 0.16 ? a2 / 0.16 : a2 < 0.3 ? 1 - (a2 - 0.16) / 0.14 : 0, ang = up * 1.2, hl = 0.55, cz = 0.3 + Math.sin(ang) * hl, cu = -0.1 + Math.cos(ang) * hl; g.strokeStyle = '#2a2a30'; g.lineWidth = Math.max(3, TW / 12); g.lineCap = 'round'; g.beginPath(); g.moveTo(...S(-0.1, 0, 0.3)); g.lineTo(...S(cu, 0, cz)); g.stroke(); g.lineCap = 'butt'; box({ a: F.a, S: (pp, qq, z) => S(pp + cu, qq, z + cz - 0.12) }, -0.1, 0.1, -0.16, 0.16, 0, 0.24, dim('#6a707a')); box({ a: F.a, S: (pp, qq, z) => S(pp + cu, qq, z + cz - 0.12) }, 0.08, 0.11, -0.17, 0.17, 0.01, 0.23, '#9aa0aa'); }
    else if (q.t === 'cannone') { const a2 = q.sw != null ? T - q.sw : 9, rc = a2 >= 0 && a2 < 0.25 ? (1 - a2 / 0.25) * 0.1 : 0; box(F, -h, 0.05, -0.18, 0.18, 0.04, 0.3, '#4a505a'); box(F, -0.2, 0.02, -0.2, 0.2, 0.08, 0.14, '#e8b830');
      const Rb = 0.08, N = 8, V = []; for (let i = 0; i < N; i++) { const a = i / N * 6.2832; V.push([-0.05 - rc, Math.cos(a) * Rb, 0.23 + Math.sin(a) * Rb]); } for (let i = 0; i < N; i++) { const a = i / N * 6.2832; V.push([0.46 - rc, Math.cos(a) * Rb, 0.23 + Math.sin(a) * Rb]); }
      const Fc = [Array.from({ length: N }, (_, i) => i), Array.from({ length: N }, (_, i) => N + i)]; for (let i = 0; i < N; i++) Fc.push([i, (i + 1) % N, N + (i + 1) % N, N + i]); solid(F, V, Fc, dim('#2e323a'));
      const [Xm, Ym] = S(0.47 - rc, 0, 0.23); g.fillStyle = '#0c0c10'; g.beginPath(); g.ellipse(Xm, Ym, TW * 0.045 * BS, TW * 0.06 * BS, 0, 0, 7); g.fill(); }
    else if (q.t === 'fiamma') { box(F, -h, 0.02, -0.16, 0.16, 0.04, 0.34, dim('#c8382e')); box(F, -0.2, -0.02, -0.12, 0.12, 0.34, 0.38, '#e8e0d0'); box(F, -0.12, -0.08, -0.04, 0.04, 0.38, 0.44, '#3a3e48'); box(F, 0.02, 0.3, -0.05, 0.05, 0.18, 0.26, '#3a3e48'); box(F, 0.26, 0.32, -0.07, 0.07, 0.16, 0.28, '#1c1e24'); const [Xp, Yp] = S(0.33, 0, 0.22); g.fillStyle = b.act && b.act.fiamma ? '#ffd24a' : '#3a8aff'; g.beginPath(); g.arc(Xp, Yp, Math.max(1.5, TW * 0.035 * BS), 0, 7); g.fill(); }
    else if (q.t === 'taser') { box(F, -h, 0.0, -0.15, 0.15, 0.04, 0.24, dim('#34405a')); box(F, -0.2, -0.04, -0.11, 0.11, 0.24, 0.29, '#e8b830'); box(F, -0.2, -0.04, -0.11, 0.11, 0.29, 0.32, '#1c1c20'); box(F, -0.2, -0.04, -0.11, 0.11, 0.32, 0.37, '#e8b830');
      for (const v of [-0.09, 0.09]) { box(F, 0.0, 0.32, v - 0.025, v + 0.025, 0.17, 0.22, '#7a808a'); box(F, 0.3, 0.37, v - 0.04, v + 0.04, 0.15, 0.25, '#c8ccd4'); }
      const rdy = !(b.cd && b.cd['T' + q.gx + q.gy] > T), a2 = q.sw != null ? T - q.sw : 9; if ((rdy && Math.sin(t * 9 + q.gx * 3) > 0.6) || (a2 >= 0 && a2 < 0.25)) { g.strokeStyle = a2 >= 0 && a2 < 0.25 ? '#ffffff' : '#9ad8ff'; g.lineWidth = Math.max(1.5, TW / 40); g.beginPath(); for (let i = 0; i <= 5; i++) { const [Xz, Yz] = S(0.37 + (i % 2 ? 0.03 : -0.01), -0.09 + i * 0.036, 0.2 + (Math.random() - 0.5) * 0.05); i ? g.lineTo(Xz, Yz) : g.moveTo(Xz, Yz); } g.stroke(); } }
    else if (q.t === 'mina') { box(F, -h, 0.1, -0.17, 0.17, 0.04, 0.26, dim('#4a5a3a')); box(F, 0.1, 0.24, -0.12, 0.12, 0.04, 0.1, '#26282e'); box(F, -0.2, 0.06, -0.15, 0.15, 0.26, 0.28, '#e8b830');
      const n = q.am != null ? q.am : 3; for (let i = 0; i < n; i++) { const zc = 0.29 + i * 0.065, disc = (z, c) => poly(Array.from({ length: 12 }, (_, k) => { const a = k / 12 * 6.2832; return S(-0.07 + Math.cos(a) * 0.12, Math.sin(a) * 0.12, z); }), c); disc(zc, '#1a1c20'); disc(zc + 0.05, dim('#3a3c42')); const [Xm, Ym] = S(-0.07, 0, zc + 0.051); g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(Xm, Ym, Math.max(1.5, TW * 0.025 * BS), 0, 7); g.fill(); } }
    else if (q.t === 'razzo') { box(F, -0.2, 0.2, -0.2, 0.2, 0.04, 0.16, dim('#3a4030')); box(F, -0.12, 0.12, -0.12, 0.12, 0.16, 0.24, dim('#4a5038'));
      const G2 = cq.g, en = G2 && !o.noPilot && G2.rbs ? enemyOf(G2, b) : null, [px, py] = wpos(b, q), rel = en ? angD(Math.atan2(en.y - py, en.x - px), b.a + q.d * Math.PI / 2) : -0.6, c = Math.cos(rel), s = Math.sin(rel), R2 = ([u, v, z]) => [u * c - v * s, u * s + v * c, z];
      const V = [[-0.17, -0.16, 0.26], [-0.17, 0.16, 0.26], [0.2, 0.16, 0.38], [0.2, -0.16, 0.38], [-0.17, -0.16, 0.46], [-0.17, 0.16, 0.46], [0.2, 0.16, 0.58], [0.2, -0.16, 0.58]].map(R2);
      solid(F, V, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]], dim('#5a6a40'));
      const n = q.am != null ? q.am : 4; [[-0.075, 0.43], [0.075, 0.43], [-0.075, 0.53], [0.075, 0.53]].forEach(([v, z], k) => { const [u2, v2] = R2([0.205, v, z]), [Xm, Ym] = S(u2, v2, z); g.fillStyle = k < n ? '#c8382e' : '#0c0c10'; g.beginPath(); g.arc(Xm, Ym, Math.max(1.5, TW * 0.03 * BS), 0, 7); g.fill(); }); }
    else if (q.t === 'flare') { box(F, -0.2, 0.2, -0.17, 0.17, 0.04, 0.2, dim('#3a4a3a')); const n = q.am != null ? q.am : 2;
      [-0.08, 0.08].forEach((v, k) => { box(F, -0.1, 0.06, v - 0.055, v + 0.055, 0.2, 0.36, '#2a2e30'); box(F, -0.1, 0.06, v - 0.055, v + 0.055, 0.36, 0.39, k < n ? '#ff8a2a' : '#141416'); }); }
    else if (q.t === 'dischi') { box(F, -h, 0.12, -0.18, 0.18, 0.04, 0.2, dim('#5a4a6a')); box(F, -h, 0.2, -0.2, -0.15, 0.2, 0.26, '#3a3e48'); box(F, -h, 0.2, 0.15, 0.2, 0.2, 0.26, '#3a3e48');
      if (!(b.cd && b.cd['D' + q.gx + q.gy] > T)) { const spin = t * 3, R = 0.15, pts = []; for (let i = 0; i < 16; i++) { const a = spin + i / 16 * 6.2832, r = i % 2 ? R : R + 0.04; pts.push(S(0.02 + Math.cos(a) * r, Math.sin(a) * r, 0.25)); } poly(pts, dim('#d8dce4')); const [Xc, Yc] = S(0.02, 0, 0.251); g.fillStyle = '#5a4a6a'; g.beginPath(); g.ellipse(Xc, Yc, TW * 0.04 * BS, TW * 0.02 * BS, 0, 0, 7); g.fill(); } }
    else if (q.t === 'cabina') {
      box(F0, -h, h, -h, h, 0.04, 0.14, dim(cqShade(team, 0.8)));
      // le pareti e il sedile: quelle dietro al pilota (sullo schermo) prima di lui, le altre dopo (il pilota non viene coperto da cio' che ha dietro)
      const parts = [[-h, -0.15, -0.18, 0.18, 0.14, 0.5, dim('#2a2c34')], [-h, h, -h, -h + 0.05, 0.14, 0.32, dim(team)], [-h, h, h - 0.05, h, 0.14, 0.32, dim(team)], [h - 0.06, h, -h, h, 0.14, 0.32, dim(team)], [0.12, 0.2, -0.07, 0.07, 0.32, 0.36, '#1a1c22']];
      const dep = p => { const u = (p[0] + p[1]) / 2, v = (p[2] + p[3]) / 2, c = Math.cos(F0.a), s = Math.sin(F0.a); return (c * u - s * v) + (s * u + c * v); };
      for (const p of parts) if (dep(p) < 0) box(F0, ...p);
      const Lk = o.look; if (Lk && !o.noPilot) { const [Xp, Yp] = F0.S(0, 0, 0.14), TWp = TW * 0.42 * BS, f = (Math.cos(b.a) - Math.sin(b.a)) >= 0 ? 1 : -1, jit = o.jit || 0;
        g.save(); const clipY = F0.S(0, 0, 0.3)[1]; g.beginPath(); g.rect(Xp - TW * 3, Yp - TW * 5, TW * 6, clipY - (Yp - TW * 5)); g.clip(); cqPlayer(g, Xp + (Math.random() - 0.5) * jit * 3, Yp + (Math.random() - 0.5) * jit * 3 + TWp * 0.12, TWp, Lk, 0, f, true); g.restore(); }
      for (const p of parts) if (dep(p) >= 0) box(F0, ...p);
    }
    if (q.burn > T && T > 0) { const [Xf, Yf] = F0.S(0, 0, 0.4); for (let i = 0; i < 3; i++) { const ph = (t * 2.5 + i / 3) % 1, hh = TW * 0.22 * BS * (1 - ph), xo = Xf + (i - 1) * TW * 0.08 * BS, yo = Yf - ph * TW * 0.3; g.fillStyle = ph < 0.4 ? '#ffe070' : '#ff7a2a'; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(xo, yo - hh); g.quadraticCurveTo(xo + TW * 0.06, yo, xo, yo + TW * 0.03); g.quadraticCurveTo(xo - TW * 0.06, yo, xo, yo - hh); g.fill(); } g.globalAlpha = 1; }
    if (hk < 0.35 && q.t !== 'ruota' && Math.sin(t * 3 + q.gx * 7 + q.gy) > 0.3) { const [Xs, Ys] = F0.S(0, 0, 0.45 + ((t * 0.8 + q.gx * 0.3) % 1) * 0.8); g.fillStyle = 'rgba(60,60,64,.35)'; g.beginPath(); g.arc(Xs, Ys, TW * 0.08 * BS, 0, 7); g.fill(); }
  }
  const DUMMY_LOOK = { skin: 'omino', col: '#e8c830', hat: 'nessuno' };
  const MODELS = [
    { n: 'Ruspa', d: 'tutta cingoli, cunei e corazze: non ha armi, ma spinge fortissimo e fa salire gli altri sul muso.', b: [[3, 2, 'telaio', 0], [3, 4, 'telaio', 0], [2, 3, 'telaio', 0], [4, 3, 'telaio', 0], [2, 2, 'telaio', 0], [4, 2, 'telaio', 0], [1, 2, 'cingolo', 0], [1, 3, 'cingolo', 0], [1, 4, 'cingolo', 0], [5, 2, 'cingolo', 0], [5, 3, 'cingolo', 0], [5, 4, 'cingolo', 0], [2, 1, 'cuneo', 0], [3, 1, 'cuneo', 0], [4, 1, 'cuneo', 0], [1, 2, 'corazza', 3], [1, 3, 'corazza', 3], [1, 4, 'corazza', 3], [5, 2, 'corazza', 1], [5, 3, 'corazza', 1], [5, 4, 'corazza', 1], [3, 4, 'corazza', 2], [1, 4, 'corazza', 2], [5, 4, 'corazza', 2]] },
    { n: 'Lama veloce', d: 'leggera e svelta, con tre seghe e il NOS per arrivare addosso prima che l\'altro si giri.', b: [[3, 2, 'telaio', 0], [3, 4, 'telaio', 0], [2, 3, 'telaio', 0], [4, 3, 'telaio', 0], [2, 2, 'ruota', 0], [4, 2, 'ruota', 0], [2, 4, 'ruota', 0], [4, 4, 'ruota', 0], [3, 2, 'sega', 0], [2, 3, 'sega', 3], [4, 3, 'sega', 1], [3, 4, 'nos', 2], [2, 2, 'corazza', 3], [4, 2, 'corazza', 1], [2, 4, 'corazza', 3], [4, 4, 'corazza', 1], [2, 2, 'corazza', 0], [4, 2, 'corazza', 0], [2, 4, 'corazza', 2], [4, 4, 'corazza', 2]] },
    { n: 'Ribaltatore', d: 'pala davanti per lanciare in aria, martello e cannone per finire chi resta a pancia in su.', b: [[3, 2, 'telaio', 0], [3, 4, 'telaio', 0], [2, 3, 'telaio', 0], [4, 3, 'telaio', 0], [2, 2, 'telaio', 0], [4, 2, 'telaio', 0], [1, 2, 'ruota', 0], [1, 3, 'ruota', 0], [5, 2, 'ruota', 0], [5, 3, 'ruota', 0], [2, 4, 'cingolo', 0], [4, 4, 'cingolo', 0], [3, 2, 'pala', 0], [2, 2, 'martello', 0], [4, 2, 'cannone', 0], [1, 2, 'corazza', 3], [1, 3, 'corazza', 3], [5, 2, 'corazza', 1], [5, 3, 'corazza', 1], [2, 4, 'corazza', 2], [4, 4, 'corazza', 2], [3, 4, 'corazza', 2], [1, 3, 'corazza', 2], [5, 3, 'corazza', 2]] }
  ].map(m => (m.b.unshift([3, 3, 'cabina', 0]), m));
  const DUMMY = { b: [[GC, GC, 'cabina', 0], [2, 3, 'telaio', 0], [4, 3, 'telaio', 0], [3, 2, 'telaio', 0], [3, 4, 'telaio', 0], [2, 2, 'ruota', 0], [4, 2, 'ruota', 0], [2, 4, 'ruota', 0], [4, 4, 'ruota', 0], [3, 1, 'cuneo', 0], [2, 1, 'martello', 0], [4, 1, 'sega', 0], [2, 3, 'corazza', 3], [4, 3, 'corazza', 1], [3, 4, 'corazza', 2], [2, 2, 'corazza', 3], [4, 2, 'corazza', 1]] };
  function dummyAI(G, D, dt) {
    const P = G.mine, inp = D.inp; inp.sega = false;
    if (!(U.dumAI || G.mt) || (G.mt && G.mt.ph !== 'fight') || !P || P.ko || D.ko || D.flip) { inp.thr = 0; inp.steer = 0; return; }
    const A = D.ai || (D.ai = { t: 0, mode: 'chase', until: 0, stuck: 0 }); A.t -= dt; if (A.t > 0) return; A.t = 0.12;
    const dx = P.x - D.x, dy = P.y - D.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), diff = angD(ang, D.a), sp = Math.hypot(D.vx, D.vy);
    if (A.mode === 'back') { inp.thr = -0.9; inp.steer = clamp(-diff, -1, 1) * 0.6; const rx = D.x - Math.cos(D.a) * 2.4, ry = D.y - Math.sin(D.a) * 2.4; if (G.time > A.until || Math.hypot(rx - ARX, ry - ARY) > ARR - 0.5) A.mode = 'chase'; }
    else if (A.mode === 'wait') { inp.thr = 0; inp.steer = clamp(diff * 2.4, -1, 1); if (G.time > A.until) A.mode = 'chase'; }
    else {
      if (Math.abs(diff) > 2.4 && dist > 3 && !D.turn && Math.random() < 0.35) D.turn = { to: ang, t: G.time };
      inp.steer = clamp(diff * 2.4, -1, 1); inp.thr = Math.max(0.15, Math.cos(diff)) * (dist > 6 ? 1 : 0.9);
      // contro un muro: sterza via
      // verso i cumuli: sterza verso il centro (se non sta spingendo me contro i rottami)
      const fx = D.x + Math.cos(D.a) * 2.4, fy = D.y + Math.sin(D.a) * 2.4; if (Math.hypot(fx - ARX, fy - ARY) > ARR - 0.8 && dist > 3) { const dc = angD(Math.atan2(ARY - D.y, ARX - D.x), D.a); inp.steer = clamp(inp.steer + Math.sign(dc || 1) * 0.8, -1, 1); }
      // incastrato a spingere: indietreggia e riprende la rincorsa
      if (dist < D.R + P.R + 0.4 && sp < 0.5 && inp.thr > 0.5) { A.stuck += 0.12; if (A.stuck > 1.1) { A.mode = 'back'; A.until = G.time + 0.6 + Math.random() * 0.6; A.stuck = 0; } } else A.stuck = Math.max(0, A.stuck - 0.06);
      if (Math.random() < 0.01) { A.mode = 'wait'; A.until = G.time + 0.6 + Math.random() * 0.8; }
    }
    const front = Math.abs(diff) < 0.6 && dist < D.R + P.R + 0.3; inp.sega = front; inp.fiamma = front; if (front && Math.random() < 0.25) inp.martello = true; if (front && Math.random() < 0.3) inp.pala = true; if (Math.abs(diff) < 0.2 && dist < 7 && Math.random() < 0.12) inp.cannone = true; if (front && Math.random() < 0.3) inp.taser = true; if (dist > 3 && Math.random() < 0.04) inp.razzo = true; if (G.proj.some(p => p.k === 'rk' && p.tg === D.uid && Math.hypot(p.x - D.x, p.y - D.y) < 5.5) && Math.random() < 0.35) inp.flare = true; if (Math.abs(diff) < 0.25 && dist < 10 && Math.random() < 0.1) inp.dischi = true; if (Math.abs(diff) > 2.3 && dist < 4.5 && Math.random() < 0.1) inp.mina = true;
    if (dist > 7 && Math.abs(diff) < 0.3 && Math.random() < 0.02) inp.nos = true;
  }

  // ======================= L'OFFICINA (costruire) =======================
  function css() {
    if (document.getElementById('r2Css')) return;
    const s = document.createElement('style'); s.id = 'r2Css';
    s.textContent = `#r2Shop{position:absolute;left:0;right:0;top:104px;bottom:0;z-index:6;overflow:auto;background:radial-gradient(circle at 50% 0,#3a3e48,#16181e 75%);color:#f2f2f6;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none;padding:4px 8px 10px;box-sizing:border-box}
#r2Shop .wrap{max-width:440px;margin:0 auto}#r2Shop canvas.pv{display:block;width:100%;height:160px}#r2Shop .st{display:flex;gap:4px;justify-content:center;flex-wrap:nowrap;height:22px;overflow:hidden;margin:0 0 6px}#r2Shop .st span{background:rgba(0,0,0,.35);border-radius:10px;padding:3px 6px;font:700 11px system-ui;white-space:nowrap}#r2Shop .st i{display:inline-block;height:6px;border-radius:3px;vertical-align:middle;margin-left:4px}
#r2Shop canvas.gr{display:block;margin:0 auto;width:min(84vw,310px);height:min(84vw,310px);touch-action:none;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.5)}#r2Shop .msg{min-height:34px;font-size:12.5px;line-height:1.35;text-align:center;margin:6px 4px;color:#e8e8ee}#r2Shop .msg b{color:#ffd86a}
#r2Shop .pal{display:flex;gap:5px;overflow-x:auto;padding:4px 2px 6px;scrollbar-width:none}#r2Shop .pal button{flex:0 0 64px;border:0;border-radius:12px;background:#3a3e48;color:#fff;font:700 10.5px system-ui;padding:3px 2px;display:flex;flex-direction:column;align-items:center;touch-action:manipulation}#r2Shop .pal button.tp{background:#4a3a32}#r2Shop .pal button img{width:46px;height:46px;pointer-events:none}#r2Shop .pal button small{opacity:.7;font-size:9.5px}#r2Shop .pal button.on{background:#f2f2f6;color:#1c1c20;box-shadow:0 0 0 3px #e8b830}
#r2Shop .act{display:flex;gap:6px;margin-top:4px}#r2Shop .act.a2 button{padding:7px 4px;font-size:12px;background:#3a3e48}#r2Shop .act.a2 button.on{background:#2e86d8}#r2Shop .act button{flex:1;border:0;border-radius:12px;padding:10px 4px;font:800 13px system-ui;background:#4a505c;color:#fff;touch-action:manipulation}#r2Shop .act button.on{background:#c83a2a}#r2Shop .act button.go{flex:1.6;background:linear-gradient(#3ac870,#249a50);font-size:16px;box-shadow:0 4px 0 #1a6a38}
#r2W{position:absolute;right:max(52px,8%);bottom:112px;width:0;height:0;z-index:5;user-select:none;-webkit-user-select:none}#r2W button{position:absolute;width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,.4);padding:0;background:radial-gradient(circle at 40% 35%,#5a606c,#22252c);box-shadow:0 5px 16px rgba(0,0,0,.5);touch-action:none;color:#fff;font:800 10px system-ui}#r2W button b{position:absolute;left:0;right:0;top:8px;font-size:23px;pointer-events:none}#r2W button i{position:absolute;left:0;right:0;bottom:7px;font-size:8.5px;font-style:normal;pointer-events:none}#r2W button u{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;text-decoration:none}#r2W button.on{border-color:#ffd24a;transform:scale(.94)}#r2W button.p1{width:76px;height:76px}#r2W button.p1 b{top:11px;font-size:30px}#r2W button.p1 i{bottom:9px;font-size:10px}#r2W button.tn{width:52px;height:52px;background:radial-gradient(circle at 40% 35%,#4a6aa8,#1a2848)}#r2W button.tn b{top:6px;font-size:19px}#r2W button.tn i{bottom:5px}#r2Hp{position:absolute;left:10px;right:10px;top:156px;z-index:5;display:flex;justify-content:space-between;gap:14px;pointer-events:none;font:900 11px system-ui;color:#fff;text-shadow:0 1px 2px #000}#r2Hp>div{flex:1;max-width:190px;transition:opacity .3s}#r2Hp .op{text-align:right}#r2Hp em,#r2Hp s{display:block;margin-top:3px;background:rgba(10,10,14,.7);border-radius:6px;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.25)}#r2Hp em{height:10px}#r2Hp s{height:4px;margin-top:4px;box-shadow:none}#r2Hp i{display:block;height:100%;width:100%;transition:width .2s,background .3s}#r2Hp s i{background:#9ab0c8}#r2Hp .op i{margin-left:auto}
#r2Top{position:absolute;left:8px;right:8px;top:106px;z-index:5;display:flex;justify-content:space-between;gap:6px;pointer-events:none}#r2Top button{pointer-events:auto;border:0;border-radius:12px;padding:8px 11px;font:800 13px system-ui;background:rgba(20,22,28,.82);color:#fff;box-shadow:0 3px 10px rgba(0,0,0,.4)}#r2Top button.sm{padding:4px 7px;font-size:16px;line-height:1}#r2Top button small{display:block;font-size:8.5px;margin-top:2px;opacity:.85}#r2Top button.big.fi{background:linear-gradient(#e85a3a,#b8321a);color:#fff}#r2Hp .mid{flex:0 0 auto;text-align:center;min-width:54px}#r2Hp .mid b{display:block;font-size:21px;line-height:1}#r2Hp .mid b.sd{color:#ff6a4a}#r2Hp .mid span{font-size:10px;opacity:.9}#r2End{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:7;width:min(86vw,330px);background:rgba(16,18,24,.95);border-radius:20px;padding:18px 14px 14px;text-align:center;color:#fff;font-family:system-ui;box-shadow:0 10px 40px rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.12)}#r2End h2{margin:0 0 4px;font:900 26px system-ui}#r2End p{margin:4px 0 14px;font:700 14px system-ui;opacity:.85}#r2End button{display:block;width:100%;margin:7px 0 0;border:0;border-radius:12px;padding:11px;font:800 15px system-ui;background:#4a505c;color:#fff}#r2End button.go{background:linear-gradient(#3ac870,#249a50);box-shadow:0 4px 0 #1a6a38}#r2Pick{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);z-index:8;width:min(88vw,340px);background:rgba(16,18,24,.96);border-radius:20px;padding:14px;color:#fff;font-family:system-ui;box-shadow:0 10px 40px rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.12)}#r2Pick h3{margin:0 0 8px;text-align:center;font:900 20px system-ui}#r2Pick button{display:block;width:100%;margin:7px 0 0;border:0;border-radius:14px;padding:11px 12px;text-align:left;font:800 15px system-ui;background:#3a3e48;color:#fff}#r2Pick button small{display:block;font:600 11.5px system-ui;opacity:.75;margin-top:2px}#r2Pick button.lv{background:linear-gradient(#e85a3a,#b8321a)}#r2Pick button.x{text-align:center;background:#262830;font-size:13px}#r2Bc{position:absolute;left:8px;right:8px;top:104px;bottom:8px;z-index:8;max-width:460px;margin:0 auto;background:rgba(16,18,24,.97);border-radius:18px;padding:10px 10px 12px;color:#fff;font-family:system-ui;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.6)}#r2Bc .hd{display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:6px}#r2Bc .hd button{border:0;border-radius:10px;background:#3a3e48;color:#fff;font:800 15px system-ui;padding:6px 11px}#r2Bc .me{font-size:12.5px;line-height:1.35;background:rgba(232,184,48,.12);border:1px solid rgba(232,184,48,.4);border-radius:12px;padding:7px 9px;margin-bottom:8px}#r2Bc .it{display:flex;align-items:center;gap:8px;background:#262830;border-radius:14px;padding:6px 8px;margin-top:7px}#r2Bc .it img{width:84px;height:63px;flex:0 0 84px}#r2Bc .it div{flex:1;font-size:13px}#r2Bc .it small{display:block;font-size:11px;opacity:.8;margin-top:2px;line-height:1.35}#r2Bc .it button{border:0;border-radius:12px;padding:9px 10px;font:800 13px system-ui;background:linear-gradient(#e85a3a,#b8321a);color:#fff}#r2Bc p{text-align:center;opacity:.8;font-size:13px}#r2Inv{position:absolute;left:50%;transform:translateX(-50%);top:200px;z-index:6;max-width:92vw;background:rgba(16,18,24,.92);border:2px solid #e8b830;border-radius:14px;padding:7px 9px;color:#fff;font:700 13px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.5);display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center}#r2Inv[hidden]{display:none}#r2Inv button{border:0;border-radius:10px;padding:6px 10px;font:800 13px system-ui;background:#4a505c;color:#fff}#r2Inv button.ok{background:linear-gradient(#3ac870,#249a50)}#r2Top button.big{background:linear-gradient(#e8b830,#c8961a);color:#1c1c20}`;
    document.head.appendChild(s);
  }
  const isoP = (X, Y, TW) => (x, y, z = 0) => [X + (x - y) * TW / 2, Y + (x + y) * TW / 4 - z * TW * 0.575];
  const fillP = (g, pts, c) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = c; g.fill(); };
  function isoBox(g, P, x0, y0, x1, y1, z0, z1, col) { fillP(g, [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], cqShade(col, 0.74)); fillP(g, [P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)], cqShade(col, 0.55)); fillP(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], cqShade(col, 1.06)); }
  // le mine a terra per extras(): una per oggetto, piccola, con d bassissimo = sul pavimento (sotto ai robot che ci passano sopra)
  const MDR = (g, X, Y, TW, m) => { const G = cq.g; if (!G) return; const P = isoP(X, Y, TW), T = G.time, arm = T - m.t > 1, ring = (r, z) => Array.from({ length: 14 }, (_, k) => { const a = k / 14 * 6.2832; return P(Math.cos(a) * r, Math.sin(a) * r, z); });
    fillP(g, ring(0.26, 0.02), '#1a1c20'); fillP(g, ring(0.2, 0.08), m.team ? '#2e3e5a' : '#5a3a2a');
    const [lx, ly] = P(0, 0, 0.09); g.fillStyle = !arm ? '#ffd24a' : Math.sin(T * 9) > 0 ? '#ff3a2a' : '#5a1a14'; g.beginPath(); g.arc(lx, ly, Math.max(2, TW * 0.05), 0, 7); g.fill(); };
  function mineItems(G) { return (G.mines || []).map(m => { const dr = m.dr || (m.dr = Object.assign((g, X, Y, TW) => MDR(g, X, Y, TW, m), { box: [0.4, 0.3, 0.3] })); return { x: m.x, y: m.y, d: -999, L: null, w: 0, f: 1, name: null, all: true, dr }; }); }
  // razzo (con la scia di fumo) e disco in volo
  function proj2(g, p, P3, sx, sy, TW, T) {
    const z = p.z || 0.3; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(sx(p.x, p.y), sy(p.x, p.y), TW * 0.12, TW * 0.06, 0, 0, 7); g.fill();
    if (p.k === 'rk') { const tr = p.tr || (p.tr = []); if (!tr.length || T - tr[tr.length - 1][2] > 0.03) { tr.push([p.x, p.y, T, z]); if (tr.length > 18) tr.shift(); }
      for (const [x, y, t0, z1] of tr) { const a = T - t0; if (a > 0.6) continue; const [X, Y] = P3(x, y, z1 + a * 0.3); g.fillStyle = 'rgba(160,160,166,' + (0.45 * (1 - a / 0.6)).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, TW * (0.05 + a * 0.2), 0, 7); g.fill(); }
      const sl = p.sl || 0, [Xb, Yb] = P3(p.x - p.dx * 0.28, p.y - p.dy * 0.28, z - sl * 0.28), [Xf, Yf] = P3(p.x + p.dx * 0.18, p.y + p.dy * 0.18, z + sl * 0.18);
      g.fillStyle = Math.random() < 0.5 ? '#ffd24a' : '#ff7a2a'; g.beginPath(); g.arc(Xb, Yb, TW * (0.05 + Math.random() * 0.04), 0, 7); g.fill();
      g.lineCap = 'round'; g.strokeStyle = '#e8e0d0'; g.lineWidth = Math.max(3, TW * 0.09); g.beginPath(); g.moveTo(Xb, Yb); g.lineTo(Xf, Yf); g.stroke(); g.strokeStyle = '#c8382e'; g.lineWidth = Math.max(3, TW * 0.1); g.beginPath(); g.moveTo(Xf, Yf); g.lineTo(Xf + (Xf - Xb) * 0.1, Yf + (Yf - Yb) * 0.1); g.stroke(); g.lineCap = 'butt'; }
    else { const R = 0.2, sp = T * 22, pts = []; for (let i = 0; i < 18; i++) { const a = sp + i / 18 * 6.2832, r = i % 2 ? R : R + 0.05; pts.push(P3(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, z)); }
      g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = '#d8dce4'; g.fill(); g.strokeStyle = '#7a808a'; g.lineWidth = 1; g.stroke(); const [Xc, Yc] = P3(p.x, p.y, z); g.fillStyle = '#5a4a6a'; g.beginPath(); g.ellipse(Xc, Yc, TW * 0.05, TW * 0.025, 0, 0, 7); g.fill(); }
  }
  const ROOT = () => document.getElementById('ciack');
  const ICO = {};
  function icon(t, sz = 64) {
    const k = t + sz; if (ICO[k]) return ICO[k];
    const Bc = 260, tmp = document.createElement('canvas'); tmp.width = tmp.height = Bc; const g = tmp.getContext('2d');
    const b = { a: PZ[t].dir ? -0.4 : -0.75, bl: [{ gx: GC, gy: GC, t, d: 0, hp: 1, mx: 1, lu: 0, lv: 0, fl: -9 }], team: 0, R: 0.4, wa: 0.4, act: {} };
    try { drawBody(g, Bc / 2, Bc * 0.66, Bc * 0.42, b, { T: 0, noPilot: 1 }); } catch (e) { void e; }
    const D = g.getImageData(0, 0, Bc, Bc).data; let x0 = Bc, y0 = Bc, x1 = 0, y1 = 0;
    for (let y = 0; y < Bc; y++) for (let x = 0; x < Bc; x++) if (D[(y * Bc + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cv = document.createElement('canvas'); cv.width = cv.height = sz * 2; const c2 = cv.getContext('2d');
    if (x1 > x0) { const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(sz * 2 * 0.88 / w, sz * 2 * 0.88 / h); c2.drawImage(tmp, x0, y0, w, h, (sz * 2 - w * sc) / 2, (sz * 2 - h * sc) / 2, w * sc, h * sc); }
    return (ICO[k] = cv.toDataURL());
  }
  function shopUI(G, on) {
    css(); let el = document.getElementById('r2Shop'); if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div'); el.id = 'r2Shop';
    el.innerHTML = '<div class="wrap"><canvas class="pv" width="880" height="320"></canvas><div class="st"></div><canvas class="gr" width="700" height="700"></canvas><div class="msg"></div>'
      + '<div class="pal">' + PAL.map(t => `<button type="button" data-t="${t}"${isTop(t) ? ' class="tp"' : ''}><img src="${icon(t, 46)}" alt="">${PZ[t].n}<small>peso ${PZ[t].w}</small></button>`).join('') + '</div>'
      + '<div class="act a2"><button type="button" data-k="u">↩️ Annulla</button><button type="button" data-k="m">🪞 Specchio</button><button type="button" data-k="t">📋 Modelli</button></div>'
      + '<div class="act"><button type="button" data-k="x">🗑️ Togli</button><button type="button" data-k="c">🧹 Svuota</button><button type="button" class="go" data-k="go">▶️ PROVALO!</button></div></div>';
    ROOT().appendChild(el);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelectorAll('.pal button').forEach(b => b.onclick = () => { U.tool = b.dataset.t; SFX.rot(); U.say = PZ[U.tool].d; shopRender(); });
    el.querySelector('[data-k=x]').onclick = () => { U.tool = U.tool === 'x' ? 'telaio' : 'x'; SFX.rot(); U.say = U.tool === 'x' ? '🗑️ Tocca i pezzi da <b>togliere</b> (prima l\'arma, poi il blocco sotto).' : ''; shopRender(); };
    el.querySelector('[data-k=c]').onclick = () => { if (U.clr && now() - U.clr < 2.5) { U.clr = 0; remember(); saveD(D0()); SFX.del(); U.say = 'Tutto smontato: resta solo la <b>cabina</b>.'; } else { U.clr = now(); U.say = 'Tocca di nuovo <b>🧹 Svuota</b> per smontare tutto.'; } shopRender(); };
    el.querySelector('[data-k=go]').onclick = () => { const st = statsOf(myD()); if (!st.nW) { SFX.no(); U.say = '⚠️ Senza <b>ruote o cingoli</b> attaccati il robot non si muove! Mettine almeno due.'; shopRender(); return; } goDrive(G); };
    el.querySelector('[data-k=u]').onclick = () => { const s = U.hist.pop(); if (!s) { SFX.no(); U.say = 'Niente da annullare.'; } else { saveD({ b: JSON.parse(s) }); SFX.rot(); U.say = '↩️ Annullato.'; } shopRender(); };
    el.querySelector('[data-k=m]').onclick = () => { U.mir = !U.mir; SFX.rot(); U.say = U.mir ? '🪞 <b>Specchio acceso</b>: quello che metti a sinistra compare anche a destra (e al contrario).' : 'Specchio spento.'; shopRender(); };
    el.querySelector('[data-k=t]').onclick = () => { U.tpl = (U.tpl + 1) % MODELS.length; const m = MODELS[U.tpl]; remember(); saveD(cleanD({ b: m.b.map(q => q.slice()) })); SFX.clank(0.8); U.say = '📋 <b>' + m.n + '</b>: ' + m.d + ' Tocca ancora per il prossimo, <b>↩️</b> per tornare al tuo.'; shopRender(); };
    const cv = el.querySelector('canvas.gr'); let drag = null;
    const cell = e => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * GN), y = Math.floor((e.clientY - r.top) / r.height * GN); return x >= 0 && x < GN && y >= 0 && y < GN ? [x, y] : null; };
    const side = e => { const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width * GN % 1 - 0.5, fy = (e.clientY - r.top) / r.height * GN % 1 - 0.5; return Math.abs(fy) >= Math.abs(fx) ? (fy < 0 ? 0 : 2) : (fx > 0 ? 1 : 3); };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); const c = cell(e); if (!c) return; try { cv.setPointerCapture(e.pointerId); } catch {} U.side = side(e); const snap = JSON.stringify(myD().b), md = put(c[0], c[1], true); if (md !== 'none') mirrorCell(c[0], c[1]); drag = { last: key(...c), mode: md, snap }; });
    cv.addEventListener('pointermove', e => { if (!drag) return; const c = cell(e); if (!c || key(...c) === drag.last) return; drag.last = key(...c); if (drag.mode === 'put' || drag.mode === 'del') { if (put(c[0], c[1], false) !== 'none') mirrorCell(c[0], c[1]); } });
    const up = () => { if (drag && JSON.stringify(myD().b) !== drag.snap) { U.hist.push(drag.snap); if (U.hist.length > 40) U.hist.shift(); } drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    shopRender();
  }
  // monta / gira / togli un pezzo nella cella (blocco sotto, arma sopra)
  function put(x, y, first) {
    const d = myD(), tool = U.tool, here = d.b.map((q, i) => [q, i]).filter(([q]) => q[0] === x && q[1] === y), bs = here.find(([q]) => isBase(q[2])), tp = here.find(([q]) => isTop(q[2])), pls = here.filter(([q]) => isPlate(q[2]));
    const done = (ms, snd) => { saveD(d); if (snd) snd(); pop(x, y); U.say = ms; shopRender(); };
    if (isPlate(tool)) {   // la corazza: sul lato toccato del blocco (toccando di nuovo si toglie)
      const sd = U.side || 0, ex = pls.find(([q]) => q[3] === sd), [gx2, gy2] = GDIR[sd];
      if (ex) { if (!first) return 'put'; d.b.splice(ex[1], 1); done('Corazza tolta.', SFX.del); return 'del'; }
      if (!bs) { if (first) { SFX.no(); U.say = 'La <b>corazza</b> si monta sul <b>lato di un blocco</b>: tocca vicino al bordo di un telaio, di una ruota o della cabina.'; shopRender(); } return 'none'; }
      if (d.b.some(q => q[0] === x + gx2 && q[1] === y + gy2 && isBase(q[2]))) { if (first) { SFX.no(); U.say = 'Quel lato tocca un altro blocco: la corazza va sui <b>lati liberi</b> (verso l\'esterno).'; shopRender(); } return 'none'; }
      if (wOf(d) + PZ.corazza.w > MAXW) return heavy();
      d.b.push([x, y, 'corazza', sd]); SFX.clank(0.3); done('Corazza montata ' + ['davanti ⬆️', 'a destra ➡️', 'dietro ⬇️', 'a sinistra ⬅️'][sd] + '. Trascina per corazzare tutto un lato!'); return 'put';
    }
    if (tool === 'x') { const v = tp || pls[pls.length - 1] || bs; if (!v) return 'del'; if (v[0][2] === 'cabina') { if (first) { SFX.no(); U.say = 'La <b>cabina</b> col pilota non si toglie: è il cuore del robot!'; shopRender(); } return 'none'; } d.b.splice(v[1], 1); done('', SFX.del); return 'del'; }
    const nb = d.b.slice(), rot = (v, n) => { v[0][3] = (v[0][3] + 1) % 4; (U.lastDir || (U.lastDir = {}))[n] = v[0][3]; done(PZ[n].n + ' girato ' + ['in avanti ⬆️', 'a destra ➡️', 'indietro ⬇️', 'a sinistra ⬅️'][v[0][3]] + '.', SFX.rot); };
    const dir = PZ[tool].dir ? ((U.lastDir || {})[tool] || 0) : 0;
    if (isTop(tool)) {
      if (tp && tp[0][2] === tool) { if (first) rot(tp, tool); return first ? 'rot' : 'put'; }
      if (bs && !BH[bs[0][2]]) { if (first) { SFX.no(); U.say = 'Le armi vanno <b>sopra un telaio</b> (o da sole in una casella vuota), non sopra ' + (bs[0][2] === 'cabina' ? 'la cabina' : 'un ' + PZ[bs[0][2]].n.toLowerCase()) + '.'; shopRender(); } return 'none'; }
      const w = wOf({ b: nb.filter((q, i) => !tp || i !== tp[1]) }) + PZ[tool].w; if (w > MAXW) return heavy();
      if (tp) d.b[tp[1]] = [x, y, tool, dir]; else d.b.push([x, y, tool, dir]);
    } else {
      if (bs && bs[0][2] === 'cabina') { if (first) { SFX.no(); U.say = 'La <b>cabina</b> col pilota non si toglie: è il cuore del robot!'; shopRender(); } return 'none'; }
      if (bs && bs[0][2] === tool) { if (PZ[tool].dir && first) rot(bs, tool); return first && PZ[tool].dir ? 'rot' : 'put'; }
      if (tp && !BH[tool]) { if (first) { SFX.no(); U.say = 'Qui sopra c\'è un\'arma: sotto ci va un <b>telaio</b> (o togli prima l\'arma).'; shopRender(); } return 'none'; }
      const w = wOf({ b: nb.filter((q, i) => !bs || i !== bs[1]) }) + PZ[tool].w; if (w > MAXW) return heavy();
      if (bs) d.b[bs[1]] = [x, y, tool, dir]; else d.b.push([x, y, tool, dir]);
    }
    SFX.clank(Math.random()); const L = linked(d.b), j = d.b.findIndex(q => q[0] === x && q[1] === y);
    done(!L.has(j) ? '⚠️ Questo pezzo <b>non è attaccato</b> alla cabina: cadrà via! Collegalo con dei blocchi di telaio.' : PZ[tool].d);
    return 'put';
  }
  const remember = () => { U.hist.push(JSON.stringify(myD().b)); if (U.hist.length > 40) U.hist.shift(); };
  // specchio: la casella simmetrica (sinistra <-> destra) diventa la copia di quella appena cambiata
  function mirrorCell(x, y) {
    const mx = GN - 1 - x; if (!U.mir || mx === x) return; const d = myD(), md = r => r === 1 ? 3 : r === 3 ? 1 : r;
    const nb = d.b.filter(q => !(q[0] === mx && q[1] === y)).concat(d.b.filter(q => q[0] === x && q[1] === y).map(q => [mx, y, q[2], md(q[3])]));
    if (wOf({ b: nb }) > MAXW) { U.say = '⚖️ Il pezzo c\'è, ma la <b>copia allo specchio</b> non ci sta: troppo peso.'; shopRender(); return; }
    saveD(cleanD({ b: nb })); pop(mx, y); shopRender();
  }
  const NEAR = { sega: 1, martello: 1, pala: 1, taser: 1, mina: 1 };
  function covered(d) {
    const out = []; d.b.forEach((q, i) => { if (!NEAR[q[2]]) return; const [gx2, gy2] = GDIR[q[3]], fx = q[0] + gx2, fy = q[1] + gy2;
      if (d.b.some(o => o[0] === fx && o[1] === fy && !isPlate(o[2])) || d.b.some(o => o[0] === q[0] && o[1] === q[1] && isPlate(o[2]) && o[3] === q[3])) out.push(i); });
    return out;
  }
  function heavy() { SFX.no(); U.say = '⚖️ <b>Troppo pesante!</b> (massimo ' + MAXW + '). Togli qualcosa o usa pezzi più leggeri.'; U.shk = now(); shopRender(); return 'none'; }
  const pop = (x, y) => { U.pops[key(x, y)] = now(); };
  function shopRender() {
    const el = document.getElementById('r2Shop'); if (!el) return; const d = myD(), st = statsOf(d);
    el.querySelectorAll('.pal button').forEach(b => b.classList.toggle('on', b.dataset.t === U.tool)); el.querySelector('[data-k=x]').classList.toggle('on', U.tool === 'x'); el.querySelector('[data-k=m]').classList.toggle('on', !!U.mir);
    const bar = (v, mx, col) => `<i style="width:${Math.round(Math.max(3, Math.min(1, v / mx) * 30))}px;background:${col}"></i>`;
    el.querySelector('.st').innerHTML = `<span>⚖️ ${st.M}/${MAXW}</span><span>💨 velocità${bar(st.v, 3.6, '#3ad870')}</span><span>💪 spinta${bar(st.push, 36, '#ffb050')}</span><span>🔄 agilità${bar(st.agi, 1, '#7ac8ff')}</span>`;
    const m = U.say || (d.b.length === 1 ? '🔧 Questa è la tua <b>cabina</b>, col pilota. Scegli un pezzo qui sotto e tocca la griglia per attaccarlo. Senza <b>ruote</b> non si muove!' : !st.nW ? 'Ora attacca le <b>ruote</b> (o i cingoli): dove le metti cambia come guida!' : st.loose ? '⚠️ ' + st.loose + ' pezzi non sono attaccati alla cabina: cadranno via.' : 'Quando vuoi, <b>▶️ PROVALO!</b> sul banco di prova.');
    const cov = covered(d), m2 = m + (cov.length ? '<br><span style="color:#ff8a7a">⚠️ <b>' + [...new Set(cov.map(i => PZ[d.b[i][2]].n))].join(', ') + '</b> punta contro un tuo pezzo: non colpirà niente! Tocca l\'arma per girarla.</span>' : '');
    const ms = el.querySelector('.msg'); if (ms.innerHTML !== m2) ms.innerHTML = m2;
    gridDraw(el.querySelector('canvas.gr'), d);
  }
  // la griglia vista dall'alto (avanti = in alto): il blocco e, sopra, l'arma
  function gridDraw(cv, d) {
    const g = cv.getContext('2d'), w = cv.width, cs = w / GN, T = now(), L = linked(d.b);
    g.clearRect(0, 0, w, w); g.fillStyle = '#26282f'; g.fillRect(0, 0, w, w);
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) { g.fillStyle = (x + y) % 2 ? '#2c2f37' : '#30333c'; g.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4); g.fillStyle = 'rgba(0,0,0,.35)'; for (const [u, v] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) { g.beginPath(); g.arc(x * cs + u * cs, y * cs + v * cs, 3, 0, 7); g.fill(); } }
    g.fillStyle = 'rgba(232,184,48,.9)'; g.font = '800 22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('▲ AVANTI', w / 2, 4);
    const ord = d.b.map((q, i) => [q, i]).sort((a, b) => (isPlate(a[0][2]) ? 2 : isTop(a[0][2]) ? 1 : 0) - (isPlate(b[0][2]) ? 2 : isTop(b[0][2]) ? 1 : 0));
    for (const [q, i] of ord) { const [x, y, t, r] = q, p = T - (U.pops[key(x, y)] || 0), sc = p < 0.25 ? 1 + 0.25 * Math.sin(p / 0.25 * Math.PI) : 1, cx = x * cs + cs / 2, cy = y * cs + cs / 2, over = isTop(t) && d.b.some(o => o !== q && o[0] === x && o[1] === y && isBase(o[2]));
      g.save(); g.translate(cx, cy); g.scale(sc * (over ? 0.8 : 1), sc * (over ? 0.8 : 1)); if (over) { g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 10; g.shadowOffsetY = 4; } g.rotate(r * Math.PI / 2); topPiece(g, t, cs * 0.92); g.restore();
      if (!L.has(i) && !isPlate(t)) { g.fillStyle = 'rgba(255,60,40,.38)'; g.fillRect(x * cs + 3, y * cs + 3, cs - 6, cs - 6); g.font = '24px system-ui'; g.textBaseline = 'middle'; g.fillText('⚠️', cx, cy); } }
    for (const i of covered(d)) { const [x, y] = d.b[i]; g.strokeStyle = '#ff4a3a'; g.lineWidth = 6; g.setLineDash([12, 8]); g.strokeRect(x * cs + 5, y * cs + 5, cs - 10, cs - 10); g.setLineDash([]); g.font = '26px system-ui'; g.textBaseline = 'middle'; g.fillText('⚠️', x * cs + cs * 0.78, y * cs + cs * 0.22); }
  }
  function topPiece(g, t, s) {
    const h = s / 2, rr = (x, y, w, hh, r, col) => { g.fillStyle = col; cqRR(g, x, y, w, hh, r); g.fill(); };
    if (t === 'cabina') { rr(-h, -h, s, s, 10, TEAM[0]); rr(-h + 7, -h + 7, s - 14, s - 14, 8, '#2a2c34'); g.fillStyle = '#f2c8a0'; g.beginPath(); g.arc(0, 4, s * 0.2, 0, 7); g.fill(); g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(0, 1, s * 0.2, Math.PI, 0); g.fill(); g.fillStyle = '#1a1c22'; g.fillRect(-s * 0.18, -h + 10, s * 0.36, 6); return; }
    if (t === 'telaio') { rr(-h, -h, s, s, 7, TEAM[0]); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(-h + 8, -h + 8, s - 16, s - 16); return; }
    if (t === 'corazza') { rr(-h - 2, -h - 4, s + 4, s * 0.26, 4, '#7c848e'); rr(-h + 2, -h - 1, s - 4, s * 0.12, 3, '#9aa2ac'); g.fillStyle = '#545a62'; for (const u of [-0.6, 0, 0.6]) { g.beginPath(); g.arc(u * h, -h + s * 0.09, 3.5, 0, 7); g.fill(); } return; }
    if (t === 'nos') { rr(-h * 0.36, -h * 0.75, s * 0.36, s * 0.75, 12, '#2a66d8'); g.fillStyle = '#e8e8f0'; g.fillRect(-h * 0.36, -h * 0.05, s * 0.36, h * 0.25); g.fillStyle = '#c83a2a'; g.fillRect(-h * 0.14, -h * 0.95, s * 0.14, h * 0.25); g.fillStyle = '#3a3e48'; g.fillRect(-h * 0.1, h * 0.75, s * 0.1, h * 0.25); return; }
    if (t === 'ruota') { rr(-h * 0.5, -h * 0.9, s * 0.5, s * 0.9, 16, '#1e1f24'); g.fillStyle = '#4a4c54'; for (let i = 0; i < 6; i++) g.fillRect(-h * 0.5, -h * 0.8 + i * s * 0.15, s * 0.5, 4); g.fillStyle = '#9aa0aa'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); return; }
    if (t === 'cingolo') { g.fillStyle = '#26272c'; g.beginPath(); g.moveTo(-h * 0.6, -h); g.lineTo(h * 0.6, -h); g.lineTo(h * 0.6, h); g.lineTo(-h * 0.6, h); g.closePath(); g.fill(); g.fillStyle = '#55565e'; for (let i = 0; i < 7; i++) g.fillRect(-h * 0.6, -h + 4 + i * s * 0.14, s * 0.6, 5); g.fillStyle = '#8a909a'; for (const yy of [-0.6, 0, 0.6]) { g.beginPath(); g.arc(0, yy * h, 7, 0, 7); g.fill(); } return; }
    if (t === 'cuneo') { g.fillStyle = '#8a929c'; g.fillRect(-h, -h * 0.2, s, h * 1.2); g.fillStyle = '#c0c8d0'; g.beginPath(); g.moveTo(-h, -h * 0.2); g.lineTo(h, -h * 0.2); g.lineTo(h * 0.8, -h); g.lineTo(-h * 0.8, -h); g.closePath(); g.fill(); g.fillStyle = '#e8b830'; g.fillRect(-h * 0.8, -h, s * 0.8, 5); return; }
    if (t === 'pala') { rr(-h * 0.7, -h * 0.1, s * 0.7, h * 1.0, 6, '#4a505a'); g.fillStyle = '#e8b830'; g.beginPath(); g.moveTo(-h * 0.9, -h * 0.1); g.lineTo(h * 0.9, -h * 0.1); g.lineTo(h * 0.75, -h); g.lineTo(-h * 0.75, -h); g.closePath(); g.fill(); g.strokeStyle = '#1c1c20'; g.lineWidth = 4; g.beginPath(); for (const xx of [-0.4, 0.1]) { g.moveTo(xx * h, -h * 0.2); g.lineTo((xx + 0.3) * h, -h * 0.9); } g.stroke(); return; }
    if (t === 'sega') { rr(-h * 0.35, 0, s * 0.35, h, 4, '#5a5e68'); g.fillStyle = '#d0d8e0'; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * 6.2832, r = i % 2 ? h * 0.62 : h * 0.75; g.lineTo(Math.cos(a) * r, -h * 0.25 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#5a5e68'; g.beginPath(); g.arc(0, -h * 0.25, 6, 0, 7); g.fill(); return; }
    if (t === 'martello') { rr(-h * 0.4, h * 0.1, s * 0.4, h * 0.9, 4, '#4a505a'); g.fillStyle = '#2a2a30'; g.fillRect(-5, -h * 0.6, 10, h * 0.9); rr(-h * 0.7, -h, s * 0.7, h * 0.5, 4, '#6a707a'); return; }
    if (t === 'cannone') { rr(-h * 0.6, -h * 0.1, s * 0.6, h * 1.1, 6, '#4a505a'); rr(-h * 0.2, -h, s * 0.2, h * 1.3, 4, '#2e323a'); g.fillStyle = '#1a1c22'; g.fillRect(-h * 0.26, -h, s * 0.26, 7); return; }
    if (t === 'taser') { rr(-h * 0.6, -h * 0.1, s * 0.6, h * 1.1, 6, '#34405a'); rr(-h * 0.5, h * 0.1, s * 0.5, h * 0.4, 4, '#e8b830'); g.fillStyle = '#c8ccd4'; for (const xx of [-0.32, 0.18]) g.fillRect(xx * h, -h, s * 0.07, h * 1.0); g.strokeStyle = '#7ac8ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-0.28 * h, -h + 4); for (let i = 1; i <= 4; i++) g.lineTo(-0.28 * h + i * 0.13 * h, -h + (i % 2 ? 10 : 2)); g.stroke(); return; }
    if (t === 'mina') { rr(-h * 0.7, -h * 0.4, s * 0.7, h * 1.3, 6, '#4a5a3a'); g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(0, -h * 0.55, h * 0.38, 0, 7); g.fill(); g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(0, -h * 0.55, 4, 0, 7); g.fill(); return; }
    if (t === 'razzo') { g.fillStyle = '#3a4030'; g.beginPath(); g.arc(0, 0, h * 0.75, 0, 7); g.fill(); rr(-h * 0.5, -h * 0.85, s * 0.5, h * 1.2, 5, '#5a6a40'); g.fillStyle = '#c8382e'; for (const [xx, yy] of [[-0.22, -0.6], [0.22, -0.6], [-0.22, -0.2], [0.22, -0.2]]) { g.beginPath(); g.arc(xx * h, yy * h, 5, 0, 7); g.fill(); } return; }
    if (t === 'flare') { rr(-h * 0.7, -h * 0.5, s * 0.7, h * 1.2, 6, '#3a4a3a'); g.fillStyle = '#ff8a2a'; for (const xx of [-0.3, 0.3]) { g.beginPath(); g.arc(xx * h, -h * 0.05, h * 0.22, 0, 7); g.fill(); } return; }
    if (t === 'dischi') { rr(-h * 0.7, -h * 0.1, s * 0.7, h * 1.1, 6, '#5a4a6a'); g.fillStyle = '#d8dce4'; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.2832, r = i % 2 ? h * 0.5 : h * 0.62; g.lineTo(Math.cos(a) * r, -h * 0.3 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#5a4a6a'; g.beginPath(); g.arc(0, -h * 0.3, 5, 0, 7); g.fill(); return; }
    if (t === 'fiamma') { rr(-h * 0.6, -h * 0.1, s * 0.6, h * 1.1, 8, '#c8382e'); g.fillStyle = '#3a3e48'; g.fillRect(-5, -h, 10, h * 0.95); g.fillStyle = '#3a8aff'; g.beginPath(); g.arc(0, -h + 4, 5, 0, 7); g.fill(); }
  }
  function previewTick(G) {
    const el = document.getElementById('r2Shop'); if (!el) return; const cv = el.querySelector('canvas.pv'); if (!cv) return;
    if (now() - (U.pvT || 0) < 1 / 30) return; U.pvT = now();
    const d = myD(), sig = JSON.stringify(d.b); if (U.pvSig !== sig) { U.pvSig = sig; const pb = { a: 0, x: 0, y: 0, z: 0, ro: 0, team: 0, wa: 0, act: {}, cu: 0, cv: 0, bl: d.b.map(([gx, gy, t, r]) => ({ gx, gy, t, d: r, hp: 1, mx: 1, fl: -9 })) }; mass(pb, true); U.pvB = pb; }
    { const cw = Math.round((cv.clientWidth || 400) * 2), ch = Math.round((cv.clientHeight || 160) * 2); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } }
    const g = cv.getContext('2d'), w = cv.width, h = cv.height; g.clearRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.7, w * 0.5); gr.addColorStop(0, 'rgba(255,214,140,.22)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2c34'; g.beginPath(); g.ellipse(w / 2, h * 0.76, w * 0.3, h * 0.13, 0, 0, 7); g.fill(); g.strokeStyle = '#e8b830'; g.lineWidth = 3; g.setLineDash([12, 10]); g.stroke(); g.setLineDash([]);
    const b = U.pvB; b.a = angN(now() * 0.5); b.wa = now() * 3;
    const TW = Math.min(170, h * 0.9 / Math.max(1.2, b.R * 1.15));
    drawBody(g, w / 2, h * 0.74, TW, b, { look: cqLookOf(G.me), T: 0 });
    if (U.shk && now() - U.shk < 0.3) cv.style.transform = 'translateX(' + Math.sin((now() - U.shk) * 60) * 5 + 'px)'; else if (cv.style.transform) cv.style.transform = '';
  }

  // ======================= IL BANCO DI PROVA (guidare) =======================
  function goDrive(G) {
    const d = myD(); G.mines = []; G.flr = []; G.rq = []; G.rbs = G.rbs.filter(b => b !== G.mine && !(b.fall && !b.dummy)); G.rl = 1; G.rlT = 1; G.sawOn = 0;
    const b = makeBody(d, SPAWN[0][0], SPAWN[0][1], SPAWN[0][2], 0); b.uid = 'me'; G.mine = b; G.rbs.unshift(b);
    if (!G.dummy || G.dummy.ko) spawnDummy(G);
    U.mode = 'drive'; shopUI(G, false); driveUI(G, true); SFX.go(); cq.x = b.x; cq.y = b.y; pubRobot().catch(() => {});
    U.msg = { t: G.time, s: '🏁 Si va!' };
    try { if (!localStorage.getItem('robotHelp2')) { localStorage.setItem('robotHelp2', '1'); setTimeout(() => cqToast('🎯 Il <b>manichino</b> ti dà la caccia: lancialo in aria col cuneo o la pala, fallo a pezzi! (😠/😴 per fermarlo) Il tasto <b>🔄 180°</b> ti gira al volo.'), 1800); } } catch {}
  }
  function goShop(G) { if (meRdy(G)) liveReady(G, false); U.mode = 'shop'; driveUI(G, false); shopUI(G, true); hum(0, false, false); }
  function spawnDummy(G) {
    if (G.dummy) G.rbs = G.rbs.filter(b => b !== G.dummy);
    const b = makeBody(DUMMY, SPAWN[1][0], SPAWN[1][1], SPAWN[1][2], 1); b.uid = 'dm' + (G.dmN = (G.dmN || 0) + 1); b.dummy = 1; G.dummy = b; G.rbs.push(b);
  }
  function driveUI(G, on) {
    css(); for (const id of ['r2W', 'r2Top', 'r2Hp', 'r2End', 'r2Pick', 'r2Bc', 'r2Inv']) { const e = document.getElementById(id); if (e) e.remove(); } if (!on) return;
    const top = document.createElement('div'); top.id = 'r2Top';
    top.innerHTML = G.mt ? '<button type="button" data-k="quit">🏳️ Esci</button><span></span>' : '<span style="display:flex;gap:5px"><button type="button" class="big" data-k="shop">🔧 Officina</button><button type="button" class="big fi" data-k="fight">⚔️ Sfida!</button></span><span style="display:flex;gap:4px"><button type="button" class="sm" data-k="fix">🛠️<small>Ripara</small></button><button type="button" class="sm" data-k="dum">🎯<small>Nuovo</small></button><button type="button" class="sm" data-k="ai">' + (U.dumAI ? '😠<small>Attacca</small>' : '😴<small>Fermo</small>') + '</button></span>';
    ROOT().appendChild(top); top.addEventListener('pointerdown', e => e.stopPropagation());
    const onK = (k, f) => { const e = top.querySelector('[data-k=' + k + ']'); if (e) e.onclick = f; };
    onK('shop', () => goShop(G)); onK('fight', () => pickUI(G)); onK('fix', () => goDrive(G)); onK('dum', () => { spawnDummy(G); SFX.clank(0.5); }); onK('ai', e => { U.dumAI = !U.dumAI; e.currentTarget.innerHTML = U.dumAI ? '😠<small>Attacca</small>' : '😴<small>Fermo</small>'; SFX.rot(); });
    onK('quit', () => { endMatch(G); goDrive(G); });
    if (!G.mt) { const iv = document.createElement('div'); iv.id = 'r2Inv'; iv.hidden = true; ROOT().appendChild(iv); iv.addEventListener('pointerdown', e => e.stopPropagation());
      iv.onclick = e => { const bt = e.target.closest('button'), k = bt && bt.dataset.k; if (k === 'acc') liveReady(G, true); else if (k === 'cancel') liveReady(G, false); else if (k === 'no') { if (G.guest) cqNetSend({ k: 'no' }); else if (G.lv) G.lv.g = null; U.noT = now(); SFX.rot(); } }; }
    const ws = statsOf(myD()).wpn;
    const w = document.createElement('div'); w.id = 'r2W'; w.innerHTML = '<button type="button" class="tn" data-t="turn"><b>🔄</b><i>180°</i></button>' + ws.map(t => `<button type="button" data-t="${t}"><u></u><b>${WICO[t]}</b><i>${(PZ[t].lb || PZ[t].n).toUpperCase()}</i></button>`).join(''); ROOT().appendChild(w);
    // ad arco intorno al pollice: la prima arma grande nell'angolo, le altre su due anelli, il 180 per ultimo
    { const bs = [...w.querySelectorAll('button')], tn = bs[0], pr = bs[1] || tn, rest = bs.filter(x => x !== pr && x !== tn).concat(pr === tn ? [] : [tn]), n1 = Math.min(3, rest.length);
      if (pr !== tn) pr.classList.add('p1');
      const at = (bt, r, th) => { const s = bt.offsetWidth; bt.style.left = (-r * Math.sin(th) - s / 2) + 'px'; bt.style.top = (-r * Math.cos(th) - s / 2) + 'px'; };
      at(pr, 0, 0); rest.forEach((bt, i) => { const o = i >= n1, n = o ? rest.length - n1 : n1, j = o ? i - n1 : i; at(bt, o ? 150 : 84, n === 1 ? Math.PI / 4 : (o ? 0.08 : 0) + j / (n - 1) * (Math.PI / 2 - (o ? 0.16 : 0))); }); }
    const hp = document.createElement('div'); hp.id = 'r2Hp'; hp.innerHTML = '<div class="me"><span>🧑‍🔧 TU</span><em><i></i></em><s><i></i></s></div><div class="mid"><b></b><span></span></div><div class="op"><span>MANICHINO 🎯</span><em><i></i></em><s><i></i></s></div>'; ROOT().appendChild(hp);
    w.querySelectorAll('button').forEach(bt => { const t = bt.dataset.t, hold = PZ[t] && PZ[t].wpn === 'hold';
      bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bt.setPointerCapture(e.pointerId); } catch {} if (t === 'turn') { const b = G.mine; if (b && !b.ko && !b.flip) { b.turn = { to: angN(b.a + Math.PI), t: G.time }; b.rev = false; SFX.turn(); } } else if (hold) U.hold[t] = 1; else U.tap = Object.assign(U.tap || {}, { [t]: 1 }); bt.classList.add('on'); });
      const up = () => { U.hold[t] = 0; bt.classList.remove('on'); }; bt.addEventListener('pointerup', up); bt.addEventListener('pointercancel', up); bt.oncontextmenu = e => e.preventDefault(); });
  }
  function steerTo(b, d, inp) {
    if (b.ko || !d) { inp.thr = 0; inp.steer = 0; return; }
    if (b.turn) b.turn = null; const ta = Math.atan2(d.wy, d.wx); if (b.rev) { if (Math.abs(angD(ta + Math.PI, b.a)) > 2.0) b.rev = false; } else if (Math.abs(angD(ta, b.a)) > 2.0) b.rev = true;
    const want = b.rev ? ta + Math.PI : ta, df = angD(want, b.a); inp.steer = clamp(df * 2.6, -1, 1); inp.thr = (b.rev ? -0.85 : 1) * Math.max(0, Math.cos(df)) * (Math.abs(df) > 1.2 ? 0.35 : 1);
  }
  function myInput(G) {
    const b = G.mine; if (!b) return; const d = cqDir(), inp = b.inp;
    if (G.mt && G.mt.ph !== 'fight') { inp.thr = 0; inp.steer = 0; inp.sega = inp.fiamma = false; U.tap = null; return; }
    steerTo(b, d, inp);
    inp.sega = !!U.hold.sega; inp.fiamma = !!U.hold.fiamma; if (U.tap) { for (const k of ['martello', 'cannone', 'pala', 'nos', 'taser', 'mina', 'razzo', 'dischi', 'flare']) if (U.tap[k]) inp[k] = true; U.tap = null; }
    if (cq.keys[' ']) { inp.sega = inp.fiamma = true; inp.martello = inp.cannone = inp.pala = inp.taser = inp.dischi = true; }
    if (cq.keys.r && !U.rK && !b.ko && !b.flip) b.turn = { to: angN(b.a + Math.PI), t: G.time }; U.rK = !!cq.keys.r;
  }
  function uiTickDrive(G) {
    const w = document.getElementById('r2W'), b = G.mine; if (!w || !b) return; const T = G.time;
    const hp = document.getElementById('r2Hp'), m = G.mt; if (hp) { const md = hp.querySelector('.mid'); md.style.display = m ? '' : 'none';
      if (m) { const l = Math.ceil(m.ph === 'intro' ? RT : m.left), s = Math.floor(l / 60) + ':' + String(l % 60).padStart(2, '0'), bb = md.querySelector('b'); if (bb.textContent !== s) bb.textContent = s; bb.classList.toggle('sd', !!m.sd); const r = 'ROUND ' + m.r; if (md.querySelector('span').textContent !== r) md.querySelector('span').textContent = r; }
      const MT = b.team, n1 = '🧑‍🔧 TU' + (m ? ' ' + '⭐'.repeat(m.w[MT]) : ''), n2 = (m ? '⭐'.repeat(m.w[1 - MT]) + ' ' : '') + oppName(G).toUpperCase() + ' 🎯', s1 = hp.querySelector('.me span'), s2 = hp.querySelector('.op span'); if (s1.textContent !== n1) s1.textContent = n1; if (s2.textContent !== n2) s2.textContent = n2; }
    if (hp) for (const [o, s] of [[b, '.me'], [G.dummy, '.op']]) { const e = hp.querySelector(s); e.style.opacity = o ? 1 : 0; if (!o) continue;
      if (!o.hp0) o.hp0 = o.bl.reduce((a, q) => a + q.mx, 0); const c = o.bl.find(q => q.t === 'cabina'), kc = o.ko || !c ? 0 : Math.max(0, c.hp / c.mx), kt = o.ko ? 0 : Math.min(1, o.bl.reduce((a, q) => a + Math.max(0, q.hp), 0) / o.hp0), ii = e.querySelectorAll('i');
      ii[0].style.width = Math.round(kc * 100) + '%'; ii[0].style.background = kc > 0.5 ? '#3ad870' : kc > 0.25 ? '#ffb030' : '#ff4a3a'; ii[1].style.width = Math.round(kt * 100) + '%'; }
    w.querySelectorAll('button').forEach(bt => { const t = bt.dataset.t, u = bt.querySelector('u'); if (!u) return; let k = 1, col = '#3ad870';
      if (t === 'sega') { k = 1 - b.heat / 3; col = b.hot ? '#ff4a3a' : '#ffb050'; } else if (t === 'fiamma') { k = b.fuel / 3; col = b.fout ? '#8a8a90' : '#ff8a3a'; bt.style.opacity = b.fout ? 0.55 : 1; }
      else if (t === 'nos') { k = b.nosT > T ? (b.nosT - T) / 4 : b.nosUsed ? 0 : 1; col = b.nosT > T ? '#7ac8ff' : '#3ad870'; bt.style.opacity = b.nosUsed && !(b.nosT > T) ? 0.35 : 1; }
      else { const cds = Object.entries(b.cd).filter(([kk]) => kk[0] === (CDK[t] || t[0])).map(([, v]) => v), left = cds.length ? Math.max(0, Math.min(...cds) - T) : 0; k = 1 - left / PZ[t].cd; col = left > 0 ? '#8a8a90' : '#3ad870'; }
      if (PZ[t] && PZ[t].am) { const n = b.bl.filter(q => q.t === t).reduce((a, q) => a + (q.am || 0), 0), lb = (PZ[t].lb || PZ[t].n).toUpperCase() + ' ×' + n, ie = bt.querySelector('i'); if (ie.textContent !== lb) ie.textContent = lb; bt.style.opacity = n ? 1 : 0.35; if (!n) { k = 0; col = '#8a8a90'; } }
      const s = Math.round(k * 24) + col; if (bt.dataset.k === s) return; bt.dataset.k = s; u.style.background = `conic-gradient(${col} ${k * 360}deg, rgba(0,0,0,0) ${k * 360}deg)`; u.style.webkitMask = u.style.mask = 'radial-gradient(circle, transparent 58%, #000 60%)'; });
  }
  function simStep(G, dt) {
    const live = !!(G.mt && G.mt.live);
    if (!G.guest) liveHost(G);
    if (U.mode !== 'drive' && !(G.mt && G.mt.live)) return;
    if (!live && now() < U.stopT) return;
    const h = dt * (!live && now() - U.slowT < 1.1 ? 0.3 : 1);   // (dal vivo niente fermo immagine ne' rallentatore: l'amico non li avrebbe)
    if (G.mt && G.mt.live) remoteInput(G, G.dummy); else if (G.dummy) dummyAI(G, G.dummy, h);
    for (const b of G.rbs) if (!b.debris) weapons(G, b, h);
    launchQ(G); hammers(G); projectiles(G, h); flaresTick(G, h); burning(G, h); physics(G, h); mines(G); matchTick(G);
    G.rl = clamp((G.rl == null ? 1 : G.rl) + clamp((G.rlT == null ? 1 : G.rlT) - G.rl, -h / 1.2, h / 1.2), 0, 1);
    for (const b of G.rbs) b.wa = (b.wa || 0) + (Math.cos(b.a) * b.vx + Math.sin(b.a) * b.vy) * h * 4;
    const D = G.dummy; if (!G.mt && D && D.ko && G.time - D.koT > 2.6) { spawnDummy(G); U.msg = { t: G.time, s: '🎯 Ecco un altro manichino!' }; }
    const M = G.mine; if (!G.mt && M && M.ko && G.time - M.koT > 2.4) goDrive(G);
    if (M && !M.ko && U.mode === 'drive') { cq.x = M.x; cq.y = M.y; }
  }
  function matchUI(G) {
    invTick(G); const m = G.mt; if (!m) return; const T = now(), cs = U.cs || (U.cs = {}), MT = G.mine ? G.mine.team : 0;
    if (m.ph === 'intro') { const el = G.time - m.t0;
      [[0, 'ROUND ' + m.r, m.r === 1 ? 'Vince chi ne prende 2 · distruggi la cabina o buttalo giù' : 'Tu ' + m.w[MT] + ' · ' + oppName(G) + ' ' + m.w[1 - MT], 1.15], [1.2, '3', '', 0.75], [2.0, '2', '', 0.75], [2.8, '1', '', 0.75]].forEach(([t0, s, s2, d], i) => {
        const k = m.id + ':' + m.r + ':' + i; if (el >= t0 && !cs[k]) { cs[k] = 1; U.fx.push({ k: 'big', t: T, s, s2, d, c: i ? '#ffd24a' : '#f2f2f6' }); if (i) SFX.rot(); else SFX.clank(0.8); } }); }
    if (m.ph === 'over' && !document.getElementById('r2End')) {
      const win = m.w[MT] >= 2, el = document.createElement('div'); el.id = 'r2End'; if (m.opp && !m.rec) { m.rec = 1; boardResult(m.opp.k, win); }
      el.innerHTML = '<h2>' + (win ? '🏆 HAI VINTO!' : '💥 HAI PERSO') + '</h2><p>' + m.w[0] + ' a ' + m.w[1] + (win ? ' · ' + (m.live || m.opp ? oppName(G) : 'il manichino') + ' è a pezzi!' : ' · torna in officina e rinforza il robot!') + '</p><button type="button" class="go" data-k="again">🔁 Rivincita</button><button type="button" data-k="shop">🔧 Officina</button><button type="button" data-k="free">🎯 Banco di prova</button>';
      ROOT().appendChild(el); el.addEventListener('pointerdown', e => e.stopPropagation()); if (win) SFX.win(); else SFX.ko();
      el.querySelector('[data-k=again]').onclick = () => { if (m.live) liveReady(G, true); else startMatch(G, m.opp); }; el.querySelector('[data-k=shop]').onclick = () => { endMatch(G); goShop(G); }; el.querySelector('[data-k=free]').onclick = () => { endMatch(G); goDrive(G); };
    }
    if (m.ph === 'over' && m.live) { const P = document.querySelector('#r2End p'), X = oppName(G), tx = meRdy(G) ? '⏳ Aspetto che ' + X + ' accetti la rivincita…' : otherRdy(G) ? '⚔️ ' + X + ' vuole la rivincita! Tocca 🔁' : null; if (P && tx && P.textContent !== tx) P.textContent = tx;
    }
  }
  function fxEvents(G) {
    const T = now(), MT = G.mine ? G.mine.team : 0;
    for (const e of G.evs) { if (e.seen) continue; e.seen = 1; const [k, x, y, a, b] = e;
      if (k === 'bang') { SFX.bang(a); if (a > 0.55) U.stopT = Math.max(U.stopT, T + 0.03 + a * 0.05); for (let i = 0; i < 4 + a * 12; i++) U.parts.push({ x, y, z: 0.25, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, vz: 1 + Math.random() * 3, t: T, life: 0.4 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#ffe8a0' : '#ffb040', sp: 1 }); U.shake = Math.max(U.shake, a * 1.1); }
      else if (k === 'brk') { SFX.brk(); U.stopT = Math.max(U.stopT, T + 0.08); for (let i = 0; i < 14; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, vz: 2 + Math.random() * 3, t: T, life: 0.7, c: i % 3 ? '#9aa0aa' : '#ffd24a', sz: 3 }); U.shake = Math.max(U.shake, 0.7); U.fx.push({ k: 'txt', x, y, t: T, s: 'CRACK! ' + (PZ[a] ? PZ[a].n : ''), c: b === MT ? '#ff9a8a' : '#ffe8a0' }); }
      else if (k === 'h') { if (a >= 3) U.fx.push({ k: 'num', x, y, t: T, s: '-' + a, c: '#ffe8a0' }); }
      else if (k === 'lift') { SFX.lift(a); U.shake = Math.max(U.shake, 0.4 + a * 0.5); U.fx.push({ k: 'txt', x, y, t: T, s: a > 0.6 ? '⬆️ VOLA SUL CUNEO!' : '⬆️ CI SALE SOPRA!', c: '#b8e86a' }); }
      else if (k === 'launch') { SFX.launch(); U.shake = Math.max(U.shake, 1); U.slowT = T; for (let i = 0; i < 12; i++) U.parts.push({ x, y, z: 0.1, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 0.5 + Math.random(), t: T, life: 0.7, c: 'rgba(150,140,130,.8)', sz: 5 }); U.fx.push({ k: 'big', t: T, s: '🚀 IN ARIA!', c: '#ffd24a' }); }
      else if (k === 'palaFx') { if (!a) SFX.whoosh && SFX.whoosh(); }
      else if (k === 'land') { SFX.land(a); U.shake = Math.max(U.shake, a * 1.2); for (let i = 0; i < 6 + a * 10; i++) U.parts.push({ x, y, z: 0.05, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 0.4 + Math.random(), t: T, life: 0.6, c: 'rgba(150,140,130,.8)', sz: 5 }); }
      else if (k === 'flip') { SFX.flip(); U.fx.push({ k: 'big', t: T, s: b === MT ? '🙃 SEI A PANCIA IN SU!' : '🙃 RIBALTATO! Colpiscilo ora!', c: b === MT ? '#ff9a8a' : '#b8e86a' }); }
      else if (k === 'right') { SFX.right(); U.fx.push({ k: 'txt', x, y, t: T, s: '🌀 BOING! Si raddrizza', c: '#ffffff' }); }
      else if (k === 'saw') { for (let i = 0; i < 3; i++) U.parts.push({ x, y, z: 0.25, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: 1 + Math.random() * 2, t: T, life: 0.25, c: '#fff4c0', sp: 1 }); }
      else if (k === 'ham') { SFX.ham(a); if (a) U.stopT = Math.max(U.stopT, T + 0.07); U.shake = Math.max(U.shake, a ? 1 : 0.35); for (let i = 0; i < 10; i++) U.parts.push({ x, y, z: 0.05, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 0.5 + Math.random(), t: T, life: 0.6, c: 'rgba(150,140,130,.8)', sz: 5 }); if (a) U.fx.push({ k: 'txt', x, y, t: T, s: '💥 BAM!', c: '#ffd24a' }); }
      else if (k === 'shot') { SFX.shot(); U.shake = Math.max(U.shake, 0.6); U.fx.push({ k: 'smoke', x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 0.5, t: T }); }
      else if (k === 'pop') { SFX.pop(a); for (let i = 0; i < 8; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 1 + Math.random() * 2, t: T, life: 0.45, c: i % 2 ? '#ffb040' : '#ffe8a0', sp: 1 }); }
      else if (k === 'farm') { SFX.no(); }
      else if (k === 'flp') { if (a) { SFX.launch(); U.shake = Math.max(U.shake, 1); U.fx.push({ k: 'txt', x, y, t: T, s: '⏫ PEDANA!', c: '#ffd24a' }); for (let i = 0; i < 14; i++) U.parts.push({ x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, z: 0.05, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 2 + Math.random() * 3, t: T, life: 0.6, c: '#c8c0a8', sz: 3 }); } }
      else if (k === 'saw') { SFX.bang(0.25); for (let i = 0; i < 6; i++) U.parts.push({ x: x + (Math.random() - 0.5) * 0.8, y, z: 0.3, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 1 + Math.random() * 3, t: T, life: 0.35, c: Math.random() < 0.5 ? '#fff0a0' : '#ffb030', sp: 1 }); }
      else if (k === 'sd') { SFX.launch(); U.shake = Math.max(U.shake, 0.8); U.fx.push({ k: 'big', t: T, s: '⚠️ SPONDE GIÙ!', s2: 'Escono le seghe dal pavimento: ora si cade da ogni lato', c: '#ff8a5a', d: 2.8 }); }
      else if (k === 'go') { SFX.go(); U.fx.push({ k: 'big', t: T, s: 'VIA!', c: '#3ad870', d: 0.9 }); }
      else if (k === 'rend') { const w = a; U.fx.push({ k: 'big', t: T + 0.8, d: 2.9, s: w === MT ? '🏆 ROUND A TE!' : w === 1 - MT ? '💥 ROUND A ' + oppName(G).toUpperCase() : '🤝 PAREGGIO', s2: b, c: w === MT ? '#ffd24a' : w === 1 - MT ? '#ff9a8a' : '#f2f2f6' }); if (w === MT) setTimeout(() => SFX.win(), 800); }
      else if (k === 'zap') { SFX.zap(); U.fx.push({ k: 'zap', x0: a[0], y0: a[1], x1: x, y1: y, t: T }); if (b >= 0) U.fx.push({ k: 'txt', x, y, t: T, s: b === MT ? '⚡ RUOTE BLOCCATE!' : '⚡ BLOCCATO!', c: '#9ad8ff' }); }
      else if (k === 'boom') { SFX.boom(); U.shake = Math.max(U.shake, 1.3); U.fx.push({ k: 'ring', x, y, t: T, R: a || 1.2 }); U.fx.push({ k: 'smoke', x, y, t: T }); for (let i = 0; i < 30; i++) U.parts.push({ x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, z: 0.2, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, vz: 2 + Math.random() * 5, t: T, life: 0.5 + Math.random() * 0.5, c: ['#fff0a0', '#ffb030', '#ff6a2a', '#3a3a40'][i % 4], sz: 2 + Math.random() * 3 }); }
      else if (k === 'flare') { SFX.flare(); U.fx.push({ k: 'txt', x, y, t: T, s: '🎆 FLARE!', c: '#ffe08a' }); }
      else if (k === 'decoy') { U.fx.push({ k: 'txt', x, y, t: T, s: '🎯 INGANNATO!', c: '#ffd24a' }); }
      else if (k === 'rkt') { SFX.whoosh(); U.fx.push({ k: 'smoke', x, y, t: T }); if (b !== MT && !a) { U.fx.push({ k: 'big', t: T, s: '⚠️ RAZZI IN ARRIVO!', s2: (G.mine && G.mine.bl.some(q => q.t === 'flare' && q.am > 0)) ? 'Lancia i flare 🎆 al momento giusto!' : '', c: '#ff8a5a', d: 1.4 }); SFX.no(); } }
      else if (k === 'dsk') { SFX.tink(1); }
      else if (k === 'tink') { SFX.tink(a ? 1 : 0); for (let i = 0; i < 5; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: 1 + Math.random() * 2, t: T, life: 0.3, c: '#fff0a0', sp: 1 }); }
      else if (k === 'mdrop') { SFX.clank(0.2); }
      else if (k === 'empty') { if (b === MT) U.fx.push({ k: 'txt', x, y, t: T, s: '🔥 Gas finito: si ricarica…', c: '#ffb050' }); SFX.no(); }
      else if (k === 'nos') { SFX.nos(); U.shake = Math.max(U.shake, 0.8); U.fx.push({ k: 'big', t: T, s: b === MT ? '💨 NOS! TURBO!' : '💨 Turbo per ' + oppName(G) + '!', c: '#7ac8ff' }); }
      else if (k === 'ember') U.parts.push({ x, y, z: 0.4, vx: 0, vy: 0, vz: 1.2, t: T, life: 0.6, c: '#ff8a3a', sz: 2 });
      else if (k === 'fall') { SFX.fall(); U.slowT = T; U.fx.push({ k: 'big', t: T, s: b === MT ? '😱 SEI CADUTO GIÙ DAL RING!' : '💥 FUORI DAL RING!', c: b === MT ? '#ff9a8a' : '#ffd24a' }); if (b === 1 - MT && !G.mt) { G.score = (G.score || 0) + 1; SFX.win(); } }
      else if (k === 'ko') { SFX.ko(); U.stopT = Math.max(U.stopT, T + 0.14); U.slowT = T; U.shake = 1.4; for (let i = 0; i < 26; i++) U.parts.push({ x, y, z: 0.3, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, vz: 2 + Math.random() * 4, t: T, life: 0.9, c: i % 2 ? '#ffb040' : '#ffe8a0', sp: 1 }); U.fx.push({ k: 'smoke', x, y, t: T }); U.fx.push({ k: 'big', t: T, s: b === MT ? '💥 LA TUA CABINA È SALTATA!' : '💥 MANICHINO A PEZZI!', c: b === MT ? '#ff9a8a' : '#ffd24a' }); if (b === 1 - MT) { G.score = (G.score || 0) + 1; SFX.win(); } }
    }
    U.parts = U.parts.filter(p => T - p.t < p.life); if (U.parts.length > 160) U.parts.splice(0, U.parts.length - 160);
    U.fx = U.fx.filter(f => T - f.t < 2.4);
  }

  // ======================= IL GIOCO =======================
  CQ_MODES.robot = {
    n: 'Officina dei robot',
    desc: '🤖 Prototipo: costruisci il tuo robot pezzo per pezzo, col tuo personaggio alla guida, e provalo sul banco di prova.',
    maps: [['robot2', 'Banco di prova']],
    ns: [[1, 'Solo io']],
    def: { map: 'robot2', n: 1, fill: false },
    opts: () => '<div style="background:rgba(232,184,48,.12);border:1px solid rgba(232,184,48,.5);border-radius:12px;padding:8px 10px;margin:6px 0"><b>🔧 Prototipo dell\'officina</b><br><small>Costruisci il robot attaccando i pezzi dove vuoi (le armi sopra telaio e corazza), poi guidalo sul banco di prova: sfida il manichino che ti dà la caccia: lancialo in aria o fallo a pezzi. (Per ora da soli: i combattimenti arrivano dopo.)</small></div>',
    read: () => ({}),
    start(G) { Object.assign(U, U0()); G.rbs = []; G.proj = []; G.hams = []; G.evs = []; G.cT = {}; G.mine = null; G.dummy = null; G.score = 0; G.mt = null; G.rl = 1; G.rlT = 1; G.sawOn = 0; G.sawZ = 0; spawnDummy(G); cq.bg = null; },
    gstart(G) { Object.assign(U, U0()); G.rbs = []; G.proj = []; G.hams = []; G.evs = []; G.cT = {}; G.mine = null; G.dummy = null; G.score = 0; G.mt = null; G.rl = 1; G.rlT = 1; G.sawOn = 0; G.sawZ = 0; spawnDummy(G); cq.bg = null; },
    hide: c => { const G = cq.g; return !!G && c !== G.me; },
    intro: () => '🔧 Si accendono le luci dell\'officina…',
    voice: () => 1,
    speed: () => 0,
    night: () => ({ a: 0.42, r: 7, lights: [...JUNK.lamps.map(([x, y]) => [x, y, 6.5, 1]), ...JUNK.fires.map(([x, y]) => [x, y, 3.2, 0.9]), [ARX, ARY, ARR * 0.95, 0.75]], see: () => true }),
    hud: G => G.mt ? '⚔️ ' + (G.mt.live ? 'Dal vivo contro ' : 'Contro ') + (G.mt.live || G.mt.opp ? esc(oppName(G)) : 'il manichino') + ' · al meglio di 3 round' : U.mode === 'drive' ? '🤖 Banco di prova · 🎯 manichini abbattuti: ' + (G.score || 0) : '🔧 Officina dei robot · prototipo',
    big() { return ''; },   // (le scritte del gioco passano da U.fx: quella del motore copriva le barre della vita)
    view(G) {
      const V = G.vw || (G.vw = { z: 0.8, x: 0, y: 0 }); let tx = 0, ty = 0, tz = 0.8; const k = 0.1;
      if (U.mode !== 'drive') { tx = 4; ty = 4; tz = 0.9; }
      else { const D = G.dummy && !G.dummy.fall ? G.dummy : null, b = G.mine; if (b && D) { const dx = D.x - b.x, dy = D.y - b.y, d = Math.hypot(dx, dy); tx = dx * 0.42; ty = dy * 0.42; tz = clamp(1.02 - d * 0.04, 0.6, 0.98); } }
      const sh = U.shake; V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k;
      return { z: V.z, x: V.x + (Math.random() - 0.5) * sh * 0.25, y: V.y + (Math.random() - 0.5) * sh * 0.25 };
    },
    tick(G, dt) { if (!G.guest) simStep(G, dt); },   // (sull'amico il giro lo fa local)
    snap: G => liveSnap(G),
    apply: (G, x) => liveApply(G, x),
    ev: (G, c, o) => liveEv(G, c, o),
    local(G, dt) {
      if (U.mode === '') { U.mode = 'shop'; shopUI(G, true); }
      if (U.mode === 'shop') { previewTick(G); const T = now(); if (Object.values(U.pops).some(p => T - p < 0.3)) shopRender(); return; }
      if (G.guest && G.mt && G.mt.live) guestLive(G, dt); else { myInput(G); if (G.guest) simStep(G, dt); }
      fxEvents(G); uiTickDrive(G); matchUI(G);
      if (U.msg && !U.msg.shown) { U.msg.shown = 1; U.fx.push({ k: 'big', t: now(), s: U.msg.s, c: '#f2f2f6', d: 2.2 }); }
      U.shake = Math.max(0, U.shake - dt * 3);
      const b = G.mine; if (b) hum(Math.hypot(b.vx, b.vy), b.act && b.act.sega, !b.ko);
    },
    draw(c) {
      const G = cq.g; if (!G || c !== G.me) return null;
      if (!c.__r2) { c.__r2 = (g, X, Y, TW) => { const G2 = cq.g; if (!G2) return; const b = U.mode === 'drive' ? G2.mine : null; if (!b) return; drawBody(g, X, Y, TW, b, { look: cqLookOf(G2.me), T: G2.time, jit: U.shake }); }; c.__r2.box = [3.8, 6.0, 2.6]; c.__r2.top = 1.6; c.__r2.anon = 1; }
      return c.__r2;
    },
    extras(G) {
      const L = []; if (U.mode !== 'drive') return L; G.__xd = G.__xd || {};
      for (const it of mineItems(G)) L.push(it);
      for (const b of G.gdeb ? G.rbs.concat(G.gdeb) : G.rbs) { if (b === G.mine || !b.bl.length) continue; const id = b.uid || (b.uid = 'b' + (G.uidN = (G.uidN || 0) + 1));
        let d = G.__xd[id]; if (!d) { d = G.__xd[id] = (g, X, Y, TW) => drawBody(g, X, Y, TW, d.b, { look: d.b.look || (d.b.dummy ? DUMMY_LOOK : null), T: cq.g.time }); d.box = b.debris ? [1.2, 3.0, 0.9] : [3.8, 6.0, 2.6]; d.top = 1.6; }
        d.b = b; L.push({ x: b.x, y: b.y, L: null, w: 0, f: 1, name: null, all: true, dr: d }); }
      return L;
    },
    over(g, G, sx, sy, TW) {
      if (U.mode !== 'drive') return; const T = now(), Uz = TW * 0.575, P3 = (x, y, z) => [sx(x, y), sy(x, y) - z * Uz];
      for (const b of G.rbs) if (b.act && b.act.fiamma) for (const q of b.bl) if (q.t === 'fiamma') { const [x, y] = wpos(b, q), fa = b.a + q.d * Math.PI / 2, z0 = (b.z || 0) + (q.over ? (BH[q.on] || 0) * BS : 0) + 0.35;
        for (let i = 0; i < 14; i++) { const ph = (T * 3 + i / 14) % 1, d = (0.3 + ph * 1.4) * BS, an = fa + Math.sin(i * 7.3 + T * 5) * 0.4, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d, [X, Y] = P3(px, py, z0 + ph * 0.3); g.fillStyle = ph < 0.3 ? '#fff0a0' : ph < 0.6 ? '#ffa030' : 'rgba(220,60,20,.75)'; g.beginPath(); g.arc(X, Y, TW * (0.07 + ph * 0.22) * BS, 0, 7); g.fill(); } }
      for (const b of G.rbs) if (!b.debris && !b.fall) for (const q of b.bl) { const hk = q.mx ? q.hp / q.mx : 1; if (hk > 0.45) continue; const [x, y] = wpos(b, q), sd = ((q.gx * 7 + q.gy * 13) % 10) / 10, z0 = (b.z || 0) + 0.45;
        for (let i = 0; i < 3; i++) { const ph = (T * 0.7 + sd + i / 3) % 1, [X, Y] = P3(x + Math.sin(sd * 9 + ph * 3) * 0.15, y - ph * 0.2, z0 + ph * 1.3); g.fillStyle = 'rgba(' + (hk < 0.2 ? '38,36,40' : '120,120,126') + ',' + (0.5 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, TW * (0.06 + ph * 0.16) * BS, 0, 7); g.fill(); }
        if (hk < 0.2) { const fl = 0.5 + 0.5 * Math.sin(T * 31 + sd * 40), [X, Y] = P3(x, y, z0); g.fillStyle = 'rgba(255,' + Math.round(120 + fl * 90) + ',40,' + (0.5 + fl * 0.4).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, TW * (0.04 + fl * 0.04) * BS, 0, 7); g.fill(); } }
      for (const f of G.flr || []) { const a = G.time - f.t; if (a > 2.6) continue; const k = 1 - a / 2.6, [X, Y] = P3(f.x, f.y, f.z); g.fillStyle = 'rgba(255,220,140,' + (0.35 * k).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, TW * 0.3 * k + 2, 0, 7); g.fill(); g.fillStyle = Math.random() < 0.5 ? '#fffbe0' : '#ffe08a'; g.beginPath(); g.arc(X, Y, Math.max(2, TW * 0.06), 0, 7); g.fill(); }
      for (const [fx0, fy0, ph, zb] of JUNK.flies) { const k = Math.max(0, Math.sin(T * 1.1 + ph * 3)), al = k * k * k; if (al < 0.05) continue; const x = fx0 + Math.sin(T * 0.4 + ph) * 0.5, y = fy0 + Math.cos(T * 0.33 + ph * 2) * 0.5, [X, Y] = P3(x, y, jH(x, y) + zb + Math.sin(T * 0.9 + ph) * 0.2);
        g.fillStyle = 'rgba(210,255,120,' + (0.22 * al).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, Math.max(3, TW * 0.11), 0, 7); g.fill(); g.fillStyle = 'rgba(240,255,190,' + (0.9 * al).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, Math.max(1.2, TW * 0.03), 0, 7); g.fill(); }
      for (const [fx, fy] of JUNK.fires) { const z0 = jH(fx, fy) + 0.7;
        for (let i = 0; i < 5; i++) { const ph = (T * 2.2 + i / 5) % 1, ox = Math.sin(i * 2.3 + T * 4) * 0.12, [X, Y] = P3(fx + ox, fy, z0 + ph * 0.6), hh = TW * 0.24 * (1 - ph); g.fillStyle = ph < 0.35 ? '#ffe070' : ph < 0.7 ? '#ff8a2a' : 'rgba(200,60,20,.6)'; g.beginPath(); g.moveTo(X, Y - hh); g.quadraticCurveTo(X + TW * 0.08, Y, X, Y + TW * 0.04); g.quadraticCurveTo(X - TW * 0.08, Y, X, Y - hh); g.fill(); }
        for (let i = 0; i < 3; i++) { const ph = (T * 0.6 + i / 3 + fx) % 1, [X, Y] = P3(fx + Math.sin(ph * 6 + i) * 0.2, fy, z0 + 0.4 + ph * 2.2); g.fillStyle = 'rgba(255,170,80,' + (0.8 * (1 - ph)).toFixed(2) + ')'; g.fillRect(X - 1, Y - 1, 2, 2); } }
      for (const [sx0, sy0] of JUNK.smokes) { const z0 = jH(sx0, sy0) + 0.6; for (let i = 0; i < 5; i++) { const ph = (T * 0.25 + i / 5) % 1, [X, Y] = P3(sx0 + ph * 0.8, sy0 - ph * 0.3, z0 + ph * 2.5); g.fillStyle = 'rgba(70,70,76,' + (0.4 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(X, Y, TW * (0.12 + ph * 0.35), 0, 7); g.fill(); } }
      for (const b of G.rbs) if (b.stun > G.time && !b.debris) for (let i = 0; i < 3; i++) { const an = Math.random() * 6.28, rr0 = (b.R || 1) * (0.5 + Math.random() * 0.5), [X, Y] = P3(b.x + Math.cos(an) * rr0, b.y + Math.sin(an) * rr0, (b.z || 0) + 0.3 + Math.random() * 0.4); g.strokeStyle = Math.random() < 0.5 ? '#bfe8ff' : '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); for (let k = 0; k < 3; k++) g.lineTo(X + (Math.random() - 0.5) * TW * 0.4, Y + (Math.random() - 0.5) * TW * 0.4); g.stroke(); }
      for (const p of G.proj) { if (p.k) { proj2(g, p, P3, sx, sy, TW, T); continue; } const [X, Y] = P3(p.x, p.y, p.z || 0.3); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx(p.x, p.y), sy(p.x, p.y), TW * 0.1, TW * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#1a1c22'; g.beginPath(); g.arc(X, Y, Math.max(3, TW * 0.11), 0, 7); g.fill(); g.fillStyle = 'rgba(255,210,74,.6)'; for (let k = 1; k < 4; k++) { const [Xs, Ys] = P3(p.x - p.dx * k * 0.2, p.y - p.dy * k * 0.2, p.z || 0.3); g.beginPath(); g.arc(Xs, Ys, TW * 0.06 * (1 - k * 0.2), 0, 7); g.fill(); } }
      for (const p of U.parts) { const a = T - p.t, x = p.x + p.vx * a, y = p.y + p.vy * a, z = Math.max(0, p.z + p.vz * a - 5 * a * a), [X, Y] = P3(x, y, z); g.globalAlpha = Math.max(0, 1 - a / p.life);
        if (p.sp) { const [X2, Y2] = P3(x - p.vx * 0.03, y - p.vy * 0.03, Math.max(0, z - (p.vz - 10 * a) * 0.03)); g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); g.lineTo(X2, Y2); g.stroke(); } else { g.fillStyle = p.c; g.beginPath(); g.arc(X, Y, p.sz || 2.5, 0, 7); g.fill(); } }
      g.globalAlpha = 1;
      const lastBig = U.fx.filter(f => f.k === 'big' && T >= f.t).pop();
      for (const f of U.fx) { const a = T - f.t;
        if (f.k === 'zap') { if (a < 0.28) { const [X0, Y0] = P3(f.x0, f.y0, 0.35), [X1, Y1] = P3(f.x1, f.y1, 0.3); for (const [w, c] of [[Math.max(4, TW * 0.08), 'rgba(120,200,255,.55)'], [Math.max(1.5, TW * 0.03), '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(X0, Y0); for (let i = 1; i < 7; i++) { const k = i / 7; g.lineTo(X0 + (X1 - X0) * k + (Math.random() - 0.5) * TW * 0.35, Y0 + (Y1 - Y0) * k + (Math.random() - 0.5) * TW * 0.35); } g.lineTo(X1, Y1); g.stroke(); } } continue; }
        if (f.k === 'ring') { if (a < 0.45) { const [X, Y] = P3(f.x, f.y, 0.05), r = (0.3 + a / 0.45 * f.R) * TW * 0.707; g.strokeStyle = 'rgba(255,210,120,' + (0.8 * (1 - a / 0.45)).toFixed(2) + ')'; g.lineWidth = Math.max(2, TW * 0.1 * (1 - a / 0.45)); g.beginPath(); g.ellipse(X, Y, r, r / 2, 0, 0, 7); g.stroke(); } continue; }
        if (f.k === 'smoke' && a < 1) { for (let i = 0; i < 5; i++) { const an = i * 1.26, d = a * 0.8; g.fillStyle = 'rgba(90,90,96,' + (0.5 * (1 - a)) + ')'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * d * 0.4, f.y + Math.sin(an) * d * 0.4), sy(f.x, f.y) - (0.3 + a * 0.8) * Uz, TW * (0.08 + a * 0.15), 0, 7); g.fill(); } }
        else if ((f.k === 'num' || f.k === 'txt') && a < 1.4) { g.save(); g.globalAlpha = Math.min(1, (1.4 - a) * 3); g.font = '900 ' + Math.round(Math.max(13, TW * (f.k === 'num' ? 0.3 : 0.26))) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,14,.85)'; const [X, Y] = P3(f.x, f.y, 1.4 + a * 0.7); g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
        else if (f.k === 'big' && f === lastBig && a < (f.d || 2.4)) { g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const k = Math.min(1, a / 0.18), sc = 1 + 0.35 * (1 - k); g.globalAlpha = Math.min(1, ((f.d || 2.4) - a) * 2); g.translate(cq.w / 2, cq.h * 0.34); g.scale(sc, sc); g.font = '900 25px system-ui'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = '#140c10'; g.strokeText(f.s, 0, 0, cq.w * 0.92); g.fillStyle = f.c; g.fillText(f.s, 0, 0, cq.w * 0.92); if (f.s2) { g.font = '800 14px system-ui'; g.lineWidth = 5; g.strokeText(f.s2, 0, 26, cq.w * 0.92); g.fillStyle = '#f2f2f6'; g.fillText(f.s2, 0, 26, cq.w * 0.92); } g.restore(); } }
      if (now() - U.slowT < 1.1) { const k = Math.min(1, (now() - U.slowT) * 4) * Math.min(1, (1.1 - (now() - U.slowT)) * 3), W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7); gr.addColorStop(0, 'rgba(10,10,20,0)'); gr.addColorStop(1, 'rgba(10,10,20,' + 0.55 * k + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
    }
  };
  cqEachFrame(() => { const G = cq.g; if (!G || G.mode !== 'robot' || G.phase !== 'play') { if (document.getElementById('r2Shop') || document.getElementById('r2W') || document.getElementById('r2Top')) { shopUI(G || {}, false); driveUI(G || {}, false); } if (HUM.o) hum(0, false, false); if (U.mode && (!G || G.mode !== 'robot')) U.mode = ''; } });
  window.__robot = { enemyOf, launchQ, boom, mines, covered, liveSnap, liveApply, liveEv, guestLive, startLive, liveReady, friend, pubRobot, boardUI, pickUI, thumbOf, endMatch, simStep, RT, ARX, ARY, ARR, JUNK, jH, startMatch, nextRound, matchTick, rem, AX0, AX1, AY0, AY1, U, PZ, MODELS, MAXW, mirrorCell, wOf, GC, GN, B, BS, PIT, SPAWN, DUMMY, makeBody, mass, linked, statsOf, physics, collide, weapons, hammers, projectiles, breakBlock, hurt, wpos, myD, saveD, cleanD, put, goDrive, goShop, spawnDummy, drawBody, icon, topPiece, myInput, launch };
})();
