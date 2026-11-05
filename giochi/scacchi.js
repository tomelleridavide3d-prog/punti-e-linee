// ==== SCACCHI AL TAVOLINO (05-11-2026, sessione "Minigioco Scacchi"; piano in CLAUDE.md "SCACCHI AL TAVOLINO") ====
// Vista dall'alto come i siti di scacchi, pezzi classici in legno disegnati col canvas, mosse possibili evidenziate, orologio con le cadenze
// (bullet, lampo, rapida, con incremento). Motore delle regole + computer fra // ==CH ENGINE== e // ==END CH ENGINE== (gira anche in un Worker
// e in node: CHE_SRC() restituisce il motore). Notazione italiana: R re, D donna, T torre, A alfiere, C cavallo.

// ==CH ENGINE==
function CHE_SRC() {
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, OFF = 7, INF = 30000, MATE = 29000;
  const KD = [-21, -19, -12, -8, 8, 12, 19, 21], BD = [-11, -9, 9, 11], RD = [-10, -1, 1, 10], QD = [-11, -10, -9, -1, 1, 9, 10, 11];
  const FILES = 'abcdefgh', LET = ['', '', 'C', 'A', 'T', 'D', 'R'], CH = ' PNBRQK';
  const fil = s => (s % 10) - 1, rnk = s => 9 - ((s / 10) | 0);   // rnk 0 = traversa 1
  const sqName = s => FILES[fil(s)] + (rnk(s) + 1);
  const sqOf = n => 21 + (n.charCodeAt(0) - 97) + (7 - (+n[1] - 1)) * 10;
  const I64 = new Int8Array(120).fill(-1);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) I64[21 + f + r * 10] = r * 8 + f;   // 0 = a8 ... 63 = h1
  const SQ120 = []; for (let i = 0; i < 64; i++) SQ120.push(21 + (i & 7) + (i >> 3) * 10);
  // chiavi di Zobrist (seme fisso: uguali su tutti i telefoni)
  let seed = 0x2545f491;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const ZP = [], ZQ = []; for (let p = 0; p < 16; p++) { const a = new Int32Array(120), b = new Int32Array(120); for (let s = 0; s < 120; s++) { a[s] = rnd(); b[s] = rnd(); } ZP.push(a); ZQ.push(b); }
  const ZC = new Int32Array(16), ZC2 = new Int32Array(16), ZE = new Int32Array(120), ZE2 = new Int32Array(120);
  for (let i = 0; i < 16; i++) { ZC[i] = rnd(); ZC2[i] = rnd(); }
  for (let i = 0; i < 120; i++) { ZE[i] = rnd(); ZE2[i] = rnd(); }
  const ZS = rnd(), ZS2 = rnd();
  const CM = new Int8Array(120).fill(15); CM[95] = 12; CM[98] = 14; CM[91] = 13; CM[25] = 3; CM[28] = 11; CM[21] = 7;
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function fromFen(fen) {
    const [bd, sd, cs, ep, hm, fm] = fen.trim().split(/\s+/);
    const b = new Int8Array(120).fill(OFF), p = { b, s: sd === 'b' ? 1 : 0, c: 0, ep: 0, hm: +hm || 0, fm: +fm || 1, k: [0, 0], h: 0, h2: 0, U: [], hist: [] };
    for (let i = 0; i < 64; i++) b[SQ120[i]] = 0;
    let r = 0, f = 0;
    for (const ch of bd) {
      if (ch === '/') { r++; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const t = CH.indexOf(ch.toUpperCase()), c = ch === ch.toUpperCase() ? 0 : 1, s = 21 + f + r * 10;
      b[s] = t + 8 * c; if (t === K) p.k[c] = s; f++;
    }
    if (cs && cs !== '-') { if (cs.includes('K')) p.c |= 1; if (cs.includes('Q')) p.c |= 2; if (cs.includes('k')) p.c |= 4; if (cs.includes('q')) p.c |= 8; }
    if (ep && ep !== '-') p.ep = sqOf(ep);
    rehash(p); p.hist.push(p.h);
    return p;
  }
  function rehash(p) {
    let h = 0, h2 = 0; const b = p.b;
    for (let s = 21; s < 99; s++) { const x = b[s]; if (x && x !== OFF) { h ^= ZP[x][s]; h2 ^= ZQ[x][s]; } }
    h ^= ZC[p.c]; h2 ^= ZC2[p.c]; if (p.ep) { h ^= ZE[p.ep]; h2 ^= ZE2[p.ep]; } if (p.s) { h ^= ZS; h2 ^= ZS2; }
    p.h = h; p.h2 = h2;
  }
  function fen(p) {
    let o = '';
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let f = 0; f < 8; f++) { const x = p.b[21 + f + r * 10]; if (!x) { e++; continue; } if (e) { o += e; e = 0; } const ch = CH[x & 7]; o += x >> 3 ? ch.toLowerCase() : ch; }
      if (e) o += e; if (r < 7) o += '/';
    }
    const cs = (p.c & 1 ? 'K' : '') + (p.c & 2 ? 'Q' : '') + (p.c & 4 ? 'k' : '') + (p.c & 8 ? 'q' : '');
    return o + ' ' + (p.s ? 'b' : 'w') + ' ' + (cs || '-') + ' ' + (p.ep ? sqName(p.ep) : '-') + ' ' + p.hm + ' ' + p.fm;
  }
  // case attaccate dal colore by
  function att(b, sq, by) {
    if (by === 0) { if (b[sq + 9] === P || b[sq + 11] === P) return true; }
    else if (b[sq - 9] === P + 8 || b[sq - 11] === P + 8) return true;
    const o = 8 * by, n = N + o, k = K + o, bb = B + o, r = R + o, q = Q + o;
    for (let i = 0; i < 8; i++) if (b[sq + KD[i]] === n) return true;
    for (let i = 0; i < 8; i++) if (b[sq + QD[i]] === k) return true;
    for (let i = 0; i < 4; i++) { const d = BD[i]; let t = sq + d; while (!b[t]) t += d; if (b[t] === bb || b[t] === q) return true; }
    for (let i = 0; i < 4; i++) { const d = RD[i]; let t = sq + d; while (!b[t]) t += d; if (b[t] === r || b[t] === q) return true; }
    return false;
  }
  const inCheck = p => att(p.b, p.k[p.s], p.s ^ 1);
  // mossa = da | a<<7 | promozione<<14 | segni<<17 (1 presa al varco, 2 arrocco, 4 doppio passo)
  function gen(p, mv, caps) {
    const b = p.b, us = p.s, them = us ^ 1;
    for (let s = 21; s < 99; s++) {
      const x = b[s]; if (!x || x === OFF || (x >> 3) !== us) continue;
      const t = x & 7;
      if (t === P) {
        const d = us ? 10 : -10, t1 = s + d, promo = us ? t1 > 90 : t1 < 29;
        if (!b[t1]) {
          if (promo) { mv.push(s | t1 << 7 | Q << 14, s | t1 << 7 | N << 14, s | t1 << 7 | R << 14, s | t1 << 7 | B << 14); }
          else if (!caps) { mv.push(s | t1 << 7); if ((us ? s < 39 : s > 80) && !b[t1 + d]) mv.push(s | (t1 + d) << 7 | 4 << 17); }
        }
        for (let j = 0; j < 2; j++) {
          const t2 = t1 + (j ? 1 : -1), y = b[t2];
          if (y && y !== OFF && (y >> 3) === them) { if (promo) mv.push(s | t2 << 7 | Q << 14, s | t2 << 7 | N << 14, s | t2 << 7 | R << 14, s | t2 << 7 | B << 14); else mv.push(s | t2 << 7); }
          else if (t2 === p.ep && p.ep) mv.push(s | t2 << 7 | 1 << 17);
        }
      } else if (t === N || t === K) {
        const D = t === N ? KD : QD;
        for (let i = 0; i < 8; i++) { const t2 = s + D[i], y = b[t2]; if (y === OFF) continue; if (!y) { if (!caps) mv.push(s | t2 << 7); } else if ((y >> 3) === them) mv.push(s | t2 << 7); }
        if (t === K && !caps) {
          if (us === 0 && s === 95) {
            if (p.c & 1 && !b[96] && !b[97] && b[98] === R && !att(b, 95, 1) && !att(b, 96, 1) && !att(b, 97, 1)) mv.push(95 | 97 << 7 | 2 << 17);
            if (p.c & 2 && !b[94] && !b[93] && !b[92] && b[91] === R && !att(b, 95, 1) && !att(b, 94, 1) && !att(b, 93, 1)) mv.push(95 | 93 << 7 | 2 << 17);
          } else if (us === 1 && s === 25) {
            if (p.c & 4 && !b[26] && !b[27] && b[28] === R + 8 && !att(b, 25, 0) && !att(b, 26, 0) && !att(b, 27, 0)) mv.push(25 | 27 << 7 | 2 << 17);
            if (p.c & 8 && !b[24] && !b[23] && !b[22] && b[21] === R + 8 && !att(b, 25, 0) && !att(b, 24, 0) && !att(b, 23, 0)) mv.push(25 | 23 << 7 | 2 << 17);
          }
        }
      } else {
        const D = t === B ? BD : t === R ? RD : QD;
        for (let i = 0; i < D.length; i++) {
          const d = D[i]; let t2 = s + d;
          for (;;) { const y = b[t2]; if (y === OFF) break; if (!y) { if (!caps) mv.push(s | t2 << 7); } else { if ((y >> 3) === them) mv.push(s | t2 << 7); break; } t2 += d; }
        }
      }
    }
    return mv;
  }
  function make(p, m) {
    const b = p.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, x = b[f], us = p.s, o = 8 * us;
    let cap = b[t], h = p.h, h2 = p.h2;
    p.U.push(cap, p.c, p.ep, p.hm, h, h2);
    h ^= ZP[x][f]; h2 ^= ZQ[x][f];
    b[f] = 0;
    if (cap) { h ^= ZP[cap][t]; h2 ^= ZQ[cap][t]; }
    if (fl & 1) { const cs = t + (us ? -10 : 10); cap = b[cs]; h ^= ZP[cap][cs]; h2 ^= ZQ[cap][cs]; b[cs] = 0; p.U[p.U.length - 6] = -cap; }
    const np = pr ? pr + o : x; b[t] = np; h ^= ZP[np][t]; h2 ^= ZQ[np][t];
    if (fl & 2) {
      const rf = t === 97 ? 98 : t === 93 ? 91 : t === 27 ? 28 : 21, rt = t === 97 ? 96 : t === 93 ? 94 : t === 27 ? 26 : 24, rp = R + o;
      b[rf] = 0; b[rt] = rp; h ^= ZP[rp][rf] ^ ZP[rp][rt]; h2 ^= ZQ[rp][rf] ^ ZQ[rp][rt];
    }
    if ((x & 7) === K) p.k[us] = t;
    const nc = p.c & CM[f] & CM[t]; if (nc !== p.c) { h ^= ZC[p.c] ^ ZC[nc]; h2 ^= ZC2[p.c] ^ ZC2[nc]; p.c = nc; }
    if (p.ep) { h ^= ZE[p.ep]; h2 ^= ZE2[p.ep]; p.ep = 0; }
    if (fl & 4) { const ep = (f + t) >> 1, ep2 = P + 8 * (us ^ 1); if (b[t - 1] === ep2 || b[t + 1] === ep2) { p.ep = ep; h ^= ZE[ep]; h2 ^= ZE2[ep]; } }
    p.hm = (x & 7) === P || cap ? 0 : p.hm + 1;
    if (us) p.fm++;
    p.s ^= 1; h ^= ZS; h2 ^= ZS2;
    p.h = h; p.h2 = h2; p.hist.push(h);
  }
  function unmake(p, m) {
    const b = p.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    p.s ^= 1; const us = p.s, o = 8 * us;
    const U = p.U, n = U.length;
    const cap = U[n - 6]; p.c = U[n - 5]; p.ep = U[n - 4]; p.hm = U[n - 3]; p.h = U[n - 2]; p.h2 = U[n - 1]; U.length = n - 6;
    p.hist.pop(); if (us) p.fm--;
    const x = pr ? P + o : b[t];
    b[f] = x;
    if (fl & 1) { b[t] = 0; b[t + (us ? -10 : 10)] = -cap; } else b[t] = cap;
    if (fl & 2) {
      const rf = t === 97 ? 98 : t === 93 ? 91 : t === 27 ? 28 : 21, rt = t === 97 ? 96 : t === 93 ? 94 : t === 27 ? 26 : 24;
      b[rt] = 0; b[rf] = R + o;
    }
    if ((x & 7) === K) p.k[us] = f;
  }
  function makeNull(p) { p.U.push(p.ep, p.h, p.h2); if (p.ep) { p.h ^= ZE[p.ep]; p.h2 ^= ZE2[p.ep]; p.ep = 0; } p.s ^= 1; p.h ^= ZS; p.h2 ^= ZS2; p.hist.push(0); }
  function unmakeNull(p) { const U = p.U, n = U.length; p.ep = U[n - 3]; p.h = U[n - 2]; p.h2 = U[n - 1]; U.length = n - 3; p.s ^= 1; p.hist.pop(); }
  function legal(p) {
    const out = [], mv = gen(p, [], false), us = p.s;
    for (const m of mv) { make(p, m); if (!att(p.b, p.k[us], us ^ 1)) out.push(m); unmake(p, m); }
    return out;
  }
  function perft(p, d) {
    if (!d) return 1;
    const mv = gen(p, [], false), us = p.s; let n = 0;
    for (const m of mv) { make(p, m); if (!att(p.b, p.k[us], us ^ 1)) n += perft(p, d - 1); unmake(p, m); }
    return n;
  }
  const uci = m => sqName(m & 127) + sqName((m >> 7) & 127) + '  nbrq'[(m >> 14) & 7].trim();
  function parseUci(p, u) { for (const m of legal(p)) if (uci(m) === u) return m; return 0; }
  // materiale per vincere: un colore con solo re, o re + un pezzo leggero, non puo' dare matto
  function canMate(p, c) {
    let minor = 0;
    for (let s = 21; s < 99; s++) { const x = p.b[s]; if (!x || x === OFF || (x >> 3) !== c) continue; const t = x & 7; if (t === P || t === R || t === Q) return true; if (t === N || t === B) minor++; }
    return minor >= 2;
  }
  function insufficient(p) {
    const pcs = [];
    for (let s = 21; s < 99; s++) { const x = p.b[s]; if (!x || x === OFF) continue; const t = x & 7; if (t === K) continue; if (t === P || t === R || t === Q) return false; pcs.push([t, s]); }
    if (pcs.length <= 1) return true;
    if (pcs.every(([t]) => t === B)) { const col = s => (fil(s) + rnk(s)) & 1; return pcs.every(([, s]) => col(s) === col(pcs[0][1])); }   // solo alfieri dello stesso colore di case
    return false;
  }
  function reps(p) { let n = 1; const H = p.hist, L = H.length - 1; for (let j = L - 2; j >= 0 && j >= L - p.hm; j -= 2) if (H[j] === p.h) n++; return n; }
  // stato della partita: '' in corso, mate, stale (stallo), rep (ripetizione), fifty (50 mosse), mat (materiale insufficiente)
  function status(p) {
    if (!legal(p).length) return inCheck(p) ? 'mate' : 'stale';
    if (insufficient(p)) return 'mat';
    if (p.hm >= 100) return 'fifty';
    if (reps(p) >= 3) return 'rep';
    return '';
  }
  function san(p, m) {
    const f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, x = p.b[f], ty = x & 7;
    let s;
    if (fl & 2) s = t === 97 || t === 27 ? 'O-O' : 'O-O-O';
    else {
      const cap = p.b[t] || fl & 1;
      if (ty === P) s = (cap ? FILES[fil(f)] + 'x' : '') + sqName(t) + (pr ? '=' + LET[pr] : '');
      else {
        s = LET[ty];
        const oth = legal(p).filter(o => o !== m && ((o >> 7) & 127) === t && p.b[o & 127] === x);
        if (oth.length) { const sf = oth.some(o => fil(o & 127) === fil(f)), sr = oth.some(o => rnk(o & 127) === rnk(f)); s += !sf ? FILES[fil(f)] : !sr ? rnk(f) + 1 : sqName(f); }
        s += (cap ? 'x' : '') + sqName(t);
      }
    }
    make(p, m); if (inCheck(p)) s += legal(p).length ? '+' : '#'; unmake(p, m);
    return s;
  }
  function replay(list, f0) { const p = fromFen(f0 || START); for (const u of list || []) { const m = parseUci(p, u); if (!m) break; make(p, m); } return p; }
  // scacchiera da disegnare: 64 lettere (0 = a8), maiuscole bianche
  function board64(p) { const o = []; for (let i = 0; i < 64; i++) { const x = p.b[SQ120[i]]; o.push(x ? (x >> 3 ? CH[x & 7].toLowerCase() : CH[x & 7]) : ''); } return o; }

  // ---- valutazione (tabelle semplici per pezzo, re tra mediogioco e finale, pedoni passati, coppia degli alfieri, avvicinamento nel finale) ----
  const VAL = [0, 100, 320, 330, 500, 900, 0], PH = [0, 0, 1, 1, 2, 4, 0];
  const PST = [null,
    [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20]];
  const KMG = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
  const KEG = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  const PASS = [0, 5, 10, 20, 35, 60, 100, 0];
  const wMin = new Int8Array(10), bMax = new Int8Array(10), pc = [new Int8Array(10), new Int8Array(10)];
  function evaluate(p) {
    const b = p.b; let mg = 0, eg = 0, phase = 0, bis0 = 0, bis1 = 0, mat0 = 0, mat1 = 0;
    wMin.fill(9); bMax.fill(-2); pc[0].fill(0); pc[1].fill(0);
    for (let s = 21; s < 99; s++) {
      const x = b[s]; if (!x || x === OFF) continue;
      const c = x >> 3, t = x & 7, i = I64[s], ii = c ? i ^ 56 : i, sg = c ? -1 : 1;
      if (t === K) { mg += sg * KMG[ii]; eg += sg * KEG[ii]; continue; }
      const v = VAL[t] + PST[t][ii]; mg += sg * v; eg += sg * v; phase += PH[t];
      if (c) mat1 += VAL[t]; else mat0 += VAL[t];
      if (t === P) { const f = fil(s) + 1, r = rnk(s); pc[c][f]++; if (c) { if (r > bMax[f]) bMax[f] = r; } else if (r < wMin[f]) wMin[f] = r; }
      else if (t === B) { if (c) bis1++; else bis0++; }
    }
    // struttura dei pedoni
    for (let s = 21; s < 99; s++) {
      const x = b[s]; if (x !== P && x !== P + 8) continue;
      const c = x >> 3, f = fil(s) + 1, r = rnk(s);
      let passed = true;
      if (!c) { for (let g = f - 1; g <= f + 1; g++) if (bMax[g] > r) { passed = false; break; } }
      else { for (let g = f - 1; g <= f + 1; g++) if (wMin[g] < r) { passed = false; break; } }
      const rr = c ? 7 - r : r, sg = c ? -1 : 1;
      if (passed) { mg += sg * PASS[rr] / 2; eg += sg * PASS[rr]; }
      if (!pc[c][f - 1] && !pc[c][f + 1]) { mg -= sg * 12; eg -= sg * 15; }
      if (pc[c][f] > 1) { mg -= sg * 8; eg -= sg * 12; }
    }
    if (bis0 >= 2) { mg += 30; eg += 40; } if (bis1 >= 2) { mg -= 30; eg -= 40; }
    if (phase > 24) phase = 24;
    let sc = (mg * phase + eg * (24 - phase)) / 24;
    // finale vinto senza pedoni dell'altro: spingere il re avversario al bordo e avvicinare il proprio (per dare matto anche a poca profondita')
    const diff = mat0 - mat1;
    if (phase <= 7 && Math.abs(diff) >= 300) {
      const wl = diff > 0 ? 1 : 0, kl = p.k[wl], kw = p.k[wl ^ 1];
      const cd = Math.max(3 - fil(kl), fil(kl) - 4) + Math.max(3 - rnk(kl), rnk(kl) - 4);
      const kd = Math.abs(fil(kl) - fil(kw)) + Math.abs(rnk(kl) - rnk(kw));
      const bonus = 12 * cd + 5 * (14 - kd);
      sc += diff > 0 ? bonus : -bonus;
    }
    return (p.s ? -sc : sc) | 0;
  }

  // ---- ricerca: approfondimento progressivo, alfa-beta con finestra nulla, tavola delle posizioni, mossa nulla, riduzioni, quiete ----
  const TTN = 1 << 18, TTM = TTN - 1;
  const ttK = new Int32Array(TTN), ttMv = new Int32Array(TTN), ttV = new Int16Array(TTN), ttD = new Int8Array(TTN), ttF = new Int8Array(TTN);
  const KIL = new Int32Array(128), KIL2 = new Int32Array(128), HIS = new Int32Array(16 * 120);
  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  let nodes = 0, stop = false, deadline = 0, maxNodes = 1e9;
  function rep1(p) { const H = p.hist, L = H.length - 1; for (let j = L - 2; j >= 0 && j >= L - p.hm; j -= 2) if (H[j] === p.h) return true; return false; }
  function hasPieces(p) { const o = 8 * p.s; for (let s = 21; s < 99; s++) { const x = p.b[s]; if (x === N + o || x === B + o || x === R + o || x === Q + o) return true; } return false; }
  function order(p, mv, ttm, ply) {
    const b = p.b, sc = new Int32Array(mv.length);
    for (let i = 0; i < mv.length; i++) {
      const m = mv[i], t = (m >> 7) & 127, cap = b[t], pr = (m >> 14) & 7;
      let v;
      if (m === ttm) v = 2e6;
      else if (cap || (m >> 17) & 1) v = 1e6 + 10 * VAL[cap ? cap & 7 : P] - VAL[b[m & 127] & 7] / 10;
      else if (pr) v = 9e5 + VAL[pr];
      else if (m === KIL[ply]) v = 8e5; else if (m === KIL2[ply]) v = 7e5;
      else v = HIS[(b[m & 127]) * 120 + t];
      sc[i] = v;
    }
    // ordinamento per inserzione (liste corte)
    for (let i = 1; i < mv.length; i++) { const m = mv[i], v = sc[i]; let j = i - 1; while (j >= 0 && sc[j] < v) { mv[j + 1] = mv[j]; sc[j + 1] = sc[j]; j--; } mv[j + 1] = m; sc[j + 1] = v; }
  }
  function qs(p, a, bt, ply) {
    if ((++nodes & 1023) === 0 && (now() > deadline || nodes > maxNodes)) stop = true;
    if (stop) return 0;
    const stand = evaluate(p);
    if (stand >= bt) return stand;
    if (stand > a) a = stand;
    if (ply > 60) return stand;
    const mv = gen(p, [], true); order(p, mv, 0, 127);
    const us = p.s;
    for (const m of mv) {
      const t = (m >> 7) & 127, cap = p.b[t], pr = (m >> 14) & 7;
      if (!pr && stand + VAL[cap ? cap & 7 : P] + 200 < a) continue;
      make(p, m);
      if (att(p.b, p.k[us], us ^ 1)) { unmake(p, m); continue; }
      const v = -qs(p, -bt, -a, ply + 1);
      unmake(p, m);
      if (stop) return 0;
      if (v > a) { a = v; if (a >= bt) return a; }
    }
    return a;
  }
  let rootBest = 0;
  function nm(p, d, a, bt, ply, nullOk) {
    if ((++nodes & 1023) === 0 && (now() > deadline || nodes > maxNodes)) stop = true;
    if (stop) return 0;
    if (ply && (p.hm >= 100 || rep1(p))) return 0;
    if (ply > 100) return evaluate(p);
    const us = p.s, inC = att(p.b, p.k[us], us ^ 1);
    if (inC) d++;
    if (d <= 0) return qs(p, a, bt, ply);
    // distanza dal matto: inutile cercare oltre
    if (ply) { const ma = Math.max(a, -MATE + ply), mb = Math.min(bt, MATE - ply - 1); if (ma >= mb) return ma; }
    const ti = p.h & TTM; let ttm = 0;
    if (ttK[ti] === p.h2) {
      ttm = ttMv[ti];
      if (ply && ttD[ti] >= d) {
        let v = ttV[ti]; if (v > MATE - 200) v -= ply; else if (v < -MATE + 200) v += ply;
        const f = ttF[ti];
        if (f === 0 || (f === 1 && v >= bt) || (f === 2 && v <= a)) return v;
      }
    }
    if (nullOk && !inC && d >= 3 && ply && bt - a === 1 && hasPieces(p) && evaluate(p) >= bt) {
      makeNull(p); const v = -nm(p, d - 3, -bt, -bt + 1, ply + 1, false); unmakeNull(p);
      if (stop) return 0;
      if (v >= bt) return bt;
    }
    const mv = gen(p, [], false); order(p, mv, ttm, ply);
    let best = -INF, bm = 0, n = 0; const a0 = a;
    for (const m of mv) {
      const t = (m >> 7) & 127, quiet = !p.b[t] && !((m >> 17) & 1) && !((m >> 14) & 7);
      make(p, m);
      if (att(p.b, p.k[us], us ^ 1)) { unmake(p, m); continue; }
      n++;
      let v;
      if (n === 1) v = -nm(p, d - 1, -bt, -a, ply + 1, true);
      else {
        const r = d >= 3 && n > 3 && quiet && !inC && !att(p.b, p.k[p.s], us) ? (n > 10 && d > 4 ? 2 : 1) : 0;
        v = -nm(p, d - 1 - r, -a - 1, -a, ply + 1, true);
        if (v > a && (r || v < bt)) v = -nm(p, d - 1, -bt, -a, ply + 1, true);
      }
      unmake(p, m);
      if (stop) return 0;
      if (v > best) {
        best = v; bm = m;
        if (v > a) {
          a = v; if (!ply) rootBest = m;
          if (a >= bt) { if (quiet) { if (KIL[ply] !== m) { KIL2[ply] = KIL[ply]; KIL[ply] = m; } HIS[p.b[m & 127] * 120 + t] += d * d; } break; }
        }
      }
    }
    if (!n) return inC ? -MATE + ply : 0;
    let sv = best; if (sv > MATE - 200) sv += ply; else if (sv < -MATE + 200) sv -= ply;
    ttK[ti] = p.h2; ttMv[ti] = bm; ttV[ti] = sv; ttD[ti] = d; ttF[ti] = best >= bt ? 1 : best <= a0 ? 2 : 0;
    return best;
  }
  // pensa: o = { ms tempo massimo, depth profondita' massima, noise rumore sui punteggi (centesimi), blunder probabilita' di svista, rnd generatore }
  // restituisce { m (uci), v (punteggio per chi muove), d, nodes }
  function think(p, o) {
    o = o || {}; const R = o.rnd || Math.random;
    const root = legal(p); if (!root.length) return null;
    nodes = 0; stop = false; const t0 = now(); deadline = t0 + (o.ms || 1000); maxNodes = o.nodes || 1e9;
    KIL.fill(0); KIL2.fill(0); for (let i = 0; i < HIS.length; i++) HIS[i] >>= 2;
    if (root.length === 1) return { m: uci(root[0]), v: 0, d: 0, nodes: 0 };
    const maxD = o.depth || 64;
    // svista: guarda solo una mossa avanti senza vedere le risposte (lascia pezzi in presa come una persona distratta)
    if (o.blunder && R() < o.blunder) {
      const us = p.s; let bv = -INF, bm = root[0];
      for (const m of root) { make(p, m); const v = -evaluate(p) + (R() - 0.5) * 60; unmake(p, m); if (v > bv) { bv = v; bm = m; } }
      return { m: uci(bm), v: bv, d: 0, nodes: root.length, oops: 1 };
    }
    if (o.noise) {
      // ogni mossa col suo punteggio vero (finestra piena), poi un po' di rumore: sceglie come una persona, non a caso
      let sc = root.map(() => 0), dd = 0;
      for (let d = 1; d <= maxD; d++) {
        const cur = [];
        for (const m of root) { make(p, m); const v = -nm(p, d - 1, -INF, INF, 1, true); unmake(p, m); if (stop) break; cur.push(v); }
        if (stop) break;
        sc = cur; dd = d;
        if (now() - t0 > (o.ms || 1000) * 0.4) break;
      }
      let bv = -INF, bm = root[0], tv = 0;
      root.forEach((m, i) => { const mate = Math.abs(sc[i]) > MATE - 200; const v = sc[i] + (mate ? 0 : (R() + R() + R() - 1.5) * o.noise); if (v > bv) { bv = v; bm = m; tv = sc[i]; } });
      return { m: uci(bm), v: tv, d: dd, nodes };
    }
    let best = root[0], bv = 0, dd = 0;
    for (let d = 1; d <= maxD; d++) {
      rootBest = 0;
      const v = nm(p, d, -INF, INF, 0, true);
      if (stop) { if (rootBest && d > 1) best = rootBest; break; }
      if (rootBest) best = rootBest; bv = v; dd = d;
      if (Math.abs(v) > MATE - 200 && d > 2) break;
      if (now() - t0 > (o.ms || 1000) * 0.45) break;
    }
    return { m: uci(best), v: bv, d: dd, nodes };
  }
  function clearTT() { ttK.fill(0); HIS.fill(0); }
  return { START, fromFen, fen, legal, make, unmake, perft, uci, parseUci, san, status, replay, board64, inCheck, canMate, insufficient, evaluate, think, clearTT, sqName, sqOf, I64, SQ120 };
}
// ==END CH ENGINE==

