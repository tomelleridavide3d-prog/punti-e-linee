// L'officina dei robot (gioco 1 contro 1, vedi CLAUDE.md "OFFICINA DEI ROBOT").
// Nello scantinato dell'hotel: ognuno MONTA IN SEGRETO il suo robot da combattimento su 5 posti (davanti, destra, dietro, sinistra, sopra):
// al massimo 3 armi (pala, sega, fiamma, cannone, scossa), il resto difese (corazza + una difesa "contro" ogni tipo di danno), ruote o cingoli.
// Ogni pezzo pesa (piu' lento ma piu' difficile da spingere) e si consuma; un'arma lavora solo dal suo lato, una difesa protegge solo il suo lato:
// bisogna girare intorno all'altro. Poi si alza la tenda (si vede il robot e il pentagono dell'altro) e si combatte nell'arena della manche
// (Segheria, Centralina, Caldaia: in ordine diverso ogni partita, annunciata prima di montare), che si combina con le armi.
// Vince la manche chi butta l'altro nella fossa, lo ribalta (senza barra) o lo smonta; al meglio di 3. Il computer e' il meccanico Nonno Bullone.
(() => {
  const W = 24, H = 20, AX0 = 4, AX1 = 20, AY0 = 4, AY1 = 16, MX = 12, MY = 10, RR = 0.42;
  const START = [[6.6, 10, 0], [17.4, 10, Math.PI]];
  const B_T0 = 45, B_T1 = 30, REVEAL = 4.4, FIGHT = 90, MEAN = 30, KO = 2.8, MRES = 7, WINS = 2, MAXR = 4, TEL = 50, MAXW = 3;
  const SLA = [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0], SLN = ['davanti', 'destra', 'dietro', 'sinistra', 'sopra'], SLS = ['DAVANTI', 'DESTRA', 'DIETRO', 'SINISTRA', 'SOPRA'];
  const TY = { cut: { n: 'taglio', c: '#e2eaf2' }, fire: { n: 'fuoco', c: '#ff8a3a' }, zap: { n: 'scossa', c: '#7ae0ff' }, hit: { n: 'urto', c: '#ffd24a' }, flip: { n: 'ribaltamento', c: '#b8e86a' } };
  // top: 0 = non va sopra, 1 = anche sopra, 2 = solo sopra
  const PZ = {
    pala: { k: 'w', n: 'Pala', i: '🚜', t: 'flip', cd: 4, u: 8, hp: 14, wt: 1.5, top: 0, c: '#f0c030', d: 'Da vicino <b>lancia</b> l\'altro di 2 caselle (sulle trappole!). Se lo prendi di <b>fianco o da dietro</b> lo <b>ribalta</b>. La ferma la <b>barra</b>.' },
    sega: { k: 'w', n: 'Sega', i: '🪚', t: 'cut', cd: 3, u: 10, hp: 14, wt: 1.5, top: 0, c: '#d0d8e0', d: 'Il danno più forte, ma solo <b>a contatto</b>: taglia per 1,5 secondi. La fermano le <b>piastre d\'acciaio</b>.' },
    fiamma: { k: 'w', n: 'Fiamma', i: '🔥', t: 'fire', cd: 5, u: 6, hp: 12, wt: 1, top: 0, c: '#c8382e', d: 'Getto di <b>2 caselle</b>: l\'altro resta <b>in fiamme</b> 3 secondi, e l\'<b>olio</b> prende fuoco. La ferma l\'<b>ignifugo</b>.' },
    cannone: { k: 'w', n: 'Cannone', i: '💣', t: 'hit', cd: 6, u: 5, hp: 14, wt: 2, top: 1, c: '#3a3e48', d: 'Spara <b>lontano</b> e dritto e <b>spinge</b> indietro. <b>Sopra</b> diventa una torretta che mira da sola (ricarica più lenta). Lo fermano gli <b>ammortizzatori</b>.' },
    scossa: { k: 'w', n: 'Scossa', i: '⚡', t: 'zap', cd: 7, u: 5, hp: 12, wt: 1.5, top: 1, c: '#d08a3a', d: 'Scarica <b>tutto intorno</b> (da qualsiasi posto): spegne i motori dell\'altro per 1 secondo. Se è in una <b>pozzanghera</b> arriva lontano! La ferma la <b>gomma</b>.' },
    corazza: { k: 'd', n: 'Corazza', i: '🛡️', t: '', hp: 24, wt: 2, top: 1, c: '#8c949e', d: 'Un po\' contro <b>tutto</b>, ma pesa. <b>Sopra</b> protegge il telaio un po\' da tutto.' },
    piastre: { k: 'd', n: 'Acciaio', i: '🔩', t: 'cut', hp: 20, wt: 2, top: 1, c: '#c0ccd8', d: 'Piastre d\'acciaio: fermano la <b>sega</b>. <b>Sopra</b> riparano anche dalle <b>lame</b> del pavimento.' },
    ignif: { k: 'd', n: 'Ignifugo', i: '🧯', t: 'fire', hp: 18, wt: 1, top: 1, c: '#d8643a', d: 'Ferma il <b>fuoco</b>. <b>Sopra</b> ripara anche dall\'olio in fiamme. Leggero.' },
    gomma: { k: 'd', n: 'Gomma', i: '⚫', t: 'zap', hp: 18, wt: 1, top: 1, c: '#2a2a30', d: 'Ferma la <b>scossa</b> e non ti fa spegnere i motori. <b>Sopra</b> ripara anche dal recinto e dalle pozzanghere. Leggera.' },
    ammo: { k: 'd', n: 'Molle', i: '🌀', t: 'hit', hp: 20, wt: 1.5, top: 1, c: '#5e8a5e', d: 'Ammortizzatori: fermano gli <b>urti</b> (cannone) e ti fanno volare meno lontano. <b>Sopra</b> riparano dal <b>martello</b>.' },
    barra: { k: 'd', n: 'Barra', i: '🔄', t: 'flip', hp: 10, wt: 1, top: 2, c: '#e8e8f0', d: 'Solo <b>sopra</b>: se ti ribaltano ti <b>raddrizza</b> (una volta). Senza barra, ribaltato = manche persa.' }
  };
  const WPN = ['pala', 'sega', 'fiamma', 'cannone', 'scossa'], DEF = ['corazza', 'piastre', 'ignif', 'gomma', 'ammo', 'barra'];
  const MOV = { r: { n: 'Ruote', i: '🛞', sp: 2.7, tr: 5.2, ac: 8, pu: 1.0, oil: 0.22, d: 'Veloci e agili, ma sull\'<b>olio</b> slittano.' }, c: { n: 'Cingoli', i: '⛓️', sp: 2.0, tr: 3.4, ac: 6, pu: 1.7, oil: 0.85, d: 'Lenti ma <b>spingono forte</b>, non slittano e si ribaltano meno.' } };
  const SIDE = [{ c: '#e0662e', d: '#8a3414', n: 'arancione' }, { c: '#2e86d8', d: '#14448a', n: 'blu' }];
  // LE ARENE (lo scantinato cambia a ogni manche)
  const ARENE = {
    seg: { n: 'La Segheria', i: '🪚', d: 'Lame che escono dal pavimento e una <b>fossa</b> in mezzo. La <b>pala</b> e il <b>cannone</b> ci buttano l\'altro; le <b>piastre</b> sopra riparano dalle lame.' },
    cen: { n: 'La Centralina', i: '⚡', d: '<b>Recinto elettrico</b> lungo i muri e <b>pozzanghere</b>: la <b>scossa</b> arriva lontano a chi ci sta dentro. La <b>gomma</b> salva.' },
    cal: { n: 'La Caldaia', i: '🔥', d: '<b>Olio</b> per terra (le ruote slittano: la <b>fiamma</b> lo accende), bocche di fuoco e il <b>martello gigante</b>. Ignifugo e molle sopra aiutano.' }
  };
  const FOSSA = [MX, MY], FR0 = 1.25, FR1 = 1.85;
  const BLADES = [[8.4, 6.7, 0], [15.6, 6.7, 0], [8.4, 13.3, 0], [15.6, 13.3, 0], [12, 6.0, 1], [12, 14.0, 1], [7.0, 10, 1], [17.0, 10, 1]];
  const PUDS = [[8.3, 6.9, 1.15], [15.7, 6.9, 1.15], [8.3, 13.1, 1.15], [15.7, 13.1, 1.15], [12, 6.3, 0.85], [12, 13.7, 0.85]];
  const TRAFO = [MX, MY, 0.85];
  const OILS = [[8.7, 7.0, 1.15], [15.3, 13.0, 1.15], [12, 10, 1.25], [8.7, 13.2, 0.95], [15.3, 6.8, 0.95]];
  const VENTS = [[12, AY0 + 0.1, Math.PI / 2], [12, AY1 - 0.1, -Math.PI / 2]], VLEN = 3.4, VANG = 0.36;
  const HAMS = [[9.0, 10], [15.0, 10], [12, 7.2], [12, 12.8]];
  const now = () => performance.now() / 1000;
  const r2 = v => Math.round(v * 100) / 100;
  const angN = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
  const angD = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const U0 = () => ({ ph: '', evSeen: 0, fx: [], R: null, sel: 0, tPrev: null, tAt: 0, fr: null, frT: 0, deb: [], seen: {}, shake: 0, slow: 0, hot: {} });
  const U = U0();

  // ======================= LO SCANTINATO (mappa) =======================
  function mapRobot() {
    const rooms = [{ n: 'Arena', x: AX0, y: AY0, w: AX1 - AX0, h: AY1 - AY0, k: 'metal', vk: 'metal', c: ['#4a4e56', '#474b53'], wc: '#3a3e46', nl: 1 }];
    return { w: W, h: H, rooms, doors: [], decals: [], props: [], trees: [], tasks: [], hall: 0, cams: [], vending: [], ring: [[6, 10], [17, 10]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Arena: 'nell\'arena' }, help: '', btnTxt: '', sabTxt: '', pxFloor: floorArena, drawWall, bg: () => '#14161c', sky: skyDraw };
  }
  CQ_MAPS.robot = { n: 'Scantinato dell\'officina', make: mapRobot, only: 'robot' };
  const hsh = (x, y, k) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 7, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  const arOf = () => { const G = cq.g; return G && G.mode === 'robot' && G.st ? G.st.ar : 'seg'; };
  // pavimento: lamiera striata, il bordo giallo e nero, e le cose dell'arena di questa manche (fessure delle lame, fossa, pozzanghere, olio)
  function floorArena(K, x, y) {
    const { g, S, poly, TW } = K, P = (u, v) => S(x + u, y + v, 0), ar = arOf();
    poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], (x + y) % 2 ? '#4c5058' : '#484c54');
    if (TW >= 26) {
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = Math.max(1, TW / 50); g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(1, 0)); g.moveTo(...P(0, 0)); g.lineTo(...P(0, 1)); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 6; i++) { const u = 0.12 + (i % 3) * 0.32, v = 0.18 + Math.floor(i / 3) * 0.5 + (i % 2) * 0.12, [X, Y] = P(u, v); g.fillRect(X - TW * 0.05, Y - 1, TW * 0.1, 2); }
      for (const [u, v] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) { const [X, Y] = P(u, v); g.fillStyle = '#2e3138'; g.beginPath(); g.arc(X, Y, Math.max(1.2, TW / 34), 0, 7); g.fill(); }
      if (hsh(x, y, 3) < 0.18) { const [X, Y] = P(0.3 + 0.4 * hsh(x, y, 4), 0.3 + 0.4 * hsh(x, y, 5)); g.fillStyle = 'rgba(20,16,10,.22)'; g.beginPath(); g.ellipse(X, Y, TW * 0.2, TW * 0.08, 0, 0, 7); g.fill(); }
    }
    // striscia gialla e nera lungo il bordo dell'arena
    const edge = (x === AX0 ? 1 : 0) | (x === AX1 - 1 ? 2 : 0) | (y === AY0 ? 4 : 0) | (y === AY1 - 1 ? 8 : 0);
    if (edge) { const k = 0.16; const st = (a, b, c, d) => { for (let i = 0; i < 4; i++) { const u0 = i / 4, u1 = (i + 1) / 4; const q = a ? [P(0, u0), P(k, u0), P(k, u1), P(0, u1)] : b ? [P(1 - k, u0), P(1, u0), P(1, u1), P(1 - k, u1)] : c ? [P(u0, 0), P(u1, 0), P(u1, k), P(u0, k)] : [P(u0, 1 - k), P(u1, 1 - k), P(u1, 1), P(u0, 1)]; poly(q, (i + x + y) % 2 ? '#e8b830' : '#1c1c20'); } };
      if (edge & 1) st(1, 0, 0, 0); if (edge & 2) st(0, 1, 0, 0); if (edge & 4) st(0, 0, 1, 0); if (edge & 8) st(0, 0, 0, 1); }
    // cose dell'arena (ognuna ritagliata nella sua casella)
    g.save(); g.beginPath(); { const q = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]; g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); } g.clip();
    const near = (cx, cy, r) => cx + r > x - 0.1 && cx - r < x + 1.1 && cy + r > y - 0.1 && cy - r < y + 1.1;
    const disc = (cx, cy, r, col, z = 0) => { g.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.2832, [X, Y] = S(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.fillStyle = col; g.fill(); };
    if (ar === 'seg') {
      const G = cq.g, fr = G && G.st && G.st.fr ? FR1 : FR0;
      if (near(FOSSA[0], FOSSA[1], fr + 0.3)) { for (let i = 0; i < 12; i++) { const a0 = i / 12 * 6.2832, a1 = (i + 1) / 12 * 6.2832, R1 = fr + 0.22; g.beginPath(); for (const [a, r] of [[a0, fr], [a1, fr], [a1, R1], [a0, R1]]) g.lineTo(...S(FOSSA[0] + Math.cos(a) * r, FOSSA[1] + Math.sin(a) * r, 0)); g.closePath(); g.fillStyle = i % 2 ? '#e8b830' : '#1c1c20'; g.fill(); }
        disc(FOSSA[0], FOSSA[1], fr, '#08080a'); disc(FOSSA[0] - 0.12, FOSSA[1] - 0.12, fr * 0.86, '#020203');
        g.fillStyle = '#3a2a2a'; g.beginPath(); for (let i = 0; i <= 14; i++) { const a = -2.36 + i / 14 * 3.14, [X, Y] = S(FOSSA[0] + Math.cos(a) * fr, FOSSA[1] + Math.sin(a) * fr, 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } for (let i = 14; i >= 0; i--) { const a = -2.36 + i / 14 * 3.14, [X, Y] = S(FOSSA[0] + Math.cos(a) * fr * 0.97, FOSSA[1] + Math.sin(a) * fr * 0.97, -0.35); g.lineTo(X, Y); } g.fill(); }
      for (const b of BLADES) { const [bx, by, o] = b, hx = o ? 0.18 : 0.95, hy = o ? 0.95 : 0.18; if (!near(bx, by, 1.1)) continue;
        poly([S(bx - hx, by - hy, 0), S(bx + hx, by - hy, 0), S(bx + hx, by + hy, 0), S(bx - hx, by + hy, 0)], '#1a1a1e');
        poly([S(bx - hx + 0.06, by - hy + 0.06, 0), S(bx + hx - 0.06, by - hy + 0.06, 0), S(bx + hx - 0.06, by + hy - 0.06, 0), S(bx - hx + 0.06, by + hy - 0.06, 0)], '#060608');
        for (const s of [-1, 1]) { const q = o ? [S(bx - hx - 0.12, by + s * (hy + 0.05), 0), S(bx + hx + 0.12, by + s * (hy + 0.05), 0), S(bx + hx + 0.12, by + s * (hy + 0.15), 0), S(bx - hx - 0.12, by + s * (hy + 0.15), 0)] : [S(bx + s * (hx + 0.05), by - hy - 0.12, 0), S(bx + s * (hx + 0.15), by - hy - 0.12, 0), S(bx + s * (hx + 0.15), by + hy + 0.12, 0), S(bx + s * (hx + 0.05), by + hy + 0.12, 0)]; poly(q, '#c83a2a'); } }
    } else if (ar === 'cen') {
      for (const [px, py, r] of PUDS) { if (!near(px, py, r + 0.1)) continue; disc(px, py, r, '#2a4058'); disc(px - 0.08, py - 0.06, r * 0.82, '#3a5878'); disc(px - 0.25, py - 0.2, r * 0.3, '#5a7a9a'); }
      if (near(TRAFO[0], TRAFO[1], 1.3)) { disc(TRAFO[0], TRAFO[1], 1.15, '#e8b830'); disc(TRAFO[0], TRAFO[1], 1.0, '#1c1c20'); }
    } else if (ar === 'cal') {
      for (const [px, py, r] of OILS) { if (!near(px, py, r + 0.1)) continue; disc(px, py, r, '#121014'); disc(px + 0.05, py - 0.04, r * 0.85, '#1c1820'); g.globalAlpha = 0.35; disc(px - 0.2, py - 0.25, r * 0.35, '#6a4a8a'); disc(px + 0.25, py + 0.1, r * 0.22, '#3a7a6a'); g.globalAlpha = 1; }
      for (const [hx, hy] of HAMS) { if (!near(hx, hy, 1)) continue; disc(hx, hy, 0.85, '#3a3438'); disc(hx, hy, 0.72, '#4a4448'); for (let i = 0; i < 6; i++) { const a = i * 1.047, [X, Y] = S(hx + Math.cos(a) * 0.5, hy + Math.sin(a) * 0.5, 0); g.fillStyle = '#2a2428'; g.fillRect(X - 2, Y - 1, 4, 2); } }
      for (const [vx, vy] of VENTS) { if (!near(vx, vy, 1.3)) continue; disc(vx, vy, 0.55, '#2a1a14'); disc(vx, vy, 0.4, '#c84a1a'); disc(vx, vy, 0.25, '#1a0a06'); }
    }
    g.restore();
  }
  // muri dell'arena: dietro (x = 3, y = 3) mattoni alti con i tubi, davanti barriere basse; con la Centralina il recinto elettrico
  function drawWall(K, x, y) {
    const { bx, S, g, TW, poly } = K, ar = arOf();
    const back = (x === AX0 - 1 && y >= AY0 - 1 && y <= AY1) || (y === AY0 - 1 && x >= AX0 - 1 && x <= AX1);
    if (back) {
      const HT = 2.4, alongX = y === AY0 - 1 && x >= AX0 && x < AX1;
      if (x === AX0 - 1 && y === AY0 - 1) { bx(x + 0.55, y + 0.55, x + 1, y + 1, 0, HT + 0.1, '#4a2e28'); return; }
      if (alongX) { const Y = AY0; poly([S(x, Y, 0), S(x + 1, Y, 0), S(x + 1, Y, HT), S(x, Y, HT)], '#5a3a32'); bricks(K, x, x + 1, Y, HT, 'x'); }
      else if (x === AX0 - 1 && y >= AY0 && y < AY1) { const X = AX0; poly([S(X, y, 0), S(X, y + 1, 0), S(X, y + 1, HT), S(X, y, HT)], '#4e322c'); bricks(K, y, y + 1, X, HT, 'y'); }
      // tubi lungo i muri dietro
      if (alongX) { pipe(K, x, x + 1, AY0 + 0.12, 1.75, 'x', '#8a7a5a'); pipe(K, x, x + 1, AY0 + 0.1, 2.05, 'x', '#6a7a8a'); if (x % 5 === 2) { bx(x + 0.4, AY0, x + 0.6, AY0 + 0.18, 0.4, 2.2, '#6a6058'); } }
      else if (x === AX0 - 1 && y >= AY0 && y < AY1) { pipe(K, y, y + 1, AX0 + 0.12, 1.6, 'y', '#7a5a4a'); if (y % 4 === 1) lampWall(K, AX0 + 0.08, y + 0.5); }
      if (alongX && (x === 7 || x === 12 || x === 17)) lampWallX(K, x + 0.5, AY0 + 0.08);
      if (ar === 'cen') fence(K, x, y);
      return;
    }
    // davanti: barriere basse di cemento a strisce
    if (x === AX1 && y >= AY0 && y < AY1) { bx(x, y, x + 0.4, y + 1, 0, 0.32, '#8a8a90'); for (let i = 0; i < 2; i++) bx(x - 0.01, y + i * 0.5, x + 0.01, y + i * 0.5 + 0.25, 0.08, 0.24, '#e8b830'); if (ar === 'cen') fence(K, x, y); return; }
    if (y === AY1 && x >= AX0 && x < AX1) { bx(x, y, x + 1, y + 0.4, 0, 0.32, '#8a8a90'); for (let i = 0; i < 2; i++) bx(x + i * 0.5, y - 0.01, x + i * 0.5 + 0.25, y + 0.01, 0.08, 0.24, '#e8b830'); if (ar === 'cen') fence(K, x, y); return; }
    if (x === AX1 && y === AY1) { bx(x, y, x + 0.4, y + 0.4, 0, 0.32, '#8a8a90'); return; }
  }
  function bricks(K, a0, a1, c, HT, dir) {
    const { g, S, TW } = K; if (TW < 26) return; g.strokeStyle = 'rgba(20,10,8,.35)'; g.lineWidth = Math.max(1, TW / 60); g.beginPath();
    for (let z = 0.22, r = 0; z < HT; z += 0.22, r++) { const A = dir === 'x' ? S(a0, c, z) : S(c, a0, z), B = dir === 'x' ? S(a1, c, z) : S(c, a1, z); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); for (const u of r % 2 ? [0.25, 0.75] : [0.5]) { const P0 = dir === 'x' ? S(a0 + u, c, z - 0.22) : S(c, a0 + u, z - 0.22), P1 = dir === 'x' ? S(a0 + u, c, z) : S(c, a0 + u, z); g.moveTo(P0[0], P0[1]); g.lineTo(P1[0], P1[1]); } }
    g.stroke();
  }
  function pipe(K, a0, a1, c, z, dir, col) {
    const { g, S, TW } = K, A = dir === 'x' ? S(a0, c, z) : S(c, a0, z), B = dir === 'x' ? S(a1, c, z) : S(c, a1, z);
    g.lineCap = 'butt'; g.strokeStyle = cqShade(col, 0.7); g.lineWidth = Math.max(3, TW / 8); g.beginPath(); g.moveTo(A[0], A[1] + 1); g.lineTo(B[0], B[1] + 1); g.stroke();
    g.strokeStyle = col; g.lineWidth = Math.max(2, TW / 12); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    g.strokeStyle = cqShade(col, 1.35); g.lineWidth = Math.max(1, TW / 40); g.beginPath(); g.moveTo(A[0], A[1] - TW * 0.03); g.lineTo(B[0], B[1] - TW * 0.03); g.stroke();
  }
  function lampWall(K, x, y) { const { bx } = K; bx(x, y - 0.12, x + 0.12, y + 0.12, 1.95, 2.15, '#2a2a30'); bx(x + 0.04, y - 0.1, x + 0.2, y + 0.1, 1.8, 1.95, '#ffe6a0'); K.glow(x + 0.3, y, 1.7, 2.2, 'rgba(255,214,140,.30)'); }
  function lampWallX(K, x, y) { const { bx } = K; bx(x - 0.12, y, x + 0.12, y + 0.12, 1.95, 2.15, '#2a2a30'); bx(x - 0.1, y + 0.04, x + 0.1, y + 0.2, 1.8, 1.95, '#ffe6a0'); K.glow(x, y + 0.3, 1.7, 2.2, 'rgba(255,214,140,.30)'); }
  // recinto elettrico (Centralina): paletti e fili davanti al muro
  function fence(K, x, y) {
    const { bx, g, S, TW } = K, alongX = y === AY0 - 1 || y === AY1, X0 = x, Y0 = y === AY0 - 1 ? AY0 + 0.05 : y === AY1 ? AY1 - 0.05 : y, XX = x === AX0 - 1 ? AX0 + 0.05 : x === AX1 ? AX1 - 0.05 : x;
    if (alongX && (x < AX0 || x >= AX1)) return; if (!alongX && (y < AY0 || y >= AY1)) return;
    if (alongX) { bx(X0 + 0.45, Y0 - 0.04, X0 + 0.55, Y0 + 0.04, 0, 0.8, '#3a3a40'); g.strokeStyle = '#9adcff'; g.lineWidth = Math.max(1, TW / 40); g.beginPath(); for (const z of [0.3, 0.55, 0.78]) { const a = S(X0, Y0, z), b = S(X0 + 1, Y0, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); }
    else { bx(XX - 0.04, y + 0.45, XX + 0.04, y + 0.55, 0, 0.8, '#3a3a40'); g.strokeStyle = '#9adcff'; g.lineWidth = Math.max(1, TW / 40); g.beginPath(); for (const z of [0.3, 0.55, 0.78]) { const a = S(XX, y, z), b = S(XX, y + 1, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); }
  }
  // lo scantinato intorno (si disegna una volta): pavimento di cemento, scaffali, banco da lavoro, casse
  let SKY = null;
  function skyBuild(w, h, dpr) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr); const gr = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.8);
    gr.addColorStop(0, '#2a2c34'); gr.addColorStop(1, '#0c0d12'); g.fillStyle = gr; g.fillRect(0, 0, w, h); return { cv, w, h, dpr };
  }
  const GX0 = -6, GX1 = 30, GY0 = -6, GY1 = 26;
  function groundDraw(g, tx, ty, TW) {
    const Uz = TW * 0.575, S = (x, y, z = 0) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * Uz];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const rect = (x0, y0, x1, y1, col) => poly([S(x0, y0), S(x1, y0), S(x1, y1), S(x0, y1)], col);
    const box = (x0, y0, x1, y1, z0, z1, col) => { poly([S(x0, y1, z1), S(x1, y1, z1), S(x1, y1, z0), S(x0, y1, z0)], cqShade(col, 0.74)); poly([S(x1, y1, z1), S(x1, y0, z1), S(x1, y0, z0), S(x1, y1, z0)], cqShade(col, 0.55)); poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], cqShade(col, 1.06)); };
    rect(GX0, GY0, GX1, GY1, '#2a2b30');
    for (let i = 0; i < 40; i++) { const x = GX0 + ((i * 7.31) % (GX1 - GX0)), y = GY0 + ((i * 3.77) % (GY1 - GY0)), r = 0.6 + (i % 4) * 0.4; poly([S(x - r, y), S(x, y - r * 0.6), S(x + r, y), S(x, y + r * 0.6)], i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.04)'); }
    // pubblico di casse e attrezzi davanti all'arena (lati vicini)
    for (let i = 0; i < 6; i++) { const y = AY0 + 0.5 + i * 2.1; box(AX1 + 1.2, y, AX1 + 2.1, y + 0.9, 0, 0.7 + (i % 2) * 0.4, i % 3 ? '#7a5a3a' : '#5a6a7a'); }
    for (let i = 0; i < 7; i++) { const x = AX0 + 0.5 + i * 2.3; box(x, AY1 + 1.2, x + 0.9, AY1 + 2.0, 0, 0.6 + (i % 3) * 0.3, i % 2 ? '#6a4a32' : '#4a5a3a'); }
    // banco da lavoro con gli attrezzi
    box(AX1 + 1.3, AY1 + 1.2, AX1 + 3.3, AY1 + 2.2, 0, 0.75, '#8a6a4a'); box(AX1 + 1.5, AY1 + 1.4, AX1 + 1.9, AY1 + 1.8, 0.75, 1.0, '#c83a2a'); box(AX1 + 2.3, AY1 + 1.5, AX1 + 3.0, AY1 + 1.7, 0.75, 0.82, '#9aa4ae');
  }
  function skyDraw(g, CXc, CYc, tx, ty, TW) {
    const w = cq.w / (cq.vz || 1), h = cq.h / (cq.vz || 1), dpr = Math.min(2, cq.dpr);
    if (!SKY || SKY.w !== w || SKY.h !== h || SKY.dpr !== dpr) SKY = skyBuild(w, h, dpr);
    g.drawImage(SKY.cv, 0, 0, w, h);
    if (tx != null) groundDraw(g, tx, ty, TW);
  }

  // ======================= IL ROBOT: pezzi, peso, pentagono =======================
  const weight = bd => bd.s.reduce((w, p) => w + (PZ[p] ? PZ[p].wt : 0), 0);
  const spdOf = bd => MOV[bd.m].sp * Math.max(0.62, 1 - 0.035 * weight(bd));
  const pushOf = bd => MOV[bd.m].pu * (1 + 0.12 * weight(bd));
  const nW = bd => bd.s.filter(p => PZ[p] && PZ[p].k === 'w').length;
  const AT = { pala: 2.6, sega: 4, fiamma: 3.2, cannone: 2.8, scossa: 2.4 };
  // pentagono: Attacco, Difesa, Velocita', Spinta, Resistenza (0-1)
  function stats(bd) {
    let a = 0, d = 0, r = TEL;
    bd.s.forEach(p => { const P = PZ[p]; if (!P) return; r += P.hp; if (P.k === 'w') a += AT[p]; else d += p === 'corazza' ? 1.1 : p === 'barra' ? 0.6 : 0.85; });
    return [Math.min(1, a / 9), Math.min(1, d / 4.6), Math.min(1, spdOf(bd) / 2.7), Math.min(1, pushOf(bd) / 2.9), Math.min(1, r / (TEL + 5 * 22))];
  }
  const okIn = (p, i) => !p || (PZ[p] && (i === 4 ? PZ[p].top > 0 : PZ[p].top < 2));
  function valid(bd) {
    if (!bd || !MOV[bd.m] || !Array.isArray(bd.s) || bd.s.length !== 5) return false;
    if (!bd.s.every((p, i) => p === '' || okIn(p, i))) return false;
    return nW(bd) <= MAXW;
  }
  const BD0 = () => ({ m: 'r', s: ['pala', 'corazza', '', 'corazza', ''] });
  const cloneBd = bd => ({ m: bd.m, s: bd.s.slice() });
  const myLast = () => { const b = store.settings.robotLast; return valid(b) ? cloneBd(b) : BD0(); };

  // ======================= SUONI =======================
  const sfxOk = () => { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
  function swp(f0, f1, d, v, delay = 0, type = 'sine') {
    const A = sfxOk(); if (!A) return; const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(Math.min(0.5, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t + d + 0.02);
  }
  let NOISE = null;
  function noise(d, v, f, delay = 0, type = 'lowpass', q = 0.8) {
    const A = sfxOk(); if (!A) return;
    if (!NOISE || NOISE.sampleRate !== A.sampleRate) { NOISE = A.createBuffer(1, A.sampleRate, A.sampleRate); const ch = NOISE.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = A.currentTime + delay, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain();
    s.buffer = NOISE; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(Math.min(0.6, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(fl); fl.connect(g); g.connect(A.destination); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  const SFX = {
    clank: () => { swp(900, 400, 0.12, 0.04, 0, 'square'); noise(0.1, 0.08, 2500, 0, 'bandpass', 3); },
    mount: () => { swp(300, 600, 0.08, 0.04, 0, 'square'); swp(1200, 1500, 0.05, 0.03, 0.07, 'triangle'); noise(0.08, 0.06, 3000, 0.03, 'highpass'); },
    pala: () => { noise(0.3, 0.2, 400); swp(160, 60, 0.3, 0.1, 0, 'square'); },
    whoosh: () => { noise(0.25, 0.06, 1500, 0, 'bandpass', 1); },
    saw: () => { for (let i = 0; i < 6; i++) { swp(1400 + i * 30, 1300, 0.12, 0.018, i * 0.24, 'sawtooth'); noise(0.12, 0.05, 3200, i * 0.24, 'bandpass', 4); } },
    flame: () => { noise(1.0, 0.16, 700, 0, 'lowpass'); noise(0.6, 0.06, 2200, 0.1, 'bandpass', 1); },
    boom: () => { noise(0.6, 0.3, 300); swp(140, 40, 0.5, 0.12, 0, 'sine'); },
    zap: () => { for (let i = 0; i < 5; i++) swp(2000 + Math.random() * 1500, 300, 0.07, 0.03, i * 0.05, 'sawtooth'); noise(0.3, 0.1, 5000, 0, 'highpass'); },
    hit: () => { noise(0.15, 0.2, 900); swp(500, 160, 0.12, 0.06, 0, 'square'); },
    smash: () => { noise(0.5, 0.25, 600); for (let i = 0; i < 6; i++) swp(1800 + Math.random() * 2000, 600, 0.1, 0.02, 0.05 + i * 0.04, 'triangle'); },
    flip: () => { swp(200, 900, 0.35, 0.05, 0, 'triangle'); noise(0.5, 0.2, 500, 0.3); },
    fall: () => { swp(900, 80, 1.1, 0.06, 0, 'triangle'); noise(0.5, 0.2, 300, 1.0); },
    boing: () => { swp(220, 700, 0.15, 0.06, 0, 'triangle'); swp(700, 300, 0.2, 0.04, 0.15, 'triangle'); },
    ham: () => { noise(0.7, 0.35, 220); swp(90, 30, 0.6, 0.16, 0, 'sine'); },
    combo: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => swp(f, f, 0.16, 0.035, i * 0.07, 'square')); },
    heart: () => { swp(70, 45, 0.12, 0.12, 0, 'sine'); swp(65, 40, 0.12, 0.09, 0.2, 'sine'); },
    siren: () => { swp(500, 900, 0.5, 0.03, 0, 'square'); swp(900, 500, 0.5, 0.03, 0.5, 'square'); },
    curtain: () => { noise(1.2, 0.08, 800, 0, 'bandpass', 0.7); [392, 523, 659, 784].forEach((f, i) => swp(f, f, 0.25, 0.035, 0.6 + i * 0.12, 'triangle')); },
    ok: () => { swp(660, 990, 0.12, 0.03, 0, 'triangle'); },
    no: () => { swp(300, 200, 0.15, 0.03, 0, 'square'); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => swp(f, f, 0.25, 0.04, i * 0.12, 'triangle')); },
    lose: () => { [392, 330, 262].forEach((f, i) => swp(f, f * 0.97, 0.35, 0.04, i * 0.2, 'triangle')); },
    tick: () => swp(1200, 1100, 0.04, 0.02, 0, 'square')
  };

  // ======================= LE REGOLE (host) =======================
  const sideOf = (G, c) => G.chars.indexOf(c) === 1 ? 1 : 0;
  const mySide = G => sideOf(G, G.me);
  const charOf = (G, s) => G.chars[s];
  const lt = G => { if (!G.guest) return G.time; if (U.tPrev !== G.time) { U.tPrev = G.time; U.tAt = now(); } return G.time + Math.min(0.5, now() - U.tAt); };
  const fT = (G, T) => T - G.st.t0;   // secondi di combattimento
  const meanOn = (G, T) => !!(G.st && G.st.ph === 'fight' && !tutOn(G) && fT(G, T) > FIGHT - MEAN);
  const PSd = (G, s) => G.st.p[s];
  // dov'e' il robot di un lato (su questo telefono): io = U.R, il computer (host) = c.R, l'amico = posizione dalla rete + direzione
  function rob(G, s) {
    const c = charOf(G, s); if (!c) return { x: MX, y: MY, a: 0 };
    if (c === G.me && U.R) return U.R;
    if (c.R && !G.guest && c.bot && !c.remote) return c.R;
    return { x: c.x, y: c.y, a: c.ha != null ? c.ha : START[s][2], vx: c.vx || 0, vy: c.vy || 0 };
  }
  function pInit(bd) { return { bd, rd: 0, hp: bd.s.map(p => PZ[p] ? PZ[p].hp : 0), u: bd.s.map(p => PZ[p] && PZ[p].u || 0), cd: [0, 0, 0, 0, 0], tel: TEL, d: 0, dt: 0, stn: 0, burn: null, act: null, fp: null, fz: 0, kb: null, lh: 0 }; }
  function newRound(G, n, sc) {
    const old = G.st, order = old ? old.order : G.tut ? ['cen', 'seg', 'cal'] : shuffle(['seg', 'cen', 'cal']), ar = order[(n - 1) % 3];
    const p = [0, 1].map(s => { const q = old && old.p[s], c = charOf(G, s); const bd = q ? cloneBd(q.bd) : c === G.me ? myLast() : BD0(); return pInit(bd); });
    G.st = { n, ph: 'build', t0: r2(G.time), bt: n === 1 ? B_T0 : B_T1, ar, order, sc: sc || {}, p, B: [], bn: old ? old.bn : 0, ev: [], en: old ? old.en : 0, say: null, oil: OILS.map(() => 0), oilC: OILS.map(() => 0), fr: 0, win: -1, prev: old ? [cloneBd(old.p[0].bd), cloneBd(old.p[1].bd)] : null, hk: 0, pk: 0 };
    if (G.tut) G.st.bt = 999;
    G.chars.forEach((c, i) => { const P = START[i % 2]; c.x = P[0]; c.y = P[1]; c.R = { x: P[0], y: P[1], a: P[2], vx: 0, vy: 0, rev: false, wa: 0 }; c.ha = P[2]; if (c === G.me) { cq.x = P[0]; cq.y = P[1]; U.R = { x: P[0], y: P[1], a: P[2], vx: 0, vy: 0, rev: false, wa: 0 }; } c.path = []; });
    G.botBuildAt = G.time + 3 + Math.random() * 4; G.hamK = 0; G.pulK = 0;
  }
  function ev(G, k, x, y, a, b, c, d) { const st = G.st; st.en++; st.ev.push([st.en, k, r2(x), r2(y), a, b, c, d]); if (st.ev.length > 24) st.ev.shift(); }
  function setBuild(G, s, bd) { const st = G.st; if (!st || st.ph !== 'build' || st.p[s].rd || !valid(bd)) return false; st.p[s] = pInit(cloneBd(bd)); return true; }
  function startReveal(G) {
    const st = G.st; for (let s = 0; s < 2; s++) { const q = st.p[s]; st.p[s] = pInit(q.bd); st.p[s].rd = 1; }
    st.ph = 'reveal'; st.t0 = r2(G.time);
    const b = G.chars.find(c => c.bot && !c.remote); if (b && !G.tut) { const r = nbRead(G); if (r && Math.random() < 0.85) st.say = { id: b.id, t: r2(G.time + 1.5), x: r }; else say(G, b, 'start', 1.5); }
  }
  function startFight(G) {
    const st = G.st; st.ph = 'fight'; st.t0 = r2(G.time); G.hamK = 0; G.pulK = 0;
    G.chars.forEach((c, i) => { const P = START[i % 2]; if (c.R && !c.remote) Object.assign(c.R, { x: P[0], y: P[1], a: P[2], vx: 0, vy: 0, kn: null }); });
    const b = G.chars.find(c => c.bot && !c.remote); if (b) { b.ai = null; b.calm = 6 + (1 - nbLv(G)) * 10; }
  }
  // da che lato viene un colpo (rispetto al robot colpito): 0 davanti, 1 destra, 2 dietro, 3 sinistra
  function sideHit(R, fx, fy) { const a = angD(Math.atan2(fy - R.y, fx - R.x), R.a); const b = Math.abs(a); return b < Math.PI / 4 ? 0 : b > 3 * Math.PI / 4 ? 2 : a > 0 ? 1 : 3; }
  const pieceOk = (P, i) => !!PZ[P.bd.s[i]] && P.hp[i] > 0;
  // IL DANNO: prima il pezzo del lato colpito (la difesa giusta lo ferma quasi tutto), poi il telaio. Da dietro vale di piu'. Il pezzo sopra protegge il telaio.
  // side: 0-3 = lati, 'u' = da sotto (trappole del pavimento), 'a' = dall'alto (martello). Ritorna il danno al telaio.
  function damage(G, s, side, ty, dmg, x, y, by, quiet) {
    const st = G.st, P = st.p[s]; if (!P || P.d || dmg <= 0) return 0;
    let tel = 0;
    if (side === 2) dmg *= 1.25;
    const brk = i => { const p = P.bd.s[i]; P.hp[i] = 0; ev(G, 'pz', x, y, s, i, p); };
    const onPiece = (i, mult, through) => { const q = PZ[P.bd.s[i]], m = q.t === ty && q.k === 'd' ? mult[0] : q.k === 'd' ? (P.bd.s[i] === 'corazza' ? mult[1] : mult[2]) : mult[3]; const th = q.t === ty && q.k === 'd' ? through[0] : q.k === 'd' ? (P.bd.s[i] === 'corazza' ? through[1] : through[2]) : through[3];
      P.hp[i] -= dmg * m; tel += dmg * th; if (P.hp[i] <= 0) { tel += -P.hp[i]; brk(i); } };
    if (typeof side === 'number') { if (pieceOk(P, side)) onPiece(side, [0.3, 0.6, 1.0, 0.55], [0, 0.1, 0.2, 0.35]); else tel = dmg; }
    else if (side === 'a' && pieceOk(P, 4) && PZ[P.bd.s[4]].k === 'd') onPiece(4, [0.3, 0.6, 1.0, 0.55], [0, 0.1, 0.2, 0.35]);
    else tel = dmg;
    // il pezzo sopra (difesa) ripara il telaio: quello giusto dimezza, la corazza un quarto; si consuma un po'
    if (tel > 0 && side !== 'a' && pieceOk(P, 4) && PZ[P.bd.s[4]].k === 'd') { const q = PZ[P.bd.s[4]], k = q.t === ty ? 0.5 : P.bd.s[4] === 'corazza' ? 0.75 : 1; if (k < 1) { P.hp[4] -= tel * (1 - k) * 0.4; tel *= k; if (P.hp[4] <= 0) brk(4); } }
    P.tel = Math.max(0, P.tel - tel); P.lh = r2(G.time);
    if (!quiet) ev(G, 'h', x, y, s, ty, Math.max(1, Math.round(dmg)));
    if (by != null && charOf(G, by) && !charOf(G, by).bot) nbSeen(G, s, side, ty);
    if (P.tel <= 0) ko(G, s, 's');
    return tel;
  }
  // i danni continui (sega, fuoco, lame) si sommano e si raccontano ogni tanto
  function cDamage(G, s, side, ty, dmg, x, y, by) {
    const P = G.st.p[s]; if (!P || P.d) return; damage(G, s, side, ty, dmg, x, y, by, true);
    const k = s + ty + side, AC = G.acc || (G.acc = {}); const A = AC[k] || (AC[k] = { v: 0, t: G.time }); A.v += dmg;
    if (G.time - A.t > 0.35) { if (A.v >= 0.5) ev(G, 'h', x, y, s, ty, Math.max(1, Math.round(A.v))); A.v = 0; A.t = G.time; }
  }
  function ko(G, s, why) {
    const st = G.st, P = st.p[s]; if (P.d || st.ph !== 'fight') return; P.d = why; P.dt = r2(G.time);
    const R = rob(G, s); ev(G, why === 'f' ? 'fa' : why === 'r' ? 'fx' : 'bo', R.x, R.y, s);
    const o = 1 - s;
    if (why === 'f' && P.kb && G.time - P.kb[0] < 3.2 && P.kb[1] === o) combo(G, o, 'fossa', R.x, R.y);
    if (why === 'r') combo(G, o, 'ribal', R.x, R.y);
    st.ph = 'ko'; st.t0 = r2(G.time); st.win = o; st.why = why;
  }
  // spinta (pala, cannone, recinto, martello): la fa il telefono di chi la subisce (evento kb); qui solo per il computer e per me sull'host
  function knock(G, s, dx, dy, dist, dur, by) {
    const P = G.st.p[s], R = rob(G, s); if (P.d) return;
    if (by != null) P.kb = [r2(G.time), by];
    const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    ev(G, 'kb', R.x, R.y, s, Math.round(ux * dist * 100), Math.round(uy * dist * 100), Math.round(dur * 100));
    const c = charOf(G, s); if (c === G.me || (c.bot && !c.remote)) applyKnock(c === G.me ? U.R : c.R, ux * dist, uy * dist, dur);
  }
  function applyKnock(R, dx, dy, dur) { if (!R) return; R.kn = { dx, dy, t0: now(), dur: Math.max(0.15, dur), p: 0 }; R.vx = 0; R.vy = 0; }
  // le combo scoperte (QUADERNO DELLE COMBO)
  const COMBO = {
    pozza: { n: 'Scossa nella pozzanghera', i: '⚡💧', d: 'La scossa arriva lontano a chi sta nell\'acqua.', h: 'Centralina + ⚡' },
    olio: { n: 'Olio in fiamme', i: '🔥🛢️', d: 'Accendi l\'olio mentre l\'altro ci passa sopra.', h: 'Caldaia + 🔥' },
    lame: { n: 'Dritto sulle lame', i: '🚜🪚', d: 'Spingi l\'altro sulle lame che escono dal pavimento.', h: 'Segheria + una spinta' },
    recinto: { n: 'Contro il recinto', i: '🚜⚡', d: 'Lancia l\'altro sul recinto elettrico.', h: 'Centralina + una spinta' },
    fossa: { n: 'Giù nella fossa', i: '💣🕳️', d: 'Butta l\'altro nella fossa con una spinta.', h: 'Segheria + una spinta' },
    martello: { n: 'Sotto il martello', i: '🔨', d: 'Spingi o blocca l\'altro sotto il martello gigante.', h: 'Caldaia + una spinta o una scossa' },
    fermo: { n: 'Fermo e segato', i: '⚡🪚', d: 'Spegni i motori con la scossa e poi seghi.', h: '⚡ + 🪚' },
    ribal: { n: 'Ribaltone', i: '🔄', d: 'Ribalta l\'altro prendendolo di fianco o da dietro (senza barra).', h: '🚜 di fianco' }
  };
  function combo(G, s, id, x, y) { const C = G.cbT || (G.cbT = [{}, {}]); if (C[s][id] && G.time - C[s][id] < 6) return; C[s][id] = G.time; ev(G, 'cb', x, y, s, id); }
  const recentKb = (G, s, by, T = 2.6) => { const P = G.st.p[s]; return !!(P.kb && P.kb[1] === by && G.time - P.kb[0] < T); };
  const stunned = (G, s, T) => (G.st.p[s].stn || 0) > T;
  const flipping = (G, s, T) => { const fp = G.st.p[s].fp; return !!(fp && T - fp < 1.5); };
  // ---- LE ARMI (host). slot = posto del pezzo; from = { x, y, a } posizione di chi spara (l'amico la manda insieme al colpo) ----
  function zoneHit(G, s, slot, R, Q) {   // l'altro e' nella zona dell'arma? (per sparare e per la mira disegnata)
    const p = G.st.p[s].bd.s[slot], dirA = slot === 4 ? Math.atan2(Q.y - R.y, Q.x - R.x) : R.a + SLA[slot], d = Math.hypot(Q.x - R.x, Q.y - R.y), off = Math.abs(angD(Math.atan2(Q.y - R.y, Q.x - R.x), dirA));
    if (p === 'pala') return d < 2 * RR + 0.42 && off < 0.85;
    if (p === 'sega') return d < 2 * RR + 0.4 && off < 0.75;
    if (p === 'fiamma') return d < 2.5 && off < 0.5;
    if (p === 'cannone') { if (d > 9) return false; const lat = Math.abs(Math.sin(off)) * d; return Math.cos(off) > 0 && lat < RR + 0.12; }
    if (p === 'scossa') return d < 1.8 || (G.st.ar === 'cen' && inPud(Q.x, Q.y) && d < 4.6);
    return false;
  }
  function fire(G, s, slot, from) {
    const st = G.st, T = G.time, P = st.p[s]; if (!st || st.ph !== 'fight' || P.d || stunned(G, s, T) || flipping(G, s, T)) return false;
    const p = P.bd.s[slot], q = PZ[p]; if (!q || q.k !== 'w' || !(P.hp[slot] > 0) || !(P.u[slot] > 0) || P.cd[slot] > T) return false;
    let R = rob(G, s); if (from && isFinite(from.x) && isFinite(from.y) && isFinite(from.a) && Math.hypot(from.x - R.x, from.y - R.y) < 2.2) R = { x: +from.x, y: +from.y, a: +from.a };
    const o = 1 - s, Q = rob(G, o), Qd = st.p[o].d, dirA = slot === 4 ? Math.atan2(Q.y - R.y, Q.x - R.x) : R.a + SLA[slot], inZ = !Qd && zoneHit(G, s, slot, R, Q) && !lagOk(G, o);
    P.u[slot]--; P.cd[slot] = r2(T + q.cd * (slot === 4 && p === 'cannone' ? 1.4 : 1));
    const c = charOf(G, s); if (G.tut && c && !c.bot) G.tutFire = (G.tutFire || 0) + 1; if (c && !c.bot) nbUse(G, s, slot);
    const fx = R.x + Math.cos(dirA) * 0.55, fy = R.y + Math.sin(dirA) * 0.55;
    ev(G, 'fw', fx, fy, s, slot, Math.round(angN(dirA) * 100), p);
    if (p === 'pala') {
      if (!inZ) return true;
      const hs = sideHit(Q, R.x, R.y), Pq = st.p[o], pr = pushOf(P.bd) / pushOf(Pq.bd), ux = Math.cos(dirA), uy = Math.sin(dirA);
      damage(G, o, hs, 'flip', 3, Q.x, Q.y, s);
      if (st.p[o].d) return true;
      const ammo = pieceOk(Pq, hs) && Pq.bd.s[hs] === 'ammo', topA = pieceOk(Pq, 4) && Pq.bd.s[4] === 'ammo';
      if (hs !== 0 && pr > 0.62 && !(Pq.bd.m === 'c' && pr < 0.9)) {   // di fianco o da dietro: ribalta (i cingoli pesanti resistono)
        if (pieceOk(Pq, 4) && Pq.bd.s[4] === 'barra') { Pq.fp = r2(T); Pq.hp[4] = 0; ev(G, 'fp', Q.x, Q.y, o, 1); ev(G, 'pz', Q.x, Q.y, o, 4, 'barra'); knock(G, o, ux, uy, 0.6, 0.3, s); }
        else { Pq.fp = r2(T); ev(G, 'fp', Q.x, Q.y, o, 0); ko(G, o, 'r'); }
        return true;
      }
      const dist = Math.max(0.8, Math.min(2.6, 2.0 * Math.max(0.6, Math.min(1.3, pr)))) * (ammo ? 0.5 : topA ? 0.75 : 1);
      knock(G, o, ux, uy, dist, 0.38, s);
      return true;
    }
    if (p === 'sega') { P.act = [slot, r2(T + 1.5)]; return true; }
    if (p === 'fiamma') {
      if (inZ) { const hs = sideHit(Q, R.x, R.y); damage(G, o, hs, 'fire', 3, Q.x, Q.y, s); st.p[o].burn = [r2(T + 3), hs, s]; }
      if (st.ar === 'cal') OILS.forEach(([ox, oy, orr], i) => { if (st.oil[i] > T || st.oilC[i] > T) return; for (let k = 0.6; k <= 2.5; k += 0.35) { const px = R.x + Math.cos(dirA) * k, py = R.y + Math.sin(dirA) * k; if (Math.hypot(px - ox, py - oy) < orr) { st.oil[i] = r2(T + 4.5); st.oilC[i] = r2(T + 4.5 + 5); st.oilBy = s; ev(G, 'ig', ox, oy, s, i); break; } } });
      return true;
    }
    if (p === 'cannone') { st.bn++; st.B.push([st.bn, s, r2(fx), r2(fy), r2(Math.cos(dirA)), r2(Math.sin(dirA)), r2(T), 9]); return true; }
    if (p === 'scossa') {
      if (inZ) { const hs = sideHit(Q, R.x, R.y), far = Math.hypot(Q.x - R.x, Q.y - R.y) >= 1.8; damage(G, o, hs, 'zap', far ? 7 : 5, Q.x, Q.y, s); zapStun(G, o, hs, 1.0); if (far) combo(G, s, 'pozza', Q.x, Q.y); }
      return true;
    }
    return true;
  }
  const lagOk = (G, s) => { const c = charOf(G, s); return !!(c && c.remote && typeof cqLagging === 'function' && cqLagging(c)); };
  function zapStun(G, s, side, dur) {
    const P = G.st.p[s]; if (P.d) return; const rub = typeof side === 'number' && pieceOk(P, side) && P.bd.s[side] === 'gomma', top = pieceOk(P, 4) && P.bd.s[4] === 'gomma';
    if (rub) return; const d = dur * (top ? 0.5 : 1); P.stn = r2(Math.max(P.stn || 0, G.time + d)); P.stBy = 1 - s; ev(G, 'st', rob(G, s).x, rob(G, s).y, s, Math.round(d * 100));
  }
  const inPud = (x, y) => PUDS.some(([px, py, r]) => Math.hypot(x - px, y - py) < r);
  const inOil = (x, y) => OILS.findIndex(([px, py, r]) => Math.hypot(x - px, y - py) < r);
  const bladeT = (i, T, mean) => { const per = mean ? 4.2 : 6.5, up = mean ? 2.0 : 1.5, t = ((T + i * (per / BLADES.length) * 1.7) % per + per) % per; return { up: t > per - up, warn: t > per - up - 1.1 && t <= per - up, k: t > per - up ? Math.min(1, (t - (per - up)) / 0.15, (per - t) / 0.15) : 0 }; };
  const onBlade = (x, y, i) => { const [bx, by, o] = BLADES[i], hx = (o ? 0.18 : 0.95) + RR * 0.55, hy = (o ? 0.95 : 0.18) + RR * 0.55; return Math.abs(x - bx) < hx && Math.abs(y - by) < hy; };
  const ventT = (i, T, mean) => { const per = mean ? 4.6 : 7, on = 1.6, t = ((T + i * per / 2) % per + per) % per; return { on: t > per - on, warn: t > per - on - 1.1 && t <= per - on }; };
  const inVent = (x, y, i) => { const [vx, vy, va] = VENTS[i], d = Math.hypot(x - vx, y - vy); return d < VLEN && Math.abs(angD(Math.atan2(y - vy, x - vx), va)) < VANG + RR / Math.max(0.5, d); };
  const hamPer = mean => mean ? 3.6 : 6;
  function hamState(G, T) { const ft = fT(G, T), mean = meanOn(G, T), per = hamPer(mean), m0 = FIGHT - MEAN, v = !mean ? ft / 6 : m0 / 6 + (ft - m0) / 3.6, k = Math.floor(v), t = (v - k) * per; return { i: k % HAMS.length, t, per, k }; }
  const pulsePer = 5;
  // giro delle trappole e dei danni continui (host)
  function arenaTick(G, dt) {
    const st = G.st, T = G.time, ft = fT(G, T), mean = meanOn(G, T), ar = st.ar;
    if (ar === 'seg' && mean && !st.fr) { st.fr = 1; ev(G, 'fr', MX, MY, -1); }
    for (let s = 0; s < 2; s++) {
      const P = st.p[s]; if (P.d) continue; const R = rob(G, s), o = 1 - s;
      // in fiamme
      if (P.burn && P.burn[0] > T) cDamage(G, s, P.burn[1], 'fire', 2.0 * dt, R.x, R.y, P.burn[2]); else P.burn = null;
      if (P.d) continue;
      // la sega che gira
      if (P.act && P.act[1] > T && pieceOk(P, P.act[0])) { const Q = rob(G, o); if (!st.p[o].d && zoneHit(G, s, P.act[0], R, Q) && !lagOk(G, o)) { const hs = sideHit(Q, R.x, R.y); cDamage(G, o, hs, 'cut', 7 * dt, Q.x, Q.y, s); if (stunned(G, o, T) && st.p[o].stBy === s) combo(G, s, 'fermo', Q.x, Q.y); } } else P.act = null;
      if (P.d || st.ph !== 'fight') continue;
      if (ar === 'seg') {
        const fr = st.fr ? FR1 : FR0; if (Math.hypot(R.x - FOSSA[0], R.y - FOSSA[1]) < fr && !lagOk(G, s)) { ko(G, s, 'f'); continue; }
        BLADES.forEach((b, i) => { if (bladeT(i, ft, mean).up && onBlade(R.x, R.y, i)) { cDamage(G, s, 'u', 'cut', 8 * dt, R.x, R.y); if (recentKb(G, s, o)) combo(G, o, 'lame', R.x, R.y); } });
      } else if (ar === 'cen') {
        const m = RR + 0.1, wall = R.x < AX0 + m ? [-1, 0] : R.x > AX1 - m ? [1, 0] : R.y < AY0 + m ? [0, -1] : R.y > AY1 - m ? [0, 1] : null;
        if (wall && T > P.fz) { P.fz = T + 0.9; const hs = sideHit(R, R.x + wall[0], R.y + wall[1]); damage(G, s, hs, 'zap', 5, R.x, R.y); zapStun(G, s, hs, 0.6); knock(G, s, -wall[0], -wall[1], 1.1, 0.25); ev(G, 'sh', R.x + wall[0] * 0.4, R.y + wall[1] * 0.4, s); if (recentKb(G, s, o)) combo(G, o, 'recinto', R.x, R.y); }
        if (mean) { const k = Math.floor((ft - (FIGHT - MEAN)) / pulsePer), pk = G.pk || (G.pk = [0, 0]); if (k >= 1 && k !== pk[s]) { pk[s] = k; if (inPud(R.x, R.y)) { damage(G, s, 'u', 'zap', 5, R.x, R.y); zapStun(G, s, 'u', 0.8); } } }
      } else if (ar === 'cal') {
        VENTS.forEach((v, i) => { if (ventT(i, ft, mean).on && inVent(R.x, R.y, i)) cDamage(G, s, sideHit(R, v[0], v[1]), 'fire', 7 * dt, R.x, R.y); });
        const oi = inOil(R.x, R.y); if (oi >= 0 && st.oil[oi] > T) { cDamage(G, s, 'u', 'fire', 6 * dt, R.x, R.y, st.oilBy); if (st.oilBy === o) combo(G, o, 'olio', R.x, R.y); }
      }
    }
    if (ar === 'cal') {   // il martello gigante: cade sul posto segnato alla fine di ogni giro
      const k = hamState(G, T).k;
      if (k > G.hamK) { const i = (k - 1) % HAMS.length, [hx, hy] = HAMS[i]; G.hamK = k; ev(G, 'ham', hx, hy, i);
        for (let s = 0; s < 2; s++) { const P = st.p[s], R = rob(G, s); if (P.d || Math.hypot(R.x - hx, R.y - hy) > 0.95 || lagOk(G, s)) continue; damage(G, s, 'a', 'hit', 14, R.x, R.y); zapStun(G, s, 'x', 0.5); if (recentKb(G, s, 1 - s, 3) || (stunned(G, s, T - 0.6) && P.stBy === 1 - s)) combo(G, 1 - s, 'martello', R.x, R.y); } }
    }
    if (ar === 'cen' && mean) { const k = Math.floor((ft - (FIGHT - MEAN)) / pulsePer); if (k >= 1 && k !== G.pulK) { G.pulK = k; ev(G, 'pu', MX, MY, k); } }
  }
  // palle del cannone (host)
  function ballTick(G) {
    const st = G.st, T = G.time; st.B = st.B.filter(B => {
      const [, s, x0, y0, dx, dy, t0, rng] = B, u = (T - t0) * 9; if (u > rng) return false;
      const x = x0 + dx * u, y = y0 + dy * u;
      if (x < AX0 + 0.1 || x > AX1 - 0.1 || y < AY0 + 0.1 || y > AY1 - 0.1) { ev(G, 'bw', x, y, s); return false; }
      if (st.ar === 'cen' && Math.hypot(x - TRAFO[0], y - TRAFO[1]) < TRAFO[2]) { ev(G, 'bw', x, y, s); return false; }
      const o = 1 - s, Q = rob(G, o), Po = st.p[o]; if (Po.d || lagOk(G, o)) return true;
      if (Math.hypot(Q.x - x, Q.y - y) < RR + 0.12) {
        const hs = sideHit(Q, x - dx, y - dy); damage(G, o, hs, 'hit', 10, x, y, s); ev(G, 'bh', x, y, o);
        if (!st.p[o].d) { const am = pieceOk(Po, hs) && Po.bd.s[hs] === 'ammo', top = pieceOk(Po, 4) && Po.bd.s[4] === 'ammo'; knock(G, o, dx, dy, 1.3 * Math.min(1.2, 1.6 / pushOf(Po.bd)) * (am ? 0.4 : top ? 0.7 : 1), 0.3, s); }
        return false;
      }
      return true;
    });
  }
  function roundEnd(G, win, why) {
    const st = G.st; st.sc = st.sc || {}; if (win >= 0) st.sc[win] = (st.sc[win] || 0) + 1;
    st.ph = 'mres'; st.t0 = r2(G.time); st.win = win; st.B = [];
    const a = G.chars[0], b = G.chars[1], s = i => st.sc[i] || 0;
    st.msg = (win >= 0 ? '🏆 Manche a ' + G.chars[win].name + '!' : '🤝 Manche pari!') + '\n' + why + '\n' + a.name + ' ' + s(0) + ' – ' + s(1) + ' ' + b.name;
    st.fin = s(0) >= WINS || s(1) >= WINS || st.n >= MAXR || G.tut ? 1 : 0;
    nbLearnRound(G, win);
    const bot = G.chars.find(c => c.bot && !c.remote); if (bot && !G.tut) say(G, bot, win === sideOf(G, bot) ? 'win' : win >= 0 ? 'lose' : 'start');
  }
  function finalEnd(G) {
    const st = G.st, a = G.chars[0], b = G.chars[1], s = i => st.sc[i] || 0, w = s(0) > s(1) ? a : s(1) > s(0) ? b : null;
    { const bot = G.chars.find(c => c.bot && !c.remote); if (bot && !G.tut && G.chars.every(c => c.bot || !c.remote)) { const M = nbMem(); M.lv = Math.max(0.2, Math.min(1, M.lv + (w === bot ? -0.1 : w ? 0.15 : 0))); saveStore(); } }
    cqModeEnd({ t: w ? '🏆 Vince ' + esc(w.name) + '!' : '🤝 Pari!', why: 'Manche ' + s(0) + ' – ' + s(1), rank: (w === b ? [b, a] : [a, b]).map(c => [c.name, s(sideOf(G, c)) + ' manche']), win: w ? [w.id] : [] });
  }
  const WHY = { f: 'è caduto nella fossa 🕳️', r: 'è stato ribaltato 🔄', s: 'è stato smontato 🔧' };

  // ======================= MOVIMENTO (ognuno muove il suo robot; il computer lo muove l'host) =======================
  // il joystick: il robot gira verso dove spingi e avanza; se spingi all'indietro va in retromarcia (il dietro verso il dito)
  function phys(G, s, R, dir, dt) {
    const st = G.st, P = st.p[s], bd = P.bd, M = MOV[bd.m], T = lt(G);
    if (P.d === 'f') { R.vx = R.vy = 0; return; }
    const oil = st.ar === 'cal' && inOil(R.x, R.y) >= 0, grip = oil ? M.oil : 1;
    const ctl = st.ph === 'fight' && !P.d && !stunned(G, s, T) && !flipping(G, s, T) && !R.kn && !(G.tutHold && charOf(G, s).bot);
    let tvx = 0, tvy = 0, k;
    if (ctl && dir) {
      const ta = Math.atan2(dir.wy, dir.wx);
      if (!R.lockRev) { if (R.rev) { if (Math.abs(angD(ta + Math.PI, R.a)) > 2.0) R.rev = false; } else if (Math.abs(angD(ta, R.a)) > 2.0) R.rev = true; }
      const want = R.rev ? ta + Math.PI : ta, d2 = angD(want, R.a), tr = M.tr * (oil ? 0.55 : 1) * dt;
      R.a = angN(R.a + Math.max(-tr, Math.min(tr, d2)));
      const al = Math.max(0, Math.cos(angD(want, R.a))), v = spdOf(bd) * (R.rev ? -0.72 : 1) * al * (dir.m != null ? dir.m : 1);
      tvx = Math.cos(R.a) * v; tvy = Math.sin(R.a) * v; k = 1 - Math.exp(-M.ac * grip * dt);
    } else k = 1 - Math.exp(-(oil ? 1.1 : 7) * dt);
    R.vx += (tvx - R.vx) * k; R.vy += (tvy - R.vy) * k;
    let nx = R.x + R.vx * dt, ny = R.y + R.vy * dt;
    if (R.kn) { const K = R.kn, p = Math.min(1, (now() - K.t0) / K.dur), e = 1 - (1 - p) * (1 - p); nx += K.dx * (e - K.p); ny += K.dy * (e - K.p); K.p = e; if (p >= 1) R.kn = null; }
    // muri dell'arena
    const lo = AX0 + RR, hi = AX1 - RR, lo2 = AY0 + RR, hi2 = AY1 - RR;
    if (nx < lo) { nx = lo; R.vx = Math.abs(R.vx) * 0.2; } if (nx > hi) { nx = hi; R.vx = -Math.abs(R.vx) * 0.2; }
    if (ny < lo2) { ny = lo2; R.vy = Math.abs(R.vy) * 0.2; } if (ny > hi2) { ny = hi2; R.vy = -Math.abs(R.vy) * 0.2; }
    // il trasformatore della Centralina (tondo)
    if (st.ar === 'cen') { const dx = nx - TRAFO[0], dy = ny - TRAFO[1], d = Math.hypot(dx, dy), m = TRAFO[2] + RR; if (d < m) { const ux = d ? dx / d : 1, uy = d ? dy / d : 0; nx = TRAFO[0] + ux * m; ny = TRAFO[1] + uy * m; const vn = R.vx * ux + R.vy * uy; if (vn < 0) { R.vx -= ux * vn; R.vy -= uy * vn; } } }
    // l'altro robot: ognuno si sposta della sua parte (chi spinge di piu' sposta l'altro)
    const o = 1 - s, Po = st.p[o]; if (Po && Po.d !== 'f' && (st.ph === 'fight' || st.ph === 'ko')) {
      const Q = rob(G, o), dx = nx - Q.x, dy = ny - Q.y, d = Math.hypot(dx, dy), m = 2 * RR;
      if (d < m) { const ux = d ? dx / d : 1, uy = d ? dy / d : 0, mm = pushOf(bd), mo = pushOf(Po.bd), sh = (m - d) * (mo / (mm + mo)); nx += ux * sh; ny += uy * sh; const vn = R.vx * ux + R.vy * uy; if (vn < 0) { R.vx -= ux * vn * 0.7; R.vy -= uy * vn * 0.7; } }
    }
    nx = Math.max(lo, Math.min(hi, nx)); ny = Math.max(lo2, Math.min(hi2, ny));
    R.wa = (R.wa || 0) + Math.hypot(nx - R.x, ny - R.y) * (R.rev ? -1 : 1) * 9; R.x = nx; R.y = ny;
    // nella fossa: si cade (l'host lo conferma)
    if (st.ar === 'seg' && st.ph === 'fight' && Math.hypot(R.x - FOSSA[0], R.y - FOSSA[1]) < (st.fr ? FR1 : FR0)) { R.vx = R.vy = 0; R.kn = null; R.fall = 1; }
  }
  // il mio robot (su ogni telefono): il motore non mi muove (speed 0), lo muovo io qui
  function myDrive(G, dt) {
    const st = G.st; if (!U.R) U.R = { x: cq.x, y: cq.y, a: START[mySide(G)][2], vx: 0, vy: 0, rev: false, wa: 0 };
    const R = U.R; if (Math.hypot(cq.x - R.x, cq.y - R.y) > 0.6) { R.x = cq.x; R.y = cq.y; }
    if (st.ph === 'build' || st.ph === 'reveal') { const P = START[mySide(G)]; R.x = P[0]; R.y = P[1]; R.a = st.ph === 'build' ? angN(P[2] + now() * 0.7) : P[2]; R.vx = R.vy = 0; R.kn = null; R.fall = 0; }
    else { const d = R.fall ? null : cqDir(); phys(G, mySide(G), R, d, dt); }
    cq.x = R.x; cq.y = R.y; cq.face = 10 + Math.round(angN(R.a) * 100); G.me.ha = R.a;   // la direzione viaggia nel "verso" del personaggio
  }

  // ======================= NONNO BULLONE (il computer) =======================
  const NB_LINES = {
    start: ['Ho stretto tutti i bulloni. Pronto?', 'Questo robot l\'ho fatto con le mie mani!', 'Ai miei tempi i robot erano di ghisa…', 'Vediamo cosa hai combinato in officina.'],
    hit: ['Ahah! Preso!', 'Senti come gira, eh?', 'Questa è esperienza, ragazzo!'],
    ouch: ['La mia lamiera!', 'Ehi, piano con la vernice!', 'Mannaggia…'],
    win: ['Torna in officina e studia!', 'Il vecchio Bullone non arrugginisce!', 'Vuoi qualche consiglio da meccanico?'],
    lose: ['Bel lavoro… stavolta.', 'Devo cambiare le candele.', 'Uffa, mi si è svitato tutto!']
  };
  // NONNO BULLONE IMPARA (per dispositivo, store.settings.robotNb): le armi che usi, da che lato attacchi, le tue difese; forza lv che sale se vinci
  const nbMem = () => { const S = store.settings; if (!S.robotNb || typeof S.robotNb !== 'object' || !S.robotNb.w) S.robotNb = { n: 0, w: {}, sd: [0, 0, 0, 0, 0], ty: {}, df: {}, tp: {} }; if (S.robotNb.lv == null) S.robotNb.lv = 0.3; return S.robotNb; };
  const nbLv = G => G.tut ? 0.25 : (G.nbLv != null ? G.nbLv : (G.nbLv = nbMem().lv));
  const vsBot = G => !G.tut && G.chars.some(c => c.bot && !c.remote) && G.chars.every(c => c.bot || !c.remote);
  function nbUse(G, s, slot) { if (!vsBot(G)) return; const M = nbMem(), p = G.st.p[s].bd.s[slot]; M.w[p] = (M.w[p] || 0) + 1; M.sd[slot] = (M.sd[slot] || 0) + 1; }
  function nbSeen(G, s, side, ty) { if (!vsBot(G) || !charOf(G, s).bot) return; const M = nbMem(); M.ty[ty] = (M.ty[ty] || 0) + 1; }
  function nbLearnRound(G, win) {
    if (!vsBot(G)) return; const M = nbMem(), me = G.chars.findIndex(c => !c.bot), bd = G.st.p[me].bd; M.n++;
    bd.s.forEach(p => { if (PZ[p] && PZ[p].k === 'd') M.df[p] = (M.df[p] || 0) + 1; }); M.tp[bd.m] = (M.tp[bd.m] || 0) + 1; saveStore(); void win;
  }
  function nbRead(G) {
    const M = nbMem(); if (M.n < 1) return null; const tot = Object.values(M.w).reduce((a, b) => a + b, 0); if (tot < 6) return null;
    const fav = Object.entries(M.w).sort((a, b) => b[1] - a[1])[0][0], sd = M.sd.indexOf(Math.max(...M.sd));
    const L = { pala: 'Tu ami la pala, eh? Stavolta ho la barra. 🔄', sega: 'Quella sega la conosco: ho messo l\'acciaio. 🔩', fiamma: 'Con me il fuoco non attacca: ignifugo! 🧯', cannone: 'Le tue cannonate? Ho messo le molle. 🌀', scossa: 'Scossa? Ho la suola di gomma, io. ⚫' };
    if (G.nbCounter && L[fav]) return L[fav];
    return sd === 2 ? 'Attacchi sempre col dietro… furbetto!' : sd === 1 || sd === 3 ? 'Mi giri intorno, eh? Ho blindato i fianchi.' : M.n >= 3 && Math.random() < 0.5 ? 'Ho studiato i tuoi robot… preparati.' : null;
  }
  function say(G, c, k, delay = 0) { const L = NB_LINES[k]; G.st.say = { id: c.id, t: r2(G.time + delay), x: L[Math.floor(Math.random() * L.length)] }; }
  // i progetti del Nonno: uno per arena, poi le contromisure contro di te
  const TPL = {
    spazza: { n: 'lo Spazzaneve', m: 'c', s: ['pala', 'corazza', 'corazza', 'corazza', 'barra'] },
    taglia: { n: 'il Taglialegna', m: 'r', s: ['sega', 'piastre', 'corazza', 'piastre', 'corazza'] },
    drago: { n: 'il Draghetto', m: 'r', s: ['fiamma', 'ignif', 'corazza', 'gomma', 'ignif'] },
    canno: { n: 'il Cannoniere', m: 'c', s: ['corazza', 'ammo', 'corazza', 'ammo', 'cannone'] },
    saetta: { n: 'la Saetta', m: 'r', s: ['pala', 'gomma', 'corazza', 'gomma', 'scossa'] },
    vespa: { n: 'la Vespa', m: 'r', s: ['sega', 'corazza', 'pala', 'corazza', 'gomma'] }
  };
  const ARPREF = { seg: ['spazza', 'vespa', 'canno'], cen: ['saetta', 'vespa', 'taglia'], cal: ['drago', 'canno', 'spazza'] };
  const COUNTER = { pala: 'barra', sega: 'piastre', fiamma: 'ignif', cannone: 'ammo', scossa: 'gomma' };
  function botBuild(G, c) {
    const s = sideOf(G, c), st = G.st, L = nbLv(G), M = nbMem();
    const pref = ARPREF[st.ar], k = G.tut ? 'spazza' : pref[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * pref.length)], T = TPL[k], bd = { m: T.m, s: T.s.slice() };
    // contromisure: le armi che ha visto (manche prima) o che usi di solito
    const seen = {}; if (st.prev) st.prev[1 - s].s.forEach(p => { if (PZ[p] && PZ[p].k === 'w') seen[p] = (seen[p] || 0) + 2; });
    for (const [p, n] of Object.entries(M.w)) if (n > 3) seen[p] = (seen[p] || 0) + 1;
    const want = Object.entries(seen).sort((a, b) => b[1] - a[1]).map(e => COUNTER[e[0]]);
    G.nbCounter = false;
    if (!G.tut && want.length && Math.random() < 0.35 + L * 0.6) {
      const sd = M.sd.slice(0, 4), order = [0, 1, 3, 2].sort((a, b) => (sd[b] || 0) - (sd[a] || 0));
      for (const d of want) { if (d === 'barra') { if (!bd.s[4] || PZ[bd.s[4]].k === 'd') bd.s[4] = 'barra'; G.nbCounter = true; continue; }
        const i = order.find(j => PZ[bd.s[j]] && PZ[bd.s[j]].k === 'd' && bd.s[j] !== d); if (i != null) { bd.s[i] = d; G.nbCounter = true; } }
    }
    G.botTpl = T.n; setBuild(G, s, bd); st.p[s].rd = 1;
  }
  // un posto a rischio? (fossa, lame alzate o che stanno per alzarsi, recinto, olio in fiamme, bocche di fuoco, martello)
  function danger(G, x, y, ft, mean) {
    const st = G.st; let d = 0; if (x < AX0 + 0.5 || x > AX1 - 0.5 || y < AY0 + 0.5 || y > AY1 - 0.5) d += st.ar === 'cen' ? 3 : 0.5;
    if (st.ar === 'seg') { if (Math.hypot(x - FOSSA[0], y - FOSSA[1]) < (st.fr ? FR1 : FR0) + 0.75) d += 6; BLADES.forEach((b, i) => { const B = bladeT(i, ft, mean), B2 = bladeT(i, ft + 0.8, mean); if ((B.up || B2.up || B.warn) && onBlade(x, y, i)) d += 3; }); }
    else if (st.ar === 'cen') { if (Math.hypot(x - TRAFO[0], y - TRAFO[1]) < TRAFO[2] + 0.6) d += 1.5; if (mean && inPud(x, y)) d += 1.5; }
    else if (st.ar === 'cal') { const oi = inOil(x, y); if (oi >= 0 && st.oil[oi] > G.time - 0.1) d += 5; if (oi >= 0) d += 0.4; VENTS.forEach((v, i) => { const V = ventT(i, ft + 0.6, mean); if ((V.on || V.warn) && inVent(x, y, i)) d += 3; }); const hs = hamState(G, G.time); if (hs.t > hs.per - 2 && Math.hypot(x - HAMS[hs.i][0], y - HAMS[hs.i][1]) < 1.3) d += 4; }
    return d;
  }
  function botTick(G, c, dt) {
    const s = sideOf(G, c), st = G.st, P = st.p[s], o = 1 - s, Q = rob(G, o), R = c.R, T = G.time, ft = fT(G, T), mean = meanOn(G, T), L = nbLv(G);
    const A = c.ai || (c.ai = { t: 0, dir: null, mode: '', see: 0, wslot: -1 });
    if (G.tutHold) { phys(G, s, R, null, dt); return; }
    A.t -= dt;
    if (A.t <= 0) {
      A.t = 0.12 + (1 - L) * 0.12;
      const calm = ft < (c.calm || 8), dx = Q.x - R.x, dy = Q.y - R.y, dist = Math.hypot(dx, dy), aQ = Math.atan2(dy, dx);
      const slots = [0, 1, 2, 3, 4].filter(i => pieceOk(P, i) && PZ[P.bd.s[i]].k === 'w' && P.u[i] > 0);
      // l'arma con cui attaccare: quella pronta prima (con preferenze secondo l'arena)
      let ws = -1, best = 1e9; for (const i of slots) { const p = P.bd.s[i]; let v = Math.max(0, P.cd[i] - T); if (p === 'scossa' && st.ar === 'cen' && inPud(Q.x, Q.y)) v -= 3; if (p === 'fiamma' && st.ar === 'cal' && inOil(Q.x, Q.y) >= 0) v -= 2; if (p === 'pala' && danger(G, Q.x + dx / (dist || 1) * 1.8, Q.y + dy / (dist || 1) * 1.8, ft, mean) > 2) v -= 2.5; if (v < best) { best = v; ws = i; } }
      A.wslot = ws; let tx, ty, rev = false, m = 1;
      if (!calm && ws < 0) {   // senza armi: scappa (lontano dall'altro, dagli angoli e dalle trappole)
        let bv = -1e9; for (let k = 0; k < 16; k++) { const px = AX0 + 1.2 + Math.random() * (AX1 - AX0 - 2.4), py = AY0 + 1.2 + Math.random() * (AY1 - AY0 - 2.4), v = Math.hypot(px - Q.x, py - Q.y) - danger(G, px, py, ft, mean) * 2 - Math.hypot(px - R.x, py - R.y) * 0.3 - (Math.min(px - AX0, AX1 - px, py - AY0, AY1 - py) < 2 ? 2 : 0); if (v > bv) { bv = v; A.wp = [px, py]; } }
        [tx, ty] = A.wp; m = 1;
      } else if (calm || ws < 0) {   // all'inizio con calma: gira nella sua meta', lontano dalle trappole
        if (!A.wp || Math.hypot(A.wp[0] - R.x, A.wp[1] - R.y) < 0.8 || Math.random() < 0.02) { for (let k = 0; k < 12; k++) { const px = (s ? MX + 1.5 : AX0 + 1.2) + Math.random() * (MX - AX0 - 2.7), py = AY0 + 1.2 + Math.random() * (AY1 - AY0 - 2.4); if (danger(G, px, py, ft, mean) < 1) { A.wp = [px, py]; break; } } }
        [tx, ty] = A.wp || [R.x, R.y]; m = 0.55;
      } else {
        const p = P.bd.s[ws], th = SLA[ws], ux = dx / (dist || 1), uy = dy / (dist || 1);
        const IDEAL = { pala: 1.05, sega: 1.0, fiamma: 1.9, cannone: 4.5, scossa: 1.35 }, ideal = IDEAL[p];
        // la sega o la pala dell'altro sono cariche e puntate verso di me? (un meccanico furbo aspetta appena fuori, poi entra quando l'hai usata)
        const Po2 = st.p[o]; let melee = false; for (let i = 0; i < 4; i++) { const q = Po2.bd.s[i]; if ((q === 'sega' || q === 'pala') && Po2.hp[i] > 0 && Po2.u[i] > 0 && Po2.cd[i] <= T + 0.4 && Math.abs(angD(Math.atan2(R.y - Q.y, R.x - Q.x), Q.a + SLA[i])) < 1.0) melee = true; }
        if (p === 'cannone') { tx = Q.x - ux * ideal; ty = Q.y - uy * ideal; if (dist < 2.2 && ws === 0 && L > 0.3) { tx = R.x - ux * 1.6; ty = R.y - uy * 1.6; rev = true; } else if (dist < ideal + 1.5 && ws !== 4) { A.face = aQ - th; A.fm = 0.2; } }
        else if (p === 'scossa') { if (st.ar === 'cen' && inPud(Q.x, Q.y) && dist < 4.2) { tx = R.x; ty = R.y; } else { tx = Q.x - ux * ideal; ty = Q.y - uy * ideal; } if (melee && L > 0.35 && dist > 1.5 && Math.random() < L) { tx = Q.x - ux * 2.0; ty = Q.y - uy * 2.0; } }
        else if (P.cd[ws] > T + 0.4 && !(P.act && P.act[1] > T) && L > 0.3 && Math.random() < 0.4 + L * 0.6) {   // COLPISCI E SCAPPA: mentre l'arma si ricarica gira al largo (fuori portata)
          const ta = Math.atan2(-uy, -ux) + (A.orb || (A.orb = Math.random() < 0.5 ? 1 : -1)) * 0.8, r = melee ? 2.3 : 1.9; tx = Q.x + Math.cos(ta) * r; ty = Q.y + Math.sin(ta) * r; m = 0.85;
        }
        else if ((p === 'fiamma') && dist < ideal - 0.45 && L > 0.3) {   // troppo vicino per la fiamma: indietreggia tenendo il davanti verso l'altro
          tx = R.x - ux * 1.6; ty = R.y - uy * 1.6; rev = true; m = 1;
        }
        else {   // mettersi col lato dell'arma verso l'altro, alla distanza giusta
          if (dist > ideal + 0.5) {
            // da lontano: se e' forte arriva di fianco (dove l'altro non ha l'arma davanti)
            let ax = Q.x, ay = Q.y; if (L > 0.5 && p !== 'fiamma') { const sg = Math.sin(angD(Math.atan2(R.y - Q.y, R.x - Q.x), Q.a)) >= 0 ? 1 : -1, fa = Q.a + sg * Math.PI / 2; ax = Q.x + Math.cos(fa) * (ideal + 0.2); ay = Q.y + Math.sin(fa) * (ideal + 0.2); if (dist < 2.2) { ax = Q.x; ay = Q.y; } }
            else if (p === 'fiamma') { ax = Q.x - ux * ideal; ay = Q.y - uy * ideal; }
            tx = ax; ty = ay; if (ws === 2) rev = true;
          } else { tx = R.x; ty = R.y; A.face = aQ - th; A.fm = p === 'fiamma' ? 0.12 : 0.6; if (ws === 2) { rev = true; A.face = aQ; } }
          if (p === 'pala') {   // con la pala: arriva dalla parte opposta alla trappola (cosi' lo butta dentro)
            let hx = null, hy = null; if (st.ar === 'seg') { hx = FOSSA[0]; hy = FOSSA[1]; } else if (st.ar === 'cen') { const wx = Q.x - MX, wy = Q.y - MY; hx = Q.x + Math.sign(wx) * 3; hy = Q.y + Math.sign(wy) * 3; } else { const hs = hamState(G, T); hx = HAMS[hs.i][0]; hy = HAMS[hs.i][1]; }
            if (hx != null && Math.hypot(Q.x - hx, Q.y - hy) < 4.5 && dist > 1.6 && L > 0.35) { const ux = Q.x - hx, uy = Q.y - hy, l = Math.hypot(ux, uy) || 1; tx = Q.x + ux / l * 1.3; ty = Q.y + uy / l * 1.3; }
          }
        }
        if (P.tel < TEL * 0.3 && L > 0.5 && !slots.some(i => P.bd.s[i] === 'cannone')) m = 0.85;
      }
      // PRUDENZA (cresce con la forza): se e' nella zona di un'arma carica dell'altro, ne esce; da vicino contro la pala gli mostra il davanti
      const Po = st.p[o]; let threat = -1;
      if (!calm && !Po.d) for (let i = 0; i < 5; i++) { const q = PZ[Po.bd.s[i]]; if (!q || q.k !== 'w' || !(Po.hp[i] > 0) || !(Po.u[i] > 0) || Po.cd[i] > T + 0.5) continue; if (zoneHit(G, o, i, Q, R)) { threat = i; break; } }
      const myHot = slots.some(i => P.cd[i] <= T && zoneHit(G, s, i, R, Q));
      const ready = A.wslot >= 0 && P.cd[A.wslot] <= T + 0.3;
      if (threat >= 0 && !myHot && !ready && Math.random() < L * 0.9) {
        const pt = Po.bd.s[threat], away = Math.atan2(R.y - Q.y, R.x - Q.x);
        if (pt === 'pala' && dist < 1.6 && (!pieceOk(P, 4) || P.bd.s[4] !== 'barra')) { A.face = aQ; A.fm = 0.5; tx = R.x; ty = R.y; }   // gli mostra il davanti: di fronte la pala non ribalta
        else { const side = Math.sin(angD(away, Q.a + SLA[threat])) >= 0 ? 1 : -1, ea = away + side * 1.1; tx = R.x + Math.cos(ea) * 2; ty = R.y + Math.sin(ea) * 2; m = 1; rev = false; }
      }
      // direzione, evitando le trappole
      let ddx = tx - R.x, ddy = ty - R.y, dl = Math.hypot(ddx, ddy);
      if (A.face != null && dl < 0.6) { ddx = Math.cos(A.face); ddy = Math.sin(A.face); dl = 1; m = A.fm != null ? A.fm : 0.25; }
      A.face = null; A.fm = null;
      if (dl < 0.25) A.dir = null;
      else {
        let a0 = Math.atan2(ddy, ddx), bestA = a0, bd = 1e9;
        for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4, Math.PI]) { const a = a0 + da, px = R.x + Math.cos(a) * 1.0, py = R.y + Math.sin(a) * 1.0, v = danger(G, px, py, ft, mean) * (1 + L) + Math.abs(da) * 0.35; if (v < bd) { bd = v; bestA = a; } }
        A.dir = { wx: Math.cos(bestA), wy: Math.sin(bestA), m: Math.min(1, m * (0.75 + 0.25 * Math.min(1, dl / 2))) }; R.lockRev = true; R.rev = rev;   // il computer decide lui la retromarcia
      }
      // sparare: se l'altro e' nella zona di un'arma pronta (con un attimo di reazione)
      if (!st.p[o].d) for (const i of slots) { if (P.cd[i] > T || !zoneHit(G, s, i, R, Q)) { if (A.see === i) A.see = -1; continue; }
        if (calm && P.bd.s[i] !== 'scossa' && Math.random() < 0.6) continue;
        if (A.see !== i) { A.see = i; A.seeT = T + 0.12 + (1 - L) * 0.55 * Math.random(); continue; }
        if (T >= A.seeT && Math.random() < 0.55 + L * 0.45) { if (fire(G, s, i)) { A.see = -1; if (Math.random() < 0.25) say(G, c, 'hit'); } } }
      if (P.lh > T - 0.2 && Math.random() < 0.06) say(G, c, 'ouch');
    }
    phys(G, s, R, A.dir, dt); c.x = R.x; c.y = R.y; c.ha = R.a; c.walk = Math.hypot(R.vx, R.vy) > 0.2 ? (c.walk || 0) + dt * 10 : 0;
  }

  // ======================= DISEGNO DEL ROBOT =======================
  // fig(g, X, Y, TW, o): o = { bd, hp, a (direzione), s (lato), t (tempo), wa (ruote), act (posto della sega che gira), ta (mira della torretta), fp (ribaltato da), fall (0-1), stn, burn, dead }
  function fig(g, X, Y, TW, o) {
    const Uz = TW * 0.575, bd = o.bd, t = o.t;
    if (o.fall) { const k = Math.min(1, o.fall); if (k >= 1) return; g.save(); g.translate(X, Y + k * TW * 0.5); g.scale(1 - k * 0.7, 1 - k * 0.7); g.translate(-X, -Y); g.globalAlpha = 1 - k * 0.6; }
    let lift = 0, upside = false;
    if (o.fp != null) { const a = o.fp; if (a < 0.5) lift = Math.sin(a / 0.5 * Math.PI) * 0.9; else if (o.sv && a > 1.1 && a < 1.5) lift = Math.sin((a - 1.1) / 0.4 * Math.PI) * 0.6; upside = !o.sv ? a >= 0.25 : a >= 0.25 && a < 1.3; }
    const Yb = Y - lift * Uz;
    if (!o.only) g.fillStyle = 'rgba(0,0,0,.35)'; else g.fillStyle = 'rgba(0,0,0,0)'; g.beginPath(); g.ellipse(X, Y, TW * 0.46 * (1 - lift * 0.2), TW * 0.2, 0, 0, 7); g.fill();
    const ca = Math.cos(o.a), sa = Math.sin(o.a);
    const S = (u, v, z) => { const x = ca * u - sa * v, y = sa * u + ca * v; return [X + (x - y) * TW / 2, Yb + (x + y) * TW / 4 - z * Uz]; };
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    // scatola girata: facce verso chi guarda (normale con x + y > 0) e coperchio
    const box = (fr, u0, u1, v0, v1, z0, z1, col) => {
      const C = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]], fa = fr.a, c = Math.cos(fa), s2 = Math.sin(fa);
      for (let i = 0; i < 4; i++) { const [nu, nv] = N[i], nx = c * nu - s2 * nv, ny = s2 * nu + c * nv; if (nx + ny <= 0.001) continue; const sh = (Math.max(0, nx) * 0.62 + Math.max(0, ny) * 0.84) / (Math.max(0, nx) + Math.max(0, ny)); const A = C[i], B = C[(i + 1) % 4]; poly([fr.S(A[0], A[1], z0), fr.S(B[0], B[1], z0), fr.S(B[0], B[1], z1), fr.S(A[0], A[1], z1)], cqShade(col, sh)); }
      poly([fr.S(u0, v0, z1), fr.S(u1, v0, z1), fr.S(u1, v1, z1), fr.S(u0, v1, z1)], cqShade(col, 1.06));
    };
    const frame = (ang, ox, oy, oz) => { const c = Math.cos(ang), s2 = Math.sin(ang); return { a: ang, S: (p, q, z) => { const x = ox + c * p - s2 * q, y = oy + s2 * p + c * q; return [X + (x - y) * TW / 2, Yb + (x + y) * TW / 4 - (z + oz) * Uz]; } }; };
    const F0 = frame(o.a, 0, 0, 0);
    const depth = (u, v) => (ca * u - sa * v) + (sa * u + ca * v);
    const items = [];
    const team = SIDE[o.s].c, col = o.dead ? '#3a3a40' : team;
    if (upside) {   // ribaltato: la pancia e le ruote all'insu' che girano a vuoto
      box(F0, -0.36, 0.36, -0.3, 0.3, 0.02, 0.26, '#3a3e48'); box(F0, -0.3, 0.3, -0.24, 0.24, 0.26, 0.3, '#2a2c32');
      for (const [u, v] of [[0.2, 0.3], [-0.2, 0.3], [0.2, -0.3], [-0.2, -0.3]]) { const [Xw, Yw] = S(u, v, 0.42); g.fillStyle = '#18181c'; g.beginPath(); g.ellipse(Xw, Yw, TW * 0.11, TW * 0.08, 0, 0, 7); g.fill(); g.strokeStyle = '#6a6a72'; g.lineWidth = 1.5; g.beginPath(); const sp = t * 18; g.moveTo(Xw + Math.cos(sp) * TW * 0.08, Yw + Math.sin(sp) * TW * 0.05); g.lineTo(Xw - Math.cos(sp) * TW * 0.08, Yw - Math.sin(sp) * TW * 0.05); g.stroke(); }
      for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1, [Xs, Ys] = S(0, 0, 0.5 + k * 1.2); g.fillStyle = 'rgba(60,60,64,' + (0.5 * (1 - k)) + ')'; g.beginPath(); g.arc(Xs + Math.sin(t + i) * 4, Ys, TW * (0.08 + k * 0.12), 0, 7); g.fill(); }
      if (o.fall) g.restore(); return;
    }
    // ruote o cingoli
    if (o.only) { if (o.only === 't') box(F0, -0.24, 0.24, -0.2, 0.2, 0.27, 0.37, '#5a5e68'); }
    else if (bd.m === 'c') for (const v of [-0.31, 0.31]) items.push([depth(0, v), () => { box(F0, -0.38, 0.38, v - 0.075, v + 0.075, 0, 0.24, '#2a2a30'); if (TW >= 26) { g.strokeStyle = '#4a4a52'; g.lineWidth = Math.max(1, TW / 40); g.beginPath(); for (let i = 0; i < 6; i++) { const u = -0.36 + (((i * 0.13 + (o.wa || 0) * 0.02) % 0.78) + 0.78) % 0.78, vv = v + (v > 0 ? 0.075 : -0.075), A = S(u, vv, 0.02), B = S(u, vv, 0.22); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); } g.stroke(); } }]);
    else for (const [u, v] of [[0.2, 0.31], [-0.2, 0.31], [0.2, -0.31], [-0.2, -0.31]]) items.push([depth(u, v), () => { box(F0, u - 0.12, u + 0.12, v - 0.055, v + 0.055, 0, 0.24, '#202024'); const [Xh, Yh] = S(u, v + (v > 0 ? 0.06 : -0.06), 0.12); g.fillStyle = '#9aa0aa'; g.beginPath(); g.arc(Xh, Yh, Math.max(1.5, TW * 0.035), 0, 7); g.fill(); if (TW >= 26) { const sp = (o.wa || 0); g.strokeStyle = '#5a5e66'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 2; k++) { const aa = sp + k * 1.57; g.moveTo(Xh + Math.cos(aa) * TW * 0.07, Yh + Math.sin(aa) * TW * 0.06); g.lineTo(Xh - Math.cos(aa) * TW * 0.07, Yh - Math.sin(aa) * TW * 0.06); } g.stroke(); } }]);
    // il telaio col colore del lato, la griglia e gli occhi
    if (!o.only) items.push([0, () => {
      box(F0, -0.34, 0.34, -0.25, 0.25, 0.1, 0.34, col); box(F0, -0.3, 0.3, -0.21, 0.21, 0.34, 0.37, cqShade(col, 0.8));
      if (TW >= 26) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, TW / 45); g.beginPath(); for (let i = -2; i <= 2; i++) { const A = S(-0.22, i * 0.07, 0.371), B = S(0.1, i * 0.07, 0.371); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); } g.stroke(); }
      const fn = ca + sa; if (fn > -0.2) { for (const v of [-0.11, 0.11]) { const q = [S(0.341, v - 0.05, 0.22), S(0.341, v + 0.05, 0.22), S(0.341, v + 0.05, 0.29), S(0.341, v - 0.05, 0.29)]; poly(q, o.dead ? '#2a2a2e' : o.stn ? '#ffffff' : '#7af8ff'); } }
      const hp = o.tel != null ? o.tel / TEL : 1; if (hp < 0.5 && TW >= 26) { g.strokeStyle = '#1a1a1e'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < (hp < 0.25 ? 3 : 2); i++) { const a0 = S(-0.2 + i * 0.18, -0.25, 0.32), a1 = S(-0.15 + i * 0.18, -0.25, 0.2), a2 = S(-0.22 + i * 0.18, -0.25, 0.12); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); } g.stroke(); }
    }]);
    // i pezzi sui lati
    for (let i = 0; i < 4; i++) { const p = bd.s[i]; if (!PZ[p] || (o.hp && !(o.hp[i] > 0))) continue; const th = SLA[i], du = Math.cos(th) * 0.42, dv = Math.sin(th) * 0.42; items.push([depth(du, dv) * (i ? 1 : 1), () => piece(g, frame(o.a + th, 0, 0, 0), box, poly, p, TW, t, o, i)]); }
    items.sort((a, b) => a[0] - b[0]); for (const [, f] of items) f();
    // sopra
    { const p = bd.s[4]; if (PZ[p] && !(o.hp && !(o.hp[4] > 0))) topPiece(g, F0, frame, box, poly, p, TW, t, o); }
    if (!o.dead && !o.only) { const [Xl, Yl] = S(-0.27, 0.17, 0.37), r = Math.max(2.5, TW * 0.055); g.fillStyle = '#1c1c20'; g.fillRect(Xl - r * 0.5, Yl - r * 1.6, r, r * 1.6); g.fillStyle = team; g.beginPath(); g.arc(Xl, Yl - r * 1.9, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(Xl - r * 0.3, Yl - r * 2.2, r * 0.35, 0, 7); g.fill(); }
    // effetti sul robot: scintille della scossa, fiamme addosso, fumo se e' messo male
    if (o.stn) { g.strokeStyle = '#bff4ff'; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < 4; i++) { const a = t * 9 + i * 1.6, [Xa, Ya] = S(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.3 + (i % 2) * 0.2); g.moveTo(Xa, Ya); g.lineTo(Xa + Math.sin(a * 3) * 7, Ya - 6); g.lineTo(Xa - 3, Ya - 11); } g.stroke(); }
    if (o.burn) for (let i = 0; i < 4; i++) { const k = (t * 1.7 + i * 0.27) % 1, [Xf, Yf] = S(-0.2 + i * 0.13, (i % 2 - 0.5) * 0.3, 0.38 + k * 0.5); g.fillStyle = k < 0.5 ? '#ffd24a' : '#ff6a2a'; g.globalAlpha = 1 - k; g.beginPath(); g.moveTo(Xf, Yf - TW * 0.12 * (1 - k)); g.quadraticCurveTo(Xf + TW * 0.06, Yf, Xf, Yf + TW * 0.04); g.quadraticCurveTo(Xf - TW * 0.06, Yf, Xf, Yf - TW * 0.12 * (1 - k)); g.fill(); g.globalAlpha = 1; }
    if (o.tel != null && o.tel / TEL < 0.35) for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i / 2) % 1, [Xs, Ys] = S(-0.1, 0, 0.45 + k * 1.1); g.fillStyle = 'rgba(70,70,74,' + (0.45 * (1 - k)) + ')'; g.beginPath(); g.arc(Xs + Math.sin(t * 2 + i) * 4, Ys, TW * (0.06 + k * 0.1), 0, 7); g.fill(); }
    if (o.fall) g.restore();
  }
  // un pezzo montato su un lato (fr = riquadro girato verso fuori: p = in fuori, q = di lato)
  function piece(g, fr, box, poly, p, TW, t, o, slot) {
    const S = fr.S, hpk = o.hp && PZ[p] ? o.hp[slot] / PZ[p].hp : 1, dim = c => hpk < 0.4 ? cqShade(c, 0.7) : c, fire = o.fw && o.fw[slot] != null ? o.fw[slot] : 9;
    if (p === 'pala') {
      const up = fire < 0.35 ? Math.sin(fire / 0.35 * Math.PI) * 0.25 : 0;
      box(fr, 0.2, 0.36, -0.2, 0.2, 0.14, 0.24, '#5a5e68');
      const A = S(0.32, -0.33, 0.32 + up), B = S(0.32, 0.33, 0.32 + up), C = S(0.64, 0.36, 0.02 + up * 1.4), D = S(0.64, -0.36, 0.02 + up * 1.4);
      poly([A, B, C, D], dim('#f0c030'));
      if (TW >= 26) { g.save(); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.lineTo(...D); g.closePath(); g.clip(); g.strokeStyle = '#1c1c20'; g.lineWidth = Math.max(1.5, TW / 34); g.beginPath(); for (let i = -2; i <= 2; i++) { const P1 = S(0.33, i * 0.15 - 0.05, 0.3 + up), P2 = S(0.62, i * 0.15 + 0.05, 0.05 + up * 1.4); g.moveTo(...P1); g.lineTo(...P2); } g.stroke(); g.restore(); }
      g.strokeStyle = '#8a6a10'; g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); g.moveTo(...C); g.lineTo(...D); g.stroke();
    } else if (p === 'sega') {
      box(fr, 0.22, 0.44, -0.05, 0.05, 0.16, 0.24, '#5a5e68');
      const spin = o.act === slot ? t * 30 : t * 3, cx = 0.6, R0 = 0.26, z = 0.22, N = 24; g.beginPath();
      for (let i = 0; i <= N; i++) { const a = spin + i / N * 6.2832, r = i % 2 ? R0 : R0 + 0.05, [Xp, Yp] = S(cx + Math.cos(a) * r, Math.sin(a) * r, z); i ? g.lineTo(Xp, Yp) : g.moveTo(Xp, Yp); }
      g.closePath(); g.fillStyle = dim('#d0d8e0'); g.fill(); g.strokeStyle = '#7a8088'; g.lineWidth = 1; g.stroke();
      const [Xc, Yc] = S(cx, 0, z + 0.01); g.fillStyle = '#5a5e68'; g.beginPath(); g.ellipse(Xc, Yc, TW * 0.06, TW * 0.03, 0, 0, 7); g.fill();
      if (o.act === slot) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 3; i++) { const a = spin * 0.3 + i * 2.1, [Xa, Ya] = S(cx + Math.cos(a) * 0.2, Math.sin(a) * 0.2, z); g.moveTo(Xa, Ya); g.lineTo(Xc, Yc); } g.stroke(); }
    } else if (p === 'fiamma') {
      box(fr, 0.2, 0.38, -0.13, 0.13, 0.1, 0.36, dim('#c8382e')); box(fr, 0.22, 0.36, -0.11, 0.11, 0.36, 0.4, '#e8e0d0');
      box(fr, 0.36, 0.62, -0.045, 0.045, 0.22, 0.3, '#3a3e48'); box(fr, 0.6, 0.66, -0.06, 0.06, 0.2, 0.32, '#1c1e24');
      const [Xp, Yp] = S(0.67, 0, 0.26); g.fillStyle = fire < 1 ? '#ffd24a' : '#3a8aff'; g.beginPath(); g.arc(Xp, Yp, Math.max(1.5, TW * 0.03), 0, 7); g.fill();
    } else if (p === 'cannone') {
      const rc = fire < 0.25 ? (1 - fire / 0.25) * 0.08 : 0;
      box(fr, 0.2, 0.38, -0.14, 0.14, 0.1, 0.32, '#4a505a'); box(fr, 0.3 - rc, 0.78 - rc, -0.07, 0.07, 0.2, 0.33, dim('#2e323a')); box(fr, 0.74 - rc, 0.8 - rc, -0.09, 0.09, 0.18, 0.35, '#1a1c22');
    } else if (p === 'scossa') {
      box(fr, 0.22, 0.42, -0.1, 0.1, 0.1, 0.28, '#3a3e48'); coil(g, S, 0.33, 0, 0.28, TW, t, dim, fire);
    } else {   // difese: piastre sul lato
      const q = PZ[p], c0 = dim(q.c);
      if (p === 'gomma') { box(fr, 0.3, 0.43, -0.31, 0.31, 0.04, 0.27, c0); box(fr, 0.32, 0.41, -0.29, 0.29, 0.27, 0.29, '#3a3a42'); }
      else if (p === 'ammo') { box(fr, 0.4, 0.46, -0.31, 0.31, 0.06, 0.34, c0); g.strokeStyle = '#d8d8b0'; g.lineWidth = Math.max(1.5, TW / 28); g.beginPath(); for (const qv of [-0.17, 0.17]) { let P0 = S(0.3, qv, 0.2); g.moveTo(...P0); for (let k = 1; k <= 6; k++) { const P1 = S(0.3 + k * 0.017, qv + (k % 2 ? 0.05 : -0.05), 0.2); g.lineTo(...P1); } } g.stroke(); }
      else { const th = p === 'piastre' ? 0.11 : 0.08; box(fr, 0.3, 0.3 + th, -0.31, 0.31, 0.04, 0.37, c0);
        if (TW >= 26) { if (p === 'piastre' || p === 'corazza') { for (const [qq, z] of [[-0.24, 0.1], [0.24, 0.1], [-0.24, 0.31], [0.24, 0.31]]) { const [Xr, Yr] = S(0.3 + th + 0.003, qq, z); g.fillStyle = cqShade(c0, 0.6); g.beginPath(); g.arc(Xr, Yr, Math.max(1, TW / 36), 0, 7); g.fill(); } }
          if (p === 'piastre') { const A = S(0.3 + th + 0.004, -0.2, 0.35), B = S(0.3 + th + 0.004, 0.05, 0.06); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.5, TW / 26); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); }
          if (p === 'ignif') { g.strokeStyle = '#f4e8d8'; g.lineWidth = Math.max(1, TW / 34); g.beginPath(); for (const z of [0.15, 0.27]) { const A = S(0.3 + th + 0.004, -0.3, z), B = S(0.3 + th + 0.004, 0.3, z); g.moveTo(...A); g.lineTo(...B); } g.stroke(); } } }
    }
  }
  function coil(g, S, cx, cy, z0, TW, t, dim, fire) {
    for (let k = 0; k < 5; k++) { const [Xe, Ye] = S(cx, cy, z0 + k * 0.06); g.fillStyle = k % 2 ? dim('#b8742a') : dim('#d08a3a'); g.beginPath(); g.ellipse(Xe, Ye, TW * 0.07, TW * 0.035, 0, 0, 7); g.fill(); }
    const [Xs, Ys] = S(cx, cy, z0 + 0.38); g.fillStyle = '#c8d4e0'; g.beginPath(); g.arc(Xs, Ys, TW * 0.075, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Xs - TW * 0.025, Ys - TW * 0.025, TW * 0.025, 0, 7); g.fill();
    if (fire < 0.4 || Math.sin(t * 7) > 0.6) { g.strokeStyle = fire < 0.4 ? '#ffffff' : 'rgba(150,230,255,.8)'; g.lineWidth = 1.3; g.beginPath(); for (let i = 0; i < 2; i++) { const a = t * 13 + i * 3; g.moveTo(Xs, Ys); g.lineTo(Xs + Math.cos(a) * TW * 0.12, Ys + Math.sin(a) * TW * 0.08); g.lineTo(Xs + Math.cos(a + 0.5) * TW * 0.2, Ys + Math.sin(a + 0.5) * TW * 0.12); } g.stroke(); }
  }
  function topPiece(g, F0, frame, box, poly, p, TW, t, o) {
    const hpk = o.hp && PZ[p] ? o.hp[4] / PZ[p].hp : 1, dim = c => hpk < 0.4 ? cqShade(c, 0.7) : c, fire = o.fw && o.fw[4] != null ? o.fw[4] : 9;
    if (p === 'cannone') { const Ft = frame(o.ta != null ? o.ta : o.a, 0, 0, 0.37), rc = fire < 0.25 ? (1 - fire / 0.25) * 0.07 : 0; box(Ft, -0.16, 0.16, -0.16, 0.16, 0, 0.13, '#4a505a'); box(Ft, 0.05 - rc, 0.52 - rc, -0.055, 0.055, 0.05, 0.14, dim('#2e323a')); box(Ft, 0.48 - rc, 0.54 - rc, -0.07, 0.07, 0.03, 0.16, '#1a1c22'); return; }
    if (p === 'scossa') { box(F0, -0.1, 0.1, -0.1, 0.1, 0.37, 0.45, '#3a3e48'); coil(g, (u, v, z) => F0.S(u, v, z), 0, 0, 0.45, TW, t, dim, fire); return; }
    if (p === 'barra') { const S = F0.S; g.lineCap = 'round'; g.lineJoin = 'round'; for (const [w, c2] of [[Math.max(3, TW / 14), '#2a2a30'], [Math.max(1.5, TW / 26), dim('#f0c030')]]) { g.strokeStyle = c2; g.lineWidth = w; g.beginPath(); const A = S(0.02, -0.24, 0.37), B = S(0.02, -0.14, 0.58), C = S(0.02, 0.14, 0.58), D = S(0.02, 0.24, 0.37), E = S(0.02, 0, 0.58), F = S(-0.3, 0, 0.37); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.lineTo(...D); g.moveTo(...E); g.lineTo(...F); g.stroke(); } g.lineCap = 'butt'; g.lineJoin = 'miter'; return; }
    const q = PZ[p]; box(F0, -0.2, 0.2, -0.15, 0.15, 0.37, p === 'gomma' ? 0.44 : 0.42, dim(q.c));
    if (p === 'ammo') { box(F0, -0.08, 0.08, -0.08, 0.08, 0.42, 0.47, '#d8d8b0'); }
    if (p === 'ignif' && TW >= 26) { const S = F0.S; g.strokeStyle = '#f4e8d8'; g.lineWidth = Math.max(1, TW / 34); g.beginPath(); for (const v of [-0.06, 0.06]) { const A = S(-0.2, v, 0.421), B = S(0.2, v, 0.421); g.moveTo(...A); g.lineTo(...B); } g.stroke(); }
  }
  // stato disegnato di un lato (sul mio telefono)
  function figOf(G, s, R, t) {
    const st = G.st, P = st.p[s], T = lt(G), fw = {}; const L = U.fw && U.fw[s]; if (L) for (const k in L) fw[k] = t - L[k];
    const Q = rob(G, 1 - s), fp = P.fp != null ? T - P.fp : null;
    return { bd: P.bd, hp: st.ph === 'build' ? null : P.hp, a: R.a, s, t, wa: R.wa || (charOf(G, s).wa || 0), act: P.act && P.act[1] > T ? P.act[0] : -1, ta: Math.atan2(Q.y - R.y, Q.x - R.x), fp: fp != null && fp < 9 ? fp : (P.d === 'r' ? 9 : null), sv: !P.d,
      fall: P.d === 'f' ? Math.min(1, (T - P.dt) / 0.9) : R.fall && s === mySide(G) ? 0.15 : 0, stn: (P.stn || 0) > T, burn: !!(P.burn && P.burn[0] > T), tel: P.tel, dead: P.d === 's', fw };
  }
  // icona di un pezzo (per i pulsanti e l'officina): disegnato davvero, girato di tre quarti
  const ICO = {};
  function icon(p, sz = 64) {
    const k = p + sz; if (ICO[k]) return ICO[k];
    const B = 240, tmp = document.createElement('canvas'); tmp.width = tmp.height = B; const t = tmp.getContext('2d');
    const bd = { m: 'r', s: ['', '', '', '', ''] }, top = PZ[p] && (PZ[p].top === 2 || p === 'scossa'), def = PZ[p] && PZ[p].k === 'd' && !top;
    if (PZ[p]) { if (top) bd.s[4] = p; else bd.s[0] = p; }
    const a = top ? -0.55 : def ? 0.95 : 0.2;   // le difese mostrano la faccia, le armi il fianco
    try { fig(t, B / 2, B * 0.62, B * 0.55, { bd, hp: null, a, s: 0, t: 0.3, wa: 0, act: -1, fw: {}, ta: a, only: top ? 't' : 1 }); } catch (e) { void e; }
    // dove e' finito il disegno: lo centro e lo ingrandisco nella casella
    const D = t.getImageData(0, 0, B, B).data; let x0 = B, y0 = B, x1 = 0, y1 = 0;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) if (D[(y * B + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cv = document.createElement('canvas'), dpr = 2; cv.width = cv.height = sz * dpr; const g = cv.getContext('2d');
    if (x1 > x0) { const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(sz * dpr * 0.86 / w, sz * dpr * 0.86 / h); g.drawImage(tmp, x0, y0, w, h, (sz * dpr - w * sc) / 2, (sz * dpr - h * sc) / 2, w * sc, h * sc); }
    return (ICO[k] = cv.toDataURL());
  }
  const imgOf = url => { const I = U.imgs || (U.imgs = {}); let el = I[url]; if (!el) { el = I[url] = new Image(); el.src = url; } return el; };

  // ======================= INTERFACCIA =======================
  function css() {
    if (document.getElementById('rbCss')) return;
    const s = document.createElement('style'); s.id = 'rbCss';
    s.textContent = `#rbBuild{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:min(97vw,430px);max-height:calc(100% - 120px);overflow:auto;z-index:6;background:linear-gradient(#3a3e48,#22252c);border:2px solid #e8b830;border-radius:16px;padding:7px 8px 8px;color:#f2f2f6;font-family:system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.55);user-select:none;-webkit-user-select:none}
#rbBuild .hd{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:14px;margin:0 3px 4px}#rbBuild .hd .tm{background:#e8b830;color:#1c1c20;border-radius:10px;padding:2px 9px}
#rbBuild .ar{font-size:12px;line-height:1.3;background:rgba(0,0,0,.28);border-radius:10px;padding:5px 8px;margin-bottom:5px}#rbBuild .ar b{color:#ffd86a}
#rbBuild .mid{display:flex;gap:6px;align-items:center;justify-content:center}#rbBuild canvas.sch{width:190px;height:178px;touch-action:manipulation}#rbBuild canvas.pen{width:150px;height:140px}
#rbBuild .tip{font-size:12px;line-height:1.3;min-height:32px;margin:3px 2px 5px;color:#e6e6ee;text-align:center}
#rbBuild .row{display:flex;gap:4px;justify-content:center;margin:3px 0}#rbBuild .row .lb{font:800 10px system-ui;color:#c8c8d0;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;width:13px}
#rbBuild button{flex:1;min-width:0;border:0;border-radius:10px;padding:3px 1px 3px;background:#4a505c;color:#fff;font:700 10px system-ui;display:flex;flex-direction:column;align-items:center;gap:0;touch-action:manipulation}
#rbBuild button img{width:34px;height:34px;pointer-events:none}#rbBuild button.on{background:#f2f2f6;color:#1c1c20;box-shadow:0 0 0 3px #e8b830}#rbBuild button.off{opacity:.35}#rbBuild button.ok{background:#3aa860;font-size:13px;padding:7px 2px}#rbBuild button.ok.on{background:#e8b830;color:#1c1c20}#rbBuild button.gr{background:#5a4a7a;font-size:12px;padding:7px 2px}#rbBuild button.mv{flex-direction:row;gap:5px;font-size:12px;padding:4px}
#rbBuild .prev{font-size:11.5px;text-align:center;color:#ffd0b0;margin:2px 0 4px}#rbGar{margin-top:6px;background:rgba(0,0,0,.3);border-radius:10px;padding:6px}#rbGar .gl{display:flex;flex-wrap:wrap;gap:4px}#rbGar .gl button{flex:0 0 calc(50% - 2px);flex-direction:row;gap:4px;font-size:11px;padding:5px}#rbGar input{width:60%;border-radius:8px;border:0;padding:5px;font:600 13px system-ui}
#rbShow{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;font-family:system-ui}#rbShow .cur{position:absolute;left:0;right:0;top:0;height:100%;background:repeating-linear-gradient(90deg,#8a1a24 0 22px,#a8242e 22px 44px);box-shadow:0 8px 30px rgba(0,0,0,.7);animation:rbUp 1.3s .5s ease-in forwards}#rbShow .cur:after{content:'';position:absolute;left:0;right:0;bottom:0;height:26px;background:repeating-linear-gradient(90deg,#e8b830 0 12px,#c89a20 12px 24px)}
@keyframes rbUp{to{transform:translateY(-104%)}}#rbShow .cards{position:absolute;left:50%;top:116px;transform:translateX(-50%);display:flex;gap:8px;width:min(96vw,430px)}#rbShow .cd{flex:1;background:rgba(20,22,28,.9);border-radius:14px;padding:6px;text-align:center;color:#fff;border:2px solid #555}#rbShow .cd b{font-size:14px}#rbShow .cd canvas{width:100%;height:auto}#rbShow .vs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:900 30px system-ui;color:#ffd24a;text-shadow:0 3px 8px #000}
#rbW{position:absolute;right:max(10px,3%);bottom:120px;z-index:5;display:flex;flex-direction:column;gap:8px;align-items:flex-end;user-select:none;-webkit-user-select:none}#rbW button{position:relative;width:78px;height:78px;border-radius:50%;border:3px solid rgba(255,255,255,.35);padding:0;background:#2a2e36;box-shadow:0 5px 16px rgba(0,0,0,.5);touch-action:none;color:#fff;font:800 9px system-ui;overflow:hidden}
#rbW button img{position:absolute;left:8px;top:4px;width:58px;height:58px;pointer-events:none}#rbW button i{position:absolute;left:0;right:0;bottom:6px;font-style:normal;pointer-events:none;text-shadow:0 1px 2px #000}#rbW button u{position:absolute;inset:0;border-radius:50%;pointer-events:none;text-decoration:none}#rbW button s{position:absolute;right:6px;top:6px;text-decoration:none;font-size:10px;background:rgba(0,0,0,.6);border-radius:8px;padding:0 4px;pointer-events:none}
#rbW button.off{opacity:.45}#rbW button.hot{border-color:#ffd24a;box-shadow:0 0 0 4px rgba(255,210,74,.45),0 5px 16px rgba(0,0,0,.5);animation:rbHot .5s infinite alternate}@keyframes rbHot{to{box-shadow:0 0 0 7px rgba(255,210,74,.2),0 5px 16px rgba(0,0,0,.5)}}
#rbSt{position:absolute;left:8px;right:8px;top:104px;z-index:4;display:flex;justify-content:space-between;pointer-events:none}#rbSt canvas{width:124px;height:66px}
#rbTut{position:absolute;inset:0;pointer-events:none;z-index:9}#rbTut .bub{position:absolute;left:50%;transform:translateX(-50%);width:min(92vw,380px);background:#fffdf6;color:#1c1c20;border-radius:16px;padding:9px 12px 10px;box-shadow:0 8px 24px rgba(0,0,0,.4);font:600 14px/1.35 system-ui;pointer-events:auto}#rbTut .bub small{display:block;font-weight:800;color:#b8861a;margin-bottom:3px}#rbTut .bub button{float:right;border:0;background:#eee8d8;border-radius:10px;padding:3px 8px;font:700 12px system-ui;color:#1c1c20;margin-left:6px}#rbTut .hl{position:absolute;border:3px solid #ffd24a;border-radius:50%;box-shadow:0 0 0 4px rgba(255,210,74,.35)}#rbTut .fg{position:absolute;font-size:40px;transform:translateX(-50%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.4))}`;
    document.head.appendChild(s);
  }
  const ROOT = () => document.getElementById('ciack');
  // ---- L'OFFICINA: 5 posti, i pezzi, ruote o cingoli, il pentagono ----
  function buildUI(G, on) {
    css(); let el = document.getElementById('rbBuild');
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'rbBuild';
      const btn = p => `<button type="button" data-p="${p}"><img src="${icon(p, 48)}" alt="">${PZ[p].n}</button>`;
      el.innerHTML = '<div class="hd"><span>🔧 Officina</span><span class="tm"></span></div><div class="ar"></div><div class="prev"></div>'
        + '<div class="mid"><canvas class="sch" width="380" height="356"></canvas><canvas class="pen" width="300" height="280"></canvas></div><div class="tip"></div>'
        + '<div class="row">' + Object.entries(MOV).map(([k, M]) => `<button type="button" class="mv" data-m="${k}">${M.i} ${M.n}</button>`).join('') + '</div>'
        + '<div class="row"><span class="lb">ARMI</span>' + WPN.map(btn).join('') + '</div>'
        + '<div class="row"><span class="lb">DIFESE</span>' + DEF.map(btn).join('') + '</div>'
        + '<div class="row"><button type="button" data-k="x">🗑️ Togli</button><button type="button" class="gr" data-k="g">💾 Garage</button><button type="button" class="ok" data-k="r">✔ Pronto</button></div><div id="rbGar" hidden></div>';
      ROOT().appendChild(el);
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.querySelector('canvas.sch').addEventListener('click', e => { const r = e.target.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; let best = 0, bd = 9; SCH.forEach(([sx, sy], i) => { const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = i; } }); if (bd < 0.25) { U.sel = best; SFX.tick(); buildRender(cq.g); } });
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const G2 = cq.g; if (!G2 || G2.mode !== 'robot' || !G2.st) return;
        if (b.dataset.p) { mountPiece(G2, b.dataset.p); return; } if (b.dataset.m) { const bd = myBd(G2); bd.m = b.dataset.m; sendBd(G2, bd); SFX.clank(); return; }
        const k = b.dataset.k; if (k === 'x') { const bd = myBd(G2); bd.s[U.sel] = ''; sendBd(G2, bd); SFX.tick(); } else if (k === 'r') myReady(G2); else if (k === 'g') garageUI(G2); }));
    }
    buildRender(G);
  }
  const SCH = [[0.5, 0.13], [0.86, 0.5], [0.5, 0.87], [0.14, 0.5], [0.5, 0.5]];   // posti nello schema (davanti in alto)
  const myBd = G => cloneBd((U.pend && now() - U.pend.t < 1.5 ? U.pend.bd : null) || G.st.p[mySide(G)].bd);
  function mountPiece(G, p) {
    if (G.st.p[mySide(G)].rd) { SFX.no(); cqToast('Sei già <b>pronto</b>: tocca ✔ per tornare a montare.'); return; }
    const bd = myBd(G), i = U.sel, q = PZ[p];
    if (!okIn(p, i)) { SFX.no(); cqToast(q.top === 2 ? q.i + ' La <b>' + q.n + '</b> va solo <b>sopra</b>.' : q.i + ' La <b>' + q.n + '</b> non va sopra: scegli un lato.'); return; }
    const was = bd.s[i]; bd.s[i] = p;
    if (nW(bd) > MAXW) { SFX.no(); cqToast('Al massimo <b>3 armi</b>: togline una per montare questa.'); bd.s[i] = was; return; }
    sendBd(G, bd); SFX.mount();
    for (let k = 1; k <= 5; k++) { const j = (i + k) % 5; if (!bd.s[j]) { U.sel = j; break; } }
    U.lastP = p; buildRender(G);
  }
  function sendBd(G, bd) {
    if (!valid(bd)) return; const s = mySide(G);
    if (G.guest) { cqNetSend({ k: 'bd', m: bd.m, s: bd.s }); U.pend = { bd: cloneBd(bd), t: now() }; } else setBuild(G, s, bd);
    store.settings.robotLast = cloneBd(bd); saveStore(); setTimeout(() => buildRender(G), 30);
    if (G.tut) G.tutMount = (G.tutMount || 0) + 1;
  }
  function myReady(G) { const st = G.st; if (!st || st.ph !== 'build') return; const on = !st.p[mySide(G)].rd; if (G.guest) cqNetSend({ k: 'rdy', on: on ? 1 : 0 }); else st.p[mySide(G)].rd = on ? 1 : 0; SFX.ok(); setTimeout(() => buildRender(G), 60); }
  function buildRender(G) {
    const el = document.getElementById('rbBuild'); if (!el || !G || !G.st) return; const st = G.st, P = st.p[mySide(G)], bd = myBd(G), sel = U.sel;
    el.querySelectorAll('[data-p]').forEach(b => { const p = b.dataset.p, on = bd.s[sel] === p; b.classList.toggle('on', on); const tmp = cloneBd(bd); tmp.s[sel] = p; b.classList.toggle('off', !okIn(p, sel) || nW(tmp) > MAXW); });
    el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === bd.m));
    el.querySelector('[data-k=r]').classList.toggle('on', !!P.rd); el.querySelector('[data-k=r]').innerHTML = P.rd ? '✔ Pronto! (tocca per cambiare)' : '✔ Pronto';
    const A = ARENE[st.ar], ar = el.querySelector('.ar'), at = `Arena della manche ${st.n}: <b>${A.i} ${A.n}</b> — ${A.d}`; if (ar.innerHTML !== at) ar.innerHTML = at;
    const pv = el.querySelector('.prev'), o = 1 - mySide(G), ptx = st.prev ? '👀 Nella manche prima ' + esc(G.chars[o] ? G.chars[o].name : 'l\'altro') + ' aveva: ' + bdTxt(st.prev[o]) : ''; if (pv.innerHTML !== ptx) pv.innerHTML = ptx;
    const cur = bd.s[sel], tip = el.querySelector('.tip'), t2 = P.rd ? '✔ <b>Pronto!</b> Aspetti l\'altro…' : '<b>' + SLN[sel].toUpperCase() + '</b>: ' + (cur ? PZ[cur].i + ' ' + PZ[cur].d : sel === 4 ? 'qui va bene una difesa (protegge il telaio), la barra, il cannone a torretta o la scossa.' : 'tocca un pezzo per montarlo qui. Un\'arma lavora solo da questo lato.') + ' <small>(' + nW(bd) + '/3 armi · peso ' + weight(bd).toFixed(1) + ')</small>';
    if (tip.innerHTML !== t2) tip.innerHTML = t2;
    schemaDraw(el.querySelector('canvas.sch'), bd, sel, mySide(G)); pentDraw(el.querySelector('canvas.pen'), [stats(bd)], [SIDE[mySide(G)].c]);
  }
  const bdTxt = bd => bd.s.map((p, i) => PZ[p] ? PZ[p].i + ' ' + SLN[i] : '').filter(Boolean).join(' · ') + ' · ' + MOV[bd.m].i;
  function uiTickBuild(G) {
    const el = document.getElementById('rbBuild'); if (!el || !G.st) return; const st = G.st, T = lt(G), left = st.bt - (T - st.t0), tm = el.querySelector('.tm'), t2 = G.tut ? '🎓' : '⏱ ' + Math.max(0, Math.ceil(left)) + ' s';
    if (tm.textContent !== t2) tm.textContent = t2; const rd = !!st.p[mySide(G)].rd, b = el.querySelector('[data-k=r]'); if (b.classList.contains('on') !== rd) buildRender(G);
    if (left < 5.5 && left > 0 && Math.ceil(left) !== U.lastTick) { U.lastTick = Math.ceil(left); SFX.tick(); }
  }
  // schema del robot visto dall'alto: i 5 posti (davanti in alto), il pezzo montato, il posto scelto
  function schemaDraw(cv, bd, sel, side) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height; g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, bw = w * 0.36, bh = h * 0.4;
    g.fillStyle = '#18191e'; cqRR(g, 4, 4, w - 8, h - 8, 22); g.fill();
    g.fillStyle = '#26272e'; for (let i = 0; i < 6; i++) g.fillRect(cx - bw / 2 - 26, cy - bh / 2 + i * bh / 6 + 4, 18, bh / 6 - 8), g.fillRect(cx + bw / 2 + 8, cy - bh / 2 + i * bh / 6 + 4, 18, bh / 6 - 8);
    g.fillStyle = bd.m === 'c' ? '#2a2a30' : '#202024'; if (bd.m === 'c') { g.fillRect(cx - bw / 2 - 22, cy - bh / 2 - 6, 16, bh + 12); g.fillRect(cx + bw / 2 + 6, cy - bh / 2 - 6, 16, bh + 12); } else for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(cx + dx * (bw / 2 + 14) - 8, cy + dy * bh * 0.3 - 18, 16, 36);
    g.fillStyle = SIDE[side].c; cqRR(g, cx - bw / 2, cy - bh / 2, bw, bh, 14); g.fill(); g.fillStyle = '#7af8ff'; g.fillRect(cx - 22, cy - bh / 2 + 6, 14, 6); g.fillRect(cx + 8, cy - bh / 2 + 6, 14, 6);
    g.font = '800 15px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1c1c20'; g.fillText('▲ DAVANTI', cx, cy - bh / 2 + 26);
    SCH.forEach(([sx, sy], i) => { const X = sx * w, Y = sy * h, r = i === 4 ? 34 : 36, p = bd.s[i];
      g.beginPath(); g.arc(X, Y, r, 0, 7); g.fillStyle = p ? (PZ[p].k === 'w' ? '#5a3a2a' : '#2a3a4a') : 'rgba(255,255,255,.08)'; g.fill();
      g.lineWidth = i === sel ? 6 : 2.5; g.strokeStyle = i === sel ? '#ffd24a' : p ? (PZ[p].k === 'w' ? '#ff9a6a' : '#8ac0ff') : 'rgba(255,255,255,.35)'; g.setLineDash(p ? [] : [6, 5]); g.stroke(); g.setLineDash([]);
      if (p) { const im = imgOf(icon(p, 48)); if (im.complete) g.drawImage(im, X - 30, Y - 32, 60, 60); else im.onload = () => { const G2 = cq.g; if (G2 && G2.st) buildRender(G2); }; }
      else { g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '700 30px system-ui'; g.fillText('+', X, Y); }
      g.font = '800 13px system-ui'; g.fillStyle = '#ddd'; g.fillText(i === 4 ? 'sopra' : '', X, Y + r + 10); });
  }
  // pentagono: Attacco, Difesa, Velocita', Spinta, Resistenza (uno o due robot sovrapposti)
  const PL = ['Attacco', 'Difesa', 'Velocità', 'Spinta', 'Resistenza'];
  function pentDraw(cv, vals, cols) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, cx = w / 2, cy = h / 2 + 8, R = Math.min(w, h) * 0.32; g.clearRect(0, 0, w, h);
    const pt = (i, k) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]; };
    for (const k of [0.33, 0.66, 1]) { g.beginPath(); for (let i = 0; i < 5; i++) g.lineTo(...pt(i, k)); g.closePath(); g.strokeStyle = 'rgba(255,255,255,' + (k === 1 ? 0.45 : 0.18) + ')'; g.lineWidth = 2; g.stroke(); }
    vals.forEach((v, j) => { g.beginPath(); for (let i = 0; i < 5; i++) g.lineTo(...pt(i, 0.08 + 0.92 * v[i])); g.closePath(); g.fillStyle = cols[j] + '66'; g.fill(); g.strokeStyle = cols[j]; g.lineWidth = 3.5; g.stroke(); });
    g.font = '800 17px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f2f2f6';
    for (let i = 0; i < 5; i++) { const [X, Y] = pt(i, 1.24), hw = g.measureText(PL[i]).width / 2 + 3; g.fillText(PL[i], Math.max(hw, Math.min(w - hw, X)), Math.max(12, Math.min(h - 12, Y))); }
  }
  // GARAGE DEI PROGETTI: robot salvati con un nome (su questo dispositivo)
  const garL = () => { const L = store.settings.robotGar; return Array.isArray(L) ? L.filter(x => x && valid(x.bd)).slice(0, 8) : []; };
  function garageUI(G) {
    const box = document.getElementById('rbGar'); if (!box) return; if (!box.hidden) { box.hidden = true; return; } box.hidden = false;
    const L = garL();
    box.innerHTML = '<b>💾 Garage dei progetti</b><div style="display:flex;gap:4px;margin:4px 0"><input maxlength="16" placeholder="Nome del robot"><button type="button" data-s="1" class="ok" style="flex:0 0 36%">Salva questo</button></div><div class="gl">'
      + (L.length ? L.map((x, i) => `<button type="button" data-l="${i}">${esc(x.n)}<br><small>${x.bd.s.map(p => PZ[p] ? PZ[p].i : '·').join('')} ${MOV[x.bd.m].i}</small></button>`).join('') : '<small style="opacity:.7">Nessun progetto salvato: dai un nome al robot e salvalo.</small>') + '</div>';
    box.querySelector('[data-s]').onclick = e => { e.stopPropagation(); const n = (box.querySelector('input').value || '').trim().slice(0, 16) || 'Robot ' + (L.length + 1); const L2 = garL().filter(x => x.n !== n); L2.unshift({ n, bd: myBd(G) }); store.settings.robotGar = L2.slice(0, 8); saveStore(); SFX.ok(); box.hidden = true; garageUI(G); cqToast('💾 <b>' + esc(n) + '</b> salvato nel garage.'); };
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = garL()[+b.dataset.l]; if (!x) return; sendBd(G, cloneBd(x.bd)); SFX.mount(); box.hidden = true; });
  }
  // ---- LA TENDA: si alza e si vedono i due robot con i pentagoni ----
  function showUI(G, on) {
    css(); let el = document.getElementById('rbShow'); if (!on) { if (el) el.remove(); return; } if (el) return;
    el = document.createElement('div'); el.id = 'rbShow'; const st = G.st, s0 = mySide(G), s1 = 1 - s0;
    el.innerHTML = '<div class="cards">' + [s0, s1].map(s => `<div class="cd" style="border-color:${SIDE[s].c}"><b>${esc(G.chars[s] ? G.chars[s].name : '')}</b><canvas class="rb" width="260" height="190"></canvas><canvas class="pn" width="260" height="210"></canvas><div style="font-size:11px">${bdTxt(st.p[s].bd)}</div></div>`).join('') + '</div><div class="vs">VS</div><div class="cur"></div>';
    ROOT().appendChild(el);
    const cvs = el.querySelectorAll('canvas.rb'), pns = el.querySelectorAll('canvas.pn');
    [s0, s1].forEach((s, j) => { const g = cvs[j].getContext('2d'); fig(g, 130, 140, 170, { bd: st.p[s].bd, hp: null, a: j ? -2.4 : -0.75, s, t: 0.5, wa: 0, act: -1, fw: {}, ta: -0.75 }); pentDraw(pns[j], [stats(st.p[s].bd), stats(st.p[1 - s].bd)], [SIDE[s].c, '#ffffff']); });
    SFX.curtain();
  }
  // ---- IN BATTAGLIA: un pulsante per ogni arma montata (con la ricarica) e lo stato dei due robot ----
  function fightUI(G, on) {
    css(); for (const id of ['rbW', 'rbSt']) { const e = document.getElementById(id); if (!on && e) e.remove(); } if (!on) return;
    const st = G.st, s = mySide(G), P = st.p[s], key = P.bd.s.join(',');
    let el = document.getElementById('rbW'); if (el && el.dataset.k !== key) { el.remove(); el = null; }
    if (!el) {
      el = document.createElement('div'); el.id = 'rbW'; el.dataset.k = key;
      const slots = [0, 1, 2, 3, 4].filter(i => PZ[P.bd.s[i]] && PZ[P.bd.s[i]].k === 'w');
      el.innerHTML = slots.map((i, n) => `<button type="button" data-i="${i}"><u></u><img src="${icon(P.bd.s[i], 64)}" alt=""><s></s><i>${n + 1} · ${SLS[i]}</i></button>`).join('');
      ROOT().appendChild(el);
      el.querySelectorAll('button').forEach(b => { b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); myFire(cq.g, +b.dataset.i); }); b.oncontextmenu = e => e.preventDefault(); });
    }
    if (!document.getElementById('rbSt')) { const d = document.createElement('div'); d.id = 'rbSt'; d.innerHTML = '<canvas width="248" height="132"></canvas><canvas width="248" height="132"></canvas>'; ROOT().appendChild(d); }
  }
  function myFire(G, i) {
    const st = G && G.st; if (!st || st.ph !== 'fight') return; const s = mySide(G), P = st.p[s], T = lt(G);
    if (!(P.hp[i] > 0) || !(P.u[i] > 0) || P.cd[i] > T + 0.05 || P.d || stunned(G, s, T)) { SFX.no(); return; }
    if (G.guest) { if (now() - (U.fT || 0) < 0.25) return; U.fT = now(); cqNetSend({ k: 'f', i, x: r2(U.R.x), y: r2(U.R.y), a: r2(U.R.a) }); P.cd[i] = T + 0.4; }
    else fire(G, s, i);
  }
  function uiTickFight(G) {
    const el = document.getElementById('rbW'); if (!el || !G.st) return; const st = G.st, s = mySide(G), P = st.p[s], T = lt(G), R = U.R, Q = rob(G, 1 - s);
    el.querySelectorAll('button').forEach(b => { const i = +b.dataset.i, p = P.bd.s[i], q = PZ[p], dead = !(P.hp[i] > 0) || !(P.u[i] > 0), left = Math.max(0, P.cd[i] - T), tot = q.cd * (i === 4 && p === 'cannone' ? 1.4 : 1), k = dead ? 0 : 1 - Math.min(1, left / tot);
      const hot = !dead && left <= 0 && !st.p[1 - s].d && R && zoneHit(G, s, i, R, Q); U.hot[i] = hot;
      const key = (dead ? 'x' : Math.round(k * 20)) + (hot ? 'h' : '') + P.u[i]; if (b.dataset.k === key) return; b.dataset.k = key;
      b.classList.toggle('off', dead || left > 0); b.classList.toggle('hot', hot);
      b.querySelector('u').style.background = dead ? 'rgba(0,0,0,.6)' : left > 0 ? `conic-gradient(rgba(0,0,0,0) ${k * 360}deg, rgba(0,0,0,.62) ${k * 360}deg)` : 'none';
      b.querySelector('s').textContent = dead ? (P.hp[i] > 0 ? 'finita' : 'rotta') : '×' + P.u[i]; b.style.borderColor = hot ? '' : TY[q.t].c + '99'; });
    const sc = document.querySelectorAll('#rbSt canvas'); if (sc.length === 2 && now() - (U.stT || 0) > 0.12) { U.stT = now(); statusDraw(sc[0], G, s); statusDraw(sc[1], G, 1 - s); }
  }
  // lo stato di un robot: i 5 posti col loro colore (verde = sano, rosso = quasi rotto, vuoto = volato via) e la barra del telaio
  function statusDraw(cv, G, s) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, st = G.st, P = st.p[s], c = G.chars[s]; g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(16,18,24,.72)'; cqRR(g, 2, 2, w - 4, h - 4, 18); g.fill(); g.strokeStyle = SIDE[s].c; g.lineWidth = 3; g.stroke();
    g.font = '800 21px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText((c ? c.name : '').slice(0, 10), 12, 22);
    const cx = w - 52, cy = 66, d = 30;
    const pos = [[0, -d], [d, 0], [0, d], [-d, 0], [0, 0]];
    g.fillStyle = SIDE[s].d; cqRR(g, cx - 20, cy - 20, 40, 40, 8); g.fill();
    pos.forEach(([dx, dy], i) => { const p = P.bd.s[i], q = PZ[p]; if (!q) return; const k = Math.max(0, P.hp[i] / q.hp), X = cx + dx, Y = cy + dy;
      g.beginPath(); g.arc(X, Y, 14, 0, 7); g.fillStyle = k <= 0 ? 'rgba(255,255,255,.08)' : k > 0.6 ? '#3aa860' : k > 0.3 ? '#e8b830' : '#e04a3a'; g.fill();
      if (k > 0) { g.font = '17px system-ui'; g.textAlign = 'center'; g.fillText(q.i, X, Y + 1); } else { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.stroke(); } });
    const k = P.tel / TEL; g.fillStyle = 'rgba(255,255,255,.15)'; cqRR(g, 12, 44, w - 128, 18, 9); g.fill(); g.fillStyle = k > 0.5 ? '#3ad870' : k > 0.25 ? '#ffd24a' : '#ff4a3a'; cqRR(g, 12, 44, Math.max(10, (w - 128) * k), 18, 9); g.fill();
    g.font = '800 15px system-ui'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('telaio ' + Math.ceil(P.tel), 16, 54);
    g.font = '700 16px system-ui'; g.fillText((MOV[P.bd.m].i) + ((P.stn || 0) > lt(G) ? ' ⚡ fermo!' : P.burn && P.burn[0] > lt(G) ? ' 🔥 brucia!' : ''), 12, 88);
    const sc = st.sc || {}; g.fillText('🏆 ' + (sc[s] || 0), 12, 114);
  }
  // ---- passaggi di fase sul mio telefono ----
  function stage(G) {
    const st = G.st, key = st ? st.ph + st.n : ''; if (key === U.ph) return; U.ph = key; const p = st ? st.ph : '';
    buildUI(G, p === 'build'); showUI(G, p === 'reveal'); fightUI(G, p === 'fight' || p === 'ko');
    if (p === 'build') { U.sel = 0; U.pend = null; if (G.guest && st.n === 1 && !U.sentLast) { U.sentLast = 1; sendBd(G, myLast()); } if (st.n === 1 && !G.tut) helpOnce(); if (U.arK !== st.ar + st.n) { U.arK = st.ar + st.n; cq.bg = null; } }
    if (p === 'fight') { U.R = null; SFX.siren(); }
    if (p === 'mres') { if (st.win >= 0) SFX[st.win === mySide(G) ? 'win' : 'lose'](); }
  }
  function helpOnce() {
    try { if (localStorage.getItem('robotHelp')) return; localStorage.setItem('robotHelp', '1'); } catch { return; }
    setTimeout(() => cqToast('🔧 <b>Monta il tuo robot!</b> Tocca un posto (davanti, lati, dietro, sopra) e poi un pezzo. Al massimo 3 armi: ognuna colpisce <b>solo dal suo lato</b>.'), 1200);
  }
  function fxEvents(G) {
    const st = G.st; if (!st || !st.ev) return; const T = now(), ms = mySide(G);
    for (const e of st.ev) {
      if (e[0] <= U.evSeen) continue; U.evSeen = e[0];
      const [, k, x, y, a, b, c, d] = e, me = a === ms;
      if (k === 'fw') { (U.fw || (U.fw = [{}, {}]))[a][b] = T; const p = d;
        if (p === 'pala') { SFX.pala(); U.fx.push({ k: 'arc', x, y, a: c / 100, t: T, c: '#ffe8a0' }); }
        else if (p === 'sega') SFX.saw();
        else if (p === 'fiamma') { SFX.flame(); U.fx.push({ k: 'flame', x, y, a: c / 100, t: T }); }
        else if (p === 'cannone') { SFX.boom(); U.fx.push({ k: 'smoke', x, y, t: T }); if (me) U.shake = T; }
        else if (p === 'scossa') { SFX.zap(); const R = rob(G, a); U.fx.push({ k: 'ring', x: R.x, y: R.y, t: T, big: st.ar === 'cen' && inPud(rob(G, 1 - a).x, rob(G, 1 - a).y) }); } }
      else if (k === 'h') { const TYc = TY[b] ? TY[b].c : '#fff'; U.fx.push({ k: 'num', x, y, t: T, s: '-' + c, c: me ? '#ff8a7a' : TYc }); if (c >= 3) { SFX.hit(); U.fx.push({ k: 'spark', x, y, t: T, c: TYc }); } if (me && c >= 3) { U.shake = T; U.hitT = T; } }
      else if (k === 'pz') { SFX.smash(); U.deb.push({ p: c, s: a, slot: b, x, y, t: T, dx: (Math.random() - 0.5) * 3, dy: (Math.random() - 0.5) * 3 }); U.fx.push({ k: 'txt', x, y, t: T, s: (PZ[c] ? PZ[c].i + ' ' : '') + (me ? 'hai perso: ' : 'vola via: ') + (PZ[c] ? PZ[c].n : ''), c: me ? '#ffb0a0' : '#ffe8a0' }); if (me) U.shake = T; }
      else if (k === 'kb') { if (G.guest && me && U.R) applyKnock(U.R, b / 100, c / 100, (d || 30) / 100); }
      else if (k === 'st') { if (me) cqToast('⚡ <b>Motori spenti!</b>'); }
      else if (k === 'fp') { SFX.flip(); if (b) setTimeout(() => SFX.boing(), 1100); U.fx.push({ k: 'txt', x, y, t: T, s: b ? '🔄 la barra lo raddrizza!' : '🔄 RIBALTATO!', c: '#b8e86a' }); U.slow = b ? 0 : T; }
      else if (k === 'fa') { SFX.fall(); U.slow = T; U.fx.push({ k: 'txt', x, y, t: T, s: '🕳️ NELLA FOSSA!', c: '#ffffff' }); }
      else if (k === 'bo') { SFX.smash(); setTimeout(() => SFX.boom(), 150); U.slow = T; for (let i = 0; i < 5; i++) U.deb.push({ p: st.p[a].bd.s[i], s: a, slot: i, x, y, t: T, dx: (Math.random() - 0.5) * 4, dy: (Math.random() - 0.5) * 4 }); U.fx.push({ k: 'boom', x, y, t: T }); U.fx.push({ k: 'txt', x, y, t: T, s: '🔧 SMONTATO!', c: '#ffd24a' }); }
      else if (k === 'bh') { SFX.hit(); U.fx.push({ k: 'boom', x, y, t: T, sm: 1 }); }
      else if (k === 'bw') U.fx.push({ k: 'smoke', x, y, t: T });
      else if (k === 'ig') { SFX.flame(); U.fx.push({ k: 'txt', x, y, t: T, s: '🔥 L\'OLIO PRENDE FUOCO!', c: '#ffb050' }); }
      else if (k === 'ham') { SFX.ham(); U.fx.push({ k: 'dust', x, y, t: T }); U.shake = T; }
      else if (k === 'sh') { SFX.zap(); U.fx.push({ k: 'spark', x, y, t: T, c: '#9adcff', big: 1 }); }
      else if (k === 'pu') { SFX.zap(); U.fx.push({ k: 'pulse', t: T }); }
      else if (k === 'fr') { SFX.ham(); U.fx.push({ k: 'txt', x, y, t: T, s: '🕳️ LA FOSSA SI ALLARGA!', c: '#ffd24a' }); }
      else if (k === 'cb') { const C = COMBO[b]; if (!C) continue; SFX.combo(); U.fx.push({ k: 'combo', x, y, t: T, s: C.i + ' COMBO: ' + C.n + '!', me }); if (me && !G.tut) noteCombo(b); }
    }
    U.fx = U.fx.filter(f => T - f.t < 2.2); U.deb = U.deb.filter(f => T - f.t < 3.5);
  }
  function bgFossa() { const B = cq.bg; if (!B) return; const TW = B.TW, TH = TW / 2; cqBgZone([B.ox + (9 - 14) * TW / 2, B.oy + (9 + 7) * TH / 2 - TW, B.ox + (15 - 7) * TW / 2, B.oy + (15 + 13) * TH / 2 + TW]); }
  // QUADERNO DELLE COMBO (per dispositivo)
  function noteCombo(id) { const Q = store.settings.robotCb || (store.settings.robotCb = {}); if (Q[id]) return; Q[id] = Date.now(); saveStore(); setTimeout(() => cqToast('📒 <b>Nuova combo nel quaderno!</b> ' + COMBO[id].i + ' ' + COMBO[id].n + ' (' + Object.keys(Q).length + '/' + Object.keys(COMBO).length + ')'), 900); }
  function quaderno() {
    const Q = store.settings.robotCb || {}, n = Object.keys(COMBO).filter(k => Q[k]).length;
    return `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">📒 Quaderno delle combo: ${n}/${Object.keys(COMBO).length}</summary>` + Object.entries(COMBO).map(([k, C]) => Q[k] ? `<p style="margin:5px 0">✅ <b>${C.i} ${C.n}</b><br><small>${C.d}</small></p>` : `<p style="margin:5px 0;opacity:.7">❔ <b>???</b> <small>(indizio: ${C.h})</small></p>`).join('') + '</details>';
  }

  // ======================= TUTORIAL (da solo contro Nonno Bullone, che aspetta) =======================
  const qs = q => document.querySelector(q);
  const tutOn = G => !!(G && G.tut && !G.tutDone);
  const TUT = [
    { t: 'Benvenuto in officina! 🔧 Il tuo robot ha <b>5 posti</b>. Tocca un posto nello schema e poi un <b>pezzo</b> per montarlo. Prova: monta un\'arma.', ph: 'build', at: () => qs('#rbBuild [data-p=sega]'), ok: G => (G.tutMount || 0) >= 1 },
    { t: 'Un\'arma colpisce <b>solo dal suo lato</b>, una difesa protegge <b>solo il suo lato</b>. Ora tocca il posto <b>DIETRO</b> nello schema e monta una difesa.', ph: 'build', at: () => { const c = qs('#rbBuild canvas.sch'); if (!c) return null; const r = c.getBoundingClientRect(); return { el: { getBoundingClientRect: () => ({ left: r.left + r.width * 0.5 - 22, top: r.top + r.height * 0.87 - 22, width: 44, height: 44 }) } }; }, ok: G => (G.tutMount || 0) >= 2 },
    { t: 'Guarda il <b>pentagono</b>: ogni pezzo pesa. Più pezzi = più <b>spinta</b> e <b>difesa</b>, ma meno <b>velocità</b>. Ruote veloci o cingoli che spingono? Quando hai finito tocca <b>✔ Pronto</b>.', ph: 'build', at: () => qs('#rbBuild [data-k=r]'), ok: G => G.st.ph !== 'build' },
    { t: 'Si alza la tenda: ecco il robot di Nonno Bullone! Ora <b>guida</b>: tieni il dito sullo schermo e trascinalo. Spingendo all\'indietro vai in <b>retromarcia</b>.', ph: 'fight', at: () => ({ map: 1 }), ok: G => Math.hypot(U.R ? U.R.x - START[mySide(G)][0] : 0, U.R ? U.R.y - START[mySide(G)][1] : 0) > 2 },
    { t: 'La <b>zona colorata</b> a terra mostra dove arriva ogni arma. Avvicinati al Nonno: quando il pulsante <b>si accende di giallo</b> premilo!', ph: 'fight', at: () => qs('#rbW button'), ok: G => (G.tutFire || 0) >= 1 },
    { t: '💡 Ultimi segreti: colpisci dove <b>non ha difese</b> (da dietro fa più male!), usa le <b>trappole</b> dell\'arena contro di lui e scopri le <b>combo</b> 📒. Ora si fa sul serio: buona battaglia!', ph: 'fight', at: () => null, ok: G => G.time - (G.tutT || 0) > 8 }];
  window.robotTutorial = () => {
    if (cq.net) { cqToast('🎓 Il tutorial si fa <b>da soli</b>: esci dal set e riprova.'); return; }
    U.tut = 1; const go = document.getElementById('lbGo'); if (go) go.click();
  };
  function tutEnd(G) { G.tutS = TUT.length; G.tutDone = true; G.tutHold = false; const el = document.getElementById('rbTut'); if (el) el.remove(); store.settings.robotTut = 1; saveStore(); if (G.st && G.st.ph === 'fight') G.st.t0 = r2(G.time); }
  function tutTick(G) {
    if (!G || G.mode !== 'robot' || !G.tut || G.tutDone || G.phase !== 'play' || !G.st || G.pre > 0) { const el = document.getElementById('rbTut'); if (el && (!G || G.mode !== 'robot' || G.phase !== 'play')) el.remove(); return; }
    if (G.tutS == null) G.tutS = 0; const S = TUT[G.tutS]; if (!S) return tutEnd(G);
    G.tutHold = G.st.ph === 'fight' && G.tutS < TUT.length - 1;
    let el = document.getElementById('rbTut'); if (!el) { el = document.createElement('div'); el.id = 'rbTut'; el.innerHTML = '<div class="hl"></div><div class="fg">👆</div><div class="bub"></div>'; ROOT().appendChild(el); }
    if (S.ph !== G.st.ph) { el.style.display = 'none'; if (S.ok(G)) { G.tutS++; G.tutT = G.time; SFX.ok(); if (G.tutS >= TUT.length) tutEnd(G); } return; } el.style.display = '';
    const bub = el.querySelector('.bub'), html = `<button type="button">Salta</button><small>🎓 TUTORIAL ${G.tutS + 1}/${TUT.length}</small>${S.t}`;
    if (bub.dataset.k !== String(G.tutS)) { bub.dataset.k = String(G.tutS); bub.innerHTML = html; bub.querySelector('button').onclick = () => tutEnd(G); G.tutT = G.time; }
    const box = ROOT().getBoundingClientRect(); bub.style.top = (G.st.ph === 'build' ? 70 : 150) + 'px';
    const at = S.at(G), hl = el.querySelector('.hl'), fg = el.querySelector('.fg'); let X = null, Y = null, rw = 50, rh = 50;
    if (at && at.map) { X = box.width * 0.3 + Math.sin(now() * 2) * 40; Y = box.height * 0.62; rw = rh = 90; }
    else if (at) { const e2 = at.el || at, r = e2.getBoundingClientRect && e2.getBoundingClientRect(); if (r && r.width) { X = r.left - box.left + r.width / 2; Y = r.top - box.top + r.height / 2; rw = r.width; rh = r.height; } }
    hl.style.display = fg.style.display = X == null ? 'none' : '';
    if (X != null) { fg.style.left = X + 'px'; fg.style.top = (Y + rh / 2 - 4) + 'px'; hl.style.left = (X - rw / 2 - 5) + 'px'; hl.style.top = (Y - rh / 2 - 5) + 'px'; hl.style.width = (rw + 10) + 'px'; hl.style.height = (rh + 10) + 'px'; }
    if (S.ok(G)) { G.tutS++; G.tutT = G.time; SFX.ok(); if (G.tutS >= TUT.length) tutEnd(G); }
  }
  cqEachFrame(() => tutTick(cq.g));

  const RULES = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">📖 Come si gioca</summary><p>Uno contro uno nello <b>scantinato dell\'hotel</b>. Vince chi prende per primo <b>2 manche</b>.</p>'
    + '<p><b>1. L\'officina</b> (in segreto, 45 secondi): il robot ha <b>5 posti</b>: davanti, destra, dietro, sinistra e sopra. Al massimo <b>3 armi</b>, il resto difese. Scegli anche <b>ruote</b> (veloci, slittano sull\'olio) o <b>cingoli</b> (lenti, spingono forte). Ogni pezzo <b>pesa</b>: più pezzi = più lento ma più difficile da spingere. Il <b>pentagono</b> ti mostra com\'è il robot.</p>'
    + '<p><b>2. I lati contano</b>: un\'arma colpisce <b>solo dal suo lato</b> (la scossa tutto intorno), una difesa protegge <b>solo il suo lato</b>. Da <b>dietro</b> i colpi fanno di più: giragli intorno!</p>'
    + '<p><b>3. Ogni arma ha la sua difesa</b>: 🚜 pala → 🔄 barra · 🪚 sega → 🔩 acciaio · 🔥 fiamma → 🧯 ignifugo · 💣 cannone → 🌀 molle · ⚡ scossa → ⚫ gomma. La 🛡️ corazza ferma un po\' di tutto. Tutto <b>si consuma</b>: le armi hanno i colpi contati e i pezzi rotti <b>volano via</b>.</p>'
    + '<p><b>4. Si vince</b> buttando l\'altro nella <b>fossa</b>, <b>ribaltandolo</b> (pala di fianco o da dietro, se non ha la barra) o <b>smontandolo</b> (telaio a zero). A tempo scaduto (90 s) vince chi ha più telaio.</p>'
    + '<p><b>5. L\'arena cambia</b> a ogni manche (la sai prima di montare): 🪚 <b>Segheria</b> (lame dal pavimento, fossa), ⚡ <b>Centralina</b> (recinto elettrico, pozzanghere), 🔥 <b>Caldaia</b> (olio, bocche di fuoco, martello gigante). Negli <b>ultimi 30 secondi</b> l\'arena si fa più cattiva! Le trappole del pavimento colpiscono <b>da sotto</b>: le ferma solo il pezzo <b>sopra</b>, se è quello giusto.</p>'
    + '<p><b>6. Dalla seconda manche</b> hai 30 secondi per ritoccare il robot sapendo com\'era quello dell\'altro. Salva i tuoi progetti nel 💾 <b>garage</b> e scopri le <b>combo</b> 📒 (arma + trappola).</p></details>';

  CQ_MODES.robot = {
    n: 'Officina dei robot',
    desc: '🤖 Uno contro uno: monta in segreto il robot da combattimento e sfida l\'altro nello scantinato pieno di trappole.',
    maps: [['robot', 'Scantinato dell\'officina']],
    ns: [[2, '2']],
    def: { map: 'robot', n: 2, fill: true },
    opts: () => { css(); const done = store.settings.robotTut; return '<div style="background:rgba(232,184,48,.12);border:1px solid rgba(232,184,48,.5);border-radius:12px;padding:8px 10px;margin:6px 0"><b>' + (done ? '🎓 Vuoi ripassare?' : '🎓 Prima volta? Impara in due minuti!') + '</b><br><small>Una manche da solo contro Nonno Bullone, con un dito che ti mostra cosa fare.</small><br><button type="button" onclick="robotTutorial()" style="margin-top:6px;border:0;border-radius:10px;padding:7px 14px;font-weight:800;background:#b8861a;color:#fff">🎓 Tutorial</button></div>' + RULES + quaderno(); },
    read: () => ({}),
    start(G) {
      G.opp = G.chars.find(c => c !== G.me) || null;
      G.tut = !!U.tut; U.tut = null; G.tutS = G.tut ? 0 : null; G.tutDone = false; G.tutHold = false;
      for (const c of G.chars) if (c.bot && !c.remote) { c.name = 'Nonno Bullone'; c.look = { skin: 'omino', col: '#6a5a4a', hat: 'nessuno' }; }
      Object.assign(U, U0()); newRound(G, 1, {}); cq.bg = null;
    },
    gstart(G) { G.opp = G.chars.find(c => c !== G.me) || null; G.st = null; Object.assign(U, U0()); cq.bg = null; },
    hide: c => { const G = cq.g; if (!G || !G.st) return false; const p = G.st.ph; if (p === 'build' || p === 'reveal') return c !== G.me; const P = G.st.p[sideOf(G, c)]; return !!(P && P.d === 'f' && lt(G) - P.dt > 0.95); },
    intro: () => '🔧 Si accendono le luci dell\'officina…',
    voice: () => 1,
    speed: c => { const G = cq.g; return G && c === G.me ? 0 : 1; },
    csnap: c => { const G = cq.g; const a = c === G.me && U.R ? U.R.a : c.R && c.bot && !c.remote ? c.R.a : c.ha || 0; return [Math.round(angN(a) * 100)]; },
    capply(G, c, a) { if (c !== G.me && a && a[0] != null) c.hat = a[0] / 100; },
    night: G => { const st = G.st; return { a: st && st.ph === 'build' ? 0.45 : 0.18, r: 6, lights: [[7.5, AY0 + 0.4, 5, 0.9], [12.5, AY0 + 0.4, 5, 0.9], [17.5, AY0 + 0.4, 5, 0.9], [AX0 + 0.4, 6.5, 4.5, 0.8], [AX0 + 0.4, 10.5, 4.5, 0.8], [AX0 + 0.4, 14.5, 4.5, 0.8], [MX, MY, 7, 0.6]], see: () => true }; },
    extras(G) {
      const L = [], st = G.st; if (!st || st.ph === 'build') return L; const T = lt(G), ft = fT(G, T), mean = meanOn(G, T); G.__xd = G.__xd || {};
      const X = (key, x, y, f, box, top) => { let d = G.__xd[key]; if (!d) { d = G.__xd[key] = (g, X2, Y2, TW) => d.f(g, X2, Y2, TW); d.box = box; d.top = top; } d.f = f; L.push({ x, y, L: null, w: 0, f: 1, name: null, all: true, dr: d }); };
      if (st.ar === 'seg') BLADES.forEach((b, i) => { const B = bladeT(i, ft, mean); if (!(B.k > 0) && !B.warn) return; X('bl' + i, b[0], b[1], (g, X2, Y2, TW) => bladeFig(g, X2, Y2, TW, b[2], B.k, B.warn, now()), [1.3, 1.0, 0.8], 0.8); });
      if (st.ar === 'cen') X('tr', TRAFO[0], TRAFO[1], (g, X2, Y2, TW) => trafoFig(g, X2, Y2, TW, now(), mean), [1.0, 2.4, 0.6], 2.2);
      if (st.ar === 'cal') {
        OILS.forEach((o, i) => { if (!(st.oil[i] > T)) return; X('oil' + i, o[0], o[1] + 0.01, (g, X2, Y2, TW) => oilFire(g, X2, Y2, TW, o[2], now(), st.oil[i] - T), [o[2] * 1.4, 1.6, o[2] * 0.8], 1.2); });
        const hs = hamState(G, T), sp = HAMS[hs.i]; let hz = 4.2; if (hs.t > hs.per - 0.3) hz = 4.2 * (hs.per - hs.t) / 0.3; else if (hs.t < 0.7 && hs.k > 0) { const pv = HAMS[(hs.k - 1) % HAMS.length]; X('hmp', pv[0], pv[1] + 0.01, (g, X2, Y2, TW) => hammerFig(g, X2, Y2, TW, 4.2 * Math.min(1, hs.t / 0.7)), [1.0, 6.5, 0.6], 0.5); hz = 9; }
        if (hz < 5) X('hm', sp[0], sp[1] + 0.01, (g, X2, Y2, TW) => hammerFig(g, X2, Y2, TW, hz), [1.0, 6.5, 0.6], 0.5);
      }
      return L;
    },
    hud(G) {
      const st = G.st; if (!st) return '🤖'; const sc = st.sc || {}, o = G.opp, s = mySide(G), A = ARENE[st.ar], T = lt(G), left = st.ph === 'fight' ? FIGHT - (T - st.t0) : 0;
      return `🤖 Manche ${st.n} · ${A.i} ${A.n} · 🏆 ${sc[s] || 0}-${sc[1 - s] || 0}${o ? ' ' + esc(o.name) : ''}${st.ph === 'fight' && !tutOn(G) ? ' · ⏱ ' + Math.max(0, Math.ceil(left)) : ''}`;
    },
    big(G) {
      const st = G.st; if (!st) return '⏳ Un attimo…'; const T = lt(G), s = mySide(G), P = st.p[s];
      if (st.ph === 'build') return '';
      if (st.ph === 'reveal') { const k = T - st.t0; return k < 1.6 ? '🎭 Si alza la tenda…' : k < REVEAL - 0.8 ? '' : '🔥 3… 2… 1…'; }
      if (st.ph === 'fight') { const ft = T - st.t0; if (ft < 1.2) return '🤖 VIA!'; if (tutOn(G)) return ''; const so = ft - (FIGHT - MEAN); if (so >= 0 && so < 3) return '☠️ L\'ARENA SI FA CATTIVA!'; if (so > -6 && so < -3) return '⚠️ Tra poco l\'arena si fa cattiva…'; if (P.d) return ''; if (stunned(G, s, T)) return '⚡ Motori spenti!'; if (flipping(G, s, T) && !P.d) return '🔄 La barra ti raddrizza!'; return ''; }
      if (st.ph === 'ko') { const w = st.win === s; return (w ? '🏆 ' : '💥 ') + (G.chars[1 - st.win] ? (1 - st.win === s ? 'Il tuo robot ' : G.chars[1 - st.win].name + ' ') : '') + (WHY[st.why] || ''); }
      if (st.ph === 'mres') return st.msg + (st.fin ? '' : '\nProssima arena: ' + (() => { const a = ARENE[st.order[st.n % 3]]; return a.i + ' ' + a.n; })() + ' tra ' + Math.max(1, Math.ceil(MRES - (T - st.t0))) + '…');
      return '';
    },
    view(G) {
      const V = G.vw || (G.vw = { z: 0.8, x: 0, y: 0 }), st = G.st; let tx = 0, ty = 0, tz = 0.8, k = 0.08;
      if (!st || st.ph === 'build') { tx = 4.4; ty = 4.4; tz = 0.98; }
      else if (st.ph === 'reveal') { tx = MX - cq.x; ty = MY - cq.y; tz = 0.62; k = 0.05; }
      else { const Q = rob(G, 1 - mySide(G)), d = Math.hypot(Q.x - cq.x, Q.y - cq.y); tx = (Q.x - cq.x) * 0.42; ty = (Q.y - cq.y) * 0.42; tz = Math.max(0.6, Math.min(0.86, 0.95 - d * 0.035)); if (st.ph === 'ko' || st.ph === 'mres') { const P = rob(G, st.win >= 0 ? 1 - st.win : 0); tx = (P.x - cq.x); ty = (P.y - cq.y); tz = 0.86; k = 0.05; } }
      V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k; return V;
    },
    tick(G, dt) {
      const st = G.st;
      for (const c of G.chars) if (c.bot && !c.remote) {
        if (st.ph === 'build') { const i = sideOf(G, c); c.R.x = c.x = START[i][0]; c.R.y = c.y = START[i][1]; c.R.a = START[i][2]; if (!st.p[i].rd && G.time > G.botBuildAt) botBuild(G, c); }
        else if (st.ph === 'fight' || st.ph === 'ko') botTick(G, c, dt);
      }
      // la direzione del robot dell'amico arriva nel suo "verso" (cq.face del suo telefono)
      const N = cq.net; if (N && N.pos) for (const c of G.chars) if (c.remote) { const p = N.pos[c.sid]; if (p && p.f >= 10) { const a = (p.f - 10) / 100; c.ha = c.ha == null ? a : angN(c.ha + angD(a, c.ha) * Math.min(1, dt * 14)); } }
      if (st.ph === 'build') { const left = st.bt - (G.time - st.t0); if ([0, 1].every(s => st.p[s].rd) || left < -0.5) startReveal(G); return; }
      if (st.ph === 'reveal') { if (G.time - st.t0 > REVEAL) startFight(G); return; }
      if (st.ph === 'fight') {
        arenaTick(G, dt); if (st.ph === 'fight') ballTick(G);
        if (st.ph === 'fight' && G.time - st.t0 > FIGHT && !tutOn(G)) { const k0 = st.p[0].tel, k1 = st.p[1].tel; roundEnd(G, k0 > k1 + 0.5 ? 0 : k1 > k0 + 0.5 ? 1 : -1, '⏱ Tempo scaduto: vince chi ha più telaio (' + Math.ceil(k0) + ' – ' + Math.ceil(k1) + ')'); }
        return;
      }
      if (st.ph === 'ko') { ballTick(G); if (G.time - st.t0 > KO) { const w = st.win, v = G.chars[1 - w]; roundEnd(G, w >= 0 ? w : -1, v ? v.name + ' ' + (WHY[st.why] || '') : ''); } return; }
      if (st.ph === 'mres') { if (G.time - st.t0 > MRES) { if (st.fin) finalEnd(G); else newRound(G, st.n + 1, st.sc); } }
    },
    local(G, dt) {
      if (!G.st) return;
      stage(G); myDrive(G, dt); fxEvents(G);
      // la direzione dell'altro robot (sull'amico arriva dall'host): si liscia
      for (const c of G.chars) if (c !== G.me && c.hat != null && G.guest) c.ha = c.ha == null ? c.hat : angN(c.ha + angD(c.hat, c.ha) * Math.min(1, dt * 14));
      for (const c of G.chars) if (c !== G.me) { const lx = c.__lx, ly = c.__ly; if (lx != null) c.wa = (c.wa || 0) + Math.hypot(c.x - lx, c.y - ly) * 9; c.__lx = c.x; c.__ly = c.y; }
      if (G.st.ph === 'build') uiTickBuild(G); if (G.st.ph === 'fight') uiTickFight(G);
      if (G.st.ph === 'fight') feelTick(G);
      if (U.fossaK !== G.st.fr) { if (U.fossaK != null && G.st.fr) bgFossa(); U.fossaK = G.st.fr; }
    },
    ev(G, c, o) {
      const st = G.st; if (!st) return; const s = sideOf(G, c);
      if (o.k === 'bd' && st.ph === 'build') { const bd = { m: String(o.m), s: Array.isArray(o.s) ? o.s.slice(0, 5).map(String) : [] }; setBuild(G, s, bd); }
      else if (o.k === 'rdy' && st.ph === 'build') st.p[s].rd = o.on ? 1 : 0;
      else if (o.k === 'f' && st.ph === 'fight') { const i = Math.round(+o.i); if (i >= 0 && i < 5) fire(G, s, i, { x: +o.x, y: +o.y, a: +o.a }); }
    },
    snap: G => ({ st: G.st }),
    apply(G, x) { if (x.st) G.st = x.st; },
    draw(c) {
      const G = cq.g; if (!G || !G.st) return null;
      if (!c.__dr) { c.__dr = (g, X, Y, TW) => { const G2 = cq.g; if (!G2 || !G2.st) return; const s = sideOf(G2, c), R = rob(G2, s); fig(g, X, Y, TW, figOf(G2, s, R, now())); }; c.__dr.box = [1.0, 1.8, 0.6]; c.__dr.top = 1.05; }
      return c.__dr;
    },
    deco(g, c, X, Y, TW, G) {
      const st = G.st; if (!st || st.ph === 'build' || st.ph === 'reveal') return; const T = lt(G);
      if (st.say && st.say.id === c.id && T - st.say.t < 3.8 && T >= st.say.t) {
        const t = st.say.x, top = Y - TW * 1.2 - 30; g.save(); g.font = '600 12.5px system-ui'; const w = Math.min(240, g.measureText(t).width + 18), bx = X - w / 2, by = top - 14;
        g.fillStyle = 'rgba(255,250,240,.96)'; cqRR(g, bx, by, w, 24, 10); g.fill(); g.beginPath(); g.moveTo(X - 6, by + 24); g.lineTo(X + 2, by + 32); g.lineTo(X + 6, by + 24); g.fill();
        g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, X, by + 12.5, w - 10); g.restore();
      }
    },
    over(g, G, sx, sy, TW) {
      const t = now(), Uz = TW * 0.575, st = G.st; if (!st) return; const T = lt(G), s = mySide(G), ft = fT(G, T), mean = meanOn(G, T);
      const P3 = (x, y, z) => [sx(x, y), sy(x, y) - z * Uz];
      // avvisi delle trappole (a terra, leggeri)
      if (st.ph === 'fight' || st.ph === 'ko') {
        if (st.ar === 'seg') BLADES.forEach((b, i) => { const B = bladeT(i, ft, mean); if (!B.warn) return; const [bx, by, o] = b, hx = o ? 0.25 : 1.0, hy = o ? 1.0 : 0.25; g.save(); g.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(t * 10)); g.strokeStyle = '#ff5a3a'; g.lineWidth = 3; g.beginPath(); for (const [x, y] of [[bx - hx, by - hy], [bx + hx, by - hy], [bx + hx, by + hy], [bx - hx, by + hy]]) g.lineTo(sx(x, y), sy(x, y)); g.closePath(); g.stroke(); g.restore(); });
        if (st.ar === 'cal') { const hs = hamState(G, T); if (hs.t > hs.per - 1.8) { const [hx, hy] = HAMS[hs.i], k = (hs.t - (hs.per - 1.8)) / 1.8; g.save(); g.fillStyle = 'rgba(10,8,8,' + (0.25 + 0.35 * k) + ')'; g.beginPath(); g.ellipse(sx(hx, hy), sy(hx, hy), TW * 0.7 * (0.6 + 0.4 * k), TW * 0.32 * (0.6 + 0.4 * k), 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,90,60,' + (0.5 + 0.4 * Math.sin(t * 12)) + ')'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(sx(hx, hy), sy(hx, hy), TW * 0.75, TW * 0.35, 0, 0, 7); g.stroke(); g.restore(); }
          VENTS.forEach((v, i) => { const V = ventT(i, ft, mean); if (V.warn) { g.save(); g.fillStyle = 'rgba(80,70,70,.4)'; for (let k = 0; k < 4; k++) { const ph = (t * 1.5 + k / 4) % 1, [X, Y] = P3(v[0] + Math.cos(v[2]) * ph * 0.8, v[1] + Math.sin(v[2]) * ph * 0.8, 0.2 + ph); g.beginPath(); g.arc(X, Y, TW * (0.1 + ph * 0.15), 0, 7); g.fill(); } g.restore(); }
            if (V.on) flameCone(g, sx, sy, Uz, TW, v[0], v[1], v[2], VLEN, VANG, t, 1); }); }
        if (st.ar === 'cen') { const sp = Math.sin(t * 23) > 0.7; if (sp) { g.save(); g.strokeStyle = 'rgba(170,230,255,.8)'; g.lineWidth = 1.5; g.beginPath(); const e = Math.floor(t * 7) % 4, u = (t * 3.7) % 1, P = e === 0 ? [AX0 + u * (AX1 - AX0), AY0] : e === 1 ? [AX1, AY0 + u * (AY1 - AY0)] : e === 2 ? [AX0 + u * (AX1 - AX0), AY1] : [AX0, AY0 + u * (AY1 - AY0)], [X, Y] = P3(P[0], P[1], 0.55); g.moveTo(X, Y); g.lineTo(X + 6, Y - 8); g.lineTo(X - 3, Y - 14); g.stroke(); g.restore(); }
          if (mean) { const k = ((ft - (FIGHT - MEAN)) % pulsePer + pulsePer) % pulsePer; if (k > pulsePer - 1.2 || k < 0.35) { g.save(); g.globalAlpha = k < 0.35 ? 0.85 : 0.3 + 0.3 * Math.sin(t * 14); g.strokeStyle = '#9adcff'; g.lineWidth = k < 0.35 ? 4 : 2; for (const [px, py, r] of PUDS) { g.beginPath(); g.ellipse(sx(px, py), sy(px, py), r * TW * 0.707, r * TW * 0.3535, 0, 0, 7); g.stroke(); } g.restore(); } } }
      }
      // LE ZONE DELLE MIE ARMI a terra (dove arrivano adesso): accese quando l'altro c'e' dentro
      if (st.ph === 'fight' && U.R && !st.p[s].d) {
        const P = st.p[s], R = U.R, Q = rob(G, 1 - s);
        for (let i = 0; i < 5; i++) { const p = P.bd.s[i], q = PZ[p]; if (!q || q.k !== 'w' || !(P.hp[i] > 0) || !(P.u[i] > 0)) continue;
          const ready = P.cd[i] <= T, hot = ready && U.hot[i], col = TY[q.t].c, a0 = i === 4 ? Math.atan2(Q.y - R.y, Q.x - R.x) : R.a + SLA[i];
          g.save(); g.globalAlpha = hot ? 0.5 + 0.2 * Math.sin(t * 12) : ready ? 0.22 : 0.09; g.fillStyle = col; g.strokeStyle = col; g.lineWidth = hot ? 3 : 1.5;
          const fan = (r0, r1, ha) => { g.beginPath(); for (let k = 0; k <= 10; k++) { const a = a0 - ha + 2 * ha * k / 10; g.lineTo(sx(R.x + Math.cos(a) * r1, R.y + Math.sin(a) * r1), sy(R.x + Math.cos(a) * r1, R.y + Math.sin(a) * r1)); } for (let k = 10; k >= 0; k--) { const a = a0 - ha + 2 * ha * k / 10; g.lineTo(sx(R.x + Math.cos(a) * r0, R.y + Math.sin(a) * r0), sy(R.x + Math.cos(a) * r0, R.y + Math.sin(a) * r0)); } g.closePath(); g.fill(); g.globalAlpha = Math.min(1, g.globalAlpha * 2); g.stroke(); };
          if (p === 'pala') fan(0.4, 2 * RR + 0.42, 0.85); else if (p === 'sega') fan(0.4, 2 * RR + 0.4, 0.75); else if (p === 'fiamma') fan(0.45, 2.5, 0.5);
          else if (p === 'cannone') { const L = 9, c = Math.cos(a0), sn = Math.sin(a0), w = RR + 0.12; g.beginPath(); for (const [u, v] of [[0.5, -w], [L, -w], [L, w], [0.5, w]]) g.lineTo(sx(R.x + c * u - sn * v, R.y + sn * u + c * v), sy(R.x + c * u - sn * v, R.y + sn * u + c * v)); g.closePath(); g.globalAlpha *= 0.6; g.fill(); }
          else if (p === 'scossa') { g.beginPath(); g.ellipse(sx(R.x, R.y), sy(R.x, R.y), 1.8 * TW * 0.707, 1.8 * TW * 0.3535, 0, 0, 7); g.stroke(); g.globalAlpha *= 0.5; g.fill(); }
          g.restore(); }
      }
      // palle del cannone
      for (const B of st.B || []) { const [, , x0, y0, dx, dy, t0] = B, u = Math.max(0, (T - t0) * 9), x = x0 + dx * u, y = y0 + dy * u, [X, Y] = P3(x, y, 0.3); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * 0.1, TW * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#1a1c22'; g.beginPath(); g.arc(X, Y, Math.max(3, TW * 0.09), 0, 7); g.fill(); g.fillStyle = '#ffd24a'; for (let k = 1; k < 4; k++) { const [Xs, Ys] = P3(x - dx * k * 0.18, y - dy * k * 0.18, 0.3); g.globalAlpha = 0.5 - k * 0.12; g.beginPath(); g.arc(Xs, Ys, TW * 0.05, 0, 7); g.fill(); } g.globalAlpha = 1; }
      // la sega che gira sull'altro: scintille
      for (let k = 0; k < 2; k++) { const P = st.p[k]; if (!(P.act && P.act[1] > T)) continue; const R = rob(G, k), a = R.a + SLA[P.act[0]], x = R.x + Math.cos(a) * 0.8, y = R.y + Math.sin(a) * 0.8, [X, Y] = P3(x, y, 0.25); g.strokeStyle = '#ffe8a0'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 6; i++) { const an = t * 20 + i * 1.1; g.moveTo(X, Y); g.lineTo(X + Math.cos(an) * TW * 0.25, Y + Math.sin(an) * TW * 0.12 - TW * 0.08); } g.stroke(); }
      // effetti
      for (const f of U.fx) {
        const a = t - f.t; if (a < 0) continue;
        if (f.k === 'flame' && a < 0.7) flameCone(g, sx, sy, Uz, TW, f.x, f.y, f.a, 2.5 * Math.min(1, a / 0.15), 0.5, t, 1 - a / 0.7);
        else if (f.k === 'arc' && a < 0.35) { g.save(); g.globalAlpha = 1 - a / 0.35; g.strokeStyle = f.c; g.lineWidth = 4; g.beginPath(); for (let k = 0; k <= 8; k++) { const an = f.a - 0.85 + 1.7 * k / 8, r = 0.9 + a * 1.5; g.lineTo(...P3(f.x + Math.cos(an) * r * 0.5, f.y + Math.sin(an) * r * 0.5, 0.3 + a)); } g.stroke(); g.restore(); }
        else if (f.k === 'ring' && a < 0.6) { g.save(); const r = (f.big ? 4.6 : 1.8) * Math.min(1, a / 0.25); g.globalAlpha = 1 - a / 0.6; g.strokeStyle = '#bff4ff'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 36; k++) { const an = k / 36 * 6.2832, rr = r * (1 + 0.06 * Math.sin(k * 3 + t * 30)); g.lineTo(sx(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr), sy(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr) - 0.3 * Uz); } g.stroke(); g.restore(); }
        else if (f.k === 'smoke' && a < 1.2) { for (let i = 0; i < 5; i++) { const an = i * 1.26, d = a * 0.8; g.fillStyle = 'rgba(90,90,96,' + (0.5 * (1 - a / 1.2)) + ')'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * d * 0.4, f.y + Math.sin(an) * d * 0.4), sy(f.x, f.y) - (0.3 + a * 0.8) * Uz, TW * (0.08 + a * 0.15), 0, 7); g.fill(); } }
        else if ((f.k === 'boom' || f.k === 'dust') && a < 1.0) { for (let i = 0; i < (f.sm ? 6 : 12); i++) { const an = i * 0.53, d = a * (f.sm ? 1 : 2); g.fillStyle = f.k === 'dust' ? 'rgba(150,140,130,' + (0.6 * (1 - a)) + ')' : (i % 2 ? 'rgba(255,170,60,' : 'rgba(255,230,120,') + (0.8 * (1 - a)) + ')'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * d * 0.5, f.y + Math.sin(an) * d * 0.5), sy(f.x, f.y) - (0.3 + a * 0.6) * Uz, TW * (0.1 + a * 0.2) * (f.sm ? 0.6 : 1), 0, 7); g.fill(); } }
        else if (f.k === 'spark' && a < 0.45) { g.save(); g.strokeStyle = f.c; g.lineWidth = 2; g.globalAlpha = 1 - a / 0.45; g.beginPath(); for (let i = 0; i < (f.big ? 10 : 6); i++) { const an = i * 1.05 + f.t, d = 0.2 + a * 1.6, [X, Y] = P3(f.x, f.y, 0.35); g.moveTo(X + Math.cos(an) * d * TW * 0.2, Y + Math.sin(an) * d * TW * 0.1); g.lineTo(X + Math.cos(an) * d * TW * 0.45, Y + Math.sin(an) * d * TW * 0.22 - a * 10); } g.stroke(); g.restore(); }
        else if (f.k === 'num' && a < 1.1) { g.save(); g.globalAlpha = Math.min(1, (1.1 - a) * 3); g.font = '900 ' + Math.round(Math.max(13, TW * 0.3)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,14,.85)'; const [X, Y] = P3(f.x, f.y, 1.3 + a * 0.8); g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
        else if (f.k === 'txt' && a < 1.8) { g.save(); g.globalAlpha = Math.min(1, (1.8 - a) * 2); g.font = '900 ' + Math.round(Math.max(13, TW * 0.26)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,14,.85)'; const [X, Y] = P3(f.x, f.y, 2.0 + a * 0.5); g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
        else if (f.k === 'combo' && a < 2.2) { g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const k = Math.min(1, a / 0.2), sc = 1 + 0.3 * (1 - k); g.globalAlpha = Math.min(1, (2.2 - a) * 2); g.translate(cq.w / 2, cq.h * 0.36); g.scale(sc, sc); g.font = '900 22px system-ui'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#1a1020'; g.strokeText(f.s, 0, 0, cq.w * 0.92); g.fillStyle = f.me ? '#ffd24a' : '#ff9a7a'; g.fillText(f.s, 0, 0, cq.w * 0.92); g.restore(); }
        else if (f.k === 'pulse' && a < 0.4) { /* (le pozzanghere si accendono sopra) */ }
      }
      // pezzi che volano via
      for (const d of U.deb) { const a = t - d.t, k = Math.min(1, a / 0.9), x = d.x + d.dx * k, y = d.y + d.dy * k, z = Math.max(0, 0.5 + a * 4 - a * a * 5.5); if (!PZ[d.p]) continue; const el = imgOf(icon(d.p, 48));
        if (el.complete) { const [X, Y] = P3(x, y, z), sz = TW * 0.75; g.save(); g.globalAlpha = Math.min(1, (3.5 - a)); g.translate(X, Y); g.rotate(a < 0.9 ? a * 8 : 7.2); g.drawImage(el, -sz / 2, -sz / 2, sz, sz); g.restore(); } }
      // rallentatore e scossa dello schermo
      if (U.slow && t - U.slow < 2.0) { const k = Math.min(1, (t - U.slow) * 3) * Math.min(1, (2.0 - (t - U.slow)) * 2), W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7); gr.addColorStop(0, 'rgba(10,10,20,0)'); gr.addColorStop(1, 'rgba(10,10,20,' + 0.6 * k + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
      if (U.hitT && t - U.hitT < 0.35) { const k = 1 - (t - U.hitT) / 0.35; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.strokeStyle = 'rgba(255,60,40,' + 0.5 * k + ')'; g.lineWidth = 14; g.strokeRect(0, 0, cq.w, cq.h); g.restore(); }
      if (mean && st.ph === 'fight') { g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.strokeStyle = 'rgba(255,40,30,' + (0.18 + 0.12 * Math.sin(t * 4)) + ')'; g.lineWidth = 8; g.strokeRect(0, 0, cq.w, cq.h); g.restore(); }
    }
  };
  // ---- figure delle trappole (si muovono: disegnate come comparse) ----
  function bladeFig(g, X, Y, TW, o, k, warn, t) {
    const Uz = TW * 0.575, S = (u, v, z) => [X + (u - v) * TW / 2, Y + (u + v) * TW / 4 - z * Uz], h = 0.55 * k;
    if (warn && k <= 0) { g.fillStyle = '#ff7a3a'; for (let i = 0; i < 3; i++) { const u = o ? 0 : (i - 1) * 0.6, v = o ? (i - 1) * 0.6 : 0, [Xs, Ys] = S(u, v, 0.05 + Math.abs(Math.sin(t * 20 + i)) * 0.2); g.fillRect(Xs - 1.5, Ys - 1.5, 3, 3); } return; }
    for (let j = 0; j < 2; j++) { const off = (j - 0.5) * 0.9, cu = o ? 0 : off, cv = o ? off : 0, R = 0.42, N = 18, spin = t * 25 + j; g.beginPath();
      for (let i = 0; i <= N; i++) { const a = Math.PI * i / N, r = i % 2 ? R : R + 0.07, w = Math.cos(a + spin * 0) * r, z = Math.sin(a) * r * 1.2 * k - (1 - k) * 0.6; const [Xp, Yp] = o ? S(cu, cv + w, Math.max(0, z)) : S(cu + w, cv, Math.max(0, z)); i ? g.lineTo(Xp, Yp) : g.moveTo(Xp, Yp); }
      g.closePath(); g.fillStyle = '#d8e0e8'; g.fill(); g.strokeStyle = '#6a727c'; g.lineWidth = 1; g.stroke();
      if (k > 0.5) { g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); const [Xc, Yc] = S(cu, cv, h * 0.5); for (let i = 0; i < 3; i++) { const a = spin + i * 2.1; g.moveTo(Xc, Yc); g.lineTo(Xc + Math.cos(a) * TW * 0.12, Yc + Math.sin(a) * TW * 0.06 - TW * 0.05); } g.stroke(); } }
  }
  function trafoFig(g, X, Y, TW, t, mean) {
    const Uz = TW * 0.575, rx = TW * 0.5, ry = TW * 0.25;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(X, Y, rx * 1.1, ry * 1.1, 0, 0, 7); g.fill();
    g.fillStyle = '#4a505a'; g.fillRect(X - rx * 0.9, Y - Uz * 1.6, rx * 1.8, Uz * 1.6); g.beginPath(); g.ellipse(X, Y, rx * 0.9, ry * 0.9, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#5a606a'; g.beginPath(); g.ellipse(X, Y - Uz * 1.6, rx * 0.9, ry * 0.9, 0, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#3a3e48' : '#6a707a'; g.fillRect(X - rx * 0.9, Y - Uz * (0.3 + i * 0.35), rx * 1.8, Uz * 0.08); }
    g.fillStyle = '#e8b830'; g.beginPath(); g.moveTo(X, Y - Uz * 1.2); g.lineTo(X - TW * 0.12, Y - Uz * 0.7); g.lineTo(X + TW * 0.12, Y - Uz * 0.7); g.closePath(); g.fill(); g.fillStyle = '#1c1c20'; g.font = '900 ' + Math.round(TW * 0.12) + 'px system-ui'; g.textAlign = 'center'; g.fillText('⚡', X, Y - Uz * 0.78);
    for (const s of [-1, 1]) { const Xi = X + s * rx * 0.5, Yi = Y - Uz * 1.65; g.fillStyle = '#c8b8a0'; g.fillRect(Xi - 3, Yi - Uz * 0.4, 6, Uz * 0.4); g.fillStyle = '#e8e0d0'; g.beginPath(); g.arc(Xi, Yi - Uz * 0.45, 4, 0, 7); g.fill(); }
    if (Math.sin(t * (mean ? 31 : 17)) > 0.3) { g.strokeStyle = '#bff4ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X - rx * 0.5, Y - Uz * 2.1); for (let i = 1; i <= 5; i++) g.lineTo(X - rx * 0.5 + i * rx * 0.2, Y - Uz * 2.1 - Math.sin(t * 40 + i) * TW * 0.12 - TW * 0.08); g.stroke(); }
  }
  function oilFire(g, X, Y, TW, r, t, left) {
    const k = Math.min(1, left / 0.6), n = Math.round(r * 9);
    for (let i = 0; i < n; i++) { const a = i * 2.4, d = r * (0.2 + 0.7 * ((i * 0.37) % 1)), fx = X + (Math.cos(a) - Math.sin(a)) * d * TW / 2, fy = Y + (Math.cos(a) + Math.sin(a)) * d * TW / 4, ph = (t * 2 + i * 0.13) % 1, h = TW * (0.35 + 0.35 * Math.sin(t * 9 + i)) * k * (1 - ph * 0.4);
      g.fillStyle = ph < 0.4 ? '#ffe070' : ph < 0.7 ? '#ff9a2a' : '#e84a1a'; g.beginPath(); g.moveTo(fx, fy - h); g.quadraticCurveTo(fx + TW * 0.12, fy - h * 0.3, fx, fy); g.quadraticCurveTo(fx - TW * 0.12, fy - h * 0.3, fx, fy - h); g.fill(); }
  }
  function hammerFig(g, X, Y, TW, z) {
    const Uz = TW * 0.575, top = Y - (z + 1.1) * Uz, w = TW * 0.62;
    g.fillStyle = '#5a5e68'; g.fillRect(X - TW * 0.07, top - Uz * 6, TW * 0.14, Uz * 6);
    g.fillStyle = '#3a3e48'; g.fillRect(X - w, top, w * 2, Uz * 1.0); g.fillStyle = '#6a707a'; g.beginPath(); g.ellipse(X, top, w, w * 0.45, 0, 0, 7); g.fill(); g.fillStyle = '#2a2e36'; g.beginPath(); g.ellipse(X, top + Uz * 1.0, w, w * 0.45, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#e8b830'; g.fillRect(X - w, top + Uz * 0.35, w * 2, Uz * 0.18);
  }
  function flameCone(g, sx, sy, Uz, TW, x, y, a, L, ha, t, k) {
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, k));
    for (let i = 0; i < 16; i++) { const ph = (t * 3 + i / 16) % 1, d = 0.3 + ph * L, an = a + (Math.sin(i * 7.3 + t * 5) * 0.8) * ha, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d, r = TW * (0.08 + ph * 0.3);
      g.fillStyle = ph < 0.3 ? '#fff0a0' : ph < 0.6 ? '#ffa030' : 'rgba(220,60,20,.8)'; g.beginPath(); g.arc(sx(px, py), sy(px, py) - (0.3 + ph * 0.4) * Uz, r, 0, 7); g.fill(); }
    g.restore();
  }
  // SENSAZIONI: cuore quando il telaio e' agli sgoccioli, il pezzo che sta per rompersi
  function feelTick(G) {
    const st = G.st, s = mySide(G), P = st.p[s], t = now();
    if (!P.d && P.tel < TEL * 0.25 && t - (U.heartT || 0) > 1.0) { U.heartT = t; SFX.heart(); }
  }
  // esce dalla partita: via i pannelli e i pulsanti, il verso del personaggio torna normale
  cqEachFrame(() => { const G = cq.g; if (!G || G.mode !== 'robot' || G.phase !== 'play') { if (document.getElementById('rbBuild') || document.getElementById('rbW') || document.getElementById('rbShow')) { buildUI(G || {}, false); showUI(G || {}, false); fightUI(G || {}, false); U.ph = ''; } if (cq.face !== 1 && cq.face !== -1) cq.face = 1; } });
  window.__robot = { U, PZ, MOV, ARENE, COMBO, TPL, START, BLADES, PUDS, OILS, HAMS, FOSSA, valid, stats, weight, spdOf, pushOf, setBuild, startReveal, startFight, fire, damage, knock, zoneHit, sideHit, phys, rob, botBuild, botTick, newRound, mySide, lt, myFire, sendBd, myReady, mountPiece, arenaTick, ballTick, bladeT, hamState, ventT, inOil, inPud, danger, nbMem, nbRead, icon, fig, figOf, TUT, tutEnd };
})();
