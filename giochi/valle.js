// ==== LA VALLE DEI CLAN: disegni (tessere, animali, omini, palafitte) ====
// Ogni tessera si disegna col canvas UNA VOLTA per (tipo, rotazione, misura) e poi si incolla: niente ridisegni a ogni fotogramma.
// La tessera "logica" e' S x S unita'. Il prato e il bosco usano un rumore PERIODICO sulla misura della tessera e la tessera
// si disegna gia' ruotata (la grafica non gira con la tela): cosi' i bordi di tessere vicine combaciano senza cuciture.
// Anche gli alberi stanno su una griglia periodica: ogni tessera disegna pure gli alberi "fantasma" appena fuori dai suoi bordi
// di bosco, che sono gli stessi della tessera accanto, cosi' le chiome non si vedono tagliate.
// Definizione di una tessera (D):
//   e: 'bpfp'  bordi N E S O (b bosco, p prato, f fiume nel mezzo del lato con prato ai fianchi)
//   fz: [[0], [2, 3]]  boschi: per ognuno i lati che tocca (lati dello stesso bosco = bosco unito)
//   rv: [{ e: [3, 1], p: 2 }, { e: [0], end: 's' }]  fiumi: lati, pesci, fine dentro la tessera ('s' sorgente, 'l' lago)
//   lake: { p: 3 }  lago al centro (con i pesci)
//   ob: [{ k: 'cav'|'bis'|'rin'|'orso'|'ambra', x, y, f: 1|-1 }]  animali e ambra (f = verso dove guarda)
(() => {
  const S = 200, TAU = Math.PI * 2, INK = '#2a2118';
  const CPU = typeof CQ_CPU !== 'undefined' ? CQ_CPU : { willReadFrequently: true };
  const MID = [[100, 0], [200, 100], [100, 200], [0, 100]], NRM = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const RW = 24;                       // larghezza dell'acqua dei fiumi (uguale su tutte le tessere)
  const RB = 50, RC = 36, AMP = 7;     // bosco: profondita' dal lato, raggio verso il centro, ondulazione
  const cache = new Map();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---- rumore periodico ----
  const hash = (i, j, k) => { const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); };
  const hp = (i, j, s) => hash(((i % s) + s) % s, ((j % s) + s) % s, s);
  function vn(x, y, s) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hp(i, j, s), b = hp(i + 1, j, s), c = hp(i, j + 1, s), d = hp(i + 1, j + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const PER = 8, Q = PER / S;
  const fbm = (x, y) => 0.55 * vn(x * Q, y * Q, PER) + 0.3 * vn(x * Q * 2, y * Q * 2, PER * 2) + 0.15 * vn(x * Q * 4, y * Q * 4, PER * 4);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const strSeed = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---- rotazione della definizione (di r quarti di giro in senso orario) ----
  const rp = (x, y, r) => { for (let i = 0; i < r; i++) [x, y] = [S - y, x]; return [x, y]; };
  function rotDef(D, r) {
    r = ((r % 4) + 4) % 4; if (!r) return D;
    const re = a => a.map(e => (e + r) % 4), e = [0, 1, 2, 3].map(i => D.e[(i - r + 4) % 4]).join('');
    return {
      id: D.id, e, fz: (D.fz || []).map(re), rv: (D.rv || []).map(z => Object.assign({}, z, { e: re(z.e) })), lake: D.lake,
      ob: (D.ob || []).map(o => { const [x, y] = rp(o.x, o.y, r); return Object.assign({}, o, { x, y }); }),
    };
  }

  // ---- bosco: campo > 0 dentro ----
  const tap = u => u >= 0.5 ? 1 : Math.pow(Math.sin(u / 0.5 * Math.PI / 2), 0.55);
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }
  function forestF(D, x, y) {
    if (!D.fz || !D.fz.length) return -99;
    const cx = clamp(x, 0, S), cy = clamp(y, 0, S), nz = (fbm(2 * cx + 73, 2 * cy + 19) - 0.5) * 2.2;
    let best = -99;
    for (const z of D.fz) {
      if (z.length === 4) return 60;
      let v = -99;
      for (const e of z) {
        let t, d;
        if (e === 0) { t = cx / S; d = cy; } else if (e === 1) { t = cy / S; d = S - cx; } else if (e === 2) { t = 1 - cx / S; d = S - cy; } else { t = 1 - cy / S; d = cx; }
        const g = (z.includes((e + 3) % 4) ? 1 : tap(t)) * (z.includes((e + 1) % 4) ? 1 : tap(1 - t)), r = RB * g;
        v = Math.max(v, r + nz * AMP * Math.min(1, r / 14) - d);
      }
      if (z.length > 1) for (const e of z) v = Math.max(v, RC + nz * AMP - segDist(cx, cy, MID[e][0], MID[e][1], 100, 100));
      best = Math.max(best, v);
    }
    return best;
  }

  // ---- fiumi: curve di Bezier dal mezzo di un lato ----
  function rivers(D) {
    const out = [];
    for (const z of D.rv || []) {
      const segs = [];
      if (z.e.length === 2 && !z.end) {
        const [a, b] = z.e, A = MID[a], B = MID[b], L = (a + 2) % 4 === b ? 66 : 55;
        segs.push([A, [A[0] + NRM[a][0] * L, A[1] + NRM[a][1] * L], [B[0] + NRM[b][0] * L, B[1] + NRM[b][1] * L], B]);
      } else for (const a of z.e) {
        const A = MID[a], C = [100, 100];
        segs.push([A, [A[0] + NRM[a][0] * 30, A[1] + NRM[a][1] * 30], [C[0] - NRM[a][0] * 30, C[1] - NRM[a][1] * 30], C]);
      }
      out.push({ z, segs });
    }
    return out;
  }
  const bez = (s, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * s[0][i] + 3 * u * u * t * s[1][i] + 3 * u * t * t * s[2][i] + t * t * t * s[3][i]); };
  const bezA = (s, t) => { const a = bez(s, Math.max(0, t - 0.01)), b = bez(s, Math.min(1, t + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  function waterPts(D, R) {   // punti per tenere lontani erba e alberi dall'acqua
    const p = [];
    for (const r of R) for (const s of r.segs) for (let i = 0; i <= 24; i++) { const q = bez(s, i / 24); p.push([q[0], q[1], RW / 2 + 5]); }
    if (D.lake) p.push([100, 100, 60]);
    for (const r of R) if (r.z.end === 's') p.push([100, 100, 26]);
    return p;
  }
  const nearWater = (W, x, y, m) => W.some(q => Math.hypot(x - q[0], y - q[1]) < q[2] + m);

  // ---- colori ----
  const M0 = [128, 186, 82], M1 = [156, 204, 98];          // prato
  const F0 = [52, 92, 40], F1 = [70, 112, 50];             // terra del bosco
  const LEAF = ['#4f8a34', '#5a9638', '#467f30', '#62a03e', '#54913a'];
  const PINE = ['#2f6030', '#356b34', '#2b5a2e'];

  function base(g, D, P) {
    const k = P / S, img = g.createImageData(P, P), d = img.data;
    for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) {
      const x = (px + 0.5) / k, y = (py + 0.5) / k, n = fbm(x, y), n2 = fbm(x * 3 + 11, y * 3 + 5);
      let r = M0[0] + (M1[0] - M0[0]) * n, gg = M0[1] + (M1[1] - M0[1]) * n, b = M0[2] + (M1[2] - M0[2]) * n;
      const lt = (n2 - 0.5) * 14; r += lt; gg += lt; b += lt * 0.5;
      if (D.fz && D.fz.length) {
        const f = forestF(D, x, y), sh = forestF(D, x - 5, y - 7);
        if (sh > -6) { const s = clamp((sh + 6) / 10, 0, 1) * 0.3; r *= 1 - s; gg *= 1 - s * 0.8; b *= 1 - s * 0.6; }
        const a = clamp(f / (1.6 / k) + 0.5, 0, 1);
        if (a > 0) {
          const fr = F0[0] + (F1[0] - F0[0]) * n2, fg = F0[1] + (F1[1] - F0[1]) * n2, fb = F0[2] + (F1[2] - F0[2]) * n2;
          r += (fr - r) * a; gg += (fg - gg) * a; b += (fb - b) * a;
        }
      }
      const o = (py * P + px) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  // ---- erba, fiori, sassi ----
  function meadowBits(g, D, R, W, rnd) {
    const ok = (x, y, m) => x > 9 && x < S - 9 && y > 9 && y < S - 9 && forestF(D, x, y) < -8 && !nearWater(W, x, y, m) &&
      !(D.ob || []).some(o => Math.hypot(o.x - x, o.y - 12 - y) < 26);
    g.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const x = rnd() * S, y = rnd() * S; if (!ok(x, y, 4)) continue;
      g.strokeStyle = 'rgba(70,120,40,.55)'; g.lineWidth = 1.3; g.beginPath();
      for (let j = -1; j <= 1; j++) { g.moveTo(x + j * 2, y); g.lineTo(x + j * 3.2, y - 4.5 - (j ? 0 : 1.5)); }
      g.stroke();
    }
    const FL = ['#fff6e0', '#ffe27a', '#f7b6c8', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      const x = rnd() * S, y = rnd() * S; if (!ok(x, y, 6)) continue;
      g.fillStyle = FL[(rnd() * FL.length) | 0];
      for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.3, 0, TAU); g.fill(); }
      g.fillStyle = '#e0a020'; g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = rnd() * S, y = rnd() * S; if (!ok(x, y, 6)) continue;
      const rx = 2.5 + rnd() * 2.5;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 1, y + 1.2, rx, rx * 0.6, 0, 0, TAU); g.fill();
      g.fillStyle = '#b9b3a4'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.62, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - rx * 0.2, rx * 0.45, rx * 0.25, 0, 0, TAU); g.fill();
    }
  }

  // ---- acqua: fiumi, laghi, sorgenti ----
  function lakePath(g, cx, cy, R, off, seed) {
    const p1 = hash(seed, 1, 3) * TAU, p2 = hash(seed, 2, 5) * TAU;
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU, r = R * (1 + 0.08 * Math.sin(3 * a + p1) + 0.05 * Math.sin(5 * a + p2)) + off;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }
  function water(g, D, R, rnd) {
    const springs = R.filter(r => r.z.end === 's'), seed = strSeed(D.id || 'x');
    const line = (w, c) => {
      g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round';
      for (const r of R) for (const s of r.segs) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); g.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]); g.stroke(); }
    };
    const pools = (off, c) => {
      g.fillStyle = c;
      if (D.lake) { lakePath(g, 100, 100, 48, off, seed); g.fill(); }
      for (const s of springs) { lakePath(g, 100, 100, 14, off, seed + 9); g.fill(); }
    };
    line(RW + 13, 'rgba(40,80,30,.35)'); pools(7, 'rgba(40,80,30,.35)');      // ombra della riva
    line(RW + 8, '#d9d49c'); pools(4.5, '#d9d49c');                           // sabbia
    line(RW, '#3f97d3'); line(RW * 0.5, 'rgba(120,200,240,.55)');             // acqua del fiume
    pools(0, '#3f97d3'); pools(-12, 'rgba(120,200,240,.5)');                  // laghi e sorgenti sopra (la striscia chiara finisce alla riva)
    // riflessi (lontani dai lati della tessera)
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (const r of R) for (const s of r.segs) for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.2 + rnd() * 0.05, q = bez(s, t), a = bezA(s, t), side = (i % 2 ? 1 : -1) * RW * 0.22;
      const x = q[0] - Math.sin(a) * side, y = q[1] + Math.cos(a) * side;
      if (x < 12 || x > S - 12 || y < 12 || y > S - 12 || (D.lake && Math.hypot(x - 100, y - 100) < 50)) continue;
      g.beginPath(); g.moveTo(x - Math.cos(a) * 3.5, y - Math.sin(a) * 3.5); g.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5); g.stroke();
    }
    if (D.lake) {
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, x = 100 + Math.cos(a) * 30, y = 100 + Math.sin(a) * 26; g.beginPath(); g.arc(x, y, 5, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); }
      reeds(g, seed);
    }
    for (const s of springs) {   // sassi attorno alla sorgente + bollicine
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + 0.3, rr = 19 + (i % 2) * 1.5, x = 100 + Math.cos(a) * rr, y = 100 + Math.sin(a) * rr * 0.92, sz = 3.4 + (i * 7 % 3);
        if (D.rv.some(r => r.z === undefined)) continue;
        // niente sasso dove esce il fiume
        if (s.z.e.some(e => { const n = NRM[e]; return Math.cos(a) * -n[0] + Math.sin(a) * -n[1] > 0.8; })) continue;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, sz, sz * 0.7, 0, 0, TAU); g.fill();
        g.fillStyle = '#a9a49a'; g.beginPath(); g.ellipse(x, y, sz, sz * 0.72, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(x - sz * 0.3, y - sz * 0.25, sz * 0.4, sz * 0.22, 0, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2;
      for (const [dx, dy, r] of [[-3, -2, 2.2], [3, 1, 1.6], [0, 4, 1.2]]) { g.beginPath(); g.arc(100 + dx, 100 + dy, r, 0, TAU); g.stroke(); }
    }
  }
  function reeds(g, seed) {
    for (let i = 0; i < 4; i++) {
      const a = hash(seed, i, 7) * TAU, x = 100 + Math.cos(a) * 50, y = 100 + Math.sin(a) * 46;
      for (let j = 0; j < 4; j++) {
        const bx = x + (j - 1.5) * 2.4, h = 9 + (j % 2) * 3;
        g.strokeStyle = '#3d6b2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + 1, y - h * 0.6, bx + (j - 1.5), y - h); g.stroke();
        if (j % 2) { g.fillStyle = '#7a4a25'; g.beginPath(); g.ellipse(bx + (j - 1.5), y - h, 1.3, 2.6, 0, 0, TAU); g.fill(); }
      }
    }
  }

  // ---- pesci (visti dall'alto, nell'acqua) ----
  function fish(g, x, y, a, s = 1) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    const body = () => { g.beginPath(); g.ellipse(0, 0, 8.5, 3.4, 0, 0, TAU); g.moveTo(-6.5, 0); g.lineTo(-12.5, -3.8); g.lineTo(-11, 0); g.lineTo(-12.5, 3.8); g.closePath(); };
    g.fillStyle = 'rgba(20,60,110,.35)'; g.save(); g.translate(1.2, 1.6); body(); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.6; g.lineJoin = 'round'; body(); g.stroke();
    g.fillStyle = '#f08a4b'; body(); g.fill();
    g.strokeStyle = '#8a3c18'; g.lineWidth = 0.9; body(); g.stroke();
    g.fillStyle = '#c4582a'; g.beginPath(); g.ellipse(0, -0.8, 6.5, 1.3, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffe2c4'; g.beginPath(); g.ellipse(1, 1.4, 5, 1, 0, 0, TAU); g.fill();
    g.fillStyle = '#1d140c'; g.beginPath(); g.arc(5.6, -0.9, 0.9, 0, TAU); g.fill();
    g.restore();
  }
  function fishes(g, D, R) {
    for (const r of R) {
      const n = r.z.p || 0; if (!n) continue;
      const s = r.segs[0], t0 = 0.2, t1 = r.z.end || r.segs.length > 1 ? 0.55 : 0.8;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? (t0 + t1) / 2 : t0 + (t1 - t0) * i / (n - 1), q = bez(s, t), a = bezA(s, t), side = (i % 2 ? 1 : -1) * 3.2;
        fish(g, q[0] - Math.sin(a) * side, q[1] + Math.cos(a) * side, a + (i % 2 ? Math.PI : 0));
      }
    }
    if (D.lake && D.lake.p) {
      const n = D.lake.p;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.5; fish(g, 100 + Math.cos(a) * 24, 100 + Math.sin(a) * 20, a + Math.PI / 2, 1.05); }
    }
  }

  // ---- alberi (griglia periodica, anche fuori dai lati del bosco) ----
  function trees(g, D, W) {
    if (!D.fz || !D.fz.length) return;
    const N = 13, SP = S / N, list = [];
    for (let j = -2; j <= N + 1; j++) for (let i = -2; i <= N + 1; i++) {
      const ci = ((i % N) + N) % N, cj = ((j % N) + N) % N;
      const x = (i + 0.15 + 0.7 * hash(ci, cj, 1)) * SP, y = (j + 0.15 + 0.7 * hash(ci, cj, 2)) * SP;
      if (x < -16 || x > S + 16 || y < -16 || y > S + 16) continue;
      if (forestF(D, x, y) < 5 || nearWater(W, x, y, 6)) continue;
      list.push({ x, y, r: 9 + 4 * hash(ci, cj, 3), pine: hash(ci, cj, 4) < 0.22, c: hash(ci, cj, 5) });
    }
    list.sort((a, b) => a.y - b.y || a.x - b.x);
    g.fillStyle = 'rgba(10,30,5,.28)';
    for (const t of list) { g.beginPath(); g.ellipse(t.x + 3, t.y + 4.5, t.r, t.r * 0.85, 0, 0, TAU); g.fill(); }
    for (const t of list) t.pine ? pine(g, t) : round(g, t);
  }
  function round(g, t) {
    const { x, y, r } = t, c = LEAF[(t.c * LEAF.length) | 0];
    g.fillStyle = c; g.strokeStyle = '#23401b'; g.lineWidth = 1.1;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(20,50,10,.28)'; g.beginPath(); g.arc(x + r * 0.22, y + r * 0.25, r * 0.78, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x - r * 0.12, y - r * 0.12, r * 0.74, 0, TAU); g.fill();
    g.fillStyle = 'rgba(200,240,140,.32)';
    for (const [dx, dy, s] of [[-0.35, -0.35, 0.36], [0.15, -0.45, 0.24], [-0.5, 0.05, 0.22]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, r * s, 0, TAU); g.fill(); }
  }
  function pine(g, t) {
    const { x, y } = t, r = t.r * 1.05, c = PINE[(t.c * PINE.length) | 0];
    const star = (rr, k) => { g.beginPath(); for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU + t.c * 3, q = i % 2 ? rr * k : rr; i ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); };
    g.fillStyle = c; g.strokeStyle = '#1b3518'; g.lineWidth = 1.1; star(r, 0.74); g.fill(); g.stroke();
    g.fillStyle = 'rgba(120,180,90,.35)'; star(r * 0.62, 0.7); g.fill();
    g.fillStyle = 'rgba(170,220,120,.4)'; g.beginPath(); g.arc(x - r * 0.12, y - r * 0.12, r * 0.18, 0, TAU); g.fill();
  }

  // ---- figure a pezzi: contorno unico (bianco + inchiostro), poi colori ----
  function parts(g, P, rim) {
    const path = p => {
      g.beginPath();
      if (p.t === 'el') g.ellipse(p.x, p.y, p.rx, p.ry, p.a || 0, 0, TAU);
      else if (p.t === 'pg' || p.t === 'ln') { p.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (p.t === 'pg') g.closePath(); }
      else if (p.t === 'fn') p.f(g);
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    const pass = (col, ext) => {
      for (const p of P) {
        if (p.no) continue; path(p);
        g.strokeStyle = col;
        if (p.t === 'ln') { g.lineWidth = p.w + ext; g.stroke(); } else { g.fillStyle = col; g.fill(); g.lineWidth = ext; g.stroke(); }
      }
    };
    if (rim) pass(rim, 5.2);
    pass(INK, 2.3);
    for (const p of P) {
      path(p);
      if (p.t === 'ln') { g.strokeStyle = p.c; g.lineWidth = p.w; g.stroke(); }
      else { g.fillStyle = p.c; g.fill(); if (p.s) { g.strokeStyle = p.s; g.lineWidth = p.sw || 1; g.stroke(); } }
    }
  }
  const dot = (x, y, r, c) => ({ t: 'el', x, y, rx: r, ry: r, c, no: 1 });

  // ---- animali (di profilo, guardano a destra, zampe a terra in y = 0) ----
  const ANIM = {
    cav: () => [   // cavallo selvatico (preda dell'orso)
      { t: 'ln', p: [[-10, -18], [-12, 0]], w: 3.4, c: '#7c5630' }, { t: 'ln', p: [[9, -18], [11, 0]], w: 3.4, c: '#7c5630' },
      { t: 'fn', f: g => { g.moveTo(-15, -25); g.quadraticCurveTo(-24, -22, -22, -5); g.quadraticCurveTo(-18, -16, -14, -20); }, c: '#3b2716' },
      { t: 'el', x: 0, y: -22, rx: 17, ry: 8.5, c: '#c8955a' },
      { t: 'ln', p: [[-7, -18], [-8, -1]], w: 3.8, c: '#c8955a' }, { t: 'ln', p: [[12, -18], [13.5, -1]], w: 3.8, c: '#c8955a' },
      { t: 'pg', p: [[6, -28], [16, -43], [24, -38], [16, -20]], c: '#c8955a' },
      { t: 'el', x: 24, y: -37, rx: 8.5, ry: 4.6, a: 0.6, c: '#c8955a' },
      { t: 'pg', p: [[17.5, -43], [19.5, -49], [21.5, -42.5]], c: '#c8955a' },
      { t: 'ln', p: [[-8, -2], [-8, 0]], w: 3.8, c: '#3b2716', no: 1 }, { t: 'ln', p: [[13.4, -3], [13.5, 0]], w: 3.8, c: '#3b2716', no: 1 },
      { t: 'ln', p: [[7, -29], [17.5, -44]], w: 3.6, c: '#3b2716', no: 1 },
      { t: 'el', x: 1, y: -17.5, rx: 12, ry: 3, c: 'rgba(250,228,190,.7)', no: 1 },
      { t: 'el', x: 28.5, y: -33.5, rx: 3.6, ry: 2.6, a: 0.6, c: '#efd3a6', no: 1 },
      { t: 'el', x: -3, y: -27.5, rx: 9, ry: 2, c: 'rgba(255,240,210,.35)', no: 1 },
      dot(22.6, -39.6, 1.1, INK),
    ],
    bis: () => [   // bisonte
      { t: 'ln', p: [[-10, -14], [-11, 0]], w: 4.2, c: '#4a2c18' }, { t: 'ln', p: [[8, -14], [9, 0]], w: 4.2, c: '#4a2c18' },
      { t: 'ln', p: [[-17, -21], [-21, -11]], w: 1.6, c: '#4a2c18' }, { t: 'el', x: -21, y: -10, rx: 1.8, ry: 2.6, c: '#3a2010' },
      { t: 'el', x: -4, y: -19, rx: 15, ry: 9, c: '#6a4127' },
      { t: 'el', x: 8, y: -24, rx: 12.5, ry: 12, c: '#8b5a33' },
      { t: 'ln', p: [[-7, -14], [-7, 0]], w: 4.6, c: '#6a4127' }, { t: 'ln', p: [[11, -14], [12, 0]], w: 5, c: '#8b5a33' },
      { t: 'el', x: 19.5, y: -15, rx: 7, ry: 7.2, c: '#4a2c18' },
      { t: 'el', x: 19.5, y: -8, rx: 4, ry: 4.4, c: '#3a2010' },
      { t: 'ln', p: [[16.5, -20], [17, -24.5], [20.5, -25.5]], w: 2.4, c: '#efe4c8' },
      { t: 'ln', p: [[-7, -1.5], [-7, 0]], w: 4.6, c: '#2a160a', no: 1 }, { t: 'ln', p: [[12, -1.5], [12, 0]], w: 5, c: '#2a160a', no: 1 },
      { t: 'fn', f: g => { for (const [x, y] of [[4, -31], [9, -33], [13, -29], [6, -25], [11, -22]]) { g.moveTo(x, y); g.lineTo(x + 2, y + 3); } }, t2: 1, c: '#a87447', no: 1 },
      { t: 'el', x: -6, y: -24.5, rx: 8, ry: 2, c: 'rgba(255,220,180,.18)', no: 1 },
      dot(22.4, -17.2, 1.1, '#f2e6c8'), dot(22.6, -17.2, 0.6, INK),
    ],
    rin: () => [   // rinoceronte lanoso
      { t: 'ln', p: [[-12, -12], [-12, 0]], w: 6, c: '#6f5c44' }, { t: 'ln', p: [[9, -12], [9.5, 0]], w: 6, c: '#6f5c44' },
      { t: 'ln', p: [[-21, -21], [-24, -15]], w: 1.6, c: '#6f5c44' },
      { t: 'el', x: -2, y: -20, rx: 21, ry: 12, c: '#9a8466' },
      { t: 'ln', p: [[-7, -12], [-7, 0]], w: 6.4, c: '#9a8466' }, { t: 'ln', p: [[13, -12], [13.5, 0]], w: 6.4, c: '#9a8466' },
      { t: 'el', x: 21, y: -14, rx: 10, ry: 7, a: 0.3, c: '#8a7458' },
      { t: 'fn', f: g => { g.moveTo(25, -18); g.quadraticCurveTo(31, -22, 35, -33); g.quadraticCurveTo(33, -20, 30, -14); g.closePath(); }, c: '#efe3c4' },
      { t: 'fn', f: g => { g.moveTo(19, -20); g.quadraticCurveTo(21, -23, 22.5, -27); g.quadraticCurveTo(23.5, -22, 23.5, -19); g.closePath(); }, c: '#efe3c4' },
      { t: 'el', x: 14.5, y: -22, rx: 2.2, ry: 3.4, a: -0.4, c: '#8a7458' },
      { t: 'fn', f: g => { g.lineWidth = 1.6; for (let i = 0; i < 7; i++) { const x = -18 + i * 5.5; g.moveTo(x, -9.5); g.lineTo(x + 2.5, -6.5); g.lineTo(x + 5, -9.5); } }, c: '#c2ad8a', no: 1, t2: 1 },
      { t: 'fn', f: g => { for (let i = 0; i < 6; i++) { const x = -16 + i * 6; g.moveTo(x, -30 + Math.abs(i - 2.5)); g.quadraticCurveTo(x + 3, -33 + Math.abs(i - 2.5), x + 6, -30 + Math.abs(i - 2.5)); } }, c: '#b9a483', no: 1, t2: 1 },
      { t: 'ln', p: [[-7, -1.5], [-7, 0]], w: 6.4, c: '#3a2e20', no: 1 }, { t: 'ln', p: [[13.4, -1.5], [13.5, 0]], w: 6.4, c: '#3a2e20', no: 1 },
      dot(19.2, -16.2, 1.1, INK),
    ],
    orso: () => [   // orso (il predatore: mangia un cavallo)
      { t: 'ln', p: [[-10, -12], [-10, 0]], w: 5.6, c: '#4d2c16' }, { t: 'ln', p: [[8, -12], [8.5, 0]], w: 5.6, c: '#4d2c16' },
      { t: 'el', x: -2, y: -17, rx: 16, ry: 9.5, c: '#7a4a2a' },
      { t: 'el', x: 6, y: -21, rx: 9.5, ry: 8.5, c: '#7a4a2a' },
      { t: 'ln', p: [[-6, -12], [-6, 0]], w: 6, c: '#7a4a2a' }, { t: 'ln', p: [[12, -12], [13, 0]], w: 6, c: '#7a4a2a' },
      { t: 'el', x: 15, y: -25.5, rx: 2.8, ry: 2.8, c: '#6d4123' }, { t: 'el', x: 20.5, y: -26.5, rx: 2.8, ry: 2.8, c: '#6d4123' },
      { t: 'el', x: 18.5, y: -19, rx: 7.2, ry: 6.6, c: '#6d4123' },
      { t: 'el', x: 24.5, y: -16.8, rx: 4.6, ry: 3.2, c: '#b38257' },
      dot(28.6, -17.6, 1.5, '#1a0f08'), dot(15, -25.5, 1.2, '#b38257'), dot(20.5, -26.5, 1.2, '#b38257'),
      { t: 'ln', p: [[-6, -1.6], [-6, 0]], w: 6, c: '#3a200e', no: 1 }, { t: 'ln', p: [[13, -1.6], [13, 0]], w: 6, c: '#3a200e', no: 1 },
      { t: 'el', x: -4, y: -23.5, rx: 9, ry: 2, c: 'rgba(255,210,160,.2)', no: 1 },
      dot(20.6, -21, 1.3, '#f6e7c8'), dot(20.9, -21, 0.75, INK),
    ],
  };
  function animal(g, k, x, y, s = 1, f = 1) {
    g.save(); g.translate(x, y); g.scale(s * f, s);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, 0.5, 21, 4, 0, 0, TAU); g.fill();
    const P = ANIM[k]();
    // i pezzi 'fn' con t2 sono solo tratti (ciuffi): li disegno a mano dopo
    parts(g, P.filter(p => !p.t2), null);
    for (const p of P.filter(p => p.t2)) { g.beginPath(); p.f(g); g.strokeStyle = p.c; g.lineWidth = g.lineWidth || 1.3; g.stroke(); }
    g.restore();
  }
  function amber(g, x, y, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 17); gr.addColorStop(0, 'rgba(255,200,80,.75)'); gr.addColorStop(1, 'rgba(255,170,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill();
    const drop = () => { g.beginPath(); g.moveTo(0, -10); g.bezierCurveTo(5, -4, 8, 1, 7, 4.5); g.bezierCurveTo(5.5, 9.5, -5.5, 9.5, -7, 4.5); g.bezierCurveTo(-8, 1, -5, -4, 0, -10); g.closePath(); };
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; drop(); g.stroke();
    const lg = g.createLinearGradient(-6, -8, 6, 9); lg.addColorStop(0, '#ffd866'); lg.addColorStop(0.55, '#f59a1e'); lg.addColorStop(1, '#c8600c');
    g.fillStyle = lg; drop(); g.fill(); g.strokeStyle = '#7a3a08'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(90,40,8,.55)'; g.beginPath(); g.ellipse(0.5, 3, 1.6, 1, 0.4, 0, TAU); g.fill();   // insettino dentro l'ambra
    g.strokeStyle = 'rgba(90,40,8,.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-1.5, 2); g.lineTo(-3, 0.5); g.moveTo(2.5, 2); g.lineTo(4, 0.5); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-2.6, -2.5, 1.5, 3, 0.5, 0, TAU); g.fill();
    g.restore();
  }

  // ---- omini del clan: 'pesca' (pescatore), 'racc' (raccoglitrice), 'cacc' (cacciatore, sdraiato nel prato) ----
  const SKIN = '#e9b588', HAIR = '#3b2416', FUR = '#f3e7cc', WOOD = '#8b5a2b';
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f), 0, 255)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  function meeplePts(col, role) {
    const P = [];
    if (role === 'pesca') P.push({ t: 'ln', p: [[11, -40], [11, 1]], w: 1.9, c: WOOD }, { t: 'pg', p: [[9.2, -39], [11, -46], [12.8, -39]], c: '#e8e0cc' }, { t: 'ln', p: [[12.6, -41], [14.2, -38.5]], w: 1, c: '#e8e0cc' });
    if (role === 'cacc') P.push({ t: 'ln', p: [[12, -42], [9, 1]], w: 1.9, c: WOOD }, { t: 'pg', p: [[10.3, -41], [12.4, -48], [14, -40.4]], c: '#7d8590' });
    P.push(
      { t: 'ln', p: [[-3.2, -11], [-3.6, -0.5]], w: 3.6, c: SKIN }, { t: 'ln', p: [[3.2, -11], [3.6, -0.5]], w: 3.6, c: SKIN },
      { t: 'el', x: -3.8, y: 0, rx: 2.9, ry: 1.5, c: '#5a3a1e' }, { t: 'el', x: 4, y: 0, rx: 2.9, ry: 1.5, c: '#5a3a1e' },
      { t: 'ln', p: [[-6.5, -20], [-9.5, -12.5]], w: 3.2, c: SKIN },
      { t: 'fn', f: g => { g.moveTo(-6.5, -22); g.quadraticCurveTo(-10, -15, -10.5, -9); g.lineTo(10.5, -9); g.quadraticCurveTo(10, -15, 6.5, -22); g.closePath(); }, c: col },
      { t: 'pg', p: [[-10.5, -9.2], [-8, -6.2], [-5.5, -9], [-3, -6], [-0.5, -9], [2, -6], [4.5, -9], [7, -6.2], [10.5, -9.2], [10.4, -11], [-10.4, -11]], c: FUR },
      { t: 'ln', p: [[-5.6, -21.4], [5.4, -12.6]], w: 2.6, c: FUR, no: 1 },
      { t: 'ln', p: [[6.5, -20], [10.2, -14]], w: 3.2, c: SKIN },
      { t: 'el', x: 0, y: -27.5, rx: 6, ry: 6, c: SKIN },
      { t: 'fn', f: g => { g.moveTo(-6.4, -27); g.quadraticCurveTo(-7, -35, 0, -34.6); g.quadraticCurveTo(6.8, -35, 6.4, -28.5); g.lineTo(4, -31); g.lineTo(1.5, -29); g.lineTo(-1, -31.2); g.lineTo(-3.6, -29.4); g.closePath(); }, c: HAIR },
      dot(2.6, -27.4, 0.95, INK), dot(-1.4, -27.4, 0.95, INK),
      { t: 'fn', f: g => { g.moveTo(-1.2, -24.6); g.quadraticCurveTo(0.6, -23.4, 2.4, -24.6); }, c: 'rgba(0,0,0,0)', s: '#8a4a2a', sw: 0.8, no: 1 },
      { t: 'el', x: -3, y: -18, rx: 3, ry: 1.6, a: 0.6, c: 'rgba(255,255,255,.28)', no: 1 },
    );
    if (role === 'racc') P.push(
      { t: 'el', x: 11.5, y: -10.5, rx: 5, ry: 4, c: '#c99a52' },
      { t: 'fn', f: g => { g.moveTo(7, -12); g.lineTo(16, -12); g.moveTo(7.4, -9.2); g.lineTo(15.6, -9.2); }, c: 'rgba(0,0,0,0)', s: '#8a6230', sw: 0.9, no: 1 },
      dot(10, -14.4, 1.6, '#c0304a'), dot(12.6, -14.8, 1.6, '#7a2a8a'), dot(11.6, -13, 1.4, '#c0304a'),
    );
    return P;
  }
  function meeple(g, x, y, col, role = 'pesca', s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(role === 'cacc' ? 0 : 0.5, role === 'cacc' ? 1 : 0.6, role === 'cacc' ? 22 : 11, 3.6, 0, 0, TAU); g.fill();
    if (role === 'cacc') { g.translate(16, -7); g.rotate(-Math.PI / 2); g.translate(-5, -16); }   // il cacciatore si sdraia nel prato
    parts(g, meeplePts(col, role), '#ffffff');
    g.restore();
  }
  function hut(g, x, y, col, s = 1) {   // palafitta del clan (sul fiume o sul lago)
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(0,30,60,.3)'; g.beginPath(); g.ellipse(1, 2, 15, 3.5, 0, 0, TAU); g.fill();
    const P = [
      { t: 'ln', p: [[-9.5, -10], [-9.5, 2]], w: 2.2, c: '#6b4423' }, { t: 'ln', p: [[0, -10], [0, 3]], w: 2.2, c: '#6b4423' }, { t: 'ln', p: [[9.5, -10], [9.5, 2]], w: 2.2, c: '#6b4423' },
      { t: 'pg', p: [[-14, -11], [14, -11], [14, -7.5], [-14, -7.5]], c: '#a8743f' },
      { t: 'pg', p: [[-9, -11], [9, -11], [8, -21], [-8, -21]], c: '#c89a5e' },
      { t: 'pg', p: [[-14, -19], [0, -38], [14, -19]], c: '#e1b866' },
      { t: 'pg', p: [[-12.4, -21], [12.4, -21], [10.2, -24], [-10.2, -24]], c: col, no: 1 },
      { t: 'ln', p: [[0, -38], [0, -47]], w: 1.4, c: '#6b4423' }, { t: 'pg', p: [[0.6, -47], [9, -44.5], [0.6, -42]], c: col },
      { t: 'el', x: 0, y: -14.5, rx: 2.8, ry: 4, c: '#3a2414', no: 1 },
      { t: 'fn', f: g => { for (const x of [-7, -3.5, 3.5, 7]) { g.moveTo(x * 0.3, -35); g.lineTo(x * 1.6, -24.5); } }, c: 'rgba(0,0,0,0)', s: '#b38a3e', sw: 0.9, no: 1 },
    ];
    parts(g, P, '#ffffff');
    g.restore();
  }

  // ---- tessera intera ----
  function tile(D0, rot = 0, px = 160) {
    const key = (D0.id || JSON.stringify(D0)) + '|' + rot + '|' + px;
    if (cache.has(key)) return cache.get(key);
    const D = rotDef(D0, rot), cv = document.createElement('canvas'); cv.width = cv.height = px;
    const g = cv.getContext('2d', CPU), k = px / S, R = rivers(D), W = waterPts(D, R), rnd = rng(strSeed((D0.id || '') + rot));
    base(g, D, px);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.save(); g.beginPath(); g.rect(0, 0, S, S); g.clip();
    meadowBits(g, D, R, W, rnd);
    water(g, D, R, rnd);
    fishes(g, D, R);
    trees(g, D, W);
    const ob = (D.ob || []).slice().sort((a, b) => a.y - b.y);
    for (const o of ob) o.k === 'ambra' ? amber(g, o.x, o.y) : animal(g, o.k, o.x, o.y, o.s || 1, o.f || 1);
    g.restore();
    cache.set(key, cv);
    return cv;
  }

  const COLORS = { rosso: '#d8453a', blu: '#3a78d6', giallo: '#f0bf2c', verde: '#3fa24c', viola: '#8e5bd0' };
  window.VA = { S, tile, animal, amber, fish, meeple, hut, rotDef, forestF, COLORS, shade };
})();
