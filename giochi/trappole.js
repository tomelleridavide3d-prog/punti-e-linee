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
#trSafe{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;background:rgba(16,12,22,.95);color:#f2ead8;border-radius:16px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px;font:14px system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.5)}#trSafe canvas{touch-action:none}#trSafeN{font-size:22px;letter-spacing:4px}
#trCams{position:absolute;left:8px;right:110px;bottom:24px;z-index:5;display:flex;flex-wrap:wrap;gap:6px}#trCams button{border:1px solid rgba(255,255,255,.25);background:rgba(20,22,28,.82);color:#fff;border-radius:10px;padding:8px 10px;font:700 13px system-ui,sans-serif}#trCams button.on{border-color:#ffd24a;background:rgba(90,70,30,.92)}#trCams button.blink{background:#c8402a;border-color:#ffb0a0}#trCams .none{color:#fff;font:14px system-ui;background:rgba(20,22,28,.8);padding:8px 10px;border-radius:10px}
#trCloak{position:absolute;left:18px;bottom:150px;z-index:5;width:76px;height:76px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:rgba(40,60,90,.85);color:#fff;font:700 13px system-ui,sans-serif}#trCloak.on{background:#3a8ac8;box-shadow:0 0 18px #9ad8ff}#trCloak.used{opacity:.4}\n#trHelp{position:absolute;left:12px;right:12px;bottom:250px;z-index:6;background:rgba(16,12,22,.93);color:#f2ead8;border:1px solid rgba(255,210,74,.5);border-radius:14px;padding:12px 14px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)}#trHelp button{display:block;margin:10px auto 0}\n.trRules{margin-top:10px}.trRules summary{cursor:pointer;font-weight:700}.trRules p{margin:6px 0;font-size:14px;line-height:1.4}`;
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
    $('#trDone').onclick = () => { const G2 = cq.g; if (G2 && G2.ph === 'build') buildDone(G2); };
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
  // fine della mia preparazione: la villa resta mia (G.mine) e va all'host; aspetto l'altro
  function buildDone(G) {
    buildClose();
    if (!G.mine.items.some(it => it.k === 'dia')) { const s = spots()[Math.floor(Math.random() * spots().length)]; place(G.mine, 'dia', s.x, s.y); cqToast('💎 Non avevi nascosto il diamante: l\'ho messo io in <b>' + esc(s.n) + '</b>.'); }
    G.ph = 'wait'; G.villa[G.me.id] = G.mine;
    beep(523, 0.08, 0.04); beep(784, 0.12, 0.04, 0.09);
    if (G.guest) cqNetSend({ k: 'vb', v: vPack(G.mine) }); else if (G.st) G.st.done[G.me.id] = 1;
  }

  // ---- SUONI comici (fatti a mano con l'audio del motore: note che scivolano e rumore filtrato) ----
  let sfxBuf = null;
  function sfxOk() { if (!store.settings.sound) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } }
  function swp(f0, f1, d, v, delay = 0, type = 'sine') {
    const A = sfxOk(); if (!A) return;
    try { const t = A.currentTime + delay, o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(0.5, v * 3), t + Math.min(0.02, d / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(A.destination); o.start(t); o.stop(t + d + 0.03); } catch {}
  }
  function nz(d, fq, v, delay = 0, type = 'bandpass', q = 0.8) {
    const A = sfxOk(); if (!A) return;
    try { if (!sfxBuf) { sfxBuf = A.createBuffer(1, Math.floor(A.sampleRate * 1.2), A.sampleRate); const D2 = sfxBuf.getChannelData(0); for (let i = 0; i < D2.length; i++) D2[i] = Math.random() * 2 - 1; }
      const t = A.currentTime + delay, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = sfxBuf; fl.type = type; fl.frequency.value = fq; fl.Q.value = q;
      g.gain.setValueAtTime(Math.min(0.6, v * 3), t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl).connect(g).connect(A.destination); s.start(t); s.stop(t + d + 0.05); } catch {}
  }
  const SFX = {
    botola: () => { swp(180, 120, 0.12, 0.05, 0, 'square'); swp(1200, 140, 0.9, 0.05, 0.08); nz(0.3, 300, 0.12, 0.95, 'lowpass'); },
    buccia: () => { swp(260, 1400, 0.35, 0.05, 0, 'sawtooth'); nz(0.25, 200, 0.12, 0.4, 'lowpass'); },
    rastrello: () => { swp(900, 700, 0.25, 0.05, 0, 'square'); swp(1350, 1100, 0.3, 0.04, 0.01, 'square'); nz(0.08, 2500, 0.08); },
    piano: () => { swp(1600, 1500, 0.08, 0.03, 0, 'triangle'); swp(1300, 1250, 0.08, 0.03, 0.1, 'triangle'); },
    crash: () => { nz(0.7, 400, 0.18, 0, 'lowpass'); for (const [f, d] of [[130, 0], [155, 0.02], [185, 0.04], [233, 0.06]]) swp(f, f * 0.7, 0.9, 0.04, d, 'triangle'); },
    vernice: () => { nz(0.35, 1100, 0.14); swp(500, 200, 0.25, 0.03, 0.05); },
    finta: () => { swp(220, 110, 0.2, 0.08, 0, 'triangle'); nz(0.12, 250, 0.12, 0, 'lowpass'); },
    armatura: () => { swp(1500, 1300, 0.5, 0.04, 0, 'square'); swp(2100, 1900, 0.45, 0.03, 0.01, 'square'); nz(0.15, 4000, 0.06); },
    bark: () => { swp(700, 420, 0.1, 0.06, 0, 'sawtooth'); swp(650, 380, 0.12, 0.06, 0.16, 'sawtooth'); },
    bite: () => { nz(0.08, 1500, 0.15); swp(400, 200, 0.15, 0.05, 0.02, 'square'); },
    lampadario: () => { for (let i = 0; i < 7; i++) swp(2400 + Math.random() * 1500, 2000, 0.15, 0.02, i * 0.06); },
    jlcrash: () => { nz(0.6, 3000, 0.12, 0, 'highpass'); for (let i = 0; i < 10; i++) swp(2000 + Math.random() * 2500, 1500, 0.2, 0.025, i * 0.03); nz(0.3, 300, 0.1, 0, 'lowpass'); },
    sbatte: () => { nz(0.25, 180, 0.2, 0, 'lowpass'); swp(150, 60, 0.3, 0.07, 0, 'triangle'); },
    torta: () => { nz(0.3, 600, 0.12, 0, 'lowpass'); swp(300, 120, 0.3, 0.04, 0.03); },
    boing: () => { swp(180, 700, 0.12, 0.06); swp(700, 250, 0.25, 0.05, 0.12); swp(250, 500, 0.2, 0.04, 0.35); },
    mantello: () => { swp(400, 2400, 0.6, 0.03); swp(600, 3200, 0.6, 0.02, 0.05); },
    fruscio: () => nz(0.35, 2500, 0.05),
    ok: () => { for (const [f, d] of [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]]) swp(f, f, 0.22, 0.05, d, 'triangle'); },
    ko: () => { for (const [f, d] of [[392, 0], [330, 0.18], [262, 0.36]]) swp(f, f * 0.97, 0.3, 0.05, d, 'triangle'); }
  };
  const sfx = k => { try { (SFX[k] || (() => {}))(); } catch {} };

  // ---- SPIEGAZIONI BREVI: la prima volta di ogni fase, una scheda in basso (non ferma il tempo) ----
  const HELP = {
    build: '<b>🔨 Arreda la tua villa</b><br>Trascina il dito per volare per la casa. Scegli dal catalogo in alto e premi <b>📌 Metti</b> dove il mirino è verde.<br>💎 Nascondi il diamante in un mobile · 🎂 due finti per ingannare · 🪤 trappole sul pavimento e sulle porte · 📹 telecamere (le userai per guardare il ladro) · ★ due jolly da far scattare tu.',
    raid: '<b>🏚️ Ruba il diamante</b><br>Apri i mobili per cercarlo, poi <b>riportalo al portone</b>. Trascina <b>poco</b> il dito per andare piano 🐢: vedi i segni delle trappole e i cani non si svegliano. Il padrone ti guarda dalle telecamere: 🧥 il mantello ti rende invisibile per 5 secondi (una volta sola). La cassaforte si apre girando la manopola: fermati quando senti il clic.',
    guard: '<b>🛡️ Difendi la tua villa</b><br>Guardi il ladro dalle telecamere: cambiale con i pulsanti in basso (lampeggiano quando nella stanza succede qualcosa). Quando il ladro è vicino a un tuo jolly compare il pulsante rosso: <b>fallo scattare al momento giusto</b>!'
  };
  function helpOnce(k) {
    let seen = {}; try { seen = JSON.parse(localStorage.getItem('trHelp') || '{}'); } catch {}
    if (seen[k] || !HELP[k]) return; seen[k] = 1; try { localStorage.setItem('trHelp', JSON.stringify(seen)); } catch {}
    buildCss(); const old = document.getElementById('trHelp'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'trHelp'; el.innerHTML = HELP[k] + '<button class="btn primary" type="button">Ho capito ✓</button>';
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    el.querySelector('button').onclick = () => el.remove(); $('#ciack').appendChild(el); setTimeout(() => el.remove(), 16000);
  }
  const RULES = '<details class="trRules"><summary>📖 Come si gioca</summary><p>Due ladri, due ville <b>identiche</b>. Al meglio di <b>3 manche</b>.</p><p><b>1. Preparazione</b> (90 s, poi 40 s nelle manche dopo): giri per la tua villa e nascondi il <b>diamante</b> in un mobile, metti <b>diamanti finti</b> (torta in faccia!), <b>trappole</b> (botola, pianoforte che cade, buccia, rastrello, cane che dorme, vernice, porta finta, armatura) e <b>telecamere</b>, con 100 monete. I 2 <b>jolly</b> (lampadario, porta che sbatte, armatura che cade) li fai scattare tu.</p><p><b>2. Furti</b>: uno alla volta si ruba nella villa dell\'altro. Chi ruba ha 3 ❤️ e 90 secondi per trovare il diamante e riportarlo al portone; trascinando poco il dito va piano e vede i segni delle trappole; ha il 🧥 mantello (5 s invisibile). Chi difende guarda dalle telecamere e fa scattare i jolly.</p><p><b>3.</b> Vince la manche chi ruba più in fretta. Nelle manche dopo l\'altro sa dov\'era il tuo diamante… lo sposti o no?</p></details>';

  // ---- MOVIOLA: durante ogni furto ogni telefono registra il ladro (posizione e cuori) e i momenti delle trappole;
  // a fine manche si rivede al rallentatore il momento piu' bello (lampadario in testa, pianoforte, botola…) ----
  function recTick(G) {
    if (G.ph !== 'raid' && G.ph !== 'guard') return; const P = TP(G); if (!P || !G.rec) return;
    const L = G.rec.pts, last = L[L.length - 1]; if (last && G.time - last[0] < 0.1) return;
    L.push([Math.round(G.time * 100) / 100, Math.round(P.x * 100) / 100, Math.round(P.y * 100) / 100, (P === cq ? cq.face : P.face) || 1, G.hp, G.ph === 'raid' && G.fall ? 1 : 0]); if (L.length > 1200) L.shift();
  }
  const MV = { jl: [10, '💡 Lampadario in testa a '], piano: [9, '🎹 Pianoforte addosso a '], botola: [8, '🕳️ Giù per la botola: '], ja: [7, '⚔️ Armatura addosso a '], jp: [6, '💨 Porta in faccia a '], buccia: [5, '🍌 Che scivolone, '], armatura: [5, '🛡️ L\'armatura colpisce '], rastrello: [4, '🧹 SDENG! Povero '], finta: [4, '🚧 Contro la porta dipinta: '], vernice: [2, '🪣 Tutto blu: '] };
  // il momento piu' bello del furto appena finito (colpito vale di piu' di mancato, mancato per un pelo vale comunque)
  function recBest(G) {
    const R = G.rec; if (!R || !R.pts.length) return null; let best = null;
    const hitAt = t => { const a = R.pts.find(p => p[0] >= t - 0.05), b = R.pts.find(p => p[0] >= t + 1.3) || R.pts[R.pts.length - 1]; return a && b && b[4] < a[4]; };
    const cand = G.fx.filter(f => f.k !== 'piano').map(f => ({ k: f.k, t: f.t, x: f.x, y: f.y })).concat(G.pianos.map(p => ({ k: 'piano', t: p.t + 0.55, x: p.x, y: p.y })))
      .concat(G.jfx.map(f => { const [x, y] = jCenter(f.it); return { k: f.k, t: f.t + (f.k === 'jl' ? 0.5 : f.k === 'ja' ? 0.4 : 0), x, y }; }));
    for (const c of cand) { if (!MV[c.k]) continue; const hit = c.k === 'botola' || c.k === 'vernice' || hitAt(c.t - 0.1); const v = MV[c.k][0] * (hit ? 1 : 0.55); if (!best || v > best.v) best = Object.assign(c, { v, hit }); }
    if (!best) return null;
    const nm = G.thiefC ? G.thiefC.name : G.me.name;
    return Object.assign(best, { pts: R.pts.filter(p => p[0] > best.t - 2.4 && p[0] < best.t + 2.4), look: G.thiefC && G.thiefC !== G.me ? cqLookOf(G.thiefC) : cqLook(), cap: best.hit ? MV[best.k][1] + nm + '!' : '😮 Per un pelo! ' + nm + ' la scampa…' });
  }
  // disegno della moviola (nella fase del risultato): il ladro al rallentatore e la trappola
  function mvDraw(g, G, sx, sy, TW) {
    const m = G.mv; if (!m || !m.pts.length) return;
    const e = G.time - G.st.t0, D = 6; if (e > D) return;
    const rt = m.t - 1.8 + e * 0.6, U2 = TW * 0.575;   // rallentatore: 0,6 volte
    let p = m.pts[0]; for (const q of m.pts) { if (q[0] <= rt) p = q; else break; }
    const X = sx(p[1], p[2]), Y = sy(p[1], p[2]);
    // la trappola
    const a = rt - m.t, MX = sx(m.x, m.y), MY = sy(m.x, m.y);
    if (m.k === 'jl') { const k = Math.min(1, Math.max(0, (a + 0.5) / 0.5)); g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * k) + ')'; g.beginPath(); g.ellipse(MX, MY, TW * 2 * k, TW * k, 0, 0, 7); g.fill(); const z = a < 0 ? (a * a) * 24 * U2 + 0.3 * U2 : 0.1 * U2; g.strokeStyle = '#c8a050'; g.lineWidth = Math.max(2, TW / 16); g.beginPath(); g.ellipse(MX, MY - z, TW * 0.5, TW * 0.22, 0, 0, 7); g.stroke(); }
    if (m.k === 'piano') { const k = Math.min(1, Math.max(0, (a + 0.55) / 0.55)); g.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.4 * k) + ')'; g.beginPath(); g.ellipse(MX, MY, TW * 0.55 * k, TW * 0.28 * k, 0, 0, 7); g.fill(); if (a < 0) { const z = (a * a) * 23 * U2; g.fillStyle = '#1a1a22'; g.fillRect(MX - TW * 0.45, MY - z - TW * 0.5, TW * 0.9, TW * 0.4); } }
    if (m.k === 'botola' && a >= 0) { g.fillStyle = '#0e0a08'; g.beginPath(); g.ellipse(MX, MY, TW * 0.42, TW * 0.21, 0, 0, 7); g.fill(); }
    if (m.k === 'buccia' && a < 0) { g.fillStyle = '#e8c840'; g.beginPath(); g.ellipse(MX, MY, TW * 0.13, TW * 0.05, 0.3, 0, 7); g.fill(); }
    // il ladro (non durante la caduta nella botola)
    if (!(m.k === 'botola' && a > 0.25) && !p[5]) { try { cqPlayer(g, X, Y, TW, m.look, Math.floor(rt * 10) % 2 ? 1 : 0, p[3] || 1); } catch {} if (a > 0 && a < 1.6 && m.hit) { g.fillStyle = '#ffd24a'; g.font = Math.round(TW * 0.3) + 'px system-ui'; for (let i = 0; i < 4; i++) { const an = rt * 6 + i * Math.PI / 2; g.fillText('★', X + Math.cos(an) * TW * 0.35, Y - TW * 1.5 + Math.sin(an) * TW * 0.12); } } }
    if (a >= 0 && a < 1.2) { g.globalAlpha = 1 - a / 1.2; g.font = '900 ' + Math.round(TW * 0.55) + 'px system-ui'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000'; const w = { jl: 'CRASH!', piano: 'CRASH!', botola: 'AAAH!', ja: 'CLANG!', jp: 'SBAM!', buccia: 'ZIIIP!', armatura: 'CLANG!', rastrello: 'SDENG!', finta: 'BONK!', vernice: 'SPLASH!' }[m.k] || ''; g.strokeText(w, MX, MY - TW * 1.8); g.fillStyle = '#ffd24a'; g.fillText(w, MX, MY - TW * 1.8); g.globalAlpha = 1; }
  }
  // cornice della moviola (in pixel dello schermo): bande nere, scritta, didascalia
  function mvFrame(g, G) {
    const m = G.mv; if (!m) return; const e = G.time - G.st.t0; if (e > 6) return;
    const W2 = cq.w, H2 = cq.h, bh = Math.min(70, H2 * 0.09);
    g.fillStyle = '#000'; g.fillRect(0, 0, W2, 150); g.fillRect(0, H2 - bh, W2, bh);
    g.font = '700 14px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = Math.floor(e * 2) % 2 ? '#ff3a3a' : '#fff'; g.fillText('📼 MOVIOLA ×0,6', 14, 134);
    g.textAlign = 'center'; g.font = '700 16px system-ui'; g.fillStyle = '#fff'; g.fillText(m.cap, W2 / 2, H2 - bh / 2);
  }

  // ---- PARTITA: al meglio di 3 manche. Ogni manche: preparazione (ognuno la sua villa), due furti (chi ruba per primo si alterna), risultato.
  // Le fasi le decide l'host (G.st, nello stato per gli amici). Il furto lo simula il telefono di CHI RUBA (movimento immediato) e lo manda
  // a chi guarda (rsPack/rsApply); i jolly del padrone fanno la strada opposta. Contro il computer: e' lui l'altro (ruba, guarda, sposta le cose).
  const charById = (G, id) => G.chars.find(c => c.id === id);
  const isCpu = c => !!(c && c.bot && !c.sid);
  const vPack = B => B.items.map(it => it.k + ',' + it.x + ',' + it.y).join(';');
  function vUnpack(s) {
    const B = { items: [] }; for (const p of String(s || '').split(';')) { if (!p) continue; const [k, x, y] = p.split(','); if (CAT[k]) place(B, k, +x, +y); }
    if (!B.items.some(it => it.k === 'dia')) { const sp = spots()[0]; place(B, 'dia', sp.x, sp.y); }
    return B;
  }
  // il computer tra una manche e l'altra: meta' delle volte sposta il diamante (l'altro ha visto dov'era: lo sposta o no?), a volte un finto e due trappole
  function cpuMove(B) {
    const S = spots(), N = { items: B.items.map(it => Object.assign({}, it)) }, pick = a => a[Math.floor(Math.random() * a.length)];
    const freeSpots = () => S.filter(s => !N.items.some(it => CAT[it.k].on === 'spot' && it.x === s.x && it.y === s.y));
    if (Math.random() < 0.5) { const s = pick(freeSpots()); if (s) place(N, 'dia', s.x, s.y); }
    if (Math.random() < 0.5) { const f = N.items.find(it => it.k === 'fake'); if (f) { N.items = N.items.filter(it => it !== f); const s = pick(freeSpots()); if (s) place(N, 'fake', s.x, s.y); } }
    const fl = N.items.filter(it => CAT[it.k].on === 'floor' && !CAT[it.k].jolly);
    for (let i = 0; i < 2 && fl.length; i++) { const it = fl.splice(Math.floor(Math.random() * fl.length), 1)[0]; N.items = N.items.filter(o => o !== it); for (let t = 0; t < 40; t++) if (!place(N, it.k, 1 + Math.floor(Math.random() * (W - 2)), 1 + Math.floor(Math.random() * (H - 2)))) break; }
    return N;
  }
  const stKey = st => st ? st.n + ':' + st.step + ':' + (st.thief != null ? st.thief : '') : '';
  // ogni telefono, quando cambia la fase: prepara la sua parte
  function enterStage(G) {
    const st = G.st; G.stKey = stKey(st);
    if ((G.ph === 'raid' || G.ph === 'guard' || G.ph === 'wait') && G.rec && G.rec.pts.length && !G.rec.done) { G.rec.done = 1; const b = recBest(G); if (b) (G.mvc = G.mvc || []).push(b); }
    closeSafe(G); camClose(); cloakClose(); if (st.step !== 'build') buildClose(); { const h = document.getElementById('trHelp'); if (h) h.remove(); }
    if (st.step === 'build') {
      G.ph = 'build'; G.bt = st.n === 1 ? BUILD : BUILD2; TRCAM = true; cq.cam = { x: 16.5, y: 24.5 }; G.mvc = []; G.mv = null;
      if (st.n === 1) helpOnce('build');
      if (st.n > 1) cqToast('🔁 <b>Manche ' + st.n + '</b>: hai ' + BUILD2 + ' secondi per spostare le cose. L\'altro ha visto dov\'era il tuo diamante… lo sposti o lo lasci lì?');
      return;
    }
    if (st.step === 'run0' || st.step === 'run1') {
      const th = charById(G, st.thief);
      if (th === G.me) { const v = G.opp && G.villa[G.opp.id]; if (!v) { G.stKey = ''; G.ph = 'wait'; return; } myRaidStart(G, v); }
      else watchStart(G, th, G.mine);
      return;
    }
    G.ph = st.step; TRCAM = true; cq.cam = { x: 16.5, y: 16 };   // cambio e risultato: la villa dall'alto
    if (st.step === 'mres') { G.mv = (G.mvc || []).sort((a, b) => b.v - a.v)[0] || null; sfx('ok'); }
  }
  // host: chi ruba per primo si alterna (manche dispari: l'altro, pari: io)
  function runStart(G, k) {
    const first = G.st.n % 2 ? G.opp : G.me, th = k === 0 ? first : (first === G.me ? G.opp : G.me);
    G.st = { n: G.st.n, step: 'run' + k, t0: G.time, thief: th.id }; enterStage(G);
  }
  const cmpRun = (a, b) => { a = a || { ok: false, lost: 9 }; b = b || { ok: false, lost: 9 }; if (a.ok && b.ok) return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; if (a.ok !== b.ok) return a.ok ? 1 : -1; return a.lost < b.lost ? 1 : a.lost > b.lost ? -1 : 0; };
  const runTxt = r => r && r.ok ? '💎 ' + mmss(r.t) : '✗';
  // host: un furto e' finito
  function recordRun(G, id, r) {
    const st = G.st; if (!st || !/^run/.test(st.step) || st.thief !== id || st.rec) return; st.rec = 1;
    G.rr[id] = r; const th = charById(G, id), nx = th === G.me ? G.opp : G.me;
    if (st.step === 'run0') { G.st = { n: st.n, step: 'inter', t0: G.time, msg: (r.ok ? '💎 ' + th.name + ' ha rubato il diamante in ' + mmss(r.t) + '!' : '🛡️ ' + th.name + ' non ce l\'ha fatta!') + '\nOra ruba ' + nx.name + '…' }; enterStage(G); return; }
    const a = G.rr[G.me.id], b = G.rr[G.opp.id], w = cmpRun(a, b);
    if (w > 0) G.sc[G.me.id] = (G.sc[G.me.id] || 0) + 1; if (w < 0) G.sc[G.opp.id] = (G.sc[G.opp.id] || 0) + 1;
    G.hist.push({ n: st.n, a, b, w }); G.rr = {};
    const s1 = G.sc[G.me.id] || 0, s2 = G.sc[G.opp.id] || 0, fin = s1 >= 2 || s2 >= 2 || st.n >= 3;
    G.st = { n: st.n, step: 'mres', t0: G.time, fin, msg: '🏁 Manche ' + st.n + ': ' + (w > 0 ? 'vince ' + G.me.name : w < 0 ? 'vince ' + G.opp.name : 'pari') + '!\n' + G.me.name + ' ' + runTxt(a) + ' · ' + G.opp.name + ' ' + runTxt(b) + '\n🏆 ' + s1 + ' – ' + s2 };
    enterStage(G);
  }
  function finalEnd(G) {
    softClear(G); const s1 = G.sc[G.me.id] || 0, s2 = G.sc[G.opp.id] || 0;
    const line = (c, s) => [c.name, '— ' + s + (s === 1 ? ' manche vinta' : ' manche vinte')];
    const rows = G.hist.map(h => 'Manche ' + h.n + ': ' + esc(G.me.name) + ' ' + runTxt(h.a) + ' · ' + esc(G.opp.name) + ' ' + runTxt(h.b)).join('<br>');
    cqModeEnd({ t: s1 > s2 ? '🏆 Vince ' + esc(G.me.name) + '!' : s2 > s1 ? '🏆 Vince ' + esc(G.opp.name) + '!' : '🤝 Pari!', why: rows || '', win: s1 > s2 ? [G.me.id] : s2 > s1 ? [G.opp.id] : [G.me.id, G.opp.id], rank: s1 >= s2 ? [line(G.me, s1), line(G.opp, s2)] : [line(G.opp, s2), line(G.me, s1)] });
  }
  // il mio furto (nella villa dell'altro)
  function myRaidStart(G, villa) {
    raidReset(G, 'me', villa, G.me); G.ph = 'raid'; cq.cam = null; TRCAM = false; cloakBtn(G, true);
    helpOnce('raid');
    cqToast('🏚️ <b>Tocca a te</b>: ruba nella villa di ' + esc(G.opp.name) + '! Ti guarda dalle telecamere e ha i suoi jolly. Trascina poco il dito per camminare <b>piano</b>; 🧥 il mantello ti rende invisibile per 5 s.');
  }
  function myRaidEnd(G, ok) {
    const r = { ok, t: Math.round(Math.max(0, G.time - G.t0 - (G.bonus || 0)) * 10) / 10, lost: G.lost };
    closeSafe(G); cloakClose(); G.ph = 'wait'; G.has = false;
    if (ok) { beep(660, 0.12, 0.05); beep(880, 0.12, 0.05, 0.13); beep(1100, 0.25, 0.05, 0.26); cqToast('💎 <b>Colpo riuscito</b> in ' + mmss(r.t) + '!'); } else { beep(330, 0.2, 0.05); cqToast('⏱ <b>Tempo scaduto!</b>'); }
    if (G.guest) cqNetSend({ k: 'rd', ok: ok ? 1 : 0, t: r.t, lost: r.lost }); else recordRun(G, G.me.id, r);
  }
  // guardo l'altro (o il computer) che ruba nella mia villa
  function watchStart(G, th, villa) {
    const cpu = isCpu(th);
    raidReset(G, cpu ? 'cpu' : 'remote', villa, th); G.ph = 'guard';
    if (cpu) { G.bot = th; G.ai = { goal: null, think: 0, avoid: new Set(), cloakUsed: false, plan: null, vis: {}, dogs: new Set() }; th.path = []; th.walk = 0; }
    G.camList = G.mine.items.filter(it => it.k === 'cam').map(it => it.room); if (cpu) G.ai.plan = botPlan(G); G.camI = 0; G.camSw = G.time; G.camC = null; camSet(G, 0);
    camBar(G, true); helpOnce('guard');
    cqToast(G.camList.length ? '🛡️ <b>' + esc(th.name) + ' entra a rubare nella tua villa!</b> Guardalo dalle telecamere e fai scattare i jolly al momento giusto.' : '🛡️ <b>' + esc(th.name) + ' entra a rubare!</b> Non hai messo telecamere: senti solo i rumori…');
  }
  function cpuRunEnd(G, ok) {
    const r = { ok, t: Math.round(Math.max(0, G.time - G.t0 - (G.bonus || 0)) * 10) / 10, lost: G.lost }; G.thiefC.walk = 0;
    beep(ok ? 330 : 660, 0.2, 0.05); beep(ok ? 260 : 880, 0.3, 0.05, 0.2);
    recordRun(G, G.thiefC.id, r);
  }
  // un passo del furto (sul telefono di chi ruba; per il computer sull'host): 'ok' = diamante fuori, 'fail' = tempo finito
  function simRun(G, dt) {
    const P = TP(G), me = isMe(G);
    G.left -= dt;
    if (G.fall && G.time - G.fall.t > 1.0) { G.fall = null; if (!G.resp) { PORCH_IN(G); say(G, '🕳️ Sei finito in cantina… e di nuovo all\'ingresso!', '🕳️ Il ladro è caduto nella botola: riparte dall\'ingresso!'); } }
    if (G.resp && G.time >= G.resp) respawn(G);
    if (G.slide) { const st = 7 * dt, nx = P.x + G.slide.dx * st, ny = P.y + G.slide.dy * st; if (G.slide.d < 3 && cqFree(nx, ny) && !(me && CQ_MODES.trappole.blk(G, nx, ny))) { P.x = nx; P.y = ny; G.slide.d += st; } else { G.slide = null; if (!me) P.path = []; } }
    const sp2 = Math.hypot(P.x - G.px, P.y - G.py) / Math.max(dt, 0.001); G.px = P.x; G.py = P.y;
    if (G.paint && !(G.cloak > G.time) && (!G.steps.length || Math.hypot(P.x - G.steps[G.steps.length - 1][0], P.y - G.steps[G.steps.length - 1][1]) > 0.55)) { G.steps.push([P.x, P.y, G.stepN = (G.stepN || 0) + 1]); if (G.steps.length > 400) G.steps.shift(); }
    trapTick(G); dogTick(G, dt, sp2 > 2.4 && sp2 < 20 && !G.slide); jollyTick(G);
    if (me) { safeTick(G, dt); if (isCpu(G.opp)) cpuOwnerTick(G); cloakBtn(G); } else botTick(G, dt);
    const S = G.srch;
    if (S) {
      if (me && Math.floor((G.time - S.t0) * 6) !== Math.floor((G.time - S.t0 - dt) * 6)) beep(180 + Math.random() * 160, 0.03, 0.015);   // fruscio mentre si fruga
      if (G.time - S.t0 >= S.d) { G.srch = null; openSpot(G, S.i); }
    }
    if (G.has && !G.resp && atPorch(P.x, P.y)) return 'ok';
    return G.left <= 0 ? 'fail' : null;
  }
  // stato del furto per chi guarda (dal telefono di chi ruba)
  const r2 = v => Math.round(v * 100) / 100;
  function rsPack(G) {
    return { hp: G.hp, lo: G.lost, h: G.has ? 1 : 0, o: G.open, fx: G.fx.map(f => [f.it.key, r2(f.t)]), pi: G.pianos.map(p => [p.x, p.y, r2(p.t)]),
      dg: G.dogs.map(d => [r2(d.x), r2(d.y), d.st[0], d.face || 1, d.armed ? 1 : 0, d.barkP && performance.now() - d.barkP < 400 ? 1 : 0]),
      pt: G.paint ? 1 : 0, sp: G.steps.slice(-30).map(s => [r2(s[0]), r2(s[1]), s[2]]), jf: G.jfx.map(f => [f.it.key, r2(f.t)]), sh: Object.entries(G.shut).map(([k, v]) => [k, r2(v)]), rv: [...G.rev],
      su: r2(G.stun || 0), stT: G.stunT || '', ck: r2(G.cake || 0), cl: r2(G.cloak || 0), co: r2(G.camOff || 0), lf: r2(G.left), sr: G.srch ? [G.srch.i, r2(G.srch.t0), G.srch.d] : G.safe ? [G.safe.i, r2(G.time), 0] : 0,
      fa: G.fall ? r2(G.fall.t) : 0, re: G.resp ? 1 : 0, bo: G.bonus || 0 };
  }
  function rsApply(G, r) {
    if (!r || !G.rv) return;
    const find = k => G.rv.items.find(it => it.key === k), old = new Map(G.fx.map(f => [f.it.key, f])), has0 = G.has, off0 = G.camOff > G.time;
    Object.assign(G, { hp: r.hp, lost: r.lo, has: !!r.h, open: r.o || [], left: r.lf, stun: r.su, stunT: r.stT, cake: r.ck, cloak: r.cl, camOff: r.co, bonus: r.bo || 0, resp: r.re ? 1 : 0, fall: r.fa ? { t: r.fa } : null, paint: r.pt ? 1 : 0 });
    G.fx = (r.fx || []).map(([k, t]) => { const it = find(k); return it && { k: it.k, x: it.x + 0.5, y: it.y + 0.5, t, it, rt: old.has(k) ? old.get(k).rt : undefined }; }).filter(Boolean);
    for (const f of G.fx) { G.used.add(f.it.key); if (!old.has(f.it.key)) { evAt(G, f.x, f.y); sfx(f.k); if (f.k === 'piano') setTimeout(() => sfx('crash'), 550); cqToast('🎯 ' + esc(G.thiefC.name) + ': ' + CAT[f.k].e + ' ' + CAT[f.k].n + '!'); } }
    G.pianos = (r.pi || []).map(([x, y, t]) => ({ x, y, t, done: 1 }));
    G.dogs = (r.dg || []).map(([x, y, s, f, a, b]) => ({ x, y, st: s === 's' ? 'sleep' : s === 'c' ? 'chase' : 'home', face: f, armed: !!a, barkP: b ? performance.now() : 0 }));
    for (const s of r.sp || []) if (!G.steps.some(q => q[2] === s[2])) G.steps.push(s);
    const mine = G.jfx.filter(f => f.local && !(r.jf || []).some(([k]) => k === f.it.key) && G.time - f.t < 2);   // i miei jolly appena fatti scattare (non ancora arrivati)
    G.jfx = (r.jf || []).map(([k, t]) => { const it = find(k); return it && { k: it.k, it, t, done: 1 }; }).filter(Boolean).concat(mine); for (const f of G.jfx) G.jused.add(f.it.key);
    G.shut = Object.fromEntries(r.sh || []); G.rev = new Set(r.rv || []);
    G.srch = r.sr ? { i: r.sr[0], t0: r.sr[1], d: r.sr[2] || 11 } : null; G.safeT = r.sr && !r.sr[2] ? G.time + 5 : 0;
    if (G.has && !has0) cqToast('😱 <b>' + esc(G.thiefC.name) + ' ha trovato il tuo diamante!</b> Fermalo prima del portone!');
    if (G.camOff > G.time && !off0) cqToast('📺 ' + esc(G.thiefC.name) + ' ha preso il telecomando: <b>telecamere spente</b> per 10 secondi!');
  }

  // ---- FURTO (di chiunque: io nella villa del computer, o il computer nella mia mentre io guardo dalle telecamere) ----
  // G.thief = 'me' | 'cpu' | 'remote'; G.thiefC = il personaggio di chi ruba; TP(G) = la sua posizione (cq per me); G.rv = la villa in cui si ruba
  const HP = 3, DOG0 = [[28.5, 27.5]];   // il cane della cucina: c'e' sempre, uguale a quelli piazzati (non si sveglia mai)
  const DOOR_IN = (it, x, y) => it.cells.some(([a, b]) => a === x && b === y);
  const TP = G => G.thief === 'me' ? cq : G.thiefC;
  const isMe = G => G.thief === 'me';
  const say = (G, mine, other) => { const t = isMe(G) ? mine : other; if (t) cqToast(t); };
  const PORCH_IN = (G) => { const P = TP(G); P.x = 17; P.y = 28.3; if (G.thief === 'cpu') { P.path = []; G.ai.goal = null; } };
  // caselle "morbide": muri per i percorsi del computer (porte finte scoperte, porte sbattute), si rimettono a posto a ogni furto
  function softSet(G, cells, on) { for (const [x, y] of cells) { if (on) { if (!cqSolid[y][x]) { cqSolid[y][x] = { prop: 'tsoft', soft: true }; G.soft.push([x, y]); } } else if (cqSolid[y][x] && cqSolid[y][x].prop === 'tsoft') cqSolid[y][x] = null; } }
  function softClear(G) { if (G.soft) for (const [x, y] of G.soft) if (cqSolid[y][x] && cqSolid[y][x].prop === 'tsoft') cqSolid[y][x] = null; G.soft = []; }
  function raidReset(G, thief, items, ch) {
    softClear(G); closeSafe(G);
    Object.assign(G, { thief, thiefC: ch, rv: items, left: TIME, open: [], has: false, srch: null, stun: 0, t0: G.time, hp: HP, used: new Set(), rev: new Set(), fx: [], pianos: [], paint: 0, steps: [],
      slide: null, fall: null, resp: 0, camOff: 0, bonus: 0, safe: null, lost: 0, cloak: 0, cloakUsed: false, jfx: [], jused: new Set(), shut: {}, cpuJ: null, ev: {}, slow: false, cake: 0 });
    G.dia = items.items.find(it => it.k === 'dia').i; G.rec = { pts: [] };
    G.dogs = DOG0.map(([x, y]) => ({ x, y, hx: x, hy: y, armed: false, st: 'sleep', path: [], face: 1, walk: 0 }))
      .concat(items.items.filter(it => it.k === 'cane').map(it => ({ x: it.x + 0.5, y: it.y + 0.5, hx: it.x + 0.5, hy: it.y + 0.5, armed: true, st: 'sleep', path: [], face: 1, walk: 0 })));
    const P = TP(G); if (thief !== 'remote') { P.x = 17; P.y = 28.3; } G.px = P.x; G.py = P.y; G.room = 'Ingresso';
  }
  // colpo preso: un cuore in meno, fermo per un po'; a zero cuori si torna al portone (con 3 cuori nuovi)
  function hit(G, txt, stun) {
    if (G.resp) return;
    G.hp--; G.lost++; G.stun = Math.max(G.stun, G.time + stun); G.stunT = txt; G.hitT = G.time;
    beep(150, 0.18, 0.07); beep(95, 0.25, 0.06, 0.08);
    if (isMe(G)) { try { navigator.vibrate && navigator.vibrate(80); } catch {} closeSafe(G); }
    else { G.srch = null; G.safeT = 0; evAt(G, TP(G).x, TP(G).y); cqToast('🎯 Il ladro: ' + txt); }
    if (G.hp <= 0) { G.resp = G.time + stun + 0.3; say(G, '💔 <b>Niente più cuori!</b> Si ricomincia dal portone…', '💔 Il ladro ha finito i cuori: torna al portone!'); }
  }
  function respawn(G) {
    G.resp = 0; G.hp = HP; G.slide = null; G.fall = null; PORCH_IN(G);
    if (G.has) { G.has = false; G.open = G.open.filter(i => i !== G.dia); say(G, '💎 Il diamante è tornato nel suo nascondiglio.', '💎 Il diamante è tornato al suo posto!'); }
  }
  // cosa c'e' nel mobile aperto (la cassaforte da' sempre un premio in piu')
  function openSpot(G, i) {
    G.open.push(i);
    const it = G.rv.items.find(o => o.i === i && CAT[o.k].on === 'spot'), safe = spots()[i].n === 'Cassaforte', me = isMe(G);
    if (!me) evAt(G, spots()[i].x + 0.5, spots()[i].y + 0.5);
    if (it && it.k === 'dia') { G.has = true; beep(988, 0.1, 0.05); beep(1319, 0.2, 0.05, 0.1); if (safe) G.bonus += 10;
      say(G, safe ? '💎 <b>Colpo da maestro!</b> Il diamante era in cassaforte: −10 secondi sul tuo tempo. Ora al portone!' : '💎 <b>Trovato!</b> Ora riportalo al portone, presto!', '😱 <b>Il ladro ha trovato il diamante!</b> Fermalo prima del portone!'); return; }
    if (safe) { G.camOff = G.time + 10; say(G, '📺 In cassaforte c\'era il <b>telecomando</b>: le telecamere del padrone sono spente per 10 secondi!', '📺 Il ladro ha preso il telecomando dalla cassaforte: <b>telecamere spente</b> per 10 secondi!'); }
    if (it && it.k === 'fake') { G.stun = G.time + 3; G.stunT = '🎂 Torta in faccia!'; G.cake = G.time; sfx('torta'); say(G, '🎂 <b>Era un diamante finto!</b> Torta in faccia…', '🎂 Il ladro ha aperto un <b>diamante finto</b>: torta in faccia!'); }
    else if (it && it.k === 'box') { G.cake = 0; hit(G, '🥊 PAF!', 1.5); sfx('boing'); say(G, '🥊 <b>Scatola a sorpresa!</b> Un guantone in faccia.', ''); }
    else if (!safe && me) { beep(220, 0.08, 0.03); cqToast(cqPickOne(['Vuoto…', 'Niente qui.', 'Solo polvere.', 'Acqua…', 'Qui non c\'è.'])); }
  }
  // qualcosa e' successo in una stanza: il pulsante della sua telecamera lampeggia
  function evAt(G, x, y) { const r = roomAt(Math.floor(x), Math.floor(y)); const n = r ? (r.door ? r.door[0] : r.n) : ''; if (n) G.ev[n] = G.time; }
  // le trappole sotto i piedi (o accanto, l'armatura) che non sono ancora scattate
  const TRAPS = ['botola', 'buccia', 'rastrello', 'piano', 'vernice', 'finta', 'armatura'];
  function trapTick(G) {
    const P = TP(G), x = Math.floor(P.x), y = Math.floor(P.y), me = isMe(G);
    for (const it of G.rv.items) {
      if (G.used.has(it.key) || G.fall || !TRAPS.includes(it.k)) continue;
      if (!me && G.ai.avoid.has(it.key)) continue;   // il computer ha visto il segno e ci gira intorno
      const k = it.k, on = k === 'armatura' ? Math.hypot(P.x - it.x - 0.5, P.y - it.y - 0.5) < 1.15 : CAT[k].on === 'door' ? DOOR_IN(it, x, y) : it.x === x && it.y === y;
      if (!on) continue;
      G.used.add(it.key); G.fx.push({ k, x: it.x + 0.5, y: it.y + 0.5, t: G.time, it });
      const l = Math.hypot(P.wdx || 0, P.wdy || 0) || 1;
      if (k === 'botola') { G.fall = { t: G.time, x: it.x + 0.5, y: it.y + 0.5 }; G.slide = null; hit(G, '🕳️ Botola! Aaaah…', 1.0); sfx('botola'); }
      else if (k === 'buccia') { G.slide = { dx: (P.wdx || 0.7) / l, dy: (P.wdy || 0.7) / l, d: 0 }; hit(G, '🍌 Scivolone!', 1.3); sfx('buccia'); }
      else if (k === 'rastrello') { hit(G, '🧹 SDENG!', 1.2); sfx('rastrello'); }
      else if (k === 'piano') { G.pianos.push({ x: it.x + 0.5, y: it.y + 0.5, t: G.time }); sfx('piano'); }
      else if (k === 'vernice') { G.paint = G.time; sfx('vernice'); say(G, '🪣 <b>SPLASH!</b> Vernice addosso: ora lasci le impronte, il padrone ti vede ovunque.', '🪣 Il ladro si è sporcato di vernice: segui le <b>impronte blu</b>!'); if (!me) evAt(G, P.x, P.y); }
      else if (k === 'finta') { G.rev.add(it.key); softSet(G, it.cells, true); P.x -= (P.wdx || 0) / l * 0.7; P.y -= (P.wdy || 0) / l * 0.7; if (!cqFree(P.x, P.y)) { P.x = G.px; P.y = G.py; } if (!me) { P.path = []; G.ai.goal = null; } hit(G, '🚧 BONK! Porta dipinta!', 1.0); sfx('finta'); }
      else if (k === 'armatura') { hit(G, '🛡️ CLANG!', 1.0); sfx('armatura'); }
    }
    // pianoforti che cadono: chi e' ancora sotto dopo mezzo secondo viene preso
    for (const p of G.pianos) if (!p.done && G.time - p.t >= 0.55) {
      p.done = 1; sfx('crash');
      if (Math.hypot(P.x - p.x, P.y - p.y) < 0.85) hit(G, '🎹 CRASH!', 2.0); else say(G, '🎹 <b>Per un pelo!</b> Il pianoforte ti è caduto alle spalle.', '🎹 Il pianoforte ha mancato il ladro per un pelo!');
    }
  }
  // cani: dormono; se gli passi vicino CORRENDO si svegliano, abbaiano e inseguono (7 s), poi tornano a cuccia. Quello della cucina dorme e basta
  function dogTick(G, dt, running) {
    const P = TP(G);
    for (const d of G.dogs) {
      if (!d.armed) continue;
      const dist = Math.hypot(P.x - d.x, P.y - d.y);
      if (d.st === 'sleep') { if (dist < 2.4 && running && !G.resp && G.time > (d.calm || 0)) { if (G.ai) G.ai.dogs.add(d); d.st = 'chase'; d.t = G.time; d.think = 0; d.bark = G.time; d.barkP = performance.now(); sfx('bark'); if (!isMe(G)) { evAt(G, d.x, d.y); cqToast('🐕 Il cane abbaia in <b>' + esc(roomName(d.x, d.y)) + '</b>!'); } } continue; }
      if ((d.think -= dt) <= 0) { d.think = 0.35; d.path = d.st === 'chase' ? cqPath(d.x, d.y, P.x, P.y) : cqPath(d.x, d.y, d.hx, d.hy); if (!d.path.length) d.path = [[d.st === 'chase' ? P.x : d.hx, d.st === 'chase' ? P.y : d.hy]]; }
      cqModeStep(d, dt, d.st === 'chase' ? 1.12 : 0.7);
      if (d.st === 'chase') {
        if (G.time - d.bark > 0.9) { d.bark = G.time; d.barkP = performance.now(); sfx('bark'); }
        if (dist < 0.6 && !(G.stun > G.time)) { hit(G, '🐕 Morso!', 1.2); sfx('bite'); d.st = 'home'; d.think = 0; d.calm = G.time + 10; }
        else if (G.time - d.t > 7 || G.resp) { d.st = 'home'; d.think = 0; }
      } else if (Math.hypot(d.x - d.hx, d.y - d.hy) < 0.3) { d.st = 'sleep'; d.x = d.hx; d.y = d.hy; d.walk = 0; }
    }
  }

  // ---- JOLLY del padrone: lampadario (l'ombra si allarga, poi cade: raggio 2), porta che sbatte (chiusa 4 s), armatura che cade ----
  const JNAME = { jl: '💡 Lampadario', jp: '💨 Sbatti la porta', ja: '⚔️ Fai cadere l\'armatura' };
  const jCenter = it => { const xs = it.cells.map(c => c[0]), ys = it.cells.map(c => c[1]); return [(Math.min(...xs) + Math.max(...xs) + 1) / 2, (Math.min(...ys) + Math.max(...ys) + 1) / 2]; };
  function jollyFire(G, it) {
    if (G.jused.has(it.key)) return;
    G.jused.add(it.key); G.jfx.push({ k: it.k, it, t: G.time }); sfx(it.k === 'jl' ? 'lampadario' : it.k === 'jp' ? 'sbatte' : 'piano');
    if (it.k === 'jp') { G.shut[it.key] = G.time + 4; softSet(G, it.cells, true); const P = TP(G), [cx, cy] = jCenter(it); beep(110, 0.25, 0.08); if (DOOR_IN(it, Math.floor(P.x), Math.floor(P.y)) || Math.hypot(P.x - cx, P.y - cy) < 0.9) hit(G, '💨 Porta in faccia!', 1.2); }
  }
  function jollyTick(G) {
    const P = TP(G);
    for (const f of G.jfx) {
      if (f.done) continue; const [cx, cy] = jCenter(f.it), a = G.time - f.t;
      if (f.k === 'jl' && a >= 0.5) { f.done = 1; sfx('jlcrash'); if (Math.hypot(P.x - cx, P.y - cy) < 2.0) hit(G, '💡 Lampadario in testa!', 2.0); else say(G, '💡 Il lampadario ti ha mancato!', '💡 Lampadario a vuoto…'); }
      if (f.k === 'ja' && a >= 0.4) { f.done = 1; sfx('armatura'); if (Math.hypot(P.x - cx, P.y - cy) < 1.6) hit(G, '⚔️ Armatura addosso!', 1.5); }
      if (f.k === 'jp' && a >= 4) { f.done = 1; softSet(G, f.it.cells, false); G.soft = G.soft.filter(([x, y]) => !DOOR_IN(f.it, x, y)); }
    }
  }
  // il computer padrone (quando rubo io): mi vede se sono in una stanza con la sua telecamera (o se lascio impronte), non se ho il mantello
  // o le telecamere sono spente; se passo vicino a un suo jolly lo fa scattare dopo un attimo di riflessi
  function cpuOwnerTick(G) {
    const cams = G.rv.items.filter(it => it.k === 'cam').map(it => it.room), P = TP(G), r = roomName(P.x, P.y);
    const sees = !(G.cloak > G.time) && !(G.camOff > G.time) && (cams.includes(r) || (G.paint && G.steps.length));
    if (G.cpuJ) { if (G.time >= G.cpuJ.at) { const it = G.cpuJ.it; G.cpuJ = null; if (sees) jollyFire(G, it); } return; }
    if (!sees || G.resp || G.fall) return;
    for (const it of G.rv.items) {
      if (!CAT[it.k].jolly || G.jused.has(it.key)) continue;
      const [cx, cy] = jCenter(it), d = Math.hypot(P.x - cx, P.y - cy);
      if (d < (it.k === 'jl' ? 1.6 : it.k === 'jp' ? 1.3 : 1.4)) { G.cpuJ = { it, at: G.time + 0.25 + Math.random() * 0.45 }; break; }
    }
  }

  // ---- GUARDIA: il computer ruba nella mia villa, io guardo dalle telecamere e uso i jolly ----
  function camSet(G, i) {
    if (!G.camList.length) { G.camC = { x: 16.5, y: 24.5 }; TRCAM = true; cq.cam = { x: 16.5, y: 24.5 }; return; }
    G.camI = (i + G.camList.length) % G.camList.length; G.camSw = G.time; const R2 = ROOMS.find(r => r.n === G.camList[G.camI]);
    G.camC = { x: R2.x + R2.w / 2, y: R2.y + R2.h / 2 }; TRCAM = true; cq.cam = { x: G.camC.x, y: G.camC.y }; sfx('fruscio'); camBar(G);
  }
  // cosa inquadra la telecamera: la sua stanza, entro 4,6 caselle dal punto dove guarda (nelle stanze grandi gira verso il ladro)
  const CAMR = 4.6;
  const camRoom = G => G.camList && G.camList.length ? ROOMS.find(r => r.n === G.camList[G.camI]) : null;
  function camSees(G, x, y) {
    const R2 = camRoom(G); if (!R2 || !G.camC || G.camOff > G.time || G.time - G.camSw < 0.5) return false;
    if (x < R2.x - 0.2 || y < R2.y - 0.2 || x > R2.x + R2.w + 0.2 || y > R2.y + R2.h + 0.2) return false;
    return Math.hypot(x - G.camC.x, y - G.camC.y) < CAMR;
  }
  function camTick(G, dt) {
    const R2 = camRoom(G); if (!R2) return;
    const b = G.thiefC, inRoom = b.x >= R2.x && b.y >= R2.y && b.x <= R2.x + R2.w && b.y <= R2.y + R2.h && !(G.cloak > G.time);
    const tx = inRoom ? Math.max(R2.x + 2.5, Math.min(R2.x + R2.w - 2.5, b.x)) : R2.x + R2.w / 2, ty = inRoom ? Math.max(R2.y + 2.5, Math.min(R2.y + R2.h - 2.5, b.y)) : R2.y + R2.h / 2;
    const dx = tx - G.camC.x, dy = ty - G.camC.y, d = Math.hypot(dx, dy), st = 1.5 * dt;   // la telecamera gira lenta: chi corre esce dall'inquadratura
    if (d > st) { G.camC.x += dx / d * st; G.camC.y += dy / d * st; } else { G.camC.x = tx; G.camC.y = ty; }
    TRCAM = true; cq.cam = { x: G.camC.x, y: G.camC.y };
  }
  // pulsanti delle telecamere in basso (lampeggiano se nella stanza succede qualcosa)
  function camBar(G, make) {
    buildCss();
    let el = document.getElementById('trCams');
    if (make && !el) { el = document.createElement('div'); el.id = 'trCams'; $('#ciack').appendChild(el); for (const ev of ['pointerdown', 'touchstart', 'mousedown']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true }); }
    if (!el) return;
    if (!G.camList.length) { el.innerHTML = '<span class="none">📵 Nessuna telecamera: ascolta i rumori…</span>'; return; }
    el.innerHTML = G.camList.map((n, i) => `<button type="button" data-i="${i}" class="${i === G.camI ? 'on' : ''}">📹 ${i + 1} ${esc(n === 'Camera da letto' ? 'Camera' : n)}</button>`).join('');
    el.querySelectorAll('button').forEach(b => { b.onclick = () => { const G2 = cq.g; if (G2 && G2.ph === 'guard') camSet(G2, +b.dataset.i); }; });
  }
  function camBarBlink(G) { const el = document.getElementById('trCams'); if (!el) return; el.querySelectorAll('button').forEach(b => { const n = G.camList[+b.dataset.i], on = G.ev[n] && G.time - G.ev[n] < 3 && Math.floor(G.time * 4) % 2 === 0; if (b.classList.contains('blink') !== !!on) b.classList.toggle('blink', !!on); }); }
  function camClose() { const el = document.getElementById('trCams'); if (el) el.remove(); }
  // il jolly che si puo' far scattare adesso: uno dei miei, non usato, dentro l'inquadratura (il piu' vicino al ladro)
  function jollyHere(G) {
    if (G.ph !== 'guard' || !G.thiefC) return null; let best = null, bd = 1e9; const b = G.thiefC;
    for (const it of G.mine.items) { if (!CAT[it.k].jolly || G.jused.has(it.key)) continue; const [cx, cy] = jCenter(it); if (!camSees(G, cx, cy)) continue; const d = Math.hypot(b.x - cx, b.y - cy); if (d < bd) { bd = d; best = it; } }
    return best;
  }
  // ---- il computer ladro: sceglie i mobili da aprire (un po' a caso, un po' i posti lontani e quelli "ovvi"), corre o va piano,
  // se va piano vicino a una trappola a volte vede il segno e ci gira intorno; usa il mantello una volta, entrando in una stanza con telecamera ----
  function botPlan(G) {
    const S = spots(), obv = ['Cassaforte', 'Sotto il letto', 'Baule vecchio', 'Botte', 'Armadio', 'Pendolo'], cams = G && G.camList || [], by = {};
    S.forEach((s, i) => { const r = roomName(s.x + 0.5, s.y + 0.5) || roomName(s.x + 0.5, s.y + 1.5); (by[r] = by[r] || []).push(i); });
    const rs = Object.keys(by).map(r => { const v = by[r].reduce((a, i) => a + (0.5 + (Math.abs(S[i].x - 16) + Math.abs(S[i].y - 28)) / 40) * (obv.includes(S[i].n) ? 1.6 : 1), 0) / Math.sqrt(by[r].length); return { r, v: v * (cams.includes(r) ? 1.8 : 1) * (0.4 + Math.random()) }; }).sort((a, b) => b.v - a.v);
    const out = []; let px = 16.5, py = 28.5;
    for (const { r } of rs) { const left = by[r].slice(); while (left.length) { let bi = 0, bd = 1e9; left.forEach((i, k) => { const d = Math.hypot(S[i].x + 0.5 - px, S[i].y + 0.5 - py); if (d < bd) { bd = d; bi = k; } }); const i = left.splice(bi, 1)[0]; out.push(i); px = S[i].x + 0.5; py = S[i].y + 0.5; } }
    return out;
  }
  const nbFree = (s, b) => { let best = null, bd = 1e9; for (const [a, c] of s.cells) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const x = a + dx, y = c + dy; if (!cqCellFree(x, y)) continue; const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y); if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; } } return best; };
  function botTick(G, dt) {
    const b = G.bot, A = G.ai, S = spots();
    const busy = G.stun > G.time || G.fall || G.resp || G.slide || G.srch || G.safeT;
    if (G.safeT && G.time >= G.safeT) { G.safeT = 0; openSpot(G, G.safeI); }
    if (busy) { b.walk = 0; return; }
    if ((A.think -= dt) <= 0) {
      A.think = 0.5;
      if (G.has) { if (A.goal !== 'out') { A.goal = 'out'; b.path = cqPath(b.x, b.y, 17, 28.4); } }
      else {
        if (A.goal == null || A.goal === 'out' || G.open.includes(A.goal)) { A.goal = A.plan.find(i => !G.open.includes(i)); b.path = []; if (A.goal == null) A.plan = botPlan(G).filter(i => !G.open.includes(i)); }
        const s = A.goal != null && S[A.goal];
        if (s) { if (spotDist(s, b.x, b.y) < NEAR - 0.1) { b.path = []; if (s.n === 'Cassaforte') { G.safeT = G.time + 9 + Math.random() * 5; G.safeI = A.goal; evAt(G, s.x + 0.5, s.y + 0.5); } else G.srch = { i: A.goal, t0: G.time, d: s.h >= 2 ? 2 : 1 }; A.goal = null; b.walk = 0; return; }
          if (!b.path || !b.path.length) { const nb = nbFree(s, b); b.path = nb ? cqPath(b.x, b.y, nb[0], nb[1]) : []; if (!b.path.length) { G.open.push(A.goal); A.goal = null; } } }
      }
      // piano o di corsa: piano nelle stanze con telecamera (a volte) e vicino alla meta
      const near = A.goal != null && A.goal !== 'out' && S[A.goal] && spotDist(S[A.goal], b.x, b.y) < 3;
      G.slow = [...A.dogs].some(d => Math.hypot(d.x - b.x, d.y - b.y) < 3.2) || (near ? Math.random() < 0.35 : Math.random() < 0.15);
      // mantello: entrando in una stanza con la mia telecamera
      const r = roomName(b.x, b.y); if (!A.cloakUsed && G.camList.includes(r) && !A.vis[r]) { A.vis[r] = 1; if (Math.random() < 0.45) { A.cloakUsed = true; G.cloak = G.time + 5; } }
    }
    const ox = b.x, oy = b.y; cqModeStep(b, dt, G.slow ? 0.45 : 1);
    const mx = b.x - ox, my = b.y - oy, ml = Math.hypot(mx, my); if (ml > 1e-4) { b.wdx = mx / ml; b.wdy = my / ml; }
    // va piano: vede i segni delle trappole vicine (55%) e ci gira intorno
    if (G.slow) for (const it of G.rv.items) { const chk = it.key + '?'; if (TRAPS.includes(it.k) && !G.used.has(it.key) && !A.avoid.has(chk) && Math.hypot(b.x - it.x - 0.5, b.y - it.y - 0.5) < 1.6) { A.avoid.add(chk); if (Math.random() < 0.55) A.avoid.add(it.key); } }
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
    cv.addEventListener('pointerdown', e => { drag = { a: ang(e) }; cv.setPointerCapture(e.pointerId); });
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
  // pulsante del mantello (quando rubo io): una volta sola, 5 s invisibile alle telecamere e senza impronte
  function cloakBtn(G, make) {
    buildCss();
    let el = document.getElementById('trCloak');
    if (make && !el) { el = document.createElement('button'); el.id = 'trCloak'; el.type = 'button'; el.textContent = '🧥 Mantello'; $('#ciack').appendChild(el); for (const ev of ['pointerdown', 'touchstart', 'mousedown']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true }); el.onclick = () => { const G2 = cq.g; if (G2 && G2.ph === 'raid' && !G2.cloakUsed) { G2.cloakUsed = true; G2.cloak = G2.time + 5; sfx('mantello'); cloakBtn(G2); } }; }
    if (!el) return;
    const on = G.cloak > G.time, t = on ? '🧥 ' + Math.ceil(G.cloak - G.time) + ' s' : G.cloakUsed ? '🧥 usato' : '🧥 Mantello';
    if (el.textContent !== t) el.textContent = t; el.classList.toggle('used', G.cloakUsed && !on); el.classList.toggle('on', on);
  }
  function cloakClose() { const el = document.getElementById('trCloak'); if (el) el.remove(); }

  // ---- disegni del furto (sopra la mappa, in pixel dello schermo): cani, trappole scattate, segni, impronte, jolly ----
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
  // si vede adesso il punto x, y? (furto di notte: torcia; guardia: inquadratura della telecamera)
  const litFn = G => { const MN = (G.ph === 'raid' && G.opt.nt) || G.ph === 'guard' ? CQ_MODES.trappole.night(G) : null; return (x, y) => !MN || MN.see(x, y); };
  function raidDraw(g, G, sx, sy, TW) {
    const U = TW * 0.575, now = performance.now(), lit = litFn(G);
    const vis = (x, y) => { const X = sx(x, y), Y = sy(x, y); return X > -80 && Y > -80 && X < cq.w + 80 && Y < cq.h + 80; };
    // impronte di vernice (il padrone le vede ovunque)
    if (G.paint) { g.fillStyle = 'rgba(60,120,220,.6)'; for (const [x, y, i] of G.steps) if (vis(x, y)) { g.beginPath(); g.ellipse(sx(x, y) + (i % 2 ? 3 : -3), sy(x, y), TW * 0.05, TW * 0.03, 0, 0, 7); g.fill(); } }
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
      if (!vis(p.x, p.y) || !lit(p.x, p.y)) continue;
      const X = sx(p.x, p.y), Y = sy(p.x, p.y), k = Math.min(1, (G.time - p.t) / 0.55);
      g.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.4 * k) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 0.55 * (0.4 + 0.6 * k), TW * 0.28 * (0.4 + 0.6 * k), 0, 0, 7); g.fill();
      if (k < 1) { const z = (1 - k) * (1 - k) * 7 * U; g.fillStyle = '#1a1a22'; g.fillRect(X - TW * 0.45, Y - z - TW * 0.5, TW * 0.9, TW * 0.4); g.fillStyle = '#f4f2ec'; g.fillRect(X - TW * 0.4, Y - z - TW * 0.14, TW * 0.8, TW * 0.06); }
      else { g.fillStyle = '#1a1a22'; for (let i = 0; i < 5; i++) g.fillRect(X + (i - 2) * TW * 0.16, Y - TW * 0.08 - (i % 2) * TW * 0.06, TW * 0.13, TW * 0.08); g.fillStyle = '#f4f2ec'; g.fillRect(X - TW * 0.1, Y - TW * 0.02, TW * 0.22, TW * 0.04); pop(g, X, Y - TW * 0.6, 'CRASH!', (G.time - p.t - 0.55) / 1.2, TW); }
    }
    // jolly: lampadario (ombra che si allarga, poi cade), porta sbattuta (chiusa), armatura che cade
    for (const f of G.jfx) {
      const [cx, cy] = jCenter(f.it); if (!vis(cx, cy) || !lit(cx, cy)) continue;
      const X = sx(cx, cy), Y = sy(cx, cy), a = G.time - f.t;
      if (f.k === 'jl') {
        const k = Math.min(1, a / 0.5);
        if (a < 2.5) { g.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * k) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 2.0 * k, TW * 1.0 * k, 0, 0, 7); g.fill(); }
        const z = k < 1 ? (1 - k) * (1 - k) * 6 * U + 0.3 * U : 0.1 * U;
        g.strokeStyle = '#c8a050'; g.lineWidth = Math.max(2, TW / 16); g.beginPath(); g.ellipse(X, Y - z, TW * 0.5, TW * 0.22, 0, 0, 7); g.stroke();
        g.fillStyle = '#e8c46a'; for (let i = 0; i < 6; i++) { const t2 = i / 6 * Math.PI * 2; g.beginPath(); g.arc(X + Math.cos(t2) * TW * 0.5, Y - z + Math.sin(t2) * TW * 0.22, TW * 0.05, 0, 7); g.fill(); }
        if (k < 1) { g.strokeStyle = 'rgba(200,180,140,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X, Y - z - TW * 4); g.lineTo(X, Y - z); g.stroke(); }
        else pop(g, X, Y - TW * 0.8, 'CRASH!', (a - 0.5) / 1.2, TW);
      } else if (f.k === 'jp' && a < 4) { for (const [x2, y2] of f.it.cells) { cellPoly(g, sx, sy, x2 + 0.4, y2, x2 + 0.6, y2 + 1, 1.6, U); g.fillStyle = '#6a3a24'; g.fill(); } pop(g, X, Y - TW * 1.6, 'SBAM!', a / 1.0, TW); }
      else if (f.k === 'ja' && a < 1.6) { const k = Math.min(1, a / 0.4); g.save(); g.translate(X, Y); g.rotate(k * 1.3); g.fillStyle = '#a8b0b8'; g.fillRect(-TW * 0.12, -TW * 1.3, TW * 0.24, TW * 1.2); g.fillStyle = '#c8303a'; g.beginPath(); g.arc(0, -TW * 1.35, TW * 0.08, 0, 7); g.fill(); g.restore(); if (k >= 1) pop(g, X, Y - TW, 'CLANG!', (a - 0.4) / 1.2, TW); }
    }
    // i segni delle trappole: solo se a rubare sono io, camminando piano, da vicino (e di notte dove arriva la luce)
    if (isMe(G) && G.slow && !G.resp) for (const it of G.rv.items) {
      if (G.used.has(it.key) || !TRAPS.includes(it.k)) continue;
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
    const lit = litFn(G), now = performance.now();
    const list = (G.ph === 'raid' || G.ph === 'guard') && G.dogs ? G.dogs : DOG0.map(([x, y]) => ({ x, y, st: 'sleep', face: 1 }));
    for (const d of list) { if (!lit(d.x, d.y)) continue; const X = sx(d.x, d.y), Y = sy(d.x, d.y); if (X < -60 || Y < -60 || X > cq.w + 60 || Y > cq.h + 60) continue; dogDraw(g, X, Y, TW, d, now); }
  }
  // schermo della telecamera: grana, righe, scritta REC, fruscio quando si cambia (di notte visione notturna verde)
  function camDraw(g, G, TW) {
    const W2 = cq.w, H2 = cq.h, R2 = camRoom(G), now = performance.now();
    if (!R2) { g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#ddd'; g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillText('📵 Nessuna telecamera', W2 / 2, H2 / 2 - 10); g.font = '14px system-ui'; g.fillText('Senti solo i rumori…', W2 / 2, H2 / 2 + 14); return; }
    if (G.opt.nt) { g.fillStyle = 'rgba(40,255,90,.13)'; g.fillRect(0, 0, W2, H2); }
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = (now / 40) % 4; y < H2; y += 4) g.fillRect(0, y, W2, 1);
    if (G.time - G.camSw < 0.5 || G.camOff > G.time) { for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.6)'; g.fillRect(Math.random() * W2, Math.random() * H2, 3 + Math.random() * 14, 2); } }
    g.font = '700 14px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)';
    const lab = G.camOff > G.time ? '📺 TELECAMERE SPENTE ' + Math.ceil(G.camOff - G.time) + ' s' : '📹 CAM ' + (G.camI + 1) + ' · ' + R2.n.toUpperCase();
    g.strokeText(lab, 14, 120); g.fillStyle = G.camOff > G.time ? '#ff8a7a' : '#fff'; g.fillText(lab, 14, 120);
    if (Math.floor(now / 500) % 2) { g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(W2 - 58, 120, 5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText('REC', W2 - 48, 120); }
  }
  // le cose messe nella mia villa (icone): in preparazione, e in guardia solo dentro l'inquadratura
  function itemsDraw(g, G, sx, sy, TW, only) {
    const bob = Math.sin(performance.now() / 300) * TW * 0.04;
    for (const it of G.mine.items) {
      if (G.ph === 'guard' && (G.used.has(it.key) || G.jused.has(it.key) || it.k === 'cam')) continue;
      const [cx, cy] = jCenter(it); if (only && !only(cx, cy)) continue;
      const X = sx(cx, cy), Y = sy(cx, cy) - TW * (CAT[it.k].on === 'spot' || CAT[it.k].on === 'armor' ? 1.25 : CAT[it.k].on === 'room' ? 2.2 : 0.35) + bob;
      if (X < -60 || Y < -60 || X > cq.w + 60 || Y > cq.h + 60) continue;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = G.ph === 'guard' ? 0.75 : 1;
      g.fillStyle = CAT[it.k].jolly ? 'rgba(255,210,74,.7)' : 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(X, Y, TW * 0.24, 0, 7); g.fill();
      g.font = Math.round(TW * 0.3) + 'px system-ui,sans-serif'; g.fillText(CAT[it.k].e, X, Y + 1); g.globalAlpha = 1;
    }
  }
  let TRCAM = false;   // la telecamera libera (cq.cam) l'ho messa io: uscendo dal gioco la tolgo
  const thiefChar = G => G.thief === 'me' ? G.me : G.thiefC;
  CQ_MODES.trappole = {
    n: 'La casa delle trappole',
    desc: '🪤 Uno contro uno, al meglio di 3 manche. Arreda la tua villa di <b>trappole</b> e nascondi il <b>diamante</b>; poi l\'altro prova a rubarlo mentre tu lo guardi dalle <b>telecamere</b> e fai scattare i <b>jolly</b>; poi tocca a te rubare il suo. Vince la manche chi ruba più in fretta. Nelle manche dopo hai 40 secondi per spostare le cose: lui sa dov\'era… lo sposti o no? Da solo giochi contro il computer.',
    maps: [['villa', 'Villa']],
    ns: [[2, '2']],
    def: { map: 'villa', n: 2, fill: true, nt: 0 },
    opts: o => `<div class="row"><div class="lbl">Ora del giorno</div>${seg('nt', [[0, '☀️ Giorno'], [1, '🌙 Notte']], o.nt ? 1 : 0)}<div class="hint">Di notte si vede solo dove punta la torcia, e le telecamere sono in visione notturna.</div></div>${RULES}`,
    read: d => ({ nt: +d.get('nt') ? 1 : 0 }),
    start(G) {
      setNight(G.opt.nt);
      G.opp = G.chars.find(c => c !== G.me) || null; G.bot = isCpu(G.opp) ? G.opp : null;
      Object.assign(G, { villa: {}, sc: {}, rr: {}, hist: [], mine: { items: [] }, soft: [], jr: [], jrSeq: 0, open: [], left: TIME, room: 'Ingresso' });
      for (const c of G.chars) { c.x = 16.5 + (c === G.me ? 0.5 : -0.5); c.y = 28.3; }
      G.st = { n: 1, step: 'build', t0: 0, done: {} }; enterStage(G);
    },
    gstart(G) {
      setNight(G.opt.nt); G.opp = G.chars.find(c => c !== G.me) || null; G.bot = null;
      Object.assign(G, { villa: {}, sc: {}, rr: {}, hist: [], vstr: {}, mine: { items: [] }, soft: [], open: [], left: TIME, room: 'Ingresso', st: null, stKey: '', ph: 'wait' });
    },
    intro: () => '🔨 Gira per la tua villa e arredala: trappole e diamante!',
    voice: () => 1,   // voce sempre aperta tra i due: depistare e prendersi in giro fa parte del gioco
    // chi si vede: io solo mentre rubo (non dentro la botola); il ladro che guardo solo dentro l'inquadratura e senza mantello; gli altri mai
    hide(c) {
      const G = cq.g; if (!G) return false;
      const fell = G.fall && G.time - G.fall.t > 0.25;
      if (c === G.me) return !(G.ph === 'raid' && !fell);
      return !(G.ph === 'guard' && c === G.thiefC && !(G.cloak > G.time) && !fell && camSees(G, c.x, c.y));
    },
    // muri nuovi quando rubo io: porte finte scoperte e porte sbattute dal padrone
    blk(G, x, y) {
      if (G.ph !== 'raid' || !G.rv) return false; const cx = Math.floor(x), cy = Math.floor(y);
      return G.rv.items.some(it => (G.rev.has(it.key) || (G.shut[it.key] || 0) > G.time) && DOOR_IN(it, cx, cy));
    },
    // trascinare poco il dito (o Maiuscolo sulla tastiera) = camminare piano: si vedono i segni delle trappole e i cani non si svegliano
    speed: c => { const G = cq.g; if (!G || c !== G.me) return 1; if (G.ph !== 'raid' || G.srch || G.safe || G.fall || G.slide || G.stun > G.time) return 0; const j = cq.joy; G.slow = j ? Math.hypot(j.x - j.x0, j.y - j.y0) < 36 : !!cq.keys.shift; return G.slow ? 0.45 : 1; },
    // col mantello sono un po' trasparente (azzurro)
    tint: c => { const G = cq.g; return G && c === G.me && G.ph === 'raid' && G.cloak > G.time ? { c: '#a8dcff', a: 0.6, s: c.id } : null; },
    hud(G) {
      const P = G.ph === 'build' && cq.cam ? cq.cam : G.ph === 'raid' ? cq : G.ph === 'guard' && G.camC ? G.camC : cq, r = roomName(P.x, P.y), rr = roomAt(Math.floor(P.x), Math.floor(P.y)); if (r && rr && !rr.door) G.room = r;
      const n = G.st ? G.st.n : 1, sc = G.opp ? ` · 🏆 ${G.sc[G.me.id] || 0}-${G.sc[G.opp.id] || 0}` : '', head = `M${n}${sc}`;
      const hearts = `${'❤️'.repeat(Math.max(0, G.hp || 0))}${'🖤'.repeat(Math.max(0, HP - (G.hp || 0)))}`;
      if (G.ph === 'build') { const B = G.mine; return `${head} · 🔨 📍 <b>${esc(G.room || '')}</b> · 🪙 ${BUDGET - spent(B)} · ★ ${JOLLY - count(B, it => CAT[it.k].jolly)} · ⏱ <b${G.bt < 10 ? ' style="color:#ff8a7a"' : ''}>${mmss(Math.max(0, G.bt))}</b>`; }
      if (G.ph === 'guard') { const jl = G.mine.items.filter(it => CAT[it.k].jolly && !G.jused.has(it.key)).length; return `${head} · 🛡️ ${esc(G.thiefC ? G.thiefC.name : '')}: ${hearts} · 🔍 ${G.open.length}${G.has ? ' · 💎 <b style="color:#ff8a7a">ha il diamante!</b>' : ''} · ★ ${jl} · ⏱ ${mmss(Math.max(0, G.left))}`; }
      if (G.ph === 'raid') return `${head} · ${hearts} ${G.slow ? '🐢' : '🏃'}${G.cloak > G.time ? ' 🧥' : ''} · 📍 <b>${esc(G.room || '')}</b> · 🔍 ${G.open.length} · ${G.has ? '💎 <b>Al portone!</b> · ' : ''}⏱ ${mmss(Math.max(0, G.left))}`;
      return `${head} · 🪤 La casa delle trappole`;
    },
    big(G) {
      if (G.phase !== 'play' || !G.st) return G.ph === 'wait' && !G.st ? '⏳ Un attimo…' : '';
      const st = G.st;
      if (G.ph === 'inter') return st.msg + ' ' + Math.max(1, Math.ceil(3.5 - (G.time - st.t0))) + '…';
      if (G.ph === 'mres') return G.mv && G.time - st.t0 < 6 ? '' : st.msg + (st.fin ? '' : '\nProssima manche tra ' + Math.max(1, Math.ceil(10 - (G.time - st.t0))) + '…');
      if (G.ph === 'wait') return st.step === 'build' ? '⏳ Aspetto che ' + (G.opp ? G.opp.name : 'l\'altro') + ' finisca di preparare…' : '⏳ …';
      if (G.ph !== 'raid' && G.ph !== 'guard') return '';
      if (G.left < 10 && G.left > 0) return '⏱ ' + Math.ceil(G.left) + '…';
      return G.ph === 'raid' && G.stun > G.time ? (G.stunT || '') : '';
    },
    spotNear(G) {
      if (G.ph !== 'raid' || G.srch || G.has || G.safe || G.fall || G.resp) return null;
      let best = null, bd = NEAR; spots().forEach((s, i) => { if (G.open.includes(i)) return; const d = spotDist(s, cq.x, cq.y); if (d < bd) { bd = d; best = Object.assign({}, s, { i }); } });
      return best;
    },
    btn(G) {
      if (G.ph === 'build') { const A = aim(G); if (A.item) return { t: '🗑️ Togli', on: true }; return { t: '📌 Metti', on: !!(A.t && !A.t.err) && !(U.tool && CAT[U.tool].p > BUDGET - spent(G.mine)) }; }
      if (G.ph === 'guard') { const j = jollyHere(G); return j ? { t: JNAME[j.k], on: true } : null; }
      if (G.ph !== 'raid') return null;
      if (G.srch) return { t: '🔍 Cerco…', on: false };
      if (G.safe) return { t: '🔒 Scasso…', on: false };
      if (G.stun > G.time || G.fall || G.resp) return null;
      const s = this.spotNear(G); return s ? { t: '🔍 Apri: ' + s.n, on: true } : null;
    },
    act(G) {
      if (G.ph === 'build') { buildAct(G); return; }
      if (G.ph === 'guard') {
        const j = jollyHere(G); if (!j) return;
        if (G.thief === 'cpu') { jollyFire(G, j); return; }
        G.jused.add(j.key); G.jfx.push({ k: j.k, it: j, t: G.time, local: 1 }); beep(700, 0.06, 0.04);   // lo vedo subito; lo fa scattare davvero il telefono di chi ruba
        if (G.guest) cqNetSend({ k: 'jf', key: j.key }); else G.jr.push([j.key, ++G.jrSeq]);
        return;
      }
      if (G.ph !== 'raid' || G.stun > G.time || G.safe) return;
      const s = this.spotNear(G); if (!s) return;
      if (s.n === 'Cassaforte') { safeOpen(G, s.i); beep(320, 0.05, 0.03); return; }
      G.srch = { i: s.i, t0: G.time, d: s.h >= 2 ? 2 : 1, x: s.x + 0.5, y: s.y + 0.5 };
      beep(320, 0.05, 0.03);
    },
    // host: le fasi della partita (e il computer quando ruba)
    tick(G, dt) {
      const st = G.st; if (!st || !G.opp) return;
      if (st.step === 'build') {
        if (isCpu(G.opp) && !st.done[G.opp.id]) { G.villa[G.opp.id] = st.n === 1 ? cpuBuild() : cpuMove(G.villa[G.opp.id]); st.done[G.opp.id] = 1; }
        const lim = (st.n === 1 ? BUILD : BUILD2) + 6;
        if ((st.done[G.me.id] && st.done[G.opp.id]) || G.time - st.t0 > lim) {
          if (G.ph === 'build') buildDone(G);
          for (const c of [G.me, G.opp]) if (!G.villa[c.id]) G.villa[c.id] = cpuBuild();   // chi non ha finito in tempo (o si e' scollegato)
          runStart(G, 0);
        }
        return;
      }
      if (/^run/.test(st.step)) {
        if (G.ph === 'guard' && G.thief === 'cpu') { const e = simRun(G, dt); if (e) cpuRunEnd(G, e === 'ok'); }
        else if (st.thief !== G.me.id && G.time - st.t0 > TIME + 8) recordRun(G, st.thief, { ok: false, t: TIME, lost: G.lost || 0 });   // l'amico non risponde piu'
        return;
      }
      if (st.step === 'inter' && G.time - st.t0 > 3.5) runStart(G, 1);
      else if (st.step === 'mres' && G.time - st.t0 > 10) { if (st.fin) finalEnd(G); else { G.st = { n: st.n + 1, step: 'build', t0: G.time, done: {} }; enterStage(G); } }
    },
    // ogni telefono: la mia preparazione, il mio furto, le mie telecamere
    local(G, dt) {
      if (G.ph === 'build') {
        if (!document.getElementById('trBar')) buildOpen(G);
        if (!cq.cam) { TRCAM = true; cq.cam = { x: 16.5, y: 24.5 }; }
        G.bt -= dt;
        const A = aim(G), tip = document.getElementById('trTip'), C2 = CAT[U.tool];
        const txt = A.item ? '🗑️ ' + CAT[A.item.k].e + ' ' + CAT[A.item.k].n + ' — tocca Togli per toglierla' : !C2 ? '' : (A.t && !A.t.err ? C2.e + ' ' + C2.n + (aimName(A.t) ? ' → ' + aimName(A.t) : '') : C2.e + ' ' + C2.n + ': ' + (A.t ? A.t.err : ''));
        if (tip && tip.textContent !== txt) tip.textContent = txt;
        if (G.bt <= 0) buildDone(G);
        return;
      }
      if (G.ph === 'raid') {
        recTick(G);
        const e = simRun(G, dt);
        if (G.guest && (G.rsT = (G.rsT || 0) - dt) <= 0) { G.rsT = 0.25; cqNetSend({ k: 'rs', r: rsPack(G) }); }
        if (e) myRaidEnd(G, e === 'ok');
        return;
      }
      if (G.ph === 'guard') { camTick(G, dt); camBarBlink(G); }
      if (G.ph === 'raid' || G.ph === 'guard') recTick(G);
      if (G.ph === 'mres' && G.mv) { const e = G.time - G.st.t0; TRCAM = true; cq.cam = e < 6 ? { x: G.mv.x, y: G.mv.y } : { x: 16.5, y: 16 }; }
    },
    // online: stato dall'host (fasi, punteggio, la sua villa, il suo furto, i suoi jolly)
    snap(G) {
      const x = { st: G.st, sc: G.sc, V: {} }; if (G.villa[G.me.id]) x.V[G.me.id] = vPack(G.villa[G.me.id]);
      if (G.ph === 'raid' && G.thief === 'me') x.rs = rsPack(G);
      if (G.jr && G.jr.length) x.jr = G.jr.slice(-6);
      return x;
    },
    apply(G, x) {
      if (!x) return;
      G.sc = x.sc || {}; G.vstr = G.vstr || {};
      for (const [id, s] of Object.entries(x.V || {})) if (G.vstr[id] !== s) { G.vstr[id] = s; G.villa[+id] = vUnpack(s); }
      if (x.st) { G.st = x.st; if (stKey(x.st) !== G.stKey) enterStage(G); }
      if (x.rs && G.ph === 'guard' && G.thief === 'remote') rsApply(G, x.rs);
      if (x.jr && G.ph === 'raid') for (const [k, s] of x.jr) if (s > (G.jrSeen || 0)) { G.jrSeen = s; const it = G.rv.items.find(o => o.key === k); if (it) jollyFire(G, it); }
    },
    // host: azioni dell'amico (la sua villa, il suo furto, la fine del suo furto, i suoi jolly)
    ev(G, c, o) {
      if (!o || c !== G.opp || !G.st) return;
      if (o.k === 'vb' && G.st.step === 'build') { G.villa[c.id] = vUnpack(o.v); G.st.done[c.id] = 1; }
      else if (o.k === 'rs' && G.ph === 'guard' && G.thiefC === c) rsApply(G, o.r);
      else if (o.k === 'rd') recordRun(G, c.id, { ok: !!o.ok, t: +o.t || 0, lost: +o.lost || 0 });
      else if (o.k === 'jf' && G.ph === 'raid') { const it = G.rv.items.find(q => q.key === o.key); if (it) jollyFire(G, it); }
    },
    // sopra al ladro: diamante, stelline, vernice, torta
    deco(g, c, X, Y, TW, G, L) {
      if (c !== thiefChar(G) || (G.ph !== 'raid' && G.ph !== 'guard')) return;
      const u = TW / 34;
      if (G.has) diamond(g, X, Y - (cqTop(L) + 0.5) * TW + Math.sin(performance.now() / 200) * 2 * u, 9 * u);
      if (G.stun > G.time && !(G.cake && G.time - G.cake < 3) && !G.fall) { const hy = Y - cqTop(L) * TW * 0.95, a0 = performance.now() / 160; for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; g.fillStyle = i % 2 ? '#ffd24a' : '#fff4a0'; g.font = Math.round(11 * u) + 'px system-ui'; g.textAlign = 'center'; g.fillText('★', X + Math.cos(a) * 12 * u, hy + Math.sin(a) * 4 * u); } }
      if (G.paint) { g.fillStyle = 'rgba(60,120,220,.8)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(X + (i - 2) * 4 * u, Y - cqTop(L) * TW * (0.75 + 0.05 * (i % 2)) + (i % 3) * 3 * u, 2.4 * u, 0, 7); g.fill(); } }
      if (G.cake && G.time - G.cake < 3) { const hy = Y - cqTop(L) * TW * 0.78; g.fillStyle = '#fff6e8'; g.beginPath(); g.ellipse(X, hy, 11 * u, 8 * u, 0, 0, 7); g.fill(); g.fillStyle = '#e86a8a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X - 7 * u + i * 5 * u, hy - 6 * u + (i % 2) * 3 * u, 2 * u, 0, 7); g.fill(); } }
    },
    over(g, G, sx, sy, TW) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      dogsDraw(g, G, sx, sy, TW);
      if (G.ph === 'raid' || G.ph === 'guard') raidDraw(g, G, sx, sy, TW);
      if (G.ph === 'mres' && G.mv) { mvDraw(g, G, sx, sy, TW); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.scale(cq.dpr || 1, cq.dpr || 1); mvFrame(g, G); g.restore(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (G.ph === 'build' || G.ph === 'wait' && G.st && G.st.step === 'build') { if (G.ph === 'build') aimDraw(g, G, sx, sy, TW); itemsDraw(g, G, sx, sy, TW); return; }
      if (G.ph === 'guard') {
        itemsDraw(g, G, sx, sy, TW, (x, y) => camSees(G, x, y));
        const b = G.thiefC, S = G.srch || (G.safeT ? { t0: G.time - 1, d: 11 } : null);
        if (b && S && camSees(G, b.x, b.y) && !(G.cloak > G.time)) { const k = Math.min(1, (G.time - S.t0) / S.d), X = sx(b.x, b.y), Y = sy(b.x, b.y) - TW * 2.2; g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(X, Y, TW * 0.32, 0, 7); g.fill(); g.strokeStyle = '#ff6a5a'; g.lineWidth = TW * 0.08; g.beginPath(); g.arc(X, Y, TW * 0.24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); g.font = Math.round(TW * 0.28) + 'px system-ui'; g.fillText(G.safeT ? '🔒' : '🔍', X, Y + 1); }
        const R2 = camRoom(G); if (R2) {   // fuori dalla stanza inquadrata: buio (la telecamera vede solo la sua stanza)
          const x0 = R2.x - 0.7, y0 = R2.y - 0.7, x1 = R2.x + R2.w + 0.7, y1 = R2.y + R2.h + 0.7;
          g.beginPath(); g.rect(-1e5, -1e5, 2e5, 2e5); g.moveTo(sx(x0, y0), sy(x0, y0)); g.lineTo(sx(x0, y1), sy(x0, y1)); g.lineTo(sx(x1, y1), sy(x1, y1)); g.lineTo(sx(x1, y0), sy(x1, y0)); g.closePath();
          g.fillStyle = 'rgba(6,8,14,.88)'; g.fill('evenodd');
        }
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.scale(cq.dpr || 1, cq.dpr || 1); camDraw(g, G, TW); g.restore();
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
    // buio: in guardia si vede solo l'inquadratura della telecamera; nel mio furto di notte la torcia; in preparazione c'e' luce
    night(G) {
      if (G.ph === 'guard') {
        const on = G.camC && camRoom(G) && !(G.camOff > G.time);
        return { a: 0.96, r: 0.01, lights: on ? [[G.camC.x, G.camC.y, CAMR, 1]] : [], see: (x, y) => camSees(G, x, y) };
      }
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
  // uscendo dalla partita (o cambiando fase) catalogo, pianta, cassaforte, telecamere e mantello si chiudono da soli, la telecamera libera torna normale
  setInterval(() => {
    const G = cq.g, mine = G && G.mode === 'trappole' && G.phase === 'play';
    if (document.getElementById('trSafe') && !mine) closeSafe(G);
    if (document.getElementById('trCams') && !(mine && G.ph === 'guard')) camClose();
    if (document.getElementById('trCloak') && !(mine && G.ph === 'raid')) cloakClose();
    if (document.getElementById('trBar') && !(mine && G.ph === 'build')) buildClose();
    if (!mine && TRCAM) { TRCAM = false; if (!G || G.mode !== 'trappole') cq.cam = null; }
    if (G && G.mode === 'trappole' && G.phase !== 'play' && G.soft && G.soft.length) softClear(G);
  }, 400);
  window.__tr = { recBest, sfx, CAT, place, target, cpuBuild, cpuMove, spent, spots, buildDone, runStart, recordRun, enterStage, myRaidStart, myRaidEnd, watchStart, cpuRunEnd, finalEnd, vPack, vUnpack, rsPack, rsApply, jollyFire, jollyHere, camSees, camSet, U, aim, buildAct, planOpen, BUDGET, safeOpen, closeSafe };   // per le prove
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
