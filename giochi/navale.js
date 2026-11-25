// BATTAGLIA NAVALE al tavolino del te' (sessione "Minigioco Battaglia navale", decisioni in CLAUDE.md "BATTAGLIA NAVALE: DECISIONI").
// Motore NVE fra i marcatori (in node: require('giochi/navale.js') = motore). Schermo window.NV: da solo contro il computer.
// Regole: griglia 10x10, a turno O spari O muovi una nave; flotta con i ruoli (fregata = razzi a croce, sottomarino = siluri,
// intercettore = abbatte i razzi vicini, motovedette veloci). Il computer NON bara: usa solo quello che vede lui (la sua griglia dei colpi).
// ==NV ENGINE==
const NVE = (() => {
  const N = 10;
  const TYPES = {
    F: { n: 4, name: 'Fregata', role: 'lancia i razzi' },
    S: { n: 3, name: 'Sottomarino', role: 'lancia i siluri' },
    I: { n: 3, name: 'Intercettore', role: 'abbatte i razzi vicini' },
    M: { n: 2, name: 'Motovedetta', role: 'veloce' },
  };
  const FLEET = ['F', 'S', 'I', 'M', 'M'];
  const AMMO = { r: 2, s: 2 };
  const FUEL = 1;   // carburante: spostamenti per nave in tutta la partita (senza, la nave colpita scappa all'infinito)
  const MAXT = 300;   // turni massimi (sicurezza): poi vince chi ha piu' caselle intere
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const cells = s => { const o = []; for (let i = 0; i < s.n; i++) o.push(s.v ? [s.x, s.y + i] : [s.x + i, s.y]); return o; };
  const mk = (t, x, y, v, f) => ({ t, n: TYPES[t].n, x, y, v: !!v, f: f || (v ? -1 : 1), h: Array(TYPES[t].n).fill(0), sunk: false, fu: FUEL });
  function occ(ships, skip) { const o = new Int8Array(N * N).fill(-1); ships.forEach((s, k) => { if (k === skip || s.x < 0) return; for (const [x, y] of cells(s)) if (inb(x, y)) o[y * N + x] = k; }); return o; }
  function fits(ships, s, skip) { const c = cells(s); if (!c.every(([x, y]) => inb(x, y))) return false; const o = occ(ships, skip); return c.every(([x, y]) => o[y * N + x] < 0); }
  function randomFleet(rnd = Math.random) {
    for (;;) {
      const sh = []; let ok = true;
      for (const t of FLEET) {
        let k = 0, s;
        do { const v = rnd() < 0.5; s = mk(t, Math.floor(rnd() * N), Math.floor(rnd() * N), v, rnd() < 0.5 ? 1 : -1); } while (!fits(sh, s) && ++k < 300);
        if (k >= 300) { ok = false; break; } sh.push(s);
      }
      if (ok) return sh;
    }
  }
  const cloneFleet = f => f.map(s => mk(s.t, s.x, s.y, s.v, s.f));
  const validFleet = f => f.length === FLEET.length && f.every((s, k) => s.t === FLEET[k] && fits(f.slice(0, k), s));

  function newGame(o = {}) {
    const rnd = o.rnd || Math.random;
    const P = [0, 1].map(i => ({
      ships: o.fleets && o.fleets[i] ? cloneFleet(o.fleets[i]) : randomFleet(rnd),
      am: { r: AMMO.r, s: AMMO.s },
      V: new Uint8Array(N * N),    // quello che vedo del mare dell'altro: 0 ignoto, 1 acqua, 2 colpito, 3 colpito vecchio (la nave e' scappata), 4 affondato
      Vt: new Int16Array(N * N),   // turno in cui ho segnato la casella
      lastMove: -99, mvT: [],       // turni in cui ho mosso (lo sa anche l'altro: glielo si dice)
      mem: { esc: [], zones: [] },  // memoria del computer: navi scappate e zone dell'intercettore
      st: { sh: 0, hit: 0, r: 0, s: 0, mv: 0 },
    }));
    return { N, rnd, lv: o.lv || 2, tn: 0, turn: o.first != null ? o.first : (rnd() < 0.5 ? 0 : 1), over: false, win: -1, ev: [], P };
  }
  const push = (G, e) => G.ev.push(e);
  const afloat = s => !s.sunk;
  const hasT = (P, t) => P.ships.some(s => s.t === t && afloat(s));
  const canRocket = (G, i) => G.P[i].am.r > 0 && hasT(G.P[i], 'F');
  const canTorp = (G, i) => G.P[i].am.s > 0 && hasT(G.P[i], 'S');
  function shipAt(P, x, y) { for (let k = 0; k < P.ships.length; k++) { const s = P.ships[k]; if (s.sunk) continue; const c = cells(s); for (let q = 0; q < c.length; q++) if (c[q][0] === x && c[q][1] === y) return [k, q]; } return null; }
  const cross = (x, y) => [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => inb(a, b));
  // siluro: d 0 da sinistra, 1 da destra, 2 dall'alto, 3 dal basso; l = riga (0-1) o colonna (2-3)
  function lane(d, l) { const o = []; for (let k = 0; k < N; k++) { const j = d === 1 || d === 3 ? N - 1 - k : k; o.push(d < 2 ? [j, l] : [l, j]); } return o; }
  // il siluro parte dal bordo piu' vicino alla casella toccata (a parita' da sinistra/destra)
  function torpFrom(x, y) { const ds = [x, N - 1 - x, y, N - 1 - y]; let d = 0; for (let k = 1; k < 4; k++) if (ds[k] < ds[d]) d = k; return { d, l: d < 2 ? y : x }; }
  function nearInt(P, x, y) { for (const s of P.ships) if (s.t === 'I' && afloat(s)) for (const [a, b] of cells(s)) if (Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1) return true; return false; }

  function hitCell(G, i, x, y, via) {
    const A = G.P[i], D = G.P[1 - i], id = y * N + x;
    if (A.V[id] === 4) return 'wreck';
    A.st.sh++;
    const f = shipAt(D, x, y);
    if (!f) { A.V[id] = 1; A.Vt[id] = G.tn; push(G, { t: 'res', p: i, x, y, r: 'miss', via }); return 'miss'; }
    const [k, q] = f, s = D.ships[k], fresh = !s.h[q]; s.h[q] = 1; if (fresh) A.st.hit++;
    A.V[id] = 2; A.Vt[id] = G.tn;
    if (s.h.every(Boolean)) {
      s.sunk = true; const ids = cells(s).map(([a, b]) => b * N + a); for (const c of ids) { A.V[c] = 4; A.Vt[c] = G.tn; }
      push(G, { t: 'res', p: i, x, y, r: 'sunk', via, k, q, ship: { t: s.t, n: s.n, x: s.x, y: s.y, v: s.v, f: s.f }, ids });
      if (D.ships.every(z => z.sunk)) { G.over = true; G.win = i; }
      return 'sunk';
    }
    push(G, { t: 'res', p: i, x, y, r: 'hit', via, k, q });
    return 'hit';
  }
  // dopo una mossa: i "colpito" dell'altro che non hanno piu' sotto un pezzo danneggiato diventano vecchi (grigi)
  function refade(G, j) {
    const A = G.P[1 - j], D = G.P[j], dmg = new Uint8Array(N * N), out = [];
    for (const s of D.ships) if (!s.sunk) cells(s).forEach(([x, y], q) => { if (s.h[q]) dmg[y * N + x] = 1; });
    for (let id = 0; id < N * N; id++) if (A.V[id] === 2 && !dmg[id]) { A.V[id] = 3; out.push(id); }
    return out;
  }
  function movesOf(G, i, k) {
    const P = G.P[i], s = P.ships[k]; if (!s || s.sunk || s.fu <= 0) return [];
    const sp = s.h.some(Boolean) ? 1 : s.t === 'M' ? 3 : 2, out = [];
    const ax = s.v ? [0, 1] : [1, 0], lat = s.v ? [1, 0] : [0, 1];
    for (const sg of [1, -1]) for (let d = 1; d <= sp; d++) { const t = Object.assign({}, s, { x: s.x + ax[0] * sg * d, y: s.y + ax[1] * sg * d }); if (!fits(P.ships, t, k)) break; out.push({ x: t.x, y: t.y, d: sg, ax: 1 }); }
    for (const sg of [1, -1]) { const t = Object.assign({}, s, { x: s.x + lat[0] * sg, y: s.y + lat[1] * sg }); if (fits(P.ships, t, k)) out.push({ x: t.x, y: t.y, d: sg, ax: 0 }); }
    return out;
  }
  function legal(G, i, a) {
    if (!a || G.over || G.turn !== i) return false;
    const V = G.P[i].V;
    if (a.k === 'shot') return inb(a.x, a.y) && V[a.y * N + a.x] !== 2 && V[a.y * N + a.x] !== 4;
    if (a.k === 'rocket') return inb(a.x, a.y) && canRocket(G, i);
    if (a.k === 'torp') return a.d >= 0 && a.d < 4 && a.l >= 0 && a.l < N && canTorp(G, i);
    if (a.k === 'move') return movesOf(G, i, a.s).some(m => m.x === a.x && m.y === a.y);
    return false;
  }
  function act(G, i, a) {
    if (!legal(G, i, a)) return false;
    const A = G.P[i], D = G.P[1 - i];
    if (a.k === 'shot') { push(G, { t: 'fire', p: i, k: 'shot', x: a.x, y: a.y }); hitCell(G, i, a.x, a.y, 'shot'); }
    else if (a.k === 'rocket') {
      A.am.r--; A.st.r++;
      push(G, { t: 'fire', p: i, k: 'rocket', x: a.x, y: a.y });
      if (nearInt(D, a.x, a.y)) { push(G, { t: 'icpt', p: i, x: a.x, y: a.y }); A.mem.zones.push({ x: a.x, y: a.y, tn: G.tn }); }
      else for (const [x, y] of cross(a.x, a.y)) { const m = A.V[y * N + x]; if (m !== 2 && m !== 4 && !G.over) hitCell(G, i, x, y, 'rocket'); }
    } else if (a.k === 'torp') {
      A.am.s--; A.st.s++;
      const path = lane(a.d, a.l); let end = -1;
      for (let k = 0; k < N; k++) if (shipAt(D, path[k][0], path[k][1])) { end = k; break; }
      const ids = path.map(([x, y]) => y * N + x);
      push(G, { t: 'fire', p: i, k: 'torp', d: a.d, l: a.l, ids, end });
      const miss = (end < 0 ? ids : ids.slice(0, end)).filter(id => A.V[id] !== 4);
      for (const id of miss) { A.V[id] = 1; A.Vt[id] = G.tn; }
      push(G, { t: 'lane', p: i, ids: miss });
      if (end >= 0) hitCell(G, i, path[end][0], path[end][1], 'torp');
    } else if (a.k === 'move') {
      const s = A.ships[a.s], m = movesOf(G, i, a.s).find(z => z.x === a.x && z.y === a.y), fx = s.x, fy = s.y, ff = s.f;
      s.x = a.x; s.y = a.y; s.fu--;   // la prua resta dov'era (in retromarcia la nave non si gira)
      A.lastMove = G.tn; A.mvT.push(G.tn); A.st.mv++;
      push(G, { t: 'move', p: i, s: a.s, fx, fy, ff, x: s.x, y: s.y, f: s.f, fu: s.fu });
      const ids = refade(G, i);
      if (ids.length) { D.mem.esc.push({ ids, tn: G.tn }); }
      push(G, { t: 'fade', p: 1 - i, ids });
    }
    G.tn++;
    if (!G.over && G.tn >= MAXT) {
      const left = P => P.ships.reduce((n, s) => n + s.h.filter(h => !h).length * (s.sunk ? 0 : 1), 0), a0 = left(G.P[0]), a1 = left(G.P[1]);
      G.over = true; G.win = a0 > a1 ? 0 : a1 > a0 ? 1 : -2;
    }
    if (G.over) push(G, { t: 'over', win: G.win });
    else { G.turn = 1 - i; push(G, { t: 'turn', p: G.turn }); }
    return true;
  }

  // ---- il computer: mappa delle probabilita' fatta solo con quello che vede ----
  function probs(G, i) {
    const A = G.P[i], D = G.P[1 - i], V = A.V, mvT = D.mvT;
    const stale = id => { let k = 0; for (let j = mvT.length - 1; j >= 0 && mvT[j] >= A.Vt[id]; j--) k++; return k; };   // mosse nemiche dopo che ho visto acqua li'
    const H = new Float64Array(N * N), near = new Float64Array(N * N);
    const left = D.ships.filter(afloat).map(s => s.n);   // le navi affondate si vedono: si sa quali restano
    for (const e of A.mem.esc) { const age = G.tn - e.tn; if (age > 10) continue; const wgt = age <= 4 ? 1 : 0.5; for (const id of e.ids) { const ex = id % N, ey = (id / N) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (!inb(ex + dx, ey + dy)) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); near[(ey + dy) * N + ex + dx] = Math.max(near[(ey + dy) * N + ex + dx], wgt * (d <= 1 ? 1 : 0.35)); } } }
    for (const L of left) for (let v = 0; v < 2; v++) for (let y = 0; y < (v ? N - L + 1 : N); y++) for (let x = 0; x < (v ? N : N - L + 1); x++) {
      let w = 1, hits = 0, nr = 0;
      for (let q = 0; q < L; q++) {
        const id = (v ? y + q : y) * N + (v ? x : x + q), m = V[id];
        if (m === 4) { w = 0; break; }
        if (m === 1) { const k = stale(id); if (k) w *= near[id] ? 0.8 * near[id] : Math.min(0.35, 0.07 * k); else { w = 0; break; } }   // la nave colpita scappa di 1 sola casella: l'acqua li' vicino non e' piu' sicura
        else if (m === 2) hits++;
        nr += near[id];
      }
      if (!w) continue;
      if (hits) w *= 1 + 30 * hits * hits;
      if (nr) w *= 1 + nr * 4;
      for (let q = 0; q < L; q++) { const id = (v ? y + q : y) * N + (v ? x : x + q); if (V[id] !== 2) H[id] += w; }
    }
    let tot = 0; for (let id = 0; id < N * N; id++) tot += H[id];
    let R = left.reduce((a, b) => a + b, 0); for (let id = 0; id < N * N; id++) if (V[id] === 2) R--;
    const p = new Float64Array(N * N);
    for (let id = 0; id < N * N; id++) p[id] = tot > 0 ? Math.min(0.97, H[id] / tot * Math.max(1, R)) : (V[id] === 2 || V[id] === 4 ? 0 : 0.1);
    return p;
  }
  const LV = { 1: { mv: 0, sp: 0.2, noise: 0.9, rand: 0.3 }, 2: { mv: 0.4, sp: 0.6, noise: 0.25, rand: 0.04 }, 3: { mv: 0.7, sp: 1, noise: 0.05, rand: 0 } };
  function bot(G, i) {
    const A = G.P[i], D = G.P[1 - i], lv = LV[G.lv] || LV[2], rnd = G.rnd;
    const hunting = A.V.some(m => m === 2);
    // difesa: una mia nave colpita (e l'altro lo sa) scappa
    if (lv.mv) {
      const dam = []; A.ships.forEach((s, k) => { if (!s.sunk && cells(s).some(([x, y], q) => s.h[q] && D.V[y * N + x] === 2)) dam.push(k); });
      if (dam.length && rnd() < lv.mv && !(hunting && rnd() < (G.lv === 3 ? 0.45 : 0.3))) {
        const k = dam[Math.floor(rnd() * dam.length)], ms = movesOf(G, i, k), s = A.ships[k];
        if (ms.length) {
          let best = null, bs = -1e9;
          for (const m of ms) {
            const t = Object.assign({}, s, { x: m.x, y: m.y }); let sc = 0;
            for (const [x, y] of cells(t)) { const dm = D.V[y * N + x]; sc += dm === 1 ? 2.2 : dm === 0 ? 1 : dm === 3 ? 1.4 : 0; }
            sc += (Math.abs(m.x - s.x) + Math.abs(m.y - s.y)) * 0.6 + rnd() * 0.8;
            if (sc > bs) { bs = sc; best = m; }
          }
          return { k: 'move', s: k, x: best.x, y: best.y };
        }
      }
    }
    const p = probs(G, i), ok = id => A.V[id] !== 2 && A.V[id] !== 4;
    let bi = -1, bv = -1;
    if (rnd() < lv.rand) { const c = []; for (let id = 0; id < N * N; id++) if (ok(id)) c.push(id); bi = c[Math.floor(rnd() * c.length)]; bv = p[bi]; }
    else for (let id = 0; id < N * N; id++) { if (!ok(id)) continue; const v = p[id] * (1 - lv.noise + lv.noise * 2 * rnd()); if (v > bv) { bv = v; bi = id; } }
    const pBest = p[bi];
    // armi speciali quando rendono di piu' del colpo singolo (e non mentre si finisce una nave gia' trovata)
    if (!hunting && rnd() < lv.sp) {
      const enemyLeft = D.ships.filter(afloat).length, gain = enemyLeft <= 2 ? 0.08 : G.lv === 3 ? 0.2 : 0.28;
      let best = null, bg = gain;
      if (canRocket(G, i)) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (A.mem.zones.some(z => G.tn - z.tn < 12 && Math.abs(z.x - x) <= 2 && Math.abs(z.y - y) <= 2)) continue;
        let miss = 1; for (const [a, b] of cross(x, y)) { const id = b * N + a; if (ok(id)) miss *= 1 - p[id]; }
        const g = 1 - miss - pBest; if (g > bg) { bg = g; best = { k: 'rocket', x, y }; }
      }
      if (canTorp(G, i)) for (let d = 0; d < 4; d++) for (let l = 0; l < N; l++) {
        let miss = 1; for (const [a, b] of lane(d, l)) { const id = b * N + a; if (A.V[id] !== 4 && A.V[id] !== 2) miss *= 1 - p[id]; }
        const g = (1 - miss) * 0.92 - pBest; if (g > bg) { bg = g; best = { k: 'torp', d, l }; }
      }
      if (best) return best;
    }
    return { k: 'shot', x: bi % N, y: (bi / N) | 0 };
  }
  return { N, TYPES, FLEET, AMMO, FUEL, MAXT, inb, cells, mk, fits, randomFleet, cloneFleet, validFleet, newGame, act, legal, movesOf, canRocket, canTorp, cross, lane, torpFrom, bot, probs, shipAt };
})();
// ==END NV ENGINE==
if (typeof module !== 'undefined' && module.exports) module.exports = NVE;

