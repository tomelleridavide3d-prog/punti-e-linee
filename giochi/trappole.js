// La casa delle trappole (gioco 1 contro 1, vedi CLAUDE.md "PROSSIMA SESSIONE: Minigioco La casa delle trappole").
// Passo 1: la VILLA in pixel art (stessi attrezzi della hall: giochi/lib/pixel.js -> PXK) e una prima prova: il computer nasconde il diamante
// in un mobile, tu lo cerchi aprendo i mobili e lo riporti al portone entro 90 s. Giorno o notte (con la torcia) dalle impostazioni.
(() => {
  const { Pix, put, sh, mix, hx, fr, h2, dith, ZS } = window.PXK;
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const TIME = 90, NEAR = 1.35;

  // ---- PIANTA: 9 stanze a griglia 3x3 (piu' il corridoio di servizio), muri di una casella tra le stanze ----
  // colonne x: 1-9 | 11-22 | 24-32 ; righe y: 1-8 | 10-19 | 21-28 ; muri esterni a x 0, 33 e y 0, 29
  const W = 34, H = 30;
  const R = (n, x, y, w, h, k, c, paper) => ({ n, x, y, w, h, k, c: [c, sh0(c)], wc: paper, nl: 1, paper });
  const sh0 = c => { const v = hx(c).map(a => Math.round(a * 0.94)); return '#' + v.map(a => a.toString(16).padStart(2, '0')).join(''); };
  const ROOMS = [
    R('Biblioteca', 1, 1, 9, 8, 'biblio', '#6a2a2a', '#4a2a1a'),
    R('Studio', 11, 1, 12, 8, 'noce', '#5a3a26', '#2a3a5a'),
    R('Camera da letto', 24, 1, 9, 8, 'legno', '#8a5a3a', '#7a6a9a'),
    R('Serra', 1, 10, 9, 10, 'serra', '#a8a090', '#9ab8a0'),
    R('Salone', 11, 10, 12, 10, 'parquet', '#b9824a', '#6a2a3a'),
    R('Bagno', 24, 10, 9, 10, 'scacchi', '#d8d8d4', '#9ac0d0'),
    R('Cantina', 1, 21, 6, 8, 'pietra', '#6a6560', '#7a4a3a'),
    R('Corridoio', 8, 21, 2, 8, 'corr', '#8a5a3a', '#c8b48a'),
    R('Ingresso', 11, 21, 12, 8, 'marmo', '#d8ccb4', '#2e5a4a'),
    R('Cucina', 24, 21, 9, 8, 'cotto', '#c0603a', '#e0d4a0')];
  // porte: caselle di pavimento nei muri (k = di che porta si tratta)
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
    ['kchair', 27, 25, { d: 'e' }], ['ktable', 28, 25, { part: 1 }], ['ktable', 29, 25, {}], ['kchair', 30, 25, { d: 'w' }], ['dog', 28, 27],
    // Ingresso: tavolino con il cassetto, pendolo, cassapanca, appendiabiti, portaombrelli, armatura
    ['console', 12, 21, { h: 1, n: 'Cassetto del tavolino' }], ['armor', 11, 23], ['vase', 20, 21, { h: 1, n: 'Vaso' }], ['lamp', 21, 21], ['clock', 22, 21, { h: 2, n: 'Pendolo' }],
    ['bench', 22, 27, { h: 2, n: 'Cassapanca' }], ['coatrack', 14, 28], ['umbrella', 19, 28, { h: 1, n: 'Portaombrelli' }], ['plant', 11, 28],
    // Corridoio di servizio
    ['armor', 8, 24], ['sidetable', 8, 28, { h: 1, n: 'Cassetto del mobiletto' }],
    // Cantina: botti, scaffale delle bottiglie, casse, barattoli, baule vecchio
    ['barrel', 1, 22, { h: 2, n: 'Botte' }], ['barrel', 1, 23], ['barrel', 2, 22, { h: 2, n: 'Botte' }],
    ['winerack', 1, 26, { f: 'x' }], ['winerack', 1, 27, { f: 'x' }], ['winerack', 1, 28, { f: 'x' }],
    ['jarshelf', 5, 21, { f: 'y', h: 1, n: 'Barattoli' }], ['crate', 6, 21], ['crate', 6, 22, { h: 1, n: 'Cassa' }], ['crate', 6, 23], ['oldtrunk', 4, 27, { h: 2, n: 'Baule vecchio' }]];

  // ---- colori ----
  const C = {
    wood: hx('#6a3a24'), wood2: hx('#874c2e'), wood3: hx('#a5643c'), woodD: hx('#4a2818'), oak: hx('#b07a48'), oak2: hx('#c89058'),
    cream: hx('#e8dcbc'), cream2: hx('#cdb88a'), brass: hx('#c8a050'), brassD: hx('#8a6a2c'), gold: hx('#e8c46a'),
    white: hx('#ecebe6'), white2: hx('#d4d0c6'), steel: hx('#8a9098'), steel2: hx('#b8c0c8'), steelD: hx('#4a5058'),
    leaf: [hx('#2e6a3a'), hx('#3e8a46'), hx('#5aa854')], terra: hx('#b8603a'), black: hx('#22222a'),
  };
  const BOOKS = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#7a5a2a', '#5a2a5a', '#2a5a5a', '#9a7a3a', '#6a3a2a', '#c8b48a'].map(hx);

  // ---- luce: ambiente + lampade + finestre (sole di giorno, luna di notte) ----
  let NIGHT = 0, LIGHTS = [];
  const WIN_B = [[13.2, 14.8], [19.2, 20.8], [24.3, 25.7]];   // finestre sul muro in fondo (y = 0): studio (2) e camera
  const WIN_L = [[24.4, 25.6]];   // finestrella della cantina (x = 0); la serra ha tutto il muro di vetro
  function setup(props) {
    LIGHTS = [{ x: 16.5, y: 14.5, r: 6, c: [0.26, 0.2, 0.08] }];   // lampadario del salone
    for (const [t, x, y] of props) {
      if (t === 'lamp' || t === 'rlamp') LIGHTS.push({ x: x + 0.5, y: y + 0.5, r: 3.4, c: [0.42, 0.3, 0.1] });
      if (t === 'nightstand') LIGHTS.push({ x: x + 0.5, y: y + 0.5, r: 2.2, c: [0.3, 0.2, 0.06] });
    }
    const sun = NIGHT ? [-0.06, 0.0, 0.14] : [0.2, 0.17, 0.08];
    for (const [a, b] of WIN_B) LIGHTS.push({ x: (a + b) / 2, y: 2, r: 3, c: sun });
    for (let y = 11; y < 20; y += 2) LIGHTS.push({ x: 2, y, r: 2.6, c: sun });
    for (const [a, b] of WIN_L) LIGHTS.push({ x: 2, y: (a + b) / 2, r: 2.2, c: sun.map(v => v * 0.6) });
    LIGHTS.push({ x: 4, y: 24.5, r: 3, c: [0.16, 0.08, 0.0] });   // lanterna della cantina (calda, poca)
  }
  const AMB = [0.86, 0.82, 0.8];
  const lightAt = (wx, wy) => {
    let r = AMB[0], g = AMB[1], b = AMB[2];
    for (const L of LIGHTS) { const dd = Math.hypot(wx - L.x, wy - L.y); if (dd >= L.r) continue; const f = (1 - dd / L.r) ** 2; r += L.c[0] * f; g += L.c[1] * f; b += L.c[2] * f; }
    if (wx < 7 && wy > 21) { r *= 0.86; g *= 0.84; b *= 0.86; }   // la cantina e' piu' buia
    return [r, g, b];
  };

  // stanza (o porta) di una casella
  const roomAt = (x, y) => { const i = cqRoomOf[y] && cqRoomOf[y][x]; return i >= 0 ? CQ_ROOMS[i] : null; };
  const isWall = (x, y) => !!(cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].wall);
  const propAt = (x, y) => { const o = cqSolid[y] && cqSolid[y][x]; return o && o.prop ? o.prop : null; };

  // ---- PAVIMENTI ----
  const RUGS = [{ x0: 13.2, y0: 12.4, x1: 20.2, y1: 17.4, c: hx('#7a2a3a'), b: hx('#d8b060') }, { x0: 25.4, y0: 3.4, x1: 30.6, y1: 6.6, c: hx('#4a5a8a'), b: hx('#d8c8a0') },
    { x0: 15.3, y0: 21, x1: 17.7, y1: 29, c: hx('#8a2028'), b: hx('#c99a44'), run: 1 }, { x0: 30.6, y0: 12.2, x1: 32.4, y1: 13.2, c: hx('#e8eef2'), b: hx('#9ac0d0') },
    { x0: 27.2, y0: 24, x1: 30.8, y1: 26.8, c: hx('#9a3a2a'), b: hx('#e8d8b0') }];
  function floorPx(k, x, y, u, v, X, Y) {
    const wx = x + u, wy = y + v, Xg = (x - y) * 16 + X, Yg = (x + y) * 8 + Y, n = h2(Xg, Yg);
    for (const r of RUGS) if (wx >= r.x0 && wx < r.x1 && wy >= r.y0 && wy < r.y1) {
      const e = Math.min(wx - r.x0, r.x1 - wx, wy - r.y0, r.y1 - wy);
      if (e < 0.06) return sh(r.b, 0.8);
      if (e < 0.16) return r.b;
      if (e < 0.22) return sh(r.c, 0.8);
      if (r.run) return fr(wy * 2) < 0.08 ? sh(r.c, 1.15) : r.c;
      const a = fr((wx - r.x0) * 1.5), b = fr((wy - r.y0) * 1.5), d = Math.abs(a - 0.5) + Math.abs(b - 0.5);
      return d < 0.12 ? r.b : d > 0.42 ? sh(r.c, 0.88) : Math.abs(d - 0.28) < 0.03 ? sh(r.b, 0.85) : r.c;
    }
    switch (k) {
      case 'parquet': {   // quadrotti di listelli alternati (meta' casella)
        const bx = Math.floor(wx * 2), by = Math.floor(wy * 2), alt = (bx + by) & 1, s = alt ? fr(wy * 2) : fr(wx * 2), p = Math.floor((alt ? fr(wx * 2) : fr(wy * 2)) * 4);
        const col = [hx('#b9824a'), hx('#a8743f'), hx('#c99458'), hx('#b07a44')][(p + bx * 3 + by * 5) & 3];
        if ((alt ? fr(wx * 2) : fr(wy * 2)) * 4 % 1 < 0.12 || s < 0.04) return hx('#7a4a28');
        return sh(col, 0.97 + n * 0.06);
      }
      case 'legno': case 'noce': case 'corr': case 'door': case 'biblio': {   // assi di legno (studio e corridoio per lungo)
        const along = k === 'noce' || k === 'corr', a = along ? wx : wy, b = along ? wy : wx, j = Math.floor(a * 4);
        const cs = k === 'legno' ? ['#8a5a3a', '#7a4e32', '#966442'] : k === 'door' ? ['#b07a48', '#a06c3c', '#c08850'] : k === 'biblio' ? ['#4e2e1e', '#5a3422', '#462818'] : ['#5a3422', '#64402a', '#4e2e1e'];
        if (fr(a * 4) < 0.1) return hx('#2e1a10');
        if (fr(b * 0.6 + h2(j, 3) ) < 0.025) return hx('#3a2214');
        return sh(hx(cs[(j + Math.floor(b * 0.6 + h2(j, 3))) % 3]), 0.97 + n * 0.05);
      }
      case 'marmo': {   // marmo a scacchi crema e verde scuro con le venature
        let c = (x + y) % 2 ? hx('#3e5a50') : hx('#e6dcc6');
        const f = Math.sin(wx * 5.1 + Math.sin(wy * 3.7 + wx * 1.3) * 2.2 + wy * 3.3);
        if (Math.abs(f) < 0.05) c = sh(c, (x + y) % 2 ? 1.25 : 0.9);
        if (u < 1 / 16 || v < 1 / 16) return hx('#8a7a60');
        if (u > 15 / 16 || v > 15 / 16) return sh(c, 0.86);
        return sh(c, 0.98 + n * 0.04);
      }
      case 'cotto': {   // piastrelle di cotto
        const a = fr(wx * 2), b = fr(wy * 2); if (a < 0.07 || b < 0.07) return hx('#7a4a34');
        const t = h2(Math.floor(wx * 2), Math.floor(wy * 2)); return sh([hx('#c0603a'), hx('#b05634'), hx('#c8704a')][Math.floor(t * 3)], (a > 0.9 || b > 0.9 ? 0.86 : 1) * (0.97 + n * 0.05));
      }
      case 'scacchi': {   // bagno: piastrelle bianche e nere
        const a = fr(wx * 2), b = fr(wy * 2); if (a < 0.06 || b < 0.06) return hx('#9a9aa0');
        const blk = (Math.floor(wx * 2) + Math.floor(wy * 2)) & 1; return sh(blk ? hx('#2a2a34') : hx('#ecebe6'), (a > 0.92 || b > 0.92 ? 0.9 : 1) * (0.98 + n * 0.03));
      }
      case 'serra': {   // lastre di pietra chiara con il muschio nelle fughe
        const row = Math.floor(wy * 2), a = fr(wx * 2 + (row & 1) * 0.5), b = fr(wy * 2);
        if (a < 0.08 || b < 0.08) return n > 0.55 ? hx('#5a7a3a') : hx('#7a7262');
        const t = h2(Math.floor(wx * 2 + (row & 1) * 0.5), row); return sh(t < 0.33 ? hx('#b8b0a0') : t < 0.66 ? hx('#aaa292') : hx('#c2bba8'), 0.97 + n * 0.05);
      }
      case 'pietra': {   // cantina: ciottoli
        const row = Math.floor(wy * 3), a = fr(wx * 3 + (row & 1) * 0.5) - 0.5, b = fr(wy * 3) - 0.5, d = a * a + b * b * 1.3;
        if (d > 0.17) return hx('#3a3634');
        const t = h2(Math.floor(wx * 3 + (row & 1) * 0.5), row); return sh(t < 0.5 ? hx('#7a7570') : hx('#6a6560'), (a < -0.1 && b < -0.1 ? 1.12 : d > 0.11 ? 0.82 : 1) * (0.96 + n * 0.06));
      }
      case 'stairs': {   // scalini di pietra che scendono in cantina
        const s = fr(wy * 3); return s < 0.12 ? hx('#4a4542') : s < 0.3 ? hx('#9a958e') : sh(hx('#7a7570'), 1 - Math.floor(wy * 3 - 63) * 0.1);
      }
      case 'porch': {   // zerbino davanti al portone
        const e = Math.min(wx - 16, 18 - wx, v, 1 - v); if (e < 0.1) return hx('#4a3020');
        return fr(wx * 6) < 0.5 ? hx('#7a5a34') : hx('#6a4a2a');
      }
      case 'secret': return fr(wy * 4) < 0.1 ? hx('#2e1a10') : hx('#4e2e1e');
    }
    return hx('#808080');
  }
  const FL = new Map();
  function floorSpr(x, y) {
    const key = x + ',' + y; if (FL.has(key)) return FL.get(key);
    const S = new Pix(32, 17, 16, 0), rm = roomAt(x, y);
    let k = rm ? rm.k : 'legno';
    if (x >= 3 && x <= 4 && y === 21) k = 'stairs';
    const solid = propAt(x, y), wl = isWall(x - 1, y), wu = isWall(x, y - 1), tall = x === 1 || y === 1;
    S.top(0, 0, 1, 1, 0, (u, v, X, Y) => {
      let c = floorPx(k, x, y, u, v, X, Y);
      // ombra dei muri dietro (in alto a sinistra e a destra) e sotto i mobili
      if ((wl && u < (tall && x === 1 ? 0.22 : 0.12)) || (wu && v < (tall && y === 1 ? 0.22 : 0.12))) c = mix(sh(c, 0.78), [70, 60, 112], 0.14);
      else if ((wl && u < 0.2) || (wu && v < 0.2)) { if (dith(X, Y) < 0.5) c = sh(c, 0.88); }
      if (solid) { const e = Math.min(u, 1 - u, v, 1 - v); if (e > 0.1 || (e > 0.05 && dith(X, Y) < 0.5)) c = sh(c, 0.76); }
      return c;
    });
    S.light((X, Y) => { const a = X + 0.5 - 16, b = Y + 0.5; return lightAt(x + (a / 16 + b / 8) / 2, y + (b / 8 - a / 16) / 2); });
    const s = S.canvas(); FL.set(key, s); return s;
  }

  // ---- MURI: in fondo (y = 0) e a sinistra (x = 0) alti con la carta da parati e le finestre; tutti gli altri bassi (si vede dentro le stanze) ----
  const WH = 3.3, LH = 1.15, FH = 0.95;
  let EM = 0;
  function paperTex(rm, w, z, X, Y, tallW) {
    const k = rm ? rm.pk || rm.k : '', p = hx(rm && rm.paper || '#c8b48a');
    if (z < 0.16) return z > 0.12 ? C.wood3 : C.woodD;   // battiscopa
    if (k === 'biblio') {   // librerie dipinte su tutto il muro
      if (!tallW) return z > LH - 0.08 ? C.wood3 : fr(z * 2.4) < 0.18 ? C.woodD : BOOKS[Math.floor(h2(Math.floor(w * 9), Math.floor(z * 2.4)) * BOOKS.length)];
      const sz = fr(z * 1.6); if (sz < 0.14) return sh(C.wood, 1.1); if (sz > 0.94) return C.woodD;
      const bi = Math.floor(w * 10 + Math.floor(z * 1.6) * 3.3), bb = BOOKS[Math.floor(h2(bi, Math.floor(z * 1.6)) * BOOKS.length)], top = 0.55 + 0.35 * h2(bi, 7);
      if (sz > top) return hx('#1e120c');
      return fr(w * 10 + Math.floor(z * 1.6) * 3.3) < 0.12 ? sh(bb, 0.7) : Math.abs(sz - top * 0.7) < 0.04 ? C.gold : bb;
    }
    if (k === 'pietra') {   // mattoni
      const row = Math.floor(z * 5), a = fr(w * 2.5 + (row & 1) * 0.5), b = fr(z * 5);
      if (a < 0.07 || b < 0.12) return hx('#4a3a32');
      return sh(hx('#7a4a3a'), 0.9 + 0.2 * h2(Math.floor(w * 2.5 + (row & 1) * 0.5), row));
    }
    if (k === 'cotto' || k === 'scacchi') {   // piastrelle fino a 1,4, sopra la carta
      if (z < (tallW ? 1.4 : LH)) { const a = fr(w * 4), b = fr(z * 4); if (a < 0.08 || b < 0.08) return sh(p, 0.78); return sh(p, a > 0.85 || b > 0.85 ? 0.92 : 1.04); }
      return sh(p, 0.92);
    }
    if (k === 'serra') return p;
    // boiserie fino a 0,9, cornice, carta da parati con il disegno della stanza
    if (z < 0.9) { const ps = fr(w * 2); return ps < 0.08 || ps > 0.92 || z < 0.24 || z > 0.82 ? sh(C.wood, 1.02) : ps < 0.12 || z > 0.78 ? C.wood3 : C.wood2; }
    if (z < 0.98) return z > 0.95 ? C.gold : C.brassD;
    if (k === 'parquet') { const a = fr(w * 3), b = fr(z * 2.4), d = Math.abs(a - 0.5) + Math.abs(b - 0.5) * 1.3; return d < 0.12 ? sh(p, 1.35) : d < 0.2 ? sh(p, 1.12) : p; }   // damasco
    if (k === 'noce') return fr(w * 4) < 0.08 ? sh(C.gold, 0.8) : p;   // righe d'oro
    if (k === 'legno') return h2(Math.floor(w * 5), Math.floor(z * 5)) > 0.8 && fr(w * 5) > 0.3 && fr(w * 5) < 0.7 && fr(z * 5) > 0.3 && fr(z * 5) < 0.7 ? hx('#e8d8f0') : p;   // fiorellini
    if (k === 'marmo') return fr(w * 3) < 0.1 ? sh(p, 1.3) : p;
    return fr(w * 3 + z) < 0.05 ? sh(p, 0.9) : p;
  }
  // finestre e quadri dei muri alti
  function wallDeco(side, w, z, X, Y, rm) {
    if (side === 'b') {
      for (const [a, b] of WIN_B) if (w > a && w < b && z > 0.95 && z < 2.75) {
        if (w < a + 0.08 || w > b - 0.08 || z < 1.03 || z > 2.67) return C.cream;
        if (Math.abs(w - (a + b) / 2) < 0.04 || Math.abs(z - 1.9) < 0.04) return C.cream2;
        EM = 1; return sky(fr((z - 1.03) / 1.64), X, Y, w);
      }
      if (rm && rm.n === 'Studio' && w > 16 && w < 18.4 && z > 1.35 && z < 2.45) {   // quadro: veliero al tramonto
        if (w < 16.1 || w > 18.3 || z < 1.45 || z > 2.35) return fr(w * 10 + z * 4) < 0.5 ? C.gold : C.brassD;
        const hz = 1.75 + 0.03 * Math.sin(w * 9);
        if (z < hz) return fr(w * 7 + z * 3) < 0.3 ? hx('#3a5a8a') : hx('#2a4a72');
        if (Math.abs(w - 17.2) < 0.03 && z < 2.2) return hx('#3a2a1a');
        if (Math.abs(w - 17.2) < 0.3 - (z - hz) * 0.5 && w > 17.2 && z > hz + 0.08 && z < 2.15) return hx('#f2ecd8');
        return mix(hx('#e8a868'), hx('#5a6ab0'), Math.min(1, (z - hz) / 0.6));
      }
      if (rm && rm.n === 'Camera da letto' && w > 27.3 && w < 28.7 && z > 1.55 && z < 2.3) {   // quadretto sopra il letto
        if (w < 27.38 || w > 28.62 || z < 1.62 || z > 2.23) return C.gold;
        return z < 1.85 ? hx('#5a8a4a') : fr(w * 3) < 0.5 ? hx('#a8c8e8') : hx('#b8d4ec');
      }
    } else {
      if (rm && rm.k === 'serra' && z > 0.5 && z < 3.1) {   // muro di vetro della serra
        const a = fr(w * 1.0), b = (z - 0.5) / 2.6;
        if (a < 0.05 || a > 0.95 || b < 0.02 || b > 0.98 || Math.abs(b - 0.5) < 0.02) return hx('#e8ecef');
        EM = 1; return sky(b, X, Y, w);
      }
      for (const [a, b] of WIN_L) if (w > a && w < b && z > 2.0 && z < 2.8) {   // finestrella con le sbarre della cantina
        if (w < a + 0.07 || w > b - 0.07 || z < 2.06 || z > 2.74 || fr((w - a) * 4) < 0.15) return hx('#3a3634');
        EM = 1; return sky((z - 2) / 0.8, X, Y, w);
      }
    }
    return null;
  }
  // cielo nelle finestre: di giorno azzurro con le nuvole, di notte blu con le stelle (e la luna in una finestra)
  function sky(t, X, Y, w) {
    if (NIGHT) { if (h2(X * 3, Y * 7) > 0.97) return hx('#e6e8ff'); if (w > 19.6 && w < 20.2 && t > 0.6 && t < 0.8) return hx('#f2ecd0'); return mix(hx('#0e1430'), hx('#24386e'), Math.floor((1 - t) * 4 + dith(X, Y)) / 4); }
    const cl = Math.sin(w * 7 + t * 5) + Math.sin(w * 3.1 - t * 9); if (cl > 1.3 && t > 0.4) return hx('#f4f8fc');
    return mix(hx('#bfe0f4'), hx('#6aa8e0'), Math.floor(t * 4 + dith(X, Y)) / 4);
  }
  const WL = new Map();
  function wallSpr(x, y) {
    const key = x + ',' + y; if (WL.has(key)) return WL.get(key);
    const S = new Pix(48, 104, 24, 84);
    const back = y === 0, left = x === 0;
    if (back || left) {
      // muro alto: la faccia verso la stanza ha la carta da parati della stanza davanti
      const rmB = roomAt(x, 1) || roomAt(x - 1, 1) || roomAt(x + 1, 1), rmL = roomAt(1, y) || roomAt(1, y - 1) || roomAt(1, y + 1);
      const tex = (side, rm, w0, w1) => (s, t, X, Y) => {
        const w = w0 + s * (w1 - w0), z = t * WH; EM = 0;
        if (z > WH - 0.14) return z > WH - 0.06 ? C.cream : C.cream2;
        const d = wallDeco(side, w, z, X, Y, rm); if (EM) return d;
        const c = d || paperTex(rm, w, z, X, Y, 1);
        const L = side === 'b' ? lightAt(w, 1.05) : lightAt(1.05, w), k = 0.86 + 0.14 * Math.min(1, z / 1.2);
        return [c[0] * Math.round(L[0] * k * 24) / 24, c[1] * Math.round(L[1] * k * 24) / 24, c[2] * Math.round(L[2] * k * 24) / 24];
      };
      if (back && left) S.box(0.76, 0.76, 1, 1, 0, WH, C.cream2, { l: sh(C.cream2, 0.7), r: sh(C.cream2, 0.6), t: C.woodD });
      else if (back) { const x1 = x === W - 1 ? 0.24 : 1; S.box(0, 0.76, x1, 1, 0, WH, C.cream2, { l: tex('b', rmB, x, x + x1), r: sh(hx(rmB ? rmB.paper : '#888'), 0.55), t: C.woodD }); }
      else { const y1 = y === H - 1 ? 0.24 : 1; S.box(0.76, 0, 1, y1, 0, WH, C.cream2, { l: sh(hx(rmL ? rmL.paper : '#888'), 0.6), r: tex('l', rmL, y, y + y1), t: C.woodD }); }
    } else {
      // muro basso: un pilastrino al centro e un braccio verso ogni muro vicino; ogni faccia ha la carta della stanza che guarda
      const front = y === H - 1 || x === W - 1, hh = front ? FH : LH, A = 0.38, B = 0.62;
      const face = (rm, wdir) => (s, t, X, Y) => {
        const z = t * hh;
        if (z > hh - 0.07) return C.woodD;
        if (front && !rm) { if (z < 0.3) return fr(s * 3 + (x + y) * 0.5) < 0.06 ? hx('#5a5048') : hx('#8a8070'); return fr(z * 6) < 0.06 ? hx('#c8b898') : hx('#d8c8a8'); }   // fuori: intonaco e zoccolo di pietra
        const w = wdir(s), c = paperTex(rm, w, z, X, Y, 0), L = rm ? lightAt(rm === roomAt(x, y + 1) ? x + 0.5 : x + 1.05, rm === roomAt(x, y + 1) ? y + 1.05 : y + 0.5) : [0.8, 0.78, 0.8];
        return [c[0] * Math.round(L[0] * 24) / 24, c[1] * Math.round(L[1] * 24) / 24, c[2] * Math.round(L[2] * 24) / 24];
      };
      const fy = face(roomAt(x, y + 1), s => x + s), fx = face(roomAt(x + 1, y), s => y + s), top = C.woodD;
      const seg = (x0, y0, x1, y1) => S.box(x0, y0, x1, y1, 0, hh, C.wood, { l: (s, t, X, Y) => fy(x0 + s * (x1 - x0), t, X, Y), r: (s, t, X, Y) => fx(y0 + s * (y1 - y0), t, X, Y), t: top });
      // bracci verso i muri vicini, dal dietro al davanti
      const lib = DOORS.some(d => d[6] === 'secret' && d[0] === x && Math.abs(d[1] - y) === 1);
      if (lib) {   // le due librerie alte accanto al passaggio segreto
        const y0 = y < 4 ? 0 : 0.0, y1 = 1;
        S.box(0.3, y0, 0.7, y1, 0, 2.3, C.wood, { l: C.woodD, r: (s, t) => { const z = t * 2.3, sz = fr(z * 1.6); if (z > 2.2) return C.wood3; if (sz < 0.14) return C.wood2; const bi = Math.floor(s * 10 + y * 7); return fr(s * 10) < 0.12 ? C.woodD : sz > 0.6 + 0.3 * h2(bi, 3) ? hx('#1e120c') : BOOKS[Math.floor(h2(bi, Math.floor(z * 1.6)) * BOOKS.length)]; }, t: C.wood3 });
        if (y === 3) { const [X, Y] = S.P(0.7, 0.85, 1.3); S.set(Math.round(X), Math.round(Y), C.gold); S.set(Math.round(X) + 1, Math.round(Y), C.gold); }   // il libro-leva
      } else {
        if (isWall(x, y - 1)) seg(A, 0, B, 0.5);
        if (isWall(x - 1, y)) seg(0, A, 0.5, B);
        seg(A, A, B, B);
        if (isWall(x + 1, y)) seg(0.5, A, 1, B);
        if (isWall(x, y + 1)) seg(A, 0.5, B, 1);
      }
      // lanterne ai lati del portone
      if (y === PORCH.y && (x === PORCH.x0 - 1 || x === PORCH.x1)) {
        S.box(0.4, 0.4, 0.6, 0.6, hh, hh + 0.5, C.black);
        S.emit = 1; S.box(0.36, 0.36, 0.64, 0.64, hh + 0.5, hh + 0.9, hx('#ffd890'), { l: hx('#ffcc70'), r: hx('#e8b058'), t: C.black }); S.emit = 0;
        S.box(0.33, 0.33, 0.67, 0.67, hh + 0.9, hh + 1.0, C.black);
      }
      S.outline();
    }
    const s = S.canvas(); WL.set(key, s); return s;
  }

  // ---- MOBILI in pixel art ----
  const same = (x, y, t) => propAt(x, y) === t;
  // davanti di un mobile: cassetti (dr) o ante (dw), con la cornice, i pomelli d'ottone e lo zoccolo
  const front = (c, kind, n = 2) => (s, t) => {
    if (t < 0.07) return sh(c, 0.55);
    if (s < 0.05 || s > 0.95 || t > 0.95) return sh(c, 0.8);
    if (kind === 'dr') {
      const q = (t - 0.07) / 0.88 * n, b = fr(q);
      if (b < 0.07) return sh(c, 0.62);
      if (Math.abs(s - 0.5) < 0.05 && Math.abs(b - 0.55) < 0.12) return C.brass;
      return b > 0.88 ? sh(c, 1.12) : c;
    }
    if (Math.abs(s - 0.5) < 0.025) return sh(c, 0.6);
    if (Math.abs(s - 0.5) < 0.09 && Math.abs(s - 0.5) > 0.05 && Math.abs(t - 0.55) < 0.05) return C.brass;
    const ps = fr(s * 2); if (ps < 0.14 || ps > 0.86 || t < 0.14 || t > 0.88) return sh(c, 1.06);
    return c;
  };
  const legs = (S, x0, y0, x1, y1, h, c, w = 0.06) => { for (const [a, b] of [[x0, y0], [x1 - w, y0], [x0, y1 - w], [x1 - w, y1 - w]]) S.box(a, b, a + w, b + w, 0, h, c); };
  const PR = new Map();
  function propSpr(t, x, y, o) {
    o = o || {};
    const key = t + ',' + x + ',' + y; if (PR.has(key)) return PR.get(key);
    const S = new Pix(112, 150, 56, 120), glow = [];
    let skip = null;
    const fy = o.f !== 'x';   // davanti verso sinistra (faccia y) o verso destra (faccia x)
    const ffront = (c, kind, n) => fy ? { l: front(c, kind, n), r: sh(c, 0.64) } : { l: sh(c, 0.8), r: (s, tt) => sh(front(c, kind, n)(s, tt), 0.82) };
    if (o.part) { const s = Object.assign(S.canvas(), { glow }); PR.set(key, s); return s; }   // la seconda casella di un mobile lungo: lo disegna l'altra
    switch (t) {
      case 'shelf': {   // libreria piena di libri; quelle in fila fanno un mobile solo
        const books = (s, tt) => {
          const z = tt * 2.5, sz = fr(z * 1.4); if (z > 2.4) return C.wood3; if (sz < 0.12) return sh(C.wood, 1.08);
          const bi = Math.floor(s * 9 + (fy ? x : y) * 9 + Math.floor(z * 1.4) * 4), top = 0.55 + 0.38 * h2(bi, 11), bb = BOOKS[Math.floor(h2(bi, Math.floor(z * 1.4)) * BOOKS.length)];
          if (s < 0.03 || s > 0.97) return C.woodD;
          if (sz > top) return hx('#1e120c');
          return fr(s * 9) < 0.12 ? sh(bb, 0.7) : Math.abs(sz - top * 0.75) < 0.035 ? C.gold : bb;
        };
        if (fy) { S.box(0, 0.52, 1, 0.98, 0, 2.5, C.wood, { l: books, r: C.woodD, t: C.wood3 }); const jl = same(x - 1, y, t), jr = same(x + 1, y, t); skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); }; }
        else { S.box(0.02, 0, 0.48, 1, 0, 2.5, C.wood, { l: C.woodD, r: books, t: C.wood3 }); }
        break;
      }
      case 'globe': {   // mappamondo d'epoca sul treppiede
        legs(S, 0.3, 0.3, 0.7, 0.7, 0.55, C.woodD, 0.07); S.cyl(0.5, 0.5, 0.26, 0.55, 0.62, C.wood, { top: C.wood3 });
        const [cx, cy] = S.P(0.5, 0.5, 1.05); S.ell(cx, cy, 10, 10, (dx, dy) => { const land = Math.sin(dx * 5 + 1) + Math.sin(dy * 6 - dx * 3) > 0.6; const c = land ? hx('#c8a860') : hx('#3a6a9a'); return sh(c, dx < -0.3 && dy < -0.2 ? 1.2 : dx > 0.4 || dy > 0.5 ? 0.75 : 1); });
        S.line(cx - 1, cy - 12, cx + 4, cy + 11, C.brass); S.line(cx - 2, cy - 12, cx + 3, cy + 11, C.brassD);
        break;
      }
      case 'armchair': case 'kchair': case 'chair': {   // poltrona (velluto) o sedia (legno); d = verso dove guarda
        const kc = t !== 'armchair', v = kc ? C.wood2 : hx(o.c || '#7a2a2a'), v2 = sh(v, 1.18), d = o.d || 's';
        const B = { s: [0.16, 0.14, 0.84, 0.3], n: [0.16, 0.7, 0.84, 0.86], e: [0.14, 0.16, 0.3, 0.84], w: [0.7, 0.16, 0.86, 0.84] }[d];
        const bh = kc ? 1.45 : 1.3, sz = kc ? 0.62 : 0.45;
        if (kc) legs(S, 0.2, 0.2, 0.8, 0.8, sz, C.woodD, 0.06);
        const parts = [{ b: B, z: [kc ? sz : 0.1, bh], back: 1 }, { b: [0.18, 0.18, 0.82, 0.82], z: [kc ? sz - 0.06 : 0.1, sz], seat: 1 }];
        if (!kc) { const side = d === 's' || d === 'n'; parts.push({ b: side ? [0.12, 0.2, 0.28, 0.84] : [0.2, 0.12, 0.84, 0.28], z: [0.1, 0.72] }, { b: side ? [0.72, 0.2, 0.88, 0.84] : [0.2, 0.72, 0.84, 0.88], z: [0.1, 0.72] }); }
        const ctr = p => (p.b[0] + p.b[2]) / 2 + (p.b[1] + p.b[3]) / 2;
        parts.sort((p, q) => ctr(p) - ctr(q)).forEach(p => {
          const tuft = (s2, tt) => kc ? (fr(s2 * 4) < 0.15 ? sh(v, 0.8) : v) : (Math.abs(fr(s2 * 3) - 0.5) < 0.08 && Math.abs(fr(tt * 2.5) - 0.5) < 0.1 ? sh(v, 0.62) : v);
          if (p.seat) S.box(...p.b.slice(0, 2), ...p.b.slice(2), p.z[0], p.z[1], v, { t: kc ? C.wood3 : v2, l: sh(v, 0.82), r: sh(v, 0.66) });
          else if (p.back) S.box(p.b[0], p.b[1], p.b[2], p.b[3], p.z[0], p.z[1], v, { l: d === 's' ? tuft : sh(v, 0.8), r: d === 'e' ? (s2, tt) => sh(tuft(s2, tt), 0.85) : sh(v, 0.64), t: v2 });
          else S.box(p.b[0], p.b[1], p.b[2], p.b[3], p.z[0], p.z[1], v, { t: v2 });
        });
        if (!kc) for (const [a, b] of [[0.18, 0.82], [0.82, 0.82], [0.82, 0.18]]) S.box(a - 0.04, b - 0.04, a + 0.04, b + 0.04, 0, 0.1, C.woodD);
        break;
      }
      case 'lamp': case 'rlamp': {   // lampada a stelo con il paralume acceso (rlamp: da lettura, piegata)
        S.cyl(0.5, 0.5, 0.18, 0, 0.06, C.brassD, { top: C.brass }); S.box(0.47, 0.47, 0.53, 0.53, 0.06, t === 'rlamp' ? 1.6 : 1.85, C.brass, { l: C.brass, r: C.brassD });
        const cz = t === 'rlamp' ? 1.5 : 1.75, cc = t === 'rlamp' ? hx('#3a7a4a') : hx('#f4dca0');
        S.emit = 1; S.cyl(0.5, 0.5, 0.28, cz, cz + 0.5, cc, { side: (dx, tt) => sh(cc, (dx < -0.3 ? 1.04 : dx < 0.4 ? 0.96 : 0.86) * (tt < 0.15 ? 0.9 : 1)), top: sh(cc, 1.15) }); S.emit = 0;
        glow.push([0.5, 0.5, cz + 0.2, 2.0, 'rgba(255,196,110,.3)']);
        break;
      }
      case 'sidetable': case 'nightstand': case 'console': case 'rdesk': case 'dresser': case 'filecab': case 'kcounter': case 'bathcab': case 'sideboard': {
        const D = {   // [x0, y0, x1, y1, altezza, colore, davanti, cassetti]
          sidetable: [0.2, 0.2, 0.8, 0.8, 0.72, C.wood2, 'dr', 1], nightstand: [0.18, 0.4, 0.82, 0.9, 0.66, C.wood2, 'dr', 2], console: [0.08, 0.45, 0.92, 0.92, 0.9, C.wood, 'dr', 1],
          rdesk: [0.08, 0.15, 0.92, 0.85, 0.88, C.wood, 'dr', 2], dresser: [0.45, 0.06, 0.92, 0.94, 1.1, C.wood2, 'dr', 3], filecab: [0.12, 0.42, 0.88, 0.95, 1.6, hx('#5a6a5a'), 'dr', 3],
          kcounter: [0, 0.38, 1, 0.98, 1.0, hx('#e8e0cc'), 'dr', 2], bathcab: [0.5, 0.12, 0.95, 0.88, 1.55, C.white, 'dw'], sideboard: [0, 0.45, 1, 0.95, 1.05, C.wood, 'dw'] }[t];
        const [x0, y0, x1, y1, hh, col, kind, n] = D, fr2 = t === 'dresser' || t === 'bathcab' ? { l: sh(col, 0.8), r: (s, tt) => sh(front(col, kind, n)(s, tt), 0.82) } : ffront(col, kind, n);
        if (t === 'sidetable') { legs(S, x0, y0, x1, y1, 0.5, C.woodD); S.box(x0, y0, x1, y1, 0.5, hh, col, ffront(col, 'dr', 1)); }
        else S.box(x0, y0, x1, y1, 0, hh, col, fr2);
        const topC = t === 'kcounter' ? hx('#8a6a4a') : t === 'bathcab' ? C.white2 : sh(col, 1.12);
        S.box(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, hh, hh + 0.06, topC, { t: t === 'kcounter' ? (u, v) => fr(u * 5 + x) < 0.06 ? hx('#6a4a32') : hx('#a07a52') : topC });
        const z = hh + 0.06;
        if (t === 'sidetable') { S.cyl(0.5, 0.5, 0.08, z, z + 0.28, hx('#dfe6f2'), { top: hx('#2a6a3a') }); for (let i = 0; i < 5; i++) { const [fx, fy2] = S.P(0.5 + 0.1 * Math.cos(i * 1.3), 0.5 + 0.1 * Math.sin(i * 1.3), z + 0.38 + 0.06 * (i % 2)); S.ell(fx, fy2, 2.2, 1.8, i % 2 ? hx('#e8c040') : hx('#f0f0f0')); } }
        if (t === 'nightstand') { S.cyl(0.5, 0.65, 0.07, z, z + 0.3, C.brass); S.emit = 1; S.cyl(0.5, 0.65, 0.17, z + 0.3, z + 0.55, hx('#f4dca0')); S.emit = 0; glow.push([0.5, 0.65, z + 0.4, 1.2, 'rgba(255,200,120,.28)']); }
        if (t === 'console') { S.cyl(0.35, 0.68, 0.14, z, z + 0.08, hx('#c8d8e8')); S.box(0.62, 0.6, 0.8, 0.76, z, z + 0.05, hx('#7a2a22')); }
        if (t === 'rdesk') { S.box(0.2, 0.3, 0.5, 0.55, z, z + 0.04, hx('#f2ecd8'), { t: (u, v) => fr(v * 8) < 0.2 ? hx('#9a9080') : hx('#f2ecd8') }); S.cyl(0.72, 0.4, 0.05, z, z + 0.14, hx('#2a2a32')); S.line(...S.P(0.6, 0.6, z + 0.05), ...S.P(0.75, 0.62, z + 0.3), hx('#e8e0d0')); }
        if (t === 'dresser') { S.box(0.7, 0.3, 0.9, 0.7, z, z + 0.25, hx('#e8d8f0')); S.cyl(0.6, 0.75, 0.06, z, z + 0.2, hx('#c86a8a')); }
        if (t === 'sideboard') { if (!same(x - 1, y, t)) S.cyl(0.4, 0.7, 0.12, z, z + 0.45, hx('#e8ecf4'), { side: (dx, tt) => sh(Math.abs(tt - 0.5) < 0.2 ? hx('#2c4e86') : hx('#e8ecf4'), dx < -0.3 ? 1.05 : dx < 0.4 ? 0.92 : 0.78) }); else { S.box(0.3, 0.6, 0.7, 0.68, z, z + 0.5, C.gold); } const jl = same(x - 1, y, t), jr = same(x + 1, y, t); skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); }; }
        if (t === 'kcounter') { const jl = same(x - 1, y, 'kcounter') || same(x - 1, y, 'ksink') || same(x - 1, y, 'stove'), jr = same(x + 1, y, 'kcounter') || same(x + 1, y, 'ksink') || same(x + 1, y, 'stove'); skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); }; if (x === 26) { S.box(0.2, 0.55, 0.45, 0.8, z, z + 0.28, hx('#c8402a')); S.box(0.55, 0.5, 0.85, 0.75, z, z + 0.12, C.wood3); } }
        if (t === 'bathcab') { S.box(0.55, 0.3, 0.92, 0.7, z, z + 0.08, hx('#9ac0d0')); }
        break;
      }
      case 'desk': {   // scrivania lunga di noce (2 caselle: questa e quella a sinistra) con la lampada verde, i fogli e il calamaio
        const c = C.wood;
        S.box(-0.92, 0.2, -0.45, 0.8, 0, 0.85, c, { l: front(c, 'dr', 3), r: sh(c, 0.64) }); S.box(0.45, 0.2, 0.92, 0.8, 0, 0.85, c, { l: front(c, 'dr', 3), r: sh(c, 0.64) });
        S.box(-0.45, 0.25, 0.45, 0.3, 0.3, 0.85, sh(c, 0.7));
        S.box(-0.96, 0.15, 0.96, 0.85, 0.85, 0.93, C.wood2, { t: (u, v) => u > 0.2 && u < 0.7 && v > 0.15 && v < 0.85 ? hx('#2e5a3a') : C.wood2 });
        S.box(-0.2, 0.35, 0.2, 0.6, 0.93, 0.96, hx('#f2ecd8')); S.cyl(0.7, 0.4, 0.05, 0.93, 1.3, C.brass); S.emit = 1; S.box(0.55, 0.32, 0.85, 0.48, 1.3, 1.42, hx('#2e7a4a'), { t: hx('#3e9a5a') }); S.emit = 0;
        glow.push([0.7, 0.45, 1.3, 1.2, 'rgba(190,255,170,.22)']); S.cyl(-0.6, 0.45, 0.05, 0.93, 1.03, hx('#1a1a2a'));
        break;
      }
      case 'safe': {   // cassaforte di ghisa verde scuro con la manopola, la maniglia e le cerniere d'ottone
        const c = hx('#3a4a46');
        S.box(0.1, 0.25, 0.9, 0.92, 0, 0.12, C.black);
        S.box(0.12, 0.27, 0.88, 0.9, 0.12, 1.35, c, { l: (s, tt) => s < 0.08 || s > 0.92 || tt < 0.06 || tt > 0.94 ? sh(c, 1.25) : (s > 0.86 && (Math.abs(tt - 0.25) < 0.05 || Math.abs(tt - 0.75) < 0.05)) ? C.brass : Math.abs(s - 0.5) < 0.4 && Math.abs(tt - 0.88) < 0.04 ? C.gold : c, r: sh(c, 0.7), t: sh(c, 1.2) });
        const [dx, dy] = S.P(0.45, 0.9, 0.8); S.ell(dx, dy, 4.5, 5, (a, b) => a * a + b * b > 0.6 ? C.steel2 : a * a + b * b < 0.12 ? C.steelD : C.steel);
        S.line(Math.round(dx) + 6, Math.round(dy) + 1, Math.round(dx) + 6, Math.round(dy) + 7, C.steel2); S.line(Math.round(dx) + 7, Math.round(dy) + 1, Math.round(dx) + 7, Math.round(dy) + 7, C.steel);
        break;
      }
      case 'plant': {   // vaso blu con la pianta folta
        S.cyl(0.5, 0.5, 0.24, 0, 0.42, hx('#2c4e86'), { side: (dx, tt) => sh(Math.abs(tt - 0.75) < 0.08 ? hx('#e8ecf4') : hx('#2c4e86'), dx < -0.5 ? 1.12 : dx < 0 ? 1 : dx < 0.5 ? 0.86 : 0.72), top: hx('#3a2a1a') });
        bush(S, x, y, 0.55, 1.6, 22, 1); break;
      }
      case 'bigpot': {   // vaso grande di terracotta con un cespuglio fiorito
        S.cyl(0.5, 0.5, 0.36, 0, 0.7, C.terra, { side: (dx, tt) => sh(Math.abs(tt - 0.85) < 0.07 ? sh(C.terra, 1.2) : C.terra, dx < -0.5 ? 1.12 : dx < 0 ? 1 : dx < 0.5 ? 0.86 : 0.72), top: hx('#3a2a1a') });
        bush(S, x, y, 0.8, 1.9, 26, 1.25, hx('#e86a8a')); break;
      }
      case 'palm': {   // palma nel vaso: tronco a anelli e foglie lunghe
        S.cyl(0.5, 0.5, 0.3, 0, 0.55, C.terra, { top: hx('#3a2a1a') });
        S.cyl(0.5, 0.5, 0.08, 0.55, 2.4, hx('#8a6a42'), { side: (dx, tt) => sh(fr(tt * 9) < 0.3 ? hx('#6a4a2a') : hx('#9a7a4a'), dx < 0 ? 1.05 : 0.8), noTop: 1 });
        const [cx, cy] = S.P(0.5, 0.5, 2.45);
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3, L = 16 + 6 * h2(i, x); for (let k = 0; k <= L; k++) { const q = k / L, X = cx + Math.cos(a) * k * 1.0, Y = cy + Math.sin(a) * k * 0.55 + q * q * 9; S.set(Math.round(X), Math.round(Y), C.leaf[q < 0.5 ? 2 : 1]); S.set(Math.round(X), Math.round(Y) + 1, C.leaf[0]); if (k % 3 === 0) S.set(Math.round(X + Math.sin(a) * 2), Math.round(Y + 2), C.leaf[1]); } }
        break;
      }
      case 'bed': {   // letto matrimoniale 2x2 (questa e' la casella davanti a destra): testiera di legno, cuscini, coperta viola a rombi
        const c = C.wood2, bl = hx('#6a4a8a');
        S.box(-0.95, -0.95, 0.95, -0.82, 0, 1.35, c, { l: (s, tt) => tt > 0.9 ? C.wood3 : Math.abs(fr(s * 3) - 0.5) < 0.38 && tt > 0.35 && tt < 0.82 ? sh(c, 0.85) : c, t: C.wood3 });
        S.box(-0.95, -0.82, 0.95, 0.95, 0, 0.3, C.woodD, { t: C.woodD });
        S.box(-0.9, -0.8, 0.9, 0.9, 0.3, 0.55, C.white, { t: C.white });
        S.box(-0.85, -0.78, -0.08, -0.35, 0.55, 0.72, C.white, { t: hx('#f8f6f0') }); S.box(0.08, -0.78, 0.85, -0.35, 0.55, 0.72, C.white, { t: hx('#f8f6f0') });
        S.box(-0.92, -0.25, 0.92, 0.92, 0.3, 0.62, bl, { t: (u, v) => { const a = fr(u * 4), b = fr(v * 3), d = Math.abs(a - 0.5) + Math.abs(b - 0.5); return v < 0.08 ? C.white : d < 0.15 ? hx('#e8c46a') : d < 0.22 ? sh(bl, 1.2) : bl; }, l: (s, tt) => tt < 0.3 ? sh(bl, 0.7) : sh(bl, 0.85), r: sh(bl, 0.68) });
        S.box(-0.95, 0.88, 0.95, 0.95, 0, 0.75, c, { t: C.wood3 });
        break;
      }
      case 'wardrobe': {   // armadio alto di legno a due ante con la cornice in cima
        const c = C.wood;
        S.box(0.06, 0.4, 0.94, 0.96, 0, 2.6, c, Object.assign(ffront(c, 'dw'), { t: C.wood3 }));
        S.box(0.02, 0.36, 0.98, 0.98, 2.6, 2.72, C.wood3, { t: C.wood3 });
        break;
      }
      case 'trunk': case 'oldtrunk': {   // baule di cuoio con gli angoli d'ottone (oldtrunk: vecchio, coperchio tondo, polvere)
        const c = t === 'oldtrunk' ? hx('#5a4a3a') : hx('#7a4a2a'), cor = (s, tt) => (s < 0.08 || s > 0.92) && (tt < 0.12 || tt > 0.88) ? C.brass : Math.abs(tt - 0.55) < 0.05 ? hx('#3a2414') : Math.abs(s - 0.5) < 0.05 && Math.abs(tt - 0.55) < 0.12 ? C.brass : null;
        S.box(0.08, 0.18, 0.92, 0.82, 0, 0.62, c, { l: (s, tt) => cor(s, tt) || sh(c, 0.8), r: (s, tt) => cor(s, tt) || sh(c, 0.64), t: sh(c, 1.05) });
        if (t === 'oldtrunk') { S.box(0.1, 0.2, 0.9, 0.8, 0.62, 0.75, sh(c, 1.1)); S.box(0.15, 0.25, 0.85, 0.75, 0.75, 0.82, sh(c, 1.2), { t: (u, v) => h2(Math.floor(u * 12), Math.floor(v * 12)) > 0.7 ? hx('#9a948a') : sh(c, 1.2) }); }
        else S.box(0.4, 0.18, 0.6, 0.82, 0.62, 0.68, hx('#3a2414'));
        break;
      }
      case 'gbench': {   // panchina da giardino: ferro battuto e assi verdi
        const g = hx('#3a6a4a'); legs(S, 0.1, 0.2, 0.9, 0.8, 0.45, C.black, 0.05);
        S.box(0.08, 0.2, 0.92, 0.8, 0.45, 0.52, g, { t: (u, v) => fr(v * 4) < 0.2 ? sh(g, 0.7) : g }); S.box(0.85, 0.2, 0.92, 0.8, 0.52, 1.1, g, { r: (s, tt) => fr(tt * 3) < 0.25 ? sh(g, 0.6) : sh(g, 0.8) });
        break;
      }
      case 'planter': {   // aiuola di legno con la terra, le piantine e i fiori (quelle in fila fanno un'aiuola sola)
        const c = hx('#7a5232'); S.box(0, 0.12, 1, 0.88, 0, 0.5, c, { l: (s, tt) => fr(tt * 3) < 0.12 ? sh(c, 0.7) : c, t: hx('#3a2a1a') });
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const [fx, fy2] = S.P(0.2 + i * 0.3, 0.32 + j * 0.36, 0.62); S.ell(fx, fy2, 4, 3, (dx, dy) => sh(C.leaf[(i + j) % 3], dy < -0.2 ? 1.15 : 0.85)); if ((i + j + y) % 2) S.ell(fx, fy2 - 3, 1.6, 1.4, [hx('#e86a8a'), hx('#e8c040'), hx('#f0f0f0')][(i + x) % 3]); }
        const jl = same(x - 1, y, t), jr = same(x + 1, y, t); skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); };
        break;
      }
      case 'sack': {   // sacco di juta pieno di terra
        const c = hx('#b89a68'); const [cx, cy] = S.P(0.5, 0.5, 0.32); S.ell(cx, cy, 11, 9, (dx, dy) => sh(c, dx < -0.3 && dy < 0 ? 1.15 : dx > 0.4 || dy > 0.5 ? 0.72 : fr(dx * 6 + dy * 3) < 0.15 ? 0.86 : 1));
        S.ell(cx, cy - 8, 6, 3, sh(c, 0.8)); S.ell(cx, cy - 9, 4, 2, hx('#3a2a1a'));
        break;
      }
      case 'armor': {   // armatura sul piedistallo: gambali, corazza, elmo con il pennacchio rosso, alabarda
        const m = C.steel, mh = (dx, base) => sh(base || m, dx < -0.4 ? 1.25 : dx < 0.1 ? 1.05 : dx < 0.5 ? 0.85 : 0.65);
        S.box(0.2, 0.2, 0.8, 0.8, 0, 0.18, C.woodD, { t: C.wood });
        S.cyl(0.4, 0.5, 0.08, 0.18, 1.05, m, { side: dx => mh(dx) }); S.cyl(0.6, 0.5, 0.08, 0.18, 1.05, m, { side: dx => mh(dx) });
        S.cyl(0.5, 0.5, 0.2, 1.05, 1.85, m, { side: (dx, tt) => mh(dx, Math.abs(tt - 0.5) < 0.04 ? C.steel2 : m) });
        S.cyl(0.5, 0.5, 0.25, 1.75, 1.88, m, { side: dx => mh(dx, C.steel2) });
        S.cyl(0.5, 0.5, 0.14, 1.88, 2.28, m, { side: (dx, tt) => Math.abs(tt - 0.55) < 0.12 && Math.abs(dx) < 0.6 ? C.black : mh(dx) });
        const [px0, py0] = S.P(0.5, 0.5, 2.3); for (let i = 0; i < 9; i++) S.ell(px0 - 2 + i * 0.6, py0 - 2 - i * 0.7, 2.2, 1.8, i % 2 ? hx('#c8303a') : hx('#e04850'));
        const [ax, ay] = S.P(0.85, 0.5, 0.2), [bx2, by2] = S.P(0.85, 0.5, 2.7); S.line(ax, ay, bx2, by2, C.woodD); S.line(ax + 1, ay, bx2 + 1, by2, C.wood);
        S.fill([[bx2 - 1, by2 + 3], [bx2 + 6, by2 + 1], [bx2 + 6, by2 + 7], [bx2 - 1, by2 + 6]], C.steel2); S.line(bx2, by2 - 4, bx2, by2 + 2, C.steel2);
        break;
      }
      case 'sofa': {   // divano Chesterfield bordeaux che guarda verso di noi; quelli vicini fanno un divano solo
        const jl = same(x - 1, y, t), jr = same(x + 1, y, t), c = hx('#86263a');
        const tuft = (s, tt) => { const a = fr((x + s) * 5), b = fr(tt * 3); return (Math.abs(a - 0.5) < 0.08 && Math.abs(b - 0.5) < 0.1) ? sh(c, 0.6) : Math.abs(a - 0.5) + Math.abs(b - 0.5) < 0.12 ? sh(c, 0.85) : sh(c, 0.95); };
        S.box(0, 0.06, 1, 0.34, 0.45, 1.35, c, { l: tuft, t: sh(c, 1.15) });
        S.box(0, 0.34, 1, 0.94, 0, 0.5, c, { l: (s, tt) => tt < 0.15 ? C.woodD : sh(c, 0.72), t: (u, v) => (Math.abs(fr(x + u) - 0.5) > 0.47 ? sh(c, 0.8) : v < 0.15 ? sh(c, 0.9) : sh(c, 1.08)) });
        if (!jl) S.box(0, 0.06, 0.18, 0.94, 0, 0.85, c, { t: sh(c, 1.15), l: sh(c, 0.82) });
        if (!jr) S.box(0.82, 0.06, 1, 0.94, 0, 0.85, c, { t: sh(c, 1.15) });
        skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); };
        break;
      }
      case 'coffee': {   // tavolino basso con i libri e la tazza
        legs(S, 0.12, 0.2, 0.88, 0.8, 0.38, C.woodD); S.box(0.08, 0.16, 0.92, 0.84, 0.38, 0.46, C.wood2, { t: C.wood3 });
        S.box(0.2, 0.3, 0.55, 0.6, 0.46, 0.54, hx('#2a4a7a')); S.box(0.22, 0.32, 0.5, 0.56, 0.54, 0.6, hx('#8a2a2a')); S.cyl(0.72, 0.6, 0.07, 0.46, 0.56, C.white);
        break;
      }
      case 'piano': {   // pianoforte a coda nero (2 caselle: questa e quella a sinistra), coperchio alzato, tastiera verso di noi
        const k = C.black, kk = hx('#3a3a48');
        for (const [a, b] of [[-0.8, 0.25], [0.6, 0.3], [-0.1, 0.8]]) S.box(a, b, a + 0.1, b + 0.1, 0, 0.75, k);
        const body = []; for (let i = 0; i <= 16; i++) { const q = i / 16, ang = Math.PI * q; body.push([0.2 + Math.cos(ang) * 0.75 - 0.3 * q, 0.5 - Math.sin(ang) * 0.38]); }
        S.box(-0.95, 0.55, 0.85, 0.92, 0.75, 1.0, k, { l: (s, tt) => tt > 0.8 ? sh(kk, 1.3) : kk, r: sh(kk, 0.7), t: kk });
        S.box(-0.95, 0.12, 0.85, 0.55, 0.75, 1.0, k, { l: kk, r: sh(kk, 0.7), t: kk });
        S.box(-0.85, 0.8, 0.75, 0.98, 0.92, 0.98, C.white, { t: (u) => fr(u * 22) < 0.18 ? hx('#8a8a90') : fr(u * 22 / 7 * 2) < 0.3 && fr(u * 22) > 0.5 ? k : C.white, l: C.white2 });
        // coperchio alzato: una lastra inclinata sorretta dall'asta
        const L0 = S.P(-0.9, 0.5, 1.02), L1 = S.P(0.8, 0.5, 1.02), L2 = S.P(0.6, 0.12, 2.0), L3 = S.P(-0.7, 0.12, 2.15);
        S.fill([L0, L1, L2, L3], (X, Y) => sh(kk, 0.9 + 0.3 * ((X + Y) % 7 === 0)));
        S.line(...S.P(0.1, 0.5, 1.0), ...S.P(0.1, 0.3, 1.7), C.steel2);
        S.box(-0.4, 0.7, -0.1, 0.78, 1.0, 1.32, C.cream);   // spartito
        break;
      }
      case 'vase': {   // vaso cinese bianco e blu
        const prof = [[0, 0.16], [0.15, 0.26], [0.45, 0.3], [0.75, 0.22], [0.95, 0.12], [1.15, 0.14], [1.25, 0.17]];
        for (let i = 0; i + 1 < prof.length; i++) { const [z0, r0] = prof[i], [z1, r1] = prof[i + 1]; S.cyl(0.5, 0.5, (r0 + r1) / 2, z0, z1, C.white, { side: (dx, tt) => sh(i === 2 || i === 4 ? hx('#2c4e86') : (Math.round(dx * 5 + i) & 1) && i === 3 ? hx('#3a6aa8') : C.white, dx < -0.4 ? 1.06 : dx < 0.3 ? 0.94 : 0.78), noTop: i + 2 < prof.length }); }
        break;
      }
      case 'clock': {   // pendolo: cassa alta di legno, quadrante crema, finestrella con il pendolo d'ottone
        const c = C.wood;
        S.box(0.18, 0.45, 0.82, 0.92, 0, 0.3, c, { t: c }); S.box(0.24, 0.5, 0.76, 0.88, 0.3, 2.1, c, { l: (s, tt) => s > 0.25 && s < 0.75 && tt > 0.15 && tt < 0.85 ? (Math.abs(s - 0.5) < 0.04 ? C.brass : tt < 0.3 && Math.abs(s - 0.5) < 0.12 ? C.gold : hx('#2a1a10')) : c, r: sh(c, 0.64) });
        S.box(0.15, 0.42, 0.85, 0.95, 2.1, 2.8, c, { t: C.wood3, r: sh(c, 0.64), l: c });
        const [qx, qy] = S.P(0.5, 0.95, 2.45); S.ell(qx, qy, 6, 6, (dx, dy) => dx * dx + dy * dy > 0.7 ? C.gold : C.cream);
        S.line(Math.round(qx), Math.round(qy), Math.round(qx), Math.round(qy) - 4, C.black); S.line(Math.round(qx), Math.round(qy), Math.round(qx) + 3, Math.round(qy), C.black);
        break;
      }
      case 'coatrack': {   // appendiabiti con il cappotto, la sciarpa e il cappello
        S.cyl(0.5, 0.5, 0.2, 0, 0.06, C.woodD); S.box(0.47, 0.47, 0.53, 0.53, 0.06, 2.3, C.wood2);
        const [hx0, hy0] = S.P(0.5, 0.5, 1.9); S.ell(hx0 - 4, hy0 + 8, 6, 12, (dx, dy) => sh(hx('#3a4a6a'), dx < -0.2 ? 1.1 : 0.8)); S.ell(hx0 + 4, hy0 + 4, 3, 9, hx('#c8402a'));
        S.ell(hx0, hy0 - 6, 6, 2.5, hx('#2a2a2a')); S.ell(hx0, hy0 - 9, 3.5, 3.5, hx('#3a3a3a'));
        break;
      }
      case 'umbrella': {   // portaombrelli d'ottone con tre ombrelli
        S.cyl(0.5, 0.5, 0.2, 0, 0.75, C.brass, { side: (dx, tt) => sh(fr(tt * 4) < 0.15 ? C.brassD : C.brass, dx < -0.3 ? 1.15 : dx < 0.3 ? 0.95 : 0.75), top: hx('#2a1a10') });
        for (const [a, b, c] of [[0.42, 0.45, hx('#2a2a32')], [0.56, 0.5, hx('#c8402a')], [0.5, 0.6, hx('#3a6aa8')]]) { const [X0, Y0] = S.P(a, b, 0.7), [X1, Y1] = S.P(a + 0.04, b - 0.04, 1.5); S.line(X0, Y0, X1, Y1, c); S.line(X0 + 1, Y0, X1 + 1, Y1, sh(c, 0.7)); S.set(Math.round(X1) - 1, Math.round(Y1) - 1, C.woodD); }
        break;
      }
      case 'bench': {   // cassapanca di legno intagliato con il cuscino
        const c = C.wood2;
        S.box(0.1, 0.12, 0.9, 0.88, 0, 0.6, c, { l: (s, tt) => tt < 0.1 ? C.woodD : Math.abs(fr(s * 2) - 0.5) < 0.36 && tt > 0.25 && tt < 0.8 ? sh(c, 0.85) : c, r: (s, tt) => tt < 0.1 ? C.woodD : sh(c, 0.68), t: C.wood3 });
        S.box(0.14, 0.16, 0.86, 0.84, 0.6, 0.72, hx('#2e5a4a'), { t: (u, v) => fr(u * 3) < 0.08 ? hx('#1e4a3a') : hx('#3e6a5a') });
        break;
      }
      case 'toilet': {   // water bianco con lo sciacquone
        S.box(0.25, 0.1, 0.75, 0.35, 0.4, 1.05, C.white, { t: C.white2 }); S.cyl(0.5, 0.58, 0.22, 0, 0.45, C.white, { top: (dx, dy) => dx * dx + dy * dy < 0.4 ? hx('#9ac0d0') : C.white });
        S.box(0.66, 0.15, 0.72, 0.2, 0.85, 0.95, C.steel2);
        break;
      }
      case 'sink': {   // lavandino a colonna con lo specchio tondo
        S.cyl(0.5, 0.45, 0.1, 0, 0.75, C.white); S.box(0.15, 0.2, 0.85, 0.7, 0.75, 0.95, C.white, { t: (u, v) => Math.abs(u - 0.5) < 0.3 && Math.abs(v - 0.55) < 0.25 ? hx('#b8d0dc') : C.white });
        S.box(0.47, 0.2, 0.53, 0.3, 0.95, 1.15, C.steel2);
        const [mx, my] = S.P(0.5, 0.08, 1.8); S.ell(mx, my, 8, 9, (dx, dy) => dx * dx + dy * dy > 0.75 ? C.gold : dx < -0.2 && dy < -0.1 ? hx('#e8f4fa') : hx('#a8c8dc'));
        break;
      }
      case 'washer': {   // lavatrice bianca con l'oblo'
        S.box(0.1, 0.2, 0.9, 0.9, 0, 1.05, C.white, { l: (s, tt) => tt > 0.82 ? (s < 0.4 && s > 0.1 ? hx('#c8d0d8') : Math.abs(s - 0.8) < 0.06 ? hx('#e2553a') : C.white2) : C.white, r: C.white2, t: C.white });
        const [cx, cy] = S.P(0.5, 0.9, 0.45); S.ell(cx - 2, cy - 1, 8, 8, (dx, dy) => { const d = dx * dx + dy * dy; return d > 0.7 ? C.steel : d > 0.45 ? hx('#3a4a5a') : dx < -0.2 && dy < -0.2 ? hx('#8ab8d8') : hx('#5a8ab0'); });
        break;
      }
      case 'basket': {   // cesto di vimini con i panni
        const c = hx('#c8a060'); S.cyl(0.5, 0.5, 0.28, 0, 0.62, c, { side: (dx, tt) => sh(fr(tt * 6 + dx * 2) < 0.5 ? c : sh(c, 0.85), dx < -0.3 ? 1.1 : dx < 0.3 ? 0.95 : 0.75), top: hx('#e8e0d0') });
        const [cx, cy] = S.P(0.5, 0.5, 0.66); S.ell(cx - 3, cy, 4, 2.5, hx('#3a6aa8')); S.ell(cx + 3, cy - 1, 4, 2.5, hx('#e86a8a'));
        break;
      }
      case 'tub': {   // vasca da bagno con i piedini (2 caselle: questa e quella dietro), l'acqua e la paperella
        const c = C.white;
        for (const [a, b] of [[0.2, -0.85], [0.8, -0.85], [0.2, 0.85], [0.8, 0.85]]) S.box(a - 0.05, b - 0.05, a + 0.05, b + 0.05, 0, 0.15, C.brass);
        S.box(0.1, -0.95, 0.9, 0.95, 0.15, 0.7, c, { l: c, r: (s, tt) => sh(c, tt > 0.85 ? 0.95 : 0.75), t: (u, v) => { const e = Math.min(u, 1 - u, v, 1 - v); return e < 0.08 ? C.white : e < 0.12 ? C.white2 : hx('#8ac8e0'); } });
        const [dx, dy] = S.P(0.5, 0.3, 0.72); S.ell(dx, dy, 2.5, 2, hx('#f2c230')); S.set(Math.round(dx) + 2, Math.round(dy), hx('#e2553a'));
        S.box(0.45, -0.95, 0.55, -0.88, 0.7, 1.05, C.steel2);
        break;
      }
      case 'ksink': case 'stove': {   // bancone con il lavello / cucina economica smaltata con il forno
        const jl = same(x - 1, y, 'kcounter') || same(x - 1, y, 'ksink'), jr = same(x + 1, y, 'kcounter') || same(x + 1, y, 'stove');
        if (t === 'ksink') {
          S.box(0, 0.38, 1, 0.98, 0, 1.0, hx('#e8e0cc'), { l: front(hx('#e8e0cc'), 'dw'), r: sh(hx('#e8e0cc'), 0.64) });
          S.box(-0.02, 0.36, 1.02, 1.0, 1.0, 1.06, hx('#a07a52'), { t: (u, v) => Math.abs(u - 0.5) < 0.3 && Math.abs(v - 0.55) < 0.28 ? (Math.abs(u - 0.5) < 0.26 && Math.abs(v - 0.55) < 0.24 ? hx('#8a9aa8') : C.steel2) : hx('#a07a52') });
          S.box(0.47, 0.42, 0.53, 0.48, 1.06, 1.35, C.steel2); S.box(0.47, 0.42, 0.53, 0.6, 1.32, 1.36, C.steel2);
        } else {
          const c = hx('#e8dcc4');
          S.box(0.02, 0.38, 0.98, 0.98, 0, 1.0, c, { l: (s, tt) => tt < 0.08 ? C.black : s > 0.12 && s < 0.88 && tt > 0.2 && tt < 0.7 ? (s > 0.25 && s < 0.75 && tt > 0.3 && tt < 0.6 ? hx('#3a2a1a') : C.black) : tt > 0.78 && tt < 0.88 && fr(s * 5) < 0.4 ? C.black : c, r: sh(c, 0.64) });
          S.box(0, 0.36, 1, 1.0, 1.0, 1.06, C.black, { t: (u, v) => { for (const [a, b] of [[0.28, 0.55], [0.72, 0.55], [0.28, 0.85], [0.72, 0.85]]) if (Math.hypot(u - a, (v - b) * 1.4) < 0.13) return Math.hypot(u - a, (v - b) * 1.4) < 0.07 ? hx('#5a5a60') : hx('#3a3a40'); return hx('#2a2a30'); } });
          S.cyl(0.3, 0.6, 0.14, 1.06, 1.3, C.steel, { top: C.steel2 });   // pentola
        }
        skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); };
        break;
      }
      case 'fridge': {   // frigorifero anni '50 color menta con la maniglia cromata
        const c = hx('#cfe6dc');
        S.box(0.08, 0.38, 0.92, 0.96, 0, 2.15, c, { l: (s, tt) => tt < 0.04 ? C.steelD : Math.abs(tt - 0.62) < 0.012 ? sh(c, 0.7) : s > 0.8 && s < 0.86 && (Math.abs(tt - 0.5) < 0.06 || Math.abs(tt - 0.78) < 0.06) ? C.steel2 : s < 0.06 || s > 0.94 ? sh(c, 0.9) : (tt > 0.88 && s > 0.3 && s < 0.7) ? C.steel2 : c, r: sh(c, 0.68), t: sh(c, 1.08) });
        break;
      }
      case 'cupboard': {   // credenza della cucina: ante sotto, piattaia sopra con i piatti
        const c = hx('#7a9a8a');
        S.box(0.06, 0.4, 0.94, 0.96, 0, 1.0, c, { l: front(c, 'dw'), r: sh(c, 0.64) });
        S.box(0.02, 0.38, 0.98, 0.98, 1.0, 1.06, hx('#a07a52'));
        S.box(0.08, 0.7, 0.92, 0.96, 1.06, 2.3, c, { l: (s, tt) => { if (s < 0.06 || s > 0.94 || tt > 0.92) return sh(c, 0.85); const sz = fr(tt * 3); if (sz < 0.1) return sh(c, 1.1); const pl = fr(s * 4), d = Math.hypot(pl - 0.5, (sz - 0.55) * 1.3); return d < 0.3 ? (d < 0.18 ? hx('#f4f0e8') : hx('#3a6aa8')) : sh(c, 0.6); }, r: sh(c, 0.64), t: sh(c, 1.1) });
        break;
      }
      case 'ktable': {   // tavolo della cucina (2 caselle) con la tovaglia a quadretti, il pane e la brocca
        legs(S, -0.85, 0.15, 0.85, 0.85, 0.75, C.wood2, 0.07);
        S.box(-0.92, 0.08, 0.92, 0.92, 0.75, 0.82, hx('#e8e0d0'), { t: (u, v) => ((Math.floor(u * 10) + Math.floor(v * 5)) & 1) ? hx('#c8402a') : hx('#f4f0e8'), l: (s, tt) => (Math.floor(s * 10) & 1) ? hx('#c8402a') : hx('#f4f0e8') });
        const [bx2, by2] = S.P(-0.3, 0.45, 0.88); S.ell(bx2, by2, 6, 3, hx('#c8904a')); S.ell(bx2 - 1, by2 - 1, 4, 1.5, hx('#e0b070'));
        S.cyl(0.35, 0.5, 0.08, 0.82, 1.1, hx('#e8ecf4'), { top: hx('#9ac0d0') });
        break;
      }
      case 'dog': {   // cane che dorme sul cuscino (orecchie lunghe, coda arricciata)
        const [cx, cy] = S.P(0.5, 0.5, 0.1); S.ell(cx, cy, 15, 7, (dx, dy) => sh(hx('#a83434'), dy < -0.3 ? 1.15 : dy > 0.5 ? 0.75 : 1));
        const c = hx('#c88a4a'); S.ell(cx + 1, cy - 4, 10, 5.5, (dx, dy) => sh(c, dx < -0.3 && dy < 0 ? 1.15 : dy > 0.4 ? 0.8 : 1));
        S.ell(cx - 9, cy - 5, 5, 4.5, (dx, dy) => sh(c, dx < 0 && dy < 0 ? 1.15 : 0.9)); S.ell(cx - 12, cy - 4, 3, 2.2, sh(c, 1.1)); S.set(Math.round(cx) - 14, Math.round(cy) - 5, C.black);
        S.ell(cx - 7, cy - 2, 2.5, 4, hx('#7a4a2a')); S.line(Math.round(cx) - 10, Math.round(cy) - 6, Math.round(cx) - 8, Math.round(cy) - 6, C.black);
        S.ell(cx + 11, cy - 7, 2.5, 2.5, sh(c, 0.9));
        break;
      }
      case 'barrel': {   // botte di rovere con i cerchi di ferro
        const c = hx('#8a5a32'); S.cyl(0.5, 0.5, 0.36, 0, 1.1, c, { side: (dx, tt) => { const hp = Math.abs(tt - 0.18) < 0.05 || Math.abs(tt - 0.82) < 0.05; return sh(hp ? C.steelD : fr(dx * 4 + 0.5) < 0.12 ? sh(c, 0.75) : c, dx < -0.4 ? 1.12 : dx < 0.1 ? 1 : dx < 0.6 ? 0.84 : 0.68); }, top: (dx, dy) => dx * dx + dy * dy > 0.8 ? C.steelD : fr(dx * 3) < 0.1 ? sh(c, 0.8) : sh(c, 1.05) });
        break;
      }
      case 'winerack': {   // scaffale delle bottiglie
        const c = C.wood; S.box(0.05, 0, 0.45, 1, 0, 2.2, c, { l: C.woodD, t: C.wood3, r: (s, tt) => { const a = fr(s * 4), b = fr(tt * 2.2 * 2.5); if (a < 0.12 || b < 0.12) return sh(c, 1.05); const d = Math.hypot(a - 0.56, (b - 0.56) * 1.2); return d < 0.26 ? (d < 0.12 ? hx('#1a2a1a') : hx('#2e5a3a')) : hx('#1e120c'); } });
        break;
      }
      case 'crate': {   // cassa di legno inchiodata
        const c = hx('#a8793c'), pl = (s, tt) => fr(tt * 3) < 0.12 || s < 0.06 || s > 0.94 ? sh(c, 0.72) : Math.abs(s - tt) < 0.07 ? sh(c, 0.85) : c;
        S.box(0.1, 0.1, 0.9, 0.9, 0, 0.75, c, { l: pl, r: (s, tt) => sh(pl(s, tt), 0.8), t: (u, v) => fr(u * 3) < 0.1 ? sh(c, 0.8) : sh(c, 1.1) });
        break;
      }
      case 'jarshelf': {   // mensola con i barattoli di marmellata e conserve
        const c = C.wood2; S.box(0.05, 0.6, 0.95, 0.95, 0, 2.0, c, { l: (s, tt) => fr(tt * 3) < 0.1 ? C.wood3 : hx('#2a1a10'), r: sh(c, 0.64), t: C.wood3 });
        for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) S.cyl(0.2 + i * 0.3, 0.8, 0.09, r * 0.667 + 0.07, r * 0.667 + 0.4, [hx('#c8402a'), hx('#e8a030'), hx('#6a2a6a'), hx('#4a8a3a')][(r + i * 2) % 4], { top: hx('#e8dcc4') });
        break;
      }
      default: return null;
    }
    S.outline(skip);
    const L = lightAt(x + 0.5, y + 0.5).map(v => 0.3 + 0.7 * v);
    S.light(() => L);
    const s = Object.assign(S.canvas(), { glow }); PR.set(key, s); return s;
  }
  // cespuglio a ciuffi (piante e vasi grandi): dal basso scuro all'alto chiaro, qualche fiore
  function bush(S, x, y, z0, z1, n, sc, flower) {
    for (let i = 0; i < n; i++) {
      const q = i / n, a = i * 2.4 + h2(x, i) * 0.6, rr = (0.12 + 0.24 * h2(i, y)) * (1 - q * 0.55) * sc, zz = z0 + (z1 - z0) * q * 0.7 + 0.15 * h2(x + i, y + i);
      const [cx, cy] = S.P(0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr, zz), rx = (6 + 4 * h2(i, x) - q * 2) * sc, ry = (4.5 + 2.5 * h2(y, i) - q) * sc, col = C.leaf[Math.min(2, Math.floor(q * 3 + h2(i, x) * 0.6))];
      S.ell(cx, cy, rx, ry, (dx, dy) => sh(col, dy < -0.3 && dx < 0.2 ? 1.18 : dy > 0.4 ? 0.78 : 1));
      if (flower && i % 4 === 3) S.ell(cx - 1, cy - 2, 1.8, 1.5, flower);
    }
  }

  // ---- la mappa per il motore ----
  function mapVilla() {
    const rooms = ROOMS.map(r => Object.assign({}, r));
    for (const [x, y, w, h, a, b, k] of DOORS) { const ra = ROOMS.find(r => r.n === a); rooms.push({ n: k === 'porch' ? 'Ingresso' : a, x, y, w, h, k: k || 'door', c: ['#b07a48', '#a06c3c'], wc: '#4a2818', nl: 1, nm: 1, door: [a, b], paper: ra.paper, pk: ra.k }); }
    const props = FURN.map(([t, x, y, o]) => [t, x, y, o || {}]);
    setup(props); FL.clear(); WL.clear(); PR.clear();
    return { w: W, h: H, rooms, doors: [], decals: [], props, tasks: [], hall: 0, cams: [], vending: [], ring: [[16, 28], [17, 28], [15, 27], [18, 27]], button: { x: -10, y: -10 }, sabs: {},
      inn: Object.fromEntries(ROOMS.map(r => [r.n, 'in ' + r.n.toLowerCase()])), help: '', btnTxt: '', sabTxt: '',
      pxFloor: (K, x, y) => put(K, floorSpr(x, y), x, y),
      pxProp: (K, t, x, y, o) => { const s = propSpr(t, x, y, o); if (!s) return false; put(K, s, x, y); for (const [a, b, z, r, col] of s.glow) K.glow(x + a, y + b, z * ZS, r, col); return true; },
      drawWall: (K, x, y) => {
        put(K, wallSpr(x, y), x, y);
        if (y === PORCH.y && (x === PORCH.x0 - 1 || x === PORCH.x1)) K.glow(x + 0.5, y + 0.5, (FH + 0.7) * ZS, 1.6, 'rgba(255,210,140,.35)');
      } };
  }
  CQ_MAPS.villa = { n: 'Villa', make: mapVilla, only: 'trappole' };
  // giorno o notte: cambiano il cielo nelle finestre e la luce che entra; si rifanno i disegni e la mappa pronta
  function setNight(v) {
    v = v ? 1 : 0; if (v === NIGHT) return;
    NIGHT = v; setup(CQ_PROPS); FL.clear(); WL.clear(); PR.clear(); cq.bg = null;
  }

  // ---- nascondigli ----
  const SPOTS = () => CQ_PROPS.filter(p => p[3] && p[3].h).map(([t, x, y, o]) => ({ t, x, y, h: o.h, n: o.n, cells: t === 'bed' ? [[x, y], [x - 1, y], [x, y - 1], [x - 1, y - 1]] : t === 'desk' ? [[x, y], [x - 1, y]] : [[x, y]] }));
  const spotDist = (s, px, py) => Math.min(...s.cells.map(([a, b]) => Math.hypot(Math.max(a - px, 0, px - a - 1), Math.max(b - py, 0, py - b - 1))));
  const roomName = (x, y) => { const r = roomAt(Math.floor(x), Math.floor(y)); return r ? r.n : ''; };
  const atPorch = (x, y) => y > 27.6 && x > PORCH.x0 - 0.2 && x < PORCH.x1 + 0.2;

  CQ_MODES.trappole = {
    n: 'La casa delle trappole',
    desc: '🪤 Due ladri, due ville identiche. Riempi la tua di trappole e nascondi il diamante; poi ruba quello dell\'altro mentre lui ti guarda dalle telecamere. <b>In costruzione</b>: per ora si visita la villa e si cerca il diamante nascosto dal computer.',
    maps: [['villa', 'Villa']],
    ns: [[2, '2']],
    def: { map: 'villa', n: 2, fill: true, nt: 0 },
    opts: o => `<div class="row"><div class="lbl">Ora del giorno</div>${seg('nt', [[0, '☀️ Giorno'], [1, '🌙 Notte']], o.nt ? 1 : 0)}<div class="hint">Di notte si vede solo dove punta la torcia.</div></div>`,
    read: d => ({ nt: +d.get('nt') ? 1 : 0 }),
    start(G) {
      setNight(G.opt.nt);
      const sp = SPOTS(); G.dia = Math.floor(Math.random() * sp.length); G.open = []; G.has = false; G.srch = null; G.left = TIME; G.room = 'Ingresso';
      for (const c of G.chars) { c.x = 16.5 + (c === G.me ? 0.5 : -0.5); c.y = 28.3; }
    },
    gstart(G) { setNight(G.opt.nt); G.open = []; G.room = 'Ingresso'; G.left = TIME; },
    intro: () => '💎 Il diamante è nascosto in un mobile: trovalo e riportalo al portone!',
    hide: c => !!c.bot && !c.sid,   // per ora l'avversario del computer non c'e' (arriva con l'incursione)
    speed: c => { const G = cq.g; return G && c === G.me && G.srch ? 0 : 1; },
    hud(G) {
      const r = roomName(cq.x, cq.y); if (r && !roomAt(Math.floor(cq.x), Math.floor(cq.y)).door) G.room = r;
      return `🪤 ${G.opt.nt ? '🌙' : '☀️'} 📍 <b>${esc(G.room || '')}</b> · 🔍 ${G.open.length} aperti · ${G.has ? '💎 <b>Al portone!</b> · ' : ''}⏱ ${mmss(Math.max(0, G.left))}`;
    },
    big: G => G.left < 10 && G.left > 0 && G.phase === 'play' ? '⏱ ' + Math.ceil(G.left) + '…' : '',
    spotNear(G) {
      if (G.srch || G.has) return null;
      let best = null, bd = NEAR; SPOTS().forEach((s, i) => { if (G.open.includes(i)) return; const d = spotDist(s, cq.x, cq.y); if (d < bd) { bd = d; best = Object.assign(s, { i }); } });
      return best;
    },
    btn(G) {
      if (G.srch) return { t: '🔍 Cerco…', on: false };
      const s = this.spotNear(G); return s ? { t: '🔍 Apri: ' + s.n, on: true } : null;
    },
    act(G) {
      const s = this.spotNear(G); if (!s) return;
      G.srch = { i: s.i, t0: G.time, d: s.h >= 2 ? 2 : 1, x: s.x + 0.5, y: s.y + 0.5 };
      beep(320, 0.05, 0.03);
    },
    tick(G, dt) {
      G.left -= dt;
      const S = G.srch;
      if (S) {
        if (Math.floor((G.time - S.t0) * 6) !== Math.floor((G.time - S.t0 - dt) * 6)) beep(180 + Math.random() * 160, 0.03, 0.015);   // fruscio mentre si fruga
        if (G.time - S.t0 >= S.d) {
          G.srch = null; G.open.push(S.i);
          if (S.i === G.dia) { G.has = true; beep(988, 0.1, 0.05); beep(1319, 0.2, 0.05, 0.1); cqToast('💎 <b>Trovato!</b> Ora riportalo al portone, presto!'); }
          else { beep(220, 0.08, 0.03); cqToast(cqPickOne(['Vuoto…', 'Niente qui.', 'Solo polvere.', 'Acqua…', 'Qui non c\'è.'])); }
        }
      }
      if (G.has && atPorch(cq.x, cq.y)) { this.finish(G, true); return; }
      if (G.left <= 0) this.finish(G, false);
    },
    finish(G, ok) {
      const sp = SPOTS()[G.dia], name = G.me.name + ' (tu)';
      if (ok) cqModeEnd({ t: '💎 Diamante rubato!', why: 'Ce l\'hai fatta in <b>' + mmss(G.time) + '</b>, aprendo ' + G.open.length + ' mobili. Era: ' + esc(sp.n) + ' (' + esc(roomName(sp.x, sp.y)) + ').', win: [G.me.id], rank: [[name, '— ' + mmss(G.time)]] });
      else cqModeEnd({ t: '⏱ Tempo scaduto!', why: G.has ? 'Avevi il diamante, ma non sei arrivato al portone in tempo.' : 'Il diamante era: <b>' + esc(sp.n) + '</b> (' + esc(roomName(sp.x, sp.y)) + ').', win: [], rank: [[name, '— ' + G.open.length + ' mobili aperti']] });
    },
    // diamante sopra la testa di chi lo porta
    deco(g, c, X, Y, TW, G, L) {
      if (c !== G.me || !G.has) return;
      const u = TW / 34, by = Y - (cqTop(L) + 0.5) * TW + Math.sin(performance.now() / 200) * 2 * u;
      diamond(g, X, by, 9 * u);
    },
    // sopra la mappa: la barra del frugare e la spunta sui mobili gia' aperti
    over(g, G, sx, sy, TW) {
      const sp = SPOTS();
      g.font = Math.round(TW * 0.28) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const i of G.open) { const s = sp[i]; if (!s) continue; const X = sx(s.x + 0.5, s.y + 0.5), Y = sy(s.x + 0.5, s.y + 0.5) - TW * 0.9; if (X < -50 || Y < -50 || X > cq.w + 50 || Y > cq.h + 50) continue; g.globalAlpha = 0.75; g.fillText('✔️', X, Y); g.globalAlpha = 1; }
      const S = G.srch; if (!S) return;
      const k = Math.min(1, (G.time - S.t0) / S.d), X = sx(cq.x, cq.y), Y = sy(cq.x, cq.y) - TW * 2.2;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(X, Y, TW * 0.32, 0, 7); g.fill();
      g.strokeStyle = '#ffd24a'; g.lineWidth = TW * 0.08; g.beginPath(); g.arc(X, Y, TW * 0.24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
      g.fillText('🔍', X, Y + 1);
    },
    // notte: buio, si vede solo vicino e dove punta la torcia; restano accese le lampade (poca luce)
    night(G) {
      if (!G.opt.nt) return null;
      const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1, dx = (cq.wdx || 0.5) / l, dy = (cq.wdy || 0.5) / l;
      const lights = [[cq.x + dx * 2.6, cq.y + dy * 2.6, 3.4, 0.92], [cq.x + dx * 4.6, cq.y + dy * 4.6, 2.2, 0.6]];
      for (const p of CQ_PROPS) if (p[0] === 'lamp' || p[0] === 'rlamp' || p[0] === 'nightstand') lights.push([p[1] + 0.5, p[2] + 0.5, 1.6, 0.45]);
      lights.push([PORCH.x0 - 0.5, PORCH.y + 0.5, 1.4, 0.5], [PORCH.x1 + 0.5, PORCH.y + 0.5, 1.4, 0.5]);
      return { a: 0.94, r: 2.2, lights, see: (x, y) => Math.hypot(x - cq.x, y - cq.y) < 2.4 || Math.hypot(x - cq.x - dx * 3, y - cq.y - dy * 3) < 2.8 };
    }
  };
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