window.CH = (() => {
  const E = CHE_SRC();
  // ==== PEZZI DI LEGNO (disegnati col canvas in una scatola 100x100, base in basso a y 91) ====
  const WOOD = [
    { hi: '#fff6e2', mid: '#efd09c', lo: '#b98a50', ln: '#4b2d12', gr: 'rgba(160,100,45,.18)', sh: 'rgba(255,255,255,.55)' },   // bosso (bianchi)
    { hi: '#a56c42', mid: '#62341a', lo: '#2a120a', ln: '#100602', gr: 'rgba(0,0,0,.25)', sh: 'rgba(255,214,170,.30)' }       // palissandro (neri)
  ];
  function smooth(pts, closed) {   // curva morbida attraverso i punti (i punti ripetuti fanno spigolo)
    const P = new Path2D(), n = pts.length, md = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!closed) { P.moveTo(...pts[0]); for (let i = 1; i < n - 1; i++) P.quadraticCurveTo(...pts[i], ...md(pts[i], pts[i + 1])); P.lineTo(...pts[n - 1]); return P; }
    P.moveTo(...md(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i++) P.quadraticCurveTo(...pts[i], ...md(pts[i], pts[(i + 1) % n]));
    P.closePath(); return P;
  }
  // solido di rotazione: [[y, meta' larghezza], ...] dall'alto in basso
  const lathe = pts => smooth(pts.map(([y, w]) => [50 + w, y]).concat(pts.slice().reverse().map(([y, w]) => [50 - w, y])), true);
  const ell = (x, y, rx, ry) => { const P = new Path2D(); P.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); return P; };
  const poly = pts => smooth(pts.flatMap(p => [p, p]), true);
  function part(c, P, x0, x1, W, o) {
    o = o || {};
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, W.mid); g.addColorStop(0.24, W.hi); g.addColorStop(0.58, W.mid); g.addColorStop(1, W.lo);
    c.fillStyle = g; c.fill(P);
    // venature del legno
    c.save(); c.clip(P); c.strokeStyle = W.gr; c.lineWidth = 0.9;
    let s = o.seed || 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 9; k++) { const x = x0 + (x1 - x0) * (k + 0.3 + r() * 0.4) / 9, a = (r() - 0.5) * 5; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + a, 30, x - a, 60, x + a * 0.6, 100); c.stroke(); }
    // le parti sotto un po' piu' scure
    const v = c.createLinearGradient(0, o.y0 || 0, 0, o.y1 || 100); v.addColorStop(0, 'rgba(255,255,255,.08)'); v.addColorStop(1, 'rgba(0,0,0,.14)');
    c.fillStyle = v; c.fill(P);
    c.restore();
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = W.ln; c.lineWidth = 2.3; c.stroke(P);
  }
  function shine(c, W, pts) { c.save(); c.strokeStyle = W.sh; c.lineWidth = 1.6; c.lineCap = 'round'; c.stroke(smooth(pts)); c.restore(); }
  function foot(c, W, w) {   // base + anello: uguali per tutti, cambia la larghezza
    part(c, lathe([[79, w - 4], [80.5, w], [84, w + 2.5], [88.5, w + 2.5], [91, w + 1], [91, w + 1]]), 50 - w - 3, 50 + w + 3, W, { y0: 79, y1: 91, seed: 3 });
    part(c, ell(50, 77.5, w - 2, 3.6), 50 - w, 50 + w, W, { y0: 74, y1: 81, seed: 5 });
  }
  const DRAW = {
    p(c, W) {
      foot(c, W, 23);
      part(c, lathe([[44, 7.5], [52, 8], [62, 11], [70, 16], [75, 20], [75, 20]]), 30, 70, W, { y0: 44, y1: 75 });
      part(c, ell(50, 28, 12.5, 12.5), 37.5, 62.5, W, { y0: 16, y1: 40, seed: 11 });
      part(c, ell(50, 44.5, 15.5, 3.8), 34, 66, W, { y0: 41, y1: 48 });
      shine(c, W, [[42, 22], [40.5, 27], [41.5, 32]]);
    },
    r(c, W) {
      foot(c, W, 27);
      part(c, lathe([[38, 15], [48, 15], [62, 16.5], [71, 21], [75, 24], [75, 24]]), 26, 74, W, { y0: 38, y1: 75 });
      part(c, poly([[29, 37], [29, 13], [38, 13], [38, 19.5], [45.5, 19.5], [45.5, 13], [54.5, 13], [54.5, 19.5], [62, 19.5], [62, 13], [71, 13], [71, 37]]), 29, 71, W, { y0: 13, y1: 37, seed: 13 });
      part(c, ell(50, 37.5, 22.5, 4.2), 27, 73, W, { y0: 33, y1: 42 });
      shine(c, W, [[33, 18], [33, 32]]);
    },
    b(c, W) {
      foot(c, W, 22);
      part(c, lathe([[52, 7.5], [60, 8], [69, 13], [75, 18.5], [75, 18.5]]), 31, 69, W, { y0: 52, y1: 75 });
      part(c, smooth([[50, 13.5], [57, 18], [63, 27], [63.5, 36], [60, 45], [50, 49.5], [40, 45], [36.5, 36], [37, 27], [43, 18]], true), 36, 64, W, { y0: 13, y1: 50, seed: 17 });
      c.save(); c.strokeStyle = W.ln; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(58.5, 23); c.lineTo(49, 34.5); c.stroke(); c.restore();
      part(c, ell(50, 10.5, 4.6, 4.6), 45, 55, W, { y0: 6, y1: 15 });
      part(c, ell(50, 53, 14.5, 3.6), 35, 65, W, { y0: 50, y1: 57 });
      part(c, ell(50, 48.6, 11, 2.6), 39, 61, W, { y0: 46, y1: 51 });
      shine(c, W, [[41.5, 27], [40.5, 35], [42.5, 42]]);
    },
    q(c, W) {
      foot(c, W, 25);
      part(c, lathe([[42, 9.5], [52, 10], [63, 13.5], [71, 18], [75, 22.5], [75, 22.5]]), 27, 73, W, { y0: 42, y1: 75 });
      part(c, poly([[37, 39], [28.5, 17], [40.5, 28], [40.5, 12.5], [47.5, 26.5], [50, 9.5], [52.5, 26.5], [59.5, 12.5], [59.5, 28], [71.5, 17], [63, 39]]), 30, 70, W, { y0: 10, y1: 39, seed: 19 });
      for (const [x, y, r] of [[28.5, 15.5, 3.4], [40.5, 10.8, 3.4], [50, 7.2, 3.8], [59.5, 10.8, 3.4], [71.5, 15.5, 3.4]]) part(c, ell(x, y, r, r), x - r, x + r, W, { y0: y - r, y1: y + r });
      part(c, ell(50, 44.5, 13, 3), 37, 63, W, { y0: 42, y1: 48 });
      part(c, ell(50, 39.8, 16.5, 3.8), 33, 67, W, { y0: 36, y1: 44 });
      shine(c, W, [[37, 22], [39.5, 33]]);
    },
    k(c, W) {
      foot(c, W, 26);
      part(c, lathe([[43, 11], [53, 11], [64, 14], [71.5, 19], [75, 23.5], [75, 23.5]]), 26, 74, W, { y0: 43, y1: 75 });
      part(c, smooth([[36, 41.5], [31.5, 33], [31.5, 26.5], [37, 22.5], [37, 22.5], [63, 22.5], [63, 22.5], [68.5, 26.5], [68.5, 33], [64, 41.5], [64, 41.5], [36, 41.5]], true), 31, 69, W, { y0: 22, y1: 42, seed: 23 });
      part(c, poly([[46.5, 21], [46.5, 13.5], [40.5, 13.5], [40.5, 7.5], [46.5, 7.5], [46.5, 2.5], [53.5, 2.5], [53.5, 7.5], [59.5, 7.5], [59.5, 13.5], [53.5, 13.5], [53.5, 21]]), 40, 60, W, { y0: 2, y1: 21, seed: 29 });
      part(c, ell(50, 22.5, 14, 3.4), 36, 64, W, { y0: 19, y1: 26 });
      part(c, ell(50, 42, 18.5, 4.2), 31, 69, W, { y0: 38, y1: 46 });
      shine(c, W, [[36, 27], [36.5, 34]]);
    },
    n(c, W) {
      foot(c, W, 25);
      const H = smooth([[71, 75.5], [71, 75.5], [75.5, 60], [75, 41], [68, 25], [61, 16.5], [57, 13.5], [57.5, 4.5], [57.5, 4.5], [49.5, 11.5], [49.5, 11.5], [40, 14], [31, 20], [25, 28], [17.5, 38], [14.5, 45], [15.5, 50.5], [20, 54.5], [26, 54], [33, 50.5], [38, 48], [43, 48], [46.5, 51], [41, 57], [33, 64], [30.5, 75.5], [30.5, 75.5]], true);
      part(c, H, 14, 76, W, { y0: 4, y1: 76, seed: 31 });
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = W.ln; c.lineWidth = 1.7;   // criniera: ciocche lungo il collo
      for (let i = 0; i < 6; i++) { const y = 20 + i * 9.5, x = 64 + Math.sin(i * 0.9) * 1.5 + i * 1.3; c.beginPath(); c.moveTo(x - 1, y); c.quadraticCurveTo(x + 5, y + 3, x + 4.5 + i * 0.4, y + 8); c.stroke(); }
      c.fillStyle = W.ln; c.beginPath(); c.ellipse(39, 26.5, 3.2, 2.1, -0.5, 0, Math.PI * 2); c.fill();   // occhio
      c.fillStyle = W === WOOD[0] ? '#fff' : '#d9a878'; c.beginPath(); c.arc(38.2, 25.9, 0.8, 0, 7); c.fill();
      c.fillStyle = W.ln; c.beginPath(); c.ellipse(20.5, 44, 2, 1.5, -0.6, 0, Math.PI * 2); c.fill();   // narice
      c.strokeStyle = W.ln; c.lineWidth = 1.6; c.beginPath(); c.moveTo(16.5, 50); c.quadraticCurveTo(21, 50.5, 25, 49.2); c.stroke();   // bocca
      c.beginPath(); c.moveTo(45, 31); c.quadraticCurveTo(48, 39, 44, 46); c.stroke();   // guancia
      c.restore();
      shine(c, W, [[29, 24], [22.5, 33], [18.5, 40.5]]);
    }
  };
  const artCache = {};
  // canvas del pezzo (t = 'p','n','b','r','q','k'; col 0 bianco 1 nero) a px pixel
  function art(t, col, px) {
    const key = t + col + px; if (artCache[key]) return artCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const c = cv.getContext('2d'); c.scale(px / 100, px / 100);
    const g = c.createRadialGradient(50, 91, 2, 50, 91, 32); g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.translate(0, 91); c.scale(1, 0.2); c.translate(0, -91); c.fillStyle = g; c.beginPath(); c.arc(50, 91, 32, 0, 7); c.fill(); c.restore();
    DRAW[t](c, WOOD[col]);
    return artCache[key] = cv;
  }
  const urlCache = {};
  const artUrl = (t, col, px) => urlCache[t + col + px] || (urlCache[t + col + px] = art(t, col, px).toDataURL());

  // ==== SUONI (legno sul legno) ====
  let ac = null, nb = null;
  function snd(kind) {
    if (typeof store !== 'undefined' && store.settings && store.settings.sound === false) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      if (!nb) { nb = ac.createBuffer(1, ac.sampleRate * 0.12 | 0, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
      const t0 = ac.currentTime;
      const knock = (t, f, v, q) => {
        const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = nb; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 1.6; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t);
        const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f / 7, t); o.frequency.exponentialRampToValueAtTime(f / 12, t + 0.06);
        og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.1);
      };
      const tone = (t, f, v, d, ty) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = ty || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02); };
      if (kind === 'move') knock(t0, 1500, 0.55);
      else if (kind === 'cap') { knock(t0, 1900, 0.7, 1.2); knock(t0 + 0.035, 1100, 0.45); }
      else if (kind === 'castle') { knock(t0, 1500, 0.5); knock(t0 + 0.11, 1350, 0.45); }
      else if (kind === 'check') { knock(t0, 1700, 0.55); tone(t0 + 0.02, 1318, 0.09, 0.22, 'triangle'); }
      else if (kind === 'promo') { knock(t0, 1500, 0.5); tone(t0 + 0.05, 1046, 0.07, 0.15, 'triangle'); tone(t0 + 0.13, 1568, 0.07, 0.25, 'triangle'); }
      else if (kind === 'bad') tone(t0, 220, 0.06, 0.12, 'square');
      else if (kind === 'start') { tone(t0, 784, 0.06, 0.15, 'triangle'); tone(t0 + 0.12, 1175, 0.06, 0.25, 'triangle'); }
      else if (kind === 'win') [0, 4, 7, 12].forEach((n, i) => tone(t0 + i * 0.11, 523 * Math.pow(2, n / 12), 0.08, 0.3, 'triangle'));
      else if (kind === 'lose') [7, 3, 0].forEach((n, i) => tone(t0 + i * 0.16, 392 * Math.pow(2, n / 12), 0.07, 0.35, 'triangle'));
      else if (kind === 'draw') [0, 7].forEach((n, i) => tone(t0 + i * 0.15, 440 * Math.pow(2, n / 12), 0.07, 0.3, 'triangle'));
      else if (kind === 'tick') tone(t0, 1760, 0.035, 0.05, 'square');
    } catch {}
  }

  // ==== SCACCHIERA (DOM: case su canvas, pezzi come <img> con transizioni CSS, niente disegno a ogni fotogramma) ====
  const THEMES = {
    verde: { l: '#ebe8cf', d: '#789a58', hl: 'rgba(255,221,64,.48)', name: 'Verde' },
    legno: { l: '#f0d8b0', d: '#b3804f', hl: 'rgba(255,214,70,.45)', name: 'Legno' },
    blu: { l: '#e4e9ec', d: '#86a3b4', hl: 'rgba(255,226,90,.55)', name: 'Blu' }
  };
  const idxOf = n => (n.charCodeAt(0) - 97) + (8 - +n[1]) * 8;   // 0 = a8
  const dprOf = () => Math.min(2.5, window.devicePixelRatio || 1);
  // o: { side() colore che posso muovere (0/1, -1 nessuno), onMove(uci), theme }
  function board(host, o) {
    const V = { flip: false, theme: o.theme || 'verde', moves: [], p: E.fromFen(E.START), sel: -1, tg: new Map(), drag: null, el: new Array(64).fill(null), sz: 40, dropped: null, mate: null };
    const B = document.createElement('div'); B.className = 'chB'; host.appendChild(B);
    const cv = document.createElement('canvas'); cv.className = 'chSq'; B.appendChild(cv);
    const HL = document.createElement('div'); HL.className = 'chL'; B.appendChild(HL);
    const PC = document.createElement('div'); PC.className = 'chL'; B.appendChild(PC);
    const DT = document.createElement('div'); DT.className = 'chL'; B.appendChild(DT);
    const XY = i => { let c = i & 7, r = i >> 3; if (V.flip) { c = 7 - c; r = 7 - r; } return [c * V.sz, r * V.sz]; };
    const tr = i => { const [x, y] = XY(i); return `translate(${x}px,${y}px)`; };
    const b64 = () => E.board64(V.p);
    function drawSquares() {
      const s = V.sz, dpr = dprOf(), th = THEMES[V.theme] || THEMES.verde;
      cv.width = cv.height = Math.round(s * 8 * dpr); cv.style.width = cv.style.height = s * 8 + 'px';
      const c = cv.getContext('2d'); c.scale(dpr, dpr);
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { c.fillStyle = (r + f) & 1 ? th.d : th.l; c.fillRect(f * s, r * s, s, s); }
      c.font = `700 ${Math.max(9, s * 0.2) | 0}px system-ui,sans-serif`;
      for (let k = 0; k < 8; k++) {
        const rk = V.flip ? k + 1 : 8 - k, fl = 'abcdefgh'[V.flip ? 7 - k : k];
        c.fillStyle = k & 1 ? th.l : th.d; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(rk, s * 0.06, k * s + s * 0.05);
        c.fillStyle = (7 + k) & 1 ? th.l : th.d; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(fl, k * s + s * 0.95, 8 * s - s * 0.03);
      }
    }
    const src = ch => artUrl(ch.toLowerCase(), ch === ch.toUpperCase() ? 0 : 1, Math.round(V.sz * dprOf()));
    function mk(i, ch) { const m = document.createElement('img'); m.className = 'chP'; m.draggable = false; m.src = src(ch); m.style.width = m.style.height = V.sz + 'px'; m.style.transform = tr(i); PC.appendChild(m); return m; }
    function rebuild() { PC.textContent = ''; V.el.fill(null); b64().forEach((ch, i) => { if (ch) V.el[i] = mk(i, ch); }); }
    function size(px) {
      px = Math.max(160, Math.floor(px / 8) * 8); if (px / 8 === V.sz && B.style.width) return; V.sz = px / 8;
      B.style.width = B.style.height = px + 'px'; drawSquares(); rebuild(); marks();
    }
    // segni: ultima mossa, scacco, matto, selezione e mosse possibili
    function marks() {
      HL.textContent = ''; DT.textContent = '';
      const th = THEMES[V.theme] || THEMES.verde, s = V.sz, box = (i, css) => { const d = document.createElement('div'); d.className = 'chH'; d.style.cssText = css + `;width:${s}px;height:${s}px;transform:${tr(i)}`; HL.appendChild(d); return d; };
      const last = V.moves[V.moves.length - 1];
      if (last) { box(idxOf(last.slice(0, 2)), 'background:' + th.hl); box(idxOf(last.slice(2, 4)), 'background:' + th.hl); }
      if (V.sel >= 0) box(V.sel, 'background:' + th.hl);
      if (E.inCheck(V.p)) box(E.I64[V.p.k[V.p.s]], 'background:radial-gradient(circle,rgba(255,40,30,.95) 0%,rgba(230,20,10,.6) 40%,rgba(200,0,0,0) 72%)');
      for (const [to, list] of V.tg) {
        const d = document.createElement('div'); d.className = V.el[to] || list[0].ep ? 'chCap' : 'chDot';
        d.style.cssText = `width:${s}px;height:${s}px;transform:${tr(to)}`; DT.appendChild(d);
      }
      if (V.mate != null) { const d = document.createElement('div'); d.className = 'chMate'; d.style.cssText = `width:${s}px;height:${s}px;transform:${tr(E.I64[V.p.k[V.mate]])}`; d.innerHTML = '<i>#</i>'; DT.appendChild(d); }
    }
    function legalFrom(i) {
      const map = new Map(), sq = E.SQ120[i];
      for (const m of E.legal(V.p)) if ((m & 127) === sq) { const t = E.I64[(m >> 7) & 127]; if (!map.has(t)) map.set(t, []); map.get(t).push({ u: E.uci(m), pr: (m >> 14) & 7, ep: (m >> 17) & 1 }); }
      return map;
    }
    const colOf = ch => ch === ch.toUpperCase() ? 0 : 1;
    const mine = i => { const ch = b64()[i], sd = o.side(); return !!ch && sd === V.p.s && colOf(ch) === sd && V.mate == null; };
    function select(i) { V.sel = i; V.tg = i >= 0 ? legalFrom(i) : new Map(); marks(); }
    function sqAt(x0, y0) { const r = B.getBoundingClientRect(); let c = Math.floor((x0 - r.left) / V.sz), w = Math.floor((y0 - r.top) / V.sz); if (c < 0 || c > 7 || w < 0 || w > 7) return -1; if (V.flip) { c = 7 - c; w = 7 - w; } return w * 8 + c; }
    function go(u, dropped) { V.dropped = dropped ? u : null; select(-1); o.onMove(u); }
    function tryMove(from, to, dropped) {
      const list = V.tg.get(to); if (!list) return false;
      if (list.length > 1) { promoPick(from, to, list, dropped); return true; }
      go(list[0].u, dropped); return true;
    }
    // promozione: colonna dei 4 pezzi sopra la casa d'arrivo, come sui siti di scacchi
    function promoPick(from, to, list, dropped) {
      const el = V.el[from]; if (el) el.style.transform = tr(to);
      const col = V.p.s, box = document.createElement('div'); box.className = 'chPro';
      const [x, y] = XY(to), down = y < V.sz * 4;
      box.style.cssText = `left:${x}px;width:${V.sz}px;top:${down ? y : y - 3 * V.sz - 22}px`;
      const order = ['q', 'n', 'r', 'b'];
      for (const t of down ? order : order.slice().reverse()) {
        const m = document.createElement('img'); m.src = artUrl(t, col, Math.round(V.sz * dprOf())); m.style.width = m.style.height = V.sz + 'px';
        m.onpointerdown = e => { e.stopPropagation(); box.remove(); go(list.find(z => ' pnbrqk'[z.pr] === t).u, true); };
        box.appendChild(m);
      }
      const x2 = document.createElement('div'); x2.className = 'chProX'; x2.textContent = '✕';
      x2.onpointerdown = e => { e.stopPropagation(); box.remove(); if (el) el.style.transform = tr(from); select(-1); };
      if (down) box.appendChild(x2); else box.insertBefore(x2, box.firstChild);
      B.appendChild(box);
    }
    const lift = e => e.pointerType === 'touch' ? V.sz * 0.35 : 0;
    B.addEventListener('pointerdown', e => {
      if (B.querySelector('.chPro')) return;
      const i = sqAt(e.clientX, e.clientY); if (i < 0) return;
      if (V.sel >= 0 && V.tg.has(i)) { tryMove(V.sel, i, false); return; }
      if (mine(i)) {
        const was = V.sel === i; select(i);
        V.drag = { i, el: V.el[i], x0: e.clientX, y0: e.clientY, moved: false, was, id: e.pointerId };
        try { B.setPointerCapture(e.pointerId); } catch {}
        return;
      }
      if (V.sel >= 0) select(-1);
      const ch = b64()[i];   // pezzo che non si puo' muovere adesso: trema
      if (ch && o.side() >= 0 && V.el[i]) { const el = V.el[i]; el.classList.remove('chNo'); void el.offsetWidth; el.classList.add('chNo'); }
    });
    B.addEventListener('pointermove', e => {
      const D = V.drag; if (!D || e.pointerId !== D.id || !D.el) return;
      if (!D.moved && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 6) return;
      D.moved = true; D.el.classList.add('chDrag');
      const r = B.getBoundingClientRect(), x = e.clientX - r.left - V.sz / 2, y = e.clientY - r.top - V.sz / 2 - lift(e);
      D.el.style.transform = `translate(${x}px,${y}px) scale(1.15)`;
      const h = sqAt(e.clientX, e.clientY - lift(e)); let hv = B.querySelector('.chHov');
      if (h >= 0) { if (!hv) { hv = document.createElement('div'); hv.className = 'chHov'; B.appendChild(hv); } hv.style.cssText = `width:${V.sz}px;height:${V.sz}px;transform:${tr(h)}`; } else if (hv) hv.remove();
    });
    function endDrag(e) {
      const D = V.drag; if (!D || e.pointerId !== D.id) return; V.drag = null;
      const hv = B.querySelector('.chHov'); if (hv) hv.remove();
      if (!D.el) return;
      D.el.classList.remove('chDrag');
      if (D.moved) {
        const i = sqAt(e.clientX, e.clientY - lift(e));
        if (i >= 0 && i !== D.i && V.tg.has(i)) { D.el.style.transition = 'none'; D.el.style.transform = tr(i); void D.el.offsetWidth; D.el.style.transition = ''; tryMove(D.i, i, true); return; }
        D.el.style.transform = tr(D.i);
        if (i >= 0 && i !== D.i) { snd('bad'); select(-1); }
      } else if (D.was) select(-1);
    }
    B.addEventListener('pointerup', endDrag); B.addEventListener('pointercancel', endDrag);
    // nuova lista di mosse: se e' una in piu' di quella mostrata la anima, altrimenti ridisegna
    function sync(list, o2) {
      o2 = o2 || {};
      const old = V.moves, one = list.length === old.length + 1 && old.every((u, k) => u === list[k]);
      const pro = B.querySelector('.chPro');
      if (list.length === old.length && old.every((u, k) => u === list[k])) return;
      if (pro) pro.remove();
      if (!one) { V.moves = list.slice(); V.p = E.replay(V.moves); V.mate = E.status(V.p) === 'mate' ? V.p.s : null; V.sel = -1; V.tg = new Map(); rebuild(); marks(); return; }
      const u = list[list.length - 1], m = E.parseUci(V.p, u); if (!m) { V.moves = []; return sync(list, o2); }
      const fl = m >> 17, pr = (m >> 14) & 7, from = idxOf(u.slice(0, 2)), to = idxOf(u.slice(2, 4)), anim = V.dropped !== u && !o2.still;
      const capI = fl & 1 ? to + (V.p.s ? -8 : 8) : V.el[to] ? to : -1;
      const kind = fl & 2 ? 'castle' : capI >= 0 ? 'cap' : pr ? 'promo' : 'move';
      E.make(V.p, m); V.moves = list.slice(); V.dropped = null;
      const el = V.el[from];
      if (capI >= 0 && V.el[capI]) { const c = V.el[capI]; V.el[capI] = null; c.classList.add('chGone'); setTimeout(() => c.remove(), 260); }
      if (el) {
        if (anim) { el.classList.add('chFly'); setTimeout(() => el.classList.remove('chFly'), 260); el.style.transform = tr(to); }
        else { el.style.transition = 'none'; el.style.transform = tr(to); void el.offsetWidth; el.style.transition = ''; }
      }
      V.el[from] = null; V.el[to] = el;
      if (fl & 2) { const rk = to === 62 ? [63, 61] : to === 58 ? [56, 59] : to === 6 ? [7, 5] : [0, 3], r = V.el[rk[0]]; if (r) { r.classList.add('chFly'); r.style.transform = tr(rk[1]); setTimeout(() => r.classList.remove('chFly'), 260); } V.el[rk[0]] = null; V.el[rk[1]] = r; }
      if (pr && el) { const ch = b64()[to]; setTimeout(() => { el.src = src(ch); el.classList.add('chPop'); }, anim ? 200 : 0); }
      V.mate = E.status(V.p) === 'mate' ? V.p.s : null;
      V.sel = -1; V.tg = new Map(); marks();
      if (!o2.quiet) snd(E.inCheck(V.p) ? 'check' : kind);
    }
    V.size = size; V.sync = sync; V.el0 = B; V.marks = marks; V.select = select;
    V.setFlip = f => { if (V.flip === !!f) return; V.flip = !!f; drawSquares(); rebuild(); marks(); };
    V.setTheme = t => { V.theme = t; drawSquares(); marks(); };
    return V;
  }

  // ==== SCHERMATA DI GIOCO: barre dei giocatori (nome, pezzi presi, orologio), scacchiera, mosse, pulsanti ====
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const fmt = ms => {
    ms = Math.max(0, ms);
    if (ms < 10000) { const d = Math.floor(ms / 100); return '0:0' + Math.floor(d / 10) + '.' + (d % 10); }
    const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0');
  };
  function screen(root, o) {
    const W = document.createElement('div'); W.className = 'chW'; root.appendChild(W);
    const bar = () => { const b = document.createElement('div'); b.className = 'chBar'; b.innerHTML = '<div class="chAv"></div><div class="chNm"><b></b><span class="chTk"></span></div><div class="chClk" hidden></div>'; return b; };
    const top = bar(), bot = bar();
    const mid = document.createElement('div'); mid.className = 'chMid';
    W.append(top, mid, bot);
    const mv = document.createElement('div'); mv.className = 'chMv'; W.appendChild(mv);
    const btns = document.createElement('div'); btns.className = 'chBtns'; W.appendChild(btns);
    const V = board(mid, o);
    const S = { V, W, top, bot, mv, btns, san: [] };
    S.fit = () => {
      const w = root.clientWidth, h = root.clientHeight;
      const px = Math.min(w - 12, h - 2 * 50 - 36 - 52 - 30, 720);
      V.size(px); W.style.width = Math.max(V.sz * 8, 160) + 'px';
    };
    // pezzi presi e vantaggio: confronto con la dotazione iniziale
    function taken(b) {
      const cnt = { P: 0, N: 0, B: 0, R: 0, Q: 0, p: 0, n: 0, b: 0, r: 0, q: 0 }; for (const ch of b) if (ch && cnt[ch] != null) cnt[ch]++;
      const full = { p: 8, n: 2, b: 2, r: 2, q: 1 }, out = [[], []]; let mat = 0;
      for (const t of 'pnbrq') { mat += (cnt[t.toUpperCase()] - cnt[t]) * VAL[t]; for (let k = cnt[t]; k < full[t]; k++) out[0].push(t); for (let k = cnt[t.toUpperCase()]; k < full[t]; k++) out[1].push(t); }
      return { out, mat };   // out[0] = neri presi dal bianco, out[1] = bianchi presi dal nero; mat > 0 = bianco avanti
    }
    function setBar(b, d) {
      const av = b.querySelector('.chAv'); if (av.textContent !== d.av) av.textContent = d.av;
      av.className = 'chAv' + (d.col ? ' dk' : '');
      const nm = b.querySelector('b'), txt = d.name + (d.sub ? ' <small>' + d.sub + '</small>' : ''); if (nm.innerHTML !== txt) nm.innerHTML = txt;
      const tk = b.querySelector('.chTk'), k = d.taken.join('') + d.adv;
      if (tk.dataset.k !== k) { tk.dataset.k = k; tk.innerHTML = d.taken.map(t => `<img src="${artUrl(t, 1 - d.col, 40)}">`).join('') + (d.adv > 0 ? '<em>+' + d.adv + '</em>' : ''); }
      b.classList.toggle('on', !!d.turn);
    }
    // d = { moves, bottom: colore in basso, names: [bianco, nero], subs, avs, over }
    S.render = d => {
      V.setFlip(d.bottom === 1); S.bottom = d.bottom;
      V.sync(d.moves, d.syncOpt);
      const tk = taken(E.board64(V.p)), adv = c => (c ? -tk.mat : tk.mat);
      const one = c => ({ name: d.names[c], sub: d.subs ? d.subs[c] : '', av: d.avs ? d.avs[c] : c ? '♚' : '♔', col: c, taken: tk.out[c], adv: adv(c), turn: !d.over && V.p.s === c });
      setBar(top, one(1 - d.bottom)); setBar(bot, one(d.bottom));
      // elenco delle mosse in notazione italiana (si aggiunge solo quello che manca)
      if (d.moves.length < S.san.length || S.san.some((x, k) => x.u !== d.moves[k])) { S.san = []; mv.textContent = ''; }
      if (S.san.length < d.moves.length) {
        const p = E.replay(d.moves.slice(0, S.san.length));
        for (let k = S.san.length; k < d.moves.length; k++) {
          const m = E.parseUci(p, d.moves[k]); if (!m) break;
          const s = E.san(p, m); E.make(p, m); S.san.push({ u: d.moves[k], s });
          if (k % 2 === 0) { const n = document.createElement('span'); n.className = 'chMn'; n.textContent = (k / 2 + 1) + '.'; mv.appendChild(n); }
          const e = document.createElement('span'); e.className = 'chMs'; e.textContent = s; mv.appendChild(e);
        }
        mv.querySelectorAll('.chMs.on').forEach(x => x.classList.remove('on'));
        const lastE = mv.lastElementChild; if (lastE) { lastE.classList.add('on'); mv.scrollLeft = mv.scrollWidth; }
      }
    };
    // orologi: ms per colore [bianco, nero] o null, run = colore che corre (-1 fermo)
    S.clock = (ms, run) => {
      [[top, 1 - S.bottom], [bot, S.bottom]].forEach(([b, c]) => {
        const ck = b.querySelector('.chClk'); ck.hidden = !ms; if (!ms) return;
        const t = fmt(ms[c]); if (ck.textContent !== t) ck.textContent = t;
        ck.classList.toggle('on', run === c); ck.classList.toggle('low', ms[c] < 20000);
      });
    };
    return S;
  }
  // ==== PARTITA (stato condiviso, uguale contro il computer e online): chi e' bianco, mosse, orologio, fine ====
  // S = { mv: [uci], wc: posto che ha il bianco, ck: { b, i, t: [ms bianco, ms nero], at: ora di partenza del turno (0 = fermo) } o null,
  //       ph 'play'/'end', win (posto, -1 patta), why, res (motivo) }
  const CADENZE = [
    { k: '0', n: 'Senza orologio' },
    { k: '1+0', n: 'Bullet 1 min', g: 'bullet' }, { k: '2+1', n: 'Bullet 2 | 1', g: 'bullet' },
    { k: '3+0', n: 'Lampo 3 min', g: 'lampo' }, { k: '3+2', n: 'Lampo 3 | 2', g: 'lampo' }, { k: '5+0', n: 'Lampo 5 min', g: 'lampo' }, { k: '5+3', n: 'Lampo 5 | 3', g: 'lampo' },
    { k: '10+0', n: 'Rapida 10 min', g: 'rapida' }, { k: '10+5', n: 'Rapida 10 | 5', g: 'rapida' }, { k: '15+10', n: 'Rapida 15 | 10', g: 'rapida' }
  ];
  function newClock(k) { if (!k || k === '0') return null; const [m, s] = k.split('+').map(Number); return { k, b: m * 60000, i: s * 1000, t: [m * 60000, m * 60000], at: 0 }; }
  const colorOf = (S, seat) => seat === S.wc ? 0 : 1;
  const seatOf = (S, col) => col === 0 ? S.wc : 1 - S.wc;
  const posOf = S => E.replay(S.mv);
  // tempo rimasto adesso per il colore c (now = orologio di chi ha scritto lo stato, o il mio + scarto)
  function left(S, c, now) { const k = S.ck; if (!k) return 0; return k.t[c] - (S.ph === 'play' && k.at && (S.mv.length & 1) === c ? now - k.at : 0); }
  const WHY = { mate: 'Scacco matto', stale: 'Stallo: patta', rep: 'Patta per ripetizione (3 volte la stessa posizione)', fifty: 'Patta: 50 mosse senza prese né pedoni mossi', mat: 'Patta: non resta abbastanza materiale per dare matto' };
  function finish(S, win, res, why) { S.ph = 'end'; S.win = win; S.res = res; S.why = why; if (S.ck) S.ck.at = 0; }
  // mossa del posto seat: true se valida
  function apply(S, seat, u, now) {
    if (S.ph !== 'play') return false;
    const p = posOf(S), c = p.s; if (colorOf(S, seat) !== c) return false;
    const m = E.parseUci(p, u); if (!m) return false;
    if (S.ck && S.ck.at) { S.ck.t[c] -= now - S.ck.at; if (S.ck.t[c] <= 0) { flag(S, now); return true; } }
    if (S.ck && (S.ck.at || S.mv.length)) S.ck.t[c] += S.ck.i;
    E.make(p, m); S.mv.push(u);
    if (S.ck) S.ck.at = S.mv.length >= 1 ? now : 0;
    const st = E.status(p);
    if (st === 'mate') finish(S, seat, 'mate', WHY.mate);
    else if (st) finish(S, -1, st, WHY[st]);
    return true;
  }
  // tempo scaduto? (lo controlla chi tiene la partita)
  function flag(S, now) {
    if (S.ph !== 'play' || !S.ck || !S.ck.at) return false;
    const c = S.mv.length & 1; if (left(S, c, now) > 0) return false;
    S.ck.t[c] = 0;
    const p = posOf(S), other = 1 - c;
    if (!E.canMate(p, other)) finish(S, -1, 'time', 'Tempo scaduto, ma l\'altro non ha i pezzi per dare matto: patta');
    else finish(S, seatOf(S, other), 'time', 'Tempo scaduto');
    return true;
  }

  // ==== COMPUTER: livelli (forza 0-100) e calcolo in un Worker (il telefono non si blocca) ====
  const LEVELS = [
    { k: 'pri', n: 'Principiante', s: 4, e: '🐣' }, { k: 'fac', n: 'Facile', s: 25, e: '🙂' }, { k: 'med', n: 'Medio', s: 50, e: '🤔' },
    { k: 'dif', n: 'Difficile', s: 75, e: '😤' }, { k: 'cam', n: 'Campione', s: 100, e: '👑' }, { k: 'ada', n: 'Adattivo', s: -1, e: '🧠' }
  ];
  function aiOpts(s, ms) {   // s = forza, ms = tempo che si puo' prendere (orologio)
    const o = { depth: s < 12 ? 1 : s < 32 ? 2 : s < 55 ? 3 : s < 78 ? 4 : s < 92 ? 6 : 64, ms: 250 + s * 14, noise: s < 92 ? (100 - s) * 2.4 : 0, blunder: s < 62 ? (62 - s) / 62 * 0.24 : 0 };
    if (ms) o.ms = Math.max(60, Math.min(o.ms, ms));
    return o;
  }
  let wk = null, wkN = 0; const wkCb = {};
  function think(moves, o, cb) {
    const id = ++wkN;
    if (wk === null) {
      try {
        const code = '(' + CHE_SRC.toString() + ')';
        const blob = new Blob(['const E=' + code + '();onmessage=e=>{const d=e.data;let r=null;try{r=E.think(E.replay(d.mv),d.o);}catch(x){r={err:String(x&&x.stack||x)};}postMessage({id:d.id,r});};'], { type: 'text/javascript' });
        wk = new Worker(URL.createObjectURL(blob));
        wk.onmessage = e => { const f = wkCb[e.data.id]; delete wkCb[e.data.id]; if (f) f.cb(e.data.r); };
        // il Worker non parte (browser che non lo permette): le richieste in sospeso si fanno sul telefono stesso
        wk.onerror = () => { wk = false; for (const k of Object.keys(wkCb)) { const f = wkCb[k]; delete wkCb[k]; local(f); } };
      } catch { wk = false; }
    }
    const job = { cb, moves, o };
    if (wk) { wkCb[id] = job; wk.postMessage({ id, mv: moves, o }); }
    else local(job);
    return id;
  }
  function local(j) { setTimeout(() => j.cb(E.think(E.replay(j.moves), Object.assign({}, j.o, { ms: Math.min(j.o.ms, 700) }))), 30); }
  const cancelThink = id => { delete wkCb[id]; };

  // ==== STILE ====
  if (typeof document !== 'undefined' && !document.getElementById('chCss')) {
    const css = document.createElement('style'); css.id = 'chCss';
    css.textContent = `
.chW{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:5px;font-family:system-ui,sans-serif;color:#eee}
.chMid{position:relative;align-self:center;border-radius:4px;box-shadow:0 6px 24px rgba(0,0,0,.55)}
.chB{position:relative;touch-action:none;user-select:none;-webkit-user-select:none;border-radius:4px}
.chSq{position:absolute;left:0;top:0;border-radius:4px}
.chL{position:absolute;inset:0;pointer-events:none}
.chH,.chDot,.chCap,.chHov,.chMate{position:absolute;left:0;top:0;pointer-events:none}
.chP{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;transition:transform .2s cubic-bezier(.3,.7,.3,1),opacity .22s;z-index:1}
.chP.chFly{z-index:3}
.chP.chDrag{transition:none;z-index:5;filter:drop-shadow(0 8px 6px rgba(0,0,0,.35))}
.chP.chGone{opacity:0}
.chP.chNo{animation:chNo .28s}
@keyframes chNo{0%,100%{margin-left:0}25%{margin-left:-3px}75%{margin-left:3px}}
.chP.chPop{animation:chPop .35s}
@keyframes chPop{0%{scale:1.35}100%{scale:1}}
.chDot::after{content:'';position:absolute;left:34%;top:34%;width:32%;height:32%;border-radius:50%;background:rgba(0,0,0,.16)}
.chCap::after{content:'';position:absolute;inset:2%;border-radius:50%;box-shadow:inset 0 0 0 calc(.6vmin + 3px) rgba(0,0,0,.16)}
.chHov{box-shadow:inset 0 0 0 3px rgba(255,255,255,.8);z-index:4}
.chMate i{position:absolute;right:-4%;top:-4%;width:36%;height:36%;border-radius:50%;background:#d23a2a;color:#fff;font-style:normal;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,.5);z-index:6}
.chPro{position:absolute;z-index:8;background:#fff;border-radius:4px;box-shadow:0 4px 18px rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;overflow:hidden}
.chPro img{display:block}.chPro img:active{background:#ffe38a}
.chProX{width:100%;height:22px;display:flex;align-items:center;justify-content:center;background:#eee;color:#666;font-weight:800;font-size:13px}
.chBar{display:flex;align-items:center;gap:8px;height:44px;padding:0 2px}
.chAv{width:36px;height:36px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 2px 6px rgba(0,0,0,.4);flex:none;background:linear-gradient(#fff3da,#d9b07a);color:#4b2d12}
.chAv.dk{background:linear-gradient(#6b3a1c,#2a130a);color:#f0d8b0}
.chNm{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}
.chNm b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d8d3c6}.chNm small{font-weight:600;color:#a8a294;font-size:12px}
.chBar.on .chNm b{color:#fff}
.chTk{display:flex;align-items:center;height:19px}.chTk img{width:18px;height:18px;margin-right:-7px}.chTk em{font-style:normal;font-size:12px;color:#b8b2a2;margin-left:10px;font-weight:700}
.chClk{min-width:86px;text-align:right;padding:7px 10px;border-radius:6px;background:#2b2926;color:#8f8a80;font:700 22px/1 ui-monospace,Menlo,Consolas,monospace;flex:none}
.chClk.on{background:#f4f1e8;color:#1c1a17}.chClk.low.on{background:#e04a3a;color:#fff}.chClk.low{color:#e8705f}
.chMv{display:flex;gap:3px;overflow-x:auto;white-space:nowrap;height:30px;align-items:center;font-size:14px;scrollbar-width:none;padding:0 2px}
.chMv::-webkit-scrollbar{display:none}.chMn{color:#8f8a80;margin-left:7px}.chMs{color:#ddd;padding:2px 5px;border-radius:4px;font-weight:600}.chMs.on{background:#4a4740;color:#fff}
.chBtns{display:flex;gap:8px;justify-content:center;height:44px}
.chBtns button{flex:1;max-width:150px;border-radius:10px;border:none;background:#3a3732;color:#eee;font-weight:700;font-size:14px;box-shadow:0 2px 0 #1f1d1a}
.chBtns button:active{transform:translateY(1px)}`;
    document.head.appendChild(css);
  }
  return { E, art, artUrl, board, screen, snd, THEMES, fmt, idxOf, CADENZE, newClock, colorOf, seatOf, left, apply, flag, finish, LEVELS, aiOpts, think, cancelThink };
})();