// ======== SCHERMO: NV.start({ name, look, onExit }) ========
// Un solo canvas per i due mari (grande = quello su cui si gioca, piccolo = l'altro) + pulsanti DOM sotto, mai sovrapposti.
// Si disegna solo quando cambia qualcosa (o mentre corre un'animazione).
if (typeof window !== 'undefined') (() => {
  const E = NVE, N = E.N, T = E.TYPES;
  const W = 390, H0 = 744;
  const FOES = {
    1: { n: 'Mozzo Gigi', say: { hit: ['Preso! Evvai!', 'Ho beccato qualcosa!'], miss: ['Uffa, acqua.', 'Splash...'], sunk: ['Glu glu glu!'], hurt: ['Ahia!', 'La mia barchetta!'], gone: ['Nooo, la mia nave!'], move: ['Scappa, scappa!'], win: ['Ho vinto io? Davvero?'], lose: ['Mi arrendo, capo.'] } },
    2: { n: 'Capitan Lola', say: { hit: ['Centro, tesoro.', 'Trovata.'], miss: ['Acqua. Per ora.'], sunk: ['Una in meno.'], hurt: ['Mi hai graffiato.', 'Fortuna.'], gone: ['Uffa, era la mia preferita.'], move: ['Prendimi, se ci riesci.'], win: ['Grazie della crociera.'], lose: ['Ben giocato, ammiraglio.'] } },
    3: { n: 'Ammiraglio Conte', say: { hit: ['Come previsto.', 'Bersaglio confermato.'], miss: ['Una sonda, nulla di piu\'.'], sunk: ['Affondata, con eleganza.'], hurt: ['Ohibo\'.', 'Un graffio sullo scafo.'], gone: ['Un sacrificio calcolato.'], move: ['Manovra evasiva.'], win: ['L\'Ammiraglio ringrazia.'], lose: ['Mi inchino, capitano.'] } },
  };
  const OPT = { lv: [['1', 'Principiante'], ['2', 'Medio'], ['3', 'Esperto']] };
  const DEF = { lv: '2' };
  let LS = null;
  const st = () => (typeof store !== 'undefined' && store.settings) ? store.settings : (LS || (LS = (() => { try { return JSON.parse(localStorage.getItem('nvS') || '{}'); } catch (e) { return {}; } })()));
  const save = () => { if (typeof store !== 'undefined' && store.settings && typeof saveStore === 'function') saveStore(); else try { localStorage.setItem('nvS', JSON.stringify(st())); } catch (e) { } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const FAST = () => !!window.__NVFAST;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const LET = 'ABCDEFGHIJ';

  // ---- suoni fatti al volo (rispettano l'audio dell'hotel) ----
  const AU = {};
  const sndOn = () => typeof store === 'undefined' || !store.settings || store.settings.sound !== false;
  function ac() {
    if (!sndOn() || FAST()) return null;
    try {
      if (!AU.c) { AU.c = new (window.AudioContext || window.webkitAudioContext)(); AU.m = AU.c.createGain(); AU.m.gain.value = 0.9; AU.m.connect(AU.c.destination); }
      if (AU.c.state === 'suspended') AU.c.resume(); return AU.c;
    } catch (e) { return null; }
  }
  function nbuf(c) { if (!AU.nb) { const n = Math.floor(c.sampleRate * 2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; AU.nb = b; } return AU.nb; }
  function nz(o) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (o.at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = nbuf(c); s.loop = true; f.type = o.ty || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1 || o.f0), t + o.d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.v, t + (o.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    s.connect(f); f.connect(g); g.connect(AU.m); s.start(t, Math.random()); s.stop(t + o.d + 0.05);
  }
  function tn(o) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (o.at || 0), s = c.createOscillator(), g = c.createGain();
    s.type = o.ty || 'sine'; s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + o.d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.v, t + (o.a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    s.connect(g); g.connect(AU.m); s.start(t); s.stop(t + o.d + 0.05);
  }
  const sfx = {
    tap: () => tn({ f0: 1100, d: 0.05, v: 0.07, ty: 'triangle' }),
    no: () => tn({ f0: 190, d: 0.12, v: 0.08, ty: 'square' }),
    turn: () => { tn({ f0: 660, d: 0.09, v: 0.06, ty: 'triangle' }); tn({ f0: 990, d: 0.14, v: 0.06, ty: 'triangle', at: 0.08 }); },
    gun: () => { nz({ f0: 2400, f1: 200, d: 0.35, v: 0.45 }); tn({ f0: 140, f1: 45, d: 0.3, v: 0.4 }); },
    whist: () => tn({ f0: 1700, f1: 650, d: 0.4, v: 0.035 }),
    splash: () => { nz({ f0: 3200, f1: 700, d: 0.55, v: 0.35, ty: 'bandpass', q: 0.6, a: 0.02 }); nz({ f0: 900, f1: 300, d: 0.3, v: 0.18, at: 0.05 }); },
    boom: big => { nz({ f0: 1500, f1: 60, d: big ? 1.3 : 0.8, v: big ? 0.85 : 0.65, a: 0.005 }); tn({ f0: 110, f1: 32, d: big ? 1 : 0.6, v: 0.55 }); },
    rocket: () => nz({ f0: 500, f1: 2600, d: 0.85, v: 0.3, ty: 'bandpass', q: 1.5, a: 0.08 }),
    torp: () => { tn({ f0: 1300, f1: 1250, d: 0.5, v: 0.08 }); nz({ f0: 420, f1: 240, d: 1.1, v: 0.22, at: 0.05, a: 0.12 }); },
    icpt: () => { tn({ f0: 2300, f1: 900, d: 0.22, v: 0.05, ty: 'square' }); nz({ f0: 2600, f1: 200, d: 0.6, v: 0.45, at: 0.18 }); },
    move: () => { tn({ f0: 55, f1: 78, d: 0.75, v: 0.2, ty: 'sawtooth', a: 0.12 }); nz({ f0: 700, f1: 380, d: 0.75, v: 0.13, ty: 'bandpass', a: 0.15 }); },
    sink: () => { tn({ f0: 220, f1: 50, d: 1.4, v: 0.15, ty: 'triangle' }); for (let i = 0; i < 6; i++) tn({ f0: 300 + Math.random() * 500, f1: 700 + Math.random() * 400, d: 0.08, v: 0.05, at: 0.3 + i * 0.13 }); },
    horn: () => { tn({ f0: 98, d: 0.9, v: 0.16, ty: 'sawtooth', a: 0.06 }); tn({ f0: 147, d: 0.9, v: 0.08, ty: 'sawtooth', a: 0.06 }); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tn({ f0: f, d: i === 3 ? 0.5 : 0.16, v: 0.12, ty: 'triangle', at: i * 0.12 })),
    lose: () => [392, 370, 349, 262].forEach((f, i) => tn({ f0: f, d: i === 3 ? 0.6 : 0.2, v: 0.11, ty: 'triangle', at: i * 0.17 })),
  };

  const css = document.createElement('style');
  css.textContent = `
#nvT{position:fixed;inset:0;z-index:120;overflow:hidden;background:radial-gradient(130% 90% at 50% 0%,#14406a,#081d33 58%,#040c17);color:#fff;font-family:system-ui,"Segoe UI",Roboto,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
#nvT *{box-sizing:border-box}
#nvW{position:absolute;left:0;right:0;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom)}
#nvS{position:absolute;left:0;top:0;width:${W}px;transform-origin:0 0}
#nvC{position:absolute;left:0;top:0;touch-action:none}
.nvA{position:absolute}
#nvTop{left:10px;right:10px;top:8px;height:42px;display:flex;align-items:center;gap:8px}
#nvTop button{flex:none;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:11px;padding:8px 12px;font:700 14px system-ui,sans-serif}
#nvTop .info{flex:1;min-width:0;text-align:center;font:600 12.5px/1.3 system-ui,sans-serif;color:#a9c6df}
#nvTop .info b{display:block;font:800 15px/1.25 system-ui,sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nvTop .info b small{font-weight:600;color:#a9c6df}
#nvTop .info span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nvTop .info.me span{color:#ffe27a;font-weight:800}
#nvTop .info.say span{color:#fff;font-style:italic}
#nvHint{left:14px;right:14px;height:36px;display:flex;align-items:center;justify-content:center;text-align:center;font:700 13.5px/1.3 system-ui,sans-serif;color:#ffe27a;text-shadow:0 1px 4px rgba(0,0,0,.6)}
#nvHint.w{color:#a9c6df}
#nvTools{left:14px;right:14px;height:54px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#nvTools.two{grid-template-columns:1fr 1fr}
#nvTools button{position:relative;border:1.5px solid rgba(255,255,255,.16);border-radius:13px;background:linear-gradient(#1d3d5c,#132b44);color:#fff;padding:5px 2px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:800 13px/1.1 system-ui,sans-serif;transition:transform .12s,border-color .15s,background .15s}
#nvTools button svg{width:22px;height:22px;flex:none}
#nvTools button small{font:600 10.5px/1.1 system-ui,sans-serif;color:#a9c6df;white-space:nowrap}
#nvTools button.on{border-color:#ffe27a;background:linear-gradient(#3c5a2a,#26401b);box-shadow:0 0 0 2px rgba(255,226,122,.25),0 0 14px rgba(255,214,90,.35)}
#nvTools button.on small{color:#ffe27a}
#nvTools button.off{opacity:.38}
#nvTools button:active{transform:scale(.96)}
#nvTools.two button{flex-direction:row;gap:8px;font-size:15px}
#nvFire{left:14px;right:14px;height:48px;border:0;border-radius:14px;font:900 18px system-ui,sans-serif;letter-spacing:.3px;color:#fff;background:linear-gradient(#ec5a3c,#c0381f);box-shadow:0 3px 0 #7c1f10,0 6px 18px rgba(236,90,60,.3);transition:filter .15s,opacity .15s,transform .1s}
#nvFire.go{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231,0 6px 18px rgba(54,160,98,.3)}
#nvFire.mv{background:linear-gradient(#3b8be0,#2563b8);box-shadow:0 3px 0 #163d73,0 6px 18px rgba(59,139,224,.3)}
#nvFire:disabled{filter:grayscale(1) brightness(.6);opacity:.55;box-shadow:none}
#nvFire:active:not(:disabled){transform:translateY(2px)}
#nvStamp{left:50%;z-index:70;transform:translate(-50%,-50%);text-align:center;pointer-events:none;white-space:nowrap}
#nvStamp div{font:900 44px/1 system-ui,sans-serif;letter-spacing:1px;-webkit-text-stroke:2px #0b1a2a;paint-order:stroke fill;text-shadow:0 5px 0 #0b1a2a,0 10px 26px rgba(0,0,0,.7);opacity:0}
#nvStamp small{display:block;font:800 15px system-ui,sans-serif;margin-top:9px;color:#fff;text-shadow:0 2px 6px #000,0 0 3px #000;opacity:0}
#nvStamp.go div{animation:nvPop 1.5s cubic-bezier(.2,.9,.3,1.25) forwards}
#nvStamp.go small{animation:nvFade 1.5s forwards}
#nvStamp.b div{color:#ff5a4a}#nvStamp.g div{color:#7dff9a}#nvStamp.h div{color:#ffe27a}#nvStamp.c div{color:#7fd8ff}
@keyframes nvPop{0%{opacity:0;transform:scale(2.4) rotate(-12deg)}14%{opacity:1;transform:scale(.92) rotate(-5deg)}22%{transform:scale(1.06) rotate(-6deg)}30%,80%{opacity:1;transform:scale(1) rotate(-6deg)}100%{opacity:0;transform:scale(1.08) rotate(-6deg)}}
@keyframes nvFade{0%,12%{opacity:0}24%,80%{opacity:1}100%{opacity:0}}
#nvT.nvFast #nvStamp div,#nvT.nvFast #nvStamp small{animation-duration:.6s}
.nvOv{position:absolute;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(2,8,16,.6);padding:12px;touch-action:auto}
.nvBox{background:linear-gradient(#173352,#0d2038);color:#fff;border:2px solid #2f5a85;border-radius:18px;padding:18px 16px 16px;max-width:380px;width:100%;box-shadow:0 14px 44px rgba(0,0,0,.6);max-height:calc(100% - 20px);overflow:auto}
.nvBox h2{margin:0 0 4px;font:900 24px system-ui,sans-serif;text-align:center;color:#ffe27a}
.nvBox p{margin:4px 0 10px;font:500 14px/1.4 system-ui,sans-serif;text-align:center;opacity:.88}
.nvBox button.big{display:block;width:100%;margin-top:10px;border:0;border-radius:13px;padding:13px;font:800 17px system-ui,sans-serif;background:#244a70;color:#fff}
.nvBox button.big.pr{background:linear-gradient(#36a062,#237a47);box-shadow:0 3px 0 #155231}
.nvRu p{text-align:left!important;margin:7px 0!important}
.nvRu b{color:#ffe27a}
.nvD{margin:7px 0;border:2px solid #2f5a85;border-radius:11px;background:rgba(0,0,0,.18);overflow:hidden}
.nvD[open]{border-color:#7fb4e6}
.nvD summary{list-style:none;display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;font-size:14px}
.nvD summary::-webkit-details-marker{display:none}
.nvD summary span{color:#9cc0e0;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.05em;flex:none}
.nvD summary b{flex:1;text-align:right;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nvD summary::after{content:'\\25BE';color:#9cc0e0;font-size:14px;transition:transform .2s}.nvD[open] summary::after{transform:rotate(180deg)}
.nvD .opts{display:flex;flex-wrap:wrap;gap:5px;margin:0 10px 10px}
.nvD .opts button{padding:7px 10px;border-radius:9px;border:2px solid #2f5a85;background:#1b3a5a;color:#fff;font:700 13px system-ui,sans-serif}
.nvD .opts button.on{border-color:#ffe27a;background:#2f7a4a}
.nvRows{margin:8px 0 2px;border-radius:12px;overflow:hidden;border:1px solid #2f5a85}
.nvRows div{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;font:600 14px system-ui,sans-serif;background:rgba(255,255,255,.03)}
.nvRows div:nth-child(2n){background:rgba(255,255,255,.07)}
.nvRows div b{color:#ffe27a}
.nvNote{font:500 12px/1.4 system-ui,sans-serif;opacity:.75;margin:4px 2px 0;text-align:left}
`;
  document.head.appendChild(css);

  const ICON = {
    shot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.5c3 2.4 4.2 5.6 4.2 9.3V16H7.8v-4.2c0-3.7 1.2-6.9 4.2-9.3z"/><path d="M7.8 12.5 5 15.5V18l2.8-1.4M16.2 12.5l2.8 3V18l-2.8-1.4"/><path d="M10.5 19.2 12 22l1.5-2.8"/><circle cx="12" cy="9" r="1.4" fill="currentColor"/></svg>',
    torp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9.5h11.5a2.5 2.5 0 0 1 0 5H5z"/><path d="M5 9.5 3 7.5v9l2-2"/><circle cx="20.8" cy="6" r="1" fill="currentColor"/><circle cx="17.8" cy="4.6" r=".8" fill="currentColor"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  };

  let U = null;
  const spd = () => FAST() ? 1000 : U && U.skip ? 2.6 : 1;
  const wait = ms => new Promise(r => setTimeout(r, FAST() ? 0 : ms / spd()));
  const dprOf = () => Math.min(3, window.devicePixelRatio || 1);
  function overlay(html) { const d = document.createElement('div'); d.className = 'nvOv'; d.innerHTML = html; U.root.appendChild(d); return d; }

  // ---- disegni: mare, navi, segni ----
  const HULL = { F: ['#c3ccd5', '#9aa6b2', '#717d89', '#47515c'], S: ['#55606e', '#39424e', '#262d36', '#12161b'], I: ['#a8b39b', '#87937b', '#68735d', '#40483a'], M: ['#ffffff', '#e1e5e8', '#b9c0c6', '#7a838b'] };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function hullPath(g, t, L, w) {
    g.beginPath();
    if (t === 'S') {
      g.moveTo(-L / 2 + w / 2, -w / 2); g.lineTo(L / 2 - w * 0.9, -w / 2); g.quadraticCurveTo(L / 2, -w / 2, L / 2, 0); g.quadraticCurveTo(L / 2, w / 2, L / 2 - w * 0.9, w / 2); g.lineTo(-L / 2 + w / 2, w / 2); g.arc(-L / 2 + w / 2, 0, w / 2, Math.PI / 2, Math.PI * 1.5); g.closePath();
    } else {
      const b = Math.min(L * 0.3, w * 1.5);
      g.moveTo(-L / 2, -w * 0.38); g.quadraticCurveTo(-L / 2, -w / 2, -L / 2 + w * 0.22, -w / 2); g.lineTo(L / 2 - b, -w / 2); g.quadraticCurveTo(L / 2 - b * 0.2, -w / 2, L / 2, 0);
      g.quadraticCurveTo(L / 2 - b * 0.2, w / 2, L / 2 - b, w / 2); g.lineTo(-L / 2 + w * 0.22, w / 2); g.quadraticCurveTo(-L / 2, w / 2, -L / 2, w * 0.38); g.closePath();
    }
  }
  // s: { t, n, v, f, h, sunk } ; px,py = angolo in alto a sinistra della prima casella; c = lato casella
  function drawShip(g, s, px, py, c, o = {}) {
    const n = s.n, L = n * c - c * 0.14, w = c * (s.t === 'M' ? 0.5 : s.t === 'S' ? 0.5 : 0.64);
    const cx = px + (s.v ? c / 2 : n * c / 2), cy = py + (s.v ? n * c / 2 : c / 2);
    g.save(); g.translate(cx, cy); g.rotate((s.v ? Math.PI / 2 : 0) + (s.f < 0 ? Math.PI : 0));
    g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.sc) g.scale(o.sc, o.sc);
    if (!o.flat) { g.save(); g.translate(c * 0.05, c * 0.09); g.fillStyle = 'rgba(0,15,30,.38)'; hullPath(g, s.t, L, w); g.fill(); g.restore(); }
    const col = HULL[s.t], gr = g.createLinearGradient(0, -w / 2, 0, w / 2);
    gr.addColorStop(0, col[0]); gr.addColorStop(0.5, col[1]); gr.addColorStop(1, col[2]);
    g.fillStyle = gr; hullPath(g, s.t, L, w); g.fill(); g.lineWidth = Math.max(0.8, c * 0.035); g.strokeStyle = col[3]; g.stroke();
    g.save(); hullPath(g, s.t, L, w); g.clip();
    if (s.t === 'F') {
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-L / 2, -w * 0.08, L, w * 0.16);
      rr(g, -L * 0.1, -w * 0.3, L * 0.26, w * 0.6, w * 0.12); g.fillStyle = '#eef2f5'; g.fill(); g.strokeStyle = '#6b7783'; g.lineWidth = c * 0.025; g.stroke();
      g.fillStyle = '#2b3a4a'; g.fillRect(L * 0.12, -w * 0.24, L * 0.035, w * 0.48);
      g.fillStyle = '#5f6b77'; g.beginPath(); g.arc(-L * 0.02, 0, w * 0.1, 0, 7); g.fill();
      for (const bx of [L * 0.27, -L * 0.24]) { rr(g, bx - w * 0.2, -w * 0.2, w * 0.4, w * 0.4, w * 0.06); g.fillStyle = '#4b5662'; g.fill(); g.fillStyle = '#c8402e'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(bx + dx * w * 0.09, dy * w * 0.09, w * 0.055, 0, 7); g.fill(); } }
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = c * 0.025; g.beginPath(); g.arc(-L * 0.41, 0, w * 0.26, 0, 7); g.stroke();
    } else if (s.t === 'S') {
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-L / 2, -w * 0.06, L, w * 0.12);
      g.fillStyle = '#1a1f26'; g.beginPath(); g.ellipse(L * 0.08, 0, w * 0.62, w * 0.24, 0, 0, 7); g.fill();
      g.fillStyle = '#6b7684'; g.beginPath(); g.arc(L * 0.16, 0, w * 0.07, 0, 7); g.fill();
      g.fillStyle = '#c9a227'; g.fillRect(L * 0.34, -w * 0.04, L * 0.05, w * 0.08);
    } else if (s.t === 'I') {
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-L / 2, -w * 0.07, L, w * 0.14);
      rr(g, -L * 0.22, -w * 0.3, L * 0.24, w * 0.6, w * 0.1); g.fillStyle = '#dfe5d6'; g.fill(); g.strokeStyle = '#5c6652'; g.lineWidth = c * 0.025; g.stroke();
      g.fillStyle = '#f5f7f2'; g.beginPath(); g.arc(-L * 0.1, 0, w * 0.2, 0, 7); g.fill(); g.strokeStyle = '#7a8470'; g.beginPath(); g.moveTo(-L * 0.1 - w * 0.2, 0); g.lineTo(-L * 0.1 + w * 0.2, 0); g.stroke();
      g.fillStyle = '#4c5644'; g.beginPath(); g.arc(L * 0.22, 0, w * 0.2, 0, 7); g.fill(); g.fillRect(L * 0.22, -w * 0.05, L * 0.2, w * 0.1);
      g.beginPath(); g.arc(-L * 0.36, 0, w * 0.15, 0, 7); g.fill();
    } else {
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(-L / 2, -w * 0.05, L, w * 0.1);
      rr(g, -L * 0.16, -w * 0.28, L * 0.32, w * 0.56, w * 0.14); g.fillStyle = '#2c6fa8'; g.fill();
      g.fillStyle = 'rgba(160,215,255,.9)'; rr(g, L * 0.06, -w * 0.22, L * 0.08, w * 0.44, w * 0.06); g.fill();
      g.fillStyle = '#3a4048'; g.fillRect(-L / 2, -w * 0.15, L * 0.09, w * 0.3);
    }
    if (s.h) for (let q = 0; q < n; q++) if (s.h[q]) {
      const lx = (q - (n - 1) / 2) * c * (s.f < 0 ? -1 : 1);
      const rg = g.createRadialGradient(lx, 0, 0, lx, 0, c * 0.42); rg.addColorStop(0, 'rgba(20,8,2,.95)'); rg.addColorStop(0.6, 'rgba(40,16,6,.75)'); rg.addColorStop(1, 'rgba(40,16,6,0)');
      g.fillStyle = rg; g.fillRect(lx - c * 0.5, -w, c, w * 2);
    }
    g.restore();
    if (s.h && !s.sunk) for (let q = 0; q < n; q++) if (s.h[q]) {
      const lx = (q - (n - 1) / 2) * c * (s.f < 0 ? -1 : 1), r = c * 0.3;
      const fg = g.createRadialGradient(lx, 0, 0, lx, 0, r); fg.addColorStop(0, '#fff5b0'); fg.addColorStop(0.35, '#ffb02e'); fg.addColorStop(0.75, 'rgba(230,70,20,.85)'); fg.addColorStop(1, 'rgba(200,40,10,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(lx, 0, r, 0, 7); g.fill();
    }
    if (s.sunk) { g.fillStyle = 'rgba(10,25,40,.5)'; hullPath(g, s.t, L, w); g.fill(); }
    g.restore();
  }
  function drawMark(g, m, cx, cy, c, mine) {
    if (m === 1) {
      g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx, cy, c * 0.3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(225,242,255,.8)'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.arc(cx, cy, c * 0.17, 0, 7); g.stroke();
      g.fillStyle = 'rgba(225,242,255,.9)'; g.beginPath(); g.arc(cx, cy, c * 0.055, 0, 7); g.fill();
    } else if (m === 2) {
      if (mine) return;   // sulla mia flotta il danno si vede sulla nave
      g.fillStyle = 'rgba(25,8,2,.55)'; g.beginPath(); g.arc(cx, cy, c * 0.4, 0, 7); g.fill();
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, c * 0.34); gr.addColorStop(0, '#fff6b8'); gr.addColorStop(0.35, '#ffae2c'); gr.addColorStop(0.8, '#d9361a'); gr.addColorStop(1, 'rgba(160,30,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, c * 0.34, 0, 7); g.fill();
    } else if (m === 3) {
      const r = c * 0.2; g.strokeStyle = mine ? 'rgba(200,215,230,.35)' : 'rgba(200,215,230,.6)'; g.lineWidth = Math.max(1, c * 0.06); g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke();
      if (!mine) { g.setLineDash([2, 3]); g.lineWidth = Math.max(1, c * 0.04); g.beginPath(); g.arc(cx, cy, c * 0.36, 0, 7); g.stroke(); g.setLineDash([]); }
    }
  }
  function seaTex(w, h, mine) {
    const key = (mine ? 'm' : 'e') + w + 'x' + h + '@' + U.s; if (U.sea[key]) return U.sea[key];
    const c = document.createElement('canvas'); c.width = Math.ceil(w * U.s); c.height = Math.ceil(h * U.s);
    const g = c.getContext('2d'); g.scale(U.s, U.s);
    const gr = g.createLinearGradient(0, 0, w, h);
    if (mine) { gr.addColorStop(0, '#2a87b5'); gr.addColorStop(0.55, '#1b6c97'); gr.addColorStop(1, '#135478'); }
    else { gr.addColorStop(0, '#1d4a74'); gr.addColorStop(0.55, '#163b60'); gr.addColorStop(1, '#0f2d4c'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    let sd = mine ? 7 : 13; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const cnt = Math.floor(w * h / 140), u = w / 340;
    g.lineCap = 'round';
    for (let i = 0; i < cnt; i++) {
      const x = rnd() * w, y = rnd() * h, l = (5 + rnd() * 7) * Math.max(0.5, u);
      g.strokeStyle = `rgba(255,255,255,${0.035 + rnd() * 0.06})`; g.lineWidth = Math.max(0.6, u);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - l * 0.32, x + l, y); g.stroke();
    }
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,25,.35)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = Math.max(1, Math.round(U.s * 0.8)) / U.s; const cc = w / N;
    g.beginPath(); for (let i = 1; i < N; i++) { g.moveTo(i * cc, 0); g.lineTo(i * cc, h); g.moveTo(0, i * cc); g.lineTo(w, i * cc); } g.stroke();
    return (U.sea[key] = c);
  }

  // ---- impaginazione (unita' logiche, larghezza 390) ----
  function layout() {
    if (!U) return;
    const wr = U.root.querySelector('#nvW'), vw = wr.clientWidth || innerWidth, vh = wr.clientHeight || innerHeight;
    let k = vw / W, LH = vh / k; if (LH < H0) { k = vh / H0; LH = H0; }
    U.k = k; U.LH = LH; U.s = k * dprOf(); U.sea = {};
    const S = U.S; S.style.transform = `translate(${(vw - W * k) / 2}px,0) scale(${k})`; S.style.height = LH + 'px';
    const cv = U.cv; cv.style.width = W + 'px'; cv.style.height = LH + 'px'; cv.width = Math.round(W * U.s); cv.height = Math.round(LH * U.s);
    const e = LH - H0, g1 = Math.min(36, e * 0.3), g2 = Math.min(26, e * 0.25), g3 = Math.min(24, e * 0.2);
    const L = U.L = {};
    L.big = { x: 35, y: 88 + g1, c: 34 }; L.big.w = L.big.c * N;
    L.lo = { x: 14, y: 440 + g1 + g2, w: 362, h: 140 };
    L.mini = { x: 14, y: L.lo.y, c: 14 }; L.mini.w = L.mini.c * N;
    L.panel = { x: 166, y: L.lo.y, w: 210, h: 140 };
    L.hintY = L.lo.y + 144; L.toolsY = L.hintY + 40 + g3; L.fireY = L.toolsY + 62;
    U.S.querySelector('#nvHint').style.top = L.hintY + 'px';
    U.S.querySelector('#nvTools').style.top = L.toolsY + 'px';
    U.S.querySelector('#nvFire').style.top = L.fireY + 'px';
    U.S.querySelector('#nvStamp').style.top = (L.big.y + L.big.w / 2) + 'px';
    draw();
  }
  const rectOf = who => who === U.view ? U.L.big : U.L.mini;
  const cellC = (B, x, y) => [B.x + (x + 0.5) * B.c, B.y + (y + 0.5) * B.c];

  // ---- animazioni: attori + particelle, un solo giro di disegno ----
  function kick() { if (!U || U.raf) return; U.last = performance.now(); U.raf = requestAnimationFrame(frame); }
  function frame(t) {
    if (!U) return; U.raf = 0;
    const dt = Math.min(0.05, (t - U.last) / 1000) * spd(); U.last = t;
    for (const a of U.act.slice()) { a.t += dt; const k = Math.min(1, a.t / a.d); if (a.up) a.up(k, dt); if (k >= 1) { U.act.splice(U.act.indexOf(a), 1); if (a.end) a.end(); a.res(); } }
    for (const p of U.pt) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.z != null) { p.vz -= (p.gz || 320) * dt; p.z += p.vz * dt; if (p.z < 0) p.life = p.max; }
      if (p.drag) { p.vx *= 1 - Math.min(1, p.drag * dt); p.vy *= 1 - Math.min(1, p.drag * dt); }
    }
    U.pt = U.pt.filter(p => p.life < p.max);
    if (U.shk > 0) U.shk = Math.max(0, U.shk - dt * 26);
    draw();
    if (U.act.length || U.pt.length || U.shk > 0) U.raf = requestAnimationFrame(frame);
  }
  function actor(o) { return new Promise(res => { if (FAST() || !U) { if (o.up) o.up(1, 0); if (o.end) o.end(); res(); return; } o.t = 0; o.res = res; U.act.push(o); kick(); }); }
  function part(p) { if (FAST() || !U) return; p.life = 0; U.pt.push(p); kick(); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function splashFx(x, y, c, big) {
    for (let i = 0; i < (big ? 22 : 14); i++) { const a = rnd(0, 7), s = rnd(10, 40) * c / 34; part({ k: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, z: 0, vz: rnd(70, big ? 170 : 120) * c / 34, gz: 340 * c / 34, max: 2, r: rnd(1.2, 2.6) * c / 34 }); }
    for (let i = 0; i < 2; i++) part({ k: 'ring', x, y, vx: 0, vy: 0, max: 0.7 + i * 0.25, r0: c * 0.12, r1: c * (0.62 + i * 0.25), dl: i * 0.12 });
    part({ k: 'foam', x, y, vx: 0, vy: 0, max: 0.9, r: c * 0.36 });
  }
  function boomFx(x, y, c, big) {
    part({ k: 'flash', x, y, vx: 0, vy: 0, max: 0.22, r: c * (big ? 1.6 : 1.1) });
    for (let i = 0; i < (big ? 26 : 16); i++) { const a = rnd(0, 7), s = rnd(20, big ? 95 : 70) * c / 34; part({ k: 'fire', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.6, max: rnd(0.45, 0.85), r: rnd(4, 8) * c / 34 }); }
    for (let i = 0; i < (big ? 12 : 7); i++) part({ k: 'smoke', x: x + rnd(-6, 6) * c / 34, y: y + rnd(-4, 4) * c / 34, vx: rnd(-6, 6), vy: rnd(-18, -8), max: rnd(1.1, 1.8), r: rnd(5, 9) * c / 34 });
    for (let i = 0; i < 10; i++) { const a = rnd(0, 7), s = rnd(60, 140) * c / 34; part({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 1.5, max: rnd(0.25, 0.5) }); }
    U.shk = big ? 9 : 6; kick();
  }
  function floatTxt(x, y, txt, col) { part({ k: 'txt', x, y, vx: 0, vy: -26, max: 1.05, txt, col }); }
  function drawParts(g) {
    for (const p of U.pt) {
      const k = p.life / p.max;
      if (p.k === 'drop') { g.fillStyle = `rgba(225,242,255,${0.9 * (1 - k * 0.4)})`; g.beginPath(); g.arc(p.x, p.y - p.z, p.r, 0, 7); g.fill(); }
      else if (p.k === 'ring') { const q = Math.max(0, (p.life - (p.dl || 0)) / (p.max - (p.dl || 0))); if (q <= 0) continue; g.strokeStyle = `rgba(230,245,255,${0.75 * (1 - q)})`; g.lineWidth = 2 * (1 - q) + 0.5; g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * q, 0, 7); g.stroke(); }
      else if (p.k === 'foam') { g.fillStyle = `rgba(240,250,255,${0.5 * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (0.6 + k * 0.6), 0, 7); g.fill(); }
      else if (p.k === 'flash') { const r = p.r * (0.6 + k), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, `rgba(255,255,230,${1 - k})`); gr.addColorStop(0.4, `rgba(255,210,120,${0.7 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); }
      else if (p.k === 'fire') { const col = k < 0.25 ? '255,240,170' : k < 0.55 ? '255,160,50' : '200,60,25'; g.fillStyle = `rgba(${col},${1 - k * 0.8})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.4), 0, 7); g.fill(); }
      else if (p.k === 'smoke') { g.fillStyle = `rgba(${p.lt ? '205,210,215' : '40,40,44'},${(p.lt ? 0.35 : 0.42) * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k * 1.3), 0, 7); g.fill(); }
      else if (p.k === 'spark') { g.strokeStyle = `rgba(255,220,140,${1 - k})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); }
      else if (p.k === 'bub') { g.strokeStyle = `rgba(220,240,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, p.r * (0.7 + k * 0.6), 0, 7); g.stroke(); }
      else if (p.k === 'wake') { g.fillStyle = `rgba(235,248,255,${0.45 * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (0.6 + k), 0, 7); g.fill(); }
      else if (p.k === 'oil') { g.fillStyle = `rgba(10,20,30,${0.35 * (1 - k)})`; g.beginPath(); g.ellipse(p.x, p.y, p.r * (0.5 + k), p.r * 0.6 * (0.5 + k), 0, 0, 7); g.fill(); }
      else if (p.k === 'txt') { g.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4); g.font = '800 13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(5,20,35,.85)'; g.strokeText(p.txt, p.x, p.y); g.fillStyle = p.col || '#e6f4ff'; g.fillText(p.txt, p.x, p.y); g.globalAlpha = 1; }
    }
  }

  // ---- disegno di tutto ----
  function drawBoard(g, who, B, big) {
    const w = B.c * N, mine = who === 'M';
    g.save();
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, B.x - 2, B.y + 1, w + 4, w + 4, big ? 9 : 6); g.fill();
    g.save(); rr(g, B.x, B.y, w, w, big ? 8 : 5); g.clip();
    g.drawImage(seaTex(w, w, mine), B.x, B.y, w, w);
    const dv = mine ? U.dv[1] : U.dv[0];
    if (!mine) {
      for (const s of U.ewr) drawShip(g, Object.assign({ h: Array(s.n).fill(1), sunk: true }, s), B.x + s.x * B.c, B.y + s.y * B.c, B.c, { alpha: s.a == null ? 1 : s.a });
      if (U.reveal && U.G) U.G.P[1].ships.forEach(s => { if (!s.sunk) drawShip(g, s, B.x + s.x * B.c, B.y + s.y * B.c, B.c, { alpha: 0.85 }); });
    } else if (U.mine) {
      U.mine.forEach(s => { if (s.sunk) drawShip(g, s, B.x + s.x * B.c, B.y + s.y * B.c, B.c, { alpha: 0.55 }); });
      U.mine.forEach(s => { if (!s.sunk) drawShip(g, s, B.x + (s.x + (s.ox || 0)) * B.c, B.y + (s.y + (s.oy || 0)) * B.c, B.c); });
    }
    if (dv) for (let id = 0; id < N * N; id++) if (dv[id]) { const [cx, cy] = cellC(B, id % N, (id / N) | 0); drawMark(g, dv[id], cx, cy, B.c, mine); }
    g.restore();
    g.strokeStyle = 'rgba(170,210,240,.32)'; g.lineWidth = big ? 1.5 : 1; rr(g, B.x, B.y, w, w, big ? 8 : 5); g.stroke();
    if (big) {
      g.font = '700 10.5px system-ui,sans-serif'; g.fillStyle = 'rgba(170,205,235,.75)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < N; i++) { g.fillText(LET[i], B.x + (i + 0.5) * B.c, B.y - 9); g.fillText(String(i + 1), B.x - 12, B.y + (i + 0.5) * B.c); }
      g.textAlign = 'left'; g.font = '900 12px system-ui,sans-serif'; g.fillStyle = mine ? '#8fe3ff' : '#ffb39a';
      g.fillText(mine ? 'LA TUA FLOTTA' : 'MARE NEMICO', B.x - 22, B.y - 28);
      g.textAlign = 'right'; g.font = '600 11px system-ui,sans-serif'; g.fillStyle = 'rgba(190,215,235,.75)';
      const sub = U.ph !== 'play' || !U.mine ? 'Le navi si possono toccare' : mine ? (U.busy && U.G && U.G.turn === 1 && !U.G.over ? 'Il nemico spara qui' : 'Navi a galla: ' + U.mine.filter(s => !s.sunk).length + ' su 5') : 'Navi nemiche a galla: ' + (5 - U.ewr.length) + ' su 5';
      g.fillText(sub, B.x + w, B.y - 28);
    } else {
      g.fillStyle = 'rgba(4,14,26,.72)'; rr(g, B.x + 4, B.y + 4, mine ? 86 : 82, 16, 5); g.fill();
      g.font = '800 9.5px system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = mine ? '#8fe3ff' : '#ffb39a';
      g.fillText(mine ? 'LA TUA FLOTTA' : 'MARE NEMICO', B.x + 9, B.y + 12.5);
      if (U.ph === 'play' && !U.busy && U.G && !U.G.over) { g.fillStyle = 'rgba(4,14,26,.72)'; rr(g, B.x + w - 70, B.y + w - 20, 66, 16, 5); g.fill(); g.fillStyle = '#ffe27a'; g.textAlign = 'center'; g.fillText('INGRANDISCI', B.x + w - 37, B.y + w - 11.5); }
    }
    g.restore();
  }
  function drawAim(g) {
    const B = U.L.big, G = U.G; if (!G || U.busy || U.ph !== 'play') return;
    if (U.view === 'E' && U.aim) {
      const { x, y } = U.aim;
      if (U.tool === 'shot' || U.tool === 'rocket') {
        const cs = U.tool === 'rocket' ? E.cross(x, y) : [[x, y]];
        for (const [a, b] of cs) { g.fillStyle = 'rgba(255,214,90,.22)'; g.fillRect(B.x + a * B.c + 1, B.y + b * B.c + 1, B.c - 2, B.c - 2); g.strokeStyle = 'rgba(255,226,122,.85)'; g.lineWidth = 1.5; g.strokeRect(B.x + a * B.c + 1.5, B.y + b * B.c + 1.5, B.c - 3, B.c - 3); }
        const [cx, cy] = cellC(B, x, y), r = B.c * 0.3;
        g.strokeStyle = '#ffe27a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(cx - r - 5, cy); g.lineTo(cx - r + 4, cy); g.moveTo(cx + r - 4, cy); g.lineTo(cx + r + 5, cy); g.moveTo(cx, cy - r - 5); g.lineTo(cx, cy - r + 4); g.moveTo(cx, cy + r - 4); g.lineTo(cx, cy + r + 5); g.stroke();
      } else if (U.tool === 'torp') {
        const { d, l } = E.torpFrom(x, y), path = E.lane(d, l);
        for (const [a, b] of path) { g.fillStyle = 'rgba(110,225,255,.17)'; g.fillRect(B.x + a * B.c + 1, B.y + b * B.c + 1, B.c - 2, B.c - 2); }
        const [sx, sy] = cellC(B, path[0][0], path[0][1]), ang = [0, Math.PI, Math.PI / 2, -Math.PI / 2][d];
        g.save(); g.translate(sx, sy); g.rotate(ang); g.fillStyle = '#7fd8ff'; g.beginPath(); g.moveTo(B.c * 0.32, 0); g.lineTo(-B.c * 0.12, -B.c * 0.24); g.lineTo(-B.c * 0.12, B.c * 0.24); g.closePath(); g.fill(); g.restore();
        const [cx, cy] = cellC(B, x, y); g.strokeStyle = 'rgba(127,216,255,.9)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, B.c * 0.3, 0, 7); g.stroke(); g.setLineDash([]);
      }
    }
    if (U.view === 'M' && U.tool === 'move' && U.mine) {
      U.mine.forEach((s, k) => {
        if (s.sunk || s.fu <= 0 || k === U.sel) return;
        const px = B.x + (s.x + (s.v ? 0.5 : s.n - 0.5)) * B.c + (s.v ? B.c * 0.3 : B.c * 0.3), py = B.y + (s.y + 0.5) * B.c - B.c * 0.3;
        g.fillStyle = '#ffe27a'; g.strokeStyle = 'rgba(5,20,35,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill(); g.stroke();
      });
      if (U.sel != null) {
        const s = U.mine[U.sel];
        g.strokeStyle = '#ffe27a'; g.lineWidth = 2; g.setLineDash([5, 4]); rr(g, B.x + s.x * B.c + 1, B.y + s.y * B.c + 1, (s.v ? 1 : s.n) * B.c - 2, (s.v ? s.n : 1) * B.c - 2, 7); g.stroke(); g.setLineDash([]);
        for (const m of U.moves) {
          const cx = B.x + (m.x + (s.v ? 0.5 : s.n / 2)) * B.c, cy = B.y + (m.y + (s.v ? s.n / 2 : 0.5)) * B.c, on = U.mvDest && U.mvDest.x === m.x && U.mvDest.y === m.y;
          if (on) { drawShip(g, Object.assign({}, s, { x: m.x, y: m.y }), B.x + m.x * B.c, B.y + m.y * B.c, B.c, { alpha: 0.6, flat: 1 }); g.strokeStyle = '#7dff9a'; g.lineWidth = 2; rr(g, B.x + m.x * B.c + 1, B.y + m.y * B.c + 1, (s.v ? 1 : s.n) * B.c - 2, (s.v ? s.n : 1) * B.c - 2, 7); g.stroke(); }
          g.fillStyle = on ? '#7dff9a' : 'rgba(125,255,154,.9)'; g.strokeStyle = 'rgba(5,30,15,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, on ? 7 : 6, 0, 7); g.fill(); g.stroke();
        }
      }
    }
  }
  function drawPanel(g) {
    const P = U.L.panel, G = U.G;
    g.save();
    g.fillStyle = 'rgba(6,20,36,.6)'; rr(g, P.x, P.y, P.w, P.h, 10); g.fill(); g.strokeStyle = 'rgba(170,210,240,.18)'; g.lineWidth = 1; g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    const row = (title, col, y, ships, mine) => {
      g.font = '900 9.5px system-ui,sans-serif'; g.fillStyle = col; g.fillText(title, P.x + 10, y);
      let x = P.x + 10; const c = 8.6;
      ships.forEach(s => {
        drawShip(g, Object.assign({}, s, { v: false, f: 1 }), x, y + 9, c, { alpha: s.sunk ? 0.75 : 1, flat: 1 });
        if (s.sunk) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + 1, y + 10); g.lineTo(x + s.n * c - 1, y + 17); g.stroke(); }
        if (mine && !s.sunk && s.fu > 0) { g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(x + s.n * c / 2, y + 23.5, 2.2, 0, 7); g.fill(); }
        x += s.n * c + 9;
      });
    };
    const sunkT = {}; for (const s of U.ewr) sunkT[s.t] = (sunkT[s.t] || 0) + 1;
    const foe = E.FLEET.map(t => { const ok = sunkT[t] > 0; if (ok) sunkT[t]--; return { t, n: T[t].n, sunk: ok }; });
    row('FLOTTA NEMICA', '#ffb39a', P.y + 13, foe, false);
    g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(190,215,235,.8)';
    if (G) { const a = G.P[1].am; g.fillText('Ha ancora: razzi ' + (foe[0].sunk ? 'no' : a.r) + ', siluri ' + (foe[1].sunk ? 'no' : a.s), P.x + 10, P.y + 47); }
    g.strokeStyle = 'rgba(170,210,240,.14)'; g.beginPath(); g.moveTo(P.x + 10, P.y + 62); g.lineTo(P.x + P.w - 10, P.y + 62); g.stroke();
    row('LA TUA FLOTTA', '#8fe3ff', P.y + 76, U.mine || [], true);
    g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(190,215,235,.8)';
    g.fillText('Pallino giallo: puo\' ancora spostarsi', P.x + 10, P.y + 112);
    if (G) { const a = G.P[0].am; g.fillText('Ti restano: razzi ' + (U.mine[0].sunk ? 'no' : a.r) + ', siluri ' + (U.mine[1].sunk ? 'no' : a.s), P.x + 10, P.y + 127); }
    g.restore();
  }
  // vassoio delle navi da schierare
  const TRAY = [[10, 8], [174, 8], [10, 78], [138, 78], [240, 78]];
  function trayXY(k) { const L = U.L.lo; return [L.x + TRAY[k][0], L.y + TRAY[k][1]]; }
  function drawTray(g) {
    const L = U.L.lo, c = U.L.big.c;
    g.save(); g.fillStyle = 'rgba(6,20,36,.6)'; rr(g, L.x, L.y, L.w, L.h, 10); g.fill(); g.strokeStyle = 'rgba(170,210,240,.18)'; g.lineWidth = 1; g.stroke();
    U.pl.forEach((s, k) => {
      const [x, y] = trayXY(k), gone = s.x >= 0 || (U.drag && U.drag.k === k && U.drag.moved);
      if (gone) { g.strokeStyle = 'rgba(170,210,240,.25)'; g.setLineDash([4, 4]); g.lineWidth = 1; rr(g, x + 1, y + 1, s.n * c - 2, c - 2, 7); g.stroke(); g.setLineDash([]); }
      else drawShip(g, Object.assign({}, s, { v: false, f: 1 }), x, y, c);
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '800 11px system-ui,sans-serif'; g.fillStyle = gone ? 'rgba(255,255,255,.4)' : '#fff';
      g.fillText(T[s.t].name, x + 2, y + c + 9);
      g.font = '600 9.5px system-ui,sans-serif'; g.fillStyle = gone ? 'rgba(170,205,235,.4)' : 'rgba(170,205,235,.9)';
      g.fillText(T[s.t].role, x + 2, y + c + 21);
    });
    g.restore();
  }
  function draw() {
    if (!U || !U.cv || !U.L) return;
    const g = U.g, L = U.L;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, U.cv.width, U.cv.height);
    g.setTransform(U.s, 0, 0, U.s, 0, 0);
    if (U.ph === 'place' || U.ph === 'menu') {
      drawBoard(g, 'M', L.big, true);
      const B = L.big;
      U.pl.forEach((s, k) => { if (s.x >= 0 && !(U.drag && U.drag.k === k && U.drag.moved)) drawShip(g, s, B.x + s.x * B.c, B.y + s.y * B.c, B.c, { alpha: U.bad === k ? 0.45 : 1 }); });
      drawTray(g);
      const d = U.drag;
      if (d && d.moved) {
        const s = U.pl[d.k], sn = snap(d);
        if (sn) { const ok = sn.ok; g.fillStyle = ok ? 'rgba(125,255,154,.2)' : 'rgba(255,90,74,.25)'; g.strokeStyle = ok ? '#7dff9a' : '#ff5a4a'; g.lineWidth = 2; rr(g, B.x + sn.x * B.c + 1, B.y + sn.y * B.c + 1, (d.v ? 1 : s.n) * B.c - 2, (d.v ? s.n : 1) * B.c - 2, 7); g.fill(); g.stroke(); }
        drawShip(g, Object.assign({}, s, { v: d.v, f: d.v ? -1 : 1 }), d.px, d.py, B.c, { alpha: 0.92, sc: 1.04 });
      }
      return;
    }
    if (!U.G) return;
    const sh = U.shk > 0 ? [rnd(-U.shk, U.shk) * 0.5, rnd(-U.shk, U.shk) * 0.5] : [0, 0];
    g.save(); g.translate(sh[0], sh[1]);
    g.globalAlpha = U.fade == null ? 1 : U.fade; drawBoard(g, U.view, L.big, true); g.globalAlpha = 1;
    drawAim(g);
    for (const a of U.act) if (a.draw) a.draw(g);
    drawParts(g);
    g.restore();
    drawBoard(g, U.view === 'E' ? 'M' : 'E', L.mini, false);
    drawPanel(g);
  }

  // ---- testi e pulsanti ----
  function info(sayTxt) {
    if (!U) return;
    const el = U.S.querySelector('#nvTop .info'), G = U.G, foe = FOES[U.o.lv];
    if (!sayTxt && U.sayUntil > Date.now()) return;
    let line, cls = '';
    if (sayTxt) { line = '«' + sayTxt + '»'; cls = 'say'; U.sayUntil = Date.now() + 2400; clearTimeout(U.sayT); U.sayT = setTimeout(() => { if (U) { U.sayUntil = 0; info(); } }, 2400); }
    else if (U.ph === 'menu') line = 'Scegli l\'avversario';
    else if (U.ph === 'place') line = 'Schiera la tua flotta';
    else if (!G || G.over) line = 'Partita finita';
    else if (G.turn === 0 && !U.busy) { line = 'Tocca a te'; cls = 'me'; }
    else line = 'Tocca a ' + foe.n;
    el.className = 'info ' + cls; el.innerHTML = `<b>${esc(foe.n)} <small>(${OPT.lv[U.o.lv - 1][1]})</small></b><span>${esc(line)}</span>`;
  }
  function foeSay(k, p = 0.6) { if (Math.random() < p) info(pick(FOES[U.o.lv].say[k])); }
  function stamp(cls, big, small) {
    const el = U.S.querySelector('#nvStamp'); if (FAST()) return;
    el.className = 'nvA ' + cls; el.innerHTML = `<div>${big}</div>${small ? `<small>${small}</small>` : ''}`; void el.offsetWidth; el.className = 'nvA go ' + cls;
  }
  function hint(txt, warm) { const h = U.S.querySelector('#nvHint'); h.textContent = txt; h.className = 'nvA' + (warm ? '' : ' w'); }
  const avail = t => {
    const G = U.G; if (!G) return [false, ''];
    if (t === 'shot') return [true, 'sempre'];
    if (t === 'rocket') return U.mine[0].sunk ? [false, 'fregata persa'] : G.P[0].am.r ? [true, G.P[0].am.r === 1 ? '1 rimasto' : G.P[0].am.r + ' rimasti'] : [false, 'finiti'];
    if (t === 'torp') return U.mine[1].sunk ? [false, 'sottom. perso'] : G.P[0].am.s ? [true, G.P[0].am.s === 1 ? '1 rimasto' : G.P[0].am.s + ' rimasti'] : [false, 'finiti'];
    const n = U.mine.filter((s, k) => E.movesOf(G, 0, k).length).length;
    return n ? [true, n === 1 ? '1 nave' : n + ' navi'] : [false, 'nessuna'];
  };
  function why(t) {
    if (t === 'move') return 'Nessuna nave puo\' spostarsi: ogni nave si sposta una volta sola.';
    if (t === 'rocket') return U.mine[0].sunk ? 'Ti hanno affondato la fregata: niente piu\' razzi.' : 'Hai gia\' lanciato tutti i razzi.';
    return U.mine[1].sunk ? 'Ti hanno affondato il sottomarino: niente piu\' siluri.' : 'Hai gia\' lanciato tutti i siluri.';
  }
  function refresh() {
    if (!U || U.ph !== 'play') return;
    const G = U.G, my = G && G.turn === 0 && !U.busy && !G.over;
    info();
    U.S.querySelectorAll('#nvTools button').forEach(b => { const t = b.dataset.t, [ok, sub] = avail(t); b.classList.toggle('on', t === U.tool); b.classList.toggle('off', !ok || !my); b.querySelector('small').textContent = sub; });
    const fb = U.S.querySelector('#nvFire');
    fb.className = 'nvA' + (U.tool === 'move' ? ' mv' : '');
    if (!my) { fb.disabled = true; fb.textContent = G && G.over ? 'Partita finita' : 'Turno di ' + FOES[U.o.lv].n; }
    else if (U.tool === 'move') { fb.disabled = !U.mvDest; fb.textContent = 'Sposta qui'; }
    else { fb.disabled = !U.aim; fb.textContent = U.tool === 'rocket' ? 'Lancia il razzo' : U.tool === 'torp' ? 'Lancia il siluro' : 'Spara'; }
    if (!my) hint(G && !G.over ? 'Tocca il mare per accelerare.' : '', false);
    else if (U.view === 'M' && U.tool !== 'move') hint('Stai guardando la tua flotta: tocca il riquadro piccolo per tornare al mare nemico.', false);
    else if (U.tool === 'shot') hint(U.aim ? 'Mira su ' + LET[U.aim.x] + (U.aim.y + 1) + ': tocca di nuovo o premi Spara.' : 'Tocca una casella del mare nemico per mirare.', true);
    else if (U.tool === 'rocket') hint(U.aim ? 'Croce su ' + LET[U.aim.x] + (U.aim.y + 1) + '. Vicino all\'intercettore nemico viene abbattuto.' : 'Razzo: tocca il centro della croce (5 caselle).', true);
    else if (U.tool === 'torp') hint(U.aim ? 'Parte dalla freccia e si ferma sulla prima nave che trova.' : 'Siluro: tocca una casella, parte dal bordo piu\' vicino.', true);
    else hint(U.sel == null ? 'Tocca una tua nave col pallino giallo. Spostarsi costa il turno.' : U.mvDest ? 'Premi Sposta qui, oppure scegli un altro punto verde.' : 'Tocca un punto verde o trascina la nave.' + (U.mine[U.sel].h.some(Boolean) ? ' E\' colpita: va piano.' : ''), true);
    draw();
  }

  // ---- inizio: scelte ----
  function tendina(name, title, items, def) {
    const cur = items.find(x => x[0] === def) || items[0];
    return `<details class="nvD" data-n="${name}"><summary><span>${title}</span><b>${cur[1]}</b></summary><div class="opts">`
      + items.map(([v, t]) => `<button type="button" data-v="${v}"${v === cur[0] ? ' class="on"' : ''}>${t}</button>`).join('') + `</div></details>`;
  }
  function setup() {
    U.ph = 'menu'; U.G = null; info(); draw();
    const sv = Object.assign({}, DEF, st().nvOpt || {}), rec = st().nvSt;
    const ov = overlay(`<div class="nvBox"><h2>Battaglia navale</h2><p>Trova e affonda la flotta nemica. A ogni turno spari oppure sposti una nave: razzi, siluri e fughe da giocare con la testa.${rec ? '<br>Battaglie vinte: ' + rec[0] + ' su ' + rec[1] + '.' : ''}</p>`
      + tendina('lv', 'Avversario', OPT.lv.map(([v, t]) => [v, FOES[v].n + ' (' + t + ')']), sv.lv)
      + `<p class="nvNote">Fregata = razzi, sottomarino = siluri, intercettore = abbatte i razzi, motovedette = veloci. Se ti affondano una nave perdi anche la sua arma.</p>`
      + `<button type="button" class="big pr" data-k="go">Schiera la flotta</button><button type="button" class="big" data-k="ru">Come si gioca</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelectorAll('.nvD').forEach(d => {
      d.onclick = e => { const b = e.target.closest('.opts button'); if (!b) return; d.querySelectorAll('.opts button').forEach(x => x.classList.toggle('on', x === b)); d.querySelector('summary b').innerHTML = b.innerHTML; d.open = false; };
    });
    ov.querySelector('[data-k=go]').onclick = () => { const b = ov.querySelector('.nvD[data-n=lv] .opts .on'); U.o = { lv: +(b ? b.dataset.v : DEF.lv) }; st().nvOpt = { lv: String(U.o.lv) }; save(); ov.remove(); place(); };
    ov.querySelector('[data-k=ru]').onclick = rules;
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }
  function rules() {
    const ov = overlay(`<div class="nvBox nvRu"><h2>Come si gioca</h2>
      <p>Schiera le tue 5 navi nel mare. Poi, a turno, scegli <b>una cosa</b>: sparare oppure spostare una nave. Vince chi affonda per primo tutta la flotta dell'altro.</p>
      <p><b>Colpo</b>: una casella, sempre. Acqua, colpito o affondato.</p>
      <p><b>Razzo</b> (2, li lancia la fregata): colpisce 5 caselle a croce. Se il centro cade vicino all'intercettore nemico viene abbattuto, e scopri che l'intercettore e' li' vicino.</p>
      <p><b>Siluro</b> (2, li lancia il sottomarino): parte dal bordo piu' vicino alla casella che tocchi, corre dritto e si ferma sulla prima nave. Le caselle che attraversa risultano acqua.</p>
      <p><b>Sposta</b>: ogni nave puo' spostarsi <b>una volta</b> a partita, di 2 caselle avanti o indietro (motovedette 3) oppure 1 di lato. Una nave colpita si sposta di 1. Chi ti aveva colpito vede i suoi colpi diventare grigi: sa che sei scappato, non dove.</p>
      <p>Se ti affondano la fregata niente piu' razzi, il sottomarino niente piu' siluri, l'intercettore e i razzi nemici passano.</p>
      <button type="button" class="big pr" data-k="x">Ho capito</button></div>`);
    ov.querySelector('[data-k=x]').onclick = () => ov.remove();
  }

  // ---- schieramento a mano ----
  function place(prev) {
    U.ph = 'place'; U.G = null; U.mine = null; U.dv = [null, null]; U.ewr = []; U.reveal = false; U.view = 'M'; U.act = []; U.pt = []; U.drag = null;
    U.pl = E.FLEET.map((t, k) => { const p = prev && prev[k]; return p ? { t, n: T[t].n, x: p.x, y: p.y, v: p.v, f: p.v ? -1 : 1 } : { t, n: T[t].n, x: -1, y: -1, v: false, f: 1 }; });
    const tb = U.S.querySelector('#nvTools'); tb.className = 'nvA two';
    tb.innerHTML = `<button type="button" data-p="rnd">${ICON.dice}<span>A caso</span></button><button type="button" data-p="clr">${ICON.clear}<span>Svuota</span></button>`;
    tb.querySelector('[data-p=rnd]').onclick = () => { sfx.tap(); const f = E.randomFleet(); U.pl.forEach((s, k) => { s.x = f[k].x; s.y = f[k].y; s.v = f[k].v; s.f = s.v ? -1 : 1; }); placeUi(); };
    tb.querySelector('[data-p=clr]').onclick = () => { sfx.tap(); U.pl.forEach(s => { s.x = -1; s.y = -1; s.v = false; s.f = 1; }); placeUi(); };
    U.S.querySelector('#nvFire').onclick = () => { if (U.ph === 'place' && U.pl.every(s => s.x >= 0)) battle(); };
    info(); placeUi();
  }
  function placeUi() {
    const n = U.pl.filter(s => s.x >= 0).length, fb = U.S.querySelector('#nvFire');
    fb.className = 'nvA go'; fb.disabled = n < 5; fb.textContent = n < 5 ? (n === 4 ? 'Manca 1 nave' : 'Mancano ' + (5 - n) + ' navi') : 'Salpa!';
    hint(n < 5 ? 'Trascina le navi nel mare. Tocca una nave nel mare per girarla.' : 'Flotta pronta. Puoi ancora spostarle o girarle, poi Salpa!', true);
    draw();
  }
  const others = k => U.pl.map((o, j) => j === k || o.x < 0 ? { t: o.t, n: 0, x: -1, y: -1, v: false } : o);
  function snap(d) {
    const B = U.L.big, s = U.pl[d.k], x = Math.round((d.px - B.x) / B.c), y = Math.round((d.py - B.y) / B.c);
    const w = d.v ? 1 : s.n, h = d.v ? s.n : 1;
    if (x + w <= 0 || y + h <= 0 || x >= N || y >= N) return null;
    return { x, y, ok: E.fits(others(d.k), { t: s.t, n: s.n, x, y, v: d.v }, d.k) };
  }
  const plAt = (px, py) => { const B = U.L.big, cx = Math.floor((px - B.x) / B.c), cy = Math.floor((py - B.y) / B.c); return U.pl.findIndex(s => s.x >= 0 && E.cells(s).some(([a, b]) => a === cx && b === cy)); };
  function rotate(k) {
    const s = U.pl[k], v = !s.v;
    for (const o of [0, -1, 1, -2, 2, -3, 3]) {
      const t = { t: s.t, n: s.n, v, x: s.x - (v ? 0 : o), y: s.y - (v ? o : 0) };
      if (E.fits(others(k), t, k)) { s.v = v; s.x = t.x; s.y = t.y; s.f = v ? -1 : 1; sfx.tap(); placeUi(); return; }
    }
    sfx.no(); U.bad = k; draw(); setTimeout(() => { if (U) { U.bad = null; draw(); } }, 350);
    hint('Qui non gira: non c\'e\' spazio.', true);
  }

  // ---- la battaglia ----
  function battle() {
    const fleet = U.pl.map(s => E.mk(s.t, s.x, s.y, s.v, s.f));
    st().nvFleet = U.pl.map(s => ({ x: s.x, y: s.y, v: s.v })); save();
    U.first = U.first == null ? (Math.random() < 0.5 ? 0 : 1) : 1 - U.first;
    U.G = E.newGame({ lv: U.o.lv, fleets: [fleet, null], first: window.__NVFIRST != null ? window.__NVFIRST : U.first });
    U.mine = U.G.P[0].ships.map(s => Object.assign({}, s, { h: s.h.slice() }));
    U.dv = [new Uint8Array(N * N), new Uint8Array(N * N)]; U.ewr = []; U.evi = U.G.ev.length;
    U.ph = 'play'; U.tool = 'shot'; U.aim = null; U.sel = null; U.mvDest = null; U.moves = []; U.busy = true;
    const tb = U.S.querySelector('#nvTools'); tb.className = 'nvA';
    tb.innerHTML = [['shot', 'Colpo'], ['rocket', 'Razzo'], ['torp', 'Siluro'], ['move', 'Sposta']].map(([t, n]) => `<button type="button" data-t="${t}">${ICON[t]}<span>${n}</span><small></small></button>`).join('');
    tb.querySelectorAll('button').forEach(b => b.onclick = () => tool(b.dataset.t));
    U.S.querySelector('#nvFire').onclick = fire;
    sfx.horn();
    const me = U.G.turn === 0, G = U.G;
    U.view = me ? 'E' : 'M';
    stamp('h', 'SI SALPA!', me ? 'Inizi tu' : 'Inizia ' + FOES[U.o.lv].n);
    refresh();
    (async () => { await wait(1300); if (!U || U.G !== G) return; if (me) myTurn(); else foeTurn(); })();
  }
  async function setView(v) {
    if (!U || U.view === v) return;
    U.view = v; U.fade = 0.25; draw();
    await actor({ d: 0.22, up: k => { if (U) U.fade = 0.25 + 0.75 * k; }, end: () => { if (U) U.fade = null; } });
    if (U) draw();
  }
  function myTurn() {
    if (!U || !U.G) return;
    U.busy = false; U.skip = false; U.root.classList.remove('nvFast');
    if (!avail(U.tool)[0]) U.tool = 'shot';
    sfx.turn(); refresh();
  }
  function tool(t) {
    const G = U.G; if (!G || U.busy || G.turn !== 0 || G.over) return;
    if (!avail(t)[0]) { sfx.no(); hint(why(t), true); return; }
    sfx.tap(); U.tool = t; U.aim = null; U.sel = null; U.mvDest = null; U.moves = [];
    setView(t === 'move' ? 'M' : 'E').then(refresh); refresh();
  }
  function fire() {
    const G = U.G; if (!G || U.busy || G.turn !== 0) return;
    let a = null;
    if (U.tool === 'move') { if (U.sel != null && U.mvDest) a = { k: 'move', s: U.sel, x: U.mvDest.x, y: U.mvDest.y }; }
    else if (U.aim) { const { x, y } = U.aim; a = U.tool === 'shot' ? { k: 'shot', x, y } : U.tool === 'rocket' ? { k: 'rocket', x, y } : Object.assign({ k: 'torp' }, E.torpFrom(x, y)); }
    if (!a || !E.act(G, 0, a)) { sfx.no(); return; }
    U.busy = true; U.aim = null; U.sel = null; U.mvDest = null; U.moves = [];
    refresh();
    (async () => {
      await play();
      if (!U || U.G !== G) return;
      if (G.over) return finish();
      if (U.tool === 'move') U.tool = 'shot';
      await foeTurn();
    })();
  }
  async function foeTurn() {
    if (!U || !U.G) return;
    const G = U.G;
    U.busy = true; refresh();
    await wait(500);
    if (!U || U.G !== G) return;
    const a = E.bot(G, 1);
    await setView(a.k === 'move' ? 'E' : 'M');
    await wait(280);
    if (!U || U.G !== G) return;
    E.act(G, 1, a);
    await play();
    if (!U || U.G !== G) return;
    if (G.over) return finish();
    await wait(450);
    await setView(U.tool === 'move' ? 'M' : 'E');
    myTurn();
  }

  // ---- gli eventi del motore, animati uno alla volta ----
  async function play() {
    const G = U.G;
    while (U && U.G === G && U.evi < G.ev.length) {
      const e = G.ev[U.evi++];
      if (e.t === 'fire' && e.k === 'shot') { await shellFx(e); const r = G.ev[U.evi++]; await result(r); }
      else if (e.t === 'fire' && e.k === 'rocket') {
        const ic = G.ev[U.evi] && G.ev[U.evi].t === 'icpt';
        await rocketFx(e, ic);
        if (ic) { U.evi++; await icptRes(e); }
        else { const rs = []; while (U.evi < G.ev.length && G.ev[U.evi].t === 'res' && G.ev[U.evi].via === 'rocket') rs.push(G.ev[U.evi++]); await rocketRes(e, rs); }
      }
      else if (e.t === 'fire' && e.k === 'torp') {
        const ln = G.ev[U.evi];
        await torpFx(e, ln && ln.t === 'lane' ? ln.ids : []);
        U.evi++; if (ln) for (const id of ln.ids) U.dv[e.p][id] = 1;
        if (G.ev[U.evi] && G.ev[U.evi].t === 'res' && G.ev[U.evi].via === 'torp') await result(G.ev[U.evi++]);
        else { const B = U.L.big; floatTxt(B.x + B.w / 2, B.y + B.w / 2, e.d < 2 ? 'Riga vuota' : 'Colonna vuota', '#7fd8ff'); if (e.p === 1) foeSay('miss', 0.5); await wait(900); }
      }
      else if (e.t === 'move') await moveFx(e);
      else if (e.t === 'fade') await fadeFx(e);
    }
    if (U) refresh();
  }
  // proiettile: da sotto (io) o da sopra (il nemico) verso la casella, con l'arco e l'ombra
  function shellFx(e) {
    const B = U.L.big, [tx, ty] = cellC(B, e.x, e.y), fromMe = e.p === 0;
    const sx = W / 2 + rnd(-30, 30), sy = fromMe ? B.y + B.w + 120 : B.y - 90;
    sfx.gun(); setTimeout(() => sfx.whist(), 60);
    let x = sx, y = sy, z = 0;
    return actor({
      d: 0.5, up: k => { x = sx + (tx - sx) * k; y = sy + (ty - sy) * k; z = Math.sin(Math.PI * k) * 70; },
      draw: g => {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 4 + z * 0.02, 2.4, 0, 0, 7); g.fill();
        const r = 3.6 + z * 0.035; g.fillStyle = '#2b2f36'; g.beginPath(); g.arc(x, y - z, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - r * 0.35, y - z - r * 0.35, r * 0.35, 0, 7); g.fill();
      },
    });
  }
  async function result(r) {
    const B = U.L.big, [cx, cy] = cellC(B, r.x, r.y), mineHit = r.p === 1, id = r.y * N + r.x, c = B.c;
    if (r.r === 'miss') {
      sfx.splash(); splashFx(cx, cy, c, false); U.dv[r.p][id] = 1; floatTxt(cx, cy - c * 0.55, 'Acqua');
      if (r.p === 1) foeSay('miss', 0.35);
      await wait(650); return;
    }
    sfx.boom(r.r === 'sunk' || r.via === 'torp'); boomFx(cx, cy, c, r.via === 'torp');
    if (r.via === 'torp') splashFx(cx, cy, c, true);
    U.dv[r.p][id] = 2;
    if (mineHit) U.mine[r.k].h[r.q] = 1;
    if (r.r === 'sunk') { await wait(380); await sinkFx(r); return; }
    if (mineHit) { const s = U.mine[r.k], esc = s.fu > 0 && E.movesOf(U.G, 0, r.k).length; stamp('b', 'COLPITO!', 'La tua ' + T[s.t].name.toLowerCase() + (esc ? ': puoi farla scappare con Sposta' : '')); foeSay('hit'); }
    else { stamp('g', 'COLPITO!', ''); foeSay('hurt', 0.45); }
    await wait(1100);
  }
  const LOSS = { F: 'niente piu\' razzi', S: 'niente piu\' siluri', I: '', M: '' };
  async function sinkFx(r) {
    const B = U.L.big, mineHit = r.p === 1, s = r.ship, c = B.c;
    for (const id of r.ids) U.dv[r.p][id] = 4;
    let o;
    if (mineHit) { o = U.mine[r.k]; o.sunk = true; for (let q = 0; q < o.n; q++) o.h[q] = 1; }
    else { o = Object.assign({}, s, { a: 0 }); U.ewr.push(o); }
    sfx.sink();
    for (const [x, y] of E.cells(s)) { const [px, py] = cellC(B, x, y); for (let i = 0; i < 3; i++) part({ k: 'bub', x: px + rnd(-8, 8), y: py + rnd(-8, 8), vx: 0, vy: rnd(-8, -3), max: rnd(0.8, 1.6), r: rnd(2, 4) }); part({ k: 'oil', x: px, y: py, vx: 0, vy: 0, max: 2.2, r: c * 0.55 }); }
    const nm = T[s.t].name;
    if (mineHit) { stamp('b', 'AFFONDATA!', 'La tua ' + nm.toLowerCase() + (LOSS[s.t] ? ': ' + LOSS[s.t] : s.t === 'I' ? ': i suoi razzi ora passano' : '')); foeSay('sunk', 0.8); }
    else { stamp('g', 'AFFONDATA!', nm + ' nemica' + (LOSS[s.t] ? ': ' + LOSS[s.t] + ' per lui' : s.t === 'I' ? ': i tuoi razzi ora passano' : '')); foeSay('gone', 0.8); }
    await actor({ d: 1, up: k => { if (!mineHit) o.a = Math.min(1, k * 1.4); } });
    await wait(650);
  }
  // razzo: sale con la scia e scende sulla croce (o viene abbattuto in volo)
  function rocketFx(e, ic) {
    const B = U.L.big, [tx, ty] = cellC(B, e.x, e.y), fromMe = e.p === 0;
    const sx = fromMe ? B.x + 20 : B.x + B.w - 20, sy = fromMe ? B.y + B.w + 130 : B.y - 110, mx = (sx + tx) / 2 + (fromMe ? -60 : 60), my = Math.min(sy, ty) - 120;
    const at = q => [(1 - q) * (1 - q) * sx + 2 * (1 - q) * q * mx + q * q * tx, (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * my + q * q * ty];
    const stopQ = ic ? 0.72 : 1, isx = fromMe ? B.x + B.w + 30 : B.x - 30, isy = fromMe ? B.y + B.w * 0.6 : B.y + B.w * 0.4;
    sfx.rocket();
    let p = [sx, sy], prev = [sx - 1, sy + 1], ip = null, last = 0, snd = 0;
    return actor({
      d: 0.95 * stopQ, up: k => {
        const q = k * stopQ; prev = p; p = at(q);
        if (k - last > 0.03) { last = k; part({ k: 'smoke', lt: 1, x: p[0], y: p[1], vx: rnd(-5, 5), vy: rnd(-5, 5), max: rnd(0.7, 1.1), r: rnd(2.5, 4) }); }
        if (ic && q > 0.42) { const m = (q - 0.42) / (stopQ - 0.42), hit = at(stopQ); ip = [isx + (hit[0] - isx) * m, isy + (hit[1] - isy) * m]; part({ k: 'smoke', lt: 1, x: ip[0], y: ip[1], vx: 0, vy: 0, max: 0.5, r: 1.8 }); if (!snd) { snd = 1; sfx.icpt(); } }
      },
      draw: g => {
        const a = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
        g.save(); g.translate(p[0], p[1]); g.rotate(a);
        g.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},80,.9)`; g.beginPath(); g.moveTo(-7, -2.5); g.lineTo(-15 - Math.random() * 6, 0); g.lineTo(-7, 2.5); g.closePath(); g.fill();
        g.fillStyle = '#eef2f5'; rr(g, -8, -3, 13, 6, 2.5); g.fill(); g.fillStyle = '#d9412b'; g.beginPath(); g.moveTo(5, -3); g.lineTo(10, 0); g.lineTo(5, 3); g.closePath(); g.fill();
        g.fillStyle = '#4b5662'; g.fillRect(-8, -4.5, 3, 9);
        g.restore();
        if (ip) { g.fillStyle = 'rgba(255,220,120,.8)'; g.beginPath(); g.arc(ip[0], ip[1], 4.5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ip[0], ip[1], 2.4, 0, 7); g.fill(); }
      },
      end: () => { if (ic) { const h = at(stopQ); boomFx(h[0], h[1], B.c * 0.9, false); for (let i = 0; i < 8; i++) part({ k: 'drop', x: h[0] + rnd(-30, 30), y: h[1] + rnd(10, 70), vx: 0, vy: 0, z: 0, vz: rnd(10, 40), gz: 120, max: 1.4, r: 1.6 }); } },
    });
  }
  async function icptRes(e) {
    if (e.p === 0) { stamp('h', 'INTERCETTATO!', 'L\'intercettore nemico e\' vicino a ' + LET[e.x] + (e.y + 1)); foeSay('miss', 0.3); }
    else stamp('c', 'INTERCETTATO!', 'Il tuo intercettore ha abbattuto il razzo');
    await wait(1500);
  }
  async function rocketRes(e, rs) {
    const B = U.L.big, c = B.c;
    sfx.boom(true);
    rs.forEach((r, i) => setTimeout(() => {
      if (!U || !U.dv[r.p]) return; const [cx, cy] = cellC(B, r.x, r.y);
      if (r.r === 'miss') { splashFx(cx, cy, c, false); U.dv[r.p][r.y * N + r.x] = 1; } else { boomFx(cx, cy, c, i === 0); U.dv[r.p][r.y * N + r.x] = 2; if (r.p === 1) U.mine[r.k].h[r.q] = 1; }
      if (i > 0) { if (r.r !== 'miss') sfx.boom(false); else sfx.splash(); }
      draw();
    }, FAST() ? 0 : i * 110 / spd()));
    await wait(rs.length * 110 + 520);
    const sunk = rs.filter(r => r.r === 'sunk');
    for (const r of sunk) await sinkFx(r);
    if (!sunk.length) {
      const n = rs.filter(r => r.r !== 'miss').length;
      if (n) { if (e.p === 0) { stamp('g', 'COLPITO!', n > 1 ? n + ' colpi a segno' : ''); foeSay('hurt', 0.5); } else { stamp('b', 'COLPITO!', n > 1 ? n + ' colpi sulla tua flotta' : 'Il razzo ti ha preso'); foeSay('hit'); } await wait(1100); }
      else { floatTxt(B.x + (e.x + 0.5) * c, B.y + (e.y - 0.4) * c, 'Tutta acqua'); await wait(600); }
    }
  }
  // siluro: corre sott'acqua lungo la riga/colonna e segna acqua dove passa
  function torpFx(e, missIds) {
    const B = U.L.big, c = B.c, path = e.ids.map(id => cellC(B, id % N, (id / N) | 0)), endK = e.end < 0 ? N - 1 : e.end;
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][e.d], sx = path[0][0] - dir[0] * c * 0.9, sy = path[0][1] - dir[1] * c * 0.9;
    const ex = e.end < 0 ? path[N - 1][0] + dir[0] * c * 0.9 : path[endK][0] - dir[0] * c * 0.25, ey = e.end < 0 ? path[N - 1][1] + dir[1] * c * 0.9 : path[endK][1] - dir[1] * c * 0.25;
    const len = Math.hypot(ex - sx, ey - sy), dur = Math.max(0.5, len / (c * 9)), miss = new Set(missIds);
    sfx.torp();
    let x = sx, y = sy, last = 0, marked = 0;
    return actor({
      d: dur, up: k => {
        x = sx + (ex - sx) * k; y = sy + (ey - sy) * k;
        if (k - last > 0.02) { last = k; part({ k: 'bub', x: x - dir[0] * 8 + rnd(-3, 3), y: y - dir[1] * 8 + rnd(-3, 3), vx: 0, vy: 0, max: 0.9, r: rnd(1.2, 2.4) }); part({ k: 'wake', x: x - dir[0] * 4, y: y - dir[1] * 4, vx: -dir[1] * rnd(-6, 6), vy: dir[0] * rnd(-6, 6), max: 1.1, r: 3 }); }
        const done = Math.floor((k * len) / c - 0.4); while (marked <= Math.min(done, N - 1)) { const id = e.ids[marked]; if (miss.has(id)) U.dv[e.p][id] = 1; marked++; }
      },
      draw: g => {
        g.save(); g.translate(x, y); g.rotate(Math.atan2(dir[1], dir[0]));
        g.fillStyle = 'rgba(8,22,36,.75)'; rr(g, -11, -2.6, 16, 5.2, 2.6); g.fill();
        g.strokeStyle = 'rgba(230,245,255,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, -2); g.lineTo(-30, -7); g.moveTo(-12, 2); g.lineTo(-30, 7); g.stroke();
        g.restore();
      },
    });
  }
  // spostamento della mia nave (sul mio mare) o avviso della mossa nemica
  async function moveFx(e) {
    sfx.move();
    if (e.p === 0) {
      const s = U.mine[e.s], dx = e.x - e.fx, dy = e.y - e.fy, B = U.L.big;
      s.x = e.x; s.y = e.y; s.fu = e.fu; s.ox = -dx; s.oy = -dy;
      let last = 0;
      await actor({
        d: 0.8, up: k => {
          const q = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; s.ox = -dx * (1 - q); s.oy = -dy * (1 - q);
          if (k - last > 0.04 && k < 0.95) { last = k; const wx = B.x + (s.x + s.ox + (s.v ? 0.5 : dx > 0 ? 0 : dx < 0 ? s.n : s.n / 2)) * B.c, wy = B.y + (s.y + s.oy + (s.v ? (dy > 0 ? 0 : dy < 0 ? s.n : s.n / 2) : 0.5)) * B.c; part({ k: 'wake', x: wx + rnd(-3, 3), y: wy + rnd(-3, 3), vx: rnd(-8, 8), vy: rnd(-8, 8), max: 1, r: rnd(2.5, 4) }); }
        }, end: () => { s.ox = 0; s.oy = 0; },
      });
      await wait(250);
    } else {
      const fd = U.G.ev[U.evi] && U.G.ev[U.evi].t === 'fade' ? U.G.ev[U.evi] : null;
      stamp('c', 'MANOVRA!', fd && fd.ids.length ? 'La nave che avevi colpito e\' scappata' : FOES[U.o.lv].n + ' ha spostato una nave');
      foeSay('move', 0.7);
      await wait(400);
    }
  }
  async function fadeFx(e) {
    if (!e.ids.length) return;
    const B = rectOf(e.p === 0 ? 'E' : 'M');
    for (const id of e.ids) { U.dv[e.p][id] = 3; if (B === U.L.big) { const [cx, cy] = cellC(B, id % N, (id / N) | 0); part({ k: 'ring', x: cx, y: cy, vx: 0, vy: 0, max: 0.8, r0: B.c * 0.1, r1: B.c * 0.55 }); part({ k: 'smoke', lt: 1, x: cx, y: cy, vx: 0, vy: -6, max: 1, r: 5 }); } }
    draw(); await wait(e.p === 0 ? 1200 : 200);
  }

  // ---- tocchi ----
  function pos(ev) { const r = U.cv.getBoundingClientRect(); return [(ev.clientX - r.left) / U.k, (ev.clientY - r.top) / U.k]; }
  const inR = (px, py, B, w, h) => px >= B.x && py >= B.y && px < B.x + w && py < B.y + h;
  function down(ev) {
    if (!U || !U.L) return; const [px, py] = pos(ev), L = U.L;
    if (U.ph === 'place') {
      let k = plAt(px, py), from = 'grid', ox, oy;
      if (k >= 0) { const s = U.pl[k]; ox = px - (L.big.x + s.x * L.big.c); oy = py - (L.big.y + s.y * L.big.c); }
      else {
        from = 'tray';
        k = U.pl.findIndex((s, j) => { const [x, y] = trayXY(j); return s.x < 0 && px >= x - 6 && px < x + s.n * L.big.c + 6 && py >= y - 8 && py < y + L.big.c + 26; });
        if (k >= 0) { const [x, y] = trayXY(k); ox = Math.max(0, Math.min(px - x, U.pl[k].n * L.big.c)); oy = Math.max(0, Math.min(py - y, L.big.c)); }
      }
      if (k < 0) return;
      U.drag = { k, from, ox, oy, sx: px, sy: py, px: px - ox, py: py - oy, v: from === 'grid' ? U.pl[k].v : false, moved: false };
      try { U.cv.setPointerCapture(ev.pointerId); } catch (e) { }
      return;
    }
    if (U.ph !== 'play' || !U.G) return;
    if (U.busy) { if (!U.G.over) { U.skip = true; U.root.classList.add('nvFast'); } return; }
    if (U.G.turn !== 0) return;
    if (inR(px, py, L.mini, L.mini.w, L.mini.w)) { if (U.tool === 'move') { tool('shot'); return; } sfx.tap(); U.aim = null; setView(U.view === 'E' ? 'M' : 'E').then(refresh); refresh(); return; }
    const B = L.big;
    if (!inR(px, py, B, B.w, B.w)) return;
    const cx = Math.floor((px - B.x) / B.c), cy = Math.floor((py - B.y) / B.c);
    if (U.view === 'E') {
      if (U.tool === 'move') return;
      const m = U.dv[0][cy * N + cx];
      if (U.tool === 'shot' && (m === 2 || m === 4)) { sfx.no(); hint(m === 4 ? 'Li\' c\'e\' un relitto: mira altrove.' : 'Li\' hai gia\' colpito: mira altrove.', true); return; }
      if (U.aim && U.aim.x === cx && U.aim.y === cy) { fire(); return; }
      sfx.tap(); U.aim = { x: cx, y: cy }; refresh(); return;
    }
    if (U.tool !== 'move') { hint('Questa e\' la tua flotta: tocca il riquadro piccolo per tornare al mare nemico.', false); return; }
    // spostamento: tocca una nave, poi un punto verde (o trascina la nave)
    const k = U.mine.findIndex(s => !s.sunk && E.cells(s).some(([a, b]) => a === cx && b === cy));
    if (U.sel != null) {   // prima i punti verdi (anche quelli sopra la nave stessa, quando avanza di 1)
      const m = nearestMove(px, py, k === U.sel ? 0.45 : 0.9);
      if (m) { if (U.mvDest && U.mvDest.x === m.x && U.mvDest.y === m.y) { fire(); return; } sfx.tap(); U.mvDest = m; refresh(); return; }
    }
    if (k < 0) return;
    if (k === U.sel) { U.mdrag = { sx: px, sy: py }; try { U.cv.setPointerCapture(ev.pointerId); } catch (e) { } return; }
    if (!E.movesOf(U.G, 0, k).length) { sfx.no(); hint(U.mine[k].fu > 0 ? 'Questa nave e\' bloccata: non c\'e\' spazio per spostarla.' : 'Questa nave si e\' gia\' spostata (una volta sola a partita).', true); return; }
    sfx.tap(); U.sel = k; U.moves = E.movesOf(U.G, 0, k); U.mvDest = null; U.mdrag = { sx: px, sy: py };
    try { U.cv.setPointerCapture(ev.pointerId); } catch (e) { }
    refresh();
  }
  function nearestMove(px, py, maxCells) {
    const B = U.L.big, s = U.mine[U.sel]; let best = null, bd = 1e9;
    for (const m of U.moves) { const cx = B.x + (m.x + (s.v ? 0.5 : s.n / 2)) * B.c, cy = B.y + (m.y + (s.v ? s.n / 2 : 0.5)) * B.c, d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = m; } }
    return bd <= maxCells * B.c ? best : null;
  }
  function move(ev) {
    if (!U || !U.L) return; const [px, py] = pos(ev);
    const d = U.drag;
    if (U.ph === 'place' && d) {
      if (!d.moved && Math.hypot(px - d.sx, py - d.sy) > 7) d.moved = true;
      if (d.moved) { d.px = px - d.ox; d.py = py - d.oy - (ev.pointerType === 'touch' ? 26 : 0); draw(); }
      return;
    }
    if (U.ph === 'play' && U.mdrag && U.sel != null && Math.hypot(px - U.mdrag.sx, py - U.mdrag.sy) > 8) {
      const s = U.mine[U.sel], B = U.L.big, cx0 = B.x + (s.x + (s.v ? 0.5 : s.n / 2)) * B.c, cy0 = B.y + (s.y + (s.v ? s.n / 2 : 0.5)) * B.c;
      const m = nearestMove(cx0 + px - U.mdrag.sx, cy0 + py - U.mdrag.sy, 1.2);
      if (m && m !== U.mvDest) { U.mvDest = m; refresh(); }
    }
  }
  function up(ev) {
    if (!U) return;
    const d = U.drag;
    if (U.ph === 'place' && d) {
      U.drag = null;
      const s = U.pl[d.k];
      if (!d.moved) { if (d.from === 'grid') rotate(d.k); else { hint('Trascina la nave nel mare.', true); draw(); } return; }
      const sn = snap(d);
      if (sn && sn.ok) { s.x = sn.x; s.y = sn.y; s.v = d.v; s.f = s.v ? -1 : 1; sfx.tap(); }
      else if (d.from === 'grid') { const [, py] = pos(ev); if (py >= U.L.lo.y - 10) { s.x = -1; s.y = -1; s.v = false; s.f = 1; sfx.tap(); } else sfx.no(); }
      else if (sn) sfx.no();
      placeUi(); return;
    }
    U.mdrag = null;
  }

  // ---- fine partita ----
  async function finish() {
    const G = U.G, won = G.win === 0;
    U.busy = true; refresh();
    await wait(700);
    if (!U || U.G !== G) return;
    const rec = st().nvSt || (st().nvSt = [0, 0]); rec[1]++; if (won) rec[0]++; save();
    info(pick(FOES[U.o.lv].say[won ? 'lose' : 'win']));
    if (won) sfx.win(); else sfx.lose();
    const A = G.P[0], pct = A.st.sh ? Math.round(A.st.hit / A.st.sh * 100) : 0;
    const ov = overlay(`<div class="nvBox"><h2>${won ? 'Vittoria!' : G.win === -2 ? 'Pareggio' : 'Flotta affondata'}</h2><p>${won ? 'Hai affondato tutta la flotta di ' + esc(FOES[U.o.lv].n) + '.' : G.win === -2 ? 'Troppi turni: finisce pari.' : esc(FOES[U.o.lv].n) + ' ha affondato tutte le tue navi.'}</p>
      <div class="nvRows"><div><span>Colpi a segno</span><b>${A.st.hit} su ${A.st.sh} (${pct}%)</b></div><div><span>Razzi e siluri usati</span><b>${A.st.r} e ${A.st.s}</b></div><div><span>Spostamenti</span><b>${A.st.mv}</b></div><div><span>Turni giocati</span><b>${Math.ceil(G.tn / 2)}</b></div></div>
      <button type="button" class="big pr" data-k="r">Rivincita</button><button type="button" class="big" data-k="v">Guarda il mare nemico</button><button type="button" class="big" data-k="s">Cambia avversario</button><button type="button" class="big" data-k="x">Esci</button></div>`);
    ov.querySelector('[data-k=r]').onclick = () => { ov.remove(); place(st().nvFleet); };
    ov.querySelector('[data-k=v]').onclick = () => {
      ov.style.display = 'none'; U.reveal = true; U.view = 'E'; draw(); hint('Ecco dov\'erano le navi nemiche. Tocca per tornare.', true);
      setTimeout(() => U && U.root.addEventListener('pointerdown', () => { ov.style.display = ''; }, { once: true }), 50);
    };
    ov.querySelector('[data-k=s]').onclick = () => { ov.remove(); setup(); };
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }
  function askExit() {
    const G = U.G;
    if (U.ph !== 'play' || !G || G.over) { stop(); return; }
    const ov = overlay(`<div class="nvBox"><h2>Lasci la battaglia?</h2><p>La partita finisce qui.</p><button type="button" class="big pr" data-k="s">Resto a combattere</button><button type="button" class="big" data-k="x">Esco</button></div>`);
    ov.querySelector('[data-k=s]').onclick = () => ov.remove();
    ov.querySelector('[data-k=x]').onclick = () => stop();
  }

  function start(opt = {}) {
    if (U) stop(true);
    const root = document.createElement('div'); root.id = 'nvT';
    root.innerHTML = `<div id="nvW"><div id="nvS"><canvas id="nvC"></canvas>
      <div id="nvTop" class="nvA"><button type="button" data-k="x">Esci</button><div class="info"></div><button type="button" data-k="ru">Regole</button></div>
      <div id="nvStamp" class="nvA"></div><div id="nvHint" class="nvA"></div><div id="nvTools" class="nvA"></div><button type="button" id="nvFire" class="nvA"></button></div></div>`;
    document.body.appendChild(root);
    U = { root, opt, S: root.querySelector('#nvS'), cv: root.querySelector('#nvC'), o: { lv: +((st().nvOpt || {}).lv || DEF.lv) }, act: [], pt: [], sea: {}, dv: [null, null], ewr: [], pl: [], ph: 'menu', view: 'M', shk: 0, sayUntil: 0 };
    U.g = U.cv.getContext('2d');
    U.pl = E.FLEET.map(t => ({ t, n: T[t].n, x: -1, y: -1, v: false, f: 1 }));
    root.querySelector('#nvTop [data-k=x]').onclick = askExit;
    root.querySelector('#nvTop [data-k=ru]').onclick = rules;
    U.cv.addEventListener('pointerdown', down); U.cv.addEventListener('pointermove', move); U.cv.addEventListener('pointerup', up); U.cv.addEventListener('pointercancel', up);
    U.onRs = () => layout(); addEventListener('resize', U.onRs);
    layout(); setup();
  }
  function stop(silent) {
    if (!U) return; const cb = U.opt.onExit;
    removeEventListener('resize', U.onRs); if (U.raf) cancelAnimationFrame(U.raf);
    clearTimeout(U.sayT); U.root.remove(); U = null; if (!silent && cb) cb();
  }
  window.NV = { start, stop, get U() { return U; } };
})();
