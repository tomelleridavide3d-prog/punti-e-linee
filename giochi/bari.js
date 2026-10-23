// Duello all'alba dei bari (gioco 1 contro 1, vedi CLAUDE.md "DUELLO ALL'ALBA DEI BARI").
// Una strada del Far West all'alba. Prima di ogni manche si carica IN SEGRETO il tamburo: 3 colpi veri e 3 a salve, nell'ordine scelto.
// Schiena contro schiena, tre passi, "GIRATI!"; poi si corre liberi tra i ripari ma si spara SOLO AL RINTOCCO della campana
// (finestra WIN dopo ogni DONG; vince il dito piu' veloce). Colpo vero preso = manche persa; salve presa = cappello che vola e fermo
// fino al rintocco dopo. Colpo vero su un riparo lo crepa (2 = rotto), salve no: e' un indizio. Chi corre al rintocco puo' essere mancato.
// FINTA: alzi la pistola senza sparare; se l'altro spara DOPO la tua finta nello stesso rintocco, e' spaventato e manca.
// RICARICA: una volta per manche, rifai l'ordine del tamburo ma resti fermo e scoperto per 2 rintocchi. Al meglio di 5 (prima a 3).
// Da solo: "Lo Sceriffo", che impara come carichi il tamburo (i tamburi si svelano a fine manche) e te lo dice.
(() => {
  const N = 26, NH = 16, MX = 13, MY = 8;   // strada: x 1-24, y 5-10; marciapiedi di legno y 4 e 11; simmetria (x, y) <-> (25 - x, 15 - y)
  // SECONDO GIRO (23-10-2026, scelte dell'utente): campana che suona A CASO (BMIN-BMAX s) con FALSI ALLARMI in mezzo (nitrito, porta che sbatte,
  // corvo, latta); chi spara prima del vero DONG e' DISONORATO (il colpo va in aria, fermo e senza sparare fino alla fine del rintocco dopo).
  // MIRINO CHE OSCILLA: dopo il DONG il mirino trema sull'avversario e si stringe in AIM_T s (piu' largo se lui corre): tocchi presto = veloce
  // ma puoi mancare, aspetti = preciso ma rischi di arrivare secondo. Dopo ogni sparo resti fermo nel fumo SMOKE s. GIRA IL TAMBURO: salti
  // il colpo in canna ma resti fermo fino al prossimo rintocco. Tolte la finta e la ricarica.
  const LOAD = 15, LOAD2 = 11, WALK = 3.1, WIN = 1.6, LAT = 0.25, MAXB = 12, DEAD = 2.3, MRES = 7, WINS = 3, MAXR = 7;
  const BMIN = 1.6, BMAX = 6.5, F0 = 2.6, F1 = 4.6, AIM_T = 0.75, AIM0 = 1.35, BODY = 0.4, SMOKE = 1.1, RUN_V = 1.1, BIG = 1e9;
  const X0 = [12.6, 13.4], Y0 = 8, STEP = 1.5;
  // falsi allarmi: [x, y dove compare la scritta (null = corvo che passa in cielo), scritta]
  const ALARM = { horse: [3, 4.5, '🐴 IIIIH!'], door: [8, 4.3, '🚪 SBAM!'], crow: [null, null, '🐦 CRA! CRA!'], clang: [21, 4.4, '🥫 TANG!'] };
  const SIDE = [{ hat: '#2e2622', hat2: '#40342c', band: '#b8402a', sc: '#e05a3a' }, { hat: '#b48c5a', hat2: '#caa272', band: '#5a3a22', sc: '#e8c060' }];
  const now = () => performance.now() / 1000;
  const r2 = v => Math.round(v * 100) / 100;
  const U2 = { ph: '', shSeen: 0, bell: -1, fx: [], tPrev: null, tAt: 0 };

  // ======================= LA STRADA =======================
  // edifici in fondo con la facciata "finta" del Far West (x0..x1 caselle comprese)
  const BLD = [
    { x0: 1, x1: 4, h: 2.5, c: '#8e3a2a', n: 'STALLA', k: 'barn' },
    { x0: 5, x1: 10, h: 3.4, c: '#a8703e', n: 'SALOON', k: 'saloon' },
    { x0: 11, x1: 14, h: 3.0, c: '#b0a48a', n: 'BANCA', k: 'bank' },
    { x0: 15, x1: 18, h: 2.7, c: '#7e5a38', n: 'SCERIFFO', k: 'sheriff' },
    { x0: 19, x1: 24, h: 3.1, c: '#4f7488', n: 'EMPORIO', k: 'store' }];
  // oggetti fissi sui marciapiedi (riparano anche loro, ma non si rompono)
  const FIXED = [['horse', 3, 4], ['part', 2, 4], ['bench', 7, 4], ['barrel2', 10, 4], ['chair', 16, 4], ['crates', 20, 4], ['sacks', 23, 4],
    ['lamp', 3, 11], ['cactusp', 7, 11], ['trough', 13, 11], ['part', 12, 11], ['wheel', 17, 11], ['lamp', 22, 11]];
  const COVER_T = { barrel2: 1, crates: 1, sacks: 1, trough: 1, horse: 1, part: 1, bench: 1, cactusp: 1, wheel: 1 };
  const CT = ['barile', 'cassa', 'fieno'];   // ripari che cambiano a ogni manche (2 colpi veri = rotti)

  function mapBari() {
    const rooms = [
      { n: 'Strada', x: 1, y: 5, w: 24, h: 6, k: 'bdirt', vk: 'bdirt', c: ['#c8935c', '#c58f58'], wc: '#7a5a3a', nl: 1 },
      { n: 'Marciapiede', x: 1, y: 4, w: 24, h: 1, k: 'bboard', vk: 'bboard', c: ['#8a5e36', '#865a33'], wc: '#7a5a3a', nl: 1 },
      { n: 'Marciapiede', x: 1, y: 11, w: 24, h: 1, k: 'bboard', vk: 'bboard', c: ['#8a5e36', '#865a33'], wc: '#7a5a3a', nl: 1 }];
    const props = FIXED.map(([t, x, y]) => [t, x, y, t === 'part' ? { part: 1 } : undefined]);
    return { w: N, h: NH, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring: [[8, 8], [17, 8]], button: { x: -10, y: -10 }, sabs: {},
      inn: { Strada: 'in strada', Marciapiede: 'sul marciapiede' }, help: '', btnTxt: '', sabTxt: '',
      pxProp: drawFixed, drawWall, floor: { bdirt: floorDirt, bboard: floorBoard }, bg: () => '#c98a5a', sky: skyDraw };
  }
  CQ_MAPS.bari = { n: 'Polvere Rossa', make: mapBari, only: 'bari' };

  const hsh = (x, y, k) => { let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 7, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  function floorDirt(K, x, y) {
    const { g, S, poly, TW } = K, P = (u, v) => S(x + u, y + v, 0);
    for (let i = 0; i < 3; i++) { const u = 0.15 + 0.7 * hsh(x, y, i), v = 0.15 + 0.7 * hsh(x, y, i + 9), r = 0.12 + 0.18 * hsh(x, y, i + 3); poly([P(u - r, v), P(u, v - r * 0.7), P(u + r, v), P(u, v + r * 0.7)], hsh(x, y, i + 5) < 0.5 ? 'rgba(120,70,30,.10)' : 'rgba(255,230,180,.10)'); }
    if (y === 6 || y === 9) { g.strokeStyle = 'rgba(90,55,25,.28)'; g.lineWidth = Math.max(1.5, TW / 22); for (const v of [0.25, 0.62]) { const a = P(0, v), b = P(1, v); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }   // solchi delle ruote dei carri
    if (hsh(x, y, 21) < 0.22) { const u = 0.2 + 0.6 * hsh(x, y, 22), v = 0.2 + 0.6 * hsh(x, y, 23); for (const [du, dv] of [[0, 0], [0.18, 0.1]]) { const [X, Y] = P(u + du, v + dv); g.fillStyle = 'rgba(90,50,20,.28)'; g.beginPath(); g.ellipse(X, Y, TW * 0.05, TW * 0.03, 0, 0, 7); g.fill(); } }   // zoccoli
    for (let i = 0; i < 5; i++) { const [X, Y] = P(0.08 + 0.84 * hsh(x, y, i + 30), 0.08 + 0.84 * hsh(x, y, i + 40)); g.fillStyle = hsh(x, y, i + 50) < 0.5 ? '#a87a4a' : '#e0b888'; g.fillRect(X - 1, Y - 0.5, 2, 1.5); }
  }
  function floorBoard(K, x, y) {
    const { g, S, TW } = K, P = (u, v) => S(x + u, y + v, 0);
    g.strokeStyle = 'rgba(40,20,8,.45)'; g.lineWidth = Math.max(1, TW / 50);
    g.beginPath(); for (const v of [0.25, 0.5, 0.75]) { const a = P(0, v), b = P(1, v); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
    const j = hsh(x, y, 1); g.beginPath(); for (let k = 0; k < 4; k++) { const u = (j + k * 0.37) % 1, a = P(u, k * 0.25), b = P(u, k * 0.25 + 0.25); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
    g.fillStyle = 'rgba(255,220,170,.08)'; for (let k = 0; k < 4; k++) { const a = P(0.05, k * 0.25 + 0.04), b = P(0.95, k * 0.25 + 0.04); g.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]) * 0.6, 1); }
  }
  // ---- FACCIATE: ogni casella di muro in fondo disegna la sua fetta (larga una casella) dell'edificio ----
  function topZ(b, u) {
    const c = (b.x0 + b.x1 + 1) / 2, half = (b.x1 - b.x0 + 1) / 2, d = Math.abs(u - c) / half;
    if (b.k === 'barn') return b.h + 1.0 * Math.max(0, 1 - d);
    if (b.k === 'saloon') return b.h + (d < 0.42 ? 0.75 * Math.sqrt(1 - Math.pow(d / 0.42, 2)) : 0) + (d < 0.7 ? 0.25 : 0);
    if (b.k === 'bank') return b.h + (d < 0.6 ? 0.3 : 0);
    if (b.k === 'store') return b.h + (d < 0.5 ? 0.4 : d < 0.75 ? 0.2 : 0);
    return b.h + (d < 0.55 ? 0.25 : 0);
  }
  function feats(b) {   // finestre, porte, insegna [u0, u1, z0, z1, tipo]
    const c = (b.x0 + b.x1 + 1) / 2, F = [];
    if (b.k === 'barn') { F.push([c - 1.0, c + 1.0, 0, 1.75, 'barnd'], [c - 0.45, c + 0.45, 2.0, 2.65, 'loft']); }
    if (b.k === 'saloon') { F.push([c - 0.55, c + 0.55, 0.15, 1.15, 'swing'], [c - 0.62, c + 0.62, 0, 1.55, 'doorf'], [b.x0 + 0.4, b.x0 + 1.5, 0.45, 1.3, 'win'], [b.x1 - 0.5, b.x1 + 0.6, 0.45, 1.3, 'win']);
      for (const u of [b.x0 + 0.6, c - 1.2, c + 1.2, b.x1 + 0.4]) F.push([u - 0.32, u + 0.32, 2.0, 2.75, 'win2']);
      F.push([b.x0, b.x1 + 1, 1.62, 1.72, 'balc']); }
    if (b.k === 'bank') { F.push([c - 0.45, c + 0.45, 0, 1.45, 'door'], [b.x0 + 0.35, b.x0 + 1.15, 0.5, 1.5, 'winb'], [b.x1 - 0.15, b.x1 + 0.65, 0.5, 1.5, 'winb']); for (const u of [b.x0 + 0.15, c - 0.75, c + 0.6, b.x1 + 0.7]) F.push([u, u + 0.15, 0, 2.6, 'col']); }
    if (b.k === 'sheriff') { F.push([c - 0.4, c + 0.4, 0, 1.4, 'door'], [b.x0 + 0.3, b.x0 + 1.2, 0.55, 1.35, 'bars'], [b.x1 - 0.2, b.x1 + 0.45, 0.6, 1.3, 'wanted'], [c + 0.55, c + 1.05, 0.7, 1.35, 'wanted']); }
    if (b.k === 'store') { F.push([c - 0.45, c + 0.45, 0, 1.45, 'door'], [b.x0 + 0.3, c - 0.7, 0.35, 1.45, 'shop'], [c + 0.7, b.x1 + 0.7, 0.35, 1.45, 'shop'], [b.x0, b.x1 + 1, 1.62, 1.95, 'stripe']); for (const u of [b.x0 + 1.0, b.x1 - 0.1]) F.push([u - 0.3, u + 0.3, 2.15, 2.8, 'win2']); }
    return F;
  }
  function drawWall(K, x, y) {
    if (y === 3 && x >= 1 && x <= 24) return facade(K, x);
    const { bx } = K;
    if (y === 12) { bx(x + 0.44, 12.04, x + 0.56, 12.16, 0, 0.62, '#6a4424'); bx(x, 12.07, x + 1, 12.13, 0.46, 0.53, '#7e5432'); bx(x, 12.07, x + 1, 12.13, 0.2, 0.26, '#7e5432'); return; }   // staccionata davanti
    if (x === 0 && y === 7) townSign(K, x, y);
    if (x === 25 && y === 9) cactus(K, x + 0.5, y + 0.5, 1.5);
    if (x === 0 && y === 10) { K.bx(x + 0.2, y + 0.3, x + 0.8, y + 0.8, 0, 0.35, '#8a7a6a'); }
    if (x === 25 && y === 5) wheelProp(K, x, y);
  }
  function facade(K, x) {
    const { g, S, poly, TW } = K, b = BLD.find(o => x >= o.x0 && x <= o.x1), Y = 4, u0 = x, u1 = x + 1;
    const top = []; for (let i = 0; i <= 8; i++) { const u = u1 - i / 8; top.push(S(u, Y, topZ(b, u))); }
    // fianco destro (profondita') e tetto dietro la facciata
    if (x === b.x1) { const hb = b.h * 0.86; poly([S(u1, Y, 0), S(u1, 3.15, 0), S(u1, 3.15, hb), S(u1, Y, hb)], cqShade(b.c, 0.5)); }
    poly([S(u0, Y, 0), S(u1, Y, 0)].concat(top), b.c);
    g.save(); g.beginPath(); g.moveTo(...S(u0, Y, 0)); g.lineTo(...S(u1, Y, 0)); for (const p of top) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
    // assi orizzontali (o pietre per la banca), con la luce dell'alba che scalda la parte alta
    const L = []; for (let z = 0.22; z < 4.6; z += b.k === 'bank' ? 0.3 : 0.2) L.push([S(u0, Y, z), S(u1, Y, z)]);
    g.strokeStyle = 'rgba(40,20,10,.28)'; g.lineWidth = Math.max(1, TW / 60); g.beginPath(); for (const [a, c] of L) { g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); } g.stroke();
    if (b.k === 'bank') { g.beginPath(); for (let z = 0; z < 4.6; z += 0.3) { const u = u0 + ((z / 0.3) % 2 ? 0.25 : 0.75); g.moveTo(...S(u, Y, z)); g.lineTo(...S(u, Y, z + 0.3)); } g.stroke(); }
    { const gr = g.createLinearGradient(0, S(u0, Y, 0)[1], 0, S(u0, Y, 4)[1]); gr.addColorStop(0, 'rgba(60,20,40,.22)'); gr.addColorStop(0.6, 'rgba(255,170,90,0)'); gr.addColorStop(1, 'rgba(255,170,90,.22)'); g.fillStyle = gr; g.fillRect(S(u0, Y, 0)[0] - 2, S(u0, Y, 4.6)[1], TW + 4, S(u1, Y, 0)[1] - S(u0, Y, 4.6)[1] + 4); }
    for (const [a0, a1, z0, z1, t] of feats(b)) {
      const a = Math.max(a0, u0), c = Math.min(a1, u1); if (a >= c) continue;
      const R = (p, q, r, s, col) => { const A = Math.max(p, u0), B = Math.min(q, u1); if (A < B) poly([S(A, Y, s), S(B, Y, s), S(B, Y, r), S(A, Y, r)], col); };
      const ln = (p, z, q, z2, col, w) => { g.strokeStyle = col; g.lineWidth = w || Math.max(1, TW / 40); g.beginPath(); g.moveTo(...S(p, Y, z)); g.lineTo(...S(q, Y, z2)); g.stroke(); };
      if (t === 'win' || t === 'win2' || t === 'winb' || t === 'shop') {
        R(a0 - 0.05, a1 + 0.05, z0 - 0.06, z1 + 0.06, '#4a2a18'); R(a0, a1, z0, z1, '#2a3040');
        R(a0, a1, z0 + (z1 - z0) * 0.55, z1, '#e8a060'); R(a0 + (a1 - a0) * 0.1, a0 + (a1 - a0) * 0.35, z0 + (z1 - z0) * 0.2, z1 - 0.05, 'rgba(255,220,160,.35)');   // il cielo dell'alba riflesso nei vetri
        ln((a0 + a1) / 2, z0, (a0 + a1) / 2, z1, '#4a2a18'); ln(a0, (z0 + z1) / 2, a1, (z0 + z1) / 2, '#4a2a18');
        if (t === 'win2') { R(a0, a0 + 0.12, z0, z1, '#a83030'); R(a1 - 0.12, a1, z0, z1, '#a83030'); }   // tendine rosse al piano di sopra
        if (t === 'shop') { g.fillStyle = '#f2e2b0'; g.font = '700 ' + Math.round(TW / 7) + 'px Georgia,serif'; }
      } else if (t === 'door') { R(a0 - 0.06, a1 + 0.06, 0, z1 + 0.08, '#3a2414'); R(a0, a1, 0, z1, '#6a4020'); ln((a0 + a1) / 2, 0, (a0 + a1) / 2, z1, '#3a2414'); R(a0 + 0.1, a1 - 0.1, z1 * 0.55, z1 - 0.12, '#e09a58'); }
      else if (t === 'doorf') { R(a0, a1, 0, z1, '#2a1a10'); }
      else if (t === 'swing') { for (const [p, q] of [[a0, (a0 + a1) / 2 - 0.02], [(a0 + a1) / 2 + 0.02, a1]]) { R(p, q, z0 + 0.15, z1, '#c88a4a'); for (let k = 1; k < 4; k++) ln(p + (q - p) * k / 4, z0 + 0.2, p + (q - p) * k / 4, z1 - 0.05, '#7a4a20'); } }
      else if (t === 'balc') { R(a0, a1, z0, z1, '#5a3418'); for (let u = Math.ceil(u0 * 4) / 4; u < u1; u += 0.25) ln(u, z1, u, z1 + 0.35, '#5a3418', Math.max(1, TW / 45)); ln(u0, z1 + 0.35, u1, z1 + 0.35, '#5a3418', Math.max(1.5, TW / 30)); }
      else if (t === 'col') { R(a0, a1, z0, z1, '#e2dccc'); R(a0 + 0.1, a1, z0, z1, '#c8c0aa'); }
      else if (t === 'bars') { R(a0, a1, z0, z1, '#1e2228'); for (let k = 1; k < 6; k++) { const u = a0 + (a1 - a0) * k / 6; if (u > u0 && u < u1) ln(u, z0, u, z1, '#8a8a90', Math.max(1.2, TW / 34)); } }
      else if (t === 'wanted') { R(a0, a1, z0, z1, '#e8d8b0'); const cx = (a0 + a1) / 2; if (cx > u0 && cx < u1) { const [X, Yp] = S(cx, Y, (z0 + z1) / 2 + 0.05); g.fillStyle = '#6a4a2a'; g.beginPath(); g.arc(X, Yp, TW * 0.06, 0, 7); g.fill(); g.fillRect(X - TW * 0.08, Yp + TW * 0.06, TW * 0.16, TW * 0.04); } }
      else if (t === 'stripe') { for (let u = Math.floor(u0 * 4) / 4; u < u1; u += 0.25) R(u, u + 0.125, z0, z1, '#c83a2a'); for (let u = Math.floor(u0 * 4) / 4 + 0.125; u < u1; u += 0.25) R(u, u + 0.125, z0, z1, '#f2e8d8'); }
      else if (t === 'barnd') { R(a0, a1, z0, z1, '#6a2418'); ln(a0, z0, (a0 + a1) / 2, z1, '#e8d8c0', Math.max(1.5, TW / 30)); ln((a0 + a1) / 2, z0, a0, z1, '#e8d8c0', Math.max(1.5, TW / 30)); ln((a0 + a1) / 2, z0, a1, z1, '#e8d8c0', Math.max(1.5, TW / 30)); ln(a1, z0, (a0 + a1) / 2, z1, '#e8d8c0', Math.max(1.5, TW / 30)); ln((a0 + a1) / 2, z0, (a0 + a1) / 2, z1, '#3a140c'); }
      else if (t === 'loft') { R(a0, a1, z0, z1, '#2a1a10'); R(a0 + 0.05, a1 - 0.05, z0, z0 + 0.3, '#e0c060'); }
    }
    g.restore();
    // cornice in cima
    g.strokeStyle = cqShade(b.c, 0.55); g.lineWidth = Math.max(2, TW / 16); g.beginPath(); top.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    // insegna (tagliata alla fetta: ogni casella disegna il suo pezzo)
    const c = (b.x0 + b.x1 + 1) / 2, sw = Math.min(1.7, (b.x1 - b.x0 + 1) / 2 - 0.2), sz0 = b.h - (b.k === 'barn' ? 0.55 : 0.5), sz1 = sz0 + 0.42;
    if (u0 < c + sw && u1 > c - sw) {
      g.save(); g.beginPath(); g.moveTo(...S(u0, Y, 0)); g.lineTo(...S(u1, Y, 0)); g.lineTo(...S(u1, Y, 6)); g.lineTo(...S(u0, Y, 6)); g.closePath(); g.clip();
      poly([S(c - sw, Y, sz0), S(c + sw, Y, sz0), S(c + sw, Y, sz1), S(c - sw, Y, sz1)], b.k === 'saloon' ? '#2a1a10' : '#f0e2c0');
      const [X, Yp] = S(c - sw, Y, sz1); g.translate(X, Yp); g.transform(1, 0.5, 0, 1, 0, 0);
      g.fillStyle = b.k === 'saloon' ? '#f2c050' : '#3a2414'; g.font = '800 ' + Math.round(TW * 0.3) + 'px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.n, sw * TW / 2, (sz1 - sz0) * TW * 0.575 / 2 + 1);
      if (b.k === 'sheriff') { g.fillStyle = '#c89a2a'; star(g, -TW * 0.02, (sz1 - sz0) * TW * 0.29, TW * 0.12, '#c89a2a'); }
      g.restore();
    }
  }
  function townSign(K, x, y) {
    const { bx, g, S, TW } = K; bx(x + 0.45, y + 0.4, x + 0.55, y + 0.5, 0, 1.1, '#6a4424');
    const p = [S(x + 0.5, y + 0.05, 1.25), S(x + 0.5, y + 0.95, 1.25), S(x + 0.5, y + 0.95, 0.8), S(x + 0.5, y + 0.05, 0.8)];
    K.poly(p, '#d8b884'); g.save(); g.translate(p[0][0], p[0][1]); g.transform(1, -0.5, 0, 1, 0, 0); g.fillStyle = '#5a2a14'; g.font = '800 ' + Math.round(TW * 0.12) + 'px Georgia,serif'; g.textAlign = 'center';
    g.fillText('POLVERE ROSSA', TW * 0.45 * 0.5 * 2 * 0.5, TW * 0.11); g.font = '600 ' + Math.round(TW * 0.09) + 'px Georgia,serif'; g.fillText('abitanti: 23', TW * 0.225, TW * 0.21); g.restore();
  }
  function cactus(K, x, y, h) {
    const { cyl } = K; cyl(x, y, 0.13, 0, h, '#3e7a3a'); cyl(x - 0.25, y + 0.05, 0.08, h * 0.35, h * 0.75, '#3e7a3a'); cyl(x + 0.22, y - 0.02, 0.08, h * 0.45, h * 0.85, '#3e7a3a');
    K.bx(x - 0.25, y, x, y + 0.1, h * 0.33, h * 0.4, '#3e7a3a'); K.bx(x, y - 0.05, x + 0.22, y + 0.05, h * 0.43, h * 0.5, '#3e7a3a');
  }
  function wheelProp(K, x, y) {
    const { g, S, TW } = K, [X, Y] = S(x + 0.5, y + 0.5, 0.42), r = TW * 0.3;
    g.strokeStyle = '#5a3418'; g.lineWidth = Math.max(2, TW / 14); g.beginPath(); g.ellipse(X, Y, r * 0.55, r, -0.5, 0, 7); g.stroke();
    g.lineWidth = Math.max(1, TW / 30); g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * r * 0.55 * Math.cos(-0.5) - Math.sin(a) * r * Math.sin(-0.5), Y + Math.cos(a) * r * 0.55 * Math.sin(-0.5) + Math.sin(a) * r * Math.cos(-0.5)); } g.stroke();
  }
  // ---- OGGETTI FISSI dei marciapiedi ----
  function drawFixed(K, t, x, y, o) {
    const { bx, cyl, g, S, TW, poly } = K;
    if (t === 'bsoft' || t === 'part') return true;
    if (t === 'horse') {   // cavallo legato alla staccionata (occupa questa casella e quella a sinistra)
      bx(x - 1 + 0.1, y + 0.1, x + 0.9, y + 0.18, 0, 0.75, '#6a4424'); bx(x - 1 + 0.15, y + 0.1, x - 1 + 0.25, y + 0.2, 0, 0.8, '#5a3418'); bx(x + 0.75, y + 0.1, x + 0.85, y + 0.2, 0, 0.8, '#5a3418');
      for (const [a, b] of [[-0.75, 0.38], [-0.75, 0.62], [0.3, 0.38], [0.3, 0.62]]) bx(x + a, y + b, x + a + 0.1, y + b + 0.1, 0, 0.72, '#4a2a16');
      bx(x - 0.82, y + 0.32, x + 0.45, y + 0.72, 0.68, 1.15, '#7a4a26'); bx(x - 0.3, y + 0.3, x + 0.05, y + 0.74, 1.15, 1.22, '#a83a2a');
      bx(x + 0.35, y + 0.4, x + 0.6, y + 0.62, 1.0, 1.55, '#7a4a26'); bx(x + 0.5, y + 0.38, x + 0.92, y + 0.64, 1.38, 1.62, '#7a4a26');
      bx(x + 0.38, y + 0.48, x + 0.5, y + 0.54, 1.3, 1.72, '#2a1a10'); bx(x + 0.84, y + 0.42, x + 0.95, y + 0.6, 1.4, 1.5, '#3a2014');
      const [ex, ey] = S(x + 0.75, y + 0.64, 1.55); g.fillStyle = '#100808'; g.fillRect(ex - 1, ey - 1, 2.5, 2.5);
      bx(x - 0.95, y + 0.47, x - 0.82, y + 0.57, 0.6, 1.1, '#2a1a10'); return true;
    }
    if (t === 'trough') { bx(x - 1 + 0.1, y + 0.25, x + 0.9, y + 0.75, 0, 0.48, '#7a5030'); poly([S(x - 0.82, y + 0.33, 0.48), S(x + 0.82, y + 0.33, 0.48), S(x + 0.82, y + 0.67, 0.48), S(x - 0.82, y + 0.67, 0.48)], '#5a8aa8'); poly([S(x - 0.5, y + 0.4, 0.481), S(x + 0.2, y + 0.4, 0.481), S(x + 0.2, y + 0.46, 0.481), S(x - 0.5, y + 0.46, 0.481)], 'rgba(255,210,150,.6)'); return true; }
    if (t === 'bench') { bx(x + 0.05, y + 0.3, x + 0.95, y + 0.7, 0.38, 0.46, '#8a5a30'); for (const a of [0.1, 0.8]) bx(x + a, y + 0.35, x + a + 0.1, y + 0.65, 0, 0.38, '#5a3418'); bx(x + 0.05, y + 0.28, x + 0.95, y + 0.34, 0.46, 0.9, '#8a5a30'); return true; }
    if (t === 'barrel2') { barrel(K, x + 0.5, y + 0.5, 2); return true; }
    if (t === 'chair') { for (const [a, b] of [[0.25, 0.25], [0.65, 0.25], [0.25, 0.65], [0.65, 0.65]]) bx(x + a, y + b, x + a + 0.08, y + b + 0.08, 0, 0.42, '#5a3418'); bx(x + 0.22, y + 0.22, x + 0.76, y + 0.76, 0.42, 0.5, '#8a5a30'); bx(x + 0.22, y + 0.22, x + 0.3, y + 0.76, 0.5, 1.0, '#8a5a30'); return true; }
    if (t === 'crates') { crate(K, x + 0.5, y + 0.5, 2, 0); bx(x + 0.25, y + 0.25, x + 0.7, y + 0.7, 0.72, 1.12, '#b08a52'); return true; }
    if (t === 'sacks') { for (const [a, b, z] of [[0.3, 0.35, 0], [0.65, 0.5, 0], [0.45, 0.45, 0.32]]) { cyl(x + a, y + b, 0.2, z, z + 0.34, '#d8c8a0'); } return true; }
    if (t === 'lamp') { cyl(x + 0.5, y + 0.5, 0.05, 0, 1.7, '#3a3030'); bx(x + 0.38, y + 0.38, x + 0.62, y + 0.62, 1.7, 2.0, '#e8b860'); bx(x + 0.35, y + 0.35, x + 0.65, y + 0.65, 2.0, 2.06, '#2a2020'); K.glow(x + 0.5, y + 0.5, 1.85, 0.9, 'rgba(255,200,120,.35)'); return true; }
    if (t === 'cactusp') { cyl(x + 0.5, y + 0.5, 0.26, 0, 0.32, '#b0603a'); cactus(K, x + 0.5, y + 0.5, 1.15); return true; }
    if (t === 'wheel') { wheelProp(K, x, y); return true; }
    return false;
  }
  // ---- RIPARI (mobili, cambiano a ogni manche): disegnati come figure del gioco in mezzo ai personaggi ----
  function barrel(K, x, y, hp) {
    const { cyl, g, S, TW } = K;
    if (hp <= 0) { for (let i = 0; i < 6; i++) { const a = i * 1.05, [X, Y] = S(x + Math.cos(a) * 0.32, y + Math.sin(a) * 0.32, 0.04); g.save(); g.translate(X, Y); g.rotate(a); g.fillStyle = i % 2 ? '#8a5a30' : '#7a4a26'; g.fillRect(-TW * 0.14, -TW * 0.03, TW * 0.28, TW * 0.06); g.restore(); } cyl(x, y, 0.2, 0, 0.05, '#5a3418'); return; }
    cyl(x, y, 0.32, 0, 0.88, '#9a6236');
    for (const z of [0.14, 0.74]) { const [X, Y] = S(x, y, z), rx = 0.33 * TW * 0.707, ry = 0.33 * TW * 0.3535; g.strokeStyle = '#3a2a22'; g.lineWidth = Math.max(1.5, TW / 26); g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, Math.PI); g.stroke(); }
    const [X, Y] = S(x, y, 0.88); g.fillStyle = '#b07848'; g.beginPath(); g.ellipse(X, Y, 0.3 * TW * 0.707, 0.3 * TW * 0.3535, 0, 0, 7); g.fill();
    if (hp === 1) crack(g, S(x - 0.1, y + 0.3, 0.55), TW);
  }
  function crate(K, x, y, hp, hay) {
    const { bx, g, S, TW } = K, col = hay ? '#d8b850' : '#b08a52';
    if (hp <= 0) { for (let i = 0; i < 5; i++) { const [X, Y] = S(x - 0.3 + i * 0.15, y + (i % 2 ? 0.2 : -0.15), 0.03); g.save(); g.translate(X, Y); g.rotate(i * 0.7); g.fillStyle = hay ? '#e0c060' : '#8a6a3a'; g.fillRect(-TW * 0.15, -TW * 0.025, TW * 0.3, TW * 0.05); g.restore(); } return; }
    bx(x - 0.36, y - 0.36, x + 0.36, y + 0.36, 0, hay ? 0.62 : 0.72, col);
    g.strokeStyle = hay ? 'rgba(140,100,30,.6)' : 'rgba(70,40,20,.6)'; g.lineWidth = Math.max(1, TW / 40); g.beginPath();
    if (hay) { for (let k = 1; k < 5; k++) { const z = k * 0.12; g.moveTo(...S(x - 0.36, y + 0.36, z)); g.lineTo(...S(x + 0.36, y + 0.36, z)); g.lineTo(...S(x + 0.36, y - 0.36, z)); } g.stroke(); g.strokeStyle = '#7a3a1a'; g.lineWidth = Math.max(1.5, TW / 28); g.beginPath(); for (const u of [-0.15, 0.15]) { g.moveTo(...S(x + u, y + 0.36, 0)); g.lineTo(...S(x + u, y + 0.36, 0.62)); g.lineTo(...S(x + u, y - 0.36, 0.62)); } g.stroke(); }
    else { g.moveTo(...S(x - 0.36, y + 0.36, 0)); g.lineTo(...S(x + 0.36, y + 0.36, 0.72)); g.moveTo(...S(x + 0.36, y + 0.36, 0)); g.lineTo(...S(x + 0.36, y - 0.36, 0.72)); g.stroke(); }
    if (hp === 1) crack(g, S(x, y + 0.36, 0.4), TW);
  }
  function crack(g, [X, Y], TW) { g.strokeStyle = '#1a0e08'; g.lineWidth = Math.max(1.2, TW / 34); g.beginPath(); g.moveTo(X, Y - TW * 0.18); g.lineTo(X + TW * 0.05, Y - TW * 0.06); g.lineTo(X - TW * 0.04, Y + TW * 0.02); g.lineTo(X + TW * 0.06, Y + TW * 0.14); g.moveTo(X + TW * 0.05, Y - TW * 0.06); g.lineTo(X + TW * 0.14, Y - TW * 0.08); g.stroke(); g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(X, Y - TW * 0.02, TW * 0.035, 0, 7); g.fill(); }
  // attrezzi iso nello spazio dello schermo, centrati in X, Y (per le figure disegnate a ogni fotogramma)
  function iso(g, X, Y, TW) {
    const U = TW * 0.575, S = (x, y, z) => [X + (x - y) * TW / 2, Y + (x + y) * TW / 4 - z * U];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const bx = (x0, y0, x1, y1, z0, z1, col) => { poly([S(x0, y1, z1), S(x1, y1, z1), S(x1, y1, z0), S(x0, y1, z0)], cqShade(col, 0.74)); poly([S(x1, y1, z1), S(x1, y0, z1), S(x1, y0, z0), S(x1, y1, z0)], cqShade(col, 0.52)); poly([S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], cqShade(col, 1.08)); };
    const cyl = (cx, cy, r, z0, z1, col) => { const [X0, Y0] = S(cx, cy, z0), [X1, Y1] = S(cx, cy, z1), rx = r * TW * 0.707, ry = r * TW * 0.3535; g.fillStyle = cqShade(col, 0.72); g.fillRect(X0 - rx, Y1, rx * 2, Y0 - Y1); g.beginPath(); g.ellipse(X0, Y0, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = cqShade(col, 1.08); g.beginPath(); g.ellipse(X1, Y1, rx, ry, 0, 0, 7); g.fill(); };
    return { g, S, poly, bx, cyl, TW, U, glow: () => {} };
  }
  // ombra lunga dell'alba (il sole e' basso a sinistra: le ombre vanno lungo la strada verso destra)
  function longShadow(g, X, Y, TW, len, w) { const vx = len * TW / 2, vy = len * TW / 4; g.fillStyle = 'rgba(80,30,60,.24)'; g.beginPath(); g.ellipse(X + vx / 2, Y + vy / 2, Math.hypot(vx, vy) / 2 + TW * 0.12, TW * w, 0.4636, 0, 7); g.fill(); }
  function coverDraw(g, X, Y, TW, cv) {
    const hp = cv[3]; if (hp > 0) longShadow(g, X, Y, TW, cv[0] === 'fieno' ? 1.2 : 1.5, 0.16);
    const K = iso(g, X, Y, TW); if (cv[0] === 'barile') barrel(K, 0, 0, hp); else crate(K, 0, 0, hp, cv[0] === 'fieno');
  }
  // la campana sul tetto della banca: oscilla a ogni rintocco
  function bellDraw(g, X, Y, TW) {
    const K = iso(g, X, Y, TW), { bx, S } = K, z = 3.25, G = cq.g, t = G ? lt(G) : 0, b0 = G && G.st && G.st.ph === 'duel' ? G.st.bt : null, sw = b0 != null && t >= b0 ? Math.exp(-(t - b0) * 2.2) * Math.sin((t - b0) * 14) * 0.5 : 0;
    for (const a of [-0.45, 0.35]) bx(a, -0.05, a + 0.1, 0.05, z, z + 1.0, '#6a4424');
    bx(-0.55, -0.12, 0.55, 0.12, z + 1.0, z + 1.12, '#5a3418'); K.poly([S(-0.65, 0, z + 1.12), S(0.65, 0, z + 1.12), S(0, 0, z + 1.5)], '#7a3020');
    const [hx, hy] = S(0, 0, z + 0.98); g.save(); g.translate(hx, hy); g.rotate(sw); const s = TW * 0.2;
    g.fillStyle = '#c8962a'; g.beginPath(); g.moveTo(-s * 0.35, 0); g.quadraticCurveTo(-s * 0.4, s * 0.9, -s * 0.85, s * 1.2); g.lineTo(s * 0.85, s * 1.2); g.quadraticCurveTo(s * 0.4, s * 0.9, s * 0.35, 0); g.closePath(); g.fill();
    g.fillStyle = '#f2d070'; g.fillRect(-s * 0.25, s * 0.15, s * 0.12, s * 0.8); g.fillStyle = '#6a4a1a'; g.beginPath(); g.arc(Math.sin(-sw) * s * 0.3, s * 1.25, s * 0.16, 0, 7); g.fill(); g.restore();
  }
  bellDraw.box = [1.2, 5.5, 0.4]; bellDraw.top = 5;
  // ---- IL PAESAGGIO: cielo dell'alba, sole basso, mesas, deserto. La parte ferma si disegna una volta (SKY); l'orizzonte segue la citta' ----
  let SKY = null;
  function skyBuild(w, h, dpr) {
    const W = w * 1.1, H = h * 2, cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    let sd = 5; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const hy = h, m = Math.min(w, h);
    let gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#1e2450'); gr.addColorStop(0.35, '#4a3a72'); gr.addColorStop(0.6, '#b45a6a'); gr.addColorStop(0.82, '#f08a5a'); gr.addColorStop(1, '#ffc27a');
    g.fillStyle = gr; g.fillRect(0, 0, W, hy + 2);
    for (let i = 0; i < 60; i++) { const y = rnd() * hy * 0.35; g.fillStyle = `rgba(255,240,220,${0.5 * (1 - y / (hy * 0.35)) * rnd()})`; g.fillRect(rnd() * W, y, 1.4, 1.4); }   // ultime stelle
    const sx = W * 0.2, sy = hy - m * 0.02, sr = m * 0.085;
    gr = g.createRadialGradient(sx, sy, sr * 0.8, sx, sy, m * 0.75); gr.addColorStop(0, 'rgba(255,220,140,.75)'); gr.addColorStop(0.3, 'rgba(255,170,100,.3)'); gr.addColorStop(1, 'rgba(255,150,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, hy);
    g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(sx, sy, sr, Math.PI, 0); g.fill();
    // strisce di nuvole rosa illuminate da sotto
    for (let i = 0; i < 9; i++) { const y = hy * (0.25 + rnd() * 0.5), x = rnd() * W, l = W * (0.12 + rnd() * 0.25); g.fillStyle = `rgba(${200 + rnd() * 55 | 0},${110 + rnd() * 60 | 0},${120 + rnd() * 40 | 0},.55)`; g.beginPath(); g.ellipse(x, y, l / 2, h * 0.008 + rnd() * h * 0.008, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,170,.5)'; g.beginPath(); g.ellipse(x + l * 0.05, y + h * 0.004, l * 0.35, h * 0.003, 0, 0, 7); g.fill(); }
    // mesas (altipiani piatti) e sagome lontane
    const mesa = (x, wd, ht, col, lit) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - wd * 0.62, hy + 1); g.lineTo(x - wd * 0.5, hy - ht * 0.75); g.lineTo(x - wd * 0.45, hy - ht); g.lineTo(x + wd * 0.42, hy - ht); g.lineTo(x + wd * 0.5, hy - ht * 0.7); g.lineTo(x + wd * 0.64, hy + 1); g.closePath(); g.fill(); g.fillStyle = lit; g.fillRect(x - wd * 0.45, hy - ht, wd * 0.87, Math.max(1.5, ht * 0.06)); };
    for (let i = 0; i < 7; i++) mesa(rnd() * W, m * (0.18 + rnd() * 0.3), h * (0.04 + rnd() * 0.05), '#8a4a5e', 'rgba(255,190,140,.6)');
    for (let i = 0; i < 4; i++) mesa(W * (0.35 + rnd() * 0.65), m * (0.25 + rnd() * 0.3), h * (0.07 + rnd() * 0.06), '#6a3448', 'rgba(255,170,120,.55)');
    // sotto l'orizzonte: la foschia del deserto lontano (il terreno vero e' quello della mappa, vedi groundDraw)
    gr = g.createLinearGradient(0, hy - 4, 0, H); gr.addColorStop(0, '#f2b47c'); gr.addColorStop(0.15, '#dc9c66'); gr.addColorStop(1, '#c88a58'); g.fillStyle = gr; g.fillRect(0, hy - 2, W, H - hy + 2);
    return { cv, w, h, dpr, W, H, hy };
  }
  // ---- IL DESERTO INTORNO ALLA CITTA': il terreno della mappa che continua (stessa vista, stessi attrezzi): la strada esce dal paese,
  // baracche, mulino a vento, cimitero sulla collinetta, carro rotto, cactus, rocce. Disegnato dietro la mappa a ogni fotogramma (poche forme) ----
  const GX0 = -13, GX1 = 39, GY0 = -9, GY1 = 25;
  const GDECO = (() => {   // oggetti sparsi fissi (mai dentro la citta' ne' davanti alla staccionata, per non coprirla)
    let sd = 31; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }, L = [];
    const free = (x, y) => !(x > -1.5 && x < 27.5 && y > 1.5 && y < 14.5) && !(y > 4.5 && y < 11.5);
    L.push(['mill', -5, 0.5], ['shack', -7, 13.5], ['shack', 31, 2], ['tower', 30, 13.8], ['wagon', -3.5, 15.8], ['outh', 28.5, -0.5], ['shack', 33.5, 15.5]);
    for (let i = 0; i < 6; i++) L.push(['cross', 15 + i * 0.9 + (i % 2) * 0.3, 17.2 + (i % 3) * 0.7]);
    L.push(['fence', 13.5, 16.5], ['fence', 20, 16.5]);
    for (let i = 0; i < 60 && L.length < 46; i++) { const x = GX0 + 2 + rnd() * (GX1 - GX0 - 4), y = GY0 + 2 + rnd() * (GY1 - GY0 - 4); if (!free(x, y) || L.some(o => Math.hypot(o[1] - x, o[2] - y) < 2.2)) continue; L.push([rnd() < 0.45 ? 'cactus' : rnd() < 0.6 ? 'rock' : 'bush', x, y, 0.7 + rnd() * 0.7]); }
    return L.sort((a, b) => a[1] + a[2] - b[1] - b[2]);
  })();
  function groundDraw(g, tx, ty, TW) {
    const U = TW * 0.575, S = (x, y, z = 0) => [tx + (x - y) * TW / 2, ty + (x + y) * TW / 4 - z * U];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fillStyle = col; g.fill(); };
    const rect = (x0, y0, x1, y1, col) => poly([S(x0, y0), S(x1, y0), S(x1, y1), S(x0, y1)], col);
    // il terreno sfuma verso il bordo nella foschia del cielo
    for (const [m, col] of [[5, 'rgba(232,160,110,.28)'], [3, 'rgba(220,150,100,.5)'], [1.5, 'rgba(208,146,96,.8)'], [0, '#cd9160']]) rect(GX0 - m, GY0 - m, GX1 + m, GY1 + m, col);
    // chiazze di terra piu' scura e piu' chiara
    for (let i = 0; i < 40; i++) { const x = GX0 + ((i * 7.31) % (GX1 - GX0)), y = GY0 + ((i * 3.77) % (GY1 - GY0)), r = 0.8 + (i % 4) * 0.5; poly([S(x - r, y), S(x, y - r * 0.6), S(x + r, y), S(x, y + r * 0.6)], i % 2 ? 'rgba(150,80,40,.12)' : 'rgba(255,220,170,.10)'); }
    // la strada che esce dalla citta' da tutte e due le parti, coi solchi dei carri
    rect(GX0 - 1, 5.2, 1, 10.8, '#c58f58'); rect(25, 5.2, GX1 + 1, 10.8, '#c58f58');
    g.strokeStyle = 'rgba(90,55,25,.28)'; g.lineWidth = Math.max(1.5, TW / 22); g.beginPath(); for (const y of [6.25, 6.62, 9.25, 9.62]) { g.moveTo(...S(GX0, y)); g.lineTo(...S(1, y)); g.moveTo(...S(25, y)); g.lineTo(...S(GX1, y)); } g.stroke();
    // sentiero verso il cimitero
    g.strokeStyle = 'rgba(160,100,60,.45)'; g.lineWidth = Math.max(3, TW / 6); g.beginPath(); g.moveTo(...S(11, 13)); g.quadraticCurveTo(...S(13, 15.5), ...S(17, 17.4)); g.stroke();
    for (const [t, x, y, s] of GDECO) {
      const [X, Y] = S(x, y), K = iso(g, X, Y, TW), { bx, cyl } = K;
      longShadow(g, X, Y, TW, t === 'mill' ? 4 : t === 'shack' || t === 'tower' ? 3 : 1.2 * (s || 1), 0.15);
      if (t === 'cactus') { cyl(0, 0, 0.11 * s, 0, 1.2 * s, '#4a7a3a'); cyl(-0.22 * s, 0.03, 0.07 * s, 0.4 * s, 0.85 * s, '#4a7a3a'); bx(-0.22 * s, -0.03, 0, 0.05, 0.38 * s, 0.46 * s, '#4a7a3a'); cyl(0.2 * s, 0, 0.07 * s, 0.55 * s, 0.95 * s, '#4a7a3a'); bx(0, -0.03, 0.2 * s, 0.05, 0.52 * s, 0.6 * s, '#4a7a3a'); }
      else if (t === 'rock') { bx(-0.35 * s, -0.25 * s, 0.3 * s, 0.3 * s, 0, 0.3 * s, '#9a7a62'); bx(-0.1 * s, -0.1 * s, 0.2 * s, 0.15 * s, 0.3 * s, 0.45 * s, '#a8886e'); }
      else if (t === 'bush') { g.fillStyle = '#8a8a52'; for (const [a, b, r] of [[-0.12, 0, 0.18], [0.1, 0.03, 0.16], [0, -0.1, 0.14]]) { const [p, q] = K.S(a * s, b * s, 0.14 * s); g.beginPath(); g.arc(p, q, r * s * TW * 0.6, 0, 7); g.fill(); } }
      else if (t === 'cross') { bx(-0.03, -0.03, 0.03, 0.03, 0, 0.7, '#7a5a3a'); bx(-0.2, -0.03, 0.2, 0.03, 0.48, 0.55, '#7a5a3a'); K.poly([K.S(-0.25, 0.1, 0), K.S(0.25, 0.1, 0), K.S(0.25, 0.6, 0), K.S(-0.25, 0.6, 0)], 'rgba(120,70,40,.35)'); }
      else if (t === 'fence') { for (let i = 0; i < 6; i++) bx(i * 0.5, -0.04, i * 0.5 + 0.08, 0.04, 0, 0.6, '#6a4424'); bx(0, -0.03, 2.6, 0.03, 0.42, 0.48, '#7e5432'); }
      else if (t === 'shack') { bx(-0.9, -0.7, 0.9, 0.7, 0, 1.3, '#8a6a48'); K.poly([K.S(-0.95, 0.75, 1.3), K.S(0.95, 0.75, 1.3), K.S(0.95, 0, 1.8), K.S(-0.95, 0, 1.8)], '#6a4a30'); K.poly([K.S(0.95, 0.75, 1.3), K.S(0.95, -0.75, 1.3), K.S(0.95, 0, 1.8)], '#5a3a24'); K.poly([K.S(-0.2, 0.7, 0), K.S(0.25, 0.7, 0), K.S(0.25, 0.7, 0.9), K.S(-0.2, 0.7, 0.9)], '#3a2414'); }
      else if (t === 'outh') { bx(-0.35, -0.35, 0.35, 0.35, 0, 1.3, '#8a6a48'); bx(-0.42, -0.42, 0.42, 0.42, 1.3, 1.4, '#6a4a30'); const [p, q] = K.S(0, 0.35, 1.0); g.fillStyle = '#3a2414'; g.beginPath(); g.arc(p, q, TW * 0.05, 0, 7); g.fill(); }
      else if (t === 'tower') { for (const [a, b] of [[-0.5, -0.5], [0.4, -0.5], [-0.5, 0.4], [0.4, 0.4]]) bx(a, b, a + 0.1, b + 0.1, 0, 2.2, '#6a4424'); cyl(0, 0, 0.75, 2.2, 3.3, '#8a5a36'); K.poly([K.S(-0.8, 0, 3.3), K.S(0.8, 0, 3.3), K.S(0, 0, 3.8)], '#5a3a24'); }
      else if (t === 'wagon') { bx(-0.9, -0.4, 0.9, 0.4, 0.35, 0.75, '#8a6038'); g.strokeStyle = '#4a2a14'; g.lineWidth = Math.max(2, TW / 16); for (const a of [-0.6, 0.6]) { const [p, q] = K.S(a, 0.42, 0.3); g.beginPath(); g.ellipse(p, q, TW * 0.13, TW * 0.24, 0, 0, 7); g.stroke(); } K.poly([K.S(-0.8, 0.4, 0.75), K.S(0.6, 0.4, 0.75), K.S(0.4, 0.4, 1.6), K.S(-0.6, 0.4, 1.5)], '#e8dcc0'); }
      else if (t === 'mill') { for (const [a, b] of [[-0.6, -0.6], [0.5, -0.6], [-0.6, 0.5], [0.5, 0.5]]) bx(a, b, a + 0.1, b + 0.1, 0, 3.4, '#7a5a3a'); bx(-0.3, -0.3, 0.3, 0.3, 3.4, 3.8, '#6a4424');
        const [p, q] = K.S(0, 0.32, 3.6), a0 = performance.now() / 1000 * 0.8; g.strokeStyle = '#8a7a6a'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; g.moveTo(p, q); g.lineTo(p + Math.cos(a) * TW * 0.7, q + Math.sin(a) * TW * 0.7); } g.stroke(); g.fillStyle = '#5a3a24'; g.beginPath(); g.arc(p, q, TW * 0.08, 0, 7); g.fill(); }
    }
  }
  function skyDraw(g, CX, CY, tx, ty, TW) {
    const w = cq.w, h = cq.h, dpr = Math.min(2, cq.dpr);
    if (!SKY || SKY.w !== w || SKY.h !== h || SKY.dpr !== dpr) SKY = skyBuild(w, h, dpr);
    const S = SKY, t = performance.now() / 1000;
    const m0 = g.getTransform(), hz = tx == null ? h * 0.45 : Math.max(h * 0.06, Math.min(h * 0.92, (m0.d * (ty + (13 + GY0 - 2) * TW / 4) + m0.f) / cq.dpr)), ox = -w * 0.05 - Math.max(-1, Math.min(1, (CX - CY - 5) / 20)) * w * 0.04;
    g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.drawImage(S.cv, ox, hz - S.hy, S.W, S.H);
    for (let i = 0; i < 3; i++) {   // avvoltoi che girano in cielo
      const a = t * (0.25 + i * 0.07) + i * 2.1, x = w * (0.55 + 0.18 * i) + Math.cos(a) * w * 0.08, y = hz - h * (0.28 + 0.06 * i) + Math.sin(a) * h * 0.03, s = 5 + i, fl = Math.sin(t * 3 + i) * 0.4;
      g.strokeStyle = '#2a1a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - s * 1.6, y - s * (0.3 + fl)); g.quadraticCurveTo(x - s * 0.6, y - s * 0.6, x, y); g.quadraticCurveTo(x + s * 0.6, y - s * 0.6, x + s * 1.6, y - s * (0.3 + fl)); g.stroke();
    }
    g.restore();
    if (tx != null) groundDraw(g, tx, ty, TW);
  }

  // ======================= I PISTOLERI =======================
  const HEAD = { omino: [0, -39], procione: [4, -40], gatto: [4, -40], regista: [4, -43], guardia: [5, -42], tonno: [6, -44], giraffa: [10, -73], polipo: [4, -40], bruco: [8, -42], bassotto: [14, -29], palma: [3, -40], pinguino: [4, -52], pane: [1, -41], lupo: [17, -49] };
  const BELT = { giraffa: -26, bassotto: -10, pinguino: -14, lupo: -20, palma: -14 };
  function star(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function hatShape(g, x0, hy, S2, sheriff) {   // cappello da cowboy (unita' del personaggio)
    g.fillStyle = sheriff ? '#e8dcc0' : S2.hat; g.beginPath(); g.ellipse(x0, hy, 17, 4.6, 0, 0, 7); g.fill();
    g.fillStyle = sheriff ? '#d0c4a6' : S2.hat; g.beginPath(); g.ellipse(x0, hy - 1.2, 14, 3, 0, Math.PI, 0); g.fill();   // tesa rialzata ai lati
    g.fillStyle = sheriff ? '#f2e8d0' : S2.hat2; g.beginPath(); g.moveTo(x0 - 9, hy - 1); g.quadraticCurveTo(x0 - 10, hy - 11, x0 - 6, hy - 13); g.quadraticCurveTo(x0, hy - 9.5, x0 + 6, hy - 13); g.quadraticCurveTo(x0 + 10, hy - 11, x0 + 9, hy - 1); g.closePath(); g.fill();
    g.fillStyle = sheriff ? '#3a2a1a' : S2.band; g.fillRect(x0 - 9, hy - 4.6, 18, 3);
  }
  function cowboy(g, X, Y, TW, L, walk, f, s, o) {
    const u = TW / 34, bob = Math.abs(Math.sin(walk)) * 4 * u, [hx, hy] = HEAD[L.skin] || HEAD.omino, by = BELT[L.skin] || -13, S2 = SIDE[s];
    cqPlayer(g, X, Y, TW, L.skin === 'omino' ? Object.assign({}, L, { hat: 'nessuno' }) : L, walk, f, true);
    g.save(); g.translate(X, Y - bob); g.scale(u, u);
    // cinturone con la fondina
    g.fillStyle = '#4a2a16'; g.beginPath(); g.ellipse(f * 1, by, 13, 3.2, 0, 0, Math.PI); g.lineTo(-12, by); g.fill();
    g.fillStyle = '#d8b050'; for (let i = 0; i < 6; i++) g.fillRect(f * (-8 + i * 2.6) - 0.6, by - 0.4, 1.3, 2.4);
    if (o.sheriff) star(g, f * 4, by - 10, 3.4, '#f2c040');
    const aim = o.aim || 0;
    if (aim > 0) {   // braccio teso con la pistola verso l'altro
      const sx2 = f * 5, sy2 = by - 12, ex = f * (10 + 10 * aim), ey = by - 13 - 2 * aim;
      g.strokeStyle = cqShade(L.col || '#d0402a', 0.85); g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx2, sy2); g.lineTo(ex, ey); g.stroke();
      g.fillStyle = '#2a2a30'; g.save(); g.translate(ex, ey); g.scale(f, 1); g.fillRect(0, -2.2, 9, 2.4); g.fillRect(-1, -2, 3.6, 5.4); g.fillStyle = '#7a4a26'; g.fillRect(-1.2, 0.6, 3, 3.4); g.restore();
      if (o.flash) { g.fillStyle = '#fff2a0'; star(g, ex + f * 12, ey - 1, 6 * o.flash, '#fff2a0'); star(g, ex + f * 12, ey - 1, 3.4 * o.flash, '#ffffff'); }
    } else { g.fillStyle = '#5a3018'; g.fillRect(f * 9 - 2, by - 1, 4, 7); g.fillStyle = '#2a2a30'; g.fillRect(f * 9 - 1.2, by - 4, 2.6, 4); }
    if (!o.noHat) hatShape(g, f * hx, hy + 3, S2, o.sheriff);
    g.restore();
  }

  // ======================= STATO, TEMPO, AIUTI =======================
  const lt = G => { if (!G.guest) return G.time; if (U2.tPrev !== G.time) { U2.tPrev = G.time; U2.tAt = now(); } return G.time + Math.min(0.5, now() - U2.tAt); };   // orologio "liscio" anche sull'amico
  const posOf = (G, c) => c === G.me ? cq : c;
  const oppOf = (G, c) => G.chars.find(o => o !== c);
  const sideIdx = (G, c) => G.chars.indexOf(c) === 1 ? 1 : 0;
  const PS = (G, c) => (G.st && G.st.p && G.st.p[c.id]) || {};
  // la campana: st.bk = numero del rintocco (gia' suonato o in arrivo), st.bt = quando suona (deciso dall'host, a caso)
  const tb = G => G.st.bt;
  const bellK = (G, t) => { const st = G.st; if (!st || st.ph !== 'duel' || st.bt == null) return -1; return t >= st.bt ? st.bk : st.bk - 1; };   // l'ultimo rintocco suonato
  const winOpen = (G, t) => { const st = G.st; return st && st.ph === 'duel' && st.bt != null && t >= st.bt && t - st.bt < WIN ? st.bk : -1; };
  const stunned = (G, c, t) => (PS(G, c).su || 0) > t;
  const smoking = (G, c, t) => (PS(G, c).sm || 0) > t;
  const frozen = (G, c) => { const st = G.st; if (!st) return true; if (st.ph !== 'duel') return true; const p = PS(G, c), T = lt(G); return !!p.d || stunned(G, c, T) || smoking(G, c, T); };
  const canFire = (G, c, k, T) => { const p = PS(G, c); return !p.d && p.nf !== k && (!stunned(G, c, T) || p.sk === k); };
  // IL MIRINO: tremolio deciso dalla manche, dal rintocco e da chi spara (uguale su ogni telefono); si stringe in AIM_T, piu' largo se il bersaglio corre
  function wob(n, k, id, t, mv) {
    const s = (n * 7919 + k * 104729 + id * 15485863) % 1000, a = s * 0.0123, b = s * 0.0371, c = s * 0.0517, d = s * 0.0731;
    const A = AIM0 * Math.max(0.08, 1 - t / AIM_T) * (mv ? 1.5 : 1);
    return [A * (Math.sin(5.3 * t + a) * 0.75 + Math.sin(9.7 * t + b) * 0.35), A * (Math.cos(6.1 * t + c) * 0.75 + Math.sin(11.3 * t + d) * 0.3)];
  }
  const onTarget = (n, k, id, t, mv) => { const [dx, dy] = wob(n, k, id, t, mv); return Math.hypot(dx, dy) < BODY; };
  const fired = (G, c) => (PS(G, c).f || []).length;
  const randDrum = () => { const a = [1, 1, 1, 0, 0, 0]; for (let i = 5; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const toMask = d => d.reduce((m, v, i) => m | (v ? 1 << i : 0), 0);
  const fromMask = m => [0, 1, 2, 3, 4, 5].map(i => (m >> i) & 1);
  const okDrum = d => Array.isArray(d) && d.length === 6 && d.filter(Boolean).length === 3;
  const statics = (() => FIXED.filter(([t]) => COVER_T[t]).map(([t, x, y]) => [t, x, y]))();
  // il riparo tra chi spara (A) e il bersaglio (B): vicino al bersaglio, davanti a lui dalla parte di chi spara
  function coverHit(G, A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1; let best = null, bd = 9;
    const test = (x, y, i, st) => {
      const cx = x + 0.5, cy = y + 0.5, t = ((cx - A.x) * dx + (cy - A.y) * dy) / L2; if (t <= 0 || t >= 1.02) return;
      const px = A.x + dx * t, py = A.y + dy * t, perp = Math.hypot(cx - px, cy - py), dB = Math.hypot(cx - B.x, cy - B.y);
      if (perp < 0.62 && dB < 1.6 && dB < bd) { bd = dB; best = { i, st, x: cx, y: cy }; }
    };
    (G.st.cv || []).forEach((c, i) => { if (c[3] > 0) test(c[1], c[2], i, 0); });
    statics.forEach(([, x, y], i) => test(x, y, i, 1));
    return best;
  }
  const blkAt = (G, x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return !!(G.st && G.st.cv && G.st.cv.some(c => c[3] > 0 && c[1] === cx && c[2] === cy)); };

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
    bang: () => { noise(0.5, 0.16, 1400); noise(0.12, 0.2, 4000, 0, 'highpass'); swp(160, 40, 0.35, 0.12); noise(0.9, 0.03, 600, 0.12); },   // uguale per veri e salve: da lontano non si distinguono
    bell: () => { for (const [f, v, d] of [[392, 0.07, 2.4], [784, 0.03, 1.6], [1176, 0.02, 1.1], [523, 0.025, 1.9]]) swp(f, f * 0.995, d, v, 0, 'sine'); },
    wood: () => { noise(0.18, 0.14, 900, 0, 'bandpass', 2); swp(300, 120, 0.12, 0.06, 0, 'square'); },
    ping: () => { swp(1800, 1400, 0.25, 0.04, 0, 'triangle'); swp(600, 300, 0.2, 0.04, 0.05); },
    whiz: () => { swp(2600, 500, 0.35, 0.035, 0.05, 'triangle'); },
    click: () => { swp(2400, 2000, 0.03, 0.05, 0, 'square'); swp(1600, 1200, 0.03, 0.04, 0.06, 'square'); },
    step: () => { noise(0.08, 0.06, 500); swp(3200, 2900, 0.12, 0.012, 0.03, 'triangle'); swp(3600, 3300, 0.1, 0.01, 0.07, 'triangle'); },   // passo con lo sperone
    whistle: () => { swp(900, 1400, 0.5, 0.025); swp(1400, 700, 0.9, 0.025, 0.55); },
    turn: () => { swp(200, 700, 0.18, 0.06, 0, 'sawtooth'); noise(0.3, 0.05, 2000, 0.05); },
    fall: () => { swp(400, 80, 0.7, 0.06, 0, 'triangle'); noise(0.4, 0.08, 300, 0.45); },
    feint: () => { swp(500, 900, 0.1, 0.04, 0, 'square'); },
    reload: () => { for (let i = 0; i < 4; i++) swp(1500, 1300, 0.04, 0.03, i * 0.13, 'square'); },
    win: () => { [523, 659, 784, 1046].forEach((f, i) => swp(f, f, 0.25, 0.04, i * 0.12, 'triangle')); },
    lose: () => { [392, 330, 262].forEach((f, i) => swp(f, f * 0.97, 0.35, 0.04, i * 0.2, 'triangle')); },
    tick: () => swp(1200, 1100, 0.04, 0.02, 0, 'square'),
    drum: () => { swp(900, 700, 0.05, 0.03, 0, 'square'); swp(300, 200, 0.06, 0.03, 0.03); },
    // i falsi allarmi
    horse: () => { for (let i = 0; i < 6; i++) swp(900 + (i % 2) * 300, 1100 + (i % 2) * 250, 0.09, 0.035, i * 0.08, 'sawtooth'); swp(800, 300, 0.4, 0.03, 0.48, 'sawtooth'); },
    door: () => { noise(0.22, 0.2, 260); swp(120, 50, 0.2, 0.09, 0, 'square'); noise(0.1, 0.08, 900, 0.18); },
    crow: () => { for (const d of [0, 0.32]) { swp(760, 520, 0.18, 0.05, d, 'sawtooth'); noise(0.16, 0.04, 1200, d, 'bandpass', 3); } },
    clang: () => { swp(1240, 1230, 0.5, 0.04, 0, 'triangle'); swp(1870, 1850, 0.35, 0.025, 0, 'sine'); swp(620, 610, 0.3, 0.03); },
    boo: () => { swp(220, 160, 0.6, 0.04, 0, 'sawtooth'); swp(180, 130, 0.6, 0.03, 0.15, 'sawtooth'); },
    spin: () => { for (let i = 0; i < 6; i++) swp(2600 - i * 150, 2300 - i * 150, 0.03, 0.025, i * 0.05, 'square'); swp(1500, 1300, 0.05, 0.04, 0.33, 'square'); },
    miss: () => { swp(2600, 500, 0.35, 0.035, 0.05, 'triangle'); noise(0.12, 0.05, 2500, 0.15, 'highpass'); }
  };

  // ======================= LO SCERIFFO (computer) =======================
  // Impara come carichi il tamburo: a fine manche i tamburi si svelano e lui conta dove metti i colpi veri (store.settings.bariSh)
  const SH_LINES = {
    start: ['Questa città è troppo piccola per tutti e due.', 'Il sole sorge… e qualcuno non lo vedrà tramontare.', '*sputa nella polvere*', 'Conta i passi, forestiero. Poi conta i miei colpi.', 'Ho fatto colazione con gente come te.'],
    hat: ['Ah! Solo un avvertimento.', 'Il tuo cappello sta meglio per terra.', 'Era a salve… stavolta.'],
    cover: ['Ehi, quella botte era di Joe!', 'Nasconditi pure, ragazzo.'],
    miss: ['Corri, corri…', 'Sei veloce, eh?'],
    win: ['*si tocca il cappello*', 'Lo sceriffo resta in città.', 'Torna quando avrai la barba.'],
    lose: ['Bel colpo… stavolta.', 'Mmh. Non male, forestiero.', 'Fortuna del principiante.'],
    hatme: ['Il mio cappello! Questa me la paghi.', 'Salve? Mi hai solo fatto il solletico.'],
    early: ['Ah ah! Era solo un cavallo, forestiero!', 'Nervosetto, eh?', 'Disonore! Qui si aspetta la campana.'],
    oops: ['…non dite niente a nessuno.', 'Dannato corvo!', 'Mi è scivolato il dito.']
  };
  const shMem = () => { const S = store.settings; if (!S.bariSh || !Array.isArray(S.bariSh.pos)) S.bariSh = { n: 0, pos: [0, 0, 0, 0, 0, 0] }; return S.bariSh; };
  function shLearn(d) { const M = shMem(); M.n++; d.forEach((v, i) => { M.pos[i] += v ? 1 : 0; }); saveStore(); }
  function shRead() {   // cosa ha capito delle tue abitudini (o null)
    const M = shMem(); if (M.n < 2) return null;
    const p = M.pos.map(v => v / M.n), early = (p[0] + p[1] + p[2]) / 3;
    if (early > 0.72) return 'Tu i colpi veri li metti sempre all\'inizio. Lo so.';
    if (early < 0.28) return 'Prima le salve, poi i veri… ti conosco, forestiero.';
    if (p[0] > 0.85) return 'Il tuo primo colpo è sempre vero, eh?';
    if (p[0] < 0.15) return 'Il tuo primo colpo è sempre a salve. Sempre.';
    if (p[5] > 0.85) return 'Ti tieni l\'ultimo colpo vero per la fine. Furbo.';
    return M.n >= 4 && Math.random() < 0.4 ? 'Cambi sempre ordine… mi piaci, forestiero.' : null;
  }
  // probabilita' che il PROSSIMO colpo di c sia vero, da quello che si sa (pallini svelati) e dalle abitudini imparate
  function dangerOf(G, c, learn) {
    const p = PS(G, c), f = p.f || [], n = f.length; if (n >= 6 || p.d) return 0;
    const M = shMem(), pr = i => learn && M.n ? (M.pos[i] + 1.5) / (M.n + 3) : 0.5; let sw = 0, sr = 0;
    for (let m = 0; m < 64; m++) {
      let bits = 0; for (let i = 0; i < 6; i++) if (m >> i & 1) bits++; if (bits !== 3) continue;
      let ok = true, w = 1; for (let i = 0; i < 6; i++) { const b = m >> i & 1; if (i < n && ((f[i] === 'r' && !b) || (f[i] === 'b' && b))) { ok = false; break; } w *= b ? pr(i) : 1 - pr(i); }
      if (!ok) continue; sw += w; if (m >> n & 1) sr += w;
    }
    return sw ? sr / sw : 0.5;
  }
  function shSay(G, c, k, txt) { const L = SH_LINES[k]; G.st.say = { id: c.id, t: r2(G.time), x: txt || L[Math.floor(Math.random() * L.length)] }; }
  function botLoad() {   // ordine scelto con uno "stile" diverso a ogni manche (non si fa leggere facilmente)
    const st = Math.random(); if (st < 0.25) return [1, 1, 0, 1, 0, 0]; if (st < 0.45) return [0, 0, 1, 0, 1, 1]; if (st < 0.6) return [1, 0, 1, 0, 1, 0]; if (st < 0.72) return [0, 1, 0, 1, 0, 1]; return randDrum();
  }
  function bestCover(G, c, o) {   // il posto dietro un riparo (dalla parte opposta all'altro) piu' comodo
    const P = posOf(G, c), Q = posOf(G, o); let best = null, bs = 1e9;
    for (const cv of G.st.cv || []) { if (cv[3] <= 0) continue; const cx = cv[1] + 0.5, cy = cv[2] + 0.5, dx = cx - Q.x, dy = cy - Q.y, l = Math.hypot(dx, dy) || 1, sx = cx + dx / l * 0.95, sy = cy + dy / l * 0.95;
      if (!cqFree(sx, sy) || blkAt(G, sx, sy)) continue; const s = Math.hypot(sx - P.x, sy - P.y) + (l < 3 ? 4 : 0) + Math.random() * 0.8; if (s < bs) { bs = s; best = [sx, sy]; } }
    return best;
  }
  function botGo(G, c, x, y) { const p = cqPath(c.x, c.y, x, y); if (p.length) { p[p.length - 1] = [x, y]; c.path = p; } else c.path = [[x, y]]; c.goal = [x, y]; }
  function botTick(G, c, dt) {
    const st = G.st, o = oppOf(G, c), T = G.time, p = PS(G, c); if (!o || p.d) return;
    if (st.ph !== 'duel' || frozen(G, c)) { c.path = []; c.walk = 0; return; }
    const dg = (PS(G, o).d || stunned(G, o, T + 0.4) || PS(G, o).nf === st.bk) ? 0 : dangerOf(G, o, !o.bot);
    const mine = G.drum[c.id] || [], n = fired(G, c), nxt = mine[n];
    c.think = (c.think || 0) - dt;
    if (c.think <= 0) {
      c.think = 0.45 + Math.random() * 0.4; const A = posOf(G, o), d = Math.hypot(A.x - c.x, A.y - c.y), cov = coverHit(G, A, c);
      if (c.hold || dg >= 0.42 || (nxt === 0 && dg > 0.2) || n >= 6) { if (!cov || Math.random() < 0.15) { const b = bestCover(G, c, o); if (b) botGo(G, c, b[0], b[1]); } c.mode = 'hide'; }
      else {   // l'altro (secondo lui) ha una salve in canna: esce e si avvicina
        c.mode = 'push'; if (d > 7 || Math.random() < 0.3) { const a = Math.atan2(c.y - A.y, c.x - A.x) + (Math.random() - 0.5) * 1.2, r = 4.5 + Math.random() * 2, x = Math.max(1.6, Math.min(23.4, A.x + Math.cos(a) * r)), y = Math.max(5.5, Math.min(10.5, A.y + Math.sin(a) * r)); if (cqFree(x, y) && !blkAt(G, x, y)) botGo(G, c, x, y); }
      }
      // salve in canna e al riparo: a volte GIRA IL TAMBURO per arrivare prima al colpo vero
      if (!c.hold && cov && nxt === 0 && n < 5 && mine.slice(n + 1).some(Boolean) && winOpen(G, T) < 0 && Math.random() < 0.3) spin(G, c);
    }
    // allo scoperto e in pericolo: si muove (chi corre ha il mirino addosso che trema di piu')
    if (dg > 0.3 && !coverHit(G, posOf(G, o), c) && (!c.path || !c.path.length) && Math.random() < 0.08) { const a = Math.random() * 6.28, x = c.x + Math.cos(a) * 1.6, y = c.y + Math.sin(a) * 1.6; if (cqFree(x, y) && !blkAt(G, x, y)) c.path = [[x, y]]; }
    if (c.path && c.path.length) { const q = c.path[0]; if (blkAt(G, q[0], q[1])) c.path = []; else cqModeStep(c, dt, 0.96); } else c.walk = 0;
  }
  function botAct(G, c, k) {   // decide al rintocco: { a: 's' spara | 'n' niente, rt = quando tocca (presto = mira peggiore) }
    const o = oppOf(G, c); if (!o || c.hold || !canFire(G, c, k, G.st.bt + 0.01)) return { a: 'n', rt: 99 };
    const n = fired(G, c), nxt = n < 6 ? G.drum[c.id][n] : -1, cv = coverHit(G, c, posOf(G, o)), R = Math.random(); let a = 'n';
    if (nxt < 0) a = 'n';
    else if (!cv) a = nxt ? 's' : (R < 0.7 ? 's' : 'n');
    else if (nxt) a = (!cv.st && G.st.cv[cv.i][3] <= 1 && R < 0.55) || R < 0.12 ? 's' : 'n';
    else a = R < 0.1 ? 's' : 'n';
    const R2 = Math.random(), rt = R2 < 0.22 ? 0.22 + Math.random() * 0.2 : 0.42 + Math.random() * 0.5 + (G.tut ? 0.4 : 0);   // a volte di fretta, di solito aspetta che il mirino si stringa
    return { a, rt: r2(rt) };
  }

  // ======================= LA MANCHE (host) =======================
  function genCovers() {   // 3 ripari a sinistra e i 3 simmetrici a destra; mai sopra le partenze, mai attaccati
    for (let tries = 0; tries < 80; tries++) {
      const L = []; let bad = false;
      for (let i = 0; i < 3 && !bad; i++) {
        let ok = false; for (let k = 0; k < 40 && !ok; k++) { const x = 3 + Math.floor(Math.random() * 9), y = 5 + Math.floor(Math.random() * 6), d = Math.hypot(x + 0.5 - 8.1, y + 0.5 - Y0);
          if (d < 1.6 || d > 5.2 || Math.hypot(x + 0.5 - MX, y + 0.5 - MY) < 2 || L.some(c => Math.hypot(c[1] - x, c[2] - y) < 1.9)) continue; L.push([CT[Math.floor(Math.random() * 3)], x, y, 2]); ok = true; }
        if (!ok) bad = true;
      }
      if (bad || !L.some(c => Math.hypot(c[1] + 0.5 - 8.1, c[2] + 0.5 - Y0) < 3.2)) continue;
      return L.concat(L.map(([t, x, y]) => [t, 25 - x, 15 - y, 2]));
    }
    return [['barile', 6, 6, 2], ['cassa', 9, 9, 2], ['fieno', 4, 9, 2], ['barile', 19, 9, 2], ['cassa', 16, 6, 2], ['fieno', 21, 6, 2]];
  }
  function softCovers(G) {   // i percorsi del computer girano intorno ai ripari
    for (let y = 0; y < CQ_H; y++) for (let x = 0; x < CQ_W; x++) if (cqSolid[y][x] && cqSolid[y][x].prop === 'bsoft') cqSolid[y][x] = null;   // anche quelli rimasti da una partita prima
    G.soft = []; for (const c of G.st.cv || []) if (c[3] > 0 && !cqSolid[c[2]][c[1]]) { cqSolid[c[2]][c[1]] = { prop: 'bsoft', soft: true }; G.soft.push([c[1], c[2]]); }
  }
  function newRound(G, n, sc) {
    G.st = { n, ph: 'load', t0: r2(G.time), rd: {}, sc: sc || {}, cv: genCovers(), p: {}, bt: null, bk: -1, fa: [], sh: [], shN: (G.st && G.st.shN) || 0, say: null, ad: {} };
    G.drum = {}; G.acts = null; G.wk = -1; G.faS = new Set();
    for (const c of G.chars) { G.st.p[c.id] = { f: [], h: 0, su: 0, d: 0 }; c.path = []; if (c.bot && !c.remote) { G.drum[c.id] = botLoad(); G.st.rd[c.id] = 1; } }
    softCovers(G);
    const sh = G.chars.find(c => c.bot && !c.remote && c.sheriff); if (sh && !G.tut) { const r = n > 1 ? shRead() : null; shSay(G, sh, 'start', r && Math.random() < 0.75 ? r : null); }
  }
  // il prossimo rintocco: dopo un tempo A CASO, con 0-2 falsi allarmi in mezzo. Chi aspettava "il rintocco dopo" ora sa quando finisce
  function schedBell(G, first) {
    const st = G.st, T = G.time, gap = first ? F0 + Math.random() * (F1 - F0) : BMIN + Math.random() * (BMAX - BMIN);
    st.bk = first ? 0 : st.bk + 1; st.bt = r2(T + gap);
    const K = Object.keys(ALARM), nA = Math.random() < (first ? 0.5 : 0.75) ? (gap > 3.5 && Math.random() < 0.45 ? 2 : 1) : 0;
    st.fa = []; for (let i = 0; i < nA; i++) { const t = T + 0.7 + Math.random() * Math.max(0.2, gap - 1.3); if (st.fa.every(f => Math.abs(f[0] - t) > 0.8)) st.fa.push([r2(t), K[Math.floor(Math.random() * K.length)]]); }
    for (const c of G.chars) { const p = PS(G, c); if (p.su === BIG) { p.su = r2(st.bt + (p.sw ? WIN : 0.02)); p.sw = 0; } }
  }
  // GIRA IL TAMBURO: salti il colpo in canna (non spara), ma resti fermo fino al prossimo rintocco. Lo vedono tutti (non cosa hai saltato)
  function spin(G, c) {
    const st = G.st, p = PS(G, c), T = G.time; if (st.ph !== 'duel' || p.d || p.f.length >= 5 || stunned(G, c, T) || winOpen(G, T) >= 0) return;
    p.f.push('g'); if (T < st.bt) p.su = st.bt; else { p.su = BIG; p.sw = 0; }
    st.sh.push(mkSh(G, c, 'g', 'spin', posOf(G, c).x, posOf(G, c).y));
  }
  // DISONORATO: ha sparato prima della campana. Il colpo va in aria, resta fermo e al prossimo rintocco non puo' sparare
  function dishonor(G, c) {
    const st = G.st, p = PS(G, c), T = G.time; if (st.ph !== 'duel' || p.d || winOpen(G, T) >= 0 || stunned(G, c, T) || T - st.t0 < 0.8) return;
    if (T < st.bt) { p.nf = st.bk; p.su = r2(st.bt + WIN); } else { p.nf = st.bk + 1; p.su = BIG; p.sw = 1; }
    if (p.f.length < 6) p.f.push('u');
    st.sh.push(mkSh(G, c, 's', 'early', posOf(G, c).x, posOf(G, c).y));
    const sh = G.chars.find(o => o.bot && !o.remote && o.sheriff); if (sh && !G.tut) shSay(G, sh, sh === c ? 'oops' : 'early');
  }
  function mkSh(G, c, a, res, x, y) { G.st.shN = (G.st.shN || 0) + 1; if (G.st.sh.length > 10) G.st.sh.shift(); return [G.st.shN, c.id, a, res, r2(x), r2(y), r2(G.time)]; }
  function resolve(G, c, A, k) {
    const st = G.st, p = PS(G, c), o = oppOf(G, c), po = PS(G, o), P = posOf(G, c), Q = posOf(G, o);
    if (p.d || st.ph !== 'duel') return;
    const n = p.f.length; if (n >= 6) { st.sh.push(mkSh(G, c, 's', 'click', P.x, P.y)); return; }
    const real = !!G.drum[c.id][n], cov = coverHit(G, P, Q), d = Math.hypot(Q.x - P.x, Q.y - P.y);
    // la mira: per le persone la decide il loro telefono (A.h: il mirino era sul bersaglio quando hanno toccato), per il computer lo stesso calcolo qui
    const hit = (o.remote && cqLagging(o)) ? false : A.h != null ? !!A.h : onTarget(st.n, k, c.id, A.rt, (o.mv || 0) > RUN_V);
    let res, info, x = Q.x, y = Q.y;
    p.sm = r2(G.time + SMOKE);   // dopo lo sparo resti fermo nel fumo
    if (!hit) { res = 'miss'; info = 'u'; const a = Math.random() * 6.28; x = Q.x + Math.cos(a) * 0.9; y = Q.y + Math.sin(a) * 0.9; }
    else if (cov) { x = cov.x; y = cov.y; if (real) { res = 'cover'; info = 'r'; if (!cov.st) { st.cv[cov.i][3]--; if (st.cv[cov.i][3] <= 0) { res = 'broke'; softCovers(G); } } } else { res = 'puff'; info = 'b'; } }
    else if (real) { res = 'kill'; info = 'r'; po.d = 1; }
    else { res = 'hat'; info = 'b'; const l = d || 1; po.h = 1; po.hx = r2(Q.x + (Q.x - P.x) / l * 1.3); po.hy = r2(Q.y + (Q.y - P.y) / l * 1.3); po.su = BIG; po.sw = 0; po.sk = k; }
    p.f.push(info); st.sh.push(mkSh(G, c, 's', res, x, y).concat([o.id]));
    const sh = c.bot && !c.remote && c.sheriff ? c : o.bot && !o.remote && o.sheriff ? o : null;
    if (sh && !G.tut && Math.random() < 0.6) { if (sh === c && (res === 'hat' || res === 'cover' || res === 'miss')) shSay(G, sh, res); else if (sh === o && res === 'hat') shSay(G, sh, 'hatme'); }
    if (res === 'kill') { st.ph = 'dead'; st.t0 = r2(G.time); st.win = c.id; st.kill = o.id; }
  }
  function roundEnd(G, win, why) {
    const st = G.st; st.sc = st.sc || {}; if (win) st.sc[win.id] = (st.sc[win.id] || 0) + 1;
    st.ph = 'mres'; st.t0 = r2(G.time); st.win = win ? win.id : -1;
    st.dr = {}; for (const c of G.chars) st.dr[c.id] = toMask(G.drum[c.id] || [0, 0, 0, 0, 0, 0]);
    st.ff = {}; for (const c of G.chars) st.ff[c.id] = fired(G, c);
    const a = G.chars[0], b = G.chars[1], s = c => st.sc[c.id] || 0;
    st.msg = (win ? '🏆 Manche a ' + win.name + '!' : '🤝 Manche pari!') + '\n' + why + '\n' + a.name + ' ' + s(a) + ' – ' + s(b) + ' ' + b.name;
    st.fin = s(a) >= WINS || s(b) >= WINS || st.n >= MAXR || G.tut ? 1 : 0;
    const sh = G.chars.find(c => c.bot && !c.remote && c.sheriff), hu = sh && oppOf(G, sh);
    if (sh && hu && G.drum0 && G.drum0[hu.id]) shLearn(G.drum0[hu.id]);   // impara dal tamburo caricato a inizio manche
    if (sh && !G.tut) shSay(G, sh, win === sh ? 'win' : win ? 'lose' : 'start');
  }
  function finalEnd(G) {
    const st = G.st, a = G.chars[0], b = G.chars[1], s = c => st.sc[c.id] || 0, w = s(a) > s(b) ? a : s(b) > s(a) ? b : null;
    cqModeEnd({ t: w ? '🏆 Vince ' + esc(w.name) + '!' : '🤝 Pari!', why: 'Manche ' + s(a) + ' – ' + s(b), rank: (w === b ? [b, a] : [a, b]).map(c => [c.name, s(c) + ' manche']), win: w ? [w.id] : [] });
  }
  function hostDuel(G) {
    const st = G.st, T = G.time;
    // velocita' di ognuno (chi corre ha addosso un mirino che trema di piu')
    for (const c of G.chars) { const P = posOf(G, c); if (c.lx != null && G.dt > 0) { const v = Math.hypot(P.x - c.lx, P.y - c.ly) / G.dt; c.mv = (c.mv || 0) * 0.7 + v * 0.3; } c.lx = P.x; c.ly = P.y; }
    if (st.bt == null) schedBell(G, true);
    // falsi allarmi: lo Sceriffo ogni tanto ci casca
    for (const [t, ty] of st.fa || []) { const key = st.bk + ':' + t; if (T >= t && !G.faS.has(key)) { G.faS.add(key); for (const c of G.chars) if (c.bot && !c.remote && !c.hold && Math.random() < 0.08) dishonor(G, c); } }
    if (G.chars.every(c => fired(G, c) >= 6)) { roundEnd(G, null, '🔫 Tamburi vuoti per tutti e due'); return; }
    if (T < st.bt) return;
    const k = st.bk, t = T - st.bt;
    if (k !== G.wk) { G.wk = k; G.acts = {}; G.res = {}; for (const c of G.chars) if (c.bot && !c.remote) G.acts[c.id] = botAct(G, c, k); }
    if (t > WIN + LAT * 2) { if (k + 1 >= MAXB) roundEnd(G, null, '☀️ Il sole è alto: nessuno a terra'); else schedBell(G, false); return; }
    const able = G.chars.filter(c => canFire(G, c, k, st.bt + 0.01));
    for (let guard = 0; guard < 4; guard++) {
      const pend = able.filter(c => G.acts[c.id] && !G.res[c.id] && G.acts[c.id].a !== 'n').sort((a, b) => G.acts[a.id].rt - G.acts[b.id].rt);
      if (!pend.length) break;
      const f = pend[0], A = G.acts[f.id]; if (A.rt > t) break;
      const late = t > WIN + LAT;
      if (!late && !able.every(c => G.acts[c.id] || (t - (c.remote ? LAT : 0)) >= A.rt)) break;
      G.res[f.id] = 1; resolve(G, f, A, k); if (st.ph !== 'duel') return;
    }
  }

  // ======================= IL MIO TELEFONO: pannelli e pulsanti =======================
  function css() {
    if (document.getElementById('baCss')) return;
    const s = document.createElement('style'); s.id = 'baCss';
    s.textContent = `#baLoad{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,370px);z-index:7;background:linear-gradient(#5e3c22,#3a2414);border:3px solid #c89a5a;border-radius:18px;padding:12px 14px 14px;color:#fbe8c8;text-align:center;font-family:system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#baLoad.rl{top:auto;bottom:12px;transform:translateX(-50%);padding:8px 10px}#baLoad.rl .dr{width:190px;height:190px}#baLoad.rl .ch{width:52px;height:52px}
#baLoad h3{margin:0 0 4px;font:800 18px Georgia,serif;color:#ffd890}#baLoad p{margin:2px 0;font-size:13px;line-height:1.3}#baLoad .tm{float:right;font:800 15px system-ui;color:#ffd890}
#baLoad .dr{position:relative;width:226px;height:226px;margin:8px auto 6px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#b8bec8,#6a707a 55%,#3a3e46);box-shadow:inset 0 -6px 14px rgba(0,0,0,.5),0 4px 12px rgba(0,0,0,.5)}
#baLoad .ch{position:absolute;width:62px;height:62px;transform:translate(-50%,-50%);border-radius:50%;border:3px solid #24262c;background:radial-gradient(circle,#0e0e12 55%,#2a2c32);color:#fff;font:800 10px system-ui;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#baLoad .ch.r{background:radial-gradient(circle at 45% 40%,#ffe9a0,#d8a038 45%,#8a5a14 80%);color:#5a1a08}#baLoad .ch.r::after{content:'';position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px;border-radius:50%;background:#c82a1a;box-shadow:0 0 0 2px #7a4a10}
#baLoad .ch.b{background:radial-gradient(circle at 45% 40%,#f4f0e4,#c8c0aa 70%);color:#6a6250}#baLoad .ch i{position:absolute;left:-4px;top:-4px;width:18px;height:18px;border-radius:50%;background:#2a1a10;color:#ffd890;font:800 11px/18px system-ui;font-style:normal}
#baLoad .ch span{position:absolute;left:0;right:0;bottom:6px;font-size:9.5px}#baLoad .hub{position:absolute;left:50%;top:50%;width:70px;height:70px;margin:-35px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#8a909a,#3a3e46);display:flex;align-items:center;justify-content:center;font:800 15px system-ui;color:#fff;text-align:center;line-height:1.1}
#baLoad .bt{display:flex;gap:8px;justify-content:center;margin-top:6px}#baLoad button.b2{border:0;border-radius:12px;padding:9px 14px;font:800 14px system-ui;background:#7a5a3a;color:#fff}#baLoad button.ok{background:#3a8a4a}#baLoad button.ok:disabled{opacity:.45}#baLoad .ord{font-size:11.5px;opacity:.85}
#baShoot{position:absolute;right:max(18px,6%);bottom:140px;width:104px;height:104px;border-radius:50%;border:4px solid rgba(255,230,180,.35);background:radial-gradient(circle at 40% 35%,#6a4a2a,#2a1a10);color:#ffe2b0;font:800 13px system-ui;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;box-shadow:0 5px 16px rgba(0,0,0,.45);opacity:.55}
#baShoot b{font-size:34px;line-height:1}#baShoot.on{opacity:1;border-color:#ffd24a;background:radial-gradient(circle at 40% 35%,#d8642a,#7a2a10);box-shadow:0 0 0 6px rgba(255,210,74,.35),0 5px 16px rgba(0,0,0,.45);animation:baPulse .3s ease-in-out infinite alternate}
#baShoot.on.lock{border-color:#fff;background:radial-gradient(circle at 40% 35%,#ff4a2a,#a81808);box-shadow:0 0 0 8px rgba(255,80,40,.5),0 5px 16px rgba(0,0,0,.45)}#baBell.dis{background:#5a2a6a;border-color:#c89aff}
@keyframes baPulse{from{transform:scale(1)}to{transform:scale(1.07)}}
#baBell{position:absolute;left:50%;top:104px;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:8px;background:rgba(40,22,14,.82);border:1px solid rgba(240,190,110,.5);color:#ffe2b0;font:800 14px system-ui;padding:4px 12px 4px 6px;border-radius:18px;pointer-events:none;white-space:nowrap}
#baBell.on{background:#c8402a;color:#fff;border-color:#ffd24a;animation:baPulse .18s ease-in-out infinite alternate}#baBell canvas{width:30px;height:30px}
#baMini{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:6px;background:rgba(30,18,10,.78);border:1px solid rgba(240,190,110,.4);border-radius:14px;padding:4px 10px 4px 4px;color:#ffe2b0;font:700 11.5px system-ui;pointer-events:none}#baMini canvas{width:64px;height:64px}
#ciack.baDuel #cqKill{right:calc(max(18px,6%) + 10px);bottom:258px;width:84px;height:84px;font-size:13px;line-height:1.15;padding:0 6px}
#baRes{position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:6;width:min(92vw,360px);background:rgba(40,24,14,.92);border:2px solid #c89a5a;border-radius:14px;padding:8px 12px;color:#fbe8c8;font:600 13px system-ui;text-align:center}
#baRes .rw{display:flex;align-items:center;justify-content:space-between;margin:5px 0;gap:6px}#baRes .rw b{max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#baRes .cs{display:flex;gap:4px}#baRes .cs span{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid #24262c}#baRes .cs .r{background:#d8a038;color:#7a1a08}#baRes .cs .b{background:#e8e2d0;color:#6a6250}#baRes .cs .x{opacity:.45}#baRes small{display:block;opacity:.8;margin-top:4px}
#baTut{position:absolute;inset:0;pointer-events:none;z-index:9}#baTut .bub{position:absolute;left:50%;top:96px;transform:translateX(-50%);width:min(88vw,340px);background:#fff8e8;color:#3a2414;border:3px solid #c89a5a;border-radius:14px;padding:8px 12px;font:600 14px system-ui;box-shadow:0 6px 18px rgba(0,0,0,.4);pointer-events:auto}#baTut .bub small{display:block;color:#a06a2a;font-weight:800;font-size:11px}#baTut .bub button{float:right;border:0;background:#e8d8c0;border-radius:8px;padding:2px 8px;font:700 11px system-ui;margin-left:6px}
#baTut .hl{position:absolute;border:3px solid #ffd24a;box-shadow:0 0 0 4000px rgba(0,0,0,.18),0 0 14px #ffd24a;border-radius:14px;animation:baPulse .5s ease-in-out infinite alternate}#baTut .fg{position:absolute;font-size:38px;transform:translateX(-50%);animation:baFg .6s ease-in-out infinite alternate}@keyframes baFg{from{margin-top:0}to{margin-top:10px}}`;
    document.head.appendChild(s);
  }
  const ROOT = () => $('#ciack');
  // ---- il pannello del tamburo (prima della manche e durante la ricarica) ----
  function loadOpen(G, rl) {
    css(); let el = document.getElementById('baLoad'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'baLoad'; if (rl) el.className = 'rl';
    const R = rl ? 66 : 80, sz = rl ? 190 : 226;
    el.innerHTML = `<span class="tm"></span><h3>${rl ? '🔄 Ricarica' : '🔫 Carica il tamburo'}</h3><p>${rl ? 'Rifai l\'ordine: sei fermo e scoperto per 2 rintocchi!' : 'Tocca <b>3 buchi</b>: lì metti i colpi <b style="color:#ff8a6a">VERI 🔴</b>. Gli altri sono a <b>salve</b> ⚪ (fanno BANG ma non uccidono).'}</p>
      <div class="dr">${[0, 1, 2, 3, 4, 5].map(i => { const a = -Math.PI / 2 + i * Math.PI / 3; return `<button type="button" class="ch" data-i="${i}" style="left:${sz / 2 + Math.cos(a) * R}px;top:${sz / 2 + Math.sin(a) * R}px"><i>${i + 1}</i><span></span></button>`; }).join('')}<div class="hub"></div></div>
      <div class="ord">Si spara in ordine: 1 → 2 → 3 → 4 → 5 → 6</div><div class="bt"><button type="button" class="b2 rnd">🎲 A caso</button>${rl ? '' : '<button type="button" class="b2 ok">✔ Pronto</button>'}</div>`;
    ROOT().appendChild(el);
    if (!U2.d || !okDrum(U2.d) && U2.d.filter(Boolean).length > 3) U2.d = [0, 0, 0, 0, 0, 0];
    el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('pointerup', e => e.stopPropagation());
    el.querySelectorAll('.ch').forEach(b => b.onclick = () => { const i = +b.dataset.i, d = U2.d; if (d[i]) d[i] = 0; else if (d.filter(Boolean).length < 3) d[i] = 1; else { const j = d.lastIndexOf(1) === i ? d.indexOf(1) : U2.last != null && d[U2.last] ? U2.last : d.indexOf(1); d[j] = 0; d[i] = 1; } U2.last = i; SFX.drum(); if (!rl) setReady(G, false); loadRender(G); if (rl) sendDrum(G, true); });
    el.querySelector('.rnd').onclick = () => { U2.d = randDrum(); SFX.reload(); if (!rl) setReady(G, false); loadRender(G); if (rl) sendDrum(G, true); };
    const ok = el.querySelector('.ok'); if (ok) ok.onclick = () => { if (okDrum(U2.d)) setReady(G, true); };
    loadRender(G);
  }
  function loadRender(G) {
    const el = document.getElementById('baLoad'); if (!el) return; const d = U2.d, n = d.filter(Boolean).length;
    el.querySelectorAll('.ch').forEach(b => { const i = +b.dataset.i; b.className = 'ch' + (d[i] ? ' r' : n >= 3 ? ' b' : ''); b.querySelector('span').textContent = d[i] ? 'VERO' : n >= 3 ? 'salve' : ''; });
    el.querySelector('.hub').innerHTML = '🔴 ' + n + '/3' + (U2.rdy ? '<br>✔' : '');
    const ok = el.querySelector('.ok'); if (ok) { ok.disabled = n !== 3; ok.textContent = U2.rdy ? '⏳ Aspetto l\'altro…' : '✔ Pronto'; }
  }
  function loadClose() { const el = document.getElementById('baLoad'); if (el) el.remove(); }
  function sendDrum(G) { if (!okDrum(U2.d)) return; if (G.guest) cqNetSend({ k: 'drum', m: toMask(U2.d) }); else G.drum[G.me.id] = U2.d.slice(); }
  function setReady(G, on) { if (U2.rdy === on) return; U2.rdy = on; if (on) { sendDrum(G, false); SFX.reload(); if (G.guest) cqNetSend({ k: 'rdy', on: 1 }); else G.st.rd[G.me.id] = 1; } else { if (G.guest) cqNetSend({ k: 'rdy', on: 0 }); else if (G.st) delete G.st.rd[G.me.id]; } loadRender(G); }
  // ---- pulsanti del duello ----
  function duelUI(G, on) {
    css(); ROOT().classList.toggle('baDuel', !!on);
    if (!on) { for (const id of ['baShoot', 'baBell', 'baMini']) { const e = document.getElementById(id); if (e) e.remove(); } return; }
    const mk = (id, html, fn) => { if (document.getElementById(id)) return; const b = document.createElement(id === 'baBell' || id === 'baMini' ? 'div' : 'button'); b.id = id; if (b.type !== undefined) b.type = 'button'; b.innerHTML = html; ROOT().appendChild(b); if (fn) { b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); const G2 = cq.g; if (G2 && G2.mode === 'bari') fn(G2); }); b.addEventListener('pointerup', e => e.stopPropagation()); b.oncontextmenu = e => e.preventDefault(); } };
    mk('baShoot', '<b>🔫</b><span>SPARA</span>', G2 => myAct(G2, false));
    mk('baBell', '<canvas width="60" height="60"></canvas><span></span>');
    mk('baMini', '<canvas width="128" height="128"></canvas><span></span>');
  }
  // SPARA: dopo il DONG parte il colpo (il mirino decide se prende); PRIMA del DONG col pulsante = disonorato (toccando la mappa no: si cammina)
  function myAct(G, tap) {
    const T = lt(G), st = G.st; if (!st || st.ph !== 'duel') return; const k = winOpen(G, T), p = PS(G, G.me);
    if (p.d) return;
    if (k < 0) {
      if (tap || frozen(G, G.me) || T - st.t0 < 0.8 || now() - (U2.early || 0) < 1) return; U2.early = now();
      if (G.guest) cqNetSend({ k: 'early' }); else dishonor(G, G.me);
      return;
    }
    if (U2.acted === k || !canFire(G, G.me, k, T)) return;
    if (!G.guest && G.wk !== k) return;
    U2.acted = k; const rt = r2(T - st.bt), h = onTarget(st.n, k, G.me.id, rt, (U2.omv || 0) > RUN_V) ? 1 : 0; U2.myAim = now();
    if (G.guest) cqNetSend({ k: 'act', a: 's', rt, h, b: k }); else if (G.acts) G.acts[G.me.id] = { a: 's', rt, h };
    if (G.tut) G.tutShot = 1;
  }
  function mySpin(G) { const st = G.st, p = PS(G, G.me), T = lt(G); if (!st || st.ph !== 'duel' || p.d || p.f.length >= 5 || stunned(G, G.me, T) || winOpen(G, T) >= 0) return; if (G.guest) cqNetSend({ k: 'spin' }); else spin(G, G.me); SFX.spin(); }
  let sayT = 0; function say(t) { if (now() - sayT < 1.2) return; sayT = now(); cqToast(t); }
  function uiTick(G) {
    const st = G.st, T = lt(G), sh = document.getElementById('baShoot'); if (!sh || !st) return;
    const k = winOpen(G, T), can = k >= 0 && U2.acted !== k && canFire(G, G.me, k, T) && fired(G, G.me) < 6;
    const lock = can && onTarget(st.n, k, G.me.id, T - st.bt, (U2.omv || 0) > RUN_V);   // il mirino e' sul bersaglio adesso
    sh.classList.toggle('on', can); sh.classList.toggle('lock', !!lock);
    { const s = sh.querySelector('span'), tx = lock ? '🎯 ORA!' : can ? 'MIRA…' : 'SPARA'; if (s.textContent !== tx) s.textContent = tx; }
    const bl = document.getElementById('baBell'); if (bl) {
      const kb = bellK(G, T), dis = PS(G, G.me).nf === st.bk && T < st.bt + WIN;
      bl.classList.toggle('on', k >= 0); bl.classList.toggle('dis', !!dis && k < 0);
      const txt = k >= 0 ? '🔔 FUOCO!' : dis ? '😳 disonorato: salti un rintocco' : '🤫 aspetta la campana… ' + Math.max(1, kb + 2) + '/' + MAXB;
      const sp = bl.querySelector('span'); if (sp.textContent !== txt) sp.textContent = txt;
      const g = bl.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 60, 60); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(30, 30, 24, 0, 7); g.stroke();
      if (k >= 0) { g.strokeStyle = '#fff'; g.beginPath(); g.arc(30, 30, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, 1 - (T - st.bt) / WIN)); g.stroke(); }
      else { const a = now() * 2.2; g.strokeStyle = '#ffd24a'; g.beginPath(); g.arc(30, 30, 24, a, a + 0.9); g.stroke(); }   // non si sa quando suona: gira e basta
      g.font = '26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔔', 30, 32);
    }
    const mi = document.getElementById('baMini'); if (mi) {
      const f = PS(G, G.me).f || [], d = U2.myD || [0, 0, 0, 0, 0, 0], n = fired(G, G.me), key = d.join('') + f.join(''); if (mi.dataset.k !== key) {
        mi.dataset.k = key; const g = mi.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 128, 128);
        g.fillStyle = '#6a707a'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = '#4a4e56'; g.beginPath(); g.arc(64, 64, 24, 0, 7); g.fill();
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3, x = 64 + Math.cos(a) * 40, y = 64 + Math.sin(a) * 40, used = i < n;
          g.fillStyle = used ? '#141418' : d[i] ? '#d8a038' : '#e8e2d0'; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill();
          if (!used && d[i]) { g.fillStyle = '#c82a1a'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
          if (i === n && n < 6) { g.strokeStyle = '#ffd24a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 19, 0, 7); g.stroke(); }
          g.fillStyle = used ? '#888' : '#2a1a10'; g.font = '800 15px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (used) g.fillText(f[i] === 'g' ? '↻' : '✕', x, y); }
        mi.querySelector('span').innerHTML = n >= 6 ? 'tamburo<br>vuoto!' : 'in canna:<br>' + (d[n] ? '🔴 <b>VERO</b>' : '⚪ <b>salve</b>');
      }
    }
  }
  // ---- risultato della manche: i tamburi svelati ----
  function resOpen(G) {
    css(); let el = document.getElementById('baRes'); if (el) el.remove(); const st = G.st; if (!st.dr) return;
    el = document.createElement('div'); el.id = 'baRes';
    el.innerHTML = '<b>🔍 Com\'erano carichi i tamburi</b>' + G.chars.map(c => { const d = fromMask(st.dr[c.id] || 0), n = (st.ff || {})[c.id] || 0; return `<div class="rw"><b>${esc(c.name)}</b><div class="cs">${d.map((v, i) => `<span class="${v ? 'r' : 'b'}${i < n ? '' : ' x'}">${i < n ? (v ? '🔴' : '⚪') : i + 1}</span>`).join('')}</div></div>`; }).join('') + '<small>Colorati = colpi sparati · numeri = ancora nel tamburo</small>';
    ROOT().appendChild(el);
  }
  function resClose() { const el = document.getElementById('baRes'); if (el) el.remove(); }
  // ---- passaggi di fase sul mio telefono ----
  function stage(G) {
    const st = G.st, key = st ? st.ph + st.n : ''; if (key === U2.ph) return; const was = U2.ph; U2.ph = key; const p = st ? st.ph : '';
    if (p !== 'load') loadClose(); if (p !== 'mres') resClose();
    if (p === 'load') { U2.rdy = false; U2.d = [0, 0, 0, 0, 0, 0]; U2.myD = null; U2.acted = -1; U2.faS = new Set(); duelUI(G, false); loadOpen(G, false); if (st.n === 1 && !G.tut) helpOnce(); }
    if (p === 'walk') { if (!U2.myD) { if (!okDrum(U2.d)) { U2.d = randDrum(); sendDrum(G); } U2.myD = U2.d.slice(); } SFX.whistle(); }
    if (p === 'duel') { duelUI(G, true); SFX.turn(); }
    if (p === 'dead' || p === 'mres') { if (was.startsWith('duel')) duelUI(G, false); }
    if (p === 'mres') { resOpen(G); const w = st.win === G.me.id; if (st.win >= 0) SFX[w ? 'win' : 'lose'](); }
  }
  // il mio personaggio: fermo durante il caricamento, i tre passi da solo, il tamburo nuovo dopo la ricarica
  function meTick(G, dt) {
    const st = G.st, i = sideIdx(G, G.me), T = lt(G);
    if (G.opp && dt > 0) { const P = posOf(G, G.opp); if (U2.ox != null) U2.omv = (U2.omv || 0) * 0.7 + Math.hypot(P.x - U2.ox, P.y - U2.oy) / dt * 0.3; U2.ox = P.x; U2.oy = P.y; }   // l'altro corre? (il mirino trema di piu')
    if (st.ph === 'load') { cq.x = X0[i]; cq.y = Y0; cq.face = i ? 1 : -1; cq.walk = 0; }
    if (st.ph === 'walk') { const t = T - st.t0, s = Math.max(0, Math.min(3, (t - 0.55) / 0.8)), fr = s - Math.floor(s), stp = Math.floor(s) + Math.min(1, fr / 0.5); cq.x = X0[i] + (i ? 1 : -1) * STEP * stp; cq.y = Y0; cq.face = i ? 1 : -1; cq.walk = fr < 0.5 && s < 3 ? t * 10 : 0;
      const kk = Math.floor(s); if (kk !== U2.stp && kk >= 1) { U2.stp = kk; SFX.step(); } if (s < 1) U2.stp = 0; }
    if (st.ph === 'duel' && U2.facing !== st.n) { U2.facing = st.n; cq.face = i ? -1 : 1; }
    if (st.ph === 'load' && G.guest && !U2.rdy && T - st.t0 > (st.n > 1 ? LOAD2 : LOAD) - 0.6) { if (!okDrum(U2.d)) U2.d = randDrum(); setReady(G, true); loadRender(G); }
    { const a = st.ad && st.ad[G.me.id]; if (a && a[1] !== U2.adSeen && st.ph !== 'load') { U2.adSeen = a[1]; U2.d = fromMask(a[0]); U2.myD = U2.d.slice(); } }   // il tamburo che usa davvero l'host (se il mio non fosse arrivato in tempo)
    const el = document.getElementById('baLoad'); if (el) { const tm = el.querySelector('.tm'), left = st.ph === 'load' ? (st.n > 1 ? LOAD2 : LOAD) - (T - st.t0) : 0, tx = left > 0 ? Math.ceil(left) + ' s' : ''; if (tm.textContent !== tx) tm.textContent = tx; }
  }
  // falsi allarmi: suono e scritta su ogni telefono quando il suo orologio ci arriva
  function alarmTick(G) {
    const st = G.st, T = lt(G); if (!st || st.ph !== 'duel') return; U2.faS = U2.faS || new Set();
    for (const [t, ty] of st.fa || []) { const key = st.bk + ':' + t; if (T >= t && !U2.faS.has(key)) { U2.faS.add(key); if (T - t < 0.8 && ALARM[ty]) { SFX[ty](); U2.fx.push({ k: 'alarm', ty, t: now() }); } } }
  }
  // ---- scritte e suoni degli spari (arrivano dall'host): su ogni telefono ----
  function fxEvents(G) {
    const st = G.st; if (!st || !st.sh) return;
    for (const e of st.sh) {
      if (e[0] <= U2.shSeen) continue; U2.shSeen = e[0]; if (lt(G) - e[6] > 2) continue;
      const [, id, a, res, x, y] = e, c = G.chars.find(o => o.id === id), mine = c === G.me, T = now();
      if (a === 's') { U2.fx.push({ k: 'shot', id, t: T, up: res === 'early' }); if (res !== 'click') { SFX.bang(); U2.shake = T; } }
      const txt = { kill: '🔴 VERO!', hat: '⚪ SALVE! 🎩', cover: '💥 VERO nel riparo', broke: '💥 VERO: riparo rotto!', puff: '⚪ salve: nessun buco', miss: 'fiuuu… mancato! ❓', click: 'clic… vuoto', early: '😳 DISONORATO!', spin: '↻ gira il tamburo' }[res];
      const tx = res === 'click' || res === 'early' || res === 'spin' ? posOf(G, c || G.me) : { x, y };
      U2.fx.push({ k: 'txt', x: tx.x, y: tx.y, t: T + (a === 's' ? 0.12 : 0), s: txt, c: res === 'kill' || res === 'cover' || res === 'broke' || res === 'early' ? '#ff6a4a' : res === 'hat' || res === 'puff' ? '#ffffff' : '#ffe2b0' });
      if (res === 'cover' || res === 'broke') { SFX.wood(); U2.fx.push({ k: 'spl', x, y, t: T }); }
      if (res === 'hat') { SFX.ping(); U2.fx.push({ k: 'hat', id: e[7], x, y, t: T }); }
      if (res === 'miss') { SFX.miss(); U2.fx.push({ k: 'dust', x, y, t: T }); }
      if (res === 'click') SFX.click();
      if (res === 'early') { SFX.boo(); if (mine) say('😳 <b>Disonorato!</b> Hai sparato prima della campana: il colpo è finito in aria e al prossimo rintocco <b>non puoi sparare</b>.'); }
      if (res === 'spin' && !mine) SFX.spin();
      if (res === 'kill') { SFX.fall(); U2.slow = { t: T, id: e[7] }; }
    }
    U2.fx = U2.fx.filter(f => now() - f.t < 2);
  }
  function bellTick(G) {   // DONG: lo sente ogni telefono quando il suo orologio passa il rintocco
    const k = bellK(G, lt(G)); if (k >= 0 && k < MAXB && k !== U2.bell) { U2.bell = k; SFX.bell(); }
    if (!G.st || G.st.ph !== 'duel') U2.bell = -1;
  }
  function helpOnce() {
    try { if (localStorage.getItem('bariHelp')) return; localStorage.setItem('bariHelp', '1'); } catch { return; }
    setTimeout(() => cqToast('🤠 <b>Nervi saldi!</b> La campana 🔔 suona <b>quando vuole</b>, e prima ci sono falsi allarmi: chi spara prima del DONG è <b>disonorato</b>. Dopo il DONG il mirino trema: spara quando diventa <b>🎯 rosso</b>. Il colpo <b>vero</b> 🔴 ti butta giù, la <b>salve</b> ⚪ ti fa volare il cappello.'), 2500);
  }

  // ======================= TUTORIAL (la prima volta da solo: un dito ti mostra cosa toccare) =======================
  const qs = q => document.querySelector(q);
  const TUT = [
    { t: 'Benvenuto, pistolero! 🤠 Prima del duello carichi la pistola in segreto. Tocca <b>3 buchi</b> del tamburo: lì vanno i colpi <b>VERI</b> 🔴.', ph: 'load', at: () => qs('#baLoad .ch[data-i="' + U2.d.findIndex(v => !v) + '"]') || qs('#baLoad .ch'), ok: () => (U2.d || []).filter(Boolean).length === 3 },
    { t: 'Gli altri 3 sono a <b>salve</b> ⚪: fanno BANG ma non uccidono. Si spara in ordine 1, 2, 3… Ora tocca <b>✔ Pronto</b>.', ph: 'load', at: () => qs('#baLoad .ok'), ok: () => U2.rdy },
    { t: 'Schiena contro schiena… tre passi… e poi <b>GIRATI!</b> 👀', ph: 'walk', at: () => null, ok: G => G.st.ph === 'duel' },
    { t: 'Corri dietro un <b>riparo</b>! Trascina il dito sullo schermo per muoverti.', ph: 'duel', at: G => { const c = (G.st.cv || []).filter(v => v[3] > 0).sort((a, b) => Math.hypot(a[1] - cq.x, a[2] - cq.y) - Math.hypot(b[1] - cq.x, b[2] - cq.y))[0]; return c ? { x: c[1] + 0.5, y: c[2] + 0.5 } : null; }, ok: G => { const o = oppOf(G, G.me); return !!coverHit(G, posOf(G, o), cq) || G.time - (G.tutT || 0) > 8; } },
    { t: 'Ora <b>nervi saldi</b> 🤫 La campana suona <b>quando vuole</b>, e prima arrivano rumori finti (nitriti, porte, corvi…). Se spari prima del vero DONG sei <b>disonorato</b>! Aspetta…', ph: 'duel', at: () => qs('#baBell'), ok: G => winOpen(G, G.time) >= 0 },
    { t: 'DONG! 🔔 Il mirino trema sullo Sceriffo e si stringe. Tocca <b>🔫 SPARA</b> quando diventa <b>🎯 rosso</b>: troppo presto sbagli, troppo tardi spara lui!', ph: 'duel', at: () => qs('#baShoot'), ok: G => !!G.tutShot },
    { t: 'In basso c\'è il tuo tamburo: il colpo <b>in canna</b> lo sai solo tu. Se è una salve puoi <b>↻ girare il tamburo</b> per saltarla (resti fermo fino al rintocco). Sopra lo Sceriffo: 🔴 vero, ⚪ salve, ❓ non si sa.', ph: 'duel', at: () => qs('#baMini'), ok: G => G.time - (G.tutT || 0) > 8 }];
  window.bariTutorial = () => {
    if (cq.net) { cqToast('🎓 Il tutorial si fa <b>da soli</b>: esci dal set e riprova.'); return; }
    U2.tut = 1; const go = document.getElementById('lbGo'); if (go) go.click();
  };
  function tutEnd(G) { G.tutS = TUT.length; const el = document.getElementById('baTut'); if (el) el.remove(); store.settings.bariTut = 1; saveStore(); const b = G.chars.find(c => c.bot); if (b) b.hold = 0; }
  function tutTick(G) {
    let el = document.getElementById('baTut');
    if (!G || G.mode !== 'bari' || !G.tut || G.phase !== 'play' || G.tutS == null || G.tutS >= TUT.length || !G.st) { if (el) el.remove(); return; }
    const S = TUT[G.tutS];
    if (!el) { el = document.createElement('div'); el.id = 'baTut'; el.innerHTML = '<div class="bub"><button type="button">Salta ✕</button><small></small><span></span></div><div class="hl"></div><div class="fg">👆</div>'; ROOT().appendChild(el); el.querySelector('button').onclick = () => { const G2 = cq.g; if (G2) tutEnd(G2); }; }
    if (el.dataset.s !== String(G.tutS)) { el.dataset.s = G.tutS; el.querySelector('span').innerHTML = S.t; el.querySelector('small').textContent = '🎓 Tutorial · ' + (G.tutS + 1) + ' di ' + TUT.length; }
    const bub = el.querySelector('.bub'); bub.style.top = S.ph === 'load' ? '8px' : '96px';
    const tg = S.ph === G.st.ph || (S.ph === 'duel' && G.st.ph === 'duel') ? S.at(G) : null, fg = el.querySelector('.fg'), hl = el.querySelector('.hl'), box = ROOT().getBoundingClientRect(); let X = null, Y = null, rw = 0, rh = 0;
    if (tg && tg.getBoundingClientRect) { const b = tg.getBoundingClientRect(); if (b.width) { X = b.left + b.width / 2 - box.left; Y = b.top + b.height / 2 - box.top; rw = b.width; rh = b.height; } }
    else if (tg && G.camv) { const cv = document.getElementById('cqCanvas').getBoundingClientRect(), vz = cq.vz || 1, V = G.camv; X = cv.left - box.left + (V.tx + (tg.x - tg.y) * V.TW / 2) * vz; Y = cv.top - box.top + (V.ty + (tg.x + tg.y) * V.TW / 4) * vz; rw = rh = V.TW * vz * 1.1; }
    fg.style.display = hl.style.display = X == null ? 'none' : '';
    if (X != null) { const up = Y < box.height - 140; fg.textContent = up ? '👆' : '👇'; fg.style.left = X + 'px'; fg.style.top = (up ? Y + rh / 2 - 4 : Y - rh / 2 - 52) + 'px'; hl.style.left = (X - rw / 2 - 5) + 'px'; hl.style.top = (Y - rh / 2 - 5) + 'px'; hl.style.width = (rw + 10) + 'px'; hl.style.height = (rh + 10) + 'px'; hl.style.borderRadius = tg && tg.getBoundingClientRect ? '50%' : '50%'; }
    if (S.ok(G)) { G.tutS++; G.tutT = G.time; SFX.win(); if (G.tutS >= TUT.length) tutEnd(G); }
  }
  cqEachFrame(() => tutTick(cq.g));

  const RULES = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">📖 Come si gioca</summary><p>Uno contro uno nella strada di <b>Polvere Rossa</b>, all\'alba. Vince chi prende per primo <b>3 manche</b>.</p><p><b>1. Il tamburo segreto</b>: prima di ogni manche metti nella pistola <b>3 colpi veri</b> 🔴 e <b>3 a salve</b> ⚪, nell\'ordine che vuoi. Si spara in ordine: 1, 2, 3…</p><p><b>2. Tre passi</b>: schiena contro schiena, tre passi e… <b>GIRATI!</b></p><p><b>3. La campana</b> 🔔: ci si muove liberi, ma si spara <b>solo quando suona</b>, e suona <b>quando vuole</b>. Prima arrivano <b>falsi allarmi</b> (un nitrito, una porta che sbatte, un corvo, una latta): chi spara prima del vero DONG è <b>😳 disonorato</b>: il colpo finisce in aria e al rintocco dopo resta fermo senza poter sparare.</p><p><b>4. Il mirino</b> 🎯: dopo il DONG il mirino trema sull\'altro e piano piano si stringe. Tocca <b>🔫 SPARA</b> quando è <b>rosso</b>: se tocchi troppo presto sbagli, se aspetti troppo spara prima lui. Se l\'altro corre, il mirino trema di più. Dopo ogni sparo resti un attimo <b>fermo nel fumo</b>.</p><p>🔴 <b>Colpo vero</b> che ti prende: manche persa. ⚪ <b>Salve</b> che ti prende: ti vola il cappello e resti fermo fino al rintocco dopo (e lì l\'altro può finirti). 🛢️ Dietro un <b>riparo</b> il colpo prende il riparo: un colpo vero lo crepa (al secondo si rompe), una salve non lascia buchi.</p><p><b>Da lontano veri e salve fanno lo stesso BANG</b>. Sopra la testa di ognuno vedi i colpi che ha già sparato: 🔴 vero, ⚪ salve, ❓ non si sa (mancato), ↻ saltato. In basso vedi il <b>tuo</b> colpo in canna: se è una salve puoi <b>↻ girare il tamburo</b> per saltarla, ma resti fermo fino al prossimo rintocco.</p><p>Da solo sfidi <b>lo Sceriffo</b>: alla fine di ogni manche i tamburi si svelano… e lui si ricorda come carichi il tuo.</p></details>';

  CQ_MODES.bari = {
    n: 'Duello all\'alba dei bari',
    desc: '🤠 Uno contro uno nel Far West: tamburo segreto, campana, colpi veri e a salve.',
    maps: [['bari', 'Polvere Rossa']],
    ns: [[2, '2']],
    def: { map: 'bari', n: 2, fill: true },
    opts: () => { css(); const done = store.settings.bariTut; return '<div style="background:rgba(200,154,90,.15);border:1px solid rgba(200,154,90,.5);border-radius:12px;padding:8px 10px;margin:6px 0"><b>' + (done ? '🎓 Vuoi ripassare?' : '🎓 Prima volta? Impara in un minuto!') + '</b><br><small>Una manche da solo contro lo Sceriffo, con un dito che ti mostra cosa toccare.</small><br><button type="button" onclick="bariTutorial()" style="margin-top:6px;border:0;border-radius:10px;padding:7px 14px;font-weight:800;background:#c8783a;color:#fff">🎓 Tutorial</button></div>' + RULES; },
    read: () => ({}),
    start(G) {
      G.opp = G.chars.find(c => c !== G.me) || null;
      G.tut = !!U2.tut; U2.tut = null; G.soft = [];
      G.chars.forEach((c, i) => { c.x = X0[i % 2]; c.y = Y0; c.face = i ? 1 : -1; c.path = []; });
      for (const c of G.chars) if (c.bot && !c.remote) { c.name = 'Lo Sceriffo'; c.sheriff = 1; if (G.tut) c.hold = 1; }
      Object.assign(U2, { ph: '', shSeen: 0, bell: -1, fx: [], d: null, myD: null, rdy: false, acted: -1, slow: null, facing: 0, faS: new Set(), omv: 0, ox: null });
      G.dt = 0; G.adv = 0; newRound(G, 1, {}); G.drum0 = {};
      if (G.tut) { G.tutS = 0; G.tutT = 0; G.st.say = null; }
    },
    gstart(G) { G.opp = G.chars.find(c => c !== G.me) || null; G.st = null; Object.assign(U2, { ph: '', shSeen: 0, bell: -1, fx: [], d: null, myD: null, rdy: false, acted: -1, slow: null, facing: 0, tPrev: null, faS: new Set(), omv: 0, ox: null }); },
    intro: () => '🤠 Polvere Rossa, all\'alba…',
    voice: () => 1,
    speed: c => { const G = cq.g; return G && G.st && c === G.me && frozen(G, G.me) ? 0 : 1; },
    blk: (G, x, y) => blkAt(G, x, y),
    extras(G) {
      const L = [{ x: 13, y: 3.95, L: null, w: 0, f: 1, name: null, all: true, dr: bellDraw }];
      if (G.st && G.st.cv) G.st.cv.forEach((cv, i) => { const k = cv[0] + cv[1] + ',' + cv[2]; G.__cd = G.__cd || {}; let d = G.__cd[k]; if (!d) { d = G.__cd[k] = (g, X, Y, TW) => { const c = (cq.g.st.cv || []).find(v => v[1] === cv[1] && v[2] === cv[2]); if (c) coverDraw(g, X, Y, TW, c); }; d.box = [1.3, 1.6, 0.8]; d.top = 1.2; } L.push({ x: cv[1] + 0.5, y: cv[2] + 0.5, L: null, w: 0, f: 1, name: null, all: true, dr: d }); });
      if (G.st && G.st.p) for (const c of G.chars) { const p = G.st.p[c.id]; if (p && p.h && p.hx != null && !U2.fx.some(f => f.k === 'hat' && f.id === c.id && now() - f.t < 0.7)) { const s = sideIdx(G, c), sh = !!c.sheriff || (G.guest && c.name === 'Lo Sceriffo' && c.bot); const d = (g, X, Y, TW) => { const u = TW / 34; g.save(); g.translate(X, Y); g.scale(u, u * 0.8); hatShape(g, 0, 0, SIDE[s], sh); g.restore(); }; d.box = [0.8, 0.6, 0.3]; L.push({ x: p.hx, y: p.hy, L: null, w: 0, f: 1, name: null, all: true, dr: d }); } }
      return L;
    },
    hud(G) {
      const st = G.st; if (!st) return '🤠'; const sc = st.sc || {}, o = G.opp;
      const T = lt(G), left = st.ph === 'load' ? (st.n > 1 ? LOAD2 : LOAD) - (T - st.t0) : 0;
      return `🤠 Manche ${st.n} · 🏆 ${sc[G.me.id] || 0}-${o ? sc[o.id] || 0 : 0}${o ? ' ' + esc(o.name) : ''}${st.ph === 'load' ? ' · 🔫 ' + Math.max(0, Math.ceil(left)) + ' s' : ''}`;
    },
    big(G) {
      const st = G.st; if (!st) return '⏳ Un attimo…'; const T = lt(G);
      if (st.ph === 'walk') { const t = T - st.t0; return t < 0.55 ? 'Schiena contro schiena…' : t < 1.35 ? 'UNO…' : t < 2.15 ? 'DUE…' : t < 2.9 ? 'TRE…' : '👀 GIRATI!'; }
      if (st.ph === 'duel') { if (T - st.t0 < 1.0) return '👀 GIRATI!'; if (PS(G, G.me).d) return ''; const p = PS(G, G.me); if (p.nf === st.bk && T < st.bt + WIN) return '😳 Disonorato! Fermo fino al prossimo rintocco'; if (stunned(G, G.me, T)) return fired(G, G.me) && (p.f || []).slice(-1)[0] === 'g' && !p.h ? '↻ Giri il tamburo… fermo fino al rintocco' : '🎩 Il cappello! Sei fermo fino al rintocco…'; if (smoking(G, G.me, T)) return '💨 Fumo: fermo un attimo…'; if (st.bk === 0 && T < st.bt) return 'Al riparo! Aspetta la campana…'; return ''; }
      if (st.ph === 'dead') { const v = G.chars.find(c => c.id === st.kill); return v === G.me ? '💀 Ti hanno preso!' : '🎯 ' + (v ? v.name : '') + ' è a terra!'; }
      if (st.ph === 'mres') return st.msg + (st.fin ? '' : '\nProssima manche tra ' + Math.max(1, Math.ceil(MRES - (T - st.t0))) + '…');
      return '';
    },
    btn(G) {
      if (!G.st || G.st.ph !== 'duel') return null; const p = PS(G, G.me); if (p.d) return null;
      const T = lt(G); if (fired(G, G.me) >= 5 || stunned(G, G.me, T) || winOpen(G, T) >= 0) return null;
      const d = U2.myD || [], n = fired(G, G.me); return { t: '↻ Gira il tamburo', on: !d[n] && d.slice(n + 1).some(Boolean) };   // acceso quando hai una salve in canna
    },
    act(G) { mySpin(G); },
    view(G) {   // nei tre passi la telecamera sta in mezzo ai due; quando uno cade si avvicina
      const V = G.vw || (G.vw = { z: 0.92, x: 0, y: 0 }), st = G.st; let tx = 0, ty = 0, tz = 0.92, k = 0.08;
      if (st && (st.ph === 'load' || st.ph === 'walk')) { tx = MX - cq.x; ty = Y0 - cq.y; tz = st.ph === 'load' ? 1.15 : 1.0; }
      else if (st && st.ph === 'dead') { const v = G.chars.find(c => c.id === st.kill), P = v && posOf(G, v); if (P) { tx = P.x - cq.x; ty = P.y - cq.y; tz = 1.3; k = 0.05; } }
      else if (st && st.ph === 'duel' && G.opp) { const P = posOf(G, G.opp), d = Math.hypot(P.x - cq.x, P.y - cq.y); tx = (P.x - cq.x) * 0.5; ty = (P.y - cq.y) * 0.5; tz = Math.max(0.62, Math.min(0.95, 1.2 - d * 0.055)); }   // tutti e due nell'inquadratura
      V.x += (tx - V.x) * k; V.y += (ty - V.y) * k; V.z += (tz - V.z) * k; return V;
    },
    tick(G, dt) {
      const st = G.st; G.dt = dt;
      for (const c of G.chars) if (c.bot && !c.remote) { const i = sideIdx(G, c);
        if (st.ph === 'load') { c.x = X0[i]; c.y = Y0; c.face = i ? 1 : -1; c.walk = 0; }
        else if (st.ph === 'walk') { const t = G.time - st.t0, s = Math.max(0, Math.min(3, (t - 0.55) / 0.8)), fr = s - Math.floor(s); c.x = X0[i] + (i ? 1 : -1) * STEP * (Math.floor(s) + Math.min(1, fr / 0.5)); c.y = Y0; c.face = i ? 1 : -1; c.walk = fr < 0.5 && s < 3 ? t * 10 : 0; }
        else if (st.ph === 'duel') botTick(G, c, dt); else { c.walk = 0; c.path = []; } }
      if (st.ph === 'load') {
        const left = (st.n > 1 ? LOAD2 : LOAD) - (G.time - st.t0);
        if (G.tut && G.tutS < 2) { st.t0 = r2(G.time - 1); }   // tutorial: il tempo non scade mentre si impara
        if (G.chars.every(c => st.rd[c.id]) || left < -1.5) {
          for (const c of G.chars) { if (!okDrum(G.drum[c.id])) { G.drum[c.id] = randDrum(); if (c === G.me) U2.d = G.drum[c.id].slice(); } if (c.remote) st.ad[c.id] = [toMask(G.drum[c.id]), ++G.adv]; }
          G.drum0 = {}; for (const c of G.chars) G.drum0[c.id] = G.drum[c.id].slice();
          st.ph = 'walk'; st.t0 = r2(G.time);
        }
        return;
      }
      if (st.ph === 'walk') { if (G.time - st.t0 > WALK) { st.ph = 'duel'; st.t0 = r2(G.time); st.bt = null; st.bk = -1; G.wk = -1; for (const c of G.chars) if (c.bot && !c.remote) c.face = sideIdx(G, c) ? -1 : 1; } return; }
      if (st.ph === 'duel') {
        if (G.tut && st.bt != null && st.bk === 0 && G.time < st.bt) {   // tutorial: la campana aspetta che ti ripari, poi un falso allarme di prova
          if (G.tutS < 4) { st.bt = r2(Math.max(st.bt, G.time + 2)); st.fa = []; } else if (!G.tutFa) { G.tutFa = 1; st.fa = [[r2(G.time + 1.3), 'horse']]; st.bt = r2(G.time + 3.6); }
        }
        hostDuel(G); return;
      }
      if (st.ph === 'dead') { if (G.time - st.t0 > DEAD) { const w = G.chars.find(c => c.id === st.win), v = G.chars.find(c => c.id === st.kill); st.ph = 'duel'; roundEnd(G, w, '🎯 ' + (w ? w.name : '') + ' ha colpito ' + (v ? v.name : '') + ' con un colpo vero'); } return; }
      if (st.ph === 'mres') { if (G.time - st.t0 > MRES) { if (st.fin) finalEnd(G); else newRound(G, st.n + 1, st.sc); } }
    },
    local(G, dt) {
      if (!G.st) return; stage(G); meTick(G, dt); fxEvents(G); bellTick(G); alarmTick(G); if (G.st.ph === 'duel') uiTick(G);
    },
    ev(G, c, o) {
      const st = G.st; if (!st) return;
      if (o.k === 'drum') { const d = fromMask(+o.m || 0); if (okDrum(d) && st.ph === 'load') G.drum[c.id] = d; }
      else if (o.k === 'rdy' && st.ph === 'load') { if (o.on && okDrum(G.drum[c.id])) st.rd[c.id] = 1; else delete st.rd[c.id]; }
      else if (o.k === 'act' && st.ph === 'duel' && G.acts && o.a === 's') { const k = +o.b; if (k === G.wk && !G.acts[c.id] && !G.res[c.id]) G.acts[c.id] = { a: 's', rt: Math.max(0, Math.min(WIN, +o.rt || 0)), h: o.h ? 1 : 0 }; }
      else if (o.k === 'early' && st.ph === 'duel') { if (winOpen(G, G.time) < 0) dishonor(G, c); }
      else if (o.k === 'spin' && st.ph === 'duel') spin(G, c);
    },
    snap: G => ({ st: G.st }),
    apply(G, x) { if (x.st) G.st = x.st; },
    draw(c) {
      const G = cq.g, s = sideOf(G, c), L = cqLookOf(c), key = s + (L.skin || '');
      if (c.__dk !== key) {
        c.__dk = key;
        c.__dr = (g, X, Y, TW, L2, w, f) => {
          const G2 = cq.g, st = G2 && G2.st, p = st && st.p ? st.p[c.id] || {} : {}, me = c === G2.me, P = posOf(G2, c);
          let ff = f; const o = G2 && oppOf(G2, c); if (o && st && (st.ph === 'duel' || st.ph === 'dead' || st.ph === 'mres') && !w) { const Q = posOf(G2, o), v = (Q.x - P.x) - (Q.y - P.y); if (Math.abs(v) > 0.05) ff = v > 0 ? 1 : -1; }
          const shot = U2.fx.filter(e => e.k === 'shot' && e.id === c.id).pop(), ag = shot ? now() - shot.t : 9, mira = me && st && winOpen(G2, lt(G2)) >= 0 && U2.acted !== st.bk && !p.d;
          const aim = ag < 0.6 ? 1 : ag < 0.9 ? 1 - (ag - 0.6) / 0.3 : (me && U2.myAim && now() - U2.myAim < 0.3) || mira ? 1 : 0;
          const opt = { sheriff: !!c.sheriff || c.name === 'Lo Sceriffo' && c.bot, noHat: !!p.h, aim, flash: shot && shot.k === 'shot' && ag < 0.12 ? 1 - ag / 0.12 : 0 };
          if (p.d) {   // a terra: cade all'indietro piano (rallentatore)
            const kf = U2.slow && U2.slow.id === c.id ? Math.min(1, (now() - U2.slow.t) / 0.9) : 1;
            longShadow(g, X, Y, TW, 1.2, 0.18); g.save(); g.translate(X, Y); g.rotate(-ff * 1.45 * kf); g.translate(-X, -Y); cowboy(g, X, Y, TW, L2, 0, ff, s, Object.assign(opt, { aim: 0, noHat: true })); g.restore(); return;
          }
          longShadow(g, X, Y, TW, 2.3, 0.16);
          const sh2 = U2.fx.some(e => e.k === 'hat' && e.id === c.id && now() - e.t < 0.35) ? Math.sin(now() * 70) * 3 : 0;
          cowboy(g, X + sh2, Y, TW, L2, w, ff, s, opt);
        };
        c.__dr.top = cqTop(L) + 0.12;
      }
      return c.__dr;
    },
    deco(g, c, X, Y, TW, G) {
      const st = G.st; if (!st || !st.p) return; const p = st.p[c.id] || {}, T = lt(G), L = cqLookOf(c), H = TW * (cqTop(L) + 0.12), top = Y - H - 14;
      if (p.d) return;
      // i colpi sparati (quello che sanno tutti): 🔴 vero, ⚪ salve, ❓ non si sa; vuoti = ancora nel tamburo
      if (st.ph !== 'load') { const f = p.f || [], r = 4.2, gap = 11, x0 = X - gap * 2.5; g.save();
        g.fillStyle = 'rgba(20,12,8,.6)'; cqRR(g, x0 - 8, top - 8, gap * 5 + 16, 16, 8); g.fill();
        for (let i = 0; i < 6; i++) { const x = x0 + i * gap, v = f[i]; g.beginPath(); g.arc(x, top, r, 0, 7);
          if (v === 'r') { g.fillStyle = '#e8402a'; g.fill(); } else if (v === 'b') { g.fillStyle = '#f4f0e4'; g.fill(); } else if (v === 'u' || v === 'g') { g.fillStyle = v === 'g' ? '#5a6a8a' : '#8a8a90'; g.fill(); g.fillStyle = '#fff'; g.font = '800 8px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v === 'g' ? '↻' : '?', x, top + 0.5); }
          else { g.strokeStyle = 'rgba(255,230,200,.55)'; g.lineWidth = 1.4; g.stroke(); } }
        g.restore(); }
      if (stunned(G, c, T)) { g.save(); g.font = '14px system-ui'; g.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = T * 5 + i * 2.1; g.fillText('⭐', X + Math.cos(a) * TW * 0.35, Y - H * 0.85 + Math.sin(a) * TW * 0.1); } g.restore(); }
      if (p.nf === st.bk && T < st.bt + WIN) { g.save(); g.font = '700 13px system-ui'; g.textAlign = 'center'; g.fillStyle = '#ffb0a0'; g.fillText('😳 disonorato', X, top - 14); g.restore(); }
      if (st.say && st.say.id === c.id && T - st.say.t < 4 && T >= st.say.t) {   // fumetto dello Sceriffo
        const t = st.say.x; g.save(); g.font = '600 12.5px system-ui'; const w = Math.min(230, g.measureText(t).width + 18), bx = X - w / 2, by = top - 44;
        g.fillStyle = 'rgba(255,248,232,.96)'; cqRR(g, bx, by, w, 24, 10); g.fill(); g.beginPath(); g.moveTo(X - 6, by + 24); g.lineTo(X + 2, by + 32); g.lineTo(X + 6, by + 24); g.fill();
        g.fillStyle = '#3a2414'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.length > 38 ? t.slice(0, 36) + '…' : t, X, by + 12.5, w - 10); g.restore();
      }
    },
    over(g, G, sx, sy, TW) {
      const t = performance.now() / 1000, U = TW * 0.575, st = G.st, T = lt(G);
      G.camv = { tx: sx(0, 0), ty: sy(0, 0), TW };
      // rotolacampo: passa ogni tanto lungo la strada (uguale su tutti i telefoni: dipende dal tempo della partita)
      { const per = 17, k = Math.floor(T / per), u = (T - k * per) / 7.5; if (u < 1) { const yy = 5.6 + ((k * 7919) % 100) / 100 * 4.6, xx = -1 + u * 28, z = Math.abs(Math.sin(u * 22)) * 0.45, X = sx(xx, yy), Y = sy(xx, yy) - (z + 0.35) * U, r = TW * 0.32;
        g.save(); g.fillStyle = 'rgba(80,30,60,.2)'; g.beginPath(); g.ellipse(sx(xx, yy), sy(xx, yy), r, r * 0.4, 0, 0, 7); g.fill(); g.translate(X, Y); g.rotate(u * 40); g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(1, TW / 40);
        for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(0, 0, r * (0.5 + (i % 3) * 0.22), r * (0.35 + (i % 2) * 0.3), i * 0.7, 0, 5.5); g.stroke(); } g.restore(); } }
      // polvere nel sole
      for (let i = 0; i < 14; i++) { const ph = (t * 0.05 + i / 14) % 1, x = 2 + (i * 1.73 % 22), y = 5 + (i * 0.61 % 6); g.globalAlpha = Math.sin(ph * Math.PI) * 0.55; g.fillStyle = '#ffe2b0'; g.beginPath(); g.arc(sx(x, y) + Math.sin(t * 0.7 + i) * 8, sy(x, y) - (0.4 + ph * 2.2) * U, Math.max(1, TW / 45), 0, 7); g.fill(); }
      g.globalAlpha = 1;
      // spari, fumo, schegge, cappelli che volano, scritte
      for (const f of U2.fx) {
        const a = t - f.t; if (a < 0) continue;
        if (f.k === 'shot') { const c = G.chars.find(o => o.id === f.id); if (!c) continue; const P = posOf(G, c); for (let i = 0; i < 4; i++) { const q = a + i * 0.08, r = TW * (0.12 + q * 0.35); g.globalAlpha = Math.max(0, 0.55 - q * 0.38); g.fillStyle = '#e8e0d8'; g.beginPath(); g.arc(sx(P.x, P.y) + i * 5 - 8, sy(P.x, P.y) - (1.0 + q * 0.6) * U, r, 0, 7); g.fill(); } g.globalAlpha = 1; }
        if (f.k === 'spl' && a < 0.8) for (let i = 0; i < 8; i++) { const an = i * 0.8, d = a * 2.2, X = sx(f.x, f.y) + Math.cos(an) * d * TW * 0.5, Y = sy(f.x, f.y) - (0.6 + d * 0.6 - d * d * 1.4) * U; g.fillStyle = i % 2 ? '#8a5a30' : '#c8945a'; g.save(); g.translate(X, Y); g.rotate(an + a * 9); g.fillRect(-3, -1, 6, 2.4); g.restore(); }
        if (f.k === 'hat' && a < 0.75) { const c = G.chars.find(o => o.id === f.id); if (!c) continue; const P = posOf(G, c), p = st && st.p && st.p[c.id], hx = p && p.hx != null ? p.hx : P.x + 1, hy = p && p.hy != null ? p.hy : P.y, u = a / 0.75, x = P.x + (hx - P.x) * u, y = P.y + (hy - P.y) * u, z = 2.0 + 1.6 * Math.sin(u * Math.PI) - 2.0 * u;
          g.save(); g.translate(sx(x, y), sy(x, y) - z * U); g.rotate(u * 9); const s2 = TW / 34; g.scale(s2, s2); hatShape(g, 0, 0, SIDE[sideIdx(G, c)], !!c.sheriff || c.name === 'Lo Sceriffo' && c.bot); g.restore(); }
        if (f.k === 'dust' && a < 0.7) { for (let i = 0; i < 5; i++) { const an = i * 1.25, d = a * 1.4; g.globalAlpha = 0.6 * (1 - a / 0.7); g.fillStyle = '#c89a6a'; g.beginPath(); g.arc(sx(f.x + Math.cos(an) * d * 0.3, f.y + Math.sin(an) * d * 0.3), sy(f.x, f.y) - (0.1 + d * 0.4) * U, TW * (0.08 + a * 0.2), 0, 7); g.fill(); } g.globalAlpha = 1; }
        if (f.k === 'alarm' && a < 1.4) {   // falso allarme: la scritta trema dove nasce il rumore (il corvo passa in cielo)
          const A = ALARM[f.ty]; let x, y, z = 2.6;
          if (A[0] == null) { const u = a / 1.4, cx = MX + (cq.x - MX) * 0.3; x = cx - 9 + u * 18; y = 2.5 - u * 2; z = 4.2 + Math.sin(u * 6) * 0.3; const X = sx(x, y), Y = sy(x, y) - z * U, fl = Math.sin(a * 22) * 0.7; g.strokeStyle = '#1a1018'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.moveTo(X - TW * 0.35, Y - TW * 0.12 * fl); g.quadraticCurveTo(X - TW * 0.12, Y - TW * 0.12, X, Y); g.quadraticCurveTo(X + TW * 0.12, Y - TW * 0.12, X + TW * 0.35, Y - TW * 0.12 * fl); g.stroke(); z += 0.6; }
          else { x = A[0]; y = A[1]; }
          g.save(); g.globalAlpha = Math.min(1, (1.4 - a) * 2.5); g.font = '900 ' + Math.round(Math.max(15, TW * 0.32)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(30,12,6,.9)';
          const X = sx(x, y) + Math.sin(a * 60) * 3 * (1 - a / 1.4), Y = sy(x, y) - (z + a * 0.4) * U; g.strokeText(A[2], X, Y); g.fillStyle = '#ffe9b8'; g.fillText(A[2], X, Y); g.restore();
        }
        if (f.k === 'txt' && a < 1.6) { g.save(); g.globalAlpha = Math.min(1, (1.6 - a) * 2); g.font = '800 ' + Math.round(Math.max(13, TW * 0.26)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(30,12,6,.85)'; const X = sx(f.x, f.y), Y = sy(f.x, f.y) - (2.4 + a * 0.6) * U; g.strokeText(f.s, X, Y); g.fillStyle = f.c; g.fillText(f.s, X, Y); g.restore(); }
      }
      // IL MIRINO (solo il mio): dopo il DONG trema sull'avversario e si stringe; rosso = se tocchi adesso lo prendi
      if (st && st.ph === 'duel' && G.opp) { const k = winOpen(G, T); if (k >= 0 && U2.acted !== k && canFire(G, G.me, k, T) && fired(G, G.me) < 6 && !PS(G, G.opp).d) {
        const a = T - st.bt, mv = (U2.omv || 0) > RUN_V, [dx, dy] = wob(st.n, k, G.me.id, a, mv), on = Math.hypot(dx, dy) < BODY, P = posOf(G, G.opp), z = 0.75;
        const A = AIM0 * Math.max(0.08, 1 - a / AIM_T) * (mv ? 1.5 : 1) + BODY, CX = sx(P.x, P.y), CY = sy(P.x, P.y) - z * U;
        g.save(); g.strokeStyle = 'rgba(255,240,200,.35)'; g.lineWidth = 1.5; g.setLineDash([4, 5]); g.beginPath(); g.ellipse(CX, CY, A * TW * 0.7, A * TW * 0.42, 0, 0, 7); g.stroke(); g.setLineDash([]);
        const X = sx(P.x + dx, P.y + dy), Y = sy(P.x + dx, P.y + dy) - z * U, r = TW * 0.26, col = on ? '#ff3a2a' : '#ffffff';
        g.lineWidth = on ? 3.5 : 2.5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(X, Y, r + 1.5, 0, 7); g.stroke(); g.strokeStyle = col; g.beginPath(); g.arc(X, Y, r, 0, 7); g.stroke();
        g.beginPath(); for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(X + u * r * 0.45, Y + v * r * 0.45); g.lineTo(X + u * r * 1.45, Y + v * r * 1.45); } g.stroke();
        if (on) { g.fillStyle = col; g.beginPath(); g.arc(X, Y, 3, 0, 7); g.fill(); }
        g.restore();
      } }
      // rallentatore: bordi scuri quando qualcuno cade
      if (U2.slow && t - U2.slow.t < 2.2) { const k = Math.min(1, (t - U2.slow.t) * 3) * Math.min(1, (2.2 - (t - U2.slow.t)) * 2), W2 = cq.w, H2 = cq.h; g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7); gr.addColorStop(0, 'rgba(40,10,10,0)'); gr.addColorStop(1, 'rgba(40,10,10,' + 0.6 * k + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); g.restore(); }
      // campana: lampo dorato sullo schermo al DONG
      if (st && st.ph === 'duel' && winOpen(G, lt(G)) >= 0) { const a = lt(G) - tb(G, bellK(G, lt(G))); if (a < 0.25) { g.save(); g.setTransform(cq.dpr, 0, 0, cq.dpr, 0, 0); g.fillStyle = 'rgba(255,210,120,' + (0.18 * (1 - a / 0.25)) + ')'; g.fillRect(0, 0, cq.w, cq.h); g.restore(); } }
    }
  };
  const sideOf = (G, c) => G && G.chars.indexOf(c) === 1 ? 1 : 0;
  // tocco sull'avversario = spara (solo quando suona la campana)
  { let tp = null; const root = document.getElementById('ciack');
    if (root && !root.__baTap) { root.__baTap = 1;
      root.addEventListener('pointerdown', e => { const G = cq.g; tp = G && G.mode === 'bari' && e.target && e.target.id === 'cqCanvas' ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null; }, true);
      root.addEventListener('pointerup', e => {
        const T0 = tp; tp = null; const G = cq.g; if (!T0 || T0.id !== e.pointerId || !G || G.mode !== 'bari' || !G.st || G.st.ph !== 'duel' || !G.camv || !G.opp) return;
        if (performance.now() - T0.t > 320 || Math.hypot(e.clientX - T0.x, e.clientY - T0.y) > 12) return;
        const cv = document.getElementById('cqCanvas'), rc = cv.getBoundingClientRect(), vz = cq.vz || 1, V = G.camv, lx = (e.clientX - rc.left) / vz, ly = (e.clientY - rc.top) / vz;
        const a = 2 * (lx - V.tx) / V.TW, b = 4 * (ly - V.ty) / V.TW, x = (a + b) / 2, y = (b - a) / 2, P = posOf(G, G.opp);
        if (Math.hypot(x - P.x, y - P.y) < 1.3 || Math.hypot(x - P.x + 0.8, y - P.y + 0.8) < 1.1) myAct(G, true);   // anche toccando il corpo (sopra i piedi)
      }, true);
    } }
  // esce dalla partita: via i pannelli e i pulsanti
  cqEachFrame(() => { const G = cq.g; if ((!G || G.mode !== 'bari' || G.phase !== 'play') && (document.getElementById('baLoad') || document.getElementById('baShoot') || document.getElementById('baRes'))) { loadClose(); resClose(); duelUI(G || {}, false); U2.ph = ''; } });
  window.__bari = { U2, BLD, FIXED, genCovers, coverHit, dangerOf, shMem, shRead, botAct, newRound, resolve, hostDuel, spin, dishonor, schedBell, wob, onTarget, mapBari, fromMask, toMask, okDrum, randDrum, cowboy, X0, Y0, WIN, AIM_T, MAXB, tb, bellK, winOpen, PS, fired, stunned, myAct, mySpin, setReady, lt, SFX };
})();
