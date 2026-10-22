// La casa delle trappole (gioco 1 contro 1, vedi CLAUDE.md "PROSSIMA SESSIONE: Minigioco La casa delle trappole").
// La VILLA disegnata con gli attrezzi del motore (blocchetti, come tutti gli altri minigiochi: scelta dell'utente del 22-10-2026,
// prima era in pixel art). Preparazione girando per la villa, villa del computer, furto. Giorno o notte (con la torcia) dalle impostazioni.
(() => {
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const TIME = 90, NEAR = 1.35;

  // ---- PIANTA: 9 stanze a griglia 3x3 (piu' il corridoio di servizio), muri di una casella tra le stanze ----
  // colonne x: 1-9 | 11-22 | 24-32 ; righe y: 1-8 | 10-19 | 21-28 ; muri esterni a x 0, 33 e y 0, 29
  // vk = tipo di stanza (pianta mini), k = pavimento del motore (wood/tile/carpet/stone), c = i due colori a scacchi, wc = colore dei muri
  const W = 34, H = 30;
  const R = (n, x, y, w, h, vk, k, c0, c1, wc) => ({ n, x, y, w, h, vk, k, c: [c0, c1], wc, nl: 1 });
  const ROOMS = [
    R('Biblioteca', 1, 1, 9, 8, 'biblio', 'carpet', '#7a2e30', '#742a2c', '#5a3a2a'),
    R('Studio', 11, 1, 12, 8, 'noce', 'wood', '#6a4a32', '#634530', '#3a4a6a'),
    R('Camera da letto', 24, 1, 9, 8, 'legno', 'wood', '#9a6a44', '#93653f', '#7a6a9a'),
    R('Serra', 1, 10, 9, 10, 'serra', 'stone', '#b4ad9a', '#aca591', '#6a8a6a'),
    R('Salone', 11, 10, 12, 10, 'parquet', 'wood', '#b9824a', '#b07a44', '#7a3a46'),
    R('Bagno', 24, 10, 9, 10, 'scacchi', 'tile', '#e8e8e4', '#3a3a44', '#7aa8bc'),
    R('Cantina', 1, 21, 6, 8, 'pietra', 'stone', '#6e6964', '#68635e', '#7a4a3a'),
    R('Corridoio', 8, 21, 2, 8, 'corr', 'wood', '#8a5a3a', '#84553a', '#a8946a'),
    R('Ingresso', 11, 21, 12, 8, 'marmo', 'tile', '#e2d8c2', '#4a6a5c', '#3e6a5a'),
    R('Cucina', 24, 21, 9, 8, 'cotto', 'tile', '#c0603a', '#b85a36', '#c8b88a')];
  // porte: caselle di pavimento nei muri
  const DOORS = [
    [15, 20, 3, 1, 'Salone', 'Ingresso'], [23, 24, 1, 2, 'Ingresso', 'Cucina'], [10, 25, 1, 2, 'Corridoio', 'Ingresso'], [8, 20, 2, 1, 'Serra', 'Corridoio'],
    [3, 20, 2, 1, 'Serra', 'Cantina'], [4, 9, 2, 1, 'Biblioteca', 'Serra'], [10, 14, 1, 2, 'Serra', 'Salone'], [19, 9, 2, 1, 'Studio', 'Salone'],
    [23, 14, 1, 2, 'Salone', 'Bagno'], [28, 9, 2, 1, 'Camera da letto', 'Bagno'], [28, 20, 2, 1, 'Bagno', 'Cucina'], [23, 4, 1, 2, 'Studio', 'Camera da letto'],
    [10, 4, 1, 1, 'Biblioteca', 'Studio', 'secret'], [16, 29, 2, 1, 'Ingresso', '', 'porch']];
  const PORCH = { x0: 16, x1: 18, y: 29 };   // il portone (si esce di qui con il diamante)

  // ---- MOBILI: [tipo, x, y, opzioni]; h = nascondiglio (1 = piccolo, 1 s per aprirlo; 2 = grande, 2 s), n = nome ----
  // f: verso dove guarda il davanti ('y' = verso chi guarda a sinistra, 'x' = a destra); part = seconda casella di un mobile lungo
  const FURN = [
    // Biblioteca: libreria lungo il muro in fondo e quello di sinistra, mappamondo, angolo lettura
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(x => ['shelf', x, 1, x === 3 || x === 7 ? { f: 'y', h: 1, n: 'Libri finti' } : { f: 'y' }]),
    ...[3, 4, 5, 6, 7].map(y => ['shelf', 1, y, y === 5 ? { f: 'x', h: 1, n: 'Libri finti' } : { f: 'x' }]),
    ['globe', 7, 4, { h: 1, n: 'Mappamondo' }], ['armchair', 4, 6, { d: 'e', c: '#7a2a2a' }], ['rlamp', 3, 7], ['sidetable', 5, 7, { h: 1, n: 'Cassetto del tavolino' }],
    ['rdesk', 7, 7, { h: 1, n: 'Cassetto della scrivania' }],
    // Studio: cassaforte, scrivania lunga, schedario, libreria
    ['shelf', 12, 1, { f: 'y' }], ['shelf', 13, 1, { f: 'y' }], ['filecab', 15, 1, { f: 'y', h: 2, n: 'Schedario' }], ['lamp', 19, 1],
    ['safe', 21, 1, { h: 2, n: 'Cassaforte' }], ['chair', 17, 3, { d: 's' }], ['desk', 16, 4, { part: 1 }], ['desk', 17, 4, { h: 1, n: 'Cassetti della scrivania' }],
    ['armchair', 12, 6, { d: 'e', c: '#2e4a6a' }], ['plant', 11, 8], ['plant', 22, 8],
    // Camera da letto: letto matrimoniale (2x2), comodini, armadio, baule, comò
    ['bed', 27, 1, { part: 1 }], ['bed', 28, 1, { part: 1 }], ['bed', 27, 2, { part: 1 }], ['bed', 28, 2, { h: 2, n: 'Sotto il letto' }],
    ['nightstand', 26, 1, { h: 1, n: 'Comodino' }], ['nightstand', 29, 1, { h: 1, n: 'Comodino' }], ['wardrobe', 31, 1, { f: 'y', h: 2, n: 'Armadio' }],
    ['trunk', 27, 3, { h: 2, n: 'Baule' }], ['dresser', 24, 7, { f: 'x', h: 1, n: 'Comò' }], ['armchair', 31, 6, { d: 'w', c: '#5a4a7a' }], ['plant', 32, 8],
    // Serra: palme, vasi grandi, aiuole, sacchi di terra, panchina
    ['palm', 1, 10], ['bigpot', 7, 10, { h: 2, n: 'Vaso grande' }], ['bigpot', 6, 19, { h: 2, n: 'Vaso grande' }], ['bigpot', 9, 17, { h: 2, n: 'Vaso grande' }],
    ['sack', 1, 17, { h: 1, n: 'Sacco di terra' }], ['sack', 1, 16], ['palm', 1, 19],
    ...[4, 5, 6].map(x => ['planter', x, 13]), ...[4, 5, 6].map(x => ['planter', x, 16]), ['gbench', 9, 11],
    // Salone: credenza, armature, divani, tavolino, poltrone, pianoforte a coda, vaso
    ['armor', 13, 10], ['sideboard', 14, 10, { h: 2, n: 'Credenza' }], ['sideboard', 15, 10, { h: 2, n: 'Credenza' }], ['armor', 16, 10], ['lamp', 22, 10],
    ['sofa', 15, 13, { d: 's' }], ['sofa', 16, 13, { d: 's' }], ['sofa', 17, 13, { d: 's' }], ['coffee', 16, 15],
    ['armchair', 14, 15, { d: 'e', c: '#86263a' }], ['armchair', 18, 15, { d: 'w', c: '#86263a' }], ['lamp', 20, 13],
    ['piano', 12, 18, { part: 1 }], ['piano', 13, 18, {}], ['vase', 21, 18, { h: 1, n: 'Vaso' }], ['plant', 11, 19], ['plant', 22, 19],
    // Bagno: vasca, water, lavandino, lavatrice, armadietto, cesto
    ['toilet', 25, 10], ['sink', 26, 10], ['washer', 30, 10, { h: 2, n: 'Lavatrice' }], ['tub', 32, 10, { part: 1 }], ['tub', 32, 11, {}],
    ['bathcab', 24, 12, { f: 'x', h: 1, n: 'Armadietto' }], ['basket', 24, 18, { h: 1, n: 'Cesto dei panni' }], ['plant', 32, 19],
    // Cucina: banconi, lavello, forno, frigo, credenza, tavolo con le sedie, il cane che dorme
    ['kcounter', 24, 21, { h: 1, n: 'Cassetti' }], ['ksink', 25, 21], ['kcounter', 26, 21], ['stove', 27, 21, { h: 2, n: 'Forno' }],
    ['fridge', 30, 21, { h: 2, n: 'Frigo' }], ['kcounter', 31, 21, { h: 1, n: 'Cassetti' }], ['cupboard', 32, 21, { h: 2, n: 'Credenza' }],
    ['kchair', 27, 25, { d: 'e' }], ['ktable', 28, 25, { part: 1 }], ['ktable', 29, 25, {}], ['kchair', 30, 25, { d: 'w' }],
    // Ingresso: tavolino con il cassetto, pendolo, cassapanca, appendiabiti, portaombrelli, armatura
    ['console', 12, 21, { h: 1, n: 'Cassetto del tavolino' }], ['armor', 11, 23], ['vase', 20, 21, { h: 1, n: 'Vaso' }], ['lamp', 21, 21], ['clock', 22, 21, { h: 2, n: 'Pendolo' }],
    ['bench', 22, 27, { h: 2, n: 'Cassapanca' }], ['coatrack', 14, 28], ['umbrella', 19, 28, { h: 1, n: 'Portaombrelli' }], ['plant', 11, 28],
    // Corridoio di servizio
    ['armor', 8, 24], ['sidetable', 8, 28, { h: 1, n: 'Cassetto del mobiletto' }],
    // Cantina: botti, scaffale delle bottiglie, casse, barattoli, baule vecchio
    ['barrel', 1, 22, { h: 2, n: 'Botte' }], ['barrel', 1, 23], ['barrel', 2, 22, { h: 2, n: 'Botte' }],
    ['winerack', 1, 26, { f: 'x' }], ['winerack', 1, 27, { f: 'x' }], ['winerack', 1, 28, { f: 'x' }],
    ['jarshelf', 5, 21, { f: 'y', h: 1, n: 'Barattoli' }], ['crate', 6, 21], ['crate', 6, 22, { h: 1, n: 'Cassa' }], ['crate', 6, 23], ['oldtrunk', 4, 27, { h: 2, n: 'Baule vecchio' }]];

  let NIGHT = 0;
  // stanza (o porta) di una casella
  const roomAt = (x, y) => { const i = cqRoomOf[y] && cqRoomOf[y][x]; return i >= 0 ? CQ_ROOMS[i] : null; };
  const isWall = (x, y) => !!(cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].wall);
  const propAt = (x, y) => { const o = cqSolid[y] && cqSolid[y][x]; return o && o.prop ? o.prop : null; };

  // ---- DISEGNO con gli attrezzi del motore (K di cqTools: bx scatola, qL faccia davanti, cyl, dot, line, glow, S punto 3D) ----
  const BOOKS = ['#a83a3a', '#3a5a9a', '#4a8a4a', '#c8a040', '#6a3a7a', '#3a7a7a', '#e8dcc0'];
  // faccia verticale sul piano x (verso destra), come qL ma di lato
  const qR = (K, x, y0, y1, z0, z1, col) => K.poly([K.S(x, y0, z1), K.S(x, y1, z1), K.S(x, y1, z0), K.S(x, y0, z0)], col);
  // davanti di un mobile: f 'y' = faccia verso sinistra (piano y = Y), 'x' = verso destra (piano x = X); u lungo il davanti 0..1
  const frontF = (K, fy, X0, Y0, X1, Y1) => (u0, u1, z0, z1, col) => fy ? K.qL(X0 + u0 * (X1 - X0), X0 + u1 * (X1 - X0), Y1, z0, z1, col) : qR(K, X1, Y0 + u0 * (Y1 - Y0), Y0 + u1 * (Y1 - Y0), z0, z1, K.shade(col, 0.75));
  // mobile a cassetti (dr) o ad ante (dw) con lo zoccolo, le righe e i pomelli
  function cabinet(K, x, y, fy, b, h, col, kind, n, top) {
    const [a0, b0, a1, b1] = b, X0 = x + a0, Y0 = y + b0, X1 = x + a1, Y1 = y + b1, F = frontF(K, fy, X0, Y0, X1, Y1);
    K.bx(X0, Y0, X1, Y1, 0, h, col); K.bx(X0 - 0.02, Y0 - 0.02, X1 + 0.02, Y1 + 0.02, h, h + 0.06, top || K.shade(col, 1.15));
    F(0, 1, 0, 0.08, K.shade(col, 0.5));
    if (kind === 'dr') for (let i = 0; i < n; i++) { const z0 = 0.1 + (h - 0.12) * i / n, z1 = 0.1 + (h - 0.12) * (i + 1) / n; F(0.06, 0.94, z1 - 0.03, z1, K.shade(col, 0.55)); F(0.44, 0.56, (z0 + z1) / 2 - 0.03, (z0 + z1) / 2 + 0.03, '#d8b050'); }
    else { F(0.49, 0.51, 0.1, h - 0.04, K.shade(col, 0.5)); F(0.4, 0.46, h * 0.55, h * 0.55 + 0.08, '#d8b050'); F(0.54, 0.6, h * 0.55, h * 0.55 + 0.08, '#d8b050'); }
  }
  // libri su un ripiano (davanti di una libreria)
  function books(K, F, z0, z1, rows, seed) {
    for (let r = 0; r < rows; r++) {
      const zb = z0 + (z1 - z0) * r / rows + 0.06, zt = z0 + (z1 - z0) * (r + 1) / rows - 0.04;
      F(0.04, 0.96, zb - 0.06, zb, '#4a2e1a');
      let u = 0.06; for (let i = 0; u < 0.94; i++) { const w = 0.07 + 0.05 * K.hsh(seed, r, i), hh = 0.55 + 0.4 * K.hsh(seed, i, r + 3); F(u, Math.min(0.94, u + w), zb, zb + (zt - zb) * hh, BOOKS[Math.floor(K.hsh(seed + i, r, 9) * BOOKS.length)]); u += w + 0.01; }
    }
  }
  let inner = 0;   // mentre si chiede al motore un suo oggetto (K.prop), il gancio dei disegni non interviene
  const eng = (K, t, x, y, o) => { inner = 1; try { K.prop(t, x, y, o); } finally { inner = 0; } };
  function drawFurn(K, t, x, y, o) {
    if (inner) return false;
    o = o || {}; if (o.part) return true;   // seconda casella di un mobile lungo: lo disegna l'altra
    const { bx, cyl, qL, dot, glow, S, line, shade } = K, fy = o.f !== 'x', TW = K.TW;
    switch (t) {
      case 'shelf': {   // libreria piena di libri
        if (fy) { bx(x + 0.02, y + 0.5, x + 0.98, y + 0.95, 0, 2.3, '#6b4a2e'); books(K, frontF(K, true, x + 0.02, y + 0.5, x + 0.98, y + 0.95), 0.1, 2.25, 4, x * 7 + y); }
        else { bx(x + 0.05, y + 0.02, x + 0.5, y + 0.98, 0, 2.3, '#6b4a2e'); books(K, frontF(K, false, x + 0.05, y + 0.02, x + 0.5, y + 0.98), 0.1, 2.25, 4, x * 7 + y); }
        return true;
      }
      case 'globe':   // mappamondo sul treppiede
        bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0, 0.75, '#5a3a24'); cyl(x + 0.5, y + 0.5, 0.25, 0, 0.06, '#5a3a24');
        dot(x + 0.5, y + 0.5, 1.15, 0.2, '#3a6aa8'); dot(x + 0.45, y + 0.48, 1.2, 0.09, '#5aa058'); dot(x + 0.58, y + 0.56, 1.05, 0.06, '#c8a860'); line(S(x + 0.5, y + 0.5, 0.75), S(x + 0.5, y + 0.5, 1.6), '#c8a050', Math.max(1.5, TW / 30)); return true;
      case 'armchair': {   // poltrona: seduta, schienale dal lato opposto a dove guarda, braccioli
        const c = o.c || '#7a2a2a', d = o.d || 's', back = { s: [0.12, 0.1, 0.88, 0.3], n: [0.12, 0.7, 0.88, 0.9], e: [0.1, 0.12, 0.3, 0.88], w: [0.7, 0.12, 0.9, 0.88] }[d];
        const side = d === 's' || d === 'n', A1 = side ? [0.1, 0.2, 0.26, 0.88] : [0.2, 0.1, 0.88, 0.26], A2 = side ? [0.74, 0.2, 0.9, 0.88] : [0.2, 0.74, 0.88, 0.9];
        const parts = [[back, 0.1, 1.3], [A1, 0.1, 0.72], [A2, 0.1, 0.72], [[0.2, 0.2, 0.8, 0.8], 0.1, 0.48]].sort((p, q) => (p[0][0] + p[0][1] + p[0][2] + p[0][3]) - (q[0][0] + q[0][1] + q[0][2] + q[0][3]));
        bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.1, '#3a2418');
        for (const [b, z0, z1] of parts) bx(x + b[0], y + b[1], x + b[2], y + b[3], z0, z1, z1 > 1 ? shade(c, 0.92) : c);
        return true;
      }
      case 'chair': case 'kchair': eng(K, 'dchair', x, y, ['#8a5a32', { s: 'n', n: 's', e: 'w', w: 'e' }[o.d || 's']]); return true;
      case 'lamp': case 'rlamp': {   // lampada a stelo con il paralume acceso
        const cz = t === 'rlamp' ? 1.5 : 1.8;
        cyl(x + 0.5, y + 0.5, 0.18, 0, 0.06, '#8a6a2c'); bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0.06, cz, '#c8a050');
        cyl(x + 0.5, y + 0.5, 0.27, cz, cz + 0.45, t === 'rlamp' ? '#3a8a52' : '#f4dca0'); glow(x + 0.5, y + 0.5, cz + 0.2, 1.6, 'rgba(255,214,140,.32)'); return true;
      }
      case 'sidetable': {   // tavolino con il cassetto e il vaso di fiori
        legs4(K, x, y, 0.22, 0.22, 0.78, 0.78, 0.5, '#4a2e1a'); bx(x + 0.18, y + 0.18, x + 0.82, y + 0.82, 0.5, 0.72, '#874c2e'); bx(x + 0.16, y + 0.16, x + 0.84, y + 0.84, 0.72, 0.78, '#a5643c');
        frontF(K, fy, x + 0.18, y + 0.18, x + 0.82, y + 0.82)(0.42, 0.58, 0.58, 0.65, '#d8b050');
        cyl(x + 0.5, y + 0.5, 0.08, 0.78, 1.02, '#dfe6f2'); dot(x + 0.46, y + 0.48, 1.12, 0.05, '#e8c040'); dot(x + 0.56, y + 0.52, 1.1, 0.05, '#f2f2f2'); return true;
      }
      case 'nightstand': cabinet(K, x, y, true, [0.18, 0.4, 0.82, 0.9], 0.66, '#874c2e', 'dr', 2); cyl(x + 0.5, y + 0.62, 0.06, 0.72, 0.98, '#c8a050'); cyl(x + 0.5, y + 0.62, 0.16, 0.98, 1.22, '#f4dca0'); glow(x + 0.5, y + 0.65, 1.1, 1.0, 'rgba(255,214,140,.3)'); return true;
      case 'console': cabinet(K, x, y, true, [0.06, 0.45, 0.94, 0.92], 0.9, '#6a3a24', 'dr', 1); cyl(x + 0.35, y + 0.68, 0.13, 0.96, 1.04, '#c8d8e8'); bx(x + 0.6, y + 0.58, x + 0.82, y + 0.78, 0.96, 1.02, '#7a2a22'); return true;
      case 'rdesk': cabinet(K, x, y, true, [0.08, 0.18, 0.92, 0.85], 0.86, '#6a3a24', 'dr', 2); bx(x + 0.2, y + 0.3, x + 0.5, y + 0.55, 0.92, 0.95, '#f2ecd8'); cyl(x + 0.72, y + 0.42, 0.05, 0.92, 1.04, '#1a1a2a'); return true;
      case 'dresser': cabinet(K, x, y, false, [0.45, 0.06, 0.92, 0.94], 1.1, '#874c2e', 'dr', 3); bx(x + 0.6, y + 0.3, x + 0.85, y + 0.7, 1.16, 1.4, '#e8d8f0'); return true;
      case 'filecab': cabinet(K, x, y, true, [0.12, 0.42, 0.88, 0.95], 1.6, '#5a6a5a', 'dr', 3); return true;
      case 'kcounter': cabinet(K, x, y, true, [0, 0.38, 1, 0.98], 1.0, '#e8e0cc', 'dr', 2, '#a07a52'); if (x === 26) { bx(x + 0.2, y + 0.55, x + 0.45, y + 0.8, 1.06, 1.34, '#c8402a'); bx(x + 0.55, y + 0.5, x + 0.85, y + 0.75, 1.06, 1.16, '#c8945a'); } return true;
      case 'bathcab': cabinet(K, x, y, false, [0.5, 0.12, 0.95, 0.88], 1.55, '#ecebe6', 'dw', 0, '#d4d0c6'); bx(x + 0.55, y + 0.3, x + 0.92, y + 0.7, 1.61, 1.7, '#9ac0d0'); return true;
      case 'sideboard': cabinet(K, x, y, true, [0, 0.45, 1, 0.95], 1.05, '#6a3a24', 'dw'); if (!(propAt(x - 1, y) === 'sideboard')) { cyl(x + 0.4, y + 0.7, 0.12, 1.11, 1.55, '#e8ecf4'); cyl(x + 0.4, y + 0.7, 0.125, 1.25, 1.35, '#2c4e86'); } else bx(x + 0.3, y + 0.62, x + 0.7, y + 0.7, 1.11, 1.6, '#e0b84a'); return true;
      case 'desk': {   // scrivania lunga di noce (questa casella e quella a sinistra), con la lampada verde
        const c = '#6a3a24';
        cabinet(K, x - 1, y, true, [0.08, 0.2, 0.55, 0.8], 0.85, c, 'dr', 3); cabinet(K, x, y, true, [0.45, 0.2, 0.92, 0.8], 0.85, c, 'dr', 3);
        bx(x - 0.96, y + 0.15, x + 0.96, y + 0.85, 0.85, 0.93, '#874c2e'); bx(x - 0.4, y + 0.3, x + 0.4, y + 0.7, 0.93, 0.95, '#2e5a3a');
        bx(x - 0.2, y + 0.38, x + 0.2, y + 0.6, 0.95, 0.98, '#f2ecd8'); bx(x + 0.68, y + 0.38, x + 0.74, y + 0.44, 0.93, 1.3, '#c8a050'); bx(x + 0.55, y + 0.3, x + 0.85, y + 0.5, 1.3, 1.42, '#2e8a4a'); glow(x + 0.7, y + 0.45, 1.3, 1.0, 'rgba(190,255,170,.22)'); return true;
      }
      case 'safe':   // cassaforte di ghisa verde scuro con la manopola e la maniglia
        bx(x + 0.12, y + 0.25, x + 0.88, y + 0.9, 0, 1.35, '#3a4a46'); qL(x + 0.18, x + 0.82, y + 0.9, 0.1, 1.28, '#46584f'); qL(x + 0.16, x + 0.84, y + 0.9, 1.22, 1.26, '#c8a050');
        dot(x + 0.42, y + 0.9, 0.75, 0.07, '#b8c0c8'); dot(x + 0.42, y + 0.9, 0.75, 0.035, '#4a5058'); qL(x + 0.66, x + 0.7, y + 0.9, 0.55, 0.95, '#b8c0c8'); return true;
      case 'plant': eng(K, 'plant', x, y); return true;
      case 'bigpot':   // vaso grande di terracotta con un cespuglio fiorito
        cyl(x + 0.5, y + 0.5, 0.34, 0, 0.7, '#b8603a'); cyl(x + 0.5, y + 0.5, 0.37, 0.6, 0.72, '#c8704a');
        dot(x + 0.5, y + 0.5, 1.2, 0.3, '#2f7a40'); dot(x + 0.36, y + 0.58, 1.45, 0.2, '#3a9050'); dot(x + 0.64, y + 0.42, 1.55, 0.2, '#2a6a38'); dot(x + 0.5, y + 0.5, 1.85, 0.19, '#46a85a');
        for (let i = 0; i < 5; i++) dot(x + 0.3 + 0.4 * K.hsh(x, y, i), y + 0.3 + 0.4 * K.hsh(y, x, i), 1.3 + 0.6 * K.hsh(x + i, y, 2), 0.035, '#e86a8a'); return true;
      case 'palm':   // palma nel vaso
        cyl(x + 0.5, y + 0.5, 0.3, 0, 0.55, '#b8603a'); bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0.55, 2.4, '#8a6a42');
        for (let i = 0; i < 7; i++) { const a = i * 0.9; for (let k = 1; k <= 4; k++) dot(x + 0.5 + Math.cos(a) * 0.14 * k, y + 0.5 + Math.sin(a) * 0.14 * k, 2.45 - 0.07 * k * k, 0.07, k < 3 ? '#4aa058' : '#3a8a48'); }
        dot(x + 0.5, y + 0.5, 2.45, 0.09, '#2a7a3a'); return true;
      case 'planter':   // aiuola di legno con la terra e i fiori
        bx(x, y + 0.12, x + 1, y + 0.88, 0, 0.5, '#7a5232'); bx(x + 0.04, y + 0.16, x + 0.96, y + 0.84, 0.5, 0.52, '#3a2a1a');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { dot(x + 0.2 + i * 0.3, y + 0.32 + j * 0.36, 0.65, 0.08, j ? '#3a8a48' : '#4aa058'); if ((i + j + y) % 2) dot(x + 0.2 + i * 0.3, y + 0.32 + j * 0.36, 0.78, 0.04, ['#e86a8a', '#e8c040', '#f0f0f0'][(i + x) % 3]); }
        return true;
      case 'sack': eng(K, 'sack', x, y); return true;
      case 'bed': {   // letto matrimoniale 2x2 (questa e' la casella davanti a destra)
        bx(x - 0.95, y - 0.95, x + 0.95, y - 0.82, 0, 1.35, '#874c2e'); qL(x - 0.8, x + 0.8, y - 0.82, 0.55, 1.2, '#7a4428');
        bx(x - 0.95, y - 0.82, x + 0.95, y + 0.95, 0, 0.3, '#4a2818'); bx(x - 0.9, y - 0.8, x + 0.9, y + 0.9, 0.3, 0.5, '#f2f0ea');
        bx(x - 0.85, y - 0.78, x - 0.08, y - 0.38, 0.5, 0.66, '#ffffff'); bx(x + 0.08, y - 0.78, x + 0.85, y - 0.38, 0.5, 0.66, '#ffffff');
        bx(x - 0.92, y - 0.25, x + 0.92, y + 0.92, 0.3, 0.6, '#6a4a8a'); bx(x - 0.92, y - 0.25, x + 0.92, y - 0.1, 0.6, 0.62, '#f2f0ea');
        for (let i = 0; i < 3; i++) dot(x - 0.5 + i * 0.5, y + 0.4, 0.61, 0.05, '#e8c46a');
        bx(x - 0.95, y + 0.88, x + 0.95, y + 0.95, 0, 0.75, '#874c2e'); return true;
      }
      case 'wardrobe': cabinet(K, x, y, true, [0.06, 0.4, 0.94, 0.96], 2.6, '#6a3a24', 'dw', 0, '#a5643c'); return true;
      case 'trunk': case 'oldtrunk': {   // baule di cuoio con gli angoli d'ottone (vecchio: piu' scuro e impolverato)
        const c = t === 'oldtrunk' ? '#5a4a3a' : '#7a4a2a';
        bx(x + 0.08, y + 0.18, x + 0.92, y + 0.82, 0, 0.62, c); bx(x + 0.06, y + 0.16, x + 0.94, y + 0.84, 0.62, 0.78, shade(c, 1.12));
        qL(x + 0.08, x + 0.92, y + 0.84, 0.6, 0.66, '#3a2414'); qL(x + 0.45, x + 0.55, y + 0.82, 0.4, 0.66, '#d8a830');
        for (const a of [0.08, 0.86]) qL(x + a, x + a + 0.06, y + 0.82, 0, 0.62, '#c8a050');
        if (t === 'oldtrunk') { dot(x + 0.3, y + 0.4, 0.79, 0.04, 'rgba(220,215,200,.6)'); dot(x + 0.65, y + 0.6, 0.79, 0.05, 'rgba(220,215,200,.5)'); }
        return true;
      }
      case 'gbench':   // panchina da giardino
        legs4(K, x, y, 0.12, 0.22, 0.88, 0.78, 0.45, '#2a2a30'); bx(x + 0.08, y + 0.2, x + 0.92, y + 0.8, 0.45, 0.52, '#3a6a4a'); bx(x + 0.82, y + 0.2, x + 0.92, y + 0.8, 0.52, 1.1, '#3a6a4a'); return true;
      case 'armor': {   // armatura sul piedistallo, con il pennacchio rosso e l'alabarda
        bx(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.18, '#4a2818');
        bx(x + 0.34, y + 0.42, x + 0.46, y + 0.58, 0.18, 1.05, '#8a9098'); bx(x + 0.54, y + 0.42, x + 0.66, y + 0.58, 0.18, 1.05, '#8a9098');
        bx(x + 0.3, y + 0.35, x + 0.7, y + 0.65, 1.05, 1.85, '#a8b0b8'); bx(x + 0.24, y + 0.38, x + 0.3, y + 0.62, 1.2, 1.8, '#8a9098'); bx(x + 0.7, y + 0.38, x + 0.76, y + 0.62, 1.2, 1.8, '#8a9098');
        cyl(x + 0.5, y + 0.5, 0.15, 1.85, 2.25, '#b8c0c8'); qL(x + 0.4, x + 0.6, y + 0.62, 2.0, 2.06, '#22262e');
        dot(x + 0.5, y + 0.5, 2.38, 0.07, '#c8303a'); dot(x + 0.46, y + 0.54, 2.45, 0.06, '#e04850');
        line(S(x + 0.85, y + 0.5, 0.18), S(x + 0.85, y + 0.5, 2.7), '#5a3a24', Math.max(2, TW / 22)); K.poly([S(x + 0.85, y + 0.5, 2.7), S(x + 0.85, y + 0.5, 2.4), S(x + 1.05, y + 0.5, 2.45), S(x + 1.05, y + 0.5, 2.62)], '#c9ccd4'); return true;
      }
      case 'sofa': {   // divano bordeaux che guarda verso di noi (quelli vicini fanno un divano solo)
        const c = '#86263a', jl = propAt(x - 1, y) === 'sofa', jr = propAt(x + 1, y) === 'sofa';
        bx(x, y + 0.06, x + 1, y + 0.34, 0.45, 1.35, shade(c, 0.95)); bx(x, y + 0.34, x + 1, y + 0.94, 0, 0.5, c); bx(x + 0.04, y + 0.38, x + 0.96, y + 0.9, 0.5, 0.62, shade(c, 1.15));
        if (!jl) bx(x, y + 0.06, x + 0.16, y + 0.94, 0, 0.85, c); if (!jr) bx(x + 0.84, y + 0.06, x + 1, y + 0.94, 0, 0.85, c); return true;
      }
      case 'coffee': legs4(K, x, y, 0.14, 0.22, 0.86, 0.78, 0.38, '#4a2818'); bx(x + 0.08, y + 0.16, x + 0.92, y + 0.84, 0.38, 0.46, '#a5643c'); bx(x + 0.2, y + 0.3, x + 0.55, y + 0.6, 0.46, 0.56, '#2a4a7a'); cyl(x + 0.72, y + 0.6, 0.07, 0.46, 0.58, '#ffffff'); return true;
      case 'piano': {   // pianoforte a coda nero (questa casella e quella a sinistra), coperchio alzato, tastiera verso di noi
        for (const [a, b] of [[-0.8, 0.22], [0.62, 0.25], [-0.1, 0.78]]) bx(x + a, y + b, x + a + 0.1, y + b + 0.1, 0, 0.75, '#15151a');
        bx(x - 0.95, y + 0.12, x + 0.85, y + 0.92, 0.75, 1.0, '#22222a'); bx(x - 0.85, y + 0.8, x + 0.75, y + 0.96, 0.92, 0.98, '#f4f2ec');
        for (let i = 0; i < 11; i++) if (i % 7 !== 2 && i % 7 !== 6) qL(x - 0.8 + i * 0.145, x - 0.74 + i * 0.145, y + 0.96, 0.95, 0.99, '#15151a');
        K.poly([S(x - 0.9, y + 0.5, 1.02), S(x + 0.8, y + 0.5, 1.02), S(x + 0.6, y + 0.14, 2.0), S(x - 0.7, y + 0.14, 2.15)], '#2e2e38');
        line(S(x + 0.1, y + 0.5, 1.0), S(x + 0.1, y + 0.3, 1.7), '#b8c0c8', Math.max(1.5, TW / 40)); bx(x - 0.4, y + 0.72, x - 0.1, y + 0.78, 1.0, 1.3, '#f2ecd8'); return true;
      }
      case 'vase':   // vaso cinese bianco e blu
        cyl(x + 0.5, y + 0.5, 0.18, 0, 0.2, '#ecebe6'); cyl(x + 0.5, y + 0.5, 0.28, 0.2, 0.8, '#ecebe6'); cyl(x + 0.5, y + 0.5, 0.285, 0.42, 0.58, '#2c4e86'); cyl(x + 0.5, y + 0.5, 0.15, 0.8, 1.25, '#ecebe6'); cyl(x + 0.5, y + 0.5, 0.155, 1.0, 1.08, '#2c4e86'); return true;
      case 'clock':   // pendolo: cassa alta, quadrante, finestrella con il pendolo d'ottone
        bx(x + 0.2, y + 0.45, x + 0.8, y + 0.92, 0, 2.75, '#6a3a24'); qL(x + 0.32, x + 0.68, y + 0.92, 0.5, 1.7, '#2a1a10'); qL(x + 0.47, x + 0.53, y + 0.92, 0.8, 1.65, '#c8a050'); dot(x + 0.5, y + 0.92, 0.85, 0.06, '#e8c46a');
        dot(x + 0.5, y + 0.92, 2.3, 0.13, '#e8c46a'); dot(x + 0.5, y + 0.92, 2.3, 0.105, '#f4ecd8'); line(S(x + 0.5, y + 0.92, 2.3), S(x + 0.5, y + 0.92, 2.42), '#222', 1.5); line(S(x + 0.5, y + 0.92, 2.3), S(x + 0.58, y + 0.92, 2.3), '#222', 1.5); return true;
      case 'coatrack':   // appendiabiti con il cappotto e il cappello
        cyl(x + 0.5, y + 0.5, 0.2, 0, 0.06, '#4a2818'); bx(x + 0.47, y + 0.47, x + 0.53, y + 0.53, 0.06, 2.3, '#874c2e');
        bx(x + 0.28, y + 0.55, x + 0.48, y + 0.7, 0.9, 2.05, '#3a4a6a'); bx(x + 0.52, y + 0.55, x + 0.64, y + 0.66, 1.3, 2.0, '#c8402a'); cyl(x + 0.5, y + 0.5, 0.2, 2.25, 2.3, '#2a2a2a'); cyl(x + 0.5, y + 0.5, 0.12, 2.3, 2.5, '#3a3a3a'); return true;
      case 'umbrella':   // portaombrelli d'ottone con tre ombrelli
        cyl(x + 0.5, y + 0.5, 0.2, 0, 0.75, '#c8a050');
        for (const [a, b, c] of [[0.42, 0.45, '#2a2a32'], [0.56, 0.5, '#c8402a'], [0.5, 0.6, '#3a6aa8']]) { line(S(x + a, y + b, 0.7), S(x + a + 0.04, y + b - 0.04, 1.5), c, Math.max(2, TW / 22)); dot(x + a + 0.04, y + b - 0.04, 1.52, 0.025, '#4a2818'); }
        return true;
      case 'bench':   // cassapanca con il cuscino
        bx(x + 0.1, y + 0.12, x + 0.9, y + 0.88, 0, 0.6, '#874c2e'); qL(x + 0.2, x + 0.8, y + 0.88, 0.15, 0.48, '#7a4428'); bx(x + 0.14, y + 0.16, x + 0.86, y + 0.84, 0.6, 0.72, '#2e5a4a'); return true;
      case 'toilet':   // water bianco con lo sciacquone
        bx(x + 0.25, y + 0.1, x + 0.75, y + 0.35, 0.4, 1.05, '#ecebe6'); cyl(x + 0.5, y + 0.58, 0.22, 0, 0.45, '#ecebe6'); dot(x + 0.5, y + 0.58, 0.46, 0.1, '#9ac0d0'); bx(x + 0.64, y + 0.15, x + 0.7, y + 0.2, 0.85, 0.95, '#b8c0c8'); return true;
      case 'sink':   // lavandino a colonna con lo specchio tondo
        cyl(x + 0.5, y + 0.45, 0.1, 0, 0.75, '#ecebe6'); bx(x + 0.15, y + 0.2, x + 0.85, y + 0.7, 0.75, 0.95, '#ecebe6'); bx(x + 0.3, y + 0.32, x + 0.7, y + 0.6, 0.95, 0.96, '#b8d0dc'); bx(x + 0.47, y + 0.2, x + 0.53, y + 0.3, 0.95, 1.15, '#b8c0c8');
        dot(x + 0.5, y + 0.1, 1.8, 0.2, '#c8a050'); dot(x + 0.5, y + 0.1, 1.8, 0.17, '#a8c8dc'); dot(x + 0.45, y + 0.1, 1.86, 0.05, '#e8f4fa'); return true;
      case 'washer':   // lavatrice bianca con l'oblo'
        bx(x + 0.1, y + 0.2, x + 0.9, y + 0.9, 0, 1.05, '#ecebe6'); qL(x + 0.15, x + 0.45, y + 0.9, 0.88, 1.0, '#c8d0d8'); dot(x + 0.75, y + 0.9, 0.94, 0.025, '#e2553a');
        dot(x + 0.5, y + 0.9, 0.45, 0.17, '#8a9098'); dot(x + 0.5, y + 0.9, 0.45, 0.13, '#5a8ab0'); dot(x + 0.45, y + 0.9, 0.5, 0.04, '#bfe0f0'); return true;
      case 'basket':   // cesto di vimini con i panni
        cyl(x + 0.5, y + 0.5, 0.28, 0, 0.62, '#c8a060'); cyl(x + 0.5, y + 0.5, 0.285, 0.25, 0.3, '#a8803e'); dot(x + 0.42, y + 0.48, 0.66, 0.1, '#3a6aa8'); dot(x + 0.58, y + 0.54, 0.68, 0.09, '#e86a8a'); return true;
      case 'tub':   // vasca da bagno con i piedini (questa casella e quella dietro), l'acqua e la paperella
        for (const [a, b] of [[0.2, -0.85], [0.8, -0.85], [0.2, 0.85], [0.8, 0.85]]) bx(x + a - 0.05, y + b - 0.05, x + a + 0.05, y + b + 0.05, 0, 0.15, '#c8a050');
        bx(x + 0.1, y - 0.95, x + 0.9, y + 0.95, 0.15, 0.7, '#ecebe6'); bx(x + 0.18, y - 0.85, x + 0.82, y + 0.85, 0.66, 0.68, '#8ac8e0');
        dot(x + 0.5, y + 0.3, 0.74, 0.05, '#f2c230'); bx(x + 0.45, y - 0.95, x + 0.55, y - 0.88, 0.7, 1.05, '#b8c0c8'); return true;
      case 'ksink':   // bancone con il lavello e il rubinetto
        cabinet(K, x, y, true, [0, 0.38, 1, 0.98], 1.0, '#e8e0cc', 'dw', 0, '#a07a52'); bx(x + 0.22, y + 0.5, x + 0.78, y + 0.86, 1.06, 1.07, '#8a9aa8'); bx(x + 0.47, y + 0.42, x + 0.53, y + 0.48, 1.06, 1.35, '#b8c0c8'); bx(x + 0.47, y + 0.42, x + 0.53, y + 0.6, 1.3, 1.35, '#b8c0c8'); return true;
      case 'stove':   // cucina smaltata con il forno e la pentola
        bx(x + 0.02, y + 0.38, x + 0.98, y + 0.98, 0, 1.0, '#e8dcc4'); qL(x + 0.14, x + 0.86, y + 0.98, 0.18, 0.7, '#22222a'); qL(x + 0.28, x + 0.72, y + 0.98, 0.3, 0.6, '#3a2a1a'); qL(x + 0.1, x + 0.9, y + 0.98, 0.78, 0.84, '#22222a');
        bx(x, y + 0.36, x + 1, y + 1, 1.0, 1.06, '#2a2a30'); for (const [a, b] of [[0.3, 0.55], [0.7, 0.55], [0.3, 0.85], [0.7, 0.85]]) dot(x + a, y + b, 1.07, 0.07, '#4a4a52'); cyl(x + 0.3, y + 0.6, 0.14, 1.06, 1.3, '#8a9098'); return true;
      case 'fridge': eng(K, 'fridge', x, y); return true;
      case 'cupboard':   // credenza della cucina: ante sotto, piattaia sopra con i piatti
        cabinet(K, x, y, true, [0.06, 0.4, 0.94, 0.96], 1.0, '#7a9a8a', 'dw', 0, '#a07a52'); bx(x + 0.08, y + 0.72, x + 0.92, y + 0.96, 1.06, 2.3, '#7a9a8a'); qL(x + 0.12, x + 0.88, y + 0.96, 1.12, 2.2, '#3a4a42');
        for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) dot(x + 0.25 + i * 0.25, y + 0.96, 1.4 + r * 0.5, 0.07, i % 2 ? '#3a6aa8' : '#f4f0e8'); return true;
      case 'ktable':   // tavolo della cucina (questa casella e quella a sinistra) con la tovaglia a quadretti
        legs4(K, x - 1, y, 0.12, 0.15, 1.88, 0.85, 0.75, '#874c2e');
        bx(x - 0.92, y + 0.08, x + 0.92, y + 0.92, 0.75, 0.82, '#f4f0e8'); for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) K.poly([S(x - 0.92 + i * 0.205, y + 0.08 + j * 0.21, 0.82), S(x - 0.715 + i * 0.205, y + 0.08 + j * 0.21, 0.82), S(x - 0.715 + i * 0.205, y + 0.29 + j * 0.21, 0.82), S(x - 0.92 + i * 0.205, y + 0.29 + j * 0.21, 0.82)], '#c8402a');
        dot(x - 0.3, y + 0.45, 0.88, 0.1, '#c8904a'); cyl(x + 0.35, y + 0.5, 0.08, 0.82, 1.1, '#e8ecf4'); return true;
      case 'dog':   // cane che dorme sul cuscino
        cyl(x + 0.5, y + 0.5, 0.42, 0, 0.12, '#a83434'); bx(x + 0.25, y + 0.38, x + 0.72, y + 0.66, 0.12, 0.4, '#c88a4a'); bx(x + 0.18, y + 0.4, x + 0.36, y + 0.62, 0.15, 0.48, '#c88a4a');
        bx(x + 0.22, y + 0.6, x + 0.3, y + 0.66, 0.2, 0.4, '#7a4a2a'); bx(x + 0.12, y + 0.46, x + 0.2, y + 0.56, 0.15, 0.3, '#d89a5a'); dot(x + 0.12, y + 0.5, 0.3, 0.02, '#222'); bx(x + 0.72, y + 0.48, x + 0.86, y + 0.54, 0.2, 0.28, '#c88a4a'); return true;
      case 'barrel':   // botte di rovere con i cerchi di ferro
        cyl(x + 0.5, y + 0.5, 0.34, 0, 1.1, '#8a5a32'); cyl(x + 0.5, y + 0.5, 0.355, 0.18, 0.26, '#3a3f49'); cyl(x + 0.5, y + 0.5, 0.355, 0.84, 0.92, '#3a3f49'); cyl(x + 0.5, y + 0.5, 0.25, 1.1, 1.12, '#a87a4a'); return true;
      case 'winerack':   // scaffale delle bottiglie
        bx(x + 0.05, y + 0.02, x + 0.45, y + 0.98, 0, 2.2, '#6a3a24'); qR(K, x + 0.45, y + 0.06, y + 0.94, 0.06, 2.14, '#2a1a10');
        for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) dot(x + 0.45, y + 0.16 + i * 0.22, 0.25 + r * 0.4, 0.055, r % 2 ? '#2e5a3a' : '#5a1a2a'); return true;
      case 'crate': eng(K, 'crate', x, y); return true;
      case 'jarshelf':   // mensola con i barattoli
        bx(x + 0.05, y + 0.6, x + 0.95, y + 0.95, 0, 2.0, '#874c2e'); qL(x + 0.1, x + 0.9, y + 0.95, 0.06, 1.95, '#2a1a10');
        for (let r = 0; r < 3; r++) { qL(x + 0.08, x + 0.92, y + 0.95, r * 0.66, r * 0.66 + 0.06, '#a5643c'); for (let i = 0; i < 3; i++) cyl(x + 0.22 + i * 0.28, y + 0.82, 0.08, r * 0.66 + 0.06, r * 0.66 + 0.38, ['#c8402a', '#e8a030', '#6a2a6a', '#4a8a3a'][(r + i * 2) % 4]); }
        return true;
    }
    return false;
  }
  // quattro gambe sottili (tavolini, panchine)
  function legs4(K, x, y, a0, b0, a1, b1, h, col) { const w = 0.06; for (const [a, b] of [[a0, b0], [a1 - w, b0], [a0, b1 - w], [a1 - w, b1 - w]]) K.bx(x + a, y + b, x + a + w, y + b + w, 0, h, col); }
  // muri: come quelli del motore (blocco di mattoncini alto 0,9), piu' le librerie del passaggio segreto e le lanterne del portone
  function drawWall(K, x, y, col) {
    const { bx, S, g, TW } = K;
    if (x === 10 && (y === 3 || y === 5)) {   // librerie alte accanto al passaggio segreto
      bx(x + 0.2, y, x + 0.8, y + 1, 0, 2.3, '#5a3a24'); books(K, frontF(K, false, x + 0.2, y, x + 0.8, y + 1), 0.1, 2.25, 4, y * 13);
      if (y === 3) K.dot(x + 0.8, y + 0.85, 1.3, 0.025, '#e8c46a');   // il libro-leva
      return;
    }
    bx(x, y, x + 1, y + 1, 0, 0.9, col); bx(x, y, x + 1, y + 1, 0.82, 0.9, K.shade(col, 1.3));
    if (TW >= 40) {   // mattoncini (come wallTex del motore)
      const FS = (u, z) => S(x + u, y + 1, z), FE = (v, z) => S(x + 1, y + v, z);
      for (const [F, k] of [[FS, 0.74], [FE, 0.52]]) {
        const base = K.shade(col, k * 0.6), ln = K.shade(col, k * 0.78), L = [];
        g.fillStyle = base; g.beginPath(); g.moveTo(...F(0, 0)); g.lineTo(...F(1, 0)); g.lineTo(...F(1, 0.13)); g.lineTo(...F(0, 0.13)); g.closePath(); g.fill();
        const rows = [0.13, 0.35, 0.57, 0.8]; for (const z of rows) L.push([F(0, z), F(1, z)]);
        for (let r = 0; r < 3; r++) for (const u of (r + x + y) % 2 ? [0.25, 0.75] : [0.5]) L.push([F(u, rows[r]), F(u, rows[r + 1])]);
        K.strokes(L, ln);
      }
      K.strokes([[S(x, y, 0.9), S(x + 1, y, 0.9)], [S(x, y, 0.9), S(x, y + 1, 0.9)]], 'rgba(255,255,255,.18)');
    }
    if (y === PORCH.y && (x === PORCH.x0 - 1 || x === PORCH.x1)) {   // lanterne ai lati del portone
      bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 0.9, 1.5, '#22262e'); bx(x + 0.34, y + 0.34, x + 0.66, y + 0.66, 1.5, 1.9, '#ffd890'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 1.9, 2.0, '#22262e');
      K.glow(x + 0.5, y + 0.5, 1.7, 1.6, 'rgba(255,210,140,.35)');
    }
  }
  // tappeti, scalini della cantina e zerbino (disegnati sopra il pavimento)
  const RUG = (x, y, w, h, c, b) => [[x, y, w, h, b], [x + 0.12, y + 0.12, w - 0.24, h - 0.24, c], [x + 0.3, y + 0.3, w - 0.6, h - 0.6, b], [x + 0.36, y + 0.36, w - 0.72, h - 0.72, c]];
  const DECALS = [
    ...RUG(13.2, 12.4, 7, 5, '#7a2a3a', '#d8b060'), ...RUG(25.4, 3.4, 5.2, 3.2, '#4a5a8a', '#d8c8a0'), ...RUG(27.2, 24, 3.6, 2.8, '#9a3a2a', '#e8d8b0'),
    [15.3, 21, 2.4, 8, '#c99a44'], [15.45, 21, 2.1, 8, '#8a2028'],   // passatoia rossa dall'ingresso al salone
    [30.6, 12.2, 1.8, 1, '#9ac0d0'], [30.7, 12.3, 1.6, 0.8, '#e8eef2'],   // tappetino del bagno
    [3, 21, 2, 1, '#4a4542'], [3, 21.33, 2, 0.67, '#6a6560'], [3, 21.66, 2, 0.34, '#8a8580'],   // scalini che scendono in cantina
    [16, 29, 2, 1, '#4a3020'], [16.1, 29.1, 1.8, 0.8, '#7a5a34'],   // zerbino del portone
    [10, 4, 1, 1, '#3a2418']];   // passaggio segreto (pavimento scuro)

  // ---- la mappa per il motore ----
  function mapVilla() {
    const rooms = ROOMS.map(r => Object.assign({}, r));
    for (const [x, y, w, h, a, b, k] of DOORS) rooms.push({ n: k === 'porch' ? 'Ingresso' : a, x, y, w, h, vk: k || 'door', k: 'wood', c: ['#a8794a', '#a0734a'], wc: ROOMS.find(r => r.n === a).wc, nl: 1, nm: 1, door: [a, b] });
    const props = FURN.map(([t, x, y, o]) => [t, x, y, o || {}]);
    return { w: W, h: H, rooms, doors: [], decals: DECALS, props, tasks: [], hall: 0, cams: [], vending: [], ring: [[16, 28], [17, 28], [15, 27], [18, 27]], button: { x: -10, y: -10 }, sabs: {},
      inn: Object.fromEntries(ROOMS.map(r => [r.n, 'in ' + r.n.toLowerCase()])), help: '', btnTxt: '', sabTxt: '',
      pxProp: drawFurn,   // gancio dei disegni degli oggetti (chiamato per primo): qui disegna i mobili della villa con gli attrezzi del motore
      drawWall };
  }
  CQ_MAPS.villa = { n: 'Villa', make: mapVilla, only: 'trappole' };
  // giorno o notte: cambia solo il buio (M.night); la mappa resta la stessa
  function setNight(v) { NIGHT = v ? 1 : 0; }

  // ---- nascondigli (mobili che si aprono) ----
  const SPOTS = () => CQ_PROPS.filter(p => p[3] && p[3].h).map(([t, x, y, o]) => ({ t, x, y, h: o.h, n: o.n, cells: t === 'bed' ? [[x, y], [x - 1, y], [x, y - 1], [x - 1, y - 1]] : t === 'desk' ? [[x, y], [x - 1, y]] : [[x, y]] }));
  let SPC = null, SPP = null;
  const spots = () => SPP === CQ_PROPS ? SPC : (SPP = CQ_PROPS, SPC = SPOTS());
  const spotDist = (s, px, py) => Math.min(...s.cells.map(([a, b]) => Math.hypot(Math.max(a - px, 0, px - a - 1), Math.max(b - py, 0, py - b - 1))));
  const roomName = (x, y) => { const r = roomAt(Math.floor(x), Math.floor(y)); return r ? r.n : ''; };
  const atPorch = (x, y) => y > 27.6 && x > PORCH.x0 - 0.2 && x < PORCH.x1 + 0.2;

  // ---- COSTRUZIONE: catalogo, regole di posa, villa del computer ----
  const BUDGET = 100, JOLLY = 2, BUILD = 90;
  // on = dove si mette: spot (dentro un mobile), floor (pavimento libero), door (porta), armor (armatura), room (una per stanza)
  const CAT = {
    dia: { e: '💎', n: 'Diamante', p: 0, on: 'spot', max: 1, d: 'Il tuo diamante: nascondilo in un mobile. È quello che l\'altro deve rubare.' },
    fake: { e: '🎂', n: 'Diamante finto', p: 0, on: 'spot', max: 2, d: 'Chi lo apre si prende una torta in faccia (resta fermo 3 s).' },
    box: { e: '🥊', n: 'Scatola a sorpresa', p: 10, on: 'spot', d: 'Dentro un mobile: un guantone a molla in faccia, -1 cuore.' },
    botola: { e: '🕳️', n: 'Botola', p: 25, on: 'floor', d: 'Il pavimento cede: -1 cuore e di nuovo all\'ingresso.' },
    piano: { e: '🎹', n: 'Pianoforte', p: 20, on: 'floor', d: 'Cade dall\'alto su chi ci passa sotto: -1 cuore, stordito.' },
    cane: { e: '🐕', n: 'Cane', p: 15, on: 'floor', d: 'Dorme. Se gli passi vicino di corsa si sveglia, abbaia e ti insegue.' },
    buccia: { e: '🍌', n: 'Buccia di banana', p: 8, on: 'floor', d: 'Scivoli dritto per 3 caselle: -1 cuore.' },
    rastrello: { e: '🧹', n: 'Rastrello', p: 8, on: 'floor', d: 'Lo pesti e il manico ti arriva in faccia: -1 cuore.' },
    vernice: { e: '🪣', n: 'Secchio di vernice', p: 12, on: 'door', d: 'Sopra una porta: chi passa lascia impronte e lo vedi ovunque.' },
    finta: { e: '🚧', n: 'Porta finta', p: 10, on: 'door', d: 'La porta è dipinta sul muro: ci sbatti contro, -1 cuore.' },
    armatura: { e: '🛡️', n: 'Armatura', p: 12, on: 'armor', d: 'Su un\'armatura: si gira di colpo quando le passi accanto.' },
    cam: { e: '📹', n: 'Telecamera', p: 15, on: 'room', max: 3, d: 'Una per stanza: durante il furto da lì vedi il ladro.' },
    jl: { e: '💡', n: 'Lampadario', p: 0, on: 'floor', jolly: 1, d: 'JOLLY: lo fai cadere tu quando il ladro è sotto. Colpisce tutto intorno.' },
    jp: { e: '💨', n: 'Porta che sbatte', p: 0, on: 'door', jolly: 1, d: 'JOLLY: la chiudi tu in faccia al ladro.' },
    ja: { e: '⚔️', n: 'Armatura che cade', p: 0, on: 'armor', jolly: 1, d: 'JOLLY: la fai cadere tu addosso al ladro.' }
  };
  const ON_TXT = { spot: 'Va dentro un mobile (quelli con il bordo giallo).', floor: 'Va sul pavimento libero: non sulle porte, non sulle scale, non davanti al portone.', door: 'Va su una porta.', armor: 'Va su un\'armatura.', room: 'Tocca la stanza dove la vuoi.' };
  const SPAWN = (x, y) => (y >= 26 && x >= 14 && x <= 19) || y === PORCH.y;
  const doorAt = (x, y) => DOORS.findIndex(d => d[6] !== 'porch' && x >= d[0] && x < d[0] + d[2] && y >= d[1] && y < d[1] + d[3]);
  const spotAt = (x, y) => spots().findIndex(s => s.cells.some(([a, b]) => a === x && b === y));
  const mainRoom = (x, y) => { const r = roomAt(x, y); return r && !r.door ? r : null; };
  const floorOk = (x, y) => !!(cqFloor[y] && cqFloor[y][x]) && !cqSolid[y][x] && doorAt(x, y) < 0 && !SPAWN(x, y) && !(y === 21 && x >= 3 && x <= 4);
  // dove andrebbe la cosa k toccando la casella x, y: { key, x, y, cells } oppure { err }
  function target(k, x, y) {
    const on = CAT[k].on;
    if (on === 'spot') { const i = spotAt(x, y); if (i < 0) return { err: ON_TXT.spot }; const s = spots()[i]; return { key: 's' + i, x: s.x, y: s.y, cells: s.cells, i }; }
    if (on === 'floor') return floorOk(x, y) ? { key: 'f' + x + ',' + y, x, y, cells: [[x, y]] } : { err: ON_TXT.floor };
    if (on === 'door') { const d = doorAt(x, y); if (d < 0) return { err: ON_TXT.door }; const D = DOORS[d], cells = []; for (let j = 0; j < D[3]; j++) for (let i = 0; i < D[2]; i++) cells.push([D[0] + i, D[1] + j]); return { key: 'd' + d, x: D[0], y: D[1], cells, i: d }; }
    if (on === 'armor') return propAt(x, y) === 'armor' ? { key: 'a' + x + ',' + y, x, y, cells: [[x, y]] } : { err: ON_TXT.armor };
    const r = mainRoom(x, y); if (!r) return { err: ON_TXT.room }; return { key: 'r' + r.n, x: r.x, y: r.y, cells: [[r.x, r.y]], room: r.n };
  }
  const spent = B => B.items.reduce((s, it) => s + CAT[it.k].p, 0);
  const count = (B, f) => B.items.filter(f).length;
  // un'altra cosa nella stessa casella? (diverse regole: un mobile = una cosa, una porta = una cosa, una stanza = una telecamera)
  const itemAt = (B, x, y) => B.items.find(it => it.cells.some(([a, b]) => a === x && b === y));
  function place(B, k, x, y) {
    const C2 = CAT[k], t = target(k, x, y); if (t.err) return t.err;
    if (B.items.some(it => it.key === t.key)) return k === 'cam' ? 'In questa stanza c\'è già una telecamera: toccala per toglierla.' : 'Qui c\'è già qualcosa: toccalo per toglierlo.';
    if (C2.max && count(B, it => it.k === k) >= C2.max) { if (k !== 'dia') return 'Ne puoi mettere al massimo ' + C2.max + '.'; B.items = B.items.filter(it => it.k !== 'dia'); }
    if (C2.jolly && count(B, it => CAT[it.k].jolly) >= JOLLY) return 'Hai già messo i ' + JOLLY + ' jolly.';
    if (spent(B) + C2.p > BUDGET) return 'Non ti bastano le monete.';
    B.items.push({ k, key: t.key, x: t.x, y: t.y, cells: t.cells, i: t.i, room: t.room });
    return null;
  }
  // villa del computer, "con buon senso": diamante lontano dall'ingresso (a volte proprio nel posto ovvio, per bluff),
  // diamanti finti nei posti ovvi, telecamere dove serve, trappole sulla strada piu' comoda e sulle porte
  function cpuBuild() {
    const B = { items: [] }, S = spots(), pick = a => a[Math.floor(Math.random() * a.length)];
    const far = s => Math.abs(s.x - 16) + Math.abs(s.y - 28);
    const obvious = S.filter(s => ['Cassaforte', 'Sotto il letto', 'Baule vecchio', 'Botte'].includes(s.n));
    let dia;
    if (Math.random() < 0.25) dia = pick(obvious);
    else { const wt = s => 0.5 + far(s) / 40, tot = S.reduce((a, s) => a + wt(s), 0); let r = Math.random() * tot; dia = S.find(s => (r -= wt(s)) <= 0) || S[0]; }
    place(B, 'dia', dia.x, dia.y);
    const fk = obvious.filter(s => s !== dia); place(B, 'fake', ...(s => [s.x, s.y])(pick(fk)));
    const other = S.filter(s => s !== dia && roomName(s.x, s.y) !== roomName(dia.x, dia.y) && !B.items.some(it => it.x === s.x && it.y === s.y)); const f2 = pick(other); place(B, 'fake', f2.x, f2.y);
    // la strada dal portone al diamante: trappole sulla parte piu' comoda
    const nb = dia.cells.flatMap(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]).find(([a, b]) => cqCellFree(a, b)) || [dia.x, dia.y + 1];
    const path = cqPath(16.5, 28.5, nb[0] + 0.5, nb[1] + 0.5).map(([a, b]) => [Math.floor(a), Math.floor(b)]);
    const onPath = path.filter(([a, b]) => floorOk(a, b)), doors = [...new Set(path.map(([a, b]) => doorAt(a, b)).filter(d => d >= 0))];
    const dr = roomAt(dia.x, dia.y) || roomAt(nb[0], nb[1]);
    place(B, 'cam', nb[0], nb[1]); place(B, 'cam', 16, 14); { const c3 = pick([[16, 24], [5, 15], [28, 15]]); place(B, 'cam', c3[0], c3[1]); }
    if (onPath.length > 6) { const c = onPath[Math.floor(onPath.length * (0.45 + Math.random() * 0.2))]; place(B, 'botola', c[0], c[1]); }
    if (doors.length) { const d = DOORS[doors[doors.length - 1]]; place(B, Math.random() < 0.5 ? 'vernice' : 'jp', d[0], d[1]); }
    // lampadario jolly vicino al diamante
    const near = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floorOk(x, y) && Math.hypot(x - nb[0], y - nb[1]) < 3 && x !== nb[0]) near.push([x, y]);
    if (near.length) { const c = pick(near); place(B, 'jl', c[0], c[1]); }
    if (onPath.length > 3) { const c = onPath[onPath.length - 2]; place(B, 'buccia', c[0], c[1]); }
    const arm = CQ_PROPS.filter(p => p[0] === 'armor'); place(B, Math.random() < 0.5 ? 'ja' : 'armatura', ...pick(arm).slice(1, 3));
    // il resto delle monete: trappole sparse sulle altre strade, una porta finta su una porta che non e' sulla strada comoda
    const free = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (floorOk(x, y)) free.push([x, y]);
    const otherDoors = DOORS.map((d, i) => i).filter(i => !doors.includes(i) && DOORS[i][6] !== 'porch');
    if (otherDoors.length) { const d = DOORS[pick(otherDoors)]; place(B, 'finta', d[0], d[1]); }
    place(B, 'box', ...(s => [s.x, s.y])(pick(S.filter(s => !B.items.some(it => it.x === s.x && it.y === s.y)))));
    for (let tries = 0; tries < 40 && spent(B) < BUDGET - 7; tries++) { const c = pick(free); place(B, pick(['piano', 'cane', 'buccia', 'rastrello', 'rastrello', 'buccia']), c[0], c[1]); }
    return B;
  }

  // ---- PREPARAZIONE girando per la villa: telecamera libera come il fantasmino di Nascondino (cq.cam), mirino al centro,
  // catalogo in alto, pulsante grande "📌 Metti" / "🗑️ Togli". Il tasto 📋 apre una pianta mini per volare in una stanza ----
  // icone dei mobili sulla pianta mini (diverse da quelle delle trappole)
  const PROP_E = { shelf: '📚', globe: '🌍', armchair: '🛋️', sofa: '🛋️', chair: '🪑', kchair: '🪑', gbench: '🪑', bench: '🪑', lamp: '🕯️', rlamp: '🕯️', sidetable: '🗄️', nightstand: '🗄️', console: '🗄️', rdesk: '🗄️', dresser: '🗄️', filecab: '🗄️', kcounter: '🗄️', bathcab: '🗄️', sideboard: '🗄️', desk: '🗄️', safe: '🔒', plant: '🪴', bigpot: '🪴', palm: '🌴', planter: '🌱', sack: '🌾', bed: '🛏️', wardrobe: '👔', trunk: '🧳', oldtrunk: '🧳', armor: '🗡️', coffee: '☕', piano: '🎼', vase: '🏺', clock: '🕰️', coatrack: '🧥', umbrella: '☂️', toilet: '🚽', sink: '🚰', ksink: '🚰', washer: '🌀', basket: '🧺', tub: '🛁', stove: '🍳', fridge: '🧊', cupboard: '🍽️', ktable: '🍞', dog: '🐶', barrel: '🛢️', winerack: '🍷', crate: '📦', jarshelf: '🫙' };
  const PLAN_C = { biblio: '#8a4a3a', noce: '#6a4a36', legno: '#9a6a48', serra: '#94a688', parquet: '#c8945a', scacchi: '#c4c4c0', pietra: '#706a64', corr: '#8a6a4a', marmo: '#d2c6ae', cotto: '#c8704a', door: '#b08a60', secret: '#5a3a28', porch: '#6a4a2a' };
  const U = { tool: 'dia' };
  const BUILD2 = 40;   // nelle manche dopo: solo per spostare le cose
  function buildCss() {
    if (document.getElementById('trCss')) return;
    const st = document.createElement('style'); st.id = 'trCss';
    st.textContent = `#trBar{position:absolute;left:8px;right:8px;top:104px;display:flex;gap:6px;align-items:stretch;z-index:5;touch-action:pan-x}
#trBar .fix{flex:0 0 auto;border:0;border-radius:10px;font:700 14px system-ui,sans-serif;padding:0 10px;min-width:44px;color:#fff;background:rgba(20,22,28,.78)}#trBar .fix.go{background:#2f8a4a}
#trCat{flex:1 1 auto;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}#trCat::-webkit-scrollbar{display:none}
#trCat button{flex:0 0 auto;width:52px;border:1px solid rgba(255,255,255,.18);background:rgba(20,22,28,.78);color:#f2ead8;border-radius:10px;padding:3px 1px;font:10px system-ui,sans-serif;line-height:1.1;min-height:48px}
#trCat button .e{font-size:20px;display:block}#trCat button.on{border-color:#ffd24a;background:rgba(90,70,30,.92);box-shadow:0 0 0 1px #ffd24a inset}#trCat button.off{opacity:.4}#trCat button.jo{border-style:dashed}
#trTip{position:absolute;left:12px;right:12px;top:160px;z-index:5;color:#fff;font:13px system-ui,sans-serif;text-align:center;pointer-events:none;text-shadow:0 1px 3px #000}
#trPlan{position:fixed;inset:0;z-index:60;background:rgba(16,12,22,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;box-sizing:border-box;color:#f2ead8;font:14px system-ui,sans-serif}
#trPlan canvas{display:block;touch-action:none;max-width:100%}
#trSafe{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;background:rgba(16,12,22,.95);color:#f2ead8;border-radius:16px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px;font:14px system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.5)}#trSafe canvas{touch-action:none}#trSafeN{font-size:22px;letter-spacing:4px}`;
    document.head.appendChild(st);
  }
  function buildOpen(G) {
    buildCss();
    if (document.getElementById('trBar')) return;
    const box = $('#ciack'), bar = document.createElement('div'); bar.id = 'trBar';
    bar.innerHTML = `<button class="fix" id="trMap" type="button" title="Pianta">📋</button><div id="trCat"></div><button class="fix go" id="trDone" type="button">✔ Fatto</button>`;
    const tip = document.createElement('div'); tip.id = 'trTip';
    box.appendChild(bar); box.appendChild(tip);
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) bar.addEventListener(ev, e => e.stopPropagation(), { passive: true });   // toccare il catalogo non muove la telecamera
    $('#trDone').onclick = () => { const G2 = cq.g; if (G2 && G2.ph === 'build') buildEnd(G2); };
    $('#trMap').onclick = () => planOpen();
    $('#trCat').innerHTML = Object.entries(CAT).map(([k, c]) => `<button type="button" data-k="${k}" class="${c.jolly ? 'jo' : ''}"><span class="e">${c.e}</span>${c.jolly ? '★' : c.p ? '🪙' + c.p : 'gratis'}</button>`).join('');
    $('#trCat').querySelectorAll('button').forEach(b => { b.onclick = () => { U.tool = b.dataset.k; beep(700, 0.03, 0.02); buildBar(G); }; });
    U.tool = 'dia'; buildBar(G);
  }
  function buildClose() { for (const id of ['trBar', 'trTip', 'trPlan']) { const el = document.getElementById(id); if (el) el.remove(); } }
  function buildBar(G) {
    const B = G.mine, left = BUDGET - spent(B), jo = count(B, it => CAT[it.k].jolly);
    $('#trCat') && $('#trCat').querySelectorAll('button').forEach(b => { const k = b.dataset.k, c = CAT[k]; b.classList.toggle('on', k === U.tool); b.classList.toggle('off', !!((c.p > left) || (c.max && k !== 'dia' && count(B, it => it.k === k) >= c.max) || (c.jolly && jo >= JOLLY))); });
  }
  // dove punta il mirino: la casella al centro dello schermo; per mobili, porte e armature va bene anche quello piu' vicino (entro 1 casella)
  function aim(G) {
    const c = cq.cam || { x: cq.x, y: cq.y }, x = Math.floor(c.x), y = Math.floor(c.y), B = G.mine;
    const dist = (a, b) => Math.hypot(Math.max(a - c.x, 0, c.x - a - 1), Math.max(b - c.y, 0, c.y - b - 1));
    // 1) proprio sotto il mirino c'e' una cosa messa: si toglie
    const it0 = itemAt(B, x, y); if (it0) return { item: it0, x, y };
    const k = U.tool; if (!k) return { x, y };
    // 2) dove andrebbe la cosa scelta: la casella del mirino, o il mobile/la porta/l'armatura libera piu' vicina (entro 1 casella)
    const free = t2 => !t2.err && !B.items.some(o => o.key === t2.key);
    let t = target(k, x, y);
    if (!free(t) && ['spot', 'armor', 'door'].includes(CAT[k].on)) {
      let bd = 1.0, best = null;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { const t2 = target(k, xx, yy); if (!free(t2)) continue; const d = dist(xx, yy); if (d < bd) { bd = d; best = t2; } }
      if (best) t = best;
    }
    if (free(t)) return { t, x, y };
    // 3) qui non si puo' mettere: se li' accanto c'e' una cosa messa (in un mobile, porta o armatura), si toglie quella
    let bd = 0.6, it = null; for (const o of B.items) { if (CAT[o.k].on === 'room' || CAT[o.k].on === 'floor') continue; const d = Math.min(...o.cells.map(([a, b]) => dist(a, b))); if (d < bd) { bd = d; it = o; } }
    if (it) return { item: it, x, y };
    if (!t.err) t = { err: k === 'cam' ? 'In questa stanza c\'è già una telecamera.' : 'Qui c\'è già qualcosa.' };
    return { t, x, y };
  }
  // nome del posto puntato (per il pulsante e la scritta sotto il mirino)
  const aimName = t => { if (!t || t.err) return ''; if (t.i != null && CAT[U.tool].on === 'spot') return spots()[t.i].n; if (t.room) return t.room; if (CAT[U.tool].on === 'door') return 'porta'; if (CAT[U.tool].on === 'armor') return 'armatura'; return ''; };
  function buildAct(G) {
    const A = aim(G), B = G.mine;
    if (A.item) { B.items = B.items.filter(o => o !== A.item); beep(330, 0.05, 0.03); buildBar(G); return; }
    if (!A.t) return;
    const err = A.t.err || place(B, U.tool, A.t.x, A.t.y);
    if (err) { beep(160, 0.08, 0.03); cqToast(esc(err)); return; }
    beep(880, 0.04, 0.03); beep(1175, 0.05, 0.03, 0.05);
    if (U.tool === 'dia') U.tool = 'fake';
    buildBar(G);
  }
  // ---- pianta mini (solo per orientarsi): le stanze con le cose messe; tocchi una stanza e la telecamera vola li' ----
  function planOpen() {
    const G = cq.g; if (!G || G.ph !== 'build') return;
    let el = document.getElementById('trPlan'); if (el) { el.remove(); return; }
    el = document.createElement('div'); el.id = 'trPlan';
    el.innerHTML = `<b>📋 Tocca una stanza per andarci</b><canvas id="trPv"></canvas><button class="btn" id="trPx" type="button">Chiudi</button>`;
    document.body.appendChild(el);
    $('#trPx').onclick = () => el.remove();
    const cv = $('#trPv'), cs = Math.max(6, Math.floor(Math.min((window.innerWidth - 24) / W, (window.innerHeight - 140) / H))), dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = W * cs * dpr; cv.height = H * cs * dpr; cv.style.width = W * cs + 'px'; cv.style.height = H * cs + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = cqSolid[y][x]; if (o && o.wall) { g.fillStyle = '#3a2a22'; g.fillRect(x * cs, y * cs, cs, cs); continue; }
      if (!cqFloor[y][x]) continue; const r = roomAt(x, y); g.fillStyle = PLAN_C[r && r.vk] || '#888'; g.fillRect(x * cs, y * cs, cs, cs);
      if (o && o.prop) { g.fillStyle = 'rgba(30,18,12,.45)'; g.fillRect(x * cs + cs * 0.15, y * cs + cs * 0.15, cs * 0.7, cs * 0.7); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const it of G.mine.items) { const xs = it.cells.map(c => c[0]), ys = it.cells.map(c => c[1]); g.font = Math.max(9, cs * 0.9) + 'px system-ui'; g.fillText(CAT[it.k].e, (Math.min(...xs) + Math.max(...xs) + 1) / 2 * cs, (Math.min(...ys) + Math.max(...ys) + 1) / 2 * cs); }
    const c = cq.cam; if (c) { g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.beginPath(); g.arc(c.x * cs, c.y * cs, cs * 0.8, 0, 7); g.stroke(); }
    g.font = '700 ' + Math.max(9, Math.round(cs * 0.85)) + 'px system-ui'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.65)'; g.fillStyle = '#fff';
    for (const r of ROOMS) { const nm = r.n === 'Camera da letto' ? 'Camera' : r.n === 'Corridoio' ? 'Corr.' : r.n; g.strokeText(nm, (r.x + r.w / 2) * cs, (r.y + r.h / 2) * cs); g.fillText(nm, (r.x + r.w / 2) * cs, (r.y + r.h / 2) * cs); }
    cv.addEventListener('pointerdown', e => {
      const rc = cv.getBoundingClientRect(), x = Math.floor((e.clientX - rc.left) / cs), y = Math.floor((e.clientY - rc.top) / cs), r = roomAt(x, y), n = r ? (r.door ? r.door[0] : r.n) : null, R2 = n && ROOMS.find(q => q.n === n);
      if (!R2 || !cq.cam) return; cq.cam.x = R2.x + R2.w / 2; cq.cam.y = R2.y + R2.h / 2; beep(660, 0.03, 0.02); el.remove();
    });
  }
  function buildEnd(G) {
    buildClose(); cq.cam = null;
    if (!G.mine.items.some(it => it.k === 'dia')) { const s = spots()[Math.floor(Math.random() * spots().length)]; place(G.mine, 'dia', s.x, s.y); cqToast('💎 Non avevi nascosto il diamante: l\'ho messo io in <b>' + esc(s.n) + '</b>.'); }
    G.ph = 'tour'; G.vb = cpuBuild();
    cq.x = 16.5; cq.y = 27.6;
    beep(523, 0.08, 0.04); beep(784, 0.12, 0.04, 0.09);
  }
  // ---- FURTO: trappole che scattano, cuori, segni, cane, cassaforte ----
  const HP = 3, DOG0 = [[28.5, 27.5]];   // il cane della cucina: c'e' sempre, uguale a quelli piazzati (non si sveglia mai)
  const DOOR_IN = (it, x, y) => it.cells.some(([a, b]) => a === x && b === y);
  function raidStart(G) {
    G.ph = 'raid'; G.left = TIME; G.open = []; G.has = false; G.srch = null; G.stun = 0; G.t0 = G.time;
    const d = G.vb.items.find(it => it.k === 'dia'); G.dia = d.i;
    G.hp = HP; G.used = new Set(); G.rev = new Set(); G.fx = []; G.pianos = []; G.paint = 0; G.steps = []; G.slide = null; G.fall = null; G.resp = 0; G.camOff = 0; G.bonus = 0; G.safe = null; G.lost = 0;
    G.dogs = DOG0.map(([x, y]) => ({ x, y, hx: x, hy: y, armed: false, st: 'sleep', path: [], face: 1, walk: 0 }))
      .concat(G.vb.items.filter(it => it.k === 'cane').map(it => ({ x: it.x + 0.5, y: it.y + 0.5, hx: it.x + 0.5, hy: it.y + 0.5, armed: true, st: 'sleep', path: [], face: 1, walk: 0 })));
    cq.x = 16.5 + 0.5; cq.y = 28.3; G.px = cq.x; G.py = cq.y; G.room = 'Ingresso';
    cqToast('🏚️ Villa del computer: trova il <b>diamante</b> e riportalo al portone! Trascina poco il dito per camminare <b>piano</b> e vedere i segni delle trappole.');
  }
  // colpo preso: un cuore in meno, fermo per un po'; a zero cuori si torna al portone (con 3 cuori nuovi)
  function hit(G, txt, stun) {
    if (G.resp) return;
    G.hp--; G.lost++; G.stun = Math.max(G.stun, G.time + stun); G.stunT = txt; G.hitT = G.time;
    beep(150, 0.18, 0.07); beep(95, 0.25, 0.06, 0.08); try { navigator.vibrate && navigator.vibrate(80); } catch {}
    closeSafe(G);
    if (G.hp <= 0) { G.resp = G.time + stun + 0.3; cqToast('💔 <b>Niente più cuori!</b> Si ricomincia dal portone…'); }
  }
  function respawn(G) {
    G.resp = 0; G.hp = HP; G.slide = null; G.fall = null; cq.x = 17; cq.y = 28.3;
    if (G.has) { G.has = false; G.open = G.open.filter(i => i !== G.dia); cqToast('💎 Il diamante è tornato nel suo nascondiglio.'); }
  }
  // cosa c'e' nel mobile aperto (la cassaforte da' sempre un premio in piu')
  function openSpot(G, i) {
    G.open.push(i);
    const it = G.vb.items.find(o => o.i === i && CAT[o.k].on === 'spot'), safe = spots()[i].n === 'Cassaforte';
    if (it && it.k === 'dia') { G.has = true; beep(988, 0.1, 0.05); beep(1319, 0.2, 0.05, 0.1); if (safe) { G.bonus += 10; cqToast('💎 <b>Colpo da maestro!</b> Il diamante era in cassaforte: −10 secondi sul tuo tempo. Ora al portone!'); } else cqToast('💎 <b>Trovato!</b> Ora riportalo al portone, presto!'); return; }
    if (safe) { G.camOff = G.time + 10; cqToast('📺 In cassaforte c\'era il <b>telecomando</b>: le telecamere del padrone sono spente per 10 secondi!'); }
    if (it && it.k === 'fake') { G.stun = G.time + 3; G.stunT = '🎂 Torta in faccia!'; G.cake = G.time; beep(140, 0.25, 0.06); cqToast('🎂 <b>Era un diamante finto!</b> Torta in faccia…'); }
    else if (it && it.k === 'box') { G.cake = 0; hit(G, '🥊 PAF!', 1.5); cqToast('🥊 <b>Scatola a sorpresa!</b> Un guantone in faccia.'); }
    else if (!safe) { beep(220, 0.08, 0.03); cqToast(cqPickOne(['Vuoto…', 'Niente qui.', 'Solo polvere.', 'Acqua…', 'Qui non c\'è.'])); }
  }
  // le trappole sotto i piedi (o accanto, l'armatura) che non sono ancora scattate
  function trapTick(G, dt) {
    const x = Math.floor(cq.x), y = Math.floor(cq.y);
    for (const it of G.vb.items) {
      if (G.used.has(it.key) || G.fall) continue;
      const k = it.k, on = k === 'armatura' ? Math.hypot(cq.x - it.x - 0.5, cq.y - it.y - 0.5) < 1.15 : CAT[k].on === 'door' ? DOOR_IN(it, x, y) : it.x === x && it.y === y;
      if (!on || !['botola', 'buccia', 'rastrello', 'piano', 'vernice', 'finta', 'armatura'].includes(k)) continue;
      G.used.add(it.key); G.fx.push({ k, x: it.x + 0.5, y: it.y + 0.5, t: G.time, it });
      if (k === 'botola') { G.fall = { t: G.time, x: it.x + 0.5, y: it.y + 0.5 }; G.slide = null; hit(G, '🕳️ Botola! Aaaah…', 1.0); beep(500, 0.5, 0.05); beep(250, 0.5, 0.05, 0.2); }
      else if (k === 'buccia') { const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1; G.slide = { dx: (cq.wdx || 0.7) / l, dy: (cq.wdy || 0.7) / l, d: 0 }; hit(G, '🍌 Scivolone!', 1.3); beep(900, 0.3, 0.04); }
      else if (k === 'rastrello') hit(G, '🧹 SDENG!', 1.2);
      else if (k === 'piano') { G.pianos.push({ x: it.x + 0.5, y: it.y + 0.5, t: G.time }); beep(1400, 0.08, 0.03); beep(1200, 0.08, 0.03, 0.1); }
      else if (k === 'vernice') { G.paint = G.time; beep(300, 0.2, 0.05); cqToast('🪣 <b>SPLASH!</b> Vernice addosso: ora lasci le impronte, il padrone ti vede ovunque.'); }
      else if (k === 'finta') { G.rev.add(it.key); const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1; cq.x -= (cq.wdx || 0) / l * 0.7; cq.y -= (cq.wdy || 0) / l * 0.7; if (!cqFree(cq.x, cq.y)) { cq.x = G.px; cq.y = G.py; } hit(G, '🚧 BONK! Porta dipinta!', 1.0); }
      else if (k === 'armatura') hit(G, '🛡️ CLANG!', 1.0);
    }
    // pianoforti che cadono: chi e' ancora sotto dopo mezzo secondo viene preso
    for (const p of G.pianos) if (!p.done && G.time - p.t >= 0.55) {
      p.done = 1; beep(80, 0.5, 0.09); beep(160, 0.3, 0.06);
      if (Math.hypot(cq.x - p.x, cq.y - p.y) < 0.85) hit(G, '🎹 CRASH!', 2.0); else cqToast('🎹 <b>Per un pelo!</b> Il pianoforte ti è caduto alle spalle.');
    }
  }
  // cani: dormono; se passi vicino CORRENDO si svegliano, abbaiano e ti inseguono (7 s), poi tornano a cuccia. Quello della cucina dorme e basta
  function dogTick(G, dt, running) {
    for (const d of G.dogs) {
      if (!d.armed) continue;
      const dist = Math.hypot(cq.x - d.x, cq.y - d.y);
      if (d.st === 'sleep') { if (dist < 2.4 && running && !G.resp) { d.st = 'chase'; d.t = G.time; d.think = 0; d.bark = G.time; d.barkP = performance.now(); beep(520, 0.09, 0.06); beep(440, 0.12, 0.06, 0.12); } continue; }
      if ((d.think -= dt) <= 0) { d.think = 0.35; d.path = d.st === 'chase' ? cqPath(d.x, d.y, cq.x, cq.y) : cqPath(d.x, d.y, d.hx, d.hy); if (!d.path.length) d.path = [[d.st === 'chase' ? cq.x : d.hx, d.st === 'chase' ? cq.y : d.hy]]; }
      cqModeStep(d, dt, d.st === 'chase' ? 1.12 : 0.7);
      if (d.st === 'chase') {
        if (G.time - d.bark > 0.9) { d.bark = G.time; d.barkP = performance.now(); beep(500, 0.08, 0.05); }
        if (dist < 0.6 && !(G.stun > G.time)) { hit(G, '🐕 Morso!', 1.2); d.st = 'home'; d.think = 0; }
        else if (G.time - d.t > 7 || G.resp) { d.st = 'home'; d.think = 0; }
      } else if (Math.hypot(d.x - d.hx, d.y - d.hy) < 0.3) { d.st = 'sleep'; d.x = d.hx; d.y = d.hy; d.walk = 0; }
    }
  }

  // ---- CASSAFORTE: orecchio e manopola. Giri la manopola; sul numero giusto senti il clic (e il telefono vibra): resta li' fermo e si blocca. Tre numeri. ----
  function safeOpen(G, i) {
    const nums = []; while (nums.length < 3) { const n = Math.floor(Math.random() * 40); if (!nums.some(m => Math.abs(m - n) < 6)) nums.push(n); }
    G.safe = { i, nums, k: 0, val: 0, hold: 0, last: 0 };
    buildCss();
    const el = document.createElement('div'); el.id = 'trSafe';
    el.innerHTML = `<b>🔒 Cassaforte</b><div id="trSafeT">Gira la manopola. Quando senti il <b>clic</b>, fermati lì.</div><canvas id="trDial"></canvas><div id="trSafeN"></div><button class="btn" id="trSafeX" type="button">Lascia stare</button>`;
    document.body.appendChild(el);
    $('#trSafeX').onclick = () => closeSafe(G);
    const cv = $('#trDial'), sz = Math.min(260, window.innerWidth - 60), dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = sz * dpr; cv.height = sz * dpr; cv.style.width = cv.style.height = sz + 'px';
    let drag = null;
    const ang = e => { const r = cv.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - sz / 2, e.clientX - r.left - sz / 2); };
    cv.addEventListener('pointerdown', e => { drag = { a: ang(e), v: G.safe ? G.safe.fv || 0 : 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const S = G.safe; if (!drag || !S) return;
      let da = ang(e) - drag.a; da = Math.atan2(Math.sin(da), Math.cos(da)); drag.a = ang(e);
      S.fv = ((S.fv || 0) + da / (Math.PI * 2) * 40 + 40) % 40; const v = Math.round(S.fv) % 40;
      if (v !== S.val) { S.val = v; S.hold = 0; if (v === S.nums[S.k]) { beep(2400, 0.05, 0.06); beep(1800, 0.04, 0.05, 0.03); try { navigator.vibrate && navigator.vibrate(35); } catch {} } else beep(1200 + Math.random() * 300, 0.012, 0.012); }
    });
    cv.addEventListener('pointerup', () => { drag = null; });
    safeDraw(G);
  }
  function closeSafe(G) { const el = document.getElementById('trSafe'); if (el) el.remove(); if (G) G.safe = null; }
  function safeDraw(G) {
    const S = G.safe, cv = document.getElementById('trDial'); if (!S || !cv) return;
    const g = cv.getContext('2d'), sz = cv.width, r = sz / 2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sz, sz); g.translate(r, r);
    g.fillStyle = '#2a3634'; g.beginPath(); g.arc(0, 0, r * 0.98, 0, 7); g.fill();
    g.fillStyle = '#b8c0c8'; g.beginPath(); g.arc(0, 0, r * 0.86, 0, 7); g.fill();
    g.save(); g.rotate(-(S.fv || 0) / 40 * Math.PI * 2);
    g.fillStyle = '#22262e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + Math.round(r * 0.11) + 'px system-ui';
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 - Math.PI / 2; g.fillRect(Math.cos(a) * r * 0.78 - 1, Math.sin(a) * r * 0.78 - 1, 2, 2); if (i % 5 === 0) g.fillText(i, Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); }
    g.fillStyle = '#5a6068'; g.beginPath(); g.arc(0, 0, r * 0.38, 0, 7); g.fill(); g.fillStyle = '#8a9098'; g.fillRect(-r * 0.06, -r * 0.36, r * 0.12, r * 0.72);
    g.restore();
    g.fillStyle = '#e2553a'; g.beginPath(); g.moveTo(0, -r * 0.99); g.lineTo(-r * 0.06, -r * 0.88); g.lineTo(r * 0.06, -r * 0.88); g.fill();
    const n = document.getElementById('trSafeN'); if (n) { const t = S.nums.map((v, i) => i < S.k ? '✅' : i === S.k ? (S.val === v && S.hold > 0 ? '⏳' : '❔') : '🔒').join(' '); if (n.textContent !== t) n.textContent = t; }
  }
  function safeTick(G, dt) {
    const S = G.safe; if (!S) return;
    if (S.val === S.nums[S.k]) { S.hold += dt; if (S.hold >= 0.6) { S.k++; S.hold = 0; beep(880, 0.08, 0.05); beep(1320, 0.1, 0.05, 0.08); if (S.k >= 3) { const i = S.i; closeSafe(G); beep(660, 0.1, 0.05); beep(990, 0.18, 0.05, 0.1); openSpot(G, i); return; } } }
    safeDraw(G);
  }

  // ---- disegni del furto (sopra la mappa, in pixel dello schermo): cani, trappole scattate, segni, impronte ----
  function dogDraw(g, X, Y, TW, d, now) {
    const u = TW / 34, f = d.face || 1;
    g.save(); g.translate(X, Y); g.scale(f, 1);
    if (d.st === 'sleep') {
      g.fillStyle = '#a83434'; g.beginPath(); g.ellipse(0, 0, 15 * u, 7 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#c88a4a'; g.beginPath(); g.ellipse(2 * u, -4 * u, 10 * u, 5.5 * u, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-8 * u, -5 * u, 5 * u, 4.5 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(-6 * u, -2 * u, 2.5 * u, 4 * u, 0.3, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = u; g.beginPath(); g.moveTo(-11 * u, -6 * u); g.lineTo(-8 * u, -6 * u); g.stroke();
      g.restore(); g.fillStyle = 'rgba(255,255,255,.75)'; g.font = Math.round(9 * u) + 'px system-ui'; g.textAlign = 'center'; g.fillText('z', X + 10 * u, Y - 14 * u - (now / 400 % 1) * 6 * u); return;
    }
    const b = Math.sin(now / 70) * 1.5 * u;
    g.fillStyle = '#b07a3a'; for (const lx of [-7, -3, 4, 8]) g.fillRect(lx * u, -6 * u, 2.5 * u, 6 * u + (lx % 2 ? b : -b));
    g.fillStyle = '#c88a4a'; g.beginPath(); g.ellipse(1 * u, -9 * u, 11 * u, 5.5 * u, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(-11 * u, -15 * u, 5.5 * u, 5 * u, 0, 0, 7); g.fill(); g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(-9 * u, -12 * u, 2.5 * u, 4.5 * u, 0.4, 0, 7); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(-13 * u, -16 * u, 1.2 * u, 0, 7); g.fill(); g.beginPath(); g.arc(-16 * u, -14 * u, 1.5 * u, 0, 7); g.fill();
    g.strokeStyle = '#c88a4a'; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(11 * u, -11 * u); g.lineTo(15 * u, -17 * u + b); g.stroke();
    g.restore();
    if (d.st === 'chase' && now - (d.barkP || 0) < 350) { g.font = '900 ' + Math.round(12 * u) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText('WOOF!', X, Y - 28 * u); g.fillStyle = '#ffd24a'; g.fillText('WOOF!', X, Y - 28 * u); }
  }
  const cellPoly = (g, sx, sy, x0, y0, x1, y1, z, U) => { g.beginPath(); g.moveTo(sx(x0, y0), sy(x0, y0) - z * U); g.lineTo(sx(x1, y0), sy(x1, y0) - z * U); g.lineTo(sx(x1, y1), sy(x1, y1) - z * U); g.lineTo(sx(x0, y1), sy(x0, y1) - z * U); g.closePath(); };
  const pop = (g, X, Y, txt, k, TW) => { if (k < 0 || k > 1) return; g.globalAlpha = 1 - k; g.font = '900 ' + Math.round(TW * (0.38 + 0.15 * k)) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText(txt, X, Y - k * TW * 0.5); g.fillStyle = '#ffd24a'; g.fillText(txt, X, Y - k * TW * 0.5); g.globalAlpha = 1; };
  function raidDraw(g, G, sx, sy, TW) {
    const U = TW * 0.575, now = performance.now(), MN = G.opt.nt ? CQ_MODES.trappole.night(G) : null, lit = (x, y) => !MN || MN.see(x, y);
    const vis = (x, y) => { const X = sx(x, y), Y = sy(x, y); return X > -80 && Y > -80 && X < cq.w + 80 && Y < cq.h + 80; };
    // impronte di vernice
    if (G.paint) { g.fillStyle = 'rgba(60,120,220,.55)'; for (const [x, y, i] of G.steps) if (vis(x, y) && lit(x, y)) { g.beginPath(); g.ellipse(sx(x, y) + (i % 2 ? 3 : -3), sy(x, y), TW * 0.05, TW * 0.03, 0, 0, 7); g.fill(); } }
    // trappole gia' scattate (restano scariche e si vedono)
    for (const f of G.fx) {
      if (!vis(f.x, f.y) || !lit(f.x, f.y)) continue;
      const X = sx(f.x, f.y), Y = sy(f.x, f.y), k = (now / 1000) - (f.rt || (f.rt = now / 1000));
      if (f.k === 'botola') { cellPoly(g, sx, sy, f.x - 0.42, f.y - 0.42, f.x + 0.42, f.y + 0.42, 0, U); g.fillStyle = '#0e0a08'; g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.stroke(); pop(g, X, Y - TW * 0.4, 'AAAH!', k / 1.2, TW); }
      else if (f.k === 'buccia') { g.fillStyle = '#e8c840'; g.beginPath(); g.ellipse(X, Y, TW * 0.13, TW * 0.05, 0.3, 0, 7); g.fill(); pop(g, X, Y - TW, 'ZIIIP!', k / 1.2, TW); }
      else if (f.k === 'rastrello') { g.strokeStyle = '#7a5232'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.moveTo(X - TW * 0.3, Y + TW * 0.05); g.lineTo(X + TW * 0.25, Y - TW * 0.08); g.stroke(); g.strokeStyle = '#8a9098'; g.beginPath(); g.moveTo(X - TW * 0.33, Y - TW * 0.03); g.lineTo(X - TW * 0.27, Y + TW * 0.13); g.stroke(); pop(g, X, Y - TW * 1.4, 'SDENG!', k / 1.2, TW); }
      else if (f.k === 'vernice') { g.fillStyle = 'rgba(60,120,220,.75)'; g.beginPath(); g.ellipse(X, Y, TW * 0.3, TW * 0.13, 0, 0, 7); g.fill(); g.fillStyle = '#8a9098'; g.fillRect(X + TW * 0.15, Y - TW * 0.2, TW * 0.16, TW * 0.18); pop(g, X, Y - TW * 1.4, 'SPLASH!', k / 1.2, TW); }
      else if (f.k === 'finta') { for (const [a, b] of f.it.cells) { cellPoly(g, sx, sy, a + 0.38, b, a + 0.62, b + 1, 1.4, U); g.fillStyle = '#c8b48a'; g.fill(); } pop(g, X, Y - TW * 1.6, 'BONK!', k / 1.2, TW); }
      else if (f.k === 'armatura') pop(g, X, Y - TW * 2.2, 'CLANG!', k / 1.2, TW);
    }
    // pianoforti: ombra che si allarga, il piano che cade, poi i rottami
    for (const p of G.pianos) {
      const X = sx(p.x, p.y), Y = sy(p.x, p.y), k = Math.min(1, (G.time - p.t) / 0.55);
      if (!vis(p.x, p.y)) continue;
      g.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.4 * k) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 0.55 * (0.4 + 0.6 * k), TW * 0.28 * (0.4 + 0.6 * k), 0, 0, 7); g.fill();
      if (k < 1) { const z = (1 - k) * (1 - k) * 7 * U; g.fillStyle = '#1a1a22'; g.fillRect(X - TW * 0.45, Y - z - TW * 0.5, TW * 0.9, TW * 0.4); g.fillStyle = '#f4f2ec'; g.fillRect(X - TW * 0.4, Y - z - TW * 0.14, TW * 0.8, TW * 0.06); }
      else { g.fillStyle = '#1a1a22'; for (let i = 0; i < 5; i++) g.fillRect(X + (i - 2) * TW * 0.16, Y - TW * 0.08 - (i % 2) * TW * 0.06, TW * 0.13, TW * 0.08); g.fillStyle = '#f4f2ec'; g.fillRect(X - TW * 0.1, Y - TW * 0.02, TW * 0.22, TW * 0.04); pop(g, X, Y - TW * 0.6, 'CRASH!', (G.time - p.t - 0.55) / 1.2, TW); }
    }
    // i segni delle trappole: solo camminando piano, da vicino (e di notte dove arriva la luce)
    if (G.slow && !G.resp) for (const it of G.vb.items) {
      if (G.used.has(it.key) || !['botola', 'buccia', 'rastrello', 'piano', 'vernice', 'finta', 'armatura'].includes(it.k)) continue;
      const cx = it.x + 0.5, cy = it.y + 0.5; if (Math.hypot(cq.x - cx, cq.y - cy) > 1.9 || !lit(cx, cy)) continue;
      const X = sx(cx, cy), Y = sy(cx, cy); g.globalAlpha = 0.7;
      if (it.k === 'botola') { cellPoly(g, sx, sy, it.x + 0.12, it.y + 0.12, it.x + 0.88, it.y + 0.88, 0, U); g.strokeStyle = 'rgba(30,20,10,.8)'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]); }
      else if (it.k === 'buccia') { g.fillStyle = '#e8c840'; g.beginPath(); g.ellipse(X + TW * 0.1, Y + TW * 0.04, TW * 0.05, TW * 0.025, 0.5, 0, 7); g.fill(); }
      else if (it.k === 'rastrello') { g.strokeStyle = '#7a5232'; g.lineWidth = 2; g.beginPath(); g.moveTo(X - TW * 0.15, Y + TW * 0.05); g.lineTo(X + TW * 0.05, Y - TW * 0.02); g.stroke(); }
      else if (it.k === 'piano') { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y, TW * 0.3, TW * 0.15, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(220,200,160,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y - TW * 3); g.lineTo(X, Y - TW * 0.4); g.stroke(); }
      else if (it.k === 'vernice' || it.k === 'finta') { for (const [a, b] of it.cells) { cellPoly(g, sx, sy, a, b, a + 1, b + 1, 0, U); g.strokeStyle = it.k === 'vernice' ? 'rgba(60,120,220,.8)' : 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]); } if (it.k === 'vernice') { g.fillStyle = 'rgba(60,120,220,.8)'; g.beginPath(); g.arc(X, Y - TW * 0.05, TW * 0.04, 0, 7); g.fill(); } }
      else if (it.k === 'armatura') { g.fillStyle = '#ff3a3a'; const hy = Y - 2.05 * U; g.beginPath(); g.arc(X - TW * 0.04, hy, TW * 0.022, 0, 7); g.arc(X + TW * 0.04, hy, TW * 0.022, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
  }
  // i cani si disegnano sempre (anche nella mia villa: quello della cucina e' un mobile come gli altri)
  function dogsDraw(g, G, sx, sy, TW) {
    const MN = G.ph === 'raid' && G.opt.nt ? CQ_MODES.trappole.night(G) : null, now = performance.now();
    const list = G.ph === 'raid' && G.dogs ? G.dogs : DOG0.map(([x, y]) => ({ x, y, st: 'sleep', face: 1 }));
    for (const d of list) { if (MN && !MN.see(d.x, d.y)) continue; const X = sx(d.x, d.y), Y = sy(d.x, d.y); if (X < -60 || Y < -60 || X > cq.w + 60 || Y > cq.h + 60) continue; dogDraw(g, X, Y, TW, d, now); }
  }

  CQ_MODES.trappole = {
    n: 'La casa delle trappole',
    desc: '🪤 Due ladri, due ville identiche. Riempi la tua di trappole e nascondi il diamante; poi ruba quello dell\'altro mentre lui ti guarda dalle telecamere. <b>In costruzione</b>: per ora arredi la tua villa, la guardi e poi rubi nella villa del computer, tra botole, pianoforti, cani e la cassaforte (il padrone con le telecamere arriva nel prossimo passo).',
    maps: [['villa', 'Villa']],
    ns: [[2, '2']],
    def: { map: 'villa', n: 2, fill: true, nt: 0 },
    opts: o => `<div class="row"><div class="lbl">Ora del giorno</div>${seg('nt', [[0, '☀️ Giorno'], [1, '🌙 Notte']], o.nt ? 1 : 0)}<div class="hint">Di notte si vede solo dove punta la torcia.</div></div>`,
    read: d => ({ nt: +d.get('nt') ? 1 : 0 }),
    start(G) {
      setNight(G.opt.nt);
      G.ph = 'build'; G.bt = BUILD; G.mine = { items: [] }; G.open = []; G.has = false; G.srch = null; G.left = TIME; G.room = 'Ingresso'; G.stun = 0;
      for (const c of G.chars) { c.x = 16.5 + (c === G.me ? 0.5 : -0.5); c.y = 28.3; }
      cq.cam = { x: 16.5, y: 24.5 };
    },
    gstart(G) { setNight(G.opt.nt); G.ph = 'build'; G.bt = BUILD; G.mine = { items: [] }; G.open = []; G.room = 'Ingresso'; G.left = TIME; G.stun = 0; cq.cam = { x: 16.5, y: 24.5 }; },
    intro: () => '🔨 Gira per la tua villa e arredala: trappole e diamante!',
    hide: c => (!!c.bot && !c.sid) || !!(cq.g && c === cq.g.me && cq.g.fall && cq.g.time - cq.g.fall.t > 0.25),   // l'avversario del computer per ora non si vede; io dentro la botola
    // muri nuovi: le porte finte scoperte
    blk(G, x, y) { if (G.ph !== 'raid' || !G.rev || !G.rev.size) return false; const cx = Math.floor(x), cy = Math.floor(y); return G.vb.items.some(it => G.rev.has(it.key) && DOOR_IN(it, cx, cy)); },
    // trascinare poco il dito (o Maiuscolo sulla tastiera) = camminare piano: si vedono i segni delle trappole e i cani non si svegliano
    speed: c => { const G = cq.g; if (!G || c !== G.me) return 1; if (G.ph === 'build' || G.srch || G.safe || G.fall || G.slide || G.stun > G.time) return 0; const j = cq.joy; G.slow = G.ph === 'raid' && (j ? Math.hypot(j.x - j.x0, j.y - j.y0) < 52 : !!cq.keys.shift); return G.slow ? 0.45 : 1; },
    hud(G) {
      const P = G.ph === 'build' && cq.cam ? cq.cam : cq, r = roomName(P.x, P.y), rr = roomAt(Math.floor(P.x), Math.floor(P.y)); if (r && rr && !rr.door) G.room = r;
      const nt = G.opt.nt ? '🌙' : '☀️';
      if (G.ph === 'build') { const B = G.mine; return `🔨 📍 <b>${esc(G.room || '')}</b> · 🪙 ${BUDGET - spent(B)} · ★ ${JOLLY - count(B, it => CAT[it.k].jolly)} · ⏱ <b${G.bt < 10 ? ' style="color:#ff8a7a"' : ''}>${mmss(Math.max(0, G.bt))}</b>`; }
      if (G.ph === 'tour') return `🏠 La tua villa ${nt} · 📍 <b>${esc(G.room || '')}</b> · le trappole le vedi solo tu`;
      return `${'❤️'.repeat(Math.max(0, G.hp))}${'🖤'.repeat(Math.max(0, HP - G.hp))} ${G.slow ? '🐢' : '🏃'} · 📍 <b>${esc(G.room || '')}</b> · 🔍 ${G.open.length} · ${G.has ? '💎 <b>Al portone!</b> · ' : ''}⏱ ${mmss(Math.max(0, G.left))}`;
    },
    big: G => G.ph === 'raid' && G.left < 10 && G.left > 0 && G.phase === 'play' ? '⏱ ' + Math.ceil(G.left) + '…' : G.ph === 'raid' && G.stun > G.time ? (G.stunT || '') : '',
    spotNear(G) {
      if (G.ph !== 'raid' || G.srch || G.has || G.safe || G.fall || G.resp) return null;
      let best = null, bd = NEAR; spots().forEach((s, i) => { if (G.open.includes(i)) return; const d = spotDist(s, cq.x, cq.y); if (d < bd) { bd = d; best = Object.assign({}, s, { i }); } });
      return best;
    },
    btn(G) {
      if (G.ph === 'build') { const A = aim(G); if (A.item) return { t: '🗑️ Togli', on: true }; return { t: '📌 Metti', on: !!(A.t && !A.t.err) && !(CAT[U.tool].p > BUDGET - spent(G.mine)) }; }
      if (G.ph === 'tour') return { t: '▶ Ruba nella villa del computer', on: true };
      if (G.srch) return { t: '🔍 Cerco…', on: false };
      if (G.safe) return { t: '🔒 Scasso…', on: false };
      if (G.stun > G.time || G.fall || G.resp) return null;
      const s = this.spotNear(G); return s ? { t: '🔍 Apri: ' + s.n, on: true } : null;
    },
    act(G) {
      if (G.ph === 'build') { buildAct(G); return; }
      if (G.ph === 'tour') { raidStart(G); return; }
      if (G.ph !== 'raid' || G.stun > G.time || G.safe) return;
      const s = this.spotNear(G); if (!s) return;
      if (s.n === 'Cassaforte') { safeOpen(G, s.i); beep(320, 0.05, 0.03); return; }
      G.srch = { i: s.i, t0: G.time, d: s.h >= 2 ? 2 : 1, x: s.x + 0.5, y: s.y + 0.5 };
      beep(320, 0.05, 0.03);
    },
    tick(G, dt) {
      if (G.ph === 'build') {
        if (!document.getElementById('trBar')) buildOpen(G);
        if (!cq.cam) cq.cam = { x: 16.5, y: 24.5 };
        G.bt -= dt;
        const A = aim(G), tip = document.getElementById('trTip'), C2 = CAT[U.tool];
        const txt = A.item ? '🗑️ ' + CAT[A.item.k].e + ' ' + CAT[A.item.k].n + ' — tocca Togli per toglierla' : !C2 ? '' : (A.t && !A.t.err ? C2.e + ' ' + C2.n + (aimName(A.t) ? ' → ' + aimName(A.t) : '') : C2.e + ' ' + C2.n + ': ' + (A.t ? A.t.err : ''));
        if (tip && tip.textContent !== txt) tip.textContent = txt;
        if (G.bt <= 0) buildEnd(G);
        return;
      }
      if (G.ph !== 'raid') return;
      G.left -= dt;
      if (G.fall && G.time - G.fall.t > 1.0) { G.fall = null; if (!G.resp) { cq.x = 17; cq.y = 28.3; cqToast('🕳️ Sei finito in cantina… e di nuovo all\'ingresso!'); } }
      if (G.resp && G.time >= G.resp) respawn(G);
      if (G.slide) { const st = 7 * dt, nx = cq.x + G.slide.dx * st, ny = cq.y + G.slide.dy * st; if (G.slide.d < 3 && cqFree(nx, ny) && !this.blk(G, nx, ny)) { cq.x = nx; cq.y = ny; G.slide.d += st; } else G.slide = null; }
      const sp2 = Math.hypot(cq.x - G.px, cq.y - G.py) / Math.max(dt, 0.001); G.px = cq.x; G.py = cq.y;
      if (G.paint && (!G.steps.length || Math.hypot(cq.x - G.steps[G.steps.length - 1][0], cq.y - G.steps[G.steps.length - 1][1]) > 0.55)) { G.steps.push([cq.x, cq.y, G.steps.length]); if (G.steps.length > 400) G.steps.shift(); }
      trapTick(G, dt); dogTick(G, dt, sp2 > 2.4 && !G.slide); safeTick(G, dt);
      const S = G.srch;
      if (S) {
        if (Math.floor((G.time - S.t0) * 6) !== Math.floor((G.time - S.t0 - dt) * 6)) beep(180 + Math.random() * 160, 0.03, 0.015);   // fruscio mentre si fruga
        if (G.time - S.t0 >= S.d) {
          G.srch = null; openSpot(G, S.i);
        }
      }
      if (G.has && !G.resp && atPorch(cq.x, cq.y)) { this.finish(G, true); return; }
      if (G.left <= 0) this.finish(G, false);
    },
    finish(G, ok) {
      buildClose(); closeSafe(G);
      const sp = spots()[G.dia], name = G.me.name + ' (tu)', t = Math.max(0, G.time - (G.t0 || 0) - (G.bonus || 0)), lost = G.lost ? ' Cuori persi: ' + G.lost + '.' : ' Nessuna trappola presa!';
      if (ok) cqModeEnd({ t: '💎 Diamante rubato!', why: 'Ce l\'hai fatta in <b>' + mmss(t) + '</b>' + (G.bonus ? ' (con lo sconto della cassaforte)' : '') + ', aprendo ' + G.open.length + ' mobili. Era: ' + esc(sp.n) + ' (' + esc(roomName(sp.x, sp.y)) + ').' + lost, win: [G.me.id], rank: [[name, '— ' + mmss(t)]] });
      else cqModeEnd({ t: '⏱ Tempo scaduto!', why: G.has ? 'Avevi il diamante, ma non sei arrivato al portone in tempo.' : 'Il diamante era: <b>' + esc(sp.n) + '</b> (' + esc(roomName(sp.x, sp.y)) + ').', win: [], rank: [[name, '— ' + G.open.length + ' mobili aperti']] });
    },
    // diamante sopra la testa di chi lo porta; torta in faccia
    deco(g, c, X, Y, TW, G, L) {
      if (c !== G.me) return;
      const u = TW / 34;
      if (G.has) diamond(g, X, Y - (cqTop(L) + 0.5) * TW + Math.sin(performance.now() / 200) * 2 * u, 9 * u);
      if (G.stun > G.time && !(G.cake && G.time - G.cake < 3) && !G.fall) { const hy = Y - cqTop(L) * TW * 0.95, a0 = performance.now() / 160; for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; g.fillStyle = i % 2 ? '#ffd24a' : '#fff4a0'; g.font = Math.round(11 * u) + 'px system-ui'; g.textAlign = 'center'; g.fillText('★', X + Math.cos(a) * 12 * u, hy + Math.sin(a) * 4 * u); } }
      if (G.paint && G.ph === 'raid') { g.fillStyle = 'rgba(60,120,220,.8)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X + (i - 2) * 4 * u, Y - cqTop(L) * TW * (0.75 + 0.05 * (i % 2)) + (i % 3) * 3 * u, 2.4 * u, 0, 7); g.fill(); } }
      if (G.cake && G.time - G.cake < 3) { const hy = Y - cqTop(L) * TW * 0.78; g.fillStyle = '#fff6e8'; g.beginPath(); g.ellipse(X, hy, 11 * u, 8 * u, 0, 0, 7); g.fill(); g.fillStyle = '#e86a8a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X - 7 * u + i * 5 * u, hy - 6 * u + (i % 2) * 3 * u, 2 * u, 0, 7); g.fill(); } }
    },
    // sopra la mappa: nella mia villa le cose che ho messo (solo io le vedo); nel furto la barra del frugare e la spunta sui mobili aperti
    over(g, G, sx, sy, TW) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      dogsDraw(g, G, sx, sy, TW);
      if (G.ph === 'raid') raidDraw(g, G, sx, sy, TW);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if ((G.ph === 'tour' || G.ph === 'build') && G.mine) {
        if (G.ph === 'build') aimDraw(g, G, sx, sy, TW);
        const bob = Math.sin(performance.now() / 300) * TW * 0.04;
        for (const it of G.mine.items) {
          const xs = it.cells.map(c => c[0]), ys = it.cells.map(c => c[1]), cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
          const X = sx(cx, cy), Y = sy(cx, cy) - TW * (CAT[it.k].on === 'spot' || CAT[it.k].on === 'armor' ? 1.25 : CAT[it.k].on === 'room' ? 2.2 : 0.35) + bob;
          if (X < -60 || Y < -60 || X > cq.w + 60 || Y > cq.h + 60) continue;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = CAT[it.k].jolly ? 'rgba(255,210,74,.7)' : 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(X, Y, TW * 0.24, 0, 7); g.fill();
          g.font = Math.round(TW * 0.3) + 'px system-ui,sans-serif'; g.fillText(CAT[it.k].e, X, Y + 1);
        }
        return;
      }
      if (G.ph !== 'raid') return;
      const sp = spots();
      g.font = Math.round(TW * 0.28) + 'px system-ui,sans-serif';
      for (const i of G.open) { const s = sp[i]; if (!s) continue; const X = sx(s.x + 0.5, s.y + 0.5), Y = sy(s.x + 0.5, s.y + 0.5) - TW * 0.9; if (X < -50 || Y < -50 || X > cq.w + 50 || Y > cq.h + 50) continue; g.globalAlpha = 0.75; g.fillText('✔️', X, Y); g.globalAlpha = 1; }
      const S = G.srch; if (!S) return;
      const k = Math.min(1, (G.time - S.t0) / S.d), X = sx(cq.x, cq.y), Y = sy(cq.x, cq.y) - TW * 2.2;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(X, Y, TW * 0.32, 0, 7); g.fill();
      g.strokeStyle = '#ffd24a'; g.lineWidth = TW * 0.08; g.beginPath(); g.arc(X, Y, TW * 0.24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
      g.fillText('🔍', X, Y + 1);
    },
    // notte: buio, si vede solo vicino e dove punta la torcia; restano accese le lampade (poca luce). Nella mia villa, in costruzione e nel giro, c'e' luce
    night(G) {
      if (!G.opt.nt || G.ph !== 'raid') return null;
      const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1, dx = (cq.wdx || 0.5) / l, dy = (cq.wdy || 0.5) / l;
      const lights = [[cq.x + dx * 2.6, cq.y + dy * 2.6, 3.4, 0.92], [cq.x + dx * 4.6, cq.y + dy * 4.6, 2.2, 0.6]];
      for (const p of CQ_PROPS) if (p[0] === 'lamp' || p[0] === 'rlamp' || p[0] === 'nightstand') lights.push([p[1] + 0.5, p[2] + 0.5, 1.6, 0.45]);
      lights.push([PORCH.x0 - 0.5, PORCH.y + 0.5, 1.4, 0.5], [PORCH.x1 + 0.5, PORCH.y + 0.5, 1.4, 0.5]);
      return { a: 0.94, r: 2.2, lights, see: (x, y) => Math.hypot(x - cq.x, y - cq.y) < 2.4 || Math.hypot(x - cq.x - dx * 3, y - cq.y - dy * 3) < 2.8 };
    }
  };
  // mirino della preparazione: rombo sulla casella (verde = si puo', rosso = no; giallo = c'e' gia' una cosa da togliere), mobile/porta evidenziati
  function aimDraw(g, G, sx, sy, TW) {
    const A = aim(G), c = cq.cam || cq, ok = A.item ? 'rgba(255,210,74,' : A.t && !A.t.err ? 'rgba(90,230,120,' : 'rgba(255,90,80,';
    const cells = A.item ? A.item.cells : A.t && !A.t.err && CAT[U.tool].on !== 'room' ? A.t.cells : [[A.x, A.y]];
    const pulse = 0.5 + 0.25 * Math.sin(performance.now() / 180);
    for (const [x, y] of cells) {
      g.beginPath(); g.moveTo(sx(x, y), sy(x, y)); g.lineTo(sx(x + 1, y), sy(x + 1, y)); g.lineTo(sx(x + 1, y + 1), sy(x + 1, y + 1)); g.lineTo(sx(x, y + 1), sy(x, y + 1)); g.closePath();
      g.fillStyle = ok + (0.22 * pulse + 0.1) + ')'; g.fill(); g.strokeStyle = ok + '.95)'; g.lineWidth = Math.max(2, TW / 22); g.stroke();
    }
    // il centro del mirino (dove punta la telecamera)
    const X = sx(c.x, c.y), Y = sy(c.x, c.y); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, TW * 0.09, 0, 7); g.moveTo(X - TW * 0.2, Y); g.lineTo(X - TW * 0.12, Y); g.moveTo(X + TW * 0.12, Y); g.lineTo(X + TW * 0.2, Y); g.stroke();
  }
  // se si esce dalla partita durante la preparazione, catalogo e pianta si chiudono da soli e la telecamera torna normale
  setInterval(() => { const G = cq.g; if (document.getElementById('trSafe') && (!G || G.mode !== 'trappole' || G.phase !== 'play')) closeSafe(G); if (document.getElementById('trBar') && (!G || G.mode !== 'trappole' || G.ph !== 'build' || G.phase !== 'play')) { buildClose(); if (!G || G.mode !== 'nascondino') cq.cam = null; } }, 400);
  window.__tr = { CAT, place, target, cpuBuild, spent, spots, buildEnd, raidStart, U, aim, buildAct, planOpen, BUDGET, safeOpen, closeSafe };   // per le prove
  // diamante disegnato a faccette, con lo scintillio
  function diamond(g, X, Y, r) {
    const P = [[0, -0.55], [0.6, -0.55], [1, -0.1], [0, 1], [-1, -0.1], [-0.6, -0.55]].map(([a, b]) => [X + a * r, Y + b * r]);
    g.fillStyle = '#9ad8ff'; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
    g.fillStyle = '#d8f4ff'; g.beginPath(); g.moveTo(X - 0.6 * r, Y - 0.55 * r); g.lineTo(X + 0.6 * r, Y - 0.55 * r); g.lineTo(X + 1 * r, Y - 0.1 * r); g.lineTo(X - 1 * r, Y - 0.1 * r); g.closePath(); g.fill();
    g.fillStyle = '#5aa8e8'; g.beginPath(); g.moveTo(X, Y + r); g.lineTo(X + r, Y - 0.1 * r); g.lineTo(X + 0.25 * r, Y - 0.1 * r); g.closePath(); g.fill();
    g.strokeStyle = '#2a5a8a'; g.lineWidth = Math.max(1, r / 7); g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.stroke();
    const s = (performance.now() / 300) % 3; if (s < 1) { g.fillStyle = 'rgba(255,255,255,' + (1 - s) + ')'; g.beginPath(); g.arc(X - 0.4 * r, Y - 0.35 * r, r * 0.22 * (1 + s), 0, 7); g.fill(); }
  }
})();
